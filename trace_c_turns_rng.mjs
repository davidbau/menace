#!/usr/bin/env node
// trace_c_turns_rng.mjs -- Trace C RNG positions per turn

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import fs from 'fs';

const logPath = '/tmp/c_rng_trace.log';
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

function getRngCount() {
    if (!fs.existsSync(logPath)) return 0;
    const text = fs.readFileSync(logPath, 'utf-8').trim();
    if (!text) return 0;
    return text.split('\n').filter(line => /^\d/.test(line)).length;
}

console.log('=== C VERSION RNG POSITIONS PER TURN ===');
const agent = new Agent(adapter, {
    maxTurns: 10,
    onTurn: (info) => {
        const rngPos = getRngCount();
        console.log(`Turn ${String(info.turn).padStart(2)}: RNG pos ${String(rngPos).padStart(4)} | Player (${String(info.position.x).padStart(2)},${String(info.position.y).padStart(2)}) | ${info.action.type.padEnd(8)} key='${info.action.key}'`);
    },
});

await agent.run();
await adapter.stop();
