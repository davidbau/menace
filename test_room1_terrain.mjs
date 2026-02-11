#!/usr/bin/env node
/**
 * Check if Room 1 is actually placed on terrain before Room 2 check_room
 */

import fs from 'fs';
import { initRng, enableRngLog, getRngLog, rn2 } from './js/rng.js';
import { resetLevelState, getLevelState } from './js/sp_lev.js';
import * as des from './js/sp_lev.js';

initRng(42);

// Skip 291 init calls
const cData = JSON.parse(fs.readFileSync('./test/comparison/traces/oracle_seed42_c.json', 'utf8'));
for (let i = 0; i < 291; i++) {
    const call = cData.rngLog[i];
    rn2(parseInt(call.args.split(',')[0]));
}

enableRngLog(true);
resetLevelState();
des.level_flags("noflip");

console.log('Creating Room 1...');
des.room({
    type: "ordinary",
    lit: 1,
    x: 3,
    y: 3,
    xalign: "center",
    yalign: "center",
    w: 11,
    h: 9
});

console.log('\nChecking terrain after Room 1:');
const state = getLevelState();
const map = state.map;

// Check several points
const points = [
    [35, 6], // Room 1 interior start
    [37, 6], // Where Room 2 would start
    [34, 5], // Room 1 wall
    [0, 0],  // Corner of map
];

points.forEach(([x, y]) => {
    const loc = map.at(x, y);
    const typ = loc ? loc.typ : undefined;
    const typeName = typ === 0 ? 'STONE' : typ === 1 ? 'VWALL' : typ === 2 ? 'HWALL' : typ === 3 ? 'TLCORNER' :
                     typ === 5 ? 'ROOM' : typ;
    console.log(`  (${x},${y}): typ=${typ} (${typeName})`);
});

console.log('\nRoom 1 should occupy: (34,5)-(46,15) with walls');
console.log('Room 2 first attempt would be at: (37,6)-(48,7)');
