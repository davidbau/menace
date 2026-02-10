// test_depth4.js - Debug depth 4 RNG divergence (matching generateMapsWithRng)

import { initRng, enableRngLog, getRngLog, disableRngLog, rn2 } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

console.log('=== Generating depths 1-3 (with post-init) ===');
for (let depth = 1; depth <= 3; depth++) {
    const prevCount = getRngLog().length;
    const map = makelevel(depth);
    wallification(map);
    if (depth >= 2 && depth <= 4) {
        place_lregion(map, 0, 0, 0, 0, 0, 0, 0, 0, 4); // LR_BRANCH
    }

    // Post-level init (matching generateMapsWithRng)
    if (depth === 1) {
        const player = new Player();
        player.initRole(11); // Valkyrie
        if (map.upstair) {
            player.x = map.upstair.x;
            player.y = map.upstair.y;
        }
        simulatePostLevelInit(player, map, 1);
    } else {
        // Pet arrival (46 RNG calls)
        rn2(10); // untaming check
        for (let i = 8; i >= 2; i--) rn2(i);   // 7 calls
        for (let i = 16; i >= 2; i--) rn2(i);  // 15 calls
        for (let i = 24; i >= 2; i--) rn2(i);  // 23 calls
    }

    const fullLog = getRngLog();
    const depthLog = fullLog.slice(prevCount);
    console.log(`Depth ${depth}: ${depthLog.length} RNG calls`);
}

console.log('\n=== Generating depth 4 ===');
const prevCount4 = getRngLog().length;
console.log(`Starting at RNG call index: ${prevCount4}`);

const map4 = makelevel(4);
const fullLog = getRngLog();
const trace4 = fullLog.slice(prevCount4);

console.log(`Depth 4: ${trace4.length} RNG calls`);
console.log('\nFirst 15 RNG calls:');
trace4.slice(0, 15).forEach((call, i) => {
    console.log(`  [${i}]: ${call}`);
});

console.log('\n=== Expected from C ===');
const cCalls = [
    'rn2(3)=1 @ getbones(bones.c:643)',
    'rn2(5)=0 @ makelevel(mklev.c:1276)',
    'rn2(1)=0 @ rnd_rect(rect.c:106)',
    'rn2(1000)=326 @ nhl_rn2(nhlua.c:930)',
    'rn2(1001)=503 @ nhl_rn2(nhlua.c:930)',
];
cCalls.forEach((call, i) => {
    console.log(`  [${i}]: ${call}`);
});

disableRngLog();
