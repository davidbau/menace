#!/usr/bin/env node
// debug_seed_99999.mjs -- Trace dog movement for seed 99999

import { runHeadless } from './selfplay/runner/headless_runner.js';

const dogStates = [];
let gameAdapter = null;

await runHeadless({
    seed: 99999,
    maxTurns: 12,
    verbose: false,
    onPerceive: (adapter) => {
        gameAdapter = adapter;
    },
    onTurn: (info) => {
        if (!gameAdapter || !gameAdapter.game) return;
        const game = gameAdapter.game;
        const dog = game.map.monsters.find(m => m.tame);
        const allMonsters = game.map.monsters;

        if (dog) {
            dogStates.push({
                turn: info.turn,
                movement: dog.movement,
                speed: dog.speed,
                x: dog.mx,
                y: dog.my,
                willMove: dog.movement >= 12,
                allMonstersMovement: allMonsters.map(m => ({
                    name: m.name,
                    movement: m.movement,
                    speed: m.speed,
                    tame: m.tame,
                }))
            });
        }
    },
});

console.log('JS Dog Movement Trace for Seed 99999:');
console.log('Turn | Movement | Speed | Position | WillMove? | Details');
console.log('-'.repeat(80));
for (const state of dogStates) {
    const willMove = state.willMove ? 'YES' : 'NO ';
    console.log(`${String(state.turn).padStart(4)} | ${String(state.movement).padStart(8)} | ${String(state.speed).padStart(5)} | (${state.x},${state.y})   | ${willMove}      | ${state.allMonstersMovement.length} monsters`);

    // Show detailed monster states for turns around the divergence
    if (state.turn >= 8 && state.turn <= 10) {
        console.log(`     Monster states:`);
        for (const m of state.allMonstersMovement) {
            const marker = m.tame ? '🐕' : '👹';
            console.log(`       ${marker} ${m.name.padEnd(15)} movement=${String(m.movement).padStart(3)} speed=${m.speed}`);
        }
    }
}
