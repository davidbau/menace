// attrib.js -- Attribute system: STR/DEX/CON/INT/WIS/CHA, luck, innate abilities
// cf. attrib.c — adjattrib, gainstr, losestr, poison_strdmg, poisontell, poisoned,
//                change_luck, stone_luck, set_moreluck, restore_attrib, exercise,
//                exerper, exerchk, rnd_attr, init_attr_role_redist, init_attr,
//                redist_attr, vary_init_attr, postadjabil, role_abil,
//                check_innate_abil, innately, is_innate, from_what, adjabil,
//                newhp, minuhpmax, setuhpmax, adjuhploss, acurr, acurrstr,
//                extremeattr, adjalign, uchangealign

import { rn2, rnd, rn1, d } from './rng.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, NUM_ATTRS,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
         FAST, STEALTH, SEARCHING, SEE_INVIS, WARNING, JUMPING,
         FIRE_RES, COLD_RES, SHOCK_RES, POISON_RES, SLEEP_RES,
         TELEPORT_CONTROL, INFRAVISION, DRAIN_RES,
         FIXED_ABIL, INTRINSIC, TIMEOUT,
         CLAIRVOYANT, REGENERATION, SICK, VOMITING,
         CONFUSION, HALLUC, FUMBLING, STUNNED,
         FROM_ROLE as FROMEXPER_BIT, FROM_RACE as FROMRACE_BIT,
         FROM_FORM as FROMFORM_BIT, FROMOUTSIDE } from './const.js';
import { A_CG_CONVERT, A_CG_HELM_ON, A_CG_HELM_OFF, Upolyd, DIED, POISONING,
         SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, MAXULEV } from './const.js';
import { roles, races } from './player.js';
import { pline, You, Your, You_feel, pline_The, livelog_printf } from './pline.js';
import { sgn, strstri } from './hacklib.js';
import { losehp, near_capacity } from './hack.js';
import { done } from './end.js';
import { game as _gstate } from './gstate.js';
import { DUNCE_CAP, GAUNTLETS_OF_POWER, HELM_OF_OPPOSITE_ALIGNMENT, LUCKSTONE } from './objects.js';
import { PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
         PM_KNIGHT, PM_MONK, PM_CLERIC, PM_ROGUE, PM_RANGER,
         PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD } from './monsters.js';
import { confers_luck, retouch_equipment } from './artifact.js';
import { add_weapon_skill, lose_weapon_skill } from './weapon.js';
import { encumber_msg } from './pickup.js';

// C ref: attrib.c bitmask values for intrinsic source tracking
// In C these are FROM_ROLE=0x01000000 etc but here we use them as FROMEXPER/FROMRACE
const FROMEXPER = FROMEXPER_BIT;
const FROMRACE = FROMRACE_BIT;
const FROMFORM = FROMFORM_BIT;

// String encoding: STR18(x) = 18+x, STR19(y) = 100+y
function STR18(x) { return 18 + x; }
function STR19(y) { return 100 + y; }

const LUCKMIN = -10;
const LUCKMAX = 10;
const LUCKADD = 3;
const AVAL = 50; // tune value for exercise gains

// reasons for innate ability
const FROM_NONE = 0;
const FROM_ROLE_REASON = 1; // from experience at level 1
const FROM_RACE_REASON = 2;
const FROM_INTR = 3; // intrinsically (eating some corpse or prayer reward)
const FROM_EXP = 4;  // from experience for some level > 1
const FROM_FORM_REASON = 5;
const FROM_LYCN = 6;

export function currentAlignLim(player = null) {
    const moves = Math.max(
        0,
        Number(player?.turns ?? _gstate?.moves ?? _gstate?.turnCount ?? 0) || 0
    );
    return 10 + Math.floor(moves / 200);
}

// part of the output on gain or loss of attribute
const plusattr = ["strong", "smart", "wise", "agile", "tough", "charismatic"];
const minusattr = ["weak", "stupid", "foolish", "clumsy", "fragile", "repulsive"];
const attrname = ["strength", "intelligence", "wisdom", "dexterity", "constitution", "charisma"];

// exercise/abuse text (must be in attribute order)
const exertext = [
    ["exercising diligently", "exercising properly"],           // Str
    [null, null],                                                // Int
    ["very observant", "paying attention"],                     // Wis
    ["working on your reflexes", "working on reflexes lately"], // Dex
    ["leading a healthy life-style", "watching your health"],   // Con
    [null, null],                                                // Cha
];

// --- Innate ability tables for roles and races ---
// Each entry: { ulevel, propid, gainstr, losestr }
// propid is the property index constant (SEARCHING, STEALTH, etc.)

const arc_abil = [
    { ulevel: 1, propid: SEARCHING, gainstr: "", losestr: "" },
    { ulevel: 5, propid: STEALTH, gainstr: "stealthy", losestr: "" },
    { ulevel: 10, propid: FAST, gainstr: "quick", losestr: "slow" },
];

const bar_abil = [
    { ulevel: 1, propid: POISON_RES, gainstr: "", losestr: "" },
    { ulevel: 7, propid: FAST, gainstr: "quick", losestr: "slow" },
    { ulevel: 15, propid: STEALTH, gainstr: "stealthy", losestr: "" },
];

const cav_abil = [
    { ulevel: 7, propid: FAST, gainstr: "quick", losestr: "slow" },
    { ulevel: 15, propid: WARNING, gainstr: "sensitive", losestr: "" },
];

const hea_abil = [
    { ulevel: 1, propid: POISON_RES, gainstr: "", losestr: "" },
    { ulevel: 15, propid: WARNING, gainstr: "sensitive", losestr: "" },
];

const kni_abil = [
    { ulevel: 7, propid: FAST, gainstr: "quick", losestr: "slow" },
];

