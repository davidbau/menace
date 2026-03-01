// mhitu.js -- Monster-vs-hero combat
// cf. mhitu.c — monster attacks hero (mattacku, hitmu, missmu, etc.)
// Hero-vs-monster combat has moved to uhitm.js.

import { rn2, rnd, rn1, c_d, d } from './rng.js';
import {
    A_STR, A_DEX, A_CON, A_WIS, A_INT,
    CONFUSION, STUNNED, BLINDED, HALLUC, TIMEOUT,
    FIRE_RES, COLD_RES, SHOCK_RES, SLEEP_RES, POISON_RES, DRAIN_RES,
    ACID_RES, FREE_ACTION, FAST, SICK_RES, STONE_RES, REFLECTING,
    MALE, FEMALE,
} from './config.js';
import {
    G_UNIQ, M2_NEUTER, M2_MALE, M2_FEMALE, M2_PNAME,
    MZ_HUMAN, MZ_HUGE,
    AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_HUGS,
    AT_TENT, AT_WEAP, AT_ENGL, AT_NONE, AT_BOOM, AT_EXPL, AT_GAZE, AT_SPIT, AT_BREA, AT_MAGC,
    S_NYMPH, PM_AMOROUS_DEMON, PM_MEDUSA, PM_BALROG,
    AD_PHYS, AD_FIRE, AD_COLD, AD_SLEE, AD_ELEC, AD_DRST, AD_SLOW,
    AD_PLYS, AD_DRLI, AD_DREN, AD_STON, AD_STCK, AD_TLPT, AD_CONF,
    AD_DRIN, AD_ACID, AD_BLND, AD_STUN, AD_WRAP, AD_RUST, AD_CORR,
    AD_DCAY, AD_SGLD, AD_SEDU, AD_SITM, AD_SSEX, AD_SLIM, AD_POLY,
    AD_ENCH, AD_DISE, AD_HALU, AD_CURS, AD_WERE, AD_HEAL, AD_LEGS,
    AD_DGST, AD_SAMU, AD_DETH, AD_PEST, AD_FAMN, AD_DRDX, AD_DRCO,
    AD_MAGM, AD_DISN,
    mons,
} from './monsters.js';
import { objectData, BULLWHIP } from './objects.js';
import { xname } from './mkobj.js';
import {
    x_monnam, is_humanoid, thick_skinned,
    resists_fire, resists_cold, resists_elec, resists_acid, resists_ston,
    sticks, unsolid, attacktype, is_demon, is_were, is_human,
    is_animal, digests, enfolds, is_whirly, haseyes, perceives,
    dmgtype, dmgtype_fromattack,
} from './mondata.js';
import {
    weaponEnchantment, weaponDamageSides,
    mhitm_mgc_atk_negated,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
} from './uhitm.js';
import { thrwmu, spitmu, breamu } from './mthrowu.js';
import { castmu } from './mcastu.js';
import { exercise } from './attrib_exercise.js';
import { make_confused, make_stunned, make_blinded, make_hallucinated } from './potion.js';
import { losexp } from './exper.js';
import { stealgold, steal } from './steal.js';
import { erode_obj, ERODE_RUST, ERODE_CORRODE, ERODE_ROT,
         EF_GREASE, EF_VERBOSE } from './trap.js';
import { xkilled, XKILL_NOMSG } from './mon.js';
import { mondead } from './monutil.js';
import { mon_explodes } from './explode.js';
import { spec_dbon } from './artifact.js';
import { msummon } from './minion.js';
import { new_were, were_summon } from './were.js';
import { Mgender } from './do_name.js';
import { resists_blnd } from './zap.js';
import { canonicalizeAttackFields } from './attack_fields.js';

const PIERCE = 1;


// ============================================================================
// Hit/miss messages
// ============================================================================

// cf. mhitu.c:30 hitmsg() — monster hits hero message.
// Prints the appropriate hit verb for the attack type.
function hitmsg(monster, attack, display, suppressHitMsg) {
    if (suppressHitMsg) return;
    let verb;
    switch (attack.aatyp) {
    case AT_BITE: verb = 'bites'; break;
    case AT_KICK:
        verb = 'kicks';
        break;
    case AT_STNG: verb = 'stings'; break;
    case AT_BUTT: verb = 'butts'; break;
    case AT_TUCH: verb = 'touches you'; break;
    case AT_TENT: verb = 'tentacles suck your brain'; break;
    default: verb = 'hits'; break;
    }
    display.putstr_message(`The ${x_monnam(monster)} ${verb}!`);
}

// cf. mhitu.c mswings_verb() / mswings().
export function monsterWeaponSwingVerb(weapon, bash = false) {
    if (!weapon) return 'swings';
    const info = objectData[weapon.otyp] || {};
    const dir = Number.isInteger(info.dir) ? info.dir : 0;
    const lash = weapon.otyp === BULLWHIP;
    const thrust = (dir & PIERCE) !== 0 && (((dir & ~PIERCE) === 0) || !rn2(2));

    if (bash) return 'bashes with';
    if (lash) return 'lashes';
    return thrust ? 'thrusts' : 'swings';
}

// cf. mondata.c pronoun_gender() and mhis().
export function monsterPossessive(monster) {
    const mdat = monster?.type || {};
    const flags2 = mdat.flags2 || 0;
    if (flags2 & M2_NEUTER) return 'its';

    const useGenderedPronoun = is_humanoid(mdat)
        || !!((mdat.geno || 0) & G_UNIQ)
        || !!(flags2 & M2_PNAME);
    if (!useGenderedPronoun) return 'its';

    if (flags2 & M2_FEMALE) return 'her';
    if (flags2 & M2_MALE) return 'his';
    return monster?.female ? 'her' : 'his';
}

// cf. mhitu.c AT_WEAP swing path (partial).
function maybeMonsterWeaponSwingMessage(monster, player, display, suppressHitMsg) {
    if (!monster?.weapon || suppressHitMsg) return;
    if (player?.blind) return;
    if (monster.minvis && !player?.seeInvisible) return;

    const bash = false;
    const swingVerb = monsterWeaponSwingVerb(monster.weapon, bash);
    const oneOf = ((monster.weapon.quan || 1) > 1) ? 'one of ' : '';
    display.putstr_message(
        `The ${x_monnam(monster)} ${swingVerb} ${oneOf}${monsterPossessive(monster)} ${xname(monster.weapon)}.`
    );
}


// ============================================================================
// Flee/track helpers
// ============================================================================

// cf. monmove.c mon_track_clear().
function clearMonsterTrack(monster) {
    if (!Array.isArray(monster?.mtrack)) return;
    for (let i = 0; i < monster.mtrack.length; i++) {
        monster.mtrack[i] = { x: 0, y: 0 };
    }
}

// cf. monmove.c monflee() subset used by melee morale checks.
export function applyMonflee(monster, fleetime, first = false) {
    const oldFleetim = Number(monster?.fleetim || 0);
    if (!first || !monster.flee) {
        if (!fleetime) {
            monster.fleetim = 0;
        } else if (!monster.flee || oldFleetim > 0) {
            let nextFleetim = fleetime + oldFleetim;
            if (nextFleetim === 1) nextFleetim = 2;
            monster.fleetim = Math.min(nextFleetim, 127);
        }
        monster.flee = true;
    }
    clearMonsterTrack(monster);
}


// ============================================================================
// Player resistance helpers
// ============================================================================

function playerHasProp(player, prop) {
    return player.hasProp ? player.hasProp(prop) : false;
}

// cf. attrib.c drain_en() — drain hero's spell energy
function drain_en(player, amount) {
    if (!player) return;
    const pw = player.pw || 0;
    if (pw > 0) {
        player.pw = Math.max(0, pw - amount);
    }
    // C also drains pwmax: if (amount > 0) { u.uenmax -= (amount+1)/2; clamp }
    const pmax = player.pwmax || 0;
    if (amount > 0 && pmax > 0) {
        player.pwmax = Math.max(0, pmax - Math.floor((amount + 1) / 2));
    }
}


// ============================================================================
// Knockback (shared between mhitu and mhitm)
// ============================================================================

// cf. uhitm.c:5225 mhitm_knockback() — RNG + eligibility check.
// Always consumes rn2(3) for distance and rn2(chance) for trigger.
// Returns true if knockback would qualify (but we don't implement movement).
function mhitm_knockback(monster, attack, weaponUsed, display) {
    rn2(3);  // knockback distance: 67% 1 step, 33% 2 steps
    const chance = 6; // default 1/6 chance; Ogresmasher would use 2
    if (rn2(chance)) return false; // didn't trigger

    // Eligibility: only AD_PHYS + specific attack types
    if (!(attack.adtyp === AD_PHYS
          && (attack.aatyp === AT_CLAW || attack.aatyp === AT_KICK
              || attack.aatyp === AT_BUTT || attack.aatyp === AT_WEAP))) {
        return false;
    }

    // C ref: uhitm.c:5288 — attacker engulfs/hugs/sticks → no knockback
    const mdat = monster?.type || {};
    if (attacktype(mdat, AT_ENGL) || attacktype(mdat, AT_HUGS) || sticks(mdat)) {
        return false;
    }

    // Size check: attacker must be much larger than defender
    const agrSize = mdat.msize ?? 0;
    const defSize = MZ_HUMAN; // hero is human-sized
    if (!(agrSize > defSize + 1)) return false;

    // C ref: uhitm.c:5303 — unsolid attacker can't knockback
    if (unsolid(mdat)) return false;

    // C ref: uhitm.c:5326 — m_is_steadfast (stub: hero steadfastness not checked here)
    // C ref: uhitm.c:5338 — movement validation (stub: test_move not ported)

    // cf. uhitm.c:5350-5352 — knockback message
    const adj = rn2(2) ? 'forceful' : 'powerful';
    const noun = rn2(2) ? 'blow' : 'strike';
    if (display) {
        display.putstr_message(
            `The ${x_monnam(monster)} knocks you back with a ${adj} ${noun}!`
        );
    }

    // C ref: uhitm.c:5383-5398 — stun chance
    // For mon-vs-hero, stun effect would apply to hero (complex); skip for now

    return true;
}


