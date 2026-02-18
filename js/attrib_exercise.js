// attrib_exercise.js -- C-faithful exercise/exerchk RNG flow
// Mirrors relevant parts of attrib.c (exercise(), exerper(), exerchk()).

import { rn2, rn1 } from './rng.js';
import { A_STR, A_INT, A_CHA } from './config.js';

const EXERCISE_LIMIT = 50;
const DEFAULT_NEXT_CHECK = 600;
const ATTR_COUNT = 6;

function ensureExerciseState(player) {
    if (!player) return;
    if (!Array.isArray(player.aexercise) || player.aexercise.length < ATTR_COUNT) {
        player.aexercise = Array.from({ length: ATTR_COUNT }, () => 0);
    }
    if (!Number.isInteger(player.nextAttrCheck)) {
        player.nextAttrCheck = DEFAULT_NEXT_CHECK;
    }
}

// C ref: attrib.c exercise()
export function exercise(player, attr, increase) {
    // C ref: attrib.c:489-490 — A_INT and A_CHA can't be exercised; no RNG consumed.
    if (attr === A_INT || attr === A_CHA) return;
    if (!player) return;
    ensureExerciseState(player);
    const cur = player.aexercise[attr] || 0;
    // C ref: attrib.c:496 — if (abs(AEXE(i)) < AVAL) — skip when at exercise cap
    if (Math.abs(cur) >= EXERCISE_LIMIT) return;
    // C ref: attrib.c:506 — AEXE(i) += (inc) ? (rn2(19) > ACURR(i)) : -rn2(2);
    if (increase) {
        const acurr = (player.attributes && player.attributes[attr]) || 10;
        if (rn2(19) > acurr) {
            player.aexercise[attr] = cur + 1;
        }
    } else {
        player.aexercise[attr] = cur - rn2(2);
    }
}

// C ref: attrib.c exerchk()
export function exerchk(player, moves) {
    if (!player || !Number.isInteger(moves)) return;
    ensureExerciseState(player);
    if (moves < player.nextAttrCheck) return;

    for (let i = 0; i < ATTR_COUNT; i++) {
        const ex = player.aexercise[i] || 0;
        if (!ex) continue;

        // C ref: if (i == A_STR || !rn2(50)) ...
        if (i === A_STR || rn2(50) < Math.abs(ex)) {
            // Attribute mutation side effects are not modeled here yet.
        }

        // C ref: AEXE(i) += (AEXE(i) > 0) ? -1 : 1;
        player.aexercise[i] += ex > 0 ? -1 : 1;
    }

    // C ref: next_check += rn1(200, 800)
    player.nextAttrCheck += rn1(200, 800);
}

export function initExerciseState(player) {
    ensureExerciseState(player);
}
