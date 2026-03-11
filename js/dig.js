// dig.js -- Digging mechanics: pick-axe, wand of digging, burial
// cf. dig.c — mkcavepos, mkcavearea, pick_can_reach, dig_typ, is_digging,
//             dig_check, digcheck_fail_message, dig, furniture_handled,
//             holetime, digactualhole, liquid_flow, dighole, dig_up_grave,
//             use_pick_axe, use_pick_axe2, watchman_canseeu, watch_dig,
//             mdig_tunnel, draft_message, zap_dig, adj_pit_checks,
//             pit_flow, buried_ball, buried_ball_to_punishment,
//             buried_ball_to_freedom, bury_an_obj, bury_objs, unearth_objs,
//             rot_organic, rot_corpse, bury_monst, bury_you, unearth_you,
//             escape_tomb, wiz_debug_cmd_bury
//
// dig.c handles all digging-related gameplay:
//   use_pick_axe(): initiate digging occupation.
//   dig(): occupation callback that gradually digs through terrain.
//   dighole/digactualhole: create holes, pits, and trapdoors.
//   mdig_tunnel(): monster digging through walls.
//   zap_dig(): wand-of-digging effects.
//   bury_*/unearth_*: object/player burial mechanics.
//   rot_organic/rot_corpse: timed decomposition of buried items.

import {
    COLNO, ROWNO, isok,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, DBWALL,
    TREE, SDOOR, SCORR, POOL, MOAT, WATER,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, LAVAPOOL, LAVAWALL, IRONBARS,
    DOOR, CORR, ROOM, STAIRS, LADDER, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR,
    ICE, AIR,
    D_NODOOR, D_BROKEN, D_CLOSED, D_LOCKED, D_TRAPPED,
    IS_WALL, IS_STWALL, IS_ROCK, IS_DOOR, IS_ROOM,
    IS_OBSTRUCTED, IS_DRAWBRIDGE, IS_POOL, IS_LAVA,
    IS_FURNITURE, ACCESSIBLE,
    DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_DIR,
    DB_MOAT, DB_LAVA, DB_ICE, DB_UNDER,
    W_NONDIGGABLE,
    BEAR_TRAP, LANDMINE, HOLE, TRAPDOOR, PIT, SPIKED_PIT,
    SHOPBASE,
    DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER, DIGTYP_DOOR, DIGTYP_TREE,
    DIGCHECK_PASSED, DIGCHECK_PASSED_PITONLY, DIGCHECK_PASSED_DESTROY_TRAP, DIGCHECK_FAILED,
    DIGCHECK_FAIL_ONLADDER, DIGCHECK_FAIL_ONSTAIRS, DIGCHECK_FAIL_THRONE, DIGCHECK_FAIL_ALTAR,
    DIGCHECK_FAIL_AIRLEVEL, DIGCHECK_FAIL_WATERLEVEL, DIGCHECK_FAIL_TOOHARD,
    DIGCHECK_FAIL_UNDESTROYABLETRAP, DIGCHECK_FAIL_CANTDIG, DIGCHECK_FAIL_BOULDER,
    DIGCHECK_FAIL_OBJ_POOL_OR_TRAP,
    DIR_ERR, N_DIRS, DIR_180, xdir, ydir,
} from './const.js';
import { IS_TREE, IS_FOUNTAIN, IS_SINK, IS_GRAVE, IS_ALTAR, IS_THRONE, KILLED_BY_AN,
         OBJ_FLOOR, OBJ_INVENT, OBJ_MINVENT, OBJ_MIGRATING } from './const.js';
import { rn2, rnd, rn1, rnl } from './rng.js';
import { unblock_point, recalc_block_point } from './vision.js';
import { newsym } from './display.js';
import { cansee } from './vision.js';
import { mb_trapped, closed_door } from './monmove.js';
import { canseemon, is_whirly, digests, unique_corpstat, is_flyer, is_floater } from './mondata.js';
import { mksobj } from './mkobj.js';
import { placeFloorObject, sobj_at } from './invent.js';
import { makemon, mkclass } from './makemon.js';
import {
    BOULDER, ROCK, STATUE, HEAVY_IRON_BALL, CORPSE,
    APPLE, ORANGE, PEAR, BANANA, EUCALYPTUS_LEAF,
    PICK_AXE, DWARVISH_MATTOCK, AXE, BATTLE_AXE, WEAPON_CLASS,
} from './objects.js';
import { S_ZOMBIE, S_MUMMY } from './monsters.js';
import { PM_EARTH_ELEMENTAL, PM_XORN } from './monsters.js';
import {
    is_pool, is_lava, is_pool_or_lava, is_moat, is_ice,
    is_drawbridge_wall, find_drawbridge, destroy_drawbridge,
} from './dbridge.js';
import { deltrap, Can_dig_down } from './dungeon.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_BEAM, DISP_END } from './const.js';
import { TT_NONE, TT_PIT, TT_WEB, TT_BURIEDBALL } from './const.js';
import { game as _gstate } from './gstate.js';
import { wake_nearby } from './mon.js';
import { add_damage, pay_for_damage } from './shk.js';
import { t_at, conjoined_pits } from './trap.js';
import { On_ladder, On_stairs } from './stairs.js';
import { s_suffix } from './hacklib.js';
import { in_rooms, may_dig, losehp, Maybe_Half_Phys } from './hack.js';
import { cvt_sdoor_to_door } from './detect.js';
import { expels } from './mhitu.js';
import { hard_helmet } from './do_wear.js';
import { You_hear } from './pline.js';
import { abon } from './weapon.js';
import { acurr } from './attrib.js';
import { A_STR, A_DEX, AM_SANCTUM, MM_NOMSG } from './const.js';
import { bimanual } from './pray.js';

// ============================================================================
// Constants (cf. dig.c:19-27)
// ============================================================================


// ============================================================================
// Helper functions (inline equivalents of C utility functions)
// ============================================================================



// C ref: may_dig(x, y) — canonical in hack.js (from hack.c); re-exported for dig consumers
export { may_dig };

// C ref: *in_rooms(x, y, SHOPBASE) — is (x,y) inside a shop?
function in_rooms_shopbase(x, y, map) {
    return in_rooms(x, y, SHOPBASE, map).length > 0;
}

// C ref: in_town(x, y) — is (x,y) in a town?
function in_town(x, y, map) {
    return !!(map.flags && map.flags.has_town);
}

// C ref: mksobj_at(map, otyp, x, y, init, artif)
// Create an object and place it on the floor.
function mksobj_at(map, otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    if (otmp) {
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
    }
    return otmp;
}

// C ref: rnd_treefruit_at(x, y) — random fruit from a tree
// cf. mkobj.c:1975-1984 — ROLL_FROM(treefruits) => treefruits[rn2(5)]
// RNG: rn2(5) for fruit selection, plus mksobj_at internals
const treefruits = [APPLE, ORANGE, PEAR, BANANA, EUCALYPTUS_LEAF];
function rnd_treefruit_at(map, x, y) {
    const otyp = treefruits[rn2(treefruits.length)];
    return mksobj_at(map, otyp, x, y, true, false);
}

// ============================================================================
// dig_typ (cf. dig.c:168-192)
// ============================================================================

// cf. dig.c:168 — dig_typ(otmp, x, y): what can be dug at location
// When digging into location <x,y>, what are you actually digging into?
// Pure predicate — no RNG consumption.
export function dig_typ(otmp, x, y, map) {
    if (!isok(x, y) || !otmp) return DIGTYP_UNDIGGABLE;

    // C: is_pick(otmp) / is_axe(otmp)
    const isPick = otmp.otyp === PICK_AXE || otmp.otyp === DWARVISH_MATTOCK;
    const isAxe = !!(otmp.oclass === WEAPON_CLASS &&
        (otmp.otyp === AXE || otmp.otyp === BATTLE_AXE));
    // More robust: check by name or by object properties
    // For now, treat the tool as a pick if it has the 'pick' property
    // Fallback: if neither pick nor axe, undiggable
    if (!isPick && !isAxe) return DIGTYP_UNDIGGABLE;

    const loc = map.at(x, y);
    if (!loc) return DIGTYP_UNDIGGABLE;
    const ltyp = loc.typ;

    if (isAxe) {
        return closed_door(x, y, map) ? DIGTYP_DOOR
            : IS_TREE(ltyp) ? DIGTYP_TREE
            : DIGTYP_UNDIGGABLE;
    }

    // assert(isPick)
    if (sobj_at(STATUE, x, y, map)) return DIGTYP_STATUE;
    if (sobj_at(BOULDER, x, y, map)) return DIGTYP_BOULDER;
    if (closed_door(x, y, map)) return DIGTYP_DOOR;
    if (IS_TREE(ltyp)) return DIGTYP_UNDIGGABLE; // pick vs tree
    if (IS_OBSTRUCTED(ltyp)
        && (!(map.flags && map.flags.arboreal) || IS_WALL(ltyp))) {
        return DIGTYP_ROCK;
    }
    return DIGTYP_UNDIGGABLE;
}


// ============================================================================
// mdig_tunnel (cf. dig.c:1413-1497)
// Return TRUE if monster died, FALSE otherwise. Called from m_move().
// ============================================================================

