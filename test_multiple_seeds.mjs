#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const SEEDS = [11111, 22222, 33333, 44444, 55555];
    
    console.log('=== Testing Current Agent (500 turns each) ===\n');
    
    for (const seed of SEEDS) {
        const result = await runHeadless({
            seed,
            roleIndex: 12,
            maxTurns: 500,
            debug: false
        });
        
        const s = result.stats;
        const a = result.agent;
        const explored = a.dungeon.currentLevel.exploredCount;
        
        const currentDlvl = a.status?.dungeonLevel || 1;
        console.log(`Seed ${seed}: maxDepth=${s.maxDepth}, currentDlvl=${currentDlvl}, HP=${a.status.hp}/${a.status.hpmax}, explored=${explored}, died=${s.died || false}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
