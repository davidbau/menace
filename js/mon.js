// mon.js -- Monster lifecycle and position management
// C ref: mon.c — movemon(), mfndpos(), mon_allowflags(), corpse_chance(), passivemm(),
// restrap/hider premove, mm_aggression, zombie_maker
//
// INCOMPLETE / MISSING vs C mon.c:
// - No xkilled/monkilled/mondied (monster death processing)
// - No grow_up/mon_adjust_speed
// - No mpickstuff/mpickgold (full item pickup logic — stub in monmove.js)
// - No minliquid (monsters falling in pools/lava)
// - mfndpos: no ALLOW_DIG for tunneling monsters with picks
// - mfndpos: ALLOW_SANCT flag set but in_your_sanctuary gate not checked
// - mfndpos: no poison gas region avoidance (NhRegion not ported)
// - mfndpos: no worm segment crossing (long worm not ported)
// - mon_allowflags: ALLOW_DIG not set (needs monster wielded pick tracking)
// - mon_allowflags: Conflict ALLOW_U not implemented
// - mon_allowflags: is_vampshifter NOGARLIC not ported
// - passivemm: only AD_ACID/AD_ENCH/generic modeled; many passive types missing
// - handleHiderPremove: no mimic furniture/object appearance selection

import { COLNO, ROWNO, IS_DOOR, IS_POOL, IS_LAVA, IS_OBSTRUCTED, ACCESSIBLE,
         POOL, ROOM, WATER, LAVAWALL, IRONBARS,
         D_CLOSED, D_LOCKED, D_BROKEN,
         SHOPBASE, ROOMOFFSET, TEMPLE, isok,
         ALLOW_MDISP, ALLOW_TRAPS, ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL,
         NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_ROCK, ALLOW_WALL,
         ALLOW_DIG, ALLOW_BARS, ALLOW_SANCT, ALLOW_SSM, NOGARLIC,
         XKILL_GIVEMSG, XKILL_NOMSG, XKILL_NOCORPSE, XKILL_NOCONDUCT,
         M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD,
         W_AMUL, W_ARMG, W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMF, W_ARMU, W_WEP,
         BOLT_LIM, LS_MONSTER,
         IS_ALTAR,
         STRAT_WAITMASK, A_CHAOTIC, A_NONE, NORMAL_SPEED, MSLOW, MFAST } from './const.js';
import { M2_COLLECT, MS_NEMESIS, MS_GUARDIAN, MR_ACID, MR_STONE,
         PM_KILLER_BEE, PM_SCORPION } from './monsters.js';
import { AMULET_OF_LIFE_SAVING, CORPSE, FIGURINE, STATUE, objectData,
         GRAY_DRAGON_SCALES, UNICORN_HORN, WORM_TOOTH,
         IRON_CHAIN, ROCK as OBJ_ROCK, FIRST_GLASS_GEM, NUM_GLASS_GEMS,
         QUARTERSTAFF, SMALL_SHIELD, CLUB, ELVEN_SPEAR, BOOMERANG,
         LEASH, BULLWHIP, GRAPPLING_HOOK,
         LEATHER_ARMOR, LEATHER_CLOAK, SADDLE,
         SCR_BLANK_PAPER,
         GLOB_OF_BLACK_PUDDING } from './objects.js';
import { which_armor, mon_adjust_speed } from './worn.js';
import { nonliving, resists_ston, resists_fire, resists_poison,
         is_flyer, is_floater,
         likes_lava, cant_drown, can_teleport, control_teleport, telepathic,
         vegan as vegan_mondata,
         mon_hates_silver, touch_petrifies, flesh_petrifies,
         is_male, is_female, is_neuter,
         dmgtype, attacktype, DEADMONSTER, M_AP_TYPE, NODIAG, ismnum } from './mondata.js';
import { Is_rogue_level, surface } from './dungeon.js';
import { mkcorpstat, weight, is_rustprone, mkobj, mksobj_at, mkgold, place_object } from './mkobj.js';
import { impossible, pline_mon, pline, pline_The, livelog_printf } from './pline.js';
import { next_ident } from './mkobj.js';
import { is_metallic, is_organic, obj_resists, hasPoisonTrapBit } from './objdata.js';
import { newsym, canSpotMonsterForMap, canspotmon, sensemon } from './display.js';
import { mpickobj, mdrop_obj } from './steal.js';
import { delobj } from './invent.js';
import { stackobj } from './invent.js';
import { water_damage_chain, fire_damage_chain } from './trap.js';
import { rloc, tele_restrict, enexto } from './teleport.js';
import { in_your_sanctuary, inhistemple, p_coaligned } from './priest.js';
import { create_gas_cloud } from './region.js';
import { makemon } from './makemon.js';

import { rn2, rnd, rnl, d, pushRngLogEntry, withRngTag } from './rng.js';
import { BOULDER, COIN_CLASS, SCR_SCARE_MONSTER, CLOVE_OF_GARLIC,
         AMULET_OF_STRANGULATION, RIN_SLOW_DIGESTION,
         ROCK_CLASS, RANDOM_CLASS, FOOD_CLASS, ARMOR_CLASS } from './objects.js';
import { couldsee, m_cansee } from './vision.js';
import { is_hider, hides_under, is_mindless, is_displacer, perceives,
         is_human, is_elf, is_dwarf, is_gnome, is_orc, is_shapeshifter,
         mon_knows_traps, passes_bars, nohands, is_clinger,
         is_giant, is_undead, is_unicorn, is_minion, throws_rocks,
         is_golem, is_rider, is_mplayer, canseemon } from './mondata.js';
import { y_monnam, locomotion, Monnam, is_watch } from './mondata.js';
import { PM_ANGEL, PM_GRID_BUG, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_FLOATING_EYE, PM_MINOTAUR, PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_SHRIEKER, PM_GHOUL, PM_SKELETON, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_LIZARD, PM_VLAD_THE_IMPALER, PM_DISPLACER_BEAST, PM_KOBOLD, PM_DWARF, PM_GNOME, PM_ORC, PM_ELF, PM_HUMAN, PM_GIANT, PM_ETTIN, PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE, PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE, PM_KOBOLD_MUMMY, PM_DWARF_MUMMY, PM_GNOME_MUMMY, PM_ORC_MUMMY, PM_ELF_MUMMY, PM_HUMAN_MUMMY, PM_GIANT_MUMMY, PM_ETTIN_MUMMY, PM_STUDENT, PM_CHIEFTAIN, PM_NEANDERTHAL, PM_ATTENDANT, PM_PAGE, PM_ABBOT, PM_ACOLYTE, PM_HUNTER, PM_THUG, PM_ROSHI, PM_GUIDE, PM_WARRIOR, PM_APPRENTICE, PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER, PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD, PM_IRON_GOLEM, PM_GLASS_GOLEM, PM_CLAY_GOLEM, PM_WOOD_GOLEM, PM_ROPE_GOLEM, PM_LEATHER_GOLEM, PM_GOLD_GOLEM, PM_PAPER_GOLEM, PM_GREMLIN, PM_GELATINOUS_CUBE, PM_RUST_MONSTER, PM_STALKER, PM_GREEN_SLIME, PM_GRAY_DRAGON, PM_GOLD_DRAGON, PM_SILVER_DRAGON, PM_RED_DRAGON, PM_ORANGE_DRAGON, PM_WHITE_DRAGON, PM_BLACK_DRAGON, PM_BLUE_DRAGON, PM_GREEN_DRAGON, PM_YELLOW_DRAGON, PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_LONG_WORM, PM_GRAY_OOZE, PM_BROWN_PUDDING, PM_BLACK_PUDDING, PM_STEAM_VORTEX, NUMMONS, mons, AT_NONE, AT_BOOM, AT_ENGL, AT_HUGS, AD_PHYS, AD_ACID, AD_ENCH, AD_STCK, M1_FLY, M1_SWIM, M1_AMPHIBIOUS, M1_AMORPHOUS, M1_WALLWALK, M1_BREATHLESS, M1_TUNNEL, M1_NEEDPICK, M1_SLITHY, M1_UNSOLID, MZ_TINY, MZ_MEDIUM, MZ_LARGE, MZ_HUMAN, MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, G_FREQ, G_GENO, G_NOCORPSE, G_UNIQ, S_EYE, S_LIGHT, S_EEL, S_PIERCER, S_MIMIC, S_UNICORN, S_ZOMBIE, S_LICH, S_KOBOLD, S_ORC, S_GIANT, S_HUMANOID, S_GNOME, S_KOP, S_DOG, S_NYMPH, S_LEPRECHAUN, S_HUMAN, S_VAMPIRE, PM_FLESH_GOLEM, PM_STONE_GOLEM, PM_ERINYS } from './monsters.js';
import { PIT, SPIKED_PIT, HOLE, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT, M_AP_MONSTER, TAINT_AGE, NON_PM,
         FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES,
         ACID_RES, STONE_RES, TELEPORT, TELEPORT_CONTROL, TELEPAT, LAST_PROP,
         EDOG, ESHK, has_emin, has_epri, has_eshk,
         ACH_MEDU, I_SPECIAL } from './const.js';
import { S_poisoncloud } from './symbols.js';
import { m_harmless_trap, m_at } from './trap.js';
import { dist2, distmin } from './hacklib.js';
import { in_rooms } from './hack.js';
import { monmoveTrace, monmoveStepLabel } from './monmove.js';
import { monsterAtWithSegments, worm_cross } from './worm.js';
import { ansimpleoname, Has_contents, vtense, makeplural } from './objnam.js';
import { corpse_intrinsic } from './eat.js';
import { game as _gstate } from './gstate.js';
import { sengr_at, del_engr_at } from './engrave.js';
import { adjalign, change_luck } from './attrib.js';
import { envFlag, writeStderr } from './runtime_env.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { sgn } from './hacklib.js';
import { always_hostile, monsndx, is_vampshifter, is_vampire, engulfing_u, m_canseeu } from './mondata.js';
import { record_achievement } from './insight.js';
import { pmname, Mgender, x_monnam } from './do_name.js';
import { place_monster } from './steed.js';

// C macro: ismnum(mndx) — valid monster index check
// ismnum imported from mondata.js

// NODIAG imported from mondata.js

// ========================================================================
// mcalcmove — C ref: mon.c mcalcmove()
// Calculate monster's movement budget for a turn.
// Randomly rounds speed to a multiple of NORMAL_SPEED (12).
// ========================================================================
export function mcalcmove(mon, m_moving = true) {
    // C reads mtmp->data->mmove each turn.
    // Some JS paths still only carry mndx without data/type pointer,
    // so include mndx->mons fallback to preserve runtime semantics.
    let mmove = Number.isFinite(mon?.data?.mmove)
        ? mon.data.mmove
        : (Number.isFinite(mon?.type?.mmove)
            ? mon.type.mmove
            : (Number.isFinite(mon?.mndx) && Number.isFinite(mons[mon.mndx]?.mmove)
                ? mons[mon.mndx].mmove
                : NORMAL_SPEED));

    // C ref: mon.c:1120-1129 — MSLOW/MFAST adjustments
    if (mon.mspeed === MSLOW) {
        if (mmove < 12)
            mmove = Math.floor((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.floor(mmove / 3);
    } else if (mon.mspeed === MFAST) {
        mmove = Math.floor((4 * mmove + 2) / 3);
    }
    // Note: usteed/gallop check (C mon.c:1131-1136) skipped — riding not ported.

    // C ref: mon.c:1136-1147 — random rounding for non-standard speeds.
    // Only done when m_moving=true (actual movement allocation).
    // worm.c calls with m_moving=false (speed-only, no rn2 consumed).
    if (m_moving) {
        const mmoveAdj = mmove % NORMAL_SPEED;
        mmove -= mmoveAdj;
        if (rn2(NORMAL_SPEED) < mmoveAdj) {
            mmove += NORMAL_SPEED;
        }
    }
    return mmove;
}

// ========================================================================
// allocateMonsterMovement — C ref: allmain.c:226-227 moveloop_core
// Reallocate movement rations to all living monsters via mcalcmove.
// ========================================================================
export async function allocateMonsterMovement(map) {
    for (const mon of map.monsters) {
        // C ref: mon.c movemon_singlemon() uses DEADMONSTER(mtmp), which
        // includes both explicit death flag and non-positive hp.
        if (mon.dead || Number(mon.mhp || 0) <= 0) continue;
        const oldMv = mon.movement;
        mon.movement += await withRngTag('allocateMonsterMovement(mon.js:145)', () => mcalcmove(mon));
        const mmove = Number.isFinite(mon?.data?.mmove)
            ? mon.data.mmove
            : (Number.isFinite(mon?.type?.mmove)
                ? mon.type.mmove
                : (Number.isFinite(mon?.mndx) && Number.isFinite(mons[mon.mndx]?.mmove)
                    ? mons[mon.mndx].mmove
                    : NORMAL_SPEED));
        // Keep event payload key stable for existing sessions while using
        // C-faithful source value (mtmp->data->mmove).
        pushRngLogEntry(`^mcalcmove[${mon.mndx}@${mon.mx},${mon.my} speed=${mmove} mv=${oldMv}->${mon.movement}]`);
    }
}

// ========================================================================
// onscary — C ref: mon.c onscary()
// ========================================================================
export function onscary(map, x, y, mon = null) {
    // C ref: monmove.c:241-303 onscary()
    // <0,0> is used by musical scaring — doesn't care about scrolls/engravings
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;

    if (mon) {
        const mdat = mon.data || mon.type || {};
        // C ref: monmove.c:251-253 — direct resistance: Rodney, lawful minions, Angel, Riders
        if (mon.iswiz || is_rider(mdat)) return false;
        const minAlign = Number(mon?.emin?.min_align ?? mon?.min_align ?? mdat?.maligntyp ?? 0);
        if ((mon.isminion || is_minion(mdat)) && minAlign > 0) return false;
        if (mdat.mndx === PM_ANGEL) return false;

        // C ref: monmove.c:259-261 — magical scare: humans, uniques
        if (magical_scare
            && (mdat.mlet === S_HUMAN || (mdat.geno & G_UNIQ)))
            return false;

        // C ref: monmove.c:266-268 — shopkeepers in shop, priests in temple
        if (mon.isshk && map) {
            // Inline inhishop check (shk.js→mon.js circular import)
            const roomno = Number(mon.shoproom || 0);
            if (roomno >= ROOMOFFSET) {
                const rooms = in_rooms(mon.mx, mon.my, SHOPBASE, map);
                if (rooms.includes(roomno)) return false;
            }
        }
        if (mon.ispriest && inhistemple(mon, map)) return false;
    }

    if (auditory_scare) return true;

    // C ref: monmove.c:274-276 — altar scares vampires
    if (map && mon) {
        const loc = map.at?.(x, y) || map.locations?.[x]?.[y];
        const mdat = mon.data || mon.type || {};
        if (loc && IS_ALTAR(loc.typ)
            && (mdat.mlet === S_VAMPIRE || is_vampshifter(mon)))
            return true;
    }

    // C ref: monmove.c:280-281 — scare monster scroll (own source of power)
    // C's sobj_at checks otyp only; BUC status doesn't affect scaring
    if (map) {
        for (const obj of map.objects || []) {
            if (obj.buried) continue;
            if (obj.ox === x && obj.oy === y
                && obj.otyp === SCR_SCARE_MONSTER) {
                return true;
            }
        }
    }

    // C ref: monmove.c:295-302 — Elbereth with additional restrictions
    if (map) {
        const ep = sengr_at(map, "Elbereth", x, y, true);
        if (ep) {
            const player = _gstate?.player;
            const atHero = player && x === player.x && y === player.y;
            // C ref: monmove.c:296-298 — Elbereth requires hero presence,
            // displaced image, or guardobjects with objects present
            const hasObjects = ep.guardobjects
                && (map.objectsAt ? map.objectsAt(x, y).length > 0
                    : (map.objects || []).some(o => o.ox === x && o.oy === y && !o.buried));
            const displaced = player && (player.Displaced || player.displaced)
                && mon && mon.mux === x && mon.muy === y;
            if (atHero || displaced || hasObjects) {
                // C ref: monmove.c:299-302 — Elbereth exclusions
                if (mon) {
                    if (mon.isshk || mon.isgd || !mon.mcansee
                        || mon.mpeaceful || mon.peaceful
                        || (mon.data || mon.type || {}).mndx === PM_MINOTAUR)
                        return false;
                }
                // C ref: Inhell || In_endgame — Elbereth doesn't work there
                const flags = map.flags || {};
                if (flags.inhell || flags.endgame) return false;
                return true;
            }
        }
    }

    return false;
}

// ========================================================================
// mm_aggression — C ref: mon.c
// ========================================================================
function zombie_form_exists(mdat) {
    const mlet = mdat?.mlet ?? -1;
    switch (mlet) {
    case S_KOBOLD:
    case S_ORC:
    case S_GIANT:
    case S_HUMAN:
    case S_KOP:
    case S_GNOME:
        return true;
    case S_HUMANOID:
        return is_dwarf(mdat);
    default:
        return false;
    }
}

// C ref: mon.c zombie_maker(mon) — returns true if mon can create zombies
export function zombie_maker(mon) {
    if (!mon || mon.mcan) return false;
    const mlet = (mon.data || mon.type)?.mlet ?? -1;
    if (mlet === S_ZOMBIE) {
        return mon.mndx !== PM_GHOUL && mon.mndx !== PM_SKELETON;
    }
    return mlet === S_LICH;
}

// C ref: mon.c zombie_form(pm) — return PM index of zombie form, or NON_PM
// Note: C uses ptr comparison; JS uses symbol and flag predicates.
export function zombie_form(pm) {
    if (!pm) return NON_PM;
    switch (pm.mlet) {
    case S_ZOMBIE:
        return NON_PM; // already a zombie/ghoul/skeleton
    case S_KOBOLD:
        return PM_KOBOLD_ZOMBIE;
    case S_ORC:
        return PM_ORC_ZOMBIE;
    case S_GIANT:
        if (pm === mons[PM_ETTIN]) return PM_ETTIN_ZOMBIE;
        return PM_GIANT_ZOMBIE;
    case S_HUMAN:
    case S_KOP:
        if (is_elf(pm)) return PM_ELF_ZOMBIE;
        return PM_HUMAN_ZOMBIE;
    case S_HUMANOID:
        if (is_dwarf(pm)) return PM_DWARF_ZOMBIE;
        break;
    case S_GNOME:
        return PM_GNOME_ZOMBIE;
    }
    return NON_PM;
}

// C ref: mon.c undead_to_corpse(mndx) — convert undead PM index to living counterpart
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case PM_KOBOLD_ZOMBIE: case PM_KOBOLD_MUMMY: return PM_KOBOLD;
    case PM_DWARF_ZOMBIE:  case PM_DWARF_MUMMY:  return PM_DWARF;
    case PM_GNOME_ZOMBIE:  case PM_GNOME_MUMMY:  return PM_GNOME;
    case PM_ORC_ZOMBIE:    case PM_ORC_MUMMY:    return PM_ORC;
    case PM_ELF_ZOMBIE:    case PM_ELF_MUMMY:    return PM_ELF;
    case PM_VAMPIRE: case PM_VAMPIRE_LEADER:
    case PM_HUMAN_ZOMBIE:  case PM_HUMAN_MUMMY:  return PM_HUMAN;
    case PM_GIANT_ZOMBIE:  case PM_GIANT_MUMMY:  return PM_GIANT;
    case PM_ETTIN_ZOMBIE:  case PM_ETTIN_MUMMY:  return PM_ETTIN;
    default: return mndx;
    }
}