// ============================================================================
// mhitu AD_* handlers — monster attacks hero (mhitu branch of each handler)
// Each matches its C counterpart's `mdef == &gy.youmonst` branch.
// ============================================================================

// cf. uhitm.c:3959 mhitm_ad_phys — mhitu branch (uhitm.c:3999-4105)
function mhitu_ad_phys(monster, attack, player, mhm, ctx) {
    const { display, suppressHitMsg } = ctx;

    if (attack.aatyp === AT_HUGS) {
        // Grab attack — rn2(2) for grab attempt
        if (!player.ustuck && rn2(2)) {
            // Grabbed
            player.ustuck = monster;
            display.putstr_message(`The ${x_monnam(monster)} grabs you!`);
            mhm.hitflags |= M_ATTK_HIT;
        } else if (player.ustuck === monster) {
            exercise(player, A_STR, false);
            display.putstr_message('You are being crushed.');
        } else {
            mhm.damage = 0;
            mhm.hitflags |= M_ATTK_MISS;
        }
    } else {
        // Hand-to-hand / weapon attack
        if (attack.aatyp === AT_WEAP && monster.weapon) {
            // Weapon damage: dmgval equivalent
            const wsdam = weaponDamageSides(monster.weapon, null);
            if (wsdam > 0) mhm.damage += rnd(wsdam);
            // Gauntlets of power: rn1(4,3) — skip, monsters rarely have them
            if (mhm.damage <= 0) mhm.damage = 1;
            hitmsg(monster, attack, display, suppressHitMsg);
            mhm.hitflags |= M_ATTK_HIT;
            // Weapon enchantment
            mhm.damage += weaponEnchantment(monster.weapon);
            // cf. mhitu.c — artifact damage bonus
            if (monster.weapon.oartifact) {
                const [bonus] = spec_dbon(monster.weapon, player, mhm.damage);
                mhm.damage += bonus;
            }
            // Weapon poison: C checks dieroll <= 5 for poisoned weapons
            // TODO: implement weapon poison path
        } else if (attack.aatyp !== AT_TUCH || mhm.damage !== 0
                   || monster !== player.ustuck) {
            hitmsg(monster, attack, display, suppressHitMsg);
            mhm.hitflags |= M_ATTK_HIT;
        }
    }
}

// cf. uhitm.c:2539 mhitm_ad_fire — mhitu branch
function mhitu_ad_fire(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!mhitm_mgc_atk_negated(monster, player)) {
        if (!ctx.suppressHitMsg) {
            ctx.display.putstr_message("You're on fire!");
        }
        if (playerHasProp(player, FIRE_RES)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message("The fire doesn't feel hot!");
            mhm.damage = 0;
        }
        // cf. uhitm.c:2557 — destroy_items check: magr->m_lev > rn2(20)
        if (monster.mlevel > rn2(20)) {
            // destroy_items() — not implemented, but RNG consumed
        }
    } else {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:2626 mhitm_ad_cold — mhitu branch
function mhitu_ad_cold(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!mhitm_mgc_atk_negated(monster, player)) {
        if (!ctx.suppressHitMsg) {
            ctx.display.putstr_message("You're covered in frost!");
        }
        if (playerHasProp(player, COLD_RES)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message("The frost doesn't seem cold!");
            mhm.damage = 0;
        }
        // cf. uhitm.c:2638 — destroy_items check
        if (monster.mlevel > rn2(20)) {
            // destroy_items() — not implemented
        }
    } else {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:2684 mhitm_ad_elec — mhitu branch
function mhitu_ad_elec(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!mhitm_mgc_atk_negated(monster, player)) {
        if (!ctx.suppressHitMsg) {
            ctx.display.putstr_message('You get zapped!');
        }
        if (playerHasProp(player, SHOCK_RES)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message("The zap doesn't shock you!");
            mhm.damage = 0;
        }
        // cf. uhitm.c:2696 — destroy_items check
        if (monster.mlevel > rn2(20)) {
            // destroy_items() — not implemented
        }
    } else {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:2728 mhitm_ad_acid — mhitu branch
function mhitu_ad_acid(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!magr->mcan && !rn2(3)) — acid effect
    if (!monster.mcan && !rn2(3)) {
        if (playerHasProp(player, ACID_RES)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message("You're covered in acid, but it seems harmless.");
            mhm.damage = 0;
        } else {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message("You're covered in acid!  It burns!");
            exercise(player, A_STR, false);
        }
    } else {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:3299 mhitm_ad_stck — mhitu branch
function mhitu_ad_stck(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!negated && !player.ustuck) {
        player.ustuck = monster;
    }
}

// cf. uhitm.c:3354 mhitm_ad_wrap — mhitu branch
function mhitu_ad_wrap(monster, attack, player, mhm, ctx) {
    if ((!monster.mcan || player.ustuck === monster)) {
        if (!player.ustuck && !rn2(10)) {
            // Grab attempt
            player.ustuck = monster;
            if (!ctx.suppressHitMsg) {
                ctx.display.putstr_message(
                    `The ${x_monnam(monster)} swings itself around you!`
                );
            }
        } else if (player.ustuck === monster) {
            // Already grabbed — crushing
            if (attack.aatyp === AT_HUGS) {
                if (!ctx.suppressHitMsg)
                    ctx.display.putstr_message('You are being crushed.');
            }
        } else {
            mhm.damage = 0;
        }
    } else {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:3421 mhitm_ad_plys — mhitu branch
function mhitu_ad_plys(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (multi >= 0 && !rn2(3) && !mhitm_mgc_atk_negated(...))
    const game = ctx.game;
    const multi = game ? (game.multi || 0) : 0;
    if (multi >= 0 && !rn2(3)
        && !mhitm_mgc_atk_negated(monster, player)) {
        if (playerHasProp(player, FREE_ACTION)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message('You momentarily stiffen.');
        } else {
            if (!ctx.suppressHitMsg) {
                ctx.display.putstr_message(
                    `You are frozen by ${x_monnam(monster)}!`
                );
            }
            // cf. nomul(-rnd(10))
            if (game) {
                game.multi = -rnd(10);
                game.nomovemsg = 'You can move again.';
            }
            exercise(player, A_DEX, false);
        }
    }
}

// cf. uhitm.c:3470 mhitm_ad_slee — mhitu branch
function mhitu_ad_slee(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (multi >= 0 && !rn2(5) && !mhitm_mgc_atk_negated(...))
    const game = ctx.game;
    const multi = game ? (game.multi || 0) : 0;
    if (multi >= 0 && !rn2(5)
        && !mhitm_mgc_atk_negated(monster, player)) {
        if (playerHasProp(player, SLEEP_RES)) {
            // Sleep resistance — no effect
            return;
        }
        // cf. fall_asleep(-rnd(10), TRUE)
        if (game) {
            game.multi = -rnd(10);
            game.nomovemsg = 'You can move again.';
        }
        if (!ctx.suppressHitMsg) {
            ctx.display.putstr_message(
                `You are put to sleep by ${x_monnam(monster)}!`
            );
        }
    }
}

// cf. uhitm.c:3679 mhitm_ad_conf — mhitu branch
function mhitu_ad_conf(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!magr->mcan && !rn2(4) && !magr->mspec_used)
    // NOTE: no mhitm_mgc_atk_negated in C for AD_CONF mhitu!
    if (!monster.mcan && !rn2(4) && !monster.mspec_used) {
        monster.mspec_used = (monster.mspec_used || 0) + mhm.damage + rn2(6);
        if (!ctx.suppressHitMsg) {
            if (player.confused)
                ctx.display.putstr_message('You are getting even more confused.');
            else
                ctx.display.putstr_message('You are getting confused.');
        }
        // cf. make_confused(HConfusion + damage, FALSE)
        const oldTimeout = player.getPropTimeout
            ? player.getPropTimeout(CONFUSION)
            : 0;
        make_confused(player, oldTimeout + mhm.damage, false);
    }
    mhm.damage = 0;
}

// cf. uhitm.c:4381 mhitm_ad_stun — mhitu branch
function mhitu_ad_stun(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!magr->mcan && !rn2(4))
    if (!monster.mcan && !rn2(4)) {
        // cf. make_stunned((HStun & TIMEOUT) + damage, TRUE)
        const oldTimeout = player.getPropTimeout
            ? player.getPropTimeout(STUNNED)
            : 0;
        make_stunned(player, oldTimeout + mhm.damage, true);
        mhm.damage = Math.floor(mhm.damage / 2);
    }
}

// cf. uhitm.c:2954 mhitm_ad_blnd — mhitu branch
function mhitu_ad_blnd(monster, attack, player, mhm, ctx) {
    // C: if (can_blnd(magr, mdef, mattk->aatyp, NULL)) — simplified: always can
    if (!player.blind) {
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message(`The ${x_monnam(monster)} blinds you!`);
    }
    // cf. make_blinded(BlindedTimeout + damage, FALSE)
    const oldTimeout = player.getPropTimeout
        ? player.getPropTimeout(BLINDED)
        : 0;
    make_blinded(player, oldTimeout + mhm.damage, false);
    mhm.damage = 0;
}

// cf. uhitm.c:3121 mhitm_ad_drst — mhitu branch (poison: STR/DEX/CON drain)
function mhitu_ad_drst(monster, attack, player, mhm, ctx) {
    // C: negated = mhitm_mgc_atk_negated() — consumed at top of handler
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!negated && !rn2(8)) {
        // C: poisoned(buf, ptmp, ..., 30, FALSE)
        // ptmp depends on adtyp: AD_DRST→A_STR, AD_DRDX→A_DEX, AD_DRCO→A_CON
        let ptmp = A_STR;
        switch (attack.adtyp) {
        case AD_DRST: ptmp = A_STR; break;
        case AD_DRDX: ptmp = A_DEX; break;
        case AD_DRCO: ptmp = A_CON; break;
        }
        // poisoned() in C consumes rn2(hpdamchance=30) for HP damage vs attr drain.
        // For now: apply attribute drain and print message.
        if (playerHasProp(player, POISON_RES)) {
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message('The poison doesn\'t seem to affect you.');
        } else {
            // C: poisoned() with hpdamchance=30 → !rn2(30) for instant kill
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message('You feel very sick!');
            // Drain the appropriate attribute
            if (player.attributes && player.attributes[ptmp] > 1) {
                player.attributes[ptmp]--;
            }
            exercise(player, A_CON, false);
        }
    }
}

// cf. uhitm.c:2457 mhitm_ad_drli — mhitu branch (level drain)
function mhitu_ad_drli(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!rn2(3) && !Drain_resistance && !mhitm_mgc_atk_negated(...))
    // Note: rn2(3) BEFORE negation check — short-circuit!
    if (!rn2(3) && !playerHasProp(player, DRAIN_RES)
        && !mhitm_mgc_atk_negated(monster, player)) {
        losexp(player, ctx.display, x_monnam(monster));
    }
}

// cf. uhitm.c:2408 mhitm_ad_dren — mhitu branch (energy drain)
function mhitu_ad_dren(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!negated && !rn2(4)) {
        // cf. drain_en(damage, FALSE)
        drain_en(player, mhm.damage);
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3200 mhitm_ad_drin — mhitu branch (mind flayer brain drain)
function mhitu_ad_drin(monster, attack, player, mhm, ctx) {
    // C: no mhitm_mgc_atk_negated for AD_DRIN mhitu!
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: helmet check: if (player.helmet && rn2(8)) blocks attack
    if (player.helmet && rn2(8)) {
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('Your helmet blocks the attack to your head.');
        return;
    }
    // C: mdamageu(magr, damage) then eat_brains
    // Simplified: apply INT drain
    // cf. adjattrib(A_INT, -rnd(2), FALSE)
    // Then: !rn2(5) → losespells, !rn2(5) → drain_weapon_skill
    if (!ctx.suppressHitMsg)
        ctx.display.putstr_message('Your brain is being eaten!');
    // INT drain
    const intLoss = rnd(2);
    if (player.attributes && player.attributes[1] > 3) { // A_INT=1
        player.attributes[1] = Math.max(3, player.attributes[1] - intLoss);
    }
    rn2(5); // losespells check
    rn2(5); // drain_weapon_skill check
}

// cf. uhitm.c:3649 mhitm_ad_slow — mhitu branch
function mhitu_ad_slow(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!negated && HFast && !rn2(4)) u_slow_down()
    if (!negated && playerHasProp(player, FAST) && !rn2(4)) {
        // u_slow_down: remove Fast intrinsic
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('You slow down.');
        // TODO: actually remove Fast
    }
}

// cf. uhitm.c:4190 mhitm_ad_ston — mhitu branch (stoning)
function mhitu_ad_ston(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!rn2(3)) — 1/3 chance
    // No mhitm_mgc_atk_negated for AD_STON mhitu!
    if (!rn2(3)) {
        if (monster.mcan) {
            // Cancelled: just a cough
            if (!ctx.suppressHitMsg)
                ctx.display.putstr_message(
                    `You hear a cough from ${x_monnam(monster)}!`
                );
        } else {
            // Hissing + possible petrification
            if (!ctx.suppressHitMsg) {
                ctx.display.putstr_message(
                    `You hear ${x_monnam(monster)}'s hissing!`
                );
            }
            // C: if (!rn2(10) || newmoon) do_stone_u()
            if (!rn2(10)) {
                // Petrification — not fully implemented
                if (!ctx.suppressHitMsg) {
                    ctx.display.putstr_message('You feel yourself slowing down.');
                }
            }
        }
    }
}

