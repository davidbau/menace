#!/usr/bin/env node
// test/comparison/analyze_golden.js -- Quick analysis of C-vs-JS golden comparison
//
// Compares JS-generated typGrids against all C golden session files and prints
// a summary report without the test framework. Useful for quick iteration.
//
// Usage:
//   node test/comparison/analyze_golden.js [--depth-1-only] [--verbose]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    generateMapsSequential, compareGrids, typName,
} from './session_helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MAPS_DIR = join(__dirname, 'maps');

const depth1Only = process.argv.includes('--depth-1-only');
const verbose = process.argv.includes('--verbose');

// Discover golden files
const goldenFiles = existsSync(MAPS_DIR)
    ? readdirSync(MAPS_DIR)
        .filter(f => f.endsWith('_c_golden.session.json'))
        .sort((a, b) => {
            const seedA = parseInt(a.match(/seed(\d+)/)?.[1] || '0');
            const seedB = parseInt(b.match(/seed(\d+)/)?.[1] || '0');
            return seedA - seedB;
        })
    : [];

if (goldenFiles.length === 0) {
    console.log('No *_c_golden.session.json files found in test/comparison/maps/');
    console.log('Generate them with: python3 test/comparison/c-harness/gen_map_sessions.py --c-golden');
    process.exit(1);
}

console.log(`Analyzing ${goldenFiles.length} C golden sessions${depth1Only ? ' (depth 1 only)' : ''}...\n`);

// Summary tracking
let total = 0, pass = 0, fail = 0;
const failuresByDepth = {};
const depth1Failures = [];
const terrainDiffTypes = {};
const seedResults = [];  // { seed, depth1: 'PASS'|'FAIL(n)', depth2Plus: 'PASS'|'FAIL(n)' }

for (const file of goldenFiles) {
    const session = JSON.parse(readFileSync(join(MAPS_DIR, file), 'utf-8'));
    const seed = session.seed;
    const maxDepth = depth1Only ? 1 : Math.max(...session.levels.map(l => l.depth));
    const levels = depth1Only ? session.levels.filter(l => l.depth === 1) : session.levels;

    const result = generateMapsSequential(seed, maxDepth);
    const seedResult = { seed, depth1: null, depth2PlusFails: 0, depth2PlusTotal: 0 };

    for (const level of levels) {
        const depth = level.depth;
        const jsGrid = result.grids[depth];
        if (!jsGrid) continue;

        const diffs = compareGrids(jsGrid, level.typGrid);
        total++;

        if (diffs.length === 0) {
            pass++;
            if (depth === 1) seedResult.depth1 = 'PASS';
            if (depth > 1) seedResult.depth2PlusTotal++;
        } else {
            fail++;
            failuresByDepth[depth] = (failuresByDepth[depth] || 0) + 1;
            if (depth === 1) {
                seedResult.depth1 = `FAIL(${diffs.length})`;
                depth1Failures.push({ seed, diffCount: diffs.length, diffs });
            }
            if (depth > 1) {
                seedResult.depth2PlusFails++;
                seedResult.depth2PlusTotal++;
            }
            for (const d of diffs) {
                const key = `${d.aName}→${d.bName}`;
                terrainDiffTypes[key] = (terrainDiffTypes[key] || 0) + 1;
            }
        }
    }

    seedResults.push(seedResult);

    // Brief per-seed status
    const d1 = seedResult.depth1 || 'N/A';
    const d2 = depth1Only ? '' : ` | depth 2+: ${seedResult.depth2PlusFails}/${seedResult.depth2PlusTotal + (seedResult.depth2PlusFails ? 0 : 0)} fail`;
    if (verbose || d1.startsWith('FAIL')) {
        console.log(`  seed ${String(seed).padStart(5)}: depth 1 ${d1}${d2}`);
    }
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`C-vs-JS Golden Comparison Summary`);
console.log(`${'='.repeat(50)}`);
console.log(`Seeds:  ${goldenFiles.length}`);
console.log(`Total:  ${total} seed×depth pairs`);
console.log(`Pass:   ${pass} (${(100 * pass / Math.max(total, 1)).toFixed(1)}%)`);
console.log(`Fail:   ${fail} (${(100 * fail / Math.max(total, 1)).toFixed(1)}%)`);

// Depth 1 analysis
const depth1Pass = seedResults.filter(s => s.depth1 === 'PASS').length;
const depth1Tested = seedResults.filter(s => s.depth1).length;
console.log(`\nDepth 1: ${depth1Pass}/${depth1Tested} pass (${(100 * depth1Pass / Math.max(depth1Tested, 1)).toFixed(1)}%)`);
if (depth1Failures.length > 0) {
    console.log(`  Failing seeds: ${depth1Failures.map(f => `${f.seed}(${f.diffCount} diffs)`).join(', ')}`);
    // Show sample diffs from first few failures
    for (const f of depth1Failures.slice(0, 3)) {
        console.log(`  seed ${f.seed}: ${f.diffs.slice(0, 5).map(d =>
            `(${d.x},${d.y}):JS=${d.aName}/C=${d.bName}`).join(', ')}${f.diffs.length > 5 ? '...' : ''}`);
    }
}

// Depth breakdown (non-depth-1-only mode)
if (!depth1Only) {
    console.log(`\nFailures by depth:`);
    const depths = Object.keys(failuresByDepth).map(Number).sort((a, b) => a - b);
    for (const d of depths) {
        console.log(`  depth ${String(d).padStart(2)}: ${failuresByDepth[d]}/${goldenFiles.length} seeds fail`);
    }
}

// Terrain diff types
const diffEntries = Object.entries(terrainDiffTypes).sort((a, b) => b[1] - a[1]);
if (diffEntries.length > 0) {
    console.log(`\nTop terrain type mismatches (JS→C):`);
    for (const [key, count] of diffEntries.slice(0, 15)) {
        console.log(`  ${key}: ${count}`);
    }
}
