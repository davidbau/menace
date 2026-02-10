#!/usr/bin/env node
// compare_upstairs.mjs -- Compare upstairs positions between C and JS

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import { runHeadless } from './selfplay/runner/headless_runner.js';

// Test C version
console.log('=== C VERSION ===');
const adapter = new TmuxAdapter({ keyDelay: 80 });
await adapter.start({
    seed: 99999,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
});

const agent = new Agent(adapter, {
    maxTurns: 1,
    onTurn: (info) => {
        console.log(`Player at: (${info.position?.x}, ${info.position?.y})`);
    },
    onPerceive: (info) => {
        if (info.screen) {
            // Look for upstairs '<'
            for (let y = 0; y < info.screen.height; y++) {
                for (let x = 0; x < info.screen.width; x++) {
                    const cell = info.screen.getCell(x, y);
                    if (cell && cell.ch === '<') {
                        console.log(`Upstairs at: (${x}, ${y})`);
                    }
                }
            }
        }
    },
});

await agent.run();
await adapter.stop();

// Test JS version
console.log('\n=== JS VERSION ===');
let jsGameAdapter = null;
await runHeadless({
    seed: 99999,
    maxTurns: 1,
    verbose: false,
    onPerceive: (adapter) => {
        jsGameAdapter = adapter;
    },
    onTurn: (info) => {
        if (info.turn === 1 && jsGameAdapter && jsGameAdapter.game) {
            const game = jsGameAdapter.game;
            const player = game.player;
            const map = game.map;
            console.log(`Player at: (${player.x}, ${player.y})`);
            console.log(`Upstairs at: (${map.upstair.x}, ${map.upstair.y})`);
        }
    },
});
