#!/usr/bin/env node
// Diagnose screen parsing - compare raw screen vs agent's map

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function diagnoseScreenParsing(seed, maxTurns = 100) {
    console.log(`\n=== Screen Parsing Diagnostic: Seed ${seed} ===\n`);

    const adapter = new TmuxAdapter({ seed, keyDelay: 50 });
    await adapter.start({
        seed,
        role: 'Valkyrie',
        race: 'human',
        name: 'Agent',
        gender: 'female',
        align: 'neutral',
    });

    const agent = new Agent(adapter, { maxTurns });

    // Run for just a few turns to set up
    let turns = 0;
    agent.onTurn = () => {
        turns++;
        if (turns >= 10) {
            agent.shouldContinue = () => false; // Stop after 10 turns
        }
    };

    await agent.run();

    const level = agent.dungeon.currentLevel;
    const px = agent.screen.playerX;
    const py = agent.screen.playerY;

    console.log(`\nPlayer position: (${px}, ${py})\n`);
    console.log(`Explored cells: ${level.exploredCount}\n`);

    // Display raw screen
    console.log('=== RAW SCREEN (what tmux shows) ===');
    console.log('Message: ' + agent.screen.message);
    console.log('');
    for (let y = 0; y < 21; y++) {
        let row = '';
        for (let x = 0; x < 80; x++) {
            const cell = agent.screen.map[y][x];
            row += cell ? cell.ch : ' ';
        }
        console.log(row);
    }

    console.log('\n=== AGENT MAP (what agent thinks) ===');
    console.log('Legend: @ = player, + = door, # = wall, . = floor, ? = unexplored\n');
    for (let y = 0; y < 21; y++) {
        let row = '';
        for (let x = 0; x < 80; x++) {
            if (x === px && y === py) {
                row += '@';
            } else {
                const cell = level.at(x, y);
                if (!cell || !cell.explored) {
                    row += '?';
                } else if (cell.type === 'door_open') {
                    row += '-';
                } else if (cell.type === 'door_closed') {
                    row += '+';
                } else if (cell.type === 'wall') {
                    row += '#';
                } else if (cell.type === 'corridor') {
                    row += '#';
                } else if (cell.type === 'floor') {
                    row += '.';
                } else if (cell.type === 'stairs_down') {
                    row += '>';
                } else if (cell.type === 'stairs_up') {
                    row += '<';
                } else {
                    row += '?';
                }
            }
        }
        console.log(row);
    }

    // Check for doors in explored area
    console.log('\n=== DOOR DETECTION ===');
    let doorsFound = 0;
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = level.at(x, y);
            if (cell && cell.explored && (cell.type === 'door_open' || cell.type === 'door_closed')) {
                console.log(`  Door at (${x}, ${y}): type=${cell.type}, char='${cell.ch}'`);
                doorsFound++;
            }
        }
    }
    console.log(`Total doors found: ${doorsFound}`);

    // Check cells around player
    console.log('\n=== CELLS AROUND PLAYER ===');
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const x = px + dx;
            const y = py + dy;
            const cell = level.at(x, y);
            if (cell && cell.explored) {
                console.log(`  (${x},${y}): type=${cell.type}, walkable=${cell.walkable}, ch='${cell.ch}'`);
            }
        }
    }

    await adapter.stop();
}

async function main() {
    await diagnoseScreenParsing(44444, 100);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
