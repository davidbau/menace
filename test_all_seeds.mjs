#!/usr/bin/env node
/**
 * Test all seeds to see which ones are actually stuck
 */

import { runHeadless } from './selfplay/runner/headless_runner.js';

const SEEDS = [11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888];
const MAX_TURNS = 500;  // Reduced to speed up testing

console.log(`Testing ${SEEDS.length} seeds with ${MAX_TURNS} max turns...\\n`);

const results = [];

for (const seed of SEEDS) {
    try {
        const result = await runHeadless({
            seed,
            maxTurns: MAX_TURNS,
            roleIndex: 12, // Wizard
            verbose: false,
            dumpMaps: false,
        });

        results.push({
            seed,
            turns: result.stats.turns,
            maxDepth: result.stats.maxDepth,
            died: result.stats.died,
            cause: result.stats.deathCause || 'survived'
        });

        console.log(`Seed ${seed}: maxDepth=${result.stats.maxDepth}, turns=${result.stats.turns}, ${result.stats.died ? 'DIED' : 'survived'}`);
    } catch (error) {
        console.error(`Seed ${seed}: ERROR - ${error.message}`);
        results.push({
            seed,
            error: error.message
        });
    }
}

console.log(`\\n=== Summary ===`);
const dlvl2Plus = results.filter(r => !r.error && r.maxDepth >= 2).length;
console.log(`Seeds reaching Dlvl 2+: ${dlvl2Plus}/${SEEDS.length}`);

console.log(`\\nDetailed results:`);
for (const r of results) {
    if (r.error) {
        console.log(`  ${r.seed}: ERROR - ${r.error}`);
    } else {
        console.log(`  ${r.seed}: Dlvl ${r.maxDepth}, ${r.turns} turns, ${r.cause}`);
    }
}
