#!/usr/bin/env node
import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function check() {
    const adapter = new TmuxAdapter({ seed: 44444, keyDelay: 50 });
    await adapter.start({
        seed: 44444, role: 'Valkyrie', race: 'human',
        name: 'Agent', gender: 'female', align: 'neutral',
    });
    const agent = new Agent(adapter, { maxTurns: 20 });
    await agent.run();
    const level = agent.dungeon.currentLevel;
    
    console.log('\n=== Checking wall cell (68,1) ===');
    const cell = level.at(68, 1);
    console.log(`  explored=${cell?.explored}, walkable=${cell?.walkable}, type=${cell?.type}`);
    console.log('\nCardinal neighbors:');
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
        const nx = 68 + dx, ny = 1 + dy;
        const ncell = level.at(nx, ny);
        console.log(`  (${nx},${ny}): explored=${ncell?.explored}, type=${ncell?.type}`);
    }
    await adapter.stop();
}
check().catch(console.error);
