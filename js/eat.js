// eat.js -- Eating mechanics
// cf. eat.c — doeat, start_eating, eatfood, bite, corpse intrinsics, hunger

import { rn2, rn1, rnd, d } from './rng.js';
import { nhgetch } from './input.js';
import { objectData, FOOD_CLASS, COIN_CLASS, CORPSE, TRIPE_RATION, CLOVE_OF_GARLIC,
         TIN, EGG, FOOD_RATION, LEMBAS_WAFER, CRAM_RATION,
         MEAT_RING, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL,
         LUMP_OF_ROYAL_JELLY, EUCALYPTUS_LEAF, APPLE, PEAR,
         FORTUNE_COOKIE, CREAM_PIE, CANDY_BAR, PANCAKE, SPRIG_OF_WOLFSBANE,
         CARROT, K_RATION, C_RATION, SLIME_MOLD,
         RIN_SLOW_DIGESTION, RIN_PROTECTION,
         FAKE_AMULET_OF_YENDOR, AMULET_OF_STRANGULATION,
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
import { PM_CAVEMAN, PM_VALKYRIE, PM_WIZARD,
         RACE_ORC, RACE_ELF, RACE_DWARF,
         A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, ACID_RES, STONE_RES,
         TELEPORT, TELEPORT_CONTROL, TELEPAT, LAST_PROP,
         FROMOUTSIDE, INTRINSIC, TIMEOUT,
         SLT_ENCUMBER, DEAF,
         REGENERATION, CONFLICT, PROTECTION, HUNGER, STRANGLED, CONFUSION,
         W_RINGL, W_RINGR, W_ARTI, W_WEP, FROMFORM,
         CHOKING, A_LAWFUL, PM_KNIGHT, PM_MONK,
         STARVING, KILLED_BY, KILLED_BY_AN,
         BY_COOKIE } from './const.js';
import { game as _gstate } from './gstate.js';
import { applyMonflee } from './mhitu.js';
import { obj_resists } from './objdata.js';
import { compactInvletPromptChars } from './invent.js';
import { pline, You, Your, You_feel, You_cant, pline_The, You_hear, impossible } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { acurr, ensureAttrArrays, gainstr } from './attrib.js';
import { nomul, end_running, near_capacity } from './hack.js';
import { incr_itimeout } from './potion.js';
import { done, setKillerName, setKillerFormat } from './end.js';
import { outrumor } from './rumors.js';
import { stop_occupation } from './allmain.js';
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
        if (cnum >= 0 && cnum < mons.length) return mons[cnum].cnutrit || 0;
    }
    const od = objectData[otmp.otyp];
    return od ? (od.oc_nutrition || 0) : 0;
}

// cf. eat.c init_uhunger() — initialize hunger state at game start
// Autotranslated from eat.c:125
export async function init_uhunger(game, player) {
  game.disp.botl = (player.uhs !== NOT_HUNGRY || player.atemp[A_STR] < 0);
  player.uhunger = 900;
  player.uhs = NOT_HUNGRY;
  if (player.atemp[A_STR] < 0) { player.atemp[A_STR] = 0; await encumber_msg(); }
}


// ============================================================
// 3. Hunger system
// ============================================================

// cf. eat.c:3158 gethungry() — process hunger each turn
// Ported faithfully for RNG parity. Accessory hunger (rings/amulets)
// is simplified since intrinsic sources aren't fully tracked.
async function gethungry(player) {
    if (player.uinvulnerable) return; // C: no hunger when invulnerable

    // C: (!Unaware || !rn2(10)) — slow metabolism while asleep
    // Unaware = sleeping or unconscious. Normal play: always true.
    const unaware = player.Unaware || false;
    const canEat = !unaware || !rn2(10);
    // C: (carnivorous || herbivorous || metallivorous) && !Slow_digestion
    // Humans are omnivorous (carnivorous|herbivorous), so canEat is usually true.
    const slowDigestion = player.Slow_digestion || false;
    if (canEat && !slowDigestion)
        player.hunger--; // ordinary food consumption

    // C: accessorytime = rn2(20) — randomized ring/amulet hunger trigger
    const accessorytime = rn2(20);
    if (accessorytime % 2) { // odd — regeneration/encumbrance hunger
        // C: (HRegeneration & ~FROMFORM) || (ERegeneration & ~(W_ARTI|W_WEP))
        const hRegen = player.uprops && player.uprops[REGENERATION]
            ? player.uprops[REGENERATION].intrinsic : 0;
        const eRegen = player.uprops && player.uprops[REGENERATION]
            ? player.uprops[REGENERATION].extrinsic : 0;
        if ((hRegen & ~FROMFORM) || (eRegen & ~(W_ARTI | W_WEP)))
            player.hunger--;
        // C: near_capacity() > SLT_ENCUMBER
        if (near_capacity(player) > SLT_ENCUMBER)
            player.hunger--;
    } else { // even — conflict/hunger intrinsic + ring/amulet accessory hunger
        if (player.Hunger)
            player.hunger--;
        // C: HConflict || (EConflict & ~W_ARTI)
        const hConflict = player.uprops && player.uprops[CONFLICT]
            ? player.uprops[CONFLICT].intrinsic : 0;
        const eConflict = player.uprops && player.uprops[CONFLICT]
            ? player.uprops[CONFLICT].extrinsic : 0;
        if (hConflict || (eConflict & ~W_ARTI))
            player.hunger--;
        // C:3218-3269 — ring/amulet accessory hunger on specific even values
        switch (accessorytime) {
        case 0:
            // Slow digestion from armor (not ring) still burns nutrition
            if (slowDigestion
                && (!player.rightRing || player.rightRing.otyp !== RIN_SLOW_DIGESTION)
                && (!player.leftRing || player.leftRing.otyp !== RIN_SLOW_DIGESTION))
                player.hunger--;
            break;
        case 4: {
            // C: EProtection = u.uprops[PROTECTION].extrinsic
            const eProt = (player.uprops && player.uprops[PROTECTION])
                ? player.uprops[PROTECTION].extrinsic : 0;
            if (player.leftRing && player.leftRing.otyp !== MEAT_RING
                && (player.leftRing.spe
                    || !objectData[player.leftRing.otyp].oc_charged
                    || (player.leftRing.otyp === RIN_PROTECTION
                        && ((eProt & ~W_RINGL) === 0
                            || ((eProt & ~W_RINGL) === W_RINGR
                                && player.rightRing && player.rightRing.otyp === RIN_PROTECTION
                                && !player.rightRing.spe)))))
                player.hunger--;
            break;
        }
        case 8:
            if (player.amulet && player.amulet.otyp !== FAKE_AMULET_OF_YENDOR)
                player.hunger--;
            break;
        case 12: {
            const eProt = (player.uprops && player.uprops[PROTECTION])
                ? player.uprops[PROTECTION].extrinsic : 0;
            if (player.rightRing && player.rightRing.otyp !== MEAT_RING
                && (player.rightRing.spe
                    || !objectData[player.rightRing.otyp].oc_charged
                    || (player.rightRing.otyp === RIN_PROTECTION
                        && ((eProt & ~W_RINGR) === 0))))
                player.hunger--;
        }
            break;
        case 16:
            if (player.uhave && player.uhave.amulet)
                player.hunger--;
            break;
        default:
            break;
        }
    }
    await newuhs(player, true);
}

