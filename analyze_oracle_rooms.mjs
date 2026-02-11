#!/usr/bin/env node
/**
 * Analyze which des.room() calls correspond to which build_room calls in C trace
 */

import fs from 'fs';

const cTrace = JSON.parse(fs.readFileSync(
    'test/comparison/sessions/seed42_inventory_wizard.session.json', 'utf8'));

// Find all build_room calls after makelevel starts (entry 306)
const buildRooms = [];
cTrace.startup.rng.slice(271).forEach((entry, idx) => {
    if (entry.includes('build_room')) {
        buildRooms.push({
            index: idx,
            absoluteIndex: idx + 271,
            entry
        });
    }
});

console.log(`Total build_room calls: ${buildRooms.length}\n`);

buildRooms.forEach((room, i) => {
    console.log(`Room ${i + 1}: Entry ${room.index} (absolute ${room.absoluteIndex})`);
    console.log(`  ${room.entry}`);
});

console.log(`\nOracle.lua defines 7 des.room() calls:`);
console.log(`  1. Fixed position (x=3,y=3) - outer room`);
console.log(`  2. Nested delphi room`);
console.log(`  3-7. Five random rooms (no coordinates)`);
console.log(`\nC generates ${buildRooms.length} build_room calls.`);
console.log(`Extra rooms: ${buildRooms.length - 7}`);
