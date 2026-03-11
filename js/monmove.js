// monmove.js -- Monster movement AI
// C ref: monmove.c — dochug(), m_move(), m_move_aggress(), set_apparxy()
// Pet AI (dogmove.c) is in dogmove.js
// Focus: exact RNG consumption alignment with C NetHack
//
// INCOMPLETE / MISSING vs C monmove.c:
// - dochug: no Conflict handling (C:870), no covetous/quest/vault guards
// - dochug: m_respond() partially implemented — shrieker rn2(10) consumed but makemon stubbed,
//           medusa gazemu stubbed, erinyes aggravate implemented
// - dochug: find_defensive/find_misc stubbed (return false, no RNG consumed)
// - dochug: mind_blast RNG-faithful (rn2(20) gate, hero lock-on, monster loop), losehp stubbed
// - dochug: flees_light: artifact_light only checks Sunsword and gold dragon scales (C:555)
// - m_move: no boulder-pushing by strong monsters (C:2020)
// - m_move: no vault guard movement (C:1730)
// - m_move: covetous monster teleport-to-hero not implemented (C:1737)
// - m_move_aggress: simplified attack — only first attack used, no full mattackm
// - set_apparxy: displacement displacement-offset details simplified
// - shk_move: delegated to shk.js; remaining fidelity gaps are tracked in shk parity issues
// - undesirable_disp: not yet implemented (C:2279)
// - distfleeck: in_your_sanctuary implemented (priest.js); flees_light implemented
// - mon_allowflags: Conflict ALLOW_U not implemented

import { COLNO, ROWNO, IS_WALL, IS_DOOR, IS_ROOM,
         ACCESSIBLE, CORR, DOOR, D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED, D_BROKEN,
         SHOPBASE, ROOM, ROOMOFFSET,
         isok, WEB, IS_OBSTRUCTED, IS_STWALL, A_STR,
         IRONBARS, STAIRS, LADDER, W_NONDIGGABLE,
         INVIS, DISPLACED,
         MTSZ, SQSRCHRADIUS, FARAWAY, BOLT_LIM } from './const.js';
import { rn2, rnd, d, c_d, pushRngLogEntry } from './rng.js';
import { M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, STRAT_ARRIVE } from './const.js';
import { NORMAL_SPEED } from './const.js';
import { wipe_engr_at } from './engrave.js';
import { mattacku, ranged_attk_available } from './mhitu.js';
import { makemon } from './makemon.js';
import { FOOD_CLASS, COIN_CLASS, BOULDER, ROCK, ROCK_CLASS,
         WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
         AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS,
         PICK_AXE, DWARVISH_MATTOCK, AXE, BATTLE_AXE,
         CLOAK_OF_DISPLACEMENT, MINERAL, GOLD_PIECE,
         SKELETON_KEY, LOCK_PICK, CREDIT_CARD,
         VENOM_CLASS, CORPSE, objectData } from './objects.js';
import { next_ident, weight, doname, splitobj, xname, bill_dummy_object } from './mkobj.js';
import { an, vtense } from './objnam.js';
import { delobj, g_at, sobj_at } from './invent.js';
import { grow_up } from './makemon.js';
import { stairway_find_dir } from './stairs.js';
import { can_carry, cursed_object_at } from './dogmove.js';
import { couldsee, m_cansee } from './vision.js';
import { pline_mon, verbalize } from './pline.js';
import { can_teleport, noeyes, perceives, nohands,
         hides_under, is_mercenary, YMonnam, Monnam,
         mon_knows_traps, is_rider, is_mind_flayer,
         is_mindless, telepathic,
         is_giant, is_undead, is_unicorn, is_minion, throws_rocks,
         passes_walls, corpse_eater, amorphous,
         passes_bars, is_human, canseemon, monsdat,
         webmaker, tunnels, needspick,
         dmgtype, attacktype, is_metallivore,
         can_track, likes_gold,
         is_vampshifter, DEADMONSTER, noattacks, M_AP_TYPE, m_canseeu,
         locomotion, mhis } from './mondata.js';
import { PM_GRID_BUG, PM_SHOPKEEPER, PM_MINOTAUR, mons, PM_LEPRECHAUN, PM_GREMLIN, PM_STALKER, PM_TENGU, PM_XORN, PM_RUST_MONSTER, PM_GELATINOUS_CUBE, PM_DISPLACER_BEAST, PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_SHRIEKER, PM_PURPLE_WORM, PM_MEDUSA, PM_ERINYS, PM_HEZROU, PM_VROCK, PM_STEAM_VORTEX, PM_FOG_CLOUD, PM_GIANT_SPIDER, PM_QUEEN_BEE, AT_WEAP, AT_BREA, AT_SPIT, AT_MAGC, AD_SPEL, AD_CLRC, AD_RUST, AD_CORR, S_MIMIC, S_GHOST, S_BAT, S_LIGHT, S_EEL, S_DOG, S_NYMPH, S_LEPRECHAUN, S_HUMAN, M1_WALLWALK, M1_AMORPHOUS, M1_UNSOLID, M2_COLLECT, M2_STRONG, M2_ROCKTHROW, M2_GREEDY, M2_JEWELS, M2_MAGIC, MZ_TINY, MZ_HUMAN, M2_WANDER, MS_LEADER, MS_SHRIEK, MS_CUSS } from './monsters.js';
import { create_gas_cloud, visible_region_at } from './region.js';
import { dog_move, could_reach_item } from './dogmove.js';
import { initrack, settrack, gettrack } from './track.js';
import { pointInShop, monsterInShop } from './shknam.js';
import { stop_occupation } from './allmain.js';
import { in_your_sanctuary } from './priest.js';
import { artifact_light } from './artifact.js';
import { has_magic_key } from './artifact.js';
import { envFlag } from './runtime_env.js';
import { cuss } from './wizard.js';
import { add_damage, after_shk_move, shk_move } from './shk.js';

// Shared utilities — re-exported for consumers
import { dist2, distmin } from './hacklib.js';
import { monnear, helpless, mondead, unstuck, meatmetal, meatobj, meatcorpse } from './mon.js';
import { attackVerb } from './mhitm.js';
import { monAttackName } from './do_name.js';
import { canSpotMonsterForMap, map_invisible, newsym } from './display.js';
import { addToMonsterInventory, canMergeMonsterInventoryObj } from './invent.js';
import { mpickobj, mdrop_obj, findgold } from './steal.js';
import { game as _gstate } from './gstate.js';
export { dist2, distmin, monnear, attackVerb, monAttackName, canSpotMonsterForMap, map_invisible, addToMonsterInventory, canMergeMonsterInventoryObj, mondead, mpickobj, mdrop_obj };

// Re-export track functions (track.c)
export { initrack, settrack };

// Re-export mon.c functions
import { movemon as _movemon, mfndpos, handleHiderPremove,
         onscary,
         corpse_chance,
         hideunder,
         check_gear_next_turn,
         can_hide_under_obj_at } from './mon.js';
import { ALLOW_MDISP, ALLOW_TRAPS, ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL,
         NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_ROCK, ALLOW_WALL,
         ALLOW_DIG, ALLOW_BARS, ALLOW_SANCT, ALLOW_SSM, NOGARLIC } from './const.js';
import { mattackm } from './mhitm.js';
export { mfndpos, onscary, corpse_chance };
// mon_allowflags is exported from its definition below

