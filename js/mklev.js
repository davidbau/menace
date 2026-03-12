// mklev.c helper functions moved out of dungeon.js to mirror C file layout.

import {
    COLNO, ROWNO, MAXNROFROOMS,
    STONE, CORR, SCORR, ROOM, ICE, HWALL, VWALL, SDOOR, ROOMOFFSET,
    TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    STAIRS, FOUNTAIN, SINK, ALTAR, GRAVE, OROOM, THEMEROOM, SHOPBASE,
    Align2amask,
    DOOR, IRONBARS,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    TREE,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    xdir, ydir,
    IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_LAVA, IS_POOL, IS_WALL,
    NO_TRAP, ARROW_TRAP, DART_TRAP, ROCKTRAP, SLP_GAS_TRAP, BEAR_TRAP,
    LANDMINE, ROLLING_BOULDER_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB,
    STATUE_TRAP, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST, TRAPNUM,
    MKTRAP_NOFLAGS, MKTRAP_NOSPIDERONWEB, is_hole, isok,
    DOORINC, DUNGEONS_OF_DOOM, KNOX, GEHENNOM,
    SHARED,
} from './const.js';
import { rn1, rn2, rnd, getRngCallCount } from './rng.js';
import { makeRoom } from './mkroom.js';
import { mksobj, mkobj, mkcorpstat } from './mkobj.js';
import { placeFloorObject } from './invent.js';
import { GOLD_PIECE, BELL, CORPSE, SCR_TELEPORTATION } from './objects.js';
import { S_HUMAN, S_MIMIC } from './monsters.js';
import { mkclass, makemon } from './makemon.js';
import { make_engr_at, wipe_engr_at, make_grave } from './engrave.js';
import { litstate_rnd } from './mkmap.js';
import {
    maketrap,
    bound_digging,
    mineralize,
    set_wall_state,
    wallify_region,
    Is_waterlevel,
} from './dungeon.js';
import { mazexy } from './mkmaze.js';
import { somex, somey, somexy, somexyspace, inside_room } from './mkroom.js';
import { envFlag } from './runtime_env.js';

// DOORINC, DUNGEONS_OF_DOOM, KNOX, GEHENNOM imported from const.js

// C ref: mkobj.c mksobj_at() — create object and place it on map tile.
function mksobj_at(map, otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    if (otmp) {
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
    }
    return otmp;
}

// C ref: mkobj.c mkobj_at() — create random-class object and place it.
function mkobj_at(map, oclass, x, y, artif) {
    const otmp = mkobj(oclass, artif);
    if (otmp) {
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
    }
    return otmp;
}

// C ref: mklev.c gl.luathemes[] lifecycle globals are per-dungeon-branch.
const _luathemesLoadedByDnum = new Set();
let _specialThemesLoaded = false;

// C ref: mklev.c mkroom_cmp() — sort rooms by lx only
// Autotranslated from mklev.c:60
export function mkroom_cmp(vx, vy) {
  let x, y;
  x =  vx;
  y =  vy;
  if (x.lx < y.lx) return -1;
  return (x.lx > y.lx) ? 1 : 0;
}

// C ref: mklev.c sort_rooms()
export function sort_rooms(map) {
    const n = map.nroom;
    const mainRooms = map.rooms.slice(0, n);
    mainRooms.sort(mkroom_cmp);
    for (let i = 0; i < n; i++) map.rooms[i] = mainRooms[i];

    const ri = new Array(MAXNROFROOMS + 1).fill(0);
    for (let i = 0; i < n; i++) ri[map.rooms[i].roomnoidx] = i;

    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            const rno = loc.roomno;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = ri[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
    }
    for (let i = 0; i < n; i++) map.rooms[i].roomnoidx = i;
}

// C ref: mklev.c count_level_features()
export function count_level_features(map) {
    map.flags.nfountains = 0;
    map.flags.nsinks = 0;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const typ = map.at(x, y).typ;
            if (typ === FOUNTAIN) map.flags.nfountains++;
            else if (typ === SINK) map.flags.nsinks++;
        }
    }
}

// C ref: mklev.c clear_level_structures()
export function clear_level_structures(map) {
    map.clear();
    map.flags.hero_memory = true;
    map.flags.nomongen = false;
    map.flags.deathdrops = true;
}