// cf. dig.c:1413 — mdig_tunnel(mtmp)
// Monster digs a tunnel through terrain.
// RNG: rnd(12) always consumed at entry.
// Additional RNG: rn2(3) for draft, rn2(5) for wall sound.
export async function mdig_tunnel(mtmp, map, player) {
    const here = map.at(mtmp.mx, mtmp.my);
    if (!here) return false;

    const pile = rnd(12); // C: int pile = rnd(12);
    // C: cvt_sdoor_to_door — normalize secret door flags before digging branch.
    if (here.typ === SDOOR) cvt_sdoor_to_door(here, map);

    // Eats away door if present & closed or locked
    if (closed_door(mtmp.mx, mtmp.my, map)) {
        // C: if (*in_rooms(mtmp->mx, mtmp->my, SHOPBASE)) add_damage(...)
        // Shop damage tracking not yet wired

        const sawit = canseemon(mtmp, player);
        const trapped = !!(here.flags & D_TRAPPED);
        here.flags = trapped ? D_NODOOR : D_BROKEN;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);

        if (trapped) {
            const seeit = canseemon(mtmp, player);
            if (mb_trapped(mtmp, map, player)) { // mtmp is killed
                newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else {
            // C: if (flags.verbose) { if (!Unaware && !rn2(3)) draft_message(TRUE); }
            if (_gstate?.flags?.verbose && !(player?.Unaware || player?.unaware)) {
                if (!rn2(3)) {
                    await draft_message(true, player);
                }
            }
        }
        return false;
    } else if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        unblock_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false, player);
        return false;
    } else if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) {
        // No dig — nothing to tunnel through
        return false;
    }

    // Only rock, trees, and walls fall through to this point.
    const hereWallInfo = Number(here.wall_info ?? here.flags ?? 0);
    if (hereWallInfo & W_NONDIGGABLE) {
        // C: impossible("mdig_tunnel: ... is undiggable")
        return false; // still alive
    }

    if (IS_WALL(here.typ)) {
        // C: if (flags.verbose && !rn2(5)) You_hear("crashing rock.");
        if (!rn2(5)) {
            await You_hear('crashing rock.');
        }
        // C: if (*in_rooms(..., SHOPBASE)) add_damage(...)
        // Shop damage not yet wired

        if (map.flags.is_maze_lev) {
            here.typ = ROOM;
            here.flags = 0;
        } else if (map.flags.is_cavernous_lev && !in_town(mtmp.mx, mtmp.my, map)) {
            here.typ = CORR;
            here.flags = 0;
        } else {
            here.typ = DOOR;
            here.flags = D_NODOOR;
        }
    } else if (IS_TREE(here.typ)) {
        here.typ = ROOM;
        here.flags = 0;
        if (pile && pile < 5) {
            rnd_treefruit_at(map, mtmp.mx, mtmp.my);
        }
    } else {
        // Stone/SCORR — create corridor, maybe drop rock/boulder
        here.typ = CORR;
        here.flags = 0;
        if (pile && pile < 5) {
            mksobj_at(map, (pile === 1) ? BOULDER : ROCK,
                      mtmp.mx, mtmp.my, true, false);
        }
    }

    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my, map)) {
        unblock_point(mtmp.mx, mtmp.my); // vision
    }

    return false;
}


// ============================================================================
// fillholetyp (cf. dig.c:606-637)
// Return typ of liquid to fill a hole with, or ROOM if no liquid nearby.
// RNG: consumes rn2() calls for each liquid type present.
// ============================================================================

export function fillholetyp(x, y, fill_if_any, map) {
    const lo_x = Math.max(1, x - 1);
    const hi_x = Math.min(x + 1, COLNO - 1);
    const lo_y = Math.max(0, y - 1);
    const hi_y = Math.min(y + 1, ROWNO - 1);
    let pool_cnt = 0, moat_cnt = 0, lava_cnt = 0;

    for (let x1 = lo_x; x1 <= hi_x; x1++) {
        for (let y1 = lo_y; y1 <= hi_y; y1++) {
            if (is_moat(x1, y1, map))
                moat_cnt++;
            else if (is_pool(x1, y1, map))
                pool_cnt++;
            else if (is_lava(x1, y1, map))
                lava_cnt++;
        }
    }

    if (!fill_if_any)
        pool_cnt = Math.floor(pool_cnt / 3);

    if ((lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        || (lava_cnt && fill_if_any))
        return LAVAPOOL;
    else if ((moat_cnt > 0 && rn2(moat_cnt + 1)) || (moat_cnt && fill_if_any))
        return MOAT;
    else if ((pool_cnt > 0 && rn2(pool_cnt + 1)) || (pool_cnt && fill_if_any))
        return POOL;
    else
        return ROOM;
}


// ============================================================================
// furniture_handled (cf. dig.c:570-592)
// Processes terrain furniture destruction when digging.
// ============================================================================
export function furniture_handled(x, y, madeby_u, map) {
    const lev = map.at(x, y);
    if (!lev) return false;

    if (IS_FOUNTAIN(lev.typ)) {
        // C: dogushforth(FALSE); SET_FOUNTAIN_WARNED; dryup(x,y,madeby_u);
        // Fountain effects not yet wired
        lev.typ = ROOM;
        lev.flags = 0;
        newsym(x, y);
    } else if (IS_SINK(lev.typ)) {
        // C: breaksink(x, y);
        lev.typ = ROOM;
        lev.flags = 0;
        newsym(x, y);
    } else if (lev.typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(x, y, map) >= 0)) {
        let bx = x, by = y;
        const result = find_drawbridge(bx, by, map);
        bx = result.x;
        by = result.y;
        destroy_drawbridge(bx, by, map);
    } else {
        return false;
    }
    return true;
}


// ============================================================================
// digactualhole (cf. dig.c:639-829)
// Creates a pit or hole trap at given location.
// ============================================================================

export function digactualhole(x, y, madeby, ttyp, map, player) {
    const madeby_u = (madeby === 'BY_YOU');
    const madeby_obj = (madeby === 'BY_OBJECT');
    const heros_fault = (madeby_u || madeby_obj);
    const lev = map.at(x, y);
    if (!lev) return;

    // C: furniture_handled
    if (furniture_handled(x, y, madeby_u, map))
        return;

    // C: maketrap(x, y, ttyp)
    // Simplified trap creation — add trap to map
    const ttmp = {
        ttyp: ttyp,
        tx: x,
        ty: y,
        tseen: false,
        madeby_u: heros_fault,
        conjoined: 0,
        launched: 0,
    };
    // Remove any existing trap at this location
    const existingIdx = map.traps.findIndex(t => t.tx === x && t.ty === y);
    if (existingIdx >= 0) map.traps.splice(existingIdx, 1);
    map.traps.push(ttmp);

    newsym(x, y);

    // C: PIT handling — if at_u and !wont_fall, set_utrap
    if (ttyp === PIT || ttyp === SPIKED_PIT) {
        // Pit effects (trapping, falling) handled by caller/traphandler
        // C: rn1(4, 2) for utrap duration — consumed if player falls in
        // We don't consume this here; it's part of set_utrap which is UI-side
    }
    // HOLE/TRAPDOOR: falling through handled by caller
}


// ============================================================================
// liquid_flow (cf. dig.c:837-879)
// Handle liquid flooding when a pit is created near water/lava.
// ============================================================================

export function liquid_flow(x, y, typ, ttmp, fillmsg, map) {
    // C: caller should have changed levl[x][y].typ to POOL, MOAT, or LAVA
    if (!is_pool_or_lava(x, y, map)) return;

    if (ttmp) {
        deltrap(map, ttmp);
    }
    // C: unearth_objs(x, y) — unearthing not yet wired
    // C: obj_ice_effects(x, y, TRUE) — not yet wired
    // C: fillmsg display — message only
    newsym(x, y);
}


// ============================================================================
// dighole (cf. dig.c:884-1024)
// Main hole-creation function; creates hole, pit, or trapdoor.
// Returns TRUE if digging succeeded, FALSE otherwise.
// ============================================================================

export function dighole(pit_only, by_magic, cc, map, player) {
    let dig_x, dig_y;
    if (!cc) {
        dig_x = player.x;
        dig_y = player.y;
    } else {
        dig_x = cc.x;
        dig_y = cc.y;
        if (!isok(dig_x, dig_y)) return false;
    }

    const ttmp = map.trapAt ? map.trapAt(dig_x, dig_y) : null;
    const lev = map.at(dig_x, dig_y);
    if (!lev) return false;
    const old_typ = lev.typ;
    let retval = false;

    // C ref: nohole = !Can_dig_down(&u.uz) && !levl[dig_x][dig_y].candig
    const nohole = !Can_dig_down(map) && !lev.candig;

    if (is_pool_or_lava(dig_x, dig_y, map)) {
        // C: "The water/lava sloshes furiously..."
        // Message only, no RNG
        return false;

    } else if (old_typ === DRAWBRIDGE_DOWN
               || (is_drawbridge_wall(dig_x, dig_y, map) >= 0)) {
        if (pit_only) {
            // "The drawbridge seems too hard to dig through."
        } else {
            const result = find_drawbridge(dig_x, dig_y, map);
            destroy_drawbridge(result.x, result.y, map);
            retval = true;
        }

    } else if (sobj_at(BOULDER, dig_x, dig_y, map)) {
        if (ttmp && (ttmp.ttyp === PIT || ttmp.ttyp === SPIKED_PIT)
            && rn2(2)) {
            // "The boulder settles into the pit."
            ttmp.ttyp = PIT; // crush spikes
        } else {
            // "KADOOM! The boulder falls in!"
            if (ttmp) deltrap(map, ttmp);
        }
        // C: delobj(boulder_here) — remove boulder
        const boulder = sobj_at(BOULDER, dig_x, dig_y, map);
        if (boulder) {
            const idx = map.objects.indexOf(boulder);
            if (idx >= 0) map.objects.splice(idx, 1);
        }

    } else if (IS_GRAVE(old_typ)) {
        digactualhole(dig_x, dig_y, 'BY_YOU', PIT, map, player);
        dig_up_grave(cc, map, player);
        retval = true;

    } else if (old_typ === DRAWBRIDGE_UP) {
        const typ = fillholetyp(dig_x, dig_y, false, map);
        if (typ === ROOM) {
            // "The surface here is too hard to dig in."
        } else {
            lev.drawbridgemask &= ~DB_UNDER;
            lev.drawbridgemask |= (typ === LAVAPOOL) ? DB_LAVA : DB_MOAT;
            liquid_flow(dig_x, dig_y, typ, ttmp,
                        "As you dig, the hole fills with %s!", map);
            retval = true;
        }

    } else if (IS_THRONE(old_typ)) {
        // "The throne is too hard to break apart."

    } else if (IS_ALTAR(old_typ)) {
        // "The altar is too hard to break apart."

    } else {
        const typ = fillholetyp(dig_x, dig_y, false, map);
        lev.flags = 0;

        if (typ !== ROOM) {
            if (!furniture_handled(dig_x, dig_y, true, map)) {
                lev.typ = typ;
                liquid_flow(dig_x, dig_y, typ, ttmp,
                            "As you dig, the hole fills with %s!", map);
            }
            retval = true;
        } else {
            // C: magical digging disarms settable traps
            if (by_magic && ttmp
                && (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP)) {
                // C: cnv_trap_obj — not yet wired
                deltrap(map, ttmp);
            }

            // Finally make a hole
            if (nohole || pit_only) {
                digactualhole(dig_x, dig_y, 'BY_YOU', PIT, map, player);
            } else {
                digactualhole(dig_x, dig_y, 'BY_YOU', HOLE, map, player);
            }
            retval = true;
        }
    }

    newsym(dig_x, dig_y);
    return retval;
}


