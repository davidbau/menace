// test/comparison/gen_rng_log.js -- Generate JS PRNG call log for comparison
//
// Generates a level with RNG logging enabled, producing a log in the same
// format as the C PRNG logger (003-prng-logging patch).
//
// Usage:
//   node test/comparison/gen_rng_log.js <seed> [output_file]
//
// Output format (one per line):
//   CALL# FUNC(ARGS) = RESULT
//
// Compare against C log (strip file:line with sed):
//   diff <(sed 's/ @ .*//' c_rnglog.txt) js_rnglog.txt

import { initRng, enableRngLog, getRngLog } from '../../js/rng.js';
import { initLevelGeneration, makelevel } from '../../js/dungeon.js';
import { writeFileSync } from 'node:fs';

const seed = parseInt(process.argv[2] || '42', 10);
const outFile = process.argv[3] || null;

// Enable logging, then initialize and generate
enableRngLog();
initRng(seed);
initLevelGeneration();
makelevel(1);

const log = getRngLog();

if (outFile) {
    writeFileSync(outFile, log.join('\n') + '\n');
    console.log(`Wrote ${log.length} RNG calls to ${outFile}`);
} else {
    for (const line of log) {
        console.log(line);
    }
}