// C ref: mklev.c do_room_or_subroom()
export function do_room_or_subroom(map, croom, lowx, lowy, hix, hiy, lit, rtype, special, is_room, roomIdx) {
    if (!lowx) lowx++;
    if (!lowy) lowy++;
    if (hix >= COLNO - 1) hix = COLNO - 2;
    if (hiy >= ROWNO - 1) hiy = ROWNO - 2;

    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++) {
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++) {
                const loc = map.at(x, y);
                if (loc) loc.lit = true;
            }
        }
        croom.rlit = true;
    } else {
        croom.rlit = false;
    }

    const roomno = (roomIdx !== undefined) ? roomIdx : map.rooms.indexOf(croom);
    croom.roomnoidx = roomno;
    croom.lx = lowx;
    croom.hx = hix;
    croom.ly = lowy;
    croom.hy = hiy;
    croom.rtype = rtype;
    croom.doorct = 0;
    croom.fdoor = map.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    croom.needjoining = !special;

    if (!special) {
        for (let x = lowx - 1; x <= hix + 1; x++) {
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) {
                    loc.typ = HWALL;
                    loc.horizontal = true;
                }
            }
        }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2)) {
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) {
                    loc.typ = VWALL;
                    loc.horizontal = false;
                }
            }
        }
        for (let x = lowx; x <= hix; x++) {
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) loc.typ = ROOM;
            }
        }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl) tl.typ = TLCORNER;
            if (tr) tr.typ = TRCORNER;
            if (bl) bl.typ = BLCORNER;
            if (br) br.typ = BRCORNER;
        } else {
            wallify_region(map, lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }

    const rno = roomno + ROOMOFFSET;
    for (let x = lowx; x <= hix; x++) {
        for (let y = lowy; y <= hiy; y++) {
            const loc = map.at(x, y);
            if (loc) loc.roomno = rno;
        }
    }
}

// C ref: mklev.c add_room()
export function add_room(map, lowx, lowy, hix, hiy, lit, rtype, special) {
    const croom = makeRoom();
    const roomIdx = map.nroom || 0;
    map.rooms[roomIdx] = croom;
    map.nroom = roomIdx + 1;
    do_room_or_subroom(map, croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
}

// C ref: mklev.c add_subroom()
export function add_subroom(map, proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    const croom = makeRoom();
    croom.needjoining = false;
    const nsubroom = map.nsubroom || 0;
    const roomStoreIdx = map.nroom + nsubroom;
    const roomnoIdx = MAXNROFROOMS + 1 + nsubroom;
    map.nsubroom = nsubroom + 1;
    map.rooms[roomStoreIdx] = croom;
    do_room_or_subroom(map, croom, lowx, lowy, hix, hiy, lit, rtype, special, false, roomnoIdx);
    if (!proom.sbrooms) proom.sbrooms = [];
    if (!Number.isInteger(proom.nsubrooms)) proom.nsubrooms = 0;
    proom.sbrooms[proom.nsubrooms] = croom;
    proom.nsubrooms++;
    return croom;
}

// C ref: sp_lev.c create_subroom()
export function create_subroom(map, proom, x, y, w, h, rtype, rlit, depth) {
    const width = proom.hx - proom.lx + 1;
    const height = proom.hy - proom.ly + 1;

    if (width < 4 || height < 4) return null;
    if (w === -1) w = rnd(width - 3);
    if (h === -1) h = rnd(height - 3);
    if (x === -1) x = rnd(width - w);
    if (y === -1) y = rnd(height - h);
    if (x === 1) x = 0;
    if (y === 1) y = 0;
    if ((x + w + 1) === width) x++;
    if ((y + h + 1) === height) y++;
    if (rtype === -1) rtype = OROOM;
    const lit = litstate_rnd(rlit, depth);

    return add_subroom(map, proom,
        proom.lx + x, proom.ly + y,
        proom.lx + x + w - 1, proom.ly + y + h - 1,
        lit, rtype, false);
}

// C ref: mklev.c bydoor()
export function bydoor(map, x, y) {
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
        if (isok(x + dx, y + dy)) {
            const typ = map.at(x + dx, y + dy).typ;
            if (IS_DOOR(typ) || typ === SDOOR) return true;
        }
    }
    return false;
}

// C ref: mklev.c okdoor()
export function okdoor(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return false;
    if (loc.typ !== HWALL && loc.typ !== VWALL) return false;
    if (bydoor(map, x, y)) return false;
    return ((isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ)));
}

