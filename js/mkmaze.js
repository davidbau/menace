// mkmaze.c core helpers and maze generation paths.

import {
    COLNO, ROWNO, STONE, HWALL, DOOR, CROSSWALL, LAVAWALL, LAVAPOOL, IRONBARS, WATER, SDOOR,
    CORR, ROOM, AIR, CLOUD, MAGIC_PORTAL, VIBRATING_SQUARE, MKTRAP_MAZEFLAG,
    POOL, TLWALL, TRWALL, TUWALL, TDWALL, BRCORNER, BLCORNER, TRCORNER, TLCORNER,
    IS_WALL, IS_POOL, isok,
    QUEST, GNOMISH_MINES,
    W_NONDIGGABLE,
} from './const.js';
import { rn1, rn2, rnd } from './rng.js';
import {
    maketrap,
    mktrap,
    wallify_region,
    wallification,
    fix_wall_spines,
    deltrap,
    enexto,
    resolveBranchPlacementForLevel,
    load_special_by_protofile,
    bound_digging,
    repair_irregular_room_boundaries,
} from './dungeon.js';
import { placeFloorObject } from './invent.js';
import { mkobj, mksobj, mkcorpstat, set_corpsenm, weight } from './mkobj.js';
import { GEM_CLASS, RANDOM_CLASS, BOULDER, GOLD_PIECE, STATUE } from './objects.js';
import { makemon, rndmonnum, getMakemonRoleIndex } from './makemon.js';
import { NO_MM_FLAGS,
         LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
         LR_TELE, LR_UPTELE, LR_DOWNTELE } from './const.js';
import { mons, PM_MINOTAUR, PM_ARCHEOLOGIST, PM_WIZARD, PM_CLERIC, MR_STONE } from './monsters.js';
import { roles } from './role.js';
import {
    occupied,
    mkstairs,
    generate_stairs_find_room,
    place_branch,
} from './mklev.js';
import { somex, somey, somexyspace } from './mkroom.js';
import { block_point, unblock_point, recalc_block_point } from './vision.js';
import { create_gas_cloud, clear_heros_fault } from './region.js';
import { Norep } from './pline.js';
import { dist2 } from './hacklib.js';
import { envFlag } from './runtime_env.js';

function at(map, x, y) {
    return map && map.at ? map.at(x, y) : null;
}

function hasNondiggableWallFlag(loc) {
    const wallInfo = Number(loc?.wall_info ?? loc?.flags ?? 0);
    return (wallInfo & W_NONDIGGABLE) !== 0;
}

async function vision_call(fn, x, y) {
    try {
        await fn(x, y);
    } catch (_err) {
        // Some unit paths call map generators without a full vision context.
    }
}

function bubble_trace_enabled() {
    return envFlag('DEBUG_BUBBLES_TRACE');
}

function bubble_trace(msg) {
    if (!bubble_trace_enabled()) return;
    console.log(`[BUBBLE_TRACE] ${msg}`);
}

// C ref: mkmaze.c iswall
export function iswall(map, x, y) {
    const loc = at(map, x, y);
    if (!loc) return 1;
    return IS_WALL(loc.typ)
        || loc.typ === LAVAWALL
        || loc.typ === WATER
        || loc.typ === SDOOR
        || loc.typ === IRONBARS
        || loc.typ === CROSSWALL ? 1 : 0;
}

// C ref: mkmaze.c iswall_or_stone
// Autotranslated from mkmaze.c:58
export function iswall_or_stone(x, y, map) {
  if (!isok(x, y)) return 1;
  return (map.locations[x][y].typ === STONE || iswall(x, y));
}

// C ref: mkmaze.c is_solid
export function is_solid(map, x, y) {
    return !isok(x, y) || IS_WALL(at(map, x, y)?.typ);
}

// C ref: mkmaze.c set_levltyp
export function set_levltyp(map, x, y, typ) {
    const loc = at(map, x, y);
    if (!loc || !Number.isInteger(typ)) return false;
    loc.typ = typ;
    // C ref: mkmaze.c set_levltyp() — lava terrain is always lit.
    if (IS_LAVA(typ)) loc.lit = 1;
    return true;
}

// C ref: mkmaze.c set_levltyp_lit
export function set_levltyp_lit(map, x, y, typ, lit) {
    if (!set_levltyp(map, x, y, typ)) return false;
    const loc = at(map, x, y);
    loc.lit = lit ? 1 : 0;
    return true;
}

// C ref: mkmaze.c extend_spine
// Autotranslated from mkmaze.c:165
export function extend_spine(locale, wall_there, dx, dy) {
  let spine, nx, ny;
  nx = 1 + dx;
  ny = 1 + dy;
  if (wall_there) {
    if (dx) {
      if (locale[1][0] && locale[1][2]   && locale[nx][0] && locale[nx][2]) { spine = 0; }
      else { spine = 1; }
    }
    else {
      if (locale[0][1] && locale[2][1]   && locale[0][ny] && locale[2][ny]) { spine = 0; }
      else { spine = 1; }
    }
  }
  else { spine = 0; }
  return spine;
}

// C ref: mkmaze.c wall_cleanup
export function wall_cleanup(map, x1 = 1, y1 = 0, x2 = COLNO - 1, y2 = ROWNO - 1) {
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const loc = at(map, x, y);
            if (!loc || !IS_WALL(loc.typ)) continue;

            if (iswall_or_stone(map, x - 1, y)
                && iswall_or_stone(map, x + 1, y)
                && iswall_or_stone(map, x, y - 1)
                && iswall_or_stone(map, x, y + 1)) {
                loc.typ = STONE;
                loc.horizontal = false;
            }
        }
    }
}

// C ref: mkmaze.c okay
export function okay(x, y, dir, map = null) {
    if (!map || !map.at) return false;
    const [dx, dy] = dir === 0 ? [1, 0]
        : dir === 2 ? [0, 1]
        : dir === 4 ? [-1, 0]
        : [0, -1];
    const tx = x + 2 * dx;
    const ty = y + 2 * dy;
    const xMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : ((COLNO - 1) & ~1);
    const yMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : ((ROWNO - 1) & ~1);
    if (tx < 3 || ty < 3 || tx > xMax || ty > yMax) return false;
    if (!isok(tx, ty)) return false;
    // C ref: mkmaze.c okay() only checks the DESTINATION tile (2 steps away),
    // NOT the intermediate tile at distance 1. Non-corrmaze initializes
    // intermediate tiles (even coords) to HWALL, not STONE, so checking the
    // intermediate would incorrectly block all moves in the non-corrmaze case.
    return at(map, tx, ty)?.typ === STONE;
}

// C ref: mkmaze.c maze0xy
export function maze0xy(map) {
    return mazexy(map);
}

// LR_* region type constants imported from const.js

// C ref: mkmaze.c within_bounded_area()
function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// C ref: mkmaze.c is_exclusion_zone
export function is_exclusion_zone(map, type, x, y) {
    const zones = Array.isArray(map?.exclusionZones) ? map.exclusionZones : null;
    if (!zones || zones.length === 0) return false;

    const normalizeZoneType = (zoneType) => {
        if (typeof zoneType === 'string') {
            switch (zoneType) {
            case 'teleport':
                return LR_TELE;
            case 'teleport-down':
                return LR_DOWNTELE;
            case 'teleport-up':
                return LR_UPTELE;
            case 'monster-generation':
                return 7;
            default:
                return undefined;
            }
        }
        if (typeof zoneType === 'number') {
            if (zoneType === LR_TELE || zoneType === 4) return LR_TELE;
            if (zoneType === LR_UPTELE || zoneType === 5) return LR_UPTELE;
            if (zoneType === LR_DOWNTELE || zoneType === 6) return LR_DOWNTELE;
            if (zoneType === 7) return 7;
        }
        return undefined;
    };

    for (const zone of zones) {
        const zoneType = normalizeZoneType(zone?.type ?? zone?.zonetype);
        if (zoneType === undefined) continue;

        const typeMatches = (
            (type === LR_DOWNTELE && (zoneType === LR_DOWNTELE || zoneType === LR_TELE))
            || (type === LR_UPTELE && (zoneType === LR_UPTELE || zoneType === LR_TELE))
            || (type === zoneType)
        );
        if (!typeMatches) continue;

        if (within_bounded_area(x, y, zone.lx, zone.ly, zone.hx, zone.hy)) return true;
    }
    return false;
}

