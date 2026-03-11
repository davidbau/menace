// trap.js -- Trap mechanics
// C ref: trap.c — m_harmless_trap(), floor_trigger(), mintrap(), check_in_air()
// trapeffect_*(), thitm(), seetrap(), t_missile(), erode_obj(), dotrap(), etc.

import {
    COLNO, ROWNO, ACCESSIBLE, isok, STONE,
    IS_DOOR, IS_STWALL, IRONBARS, TREE,
    D_BROKEN, D_CLOSED, D_LOCKED, TELEDS_ALLOW_DRAG, TELEDS_TELEPORT,
    A_STR, A_DEX, A_CON,
    W_ARMH, W_ARMC, W_ARM, W_ARMU, W_ARMS, W_ARMG, W_ARMF,
    TT_NONE, TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
    FORCETRAP, NOWEBMSG, FORCEBUNGLE, RECURSIVETRAP, TOOKPLUNGE, VIASITTING, FAILEDUNTRAP, HURTLING,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK,
    ER_NOTHING, ER_GREASED, ER_DAMAGED, ER_DESTROYED,
    EF_NONE, EF_GREASE, EF_DESTROY, EF_VERBOSE, EF_PAY,
} from './const.js';
import { SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS } from './objects.js';
import { rn2, rnd, rnl, d, c_d, rn1, rn2_on_display_rng } from './rng.js';
import { is_mindless, mindless, touch_petrifies, resists_ston,
         amorphous, is_whirly, unsolid, is_clinger, passes_walls,
         webmaker, grounded, is_flyer, is_floater, breathless,
         resists_fire, resists_sleep, attacktype, strongmonst,
         extra_nasty, flaming, acidic, completelyrusts,
         canseemon, stagger
       } from './mondata.js';
import { mon_knows_traps, mon_learns_traps, mons_see_trap,
         resists_magm, defended, DEADMONSTER } from './mondata.js';
import { helpless as monHelpless, monkilled, m_in_air, setmangry, wake_nearto, mongone } from './mon.js';
import { newsym } from './display.js';
import { sleep_monst } from './mhitm.js';
import { make_stunned, make_blinded, make_hallucinated } from './potion.js';
import { find_mac, which_armor } from './worn.js';
import { mtele_trap, mlevel_tele_trap,
         tele_trap, level_tele_trap, domagicportal } from './teleport.js';
import { rloco } from './teleport.js';
import { resist, burnarmor } from './zap.js';
import { dmgval } from './weapon.js';
import { deltrap, In_sokoban, level_difficulty, In_hell, Is_waterlevel } from './dungeon.js';
import { Role_if } from './role.js';
import { mons, PM_IRON_GOLEM, PM_RUST_MONSTER, PM_XORN, PM_PIT_FIEND, PM_PIT_VIPER, PM_OWLBEAR, PM_BUGBEAR, PM_GREMLIN, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_WOOD_GOLEM, PM_LEATHER_GOLEM, PM_PURPLE_WORM, PM_JABBERWOCK, PM_BALROG, PM_KRAKEN, PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS, PM_LORD_SURTUR, PM_TITANOTHERE, PM_BALUCHITHERIUM, PM_ROGUE, MZ_SMALL, MZ_HUGE, S_GIANT, S_DRAGON, AT_MAGC, AT_BREA, AD_PHYS, AD_FIRE, AD_RUST, AD_MAGM, AD_SLEE, AD_RBRE } from './monsters.js';
import { ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD,
         BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
         SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP,
         PIT, SPIKED_PIT, HOLE, TRAPDOOR, is_pit, is_hole,
         TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC,
         POLY_TRAP, VIBRATING_SQUARE, TRAPNUM
       } from './const.js';
import { game as _gstate } from './gstate.js';
import { is_flammable, is_rustprone, is_rottable, is_corrodeable,
         is_crackable, erosion_matters, mksobj, weight, place_object, obj_extract_self } from './mkobj.js';
import { CORPSE,
         ARROW, DART, ROCK, BOULDER, WAND_CLASS } from './objects.js';
import { stackobj, sobj_at, useup } from './invent.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_FLASH, DISP_END, xdir, ydir, N_DIRS, DIR_180, DIR_ERR } from './const.js';
import { cansee, couldsee } from './vision.js';
import { pline, Norep, You, pline_mon, You_hear, You_feel, impossible } from './pline.js';
import { Monnam, mon_nam } from './do_name.js';
import { dist2 } from './hacklib.js';
import { losehp, u_at } from './hack.js';
import { an, xname, the, Tobjnam, Has_contents } from './objnam.js';
import { float_vs_flight } from './polyself.js';
import { LEVITATION, FLYING, TIMEOUT, HALLUC, STUNNED, WT_ELF } from './const.js';
import { fall_asleep } from './timeout.js';
import { thitu } from './mthrowu.js';
import { exercise } from './attrib_exercise.js';
import { poisoned, acurr, change_luck } from './attrib.js';
import { sgn } from './hacklib.js';
import { xytod } from './cmd.js';
import { wake_nearby } from './mon.js';
import { set_wounded_legs } from './do.js';
import { rndcolor } from './do_name.js';
import { defsyms, trap_to_defsym } from './symbols.js';
import { roles } from './role.js';
import { rank_of } from './botl.js';

// C ref: trap.c static string arrays
const a_your = ['a', 'your'];
const A_Your = ['A', 'Your'];
const tower_of_flame = 'tower of flame';
const A_gush_of_water_hits = 'A gush of water hits';
const blindgas = ["humid", "odorless", "bad smelling", "chilling", "acrid", "biting"];

// C ref: trap.c:2990 trapnote() — return note name string with "an/a" prefix
const tnnames = [
    'C note', 'D flat', 'D note', 'E flat',
    'E note', 'F note', 'F sharp', 'G note',
    'G sharp', 'A note', 'B flat', 'B note',
];
function trapnote(trap) {
    const tn = tnnames[trap.tnote] || 'C note';
    return an(tn);  // "an F note", "a C note", etc.
}

const BOLT_LIM = 8;

// Trap result constants
const Trap_Effect_Finished = 0;
const Trap_Caught_Mon = 1;
const Trap_Killed_Mon = 2;
const Trap_Moved_Mon = 3;

// ========================================================================
// Helper stubs for functions not yet ported
// ========================================================================

// C ref: metallivorous(mptr) — eats metal
function metallivorous(mptr) {
    if (!mptr) return false;
    // PM_RUST_MONSTER and PM_XORN eat metal in C
    const ndx = mptr._index ?? -1;
    return ndx === PM_RUST_MONSTER || ndx === PM_XORN;
}

// resists_fire, resists_magm, resists_sleep, defended imported from mondata.js above



// Check if there's a boulder at (x,y) on the map
function has_boulder_at(map, x, y) {
    if (!map) return false;
    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    if (Array.isArray(objs)) {
        return objs.some(o => o.otyp === BOULDER);
    }
    return false;
}
export function t_at(x, y, map) {
    if (!map || !Array.isArray(map.traps)) return null;
    for (const t of map.traps) {
        if (t && t.tx === x && t.ty === y) return t;
    }
    return null;
}

export function m_at(x, y, map) {
    if (!map) map = _gstate?.lev;
    if (!map) return null;
    if (typeof map.monsterAt === 'function') return map.monsterAt(x, y);
    if (Array.isArray(map.monsters)) {
        for (const mon of map.monsters) {
            if (mon && mon.mx === x && mon.my === y) return mon;
        }
    }
    return null;
}


// ========================================================================
// seetrap — C ref: trap.c seetrap()
// ========================================================================
// Autotranslated from trap.c:3485
export function seetrap(trap) {
  if (!trap.tseen) {
    trap.tseen = 1;
    newsym(trap.tx, trap.ty);
  }
}

// ========================================================================
// t_missile — C ref: trap.c t_missile()
// Make a single arrow/dart/rock for a trap to shoot or drop
// ========================================================================
export function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    if (otmp) {
        otmp.quan = 1;
        otmp.owt = weight(otmp);
        otmp.opoisoned = 0;
        if (trap) {
            otmp.ox = trap.tx;
            otmp.oy = trap.ty;
        }
    }
    return otmp;
}

// ========================================================================
// thitm — C ref: trap.c thitm() — Monster is hit by trap
// ========================================================================
function thitm(tlev, mon, obj, d_override, nocorpse, map, player) {
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + (obj.spe || 0) <= rnd(20));
    else
        strike = (find_mac(mon) + tlev <= rnd(20));

    if (!strike) {
        // miss — object lands on ground
    } else {
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1) dam = 1;
        }
        mon.mhp -= dam;
        if (mon.mhp <= 0) {
            monkilled(mon, "", nocorpse ? -AD_RBRE : AD_PHYS, map, player);
            if (DEADMONSTER(mon)) {
                trapkilled = true;
            }
        }
    }

    // C ref: trap.c thitm() — place projectile on floor for miss/forced-hit.
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my, map);
        stackobj(obj, map);
    }

    return trapkilled;
}

// ========================================================================
// m_easy_escape_pit — C ref: trap.c m_easy_escape_pit()
// ========================================================================
// Autotranslated from trap.c:3633
function m_easy_escape_pit(mtmp) {
  // C ref: mon->data is stored as mon.type in JS (auto-translated field alias)
  const mdata = mtmp.data || mtmp.type || mons[mtmp.mndx];
  return (mdata === mons[PM_PIT_FIEND] || mdata.msize >= MZ_HUGE);
}

// ========================================================================
// floor_trigger — C ref: trap.c floor_trigger()
// ========================================================================
export function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

// C ref: trap.c check_in_air() subset for monsters.
export function check_in_air(mon, trflags = 0) {
    const plunged = ((trflags & (TOOKPLUNGE | VIASITTING)) !== 0);
    const isYou = !!(mon?.isPlayer || mon?.youmonst || mon?.isYou);
    const levitating = isYou
        ? !!(mon?.levitating || mon?.Levitation || mon?.hasProp?.(LEVITATION))
        : false;
    const flying = isYou
        ? !!(mon?.flying || mon?.Flying || mon?.hasProp?.(FLYING))
        : false;
    const mdat = mon?.type || mons[mon?.mndx] || {};
    return ((trflags & HURTLING) !== 0)
        || (isYou ? levitating : is_floater(mdat))
        || ((isYou ? flying : is_flyer(mdat)) && !plunged);
}

function mon_check_in_air(mon, trflags = 0) {
    return check_in_air(mon, trflags);
}

