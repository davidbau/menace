#!/usr/bin/env node
// Debug: Check cells at edges of explored area

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function debugEdges(seed) {
    const adapter = new TmuxAdapter({ seed, keyDelay: 50 });
    await adapter.start({
        seed, role: 'Valkyrie', race: 'human',
        name: 'Agent', gender: 'female', align: 'neutral',
    });

    const agent = new Agent(adapter, { maxTurns: 20 });
    await agent.run();

    const level = agent.dungeon.currentLevel;

    console.log('\n=== Checking cells at known positions ===\n');

    // Check cells we saw in the raw screen
    const testCells = [
        [68, 1], [68, 2], [68, 3], [68, 4], [68, 5], [68, 6], [68, 7], [68, 8], [68, 9],
        [67, 5], [69, 5], [70, 5],
    ];

    for (const [x, y] of testCells) {
        const cell = level.at(x, y);
        if (cell) {
            console.log(`(${x},${y}): explored=${cell.explored}, type=${cell.type}, walkable=${cell.walkable}, ch='${cell.ch}'`);
        } else {
            console.log(`(${x},${y}): NULL CELL`);
        }
    }

    // Check if cells beyond the visible area exist
    console.log('\n=== Checking cells beyond visible area ===\n');
    for (const [x, y] of [[68, 0], [68, 10], [60, 5], [75, 5]]) {
        const cell = level.at(x, y);
        if (cell) {
            console.log(`(${x},${y}): explored=${cell.explored}, type=${cell.type}, walkable=${cell.walkable}`);
        } else {
            console.log(`(${x},${y}): NULL CELL`);
        }
    }

    await adapter.stop();
}

debugEdges(44444).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
