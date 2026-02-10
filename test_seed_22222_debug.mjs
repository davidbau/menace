#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    console.log('=== Debug Seed 22222 (stuck at 22-64 cells) ===\n');

    const result = await runHeadless({
        seed: 22222,
        roleIndex: 12,
        maxTurns: 500,
        debug: false,
    });

    const level = result.agent.dungeon.currentLevel;
    console.log(`\nFinal state:`);
    console.log(`  Explored: ${level.exploredCount} cells`);
    console.log(`  Stairs down found: ${level.stairsDown.length}`);
    console.log(`  Frontier cells: ${level.getExplorationFrontier().length}`);

    // Check search status
    let highlySearched = 0;
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = level.at(x, y);
            if (cell && cell.searchCount >= 10) {
                highlySearched++;
                if (cell.searchCount >= 20) {
                    console.log(`  Wall at (${x},${y}): searched ${cell.searchCount} times, type=${cell.type}`);
                }
            }
        }
    }
    console.log(`  Cells searched 10+ times: ${highlySearched}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
