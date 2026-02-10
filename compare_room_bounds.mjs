#!/usr/bin/env node
// compare_room_bounds.mjs -- Compare room boundaries between C and JS

import { runHeadless } from './selfplay/runner/headless_runner.js';

await runHeadless({
    seed: 99999,
    maxTurns: 1,
    verbose: false,
    onPerceive: (adapter) => {
        if (!adapter.game) return;
        const map = adapter.game.map;

        console.log('=== JS VERSION LEVEL 1 ROOMS ===');
        console.log(`Upstairs: (${map.upstair.x}, ${map.upstair.y})`);
        console.log(`\nRooms (${map.rooms.length} total):`);
        for (let i = 0; i < Math.min(map.rooms.length, 5); i++) {
            const room = map.rooms[i];
            console.log(`Room ${i}: lx=${room.lx} hx=${room.hx} ly=${room.ly} hy=${room.hy} (width=${room.hx-room.lx+1}, height=${room.hy-room.ly+1})`);
        }
    },
});
