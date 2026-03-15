#!/usr/bin/env node
// Validate a dungeon session by running it and flagging issues.
// Usage: node validate-session.mjs [--seed=N] [--stop-on-error] <input-file>
//
// Reports: grue deaths, parser errors, "can't see" failures, deaths.
// With --stop-on-error, stops at the first problem.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const inputFile = args[0];
if (!inputFile) {
    console.error('Usage: node validate-session.mjs [--seed=N] [--stop-on-error] <input-file>');
    process.exit(1);
}

const stopOnError = flags.includes('--stop-on-error');
const seedFlag = flags.find(f => f.startsWith('--seed='));
const source = flags.includes('--fortran') ? 'fortran' : 'js';

const cmds = readFileSync(inputFile, 'utf8').trim().split('\n');

if (source === 'fortran') {
    // Run via Fortran binary
    const { spawnSync } = await import('child_process');
    const fortranDir = join(__dirname, '..', 'fortran-src');
    const env = { ...process.env };
    if (seedFlag) env.DUNGEON_SEED = seedFlag.split('=')[1];

    const result = spawnSync('./dungeon', [], {
        cwd: fortranDir, input: cmds.join('\n') + '\n',
        encoding: 'utf8', timeout: 120000, env,
        stdio: ['pipe', 'pipe', 'ignore'],
    });

    const lines = (result.stdout || '').split('\n');
    let step = 0;
    let issues = 0;
    for (const line of lines) {
        if (line.startsWith(' > ')) step++;
        const t = line.toLowerCase();
        if (t.includes('eaten by a grue') || t.includes('lurking grue')) {
            console.log(`Step ${step} (${cmds[step-1]}): GRUE DEATH`);
            issues++;
        }
        if (t.includes("can't see any")) {
            console.log(`Step ${step} (${cmds[step-1]}): NOT FOUND — ${line.trim()}`);
            issues++;
        }
        if (t.includes("don't understand")) {
            console.log(`Step ${step} (${cmds[step-1]}): PARSER — ${line.trim()}`);
            issues++;
        }
    }
    // Check final score
    const scoreMatch = (result.stdout || '').match(/score would be\+?\s*(\d+)\s*\[total of (\d+)/);
    if (scoreMatch) {
        console.log(`\nFinal score: ${scoreMatch[1]} / ${scoreMatch[2]}`);
    }
    console.log(`Issues: ${issues}`);

} else {
    // Run via JS engine
    const { DungeonGame } = await import(join(__dirname, '..', 'js', 'game.js'));
    const data = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-data.json')));
    const text = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-text.json')));

    const game = new DungeonGame();
    game.init(data, text);
    if (seedFlag) game._rngSeed = parseInt(seedFlag.split('=')[1], 10);

    let i = 0;
    let issues = 0;
    let stopped = false;

    await game.run(async () => {
        if (i >= cmds.length || stopped) { game.gameOver = true; return null; }
        return cmds[i++];
    }, (text) => {
        const t = (text || '').toLowerCase();
        let issue = null;
        if (t.includes('eaten') && t.includes('grue')) issue = 'GRUE DEATH';
        else if (t.includes("can't see any")) issue = 'NOT FOUND — ' + text.trim().substring(0, 70);
        else if (t.includes("don't understand")) issue = 'PARSER — ' + text.trim().substring(0, 70);

        if (issue) {
            console.log(`Step ${i} (${cmds[i-1]}) room=${game.here}: ${issue}`);
            issues++;
            if (stopOnError) stopped = true;
        }
    }).catch(() => {});

    console.log(`\nFinal score: ${game.rwscor || 0} / ${game.mxscor || 616}`);
    console.log(`Dead: ${game.deadf}`);
    console.log(`Issues: ${issues} in ${i} steps`);
}
