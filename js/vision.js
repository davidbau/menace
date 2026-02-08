// vision.js -- Line-of-sight and visibility helpers
// C ref: vision.c clear_path(), vision.h couldsee/cansee/m_cansee
// Bresenham's line algorithm for LOS, split into 4 quadrants matching C exactly.

import { POOL, DOOR, D_CLOSED, D_LOCKED } from './config.js';

// Check if a map cell is clear (non-blocking for line of sight)
// C ref: viz_clear_rows[row][col], set from !IS_OBSTRUCTED(typ) && !does_block()
// IS_OBSTRUCTED in C = (typ < POOL) — covers stone, walls, tree, sdoor, scorr
// does_block adds: closed/locked doors, clouds, water walls, boulders, mimics
function is_clear(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    // C: IS_OBSTRUCTED(typ) = typ < POOL (types 0-15: stone, walls, tree, sdoor, scorr)
    if (typ < POOL) return false;
    // C: does_block() — closed/locked doors block
    if (typ === DOOR && (loc.flags & (D_CLOSED | D_LOCKED))) return false;
    return true;
}

// Bresenham LOS check — are there no obstructions between two points?
// C ref: vision.c clear_path(col1, row1, col2, row2)
// Does NOT check endpoints, only intermediate cells.
export function clear_path(map, col1, row1, col2, row2) {
    if (col1 < col2) {
        if (row1 > row2) return q1_path(map, row1, col1, row2, col2);
        else             return q4_path(map, row1, col1, row2, col2);
    } else {
        if (row1 > row2)                       return q2_path(map, row1, col1, row2, col2);
        else if (row1 === row2 && col1 === col2) return true;
        else                                     return q3_path(map, row1, col1, row2, col2);
    }
}

// Q1: target is right and up (col2 > col1, row1 > row2)
// C ref: vision.c _q1_path(scol, srow, y2, x2)
function q1_path(map, srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x;
    const dy = y - y2;
    const dxs = dx << 1;
    const dys = dy << 1;

    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k > 0; k--) {
            if (err >= 0) { x++; err -= dys; }
            y--;
            err += dxs;
            if (!is_clear(map, x, y)) return false;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k > 0; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x++;
            err += dys;
            if (!is_clear(map, x, y)) return false;
        }
    }
    return true;
}

// Q2: target is left and up (col1 >= col2, row1 > row2)
// C ref: vision.c _q2_path(scol, srow, y2, x2)
function q2_path(map, srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2;
    const dy = y - y2;
    const dxs = dx << 1;
    const dys = dy << 1;

    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k > 0; k--) {
            if (err >= 0) { x--; err -= dys; }
            y--;
            err += dxs;
            if (!is_clear(map, x, y)) return false;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k > 0; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x--;
            err += dys;
            if (!is_clear(map, x, y)) return false;
        }
    }
    return true;
}

// Q3: target is left and down (col1 >= col2, row2 > row1)
// C ref: vision.c _q3_path(scol, srow, y2, x2)
function q3_path(map, srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2;
    const dy = y2 - y;
    const dxs = dx << 1;
    const dys = dy << 1;

    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k > 0; k--) {
            if (err >= 0) { x--; err -= dys; }
            y++;
            err += dxs;
            if (!is_clear(map, x, y)) return false;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k > 0; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x--;
            err += dys;
            if (!is_clear(map, x, y)) return false;
        }
    }
    return true;
}

// Q4: target is right and down (col2 > col1, row2 >= row1)
// C ref: vision.c _q4_path(scol, srow, y2, x2)
function q4_path(map, srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x;
    const dy = y2 - y;
    const dxs = dx << 1;
    const dys = dy << 1;

    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k > 0; k--) {
            if (err >= 0) { x++; err -= dys; }
            y++;
            err += dxs;
            if (!is_clear(map, x, y)) return false;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k > 0; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x++;
            err += dys;
            if (!is_clear(map, x, y)) return false;
        }
    }
    return true;
}

// Monster can see target position
// C ref: vision.h #define m_cansee(mtmp, x2, y2) clear_path(mtmp->mx, mtmp->my, x2, y2)
export function m_cansee(mon, map, x2, y2) {
    return clear_path(map, mon.mx, mon.my, x2, y2);
}

// Could the player see this position (LOS only, ignoring lighting)
// C ref: vision.h #define couldsee(x, y) ((gv.viz_array[y][x] & COULD_SEE) != 0)
// In C this uses a pre-computed cache. We compute on-the-fly via clear_path.
export function couldsee(map, player, x, y) {
    return clear_path(map, player.x, player.y, x, y);
}