// Re-export trap.c functions
import { m_harmless_trap, floor_trigger, mintrap_postmove, t_at } from './trap.js';
export { m_harmless_trap, floor_trigger, mintrap_postmove };
import { maketrap } from './dungeon.js';
import { mdig_tunnel, may_dig, bury_an_obj } from './dig.js';
import { IS_TREE, M_AP_NOTHING, M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { stairway_at } from './stairs.js';
import { mwelded } from './wield.js';
import { extract_from_minvent } from './worn.js';
import { eaten_stat } from './eat.js';
import { mon_wield_item } from './weapon.js';
import { NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE } from './const.js';
import { choose_magic_spell, choose_clerical_spell, cast_wizard_spell, cast_cleric_spell } from './mcastu.js';
import { tele_restrict, rloc, enexto, rloc_to } from './teleport.js';
import { MGC_CLONE_WIZ, MGC_SUMMON_MONS, MGC_AGGRAVATION, MGC_DISAPPEAR, MGC_HASTE_SELF, MGC_CURE_SELF, CLC_INSECTS, CLC_CURE_SELF, WT_HUMAN, PROT_FROM_SHAPE_CHANGERS } from './const.js';

// C ref: monst.h strategy bits used by monmove.c:717 early dochug gate
const STRAT_WAITFORU = 0x20000000;
const STRAT_CLOSE = 0x10000000;
const STRAT_WAITMASK = (STRAT_CLOSE | STRAT_WAITFORU);
const MMOVE_NOTHING = 0;
const MMOVE_MOVED = 1;
const MMOVE_DIED = 2;
const MMOVE_DONE = 3;
const MMOVE_NOMOVES = 4;

// Re-export mthrowu.c functions
import { hasWeaponAttack, maybeMonsterWieldBeforeAttack, linedUpToPlayer } from './mthrowu.js';
import { m_carrying } from './mthrowu.js';
import { find_defensive, use_defensive, find_misc, use_misc, find_offensive, searches_for_item } from './muse.js';

// ========================================================================
// movemon — wrapper that binds dochug into mon.js movemon
// ========================================================================
export async function movemon(map, player, display, fov, game = null) {
    return await _movemon(map, player, display, fov, game, { dochug, handleHiderPremove, everyturnEffect: m_everyturn_effect });
}

// C direction tables (C ref: monmove.c)
const xdir = [0, 1, 1, 1, 0, -1, -1, -1];
const ydir = [-1, -1, 0, 1, 1, 1, 0, -1];

function mon_is_peaceful(mon) {
    if (!mon) return false;
    if (mon.mpeaceful !== undefined) return !!mon.mpeaceful;
    return !!mon.peaceful;
}

function mon_is_tame(mon) {
    if (!mon) return false;
    if (mon.mtame !== undefined) return !!mon.mtame;
    return !!mon.tame;
}

function mon_is_confused(mon) {
    if (!mon) return false;
    if (mon.mconf !== undefined) return !!mon.mconf;
    return !!mon.confused;
}

function mon_is_stunned(mon) {
    if (!mon) return false;
    if (mon.mstun !== undefined) return !!mon.mstun;
    return !!mon.stunned;
}


// M_AP_NOTHING/FURNITURE/OBJECT imported from const.js; M_AP_TYPE from mondata.js


// ========================================================================
// onscary — C ref: monmove.c:241 (also in mon.c; we delegate to mon.js)
// ========================================================================
// (imported and re-exported above)

// ========================================================================
// leppie_avoidance — C ref: monmove.c:1142
// ========================================================================
function hasGold(inv) {
    return Array.isArray(inv)
        && inv.some(o => o && o.oclass === COIN_CLASS && (o.quan ?? 1) > 0);
}

function goldQuantity(inv) {
    if (!Array.isArray(inv)) return 0;
    let total = 0;
    for (const obj of inv) {
        if (!obj || obj.oclass !== COIN_CLASS) continue;
        total += Number(obj.quan || 0);
    }
    return total;
}

function leppie_avoidance(mon, player) {
    if (!mon || mon.mndx !== PM_LEPRECHAUN) return false;
    const lepreGold = goldQuantity(mon.minvent || []);
    if (lepreGold <= 0) return false;
    const heroGold = goldQuantity(player?.inventory || []);
    return lepreGold > heroGold;
}

// ========================================================================
// mon_track_add — C ref: monmove.c:79
// mon_track_clear — C ref: monmove.c:90
// ========================================================================

// C ref: monmove.c:79 — add position (x,y) to front of monster's track ring
// Autotranslated from monmove.c:79
export function mon_track_add(mon, x, y) {
    if (!mon) return;
    if (!Array.isArray(mon.mtrack) || mon.mtrack.length !== MTSZ) {
        mon.mtrack = new Array(MTSZ).fill(null).map(() => ({ x: 0, y: 0 }));
    }
    for (let j = MTSZ - 1; j > 0; j--) {
        mon.mtrack[j] = { ...mon.mtrack[j - 1] };
    }
    mon.mtrack[0] = { x, y };
}

// C ref: monmove.c:90 — clear all entries in monster's position track
export function mon_track_clear(mon) {
    if (!Array.isArray(mon?.mtrack)) return;
    for (let j = 0; j < mon.mtrack.length; j++)
        mon.mtrack[j] = { x: 0, y: 0 };
}

// ========================================================================
// monflee — C ref: monmove.c:463
// ========================================================================

// cf. monmove.c monflee(mtmp, fleetime, first, fleemsg)
export async function monflee(mon, fleetime, first, fleemsg, player, display, fov) {
    if (!mon || mon.dead) return;

    // C ref: monmove.c:473 — release hero if stuck
    if (player && player.ustuck === mon) {
        unstuck(mon, player);
    }

    if (!first || !mon.mflee) {
        if (!fleetime) {
            mon.mfleetim = 0;
        } else if (!mon.mflee || (mon.mfleetim > 0)) {
            let ft = fleetime + (mon.mfleetim || 0);
            if (ft === 1) ft = 2;
            mon.mfleetim = Math.min(ft, 127);
        }
        // C ref: monmove.c:487-520 — flee message
        if (!mon.mflee && fleemsg && canseemon(mon, player, fov)) {
            if (!mon.mcanmove || !((mon.data || mon.type)?.mmove)) {
                await display?.putstr_message(`${YMonnam(mon)} seems to flinch.`);
            } else if (flees_light(mon, null, player)) {
                // C ref: monmove.c:499 — rn2(10) for light-flee message variant
                if (rn2(10) || !!(player?.deaf || player?.Deaf)) {
                    await display?.putstr_message(`${Monnam(mon)} flees from the painful light.`);
                } else {
                    await display?.putstr_message(`"Bright light!"`);
                }
            } else {
                await display?.putstr_message(`${YMonnam(mon)} turns to flee.`);
            }
        }

        // C ref: monmove.c:521-524 — Vrock gas cloud on flee
        if (mon.mndx === PM_VROCK && !mon.mspec_used) {
            mon.mspec_used = 75 + rn2(25);
            create_gas_cloud(mon.mx, mon.my, 5, 8);
        }

        mon.mflee = true;
    }
    mon_track_clear(mon);
}

// ========================================================================
// distfleeck — C ref: monmove.c:534-568
// ========================================================================

// flees_light — C ref: monmove.c:451-457 (macro)
// Gremlin flees from hero's lit artifact weapon or body armor.
// C: uwep->lamplit && artifact_light(uwep) || uarm->lamplit && artifact_light(uarm)
function flees_light(mon, map, player) {
    if ((mon.data || mon.type || {}).mndx !== PM_GREMLIN) return false;
    const uwep = player.weapon;
    const uarm = player.armor;
    if (!((uwep && uwep.lamplit && artifact_light(uwep))
            || (uarm && uarm.lamplit && artifact_light(uarm)))) return false;
    if (mon.mcansee === 0 || mon.mcansee === false) return false;
    return couldsee(map, player, mon.mx, mon.my);
}

function playerHasActiveProperty(player, prop) {
    if (!player || !Number.isInteger(prop)) return false;
    if (typeof player.hasProp === 'function') return !!player.hasProp(prop);
    const entry = player.uprops?.[prop];
    if (!entry) return false;
    return !!(entry.intrinsic || entry.extrinsic);
}

function playerIsInvisibleForMonAI(player) {
    return !!(player?.Invis || player?.invis || playerHasActiveProperty(player, INVIS));
}

function playerIsDisplacedForMonAI(player) {
    return !!(player?.Displaced
        || player?.displaced
        || playerHasActiveProperty(player, DISPLACED)
        || (player?.cloak && player.cloak.otyp === CLOAK_OF_DISPLACEMENT));
}

function monApparentTarget(mon) {
    return {
        x: Number.isInteger(mon?.mux) ? mon.mux : 0,
        y: Number.isInteger(mon?.muy) ? mon.muy : 0,
    };
}

// C ref: monmove.c:534 — determine whether a monster is in range, nearby,
// and/or scared of something at or near the hero's position.
// Sets inrange (within BOLT_LIM), nearby (adjacent), and scared (triggers flee).
// Always consumes rn2(5) for bravegremlin check (C: monmove.c:551).
export async function distfleeck(mon, map, player, display, fov) {
    const bravegremlin = (rn2(5) === 0);

    const { x: targetX, y: targetY } = monApparentTarget(mon);
    const inrange = dist2(mon.mx, mon.my, targetX, targetY) <= (BOLT_LIM * BOLT_LIM);
    const nearby = inrange && monnear(mon, targetX, targetY);

    let scared = 0;
    let sawscary = 0;
    let fleeLight = 0;
    let sanctuary = 0;
    // C ref: monmove.c:548-558 — determine scary square even when not nearby
    const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false);
    const canPerceiveInvis = perceives(mon.data || mon.type || mons[mon.mndx] || {});
    const heroInvis = playerIsInvisibleForMonAI(player);
    const seescaryX = (!monCanSee || (heroInvis && !canPerceiveInvis)) ? targetX : player.x;
    const seescaryY = (!monCanSee || (heroInvis && !canPerceiveInvis)) ? targetY : player.y;
    sawscary = onscary(map, seescaryX, seescaryY, mon) ? 1 : 0;

    // C ref: monmove.c:559-564 — evaluate light/sanctuary only when nearby and not already scared by Elbereth/etc
    if (nearby && !sawscary) {
        fleeLight = (flees_light(mon, map, player) && !bravegremlin) ? 1 : 0;
        if (!fleeLight) {
            sanctuary = (!mon.mpeaceful && in_your_sanctuary(mon, 0, 0, map, player)) ? 1 : 0;
        }
    }
    // C ref: monmove.c:565-568 — trigger fleeing when nearby and scared
    if (nearby && (sawscary || fleeLight || sanctuary)) {
        scared = 1;
        await monflee(mon, rnd(rn2(7) ? 10 : 100), true, true, player, display, fov);
    }
    pushRngLogEntry(`^distfleeck[${mon.mndx}@${mon.mx},${mon.my} in=${inrange ? 1 : 0} near=${nearby ? 1 : 0} scare=${scared} brave=${bravegremlin ? 1 : 0} saw=${sawscary} light=${fleeLight} sanct=${sanctuary}]`);
    monmoveTrace('distfleeck',
        `step=${monmoveStepLabel(map)}`,
        `id=${mon.m_id ?? '?'}`,
        `mndx=${mon.mndx ?? '?'}`,
        `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
        `pos=(${mon.mx},${mon.my})`,
        `roll=${bravegremlin ? 0 : 1}`);

    return { inrange, nearby, scared };
}

// ========================================================================
// mon_regen — C ref: monmove.c:308-321
// ========================================================================

// C ref: monmove.c:308 — regenerate monster HP, decrement mspec_used,
// and handle digesting (meating countdown).
export function mon_regen(mon, digest_meal, moves) {
    const mdat = mon.data || mon.type || {};
    // C: every 20 turns or if monster regenerates naturally
    if (moves % 20 === 0 || mdat.regen) {
        if ((mon.mhp ?? 0) < (mon.mhpmax ?? 0)) {
            mon.mhp = (mon.mhp ?? 0) + 1;
        }
    }
    if (mon.mspec_used) {
        mon.mspec_used--;
    }
    if (digest_meal) {
        if (mon.meating) {
            mon.meating--;
            // C ref: monmove.c:319 — finish_meating when countdown reaches 0
            // INCOMPLETE: finish_meating not fully ported
        }
    }
}

// ========================================================================
// monhaskey — C ref: monmove.c:97
// ========================================================================

// C ref: monmove.c:97 — check whether a monster carries a locking/unlocking tool
// forUnlocking=true: credit card also counts (C: for_unlocking)
export function monhaskey(mon, forUnlocking) {
    const inv = mon?.minvent || [];
    if (forUnlocking && inv.some(o => o?.otyp === CREDIT_CARD)) return true;
    return inv.some(o => o?.otyp === SKELETON_KEY || o?.otyp === LOCK_PICK);
}

// ========================================================================
// m_can_break_boulder — C ref: monmove.c:134
// ========================================================================

// C ref: monmove.c:134 — can monster break a boulder?
// Riders (Death/Famine/Pestilence) always can; shopkeepers, priests, and
// quest leaders (MS_LEADER sound) can when their special-ability cooldown
// is zero (mspec_used == 0).
// Autotranslated from monmove.c:134
// Autotranslated from monmove.c:133
export function m_can_break_boulder(mtmp) {
  return (is_rider((monsdat(mtmp) || {})) || (!mtmp.mspec_used && (mtmp.isshk || mtmp.ispriest || (((monsdat(mtmp) || {}).msound ?? 0) === MS_LEADER))));
}

// ========================================================================
// mon_allowflags — C ref: mon.c:2046-2108
// ========================================================================
// Compute the bitfield flag argument for mfndpos().
// INCOMPLETE: Conflict ALLOW_U not implemented
export function mon_allowflags(mon, player, map = null) {
    const ptr = mon?.data || mon?.type || ((Number.isInteger(mon?.mndx) && mons[mon.mndx]) || {});
    const f1 = ptr.mflags1 || 0;
    let flag = 0;

    // C ref: mon.c:2049-2059 — disposition-based flags
    if (mon_is_tame(mon)) {
        flag |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    } else if (mon_is_peaceful(mon)) {
        flag |= ALLOW_SANCT | ALLOW_SSM;
    } else {
        flag |= ALLOW_U;
    }

    // C ref: mon.c:2061-2065 — passes_walls
    if (f1 & M1_WALLWALK) {
        flag |= ALLOW_ROCK | ALLOW_WALL;
    }

    // C ref: mon.c:2066-2069 — throws_rocks or m_can_break_boulder
    if (throws_rocks(ptr) || m_can_break_boulder(mon)) {
        flag |= ALLOW_ROCK;
    }

    // C ref: mon.c:2070-2073 — can open doors (not nohands and not verysmall)
    const verysmall = (ptr.msize || 0) === MZ_TINY;
    if (!nohands(ptr) && !verysmall) {
        flag |= OPENDOOR;
    }

    // C ref: mon.c:2074-2078 — can unlock doors
    const can_open = (flag & OPENDOOR) !== 0;
    if ((can_open && monhaskey(mon, true)) || mon.iswiz || is_rider(ptr)) {
        flag |= UNLOCKDOOR;
    }

    // C ref: mon.c:2079-2081 — is_giant can bust doors
    if (is_giant(ptr)) {
        flag |= BUSTDOOR;
    }

    // C ref: mon.c:2082-2084 — passes_bars
    if (passes_bars(ptr)) {
        flag |= ALLOW_BARS;
    }

    // C ref: mon.c:2085-2087 — is_minion or is_rider can enter sanctum
    if (is_minion(ptr) || is_rider(ptr)) {
        flag |= ALLOW_SANCT;
    }

    // C ref: mon.c:2088-2093 — unicorn may avoid line to hero unless on
    // noteleport levels (where teleport fallback is unavailable).
    if (is_unicorn(ptr) && !map?.flags?.noteleport) {
        flag |= NOTONL;
    }

    // C ref: mon.c:2094-2097 — human or minotaur
    if (is_human(ptr) || (mon.mndx === PM_MINOTAUR)) {
        flag |= ALLOW_SSM;
    }

    // C ref: mon.c:2098-2102 — undead (non-ghost) avoid garlic
    if (is_undead(ptr) && (ptr.mlet !== S_GHOST)) {
        flag |= NOGARLIC;
    }

    // C ref: mon.c:2103-2105 — shopkeepers
    if (mon.isshk) {
        flag |= ALLOW_SSM;
    }

    // C ref: mon.c:2106-2108 — priests
    if (mon.ispriest) {
        flag |= ALLOW_SSM | ALLOW_SANCT;
    }

    // C ref: mon.c:2083 — can_tunnel → ALLOW_DIG
    // can_tunnel = tunnels(ptr) unless needspick && hostile && close to player
    let can_tunnel = tunnels(ptr);
    if (can_tunnel && needspick(ptr) && !mon_is_tame(mon) && !mon_is_peaceful(mon)) {
        const mux = Number.isInteger(mon.mux) ? mon.mux : (player?.x ?? mon.mx);
        const muy = Number.isInteger(mon.muy) ? mon.muy : (player?.y ?? mon.my);
        if (dist2(mon.mx, mon.my, mux, muy) <= 8) can_tunnel = false;
    }
    if (can_tunnel) flag |= ALLOW_DIG;

    return flag;
}

// ========================================================================
// m_avoid_kicked_loc — C ref: monmove.c:1300
// ========================================================================
export function m_avoid_kicked_loc(mon, nx, ny, player) {
    const kl = player?.kickedloc;
    const monCanSee = (mon?.mcansee !== 0 && mon?.mcansee !== false) && !mon?.blind;
    if (!kl || !isok(kl.x, kl.y)) return false;
    if (!(mon_is_peaceful(mon) || mon_is_tame(mon))) return false;
    if (player?.conflict) return false;
    if (!monCanSee || mon_is_confused(mon) || mon_is_stunned(mon)) return false;
    return nx === kl.x && ny === kl.y && dist2(nx, ny, player.x, player.y) <= 2;
}

// ========================================================================
// m_avoid_soko_push_loc — C ref: monmove.c:1316
// ========================================================================
export function m_avoid_soko_push_loc(mon, nx, ny, map, player) {
    if (!map?.flags?.sokoban) return false;
    if (!(mon_is_peaceful(mon) || mon_is_tame(mon))) return false;
    if (mon_is_confused(mon) || mon_is_stunned(mon)) return false;
    if (player?.conflict) return false;
    if (dist2(nx, ny, player.x, player.y) !== 4) return false;
    const bx = nx + Math.sign(player.x - nx);
    const by = ny + Math.sign(player.y - ny);
    return (map.objects || []).some((obj) =>
        !obj?.buried && obj.otyp === BOULDER && obj.ox === bx && obj.oy === by
    );
}

// ========================================================================
// m_search_items — C ref: monmove.c:1333
// ========================================================================
const MAX_CARR_CAP = 1000;
const PRACTICAL_CLASSES = new Set([WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS, FOOD_CLASS]);
const MAGICAL_CLASSES = new Set([AMULET_CLASS, POTION_CLASS, SCROLL_CLASS, WAND_CLASS, RING_CLASS, SPBOOK_CLASS]);

function max_mon_load_for_search(mon) {
    const mdat = mon?.data || mon?.type || {};
    const strong = !!(mdat.mflags2 & M2_STRONG);
    const cwt = Number(mdat.cwt || 0);
    const msize = Number(mdat.msize || 0);
    let maxload;
    if (!cwt) {
        maxload = Math.floor((MAX_CARR_CAP * msize) / MZ_HUMAN);
    } else if (!strong || cwt > WT_HUMAN) {
        maxload = Math.floor((MAX_CARR_CAP * cwt) / WT_HUMAN);
    } else {
        maxload = MAX_CARR_CAP;
    }
    if (!strong) maxload = Math.floor(maxload / 2);
    return Math.max(1, Math.floor(maxload));
}

function curr_mon_load_for_search(mon) {
    let load = 0;
    const throwsRocks = !!((mon?.data || mon?.type)?.mflags2 & M2_ROCKTHROW);
    for (const obj of mon?.minvent || []) {
        if (obj?.otyp === BOULDER && throwsRocks) continue;
        load += Number(obj?.owt || 0);
    }
    return load;
}

function mon_item_search_profile(mon) {
    const ptr = mon?.data || mon?.type || {};
    const likesGold = !!(ptr.mflags2 & M2_GREEDY);
    const likesGems = !!(ptr.mflags2 & M2_JEWELS);
    const likesObjs = !!(ptr.mflags2 & M2_COLLECT)
        || (Array.isArray(ptr.mattk) && ptr.mattk.some((atk) => atk?.aatyp === AT_WEAP));
    const likesMagic = !!(ptr.mflags2 & M2_MAGIC);
    const throwsRocks = !!(ptr.mflags2 & M2_ROCKTHROW);
    const anyInterest = likesGold || likesGems || likesObjs || likesMagic || throwsRocks;

    const maxload = max_mon_load_for_search(mon);
    const pctload = Math.floor((curr_mon_load_for_search(mon) * 100) / maxload);

    return {
        likesGold,
        likesGems,
        likesObjs,
        likesMagic,
        throwsRocks,
        anyInterest,
        pctload,
    };
}

function mon_would_take_item_search(mon, obj, map, profile = null) {
    if (!obj) return false;
    if (obj.achievement) return false;
    if (mon_is_tame(mon) && obj.cursed) return false;

    const prefs = profile || mon_item_search_profile(mon);
    const pctload = prefs.pctload;

    // C ref: monmove.c mon_would_take_item():
    // if sentient and below 75% load, searches_for_item can make many
    // practical magical items attractive regardless of likes_magic/likes_objs.
    if (pctload < 75 && searches_for_item(mon, obj)) return true;

    if (prefs.likesGold && obj.otyp === GOLD_PIECE && pctload < 95) return true;
    if (prefs.likesGems && obj.oclass === GEM_CLASS
        && (objectData[obj.otyp]?.oc_material !== MINERAL)
        && pctload < 85) return true;
    if (prefs.likesObjs && PRACTICAL_CLASSES.has(obj.oclass) && pctload < 75) return true;
    if (prefs.likesMagic && MAGICAL_CLASSES.has(obj.oclass) && pctload < 85) return true;
    if (prefs.throwsRocks && obj.otyp === BOULDER && pctload < 50 && !map?.flags?.sokoban) return true;
    return false;
}

function playerHasGold(player) {
    return (player?.gold || 0) > 0 || hasGold(player?.inventory);
}

function cansee_for_hider_avoidance(map, player, fov, x, y) {
    if (!player) return false;
    if (player.blind) return false;
    if (fov && typeof fov.canSee === 'function') return !!fov.canSee(x, y);
    return !!couldsee(map, player, x, y);
}

function m_search_items_goal(mon, map, player, fov, ggx, ggy, appr) {
    const omx = mon.mx;
    const omy = mon.my;
    let minr = SQSRCHRADIUS;

    const mux = Number.isInteger(mon.mux) ? mon.mux : ggx;
    const muy = Number.isInteger(mon.muy) ? mon.muy : ggy;
    if (!mon_is_peaceful(mon) && distmin(mux, muy, omx, omy) < SQSRCHRADIUS) {
        minr--;
    }
    if (!mon_is_peaceful(mon) && is_mercenary(mon.data || mon.type || {})) {
        minr = 1;
    }

    const inShop = pointInShop(omx, omy, map);
    const shopRoll = inShop ? rn2(25) : 0;
    if (inShop && (shopRoll || mon.isshk)) {
        if (minr < SQSRCHRADIUS && appr === -1) {
            if (distmin(omx, omy, mux, muy) <= 3) {
                ggx = mux;
                ggy = muy;
            } else {
                appr = 1;
            }
        }
        return { ggx, ggy, appr, done: false };
    }

    // Fast reject: most monsters have no reason to search for items.
    const searchProfile = mon_item_search_profile(mon);
    if (!searchProfile.anyInterest) {
        return { ggx, ggy, appr, done: false };
    }

    const hmx = Math.min(COLNO - 1, omx + minr);
    const hmy = Math.min(ROWNO - 1, omy + minr);
    const lmx = Math.max(1, omx - minr);
    const lmy = Math.max(0, omy - minr);

    // Hot path optimization: preserve scan order while avoiding repeated
    // O(n) filters/finds for each searched tile in object-heavy levels.
    const cellIndex = (x, y) => (y * COLNO) + x;
    const objectsByCoord = new Array(COLNO * ROWNO);
    for (const obj of map.objects || []) {
        const idx = cellIndex(obj.ox, obj.oy);
        const pile = objectsByCoord[idx];
        if (pile) pile.push(obj);
        else objectsByCoord[idx] = [obj];
    }
    const monsterByCoord = new Array(COLNO * ROWNO);
    for (const occ of map.monsters || []) {
        if (!occ || occ.mhp <= 0) continue;
        const idx = cellIndex(occ.mx, occ.my);
        if (!monsterByCoord[idx]) monsterByCoord[idx] = occ;
    }
    const trapByCoord = new Array(COLNO * ROWNO);
    for (const tr of map.traps || []) {
        trapByCoord[cellIndex(tr.tx, tr.ty)] = tr;
    }

    for (let xx = lmx; xx <= hmx; xx++) {
        for (let yy = lmy; yy <= hmy; yy++) {
            const idx = cellIndex(xx, yy);
            const pile = objectsByCoord[idx] || [];
            if (!pile || pile.length === 0) continue;
            if (minr < distmin(omx, omy, xx, yy)) continue;
            if (!could_reach_item(map, mon, xx, yy)) continue;
            if (hides_under(mon.data || mon.type || {}) && cansee_for_hider_avoidance(map, player, fov, xx, yy)) continue;
            const occ = monsterByCoord[idx] || null;
            if (occ && occ !== mon) {
                const occHelpless = !!occ.sleeping
                    || (Number(occ.mfrozen || 0) > 0)
                    || !occ.mcanmove;
                const occHidden = !!occ.mundetected;
                const occMimicDisguise = !!occ.mappearance && !occ.iswiz;
                const occImmobile = Number((occ.data || occ.type)?.mmove || 0) <= 0;
                if (occHelpless || occHidden || occMimicDisguise || occImmobile) continue;
            }
            if (onscary(map, xx, yy)) continue;
            const trap = trapByCoord[idx] || null;
            if (trap && mon_knows_traps(mon, trap.ttyp)) {
                if (ggx === xx && ggy === yy) {
                    ggx = mux;
                    ggy = muy;
                }
                continue;
            }
            if (!m_cansee(mon, map, xx, yy)) continue;
            const costly = pointInShop(xx, yy, map);

            for (const obj of pile) {
                if (obj?.otyp === ROCK) continue;
                if (costly && !obj?.no_charge) continue;
                if (!mon_would_take_item_search(mon, obj, map, searchProfile)) continue;
                if (can_carry(mon, obj) <= 0) continue;

                minr = distmin(omx, omy, xx, yy);
                ggx = xx;
                ggy = yy;
                monmoveTrace('m_search-pick',
                    `id=${mon.m_id ?? '?'}`,
                    `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
                    `obj=(${obj?.otyp ?? '?'},class=${obj?.oclass ?? '?'},quan=${obj?.quan ?? '?'})`,
                    `at=(${xx},${yy})`,
                    `minr=${minr}`,
                    `mux=(${mux},${muy})`,
                    `appr=${appr}`);
                if (ggx === omx && ggy === omy) {
                    return { ggx, ggy, appr, done: true };
                }
                break;
            }
        }
    }

    if (minr < SQSRCHRADIUS && appr === -1) {
        if (distmin(omx, omy, mux, muy) <= 3) {
            ggx = mux;
            ggy = muy;
        } else {
            appr = 1;
        }
    }

    return { ggx, ggy, appr, done: false };
}

