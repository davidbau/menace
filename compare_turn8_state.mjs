#!/usr/bin/env node
// compare_turn8_state.mjs -- Compare full game state at end of turn 8

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog } from './js/rng.js';

console.log('=== C VERSION TURN 8 STATE ===');
const adapter = new TmuxAdapter({ keyDelay: 80, rngLogPath: '/tmp/c_rng_turn8.log' });
await adapter.start({
    seed: 99999,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
    rngLogPath: '/tmp/c_rng_turn8.log',
});

const agent = new Agent(adapter, {
    maxTurns: 9,
    onTurn: (info) => {
        if (info.turn === 8) {
            console.log(`Turn 8: Player at (${info.position.x}, ${info.position.y})`);
            console.log(`Action taken: ${info.action.type} key='${info.action.key}'`);
        }
    },
});

await agent.run();
await adapter.stop();

// Count C RNG calls through turn 8
const fs = await import('fs');
const cLog = fs.readFileSync('/tmp/c_rng_turn8.log', 'utf-8');
const cLines = cLog.trim().split('\n').filter(l => /^\d/.test(l));
console.log(`C RNG position after turn 8: ${cLines.length}`);

console.log('\n=== JS VERSION TURN 8 STATE ===');
enableRngLog(true);
let jsGame = null;

await runHeadless({
    seed: 99999,
    maxTurns: 9,
    verbose: false,
    onPerceive: (adapter) => {
        jsGame = adapter.game;
    },
    onTurn: (info) => {
        if (info.turn === 8 && jsGame) {
            const player = jsGame.player;
            const dog = jsGame.map.monsters.find(m => m.tame);
            console.log(`Turn 8: Player at (${player.x}, ${player.y})`);
            if (dog) {
                console.log(`        Dog at (${dog.mx}, ${dog.my}) movement=${dog.movement}`);
            }
            console.log(`Action taken: ${info.action.type} key='${info.action.key}'`);

            const rngLog = getRngLog();
            console.log(`JS RNG position after turn 8: ${rngLog.length}`);

            // Check for monsters around player
            console.log('\nMonsters within 2 squares of player:');
            for (const mon of jsGame.map.monsters) {
                const dx = Math.abs(mon.mx - player.x);
                const dy = Math.abs(mon.my - player.y);
                if (dx <= 2 && dy <= 2 && !mon.dead) {
                    console.log(`  ${mon.tame ? '🐕' : '👹'} ${mon.name} at (${mon.mx},${mon.my}) movement=${mon.movement}`);
                }
            }
        }
    },
});
