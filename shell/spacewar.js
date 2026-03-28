// spacewar.js — Spacewar! game engine
// PDP-11/GT40 vector terminal version.
// Based on the 1962 PDP-1 original by Steve Russell, Martin Graetz,
// Wayne Wiitanen, et al. at MIT. Ported to GT40 vector display style:
// monochrome green P31 phosphor, 1024-unit coordinate space,
// phosphor persistence (afterglow trails).
//
// Features from the original:
// - Two ships ("needle" and "wedge") with Newtonian physics
// - Central star with gravity (Expensive Planetarium by Peter Samson)
// - Toroidal screen wrapping
// - Torpedoes (limited supply, affected by gravity)
// - Hyperspace panic button (increasing malfunction chance)
// - Star field background (Expensive Planetarium)

const TAU = Math.PI * 2;

// -- Phosphor color (P31 green) --
const P31 = '#33ff33';
const P31_DIM = '#117711';
const P31_BRIGHT = '#88ffaa';

// -- Ship shapes (original vector outlines, in game units) --
// Needle (Player 1): thin elongated triangle
const NEEDLE_PTS = [
    [0, -16], [-4, 11], [0, 7], [4, 11]
];
// Wedge (Player 2): stubby broad triangle
const WEDGE_PTS = [
    [0, -14], [-9, 11], [-3, 5], [3, 5], [9, 11]
];
// Thrust flame
const FLAME_PTS = [
    [-3, 8], [0, 19], [3, 8]
];

// -- Game constants --
const GRAVITY_STRENGTH = 120000;
const STAR_RADIUS = 12;
const STAR_KILL_RADIUS = 18;
const SHIP_RADIUS = 12;
const TORPEDO_SPEED = 300;
const TORPEDO_LIFE = 2.2;
const MAX_TORPEDOES = 16;
const TORPEDO_COOLDOWN = 0.15;
const THRUST_ACCEL = 180;
const ROTATE_SPEED = TAU * 0.55;
const MAX_SPEED = 400;
const HYPERSPACE_COOLDOWN = 3;
const HYPERSPACE_MALFUNCTION_BASE = 0.12;
const HYPERSPACE_MALFUNCTION_INC = 0.10;

// -- Star field (Expensive Planetarium) --
function generateStarField(count) {
    const stars = [];
    let s = 6922; // deterministic seed
    function rng() { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; }
    for (let i = 0; i < count; i++) {
        stars.push({
            x: rng(), y: rng(), // normalized 0-1
            brightness: 0.15 + rng() * 0.4,
            size: rng() < 0.08 ? 2.0 : 1.0,
        });
    }
    return stars;
}

// -- Torpedo --
class Torpedo {
    constructor(x, y, vx, vy) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.life = TORPEDO_LIFE;
        this.alive = true;
    }
}

// -- Ship --
class Ship {
    constructor(x, y, angle, shape) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.angle = angle;
        this.shape = shape;
        this.alive = true;
        this.thrusting = false;
        this.torpedoes = [];
        this.torpedoCooldown = 0;
        this.fuel = 1.0;
        this.hyperspaceUses = 0;
        this.hyperspaceCooldown = 0;
        this.respawnTimer = 0;
        this.score = 0;
        this.explodeTimer = 0;
        this.explodeParticles = null;
    }
}

// -- Explosion --
function makeExplosion(x, y, count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const speed = 30 + Math.random() * 150;
        particles.push({
            x, y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 0.4 + Math.random() * 0.8,
        });
    }
    return particles;
}

export class SpacewarGame {
    constructor(canvas, display) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.display = display; // Terminal instance for text overlay

        // Game coordinate system: 1024 wide, height proportional to canvas
        this.gw = 1024;
        this.gh = 1024 * (canvas.height / canvas.width);
        this.cx = this.gw / 2;
        this.cy = this.gh / 2;
        // Scale factor: canvas pixels per game unit
        this.scale = canvas.width / this.gw;

        this.stars = generateStarField(180);

        this.ship1 = new Ship(this.cx - this.gw * 0.18, this.cy, -Math.PI / 2, NEEDLE_PTS);
        this.ship2 = new Ship(this.cx + this.gw * 0.18, this.cy, Math.PI / 2, WEDGE_PTS);

        // Phosphor persistence: previous frame buffer
        this._prevFrame = null;

        this.keys = {};
        this.running = false;
        this.lastTime = 0;
        this.roundTimer = 0;
        this.paused = false;
        this.gameOver = false;
        this.winsNeeded = 11;