// ========================================================================
// m_respond — C ref: mon.c:4117
// Dispatcher for special monster responses (shrieker, medusa, erinyes).
// Called from dochug after flee teleport, before courage regain.
// ========================================================================

// C ref: mon.c:4084 — m_respond_shrieker(mtmp)
async function m_respond_shrieker(mon, map, player, display = null, game = null) {
    if (distmin(mon.mx, mon.my, player.x, player.y) > 1) return;
    if (!player?.deaf) {
        if (display) {
            await display.putstr_message(`${Monnam(mon)} shrieks.`);
        }
        if (game && typeof game.stopOccupation === 'function') {
            await game.stopOccupation();
        }
    }
    if (!rn2(10)) {
        // C ref: 1/13 chance to attempt a purple worm, random monster otherwise.
        // Keep the RNG path faithful even though difficulty gating is simplified.
        const purpleWorm = !rn2(13);
        makemon(purpleWorm ? PM_PURPLE_WORM : null, 0, 0, 0, player?.dungeonLevel, map);
    }
    aggravate(map);
}

// C ref: mon.c:4068 — m_respond_medusa(mtmp)
// Medusa's gaze attack (gazemu). Complex petrification logic.
function m_respond_medusa(mon, map, player) {
    // TODO: gazemu(mtmp, &youmonst) — Medusa petrification gaze
    // Involves hero reflection check, stone resistance, hallucination, etc.
}

// C ref: wizard.c:488 — aggravate()
// Wakes all monsters on level; 1/5 chance to unfreeze frozen ones.
function aggravate(map) {
    for (const mtmp of map.monsters || []) {
        if (mtmp.dead) continue;
        // C: clears STRAT_WAITFORU | STRAT_APPEARMSG from mstrategy.
        mtmp.mstrategy = Number(mtmp.mstrategy || 0) & ~STRAT_WAITFORU;
        if (mtmp.waiting) mtmp.waiting = false;
        mtmp.sleeping = false;
        if (!mtmp.mcanmove && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = true;
        }
    }
}

// C ref: mon.c:4117 — m_respond(mtmp)
async function m_respond(mon, map, player, display = null, game = null) {
    if (mon.mndx === PM_MEDUSA) {
        await m_respond_medusa(mon, map, player);
    } else if ((mon.data || mon.type)?.msound === MS_SHRIEK) {
        await m_respond_shrieker(mon, map, player, display, game);
    } else if (mon.mndx === PM_ERINYS) {
        // C ref: mon.c:4126 — aggravate()
        aggravate(map);
    }
}

// ========================================================================
// mind_blast — C ref: monmove.c:582-646
// Mind flayer psychic blast. RNG-faithful implementation.
// ========================================================================
// Shared dochug post-move block for both pet and non-pet movement paths.
// Preserves current JS sequencing: m_postmove_effect on displacement, then mintrap.
async function apply_dochug_postmove(mon, map, player, display, fov, game, omx, omy) {
    if (mon.mx !== omx || mon.my !== omy) {
        await m_postmove_effect(mon, map, player, game, omx, omy);
    }
    // C ref: monmove.c postmov(): update old position before mintrap().
    newsym(omx, omy);
    const trapResult = await mintrap_postmove(mon, map, player, display, fov);
    // C ref: postmov() refreshes current location if trap left monster on-level.
    if (Number.isInteger(mon.mx) && Number.isInteger(mon.my) && mon.mx > 0 && mon.my >= 0) {
        newsym(mon.mx, mon.my);
    }
    if (trapResult === 2 || trapResult === 3) {
        return MMOVE_DIED;
    }
    return MMOVE_MOVED;
}

// Gate-2 structural helper: centralize current JS postmove sequencing used by
// both pet and non-pet dochug paths, without changing behavior.
async function run_dochug_postmove_pipeline_current_js(
    mon, map, player, display, fov, game, omx, omy, { preTrapDig = false } = {}
) {
    const baseStatus = await apply_dochug_postmove(mon, map, player, display, fov, game, omx, omy);
    if (baseStatus === MMOVE_DIED || mon.dead) {
        return MMOVE_DIED;
    }

    if (preTrapDig) {
        const isRogueLevel = !!(map?.flags?.is_rogue || map?.flags?.roguelike || map?.flags?.is_rogue_lev);
        const can_tunnel = !isRogueLevel && tunnels(mon.data || mon.type || mons[mon.mndx] || {});
        if (can_tunnel && may_dig(mon.mx, mon.my, map)) {
            const diedDigging = await mdig_tunnel(mon, map, player);
            if (diedDigging || mon.dead) {
                return MMOVE_DIED;
            }
        }
    } else {
        const ctx = mon._m_move_postmove_ctx || null;
        mon._m_move_postmove_ctx = null;
        if (ctx) {
            const { allowflags = 0, can_open = false, can_unlock = false } = ctx;
            // Gate-3 semantic slice: align non-pet moved-cell order toward C postmov:
            // door/bars handling before tunneling; tail effects (web) after.
            const here = map.at(mon.mx, mon.my);
            const mdat = mon.data || mon.type || mons[mon.mndx] || {};
            const canTunnel = !!(allowflags & ALLOW_DIG);
            if (here && IS_DOOR(here.typ) && !passes_walls(mdat) && !canTunnel) {
                const canSeeDoor = fov?.canSee ? fov.canSee(mon.mx, mon.my) : couldsee(map, player, mon.mx, mon.my);
                const canSeeMon = canSpotMonsterForMap(mon, map, player, fov);
                const wasLocked = !!(here.flags & D_LOCKED);
                const wasClosed = !!(here.flags & D_CLOSED);
                let btrapped = !!(here.flags & D_TRAPPED);
                // C ref: postmov() disarms trapped door if monster has MKoT.
                if (btrapped && has_magic_key(mon)) {
                    here.flags &= ~D_TRAPPED;
                    btrapped = false;
                }
                if ((here.flags & (D_LOCKED | D_CLOSED)) && amorphous(mdat)) {
                    // C ref: postmov() amorphous branch: move through closed/locked
                    // door without changing door state.
                    if (display && canSeeMon) {
                        const flowVerb = (mon.mndx === PM_FOG_CLOUD || mdat.mlet === S_LIGHT) ? 'flows' : 'oozes';
                        await display.putstr_message(`${YMonnam(mon)} ${flowVerb} under the door.`);
                    }
                } else if (wasLocked && can_unlock) {
                    here.flags = btrapped ? D_NODOOR : D_ISOPEN;
                    if (btrapped) {
                        if (mb_trapped(mon, map, player)) return MMOVE_DIED;
                    } else if (display) {
                        if (canSeeDoor && canSeeMon) {
                            await display.putstr_message(`${Monnam(mon)} unlocks and opens a door.`);
                        } else if (canSeeDoor) {
                            await display.putstr_message('You see a door unlock and open.');
                        } else if (!canSeeDoor) {
                            await display.putstr_message('You hear a door unlock and open.');
                        }
                    }
                } else if (wasClosed && can_open) {
                    here.flags = btrapped ? D_NODOOR : D_ISOPEN;
                    if (btrapped) {
                        if (mb_trapped(mon, map, player)) return MMOVE_DIED;
                    } else if (display) {
                        if (canSeeDoor && canSeeMon) {
                            await display.putstr_message(`${Monnam(mon)} opens a door.`);
                        } else if (canSeeDoor) {
                            await display.putstr_message('You see a door open.');
                        } else if (!canSeeDoor) {
                            await display.putstr_message('You hear a door open.');
                        }
                    }
                } else if ((here.flags & (D_LOCKED | D_CLOSED)) && (allowflags & BUSTDOOR)) {
                    // C ref: postmov() doorbuster branch.
                    const breakMask = (btrapped || (wasLocked && !rn2(2))) ? D_NODOOR : D_BROKEN;
                    here.flags = breakMask;
                    if (btrapped) {
                        if (mb_trapped(mon, map, player)) return MMOVE_DIED;
                    } else if (display) {
                        if (canSeeDoor && canSeeMon) {
                            await display.putstr_message(`${Monnam(mon)} smashes down a door.`);
                        } else if (canSeeDoor) {
                            await display.putstr_message('You see a door crash open.');
                        } else {
                            await display.putstr_message('You hear a door crash open.');
                        }
                    }
                    if (pointInShop(mon.mx, mon.my, map)) {
                        add_damage(mon.mx, mon.my, 0, map, game?.moves ?? player?.moves ?? 0);
                    }
                }
            } else if (here && here.typ === IRONBARS) {
                // C ref: monmove.c postmov() bars handling (before mdig_tunnel()).
                const wallInfo = Number(here.wall_info ?? 0);
                const canEatBars = !(wallInfo & W_NONDIGGABLE)
                    && (dmgtype(mdat, AD_RUST) || dmgtype(mdat, AD_CORR) || is_metallivore(mdat));
                if (canEatBars) {
                    if (display && canSpotMonsterForMap(mon, map, player, fov)) {
                        await display.putstr_message(`${Monnam(mon)} eats through the iron bars.`);
                    }
                    await dissolve_bars(mon.mx, mon.my, map);
                    return MMOVE_DONE;
                }
            }
            if ((allowflags & ALLOW_DIG) && may_dig(mon.mx, mon.my, map)) {
                const monsterDied = await mdig_tunnel(mon, map, player);
                if (monsterDied || mon.dead) return MMOVE_DIED;
            }
        }
    }
    return MMOVE_MOVED;
}

