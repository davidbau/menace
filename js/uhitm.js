// uhitm.js -- Hero-vs-monster combat
// cf. uhitm.c — attack validation, to-hit/damage, damage-type handlers,
// engulfment, passive defense, mimic discovery, light attacks

import { rn2, rnd, d, c_d } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { acurr, adjalign } from './attrib.js';
import { corpse_chance, mon_to_stone } from './mon.js';
import { munstone, munslime } from './muse.js';
import { grow_up, runtimeApplyNewchamDirect, set_malign } from './makemon.js';
import { m_move } from './monmove.js';
import {
    A_STR, A_DEX, A_CON, A_WIS,
    FIRE_RES, COLD_RES, SHOCK_RES, ACID_RES, FREE_ACTION,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, EF_GREASE, EF_VERBOSE,
    RLOC_NOMSG, STRAT_WAITMASK, STRAT_WAITFORU, STUNNED,
} from './const.js';
import { spec_dbon } from './artifact.js';
import {
    PM_MONK, PM_SAMURAI, PM_BARBARIAN,
    G_FREQ, G_NOCORPSE, MZ_TINY, MZ_HUMAN, MZ_LARGE, M2_COLLECT,
    M1_FLY, M1_NOHEAD, M1_UNSOLID,
    S_ZOMBIE, S_MUMMY, S_VAMPIRE, S_WRAITH, S_LICH, S_GHOST, S_DEMON, S_KOP,
    S_LIGHT, S_MIMIC, S_NYMPH, S_GOLEM, S_LEPRECHAUN, S_FUNGUS,
    PM_SHADE, PM_FLOATING_EYE, PM_GREMLIN, PM_CLAY_GOLEM, PM_STEAM_VORTEX,
    PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_IRON_GOLEM, PM_GHOUL, PM_GREEN_SLIME,
    AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE, AD_DISN, AD_ELEC,
    AD_DRST, AD_ACID, AD_BLND, AD_STUN, AD_SLOW, AD_PLYS, AD_DRLI,
    AD_DREN, AD_LEGS, AD_STON, AD_STCK, AD_SGLD, AD_SITM, AD_SEDU,
    AD_TLPT, AD_RUST, AD_CONF, AD_DGST, AD_HEAL, AD_WRAP, AD_WERE,
    AD_DRDX, AD_DRCO, AD_DRIN, AD_DISE, AD_DCAY, AD_SSEX, AD_HALU,
    AD_DETH, AD_PEST, AD_FAMN, AD_SLIM, AD_ENCH, AD_CORR, AD_POLY,
    AD_SAMU, AD_CURS,
    AT_NONE, AT_WEAP, AT_CLAW, AT_KICK, AT_BITE, AT_TUCH, AT_BUTT, AT_STNG,
    AT_HUGS, AT_TENT, AT_ENGL, AT_EXPL, AT_BREA, AT_SPIT, AT_GAZE,
    AT_BOOM, AT_MAGC,
    mons,
} from './monsters.js';
import {
    CORPSE, FIGURINE, FOOD_CLASS, objectData,
    POTION_CLASS, POT_HEALING, POT_EXTRA_HEALING, POT_FULL_HEALING,
    POT_RESTORE_ABILITY, POT_GAIN_ABILITY,
    BOULDER, HEAVY_IRON_BALL, IRON_CHAIN, MIRROR, CLOVE_OF_GARLIC,
    SILVER, IRON, METAL, VEGGY, PAPER,
    WEAPON_CLASS, GEM_CLASS, TOOL_CLASS, SPBOOK_CLASS, COIN_CLASS, RANDOM_CLASS,
} from './objects.js';
import { mkobj, mkcorpstat, next_ident, xname } from './mkobj.js';
import { hitval as weapon_hitval, dmgval, abon, dbon, weapon_hit_bonus, weapon_dam_bonus } from './weapon.js';
import { near_capacity, overexertion } from './hack.js';
import { will_hurtle, mhurtle } from './dothrow.js';
import { u_wipe_engr } from './engrave.js';
import { s_suffix } from './hacklib.js';
import {
    nonliving, x_monnam, y_monnam, is_undead, is_demon,
    magic_negation, attacktype,
    resists_fire, resists_cold, resists_elec, resists_acid,
    resists_poison, resists_sleep, resists_ston, resists_drli,
    defended,
    thick_skinned, mon_hates_silver, mon_hates_light, hides_under,
    noncorporeal, amorphous, unsolid, haseyes, dmgtype, is_orc, is_were,
    carnivorous, herbivorous, is_metallivore,
    is_rider, slimeproof, completelyrusts, completelyrots,
    poly_when_stoned, DEADMONSTER,
} from './mondata.js';
import { obj_resists } from './objdata.js';
import { newexplevel } from './exper.js';
import { applyMonflee } from './mhitu.js';
import { mondead, mondied, monkilled, wakeup } from './mon.js';
import { newsym, canspotmon, map_invisible } from './display.js';
import { placeFloorObject } from './invent.js';
import { addToMonsterInventory } from './invent.js';
import { possibly_unwield } from './weapon.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { find_mac, extract_from_minvent } from './worn.js';
import { destroy_items_rng_only, resist } from './zap.js';
import { findgold } from './steal.js';
import { make_stunned, make_stoned } from './potion.js';
import {
    erode_obj, erode_obj_player, mselftouch,
} from './trap.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_ALWAYS, DISP_END, NATTK, M_AP_NOTHING, M_AP_MONSTER, MIM_REVEAL, STONED } from './const.js';
import { pline, pline_The, You, Your, impossible } from './pline.js';
import { mon_nam, Monnam } from './do_name.js';
import { tele_restrict, rloc } from './teleport.js';
import { night } from './calendar.js';

function exclam(force) {
    if (force < 0) return '?';
    if (force <= 4) return '.';
    return '!';
}

function martial_bonus(player) {
    const roleMnum = Number(player?.roleMnum);
    return roleMnum === PM_MONK || roleMnum === PM_SAMURAI;
}

function miscMeleeObjectBaseDamage(obj) {
    const w = Math.max(0, Number(obj?.owt) || 0);
    let sides = Math.floor((w + 99) / 100);
    if (sides <= 1) return 1;
    let dmg = rnd(sides);
    if (dmg > 6) dmg = 6;
    return dmg;
}

async function abuse_dog_like_c(mon, display = null) {
    if (!Number(mon?.mtame || 0)) return;
    // C halves tameness for Aggravate/Conflict; those globals are not wired
    // in JS combat paths, so apply the normal decrement path.
    mon.mtame -= 1;
    if (Number(mon.mtame || 0) > 0 && !mon.isminion && mon.edog) {
        mon.edog.abuse = Number(mon.edog.abuse || 0) + 1;
    }
    if (Number(mon.mx || 0) !== 0 && display) {
        if (Number(mon.mtame || 0) > 0 && rn2(mon.mtame)) {
            await display.putstr_message(`The ${x_monnam(mon)} yowls!`);
        } else {
            await display.putstr_message(`The ${x_monnam(mon)} growls!`);
        }
    }
}


// ============================================================================
// 1. Magic negation and attack result constants
// ============================================================================

// cf. uhitm.c:74 — mhitm_mgc_atk_negated(magr, mdef, verbosely):
//   Check if a magical attack is negated by target's magic cancellation.
//   Consumes rn2(10) — RNG-critical.
//   Returns true if attack is negated.
export function mhitm_mgc_atk_negated(magr, mdef) {
    if (magr.mcan) return true;
    const armpro = magic_negation(mdef);
    const negated = !(rn2(10) >= 3 * armpro);
    return negated;
}


// ============================================================================
// 2. Attack validation
// ============================================================================

// cf. uhitm.c:103 — dynamic_multi_reason(mon, verb, by_gaze):
//   Build reason string for multi-turn delay after special attacks.
//   In JS, multi_reason is not used for the same purpose. Stub for parity.
export function dynamic_multi_reason(mon, verb, by_gaze) {
    // C builds a formatted string like "frozen by a <monster>'s gaze"
    // for use with nomul(). In JS we don't use multi_reason strings.
    const name = x_monnam(mon);
    const reason = by_gaze
        ? `${verb} by ${name}'s gaze`
        : `${verb} by ${name}`;
    return reason;
}

// cf. uhitm.c:125 — erode_armor(mdef, hurt):
//   Erode target's armor from acid/rust/fire damage.
//   C loops rn2(5) until it finds a valid armor slot to erode.
//   In JS, armor erosion is not fully modeled; consume rn2(5) for RNG parity.
export function erode_armor(mdef, hurt) {
    // C: while(1) { switch(rn2(5)) { ... break; } break; }
    // The loop always consumes exactly one rn2(5) in practice (it loops
    // only if the chosen slot has no armor or armor is already fully eroded,
    // which we can't check without full armor tracking). Consume one call.
    rn2(5);
}

// cf. uhitm.c:188 — attack_checks(mtmp, wep):
//   Pre-attack validation: peaceful/tame checks, displacement, invisibility.
//   Returns true if the attack should be aborted.
//   In JS, attack validation is handled upstream in the move system.
//   This stub always returns false (OK to attack).
export async function attack_checks(mtmp, wep, opts = {}) {
    const player = opts.player || null;
    const display = opts.display || null;
    const context = opts.context || null;
    const pets_too = !!opts.pets_too;
    const forcefight = !!(context && context.forcefight);
    // C: alerts waiting monster, checks forcefight, invisible, mimic, peaceful
    if (mtmp.mstrategy) mtmp.mstrategy &= ~STRAT_WAITMASK;
    if (!mtmp) return true;
    if (mtmp.msleeping) {
        mtmp.msleeping = 0;
        mtmp.sleeping = false;
    }

    // C ref: uhitm.c:229-251 — invisible monster check (before pet/peaceful)
    const map = opts.map || null;
    if (map && player && !canspotmon(mtmp, player, null, map) && !forcefight) {
        const mdat = mtmp.data || mtmp.type || null;
        if (!(!player?.Blind && mtmp.mundetected && mdat && hides_under(mdat))) {
            await pline("Wait!  There's %s there you can't see!", "something");
            map_invisible(map, mtmp.mx, mtmp.my, player);
            wakeup(mtmp, true, map, player);
            return true;
        }
    }

    // C-style safety gates: don't auto-attack tame/peaceful unless forced.
    if (!forcefight) {
        if (mtmp.tame && !pets_too) {
            if (display) await display.putstr_message('You stop. Your pet is in the way!');
            return true;
        }
        if (mtmp.peaceful && !pets_too) {
            if (display) await display.putstr_message(`Really attack ${x_monnam(mtmp)}?`);
            return true;
        }
    }

    // Mimic/undetected reveal side effect.
    if (mtmp.mundetected) mtmp.mundetected = false;
    if (player && mtmp.mx === player.x && mtmp.my === player.y) {
        // Displaced/invisible confusion guard: don't attack own square.
        return true;
    }
    return false;
}

// cf. uhitm.c:330 — check_caitiff(mtmp):
//   Alignment penalty for attacking a fleeing or helpless monster.
//   Knight attacking defenseless = "You caitiff!" + alignment -1
//   Samurai attacking peaceful = "You dishonorably attack!" + alignment -1
export function check_caitiff(mtmp) {
    // In JS, role-specific alignment penalties are not yet tracked.
    // Stub: no effect.
}

// cf. uhitm.c:350 — mon_maybe_unparalyze(mtmp):
//   Wake up paralyzed monster on being attacked.
export function mon_maybe_unparalyze(mon) {
    if (mon.mcanmove === false) {
        if (!rn2(10)) {
            mon.mcanmove = true;
            mon.mfrozen = 0;
        }
    }
}

// cf. uhitm.c:364 — find_roll_to_hit(mtmp, aatyp, weapon, attk_count, role_roll_penalty)
//   Compute to-hit modifier for hero attacking monster.
//   Returns tmp where hit = (tmp > rnd(20)).
function find_roll_to_hit(player, mtmp, aatyp, weapon) {
    // cf. uhitm.c:375 — base formula:
    //   tmp = 1 + abon() + find_mac(mtmp) + u.uhitinc
    //         + Luck_bonus + u.ulevel
    // C ref: uhitm.c find_roll_to_hit — uses ACURR(A_STR), ACURR(A_DEX)
    const str = acurr(player, A_STR);
    const dex = acurr(player, A_DEX);
    let tmp = 1 + abon(str, dex, player.ulevel)
        + find_mac(mtmp)
        + (player.uhitinc || 0) // rings of increase accuracy etc.
        + luckBonus((player.luck || 0) + (player.moreluck || 0))
        + player.ulevel;

    // cf. uhitm.c:386-393 — monster state adjustments
    if (mtmp.stunned || mtmp.mstun) tmp += 2;
    if (mtmp.mflee) tmp += 2;
    if (mtmp.sleeping || mtmp.msleeping) tmp += 2;
    if (mtmp.mcanmove === false) tmp += 4;

    // cf. uhitm.c:396-404 — role/race adjustments
    // Monk: bonus when unarmed; heavy penalty if armored.
    if (player.roleMnum === PM_MONK) {
        // C monk handling is specific:
        // - body armor (uarm) applies spell-armor roll penalty
        // - unarmed + no shield grants monk hit bonus
        const bodyArmor = !!player.armor;
        if (bodyArmor) {
            const monkArmorPenalty = Number.isFinite(player?.spelarmr)
                ? Number(player.spelarmr)
                : 20;
            tmp -= monkArmorPenalty;
        } else if (!weapon && !player.shield) {
            tmp += Math.floor((player.ulevel || 1) / 3) + 2;
        }
    }
    // Elf hero bonus vs orcs.
    const isElfHero = player.race === 'elf' || player.raceName === 'elf' || player.raceIndex === 1;
    if (isElfHero && is_orc(mtmp?.type || {})) tmp += 1;

    // cf. uhitm.c:407-410 — encumbrance and trap penalties
    const enc = near_capacity(player);
    if (enc) tmp -= (enc * 2) - 1;
    if (player.utrap) tmp -= 3;

    // cf. uhitm.c:417-423 — weapon bonuses
    if (aatyp === AT_WEAP || aatyp === AT_CLAW) {
        if (weapon) tmp += weapon_hitval(weapon, mtmp);
        tmp += weapon_hit_bonus(weapon); // skill-based (stub: returns 0)
    }

    return tmp;
}