// C ref: mkmaze.c bad_location
export function bad_location(map, x, y, nlx, nly, nhx, nhy) {
    if (occupied(map, x, y)) return true;
    if (within_bounded_area(x, y, nlx, nly, nhx, nhy)) return true;

    const loc = at(map, x, y);
    if (!loc) return true;

    const typ = loc.typ;
    const isMaze = !!map.flags?.is_maze_lev;
    const isValid = (typ === CORR && isMaze) || typ === ROOM || typ === AIR;
    return !isValid;
}

// C ref: mkmaze.c makemaz
export async function makemaz(map, protofile, dnum, dlevel, depth) {
    // C ref: mkmaze.c:1127-1204
    // If protofile specified, load the matching special level.
    if (protofile && protofile !== "") {
        const specialMap = await load_special_by_protofile(protofile, dnum, dlevel, depth);
        if (specialMap) {
            Object.assign(map, specialMap);
            return;
        }
        console.warn(`makemaz: special level "${protofile}" not found, using procedural maze`);
    }

    // C ref: Invocation_lev(&u.uz) in mkmaze.c.
    // In current branch topology, Sanctum is Gehennom level 10, so invocation
    // level is the level above it (9). Allow explicit override via makelevel opts.
    const isInvocationLevel = !!(map.is_invocation_lev || map._isInvocationLevel);

    // C ref: mkmaze.c:1189-1191
    // Set maze flags
    map.flags = map.flags || {};
    map.flags.is_maze_lev = true;
    map.flags.corrmaze = !rn2(3); // 2/3 chance of corridor maze

    // C ref: mkmaze.c:1193-1197
    // Determine maze creation parameters
    // create_maze has different params based on Invocation level check
    const useInvocationParams = !isInvocationLevel && !!rn2(2);
    if (useInvocationParams) {
        // create_maze(-1, -1, !rn2(5))
        create_maze(map, -1, -1, !rn2(5));
    } else {
        // create_maze(1, 1, FALSE)
        create_maze(map, 1, 1, false);
    }

    // C ref: mkmaze.c:1199-1200
    // Wallification for non-corridor mazes
    if (!map.flags.corrmaze) {
        // C ref: mkmaze.c wallification(2, 2, gx.x_maze_max, gy.y_maze_max)
        const maxX = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : ((COLNO - 1) & ~1);
        const maxY = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : ((ROWNO - 1) & ~1);
        wallify_region(map, 2, 2, maxX, maxY);
    }

    // C ref: mkmaze.c:1202-1208
    // Place stairs
    const upstair = mazexy(map);
    mkstairs(map, upstair.x, upstair.y, true); // up stairs

    if (!isInvocationLevel) {
        const downstair = mazexy(map);
        mkstairs(map, downstair.x, downstair.y, false); // down stairs
    } else {
        const invPos = pick_vibrasquare_location(map);
        if (invPos) {
            maketrap(map, invPos.x, invPos.y, VIBRATING_SQUARE);
        }
    }

    // C ref: mkmaze.c:1211 — place_branch(Is_branchlev(&u.uz), 0, 0)
    // Only invoke placement when this exact level is a branch endpoint.
    // Use map._genDnum/_genDlevel as authoritative source when dnum/dlevel are undefined
    // (e.g., wizard teleport path passes only depth, not dnum/dlevel).
    // C always calls find_branch_room() to consume RNG even for BR_NO_END1 (no stair placed).
    // Use branchResult.found (not placement !== 'none') to match C's RNG consumption.
    const branchDnum = Number.isInteger(dnum) ? dnum : (Number.isInteger(map._genDnum) ? map._genDnum : 0 /* DUNGEONS_OF_DOOM */);
    const branchDlevel = Number.isInteger(dlevel) ? dlevel : (Number.isInteger(map._genDlevel) ? map._genDlevel : depth);
    const branchResult = resolveBranchPlacementForLevel(branchDnum, branchDlevel);
    if (branchResult.found) {
        place_lregion(map, 0, 0, 0, 0, 0, 0, 0, 0, LR_BRANCH, { branchPlacement: branchResult.placement });
    }

    // C ref: mkmaze.c:1213 — populate_maze()
    populate_maze(map, depth);
}

// C ref: mkmaze.c create_maze
export function create_maze(map, corrwid, wallthick, rmdeadends) {
    // C ref: decl.c — gx.x_maze_max initialized to (COLNO-1) & ~1 (largest even < COLNO).
    // This ensures maze cell indices are always even and within the COLNO/ROWNO bounds.
    const defaultMaxX = (COLNO - 1) & ~1;
    const defaultMaxY = (ROWNO - 1) & ~1;
    // C ref: save/restore gx.x_maze_max/gy.y_maze_max around temporary small-maze bounds.
    const savedMaxX = Number.isInteger(map?._mazeMaxX) ? map._mazeMaxX : defaultMaxX;
    const savedMaxY = Number.isInteger(map?._mazeMaxY) ? map._mazeMaxY : defaultMaxY;

    if (corrwid === -1) corrwid = rnd(4);
    if (wallthick === -1) wallthick = rnd(4) - corrwid;
    if (wallthick < 1) wallthick = 1;
    else if (wallthick > 5) wallthick = 5;
    if (corrwid < 1) corrwid = 1;
    else if (corrwid > 5) corrwid = 5;

    const scale = corrwid + wallthick;
    const rdx = Math.trunc(savedMaxX / scale);
    const rdy = Math.trunc(savedMaxY / scale);
    const smallMaxX = rdx * 2;
    const smallMaxY = rdy * 2;
    const carveType = map.flags?.corrmaze ? CORR : ROOM;
    map._mazeMaxX = smallMaxX;
    map._mazeMaxY = smallMaxY;

    if (map.flags?.corrmaze) {
        for (let x = 2; x < smallMaxX; x++) {
            for (let y = 2; y < smallMaxY; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = STONE;
            }
        }
    } else {
        for (let x = 2; x <= smallMaxX; x++) {
            for (let y = 2; y <= smallMaxY; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ((x % 2) && (y % 2)) ? STONE : HWALL;
            }
        }
    }

    const startRangeX = Math.max(1, Math.trunc((smallMaxX - 3) / 2) + 1);
    const startRangeY = Math.max(1, Math.trunc((smallMaxY - 3) / 2) + 1);
    const startX = 3 + 2 * rn2(startRangeX);
    const startY = 3 + 2 * rn2(startRangeY);
    walkfrom(
        map,
        Math.min(startX, smallMaxX - 1),
        Math.min(startY, smallMaxY - 1),
        carveType,
        STONE
    );

    if (rmdeadends) {
        maze_remove_deadends(map, carveType);
    }

    // C scales the reduced maze up when scale > 2.
    if (scale > 2) {
        // Copy only the C-backed source rectangle. Any source outside this
        // coverage must not influence writes during scaling.
        const tmp = Array.from({ length: COLNO }, () => Array(ROWNO));
        for (let x = 1; x < savedMaxX; x++) {
            for (let y = 1; y < savedMaxY; y++) {
                tmp[x][y] = map.at(x, y)?.typ ?? STONE;
            }
        }
        let rx = 2;
        let x = 2;
        while (rx < savedMaxX) {
            const mx = (x % 2) ? corrwid : (x === 2 || x === rdx * 2) ? 1 : wallthick;
            let ry = 2;
            let y = 2;
            while (ry < savedMaxY) {
                const my = (y % 2) ? corrwid : (y === 2 || y === rdy * 2) ? 1 : wallthick;
                for (let dx = 0; dx < mx; dx++) {
                    for (let dy = 0; dy < my; dy++) {
                        if (rx + dx >= savedMaxX || ry + dy >= savedMaxY) break;
                        if (!(x >= 1 && x < savedMaxX && y >= 1 && y < savedMaxY)) continue;
                        const srcTyp = tmp[x][y];
                        if (srcTyp === undefined) continue;
                        const loc = map.at(rx + dx, ry + dy);
                        if (loc) loc.typ = srcTyp;
                    }
                }
                ry += my;
                y++;
            }
            rx += mx;
            x++;
        }
    }

    // C restores gx/gy bounds after create_maze().
    map._mazeMaxX = savedMaxX;
    map._mazeMaxY = savedMaxY;
}

