#!/usr/bin/env node
// debug_complete_trace.mjs -- Complete trace of turns 7-9

import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from './js/rng.js';

enableRngLog(true);

let gameAdapter = null;

await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
    onPerceive: (adapter) => {
        gameAdapter = adapter;
    },
    onTurn: (info) => {
        if (!gameAdapter || !gameAdapter.game) return;
        if (info.turn < 7 || info.turn > 9) return;

        const game = gameAdapter.game;
        const log = getRngLog();
        const dog = game.map.monsters.find(m => m.tame);

        console.log(`\n=== TURN ${info.turn} END ===`);
        console.log(`Action: ${info.action?.type} key='${info.action?.key}'`);
        console.log(`Player: (${info.position?.x},${info.position?.y})`);
        console.log(`Dog: ${dog ? `(${dog.mx},${dog.my}) movement=${dog.movement}` : 'NOT FOUND'}`);
        console.log(`RNG position: ${log.length}`);

        if (info.turn === 8) {
            // Show RNG calls from position 2476 to 2483 (turn 8 tail)
            console.log(`\nTurn 8 RNG tail (positions 2476-2483):`);
            for (let i = 2476; i <= Math.min(2483, log.length - 1); i++) {
                console.log(`  ${i} ${log[i]}`);
            }
        }

        if (info.turn === 9) {
            // Show ALL RNG calls from 2484 onwards
            console.log(`\nTurn 9 RNG calls (from 2484):`);
            for (let i = 2484; i < log.length; i++) {
                console.log(`  ${i} ${log[i]}`);
            }
        }
    },
});

disableRngLog();
