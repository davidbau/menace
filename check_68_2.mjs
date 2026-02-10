#!/usr/bin/env node
// Check why (68,2) isn't a frontier cell

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function checkCell(seed) {
    const adapter = new TmuxAdapter({ seed, keyDelay: 50 });
    await adapter.start({
        seed, role: 'Valkyrie', race: 'human',
        name: 'Agent', gender: 'female', align: 'neutral',
    });

    const agent = new Agent(adapter, { maxTurns: 20 });
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const x = 68, y = 2;
    const cell = level.at(x, y);

    console.log(`\n=== Checking (${x},${y}) ===`);
    console.log(`  explored=${cell?.explored}, walkable=${cell?.walkable}, type=${cell?.type}`);

    console.log('\n8-directional neighbors:');
    for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
        const nx = x + dx, ny = y + dy;
        const ncell = level.at(nx, ny);
        const status = ncell?.explored ? `explored (${ncell.type})` : 'UNEXPLORED';
        console.log(`  (${nx},${ny}): ${status}`);
    }

    await adapter.stop();
}

checkCell(44444).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