// C ref: mkmaze.c populate_maze
export function populate_maze(map, depth) {
    const placeObjAt = (obj, x, y) => {
        if (!obj) return;
        obj.ox = x;
        obj.oy = y;
        placeFloorObject(map, obj);
    };

    for (let i = rn1(8, 11); i > 0; i--) {
        const pos = mazexy(map);
        if (!pos) continue;
        const oclass = rn2(2) ? GEM_CLASS : RANDOM_CLASS;
        placeObjAt(mkobj(oclass, true), pos.x, pos.y);
    }
    for (let i = rn1(10, 2); i > 0; i--) {
        const pos = mazexy(map);
        if (!pos) continue;
        placeObjAt(mksobj(BOULDER, true, false), pos.x, pos.y);
    }
    for (let i = rn2(3); i > 0; i--) {
        const pos = mazexy(map);
        if (!pos) continue;
        makemon(PM_MINOTAUR, pos.x, pos.y, NO_MM_FLAGS, depth, map);
    }
    for (let i = rn1(5, 7); i > 0; i--) {
        const pos = mazexy(map);
        if (!pos) continue;
        makemon(null, pos.x, pos.y, NO_MM_FLAGS, depth, map);
    }
    for (let i = rn1(6, 7); i > 0; i--) {
        const pos = mazexy(map);
        if (!pos) continue;
        const mul = rnd(Math.max(Math.floor(30 / Math.max(12 - depth, 2)), 1));
        const amount = 1 + rnd(depth + 2) * mul;
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = amount;
            gold.owt = weight(gold);
        }
        placeObjAt(gold, pos.x, pos.y);
    }
    for (let i = rn1(6, 7); i > 0; i--) {
        mktrap(map, 0, MKTRAP_MAZEFLAG, null, null, depth);
    }
}

// C ref: mkmaze.c maze_remove_deadends
export function maze_remove_deadends(map, typ) {
    if (!map || !map.at) return false;
    const ftyp = Number.isInteger(typ) ? typ : (map.flags?.corrmaze ? CORR : ROOM);
    const xMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : ((COLNO - 1) & ~1);
    const yMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : ((ROWNO - 1) & ~1);
    const accessible = (x, y) => {
        const loc = map.at(x, y);
        return !!loc && loc.typ >= DOOR; // C ACCESSIBLE(typ)
    };
    const mzMove = (x, y, dir) => {
        switch (dir) {
        case 0: return { x, y: y - 1 };
        case 1: return { x: x + 1, y };
        case 2: return { x, y: y + 1 };
        case 3: return { x: x - 1, y };
        default: return { x, y };
        }
    };
    const mazeInbounds = (x, y) => (
        x >= 2 && y >= 2 && x < xMax && y < yMax && isok(x, y)
    );

    for (let x = 2; x < xMax; x++) {
        for (let y = 2; y < yMax; y++) {
            if (!(x % 2) || !(y % 2)) continue;
            if (!accessible(x, y)) continue;
            const dirok = [];
            let idx2 = 0;
            for (let dir = 0; dir < 4; dir++) {
                let p1 = mzMove(x, y, dir);
                if (!mazeInbounds(p1.x, p1.y)) {
                    idx2++;
                    continue;
                }
                let p2 = mzMove(x, y, dir);
                p2 = mzMove(p2.x, p2.y, dir);
                if (!mazeInbounds(p2.x, p2.y)) {
                    idx2++;
                    continue;
                }
                if (!accessible(p1.x, p1.y) && accessible(p2.x, p2.y)) {
                    dirok.push(dir);
                    idx2++;
                }
            }
            if (idx2 >= 3 && dirok.length > 0) {
                const dir = dirok[rn2(dirok.length)];
                const dest = mzMove(x, y, dir);
                const loc = map.at(dest.x, dest.y);
                if (loc) loc.typ = ftyp;
            }
        }
    }
    return true;
}

// C ref: mkmaze.c mazexy
export function mazexy(map) {
    // C ref: mkmaze.c:1317-1348 mazexy()
    // Find a random CORR/ROOM location in the maze
    const xMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : ((COLNO - 1) & ~1);
    const yMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : ((ROWNO - 1) & ~1);
    const allowedtyp = map.flags.corrmaze ? CORR : ROOM;
    let cpt = 0;

    do {
        // C ref: rnd(x_maze_max) is 1+rn2(x_maze_max), i.e., range [1..x_maze_max]
        const x = rnd(xMax);
        const y = rnd(yMax);
        const loc = map.at(x, y);
        if (loc && loc.typ === allowedtyp) {
            return { x, y };
        }
    } while (++cpt < 100);
    // C ref: 100 random attempts failed; systematically try every possibility
    for (let x = 1; x <= xMax; x++) {
        for (let y = 1; y <= yMax; y++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === allowedtyp) {
                return { x, y };
            }
        }
    }
    return null;
}

// C ref: mkmaze.c pick_vibrasquare_location
export function pick_vibrasquare_location(map) {
    const x_maze_min = 2;
    const y_maze_min = 2;
    const INVPOS_X_MARGIN = 4;
    const INVPOS_Y_MARGIN = 3;
    const INVPOS_DISTANCE = 11;

    const xMazeMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : (COLNO - 1);
    const yMazeMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : (ROWNO - 1);
    const xRange = xMazeMax - x_maze_min - 2 * INVPOS_X_MARGIN - 1;
    const yRange = yMazeMax - y_maze_min - 2 * INVPOS_Y_MARGIN - 1;
    if (xRange <= INVPOS_X_MARGIN || yRange <= INVPOS_Y_MARGIN
        || (xRange * yRange) <= (INVPOS_DISTANCE * INVPOS_DISTANCE)) {
        // C ref: mkmaze.c pick_vibrasquare_location() logs that maze is too small
        // and still continues attempting placement.
        console.warn(`svi.inv_pos: maze is too small! (${xMazeMax} x ${yMazeMax})`);
    }

    const up = map.upstair;
    const distmin = (x1, y1, x2, y2) => Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    const SPACE_POS = (typ) => typ > SDOOR;
    let x = 0, y = 0;
    let tryct = 0;
    do {
        x = rn1(xRange, x_maze_min + INVPOS_X_MARGIN + 1);
        y = rn1(yRange, y_maze_min + INVPOS_Y_MARGIN + 1);
        if (++tryct > 1000) break;
        const loc = map.at(x, y);
        if (!up) break;
        const tooNearUp = (x === up.x || y === up.y
            || Math.abs(x - up.x) === Math.abs(y - up.y)
            || distmin(x, y, up.x, up.y) <= INVPOS_DISTANCE);
        if (tooNearUp) continue;
        if (!loc || !SPACE_POS(loc.typ) || occupied(map, x, y)) continue;
        break;
    } while (true);

    const pos = { x, y };
    map.inv_pos = pos;
    map._invPos = pos; // IRON_PARITY_ALIAS_BRIDGE (retire by M6)
    return pos;
}

