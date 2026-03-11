// vision.js -- Field of view / vision system
// C-faithful port of NetHack's Algorithm C from vision.c
// Replaces the simplified rule-based approach with the actual
// recursive line-of-sight scanner used by C NetHack.

import { game as _gstate } from './gstate.js';
import { COLNO, ROWNO, DOOR, SDOOR, POOL,
         IS_WALL, IS_DOOR, isok,
         D_CLOSED, D_LOCKED, D_TRAPPED,
         WATER, CLOUD, LAVAWALL, MOAT, ROOMOFFSET,
         CROSSWALL, TRWALL } from './const.js';
import { BOULDER } from './objects.js';
import { is_pool } from './dbridge.js';
import { TT_PIT, COULD_SEE, IN_SIGHT, MAX_RADIUS } from './const.js';
const TEMP_LIT  = 0x4;  // C ref: vision.h — set by do_light_sources() for dynamic light

// Module-level state for Algorithm C (C ref: vision.c lines 1125-1133)
let start_row, start_col, step;
let cs_rows, cs_left, cs_right;
let viz_clear;  // reference to FOV instance's viz_clear
let right_ptrs_arr, left_ptrs_arr;
let activeFov = null;
let vision_full_recalc = 0;
export function mark_vision_dirty() { vision_full_recalc = 1; }
export function get_vision_full_recalc() { return vision_full_recalc; }
export function clear_vision_full_recalc() { vision_full_recalc = 0; }
let vis_func = null;
let varg = null;

// MAX_RADIUS imported from const.js

function getMapCloudVisibility(map, x, y) {
    if (!map || !Array.isArray(map.gasClouds)) return false;
    for (const cloud of map.gasClouds) {
        if (cloud && (cloud.kind === 'selection') && Array.isArray(cloud.coords)) {
            for (const p of cloud.coords) {
                if (p && p.x === x && p.y === y) return true;
            }
            continue;
        }

        if (!cloud || typeof cloud !== 'object') continue;
        const cx = cloud.x;
        const cy = cloud.y;
        const radius = Number.isFinite(cloud.radius) ? Math.trunc(cloud.radius) : 1;
        if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(radius)) continue;
        const dx = cx - x;
        const dy = cy - y;
        if (dx * dx + dy * dy <= radius * radius) return true;
    }
    return false;
}

function isLightblockerMonster(mon) {
    if (!mon) return false;
    return !!(mon.m_ap_type || mon.appear_as_type || mon.mappearance);
}

function sign(z) { return z < 0 ? -1 : (z ? 1 : 0); }

// seenv angle bits (C ref: rm.h:379-386)
const SV0 = 0x01, SV1 = 0x02, SV2 = 0x04, SV3 = 0x08;
const SV4 = 0x10, SV5 = 0x20, SV6 = 0x40, SV7 = 0x80;
const SVALL = 0xFF;

// C ref: display.c:3347-3351
// seenv_matrix[dy+1][dx+1] gives the seenv bit for direction (dx,dy) from hero
const seenv_matrix = [
    [ SV2, SV1, SV0 ],   // dy=-1 (above hero)
    [ SV3, SVALL, SV7 ],  // dy=0  (same row)
    [ SV4, SV5, SV6 ],    // dy=+1 (below hero)
];

// ========================================================================
// does_block — C ref: vision.c:153 — what blocks vision
// ========================================================================
export function does_block(map, x, y) {
    if (!map) return true;
    const loc = map.at(x, y);
    if (!loc) return true;
    // C: IS_OBSTRUCTED(typ) = typ < POOL (types 0-15: stone, walls, tree, sdoor, scorr)
    if (loc.typ < POOL) return true;

    // Closed/locked/trapped doors block light.
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED | D_TRAPPED))) {
        return true;
    }

    // Clouds and special obstructions block light.
    if (loc.typ === CLOUD || loc.typ === WATER || loc.typ === LAVAWALL
        || (map.flags?.is_waterlevel && loc.typ === MOAT)) {
        return true;
    }

    // Boulders block light.
    const objs = map.objectsAt(x, y);
    for (const obj of objs) {
        if (obj.otyp === BOULDER) return true;
    }

    const mon = map.monsterAt(x, y);
    if (mon && !mon.minvis && isLightblockerMonster(mon)) return true;

    if (getMapCloudVisibility(map, x, y)) return true;
    return false;
}

// C ref: vision.c:105 — get_viz_clear()
// Autotranslated from vision.c:104
export function get_viz_clear(x, y) {
  if (isok(x,y) && !viz_clear[y][x]) return true;
  return false;
}

// C ref: vision.c:121, 121-? — vision_init()
export function vision_init() {
    vision_full_recalc = 0;
    // C also sets gv pointers to a pair of could-see arrays.
    // JS uses the active FOV object for that indirection.
}

// C ref: vision.c:205 — vision_reset()
// Rebuild all visibility-clear and pointer tables from the current map.
export function vision_reset(map) {
    if (activeFov) {
        activeFov.visionReset(map);
    } else if (map) {
        // Ensure a best-effort temporary state for callers.
        const fallback = new FOV();
        fallback.visionReset(map);
    }
}

