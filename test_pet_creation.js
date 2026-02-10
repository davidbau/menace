// test_pet_creation.js - Trace RNG calls during pet creation

import { initRng, enableRngLog, getRngLog, rn2 } from './js/rng.js';
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

// Generate depth 1
const map1 = makelevel(1);
wallification(map1);
place_lregion(map1, 0, 0, 0, 0, 0, 0, 0, 0, 4);

const beforePost = getRngLog().length;
console.log(`Before simulatePostLevelInit: ${beforePost} RNG calls`);

const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}

console.log(`Player position: (${player.x}, ${player.y})`);
console.log(`Player role: ${player.roleIndex} (11 = Valkyrie)`);
console.log(`Player alignment: ${player.alignment}`);

simulatePostLevelInit(player, map1, 1);

const afterPost = getRngLog().length;
console.log(`\nAfter simulatePostLevelInit: ${afterPost} RNG calls`);
console.log(`RNG calls during post-init: ${afterPost - beforePost}`);

const fullLog = getRngLog();
const postInitLog = fullLog.slice(beforePost);

console.log(`\nFirst 30 RNG calls during post-init:`);
postInitLog.slice(0, 30).forEach((call, i) => {
    console.log(`  [${i}]: ${call}`);
});
