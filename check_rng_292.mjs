#!/usr/bin/env node
import {initRng, enableRngLog, getRngLog, rn2} from './js/rng.js';
import {initLevelGeneration, makelevel} from './js/dungeon.js';

initRng(3);
enableRngLog();

// Simulate chargen pick_gend
rn2(1);

// Initialize level generation
initLevelGeneration(11);

// Generate map
const map = makelevel(1);

const log = getRngLog();
console.log('JS RNG calls 288-295:');
log.slice(288, 295).forEach((r, i) => {
    console.log(`  [${288+i}] ${r.trim()}`);
});

console.log('\\nTotal JS RNG calls:', log.length);
