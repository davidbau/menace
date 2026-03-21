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

// Enable logging, then initialize and generate
enableRngLog();
initRng(seed);
initLevelGeneration(roleIndex, wizard);
await makelevel(1);

const log = getRngLog();

if (outFile) {
    writeFileSync(outFile, log.join('\n') + '\n');
    console.log(`Wrote ${log.length} RNG calls to ${outFile}`);
} else {
    for (const line of log) {
        console.log(line);
    }
}