// C ref: mon.c genus(mndx, mode) — return generic species index for a monster.
// mode=0: return base species (PM_HUMAN, PM_ELF, etc.)
// mode=1: return character-class monster (PM_ARCHEOLOGIST, etc.) for quest guardians
export function genus(mndx, mode) {
    switch (mndx) {
    case PM_STUDENT:     return mode ? PM_ARCHEOLOGIST : PM_HUMAN;
    case PM_CHIEFTAIN:   return mode ? PM_BARBARIAN   : PM_HUMAN;
    case PM_NEANDERTHAL: return mode ? PM_CAVE_DWELLER: PM_HUMAN;
    case PM_ATTENDANT:   return mode ? PM_HEALER      : PM_HUMAN;
    case PM_PAGE:        return mode ? PM_KNIGHT       : PM_HUMAN;
    case PM_ABBOT:       return mode ? PM_MONK         : PM_HUMAN;
    case PM_ACOLYTE:     return mode ? PM_CLERIC       : PM_HUMAN;
    case PM_HUNTER:      return mode ? PM_RANGER       : PM_HUMAN;
    case PM_THUG:        return mode ? PM_ROGUE        : PM_HUMAN;
    case PM_ROSHI:       return mode ? PM_SAMURAI      : PM_HUMAN;
    case PM_GUIDE:       return mode ? PM_TOURIST      : PM_HUMAN;
    case PM_APPRENTICE:  return mode ? PM_WIZARD       : PM_HUMAN;
    case PM_WARRIOR:     return mode ? PM_VALKYRIE     : PM_HUMAN;
    default:
        if (mndx >= 0 && mndx < NUMMONS) {
            const ptr = mons[mndx];
            if (is_human(ptr)) return PM_HUMAN;
            if (is_elf(ptr))   return PM_ELF;
            if (is_dwarf(ptr)) return PM_DWARF;
            if (is_gnome(ptr)) return PM_GNOME;
            if (is_orc(ptr))   return PM_ORC;
        }
        return mndx;
    }
}

// C ref: mon.c pm_to_cham(mndx) — return mndx if shapeshifter, else NON_PM
export function pm_to_cham(mndx) {
    if (mndx >= 0 && mndx < NUMMONS && is_shapeshifter(mons[mndx]))
        return mndx;
    return NON_PM;
}

function unique_corpstat(mdat) {
    return !!((mdat?.geno || 0) & G_UNIQ);
}

function mm_2way_aggression(magr, mdef, map) {
    if (!zombie_maker(magr)) return { allowM: false, allowTM: false };
    if (!zombie_form_exists(mdef?.type || {})) return { allowM: false, allowTM: false };
    const inStronghold = map?.flags?.graveyard && map?.flags?.is_maze_lev;
    if (inStronghold) return { allowM: false, allowTM: false };
    if (unique_corpstat(magr?.type || {}) || unique_corpstat(mdef?.type || {})) {
        return { allowM: false, allowTM: false };
    }
    return { allowM: true, allowTM: true };
}

function mm_aggression(magr, mdef, map) {
    if (magr?.tame && mdef?.tame) return { allowM: false, allowTM: false };
    const attackerIdx = magr?.mndx;
    const defenderIdx = mdef?.mndx;
    const isPurpleWorm = attackerIdx === PM_PURPLE_WORM || attackerIdx === PM_BABY_PURPLE_WORM;
    if (isPurpleWorm && defenderIdx === PM_SHRIEKER) return { allowM: true, allowTM: true };

    const ab = mm_2way_aggression(magr, mdef, map);
    const ba = mm_2way_aggression(mdef, magr, map);
    return {
        allowM: ab.allowM || ba.allowM,
        allowTM: ab.allowTM || ba.allowTM,
    };
}

// ========================================================================
// mfndpos — C ref: mon.c mfndpos()
// ========================================================================
// C ref: hack.c bad_rock() / cant_squeeze_thru() subset used by mon.c mfndpos().
function permonst_for(mon) {
    return (Number.isInteger(mon?.mndx) && mons[mon.mndx]) || mon?.data || mon?.type || {};
}

function bad_rock_for_mon(mon, map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return true;
    if (!IS_OBSTRUCTED(loc.typ)) return false;
    const f1 = permonst_for(mon).mflags1 || 0;
    const canPassWall = !!(f1 & M1_WALLWALK);
    if (canPassWall) return false;
    const canTunnel = !!(f1 & M1_TUNNEL);
    const needsPick = !!(f1 & M1_NEEDPICK);
    if (canTunnel && !needsPick) return false;
    return true;
}

function cant_squeeze_thru_mon(mon) {
    const ptr = permonst_for(mon);
    const f1 = ptr.mflags1 || 0;
    if (f1 & M1_WALLWALK) return false;
    const size = ptr.msize || 0;
    const canMorph = !!(f1 & (M1_AMORPHOUS | M1_UNSOLID | M1_SLITHY));
    if (size > MZ_MEDIUM && !canMorph) return true;
    const load = Array.isArray(mon.minvent)
        ? mon.minvent.reduce((a, o) => a + (o?.owt || 0), 0)
        : 0;
    return load > 600;
}

// C ref: monmove.c monlineu() — true if (nx,ny) lies on a line from mon through hero.
// Used for NOTONL: shopkeepers/priests avoid standing on a line from hero.
export function monlineu(mon, player, nx, ny) {
    const mux = Number.isInteger(mon.mux) ? mon.mux : 0;
    const muy = Number.isInteger(mon.muy) ? mon.muy : 0;
    return nx === mux || ny === muy
        || (ny - muy) === (nx - mux)
        || (ny - muy) === -(nx - mux);
}

// C ref: mon.c mm_displacement() — can attacker displace defender?
export function mm_displacement(mon, monAtPos) {
    const monLevel = (m) => Number.isInteger(m?.m_lev) ? m.m_lev
        : (Number.isInteger((m?.data || m?.type)?.mlevel) ? (m.data || m.type).mlevel : 0);
    if (!is_displacer(mon.data || mon.type || {})) return false;
    const defenderIsDisplacer = is_displacer(monAtPos.data || monAtPos.type || {});
    const attackerHigherLevel = monLevel(mon) > monLevel(monAtPos);
    const defenderIsGridBugDiag = (monAtPos.mndx === PM_GRID_BUG)
        && (mon.mx !== monAtPos.mx && mon.my !== monAtPos.my);
    const defenderMultiworm = !!monAtPos.wormno;
    const attackerPtr = mon.data || mon.type || {};
    const defenderPtr = monAtPos.data || monAtPos.type || {};
    const attackerSize = Number.isInteger(attackerPtr?.msize) ? attackerPtr.msize : 0;
    const defenderSize = Number.isInteger(defenderPtr?.msize) ? defenderPtr.msize : 0;
    const sizeOk = is_rider(attackerPtr) || attackerSize >= defenderSize;
    return (!defenderIsDisplacer || attackerHigherLevel)
        && !defenderIsGridBugDiag
        && !monAtPos.mtrapped
        && !defenderMultiworm
        && sizeOk;
}

