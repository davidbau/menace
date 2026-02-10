// test_trace_theme_rooms.js - Trace which theme rooms are created and how

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Patch add_room_to_map and add_subroom_to_map to trace calls
import * as dungeonModule from './js/dungeon.js';

let roomCreations = [];
let subroomCreations = [];

// Since we can't monkey-patch, let's trace via RNG log and room inspection

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

// Generate depth 1
const map1 = makelevel(1);
wallification(map1);
const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Generating depth 2 and tracing room creation ===');

const beforeDepth2 = getRngLog().length;
const map2 = makelevel(2);

console.log(`\nDepth 2 has ${map2.nroom} main rooms`);
console.log(`Depth 2 has ${map2.nsubroom || 0} subrooms`);

// Analyze each room
console.log('\n=== Room Analysis ===');
for (let i = 0; i < map2.nroom; i++) {
    const room = map2.rooms[i];
    console.log(`\nRoom ${i}:`);
    console.log(`  rtype: ${room.rtype} (${getRoomTypeName(room.rtype)})`);
    console.log(`  area: (${room.lx},${room.ly}) to (${room.hx},${room.hy})`);
    console.log(`  nsubrooms: ${room.nsubrooms || 0}`);

    // Check if this room has subrooms
    if (room.nsubrooms > 0) {
        console.log(`  subrooms:`);
        for (let j = 0; j < room.nsubrooms; j++) {
            const subroom = room.sbrooms[j];
            if (subroom) {
                console.log(`    Subroom ${j}: rtype=${subroom.rtype}, area=(${subroom.lx},${subroom.ly}) to (${subroom.hx},${subroom.hy})`);
            }
        }
    }
}

// Check if there are any rooms in the subroom section
if (map2.nsubroom > 0) {
    console.log(`\n=== Subroom Section (indices ${map2.nroom} to ${map2.nroom + map2.nsubroom - 1}) ===`);
    for (let i = map2.nroom; i < map2.nroom + map2.nsubroom; i++) {
        const room = map2.rooms[i];
        if (room) {
            console.log(`\nRoom ${i} (subroom):`);
            console.log(`  rtype: ${room.rtype} (${getRoomTypeName(room.rtype)})`);
            console.log(`  area: (${room.lx},${room.ly}) to (${room.hx},${room.hy})`);
        }
    }
}

// Count OROOM vs THEMEROOM
let oroomCount = 0;
let themeroomCount = 0;
const OROOM = 0;
const THEMEROOM = 21;

for (let i = 0; i < map2.nroom; i++) {
    if (map2.rooms[i].rtype === OROOM) oroomCount++;
    if (map2.rooms[i].rtype === THEMEROOM) themeroomCount++;
}

console.log(`\n=== Room Type Summary ===`);
console.log(`OROOM count: ${oroomCount}`);
console.log(`THEMEROOM count: ${themeroomCount}`);
console.log(`Other types: ${map2.nroom - oroomCount - themeroomCount}`);

function getRoomTypeName(rtype) {
    const names = {
        0: 'OROOM',
        1: 'COURT',
        2: 'SWAMP',
        3: 'VAULT',
        4: 'BEEHIVE',
        5: 'MORGUE',
        6: 'BARRACKS',
        7: 'ZOO',
        8: 'DELPHI',
        9: 'TEMPLE',
        10: 'LEPREHALL',
        11: 'COCKNEST',
        12: 'ANTHOLE',
        13: 'SHOPBASE',
        14: 'ARMORSHOP',
        15: 'SCROLLSHOP',
        16: 'POTIONSHOP',
        17: 'WEAPONSHOP',
        18: 'FOODSHOP',
        19: 'RINGSHOP',
        20: 'WANDSHOP',
        21: 'THEMEROOM',
    };
    return names[rtype] || `UNKNOWN(${rtype})`;
}