// C ref: vision.c:262 — get_unused_cs()
function get_unused_cs() {
    const rows = [];
    const rmin = new Int16Array(ROWNO);
    const rmax = new Int16Array(ROWNO);
    for (let y = 0; y < ROWNO; y++) {
        rows.push(new Uint8Array(COLNO));
        rmin[y] = COLNO - 1;
        rmax[y] = 1;
    }
    return { rows, rmin, rmax };
}

// C ref: vision.c:237-251 — view_init()
// Autotranslated from vision.c:1639
export function view_init() {
}

// ========================================================================
// Bresenham path functions -- check line-of-sight between two points
// C ref: vision.c:1407-1590
// Each checks intermediate points only (not endpoints).
// Returns 1 if clear, 0 if blocked.
// ========================================================================

// Quadrant I: target is right and up (scol < x2, srow > y2)
// C ref: vision.c:1407-1449
function q1_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x;
    const dy = y - y2;
    const dxs = dx << 1;
    const dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x++; err -= dys; }
            y--;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x++;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

// Quadrant IV: target is right and down (scol < x2, srow < y2)
// C ref: vision.c:1454-1496
function q4_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x2 - x;
    const dy = y2 - y;
    const dxs = dx << 1;
    const dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x++; err -= dys; }
            y++;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x++;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

// Quadrant II: target is left and up (scol > x2, srow > y2)
// C ref: vision.c:1501-1543
function q2_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2;
    const dy = y - y2;
    const dxs = dx << 1;
    const dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x--; err -= dys; }
            y--;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y--; err -= dxs; }
            x--;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

// Quadrant III: target is left and down (scol > x2, srow < y2)
// C ref: vision.c:1548-1590
function q3_path(srow, scol, y2, x2) {
    let x = scol, y = srow;
    const dx = x - x2;
    const dy = y2 - y;
    const dxs = dx << 1;
    const dys = dy << 1;
    if (dy > dx) {
        let err = dxs - dy;
        for (let k = dy - 1; k; k--) {
            if (err >= 0) { x--; err -= dys; }
            y++;
            err += dxs;
            if (!viz_clear[y][x]) return 0;
        }
    } else {
        let err = dys - dx;
        for (let k = dx - 1; k; k--) {
            if (err >= 0) { y++; err -= dxs; }
            x--;
            err += dys;
            if (!viz_clear[y][x]) return 0;
        }
    }
    return 1;
}

// clear_path() -- check LOS between two arbitrary points
// C ref: vision.c:1601-1625
export function clear_path(col1, row1, col2, row2) {
    if (col1 < col2) {
        if (row1 > row2) return q1_path(row1, col1, row2, col2);
        else return q4_path(row1, col1, row2, col2);
    } else {
        if (row1 > row2) return q2_path(row1, col1, row2, col2);
        else if (row1 === row2 && col1 === col2) return 1;
        else return q3_path(row1, col1, row2, col2);
    }
}

// ========================================================================
// right_side() -- recursive scanner for right half of vision
// C ref: vision.c:1654-1840
// ========================================================================
function right_side(row, left, right_mark, limits) {
    const nrow = row + step;
    const next_limits = limits == null ? null : limits + 1;
    const deeper = nrow >= 0 && nrow < ROWNO && (!next_limits || CIRCLE_DATA[limits] >= CIRCLE_DATA[next_limits]);
    let lim_max;
    let rowp = null;
    let row_min = null;
    let row_max = null;

    if (!vis_func) {
        rowp = cs_rows[row];
        row_min = cs_left;
        row_max = cs_right;
    }

    if (limits != null) {
        lim_max = start_col + CIRCLE_DATA[limits];
        if (lim_max > COLNO - 1)
            lim_max = COLNO - 1;
        if (right_mark > lim_max)
            right_mark = lim_max;
    } else {
        lim_max = COLNO - 1;
    }

    while (left <= right_mark) {
        const right_edge = Math.min(right_ptrs_arr[row][left], lim_max);
        let right;

        if (!viz_clear[row][left]) {
            let reach = right_edge;
            if (reach > right_mark) {
                reach = viz_clear[row - step]
                    ? (viz_clear[row - step][right_mark] ? right_mark + 1 : right_mark)
                    : right_mark;
            }
            if (vis_func) {
                for (let i = left; i <= reach; i++) vis_func(i, row, varg);
            } else {
                for (let i = left; i <= reach; i++) rowp[i] = COULD_SEE;
                if (row_min[row] > left) row_min[row] = left;
                if (row_max[row] < reach) row_max[row] = reach;
            }
            left = reach + 1;
            continue;
        }

        if (left !== start_col) {
            for (; left <= right_edge; left++) {
                const clear = step < 0
                    ? q1_path(start_row, start_col, row, left)
                    : q4_path(start_row, start_col, row, left);
                if (clear) break;
            }

            if (left > lim_max)
                return;
            if (left === lim_max) {
                if (vis_func) vis_func(lim_max, row, varg);
                else {
                    rowp[lim_max] = COULD_SEE;
                    if (row_max[row] < lim_max) row_max[row] = lim_max;
                }
                return;
            }
            if (left >= right_edge) {
                left = right_edge;
                continue;
            }
        }

        if (right_mark < right_edge) {
            for (right = right_mark; right <= right_edge; right++) {
                const clear = step < 0
                    ? q1_path(start_row, start_col, row, right)
                    : q4_path(start_row, start_col, row, right);
                if (!clear) break;
            }
            --right;
        } else {
            right = right_edge;
        }

        if (left <= right) {
            if (left === right && left === start_col && start_col < (COLNO - 1)
                && !viz_clear[row][start_col + 1]) {
                right = start_col + 1;
            }

            if (right > lim_max)
                right = lim_max;

            if (vis_func) {
                for (let i = left; i <= right; i++) vis_func(i, row, varg);
            } else {
                for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
                if (row_min[row] > left) row_min[row] = left;
                if (row_max[row] < right) row_max[row] = right;
            }

            if (deeper)
                right_side(nrow, left, right, next_limits);
            left = right + 1;
        }
    }
}

