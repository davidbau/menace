// dbridge.js -- Drawbridge mechanics
// cf. dbridge.c — is_waterwall, is_pool, is_lava, is_pool_or_lava, is_ice,
//                 is_moat, db_under_typ, is_drawbridge_wall, is_db_wall,
//                 find_drawbridge, get_wall_for_db, create_drawbridge,
//                 e_at, m_to_e, u_to_e, set_entity, e_nam, E_phrase,
//                 e_survives_at, e_died, automiss, e_missed, e_jumps,
//                 do_entity, nokiller, close_drawbridge, open_drawbridge,
//                 destroy_drawbridge
//
// dbridge.c manages drawbridge creation, opening, closing, and destruction,
//   plus terrain type checks (pool, lava, ice, moat, waterwall):
//   create_drawbridge(): create drawbridge in dungeon.
//   open_drawbridge/close_drawbridge: open or close; handle entities on bridge.
//   destroy_drawbridge(): demolish the drawbridge completely.
//   is_pool/is_lava/is_ice/is_moat: terrain type predicates.

import {
    isok, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, STONE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DBWALL, DOOR, ROOM,
    IS_DRAWBRIDGE, IS_WATERWALL, IS_WALL,
    DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_DIR,
    DB_MOAT, DB_LAVA, DB_ICE, DB_UNDER,
    W_NONDIGGABLE,
    D_NODOOR,
} from './const.js';
import { rnd, rn2 } from './rng.js';
import { block_point, unblock_point } from './vision.js';
import { passes_walls, noncorporeal, is_flyer, is_floater,
         is_swimmer, likes_lava, x_monnam, y_monnam,
         canseemon } from './mondata.js';
import { mondead } from './mon.js';
import { newsym } from './display.js';

// ============================================================================
// Terrain predicates (cf. dbridge.c:38-128)
// These take (x, y, map) — map is the GameMap object.
// ============================================================================
function mapLoc(map, x, y) {
    if (!map) return null;
    if (typeof map.at === 'function') return map.at(x, y);
    return map.locations?.[x]?.[y] || null;
}

// cf. dbridge.c:38 — is_waterwall(x, y)
// Autotranslated from dbridge.c:37
export function is_waterwall(x, y, map) {
  if (isok(x, y) && IS_WATERWALL(map.locations[x][y].typ)) return true;
  return false;
}

// cf. dbridge.c:45 — is_pool(x, y)
// Autotranslated from dbridge.c:45
export function is_pool(x, y, map) {
  let ltyp;
  if (!isok(x, y)) return false;
  ltyp = map.locations[x][y].typ;
  if (ltyp === POOL || ltyp === MOAT || ltyp === WATER || is_moat(x, y, map)) return true;
  return false;
}

// cf. dbridge.c:61 — is_lava(x, y)
// Autotranslated from dbridge.c:61
export function is_lava(x, y, map) {
  let ltyp;
  if (!isok(x, y)) return false;
  ltyp = map.locations[x][y].typ;
  if (ltyp === LAVAPOOL || ltyp === LAVAWALL || (ltyp === DRAWBRIDGE_UP && (map.locations[x][y].drawbridgemask & DB_UNDER) === DB_LAVA)) return true;
  return false;
}

// cf. dbridge.c:76 — is_pool_or_lava(x, y)
export function is_pool_or_lava(x, y, map) {
    return is_pool(x, y, map) || is_lava(x, y, map);
}

// cf. dbridge.c:85 — is_ice(x, y)
// Autotranslated from dbridge.c:85
export function is_ice(x, y, map) {
  let ltyp;
  if (!isok(x, y)) return false;
  ltyp = map.locations[x][y].typ;
  if (ltyp === ICE || (ltyp === DRAWBRIDGE_UP && (map.locations[x][y].drawbridgemask & DB_UNDER) === DB_ICE)) return true;
  return false;
}

// cf. dbridge.c:99 — is_moat(x, y)
// On Juiblex's level, MOAT tiles are not treated as moats.
// We check map.flags.is_juiblex_level if set.
export function is_moat(x, y, map) {
    if (!isok(x, y)) return false;
    const loc = mapLoc(map, x, y);
    if (!loc) return false;
    const ltyp = loc.typ;
    if (map.flags && map.flags.is_juiblex_level) return false;
    if (ltyp === MOAT
        || (ltyp === DRAWBRIDGE_UP
            && (loc.drawbridgemask & DB_UNDER) === DB_MOAT))
        return true;
    return false;
}

// cf. dbridge.c:115 — db_under_typ(mask)
export function db_under_typ(mask) {
    switch (mask & DB_UNDER) {
    case DB_ICE: return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default: return STONE;
    }
}

