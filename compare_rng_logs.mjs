#!/usr/bin/env node
/**
 * Compare JS vs C RNG logs to find divergence
 */

import fs from 'fs';
import { initRng, enableRngLog, getRngLog, rn2 } from './js/rng.js';
import { generate as generateOracle } from './js/levels/oracle.js';

// Load C trace
const cTrace = JSON.parse(fs.readFileSync('./test/comparison/traces/oracle_seed42_c.json', 'utf8'));

// Generate JS oracle
initRng(42);

// Skip init calls to align with C (C skips first 291)
for (let i = 0; i < 291; i++) {
    const call = cTrace.rngLog[i];
    const arg = parseInt(call.args.split(',')[0]);
    rn2(arg);
}

enableRngLog(true);
const level = generateOracle();
const jsLog = getRngLog();

console.log('Comparing RNG sequences:\n');
console.log('C calls 292-320 vs JS calls 1-29:\n');

for (let i = 0; i < 29 && i < jsLog.length; i++) {
    const cCall = cTrace.rngLog[291 + i];
    const jsCall = jsLog[i];

    // Parse JS log line
    const jsMatch = jsCall.match(/^(\d+)\s+(\w+)\(([^)]*)\)=(\d+)(?:\s+@\s+(.+))?$/);
    if (!jsMatch) {
        console.log(`${i+1}. [PARSE ERROR] ${jsCall}`);
        continue;
    }

    const match = (
        jsMatch[2] === cCall.func &&
        jsMatch[3] === cCall.args &&
        jsMatch[4] === String(cCall.result)
    );

    const marker = match ? '✓' : '✗';

    console.log(`${i+1}. ${marker} C: ${cCall.func}(${cCall.args})=${cCall.result}`);
    console.log(`      ${marker} JS: ${jsMatch[2]}(${jsMatch[3]})=${jsMatch[4]}`);

    if (!match) {
        console.log(`      ^ FIRST MISMATCH at oracle call ${i+1}`);
        console.log(`      C caller: ${cCall.caller}`);
        console.log(`      JS caller: ${jsMatch[5] || '(unknown)'}`);
        break;
    }
}