// ========================================================================
// left_side() -- recursive scanner for left half of vision
// C ref: vision.c:1846-1974
// ========================================================================
function left_side(row, left_mark, right, limits) {
    const nrow = row + step;
    const next_limits = limits == null ? null : limits + 1;
    const deeper = nrow >= 0 && nrow < ROWNO && (!next_limits || CIRCLE_DATA[limits] >= CIRCLE_DATA[next_limits]);
    let lim_min = 0;
    let rowp = null;
    let row_min = null;
    let row_max = null;

    if (!vis_func) {
        rowp = cs_rows[row];
        row_min = cs_left;
        row_max = cs_right;
    }

    if (limits != null) {
        lim_min = start_col - CIRCLE_DATA[limits];
        if (lim_min < 0) lim_min = 0;
        if (left_mark < lim_min) left_mark = lim_min;
    }

    while (right >= left_mark) {
        let left_edge = left_ptrs_arr[row][right];
        if (left_edge < lim_min) left_edge = lim_min;

        if (!viz_clear[row][right]) {
            if (left_edge < left_mark) {
                left_edge = viz_clear[row - step]
                    ? (viz_clear[row - step][left_mark] ? left_mark - 1 : left_mark)
                    : left_mark;
            }

            if (vis_func) {
                for (let i = left_edge; i <= right; i++) vis_func(i, row, varg);
            } else {
                for (let i = left_edge; i <= right; i++) rowp[i] = COULD_SEE;
                if (row_min[row] > left_edge) row_min[row] = left_edge;
                if (row_max[row] < right) row_max[row] = right;
            }
            right = left_edge - 1;
            continue;
        }

        if (right !== start_col) {
            for (; right >= left_edge; right--) {
                const clear = step < 0
                    ? q2_path(start_row, start_col, row, right)
                    : q3_path(start_row, start_col, row, right);
                if (clear) break;
            }

            if (right < lim_min) return;
            if (right === lim_min) {
                if (vis_func) vis_func(lim_min, row, varg);
                else {
                    rowp[lim_min] = COULD_SEE;
                    if (row_min[row] > lim_min) row_min[row] = lim_min;
                }
                return;
            }
            if (right <= left_edge) {
                right = left_edge;
                continue;
            }
        }

        let left;
        if (left_mark > left_edge) {
            for (left = left_mark; left >= left_edge; --left) {
                const clear = step < 0
                    ? q2_path(start_row, start_col, row, left)
                    : q3_path(start_row, start_col, row, left);
                if (!clear) break;
            }
            left++;
        } else {
            left = left_edge;
        }

        if (left <= right) {
            if (left === right && right === start_col && start_col > 0
                && !viz_clear[row][start_col - 1]) {
                left = start_col - 1;
            }

            if (left < lim_min) left = lim_min;

            if (vis_func) {
                for (let i = left; i <= right; i++) vis_func(i, row, varg);
            } else {
                for (let i = left; i <= right; i++) rowp[i] = COULD_SEE;
                if (row_min[row] > left) row_min[row] = left;
                if (row_max[row] < right) row_max[row] = right;
            }

            if (deeper)
                left_side(nrow, left, right, next_limits);
            right = left - 1;
        }
    }
}

// ========================================================================
// view_from() -- Algorithm C entry point
// C ref: vision.c:1991-2080
// ========================================================================
function view_from(srow, scol, loc_cs_rows, left_most, right_most, range = 0, func, arg) {
    start_col = scol;
    start_row = srow;
    cs_rows = loc_cs_rows;
    cs_left = left_most;
    cs_right = right_most;
    vis_func = func;
    varg = arg;
    let limits = null;

    // Determine starting row extent
    let left, right;
    if (viz_clear[srow][scol]) {
        left = left_ptrs_arr[srow][scol];
        right = right_ptrs_arr[srow][scol];
    } else {
        // In stone: see adjacent squares
        left = (!scol) ? 0
            : (viz_clear[srow][scol - 1] ? left_ptrs_arr[srow][scol - 1] : scol - 1);
        right = (scol === COLNO - 1) ? COLNO - 1
            : (viz_clear[srow][scol + 1] ? right_ptrs_arr[srow][scol + 1] : scol + 1);
    }

    if (range) {
        if (range > MAX_RADIUS || range < 1)
            throw new Error(`view_from called with range ${range}`);
        limits = circle_ptr(range) + 1;
        if (left < scol - range)
            left = scol - range;
        if (right > scol + range)
            right = scol + range;
    }

    if (vis_func) {
        for (let i = left; i <= right; i++)
            vis_func(i, srow, arg);
    } else {
        const rowp = cs_rows[srow];
        for (let i = left; i <= right; i++)
            rowp[i] = COULD_SEE;
        cs_left[srow] = left;
        cs_right[srow] = right;
    }

    // Scan downward
    let nrow;
    if ((nrow = srow + 1) < ROWNO) {
        step = 1;
        if (scol < COLNO - 1) right_side(nrow, scol, right, limits);
        if (scol) left_side(nrow, left, scol, limits);
    }

    // Scan upward
    if ((nrow = srow - 1) >= 0) {
        step = -1;
        if (scol < COLNO - 1) right_side(nrow, scol, right, limits);
        if (scol) left_side(nrow, left, scol, limits);
    }
}