// ============================================================================
// Drawbridge structure queries (cf. dbridge.c:136-283)
// ============================================================================

// cf. dbridge.c:136 — is_drawbridge_wall(x, y)
// Returns direction if wall at (x,y) is a drawbridge portcullis; -1 otherwise.
// Autotranslated from dbridge.c:136
export function is_drawbridge_wall(x, y, map) {
  let lev;
  if (!isok(x, y)) return -1;
  lev = map.locations[x][y];
  if (lev.typ !== DOOR && lev.typ !== DBWALL) return -1;
  if (isok(x + 1, y) && IS_DRAWBRIDGE(map.locations[x + 1][y].typ) && (map.locations[x + 1][y].drawbridgemask & DB_DIR) === DB_WEST) return DB_WEST;
  if (isok(x - 1, y) && IS_DRAWBRIDGE(map.locations[x - 1][y].typ) && (map.locations[x - 1][y].drawbridgemask & DB_DIR) === DB_EAST) return DB_EAST;
  if (isok(x, y - 1) && IS_DRAWBRIDGE(map.locations[x][y - 1].typ) && (map.locations[x][y - 1].drawbridgemask & DB_DIR) === DB_SOUTH) return DB_SOUTH;
  if (isok(x, y + 1) && IS_DRAWBRIDGE(map.locations[x][y + 1].typ) && (map.locations[x][y + 1].drawbridgemask & DB_DIR) === DB_NORTH) return DB_NORTH;
  return -1;
}

// cf. dbridge.c:169 — is_db_wall(x, y)
// Autotranslated from dbridge.c:169
export function is_db_wall(x, y, map) {
  return (map.locations[x][y].typ === DBWALL);
}

// cf. dbridge.c:179 — find_drawbridge(x, y)
// Returns { x, y, found } — modifies coordinates to point to drawbridge.
export function find_drawbridge(x, y, map) {
    const loc = map.at(x, y);
    if (loc && IS_DRAWBRIDGE(loc.typ)) return { x, y, found: true };
    const dir = is_drawbridge_wall(x, y, map);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH: y++; break;
        case DB_SOUTH: y--; break;
        case DB_EAST: x--; break;
        case DB_WEST: x++; break;
        }
        return { x, y, found: true };
    }
    return { x, y, found: false };
}

// cf. dbridge.c:210 — get_wall_for_db(x, y, map)
// Returns { x, y } pointing to the wall for a drawbridge at (x, y).
export function get_wall_for_db(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return { x, y };
    switch (loc.drawbridgemask & DB_DIR) {
    case DB_NORTH: y--; break;
    case DB_SOUTH: y++; break;
    case DB_EAST: x++; break;
    case DB_WEST: x--; break;
    }
    return { x, y };
}

// cf. dbridge.c:234 — create_drawbridge(x, y, dir, flag, map)
// Creates a drawbridge at (x,y) facing direction dir.
// flag=true means open; flag=false means closed.
export function create_drawbridge(x, y, dir, flag, map) {
    let x2 = x, y2 = y;
    let horiz;
    const loc = map.at(x, y);
    const lava = loc && loc.typ === LAVAPOOL;

    switch (dir) {
    case DB_NORTH: horiz = true; y2--; break;
    case DB_SOUTH: horiz = true; y2++; break;
    case DB_EAST: horiz = false; x2++; break;
    case DB_WEST: horiz = false; x2--; break;
    default: horiz = false; x2--; break; // bad direction fallback
    }

    const wallLoc = map.at(x2, y2);
    if (!wallLoc || !IS_WALL(wallLoc.typ)) return false;

    if (flag) { // open
        loc.typ = DRAWBRIDGE_DOWN;
        wallLoc.typ = DOOR;
        wallLoc.flags = D_NODOOR;
    } else {
        loc.typ = DRAWBRIDGE_UP;
        wallLoc.typ = DBWALL;
        wallLoc.wall_info = (Number(wallLoc.wall_info || 0) | W_NONDIGGABLE);
        wallLoc.nondiggable = true; // compatibility mirror
    }
    loc.horizontal = !horiz;
    wallLoc.horizontal = horiz;
    loc.drawbridgemask = dir;
    if (lava) loc.drawbridgemask |= DB_LAVA;
    return true;
}

// ============================================================================
// Entity handling for drawbridge mechanics (cf. dbridge.c:285-747)
// Entities represent creatures on or near the drawbridge during state changes.
// ============================================================================

const ENTITIES = 2;

