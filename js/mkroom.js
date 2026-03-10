// mkroom.c helper functions moved out of dungeon.js to mirror C file layout.

import {
    SDOOR, IS_DOOR, ROOMOFFSET, ROOM, CORR, ICE,
    IS_WALL, IS_FURNITURE, IS_LAVA, IS_POOL, IS_ROOM,
    OROOM, SWAMP, POOL, SHOPBASE,
    COURT, ZOO, BEEHIVE, MORGUE, BARRACKS, LEPREHALL, COCKNEST, ANTHOLE, TEMPLE,
    A_NONE, ALTAR, AM_MASK, AM_SHRINE, Align2amask, Amask2align, xdir, ydir, N_DIRS,
    isok, FILL_NONE, FILL_NORMAL,
} from './const.js';
import { rn1, rn2, rnd } from './rng.js';
import { mkclass, makemon } from './makemon.js';
import { NO_MM_FLAGS } from './const.js';
import { ndemon } from './minion.js';
import { mkobj, mksobj } from './mkobj.js';
import { mpickobj } from './steal.js';
import {
    mons, S_FUNGUS, S_DRAGON, S_GIANT, S_TROLL, S_CENTAUR, S_ORC, S_GNOME, S_KOBOLD, S_VAMPIRE, S_ZOMBIE,
    PM_GIANT_EEL, PM_PIRANHA, PM_ELECTRIC_EEL,
    PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN,
    PM_BUGBEAR, PM_HOBGOBLIN, PM_GHOST, PM_WRAITH,
    PM_SOLDIER_ANT, PM_FIRE_ANT, PM_GIANT_ANT,
    PM_OGRE_TYRANT, PM_ELVEN_MONARCH, PM_DWARF_RULER, PM_GNOME_RULER,
    PM_ALIGNED_CLERIC, PM_HIGH_CLERIC,
    M2_PEACEFUL, M2_HOSTILE, MS_LEADER,
} from './monsters.js';
import { WAND_CLASS, SPBOOK_CLASS, SPBOOK_no_NOVEL, MACE } from './objects.js';
import { shtypes } from './shknam.js';

export function makeRoom() {
    return {
        lx: 0, ly: 0,
        hx: 0, hy: 0,
        rtype: 0,
        orig_rtype: 0,
        rlit: false,
        needjoining: true,
        needfill: FILL_NONE,
        doorct: 0,
        fdoor: 0,
        irregular: false,
        nsubrooms: 0,
        sbrooms: [],
        roomnoidx: 0,
    };
}

// C ref: mkroom.c:41-48
export function isbig(sroom) {
    return (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1) > 20;
}

// C ref: mkroom.c:640-663
export function has_dnstairs(croom, map) {
    if (!Number.isInteger(map?.dnstair?.x) || !Number.isInteger(map?.dnstair?.y)) {
        return false;
    }
    return map.dnstair.x >= croom.lx && map.dnstair.x <= croom.hx
        && map.dnstair.y >= croom.ly && map.dnstair.y <= croom.hy;
}

// C ref: mkroom.c:653-663
export function has_upstairs(croom, map) {
    if (!Number.isInteger(map?.upstair?.x) || !Number.isInteger(map?.upstair?.y)) {
        return false;
    }
    return map.upstair.x >= croom.lx && map.upstair.x <= croom.hx
        && map.upstair.y >= croom.ly && map.upstair.y <= croom.hy;
}

// C ref: mkroom.c:623-638 nexttodoor()
// Autotranslated from mkroom.c:623
export function nexttodoor(sx, sy, map) {
  let dx, dy, lev;
  for (dx = -1; dx <= 1; dx++) {
    for (dy = -1; dy <= 1; dy++) {
      if (!isok(sx + dx, sy + dy)) {
        continue;
      }
      lev = map.locations[sx + dx][sy + dy];
      if (IS_DOOR(lev.typ) || lev.typ === SDOOR) return true;
    }
  }
  return false;
}

// C ref: mkroom.c:577-596 shrine_pos()
export function shrine_pos(roomno, map) {
    const troom = map.rooms[roomno - ROOMOFFSET];
    let delta = troom.hx - troom.lx;
    let x = troom.lx + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) x++;
    delta = troom.hy - troom.ly;
    let y = troom.ly + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2)) y++;
    return { x, y };
}

// C ref: mkroom.c somex()/somey()
// Autotranslated from mkroom.c:666
export function somex(croom) {
  return rn1(croom.hx - croom.lx + 1, croom.lx);
}
// Autotranslated from mkroom.c:672
export function somey(croom) {
  return rn1(croom.hy - croom.ly + 1, croom.ly);
}

