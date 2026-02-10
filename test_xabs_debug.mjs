#!/usr/bin/env node
// test_xabs_debug.mjs -- Test xabs calculation with debug logging

process.env.DEBUG_XABS = '1';

import { initRng, setGameSeed } from './js/rng.js';
import { initLevelGeneration, makelevel } from './js/dungeon.js';

initRng(99999);
setGameSeed(99999);
initLevelGeneration();

console.log('Generating level 1 with seed 99999...\n');
const map = makelevel(1);

console.log('\n=== RESULTS ===');
console.log('Room 0:', JSON.stringify(map.rooms[0], null, 2));
console.log('\nUpstairs:', map.upstair);
console.log('Player should be placed at:', map.upstair);
