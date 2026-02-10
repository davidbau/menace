#!/usr/bin/env node
// debug_turn9_detailed.mjs -- Detailed turn 9 analysis for seed 99999

import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from './js/rng.js';

enableRngLog(true);

let gameAdapter = null;
let turn9Started = false;

await runHeadless({
    seed: 99999,
    maxTurns: 10,
    verbose: false,
    onPerceive: (adapter) => {
        gameAdapter = adapter;
    },
    onTurn: (info) => {
        if (!gameAdapter || !gameAdapter.game) return;
        const game = gameAdapter.game;

        if (info.turn === 8) {
            const log = getRngLog();
            console.log(`\n=== END OF TURN 8 ===`);
            console.log(`RNG position: ${log.length}`);
            console.log(`Last call: ${log[log.length - 1]}`);

            // Show monster states at end of turn 8
            console.log(`\nMonster states at end of turn 8:`);
            for (const mon of game.map.monsters) {
                console.log(`  ${mon.tame ? '🐕' : '👹'} ${mon.name.padEnd(15)} movement=${String(mon.movement).padStart(3)} speed=${mon.speed} @ (${mon.mx},${mon.my})`);
            }
        }

        if (info.turn === 9 && !turn9Started) {
            turn9Started = true;
            const log = getRngLog();
            console.log(`\n=== START OF TURN 9 ===`);
            console.log(`RNG position: ${log.length}`);

            // Show monster states at start of turn 9 (before any movement)
            console.log(`\nMonster states at start of turn 9 (before movemon):`);
            for (const mon of game.map.monsters) {
                const willMove = mon.movement >= 12 ? 'WILL MOVE' : 'no move';
                console.log(`  ${mon.tame ? '🐕' : '👹'} ${mon.name.padEnd(15)} movement=${String(mon.movement).padStart(3)} speed=${mon.speed} @ (${mon.mx},${mon.my}) [${willMove}]`);
            }
        }

        if (info.turn === 9) {
            const log = getRngLog();
            console.log(`\n=== END OF TURN 9 ===`);
            console.log(`RNG position: ${log.length}`);
            console.log(`Total RNG calls this turn: ${log.length - 2483}`);

            // Show last 20 RNG calls
            console.log(`\nLast 20 RNG calls:`);
            const start = Math.max(0, log.length - 20);
            for (let i = start; i < log.length; i++) {
                console.log(`  ${i} ${log[i]}`);
            }
        }
    },
});

disableRngLog();