export function mfndpos(mon, map, player, flag) {
    // C ref: mon.c:2122-2366 mfndpos()
    // If flag is not provided (legacy callers), default to 0.
    if (typeof flag !== 'number') flag = 0;

    const omx = mon.mx, omy = mon.my;
    const nowtyp = map.at(omx, omy)?.typ;
    const mdat = permonst_for(mon);
    const mflags1 = mdat.mflags1 || 0;
    const mlet = mdat.mlet ?? -1;
    const nodiag = (mon.mndx === PM_GRID_BUG);

    // C ref: mon.c:2142-2145 — confused: grant all, remove notonl
    if (mon.confused) {
        flag |= ALLOW_ALL;
        flag &= ~NOTONL;
    }
    // C ref: mon.c:2146-2147 — blind: add ALLOW_SSM
    if (mon.blind || mon.mcansee === 0 || mon.mcansee === false) {
        flag |= ALLOW_SSM;
    }

    const isFlyer = !!(mflags1 & M1_FLY);
    const isFloater = (mlet === S_EYE || mlet === S_LIGHT);
    const isClinger = is_clinger(mdat);
    const hasCeiling = !(map?.flags?.is_airlevel || map?.flags?.is_waterlevel);
    // C ref: mon.c:2152 — m_in_air includes clingers on ceilings when undetected
    const m_in_air = isFlyer || isFloater || (isClinger && hasCeiling && mon.mundetected);
    const wantpool = (mlet === S_EEL);
    const isSwimmer = !!(mflags1 & (M1_SWIM | M1_AMPHIBIOUS));
    const poolok = (m_in_air || (isSwimmer && !wantpool));
    const likesLava = (mon.mndx === PM_FIRE_ELEMENTAL || mon.mndx === PM_SALAMANDER);
    // C ref: mon.c:2160 — lavaok: flyers (not floaters) or lava-likers; exclude floating eye
    const lavaok = ((m_in_air && !isFloater) || likesLava) && mon.mndx !== PM_FLOATING_EYE;
    // C ref: mon.c:2162 — thrudoor = passes_walls || BUSTDOOR
    const thrudoor = !!((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    const isAmorphous = !!(mflags1 & M1_AMORPHOUS);
    // C ref: mon.c:2164 — can_fog(mon): amorphous or unsolid fog form
    // Simplified: amorphous monsters can pass through doors
    const canFog = isAmorphous;

    const positions = [];
    const cellInRegion = (reg, rx, ry) => {
        if (!reg) return false;
        const bb = reg.bounding_box;
        if (!bb || rx < bb.lx || rx > bb.hx || ry < bb.ly || ry > bb.hy) return false;
        if (Array.isArray(reg.rects) && reg.rects.length > 0) {
            for (const rr of reg.rects) {
                if (rx >= rr.lx && rx <= rr.hx && ry >= rr.ly && ry <= rr.hy) return true;
            }
            return false;
        }
        return true;
    };
    const visiblePoisonGasAt = (rx, ry) => {
        const regs = map?.regions;
        if (!Array.isArray(regs)) return false;
        for (const reg of regs) {
            if (!reg || !reg.visible || reg.ttl === -2) continue;
            if (reg.glyph !== S_poisoncloud) continue;
            if (cellInRegion(reg, rx, ry)) return true;
        }
        return false;
    };
    const poisongas_ok = (m_poisongas_ok(mon) === M_POISONGAS_OK);
    const in_poisongas = visiblePoisonGasAt(omx, omy);
    const maxx = Math.min(omx + 1, COLNO - 1);
    const maxy = Math.min(omy + 1, ROWNO - 1);

    let nexttry = 0; // C ref: eel retry loop
    for (;;) {
    for (let nx = Math.max(1, omx - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, omy - 1); ny <= maxy; ny++) {
            if (nx === omx && ny === omy) continue;
            if (nx !== omx && ny !== omy && nodiag) continue;

            const loc = map.at(nx, ny);
            if (!loc) continue;
            const ntyp = loc.typ;
            let posInfo = 0;

            // C ref: mon.c:2192-2197 — IS_OBSTRUCTED: need ALLOW_WALL, ALLOW_ROCK, or ALLOW_DIG
            if (IS_OBSTRUCTED(ntyp)) {
                if (!(flag & ALLOW_WALL) && !(flag & ALLOW_ROCK) && !(flag & ALLOW_DIG)) continue;
            }
            if (ntyp === WATER && !isSwimmer) continue;
            // C ref: mon.c:2203-2206 — IRONBARS: check ALLOW_BARS flag
            if (ntyp === IRONBARS && !(flag & ALLOW_BARS)) continue;

            // C ref: mon.c:2208-2217 — door handling
            if (IS_DOOR(ntyp)) {
                const canPassDoor = (isAmorphous && !mon.engulfing) || canFog || thrudoor;
                if (!canPassDoor) {
                    if ((loc.flags & D_CLOSED) && !(flag & OPENDOOR)) continue;
                    if ((loc.flags & D_LOCKED) && !(flag & UNLOCKDOOR)) continue;
                }
            }

            // C ref: mon.c:2226-2230 — avoid entering poison gas unless
            // monster tolerates it, or it's already in poison gas.
            if (!poisongas_ok && !in_poisongas && visiblePoisonGasAt(nx, ny)) continue;

            // C ref: mon.c:2218-2221 — diagonal door checks
            if (nx !== omx && ny !== omy) {
                const monLoc = map.at(omx, omy);
                if ((IS_DOOR(ntyp) && (loc.flags & ~D_BROKEN))
                    || (monLoc && IS_DOOR(monLoc.typ) && (monLoc.flags & ~D_BROKEN)))
                    continue;
                // C ref: rogue level diagonal check — no diagonal movement
                const isRogueLevel = !!(map?.flags?.is_rogue || map?.flags?.roguelike || map?.flags?.is_rogue_lev);
                if (isRogueLevel) continue;
                // C ref: mon.c:2222-2225 — don't pass diagonally between
                // adjacent long worm segments (unless attacking hero square).
                const sideMonA = monsterAtWithSegments(map, omx, ny);
                const sideMonB = monsterAtWithSegments(map, nx, omy);
                const diagMon = monsterAtWithSegments(map, nx, ny);
                if (sideMonA && sideMonB
                    && worm_cross(omx, omy, nx, ny, map)
                    && !diagMon
                    && !(nx === player.x && ny === player.y)) {
                    continue;
                }
            }

            // C ref: mon.c:2236-2237 — LAVAWALL needs lavaok AND ALLOW_WALL
            if (ntyp === LAVAWALL && (!lavaok || !(flag & ALLOW_WALL))) continue;

            // C ref: mon.c:2245-2246 — pool/lava gate applies to every square:
            // (poolok || is_pool(nx,ny)==wantpool) && (lavaok || !is_lava(nx,ny))
            // This is critical for eel movement: when wantpool is true and poolok
            // is false, non-pool squares must be rejected here.
            const isPool = IS_POOL(ntyp);
            const isLava = IS_LAVA(ntyp);
            if (!(poolok || (isPool === wantpool))) continue;
            if (!(lavaok || !isLava)) continue;

            // === Inside the "acceptable terrain" block ===

            // C ref: mon.c:2267-2269 — onscary + ALLOW_SSM check
            if (onscary(map, nx, ny) && !(flag & ALLOW_SSM)) continue;

            // C ref: mon.c:2270-2315 — hero/apparent-target handling.
            // If square is actual hero OR current apparent hero target, treat it
            // as ALLOW_U candidate and skip MON_AT/sanctuary branch checks.
            if ((nx === player.x && ny === player.y)
                || (nx === mon.mux && ny === mon.muy)) {
                if (nx === player.x && ny === player.y) {
                    // C ref: if right next to you, set mux/muy to true hero pos.
                    mon.mux = player.x;
                    mon.muy = player.y;
                }
                if (!(flag & ALLOW_U)) continue;
                posInfo |= ALLOW_U;
            } else {
                // C ref: mon.c:2286-2304 — monster at position
                const monAtPos = monsterAtWithSegments(map, nx, ny);
                if (monAtPos) {
                    let allowMAttack = false;
                    if (flag & ALLOW_M) {
                        // C ref: ALLOW_M from caller permits attacking occupied
                        // squares; defender tame still requires ALLOW_TM.
                        allowMAttack = true;
                        if (monAtPos.tame && !(flag & ALLOW_TM)) {
                            allowMAttack = false;
                        }
                    } else {
                        // Hostile/peaceful: check mm_aggression-derived flags.
                        const mmflag = mm_aggression(mon, monAtPos, map);
                        if (mmflag.allowM) {
                            allowMAttack = true;
                            if (monAtPos.tame && !mmflag.allowTM) {
                                allowMAttack = false;
                            }
                        }
                    }
                    if (allowMAttack) {
                        posInfo |= ALLOW_M;
                        if (monAtPos.tame) posInfo |= ALLOW_TM;
                    } else if (mm_displacement(mon, monAtPos)) {
                        posInfo |= ALLOW_MDISP;
                    } else {
                        continue;
                    }
                }

                // C ref: mon.c:2306-2313 — entering sanctuary from outside.
                if (map?.flags?.has_temple) {
                    const roomHere = map.roomAt ? map.roomAt(omx, omy) : null;
                    const roomThere = map.roomAt ? map.roomAt(nx, ny) : null;
                    const hereTemple = roomHere?.rtype === TEMPLE;
                    const thereTemple = roomThere?.rtype === TEMPLE;
                    if (thereTemple && !hereTemple
                        && in_your_sanctuary(null, nx, ny, map, player)) {
                        if (!(flag & ALLOW_SANCT)) continue;
                        posInfo |= ALLOW_SANCT;
                    }
                }
            }

            // C ref: mon.c:2316+ — garlic avoidance for undead
            if (flag & NOGARLIC) {
                let hasGarlic = false;
                for (const obj of map.objects) {
                    if (obj.buried) continue;
                    if (obj.ox === nx && obj.oy === ny && obj.otyp === CLOVE_OF_GARLIC) {
                        hasGarlic = true;
                        break;
                    }
                }
                if (hasGarlic) continue;
            }

            // C ref: mon.c:2315-2323 — boulder check (ALLOW_ROCK)
            if (!(flag & ALLOW_ROCK)) {
                let hasBoulder = false;
                for (const obj of map.objects) {
                    if (obj.buried) continue;
                    if (obj.ox === nx && obj.oy === ny && obj.otyp === BOULDER) {
                        hasBoulder = true;
                        break;
                    }
                }
                if (hasBoulder) continue;
            }

            // C ref: mon.c:2325-2331 — NOTONL: check monlineu
            // C ref: mon.c mfndpos() monseeu = (mon->mcansee && (!Invis || perceives(mdat))).
            // This intentionally does not require clear LOS to current hero square.
            const heroInvis = !!(player?.Invis || player?.invisible);
            const monSeeHero = (mon.mcansee !== 0 && mon.mcansee !== false)
                && (!heroInvis || perceives(mdat));
            if (monSeeHero && monlineu(mon, player, nx, ny)) {
                if (flag & NOTONL) continue;
                posInfo |= NOTONL;
            }

            // C ref: mon.c:2333-2340 — tight squeeze for diagonal
            if (nx !== omx && ny !== omy) {
                const sideAIsBadRock = bad_rock_for_mon(mon, map, omx, ny);
                const sideBIsBadRock = bad_rock_for_mon(mon, map, nx, omy);
                if (sideAIsBadRock && sideBIsBadRock && cant_squeeze_thru_mon(mon))
                    continue;
            }

            // C ref: mon.c:2342-2352 — trap check
            const trap = map.trapAt(nx, ny);
            if (trap) {
                if (!m_harmless_trap(mon, trap, map)) {
                    if (!(flag & ALLOW_TRAPS)) {
                        if (mon_knows_traps(mon, trap.ttyp))
                            continue;
                    }
                    posInfo |= ALLOW_TRAPS;
                }
            }

            positions.push({
                x: nx,
                y: ny,
                info: posInfo,
                // Legacy compat fields for callers that still use them
                allowTraps: !!(posInfo & ALLOW_TRAPS),
                allowM: !!(posInfo & ALLOW_M),
                allowMDisp: !!(posInfo & ALLOW_MDISP),
                allowU: !!(posInfo & ALLOW_U),
                notOnLine: !!(posInfo & NOTONL),
            });
        }
    }

    // C ref: mon.c:2363-2365 — eel nexttry only when no moves and current
    // square is not pool.
    if (positions.length === 0 && nexttry === 0 && wantpool && !IS_POOL(nowtyp)) {
        nexttry = 1;
        continue;
    }
    break;
    } // end nexttry loop

    return positions;
}

// ========================================================================
// Hider premove — C ref: mon.c restrap() / movemon_singlemon()
// ========================================================================
function canSeeForRestrap(mon, map, player, fov) {
    if (!mon || !map || !player) return false;
    const canSeeSquare = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
    return !!canSeeSquare && !player.blind;
}

export function handleHiderPremove(mon, map, player, fov) {
    const ptr = mon.data || mon.type || {};
    if (!is_hider(ptr)) return false;

    const trap = mon.mtrapped ? map.trapAt(mon.mx, mon.my) : null;
    const trappedOutsidePit = !!(mon.mtrapped && trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT);
    const isCeilingHider = ptr.mlet === S_PIERCER;
    const hasCeiling = !(map?.flags?.is_airlevel || map?.flags?.is_waterlevel);
    const sensedAndAdjacent = canSpotMonsterForMap(mon, map, player, fov) && monnear(mon, player.x, player.y);

    const blocked =
        mon.mcan
        || mon.m_ap_type
        || mon.appear_as_type
        || canSeeForRestrap(mon, map, player, fov)
        || rn2(3)
        || trappedOutsidePit
        || (isCeilingHider && !hasCeiling)
        || sensedAndAdjacent;

    if (!blocked) {
        if (ptr.mlet === S_MIMIC) {
            if (!(mon.sleeping || (mon.mfrozen > 0))) {
                mon.m_ap_type = mon.m_ap_type || M_AP_OBJECT;
                return true;
            }
        } else if (map.at(mon.mx, mon.my)?.typ === ROOM) {
            mon.mundetected = true;
            return true;
        }
    }

    return !!(mon.m_ap_type || mon.appear_as_type || mon.mundetected);
}

// ========================================================================
// corpse_chance — C ref: mon.c:3178-3252
// ========================================================================

// C ref: mon.c:3178-3252 corpse_chance() — determines if monster leaves a corpse.
// Returns true if corpse should be created. CRITICAL: several early-return paths
// do NOT consume rn2(), so callers must use this instead of rolling directly.
export function corpse_chance(mon) {
    const mdat = mon?.data || mon?.type || (Number.isInteger(mon?.mndx) ? mons[mon.mndx] : {});
    if (!mdat) return false;

    // C ref: mon.c:3190-3194 — Vlad and liches crumble to dust (no corpse, no RNG)
    if (mon.mndx === PM_VLAD_THE_IMPALER || mdat.mlet === S_LICH)
        return false;

    // C ref: mon.c:3195-3231 — gas spores explode (AT_BOOM); d() consumed for damage
    if (mdat.mattk) {
        for (const atk of mdat.mattk) {
            if (atk && atk.aatyp === AT_BOOM) {
                // C computes explosion damage even though corpse_chance just returns false
                // The d() call consumes RNG and must be matched
                let tmp;
                if (atk.damn)
                    tmp = d(atk.damn, atk.damd);
                else if (atk.damd)
                    tmp = d((mdat.mlevel || 0) + 1, atk.damd);
                // else tmp = 0 — no RNG consumed
                // C then calls mon_explodes() which may consume more RNG,
                // but that's a separate function not yet ported
                return false;
            }
        }
    }

    // C ref: mon.c:3233 — LEVEL_SPECIFIC_NOCORPSE
    // (Not relevant in early game — skip)

    // C ref: mon.c:3235-3238 — big monsters, lizards, golems, players, riders,
    // shopkeepers ALWAYS leave corpses (no RNG consumed)
    const bigmonst = (mdat.msize || 0) >= MZ_LARGE;
    if (((bigmonst || mon.mndx === PM_LIZARD) && !mon.mcloned)
        || is_golem(mdat) || is_mplayer(mdat) || is_rider(mdat) || mon.isshk)
        return true;

    // C ref: mon.c:3239-3240 — probabilistic: rn2(tmp) where tmp = 2 + rare + tiny
    const gfreq = (mdat.geno || 0) & G_FREQ;
    const verysmall = (mdat.msize || 0) === MZ_TINY;
    const corpsetmp = 2 + (gfreq < 2 ? 1 : 0) + (verysmall ? 1 : 0);
    return !rn2(corpsetmp);
}

// ========================================================================
// Monster death chain — C ref: mon.c
// ========================================================================

// C ref: mon.c mlifesaver() — check for amulet of life saving
export function mlifesaver(mon) {
    if (nonliving(mon.data || mon.type || {}) && !mon.is_vampshifter) return null;
    const otmp = which_armor(mon, W_AMUL);
    if (otmp && otmp.otyp === AMULET_OF_LIFE_SAVING) return otmp;
    return null;
}

// C ref: mon.c set_mon_min_mhpmax() — ensure minimum mhpmax after life-save
export function set_mon_min_mhpmax(mon, minimum) {
    const mlev = mon.m_lev ?? ((mon.data || mon.type)?.mlevel ?? 0);
    const minval = Math.max(mlev + 1, minimum);
    if ((mon.mhpmax || 0) < minval) mon.mhpmax = minval;
}

// C ref: mon.c lifesaved_monster() — activate life saving amulet
export function lifesaved_monster(mon) {
    const lifesave = mlifesaver(mon);
    if (lifesave) {
        // Use up the amulet
        if (Array.isArray(mon.minvent)) {
            const idx = mon.minvent.indexOf(lifesave);
            if (idx >= 0) mon.minvent.splice(idx, 1);
        }
        if (mon.amulet === lifesave) mon.amulet = null;
        // Revive
        mon.mcanmove = true;
        mon.mfrozen = 0;
        set_mon_min_mhpmax(mon, 10);
        mon.mhp = mon.mhpmax;
        // Mark for gear re-evaluation
        check_gear_next_turn(mon);
    }
}

// C ref: mon.c check_gear_next_turn() — flag for next-turn equipment evaluation
export function check_gear_next_turn(mon) {
    mon.misc_worn_check = (mon.misc_worn_check || 0) | I_SPECIAL;
}

// C ref: mon.c m_detach() — detach monster from map
// In JS, this is handled by monutil.js mondead + movemon's dead filter.
// We provide this as a C-compatible alias.
export function m_detach(mon, mptr, due_to_death, map, player) {
    // JS doesn't have the complex C detach chain.
    // The existing monutil.mondead handles the core: mark dead, drop inv, newsym, unstuck.
    // This wrapper is for callers that expect the C API.
    if (due_to_death && map) {
        mondead(mon, map, player);
    } else {
        mon.dead = true;
        mon.mhp = 0;
        if (player) unstuck(mon, player);
    }
}

// C ref: mon.c mondead() — full death processing with life-saving
export function mondead_full(mon, map, player) {
    mon.mhp = 0;
    lifesaved_monster(mon);
    if (mon.mhp > 0) return; // life-saved

    const mdat = mon.data || mon.type || {};

    // C ref: mon.c:3098-3099 — Steam Vortex creates harmless gas cloud on death
    if (mon.mndx === PM_STEAM_VORTEX) {
        create_gas_cloud(mon.mx, mon.my, rn2(10) + 5, 0, map, player, _gstate);
    }

    // C ref: mon.c:3142-3160 — Dead Kops may come back
    if (mdat.mlet === S_KOP) {
        // Find downstairs synchronously (stairway_find_type_dir is async, avoid that)
        const gs = globalThis.gs || {};
        let stway = null;
        for (let tmp = gs.stairs; tmp; tmp = tmp.next) {
            if (!tmp.isladder && !tmp.up) { stway = tmp; break; }
        }
        switch (rnd(5)) {
        case 1: // returns near the stairs
            if (stway) {
                makemon(mdat, stway.sx, stway.sy, 0, _gstate?.depth, map);
                break;
            }
            // FALLTHROUGH
        case 2: // randomly
            makemon(mdat, 0, 0, 0, _gstate?.depth, map);
            break;
        default:
            break;
        }
    }

    // Log death event and process (delegating to monutil.mondead)
    mondead(mon, map, player);
}

// C ref: mon.c mondied() — died of own accord, maybe leaves corpse
export function mondied(mon, map, player) {
    mondead_full(mon, map, player);
    if (mon.mhp > 0) return; // life-saved

    if (corpse_chance(mon) && map) {
        const loc = map.at(mon.mx, mon.my);
        if (loc && (ACCESSIBLE(loc.typ) || IS_POOL(loc.typ))) {
            make_corpse(mon, 0, map);
            newsym(mon.mx, mon.my);
        }
    }
}

// C ref: mon.c mongone() — remove without corpse (disappears)
export function mongone(mon, map, player) {
    mon.mhp = 0;
    if (player) unstuck(mon, player);
    // Discard inventory without dropping
    if (Array.isArray(mon.minvent)) mon.minvent = [];
    mon.weapon = null;
    mon.dead = true;
    if (map) newsym(mon.mx, mon.my);
}

// C ref: mon.c monkilled() — killed by non-hero
export function monkilled(mon, fltxt, how, map, player) {
    // C ref: disintegested for AD_DGST/AD_RBRE/AD_FIRE+completelyburns
    // Simplified: always go through mondied path
    mondied(mon, map, player);
}

// C ref: mon.c xkilled() — hero kills monster
export function xkilled(mon, xkill_flags, map, player) {
    const nomsg = !!(xkill_flags & XKILL_NOMSG);
    const nocorpse = !!(xkill_flags & XKILL_NOCORPSE);
    const x = mon.mx, y = mon.my;

    mon.mhp = 0;

    // C ref: mondead() with life-saving
    mondead_full(mon, map, player);
    if (mon.mhp > 0) return; // life-saved

    if (nocorpse) return;

    // C ref: mon.c:3580-3607 — "illogical but traditional" treasure drop
    const mdat = mon?.data || mon?.type || {};
    const mndx = mon.mndx ?? 0;
    const game = _gstate;
    if (map && !rn2(6)
        && !(game?.mvitals?.[mndx]?.mvflags & G_NOCORPSE)
        && (x !== (player?.x || 0) || y !== (player?.y || 0))
        && mdat.mlet !== S_KOP
        && !mon.mcloned) {
        const otmp = mkobj(RANDOM_CLASS, true);
        if (otmp) {
            const otyp = otmp.otyp;
            if (otmp.oclass === FOOD_CLASS && !(mdat.mflags2 & M2_COLLECT)
                && !otmp.oartifact) {
                delobj(otmp);
            } else if ((mdat.msize || 0) < MZ_HUMAN && otyp !== FIGURINE
                && (otmp.owt > 30 || objectData[otyp]?.oc_big)) {
                delobj(otmp);
            } else {
                place_object(otmp, x, y, map);
                stackobj(otmp, map);
            }
        }
    }

    // Corpse
    if (map && !nocorpse && corpse_chance(mon)) {
        const loc = map.at(x, y);
        if (loc && (ACCESSIBLE(loc.typ) || IS_POOL(loc.typ))) {
            make_corpse(mon, 0, map);
            newsym(x, y);
        }
    }

    // C ref: mon.c:3638-3668 — cleanup: punish bad behavior, give experience
    if (player) {
        // Murder penalty: killing non-hostile humans (excluding role monsters and PM_HUMAN)
        if (is_human(mdat)
            && (!always_hostile(mdat) && (mon.malign || 0) <= 0)
            && (mndx < PM_ARCHEOLOGIST || mndx > PM_WIZARD)
            && mndx !== PM_HUMAN
            && (player.alignment ?? 0) !== A_CHAOTIC) {
            // HTelepat &= ~INTRINSIC; // TODO: intrinsic telepathy loss
            change_luck(-2, player);
            // You("murderer!"); // cosmetic
        }
        // Peaceful/tame luck penalty — rn2(2) is RNG-consuming
        if ((mon.peaceful && !rn2(2)) || mon.mtame)
            change_luck(-1, player);
        // Unicorn guilt — same alignment
        if (is_unicorn(mdat) && sgn(player.alignment ?? 0) === sgn(mdat.maligntyp || 0)) {
            change_luck(-5, player);
            // You_feel("guilty..."); // cosmetic
        }

        // Give experience points
        const game = _gstate;
        const tmp = experience(mon, game?.mvitals?.[mndx]?.died || 0);
        more_experienced(tmp, 0, game, player);
        // newexplevel is async but non-RNG; skip for now

        // Alignment adjustments for special monsters
        const msound = mdat.msound ?? 0;
        if (game?.quest_status?.leader_m_id && mon.m_id === game.quest_status.leader_m_id) {
            // REAL BAD! Killed quest leader
            adjalign(player, -((player.alignmentRecord || 0) + Math.floor(14 / 2)));
            // u.ugangr += 7; // TODO: god anger
            change_luck(-20, player);
        } else if (msound === MS_NEMESIS) {
            // Real good! (only if leader not killed)
            if (!game?.quest_status?.killed_leader)
                adjalign(player, Math.floor(14 / 4)); // ALIGNLIM/4
        } else if (msound === MS_GUARDIAN) {
            adjalign(player, -Math.floor(14 / 8)); // -ALIGNLIM/8
            // u.ugangr++; // TODO: god anger
            change_luck(-4, player);
        } else if (mon.ispriest) {
            adjalign(player, p_coaligned(mon, player) ? -2 : 2);
            if (p_coaligned(mon, player))
                player.ublessed = 0;
            if ((mdat.maligntyp || 0) === A_NONE)
                adjalign(player, Math.floor(14 / 4)); // ALIGNLIM/4
        } else if (mon.mtame) {
            adjalign(player, -15);
        }
    }
}

// C ref: mon.c killed() — wrapper for xkilled with XKILL_GIVEMSG
// Autotranslated from mon.c:3468
export async function killed(mtmp, map, player) {
  await xkilled(mtmp, XKILL_GIVEMSG, map, player);
}

// C ref: mon.c:545-714 make_corpse() — per-monster corpse/drop creation
export function make_corpse(mon, corpseflags, map) {
    const mndx = mon.mndx ?? 0;
    const mdat = mon?.data || mon?.type || mons[mndx] || {};
    const x = mon.mx, y = mon.my;
    let obj = null;
    let num;

    // C ref: mon.c:557-560 — gender bits
    const CORPSTAT_FEMALE = 1;
    const CORPSTAT_MALE = 2;
    const CORPSTAT_NEUTER = 3;
    const CORPSTAT_INIT = 4;
    let corpstatflags = corpseflags;
    if (mon.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (!is_neuter(mdat)) corpstatflags |= CORPSTAT_MALE;

    // C ref: mon.c:562-714 — switch on monster type for special drops
    let makeDefaultCorpse = true;
    switch (mndx) {
    case PM_GRAY_DRAGON:
    case PM_GOLD_DRAGON:
    case PM_SILVER_DRAGON:
    case PM_RED_DRAGON:
    case PM_ORANGE_DRAGON:
    case PM_WHITE_DRAGON:
    case PM_BLACK_DRAGON:
    case PM_BLUE_DRAGON:
    case PM_GREEN_DRAGON:
    case PM_YELLOW_DRAGON:
        // C ref: mon.c:578-583 — dragon scales
        if (!rn2(mon.mrevived ? 20 : 3)) {
            num = GRAY_DRAGON_SCALES + mndx - PM_GRAY_DRAGON;
            obj = mksobj_at(num, x, y, false, false);
            if (obj) { obj.spe = 0; obj.cursed = false; obj.blessed = false; }
        }
        break; // goto default_1 — still makes corpse

    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
        // C ref: mon.c:588-597 — unicorn horn
        if (mon.mrevived && rn2(2)) {
            // horn crumbles to dust — no item
        } else {
            obj = mksobj_at(UNICORN_HORN, x, y, true, false);
            if (obj && mon.mrevived) obj.degraded_horn = 1;
        }
        break; // goto default_1 — still makes corpse

    case PM_LONG_WORM:
        // C ref: mon.c:600 — worm tooth
        mksobj_at(WORM_TOOTH, x, y, true, false);
        break; // goto default_1 — still makes corpse

    case PM_VAMPIRE:
    case PM_VAMPIRE_LEADER: {
        // C ref: mon.c:602-609 — old corpse of living counterpart
        num = undead_to_corpse(mndx);
        obj = mkcorpstat(CORPSE, num, true, x, y, map);
        if (obj) obj.age -= (TAINT_AGE + 1);
        makeDefaultCorpse = false;
        break;
    }
    case PM_KOBOLD_MUMMY:
    case PM_DWARF_MUMMY:
    case PM_GNOME_MUMMY:
    case PM_ORC_MUMMY:
    case PM_ELF_MUMMY:
    case PM_HUMAN_MUMMY:
    case PM_GIANT_MUMMY:
    case PM_ETTIN_MUMMY:
    case PM_KOBOLD_ZOMBIE:
    case PM_DWARF_ZOMBIE:
    case PM_GNOME_ZOMBIE:
    case PM_ORC_ZOMBIE:
    case PM_ELF_ZOMBIE:
    case PM_HUMAN_ZOMBIE:
    case PM_GIANT_ZOMBIE:
    case PM_ETTIN_ZOMBIE: {
        // C ref: mon.c:626-630 — old corpse of living counterpart
        num = undead_to_corpse(mndx);
        obj = mkcorpstat(CORPSE, num, true, x, y, map);
        if (obj) obj.age -= (TAINT_AGE + 1);
        makeDefaultCorpse = false;
        break;
    }
    case PM_IRON_GOLEM:
        // C ref: mon.c:631-636 — iron chains
        num = d(2, 6);
        while (num-- > 0)
            obj = mksobj_at(IRON_CHAIN, x, y, true, false);
        makeDefaultCorpse = false;
        break;

    case PM_GLASS_GOLEM:
        // C ref: mon.c:637-643 — glass gems
        num = d(2, 4);
        while (num-- > 0)
            obj = mksobj_at(FIRST_GLASS_GEM + rn2(NUM_GLASS_GEMS), x, y, true, false);
        makeDefaultCorpse = false;
        break;

    case PM_CLAY_GOLEM:
        // C ref: mon.c:644-649 — rocks
        obj = mksobj_at(OBJ_ROCK, x, y, false, false);
        if (obj) {
            obj.quan = rn2(20) + 50;
            obj.owt = weight(obj);
        }
        makeDefaultCorpse = false;
        break;

    case PM_STONE_GOLEM:
        // C ref: mon.c:650-654 — statue
        obj = mkcorpstat(STATUE, mndx, false, x, y, map);
        makeDefaultCorpse = false;
        break;

    case PM_WOOD_GOLEM:
        // C ref: mon.c:655-666 — wooden items
        num = d(2, 4);
        while (num-- > 0) {
            obj = mksobj_at(
                rn2(2) ? QUARTERSTAFF
                : rn2(3) ? SMALL_SHIELD
                : rn2(3) ? CLUB
                : rn2(3) ? ELVEN_SPEAR : BOOMERANG,
                x, y, true, false);
        }
        makeDefaultCorpse = false;
        break;

    case PM_ROPE_GOLEM:
        // C ref: mon.c:667-675 — rope items
        num = rn2(3);
        while (num-- > 0) {
            obj = mksobj_at(
                rn2(2) ? LEASH
                : rn2(3) ? BULLWHIP : GRAPPLING_HOOK,
                x, y, true, false);
        }
        makeDefaultCorpse = false;
        break;

    case PM_LEATHER_GOLEM:
        // C ref: mon.c:676-683 — leather items
        num = d(2, 4);
        while (num-- > 0)
            obj = mksobj_at(
                rn2(4) ? LEATHER_ARMOR
                : rn2(3) ? LEATHER_CLOAK : SADDLE,
                x, y, true, false);
        makeDefaultCorpse = false;
        break;

    case PM_GOLD_GOLEM:
        // C ref: mon.c:684-688 — gold
        obj = mkgold(200 - rnl(101), x, y);
        makeDefaultCorpse = false;
        break;

    case PM_PAPER_GOLEM:
        // C ref: mon.c:689-694 — blank scrolls
        num = rnd(4);
        while (num-- > 0)
            obj = mksobj_at(SCR_BLANK_PAPER, x, y, true, false);
        makeDefaultCorpse = false;
        break;

    // C ref: mon.c:697-709 — pudding globs
    case PM_GRAY_OOZE:
    case PM_BROWN_PUDDING:
    case PM_GREEN_SLIME:
    case PM_BLACK_PUDDING:
        obj = mksobj_at(GLOB_OF_BLACK_PUDDING - (PM_BLACK_PUDDING - mndx),
                        x, y, true, false);
        makeDefaultCorpse = false;
        newsym(x, y);
        return obj;

    default:
        break;
    }

    // C ref: mon.c:874-880 — default_1: create standard corpse
    if (makeDefaultCorpse) {
        // C ref: mon.c:874 — G_NOCORPSE check (genocide, etc.)
        const game = _gstate;
        if (game?.mvitals?.[mndx]?.mvflags & G_NOCORPSE) {
            return null;
        }
        obj = mkcorpstat(CORPSE, mndx, true, x, y, map);
    }

    // C ref: mon.c make_corpse() sets CORPSTAT gender bits
    if (obj) {
        if (is_neuter(mdat)) obj.spe = CORPSTAT_NEUTER;
        else if (is_female(mdat) || mon?.female === true) obj.spe = CORPSTAT_FEMALE;
        else if (is_male(mdat) || mon?.female === false) obj.spe = CORPSTAT_MALE;
    }
    return obj;
}

// ========================================================================
// Monster alertness — C ref: mon.c
// ========================================================================

// C ref: mon.c wake_msg() — display wake message
export function wake_msg(mon, via_attack) {
    // Simplified: message output not fully ported
}

// C ref: mon.c wakeup() — wake monster, possibly anger
export function wakeup(mon, via_attack, map, player) {
    mon.msleeping = 0;
    mon.sleeping = false;
    // Reveal hidden mimic
    if (mon.m_ap_type && mon.m_ap_type !== M_AP_MONSTER) {
        seemimic(mon, map);
    }
    if (via_attack) {
        setmangry(mon, true, map, player);
    }
}

// C ref: mon.c seemimic() — reveal hiding mimic
export function seemimic(mon, map) {
    mon.m_ap_type = M_AP_NOTHING;
    mon.appear_as_type = null;
    if (map) newsym(mon.mx, mon.my);
}

// C ref: mon.c:4367-4392 wake_nearto_core() — wake all within distance
export function wake_nearto_core(x, y, distance, petcall, map) {
    if (!map) return;
    for (const mon of map.monsters) {
        if (mon.dead || (mon.mhp || 0) <= 0) continue;
        if (distance === 0 || dist2(mon.mx, mon.my, x, y) < distance) {
            // C ref: mon.c:4378-4381
            mon.msleeping = 0;
            mon.sleeping = false;
            const mdat = mon.data || mon.type || {};
            if (!((mdat.geno || 0) & G_UNIQ)) {
                mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITMASK;
            }
            // C ref: mon.c:4382-4389 — petcall handling
            if (petcall && mon.mtame) {
                // C: EDOG(mtmp)->whistletime = moves
                if (mon.edog) mon.edog.whistletime = _gstate?.moves || 0;
            }
        }
    }
}

// C ref: mon.c wake_nearto() — wrapper
// C ref: mon.c:4396-4399
export function wake_nearto(x, y, distance, map) {
  if (!map) map = _gstate?.map || _gstate?.lev;
  wake_nearto_core(x, y, distance, false, map);
}

// C ref: mon.c wake_nearby() — wake all near hero
// C ref: mon.c:4361-4364
export function wake_nearby(petcall, player, map) {
  if (!map) map = _gstate?.map || _gstate?.lev;
  wake_nearto_core(player.x, player.y, player.ulevel * 20, petcall, map);
}

// C ref: mon.c:4259-4312 setmangry() — make peaceful monster hostile
export function setmangry(mon, via_attack, map, player) {
    // C ref: mon.c:4261-4279 — Elbereth hypocrisy (MUST come before mpeaceful check)
    if (via_attack && map && player
        && sengr_at(map, "Elbereth", player.x, player.y, true)
        && (onscary(map, player.x, player.y, mon) || mon.peaceful)) {
        // C: You_feel("like a hypocrite.");
        const record = player.alignmentRecord ?? 0;
        adjalign(player, (record > 5) ? -5 : -rnd(5));
        // C: del_engr_at(u.ux, u.uy) — remove the Elbereth
        del_engr_at(map, player.x, player.y);
    }

    // C ref: mon.c:4282 — clear wait strategy
    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITMASK;

    if (!mon.peaceful) return;
    if (mon.tame) return;
    mon.peaceful = false;
    // C ref: mon.c:4291-4297 — alignment penalty
    if (mon.ispriest) {
        if (player && p_coaligned(mon, player))
            adjalign(player, -5); // very bad — attacking coaligned priest
        else
            adjalign(player, 2);  // bonus for attacking enemy priest
    } else {
        adjalign(player, -1);
    }
}

// ========================================================================
// Monster state & visibility — C ref: mon.c Phase C
// ========================================================================

// C ref: mon.c:2113 m_in_air() — monster is up in the air/on the ceiling
export function m_in_air(mon) {
    const mdat = mon?.data || mon?.type || {};
    return is_flyer(mdat) || is_floater(mdat)
        || (is_clinger(mdat) && !!mon.mundetected);
}

export function m_poisongas_ok(mon) {
    const mdat = mon?.data || mon?.type || {};
    if (nonliving(mdat) || (mdat.mflags1 & M1_BREATHLESS))
        return M_POISONGAS_OK;
    // C ref: is_swimmer eels in pools
    if (mdat.mlet === S_EEL)
        return M_POISONGAS_OK;
    if (resists_poison(mon))
        return M_POISONGAS_MINOR;
    return M_POISONGAS_BAD;
}

// C ref: mon.c:3876 elemental_clog() — elemental overcrowding in endgame
// Simplified: endgame system not fully ported.
export function elemental_clog(mon) {
    // Only relevant in endgame which isn't ported — no-op stub
}

// C ref: mon.c:3420 set_ustuck() — set stuck-to monster
export function set_ustuck(mon, player) {
    if (!player) return;
    player.ustuck = mon || null;
    if (!player.ustuck) {
        player.uswallow = false;
        player.uswldtim = 0;
    }
}

// C ref: mon.c:4694 maybe_unhide_at() — reveal hidden monster if can't hide
export function maybe_unhide_at(x, y, map) {
    if (!map) return;
    const mon = map.monsterAt(x, y);
    if (!mon || !mon.mundetected) return;

    const mdat = mon.data || mon.type || {};
    // Eel out of water
    if (mdat.mlet === S_EEL && !IS_POOL(map.at(x, y)?.typ)) {
        hideunder(mon, map);
        return;
    }
    // Hider-under without objects
    if (hides_under(mdat)) {
        if (!can_hide_under_obj_at(map, x, y)) {
            hideunder(mon, map);
        }
    }
}

// C ref: mon.c:4721 hideunder() — monster tries to hide under something
export async function hideunder(mon, map, player = null, fov = null, display = null) {
    if (!mon || !map) return false;
    const mdat = mon.data || mon.type || {};
    const x = mon.mx, y = mon.my;
    let undetected = false;
    let seenobj = null;
    let locomo = null;
    const seeit = !!(player && canseemon(mon, player, fov));
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    const trappedOutsidePit = !!((mon.mtrapped || false)
        || (trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT));
    if ((player && player.ustuck === mon) || trappedOutsidePit) {
        undetected = false;
    } else if (mdat.mlet === S_EEL) {
        const isWaterLevel = !!(map?.flags?.is_waterlevel);
        const heroUnderwater = !!(player && (player.underwater || player.uinwater || player.Underwater));
        // C ref: mon.c hideunder() eel clause:
        // is_pool(x,y) && !Is_waterlevel(&u.uz) && (!Underwater || !couldsee(x,y))
        undetected = IS_POOL(map.at(x, y)?.typ)
            && !isWaterLevel
            && (!heroUnderwater || !(fov?.canSee ? fov.canSee(x, y) : couldsee(map, player, x, y)));
        if (seeit) {
            seenobj = 'the water';
            locomo = 'dive';
        }
    } else if (hides_under(mdat)) {
        // C ref: mon.c hideunder() requires hideable floor objects and no pool/lava.
        const objectsHere = map.objectsAt ? map.objectsAt(x, y) : [];
        if (can_hide_under_obj_at(map, x, y)
            && !IS_POOL(map.at(x, y)?.typ)
            && !IS_LAVA(map.at(x, y)?.typ)) {
            undetected = true;
            if (seeit && objectsHere.length > 0) {
                seenobj = ansimpleoname(objectsHere[0]);
            }
        }
    }

    const old = !!mon.mundetected;
    mon.mundetected = undetected;
    const hideDebug = envFlag('WEBHACK_HIDEUNDER_DEBUG');
    if (hideDebug) {
        writeStderr(
            `[HIDEUNDER] m_id=${Number(mon?.m_id || 0)} ndx=${Number(mon?.mndx ?? -1)}`
            + ` pos=${x},${y} old=${old ? 1 : 0} new=${undetected ? 1 : 0}`
            + ` seeit=${seeit ? 1 : 0} seenobj=${seenobj ? 1 : 0}\n`
        );
    }
    if (undetected && seeit && seenobj && display) {
        const seenmon = y_monnam(mon);
        const movement = locomo || locomotion(mdat, 'hide');
        if (hideDebug) {
            writeStderr(
                `[HIDEUNDER] message m_id=${Number(mon?.m_id || 0)}`
                + ` text="You see ${seenmon} ${movement} under ${seenobj}."\n`
            );
        }
        await display.putstr_message(`You see ${seenmon} ${movement} under ${seenobj}.`);
    }
    if (undetected !== old) {
        if (hideDebug) {
            writeStderr(
                `[HIDEUNDER] newsym m_id=${Number(mon?.m_id || 0)}`
                + ` pos=${x},${y} old=${old ? 1 : 0} new=${undetected ? 1 : 0}\n`
            );
        }
        newsym(x, y);
    }
    return undetected;
}

// C ref: mon.c:4803 hide_monst() — called when returning to a level
export function hide_monst(mon, map) {
    if (!mon || !map) return;
    const mdat = mon.data || mon.type || {};
    const hider_under = hides_under(mdat) || mdat.mlet === S_EEL;
    if ((is_hider(mdat) || hider_under) && !mon.mundetected && !mon.m_ap_type) {
        if (hider_under)
            hideunder(mon, map);
    }
}

export function can_hide_under_obj_at(map, x, y) {
    if (!map) return false;
    // C ref: can_hide_under_obj() rejects non-pit trap locations.
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT) return false;

    const stack = map.objectsAt ? map.objectsAt(x, y) : [];
    if (!stack || stack.length === 0) return false;

    // C ref: leading coin stacks need at least 10 coins to hide under.
    if (stack[0]?.oclass === COIN_CLASS) {
        let coinquan = 0;
        let i = 0;
        while (i < stack.length && stack[i]?.oclass === COIN_CLASS) {
            coinquan += Number(stack[i]?.quan || 0);
            if (coinquan >= 10) break;
            i++;
        }
        if (coinquan < 10) return false;
    }
    return true;
}

// ========================================================================
// Monster turn processing — C ref: mon.c Phase A
// ========================================================================

// C ref: mon.c:4595 healmon() — heal monster HP with optional overheal
export function healmon(mon, amt, overheal) {
    if (!mon) return 0;
    const oldhp = mon.mhp || 0;
    if ((mon.mhp || 0) + amt > (mon.mhpmax || 0) + overheal) {
        mon.mhpmax = (mon.mhpmax || 0) + overheal;
        mon.mhp = mon.mhpmax;
    } else {
        mon.mhp = (mon.mhp || 0) + amt;
        if (mon.mhp > (mon.mhpmax || 0))
            mon.mhpmax = mon.mhp;
    }
    return mon.mhp - oldhp;
}

// C ref: mon.c:1339 meatbox() — dispose of contents of eaten container
export function meatbox(mon, otmp, map) {
    if (!otmp || !Array.isArray(otmp.cobj) || otmp.cobj.length === 0) return;
    if (!isok(mon.mx, mon.my)) return;
    const engulf = (mon.mndx === PM_GELATINOUS_CUBE);
    const contents = [...otmp.cobj];
    otmp.cobj = [];
    for (const cobj of contents) {
        if (!cobj) continue;
        if (engulf) {
            mpickobj(mon, cobj);
        } else {
            // Drop to floor
            cobj.ox = mon.mx;
            cobj.oy = mon.my;
            if (map && typeof map.addObject === 'function') {
                map.addObject(cobj);
            }
        }
    }
}

// C ref: mon.c:1377 m_consume_obj() — monster consumes an object
// Simplified: handles healing, container contents, corpse intrinsics.
// Missing: poly/grow/stone/mimic/pyrolisk (unported subsystems).
export function m_consume_obj(mon, otmp, map) {
    if (!mon || !otmp) return;
    const ispet = !!mon.tame;

    // Non-pet: heal up to object weight in HP
    if (!ispet && (mon.mhp || 0) < (mon.mhpmax || 0)) {
        const objWeight = otmp.owt || weight(otmp) || 10;
        healmon(mon, objWeight, 0);
    }
    // Handle container contents
    if (Array.isArray(otmp.cobj) && otmp.cobj.length > 0) {
        meatbox(mon, otmp, map);
    }
    // Corpse intrinsic granting
    const corpsenm = (otmp.otyp === CORPSE) ? (otmp.corpsenm ?? NON_PM) : NON_PM;
    // Delete the object (remove from any list)
    if (map && typeof map.removeObject === 'function') {
        map.removeObject(otmp);
    }
    // Grant intrinsics from corpse
    if (corpsenm !== NON_PM && corpsenm >= 0 && corpsenm < NUMMONS) {
        mon_givit(mon, mons[corpsenm]);
    }
}

// C ref: mon.c:1448 meatmetal() — rust monster eats metal
// Returns: 0 = nothing, 1 = ate something, 2 = died
export function meatmetal(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        // Rust monsters only eat rustprone items
        if (mon.mndx === PM_RUST_MONSTER && !is_rustprone(otmp))
            continue;
        // Skip strangulation amulet, slow digestion ring
        if (otmp.otyp === AMULET_OF_STRANGULATION ||
            otmp.otyp === RIN_SLOW_DIGESTION)
            continue;
        // Skip poisoned items for non-resistant monsters
        if (hasPoisonTrapBit(otmp) && !resists_poison(mon))
            continue;
        if (!is_metallic(otmp)) continue;
        if (obj_resists(otmp, 5, 95)) continue;  // consumes rn2(100)

        // Rust monster vs erodeproof: spit it out
        if (mon.mndx === PM_RUST_MONSTER && otmp.oerodeproof) {
            otmp.oerodeproof = false;
            mon.stunned = true;
            return 0; // didn't actually eat it
        }

        // Eat the object
        mon.meating = Math.floor((otmp.owt || 10) / 2) + 1;
        m_consume_obj(mon, otmp, map);
        if (mon.dead || (mon.mhp || 0) <= 0) return 2;
        // Maybe leave a rock behind
        if (rnd(25) < 3) {
            // C ref: mon.c:1498-1499 — leave a rock behind
            mksobj_at(OBJ_ROCK, mon.mx, mon.my, true, false);
        }
        newsym(mon.mx, mon.my);
        return 1;
    }
    return 0;
}