// C ref: mklev.c good_rm_wall_doorpos()
export function good_rm_wall_doorpos(map, x, y, dir, room) {
    if (!isok(x, y) || !room.needjoining) return false;
    const loc = map.at(x, y);
    if (!(loc.typ === HWALL || loc.typ === VWALL
        || IS_DOOR(loc.typ) || loc.typ === SDOOR)) {
        return false;
    }
    if (bydoor(map, x, y)) return false;

    const tx = x + xdir[dir];
    const ty = y + ydir[dir];
    if (!isok(tx, ty) || IS_OBSTRUCTED(map.at(tx, ty).typ)) return false;

    const rmno = map.rooms.indexOf(room) + ROOMOFFSET;
    return rmno === map.at(tx, ty).roomno;
}

// C ref: mklev.c finddpos_shift()
export function finddpos_shift(map, x, y, dir, aroom) {
    dir = DIR_180(dir);
    const dx = xdir[dir];
    const dy = ydir[dir];

    if (good_rm_wall_doorpos(map, x, y, dir, aroom)) return { x, y };

    if (aroom.irregular) {
        let rx = x;
        let ry = y;
        let fail = false;
        while (!fail && isok(rx, ry)
            && (map.at(rx, ry).typ === STONE || map.at(rx, ry).typ === CORR)) {
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(map, rx, ry, dir, aroom)) return { x: rx, y: ry };
            if (!(map.at(rx, ry).typ === STONE || map.at(rx, ry).typ === CORR)) fail = true;
            if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy) fail = true;
        }
    }
    return null;
}

// C ref: mklev.c finddpos()
export function finddpos(map, dir, aroom) {
    let x1; let y1; let x2; let y2;

    switch (dir) {
    case DIR_N:
        x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.ly - 1;
        break;
    case DIR_S:
        x1 = aroom.lx; x2 = aroom.hx; y1 = y2 = aroom.hy + 1;
        break;
    case DIR_W:
        x1 = x2 = aroom.lx - 1; y1 = aroom.ly; y2 = aroom.hy;
        break;
    case DIR_E:
        x1 = x2 = aroom.hx + 1; y1 = aroom.ly; y2 = aroom.hy;
        break;
    default:
        return null;
    }

    if (envFlag('DEBUG_FINDDPOS')) {
        console.log(`[FDP] call=${getRngCallCount()} dir=${dir} room=(${aroom.lx},${aroom.ly})-(${aroom.hx},${aroom.hy}) rangeX=${x2 - x1 + 1} rangeY=${y2 - y1 + 1}`);
    }
    let tryct = 0;
    do {
        const x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        const y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const result = finddpos_shift(map, x, y, dir, aroom);
        if (result) return result;
    } while (++tryct < 20);

    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            const result = finddpos_shift(map, x, y, dir, aroom);
            if (result) return result;
        }
    }
    return null;
}

// C ref: mklev.c maybe_sdoor()
export function maybe_sdoor(depth, chance) {
    return (depth > 2) && !rn2(Math.max(2, chance));
}

// C ref: mkroom.c mkstairs()
export function mkstairs(map, x, y, isUp, isBranch = false) {
    const loc = map.at(x, y);
    if (!loc) return;

    loc.typ = STAIRS;
    loc.stairdir = isUp ? 1 : 0;
    loc.flags = isUp ? 1 : 0;
    loc.branchStair = !!isBranch;
    if (isUp) map.upstair = { x, y };
    else map.dnstair = { x, y };
}

// C ref: mklev.c generate_stairs_room_good()
export function generate_stairs_room_good(map, croom, phase) {
    const has_upstairs = Number.isInteger(map.upstair?.x)
        && Number.isInteger(map.upstair?.y)
        && inside_room(croom, map.upstair.x, map.upstair.y, map);
    const has_dnstairs = Number.isInteger(map.dnstair?.x)
        && Number.isInteger(map.dnstair?.y)
        && inside_room(croom, map.dnstair.x, map.dnstair.y, map);
    return (croom.needjoining || phase < 0)
        && ((!has_dnstairs && !has_upstairs) || phase < 1)
        && (croom.rtype === OROOM
            || (phase < 2 && croom.rtype === THEMEROOM));
}

// C ref: mklev.c generate_stairs_find_room()
export function generate_stairs_find_room(map) {
    if (!map.nroom) return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < map.nroom; i++) {
            if (generate_stairs_room_good(map, map.rooms[i], phase)) {
                candidates.push(i);
            }
        }
        if (candidates.length > 0) return map.rooms[candidates[rn2(candidates.length)]];
    }
    return map.rooms[rn2(map.nroom)];
}

