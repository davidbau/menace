#!/usr/bin/env node
// debug_position_trace.mjs -- Trace player positions for turns 1-10

import { runHeadless } from './selfplay/runner/headless_runner.js';

console.log('=== JS VERSION ===');
await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
    onTurn: (info) => {
        if (info.turn <= 10) {
            const action = info.action;
            console.log(`Turn ${String(info.turn).padStart(2)}: pos=(${String(info.position?.x).padStart(2)},${String(info.position?.y).padStart(2)}) action=${action?.type?.padEnd(8)} key='${action?.key || '?'}'`);
        }
    },
});
