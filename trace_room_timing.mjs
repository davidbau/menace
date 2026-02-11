#!/usr/bin/env node
// Trace themed room contents execution timing in procedural dungeons

import {initRng, enableRngLog, getRngLog, rn2} from './js/rng.js';
import {initLevelGeneration, makelevel} from './js/dungeon.js';

// Track room creation timing
let roomCalls = [];
let inRoom = 0;

// Patch rn2 to log when called
const origRn2 = rn2;
let callNum = 0;

initRng(3);
enableRngLog();
rn2(1); // chargen

initLevelGeneration(11);

// Patch before level generation
const origMakelevel = makelevel;

// Generate procedural dungeon at depth 1
const map = makelevel(1);

const log = getRngLog();
console.log('\n=== RNG calls 335-355 ===');
for (let i = 335; i <= 355 && i < log.length; i++) {
    console.log(`  [${i}] ${log[i]}`);
}

console.log(`\nTotal RNG calls: ${log.length}`);
