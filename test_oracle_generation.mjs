#!/usr/bin/env node
/**
 * Test if Oracle level generates successfully
 */

import { initRng } from './js/rng.js';
import { makelevel } from './js/dungeon.js';
import { DUNGEONS_OF_DOOM } from './js/special_levels.js';

initRng(42);

console.log('Generating Oracle level...');
const map = makelevel(5, DUNGEONS_OF_DOOM, 5);

console.log(`\nResult: ${map ? 'SUCCESS' : 'FAILED'}`);
if (map) {
    console.log(`  Map size: ${map.width}x${map.height}`);
    console.log(`  Rooms: ${map.rooms ? map.rooms.length : 0}`);
    console.log(`  nroom: ${map.nroom}`);
} else {
    console.log('  Oracle generation returned null/undefined!');
}
