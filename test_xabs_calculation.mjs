#!/usr/bin/env node
// test_xabs_calculation.mjs -- Calculate what xabs should be for first room

import { initRng, rn2 } from './js/rng.js';

const COLNO = 80;
const XLIM = 2;

initRng(99999);

// Consume RNG calls up to first room creation
// This is a simplified simulation - actual code has more calls
console.log('Simulating RNG calls before first room...');

// Skip initial RNG calls (bones check, maze check, etc.)
// Based on the RNG log, we know position 947 is where stairs generation starts
// Let's consume RNG up to around where first room would be created

// Initial rect: lx=0, hx=79
const rect_lx = 0;
const rect_hx = COLNO - 1;

console.log(`Initial rect: lx=${rect_lx} hx=${rect_hx}`);

// For random room generation:
// dx = 2 + rn2((hx - lx > 28) ? 12 : 8)
const dx_rng = (rect_hx - rect_lx > 28) ? 12 : 8;
const dx_value = rn2(dx_rng);
const dx = 2 + dx_value;
console.log(`dx = 2 + rn2(${dx_rng}) = 2 + ${dx_value} = ${dx}`);

// dy = 2 + rn2(4)
const dy_value = rn2(4);
const dy = 2 + dy_value;
console.log(`dy = 2 + rn2(4) = 2 + ${dy_value} = ${dy}`);

// xborder = (lx > 0 && hx < COLNO-1) ? 2*XLIM : XLIM+1
const xborder = (rect_lx > 0 && rect_hx < COLNO - 1) ? 2 * XLIM : XLIM + 1;
console.log(`xborder = ${xborder}`);

// xabs = lx + (lx > 0 ? xlim : 3) + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1)
const base = rect_lx + (rect_lx > 0 ? XLIM : 3);
const range = rect_hx - (rect_lx > 0 ? rect_lx : 3) - dx - xborder + 1;
const xabs_offset = rn2(range);
const xabs = base + xabs_offset;

console.log(`xabs = ${rect_lx} + ${rect_lx > 0 ? XLIM : 3} + rn2(${range})`);
console.log(`xabs = ${base} + ${xabs_offset} = ${xabs}`);

// After check_room adjustments (if any)
console.log(`\nFinal: xabs=${xabs}`);
console.log(`Room would be: lx=${xabs-1}, hx=${xabs+dx}`);