// ========================================================================
// fill_point() / dig_point() — maintain clear/block pointers
// C ref: vision.c:956-1040
// ========================================================================
export function fill_point(row, col) {
    let i;

    if (!viz_clear[row][col]) return;
    viz_clear[row][col] = 0;

    if (col === 0) {
        if (viz_clear[row][1]) {
            right_ptrs_arr[row][0] = 0;
        } else {
            right_ptrs_arr[row][0] = right_ptrs_arr[row][1];
            for (i = 1; i <= right_ptrs_arr[row][1]; i++)
                left_ptrs_arr[row][i] = 0;
        }
    } else if (col === (COLNO - 1)) {
        if (viz_clear[row][COLNO - 2]) {
            left_ptrs_arr[row][COLNO - 1] = COLNO - 1;
        } else {
            left_ptrs_arr[row][COLNO - 1] = left_ptrs_arr[row][COLNO - 2];
            for (i = left_ptrs_arr[row][COLNO - 2]; i < COLNO - 1; i++)
                right_ptrs_arr[row][i] = COLNO - 1;
        }

    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        for (i = left_ptrs_arr[row][col - 1] + 1; i <= col; i++)
            right_ptrs_arr[row][i] = col;
        if (!left_ptrs_arr[row][col - 1])
            right_ptrs_arr[row][0] = col;

        for (i = col; i < right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = col;
        if (right_ptrs_arr[row][col + 1] === (COLNO - 1))
            left_ptrs_arr[row][COLNO - 1] = col;

    } else if (viz_clear[row][col - 1]) {
        for (i = col; i <= right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = col;
        for (i = left_ptrs_arr[row][col - 1] + 1; i < col; i++)
            right_ptrs_arr[row][i] = col;
        if (!left_ptrs_arr[row][col - 1])
            right_ptrs_arr[row][i] = col;
        right_ptrs_arr[row][col] = right_ptrs_arr[row][col + 1];

    } else if (viz_clear[row][col + 1]) {
        for (i = left_ptrs_arr[row][col - 1]; i <= col; i++)
            right_ptrs_arr[row][i] = col;
        for (i = col + 1; i < right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = col;
        if (right_ptrs_arr[row][col + 1] === (COLNO - 1))
            left_ptrs_arr[row][i] = col;
        left_ptrs_arr[row][col] = left_ptrs_arr[row][col - 1];

    } else {
        for (i = left_ptrs_arr[row][col - 1]; i <= col; i++)
            right_ptrs_arr[row][i] = right_ptrs_arr[row][col + 1];
        for (i = col; i <= right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = left_ptrs_arr[row][col - 1];
    }
}
export function dig_point(row, col) {
    let i;

    if (viz_clear[row][col]) return;
    viz_clear[row][col] = 1;

    if (col === 0) {
        if (viz_clear[row][1]) {
            right_ptrs_arr[row][0] = right_ptrs_arr[row][1];
        } else {
            right_ptrs_arr[row][0] = 1;
            for (i = 1; i <= right_ptrs_arr[row][1]; i++)
                left_ptrs_arr[row][i] = 1;
        }
    } else if (col === (COLNO - 1)) {
        if (viz_clear[row][COLNO - 2]) {
            left_ptrs_arr[row][COLNO - 1] = left_ptrs_arr[row][COLNO - 2];
        } else {
            left_ptrs_arr[row][COLNO - 1] = COLNO - 2;
            for (i = left_ptrs_arr[row][COLNO - 2]; i < COLNO - 1; i++)
                right_ptrs_arr[row][i] = COLNO - 2;
        }
    } else if (viz_clear[row][col - 1] && viz_clear[row][col + 1]) {
        for (i = left_ptrs_arr[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i]) continue;
            right_ptrs_arr[row][i] = right_ptrs_arr[row][col + 1];
        }
        for (i = col; i <= right_ptrs_arr[row][col + 1]; i++) {
            if (!viz_clear[row][i]) continue;
            left_ptrs_arr[row][i] = left_ptrs_arr[row][col - 1];
        }
    } else if (viz_clear[row][col - 1]) {
        for (i = col + 1; i <= right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = col + 1;
        for (i = left_ptrs_arr[row][col - 1]; i <= col; i++) {
            if (!viz_clear[row][i]) continue;
            right_ptrs_arr[row][i] = col + 1;
        }
        left_ptrs_arr[row][col] = left_ptrs_arr[row][col - 1];
    } else if (viz_clear[row][col + 1]) {
        for (i = left_ptrs_arr[row][col - 1]; i < col; i++)
            right_ptrs_arr[row][i] = col - 1;
        for (i = col; i <= right_ptrs_arr[row][col + 1]; i++) {
            if (!viz_clear[row][i]) continue;
            left_ptrs_arr[row][i] = col - 1;
        }
        right_ptrs_arr[row][col] = right_ptrs_arr[row][col + 1];
    } else {
        for (i = left_ptrs_arr[row][col - 1]; i < col; i++)
            right_ptrs_arr[row][i] = col - 1;
        for (i = col + 1; i <= right_ptrs_arr[row][col + 1]; i++)
            left_ptrs_arr[row][i] = col + 1;
        left_ptrs_arr[row][col] = col - 1;
        right_ptrs_arr[row][col] = col + 1;
    }
}

export function block_point(x, y) {
    if (!isok(x, y)) return;
    fill_point(y, x);
    if (activeFov?.couldSee(x, y)) vision_full_recalc = 1;
}

export function unblock_point(x, y) {
    if (!isok(x, y)) return;
    dig_point(y, x);
    if (activeFov?.couldSee(x, y)) vision_full_recalc = 1;
}

export function recalc_block_point(x, y) {
    if (!activeFov || !activeFov._map || !isok(x, y)) return;
    if (does_block(activeFov._map, x, y)) block_point(x, y);
    else unblock_point(x, y);
}

// ========================================================================
// rogue_vision() — old rogue style visibility
// C ref: vision.c:302-358
// ========================================================================
function rogue_vision(next, rmin, rmax) {
    if (!activeFov || !activeFov._map) return;
    const gameMap = activeFov._map;
    const px = activeFov._playerX;
    const py = activeFov._playerY;
    if (!isok(px, py)) return;

    const loc = gameMap.at(px, py);
    if (!loc) return;
    const rnum = Number(loc.roomno) - ROOMOFFSET;

    if (rnum >= 0 && rnum < gameMap.rooms.length) {
        const room = gameMap.rooms[rnum];
        for (let zy = room.ly - 1; zy <= room.hy + 1; zy++) {
            if (!isok(0, zy)) continue;
            const start = Math.max(0, room.lx - 1);
            const end = Math.min(COLNO - 1, room.hx + 1);
            rmin[zy] = start;
            rmax[zy] = end;
            for (let zx = start; zx <= end; zx++) {
                next[zy][zx] = room.rlit ? (COULD_SEE | IN_SIGHT) : COULD_SEE;
            }
        }
    }

    const in_door = loc.typ === DOOR;
    const ylo = Math.max(0, py - 1);
    const yhi = Math.min(ROWNO - 1, py + 1);
    const xlo = Math.max(1, px - 1);
    const xhi = Math.min(COLNO - 1, px + 1);

    for (let zy = ylo; zy <= yhi; zy++) {
        if (rmin[zy] > xlo) rmin[zy] = xlo;
        if (rmax[zy] < xhi) rmax[zy] = xhi;
        for (let zx = xlo; zx <= xhi; zx++) {
            next[zy][zx] = COULD_SEE | IN_SIGHT;
            if (in_door && (zx === px || zy === py)) {
                // noop redraw hook for compatibility
            }
        }
    }
}

// ========================================================================
// FOV class
// ========================================================================
export class FOV {
    constructor() {
        // visible[x][y] = true if currently visible (public API)
        this.visible = [];
        for (let x = 0; x < COLNO; x++) {
            this.visible[x] = new Array(ROWNO).fill(false);
        }
        this._map = null;
    }

    // Build viz_clear, left_ptrs, right_ptrs from map terrain
    // C ref: vision.c:210-265 vision_reset()
    visionReset(map) {
        this._map = map;
        const vc = [];
        const lp = [];
        const rp = [];
        for (let y = 0; y < ROWNO; y++) {
            vc[y] = new Uint8Array(COLNO);
            lp[y] = new Int16Array(COLNO);
            rp[y] = new Int16Array(COLNO);
        }

        for (let y = 0; y < ROWNO; y++) {
            let dig_left = 0;
            let block = true; // position (0,y) is always stone
            for (let x = 1; x < COLNO; x++) {
                const isBlocked = does_block(map, x, y);
                if (block !== isBlocked) {
                    if (block) {
                        // Was blocked, now clear: set ptrs for blocked segment
                        for (let i = dig_left; i < x; i++) {
                            lp[y][i] = dig_left;
                            rp[y][i] = x - 1;
                        }
                    } else {
                        // Was clear, now blocked: set ptrs for clear segment
                        let i = dig_left;
                        if (dig_left) dig_left--;
                        for (; i < x; i++) {
                            lp[y][i] = dig_left;
                            rp[y][i] = x;
                            vc[y][i] = 1;
                        }
                    }
                    dig_left = x;
                    block = !block;
                }
            }
            // Handle right boundary
            let i = dig_left;
            if (!block && dig_left) dig_left--;
            for (; i < COLNO; i++) {
                lp[y][i] = dig_left;
                rp[y][i] = COLNO - 1;
                vc[y][i] = block ? 0 : 1;
            }
        }

        this.viz_clear = vc;
        this.left_ptrs = lp;
        this.right_ptrs = rp;
    }

    // Recompute field of view from player position
    // C ref: vision.c:511-846 vision_recalc()
    compute(gameMap, px, py, lightFn, playerState = null) {
        if (!lightFn && this._lightFn) {
            lightFn = this._lightFn;
            if (!playerState) playerState = this._lightPlayer || null;
        } else if (lightFn) {
            this._lightFn = lightFn;
            this._lightPlayer = playerState || null;
        }
        // Build lookup tables (once per level, or rebuild each time for simplicity)
        this.visionReset(gameMap);
        activeFov = this;
        this._playerX = px;
        this._playerY = py;

        // Set module-level references for the recursive functions
        viz_clear = this.viz_clear;
        right_ptrs_arr = this.right_ptrs;
        left_ptrs_arr = this.left_ptrs;
        vision_full_recalc = 0;

        // Allocate cs_array[ROWNO][COLNO] for COULD_SEE/IN_SIGHT bits
        const cs = [];
        const csLeft = new Int16Array(ROWNO).fill(COLNO);
        const csRight = new Int16Array(ROWNO).fill(0);
        for (let y = 0; y < ROWNO; y++) {
            cs[y] = new Uint8Array(COLNO);
        }

        // Run Algorithm C to compute COULD_SEE
        const hero = playerState || null;
        const heroBlind = !!(hero?.blind || hero?.Blind);
        const heroUnderwater = !!(hero?.underwater || hero?.uinwater || hero?.Underwater);
        const heroInPit = !!(hero?.utrap && Number(hero?.utraptype) === TT_PIT);
        const isRogueLevel = !!(gameMap?.flags?.is_rogue
            || gameMap?.flags?.roguelike
            || gameMap?.flags?.is_rogue_lev);
        if (heroBlind) {
            // C ref: vision.c blind branch computes COULD_SEE only.
            view_from(py, px, cs, csLeft, csRight);
        } else if (isRogueLevel) {
            rogue_vision(cs, csLeft, csRight);
        } else if (heroUnderwater && !gameMap?.flags?.is_waterlevel) {
            // C ref: vision.c underwater branch (non-water levels): only adjacent
            // underwater squares are marked visible/could-see.
            for (let row = py - 1; row <= py + 1; row++) {
                for (let col = px - 1; col <= px + 1; col++) {
                    if (!isok(col, row) || !is_pool(col, row, gameMap)) continue;
                    csLeft[row] = Math.min(csLeft[row], col);
                    csRight[row] = Math.max(csRight[row], col);
                    cs[row][col] = IN_SIGHT | COULD_SEE;
                }
            }
        } else if (heroInPit) {
            // C ref: vision.c pit branch: COULD_SEE/IN_SIGHT limited to 3x3.
            for (let row = py - 1; row <= py + 1; row++) {
                if (row < 0 || row >= ROWNO) continue;
                const rowMin = Math.max(1, px - 1);
                const rowMax = Math.min(COLNO - 1, px + 1);
                csLeft[row] = Math.min(csLeft[row], rowMin);
                csRight[row] = Math.max(csRight[row], rowMax);
                for (let col = rowMin; col <= rowMax; col++) {
                    cs[row][col] = IN_SIGHT | COULD_SEE;
                }
            }
        } else {
            view_from(py, px, cs, csLeft, csRight);
        }

        // Apply night vision (range 1): adjacent squares with COULD_SEE get IN_SIGHT.
        // C ref: vision.c:670-699 (u.nv_range = 1 for standard hero)
        // C marks ALL cells with COULD_SEE within nv_range as IN_SIGHT — no
        // viz_clear check — so walls adjacent to the hero are visible.
        if (!heroBlind && !(heroUnderwater && !gameMap?.flags?.is_waterlevel) && !heroInPit) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = px + dx, ny = py + dy;
                    if (nx >= 0 && nx < COLNO && ny >= 0 && ny < ROWNO) {
                        if (!cs[ny][nx]) continue;
                        cs[ny][nx] |= IN_SIGHT;
                    }
                }
            }

            // C ref: vision.c:703 — do_light_sources(next_array) marks TEMP_LIT
            if (lightFn) lightFn(cs, gameMap, playerState || { x: px, y: py });

            // Lighting loop: COULD_SEE + (lit | TEMP_LIT) → IN_SIGHT
            // C ref: vision.c:727-829
            for (let row = 0; row < ROWNO; row++) {
                for (let col = 0; col < COLNO; col++) {
                    if (cs[row][col] & IN_SIGHT) {
                        // Already visible via night vision — nothing more to do
                    } else if (cs[row][col] & COULD_SEE) {
                        const loc = gameMap.at(col, row);
                        if (loc && (loc.lit || (cs[row][col] & TEMP_LIT))) {
                            // Door/wall special case: only visible if adjacent square
                            // toward hero is also lit (prevents seeing doors at end
                            // of dark hallways)
                            // C ref: vision.c:760-784
                            if ((IS_DOOR(loc.typ) || loc.typ === SDOOR || IS_WALL(loc.typ))
                                && !this.viz_clear[row][col]) {
                                const dx = sign(px - col);
                                const dy = sign(py - row);
                                const adjCol = col + dx, adjRow = row + dy;
                                if (adjCol >= 0 && adjCol < COLNO && adjRow >= 0 && adjRow < ROWNO) {
                                    const adj = gameMap.at(adjCol, adjRow);
                                    if (adj && (adj.lit || (cs[adjRow][adjCol] & TEMP_LIT))) {
                                        cs[row][col] |= IN_SIGHT;
                                    }
                                }
                            } else {
                                cs[row][col] |= IN_SIGHT;
                            }
                        }
                    }
                }
            }
        }

        // Store cs_array for couldsee() checks
        this._cs = cs;

        // Update seenv on map cells for wall angle tracking.
        // C ref: vision.c:747-749 — seenv |= new_angle(lev, sv, row, col)
        // Hero's own cell always gets SVALL.
        const heroLoc = gameMap.at(px, py);
        if (heroLoc) heroLoc.seenv = SVALL;

        for (let row = 0; row < ROWNO; row++) {
            for (let col = 0; col < COLNO; col++) {
                if (!(cs[row][col] & IN_SIGHT)) continue;
                if (col === px && row === py) continue; // hero handled above
                const loc = gameMap.at(col, row);
                if (!loc) continue;
                const dx = sign(col - px);    // C: colbump-based, effectively sign(col - u.ux)
                const dy = sign(py - row);    // C: sign(u.uy - row) — note opposite sign
                let sv = seenv_matrix[dy + 1][dx + 1];
                // C ref: vision.c:414-451 new_angle() extension for
                // crosswalls/T-walls: extend spine if adjacent cell is clear.
                if (loc.typ >= CROSSWALL && loc.typ <= TRWALL) {
                    switch (sv) {
                    case SV0:
                        if (col > 0 && this.viz_clear[row][col - 1]) sv |= SV7;
                        if (row > 0 && this.viz_clear[row - 1][col]) sv |= SV1;
                        break;
                    case SV2:
                        if (row > 0 && this.viz_clear[row - 1][col]) sv |= SV1;
                        if (col < COLNO - 1 && this.viz_clear[row][col + 1]) sv |= SV3;
                        break;
                    case SV4:
                        if (col < COLNO - 1 && this.viz_clear[row][col + 1]) sv |= SV3;
                        if (row < ROWNO - 1 && this.viz_clear[row + 1][col]) sv |= SV5;
                        break;
                    case SV6:
                        if (row < ROWNO - 1 && this.viz_clear[row + 1][col]) sv |= SV5;
                        if (col > 0 && this.viz_clear[row][col - 1]) sv |= SV7;
                        break;
                    }
                }
                loc.seenv |= sv;
            }
        }

        // Copy to visible[x][y] for canSee() API
        for (let x = 0; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                this.visible[x][y] = !!(cs[y][x] & IN_SIGHT);
            }
        }
    }

    // Can the player see position (x, y)?
    canSee(x, y) {
        if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return false;
        return this.visible[x][y];
    }

    // Could the player see this position (LOS only, ignoring lighting)?
    // C ref: vision.h #define couldsee(x, y) ((gv.viz_array[y][x] & COULD_SEE) != 0)
    couldSee(x, y) {
        if (!this._cs || x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return false;
        return !!(this._cs[y][x] & COULD_SEE);
    }
}

// Map-based LOS check for when viz_clear tables aren't available
// (e.g., monmove tests that don't run the full FOV pipeline)
function is_clear_map(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return false;
    if (loc.typ < POOL) return false;
    if (IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED))) return false;
    const objs = map.objectsAt(x, y);
    for (const obj of objs) {
        if (obj.otyp === BOULDER) return false;
    }
    return true;
}

