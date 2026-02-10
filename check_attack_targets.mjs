#!/usr/bin/env node
// check_attack_targets.mjs -- Check what monsters are at potential attack targets

import { runHeadless } from './selfplay/runner/headless_runner.js';

let turnEndStates = [];

await runHeadless({
    seed: 99999,
    maxTurns: 9,
    verbose: false,
    onTurn: async (info) => {
        // Save state - need to use the adapter's game reference
        if (info.turn >= 8) {
            turnEndStates.push({
                turn: info.turn,
                playerPos: { ...info.position },
                action: { ...info.action }
            });
        }
    },
    onPerceive: (adapter) => {
        if (!adapter.game) return;
        const game = adapter.game;
        const player = game.player;

        // Check state before turn 9 action
        if (turnEndStates.length > 0 && turnEndStates[turnEndStates.length - 1].turn === 8) {
            console.log('=== STATE AFTER TURN 8, BEFORE TURN 9 ===');
            console.log(`Player: (${player.x}, ${player.y})`);

            // Check squares (15,11) and (16,11)
            console.log('\nMonsters at potential attack targets:');
            for (let x = 15; x <= 16; x++) {
                for (let y = 10; y <= 11; y++) {
                    const mon = game.map.monsterAt(x, y);
                    if (mon) {
                        console.log(`  (${x},${y}): ${mon.tame ? '🐕' : '👹'} ${mon.name}`);
                    } else {
                        console.log(`  (${x},${y}): empty`);
                    }
                }
            }

            console.log('\nAll monsters on map:');
            for (const mon of game.map.monsters) {
                if (!mon.dead) {
                    console.log(`  ${mon.tame ? '🐕' : '👹'} ${mon.name} at (${mon.mx},${mon.my}) movement=${mon.movement}`);
                }
            }
        }
    },
});

console.log('\nTurn sequence:');
for (const state of turnEndStates) {
    console.log(`Turn ${state.turn}: Player ended at (${state.playerPos.x},${state.playerPos.y}) after ${state.action.type} '${state.action.key}'`);
}
