// mhitm.js -- Monster-vs-monster combat: attacks, damage, special effects
// cf. mhitm.c — fightm, mdisplacem, mattackm, failed_grab,
//               hitmm, gazemm, engulf_target, gulpmm, explmm, mdamagem,
//               mon_poly, paralyze_monst, sleep_monst, slept_monst, rustm,
//               mswingsm, passivemm, xdrainenergym, attk_protection,
//               and static helpers noises, pre_mm_attack, missmm
//
// mhitm.c handles all monster-vs-monster combat resolution:
//   fightm(mtmp): find adjacent enemies and call mattackm().
//   mattackm(magr, mdef): full attack sequence for magr against mdef.
//     Returns bitmask: MM_MISS/MM_HIT/MM_DEF_DIED/MM_AGR_DIED/MM_EXPELLED.
//   mattackm dispatches per attack: hitmm (physical), gazemm (gaze),
//     gulpmm (engulf), explmm (explosion).
//   mdamagem(): apply actual damage and special effects (AT_CLNC, AT_STNG, etc.)
//
// Shared mattackm/mdamagem used by all m-vs-m combat paths including
// pet combat (dogmove.js) and conflict (fightm).

import { rn2, rnd, d, c_d } from './rng.js';
import { distmin } from './hacklib.js';
import { monnear, mondead, helpless, unstuck } from './mon.js';
import { grow_up } from './makemon.js';
import { game as _gstate } from './gstate.js';
import { map_invisible, newsym, canSpotMonsterForMap } from './display.js';
import { monAttackName, rndmonnam } from './do_name.js';
import { cansee } from './vision.js';
import {
    x_monnam,
    touch_petrifies, unsolid, resists_fire, resists_cold,
    resists_elec, resists_acid, resists_sleep, resists_ston, defended,
    nonliving, sticks, attacktype, dmgtype, is_whirly,
    DEADMONSTER,
} from './mondata.js';
import { erode_obj } from './trap.js';
import { AT_NONE, AT_CLAW, AT_KICK, AT_BITE, AT_TUCH, AT_BUTT, AT_STNG, AT_HUGS, AT_TENT, AT_WEAP, AT_GAZE, AT_ENGL, AT_EXPL, AT_BREA, AT_SPIT, AT_BOOM, G_NOCORPSE, AD_PHYS, AD_ACID, AD_BLND, AD_STUN, AD_PLYS, AD_COLD, AD_FIRE, AD_ELEC, AD_WRAP, AD_STCK, AD_DGST, AD_RUST, AD_CORR, AD_SLEE, MZ_HUGE, PM_GRID_BUG, PM_STEAM_VORTEX } from './monsters.js';
import { corpse_chance, zombie_maker, zombie_form } from './mon.js';
import { mkcorpstat, xname } from './mkobj.js';
import { CORPSE, WEAPON_CLASS, objectData } from './objects.js';
import { M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, M_ATTK_AGR_DONE, W_ARMG, W_ARMF, W_ARMH, ERODE_RUST, ERODE_CORRODE, ERODE_BURN, EF_GREASE, EF_VERBOSE, NEED_WEAPON, NEED_HTH_WEAPON, NON_PM, NATTK, STRAT_WAITFORU } from './const.js';
import {
    mhitm_adtyping_async,
} from './uhitm.js';
import { monsterWeaponSwingVerb, monsterPossessive } from './mhitu.js';
import { mhurtle, will_hurtle } from './dothrow.js';
import { find_mac } from './worn.js';
import { mon_wield_item, possibly_unwield, hitval } from './weapon.js';
import { spec_dbon } from './artifact.js';
import { resist } from './zap.js';

// NATTK, STRAT_WAITFORU imported from const.js
let farNoise = false;
let noiseTime = 0;

// C ref: noises() uses static locals that reset per-process.
// In the JS test suite, module state persists across replays.
// Reset to C defaults (static int = 0, static boolean = false).
export function resetNoisesState() {
    farNoise = false;
    noiseTime = 0;
}

// ============================================================================
// Helper predicates
// ============================================================================


// cf. worn.c:707 — find_mac(mon): accounts for worn armor via m_dowear.

// ============================================================================
// noises, pre_mm_attack, missmm — display helpers
// ============================================================================

