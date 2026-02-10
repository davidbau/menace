#!/usr/bin/env node
// debug_c_positions.mjs -- Trace C player positions for turns 1-10

import { Agent } from './selfplay/agent.js';
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

console.log('=== C VERSION ===');
const agent = new Agent(adapter, {
    maxTurns: 10,
    onTurn: (info) => {
        if (info.turn <= 10) {
            const action = info.action;
            console.log(`Turn ${String(info.turn).padStart(2)}: pos=(${String(info.position?.x).padStart(2)},${String(info.position?.y).padStart(2)}) action=${action?.type?.padEnd(8)} key='${action?.key || '?'}'`);
        }
    },
});

try {
    await agent.run();
} catch (err) {
    console.log(`Error: ${err.message}`);
}

await adapter.stop();