const mon_abil = [
    { ulevel: 1, propid: FAST, gainstr: "", losestr: "" },
    { ulevel: 1, propid: SLEEP_RES, gainstr: "", losestr: "" },
    { ulevel: 1, propid: SEE_INVIS, gainstr: "", losestr: "" },
    { ulevel: 3, propid: POISON_RES, gainstr: "healthy", losestr: "" },
    { ulevel: 5, propid: STEALTH, gainstr: "stealthy", losestr: "" },
    { ulevel: 7, propid: WARNING, gainstr: "sensitive", losestr: "" },
    { ulevel: 9, propid: SEARCHING, gainstr: "perceptive", losestr: "unaware" },
    { ulevel: 11, propid: FIRE_RES, gainstr: "cool", losestr: "warmer" },
    { ulevel: 13, propid: COLD_RES, gainstr: "warm", losestr: "cooler" },
    { ulevel: 15, propid: SHOCK_RES, gainstr: "insulated", losestr: "conductive" },
    { ulevel: 17, propid: TELEPORT_CONTROL, gainstr: "controlled", losestr: "uncontrolled" },
];

const pri_abil = [
    { ulevel: 15, propid: WARNING, gainstr: "sensitive", losestr: "" },
    { ulevel: 20, propid: FIRE_RES, gainstr: "cool", losestr: "warmer" },
];

const ran_abil = [
    { ulevel: 1, propid: SEARCHING, gainstr: "", losestr: "" },
    { ulevel: 7, propid: STEALTH, gainstr: "stealthy", losestr: "" },
    { ulevel: 15, propid: SEE_INVIS, gainstr: "", losestr: "" },
];

const rog_abil = [
    { ulevel: 1, propid: STEALTH, gainstr: "", losestr: "" },
    { ulevel: 10, propid: SEARCHING, gainstr: "perceptive", losestr: "" },
];

const sam_abil = [
    { ulevel: 1, propid: FAST, gainstr: "", losestr: "" },
    { ulevel: 15, propid: STEALTH, gainstr: "stealthy", losestr: "" },
];

const tou_abil = [
    { ulevel: 10, propid: SEARCHING, gainstr: "perceptive", losestr: "" },
    { ulevel: 20, propid: POISON_RES, gainstr: "hardy", losestr: "" },
];

const val_abil = [
    { ulevel: 1, propid: COLD_RES, gainstr: "", losestr: "" },
    { ulevel: 3, propid: STEALTH, gainstr: "stealthy", losestr: "" },
    { ulevel: 7, propid: FAST, gainstr: "quick", losestr: "slow" },
];

const wiz_abil = [
    { ulevel: 15, propid: WARNING, gainstr: "sensitive", losestr: "" },
    { ulevel: 17, propid: TELEPORT_CONTROL, gainstr: "controlled", losestr: "uncontrolled" },
];

// Race intrinsics
const dwa_abil = [
    { ulevel: 1, propid: INFRAVISION, gainstr: "", losestr: "" },
];

const elf_abil = [
    { ulevel: 1, propid: INFRAVISION, gainstr: "", losestr: "" },
    { ulevel: 4, propid: SLEEP_RES, gainstr: "awake", losestr: "tired" },
];

const gno_abil = [
    { ulevel: 1, propid: INFRAVISION, gainstr: "", losestr: "" },
];

const orc_abil = [
    { ulevel: 1, propid: INFRAVISION, gainstr: "", losestr: "" },
    { ulevel: 1, propid: POISON_RES, gainstr: "", losestr: "" },
];

const hum_abil = [];

// --- Helper functions to access player attribute arrays ---

// Ensure player has attrMax, abon, atemp, atime arrays initialized
function ensureAttrArrays(player) {
    if (!player.attributes || player.attributes.length < NUM_ATTRS) {
        player.attributes = new Array(NUM_ATTRS).fill(10);
    }
    if (!player.attrMax || player.attrMax.length < NUM_ATTRS) {
        player.attrMax = player.attributes.slice();
    }
    if (!player.abon || player.abon.length < NUM_ATTRS) {
        player.abon = new Array(NUM_ATTRS).fill(0);
    }
    if (!player.atemp || player.atemp.length < NUM_ATTRS) {
        player.atemp = new Array(NUM_ATTRS).fill(0);
    }
    if (!player.atime || player.atime.length < NUM_ATTRS) {
        player.atime = new Array(NUM_ATTRS).fill(0);
    }
}

// C: ABASE(i)
function ABASE(player, i) { return player.attributes[i]; }
function setABASE(player, i, v) { player.attributes[i] = v; }

// C: AMAX(i)
function AMAX(player, i) {
    ensureAttrArrays(player);
    return player.attrMax[i];
}
function setAMAX(player, i, v) {
    ensureAttrArrays(player);
    player.attrMax[i] = v;
}

// C: ABON(i)
function ABON(player, i) {
    ensureAttrArrays(player);
    return player.abon[i];
}

// C: ATEMP(i)
function ATEMP(player, i) {
    ensureAttrArrays(player);
    return player.atemp[i];
}
function setATEMP(player, i, v) {
    ensureAttrArrays(player);
    player.atemp[i] = v;
}

// C: ATIME(i)
function ATIME(player, i) {
    ensureAttrArrays(player);
    return player.atime[i];
}
function setATIME(player, i, v) {
    ensureAttrArrays(player);
    player.atime[i] = v;
}

// C: AEXE(i) - exercise accumulation
function AEXE(player, i) {
    if (!player.aexercise) player.aexercise = new Array(NUM_ATTRS).fill(0);
    return player.aexercise[i] || 0;
}
function setAEXE(player, i, v) {
    if (!player.aexercise) player.aexercise = new Array(NUM_ATTRS).fill(0);
    player.aexercise[i] = v;
}