// ============================================================================
// dig_up_grave (cf. dig.c:1026-1089)
// Digs up a grave and unearths objects/monsters.
// RNG: rn2(5) for what_happens (corpse, zombie, mummy, or empty).
//      mkclass() calls also consume RNG.
// ============================================================================

export function dig_up_grave(cc, map, player) {
    let dig_x, dig_y;
    if (!cc) {
        dig_x = player.x;
        dig_y = player.y;
    } else {
        dig_x = cc.x;
        dig_y = cc.y;
        if (!isok(dig_x, dig_y)) return;
    }

    const lev = map.at(dig_x, dig_y);
    if (!lev) return;

    // C: exercise(A_WIS, FALSE) — wisdom exercise
    // C: alignment adjustments for Archeologist, Samurai, Lawful
    // These are player-state effects, stubbed for now

    // C: what_happens = levl[dig_x][dig_y].emptygrave ? -1 : rn2(5)
    // JS: we don't track emptygrave flag yet, so always rn2(5)
    const what_happens = rn2(5);

    switch (what_happens) {
    case 0:
    case 1:
        // "You unearth a corpse."
        // C: mk_tt_object(CORPSE, dig_x, dig_y) — creates tombstone corpse
        // Object creation not fully wired
        break;
    case 2:
        // "The grave's owner is very upset!" — zombie
        // C: makemon(mkclass(S_ZOMBIE, 0), dig_x, dig_y, MM_NOMSG)
        {
            const zmndx = mkclass(S_ZOMBIE, 0);
            if (zmndx >= 0) {
                makemon(zmndx, dig_x, dig_y, MM_NOMSG, undefined, map);
            }
        }
        break;
    case 3:
        // "You've disturbed a tomb!" — mummy
        // C: makemon(mkclass(S_MUMMY, 0), dig_x, dig_y, MM_NOMSG)
        {
            const mmndx = mkclass(S_MUMMY, 0);
            if (mmndx >= 0) {
                makemon(mmndx, dig_x, dig_y, MM_NOMSG, undefined, map);
            }
        }
        break;
    default:
        // "The grave is unoccupied. Strange..."
        break;
    }

    lev.typ = ROOM;
    lev.flags = 0;
    lev.horizontal = false; // C: levl[dig_x][dig_y].disturbed = 0 (alias for horizontal)
    // C: del_engr_at(dig_x, dig_y) — remove engravings
    newsym(dig_x, dig_y);
}


// ============================================================================
// draft_message (cf. dig.c:1503-1543)
// Display message about draft from digging activities.
// RNG: when !unexpected && hallucinating: rn1(2, ...) + possibly rn1(3, ...)
// Since hallucination detection requires player state, this is a light stub.
// ============================================================================

export async function draft_message(unexpected, player = null) {
    // C ref: dig.c draft_message(): includes Hallucination branches which
    // consume RNG. Preserve those RNG calls for parity.
    const display = _gstate?.display || null;
    const Hallucination = !!(player?.Hallucination || player?.hallucinating);
    if (!display || typeof display.putstr_message !== 'function') return;

    if (unexpected) {
        if (!Hallucination) {
            await display.putstr_message('You feel an unexpected draft.');
        } else {
            const weakAttr = (player?.acurrstr ?? 10) < 6
                || (player?.acurrdex ?? 10) < 6
                || (player?.acurrcon ?? 10) < 6
                || (player?.acurrcha ?? 10) < 6
                || (player?.acurrint ?? 10) < 6
                || (player?.acurrwis ?? 10) < 6;
            await display.putstr_message(`You feel like you are ${weakAttr ? '4-F' : '1-A'}.`);
        }
        return;
    }

    if (!Hallucination) {
        await display.putstr_message('You feel a draft.');
        return;
    }

    const draft_reaction = ['enlisting', 'marching', 'protesting', 'fleeing'];
    const alignType = player?.alignment ?? 0;
    const alignSign = alignType > 0 ? 1 : alignType < 0 ? -1 : 0;
    let dridx = rn1(2, 1 - alignSign);
    if ((player?.alignmentRecord ?? 0) < 4) {
        dridx += rn1(3, alignSign - 1);
    }
    if (dridx < 0) dridx = 0;
    if (dridx >= draft_reaction.length) dridx = draft_reaction.length - 1;
    await display.putstr_message(`You feel like ${draft_reaction[dridx]}.`);
}


// ============================================================================
// watch_dig (cf. dig.c:1376-1410)
// Town watchmen frown on damage to town walls, trees, or fountains.
// ============================================================================

export function watch_dig(mtmp, x, y, zap, map) {
    const lev = map?.at?.(x, y);
    const player = _gstate?.player || null;
    if (!lev || !player) return;
    const inTown = in_town(x, y, map);
    const watchedSurface = closed_door(x, y, map) || lev.typ === SDOOR
        || IS_WALL(lev.typ) || IS_FOUNTAIN(lev.typ) || IS_TREE(lev.typ);
    if (!inTown || !watchedSurface) return;

    let mon = mtmp || null;
    if (!mon && Array.isArray(map.monsters)) {
        mon = map.monsters.find((cand) => watchman_canseeu(cand)) || null;
    }
    if (!mon) return;

    const playerCtx = (player.context = player.context || {});
    const diggingCtx = (playerCtx.digging = playerCtx.digging || {
        down: false,
        chew: false,
        warned: false,
        pos: { x: 0, y: 0 },
        effort: 0,
        level: { dnum: 0, dlevel: -1 },
    });
    const warned = !!diggingCtx?.warned;
    if (zap || warned) {
        _gstate?.display?.putstr_message?.("Halt, vandal!  You're under arrest!");
    } else {
        let str = 'fountain';
        if (IS_DOOR(lev.typ)) str = 'door';
        else if (IS_TREE(lev.typ)) str = 'tree';
        else if (IS_OBSTRUCTED(lev.typ)) str = 'wall';
        _gstate?.display?.putstr_message?.(`Hey, stop damaging that ${str}!`);
        diggingCtx.warned = true;
    }

    if (_gstate?.occupation) {
        _gstate.occupation = null;
    }
    if (is_digging(player)) {
        player.occupation = null;
    }
}


// ============================================================================
// zap_dig (cf. dig.c:1547-1754)
// Wand of digging effect — digging via wand zap or spell cast.
// RNG: rn1(18, 8) for digdepth; rnd(2) or rnd(6) for head damage;
//      various rn2() calls in the loop.
// ============================================================================

