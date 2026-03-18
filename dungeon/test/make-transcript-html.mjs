#!/usr/bin/env node
// Generate a retro terminal HTML transcript from a speedrun session JSON.
// Usage: node make-transcript-html.mjs [session.json] [output.html]
//   Defaults: sessions/speedrun-1.json → ~/dungeon-speedrun.html

import { readFileSync, writeFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const sessionFile = args[0] || join(__dirname, 'sessions', 'speedrun-1.json');
const outputFile = args[1] || join(homedir(), 'dungeon-speedrun.html');

const data = JSON.parse(readFileSync(sessionFile, 'utf8'));
const steps = data.steps;
const cmds = steps.map(s => s.cmd);
const seed = data.seed || 42;

// Run Fortran dungeon with the session commands
const result = spawnSync('./dungeon', [], {
    cwd: join(__dirname, '..', 'fortran-src'),
    input: cmds.join('\n') + '\n',
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, DUNGEON_SEED: String(seed) },
    stdio: ['pipe', 'pipe', 'ignore'],
});

// Split stdout into per-command chunks by " > " prompts
// ASCII art borders (like the stamp) also start with " > " but end with "<" — skip those.
const chunks = [];
let current = [];
for (const line of result.stdout.split('\n')) {
    if ((line.startsWith(' > ') || line === ' >') && !line.trimEnd().endsWith('<')) {
        chunks.push(current);
        current = [];
        const after = line.substring(3).trimEnd();
        if (after) current.push(' ' + after);
    } else {
        current.push(line);
    }
}
if (current.length) chunks.push(current);

console.log(`chunks: ${chunks.length}, steps: ${steps.length}`);

// Apply boundaryAdjust to map each step to the correct output chunk
const pairs = [];
pairs.push({ cmd: null, output: chunks[0].join('\n') });

let boundaryOffset = 0;
for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.boundaryAdjust) boundaryOffset += step.boundaryAdjust;
    const chunk = chunks[i + 1 + boundaryOffset] || [];
    pairs.push({ cmd: step.cmd, output: chunk.join('\n') });
}

// Render HTML
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let body = '';
for (const pair of pairs) {
    if (pair.cmd === null) {
        body += `<div class="output">${esc(pair.output)}</div>\n`;
    } else {
        body += `<div class="prompt"><span class="gt">&gt;</span> <span class="cmd">${esc(pair.cmd)}</span></div>\n`;
        if (pair.output.trim()) {
            body += `<div class="output">${esc(pair.output)}</div>\n`;
        }
    }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dungeon Speedrun Transcript</title>
<style>
body { background: #0a0e0a; color: #33cc33; font-family: 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.4; padding: 20px 40px; max-width: 800px; margin: 0 auto; }
h1 { color: #66ff66; font-size: 18px; text-align: center; border-bottom: 1px solid #33cc33; padding-bottom: 10px; }
.output { white-space: pre-wrap; margin: 0 0 2px 0; }
.prompt { margin: 8px 0 2px 0; }
.gt { color: #ffffff; }
.cmd { color: #ffffaa; font-weight: bold; }
</style>
</head>
<body>
<h1>Dungeon Speedrun &mdash; 616/616 Points, Seed ${seed}</h1>
${body}
</body>
</html>`;

writeFileSync(outputFile, html);
console.log(`Written ${outputFile}`);