function clear_path_map(map, col1, row1, col2, row2) {
    // Bresenham LOS using map lookups instead of viz_clear table
    const dx = col2 - col1;
    const dy = row2 - row1;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const sx = dx > 0 ? 1 : -1;
    const sy = dy > 0 ? 1 : -1;
    let x = col1, y = row1;
    if (ady > adx) {
        let err = (adx << 1) - ady;
        for (let k = ady - 1; k > 0; k--) {
            if (err >= 0) { x += sx; err -= ady << 1; }
            y += sy;
            err += adx << 1;
            if (!is_clear_map(map, x, y)) return false;
        }
    } else if (adx > 0) {
        let err = (ady << 1) - adx;
        for (let k = adx - 1; k > 0; k--) {
            if (err >= 0) { y += sy; err -= adx << 1; }
            x += sx;
            err += ady << 1;
            if (!is_clear_map(map, x, y)) return false;
        }
    }
    return true;
}

function circle_ptr(range) {
    if (!Number.isInteger(range) || range < 1 || range > MAX_RADIUS) {
        throw new Error(`do_clear_area: illegal range ${range}`);
    }
    return CIRCLE_START[range];
}

// Monster can see target position
// C ref: vision.h #define m_cansee(mtmp, x2, y2) clear_path(mtmp->mx, mtmp->my, x2, y2)
export function m_cansee(mon, map, x2, y2) {
    if (viz_clear) return !!clear_path(mon.mx, mon.my, x2, y2);
    return clear_path_map(map, mon.mx, mon.my, x2, y2);
}