// C ref: mklev.c find_branch_room()
export function find_branch_room(map) {
    if (!map.nroom) return { croom: null, pos: mazexy(map) };
    const croom = generate_stairs_find_room(map);
    if (!croom) return { croom: null, pos: null };
    return { croom, pos: somexyspace(map, croom) };
}

// C ref: mklev.c pos_to_room()
export function pos_to_room(map, x, y) {
    for (let i = 0; i < map.nroom; i++) {
        const curr = map.rooms[i];
        if (curr && inside_room(curr, x, y, map)) return curr;
    }
    return null;
}

// SHARED imported from const.js

// C ref: mklev.c topologize()
export function topologize(map, croom, do_ordinary = false) {
    if (!croom) return;
    const roomno = croom.roomnoidx + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    // C ref: topologize() skips irregular rooms and rooms already topologized.
    // The "already done" check in C tests if interior cell has roomno set;
    // in JS, do_room_or_subroom pre-sets interior roomno during creation, so
    // we can't use that test — instead only skip irregular rooms (which are
    // handled separately by sp_lev flood-fill).
    if (croom.irregular) return;
    // Guard against negative/invalid bounds (hx < 0 means uninitialized room).
    if (croom.hx < 0) return;

    // Non-SPECIALIZATION C build always applies this block.
    for (let x = lowx; x <= hix; x++) {
        for (let y = lowy; y <= hiy; y++) {
            const loc = map.at(x, y);
            if (loc) loc.roomno = roomno;
        }
    }
    for (let x = lowx - 1; x <= hix + 1; x++) {
        for (const y of [lowy - 1, hiy + 1]) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.edge = true;
            loc.roomno = loc.roomno ? SHARED : roomno;
        }
    }
    for (const x of [lowx - 1, hix + 1]) {
        for (let y = lowy; y <= hiy; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.edge = true;
            loc.roomno = loc.roomno ? SHARED : roomno;
        }
    }
    const nsubrooms = Number.isInteger(croom.nsubrooms) ? croom.nsubrooms : 0;
    for (let i = 0; i < nsubrooms; i++) {
        topologize(map, croom.sbrooms?.[i], croom.rtype !== OROOM);
    }
}

// C ref: mklev.c generate_stairs()
export function generate_stairs(map, depth) {
    let croom = generate_stairs_find_room(map);
    if (croom) {
        const pos = somexyspace(map, croom);
        let x; let y;
        if (pos) { x = pos.x; y = pos.y; } else { x = somex(croom); y = somey(croom); }
        const loc = map.at(x, y);
        if (loc) {
            loc.typ = STAIRS;
            loc.flags = 0;
            map.dnstair = { x, y };
        }
    }
    if (depth > 1) {
        croom = generate_stairs_find_room(map);
        if (croom) {
            const pos = somexyspace(map, croom);
            let x; let y;
            if (pos) { x = pos.x; y = pos.y; } else { x = somex(croom); y = somey(croom); }
            const loc = map.at(x, y);
            if (loc) {
                loc.typ = STAIRS;
                loc.flags = 1;
                map.upstair = { x, y };
            }
        }
    }
}

// C ref: mklev.c cardinal_nextto_room()
export function cardinal_nextto_room(map, aroom, x, y) {
    const rmno = map.rooms.indexOf(aroom) + ROOMOFFSET;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
        if (isok(x + dx, y + dy)) {
            const loc = map.at(x + dx, y + dy);
            if (!loc.edge && loc.roomno === rmno) return true;
        }
    }
    return false;
}

// C ref: mklev.c place_niche()
export function place_niche(map, aroom) {
    let dy;
    if (rn2(2)) {
        dy = 1;
        const dd = finddpos(map, DIR_S, aroom);
        if (!dd) return null;
        const xx = dd.x; const yy = dd.y;
        if (isok(xx, yy + dy) && map.at(xx, yy + dy).typ === STONE
            && isok(xx, yy - dy) && !IS_POOL(map.at(xx, yy - dy).typ)
            && !IS_FURNITURE(map.at(xx, yy - dy).typ)
            && cardinal_nextto_room(map, aroom, xx, yy)) {
            return { xx, yy, dy };
        }
    } else {
        dy = -1;
        const dd = finddpos(map, DIR_N, aroom);
        if (!dd) return null;
        const xx = dd.x; const yy = dd.y;
        if (isok(xx, yy + dy) && map.at(xx, yy + dy).typ === STONE
            && isok(xx, yy - dy) && !IS_POOL(map.at(xx, yy - dy).typ)
            && !IS_FURNITURE(map.at(xx, yy - dy).typ)
            && cardinal_nextto_room(map, aroom, xx, yy)) {
            return { xx, yy, dy };
        }
    }
    return null;
}