async function run_dochug_postmove_tail_current_js(
    mon, map, player, display, fov, moveStatus, mmoved
) {
    if (mon.dead) {
        return { moveStatus, mmoved };
    }

    if (!!mon.mcanmove && (mmoved || moveStatus === MMOVE_DONE)) {
        const objectsHere = map.objectsAt(mon.mx, mon.my);
        if (objectsHere.length > 0) {
            const ptr = mon.data || mon.type || mons[mon.mndx] || {};

            // C ref: postmov() tail — object-consumption hooks before mpickstuff.
            if (mon.mndx === PM_RUST_MONSTER || mon.mndx === PM_XORN) {
                const metalResult = meatmetal(mon, map);
                if (metalResult >= 2 || mon.dead) {
                    return { moveStatus: MMOVE_DIED, mmoved: false };
                }
            }
            if (!mon.dead && mon.mndx === PM_GELATINOUS_CUBE) {
                const cubeResult = meatobj(mon, map);
                if (cubeResult >= 2 || mon.dead) {
                    return { moveStatus: MMOVE_DIED, mmoved: false };
                }
            }
            if (!mon.dead && corpse_eater(ptr)) {
                const corpseResult = meatcorpse(mon, map);
                if (corpseResult >= 2 || mon.dead) {
                    return { moveStatus: MMOVE_DIED, mmoved: false };
                }
            }

            if (!mon.dead && await maybeMonsterPickStuff(mon, map, player, display, fov)) {
                // C ref: postmov() sets status = MMOVE_DONE when mpickstuff() succeeds.
                moveStatus = MMOVE_DONE;
                mmoved = false;
            }

            if (mon.minvis) {
                newsym(mon.mx, mon.my);
            }
        }
    }

    if (moveStatus === MMOVE_DONE) {
        mmoved = false;
    }

    if (!mon.dead && (moveStatus === MMOVE_MOVED || moveStatus === MMOVE_DONE)) {
        // C ref: postmov() tail — maybe_spin_web runs in moved/done tail.
        await maybe_spin_web(mon, map);
    }

    if (!mon.dead && (moveStatus === MMOVE_MOVED || moveStatus === MMOVE_DONE)) {
        // C ref: monmove.c postmov():
        // if (hides_under(ptr) || ptr->mlet == S_EEL) {
        //   if (mtmp->mundetected || (!helpless(mtmp) && rn2(5)))
        //     (void) hideunder(mtmp);
        //   newsym(mtmp->mx, mtmp->my);
        // }
        const mdat = mon?.data || mon?.type || {};
        if (hides_under(mdat) || mdat.mlet === S_EEL) {
            if (mon.mundetected || (!helpless(mon) && rn2(5))) {
                await hideunder(mon, map, player, fov, display);
            }
            newsym(mon.mx, mon.my);
        }
    }

    if (!mon.dead && mon.isshk && (moveStatus === MMOVE_MOVED || moveStatus === MMOVE_DONE)) {
        // C ref: postmov() tail — after_shk_move for shopkeepers.
        after_shk_move(mon, map);
    }

    return { moveStatus, mmoved };
}

async function mind_blast(mon, map, player, display = null, fov = null) {
    const BOLT_LIM_SQ = BOLT_LIM * BOLT_LIM;

    // C ref: monmove.c:590 — canseemon message
    const vismon = canSpotMonsterForMap(mon, map, player, fov);
    if (vismon && display) {
        await display.putstr_message(`${Monnam(mon)} concentrates.`);
    }

    // C ref: monmove.c:592 — distance check
    const d2 = dist2(mon.mx, mon.my, player.x, player.y);
    if (d2 > BOLT_LIM_SQ) {
        // C: "You sense a faint wave of psychic energy."
        if (display) await display.putstr_message('You sense a faint wave of psychic energy.');
        return;
    }

    // C: "A wave of psychic energy pours over you!"
    if (display) await display.putstr_message('A wave of psychic energy pours over you!');

    // C ref: monmove.c:597-598 — peaceful check
    if (mon_is_peaceful(mon)) {
        // C: "It feels quite soothing." (no Conflict check — not implemented)
        if (display) await display.putstr_message('It feels quite soothing.');
    } else {
        // C ref: monmove.c:602 — lock-on check
        // C: sensemon(mtmp) — true if hero has telepathy and monster is not mindless
        // JS: approximate via player.telepathy (intrinsic or helmet)
        const m_sen = !!(player.telepathy) && !is_mindless(mon.data || mon.type || {});
        const blind_telepat = !!(player.telepathy) && !!player.blind;

        // C: if (m_sen || (Blind_telepat && rn2(2)) || !rn2(10))
        // Short-circuit evaluation: rn2 calls only happen if prior conditions false
        let locksOn = false;
        if (m_sen) {
            locksOn = true;
        } else if (blind_telepat && rn2(2)) {
            locksOn = true;
        } else if (!rn2(10)) {
            locksOn = true;
        }

        if (locksOn) {
            // C ref: monmove.c:620 — damage
            let dmg = rnd(15);
            // C: Half_spell_damage halves
            if (player.halfSpellDamage) dmg = Math.floor((dmg + 1) / 2);
            // TODO: losehp(dmg, "psychic blast", KILLED_BY_AN)
            // TODO: unhide hero if hidden
            monmoveTrace('mind_blast',
                `step=${monmoveStepLabel(map)}`,
                `id=${mon.m_id ?? '?'}`,
                `locksOn=hero`,
                `dmg=${dmg}`);
        }
    }

    // C ref: monmove.c:630-645 — blast hits other monsters
    for (const m2 of map.monsters || []) {
        if (m2.dead) continue;
        if (!!(m2?.mpeaceful ?? m2?.peaceful) === !!(mon?.mpeaceful ?? mon?.peaceful)) continue;
        if (is_mindless(m2.data || m2.type || {})) continue;
        if (m2 === mon) continue;

        // C: if ((telepathic(m2->data) && (rn2(2) || m2->mblinded)) || !rn2(10))
        const m2dat = m2.data || m2.type || {};
        let m2hit = false;
        if (telepathic(m2dat)) {
            if (rn2(2) || m2.blind) {
                m2hit = true;
            }
        }
        if (!m2hit && !rn2(10)) {
            m2hit = true;
        }

        if (m2hit) {
            // C: wakeup(m2, FALSE) — not yet ported
            m2.sleeping = false;
            const m2dmg = rnd(15);
            m2.mhp = (m2.mhp ?? 0) - m2dmg;
            monmoveTrace('mind_blast',
                `step=${monmoveStepLabel(map)}`,
                `id=${mon.m_id ?? '?'}`,
                `target=${m2.m_id ?? '?'}(${m2dat.mname || '?'})`,
                `dmg=${m2dmg}`,
                `hp=${m2.mhp}`);
            if (m2.mhp <= 0) {
                // C: monkilled(m2, "", AD_DRIN)
                // TODO: proper monkilled with death reason
                mondead(m2, map, null);
            }
        }
    }
}

function isUndirectedSpell(adtyp, spellid) {
    if (adtyp === AD_SPEL) {
        return spellid === MGC_CLONE_WIZ
            || spellid === MGC_SUMMON_MONS
            || spellid === MGC_AGGRAVATION
            || spellid === MGC_DISAPPEAR
            || spellid === MGC_HASTE_SELF
            || spellid === MGC_CURE_SELF;
    }
    if (adtyp === AD_CLRC) {
        return spellid === CLC_INSECTS || spellid === CLC_CURE_SELF;
    }
    return false;
}

function spellWouldBeUseless(mon, adtyp, spellid, player = null) {
    const mpeaceful = !!(mon?.mpeaceful ?? mon?.peaceful);
    if (adtyp === AD_SPEL) {
        if (mpeaceful
            && (spellid === MGC_AGGRAVATION || spellid === MGC_SUMMON_MONS || spellid === MGC_CLONE_WIZ)) {
            return true;
        }
        if (spellid === MGC_HASTE_SELF) return (mon.mspeed || 0) >= 2;
        if (spellid === MGC_CURE_SELF) return (mon.mhp || 0) >= (mon.mhpmax || 0);
        if (spellid === MGC_DISAPPEAR) return !!mon.minvis;
        return false;
    }
    if (adtyp === AD_CLRC) {
        if (mpeaceful && spellid === CLC_INSECTS) return true;
        if (player?.blind && spellid === CLC_BLIND_YOU) return true;
        if (spellid === CLC_CURE_SELF) return (mon.mhp || 0) >= (mon.mhpmax || 0);
        return false;
    }
    return false;
}

// C ref: monmove.c:889-907 + mcastu.c:209-217 (thinks_it_foundyou=false).
// Attempt one undirected spell before movement when phase-3 gate is taken.
async function maybeCastUndirectedPreMove(mon, mdat, player, map) {
    if (mon.mspec_used || dist2(mon.mx, mon.my, player.x, player.y) > 49) {
        return false;
    }
    const mattk = Array.isArray(mdat?.attacks) ? mdat.attacks : [];
    const ml = Number(mon.m_lev) || 0;
    for (const a of mattk) {
        if (!a || a.aatyp !== AT_MAGC) continue;
        if (a.adtyp !== AD_SPEL && a.adtyp !== AD_CLRC) continue;
        if (ml <= 0) continue;

        // C ref: mcastu.c castmu() not-attacking case still consumes rn2(ml).
        const rawSpell = rn2(ml);
        const spellid = (a.adtyp === AD_SPEL)
            ? choose_magic_spell(rawSpell)
            : choose_clerical_spell(rawSpell);

        // C not-attacking path: reject directed/useless spells and keep moving.
        if (!isUndirectedSpell(a.adtyp, spellid) || spellWouldBeUseless(mon, a.adtyp, spellid, player)) {
            continue;
        }

        if (mon.mcan || mon.mspec_used) continue;
        mon.mspec_used = (ml < 8) ? (10 - ml) : 2;
        if (rn2(ml * 10) < (mon.mconf ? 100 : 20)) {
            continue;
        }

        // Undirected phase-3 casting uses damage 0 in C (foundyou=false).
        if (a.adtyp === AD_SPEL) {
            cast_wizard_spell(mon, 0, spellid, player, map);
        } else {
            cast_cleric_spell(mon, 0, spellid, player, map);
        }
        return true;
    }
    return false;
}

// ========================================================================
// dochug — C ref: monmove.c:690
// ========================================================================