// cf. mhitm.c:26 — noises(magr, mattk): combat noise output
export async function noises(magr, mattk, display, ctx) {
    if (!display) return;
    const player = ctx?.player || null;
    const deaf = Number(player?.deafness || 0) > 0 || !!player?.deaf;
    if (deaf) return;
    const px = Number.isInteger(player?.x) ? player.x : 0;
    const py = Number.isInteger(player?.y) ? player.y : 0;
    const dx = (magr?.mx ?? 0) - px;
    const dy = (magr?.my ?? 0) - py;
    const isFar = ((dx * dx) + (dy * dy)) > 15;
    const turn = Number.isInteger(ctx?.turnCount) ? ctx.turnCount : 0;
    if (isFar === farNoise && (turn - noiseTime) <= 10) return;
    farNoise = isFar;
    noiseTime = turn;
    const base = (mattk?.aatyp === AT_EXPL) ? 'an explosion' : 'some noises';
    await display.putstr_message(`You hear ${base}${isFar ? ' in the distance' : ''}.`);
}

// cf. mhitm.c:40-72 — pre_mm_attack(): unhide/unmimic, newsym/map_invisible
function pre_mm_attack(magr, mdef, vis, map, ctx) {
    const player = ctx?.player || null;
    const fov = ctx?.fov || null;
    let showit = false;
    const spottedNow = (mon, fallbackVisible) => (
        (typeof fallbackVisible === 'boolean')
            ? fallbackVisible
            : ((player && map)
                ? canSpotMonsterForMap(mon, map, player, fov)
                : false)
    );

    if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit = true;
    }
    if (magr.mundetected) {
        magr.mundetected = 0;
        showit = true;
    }
    // C ref: mhitm.c:62-71 — mark invisible monsters on map
    if (vis && map) {
        if (!spottedNow(magr, ctx?.agrVisible)) {
            map_invisible(map, magr.mx, magr.my, ctx?.player);
        } else if (showit) {
            newsym(magr.mx, magr.my);
        }
        if (!spottedNow(mdef, ctx?.defVisible)) {
            map_invisible(map, mdef.mx, mdef.my, ctx?.player);
        } else if (showit) {
            newsym(mdef.mx, mdef.my);
        }
    }
}

// cf. do_name.c:863 x_monnam() — returns "it" when player can't spot the monster.
// In C, canspotmon() is checked per-monster even within visible combat messages.
function monCombatName(mon, visible, { capitalize = false, article = 'the', player = null } = {}) {
    if (visible === false) return capitalize ? 'It' : 'it';
    if (player?.hallucinating || player?.Hallucination) {
        const rnd = rndmonnam();
        let base = String(rnd?.name || '');
        if (!base) base = 'creature';
        if (article === 'the') base = `the ${base}`;
        else if (article === 'a') base = `a ${base}`;
        if (capitalize && base.length > 0) {
            base = base.charAt(0).toUpperCase() + base.slice(1);
        }
        return base;
    }
    return x_monnam(mon, article, null, 0, capitalize);
}

// cf. mhitm.c:75 — missmm(magr, mdef, mattk): miss message
async function missmm(magr, mdef, mattk, display, vis, map, ctx) {
    pre_mm_attack(magr, mdef, vis, map, ctx);
    if (vis && display) {
        await display.putstr_message(
            `${monCombatName(magr, ctx?.agrVisible, { capitalize: true, player: ctx?.player || null })} misses ${monCombatName(mdef, ctx?.defVisible, { player: ctx?.player || null })}.`
        );
    } else {
        await noises(magr, mattk, display, ctx);
    }
}

// ============================================================================
// failed_grab — grab feasibility check
// ============================================================================

// cf. mhitm.c:596 — failed_grab(magr, mdef, mattk)
export function failed_grab(magr, mdef, mattk) {
    const pd = mdef.data || mdef.type || {};
    if (unsolid(pd)
        && (mattk.aatyp === AT_HUGS || mattk.adtyp === AD_WRAP
            || mattk.adtyp === AD_STCK || mattk.adtyp === AD_DGST)) {
        return true;
    }
    return false;
}

// ============================================================================
// attk_protection — armor slot for attack type
// ============================================================================

// cf. mhitm.c:1474 — attk_protection(aatyp)
export function attk_protection(aatyp) {
    switch (aatyp) {
    case AT_NONE: case AT_SPIT: case AT_EXPL: case AT_BOOM:
    case AT_GAZE: case AT_BREA:
        return ~0; // no defense needed
    case AT_CLAW: case AT_TUCH: case AT_WEAP:
        return W_ARMG; // gloves
    case AT_KICK:
        return W_ARMF; // boots
    case AT_BUTT:
        return W_ARMH; // helm
    case AT_BITE: case AT_STNG: case AT_HUGS: case AT_ENGL:
    default:
        return 0;
    }
}

