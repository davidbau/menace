// mhitu.js -- Monster-vs-hero combat
// cf. mhitu.c — monster attacks hero (mattacku, hitmu, missmu, etc.)
// Hero-vs-monster combat has moved to uhitm.js.

import { rn2, rnd, rn1, c_d } from './rng.js';
import {
    A_STR, A_DEX, A_CON,
    CONFUSION, STUNNED, BLINDED, TIMEOUT,
    FIRE_RES, COLD_RES, SHOCK_RES, SLEEP_RES, POISON_RES, DRAIN_RES,
    ACID_RES, FREE_ACTION, FAST,
} from './config.js';
import {
    G_UNIQ, M2_NEUTER, M2_MALE, M2_FEMALE, M2_PNAME,
    MZ_HUMAN,
    AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_HUGS,
    AT_TENT, AT_WEAP, AT_ENGL,
    AD_PHYS, AD_FIRE, AD_COLD, AD_SLEE, AD_ELEC, AD_DRST, AD_SLOW,
    AD_PLYS, AD_DRLI, AD_DREN, AD_STON, AD_STCK, AD_TLPT, AD_CONF,
    AD_DRIN, AD_ACID, AD_BLND, AD_STUN, AD_WRAP, AD_RUST, AD_CORR,
    AD_DCAY, AD_SGLD, AD_SEDU, AD_SITM, AD_SSEX, AD_SLIM, AD_POLY,
    AD_ENCH, AD_DISE, AD_HALU, AD_CURS, AD_WERE, AD_HEAL, AD_LEGS,
    AD_DGST, AD_SAMU, AD_DETH, AD_PEST, AD_FAMN, AD_DRDX, AD_DRCO,
    AD_MAGM, AD_DISN,
} from './monsters.js';
import { objectData, BULLWHIP } from './objects.js';
import { xname } from './mkobj.js';
import {
    monDisplayName, is_humanoid, thick_skinned,
    resists_fire, resists_cold, resists_elec, resists_acid,
} from './mondata.js';
import {
    weaponEnchantment, weaponDamageSides,
    mhitm_mgc_atk_negated,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
} from './uhitm.js';
import { thrwmu } from './mthrowu.js';
import { exercise } from './attrib_exercise.js';
import { make_confused, make_stunned, make_blinded } from './potion.js';
import { losexp } from './exper.js';

const PIERCE = 1;


// ============================================================================
// Hit/miss messages
// ============================================================================

