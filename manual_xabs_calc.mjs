#!/usr/bin/env node
// manual_xabs_calc.mjs -- Manually calculate xabs to find the bug

// Constants
const COLNO = 80;
const ROWNO = 22;
const XLIM = 4;
const YLIM = 2;

// Initial rect from init_rect()
const rect = { lx: 0, hx: COLNO - 1, ly: 0, hy: ROWNO - 1 };

console.log('=== MANUAL XABS CALCULATION ===\n');
console.log('Initial rect:', rect);

// For first room (non-vault)
const vault = false;
const xlim = XLIM + (vault ? 1 : 0);  // xlim = 4
const ylim = YLIM + (vault ? 1 : 0);  // ylim = 2

console.log(`xlim = ${xlim}, ylim = ${ylim}`);

// Room dimensions (these use RNG, but I'll use example values)
// Based on code: dx = 2 + rn2((hx - lx > 28) ? 12 : 8)
// For rect: hx - lx = 79 - 0 = 79 > 28, so dx = 2 + rn2(12)
// Let's say rn2(12) returns some value X, so dx = 2 + X

// For the calculation to work, I need to know the actual RNG values
// Let me just show the formula

const lx = rect.lx;  // 0
const hx = rect.hx;  // 79

console.log(`\nFor random room from rect (${lx}, ${hx}):`);

// Assume dx = 8 (example - actual value uses RNG)
const dx_example = 8;
console.log(`Assume dx = ${dx_example} (actual value from rn2)`);

// xborder calculation
const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
console.log(`xborder = (${lx} > 0 && ${hx} < ${COLNO - 1}) ? ${2 * xlim} : ${xlim + 1} = ${xborder}`);

// xabs calculation
const xbase = lx + (lx > 0 ? xlim : 3);
console.log(`\nxabs calculation:`);
console.log(`  xbase = ${lx} + (${lx > 0} ? ${xlim} : 3) = ${xbase}`);

const xrange = hx - (lx > 0 ? lx : 3) - dx_example - xborder + 1;
console.log(`  xrange = ${hx} - (${lx > 0} ? ${lx} : 3) - ${dx_example} - ${xborder} + 1`);
console.log(`  xrange = ${hx} - 3 - ${dx_example} - ${xborder} + 1 = ${xrange}`);

console.log(`  xoffset = rn2(${xrange}) = ??? (need actual RNG value)`);
console.log(`  xabs = ${xbase} + xoffset`);

console.log(`\n=== KEY INSIGHT ===`);
console.log(`For lx=0 rect, the xabs formula is:`);
console.log(`  xabs = 3 + rn2(hx - 3 - dx - xborder + 1)`);
console.log(`  xabs = 3 + rn2(79 - 3 - dx - xborder + 1)`);
console.log(`\nWith dx=8, xborder=3:`);
console.log(`  xabs = 3 + rn2(66) = 3 + [0 to 65]`);
console.log(`  Possible xabs range: [3, 68]`);

console.log(`\nObserved JS room lx=11, so xabs was 11 (after lowx adjustment)`);
console.log(`This means: 11 = 3 + rn2(66)`);
console.log(`So rn2(66) returned 8`);

console.log(`\nIf C has xabs=10, then: 10 = 3 + rn2(66)`);
console.log(`So rn2(66) would have returned 7`);

console.log(`\n**BUT** we know RNG values match! So something else must differ.`);
console.log(`\nPossible causes:`);
console.log(`1. Different dx value (but both use same RNG!)`);
console.log(`2. Different xborder calculation`);
console.log(`3. Different xbase calculation`);
console.log(`4. check_room() modifies xabs differently`);
