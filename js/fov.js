// fov.js -- Field of view / vision system
// Simplified version of vision.c for the initial port.
// See DECISIONS.md #5 for rationale.
//
// Rules (matching NetHack's standard behavior):
// - Inside a lit room: see the entire room
// - In a dark room: see only adjacent squares
// - In a corridor: see only adjacent squares
// - Lit corridors: see only adjacent squares (corridors are narrow)

import { COLNO, ROWNO, ROOM, CORR, DOOR, STAIRS, FOUNTAIN,
         THRONE, SINK, GRAVE, ALTAR, ICE, IS_WALL, IS_DOOR, IS_ROOM,
         isok } from './config.js';

export class FOV {
    constructor() {
        // visible[x][y] = true if currently visible
        this.visible = [];
        for (let x = 0; x < COLNO; x++) {
            this.visible[x] = new Array(ROWNO).fill(false);
        }
    }

    // Recompute field of view from player position
    // C ref: vision.c vision_recalc()
    compute(gameMap, px, py) {
        // Clear visibility
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                this.visible[x][y] = false;
            }
        }

        // Always see your own position
        this.visible[px][py] = true;

        // Always see adjacent squares (within map bounds)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = px + dx;
                const ny = py + dy;
                if (isok(nx, ny)) {
                    this.visible[nx][ny] = true;
                }
            }
        }

        // If player is in a lit room, see the entire room
        const playerLoc = gameMap.at(px, py);
        if (playerLoc) {
            const room = gameMap.roomAt(px, py);
            if (room && room.rlit) {
                // Reveal the entire room including walls
                // C ref: vision.c -- rooms are revealed entirely when lit
                for (let x = room.lx - 1; x <= room.hx + 1; x++) {
                    for (let y = room.ly - 1; y <= room.hy + 1; y++) {
                        if (isok(x, y)) {
                            this.visible[x][y] = true;
                        }
                    }
                }
            }
            // If on a lit square in a corridor, also do LOS check
            // for seeing down corridors
            if (playerLoc.lit || playerLoc.typ === CORR) {
                this._corridorVision(gameMap, px, py);
            }
        }
    }

    // Extended corridor vision: can see along straight corridors
    // C ref: vision.c uses raycasting; we use a simpler corridor-following approach
    _corridorVision(gameMap, px, py) {
        // Cast rays in 8 directions, stopping at walls
        const dirs = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        for (const [dx, dy] of dirs) {
            let x = px + dx;
            let y = py + dy;
            let dist = 0;
            while (isok(x, y) && dist < 15) {
                const loc = gameMap.at(x, y);
                if (!loc) break;
                // Stop at stone (can't see through)
                if (loc.typ === 0) break; // STONE
                // Can see walls but stop after them
                if (IS_WALL(loc.typ)) {
                    this.visible[x][y] = true;
                    break;
                }
                this.visible[x][y] = true;
                // If we entered a lit room from corridor, reveal the room
                const room = gameMap.roomAt(x, y);
                if (room && room.rlit && IS_ROOM(loc.typ)) {
                    for (let rx = room.lx - 1; rx <= room.hx + 1; rx++) {
                        for (let ry = room.ly - 1; ry <= room.hy + 1; ry++) {
                            if (isok(rx, ry)) {
                                this.visible[rx][ry] = true;
                            }
                        }
                    }
                    break; // Don't continue past the room
                }
                x += dx;
                y += dy;
                dist++;
            }
        }
    }

    // Can the player see position (x, y)?
    canSee(x, y) {
        if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return false;
        return this.visible[x][y];
    }
}
