#!/usr/bin/env node
// Record the Fortran session for speedrun-1-endgame with --More-- pagination handling.
// The Fortran NIRVA room (endgame completion) requires 2 Enter keypresses for --More-- prompts.
// This script adds 2 blank lines to the input, records the full session,
// then post-processes to merge the --More-- pages into a single step and
// strip --More-- markers so the output matches the JS engine.
import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fortranDir = join(__dirname, '..', 'fortran-src');
const binary = join(fortranDir, 'dungeon');
const inputFile = join(__dirname, 'sessions/speedrun-1-endgame.input');

const inputText = readFileSync(inputFile, 'utf8');
const inputLines = inputText.trim().split('\n');

// Add 2 blank lines for the --More-- Enter prompts in NIRVA
const inputWithBlanks = inputText.trimEnd() + '\n\n\n';

const env = { ...process.env, DUNGEON_SEED: '1' };

const result = spawnSync('./dungeon', [], {
    cwd: fortranDir,
    input: inputWithBlanks,
    encoding: 'utf8',
    timeout: 120000,
    env,
    stdio: ['pipe', 'pipe', 'ignore'],
});

const rawOutput = result.stdout || '';
if (result.error) {
    console.error('spawn error:', result.error.message);
    process.exit(1);
}

// Parse output using same logic as record-fortran-session.mjs
// Input lines include the 2 extra blank lines
const allInputLines = [...inputLines, '', ''];
const outputLines = rawOutput.split('\n');
const steps = [];
let currentOutput = [];
let moveNum = 0;
let inputIdx = 0;

for (const line of outputLines) {
    const after3 = line.startsWith(' > ') ? line.substring(3) : null;
    const isPrompt = line === ' >' ||
        (after3 !== null && (after3.trimEnd() === '' || after3[0] !== ' '));
    if (isPrompt) {
        if (currentOutput.length > 0 || moveNum > 0) {
            steps.push({
                move: moveNum,
                input: inputIdx > 0 ? allInputLines[inputIdx - 1] || '' : '',
                parse: {},
                state: {},
                output: [...currentOutput],
            });
            currentOutput = [];
        }
        moveNum++;
        inputIdx++;
        const after = line.substring(3).trimEnd();
        if (after) currentOutput.push(' ' + after);
    } else {
        const nextInput = allInputLines[inputIdx] || '';
        if (nextInput && line === ' ' + nextInput.toUpperCase()) {
            if (currentOutput.length > 0 || moveNum > 0) {
                steps.push({
                    move: moveNum,
                    input: inputIdx > 0 ? allInputLines[inputIdx - 1] || '' : '',
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

if (currentOutput.length > 0) {
    steps.push({
        move: moveNum,
        input: inputIdx > 0 ? allInputLines[inputIdx - 1] || '' : '',
        parse: {},
        state: {},
        output: [...currentOutput],
    });
}

// Post-process: find and merge --More-- steps.
// The NIRVA room produces:
//   Step A (input='go north'): [NIRVA lines 1..N, '--More--', '']
//   Step B (input=''): [continuation lines..., '--More--', '']
//   Step C (input=''): [score line, rank line]
// We want to merge A+B+C into one step (input='go north') and strip --More--.

const processedSteps = [];
let i = 0;
while (i < steps.length) {
    const s = steps[i];
    // Check if this step's output ends with ' --More--'
    const outClean = s.output.filter(l => l.trimEnd() !== '');
    const hasMore = outClean.length > 0 && outClean[outClean.length - 1].trimEnd() === ' --More--';
    if (hasMore) {
        // Merge with following steps until no more --More--
        let mergedOutput = s.output
            .filter(l => l.trimEnd() !== ' --More--' && l.trimEnd() !== '');
        i++;
        while (i < steps.length) {
            const next = steps[i];
            const nextClean = next.output.filter(l => l.trimEnd() !== '');
            const nextHasMore = nextClean.length > 0 &&
                nextClean[nextClean.length - 1].trimEnd() === ' --More--';
            mergedOutput = mergedOutput.concat(
                next.output.filter(l => l.trimEnd() !== ' --More--' && l.trimEnd() !== '')
            );
            i++;
            if (!nextHasMore) break;
        }
        processedSteps.push({
            move: s.move,
            input: s.input,
            parse: {},
            state: {},
            output: mergedOutput,
        });
    } else {
        processedSteps.push(s);
        i++;
    }
}

// Filter to non-empty input steps (matching checkSession behavior)
// Keep all steps, just report count
const nonEmpty = processedSteps.filter(s => (s.input || '') !== '');
console.error(`Total steps: ${processedSteps.length}, non-empty: ${nonEmpty.length}`);

// Check last few steps
console.error('Last 3 steps:');
for (const s of nonEmpty.slice(-3)) {
    console.error(`  input=${JSON.stringify(s.input)} output_lines=${s.output.length}`);
    s.output.slice(-3).forEach(l => console.error(`    ${JSON.stringify(l)}`));
}

const session = {
    format: 'zork-parity-v1',
    source: 'fortran',
    seed: 1,
    timestamp: new Date().toISOString(),
    steps: processedSteps,
};

const outputPath = join(__dirname, 'sessions/speedrun-1-endgame.fortran.json');
writeFileSync(outputPath, JSON.stringify(session, null, 2));
console.error(`Written to ${outputPath}`);