// C: ATTRMIN(i) and ATTRMAX(i) -- from race
function ATTRMIN(player, i) {
    const race = races[player.race];
    return race ? race.attrmin[i] : 3;
}
function ATTRMAX(player, i) {
    const race = races[player.race];
    return race ? race.attrmax[i] : 18;
}

// Ensure uprops entry
function ensureUProp(player, prop) {
    if (!player.uprops) player.uprops = {};
    if (!player.uprops[prop]) {
        player.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    return player.uprops[prop];
}

function getIntrinsic(player, prop) {
    if (!player.uprops || !player.uprops[prop]) return 0;
    return player.uprops[prop].intrinsic || 0;
}

function getExtrinsic(player, prop) {
    if (!player.uprops || !player.uprops[prop]) return 0;
    return player.uprops[prop].extrinsic || 0;
}

// C: Fixed_abil
function Fixed_abil(player) {
    return !!(getIntrinsic(player, FIXED_ABIL) || getExtrinsic(player, FIXED_ABIL));
}

// Upolyd imported from const.js

// C: Poison_resistance
function hasPoisonRes(player) {
    return !!(getIntrinsic(player, POISON_RES) || getExtrinsic(player, POISON_RES));
}

// C: u_wield_art(ART_OGRESMASHER)
function u_wield_art(player, artid) {
    return player.weapon && player.weapon.oartifact === artid;
}

// Stub for see_monsters — called after Warning/See_invisible changes
function see_monsters() {
    // Display refresh; a no-op in contexts where display isn't available
}


// done imported from end.js

// Stub for shieldeff
function shieldeff(_x, _y) {
    // Visual shield effect at location
}

// Stub for make_confused
function make_confused(player, duration, _something) {
    // Apply confusion
    if (player && duration > 0) {
        const entry = ensureUProp(player, 13); // CONFUSION
        entry.intrinsic = (entry.intrinsic & ~0x00FFFFFF) | (duration & 0x00FFFFFF);
    }
}

// Stub for summon_furies
function summon_furies(_count) {
    // Summon furies; not yet implemented
}

// Stub for adj_erinys
function adj_erinys(_abuse) {
    // Adjust erinys tracking; not yet implemented
}


// --- Poison effect messages ---
const poiseff = [
    { func: You_feel, msg: "weaker" },             // A_STR
    { func: Your, msg: "brain is on fire" },       // A_INT
    { func: Your, msg: "judgement is impaired" },  // A_WIS
    { func: Your, msg: "muscles won't obey you" }, // A_DEX
    { func: You_feel, msg: "very sick" },          // A_CON
    { func: You, msg: "break out in hives" },      // A_CHA
];

// --- Exported functions ---

// cf. attrib.c:1197 — acurr(chridx): current effective attribute value
export function acurr(player, chridx) {
    ensureAttrArrays(player);
    let tmp = (player.abon[chridx] || 0) + (player.atemp[chridx] || 0) + player.attributes[chridx];
    let result = 0;

    if (chridx === A_STR) {
        if (tmp >= STR19(25) || (player.gloves && player.gloves.otyp === GAUNTLETS_OF_POWER))
            result = STR19(25); // 125
        else
            result = Math.max(tmp, 3);
    } else if (chridx === A_CHA) {
        if (tmp < 18) {
            const data = player.data || (player.monsterData);
            if (data && (data.mlet === 'n' /* S_NYMPH */))
                result = 18;
            // PM_AMOROUS_DEMON check omitted for now
        }
    } else if (chridx === A_CON) {
        const ART_OGRESMASHER = 16;
        if (u_wield_art(player, ART_OGRESMASHER))
            result = 25;
    } else if (chridx === A_INT || chridx === A_WIS) {
        if (player.helmet && player.helmet.otyp === DUNCE_CAP)
            result = 6;
    }

    if (result === 0)
        result = (tmp >= 25) ? 25 : (tmp <= 3) ? 3 : tmp;

    return result;
}

// cf. attrib.c:1242 — acurrstr(): normalized strength value
export function acurrstr(player) {
    const str = acurr(player, A_STR); // 3..125
    let result;

    if (str <= STR18(0)) // <= 18
        result = Math.max(str, 3);
    else if (str <= STR19(21)) // <= 121
        result = 19 + Math.floor(str / 50);
    else
        result = Math.min(str, 125) - 100;

    return result;
}

// cf. attrib.c:116 — adjattrib(ndx, incr, msgflg): adjust an attribute
// Returns true if change was made, false otherwise.
// msgflg: positive => no message, zero => message, negative => conditional
export async function adjattrib(player, ndx, incr, msgflg) {
    if (Fixed_abil(player) || !incr)
        return false;

    if ((ndx === A_INT || ndx === A_WIS) && player.helmet && player.helmet.otyp === DUNCE_CAP) {
        if (msgflg === 0)
            await Your("cap constricts briefly, then relaxes again.");
        return false;
    }

    ensureAttrArrays(player);

    const old_acurr = acurr(player, ndx);
    const old_abase = ABASE(player, ndx);
    const old_amax = AMAX(player, ndx);

    setABASE(player, ndx, ABASE(player, ndx) + incr);

    let attrstr, abonflg;
    if (incr > 0) {
        if (ABASE(player, ndx) > AMAX(player, ndx)) {
            setAMAX(player, ndx, ABASE(player, ndx));
            if (AMAX(player, ndx) > ATTRMAX(player, ndx)) {
                setABASE(player, ndx, ATTRMAX(player, ndx));
                setAMAX(player, ndx, ATTRMAX(player, ndx));
            }
        }
        attrstr = plusattr[ndx];
        abonflg = (ABON(player, ndx) < 0);
    } else {
        if (ABASE(player, ndx) < ATTRMIN(player, ndx)) {
            const decr = rn2(ATTRMIN(player, ndx) - ABASE(player, ndx) + 1);
            setABASE(player, ndx, ATTRMIN(player, ndx));
            setAMAX(player, ndx, AMAX(player, ndx) - decr);
            if (AMAX(player, ndx) < ATTRMIN(player, ndx))
                setAMAX(player, ndx, ATTRMIN(player, ndx));
        }
        attrstr = minusattr[ndx];
        abonflg = (ABON(player, ndx) > 0);
    }

    if (acurr(player, ndx) === old_acurr) {
        if (msgflg === 0) {
            if (ABASE(player, ndx) === old_abase && AMAX(player, ndx) === old_amax) {
                await pline("You're %s as %s as you can get.",
                      abonflg ? "currently" : "already", attrstr);
            } else {
                await Your("innate %s has %s.", attrname[ndx],
                     (incr > 0) ? "improved" : "declined");
            }
        }
        return false;
    }

    // C ref: attrib.c adjattrib() sets context.botl = 1 when acurr changes
    player._botl = true;
    if (msgflg <= 0)
        await You_feel("%s%s!", (incr > 1 || incr < -1) ? "very " : "", attrstr);
    if (ndx === A_STR || ndx === A_CON)
        await encumber_msg(player);
    return true;
}

// cf. attrib.c:199 — gainstr(otmp, incr, givemsg)
// Autotranslated from attrib.c:199
export async function gainstr(player, otmp, incr, givemsg) {
  let num = incr;
  if (!num) {
    if (ABASE(player, A_STR) < 18) num = (rn2(4) ? 1 : rnd(6));
    else if (ABASE(player, A_STR) < STR18(85)) num = rnd(10);
    else {
      num = 1;
    }
  }
  await adjattrib(player, A_STR, (otmp && otmp.cursed) ? -num : num, givemsg ? -1 : 1);
}

// cf. attrib.c:218 — losestr(num, knam, k_format)
export async function losestr(player, num, knam, k_format) {
    const uhpmin = minuhpmax(player, 1);
    let ustr = ABASE(player, A_STR) - num;
    const waspolyd = Upolyd(player);
    let dmg = 0;

    if (num <= 0 || ABASE(player, A_STR) < ATTRMIN(player, A_STR)) {
        return;
    }

    while (ustr < ATTRMIN(player, A_STR)) {
        ++ustr;
        --num;
        const amt = rn1(4, 3); // 3..6
        dmg += amt;
    }
    if (dmg) {
        if (!knam || knam === '') {
            knam = "terminal frailty";
            k_format = 1; // KILLED_BY
        }
        await losehp(dmg, knam, k_format, player, _gstate?.display, _gstate);

        if (Upolyd(player)) {
            setuhpmax(player, Math.max((player.mhmax || 1) - dmg, 1), false);
        } else if (!waspolyd) {
            if ((player.uhpmax || 1) > uhpmin)
                setuhpmax(player, Math.max((player.uhpmax || 1) - dmg, uhpmin), false);
        }
    }

    if (num > 0 && (Upolyd(player) || !waspolyd))
        await adjattrib(player, A_STR, -num, 1);
}

// cf. attrib.c:271 — poison_strdmg(strloss, dmg, knam, k_format)
// Autotranslated from attrib.c:270
export async function poison_strdmg(player, strloss, dmg, knam, k_format) {
  await losestr(player, strloss, knam, k_format);
  await losehp(dmg, knam, k_format, player, _gstate?.display, _gstate);
}

// cf. attrib.c:291 — poisontell(typ, exclaim)
export async function poisontell(player, typ, exclaim) {
    const entry = poiseff[typ];
    let msg = entry.msg;

    if (typ === A_STR && acurr(player, A_STR) === STR19(25))
        msg = "innately weaker";
    else if (typ === A_CON && acurr(player, A_CON) === 25)
        msg = "sick inside";

    await entry.func("%s%s", msg, exclaim ? '!' : '.');
}

// cf. attrib.c:314 — poisoned(reason, typ, pkiller, fatal, thrown_weapon)
export async function poisoned(player, reason, typ, pkiller, fatal, thrown_weapon) {
    let kprefix = 0; // KILLED_BY_AN
    const blast = (reason === "blast");

    if (!blast && !strstri(reason, "poison")) {
        const plural = reason[reason.length - 1] === 's';
        await pline("%s%s %s poisoned!",
              (reason[0] >= 'A' && reason[0] <= 'Z') ? "" : "The ",
              reason,
              plural ? "were" : "was");
    }
    if (hasPoisonRes(player)) {
        if (blast)
            shieldeff(player.x, player.y);
        await pline_The("poison doesn't seem to affect you.");
        return;
    }

    // suppress killer prefix if it already has one
    if (pkiller && (pkiller.toLowerCase().startsWith("the ") ||
                    pkiller.toLowerCase().startsWith("an ") ||
                    pkiller.toLowerCase().startsWith("a "))) {
        kprefix = 1; // KILLED_BY
    }

    const i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0));
    if (i === 0 && typ !== A_CHA) {
        // sometimes survivable instant kill
        const loss0 = 6 + d(4, 6); // 10..34
        if (player.uhp <= loss0) {
            player.uhp = -1;
            await pline_The("poison was deadly...");
        } else {
            const olduhp = player.uhp;
            const newuhpmax = (player.uhpmax || 1) - Math.floor(loss0 / 2);
            setuhpmax(player, Math.max(newuhpmax, minuhpmax(player, 3)), true);
            const loss1 = adjuhploss(player, loss0, olduhp);

            await losehp(loss1, pkiller, kprefix, player, _gstate?.display, _gstate);
            if (await adjattrib(player, A_CON, (typ !== A_CON) ? -1 : -3, true))
                await poisontell(player, A_CON, true);
            if (typ !== A_CON && await adjattrib(player, typ, -3, 1))
                await poisontell(player, typ, true);
        }
    } else if (i > 5) {
        const cloud = (reason === "gas cloud");
        let loss = thrown_weapon ? rnd(6) : rn1(10, 6);
        if ((blast || cloud) && player.halfGasDamage)
            loss = Math.floor((loss + 1) / 2);
        await losehp(loss, pkiller, kprefix, player, _gstate?.display, _gstate);
    } else {
        const loss = (thrown_weapon || !fatal) ? 1 : d(2, 2);
        if (await adjattrib(player, typ, -loss, 1))
            await poisontell(player, typ, true);
    }

    if (player.uhp < 1) {
        player.deathCause = pkiller || "poison";
        await done(strstri(pkiller || "", "poison") ? DIED : POISONING, _gstate);
    }
    await encumber_msg(player);
}

