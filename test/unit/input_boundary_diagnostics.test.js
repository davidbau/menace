import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame, run_command } from '../../js/allmain.js';

function makeGame() {
    const display = {
        async putstr_message() {},
        messageNeedsMore: false,
    };
    const input = {
        isWaitingInput() {
            return false;
        },
    };
    return new NetHackGame({ display, input });
}

test('run_command consumes prompt boundary exactly once per key', async () => {
    const game = makeGame();
    let calls = 0;
    game.pendingPrompt = {
        onKey() {
            calls += 1;
            return { handled: true, tookTime: false };
        },
    };

    const result = await run_command(game, 'a'.charCodeAt(0));
    assert.equal(calls, 1);
    assert.equal(result?.prompt, true);
    assert.equal(result?.tookTime, false);
});

test('prompt boundary does not fall through to command parser on unhandled key', async () => {
    const game = makeGame();
    let calls = 0;
    game.pendingPrompt = {
        onKey() {
            calls += 1;
            return { handled: false };
        },
    };

    const result = await run_command(game, 'a'.charCodeAt(0));
    assert.equal(calls, 1);
    assert.equal(result?.prompt, true);
    assert.equal(result?.tookTime, false);
    assert.notEqual(game.cmdKey, 'a'.charCodeAt(0));
});

test('prompt handler can clear itself and subsequent prompt still receives next key', async () => {
    const game = makeGame();
    let callsA = 0;
    game.pendingPrompt = {
        onKey(_ch, g) {
            callsA += 1;
            g.pendingPrompt = null;
            return { handled: true, tookTime: false };
        },
    };

    const first = await run_command(game, 'a'.charCodeAt(0));
    assert.equal(callsA, 1);
    assert.equal(first?.prompt, true);
    assert.equal(game.pendingPrompt, null);

    let callsB = 0;
    game.pendingPrompt = {
        onKey() {
            callsB += 1;
            return { handled: true, tookTime: false };
        },
    };
    const second = await run_command(game, 'b'.charCodeAt(0));
    assert.equal(second?.prompt, true);
    assert.equal(callsB, 1);
});
