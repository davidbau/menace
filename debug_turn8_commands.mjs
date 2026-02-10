#!/usr/bin/env node
// debug_turn8_commands.mjs -- Trace player commands for turns 7-9

import { runHeadless } from './selfplay/runner/headless_runner.js';

await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
    onTurn: (info) => {
        if (info.turn >= 7 && info.turn <= 9) {
            const action = info.action;
            console.log(`Turn ${info.turn}: action=${action?.type} key='${action?.key || '?'}' pos=${info.position?.x},${info.position?.y}`);
        }
    },
});
