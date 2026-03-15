#!/usr/bin/env node
// Record a Zork parity session from the Fortran reference binary.
// Usage: node record-fortran-session.mjs [--seed=N] <input-file>
//
// Runs the Fortran dungeon binary with the given input, captures output,
// and produces a session file matching the zork-parity-v1 format.
// Parse fields are left empty (Fortran doesn't expose them without instrumentation).

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fortranDir = join(__dirname, '..', 'fortran-src');
const binary = join(fortranDir, 'dungeon');

// Parse arguments
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const inputFile = args[0];
if (!inputFile) {
    console.error('Usage: node record-fortran-session.mjs [--seed=N] <input-file>');
    process.exit(1);
}
const inputText = readFileSync(inputFile, 'utf8');
const inputLines = inputText.trim().split('\n');

// Build environment with optional seed
const env = { ...process.env };
const seedFlag = flags.find(f => f.startsWith('--seed='));
if (seedFlag) env.DUNGEON_SEED = seedFlag.split('=')[1];

// Run Fortran binary via spawnSync with stdin pipe (not echo).
// stderr is ignored — our Fortran trace patches write to stderr,
// which can produce >1MB of output and deadlock the pipe buffer.
const result = spawnSync('./dungeon', [], {
    cwd: fortranDir,
    input: inputText,
    encoding: 'utf8',
    timeout: 120000,
    env,
    stdio: ['pipe', 'pipe', 'ignore'], // ignore stderr to avoid buffer deadlock
});

const rawOutput = result.stdout || '';
if (result.error) {
    console.error('spawn error:', result.error.message);
}

// Parse output into steps: split on " > " prompt markers.
// The Fortran binary prints " > " at the start of a line as the command prompt.
// Format: " > Text..." where "> " starts at column 1-2.
const outputLines = rawOutput.split('\n');
const steps = [];
let currentOutput = [];
let moveNum = 0;
let inputIdx = 0;

for (const line of outputLines) {
    // Detect prompt: line starts with " > " (space-gt-space at beginning)
    if (line.startsWith(' > ') || line === ' >') {
        // Save previous step
        if (currentOutput.length > 0 || moveNum > 0) {
            steps.push({
                move: moveNum,
                input: inputIdx > 0 ? inputLines[inputIdx - 1] || '' : '',
                parse: {},
                state: {},
                output: [...currentOutput],
            });
            currentOutput = [];
        }
        moveNum++;
        inputIdx++;
        // Text after " > " is the start of next output
        const after = line.substring(3).trimEnd();
        if (after) currentOutput.push(' ' + after);
    } else {
        currentOutput.push(line);
    }
}

// Final output after last prompt
if (currentOutput.length > 0) {
    steps.push({
        move: moveNum,
        input: inputIdx > 0 ? inputLines[inputIdx - 1] || '' : '',
        parse: {},
        state: {},
        output: [...currentOutput],
    });
}

const session = {
    format: 'zork-parity-v1',
    source: 'fortran',
    timestamp: new Date().toISOString(),
    steps,
};

console.log(JSON.stringify(session, null, 2));