export async function zap_dig(map, player) {
    if (!map || !player) return;

    const u = player;

    // C: if (u.uswallow) { ... } — swallowed handling
    if (u.uswallow) {
        const mtmp = u.ustuck || null;
        if (mtmp && !is_whirly(mtmp.data || mtmp.type || {})) {
            if (digests(mtmp.data || mtmp.type || {})) {
                _gstate?.display?.putstr_message?.('You pierce its stomach wall!');
            }
            if (unique_corpstat(mtmp.data || mtmp.type || {})) {
                mtmp.mhp = Math.floor(((mtmp.mhp || 0) + 1) / 2);
            } else {
                mtmp.mhp = 1;
            }
            await expels(mtmp, mtmp.data || mtmp.type || {}, !digests(mtmp.data || mtmp.type || {}), u, _gstate?.display || null);
        }
        return;
    }

    // C: if (u.dz) { ... } — up/down digging
    if (u.dz) {
        const isAir = !!map?.flags?.is_airlevel;
        const isWater = !!map?.flags?.is_waterlevel;
        const underwater = !!(u.Underwater || u.underwater || u.uinwater);
        if (!isAir && !isWater && !underwater) {
            const hereTyp = map.at(u.x, u.y)?.typ;
            const onStairs = (hereTyp === STAIRS || hereTyp === LADDER);
            if (u.dz < 0 || onStairs) {
                if (onStairs) {
                    _gstate?.display?.putstr_message?.(
                        `The beam bounces off the ${hereTyp === LADDER ? 'ladder' : 'stairs'} and hits the ceiling.`
                    );
                }
                _gstate?.display?.putstr_message?.('You loosen a rock from the ceiling.');
                _gstate?.display?.putstr_message?.('It falls on your head!');
                const helmet = u.helmet || null;
                await losehp(Maybe_Half_Phys(rnd(hard_helmet(helmet) ? 2 : 6), u),
                    "falling rock", KILLED_BY_AN, u, _gstate?.display, _gstate);
                mksobj_at(map, ROCK, u.x, u.y, false, false);
                newsym(u.x, u.y);
            } else {
                watch_dig(null, u.x, u.y, true, map);
                dighole(false, true, null, map, player);
            }
        }
        return;
    }

    // Normal case: digging across the level
    const maze_dig = !!(map.flags && map.flags.is_maze_lev && !map.flags.is_earthlevel);
    let zx = u.x + (u.dx || 0);
    let zy = u.y + (u.dy || 0);
    let shopdoor = false, shopwall = false;
    let trap_with_u = null;
    let diridx = 8;
    let pitdig = false;
    let pitflow = false;
    let flow_x = -1, flow_y = -1;

    if (u.utrap && u.utraptype === TT_PIT) {
        trap_with_u = t_at(u.x, u.y, map);
        if (trap_with_u) {
            pitdig = true;
            diridx = (() => {
                const dx = u.dx || 0;
                const dy = u.dy || 0;
                for (let i = 0; i < N_DIRS; i++) {
                    if (xdir[i] === dx && ydir[i] === dy) return i;
                }
                return DIR_ERR;
            })();
        }
    }

    let digdepth = rn1(18, 8); // C: digdepth = rn1(18, 8)

    // C: tmp_at(DISP_BEAM, ...), tmp_at(x,y), nh_delay_output(), tmp_at(DISP_END,0).
    tmp_at(DISP_BEAM, { ch: '*', color: 12 });
    try {
        while (--digdepth >= 0) {
            if (!isok(zx, zy)) break;
            const room = map.at(zx, zy);
            if (!room) break;

            tmp_at(zx, zy);
            await nh_delay_output();

            if (pitdig) {
                const adjpit = t_at(zx, zy, map);
                if (diridx !== DIR_ERR && !conjoined_pits(adjpit, trap_with_u, false, player)) {
                    digdepth = 0;
                    if (!(adjpit && (adjpit.ttyp === PIT || adjpit.ttyp === SPIKED_PIT))) {
                        const cc = { x: zx, y: zy };
                        if (await adj_pit_checks(cc, '', map)) {
                            dighole(true, true, cc, map, player);
                        }
                    }
                    const newAdjPit = t_at(zx, zy, map);
                    if (newAdjPit && (newAdjPit.ttyp === PIT || newAdjPit.ttyp === SPIKED_PIT)) {
                        const adjidx = DIR_180(diridx);
                        trap_with_u.conjoined |= (1 << diridx);
                        newAdjPit.conjoined |= (1 << adjidx);
                        flow_x = zx;
                        flow_y = zy;
                        pitflow = true;
                    }
                    if (is_pool(zx, zy, map) || is_lava(zx, zy, map)) {
                        flow_x = zx - (u.dx || 0);
                        flow_y = zy - (u.dy || 0);
                        pitflow = true;
                    }
                    break;
                }
            } else if (closed_door(zx, zy, map) || room.typ === SDOOR) {
                const wasSdoor = (room.typ === SDOOR);
                if (in_rooms_shopbase(zx, zy, map)) {
                    add_damage(zx, zy, 400, map, _gstate?.moves || 0);
                    shopdoor = true;
                }
                if (wasSdoor) {
                    cvt_sdoor_to_door(room, map);
                } else if (cansee(map, player, _gstate?.fov || null, zx, zy)) {
                    _gstate?.display?.putstr_message?.('The door is razed!');
                }
                watch_dig(null, zx, zy, true, map);
                room.flags = D_NODOOR;
                recalc_block_point(zx, zy);
                digdepth -= 2;
                if (maze_dig) break;
            } else if (maze_dig) {
                if (IS_WALL(room.typ)) {
                    const roomWallInfo = Number(room.wall_info ?? room.flags ?? 0);
                    if (!(roomWallInfo & W_NONDIGGABLE)) {
                        if (in_rooms_shopbase(zx, zy, map)) {
                            add_damage(zx, zy, 500, map, _gstate?.moves || 0);
                            shopwall = true;
                        }
                        room.typ = ROOM;
                        room.flags = 0;
                        unblock_point(zx, zy);
                    } else if (!(player?.Blind || player?.blind)) {
                        _gstate?.display?.putstr_message?.('The wall glows then fades.');
                    }
                    break;
                } else if (IS_TREE(room.typ)) {
                    const roomWallInfo = Number(room.wall_info ?? room.flags ?? 0);
                    if (!(roomWallInfo & W_NONDIGGABLE)) {
                        room.typ = ROOM;
                        room.flags = 0;
                        unblock_point(zx, zy);
                    } else if (!(player?.Blind || player?.blind)) {
                        _gstate?.display?.putstr_message?.('The tree shudders but is unharmed.');
                    }
                    break;
                } else if (room.typ === STONE || room.typ === SCORR) {
                    const roomWallInfo = Number(room.wall_info ?? room.flags ?? 0);
                    if (!(roomWallInfo & W_NONDIGGABLE)) {
                        room.typ = CORR;
                        room.flags = 0;
                        unblock_point(zx, zy);
                    } else if (!(player?.Blind || player?.blind)) {
                        _gstate?.display?.putstr_message?.('The rock glows then fades.');
                    }
                    break;
                }
            } else if (IS_OBSTRUCTED(room.typ)) {
                if (!may_dig(zx, zy, map)) break;

                if (IS_WALL(room.typ) || room.typ === SDOOR) {
                    if (in_rooms_shopbase(zx, zy, map)) {
                        add_damage(zx, zy, 500, map, _gstate?.moves || 0);
                        shopwall = true;
                    }
                    watch_dig(null, zx, zy, true, map);
                    if (map.flags && map.flags.is_cavernous_lev && !in_town(zx, zy, map)) {
                        room.typ = CORR;
                        room.flags = 0;
                    } else {
                        room.typ = DOOR;
                        room.flags = D_NODOOR;
                    }
                    digdepth -= 2;
                } else if (IS_TREE(room.typ)) {
                    room.typ = ROOM;
                    room.flags = 0;
                    digdepth -= 2;
                } else {
                    // IS_OBSTRUCTED but not wall/sdoor/tree — stone
                    room.typ = CORR;
                    room.flags = 0;
                    digdepth--;
                }
                unblock_point(zx, zy);
            }
            newsym(zx, zy);
            zx += (u.dx || 0);
            zy += (u.dy || 0);
        }
    } finally {
        tmp_at(DISP_END, 0);
    }

    if (pitflow && isok(flow_x, flow_y)) {
        const ttmp = t_at(flow_x, flow_y, map);
        if (ttmp && (ttmp.ttyp === PIT || ttmp.ttyp === SPIKED_PIT)) {
            const filltyp = fillholetyp(ttmp.tx, ttmp.ty, true, map);
            if (filltyp !== ROOM) pit_flow(ttmp, filltyp, map);
        }
    }

    if (shopdoor || shopwall) {
        pay_for_damage(shopdoor ? 'destroy' : 'dig into', false, map, player, _gstate?.moves || 0);
    }
}


// ============================================================================
// holeable_floor (utility predicate)
// cf. not a direct C function, but used in multiple places
// ============================================================================

export function holeable_floor(x, y, map) {
    const loc = map.at(x, y);
    if (!loc) return false;
    const typ = loc.typ;
    return IS_ROOM(typ) || typ === CORR || IS_FURNITURE(typ);
}


// ============================================================================
// use_pick_axe / use_axe — player pick-axe use
// cf. dig.c:1091 / dig.c:1161
// Light stubs — these are player-input-driven functions.
// ============================================================================

// cf. dig.c:1091-1156 — use_pick_axe(obj)
// Start digging occupation. In C, this prompts the user for a direction,
// then calls use_pick_axe2(). In JS, the direction is expected to have
// already been set on player.dx, player.dy, player.dz.
// RNG: none directly (direction is player input)
export function use_pick_axe(obj, map, player) {
    if (!obj || !player) return 0;

    const isPick = (obj.otyp === PICK_AXE || obj.otyp === DWARVISH_MATTOCK); // PICK_AXE, DWARVISH_MATTOCK
    const verb = isPick ? 'dig' : 'chop';

    // Check: wielded?
    if (player.weapon !== obj) {
        // Would need to wield first — not yet wired
        return 0;
    }

    // Check: entangled in web?
    if (player.utrap && player.utraptype === TT_WEB) { // TT_WEB
        // "Unfortunately, you can't dig while entangled in a web."
        return 0;
    }

    // Direction should already be set on player; call use_pick_axe2
    return use_pick_axe2(obj, map, player);
}

