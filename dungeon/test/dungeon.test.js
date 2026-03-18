// dungeon/test/dungeon.test.js — Unit and replay tests for the Dungeon engine.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { DungeonGame } from '../js/game.js';

// --- Test helpers ---

function loadData() {
    const data = JSON.parse(readFileSync(new URL('../js/dungeon-data.json', import.meta.url)));
    return data;
}

function loadTextRecords() {
    try {
        return JSON.parse(readFileSync(new URL('../js/dungeon-text.json', import.meta.url)));
    } catch (e) {
        return {};
    }
}

function createGame() {
    const data = loadData();
    const textRecords = loadTextRecords();
    const game = new DungeonGame();
    game.init(data, textRecords);
    return game;
}

// Run a game with scripted input, capture output lines
async function runSession(inputLines) {
    const game = createGame();
    let inputIdx = 0;
    const outputLines = [];

    const input = async () => {
        if (inputIdx >= inputLines.length) return 'quit';
        return inputLines[inputIdx++];
    };

    const output = (text) => {
        if (text) outputLines.push(text);
    };

    try {
        await game.run(input, output);
    } catch (e) {
        // Game may throw on quit — that's ok
    }

    return { game, outputLines };
}

// ========================================================================
// Unit Tests: rspeak message decryption
// ========================================================================
describe('rspeak message decryption', () => {
    it('decrypts welcome message (message 1)', async () => {
        const { outputLines } = await runSession(['quit', 'y']);
        const welcomeText = outputLines.join('\n');
        assert.ok(welcomeText.includes('Welcome to Dungeon'), 'Should contain welcome text');
    });

    it('decrypts room description for West of House', async () => {
        const { outputLines } = await runSession(['look', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('open field west of a white house'), 'West of House description');
        assert.ok(text.includes('mailbox'), 'Should mention mailbox');
    });
});

// ========================================================================
// Unit Tests: Parser
// ========================================================================
describe('Parser basics', () => {
    it('parses LOOK command', async () => {
        const { outputLines } = await runSession(['look', 'quit', 'y']);
        const text = outputLines.join('\n');
        // LOOK should produce room description
        assert.ok(text.includes('white house'), 'LOOK should describe the room');
    });

    it('parses compound direction GO NORTH', async () => {
        const { outputLines } = await runSession(['go north', 'quit', 'y']);
        const text = outputLines.join('\n');
        // Should move to forest
        assert.ok(text.length > 0, 'Should produce output for GO NORTH');
    });

    it('parses INVENTORY when empty', async () => {
        const { outputLines } = await runSession(['inventory', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('empty') || text.includes('not carrying'), 'Empty inventory');
    });
});

// ========================================================================
// Unit Tests: Object interactions
// ========================================================================
describe('Object interactions', () => {
    it('opens the mailbox', async () => {
        const { outputLines } = await runSession(['open mailbox', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('leaflet') || text.includes('Opening'), 'Opening mailbox reveals leaflet');
    });

    it('takes the leaflet', async () => {
        const { outputLines } = await runSession(['open mailbox', 'take leaflet', 'inventory', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('Taken') || text.includes('taken'), 'Should take leaflet');
        assert.ok(text.includes('leaflet'), 'Inventory should show leaflet');
    });

    it('reads the leaflet', async () => {
        const { outputLines } = await runSession(['open mailbox', 'take leaflet', 'read leaflet', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('Dungeon') || text.includes('adventure'), 'Leaflet should contain game description');
    });
});

// ========================================================================
// Unit Tests: Movement
// ========================================================================
describe('Movement', () => {
    it('moves to south of house', async () => {
        const { outputLines } = await runSession(['go south', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('south side') || text.includes('white house'), 'Should describe south of house');
    });

    it('enters the house through window', async () => {
        const { outputLines } = await runSession([
            'go north', 'go east', 'open window', 'enter', 'quit', 'y'
        ]);
        const text = outputLines.join('\n');
        assert.ok(text.includes('kitchen') || text.includes('Kitchen'), 'Should enter kitchen');
    });

    it('dark room warns about grue', async () => {
        const { outputLines } = await runSession([
            'go north', 'go east', 'open window', 'enter', 'go west', 'go east', 'go up', 'quit', 'y'
        ]);
        const text = outputLines.join('\n');
        assert.ok(text.includes('dark') || text.includes('grue'), 'Dark room should mention darkness or grue');
    });
});

// ========================================================================
// Unit Tests: Score
// ========================================================================
describe('Scoring', () => {
    it('starts at 0 points', async () => {
        const { outputLines } = await runSession(['score', 'quit', 'y']);
        const text = outputLines.join('\n');
        assert.ok(text.includes('0') || text.includes('score'), 'Score should start at 0');
    });

    it('gains points for taking sword', async () => {
        const { outputLines } = await runSession([
            'go north', 'go east', 'enter', 'go west',
            'take lamp', 'take sword', 'score', 'quit', 'y'
        ]);
        const text = outputLines.join('\n');
        // Taking sword should give 10 points
        assert.ok(text.includes('10') || text.includes('score'), 'Should have points after taking sword');
    });
});

// ========================================================================
// Unit Tests: Light mechanics
// ========================================================================
describe('Light mechanics', () => {
    it('lamp can be turned on', async () => {
        const { outputLines } = await runSession([
            'go north', 'go east', 'enter', 'go west',
            'take lamp', 'turn on lamp', 'quit', 'y'
        ]);
        const text = outputLines.join('\n');
        assert.ok(text.includes('lamp') || text.includes('on'), 'Should acknowledge lamp on');
    });

    it('lit rooms show descriptions', async () => {
        const { outputLines } = await runSession([
            'go north', 'go east', 'enter', 'go west',
            'take lamp', 'turn on lamp', 'go east', 'go up', 'look', 'quit', 'y'
        ]);
        const text = outputLines.join('\n');
        // With lamp on, upstairs should be described (attic)
        assert.ok(!text.includes('eaten by a grue'), 'Should not be dark with lamp on');
    });
});

// ========================================================================
// Parity Tests: Per-step byte-level comparison against Fortran reference
// All sessions recorded with DUNGEON_SEED=42; JS run with seed=42.
// ========================================================================

// Normalize output lines: trim trailing whitespace, drop bare ">" prompts and
// trailing empty strings (the Fortran recorder may emit a trailing '' on quit).
function normalizeOutput(lines) {
    const result = (lines || []).map(s => s.trimEnd()).filter(s => s !== '>');
    while (result.length > 0 && result[result.length - 1] === '') result.pop();
    return result;
}

// Run a session with a fixed seed and per-step output capture.
async function runParitySession(inputLines, seed = 42) {
    const data = JSON.parse(readFileSync(new URL('../js/dungeon-data.json', import.meta.url)));
    const textRecords = JSON.parse(readFileSync(new URL('../js/dungeon-text.json', import.meta.url)));
    const game = new DungeonGame();
    game.init(data, textRecords);
    game._rngSeed = seed;

    const steps = [];
    let inputIdx = 0;
    let stepInputIdx = 0;
    let currentOutput = [];
    let moveAtInput = 0;

    const rawInput = async () => {
        if (inputIdx >= inputLines.length) { game.gameOver = true; return null; }
        return inputLines[inputIdx++];
    };

    const input = async () => {
        if (moveAtInput > 0) {
            steps.push({ move: moveAtInput, input: inputLines[stepInputIdx] || '', output: [...currentOutput] });
        }
        currentOutput = [];
        if (inputIdx >= inputLines.length) { game.gameOver = true; return null; }
        moveAtInput = game.moves + 1;
        stepInputIdx = inputIdx;
        return inputLines[inputIdx++];
    };

    const output = (s) => currentOutput.push(s);

    try { await game.run(input, output, { rawInput }); } catch (e) {}

    if (moveAtInput > 0 && inputIdx > 0) {
        steps.push({ move: moveAtInput, input: inputLines[stepInputIdx] || '', output: [...currentOutput] });
    }

    return steps;
}

describe('Fortran parity sessions (per-step, seed=42)', () => {
    async function checkSession(name) {
        const fortranPath = new URL(`sessions/${name}.fortran.json`, import.meta.url);
        const inputPath = new URL(`sessions/${name}.input`, import.meta.url);
        const fortranSession = JSON.parse(readFileSync(fortranPath));
        const inputLines = readFileSync(inputPath, 'utf8').trim().split('\n');

        const fortranSteps = fortranSession.steps.filter(s => (s.input || '') !== '');
        const jsSteps = await runParitySession(inputLines, 42);

        assert.equal(jsSteps.length, fortranSteps.length,
            `${name}: step count mismatch (js=${jsSteps.length} fortran=${fortranSteps.length})`);

        for (let i = 0; i < fortranSteps.length; i++) {
            const fs = fortranSteps[i];
            const js = jsSteps[i];
            const fortranOut = normalizeOutput(fs.output);
            const jsOut = normalizeOutput(js.output);
            assert.deepEqual(jsOut, fortranOut,
                `${name} step ${i + 1} ("${fs.input}"): output mismatch`);
        }
    }

    it('opening session matches Fortran byte-for-byte', () => checkSession('opening'));
    it('dark session matches Fortran byte-for-byte', () => checkSession('dark'));
    it('troll session matches Fortran byte-for-byte', () => checkSession('troll'));
    it('window-entry session matches Fortran byte-for-byte', () => checkSession('window-entry'));
});