// C ref: mkmaze.c put_lregion_here()
export function put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, oneshot, opts = {}) {
    let invalid = bad_location(map, x, y, nlx, nly, nhx, nhy)
        || is_exclusion_zone(map, rtype, x, y);
    if (invalid) {
        if (!oneshot) return false;

        const trap = map.trapAt(x, y);
        const undestroyable = (trap?.ttyp === MAGIC_PORTAL || trap?.ttyp === VIBRATING_SQUARE);
        if (trap && !undestroyable) {
            const mon = map.monsterAt(x, y);
            if (mon && mon.mtrapped) mon.mtrapped = 0;
            deltrap(map, trap);
        }
        invalid = bad_location(map, x, y, nlx, nly, nhx, nhy)
            || is_exclusion_zone(map, rtype, x, y);
        if (invalid) return false;
    }

    const loc = at(map, x, y);
    if (!loc) return false;

    switch (rtype) {
    case LR_TELE:
    case LR_UPTELE:
    case LR_DOWNTELE: {
        const mon = map.monsterAt(x, y);
        if (mon) {
            if (!oneshot) return false;
            const pos = enexto(x, y, map);
            if (pos) {
                mon.mx = pos.x;
                mon.my = pos.y;
            } else {
                map.removeMonster(mon);
            }
        }
        break;
    }
    case LR_PORTAL:
        {
            const trap = maketrap(map, x, y, MAGIC_PORTAL);
            if (trap && opts?.portalDest) {
                trap.dst = {
                    dnum: opts.portalDest.dnum,
                    dlevel: opts.portalDest.dlevel
                };
            }
        }
        break;
    case LR_DOWNSTAIR:
        mkstairs(map, x, y, false);
        break;
    case LR_UPSTAIR:
        mkstairs(map, x, y, true);
        break;
    case LR_BRANCH:
        place_branch(map, x, y, opts.branchPlacement || 'none');
        break;
    default:
        break;
    }
    return true;
}

// C ref: mkmaze.c place_lregion()
export function place_lregion(map, lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, opts = {}) {
    if (!lx) {
        if (rtype === LR_BRANCH) {
            if (map.nroom) {
                const croom = generate_stairs_find_room(map);
                if (!croom) {
                    console.warn(`Couldn't place lregion type ${rtype}!`);
                    return;
                }

                let pos = somexyspace(map, croom);
                if (!pos) pos = { x: somex(croom), y: somey(croom) };
                if (!at(map, pos.x, pos.y)) {
                    console.warn(`Couldn't place lregion type ${rtype}!`);
                    return;
                }
                place_branch(map, pos.x, pos.y, opts.branchPlacement || 'none');
                return;
            }
        }
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, oneshot, opts)) return;
    }

    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (put_lregion_here(map, x, y, nlx, nly, nhx, nhy, rtype, true, opts)) return;
        }
    }
    console.warn(`Couldn't place lregion type ${rtype}!`);
}

export { fix_wall_spines };

// C ref: mkmaze.c baalz_fixup/fixup_special/check_ransacked/etc.
export function baalz_fixup(map, state = {}) {
    if (!map) return false;
    const relocate_or_remove = (mx, my) => {
        const m = map.monsterAt?.(mx, my);
        if (!m) return;
        const pos = enexto(mx, my, map);
        if (pos) {
            m.mx = pos.x;
            m.my = pos.y;
        } else if (map.removeMonster) {
            map.removeMonster(m);
        }
    };
    const midY = Math.trunc(ROWNO / 2);
    let lastX = 0;
    let inX1 = COLNO;
    for (let x = 0; x < COLNO; x++) {
        const loc = at(map, x, midY);
        if (loc && hasNondiggableWallFlag(loc)) {
            if (!lastX) inX1 = x + 1;
            lastX = x;
        }
    }
    const inX2 = ((lastX > inX1) ? lastX : COLNO) - 1;
    let lastY = 0;
    let inY1 = ROWNO;
    const probeX = Math.min(Math.max(inX1, 0), COLNO - 1);
    for (let y = 0; y < ROWNO; y++) {
        const loc = at(map, probeX, y);
        if (loc && hasNondiggableWallFlag(loc)) {
            if (!lastY) inY1 = y + 1;
            lastY = y;
        }
    }
    const inY2 = ((lastY > inY1) ? lastY : ROWNO) - 1;
    let delX1 = COLNO, delY1 = ROWNO, delX2 = 0, delY2 = 0;
    for (let x = inX1; x <= inX2; x++) {
        for (let y = inY1; y <= inY2; y++) {
            const loc = at(map, x, y);
            if (!loc) continue;
            if (loc.typ === POOL) {
                loc.typ = HWALL;
                if (delX1 === COLNO) {
                    delX1 = x;
                    delY1 = y;
                } else {
                    delX2 = x;
                    delY2 = y;
                }
            } else if (loc.typ === IRONBARS) {
                const left = at(map, x - 1, y);
                const right = at(map, x + 1, y);
                if (left && hasNondiggableWallFlag(left)) {
                    left.wall_info = Number(left.wall_info || 0) & ~W_NONDIGGABLE;
                    left.nondiggable = false; // compatibility mirror
                    const left2 = at(map, x - 2, y);
                    if (left2) {
                        left2.wall_info = Number(left2.wall_info || 0) & ~W_NONDIGGABLE;
                        left2.nondiggable = false; // compatibility mirror
                    }
                } else if (right && hasNondiggableWallFlag(right)) {
                    right.wall_info = Number(right.wall_info || 0) & ~W_NONDIGGABLE;
                    right.nondiggable = false; // compatibility mirror
                    const right2 = at(map, x + 2, y);
                    if (right2) {
                        right2.wall_info = Number(right2.wall_info || 0) & ~W_NONDIGGABLE;
                        right2.nondiggable = false; // compatibility mirror
                    }
                }
            }
        }
    }
    const wx1 = Math.max(inX1 - 2, 1);
    const wy1 = Math.max(inY1 - 2, 0);
    const wx2 = Math.min(inX2 + 2, COLNO - 1);
    const wy2 = Math.min(inY2 + 2, ROWNO - 1);
    map._wallifyProtectedArea = { x1: inX1, y1: inY1, x2: inX2, y2: inY2 };
    try {
        wallify_region(map, wx1, wy1, wx2, wy2);
    } finally {
        delete map._wallifyProtectedArea;
    }
    let x = delX1, y = delY1;
    if (x >= 0 && x < COLNO && y >= 0 && y < ROWNO) {
        const loc = at(map, x, y);
        const down = at(map, x, y + 1);
        if (loc && (loc.typ === TLWALL || loc.typ === TRWALL) && down && down.typ === TUWALL) {
            loc.typ = (loc.typ === TLWALL) ? BRCORNER : BLCORNER;
            down.typ = HWALL;
            relocate_or_remove(x, y);
        }
    }
    x = delX2;
    y = delY2;
    if (x >= 0 && x < COLNO && y >= 0 && y < ROWNO) {
        const loc = at(map, x, y);
        const up = at(map, x, y - 1);
        if (loc && (loc.typ === TLWALL || loc.typ === TRWALL) && up && up.typ === TDWALL) {
            loc.typ = (loc.typ === TLWALL) ? TRCORNER : TLCORNER;
            up.typ = HWALL;
            relocate_or_remove(x, y);
        }
    }
    map._specialFixups = map._specialFixups || {};
    map._specialFixups.baalz = { inX1, inX2, inY1, inY2, delX1, delY1, delX2, delY2, ...state };
    return true;
}
export async function fixup_special(map, opts = {}) {
    if (!map) return false;
    const specialName = String(opts.specialName || '').toLowerCase();
    const dnum = Number.isInteger(opts.dnum) ? opts.dnum : null;
    const roleIndex = Number.isInteger(opts.roleIndex) ? opts.roleIndex : getMakemonRoleIndex();
    if (specialName === 'water' || specialName === 'air') {
        await setup_waterlevel(map, { isWaterLevel: specialName === 'water' });
    }
    if (opts?.baalz || specialName === 'baalz') baalz_fixup(map, opts.baalz || {});
    if (opts?.portal && Number.isInteger(opts.portal.x) && Number.isInteger(opts.portal.y)) {
        set_wportal(map, opts.portal.x, opts.portal.y, opts.portal.dst || null);
    }
    if (opts.ransacked) {
        map._specialFixups = map._specialFixups || {};
        map._specialFixups.ransacked = true;
    }
    if (specialName.startsWith('medusa')) {
        map.flags = map.flags || {};
        map.flags.is_medusa_level = true;
        medusa_fixup(map, Number.isFinite(opts.depth) ? opts.depth : 1);
    } else if (roles[roleIndex]?.mnum === PM_CLERIC && dnum === QUEST) {
        map.flags = map.flags || {};
        map.flags.graveyard = true;
    } else if (specialName === 'castle') {
        map.flags = map.flags || {};
        map.flags.graveyard = true;
    } else if (dnum === GNOMISH_MINES && check_ransacked(map, specialName)) {
        stolen_booty(map, null, null, Number.isFinite(opts.depth) ? opts.depth : 1);
        map._specialFixups = map._specialFixups || {};
        map._specialFixups.ransacked = false;
    }

    // C ref: mkmaze.c fixup_special() room/branch flag side effects.
    if (specialName.startsWith('minetn')) {
        map.flags = map.flags || {};
        map.flags.has_town = true;
    }
    map._specialFixups = map._specialFixups || {};
    map._specialFixups.applied = true;
    return true;
}
export function check_ransacked(map, roomId = null) {
    if (!map) return false;
    if (typeof roomId === 'string') {
        const tag = roomId.trim().toLowerCase();
        if (tag === 'minetn-1') {
            map._specialFixups = map._specialFixups || {};
            map._specialFixups.ransacked = true;
            return true;
        }
    }
    const set = map?._specialFixups?.ransacked;
    const roomMarked = (id) => {
        if (!Number.isInteger(id)) return false;
        const room = map?.rooms?.[id];
        return !!room?.ransacked;
    };
    if (roomId === null || roomId === undefined) {
        if (set?.size) return true;
        if (Array.isArray(map?.rooms)) return map.rooms.some(r => !!r?.ransacked);
        return false;
    }
    if (typeof roomId === 'string') {
        const target = roomId.trim().toLowerCase();
        if (!target) return false;
        const roomByName = (map?.rooms || []).find((r) => {
            const nm = (typeof r?.name === 'string') ? r.name : (typeof r?.rname === 'string' ? r.rname : '');
            return nm.toLowerCase() === target;
        });
        if (!roomByName) return false;
        return !!roomByName.ransacked;
    }
    return !!set?.has(roomId) || roomMarked(roomId);
}
export function mark_ransacked(map, roomId) {
    if (!map) return false;
    map._specialFixups = map._specialFixups || {};
    if (!(map._specialFixups.ransacked instanceof Set)) {
        map._specialFixups.ransacked = new Set();
    }
    if (roomId !== null && roomId !== undefined) {
        map._specialFixups.ransacked.add(roomId);
        if (Number.isInteger(roomId) && map.rooms?.[roomId]) {
            map.rooms[roomId].ransacked = true;
        }
    }
    return true;
}