// cf. uhitm.c:431 — force_attack(mtmp, pets_too):
//   Force attack on a monster in the way (e.g. 'F' prefix).
//   Temporarily sets forcefight flag, calls do_attack, restores flag.
export async function force_attack(mtmp, pets_too, player = null, display = null, map = null, context = null) {
    if (!mtmp || !player) return false;
    const ctx = context || {};
    const save = !!ctx.forcefight;
    ctx.forcefight = true;
    const attacked = !!await do_attack(player, mtmp, display, map, { context: ctx, pets_too });
    ctx.forcefight = save;
    return attacked;
}

// cf. uhitm.c:447 — do_attack(mtmp):
//   Top-level attack dispatcher: checks, weapon selection, special cases.
//   Partially implemented via hmon() below.
//   Full implementation would handle: attack_checks, capacity, poly attacks,
//   leprechaun dodge, hitum/hmonas dispatch, invisible monster mapping.
export async function do_attack(player, mtmp, display, map, opts = {}) {
    if (!player || !mtmp) return false;
    const context = opts.context || null;
    const pets_too = !!opts.pets_too;
    const game = opts.game || null;
    if (await attack_checks(mtmp, player.weapon || null, {
        player, display, map, context, pets_too,
    })) {
        return false;
    }
    // C ref: uhitm.c:530-532 — consume extra nutrition during combat
    if (await overexertion(game))
        return false;
    // C ref: uhitm.c:550-552 — pre-attack exercise and engrave wipe
    await exercise(player, A_STR, true);
    await u_wipe_engr(player, map, 3);
    // C ref: uhitm.c:555-562 — leprechaun dodge
    const mdat = mtmp.data || mtmp.type || {};
    if (mdat.mlet === S_LEPRECHAUN
        && !mtmp.mfrozen && !mtmp.msleeping && !mtmp.mconf
        && mtmp.mcansee !== 0 && mtmp.mcansee !== false
        && !rn2(7)) {
        await m_move(mtmp, map, player);
        if (mtmp.mx !== player.x || mtmp.my !== player.y)
            return false; // leprechaun dodged away
    }
    // TODO: C uhitm.c:564-567 — Upolyd hmonas() dispatch
    // Delegate to hmon for the normal case
    return await do_attack_core(player, mtmp, display, map, game);
}


// ============================================================================
// 3. Core hit mechanics
// ============================================================================

// HMON_xxx thrown constants (cf. hack.h)
const HMON_MELEE = 0;
const HMON_THROWN = 1;
const HMON_KICKED = 2;
const HMON_APPLIED = 3;

// cf. uhitm.c:586 — known_hitum(mon, weapon, mhit, rollneeded, armorpenalty, uattk, dieroll):
//   Handle known-hit path: exercise, cleave, flee check after hit.
//   Returns true if monster survives, false if dead.
async function known_hitum(player, mon, weapon, mhit, rollneeded, armorpenalty, uattk, dieroll, display, map) {
    let malive = true;

    if (!mhit) {
        // Miss path
        await missum_internal(player, mon, uattk, (rollneeded + armorpenalty > dieroll), display);
    } else {
        const oldhp = mon.mhp;
        // Hit: call hmon
        malive = await hmon(player, mon, weapon, HMON_MELEE, dieroll, display, map);
        if (malive) {
            // cf. uhitm.c:624-628 — 1/25 flee check
            if (!rn2(25) && mon.mhp < Math.floor((mon.mhpmax || 1) / 2)) {
                const fleetime = !rn2(3) ? rnd(100) : 0;
                applyMonflee(mon, fleetime, false);
            }
            // Vorpal Blade: hit converted to miss if hp unchanged
            if (mon.mhp === oldhp) {
                mhit = 0;
            }
        }
    }
    return malive;
}

// cf. uhitm.c:650 — hitum_cleave(target, uattk):
//   Cleaving attack: hit adjacent monsters with two-handed weapon.
//   In JS, cleaving is not yet supported (requires Cleaver artifact).
//   Stub: returns true (target survived).
function hitum_cleave(target, uattk) {
    return true;
}

// cf. uhitm.c:735 — double_punch():
//   Check for martial arts double punch chance.
//   Requires unarmed, no shield, skilled+ in bare-handed combat.
//   In JS, skill levels are not yet tracked. Always returns false.
function double_punch() {
    // C: if (!uwep && !uarms && P_SKILL(P_BARE_HANDED_COMBAT) > P_BASIC)
    //       return (skl_lvl - P_BASIC) > rn2(5);
    return false;
}

// cf. uhitm.c:757 — hitum(mon, uattk):
//   Main melee hit routine: roll to-hit, call known_hitum or miss.
//   Returns true if monster survives.
async function hitum(player, mon, uattk, display, map, game = null) {
    const weapon = player.weapon;
    // cf. uhitm.c:775 — twohits: double punch or two-weapon
    // const twohits = (weapon ? !!player.twoweap : double_punch()) ? 1 : 0;

    const tmp = find_roll_to_hit(player, mon, uattk?.aatyp ?? AT_WEAP, weapon);
    mon_maybe_unparalyze(mon);
    const dieroll = rnd(20);
    const mhit = (tmp > dieroll);
    if (tmp > dieroll) await exercise(player, A_DEX, true);

    const malive = await known_hitum(player, mon, weapon, mhit, tmp, 0, uattk, dieroll, display, map);
    await passive(mon, weapon, mhit, malive, uattk?.aatyp ?? AT_WEAP, false, {
        player, display, map, game,
    });

    // TODO: second attack for two-weapon or double punch
    return malive;
}

// cf. uhitm.c:818 — hmon(mon, obj, thrown, dieroll):
//   Wrapper for hmon_hitmon: applies object damage to monster.
//   Returns true if monster survives.
export async function hmon(player, mon, obj, thrown, dieroll, display, map) {
    return await hmon_hitmon(player, mon, obj, thrown, dieroll, display, map);
}

// cf. uhitm.c:837 — hmon_hitmon_barehands(hmd, mon):
//   Bare-handed damage: martial arts gives 1d4, otherwise 1d2.
//   Also checks blessed gloves and silver rings for bonus.
function hmon_hitmon_barehands(hmd, mon) {
    if ((mon.mndx ?? -1) === PM_SHADE) {
        hmd.dmg = 0;
    } else {
        // C: rnd(!martial_bonus() ? 2 : 4)
        hmd.dmg = rnd(martial_bonus(hmd.player) ? 4 : 2);
        hmd.use_weapon_skill = true;
        hmd.train_weapon_skill = (hmd.dmg > 1);
    }
    // C: silver ring / blessed glove bonuses — simplified, no ring system
    hmd.barehand_silver_rings = 0;
}

// cf. uhitm.c:884 — hmon_hitmon_weapon_ranged(hmd, mon, obj):
//   Ranged weapon used in melee: rnd(2) base damage.
export function hmon_hitmon_weapon_ranged(hmd, mon, obj) {
    if ((mon.mndx ?? -1) === PM_SHADE) {
        hmd.dmg = 0;
    } else {
        hmd.dmg = rnd(2);
    }
    const material = objectData[obj.otyp]?.oc_material;
    if (material === SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = true;
        hmd.silverobj = true;
        hmd.dmg += rnd(hmd.dmg ? 20 : 10);
    }
}

// cf. uhitm.c:919 — hmon_hitmon_weapon_melee(hmd, mon, obj):
//   Melee weapon damage: dmgval, enchantment, blessed vs undead, silver, etc.
function hmon_hitmon_weapon_melee(hmd, mon, obj) {
    hmd.use_weapon_skill = true;
    hmd.dmg = dmgval(obj, mon);
    hmd.train_weapon_skill = (hmd.dmg > 1);

    // cf. uhitm.c:993-1011 — artifact hit
    // artifact_hit() not yet ported; skip

    const material = objectData[obj.otyp]?.oc_material;
    if (material === SILVER && mon_hates_silver(mon)) {
        hmd.silvermsg = true;
        hmd.silverobj = true;
    }
    if (obj.lamplit && mon_hates_light(mon)) {
        hmd.lightobj = true;
    }
    // cf. uhitm.c:1039-1044 — poison from thrown/wielded poisoned weapon
    if (obj.opoisoned && hmd.dieroll <= 5) {
        hmd.ispoisoned = true;
    }
}

// cf. uhitm.c:1048 — hmon_hitmon_weapon(hmd, mon, obj):
//   Dispatch weapon hit to ranged or melee sub-handler.
export function hmon_hitmon_weapon(hmd, mon, obj) {
    if (usesRangedMeleeDamage(obj)) {
        hmon_hitmon_weapon_ranged(hmd, mon, obj);
    } else {
        hmon_hitmon_weapon_melee(hmd, mon, obj);
    }
}

// cf. uhitm.c:1073 — hmon_hitmon_potion(hmd, mon, obj):
//   Potion used as melee weapon: potionhit() then 1 damage (0 vs shade).
export async function hmon_hitmon_potion(hmd, mon, obj, player, display) {
    // Use existing hitMonsterWithPotion for the potion effect
    await hitMonsterWithPotion(player, mon, display, obj);
    hmd.hittxt = true;
    hmd.dmg = (mon.mndx ?? -1) === PM_SHADE ? 0 : 1;
}

// cf. uhitm.c:1097 — hmon_hitmon_misc_obj(hmd, mon, obj):
//   Miscellaneous object as weapon: cockatrice corpse, cream pie, etc.
function hmon_hitmon_misc_obj(hmd, mon, obj) {
    switch (obj.otyp) {
    case BOULDER:
    case HEAVY_IRON_BALL:
    case IRON_CHAIN:
        hmd.dmg = dmgval(obj, mon);
        break;
    case MIRROR:
        hmd.dmg = 1;
        break;
    case CORPSE:
        // cf. uhitm.c:1152 — corpse damage = msize + 1
        hmd.dmg = ((obj.corpsenm != null && objectData[obj.otyp]) ? 1 : 0) + 1;
        break;
    case CLOVE_OF_GARLIC:
        // cf. uhitm.c:1238 — garlic vs undead: flee
        if (is_undead(mon.data || mon.type || {})) {
            applyMonflee(mon, c_d(2, 4), false);
        }
        hmd.dmg = 1;
        break;
    default: {
        // cf. uhitm.c:1320-1360 — generic non-weapon: weight-based damage
        const material = objectData[obj.otyp]?.oc_material;
        if ((material === VEGGY || material === PAPER)
            && (obj.oclass !== SPBOOK_CLASS)) {
            hmd.dmg = 0;
            hmd.get_dmg_bonus = false;
            break;
        }
        hmd.dmg = Math.floor(((obj.owt || 0) + 99) / 100);
        hmd.dmg = (hmd.dmg <= 1) ? 1 : rnd(hmd.dmg);
        if (hmd.dmg > 6) hmd.dmg = 6;
        if (material === SILVER && mon_hates_silver(mon)) {
            hmd.dmg += rnd(20);
            hmd.silvermsg = true;
            hmd.silverobj = true;
        }
        break;
    }
    }
}

// cf. uhitm.c:1365 — hmon_hitmon_do_hit(hmd, mon, obj):
//   Top-level dispatch: bare hands or object (weapon/potion/misc).
export async function hmon_hitmon_do_hit(hmd, mon, obj, player, display) {
    if (!obj) {
        hmon_hitmon_barehands(hmd, mon);
    } else {
        const oclass = obj.oclass ?? objectData[obj.otyp]?.oclass;
        if (oclass === WEAPON_CLASS || oclass === GEM_CLASS) {
            hmon_hitmon_weapon(hmd, mon, obj);
        } else if (oclass === POTION_CLASS) {
            await hmon_hitmon_potion(hmd, mon, obj, player, display);
        } else {
            if ((mon.mndx ?? -1) === PM_SHADE && !shade_aware(obj)) {
                hmd.dmg = 0;
            } else {
                hmon_hitmon_misc_obj(hmd, mon, obj);
            }
        }
    }
}

// cf. uhitm.c:1414 — hmon_hitmon_dmg_recalc(hmd, obj):
//   Recalculate damage after enchantment/bonus adjustments.
//   Adds strength bonus (dbon) and weapon skill bonus.
export function hmon_hitmon_dmg_recalc(hmd, obj, player) {
    let dmgbonus = 0;
    if (hmd.get_dmg_bonus) {
        // Strength bonus
        dmgbonus += dbon(acurr(player, A_STR));
        // udaminc (ring of increase damage) — not yet tracked
        dmgbonus += (player.udaminc || 0);
    }
    if (hmd.use_weapon_skill) {
        dmgbonus += weapon_dam_bonus(obj);
    }
    hmd.dmg += dmgbonus;
    if (hmd.dmg < 1) hmd.dmg = 1;
}

