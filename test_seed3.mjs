#!/usr/bin/env node
/**
 * Quick test of seed3_selfplay_100turns session
 */

import { readFileSync } from 'fs';
import { replaySession, compareRng } from './test/comparison/session_helpers.js';

const sessionFile = './test/comparison/sessions/seed3_selfplay_100turns.session.json';
console.log(`Loading ${sessionFile}...`);

const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
console.log(`  Seed: ${session.seed}`);
console.log(`  Type: ${session.type}`);
console.log(`  Startup RNG calls: ${session.startup.rngCalls}`);
console.log(`  Steps: ${session.steps.length}`);
console.log('');

console.log('Replaying session...');
const replay = await replaySession(session.seed, session);

console.log('');
console.log('=== RESULTS ===');
console.log(`Startup: JS ${replay.startup.rngCalls} vs C ${session.startup.rngCalls}`);

if (replay.startup.rngCalls !== session.startup.rngCalls) {
    console.log('  ❌ RNG count mismatch at startup');
    const divergence = compareRng(replay.startup.rng, session.startup.rng);
    if (divergence.index >= 0) {
        console.log(`  First divergence at call ${divergence.index}:`);
        console.log(`    JS: ${divergence.js}`);
        console.log(`    C:  ${divergence.session}`);
    }
} else {
    console.log('  ✅ RNG count matches at startup');
}

console.log('');
console.log(`Steps tested: ${Math.min(replay.steps.length, session.steps.length)}`);

let firstMismatch = -1;
for (let i = 0; i < Math.min(replay.steps.length, 10); i++) {
    const jsStep = replay.steps[i];
    const cStep = session.steps[i];

    const divergence = compareRng(jsStep.rng, cStep.rng);
    if (divergence.index >= 0 && firstMismatch < 0) {
        firstMismatch = i;
        console.log(`Step ${i} (${cStep.action}): ❌ First step mismatch`);
        console.log(`  JS RNG calls: ${jsStep.rngCalls}`);
        console.log(`  C RNG calls: ${cStep.rng.length}`);
        console.log(`  First divergence at RNG call ${divergence.index}:`);
        console.log(`    JS: ${divergence.js}`);
        console.log(`    C:  ${divergence.session}`);
        break;
    } else if (i < 5) {
        console.log(`Step ${i} (${cStep.action}): ✅ RNG matches`);
    }
}

if (firstMismatch < 0) {
    console.log('');
    console.log('🎉 All tested steps match!');
}
