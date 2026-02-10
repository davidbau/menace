// test_count_rooms_subrooms.js - Distinguish main rooms from subrooms

import { initRng, enableRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, setGameSeed } from './js/dungeon.js';
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
const player = new Player();
player.initRole(11);
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Depth 2 Room Analysis ===');
const map2 = makelevel(2);

console.log(`map.nroom: ${map2.nroom} (main rooms)`);
console.log(`map.nsubroom: ${map2.nsubroom || 0} (subrooms)`);
console.log(`map.rooms.length: ${map2.rooms.length} (total array size)`);

console.log('\nMain rooms (indices 0 to nroom-1):');
for (let i = 0; i < map2.nroom; i++) {
    const room = map2.rooms[i];
    if (room) {
        console.log(`  Room ${i}: rtype=${room.rtype}, nsubrooms=${room.nsubrooms || 0}`);
    }
}

if (map2.nsubroom > 0) {
    console.log(`\nSubrooms (indices nroom to nroom+nsubroom-1):`);
    for (let i = map2.nroom; i < map2.nroom + map2.nsubroom; i++) {
        const room = map2.rooms[i];
        if (room) {
            console.log(`  Room ${i}: rtype=${room.rtype}, nsubrooms=${room.nsubrooms || 0}`);
        }
    }
}

console.log(`\n=== generate_stairs_find_room logic ===`);
console.log(`Loop will check: for (i = 0; i < ${map2.nroom}; i++)`);
console.log(`So it checks ${map2.nroom} rooms, NOT ${map2.rooms.length}`);
console.log(`This should call rn2(${map2.nroom}) if all qualify at phase 2`);

// But the test showed rn2(9), so map2.nroom must be 9!
console.log(`\n⚠️  Expected C to have nroom=7, JS has nroom=${map2.nroom}`);
