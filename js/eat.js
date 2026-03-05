// eat.js -- Eating mechanics
// cf. eat.c — doeat, start_eating, eatfood, bite, corpse intrinsics, hunger

import { rn2, rn1, rnd, d } from './rng.js';
import { nhgetch } from './input.js';
import { objectData, FOOD_CLASS, CORPSE, TRIPE_RATION, CLOVE_OF_GARLIC,
         TIN, EGG, FOOD_RATION, LEMBAS_WAFER, CRAM_RATION,
         MEAT_RING, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL,
         LUMP_OF_ROYAL_JELLY, EUCALYPTUS_LEAF, APPLE, PEAR,
         FORTUNE_COOKIE, CREAM_PIE, CANDY_BAR, PANCAKE, SPRIG_OF_WOLFSBANE,
         CARROT, K_RATION, C_RATION, SLIME_MOLD,
         FLESH, VEGGY } from './objects.js';
import { doname, next_ident } from './mkobj.js';
import { mons, PM_LIZARD, PM_LICHEN, PM_NEWT,
         PM_ACID_BLOB, PM_COCKATRICE, PM_CHICKATRICE,
         PM_LITTLE_DOG, PM_DOG, PM_LARGE_DOG,
         PM_KITTEN, PM_HOUSECAT, PM_LARGE_CAT,
         PM_WRAITH, PM_NURSE, PM_STALKER, PM_YELLOW_LIGHT,
         PM_GIANT_BAT, PM_BAT,
         PM_SMALL_MIMIC, PM_LARGE_MIMIC, PM_GIANT_MIMIC,
         PM_QUANTUM_MECHANIC, PM_CHAMELEON, PM_DOPPELGANGER,
         PM_SANDESTIN, PM_GENETIC_ENGINEER,
         PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER,
         PM_GREEN_SLIME, PM_DEATH, PM_PESTILENCE, PM_FAMINE,
         PM_DISPLACER_BEAST, PM_DISENCHANTER,
         PM_HUMAN_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF,
         PM_WERERAT, PM_WEREJACKAL, PM_WEREWOLF,
         PM_FLOATING_EYE, PM_RAVEN, PM_PYROLISK,
         PM_KILLER_BEE, PM_SCORPION, PM_VIOLET_FUNGUS,
         S_GOLEM, S_EYE, S_JELLY, S_PUDDING, S_BLOB, S_VORTEX,
         S_ELEMENTAL, S_FUNGUS, S_LIGHT, S_MIMIC,
         AT_MAGC, AD_STUN, AD_HALU,
         MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC,
         MR_POISON, MR_ACID, MR_STONE } from './monsters.js';
import { PM_CAVEMAN, RACE_ORC, RACE_ELF, RACE_DWARF,
         A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, ACID_RES, STONE_RES,
         TELEPORT, TELEPORT_CONTROL, TELEPAT, LAST_PROP,
         FROMOUTSIDE, INTRINSIC, TIMEOUT } from './const.js';
import { applyMonflee } from './mhitu.js';
import { obj_resists } from './objdata.js';
import { compactInvletPromptChars } from './invent.js';
import { pline, You, Your, You_feel, You_cant, pline_The, You_hear } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { pluslvl } from './exper.js';
import { is_rider, is_giant, acidic, poisonous, flesh_petrifies,
         vegan, vegetarian, carnivorous, herbivorous,
         is_humanoid, is_undead, attacktype, dmgtype,
         telepathic, can_teleport, control_teleport,
         noncorporeal, slimeproof, is_orc, is_elf, is_dwarf,
         type_is_pname } from './mondata.js';


// ============================================================
// 1. Data / constants
// ============================================================

// Hunger states (hack.h)
const SATIATED = 0;
const NOT_HUNGRY = 1;
const HUNGRY = 2;
const WEAK = 3;
const FAINTING = 4;
const FAINTED = 5;
const STARVED = 6;

// Hunger state name table (cf. eat.c hu_stat[])
const hu_stat = [
    'Satiated', '        ', 'Hungry  ', 'Weak    ',
    'Fainting', 'Fainted ', 'Starved '
];

// Tin variety constants
const SPINACH_TIN = -1;
const ROTTEN_TIN = 0;
const HOMEMADE_TIN = 1;

// Tin type table (cf. eat.c tintxts[])
const tintxts = [
    { txt: 'rotten', nut: -50, fodder: false, greasy: false },
    { txt: 'homemade', nut: 50, fodder: true, greasy: false },
    { txt: 'soup made from', nut: 20, fodder: true, greasy: false },
    { txt: 'french fried', nut: 40, fodder: false, greasy: true },
    { txt: 'pickled', nut: 40, fodder: true, greasy: false },
    { txt: 'boiled', nut: 50, fodder: true, greasy: false },
    { txt: 'smoked', nut: 50, fodder: true, greasy: false },
    { txt: 'dried', nut: 55, fodder: true, greasy: false },
    { txt: 'deep fried', nut: 60, fodder: false, greasy: true },
    { txt: 'szechuan', nut: 70, fodder: true, greasy: false },
    { txt: 'broiled', nut: 80, fodder: false, greasy: false },
    { txt: 'stir fried', nut: 80, fodder: false, greasy: true },
    { txt: 'sauteed', nut: 95, fodder: false, greasy: false },
    { txt: 'candied', nut: 100, fodder: true, greasy: false },
    { txt: 'pureed', nut: 500, fodder: true, greasy: false },
    { txt: '', nut: 0, fodder: false, greasy: false }
];
const TTSZ = tintxts.length;

// cf. eat.c CANNIBAL_ALLOWED()
function CANNIBAL_ALLOWED(player) {
    return player.roleIndex === PM_CAVEMAN || player.race === RACE_ORC;
}

// cf. eat.c nonrotting_corpse()
function nonrotting_corpse(mnum) {
    return mnum === PM_LIZARD || mnum === PM_LICHEN
        || is_rider(mons[mnum])
        || mnum === PM_ACID_BLOB;
}

// cf. eat.c nonrotting_food()
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
}


// ============================================================
// 2. Utility
// ============================================================

// cf. eat.c is_edible() — check if object is edible by hero
function is_edible(obj) {
    const od = objectData[obj.otyp];
    if (od && od.unique) return false;
    // Simplified: in JS we don't track polymorphed forms for metallivore etc.
    return obj.oclass === FOOD_CLASS;
}

// cf. eat.c food_xname() — food-specific naming for messages
// Autotranslated from eat.c:216
export async function food_xname(food, the_pfx) {
  let result;
  if (food.otyp === CORPSE) {
    result = corpse_xname(food,  0, CXN_SINGULAR | (the_pfx ? CXN_PFX_THE : 0));
    if (type_is_pname( mons[food.corpsenm])) the_pfx = false;
  }
  else { result = await singular(food, xname); }
  if (the_pfx) result = the(result);
  return result;
}

// cf. eat.c foodword() — word for eating action
function foodword(otmp) {
    if (otmp.oclass === FOOD_CLASS) return 'food';
    return 'food'; // simplified; C version indexes by material
}

// cf. eat.c obj_nutrition() — get nutrition value for an object
function obj_nutrition(otmp) {
    if (otmp.otyp === CORPSE) {
        const cnum = otmp.corpsenm;
        if (cnum >= 0 && cnum < mons.length) return mons[cnum].nutrition || 0;
    }
    const od = objectData[otmp.otyp];
    return od ? (od.nutrition || 0) : 0;
}

// cf. eat.c init_uhunger() — initialize hunger state at game start
// Autotranslated from eat.c:125
export async function init_uhunger(game, player) {
  game.disp.botl = (player.uhs !== NOT_HUNGRY || ATEMP(A_STR) < 0);
  player.uhunger = 900;
  player.uhs = NOT_HUNGRY;
  if (ATEMP(A_STR) < 0) { ATEMP(A_STR) = 0; await encumber_msg(); }
}


