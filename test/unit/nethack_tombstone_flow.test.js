import { describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/chargen.js';
import { createInputQueue, setInputRuntime, clearInputQueue, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { RACE_HUMAN, FEMALE, A_NEUTRAL } from '../../js/const.js';

function makeStorage() {
    const m = new Map();
    return {
        get length() { return m.size; },
        getItem(k) { return m.has(k) ? m.get(k) : null; },
        setItem(k, v) { m.set(k, String(v)); },
        removeItem(k) { m.delete(k); },
        key(i) { return Array.from(m.keys())[i] ?? null; },
        clear() { m.clear(); },
    };
}

function makeDisplay() {
    const tombstones = [];
    const putstrCalls = [];
    return {
        rows: 24,
        cols: 80,
        isHeadless: true,
        tombstones,
        putstrCalls,
        clearScreen() {},
        clearRow() {},
        putstr(col, row, str) { putstrCalls.push({ col, row, str }); },
        putstr_message() {},
        renderMap() {},
        renderStatus() {},
        renderTombstone(name, gold, deathLines, year) {
            tombstones.push({ name, gold, deathLines, year });
        },
    };
}

function seedPlayer(game) {
    game.u.name = 'Hero';
    game.u.gold = 123;
    game.u.score = 1000;
    game.u.dungeonLevel = 5;
    game.u.maxDungeonLevel = 7;
    game.u.hp = 0;
    game.u.hpmax = 42;
    game.u.turns = 321;
    game.u.roleIndex = 11;
    game.u.race = RACE_HUMAN;
    game.u.gender = FEMALE;
    game.u.alignment = A_NEUTRAL;
    game.u.deathCause = 'killed by a newt';
}

describe('NetHackGame showGameOver tombstone flow', () => {
    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

    it('renders tombstone and waits for keypress when enabled', async () => {
        globalThis.localStorage = makeStorage();
        const input = createInputQueue();
        setInputRuntime(input);
        const display = makeDisplay();
        const game = new NetHackGame({ display, input, lifecycle: {} });
        game.flags = { tombstone: true };
        seedPlayer(game);

        input.pushInput(' '.charCodeAt(0)); // dismiss combined tombstone+summary page
        input.pushInput(' '.charCodeAt(0)); // dismiss C-style intermediate --More-- boundary

        await game.showGameOver();

        assert.equal(display.tombstones.length, 1);
        assert.equal(display.tombstones[0].name, 'Hero');
        assert.equal(display.tombstones[0].gold, 123);
        assert.ok(display.tombstones[0].deathLines.join(' ').includes('killed by a newt'));
        assert.ok(display.putstrCalls.some((c) => c.str.includes('You died in')));
        assert.equal(getInputQueueLength(), 0);
    });

    it('skips tombstone screen when disabled', async () => {
        globalThis.localStorage = makeStorage();
        const input = createInputQueue();
        setInputRuntime(input);
        const display = makeDisplay();
        const game = new NetHackGame({ display, input, lifecycle: {} });
        game.flags = { tombstone: false };
        seedPlayer(game);

        await game.showGameOver();

        assert.equal(display.tombstones.length, 0);
        assert.ok(!display.putstrCalls.some((c) => c.str.includes('You died in')));
    });
});
