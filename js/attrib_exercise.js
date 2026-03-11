// attrib_exercise.js -- C-faithful exercise/exerchk RNG flow
// Mirrors relevant parts of attrib.c (exercise(), exerper(), exerchk()).

import { rn2, rn1 } from './rng.js';
import { A_STR, A_INT, A_CHA, A_DEX, A_CON, A_WIS,
    MOD_ENCUMBER, HVY_ENCUMBER, EXT_ENCUMBER,
    CLAIRVOYANT, REGENERATION, INTRINSIC, TIMEOUT, Upolyd } from './const.js';
import { PM_MONK } from './monsters.js';
import { acurr, adjattrib, AVAL } from './attrib.js';
import { sgn } from './hacklib.js';
import { game as _gstate } from './gstate.js';
import { You } from './pline.js';
import { races } from './player.js';

// Lazy import to avoid circular dependency (hack.js imports from attrib_exercise.js)
var _near_capacity = null;
export function registerNearCapacity(fn) { _near_capacity = fn; }

const DEFAULT_NEXT_CHECK = 600;
const ATTR_COUNT = 6;

// C: exertext[A_MAX][2] — attrib.c:585-591
const exertext = [
    ["exercising diligently", "exercising properly"],           // Str
    [null, null],                                                // Int
    ["very observant", "paying attention"],                     // Wis
    ["working on your reflexes", "working on reflexes lately"], // Dex
    ["leading a healthy life-style", "watching your health"],   // Con
    [null, null],                                                // Cha
];

function ensureExerciseState(player) {
    if (!player) return;
    if (!Array.isArray(player.aexercise) || player.aexercise.length < ATTR_COUNT) {
        player.aexercise = Array.from({ length: ATTR_COUNT }, () => 0);
    }
    if (!Number.isInteger(player.nextAttrCheck)) {
        player.nextAttrCheck = DEFAULT_NEXT_CHECK;
    }
}

// Upolyd imported from const.js

// C: ABASE(i) — base attribute value
function ABASE(player, i) { return player.attributes[i]; }

// C: ATTRMIN(i) — racial minimum for attribute
function ATTRMIN(player, i) {
    const race = races[player.race];
    return race ? race.attrmin[i] : 3;
}

// C: ATTRMAX(i) — racial maximum for attribute
function ATTRMAX(player, i) {
    const race = races[player.race];
    return race ? race.attrmax[i] : 18;
}

// C ref: attrib.c:486 — exercise(i, inc_or_dec)
export function exercise(player, attr, increase) {
    // C ref: attrib.c:489-490 — A_INT and A_CHA can't be exercised; no RNG consumed.
    if (attr === A_INT || attr === A_CHA) return;
    if (!player) return;
    // C ref: attrib.c:493-494 — Upolyd skips exercise for all but WIS
    if (Upolyd(player) && attr !== A_WIS) return;
    ensureExerciseState(player);
    const cur = player.aexercise[attr] || 0;
    // C ref: attrib.c:496 — if (abs(AEXE(i)) < AVAL) — skip when at exercise cap
    if (Math.abs(cur) >= AVAL) return;
    // C ref: attrib.c:506 — AEXE(i) += (inc) ? (rn2(19) > ACURR(i)) : -rn2(2);
    if (increase) {
        if (rn2(19) > acurr(player, attr)) {
            player.aexercise[attr] = cur + 1;
        }
    } else {
        player.aexercise[attr] = cur - rn2(2);
    }
}