// ============================================================
// 3. Hunger system
// ============================================================

// cf. eat.c gethungry() — process hunger each turn
async function gethungry(player) {
    // Simplified: basic hunger decrement (the real version checks
    // poly form, rings, amulets, regeneration, etc.)
    player.hunger--;
    // cf. eat.c: accessorytime = rn2(20)
    rn2(20);
    await newuhs(player, true);
}

// cf. eat.c morehungry() — increase hunger by amount
export async function morehungry(player, num) {
    player.hunger -= num;
    await newuhs(player, true);
}

// cf. eat.c lesshungry() — decrease hunger by amount
async function lesshungry(player, num, opts = null) {
    player.hunger += num;
    if (player.hunger >= 2000) {
        // choking territory - simplified
        await choke(player, null);
    } else if (player.hunger >= 1500) {
        // C ref: eat.c lesshungry() emits this warning once per meal and sets
        // gn.nomovemsg to "You're finally finished." for meal completion.
        const satietyState = opts && typeof opts === 'object' ? opts.satietyState : null;
        const shouldWarn = !(satietyState && satietyState.warned);
        if (shouldWarn) {
            await pline("You're having a hard time getting all of it down.");
            if (satietyState) {
                satietyState.warned = true;
                satietyState.nomovemsg = "You're finally finished.";
            }
        }
    }
    await newuhs(player, false);
}

// cf. eat.c canchoke() — whether current hunger is in choking-warning range
function canchoke(player) {
    return (player.hunger || 0) >= 1500;
}

// cf. eat.c newuhs() — update hunger state and messages
async function newuhs(player, incr) {
    const h = player.hunger;
    let newhs;
    if (h > 1000) newhs = SATIATED;
    else if (h > 150) newhs = NOT_HUNGRY;
    else if (h > 50) newhs = HUNGRY;
    else if (h > 0) newhs = WEAK;
    else newhs = FAINTING;

    const oldhs = player.hungerState || NOT_HUNGRY;
    if (newhs !== oldhs) {
        if (newhs >= WEAK && oldhs < WEAK) {
            // temporary strength loss
            // cf. eat.c ATEMP(A_STR) = -1
        } else if (newhs < WEAK && oldhs >= WEAK) {
            // repair temporary strength loss
        }
        switch (newhs) {
        case HUNGRY:
            await You(incr ? 'are beginning to feel hungry.'
                     : 'only feel hungry now.');
            break;
        case WEAK:
            await You(incr ? 'are beginning to feel weak.'
                     : 'are still weak.');
            break;
        }
        player.hungerState = newhs;
    }
}

// cf. eat.c unfaint() — recover from fainting
// Autotranslated from eat.c:3330
export async function unfaint(game, player) {
  await Hear_again();
  if (player.uhs > FAINTING) player.uhs = FAINTING;
  await stop_occupation();
  game.disp.botl = true;
  return 0;
}

// cf. eat.c is_fainted() — check if hero is fainted from hunger
// Autotranslated from eat.c:3341
export function is_fainted(player) {
  return  (player.uhs === FAINTED);
}

// cf. eat.c reset_faint() — reset faint counter
function reset_faint(player) {
    // stub — would clear faint timer
}

// cf. eat.c choke() — choking on food
// Autotranslated from eat.c:244
export async function choke(food, player) {
  if (player.uhs !== SATIATED) {
    if (!food || food.otyp !== AMULET_OF_STRANGULATION) return;
  }
  else if (Role_if(PM_KNIGHT) && player.ualign.type === A_LAWFUL) { adjalign(-1); await You_feel("like a glutton!"); }
  await exercise(A_CON, false);
  if (Breathless || Hunger || (!Strangled && !rn2(20))) {
    if (food && food.otyp === AMULET_OF_STRANGULATION) { await You("choke, but recover your composure."); return; }
    await You("stuff yourself and then vomit voluminously.");
    await morehungry(Hunger ? (player.uhunger - 60) : 1000);
    vomit();
  }
  else {
    svk.killer.format = KILLED_BY_AN;
    if (food) {
      await You("choke over your %s.", foodword(food));
      if (food.oclass === COIN_CLASS) { Strcpy(svk.killer.name, "very rich meal"); }
      else {
        svk.killer.format = KILLED_BY;
        Strcpy(svk.killer.name, killer_xname(food));
      }
    }
    else { await You("choke over it."); Strcpy(svk.killer.name, "quick snack"); }
    await You("die...");
    await done(CHOKING);
  }
}


// ============================================================
// 4. Food state
// ============================================================

// cf. eat.c touchfood() — mark food as touched (started eating)
function touchfood(otmp, player) {
    // Simplified: in JS, stack splitting is handled in handleEat
    if (!otmp.oeaten) {
        otmp.oeaten = obj_nutrition(otmp);
    }
    return otmp;
}

// cf. eat.c reset_eat() — reset eating state
function reset_eat(game) {
    if (game && game.occupation) {
        game.occupation = null;
    }
}

// cf. eat.c do_reset_eat() — external reset_eat wrapper
function do_reset_eat(game) {
    reset_eat(game);
}

// cf. eat.c food_disappears() — check if food vanishes on level change
// Autotranslated from eat.c:395
export function food_disappears(obj, game) {
  if (obj === game.svc.context.victual.piece) game.svc.context.victual = zero_victual;
  if (obj.timed) obj_stop_timers(obj);
}

// cf. eat.c food_substitution() — substitute food type
function food_substitution(old_obj, new_obj) {
    // stub — for renaming objects
}

// cf. eat.c recalc_wt() — recalculate object weight after partial eating
function recalc_wt(piece) {
    // stub — weight recalculation after eating
}

// cf. eat.c adj_victual_nutrition() — adjust nutrition for race
function adj_victual_nutrition(player, nmod) {
    let nut = -nmod;
    // Race-based adjustment for lembas/cram could go here
    return Math.max(nut, 1);
}


// ============================================================
// 5. Intrinsic system
// ============================================================

// cf. eat.c intrinsic_possible() — check if monster can give an intrinsic
function intrinsic_possible(type, ptr) {
    switch (type) {
    case FIRE_RES:    return (ptr.mr2 & MR_FIRE) !== 0;
    case SLEEP_RES:   return (ptr.mr2 & MR_SLEEP) !== 0;
    case COLD_RES:    return (ptr.mr2 & MR_COLD) !== 0;
    case DISINT_RES:  return (ptr.mr2 & MR_DISINT) !== 0;
    case SHOCK_RES:   return (ptr.mr2 & MR_ELEC) !== 0;
    case POISON_RES:  return (ptr.mr2 & MR_POISON) !== 0;
    case ACID_RES:    return (ptr.mr2 & MR_ACID) !== 0;
    case STONE_RES:   return (ptr.mr2 & MR_STONE) !== 0;
    case TELEPORT:    return can_teleport(ptr);
    case TELEPORT_CONTROL: return control_teleport(ptr);
    case TELEPAT:     return telepathic(ptr);
    default:          return false;
    }
}

