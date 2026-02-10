#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    console.log('=== Agent Performance Test (2000 turns) ===\n');

    const SEEDS = [11111, 22222, 33333];

    for (const seed of SEEDS) {
        console.log(`Testing seed ${seed}...`);
        const result = await runHeadless({
            seed,
            roleIndex: 12,
            maxTurns: 2000,
            debug: false,
        });

        const s = result.stats;
        const a = result.agent;
        const currentDlvl = a.status?.dungeonLevel || 1;
        const explored = a.dungeon.currentLevel.exploredCount;

        console.log(`  Max depth: ${s.maxDepth}, Current: Dlvl ${currentDlvl}`);
        console.log(`  HP: ${a.status.hp}/${a.status.hpmax}, Turns: ${s.turns}, Died: ${s.died}`);
        console.log(`  Explored on current level: ${explored} cells\n`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