// cf. mhitu.c:30 hitmsg() — monster hits hero message.
// Prints the appropriate hit verb for the attack type.
function hitmsg(monster, attack, display, suppressHitMsg) {
    if (suppressHitMsg) return;
    let verb;
    switch (attack.type) {
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
    display.putstr_message(`The ${monDisplayName(monster)} ${verb}!`);
}

// cf. mhitu.c mswings_verb() / mswings().
function monsterWeaponSwingVerb(weapon, bash = false) {
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
function monsterPossessive(monster) {
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
        `The ${monDisplayName(monster)} ${swingVerb} ${oneOf}${monsterPossessive(monster)} ${xname(monster.weapon)}.`
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
    if (!(attack.damage === AD_PHYS
          && (attack.type === AT_CLAW || attack.type === AT_KICK
              || attack.type === AT_BUTT || attack.type === AT_WEAP))) {
        return false;
    }

    // Don't knockback if attacker also wants to grab or engulf
    const mdat = monster?.type || {};
    const attacks = mdat.attacks || [];
    for (const atk of attacks) {
        if (atk.type === AT_ENGL || atk.type === AT_HUGS) return false;
    }

    // Size check: attacker must be much larger than defender
    const agrSize = mdat.size ?? 0;
    const defSize = MZ_HUMAN; // hero is human-sized
    if (!(agrSize > defSize + 1)) return false;

    // cf. uhitm.c:5350-5352 — knockback message
    const adj = rn2(2) ? 'forceful' : 'powerful';
    const noun = rn2(2) ? 'blow' : 'strike';
    if (display) {
        display.putstr_message(
            `The ${monDisplayName(monster)} knocks you back with a ${adj} ${noun}!`
        );
    }

    return true;
}


// ============================================================================
// mhitu AD_* handlers — monster attacks hero (mhitu branch of each handler)
// Each matches its C counterpart's `mdef == &gy.youmonst` branch.
// ============================================================================

// cf. uhitm.c:3959 mhitm_ad_phys — mhitu branch (uhitm.c:3999-4105)
function mhitu_ad_phys(monster, attack, player, mhm, ctx) {
    const { display, suppressHitMsg } = ctx;

    if (attack.type === AT_HUGS) {
        // Grab attack — rn2(2) for grab attempt
        if (!player.ustuck && rn2(2)) {
            // Grabbed
            player.ustuck = monster;
            display.putstr_message(`The ${monDisplayName(monster)} grabs you!`);
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
        if (attack.type === AT_WEAP && monster.weapon) {
            // Weapon damage: dmgval equivalent
            const wsdam = weaponDamageSides(monster.weapon, null);
            if (wsdam > 0) mhm.damage += rnd(wsdam);
            // Gauntlets of power: rn1(4,3) — skip, monsters rarely have them
            if (mhm.damage <= 0) mhm.damage = 1;
            // Artifact check — not implemented; use hitmsg
            hitmsg(monster, attack, display, suppressHitMsg);
            mhm.hitflags |= M_ATTK_HIT;
            // Weapon enchantment
            mhm.damage += weaponEnchantment(monster.weapon);
            // Weapon poison: C checks dieroll <= 5 for poisoned weapons
            // TODO: implement weapon poison path
        } else if (attack.type !== AT_TUCH || mhm.damage !== 0
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
                    `The ${monDisplayName(monster)} swings itself around you!`
                );
            }
        } else if (player.ustuck === monster) {
            // Already grabbed — crushing
            if (attack.type === AT_HUGS) {
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
                    `You are frozen by ${monDisplayName(monster)}!`
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
                `You are put to sleep by ${monDisplayName(monster)}!`
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
            ctx.display.putstr_message(`The ${monDisplayName(monster)} blinds you!`);
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
        switch (attack.damage) {
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
        losexp(player, ctx.display, monDisplayName(monster));
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
    // C: helmet check: if (uarmh && rn2(8)) blocks attack
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
                    `You hear a cough from ${monDisplayName(monster)}!`
                );
        } else {
            // Hissing + possible petrification
            if (!ctx.suppressHitMsg) {
                ctx.display.putstr_message(
                    `You hear ${monDisplayName(monster)}'s hissing!`
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
        if (mhm.damage >= player.hp) {
            if (player.hp === 1) player.hp++;
            mhm.damage = player.hp - 1;
        }
    }
}

// cf. uhitm.c:2793 mhitm_ad_sgld — mhitu branch (steal gold)
function mhitu_ad_sgld(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // C: stealgold(magr) — not implemented
    // damage is kept as physical
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
    //        && !defends(AD_WERE, uwep) && !mhitm_mgc_atk_negated(...))
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
    // Disease — not implemented, keep damage
}

// cf. uhitm.c:4611 mhitm_ad_sedu — mhitu branch (seduction/theft)
function mhitu_ad_sedu(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    // Seduction — not implemented
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
            `The ${monDisplayName(monster)} reaches out with its deadly touch.`
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
            `The ${monDisplayName(monster)} reaches out, and you feel fever and chills.`
        );
    }
    // C: diseasemu(pa) — not implemented, keep damage
}

// cf. uhitm.c:3767 mhitm_ad_famn — mhitu branch (Famine)
function mhitu_ad_famn(monster, attack, player, mhm, ctx) {
    if (!ctx.suppressHitMsg) {
        ctx.display.putstr_message(
            `The ${monDisplayName(monster)} reaches out, and your body shrivels.`
        );
    }
    exercise(player, A_CON, false);
    // C: morehungry(rn1(40, 40)) — hunger not implemented
    rn1(40, 40);
}

// cf. uhitm.c:3885 mhitm_ad_halu — mhitu branch
function mhitu_ad_halu(monster, attack, player, mhm, ctx) {
    // C: damage = 0 for mhitu
    mhm.damage = 0;
}

// Stub handlers for equipment erosion — hitmsg + zero damage
function mhitu_ad_rust(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    mhm.damage = 0;
}
function mhitu_ad_corr(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    mhm.damage = 0;
}
function mhitu_ad_dcay(monster, attack, player, mhm, ctx) {
    hitmsg(monster, attack, ctx.display, ctx.suppressHitMsg);
    mhm.damage = 0;
}


// ============================================================================
// mhitu_adtyping() — central dispatcher for mhitu AD_* handlers
// ============================================================================

// cf. uhitm.c:4760 mhitm_adtyping() — mhitu branch dispatch.
// Replaces the old mhitu_adtyping_rng() stub with real handler calls.
function mhitu_adtyping(monster, attack, player, mhm, ctx) {
    const adtyp = attack.damage ?? AD_PHYS;
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
// monsterAttackPlayer — main monster-attacks-hero entry point
// ============================================================================

// cf. mhitu.c mattacku() / hitmu() — restructured to match C's flow.
// opts.range2: true if monster is not adjacent (ranged attacks only)
// opts.map: map object (needed for thrwmu ranged throwing)
export function monsterAttackPlayer(monster, player, display, game = null, opts = {}) {
    if (!monster.attacks || monster.attacks.length === 0) return;
    if (monster.passive) return; // passive monsters don't initiate attacks

    const range2 = !!opts.range2;
    const map = opts.map || null;

    for (let i = 0; i < monster.attacks.length; i++) {
        const attack = monster.attacks[i];

        // cf. mhitu.c mattacku() attack dispatch:
        // Melee attacks (AT_CLAW, AT_BITE, etc.) only fire when !range2.
        // AT_WEAP: melee when !range2, thrwmu when range2.
        // AT_BREA, AT_SPIT, AT_MAGC: only when range2 (not implemented yet).
        if (range2) {
            if (attack.type === AT_WEAP) {
                // cf. mhitu.c:882-885 — AT_WEAP at range calls thrwmu
                if (map) thrwmu(monster, map, player, display, game);
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

        if (attack.type === AT_WEAP && monster.weapon) {
            maybeMonsterWeaponSwingMessage(monster, player, display, suppressHitMsg);
        }

        const dieRoll = rnd(20 + i);

        if (toHit <= dieRoll) {
            // Miss — cf. mhitu.c:86-98 missmu()
            if (!suppressHitMsg) {
                const just = (toHit === dieRoll) ? 'just ' : '';
                display.putstr_message(`The ${monDisplayName(monster)} ${just}misses!`);
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
        if (attack.dice && attack.sides) {
            mhm.damage = c_d(attack.dice, attack.sides);
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
        const weaponUsed = !!(attack.type === AT_WEAP && monster.weapon);
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
            const died = player.takeDamage(mhm.damage, monDisplayName(monster));

            // cf. allmain.c stop_occupation() via mhitu.c attack flow.
            if (game && game.occupation) {
                if (game.occupation.occtxt === 'waiting' || game.occupation.occtxt === 'searching') {
                    display.putstr_message(`You stop ${game.occupation.occtxt}.`);
                }
                game.occupation = null;
                game.multi = 0;
            }

            if (died) {
                if (player.wizard) {
                    // cf. end.c savelife() for wizard/discover survival path.
                    const con = Number.isInteger(player.attributes?.[A_CON])
                        ? player.attributes[A_CON]
                        : 10;
                    const givehp = 50 + 10 * Math.floor(con / 2);
                    player.hp = Math.min(player.hpmax || givehp, givehp);
                    const hadPriorMsg = !!(display.topMessage && display.messageNeedsMore);
                    if (hadPriorMsg) {
                        if (typeof display.clearRow === 'function') display.clearRow(0);
                        display.topMessage = null;
                        display.messageNeedsMore = false;
                    } else {
                        display.putstr_message('OK, so you don\'t die.');
                    }
                    display.putstr_message('You survived that attempt on your life.');
                    if (game) game._suppressMonsterHitMessagesThisTurn = true;
                } else {
                    player.deathCause = `killed by a ${monDisplayName(monster)}`;
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
// TODO: cf. mhitu.c mpoisons_subj() — poison subject message
// TODO: cf. mhitu.c u_slow_down() — hero slowdown from attack
// TODO: cf. mhitu.c wildmiss() — invisible/displaced miss message

// --- Group 3: Engulf expulsion (mhitu.c:263-308) ---
// TODO: cf. mhitu.c expels() — expel hero from engulfer

// --- Group 4: Attack dispatch (mhitu.c:309-953) ---
// TODO: cf. mhitu.c getmattk() — get monster attack for index
// TODO: cf. mhitu.c calc_mattacku_vars() — calculate attack variables

// --- Group 5: Summoning/disease/slip (mhitu.c:954-1084) ---
// TODO: cf. mhitu.c summonmu() — summon minions during attack
// TODO: cf. mhitu.c diseasemu() — disease attack
// TODO: cf. mhitu.c u_slip_free() — hero slips free from grab

// --- Group 7: Engulf/explode/gaze (mhitu.c:1269-1894) ---
// TODO: cf. mhitu.c gulpmu() — engulf attack
// TODO: cf. mhitu.c explmu() — exploding monster attack
// TODO: cf. mhitu.c gazemu() — gaze attack

// --- Group 8: Damage/seduction (mhitu.c:1895-2348) ---
// TODO: cf. mhitu.c mdamageu() — apply damage to hero
// TODO: cf. mhitu.c could_seduce() — check if seduction possible
// TODO: cf. mhitu.c doseduce() — seduction attack

// --- Group 9: Assessment/avoidance (mhitu.c:2349-2424) ---
// TODO: cf. mhitu.c assess_dmg() — assess damage for fleeing

// --- Group 10: Passive/clone (mhitu.c:2425-2640) ---
// TODO: cf. mhitu.c passiveum() — passive counterattack damage
