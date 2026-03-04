// trap.js -- Trap mechanics
// C ref: trap.c — m_harmless_trap(), floor_trigger(), mintrap(), check_in_air()
// trapeffect_*(), thitm(), seetrap(), t_missile(), erode_obj(), etc.
//
// Monster trap handling is fully ported. Player (dotrap) path is not yet ported.

import {
    COLNO, ROWNO, ACCESSIBLE, isok,
    IS_DOOR, IS_STWALL, IRONBARS, TREE,
    D_BROKEN, D_CLOSED, D_LOCKED
} from './config.js';
import { rn2, rnd, rnl, d, rn1 } from './rng.js';
import { is_mindless, touch_petrifies, resists_ston,
         amorphous, is_whirly, unsolid, is_clinger, passes_walls,
         webmaker, grounded, is_flyer, is_floater, breathless,
         resists_fire, resists_sleep, attacktype, strongmonst,
         extra_nasty, flaming, acidic, completelyrusts,
         canseemon
       } from './mondata.js';
import { mon_knows_traps, mon_learns_traps } from './mondata.js';
import { mondead, newsym, helpless as monHelpless } from './monutil.js';
import { monkilled, m_in_air, setmangry } from './mon.js';
import { sleep_monst } from './mhitm.js';
import { find_mac, which_armor,
         W_ARMH, W_ARMC, W_ARM, W_ARMU, W_ARMS, W_ARMG, W_ARMF
       } from './worn.js';
import { mtele_trap, mlevel_tele_trap } from './teleport.js';
import { rloco } from './teleport.js';
import { resist } from './zap.js';
import { dmgval } from './weapon.js';
import { deltrap } from './dungeon.js';
import { mons,
         PM_IRON_GOLEM, PM_RUST_MONSTER, PM_XORN,
         PM_PIT_FIEND, PM_PIT_VIPER,
         PM_OWLBEAR, PM_BUGBEAR, PM_GREMLIN,
         PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_WOOD_GOLEM, PM_LEATHER_GOLEM,
         PM_PURPLE_WORM, PM_JABBERWOCK, PM_BALROG, PM_KRAKEN,
         PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS, PM_LORD_SURTUR,
         PM_TITANOTHERE, PM_BALUCHITHERIUM,
         PM_STONE_GOLEM,
         M1_FLY, M1_AMORPHOUS, M1_CLING,
         MR_FIRE, MR_SLEEP,
         MZ_SMALL, MZ_HUGE,
         S_EYE, S_LIGHT, S_PIERCER, S_GIANT, S_DRAGON, S_SPIDER,
         AT_MAGC, AT_BREA,
         AD_PHYS, AD_FIRE, AD_RUST, AD_MAGM, AD_SLEE, AD_RBRE,
         WT_ELF
       } from './monsters.js';
import { ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD,
         BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP,
         SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP,
         PIT, SPIKED_PIT, HOLE, TRAPDOOR,
         TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL,
         WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC,
         POLY_TRAP, VIBRATING_SQUARE
       } from './symbols.js';
import { is_flammable, is_rustprone, is_rottable, is_corrodeable,
         is_crackable, erosion_matters, mksobj } from './mkobj.js';
import { CORPSE, WEAPON_CLASS, ARMOR_CLASS,
         ARROW, DART, ROCK, BOULDER, WAND_CLASS } from './objects.js';
import { tmp_at, nh_delay_output, DISP_FLASH, DISP_END } from './animation.js';
import { cansee, couldsee } from './vision.js';
import { pline, You } from './pline.js';
import { Monnam, mon_nam } from './do_name.js';
import { an } from './objnam.js';

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

// C ref: resists_magm — approximation since full version not ported
function resists_magm(mon) {
    const mdat = mon?.type || mons[mon?.mndx] || {};
    return (mdat.mr || 0) > 50;
}

// C ref: defended(mon, adtype) — item-based defense; not ported
function defended(/* mon, adtype */) { return false; }

// C ref: DEADMONSTER macro
function DEADMONSTER(mon) { return mon && mon.mhp <= 0; }

// C ref: helpless(mon) — mon is asleep/paralyzed/etc
function helpless(mon) {
    if (!mon) return false;
    return monHelpless(mon);
}

// C ref: is_pit() helper
function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }

