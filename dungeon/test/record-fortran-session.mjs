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
    // Detect prompt: line starts with " > " (space-gt-space at beginning).
    // ASCII art lines can also start with " > " when art data begins with ">",
    // because Fortran FORMAT(1X, A76) prepends one space, turning "> art..." into
    // " > art...". A real prompt always looks like " >" (no newline) followed by
    // a response line starting with " " (FORMAT 1X), giving " > RESPONSE_TEXT".
    // Art border ">" lines look like " >" + " " + more_spaces + art_content.
    // Distinguish them: if everything after " > " is whitespace, it's a prompt
    // (blank response); if the content after " > " starts with " " but has
    // non-whitespace later, it's art. Otherwise (non-space at position 3, or tab)
    // it's a normal prompt with a text response.
    const after3 = line.startsWith(' > ') ? line.substring(3) : null;
    const isPrompt = line === ' >' ||
        (after3 !== null && (after3.trimEnd() === '' || after3[0] !== ' '));
    if (isPrompt) {
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
        // Text after " > " is the start of next output (normally empty since the
        // input has been consumed, but kept for safety)
        const after = line.substring(3).trimEnd();
        if (after) currentOutput.push(' ' + after);
    } else {
        // Echo room: Fortran reads inputs without ' > ' prompts but the game output
        // still echoes each input as ' INPUTCMD' (FORMAT 1X,A).  When we detect a
        // line that exactly matches ' ' + inputLines[inputIdx].toUpperCase() we inject
        // a synthetic step boundary so the session lines up with the JS recorder.
        const nextInput = inputLines[inputIdx] || '';
        if (nextInput && line === ' ' + nextInput.toUpperCase()) {
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
        }
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
