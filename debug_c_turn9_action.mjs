#!/usr/bin/env node
// debug_c_turn9_action.mjs -- Check what action C version takes on turn 9

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import fs from 'fs';

const logPath = '/tmp/nethack_rng_c_turn9.log';
try { fs.unlinkSync(logPath); } catch {}

const adapter = new TmuxAdapter({ keyDelay: 80 });
await adapter.start({
    seed: 99999,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
    rngLogPath: logPath,
});

const agent = new Agent(adapter, {
    maxTurns: 10,
    onTurn: (info) => {
        if (info.turn >= 7 && info.turn <= 9) {
            console.log(`Turn ${info.turn}: action=${info.action?.type} key='${info.action?.key || '?'}' pos=${info.position?.x},${info.position?.y}`);
        }
    },
});

try {
    await agent.run();
} catch (err) {
    console.log(`Error: ${err.message}`);
}

await adapter.stop();

// Show RNG calls around position 2484
const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n');
console.log('\nC RNG calls around position 2484:');
for (const line of lines) {
    const match = line.match(/^(\d+) /);
    if (match) {
        const pos = parseInt(match[1]);
        if (pos >= 2480 && pos <= 2490) {
            console.log(`  ${line}`);
        }
    }
}