        this._lastRow23 = null;
        this._onKey = this._onKey.bind(this);
    }

    // -- Controls --
    _onKey(e) {
        const down = e.type === 'keydown';
        this.keys[e.code] = down;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }
        if (down) {
            if (e.code === 'KeyS' || e.code === 'KeyF') this._fireTorpedo(this.ship1);
            if (e.code === 'ArrowDown' || e.code === 'Period') this._fireTorpedo(this.ship2);
            if (e.code === 'KeyQ' || e.code === 'KeyR') this._hyperspace(this.ship1);
            if (e.code === 'Slash' || e.code === 'ShiftRight') this._hyperspace(this.ship2);
            if (e.code === 'KeyP') this.paused = !this.paused;
            if (e.code === 'Escape') { this.running = false; }
        }
    }

    _fireTorpedo(ship) {
        if (!ship.alive || ship.torpedoCooldown > 0) return;
        if (ship.torpedoes.filter(t => t.alive).length >= MAX_TORPEDOES) return;
        const dx = Math.sin(ship.angle);
        const dy = -Math.cos(ship.angle);
        ship.torpedoes.push(new Torpedo(
            ship.x + dx * 16, ship.y + dy * 16,
            ship.vx + dx * TORPEDO_SPEED, ship.vy + dy * TORPEDO_SPEED,
        ));
        ship.torpedoCooldown = TORPEDO_COOLDOWN;
    }

    _hyperspace(ship) {
        if (!ship.alive || ship.hyperspaceCooldown > 0) return;
        const chance = HYPERSPACE_MALFUNCTION_BASE + HYPERSPACE_MALFUNCTION_INC * ship.hyperspaceUses;
        ship.hyperspaceUses++;
        ship.hyperspaceCooldown = HYPERSPACE_COOLDOWN;
        if (Math.random() < chance) { this._killShip(ship); return; }
        const m = 80;
        ship.x = m + Math.random() * (this.gw - m * 2);
        ship.y = m + Math.random() * (this.gh - m * 2);
        ship.vx = 0; ship.vy = 0;
    }

    _killShip(ship) {
        ship.alive = false;
        ship.explodeTimer = 1.5;
        ship.explodeParticles = makeExplosion(ship.x, ship.y, 24);
    }

    _wrap(obj) {
        if (obj.x < 0) obj.x += this.gw;
        if (obj.x > this.gw) obj.x -= this.gw;
        if (obj.y < 0) obj.y += this.gh;
        if (obj.y > this.gh) obj.y -= this.gh;
    }

    _applyGravity(obj, dt) {
        const dx = this.cx - obj.x;
        const dy = this.cy - obj.y;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2);
        if (dist < 2) return;
        const force = GRAVITY_STRENGTH / dist2;
        obj.vx += (dx / dist) * force * dt;
        obj.vy += (dy / dist) * force * dt;
    }

    _updateShip(ship, dt, rotL, rotR, thrust) {
        if (!ship.alive) {
            if (ship.explodeTimer > 0) {
                ship.explodeTimer -= dt;
                if (ship.explodeParticles) {
                    for (const p of ship.explodeParticles) {
                        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                    }
                }
            }
            if (ship.respawnTimer > 0) {
                ship.respawnTimer -= dt;
                if (ship.respawnTimer <= 0) this._respawn(ship);
            } else if (ship.explodeTimer <= 0) {
                ship.respawnTimer = 1.0;
            }
            return;
        }
        if (rotL) ship.angle -= ROTATE_SPEED * dt;
        if (rotR) ship.angle += ROTATE_SPEED * dt;
        ship.thrusting = thrust && ship.fuel > 0;
        if (ship.thrusting) {
            ship.vx += Math.sin(ship.angle) * THRUST_ACCEL * dt;
            ship.vy -= Math.cos(ship.angle) * THRUST_ACCEL * dt;
            ship.fuel = Math.max(0, ship.fuel - dt * 0.12);
        }
        this._applyGravity(ship, dt);
        const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (spd > MAX_SPEED) { ship.vx *= MAX_SPEED / spd; ship.vy *= MAX_SPEED / spd; }
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
        this._wrap(ship);
        if (ship.torpedoCooldown > 0) ship.torpedoCooldown -= dt;
        if (ship.hyperspaceCooldown > 0) ship.hyperspaceCooldown -= dt;
        const sx = ship.x - this.cx, sy = ship.y - this.cy;
        if (sx * sx + sy * sy < STAR_KILL_RADIUS * STAR_KILL_RADIUS) this._killShip(ship);
    }

    _respawn(ship) {
        const side = (ship === this.ship1) ? -1 : 1;
        ship.x = this.cx + side * this.gw * 0.18;
        ship.y = this.cy;
        ship.vx = 0; ship.vy = 0;
        ship.angle = (ship === this.ship1) ? -Math.PI / 2 : Math.PI / 2;
        ship.alive = true; ship.thrusting = false; ship.fuel = 1.0;
        ship.torpedoCooldown = 0; ship.hyperspaceCooldown = 0;
        ship.hyperspaceUses = 0;
        ship.explodeParticles = null; ship.torpedoes = [];
    }

    _updateTorpedoes(ship, other, dt) {
        for (const t of ship.torpedoes) {
            if (!t.alive) continue;
            this._applyGravity(t, dt);
            t.x += t.vx * dt; t.y += t.vy * dt;
            this._wrap(t);
            t.life -= dt;
            if (t.life <= 0) { t.alive = false; continue; }
            if (other.alive) {
                const dx = t.x - other.x, dy = t.y - other.y;
                if (dx * dx + dy * dy < SHIP_RADIUS * SHIP_RADIUS) {
                    t.alive = false; this._killShip(other); ship.score++;
                }
            }
            const sx = t.x - this.cx, sy = t.y - this.cy;
            if (sx * sx + sy * sy < STAR_RADIUS * STAR_RADIUS) t.alive = false;
        }
        ship.torpedoes = ship.torpedoes.filter(t => t.alive || t.life > -0.5);
    }

    _checkShipCollision() {
        if (!this.ship1.alive || !this.ship2.alive) return;
        const dx = this.ship1.x - this.ship2.x, dy = this.ship1.y - this.ship2.y;
        if (dx * dx + dy * dy < (SHIP_RADIUS * 2) ** 2) {
            this._killShip(this.ship1); this._killShip(this.ship2);
        }
    }

    update(dt) {
        if (this.paused || this.gameOver) return;
        this.roundTimer += dt;
        this._updateShip(this.ship1, dt, this.keys['KeyA'], this.keys['KeyD'], this.keys['KeyW']);
        this._updateShip(this.ship2, dt, this.keys['ArrowLeft'], this.keys['ArrowRight'], this.keys['ArrowUp']);
        this._updateTorpedoes(this.ship1, this.ship2, dt);
        this._updateTorpedoes(this.ship2, this.ship1, dt);
        this._checkShipCollision();
        if (this.ship1.score >= this.winsNeeded || this.ship2.score >= this.winsNeeded) {
            this.gameOver = true;
        }
    }

    // -- Vector display rendering (GT40 P31 phosphor style) --

    // Convert game coords to canvas pixels
    _gx(x) { return x * this.scale; }
    _gy(y) { return y * this.scale; }

    // Draw a vector line in phosphor green
    _vecLine(ctx, x1, y1, x2, y2, brightness) {
        const a = brightness ?? 1.0;
        ctx.strokeStyle = `rgba(51, 255, 51, ${a})`;
        ctx.lineWidth = 1.2 * this.scale / (1024 / this.canvas.width);
        ctx.beginPath();
        ctx.moveTo(this._gx(x1), this._gy(y1));
        ctx.lineTo(this._gx(x2), this._gy(y2));
        ctx.stroke();
    }

    // Draw a vector dot
    _vecDot(ctx, x, y, size, brightness) {
        const a = brightness ?? 1.0;
        const r = (size ?? 1.5) * this.scale / (1024 / this.canvas.width);
        ctx.fillStyle = `rgba(51, 255, 51, ${a})`;
        ctx.beginPath();
        ctx.arc(this._gx(x), this._gy(y), r, 0, TAU);
        ctx.fill();
    }

    _drawStarField(ctx) {
        for (const s of this.stars) {
            this._vecDot(ctx, s.x * this.gw, s.y * this.gh, s.size * 0.6, s.brightness);
        }
    }

    _drawStar(ctx) {
        // Central star: bright dot with radiating lines (vector display style)
        const n = 8;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            const r1 = STAR_RADIUS * 0.5;
            const r2 = STAR_RADIUS * 1.5;
            this._vecLine(ctx,
                this.cx + Math.cos(a) * r1, this.cy + Math.sin(a) * r1,
                this.cx + Math.cos(a) * r2, this.cy + Math.sin(a) * r2, 0.7);
        }
        this._vecDot(ctx, this.cx, this.cy, 4, 1.0);
    }

    _drawShipShape(ctx, ship) {
        if (!ship.alive) {
            if (ship.explodeParticles) {
                for (const p of ship.explodeParticles) {
                    if (p.life <= 0) continue;
                    this._vecDot(ctx, p.x, p.y, 1.2, Math.min(1, p.life * 1.5));
                }
            }
            return;
        }
        const pts = ship.shape;
        const cos = Math.cos(ship.angle), sin = Math.sin(ship.angle);
        function tx(pt) {
            return [ship.x + pt[0] * cos - pt[1] * sin,
                    ship.y + pt[0] * sin + pt[1] * cos];
        }
        // Draw ship outline as vector lines
        for (let i = 0; i < pts.length; i++) {
            const a = tx(pts[i]);
            const b = tx(pts[(i + 1) % pts.length]);
            this._vecLine(ctx, a[0], a[1], b[0], b[1], 1.0);
        }
        // Thrust flame
        if (ship.thrusting) {
            const flicker = 0.6 + Math.random() * 0.8;
            const fp = FLAME_PTS.map(p => [p[0], p[1] * flicker]);
            for (let i = 0; i < fp.length - 1; i++) {
                const a = tx(fp[i]);
                const b = tx(fp[i + 1]);
                this._vecLine(ctx, a[0], a[1], b[0], b[1], 0.8);
            }
        }
    }

    _drawTorpedoes(ctx, ship) {
        for (const t of ship.torpedoes) {
            if (!t.alive) continue;
            this._vecDot(ctx, t.x, t.y, 1.8, Math.min(1, t.life * 1.5));
        }
    }

    _updateTerminalHUD() {
        const d = this.display;
        if (!d) return;

        // Row 0: scores
        const s1 = `NEEDLE ${this.ship1.score}`;
        const fuelBar1 = '|' + '#'.repeat(Math.round(this.ship1.fuel * 8)) +
                          '.'.repeat(8 - Math.round(this.ship1.fuel * 8)) + '|';
        const s2 = `${this.ship2.score} WEDGE`;
        const fuelBar2 = '|' + '#'.repeat(Math.round(this.ship2.fuel * 8)) +
                          '.'.repeat(8 - Math.round(this.ship2.fuel * 8)) + '|';
        const left = `${s1} ${fuelBar1}`;
        const right = `${fuelBar2} ${s2}`;
        const pad = 80 - left.length - right.length;
        const line0 = left + ' '.repeat(Math.max(1, pad)) + right;
        d.putstr(0, 0, line0.slice(0, 80), 10); // green

        // Row 23: controls or game over (only update when state changes)
        const newRow23 = this.gameOver
            ? (() => { const w = this.ship1.score >= this.winsNeeded ? 'NEEDLE' : 'WEDGE';
                       return `${w} WINS -- SPACE TO RESTART -- ESC TO QUIT`; })()
            : this.roundTimer < 10
                ? 'A/D W S Q needle   arrows/Up . / wedge   P pause  ESC quit'
                : '';
        if (newRow23 !== this._lastRow23) {
            d.clearRow(23);
            if (newRow23) {
                const lpad = Math.max(0, Math.floor((80 - newRow23.length) / 2));
                d.putstr(lpad, 23, newRow23, 10);
            }
            this._lastRow23 = newRow23;
        }

        if (typeof d.flush === 'function') d.flush();
    }

    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Phosphor persistence: fade previous frame instead of clearing
        // This creates the ghostly afterglow trails of a real vector CRT
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, 0, w, h);

        // Thin green phosphor glow on all vector drawing
        ctx.shadowColor = P31;
        ctx.shadowBlur = 2;

        this._drawStarField(ctx);
        this._drawStar(ctx);
        this._drawTorpedoes(ctx, this.ship1);
        this._drawTorpedoes(ctx, this.ship2);
        this._drawShipShape(ctx, this.ship1);
        this._drawShipShape(ctx, this.ship2);

        ctx.shadowBlur = 0;

        // Terminal text HUD
        this._updateTerminalHUD();
    }

    async run() {
        document.addEventListener('keydown', this._onKey);
        document.addEventListener('keyup', this._onKey);
        this.running = true;
        this.lastTime = performance.now();

        // Clear terminal except rows 0 and 23 (HUD rows)
        if (this.display) {
            this.display.clearScreen();
            this._updateTerminalHUD();
        }

        return new Promise((resolve) => {
            const frame = (now) => {
                if (!this.running) {
                    document.removeEventListener('keydown', this._onKey);
                    document.removeEventListener('keyup', this._onKey);
                    resolve();
                    return;
                }
                const dt = Math.min((now - this.lastTime) / 1000, 0.05);
                this.lastTime = now;

                if (this.gameOver && this.keys['Space']) {
                    this.ship1.score = 0; this.ship2.score = 0;
                    this._respawn(this.ship1); this._respawn(this.ship2);
                    this.gameOver = false; this.roundTimer = 0;
                    this.keys['Space'] = false;
                }

                this.update(dt);
                this.render();
                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });
    }
}