// C ref: mklev.c occupied()
export function occupied(map, x, y) {
    if (map.trapAt(x, y)) return true;
    const loc = map.at(x, y);
    if (!loc) return true;
    if (IS_FURNITURE(loc.typ)) return true;
    if (IS_LAVA(loc.typ) || IS_POOL(loc.typ)) return true;
    const inv_pos = map.inv_pos || map._invPos;
    const isInvocationLevel = !!(map.is_invocation_lev || map._isInvocationLevel);
    if (isInvocationLevel && inv_pos
        && x === inv_pos.x && y === inv_pos.y) {
        return true;
    }
    return false;
}

// C ref: mkroom.c find_okay_roompos()
export function find_okay_roompos(map, croom) {
    let tryct = 0;
    do {
        if (++tryct > 200) return null;
        const pos = somexyspace(map, croom);
        if (!pos) return null;
        if (!bydoor(map, pos.x, pos.y)) return pos;
    } while (true);
}

// C ref: mkroom.c mkfount()
export function mkfount(map, croom) {
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = FOUNTAIN;
    // C ref: mklev.c:2285-2286 — 1/7 fountains are blessed.
    // `blessedftn` aliases the same C union byte as `horizontal`.
    loc.blessedftn = 0;
    if (!rn2(7)) loc.blessedftn = 1;
    map.flags.nfountains++;
}

// C ref: mkroom.c mksink()
export function mksink(map, croom) {
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = SINK;
    map.flags.nsinks++;
}

// C ref: mkroom.c mkaltar()
export function mkaltar(map, croom) {
    if (croom.rtype !== OROOM) return;
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    loc.typ = ALTAR;
    loc.altarAlign = rn2(3) - 1;
    loc.flags = Align2amask(loc.altarAlign);
}

// C ref: mkroom.c mkgrave()
export function mkgrave(map, croom, depth) {
    if (croom.rtype !== OROOM) return;
    const dobell = !rn2(10);
    const pos = find_okay_roompos(map, croom);
    if (!pos) return;
    const loc = map.at(pos.x, pos.y);
    if (!loc) return;
    // C ref: mklev.c mkgrave() passes fixed text on dobell, else NULL
    // and make_grave() chooses a random epitaph.
    make_grave(map, pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        mksobj(GOLD_PIECE, true, false);
        rnd(20);
        rnd(5);
    }
    let tryct = rn2(5);
    while (tryct--) mkobj(0, true);
    if (dobell) mksobj_at(map, BELL, pos.x, pos.y, true, false);
}

// C ref: mklev.c trap_engravings[].
const TRAP_ENGRAVINGS = [];
TRAP_ENGRAVINGS[TRAPDOOR] = "Vlad was here";
TRAP_ENGRAVINGS[TELEP_TRAP] = "ad aerarium";
TRAP_ENGRAVINGS[LEVEL_TELEP] = "ad aerarium";