// Is this position currently in the player's sight?
// C ref: vision.h #define cansee(x, y) ((gv.viz_array[y][x] & IN_SIGHT) != 0)
// In C, cansee checks IN_SIGHT (accounts for lighting); couldsee checks
// COULD_SEE (line-of-sight only).  JS's FOV.canSee already models IN_SIGHT,
// so cansee() delegates to the FOV object when available, falling back to
// couldsee (LOS-only) when no FOV is present.
export function cansee(map, player, fov, x, y) {
    // Support C-style 2-arg cansee(x, y) calls with gstate fallback
    if (typeof map === 'number' && typeof player === 'number' && fov === undefined) {
        x = map; y = player;
        const g = _gstate;
        map = g?.lev; player = g?.player; fov = g?.fov;
    }
    if (fov?.canSee) return fov.canSee(x, y);
    return couldsee(map, player, x, y);
}

export function getActiveFov() {
    return activeFov;
}

// Could the player see this position (LOS only, ignoring lighting)
// C ref: vision.h #define couldsee(x, y) ((gv.viz_array[y][x] & COULD_SEE) != 0)
export function couldsee(map, player, x, y) {
    // Support C-style 2-arg couldsee(x, y) calls with gstate fallback
    if (typeof map === 'number' && typeof player === 'number' && x === undefined) {
        x = map; y = player;
        const g = _gstate;
        map = g?.lev; player = g?.player;
    }
    if (player && player.utrap && Number(player.utraptype) === TT_PIT) {
        return Math.abs((player.x | 0) - (x | 0)) <= 1
            && Math.abs((player.y | 0) - (y | 0)) <= 1;
    }
    // Prefer the active vision-array result when available; C couldsee()
    // reads gv.viz_array, not geometric LOS.
    if (activeFov && typeof activeFov.couldSee === 'function'
        && Number.isInteger(activeFov._playerX) && Number.isInteger(activeFov._playerY)
        && player && activeFov._playerX === player.x && activeFov._playerY === player.y) {
        return activeFov.couldSee(x, y);
    }
    if (viz_clear) return !!clear_path(player.x, player.y, x, y);
    return clear_path_map(map, player.x, player.y, x, y);
}