// ============================================================================
// paralyze_monst, sleep_monst — status effect helpers
// ============================================================================

// cf. mhitm.c:1209 — paralyze_monst(mon, amt)
// Autotranslated from mhitm.c:1209
export function paralyze_monst(mon, amt) {
  if (amt > 127) amt = 127;
  mon.mcanmove = 0;
  mon.mfrozen = amt;
  mon.meating = 0;
  mon.mstrategy &= ~STRAT_WAITFORU;
}

// cf. mhitm.c:1222 — sleep_monst(mon, amt, how)
export function sleep_monst(mon, amt, how) {
    if (resists_sleep(mon) || defended(mon, AD_SLEE)
        || (how >= 0 && resist(mon, how))) {
        return 0;
    }
    if (mon.mcanmove) {
        amt += (mon.mfrozen || 0);
        if (amt > 0) {
            mon.mcanmove = false;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

// cf. mhitm.c:1249 — slept_monst(mon)
export function slept_monst(mon, player = (globalThis.gs?.player || null)) {
    if (!mon || !player) return;
    const heroData = player.data || player.type || null;
    if (helpless(mon)
        && player.ustuck === mon
        && !sticks(heroData)
        && !player.uswallow) {
        unstuck(mon, player);
    }
}

// cf. mhitm.c:1259 — rustm(mdef, obj)
// C ref: mhitm.c:1260 rustm() — erode attacker's weapon from defender's body
export function rustm(mdef, obj) {
    if (!mdef || !obj) return;
    const mdat = mdef.data || mdef.type || {};
    let dmgtyp = -1, chance = 1;

    // AD_ACID and AD_ENCH handled elsewhere (passivemm/passiveum)
    if (dmgtype(mdat, AD_CORR)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(mdat, AD_RUST)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(mdat, AD_FIRE)
               && (mdef.mndx !== PM_STEAM_VORTEX)) {
        dmgtyp = ERODE_BURN;
        chance = 6; // fire erosion is rarer: 1-in-6
    }

    if (dmgtyp >= 0 && !rn2(chance))
        erode_obj(obj, null, dmgtyp, EF_GREASE | EF_VERBOSE);
}

// ============================================================================
// xdrainenergym — monster energy drain
// ============================================================================

// cf. mhitm.c:1460 — xdrainenergym(mon, vis)
export function xdrainenergym(mon, vis) {
    if ((mon.mspec_used || 0) < 20) {
        mon.mspec_used = (mon.mspec_used || 0) + c_d(2, 2);
    }
}

// ============================================================================
// passivemm — passive counterattack (defender retaliates)
// ============================================================================

// cf. mhitm.c:1303 — passivemm(magr, mdef, mhitb, mdead, mwep)
export function passivemm(magr, mdef, mhitb, mdead, mwep, map) {
    const mddat = mdef.data || mdef.type || {};
    const attacks = mddat.attacks || [];
    let mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    // Find the AT_NONE (passive) attack
    // C ref: in C, unused attack slots are NO_ATTK = {AT_NONE, AD_NONE, 0, 0}.
    // JS attacks arrays are compact (no NO_ATTK padding), so if no explicit
    // AT_NONE passive is found but attacks.length < NATTK, synthesize a NO_ATTK
    // entry to match C's behavior (which still consumes rn2(3) for the no-op).
    let passiveAttk = null;
    for (let i = 0; i < attacks.length; i++) {
        const attack = attacks[i];
        if (attack.aatyp === AT_NONE) {
            passiveAttk = attack;
            break;
        }
        if (i >= NATTK) return (mdead | mhit);
    }
    if (!passiveAttk) {
        if (attacks.length >= NATTK) return (mdead | mhit);
        // Synthesize NO_ATTK: C would find AT_NONE/AD_PHYS(=AD_NONE)/0/0
        passiveAttk = { aatyp: AT_NONE, adtyp: AD_PHYS, damn: 0, damd: 0 };
    }

    // Roll damage
    let tmp;
    if (passiveAttk.damn) {
        tmp = c_d(passiveAttk.damn, passiveAttk.damd || 0);
    } else if (passiveAttk.damd) {
        const mlev = mddat.mlevel || 0;  // C: mddat->mlevel (species base, not adjusted)
        tmp = c_d(mlev + 1, passiveAttk.damd);
    } else {
        tmp = 0;
    }

    const adtyp = passiveAttk.adtyp;

    // Effects that work even if defender died
    if (adtyp === AD_ACID) {
        if (mhitb && !rn2(2)) {
            if (resists_acid(magr)) {
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        rn2(30); // erode_armor chance
        rn2(6);  // acid_damage chance
        // Apply acid damage and return
        if (tmp > 0) {
            magr.mhp -= tmp;
            if (magr.mhp <= 0) {
                mondead(magr, map);
                return (mdead | mhit | M_ATTK_AGR_DIED);
            }
        }
        return (mdead | mhit);
    }

    // AD_ENCH: drain weapon enchantment
    // TODO: implement drain_item for mwep

    if (mdead || mdef.mcan) return (mdead | mhit);

    // Effects only if defender alive and rn2(3) passes
    if (rn2(3)) {
        switch (adtyp) {
        case AD_PLYS: {
            // Floating eye / gelatinous cube
            if (tmp > 127) tmp = 127;
            if (!rn2(4)) tmp = 127;
            paralyze_monst(magr, tmp);
            return (mdead | mhit);
        }
        case AD_COLD:
            if (resists_cold(magr)) {
                tmp = 0;
            }
            break;
        case AD_STUN:
            if (!magr.mstun) {
                magr.mstun = 1;
            }
            tmp = 0;
            break;
        case AD_FIRE:
            if (resists_fire(magr)) {
                tmp = 0;
            }
            break;
        case AD_ELEC:
            if (resists_elec(magr)) {
                tmp = 0;
            }
            break;
        default:
            tmp = 0;
            break;
        }
    } else {
        tmp = 0;
    }

    // Apply passive damage
    if (tmp > 0) {
        magr.mhp -= tmp;
        if (magr.mhp <= 0) {
            mondead(magr, map);
            return (mdead | mhit | M_ATTK_AGR_DIED);
        }
    }
    return (mdead | mhit);
}

// ============================================================================
// hitmm — process a successful physical hit
// ============================================================================

// cf. mhitm.c:643 — hitmm(magr, mdef, mattk, mwep, dieroll)
async function hitmm(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx) {
    pre_mm_attack(magr, mdef, vis, map, ctx);

    // Display hit message
    if (vis && display) {
        let verb = 'hits';
        switch (mattk.aatyp) {
        case AT_BITE: verb = 'bites'; break;
        case AT_STNG: verb = 'stings'; break;
        case AT_BUTT: verb = 'butts'; break;
        case AT_TUCH: verb = 'touches'; break;
        case AT_TENT: verb = 'sucks'; break;
        case AT_HUGS: verb = 'squeezes'; break;
        default: verb = 'hits'; break;
        }
        await display.putstr_message(
            `${monCombatName(magr, ctx?.agrVisible, { capitalize: true, player: ctx?.player || null })} ${verb} ${monCombatName(mdef, ctx?.defVisible, { player: ctx?.player || null })}.`
        );
    } else {
        await noises(magr, mattk, display, ctx);
    }

    return await mdamagem(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx);
}

// ============================================================================
// gazemm — gaze attack on monster
// ============================================================================

// cf. mhitm.c:735 — gazemm(magr, mdef, mattk)
async function gazemm(magr, mdef, mattk, display, vis, map, ctx) {
    // Simplified: gaze attacks between monsters
    if (magr.mcan || !mdef.mcansee) {
        return M_ATTK_MISS;
    }
    // For blinding gaze (Archon), delegate to adtyping
    return await mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);
}

// ============================================================================
// explmm — explosion attack (e.g., gas spore)
// ============================================================================

// cf. mhitm.c:969 — explmm(magr, mdef, mattk)
export async function explmm(magr, mdef, mattk, display, vis, map, ctx) {
    if (magr.mcan) return M_ATTK_MISS;

    let result = await mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);

    // Kill off aggressor (self-destruct)
    if (!(result & M_ATTK_AGR_DIED)) {
        mondead(magr, map, ctx?.player);
        if (!DEADMONSTER(magr)) {
            return result; // lifesaved
        }
        result |= M_ATTK_AGR_DIED;
    }
    return result;
}

// ============================================================================
// mhitm_knockback — mon-vs-mon knockback eligibility (RNG faithful)
// ============================================================================

// cf. uhitm.c:5225 mhitm_knockback() — mon-vs-mon path.
// Always consumes rn2(3) for distance and rn2(chance) for trigger.
// If triggered and eligible: rn2(2)+rn2(2) for message, rn2(4) for stun.
// Returns true if knockback would fire.
async function mhitm_knockback_mm(magr, mdef, mattk, mwep, vis, display, map, ctx) {
    const knockdistance = rn2(3) ? 1 : 2; // C ref: uhitm.c mhitm_knockback
    const chance = 6; // default; Ogresmasher would use 2
    if (rn2(chance)) return 0; // didn't trigger

    // Eligibility: only AD_PHYS + specific melee attack types
    if (!(mattk.adtyp === AD_PHYS
          && (mattk.aatyp === AT_CLAW || mattk.aatyp === AT_KICK
              || mattk.aatyp === AT_BUTT || mattk.aatyp === AT_WEAP))) {
        return 0;
    }

    // C ref: uhitm.c:5288 — attacker engulfs/hugs → no knockback
    const pa = magr.data || magr.type || {};
    if (attacktype(pa, AT_ENGL) || attacktype(pa, AT_HUGS) || sticks(pa)) {
        return 0;
    }

    // C ref: uhitm.c:5298 — size check: agr must be much larger
    const agrSize = pa.msize ?? 0;
    const defSize = (mdef.data || mdef.type || {}).msize ?? 0;
    if (!(agrSize > defSize + 1)) return 0;

    // C ref: uhitm.c:5303 — unsolid attacker can't knockback
    if (unsolid(pa)) return 0;

    const dx = Math.sign((mdef.mx || 0) - (magr.mx || 0));
    const dy = Math.sign((mdef.my || 0) - (magr.my || 0));
    const knockedhow = will_hurtle(mdef, mdef.mx + dx, mdef.my + dy, map, ctx?.player)
        ? 'backward' : 'back';

    // C ref: uhitm.c:5350-5352 — knockback message
    if (display && ctx?.defVisible) {
        const adj = rn2(2) ? 'forceful' : 'powerful';
        const noun = rn2(2) ? 'blow' : 'strike';
        const agrName = monCombatName(magr, ctx?.agrVisible, { capitalize: true, player: ctx?.player || null });
        const defName = monCombatName(mdef, ctx?.defVisible, { player: ctx?.player || null });
        await display.putstr_message(
            `${agrName} knocks ${defName} ${knockedhow} with a ${adj} ${noun}!`
        );
    }

    // C ref: uhitm.c:5388+ — actual hurtle can kill via traps.
    const oldx = mdef.mx;
    const oldy = mdef.my;
    await mhurtle(mdef, dx, dy, knockdistance, map, ctx?.player);
    if ((mdef.mx !== oldx || mdef.my !== oldy || DEADMONSTER(mdef))
        && map?.at?.(oldx, oldy)?.mem_invis) {
        map.at(oldx, oldy).mem_invis = false;
        newsym(oldx, oldy);
    }
    let kbFlags = M_ATTK_HIT;
    if (DEADMONSTER(mdef)) {
        kbFlags |= M_ATTK_DEF_DIED;
    } else if (!rn2(4)) {
        // C ref: uhitm.c:5383-5398 — extra stun chance after knockback
        mdef.mstun = 1;
    }
    return kbFlags;
}

// ============================================================================
// mdamagem — apply damage and special effects
// ============================================================================

// cf. mhitm.c:1015 — mdamagem(magr, mdef, mattk, mwep, dieroll)
// ctx: optional { player, turnCount } for corpse creation and XP
async function mdamagem(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx) {
    const mhm = {
        damage: c_d(mattk.damn || 0, mattk.damd || 0),
        hitflags: M_ATTK_MISS,
        permdmg: 0,
        specialdmg: 0,
        dieroll: dieroll,
        done: false,
    };

    // C ref: mhitm.c:1032-1057 — petrification check for touching cockatrice
    const pd = mdef.data || mdef.type || {};
    if (touch_petrifies(pd) && !resists_ston(magr)) {
        // Simplified: no glove/weapon check; just die
        // C ref: if attacker has no protective gear, turns to stone
        // For now, skip petrification (complex mechanic)
    }

    // Dispatch to AD_* handler
    await mhitm_adtyping_async(magr, mattk, mdef, mhm, {
        map,
        player: ctx?.player || null,
        display: display || null,
        fov: ctx?.fov || null,
        depth: ctx?.depth || 1,
    });

    // cf. mhitm.c — artifact damage bonus for monster-vs-monster
    if (mwep && mwep.oartifact) {
        const [bonus] = spec_dbon(mwep, mdef, mhm.damage);
        mhm.damage += bonus;
    }

    // C ref: mhitm.c:1061-1065 — mhitm_knockback
    const kbFlags = await mhitm_knockback_mm(magr, mdef, mattk, mwep, vis, display, map, ctx);
    if (kbFlags) {
        mhm.hitflags |= kbFlags;
        // C ref: mhitm.c mdamagem() returns early after successful knockback.
        if (kbFlags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) return mhm.hitflags;
    }

    if (mhm.done) return mhm.hitflags;
    if (!mhm.damage) return mhm.hitflags;

    // Apply damage
    mdef.mhp -= mhm.damage;
    if (mdef.mhp <= 0) {
        // C ref: mon.c:3384-3388 monkilled() — kill message gated on
        // cansee(mdef->mx, mdef->my), i.e. location in FOV, not monster
        // visibility.  An invisible monster dying at a visible location
        // still produces "It is killed!".
        if (cansee(map, ctx?.player, ctx?.fov, mdef.mx, mdef.my) && display) {
            const killVerb = nonliving(pd) ? 'destroyed' : 'killed';
            await display.putstr_message(
                `${monCombatName(mdef, ctx?.defVisible, { article: 'the', capitalize: true, player: ctx?.player || null })} is ${killVerb}!`
            );
        }
        mondead(mdef, map, ctx?.player);
        if (!DEADMONSTER(mdef)) {
            return mhm.hitflags; // lifesaved
        }

        // C ref: mon.c xkilled() → corpse_chance + mkcorpstat
        if (corpse_chance(mdef)
            && !(((pd.geno || 0) & G_NOCORPSE) !== 0)) {
            const canZombify = !mwep
                && zombie_maker(magr)
                && (mattk.aatyp === AT_TUCH || mattk.aatyp === AT_CLAW || mattk.aatyp === AT_BITE)
                && zombie_form(pd) !== NON_PM;
            const corpse = mkcorpstat(CORPSE, mdef.mndx || 0, true,
                mdef.mx, mdef.my, map, { zombify: canZombify });
            corpse.age = ctx?.turnCount || 1;
            if (map) newsym(mdef.mx, mdef.my);
        }

        if (mhm.hitflags === M_ATTK_AGR_DIED) {
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);
        }

        // C ref: mhitm.c:1115 — grow_up(magr, mdef)
        const grewUp = await grow_up(magr, mdef, _gstate);

        return (M_ATTK_DEF_DIED | (grewUp ? 0 : M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

// ============================================================================
// mattackm — main monster-vs-monster attack sequence
// ============================================================================

// cf. mhitm.c:292 — mattackm(magr, mdef)
// Shared m-vs-m attack used by pet combat (dogmove.js) and conflict (fightm).
// ctx: optional { player, turnCount } for corpse creation.
export async function mattackm(magr, mdef, display, vis, map, ctx) {
    if (!magr || !mdef) return M_ATTK_MISS;
    if (helpless(magr)) return M_ATTK_MISS;

    const pa = magr.data || magr.type || {};
    const pd = mdef.data || mdef.type || {};
    const attacks = pa.attacks || [];

    // C ref: mhitm.c:316 — grid bugs can't attack diagonally
    // (Skipped for simplicity — rare edge case)

    // Calculate armor class differential
    let tmp = find_mac(mdef) + (magr.m_lev ?? (pa.mlevel || 0));
    if (mdef.mconf || helpless(mdef)) {
        tmp += 4;
        if (mdef.msleeping) {
            mdef.msleeping = 0;
            mdef.sleeping = false;
        }
    }

    // C ref: mhitm.c:354 — elf vs orc bonus
    // TODO: implement elf/orc racial bonus

    // C ref: mhitm.c:366 — set mlstmv
    if (ctx?.turnCount) magr.mlstmv = ctx.turnCount;

    const res = new Array(NATTK).fill(M_ATTK_MISS);
    let struck = 0;
    let dieroll = 0;

    for (let i = 0; i < Math.min(attacks.length, NATTK); i++) {
        res[i] = M_ATTK_MISS;
        const mattk = attacks[i];
        if (!mattk || mattk.aatyp === AT_NONE) continue;

        // C ref: check if target still valid after previous attacks
        if (i > 0 && (DEADMONSTER(magr) || DEADMONSTER(mdef))) continue;

        let mwep = null;
        let attk = 1;
        let strike = 0;

        switch (mattk.aatyp) {
        case AT_WEAP:
            // C ref: mhitm.c:393-416 — weapon attack
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                // Ranged attack — simplified: skip
                strike = 0;
                attk = 0;
                break;
            }
            // C ref: mhitm.c:406-410 — wield best melee weapon
            if (magr.weapon_check === NEED_WEAPON || !magr.weapon) {
                magr.weapon_check = NEED_HTH_WEAPON;
                if (mon_wield_item(magr) !== 0)
                    return M_ATTK_MISS;
            }
            possibly_unwield(magr, false);
            mwep = magr.weapon || null;
            if (mwep) {
                await mswingsm(magr, mdef, mwep, display, vis, ctx);
                // C ref: mhitm.c mattackm() — temporary weapon to-hit bonus.
                tmp += hitval(mwep, mdef);
            }
            // Fall through to melee
            // FALLTHROUGH
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.aatyp === AT_KICK && /* mtrapped_in_pit */ false) {
                continue;
            }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                continue;
            }
            // C ref: cockatrice avoidance when has weapon
            // TODO: implement cockatrice touch avoidance

            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            // C ref: mhitm.c mattackm() — remove temporary hitval bonus.
            if (mwep) tmp -= hitval(mwep, mdef);
            if (strike) {
                // Check for grab failure on unsolid targets
                if (unsolid(pd) && failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll, display, vis, map, ctx);
            } else {
                await missmm(magr, mdef, mattk, display, vis, map, ctx);
            }
            break;

        case AT_HUGS:
            // C ref: mhitm.c:476 — automatic if prev two succeed
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                } else {
                    res[i] = await hitmm(magr, mdef, mattk, null, 0, display, vis, map, ctx);
                }
            }
            break;

        case AT_GAZE:
            strike = 0;
            res[i] = await gazemm(magr, mdef, mattk, display, vis, map, ctx);
            break;

        case AT_EXPL:
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            res[i] = await explmm(magr, mdef, mattk, display, vis, map, ctx);
            if (res[i] === M_ATTK_MISS) {
                strike = 0;
                attk = 0;
            } else {
                strike = 1;
            }
            break;

        case AT_ENGL:
            // C ref: mhitm.c:510-536 — engulf attack
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) continue;
            // Simplified: treat as hit attempt
            strike = (tmp > rnd(20 + i)) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                } else {
                    // Simplified: just do damage, no actual engulfing
                    res[i] = await mdamagem(magr, mdef, mattk, null, 0, display, vis, map, ctx);
                }
            } else {
                await missmm(magr, mdef, mattk, display, vis, map, ctx);
            }
            break;

        case AT_BREA:
        case AT_SPIT:
            // C ref: mhitm.c:538-564 — ranged attacks not at point blank
            // Simplified: skip ranged m-vs-m for now
            strike = 0;
            attk = 0;
            break;

        default:
            strike = 0;
            attk = 0;
            break;
        }

        // Passive counterattack
        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1) {
            res[i] = passivemm(magr, mdef, !!strike,
                               (res[i] & M_ATTK_DEF_DIED), mwep, map);
        }

        if (res[i] & M_ATTK_DEF_DIED) return res[i];
        if (res[i] & M_ATTK_AGR_DIED) return res[i];
        if ((res[i] & M_ATTK_AGR_DONE) || helpless(magr)) return res[i];
        if (res[i] & M_ATTK_HIT) struck = 1;
    }

    return struck ? M_ATTK_HIT : M_ATTK_MISS;
}