// cf. attrib.c:408 — change_luck(n)
// Autotranslated from attrib.c:407
export function change_luck(n, player) {
  player.uluck += n;
  if (player.uluck < 0 && player.uluck < LUCKMIN) player.uluck = LUCKMIN;
  if (player.uluck > 0 && player.uluck > LUCKMAX) player.uluck = LUCKMAX;
}

// C ref: you.h macro Luck -- effective luck used by gameplay rolls.
// JS keeps u.uluck as `player.uluck` (legacy alias `player.luck`) and
// u.moreluck as `player.moreluck`.
export function Luck(player) {
    return ((player?.uluck ?? player?.luck) || 0) + (player?.moreluck || 0);
}

// cf. attrib.c:420 — stone_luck(include_uncursed)
export function stone_luck(player, include_uncursed) {
    let bonchance = 0;
    const inv = player.inventory || [];

    for (const otmp of inv) {
        if (otmp && confers_luck(otmp)) {
            if (otmp.cursed)
                bonchance -= (otmp.quan || 1);
            else if (otmp.blessed || include_uncursed)
                bonchance += (otmp.quan || 1);
        }
    }

    return sgn(bonchance);
}

// cf. attrib.c:438 — set_moreluck()
export function set_moreluck(player) {
    const luckbon = stone_luck(player, true);
    const hasLuckstone = (player.inventory || []).some(o => o && o.otyp === LUCKSTONE);

    if (!luckbon && !hasLuckstone)
        player.moreluck = 0;
    else if (luckbon >= 0)
        player.moreluck = LUCKADD;
    else
        player.moreluck = -LUCKADD;
}