// C ref: is_hole()
function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }

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
        if (t && t.x === x && t.y === y) return t;
    }
    return null;
}

function m_at(x, y, map) {
    if (!map) return null;
    if (typeof map.monsterAt === 'function') return map.monsterAt(x, y);
    if (Array.isArray(map.monsters)) {
        for (const mon of map.monsters) {
            if (mon && mon.mx === x && mon.my === y) return mon;
        }
    }
    return null;
}

function u_at(player, x, y) {
    return !!(player && player.x === x && player.y === y);
}

function Sprintf(fmt, ...args) {
    // Minimal C-style formatter bridge used by translated helper candidates.
    const conv = String(fmt || '').replace(/%[lds]/g, '%s');
    let i = 0;
    return conv.replace(/%s/g, () => String(args[i++] ?? ''));
}

// ========================================================================
// seetrap — C ref: trap.c seetrap()
// ========================================================================
// Autotranslated from trap.c:3485
export function seetrap(trap) {
  if (!trap.tseen) { trap.tseen = 1; newsym(trap.tx, trap.ty); }
}

// ========================================================================
// t_missile — C ref: trap.c t_missile()
// Make a single arrow/dart/rock for a trap to shoot or drop
// ========================================================================
export function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    if (otmp) {
        otmp.quan = 1;
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
export function thitm(tlev, mon, obj, d_override, nocorpse, map, player) {
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

    // Object placement: if miss or d_override, object stays; otherwise consumed
    // Simplified: don't manage object placement on map for now

    return trapkilled;
}

// ========================================================================
// m_easy_escape_pit — C ref: trap.c m_easy_escape_pit()
// ========================================================================
// Autotranslated from trap.c:3633
export function m_easy_escape_pit(mtmp) {
  return (mtmp.data === mons[PM_PIT_FIEND] || mtmp.data.msize >= MZ_HUGE);
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
function mon_check_in_air(mon) {
    const mdat = mon?.type || mons[mon?.mndx] || {};
    return is_flyer(mdat) || is_floater(mdat);
}

// ========================================================================
// m_harmless_trap — C ref: trap.c m_harmless_trap()
// ========================================================================
export function m_harmless_trap(mon, trap) {
    const mdat = mons[mon.mndx] || {};

    // C ref: floor_trigger + check_in_air — flyers/floaters avoid floor traps
    if (floor_trigger(trap.ttyp) && mon_check_in_air(mon))
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
        if (is_clinger(mdat))
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

function trapeffect_arrow_trap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished; // trap is gone, nothing happens
    }
    trap.once = 1;
    const otmp = t_missile(ARROW, trap);
    seetrap(trap);
    if (thitm(8, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_dart_trap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(DART, trap);
    if (!rn2(6))
        otmp.opoisoned = 1;
    seetrap(trap);
    if (thitm(7, mon, otmp, 0, false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_rocktrap_mon(mon, trap, map, player) {
    let trapkilled = false;

    if (trap.once && trap.tseen && !rn2(15)) {
        deltrap(map, trap);
        newsym(mon.mx, mon.my);
        return Trap_Effect_Finished;
    }
    trap.once = 1;
    const otmp = t_missile(ROCK, trap);
    seetrap(trap);
    if (thitm(0, mon, otmp, d(2, 6), false, map, player))
        trapkilled = true;

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_sqky_board_mon(mon, trap) {
    if (m_in_air(mon))
        return Trap_Effect_Finished;
    // stepped on a squeaky board — wake nearby monsters
    // C ref: wake_nearto(mtmp->mx, mtmp->my, 40) — not ported
    return Trap_Effect_Finished;
}

function trapeffect_bear_trap_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

    if ((mptr.msize || 0) > MZ_SMALL && !amorphous(mptr) && !m_in_air(mon)
        && !is_whirly(mptr) && !unsolid(mptr)) {
        mon.mtrapped = 1;
        seetrap(trap);
    }
    if (mon.mtrapped)
        trapkilled = thitm(0, mon, null, d(2, 4), false, map, player);

    return trapkilled ? Trap_Killed_Mon
        : mon.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}

function trapeffect_slp_gas_trap_mon(mon, trap, player, fov) {
    const mdat = mons[mon.mndx] || {};
    if (!resists_sleep(mon) && !breathless(mdat) && !helpless(mon)) {
        // C ref: trap.c:1568-1574 — seetrap only if sleep_monst() returns true AND in_sight
        const in_sight = canseemon(mon, player, fov);
        if (sleep_monst(mon, rnd(25), -1) && in_sight) {
            seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

function trapeffect_rust_trap_mon(mon, trap, map, player) {
    const mptr = mons[mon.mndx] || {};
    let trapkilled = false;

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

    // C ref: burnarmor(mtmp) || rn2(3) — burnarmor not ported
    // Consume rn2 for parity approximation
    if (rn2(3)) {
        // C ref: destroy_items(mtmp, AD_FIRE, orig_dmg) — not ported
        // C ref: ignite_items — not ported
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

async function trapeffect_hole_mon(mon, trap, trflags, map, player) {
    const mptr = mons[mon.mndx] || {};

    if (!grounded(mptr) || (mptr.msize || 0) >= MZ_HUGE) {
        return Trap_Effect_Finished;
    }
    // C ref: calls trapeffect_level_telep for monsters
    return await trapeffect_level_telep_mon(mon, trap, trflags, map, player);
}

function trapeffect_telep_trap_mon(mon, trap, map, player, display, fov) {
    const in_sight = true; // simplified
    mtele_trap(mon, trap, in_sight, map, player, display, fov);
    return Trap_Moved_Mon;
}

async function trapeffect_level_telep_mon(mon, trap, trflags, map, player) {
    const in_sight = true; // simplified
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
        const mask = Number.isInteger(loc.flags) ? loc.flags : (loc.doormask || 0);
        return !!(mask & (D_CLOSED | D_LOCKED));
    };
    const breakDoor = (loc) => {
        if (!loc || !IS_DOOR(loc.typ)) return;
        if (Number.isInteger(loc.flags)) {
            loc.flags = D_BROKEN;
        }
        if (loc.doormask !== undefined) {
            loc.doormask = D_BROKEN;
        }
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
        return trapeffect_arrow_trap_mon(mon, trap, map, player);
    case DART_TRAP:
        return trapeffect_dart_trap_mon(mon, trap, map, player);
    case ROCKTRAP:
        return trapeffect_rocktrap_mon(mon, trap, map, player);
    case SQKY_BOARD:
        return trapeffect_sqky_board_mon(mon, trap);
    case BEAR_TRAP:
        return trapeffect_bear_trap_mon(mon, trap, map, player);
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
        return await trapeffect_hole_mon(mon, trap, trflags, map, player);
    case TELEP_TRAP:
        return trapeffect_telep_trap_mon(mon, trap, map, player, display, fov);
    case LEVEL_TELEP:
        return await trapeffect_level_telep_mon(mon, trap, trflags, map, player);
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
        return trapeffect_landmine_mon(mon, trap, 0, map, player);
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
        const already_seen = mon_knows_traps(mon, tt)
            || (tt === HOLE && !is_mindless(mon?.type || {}));

        if (floor_trigger(tt) && mon_check_in_air(mon)) {
            return Trap_Effect_Finished;
        }
        if (already_seen && rn2(4)) {
            return Trap_Effect_Finished;
        }

        mon_learns_traps(mon, tt);

        // C ref: Monster is aggravated by being trapped by you
        if (trap.madeby_u && rnl(5)) {
            setmangry(mon, false, map, player);
        }

        if (m_harmless_trap(mon, trap)) {
            return Trap_Effect_Finished;
        }

        trap_result = await trapeffect_selector_mon(
            mon, trap, 0, map, player, display, fov);
    }
    return trap_result;
}

// ========================================================================
// Erosion constants — C ref: hack.h
// ========================================================================
export const ERODE_BURN = 0;
export const ERODE_RUST = 1;
export const ERODE_ROT = 2;
export const ERODE_CORRODE = 3;
export const ERODE_CRACK = 4;

export const ER_NOTHING = 0;
export const ER_GREASED = 1;
export const ER_DAMAGED = 2;
export const ER_DESTROYED = 3;

export const EF_NONE = 0;
export const EF_GREASE = 0x01;
export const EF_DESTROY = 0x02;
export const EF_VERBOSE = 0x04;
export const EF_PAY = 0x08;

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
    } else if (otmp.oerodeproof || (otmp.blessed && !rn2(4))) {
        // C ref: rnl(4) simplified to rn2(4) — blessed protection
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
    } else if (obj.oclass === 7 /* SCROLL_CLASS */) {
        // Scrolls get blanked
        return ER_DAMAGED;
    } else if (obj.oclass === 11 /* SPBOOK_CLASS */) {
        return ER_DAMAGED;
    } else if (obj.oclass === 6 /* POTION_CLASS */) {
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
export function minstapetrify(mon, byplayer) {
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
    mptr = mons;
  } while (--trycount > 0 && is_unicorn(mptr) && sgn(player.ualigame.gn.type) === sgn(mptr.maligntyp));
  statue = mkcorpstat(STATUE,  0, mptr, x, y, CORPSTAT_NONE);
  mtmp = makemon( mons, 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
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
  let mtmp =  0, otmp = sobj_at(STATUE, x, y), fail_reason;
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
export function keep_saddle_with_steedcorpse(steed_mid, objchn, saddle) {
  if (!saddle) return false;
  while (objchn) {
    if (objchn.otyp === CORPSE && has_omonst(objchn)) {
      let mtmp = OMONST(objchn);
      if (mtmp.m_id === steed_mid) {
        let x, y;
        if (get_obj_location(objchn, x, y, 0)) {
          obj_extract_self(saddle);
          place_object(saddle, x, y);
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

// Autotranslated from trap.c:1030
export function set_utrap(tim, typ, game, player) {
  if (!player.utrap ^ !tim) game.disp.botl = true;
  player.utrap = tim;
  player.utraptype = tim ? typ : TT_NONE;
  float_vs_flight();
}

// Autotranslated from trap.c:1045
export async function reset_utrap(msg, player) {
  let was_Lev = ((player?.Levitation || player?.levitating || false) !== 0), was_Fly = ((player?.Flying || player?.flying || false) !== 0);
  set_utrap(0, 0);
  if (msg) {
    if (!was_Lev && (player?.Levitation || player?.levitating || false)) float_up();
    if (!was_Fly && (player?.Flying || player?.flying || false)) await You("can fly.");
  }
}

// Autotranslated from trap.c:3098
export async function blow_up_landmine(trap, map) {
  let x = trap.tx, y = trap.ty, dbx, dby, lev =  map.locations[x][y];
  let old_typ, typ;
  old_typ = lev.typ;
  scatter(x, y, 4, MAY_DESTROY | MAY_HIT | MAY_FRACTURE | VIS_EFFECTS,  0);
  del_engr_at(x, y);
  wake_nearto(x, y, 400);
  if (IS_DOOR(lev.typ)) lev.doormask = D_BROKEN;
  if (lev.typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
    dbx = x, dby = y;
    if (find_drawbridge( dbx, dby)) destroy_drawbridge(dbx, dby);
  }
  trap = t_at(x, y);
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
  await fill_pit(x, y);
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
    if ((t = t_at(x, y)) !== 0 && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp))) return false;
  }
  cc.x = x;
  cc.y = y;
  return true;
}

// Autotranslated from trap.c:3917
export async function fill_pit(x, y) {
  let otmp, t;
  if ((t = t_at(x, y)) !== 0 && (is_pit(t.ttyp) || is_hole(t.ttyp)) && (otmp = sobj_at(BOULDER, x, y)) !== 0) { obj_extract_self(otmp); await flooreffects(otmp, x, y, "settle"); }
}

// Autotranslated from trap.c:5155
export async function dountrap() {
  if (!could_untrap(true, false)) return ECMD_OK;
  return untrap(false, 0, 0,  0) ? ECMD_TIME : ECMD_OK;
}

// Autotranslated from trap.c:5248
export async function cnv_trap_obj(otyp, cnt, ttmp, bury_it, player) {
  let otmp = mksobj(otyp, true, false), mtmp;
  otmp.quan = cnt;
  otmp.owt = weight(otmp);
  if (otyp !== DART) otmp.opoisoned = 0;
  place_object(otmp, ttmp.tx, ttmp.ty);
  if (bury_it) { bury_an_obj(otmp, null); }
  else {
    if (ttmp.madeby_u) sellobj(otmp, ttmp.tx, ttmp.ty);
    stackobj(otmp);
  }
  newsym(ttmp.tx, ttmp.ty);
  if (player.utrap && u_at(ttmp.tx, ttmp.ty)) await reset_utrap(true);
  if (((mtmp = m_at(ttmp.tx, ttmp.ty)) !== 0) && mtmp.mtrapped) mtmp.mtrapped = 0;
  deltrap(ttmp);
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
    if (rnl(10) < 8 && !mtmp.mpeaceful && !helpless(mtmp) && !mtmp.mfrozen && !mindless(mtmp.data) && !unique_corpstat(mtmp.data) && mtmp.data.mlet !== S_HUMAN) {
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
export function unsqueak_ok(obj) {
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

// Autotranslated from trap.c:5701
export async function disarm_box(box, force, confused, player) {
  if (box.otrapped) {
    let ch = acurr(player,A_DEX) + player.ulevel;
    if (Role_if(PM_ROGUE)) {
      ch *= 2;
    }
    if (!force && (confused || Fumbling || rnd(75 + level_difficulty() / 2) > ch)) { await chest_trap(box, FINGER, true); }
    else {
      await You("disarm it!");
      box.otrapped = 0;
      box.tknown = 1;
      more_experienced(8, 0);
      await newexplevel();
    }
    await exercise(A_DEX, true);
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
    if (!confused) await exercise(A_WIS, true);
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
export function clear_conjoined_pits(trap) {
  let diridx, adjidx, x, y, t;
  if (trap && is_pit(trap.ttyp)) {
    for (diridx = 0; diridx < N_DIRS; ++diridx) {
      if (trap.conjoined & (1 << diridx)) {
        x = trap.tx + xdir;
        y = trap.ty + ydir;
        if (isok(x, y) && (t = t_at(x, y)) !== 0 && is_pit(t.ttyp)) { adjidx = DIR_180(diridx); t.conjoined &= ~(1 << adjidx); }
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
    if (u_at(ttmp.tx, ttmp.ty)) {
      if (player.utraptype !== TT_BURIEDBALL) await reset_utrap(true);
    }
    else if ((mtmp = m_at(ttmp.tx, ttmp.ty)) !== 0) { mtmp.mtrapped = 0; }
    deltrap(ttmp);
    return true;
  }
  return false;
}

// Autotranslated from trap.c:6602
export async function b_trapped(item, bodypart) {
  let lvl = level_difficulty(), dmg = rnd(5 + (lvl < 5 ? lvl : 2 + lvl / 2));
  await pline("KABOOM!! %s was booby-trapped!", The(item));
  wake_nearby(false);
  await losehp(Maybe_Half_Phys(dmg), "explosion", KILLED_BY_AN);
  await exercise(A_STR, false);
  if (bodypart !== NO_PART) await exercise(A_CON, false);
  await make_stunned((HStun & TIMEOUT) +  dmg, true);
}

// Autotranslated from trap.c:6899
export async function sink_into_lava(player) {
  let sink_deeper = "You sink deeper into the lava.";
  if (!player.utrap || player.utraptype !== TT_LAVA) {
  }
  else if (!is_lava(player.x, player.y)) { await reset_utrap(false); }
  else if (!player.uinvulnerable) {
    if (!Fire_resistance) player.hp = (player.hp + 2) / 3;
    player.utrap -= (1 << 8);
    if (player.utrap < (1 << 8)) {
      svk.killer.format = KILLED_BY;
      Strcpy(svk.killer.name, "molten lava");
      await urgent_pline("You sink below the surface and die.");
      burn_away_slime();
      await done(DISSOLVED);
      await reset_utrap(true);
      if (!(player?.Levitation || player?.levitating || false) && !(player?.Flying || player?.flying || false)) {
        await safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT);
      }
    }
    else if (!player.umoved) {
      if (Slimed && rnd(10 - 1) >= Math.trunc(Slimed & TIMEOUT)) { await pline(sink_deeper); burn_away_slime(); }
      else { await Norep(sink_deeper); }
      player.utrap += rnd(4);
    }
  }
}

// Autotranslated from trap.c:7080
export async function trap_ice_effects(x, y, ice_is_melting) {
  let ttmp = t_at(x, y);
  if (ttmp && ice_is_melting) {
    let mtmp;
    if (((mtmp = m_at(x, y)) !== 0) && mtmp.mtrapped) mtmp.mtrapped = 0;
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