// cf. uhitm.c:2862 mhitm_ad_tlpt — mhitu branch
function mhitu_ad_tlpt(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (mhitm_mgc_atk_negated(magr, mdef, FALSE))
    if (mhitm_mgc_atk_negated(monster, player)) {
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('You are not affected.');
    } else {
        // Teleport hero — not implemented
        // C: if (damage >= u.uhp) cap damage
        if (mhm.damage >= player.uhp) {
            if (player.uhp === 1) player.uhp++;
            mhm.damage = player.uhp - 1;
        }
    }
}

// cf. uhitm.c:2793 mhitm_ad_sgld — mhitu branch (steal gold)
function mhitu_ad_sgld(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (player && ctx.display) {
        stealgold(monster, player, ctx.display);
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3015 mhitm_ad_curs — mhitu branch
function mhitu_ad_curs(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!magr->mcan && !rn2(10)) — curse effect
    if (!monster.mcan && !rn2(10)) {
        // Curse items — not fully implemented
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('You feel as if you need some help.');
    }
    mhm.damage = 0;
}

// cf. uhitm.c:3531 mhitm_ad_slim — mhitu branch (slime)
function mhitu_ad_slim(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (negated) {
        return; // physical damage only
    }
    // Slime transformation — not implemented
    mhm.damage = 0;
}

// cf. uhitm.c:3589 mhitm_ad_ench — mhitu branch (disenchant)
function mhitu_ad_ench(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player);
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!negated) {
        // C: some_armor(mdef) then drain_item — consume rn2(5) for ring selection
        rn2(5);
        // Equipment drain — not fully implemented
    }
}

// cf. uhitm.c:3729 mhitm_ad_poly — mhitu branch (polymorph)
function mhitu_ad_poly(monster, attack, player, mhm, ctx) {
    const negated = mhitm_mgc_atk_negated(monster, player)
                    || !!monster.mspec_used;
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (!negated) {
        // Polymorph hero — not implemented
    }
}

// cf. uhitm.c:4254 mhitm_ad_were — mhitu branch (lycanthropy)
function mhitu_ad_were(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!rn2(4) && u.ulycn == NON_PM && !Protection_from_shape_changers
    //        && !defends(AD_WERE, player.weapon) && !mhitm_mgc_atk_negated(...))
    if (!rn2(4) && !mhitm_mgc_atk_negated(monster, player)) {
        // Lycanthropy — not implemented
        exercise(player, A_CON, false);
    }
}

// cf. uhitm.c:4274 mhitm_ad_heal — mhitu branch (nurse healing)
function mhitu_ad_heal(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // Nurse healing hero — complex, skip for now
    mhm.damage = 0;
}

// cf. uhitm.c:4403 mhitm_ad_legs — mhitu branch (leg wound)
function mhitu_ad_legs(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: xyloc check then leg damage — simplified
}

// cf. uhitm.c:4470 mhitm_ad_dgst — mhitu branch (digestion)
function mhitu_ad_dgst(monster, attack, player, mhm, ctx) {
    // Engulf/digestion — not handled here (gulpmu path)
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
}

// cf. uhitm.c:4557 mhitm_ad_samu — mhitu branch (steal amulet)
function mhitu_ad_samu(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!rn2(20)) stealamulet(magr)
    if (!rn2(20)) {
        // Steal quest artifact — not implemented
    }
}

// cf. uhitm.c:4582 mhitm_ad_dise — mhitu branch (disease)
function mhitu_ad_dise(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: if (!diseasemu(pa)) damage = 0
    if (!diseasemu(monster.type || monster.data || {}, player, ctx.display)) {
        mhm.damage = 0;
    }
}

// cf. uhitm.c:4611 mhitm_ad_sedu — mhitu branch (seduction/theft)
function mhitu_ad_sedu(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C ref: doseduce()/steal() — call steal for item theft
    if (player && ctx.display) {
        steal(monster, player, ctx.display);
    }
    mhm.damage = 0;
}

// cf. uhitm.c:4729 mhitm_ad_ssex — mhitu branch
function mhitu_ad_ssex(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    mhm.damage = 0;
}