// ============================================================================
// fightm — monster fights other monsters (conflict)
// ============================================================================

// cf. mhitm.c:105 — fightm(mtmp)
// Returns 1 if an attack was made, 0 otherwise.
export async function fightm(mtmp, map, display, vis) {
    if (!map || !mtmp) return 0;

    // C ref: resist_conflict check — not implemented, proceed
    // C ref: itsstuck check — not implemented

    for (const mon of map.monsters) {
        if (mon === mtmp || DEADMONSTER(mon)) continue;
        if (monnear(mtmp, mon.mx, mon.my)) {
            const result = await mattackm(mtmp, mon, display, vis, map);
            if (result & M_ATTK_AGR_DIED) return 1;
            return (result & M_ATTK_HIT) ? 1 : 0;
        }
    }
    return 0;
}

// ============================================================================
// mdisplacem — attacker displaces defender
// ============================================================================

// C ref: mhitm.c:178 mdisplacem() — attacker displaces defender
export function mdisplacem(magr, mdef, quietly, map) {
    if (!magr || !mdef || magr === mdef || !map) return M_ATTK_MISS;

    const tx = mdef.mx, ty = mdef.my; // destination
    const fx = magr.mx, fy = magr.my; // current location

    // 1 in 7 failure
    if (!rn2(7)) return M_ATTK_MISS;

    // Grid bugs can't displace diagonally
    if (magr.mndx === PM_GRID_BUG && fx !== tx && fy !== ty)
        return M_ATTK_MISS;

    if (mdef.mundetected) mdef.mundetected = false;
    if (mdef.msleeping) {
        mdef.msleeping = 0;
        mdef.sleeping = false;
    }

    // Petrification check: aggressor touching cockatrice
    const pd = mdef.data || mdef.type || {};
    if (touch_petrifies(pd) && !resists_ston(magr)) {
        const gloves = magr.misc_worn_check & W_ARMG;
        if (!gloves) {
            // Aggressor turns to stone
            magr.mhp = 0;
            mondead(magr, map);
            return M_ATTK_AGR_DIED;
        }
    }

    // Swap positions — map uses mx/my for monsterAt lookups
    magr.mx = tx; magr.my = ty;
    mdef.mx = fx; mdef.my = fy;

    return M_ATTK_HIT;
}