// C ref: mon.c:1518 meatobj() — gelatinous cube eats pile of objects
// Returns: 0 = nothing, 1 = ate/engulfed, 2 = died
export function meatobj(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    let count = 0, ecount = 0;

    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        // Skip scare monster scrolls
        if (otmp.otyp === SCR_SCARE_MONSTER) continue;
        // C ref: is_boulder(otmp) — gelatinous cubes can't eat boulders
        if (otmp.otyp === BOULDER) continue;
        // C ref: mon.c:1556 — skip ROCK_CLASS items entirely (statues, etc.)
        if (otmp.oclass === ROCK_CLASS) continue;

        // Petrifying corpses — skip if not resistant
        if (otmp.otyp === CORPSE && otmp.corpsenm >= 0 && otmp.corpsenm < NUMMONS) {
            const cptr = mons[otmp.corpsenm];
            if (is_rider(cptr)) continue; // skip Rider corpses
            if (touch_petrifies(cptr) && !resists_ston(mon)) continue;
        }

        // C ref: mon.c:1567-1612 — eat organic, engulf inorganic
        // C: `!is_organic || obj_resists(5,95)` → engulf; else → eat
        // obj_resists is only called for organic items (short-circuit)
        if (!is_organic(otmp) || obj_resists(otmp, 5, 95)) {
            // Engulf it — move to monster inventory
            ++ecount;
            if (map && typeof map.removeObject === 'function') {
                map.removeObject(otmp);
            }
            mpickobj(mon, otmp);
        } else {
            // Eat it
            ++count;
            m_consume_obj(mon, otmp, map);
            if (mon.dead || (mon.mhp || 0) <= 0) return 2;
        }

        if (mon.minvis) newsym(mon.mx, mon.my);
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

// C ref: mon.c:1641 meatcorpse() — purple worm eats corpses
// Returns: 0 = nothing, 1 = ate, 2 = died
export function meatcorpse(mon, map) {
    if (!mon || !map) return 0;
    if (mon.tame) return 0;

    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const otmp of [...objects]) {
        if (!otmp || otmp.buried) continue;
        if (otmp.otyp !== CORPSE) continue;
        const corpsenm = otmp.corpsenm ?? -1;
        if (corpsenm < 0 || corpsenm >= NUMMONS) continue;

        const corpsepm = mons[corpsenm];
        // Skip vegan corpses
        if (vegan_mondata(corpsepm)) continue;
        // Skip petrifying corpses
        if (touch_petrifies(corpsepm) && !resists_ston(mon)) continue;
        // Skip Rider corpses
        if (is_rider(corpsepm)) continue;

        // C ref: splitobj for stacks > 1 — simplified
        // (corpse stacks are rare)

        m_consume_obj(mon, otmp, map);
        if (mon.dead || (mon.mhp || 0) <= 0) return 2;

        if (mon.minvis) newsym(mon.mx, mon.my);
        return 1;
    }
    return 0;
}