// cf. uhitm.c:1488 — hmon_hitmon_poison(hmd, mon, obj):
//   Apply poison from poisoned weapon to monster.
export function hmon_hitmon_poison(hmd, mon, obj) {
    // C: nopoison = max(2, 10 - owt/10); if !rn2(nopoison) remove poison
    const nopoison = Math.max(2, 10 - Math.floor((obj.owt || 0) / 10));
    if (!rn2(nopoison)) {
        obj.opoisoned = false;
        hmd.unpoisonmsg = true;
    }
    if (resists_poison(mon)) {
        hmd.needpoismsg = true;
    } else if (rn2(10)) {
        hmd.dmg += rnd(6);
    } else {
        hmd.poiskilled = true;
    }
}

// cf. uhitm.c:1519 — hmon_hitmon_jousting(hmd, mon, obj):
//   Jousting bonus damage with lance while riding.
//   In JS, riding/jousting is not yet implemented.
export function hmon_hitmon_jousting(hmd, mon, obj) {
    hmd.dmg += c_d(2, 10);
    hmd.hittxt = true;
}

// cf. uhitm.c:1548 — hmon_hitmon_stagger(hmd, mon, obj):
//   VERY small chance of stunning opponent if unarmed.
//   Consumes rnd(100) for RNG parity.
export function hmon_hitmon_stagger(hmd, mon, obj) {
    // C: if (rnd(100) < P_SKILL(P_BARE_HANDED_COMBAT) && !bigmonst && !thick_skinned)
    // In JS, skill levels not tracked, so just consume the RNG
    rnd(100);
}

// cf. uhitm.c:1566 — hmon_hitmon_pet(hmd, mon, obj):
//   Adjust behavior when hitting a pet.
export async function hmon_hitmon_pet(hmd, mon, obj, display = null) {
    // Some loader/runtime paths only preserve boolean tame; C uses mtame>0.
    const tameLike = !!(Number(mon.mtame || 0) > 0 || mon.tame);
    if (tameLike && hmd.dmg > 0) {
        if (!Number(mon.mtame)) mon.mtame = 10;
        // C ref: uhitm.c hmon_hitmon_pet() calls abuse_dog(), which handles
        // tameness reduction and pet vocalization RNG/message behavior.
        await abuse_dog_like_c(mon, display);
        // C: monflee if still tame and not destroyed
        if (Number(mon.mtame || 0) > 0 && !hmd.destroyed) {
            applyMonflee(mon, 10 * rnd(hmd.dmg), false);
        }
    }
}

// cf. uhitm.c:1582 — hmon_hitmon_splitmon(hmd, mon, obj):
//   Handle pudding splitting on hit with iron/metal weapon.
//   In JS, clone_mon is not yet implemented. Stub: no splitting.
export function hmon_hitmon_splitmon(hmd, mon, obj) {
    // C: black/brown pudding splits when hit with iron weapon
    // Requires clone_mon() which is not yet available in JS.
}

// cf. uhitm.c:1615 — hmon_hitmon_msg_hit(hmd, mon, obj):
//   Generate "You hit the <monster>" message.
export async function hmon_hitmon_msg_hit(hmd, mon, obj, display) {
    if (!hmd.hittxt && !hmd.destroyed) {
        const name = x_monnam(mon);
        await display.putstr_message(`You hit the ${name}${exclam(hmd.dmg)}`);
    }
}

// cf. uhitm.c:1641 — hmon_hitmon_msg_silver(hmd, mon, obj):
//   "The silver sears <monster>!" message.
async function hmon_hitmon_msg_silver(hmd, mon, obj, display) {
    const name = x_monnam(mon);
    const ptr = mon.data || mon.type || {};
    let whom = name;
    if (!noncorporeal(ptr) && !amorphous(ptr)) {
        whom = `${name}'s flesh`;
    }
    if (hmd.silverobj && obj) {
        const oname = xname(obj);
        await display.putstr_message(`Your ${oname} sears ${whom}!`);
    } else if (hmd.barehand_silver_rings > 0) {
        await display.putstr_message(`Your silver ring sears ${whom}!`);
    } else {
        await display.putstr_message(`The silver sears ${whom}!`);
    }
}

// cf. uhitm.c:1680 — hmon_hitmon_msg_lightobj(hmd, mon, obj):
//   Light-source weapon message (burning undead, etc).
async function hmon_hitmon_msg_lightobj(hmd, mon, obj, display) {
    const name = x_monnam(mon);
    const ptr = mon.data || mon.type || {};
    let whom = name;
    if (!noncorporeal(ptr) && !amorphous(ptr)) {
        whom = `${name}'s flesh`;
    }
    await display.putstr_message(`The light sears ${whom}!`);
}

// cf. uhitm.c:1732 — hmon_hitmon(mon, obj, thrown, dieroll):
//   Core hit-monster dispatcher.
//   Returns true if monster survives, false if dead.
async function hmon_hitmon(player, mon, obj, thrown, dieroll, display, map) {
    const hmd = {
        player,
        dmg: 0,
        thrown: thrown,
        twohits: 0,
        dieroll: dieroll,
        mdat: mon.data || mon.type || {},
        use_weapon_skill: false,
        train_weapon_skill: false,
        barehand_silver_rings: 0,
        silvermsg: false,
        silverobj: false,
        lightobj: false,
        jousting: 0,
        hittxt: false,
        get_dmg_bonus: true,
        unarmed: !player.weapon && !player.armor && !player.shield,
        hand_to_hand: (thrown === HMON_MELEE),
        ispoisoned: false,
        unpoisonmsg: false,
        needpoismsg: false,
        poiskilled: false,
        already_killed: false,
        offmap: false,
        destroyed: false,
        dryit: false,
        doreturn: false,
        retval: false,
        saved_oname: '',
    };

    // Phase 1: compute base damage
    await hmon_hitmon_do_hit(hmd, mon, obj, player, display);
    if (hmd.doreturn) return hmd.retval;

    // Phase 2: add bonuses
    if (hmd.dmg > 0) {
        hmon_hitmon_dmg_recalc(hmd, obj, player);
    }

    // Phase 3: poison
    if (hmd.ispoisoned && obj) {
        hmon_hitmon_poison(hmd, mon, obj);
    }

    // Phase 4: minimum damage / shade handling
    if (hmd.dmg < 1) {
        const monIsShade = (mon.mndx ?? -1) === PM_SHADE;
        hmd.dmg = (hmd.get_dmg_bonus && !monIsShade) ? 1 : 0;
    }

    // Phase 5: jousting / stagger / knockback
    if (hmd.jousting) {
        hmon_hitmon_jousting(hmd, mon, obj);
    } else if (hmd.unarmed && hmd.dmg > 1 && !thrown) {
        hmon_hitmon_stagger(hmd, mon, obj);
    }
    // knockback for armed melee is handled in hmon

    // Phase 6: apply damage
    if (!hmd.already_killed) {
        // Artifact damage bonus
        if (obj && obj.oartifact && !usesRangedMeleeDamage(obj)) {
            const [bonus] = spec_dbon(obj, mon, hmd.dmg);
            hmd.dmg += bonus;
        }
        mon.mhp -= hmd.dmg;
    }
    if (mon.mhp > (mon.mhpmax || mon.mhp))
        mon.mhp = mon.mhpmax || mon.mhp;

    if (mon.mhp <= 0) hmd.destroyed = true;

    // Phase 7: pet handling
    await hmon_hitmon_pet(hmd, mon, obj, display);

    // Phase 8: pudding splitting
    hmon_hitmon_splitmon(hmd, mon, obj);

    // Phase 9: messages
    if (display) {
        await hmon_hitmon_msg_hit(hmd, mon, obj, display);
        if (hmd.silvermsg) await hmon_hitmon_msg_silver(hmd, mon, obj, display);
        if (hmd.lightobj) await hmon_hitmon_msg_lightobj(hmd, mon, obj, display);
    }

    // Phase 10: poison kill / normal kill
    if (hmd.poiskilled) {
        if (!hmd.already_killed && mon.mhp > 0) {
            mon.mhp = 0;
        }
        hmd.destroyed = true;
    }
    if (hmd.destroyed && !hmd.already_killed) {
        // Kill handled by caller (hmon)
    }

    // Phase 11: confusion touch
    // cf. uhitm.c:1889-1896 — umconf hand-glow confusion touch
    if (!hmd.destroyed && player.umconf && hmd.hand_to_hand) {
        nohandglow(mon, player);
        if (!mon.mconf && !resist(mon, SPBOOK_CLASS)) {
            mon.mconf = 1;
            if (!mon.mstun && display && canspotmon(mon)) {
                await pline("%s appears confused.", Monnam(mon));
            }
        }
    }

    return hmd.destroyed ? false : true;
}


// ============================================================================
// 4. Special hit mechanics
// ============================================================================

// cf. uhitm.c:1920 — mhurtle_to_doom(mon, tmp, mptr):
//   Joust or martial arts knockback that might kill 'mon' via trap.
//   Only hurtles if pending damage won't already kill mon.
//   Returns true if mon dies from the hurtle.
function mhurtle_to_doom(mon, tmp, mptr) {
    // C: if (tmp < mon->mhp) mhurtle(mon, u.dx, u.dy, 1);
    // In JS, mhurtle (movement into traps) is not yet ported.
    // Stub: no hurtle, mon doesn't die from it.
    return false;
}

// cf. uhitm.c:1941 — first_weapon_hit(weapon):
//   Gamelog message for breaking never-hit-with-wielded-weapon conduct.
//   In JS, conducts and livelog are not tracked. Stub: no-op.
export function first_weapon_hit(weapon) {
    // C: livelog_printf(LL_CONDUCT, "hit with a wielded weapon (%s) for the first time", buf);
}

// cf. uhitm.c:1970 — shade_aware(obj):
//   Check if object can affect a shade (silver, blessed, artifact).
//   Objects in this list either affect shades or are handled specially.
// Autotranslated from uhitm.c:1970
export function shade_aware(obj) {
    if (!obj) return false;
    if (obj.otyp === BOULDER
        || obj.otyp === HEAVY_IRON_BALL
        || obj.otyp === IRON_CHAIN
        || obj.otyp === MIRROR
        || obj.otyp === CLOVE_OF_GARLIC)
        return true;
    const material = objectData[obj.otyp]?.oc_material;
    if (material === SILVER) return true;
    return false;
}

// cf. uhitm.c:1994 — shade_miss(magr, mdef, obj, thrown, verbose):
//   Miss message when attacking shade with non-effective weapon.
//   Returns true if the attack passes harmlessly through the shade.
export function shade_miss(magr, mdef, obj, thrown, verbose) {
    // Check if mdef is a shade and obj can't damage it
    if ((mdef.mndx ?? -1) !== PM_SHADE) return false;
    if (obj && dmgval(obj, mdef)) return false;

    if (verbose) {
        const what = (!obj || shade_aware(obj)) ? 'attack' : xname(obj);
        const target = x_monnam(mdef);
        if (!thrown) {
            // "Your <what> passes harmlessly through <target>."
        } else {
            // "The <what> passes harmlessly through <target>."
        }
    }
    return true;
}

// cf. uhitm.c:2034 — m_slips_free(mdef, mattk):
//   Check if slippery clothing (greased/oilskin) protects from grab/wrap.
//   In JS, greased armor is not fully modeled. Stub: always returns false.
export function m_slips_free(mdef, mattk) {
    return false;
}

// cf. uhitm.c:2076 — joust(mon, obj):
//   Jousting check: lance + riding + skill = bonus damage or lance break.
//   Returns: 1 = successful joust, 0 = no joust, -1 = joust but lance breaks.
//   In JS, riding/jousting is not yet implemented. Always returns 0.
function joust(mon, obj) {
    // C: requires mounted (u.usteed), lance weapon, not fumbling/stunned
    return 0;
}

// cf. uhitm.c:2111 — demonpet():
//   Demon summoning when hero is a demon and attacks.
//   Summons a demon pet. In JS, demon summoning is not yet ported.
function demonpet() {
    // C: pline("Some hell-p has arrived!"); makemon(demon, u.ux, u.uy); tamedog()
    // Stub: no demon summoning
}

// cf. uhitm.c:2126 — theft_petrifies(otmp):
//   Check if stealing a corpse would petrify the thief.
//   Returns true if the theft would cause petrification.
export function theft_petrifies(otmp) {
    // C: checks uarmg, corpse type, touch_petrifies, Stone_resistance
    // Simplified: always safe (petrification system not fully ported)
    return false;
}

// cf. uhitm.c:2152 — steal_it(mdef, mattk):
//   Hero steal-attack (nymph polymorph form, etc).
//   Takes items from monster's inventory.
//   In JS, polymorphed hero attacks are not yet fully supported.
function steal_it(mdef, mattk) {
    // C: iterates mdef->minvent, extracts items to hero inventory
    // Stub: no stealing
}


