#!/usr/bin/env node
/**
 * Check needfill status of Oracle rooms
 */

import { initRng } from './js/rng.js';
import { makelevel } from './js/dungeon.js';
import { DUNGEONS_OF_DOOM } from './js/special_levels.js';

initRng(42);

const map = makelevel(5, DUNGEONS_OF_DOOM, 5);

console.log(`Total rooms: ${map.nroom}`);
console.log('\nRoom needfill values:');
for (let i = 0; i < map.nroom; i++) {
    const room = map.rooms[i];
    console.log(`  Room ${i}: rtype=${room.rtype}, needfill=${room.needfill}, ` +
                `lit=${room.rlit}, (${room.lx},${room.ly})-(${room.hx},${room.hy})`);
}