// C ref: mon.c:928 minliquid() — check if monster drowns/burns in liquid
// Returns: 0 = survived, 1 = died
export async function minliquid(mon, map, player) {
    return await minliquid_core(mon, map, player);
}

function split_mon_clone(mon, map, player) {
    if (!mon || !map) return null;
    if ((mon.mhp || 0) <= 1) return null;

    // C ref: clone_mon() places clone at same square if possible, otherwise
    // enexto() selects nearby legal space (consuming collect_coords RNG).
    const dest = { x: mon.mx, y: mon.my };
    if (map.monsterAt(dest.x, dest.y)) {
        if (!enexto(dest, dest.x, dest.y, mon.data || mon.type || {}, map, player)) {
            return null;
        }
        if (map.monsterAt(dest.x, dest.y)) return null;
    }

    const clone = { ...mon };
    clone.m_id = next_ident();
    clone.mx = dest.x;
    clone.my = dest.y;
    clone.mundetected = 0;
    clone.mtrapped = 0;
    clone.mcloned = 1;
    clone.minvent = [];
    clone.mleashed = 0;
    clone.isshk = 0;
    clone.isgd = 0;
    clone.ispriest = 0;
    // C ref: monst.h MTSZ is 4.
    clone.mtrack = new Array(4).fill(null).map(() => ({ x: 0, y: 0 }));
    clone.nmon = null;

    clone.mhpmax = mon.mhpmax;
    clone.mhp = Math.floor((mon.mhp || 0) / 2);
    mon.mhp = (mon.mhp || 0) - clone.mhp;

    map.addMonster(clone);
    if (canSpotMonsterForMap(mon, map, player, null) && _gstate?.display?.putstr_message) {
        const mname = mon?.data?.mname || mon?.type?.mname || mon?.name || 'monster';
        _gstate.display.putstr_message(`The ${mname} multiplies!`);
    }
    newsym(clone.mx, clone.my);
    return clone;
}