// C ref: mklev.c makeniche().
export async function makeniche(map, depth, trap_type) {
    let vct = 8;
    while (vct--) {
        const aroom = map.rooms[rn2(map.nroom)];
        if (aroom.rtype !== OROOM) continue;
        if (aroom.doorct === 1 && rn2(5)) continue;
        const niche = place_niche(map, aroom);
        if (!niche) continue;
        const { xx, yy, dy } = niche;
        const rm = map.at(xx, yy + dy);

        let secretNiche = false;
        if (trap_type) {
            secretNiche = true;
        } else {
            secretNiche = !rn2(4);
        }
        if (secretNiche) {
            rm.typ = SCORR;
            if (trap_type) {
                let actual_trap = trap_type;
                if (is_hole(actual_trap) && depth <= 1) actual_trap = ROCKTRAP;
                const ttmp = maketrap(map, xx, yy + dy, actual_trap, depth);
                if (ttmp && actual_trap !== ROCKTRAP) {
                    ttmp.once = 1;
                }
                // C ref: mklev.c uses trap_type (pre-adjustment), so level-1
                // TRAPDOOR niches still get the trap engraving even when the
                // actual trap becomes ROCKTRAP.
                const engrText = TRAP_ENGRAVINGS[trap_type];
                if (engrText) {
                    make_engr_at(map, xx, yy - dy, engrText, 'dust');
                    await wipe_engr_at(map, xx, yy - dy, 5, false);
                }
            }
            dosdoor(map, xx, yy, aroom, SDOOR, depth);
        } else {
            rm.typ = CORR;
            if (rn2(7)) {
                dosdoor(map, xx, yy, aroom, rn2(5) ? SDOOR : DOOR, depth);
            } else {
                if (!rn2(5) && IS_WALL(map.at(xx, yy).typ)) {
                    map.at(xx, yy).typ = IRONBARS;
                    if (rn2(3)) {
                        const mndx = mkclass(S_HUMAN, 0, depth);
                        mkcorpstat(CORPSE, mndx, true, xx, yy + dy, map);
                    }
                }
                if (!map.flags.noteleport) mksobj_at(map, SCR_TELEPORTATION, xx, yy + dy, true, false);
                if (!rn2(3)) mkobj_at(map, 0, xx, yy + dy, true);
            }
        }
        return;
    }
}

// C ref: mklev.c make_niches().
export async function make_niches(map, depth) {
    let ct = rnd(Math.floor(map.nroom / 2) + 1);
    let ltptr = (!map.flags.noteleport && depth > 15);
    let vamp = (depth > 5 && depth < 25);

    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(map, depth, LEVEL_TELEP);
        } else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(map, depth, TRAPDOOR);
        } else {
            await makeniche(map, depth, NO_TRAP);
        }
    }
}

// C ref: mklev.c makevtele().
export async function makevtele(map, depth) {
    await makeniche(map, depth, TELEP_TRAP);
}

// C ref: mklev.c alloc_doors()
export function alloc_doors(map) {
    if (!Array.isArray(map.doors)) map.doors = [];
    if (!Number.isInteger(map.doors_alloc)) map.doors_alloc = map.doors.length;
    if (map.doorindex >= map.doors_alloc) {
        map.doors_alloc += DOORINC;
    }
}

// C ref: mklev.c add_door()
export function add_door(map, x, y, aroom) {
    alloc_doors(map);

    for (let i = 0; i < aroom.doorct; i++) {
        const tmp = aroom.fdoor + i;
        if (map.doors[tmp] && map.doors[tmp].x === x && map.doors[tmp].y === y) return;
    }
    if (aroom.doorct === 0) aroom.fdoor = map.doorindex;
    aroom.doorct++;
    for (let tmp = map.doorindex; tmp > aroom.fdoor; tmp--) {
        map.doors[tmp] = map.doors[tmp - 1];
    }
    for (const broom of map.rooms) {
        if (broom && broom !== aroom && broom.doorct && broom.fdoor >= aroom.fdoor) broom.fdoor++;
    }
    map.doorindex++;
    map.doors[aroom.fdoor] = { x, y };
}

function is_shop_door(map, x, y) {
    const roomnos = new Set();
    const pushRoomno = (tx, ty) => {
        if (!isok(tx, ty)) return;
        const rn = map.at(tx, ty)?.roomno;
        if (Number.isInteger(rn) && rn >= ROOMOFFSET) roomnos.add(rn - ROOMOFFSET);
    };

    pushRoomno(x, y);
    pushRoomno(x - 1, y);
    pushRoomno(x + 1, y);
    pushRoomno(x, y - 1);
    pushRoomno(x, y + 1);
    for (const idx of roomnos) {
        if (idx >= 0 && idx < map.nroom) {
            const room = map.rooms[idx];
            if (room && room.rtype >= SHOPBASE) return true;
        }
    }
    return false;
}

