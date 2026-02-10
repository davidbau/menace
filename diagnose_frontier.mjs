#!/usr/bin/env node
// Check what frontier cells exist after initial exploration

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function diagnoseFrontier(seed) {
    const adapter = new TmuxAdapter({ seed, keyDelay: 50 });
    await adapter.start({
        seed,
        role: 'Valkyrie',
        race: 'human',
        name: 'Agent',
        gender: 'female',
        align: 'neutral',
    });

    const agent = new Agent(adapter, { maxTurns: 20 });
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const px = agent.screen.playerX;
    const py = agent.screen.playerY;

    console.log(`\nPlayer at: (${px}, ${py})`);
    console.log(`Explored: ${level.exploredCount} cells\n`);

    const frontier = level.getExplorationFrontier();
    console.log(`Frontier cells: ${frontier.length}\n`);

    if (frontier.length > 0) {
        console.log('First 20 frontier cells:');
        for (let i = 0; i < Math.min(20, frontier.length); i++) {
            const f = frontier[i];
            const cell = level.at(f.x, f.y);
            console.log(`  (${f.x},${f.y}): type=${cell?.type}, walkable=${cell?.walkable}, searched=${f.searchScore}`);

            // Check neighbors
            let unexploredNeighbors = [];
            for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const nx = f.x + dx, ny = f.y + dy;
                const ncell = level.at(nx, ny);
                if (ncell && !ncell.explored) {
                    unexploredNeighbors.push(`(${nx},${ny})`);
                }
            }
            console.log(`    Unexplored neighbors: ${unexploredNeighbors.join(', ')}`);
        }
    } else {
        console.log('NO FRONTIER CELLS!');
        console.log('\nLet me check which cells are explored vs unexplored:');

        let exploredWalkable = 0;
        let exploredWalls = 0;
        let unexploredTotal = 0;

        for (let y = 0; y < 21; y++) {
            for (let x = 0; x < 80; x++) {
                const cell = level.at(x, y);
                if (cell && cell.explored) {
                    if (cell.walkable) exploredWalkable++;
                    else exploredWalls++;
                } else {
                    unexploredTotal++;
                }
            }
        }

        console.log(`  Explored walkable: ${exploredWalkable}`);
        console.log(`  Explored walls: ${exploredWalls}`);
        console.log(`  Unexplored: ${unexploredTotal}`);

        // Check if any explored walkable cell has unexplored neighbors
        console.log('\nChecking explored walkable cells for unexplored neighbors:');
        let foundAny = false;
        for (let y = 0; y < 21; y++) {
            for (let x = 0; x < 80; x++) {
                const cell = level.at(x, y);
                if (cell && cell.explored && cell.walkable) {
                    for (const [dx, dy] of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]) {
                        const nx = x + dx, ny = y + dy;
                        if (nx < 0 || nx >= 80 || ny < 0 || ny >= 21) continue;
                        const ncell = level.at(nx, ny);
                        if (!ncell || !ncell.explored) {
                            console.log(`  (${x},${y}) [${cell.type}] has unexplored neighbor at (${nx},${ny})`);
                            foundAny = true;
                            if (foundAny) break;
                        }
                    }
                    if (foundAny) break;
                }
                if (foundAny) break;
            }
            if (foundAny) break;
        }
        if (!foundAny) {
            console.log('  NO explored walkable cells have unexplored neighbors!');
        }
    }

    await adapter.stop();
}

diagnoseFrontier(44444).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
