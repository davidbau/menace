import test from 'node:test';
import assert from 'node:assert/strict';

import { Display } from '../../js/display.js';

test('Display._clearMore resumes at most one queued message per dismissal', async () => {
    const queued = ['first queued', 'second queued'];
    const shown = [];
    const fakeDisplay = {
        _moreBoundaryToken: null,
        _inputBoundaryRuntime: null,
        _pendingMore: true,
        _pendingMoreNoCursor: true,
        _messageQueue: queued.slice(),
        _topMessageRow1: undefined,
        messageNeedsMore: true,
        topMessage: 'old',
        clearRow: () => {},
        async putstr_message(msg) {
            shown.push(msg);
        },
    };

    await Display.prototype._clearMore.call(fakeDisplay);

    assert.equal(fakeDisplay._pendingMore, false);
    assert.equal(fakeDisplay._pendingMoreNoCursor, false);
    assert.equal(fakeDisplay.messageNeedsMore, false);
    assert.equal(fakeDisplay.topMessage, null);
    assert.deepEqual(shown, ['first queued']);
    assert.deepEqual(fakeDisplay._messageQueue, ['second queued']);
});

test('Display._clearMore awaits queued putstr_message completion', async () => {
    let resolveQueued;
    const finished = [];
    const fakeDisplay = {
        _moreBoundaryToken: null,
        _inputBoundaryRuntime: null,
        _pendingMore: true,
        _pendingMoreNoCursor: false,
        _messageQueue: ['queued'],
        _topMessageRow1: undefined,
        messageNeedsMore: true,
        topMessage: 'old',
        clearRow: () => {},
        putstr_message() {
            return new Promise((resolve) => {
                resolveQueued = () => {
                    finished.push('queued-done');
                    resolve();
                };
            });
        },
    };

    let returned = false;
    const clearPromise = Display.prototype._clearMore.call(fakeDisplay).then(() => {
        returned = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(returned, false);
    assert.deepEqual(finished, []);

    resolveQueued();
    await clearPromise;
    assert.equal(returned, true);
    assert.deepEqual(finished, ['queued-done']);
});