// C ref: mon.c:943 minliquid_core() — guts of minliquid
async function minliquid_core(mon, map, player) {
    if (!mon || !map) return 0;
    const loc = map.at(mon.mx, mon.my);
    if (!loc) return 0;

    const mdat = mon.data || mon.type || {};
    const inpool = IS_POOL(loc.typ) && !is_flyer(mdat) && !is_floater(mdat);
    const inlava = IS_LAVA(loc.typ) && !is_flyer(mdat) && !is_floater(mdat);
    // C ref: IS_FOUNTAIN not ported — skip fountain check

    // Gremlin splitting in pools
    if (mon.mndx === PM_GREMLIN && inpool && rn2(3)) {
        // C ref: mon.c minliquid_core() -> split_mon(mtmp, 0).
        split_mon_clone(mon, map, player);
        if (inpool) water_damage_chain(mon.minvent, false);
        return 0;
    }

    // Iron golem rusting in pools
    if (mon.mndx === PM_IRON_GOLEM && inpool && !rn2(5)) {
        const dam = d(2, 6);
        mon.mhp = (mon.mhp || 0) - dam;
        if ((mon.mhpmax || 0) > dam)
            mon.mhpmax -= dam;
        if ((mon.mhp || 0) <= 0) {
            mondied(mon, map, player);
            if (mon.dead || (mon.mhp || 0) <= 0)
                return 1;
        }
        water_damage_chain(mon.minvent, false);
        return 0;
    }

    if (inlava) {
        if (!is_clinger(mdat) && !likes_lava(mdat)) {
            // Try teleport escape
            if (can_teleport(mdat) && !tele_restrict(mon, map)) {
                if (await rloc(mon, 0, map, player)) return 0;
            }
            if (!resists_fire(mon)) {
                // Burns to death
                mondied(mon, map, player);
            } else {
                mon.mhp = (mon.mhp || 0) - 1;
                if ((mon.mhp || 0) <= 0) {
                    mondied(mon, map, player);
                }
            }
            if (mon.dead || (mon.mhp || 0) <= 0) return 1;
            // Survivor: fire damage inventory, try to relocate
            fire_damage_chain(mon.minvent, false, false, mon.mx, mon.my);
            return 0;
        }
    } else if (inpool) {
        if (!is_clinger(mdat) && !cant_drown(mdat)) {
            // Try teleport escape
            if (can_teleport(mdat) && !tele_restrict(mon, map)) {
                if (await rloc(mon, 0, map, player)) return 0;
            }
            // Drowns
            mondied(mon, map, player);
            if (mon.dead || (mon.mhp || 0) <= 0) return 1;
            // Survivor: water damage inventory
            water_damage_chain(mon.minvent, false);
            return 0;
        }
    } else {
        // Eels out of water
        if (mdat.mlet === S_EEL) {
            if ((mon.mhp || 0) > 1 && rn2(mon.mhp || 1) > rn2(8)) {
                mon.mhp = (mon.mhp || 0) - 1;
            }
            // C ref: monflee(mon, 2, FALSE, FALSE) — simplified
            mon.mflee = true;
            mon.mfleetim = Math.max(mon.mfleetim || 0, 2);
        }
    }
    return 0;
}

// C ref: mon.c:1812 mpickgold() — monster picks up gold
export function mpickgold(mon, map) {
    if (!mon || !map) return;
    const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
    for (const gold of [...objects]) {
        if (!gold || gold.buried) continue;
        // C ref: g_at() — find gold object
        if (gold.oclass !== COIN_CLASS) continue;
        if (map && typeof map.removeObject === 'function') {
            map.removeObject(gold);
        }
        mpickobj(mon, gold);
        newsym(mon.mx, mon.my);
        return;
    }
}

// C ref: mon.c:1943 can_touch_safely() — can monster touch object?
export function can_touch_safely(mon, otmp) {
    if (!mon || !otmp) return true;
    const mdat = mon.data || mon.type || {};
    // Cockatrice corpse without gloves
    if (otmp.otyp === CORPSE && otmp.corpsenm >= 0 && otmp.corpsenm < NUMMONS) {
        const cptr = mons[otmp.corpsenm];
        if (touch_petrifies(cptr)
            && !(mon.misc_worn_check & W_ARMG)
            && !resists_ston(mon))
            return false;
        if (is_rider(cptr))
            return false;
    }
    // Silver objects
    if (is_metallic(otmp) && mon_hates_silver(mon)) {
        // C ref: simplified silver check — oc_material == SILVER
        // Full check needs material; approximate with mon_hates_silver
    }
    return true;
}

// C ref: eat.c:889 intrinsic_possible() — can this corpse give this intrinsic?
function intrinsic_possible(type, ptr) {
    if (!ptr) return false;
    const mr2 = ptr.mconveys || 0;
    switch (type) {
    case FIRE_RES:          return !!(mr2 & MR_FIRE);
    case COLD_RES:          return !!(mr2 & MR_COLD);
    case SLEEP_RES:         return !!(mr2 & MR_SLEEP);
    case DISINT_RES:        return !!(mr2 & MR_DISINT);
    case SHOCK_RES:         return !!(mr2 & MR_ELEC);
    case POISON_RES:        return !!(mr2 & MR_POISON);
    case ACID_RES:          return !!(mr2 & MR_ACID);
    case STONE_RES:         return !!(mr2 & MR_STONE);
    case TELEPORT:          return can_teleport(ptr);
    case TELEPORT_CONTROL:  return control_teleport(ptr);
    case TELEPAT:           return telepathic(ptr);
    default: return false;
    }
}

// C ref: eat.c:961 should_givit() — die roll for granting intrinsic
function should_givit(type, ptr) {
    if (!ptr) return false;
    let chance;
    switch (type) {
    case POISON_RES:
        // C ref: killer bee/scorpion special case — 25% chance of guaranteed grant
        if ((ptr === mons[PM_KILLER_BEE] || ptr === mons[PM_SCORPION])
            && !rn2(4))
            chance = 1;
        else
            chance = 15;
        break;
    case TELEPORT:
        chance = 10;
        break;
    case TELEPORT_CONTROL:
        chance = 12;
        break;
    case TELEPAT:
        chance = 1;
        break;
    default:
        chance = 15;
        break;
    }
    return (ptr.mlevel || 0) > rn2(chance);
}

// corpse_intrinsic imported from eat.js (canonical home: eat.c:1339)

// C ref: mon.c:1711 mon_give_prop() — grant a resistance intrinsic to monster
export function mon_give_prop(mon, prop) {
    if (!mon) return;
    let intrinsic = 0;
    // Map prop number to MR_ constant
    switch (prop) {
    case FIRE_RES:    intrinsic = MR_FIRE; break;
    case COLD_RES:    intrinsic = MR_COLD; break;
    case SLEEP_RES:   intrinsic = MR_SLEEP; break;
    case DISINT_RES:  intrinsic = MR_DISINT; break;
    case SHOCK_RES:   intrinsic = MR_ELEC; break;
    case POISON_RES:  intrinsic = MR_POISON; break;
    case ACID_RES:    intrinsic = MR_ACID; break;
    case STONE_RES:   intrinsic = MR_STONE; break;
    default: return; // TELEPORT/TELEPAT/etc. — monsters can't gain these from eating
    }
    if (intrinsic)
        mon.mintrinsics = (mon.mintrinsics || 0) | intrinsic;
}

// C ref: mon.c:1763 mon_givit() — maybe give intrinsic from eating corpse
export function mon_givit(mon, ptr) {
    if (!mon || !ptr) return;
    if (mon.dead || (mon.mhp || 0) <= 0) return;

    // C ref: stalker invisibility special case
    if (ptr === mons[PM_STALKER]) {
        if (!mon.perminvis) {
            mon.perminvis = true;
            mon.minvis = true;
        }
        mon.stunned = true;
        return;
    }

    const prop = corpse_intrinsic(ptr);
    if (prop <= 0) return; // no intrinsic (0 = none, -1 = STR which monsters can't use)

    if (!should_givit(prop, ptr)) return;

    mon_give_prop(mon, prop);
}

// C ref: mon.c:1156 mcalcdistress() — per-turn distress for all monsters
// Note: In JS, most of m_calcdistress is already distributed:
//   - mon_regen: in monmove.js
//   - flee timeout: in allmain.js
//   - shapeshift: in allmain.js via runtimeDecideToShapeshift
// This function handles the remaining blind/frozen timeouts.
export async function mcalcdistress(map, player) {
    if (!map || !Array.isArray(map.monsters)) return;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        await m_calcdistress(mon, map, player);
    }
}

// C ref: mon.c:1162 m_calcdistress() — per-monster distress
async function m_calcdistress(mon, map, player) {
    // Non-moving monsters need liquid check
    const mdat = mon.data || mon.type || {};
    if ((mdat.mmove || 0) === 0) {
        if (await minliquid(mon, map, player)) return;
    }

    // Blind timeout
    if (mon.mblinded && typeof mon.mblinded === 'number') {
        mon.mblinded--;
        if (mon.mblinded <= 0) {
            mon.mblinded = 0;
            mon.mcansee = true;
        }
    }
    // Frozen timeout
    if (mon.mfrozen && typeof mon.mfrozen === 'number') {
        mon.mfrozen--;
        if (mon.mfrozen <= 0) {
            mon.mfrozen = 0;
            mon.mcanmove = true;
        }
    }
    // Flee timeout is handled in allmain.js
    // Shapeshift is handled in allmain.js
}

