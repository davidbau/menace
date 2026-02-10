#!/usr/bin/env node
// debug_upstair_pos.mjs -- Check upstairs position and room boundaries

import { runHeadless } from './selfplay/runner/headless_runner.js';

let gameAdapter = null;

await runHeadless({
    seed: 99999,
    maxTurns: 1,
    verbose: false,
    onPerceive: (adapter) => {
        gameAdapter = adapter;
    },
    onTurn: (info) => {
        if (info.turn === 1 && gameAdapter && gameAdapter.game && gameAdapter.game.map) {
            const map = gameAdapter.game.map;
            const player = gameAdapter.game.player;

            console.log('Level 1 map information:');
            console.log(`  Upstair position: (${map.upstair.x}, ${map.upstair.y})`);
            console.log(`  Downstair position: (${map.dnstair.x}, ${map.dnstair.y})`);
            console.log(`  Player position: (${player.x}, ${player.y})`);

            if (map.rooms.length > 0) {
                const room = map.rooms[0];
                console.log(`  First room: lx=${room.lx}, hx=${room.hx}, ly=${room.ly}, hy=${room.hy}`);
                console.log(`  Center calc: x=${Math.floor((room.lx + room.hx) / 2)}, y=${Math.floor((room.ly + room.hy) / 2)}`);
            }
        }
    },
});