// C ref: mklev.c dosdoor()
export function dosdoor(map, x, y, aroom, type, depth) {
    const loc = map.at(x, y);
    const shdoor = is_shop_door(map, x, y);

    if (!IS_WALL(loc.typ)) type = DOOR;

    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5)) loc.flags = D_ISOPEN;
            else if (!rn2(6)) loc.flags = D_LOCKED;
            else loc.flags = D_CLOSED;

            if (loc.flags !== D_ISOPEN && !shdoor && depth >= 5 && !rn2(25)) loc.flags |= D_TRAPPED;
        } else {
            loc.flags = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (loc.flags & D_TRAPPED) {
            if (depth >= 9 && !rn2(5)) {
                loc.flags = D_NODOOR;
                const mimicType = mkclass(S_MIMIC, 0, depth);
                if (mimicType) makemon(mimicType, x, y, 0, depth, map);
            }
        }
    } else {
        if (shdoor || !rn2(5)) loc.flags = D_LOCKED;
        else loc.flags = D_CLOSED;
        if (!shdoor && depth >= 4 && !rn2(20)) loc.flags |= D_TRAPPED;
    }
    add_door(map, x, y, aroom);
}

// C ref: mklev.c dodoor()
export function dodoor(map, x, y, aroom, depth) {
    dosdoor(map, x, y, aroom, maybe_sdoor(depth, 8) ? SDOOR : DOOR, depth);
}

// C ref: mklev.c chk_okdoor() — if x,y is door, does it open into solid terrain.
export function chk_okdoor(map, x, y) {
    const loc = map.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return true;
    if (loc.horizontal) {
        if (isok(x, y - 1) && isok(x, y + 1)) {
            const up = map.at(x, y - 1).typ;
            const dn = map.at(x, y + 1).typ;
            if ((up > TREE && dn <= TREE) || (up <= TREE && dn > TREE)) return false;
        }
    } else if (isok(x - 1, y) && isok(x + 1, y)) {
        const lf = map.at(x - 1, y).typ;
        const rt = map.at(x + 1, y).typ;
        if ((lf > TREE && rt <= TREE) || (lf <= TREE && rt > TREE)) return false;
    }
    return true;
}

// C ref: mklev.c mklev_sanity_check().
export function mklev_sanity_check(map) {
    for (let y = 0; y < map.locations[0].length; y++) {
        for (let x = 1; x < map.locations.length; x++) {
            if (!chk_okdoor(map, x, y)) return false;
        }
    }
    let rmno = -1;
    for (let i = 0; i < map.nroom; i++) {
        const room = map.rooms[i];
        if (!room?.needjoining) continue;
        if (rmno === -1) rmno = map.smeq[i];
        if (rmno !== -1 && map.smeq[i] !== rmno) return false;
    }
    return true;
}

// C ref: mklev.c level_finalize_topology()
export function level_finalize_topology(map, depth) {
    bound_digging(map);
    mineralize(map, depth);
    // C ref: mkmap.c:354-359 — lava remains lit even when surrounding
    // generation path is otherwise dark.
    for (let y = 0; y < map.locations[0].length; y++) {
        for (let x = 0; x < map.locations.length; x++) {
            const loc = map.locations[x]?.[y];
            if (loc && IS_LAVA(loc.typ)) loc.lit = true;
        }
    }
    // C ref: mklev.c:level_finalize_topology() calls topologize() for ALL rooms,
    // including rooms added via sp_lev scripts inside maze levels (e.g. Lua-scripted
    // rooms placed in procedural maze levels). The !is_maze_lev guard was incorrect:
    // maze levels can have sp_lev rooms (like the Lua-scripted room in level 21 past
    // Medusa) that need topologize() to assign roomno to their wall/edge cells.
    // Removing the guard is safe because pure maze levels have map.nroom=0, so the
    // loop body never executes for them.
    for (let i = 0; i < map.nroom; i++) topologize(map, map.rooms[i]);
    set_wall_state(map);
    for (let i = 0; i < map.rooms.length; i++) {
        map.rooms[i].orig_rtype = map.rooms[i].rtype;
    }
}

export function get_luathemes_loaded(dnum = null) {
    if (Number.isInteger(dnum)) {
        return _luathemesLoadedByDnum.has(dnum);
    }
    return _luathemesLoadedByDnum.size > 0;
}

export function set_luathemes_loaded(dnum, loaded = true) {
    if (!Number.isInteger(dnum)) return;
    if (loaded) _luathemesLoadedByDnum.add(dnum);
    else _luathemesLoadedByDnum.delete(dnum);
}

export function get_special_themes_loaded() {
    return _specialThemesLoaded;
}

export function set_special_themes_loaded(loaded) {
    _specialThemesLoaded = !!loaded;
}

// C ref: mklev.c free_luathemes()
export function free_luathemes() {
    _luathemesLoadedByDnum.clear();
    _specialThemesLoaded = false;
}