// cf. eat.c should_givit() — decide whether to grant intrinsic
function should_givit(type, ptr) {
    let chance;
    switch (type) {
    case POISON_RES:
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
    return ptr.mlevel > rn2(chance);
}

// cf. eat.c temp_givit() — grant temporary intrinsic from corpse
// Autotranslated from eat.c:991
export function temp_givit(type, ptr) {
  let chance = (type === STONE_RES) ? 6 : (type === ACID_RES) ? 3 : 0;
  return chance ? (ptr.mlevel > rn2(chance)) : false;
}

// cf. eat.c givit() — grant intrinsic from corpse
async function givit(player, type, ptr) {
    if (!should_givit(type, ptr) && !temp_givit(type, ptr))
        return;

    const prop = player.getProp(type);
    switch (type) {
    case FIRE_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('a momentary chill.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SLEEP_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('wide awake.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case COLD_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('full of hot air.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case DISINT_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('very firm.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case SHOCK_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await Your('health currently feels amplified!');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case POISON_RES:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('healthy.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('very jumpy.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPORT_CONTROL:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('in control of yourself.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case TELEPAT:
        if (!(prop.intrinsic & FROMOUTSIDE)) {
            await You_feel('a strange mental acuity.');
            prop.intrinsic |= FROMOUTSIDE;
        }
        break;
    case ACID_RES:
        // Timed resistance
        await You_feel('less concerned about being harmed by acid.');
        prop.intrinsic = (prop.intrinsic & ~TIMEOUT)
            | Math.min(((prop.intrinsic & TIMEOUT) + d(3, 6)), TIMEOUT);
        break;
    case STONE_RES:
        // Timed resistance
        await You_feel('less concerned about becoming petrified.');
        prop.intrinsic = (prop.intrinsic & ~TIMEOUT)
            | Math.min(((prop.intrinsic & TIMEOUT) + d(3, 6)), TIMEOUT);
        break;
    }
}

// cf. eat.c eye_of_newt_buzz() — energy boost from eating newt
export async function eye_of_newt_buzz(player) {
    if (rn2(3) || 3 * (player.pw || 0) <= 2 * (player.pwmax || 0)) {
        const oldPw = player.pw || 0;
        player.pw = (player.pw || 0) + rnd(3);
        if ((player.pw || 0) > (player.pwmax || 0)) {
            if (!rn2(3)) {
                player.pwmax = (player.pwmax || 0) + 1;
            }
            player.pw = player.pwmax || 0;
        }
        if ((player.pw || 0) !== oldPw) {
            await You_feel('a mild buzz.');
        }
    }
}

// cf. eat.c corpse_intrinsic() — choose intrinsic from corpse
function corpse_intrinsic(ptr) {
    const conveys_STR = is_giant(ptr);
    let count = 0;
    let prop = 0;

    if (conveys_STR) {
        count = 1;
        prop = -1; // fake prop index for STR
    }
    for (let i = 1; i <= LAST_PROP; i++) {
        if (!intrinsic_possible(i, ptr))
            continue;
        ++count;
        if (!rn2(count)) {
            prop = i;
        }
    }
    // if strength is the only candidate, give it 50% chance
    if (conveys_STR && count === 1 && !rn2(2))
        prop = 0;

    return prop;
}


// ============================================================
// 6. Corpse prefix / postfix effects
// ============================================================

// cf. eat.c maybe_cannibal() — check/apply cannibalism effects
async function maybe_cannibal(player, pm, allowmsg) {
    if (!CANNIBAL_ALLOWED(player)) {
        // Simplified: check if eating own race
        // In full version this checks your_race() etc.
        if (allowmsg) {
            await You('cannibal!  You will regret this!');
        }
        // Would apply luck penalty: change_luck(-rn1(4, 2))
        return true;
    }
    return false;
}

// cf. eat.c fix_petrification() — cure petrification by eating
// Autotranslated from eat.c:866
export async function fix_petrification() {
  let buf;
  if (Hallucination) {
    Sprintf(buf, "What a pity--you just ruined a future piece of %sart!", ACURR(A_CHA) > 15 ? "fine " : "");
  }
  else {
    Strcpy(buf, "You feel limber!");
  }
  await make_stoned(0, buf, 0,  0);
}

// cf. eat.c cprefx() — corpse prefix effects (before eating)
async function cprefx(player, pm) {
    // In full C version: calls maybe_cannibal, checks flesh_petrifies,
    // handles dogs/cats penalty, lizard un-stoning, rider death, green slime
    // Stub: consume RNG as C does but skip most side effects
    // maybe_cannibal is called by eatcorpse in the tainted path

    if (flesh_petrifies(mons[pm])) {
        // Would check Stone_resistance, polymon, etc.
    }

    switch (pm) {
    case PM_LITTLE_DOG: case PM_DOG: case PM_LARGE_DOG:
    case PM_KITTEN: case PM_HOUSECAT: case PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED(player)) {
            await You_feel(`that eating the ${mons[pm].name} was a bad idea.`);
        }
        break;
    case PM_LIZARD:
        // Would cure petrification
        break;
    case PM_DEATH: case PM_PESTILENCE: case PM_FAMINE:
        await pline('Eating that is instantly fatal.');
        await exercise(player, A_WIS, false);
        break;
    case PM_GREEN_SLIME:
        // Would apply sliming
        break;
    default:
        if (acidic(mons[pm])) {
            // Would cure petrification if stoned
        }
        break;
    }
}

// cf. eat.c cpostfx() — corpse postfix effects (after eating)
async function cpostfx(player, pm, display) {
    let tmp = 0;
    let check_intrinsics = false;

    switch (pm) {
    case PM_WRAITH:
        await pluslvl(player, display, false);
        break;
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WEREWOLF:
        // Would set lycanthropy
        break;
    case PM_NURSE:
        player.uhp = player.uhpmax;
        check_intrinsics = true;
        break;
    case PM_STALKER:
        // Would grant temporary invisibility
        // Falls through to yellow light / bat stun
        // FALLTHROUGH
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        // Would make_stunned
        // FALLTHROUGH
    case PM_BAT:
        // Would make_stunned
        break;
    case PM_GIANT_MIMIC:
        tmp += 10;
        // FALLTHROUGH
    case PM_LARGE_MIMIC:
        tmp += 20;
        // FALLTHROUGH
    case PM_SMALL_MIMIC:
        tmp += 20;
        // Would start mimicking
        break;
    case PM_QUANTUM_MECHANIC:
        await Your('velocity suddenly seems very uncertain!');
        // Would toggle speed
        break;
    case PM_LIZARD:
        // Would reduce stun/confusion
        check_intrinsics = true;
        break;
    case PM_CHAMELEON:
    case PM_DOPPELGANGER:
    case PM_SANDESTIN:
    case PM_GENETIC_ENGINEER:
        await You_feel('momentarily different.');
        break;
    case PM_DISPLACER_BEAST:
        // Would grant temporary displacement; consume d(6,6)
        d(6, 6);
        break;
    case PM_DISENCHANTER:
        // Would strip a random intrinsic
        break;
    case PM_DEATH: case PM_PESTILENCE: case PM_FAMINE:
        // Life-saved; don't attempt to confer intrinsics
        break;
    case PM_MIND_FLAYER:
    case PM_MASTER_MIND_FLAYER:
        if (!rn2(2)) {
            await pline('Yum!  That was real brain food!');
            // Would adjattrib(A_INT, 1)
            break; // don't give telepathy too
        } else {
            await pline('For some reason, that tasted bland.');
        }
        // FALLTHROUGH
    default:
        check_intrinsics = true;
        break;
    }

    if (check_intrinsics) {
        const ptr = mons[pm];

        if (dmgtype(ptr, AD_STUN) || dmgtype(ptr, AD_HALU)
            || pm === PM_VIOLET_FUNGUS) {
            await pline('Oh wow!  Great stuff!');
            // Would make_hallucinated
        }

        // Eating magical monsters can give magical energy
        if (attacktype(ptr, AT_MAGC) || pm === PM_NEWT)
            await eye_of_newt_buzz(player);

        tmp = corpse_intrinsic(ptr);

        if (tmp === -1) {
            // gainstr - would increase strength from giant
        } else if (tmp > 0) {
            await givit(player, tmp, ptr);
        }
    }
}


// ============================================================
// 7. Conducts
// ============================================================

// cf. eat.c eating_conducts() — track dietary conducts
// Autotranslated from eat.c:575
export async function eating_conducts(pd, player) {
  let ll_conduct = 0;
  if (!player.uconduct.food++) {
    livelog_printf(LL_CONDUCT, "ate for the first time - %s", pd.pmnames[NEUTRAL]);
    ll_conduct++;
  }
  if (!vegan(pd)) {
    if (!player.uconduct.unvegan++ && !ll_conduct) {
      livelog_printf(LL_CONDUCT, "consumed animal products (%s) for the first time", pd.pmnames[NEUTRAL]);
      ll_conduct++;
    }
  }
  if (!vegetarian(pd)) {
    if (!player.uconduct.unvegetarian && !ll_conduct) livelog_printf(LL_CONDUCT, "tasted meat (%s) for the first time", pd.pmnames[NEUTRAL]);
    await violated_vegetarian();
  }
}

// cf. eat.c violated_vegetarian() — check vegetarian conduct violation
// Autotranslated from eat.c:1375
export async function violated_vegetarian(player) {
  player.uconduct.unvegetarian++;
  if (Role_if(PM_MONK)) { await You_feel("guilty."); adjalign(-1); }
  return;
}


// ============================================================
// 8. Rotten food / corpse eating
// ============================================================

// cf. eat.c Hear_again() — restore hearing after deafening food
// Autotranslated from eat.c:1795
export async function Hear_again(game) {
  if (!rn2(2)) { await make_deaf(0, false); game.disp.botl = true; }
  return 0;
}

// cf. eat.c rottenfood() — effects of eating rotten food
async function rottenfood(player, obj) {
    await pline(`Blecch!  Rotten ${foodword(obj)}!`);
    if (!rn2(4)) {
        await You_feel('rather light-headed.');
        // Would make_confused
    } else if (!rn2(4)) {
        await pline('Everything suddenly goes dark.');
        // Would make_blinded; consume d(2,10)
        d(2, 10);
    } else if (!rn2(3)) {
        const duration = rnd(10);
        await pline_The('world spins and goes dark.');
        // Would nomul(-duration), set deafness
        return 1;
    }
    return 0;
}

// cf. eat.c eatcorpse() — eat a corpse (rot checks, reqtime, etc.)
async function eatcorpse(player, otmp) {
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;

    if (mnum < 0 || mnum >= mons.length) return 0;

    // Conduct tracking
    if (!vegan(mons[mnum])) {
        // unvegan conduct
    }
    if (!vegetarian(mons[mnum])) {
        await violated_vegetarian(player);
    }

    let rotted = 0;
    if (!nonrotting_corpse(mnum)) {
        // cf. eat.c: rotted = (moves - age) / (10 + rn2(20))
        rotted = rn2(20); // consume RNG for denominator
        // Simplified rotted calculation
    }

    // Delay is weight dependent
    const reqtime = 3 + ((mons[mnum].weight || 0) >> 6);

    if (!tp && !nonrotting_corpse(mnum) && !rn2(7)) {
        if (await rottenfood(player, otmp)) {
            retcode = 1;
        }
        if (!mons[mnum].nutrition) {
            // Corpse rots away completely
            retcode = 2;
        }
    }

    return { retcode, reqtime };
}


// ============================================================
// 9. Food prefix / postfix
// ============================================================

// cf. eat.c garlic_breath() — scare nearby olfaction monsters
// Autotranslated from eat.c:2079
export async function garlic_breath(mtmp) {
  if (olfaction(mtmp.data) && distu(mtmp.mx, mtmp.my) < 7) await monflee(mtmp, 0, false, false);
}

// cf. eat.c fprefx() — food prefix effects (non-corpse)
async function fprefx(player, otmp, reqtime, map) {
    switch (otmp.otyp) {
    case EGG:
        // Simplified: skip pyrolisk explosion, stale egg checks
        break;
    case FOOD_RATION:
        if (player.hunger <= 200)
            await pline('This food really hits the spot!');
        else if (player.hunger < 700)
            await pline('This satiates your stomach!');
        break;
    case TRIPE_RATION:
        if (carnivorous(mons[0] || {}) && !is_humanoid(mons[0] || {})) {
            await pline('This tripe ration is surprisingly good!');
        } else if (player.race === RACE_ORC) {
            await pline('Mmm, tripe... not bad!');
        } else {
            await pline('Yak - dog food!');
            if (rn2(2) && !CANNIBAL_ALLOWED(player)) {
                rn1(reqtime, 14); // make_vomiting duration
            }
        }
        break;
    case LEMBAS_WAFER:
        if (player.race === RACE_ORC) {
            await pline('!#?&* elf kibble!');
        } else if (player.race === RACE_ELF) {
            await pline('A little goes a long way.');
        } else {
            // give_feedback
            await pline(`This ${otmp.name || 'food'} is delicious!`);
        }
        break;
    case CLOVE_OF_GARLIC:
        await garlic_breath(player, map);
        // FALLTHROUGH to default
        await pline(`This ${otmp.name || 'food'} is delicious!`);
        break;
    default:
        await pline(`This ${otmp.name || 'food'} is delicious!`);
        break;
    }
    return true;
}

// cf. eat.c fpostfx() — food postfix effects (non-corpse)
function fpostfx(player, otmp) {
    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        // Would cure lycanthropy
        break;
    case CARROT:
        // Would cure blindness
        break;
    case FORTUNE_COOKIE:
        // Would display rumor
        break;
    case LUMP_OF_ROYAL_JELLY:
        // Would grant strength, heal
        {
            const hpChange = otmp.cursed ? -rnd(20) : rnd(20);
            player.uhp += hpChange;
            if (player.uhp > player.uhpmax) {
                if (!rn2(17))
                    player.uhpmax++;
                player.uhp = player.uhpmax;
            } else if (player.uhp <= 0) {
                player.uhp = 1; // simplified — C version kills or rehumanizes
            }
        }
        break;
    case EGG:
        // Would check for cockatrice egg petrification
        break;
    case EUCALYPTUS_LEAF:
        // Would cure sickness/vomiting if uncursed
        break;
    case APPLE:
        if (otmp.cursed) {
            // Would cause sleep if !Sleep_resistance
            rn1(11, 20); // fall_asleep duration
        }
        break;
    }
}


// ============================================================
// 10. Accessory / special eating
// ============================================================

// cf. eat.c bounded_increase() — bounded stat increase helper
// Autotranslated from eat.c:2215
export function bounded_increase(old, inc, typ) {
  let absold, absinc, sgnold, sgninc;
  if (uright && uright.otyp === typ && typ !== RIN_PROTECTION) {
    old -= uright.spe;
  }
  if (uleft && uleft.otyp === typ && typ !== RIN_PROTECTION) {
    old -= uleft.spe;
  }
  absold = Math.abs(old), absinc = Math.abs(inc);
  sgnold = sgn(old), sgninc = sgn(inc);
  if (absinc === 0 || sgnold !== sgninc || absold + absinc < 10) {
  }
  else if (absold + absinc < 20) {
    absinc = rnd(absinc);
    if (absold + absinc < 10) absinc = 10 - absold;
    inc = sgninc * absinc;
  }
  else if (absold + absinc < 40) {
    absinc = rn2(absinc) ? 1 : 0;
    if (absold + absinc < 20) absinc = rnd(20 - absold);
    inc = sgninc * absinc;
  }
  else { inc = 0; }
  if (uright && uright.otyp === typ && typ !== RIN_PROTECTION) {
    old += uright.spe;
  }
  if (uleft && uleft.otyp === typ && typ !== RIN_PROTECTION) {
    old += uleft.spe;
  }
  return old + inc;
}

// cf. eat.c accessory_has_effect() — check if accessory eating has effect
// Autotranslated from eat.c:2252
export async function accessory_has_effect(otmp) {
  await pline("Magic spreads through your body as you digest the %s.", (otmp.oclass === RING_CLASS) ? "ring" : "amulet");
}

// cf. eat.c eataccessory() — eat a ring or amulet
function eataccessory(player, otmp) {
    // Stub: in full version this grants intrinsics based on ring/amulet type
    // For RNG parity we'd need rn2(3) for rings, rn2(5) for amulets
}

// cf. eat.c eatspecial() — eat special non-food items
function eatspecial(player, otmp) {
    // Stub: handles eating non-food items (coins, paper, rings, etc.)
    // In full C version: lesshungry(nmod), then type-specific effects
}


// ============================================================
// 11. Tin handling
// ============================================================

// cf. eat.c tin_variety_txt() — text for tin variety
// Autotranslated from eat.c:1404
export function tin_variety_txt(s, tinvariety) {
  let k, l;
  if (s && tinvariety) {
     tinvariety = -1;
    for (k = 0; k < TTSZ - 1; ++k) {
      l =  (tintxts[k].txt ?? '').length;
      if (!(String(s).slice(0, Number(l)).toLowerCase().localeCompare(String(tintxts[k].txt).slice(0, Number(l)).toLowerCase())) && ( (s ?? '').length > l) && s[l] === ' ') { tinvariety = k; return (l + 1); }
    }
  }
  return 0;
}

// cf. eat.c tin_details() — determine tin contents and variety
function tin_details(obj, mnum, buf) {
    // Stub: would format tin description
    return buf || '';
}

// cf. eat.c set_tin_variety() — set variety on a tin object
// Autotranslated from eat.c:1460
export function set_tin_variety(obj, forcetype) {
  let r, mnum = obj.corpsenm;
  if (forcetype === SPINACH_TIN || (forcetype === HEALTHY_TIN && (mnum === NON_PM   || !vegetarian( mons[mnum])))) {
    obj.corpsenm = NON_PM;
    obj.spe = 1;
    return;
  }
  else if (forcetype === HEALTHY_TIN) {
    r = tin_variety(obj, false);
    if (r < 0 || r >= TTSZ) r = ROTTEN_TIN;
    while ((r === ROTTEN_TIN && !obj.cursed) || !tintxts[r].fodder) {
      r = rn2(TTSZ - 1);
    }
  }
  else if (forcetype >= 0 && forcetype < TTSZ - 1) { r = forcetype; }
  else {
    r = rn2(TTSZ - 1);
    if (r === ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum))) r = HOMEMADE_TIN;
  }
  obj.spe = -(r + 1);
}

// cf. eat.c tin_variety() — get tin variety
// Autotranslated from eat.c:1488
export function tin_variety(obj, displ) {
  let r, mnum = obj.corpsenm;
  if (obj.spe === 1) { r = SPINACH_TIN; }
  else if (obj.cursed) { r = ROTTEN_TIN; }
  else if (obj.spe < 0) { r = -(obj.spe); --r; }
  else { r = rn2(TTSZ - 1); }
  if (!displ && r === HOMEMADE_TIN && !obj.blessed && !rn2(7)) r = ROTTEN_TIN;
  if (r === ROTTEN_TIN && (ismnum(mnum) && nonrotting_corpse(mnum))) r = HOMEMADE_TIN;
  return r;
}

// cf. eat.c costly_tin() — handle cost of tin from shop
// Autotranslated from eat.c:1388
export function costly_tin(alter_type, game) {
  let tin = game.svc.context.tin.tin;
  if (carried(tin) ? tin.unpaid : (costly_spot(tin.ox, tin.oy) && !tin.no_charge)) {
    if (tin.quan > 1) {
      tin = game.svc.context.tin.tin = splitobj(tin, 1);
      game.svc.context.tin.o_id = tin.o_id;
    }
    costly_alteration(tin, alter_type);
  }
  return tin;
}

// cf. eat.c use_up_tin() — consume a tin after opening
// Autotranslated from eat.c:1515
export function use_up_tin(tin, game) {
  if (carried(tin)) useup(tin);
  else {
    useupf(tin, 1);
  }
  game.svc.context.tin.tin =  null;
  game.svc.context.tin.o_id = 0;
}

// cf. eat.c consume_tin() — eat the contents of an opened tin
async function consume_tin(player, tin, mesg) {
    // Stub: would handle full tin consumption with variety effects
    await pline(mesg || 'You succeed in opening the tin.');
}

// cf. eat.c start_tin() — begin opening a tin
async function start_tin(player, otmp, game) {
    // Stub: would set up tin-opening occupation
    await pline('It is not so easy to open this tin.');
}


// ============================================================
// 12. Prompts / nonfood
// ============================================================

// cf. eat.c edibility_prompts() — prompts about food edibility
function edibility_prompts(player, otmp) {
    // Stub: blessed food detection warnings
    return 0;
}

// cf. eat.c doeat_nonfood() — attempt to eat non-food item
// Autotranslated from eat.c:2728
export async function doeat_nonfood(otmp, game, player) {
  let basenutrit, ll_conduct = 0, nodelicious = false, material;
  game.svc.context.victual.reqtime = 1;
  game.svc.context.victual.piece = otmp;
  game.svc.context.victual.o_id = otmp.o_id;
  game.svc.context.victual.usedtime = 0;
  game.svc.context.victual.canchoke = (player.uhs === SATIATED);
  if (otmp.oclass === COIN_CLASS) basenutrit = ((otmp.quan > 200000) ? 2000 : Math.trunc(otmp.quan / 100));
  else if (otmp.oclass === BALL_CLASS || otmp.oclass === CHAIN_CLASS) basenutrit = weight(otmp);
  else {
    basenutrit = objects[otmp.otyp].oc_nutrition;
  }
  if (otmp.otyp === SCR_MAIL) { basenutrit = 0; nodelicious = true; }
  game.svc.context.victual.nmod = basenutrit;
  game.svc.context.victual.eating = 1;
  if (!player.uconduct.food++) {
    ll_conduct++;
    livelog_printf(LL_CONDUCT, "ate for the first time (%s)", await food_xname(otmp, false));
  }
  material = objects[otmp.otyp].oc_material;
  if (material === LEATHER || material === BONE || material === DRAGON_HIDE || material === WAX) {
    if (!player.uconduct.unvegan++ && !ll_conduct) {
      livelog_printf(LL_CONDUCT, "consumed animal products for the first time, by eating %s", an(await food_xname(otmp, false)));
      ll_conduct++;
    }
    if (material !== WAX) {
      if (!player.uconduct.unvegetarian && !ll_conduct) livelog_printf(LL_CONDUCT, "tasted meat by-products for the first time, by eating %s", an(await food_xname(otmp, false)));
      await violated_vegetarian();
    }
  }
  if (otmp.cursed) { await rottenfood(otmp); nodelicious = true; }
  else if (objects[otmp.otyp].oc_material === PAPER) nodelicious = true;
  if (otmp.oclass === WEAPON_CLASS && otmp.opoisoned) {
    await pline("Ecch - that must have been poisonous!");
    if (!Poison_resistance) {
      await poison_strdmg(rnd(4), rnd(15), xname(otmp), KILLED_BY_AN);
    }
    else {
      await You("seem unaffected by the poison.");
    }
  }
  else if (!nodelicious) {
    await pline("%s%s is delicious!", (obj_is_pname(otmp) && otmp.oartifact < ART_ORB_OF_DETECTION) ? "" : "This ", (otmp.oclass === COIN_CLASS) ? foodword(otmp) : await singular(otmp, xname));
  }
  await eatspecial();
  return ECMD_TIME;
}

// cf. eat.c eating_dangerous_corpse() — warn about dangerous corpses
function eating_dangerous_corpse(res) {
    // Stub: checks if currently eating something dangerous
    return false;
}


// ============================================================
// 13. Callbacks / floor
// ============================================================

// cf. eat.c eat_ok() — getobj callback for edible items
// Autotranslated from eat.c:3511
export function eat_ok(obj) {
  if (!obj) return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
  if (is_edible(obj)) return GETOBJ_SUGGEST;
  if (obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
  return GETOBJ_EXCLUDE_SELECTABLE;
}

// cf. eat.c offer_ok() — getobj callback for sacrifice items
// Autotranslated from eat.c:3533
export function offer_ok(obj, map) {
  if (!obj) return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
  if (obj.oclass !== FOOD_CLASS && obj.oclass !== AMULET_CLASS) return GETOBJ_EXCLUDE;
  if (obj.otyp !== CORPSE && obj.otyp !== AMULET_OF_YENDOR && obj.otyp !== FAKE_AMULET_OF_YENDOR) return GETOBJ_EXCLUDE_SELECTABLE;
  if (Is_astralevel(map.uz) ^ (obj.oclass === AMULET_CLASS)) return GETOBJ_DOWNPLAY;
  return GETOBJ_SUGGEST;
}

// cf. eat.c tin_ok() — getobj callback for tins
// Autotranslated from eat.c:3555
export function tin_ok(obj) {
  if (!obj) return getobj_else ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;
  if (obj.oclass !== FOOD_CLASS) return GETOBJ_EXCLUDE;
  if (obj.otyp !== CORPSE || !tinnable(obj)) return GETOBJ_EXCLUDE_SELECTABLE;
  return GETOBJ_SUGGEST;
}

// cf. eat.c tinopen_ok() — getobj callback for tin opener
// Autotranslated from eat.c:3082
export function tinopen_ok(obj) {
  if (obj && obj.otyp === TIN) return GETOBJ_SUGGEST;
  return GETOBJ_EXCLUDE;
}

// cf. eat.c floorfood() — check/prompt for food on floor
function floorfood(player, map, verb) {
    // Stub: the actual floor food logic is in handleEat
    return null;
}


// ============================================================
// 14. Side effects
// ============================================================

// cf. eat.c vomit() — vomiting effects
function vomit(player) {
    // Simplified vomiting
    // Would cure SICK_VOMITABLE, apply nomul(-2)
}

// cf. eat.c eaten_stat() — calculate how much of food has been eaten
// Autotranslated from eat.c:3782
export function eaten_stat(base, obj) {
  let uneaten_amt, full_amount;
  full_amount =  obj_nutrition(obj);
  uneaten_amt =  obj.oeaten;
  if (uneaten_amt > full_amount) {
    impossible( "partly eaten food (%ld) more nutritious than untouched food (%ld)", uneaten_amt, full_amount);
    uneaten_amt = full_amount;
  }
  base =  (full_amount ?  base * uneaten_amt / full_amount : 0);
  return (base < 1) ? 1 : base;
}

// cf. eat.c consume_oeaten() — reduce oeaten field
// Autotranslated from eat.c:3802
export async function consume_oeaten(obj, amt, game) {
  if (!obj_nutrition(obj)) {
    let itembuf, otyp = obj.otyp;
    if (otyp === CORPSE || otyp === EGG || otyp === TIN) {
      Strcpy(itembuf, (otyp === CORPSE) ? "corpse" : (otyp === EGG) ? "egg" : (otyp === TIN) ? "tin" : "other?");
      Sprintf(eos(itembuf), " [%d]", obj.corpsenm);
    }
    else { Sprintf(itembuf, "%d", otyp); }
    impossible( "oeaten: attempting to set 0 nutrition food (%s) partially eaten", itembuf);
    return;
  }
  if (amt > 0) { obj.oeaten >>= amt; }
  else {
    if ( obj.oeaten > -amt) {
      obj.oeaten += amt;
    }
    else {
      obj.oeaten = 0;
    }
  }
  if (obj.oeaten === 0) {
    if (obj === game.svc.context.victual.piece) game.svc.context.victual.reqtime = game.svc.context.victual.usedtime;
    obj.oeaten = 1;
  }
}

// cf. eat.c maybe_finished_meal() — check if meal is done
async function maybe_finished_meal(game, stopping) {
    const occ = game?.occupation;
    if (!occ || typeof occ.fn !== 'function' || !occ.isEating) return false;
    const reqtime = Number.isInteger(occ?.eatState?.reqtime) ? occ.eatState.reqtime : (occ.xtime | 0);
    const usedtime = Number.isInteger(occ?.eatState?.usedtime) ? occ.eatState.usedtime : 0;
    if (usedtime < reqtime) return false;
    if (stopping) {
        game.occupation = null;
    }
    // C ref: maybe_finished_meal() calls eatfood() to finish the meal.
    await occ.fn(game);
    return true;
}

// cf. eat.c cant_finish_meal() — interrupt meal completion
function cant_finish_meal(game, corpse) {
    // Stub: prevents corpse from being consumed when it gets revived
}

// cf. eat.c Popeye() — spinach strength boost check
function Popeye(threat) {
    // Stub: checks if opening a tin of spinach might save hero
    return false;
}

// cf. eat.c Finish_digestion() — complete digestion process
function Finish_digestion() {
    // Stub: called via afternmv after swallowing a monster whole
    return 0;
}

// cf. eat.c eat_brains() — eat brain effects (for mind flayer attacks)
function eat_brains(magr, mdef, visflag, dmg_p) {
    // Stub: handles mind flayer brain-eating attack
    const xtra_dmg = rnd(10);
    if (noncorporeal(mdef.data || mons[mdef.mndx])) {
        return 0; // M_ATTK_MISS
    }
    return 1; // M_ATTK_HIT
}


// ============================================================
// 15. Main command — handleEat
// ============================================================

// cf. eat.c doeat() — main eat command (partial).
// cf. eat.c opentin() — open a tin.
// cf. eat.c bite() — apply incremental nutrition per turn (partial).

// handleEat implements partial doeat()/eatcorpse()/bite()/start_eating()/eatfood().
// Covers: floor food prompt, inventory selection, corpse rot checks, stack splitting,
// nutrition distribution, tripe flavor, newt energy, garlic breath, multi-turn occupation.
async function handleEat(player, display, game) {
    const map = game?.map;
    const floorFoods = map
        ? map.objectsAt(player.x, player.y).filter((o) => o && o.oclass === FOOD_CLASS)
        : [];

    // cf. eat.c floorfood() (partial) — if edible food is at hero square,
    // ask before opening inventory selector.
    if (floorFoods.length > 0) {
        const floorItem = floorFoods[0];
        const floorDescribed = doname(floorItem, null);
        const floorName = floorDescribed.replace(/^(?:an?|the)\s+/i, '');
        const article = /^[aeiou]/i.test(floorName) ? 'an' : 'a';
        await display.putstr_message(`There is ${article} ${floorName} here; eat it? [ynq] (n)`);
        const ans = String.fromCharCode(await nhgetch()).toLowerCase();
        if (ans === 'q') {
            // cf. eat.c floorfood() — 'q' exits immediately
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (ans === 'y') {
            if (floorItem.otyp === CORPSE) {
                const cnum = Number.isInteger(floorItem.corpsenm) ? floorItem.corpsenm : -1;
                const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
                let rottenTriggered = false;
                if (!nonrotting) {
                    rn2(20); // C: rotted age denominator
                    if (!rn2(7)) {
                        rottenTriggered = true;
                        // cf. eat.c rottenfood() branch probes
                        const c1 = rn2(4);
                        if (c1 !== 0) {
                            const c2 = rn2(4);
                            if (c2 !== 0) rn2(3);
                        }
                    }
                }
                const corpseWeight = (cnum >= 0 && mons[cnum]) ? (mons[cnum].weight || 0) : 0;
                // cf. eat.c eatcorpse() -> reqtime from corpse weight, then
                // rotten path consume_oeaten(..., 2) effectively quarters meal size.
                const baseReqtime = 3 + (corpseWeight >> 6);
                const reqtime = rottenTriggered
                    ? Math.max(1, Math.floor((baseReqtime + 2) / 4))
                    : baseReqtime;
                const eatState = { usedtime: 1, reqtime }; // first bite already happened
                let consumedFloorItem = false;
                const consumeFloorItem = () => {
                    if (consumedFloorItem) return;
                    consumedFloorItem = true;
                    // cf. eat.c done_eating() -> useupf() -> delobj() -> delobj_core()
                    // delobj_core consumes obj_resists(obj, 0, 0) for ordinary objects.
                    obj_resists(floorItem, 0, 0);
                    map.removeObject(floorItem);
                };

                if (reqtime > 1) {
                    const finishFloorEating = async () => {
                        consumeFloorItem();
                        if (rottenTriggered) {
                            await display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                        } else {
                            await display.putstr_message(`You finish eating the ${floorName}.`);
                        }
                    };
                    // cf. eat.c eatfood() / start_eating() — set_occupation
                    game.occupation = {
                        fn: async () => {
                            eatState.usedtime++;
                            // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                            if (eatState.usedtime > reqtime) {
                                await finishFloorEating();
                                return 0;
                            }
                            return 1;
                        },
                        isEating: true,
                        eatState,
                        occtxt: `eating ${floorName}`,
                        txt: `eating ${floorName}`,
                        xtime: reqtime,
                    };
                } else {
                    consumeFloorItem();
                    if (rottenTriggered) {
                        await display.putstr_message(`Blecch!  Rotten food!  You finish eating the ${floorName}.`);
                    } else {
                        await display.putstr_message(`You finish eating the ${floorName}.`);
                    }
                }
                return { moved: false, tookTime: true };
            }
        }
        // cf. eat.c floorfood() — 'n' (or default) falls through to getobj()
        // for inventory food selection, NOT "Never mind."
    }

    // cf. eat.c doeat() / eat_ok() (partial) — inventory food selection
    const food = player.inventory.filter(o => o.oclass === 6); // FOOD_CLASS
    if (food.length === 0) {
        await display.putstr_message("You don't have anything to eat.");
        return { moved: false, tookTime: false };
    }

    const eatChoices = compactInvletPromptChars(food.map(f => f.invlet).join(''));
    while (true) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        const eatPrompt = `What do you want to eat? [${eatChoices} or ?*] `;
        await display.putstr_message(eatPrompt);
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            display.topMessage = null;
            display.messageNeedsMore = false;
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            continue;
        }

        const item = food.find(f => f.invlet === c);
        if (!item) {
            const anyItem = player.inventory.find((o) => o.invlet === c);
            if (anyItem) {
                // cf. eat.c doeat() → getobj returns non-food item
                // (eat_ok returns GETOBJ_EXCLUDE_SELECTABLE), then
                // is_edible() check fails → "You cannot eat that!" and exit.
                await display.putstr_message('You cannot eat that!');
                return { moved: false, tookTime: false };
            }
            // cf. eat.c getobj() handles invalid letters differently depending
            // on mode. In non-wizard mode, it emits a "--More--" that blocks
            // until Space/Enter/Esc; in wizard mode it silently re-prompts.
            if (!player.wizard) {
                await display.putstr_message("You don't have that object.--More--");
                while (true) {
                    const moreCh = await nhgetch();
                    if (moreCh === 32 || moreCh === 10 || moreCh === 13 || moreCh === 27) break;
                }
            }
            continue;
        }
        // C ref: after getobj() returns, tty clears the prompt from topline.
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;

        // cf. eat.c doesplit() path — splitobj() for stacked comestibles:
        // splitobj() creates a single-item object and consumes next_ident() (rnd(2)).
        const eatingFromStack = ((item.quan || 1) > 1 && item.oclass === FOOD_CLASS);
        let eatenItem = item;
        if (eatingFromStack) {
            // cf. eat.c splitobj() keeps both pieces in inventory until done_eating().
            eatenItem = { ...item, quan: 1, o_id: next_ident() };
            item.quan = (item.quan || 1) - 1;
            const itemIndex = player.inventory.indexOf(item);
            if (itemIndex >= 0) {
                eatenItem.invlet = item.invlet;
                player.inventory.splice(itemIndex + 1, 0, eatenItem);
            }
        }

        let corpseTasteIdx = null;
        // cf. eat.c eatcorpse() RNG used by taint/rotting checks.
        if (eatenItem.otyp === CORPSE) {
            const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
            const nonrotting = (cnum === PM_LIZARD || cnum === PM_LICHEN);
            if (!nonrotting) {
                rn2(20); // rotted denominator
                rn2(7);  // rottenfood gate (when no prior taste effect triggered)
            }
            rn2(10); // palatable taste gate
            corpseTasteIdx = rn2(5);  // palatable message choice index
        }
        const od = objectData[eatenItem.otyp];
        const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
        const isCorpse = eatenItem.otyp === CORPSE && cnum >= 0 && cnum < mons.length;
        // cf. eat.c eatcorpse() overrides reqtime to 3 + (corpse weight >> 6).
        const reqtime = isCorpse
            ? (3 + ((mons[cnum].weight || 0) >> 6))
            : Math.max(1, (od ? od.delay : 1));
        const baseNutr = isCorpse
            ? (mons[cnum].nutrition || (od ? od.nutrition : 200))
            : (od ? od.nutrition : 200);
        // cf. eat.c bite() nmod calculation — nutrition distributed per bite.
        // nmod < 0 means add -nmod each turn; nmod > 0 means add 1 some turns
        const nmod = (reqtime === 0 || baseNutr === 0) ? 0
            : (baseNutr >= reqtime) ? -Math.floor(baseNutr / reqtime)
            : reqtime % baseNutr;
        const eatState = { usedtime: 0, reqtime };
        const satietyState = { warned: false, nomovemsg: null };

        // cf. eat.c bite() — apply incremental nutrition (partial)
        async function doBite() {
            if (nmod < 0) {
                await lesshungry(player, -nmod, { satietyState });
                player.nutrition += (-nmod);
            } else if (nmod > 0 && (eatState.usedtime % nmod)) {
                await lesshungry(player, 1, { satietyState });
                player.nutrition += 1;
            }
        }

        // First bite (turn 1) — mirrors C start_eating() + bite()
        eatState.usedtime++;
        await doBite();
        // cf. eat.c start_eating() — fprefx() is called for fresh
        // (not already partly eaten) non-corpse food, producing flavor
        // messages and RNG calls for specific food types.
        if (!isCorpse) {
            // cf. eat.c fprefx() (partial)
            if (eatenItem.otyp === TRIPE_RATION) {
                // cf. eat.c fprefx() tripe — carnivorous non-humanoid: "surprisingly good!"
                // orc: "Mmm, tripe..." (no RNG)
                // else: "Yak - dog food!" + rn2(2) vomit check
                const isOrc = player.race === RACE_ORC;
                if (!isOrc) {
                    const cannibalAllowed = (player.roleIndex === PM_CAVEMAN || isOrc);
                    if (rn2(2) && !cannibalAllowed) {
                        rn1(reqtime, 14); // make_vomiting duration
                    }
                }
            }
            // C ref: eat.c fprefx() for non-corpse food prints flavor messages
            // based on hunger level (e.g. "This food really hits the spot!") but
            // does NOT print "You begin eating X." — that message is only for
            // already_partly_eaten resumption (eat.c:3038-3040). Fresh food has
            // no generic "You begin eating" message in C.
        }
        let consumedInventoryItem = false;
        const consumeInventoryItem = () => {
            if (consumedInventoryItem) return;
            consumedInventoryItem = true;
            player.removeFromInventory(eatingFromStack ? eatenItem : item);
        };

        if (reqtime > 1) {
            const finishEating = async (gameCtx) => {
                // cf. eat.c done_eating()/cpostfx() runs from eatfood() when
                // occupation reaches completion, before moveloop's next monster turn.
                consumeInventoryItem();
                if (isCorpse && corpseTasteIdx !== null) {
                    const tastes = ['okay', 'stringy', 'gamey', 'fatty', 'tough'];
                    const idx = Math.max(0, Math.min(tastes.length - 1, corpseTasteIdx));
                    const verb = idx === 0 ? 'tastes' : 'is';
                    await display.putstr_message(
                        `This ${eatenItem.name} ${verb} ${tastes[idx]}.  `
                        + `You finish eating the ${eatenItem.name}.--More--`
                    );
                } else if (satietyState.nomovemsg) {
                    await display.putstr_message(satietyState.nomovemsg);
                } else {
                    // cf. eat.c done_eating() generic multi-turn completion line.
                    await display.putstr_message("You're finally finished.");
                }
                if (isCorpse && cnum === PM_NEWT) {
                    // cf. eat.c eye_of_newt_buzz() from cpostfx(PM_NEWT) (partial).
                    if (rn2(3) || (3 * (player.pw || 0) <= 2 * (player.pwmax || 0))) {
                        const oldPw = player.pw || 0;
                        player.pw = (player.pw || 0) + rnd(3);
                        if ((player.pw || 0) > (player.pwmax || 0)) {
                            if (!rn2(3)) {
                                player.pwmax = (player.pwmax || 0) + 1;
                            }
                            player.pw = player.pwmax || 0;
                        }
                        if ((player.pw || 0) !== oldPw) {
                            if (gameCtx) {
                                gameCtx.pendingToplineMessage = 'You feel a mild buzz.';
                            } else {
                                await display.putstr_message('You feel a mild buzz.');
                            }
                        }
                    }
                }
            };
            // cf. eat.c eatfood() / start_eating() — set_occupation
            let fullwarn = false;
            game.occupation = {
                fn: async () => {
                    eatState.usedtime++;
                    // cf. eat.c eatfood(): done when ++usedtime > reqtime.
                    if (eatState.usedtime > reqtime) {
                        await finishEating(game);
                        return 0; // done
                    }
                    await doBite();
                    const bitesLeft = reqtime - eatState.usedtime;
                    // C ref: eat.c lesshungry()/eatfood() — fullwarn path.
                    if (!fullwarn && bitesLeft > 1 && canchoke(player)) {
                        fullwarn = true;
                        await display.putstr_message('Continue eating? [yn] (n)');
                        game.pendingPrompt = {
                            type: 'eat_continue',
                            onKey: async (chCode, gameCtx) => {
                                if (chCode === 121 || chCode === 89) { // y/Y
                                    gameCtx.pendingPrompt = null;
                                    return { handled: true, continueEating: true };
                                }
                                // default answer is "n" on Enter/Esc/Space or explicit n/N
                                if (chCode === 110 || chCode === 78
                                    || chCode === 13 || chCode === 10
                                    || chCode === 27 || chCode === 32) {
                                    gameCtx.pendingPrompt = null;
                                    gameCtx.occupation = null;
                                    await display.putstr_message(`You stop eating the ${eatenItem.name}.`);
                                    return { handled: true, continueEating: false };
                                }
                                // Ignore unrelated keys while prompt is active.
                                return { handled: true, continueEating: null };
                            },
                        };
                        return 'prompt';
                    }
                    return 1; // continue
                },
                isEating: true,
                eatState,
                occtxt: `eating ${eatenItem.name}`,
                txt: `eating ${eatenItem.name}`,
                xtime: reqtime,
            };
        } else {
            // Single-turn food — eat instantly
            consumeInventoryItem();
            await display.putstr_message(`This ${eatenItem.name} is delicious!`);
            // cf. eat.c garlic_breath() — scare nearby olfaction monsters (partial).
            if (eatenItem.otyp === CLOVE_OF_GARLIC && map) {
                for (const mon of map.monsters) {
                    if (mon.dead) continue;
                    const sym = mon.type?.mlet ?? (mons[mon.mndx]?.mlet);
                    // cf. mondata.c olfaction() — golems, eyes, jellies, puddings,
                    // blobs, vortexes, elementals, fungi, and lights lack olfaction.
                    if (sym === S_GOLEM || sym === S_EYE || sym === S_JELLY
                        || sym === S_PUDDING || sym === S_BLOB || sym === S_VORTEX
                        || sym === S_ELEMENTAL || sym === S_FUNGUS || sym === S_LIGHT) {
                        continue;
                    }
                    // cf. eat.c garlic_breath() — distu(mtmp) < 7
                    const dx = mon.mx - player.x, dy = mon.my - player.y;
                    if (dx * dx + dy * dy < 7) {
                        applyMonflee(mon, 0, false);
                    }
                }
            }
        }
        return { moved: false, tookTime: true };
    }
}


