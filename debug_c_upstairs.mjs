#!/usr/bin/env node
// debug_c_upstairs.mjs -- Check C upstairs position

import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

const adapter = new TmuxAdapter({ keyDelay: 80 });
await adapter.start({
    seed: 99999,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
});

// Wait a moment for the game to fully start
await new Promise(resolve => setTimeout(resolve, 500));

// Get the screen
const screen = await adapter.perceive();

console.log('C version level 1:');
console.log(`Player position: (${screen.playerX}, ${screen.playerY})`);

// Look for '<' (upstairs) on the map
for (let y = 0; y < screen.height; y++) {
    for (let x = 0; x < screen.width; x++) {
        const cell = screen.getCell(x, y);
        if (cell && cell.ch === '<') {
            console.log(`Upstairs found at: (${x}, ${y})`);
        }
    }
}

await adapter.stop();