// C ref: mklev.c place_branch()
export function place_branch(map, x = 0, y = 0, placementHint = 'none') {
    if (!placementHint || placementHint === 'none') return false;
    if (!x) {
        const found = find_branch_room(map).pos;
        if (!found) return false;
        x = found.x;
        y = found.y;
    } else {
        pos_to_room(map, x, y);
    }

    if (placementHint === 'portal') {
        maketrap(map, x, y, MAGIC_PORTAL);
    } else if (placementHint === 'stair-up') {
        mkstairs(map, x, y, true, true);
    } else if (placementHint === 'stair-down') {
        mkstairs(map, x, y, false, true);
    } else {
        return false;
    }
    return true;
}

function is_rogue_level_for_traps(map) {
    // C: Is_rogue_level(&u.uz) is a topology/special-level property, not
    // a raw depth check.
    return !!(map?.flags?.is_rogue_lev || map?.flags?.roguelike || map?.flags?.is_rogue);
}

function is_in_hell_for_traps(map) {
    return map?._genDnum === GEHENNOM;
}

function is_single_level_branch_for_traps(map) {
    // C: single_level_branch(&u.uz) == Is_knox(&u.uz).
    return map?._genDnum === KNOX;
}

// C ref: mklev.c traptype_rnd()
export function traptype_rnd(map, depth, mktrapflags = MKTRAP_NOFLAGS) {
    const lvl = depth;
    let kind = rnd(TRAPNUM - 1);

    switch (kind) {
    case TRAPPED_DOOR:
    case TRAPPED_CHEST:
    case MAGIC_PORTAL:
    case VIBRATING_SQUARE:
        kind = NO_TRAP;
        break;
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
        if (lvl < 2) kind = NO_TRAP;
        break;
    case LEVEL_TELEP:
        if (lvl < 5 || map?.flags?.noteleport || is_single_level_branch_for_traps(map)) kind = NO_TRAP;
        break;
    case SPIKED_PIT:
        if (lvl < 5) kind = NO_TRAP;
        break;
    case LANDMINE:
        if (lvl < 6) kind = NO_TRAP;
        break;
    case WEB:
        if (lvl < 7 && !(mktrapflags & MKTRAP_NOSPIDERONWEB)) kind = NO_TRAP;
        break;
    case STATUE_TRAP:
    case POLY_TRAP:
        if (lvl < 8) kind = NO_TRAP;
        break;
    case FIRE_TRAP:
        if (!is_in_hell_for_traps(map)) kind = NO_TRAP;
        break;
    case TELEP_TRAP:
        if (map?.flags?.noteleport) kind = NO_TRAP;
        break;
    case HOLE:
        if (rn2(7)) kind = NO_TRAP;
        break;
    }
    return kind;
}

// C ref: mklev.c traptype_roguelvl()
export function traptype_roguelvl() {
    switch (rn2(7)) {
    default: return BEAR_TRAP;
    case 1: return ARROW_TRAP;
    case 2: return DART_TRAP;
    case 3: return TRAPDOOR;
    case 4: return PIT;
    case 5: return SLP_GAS_TRAP;
    case 6: return RUST_TRAP;
    }
}

// C ref: mklev.c mktrap() trap type select path.
export function mktrap_pick_kind(map, num, depth, mktrapflags = MKTRAP_NOFLAGS) {
    if (num > NO_TRAP && num < TRAPNUM) return num;
    if (is_rogue_level_for_traps(map)) return traptype_roguelvl();
    if (is_in_hell_for_traps(map) && !rn2(5)) return FIRE_TRAP;

    let kind;
    do {
        kind = traptype_rnd(map, depth, mktrapflags);
    } while (kind === NO_TRAP);
    return kind;
}

// Autotranslated from mklev.c:1427
export function water_has_kelp(x, y, kelp_pool, kelp_moat, map) {
  if ((kelp_pool && (map.locations[x][y].typ === POOL || (map.locations[x][y].typ === WATER && !Is_waterlevel(map.uz))) && !rn2(kelp_pool)) || (kelp_moat && map.locations[x][y].typ === MOAT && !rn2(kelp_moat))) return true;
  return false;
}

// Autotranslated from mklev.c:2598
export function mkinvk_check_wall(x, y, map) {
  let ltyp;
  if (!isok(x, y)) return 0;
  ltyp = map.locations[x][y].typ;
  return (IS_STWALL(ltyp) || ltyp === IRONBARS) ? 1 : 0;
}
