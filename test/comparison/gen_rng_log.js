// test/comparison/gen_rng_log.js -- Generate JS PRNG call log for comparison
//
// Generates a level with RNG logging enabled, producing a log in the same
// format as the C PRNG logger (003-prng-logging patch).
//
// Usage:
//   node test/comparison/gen_rng_log.js <seed> [output_file] [--role=N] [--wizard]
//
// Output format (one per line):
//   CALL# FUNC(ARGS) = RESULT
//
// Compare against C log (strip file:line with sed):
//   diff <(sed 's/ @ .*//' c_rnglog.txt) js_rnglog.txt

import { initRng, enableRngLog, getRngLog } from '../../js/rng.js';
import { initLevelGeneration, makelevel } from '../../js/dungeon.js';
import { setGame } from '../../js/gstate.js';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const seed = parseInt(args.find(a => !a.startsWith('-')) || '42', 10);
const outFile = args.filter(a => !a.startsWith('-'))[1] || null;
const roleArg = args.find(a => a.startsWith('--role='));
const roleIndex = roleArg ? parseInt(roleArg.split('=')[1], 10) : undefined;
const wizard = args.includes('--wizard');

// Set up minimal game state so _gstate is available for mklev context tracking.
// Without this, _inMklev is never set and mkobj_erosions is incorrectly suppressed.
setGame({ moves: 1, flags: {} });

const depthArg = args.find(a => a.startsWith('--depth='));
const depth = depthArg ? parseInt(depthArg.split('=')[1], 10) : 1;
const tutorialMode = args.includes('--tutorial');

// Set up minimal game state so _gstate is available for mklev context tracking.
// Without this, _inMklev is never set and mkobj_erosions is incorrectly suppressed.
setGame({ moves: 1, flags: {} });

// Enable logging, then initialize and generate
enableRngLog();
initRng(seed);
const dungeonResult = initLevelGeneration(roleIndex, wizard);
if (tutorialMode) {
    // Generate level 1 first (consumes startup RNG)
    await makelevel(1);
    // Consume u_init RNG to match C's sequence before tutorial
    // C does: makelevel → u_init(role+race+attrs) → tutorial
    // u_init consumes ~155 RNG calls (varies by role)
    const { simulatePostLevelInit } = await import('../../js/u_init.js');
    const { Player } = await import('../../js/player.js');
    const map = { at: () => ({typ: 0}), addMonster: () => {}, monsters: [],
                  monsterAt: () => null, uz: {dnum: 0, dlevel: 1} };
    const player = new Player();
    player.initRole(roleIndex ?? 11);
    player.x = 10; player.y = 10;
    simulatePostLevelInit(player, map, 1);
    // Now generate tutorial
    await makelevel(1, 8, 1);
} else {
    await makelevel(depth);
}

const log = getRngLog();

if (outFile) {
    writeFileSync(outFile, log.join('\n') + '\n');
    console.log(`Wrote ${log.length} RNG calls to ${outFile}`);
} else {
    for (const line of log) {
        console.log(line);
    }
}