// cf. dbridge.c:285 — e_at(x, y): find entity at position
function e_at(x, y, occupants) {
    for (let i = 0; i < ENTITIES; i++) {
        if (occupants[i].edata && occupants[i].ex === x && occupants[i].ey === y)
            return occupants[i];
    }
    return null;
}

// cf. dbridge.c:303 — m_to_e: populate entity from monster
export function m_to_e(mtmp, x, y, etmp) {
    etmp.emon = mtmp;
    if (mtmp) {
        etmp.ex = x;
        etmp.ey = y;
        etmp.edata = mtmp.data || mtmp.mdat || true;
    } else {
        etmp.edata = null;
        etmp.ex = etmp.ey = 0;
    }
}

// cf. dbridge.c:320 — u_to_e: populate entity from hero
function u_to_e(etmp, player) {
    etmp.emon = player;
    etmp.ex = player.x;
    etmp.ey = player.y;
    etmp.edata = player.data || true;
    etmp.isPlayer = true;
}

// cf. dbridge.c:330 — set_entity: populate entity from whatever's at (x,y)
export function set_entity(x, y, etmp, map, player) {
    if (player && player.x === x && player.y === y) {
        u_to_e(etmp, player);
    } else {
        const mon = map.monsterAt(x, y);
        m_to_e(mon, x, y, etmp);
        etmp.isPlayer = false;
    }
}

function is_u(etmp) { return etmp.isPlayer === true; }
function e_canseemon_fn(etmp) { return is_u(etmp) || canseemon(etmp.emon); }
export function e_nam(etmp) { return is_u(etmp) ? "you" : y_monnam(etmp.emon); }
export function E_phrase(etmp, verb) {
    const who = is_u(etmp) ? "You" : x_monnam(etmp.emon);
    if (!verb) return who;
    // Simple 2nd->3rd person: add 's' for non-player
    const v = is_u(etmp) ? verb : (verb + (verb.endsWith('s') ? 'es' : 's'));
    return `${who} ${v}`;
}

// cf. dbridge.c:379 — e_survives_at: can entity survive at (x,y)?
export function e_survives_at(etmp, x, y, map) {
    if (noncorporeal(etmp.edata)) return true;
    if (is_pool(x, y, map))
        return is_u(etmp) || is_swimmer(etmp.edata)
               || is_flyer(etmp.edata) || is_floater(etmp.edata);
    if (is_lava(x, y, map))
        return (is_u(etmp)) || likes_lava(etmp.edata) || is_flyer(etmp.edata);
    if (is_db_wall(x, y, map))
        return is_u(etmp) ? false : passes_walls(etmp.edata);
    return true;
}

// cf. dbridge.c:463 — automiss: entity is never hit by drawbridge
// Autotranslated from dbridge.c:463
export function automiss(etmp) {
  // C: Passes_walls (capital P) is player macro; use passes_walls(edata) for both
  return  (passes_walls(etmp.edata) || noncorporeal(etmp.edata));
}

// cf. dbridge.c:473 — e_missed: does falling drawbridge/portcullis miss?
// RNG: calls rnd(8)
function e_missed(etmp, chunks, map) {
    if (automiss(etmp)) return true;

    let misses;
    if (is_flyer(etmp.edata))
        misses = 5;
    else if (is_floater(etmp.edata) || (is_u(etmp) /* && Levitation */))
        misses = 3;
    else if (chunks && is_pool(etmp.ex, etmp.ey, map))
        misses = 2;
    else
        misses = 0;

    if (is_db_wall(etmp.ex, etmp.ey, map))
        misses -= 3;

    return misses >= rnd(8);
}

// cf. dbridge.c:508 — e_jumps: can entity jump from death?
// RNG: calls rnd(10)
function e_jumps(etmp) {
    let tmp = 4;

    if (is_u(etmp)) {
        // Player fumbling/unaware can't jump
        return false; // simplified: hero can't jump
    }

    if (!etmp.edata || !etmp.emon) return false;
    const mon = etmp.emon;
    if (mon.mhp <= 0 || mon.wormno) return false;

    if (mon.mconf) tmp -= 2;
    if (mon.mstun) tmp -= 3;

    return tmp >= rnd(10);
}

// cf. dbridge.c:401 — e_died: entity dies from drawbridge
function e_died(etmp, xkill_flags, how, map) {
    if (is_u(etmp)) {
        // Hero death from drawbridge — simplified
        // Full implementation would call done(how)
        return;
    }
    // Monster death
    if (etmp.emon && etmp.emon.mhp > 0) {
        mondead(etmp.emon, map);
        etmp.edata = null;
    }
}

