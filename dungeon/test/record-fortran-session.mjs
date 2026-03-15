#!/usr/bin/env node
// Record a Zork parity session from the Fortran reference binary.
// Usage: node record-fortran-session.mjs sessions/opening.input > fortran-session.json
//
// Runs the Fortran dungeon binary with the given input, captures output,
// and produces a session file matching the zork-parity-v1 format.
// Parse fields are left empty (Fortran doesn't expose them without instrumentation).

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fortranDir = join(__dirname, '..', 'fortran-src');
const binary = join(fortranDir, 'dungeon');

// Read input
const inputFile = process.argv[2];
if (!inputFile) {
    console.error('Usage: node record-fortran-session.mjs <input-file>');
    process.exit(1);
}
const inputText = readFileSync(inputFile, 'utf8');
const inputLines = inputText.trim().split('\n');

// Run Fortran binary
let rawOutput;
try {
    rawOutput = execSync(`cd "${fortranDir}" && echo "${inputText.replace(/"/g, '\\"')}" | ./dungeon`, {
        encoding: 'utf8',
        timeout: 30000,
    });
} catch (e) {
    rawOutput = e.stdout || '';
}

// Parse output into steps: split on " > " prompt markers
// The Fortran binary prints " > " at the start of a line as the command prompt.
const outputLines = rawOutput.split('\n');
const steps = [];
let currentOutput = [];
let moveNum = 0;
let inputIdx = 0;

for (const line of outputLines) {
    // Check if line contains " > " prompt (Fortran format: " > rest of output")
    const promptIdx = line.indexOf(' > ');
    if (promptIdx >= 0 && line.trim().startsWith('>')) {
        // This line IS the prompt, possibly with output after it
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
        // If there's text after " > ", it's the start of next output
        const after = line.substring(promptIdx + 3).trimEnd();
        if (after) currentOutput.push(' ' + after);
    } else if (line.trim() === '>') {
        // Bare prompt on its own line
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