// C ref: mkmaze.c shiny_orc_stuff() — choose one loot item for a migrated orc.
export function shiny_orc_stuff(depth = 1) {
    const roll = rn2(10);
    if (roll < 5) return mkobj(GEM_CLASS, false);
    if (roll < 8) return mkobj(RANDOM_CLASS, false);
    const gold = mksobj(GOLD_PIECE, true, false);
    if (gold) {
        gold.quan = rn1(Math.max(10, Math.abs(depth) * 10), 5);
        gold.owt = weight(gold);
    }
    return gold;
}

// C ref: mkmaze.c migr_booty_item() — place generated loot near a migrated monster.
export function migr_booty_item(map, item, x = null, y = null) {
    if (!map || !item) return null;
    if (!Number.isInteger(x) || !Number.isInteger(y) || !isok(x, y)) {
        const pos = enexto(Math.trunc(COLNO / 2), Math.trunc(ROWNO / 2), map);
        if (!pos) return null;
        x = pos.x;
        y = pos.y;
    }
    item.ox = x;
    item.oy = y;
    placeFloorObject(map, item);
    return item;
}

// C ref: mkmaze.c stolen_booty() — generate a small pile of stolen loot.
export function stolen_booty(map, x = null, y = null, depth = 1) {
    const booty = [];
    const n = rn1(3, 1);
    for (let i = 0; i < n; i++) {
        const item = shiny_orc_stuff(depth);
        if (!item) continue;
        booty.push(migr_booty_item(map, item, x, y) || item);
    }
    return booty;
}

// C ref: mkmaze.c migrate_orc() — migrate an orc and optionally drop stolen loot.
export function migrate_orc(map, mon = null, depth = 1, x = null, y = null) {
    if (!map) return false;
    if (!mon && Number.isInteger(x) && Number.isInteger(y) && isok(x, y)) {
        mon = makemon(null, x, y, NO_MM_FLAGS, depth, map);
    }
    if (!mon) return false;
    if (!rn2(3)) {
        stolen_booty(map, mon.mx, mon.my, depth);
    }
    return true;
}

// C ref: mkmaze.c maze_inbounds
export function maze_inbounds(x, y) {
    return x >= 2 && x <= COLNO - 1 && y >= 1 && y <= ROWNO - 1;
}

// C ref: mkmaze.c mkportal
export function mkportal(map, x, y, _todnum, _todlevel) {
    if (!map || !map.at) return null;
    const trap = maketrap(map, x, y, MAGIC_PORTAL);
    if (!trap) return null;
    if (Number.isInteger(_todnum) || Number.isInteger(_todlevel)) {
        trap.dst = {
            dnum: Number.isInteger(_todnum) ? _todnum : 0,
            dlevel: Number.isInteger(_todlevel) ? _todlevel : 0,
        };
    }
    return trap;
}

export async function fumaroles(map, arg = null) {
    if (!map) return 0;

    // Backward-compatible deterministic list mode used by existing water-level tests.
    if (Array.isArray(arg)) {
        if (!arg.length) return 0;
        const valid = arg.filter((p) => isok(p?.x, p?.y) && map.at(p.x, p.y));
        if (!valid.length) return 0;
        map._water = map._water || { bubbles: [], active: true };
        map._water.fumaroles = valid.map((p) => ({ x: p.x, y: p.y }));
        return valid.length;
    }

    // C ref: mkmaze.c fumaroles() — spawn gas clouds from random lava squares.
    const opts = (arg && typeof arg === 'object') ? arg : {};
    const player = opts.player || null;
    const game = opts.game || null;
    const isFireLevel = (opts.isFireLevel !== undefined)
        ? !!opts.isFireLevel
        : !!map.flags?.is_firelevel;
    const temperature = Number(map.flags?.temperature || 0);

    let nmax = rn2(3);
    let sizemin = 5;
    if (isFireLevel) {
        nmax++;
        sizemin += 5;
    }
    if (temperature > 0) {
        nmax++;
        sizemin += 5;
    }

    let snd = false;
    let loud = false;
    let created = 0;
    for (let n = nmax; n > 0; n--) {
        const x = rn1(COLNO - 4, 3);
        const y = rn1(ROWNO - 4, 3);
        if (at(map, x, y)?.typ !== LAVAPOOL) continue;

        let region = null;
        try {
            region = await create_gas_cloud(x, y, rn1(10, sizemin), rn1(10, 5),
                map, player, game);
        } catch (err) {
            // Allow only known vision-lite generator contexts to proceed.
            const stack = String(err?.stack || '');
            const visionTypeError = err instanceof TypeError && stack.includes('vision.js');
            if (!visionTypeError) throw err;
            region = null;
        }
        if (!region) continue;
        clear_heros_fault(region);
        snd = true;
        created++;
        if (player && Number.isInteger(player.x) && Number.isInteger(player.y)
            && dist2(player.x, player.y, x, y) < 15) {
            loud = true;
        }
    }

    if (snd && !(player?.Deaf || player?.deaf)) {
        await Norep(`You hear a ${loud ? 'loud ' : ''}whoosh!`);
    }
    return created;
}

async function for_each_bubble_cell(map, bubble, fn) {
    if (!map || !bubble || typeof fn !== 'function') return;
    const bm = Array.isArray(bubble.bm) ? bubble.bm : null;
    if (!bm || bm.length < 3) return;
    const w = bm[0] | 0;
    const h = bm[1] | 0;
    for (let i = 0, x = bubble.x; i < w; i++, x++) {
        for (let j = 0, y = bubble.y; j < h; j++, y++) {
            if (!isok(x, y)) continue;
            if (bm[j + 2] & (1 << i)) await fn(x, y);
        }
    }
}

