#!/usr/bin/env node
// Record a Zork parity session from the JS engine with per-step parse tracing.
// Usage: echo -e "look\nopen mailbox\nquit\ny" | node record-js-session.mjs
// Or:   node record-js-session.mjs sessions/opening.input

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '..', 'js', 'dungeon-data.json');
const textPath = join(__dirname, '..', 'js', 'dungeon-text.json');

const data = JSON.parse(readFileSync(dataPath));
const textRecords = JSON.parse(readFileSync(textPath));

// Read input
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
let inputLines;
if (args[0]) {
    inputLines = readFileSync(args[0], 'utf8').trim().split('\n');
} else {
    inputLines = readFileSync('/dev/stdin', 'utf8').trim().split('\n');
}

// Dynamic import of game module
const { DungeonGame } = await import(join(__dirname, '..', 'js', 'game.js'));

const game = new DungeonGame();
game.init(data, textRecords);
if (flags.includes('--trace')) game._trace = true;

const session = {
    format: 'zork-parity-v1',
    source: 'js',
    timestamp: new Date().toISOString(),
    steps: [],
};

let inputIdx = 0;
let currentOutput = [];
let moveAtInput = 0;

const input = async () => {
    // Save step from previous command (if any)
    if (moveAtInput > 0) {
        session.steps.push({
            move: moveAtInput,
            input: inputLines[inputIdx - 1] || '',
            parse: {
                prsa: game.prsa,
                prso: game.prso,
                prsi: game.prsi,
                prswon: game.prswon,
            },
            state: {
                here: game.here,
                winner: game.winner,
                moves: game.moves,
                score: game.rwscor || 0,
            },
            output: [...currentOutput],
        });
    }

    currentOutput = [];

    if (inputIdx >= inputLines.length) {
        game.gameOver = true;
        return '';
    }

    moveAtInput = game.moves + 1;
    return inputLines[inputIdx++];
};

const output = (s) => {
    currentOutput.push(s);
};

try {
    await game.run(input, output);
} catch (e) {
    // Game may throw/exit
}

// Save final step
if (moveAtInput > 0 && inputIdx > 0) {
    session.steps.push({
        move: moveAtInput,
        input: inputLines[inputIdx - 1] || '',
        parse: {
            prsa: game.prsa,
            prso: game.prso,
            prsi: game.prsi,
            prswon: game.prswon,
        },
        state: {
            here: game.here,
            winner: game.winner,
            moves: game.moves,
            score: game.rwscor || 0,
        },
        output: [...currentOutput],
    });
}

console.log(JSON.stringify(session, null, 2));
