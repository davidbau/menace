// spacewar.js — Spacewar! (1962) game engine
// Historically accurate to the PDP-1 original by Steve Russell, Martin Graetz,
// Wayne Wiitanen, et al. at MIT.
//
// Features from the original:
// - Two ships ("needle" and "wedge") with Newtonian physics
// - Central star with gravity (Expensive Planetarium by Peter Samson)
// - Toroidal screen wrapping
// - Torpedoes (limited supply, affected by gravity in some versions)
// - Hyperspace panic button (random reappearance, increasing malfunction chance)
// - Star field background (Expensive Planetarium)

const TAU = Math.PI * 2;

// -- Ship shapes (original PDP-1 vector outlines) --
// Needle (Player 1): thin elongated triangle
const NEEDLE_PTS = [
    [0, -12], [-3, 8], [0, 5], [3, 8]
];
// Wedge (Player 2): stubby broad triangle
const WEDGE_PTS = [
    [0, -10], [-7, 8], [-2, 4], [2, 4], [7, 8]
];
// Thrust flame
const FLAME_PTS = [
    [-2, 6], [0, 14], [2, 6]
];

// -- Game constants (tuned to match PDP-1 feel) --
const GRAVITY_STRENGTH = 800;   // gravitational constant
const STAR_RADIUS = 8;          // collision radius of central star
const STAR_KILL_RADIUS = 12;    // visual kill zone
const SHIP_RADIUS = 8;          // collision radius of ship
const TORPEDO_SPEED = 200;      // initial torpedo velocity
const TORPEDO_LIFE = 2.5;       // seconds before torpedo expires
const MAX_TORPEDOES = 16;       // per player (original had ~31)
const TORPEDO_COOLDOWN = 0.15;  // seconds between shots
const THRUST_ACCEL = 120;       // pixels/sec^2
const ROTATE_SPEED = TAU * 0.6; // radians/sec (~210 deg/sec)
const MAX_SPEED = 300;          // velocity clamp
const HYPERSPACE_COOLDOWN = 3;  // seconds between jumps
const HYPERSPACE_MALFUNCTION_BASE = 0.15; // chance of exploding, increases each use
const HYPERSPACE_MALFUNCTION_INC = 0.10;