// cf. attrib.c:452 — restore_attrib()
export async function restore_attrib(player) {
    ensureAttrArrays(player);
    let botl = false;

    for (let i = 0; i < NUM_ATTRS; i++) {
        const equilibrium = ((i === A_STR && (player.uhs || 0) >= WEAK)
                            || (i === A_DEX && player.woundedLegs)) ? -1 : 0;
        if (ATEMP(player, i) !== equilibrium && ATIME(player, i) !== 0) {
            setATIME(player, i, ATIME(player, i) - 1);
            if (ATIME(player, i) === 0) {
                setATEMP(player, i, ATEMP(player, i) + (ATEMP(player, i) > 0 ? -1 : 1));
                botl = true;
                if (ATEMP(player, i))
                    setATIME(player, i, Math.floor(100 / acurr(player, A_CON)));
            }
        }
    }
    if (botl) {
        // C ref: attrib.c restore_attrib() sets context.botl = 1
        player._botl = true;
        await encumber_msg(player);
    }
}

// cf. attrib.c:486 — exercise(i, inc_or_dec)
// Note: The full exercise() is in attrib_exercise.js for RNG parity.
// This version is the faithful C port for use when full attribute mutation is needed.
export async function exercise(player, i, inc_or_dec) {
    if (i === A_INT || i === A_CHA) return;
    if (Upolyd(player) && i !== A_WIS) return;

    if (Math.abs(AEXE(player, i)) < AVAL) {
        if (inc_or_dec) {
            setAEXE(player, i, AEXE(player, i) + ((rn2(19) > acurr(player, i)) ? 1 : 0));
        } else {
            setAEXE(player, i, AEXE(player, i) - rn2(2));
        }
    }
    if (i === A_STR || i === A_CON)
        await encumber_msg(player);
}

// cf. attrib.c:518 — exerper() [static]
async function exerper(player) {
    const moves = player.turns || 0;

    if (!(moves % 10)) {
        // Hunger checks
        const uhunger = player.nutrition || player.hunger || 0;
        const hs = (uhunger > 1000) ? SATIATED
                 : (uhunger > 150) ? NOT_HUNGRY
                 : (uhunger > 50) ? HUNGRY
                 : (uhunger > 0) ? WEAK
                 : FAINTING;

        switch (hs) {
        case SATIATED:
            await exercise(player, A_DEX, false);
            if (player.roleMnum === PM_MONK)
                await exercise(player, A_WIS, false);
            break;
        case NOT_HUNGRY:
            await exercise(player, A_CON, true);
            break;
        case WEAK:
            await exercise(player, A_STR, false);
            if (player.roleMnum === PM_MONK)
                await exercise(player, A_WIS, true);
            break;
        case FAINTING:
            await exercise(player, A_CON, false);
            break;
        }

        // Encumbrance checks
        const cap = near_capacity(player);
        switch (cap) {
        case 2: // MOD_ENCUMBER
            await exercise(player, A_STR, true);
            break;
        case 3: // HVY_ENCUMBER
            await exercise(player, A_STR, true);
            await exercise(player, A_DEX, false);
            break;
        case 4: // EXT_ENCUMBER
            await exercise(player, A_DEX, false);
            await exercise(player, A_CON, false);
            break;
        }
    }

    // Status checks
    if (!(moves % 5)) {
        // Clairvoyant check
        const clairIntr = getIntrinsic(player, CLAIRVOYANT);
        const clairBlocked = player.uprops && player.uprops[CLAIRVOYANT] && player.uprops[CLAIRVOYANT].blocked;
        if ((clairIntr & (INTRINSIC | TIMEOUT)) && !clairBlocked)
            await exercise(player, A_WIS, true);
        // Regeneration
        if (getIntrinsic(player, REGENERATION))
            await exercise(player, A_STR, true);

        // Sick or Vomiting
        const sick = getIntrinsic(player, SICK);
        const vomiting = getIntrinsic(player, VOMITING);
        if (sick || vomiting)
            await exercise(player, A_CON, false);
        // Confusion or Hallucination
        const confused = getIntrinsic(player, CONFUSION);
        const hallu = getIntrinsic(player, HALLUC);
        if (confused || hallu)
            await exercise(player, A_WIS, false);
        // Wounded legs / Fumbling / Stun
        const wlegs = player.woundedLegs;
        const fumbling = getIntrinsic(player, FUMBLING);
        const stun = getIntrinsic(player, STUNNED);
        if ((wlegs && !player.usteed) || fumbling || stun)
            await exercise(player, A_DEX, false);
    }
}