// cf. dig.c:1161-1359 — use_pick_axe2(obj)
// Uses existing player.dx, player.dy, player.dz to begin digging.
// RNG: rnd(2) for self-hit damage, rn2(3) for axe-boulder vibrate,
//      d(2,2) for web entangle
export function use_pick_axe2(obj, map, player) {
    if (!obj || !player) return 1;

    const isPick = (obj.otyp === PICK_AXE || obj.otyp === DWARVISH_MATTOCK);
    const verbing = isPick ? 'digging' : 'chopping';
    const dx = player.dx || 0;
    const dy = player.dy || 0;
    const dz = player.dz || 0;

    if (player.uswallow) {
        // do_attack(u.ustuck) — attack from inside
        return 1;
    }

    if (player.underwater) {
        // "Turbulence torpedoes your digging attempts."
        return 1;
    }

    if (dz < 0) {
        // Can't dig up with pick
        // "You don't have enough leverage." or "You can't reach the ceiling."
        return 1;
    }

    if (!dx && !dy && !dz) {
        // Hit self
        const dam = Math.max(1, rnd(2) + (player.dbon || 0) + (obj.spe || 0));
        // losehp(dam, "own pick-axe/mattock", KILLED_BY)
        return 1;
    }

    if (dz === 0) {
        // Horizontal digging
        // confdir handling would go here
        const rx = player.x + dx;
        const ry = player.y + dy;
        if (!isok(rx, ry)) {
            // "Clash!"
            return 1;
        }

        const lev = map.at(rx, ry);
        if (!lev) return 1;

        // Check for monster at target
        // if (MON_AT(rx, ry) && do_attack(m_at(rx, ry))) return 1;

        const dig_target = dig_typ(obj, rx, ry, map);
        if (dig_target === DIGTYP_UNDIGGABLE) {
            // Various special cases: web, iron bars, water wall, etc.
            const trap = map.trapAt ? map.trapAt(rx, ry) : null;
            if (lev.typ === IRONBARS) {
                // "Clang!"
            } else if (IS_TREE(lev.typ)) {
                // "You need an axe to cut down a tree."
            } else if (IS_OBSTRUCTED(lev.typ)) {
                // "You need a pick to dig rock."
            } else if (sobj_at(BOULDER, rx, ry, map)
                       || sobj_at(STATUE, rx, ry, map)) {
                if (!isPick) {
                    const vibrate = !rn2(3);
                    // "Sparks fly as you whack the boulder/statue."
                    // if (vibrate) losehp(2, "axing a hard object", KILLED_BY)
                }
            }
            // Other cases: pit clearing, thin air swing, etc.
        } else {
            // Start or continue digging occupation
            const ctx = player.context = player.context || {};
            ctx.digging = ctx.digging || {};

            if (ctx.digging.pos === undefined
                || ctx.digging.pos.x !== rx
                || ctx.digging.pos.y !== ry
                || ctx.digging.down) {
                // New dig target
                ctx.digging.down = false;
                ctx.digging.chew = false;
                ctx.digging.warned = false;
                ctx.digging.pos = { x: rx, y: ry };
                ctx.digging.effort = 0;
                // "You start digging/chopping."
            } else {
                // "You continue digging/chopping."
                ctx.digging.chew = false;
            }
            // set_occupation(dig, verbing, 0) — set dig as occupation
            player.occupation = dig;
            player.occupation_verb = verbing;
        }
    } else {
        // Digging down (dz > 0)
        // Various checks: air level, water level, can reach floor, pool/lava, etc.
        if (is_pool_or_lava(player.x, player.y, map)) {
            // "You cannot stay underwater/under lava long enough."
            return 1;
        }

        if (!isPick) {
            // Axe can only dig down onto traps
            const trap = map.trapAt ? map.trapAt(player.x, player.y) : null;
            if (!trap || (trap.ttyp !== LANDMINE && trap.ttyp !== BEAR_TRAP)) {
                // "The axe merely scratches the surface."
                return 1;
            }
        }

        const ctx = player.context = player.context || {};
        ctx.digging = ctx.digging || {};

        if (ctx.digging.pos === undefined
            || ctx.digging.pos.x !== player.x
            || ctx.digging.pos.y !== player.y
            || !ctx.digging.down) {
            ctx.digging.chew = false;
            ctx.digging.down = true;
            ctx.digging.warned = false;
            ctx.digging.pos = { x: player.x, y: player.y };
            ctx.digging.effort = 0;
            // "You start digging downward."
        } else {
            // "You continue digging downward."
        }
        player.occupation = dig;
        player.occupation_verb = verbing;
    }
    return 1; // ECMD_TIME
}


// ============================================================================
// dig — core digging occupation callback
// cf. dig.c:299
// Light stub — player occupation not yet wired.
// ============================================================================

// cf. dig.c:299-568 — dig()
// Core digging occupation callback. Gradually digs through terrain.
// RNG: rn2(3) for fumbling check, rn2(3) for fumble type, rnd(5) for legs,
//      rn2(5)+10+abon+spe-erosion+udaminc for effort, rn2(3)/rn2(5) treefruit,
//      rn2(2) for earth elemental type, etc.
export async function dig(map, player) {
    if (!player || !player.context || !player.context.digging) return 0;
    const ctx = player.context.digging;
    const dpx = ctx.pos.x, dpy = ctx.pos.y;
    const uwep = player.weapon;
    const isPick = uwep && (uwep.otyp === PICK_AXE || uwep.otyp === DWARVISH_MATTOCK);
    const isAxeWep = uwep && (uwep.otyp === AXE || uwep.otyp === BATTLE_AXE);
    const verb = (!uwep || isPick) ? 'dig into' : 'chop through';
    let dcresult = DIGCHECK_PASSED;

    const lev = map.at(dpx, dpy);
    if (!lev) return 0;

    // Check if pick-axe was stolen or player teleported
    const ctxLevel = ctx.level || null;
    const mapLevel = map?.uz || null;
    const onSameDigLevel = (() => {
        if (!ctxLevel || !mapLevel) return true;
        if (!Number.isInteger(ctxLevel.dnum) || !Number.isInteger(ctxLevel.dlevel)) return true;
        if (ctxLevel.dnum === 0 && ctxLevel.dlevel === -1) return true;
        if (!Number.isInteger(mapLevel.dnum) || !Number.isInteger(mapLevel.dlevel)) return true;
        return ctxLevel.dnum === mapLevel.dnum && ctxLevel.dlevel === mapLevel.dlevel;
    })();

    if (player.uswallow || !uwep || (!isPick && !isAxeWep)
        || !onSameDigLevel
        || (ctx.down ? (dpx !== player.x || dpy !== player.y)
                     : !next2u(dpx, dpy, player))) {
        return 0;
    }

    if (ctx.down) {
        dcresult = dig_check(BY_YOU, player.x, player.y, map, player);
        if (dcresult >= DIGCHECK_FAILED) {
            await digcheck_fail_message(dcresult, BY_YOU, player.x, player.y, player);
            return 0;
        }
    } else {
        if (IS_TREE(lev.typ) && !may_dig(dpx, dpy, map)
            && dig_typ(uwep, dpx, dpy, map) === DIGTYP_TREE) {
            await _gstate?.display?.putstr_message?.('This tree seems to be petrified.');
            return 0;
        }
        if (IS_OBSTRUCTED(lev.typ) && !may_dig(dpx, dpy, map)
            && dig_typ(uwep, dpx, dpy, map) === DIGTYP_ROCK) {
            await _gstate?.display?.putstr_message?.(
                `This ${is_drawbridge_wall(dpx, dpy, map) >= 0 ? 'drawbridge' : 'wall'} is too hard to ${verb}.`
            );
            return 0;
        }
    }

    // Fumbling
    if (player.fumbling && !rn2(3)) {
        switch (rn2(3)) {
        case 0:
            if (!player.welded_weapon) {
                // "You fumble and drop your weapon."
                // dropx(uwep) — not yet wired
            } else {
                // weapon bounces, hit self or steed
                // set_wounded_legs(RIGHT_SIDE, 5 + rnd(5))
                rnd(5); // consume RNG for leg damage duration
            }
            break;
        case 1:
            // "Bang! You hit with the broad side!"
            wake_nearby(false, player, map);
            break;
        default:
            // "Your swing misses its mark."
            break;
        }
        return 0;
    }

    // Add digging effort
    const abon_val = abon(acurr(player, A_STR), acurr(player, A_DEX), player.ulevel || 0);
    const spe_val = uwep.spe || 0;
    const erosion = Math.max(uwep.oeroded || 0, uwep.oeroded2 || 0);
    const udaminc = player.udaminc || 0;
    ctx.effort += 10 + rn2(5) + abon_val + spe_val - erosion + udaminc;
    if (player.race === 'dwarf') { // Race_if(PM_DWARF)
        ctx.effort *= 2;
    }

    if (ctx.down) {
        const ttmp = map.trapAt ? map.trapAt(dpx, dpy) : null;

        if (ctx.effort > 250
            || (ttmp && ttmp.ttyp === HOLE)) {
            dighole(false, false, null, map, player);
            // Reset digging context
            ctx.pos = { x: 0, y: 0 };
            ctx.effort = 0;
            ctx.down = false;
            ctx.level = { dnum: 0, dlevel: -1 };
            return 0;
        }

        if (ctx.effort <= 50
            || (ttmp && (ttmp.ttyp === TRAPDOOR
                || ttmp.ttyp === PIT || ttmp.ttyp === SPIKED_PIT))) {
            return 1;
        } else if (ttmp && (ttmp.ttyp === LANDMINE
                    || (ttmp.ttyp === BEAR_TRAP && !player.utrap))) {
            // Digging onto a set trap triggers it
            // dotrap(ttmp, FORCETRAP) — not yet wired
            ctx.pos = { x: 0, y: 0 };
            ctx.effort = 0;
            ctx.down = false;
            ctx.level = { dnum: 0, dlevel: -1 };
            return 0;
        } else if (ttmp && ttmp.ttyp === BEAR_TRAP && player.utrap) {
            // C: rnl(7) > (Fumbling ? 1 : 4) — hit self or destroy trap
            const rnlval = rnl(7, player.luck || 0);
            if (rnlval > (player.fumbling ? 1 : 4)) {
                // Hit self in foot
                // dmgval + dbon + losehp
            } else {
                // Destroy bear trap
                deltrap(map, ttmp);
                // reset_utrap(TRUE)
            }
            ctx.effort = 0;
            return 0;
        } else if (ttmp && dcresult === DIGCHECK_PASSED_DESTROY_TRAP) {
            // Destroy non-pit trap
            deltrap(map, ttmp);
            ctx.effort = 0;
            return 0;
        }

        if (IS_ALTAR(lev.typ)) {
            // altar_wrath(dpx, dpy); angry_priest()
        }

        // Make pit
        if (dighole(true, false, null, map, player)) {
            ctx.level = { dnum: 0, dlevel: -1 };
        }
        return 0;
    }

    // Horizontal digging — effort > 100 means we break through
    if (ctx.effort > 100) {
        let digtxt = null;
        let dmgtxt = null;
        const shopedge = in_rooms_shopbase(dpx, dpy, map);
        const digtyp = dig_typ(uwep, dpx, dpy, map);

        if (digtyp === DIGTYP_STATUE) {
            const obj = sobj_at(STATUE, dpx, dpy, map);
            if (obj) {
                // break_statue(obj) — statue shattering
                digtxt = 'The statue shatters.';
            }
        } else if (digtyp === DIGTYP_BOULDER) {
            const obj = sobj_at(BOULDER, dpx, dpy, map);
            if (obj) {
                // fracture_rock(obj)
                digtxt = 'The boulder falls apart.';
            }
        } else if (lev.typ === STONE || lev.typ === SCORR
                   || IS_TREE(lev.typ)) {
            if (map.flags && map.flags.is_earthlevel) {
                if (uwep.blessed && !rn2(3)) {
                    mkcavearea(false, map, player);
                    ctx.lastdigtime = player.moves || 0;
                    ctx.quiet = false;
                    ctx.level = { dnum: 0, dlevel: -1 };
                    return 0;
                } else if ((uwep.cursed && !rn2(4))
                           || (!uwep.blessed && !rn2(6))) {
                    mkcavearea(true, map, player);
                    ctx.lastdigtime = player.moves || 0;
                    ctx.quiet = false;
                    ctx.level = { dnum: 0, dlevel: -1 };
                    return 0;
                }
            }
            if (digtyp === DIGTYP_TREE) {
                digtxt = 'You cut down the tree.';
                lev.typ = ROOM;
                lev.flags = 0;
                if (!rn2(5)) {
                    rnd_treefruit_at(map, dpx, dpy);
                }
                // if (Race_if(PM_ELF) || Role_if(PM_RANGER)) adjalign(-1)
            } else {
                digtxt = 'You succeed in cutting away some rock.';
                lev.typ = CORR;
                lev.flags = 0;
            }
        } else if (IS_WALL(lev.typ)) {
            if (shopedge) {
                add_damage(dpx, dpy, 10, map, _gstate?.moves || 0);
                dmgtxt = 'damage';
            }
            if (map.flags && map.flags.is_maze_lev) {
                lev.typ = ROOM;
                lev.flags = 0;
            } else if (map.flags && map.flags.is_cavernous_lev
                       && !in_town(dpx, dpy, map)) {
                lev.typ = CORR;
                lev.flags = 0;
            } else {
                lev.typ = DOOR;
                lev.flags = D_NODOOR;
            }
            digtxt = 'You make an opening in the wall.';
        } else if (lev.typ === SDOOR) {
            lev.typ = DOOR;
            digtxt = 'You break through a secret door!';
            if (!(lev.flags & D_TRAPPED)) {
                lev.flags = D_BROKEN;
            }
        } else if (closed_door(dpx, dpy, map)) {
            digtxt = 'You break through the door.';
            if (shopedge) {
                add_damage(dpx, dpy, 400, map, _gstate?.moves || 0);
                dmgtxt = 'break';
            }
            if (!(lev.flags & D_TRAPPED)) {
                lev.flags = D_BROKEN;
            }
        } else {
            return 0; // statue or boulder got taken
        }

        if (!IS_OBSTRUCTED(lev.typ)) {
            unblock_point(dpx, dpy);
        }
        newsym(dpx, dpy);
        if (digtxt && !ctx.quiet) {
            _gstate?.display?.putstr_message?.(digtxt);
        }
        if (dmgtxt) {
            pay_for_damage(dmgtxt, false, map, player, _gstate?.moves || 0);
        }

        // Earth level: rn2(3), rn2(2) for earth elemental
        if (map.flags && map.flags.is_earthlevel && !rn2(3)) {
            const mndx = rn2(2) ? PM_EARTH_ELEMENTAL : PM_XORN;
            makemon(mndx, dpx, dpy, MM_NOMSG, undefined, map);
        }

        if (IS_DOOR(lev.typ) && (lev.flags & D_TRAPPED)) {
            lev.flags = D_NODOOR;
            // b_trapped("door", NO_PART)
            recalc_block_point(dpx, dpy);
            newsym(dpx, dpy);
        }

        // cleanup
        ctx.lastdigtime = player.moves || 0;
        ctx.quiet = false;
        ctx.level = { dnum: 0, dlevel: -1 };
        return 0;
    } else {
        // Not enough effort yet — "You hit the rock/door/etc with all your might."
        const dig_target = dig_typ(uwep, dpx, dpy, map);
        if (IS_WALL(lev.typ) || dig_target === DIGTYP_DOOR) {
            if (in_rooms_shopbase(dpx, dpy, map)) {
                _gstate?.display?.putstr_message?.(
                    `This ${IS_DOOR(lev.typ) ? 'door' : 'wall'} seems too hard to ${verb}.`
                );
                return 0;
            }
        } else if (dig_target === DIGTYP_UNDIGGABLE
                   || (dig_target === DIGTYP_ROCK && !IS_OBSTRUCTED(lev.typ))) {
            return 0; // statue or boulder got taken
        }
        const d_target = ['', 'rock', 'statue', 'boulder', 'door', 'tree'];
        if (!_gstate?.did_dig_msg) {
            _gstate?.display?.putstr_message?.(`You hit the ${d_target[dig_target] || 'rock'} with all your might.`);
            wake_nearby(false, player, map);
            _gstate.did_dig_msg = true;
        }
    }
    return 1;
}

