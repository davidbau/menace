// themerms.js -- Themeroom definitions
// Faithful port of themerms.lua from NetHack 3.7.
// Each themeroom pick handler mirrors its Lua themerooms[] entry.
// C ref: dat/themerms.lua, dat/nhlib.lua

import {
    COLNO, ROWNO, STONE, VWALL, HWALL,
    DOOR, CORR, ROOM, SDOOR, SCORR, FOUNTAIN, THRONE, SINK,
    POOL, TREE, IRONBARS, LAVAPOOL, ICE, WATER, MOAT, LAVAWALL,
    AIR, CLOUD, CROSSWALL, MAX_TYPE, ALTAR, GRAVE,
    D_NODOOR, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_SECRET,
    OROOM, THEMEROOM,
    isok,
} from './config.js';
import { FILL_NORMAL } from './map.js';
import { rn2, rnd, rn1, rnz } from './rng.js';
import { mksobj } from './mkobj.js';
import { mkclass, def_char_to_monclass, makemon, NO_MM_FLAGS } from './makemon.js';
import { CORPSE } from './objects.js';
import { mons, G_NOGEN, G_IGNORE, MAXMCLASSES } from './monsters.js';
import {
    create_room, create_subroom, sp_create_door, floodFillAndRegister,
} from './dungeon.js';

// ========================================================================
// nhlib.lua helpers
// ========================================================================

// C ref: nhlib.lua shuffle() — Fisher-Yates from back
// rn2(n), rn2(n-1), ..., rn2(2) = (n-1) calls
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = rn2(i + 1);
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// ========================================================================
// des.door() wrappers — Lua-level door creation API
// C ref: sp_lev.c lspo_door() paths for state="random" and state="secret"
// ========================================================================

// C ref: sp_lev.c rnddoor() — random door state via ROLL_FROM
function rnddoor() {
    const states = [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED];
    return states[rn2(5)];
}

// C ref: themerms.lua des.door("random") — rnddoor + create_door with random mask
function des_door_random(map, room) {
    rnddoor(); // rn2(5) always consumed even though result is unused
    sp_create_door(map, { secret: 0, mask: -1, pos: -1, wall: -1 }, room);
}

// C ref: themerms.lua des.door("secret") — secret door, no rnddoor
function des_door_secret(map, room) {
    sp_create_door(map, { secret: 1, mask: D_SECRET, pos: -1, wall: -1 }, room);
}

// ========================================================================
// des.map() themeroom data and placement (picks 11-29)
// C ref: themerms.lua themerooms[12..30] (Lua 1-based)
// ========================================================================

const CHAR_TO_TYP = {
    ' ': STONE, '#': CORR, '.': ROOM, '-': HWALL, '|': VWALL,
    '+': DOOR, 'S': SDOOR, 'H': SCORR, '{': FOUNTAIN, '\\': THRONE,
    'K': SINK, '}': MOAT, 'P': POOL, 'L': LAVAPOOL, 'Z': LAVAWALL,
    'I': ICE, 'W': WATER, 'T': TREE, 'F': IRONBARS, 'A': AIR,
    'C': CLOUD, 'B': CROSSWALL, 'x': MAX_TYPE,
};

