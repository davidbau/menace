#!/usr/bin/env node
// test_room_calc.mjs -- Test room calculation with debug logging

process.env.DEBUG_XABS = '1';

import { runHeadless } from './selfplay/runner/headless_runner.js';

console.log('Generating level with debug logging...\n');

await runHeadless({
    seed: 99999,
    maxTurns: 1,
    verbose: false,
    onPerceive: (adapter) => {
        if (adapter.game && adapter.game.map && adapter.game.map.rooms.length > 0) {
            const map = adapter.game.map;
            console.log('\n=== FINAL RESULTS ===');
            console.log('Room 0:', map.rooms[0]);
            console.log('Upstairs:', map.upstair);
        }
    },
});