// ============================================================
// Exports
// ============================================================

export { handleEat, // Hunger system
    hu_stat, SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, STARVED, gethungry, lesshungry, newuhs, reset_faint, // Food state
    is_edible, foodword, obj_nutrition, touchfood, reset_eat, do_reset_eat, food_substitution, recalc_wt, adj_victual_nutrition, // Intrinsics
    intrinsic_possible, should_givit, givit, corpse_intrinsic, // Corpse effects
    maybe_cannibal, cprefx, cpostfx, rottenfood, eatcorpse, fprefx, fpostfx, eataccessory, eatspecial, tin_details, consume_tin, start_tin, // Prompts
    edibility_prompts, eating_dangerous_corpse, floorfood, // Side effects
    vomit, maybe_finished_meal, cant_finish_meal, Popeye, Finish_digestion, eat_brains, // Constants
    nonrotting_corpse, nonrotting_food, CANNIBAL_ALLOWED, canchoke, SPINACH_TIN, ROTTEN_TIN, HOMEMADE_TIN, tintxts, TTSZ };

// Autotranslated from eat.c:518
export async function eatfood(game, player) {
  let food = game.svc.context.victual.piece;
  if (food && !carried(food) && !obj_here(food, player.x, player.y)) food = 0;
  if (!food) { await do_reset_eat(); return 0; }
  if (!game.svc.context.victual.eating) return 0;
  if (++game.svc.context.victual.usedtime <= game.svc.context.victual.reqtime) { if (await bite()) return 0; return 1; }
  else { await done_eating(true); return 0; }
}