async function pickup_bubble_contents(map, bubble, heroPos = null, water = null) {
    if (!map || !bubble) return;
    bubble.cons = [];
    await for_each_bubble_cell(map, bubble, (x, y) => {
        const objs = map.objectsAt(x, y);
        if (objs.length) {
            for (const obj of objs) {
                map.removeObject(obj);
            }
            bubble.cons.push({ what: 'obj', x, y, list: objs });
        }
        const mon = map.monsterAt(x, y);
        if (mon) {
            map.removeMonster(mon);
            bubble.cons.push({ what: 'mon', x, y, list: mon });
        }
        if (heroPos && heroPos.x === x && heroPos.y === y) {
            if (water) water.heroBubble = bubble;
            bubble.cons.push({ what: 'hero', x, y, list: null });
        }
        const trap = map.trapAt(x, y);
        if (trap) {
            deltrap(map, trap);
            bubble.cons.push({ what: 'trap', x, y, list: trap });
        }
    });
    bubble_trace(`pickup bubble@(${bubble.x},${bubble.y}) count=${bubble.cons.length}`);
}

function replace_bubble_contents(map, bubble, dx, dy, water = null) {
    if (!map || !bubble || !Array.isArray(bubble.cons)) return;
    const heroPos = water?.heroPos;
    for (const cons of bubble.cons) {
        if (!cons) continue;
        const nx = (cons.x | 0) + (dx | 0);
        const ny = (cons.y | 0) + (dy | 0);
        if (!isok(nx, ny)) continue;
        switch (cons.what) {
        case 'obj':
            for (const obj of (Array.isArray(cons.list) ? cons.list : [])) {
                obj.ox = nx;
                obj.oy = ny;
                placeFloorObject(map, obj);
            }
            break;
        case 'mon': {
            const mon = cons.list;
            if (!mon) break;
            let tx = nx, ty = ny;
            if (map.monsterAt(tx, ty)) {
                const pos = enexto(tx, ty, map);
                if (pos) {
                    tx = pos.x;
                    ty = pos.y;
                }
            }
            mon.mx = tx;
            mon.my = ty;
            map.addMonster(mon);
            break;
        }
        case 'hero':
            if (heroPos && Number.isInteger(heroPos.x) && Number.isInteger(heroPos.y)) {
                const mtmp = map.monsterAt(nx, ny);
                if (mtmp) {
                    const pos = enexto(nx, ny, map);
                    if (pos) {
                        mtmp.mx = pos.x;
                        mtmp.my = pos.y;
                    }
                }
                heroPos.x = nx;
                heroPos.y = ny;
                if (typeof water?.onHeroMoved === 'function') {
                    water.onHeroMoved(nx, ny);
                }
            }
            break;
        case 'trap': {
            const trap = cons.list;
            if (!trap) break;
            trap.tx = nx;
            trap.ty = ny;
            map.traps.push(trap);
            if (trap.ttyp === MAGIC_PORTAL && water) {
                water.portal = { x: nx, y: ny, dst: trap.dst || null };
            }
            break;
        }
        default:
            break;
        }
    }
    bubble_trace(`replace bubble@(${bubble.x},${bubble.y}) shift=(${dx},${dy})`);
    bubble.cons = [];
}