// ============================================================================
// mon_poly — polymorph attack on monster
// ============================================================================

// C ref: mhitm.c:807 engulf_target() — check if engulf is possible
export function engulf_target(magr, mdef) {
    if (!magr || !mdef) return false;
    const adat = magr.data || magr.type || {};
    const ddat = mdef.data || mdef.type || {};
    // Can't swallow something too big
    if ((ddat.msize || 0) >= MZ_HUGE) return false;
    if ((adat.msize || 0) < (ddat.msize || 0) && !is_whirly(adat)) return false;
    // Can't engulf if either is trapped
    if (mdef.mtrapped || magr.mtrapped) return false;
    return true;
}

// C ref: mhitm.c:849 gulpmm() — engulf m-vs-m
// Simplified: check eligibility, do damage, don't actually move positions.
// Full engulf with position swapping deferred until map APIs mature.
export function gulpmm(magr, mdef, mattk, map, vis, display) {
    if (!engulf_target(magr, mdef)) return M_ATTK_MISS;
    // For now, fall through to normal damage via mattackm/mdamagem.
    // The AT_ENGL handler in mattackm already does simplified damage.
    return M_ATTK_HIT;
}

// C ref: mhitm.c:1121 mon_poly() — polymorph attack on monster
// Simplified: polymorph subsystem (newcham) not ported.
// Consumes rnd(2) for mspec_used cooldown to match RNG.
export function mon_poly(magr, mdef, dmg) {
    // C ref: newcham not ported — just apply damage
    // Cooldown: can't poly again next turn
    if (magr) magr.mspec_used = (magr.mspec_used || 0) + c_d(1, 2);
    return dmg;
}