// C ref: mkroom.c inside_room() -- check if (x,y) is inside room bounds (including walls)
export function inside_room(croom, x, y, map) {
    if (croom.irregular) {
        const loc = map?.at?.(x, y);
        const i = croom.roomnoidx + ROOMOFFSET;
        return !!loc && !loc.edge && loc.roomno === i;
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}

// C ref: mkroom.c somexy() -- pick random position in room, avoiding subrooms
export function somexy(croom, map) {
    let try_cnt = 0;

    // C ref: mkroom.c somexy() irregular path — !edge && roomno == i
    if (croom.irregular) {
        const i = croom.roomnoidx + ROOMOFFSET;
        while (try_cnt++ < 100) {
            const x = somex(croom);
            const y = somey(croom);
            const loc = map.at(x, y);
            if (loc && !loc.edge && loc.roomno === i)
                return { x, y };
        }
        // Exhaustive search fallback
        for (let x = croom.lx; x <= croom.hx; x++) {
            for (let y = croom.ly; y <= croom.hy; y++) {
                const loc = map.at(x, y);
                if (loc && !loc.edge && loc.roomno === i)
                    return { x, y };
            }
        }
        return null;
    }

    if (!croom.nsubrooms) {
        return { x: somex(croom), y: somey(croom) };
    }

    // Check that coords don't fall into a subroom or into a wall
    while (try_cnt++ < 100) {
        const x = somex(croom);
        const y = somey(croom);
        const loc = map.at(x, y);
        if (loc && IS_WALL(loc.typ))
            continue;
        let inSubroom = false;
        for (let i = 0; i < croom.nsubrooms; i++) {
            if (inside_room(croom.sbrooms[i], x, y, map)) {
                inSubroom = true;
                break;
            }
        }
        if (!inSubroom)
            return { x, y };
    }
    return null;
}

// C ref: mklev.c occupied() subset used by mkroom.c somexyspace()
function occupied_for_roompos(map, x, y) {
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

// C ref: mkroom.c somexyspace() -- find accessible space in room
export function somexyspace(map, croom) {
    let trycnt = 0;
    let okay;
    do {
        const pos = somexy(croom, map);
        okay = pos && isok(pos.x, pos.y) && !occupied_for_roompos(map, pos.x, pos.y);
        if (okay) {
            const loc = map.at(pos.x, pos.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
        if (okay) return pos;
    } while (trycnt++ < 100);
    return null;
}

let _mkroomWizardMode = true;
let _mkroomUbirthday = 0;
export function set_mkroom_wizard_mode(enabled) {
    _mkroomWizardMode = !!enabled;
}
export function set_mkroom_ubirthday(ubirthday) {
    _mkroomUbirthday = Number.isInteger(ubirthday) ? ubirthday : 0;
}

// C ref: mkroom.c:219-241 pick_room()
export function pick_room(map, strict) {
    if (!map.nroom) return null;
    let idx = rn2(map.nroom);
    for (let i = map.nroom; i > 0; i--, idx++) {
        if (idx >= map.nroom) idx = 0;
        const sroom = map.rooms[idx];
        if (!sroom || sroom.hx < 0) return null;
        if (sroom.rtype !== OROOM) continue;
        if (!strict) {
            if (has_upstairs(sroom, map)
                || (has_dnstairs(sroom, map) && rn2(3))) {
                continue;
            }
        } else if (has_upstairs(sroom, map) || has_dnstairs(sroom, map)) {
            continue;
        }
        if (sroom.doorct === 1 || !rn2(5) || _mkroomWizardMode) return sroom;
    }
    return null;
}

// C ref: mkroom.c:244-253 mkzoo()
export function mkzoo(map, type) {
    const sroom = pick_room(map, false);
    if (!sroom) return;
    sroom.rtype = type;
    sroom.needfill = FILL_NORMAL;
}

// C ref: mkroom.c:530-575 mkswamp() — turn up to 5 rooms into swamps.
export function mkswamp(map, depth) {
    let eelct = 0;
    for (let i = 0; i < 5; i++) {
        const sroom = map.rooms[rn2(map.nroom)];
        if (!sroom || sroom.hx < 0 || sroom.rtype !== OROOM
            || has_upstairs(sroom, map) || has_dnstairs(sroom, map))
            continue;

        const rmno = (map.rooms.indexOf(sroom)) + ROOMOFFSET;

        sroom.rtype = SWAMP;
        for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
            for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
                const loc = map.at(sx, sy);
                if (!loc || !IS_ROOM(loc.typ)) continue;
                if (loc.roomno !== rmno) continue;
                if (map.objectsAt(sx, sy).length > 0) continue;
                if (map.monsterAt(sx, sy)) continue;
                if (map.trapAt(sx, sy)) continue;
                if (nexttodoor(sx, sy, map)) continue;

                if ((sx + sy) % 2) {
                    loc.typ = POOL;
                    if (!eelct || !rn2(4)) {
                        const eelmon = rn2(5)
                            ? mons[PM_GIANT_EEL]
                            : rn2(2)
                                ? mons[PM_PIRANHA]
                                : mons[PM_ELECTRIC_EEL];
                        makemon(eelmon, sx, sy, NO_MM_FLAGS, depth, map);
                        eelct++;
                    }
                } else if (!rn2(4)) {
                    const fungusMndx = mkclass(S_FUNGUS, 0, depth);
                    makemon(fungusMndx >= 0 ? mons[fungusMndx] : null, sx, sy, NO_MM_FLAGS, depth, map);
                }
            }
        }
        map.flags.has_swamp = true;
    }
}

// C ref: mkroom.c:1049-1096 — check if room shape traps shopkeeper
export function invalid_shop_shape(sroom, map) {
    const doorx = map.doors[sroom.fdoor].x;
    const doory = map.doors[sroom.fdoor].y;
    let insidex = 0, insidey = 0, insidect = 0;

    for (let x = Math.max(doorx - 1, sroom.lx); x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly); y <= Math.min(doory + 1, sroom.hy); y++) {
            const loc = map.at(x, y);
            if (loc && loc.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1) return true;
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx); x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly); y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey) continue;
                const loc = map.at(x, y);
                if (loc && loc.typ === ROOM) insidect++;
            }
        }
        if (insidect === 1) return true;
    }
    return false;
}