export async function movebubbles(map, dx = 0, dy = 0) {
    const water = map?._water;
    if (!water?.active) return false;
    if (map.flags?.is_waterlevel && !water.portal) {
        set_wportal(map);
    }

    if (map.flags?.is_waterlevel) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = at(map, x, y);
                if (!loc) continue;
                loc.typ = WATER;
                loc.lit = 0;
                await vision_call(block_point, x, y);
            }
        }
    } else if (map.flags?.is_airlevel) {
        const xmin = Number.isInteger(water.xmin) ? water.xmin : 3;
        const ymin = Number.isInteger(water.ymin) ? water.ymin : 1;
        const xmax = Number.isInteger(water.xmax) ? water.xmax : (COLNO - 2);
        const ymax = Number.isInteger(water.ymax) ? water.ymax : (ROWNO - 1);
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = at(map, x, y);
                if (!loc) continue;
                loc.typ = AIR;
                loc.lit = 1;
                await vision_call(recalc_block_point, x, y);
                const xedge = (x < xmin || x > xmax);
                const yedge = (y < ymin || y > ymax);
                if (xedge || yedge) {
                    if (!rn2(xedge ? 3 : 5)) {
                        loc.typ = CLOUD;
                        await vision_call(block_point, x, y);
                    }
                }
            }
        }
    }

    const useRand = !Number.isInteger(dx) || !Number.isInteger(dy);
    const moveUp = !water._moveUp;
    water._moveUp = moveUp;
    const bubbles = Array.isArray(water.bubbles) ? water.bubbles : [];
    const ordered = moveUp ? bubbles : bubbles.slice().reverse();
    bubble_trace(`tick mode=${useRand ? 'random' : 'fixed'} bubbles=${ordered.length} up=${moveUp ? 1 : 0}`);
    water.heroBubble = null;
    if (map.flags?.is_waterlevel && ordered.length) {
        const heroPos = (water.heroPos && Number.isInteger(water.heroPos.x) && Number.isInteger(water.heroPos.y))
            ? water.heroPos
            : null;
        for (const b of ordered) {
            await pickup_bubble_contents(map, b, heroPos, water);
            await for_each_bubble_cell(map, b, async (x, y) => {
                const loc = at(map, x, y);
                if (!loc) return;
                loc.typ = WATER;
                loc.lit = 0;
                await vision_call(block_point, x, y);
            });
        }
    }
    if (ordered.length) {
        for (const b of ordered) {
            if (!b || !Number.isInteger(b.x) || !Number.isInteger(b.y)) continue;
            const ox = b.x;
            const oy = b.y;
            if (useRand) {
                const curDx = Number.isInteger(b.dx) ? b.dx : 0;
                const curDy = Number.isInteger(b.dy) ? b.dy : 0;
                const rx = rn2(3);
                const ry = rn2(3);
                const stepX = curDx + 1 - (!curDx ? rx : (rx ? 1 : 0));
                const stepY = curDy + 1 - (!curDy ? ry : (ry ? 1 : 0));
                await mv_bubble(map, b, stepX, stepY, false);
            } else {
                await mv_bubble(map, b, dx, dy, false);
            }
            if (map.flags?.is_waterlevel && Array.isArray(b.cons) && b.cons.length) {
                replace_bubble_contents(map, b, b.x - ox, b.y - oy, water);
            }
        }
    }

    if (Array.isArray(water.fumaroles) && water.fumaroles.length && !useRand) {
        water.fumaroles = water.fumaroles.map((f) => {
            if (!f || !Number.isInteger(f.x) || !Number.isInteger(f.y)) return f;
            const nx = Math.min(Math.max(water.xmin ?? 1, f.x + dx), water.xmax ?? (COLNO - 1));
            const ny = Math.min(Math.max(water.ymin ?? 0, f.y + dy), water.ymax ?? (ROWNO - 1));
            return { x: nx, y: ny };
        });
    }
    if (typeof water.onVisionRecalc === 'function') {
        water.onVisionRecalc();
    }
    return true;
}
export async function water_friction(map, player = null, display = null) {
    if (!map?._water?.active || !player) return 0;
    if (player.swimming && rn2(4)) return 0; // C ref: natural swimmers get advantage

    let eff = false;
    const ux = player.x;
    const uy = player.y;
    if (player.dx && !rn2(!player.dy ? 3 : 6)) {
        let dy = 0;
        let y = uy;
        do {
            dy = rn2(3) - 1;
            y = uy + dy;
        } while (dy && (!isok(ux, y) || !IS_POOL(map.at(ux, y)?.typ)));
        player.dx = 0;
        player.dy = dy;
        eff = true;
    } else if (player.dy && !rn2(!player.dx ? 3 : 5)) {
        let dx = 0;
        let x = ux;
        do {
            dx = rn2(3) - 1;
            x = ux + dx;
        } while (dx && (!isok(x, uy) || !IS_POOL(map.at(x, uy)?.typ)));
        player.dy = 0;
        player.dx = dx;
        eff = true;
    }
    if (eff && display?.putstr_message) {
        await display.putstr_message('Water turbulence affects your movements.');
    }
    return eff ? 1 : 0;
}
export function save_waterlevel(map) {
    if (!map) return null;
    const water = map._water || null;
    const packedWater = !water ? null : {
        ...water,
        bubbles: (Array.isArray(water.bubbles) ? water.bubbles : []).map((b) => ({
            x: b?.x, y: b?.y, dx: b?.dx, dy: b?.dy, n: b?.n,
            bm: Array.isArray(b?.bm) ? [...b.bm] : null
        })),
    };
    return {
        water: packedWater ? JSON.parse(JSON.stringify(packedWater)) : null,
        waterLevelSetup: map._waterLevelSetup ? JSON.parse(JSON.stringify(map._waterLevelSetup)) : null,
        hero_memory: map.flags?.hero_memory ?? null,
    };
}
export async function restore_waterlevel(map, saved = null) {
    if (!map || !saved || typeof saved !== 'object') return false;
    if (!('water' in saved)) return false;
    map._water = saved.water ? JSON.parse(JSON.stringify(saved.water)) : null;
    map._waterLevelSetup = saved.waterLevelSetup ? JSON.parse(JSON.stringify(saved.waterLevelSetup)) : null;
    if (map._water) {
        if (!Array.isArray(map._water.bubbles)) map._water.bubbles = [];
        if (!Array.isArray(map._water.fumaroles)) map._water.fumaroles = [];
        if (!('active' in map._water)) map._water.active = true;
        for (const bubble of map._water.bubbles) {
            if (!Array.isArray(bubble?.bm) || bubble.bm.length < 3) {
                const n = Number.isInteger(bubble?.n) ? bubble.n : 1;
                bubble.bm = [Math.max(1, n), Math.max(1, n), 0xff];
            }
            bubble.cons = [];
        }
        if (map._water.active) {
            for (const bubble of map._water.bubbles) {
                await mv_bubble(map, bubble, 0, 0, true);
            }
        }
    }
    if (saved.hero_memory !== null && saved.hero_memory !== undefined) {
        map.flags = map.flags || {};
        map.flags.hero_memory = !!saved.hero_memory;
    }
    return true;
}
export function set_wportal(map, x = null, y = null, dst = null) {
    if (!map) return false;
    map._water = map._water || { bubbles: [], active: true };
    if (!isok(x, y)) {
        const trap = (Array.isArray(map?.traps) ? map.traps : [])
            .find((t) => t?.ttyp === MAGIC_PORTAL && isok(t.tx, t.ty));
        if (!trap) return false;
        x = trap.tx;
        y = trap.ty;
        dst = dst || trap.dst || null;
    }
    if (!isok(x, y)) return false;
    map._water.portal = { x, y, dst: dst || null };
    return true;
}
export async function setup_waterlevel(map, args = {}) {
    if (!map) return false;
    const isWaterLevel = !!args.isWaterLevel;
    map.flags = map.flags || {};
    map.flags.hero_memory = false;
    map.flags.is_waterlevel = isWaterLevel;
    map.flags.is_airlevel = !isWaterLevel;
    const baseTyp = isWaterLevel ? WATER : AIR;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = at(map, x, y);
            if (loc && loc.typ === STONE) loc.typ = baseTyp;
        }
    }
    const xmin = 3;
    const ymin = 1;
    const xmax = Math.min(78, (COLNO - 1) - 1);
    const ymax = Math.min(20, (ROWNO - 1));
    const xskip = isWaterLevel ? (10 + rn2(10)) : (6 + rn2(4));
    const yskip = isWaterLevel ? (4 + rn2(4)) : (3 + rn2(3));
    const bubbles = [];
    map._water = {
        bubbles: [],
        active: true,
        heroBubble: null,
        portal: null,
        isWaterLevel,
        xmin,
        ymin,
        xmax,
        ymax,
        xskip,
        yskip,
        ...args,
    };
    for (let x = xmin; x <= xmax; x += xskip) {
        for (let y = ymin; y <= ymax; y += yskip) {
            if (x >= xmax || y >= ymax) continue;
            const n = rn2(7);
            const bubble = await mk_bubble(map, x, y, n);
            if (bubble) bubbles.push({ x: bubble.x, y: bubble.y, n: bubble.n });
        }
    }
    const runtimeWater = map._water || {};
    runtimeWater.bubbles = Array.isArray(runtimeWater.bubbles) ? runtimeWater.bubbles : [];
    runtimeWater.active = true;
    runtimeWater.heroBubble = null;
    runtimeWater.portal = null;
    runtimeWater.isWaterLevel = isWaterLevel;
    runtimeWater.xmin = xmin;
    runtimeWater.ymin = ymin;
    runtimeWater.xmax = xmax;
    runtimeWater.ymax = ymax;
    runtimeWater.xskip = xskip;
    runtimeWater.yskip = yskip;
    map._water = runtimeWater;
    map._waterLevelSetup = {
        xmin,
        ymin,
        xmax,
        ymax,
        xskip,
        yskip,
        bubbles,
        isWaterLevel,
    };
    return true;
}
export function unsetup_waterlevel(map) {
    if (map && map._water) {
        map._water.active = false;
        map._water.bubbles = [];
        map._water.heroBubble = null;
        map._water.heroPos = null;
        map._water.onHeroMoved = null;
        map._water.onVisionRecalc = null;
        map._water.fumaroles = [];
        map._water.portal = null;
    }
    return true;
}
export async function mk_bubble(map, x, y, n) {
    if (!map) return null;
    const masks = [
        [2, 1, 0x3],
        [3, 2, 0x7, 0x7],
        [4, 3, 0x6, 0xf, 0x6],
        [5, 3, 0xe, 0x1f, 0xe],
        [6, 4, 0x1e, 0x3f, 0x3f, 0x1e],
        [7, 4, 0x3e, 0x7f, 0x7f, 0x3e],
        [8, 4, 0x7e, 0xff, 0xff, 0x7e],
    ];
    const water = map._water || {};
    const minX = Number.isInteger(water.xmin) ? water.xmin : 3;
    const minY = Number.isInteger(water.ymin) ? water.ymin : 1;
    const maxX = Number.isInteger(water.xmax) ? water.xmax : (COLNO - 2);
    const maxY = Number.isInteger(water.ymax) ? water.ymax : (ROWNO - 1);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x >= maxX || y >= maxY) return null;
    const mi = Math.max(0, Math.min(masks.length - 1, Number.isInteger(n) ? n : 0));
    const bm = masks[mi];
    const w = bm[0];
    const h = bm[1];
    if (x + w - 1 > maxX) x = maxX - w + 1;
    if (y + h - 1 > maxY) y = maxY - h + 1;
    if (x < minX) x = minX;
    if (y < minY) y = minY;
    const bubble = {
        x,
        y,
        n: Number.isInteger(n) ? n : 1,
        bm,
        active: true,
        dx: 1 - rn2(3),
        dy: 1 - rn2(3)
    };
    map._water = map._water || { bubbles: [] };
    map._water.bubbles.push(bubble);
    if (map.flags?.is_waterlevel) {
        await mv_bubble(map, bubble, 0, 0, true);
    }
    return bubble;
}
// C ref: mkmaze.c maybe_adjust_hero_bubble
export function maybe_adjust_hero_bubble(map, heroPos = null) {
    if (!map?.flags?.is_waterlevel || !map?._water?.bubbles || !heroPos) return false;
    if (!heroPos.dx && !heroPos.dy) return false;
    const bubble = map._water.bubbles.find((b) => (
        Number.isInteger(b?.x) && Number.isInteger(b?.y)
        && Array.isArray(b?.bm) && b.bm.length >= 2
        && heroPos.x >= b.x && heroPos.x < (b.x + b.bm[0])
        && heroPos.y >= b.y && heroPos.y < (b.y + b.bm[1])
    ));
    if (!bubble) {
        map._water.heroBubble = null;
        return false;
    }
    map._water.heroBubble = bubble;
    if (!rn2(2)) {
        bubble.dx = heroPos.dx;
        bubble.dy = heroPos.dy;
        return true;
    }
    return false;
}
export async function mv_bubble(map, bubble, dx = 0, dy = 0, ini = false) {
    if (!map || !bubble || !Number.isInteger(dx) || !Number.isInteger(dy)) return false;
    if (!Number.isInteger(bubble.x) || !Number.isInteger(bubble.y)) return false;
    const water = map._water || {};
    const minX = Number.isInteger(water.xmin) ? water.xmin : 1;
    const minY = Number.isInteger(water.ymin) ? water.ymin : 0;
    const maxX = Number.isInteger(water.xmax) ? water.xmax : (COLNO - 1);
    const maxY = Number.isInteger(water.ymax) ? water.ymax : (ROWNO - 1);
    const bm = Array.isArray(bubble.bm) ? bubble.bm : [Math.max(1, bubble.n || 1), Math.max(1, bubble.n || 1), 0xff];
    const spanX = bm[0] - 1;
    const spanY = bm[1] - 1;
    let colli = 0;

    const isAir = !!map.flags?.is_airlevel;
    const canMove = !isAir || !rn2(6);
    if (canMove) {
        if (dx < -1 || dx > 1 || dy < -1 || dy > 1) {
            dx = Math.sign(dx);
            dy = Math.sign(dy);
        }
        if (bubble.x <= minX || bubble.x + spanX >= maxX) colli |= 2;
        if (bubble.y <= minY || bubble.y + spanY >= maxY) colli |= 1;
        if (bubble.x < minX) bubble.x = minX;
        if (bubble.y < minY) bubble.y = minY;
        if (bubble.x + spanX > maxX) bubble.x = maxX - spanX;
        if (bubble.y + spanY > maxY) bubble.y = maxY - spanY;

        if (bubble.x === minX && dx < 0) dx = -dx;
        if (bubble.x + spanX === maxX && dx > 0) dx = -dx;
        if (bubble.y === minY && dy < 0) dy = -dy;
        if (bubble.y + spanY === maxY && dy > 0) dy = -dy;

        const nx = bubble.x + dx;
        const ny = bubble.y + dy;
        bubble.dx = dx;
        bubble.dy = dy;
        bubble.x = Math.min(Math.max(minX, nx), maxX - spanX);
        bubble.y = Math.min(Math.max(minY, ny), maxY - spanY);
    }

    await for_each_bubble_cell(map, bubble, async (x, y) => {
        const loc = at(map, x, y);
        if (!loc) return;
        if (map.flags?.is_waterlevel) {
            loc.typ = AIR;
            loc.lit = 1;
            await vision_call(unblock_point, x, y);
        } else if (map.flags?.is_airlevel) {
            loc.typ = CLOUD;
            loc.lit = 1;
            await vision_call(block_point, x, y);
        }
    });

    if (colli === 1) {
        bubble.dy = -bubble.dy;
    } else if (colli === 2) {
        bubble.dx = -bubble.dx;
    } else if (colli === 3) {
        bubble.dy = -bubble.dy;
        bubble.dx = -bubble.dx;
    } else if (!ini && ((bubble.dx || bubble.dy) ? !rn2(20) : !rn2(5))) {
        bubble.dx = 1 - rn2(3);
        bubble.dy = 1 - rn2(3);
    }
    return true;
}

