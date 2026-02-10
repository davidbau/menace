#!/usr/bin/env node
// dump_both_maps.mjs -- Dump first few turns of both C and JS to see maps

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import { runHeadless } from './selfplay/runner/headless_runner.js';

console.log('=== C VERSION TURN 1 ===\n');
const adapter = new TmuxAdapter({ keyDelay: 80 });
await adapter.start({
    seed: 99999,
    role: 'Valkyrie',
    race: 'human',
    name: 'Agent',
    gender: 'female',
    align: 'neutral',
});

let cScreen = null;
const agent = new Agent(adapter, {
    maxTurns: 1,
    onPerceive: (info) => {
        cScreen = info.screen;
    },
});

await agent.run();

if (cScreen) {
    // Print a small section of the map around player
    console.log('Map section around player (10x7):');
    for (let y = 1; y < 8; y++) {
        let line = '';
        for (let x = 9; x < 22; x++) {
            const cell = cScreen.getCell(x, y);
            line += cell ? cell.ch : ' ';
        }
        console.log(line);
    }
    console.log(`\nPlayer @ in map is at (${cScreen.playerX}, ${cScreen.playerY})`);
}

await adapter.stop();

console.log('\n=== JS VERSION TURN 1 ===\n');
let jsGame = null;
await runHeadless({
    seed: 99999,
    maxTurns: 1,
    verbose: false,
    onPerceive: (adapter) => {
        jsGame = adapter.game;
    },
});

if (jsGame) {
    const map = jsGame.map;
    const player = jsGame.player;

    console.log('Map section around player (10x7):');
    for (let y = 1; y < 8; y++) {
        let line = '';
        for (let x = 9; x < 22; x++) {
            if (x === player.x && y === player.y) {
                line += '@';
            } else if (x === map.upstair.x && y === map.upstair.y) {
                line += '<';
            } else if (x === map.dnstair.x && y === map.dnstair.y) {
                line += '>';
            } else {
                const loc = map.at(x, y);
                if (!loc) { line += '?'; continue; }
                const mon = map.monsterAt(x, y);
                if (mon) { line += mon.displayChar; continue; }
                // Simplified terrain display
                if (loc.typ === 10 || loc.typ === 11) line += '#'; // CORR/ROOM->wall
                else if (loc.typ === 19) line += '\u00b7'; // ROOM->floor
                else if (loc.typ === 17) line += '#'; // CORR
                else line += ' ';
            }
        }
        console.log(line);
    }
    console.log(`\nPlayer @ is at (${player.x}, ${player.y})`);
    console.log(`Upstairs < is at (${map.upstair.x}, ${map.upstair.y})`);
}