// Helper: next2u — is position adjacent to player?
function next2u(x, y, player) {
    if (!player) return false;
    return Math.abs(x - player.x) <= 1 && Math.abs(y - player.y) <= 1;
}


// ============================================================================
// is_digging (cf. dig.c:194)
// ============================================================================

// cf. dig.c:194-201 — is_digging()
// Returns true if the player's current occupation is digging.
// In C, this checks (go.occupation == dig). In JS, the player's
// occupation callback is stored on the player object.
export function is_digging(player) {
    if (player && player.occupation === dig) {
        return true;
    }
    return false;
}


// ============================================================================
// holetime (cf. dig.c:596)
// ============================================================================

// cf. dig.c:596-602 — holetime()
// When will the hole be finished? Very rough indication used by shopkeeper.
// Returns estimated remaining turns, or -1 if not currently digging in a shop.
export function holetime(player) {
    if (!player) return -1;
    if (player.occupation !== dig || !player.ushops) return -1;
    const effort = (player.context && player.context.digging)
        ? player.context.digging.effort : 0;
    return Math.floor((250 - effort) / 20);
}


// ============================================================================
// dig_check (cf. dig.c:206-252)
// Light stub for now.
// ============================================================================

// cf. dig.c:206-252 — dig_check result enum
const BY_YOU = 'BY_YOU';
const BY_OBJECT = 'BY_OBJECT';

// cf. dig.c:206-252 — dig_check(madeby, x, y)
// Checks whether digging is possible at the given location.
export function dig_check(madeby, x, y, map, player) {
    const loc = map.at(x, y);
    if (!loc) return DIGCHECK_FAILED;

    const ttmp = map.trapAt ? map.trapAt(x, y) : null;

    // On_stairs check
    const stway = map.stairwayAt ? map.stairwayAt(x, y) : null;
    if (stway) {
        if (stway.isladder) {
            return DIGCHECK_FAIL_ONLADDER;
        } else {
            return DIGCHECK_FAIL_ONSTAIRS;
        }
    }

    if (IS_THRONE(loc.typ) && madeby !== BY_OBJECT) {
        return DIGCHECK_FAIL_THRONE;
    }

    if (IS_ALTAR(loc.typ)
        && (madeby !== BY_OBJECT
            || (loc.altarmask !== undefined && (loc.altarmask & AM_SANCTUM) !== 0))) {
        return DIGCHECK_FAIL_ALTAR;
    }

    // Is_airlevel / Is_waterlevel checks
    if (player && player.uz) {
        if (map.flags && map.flags.is_airlevel) {
            return DIGCHECK_FAIL_AIRLEVEL;
        }
        if (map.flags && map.flags.is_waterlevel) {
            return DIGCHECK_FAIL_WATERLEVEL;
        }
    }

    const locWallInfo = Number(loc.wall_info ?? loc.flags ?? 0);
    if (IS_OBSTRUCTED(loc.typ) && loc.typ !== SDOOR && (locWallInfo & W_NONDIGGABLE)) {
        return DIGCHECK_FAIL_TOOHARD;
    }

    // undestroyable trap check
    if (ttmp && ttmp.ttyp !== undefined) {
        // C: undestroyable_trap — magic portal, vibrating square
        const MAGIC_PORTAL = 17; // C trap type enum
        const VIBRATING_SQUARE = 23;
        if (ttmp.ttyp === MAGIC_PORTAL || ttmp.ttyp === VIBRATING_SQUARE) {
            return DIGCHECK_FAIL_UNDESTROYABLETRAP;
        }
    }

    // Can_dig_down check
    const canDigDown = !!Can_dig_down(map) || !!(loc.candig);
    if (!canDigDown) {
        if (ttmp) {
            const is_hole = (ttmp.ttyp === HOLE || ttmp.ttyp === TRAPDOOR);
            const is_pit = (ttmp.ttyp === PIT || ttmp.ttyp === SPIKED_PIT);
            if (!is_hole && !is_pit) {
                return DIGCHECK_PASSED_DESTROY_TRAP;
            } else {
                return DIGCHECK_FAIL_CANTDIG;
            }
        } else {
            return DIGCHECK_PASSED_PITONLY;
        }
    }

    if (sobj_at(BOULDER, x, y, map)) {
        return DIGCHECK_FAIL_BOULDER;
    }

    if (madeby === BY_OBJECT
        && (ttmp || is_pool_or_lava(x, y, map))) {
        return DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }

    return DIGCHECK_PASSED;
}


// ============================================================================
// Burial functions — light stubs
// cf. dig.c:1884-2321
// ============================================================================

