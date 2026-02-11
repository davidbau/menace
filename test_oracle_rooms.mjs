#!/usr/bin/env node
/**
 * Test how many RNG calls Oracle rooms generate
 */

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { makelevel } from './js/dungeon.js';
import { DUNGEONS_OF_DOOM } from './js/special_levels.js';

initRng(42);
enableRngLog(true);

// Skip init calls to match test
for (let i = 1000; i <= 1004; i++) {
    // These are MT init calls
}

const startCount = getRngLog().length;
const map = makelevel(5, DUNGEONS_OF_DOOM, 5);
const endCount = getRngLog().length;

console.log(`Oracle RNG calls: ${endCount - startCount}`);
console.log(`Map rooms: ${map.rooms ? map.rooms.length : 0}`);
console.log(`Map nroom: ${map.nroom}`);

// Count by caller
const log = getRngLog().slice(startCount);
const callers = {};
for (const entry of log) {
    const m = entry.match(/@\s*(\w+)\(/);
    const caller = m ? m[1] : 'unknown';
    callers[caller] = (callers[caller] || 0) + 1;
}

console.log('\nTop callers:');
const sorted = Object.entries(callers).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 10).forEach(([caller, count]) => {
    console.log(`  ${caller}: ${count}`);
});
