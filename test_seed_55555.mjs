#!/usr/bin/env node

import { runHeadless } from './selfplay/runner/headless_runner.js';

console.log('Testing seed 55555...');

try {
    const result = await runHeadless({
        seed: 55555,
        maxTurns: 500,
        roleIndex: 12,
        verbose: true,
        dumpMaps: false,
    });

    console.log('\\n=== Result ===');
    console.log(`Max depth: ${result.stats.maxDepth}`);
    console.log(`Turns: ${result.stats.turns}`);
    console.log(`Died: ${result.stats.died}`);
} catch (error) {
    console.error('ERROR:', error);
    console.error(error.stack);
    process.exit(1);
}