// cf. uhitm.c:3827 mhitm_ad_deth — mhitu branch (Death's touch)
function mhitu_ad_deth(monster, attack, player, mhm, ctx) {
    if (!ctx.suppressHitMsg) {
        ctx.display.putstr_message(
            `The ${x_monnam(monster)} reaches out with its deadly touch.`
        );
    }
    // C: switch(rn2(20)) for death/drain/lucky outcomes
    const roll = rn2(20);
    if (roll >= 17) {
        // Touch of death — not fully implemented
        mhm.damage = 0;
    } else if (roll >= 5) {
        // Life force drain
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('You feel your life force draining away...');
        mhm.permdmg = 1;
    } else {
        // Lucky — no effect
        if (!ctx.suppressHitMsg)
            ctx.display.putstr_message('Lucky for you, it didn\'t work!');
        mhm.damage = 0;
    }
}

// cf. uhitm.c:3798 mhitm_ad_pest — mhitu branch (Pestilence)
function mhitu_ad_pest(monster, attack, player, mhm, ctx) {
    if (!ctx.suppressHitMsg) {
        ctx.display.putstr_message(
            `The ${x_monnam(monster)} reaches out, and you feel fever and chills.`
        );
    }
    // C: diseasemu(pa) — not implemented, keep damage
}

// cf. uhitm.c:3767 mhitm_ad_famn — mhitu branch (Famine)
function mhitu_ad_famn(monster, attack, player, mhm, ctx) {
    if (!ctx.suppressHitMsg) {
        ctx.display.putstr_message(
            `The ${x_monnam(monster)} reaches out, and your body shrivels.`
        );
    }
    exercise(player, A_CON, false);
    // C: morehungry(rn1(40, 40)) — hunger not implemented
    rn1(40, 40);
}

// cf. uhitm.c:3885 mhitm_ad_halu — mhitu branch
function mhitu_ad_halu(monster, attack, player, mhm, ctx) {
    const oldTimeout = player.getPropTimeout ? player.getPropTimeout(HALLUC) : (player.hallucinated || 0);
    make_hallucinated(player, oldTimeout + Math.max(1, mhm.damage || 0), false, 0);
    // C: damage = 0 for mhitu
    mhm.damage = 0;
}

