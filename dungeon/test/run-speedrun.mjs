#!/usr/bin/env node
// Run the speedrun.json walkthrough against Fortran or JS and validate expectations.
// Usage: node run-speedrun.mjs [--fortran] [--stop-on-error]
//
// Reads speedrun.json, sends commands, checks expected keywords in output.
// Reports pass/fail for each step.

import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const speedrun = JSON.parse(readFileSync(join(__dirname, 'sessions', 'speedrun.json'), 'utf8'));
const steps = speedrun.steps;
const seed = speedrun.seed || 42;

const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const useFortran = flags.includes('--fortran');
const stopOnError = flags.includes('--stop-on-error');

// Extract just the commands
const cmds = steps.map(s => s.cmd);

if (useFortran) {
    // Run all commands through Fortran, then match output to steps
    const fortranDir = join(__dirname, '..', 'fortran-src');
    const result = spawnSync('./dungeon', [], {
        cwd: fortranDir,
        input: cmds.join('\n') + '\n',
        encoding: 'utf8',
        timeout: 120000,
        env: { ...process.env, DUNGEON_SEED: String(seed) },
        stdio: ['pipe', 'pipe', 'ignore'],
    });

    const rawOutput = result.stdout || '';
    // Split output into per-step chunks by prompt " > "
    const chunks = [];
    let current = [];
    for (const line of rawOutput.split('\n')) {
        if (line.startsWith(' > ') || line === ' >') {
            chunks.push(current);
            current = [];
            const after = line.substring(3).trimEnd();
            if (after) current.push(' ' + after);
        } else {
            current.push(line);
        }
    }
    if (current.length) chunks.push(current);

    // chunks[0] = welcome text (before first prompt)
    // chunks[i+1] = output after step i
    let passed = 0, failed = 0;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const output = (chunks[i + 1] || []).join('\n');
        const outputLower = output.toLowerCase();

        let ok = true;
        let failReasons = [];
        for (const kw of (step.expect || [])) {
            if (!outputLower.includes(kw.toLowerCase())) {
                ok = false;
                failReasons.push(`missing "${kw}"`);
            }
        }
        // Check for error indicators
        if (outputLower.includes("can't see any") && !step.expectFail) {
            ok = false;
            failReasons.push("can't see any");
        }
        if (outputLower.includes("don't understand") && !step.expectFail) {
            ok = false;
            failReasons.push("don't understand");
        }

        if (ok) {
            passed++;
        } else {
            failed++;
            const orig = step.orig ? ` (orig: "${step.orig}")` : '';
            console.log(`FAIL step ${i + 1}: "${step.cmd}"${orig}`);
            for (const r of failReasons) console.log(`  ${r}`);
            console.log(`  output: ${output.trim().substring(0, 100)}`);
            if (stopOnError) {
                console.log(`\nStopped at step ${i + 1}. ${passed} passed, ${failed} failed.`);
                process.exit(1);
            }
        }
    }
    console.log(`\n${passed} passed, ${failed} failed out of ${steps.length} steps.`);

} else {
    // Run via JS engine
    const { DungeonGame } = await import(join(__dirname, '..', 'js', 'game.js'));
    const data = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-data.json')));
    const text = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-text.json')));

    const game = new DungeonGame();
    game.init(data, text);
    game._rngSeed = seed;

    let cmdIdx = 0;
    let currentOutput = [];
    let stepOutputs = [];
    let stopped = false;

    await game.run(async () => {
        if (cmdIdx > 0) stepOutputs.push([...currentOutput]);
        currentOutput = [];
        if (cmdIdx >= cmds.length || stopped) { game.gameOver = true; return null; }
        return cmds[cmdIdx++];
    }, (text) => {
        currentOutput.push(text || '');
    }).catch(() => {});
    if (currentOutput.length) stepOutputs.push([...currentOutput]);

    let passed = 0, failed = 0;
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const output = (stepOutputs[i] || []).join('\n');
        const outputLower = output.toLowerCase();

        let ok = true;
        let failReasons = [];
        for (const kw of (step.expect || [])) {
            if (!outputLower.includes(kw.toLowerCase())) {
                ok = false;
                failReasons.push(`missing "${kw}"`);
            }
        }
        if (outputLower.includes("can't see any") && !step.expectFail) {
            ok = false;
            failReasons.push("can't see any");
        }
        if (outputLower.includes("don't understand") && !step.expectFail) {
            ok = false;
            failReasons.push("don't understand");
        }

        if (ok) {
            passed++;
        } else {
            failed++;
            const orig = step.orig ? ` (orig: "${step.orig}")` : '';
            console.log(`FAIL step ${i + 1}: "${step.cmd}"${orig}`);
            for (const r of failReasons) console.log(`  ${r}`);
            console.log(`  output: ${output.trim().substring(0, 100)}`);
            if (stopOnError) {
                console.log(`\nStopped at step ${i + 1}. ${passed} passed, ${failed} failed.`);
                process.exit(1);
            }
        }
    }
    console.log(`\n${passed} passed, ${failed} failed out of ${steps.length} steps.`);
}