export function mkshop(map) {
    for (const sroom of map.rooms) {
        if (sroom.hx < 0) return;
        if (sroom.rtype !== OROOM) continue;
        if (has_dnstairs(sroom, map) || has_upstairs(sroom, map)) continue;
        if (sroom.doorct !== 1) continue;
        if (invalid_shop_shape(sroom, map)) continue;

        if (!sroom.rlit) {
            for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++) {
                for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                    const loc = map.at(x, y);
                    if (loc) loc.lit = true;
                }
            }
            sroom.rlit = true;
        }

        let j = rnd(100);
        let i = 0;
        while ((j -= shtypes[i].prob) > 0) i++;

        if (isbig(sroom) && (shtypes[i].symb === WAND_CLASS || shtypes[i].symb === SPBOOK_CLASS))
            i = 0;

        sroom.rtype = SHOPBASE + i;
        sroom.needfill = FILL_NORMAL;
        return;
    }
}

// C ref: mkroom.c:52-92 do_mkroom()
export function do_mkroom(map, roomtype, depth, mktemple_opts = null) {
    if (roomtype >= SHOPBASE) {
        mkshop(map);
        return;
    }
    switch (roomtype) {
    case COURT:
    case ZOO:
    case BEEHIVE:
    case MORGUE:
    case BARRACKS:
    case LEPREHALL:
    case COCKNEST:
    case ANTHOLE:
        mkzoo(map, roomtype);
        return;
    case TEMPLE:
        mktemple(map, depth, mktemple_opts || {});
        return;
    case SWAMP:
        mkswamp(map, depth);
        return;
    default:
        return;
    }
}

export function priestini(sroom, sx, sy, sanctum, depth, map) {
    const si = rn2(N_DIRS);
    const prim = sanctum ? mons[PM_HIGH_CLERIC] : mons[PM_ALIGNED_CLERIC];

    let px = 0;
    let py = 0;
    let i;
    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[(i + si) % N_DIRS];
        py = sy + ydir[(i + si) % N_DIRS];
        const loc = map.at(px, py);
        if (loc && IS_ROOM(loc.typ) && !map.monsterAt(px, py)) break;
    }
    if (i === N_DIRS) {
        px = sx;
        py = sy;
    }

    const priest = makemon(prim, px, py, NO_MM_FLAGS, depth, map);
    if (!priest) return;
    priest.ispriest = true;
    priest.isminion = false;
    priest.mpeaceful = true;
    priest.msleeping = false;
    priest.epri = {
        shroom: (map.rooms.indexOf(sroom)) + ROOMOFFSET,
        shralign: Amask2align(map.at(sx, sy).flags & AM_MASK),
        shrpos: { x: sx, y: sy },
        shrlevel: depth || 0,
        intone_time: 0,
        enter_time: 0,
        peaceful_time: 0,
        hostile_time: 0,
    };
    set_malign(priest);

    const cnt = rn1(3, 2);
    for (let s = 0; s < cnt; s++) {
        // C ref: priest.c priestini() uses mkobj(SPBOOK_no_NOVEL, FALSE).
        const book = mkobj(SPBOOK_no_NOVEL, false);
        if (book) mpickobj(priest, book);
    }
    rn2(2);
}

