#!/usr/bin/env node
// test_alignment_with_fix.mjs -- Test RNG alignment after coordinate fix

import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from './js/rng.js';
import fs from 'fs';

enableRngLog(true);

await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
});

const jsLog = getRngLog();
disableRngLog();

// Read C log
const cLogText = fs.readFileSync('/tmp/nethack_rng_99999.log', 'utf-8');
const cLines = cLogText.trim().split('\n').filter(line => /^\d/.test(line));

console.log(`C RNG calls: ${cLines.length}`);
console.log(`JS RNG calls: ${jsLog.length}`);
console.log(`Difference: ${Math.abs(cLines.length - jsLog.length)}`);

// Find first divergence
let firstDiverge = -1;
for (let i = 0; i < Math.min(cLines.length, jsLog.length); i++) {
    const cMatch = cLines[i].match(/^(\d+) (rn2|rnd)\((\d+)\) = (\d+)/);
    if (!cMatch) continue;

    const cPos = parseInt(cMatch[1]);
    const cFunc = cMatch[2];
    const cArg = parseInt(cMatch[3]);
    const cVal = parseInt(cMatch[4]);

    const jsEntry = jsLog[i];
    const jsMatch = jsEntry.match(/(rn2|rnd)\((\d+)\)=(\d+)/);
    if (!jsMatch) continue;

    const jsFunc = jsMatch[1];
    const jsArg = parseInt(jsMatch[2]);
    const jsVal = parseInt(jsMatch[3]);

    if (cFunc !== jsFunc || cArg !== jsArg || cVal !== jsVal) {
        firstDiverge = i;
        console.log(`\nFirst divergence at position ${i}:`);
        console.log(`  C[${cPos}]: ${cFunc}(${cArg})=${cVal} @ ${cLines[i].split('@')[1]}`);
        console.log(`  JS[${i}]: ${jsFunc}(${jsArg})=${jsVal} @ ${jsEntry.split('@')[1]}`);
        break;
    }
}

if (firstDiverge === -1) {
    console.log('\n✅ PERFECT ALIGNMENT!');
} else {
    const matchPercent = ((firstDiverge / Math.max(cLines.length, jsLog.length)) * 100).toFixed(1);
    console.log(`\nAlignment: ${firstDiverge}/${Math.max(cLines.length, jsLog.length)} calls (${matchPercent}%)`);
}