// cf. attrib.c:595 — exerchk()
export async function exerchk(player) {
    const moves = player.turns || 0;

    // Check periodic accumulations
    await exerper(player);

    // Are we ready for a test?
    if (!player.nextAttrCheck) player.nextAttrCheck = 600;
    if (moves >= player.nextAttrCheck && !_gstate?.multi) {
        for (let i = 0; i < NUM_ATTRS; ++i) {
            let ax = AEXE(player, i);
            if (!ax) continue;

            const mod_val = sgn(ax);
            let lolim = ATTRMIN(player, i);
            let hilim = ATTRMAX(player, i);
            if (hilim > 18) hilim = 18;

            if ((ax < 0) ? (ABASE(player, i) <= lolim) : (ABASE(player, i) >= hilim)) {
                // nextattrib: decay exercise
                setAEXE(player, i, Math.floor(Math.abs(ax) / 2) * mod_val);
                continue;
            }
            if (Upolyd(player) && i !== A_WIS) {
                setAEXE(player, i, Math.floor(Math.abs(ax) / 2) * mod_val);
                continue;
            }

            if (rn2(AVAL) > ((i !== A_WIS) ? Math.floor(Math.abs(ax) * 2 / 3) : Math.abs(ax))) {
                setAEXE(player, i, Math.floor(Math.abs(ax) / 2) * mod_val);
                continue;
            }

            if (await adjattrib(player, i, mod_val, -1)) {
                setAEXE(player, i, 0);
                ax = 0;
                await You("%s %s.",
                    (mod_val > 0) ? "must have been" : "haven't been",
                    exertext[i][(mod_val > 0) ? 0 : 1]);
            }
            setAEXE(player, i, Math.floor(Math.abs(ax) / 2) * mod_val);
        }
        player.nextAttrCheck += rn1(200, 800);
    }
}

// cf. attrib.c:679 — rnd_attr() [static]
function rnd_attr(player) {
    const role = roles[player.roleIndex];
    if (!role) return NUM_ATTRS;
    // Get attribute distribution - uses ROLE_ATTRDIST if available, else default
    const attrdist = role.attrdist || [17, 17, 17, 17, 16, 16];
    let x = rn2(100);

    for (let i = 0; i < NUM_ATTRS; ++i) {
        if ((x -= attrdist[i]) < 0)
            return i;
    }
    return NUM_ATTRS;
}

// cf. attrib.c:696 — init_attr_role_redist(np, addition) [static]
function init_attr_role_redist(player, np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        const i = rnd_attr(player);

        if (i >= NUM_ATTRS
            || (addition ? (ABASE(player, i) >= ATTRMAX(player, i))
                         : (ABASE(player, i) <= ATTRMIN(player, i)))) {
            tryct++;
            continue;
        }
        tryct = 0;
        setABASE(player, i, ABASE(player, i) + adj);
        setAMAX(player, i, AMAX(player, i) + adj);
        np -= adj;
    }
    return np;
}

// cf. attrib.c:720 — init_attr(np)
export function init_attr(player, np) {
    ensureAttrArrays(player);
    const role = roles[player.roleIndex];
    if (!role) return;

    const attrbase = [role.str, role.int, role.wis, role.dex, role.con, role.cha];
    for (let i = 0; i < NUM_ATTRS; i++) {
        setABASE(player, i, attrbase[i]);
        setAMAX(player, i, attrbase[i]);
        setATEMP(player, i, 0);
        setATIME(player, i, 0);
        np -= attrbase[i];
    }

    np = init_attr_role_redist(player, np, true);
    np = init_attr_role_redist(player, np, false);
}

// cf. attrib.c:737 — redist_attr()
export function redist_attr(player) {
  for (let i = 0; i < NUM_ATTRS; i++) {
    if (i === A_INT || i === A_WIS) {
      continue;
    }
    const tmp = AMAX(player, i);
    setAMAX(player, i, AMAX(player, i) + (rn2(5) - 2));
    if (AMAX(player, i) > ATTRMAX(player, i)) setAMAX(player, i, ATTRMAX(player, i));
    if (AMAX(player, i) < ATTRMIN(player, i)) setAMAX(player, i, ATTRMIN(player, i));
    setABASE(player, i, Math.floor(ABASE(player, i) * AMAX(player, i) / tmp));
    if (ABASE(player, i) < ATTRMIN(player, i)) setABASE(player, i, ATTRMIN(player, i));
  }
}

