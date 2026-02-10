#!/usr/bin/env node
// trace_all_turns_rng.mjs -- Trace RNG position at end of each turn

import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from './js/rng.js';

enableRngLog(true);

console.log('=== JS VERSION RNG POSITIONS PER TURN ===');
await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
    onTurn: (info) => {
        const log = getRngLog();
        console.log(`Turn ${String(info.turn).padStart(2)}: RNG pos ${String(log.length).padStart(4)} | Player (${String(info.position.x).padStart(2)},${String(info.position.y).padStart(2)}) | ${info.action.type.padEnd(8)} key='${info.action.key}'`);
    },
});

disableRngLog();