// -- Star field (Expensive Planetarium) --
function generateStarField(count, w, h) {
    const stars = [];
    // Use a deterministic seed for consistent background
    let s = 6922;
    function rng() { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; }
    for (let i = 0; i < count; i++) {
        stars.push({
            x: rng() * w,
            y: rng() * h,
            brightness: 0.3 + rng() * 0.7,
            size: rng() < 0.1 ? 1.5 : 0.8,
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
    constructor(x, y, angle, shape, color) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.angle = angle; // radians, 0 = up
        this.shape = shape;
        this.color = color;
        this.alive = true;
        this.thrusting = false;
        this.torpedoes = [];
        this.torpedoCooldown = 0;
        this.fuel = 1.0; // 0-1
        this.hyperspaceUses = 0;
        this.hyperspaceCooldown = 0;
        this.respawnTimer = 0;
        this.score = 0;
        this.explodeTimer = 0;
        this.explodeParticles = null;
    }
}

// -- Explosion particles --
function makeExplosion(x, y, count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU;
        const speed = 20 + Math.random() * 100;
        particles.push({
            x, y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 0.5 + Math.random() * 1.0,
        });
    }
    return particles;
}

export class SpacewarGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.w = canvas.width;
        this.h = canvas.height;
        this.cx = this.w / 2;
        this.cy = this.h / 2;

        this.stars = generateStarField(200, this.w, this.h);

        // Player 1 (needle, left side) — green/cyan per PDP-1 scope
        this.ship1 = new Ship(this.cx - 150, this.cy, -Math.PI / 2, NEEDLE_PTS, '#00ff88');
        // Player 2 (wedge, right side)
        this.ship2 = new Ship(this.cx + 150, this.cy, Math.PI / 2, WEDGE_PTS, '#88ccff');

        this.keys = {};
        this.running = false;
        this.lastTime = 0;
        this.roundTimer = 0;
        this.paused = false;
        this.gameOver = false;
        this.winsNeeded = 11; // first to 11

        this._onKey = this._onKey.bind(this);
    }

    // -- Controls --
    // Player 1: A/D rotate, W thrust, S fire, Q hyperspace
    // Player 2: Arrow keys rotate, Up thrust, Down/. fire, / hyperspace
    // (Also support: Player 1 IJKL layout as alternative)
    _onKey(e) {
        const down = e.type === 'keydown';
        this.keys[e.code] = down;

        // Prevent scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
            e.preventDefault();
        }

        // Single-press actions (fire, hyperspace)
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
        const t = new Torpedo(
            ship.x + dx * 12,
            ship.y + dy * 12,
            ship.vx + dx * TORPEDO_SPEED,
            ship.vy + dy * TORPEDO_SPEED,
        );
        ship.torpedoes.push(t);
        ship.torpedoCooldown = TORPEDO_COOLDOWN;
    }

    _hyperspace(ship) {
        if (!ship.alive || ship.hyperspaceCooldown > 0) return;
        const malfunctionChance = HYPERSPACE_MALFUNCTION_BASE +
            HYPERSPACE_MALFUNCTION_INC * ship.hyperspaceUses;
        ship.hyperspaceUses++;
        ship.hyperspaceCooldown = HYPERSPACE_COOLDOWN;
        if (Math.random() < malfunctionChance) {
            // Malfunction — explode
            this._killShip(ship);
            return;
        }
        // Random reappearance
        const margin = 60;
        ship.x = margin + Math.random() * (this.w - margin * 2);
        ship.y = margin + Math.random() * (this.h - margin * 2);
        ship.vx = 0;
        ship.vy = 0;
    }

    _killShip(ship) {
        ship.alive = false;
        ship.explodeTimer = 1.5;
        ship.explodeParticles = makeExplosion(ship.x, ship.y, 30);
    }

    _wrap(ship) {
        if (ship.x < 0) ship.x += this.w;
        if (ship.x > this.w) ship.x -= this.w;
        if (ship.y < 0) ship.y += this.h;
        if (ship.y > this.h) ship.y -= this.h;
    }

    _wrapTorpedo(t) {
        if (t.x < 0) t.x += this.w;
        if (t.x > this.w) t.x -= this.w;
        if (t.y < 0) t.y += this.h;
        if (t.y > this.h) t.y -= this.h;
    }

    _applyGravity(obj, dt) {
        const dx = this.cx - obj.x;
        const dy = this.cy - obj.y;
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2);
        if (dist < 1) return;
        const force = GRAVITY_STRENGTH / dist2;
        obj.vx += (dx / dist) * force * dt;
        obj.vy += (dy / dist) * force * dt;
    }

    _updateShip(ship, dt, rotLeft, rotRight, thrust) {
        if (!ship.alive) {
            // Update explosion
            if (ship.explodeTimer > 0) {
                ship.explodeTimer -= dt;
                if (ship.explodeParticles) {
                    for (const p of ship.explodeParticles) {
                        p.x += p.vx * dt;
                        p.y += p.vy * dt;
                        p.life -= dt;
                    }
                }
            }
            // Respawn
            if (ship.respawnTimer > 0) {
                ship.respawnTimer -= dt;
                if (ship.respawnTimer <= 0) {
                    this._respawn(ship);
                }
            } else if (ship.explodeTimer <= 0) {
                ship.respawnTimer = 1.0;
            }
            return;
        }

        // Rotation
        if (rotLeft) ship.angle -= ROTATE_SPEED * dt;
        if (rotRight) ship.angle += ROTATE_SPEED * dt;

        // Thrust
        ship.thrusting = thrust && ship.fuel > 0;
        if (ship.thrusting) {
            const dx = Math.sin(ship.angle);
            const dy = -Math.cos(ship.angle);
            ship.vx += dx * THRUST_ACCEL * dt;
            ship.vy += dy * THRUST_ACCEL * dt;
            ship.fuel -= dt * 0.15;
            if (ship.fuel < 0) ship.fuel = 0;
        }

        // Gravity
        this._applyGravity(ship, dt);

        // Speed clamp
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > MAX_SPEED) {
            ship.vx = (ship.vx / speed) * MAX_SPEED;
            ship.vy = (ship.vy / speed) * MAX_SPEED;
        }

        // Move
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        this._wrap(ship);

        // Cooldowns
        if (ship.torpedoCooldown > 0) ship.torpedoCooldown -= dt;
        if (ship.hyperspaceCooldown > 0) ship.hyperspaceCooldown -= dt;

        // Star collision
        const sdx = ship.x - this.cx;
        const sdy = ship.y - this.cy;
        if (sdx * sdx + sdy * sdy < STAR_KILL_RADIUS * STAR_KILL_RADIUS) {
            this._killShip(ship);
        }
    }

    _respawn(ship) {
        const side = (ship === this.ship1) ? -1 : 1;
        ship.x = this.cx + side * 150;
        ship.y = this.cy;
        ship.vx = 0;
        ship.vy = 0;
        ship.angle = (ship === this.ship1) ? -Math.PI / 2 : Math.PI / 2;
        ship.alive = true;
        ship.thrusting = false;
        ship.fuel = 1.0;
        ship.torpedoCooldown = 0;
        ship.hyperspaceCooldown = 0;
        ship.hyperspaceUses = 0;
        ship.explodeParticles = null;
        ship.torpedoes = [];
    }

    _updateTorpedoes(ship, otherShip, dt) {
        for (const t of ship.torpedoes) {
            if (!t.alive) continue;
            this._applyGravity(t, dt);
            t.x += t.vx * dt;
            t.y += t.vy * dt;
            this._wrapTorpedo(t);
            t.life -= dt;
            if (t.life <= 0) { t.alive = false; continue; }

            // Hit other ship?
            if (otherShip.alive) {
                const dx = t.x - otherShip.x;
                const dy = t.y - otherShip.y;
                if (dx * dx + dy * dy < SHIP_RADIUS * SHIP_RADIUS) {
                    t.alive = false;
                    this._killShip(otherShip);
                    ship.score++;
                }
            }

            // Hit star?
            const sx = t.x - this.cx;
            const sy = t.y - this.cy;
            if (sx * sx + sy * sy < STAR_RADIUS * STAR_RADIUS) {
                t.alive = false;
            }
        }
        // Clean up dead torpedoes
        ship.torpedoes = ship.torpedoes.filter(t => t.alive || t.life > -0.5);
    }

    // Ship-vs-ship collision
    _checkShipCollision() {
        if (!this.ship1.alive || !this.ship2.alive) return;
        const dx = this.ship1.x - this.ship2.x;
        const dy = this.ship1.y - this.ship2.y;
        if (dx * dx + dy * dy < (SHIP_RADIUS * 2) * (SHIP_RADIUS * 2)) {
            this._killShip(this.ship1);
            this._killShip(this.ship2);
        }
    }

    update(dt) {
        if (this.paused || this.gameOver) return;
        this.roundTimer += dt;

        // Player 1 controls: A/D rotate, W thrust
        this._updateShip(this.ship1, dt,
            this.keys['KeyA'],
            this.keys['KeyD'],
            this.keys['KeyW']);

        // Player 2 controls: Left/Right rotate, Up thrust
        this._updateShip(this.ship2, dt,
            this.keys['ArrowLeft'],
            this.keys['ArrowRight'],
            this.keys['ArrowUp']);

        // Torpedoes
        this._updateTorpedoes(this.ship1, this.ship2, dt);
        this._updateTorpedoes(this.ship2, this.ship1, dt);

        this._checkShipCollision();

        // Check for game over
        if (this.ship1.score >= this.winsNeeded || this.ship2.score >= this.winsNeeded) {
            this.gameOver = true;
        }
    }

    // -- Rendering --

    _drawStar(ctx) {
        // Central star with glow (PDP-1 scope phosphor bloom)
        const gradient = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, STAR_KILL_RADIUS * 3);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, STAR_KILL_RADIUS * 3, 0, TAU);
        ctx.fill();

        // Solid core
        ctx.fillStyle = '#ffffcc';
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, STAR_RADIUS, 0, TAU);
        ctx.fill();
    }

    _drawStarField(ctx) {
        for (const s of this.stars) {
            ctx.fillStyle = `rgba(200, 220, 255, ${s.brightness * 0.6})`;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        }
    }

    _drawShip(ctx, ship) {
        if (!ship.alive) {
            // Draw explosion
            if (ship.explodeParticles) {
                for (const p of ship.explodeParticles) {
                    if (p.life <= 0) continue;
                    const alpha = p.life;
                    ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
                    ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
                }
            }
            return;
        }

        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        // Ship outline (PDP-1 vector style — bright lines on dark)
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = ship.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        const pts = ship.shape;
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.closePath();
        ctx.stroke();

        // Thrust flame
        if (ship.thrusting) {
            ctx.strokeStyle = '#ff8844';
            ctx.shadowColor = '#ff8844';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            // Flickering flame length
            const flicker = 0.7 + Math.random() * 0.6;
            ctx.moveTo(FLAME_PTS[0][0], FLAME_PTS[0][1]);
            ctx.lineTo(FLAME_PTS[1][0], FLAME_PTS[1][1] * flicker);
            ctx.lineTo(FLAME_PTS[2][0], FLAME_PTS[2][1]);
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawTorpedoes(ctx, ship) {
        for (const t of ship.torpedoes) {
            if (!t.alive) continue;
            const alpha = Math.min(1, t.life * 2);
            ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`;
            ctx.shadowColor = ship.color;
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 1.5, 0, TAU);
            ctx.fill();
        }
    }

    _drawHUD(ctx) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.font = '14px "DejaVu Sans Mono", monospace';

        // Player 1 score (top left)
        ctx.fillStyle = this.ship1.color;
        ctx.textAlign = 'left';
        ctx.fillText(`NEEDLE: ${this.ship1.score}`, 10, 20);
        // Fuel bar
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.fillRect(10, 26, 80, 4);
        ctx.fillStyle = this.ship1.color;
        ctx.fillRect(10, 26, 80 * this.ship1.fuel, 4);

        // Player 2 score (top right)
        ctx.fillStyle = this.ship2.color;
        ctx.textAlign = 'right';
        ctx.fillText(`WEDGE: ${this.ship2.score}`, this.w - 10, 20);
        // Fuel bar
        ctx.fillStyle = 'rgba(136, 204, 255, 0.3)';
        ctx.fillRect(this.w - 90, 26, 80, 4);
        ctx.fillStyle = this.ship2.color;
        ctx.fillRect(this.w - 90, 26, 80 * this.ship2.fuel, 4);

        // Game over
        if (this.gameOver) {
            ctx.textAlign = 'center';
            ctx.font = '24px "DejaVu Sans Mono", monospace';
            const winner = this.ship1.score >= this.winsNeeded ? 'NEEDLE' : 'WEDGE';
            const color = this.ship1.score >= this.winsNeeded ? this.ship1.color : this.ship2.color;
            ctx.fillStyle = color;
            ctx.fillText(`${winner} WINS`, this.cx, this.cy - 30);
            ctx.font = '14px "DejaVu Sans Mono", monospace';
            ctx.fillStyle = '#888';
            ctx.fillText('PRESS SPACE TO RESTART', this.cx, this.cy + 10);
        }

        // Controls help (bottom)
        if (this.roundTimer < 8) {
            const alpha = this.roundTimer < 6 ? 0.6 : 0.6 * (8 - this.roundTimer) / 2;
            ctx.textAlign = 'center';
            ctx.font = '11px "DejaVu Sans Mono", monospace';
            ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
            ctx.fillText('NEEDLE: A/D rotate  W thrust  S fire  Q hyperspace', this.cx, this.h - 28);
            ctx.fillText('WEDGE: \u2190/\u2192 rotate  \u2191 thrust  . fire  / hyperspace     P pause  ESC quit', this.cx, this.h - 12);
        }
    }

    render() {
        const ctx = this.ctx;
        // Clear to black (PDP-1 scope)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.w, this.h);

        this._drawStarField(ctx);
        this._drawStar(ctx);
        this._drawTorpedoes(ctx, this.ship1);
        this._drawTorpedoes(ctx, this.ship2);
        this._drawShip(ctx, this.ship1);
        this._drawShip(ctx, this.ship2);
        this._drawHUD(ctx);
    }

    // -- Main loop --
    async run() {
        document.addEventListener('keydown', this._onKey);
        document.addEventListener('keyup', this._onKey);
        this.running = true;
        this.lastTime = performance.now();

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

                // Space to restart after game over
                if (this.gameOver && this.keys['Space']) {
                    this.ship1.score = 0;
                    this.ship2.score = 0;
                    this._respawn(this.ship1);
                    this._respawn(this.ship2);
                    this.gameOver = false;
                    this.roundTimer = 0;
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
