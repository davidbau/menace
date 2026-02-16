import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/nethack.js';
import { createInputQueue, setInputRuntime } from '../../js/input.js';
import { RACE_HUMAN, FEMALE, A_NEUTRAL } from '../../js/config.js';

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
    game.player.name = 'Hero';
    game.player.gold = 123;
    game.player.score = 1000;
    game.player.dungeonLevel = 5;
    game.player.maxDungeonLevel = 7;
    game.player.hp = 0;
    game.player.hpmax = 42;
    game.player.turns = 321;
    game.player.roleIndex = 11;
    game.player.race = RACE_HUMAN;
    game.player.gender = FEMALE;
    game.player.alignment = A_NEUTRAL;
    game.player.deathCause = 'killed by a newt';
}

describe('NetHackGame showGameOver tombstone flow', () => {
    it('renders tombstone and waits for keypress when enabled', async () => {
        globalThis.localStorage = makeStorage();
        const input = createInputQueue();
        setInputRuntime(input);
        const display = makeDisplay();
        const game = new NetHackGame({ display, input, lifecycle: {} });
        game.flags = { tombstone: true };
        seedPlayer(game);

        input.pushInput(' '.charCodeAt(0)); // dismiss tombstone
        input.pushInput('n'.charCodeAt(0)); // do not restart

        await game.showGameOver();

        assert.equal(display.tombstones.length, 1);
        assert.equal(display.tombstones[0].name, 'Hero');
        assert.equal(display.tombstones[0].gold, 123);
        assert.ok(display.tombstones[0].deathLines.join(' ').includes('killed by a newt'));
        assert.ok(display.putstrCalls.some((c) => c.str.includes('(Press any key)')));
    });

    it('skips tombstone screen when disabled', async () => {
        globalThis.localStorage = makeStorage();
        const input = createInputQueue();
        setInputRuntime(input);
        const display = makeDisplay();
        const game = new NetHackGame({ display, input, lifecycle: {} });
        game.flags = { tombstone: false };
        seedPlayer(game);

        input.pushInput('n'.charCodeAt(0)); // play again? no

        await game.showGameOver();

        assert.equal(display.tombstones.length, 0);
        assert.ok(!display.putstrCalls.some((c) => c.str.includes('(Press any key)')));
    });
});
