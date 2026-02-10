// test_trace_room_creation.js - Trace which theme rooms are created

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Patch create_room and create_subroom to trace calls
import * as dungeonModule from './js/dungeon.js';
let roomCreations = [];
let subroomCreations = [];

const originalCreate = dungeonModule.default?.create_room;
// Since we can't easily monkey-patch exports, let's just check the RNG log

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

// Generate depth 1
const map1 = makelevel(1);
const player = new Player();
player.initRole(11);
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Checking RNG log for theme room selection ===');
const beforeDepth2 = getRngLog().length;
const map2 = makelevel(2);
const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);

// Look for rn2(100) calls which indicate build_room chance checks
// Theme rooms call rn2(100) before each create_room/create_subroom
console.log('\nLooking for rn2(100) patterns (build_room chance checks):\n');

let rn2_100_count = 0;
for (let i = 0; i < Math.min(200, depth2Log.length); i++) {
    const entry = depth2Log[i];
    if (entry.includes('rn2(100)')) {
        rn2_100_count++;
        console.log(`[${i}] ${entry} <- build_room check #${rn2_100_count}`);
    }
}

console.log(`\nTotal rn2(100) calls: ${rn2_100_count}`);
console.log(`Total main rooms created: ${map2.nroom}`);
console.log(`Total subrooms created: ${map2.nsubroom || 0}`);

// The issue might be that theme rooms are calling create_room multiple times
// instead of create_room + create_subroom

console.log('\n=== Analysis ===');
if (map2.nsubroom === 0 && rn2_100_count > map2.nroom) {
    console.log(`⚠️  ${rn2_100_count} build checks but only ${map2.nroom} rooms!`);
    console.log('Some create_room/create_subroom calls must have failed.');
} else if (map2.nsubroom === 0) {
    console.log(`⚠️  No subrooms created! Theme rooms might not be creating subrooms.`);
    console.log('Or create_subroom is failing and returning null.');
}