// cf. dbridge.c:531 — do_entity: handle entity during drawbridge state change
// RNG: calls e_missed (rnd(8)) and e_jumps (rnd(10))
function do_entity(etmp, occupants, map, player) {
    if (!etmp.edata) return;

    const oldx = etmp.ex;
    const oldy = etmp.ey;
    const at_portcullis = is_db_wall(oldx, oldy, map);
    const loc = map.at(oldx, oldy);

    if (automiss(etmp) && e_survives_at(etmp, oldx, oldy, map)) {
        return;
    }

    let must_jump = false;
    let relocates = false;

    if (e_missed(etmp, false, map)) {
        if (e_survives_at(etmp, oldx, oldy, map)) {
            return;
        } else {
            if (at_portcullis) must_jump = true;
            else relocates = true;
        }
    } else {
        if (loc && loc.typ === DRAWBRIDGE_DOWN) {
            // Crushed underneath — no jump possible
            e_died(etmp, 0x03, 0 /* CRUSHING */, map);
            return;
        }
        must_jump = true;
    }

    if (must_jump) {
        if (at_portcullis) {
            if (e_jumps(etmp)) {
                relocates = true;
            } else {
                e_died(etmp, 0x03, 0 /* CRUSHING */, map);
                return;
            }
        } else {
            relocates = !e_jumps(etmp);
        }
    }

    // Try relocation
    let newx = oldx, newy = oldy;
    const db = find_drawbridge(newx, newy, map);
    if (db.found) { newx = db.x; newy = db.y; }
    if (newx === oldx && newy === oldy) {
        const w = get_wall_for_db(newx, newy, map);
        newx = w.x; newy = w.y;
    }

    if (relocates && e_at(newx, newy, occupants)) {
        const other = e_at(newx, newy, occupants);
        if (e_survives_at(other, newx, newy, map) && automiss(other)) {
            relocates = false;
        } else {
            do_entity(other, occupants, map, player);
            if (e_at(oldx, oldy, occupants) !== etmp) return;
        }
    }

    if (relocates && !e_at(newx, newy, occupants)) {
        if (!is_u(etmp)) {
            // Move monster
            const mon = etmp.emon;
            if (mon) {
                const _omx = mon.mx, _omy = mon.my;
                mon.mx = newx; mon.my = newy;
                newsym(_omx, _omy);
                newsym(newx, newy);
            }
        } else {
            player.x = newx;
            player.y = newy;
        }
        etmp.ex = newx;
        etmp.ey = newy;
    }

    // Check survival at final position
    if (!e_survives_at(etmp, etmp.ex, etmp.ey, map)) {
        e_died(etmp, 0x03,
               is_pool(etmp.ex, etmp.ey, map) ? 1 /* DROWNING */
               : is_lava(etmp.ex, etmp.ey, map) ? 2 /* BURNING */
               : 0 /* CRUSHING */, map);
    }
}

// cf. dbridge.c:740 — nokiller: clear entity state after drawbridge ops
function nokiller(occupants) {
    m_to_e(null, 0, 0, occupants[0]);
    m_to_e(null, 0, 0, occupants[1]);
}

// ============================================================================
// Drawbridge open/close/destroy with full entity handling
// ============================================================================

// cf. dbridge.c:752 — close_drawbridge(x, y): close drawbridge
export function close_drawbridge(x, y, map, player) {
    const loc = map.at(x, y);
    if (!loc || loc.typ !== DRAWBRIDGE_DOWN) return;
    const wall = get_wall_for_db(x, y, map);
    const wallLoc = map.at(wall.x, wall.y);

    loc.typ = DRAWBRIDGE_UP;
    if (wallLoc) {
        wallLoc.typ = DBWALL;
        switch (loc.drawbridgemask & DB_DIR) {
        case DB_NORTH: case DB_SOUTH:
            wallLoc.horizontal = true; break;
        case DB_WEST: case DB_EAST:
            wallLoc.horizontal = false; break;
        }
        wallLoc.wall_info = (Number(wallLoc.wall_info || 0) | W_NONDIGGABLE);
        wallLoc.nondiggable = true; // compatibility mirror
    }

    // Entity handling (cf. dbridge.c:789-793)
    const occupants = [{}, {}];
    set_entity(x, y, occupants[0], map, player);
    set_entity(wall.x, wall.y, occupants[1], map, player);
    do_entity(occupants[0], occupants, map, player);
    set_entity(wall.x, wall.y, occupants[1], map, player);
    do_entity(occupants[1], occupants, map, player);

    // Clean up traps and objects on bridge/wall squares
    const t1 = map.trapAt(x, y);
    const t2 = map.trapAt(wall.x, wall.y);
    if (t1) { const idx = map.traps.indexOf(t1); if (idx >= 0) map.traps.splice(idx, 1); }
    if (t2) { const idx = map.traps.indexOf(t2); if (idx >= 0) map.traps.splice(idx, 1); }

    newsym(x, y);
    newsym(wall.x, wall.y);
    block_point(wall.x, wall.y);
    nokiller(occupants);
}

