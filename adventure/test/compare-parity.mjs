#!/usr/bin/env node
// Compare C adventure output with JS adventure output for parity testing.
// Supports multi-session: #SAVE saves JS state, #RESTORE restores it.
// For C, these directives are stripped (C runs as one continuous game).
//
// Usage: node compare-parity.mjs <input-file> <c-output-file> [--seed N]

import { readFileSync } from 'fs';
import { AdventureGame } from '../js/advent.js';

const inputFile = process.argv[2];
const cOutputFile = process.argv[3];

if (!inputFile || !cOutputFile) {
    console.error('Usage: node compare-parity.mjs <input-file> <c-output-file> [--seed N]');
    process.exit(1);
}

const rawInputs = readFileSync(inputFile, 'utf8').trim().split('\n');
const cOutput = readFileSync(cOutputFile, 'utf8');
const cLines = cOutput.split('\n');

const seedIdx = process.argv.indexOf('--seed');
const seed = seedIdx >= 0 ? parseInt(process.argv[seedIdx + 1]) : null;

// Parse inputs: #SAVE and #RESTORE are directives, not game commands
const inputs = [];
const directives = new Map(); // index -> 'save' | 'restore'
for (const line of rawInputs) {
    const trimmed = line.trim();
    if (trimmed === '#SAVE') {
        directives.set(inputs.length, 'save');
    } else if (trimmed === '#RESTORE') {
        directives.set(inputs.length, 'restore');
    } else {
        inputs.push(trimmed);
    }
}

// Run JS version with same inputs, handling save/restore
const game = new AdventureGame();
if (seed != null) game.setSeed(seed);

let savedState = null;
const jsLines = [];
let inputIdx = 0;

try {
    await game.run(
        async () => {
            // Check for directives at current input position
            while (directives.has(inputIdx)) {
                const dir = directives.get(inputIdx);
                directives.delete(inputIdx);
                if (dir === 'save') {
                    savedState = game.getSaveState();
                } else if (dir === 'restore' && savedState) {
                    game.setSaveState(savedState);
                }
            }
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
function normalize(lines) {
    let result = lines
        .map(l => l.trimEnd())
        .filter((l, i, arr) => !(l === '' && i > 0 && arr[i-1] === ''));
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