// Autotranslated from eat.c:1697
export async function opentin(game, player) {
  if (!carried(game.svc.context.tin.tin) && (!obj_here(game.svc.context.tin.tin, player.x, player.y) || !can_reach_floor(true))) return 0;
  if (game.svc.context.tin.usedtime++ >= 50) { await You("give up your attempt to open the tin."); return 0; }
  if (game.svc.context.tin.usedtime < game.svc.context.tin.reqtime) return 1;
  await consume_tin("You succeed in opening the tin.");
  return 0;
}

// Autotranslated from eat.c:3092
export async function use_tin_opener(obj) {
  let otmp, res = ECMD_OK;
  if (!carrying(TIN)) { await You("have no tin to open."); return ECMD_OK; }
  if (obj !== uwep) {
    if (obj.cursed && obj.bknown) {
      let qbuf;
      if (ynq(safe_qbuf(qbuf, "Really wield ", "?", obj, doname, thesimpleoname, "that")) !== 'y') return ECMD_OK;
    }
    if (!await wield_tool(obj, "use")) return ECMD_OK;
    res = ECMD_TIME;
  }
  otmp = getobj("open", tinopen_ok, GETOBJ_NOFLAGS);
  if (!otmp) return (res|ECMD_CANCEL);
  await start_tin(otmp);
  return ECMD_TIME;
}

// Autotranslated from eat.c:3127
export async function bite(game, player) {
  sa_victual( game.svc.context.victual);
  if (game.svc.context.victual.canchoke && player.uhunger >= 2000) { await choke(game.svc.context.victual.piece); return 1; }
  if (game.svc.context.victual.doreset) { await do_reset_eat(); return 0; }
  gf.force_save_hs = true;
  if (game.svc.context.victual.nmod < 0) {
    await lesshungry(adj_victual_nutrition( ));
    await consume_oeaten(game.svc.context.victual.piece, game.svc.context.victual.nmod);
  }
  else if (game.svc.context.victual.nmod > 0 && (game.svc.context.victual.usedtime % game.svc.context.victual.nmod)) {
    await lesshungry(1);
    await consume_oeaten(game.svc.context.victual.piece, -1);
  }
  gf.force_save_hs = false;
  recalc_wt();
  return 0;
}
