#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    let actionCounts = {};
    let turnsSample = [];
    
    const result = await runHeadless({
        seed: 11111,
        roleIndex: 12,
        maxTurns: 100,
        debug: false,
        onTurn: (info) => {
            // Count action types
            if (info.action && info.action.type) {
                actionCounts[info.action.type] = (actionCounts[info.action.type] || 0) + 1;
            }
            
            // Sample every 20 turns
            if (info.turn % 20 === 0) {
                turnsSample.push({
                    turn: info.turn,
                    action: info.action?.type,
                    hp: info.hp,
                    dlvl: info.dlvl,
                    pos: info.position
                });
            }
        }
    });
    
    console.log('\n=== Action Distribution (100 turns) ===');
    const sorted = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);
    for (const [action, count] of sorted) {
        const pct = ((count / 100) * 100).toFixed(1);
        console.log(`${action.padEnd(20)} ${count.toString().padStart(3)} (${pct}%)`);
    }
    
    console.log('\n=== Sample Turns ===');
    for (const sample of turnsSample) {
        console.log(`Turn ${sample.turn}: ${sample.action} at (${sample.pos?.x},${sample.pos?.y}) Dlvl=${sample.dlvl} HP=${sample.hp}`);
    }
    
    console.log(`\n=== Final State ===`);
    console.log(`Depth: ${result.stats.maxDepth}`);
    console.log(`HP: ${result.agent.status.hp}/${result.agent.status.hpmax}`);
    console.log(`Explored cells: ${result.agent.dungeon.currentLevel.exploredCount}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