// ============================================================================
// mswingsm — weapon swing message
// ============================================================================

// cf. mhitm.c:1282 — mswingsm(magr, mdef, obj)
export async function mswingsm(magr, mdef, otemp, display, vis, ctx) {
    if (!vis || !display) return;
    const bash = false; // is_pole check omitted; adjacent polearm bash not yet needed
    const verb = monsterWeaponSwingVerb(otemp, bash);
    const oneOf = ((otemp.quan || 1) > 1) ? 'one of ' : '';
    const agrName = monCombatName(magr, ctx?.agrVisible, { capitalize: true, player: ctx?.player || null });
    const defName = monCombatName(mdef, ctx?.defVisible, { player: ctx?.player || null });
    await display.putstr_message(
        `${agrName} ${verb} ${oneOf}${monsterPossessive(magr)} ${xname(otemp)} at ${defName}.`
    );
}

// C ref: mhitm.c — attack verb for monster-vs-monster display
export function attackVerb(type) {
    switch (type) {
        case AT_BITE: return 'bites';
        case AT_CLAW: return 'claws';
        // C ref: mhitm.c hitmm() uses generic "hits" for AT_KICK.
        case AT_KICK: return 'hits';
        case AT_BUTT: return 'butts';
        case AT_TUCH: return 'touches';
        case AT_STNG: return 'stings';
        case AT_WEAP: return 'hits';
        default: return 'hits';
    }
}
