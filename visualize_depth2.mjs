#!/usr/bin/env node
// visualize_depth2.mjs -- Visualize depth 2 map

import { initRng } from './js/rng.js';
import { makelevel, wallification, initLevelGeneration } from './js/dungeon.js';

// Disable debug spam
process.env.DEBUG_CORRIDORS = '0';
process.env.DEBUG_ROOM_FILL = '0';

// Initialize and generate both levels
initRng(163);
initLevelGeneration(11);
const map1 = makelevel(1);
wallification(map1);
const map = makelevel(2);
wallification(map);

// Visualize the map
console.log('=== Depth 2 Map Visualization ===');
const typeChars = {
    0: ' ',   // STONE
    1: '.',   // ROOM
    2: '#',   // CORR
    3: '-',   // HWALL
    4: '|',   // VWALL
    7: '+',   // SDOOR
    8: '+',   // DOOR
    11: '%',  // SCORR
};

for (let y = 0; y < 21; y++) {
    let line = '';
    for (let x = 0; x < 80; x++) {
        const loc = map.locations[x][y];
        line += typeChars[loc.typ] || '?';
    }
    console.log(line);
}

// Count room tiles inside each room struct
console.log('\n=== Room Analysis ===');
const typeCounts = {};
map.rooms.forEach((r, i) => {
    let roomCount = 0, corrCount = 0, otherCount = 0;
    const typesFound = new Set();
    for (let x = r.lx; x <= r.hx; x++) {
        for (let y = r.ly; y <= r.hy; y++) {
            const typ = map.locations[x][y].typ;
            typesFound.add(typ);
            typeCounts[typ] = (typeCounts[typ] || 0) + 1;
            if (typ === 1) roomCount++;
            else if (typ === 2) corrCount++;
            else otherCount++;
        }
    }
    const total = (r.hx - r.lx + 1) * (r.hy - r.ly + 1);
    console.log(`Room ${i}: ${total} cells, ${roomCount} ROOM, ${corrCount} CORR, ${otherCount} other (types: ${Array.from(typesFound).sort().join(',')})`);
});

console.log('\n=== All Type Counts ===');
Object.keys(typeCounts).sort((a,b) => a-b).forEach(typ => {
    console.log(`  Type ${typ}: ${typeCounts[typ]} cells`);
});

console.log('\nDone!');