// C ref: mkroom.c mktemple()
export function mktemple(map, depth, opts = {}) {
    const sroom = pick_room(map, true);
    if (!sroom) return;

    sroom.rtype = TEMPLE;
    const roomno = (map.rooms.indexOf(sroom)) + ROOMOFFSET;
    const shrine = shrine_pos(roomno, map);
    const loc = map.at(shrine.x, shrine.y);
    if (!loc) return;

    loc.typ = ALTAR;
    const induced_align_fn = (typeof opts.induced_align_fn === 'function')
        ? opts.induced_align_fn : ((pct, specialAlign, dungeonAlign) => {
            if (!rn2(100) || specialAlign === A_NONE) return dungeonAlign;
            return specialAlign;
        });
    const alignByDnum = opts.dungeon_align_by_dnum || null;
    const defaultDnum = Number.isInteger(opts.default_dnum) ? opts.default_dnum : 0;
    const dnum = Number.isInteger(map?._genDnum) ? map._genDnum : defaultDnum;
    const dungeonAlign = alignByDnum ? (alignByDnum[dnum] ?? A_NONE) : A_NONE;
    const altarAlignTyp = induced_align_fn(80, A_NONE, dungeonAlign);
    loc.flags = Align2amask(altarAlignTyp);
    loc.altarAlign = altarAlignTyp;

    priestini(sroom, shrine.x, shrine.y, false, depth, map);
    loc.flags |= AM_SHRINE;
    map.flags.has_temple = true;
}

// C ref: mkroom.c search_special()
export function search_special(map, roomtype) {
    if (!map || !Array.isArray(map.rooms)) return null;
    for (const room of map.rooms) {
        if (!room || room.hx < 0) continue;
        if (roomtype >= SHOPBASE) {
            if (room.rtype >= SHOPBASE) return room;
        } else if (room.rtype === roomtype) {
            return room;
        }
    }
    return null;
}

// C ref: mkroom.c cmap_to_type()
export function cmap_to_type(cmap) {
    if (typeof cmap !== 'string' || cmap.length === 0) return OROOM;
    const c = cmap[0];
    if (c === 'z') return ZOO;
    if (c === 'm') return MORGUE;
    if (c === 'b') return BEEHIVE;
    if (c === 'c') return COURT;
    if (c === 't') return TEMPLE;
    if (c === 's') return SWAMP;
    return OROOM;
}

// C ref: mkroom.c save_room()/save_rooms()/rest_room()/rest_rooms()
export function save_room(sroom) {
    if (!sroom || typeof sroom !== 'object') return null;
    return JSON.parse(JSON.stringify(sroom));
}
export function save_rooms(map) {
    if (!map || !Array.isArray(map.rooms)) return [];
    return map.rooms.map((room) => save_room(room));
}
export function rest_room(dest, saved) {
    if (!dest || !saved) return dest;
    Object.assign(dest, JSON.parse(JSON.stringify(saved)));
    return dest;
}
export function rest_rooms(map, savedRooms) {
    if (!map || !Array.isArray(savedRooms)) return false;
    map.rooms = savedRooms.map((saved) => save_room(saved));
    map.nroom = map.rooms.length;
    return true;
}

// C ref: mkroom.c mkundead() — select/place undead in a room.
export function mkundead(map, croom, mflags, depth) {
    if (!map || !croom) return 0;
    const n = rn2(5) + 1;
    let placed = 0;
    for (let i = 0; i < n; i++) {
        const pos = somexyspace(map, croom);
        if (!pos) continue;
        const mon = makemon(morguemon(depth), pos.x, pos.y, mflags || NO_MM_FLAGS, depth, map);
        if (mon) placed++;
    }
    return placed;
}

