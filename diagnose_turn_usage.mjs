#!/usr/bin/env node
// Diagnose how agent spends its turns

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';

async function diagnoseTurnUsage(seed, maxTurns = 500) {
    console.log(`\n=== Turn Usage Breakdown: Seed ${seed} ===\n`);

    const adapter = new TmuxAdapter({ seed, roleIndex: 12, keyDelay: 50 });
    await adapter.start();

    const turnStats = {
        explore: 0,
        attack: 0,
        flee: 0,
        wait: 0,
        rest: 0,
        search: 0,
        pickup: 0,
        eat: 0,
        other: 0,
    };
    const otherActions = {}; // Track what "other" actions are

    const agent = new Agent(adapter, { maxTurns });

    agent.onTurn = (info) => {
        const actionType = info.action?.type;
        if (actionType) {
            if (actionType === 'rest' || actionType === 'wait') {
                turnStats.rest++;
            } else if (turnStats.hasOwnProperty(actionType)) {
                turnStats[actionType]++;
            } else {
                turnStats.other++;
                otherActions[actionType] = (otherActions[actionType] || 0) + 1;
            }
        }
    };

    await agent.run();
    await adapter.stop();

    const level = agent.dungeon.currentLevel;
    const total = Object.values(turnStats).reduce((a, b) => a + b, 0);

    console.log('Turn distribution:');
    for (const [action, count] of Object.entries(turnStats).sort((a, b) => b[1] - a[1])) {
        const pct = ((count / total) * 100).toFixed(1);
        console.log(`  ${action.padEnd(10)} ${count.toString().padStart(4)} (${pct}%)`);
    }

    console.log(`\nTotal turns: ${total}`);
    console.log(`Explored: ${level.exploredCount} cells`);
    console.log(`Downstairs found: ${level.stairsDown.length > 0 ? 'YES' : 'NO'}`);

    if (Object.keys(otherActions).length > 0) {
        console.log(`\nOther actions breakdown:`);
        for (const [action, count] of Object.entries(otherActions).sort((a, b) => b[1] - a[1])) {
            console.log(`  ${action}: ${count}`);
        }
    }

    // Calculate efficiency
    const productiveTurns = turnStats.explore + turnStats.attack + turnStats.search;
    const wastedTurns = turnStats.rest + turnStats.wait;
    console.log(`\nEfficiency:`);
    console.log(`  Productive (explore/attack/search): ${productiveTurns} (${((productiveTurns/total)*100).toFixed(1)}%)`);
    console.log(`  Wasted (rest/wait): ${wastedTurns} (${((wastedTurns/total)*100).toFixed(1)}%)`);
}

async function main() {
    await diagnoseTurnUsage(44444, 500);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