// Equipment erosion handlers — hitmsg + erode armor + zero damage
function mhitu_ad_rust(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C ref: hurtarmor(mdef, AD_RUST) — erode hero's armor
    if (player) {
        // Erode a random worn armor piece
        const armor = player.armor || player.suit;
        if (armor) erode_obj(armor, null, ERODE_RUST, EF_GREASE | EF_VERBOSE);
    }
    mhm.damage = 0;
}
function mhitu_ad_corr(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (player) {
        const armor = player.armor || player.suit;
        if (armor) erode_obj(armor, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
    }
    mhm.damage = 0;
}
function mhitu_ad_dcay(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    if (player) {
        const armor = player.armor || player.suit;
        if (armor) erode_obj(armor, null, ERODE_ROT, EF_GREASE | EF_VERBOSE);
    }
    mhm.damage = 0;
}


// ============================================================================
// mhitu_adtyping() — central dispatcher for mhitu AD_* handlers
// ============================================================================

// cf. uhitm.c:4760 mhitm_adtyping() — mhitu branch dispatch.
// Replaces the old mhitu_adtyping_rng() stub with real handler calls.
function mhitu_adtyping(monster, attack, player, mhm, ctx) {
    const adtyp = attack.adtyp ?? AD_PHYS;
    switch (adtyp) {
    case AD_PHYS: mhitu_ad_phys(monster, attack, player, mhm, ctx); break;
    case AD_FIRE: mhitu_ad_fire(monster, attack, player, mhm, ctx); break;
    case AD_COLD: mhitu_ad_cold(monster, attack, player, mhm, ctx); break;
    case AD_ELEC: mhitu_ad_elec(monster, attack, player, mhm, ctx); break;
    case AD_ACID: mhitu_ad_acid(monster, attack, player, mhm, ctx); break;
    case AD_STCK: mhitu_ad_stck(monster, attack, player, mhm, ctx); break;
    case AD_WRAP: mhitu_ad_wrap(monster, attack, player, mhm, ctx); break;
    case AD_PLYS: mhitu_ad_plys(monster, attack, player, mhm, ctx); break;
    case AD_SLEE: mhitu_ad_slee(monster, attack, player, mhm, ctx); break;
    case AD_CONF: mhitu_ad_conf(monster, attack, player, mhm, ctx); break;
    case AD_STUN: mhitu_ad_stun(monster, attack, player, mhm, ctx); break;
    case AD_BLND: mhitu_ad_blnd(monster, attack, player, mhm, ctx); break;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO: mhitu_ad_drst(monster, attack, player, mhm, ctx); break;
    case AD_DRLI: mhitu_ad_drli(monster, attack, player, mhm, ctx); break;
    case AD_DREN: mhitu_ad_dren(monster, attack, player, mhm, ctx); break;
    case AD_DRIN: mhitu_ad_drin(monster, attack, player, mhm, ctx); break;
    case AD_SLOW: mhitu_ad_slow(monster, attack, player, mhm, ctx); break;
    case AD_STON: mhitu_ad_ston(monster, attack, player, mhm, ctx); break;
    case AD_TLPT: mhitu_ad_tlpt(monster, attack, player, mhm, ctx); break;
    case AD_SGLD: mhitu_ad_sgld(monster, attack, player, mhm, ctx); break;
    case AD_CURS: mhitu_ad_curs(monster, attack, player, mhm, ctx); break;
    case AD_SLIM: mhitu_ad_slim(monster, attack, player, mhm, ctx); break;
    case AD_ENCH: mhitu_ad_ench(monster, attack, player, mhm, ctx); break;
    case AD_POLY: mhitu_ad_poly(monster, attack, player, mhm, ctx); break;
    case AD_WERE: mhitu_ad_were(monster, attack, player, mhm, ctx); break;
    case AD_HEAL: mhitu_ad_heal(monster, attack, player, mhm, ctx); break;
    case AD_LEGS: mhitu_ad_legs(monster, attack, player, mhm, ctx); break;
    case AD_DGST: mhitu_ad_dgst(monster, attack, player, mhm, ctx); break;
    case AD_SAMU: mhitu_ad_samu(monster, attack, player, mhm, ctx); break;
    case AD_DISE: mhitu_ad_dise(monster, attack, player, mhm, ctx); break;
    case AD_SEDU:
    case AD_SITM: mhitu_ad_sedu(monster, attack, player, mhm, ctx); break;
    case AD_SSEX: mhitu_ad_ssex(monster, attack, player, mhm, ctx); break;
    case AD_DETH: mhitu_ad_deth(monster, attack, player, mhm, ctx); break;
    case AD_PEST: mhitu_ad_pest(monster, attack, player, mhm, ctx); break;
    case AD_FAMN: mhitu_ad_famn(monster, attack, player, mhm, ctx); break;
    case AD_HALU: mhitu_ad_halu(monster, attack, player, mhm, ctx); break;
    case AD_RUST: mhitu_ad_rust(monster, attack, player, mhm, ctx); break;
    case AD_CORR: mhitu_ad_corr(monster, attack, player, mhm, ctx); break;
    case AD_DCAY: mhitu_ad_dcay(monster, attack, player, mhm, ctx); break;
    default:
        // Unknown AD type — just show hit message, zero damage
        hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
        mhm.damage = 0;
        break;
    }
}


// ============================================================================
// mattacku — main monster-attacks-hero entry point
// ============================================================================

// cf. mhitu.c mattacku() / hitmu() — restructured to match C's flow.
// opts.range2: true if monster is not adjacent (ranged attacks only)
// opts.map: map object (needed for thrwmu ranged throwing)
export async function mattacku(monster, player, display, game = null, opts = {}) {
    if (!monster.attacks || monster.attacks.length === 0) return;
    if (monster.passive) return; // passive monsters don't initiate attacks

    const range2 = !!opts.range2;
    const map = opts.map || null;

    for (let i = 0; i < monster.attacks.length; i++) {
        const attack = canonicalizeAttackFields(monster.attacks[i]);

        // cf. mhitu.c mattacku() attack dispatch:
        // Melee attacks (AT_CLAW, AT_BITE, etc.) only fire when !range2.
        // AT_WEAP: melee when !range2, thrwmu when range2.
        // AT_BREA, AT_SPIT, AT_MAGC: ranged-only handlers.
        if (range2) {
            if (attack.aatyp === AT_WEAP) {
                // cf. mhitu.c:882-885 — AT_WEAP at range calls thrwmu
                if (map) await thrwmu(monster, map, player, display, game);
                continue;
            }
            if (attack.aatyp === AT_SPIT) {
                if (map) await spitmu(monster, attack, map, player, display, game);
                continue;
            }
            if (attack.aatyp === AT_BREA) {
                if (map) await breamu(monster, attack, map, player, display, game);
                continue;
            }
            if (attack.aatyp === AT_MAGC) {
                const vis = !player?.blind && !(monster.minvis && !player?.seeInvisible);
                await castmu(monster, attack, vis, true, player, map);
                continue;
            }
            // Skip melee-only attack types when at range
            continue;
        }

        const suppressHitMsg = !!(game && game._suppressMonsterHitMessagesThisTurn);

        // ================================================================
        // To-hit calculation (mattacku path)
        // ================================================================
        // cf. mhitu.c:707-708 — tmp = AC_VALUE(u.uac) + 10 + mtmp->m_lev
        // cf. AC_VALUE(ac) macro: ac >= 0 ? ac : -rnd(-ac)
        const playerAc = Number.isInteger(player.ac)
            ? player.ac
            : (Number.isInteger(player.effectiveAC) ? player.effectiveAC : 10);
        const acValue = (playerAc >= 0) ? playerAc : -rnd(-playerAc);
        const toHit = acValue + 10 + monster.mlevel;

        if (attack.aatyp === AT_WEAP && monster.weapon) {
            maybeMonsterWeaponSwingMessage(monster, player, display, suppressHitMsg);
        }

        const dieRoll = rnd(20 + i);

        if (toHit <= dieRoll) {
            // Miss — cf. mhitu.c:86-98 missmu()
            if (!suppressHitMsg) {
                const just = (toHit === dieRoll) ? 'just ' : '';
                display.putstr_message(`The ${x_monnam(monster)} ${just}misses!`);
            }
            continue;
        }

        // ================================================================
        // Hit! — hitmu() equivalent
        // ================================================================

        // cf. mhitu.c:1182 — base damage: d(dice, sides)
        const mhm = {
            damage: 0,
            hitflags: M_ATTK_MISS,
            permdmg: 0,
            done: false,
        };
        if (attack.damn && attack.damd) {
            mhm.damage = c_d(attack.damn, attack.damd);
        } else if (attack.dmg) {
            mhm.damage = c_d(attack.dmg[0], attack.dmg[1]);
        }

        // Context for handlers
        const ctx = { display, game, suppressHitMsg };

        // cf. mhitu.c:1187 — mhitm_adtyping dispatch
        // Each handler calls hitmsg() and applies effects.
        // For AD_PHYS + AT_WEAP, weapon damage is added inside the handler.
        mhitu_adtyping(monster, attack, player, mhm, ctx);

        // cf. mhitu.c:1189 — mhitm_knockback()
        const weaponUsed = !!(attack.aatyp === AT_WEAP && monster.weapon);
        mhitm_knockback(monster, attack, weaponUsed, display);

        // cf. mhitu.c:1192 — check if handler consumed the attack
        if (mhm.done) break;

        // ================================================================
        // Negative AC damage reduction (hitmu path)
        // ================================================================
        // cf. mhitu.c:1204 — if (damage && u.uac < 0) damage -= rnd(-u.uac)
        if (mhm.damage > 0 && playerAc < 0) {
            mhm.damage -= rnd(-playerAc);
            if (mhm.damage < 1) mhm.damage = 1;
        }

        // ================================================================
        // Apply damage
        // ================================================================
        if (mhm.damage > 0) {
            const died = player.takeDamage(mhm.damage, x_monnam(monster));

            // cf. allmain.c stop_occupation() via mhitu.c attack flow.
            if (game && game.occupation) {
                if (typeof game.stopOccupation === 'function') game.stopOccupation();
                else {
                    game.occupation = null;
                    game.multi = 0;
                }
            }

            if (died) {
                if (player.wizard) {
                    // cf. end.c savelife() for wizard/discover survival path.
                    const con = Number.isInteger(player.attributes?.[A_CON])
                        ? player.attributes[A_CON]
                        : 10;
                    const givehp = 50 + 10 * Math.floor(con / 2);
                    player.uhp = Math.min(player.uhpmax || givehp, givehp);
                    if (display) {
                        if (typeof display.clearRow === 'function') display.clearRow(0);
                        display.topMessage = null;
                        display.messageNeedsMore = false;
                        display.putstr_message('OK, so you don\'t die.');
                    }
                    if (game) {
                        game.nomovemsg = 'You survived that attempt on your life.';
                        game.multi = -1;
                        // C savelife intent: hero can't move again this turn.
                        // If movement points remain, we can drift turn-end
                        // processing by one replay step.
                        player.umovement = 0;
                        game.multi_reason = 'attempting to cheat Death';
                        game._suppressMonsterHitMessagesThisTurn = true;
                    }
                } else {
                    player.deathCause = `killed by a ${x_monnam(monster)}`;
                    display.putstr_message('You die...');
                }
                break;
            }
        }
    }
}


// ============================================================================
// TODO stubs for remaining mhitu.c functions
// ============================================================================

// --- Group 2: Poison/slow/wildmiss (mhitu.c:146-262) ---

// C ref: mhitu.c:146 mpoisons_subj() — poison delivery subject name
export function mpoisons_subj(monster, attack) {
    if (attack.aatyp === AT_WEAP) {
        const mwep = monster.weapon;
        return (!mwep || !mwep.opoisoned) ? 'attack' : 'weapon';
    }
    if (attack.aatyp === AT_TUCH) return 'contact';
    if (attack.aatyp === AT_BITE) return 'bite';
    return 'sting';
}

// C ref: mhitu.c:162 u_slow_down() — hero slowdown from attack
export function u_slow_down(player, display) {
    if (!player) return;
    // C ref: HFast = 0L — clear intrinsic speed
    player.fast = false;
    if (display) {
        if (!player.fast_from_extrinsic)
            display.putstr_message('You slow down.');
        else
            display.putstr_message('Your quickness feels less natural.');
    }
    exercise(player, A_DEX, false);
}

// C ref: mhitu.c:175 wildmiss() — displaced/invisible miss message
function wildmiss(monster, attack, player, display) {
    if (!display) return;
    // Simplified: just consume rn2(3) and show a message
    const name = x_monnam(monster);
    switch (rn2(3)) {
    case 0:
        display.putstr_message(`The ${name} swings wildly and misses!`);
        break;
    case 1:
        display.putstr_message(`The ${name} attacks a spot beside you.`);
        break;
    case 2:
        display.putstr_message(`The ${name} strikes at thin air!`);
        break;
    }
}

// --- Group 3: Engulf expulsion (mhitu.c:263-308) ---

// cf. mhitu.c:263 expels() — expel hero from engulfer
export function expels(mtmp, mdat, message, player, display) {
    if (!mtmp || !player) return;
    if (message && display) {
        if (digests(mdat)) {
            display.putstr_message('You get regurgitated!');
        } else if (enfolds(mdat)) {
            display.putstr_message(`The ${x_monnam(mtmp)} unfolds and you are released!`);
        } else {
            const attk = dmgtype_fromattack(mdat, AD_WRAP, AT_ENGL)
                      || dmgtype_fromattack(mdat, AD_PHYS, AT_ENGL);
            let blast = '';
            if (attk) {
                if (is_whirly(mdat)) {
                    const adtyp = attk.adtyp ?? attk.damage;
                    if (adtyp === AD_ELEC) blast = ' in a shower of sparks';
                    else if (adtyp === AD_COLD) blast = ' in a blast of frost';
                } else {
                    blast = ' with a squelch';
                }
            }
            display.putstr_message(`You get expelled from the ${x_monnam(mtmp)}${blast}!`);
        }
    }
    // Unstuck
    if (player.ustuck === mtmp) player.ustuck = null;
    // C: mnexto(mtmp), newsym, spoteffects — simplified, no map movement here
}

// --- Group 4: Attack dispatch (mhitu.c:309-953) ---

// C ref: mhitu.c:309 getmattk() — get (possibly modified) attack for index
// Simplified: handles mspec_used holdback, consecutive disease→stun.
// Missing: SEDUCE=0 substitution, energy scaling, elemental home doubling.
export function getmattk(monster, mdef, indx, prev_result) {
    const mptr = monster.type || {};
    const attacks = mptr.attacks || [];
    if (indx >= attacks.length) return null;
    const attk = { ...attacks[indx] };

    // Consecutive disease/pest/famn → stun
    if (indx > 0 && prev_result && prev_result[indx - 1] > M_ATTK_MISS) {
        const prevAttk = attacks[indx - 1];
        if ((attk.adtyp === AD_DISE || attk.adtyp === AD_PEST || attk.adtyp === AD_FAMN)
            && prevAttk && attk.adtyp === prevAttk.damage) {
            attk.adtyp = AD_STUN;
        }
    }

    // mspec_used holders/engulfers get fallback attack
    if (monster.mspec_used && (attk.aatyp === AT_ENGL || attk.aatyp === AT_HUGS
        || attk.adtyp === AD_STCK || attk.adtyp === AD_POLY)) {
        if (attk.adtyp === AD_ACID || attk.adtyp === AD_ELEC
            || attk.adtyp === AD_COLD || attk.adtyp === AD_FIRE) {
            attk.aatyp = AT_TUCH;
        } else {
            attk.aatyp = AT_CLAW;
            attk.adtyp = AD_PHYS;
        }
        attk.damn = 1;
        attk.damd = 6;
    }

    return attk;
}

// cf. mhitu.c:446 calc_mattacku_vars() — compute attack range/visibility variables
export function calc_mattacku_vars(mtmp, player) {
    const dx = Math.abs((mtmp.mx ?? 0) - (player.x ?? 0));
    const dy = Math.abs((mtmp.my ?? 0) - (player.y ?? 0));
    const dist = dx * dx + dy * dy;
    const ranged = dist > 3;
    // range2: monster thinks it's not near where hero is
    const range2 = dist > 2;
    const foundyou = ((mtmp.mux ?? mtmp.mx) === (player.x ?? 0))
                  && ((mtmp.muy ?? mtmp.my) === (player.y ?? 0));
    return { ranged, range2, foundyou };
}

// --- Group 5: Summoning/disease/slip (mhitu.c:954-1084) ---

// cf. mhitu.c:954 summonmu() — monster summons help for its fight against hero
export function summonmu(mtmp, youseeit, map, player, display) {
    const mdat = mtmp.type || mtmp.data || {};

    if (is_demon(mdat)) {
        if (mdat !== mons[PM_BALROG] && mdat !== mons[PM_AMOROUS_DEMON]) {
            // C: if (!rn2(Inhell ? 10 : 16)) msummon(mtmp)
            // Simplified: no Inhell check
            if (!rn2(16)) {
                msummon(mtmp, map, player, display);
            }
        }
        return;
    }

    if (is_were(mdat)) {
        // Maybe switch form
        if (is_human(mdat)) {
            // Maybe switch to animal form
            // C: if (!Protection_from_shape_changers && !rn2(5 - (night() * 2)))
            if (!rn2(5)) {
                new_were(mtmp);
            }
        } else {
            // Maybe switch back to human form
            if (!rn2(30)) {
                new_were(mtmp);
            }
        }

        // Maybe summon compatible critters
        if (!rn2(10)) {
            if (youseeit && display) {
                display.putstr_message(`The ${x_monnam(mtmp)} summons help!`);
            }
            const result = were_summon(
                mtmp.type || mtmp.data,
                mtmp.mx, mtmp.my,
                false, // not yours
                { player },
                map,
                player?.dungeonLevel || 1
            );
            if (youseeit && display) {
                if (result && result.total > 0) {
                    if (result.visible === 0)
                        display.putstr_message('You feel hemmed in.');
                } else {
                    display.putstr_message('But none comes.');
                }
            }
        }
    }
}

// cf. mhitu.c:1030 diseasemu() — disease attack on hero
export function diseasemu(mdat, player, display) {
    if (!player) return false;
    if (playerHasProp(player, SICK_RES)) {
        if (display) display.putstr_message('You feel a slight illness.');
        return false;
    } else {
        // C: make_sick(Sick ? Sick/3+1 : rn1(ACURR(A_CON), 20), ...)
        // Simplified: just apply disease status
        const con = (player.attributes && player.attributes[A_CON]) || 10;
        const duration = rn1(con, 20);
        if (display) display.putstr_message('You feel very sick!');
        // TODO: make_sick() not fully ported — mark player as diseased
        if (player.sick !== undefined) {
            player.sick = player.sick ? Math.floor(player.sick / 3) + 1 : duration;
        }
        return true;
    }
}

// cf. mhitu.c:1044 u_slip_free() — check whether slippery clothing protects from grab
export function u_slip_free(mtmp, mattk, player, display) {
    canonicalizeAttackFields(mattk);
    // Greased armor does not protect against AT_ENGL+AD_WRAP
    if (mattk.aatyp === AT_ENGL) return false;

    // Select the relevant armor piece
    let obj = player.cloak || player.armor || player.suit;
    if (!obj) obj = player.shirt;
    if (mattk.adtyp === AD_DRIN) obj = player.helmet;

    // If armor is greased or oilskin, monster slips off
    // (unless cursed, 1/3 chance of failure)
    if (obj && (obj.greased || obj.oilskin)
        && (!obj.cursed || rn2(3))) {
        if (display) {
            const adtyp = mattk.adtyp;
            const action = adtyp === AD_WRAP ? 'slips off of' : 'grabs you, but cannot hold onto';
            const adjective = obj.greased ? 'greased' : 'slippery';
            display.putstr_message(
                `The ${x_monnam(mtmp)} ${action} your ${adjective} ${xname(obj)}.`
            );
        }
        if (obj.greased && !rn2(2)) {
            if (display) display.putstr_message('The grease wears off.');
            obj.greased = 0;
        }
        return true;
    }
    return false;
}

// --- Group 7: Engulf/explode/gaze (mhitu.c:1269-1894) ---

// cf. mhitu.c:1284 gulpmu() — monster engulfs hero, or damages if already engulfed
export function gulpmu(mtmp, mattk, player, map, display) {
    if (!mtmp || !player) return M_ATTK_MISS;
    canonicalizeAttackFields(mattk);

    const tmp_dmg = c_d(mattk.damn || 0, mattk.damd || 0);
    let tmp = tmp_dmg;
    let physical_damage = false;

    if (!player.uswallow) {
        // Initial engulfment
        player.ustuck = mtmp;
        player.uswallow = true;
        if (display) {
            if (digests(mtmp.type || mtmp.data || {})) {
                display.putstr_message(`The ${x_monnam(mtmp)} swallows you whole!`);
            } else if (enfolds(mtmp.type || mtmp.data || {})) {
                display.putstr_message(`The ${x_monnam(mtmp)} folds itself around you!`);
            } else {
                display.putstr_message(`The ${x_monnam(mtmp)} engulfs you!`);
            }
        }
        // Compute swallow timer
        const adtyp = mattk.adtyp ?? AD_PHYS;
        let tim_tmp;
        if (adtyp === AD_DGST) {
            const con = (player.attributes && player.attributes[A_CON]) || 10;
            const ac = player.ac ?? player.effectiveAC ?? 10;
            tim_tmp = con + 10 - ac + rn2(20);
            if (tim_tmp < 0) tim_tmp = 0;
            tim_tmp = Math.floor(tim_tmp / (mtmp.m_lev || 1));
            tim_tmp += 3;
        } else {
            tim_tmp = rnd(Math.floor((mtmp.m_lev || 1) + 10 / 2));
        }
        player.uswldtim = (tim_tmp < 2) ? 2 : tim_tmp;
    }

    if (player.ustuck !== mtmp) return M_ATTK_MISS;

    if (player.uswldtim > 0) player.uswldtim -= 1;

    const adtyp = mattk.adtyp ?? AD_PHYS;
    switch (adtyp) {
    case AD_DGST:
        physical_damage = true;
        if (player.uswldtim === 0) {
            if (display) display.putstr_message(`The ${x_monnam(mtmp)} totally digests you!`);
            tmp = player.uhp || 999;
        } else {
            const suffix = (player.uswldtim === 2) ? ' thoroughly'
                         : (player.uswldtim === 1) ? ' utterly' : '';
            if (display)
                display.putstr_message(`The ${x_monnam(mtmp)}${suffix} digests you!`);
            exercise(player, A_STR, false);
        }
        break;
    case AD_PHYS:
        physical_damage = true;
        if (display) display.putstr_message('You are pummeled with debris!');
        exercise(player, A_STR, false);
        break;
    case AD_ACID:
        if (playerHasProp(player, ACID_RES)) {
            if (display) display.putstr_message('You are covered with a seemingly harmless goo.');
            tmp = 0;
        } else {
            if (display) display.putstr_message('You are covered in slime!  It burns!');
            exercise(player, A_STR, false);
        }
        break;
    case AD_BLND:
        // Blinding engulf
        if (!player.blind) {
            if (display) display.putstr_message("You can't see in here!");
            make_blinded(player, tmp, false);
        }
        tmp = 0;
        break;
    case AD_ELEC:
        if (!mtmp.mcan && rn2(2)) {
            if (display) display.putstr_message('The air around you crackles with electricity.');
            if (playerHasProp(player, SHOCK_RES)) {
                if (display) display.putstr_message('You seem unhurt.');
                tmp = 0;
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_COLD:
        if (!mtmp.mcan && rn2(2)) {
            if (playerHasProp(player, COLD_RES)) {
                if (display) display.putstr_message('You feel mildly chilly.');
                tmp = 0;
            } else {
                if (display) display.putstr_message('You are freezing to death!');
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_FIRE:
        if (!mtmp.mcan && rn2(2)) {
            if (playerHasProp(player, FIRE_RES)) {
                if (display) display.putstr_message('You feel mildly hot.');
                tmp = 0;
            } else {
                if (display) display.putstr_message('You are burning to a crisp!');
            }
        } else {
            tmp = 0;
        }
        break;
    case AD_DISE:
        if (!diseasemu(mtmp.type || mtmp.data, player, display)) tmp = 0;
        break;
    case AD_DREN:
        // AC magic cancellation doesn't help when engulfed
        if (!mtmp.mcan && rn2(4)) {
            drain_en(player, tmp);
        }
        tmp = 0;
        break;
    default:
        physical_damage = true;
        tmp = 0;
        break;
    }

    if (physical_damage) {
        // Same damage reduction for AC as in hitmu
        const playerAc = player.ac ?? player.effectiveAC ?? 10;
        if (playerAc < 0) {
            tmp -= rnd(-playerAc);
            if (tmp < 0) tmp = 1;
        }
    }

    // Apply damage via mdamageu
    mdamageu(mtmp, tmp, player, display);

    // Check for expulsion conditions
    if (player.uswallow) {
        if (!player.uswldtim) {
            if (display) {
                display.putstr_message(
                    digests(mtmp.type || mtmp.data || {}) ? 'You get regurgitated!'
                    : enfolds(mtmp.type || mtmp.data || {}) ? 'You get released!'
                    : 'You get expelled!'
                );
            }
            expels(mtmp, mtmp.type || mtmp.data || {}, false, player, display);
        }
    }

    return M_ATTK_HIT;
}

// cf. mhitu.c:1586 explmu() — monster explodes in hero's face
export async function explmu(mtmp, mattk, ufound, player, map, display) {
    if (!mtmp) return M_ATTK_MISS;
    if (mtmp.mcan) return M_ATTK_MISS;
    canonicalizeAttackFields(mattk);

    let tmp = c_d(mattk.damn || 0, mattk.damd || 0);
    const adtyp = mattk.adtyp ?? AD_PHYS;

    if (!ufound) {
        if (display) display.putstr_message(`The ${x_monnam(mtmp)} explodes at a spot in thin air!`);
    } else {
        hitmsg(mtmp, mattk, display, false);
    }

    let kill_agr = true;
    let not_affected = false;

    switch (adtyp) {
    case AD_COLD:
        not_affected = playerHasProp(player, COLD_RES);
        // fall through
    case AD_FIRE:
        if (adtyp === AD_FIRE) not_affected = playerHasProp(player, FIRE_RES);
        // fall through
    case AD_ELEC:
        if (adtyp === AD_ELEC) not_affected = playerHasProp(player, SHOCK_RES);
        // C: mon_explodes(mtmp, mattk) — kills the monster via explosion
        await mon_explodes(mtmp, {
            damn: mattk.damn || 0,
            damd: mattk.damd || 0,
            adtyp: adtyp,
        }, map, player);
        if (!mtmp.dead && mtmp.mhp > 0)
            kill_agr = false; // lifesaving?
        break;
    case AD_BLND:
        not_affected = resists_blnd(player);
        if (ufound && !not_affected) {
            if (display) display.putstr_message('You are blinded by a blast of light!');
            tmp = Math.floor(tmp / 2);
            make_blinded(player, tmp, false);
        }
        break;
    case AD_HALU:
        not_affected = !!player.blind;
        if (ufound && !not_affected) {
            if (display) display.putstr_message('You are caught in a blast of kaleidoscopic light!');
            // Kill the monster immediately
            mondead(mtmp, map, player);
            kill_agr = false; // already killed
            // C: make_hallucinated(HHallucination + tmp, FALSE, 0L)
            // Hallucination not fully ported
            if (display) display.putstr_message('You are freaked out.');
        }
        break;
    default:
        break;
    }

    if (not_affected) {
        if (display) display.putstr_message('You seem unaffected by it.');
    }

    if (kill_agr && !mtmp.dead && mtmp.mhp > 0) {
        mondead(mtmp, map, player);
    }

    return (mtmp.dead || mtmp.mhp <= 0) ? M_ATTK_AGR_DIED : M_ATTK_MISS;
}

// cf. mhitu.c:1660 gazemu() — monster gazes at hero
export function gazemu(mtmp, mattk, player, map, display) {
    if (!mtmp || !player) return M_ATTK_MISS;
    canonicalizeAttackFields(mattk);

    const adtyp = mattk.adtyp ?? AD_PHYS;
    const cancelled = !!(mtmp.mcan);
    const mdat = mtmp.type || mtmp.data || {};

    switch (adtyp) {
    case AD_STON: {
        // Medusa stoning gaze
        if (cancelled || !mtmp.mcansee) {
            // Ineffective
            if (display) display.putstr_message(`The ${x_monnam(mtmp)} gazes ineffectually.`);
            break;
        }
        // C: check reflectable, hero stone resistance, etc.
        if (playerHasProp(player, REFLECTING)) {
            if (display)
                display.putstr_message(`The ${x_monnam(mtmp)}'s gaze is reflected by your shield!`);
            // Reflected gaze petrifies Medusa
            if (mtmp.mcansee) {
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} is turned to stone!`);
                mtmp.mhp = 0;
                mtmp.dead = true;
                return M_ATTK_AGR_DIED;
            }
            break;
        }
        if (!playerHasProp(player, STONE_RES) && !player.blind) {
            if (display) {
                display.putstr_message(`You meet the ${x_monnam(mtmp)}'s gaze.`);
                display.putstr_message('You turn to stone...');
            }
            // Petrification death
            if (player.takeDamage) {
                player.deathCause = `turned to stone by a ${x_monnam(mtmp)}`;
                player.takeDamage(player.uhp || 999, x_monnam(mtmp));
            }
        }
        break;
    }
    case AD_CONF: {
        // Confusion gaze
        if (mtmp.mcansee && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                // Cancelled — just look confused
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} looks confused.`);
            } else {
                const conf = d(3, 4);
                mtmp.mspec_used = (mtmp.mspec_used || 0) + conf + rn2(6);
                if (!player.confused) {
                    if (display) display.putstr_message(`The ${x_monnam(mtmp)}'s gaze confuses you!`);
                } else {
                    if (display) display.putstr_message('You are getting more and more confused.');
                }
                const oldTimeout = player.getPropTimeout
                    ? player.getPropTimeout(CONFUSION) : 0;
                make_confused(player, oldTimeout + conf, false);
            }
        }
        break;
    }
    case AD_STUN: {
        // Stun gaze
        if (mtmp.mcansee && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} looks stunned.`);
            } else {
                const stun = d(2, 6);
                mtmp.mspec_used = (mtmp.mspec_used || 0) + stun + rn2(6);
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} stares piercingly at you!`);
                const oldTimeout = player.getPropTimeout
                    ? player.getPropTimeout(STUNNED) : 0;
                make_stunned(player, oldTimeout + stun, true);
            }
        }
        break;
    }
    case AD_BLND: {
        // Blinding gaze (archon, etc.)
        if (!player.blind && !resists_blnd(player)) {
            if (cancelled) {
                if (display) {
                    const reaction = rn2(2) ? 'puzzled' : 'dazzled';
                    display.putstr_message(`The ${x_monnam(mtmp)} looks ${reaction}.`);
                }
            } else {
                const blnd = c_d(mattk.damn || 1, mattk.damd || 6);
                if (display) display.putstr_message(`You are blinded by the ${x_monnam(mtmp)}'s radiance!`);
                make_blinded(player, blnd, false);
            }
        }
        break;
    }
    case AD_FIRE: {
        // Fire gaze
        if (mtmp.mcansee && !mtmp.mspec_used && rn2(5)) {
            if (cancelled) {
                const reaction = rn2(2) ? 'irritated' : 'inflamed';
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} looks ${reaction}.`);
            } else {
                let dmg = d(2, 6);
                if (display) display.putstr_message(`The ${x_monnam(mtmp)} attacks you with a fiery gaze!`);
                if (playerHasProp(player, FIRE_RES)) {
                    if (display) display.putstr_message("The fire doesn't feel hot!");
                    dmg = 0;
                }
                if (dmg > 0) {
                    mdamageu(mtmp, dmg, player, display);
                }
            }
        }
        break;
    }
    default:
        break;
    }
    return M_ATTK_MISS;
}

// --- Group 8: Damage/seduction (mhitu.c:1895-2348) ---

// cf. mhitu.c:1895 mdamageu() — apply n points of damage to hero
export function mdamageu(mtmp, n, player, display) {
    if (!player) return;
    if (n < 0) n = 0;

    if (n > 0 && player.takeDamage) {
        const died = player.takeDamage(n, x_monnam(mtmp));
        if (died) {
            if (player.wizard) {
                // Wizard mode survival
                const con = (player.attributes && player.attributes[A_CON]) || 10;
                const givehp = 50 + 10 * Math.floor(con / 2);
                player.uhp = Math.min(player.uhpmax || givehp, givehp);
                if (display) {
                    if (typeof display.clearRow === 'function') display.clearRow(0);
                    display.topMessage = null;
                    display.messageNeedsMore = false;
                    display.putstr_message('OK, so you don\'t die.');
                }
                if (game) {
                    game.nomovemsg = 'You survived that attempt on your life.';
                    game.multi = -1;
                    game.multi_reason = 'attempting to cheat Death';
                }
            } else {
                player.deathCause = `killed by a ${x_monnam(mtmp)}`;
                if (display) display.putstr_message('You die...');
            }
        }
    }
}

// cf. mhitu.c:1927 could_seduce() — returns 0 if seduction impossible,
// 1 if fine, 2 if wrong gender for nymph
export function could_seduce(magr, mdef, mattk) {
    if (!magr) return 0;
    const pagr = magr.type || magr.data || {};
    if (is_animal(pagr)) return 0;

    const genagr = magr.female ? FEMALE : MALE;
    const gendef = mdef?.female ? FEMALE : (mdef?.gender ?? MALE);

    if (mattk) canonicalizeAttackFields(mattk);
    const adtyp = mattk ? (mattk.adtyp ?? AD_PHYS)
                 : dmgtype(pagr, AD_SSEX) ? AD_SSEX
                 : dmgtype(pagr, AD_SEDU) ? AD_SEDU
                 : AD_PHYS;

    // Only nymphs and amorous demons can seduce
    if ((pagr.mlet !== S_NYMPH && pagr !== mons[PM_AMOROUS_DEMON])
        || (adtyp !== AD_SEDU && adtyp !== AD_SSEX && adtyp !== AD_SITM)) {
        return 0;
    }

    return (genagr === 1 - gendef) ? 1 : (pagr.mlet === S_NYMPH) ? 2 : 0;
}

// cf. mhitu.c:1978 doseduce() — seduction attack
// Highly simplified: the full C version involves complex armor removal dialogue.
// This stub handles the core RNG and effects.
export function doseduce(mon, player, display) {
    if (!mon || !player) return 0;

    if (mon.mcan || mon.mspec_used) {
        if (display) {
            const pronoun = mon.female ? 'she' : 'he';
            display.putstr_message(
                `The ${x_monnam(mon)} acts as though ${pronoun} has got a ${mon.mcan ? 'severe ' : ''}headache.`
            );
        }
        return 0;
    }

    if (display) display.putstr_message(`You feel very attracted to the ${x_monnam(mon)}.`);

    // Simplified: skip armor removal dialogue, go straight to outcome
    if (display) display.putstr_message(
        `Time stands still while you and the ${x_monnam(mon)} lie in each other's arms...`
    );

    // C: attr_tot = ACURR(A_CHA) + ACURR(A_INT); if (rn2(35) > min(attr_tot, 32)) bad outcome
    const cha = (player.attributes && player.attributes[6]) || 10; // A_CHA=6
    const intel = (player.attributes && player.attributes[A_INT]) || 10;
    const attr_tot = cha + intel;

    if (rn2(35) > Math.min(attr_tot, 32)) {
        // Bad outcome
        if (display) display.putstr_message(
            `The ${x_monnam(mon)} seems to have enjoyed it more than you...`
        );
        switch (rn2(5)) {
        case 0:
            if (display) display.putstr_message('You feel drained of energy.');
            if (player.pw !== undefined) player.pw = 0;
            if (player.pwmax !== undefined) player.pwmax -= rnd(10);
            if (player.pwmax < 0) player.pwmax = 0;
            exercise(player, A_CON, false);
            break;
        case 1:
            if (display) display.putstr_message('You are down in the dumps.');
            if (player.attributes) player.attributes[A_CON] = Math.max(3, (player.attributes[A_CON] || 10) - 1);
            exercise(player, A_CON, false);
            break;
        case 2:
            if (display) display.putstr_message('Your senses are dulled.');
            if (player.attributes) player.attributes[A_WIS] = Math.max(3, (player.attributes[A_WIS] || 10) - 1);
            exercise(player, A_WIS, false);
            break;
        case 3:
            if (!playerHasProp(player, DRAIN_RES)) {
                if (display) display.putstr_message('You feel out of shape.');
                losexp(player, display, 'overexertion');
            } else {
                if (display) display.putstr_message('You have a curious feeling...');
            }
            exercise(player, A_CON, false);
            exercise(player, A_DEX, false);
            exercise(player, A_WIS, false);
            break;
        case 4:
            if (display) display.putstr_message('You feel exhausted.');
            exercise(player, A_STR, false);
            mdamageu(mon, rn1(10, 6), player, display);
            break;
        }
    } else {
        // Good outcome
        mon.mspec_used = rnd(100);
        if (display) display.putstr_message(
            `You seem to have enjoyed it more than the ${x_monnam(mon)}...`
        );
        switch (rn2(5)) {
        case 0:
            if (display) display.putstr_message('You feel raised to your full potential.');
            exercise(player, A_CON, true);
            if (player.pwmax !== undefined) player.pwmax += rnd(5);
            if (player.pw !== undefined) player.pw = player.pwmax;
            break;
        case 1:
            if (display) display.putstr_message('You feel good enough to do it again.');
            if (player.attributes) player.attributes[A_CON] = (player.attributes[A_CON] || 10) + 1;
            exercise(player, A_CON, true);
            break;
        case 2:
            if (display) display.putstr_message(`You will always remember the ${x_monnam(mon)}...`);
            if (player.attributes) player.attributes[A_WIS] = (player.attributes[A_WIS] || 10) + 1;
            exercise(player, A_WIS, true);
            break;
        case 3:
            if (display) display.putstr_message('That was a very educational experience.');
            // C: pluslvl(FALSE) — level gain
            exercise(player, A_WIS, true);
            break;
        case 4:
            if (display) display.putstr_message('You feel restored to health!');
            if (player.uhpmax) player.uhp = player.uhpmax;
            exercise(player, A_STR, true);
            break;
        }
    }

    // Payment and cleanup
    if (!rn2(25)) mon.mcan = 1;
    // C: rloc(mon) — teleport seducer away (not ported)
    return 1;
}