// C ref: mkroom.c squadmon() — return soldier type for BARRACKS.
export function squadmon(depth) {
    const difficulty = Math.max(Math.trunc(depth), 1);
    const squadprob = [
        { pm: PM_SOLDIER, prob: 80 },
        { pm: PM_SERGEANT, prob: 15 },
        { pm: PM_LIEUTENANT, prob: 4 },
        { pm: PM_CAPTAIN, prob: 1 },
    ];
    const sel_prob = rnd(80 + difficulty);
    let cpro = 0;
    for (let i = 0; i < squadprob.length; i++) {
        cpro += squadprob[i].prob;
        if (cpro > sel_prob) return mons[squadprob[i].pm];
    }
    return mons[squadprob[squadprob.length - 1].pm];
}

// C ref: mkroom.c courtmon() — return monster for COURT rooms.
export function courtmon(depth) {
    const difficulty = Math.max(Math.trunc(depth), 1);
    const i = rn2(60) + rn2(3 * difficulty);
    if (i > 100) return mkclass(S_DRAGON, 0, depth);
    else if (i > 95) return mkclass(S_GIANT, 0, depth);
    else if (i > 85) return mkclass(S_TROLL, 0, depth);
    else if (i > 75) return mkclass(S_CENTAUR, 0, depth);
    else if (i > 60) return mkclass(S_ORC, 0, depth);
    else if (i > 45) return mons[PM_BUGBEAR];
    else if (i > 30) return mons[PM_HOBGOBLIN];
    else if (i > 15) return mkclass(S_GNOME, 0, depth);
    else return mkclass(S_KOBOLD, 0, depth);
}

// C ref: mkroom.c morguemon() — return undead for MORGUE rooms.
export function morguemon(depth) {
    const difficulty = Math.max(Math.trunc(depth), 1);
    const i = rn2(100);
    const hd = rn2(difficulty);

    if (hd > 10 && i < 10) {
        const ndemon_res = ndemon(A_NONE, depth);
        if (ndemon_res >= 0) return mons[ndemon_res];
    }
    if (hd > 8 && i > 85) return mkclass(S_VAMPIRE, 0, depth);
    if (i < 20) return mons[PM_GHOST];
    else if (i < 40) return mons[PM_WRAITH];
    else return mkclass(S_ZOMBIE, 0, depth);
}

// C ref: mkroom.c:502-528 antholemon() — return ant type for ANTHOLE rooms.
export function antholemon(depth) {
    const difficulty = Math.max(Math.trunc(depth), 1);
    const indx = Math.trunc(_mkroomUbirthday % 3) + difficulty;
    let mtyp, trycnt = 0;
    do {
        switch ((indx + trycnt) % 3) {
        case 0: mtyp = PM_SOLDIER_ANT; break;
        case 1: mtyp = PM_FIRE_ANT; break;
        default: mtyp = PM_GIANT_ANT; break;
        }
    } while (++trycnt < 3 && false);
    return mons[mtyp];
}

function set_malign(mtmp) {
    if (!mtmp || !mtmp.data) return;
    let mal = mtmp.data.maligntyp || 0;
    const coaligned = (Math.sign(mal) === 0);
    if (mtmp.data.msound === MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal === A_NONE) {
        mtmp.malign = mtmp.mpeaceful ? 0 : 20;
    } else if (mtmp.data.mflags2 & M2_PEACEFUL) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? -3 * Math.max(5, absmal) : 3 * Math.max(5, absmal);
    } else if (mtmp.data.mflags2 & M2_HOSTILE) {
        const absmal = Math.abs(mal);
        mtmp.malign = coaligned ? 0 : Math.max(5, absmal);
    } else if (coaligned) {
        const absmal = Math.abs(mal);
        mtmp.malign = mtmp.mpeaceful ? -3 * Math.max(5, absmal) : 3 * Math.max(5, absmal);
    } else {
        mtmp.malign = mtmp.mpeaceful ? 0 : Math.max(5, Math.abs(mal));
    }
}

// C ref: mkroom.c:257 mk_zoo_thronemon() — place throne ruler for COURT rooms.
export function mk_zoo_thronemon(map, x, y, depth) {
    const difficulty = Math.max(Math.trunc(depth), 1);
    const i = rnd(difficulty);
    const pm = (i > 9) ? PM_OGRE_TYRANT
        : (i > 5) ? PM_ELVEN_MONARCH
            : (i > 2) ? PM_DWARF_RULER
                : PM_GNOME_RULER;
    const mon = makemon(mons[pm], x, y, NO_MM_FLAGS, depth, map);
    if (!mon) return;
    mon.sleeping = true;
    mon.msleeping = 1;
    mon.mpeaceful = false;
    set_malign(mon);
    const mace = mksobj(MACE, true, false);
    if (mace) mpickobj(mon, mace);
}
