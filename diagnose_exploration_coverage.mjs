#!/usr/bin/env node
// Diagnose exploration coverage after N turns

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import { findPath } from './selfplay/brain/pathing.js';

async function diagnoseExploration(seed, maxTurns = 500) {
    console.log(`\n=== Exploration Coverage Diagnostic: Seed ${seed} ===\n`);

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

    // Log every 50 turns to see progress
    let turnCount = 0;
    agent.onTurn = (info) => {
        turnCount++;
        if (turnCount % 50 === 0) {
            const level = agent.dungeon.currentLevel;
            const px = agent.screen.playerX;
            const py = agent.screen.playerY;
            console.log(`Turn ${turnCount}: pos=(${px},${py}), explored=${level.exploredCount}, action=${info.action?.type}, reason=${info.action?.reason?.substring(0, 50)}`);
        }
    };

    await agent.run();
    await adapter.stop();

    const level = agent.dungeon.currentLevel;
    const px = agent.screen.playerX;
    const py = agent.screen.playerY;
    const MAP_COLS = 80;
    const MAP_ROWS = 21;
    const totalCells = MAP_COLS * MAP_ROWS;

    console.log(`\n=== Map Coverage ===`);
    console.log(`Total cells: ${totalCells}`);
    console.log(`Explored: ${level.exploredCount} (${((level.exploredCount/totalCells)*100).toFixed(1)}%)`);
    console.log(`Downstairs found: ${level.stairsDown.length > 0 ? 'YES at ' + JSON.stringify(level.stairsDown[0]) : 'NO'}`);

    const frontier = level.getExplorationFrontier();
    console.log(`\nFrontier cells: ${frontier.length}`);

    // Check if frontier cells are reachable
    let reachable = 0;
    let blocked = 0;
    const sampleSize = Math.min(10, frontier.length);
    if (frontier.length > 0) {
        console.log(`\nTesting first ${sampleSize} frontier cells for reachability:`);
        for (let i = 0; i < sampleSize; i++) {
            const target = frontier[i];
            const path = findPath(level, px, py, target.x, target.y, { allowUnexplored: false });
            if (path.found) {
                reachable++;
                console.log(`  (${target.x},${target.y}): REACHABLE (cost ${Math.round(path.cost)})`);
            } else {
                blocked++;
                console.log(`  (${target.x},${target.y}): BLOCKED`);
            }
        }
        console.log(`\nSummary: ${reachable}/${sampleSize} frontier cells reachable`);
    }

    // Count walkable unexplored cells (potential area to explore)
    let walkableUnexplored = 0;
    let wallsUnexplored = 0;
    for (let y = 0; y < MAP_ROWS; y++) {
        for (let x = 0; x < MAP_COLS; x++) {
            const cell = level.cells[y][x];
            if (!cell.explored) {
                if (cell.walkable) {
                    walkableUnexplored++;
                } else {
                    wallsUnexplored++;
                }
            }
        }
    }

    console.log(`\n=== Unexplored Area ===`);
    console.log(`Walkable unexplored: ${walkableUnexplored}`);
    console.log(`Walls unexplored: ${wallsUnexplored}`);
    console.log(`Total unexplored: ${walkableUnexplored + wallsUnexplored}`);

    // Check for likely secret door locations
    const secretCandidates = level.getSecretDoorCandidates(px, py);
    console.log(`\n=== Secret Door Analysis ===`);
    console.log(`Secret door candidates: ${secretCandidates.length}`);
    if (secretCandidates.length > 0 && secretCandidates.length <= 10) {
        for (const cand of secretCandidates) {
            const cell = level.at(cand.x, cand.y);
            console.log(`  (${cand.x},${cand.y}): searched ${cell?.searchCount || 0} times`);
        }
    }

    // Print a simple map visualization showing explored vs unexplored
    console.log(`\n=== Map Visualization (@ = player, # = wall, . = explored, ? = unexplored) ===`);
    for (let y = 0; y < MAP_ROWS; y++) {
        let row = '';
        for (let x = 0; x < MAP_COLS; x++) {
            if (x === px && y === py) {
                row += '@';
            } else {
                const cell = level.cells[y][x];
                if (!cell.explored) {
                    row += '?';
                } else if (!cell.walkable) {
                    row += '#';
                } else if (cell.type === 'stairs_down') {
                    row += '>';
                } else {
                    row += '.';
                }
            }
        }
        console.log(row);
    }
}

async function main() {
    await diagnoseExploration(44444, 500);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
