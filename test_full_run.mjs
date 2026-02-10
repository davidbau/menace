#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    console.log('=== Full Run Test (500 turns) ===\n');
    
    const SEEDS = [11111, 22222, 33333];
    
    for (const seed of SEEDS) {
        const result = await runHeadless({
            seed,
            roleIndex: 12,
            maxTurns: 500,
            debug: false
        });
        
        const s = result.stats;
        const a = result.agent;
        console.log(`Seed ${seed}: Dlvl ${s.maxDepth}, ${s.turns} turns, HP=${a.status.hp}/${a.status.hpmax}, died=${s.died || false}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