function medusa_fixup(map, depth = 1) {
    if (!map || !Array.isArray(map.rooms) || map.rooms.length === 0) return false;
    const croom = map.rooms[0];
    if (!croom) return false;
    if (!Number.isInteger(croom.lx) || !Number.isInteger(croom.hx)
        || !Number.isInteger(croom.ly) || !Number.isInteger(croom.hy)
        || croom.hx < croom.lx || croom.hy < croom.ly) {
        return false;
    }

    const randRoomPos = () => ({
        x: rn1(croom.hx - croom.lx + 1, croom.lx),
        y: rn1(croom.hy - croom.ly + 1, croom.ly),
    });
    const medusaGoodpos = (x, y) => {
        const loc = at(map, x, y);
        return !!loc && loc.typ > DOOR && !map.monsterAt(x, y);
    };
    const statueNeedsReroll = (obj) => {
        if (!obj || !Number.isInteger(obj.corpsenm)) return false;
        if (obj.corpsenm < 0 || obj.corpsenm >= mons.length) return false;
        const m = mons[obj.corpsenm];
        if (!m) return false;
        return !!(m.mresists & MR_STONE);
    };
    const placeObjectAt = (obj, x, y) => {
        if (!obj || !isok(x, y)) return null;
        obj.ox = x;
        obj.oy = y;
        placeFloorObject(map, obj);
        return obj;
    };
    const mk_tt_statue = (x, y) => {
        // C ref: mk_tt_object(STATUE) uses mksobj_at(..., init=FALSE).
        const otmp = mksobj(STATUE, false, false);
        if (!otmp) return null;
        placeObjectAt(otmp, x, y);
        // C ref: mk_tt_object() tt_oname path (scoreboard RNG) + fallback role.
        rnd(10);
        set_corpsenm(otmp, rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST));
        return otmp;
    };

    for (let tryct = rnd(4); tryct > 0; tryct--) {
        const { x, y } = randRoomPos();
        if (!medusaGoodpos(x, y)) continue;
        let tryct2 = 0;
        const otmp = mk_tt_statue(x, y);
        while (++tryct2 < 100 && otmp && statueNeedsReroll(otmp)) {
            set_corpsenm(otmp, rndmonnum(depth));
        }
    }

    let finalStatue = null;
    if (rn2(2)) {
        // C call uses mk_tt_object(..., somex(croom), somey(croom)).
        // Match observed harness order on this toolchain: somex then somey.
        const x = somex(croom);
        const y = somey(croom);
        finalStatue = mk_tt_statue(x, y);
    } else {
        // C call uses mkcorpstat(..., somex(croom), somey(croom), ...);
        // keep the same observed order: somex then somey.
        const x = somex(croom);
        const y = somey(croom);
        finalStatue = isok(x, y) ? mkcorpstat(STATUE, -1, false, x, y, map) : null;
    }
    if (finalStatue) {
        let i = 0;
        while (++i < 100 && statueNeedsReroll(finalStatue)) {
            set_corpsenm(finalStatue, rndmonnum(depth));
        }
    }
    return true;
}

// C ref: mkmaze.c walkfrom()
export function walkfrom(map, x, y, ftyp = CROSSWALL, btyp = STONE) {
    if (!map || !isok(x, y)) return;
    if (btyp !== STONE) {
        const loc = at(map, x, y);
        if (!loc || loc.typ !== btyp) return;
    }
    const dirs = [
        { dx: 0, dy: -1, dir: 6 }, // N
        { dx: 1, dy: 0, dir: 0 },  // E
        { dx: 0, dy: 1, dir: 2 },  // S
        { dx: -1, dy: 0, dir: 4 }, // W
    ];
    const carve = (tx, ty) => {
        const loc = at(map, tx, ty);
        if (loc) loc.typ = ftyp;
    };

    carve(x, y);
    while (true) {
        const avail = [];
        for (let i = 0; i < dirs.length; i++) {
            const d = dirs[i];
            if (!okay(x, y, d.dir, map)) continue;
            avail.push(i);
        }
        if (!avail.length) return;
        const dir = dirs[avail[rn2(avail.length)]];
        x += dir.dx;
        y += dir.dy;
        carve(x, y);
        x += dir.dx;
        y += dir.dy;
        walkfrom(map, x, y, ftyp, btyp);
    }
}

export { bound_digging, repair_irregular_room_boundaries };