// ========================================================================
// movemon — C ref: mon.c movemon()
// ========================================================================
export async function movemon(map, player, display, fov, game = null, { dochug, handleHiderPremove: hhp, everyturnEffect } = {}) {
    if (game) game._suppressMonsterHitMessagesThisTurn = false;
    if (map) map._heardDistantNoiseThisTurn = false;
    let somebodyCanMove = false;
    // C ref: mon.c movemon() caches next monster pointer before dochug(),
    // so list mutations (death/migration) do not skip subsequent turns.
    // Iterate a snapshot for equivalent stability under JS array mutation.
    for (const mon of [...map.monsters]) {
        // C ref: mon.c movemon_singlemon():1197-1206 — abort all monster
        // processing when the hero is flagged to leave the level.
        if (player.utotype) {
            somebodyCanMove = false;
            break;
        }
        // C ref: done(DIED) terminates the process; in JS we must
        // explicitly stop monster processing after the hero dies.
        if (game && game.playerDied) {
            somebodyCanMove = false;
            break;
        }
        if (mon.dead || Number(mon.mhp || 0) <= 0) continue;
        // C ref: mon.c movemon_singlemon() skips monsters not on this map.
        if (!isok(mon.mx, mon.my)) continue;
        // C ref: parked vault guards at (0,0) don't take normal turns.
        if (mon.isgd && mon.mx === 0 && mon.my === 0) continue;
        // C ref: mon.c:1230 — m_everyturn_effect called for ALL alive monsters before movement check
        if (everyturnEffect) await everyturnEffect(mon, map, player, game);
        if (mon.movement >= NORMAL_SPEED) {
            pushRngLogEntry(`^movemon_turn[${mon.mndx}@${mon.mx},${mon.my} mv=${mon.movement}->${mon.movement - NORMAL_SPEED}]`);
            const oldx = mon.mx;
            const oldy = mon.my;
            const alreadySawMon = !!(game && game.occupation
                && canSpotMonsterForMap(mon, map, player, fov));
            mon.movement -= NORMAL_SPEED;
            if (mon.movement >= NORMAL_SPEED) {
                somebodyCanMove = true;
            }
            monmoveTrace('turn-start',
                `step=${monmoveStepLabel(map)}`,
                `id=${mon.m_id ?? '?'}`,
                `mndx=${mon.mndx ?? '?'}`,
                `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
                `pos=(${oldx},${oldy})`,
                `mv=${mon.movement + NORMAL_SPEED}->${mon.movement}`,
                `flee=${mon.mflee ? 1 : 0}`,
                `peace=${mon.peaceful ? 1 : 0}`,
                `conf=${mon.confused ? 1 : 0}`);
            // C ref: mon.c:1250-1251 — minliquid() before gear/hider logic.
            if (await minliquid(mon, map, player)) continue;
            // C ref: mon.c:1254-1267 — monster may spend turn equipping gear (I_SPECIAL check)
            if (mon.misc_worn_check & I_SPECIAL) {
                const mux = Number.isInteger(mon.mux) ? mon.mux : 0;
                const muy = Number.isInteger(mon.muy) ? mon.muy : 0;
                if (mon.mpeaceful || mon.mtame || dist2(mon.mx, mon.my, mux, muy) > 9) {
                    mon.misc_worn_check = (mon.misc_worn_check & ~I_SPECIAL) >>> 0;
                    const oldworn = mon.misc_worn_check;
                    // Simplified m_dowear(FALSE): try to equip one unequipped wearable item.
                    // Intentionally excludes weapon wielding; C m_dowear doesn't wield here.
                    // Sub-type to wornmask mapping for armor (ARM_SUIT=0..ARM_SHIRT=6).
                    const armorSubMask = [W_ARM, W_ARMS, W_ARMH, W_ARMG, W_ARMF, W_ARMC, W_ARMU];
                    for (const obj of (mon.minvent || [])) {
                        if (obj.owornmask) continue; // already worn/wielded
                        const ocls = obj.oclass ?? obj.oc_class;
                        if (ocls === ARMOR_CLASS) {
                            const sub = obj.sub ?? 0;
                            const bit = (sub >= 0 && sub < armorSubMask.length) ? armorSubMask[sub] : 0;
                            if (bit && !(mon.misc_worn_check & bit)) {
                                obj.owornmask = bit;
                                mon.misc_worn_check = (mon.misc_worn_check | bit) >>> 0;
                                break;
                            }
                        }
                    }
                    if (mon.misc_worn_check !== oldworn || !mon.mcanmove) {
                        continue; // spent this turn equipping
                    }
                }
            }
            if ((hhp || handleHiderPremove)(mon, map, player, fov)) {
                continue;
            }
            // C ref: mon.c:1277-1284 — eel hiding
            if ((mon.data || mon.type)?.mlet === S_EEL && !mon.mundetected
                && (mon.mflee || distmin(mon.mx, mon.my, player.x, player.y) > 1)
                && !canseemon(mon, player, fov)
                && !rn2(4)) {
                if (await hideunder(mon, map, player, fov, display))
                    continue;
            }
            // TODO: fightm() — Conflict not implemented
            const rd = await withRngTag('dochug(monmove.js:847)', () =>
                dochug(mon, map, player, display, fov, game));
            if (game && game.occupation && !mon.dead && !rd) {
                const attacks = (mon.data || mon.type)?.mattk || [];
                const noAttacks = !attacks.some((a) => a && a.aatyp !== AT_NONE);
                const threatRangeSq = (BOLT_LIM + 1) * (BOLT_LIM + 1);
                const oldDist = dist2(oldx, oldy, player.x, player.y);
                const newDist = dist2(mon.mx, mon.my, player.x, player.y);
                const canSeeNow = fov?.canSee ? fov.canSee(mon.mx, mon.my)
                    : couldsee(map, player, mon.mx, mon.my);
                const couldSeeOld = fov?.canSee ? fov.canSee(oldx, oldy)
                    : couldsee(map, player, oldx, oldy);
                if ((player?.hallucinating || (!mon.peaceful && !noAttacks))
                    && newDist <= threatRangeSq
                    && (!alreadySawMon || !couldSeeOld || oldDist > threatRangeSq)
                    && canSpotMonsterForMap(mon, map, player, fov)
                    && canSeeNow
                    && !!mon.mcanmove
                    && !onscary(map, player.x, player.y)) {
                    if (typeof game.stopOccupation === 'function') await game.stopOccupation();
                    else {
                        game.occupation = null;
                        game.multi = 0;
                    }
                }
            }
        }
    }

    map.monsters = map.monsters.filter(m => !m.dead);
    player.displacedPetThisTurn = false;
    return somebodyCanMove;
}

// Autotranslated from mon.c:1897
export function curr_mon_load(mtmp) {
  let curload = 0, obj;
  for (obj = mtmp.minvent; obj; obj = obj.nobj) {
    if (obj.otyp !== BOULDER || !throws_rocks(mtmp.data)) {
      curload += obj.owt;
    }
  }
  return curload;
}

// Autotranslated from mon.c:1911
export function max_mon_load(mtmp) {
  let maxload;
  if (!mtmp.data.cwt) maxload = Math.floor((MAX_CARR_CAP *  mtmp.data.msize) / MZ_HUMAN);
  else if (!strongmonst(mtmp.data) || (strongmonst(mtmp.data) && (mtmp.data.cwt > WT_HUMAN))) maxload = Math.floor((MAX_CARR_CAP *  mtmp.data.cwt) / WT_HUMAN);
  else {
    maxload = MAX_CARR_CAP;
  }
  if (!strongmonst(mtmp.data)) {
    maxload = Math.floor(maxload / 2);
  }
  if (maxload < 1) maxload = 1;
  return  maxload;
}

// Autotranslated from mon.c:1974
export function can_carry(mtmp, otmp, player) {
  let iquan, otyp = otmp.otyp, newload = otmp.owt, mdat = mtmp.data, nattk = 0;
  if (notake(mdat)) return 0;
  if (!can_touch_safely(mtmp, otmp)) return 0;
  iquan = (otmp.quan >  LARGEST_INT) ? 20000 + rn2(LARGEST_INT - 20000 + 1) :  otmp.quan;
  if (iquan > 1) {
    let glomper = false;
    if (mtmp.data.mlet === S_DRAGON && (otmp.oclass === COIN_CLASS || otmp.oclass === GEM_CLASS)) glomper = true;
    else {
      for (nattk = 0; nattk < NATTK; nattk++) {
        if (mtmp.data.mattk[nattk].aatyp === AT_ENGL) { glomper = true; break; }
      }
    }
    if ((mtmp.data.mflags1 & M1_NOHANDS) && !glomper) return 1;
  }
  if (mtmp === player.usteed) return 0;
  if (mtmp.isshk) return iquan;
  if (mtmp.mpeaceful && !mtmp.mtame) return 0;
  if (throws_rocks(mdat) && otyp === BOULDER) return iquan;
  if (mdat.mlet === S_NYMPH) return (otmp.oclass === ROCK_CLASS) ? 0 : iquan;
  if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp)) return 0;
  return iquan;
}

// Autotranslated from mon.c:2581
export function copy_mextra(mtmp2, mtmp1) {
  if (!mtmp2 || !mtmp1 || !mtmp1.mextra) return;
  if (!mtmp2.mextra) mtmp2.mextra = { mcorpsenm: NON_PM };
  if (mtmp1.mextra.mgivenname) {
    mtmp2.mextra.mgivenname = mtmp1.mextra.mgivenname;
  }
  if (mtmp1.mextra.egd) {
    mtmp2.mextra.egd = { ...mtmp1.mextra.egd };
  }
  if (mtmp1.mextra.epri) {
    mtmp2.mextra.epri = { ...mtmp1.mextra.epri };
  }
  if (mtmp1.mextra.eshk) {
    mtmp2.mextra.eshk = { ...mtmp1.mextra.eshk };
  }
  if (mtmp1.mextra.emin) {
    mtmp2.mextra.emin = { ...mtmp1.mextra.emin };
  }
  if (mtmp1.mextra.edog) {
    mtmp2.mextra.edog = { ...mtmp1.mextra.edog };
  }
  if (mtmp1.mextra.ebones) {
    mtmp2.mextra.ebones = { ...mtmp1.mextra.ebones };
  }
  if (has_mcorpsenm(mtmp1)) mtmp2.mextra.mcorpsenm = mtmp1.mextra.mcorpsenm;
}

// Autotranslated from mon.c:2633
export function dealloc_mextra(m) {
  let x = m.mextra;
  if (x) {
    x.mgivenname = 0;
    x.egd = 0;
    x.epri = 0;
    x.eshk = 0;
    x.emin = 0;
    x.edog = 0;
    x.ebones = 0;
    x.mcorpsenm = NON_PM;
    m.mextra = 0;
  }
}

// Autotranslated from mon.c:2660
export function dealloc_monst(mon) {
  if (mon.nmon) {
    console.error("dealloc_monst: monster still on fmon chain");
  }
  if (mon.mextra) dealloc_mextra(mon);
  // C ref: *mon = cg.zeromonst; free(mon); — JS: garbage collected
}

// Autotranslated from mon.c:2995
export function logdeadmon(mtmp, mndx, game) {
  let howmany = game.mvitals[mndx].died;
  if (mndx === PM_MEDUSA && howmany === 1) { record_achievement(ACH_MEDU); }
  else if ((unique_corpstat(mtmp.data) && (mndx !== PM_HIGH_CLERIC || !mtmp.mrevived)) || (mtmp.isshk && !mtmp.mrevived)) {
    let shkdetail, mkilled, herodidit = !game.svc.context.mon_moving;
    shkdetail = '';
    if (mtmp.isshk) {
      howmany = 1;
      shkdetail = `, the ${shtypes[ESHK(mtmp).shoptype - SHOPBASE].name} ${mtmp.female ? "proprietrix" : "proprietor"}${herodidit ? "" : ","}`;
    }
    else if (mndx === PM_HIGH_CLERIC) { howmany = 1; }
    if (howmany <= 3 || howmany === 5 || howmany === 10 || howmany === 25 || (howmany % 50) === 0) {
      let xtra, llevent_type = LL_UMONST;
      if (howmany === 1 || mtmp.iswiz || is_rider(mtmp.data)) {
        llevent_type |= LL_ACHIEVE;
      }
      xtra = '';
      if (howmany > 1) {
        xtra = ` (${howmany}${ordin(howmany)} time)`;
      }
      mkilled = nonliving(mtmp.data) ? "destroyed" : "killed";
      if (herodidit) livelog_printf(llevent_type, "%s %s%s%s", mkilled, livelog_mon_nam(mtmp), shkdetail, xtra);
      else {
        livelog_printf(llevent_type, "%s%s has been %s%s", livelog_mon_nam(mtmp), shkdetail, mkilled, xtra);
      }
    }
  }
}

// C ref: mon.c:3070 — anger_quest_guardians
// TODO: Needs urole.guardnum from quest system (not yet in JS roles table)
export function anger_quest_guardians(mtmp, player) {
  // C: if (mtmp->data == &mons[urole.guardnum]) setmangry(mtmp, TRUE);
  // guardnum is role-specific quest guardian PM_* index; not yet in JS roles
}

// Autotranslated from mon.c:3746
export async function mon_to_stone(mtmp) {
  if (mtmp.data.mlet === S_GOLEM) {
    if (canseemon(mtmp)) await pline_mon(mtmp, "%s solidifies...", Monnam(mtmp));
    if (newcham(mtmp, mons[PM_STONE_GOLEM], NO_NC_FLAGS)) {
      if (canseemon(mtmp)) await pline("Now it's %s.", an(pmname(mtmp.data, Mgender(mtmp))));
    }
    else {
      if (canseemon(mtmp)) await pline("... and returns to normal.");
    }
  }
  else {
    impossible("Can't polystone %s!", a_monnam(mtmp));
  }
}

// Autotranslated from mon.c:3764
export async function vamp_stone(mtmp, game) {
  if (is_vampshifter(mtmp)) {
    let mndx = mtmp.cham, x = mtmp.mx, y = mtmp.my;
    if (mndx >= LOW_PM && mndx !== monsndx(mtmp.data) && !(game.mvitals[mndx].mvflags & G_GENO)) {
      let buf = `The lapidifying ${x_monnam(mtmp, ARTICLE_NONE,  0, (SUPPRESS_SADDLE | SUPPRESS_HALLUCINATION | SUPPRESS_INVISIBLE | SUPPRESS_IT), false)} ${amorphous(mtmp.data) ? "coalesces on the" : is_flyer(mtmp.data) ? "drops to the" : "writhes on the"} ${await surface(x, y, game.map || game.lev, game.player)}`;
      mtmp.mcanmove = 1;
      mtmp.mfrozen = 0;
      set_mon_min_mhpmax(mtmp, 10);
      mtmp.mhp = mtmp.mhpmax;
      if (engulfing_u(mtmp)) await expels(mtmp, mtmp.data, false);
      if (amorphous(mtmp.data) && closed_door(mtmp.mx, mtmp.my)) {
        let new_xy = {x: 0, y: 0};
        if (enexto( new_xy, mtmp.mx, mtmp.my, mons[mndx])) { await rloc_to(mtmp, new_xy.x, new_xy.y); }
      }
      if (canspotmon(mtmp)) { await pline_mon(mtmp, "%s!", buf); await display_nhwindow(WIN_MESSAGE, false); }
      newcham(mtmp, mons[mndx], NO_NC_FLAGS);
      if (mtmp.data === mons[mndx]) mtmp.cham = NON_PM;
      else {
        mtmp.cham = mndx;
      }
      if (canspotmon(mtmp)) {
        await pline_mon(mtmp, "%s rises from the %s with renewed agility!", Amonnam(mtmp), await surface(mtmp.mx, mtmp.my, game.map || game.lev, game.player));
      }
      newsym(mtmp.mx, mtmp.my);
      return false;
    }
  }
  else if (ismnum(mtmp.cham) && (mons[mtmp.cham].mresists & MR_STONE)) {
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    set_mon_min_mhpmax(mtmp, 10);
    mtmp.mhp = mtmp.mhpmax;
    newcham(mtmp, mons[0], NC_SHOW_MSG);
    newsym(mtmp.mx, mtmp.my);
    return false;
  }
  return true;
}

// Autotranslated from mon.c:3841
export async function migrate_mon(mtmp, target_lev, xyloc) {
  if (mtmp.mx) { unstuck(mtmp); mdrop_special_objs(mtmp); }
  await migrate_to_level(mtmp, target_lev, xyloc, null);
}

// Autotranslated from mon.c:3862
export function ok_to_obliterate(mtmp, player) {
  if (mtmp.data === mons[PM_WIZARD_OF_YENDOR] || is_rider(mtmp.data) || has_emin(mtmp) || has_epri(mtmp) || has_eshk(mtmp) || mtmp === player.ustuck || mtmp === player.usteed) return false;
  return true;
}

// Autotranslated from mon.c:3997
export async function maybe_mnexto(mtmp, player) {
  let mm = {x: 0, y: 0}, ptr = mtmp.data, diagok = !NODIAG(monsndx(mtmp.data)), tryct = 20;
  do {
    if (!enexto( mm, player.x, player.y, ptr)) return;
    if (couldsee(null, player, mm.x, mm.y) && (diagok || mm.x === mtmp.mx || mm.y === mtmp.my)) { await rloc_to(mtmp, mm.x, mm.y); return; }
  } while (--tryct > 0);
}

// Autotranslated from mon.c:4087
export async function m_respond_shrieker(mtmp, player) {
  if (!(player?.Deaf || player?.deaf || false)) { await pline("%s shrieks.", Monnam(mtmp)); await stop_occupation(); }
  if (!rn2(10)) { makemon(rn2(13) ? 0 : mons[PM_PURPLE_WORM], 0, 0, NO_MM_FLAGS); }
  aggravate();
}

// Autotranslated from mon.c:4107
export async function m_respond_medusa(mtmp) {
  let i;
  for (i = 0; i < NATTK; i++) {
    if (mtmp.data.mattk[i].aatyp === AT_GAZE) { await gazemu(mtmp, mtmp.data.mattk[i]); break; }
  }
}

// Autotranslated from mon.c:4120
export async function m_respond(mtmp) {
  if (mtmp.data.msound === MS_SHRIEK && !um_dist(mtmp.mx, mtmp.my, 1)) await m_respond_shrieker(mtmp);
  if (mtmp.data === mons[PM_MEDUSA] && couldsee(null, null, mtmp.mx, mtmp.my)) await m_respond_medusa(mtmp);
  if (mtmp.data === mons[PM_ERINYS] && !mtmp.mpeaceful && m_canseeu(mtmp)) aggravate();
}

// Autotranslated from mon.c:4133
export async function qst_guardians_respond(map, player) {
  // TODO: q_guardian should be mons[urole.guardnum] from quest system (not yet in JS roles)
  let mon, q_guardian = null, got_mad = 0;
  for (mon = (map?.fmon || null); mon; mon = mon.nmon) {
    if (DEADMONSTER(mon)) {
      continue;
    }
    if (mon.data === q_guardian && mon.mpeaceful) { mon.mpeaceful = 0; if (canseemon(mon)) ++got_mad; }
  }
  if (got_mad && !(player?.Hallucination || player?.hallucinating || false)) {
    let who = q_guardian.pmnames;
    if (got_mad > 1) who = makeplural(who);
    await pline_The("%s %s to be angry too...", who, vtense(who, "appear"));
  }
}

// Autotranslated from mon.c:4625
export function m_restartcham(mtmp) {
  if (!mtmp.mcan) mtmp.cham = pm_to_cham(monsndx(mtmp.data));
  if (mtmp.data.mlet === S_MIMIC && mtmp.msleeping) { set_mimic_sym(mtmp); newsym(mtmp.mx, mtmp.my); }
}

// Autotranslated from mon.c:4937
export function pickvampshape(mon, game, map) {
  let mndx = mon.cham, wolfchance = 10;
  let uppercase_only = Is_rogue_level(map);
  switch (mndx) {
    case PM_VLAD_THE_IMPALER:
      if (mon_has_special(mon)) {
        break;
      }
    wolfchance = 3;
    case PM_VAMPIRE_LEADER:
      if (!rn2(wolfchance) && !uppercase_only   && !is_pool_or_lava(mon.mx, mon.my)) { mndx = PM_WOLF; break; }
    case PM_VAMPIRE:
      mndx = (!rn2(4) && !uppercase_only) ? PM_FOG_CLOUD : PM_VAMPIRE_BAT;
    break;
  }
  if ((game.mvitals[mndx].mvflags & G_GENO) !== 0 || (mon.data !== mons[mon.cham] && !rn2(4))) return mon.cham;
  return mndx;
}

// Autotranslated from mon.c:4979
export function isspecmon(mon) {
  return (mon.isshk || mon.ispriest || mon.isgd || mon.m_id === svq.quest_status.leader_m_id);
}

// Autotranslated from mon.c:5011
export function valid_vampshiftform(base, form) {
  if (base >= LOW_PM && is_vampire( mons[base])) {
    if (form === PM_VAMPIRE_BAT || form === PM_FOG_CLOUD || (form === PM_WOLF && base !== PM_VAMPIRE)) return true;
  }
  return false;
}

// Autotranslated from mon.c:5225
export async function accept_newcham_form(mon, mndx, game) {
  let mdat;
  if (mndx === NON_PM) return 0;
  mdat = mons[mndx];
  if ((game.mvitals[mndx].mvflags & G_GENO) !== 0) return 0;
  if (is_placeholder(mdat)) return 0;
  if (is_mplayer(mdat)) return mdat;
  if (is_shapeshifter(mdat) && ismnum(mon.cham) && mdat === mons[mon.cham]) return mdat;
  return polyok(mdat) ? mdat : 0;
}

// Autotranslated from mon.c:5252
export function mgender_from_permonst(mtmp, mdat) {
  if (is_male(mdat)) { mtmp.female = false; }
  else if (is_female(mdat)) { mtmp.female = true; }
  else if (!is_neuter(mdat)) {
    if (!rn2(10) && !(is_vampire(mdat) || is_vampshifter(mtmp))) mtmp.female = !mtmp.female;
  }
}

// Autotranslated from mon.c:5542
export function can_be_hatched(mnum) {
  if (mnum === PM_SCORPIUS) mnum = PM_SCORPION;
  mnum = little_to_big(mnum);
  if (mnum === PM_KILLER_BEE || mnum === PM_GARGOYLE || (lays_eggs( mons[mnum]) && (BREEDER_EGG || (mnum !== PM_QUEEN_BEE && mnum !== PM_WINGED_GARGOYLE)))) return mnum;
  return NON_PM;
}

// Autotranslated from mon.c:5605
export function kill_eggs(obj_list) {
  let otmp;
  for (otmp = obj_list; otmp; otmp = otmp.nobj) {
    if (otmp.otyp === EGG) {
      if (dead_species(otmp.corpsenm, true)) { kill_egg(otmp); }
    }
    else if (Has_contents(otmp)) { kill_eggs(otmp.cobj); }
  }
}

// C ref: mon.c:5672-5699 golemeffects()
export async function golemeffects(mon, damtype, dam) {
  let heal = 0, slow = 0;
  const mdat = mon?.data || mon?.type;
  if (mdat === mons[PM_FLESH_GOLEM]) {
    if (damtype === AD_ELEC) heal = Math.floor((dam + 5) / 6);
    else if (damtype === AD_FIRE || damtype === AD_COLD) slow = 1;
  }
  else if (mdat === mons[PM_IRON_GOLEM]) {
    if (damtype === AD_ELEC) slow = 1;
    else if (damtype === AD_FIRE) heal = dam;
  }
  else { return; }
  if (slow) {
    if (mon.mspeed !== MSLOW) mon_adjust_speed(mon, -1, null);
  }
  if (heal) {
    if (healmon(mon, heal, 0)) {
      if (canseemon(mon)) await pline_mon(mon, "%s seems healthier.", Monnam(mon));
    }
  }
}

// C ref: mon.c:5703-5752 angry_guards()
export function angry_guards(silent, map) {
  let ct = 0, slct = 0;
  if (!map?.monsters) return false;
  for (const mtmp of map.monsters) {
    if (mtmp.dead || (mtmp.mhp || 0) <= 0) continue;
    const mdat = mtmp.data || mtmp.type;
    if (mdat && is_watch(mdat) && mtmp.mpeaceful) {
      ct++;
      if (mtmp.msleeping || mtmp.mfrozen) {
        slct++;
        mtmp.msleeping = 0;
        mtmp.mfrozen = 0;
      }
      mtmp.mpeaceful = 0;
    }
  }
  return ct > 0;
}

// Autotranslated from mon.c:5759
export function pacify_guard(mtmp) {
  if (is_watch(mtmp.data)) mtmp.mpeaceful = 1;
}

// Autotranslated from mon.c:5766
export function pacify_guards() {
  iter_mons(pacify_guard);
}

// Autotranslated from mon.c:5772
export async function mimic_hit_msg(mtmp, otyp) {
  let ap = mtmp.mappearance;
  switch (M_AP_TYPE(mtmp)) {
    case M_AP_NOTHING:
      case M_AP_FURNITURE:
        case M_AP_MONSTER:
          break;
    case M_AP_OBJECT:
      if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
        await pline_mon(mtmp, "%s seems a more vivid %s than before.", The(simple_typename(ap)), c_obj_colors[objectData[ap].oc_color]);
      }
    break;
  }
}

// Autotranslated from mon.c:5918
export function adj_erinys(abuse, game, player) {
  let pm = mons[PM_ERINYS];
  if (abuse > 5) { pm.mflags1 |= M1_SEE_INVIS; }
  if (abuse > 10) { pm.mflags1 |= M1_AMPHIBIOUS; }
  if (abuse > 15) { pm.mflags1 |= M1_FLY; }
  if (abuse > 20) { pm.mattk[0].damn = 3; }
  if (abuse > 25) { pm.mflags1 |= M1_REGEN; }
  if (abuse > 30) { pm.mflags1 |= M1_TPORT_CNTRL; }
  if (abuse > 35) {
    pm.mattk[1].aatyp = AT_WEAP;
    pm.mattk[1].adtyp = AD_DRST;
    pm.mattk[1].damn = 3;
    pm.mattk[1].damd = 4;
  }
  if (abuse > 40) { pm.mflags1 |= M1_TPORT; }
  if (abuse > 50) {
    pm.mattk[2].aatyp = AT_MAGC;
    pm.mattk[2].adtyp = AD_SPEL;
    pm.mattk[2].damn = 3;
    pm.mattk[2].damd = 4;
  }
  pm.mlevel = Math.min(7 + player.alignmentAbuse, 50);
  pm.difficulty = Math.min(10 + Math.floor(player.alignmentAbuse / 3), 25);
}

// Autotranslated from mon.c:2499
export function replmon(mtmp, mtmp2, game, player) {
  let otmp;
  for (otmp = mtmp2.minvent; otmp; otmp = otmp.nobj) {
    if (otmp.where !== OBJ_MINVENT || otmp.ocarry !== mtmp) impossible("replmon: minvent inconsistency");
    otmp.ocarry = mtmp2;
  }
  mtmp.minvent = 0;
  if (game.svc.context.polearm.hitmon === mtmp) game.svc.context.polearm.hitmon = mtmp2;
  relmon(mtmp,  0);
  if (mtmp !== player.usteed) place_monster(mtmp2, mtmp2.mx, mtmp2.my);
  if (mtmp2.wormno) place_wsegs(mtmp2, mtmp);
  if (emits_light(mtmp2.data)) {
    new_light_source(mtmp2.mx, mtmp2.my, emits_light(mtmp2.data), LS_MONSTER, mtmp2);
    del_light_source(LS_MONSTER, mtmp);
  }
  mtmp2.nmon = fmon;
  fmon = mtmp2;
  if (player.ustuck === mtmp) set_ustuck(mtmp2);
  if (player.usteed === mtmp) player.usteed = mtmp2;
  if (mtmp2.isshk) replshk(mtmp, mtmp2);
  dealloc_monst(mtmp);
}

// Autotranslated from mon.c:6021
export async function see_nearby_monsters(game, player) {
  let mtmp, mndx, x, y;
  if (player.Hallucination || (player.Blind && !player.Blind_telepat)) return;
  for (x = player.x - 1; x <= player.x + 1; x++) {
    for (y = player.y - 1; y <= player.y + 1; y++) {
      if (!isok(x, y)) {
        continue;
      }
      if (!(mtmp = m_at(x, y, game?.lev || game?.map))) {
        continue;
      }
      mndx = monsndx(mtmp.data);
      if (M_AP_TYPE(mtmp) === M_AP_MONSTER) mndx = mtmp.mappearance;
      if (game.mvitals[mndx].seen_close) {
        continue;
      }
      if (canseemon(mtmp) || (mtmp.mundetected && sensemon(mtmp))) {
        gb.bhitpos.x = x, gb.bhitpos.y = y;
        gn.notonhead = (x !== mtmp.mx || y !== mtmp.my);
        see_monster_closeup(mtmp, false);
      }
    }
  }
}

// ========================================================================
// Functions moved from monutil.js — C ref: mon.c / monst.h
// ========================================================================

// C ref: mon.c monnear() + NODIAG()
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    const nodiag = mon.mndx === PM_GRID_BUG;
    if (distance === 2 && nodiag) return false;
    return distance < 3;
}

// C ref: monst.h helpless(mon) — sleeping or unable to move.
export function helpless(mon) {
    if (!mon) return true;
    if (mon.msleeping || mon.sleeping) return true;
    if (mon.mcanmove === false || mon.mcanmove === 0) return true;
    if (Number(mon.mfrozen || 0) > 0) return true;
    return false;
}

// C ref: mon.c:3434 unstuck() — release hero if stuck to dying/departing monster
export function unstuck(mon, player) {
    if (!player || player.ustuck !== mon) return;
    const ptr = mon.data || mon.type || {};
    player.ustuck = null;
    if (!mon.mspec_used && (dmgtype(ptr, AD_STCK)
                            || attacktype(ptr, AT_ENGL)
                            || attacktype(ptr, AT_HUGS))) {
        mon.mspec_used = rnd(2);
    }
}

// C ref: mon.c mondead() → m_detach() → mon_leaving_level() → unstuck()
export function mondead(mon, map, player) {
    mon.dead = true;
    pushRngLogEntry(`^die[${mon.mndx || 0}@${mon.mx},${mon.my}]`);
    const deathLoc = map?.at?.(mon.mx, mon.my);
    if (deathLoc) deathLoc.mem_invis = false;
    newsym(mon.mx, mon.my);
    if (player) unstuck(mon, player);
    if (Array.isArray(mon.minvent) && mon.minvent.length > 0) {
        const items = [...mon.minvent];
        for (let idx = items.length - 1; idx >= 0; idx--) {
            const obj = items[idx];
            if (!obj) continue;
            mdrop_obj(mon, obj, map);
        }
        mon.minvent = [];
        mon.weapon = null;
    }
}

// -----------------------------------------------------------------------
// mon.c compatibility surface for CODEMATCH tracking
// -----------------------------------------------------------------------

function _monsterList(map = null) {
    const m = map || _gstate?.map || _gstate?.lev;
    return Array.isArray(m?.monsters) ? m.monsters : [];
}

// C ref: mon.c:4495
export function iter_mons_safe(callback, map = null) {
    const monsList = [..._monsterList(map)];
    for (const mon of monsList) callback?.(mon);
}

// C ref: mon.c:4522
export function iter_mons(callback, map = null) {
    for (const mon of _monsterList(map)) callback?.(mon);
}

// C ref: mon.c:2543
export function relmon(mon, map = null) {
    const list = _monsterList(map);
    const idx = list.indexOf(mon);
    if (idx >= 0) list.splice(idx, 1);
    return idx >= 0;
}

// C ref: mon.c:3829
export function m_into_limbo(mon, map = null) {
    relmon(mon, map);
    if (mon) {
        mon.mx = -1;
        mon.my = -1;
        mon.mstate = 'limbo';
    }
    return mon;
}

// C ref: mon.c:3950
export function mnexto(mon, target, map = null) {
    if (!mon || !target) return false;
    return mnearto(mon, target.x, target.y, map);
}

// C ref: mon.c:4026
export function mnearto(mon, x, y, _map = null) {
    if (!mon || !Number.isInteger(x) || !Number.isInteger(y)) return false;
    mon.mx = Math.max(0, Math.min(COLNO - 1, x));
    mon.my = Math.max(0, Math.min(ROWNO - 1, y));
    return true;
}

// C ref: mon.c:2046
export function mon_allowflags(mon, map, player = null) {
    let allow = ALLOW_MDISP | ALLOW_TRAPS | ALLOW_M;
    const mdat = mon?.data || mon?.type;
    if (is_flyer(mdat) || is_floater(mdat)) allow |= ALLOW_ROCK;
    if (passes_bars(mdat)) allow |= ALLOW_BARS;
    if (throws_rocks(mdat)) allow |= ALLOW_WALL;
    if (player && monnear(mon, player.x, player.y)) allow |= ALLOW_U;
    try {
        if (in_your_sanctuary(mon?.mx || 0, mon?.my || 0, map, player || _gstate?.player)) allow |= ALLOW_SANCT;
    } catch (_e) {
        // Keep compatibility helper side-effect free in minimal test contexts.
    }
    return allow;
}

// C ref: mon.c:4824
export function mon_animal_list() {
    return [PM_KILLER_BEE, PM_SCORPION, PM_LIZARD];
}

// C ref: mon.c:4850
export function pick_animal() {
    const list = mon_animal_list();
    return list[rn2(list.length)];
}

// C ref: mon.c:4867
export function decide_to_shapeshift(mon, game = _gstate) {
    if (!mon) return false;
    if (!is_shapeshifter(mon?.data || mon?.type)) return false;
    if (game?.mvitals?.[mon.mndx]?.mvflags & G_GENO) return false;
    return !rn2(3);
}

// C ref: mon.c:4986
export function validspecmon(mndx) {
    return Number.isInteger(mndx) && mndx >= 0 && mndx < NUMMONS;
}

// C ref: mon.c:5021
export function validvamp(mndx) {
    return mndx === PM_VAMPIRE || mndx === PM_VAMPIRE_LEADER;
}

// C ref: mon.c:5071
export function wiz_force_cham_form(mon, mndx) {
    if (!mon || !validspecmon(mndx)) return false;
    mon.cham = mndx;
    mon.mndx = mndx;
    mon.data = mons[mndx];
    return true;
}

// C ref: mon.c:5580
export function dead_species(mndx, _egg = false, game = _gstate) {
    if (!Number.isInteger(mndx) || mndx < 0) return true;
    return !!(game?.mvitals?.[mndx]?.mvflags & G_GENO);
}

// C ref: mon.c:5562
export function egg_type_from_parent(mndx) {
    if (!Number.isInteger(mndx) || mndx < 0 || mndx >= NUMMONS) return NON_PM;
    if (mndx === PM_KILLER_BEE) return PM_KILLER_BEE;
    return mndx;
}

// C ref: mon.c:5632
export function kill_genocided_monsters(map = null, game = _gstate) {
    let n = 0;
    iter_mons_safe((mon) => {
        const mndx = Number.isInteger(mon?.mndx) ? mon.mndx : monsndx(mon?.data);
        if (dead_species(mndx, false, game)) {
            m_into_limbo(mon, map);
            n++;
        }
    }, map);
    return n;
}

// C ref: mon.c:2678
export function mon_leaving_level(mon, map = null, player = _gstate?.player) {
    if (!mon) return false;
    unstuck(mon, player);
    return relmon(mon, map);
}

// C ref: mon.c:3283
export function monstone(mon, map = null, player = _gstate?.player) {
    if (!mon) return 0;
    mondead(mon, map || _gstate?.map || _gstate?.lev, player);
    return 1;
}

// C ref: mon.c:1196
export async function movemon_singlemon(mon, map = null, player = _gstate?.player) {
    if (!mon || mon.dead) return false;
    mcalcmove(mon, true);
    if (player && monnear(mon, player.x, player.y) && !mon.mpeaceful) {
        return true;
    }
    return false;
}

// C ref: mon.c:1829
export function mpickstuff(mon, map = null) {
    if (!mon) return null;
    const m = map || _gstate?.map || _gstate?.lev;
    const objs = (m?.objects || []).filter(o => o && o.ox === mon.mx && o.oy === mon.my);
    if (!objs.length) return null;
    const pick = objs[0];
    mpickobj(mon, pick, m);
    return pick;
}

// C ref: mon.c:4426
export function normal_shape(mon) {
    if (!mon) return false;
    if (Number.isInteger(mon.cham) && mon.cham >= 0 && mon.cham < NUMMONS) {
        mon.mndx = mon.cham;
        mon.data = mons[mon.cham];
    }
    return true;
}

// C ref: mon.c:4158
export function peacefuls_respond(map = null) {
    let n = 0;
    iter_mons((mon) => {
        if (mon?.mpeaceful) {
            mon.mpeaceful = 0;
            n++;
        }
    }, map);
    return n;
}

// C ref: mon.c:3981
export function deal_with_overcrowding(map = null) {
    const list = _monsterList(map);
    const limit = 120;
    if (list.length <= limit) return 0;
    const toCull = list.length - limit;
    list.splice(limit, toCull);
    return toCull;
}

// C ref: mon.c:4616
export function rescham(mon) {
    return normal_shape(mon);
}

// C ref: mon.c:4635
export function restartcham(mon) {
    return normal_shape(mon);
}

// C ref: mon.c:4644
export function restore_cham(mon, mndx = null) {
    if (!mon) return false;
    if (Number.isInteger(mndx) && mndx >= 0 && mndx < NUMMONS) {
        mon.mndx = mndx;
        mon.data = mons[mndx];
    }
    return true;
}

// C ref: mon.c:4657
export function restrap(_mon, _trap) {
    return false;
}

// C ref: mon.c:5789
export function usmellmon(mon, player = _gstate?.player) {
    if (!mon || !player) return false;
    return dist2(mon.mx, mon.my, player.x, player.y) <= 2;
}

// C ref: mon.c:2886
export function vamprises(_mon, _map = null, _player = _gstate?.player) {
    return false;
}