// cf. attrib.c:761 — vary_init_attr()
export async function vary_init_attr(player) {
  for (let i = 0; i < NUM_ATTRS; i++) {
    if (!rn2(20)) {
      let xd = rn2(7) - 2;
      await adjattrib(player, i, xd, true);
      if (ABASE(player, i) < AMAX(player, i)) setAMAX(player, i, ABASE(player, i));
    }
  }
}

// cf. attrib.c:777 — postadjabil(propid) [static]
function postadjabil(propid) {
    if (propid === WARNING || propid === SEE_INVIS)
        see_monsters();
}

// cf. attrib.c:786 — role_abil(r) [static]
export function role_abil(r) {
    const roleabils = {
        [PM_ARCHEOLOGIST]: arc_abil,
        [PM_BARBARIAN]: bar_abil,
        [PM_CAVE_DWELLER]: cav_abil,
        [PM_HEALER]: hea_abil,
        [PM_KNIGHT]: kni_abil,
        [PM_MONK]: mon_abil,
        [PM_CLERIC]: pri_abil,
        [PM_RANGER]: ran_abil,
        [PM_ROGUE]: rog_abil,
        [PM_SAMURAI]: sam_abil,
        [PM_TOURIST]: tou_abil,
        [PM_VALKYRIE]: val_abil,
        [PM_WIZARD]: wiz_abil,
    };
    return roleabils[r] || null;
}

// cf. attrib.c:815 — check_innate_abil(propid, frommask) [static]
function check_innate_abil(player, propid, frommask) {
    let abil = null;

    if (frommask === FROMEXPER) {
        abil = role_abil(player.roleMnum);
    } else if (frommask === FROMRACE) {
        switch (player.race) {
        case RACE_DWARF: abil = dwa_abil; break;
        case RACE_ELF:   abil = elf_abil; break;
        case RACE_GNOME: abil = gno_abil; break;
        case RACE_ORC:   abil = orc_abil; break;
        case RACE_HUMAN: abil = hum_abil; break;
        default: break;
        }
    }

    if (!abil) return null;
    const ulevel = player.ulevel || 1;
    for (const entry of abil) {
        if (entry.propid === propid && ulevel >= entry.ulevel)
            return entry;
    }
    return null;
}

// cf. attrib.c:861 — innately(player, propid) [static]
export function innately(player, propid) {
    let iptr;

    if ((iptr = check_innate_abil(player, propid, FROMEXPER)) !== null)
        return (iptr.ulevel === 1) ? FROM_ROLE_REASON : FROM_EXP;
    if ((iptr = check_innate_abil(player, propid, FROMRACE)) !== null)
        return FROM_RACE_REASON;
    if ((getIntrinsic(player, propid) & FROMOUTSIDE) !== 0)
        return FROM_INTR;
    if ((getIntrinsic(player, propid) & FROMFORM) !== 0)
        return FROM_FORM_REASON;
    return FROM_NONE;
}

// cf. attrib.c:877 — is_innate(propidx)
export function is_innate(player, propidx) {
    let innateness;

    if (propidx === DRAIN_RES && player.ulycn !== undefined && player.ulycn >= 0)
        return FROM_LYCN;
    if (propidx === FAST && player.veryFast)
        return FROM_NONE;
    if ((innateness = innately(player, propidx)) !== FROM_NONE)
        return innateness;
    if (propidx === JUMPING && player.roleMnum === PM_KNIGHT
        && !getExtrinsic(player, propidx))
        return FROM_ROLE_REASON;
    return FROM_NONE;
}

// cf. attrib.c:902 — from_what(propidx)
export function from_what(player, propidx) {
    // Simplified: only provides basic innate source info
    if (!player.wizard) return "";

    if (propidx >= 0) {
        const innateness = is_innate(player, propidx);

        if (innateness === FROM_ROLE_REASON || innateness === FROM_RACE_REASON)
            return " innately";
        else if (innateness === FROM_INTR)
            return " intrinsically";
        else if (innateness === FROM_EXP)
            return " because of your experience";
        else if (innateness === FROM_LYCN)
            return " due to your lycanthropy";
        else if (innateness === FROM_FORM_REASON)
            return " from your creature form";
    }
    return "";
}

// cf. attrib.c:1003 — adjabil(oldlevel, newlevel)
export async function adjabil(player, oldlevel, newlevel) {
    let abil = role_abil(player.roleMnum);
    let rabil = null;

    switch (player.race) {
    case RACE_ELF: rabil = elf_abil; break;
    case RACE_ORC: rabil = orc_abil; break;
    case RACE_HUMAN:
    case RACE_DWARF:
    case RACE_GNOME:
    default: rabil = null; break;
    }

    let mask = FROMEXPER;
    let abilIdx = 0;
    let rabilIdx = 0;
    let currentAbil = abil;
    let currentIdx = 0;
    let usingRabil = false;

    // Flatten the iteration to match C's while(abil || rabil) pattern
    while (true) {
        // If we've exhausted the current role ability list
        if (!currentAbil || currentIdx >= currentAbil.length) {
            if (!usingRabil && rabil && rabil.length > 0) {
                currentAbil = rabil;
                currentIdx = 0;
                usingRabil = true;
                mask = FROMRACE;
            } else {
                break;
            }
        }
        if (currentIdx >= currentAbil.length) break;

        const entry = currentAbil[currentIdx];
        const propid = entry.propid;
        const propEntry = ensureUProp(player, propid);
        const prevabil = propEntry.intrinsic;

        if (oldlevel < entry.ulevel && newlevel >= entry.ulevel) {
            // Gained this ability
            if (entry.ulevel === 1)
                propEntry.intrinsic |= (mask | FROMOUTSIDE);
            else
                propEntry.intrinsic |= mask;

            if (!(propEntry.intrinsic & INTRINSIC & ~mask)) {
                if (entry.gainstr)
                    await You_feel("%s!", entry.gainstr);
            }
        } else if (oldlevel >= entry.ulevel && newlevel < entry.ulevel) {
            // Lost this ability
            propEntry.intrinsic &= ~mask;
            if (!(propEntry.intrinsic & INTRINSIC)) {
                if (entry.losestr)
                    await You_feel("%s!", entry.losestr);
                else if (entry.gainstr)
                    await You_feel("less %s!", entry.gainstr);
            }
        }

        if (prevabil !== propEntry.intrinsic)
            postadjabil(propid);

        currentIdx++;
    }

    if (oldlevel > 0) {
        if (newlevel > oldlevel)
            add_weapon_skill(newlevel - oldlevel);
        else
            lose_weapon_skill(oldlevel - newlevel);
    }
}

