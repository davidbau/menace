#!/usr/bin/env node
/**
 * Trace Room 2's split_rects geometry in detail
 */

import fs from 'fs';
import { initRng, enableRngLog, getRngLog, rn2 } from './js/rng.js';
import { resetLevelState } from './js/sp_lev.js';
import * as des from './js/sp_lev.js';
import { get_rect_count, get_rects } from './js/dungeon.js';

// Monkey-patch split_rects to log details
import * as dungeon from './js/dungeon.js';

const original_split_rects = dungeon.split_rects;
let split_call_count = 0;

dungeon.split_rects = function(r1, r2) {
    split_call_count++;

    const XLIM = 4;
    const YLIM = 3;
    const COLNO = 80;
    const ROWNO = 21;

    const old_r = { lx: r1.lx, ly: r1.ly, hx: r1.hx, hy: r1.hy };

    console.log(`\n[SPLIT #${split_call_count}]`);
    console.log(`  old_r = (${old_r.lx},${old_r.ly})-(${old_r.hx},${old_r.hy})`);
    console.log(`  r2    = (${r2.lx},${r2.ly})-(${r2.hx},${r2.hy})`);

    // Calculate each direction
    const top_space = r2.ly - old_r.ly - 1;
    const top_thresh = (old_r.hy < ROWNO - 1 ? 2 * YLIM : YLIM + 1) + 4;
    const top_add = top_space > top_thresh;

    const left_space = r2.lx - old_r.lx - 1;
    const left_thresh = (old_r.hx < COLNO - 1 ? 2 * XLIM : XLIM + 1) + 4;
    const left_add = left_space > left_thresh;

    const bottom_space = old_r.hy - r2.hy - 1;
    const bottom_thresh = (old_r.ly > 0 ? 2 * YLIM : YLIM + 1) + 4;
    const bottom_add = bottom_space > bottom_thresh;

    const right_space = old_r.hx - r2.hx - 1;
    const right_thresh = (old_r.lx > 0 ? 2 * XLIM : XLIM + 1) + 4;
    const right_add = right_space > right_thresh;

    console.log(`  Top:    space=${top_space} > thresh=${top_thresh}? ${top_add}`);
    console.log(`  Left:   space=${left_space} > thresh=${left_thresh}? ${left_add}`);
    console.log(`  Bottom: space=${bottom_space} > thresh=${bottom_thresh}? ${bottom_add}`);
    console.log(`  Right:  space=${right_space} > thresh=${right_thresh}? ${right_add}`);

    const adds = [top_add, left_add, bottom_add, right_add].filter(x => x).length;
    console.log(`  -> Adding ${adds} rectangles`);

    // Call original
    return original_split_rects.call(this, r1, r2);
};

console.log('=== Tracing Room 2 Split Geometry ===\n');

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
console.log('Creating Room 1 (fixed position at 3,3)...');
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

console.log(`\nAfter Room 1: ${get_rect_count()} rectangles`);
get_rects().forEach((r, i) => {
    console.log(`  Rect ${i}: (${r.lx},${r.ly})-(${r.hx},${r.hy})`);
});

// Room 2 - random position
console.log('\n=== Creating Room 2 (random) ===');
des.room({
    contents: function() {
        des.stair("up");
        des.object();
    }
});

console.log(`\nAfter Room 2: ${get_rect_count()} rectangles`);
get_rects().forEach((r, i) => {
    console.log(`  Rect ${i}: (${r.lx},${r.ly})-(${r.hx},${r.hy})`);
});

console.log(`\nExpected: 3 rectangles (C has rn2(3) at oracle call 9)`);
console.log(`Actual: ${get_rect_count()} rectangles`);