// cf. dig.c:1884-1932 — buried_ball(cc)
// Search for a buried heavy iron ball near the given coordinates.
// Updates cc to point to the ball's actual location if found.
// Returns the ball object, or null if not found.
export function buried_ball(cc, map, player) {
    if (!map || !player || !cc) return null;

    // If player is trapped but not by buried ball, no search
    if (player.utrap && player.utraptype !== TT_BURIEDBALL) return null; // TT_BURIEDBALL

    let ball = null;
    let bdist = COLNO;

    // Search through all objects for buried heavy iron balls
    for (const otmp of (map.objects || [])) {
        if (otmp.otyp !== HEAVY_IRON_BALL || !otmp.buried) continue;

        // If found at exact target spot, we're done
        if (otmp.ox === cc.x && otmp.oy === cc.y) return otmp;

        // Find nearest within allowable vicinity: dist2 <= 8
        const odist = (otmp.ox - cc.x) * (otmp.ox - cc.x)
                    + (otmp.oy - cc.y) * (otmp.oy - cc.y);
        if (odist <= 8 && (!ball || odist < bdist)) {
            ball = otmp;
            bdist = odist;
        }
    }

    if (ball) {
        // Found, but not at <cc.x, cc.y>
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

// cf. dig.c:1934-1955 — buried_ball_to_punishment()
// Convert a buried iron ball into a punishment ball attached to the player.
export function buried_ball_to_punishment(map, player) {
    if (!map || !player) return;
    const cc = { x: player.x, y: player.y };
    const ball = buried_ball(cc, map, player);
    if (ball) {
        // obj_extract_self(ball) — remove from buried list
        ball.buried = false;
        // punish(ball) — attach as punishment ball
        // reset_utrap(FALSE) — release from buried ball trap
        if (player.utrap && player.utraptype === TT_BURIEDBALL) { // TT_BURIEDBALL
            player.utrap = 0;
            player.utraptype = TT_NONE;
        }
        // del_engr_at(cc.x, cc.y) — remove engravings
        newsym(cc.x, cc.y);
    }
}

// cf. dig.c:1957-1979 — buried_ball_to_freedom()
// Unearth a buried iron ball and place it on the floor, freeing the player.
export function buried_ball_to_freedom(map, player) {
    if (!map || !player) return;
    const cc = { x: player.x, y: player.y };
    const ball = buried_ball(cc, map, player);
    if (ball) {
        // obj_extract_self(ball) — remove from buried list
        ball.buried = false;
        // place_object + stackobj — place on floor
        ball.ox = cc.x;
        ball.oy = cc.y;
        placeFloorObject(map, ball);
        // reset_utrap(TRUE) — release from trap, maybe enable Lev or Fly
        if (player.utrap && player.utraptype === TT_BURIEDBALL) { // TT_BURIEDBALL
            player.utrap = 0;
            player.utraptype = TT_NONE;
        }
        // del_engr_at(cc.x, cc.y) — remove engravings
        newsym(cc.x, cc.y);
    }
}

// cf. dig.c:1983-2047 — bury_an_obj(otmp, dealloced)
// Move an object from the floor to the buried object list.
// Returns the next object in the floor chain (for iteration).
// RNG: rn1(50, 20) for buried ball trap duration, rnd(250) for rot timer.
export function bury_an_obj(otmp, map, player) {
    if (!otmp || !map) return null;

    // If this is the player's ball, unpunish and set buried ball trap
    if (player && player.uball && otmp === player.uball) {
        // unpunish() — would go here
        // set_utrap(rn1(50, 20), TT_BURIEDBALL)
        const trap_dur = rn1(50, 20);
        if (player) {
            player.utrap = trap_dur;
            player.utraptype = TT_BURIEDBALL;
        }
        // "The iron ball gets buried!"
    }

    // C: if (otmp == uchain || obj_resists(otmp, 0, 0)) return otmp2
    // Skip chain and resistant objects (Amulet, invocation tools, Rider corpses)
    // Simplified: skip if marked as no_bury
    if (otmp.no_bury) return null;

    // C: if (otmp->otyp == LEASH && otmp->leashmon != 0) o_unleash(otmp)
    if (otmp.leashmon) {
        otmp.leashmon = 0;
    }

    // C: if (otmp->lamplit && otmp->otyp != POT_OIL) end_burn(otmp, TRUE)
    if (otmp.lamplit) {
        otmp.lamplit = false;
    }

    // Remove from floor
    const idx = map.objects.indexOf(otmp);
    if (idx >= 0) map.objects.splice(idx, 1);

    // C: rocks and boulders merge into burying material (destroyed)
    const under_ice = is_ice(otmp.ox, otmp.oy, map);
    if ((otmp.otyp === ROCK && !under_ice) || otmp.otyp === BOULDER) {
        // Merged into ground — object is destroyed
        return null;
    }

    // Start a rot timer on organic material (not corpses)
    if (otmp.otyp === CORPSE) {
        // Corpses already have their own timers; cancel if under ice
    } else if (otmp.organic || under_ice) {
        // C: start_timer((under_ice ? 0 : 250) + rnd(250), TIMER_OBJECT, ROT_ORGANIC, otmp)
        const rot_time = (under_ice ? 0 : 250) + rnd(250);
        // Timer integration would go here
    }

    // Mark as buried
    otmp.buried = true;
    placeFloorObject(map, otmp); // keep in map.objects but flagged as buried
    return null;
}

// cf. dig.c:2049-2081 — bury_objs(x, y)
// Bury all objects at the given location.
export function bury_objs(x, y, map, player) {
    if (!map) return;

    // Gather all non-buried floor objects at this location
    const atXY = (map.objects || []).filter(o =>
        o.ox === x && o.oy === y && !o.buried
    );

    for (const otmp of atXY) {
        // C: costly_spot handling for shopkeepers — simplified/skipped
        bury_an_obj(otmp, map, player);
    }

    // del_engr_at(x, y) — remove engravings
    newsym(x, y);
}

// cf. dig.c:2085-2112 — unearth_objs(x, y)
// Move objects from buried state back to the floor at (x, y).
export function unearth_objs(x, y, map, player) {
    if (!map) return;

    const cc = { x, y };
    const bball = buried_ball(cc, map, player);

    const buried = (map.objects || []).filter(o =>
        o.ox === x && o.oy === y && o.buried
    );

    for (const otmp of buried) {
        if (bball && otmp === bball
            && player && player.utrap && player.utraptype === TT_BURIEDBALL) {
            // TT_BURIEDBALL — convert to punishment
            buried_ball_to_punishment(map, player);
        } else {
            // Unbury: remove buried flag and place on floor
            otmp.buried = false;
            // C: if (otmp->timed) stop_timer(ROT_ORGANIC, obj_to_any(otmp))
            // Timer cleanup would go here
            // Already in map.objects; just unflag
        }
    }

    // del_engr_at(x, y)
    newsym(x, y);
}

// cf. dig.c:2124-2140 — rot_organic(arg, timeout)
// Timer callback: organic material has rotted away while buried.
// When a container rots away, its contents become newly buried objects.
export function rot_organic(arg, timeout, map, player) {
    if (!arg) return;
    const obj = arg.a_obj || arg;

    // If container, bury its contents first
    if (obj.contents && obj.contents.length > 0) {
        while (obj.contents.length > 0) {
            const cobj = obj.contents.shift();
            cobj.ox = obj.ox;
            cobj.oy = obj.oy;
            bury_an_obj(cobj, map, player);
        }
    }

    // Remove the rotted object
    if (map) {
        if (typeof map.removeObject === 'function') {
            map.removeObject(obj);
        } else {
            const idx = map.objects.indexOf(obj);
            if (idx >= 0) map.objects.splice(idx, 1);
        }
    }
}

// cf. dig.c:2145-2189 — rot_corpse(arg, timeout)
// Timer callback: a corpse has rotted completely away.
// Handles floor, inventory, and monster inventory cases, then calls rot_organic.
export function rot_corpse(arg, timeout, map, player) {
    if (!arg) return;
    const obj = arg.a_obj || arg;
    let x = 0, y = 0;
    const on_floor = (obj.where === OBJ_FLOOR || (!obj.where && !obj.buried && obj.ox !== undefined));
    const in_invent = (obj.where === OBJ_INVENT);

    if (on_floor) {
        x = obj.ox;
        y = obj.oy;
    } else if (in_invent) {
        // C: "Your <corpse> rots away."
        // remove_worn_item, stop_occupation
        if (obj.owornmask) {
            obj.owornmask = 0;
        }
    } else if (obj.where === OBJ_MINVENT) {
        // In monster inventory
        if (obj.owornmask && obj.ocarry) {
            obj.owornmask = 0;
        }
    } else if (obj.where === OBJ_MIGRATING) {
        obj.owornmask = 0;
    }

    rot_organic(arg, timeout, map, player);

    if (on_floor && map) {
        // A hiding monster may be exposed
        newsym(x, y);
    }
    // C: if (in_invent) update_inventory()
}

// cf. dig.c:2192-2209 — bury_monst(mtmp) [#if 0 in C]
// Bury a monster in the ground. Currently disabled in C (under #if 0).
// Ported for completeness.
export function bury_monst(mtmp, map, player) {
    if (!mtmp) return;

    if (canseemon(mtmp, player)) {
        // C: is_flyer/is_floater check — flying monsters aren't swallowed
        if (is_flyer(mtmp.data || mtmp.type) || is_floater(mtmp.data || mtmp.type)) {
            // "The ground opens up, but <monster> is not swallowed!"
            return;
        }
        // "The ground opens up and swallows <monster>!"
    }

    mtmp.mburied = true;
    // wakeup(mtmp, FALSE)
    if (map) newsym(mtmp.mx, mtmp.my);
}

// cf. dig.c:2211-2227 — bury_you() [#if 0 in C]
// Bury the player in the ground. Currently disabled in C (under #if 0).
export function bury_you(player) {
    if (!player) return;

    if (!player.levitation && !player.flying) {
        if (player.uswallow) {
            // "You feel a sensation like falling into a trap!"
        } else {
            // "The ground opens beneath you and you fall in!"
        }

        player.uburied = true;
        // C: if (!Strangled && !Breathless) Strangled = 6
        if (!player.strangled && !player.breathless) {
            player.strangled = 6;
        }
        // under_ground(1)
    }
}

// cf. dig.c:2229-2238 — unearth_you() [#if 0 in C]
// Unbury the player.
export function unearth_you(player) {
    if (!player) return;
    player.uburied = false;
    // under_ground(0)
    // C: if (!uamul || uamul->otyp != AMULET_OF_STRANGULATION) Strangled = 0
    if (!player.amulet_of_strangulation) {
        player.strangled = 0;
    }
    // vision_recalc(0)
}

// cf. dig.c:2240-2270 — escape_tomb() [#if 0 in C]
// Attempt to escape from being buried alive.
// RNG: rn2(3) for teleport check.
export function escape_tomb(map, player) {
    if (!player) return;

    // C: if ((Teleportation || can_teleport(youmonst.data))
    //        && (Teleport_control || rn2(3) < Luck+2))
    const can_tele = !!(player.teleportation || player.can_teleport);
    if (can_tele) {
        const luck = player.luck || 0;
        if (player.teleport_control || rn2(3) < luck + 2) {
            // "You attempt a teleport spell."
            // dotele(FALSE) — calls unearth_you()
            unearth_you(player);
            return;
        }
    }

    if (player.uburied) {
        // C: amorphous, Passes_walls, noncorporeal, unsolid, tunnels checks
        const can_phase = !!(player.amorphous || player.passes_walls
                            || player.noncorporeal || player.unsolid);
        const can_tunnel = !!(player.tunnels && !player.needspick);

        if (can_phase || can_tunnel) {
            // "You ooze/phase/tunnel up through the ground."
            let good;
            if (can_tunnel) {
                good = dighole(true, false, null, map, player);
            } else {
                good = true;
            }
            if (good) {
                unearth_you(player);
            }
        }
    }
}

// cf. dig.c:30-139 — rm_waslit/mkcavepos/mkcavearea
// Earth-level cave-in/cave-out helpers used by digging side effects.
export function rm_waslit(map, player) {
    if (!map || !player) return false;
    const here = map.at(player.x, player.y);
    if (here?.typ === ROOM && !!here.waslit) return true;
    for (let x = player.x - 2; x < player.x + 3; x++) {
        for (let y = player.y - 1; y < player.y + 2; y++) {
            const loc = map.at(x, y);
            if (loc?.waslit) return true;
        }
    }
    return false;
}

export function mkcavepos(x, y, dist, waslit, rockit, map) {
    if (!map || !isok(x, y)) return;
    const lev = map.at(x, y);
    if (!lev) return;
    if (rockit) {
        if (IS_OBSTRUCTED(lev.typ)) return;
        if (map.trapAt?.(x, y)) return;
    } else if (lev.typ === ROOM) {
        return;
    }

    unblock_point(x, y);
    lev.seenv = 0;
    lev.flags = 0;
    lev.horizontal = false;
    if (dist < 3) lev.lit = !rockit;
    if (waslit) lev.waslit = !rockit;
    lev.typ = rockit ? STONE : ROOM;
    newsym(x, y);
}

export function mkcavearea(rockit, map, player) {
    if (!map || !player) return;
    const waslit = rm_waslit(map, player);
    let xmin = player.x, xmax = player.x;
    let ymin = player.y, ymax = player.y;

    for (let dist = 1; dist <= 2; dist++) {
        xmin--;
        xmax++;
        if (dist < 2) {
            ymin--;
            ymax++;
            for (let i = xmin + 1; i < xmax; i++) {
                mkcavepos(i, ymin, dist, waslit, rockit, map);
                mkcavepos(i, ymax, dist, waslit, rockit, map);
            }
        }
        for (let i = ymin; i <= ymax; i++) {
            mkcavepos(xmin, i, dist, waslit, rockit, map);
            mkcavepos(xmax, i, dist, waslit, rockit, map);
        }
    }

    const here = map.at(player.x, player.y);
    if (!rockit && here?.typ === CORR) {
        here.typ = ROOM;
        if (waslit) here.waslit = true;
        newsym(player.x, player.y);
    }
}

// Autotranslated from dig.c:140
export function pick_can_reach(pick, x, y, player, map = null) {
    const gmap = map || _gstate?.map || null;
    const t = gmap?.trapAt?.(x, y) || null;
    const targetInPit = !!(t && (t.ttyp === PIT || t.ttyp === SPIKED_PIT) && t.tseen);
    if (player?.utrap && player.utraptype === TT_PIT) {
        if (targetInPit) {
            const heroTrap = gmap?.trapAt?.(player.x, player.y) || null;
            return !!(heroTrap && heroTrap === t);
        }
        return !!bimanual(pick);
    }
    if (bimanual(pick) || (player?.Flying || player?.flying || false)) return true;
    return !targetInPit;
}

// Autotranslated from dig.c:254
export async function digcheck_fail_message(digresult, madeby, x, y, player = null) {
    if (digresult < DIGCHECK_FAILED) return;
    const d = _gstate?.display || null;
    if (!d?.putstr_message) return;
    const uwep = player?.weapon || null;
    const verb = (madeby === BY_YOU && uwep && (uwep.otyp === AXE || uwep.otyp === BATTLE_AXE)) ? "chop" : "dig in";
    switch (digresult) {
    case DIGCHECK_FAIL_AIRLEVEL:
        await d.putstr_message(`You cannot ${verb} thin air.`);
        break;
    case DIGCHECK_FAIL_ALTAR:
        await d.putstr_message("The altar is too hard to break apart.");
        break;
    case DIGCHECK_FAIL_BOULDER:
        await d.putstr_message(`There isn't enough room to ${verb} here.`);
        break;
    case DIGCHECK_FAIL_ONLADDER:
        await d.putstr_message("The ladder resists your effort.");
        break;
    case DIGCHECK_FAIL_ONSTAIRS:
        await d.putstr_message(`The stairs are too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_THRONE:
        await d.putstr_message("The throne is too hard to break apart.");
        break;
    case DIGCHECK_FAIL_CANTDIG:
    case DIGCHECK_FAIL_TOOHARD:
    case DIGCHECK_FAIL_UNDESTROYABLETRAP:
        await d.putstr_message(`The surface here is too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_WATERLEVEL:
        await d.putstr_message("The water splashes and subsides.");
        break;
    default:
        break;
    }
}

// Autotranslated from dig.c:1361
export function watchman_canseeu(mtmp) {
    if (!mtmp || !mtmp.data) return false;
    const canSee = (mtmp.mcansee !== false);
    return !!(is_watch(mtmp.data) && canSee && mtmp.mpeaceful);
}

// Autotranslated from dig.c:1762
export async function adj_pit_checks(cc, msg, map) {
    if (!cc || !map || !isok(cc.x, cc.y)) return false;
    const room = map.at(cc.x, cc.y);
    if (!room) return false;
    const ltyp = room.typ;
    room.flags = 0;
    const foundation_msg = "The foundation is too hard to dig through from this angle.";
    let out = null;

    if (is_pool(cc.x, cc.y, map) || is_lava(cc.x, cc.y, map)) {
        out = null;
    } else if (closed_door(cc.x, cc.y, map) || ltyp === SDOOR || IS_WALL(ltyp)) {
        out = foundation_msg;
    } else if (IS_TREE(ltyp)) {
        out = "The tree's roots glow then fade.";
    } else if ((ltyp === STONE || ltyp === SCORR)
        && (Number(room.wall_info ?? room.flags ?? 0) & W_NONDIGGABLE)) {
        out = "The rock glows then fades.";
    } else if (ltyp === IRONBARS) {
        out = "The bars go much deeper than your pit.";
    } else if (IS_SINK(ltyp)) {
        out = "A tangled mass of plumbing remains below the sink.";
    } else if (await On_ladder(cc.x, cc.y, map)) {
        out = "The ladder is unaffected.";
    } else {
        let supporting = null;
        if (IS_FOUNTAIN(ltyp)) supporting = "fountain";
        else if (IS_THRONE(ltyp)) supporting = "throne";
        else if (IS_ALTAR(ltyp)) supporting = "altar";
        else if (await On_stairs(cc.x, cc.y, map)) supporting = "stairs";
        else if (ltyp === DRAWBRIDGE_DOWN || ltyp === DBWALL) supporting = "drawbridge";
        if (supporting) out = `The ${s_suffix(supporting)} supporting structures remain intact.`;
    }
    if (out) {
        await _gstate?.display?.putstr_message?.(out);
        return false;
    }
    return true;
}

// Autotranslated from dig.c:1843
export function pit_flow(trap, filltyp, map) {
    if (!trap || !map || filltyp === ROOM) return;
    if (trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT) return;
    const loc = map.at(trap.tx, trap.ty);
    if (!loc) return;
    loc.typ = filltyp;
    loc.flags = 0;
    liquid_flow(trap.tx, trap.ty, filltyp, trap, null, map);
}

// cf. dig.c:2273 — bury_obj() [#if 0 in C]
export function bury_obj(otmp, map, player) {
    if (!otmp || !map) return;
    bury_objs(otmp.ox, otmp.oy, map, player);
}

// cf. dig.c:2288 — wiz_debug_cmd_bury() [DEBUG]
export async function wiz_debug_cmd_bury(map, player) {
    if (!map || !player) return 0;
    let before = 0;
    let after = 0;
    for (let x = player.x - 1; x <= player.x + 1; x++) {
        for (let y = player.y - 1; y <= player.y + 1; y++) {
            if (!isok(x, y)) continue;
            before += map.objectsAt ? map.objectsAt(x, y).length : 0;
            bury_objs(x, y, map, player);
            after += map.objectsAt ? map.objectsAt(x, y).length : 0;
        }
    }
    const diff = before - after;
    if (before === 0) {
        await _gstate?.display?.putstr_message?.("No objects here or adjacent to bury.");
    } else if (diff === 0) {
        await _gstate?.display?.putstr_message?.("No objects buried.");
    } else {
        await _gstate?.display?.putstr_message?.(`${diff} object${diff === 1 ? "" : "s"} buried.`);
    }
    return 0;
}
