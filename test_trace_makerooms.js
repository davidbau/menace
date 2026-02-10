// test_trace_makerooms.js - Trace room creation to find where extra rooms come from

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Monkey-patch to trace room creation
import * as dungeonModule from './js/dungeon.js';

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

// Generate depth 1
const map1 = dungeonModule.makelevel(1);
dungeonModule.wallification(map1);
const player = new Player();
player.initRole(11);
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Generating depth 2 with tracing ===');

// I'll need to manually step through makerooms logic
// Let me just generate depth 2 normally and check the RNG log around room creation

const beforeDepth2 = getRngLog().length;
const map2 = dungeonModule.makelevel(2);

console.log(`\nDepth 2: ${map2.nroom} rooms created`);
console.log(`RNG calls during depth 2 generation: ${getRngLog().length - beforeDepth2}`);

// Look at the RNG log to find patterns
const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);

console.log('\n=== Searching for room creation patterns ===');
console.log('Looking for rnd_rect() calls (these gate room creation)...\n');

// rnd_rect calls rn2(1) for each available rect
// A return value of 0 means we found a rect, 1 means no more rects
let rndRectCount = 0;
let successfulRects = 0;

for (let i = 0; i < depth2Log.length && i < 100; i++) {
    const entry = depth2Log[i];
    // Look for the pattern that indicates rnd_rect checking
    if (entry.includes('rn2(1)')) {
        const result = entry.match(/rn2\(1\)=(\d+)/);
        if (result) {
            const value = parseInt(result[1]);
            rndRectCount++;
            if (value === 0) {
                successfulRects++;
                console.log(`[${i}] ${entry} <- Found a rect! (rect #${successfulRects})`);
            } else {
                console.log(`[${i}] ${entry} <- No rect available (stopping)`);
            }
        }
    }
}

console.log(`\nTotal rnd_rect checks: ${rndRectCount}`);
console.log(`Successful rects found: ${successfulRects}`);
console.log(`Final room count: ${map2.nroom}`);

if (successfulRects !== map2.nroom) {
    console.log(`\n⚠️  Mismatch: ${successfulRects} rects found but ${map2.nroom} rooms created!`);
}
