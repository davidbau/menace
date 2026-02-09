// test_trace_79.js - Find the source of rn2(79) calls

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Monkey-patch rn2 to trace calls with specific values
import * as rngModule from './js/rng.js';
const originalRn2 = rngModule.rn2;
let callCount = 0;

rngModule.rn2 = function(x) {
    const result = originalRn2.call(this, x);
    callCount++;

    // Log calls with interesting values (79, 21, or around the divergence point)
    if (x === 79 || x === 21 || (callCount >= 2450 && callCount <= 2465)) {
        console.log(`\n[${callCount}] rn2(${x})=${result}`);

        // Print stack trace for the suspicious calls
        if (x === 79 || x === 21) {
            const stack = new Error().stack.split('\n').slice(2, 8);
            console.log('Stack trace:');
            stack.forEach(line => console.log('  ' + line.trim()));
        }
    }

    return result;
};

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

console.log('=== Generating depth 1 ===');
const map1 = makelevel(1);
wallification(map1);
place_lregion(map1, 0, 0, 0, 0, 0, 0, 0, 0, 4);

console.log('\n=== Starting simulatePostLevelInit ===');
const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}

simulatePostLevelInit(player, map1, 1);

console.log('\n=== Complete ===');
console.log(`Total RNG calls: ${callCount}`);
