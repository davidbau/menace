#!/usr/bin/env node
// debug_room_generation.mjs -- Trace room generation in detail

import { initRng, rn2, rnd } from './js/rng.js';
import { setGameSeed, initLevelGeneration } from './js/dungeon.js';

// Patch dungeon.js to log room creation
const Module = await import('./js/dungeon.js');

const originalMakelevel = Module.makelevel;
let roomCreationLog = [];

// Intercept room creation
const originalCreateRoom = Module.create_room;
Module.create_room = function(...args) {
    const [map, x, y, w, h, xal, yal, rtype, rlit, depth, inThemerooms] = args;
    console.log(`\ncreate_room called: x=${x} y=${y} w=${w} h=${h} xal=${xal} yal=${yal}`);

    const result = originalCreateRoom.apply(this, args);

    if (result && map.rooms.length > 0) {
        const room = map.rooms[map.rooms.length - 1];
        console.log(`  → Room created: lx=${room.lx} hx=${room.hx} ly=${room.ly} hy=${room.hy}`);
        roomCreationLog.push({
            params: { x, y, w, h, xal, yal },
            room: { lx: room.lx, hx: room.hx, ly: room.ly, hy: room.hy }
        });
    } else {
        console.log(`  → Room creation failed`);
    }

    return result;
};

const seed = 99999;
console.log(`Generating level 1 with seed ${seed}...\n`);

initRng(seed);
setGameSeed(seed);
initLevelGeneration();

const map = Module.makelevel(1);

console.log('\n=== FINAL ROOM SUMMARY ===');
for (let i = 0; i < map.rooms.length; i++) {
    const room = map.rooms[i];
    console.log(`Room ${i}: lx=${room.lx} hx=${room.hx} ly=${room.ly} hy=${room.hy} (width=${room.hx-room.lx+1})`);
}

console.log(`\nUpstairs: (${map.upstair.x}, ${map.upstair.y})`);
console.log(`Downstairs: (${map.dnstair.x}, ${map.dnstair.y})`);
