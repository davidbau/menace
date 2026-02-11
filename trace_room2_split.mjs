#!/usr/bin/env node
/**
 * Trace Room 2 placement and rectangle split
 */

import fs from 'fs';
import { initRng, enableRngLog, getRngLog, rn2 } from './js/rng.js';
import { resetLevelState } from './js/sp_lev.js';
import * as des from './js/sp_lev.js';
import { get_rect_count, get_rects } from './js/dungeon.js';

console.log('=== Tracing Room 2 (random room) ===\n');

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

// Room 1 - fixed position
console.log('Creating Room 1 (fixed position)...');
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

console.log(`After Room 1: ${get_rect_count()} rectangles`);
console.log('Rects:', get_rects().map(r => `(${r.lx},${r.ly})-(${r.hx},${r.hy})`));

// Room 2 - random position
console.log('\nCreating Room 2 (random, with stair)...');
des.room({
    contents: function() {
        des.stair("up");
        des.object();
    }
});

console.log(`After Room 2: ${get_rect_count()} rectangles`);
console.log('Rects:', get_rects().map(r => `(${r.lx},${r.ly})-(${r.hx},${r.hy})`));

const log = getRngLog();
console.log('\nRNG calls:');
log.forEach((line, i) => console.log(`${i+1}. ${line}`));

console.log('\nExpected: 3 rectangles after Room 2 (C has rn2(3) at call 9)');
console.log(`Actual: ${get_rect_count()} rectangles`);