// newhp: canonical version is in exper.js. Re-export for C parity (attrib.c:1077).
export { newhp } from './exper.js';

// cf. attrib.c:1144 — minuhpmax(altmin)
export function minuhpmax(player, altmin) {
    if (altmin < 1) altmin = 1;
    return Math.max(player.ulevel || 1, altmin);
}

// cf. attrib.c:1154 — setuhpmax(newmax, even_when_polyd)
export function setuhpmax(player, newmax, even_when_polyd) {
    if (!Upolyd(player) || even_when_polyd) {
        if (newmax !== (player.uhpmax || 0)) {
            player.uhpmax = newmax;
            if (player.uhpmax > (player.uhppeak || 0))
                player.uhppeak = player.uhpmax;
        }
        if (player.uhp > player.uhpmax)
            player.uhp = player.uhpmax;
    } else {
        // Upolyd
        if (newmax !== (player.mhmax || 0)) {
            player.mhmax = newmax;
        }
        if ((player.mh || 0) > player.mhmax)
            player.mh = player.mhmax;
    }
}

// cf. attrib.c:1179 — adjuhploss(loss, olduhp)
export function adjuhploss(player, loss, olduhp) {
    if (!Upolyd(player)) {
        if (player.uhp < olduhp)
            loss -= (olduhp - player.uhp);
    } else {
        if ((player.mh || 0) < olduhp)
            loss -= (olduhp - (player.mh || 0));
    }
    return Math.max(loss, 1);
}

// cf. attrib.c:1265 — extremeattr(attrindx)
export function extremeattr(player, attrindx) {
    let lolimit = 3, hilimit = 25;
    const curval = acurr(player, attrindx);

    if (attrindx === A_STR) {
        hilimit = STR19(25); // 125
        if (player.gloves && player.gloves.otyp === GAUNTLETS_OF_POWER)
            lolimit = hilimit;
    } else if (attrindx === A_CON) {
        const ART_OGRESMASHER = 16;
        if (u_wield_art(player, ART_OGRESMASHER))
            lolimit = hilimit;
    }
    if (attrindx === A_INT || attrindx === A_WIS) {
        if (player.helmet && player.helmet.otyp === DUNCE_CAP)
            hilimit = lolimit = 6;
    }

    return (curval === lolimit || curval === hilimit);
}

// cf. attrib.c:1295 — adjalign(n)
export function adjalign(player, n) {
    let newalign = (player.alignmentRecord || 0) + n;

    if (n < 0) {
        const newabuse = (player.alignmentAbuse || 0) - n;
        if (newalign < (player.alignmentRecord || 0))
            player.alignmentRecord = newalign;
        if (newabuse > (player.alignmentAbuse || 0)) {
            player.alignmentAbuse = newabuse;
            adj_erinys(newabuse);
        }
    } else if (newalign > (player.alignmentRecord || 0)) {
        player.alignmentRecord = newalign;
        if (player.alignmentRecord > currentAlignLim(player))
            player.alignmentRecord = currentAlignLim(player);
    }
}

// cf. attrib.c:1317 — uchangealign(newalign, reason)
export async function uchangealign(player, newalign, reason) {
    const oldalign = player.alignment;

    player.ublessed = 0;
    if (reason === A_CG_CONVERT) {
        // Conversion via altar
        livelog_printf(0, "permanently converted to %s",
                       newalign === -1 ? "chaotic" : newalign === 0 ? "neutral" : "lawful");
        player.alignmentBase = newalign;
        if (!player.helmet || player.helmet.otyp !== HELM_OF_OPPOSITE_ALIGNMENT)
            player.alignment = player.alignmentBase;
        await You("have a %ssense of a new direction.",
            (player.alignment !== oldalign) ? "sudden " : "");
    } else {
        player.alignment = newalign;
        if (reason === A_CG_HELM_ON) {
            adjalign(player, -7);
            const hallu = getIntrinsic(player, HALLUC);
            await Your("mind oscillates %s.", hallu ? "wildly" : "briefly");
            await make_confused(player, rn1(2, 3), false);
            // summon_furies check simplified
            livelog_printf(0, "used a helm to turn %s",
                           newalign === -1 ? "chaotic" : newalign === 0 ? "neutral" : "lawful");
        } else if (reason === A_CG_HELM_OFF) {
            const hallu = getIntrinsic(player, HALLUC);
            await Your("mind is %s.", hallu
                                    ? "much of a muchness"
                                    : "back in sync with your body");
        }
    }
    if (player.alignment !== oldalign) {
        player.alignmentRecord = 0;
        retouch_equipment(0, player);
    }
}

// Export utility functions for use by other modules

export { ensureAttrArrays };
export { STR18, STR19 };
export { AVAL };
export { FROM_NONE, FROM_ROLE_REASON, FROM_RACE_REASON, FROM_INTR, FROM_EXP, FROM_FORM_REASON, FROM_LYCN };
export { attrname, plusattr, minusattr };