async function dochug(mon, map, player, display, fov, game = null) {
    if ((mon.data || mon.type) && (mon.data || mon.type).mlet === S_MIMIC) {
        return;
    }

    // C ref: monmove.c:710-712 — waiting monsters wake once they can see
    // the hero or after taking damage.
    if ((Number(mon.mstrategy || 0) & STRAT_WAITFORU) !== 0) {
        const canSeeHero = m_canseeu(mon);
        const mhp = Number(mon.mhp);
        const mhpmax = Number(mon.mhpmax);
        const tookDamage = Number.isFinite(mhp) && Number.isFinite(mhpmax) && mhp < mhpmax;
        if (canSeeHero || tookDamage) {
            mon.mstrategy = Number(mon.mstrategy || 0) & ~STRAT_WAITFORU;
        }
    }

    // C ref: monmove.c:717-724 — immobile/waiting monsters cannot act.
    // Preserve Hallucination newsym side effect when represented.
    if (!mon.mcanmove || (((mon.mstrategy || 0) & STRAT_WAITMASK) !== 0)) {
        monmoveTrace('dochug-skip',
            `step=${monmoveStepLabel(map)}`,
            `id=${mon.m_id ?? '?'}`,
            `mndx=${mon.mndx ?? '?'}`,
            `reason=${!mon.mcanmove ? 'mcanmove0' : 'waitmask'}`,
            `mstrategy=0x${Number(mon.mstrategy || 0).toString(16)}`);
        if (player?.hallucinating) newsym(mon.mx, mon.my);
        return;
    }

    // Phase 2: Sleep check — C ref: monmove.c disturb()
    function disturb(monster) {
        const canSee = fov && fov.canSee(monster.mx, monster.my);
        if (!canSee) return false;
        if (dist2(monster.mx, monster.my, player.x, player.y) > 100) return false;

        const speciesName = monster.data?.mname || monster.type?.mname || '';
        if (player.stealth) {
            const isEttin = speciesName === 'ettin';
            if (!(isEttin && rn2(10))) return false;
        }

        const sym = (monster.data || monster.type)?.mlet;
        const isHardSleeper = sym === S_NYMPH
            || speciesName === 'jabberwock'
            || sym === S_LEPRECHAUN;
        if (isHardSleeper && rn2(50)) return false;

        const aggravate = !!player.aggravateMonster;
        const isDogOrHuman = sym === S_DOG || sym === S_HUMAN;
        if (!(aggravate || isDogOrHuman || !rn2(7))) return false;

        return true;
    }

    // C ref: monmove.c:739-744 — sleep check: if sleeping and doesn't wake up, skip movement.
    // If monster wakes up, dochug continues (wipe engravings, etc.).
    // C ref: monmove.c:740 — sleep gate is mtmp->msleeping only.
    const monsterSleeping = !!mon.msleeping;
    if (monsterSleeping) {
        monmoveTrace('dochug-skip',
            `step=${monmoveStepLabel(map)}`,
            `id=${mon.m_id ?? '?'}`,
            `mndx=${mon.mndx ?? '?'}`,
            `reason=sleep`,
            `msleeping=${mon.msleeping ? 1 : 0}`);
        if (!disturb(mon)) {
            return;
        }
        mon.msleeping = 0;
    }

    // C ref: monmove.c:735 — wipe engravings AFTER sleep check.
    // Sleeping monsters don't wipe dust engravings.
    await wipe_engr_at(map, mon.mx, mon.my, 1);

    // C ref: monmove.c:738-743 — confused/stunned clearing
    if (mon_is_confused(mon) && !rn2(50)) {
        mon.mconf = 0;
        mon.confused = false;
    }
    if (mon_is_stunned(mon) && !rn2(10)) {
        mon.mstun = 0;
        mon.stunned = false;
    }

    // C ref: monmove.c:746 — flee teleport
    if (mon.mflee && !rn2(40) && can_teleport(mon.data || mon.type || {})
        && !mon.iswiz && !(map.flags && map.flags.noteleport)) {
            for (let tries = 0; tries < 50; tries++) {
                const nx = rnd(COLNO - 1);
                const ny = rn2(ROWNO);
                const loc = map.at(nx, ny);
                if (!loc || !ACCESSIBLE(loc.typ)) continue;
                if (map.monsterAt(nx, ny)) continue;
                if (nx === player.x && ny === player.y) continue;
                // C ref: remove_monster/place_monster → newsym at old+new positions
                const _omx = mon.mx, _omy = mon.my;
                mon.mx = nx;
                mon.my = ny;
                newsym(_omx, _omy);
                newsym(nx, ny);
                return;
            }
            return;
    }

    // C ref: monmove.c:754 — m_respond() for special monsters
    await m_respond(mon, map, player, display, game);
    // C ref: monmove.c:756 — m_respond gaze can kill medusa
    if (DEADMONSTER(mon) || mon.dead) return;

    // C ref: monmove.c:759 — courage regain
    if (mon.mflee && !(mon.mfleetim > 0)
        && (mon.mhp ?? 0) >= (mon.mhpmax ?? 0)
        && !rn2(25)) {
        mon.mflee = false;
    }

    // C ref: monmove.c:779 — set_apparxy after flee checks
    set_apparxy(mon, map, player);

    // C ref: monmove.c:792 — distfleeck: determine range, proximity, fear
    let { inrange, nearby, scared } = await distfleeck(mon, map, player, display, fov);

    // C ref: monmove.c:795-803 — find_defensive / find_misc
    // Monsters check inventory for defensive or misc items to use.
    // Stubs return false for now (no RNG consumed when returning false).
    if (await find_defensive(mon, false, map, player)) {
        if (await use_defensive(mon, map, player) !== 0) return;
    } else if (await find_misc(mon, map, player)) {
        if (await use_misc(mon, map, player) !== 0) return;
    }

    // INCOMPLETE: C:803 — demonic blackmail (rare demon interaction)

    // C ref: monmove.c:832-836 — mind flayer psychic blast
    const mdat = mon.data || mon.type || {};
    if (is_mind_flayer(mdat) && !rn2(20)) {
        await mind_blast(mon, map, player, display, fov);
        set_apparxy(mon, map, player);
        // C ref: monmove.c:835 — recalculate distfleeck after mind_blast
        ({ inrange, nearby, scared } = await distfleeck(mon, map, player, display, fov));
    }

    const { x: targetX, y: targetY } = monApparentTarget(mon);
    const isWanderer = !!((mon.data || mon.type) && (mon.data || mon.type).mflags2 & M2_WANDER);
    const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false);

    let scaredNow = !!scared;
    monmovePhase3Trace(
        `step=${monmoveStepLabel(map)}`,
        `id=${mon.m_id ?? '?'}`,
        `mndx=${mon.mndx ?? '?'}`,
        `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
        `pos=(${mon.mx},${mon.my})`,
        `target=(${targetX},${targetY})`,
        `inrange=${inrange ? 1 : 0}`,
        `nearby=${nearby ? 1 : 0}`,
        `flee=${mon.mflee ? 1 : 0}`,
        `conf=${mon_is_confused(mon) ? 1 : 0}`,
        `stun=${mon_is_stunned(mon) ? 1 : 0}`,
        `minvis=${mon.minvis ? 1 : 0}`,
        `wander=${isWanderer ? 1 : 0}`,
        `mcansee=${monCanSee ? 1 : 0}`,
        `peace=${mon_is_peaceful(mon) ? 1 : 0}`,
    );
    // Short-circuit OR matching C's evaluation order (C ref: monmove.c:883-888)
    let phase3Cond = !nearby;
    if (phase3Cond) monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=!nearby');
    if (!phase3Cond) phase3Cond = !!(mon.mflee);
    if (phase3Cond && mon.mflee) monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=mflee');
    if (!phase3Cond && scared) {
        phase3Cond = true;
        monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=scared');
    }
    if (!phase3Cond) phase3Cond = mon_is_confused(mon);
    if (phase3Cond && mon_is_confused(mon)) monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=confused');
    if (!phase3Cond) phase3Cond = mon_is_stunned(mon);
    if (phase3Cond && mon_is_stunned(mon)) monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=stunned');
    if (!phase3Cond && mon.minvis) {
        const invisRoll = rn2(3);
        phase3Cond = !invisRoll;
        monmovePhase3Trace(
            `step=${monmoveStepLabel(map)}`,
            `id=${mon.m_id ?? '?'}`,
            `gate=minvis`,
            `roll=rn2(3)=${invisRoll}`,
            `take=${phase3Cond ? 1 : 0}`,
        );
    }
    if (!phase3Cond && mon.mndx === PM_LEPRECHAUN) {
        const playerHasGoldNow = playerHasGold(player);
        const monHasGold = hasGold(mon.minvent);
        if (!playerHasGoldNow && (monHasGold || rn2(2))) phase3Cond = true;
    }
    if (!phase3Cond && isWanderer) {
        const wanderRoll = rn2(4);
        phase3Cond = !wanderRoll;
        monmovePhase3Trace(
            `step=${monmoveStepLabel(map)}`,
            `id=${mon.m_id ?? '?'}`,
            `gate=wander`,
            `roll=rn2(4)=${wanderRoll}`,
            `take=${phase3Cond ? 1 : 0}`,
        );
    }
    // INCOMPLETE: Conflict artifact check not implemented (C:870)
    if (!phase3Cond && !monCanSee) {
        const blindRoll = rn2(4);
        phase3Cond = !blindRoll;
        monmovePhase3Trace(
            `step=${monmoveStepLabel(map)}`,
            `id=${mon.m_id ?? '?'}`,
            `gate=!mcansee`,
            `roll=rn2(4)=${blindRoll}`,
            `take=${phase3Cond ? 1 : 0}`,
        );
    }
    if (!phase3Cond) phase3Cond = mon_is_peaceful(mon);
    if (phase3Cond && mon_is_peaceful(mon)) monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, 'gate=peaceful');
    monmovePhase3Trace(`step=${monmoveStepLabel(map)}`, `id=${mon.m_id ?? '?'}`, `phase3Cond=${phase3Cond ? 1 : 0}`);

    // Wield gate before movement
    if (!mon_is_peaceful(mon)
        && inrange
        && dist2(mon.mx, mon.my, targetX, targetY) <= 8
        && hasWeaponAttack(mon)
        && !scaredNow) {
        if (await maybeMonsterWieldBeforeAttack(mon, player, display, fov, nearby)) {
            return;
        }
    }

    // Phase 3 movement + optional Phase 4 attack
    // C ref: monmove.c:900-963 — movement dispatch and status tracking
    let mmoved = false;
    let panicattk = false;
    let phase4Allowed = !phase3Cond;
    let moveStatus = MMOVE_NOTHING;
    if (phase3Cond) {
        const castedUndirected = await maybeCastUndirectedPreMove(mon, mdat, player, map);
        if (castedUndirected) {
            moveStatus = MMOVE_DONE;
        } else if (mon.meating) {
            mon.meating--;
            moveStatus = MMOVE_DONE; // eating uses up the action
        } else if (mon_is_tame(mon)) {
            // C ref: monmove.c m_move():1731-1740 — trapped check happens
            // before pet/non-pet branching, so tame monsters can skip dog_move
            // when still trapped this turn.
            let trappedNoMove = false;
            if (mon.mtrapped) {
                await mintrap_postmove(mon, map, player, display, fov);
                if (mon.dead) return;
                if (mon.mtrapped) {
                    trappedNoMove = true;
                    moveStatus = MMOVE_NOTHING;
                }
            }
            const omx = mon.mx, omy = mon.my;
            if (!trappedNoMove) {
                const petMoveStatus = await dog_move(mon, map, player, display, fov, false, game);
                // C ref: MMOVE_DIED == 2. dog_move can kill or remove the pet before post-move.
                if (petMoveStatus === 2 || mon.dead) {
                    return;
                }
                moveStatus = Number.isInteger(petMoveStatus) ? petMoveStatus : MMOVE_NOTHING;
                // C ref: monmove.c postmov() runs when mmoved == MMOVE_MOVED
                // regardless of whether the dog actually changed position.
                // dog_move returns MMOVE_MOVED even when the dog stays put,
                // so postmov (mdig_tunnel, mintrap, etc.) must always run.
                if (!mon.dead && moveStatus === MMOVE_MOVED) {
                    const postmoveStatus = await run_dochug_postmove_pipeline_current_js(
                        mon, map, player, display, fov, game, omx, omy, { preTrapDig: true }
                    );
                    if (postmoveStatus === MMOVE_DIED) {
                        return;
                    }
                    mmoved = true;
                }
            }
            ({ moveStatus, mmoved } = await run_dochug_postmove_tail_current_js(
                mon, map, player, display, fov, moveStatus, mmoved
            ));
        } else {
            let trapDied = false;
            // C ref: monmove.c:1747 — pre-movement mtrapped check.
            // If monster is already trapped, try to escape before allowing movement.
            // C returns MMOVE_NOTHING when still trapped; dochug() still recalc's
            // distfleeck() and can proceed to attack-phase logic.
            let trappedNoMove = false;
            if (mon.mtrapped) {
                await mintrap_postmove(mon, map, player, display, fov);
                if (mon.dead) return; // monster died in trap
                if (mon.mtrapped) {
                    trappedNoMove = true; // MMOVE_NOTHING path (no movement attempt)
                    moveStatus = MMOVE_NOTHING;
                }
            }
            if (!trappedNoMove) {
                const omx = mon.mx, omy = mon.my;
                moveStatus = await m_move(mon, map, player, display, fov);
                if (moveStatus === MMOVE_DIED || mon.dead) {
                    trapDied = true;
                    moveStatus = MMOVE_DIED;
                } else if (!mon.dead && (mon.mx !== omx || mon.my !== omy)) {
                    const postmoveStatus = await run_dochug_postmove_pipeline_current_js(
                        mon, map, player, display, fov, game, omx, omy
                    );
                    if (postmoveStatus === MMOVE_DIED) {
                        trapDied = true;
                        moveStatus = MMOVE_DIED;
                    } else {
                        mmoved = true;
                        moveStatus = MMOVE_MOVED;
                    }
                }
                if (!trapDied) {
                    ({ moveStatus, mmoved } = await run_dochug_postmove_tail_current_js(
                        mon, map, player, display, fov, moveStatus, mmoved
                    ));
                }
            }
            if (trapDied) return;
        }
        // C ref: monmove.c:919 — recalculate distfleeck after m_move
        if (moveStatus !== MMOVE_DIED && !mon.dead) {
            ({ inrange, nearby, scared } = await distfleeck(mon, map, player, display, fov));
        }

        if (moveStatus === MMOVE_DIED || mon.dead) {
            return;
        }

        if (moveStatus === MMOVE_NOMOVES && scared) {
            panicattk = true;
        }

        // C ref: monmove.c:970 — status != MMOVE_DONE allows attack after movement.
        phase4Allowed = moveStatus !== MMOVE_DONE && !mon.dead;
    }

    // Phase 4: Standard Attacks
    // cf. mhitu.c mattacku() — both melee and ranged attacks are dispatched
    // through the attack table.  range2 determines which attack types fire.
    // C ref: monmove.c:983-989 — Phase 4 is gated by status/peacefulness
    // (and Conflict handling), not by mtmp->mflee.
    if (phase4Allowed && !mon_is_peaceful(mon) && !mon.dead) {
        // C ref: monmove.c:985 — ((inrange && !scared) || panicattk) && !noattacks(mdat)
        if (((inrange && !scared) || panicattk) && !noattacks(mdat)) {
            if (nearby) {
                // C ref: monmove.c:938-959 — MMOVE_MOVED returns 0 (skip Phase 4
                // melee), but MMOVE_NOTHING/MMOVE_NOMOVES fall through to Phase 4.
                // !phase3Cond: monster never entered movement (was already adjacent).
                // !mmoved: monster entered movement but didn't actually move.
                if (!phase3Cond || !mmoved) {
                    if (await maybeMonsterWieldBeforeAttack(mon, player, display, fov, true)) {
                        return;
                    }
                    await mattacku(mon, player, display, game, { map });
                }
            } else {
                // C ref: monmove.c:945-949 — MMOVE_MOVED + !nearby: only proceed
                // to Phase 4 if monster has ranged attacks or offensive items.
                // find_offensive may consume RNG (obj_resists checks).
                const mdat = mon.data || mon.type || {};
                if (!mmoved
                    || ranged_attk_available(mon)
                    || attacktype(mdat, AT_WEAP)
                    || await find_offensive(mon, map, player)) {
                    await mattacku(mon, player, display, game, { range2: true, map });
                }
            }
        }
    }

    // C ref: monmove.c:1000-1002 — vile monster cussing after Phase 4
    if (inrange && mdat.msound === MS_CUSS && !mon_is_peaceful(mon)
        && couldsee(map, player, mon.mx, mon.my) && !mon.minvis && !rn2(5)) {
        await cuss(mon, map, player);
    }
}

// ========================================================================
// m_move — C ref: monmove.c:1716
// ========================================================================

function onlineu(mon, player) {
    const dx = mon.mx - player.x;
    const dy = mon.my - player.y;
    return dx === 0 || dy === 0 || dy === dx || dy === -dx;
}

// C ref: priest.c move_special()
export function move_special(mon, map, player, inHisShop, appr, uondoor, avoid, ggx, ggy) {
    const omx = mon.mx;
    const omy = mon.my;
    if (omx === ggx && omy === ggy) return 0;
    if (mon_is_confused(mon)) {
        avoid = false;
        appr = 0;
    }

    let nix = omx;
    let niy = omy;
    const positions = mfndpos(mon, map, player, mon_allowflags(mon, player, map));
    const cnt = positions.length;
    let chcnt = 0;
    if (mon.isshk && avoid && uondoor) {
        let hasOffLine = false;
        for (let i = 0; i < cnt; i++) {
            if (!(positions[i].info & NOTONL)) {
                hasOffLine = true;
                break;
            }
        }
        if (!hasOffLine) avoid = false;
    }

    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x;
        const ny = positions[i].y;
        const loc = map.at(nx, ny);
        if (!loc) continue;
        if (!(IS_ROOM(loc.typ) || (mon.isshk && (!inHisShop || mon.following)))) continue;

        if (avoid && (positions[i].info & NOTONL) && !(positions[i].info & ALLOW_M)) continue;

        const better = dist2(nx, ny, ggx, ggy) < dist2(nix, niy, ggx, ggy);
        if ((!appr && !rn2(++chcnt))
            || (appr && better)
            || (positions[i].info & ALLOW_M)) {
            nix = nx;
            niy = ny;
        }
    }

    if (mon.ispriest && avoid && nix === omx && niy === omy && onlineu(mon, player)) {
        return move_special(mon, map, player, inHisShop, appr, uondoor, false, ggx, ggy);
    }

    if (nix !== omx || niy !== omy) {
        if (map.monsterAt(nix, niy) || (nix === player.x && niy === player.y)) return 0;
        // C ref: remove_monster/place_monster → newsym at old+new positions
        mon.mx = nix;
        mon.my = niy;
        newsym(omx, omy);
        newsym(nix, niy);
        return 1;
    }
    return 0;
}

// C ref: mon.c mpickstuff() early gates.
async function maybeMonsterPickStuff(mon, map, player, display, fov) {
    if (mon.isshk && monsterInShop(mon, map)) return false;
    if (!mon_is_tame(mon) && monsterInShop(mon, map) && rn2(25)) return false;

    const pile = (map.objectsAt?.(mon.mx, mon.my) || [])
        .filter((obj) => obj && !obj.buried);
    for (const obj of pile) {
        if (obj.otyp === ROCK) continue;
        if (!mon_would_take_item_search(mon, obj, map)) continue;
        const carryAmt = can_carry(mon, obj);
        if (carryAmt <= 0) continue;

        let picked = obj;
        const quan = Number(obj.quan || 1);
        if (carryAmt < quan) {
            obj.quan = quan - carryAmt;
            obj.owt = weight(obj);
            picked = { ...obj, quan: carryAmt, o_id: next_ident() };
            picked.owt = weight(picked);
        } else {
            map.removeObject(obj);
        }
        if (display
            && !player?.blind
            && (canSpotMonsterForMap(mon, map, player, fov) || couldsee(map, player, mon.mx, mon.my))) {
            const seenName = doname({ ...picked, dknown: true }, player);
            await display.putstr_message(`${Monnam(mon)} picks up ${seenName}.`);
        }
        mpickobj(mon, picked);
        check_gear_next_turn(mon); // C ref: mon.c:1889 — let monster try to equip it next turn
        return true;
    }
    return false;
}

// INCOMPLETE vs C m_move():
// - No vault guard movement (C:1730)
// - No covetous monster teleport-to-hero (C:1737)
// - No boulder-pushing by strong monsters (C:2020)
// - No door-breaking by strong hostiles (C:2035)
// - No pool/lava avoidance messaging
// - Inventory-based door unlock limited to iswiz only

// C ref: monmove.c:1124 — m_digweapon_check()
// Returns TRUE if the monster switched weapons (costs the move, no dig this turn).
// Called BEFORE moving when ALLOW_DIG is set, to let monster wield its pick first.
async function m_digweapon_check(mon, nix, niy, map, player, display, fov) {
    const ptr = mon.data || mon.type || mons[mon.mndx] || {};
    if (!tunnels(ptr) || !needspick(ptr)) return false;
    const mw_tmp = mon.weapon || null;
    if (mwelded(mw_tmp)) return false;
    const loc = map.at(nix, niy);
    const typ = loc?.typ ?? 0;
    if (!may_dig(nix, niy, map) && !closed_door(nix, niy, map)) return false;
    if (closed_door(nix, niy, map)) {
        if (!mw_tmp || (mw_tmp.otyp !== PICK_AXE && mw_tmp.otyp !== DWARVISH_MATTOCK
                        && mw_tmp.otyp !== AXE && mw_tmp.otyp !== BATTLE_AXE))
            mon.weapon_check = NEED_PICK_OR_AXE;
    } else if (IS_TREE(typ)) {
        if (!mw_tmp || (mw_tmp.otyp !== AXE && mw_tmp.otyp !== BATTLE_AXE))
            mon.weapon_check = NEED_AXE;
    } else if (IS_STWALL(typ)) {
        if (!mw_tmp || (mw_tmp.otyp !== PICK_AXE && mw_tmp.otyp !== DWARVISH_MATTOCK))
            mon.weapon_check = NEED_PICK_AXE;
    }
    const oldWeapon = mon.weapon;
    if ((mon.weapon_check ?? 0) >= NEED_PICK_AXE && mon_wield_item(mon) !== 0) {
        if (display && mon.weapon && mon.weapon !== oldWeapon) {
            const visible = !fov?.canSee || (fov.canSee(mon.mx, mon.my)
                && !player?.blind && !mon.minvis);
            if (visible) {
                await display.putstr_message(`${Monnam(mon)} wields ${doname(mon.weapon, player)}.`);
            }
        }
        return true;
    }
    return false;
}

export async function m_move(mon, map, player, display = null, fov = null) {
    // Transient handoff state consumed by dochug postmove pipeline.
    mon._m_move_postmove_ctx = null;

    // C ref: monmove.c:1748-1757 — trapped monsters resolve mintrap at m_move entry.
    if (mon.mtrapped) {
        const trapResult = await mintrap_postmove(mon, map, player, display, fov);
        if (trapResult === 2 || trapResult === 3 || mon.dead) {
            return MMOVE_DIED;
        }
        if (mon.mtrapped) {
            return MMOVE_NOTHING;
        }
    }

    if (mon.isshk) {
        const omx = mon.mx, omy = mon.my;
        shk_move(mon, map, player);
        return (mon.mx !== omx || mon.my !== omy) ? MMOVE_MOVED : MMOVE_NOTHING;
    }
    if (mon.ispriest) {
        if (mon.epri && mon.epri.shrpos) {
            const omx = mon.mx, omy = mon.my;
            const ggx = mon.epri.shrpos.x + (rn2(3) - 1);
            const ggy = mon.epri.shrpos.y + (rn2(3) - 1);
            move_special(mon, map, player, false, 1, false, true, ggx, ggy);
            return (mon.mx !== omx || mon.my !== omy) ? MMOVE_MOVED : MMOVE_NOTHING;
        }
    }

    const ptr = mon.data || mon.type || mons[mon.mndx] || {};

    // C ref: monmove.c:1766-1769 — hiders can stay under suitable floor objects.
    if (hides_under(ptr)
        && can_hide_under_obj_at(map, mon.mx, mon.my)
        && rn2(10)) {
        return MMOVE_NOTHING;
    }

    // C ref: monmove.c:1840-1848 — Tengu innate teleport before normal movement.
    if (mon.mndx === PM_TENGU && !rn2(5) && !mon.mcan && !tele_restrict(mon, map)) {
        if (mon.mhp < 7 || mon_is_peaceful(mon) || rn2(2)) {
            await rloc(mon, 1, map, player, display, fov); // RLOC_MSG
        } else {
            const cc = { x: 0, y: 0 };
            const foundAdj = enexto(cc, player.x, player.y, ptr, map, player);
            if (foundAdj) {
                await rloc_to(mon, cc.x, cc.y);
            } else {
                await rloc(mon, 1, map, player, display, fov); // RLOC_MSG fallback
            }
        }
        return MMOVE_MOVED;
    }

    const omx = mon.mx, omy = mon.my;
    const verysmall = (ptr.msize || 0) === MZ_TINY;
    const can_open = !(nohands(ptr) || verysmall);
    // C ref: monmove.c:1768 — can_unlock = (can_open && monhaskey) || iswiz || is_rider
    const can_unlock = (can_open && monhaskey(mon, true)) || !!mon.iswiz || is_rider(ptr);

    set_apparxy(mon, map, player);

    let { x: ggx, y: ggy } = monApparentTarget(mon);

    let appr = mon.mflee ? -1 : 1;

    const monLoc = map.at(omx, omy);
    const playerLoc = map.at(ggx, ggy);

    // C ref: monmove.c:1857-1888 — appr logic with || short-circuit chain.
    // engulfing_u: player is engulfed by this specific monster.
    const engulfingU = !!(player.uswallow && player.ustuck === mon);
    // C ref: should_see is inside the else branch in C, but we need it for tracing.
    const should_see = couldsee(map, player, omx, omy)
        && ((playerLoc && playerLoc.lit) || !(monLoc && monLoc.lit))
        && (dist2(omx, omy, ggx, ggy) <= 36);
    if (mon_is_confused(mon) || engulfingU) {
        appr = 0;
    } else {
        const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false);
        const heroInvis = !!(player.Invis || player.invisible);
        // C ref: monmove.c:1864-1871 — || chain with short-circuit evaluation.
        // Each condition is only evaluated if all prior conditions were false.
        if (!monCanSee
            || (should_see && heroInvis && !perceives(ptr) && rn2(11))
            || !!(player.uundetected)
            || (mon_is_peaceful(mon) && !mon.isshk)
            || ((mon.mndx === PM_STALKER || ptr.mlet === S_BAT
                 || ptr.mlet === S_LIGHT) && !rn2(3))) {
            appr = 0;
        }

        if (appr === 1 && leppie_avoidance(mon, player)) {
            appr = -1;
        }

        // C ref: monmove.c:1877 — ranged monster approaching avoidance.
        appr = m_balks_at_approaching(appr, mon, player);

        if (!should_see && can_track(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) {
                ggx = cp.x;
                ggy = cp.y;
            }
        }
    }

    let getitems = false;
    const isRogueLevel = !!(map?.flags?.is_rogue || map?.flags?.roguelike || map?.flags?.is_rogue_lev);
    if ((!mon_is_peaceful(mon) || !rn2(10)) && !isRogueLevel) {
        const heroStr = Number(player?.attributes?.[A_STR])
            || Number(player?.str)
            || Number(player?.acurrstr)
            || 10;
        const { x: apparentX, y: apparentY } = monApparentTarget(mon);
        const inLine = linedUpToPlayer(mon, map, player, fov)
            && (distmin(mon.mx, mon.my, apparentX, apparentY)
                <= (Math.floor(heroStr / 2) + 1));
        if (appr !== 1 || !inLine) getitems = true;
    }
    if (getitems) {
        const replayStep = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
        const apprBeforeSearch = appr;
        const ggxBeforeSearch = ggx;
        const ggyBeforeSearch = ggy;
        const searchState = m_search_items_goal(mon, map, player, fov, ggx, ggy, appr);
        ggx = searchState.ggx;
        ggy = searchState.ggy;
        appr = searchState.appr;
        monmoveTrace('m_move-search',
            `step=${replayStep}`,
            `id=${mon.m_id ?? '?'}`,
            `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
            `mux=(${mon.mux ?? '?'},${mon.muy ?? '?'})`,
            `from=(${ggxBeforeSearch},${ggyBeforeSearch})`,
            `to=(${ggx},${ggy})`,
            `appr=${apprBeforeSearch}->${appr}`);
        if (searchState.done) {
            return MMOVE_DONE;
        }
    }

    const allowflags = mon_allowflags(mon, player, map);
    const positions = mfndpos(mon, map, player, allowflags);
    const cnt = positions.length;
    const replayStep = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
    const posSummary = positions.map((p) => `(${p.x},${p.y})`).join(' ');
    const trackSummary = Array.isArray(mon.mtrack)
        ? mon.mtrack.map((t) => `(${t?.x ?? '?'},${t?.y ?? '?'})`).join(' ')
        : 'none';
    monmoveTrace('m_move-begin',
        `step=${monmoveStepLabel(map)}`,
        `id=${mon.m_id ?? '?'}`,
        `mndx=${mon.mndx ?? '?'}`,
        `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
        `pos=(${omx},${omy})`,
        `target=(${ggx},${ggy})`,
        `mux=(${mon.mux ?? '?'},${mon.muy ?? '?'})`,
        `mcansee=${(mon.mcansee !== 0 && mon.mcansee !== false) ? 1 : 0}`,
        `blind=${mon.blind ? 1 : 0}`,
        `shouldSee=${should_see ? 1 : 0}`,
        `shortsighted=${map?.flags?.shortsighted ? 1 : 0}`,
        `appr=${appr}`,
        `cnt=${cnt}`,
        `poss=${posSummary}`,
        `track=${trackSummary}`);
    const tryUnicornFallbackTeleport = () => {
        const isUnicorn = mon.mndx === PM_WHITE_UNICORN
            || mon.mndx === PM_GRAY_UNICORN
            || mon.mndx === PM_BLACK_UNICORN;
        // C ref: monmove.c:2063 — unicorn fallback teleport only when rn2(2) != 0.
        if (!isUnicorn || !rn2(2) || (map.flags && map.flags.noteleport)) return false;
        for (let tries = 0; tries < 200; tries++) {
            const nx = rnd(COLNO - 1);
            const ny = rn2(ROWNO);
            const loc = map.at(nx, ny);
            if (!loc || !ACCESSIBLE(loc.typ)) continue;
            if (map.monsterAt(nx, ny)) continue;
            if (nx === player.x && ny === player.y) continue;
            // C ref: remove_monster/place_monster → newsym at old+new positions
            const _omx = mon.mx, _omy = mon.my;
            mon.mx = nx;
            mon.my = ny;
            newsym(_omx, _omy);
            newsym(nx, ny);
            return true;
        }
        return false;
    };
    if (cnt === 0) {
        if (tryUnicornFallbackTeleport()) return MMOVE_MOVED;
        return MMOVE_NOMOVES;
    }

    let nix = omx, niy = omy;
    let nidist = dist2(omx, omy, ggx, ggy);
    let chcnt = 0;
    let chosenIdx = -1;
    let mmoved = false;
    const jcnt = Math.min(MTSZ, cnt - 1);
    if (!mon_is_peaceful(mon)
        && map?.flags?.shortsighted
        && nidist > (couldsee(map, player, nix, niy) ? 144 : 36)
        && appr === 1) {
        appr = 0;
    }
    // C ref: monmove.c:1944-1945 — check if displacement is beneficial
    const betterWithDisplacing = should_displace(mon, positions, ggx, ggy);

    for (let i = 0; i < cnt; i++) {
        const nx = positions[i].x;
        const ny = positions[i].y;

        if (m_avoid_kicked_loc(mon, nx, ny, player)) continue;

        if (positions[i].allowMDisp && !positions[i].allowM && !betterWithDisplacing) continue;

        if (appr !== 0 && mon.mtrack) {
            let skipThis = false;
            for (let j = 0; j < jcnt; j++) {
                if (nx === mon.mtrack[j].x && ny === mon.mtrack[j].y) {
                    const denom = 4 * (cnt - j);
                    const trackRoll = rn2(denom);
                    monmoveTrace('m_move-track',
                        `step=${monmoveStepLabel(map)}`,
                        `id=${mon.m_id ?? '?'}`,
                        `mndx=${mon.mndx ?? '?'}`,
                        `name=${mon.data?.mname || mon.type?.mname || mon.name || '?'}`,
                        `pos=(${omx},${omy})`,
                        `cand=(${nx},${ny})`,
                        `j=${j}`,
                        `denom=${denom}`,
                        `roll=${trackRoll}`);
                    if (trackRoll) {
                        skipThis = true;
                        break;
                    }
                }
            }
            if (skipThis) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;

        // C ref: monmove.c m_move() candidate pick order.
        // Important: for appr==0, rn2(++chcnt) is evaluated even when this is
        // the first candidate; the fallback "mmoved==MMOVE_NOTHING" check is
        // the final OR term in C.
        if ((appr === 1 && nearer)
            || (appr === -1 && !nearer)
            || (appr === 0 && !rn2(++chcnt))
            || !mmoved) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chosenIdx = i;
            mmoved = true;
        }
    }
    if (!mmoved && tryUnicornFallbackTeleport()) return MMOVE_MOVED;

    if (mmoved && chosenIdx >= 0) {
        const chosen = positions[chosenIdx];
        // C ref: monmove.c:1986-2005 — if ALLOW_U was selected, retarget to
        // current apparent hero position before deciding attack/displace paths.
        if (chosen.allowU) {
            nix = mon.mux;
            niy = mon.muy;
        }
        if (player.x === nix && player.y === niy) {
            mon.mux = player.x;
            mon.muy = player.y;
            return MMOVE_NOTHING;
        }
        const attacksMonster = !!chosen.allowM
            || (nix === (mon.mux ?? -1) && niy === (mon.muy ?? -1));
        if (attacksMonster) {
            return await m_move_aggress(mon, map, player, nix, niy, display, fov);
        }
    }

    if (nix !== omx || niy !== omy) {
        // C ref: monmove.c:2026 — m_digweapon_check: if tunneling monster needs to wield
        // its pick before digging, it wields it and returns MMOVE_DONE (no movement this turn).
        if ((allowflags & ALLOW_DIG) && await m_digweapon_check(mon, nix, niy, map, player, display, fov)) {
            return MMOVE_DONE;
        }

        // C ref: monmove.c:2065 — mon_track_add(mtmp, omx, omy)
        mon_track_add(mon, omx, omy);
        // C ref: monmove.c m_move() remove/place only updates monster grid.
        // Visible redraw happens in postmov() around mintrap/newsym ordering.
        mon.mx = nix;
        mon.my = niy;
        mon._m_move_postmove_ctx = { allowflags, can_open, can_unlock };
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

// ========================================================================
// m_move_aggress — C ref: monmove.c:2090
// ========================================================================
// C-faithful: calls shared mattackm for full multi-attack resolution.
export async function m_move_aggress(mon, map, player, nx, ny, display = null, fov = null) {
    const target = map.monsterAt(nx, ny);
    if (!target || target === mon || target.dead) return MMOVE_DONE;

    const attackerVisible = canSpotMonsterForMap(mon, map, player, fov);
    const defenderVisible = canSpotMonsterForMap(target, map, player, fov);
    const vis = attackerVisible || defenderVisible;
    const replayStep = Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex + 1 : '?';
    monmoveTrace('m_move_aggress',
        `step=${replayStep}`,
        `attacker=${mon.m_id ?? '?'}(${mon.data?.mname || mon.type?.mname || mon.name || '?'})`,
        `defender=${target.m_id ?? '?'}(${target.data?.mname || target.type?.mname || target.name || '?'})`,
        `at=(${mon.mx},${mon.my})->(${target.mx},${target.my})`,
        `vis=${vis ? 1 : 0}`);

    // C ref: monmove.c:2100 — mattackm(mtmp, mtmp2)
    const ctx = { player, fov, turnCount: (player.turns || 0) + 1,
                  agrVisible: attackerVisible, defVisible: defenderVisible };
    const mstatus = await mattackm(mon, target, display, vis, map, ctx);

    // C ref: monmove.c:2104 — aggressor died
    if ((mstatus & M_ATTK_AGR_DIED) || mon.dead || (mon.mhp != null && mon.mhp <= 0))
        return MMOVE_DIED;
    // C parity: migrated/off-level aggressor should be treated as gone for this turn.
    if (!isok(mon.mx, mon.my) || !map.monsters.includes(mon))
        return MMOVE_DIED;

    // C ref: monmove.c:2107-2119 — retaliation
    if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4) && target.movement > rn2(NORMAL_SPEED)) {
        if (target.movement > NORMAL_SPEED)
            target.movement -= NORMAL_SPEED;
        else
            target.movement = 0;
        const rctx = { ...ctx, agrVisible: defenderVisible, defVisible: attackerVisible };
        const rstatus = await mattackm(target, mon, display, vis, map, rctx);
        if (rstatus & M_ATTK_DEF_DIED) return MMOVE_DIED;
        if (!isok(mon.mx, mon.my) || !map.monsters.includes(mon))
            return MMOVE_DIED;
    }

    return MMOVE_DONE;
}

// ========================================================================
// set_apparxy — C ref: monmove.c:2200
// ========================================================================
export function set_apparxy(mon, map, player) {
    const umoney = goldQuantity(player?.inventory || player?.invent || []);
    let mx = Number.isInteger(mon.mux) ? mon.mux : 0;
    let my = Number.isInteger(mon.muy) ? mon.muy : 0;
    const oldMux = mx;
    const oldMuy = my;
    const step = monmoveStepLabel(map);

    // C ref: monmove.c:2214 — pet, grabber, or already-at-hero position
    if (mon_is_tame(mon) || player.ustuck === mon || (mx === player.x && my === player.y)) {
        mon.mux = player.x;
        mon.muy = player.y;
        monmoveTrace(
            'set_apparxy',
            `step=${step}`,
            `id=${mon.m_id ?? '?'}`,
            'mode=direct',
            `tame=${mon_is_tame(mon) ? 1 : 0}`,
            `ustuck=${player.ustuck === mon ? 1 : 0}`,
            `u_at_old=${(oldMux === player.x && oldMuy === player.y) ? 1 : 0}`,
            `u=(${player.x},${player.y})`,
            `old=(${oldMux},${oldMuy})`,
            `new=(${mon.mux},${mon.muy})`,
        );
        return;
    }

    const mdat = mon.data || mons[mon.mndx] || mon.type || {};
    const canOoze = !!(mdat.mflags1 & M1_AMORPHOUS);
    const canFog = canOoze || !!(mdat.mflags1 & M1_UNSOLID);
    const monCanSee = (mon.mcansee !== 0 && mon.mcansee !== false);
    const heroInvis = playerIsInvisibleForMonAI(player);
    const notseen = (!monCanSee || (heroInvis && !perceives(mdat)));
    const playerDisplaced = playerIsDisplacedForMonAI(player);
    const notthere = playerDisplaced && mon.mndx !== PM_DISPLACER_BEAST;
    let displ;
    if (player.uinwater || player.underwater || player.Underwater) {
        displ = 1;
    } else if (notseen) {
        // C ref: monmove.c set_apparxy(): Xorn can smell coin piles.
        displ = (mon.mndx === PM_XORN && umoney > 0) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(map, player, mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }

    if (!displ) {
        mon.mux = player.x;
        mon.muy = player.y;
        monmoveTrace(
            'set_apparxy',
            `step=${step}`,
            `id=${mon.m_id ?? '?'}`,
            'mode=nodispl',
            `notseen=${notseen ? 1 : 0}`,
            `notthere=${notthere ? 1 : 0}`,
            `u=(${player.x},${player.y})`,
            `old=(${oldMux},${oldMuy})`,
            `new=(${mon.mux},${mon.muy})`,
        );
        return;
    }

    const gotu = notseen ? !rn2(3) : (notthere ? !rn2(4) : false);

    if (!gotu) {
        let tryCnt = 0;
        do {
            if (++tryCnt > 200) {
                mx = player.x;
                my = player.y;
                break;
            }
            mx = player.x - displ + rn2(2 * displ + 1);
            my = player.y - displ + rn2(2 * displ + 1);
            const loc = map.at(mx, my);
            const closedDoor = !!loc && IS_DOOR(loc.typ) && (loc.flags & (D_CLOSED | D_LOCKED));
            // C ref: monmove.c set_apparxy() acceptance gate:
            // if monster doesn't pass walls, require either accessible square
            // or closed door pass-through for ooze/fog forms.
            const blocked = !loc
                || (!((ACCESSIBLE(loc.typ) && !closedDoor)
                      || (closedDoor && (canOoze || canFog))));
            if (!isok(mx, my)) continue;
            if (displ !== 2 && mx === mon.mx && my === mon.my) continue;
            if ((mx !== player.x || my !== player.y)
                && !passes_walls(mdat) && blocked) continue;
            if (!couldsee(map, player, mx, my)) continue;
            break;
        } while (true);
    } else {
        mx = player.x;
        my = player.y;
    }

    mon.mux = mx;
    mon.muy = my;
    monmoveTrace(
        'set_apparxy',
        `step=${step}`,
        `id=${mon.m_id ?? '?'}`,
        'mode=displ',
        `notseen=${notseen ? 1 : 0}`,
        `notthere=${notthere ? 1 : 0}`,
        `displ=${displ}`,
        `gotu=${gotu ? 1 : 0}`,
        `u=(${player.x},${player.y})`,
        `old=(${oldMux},${oldMuy})`,
        `new=(${mon.mux},${mon.muy})`,
    );
}

// ========================================================================
// Monster Movement Behaviors — Phase H
// ========================================================================

// C ref: monmove.c:203 dochugw() — move a monster, check if hero should stop
// In JS, this logic is already inline in mon.js movemon(). This is a
// named export for external callers that need the same behavior.
export async function dochugw(mon, map, player, display, fov, game) {
    await dochug(mon, map, player, display, fov, game);
}

// C ref: monmove.c:660 m_everyturn_effect() — effects every turn for ALL alive monsters
// Called before the movement check, so runs even when monster can't move this tick.
export async function m_everyturn_effect(mon, map, player, game) {
    if (mon.mndx === PM_FOG_CLOUD) {
        // C ref: monmove.c:669-675 — fog cloud leaves harmless vapor unless door or existing cloud
        if (!closed_door(mon.mx, mon.my, map) && !visible_region_at(mon.mx, mon.my, map)) {
            await create_gas_cloud(mon.mx, mon.my, 1, 0, map, player, game);
        }
    }
}

// C ref: monmove.c:678 m_postmove_effect() — post-move effects at OLD position
// omx/omy: pre-move position (C calls this before place_monster updates mtmp->mx/my)
export async function m_postmove_effect(mon, map, player, game, omx, omy) {
    if (mon.mndx === PM_HEZROU) {
        // C ref: monmove.c:692-693 — hezrou leaves stench cloud at old position
        await create_gas_cloud(omx, omy, 1, 8, map, player, game);
    } else if (mon.mndx === PM_STEAM_VORTEX && !mon.mcan) {
        // C ref: monmove.c:694-695 — steam vortex leaves harmless vapor at old position
        await create_gas_cloud(omx, omy, 1, 0, map, player, game);
    }
}

// C ref: monmove.c:1458 postmov() — post-movement processing
// Simplified: handles trap trigger, item eating/pickup.
// Missing: door handling (open/unlock/bust), iron bars, tunneling, engulf.
export async function postmov(mon, map, player, mmoved) {
    if (!mon || !map) return mmoved;
    if (mon.dead) return mmoved;

    // Trap trigger after movement
    if (mmoved === 1 /* MMOVE_MOVED */) {
        const trapResult = await mintrap_postmove(mon, map, player);
        if (trapResult === 2 /* Trap_Killed_Mon */ || trapResult === 3 /* Trap_Moved_Mon */) {
            return -1; // MMOVE_DIED
        }
    }

    // Item eating and pickup after move
    if (mmoved >= 1) {
        const objects = map.objectsAt ? map.objectsAt(mon.mx, mon.my) : [];
        if (objects.length > 0 && !mon.dead) {
            // Hiding under objects
            const mdat = mon.data || mon.type || {};
            if (hides_under(mdat) || mdat.mlet === S_EEL) {
                if (mon.mundetected || rn2(5)) {
                    // hideunder logic — simplified
                }
            }
        }
    }
    return mmoved;
}

// C ref: monmove.c:1066 should_displace() — evaluate if displacement is worthwhile
// Simplified: returns true if displacing gets closer to goal than non-displacing.
export function should_displace(mon, positions, goalx, goaly) {
    if (!positions || !Array.isArray(positions)) return false;
    let shortestWith = -1;
    let shortestWithout = -1;
    let countWithout = 0;

    for (const pos of positions) {
        if (!pos) continue;
        const ndist = dist2(pos.x, pos.y, goalx, goaly);
        if (pos.hasMonster && pos.allowDisplace) {
            if (shortestWith === -1 || ndist < shortestWith)
                shortestWith = ndist;
        } else {
            if (shortestWithout === -1 || ndist < shortestWithout)
                shortestWithout = ndist;
            countWithout++;
        }
    }
    return shortestWith > -1
        && (shortestWith < shortestWithout || !countWithout);
}

// C ref: monmove.c:54 mb_trapped() — door trap explosion
// Returns true if monster dies.
export function mb_trapped(mon, map, player) {
    if (!mon || !map) return false;
    mon.mstun = 1;
    mon.stunned = true;
    mon.mhp = (mon.mhp || 0) - rnd(15);
    if ((mon.mhp || 0) <= 0) {
        mondead(mon, map, player);
        if (mon.dead || (mon.mhp || 0) <= 0) return true;
    }
    return false;
}

// C ref: monmove.c:1056 itsstuck() — check if monster is stuck to hero
export function itsstuck(mon, player) {
    if (!mon || !player) return false;
    // C ref: sticks(youmonst.data) && mtmp == u.ustuck && !u.uswallow
    if (player.ustuck === mon && !player.uswallow) {
        // Hero's form sticks — simplified check
        return true;
    }
    return false;
}

// C ref: monmove.c:361 release_hero() — ungrab/expel held/swallowed hero
export function release_hero(mon, player) {
    if (!mon || !player) return;
    if (player.ustuck === mon) {
        if (player.uswallow) {
            // C ref: expels(mon, ...) — not fully ported
            player.uswallow = false;
            player.ustuck = null;
        } else {
            unstuck(mon, player);
        }
    }
}

// C ref: monmove.c:176 watch_on_duty() — guard behavior
// Simplified: town/watch system not ported.
export function watch_on_duty(mon) {
    // Watch system not ported — no-op
}

// C ref: monmove.c:1184 m_balks_at_approaching() — monster avoids hero
// Simplified: ranged weapon/polearm/launcher checks not fully ported.
export function m_balks_at_approaching(oldappr, mon, player) {
    if (!mon || !player) return oldappr;
    const mdat = mon.data || mon.type || {};
    if (mon_is_peaceful(mon) || mon_is_tame(mon)) return oldappr;

    const edist = dist2(mon.mx, mon.my, player.x, player.y);
    if (edist >= 25) return oldappr; // too far to care

    // Has ranged attack capability and is low on HP — avoid
    const hasRanged = (mdat.mattk || []).some(a =>
        a && (a.aatyp === AT_BREA || a.aatyp === AT_SPIT));
    if (hasRanged && ((mon.mhp || 0) < Math.floor(((mon.mhpmax || 1) + 1) / 3) || !mon.mspec_used))
        return -1; // retreat

    return oldappr;
}

// C ref: mon_would_consume_item — eat criteria for items
// Simplified stub: metallivorous eats metal, gelatinous cube eats organic.
export function mon_would_consume_item(mon, obj) {
    if (!mon || !obj) return false;
    const mdat = mon.data || mon.type || {};
    // Rust monsters / rock moles eat metal
    if (mdat.metallivorous) return true;
    // Gelatinous cubes eat organic
    if (mon.mndx === PM_GELATINOUS_CUBE) return true;
    return false;
}

// Autotranslated from monmove.c:2183
export function closed_door(x, y, map) {
  const loc = map.at(x, y);
  if (!loc || !IS_DOOR(loc.typ)) return false;
  return !!((loc.flags || 0) & (D_CLOSED | D_LOCKED));
}

// Autotranslated from monmove.c:33
export async function msg_mon_movement(mtmp, omx, omy, game) {
  if (game.a11y.mon_movement && canspotmon(mtmp) && mtmp.mspotted) {
    let nix = mtmp.mx, niy = mtmp.my;
    let n2u = next2u(nix, niy), close = !n2u && (distu(nix, niy) <= (BOLT_LIM * BOLT_LIM)), closer = !n2u && (distu(nix, niy) <= distu(omx, omy));
    await pline_xy(nix, niy, "%s %s%s.", Monnam(mtmp), vtense( 0, locomotion(mtmp.data, "move")), n2u ? " next to you" : (close && closer) ? " closer" : (close && !closer) ? " further away" : " in the distance");
  }
}

// Autotranslated from monmove.c:106
export async function mon_yells(mon, shout, player) {
  if ((player?.Deaf || player?.deaf || false)) {
    if (canspotmon(mon)) await pline_mon(mon, "%s angrily %s %s %s!", Amonnam(mon), nolimbs(mon.data) ? "shakes" : "waves", mhis(mon), nolimbs(mon.data) ? mbodypart(mon, HEAD) : makeplural(mbodypart(mon, ARM)));
  }
  else {
    if (canspotmon(mon)) { await pline_mon(mon, "%s yells:", Amonnam(mon)); }
    else { await You_hear("someone yell:"); }
    verbalize1(shout);
  }
}

// Autotranslated from monmove.c:143
export async function m_break_boulder(mtmp, x, y, player) {
  let otmp;
  if (m_can_break_boulder(mtmp) && ((otmp = sobj_at(BOULDER, x, y)) != null)) {
    if (!is_rider(mtmp.data)) {
      if (!(player?.Deaf || player?.deaf || false) && (mdistu(mtmp) < 4*4)) {
        if (canspotmon(mtmp)) set_msg_xy(mtmp.mx, mtmp.my);
        await pline("%s mutters %s.", Monnam(mtmp), mtmp.ispriest ? "a prayer" : "an incantation");
      }
      mtmp.mspec_used += rn1(20, 10);
    }
    if (cansee(x, y)) { set_msg_xy(x, y); await pline_The("boulder falls apart."); }
    if (otmp.unpaid) { bill_dummy_object(otmp, player); }
    fracture_rock(otmp);
  }
}

// Autotranslated from monmove.c:375
export function find_pmmonst(pm, game, map) {
  let mtmp = null;
  if ((game.mvitals[pm].mvflags & G_GENOD) === 0) {
    for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp.nmon) {
      if (DEADMONSTER(mtmp)) {
        continue;
      }
      if (mtmp.data === mons[pm]) {
        break;
      }
    }
  }
  return mtmp;
}

// Autotranslated from monmove.c:424
export function gelcube_digests(mtmp) {
  let otmp = mtmp.minvent;
  if (mtmp.meating || !mtmp.minvent) return -1;
  while (otmp) {
    if (is_organic(otmp) && !otmp.oartifact && !is_mines_prize(otmp) && !is_soko_prize(otmp)) {
      break;
    }
    otmp = otmp.nobj;
  }
  if (!otmp) return -1;
  mtmp.meating = eaten_stat(mtmp.meating, otmp);
  extract_from_minvent(mtmp, otmp, true, true);
  m_consume_obj(mtmp, otmp);
  return 0;
}

// Autotranslated from monmove.c:1157
export function leppie_stash(mtmp, map) {
  let gold;
  if (mtmp.data === mons[PM_LEPRECHAUN] && !DEADMONSTER(mtmp) && !m_canseeu(mtmp) && !in_rooms(mtmp.mx, mtmp.my, SHOPBASE) && map.locations[mtmp.mx][mtmp.my].typ === ROOM && !t_at(mtmp.mx, mtmp.my, map) && rn2(4) && (gold = findgold(mtmp.minvent)) != null) {
    mdrop_obj(mtmp, gold, false);
    gold = g_at(mtmp.mx, mtmp.my, map);
    if (gold) {
      bury_an_obj(gold, map, null);
    }
  }
}

// Autotranslated from monmove.c:1230
export async function holds_up_web(x, y, map) {
  let sway;
  if (!isok(x, y) || IS_OBSTRUCTED(map.locations[x][y].typ) || ((map.locations[x][y].typ === STAIRS || map.locations[x][y].typ === LADDER) && (sway = await stairway_at(x, y, map)) != null && sway.up) || map.locations[x][y].typ === IRONBARS) return true;
  return false;
}

// C ref: monmove.c:1260 count_webbing_walls() — count cardinal-direction walls that hold a web
async function count_webbing_walls(x, y, map) {
    return (await holds_up_web(x, y - 1, map) ? 1 : 0)
         + (await holds_up_web(x + 1, y, map) ? 1 : 0)
         + (await holds_up_web(x, y + 1, map) ? 1 : 0)
         + (await holds_up_web(x - 1, y, map) ? 1 : 0);
}

// C ref: monmove.c:1272 maybe_spin_web() — spider/spinner places a web trap
// Called from end of m_move (C ref: monmove.c:1704) after movement candidate selection.
export async function maybe_spin_web(mtmp, map) {
    if (!webmaker(mtmp.data || mtmp.type)) return;
    if (helpless(mtmp) || mtmp.mspec_used) return;
    if (t_at(mtmp.mx, mtmp.my, map)) return;
    // soko_allow_web: returns false on sokoban levels; JS doesn't track sokoban
    // type per-level yet, so assume true (non-sokoban)
    const nwalls = await count_webbing_walls(mtmp.mx, mtmp.my, map);
    // count_traps(WEB): count existing webs on the level to reduce prob
    const nwebs = map && Array.isArray(map.traps) ? map.traps.filter(t => t && t.ttyp === WEB).length : 0;
    const prob = (((mtmp.mndx === PM_GIANT_SPIDER) ? 15 : 5) * (nwalls + 1)) - (3 * nwebs);
    if (rn2(1000) < prob) {
        const trap = maketrap(map, mtmp.mx, mtmp.my, WEB);
        if (trap) {
            mtmp.mspec_used = c_d(4, 4); // C ref: monmove.c:1297 — C-style d(), not Lua d()
            // Display message (cansee/canspotmon stubs — skip for now)
        }
    }
}

// Autotranslated from monmove.c:2123
export function can_hide_under_obj(obj, map) {
  let t;
  map = map || _gstate?.lev;
  if (!obj || obj.where !== 'OBJ_FLOOR') return false;
  if ((t = t_at(obj.ox, obj.oy, map)) != null && !is_pit(t.ttyp)) return false;
  if (obj.oclass === COIN_CLASS) {
    let coinquan = 0;
    do {
      if ((coinquan += obj.quan) >= 10) {
        break;
      }
      obj = obj.nexthere;
      if (!obj) return false;
    } while (obj.oclass === COIN_CLASS);
  }
  return true;
}

// Autotranslated from monmove.c:2190
export function accessible(x, y) {
  let levtyp = SURFACE_AT(x, y);
  return  (ACCESSIBLE(levtyp) && !closed_door(x, y));
}

// Autotranslated from monmove.c:2279
export function undesirable_disp(mtmp, x, y, map) {
  map = map || _gstate?.lev;
  let is_pet = (mtmp.mtame && !mtmp.isminion), trap = t_at(x, y, map);
  if (is_pet) {
    if (trap && trap.tseen && rn2(40)) return true;
    if (cursed_object_at(map, x, y)) return true;
  }
  else if (trap && rn2(40) && mon_knows_traps(mtmp, trap.ttyp)) { return true; }
  if (!accessible(x, y)   && !(is_pool(x, y) && is_pool(mtmp.mx, mtmp.my))) return true;
  return false;
}

// Autotranslated from monmove.c:2358
export function can_ooze(mtmp) {
  if (!amorphous(mtmp.data) || stuff_prevents_passage(mtmp)) return false;
  return true;
}

// Autotranslated from monmove.c:2367
export function can_fog(mtmp, game) {
  const _p = game?.player;
  if (!(game.mvitals[PM_FOG_CLOUD].mvflags & G_GENOD) && is_vampshifter(mtmp) && !(_p?.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic || _p?.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic) && !stuff_prevents_passage(mtmp)) return true;
  return false;
}

// ========================================================================
// Debug tracing — development-only trace helpers
// ========================================================================
function monmoveTraceEnabled() {
    return envFlag('WEBHACK_MONMOVE_TRACE');
}

export function monmoveTrace(...args) {
    if (!monmoveTraceEnabled()) return;
    console.log('[MONMOVE_TRACE]', ...args);
}

function monmovePhase3TraceEnabled() {
    return envFlag('WEBHACK_MONMOVE_PHASE3_TRACE');
}

export function monmovePhase3Trace(...args) {
    if (!monmovePhase3TraceEnabled()) return;
    console.log('[MONMOVE_PHASE3]', ...args);
}

export function monmoveStepLabel(map) {
    const idx = map?._replayStepIndex;
    return Number.isInteger(idx) ? String(idx + 1) : '?';
}

// Autotranslated from monmove.c:2172
export async function dissolve_bars(x, y, map) {
  if (!map || !isok(x, y)) return;
  const loc = map.locations?.[x]?.[y];
  if (!loc) return;
  // C ref: dissolve_bars() chooses DOOR for edge bars, else ROOM/CORR by context.
  loc.typ = (loc.edge === 1) ? DOOR : ((Number(loc.roomno || 0) >= ROOMOFFSET) ? ROOM : CORR);
  loc.flags = 0;
  loc.wall_info = 0;
  newsym(x, y);
}

// cf. monmove.c:395 bee_eat_jelly() — killer bee eats royal jelly to become queen
export async function bee_eat_jelly(mon, obj, game, map) {
    const mtmp = find_pmmonst(PM_QUEEN_BEE, game, map);
    // If a queen already exists, bee doesn't eat
    if (mtmp) return -1;

    const m_delay = obj.blessed ? 3 : !obj.cursed ? 5 : 7;
    if ((obj.quan || 1) > 1) {
        obj = splitobj(obj, 1);
    }
    if (canseemon(mon, map)) {
        await pline_mon(mon, "%s eats %s.", Monnam(mon), an(xname(obj)));
    }
    delobj(obj);

    if ((mon.m_lev || 0) < (mons[PM_QUEEN_BEE].mlevel || 0) - 1) {
        mon.m_lev = (mons[PM_QUEEN_BEE].mlevel || 0) - 1;
    }
    // Transform immediately, then freeze
    await grow_up(mon, null, game);

    if (DEADMONSTER(mon)) return 1; // queen bees genocided
    mon.mfrozen = m_delay;
    mon.mcanmove = 0;
    return 0; // bee used its move
}

// cf. monmove.c:575 m_arrival() — one-time arrival effect for a monster
export function m_arrival(mon) {
    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_ARRIVE; // always reset
    return -1;
}

// cf. monmove.c:1256 soko_allow_web() — restrict spider webs in unsolved Sokoban
export async function soko_allow_web(mon, map) {
    // Non-Sokoban or solved Sokoban: no restriction
    if (!map?.flags?.sokoban) return true;
    // Unsolved Sokoban: allow web only if spider can see stairs up
    const stway = await stairway_find_dir(true, map);
    if (stway && m_cansee(mon, map, stway.sx, stway.sy)) return true;
    return false;
}

// cf. monmove.c:2322 stuff_prevents_passage() — bulky inventory blocks squeezing
export function stuff_prevents_passage(mtmp, player) {
    const chain = (mtmp === player || mtmp?.isHero)
        ? (player?.inventory || [])
        : (mtmp.minvent || []);
    for (const obj of chain) {
        const typ = obj.otyp;
        // Large coin piles
        if (obj.oclass === COIN_CLASS && (obj.quan || 0) > 100) return true;
        // Small/light items that don't block passage
        if (obj.oclass === GEM_CLASS) continue;
        if (obj.oclass === AMULET_CLASS) continue;
        if (obj.oclass === RING_CLASS) continue;
        // Ammo and small weapons are fine
        const od = objectData[typ];
        if (od && od.oc_class === WEAPON_CLASS && (od.oc_skill || 0) < 0) continue; // ammo
        // Small clothing items are fine
        if (od && od.oc_armcat !== undefined) {
            // Cloaks, gloves, shirts, fedora — small
            const name = od.oc_name || '';
            if (name.includes('cloak') || name.includes('gloves') || name.includes('shirt')
                || name === 'fedora' || name === 'leather jacket') continue;
        }
        // Food items that are small enough
        if (od && od.oc_class === FOOD_CLASS) {
            const name = od.oc_name || '';
            if (name === 'fortune cookie' || name === 'candy bar' || name === 'pancake'
                || name === 'lembas wafer' || name === 'lump of royal jelly') continue;
        }
        // Small tools
        const smallTools = ['credit card', 'leash', 'stethoscope', 'blindfold', 'towel',
            'tin whistle', 'magic whistle', 'magic marker', 'tin opener',
            'skeleton key', 'lock pick'];
        if (od && smallTools.includes(od.oc_name || '')) continue;
        // Bags (but only empty ones)
        const bagNames = ['sack', 'bag of holding', 'bag of tricks', 'oilskin sack'];
        if (bagNames.includes(od?.oc_name || '')) {
            if (obj.cobj && obj.cobj.length > 0) return true; // container with contents
            continue;
        }
        // Candles are small
        if (od && (od.oc_name || '').includes('candle')) continue;
        // Venom is small
        if (od && od.oc_class === VENOM_CLASS) continue;
        // Small corpses
        if (obj.otyp === CORPSE && obj.corpsenm >= 0
            && mons[obj.corpsenm] && (mons[obj.corpsenm].msize || 0) <= MZ_TINY) continue;
        // Everything else is too bulky
        return true;
    }
    return false;
}

// cf. monmove.c:2380 vamp_shift() — vampire shape-changes to target form
export function vamp_shift(mon, ptr, domsg) {
    const monData = mon.data || mon.type;
    if (monData === ptr) {
        // Already right shape
        return 1;
    }
    if (is_vampshifter(mon)) {
        // C ref: newcham(mon, ptr, domsg ? NC_SHOW_MSG : NO_NC_FLAGS)
        // newcham is not fully ported; use stub from muse.js
        // For now, directly update mon.data to the target form
        mon.data = ptr;
        if (domsg && canseemon(mon)) {
            // Shape-change message would go here
        }
        return 1;
    }
    return 0;
}