// ========================================================================
// m_harmless_trap — C ref: trap.c m_harmless_trap()
// ========================================================================
export function m_harmless_trap(mon, trap, map) {
    const mdat = mons[mon.mndx] || {};
    const inSokoban = !!(map?.flags?.is_sokoban || map?.flags?.in_sokoban);

    // C ref: trap.c m_harmless_trap() — !Sokoban gate on floor-triggered air check.
    if (!inSokoban && floor_trigger(trap.ttyp) && mon_check_in_air(mon))
        return true;

    switch (trap.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
        break;
    case BEAR_TRAP:
        if ((mdat.msize || 0) <= MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mon) || defended(mon, AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mon.mndx !== PM_IRON_GOLEM)
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mon) || defended(mon, AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        // C ref: trap.c m_harmless_trap() — clingers bypass pits/holes only outside Sokoban.
        if (is_clinger(mdat) && !inSokoban)
            return true;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true;
    case ANTI_MAGIC:
        if (resists_magm(mon) || defended(mon, AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        break;
    }

    return false;
}

// ========================================================================
// Individual trap effect handlers (monster branch only)
// C ref: trap.c trapeffect_*() — else branch (mtmp != &gy.youmonst)
// ========================================================================

function trapeffect_arrow_trap_mon(mon, trap, map, player, fov) {
    let trapkilled = false;
    const in_sight = canseemon(mon, player, fov) || (mon === player?.usteed);
    const see_it = cansee(mon.mx, mon.my);

    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it) {
            pline_mon(mon, '%s triggers a trap but nothing happens.', Monnam(mon));
        }
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished; // trap is gone, nothing happens
    }
    trap.once = 1;
    const otmp = t_missile(ARROW, trap);
    if (in_sight) seetrap(trap);  // C ref: trap.c:1231 — only if visible
    if (thitm(8, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_dart_trap_mon(mon, trap, map, player, fov) {
    let trapkilled = false;
    const in_sight = canseemon(mon, player, fov) || (mon === player?.usteed);
    const see_it = cansee(mon.mx, mon.my);

    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it) {
            pline_mon(mon, '%s triggers a trap but nothing happens.', Monnam(mon));
        }
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    if (in_sight) seetrap(trap);  // C ref: trap.c:1305 — only if visible
    if (thitm(7, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_rocktrap_mon(mon, trap, map, player, fov) {
    let trapkilled = false;
    const in_sight = canseemon(mon, player, fov) || (mon === player?.usteed);
    const see_it = cansee(mon.mx, mon.my);

    if (trap.once && trap.tseen && !rn2(15)) {
        if (in_sight && see_it) {
            pline_mon(mon, 'A trap door above %s opens, but nothing falls out!',
                      mon_nam(mon));
        }
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(ROCK, trap);
    if (in_sight) seetrap(trap);  // C ref: trap.c:1377 — only if visible
    if (thitm(0, mon, otmp, d(2, 6), false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

async function trapeffect_sqky_board_mon(mon, trap, player, fov) {
    if (m_in_air(mon))
        return Trap_Effect_Finished;
    // C ref: trap.c:1435-1465 — monster steps on squeaky board
    const in_sight = canseemon(mon, player, fov);
    const isDeaf = !!(player?.Deaf || player?.deaf);
    const note = trapnote(trap);
    if (in_sight) {
        if (!isDeaf) {
            await pline_mon(mon, 'A board beneath %s squeaks %s loudly.',
                            mon_nam(mon), note);
            seetrap(trap);
        } else if (!is_mindless(mons[mon.mndx])) {
            await pline_mon(mon, '%s stops momentarily and appears to cringe.',
                            Monnam(mon));
        }
    } else {
        // C ref: trap.c:1450-1462 — distant squeak sound
        const range = couldsee(mon.mx, mon.my) ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        const mdist = dist2(player.x, player.y, mon.mx, mon.my);
        await You_hear('%s squeak %s.', note,
                       mdist <= range * range ? 'nearby' : 'in the distance');
    }
    // C ref: wake_nearto(mtmp->mx, mtmp->my, 40) — not ported
    return Trap_Effect_Finished;
}

function trapeffect_bear_trap_mon(mon, trap, trflags, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;
    const in_sight = canseemon(mon, player) || (mon === player?.usteed);
    const forcetrap = ((trflags & FORCETRAP) !== 0)
        || ((trflags & FAILEDUNTRAP) !== 0)
        || ((trflags & VIASITTING) !== 0);

    if ((mptr.msize || 0) > MZ_SMALL && !amorphous(mptr) && !m_in_air(mon)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mon.mtrapped = 1;
        if (in_sight) {
            pline_mon(mon, '%s is caught in %s bear trap!', Monnam(mon),
                      trap.madeby_u ? 'your' : 'a');
            seetrap(trap);
        } else if (mon.mndx === PM_OWLBEAR || mon.mndx === PM_BUGBEAR) {
            You_hear('the roaring of an angry bear!');
        }
    } else if (forcetrap && in_sight) {
        pline_mon(mon, '%s evades %s bear trap!', Monnam(mon),
                  trap.madeby_u ? 'your' : 'a');
        seetrap(trap);
    }
    if (mon.mtrapped)
        trapkilled = thitm(0, mon, null, c_d(2, 4), false, map, player);

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_slp_gas_trap_mon(mon, trap, player, fov) {
    const mdat = mons[mon.mndx] || {};
    if (!resists_sleep(mon) && !breathless(mdat) && !monHelpless(mon)) {
        // C ref: trap.c:1568-1574 — seetrap only if sleep_monst() returns true AND in_sight
        const in_sight = canseemon(mon, player, fov);
        if (sleep_monst(mon, rnd(25), -1) && in_sight) {
            pline_mon(mon, '%s suddenly falls asleep!', Monnam(mon));
            seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

function trapeffect_rust_trap_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;
    const in_sight = canseemon(mon, player) || (mon === player?.usteed);

    if (in_sight)
        seetrap(trap);
    // C ref: rn2(5) to determine which body part gets hit
    const bodypart = rn2(5);
    switch (bodypart) {
    case 0: {
        const target = which_armor(mon, W_ARMH);
        water_damage(target, null, true);
        break;
    }
    case 1: {
        const target = which_armor(mon, W_ARMS);
        if (water_damage(target, null, true) !== ER_NOTHING)
            break;
        // fall through to glove check
        const gloves = which_armor(mon, W_ARMG);
        water_damage(gloves, null, true);
        break;
    }
    case 2: {
        // right arm — weapon then gloves
        const wep = mon.weapon;
        water_damage(wep, null, true);
        const gloves = which_armor(mon, W_ARMG);
        water_damage(gloves, null, true);
        break;
    }
    default: {
        // body — cloak or armor or shirt
        let target = which_armor(mon, W_ARMC);
        if (target) {
            water_damage(target, null, true);
        } else if ((target = which_armor(mon, W_ARM))) {
            water_damage(target, null, true);
        } else if ((target = which_armor(mon, W_ARMU))) {
            water_damage(target, null, true);
        }
        break;
    }
    }

    if (completelyrusts(mptr)) {
        monkilled(mon, null, AD_RUST, map, player);
        if (DEADMONSTER(mon))
            trapkilled = true;
    } else if (mon.mndx === PM_GREMLIN && rn2(3)) {
        // C ref: split_mon — not ported, consume rn2(3) for parity
    }

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_fire_trap_mon(mon, trap, map, player) {
    let trapkilled = false;
    const mptr = mons[mon.mndx] || {};
    const orig_dmg = d(2, 4);

    if (resists_fire(mon)) {
        // immune — no damage
    } else {
        let num = orig_dmg;
        let alt;
        let immolate = false;

        // C ref: paper/straw/wood/leather golem extra damage
        switch (mon.mndx) {
        case PM_PAPER_GOLEM:
            immolate = true;
            alt = mon.mhpmax || 0;
            break;
        case PM_STRAW_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 2);
            break;
        case PM_WOOD_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 4);
            break;
        case PM_LEATHER_GOLEM:
            alt = Math.floor((mon.mhpmax || 0) / 8);
            break;
        default:
            alt = 0;
            break;
        }
        if (alt > num) num = alt;

        if (thitm(0, mon, null, num, immolate, map, player)) {
            trapkilled = true;
        } else {
            // C ref: reduce mhpmax
            mon.mhpmax = (mon.mhpmax || mon.mhp) - rn2(num + 1);
            if (mon.mhp > mon.mhpmax) mon.mhp = mon.mhpmax;
        }
    }

    // C ref: if (burnarmor(mtmp) || rn2(3)) { destroy_items; ignite_items }
    if (burnarmor(mon) || rn2(3)) {
        // destroy_items/ignite_items — not ported (cosmetic)
    }
    // C ref: burn_floor_objects — not ported

    if (DEADMONSTER(mon))
        trapkilled = true;

    seetrap(trap);

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_pit_mon(mon, trap, trflags, map, player) {
    const ttype = trap.ttyp;
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if (!grounded(mptr)) {
        return Trap_Effect_Finished; // avoids trap
    }
    if (!passes_walls(mptr))
        mon.mtrapped = 1;

    seetrap(trap);

    // C ref: mselftouch(mtmp, "Falling, ", FALSE)
    mselftouch(mon, "Falling, ", false);
    if (DEADMONSTER(mon)
        || thitm(0, mon, null, rnd(ttype === PIT ? 6 : 10), false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

async function trapeffect_hole_mon(mon, trap, trflags, map, player, fov) {
    const mptr = mons[mon.mndx] || {};

    if (!grounded(mptr) || (mptr.msize || 0) >= MZ_HUGE) {
        return Trap_Effect_Finished;
    }
    // C ref: calls trapeffect_level_telep for monsters
    return await trapeffect_level_telep_mon(mon, trap, trflags, map, player, fov);
}

async function trapeffect_telep_trap_mon(mon, trap, map, player, display, fov) {
    const in_sight = !!(canseemon(mon, player, fov) || mon === player?.usteed);
    await mtele_trap(mon, trap, in_sight, map, player, display, fov);
    return Trap_Moved_Mon;
}

async function trapeffect_level_telep_mon(mon, trap, trflags, map, player, fov) {
    const in_sight = !!(canseemon(mon, player, fov) || mon === player?.usteed);
    const forcetrap = false;
    return await mlevel_tele_trap(mon, trap, forcetrap, in_sight, map, player);
}

function trapeffect_web_mon(mon, trap, map) {
    const mptr = mons[mon.mndx] || {};
    let tear_web = false;

    if (webmaker(mptr))
        return Trap_Effect_Finished;

    // C ref: mu_maybe_destroy_web — flaming/acidic monsters destroy webs
    if (flaming(mptr) || acidic(mptr)) {
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished;
    }

    // C ref: specific large monsters that tear webs
    switch (mon.mndx) {
    case PM_OWLBEAR:
    case PM_BUGBEAR:
        // fall through to default check
        break;
    case PM_TITANOTHERE:
    case PM_BALUCHITHERIUM:
    case PM_PURPLE_WORM:
    case PM_JABBERWOCK:
    case PM_IRON_GOLEM:
    case PM_BALROG:
    case PM_KRAKEN:
    case PM_MASTODON:
    case PM_ORION:
    case PM_NORN:
    case PM_CYCLOPS:
    case PM_LORD_SURTUR:
        tear_web = true;
        break;
    default:
        if (mptr.mlet === S_GIANT
            || (mptr.mlet === S_DRAGON && extra_nasty(mptr))) {
            tear_web = true;
        }
        break;
    }

    if (!tear_web) {
        mon.mtrapped = 1;
        seetrap(trap);
    }

    if (tear_web) {
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
    }

    return mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_statue_trap_mon(/* mon, trap */) {
    // C ref: monsters don't trigger statue traps
    return Trap_Effect_Finished;
}

function trapeffect_magic_trap_mon(mon, trap, map, player) {
    // C ref: if (!rn2(21)) fire_trap effect, otherwise nothing
    if (!rn2(21))
        return trapeffect_fire_trap_mon(mon, trap, map, player);
    return Trap_Effect_Finished;
}

function trapeffect_anti_magic_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if (!resists_magm(mon)) {
        // lose spell energy
        if (!mon.mcan && (attacktype(mptr, AT_MAGC)
                          || attacktype(mptr, AT_BREA))) {
            mon.mspec_used = (mon.mspec_used || 0) + d(2, 6);
            seetrap(trap);
        }
    } else {
        // take damage — magic resistance makes anti-magic hurt
        let dmgval2 = rnd(4);
        // C ref: Magicbane / artifact checks — simplified
        if (passes_walls(mptr))
            dmgval2 = Math.floor((dmgval2 + 3) / 4);

        seetrap(trap);
        mon.mhp -= dmgval2;
        if (DEADMONSTER(mon)) {
            monkilled(mon, null, -AD_MAGM, map, player);
            if (DEADMONSTER(mon))
                trapkilled = true;
        }
    }
    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_poly_trap_mon(mon, trap) {
    if (resists_magm(mon)) {
        // shieldeff — immune
    } else if (!resist(mon, WAND_CLASS)) {
        // C ref: newcham(mtmp, NULL, NC_SHOW_MSG) — not ported
        // Just consume the resist() RNG and skip polymorph
        seetrap(trap);
    }
    return Trap_Effect_Finished;
}

function trapeffect_landmine_mon(mon, trap, trflags, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    // C ref: heavier monsters more likely to trigger; MINE_TRIGGER_WT = WT_ELF/2
    const MINE_TRIGGER_WT = Math.floor(WT_ELF / 2);
    if (rn2((mptr.cwt || 100) + 1) < MINE_TRIGGER_WT)
        return Trap_Effect_Finished;

    if (m_in_air(mon)) {
        // floating/flying monster — might still set it off
        if (rn2(3))
            return Trap_Effect_Finished;
    }

    // C ref: blow_up_landmine — simplified to just change trap type
    // The explosion itself is complex (scatter, etc.) — stub it
    trap.ttyp = PIT;
    trap.madeby_u = false;
    seetrap(trap);

    if (DEADMONSTER(mon)
        || thitm(0, mon, null, rnd(16), false, map, player)) {
        trapkilled = true;
    } else {
        // C ref: monster recursively falls into pit
        // Simplified: apply pit effect directly
        if (!passes_walls(mptr))
            mon.mtrapped = 1;
        const pitdmg = rnd(6);
        mon.mhp -= pitdmg;
        if (DEADMONSTER(mon)) {
            monkilled(mon, "", AD_PHYS, map, player);
            if (DEADMONSTER(mon))
                trapkilled = true;
        }
    }

    if (DEADMONSTER(mon))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

async function trapeffect_rolling_boulder_trap_mon(mon, trap, map, player) {
    // C ref: trap.c launch_obj() rolling-boulder flow.
    // JS port approximates per-cell boulder travel from trap.launch towards
    // the mirrored launch2 endpoint, including hit resolution against mon.
    if (m_in_air(mon)) return Trap_Effect_Finished;
    if (!map || !trap) return Trap_Effect_Finished;

    const launch = trap.launch || { x: trap.tx, y: trap.ty };
    const launch2 = trap.launch2 || {
        x: trap.tx - (launch.x - trap.tx),
        y: trap.ty - (launch.y - trap.ty),
    };
    const dx = Math.sign((launch2.x || trap.tx) - (launch.x || trap.tx));
    const dy = Math.sign((launch2.y || trap.ty) - (launch.y || trap.ty));
    if (!dx && !dy) return Trap_Effect_Finished;

    // C ref: launch_obj() first looks for a boulder at launch, then launch2.
    // Keep this trap tied to a real floor boulder and remove trap if none exist.
    const findBoulderAt = (bx, by, exclude = null) => {
        const objs = map.objectsAt ? map.objectsAt(bx, by) : [];
        return Array.isArray(objs)
            ? (objs.find((o) => o && o !== exclude && o.otyp === BOULDER && !o.buried) || null)
            : null;
    };
    const doorIsClosed = (loc) => {
        if (!loc || !IS_DOOR(loc.typ)) return false;
        return !!((loc.flags || 0) & (D_CLOSED | D_LOCKED));
    };
    const breakDoor = (loc) => {
        if (!loc || !IS_DOOR(loc.typ)) return;
        loc.flags = D_BROKEN;
    };
    let boulder = findBoulderAt(launch.x, launch.y);
    let x = launch.x;
    let y = launch.y;
    if (!boulder) {
        boulder = findBoulderAt(launch2.x, launch2.y);
        if (boulder) {
            x = launch2.x;
            y = launch2.y;
        } else {
            deltrap(trap, map);
            if (typeof newsym === 'function') newsym(trap.tx, trap.ty);
            return Trap_Effect_Finished;
        }
    }
    const removeBoulder = (obj) => {
        if (!obj || !map) return;
        if (typeof map.removeObject === 'function') {
            map.removeObject(obj);
        } else if (typeof map.removeFloorObject === 'function') {
            map.removeFloorObject(obj);
        }
    };

    tmp_at(DISP_FLASH, { ch: '0', color: 7 });
    try {
        while (isok(x, y)) {
            const loc = map.at ? map.at(x, y) : null;
            if (!loc || !ACCESSIBLE(loc.typ)) break;
            boulder.ox = x;
            boulder.oy = y;
            tmp_at(x, y);
            await nh_delay_output();
            if (player && x === player.x && y === player.y) {
                // C ref: launch_obj()/ohitmon can strike the hero while rolling.
                const dmg = rnd(20);
                if (typeof player.takeDamage === 'function') player.takeDamage(dmg, 'a rolling boulder');
                else if (Number.isFinite(player.uhp)) player.uhp -= dmg;
                return Trap_Effect_Finished;
            }
            if (x === mon.mx && y === mon.my) {
                // C ref: launch_obj() ultimately resolves impact via ohitmon/thitm paths.
                // Keep existing trap.js damage pipeline for monster-side trap effects.
                const killed = thitm(0, mon, null, rnd(20), false, map, player);
                return killed ? Trap_Killed_Mon : Trap_Effect_Finished;
            }
            const hitTrap = map.trapAt ? map.trapAt(x, y) : null;
            if (hitTrap && hitTrap !== trap && boulder?.otyp === BOULDER) {
                switch (hitTrap.ttyp) {
                case LANDMINE:
                    // C ref: blow_up_landmine side effects; keep trap-state parity
                    // shape used by trap.js landmine handling.
                    hitTrap.ttyp = PIT;
                    hitTrap.madeby_u = false;
                    seetrap(hitTrap);
                    removeBoulder(boulder);
                    return Trap_Effect_Finished;
                case TELEP_TRAP:
                    // C ref: launch_obj() tele trap relocates the boulder on level.
                    rloco(boulder, map, player);
                    seetrap(hitTrap);
                    return Trap_Effect_Finished;
                case LEVEL_TELEP:
                    // Approximation: remove from current level when level migration
                    // plumbing isn't available in this path.
                    removeBoulder(boulder);
                    seetrap(hitTrap);
                    return Trap_Effect_Finished;
                case PIT:
                case SPIKED_PIT:
                    // C ref: fill_pit() consumes boulder and neutralizes pit-family trap.
                    deltrap(hitTrap, map);
                    removeBoulder(boulder);
                    if (typeof newsym === 'function') newsym(x, y);
                    return Trap_Effect_Finished;
                case HOLE:
                case TRAPDOOR:
                    // C ref: boulder falls into hole/trapdoor and is removed.
                    deltrap(hitTrap, map);
                    removeBoulder(boulder);
                    if (typeof newsym === 'function') newsym(x, y);
                    return Trap_Effect_Finished;
                default:
                    break;
                }
            }
            if (doorIsClosed(loc)) {
                breakDoor(loc);
                if (typeof newsym === 'function') newsym(x, y);
            }
            const otherBoulder = findBoulderAt(x, y, boulder);
            if (otherBoulder) {
                boulder = otherBoulder;
            }
            if (x === launch2.x && y === launch2.y) break;
            const nx = x + dx;
            const ny = y + dy;
            if (!isok(nx, ny)) break;
            const nloc = map.at ? map.at(nx, ny) : null;
            if (!nloc || !ACCESSIBLE(nloc.typ)) break;
            if (nloc.typ === IRONBARS || nloc.typ === TREE || IS_STWALL(nloc.typ)) break;
            x = nx;
            y = ny;
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
    return Trap_Effect_Finished;
}

async function trapeffect_magic_portal_mon(mon, trap, trflags, map, player) {
    // C ref: for monsters, same as level_telep
    return await trapeffect_level_telep_mon(mon, trap, trflags, map, player);
}

function trapeffect_vibrating_square_mon(/* mon, trap */) {
    // C ref: cosmetic only for monsters
    return Trap_Effect_Finished;
}

// ========================================================================
// trapeffect_selector_mon — C ref: trap.c trapeffect_selector()
// Dispatches to appropriate trap handler for monsters
// ========================================================================
async function trapeffect_selector_mon(mon, trap, trflags, map, player, display, fov) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return trapeffect_arrow_trap_mon(mon, trap, map, player, fov);
    case DART_TRAP:
        return trapeffect_dart_trap_mon(mon, trap, map, player, fov);
    case ROCKTRAP:
        return trapeffect_rocktrap_mon(mon, trap, map, player, fov);
    case SQKY_BOARD:
        return await trapeffect_sqky_board_mon(mon, trap, player, fov);
    case BEAR_TRAP:
        return trapeffect_bear_trap_mon(mon, trap, trflags, map, player);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap_mon(mon, trap, player, fov);
    case RUST_TRAP:
        return trapeffect_rust_trap_mon(mon, trap, map, player);
    case FIRE_TRAP:
        return trapeffect_fire_trap_mon(mon, trap, map, player);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit_mon(mon, trap, trflags, map, player);
    case HOLE:
    case TRAPDOOR:
        return await trapeffect_hole_mon(mon, trap, trflags, map, player, fov);
    case TELEP_TRAP:
        return await trapeffect_telep_trap_mon(mon, trap, map, player, display, fov);
    case LEVEL_TELEP:
        return await trapeffect_level_telep_mon(mon, trap, trflags, map, player, fov);
    case MAGIC_PORTAL:
        return await trapeffect_magic_portal_mon(mon, trap, trflags, map, player);
    case WEB:
        return trapeffect_web_mon(mon, trap, map);
    case STATUE_TRAP:
        return trapeffect_statue_trap_mon();
    case MAGIC_TRAP:
        return trapeffect_magic_trap_mon(mon, trap, map, player);
    case ANTI_MAGIC:
        return trapeffect_anti_magic_mon(mon, trap, map, player);
    case POLY_TRAP:
        return trapeffect_poly_trap_mon(mon, trap);
    case LANDMINE:
        return trapeffect_landmine_mon(mon, trap, trflags, map, player);
    case ROLLING_BOULDER_TRAP:
        return await trapeffect_rolling_boulder_trap_mon(mon, trap, map, player);
    case VIBRATING_SQUARE:
        return trapeffect_vibrating_square_mon();
    default:
        return Trap_Effect_Finished;
    }
}

// ========================================================================
// mintrap_postmove — C ref: trap.c mintrap()
// Main entry point for monster-trap interaction after movement
// ========================================================================
export async function mintrap_postmove(mon, map, player, display, fov) {
    const trap = map.trapAt(mon.mx, mon.my);
    let trap_result = Trap_Effect_Finished;
    const inSokoban = !!(map?.flags?.is_sokoban || map?.flags?.in_sokoban);

    if (!trap) {
        mon.mtrapped = 0;
    } else if (mon.mtrapped) {
        // Currently trapped — try to escape
        // C ref: seetrap for visible trapped monsters in pits/bear/hole/web
        if (!trap.tseen
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE || trap.ttyp === WEB)) {
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mon))) {
            // Trying to escape
            if (has_boulder_at(map, mon.mx, mon.my) && is_pit(trap.ttyp)) {
                // Boulder in pit — 50% chance of escape
                if (!rn2(2)) {
                    mon.mtrapped = 0;
                    // C ref: fill_pit — not ported
                }
            } else {
                mon.mtrapped = 0;
            }
        } else if (metallivorous(mons[mon.mndx] || {})) {
            // Metal-eating monster can eat bear trap or spiked pit spikes
            if (trap.ttyp === BEAR_TRAP) {
                deltrap(map, trap);
                mon.meating = 5;
                mon.mtrapped = 0;
            } else if (trap.ttyp === SPIKED_PIT) {
                trap.ttyp = PIT;
                mon.meating = 5;
            }
        }
        trap_result = mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        // Not currently trapped — new trap encounter
        const tt = trap.ttyp;
        // C ref: trap.c mintrap() fixed_tele_trap(ttmp) sets FORCETRAP.
        const forceTrap = (tt === TELEP_TRAP
            && isok(trap?.teledest?.x ?? -1, trap?.teledest?.y ?? -1));
        const already_seen = mon_knows_traps(mon, tt)
            || (tt === HOLE && !is_mindless(mon?.type || {}));

        // C ref: trap.c mintrap() — !Sokoban gate for floor-triggered in-air bypass.
        if (!forceTrap) {
            if (!inSokoban && floor_trigger(tt) && mon_check_in_air(mon)) {
                return Trap_Effect_Finished;
            }
            const skipSeenRoll = already_seen ? rn2(4) : 0;
            if (already_seen && skipSeenRoll) {
                return Trap_Effect_Finished;
            }
        }

        mon_learns_traps(mon, tt);
        mons_see_trap(trap, map);

        // C ref: Monster is aggravated by being trapped by you
        if (trap.madeby_u && rnl(5)) {
            setmangry(mon, false, map, player);
        }

        trap_result = await trapeffect_selector_mon(
            mon, trap, 0, map, player, display, fov);
    }
    return trap_result;
}

const MAX_ERODE = 3;

// ========================================================================
// Erosion functions — C ref: trap.c
// ========================================================================

// C ref: trap.c grease_protect() — check grease protection; may consume grease
export function grease_protect(otmp, ostr, victim) {
    if (!rn2(2)) {
        otmp.greased = false;
        return true; // grease dissolved
    }
    return false;
}

// C ref: trap.c erode_obj() — erode an object by type
// Returns ER_NOTHING, ER_GREASED, ER_DAMAGED, or ER_DESTROYED
export function erode_obj(otmp, ostr, type, ef_flags) {
    if (!otmp) return ER_NOTHING;

    let vulnerable = false;
    let is_primary = true;
    const check_grease = !!(ef_flags & EF_GREASE);

    switch (type) {
    case ERODE_BURN:
        vulnerable = is_flammable(otmp);
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        is_primary = false;
        break;
    case ERODE_CORRODE:
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        break;
    case ERODE_CRACK:
        vulnerable = is_crackable(otmp);
        break;
    default:
        return ER_NOTHING;
    }

    const erosion = is_primary ? (otmp.oeroded || 0) : (otmp.oeroded2 || 0);

    if (check_grease && otmp.greased) {
        grease_protect(otmp, ostr, null);
        return ER_GREASED;
    } else if (!erosion_matters(otmp)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        // C ref: trap.c erode_obj() uses rnl(4) for blessed protection.
        if (otmp.oerodeproof) {
            otmp.rknown = true;
        }
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        if (is_primary)
            otmp.oeroded = (otmp.oeroded || 0) + 1;
        else
            otmp.oeroded2 = (otmp.oeroded2 || 0) + 1;
        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        // Object destroyed — caller handles removal
        return ER_DESTROYED;
    } else {
        return ER_NOTHING;
    }
}

function erosion_action(type) {
    switch (type) {
    case ERODE_BURN: return 'burns';
    case ERODE_RUST: return 'rusts';
    case ERODE_ROT: return 'rots';
    case ERODE_CORRODE: return 'corrodes';
    case ERODE_CRACK: return 'cracks';
    default: return 'wears';
    }
}

function erosion_past_participle(type) {
    switch (type) {
    case ERODE_BURN: return 'burnt';
    case ERODE_RUST: return 'rusted';
    case ERODE_ROT: return 'rotten';
    case ERODE_CORRODE: return 'corroded';
    case ERODE_CRACK: return 'cracked';
    default: return 'worn';
    }
}

// C-faithful player-facing erosion messaging for carried armor paths.
// Mirrors trap.c erode_obj() wording for the common damaged/destroyed cases.
export async function erode_obj_player(otmp, ostr, type, ef_flags) {
    const result = erode_obj(otmp, ostr, type, ef_flags);
    if (!otmp) return result;

    const name = ostr || 'item';
    if (result === ER_DAMAGED) {
        const isPrimary = (type !== ERODE_ROT && type !== ERODE_CORRODE);
        const level = isPrimary ? (otmp.oeroded || 0) : (otmp.oeroded2 || 0);
        const adverb = (level >= MAX_ERODE) ? ' completely' : (level > 1 ? ' further' : '');
        await pline('Your %s %s%s!', name, erosion_action(type), adverb);
    } else if (result === ER_NOTHING) {
        if (!(ef_flags & EF_VERBOSE)) return result;
        const isPrimary = (type !== ERODE_ROT && type !== ERODE_CORRODE);
        const level = isPrimary ? (otmp.oeroded || 0) : (otmp.oeroded2 || 0);
        if (level >= MAX_ERODE) {
            await pline('Your %s looks completely %s.', name, erosion_past_participle(type));
        }
    } else if (result === ER_DESTROYED) {
        if (type === ERODE_CRACK) {
            await pline('Your %s shatters!', name);
        } else {
            await pline('Your %s %s away!', name, erosion_action(type));
        }
    }
    return result;
}

// C ref: trap.c water_damage() — water damage to a single object
export function water_damage(obj, ostr, force) {
    if (!obj) return ER_NOTHING;

    if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = false;
        }
        return ER_GREASED;
    } else if (!force && rn2(20) < 5) {
        // C ref: (Luck + 5) > rn2(20) — simplified without Luck
        return ER_NOTHING;
    } else if (obj.oclass === SCROLL_CLASS) {
        // Scrolls get blanked
        return ER_DAMAGED;
    } else if (obj.oclass === SPBOOK_CLASS) {
        return ER_DAMAGED;
    } else if (obj.oclass === POTION_CLASS) {
        if (obj.odiluted) {
            return ER_DAMAGED;
        } else {
            obj.odiluted = true;
            return ER_DAMAGED;
        }
    } else {
        return erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
}

// C ref: trap.c fire_damage() — fire damage to a single object
export function fire_damage(obj, force, x, y) {
    if (!obj) return false;
    if (!force && rn2(20) < 5) {
        // C ref: (Luck + 5) > rn2(20) — simplified
        return false;
    }
    if (erode_obj(obj, null, ERODE_BURN, EF_DESTROY) === ER_DESTROYED) {
        return true;
    }
    return false;
}

// C ref: trap.c acid_damage() — acid damage to an object
export function acid_damage(obj) {
    if (!obj) return;
    if (obj.greased) {
        grease_protect(obj, null, null);
    } else {
        erode_obj(obj, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
    }
}

// C ref: trap.c water_damage_chain() — apply water damage to inventory chain
export function water_damage_chain(chain, here) {
    if (!chain) return;
    if (Array.isArray(chain)) {
        for (const obj of [...chain]) {
            water_damage(obj, null, false);
        }
    }
}

// C ref: trap.c fire_damage_chain() — apply fire damage to inventory chain
export function fire_damage_chain(chain, force, here, x, y, game = null, player = null) {
    if (!chain) return 0;
    let num = 0;
    if (Array.isArray(chain)) {
        for (const obj of [...chain]) {
            if (fire_damage(obj, force, x, y))
                ++num;
        }
    }
    return num;
}

// ========================================================================
// Petrification — C ref: uhitm.c / mon.c
// ========================================================================

// C ref: uhitm.c selftouch() — hero petrification from wielded cockatrice corpse
export function selftouch(arg, player) {
    // Simplified: check if hero wields a petrifying corpse
    if (!player) return;
    const uwep = player.weapon;
    if (uwep && uwep.otyp === CORPSE && uwep.corpsenm >= 0
        && touch_petrifies(mons[uwep.corpsenm])) {
        // Would call instapetrify — simplified for now
        // Hero petrification not fully ported; just note it
    }
}

// C ref: uhitm.c mselftouch() — monster petrification from wielded cockatrice corpse
export function mselftouch(mon, arg, byplayer) {
    if (!mon) return;
    const mwep = mon.weapon;
    if (mwep && mwep.otyp === CORPSE && mwep.corpsenm >= 0
        && touch_petrifies(mons[mwep.corpsenm])
        && !resists_ston(mon)) {
        minstapetrify(mon, byplayer);
    }
}

// C ref: uhitm.c instapetrify() — instant hero petrification
export function instapetrify(str, player) {
    // Simplified: hero petrification handling
    // Full implementation requires done(STONING) path
}

// C ref: mon.c minstapetrify() — instant monster petrification
function minstapetrify(mon, byplayer) {
    if (!mon) return;
    if (resists_ston(mon)) return;
    // C ref: mon_adjust_speed(mon, -3, NULL) — slow down
    // C ref: monstone(mon) or xkilled(mon) depending on byplayer
    // For now, kill the monster
    mon.mhp = 0;
}

// Autotranslated from trap.c:389
export function mk_trap_statue(x, y, game, player) {
  let mtmp, otmp, statue, mptr, trycount = 10;
  do {
    mptr = mons[rndmonnum()]; // C: &mons[rndmonnum()]
  } while (--trycount > 0 && is_unicorn(mptr) && sgn(player.ualigame.gn.type) === sgn(mptr.maligntyp));
  const mndx = Number.isInteger(mptr?.mndx) ? mptr.mndx : mons.indexOf(mptr);
  statue = mkcorpstat(STATUE, mndx, false, x, y, game?.lev || game?.map || null);
  mtmp = makemon(mptr, 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
  if (!mtmp) return;
  while (mtmp.minvent) {
    otmp = mtmp.minvent;
    otmp.owornmask = 0;
    obj_extract_self(otmp);
    add_to_container(statue, otmp);
  }
  statue.owt = weight(statue);
  mongone(mtmp);
}

// Autotranslated from trap.c:417
export function dng_bottom(lev, player) {
  let bottom = dunlevs_in_dungeon(lev);
  if (In_quest(lev)) {
    let qlocate_depth = qlocate_level.dlevel;
    if (dunlev_reached(lev) < qlocate_depth) bottom = qlocate_depth;
  }
  else if (In_hell(lev)) {
    if (!player.uevent.invoked) {
      bottom -= 1;
    }
  }
  return bottom;
}

// Autotranslated from trap.c:441
export function hole_destination(dst, map) {
  let bottom = dng_bottom(map.uz);
  dst.dnum = map.uz.dnum;
  dst.dlevel = dunlev(map.uz);
  while (dst.dlevel < bottom) {
    dst.dlevel++;
    if (rn2(4)) {
      break;
    }
  }
}

// Autotranslated from trap.c:908
export function activate_statue_trap(trap, x, y, shatter) {
  let mtmp = null, otmp = sobj_at(STATUE, x, y), fail_reason;
  deltrap(trap);
  while (otmp) {
    mtmp = animate_statue(otmp, x, y, shatter ? ANIMATE_SHATTER : ANIMATE_NORMAL, fail_reason);
    if (mtmp || fail_reason !== AS_MON_IS_UNIQUE) {
      break;
    }
    otmp = nxtobj(otmp, STATUE, true);
  }
  feel_newsym(x, y);
  return mtmp;
}

// Autotranslated from trap.c:939
function keep_saddle_with_steedcorpse(steed_mid, objchn, saddle) {
  if (!saddle) return false;
  while (objchn) {
    if (objchn.otyp === CORPSE && has_omonst(objchn)) {
      let mtmp = objchn.oextra?.omonst;
      if (mtmp.m_id === steed_mid) {
        const loc = get_obj_location(objchn, 0);
        if (loc.found) {
          obj_extract_self(saddle);
          place_object(saddle, loc.x, loc.y);
          stackobj(saddle);
        }
        return true;
      }
    }
    if (Has_contents(objchn) && keep_saddle_with_steedcorpse(steed_mid, objchn.cobj, saddle)) return true;
    objchn = objchn.nobj;
  }
  return false;
}

// C ref: trap.c:3845 — hero starts floating up (gaining levitation)
// Prints the appropriate message and calls float_vs_flight().
export async function float_up(player, game) {
    const p = player;
    if (!p) return;
    if (game) game.disp = game.disp || {};
    if (game) game.disp.botl = true;
    // C: trap cases (utrap) — simplified: just handle the common cases
    if (p.utrap) {
        if (p.utraptype === TT_PIT) {
            // reset_utrap handles this separately; just float_vs_flight
        } else {
            await You("float up slightly, but your legs are still stuck.");
        }
    } else if (p.getPropTimeout?.(HALLUC)) {
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else {
        await You("start to float in the air!");
    }
    if (p.flying || p.Flying) await You("are no longer able to control your flight.");
    // C: float_vs_flight() adjusts BFlying/BLevitation block flags
    // Pass a minimal game-like object; polyself.js float_vs_flight uses game.disp.botl
    float_vs_flight(game || { disp: {} }, p);
    // C: encumber_msg() — levitation changes encumbrance; skipped (complex)
}

// C ref: trap.c:3932 — hero stops levitating
// hmask: bits to clear from HLevitation; emask: bits to clear from ELevitation (worn items)
export async function float_down(hmask, emask, player, game) {
    const p = player;
    if (!p) return;
    // Clear the specified levitation sources
    if (hmask && p.uprops?.[LEVITATION]) {
        p.uprops[LEVITATION].intrinsic &= ~hmask;
    }
    if (emask && p.uprops?.[LEVITATION]) {
        p.uprops[LEVITATION].extrinsic &= ~emask;
    }
    // If still levitating from another source, don't land
    const stillLev = p.uprops?.[LEVITATION]
        ? ((p.uprops[LEVITATION].intrinsic | p.uprops[LEVITATION].extrinsic) & (TIMEOUT | 0xFFFFFF))
        : 0;
    if (stillLev) return;
    if (game) game.disp = game.disp || {};
    if (game) game.disp.botl = true;
    float_vs_flight(game || { disp: {} }, p);
    // C: various complex cases (pool, lava, swallowed, Sokoban, air level) — simplified
    if (p.uswallow) {
        await You("float down, but you are still engulfed.");
    } else if (p.getPropTimeout?.(HALLUC)) {
        await pline("Bummer!  You've hit the ground.");
    } else {
        await You("float gently to the %s.", "floor");
    }
    // C: encumber_msg() — skipped (complex)
}

// Autotranslated from trap.c:1030
export function set_utrap(tim, typ, game, player) {
  if (!player.utrap ^ !tim) game.disp.botl = true;
  player.utrap = tim;
  player.utraptype = tim ? typ : TT_NONE;
  // C: float_vs_flight() adjusts BFlying/BLevitation block state
  float_vs_flight(game || { disp: {} }, player);
}

// Autotranslated from trap.c:1045
export async function reset_utrap(msg, player, game) {
  const was_Lev = !!(player?.Levitation || player?.levitating);
  const was_Fly = !!(player?.Flying || player?.flying);
  set_utrap(0, 0, game || { disp: {} }, player);
  if (msg) {
    if (!was_Lev && (player?.Levitation || player?.levitating)) await float_up(player, game);
    if (!was_Fly && (player?.Flying || player?.flying)) await You("can fly.");
  }
}

// Autotranslated from trap.c:3098
export async function blow_up_landmine(trap, map) {
  let x = trap.tx, y = trap.ty, dbx, dby, lev =  map.locations[x][y];
  let old_typ, typ;
  old_typ = lev.typ;
  scatter(x, y, 4, MAY_DESTROY | MAY_HIT | MAY_FRACTURE | VIS_EFFECTS,  0);
  del_engr_at(x, y);
  wake_nearto(x, y, 400, map);
  if (IS_DOOR(lev.typ)) lev.flags = D_BROKEN;
  if (lev.typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
    dbx = x, dby = y;
    if (find_drawbridge( dbx, dby)) destroy_drawbridge(dbx, dby);
  }
  trap = t_at(x, y, map);
  if (trap) {
    if (Is_waterlevel(map.uz) || Is_airlevel(map.uz)) { deltrap(trap); }
    else {
      typ = fillholetyp(x, y, false);
      if (typ !== ROOM) {
        lev.typ = typ;
        liquid_flow(x, y, typ, trap, cansee(x, y) ? "The hole fills with %s!" :  0);
      }
      else {
        trap.ttyp = PIT;
        trap.madeby_u = false;
        seetrap(trap);
      }
    }
  }
  await fill_pit(x, y, map);
  maybe_dunk_boulders(x, y);
  recalc_block_point(x, y);
  spot_checks(x, y, old_typ);
}

// Autotranslated from trap.c:3495
export function feeltrap(trap) {
  trap.tseen = 1;
  map_trap(trap, 1);
  newsym(trap.tx, trap.ty);
}

// Autotranslated from trap.c:3602
export function isclearpath(cc, distance, dx, dy, map) {
  let t, typ, x, y;
  x = cc.x;
  y = cc.y;
  while (distance-- > 0) {
    x += dx;
    y += dy;
    if (!isok(x, y)) return false;
    typ = map.locations[x][y].typ;
    if (!ZAP_POS(typ) || closed_door(x, y)) return false;
    if ((t = t_at(x, y, map)) != null && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp))) return false;
  }
  cc.x = x;
  cc.y = y;
  return true;
}

// Autotranslated from trap.c:3917
export async function fill_pit(x, y, map) {
  let otmp, t;
  if ((t = t_at(x, y, map)) != null && (is_pit(t.ttyp) || is_hole(t.ttyp)) && (otmp = sobj_at(BOULDER, x, y, map)) != null) { obj_extract_self(otmp); await flooreffects(otmp, x, y, "settle"); }
}

// Autotranslated from trap.c:5155
export async function dountrap() {
  if (!could_untrap(true, false)) return ECMD_OK;
  return untrap(false, 0, 0,  0) ? ECMD_TIME : ECMD_OK;
}

// Autotranslated from trap.c:5248
export async function cnv_trap_obj(otyp, cnt, ttmp, bury_it, player, mapRef = null) {
  let otmp = mksobj(otyp, true, false), mtmp;
  const map = mapRef || player?.lev || player?.map || null;
  otmp.quan = cnt;
  otmp.owt = weight(otmp);
  if (otyp !== DART) otmp.opoisoned = 0;
  place_object(otmp, ttmp.tx, ttmp.ty, map);
  if (bury_it) { bury_an_obj(otmp, map, player); }
  else {
    if (ttmp.madeby_u) sellobj(otmp, ttmp.tx, ttmp.ty);
    stackobj(otmp, map);
  }
  newsym(ttmp.tx, ttmp.ty);
  if (player.utrap && u_at(player, ttmp.tx, ttmp.ty)) await reset_utrap(true);
  if (((mtmp = m_at(ttmp.tx, ttmp.ty, map)) != null) && mtmp.mtrapped) mtmp.mtrapped = 0;
  deltrap(map, ttmp);
}

// Autotranslated from trap.c:5282
export function into_vs_onto(traptype) {
  switch (traptype) {
    case BEAR_TRAP:
      case PIT:
        case SPIKED_PIT:
          case HOLE:
            case TELEP_TRAP:
              case LEVEL_TELEP:
                case MAGIC_PORTAL:
                  case WEB:
                    return true;
  }
  return false;
}

// Autotranslated from trap.c:5437
export async function reward_untrap(ttmp, mtmp, game, player) {
  if (!ttmp.madeby_u) {
    const _mdata = mtmp.data || mtmp.type || mons[mtmp.mndx]; // C: mon->data alias
    if (rnl(10) < 8 && !mtmp.mpeaceful && !monHelpless(mtmp) && !mtmp.mfrozen && !mindless(_mdata) && !unique_corpstat(_mdata) && _mdata.mlet !== S_HUMAN) {
      mtmp.mpeaceful = 1;
      set_malign(mtmp);
      await pline("%s is grateful.", Monnam(mtmp));
    }
    if (!rn2(3) && !rnl(8) && player.ualigame.gn.type === A_LAWFUL) { adjalign(1); await You_feel("that you did the right thing."); }
  }
}

// Autotranslated from trap.c:5501
export async function disarm_landmine(ttmp) {
  let fails = try_disarm(ttmp, false);
  if (fails < 2) return fails;
  await You("disarm %s land mine.", the_your[ttmp.madeby_u]);
  await cnv_trap_obj(LAND_MINE, 1, ttmp, false);
  return 1;
}

// Autotranslated from trap.c:5514
function unsqueak_ok(obj) {
  if (!obj) return GETOBJ_EXCLUDE;
  if (obj.otyp === CAN_OF_GREASE) return GETOBJ_SUGGEST;
  if (obj.otyp === POT_OIL && obj.dknown && objectData[POT_OIL].oc_name_known) return GETOBJ_SUGGEST;
  if (obj.oclass === POTION_CLASS) return GETOBJ_DOWNPLAY;
  return GETOBJ_EXCLUDE;
}

// Autotranslated from trap.c:5537
export async function disarm_squeaky_board(ttmp, player) {
  let obj, bad_tool, fails;
  obj = getobj("untrap with", unsqueak_ok, GETOBJ_PROMPT);
  if (!obj) return 0;
  bad_tool = (obj.cursed || ((obj.otyp !== POT_OIL || obj.lamplit) && (obj.otyp !== CAN_OF_GREASE || !obj.spe)));
  fails = try_disarm(ttmp, bad_tool);
  if (fails < 2) return fails;
  if (obj.otyp === CAN_OF_GREASE) { consume_obj_charge(obj, true); }
  else { useup(obj); makeknown(POT_OIL); }
  await You("repair the squeaky board.");
  deltrap(ttmp);
  newsym(player.x + player.dx, player.y + player.dy);
  more_experienced(1, 5);
  await newexplevel();
  return 1;
}

// Autotranslated from trap.c:5571
export async function disarm_shooting_trap(ttmp, otyp) {
  let fails = try_disarm(ttmp, false);
  if (fails < 2) return fails;
  await You("disarm %s trap.", the_your[ttmp.madeby_u]);
  await cnv_trap_obj(otyp, 50 - rnl(50), ttmp, false);
  return 1;
}

// C ref: trap.c:6202 chest_trap(obj, bodypart, disarm)
// Note: this is the trap resolution entry used by lock-picking and untrapping.
export async function chest_trap(obj, bodypart, disarm, game = null, playerArg = null) {
  const player = playerArg || game?.player || game?.u || {};
  const luck = (player.uluck ?? player.luck ?? 0);

  obj.tknown = 0;
  obj.otrapped = 0;
  await You(disarm ? "set it off!" : "trigger a trap!");

  if (luck > -13 && rn2(13 + luck) > 7) {
    let msg = null;
    switch (rn2(13)) {
      case 12:
      case 11:
        msg = "explosive charge is a dud";
        break;
      case 10:
      case 9:
        msg = "electric charge is grounded";
        break;
      case 8:
      case 7:
        msg = "flame fizzles out";
        break;
      case 6:
      case 5:
      case 4:
        msg = "poisoned needle misses";
        break;
      case 3:
      case 2:
      case 1:
      case 0:
        msg = "gas cloud blows away";
        break;
      default:
        msg = null;
        break;
    }
    if (msg) {
      await pline(`But luckily the ${msg}!`);
    }
  } else {
    const traproll = rn2(20) ? ((luck >= 13) ? 0 : rn2(13 - luck)) : rn2(26);
    switch (traproll) {
      case 25:
      case 24:
      case 23:
      case 22:
      case 21:
        await pline(`${Tobjnam(obj, "explode")}!`);
        await losehp(d(6, 6), `exploding ${xname(obj)}`, "KILLED_BY_AN", player, null, game);
        await exercise(player, A_STR, false);
        return true;
      case 20:
      case 19:
      case 18:
      case 17:
        await pline(`A cloud of noxious gas billows from ${the(xname(obj))}.`);
        if (rn2(3)) {
          await poisoned(player, "gas cloud", A_STR, "cloud of poison gas", 15, false);
        }
        await exercise(player, A_CON, false);
        break;
      case 16:
      case 15:
      case 14:
      case 13:
        await You_feel("a needle prick your finger.");
        await poisoned(player, "needle", A_CON, "poisoned needle", 10, false);
        await exercise(player, A_CON, false);
        break;
      case 12:
      case 11:
      case 10:
      case 9:
        await dofiretrap(obj, player, game, game?.map || game?.lev);
        break;
      case 8:
      case 7:
      case 6:
        await You("are jolted by a surge of electricity!");
        await losehp(d(4, 4), "electric shock", "KILLED_BY_AN", player, null, game);
        break;
      case 5:
      case 4:
      case 3:
        if (!player.Free_action) {
          await pline("Suddenly you are frozen in place!");
          player.multi = -(d(5, 6));
          await exercise(player, A_DEX, false);
        } else {
          await You("momentarily stiffen.");
        }
        break;
      case 2:
      case 1:
      case 0:
        await pline(`A cloud of ${(player.Blind ? blindgas[rn2(blindgas.length)] : rndcolor())} gas billows from ${the(xname(obj))}.`);
        const oldStun = typeof player?.getPropTimeout === 'function'
          ? (player.getPropTimeout(STUNNED) || 0)
          : ((player.HStun & TIMEOUT) || 0);
        const oldHall = typeof player?.getPropTimeout === 'function'
          ? (player.getPropTimeout(HALLUC) || 0)
          : ((player.HHallucination & TIMEOUT) || 0);
        if (!oldStun) {
          if (player.Hallucination) {
            await pline("What a groovy feeling!");
          } else {
            const blur = player.Halluc_resistance
              ? ""
              : (player.Blind ? " and get dizzy" : " and your vision blurs");
            const yourData = player.data || game?.youmonst?.data || null;
            await You("%s%s...", yourData ? stagger(yourData, "stagger") : "stagger", blur);
          }
        }
        // trap.c chest_trap(): apply both statuses after message branch.
        await make_stunned(player, oldStun + rn1(7, 16), false);
        await make_hallucinated(player, oldHall + rn1(5, 16), false, 0);
        break;
      default:
        break;
    }
  }

  obj.tknown = 1;
  return false;
}

// Autotranslated from trap.c:5701
export async function disarm_box(box, force, confused, player) {
  if (box.otrapped) {
    let ch = acurr(player,A_DEX) + player.ulevel;
    if (Role_if(player, PM_ROGUE)) {
      ch *= 2;
    }
    if (!force && (confused || Fumbling || rnd(75 + Math.floor(level_difficulty() / 2)) > ch)) { await chest_trap(box, FINGER, true); }
    else {
      await You("disarm it!");
      box.otrapped = 0;
      box.tknown = 1;
      more_experienced(8, 0);
      await newexplevel();
    }
    await exercise(player, A_DEX, true);
  }
  else { await pline("That %s was not trapped.", xname(box)); box.tknown = 0; }
}

// Autotranslated from trap.c:5728
export async function untrap_box(box, force, confused, player) {
  if ((box.otrapped && (force || (!confused && rn2(MAXULEV + 1 - player.ulevel) < 10))) || box.tknown || (!force && confused && !rn2(3))) {
    if (!(box.tknown && box.dknown)) await You("find a trap on %s!", the(xname(box)));
    else {
      await pline("There's a trap on %s.", the(xname(box)));
    }
    box.tknown = 1;
    observe_object(box);
    if (!confused) await exercise(player, A_WIS, true);
    if (ynq("Disarm it?") === 'y') await disarm_box(box, force, confused);
  }
  else { await You("find no traps on %s.", the(xname(box))); }
}

// Autotranslated from trap.c:6423
export function count_traps(ttyp) {
  let ret = 0, trap = gf.ftrap;
  while (trap) {
    if ( trap.ttyp === ttyp) ret++;
    trap = trap.ntrap;
  }
  return ret;
}

// xytod imported from cmd.js

// Autotranslated from trap.c:6460
export function conjoined_pits(trap2, trap1, u_entering_trap2, player) {
  let dx, dy, diridx, adjidx;
  if (!trap1 || !trap2) return false;
  if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty) || !is_pit(trap2.ttyp) || !is_pit(trap1.ttyp) || (u_entering_trap2 && !(player.utrap && player.utraptype === TT_PIT))) return false;
  dx = sgn(trap2.tx - trap1.tx);
  dy = sgn(trap2.ty - trap1.ty);
  diridx = xytod(dx, dy);
  if (diridx !== DIR_ERR) {
    adjidx = DIR_180(diridx);
    if ((trap1.conjoined & (1 << diridx)) && (trap2.conjoined & (1 << adjidx))) return true;
  }
  return false;
}

// Autotranslated from trap.c:6488
export function clear_conjoined_pits(trap, map) {
  let diridx, adjidx, x, y, t;
  if (trap && is_pit(trap.ttyp)) {
    for (diridx = 0; diridx < N_DIRS; ++diridx) {
      if (trap.conjoined & (1 << diridx)) {
        x = trap.tx + xdir[diridx];
        y = trap.ty + ydir[diridx];
        if (isok(x, y) && (t = t_at(x, y, map)) != null && is_pit(t.ttyp)) { adjidx = DIR_180(diridx); t.conjoined &= ~(1 << adjidx); }
        trap.conjoined &= ~(1 << diridx);
      }
    }
  }
}

// Autotranslated from trap.c:6512
export function adj_nonconjoined_pit(adjtrap, player) {
  const map = player?.lev || player?.map || null;
  let trap_with_u = map ? t_at(player.x0, player.y0, map) : null;
  if (trap_with_u && adjtrap && player.utrap && player.utraptype === TT_PIT && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp)) {
    if (xytod(player.dx, player.dy) !== DIR_ERR) return true;
  }
  return false;
}

// Autotranslated from trap.c:6556
export function uteetering_at_seen_pit(trap, player) {
  return (trap && is_pit(trap.ttyp) && trap.tseen && u_at(player, trap.tx, trap.ty) && !(player.utrap && player.utraptype === TT_PIT));
}

// Autotranslated from trap.c:6568
export function uescaped_shaft(trap, player) {
  return (trap && is_hole(trap.ttyp) && trap.tseen && u_at(player, trap.tx, trap.ty));
}

// Autotranslated from trap.c:6576
export async function delfloortrap(ttmp, player) {
  if (ttmp && ((ttmp.ttyp === SQKY_BOARD) || (ttmp.ttyp === BEAR_TRAP) || (ttmp.ttyp === LANDMINE) || (ttmp.ttyp === FIRE_TRAP) || is_pit(ttmp.ttyp) || is_hole(ttmp.ttyp) || (ttmp.ttyp === TELEP_TRAP) || (ttmp.ttyp === LEVEL_TELEP) || (ttmp.ttyp === WEB) || (ttmp.ttyp === MAGIC_TRAP) || (ttmp.ttyp === ANTI_MAGIC))) {
    let mtmp;
    if (u_at(player, ttmp.tx, ttmp.ty)) {
      if (player.utraptype !== TT_BURIEDBALL) await reset_utrap(true);
    }
    else if ((mtmp = m_at(ttmp.tx, ttmp.ty, player?.lev || player?.map)) != null) { mtmp.mtrapped = 0; }
    deltrap(ttmp);
    return true;
  }
  return false;
}

// Autotranslated from trap.c:6602
export async function b_trapped(item, bodypart, player) {
  let lvl = level_difficulty(), dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.floor(lvl / 2)));
  await pline("KABOOM!! %s was booby-trapped!", The(item));
  wake_nearby(false);
  await losehp(Maybe_Half_Phys(dmg), "explosion", KILLED_BY_AN);
  await exercise(player, A_STR, false);
  if (bodypart !== NO_PART) await exercise(player, A_CON, false);
  await make_stunned((HStun & TIMEOUT) +  dmg, true);
}

// Autotranslated from trap.c:6899
export async function sink_into_lava(player) {
  let sink_deeper = "You sink deeper into the lava.";
  if (!player.utrap || player.utraptype !== TT_LAVA) {
  }
  else if (!is_lava(player.x, player.y)) { await reset_utrap(false); }
  else if (!player.uinvulnerable) {
    if (!Fire_resistance) player.hp = Math.floor((player.hp + 2) / 3);
    player.utrap -= (1 << 8);
    if (player.utrap < (1 << 8)) {
      svk.killer.format = KILLED_BY;
      svk.killer.name = "molten lava";
      await urgent_pline("You sink below the surface and die.");
      await burn_away_slime();
      await done(DISSOLVED);
      await reset_utrap(true);
      if (!(player?.Levitation || player?.levitating || false) && !(player?.Flying || player?.flying || false)) {
        await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT);
      }
    }
    else if (!player.umoved) {
      if (Slimed && rnd(10 - 1) >= Math.trunc(Slimed & TIMEOUT)) { await pline(sink_deeper); await burn_away_slime(); }
      else { await Norep(sink_deeper); }
      player.utrap += rnd(4);
    }
  }
}

// Autotranslated from trap.c:7080
export async function trap_ice_effects(x, y, ice_is_melting, map) {
  let ttmp = t_at(x, y, map);
  if (ttmp && ice_is_melting) {
    let mtmp;
    if (((mtmp = m_at(x, y, map)) != null) && mtmp.mtrapped) mtmp.mtrapped = 0;
    if (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP) {
      let otyp = (ttmp.ttyp === LANDMINE) ? LAND_MINE : BEARTRAP;
      await cnv_trap_obj(otyp, 1, ttmp, true);
    }
    else {
      if (!undestroyable_trap(ttmp.ttyp)) deltrap(ttmp);
    }
  }
}

// Autotranslated from trap.c:7103
export function trap_sanity_check() {
  let ttmp = gf.ftrap;
  while (ttmp) {
    if (!isok(ttmp.tx, ttmp.ty)) impossible("trap sanity: location (%i,%i)", ttmp.tx, ttmp.ty);
    if (ttmp.ttyp <= NO_TRAP || ttmp.ttyp >= TRAPNUM) impossible("trap sanity: type (%i)", ttmp.ttyp);
    ttmp = ttmp.ntrap;
  }
}

// ========================================================================
// Player-side trap effect functions — C ref: trap.c trapeffect_*()
// Each mirrors the if (mtmp == &gy.youmonst) branch in C.
// Naming: trapeffect_*_you() to distinguish from existing _mon() functions.
// ========================================================================

// C ref: trap.c:3028 steedintrap() — apply trap effects to player's steed
// Returns Trap_Killed_Mon if steed died, 1 if steed was hit, 0 otherwise.
async function steedintrap(trap, otmp, player, game, map) {
    const steed = player?.usteed;
    if (!steed || !trap) return Trap_Effect_Finished;
    const tt = trap.ttyp;
    steed.mx = player.x;
    steed.my = player.y;
    let trapkilled = false;
    let steedhit = false;

    switch (tt) {
    case ARROW_TRAP:
        if (!otmp) return Trap_Effect_Finished; // impossible
        trapkilled = thitm(8, steed, otmp, 0, false, map, player);
        steedhit = true;
        break;
    case DART_TRAP:
        if (!otmp) return Trap_Effect_Finished; // impossible
        trapkilled = thitm(7, steed, otmp, 0, false, map, player);
        steedhit = true;
        break;
    case SLP_GAS_TRAP:
        if (!resists_sleep(steed) && !breathless(mons[steed.mndx] || {})
                && !monHelpless(steed)) {
            if (sleep_monst(steed, rnd(25), -1))
                await pline('%s suddenly falls asleep!', Monnam(steed));
        }
        steedhit = true;
        break;
    case LANDMINE:
        trapkilled = thitm(0, steed, null, rnd(16), false, map, player);
        steedhit = true;
        break;
    case PIT:
    case SPIKED_PIT:
        trapkilled = (DEADMONSTER(steed)
            || thitm(0, steed, null, rnd(tt === PIT ? 6 : 10), false, map, player));
        steedhit = true;
        break;
    case POLY_TRAP:
        if (!resists_magm(steed) && !resist(steed, WAND_CLASS)) {
            // C: newcham(steed, NULL, NC_SHOW_MSG) — poly steed; not ported
        }
        steedhit = true;
        break;
    default:
        break;
    }

    if (trapkilled) {
        // C: dismount_steed(DISMOUNT_POLY) — not fully ported
        player.usteed = null;
        return Trap_Killed_Mon;
    }
    return steedhit ? 1 : 0;
}

// C ref: trap.c:4141 dofiretrap() — fire trap effect on player
// Called with null box for floor fire trap.
async function dofiretrap(box, player, game, map) {
    const orig_dmg = d(2, 4);
    let num = orig_dmg;

    // C: Underwater / is_pool check — simplified
    const underwater = !!(player?.Underwater || player?.underwater);
    if (underwater) {
        await pline('A cascade of steamy bubbles erupts from %s!',
                    box ? 'a box' : 'the ground beneath you');
        if (!(player?.Fire_resistance || player?.fireResistance)) {
            await losehp(rnd(3), 'boiling water', 2 /*KILLED_BY*/, player, game?.display, game);
        } else {
            await You('are uninjured.');
        }
        return;
    }
    await pline('A %s %s from %s!', tower_of_flame,
                box ? 'bursts' : 'erupts',
                box ? 'a box' : 'the ground beneath you');
    if (player?.Fire_resistance || player?.fireResistance) {
        // shieldeff() — visual only, not ported
        num = rn2(2);
    } else {
        // Polymorph form special damage — simplified
        const umonnum = player?.u_mndx || player?.umonnum;
        if (umonnum) {
            let alt = 0;
            switch (umonnum) {
            case PM_PAPER_GOLEM:  alt = player.mhmax || player.uhpmax || 0; break;
            case PM_STRAW_GOLEM:  alt = Math.floor((player.mhmax || player.uhpmax || 0) / 2); break;
            case PM_WOOD_GOLEM:   alt = Math.floor((player.mhmax || player.uhpmax || 0) / 4); break;
            case PM_LEATHER_GOLEM: alt = Math.floor((player.mhmax || player.uhpmax || 0) / 8); break;
            }
            if (alt > num) num = alt;
        } else {
            num = d(2, 4);
            // C: reduce uhpmax by rn2(num+1) — simplified
            if (player?.uhpmax !== undefined) {
                player.uhpmax = Math.max(1, player.uhpmax - rn2(num + 1));
                if (player.uhp > player.uhpmax) player.uhp = player.uhpmax;
            }
        }
    }
    if (!num)
        await You('are uninjured.');
    else
        await losehp(num, tower_of_flame, 3 /*KILLED_BY_AN*/, player, game?.display, game);
    // C ref: if (burnarmor(&youmonst) || rn2(3)) { destroy_items; ignite_items }
    if (burnarmor(player, player) || rn2(3)) {
        // destroy_items/ignite_items — not ported (cosmetic)
    }
}

// C ref: trap.c:4225 domagictrap() — magic trap random effects
async function domagictrap(player, game, map) {
    const fate = rnd(20);
    if (fate < 10) {
        // Monsters + blindness + deafness effects
        const cnt = rnd(4);
        const blindRes = !!(player?.blind_resistance || player?.Blind_resistance);
        if (!blindRes) {
            await You('are momentarily blinded by a flash of light!');
            make_blinded(player, rn1(5, 10), false);
        } else if (!(player?.Blind || player?.blind)) {
            await pline('You see a flash of light!');
        }
        if (!(player?.Deaf || player?.deaf)) {
            await You_hear('a deafening roar!');
            // C: incr_itimeout(&HDeaf, rn1(20,30)) — not ported
            rn1(20, 30);
        } else {
            await pline('You feel rankled.');
            rn1(5, 15);
        }
        // C: makemon() cnt times — not ported; consume cnt RNG calls approx
        // C: wake_nearto(u.ux, u.uy, 49) — simplified
        wake_nearby(false, player);
    } else {
        switch (fate) {
        case 10:
            // nothing happens
            break;
        case 11: // toggle intrinsic invisibility
            await You_hear('a low hum.');
            // C: toggle HInvis — not ported
            break;
        case 12: // flash of fire
            await dofiretrap(null, player, game, map);
            break;
        case 13:
            await pline('A shiver runs up and down your spine!');
            break;
        case 14:
            await You_hear('distant howling.');
            break;
        case 15:
            await pline('You feel like you are being watched.');
            break;
        case 16:
            await pline('You feel momentarily dizzy.');
            // C: make_confused() — not ported
            break;
        case 17:
            await You('feel a wrenching sensation.');
            // C: tele() — not ported
            break;
        case 18:
            await pline('You feel a strange vibration.');
            break;
        case 19:
        case 20:
            // C: plnamesiz things — just a message
            await pline('You feel lucky!');
            break;
        default:
            break;
        }
    }
}

// C ref: trap.c:603 fall_through() — player falls through hole/trapdoor
// inverted: FALSE for hole, TRUE for trapdoor (you fall up?)
// C: complex level migration; stub outputs message and notes TODO
async function fall_through(inverted, plunged, player, game, map) {
    seetrap(t_at(player.x, player.y, map) || {});
    await You('%s through the %s.',
              inverted ? 'fall' : (plunged ? 'plunge' : 'fall'),
              inverted ? 'trap door' : 'hole');
    // TODO: full level migration (newlevel, etc.) not yet ported
}

// ========================================================================
// Player-side trapeffect_* functions — faithful to C player branch
// ========================================================================

// C ref: trap.c:1183 trapeffect_arrow_trap — player branch
async function trapeffect_arrow_trap_you(trap, trflags, player, game, map) {
    if (trap.once && trap.tseen && !rn2(15)) {
        await You_hear('a loud click!');
        deltrap(map, trap);
        newsym(player.x, player.y);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    seetrap(trap);
    await pline('An arrow shoots out at you!');
    const otmp = t_missile(ARROW, trap);
    if (player.usteed && !rn2(2) && await steedintrap(trap, otmp, player, game, map)) {
        /* steed was hit — nothing more */
    } else if (await thitu(8, dmgval(otmp, player), otmp, 'arrow',
                           player, game?.display, game)) {
        /* player was hit — arrow consumed */
    } else {
        place_object(otmp, player.x, player.y, map);
        stackobj(otmp, map);
        newsym(player.x, player.y);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1241 trapeffect_dart_trap — player branch
async function trapeffect_dart_trap_you(trap, trflags, player, game, map) {
    const oldumort = player.umortality || 0;
    if (trap.once && trap.tseen && !rn2(15)) {
        await You_hear('a soft click.');
        deltrap(map, trap);
        newsym(player.x, player.y);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    seetrap(trap);
    await pline('A little dart shoots out at you!');
    const otmp = t_missile(DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1;
    if (player.usteed && !rn2(2) && await steedintrap(trap, otmp, player, game, map)) {
        /* steed was hit */
    } else if (await thitu(7, dmgval(otmp, player), otmp, 'little dart',
                           player, game?.display, game)) {
        if (otmp && otmp.opoisoned) {
            // C: poisoned("dart", A_CON, "little dart", mortality_triggered ? 0 : 10, TRUE)
            const maxdam = (player.umortality || 0) > oldumort ? 0 : 10;
            await poisoned(player, 'dart', A_CON, maxdam, true);
        }
    } else {
        place_object(otmp, player.x, player.y, map);
        stackobj(otmp, map);
        newsym(player.x, player.y);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1313 trapeffect_rocktrap — player branch
async function trapeffect_rocktrap_you(trap, trflags, player, game, map) {
    if (trap.once && trap.tseen && !rn2(15)) {
        await pline('A trap door in the ceiling opens, but nothing falls out!');
        deltrap(map, trap);
        newsym(player.x, player.y);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    feeltrap(trap);
    const dmg = d(2, 6);
    const otmp = t_missile(ROCK, trap);
    place_object(otmp, player.x, player.y, map);
    await pline('A trap door in the ceiling opens and a rock falls on your head!');
    // C: helmet check, passes_rocks check — simplified
    const uarmh = player.helmet;
    let harmless = false;
    if (!uarmh) {
        // C: passes_rocks check
        const mdat = player.youmonst ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;
        if (mdat && passes_walls(mdat)) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
    } else if (/* hard helmet */ uarmh.oartifact || (uarmh.otyp > 0)) {
        await pline('Fortunately, you are wearing a helmet.');
        // reduced dmg handled by losehp below — use actual d(2,6) result
    }
    stackobj(otmp, map);
    newsym(player.x, player.y);
    if (!harmless) {
        await losehp(dmg, 'falling rock', 3 /*KILLED_BY_AN*/, player, game?.display, game);
        await exercise(player, A_STR, false);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1392 trapeffect_sqky_board — player branch
async function trapeffect_sqky_board_you(trap, trflags, player, game) {
    const forcetrap = ((trflags & FORCETRAP) !== 0
        || (trflags & FAILEDUNTRAP) !== 0
        || ((player?.Flying || player?.flying) && (trflags & VIASITTING) !== 0));
    const lev = !!(player?.Levitation || player?.levitating);
    const fly = !!(player?.Flying || player?.flying);
    if ((lev || fly) && !forcetrap) {
        seetrap(trap);
        if (player?.Hallucination || player?.hallucinating)
            await You('notice a crease in the linoleum.');
        else
            await You('notice a loose board below you.');
    } else {
        seetrap(trap);
        const isDeaf = !!(player?.Deaf || player?.deaf);
        if (isDeaf) {
            await pline('A board beneath you vibrates.');
        } else {
            const note = trapnote(trap);
            await pline('A board beneath you squeaks %s loudly.', note);
        }
        wake_nearby(false, player);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1468 trapeffect_bear_trap — player branch
async function trapeffect_bear_trap_you(trap, trflags, player, game, map) {
    const forcetrap = ((trflags & FORCETRAP) !== 0
        || (trflags & FAILEDUNTRAP) !== 0
        || (trflags & VIASITTING) !== 0);
    const lev = !!(player?.Levitation || player?.levitating);
    const fly = !!(player?.Flying || player?.flying);
    const dmg = d(2, 4);

    if ((lev || fly) && !forcetrap) return Trap_Effect_Finished;
    feeltrap(trap);
    const youdata = player.youmonst ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;
    if (youdata && (amorphous(youdata) || is_whirly(youdata) || unsolid(youdata))) {
        await pline('%s bear trap closes harmlessly through you.',
                    A_Your[trap.madeby_u ? 1 : 0]);
        return Trap_Effect_Finished;
    }
    if (!player.usteed && youdata && (youdata.msize || 0) <= MZ_SMALL) {
        await pline('%s bear trap closes harmlessly over you.',
                    A_Your[trap.madeby_u ? 1 : 0]);
        return Trap_Effect_Finished;
    }
    set_utrap(rn1(4, 4), TT_BEARTRAP, game, player);
    if (player.usteed) {
        await pline('%s bear trap closes on %s foot!',
                    A_Your[trap.madeby_u ? 1 : 0], Monnam(player.usteed) + "'s");
        if (thitm(0, player.usteed, null, dmg, false, map, player))
            await reset_utrap(true, player, game);  // steed died
    } else {
        await pline('%s bear trap closes on your foot!',
                    A_Your[trap.madeby_u ? 1 : 0]);
        set_wounded_legs(rn2(2) ? 1/*RIGHT_SIDE*/ : 0/*LEFT_SIDE*/, rn1(10, 10), player);
        await losehp(dmg, 'bear trap', 3 /*KILLED_BY_AN*/, player, game?.display, game);
    }
    await exercise(player, A_DEX, false);
    return Trap_Effect_Finished;
}

// C ref: trap.c:1548 trapeffect_slp_gas_trap — player branch
async function trapeffect_slp_gas_trap_you(trap, trflags, player, game, map) {
    seetrap(trap);
    const youdata = player.youmonst ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;
    const sleepRes = !!(player?.Sleep_resistance || player?.sleepResistance);
    const noBreath = !!(youdata && breathless(youdata));
    if (sleepRes || noBreath) {
        await You('are enveloped in a cloud of gas!');
    } else {
        await pline('A cloud of gas puts you to sleep!');
        fall_asleep(-rnd(25), true);
    }
    await steedintrap(trap, null, player, game, map);
    return Trap_Effect_Finished;
}

// C ref: trap.c:1580 trapeffect_rust_trap — player branch
async function trapeffect_rust_trap_you(trap, trflags, player, game, map) {
    seetrap(trap);
    // C: switch(rn2(5)) hits different body parts with water damage
    switch (rn2(5)) {
    case 0:
        await pline('%s you on the head!', A_gush_of_water_hits);
        water_damage(player.helmet, 'helmet', true);
        break;
    case 1:
        await pline('%s your left arm!', A_gush_of_water_hits);
        if (water_damage(player.shield, 'shield', true) !== ER_NOTHING)
            break;
        if (player.twoweap && player.swapWeapon)
            water_damage(player.swapWeapon, null, true);
        water_damage(player.gloves, 'gloves', true);
        break;
    case 2:
        await pline('%s your right arm!', A_gush_of_water_hits);
        water_damage(player.weapon, null, true);
        water_damage(player.gloves, 'gloves', true);
        break;
    default:
        await pline('%s you!', A_gush_of_water_hits);
        // C: splash lit items, then armor chain
        if (player.cloak)
            water_damage(player.cloak, 'cloak', true);
        else if (player.armor)
            water_damage(player.armor, 'armor', true);
        else if (player.shirt)
            water_damage(player.shirt, 'shirt', true);
        break;
    }
    // C: update_inventory()
    // C: iron golem rusting; gremlin splitting — consume rn2(3) for parity
    const umonnum = player?.u_mndx || player?.umonnum;
    if (umonnum === PM_IRON_GOLEM) {
        await You('are covered with rust!');
        // C: losehp(u.mhmax, "rusting away", KILLED_BY)
        const dam = player.mhmax || player.uhpmax || 1;
        await losehp(dam, 'rusting away', 2 /*KILLED_BY*/, player, game?.display, game);
    } else if (umonnum === PM_GREMLIN && rn2(3)) {
        // C: split_mon(&youmonst, NULL) — not ported
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1715 trapeffect_fire_trap — player branch
async function trapeffect_fire_trap_you(trap, trflags, player, game, map) {
    seetrap(trap);
    await dofiretrap(null, player, game, map);
    return Trap_Effect_Finished;
}

// C ref: trap.c:1810 trapeffect_pit — player branch
async function trapeffect_pit_you(trap, trflags, player, game, map) {
    const ttype = trap.ttyp;
    const plunged = (trflags & TOOKPLUNGE) !== 0;
    const viasitting = (trflags & VIASITTING) !== 0;
    const conj_pit = conjoined_pits(trap, t_at(player.x0, player.y0, map), true, player);
    const adj_pit = adj_nonconjoined_pit(trap, player);
    const already_known = !!trap.tseen;
    const lev = !!(player?.Levitation || player?.levitating);
    const fly = !!(player?.Flying || player?.flying);
    const inSokoban = !!(player?.inSokoban || player?.sokoban);
    const youdata = player.youmonst ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;

    // C: Sokoban bypass — can't escape
    if (!inSokoban && (lev || (fly && !plunged && !viasitting)))
        return Trap_Effect_Finished;
    feeltrap(trap);
    if (!inSokoban && youdata && is_clinger(youdata) && !plunged) {
        if (already_known)
            await pline('You see %s %spit below you.',
                        a_your[trap.madeby_u ? 1 : 0],
                        ttype === SPIKED_PIT ? 'spiked ' : '');
        else {
            await pline('%s pit %sopens up under you!',
                        A_Your[trap.madeby_u ? 1 : 0],
                        ttype === SPIKED_PIT ? 'full of spikes ' : '');
            await You("don't fall in!");
        }
        return Trap_Effect_Finished;
    }
    if (!inSokoban) {
        if (player.usteed) {
            if ((trflags & RECURSIVETRAP) !== 0)
                await You('and %s fall into %s pit!',
                          mon_nam(player.usteed), a_your[trap.madeby_u ? 1 : 0]);
            else
                await You('lead %s into %s pit!',
                          mon_nam(player.usteed), a_your[trap.madeby_u ? 1 : 0]);
        } else if (conj_pit) {
            await You('move into an adjacent pit.');
        } else if (adj_pit) {
            await You('stumble over debris%s.',
                      !rn2(5) ? ' between the pits' : '');
        } else {
            await You('%s into %s pit!',
                      !plunged ? 'fall' : (fly ? 'dive' : 'plunge'),
                      a_your[trap.madeby_u ? 1 : 0]);
        }
    }
    // C: wumpus reference, pit viper message
    const umonnum = player?.u_mndx || player?.umonnum;
    if (umonnum === PM_PIT_VIPER || umonnum === PM_PIT_FIEND)
        await pline("How pitiful.  Isn't that the pits?");

    if (ttype === SPIKED_PIT) {
        if (player.usteed)
            await pline('%s %s on a set of sharp iron spikes!',
                        Monnam(player.usteed), conj_pit ? 'steps' : 'lands');
        else
            await You('%s on a set of sharp iron spikes!',
                      conj_pit ? 'step' : 'land');
    }
    set_utrap(rn1(6, 2), TT_PIT, game, player);
    if (!await steedintrap(trap, null, player, game, map)) {
        if (ttype === SPIKED_PIT) {
            const oldumort = player.umortality || 0;
            const spdmg = conj_pit ? rnd(4) : adj_pit ? rnd(6) : rnd(10);
            await losehp(spdmg,
                         plunged ? 'deliberately plunged into a pit of iron spikes'
                         : (conj_pit || already_known) ? 'stepped into a pit of iron spikes'
                         : adj_pit ? 'stumbled into a pit of iron spikes'
                         : 'fell into a pit of iron spikes',
                         0 /*NO_KILLER_PREFIX*/, player, game?.display, game);
            if (!rn2(6))
                await poisoned(player, 'spikes', A_STR,
                               (player.umortality || 0) > oldumort ? 0 : 8, false);
        } else {
            if (!conj_pit && !already_known
                    && !(plunged && (fly || (youdata && is_clinger(youdata)))))
                await losehp(rnd(adj_pit ? 3 : 6),
                             plunged ? 'deliberately plunged into a pit'
                             : 'fell into a pit',
                             0 /*NO_KILLER_PREFIX*/, player, game?.display, game);
        }
        // C: Punished ball handling, selftouch, vision recalc
        if (!conj_pit) selftouch('Falling, you', player);
        await exercise(player, A_STR, false);
        await exercise(player, A_DEX, false);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:1991 trapeffect_hole — player branch
async function trapeffect_hole_you(trap, trflags, player, game, map) {
    // C: Can_fall_thru check
    const canFallThru = !(player?.inAir || player?.airlevel);
    if (!canFallThru) {
        seetrap(trap);
        return Trap_Effect_Finished;
    }
    await fall_through(false, (trflags & TOOKPLUNGE) !== 0, player, game, map);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2048 trapeffect_telep_trap — player branch
async function trapeffect_telep_trap_you(trap, trflags, player, game, map) {
    seetrap(trap);
    await tele_trap(trap, game);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2066 trapeffect_level_telep — player branch
async function trapeffect_level_telep_you(trap, trflags, player, game, map) {
    seetrap(trap);
    await level_tele_trap(trap, trflags, game);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2084 trapeffect_web — player branch
async function trapeffect_web_you(trap, trflags, player, game, map) {
    const webmsgok = (trflags & NOWEBMSG) === 0;
    const forcetrap = ((trflags & FORCETRAP) !== 0 || (trflags & FAILEDUNTRAP) !== 0);
    const viasitting = (trflags & VIASITTING) !== 0;
    const youdata = player.youmonst ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;

    feeltrap(trap);
    // C: mu_maybe_destroy_web — flaming/acidic player form destroys web
    if (youdata && (flaming(youdata) || acidic(youdata))) {
        if (webmsgok)
            await pline('You burn through %s spider web!', a_your[trap.madeby_u ? 1 : 0]);
        deltrap(map, trap);
        newsym(player.x, player.y);
        return Trap_Effect_Finished;
    }
    if (youdata && webmaker(youdata)) {
        if (webmsgok)
            await pline(trap.madeby_u ? 'You take a walk on your web.'
                        : 'There is a spider web here.');
        return Trap_Effect_Finished;
    }
    if (webmsgok) {
        if (forcetrap || viasitting)
            await You('are caught by %s spider web!', a_your[trap.madeby_u ? 1 : 0]);
        else if (player.usteed)
            await You('lead %s into %s spider web!',
                      mon_nam(player.usteed), a_your[trap.madeby_u ? 1 : 0]);
        else
            await You('stumble into %s spider web!', a_your[trap.madeby_u ? 1 : 0]);
    }
    set_utrap(1, TT_WEB, game, player);

    // Time in web depends on strength
    const str = acurr(player, A_STR);
    let tim;
    if (str <= 3)      tim = rn1(6, 6);
    else if (str < 6)  tim = rn1(6, 4);
    else if (str < 9)  tim = rn1(4, 4);
    else if (str < 12) tim = rn1(4, 2);
    else if (str < 15) tim = rn1(2, 2);
    else if (str < 18) tim = rnd(2);
    else if (str < 69) tim = 1;
    else {
        tim = 0;
        if (webmsgok)
            await You('tear through %s web!', a_your[trap.madeby_u ? 1 : 0]);
        deltrap(map, trap);
        newsym(player.x, player.y);
    }
    set_utrap(tim, TT_WEB, game, player);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2257 trapeffect_statue_trap — player branch
async function trapeffect_statue_trap_you(trap, trflags, player, game, map) {
    activate_statue_trap(trap, player.x, player.y, false);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2271 trapeffect_magic_trap — player branch
async function trapeffect_magic_trap_you(trap, trflags, player, game, map) {
    seetrap(trap);
    if (!rn2(30)) {
        deltrap(map, trap);
        newsym(player.x, player.y);
        await You('are caught in a magical explosion!');
        await losehp(rnd(10), 'magical explosion', 3 /*KILLED_BY_AN*/,
                     player, game?.display, game);
        await pline('Your body absorbs some of the magical energy!');
        if (player.uen !== undefined) {
            player.uenmax = (player.uenmax || 0) + 2;
            player.uen = player.uenmax;
        }
        return Trap_Effect_Finished;
    }
    await domagictrap(player, game, map);
    await steedintrap(trap, null, player, game, map);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2301 trapeffect_anti_magic — player branch
async function trapeffect_anti_magic_you(trap, trflags, player, game, map) {
    seetrap(trap);
    const antimagic = !!(player?.Antimagic || player?.antimagic);
    if (antimagic) {
        // C: resist(gy.youmonst, ...) — Antimagic case: take damage
        let dmgval2 = rnd(4);
        // C: Half_physical_damage || Half_spell_damage → +rnd(4)
        if (player.Half_physical_damage || player.Half_spell_damage)
            dmgval2 += rnd(4);
        // C: u_wield_art(ART_MAGICBANE) → +rnd(4)
        if (player.wield_magicbane) dmgval2 += rnd(4);
        // C: carried artifact bonus → +rnd(4) — simplified
        // C: Passes_walls → dmgval2 = (dmgval2+3)/4
        if (player.Passes_walls || player.passes_walls)
            dmgval2 = Math.floor((dmgval2 + 3) / 4);
        const hp = (player.Upolyd || player.upolyd) ? (player.mh || 0) : (player.uhp || 0);
        const feeling = dmgval2 >= hp ? 'unbearably torpid!'
            : dmgval2 >= Math.floor(hp / 4) ? 'very lethargic.'
            : 'sluggish.';
        await pline('You feel %s', feeling);
        await losehp(dmgval2, 'anti-magic implosion', 3 /*KILLED_BY_AN*/,
                     player, game?.display, game);
    }
    // Energy drain
    const drain = d(2, 6);
    const halfd = rnd(Math.floor(drain / 2));
    let actualDrain = drain;
    if ((player.uenmax || 0) > drain) {
        player.uenmax -= halfd;
        actualDrain -= halfd;
    }
    // C: drain_en(actualDrain, exclaim) — drain current energy
    if (player.uen !== undefined) {
        player.uen = Math.max(0, (player.uen || 0) - actualDrain);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:2413 trapeffect_poly_trap — player branch
async function trapeffect_poly_trap_you(trap, trflags, player, game, map) {
    const viasitting = (trflags & VIASITTING) !== 0;
    seetrap(trap);
    if (viasitting)
        await You('trigger a polymorph trap!');
    else if (player.usteed)
        await You('lead %s onto a polymorph trap!', mon_nam(player.usteed));
    else
        await You('step onto a polymorph trap!');
    const antimagic = !!(player?.Antimagic || player?.antimagic);
    const unchanging = !!(player?.Unchanging || player?.unchanging);
    if (antimagic || unchanging) {
        await pline('You feel momentarily different.');
    } else {
        await steedintrap(trap, null, player, game, map);
        deltrap(map, trap);
        newsym(player.x, player.y);
        await pline('You feel a change coming over you.');
        // C: polyself(POLY_NOFLAGS) — not fully ported
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c:2464 trapeffect_landmine — player branch
async function trapeffect_landmine_you(trap, trflags, player, game, map) {
    const already_seen = !!trap.tseen;
    const forcetrap = ((trflags & FORCETRAP) !== 0 || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const lev = !!(player?.Levitation || player?.levitating);
    const fly = !!(player?.Flying || player?.flying);

    if ((lev || fly) && !forcetrap) {
        if (!already_seen && rn2(3)) return Trap_Effect_Finished;
        feeltrap(trap);
        await pline('%s %s in a pile of soil below you.',
                    already_seen ? 'There is' : 'You discover',
                    trap.madeby_u ? 'the trigger of your mine' : 'a trigger');
        if (already_seen && rn2(3)) return Trap_Effect_Finished;
        await pline('KAABLAMM!!!  %s %s%s off!',
                    forcebungle ? 'Your inept attempt sets'
                    : 'The air currents set',
                    already_seen ? a_your[trap.madeby_u ? 1 : 0] : '',
                    already_seen ? ' land mine' : 'it');
    } else {
        feeltrap(trap);
        await pline('KAABLAMM!!!  You triggered %s land mine!',
                    a_your[trap.madeby_u ? 1 : 0]);
        if (player.usteed) await steedintrap(trap, null, player, game, map);
        set_wounded_legs(0 /*LEFT_SIDE*/, rn1(35, 41), player);
        set_wounded_legs(1 /*RIGHT_SIDE*/, rn1(35, 41), player);
        await exercise(player, A_DEX, false);
    }
    // C: trap->ttyp = PIT; blow_up_landmine(trap); fall_into_pit
    trap.ttyp = PIT;
    trap.madeby_u = false;
    await losehp(rnd(16), 'land mine', 3 /*KILLED_BY_AN*/, player, game?.display, game);
    await blow_up_landmine(trap, map);
    newsym(player.x, player.y);
    // C: dotrap(trap, RECURSIVETRAP) — recursive fall into pit
    const newpittrap = t_at(player.x, player.y, map);
    if (newpittrap)
        await dotrap(newpittrap, RECURSIVETRAP, player, game, map);
    await fill_pit(player.x, player.y, map);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2590 trapeffect_rolling_boulder_trap — player branch
async function trapeffect_rolling_boulder_trap_you(trap, trflags, player, game, map) {
    feeltrap(trap);
    const isDeaf = !!(player?.Deaf || player?.deaf);
    await pline('%sYou trigger a rolling boulder trap!', isDeaf ? '' : 'Click!  ');
    // C: launch_obj(BOULDER, ...) — simplified; boulder roll already ported for monsters
    // No boulder available message
    await pline('Fortunately for you, no boulder was released.');
    // TODO: full boulder launch for player not yet implemented
    return Trap_Effect_Finished;
}

// C ref: trap.c:2638 trapeffect_magic_portal — player branch
async function trapeffect_magic_portal_you(trap, trflags, player, game, map) {
    feeltrap(trap);
    await domagicportal(trap, game);
    return Trap_Effect_Finished;
}

// C ref: trap.c:2653 trapeffect_vibrating_square — player branch
async function trapeffect_vibrating_square_you(trap, trflags, player, game, map) {
    feeltrap(trap);
    // C: messages handled elsewhere; just mark the square
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_selector() — dispatch for player
async function trapeffect_selector_you(trap, trflags, player, game, map) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return await trapeffect_arrow_trap_you(trap, trflags, player, game, map);
    case DART_TRAP:
        return await trapeffect_dart_trap_you(trap, trflags, player, game, map);
    case ROCKTRAP:
        return await trapeffect_rocktrap_you(trap, trflags, player, game, map);
    case SQKY_BOARD:
        return await trapeffect_sqky_board_you(trap, trflags, player, game);
    case BEAR_TRAP:
        return await trapeffect_bear_trap_you(trap, trflags, player, game, map);
    case SLP_GAS_TRAP:
        return await trapeffect_slp_gas_trap_you(trap, trflags, player, game, map);
    case RUST_TRAP:
        return await trapeffect_rust_trap_you(trap, trflags, player, game, map);
    case FIRE_TRAP:
        return await trapeffect_fire_trap_you(trap, trflags, player, game, map);
    case PIT:
    case SPIKED_PIT:
        return await trapeffect_pit_you(trap, trflags, player, game, map);
    case HOLE:
    case TRAPDOOR:
        return await trapeffect_hole_you(trap, trflags, player, game, map);
    case TELEP_TRAP:
        return await trapeffect_telep_trap_you(trap, trflags, player, game, map);
    case LEVEL_TELEP:
        return await trapeffect_level_telep_you(trap, trflags, player, game, map);
    case MAGIC_PORTAL:
        return await trapeffect_magic_portal_you(trap, trflags, player, game, map);
    case WEB:
        return await trapeffect_web_you(trap, trflags, player, game, map);
    case STATUE_TRAP:
        return await trapeffect_statue_trap_you(trap, trflags, player, game, map);
    case MAGIC_TRAP:
        return await trapeffect_magic_trap_you(trap, trflags, player, game, map);
    case ANTI_MAGIC:
        return await trapeffect_anti_magic_you(trap, trflags, player, game, map);
    case POLY_TRAP:
        return await trapeffect_poly_trap_you(trap, trflags, player, game, map);
    case LANDMINE:
        return await trapeffect_landmine_you(trap, trflags, player, game, map);
    case ROLLING_BOULDER_TRAP:
        return await trapeffect_rolling_boulder_trap_you(trap, trflags, player, game, map);
    case VIBRATING_SQUARE:
        return await trapeffect_vibrating_square_you(trap, trflags, player, game, map);
    default:
        return Trap_Effect_Finished;
    }
}

// ========================================================================
// dotrap — C ref: trap.c:2922 dotrap()
// Main entry point for player stepping on a trap.
// ========================================================================
export async function dotrap(trap, trflags, player, game, map) {
    if (!trap || !player) return;
    const ttype = trap.ttyp;
    const already_seen = !!trap.tseen;
    let forcetrap = ((trflags & FORCETRAP) !== 0 || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    const plunged = (trflags & TOOKPLUNGE) !== 0;
    const conj_pit = conjoined_pits(trap, t_at(player.x0, player.y0, map), true, player);
    const adj_pit = adj_nonconjoined_pit(trap, player);

    // C: nomul(0)
    // C: fixed_tele_trap check
    const isTeleDest = trap.ttyp === TELEP_TRAP
        && (trap.teledest?.x || trap.teledest?.y);
    if (isTeleDest) {
        trflags |= FORCETRAP;
        forcetrap = true;
    }

    const inSokoban = !!(player?.inSokoban || player?.sokoban);
    if (inSokoban && (is_pit(ttype) || is_hole(ttype))) {
        await pline('Air currents pull you down into %s %s!',
                    a_your[trap.madeby_u ? 1 : 0],
                    ttype === PIT ? 'pit' : ttype === SPIKED_PIT ? 'spiked pit'
                    : ttype === HOLE ? 'hole' : 'trap door');
    } else if (!forcetrap) {
        const youdata = player.youmonst
            ? (player.youmonst.type || mons[player.youmonst.mndx]) : null;
        const lev = !!(player?.Levitation || player?.levitating);
        const fly = !!(player?.Flying || player?.flying);
        // C: check_in_air — avoid floor triggers while levitating/flying
        const inAir = (lev || fly)
            && floor_trigger(ttype)
            && !(ttype === SQKY_BOARD && (trflags & VIASITTING) !== 0 && fly);
        if (inAir) {
            if (already_seen) {
                await You('%s over %s %s.',
                          fly ? 'fly' : 'float',
                          (ttype === ARROW_TRAP && !trap.madeby_u) ? 'an' : a_your[trap.madeby_u ? 1 : 0],
                          ttype === ARROW_TRAP ? 'arrow trap'
                          : ttype === DART_TRAP ? 'dart trap'
                          : 'trap');
            }
            return;
        }
        // C: escape check — 1/5 chance if seen and not fumbling
        const undestroyable = (ttype === MAGIC_PORTAL || ttype === VIBRATING_SQUARE);
        const fumbling = !!(player?.Fumbling || player?.fumbling);
        const clinging = youdata && is_clinger(youdata);
        if (already_seen && !fumbling && !undestroyable && ttype !== ANTI_MAGIC
                && !forcebungle && !plunged && !conj_pit && !adj_pit
                && (!rn2(5) || (is_pit(ttype) && clinging))) {
            await You('escape %s %s.',
                      (ttype === ARROW_TRAP && !trap.madeby_u) ? 'an' : a_your[trap.madeby_u ? 1 : 0],
                      ttype === ARROW_TRAP ? 'arrow trap'
                      : ttype === DART_TRAP ? 'dart trap'
                      : ttype === BEAR_TRAP ? 'bear trap'
                      : ttype === SLP_GAS_TRAP ? 'sleeping gas trap'
                      : ttype === RUST_TRAP ? 'rust trap'
                      : ttype === FIRE_TRAP ? 'fire trap'
                      : is_pit(ttype) ? 'pit'
                      : is_hole(ttype) ? 'hole'
                      : 'trap');
            return;
        }
    }

    // C: mon_learns_traps(u.usteed, ttype); mons_see_trap(trap)
    if (player.usteed)
        mon_learns_traps(player.usteed, ttype);

    await trapeffect_selector_you(trap, trflags, player, game, map);
}

// cf. trap.c:6685 — unconscious(): is hero unconscious (sleeping/knocked out)?
export function unconscious() {
    const player = globalThis.gs?.player;
    const game = globalThis.gs?.game;
    if ((game?.multi ?? 0) >= 0) return false;
    return !!(player?.usleep
        || (game?.nomovemsg
            && (game.nomovemsg.startsWith("You awake")
                || game.nomovemsg.startsWith("You regain con")
                || game.nomovemsg.startsWith("You are consci"))));
}

// cf. trap.c:3163 — launch_in_progress(): is a rolling boulder launch active?
export function launch_in_progress() {
    return !!(globalThis.gs?.launchplace?.obj);
}

// cf. trap.c:6948 — sokoban_guilt(): penalize Sokoban cheating
export function sokoban_guilt() {
    const player = globalThis.gs?.player;
    const map = globalThis.gs?.map;
    if (In_sokoban(map)) {
        if (!player.uconduct) player.uconduct = {};
        player.uconduct.sokocheat = (player.uconduct.sokocheat || 0) + 1;
        change_luck(-1, player);
    }
}

// cf. trap.c:5110 — drain_en(n, max_already_drained): drain hero's magical energy
export async function drain_en(n, max_already_drained) {
    const player = globalThis.gs?.player;
    let mesg;
    const punct = max_already_drained ? '!' : '.';

    if ((player.pwmax || 0) < 1) {
        if (player.pw || player.pwmax) {
            player.pw = player.pwmax = 0;
        }
        mesg = "momentarily lethargic";
    } else {
        if (n > ((player.pw || 0) + (player.pwmax || 0)) / 3)
            n = rnd(n);
        mesg = "your magical energy drain away";
        let actualPunct = punct;
        if (n > (player.pw || 0))
            actualPunct = '!';

        player.pw = (player.pw || 0) - n;
        if (player.pw < 0) {
            player.pwmax = (player.pwmax || 0) - rnd(-player.pw);
            if (player.pwmax < 0) player.pwmax = 0;
            player.pw = 0;
        } else if (player.pw > (player.pwmax || 0)) {
            player.pw = player.pwmax || 0;
        }
        await You_feel("%s%s", mesg, actualPunct);
        return;
    }
    await You_feel("%s%s", mesg, punct);
}

// cf. trap.c:7009 — trapname(ttyp, override): return name of trap type
export function trapname(ttyp, override) {
    const player = globalThis.gs?.player;
    const halu_trapnames = [
        "bottomless pit", "polymorphism trap", "devil teleporter",
        "falling boulder trap", "anti-anti-magic field", "weeping gas trap",
        "queasy board", "electrified web", "owlbear trap", "sand mine",
        "vacillating triangle",
        "death trap", "disintegration trap", "ice trap", "monochrome trap",
        "axeblade trap", "pool of boiling oil", "pool of quicksand",
        "field of caltrops", "buzzsaw trap", "spiked floor", "revolving wall",
        "uneven floor", "finger trap", "jack-in-a-box", "yellow snow",
        "booby trap", "rat trap", "poisoned nail", "snare", "whirlpool",
        "trip wire", "roach motel (tm)",
        "negative space", "tensor field", "singularity", "imperial fleet",
        "black hole", "thermal detonator", "event horizon",
        "entoptic phenomenon",
        "sweet-smelling gas vent", "phone booth", "exploding runes",
        "never-ending elevator", "slime pit", "warp zone", "illusory floor",
        "pile of poo", "honey trap", "tourist trap",
    ];

    if (player?.Hallucination && !override) {
        const total_names = TRAPNUM + halu_trapnames.length;
        let nameidx = rn2_on_display_rng(total_names + 1);
        if (nameidx === total_names) {
            // role-based trap name
            const fem = player.Upolyd ? player.mfemale : player.flags?.female;
            const role = roles.find(r => r.mnum === player.roleMnum) || roles[0];
            let base = rn2(3)
                ? ((fem && role.namef) ? role.namef : role.name)
                : rank_of(player.ulevel || 1, player.roleMnum, fem);
            return (base + " trap").toLowerCase();
        } else if (nameidx >= TRAPNUM) {
            return halu_trapnames[nameidx - TRAPNUM];
        }
        if (nameidx !== 0) ttyp = nameidx;
    }
    return defsyms[trap_to_defsym(ttyp)]?.explanation || "trap";
}

// cf. trap.c:3170 — force_launch_placement(): place boulder at launch origin if launch aborted
export function force_launch_placement() {
    const lp = globalThis.gs?.launchplace;
    if (lp?.obj) {
        lp.obj.otrapped = 0;
        place_object(lp.obj, lp.x, lp.y);
    }
}

// cf. trap.c:594 — clamp_hole_destination(dlev): ensure hole doesn't go below bottom
export function clamp_hole_destination(dlev) {
    const player = globalThis.gs?.player;
    const bottom = dng_bottom(dlev, player);
    dlev.dlevel = Math.min(dlev.dlevel, bottom);
    return dlev;
}

// C ref: trap.c:2711
export function immune_to_trap(mon, trapType) {
    const mdat = mon?.data || mon?.type;
    if (!mdat) return false;
    if ((trapType === PIT || trapType === SPIKED_PIT) && (is_flyer(mdat) || is_floater(mdat))) return true;
    if (trapType === FIRE_TRAP && resists_fire(mdat)) return true;
    if (trapType === SLP_GAS_TRAP && resists_sleep(mdat)) return true;
    return false;
}

// C ref: trap.c:3162
export function launch_drop_spot(srcx, srcy, dx, dy) {
    return {
        x: Math.max(0, Math.min(COLNO - 1, (srcx | 0) + (dx | 0))),
        y: Math.max(0, Math.min(ROWNO - 1, (srcy | 0) + (dy | 0))),
    };
}

// C ref: trap.c:3186
export function launch_obj(obj, srcx, srcy, dx, dy, map, game = null) {
    if (!obj) return null;
    if (game) game._launchInProgress = true;
    const dst = launch_drop_spot(srcx, srcy, dx, dy);
    obj.ox = dst.x;
    obj.oy = dst.y;
    if (typeof place_object === 'function') place_object(obj, obj.ox, obj.oy, map);
    if (game) game._launchInProgress = false;
    return obj;
}

// C ref: trap.c:3566
export function mkroll_launch(obj, srcx, srcy, dx, dy, map, game = null) {
    return launch_obj(obj, srcx, srcy, dx, dy, map, game);
}

// C ref: trap.c:4090
export async function climb_pit(player, map) {
    if (!player) return false;
    if ((player.utrap || 0) <= 0) return true;
    if (!rn2(3)) {
        player.utrap = 0;
        player.utraptype = TT_NONE;
        if (map) newsym(player.x, player.y);
        return true;
    }
    return false;
}

// C ref: trap.c:4483
export async function lava_damage(player, game = null) {
    if (!player) return 0;
    const dmg = rnd(12);
    await losehp(dmg, 'molten lava', 0, game?.display, game);
    return dmg;
}

// C ref: trap.c:4564
export function pot_acid_damage(_obj, _target = null) {
    return rnd(6);
}

// C ref: trap.c:4883
export function back_on_ground(player) {
    if (!player) return false;
    player.levitating = false;
    player.Levitation = false;
    return true;
}

// C ref: trap.c:4966
export async function drown(player, game = null) {
    if (!player) return false;
    await losehp(rnd(20), 'drowning', 0, game?.display, game);
    return true;
}

// C ref: trap.c:4804
export function emergency_disrobe(player) {
    if (!player) return false;
    player.emergencyDisrobe = true;
    return true;
}

// C ref: trap.c:5165
export function could_untrap(player, trap) {
    if (!player || !trap) return false;
    const dex = Number(player.dex || player.Dexterity || 10);
    return dex >= 6 && trap.ttyp !== MAGIC_PORTAL && trap.ttyp !== VIBRATING_SQUARE;
}

// C ref: trap.c:5196
export function untrap_prob(player, trap) {
    if (!player || !trap) return 0;
    const base = Math.max(1, Number(player.dex || 10) * 5);
    if (trap.ttyp === LANDMINE) return Math.max(5, base - 10);
    return base;
}

// C ref: trap.c:5300
export async function move_into_trap(player, trap, game, map) {
    if (!player || !trap) return false;
    await dotrap(trap, FORCETRAP, player, game, map);
    return true;
}

// C ref: trap.c:5348
export async function try_disarm(player, trap, game, map) {
    if (!could_untrap(player, trap)) return false;
    if (rn2(100) < untrap_prob(player, trap)) {
        trap.ttyp = NO_TRAP;
        deltrap(map, trap);
        return true;
    }
    await move_into_trap(player, trap, game, map);
    return false;
}

// C ref: trap.c:5460
export async function disarm_holdingtrap(player, trap, game, map) {
    return try_disarm(player, trap, game, map);
}

// C ref: trap.c:5584
export async function try_lift(player, trap, game, map) {
    return try_disarm(player, trap, game, map);
}

// C ref: trap.c:5607
export function help_monster_out(mon, trap, map) {
    if (!mon || !trap) return false;
    if (!immune_to_trap(mon, trap.ttyp)) return false;
    deltrap(map, trap);
    return true;
}

// C ref: trap.c:6117
export function closeholdingtrap(trap) {
    if (!trap) return false;
    trap.open = false;
    return true;
}

// C ref: trap.c:6008
export function openholdingtrap(trap) {
    if (!trap) return false;
    trap.open = true;
    return true;
}

// C ref: trap.c:6159
export function openfallingtrap(trap) {
    if (!trap) return false;
    trap.open = true;
    return true;
}

// C ref: trap.c:6529
export function join_adjacent_pits(map, x, y) {
    if (!map) return 0;
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            const t = t_at((x | 0) + dx, (y | 0) + dy, map);
            if (t && is_pit(t.ttyp)) count++;
        }
    }
    return count;
}

// C ref: trap.c:6966
export function maybe_finish_sokoban(player) {
    if (!player) return false;
    if ((player.sokobanGuilt || 0) <= 0) player.sokobanFinished = true;
    return !!player.sokobanFinished;
}

// C ref: trap.c:7065
export function ignite_items(_player, _game = null) {
    return 0;
}

// C ref: trap.c:726
export function animate_statue(_obj, _x, _y, _game = null) {
    return false;
}