// --- Group 9: Assessment/avoidance (mhitu.c:2349-2424) ---

// C ref: mhitu.c:2349 assess_dmg() — deduct damage from monster, kill if needed
export function assess_dmg(mtmp, tmp, map, player) {
    if (!mtmp) return M_ATTK_HIT;
    mtmp.mhp = (mtmp.mhp || 0) - tmp;
    if (mtmp.mhp <= 0) {
        xkilled(mtmp, XKILL_NOMSG, map, player);
        if (mtmp.dead || mtmp.mhp <= 0)
            return M_ATTK_AGR_DIED;
        return M_ATTK_HIT;
    }
    return M_ATTK_HIT;
}

// --- Group 10: Passive/clone (mhitu.c:2425-2640) ---

// C ref: mhitu.c:2425 passiveum() — hero's passive counterattack when polymorphed
// Simplified: only handles AD_ACID (the most common case).
// Missing: AD_STON, AD_ENCH, AD_PLYS, AD_COLD/FIRE/ELEC mold effects.
export function passiveum(olduasmon, mtmp, mattk, map, player) {
    if (!olduasmon || !mtmp) return M_ATTK_HIT;
    // Find the passive attack slot (AT_NONE or AT_BOOM)
    const attacks = olduasmon.attacks || [];
    let oldu_mattk = null;
    for (const a of attacks) {
        if (!a) continue;
        if (a.type === AT_NONE || a.type === AT_BOOM) {
            oldu_mattk = a;
            break;
        }
    }
    if (!oldu_mattk) return M_ATTK_HIT;

    let tmp = 0;
    if (oldu_mattk.damn)
        tmp = c_d(oldu_mattk.damn, oldu_mattk.damd || 1);
    else if (oldu_mattk.damd)
        tmp = c_d((olduasmon.mlevel || 0) + 1, oldu_mattk.damd);

    switch (oldu_mattk.adtyp) {
    case AD_ACID:
        if (!rn2(2)) {
            if (resists_acid(mtmp)) tmp = 0;
        } else {
            tmp = 0;
        }
        if (!rn2(30)) {
            // C ref: erode_armor(mtmp, ERODE_CORRODE) — simplified
        }
        if (!rn2(6)) {
            // C ref: acid_damage(MON_WEP(mtmp)) — simplified
        }
        return assess_dmg(mtmp, tmp, map, player);
    default:
        tmp = 0;
        return assess_dmg(mtmp, tmp, map, player);
    }
}