// cf. eat.c morehungry() — increase hunger by amount
export async function morehungry(player, num) {
    player.hunger -= num;
    await newuhs(player, true);
}

// cf. eat.c:3284 lesshungry() — decrease hunger by amount
async function lesshungry(player, num) {
    const game = _gstate;
    // C: iseating = (occupation == eatfood) || force_save_hs
    const iseating = (game && game.occupation && game.occupation.isEating)
        || gf.force_save_hs;

    player.hunger += num;
    if (player.hunger >= 2000) {
        // C:3291-3299 — choking check with iseating guard
        const victual = game && game.svc && game.svc.context && game.svc.context.victual;
        if (!iseating || (victual && victual.canchoke)) {
            if (iseating) {
                await choke(victual && victual.piece, player);
                reset_eat(game);
            } else {
                await choke(null, player);
            }
        }
    } else if (player.hunger >= 1500) {
        // C:3305-3325 — nearly full warning
        // C: u.uhunger >= 1500 && !Hunger && (!victual.eating || !victual.fullwarn)
        const victual = game && game.svc && game.svc.context && game.svc.context.victual;
        const victualEating = victual && victual.eating;
        const fullwarn = victual && victual.fullwarn;
        if (!(player.Hunger) && (!victualEating || !fullwarn)) {
            await pline("You're having a hard time getting all of it down.");
            if (game) game.nomovemsg = "You're finally finished.";
            if (!victualEating) {
                // C: multi = -2 (not eating occupation, e.g. drinking juice)
                if (game) game.multi = -2;
            } else {
                // C: victual.fullwarn = 1
                if (victual) victual.fullwarn = 1;
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
// Module-level static state for meal-in-progress message suppression (C: save_hs, saved_hs)
var _save_hs = false;
var _saved_hs = NOT_HUNGRY;

// C: gf.force_save_hs — set TRUE in bite() to suppress messages during first bite
// before occupation is established (C eat.c:3391)
var gf = { force_save_hs: false };

// Reset hunger module state between test replays
export function resetHungerState() {
    _save_hs = false;
    _saved_hs = NOT_HUNGRY;
    gf.force_save_hs = false;
}

// cf. eat.c:3357-3508 newuhs() — faithfully ported line-by-line
async function newuhs(player, incr) {
    const game = _gstate;
    const h = player.hunger;
    let newhs;

    // C:3364-3367 — determine new hunger state
    newhs = (h > 1000) ? SATIATED
          : (h > 150) ? NOT_HUNGRY
          : (h > 50) ? HUNGRY
          : (h > 0) ? WEAK
          : FAINTING;

    // C:3391-3403 — meal-in-progress message suppression
    // Must come BEFORE fainting check (C order)
    // C: go.occupation == eatfood || gf.force_save_hs
    const isEating = (game && game.occupation && game.occupation.isEating)
        || gf.force_save_hs;
    if (isEating) {
        if (!_save_hs) {
            _saved_hs = player.uhs !== undefined ? player.uhs : NOT_HUNGRY;
            _save_hs = true;
        }
        player.uhs = newhs;
        player.hungerState = newhs;
        return;
    } else {
        if (_save_hs) {
            player.uhs = _saved_hs;
            _save_hs = false;
        }
    }

    // C:3405-3443 — fainting and starvation
    if (newhs === FAINTING) {
        const uhunger_div_by_10 = Math.sign(h)
            * Math.floor((Math.abs(h) + 5) / 10);

        if (player.uhs === FAINTED)
            newhs = FAINTED;

        // C:3411 — u.uhs <= WEAK || rn2(20 - uhunger_div_by_10) >= 19
        const oldUhs = player.uhs !== undefined ? player.uhs : NOT_HUNGRY;
        if (oldUhs <= WEAK || rn2(20 - uhunger_div_by_10) >= 19) {
            // C:3412 — if (!is_fainted() && multi >= 0)
            if (player.uhs !== FAINTED
                && (game ? (game.multi || 0) : 0) >= 0) {
                const duration = 10 - uhunger_div_by_10;

                // C:3416-3424 — stop, faint, go deaf
                if (game) await stop_occupation(game);
                await You("faint from lack of food.");
                // C: incr_itimeout(&HDeaf, duration)
                if (player.ensureUProp) incr_itimeout(player, DEAF, duration);
                if (game) {
                    game.disp = game.disp || {};
                    game.disp.botl = true;
                }
                if (game) nomul(-duration, game);
                if (game) game.multi_reason = "fainted from lack of food";
                // C: nomovemsg = "You regain consciousness."
                if (game) game.nomovemsg = "You regain consciousness.";
                // C: afternmv = unfaint — TODO when occupation system supports it
                newhs = FAINTED;
                // C:3425-3426 — selftouch if not levitating — omitted for now
            }
        // C:3432-3441 — starvation death (else if of faint check)
        } else if (h < -(100 + 10 * acurr(player, A_CON))) {
            player.uhs = STARVED;
            player.hungerState = STARVED;
            if (game) {
                game.disp = game.disp || {};
                game.disp.botl = true;
            }
            await You("die from starvation.");
            setKillerFormat(KILLED_BY);
            setKillerName("starvation");
            await done(STARVING, game);
            // C: if we return, we lifesaved, and that calls newuhs
            return;
        }

        // C: if still FAINTING after checks, revert to previous state
        if (newhs === FAINTING) {
            if (player.uhs !== FAINTING && player.uhs !== FAINTED)
                newhs = player.uhs;
        }
    }

    // C:3445 — if (newhs != u.uhs)
    const oldhs = player.uhs !== undefined ? player.uhs
                : (player.hungerState !== undefined ? player.hungerState : NOT_HUNGRY);

    if (newhs !== oldhs) {
        // C:3446-3461 — ATEMP(A_STR) transitions
        if (newhs >= WEAK && oldhs < WEAK) {
            ensureAttrArrays(player);
            player.atemp[A_STR] = -1; // temporary strength penalty
            // defer botl until after message
        } else if (newhs < WEAK && oldhs >= WEAK) {
            ensureAttrArrays(player);
            player.atemp[A_STR] = 0; // repair strength loss
            // defer botl until after message
        }

        // C:3463-3496 — state transition messages
        switch (newhs) {
        case HUNGRY:
            if (player.hallucinating) {
                await You(!incr ? "now have a lesser case of the munchies."
                         : "are getting the munchies.");
            } else {
                await You("%s.", !incr ? "only feel hungry now"
                           : (h < 145) ? "feel hungry"
                           : "are beginning to feel hungry");
            }
            // C:3472-3475 — stop non-eating occupation
            if (incr && game && game.occupation && !game.occupation.isEating) {
                await stop_occupation(game);
            }
            if (game) end_running(true, game);
            break;
        case WEAK:
            if (player.hallucinating) {
                await pline(!incr ? "You still have the munchies."
                    : "The munchies are interfering with your motor capabilities.");
            } else if (incr && (player.roleIndex === PM_WIZARD
                || player.race === RACE_ELF
                || player.roleIndex === PM_VALKYRIE)) {
                const name = (player.roleIndex === PM_WIZARD
                    || player.roleIndex === PM_VALKYRIE)
                    ? (player.roleName || "Adventurer") : "Elf";
                await pline("%s needs food, badly!", name);
            } else {
                await You("%s weak.", !incr ? "are still"
                    : (h < 45) ? "feel"
                    : "are beginning to feel");
            }
            // C:3491-3494 — stop non-eating occupation
            if (incr && game && game.occupation && !game.occupation.isEating) {
                await stop_occupation(game);
            }
            if (game) end_running(true, game);
            break;
        }

        // C:3497-3499 — update state
        player.uhs = newhs;
        player.hungerState = newhs;
        if (game) {
            game.disp = game.disp || {};
            game.disp.botl = true;
        }

        // C:3500-3505 — death from exhaustion after strength change
        const hp = player.uhp !== undefined ? player.uhp : (player.hp || 0);
        if (hp < 1) {
            await You("die from hunger and exhaustion.");
            setKillerFormat(KILLED_BY);
            setKillerName("exhaustion");
            await done(STARVING, game);
            return;
        }
    }
}

// cf. eat.c:1796-1804 Hear_again() — chance to cure deafness
async function Hear_again(player) {
    const game = _gstate;
    if (!rn2(2)) {
        // C: make_deaf(0L, FALSE) — clear deafness
        if (player.ensureUProp) {
            const entry = player.ensureUProp(DEAF);
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
        }
        if (game) {
            game.disp = game.disp || {};
            game.disp.botl = true;
        }
    }
    return 0;
}

// cf. eat.c:3330-3339 unfaint() — recover from fainting
export async function unfaint(game, player) {
    if (!player && game) player = game.player;
    await Hear_again(player);
    if (player.uhs > FAINTING) player.uhs = FAINTING;
    if (game) await stop_occupation(game);
    if (game) {
        game.disp = game.disp || {};
        game.disp.botl = true;
    }
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

// cf. eat.c:244-288 choke() — choking on food
export async function choke(food, player) {
    const game = _gstate;
    // C: only happens if you were satiated
    if (player.uhs !== SATIATED) {
        if (!food || food.otyp !== AMULET_OF_STRANGULATION) return;
    } else if (player.roleIndex === PM_KNIGHT
               && player.ualign && player.ualign.type === A_LAWFUL) {
        // C: adjalign(-1) — gluttony is unchivalrous
        if (player.ualign) player.ualign.record = (player.ualign.record || 0) - 1;
        await You_feel("like a glutton!");
    }
    await exercise(player, A_CON, false);

    // C: Breathless || Hunger || (!Strangled && !rn2(20))
    // Breathless: M1_BREATHLESS from polymorph form; false for normal player
    const breathless = false; // TODO: check polymorph form M1_BREATHLESS
    const hunger = player.hasProp ? player.hasProp(HUNGER) : !!player.Hunger;
    const strangled = player.hasProp ? player.hasProp(STRANGLED) : false;

    if (breathless || hunger || (!strangled && !rn2(20))) {
        if (food && food.otyp === AMULET_OF_STRANGULATION) {
            await You("choke, but recover your composure.");
            return;
        }
        await You("stuff yourself and then vomit voluminously.");
        await morehungry(player, hunger ? (player.hunger - 60) : 1000);
        await vomit(player);
    } else {
        // C: killer setup and death
        setKillerFormat(KILLED_BY_AN);
        if (food) {
            await You("choke over your food.");
            if (food.oclass === COIN_CLASS) {
                setKillerName("very rich meal");
            } else {
                setKillerFormat(KILLED_BY);
                setKillerName(food_xname(food, true));
            }
        } else {
            await You("choke over it.");
            setKillerName("quick snack");
        }
        await You("die...");
        await done(CHOKING, game);
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
    case FIRE_RES:    return (ptr.mconveys & MR_FIRE) !== 0;
    case SLEEP_RES:   return (ptr.mconveys & MR_SLEEP) !== 0;
    case COLD_RES:    return (ptr.mconveys & MR_COLD) !== 0;
    case DISINT_RES:  return (ptr.mconveys & MR_DISINT) !== 0;
    case SHOCK_RES:   return (ptr.mconveys & MR_ELEC) !== 0;
    case POISON_RES:  return (ptr.mconveys & MR_POISON) !== 0;
    case ACID_RES:    return (ptr.mconveys & MR_ACID) !== 0;
    case STONE_RES:   return (ptr.mconveys & MR_STONE) !== 0;
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

// cf. eat.c your_race() — check if monster is same race as player
function your_race(player, ptr) {
    // Simplified: check human race only (most common case)
    const race = player.race || 0;
    if (race === 0 && ptr && ptr.mlet === 'h') return true; // human
    if (race === RACE_ELF && is_elf(ptr)) return true;
    if (race === RACE_ORC && is_orc(ptr)) return true;
    if (race === RACE_DWARF && is_dwarf(ptr)) return true;
    return false;
}

// cf. eat.c:758-787 maybe_cannibal() — check/apply cannibalism effects
// C: static ate_brains tracking omitted (only matters for poly'd mind flayer multi-hit)
async function maybe_cannibal(player, pm, allowmsg) {
    if (!CANNIBAL_ALLOWED(player)
        && your_race(player, mons[pm])) {
        if (allowmsg) {
            await You('cannibal!  You will regret this!');
        }
        // C: HAggravate_monster |= FROMOUTSIDE
        // C: change_luck(-rn1(4, 2)) — luck penalty (-5..-2)
        const luckPenalty = -rn1(4, 2);
        if (player.luck !== undefined) player.luck += luckPenalty;
        return true;
    }
    return false;
}

// cf. eat.c fix_petrification() — cure petrification by eating
// Autotranslated from eat.c:866
export async function fix_petrification() {
  let buf;
  if (Hallucination) {
    buf = `What a pity--you just ruined a future piece of ${ACURR(A_CHA) > 15 ? "fine " : ""}art!`;
  }
  else {
    buf = "You feel limber!";
  }
  await make_stoned(0, buf, 0,  0);
}

// cf. eat.c cprefx() — corpse prefix effects (before eating)
async function cprefx(player, pm) {
    // C eat.c:793: (void) maybe_cannibal(pm, TRUE);
    await maybe_cannibal(player, pm, true);

    if (flesh_petrifies(mons[pm])) {
        // Would check Stone_resistance, polymon, etc.
    }

    switch (pm) {
    case PM_LITTLE_DOG: case PM_DOG: case PM_LARGE_DOG:
    case PM_KITTEN: case PM_HOUSECAT: case PM_LARGE_CAT:
        if (!CANNIBAL_ALLOWED(player)) {
            await You_feel(`that eating the ${mons[pm].mname} was a bad idea.`);
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
        // C: set_itimeout(&HInvis, rn1(100, 50))
        {
            const invisDuration = rn1(100, 50);
            // TODO: apply temporary invisibility when invis system ported
        }
        // FALLTHROUGH to stun
    case PM_YELLOW_LIGHT:
    case PM_GIANT_BAT:
        // C: make_stunned((HStun & TIMEOUT) + 30L, FALSE)
        // TODO: apply stun when status system ported
        // FALLTHROUGH
    case PM_BAT:
        // C: make_stunned((HStun & TIMEOUT) + 30L, FALSE)
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
            // C eat.c:1318: gainstr((struct obj *) 0, 0, TRUE)
            await gainstr(player, null, 0, true);
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
  if (!player.uconduct) player.uconduct = {};
  player.uconduct.unvegetarian = (player.uconduct.unvegetarian || 0) + 1;
  if (player.roleIndex === PM_MONK) {
      await You_feel("guilty.");
      if (player.ualign) player.ualign.record = (player.ualign.record || 0) - 1;
  }
}


// ============================================================
// 8. Rotten food / corpse eating
// ============================================================

// Hear_again() defined above (eat.c:1796-1804) — used by unfaint and rottenfood

// cf. eat.c:1807-1846 rottenfood() — effects of eating rotten food
async function rottenfood(player, obj) {
    const game = _gstate;
    // C: is_rottable(obj) ? "Rotten" : "Awful"
    const adj = obj.otyp === CORPSE ? 'Rotten' : 'Awful';
    await pline(`Blecch!  ${adj} ${foodword(obj)}!`);
    if (!rn2(4)) {
        // C: make_confused(HConfusion + d(2,4), FALSE)
        if (player.Hallucination)
            await You_feel('rather trippy.');
        else
            await You_feel('rather light-headed.');
        const confDuration = d(2, 4);
        const oldConf = player.getPropTimeout ? player.getPropTimeout(CONFUSION) : 0;
        if (player.ensureUProp) {
            const entry = player.ensureUProp(CONFUSION);
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | ((oldConf + confDuration) & TIMEOUT);
        }
    } else if (!rn2(4)) {
        // C: make_blinded(Blinded + d(2,10), FALSE) — only if !Blind
        await pline('Everything suddenly goes dark.');
        const blindDuration = d(2, 10);
        // TODO: apply blindness when blind system is ported
    } else if (!rn2(3)) {
        const duration = rnd(10);
        // C: pline_The("world spins and %s %s.", what, where)
        await pline_The('world spins and goes dark.');
        // C: incr_itimeout(&HDeaf, duration)
        if (player.ensureUProp) incr_itimeout(player, DEAF, duration);
        if (game) {
            game.disp = game.disp || {};
            game.disp.botl = true;
        }
        // C: nomul(-duration)
        if (game) {
            nomul(-duration, game);
            game.multi_reason = 'unconscious from rotten food';
            game.nomovemsg = 'You are conscious again.';
        }
        // C: afternmv = Hear_again — TODO when occupation system supports it
        return 1;
    }
    return 0;
}

// cf. eat.c:1849-2009 eatcorpse() — eat a corpse (rot checks, reqtime, etc.)
async function eatcorpse(player, otmp) {
    const game = _gstate;
    let retcode = 0, tp = 0;
    const mnum = otmp.corpsenm;

    if (mnum < 0 || mnum >= mons.length) return { retcode: 0, reqtime: 3 };

    const glob = !!otmp.globby;
    // C: stoneable/slimeable flags — simplified for now
    const stoneable = flesh_petrifies(mons[mnum]);
    const slimeable = (mnum === PM_GREEN_SLIME && !slimeproof(mons[mnum]));

    // Conduct tracking
    if (!vegan(mons[mnum])) {
        if (!player.uconduct) player.uconduct = {};
        player.uconduct.unvegan = (player.uconduct.unvegan || 0) + 1;
    }
    if (!vegetarian(mons[mnum])) {
        await violated_vegetarian(player);
    }

    // C:3879-3887 — compute rotted value
    let rotted = 0;
    if (!nonrotting_corpse(mnum)) {
        // C: rotted = (moves - age) / (10L + rn2(20))
        const age = otmp.age || 0;
        const moves = (game && game.moves) || 0;
        rotted = Math.floor((moves - age) / (10 + rn2(20)));
        if (otmp.cursed) rotted += 2;
        else if (otmp.blessed) rotted -= 2;
    }

    // C:3890-3938 — tainted/acidic/poisonous/mild illness checks
    if (!glob && !stoneable && !slimeable && rotted > 5) {
        // C: tainted meat — make_sick
        const meatType = (mons[mnum].mlet === S_FUNGUS) ? 'fungoid vegetation'
            : vegetarian(mons[mnum]) ? 'protoplasm' : 'meat';
        await pline(`Ulch - that ${meatType} was tainted!`);
        // C: rn1(10, 10) for sick_time
        const sickTime = rn1(10, 10);
        // TODO: apply make_sick when sickness system is ported
        await pline('(It must have died too long ago to be safe to eat.)');
        // C: useup(otmp) — corpse destroyed
        return { retcode: 2, reqtime: 3 };
    } else if (acidic(mons[mnum]) && !player.hasProp?.(ACID_RES)) {
        tp++;
        await You('have a very bad case of stomach acid.');
        const dmg = rnd(15);
        // TODO: losehp(dmg, "acidic corpse", KILLED_BY_AN)
    } else if (poisonous(mons[mnum]) && rn2(5)) {
        tp++;
        await pline('Ecch - that must have been poisonous!');
        if (!player.hasProp?.(POISON_RES)) {
            const strDmg = rnd(4);
            const hpDmg = rnd(15);
            // TODO: poison_strdmg(strDmg, hpDmg, "poisonous corpse", KILLED_BY_AN)
        } else {
            await You('seem unaffected by the poison.');
        }
    } else if ((rotted > 5 || (rotted > 3 && rn2(5))) && !player.Sick_resistance) {
        tp++;
        const prefix = player.Sick ? 'very ' : '';
        await You_feel(`${prefix}sick.`);
        const dmg = rnd(8);
        // TODO: losehp(dmg, "cadaver", KILLED_BY_AN)
    }

    // C: delay is weight dependent
    const reqtime = 3 + ((!glob ? (mons[mnum].cwt || 0) : (otmp.owt || 0)) >> 6);

    // C:3944-3965 — rottenfood check
    if (!tp && !nonrotting_corpse(mnum) && (otmp.orotten || !rn2(7))) {
        if (await rottenfood(player, otmp)) {
            otmp.orotten = true;
            retcode = 1;
        }
        if (!mons[otmp.corpsenm].cnutrit) {
            if (!retcode)
                await pline_The('corpse rots away completely.');
            retcode = 2;
        }
        if (!retcode) {
            // C: consume_oeaten(otmp, 2) — oeaten >>= 2
            if (otmp.oeaten) otmp.oeaten >>= 2;
        }
    } else if ((mnum === PM_COCKATRICE || mnum === PM_CHICKATRICE)
               && (player.Stone_resistance || player.Hallucination)) {
        await pline('This tastes just like chicken!');
    } else if (mnum === PM_FLOATING_EYE && player.umonnum === PM_RAVEN) {
        await You('peck the eyeball with delight.');
    } else if (!tp) {
        // C:3974-4009 — taste messages with RNG for palatability
        const isVegan = vegan(mons[mnum]);
        const isVegetarian = vegetarian(mons[mnum]);
        // C: yummy/palatable — simplified for humans (omnivore: yummy=false, palatable varies)
        const yummy = false; // omnivore
        const palatable = (isVegetarian || true /* omnivore herbivorous */)
            && rn2(10) && (rotted < 1 || !rn2(rotted + 1));
        const palatable_msgs = ['okay', 'stringy', 'gamey', 'fatty', 'tough'];
        const idx = isVegetarian ? 0 : rn2(palatable_msgs.length);
        const tasteWord = player.Hallucination
            ? (yummy ? 'gnarly' : palatable ? 'copacetic' : 'grody')
            : (yummy ? 'delicious' : palatable ? palatable_msgs[idx] : 'terrible');
        const useIs = player.Hallucination || (palatable && idx > 0
            && ['stringy', 'gamey', 'fatty', 'tough'].includes(palatable_msgs[idx]));
        const verb = useIs ? 'is' : 'tastes';
        const punct = (yummy || !palatable) ? '!' : '.';
        const prefix = type_is_pname(mons[mnum]) ? '' : 'This ';
        await pline(`${prefix}${foodword(otmp)} ${verb} ${tasteWord}${punct}`);
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

// cf. eat.c:2093-2212 fprefx() — food prefix effects (non-corpse)
async function fprefx(player, otmp, reqtime, map) {
    const game = _gstate;
    let giveFeedback = false;
    switch (otmp.otyp) {
    case EGG:
        if (otmp.corpsenm === PM_PYROLISK) {
            // C: explode(u.ux, u.uy, -11, d(3,6), 0, EXPL_FIERY)
            d(3, 6); // consume RNG for explosion damage
            // TODO: actual explosion when explode() is ported
            return false; // abort eating
        }
        // C: stale_egg(otmp) check
        if (otmp.age && game && game.moves && (game.moves - otmp.age) > 250) {
            await pline('Ugh.  Rotten egg.');
            // C: make_vomiting((Vomiting & TIMEOUT) + d(10, 4), TRUE)
            const vomDuration = d(10, 4);
            // TODO: apply make_vomiting when ported
        } else {
            giveFeedback = true;
        }
        break;
    case FOOD_RATION:
        if (player.hunger <= 200) {
            await pline(player.Hallucination
                ? 'Oh wow, like, superior, man!'
                : 'This food really hits the spot!');
        } else if (player.hunger < 700) {
            await pline('This satiates your stomach!');
        }
        break;
    case TRIPE_RATION:
        // C: carnivorous(youmonst.data) && !humanoid — polymorph-only
        if (player.race === RACE_ORC) {
            await pline(player.Hallucination ? 'Tastes great!  Less filling!'
                : 'Mmm, tripe... not bad!');
        } else {
            await pline('Yak - dog food!');
            // C: more_experienced(1, 0); newexplevel()
            // TODO: grant 1 XP when experience system is ported
            if (rn2(2) && !CANNIBAL_ALLOWED(player)) {
                const vomDuration = rn1(reqtime, 14);
                // TODO: make_vomiting(vomDuration, FALSE)
            }
        }
        break;
    case LEMBAS_WAFER:
        if (player.race === RACE_ORC) {
            await pline('!#?&* elf kibble!');
        } else if (player.race === RACE_ELF) {
            await pline('A little goes a long way.');
        } else {
            giveFeedback = true;
        }
        break;
    case MEATBALL: case MEAT_STICK: case ENORMOUS_MEATBALL: case MEAT_RING:
        giveFeedback = true;
        break;
    case CLOVE_OF_GARLIC:
        if (is_undead(mons[0] || {})) {
            // C: make_vomiting(rn1(reqtime, 5), FALSE)
            const vomDuration = rn1(reqtime, 5);
            // TODO: apply vomiting
            break;
        }
        // C: iter_mons(garlic_breath) — scare all olfaction monsters
        // TODO: iterate all monsters on level
        // FALLTHROUGH
    default:
        // C: cursed apple — skip core joke, feedback deferred to fpostfx
        if (otmp.otyp === APPLE && otmp.cursed) {
            ; // no message here; fpostfx handles sleep
        } else if ((otmp.otyp === APPLE || otmp.otyp === PEAR)
                   && player.Hallucination) {
            // C: rnd(100) for hallucination message variant
            const x = rnd(100);
            await pline(`${x <= 75 ? 'Segmentation fault' : x <= 99 ? 'Bus error' : "Yo' mama"} -- core dumped.`);
        } else if (otmp.otyp === APPLE || otmp.otyp === PEAR) {
            await pline('Core dumped.');
        } else {
            giveFeedback = true;
        }
        break;
    }

    if (giveFeedback) {
        // C: give_feedback label
        const name = foodword(otmp);
        const taste = otmp.cursed
            ? (player.Hallucination ? 'grody!' : 'terrible!')
            : (otmp.otyp === CRAM_RATION || otmp.otyp === K_RATION
                || otmp.otyp === C_RATION)
                ? 'bland.'
                : (player.Hallucination ? 'gnarly!' : 'delicious!');
        await pline(`This ${name} is ${taste}`);
    }
    return true;
}

// cf. eat.c fpostfx() — food postfix effects (non-corpse)
async function fpostfx(player, otmp) {
    switch (otmp.otyp) {
    case SPRIG_OF_WOLFSBANE:
        // Would cure lycanthropy
        break;
    case CARROT:
        // Would cure blindness
        break;
    case FORTUNE_COOKIE:
        // C eat.c:2517-2518: outrumor(bcsign(otmp), BY_COOKIE)
        {
            const bcs = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
            await outrumor(bcs, BY_COOKIE, player);
        }
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

// cf. eat.c:3731-3780 vomit() — vomiting effects
async function vomit(player) {
    const game = _gstate;
    // C: cantvomit(youmonst.data) — vortex/elemental/etc can't vomit
    // Simplified: assume player form can vomit (polymorphed checks omitted)
    const canVomit = true;

    if (!canVomit) {
        await Your("jaw gapes convulsively.");
    } else {
        // C: cure SICK_VOMITABLE
        // TODO: make_sick(0L, 0, TRUE, SICK_VOMITABLE) when sickness system ported
        if (player.uhs >= FAINTING) {
            // C: Your("%s heaves convulsively!", body_part(STOMACH))
            await Your("stomach heaves convulsively!");
        }
        // else: spewed = true (handled by vomiting_dialog countdown)
    }

    // C: nomul(-2) if multi >= -2
    if (game && (game.multi || 0) >= -2) {
        nomul(-2, game);
        game.multi_reason = "vomiting";
        game.nomovemsg = "You can move again.";
    }
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
  base =  (full_amount ? Math.floor(base * uneaten_amt / full_amount) : 0);
  return (base < 1) ? 1 : base;
}

// cf. eat.c consume_oeaten() — reduce oeaten field
// Autotranslated from eat.c:3802
export async function consume_oeaten(obj, amt, game) {
  if (!obj_nutrition(obj)) {
    let itembuf, otyp = obj.otyp;
    if (otyp === CORPSE || otyp === EGG || otyp === TIN) {
      itembuf = (otyp === CORPSE) ? "corpse" : (otyp === EGG) ? "egg" : (otyp === TIN) ? "tin" : "other?";
      itembuf += ` [${obj.corpsenm}]`;
    }
    else { itembuf = `${otyp}`; }
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
    let selectedItem = null;
    let selectedFromFloor = false;

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
            selectedItem = floorItem;
            selectedFromFloor = true;
        }
        // cf. eat.c floorfood() — 'n' (or default) falls through to getobj()
        // for inventory food selection, NOT "Never mind."
    }

    // cf. eat.c doeat() / eat_ok() (partial) — inventory food selection
    const food = player.inventory.filter(o => o.oclass === FOOD_CLASS);
    if (!selectedItem && food.length === 0) {
        await display.putstr_message("You don't have anything to eat.");
        return { moved: false, tookTime: false };
    }

    if (!selectedItem) {
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
            selectedItem = item;
            break;
        }
    }

    const item = selectedItem;
    const fromFloor = selectedFromFloor;

        // cf. eat.c doesplit() path — splitobj() for stacked comestibles:
        // splitobj() creates a single-item object and consumes next_ident() (rnd(2)).
        const eatingFromStack = !fromFloor && ((item.quan || 1) > 1 && item.oclass === FOOD_CLASS);
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

        const od = objectData[eatenItem.otyp];
        const cnum = Number.isInteger(eatenItem.corpsenm) ? eatenItem.corpsenm : -1;
        const isCorpse = eatenItem.otyp === CORPSE && cnum >= 0 && cnum < mons.length;
        let corpseOutcome = null;
        if (isCorpse) {
            // Use eatcorpse() for corpse-specific RNG/messages instead of
            // synthetic pre-consumption; this keeps call order faithful to C.
            corpseOutcome = await eatcorpse(player, eatenItem);
        }
        // cf. eat.c eatcorpse() overrides reqtime to 3 + (corpse weight >> 6).
        const reqtime = isCorpse
            ? Math.max(1, Number(corpseOutcome?.reqtime ?? (3 + ((mons[cnum].cwt || 0) >> 6))))
            : Math.max(1, (od ? od.oc_delay : 1));
        const baseNutr = isCorpse
            ? (mons[cnum].cnutrit || (od ? od.oc_nutrition : 200))
            : (od ? od.oc_nutrition : 200);
        // cf. eat.c bite() nmod calculation — nutrition distributed per bite.
        // nmod < 0 means add -nmod each turn; nmod > 0 means add 1 some turns
        const nmod = (reqtime === 0 || baseNutr === 0) ? 0
            : (baseNutr >= reqtime) ? -Math.floor(baseNutr / reqtime)
            : reqtime % baseNutr;
        const eatState = { usedtime: 0, reqtime };
        // Initialize victual context for C-faithful lesshungry/newuhs paths
        if (game && game.svc && game.svc.context) {
            if (!game.svc.context.victual) game.svc.context.victual = {};
            game.svc.context.victual.eating = 1;
            game.svc.context.victual.fullwarn = 0;
            game.svc.context.victual.piece = eatenItem;
            game.svc.context.victual.canchoke = (player.uhs === SATIATED);
            game.svc.context.victual.nmod = nmod;
        }
        // cf. eat.c bite() — apply incremental nutrition (partial)
        async function doBite() {
            if (nmod < 0) {
                await lesshungry(player, -nmod);
                player.nutrition += (-nmod);
            } else if (nmod > 0 && (eatState.usedtime % nmod)) {
                await lesshungry(player, 1);
                player.nutrition += 1;
            }
        }

        // First bite (turn 1) — mirrors C start_eating() + bite()
        eatState.usedtime++;
        await doBite();
        // cf. eat.c doeat():3022-3041 — non-corpse rotten check + fprefx
        if (!isCorpse) {
            // C eat.c:3022-3031: rotten food check before fprefx
            const isFortuneCookie = eatenItem.otyp === FORTUNE_COOKIE;
            const isRotten = !isFortuneCookie
                && (eatenItem.cursed
                    || (!nonrotting_food(eatenItem.otyp)
                        && game && game.moves && eatenItem.age
                        && (game.moves - eatenItem.age)
                            > (eatenItem.blessed ? 50 : 30)
                        && (eatenItem.orotten || !rn2(7))));
            if (isRotten) {
                if (await rottenfood(player, eatenItem)) {
                    eatenItem.orotten = true;
                }
            } else {
                await fprefx(player, eatenItem, reqtime, map);
            }
        }
        let consumedInventoryItem = false;
        const consumeInventoryItem = () => {
            if (consumedInventoryItem) return;
            consumedInventoryItem = true;
            if (fromFloor) {
                obj_resists(item, 0, 0);
                if (map) map.removeObject(item);
            } else {
                player.removeFromInventory(eatingFromStack ? eatenItem : item);
            }
        };
        if (isCorpse && Number(corpseOutcome?.retcode) === 2) {
            consumeInventoryItem();
            return { moved: false, tookTime: true };
        }

        if (reqtime > 1) {
            const finishEating = async (gameCtx) => {
                // cf. eat.c done_eating()/cpostfx() runs from eatfood() when
                // occupation reaches completion, before moveloop's next monster turn.
                consumeInventoryItem();
                // Clear victual eating state
                if (game && game.svc && game.svc.context && game.svc.context.victual) {
                    game.svc.context.victual.eating = 0;
                }
                if (game && game.nomovemsg) {
                    await display.putstr_message(game.nomovemsg);
                    game.nomovemsg = null;
                } else {
                    // cf. eat.c done_eating() generic multi-turn completion line.
                    await display.putstr_message("You're finally finished.");
                }
                // cf. eat.c done_eating():562-565 — dispatch to cpostfx/fpostfx
                if (isCorpse) {
                    await cpostfx(player, cnum, display);
                } else {
                    await fpostfx(player, eatenItem);
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
            if (isCorpse && !game.nomovemsg) {
                game.nomovemsg = `You finish eating the ${eatenItem.name}.`;
            }
        } else {
            // Single-turn food — eat instantly
            consumeInventoryItem();
            await display.putstr_message(`This ${eatenItem.name} is delicious!`);
            // cf. eat.c garlic_breath() — scare nearby olfaction monsters (partial).
            if (eatenItem.otyp === CLOVE_OF_GARLIC && map) {
                for (const mon of map.monsters) {
                    if (mon.dead) continue;
                    const sym = mon.data?.mlet ?? mon.type?.mlet ?? (mons[mon.mndx]?.mlet);
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
            // cf. eat.c done_eating():562-565 — dispatch to cpostfx/fpostfx
            if (isCorpse) {
                await cpostfx(player, cnum, display);
            } else {
                await fpostfx(player, eatenItem);
            }
        }
        return { moved: false, tookTime: true };
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

// cf. eat.c:3127 bite() — take one bite during eating occupation
export async function bite(game, player) {
  sa_victual(game.svc.context.victual);
  if (game.svc.context.victual.canchoke && player.uhunger >= 2000) {
    await choke(game.svc.context.victual.piece, player);
    return 1;
  }
  if (game.svc.context.victual.doreset) { await do_reset_eat(); return 0; }
  gf.force_save_hs = true;
  if (game.svc.context.victual.nmod < 0) {
    await lesshungry(player, adj_victual_nutrition(player, game.svc.context.victual.nmod));
    await consume_oeaten(game.svc.context.victual.piece, game.svc.context.victual.nmod);
  }
  else if (game.svc.context.victual.nmod > 0 && (game.svc.context.victual.usedtime % game.svc.context.victual.nmod)) {
    await lesshungry(player, 1);
    await consume_oeaten(game.svc.context.victual.piece, -1);
  }
  gf.force_save_hs = false;
  recalc_wt();
  return 0;
}
