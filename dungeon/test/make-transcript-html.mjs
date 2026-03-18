#!/usr/bin/env node
// Generate a retro terminal HTML transcript from a speedrun session JSON.
// Usage: node make-transcript-html.mjs [session.json] [output.html]
//   Defaults: sessions/speedrun-1.json → ~/dungeon-speedrun.html
//
// Uses the JS game engine for accurate per-step output (no Fortran boundary issues).
// Echo Room steps (echoRoom: true) display as:  "> echo"  followed by game output.

import { readFileSync, writeFileSync } from 'fs';
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

// Run via JS engine to get accurate per-step output
const { DungeonGame } = await import(join(__dirname, '..', 'js', 'game.js'));
const gameData = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-data.json')));
const text = JSON.parse(readFileSync(join(__dirname, '..', 'js', 'dungeon-text.json')));

const game = new DungeonGame();
game.init(gameData, text);
game._rngSeed = seed;

let cmdIdx = 0;
let currentOutput = [];
const stepOutputs = []; // stepOutputs[i] = lines output by command i

await game.run(async () => {
    if (cmdIdx > 0) stepOutputs.push([...currentOutput]);
    currentOutput = [];
    if (cmdIdx >= cmds.length) { game.gameOver = true; return null; }
    return cmds[cmdIdx++];
}, (line) => {
    currentOutput.push(line || '');
}).catch(() => {});
if (currentOutput.length) stepOutputs.push([...currentOutput]);

console.log(`steps: ${steps.length}, outputs collected: ${stepOutputs.length}`);

// Build intro output (everything before step 1 — the welcome text)
// The JS game emits the welcome in cmdIdx==0 output, which is stepOutputs[0] minus the first step
// Actually, the welcome is emitted before any command; stepOutputs[0] is step 1's output.
// To get intro, run an extra "look" or just use what the game outputs at start.
// The game emits intro when run() initializes; that output lands in the pre-first-call buffer.
// We capture it separately by re-running with a sentinel.
const game2 = new DungeonGame();
game2.init(gameData, text);
game2._rngSeed = seed;
const introLines = [];
await game2.run(async () => { game2.gameOver = true; return null; },
    (line) => introLines.push(line || '')).catch(() => {});

// Render HTML
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderOutput(lines) {
    const text = lines.map(l => l.trimEnd()).filter(l => l !== '>').join('\n').trimEnd();
    if (!text) return '';
    return `<div class="output">${esc(text)}</div>\n`;
}

let body = '';
body += renderOutput(introLines);

for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const out = stepOutputs[i] || [];

    if (step.echoRoom) {
        // Echo Room: display "echo" as a user command (white, >) then ECHO as game output.
        // The user typed "echo" once; the room echoes it back as "ECHO" in the output.
        body += `<div class="prompt"><span class="gt">&gt;</span> <span class="cmd">${esc(step.cmd)}</span></div>\n`;
        body += renderOutput(out);
    } else {
        body += `<div class="prompt"><span class="gt">&gt;</span> <span class="cmd">${esc(step.cmd)}</span></div>\n`;
        body += renderOutput(out);
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
