#!/usr/bin/env node
// debug_turn9_attack_target.mjs -- Check what's at the attack target on turn 9

import { runHeadless } from './selfplay/runner/headless_runner.js';

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
        const game = gameAdapter.game;
        const player = game.player;

        if (info.turn === 8) {
            console.log('=== END OF TURN 8 ===');
            console.log(`Player at: (${player.x}, ${player.y})`);
            const dog = game.map.monsters.find(m => m.tame);
            if (dog) {
                console.log(`Dog at: (${dog.mx}, ${dog.my})`);
            }
        }

        if (info.turn === 9) {
            console.log('\n=== TURN 9 (before action) ===');
            console.log(`Player at: (${player.x}, ${player.y})`);
            console.log(`Action will be: ${info.action.type} key='${info.action.key}'`);

            // 'k' key means move down (y+1)
            const targetX = player.x;
            const targetY = player.y + 1;
            console.log(`Target square: (${targetX}, ${targetY})`);

            // Check what's at target
            const targetMon = game.map.monsterAt(targetX, targetY);
            if (targetMon) {
                console.log(`  Monster: ${targetMon.name} (tame=${targetMon.tame})`);
            } else {
                console.log(`  No monster at target`);
            }

            const targetLoc = game.map.at(targetX, targetY);
            if (targetLoc) {
                console.log(`  Terrain type: ${targetLoc.typ}`);
            }

            // Show all nearby monsters
            console.log('\nAll monsters within 2 squares:');
            for (const mon of game.map.monsters) {
                if (mon.dead) continue;
                const dx = Math.abs(mon.mx - player.x);
                const dy = Math.abs(mon.my - player.y);
                if (dx <= 2 && dy <= 2) {
                    console.log(`  ${mon.tame ? '🐕' : '👹'} ${mon.name} at (${mon.mx},${mon.my})`);
                }
            }
        }
    },
});
