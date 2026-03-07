import { test } from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/allmain.js';

function makeGame() {
    const display = {
        _pendingMore: false,
        messageNeedsMore: false,
        _messageQueue: [],
    };
    const input = {
        isWaitingInput() {
            return false;
        },
    };
    return new NetHackGame({ display, input });
}

test('getInputBoundaryState reports prompt/more/input boundaries via runtime API', () => {
    const game = makeGame();

    let st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'none');
    assert.equal(st.waitingForInput, false);

    game.pendingPrompt = { onKey() {} };
    st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'prompt');
    assert.equal(st.waitingForInput, true);

    game.pendingPrompt = null;
    game.display._pendingMore = true;
    game.display.messageNeedsMore = true;
    game.display._messageQueue.push('queued');
    st = game.getInputBoundaryState();
    assert.equal(st.boundaryKind, 'more');
    assert.equal(st.waitingForInput, true);
    assert.equal(st.pendingCount, 1);
    assert.equal(st.ackRequired, true);
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