// ============================================================================
// 5. Damage-type handlers (mhitm_ad_*)
// ============================================================================
// These handlers implement the m-vs-m (monster-vs-monster) combat path.
// Each takes (magr, mattk, mdef, mhm) where mhm is:
//   { damage, hitflags, done, permdmg, specialdmg, dieroll }
// The uhitm (u-vs-m) and mhitu (m-vs-u) paths remain in hmon()
// and mattacku() respectively.

// cf. uhitm.c:3959 — physical damage handler
// m-vs-m branch: uhitm.c:4106-4177
export function mhitm_ad_phys(magr, mattk, mdef, mhm) {
    const pd = mdef.data || mdef.type || {};
    if (mattk.aatyp === AT_KICK && thick_skinned(pd)) {
        mhm.damage = 0;
    }
    // C ref: uhitm.c:4065 — exercise A_STR when being crushed (AT_HUGS)
    if (mdef.attributes && mattk.aatyp === AT_HUGS && mhm.damage > 0) {
        exercise(mdef, A_STR, false);
    }
}

// cf. uhitm.c:2499 — fire damage handler
// m-vs-m branch: uhitm.c:2565-2600
export function mhitm_ad_fire(magr, mattk, mdef, mhm) {
    if (mhitm_mgc_atk_negated(magr, mdef)) {
        mhm.damage = 0;
        return;
    }
    if (resists_fire(mdef)) {
        mhm.damage = 0;
    }
    // C ref: uhitm.c:2598 — mhitm path calls destroy_items unconditionally
    const orig_dmg = mhm.damage;
    mhm.damage += destroy_items_rng_only(mdef, AD_FIRE, orig_dmg, null);
}

// cf. uhitm.c:2604 — cold damage handler
// m-vs-m branch: uhitm.c:2642-2658
export function mhitm_ad_cold(magr, mattk, mdef, mhm) {
    if (mhitm_mgc_atk_negated(magr, mdef)) {
        mhm.damage = 0;
        return;
    }
    if (resists_cold(mdef)) {
        mhm.damage = 0;
    }
    // C ref: uhitm.c:2657 — mhitm path calls destroy_items unconditionally
    const orig_dmg = mhm.damage;
    mhm.damage += destroy_items_rng_only(mdef, AD_COLD, orig_dmg, null);
}

// cf. uhitm.c:2662 — electric damage handler
// m-vs-m branch: uhitm.c:2698-2716
export function mhitm_ad_elec(magr, mattk, mdef, mhm) {
    if (mhitm_mgc_atk_negated(magr, mdef)) {
        mhm.damage = 0;
        return;
    }
    if (resists_elec(mdef)) {
        mhm.damage = 0;
    }
    // C ref: uhitm.c:2715 — mhitm path calls destroy_items unconditionally
    const orig_dmg = mhm.damage;
    mhm.damage += destroy_items_rng_only(mdef, AD_ELEC, orig_dmg, null);
}

// cf. uhitm.c:2720 — acid damage handler
// m-vs-m branch: uhitm.c:2744-2763
export function mhitm_ad_acid(magr, mattk, mdef, mhm) {
    if (magr.mcan) {
        mhm.damage = 0;
        return;
    }
    if (resists_acid(mdef)) {
        mhm.damage = 0;
    }
    // C ref: !rn2(30) erode_armor, !rn2(6) acid_damage — omitted (no armor system)
    rn2(30);
    rn2(6);
    // C ref: uhitm.c:2757 — exercise A_STR after acid damage (mhitu path)
    if (mdef.attributes && mhm.damage > 0) {
        exercise(mdef, A_STR, false);
    }
}

// cf. uhitm.c:3082 — apply actual poison effects (m-vs-m)
function mhitm_really_poison(magr, mattk, mdef, mhm) {
    if (resists_poison(mdef)) {
        // C ref: if resists, "unaffected" — no damage
        mhm.damage = 0;
        return;
    }
    // C ref: mhitm.c:3094 — m_lev > 0 ? lose a level : take 2d6 damage
    if ((mdef.m_lev || 0) > 0) {
        const mlev = mdef.m_lev || 0;
        mhm.damage = c_d(2, 6);
        if (mdef.mhpmax > (mlev + 1)) {
            mdef.mhpmax -= mhm.damage;
            if (mdef.mhpmax < (mlev + 1)) mdef.mhpmax = mlev + 1;
        }
    } else {
        mhm.damage = mdef.mhp;
    }
}

// cf. uhitm.c:3100 — poison (AD_DRST/AD_DRDX/AD_DRCO) handler
// m-vs-m branch: uhitm.c:3137-3142
export function mhitm_ad_drst(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    if (!negated && !rn2(8)) {
        mhitm_really_poison(magr, mattk, mdef, mhm);
    }
}

// cf. uhitm.c:4366 — stun handler
// m-vs-m branch: uhitm.c:4388-4399
export function mhitm_ad_stun(magr, mattk, mdef, mhm) {
    if (magr.mcan) return;
    mdef.mstun = 1;
    mhitm_ad_phys(magr, mattk, mdef, mhm);
}

// cf. uhitm.c:3668 — confusion handler
// m-vs-m branch: uhitm.c:3691-3703
export function mhitm_ad_conf(magr, mattk, mdef, mhm) {
    if (!magr.mcan && !mdef.mconf && !magr.mspec_used) {
        mdef.mconf = 1;
    }
}

// cf. uhitm.c:2936 — blinding handler
// m-vs-m branch: uhitm.c:2964-2989
export function mhitm_ad_blnd(magr, mattk, mdef, mhm) {
    // C ref: can_blnd check omitted for simplicity; uses damage dice for duration
    let rnd_tmp = c_d(mattk.damn || 0, mattk.damd || 0);
    rnd_tmp += (mdef.mblinded || 0);
    if (rnd_tmp > 127) rnd_tmp = 127;
    mdef.mblinded = rnd_tmp;
    mdef.mcansee = 0;
    if (mhm) mhm.damage = 0;
}

// cf. uhitm.c:3457 — sleep handler
// m-vs-m branch: uhitm.c:3486-3500
// C: if (!mdef->msleeping && sleep_monst(mdef, rnd(10), -1)
//        && sleep_monst(mdef, rnd(10), -1))
// rnd(10) is consumed as argument before sleep_monst checks resists_sleep
export function mhitm_ad_slee(magr, mattk, mdef, mhm) {
    if (!mdef.msleeping) {
        const amt = rnd(10); // C: argument to first sleep_monst
        if (!resists_sleep(mdef) && mdef.mcanmove !== false) {
            mdef.mcanmove = false;
            mdef.mfrozen = Math.min((mdef.mfrozen || 0) + amt, 127);
            rnd(10); // C: argument to second sleep_monst (consumed, result unused)
        }
    }
}

// cf. uhitm.c:3409 — paralysis handler
// m-vs-m branch: uhitm.c:3441-3453
export function mhitm_ad_plys(magr, mattk, mdef, mhm) {
    if (mdef.mcanmove !== false && !rn2(3)
        && !mhitm_mgc_atk_negated(magr, mdef)) {
        const amt = rnd(10);
        mdef.mcanmove = false;
        mdef.mfrozen = Math.min(amt, 127);
        // C ref: uhitm.c:3454 — exercise A_DEX after paralysis (mhitu path)
        if (mdef.attributes) {
            exercise(mdef, A_DEX, false);
        }
    }
}

// cf. uhitm.c:3284 — sticking handler
// m-vs-m branch: uhitm.c:3307-3311
export function mhitm_ad_stck(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    if (negated) mhm.damage = 0;
}

// cf. uhitm.c:3315 — wrap handler
// m-vs-m branch: uhitm.c:3396-3406
export function mhitm_ad_wrap(magr, mattk, mdef, mhm) {
    if (magr.mcan) mhm.damage = 0;
}

// cf. uhitm.c:2423 — level drain handler
// m-vs-m branch: uhitm.c:2467-2495
export function mhitm_ad_drli(magr, mattk, mdef, mhm) {
    if (!rn2(3) && !resists_drli(mdef)
        && !mhitm_mgc_atk_negated(magr, mdef)) {
        mhm.damage = c_d(2, 6);
        const mlev = mdef.m_lev || 0;
        if (mdef.mhpmax - mhm.damage > mlev) {
            mdef.mhpmax -= mhm.damage;
        } else if (mdef.mhpmax > mlev) {
            mdef.mhpmax = mlev + 1;
        }
        if (mlev === 0) {
            mhm.damage = mdef.mhp;
        } else {
            if (mdef.m_lev !== undefined) mdef.m_lev--;
        }
    }
}

// cf. uhitm.c:3630 — slow handler
// m-vs-m branch: uhitm.c:3654-3664
export function mhitm_ad_slow(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    if (!negated) {
        mdef.mslow = 1;
    }
}