// Map data for des.map() themerooms (JS picks 11-29).
// Each entry: { map: string, filler: [x, y] } or { map: string, special: true }
// 'x' = transparent (existing terrain preserved).
// C ref: themerms.lua themerooms[12..30] (Lua 1-based)
const THEMEROOM_MAPS = [
    // [0] = pick 11: L-shaped
    { map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n--------', filler: [1, 1] },
    // [1] = pick 12: L-shaped, rot 1
    { map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n--------', filler: [5, 1] },
    // [2] = pick 13: L-shaped, rot 2
    { map: '--------\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----', filler: [1, 1] },
    // [3] = pick 14: L-shaped, rot 3
    { map: '--------\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx', filler: [1, 1] },
    // [4] = pick 15: Blocked center
    { map: '-----------\n|.........|\n|.........|\n|.........|\n|...LLL...|\n|...LLL...|\n|...LLL...|\n|.........|\n|.........|\n|.........|\n-----------', filler: [1, 1], blockedCenter: true },
    // [5] = pick 16: Circular, small
    { map: 'xx---xx\nx--.--x\n--...--\n|.....|\n--...--\nx--.--x\nxx---xx', filler: [3, 3] },
    // [6] = pick 17: Circular, medium
    { map: 'xx-----xx\nx--...--x\n--.....--\n|.......|\n|.......|\n|.......|\n--.....--\nx--...--x\nxx-----xx', filler: [4, 4] },
    // [7] = pick 18: Circular, big
    { map: 'xxx-----xxx\nx---...---x\nx-.......-x\n--.......--\n|.........|\n|.........|\n|.........|\n--.......--\nx-.......-x\nx---...---x\nxxx-----xxx', filler: [5, 5] },
    // [8] = pick 19: T-shaped
    { map: 'xxx-----xxx\nxxx|...|xxx\nxxx|...|xxx\n----...----\n|.........|\n|.........|\n|.........|\n-----------', filler: [5, 5] },
    // [9] = pick 20: T-shaped, rot 1
    { map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx', filler: [2, 2] },
    // [10] = pick 21: T-shaped, rot 2
    { map: '-----------\n|.........|\n|.........|\n|.........|\n----...----\nxxx|...|xxx\nxxx|...|xxx\nxxx-----xxx', filler: [2, 2] },
    // [11] = pick 22: T-shaped, rot 3
    { map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----', filler: [5, 5] },
    // [12] = pick 23: S-shaped
    { map: '-----xxx\n|...|xxx\n|...|xxx\n|...----\n|......|\n|......|\n|......|\n----...|\nxxx|...|\nxxx|...|\nxxx-----', filler: [2, 2] },
    // [13] = pick 24: S-shaped, rot 1
    { map: 'xxx--------\nxxx|......|\nxxx|......|\n----......|\n|......----\n|......|xxx\n|......|xxx\n--------xxx', filler: [5, 5] },
    // [14] = pick 25: Z-shaped
    { map: 'xxx-----\nxxx|...|\nxxx|...|\n----...|\n|......|\n|......|\n|......|\n|...----\n|...|xxx\n|...|xxx\n-----xxx', filler: [5, 5] },
    // [15] = pick 26: Z-shaped, rot 1
    { map: '--------xxx\n|......|xxx\n|......|xxx\n|......----\n----......|\nxxx|......|\nxxx|......|\nxxx--------', filler: [2, 2] },
    // [16] = pick 27: Cross
    { map: 'xxx-----xxx\nxxx|...|xxx\nxxx|...|xxx\n----...----\n|.........|\n|.........|\n|.........|\n----...----\nxxx|...|xxx\nxxx|...|xxx\nxxx-----xxx', filler: [6, 6] },
    // [17] = pick 28: Four-leaf clover
    { map: '-----x-----\n|...|x|...|\n|...---...|\n|.........|\n---.....---\nxx|.....|xx\n---.....---\n|.........|\n|...---...|\n|...|x|...|\n-----x-----', filler: [6, 6] },
    // [18] = pick 29: Water-surrounded vault
    { map: '}}}}}}\n}----}\n}|...|}\n}|...|}\n}----}\n}}}}}}', special: 'water_vault' },
];

// Place a des.map() themeroom on the level grid.
// Returns true if placed, false if failed after 100 attempts.
// C ref: sp_lev.c lspo_map() with in_mk_themerooms=TRUE
function placeMapThemeroom(map, mapIdx, depth) {
    const tmData = THEMEROOM_MAPS[mapIdx - 11]; // picks 11-29 → array 0-18
    const lines = tmData.map.split('\n');
    const mfHei = lines.length;
    const mfWid = Math.max(...lines.map(l => l.length));

    let xstart, ystart;
    for (let tryct = 0; tryct < 100; tryct++) {
        // C ref: sp_lev.c:6201-6204 — random position for themeroom map
        xstart = 1 + rn2(COLNO - 1 - mfWid);
        ystart = rn2(ROWNO - mfHei);

        // C ref: sp_lev.c:6217 — bounds check
        if (ystart < 0 || ystart + mfHei > ROWNO) continue;
        if (xstart < 1 || xstart + mfWid >= COLNO) continue;

        // C ref: sp_lev.c:6236-6264 — overlap check (border + interior)
        let ok = true;
        for (let y = ystart - 1; y < ystart + mfHei + 1 && ok; y++) {
            for (let x = xstart - 1; x < xstart + mfWid + 1 && ok; x++) {
                if (!isok(x, y)) { ok = false; break; }
                const loc = map.at(x, y);
                if (y < ystart || y >= ystart + mfHei
                    || x < xstart || x >= xstart + mfWid) {
                    // Border cell: must be STONE with no room
                    if (loc.typ !== STONE || loc.roomno !== 0) ok = false;
                } else {
                    // Interior cell
                    const ch = (lines[y - ystart] || '')[x - xstart] || ' ';
                    const mptyp = CHAR_TO_TYP[ch];
                    if (mptyp === undefined || mptyp >= MAX_TYPE) continue;
                    if ((loc.typ !== STONE || loc.roomno !== 0)
                        && loc.typ !== mptyp) {
                        ok = false;
                    }
                }
            }
        }
        if (!ok) continue;

        // Success — write map characters to the grid
        // C ref: sp_lev.c:6267-6288
        for (let y = ystart; y < ystart + mfHei; y++) {
            for (let x = xstart; x < xstart + mfWid; x++) {
                const ch = (lines[y - ystart] || '')[x - xstart] || ' ';
                const mptyp = CHAR_TO_TYP[ch];
                if (mptyp === undefined || mptyp >= MAX_TYPE) continue;
                const loc = map.at(x, y);
                loc.flags = 0;
                loc.horizontal = (mptyp === HWALL || mptyp === IRONBARS);
                loc.roomno = 0;
                loc.edge = false;
                loc.typ = mptyp;
                if (mptyp === SDOOR) loc.flags = D_CLOSED;
            }
        }

        // Execute contents callback
        if (tmData.blockedCenter) {
            // C ref: themerms.lua Blocked center — percent(30) + maybe replace L
            desMapBlockedCenter(map, xstart, ystart, mfWid, mfHei);
        }

        if (tmData.special === 'water_vault') {
            // Water vault uses des.region instead of filler_region
            desMapWaterVault(map, xstart, ystart, depth);
        } else {
            // Standard filler_region
            const fx = xstart + tmData.filler[0];
            const fy = ystart + tmData.filler[1];
            fillerRegion(map, fx, fy, depth);
        }

        // C ref: lspo_map() does NOT modify the rect pool for des.map()
        // themeroms. Overlap avoidance for subsequent rooms is handled by
        // the overlap check inside create_room(), not by split_rects().
        return true;
    }

    // All 100 attempts failed
    return false;
}

// C ref: themerms.lua Blocked center contents — before filler_region
function desMapBlockedCenter(map, xstart, ystart, wid, hei) {
    if (rn2(100) < 30) { // percent(30)
        // shuffle({"-","P"}) = rn2(2) for 2-element shuffle
        rn2(2);
        // des.replace_terrain: rn2(100) per cell matching 'L' (9 cells)
        // C ref: sp_lev.c lspo_replace_terrain — each cell: rn2(100) < chance
        for (let i = 0; i < 9; i++) rn2(100);
    }
}

// C ref: themerms.lua Water-surrounded vault contents
function desMapWaterVault(map, xstart, ystart, depth) {
    // des.region({irregular=true}) → litstate_rnd + flood_fill
    const rndVal = rnd(1 + Math.abs(depth));
    let lit = false;
    if (rndVal < 11) {
        lit = rn2(77) !== 0;
    }
    // flood_fill_rm + add_room (register the room)
    floodFillAndRegister(map, xstart + 2, ystart + 2, THEMEROOM, lit);

    // shuffle(chest_spots) — 4-element: rn2(4), rn2(3), rn2(2)
    rn2(4); rn2(3); rn2(2);
    // math.random(#escape_items) — rn2(4)
    rn2(4);
    // obj.new(escape_item) — creates object, RNG varies
    // des.object({id="chest",...}) × up to 4 — complex RNG
    // shuffle(nasty_undead) — 3-element: rn2(3), rn2(2)
    rn2(3); rn2(2);
    // des.monster — complex RNG
    // We can't faithfully simulate all the object/monster RNG here,
    // so PRNG will diverge from this point for water vault rooms.
    // Mark room as needjoining=false
    if (map.nroom > 0) {
        map.rooms[map.nroom - 1].needjoining = false;
    }
}

// C ref: themerms.lua filler_region(x, y)
// Flood fills from (absX, absY) to register an irregular room, then maybe
// applies themeroom_fill.
function fillerRegion(map, absX, absY, depth) {
    // percent(30) → rn2(100)
    const isThemed = rn2(100) < 30;

    // litstate_rnd(-1): rnd(1+depth), maybe rn2(77)
    // C ref: mkmap.c litstate_rnd
    const rndVal = rnd(1 + Math.abs(depth));
    let lit = false;
    if (rndVal < 11) {
        lit = rn2(77) !== 0;
    }

    // flood_fill_rm from (absX, absY) + add_room
    const rtype = isThemed ? THEMEROOM : OROOM;
    floodFillAndRegister(map, absX, absY, rtype, lit);

    // C ref: themerms.lua filler_region passes filled=1 to des.region()
    if (map.nroom > 0) {
        map.rooms[map.nroom - 1].needfill = FILL_NORMAL;
    }

    // If themed, run themeroom_fill reservoir sampling + contents
    if (isThemed && map.nroom > 0) {
        const room = map.rooms[map.nroom - 1];
        simulateThemeroomFill(map, room, depth);
    }
}

// ========================================================================
// des.object / des.monster helpers for themeroom contents
// These simulate the RNG consumption of C's sp_lev.c create_object()
// and create_monster() without actually placing the objects/monsters.
// ========================================================================

// C ref: sp_lev.c create_object() for CORPSE with specific montype name.
// Simulates: get_location + mksobj(CORPSE) + set_corpsenm override.
// The mksobj creates a "wasted" random corpse (rndmonnum + rnz) that gets
// overridden by set_corpsenm (another rnz). Both consume RNG.
function des_object_corpse_named(map, room, montype, buried) {
    // get_location_coord with RANDOM coords: somexy → 2 rn1 calls
    rn1(room.hx - room.lx + 1, room.lx); // somex
    rn1(room.hy - room.ly + 1, room.ly); // somey
    // mksobj(CORPSE, TRUE, TRUE) — creates random corpse then overrides
    const obj = mksobj(CORPSE, true, true);
    // create_object overrides corpsenm: second set_corpsenm → rnz(25)
    rnz(25);
    // C ref: dig.c bury_an_obj() → zap.c obj_resists(otmp, 0, 0)
    // When buried, create_object calls bury_an_obj which gates on obj_resists.
    // obj_resists always consumes rn2(100) for non-special objects.
    if (buried) {
        rn2(100);
    }
}

// C ref: sp_lev.c create_object() for CORPSE with montype class char.
// Similar to named but uses mkclass to select the monster type first.
function des_object_corpse_class(map, room, classChar) {
    // lspo_object: mkclass(def_char_to_monclass(classChar), G_NOGEN|G_IGNORE)
    const monclass = def_char_to_monclass(classChar);
    mkclass(monclass, G_NOGEN | G_IGNORE);
    // get_location_coord with fixed coords (0,0) → no RNG
    // mksobj(CORPSE, TRUE, TRUE)
    const obj = mksobj(CORPSE, true, true);
    // create_object overrides corpsenm: second set_corpsenm → rnz(25)
    rnz(25);
}

// C ref: sp_lev.c create_monster() for monster with class char.
// Used by Mausoleum: des.monster({ class=X, x=0, y=0, waiting=1 })
function des_monster_class(map, room, classChar, depth) {
    // C ref: sp_lev.c:1943 sp_amask_to_amask(AM_SPLEV_RANDOM)
    //   → induced_align(80) in dungeon.c:1993
    //   For regular DoD levels: no special level align, no dungeon align
    //   → falls through to rn2(3) at dungeon.c:2006
    rn2(3); // induced_align — random alignment (unused but consumes RNG)
    // lspo_monster: mkclass(def_char_to_monclass(classChar), G_NOGEN)
    const monclass = def_char_to_monclass(classChar);
    const mndx = mkclass(monclass, G_NOGEN, depth);
    // get_location_coord with fixed coords (0,0) → no RNG
    // Place at room's (lx, ly)
    const x = room.lx;
    const y = room.ly;
    // makemon(pm, x, y, NO_MM_FLAGS) — full monster creation
    if (mndx >= 0) {
        makemon(mndx, x, y, NO_MM_FLAGS, depth, map);
    }
}

// ========================================================================
// Themeroom fill types (picks 5-7 and des.map filler_region)
// C ref: themerms.lua themeroom_fills[] and themeroom_fill()
// ========================================================================

// Themeroom fill types in order from themerms.lua themeroom_fills array.
// All have frequency=1. Eligibility depends on depth and room lit state.
const FILL_TYPES = [
    { name: 'ice' },
    { name: 'cloud' },
    { name: 'boulder', mindiff: 4 },
    { name: 'spider' },
    { name: 'trap' },
    { name: 'garden', needsLit: true },
    { name: 'buried_treasure' },
    { name: 'buried_zombies' },
    { name: 'massacre' },
    { name: 'statuary' },
    { name: 'light_source', needsUnlit: true },
    { name: 'temple' },
    { name: 'ghost' },
    { name: 'storeroom' },
    { name: 'teleport' },
];

// Simulate C's themeroom_fill() Lua function.
// Does reservoir sampling to pick a fill, then simulates the fill's RNG.
// C ref: themerms.lua themeroom_fill()
function simulateThemeroomFill(map, room, depth, forceLit) {
    const lit = (forceLit !== undefined) ? forceLit : room.rlit;
    const levelDiff = Math.max(0, depth - 1);

    // Reservoir sampling over eligible fills (all freq=1)
    let pickName = null;
    let totalFreq = 0;
    for (const fill of FILL_TYPES) {
        if (fill.mindiff && levelDiff < fill.mindiff) continue;
        if (fill.needsLit && !lit) continue;
        if (fill.needsUnlit && lit) continue;
        totalFreq++;
        if (rn2(totalFreq) === 0) {
            pickName = fill.name;
        }
    }

    // Simulate fill contents RNG consumption.
    // Each fill's contents function in themerms.lua calls des.altar/des.object/
    // des.monster/des.trap which consume RNG. We simulate the simple ones here.
    //
    // IMPORTANT: math.random in nhlib.lua is overridden to use NetHack RNG:
    //   math.random(n) → 1 + nh.rn2(n) → rn2(n)
    //   math.random(a, b) → nh.random(a, b-a+1) → rn2(b-a+1)
    //   percent(n) → math.random(0, 99) → rn2(100)
    //   d(n, x) → n × math.random(1, x) → n × rn2(x)
    //   shuffle(list) → (len-1) rn2 calls
    const w = room.hx - room.lx + 1;
    const h = room.hy - room.ly + 1;
    const floorTiles = w * h; // all floor tiles (lx..hx × ly..hy)
    switch (pickName) {
        case 'ice':
            // C ref: themerms.lua Ice room — selection.room() then des.terrain(ice, "I")
            // selection.room() selects all floor tiles from lx..hx, ly..hy
            for (let y = room.ly; y <= room.hy; y++) {
                for (let x = room.lx; x <= room.hx; x++) {
                    const loc = map.at(x, y);
                    if (loc && loc.typ === ROOM) loc.typ = ICE;
                }
            }
            // percent(25) → rn2(100)
            if (rn2(100) < 25) {
                // ice:iterate(ice_melter) — nh.rn2(1000) per floor tile
                for (let i = 0; i < floorTiles; i++) {
                    rn2(1000);
                }
            }
            break;
        case 'temple':
            // Temple of the gods: 3 altars × (somex + somey)
            // C ref: themerms.lua Temple of the gods, mkroom.c somex/somey
            for (let i = 0; i < 3; i++) {
                const ax = rn2(w) + room.lx; // somex: rn1(hx-lx+1, lx)
                const ay = rn2(h) + room.ly; // somey: rn1(hy-ly+1, ly)
                const loc = map.at(ax, ay);
                if (loc) loc.typ = ALTAR;
            }
            break;
        case 'buried_zombies': {
            // C ref: themerms.lua "Buried zombies"
            const diff = depth; // level_difficulty() = depth for main dungeon
            const zombifiable = ['kobold', 'gnome', 'orc', 'dwarf'];
            if (diff > 3) {
                zombifiable.push('elf', 'human');
                if (diff > 6) {
                    zombifiable.push('ettin', 'giant');
                }
            }
            const count = Math.floor((w * h) / 2);
            for (let i = 0; i < count; i++) {
                shuffleArray(zombifiable); // (len-1) rn2 calls
                des_object_corpse_named(map, room, zombifiable[0], true);
                // o:stop_timer("rot-corpse") — no RNG
                // o:start_timer("zombify-mon", math.random(990, 1010))
                rn2(21); // math.random(990, 1010)
            }
            break;
        }
        // TODO: simulate other fill types (cloud, spider, trap, etc.)
    }
}

// ========================================================================
// Themeroom pick handlers for des.room() themerooms (picks 0-10)
// Each handler returns true if room was created, false if creation failed.
// rn2(100) is consumed at the position matching C's build_room call.
// Pre-room RNG (for picks 3, 4, 9, 10) comes before rn2(100).
// C ref: themerms.lua themerooms array entries
// ========================================================================

function themeroom_pick1_fakeDelphi(map, depth) {
    // C ref: themerms.lua "Fake Delphi" (Lua index 2)
    // Outer 11×9 room with inner 3×3 sub-room at (4,3) + random door
    rn2(100); // build_room chance check (outer)
    if (!create_room(map, -1, -1, 11, 9, -1, -1, OROOM, -1, depth, true))
        return false;
    const outer = map.rooms[map.nroom - 1];
    outer.needfill = FILL_NORMAL;
    rn2(100); // build_room chance check (inner des.room)
    const inner = create_subroom(map, outer, 4, 3, 3, 3, OROOM, -1, depth);
    if (inner) {
        inner.needfill = FILL_NORMAL;
        des_door_random(map, inner);
    }
    return true;
}

function themeroom_pick2_roomInRoom(map, depth) {
    // C ref: themerms.lua "Room in a room" (Lua index 3)
    // Random outer room with random inner sub-room + random door
    rn2(100); // build_room chance check (outer)
    if (!create_room(map, -1, -1, -1, -1, -1, -1, OROOM, -1, depth, true))
        return false;
    const outer = map.rooms[map.nroom - 1];
    outer.needfill = FILL_NORMAL;
    rn2(100); // build_room chance check (inner des.room)
    const inner = create_subroom(map, outer, -1, -1, -1, -1, OROOM, -1, depth);
    if (inner) {
        // No filled=1 on inner room in Lua → FILL_NONE (default)
        des_door_random(map, inner);
    }
    return true;
}

function themeroom_pick3_hugeRoom(map, depth) {
    // C ref: themerms.lua "Huge room" (Lua index 4)
    // Pre-room RNG: nh.rn2(10), nh.rn2(5) for dimensions
    const wid = rn2(10);
    const hei = rn2(5);
    rn2(100);
    if (!create_room(map, -1, -1, 11 + wid, 8 + hei, -1, -1, OROOM, -1, depth, true))
        return false;
    const outer = map.rooms[map.nroom - 1];
    outer.needfill = FILL_NORMAL;
    if (rn2(100) < 90) { // percent(90)
        rn2(100); // build_room chance check (inner des.room)
        const inner = create_subroom(map, outer, -1, -1, -1, -1, OROOM, -1, depth);
        if (inner) {
            inner.needfill = FILL_NORMAL;
            des_door_random(map, inner);
            if (rn2(100) < 50) { // percent(50)
                des_door_random(map, inner);
            }
        }
    }
    return true;
}

function themeroom_pick4_nestingRooms(map, depth) {
    // C ref: themerms.lua "Nesting rooms" (Lua index 5)
    // Pre-room RNG: nh.rn2(4) × 2 for outer dimensions
    const outerW = rn2(4);
    const outerH = rn2(4);
    rn2(100);
    if (!create_room(map, -1, -1, 9 + outerW, 9 + outerH, -1, -1, OROOM, -1, depth, true))
        return false;
    const outer = map.rooms[map.nroom - 1];
    outer.needfill = FILL_NORMAL;
    // Middle room: math.random(floor(W/2), W-2) = floor(W/2) + rn2(W-2 - floor(W/2) + 1)
    const oW = outer.hx - outer.lx + 1;
    const oH = outer.hy - outer.ly + 1;
    const midW = Math.floor(oW / 2) + rn2(oW - 2 - Math.floor(oW / 2) + 1);
    const midH = Math.floor(oH / 2) + rn2(oH - 2 - Math.floor(oH / 2) + 1);
    rn2(100); // build_room chance check (middle des.room)
    const middle = create_subroom(map, outer, -1, -1, midW, midH, OROOM, -1, depth);
    if (middle) {
        middle.needfill = FILL_NORMAL;
        // In Lua: innermost room created first, then middle's doors
        if (rn2(100) < 90) { // percent(90)
            rn2(100); // build_room chance check (innermost des.room)
            const innermost = create_subroom(map, middle, -1, -1, -1, -1, OROOM, -1, depth);
            if (innermost) {
                innermost.needfill = FILL_NORMAL;
                des_door_random(map, innermost);
                if (rn2(100) < 15) des_door_random(map, innermost); // percent(15)
            }
        }
        des_door_random(map, middle);
        if (rn2(100) < 15) des_door_random(map, middle); // percent(15)
    }
    return true;
}

function themeroom_pick8_pillars(map, depth) {
    // C ref: themerms.lua "Pillars" (Lua index 9)
    // 10×10 room with 4 2×2 terrain pillars from shuffled array
    rn2(100);
    if (!create_room(map, -1, -1, 10, 10, -1, -1, THEMEROOM, -1, depth, true))
        return false;
    const room = map.rooms[map.nroom - 1];
    // Lua: { "-", "-", "-", "-", "L", "P", "T" }
    // → [HWALL, HWALL, HWALL, HWALL, LAVAPOOL, POOL, TREE]
    const terrains = [HWALL, HWALL, HWALL, HWALL, LAVAPOOL, POOL, TREE];
    shuffleArray(terrains); // 6 rn2 calls
    const pillarTyp = terrains[0];
    // Place 2×2 pillar blocks at grid positions
    for (let px = 0; px <= 1; px++) {
        for (let py = 0; py <= 1; py++) {
            const bx = room.lx + px * 4 + 2;
            const by = room.ly + py * 4 + 2;
            for (let dx = 0; dx <= 1; dx++) {
                for (let dy = 0; dy <= 1; dy++) {
                    const loc = map.at(bx + dx, by + dy);
                    if (loc) loc.typ = pillarTyp;
                }
            }
        }
    }
    return true;
}

function themeroom_pick9_mausoleum(map, depth) {
    // C ref: themerms.lua "Mausoleum" (Lua index 10)
    // Pre-room RNG: nh.rn2(3) × 2 for dimensions
    const w = rn2(3);
    const h = rn2(3);
    rn2(100);
    if (!create_room(map, -1, -1, 5 + w * 2, 5 + h * 2, -1, -1, THEMEROOM, -1, depth, true))
        return false;
    const outer = map.rooms[map.nroom - 1];
    // Inner 1×1 sub-room at center
    const oW = outer.hx - outer.lx + 1;
    const oH = outer.hy - outer.ly + 1;
    const cx = Math.floor((oW - 1) / 2);
    const cy = Math.floor((oH - 1) / 2);
    rn2(100); // build_room chance check (inner des.room)
    const inner = create_subroom(map, outer, cx, cy, 1, 1, THEMEROOM, -1, depth);
    if (inner) {
        inner.needjoining = false;
        if (rn2(100) < 50) { // percent(50) — monster
            const monClasses = ['M', 'V', 'L', 'Z']; // mummy, vampire, lich, zombie
            shuffleArray(monClasses); // 3 rn2 calls
            des_monster_class(map, inner, monClasses[0], depth);
        } else {
            // des.object({ id="corpse", montype="@", coord={0,0} })
            des_object_corpse_class(map, inner, '@');
        }
        if (rn2(100) < 20) { // percent(20) — secret door
            des_door_secret(map, inner);
        }
    }
    return true;
}

function themeroom_pick10_randomFeature(map, depth) {
    // C ref: themerms.lua "Random dungeon feature" (Lua index 11)
    // Pre-room RNG: nh.rn2(3) × 2 for dimensions (always odd)
    const wid = 3 + rn2(3) * 2;
    const hei = 3 + rn2(3) * 2;
    rn2(100);
    if (!create_room(map, -1, -1, wid, hei, -1, -1, OROOM, -1, depth, true))
        return false;
    const room = map.rooms[map.nroom - 1];
    room.needfill = FILL_NORMAL;
    // Lua: { "C", "L", "I", "P", "T" } → [CLOUD, LAVAPOOL, ICE, POOL, TREE]
    const features = [CLOUD, LAVAPOOL, ICE, POOL, TREE];
    shuffleArray(features); // 4 rn2 calls
    // Place single terrain tile at room center
    const cx = room.lx + Math.floor((room.hx - room.lx) / 2);
    const cy = room.ly + Math.floor((room.hy - room.ly) / 2);
    const loc = map.at(cx, cy);
    if (loc) loc.typ = features[0];
    return true;
}

// C ref: themerms.lua "default" — des.room({ type="ordinary", filled=1 })
function themeroom_default(map, depth) {
    rn2(100);
    if (!create_room(map, -1, -1, -1, -1, -1, -1, OROOM, -1, depth, true))
        return false;
    map.rooms[map.nroom - 1].needfill = FILL_NORMAL;
    return true;
}

// C ref: themerms.lua picks 5-7 — des.room({ type="themed", filled=1 })
// with themeroom_fill callback. Pick 6 is dark (lit=0).
function themeroom_desroom_fill(map, pick, depth) {
    rn2(100);
    if (!create_room(map, -1, -1, -1, -1, -1, -1, OROOM, -1, depth, true))
        return false;
    const room = map.rooms[map.nroom - 1];
    room.needfill = FILL_NORMAL;
    room.rtype = THEMEROOM;
    const forceLit = (pick === 6) ? false : undefined;
    simulateThemeroomFill(map, room, depth, forceLit);
    return true;
}

// ========================================================================
// themerooms_generate() — main entry point
// C ref: themerms.lua themerooms_generate()
// Reservoir sampling + dispatch to picked themeroom's contents callback.
// ========================================================================

// C ref: themerooms.lua — themerooms_generate calls rn2 with these args.
// Each cumulative frequency corresponds to a themeroom entry:
//   [0]=default(1000), [1]=FakeDelphi(+1), [2]=RoomInRoom(+1),
//   [3]=NestingRooms(+1), [4]=Pillars(+1), [5]=ThemedFill(+6),
//   [6]=UnlitThemedFill(+2), [7]=NormalAndThemedFill(+2), [8..29]=various(+1 each)
const THEMEROOM_ARGS = [
    1000, 1001, 1002, 1003, 1004, 1010, 1012, 1014,
    1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022,
    1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030,
    1031, 1032, 1033, 1034, 1035, 1036
];

export function themerooms_generate(map, depth) {
    // Reservoir sampling
    let pick = 0;
    let prevFreq = 0;
    for (let i = 0; i < THEMEROOM_ARGS.length; i++) {
        const cumFreq = THEMEROOM_ARGS[i];
        const thisFreq = cumFreq - prevFreq;
        const val = rn2(cumFreq);
        if (thisFreq > 0 && val < thisFreq) {
            pick = i;
        }
        prevFreq = cumFreq;
    }

    // C ref: themerooms[pick].contents()
    switch (pick) {
        case 0:  return themeroom_default(map, depth);
        case 1:  return themeroom_pick1_fakeDelphi(map, depth);
        case 2:  return themeroom_pick2_roomInRoom(map, depth);
        case 3:  return themeroom_pick3_hugeRoom(map, depth);
        case 4:  return themeroom_pick4_nestingRooms(map, depth);
        case 5: case 6: case 7:
            return themeroom_desroom_fill(map, pick, depth);
        case 8:  return themeroom_pick8_pillars(map, depth);
        case 9:  return themeroom_pick9_mausoleum(map, depth);
        case 10: return themeroom_pick10_randomFeature(map, depth);
        default: // picks 11-29: des.map() themerooms
            return placeMapThemeroom(map, pick, depth);
    }
}