// C ref: attrib.c:595-674 — exerchk()
// Checks exercise accumulation and potentially adjusts attributes.
// Calls exerper() internally (C attrib.c:601).
export async function exerchk(player, moves) {
    if (!player || !Number.isInteger(moves)) return;
    ensureExerciseState(player);

    // C ref: attrib.c:601 — exerper() called at start of exerchk
    await exerper(player, moves);

    if (moves < player.nextAttrCheck) return;
    // C ref: attrib.c:610 — if (multi) return; (skip while multi-turn action)
    if (_gstate?.multi) return;

    for (let i = 0; i < ATTR_COUNT; i++) {
        let ax = player.aexercise[i] || 0;
        if (!ax) continue;

        const mod_val = sgn(ax);
        let lolim = ATTRMIN(player, i);
        let hilim = ATTRMAX(player, i);
        if (hilim > 18) hilim = 18;

        // C ref: attrib.c:625-630 — skip rn2 when ABASE at limit
        if ((ax < 0) ? (ABASE(player, i) <= lolim) : (ABASE(player, i) >= hilim)) {
            // nextattrib: decay exercise
            player.aexercise[i] = Math.floor(Math.abs(ax) / 2) * mod_val;
            continue;
        }
        // C ref: attrib.c:631-635 — skip rn2 when polymorphed (except WIS)
        if (Upolyd(player) && i !== A_WIS) {
            player.aexercise[i] = Math.floor(Math.abs(ax) / 2) * mod_val;
            continue;
        }

        // C ref: attrib.c:637-641 — RNG gate
        // rn2(AVAL) > ((i != A_WIS) ? abs(ax)*2/3 : abs(ax))
        if (rn2(AVAL) > ((i !== A_WIS) ? Math.floor(Math.abs(ax) * 2 / 3) : Math.abs(ax))) {
            player.aexercise[i] = Math.floor(Math.abs(ax) / 2) * mod_val;
            continue;
        }

        // C ref: attrib.c:643-653 — adjattrib on success
        if (await adjattrib(player, i, mod_val, -1)) {
            player.aexercise[i] = 0;
            ax = 0;
            await You("%s %s.",
                (mod_val > 0) ? "must have been" : "haven't been",
                exertext[i][(mod_val > 0) ? 0 : 1]);
        }
        // C ref: attrib.c:655 — decay remaining exercise
        player.aexercise[i] = Math.floor(Math.abs(ax) / 2) * mod_val;
    }
    // C ref: attrib.c:671 — next_check += rn1(200, 800)
    player.nextAttrCheck += rn1(200, 800);
}

// C ref: attrib.c:518 — exerper() — periodic exercise accumulation
export async function exerper(player, moves) {
    if (!player || !Number.isInteger(moves)) return;

    if (moves % 10 === 0) {
        // Hunger state switch
        if (player.hunger > 1000) {
            await exercise(player, A_DEX, false);
            // C ref: attrib.c exerper() — monks meditate poorly when satiated.
            if (player.roleMnum === PM_MONK) {
                await exercise(player, A_WIS, false);
            }
        } else if (player.hunger > 150) {
            await exercise(player, A_CON, true);
        } else if (player.hunger > 50) {
            // HUNGRY: no exercise
        } else if (player.hunger > 0) {
            await exercise(player, A_STR, false);
            // C ref: attrib.c exerper() — hungry monks gain wisdom discipline.
            if (player.roleMnum === PM_MONK) {
                await exercise(player, A_WIS, true);
            }
        } else {
            await exercise(player, A_CON, false);
        }

        // Encumbrance checks
        const wtcap = _near_capacity ? _near_capacity(player) : 0;
        if (wtcap === MOD_ENCUMBER) {
            await exercise(player, A_STR, true);
        } else if (wtcap === HVY_ENCUMBER) {
            await exercise(player, A_STR, true);
            await exercise(player, A_DEX, false);
        } else if (wtcap === EXT_ENCUMBER) {
            await exercise(player, A_DEX, false);
            await exercise(player, A_CON, false);
        }
    }

    if (moves % 5 === 0) {
        const clair = player.uprops?.[CLAIRVOYANT];
        const hClairvoyant = (clair?.intrinsic || 0);
        const bClairvoyant = (clair?.blocked || 0);
        if ((hClairvoyant & (INTRINSIC | TIMEOUT)) && !bClairvoyant) {
            await exercise(player, A_WIS, true);
        }

        // C ref: attrib.c:571 — HRegeneration (intrinsic only), not generic property activity.
        const hRegeneration = (player.uprops?.[REGENERATION]?.intrinsic || 0);
        if (hRegeneration) {
            await exercise(player, A_STR, true);
        }
        if (player.sick || player.vomiting) {
            await exercise(player, A_CON, false);
        }
        if (player.confused || player.hallucinating) {
            await exercise(player, A_WIS, false);
        }
        const woundedLegs = !!player.woundedLegs
            || (player.woundedLegsTimeout || 0) > 0;
        if (woundedLegs || player.fumbling || player.stunned) {
            await exercise(player, A_DEX, false);
        }
    }
}

export function initExerciseState(player) {
    ensureExerciseState(player);
}