// cf. uhitm.c:2396 — energy drain handler
// m-vs-m branch: uhitm.c:2413-2418
export function mhitm_ad_dren(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    // C: xdrainenergym gated by !rn2(4) — 25% chance
    if (!negated && !rn2(4)) {
        // C ref: xdrainenergym — increases mspec_used if monster has magic/breath
        const mdat = mdef.data || mdef.type || {};
        if ((mdef.mspec_used || 0) < 20
            && (attacktype(mdat, AT_MAGC) || attacktype(mdat, AT_BREA))) {
            mdef.mspec_used = (mdef.mspec_used || 0) + c_d(2, 2);
        }
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3146 — brain drain (mind flayer)
// m-vs-m: uhitm.c:3241-3280
export function mhitm_ad_drin(magr, mattk, mdef, mhm) {
    const pd = mdef.data || mdef.type || {};
    if (!pd.mflags1 || (pd.mflags1 & M1_NOHEAD)) {
        // Can't drain brain from headless monster
        mhm.damage = 0;
        return;
    }
    // C ref: intelligence drain — reduces m_lev and mhpmax
    const mlev = mdef.m_lev || 0;
    if (mlev > 0) {
        if (mdef.m_lev !== undefined) mdef.m_lev--;
        mhm.damage = c_d(2, 6);
        if (mdef.mhpmax > (mlev + 1)) {
            mdef.mhpmax -= mhm.damage;
            if (mdef.mhpmax < (mlev)) mdef.mhpmax = mlev;
        }
    } else {
        mhm.damage = mdef.mhp;
    }
}

// --- Remaining AD_* handlers: simplified stubs for rare/complex effects ---

// cf. uhitm.c:2259 — rust handler (m-vs-m)
export async function mhitm_ad_rust(magr, mattk, mdef, mhm) {
    const pd = mdef?.data || mdef?.type || {};
    if (magr?.mcan) return;
    if (completelyrusts(pd)) {
        await monkilled(mdef, null, AD_RUST);
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
        mhm.hitflags = M_ATTK_DEF_DIED;
        mhm.done = true;
        return;
    }
    erode_armor(mdef, ERODE_RUST);
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    mhm.damage = 0;
}

// cf. uhitm.c:2316 — corrosion handler (m-vs-m)
export function mhitm_ad_corr(magr, mattk, mdef, mhm) {
    if (magr?.mcan) return;
    erode_armor(mdef, ERODE_CORRODE);
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    mhm.damage = 0;
}

// cf. uhitm.c:2341 — decay handler (m-vs-m)
export async function mhitm_ad_dcay(magr, mattk, mdef, mhm) {
    const pd = mdef?.data || mdef?.type || {};
    if (magr?.mcan) return;
    if (completelyrots(pd)) {
        await monkilled(mdef, null, AD_DCAY);
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
        mhm.hitflags = M_ATTK_DEF_DIED;
        mhm.done = true;
        return;
    }
    erode_armor(mdef, ERODE_ROT);
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    mhm.damage = 0;
}

// cf. uhitm.c:2768 — steal gold (m-vs-m: no effect)
export function mhitm_ad_sgld(magr, mattk, mdef, mhm) {
    mhm.damage = 0;
    if (!magr || !mdef || magr.mcan) return;
    const gold = findgold(mdef.minvent || []);
    if (!gold) return;
    extract_from_minvent(mdef, gold, false, true);
    addToMonsterInventory(magr, gold);
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    if (!tele_restrict(magr, null)) {
        mhm.hitflags = M_ATTK_AGR_DONE;
    }
}

// cf. uhitm.c:2837 — teleport
export function mhitm_ad_tlpt(magr, mattk, mdef, mhm) {
    // m-vs-m: keep base damage semantics; relocation remains async and is
    // handled in other call paths.
    if (!magr || !mdef) return;
    if (magr.mcan) return;
    if (Number(mhm.damage || 0) >= Number(mdef.mhp || 0)) return;
    if (tele_restrict(mdef, null)) return;
    if (mhitm_mgc_atk_negated(magr, mdef)) return;
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
}

// Async mhitm path for C-faithful relocation when map/runtime context is present.
export async function mhitm_ad_tlpt_async(magr, mattk, mdef, mhm, ctx = {}) {
    if (!magr || !mdef) return;
    if (magr.mcan) return;
    if (Number(mhm.damage || 0) >= Number(mdef.mhp || 0)) return;
    if (tele_restrict(mdef, ctx.map || null)) return;
    if (mhitm_mgc_atk_negated(magr, mdef)) return;
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    if (ctx.map) {
        await rloc(mdef, RLOC_NOMSG, ctx.map, ctx.player || null, ctx.display || null, ctx.fov || null);
    }
}

// cf. uhitm.c:2993 — curse items
export function mhitm_ad_curs(magr, mattk, mdef, mhm) {
    const pa = magr?.data || magr?.type || {};
    const pd = mdef?.data || mdef?.type || {};
    if (!night() && pa === mons[PM_GREMLIN]) return;
    if (!magr?.mcan && !rn2(10)) {
        mdef.mcan = 1;
        if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
        // Full were_change transform path is modeled elsewhere.
        if (is_were(pd) && pd.mlet !== S_HUMAN) {
            mdef.mcan = 1;
        }
        if (pd === mons[PM_CLAY_GOLEM]) {
            mondied(mdef);
            if (!DEADMONSTER(mdef)) {
                mhm.hitflags = M_ATTK_MISS;
            } else {
                mhm.hitflags |= M_ATTK_DEF_DIED;
            }
            mhm.done = true;
        }
    }
}

// cf. uhitm.c:3504 — slime
export function mhitm_ad_slim(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    const pd = mdef?.data || mdef?.type || {};
    if (negated) return; // physical damage only
    if (!rn2(4) && !slimeproof(pd)) {
        // Full munslime/newcham pipeline is not yet wired on this path.
        mhm.damage = 0;
        mhm.hitflags |= M_ATTK_HIT;
        if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    }
}

// Async mhitm path for C-faithful munslime/newcham branching when runtime
// context is available.
export async function mhitm_ad_slim_async(magr, mattk, mdef, mhm, ctx = {}) {
    const negated = mhitm_mgc_atk_negated(magr, mdef);
    const pd = mdef?.data || mdef?.type || {};
    if (negated) return; // physical damage only
    if (rn2(4) || slimeproof(pd)) return;

    const unslimed = await munslime(mdef, false, ctx.map || null, ctx.player || null);
    if (!unslimed && !DEADMONSTER(mdef)) {
        const transformed = runtimeApplyNewchamDirect(
            mdef,
            PM_GREEN_SLIME,
            ctx.depth || 1,
            ctx.map || null,
            ctx.player || null,
            ctx.fov || null,
            ctx.display || null,
            !!(ctx.display && ctx.map)
        );
        if (transformed) {
            if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
            mhm.hitflags |= M_ATTK_HIT;
        }
    }
    if (DEADMONSTER(mdef)) {
        mhm.hitflags = M_ATTK_DEF_DIED;
        mhm.done = true;
        return;
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3581 — enchantment drain
export function mhitm_ad_ench(magr, mattk, mdef, mhm) {
    // m-vs-m branch: no special effect, preserve normal damage.
}

// cf. uhitm.c:3707 — polymorph
export function mhitm_ad_poly(magr, mattk, mdef, mhm) {
    const negated = mhitm_mgc_atk_negated(magr, mdef) || !!magr?.mspec_used;
    if (Number(mhm.damage || 0) < Number(mdef?.mhp || 0) && !negated) {
        // Approximate C mon_poly cooldown/hit termination while full
        // newcham selection remains elsewhere.
        magr.mspec_used = Number(magr.mspec_used || 0) + rnd(2);
        mhm.hitflags |= M_ATTK_HIT;
        if (DEADMONSTER(mdef)) mhm.hitflags |= M_ATTK_DEF_DIED;
        mhm.done = true;
    }
}

// cf. uhitm.c:4181 — stoning
export async function mhitm_ad_ston(magr, mattk, mdef, mhm) {
    if (magr?.mcan) return;
    const pd = mdef?.data || mdef?.type || {};

    // C do_stone_mon() path:
    // - polymorph-when-stoned target: convert form, no direct damage
    // - non-resistant target: petrification attempt (can kill target)
    // - resistant target: AD_STON sets damage=0
    if (poly_when_stoned(pd)) {
        mhm.damage = 0;
        mhm.hitflags |= M_ATTK_HIT;
        return;
    }

    if (!resists_ston(mdef)) {
        await monkilled(mdef, null, AD_STON);
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
        mhm.hitflags |= M_ATTK_DEF_DIED;
        mhm.done = true;
        return;
    }

    mhm.damage = 0;
}

// cf. uhitm.c:4243 — lycanthropy (m-vs-m: no effect)
export function mhitm_ad_were(magr, mattk, mdef, mhm) {
    // C routes m-vs-m AD_WERE through physical damage handling.
    mhitm_ad_phys(magr, mattk, mdef, mhm);
    // C ref: uhitm.c:4270 — exercise A_CON after lycanthropy infection (mhitu path)
    if (mdef.attributes && mhm.damage > 0) {
        exercise(mdef, A_CON, false);
    }
}

// cf. uhitm.c:4274 — nurse healing (m-vs-m: heals defender)
export function mhitm_ad_heal(magr, mattk, mdef, mhm) {
    mdef.mhp = Math.min((mdef.mhp || 0) + mhm.damage, mdef.mhpmax || mdef.mhp);
    mhm.damage = 0;
}

// cf. uhitm.c:4403 — leg wound (m-vs-m: physical damage)
export function mhitm_ad_legs(magr, mattk, mdef, mhm) {
    mhitm_ad_phys(magr, mattk, mdef, mhm);
}

// cf. uhitm.c:4470 — digestion (engulf)
export function mhitm_ad_dgst(magr, mattk, mdef, mhm) {
    const pd = mdef?.data || mdef?.type || {};
    if (is_rider(pd)) {
        // C: digesting a Rider is fatal to the aggressor.
        mondied(magr);
        if (DEADMONSTER(magr)) {
            mhm.hitflags = M_ATTK_AGR_DIED;
        } else {
            mhm.hitflags = M_ATTK_MISS;
        }
        mhm.done = true;
        return;
    }
    // C m-vs-m digestion swallows defender whole.
    mhm.damage = Number(mdef?.mhp || mhm.damage || 0);
}

// cf. uhitm.c:4548 — steal amulet (m-vs-m: no effect)
export function mhitm_ad_samu(magr, mattk, mdef, mhm) { mhm.damage = 0; }

// cf. uhitm.c:4571 — disease (m-vs-m: no effect)
export function mhitm_ad_dise(magr, mattk, mdef, mhm) {
    // C m-vs-m: fungi/ghouls and disease-defended targets are unaffected;
    // otherwise, disease does ordinary attack damage.
    const pd = mdef?.data || mdef?.type || {};
    const mndx = Number.isInteger(mdef?.mndx) ? mdef.mndx : -1;
    if (pd.mlet === S_FUNGUS || mndx === PM_GHOUL || defended(mdef, AD_DISE)) {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:4601 — seduction (m-vs-m: no effect)
export function mhitm_ad_sedu(magr, mattk, mdef, mhm) {
    mhm.damage = 0;
    if (!magr || !mdef || magr.mcan) return;
    const inv = Array.isArray(mdef.minvent) ? mdef.minvent : [];
    if (!inv.length) return;
    // C: tame stealers avoid cursed items when possible.
    let obj = null;
    for (const it of inv) {
        if (!magr.mtame || !it?.cursed) {
            obj = it;
            break;
        }
    }
    if (!obj) return;
    extract_from_minvent(mdef, obj, true, false);
    addToMonsterInventory(magr, obj);
    possibly_unwield(mdef, false);
    if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    mselftouch(mdef, null, false);
    if (DEADMONSTER(mdef)) {
        mhm.hitflags |= M_ATTK_DEF_DIED;
        mhm.done = true;
        return;
    }
    // C: nymphs may teleport away after a successful theft.
    if ((magr.data?.mlet || magr.type?.mlet) === S_NYMPH
        && !tele_restrict(magr, null)) {
        mhm.hitflags |= M_ATTK_AGR_DONE;
    }
}

// cf. uhitm.c:4729 — succubus seduction (m-vs-m: no effect)
export function mhitm_ad_ssex(magr, mattk, mdef, mhm) { mhm.damage = 0; }

// cf. uhitm.c:3815 — death touch (Rider attack)
export function mhitm_ad_deth(magr, mattk, mdef, mhm) {
    // C ref: redirects to mhitm_ad_drli for m-vs-m
    mhitm_ad_drli(magr, mattk, mdef, mhm);
}

// cf. uhitm.c:3786 — pestilence (Rider attack)
export function mhitm_ad_pest(magr, mattk, mdef, mhm) {
    // C routes Pestilence m-vs-m handling through AD_DISE logic.
    const alt = { ...(mattk || {}), adtyp: AD_DISE };
    mhitm_ad_dise(magr, alt, mdef, mhm);
}

// cf. uhitm.c:3755 — famine (Rider attack)
export function mhitm_ad_famn(magr, mattk, mdef, mhm) {
    const pd = mdef?.data || mdef?.type || {};
    if (!(carnivorous(pd) || herbivorous(pd) || is_metallivore(pd))) {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:3875 — hallucination
export function mhitm_ad_halu(magr, mattk, mdef, mhm) {
    const pd = mdef?.data || mdef?.type || {};
    if (!magr?.mcan && haseyes(pd) && mdef?.mcansee) {
        mdef.mconf = 1;
        if (mdef.mstrategy != null) mdef.mstrategy &= ~STRAT_WAITFORU;
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3902 — do_stone_u: hero touched by petrifying monster
export async function do_stone_u(mtmp, player, game) {
    // STONED imported from const.js
    if (player.getPropTimeout?.(STONED)) return 0; // already Stoned
    // Stone_resistance check
    if (resists_ston({ data: game?.youmonst?.data || player.monst })) return 0;
    // poly_when_stoned + polymon check
    if (poly_when_stoned(game?.youmonst?.data || player.monst)) {
        // Would call polymon(PM_STONE_GOLEM) here; for now treat as resistant
        return 0;
    }
    // Apply petrification
    await make_stoned(player, 5, null);
    return 1;
}

// cf. uhitm.c:3923 — do_stone_mon: monster hit by petrifying attack
export async function do_stone_mon(magr, mattk, mdef, mhm, game) {
    const pd = mdef.data;

    // munstone: monster may eat acid/lizard corpse to cure
    if (await munstone(mdef, false)) {
        // may die from acid; check if still alive
        if (!DEADMONSTER(mdef)) {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
        }
        return;
    }
    if (poly_when_stoned(pd)) {
        await mon_to_stone(mdef);
        mhm.damage = 0;
        return;
    }
    if (!resists_ston(mdef)) {
        await pline("%s turns to stone!", Monnam(mdef));
        // monstone(mdef) — full statue creation; fallback to mondead
        mdef.mhp = 0;
        await mondead(mdef, game);
        if (DEADMONSTER(mdef)) {
            if (mdef.mtame) {
                // "You have a peculiarly sad feeling."
            }
            const grewUp = await grow_up(magr, mdef, game);
            mhm.hitflags = M_ATTK_DEF_DIED | (grewUp ? 0 : M_ATTK_AGR_DIED);
            mhm.done = true;
            return;
        } else {
            mhm.hitflags = M_ATTK_MISS;
            mhm.done = true;
            return;
        }
    }
    mhm.damage = (mattk.adtyp === AD_STON ? 0 : 1);
}

// ============================================================================
// 5b. Central AD_* dispatcher
// ============================================================================

// cf. uhitm.c:4760 — mhitm_adtyping(magr, mattk, mdef, mhm):
//   Dispatch to specific mhitm_ad_* handler based on attack damage type.
//   mattk.adtyp is the JS equivalent of mattk->adtyp.
export async function mhitm_adtyping(magr, mattk, mdef, mhm) {
    switch (mattk.adtyp) {
    case AD_PHYS: mhitm_ad_phys(magr, mattk, mdef, mhm); break;
    case AD_FIRE: mhitm_ad_fire(magr, mattk, mdef, mhm); break;
    case AD_COLD: mhitm_ad_cold(magr, mattk, mdef, mhm); break;
    case AD_ELEC: mhitm_ad_elec(magr, mattk, mdef, mhm); break;
    case AD_ACID: mhitm_ad_acid(magr, mattk, mdef, mhm); break;
    case AD_STUN: mhitm_ad_stun(magr, mattk, mdef, mhm); break;
    case AD_LEGS: mhitm_ad_legs(magr, mattk, mdef, mhm); break;
    case AD_WERE: mhitm_ad_were(magr, mattk, mdef, mhm); break;
    case AD_HEAL: mhitm_ad_heal(magr, mattk, mdef, mhm); break;
    case AD_SGLD: mhitm_ad_sgld(magr, mattk, mdef, mhm); break;
    case AD_TLPT: mhitm_ad_tlpt(magr, mattk, mdef, mhm); break;
    case AD_BLND: mhitm_ad_blnd(magr, mattk, mdef, mhm); break;
    case AD_CURS: mhitm_ad_curs(magr, mattk, mdef, mhm); break;
    case AD_DRLI: mhitm_ad_drli(magr, mattk, mdef, mhm); break;
    case AD_RUST: await mhitm_ad_rust(magr, mattk, mdef, mhm); break;
    case AD_CORR: mhitm_ad_corr(magr, mattk, mdef, mhm); break;
    case AD_DCAY: await mhitm_ad_dcay(magr, mattk, mdef, mhm); break;
    case AD_DREN: mhitm_ad_dren(magr, mattk, mdef, mhm); break;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO: mhitm_ad_drst(magr, mattk, mdef, mhm); break;
    case AD_DRIN: mhitm_ad_drin(magr, mattk, mdef, mhm); break;
    case AD_STCK: mhitm_ad_stck(magr, mattk, mdef, mhm); break;
    case AD_WRAP: mhitm_ad_wrap(magr, mattk, mdef, mhm); break;
    case AD_PLYS: mhitm_ad_plys(magr, mattk, mdef, mhm); break;
    case AD_SLEE: mhitm_ad_slee(magr, mattk, mdef, mhm); break;
    case AD_SLIM: mhitm_ad_slim(magr, mattk, mdef, mhm); break;
    case AD_ENCH: mhitm_ad_ench(magr, mattk, mdef, mhm); break;
    case AD_SLOW: mhitm_ad_slow(magr, mattk, mdef, mhm); break;
    case AD_CONF: mhitm_ad_conf(magr, mattk, mdef, mhm); break;
    case AD_POLY: mhitm_ad_poly(magr, mattk, mdef, mhm); break;
    case AD_DISE: mhitm_ad_dise(magr, mattk, mdef, mhm); break;
    case AD_SAMU: mhitm_ad_samu(magr, mattk, mdef, mhm); break;
    case AD_DETH: mhitm_ad_deth(magr, mattk, mdef, mhm); break;
    case AD_PEST: mhitm_ad_pest(magr, mattk, mdef, mhm); break;
    case AD_FAMN: mhitm_ad_famn(magr, mattk, mdef, mhm); break;
    case AD_DGST: mhitm_ad_dgst(magr, mattk, mdef, mhm); break;
    case AD_HALU: mhitm_ad_halu(magr, mattk, mdef, mhm); break;
    case AD_SSEX: mhitm_ad_ssex(magr, mattk, mdef, mhm); break;
    case AD_SEDU:
    case AD_SITM: mhitm_ad_sedu(magr, mattk, mdef, mhm); break;
    default:
        mhm.damage = 0;
        break;
    }
}

// Async dispatcher for mhitm runtime paths that need awaited AD_* behavior.
export async function mhitm_adtyping_async(magr, mattk, mdef, mhm, ctx = {}) {
    switch (mattk.adtyp) {
    case AD_TLPT:
        await mhitm_ad_tlpt_async(magr, mattk, mdef, mhm, ctx);
        return;
    case AD_SLIM:
        await mhitm_ad_slim_async(magr, mattk, mdef, mhm, ctx);
        return;
    default:
        await mhitm_adtyping(magr, mattk, mdef, mhm);
        return;
    }
}


// ============================================================================
// 6. Engulfment
// ============================================================================

// cf. uhitm.c:4813 — damageum(mdef, mattk, specialdmg):
//   Apply hero's attack damage to monster (used by polymorphed hero attacks).
//   Rolls d(mattk.damn, mattk.damd), dispatches through mhitm_adtyping.
//   Returns M_ATTK_DEF_DIED if monster dies, M_ATTK_HIT otherwise.
export async function damageum(mdef, mattk, specialdmg) {
    const mhm = {
        damage: c_d(mattk.damn || 0, mattk.damd || 0),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: specialdmg || 0,
        done: false,
    };

    // C: demon summoning check (1/13 chance, unarmed, demon form)
    // Not applicable in JS (hero polymorph not tracked)

    await mhitm_adtyping({ type: {}, mcan: false }, mattk, mdef, mhm);

    if (mhm.done) return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp <= 0) {
        return M_ATTK_DEF_DIED;
    }
    return M_ATTK_HIT;
}

// cf. uhitm.c:4869 — explum(mdef, mattk):
//   Exploding attack (hero polymorphed into exploding monster).
//   Returns M_ATTK_DEF_DIED or M_ATTK_HIT.
export function explum(mdef, mattk) {
    const tmp = c_d(mattk.damn || 0, mattk.damd || 0);
    // C: various cases (AD_BLND, AD_HALU, AD_COLD/FIRE/ELEC → explode())
    // Simplified: just apply damage for elemental types
    if (mdef) {
        mdef.mhp -= tmp;
        if (mdef.mhp <= 0) return M_ATTK_DEF_DIED;
    }
    return M_ATTK_HIT;
}

// cf. uhitm.c:4909 — start_engulf(mdef):
//   Start engulfing animation/state. Display-only in C.
async function start_engulf(mdef) {
    if (!mdef || !Number.isInteger(mdef.mx) || !Number.isInteger(mdef.my)) return;
    // C uses mon_to_glyph(&youmonst); JS keeps a stable hero marker here.
    tmp_at(DISP_ALWAYS, { ch: '@', color: 15 });
    tmp_at(mdef.mx, mdef.my);
    await nh_delay_output();
    await nh_delay_output();
}

// cf. uhitm.c:4927 — end_engulf():
//   End engulfing animation/state. Display-only in C.
export function end_engulf() {
    tmp_at(DISP_END, 0);
}

// cf. uhitm.c:4936 — gulpum(mdef, mattk):
//   Hero engulf attack (polymorphed into engulfer).
//   Very complex function involving digestion, enfolding, swallowing.
//   Returns M_ATTK_MISS or M_ATTK_DEF_DIED.
//   In JS, engulfment is not yet supported. Stub returns miss.
export async function gulpum(mdef, mattk) {
    if (mdef) {
        await start_engulf(mdef);
        end_engulf();
    }
    return M_ATTK_MISS;
}


// ============================================================================
// 7. Miss / defense / knockback
// ============================================================================

// cf. uhitm.c:5176 — missum(mdef, uattk, wouldhavehit):
//   Hero misses monster: print miss message.
//   'wouldhavehit' is true if monk missed only due to armor penalty.
export async function missum(mdef, uattk, wouldhavehit) {
    const display = arguments[3] || null;
    if (!display) return;
    if (wouldhavehit) {
        await display.putstr_message('Your armor is rather cumbersome...');
    }
    await display.putstr_message(`You miss ${y_monnam(mdef)}.`);
}

// Internal version of missum used by known_hitum
async function missum_internal(player, mon, uattk, wouldhavehit, display) {
    await missum(mon, uattk, wouldhavehit, display);
}

// cf. uhitm.c:5196 — m_is_steadfast(mtmp):
//   Check if monster resists knockback.
//   Returns true if monster can't be knocked back.
export function m_is_steadfast(mtmp) {
    // C: checks Flying/Levitation, Giantslayer artifact, loadstone
    // Simplified: check for flying/floating
    const ptr = mtmp.data || mtmp.type || {};
    if (ptr.mflags1 && (ptr.mflags1 & M1_FLY)) return false; // not steadfast if flying
    // loadstone check would require inventory search
    return false;
}

// cf. uhitm.c:5225 — mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used):
//   Knockback effect: push monster back on strong hit.
//   Returns true if knockback occurred.
//   Consumes rn2(3), rn2(chance), and possibly rn2(2)*2 for message.
export function mhitm_knockback(magr, mdef, mattk, hitflags, weapon_used) {
    const knockdistance = rn2(3) ? 1 : 2;
    const chance = 6;
    if (rn2(chance)) return false;

    // Only AD_PHYS with AT_CLAW/AT_KICK/AT_BUTT/AT_WEAP qualifies
    if (!mattk) return false;
    const adtyp = mattk.adtyp ?? AD_PHYS;
    const aatyp = mattk.aatyp ?? AT_WEAP;
    if (adtyp !== AD_PHYS) return false;
    if (aatyp !== AT_CLAW && aatyp !== AT_KICK && aatyp !== AT_BUTT && aatyp !== AT_WEAP)
        return false;

    // Attacker must be much larger than defender
    const agrSize = (magr.data || magr.type || {}).msize ?? MZ_HUMAN;
    const defSize = (mdef.data || mdef.type || {}).msize ?? MZ_HUMAN;
    if (!(agrSize > defSize + 1)) return false;

    // Unsolid attacker can't knock back
    const agrPtr = magr.data || magr.type || {};
    if (agrPtr.mflags1 && (agrPtr.mflags1 & M1_UNSOLID)) return false;

    // Generate message
    rn2(2); // "forceful" vs "powerful"
    rn2(2); // "blow" vs "strike"

    // cf. uhitm.c:5377-5390 — knockback effect + stun check
    // C: mhurtle(mdef,...) then if (!DEADMONSTER(mdef) && !rn2(4)) mdef->mstun=1
    // (Hero-as-defender path at line 5375: if (!Stunned && !rn2(4)) make_stunned())
    if (!rn2(4)) {
        if (mdef) mdef.mstun = 1;
    }

    return true;
}


// ============================================================================
// 8. Polymorphed hero attacks
// ============================================================================

// cf. uhitm.c:5402 — hmonas(mon):
//   Hero attacks as polymorphed monster (use monster attack list).
//   Very complex function: iterates monster's attack list, handles
//   AT_WEAP, AT_CLAW, AT_TUCH, AT_KICK, AT_BITE, AT_STNG, AT_BUTT,
//   AT_TENT, AT_HUGS, AT_EXPL, AT_ENGL, AT_MAGC attacks.
//   In JS, polymorph attacks are not yet supported. Returns true (mon survives).
export function hmonas(player, mon, display, map) {
    // Full implementation would iterate the hero's polymorphed form attack list
    // and dispatch each attack type. For now, delegate to normal melee.
    return true;
}


// ============================================================================
// 9. Passive defense
// ============================================================================

// cf. uhitm.c:5843 — passive(mon, mhit, malive, AT_type, wep_was_destroyed):
//   Monster's passive defense: damage hero on contact (acid blob, etc).
//   rn2(3) gate consumed for RNG parity.
//   Full C function also handles AD_FIRE/RUST/CORR/STON/MAGM/ENCH weapon erosion,
//   AD_PLYS (floating eye gaze), AD_COLD/FIRE/ELEC/STUN passive damage.
//   The implementation below handles the RNG-critical paths.

// cf. uhitm.c:6105 — passive_obj(mon, obj, mattk):
//   Passive defense damages hero's weapon/armor.
//   Called for AD_FIRE, AD_ACID, AD_RUST, AD_CORR, AD_ENCH when hero hits
//   a monster with those passive attack types.
export async function passive_obj(mon, obj, mattk) {
    if (!obj) return;
    const ptr = mon.data || mon.type || {};
    let attk = mattk || null;
    if (!attk) {
        const list = Array.isArray(ptr.mattk) ? ptr.mattk : [];
        attk = list.find((a) => a && a.aatyp === AT_NONE) || null;
    }
    if (!attk) return;
    const adtyp = attk.adtyp ?? AD_PHYS;

    switch (adtyp) {
    case AD_FIRE:
        // C: if (!rn2(6) && !mon->mcan) erode_obj(obj, ERODE_BURN)
        if (!rn2(6) && !mon.mcan
            // C ref: uhitm.c passive_obj() steam vortex exemption.
            && (ptr !== mons[PM_STEAM_VORTEX])) {
            await erode_obj_player(obj, xname(obj), ERODE_BURN, 0);
        }
        break;
    case AD_ACID:
        // C: if (!rn2(6)) erode_obj(obj, ERODE_CORRODE)
        if (!rn2(6)) {
            await erode_obj_player(obj, xname(obj), ERODE_CORRODE, EF_GREASE);
        }
        break;
    case AD_RUST:
        // C: if (!mon->mcan) erode_obj(obj, ERODE_RUST)
        if (!mon.mcan) {
            await erode_obj_player(obj, xname(obj), ERODE_RUST, EF_GREASE);
        }
        break;
    case AD_CORR:
        // C: if (!mon->mcan) erode_obj(obj, ERODE_CORRODE)
        if (!mon.mcan) {
            await erode_obj_player(obj, xname(obj), ERODE_CORRODE, EF_GREASE);
        }
        break;
    case AD_DCAY:
        if (!mon.mcan) {
            await erode_obj_player(obj, xname(obj), ERODE_ROT, EF_GREASE);
        }
        break;
    case AD_ENCH:
        // C: if (!mon->mcan) drain_item(obj)
        if (!mon.mcan) {
            if (obj.enchantment !== undefined) obj.enchantment = Math.max(-7, (obj.enchantment || 0) - 1);
            else if (obj.spe !== undefined) obj.spe = Math.max(-7, (obj.spe || 0) - 1);
        }
        break;
    default:
        break;
    }
}


// ============================================================================
// 10. Mimic discovery
// ============================================================================

// cf. uhitm.c:6179 — that_is_a_mimic(mtmp, mimic_flags):
//   Reveal that a hidden monster is actually a mimic.
//   Prints "Wait! That's a <monster>!" and optionally reveals it.
export function that_is_a_mimic(mtmp, mimic_flags) {
    const reveal_it = (mimic_flags || 0) & MIM_REVEAL;

    // C: complex message formatting based on glyph, blind, hallucination
    // Simplified: just reveal the mimic
    if (reveal_it && mtmp.m_ap_type) {
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mundetected = false;
    }
}

// cf. uhitm.c:6260 — stumble_onto_mimic(mtmp):
//   Hero stumbles onto a hidden mimic while moving.
//   Calls that_is_a_mimic(MIM_REVEAL), may set ustuck, wakes mimic.
export function stumble_onto_mimic(mtmp) {
    that_is_a_mimic(mtmp, MIM_REVEAL);

    // C: if (!u.ustuck && !mtmp->mflee && dmgtype(mtmp->data, AD_STCK))
    //       set_ustuck(mtmp);
    // Sticking is not modeled in JS yet.

    // Wake the mimic
    mtmp.msleeping = 0;
    mtmp.sleeping = false;
    if (mtmp.m_ap_type) {
        mtmp.m_ap_type = 0;
    }
}

// cf. uhitm.c:6278 — disguised_as_non_mon(mtmp):
//   Check if monster is disguised as a non-monster object/feature.
//   Returns true if mtmp is disguised as something other than a monster.
export function disguised_as_non_mon(mtmp) {
    // C: M_AP_TYPE(mtmp) && M_AP_TYPE(mtmp) != M_AP_MONSTER
    const ap = mtmp.m_ap_type || M_AP_NOTHING;
    return ap !== M_AP_NOTHING && ap !== M_AP_MONSTER;
}

// cf. uhitm.c:6286 — disguised_as_mon(mtmp):
//   Check if monster is disguised as another monster.
//   Returns true if mtmp's appearance type is M_AP_MONSTER.
export function disguised_as_mon(mtmp) {
    return (mtmp.m_ap_type || 0) === M_AP_MONSTER;
}


// ============================================================================
// 11. Light attacks
// ============================================================================

// cf. uhitm.c:6293 — nohandglow(mon):
//   Reduce hero's umconf counter (hand-glow for confusion touch).
//   Called after a hand-to-hand hit when umconf > 0 and mon is not confused.
export function nohandglow(mon, player) {
    if (!player || !player.umconf || mon?.mconf) return false;
    // C ref: uhitm.c:6303-6313 — messages depend on umconf count and visibility
    if (player.umconf === 1) {
        void Your("%s stop glowing.", "hands");
    } else {
        void Your("%s no longer glow so brightly.", "hands");
    }
    player.umconf--;
    return true;
}

// cf. uhitm.c:6319 — flash_hits_mon(mtmp, otmp):
//   Flash of light hits a monster (camera, wand of light, etc).
//   Returns 1 if flash had a noticeable effect, 0 otherwise.
//   Wakes sleeping monsters, blinds non-resistant ones, damages gremlins.
export function flash_hits_mon(mtmp, otmp) {
    const ptr = mtmp.data || mtmp.type || {};
    let res = 0;

    // Wake mimics — simplified, no M_AP_TYPE tracking
    if (mtmp.msleeping && haseyes(ptr)) {
        mtmp.msleeping = 0;
        mtmp.sleeping = false;
        res = 1;
    } else if (ptr.mlet !== S_LIGHT) {
        // Blind non-resistant monsters
        // C: if (!resists_blnd(mtmp)) — simplified check
        const isBlindRes = ptr.mlet === S_LIGHT; // already checked above
        if (!isBlindRes) {
            // C: distance-based blinding
            if ((mtmp.mndx ?? -1) === PM_GREMLIN) {
                // Rule #1: Keep them out of the light
                const amt = otmp ? rnd(4) : rnd(Math.min(mtmp.mhp || 4, 4));
                light_hits_gremlin(mtmp, amt);
            }
            if (mtmp.mhp > 0) {
                mtmp.mcansee = 0;
                mtmp.mblinded = rnd(50);
                // C: monflee chance
                if (rn2(4)) {
                    const fleetime = rn2(4) ? rnd(100) : 0;
                    applyMonflee(mtmp, fleetime, false);
                }
            }
            res = 1;
        }
    }
    return res;
}

// cf. uhitm.c:6403 — light_hits_gremlin(mon, dmg):
//   Light damage specifically to gremlins.
//   Deals damage and wakes nearby monsters.
export function light_hits_gremlin(mon, dmg) {
    // C: pline message based on distance and severity
    mon.mhp -= dmg;
    if (mon.mhp <= 0) {
        // Gremlin killed by light — handled by caller
    }
}


// ============================================================================
// Implemented functions (moved from mhitu.js)
// ============================================================================

// cf. uhitm.c find_roll_to_hit() — luck component (partial)
function isUndeadOrDemon(monsterType) {
    if (!monsterType) return false;
    const sym = monsterType.mlet;
    return sym === S_ZOMBIE
        || sym === S_MUMMY
        || sym === S_VAMPIRE
        || sym === S_WRAITH
        || sym === S_LICH
        || sym === S_GHOST
        || sym === S_DEMON;
}

export function weaponEnchantment(weapon) {
    return (weapon && (weapon.enchantment ?? weapon.spe)) || 0;
}

// hitval now in weapon.js — includes spe, oc_hitbon, blessed/silver/type bonuses

export function weaponDamageSides(weapon, monster) {
    if (!weapon) return 0;
    if (weapon.wsdam) return weapon.wsdam;
    const info = objectData[weapon.otyp];
    if (!info) return 0;
    const isLarge = (monster?.data?.msize ?? monster?.type?.msize ?? MZ_TINY) >= MZ_LARGE;
    return isLarge ? (info.oc_wldam || 0) : (info.oc_wsdam || 0);
}

// cf. uhitm.c hmon_hitmon_weapon() — ranged weapon used in melee check
function usesRangedMeleeDamage(weapon) {
    if (!weapon) return false;
    const sub = objectData[weapon.otyp]?.oc_subtyp;
    if (!Number.isInteger(sub)) return false;
    const isLauncher = sub >= 20 && sub <= 22;      // P_BOW..P_CROSSBOW
    const isAmmoOrMissile = sub <= -20 && sub >= -24; // -P_BOW..-P_SHURIKEN
    return isLauncher || isAmmoOrMissile;
}

// cf. uhitm.c find_roll_to_hit() — Luck component.
// sgn(Luck) * ((abs(Luck) + 2) / 3)  (integer division)
function luckBonus(luck) {
    if (!luck) return 0;
    return Math.sign(luck) * Math.floor((Math.abs(luck) + 2) / 3);
}

// cf. weapon.c abon() — now fully ported as abon() in weapon.js

// cf. uhitm.c hmon_hitmon_potion() -> potion.c potionhit()
function consumeMeleePotion(player, weapon) {
    const potion = { ...weapon, quan: 1 };
    if ((weapon.quan || 1) > 1) {
        weapon.quan = (weapon.quan || 1) - 1;
        potion.o_id = next_ident();
    } else {
        player.removeFromInventory(weapon);
        if (player.weapon === weapon) uwepgone(player);
        if (player.swapWeapon === weapon) uswapwepgone(player);
        if (player.quiver === weapon) uqwepgone(player);
    }
    return potion;
}

function potionHealsMonster(potion) {
    if (!potion) return false;
    return potion.otyp === POT_HEALING
        || potion.otyp === POT_EXTRA_HEALING
        || potion.otyp === POT_FULL_HEALING
        || potion.otyp === POT_RESTORE_ABILITY
        || potion.otyp === POT_GAIN_ABILITY;
}

// cf. uhitm.c hmon_hitmon_potion() -> potion.c potionhit()
async function hitMonsterWithPotion(player, monster, display, weapon) {
    const potion = consumeMeleePotion(player, weapon);
    const bottleChoices = player?.hallucinating ? 24 : 7;
    rn2(bottleChoices); // bottlename()

    // cf. potion.c:1671
    if (rn2(5) && monster.mhp > 1) {
        monster.mhp--;
    }

    if (potionHealsMonster(potion) && monster.mhp < (monster.mhpmax || monster.mhp)) {
        monster.mhp = monster.mhpmax || monster.mhp;
        await display.putstr_message(`The ${x_monnam(monster)} looks sound and hale again.`);
    }

    // cf. potion.c:1893 — distance<3 && !rn2((1+DEX)/2) gate for potionbreathe()
    const dex = acurr(player, A_DEX);
    const breatheDenom = Math.max(1, Math.floor((1 + dex) / 2));
    rn2(breatheDenom);
}

// cf. mon.c xkilled() — monster death handling.
// Co-located here with its primary caller hmon().
// TODO: future mon.js codematch should migrate this to mon.js.
async function handleMonsterKilled(player, monster, display, map) {
    // cf. uhitm.c -> mon.c mondead() -> killed() -> xkilled()
    const mdat = monster.data || monster.type || {};
    const killVerb = nonliving(mdat) ? 'destroy' : 'kill';
    await display.putstr_message(`You ${killVerb} the ${x_monnam(monster)}!`);
    mondead(monster, map, player);

    // C ref: mon.c LEVEL_SPECIFIC_NOCORPSE() + xkilled() gate.
    // This pre-check suppresses both treasure drops and corpse creation.
    const isRogueLevel = !!map?.flags?.is_rogue_level;
    const deathdropsDisabled = map?.flags?.deathdrops === false;
    let graveyardUndeadNoCorpse = false;
    if (!isRogueLevel && !deathdropsDisabled && map?.flags?.graveyard && is_undead(mdat)) {
        // C macro term: (graveyard && is_undead(mdat) && rn2(3))
        graveyardUndeadNoCorpse = rn2(3) !== 0;
    }
    const levelSpecificNoCorpse = isRogueLevel || deathdropsDisabled || graveyardUndeadNoCorpse;

    if (!levelSpecificNoCorpse) {
        // cf. mon.c:3581-3609 xkilled() — "illogical but traditional" treasure drop.
        const treasureRoll = rn2(6);
        const canDropTreasure = treasureRoll === 0
            && !((mdat.geno || 0) & G_NOCORPSE)
            && !monster.mcloned
            && (monster.mx !== player.x || monster.my !== player.y)
            && mdat.mlet !== S_KOP;
        if (canDropTreasure && map) {
            const otmp = mkobj(RANDOM_CLASS, true, false);
            const flags2 = mdat.mflags2 || 0;
            const isSmallMonster = (mdat.msize || 0) < MZ_HUMAN;
            const isPermaFood = otmp && otmp.oclass === FOOD_CLASS && !otmp.oartifact;
            const dropTooBig = isSmallMonster && !!otmp
                && otmp.otyp !== FIGURINE
                && ((otmp.owt || 0) > 30 || !!objectData[otmp.otyp]?.oc_big);
            if (isPermaFood && !(flags2 & M2_COLLECT)) {
                obj_resists(otmp, 0, 0);
            } else if (dropTooBig) {
                obj_resists(otmp, 0, 0);
            } else {
                otmp.ox = monster.mx;
                otmp.oy = monster.my;
                placeFloorObject(map, otmp);
            }
        }

        // C ref: mon.c xkilled() calls corpse_chance() first, then
        // make_corpse() may still return null for G_NOCORPSE species.
        const speciesNoCorpse = !!((mdat.geno || 0) & G_NOCORPSE);
        const createCorpseRoll = corpse_chance(monster);
        if (createCorpseRoll && !speciesNoCorpse) {
            const corpse = mkcorpstat(CORPSE, monster.mndx || 0, true,
                map ? monster.mx : 0, map ? monster.my : 0, map);
            corpse.age = Math.max((player?.turns || 0) + 1, 1);
            if (map) newsym(monster.mx, monster.my);
        }
    }

    // C ref: mon.c:3724 — malign was already adjusted for alignment and randomization
    // set_malign is normally called in C makemon; compute lazily if not yet set
    if (monster.malign === undefined && mdat) {
        set_malign(monster, player);
    }
    adjalign(player, monster.malign || 0);

    // C ref: mon.c cleanup section — award XP after xkilled drop/corpse logic.
    // Keep legacy player.exp mirrored so status/insight views stay consistent.
    const exp = ((monster.m_lev || 0) + 1) * ((monster.m_lev || 0) + 1);
    player.uexp = (Number(player.uexp) || Number(player.exp) || 0) + exp;
    player.urexp = (Number(player.urexp) || 0) + (4 * exp);
    player.exp = player.uexp;
    player.score += exp;
    await newexplevel(player, display);

    return true;
}

// cf. uhitm.c:5843 — passive(mon, weapon, mhitb, maliveb, aatyp, wep_was_destroyed):
//   Handle monster's passive counterattack when hero attacks it.
//   Only consumes RNG if the monster has an AT_NONE attack slot.
// NATTK imported from const.js

function playerHasProp(player, prop) {
    return !!(player && typeof player.hasProp === 'function' && player.hasProp(prop));
}

async function passive(mon, weapon, mhit, malive, aatyp = AT_WEAP, wep_was_destroyed = false, ctx = {}) {
    const player = ctx.player || null;
    const display = ctx.display || null;
    const game = ctx.game || null;
    const ptr = mon.data || mon.type || {};
    const attacks = ptr.mattk || [];

    // Find the AT_NONE (passive) attack slot
    // C ref: uhitm.c:5856-5861 — scan attacks for AT_NONE
    // JS attacks arrays are compact; synthesize if needed (like passivemm)
    let passiveAttk = null;
    for (let i = 0; i < attacks.length; i++) {
        if (i >= NATTK) return; // no passive attacks
        const attack = attacks[i];
        if (attack.aatyp === AT_NONE) {
            passiveAttk = attack;
            break;
        }
    }
    if (!passiveAttk) {
        if (attacks.length >= NATTK) return; // no room for passive
        // Synthesize NO_ATTK: C would find AT_NONE/AD_NONE(=AD_PHYS)/0/0
        passiveAttk = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
    }

    const adtyp = passiveAttk.adtyp;

    // C ref: uhitm.c:5862-5868 — calculate tmp (damage dice)
    // tmp = d(damn, damd) or d(mlev+1, damd) or 0
    let tmp = 0;
    if (passiveAttk.damn) {
        tmp = c_d(passiveAttk.damn, passiveAttk.damd || 0);
    } else if (passiveAttk.damd) {
        const mlev = mon.m_lev ?? (ptr.mlevel || 0);
        tmp = c_d(mlev + 1, passiveAttk.damd);
    }

    // C ref: uhitm.c:5872-5993 — first switch: effects that work even if dead
    switch (adtyp) {
    case AD_ACID:
        if (mhit && rn2(2)) {
            // C ref: uhitm.c:5885-5900 — splash damage path
            if (playerHasProp(player, ACID_RES)) {
                tmp = 0;
            }
            rn2(30); // erode_armor stub
        } else {
            tmp = 0;
        }
        if (mhit && weapon && aatyp === AT_KICK) {
            // C ref: uhitm.c:5902-5905 — boot erosion for AT_KICK only
            rn2(6); // erode_obj(boots) stub
        }
        // C ref: uhitm.c:5910 — exercise is unconditional
        if (player) await exercise(player, A_STR, false);
        break;
    case AD_ENCH:
        if (!weapon || wep_was_destroyed || aatyp !== AT_WEAP) {
            tmp = 0;
            break;
        }
        if ((weapon.enchantment ?? weapon.spe ?? 0) > -7) {
            if (weapon.enchantment !== undefined) weapon.enchantment -= 1;
            else if (weapon.spe !== undefined) weapon.spe -= 1;
        }
        tmp = 0;
        break;
    default:
        break;
    }

    if (mhit && weapon && !wep_was_destroyed && aatyp === AT_WEAP) {
        await passive_obj(mon, weapon, passiveAttk);
    }

    if (tmp > 0 && player && adtyp !== AD_PLYS) {
        player.uhp = Math.max(0, (player.uhp || 0) - tmp);
    }

    // C ref: uhitm.c:5997 — if (malive && !mon->mcan && rn2(3)) { ... }
    // Proceed to "still alive" effects when monster alive, not cancelled, and rn2(3)!=0
    if (!malive || mon.mcan || !rn2(3)) {
        return;
    }

    // Effects that only work if monster still alive.
    switch (adtyp) {
    case AD_PLYS:
        if ((mon.mndx ?? -1) === PM_FLOATING_EYE) {
            // C ref: uhitm.c:6000-6025 (floating eye passive gaze)
            if (tmp > 127) tmp = 127;
            if (!playerHasProp(player, FREE_ACTION) && tmp > 0) {
                if (display) await display.putstr_message(`You are frozen by ${s_suffix(y_monnam(mon))} gaze!`);
                // C: nomul((ACURR(A_WIS) > 12 || rn2(4)) ? -tmp : -127);
                // and gn.nomovemsg = 0 (do not preserve prior message text).
                const duration = (acurr(player, A_WIS) > 12 || rn2(4)) ? tmp : 127;
                if (game) {
                    game.multi = -duration;
                    game.nomovemsg = null;
                    game.multi_reason = dynamic_multi_reason(mon, 'frozen', true);
                }
            }
        } else if (playerHasProp(player, FREE_ACTION)) {
            // C ref: uhitm.c:6032-6033 — Free_action prevents paralysis
            tmp = 0;
        } else {
            // C ref: uhitm.c:6034-6041 — gelatinous cube passive paralysis
            // nomul(-tmp) + exercise
            if (player) await exercise(player, A_DEX, false);
        }
        break;
    case AD_COLD:
        if (playerHasProp(player, COLD_RES)) tmp = 0;
        break;
    case AD_FIRE:
        if (playerHasProp(player, FIRE_RES)) tmp = 0;
        break;
    case AD_ELEC:
        if (playerHasProp(player, SHOCK_RES)) tmp = 0;
        break;
    case AD_STUN:
        if (player) {
            const oldTimeout = player.getPropTimeout ? (player.getPropTimeout(STUNNED) || 0) : 0;
            await make_stunned(player, oldTimeout + Math.max(1, tmp), true);
        }
        tmp = 0;
        break;
    default:
        tmp = 0;
        break;
    }

    if (tmp > 0 && player && adtyp !== AD_PLYS) {
        player.uhp = Math.max(0, (player.uhp || 0) - tmp);
    }
}


// cf. uhitm.c do_attack() / hitum() / known_hitum() — hero attacks monster
export async function do_attack_core(player, monster, display, map, game = null) {
    // C ref: uhitm.c:538-549 — first attack while wielding a non-weapon
    // emits "You begin bashing monsters with <item>."
    const wielded = player.weapon;
    const wieldedOd = wielded ? objectData[wielded.otyp] : null;
    let bashPrefix = null;
    const improvisedWield = !!wielded
        && wieldedOd?.oc_class !== WEAPON_CLASS
        && !wieldedOd?.weptool;
    if (improvisedWield) {
        if (player._bashmsgWepObj !== wielded) {
            bashPrefix = `You begin bashing monsters with your ${xname(wielded)}.`;
        }
        player._bashmsgWepObj = wielded;
    } else {
        player._bashmsgWepObj = null;
    }

    // cf. uhitm.c:777 — find_roll_to_hit, mon_maybe_unparalyze, rnd(20)
    const toHit = find_roll_to_hit(player, monster, AT_WEAP, player.weapon);
    mon_maybe_unparalyze(monster);
    const dieRoll = rnd(20);
    const mhit = (toHit > dieRoll);

    // cf. uhitm.c:781-782 — exercise A_DEX before known_hitum if hit
    if (mhit) await exercise(player, A_DEX, true);

    if (!mhit) {
        // cf. uhitm.c:608 — known_hitum miss path → missum()
        if (bashPrefix) await display.putstr_message(bashPrefix);
        await display.putstr_message(`You miss ${y_monnam(monster)}.`);
        // cf. uhitm.c:788 passive() after miss
        await passive(monster, player.weapon || null, false, true, AT_WEAP, false, {
            player, display, map, game,
        });
        return false;
    }

    if (bashPrefix) {
        await display.putstr_message(bashPrefix);
    }

    if (player.weapon && player.weapon.oclass === POTION_CLASS) {
        await hitMonsterWithPotion(player, monster, display, player.weapon);
        // cf. uhitm.c hmon_hitmon_potion() sets base damage to 1 (or 0 vs shade)
        // after potionhit(), then proceeds through normal kill/flee/passive handling.
        if ((monster.mndx ?? -1) !== PM_SHADE) {
            monster.mhp -= 1;
        }
        if (monster.mhp <= 0) {
            return await handleMonsterKilled(player, monster, display, map);
        }
        // cf. uhitm.c:624-628 known_hitum() — 1/25 morale/flee check on surviving hit
        if (!rn2(25) && monster.mhp < Math.floor((monster.mhpmax || 1) / 2)) {
            // cf. monflee(mon, !rn2(3) ? rnd(100) : 0, ...) — flee timer
            const fleetime = !rn2(3) ? rnd(100) : 0;
            applyMonflee(monster, fleetime, false);
        }
        // cf. uhitm.c:788 passive() after potion hit
        await passive(monster, player.weapon || null, true, true, AT_WEAP, false, {
            player, display, map, game,
        });
        return false;
    }

    // Hit! Calculate damage
    // cf. uhitm.c hmon_hitmon() → hmon_hitmon_weapon_melee() / weapon_ranged / barehands
    let damage = 0;
    const wepInfo = player.weapon ? objectData[player.weapon.otyp] : null;
    const weaponLike = !!player.weapon && (
        player.weapon.oclass === WEAPON_CLASS
        || wepInfo?.weptool
        || player.weapon.oclass === GEM_CLASS
    );
    const rangedMelee = usesRangedMeleeDamage(player.weapon);
    let applyDmgBonus = !rangedMelee;
    if (player.weapon && rangedMelee) {
        // cf. uhitm.c:884 hmon_hitmon_weapon_ranged() — rnd(2) base
        damage = rnd(2);
    } else if (player.weapon && weaponLike) {
        // cf. uhitm.c:919 hmon_hitmon_weapon_melee() → dmgval()
        damage = dmgval(player.weapon, monster);
    } else if (player.weapon && player.weapon.oclass === TOOL_CLASS) {
        // cf. uhitm.c:1330-1335 hmon_hitmon_misc_obj() base damage:
        // non-weapon melee uses weight-based random damage, capped at 6.
        damage = miscMeleeObjectBaseDamage(player.weapon);
    } else if (player.weapon) {
        // Keep existing behavior for non-tool non-weapon wieldables until
        // broader slot/wield-state audit lands.
        damage = dmgval(player.weapon, monster);
    } else {
        // Bare-handed combat
        // cf. uhitm.c:837 hmon_hitmon_barehands() — 1d2 base + martial arts
        damage = rnd(martial_bonus(player) ? 4 : 2);
    }

    // cf. uhitm.c:1414 hmon_hitmon_dmg_recalc() — add strength and skill bonuses
    if (applyDmgBonus) {
        damage += dbon(acurr(player, A_STR));
        if (weaponLike) {
            damage += weapon_dam_bonus(player.weapon); // skill-based (stub: returns 0)
        }
        // cf. uhitm.c — artifact damage bonus
        if (weaponLike && player.weapon && player.weapon.oartifact) {
            const [bonus] = spec_dbon(player.weapon, monster, damage);
            damage += bonus;
        }
    }

    // Minimum 1 damage on a hit
    if (damage < 1) damage = 1;

    // C ref: uhitm.c hmon_hitmon_stagger() rolls rnd(100) for unarmed hits
    // with damage > 1 before death handling, so consume it even on kill.
    const unarmedStaggerRolled = (!player.weapon && damage > 1);
    if (unarmedStaggerRolled) {
        rnd(100);
    }

    // Apply damage
    // cf. uhitm.c -- "You hit the <monster>!"
    monster.mhp -= damage;

    const destroyed = (monster.mhp <= 0);
    const tameLike = !!(Number(monster.mtame || 0) > 0 || monster.tame);
    if (tameLike && damage > 0) {
        if (!Number(monster.mtame)) monster.mtame = 10;
        // C ref: uhitm.c hmon_hitmon_pet() runs before hit message and
        // applies abuse_dog() side effects (yelp/growl RNG + message).
        await abuse_dog_like_c(monster, display);
        if (Number(monster.mtame || 0) > 0 && !destroyed) {
            applyMonflee(monster, 10 * rnd(damage), false);
        }
    }

    if (destroyed) {
        // cf. uhitm.c:788 passive() called even when monster dies (malive=false)
        // The "alive-only" effects (rn2(3) gate) are skipped.
        const killed = await handleMonsterKilled(player, monster, display, map);
        await passive(monster, player.weapon || null, true, false, AT_WEAP, false, {
            player, display, map, game,
        });
        return killed;
    } else {
        // cf. uhitm.c -- various hit messages
        const hitVerb = (player?.roleMnum === PM_BARBARIAN) ? 'smite' : 'hit';
        await display.putstr_message(`You ${hitVerb} the ${x_monnam(monster)}${exclam(damage)}`);
        // cf. uhitm.c hmon_hitmon_core():
        // For armed melee hits with damage > 1: mhitm_knockback().
        // For unarmed hits with damage > 1: hmon_hitmon_stagger() → rnd(100).
        if (player.weapon && damage > 1 && !player.twoweap) {
            // cf. uhitm.c:5225 mhitm_knockback — hero attacks monster
            // RNG: rn2(3) always, rn2(6) always, then eligibility + rn2(2)*2 if qualifies
            const knockdistance = rn2(3) ? 1 : 2;
            if (!rn2(6)) {
                // Passed 1/6 chance gate. Check eligibility:
                // AD_PHYS + AT_WEAP: passes for armed hero (mattk is hero's attack)
                // Size: hero (MZ_HUMAN) must be > mdef.msize + 1
                const msize = (monster.data || monster.type)?.msize ?? MZ_HUMAN;
                if (msize + 1 < MZ_HUMAN) {
                    // cf. uhitm.c:5334-5352 — knockback: mhurtle then message
                    const dx = Math.sign((monster.mx || 0) - (player.x || 0));
                    const dy = Math.sign((monster.my || 0) - (player.y || 0));
                    const knockedhow = will_hurtle(monster, (monster.mx || 0) + dx, (monster.my || 0) + dy, map, player)
                        ? 'backward' : 'back';
                    // C: mhurtle(mdef, dx, dy, knockdistance) — physically move monster
                    await mhurtle(monster, dx, dy, knockdistance, map, player);
                    const adj = rn2(2) ? 'forceful' : 'powerful';
                    const noun = rn2(2) ? 'blow' : 'strike';
                    await display.putstr_message(
                        `You knock the ${x_monnam(monster)} ${knockedhow} with a ${adj} ${noun}!`
                    );
                    // cf. uhitm.c:5384 — stun check after knockback
                    if (monster.mhp > 0 && !rn2(4)) {
                        monster.mstun = 1;
                    }
                }
            }
        } else if (!player.weapon && damage > 1 && !unarmedStaggerRolled) {
            // cf. uhitm.c:1554 hmon_hitmon_stagger — rnd(100) stun chance check
            rnd(100);
        }
        // cf. uhitm.c:624-628 known_hitum() — 1/25 morale/flee check on surviving hit
        if (!rn2(25) && monster.mhp < Math.floor((monster.mhpmax || 1) / 2)) {
            // cf. monflee(mon, !rn2(3) ? rnd(100) : 0, ...) — flee timer
            const fleetime = !rn2(3) ? rnd(100) : 0;
            applyMonflee(monster, fleetime, false);
        }
        // cf. uhitm.c:788 passive() after surviving hit
        await passive(monster, player.weapon || null, true, true, AT_WEAP, false, {
            player, display, map, game,
        });
        return false;
    }
}