// Autotranslated from mhitu.c:105
export function mswings_verb(mwep, bash) {
  let verb;
  let otyp = mwep.otyp, lash = (objectData[otyp].oc_skill === P_WHIP || is_wet_towel(mwep)), thrust = ((objectData[otyp].oc_dir & PIERCE) !== 0 && ((objectData[otyp].oc_dir & ~PIERCE) === 0 || !rn2(2)));
  verb = bash ? "bashes with"   : lash ? "lashes" : thrust ? "thrusts" : "swings";
  return verb;
}

// Autotranslated from mhitu.c:130
export function mswings(mtmp, otemp, bash, game, player) {
  if (game.flags.verbose && !(player?.Blind || player?.blind || false) && mon_visible(mtmp)) {
    pline_mon(mtmp, "%s %s %s%s %s.", Monnam(mtmp), mswings_verb(otemp, bash), (otemp.quan > 1) ? "one of " : "", mhis(mtmp), xname(otemp));
  }
}

// Autotranslated from mhitu.c:2302
export function mayberem(mon, seducer, obj, str, player) {
  let qbuf;
  if (!obj || !obj.owornmask) return;
  if (player.utotype || !m_next2u(mon)) return;
  if ((player?.Deaf || player?.deaf || false)) { pline("%s takes off your %s.", seducer, str); }
  else if (rn2(20) < acurr(player,A_CHA)) {
    Sprintf(qbuf, "\"Shall I remove your %s, %s?\"", str, (!rn2(2) ? "lover" : !rn2(2) ? "dear" : "sweetheart"));
    if (y_n(qbuf) === 'n') return;
  }
  else {
    let hairbuf;
    Sprintf(hairbuf, "let me run my fingers through your %s", body_part(HAIR));
    verbalize("Take off your %s; %s.", str, (obj === player.armor) ? "let's get a little closer" : (obj === player.cloak || obj === player.shield) ? "it's in the way" : (obj === player.boots) ? "let me rub your feet" : (obj === player.gloves) ? "they're too clumsy" : (obj === player.shirt) ? "let me massage you"   : hairbuf);
  }
  remove_worn_item(obj, true);
}

// Autotranslated from mhitu.c:2403
export function ranged_attk_available(mtmp) {
  let i, typ = -1, ptr = mtmp.data;
  for (i = 0; i < NATTK; i++) {
    if (DISTANCE_ATTK_TYPE(ptr.mattk[i].aatyp) && (typ = get_atkdam_type(ptr.mattk[i].adtyp)) >= 0 && m_seenres(mtmp, cvt_adtyp_to_mseenres(typ)) === 0) return true;
  }
  return false;
}