// cf. dbridge.c:817 — open_drawbridge(x, y): open drawbridge
export function open_drawbridge(x, y, map, player) {
    const loc = map.at(x, y);
    if (!loc || loc.typ !== DRAWBRIDGE_UP) return;
    const wall = get_wall_for_db(x, y, map);
    const wallLoc = map.at(wall.x, wall.y);

    loc.typ = DRAWBRIDGE_DOWN;
    if (wallLoc) {
        wallLoc.typ = DOOR;
        wallLoc.flags = D_NODOOR;
    }

    // Entity handling (cf. dbridge.c:841-845)
    const occupants = [{}, {}];
    set_entity(x, y, occupants[0], map, player);
    set_entity(wall.x, wall.y, occupants[1], map, player);
    do_entity(occupants[0], occupants, map, player);
    set_entity(wall.x, wall.y, occupants[1], map, player);
    do_entity(occupants[1], occupants, map, player);

    // Clean up traps
    const t1 = map.trapAt(x, y);
    const t2 = map.trapAt(wall.x, wall.y);
    if (t1) { const idx = map.traps.indexOf(t1); if (idx >= 0) map.traps.splice(idx, 1); }
    if (t2) { const idx = map.traps.indexOf(t2); if (idx >= 0) map.traps.splice(idx, 1); }

    newsym(x, y);
    newsym(wall.x, wall.y);
    unblock_point(wall.x, wall.y);
    nokiller(occupants);
}

// cf. dbridge.c:865 — destroy_drawbridge(x, y): demolish drawbridge
// RNG: rn2(6) for debris count, rn2(2) for debris x/y placement
export function destroy_drawbridge(x, y, map, player) {
    const loc = map.at(x, y);
    if (!loc || !IS_DRAWBRIDGE(loc.typ)) return;
    const wall = get_wall_for_db(x, y, map);
    const wallLoc = map.at(wall.x, wall.y);

    if ((loc.drawbridgemask & DB_UNDER) === DB_MOAT
        || (loc.drawbridgemask & DB_UNDER) === DB_LAVA) {
        const lava = (loc.drawbridgemask & DB_UNDER) === DB_LAVA;
        loc.typ = lava ? LAVAPOOL : MOAT;
    } else {
        loc.typ = ((loc.drawbridgemask & DB_ICE) ? ICE : ROOM);
    }
    loc.drawbridgemask = 0;
    if (wallLoc) {
        wallLoc.typ = DOOR;
        wallLoc.flags = D_NODOOR;
    }

    // Clean up traps
    const t1 = map.trapAt(x, y);
    const t2 = map.trapAt(wall.x, wall.y);
    if (t1) { const idx = map.traps.indexOf(t1); if (idx >= 0) map.traps.splice(idx, 1); }
    if (t2) { const idx = map.traps.indexOf(t2); if (idx >= 0) map.traps.splice(idx, 1); }

    // cf. dbridge.c:927 — scatter debris (RNG consuming)
    for (let i = rn2(6); i > 0; --i) {
        // Consume RNG for debris placement matching C
        rn2(2); // x choice
        rn2(2); // y choice
        // scatter() would consume more RNG but we skip the physical object creation
    }

    newsym(x, y);
    if (wallLoc) {
        newsym(wall.x, wall.y);
        unblock_point(wall.x, wall.y);
    }

    // Entity handling (cf. dbridge.c:945-993)
    const occupants = [{}, {}];
    set_entity(wall.x, wall.y, occupants[1], map, player);
    if (occupants[1].edata) {
        if (!automiss(occupants[1])) {
            e_died(occupants[1], 0x03, 0 /* CRUSHING */, map);
        }
    }
    set_entity(x, y, occupants[0], map, player);
    if (occupants[0].edata) {
        if (e_missed(occupants[0], true, map)) {
            // Spared — but may fall into liquid
        } else {
            e_died(occupants[0], 0x03, 0 /* CRUSHING */, map);
            if (map.at(occupants[0].ex, occupants[0].ey) &&
                map.at(occupants[0].ex, occupants[0].ey).typ === MOAT) {
                do_entity(occupants[0], occupants, map, player);
            }
        }
    }
    nokiller(occupants);
}
