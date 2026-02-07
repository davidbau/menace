// monmove.js -- Monster movement AI
// Mirrors monmove.c from the C source.

import { COLNO, ROWNO, STONE, IS_WALL, IS_DOOR, IS_ROOM,
         ACCESSIBLE, CORR, DOOR, D_CLOSED, D_LOCKED,
         isok } from './config.js';
import { rn2, rnd } from './rng.js';
import { monsterAttackPlayer } from './combat.js';

// Move all monsters on the level
// C ref: monmove.c movemon() -- iterates all monsters and moves each
export function moveMonsters(map, player, display) {
    for (const mon of map.monsters) {
        if (mon.dead) continue;

        // Give movement points
        // C ref: mon.c mcalcmove() -- speed-based movement allocation
        mon.movement += mon.speed;

        // Move if enough movement points
        while (mon.movement >= 12 && !mon.dead) {
            mon.movement -= 12;
            moveOneMonster(map, mon, player, display);
        }
    }

    // Remove dead monsters
    map.monsters = map.monsters.filter(m => !m.dead);
}

// Move a single monster
// C ref: monmove.c m_move() -- main monster movement function
function moveOneMonster(map, mon, player, display) {
    if (mon.sleeping) {
        // C ref: monmove.c -- sleeping monsters wake up if player is adjacent
        const dist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);
        if (dist <= 2 && rn2(3)) {
            mon.sleeping = false;
        }
        return;
    }

    if (mon.confused) {
        // Move randomly when confused
        // C ref: monmove.c m_move() -- confused movement
        moveRandomly(map, mon);
        return;
    }

    if (mon.peaceful || mon.tame) {
        // Peaceful/tame monsters wander randomly
        if (rn2(3)) moveRandomly(map, mon);
        return;
    }

    if (mon.flee) {
        // Flee from player
        // C ref: monmove.c m_move() -- fleeing behavior
        moveAwayFromPlayer(map, mon, player);
        return;
    }

    // Hostile monster: move towards player
    // C ref: monmove.c m_move() -- uses distfleeck and then pathfinding
    const dx = Math.sign(player.x - mon.mx);
    const dy = Math.sign(player.y - mon.my);

    // If adjacent to player, attack
    if (Math.abs(mon.mx - player.x) <= 1 && Math.abs(mon.my - player.y) <= 1) {
        monsterAttackPlayer(mon, player, display);
        return;
    }

    // Try to move towards player
    // C ref: monmove.c -- tries direct path, then alternate directions
    if (tryMoveMonster(map, mon, mon.mx + dx, mon.my + dy, player)) return;

    // Try diagonal approaches
    if (dx !== 0 && tryMoveMonster(map, mon, mon.mx + dx, mon.my, player)) return;
    if (dy !== 0 && tryMoveMonster(map, mon, mon.mx, mon.my + dy, player)) return;

    // Try other directions
    if (tryMoveMonster(map, mon, mon.mx + dx, mon.my - dy, player)) return;
    if (tryMoveMonster(map, mon, mon.mx - dx, mon.my + dy, player)) return;
}

// Try to move a monster to (nx, ny)
// Returns true if successful
// C ref: monmove.c m_move() -- movement validation
function tryMoveMonster(map, mon, nx, ny, player) {
    if (!isok(nx, ny)) return false;

    // Can't move onto player position
    if (nx === player.x && ny === player.y) return false;

    // Can't move onto another monster
    if (map.monsterAt(nx, ny)) return false;

    const loc = map.at(nx, ny);
    if (!loc) return false;

    // Can't move through walls or stone
    if (IS_WALL(loc.typ) || loc.typ === STONE) return false;

    // Can't move through closed/locked doors (most monsters)
    if (IS_DOOR(loc.typ) && (loc.flags & D_CLOSED || loc.flags & D_LOCKED)) {
        return false;
    }

    // Must be accessible terrain
    if (!ACCESSIBLE(loc.typ)) return false;

    // Move!
    mon.mx = nx;
    mon.my = ny;
    return true;
}

// Move a monster in a random direction
// C ref: monmove.c -- random movement for confused/peaceful monsters
function moveRandomly(map, mon) {
    const dirs = [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[-1,1],[1,-1],[1,1]];
    const dir = dirs[rn2(dirs.length)];
    const nx = mon.mx + dir[0];
    const ny = mon.my + dir[1];

    if (isok(nx, ny)) {
        const loc = map.at(nx, ny);
        if (loc && ACCESSIBLE(loc.typ) && !map.monsterAt(nx, ny)) {
            mon.mx = nx;
            mon.my = ny;
        }
    }
}

// Move a monster away from player
// C ref: monmove.c -- fleeing behavior
function moveAwayFromPlayer(map, mon, player) {
    const dx = Math.sign(mon.mx - player.x);
    const dy = Math.sign(mon.my - player.y);

    if (tryMoveMonster(map, mon, mon.mx + dx, mon.my + dy, player)) return;
    if (dx !== 0 && tryMoveMonster(map, mon, mon.mx + dx, mon.my, player)) return;
    if (dy !== 0 && tryMoveMonster(map, mon, mon.mx, mon.my + dy, player)) return;

    // Can't flee, try random
    moveRandomly(map, mon);
}
