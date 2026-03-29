#!/usr/bin/env node
// Compare C adventure output with JS adventure output for parity testing.
// Usage: node adventure/test/compare-parity.mjs <input-file> <c-output-file>

import { readFileSync } from 'fs';
import { AdventureGame } from '../js/advent.js';

const inputFile = process.argv[2];
const cOutputFile = process.argv[3];

if (!inputFile || !cOutputFile) {
    console.error('Usage: node compare-parity.mjs <input-file> <c-output-file>');
    process.exit(1);
}

const inputs = readFileSync(inputFile, 'utf8').trim().split('\n');
const cOutput = readFileSync(cOutputFile, 'utf8');
const cLines = cOutput.split('\n');

// Parse optional --seed flag
const seedIdx = process.argv.indexOf('--seed');
const seed = seedIdx >= 0 ? parseInt(process.argv[seedIdx + 1]) : null;

// Run JS version with same inputs
const game = new AdventureGame();
if (seed != null) game.setSeed(seed);

const jsLines = [];
let inputIdx = 0;

try {
    await game.run(
        async () => {
            if (inputIdx >= inputs.length) throw new Error('END_OF_INPUT');
            return inputs[inputIdx++];
        },
        (line) => {
            jsLines.push(line);
        }
    );
} catch (e) {
    if (e.message !== 'END_OF_INPUT') {
        console.error('JS game error:', e.message);
    }
}

// Compare line by line
// Normalize: trim trailing spaces, collapse multiple blank lines
function normalize(lines) {
    let result = lines
        .map(l => l.trimEnd())
        .filter((l, i, arr) => !(l === '' && i > 0 && arr[i-1] === ''));
    // Trim trailing empty lines
    while (result.length > 0 && result[result.length - 1] === '') result.pop();
    return result;
}

const normC = normalize(cLines);
const normJS = normalize(jsLines);

let firstDiff = -1;
const maxLines = Math.max(normC.length, normJS.length);
let matched = 0;

for (let i = 0; i < maxLines; i++) {
    const c = normC[i] ?? '(end)';
    const j = normJS[i] ?? '(end)';
    if (c === j) {
        matched++;
    } else if (firstDiff < 0) {
        firstDiff = i;
    }
}

console.log(`Parity: ${matched}/${maxLines} lines match`);
if (firstDiff >= 0) {
    console.log(`First divergence at line ${firstDiff}:`);
    const ctx = 3;
    for (let i = Math.max(0, firstDiff - ctx); i <= Math.min(maxLines - 1, firstDiff + ctx); i++) {
        const c = normC[i] ?? '(end)';
        const j = normJS[i] ?? '(end)';
        const mark = c === j ? '  ' : '>>';
        console.log(`${mark} [${i}] C: ${JSON.stringify(c)}`);
        if (c !== j)
            console.log(`${mark} [${i}] J: ${JSON.stringify(j)}`);
    }
} else {
    console.log('PASS — all lines match!');
}
