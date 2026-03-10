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

test('getInputBoundaryState reports prompt/input boundaries via runtime API', () => {
    const game = makeGame();

    let st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'none');
    assert.equal(st.waitingForInput, false);

    game.pendingPrompt = { onKey() {} };
    st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'prompt');
    assert.equal(st.waitingForInput, true);

    game.pendingPrompt = null;
    st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'none');
    assert.equal(st.waitingForInput, false);
    assert.equal(st.pendingCount, 0);
    assert.equal(st.ackRequired, false);
});

test('diagnostic event API stores and streams recent events', () => {
    const game = makeGame();
    const seen = [];
    const unsubscribe = game.subscribeDiagnostics((ev) => seen.push(ev.type));

    game.emitDiagnosticEvent('boundary.more.dismiss-key', { key: 32 });
    game.emitDiagnosticEvent('boundary.more.dismissed', { key: 32 });
    unsubscribe();
    game.emitDiagnosticEvent('post.unsubscribe', {});

    assert.deepEqual(seen, ['boundary.more.dismiss-key', 'boundary.more.dismissed']);

    const recent = game.getRecentDiagnostics(3);
    assert.equal(recent.length, 3);
    assert.equal(recent[0].type, 'boundary.more.dismiss-key');
    assert.equal(recent[1].type, 'boundary.more.dismissed');
    assert.equal(recent[2].type, 'post.unsubscribe');
});

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

test('run_command re-syncs missing prompt boundary owner before consuming key', async () => {
    const game = makeGame();
    let calls = 0;
    game.pendingPrompt = {
        onKey() {
            calls += 1;
            return { handled: true, tookTime: false };
        },
    };
    const promptBoundary = game.peekInputBoundary();
    assert.equal(promptBoundary?.owner, 'prompt');
    game.clearInputBoundary(promptBoundary.token);
    assert.equal(game.peekInputBoundary(), null);

    const result = await run_command(game, 'a'.charCodeAt(0));
    assert.equal(calls, 1);
    assert.equal(result?.prompt, true);
});

test('clearInputBoundariesByOwner removes all matching owner entries', () => {
    const game = makeGame();
    game.withInputBoundary('more', () => ({ handled: false }));
    game.withInputBoundary('prompt', () => ({ handled: false }));
    game.withInputBoundary('more', () => ({ handled: false }));
    assert.equal(game.peekInputBoundary().owner, 'more');

    const removed = game.clearInputBoundariesByOwner('more');
    assert.equal(removed, 2);
    assert.equal(game.peekInputBoundary().owner, 'prompt');
});

test('pendingPrompt assignment clears stale prompt-owner boundaries', () => {
    const game = makeGame();
    game.withInputBoundary('prompt', () => ({ handled: false }));
    game.withInputBoundary('prompt', () => ({ handled: false }));
    game.withInputBoundary('more', () => ({ handled: false }));

    let calls = 0;
    game.pendingPrompt = {
        onKey() {
            calls += 1;
            return { handled: true, tookTime: false };
        },
    };
    const top = game.peekInputBoundary();
    assert.equal(top?.owner, 'prompt');

    const removedMore = game.clearInputBoundariesByOwner('more');
    assert.equal(removedMore, 1);

    // Only one prompt boundary should remain after assignment.
    const removedPrompt = game.clearInputBoundariesByOwner('prompt');
    assert.equal(removedPrompt, 1);
    assert.equal(calls, 0);
});

test('getInputBoundaryState exposes command execution token/depth during run_command', async () => {
    const game = makeGame();
    let seenState = null;
    game.pendingPrompt = {
        onKey(_ch, g) {
            seenState = g.getInputBoundaryState();
            return { handled: true, tookTime: false };
        },
    };

    await run_command(game, 'a'.charCodeAt(0));
    assert.ok(seenState);
    assert.equal(Number.isInteger(seenState.commandExecToken), true);
    assert.equal(seenState.commandExecDepth >= 1, true);

    const after = game.getInputBoundaryState();
    assert.equal(after.commandExecToken, null);
    assert.equal(after.commandExecDepth, 0);
});