// C circle_data[] and circle_start[] (vision.c) for range-limited scans.
const CIRCLE_DATA = [
    0,
    1, 1,
    2, 2, 1,
    3, 3, 2, 1,
    4, 4, 4, 3, 2,
    5, 5, 5, 4, 3, 2,
    6, 6, 6, 5, 5, 4, 2,
    7, 7, 7, 6, 6, 5, 4, 2,
    8, 8, 8, 7, 7, 6, 6, 4, 2,
    9, 9, 9, 9, 8, 8, 7, 6, 5, 3,
    10, 10, 10, 10, 9, 9, 8, 7, 6, 5, 3,
    11, 11, 11, 11, 10, 10, 9, 9, 8, 7, 5, 3,
    12, 12, 12, 12, 11, 11, 10, 10, 9, 8, 7, 5, 3,
    13, 13, 13, 13, 12, 12, 12, 11, 10, 10, 9, 7, 6, 3,
    14, 14, 14, 14, 13, 13, 13, 12, 12, 11, 10, 9, 8, 6, 3,
    15, 15, 15, 15, 14, 14, 14, 13, 13, 12, 11, 10, 9, 8, 6, 3,
    16,
];
const CIRCLE_START = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 120];

// C ref: vision.c:2095-2137 — do_clear_area
// Compute LOS from (scol, srow) and call func(x, y, arg) for each visible
// position within range. Used by dog_goal's wantdoor search.
export async function do_clear_area(fov, map, scol, srow, range, func, arg) {
    const fovObj = fov || activeFov;
    if (!map || !isok(scol, srow) || typeof func !== 'function') return;
    const r = range | 0;
    if (r < 1 || r > MAX_RADIUS)
        throw new Error(`do_clear_area: illegal range ${r}`);

    if (fovObj && fovObj.viz_clear) {
        viz_clear = fovObj.viz_clear;
        right_ptrs_arr = fovObj.right_ptrs;
        left_ptrs_arr = fovObj.left_ptrs;
    }

    const isHeroCenter = fovObj
        && isok(fovObj._playerX, fovObj._playerY)
        && fovObj._playerX === scol
        && fovObj._playerY === srow;

    if (!isHeroCenter) {
        view_from(srow, scol, null, null, null, r, func, arg);
        return;
    }

    const px = fovObj._playerX;
    const py = fovObj._playerY;
    if (vision_full_recalc && fovObj?.compute) {
        fovObj.compute(map || fovObj._map, px, py);
    }
    const ylo = Math.max(0, py - r);
    const ymax = Math.min(ROWNO - 1, py + r);
    const base = circle_ptr(r);

    const canSee = (x, y) => (fovObj?.couldSee?.(x, y)
        || clear_path_map(map, px, py, x, y));

    // Override only in legacy detection contexts where detection bypasses terrain.
    // JS currently has no direct hook for function identity like C's detecting().
    const override_vision = false;

    for (let y = ylo; y <= ymax; y++) {
        const offset = CIRCLE_DATA[base + Math.abs(py - y)] || 0;
        const xmin = Math.max(1, px - offset);
        const xmax = Math.min(COLNO - 1, px + offset);
        for (let x = xmin; x <= xmax; x++) {
            if (override_vision || canSee(x, y))
                await func(x, y, arg);
        }
    }
}
