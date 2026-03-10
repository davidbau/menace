import test from 'node:test';
import assert from 'node:assert/strict';

import { HeadlessDisplay } from '../comparison/session_helpers.js';

function makeBlockingNhgetch() {
    const waiters = [];
    return {
        nhgetch: () => new Promise((resolve) => waiters.push(resolve)),
        push(ch) {
            const resolve = waiters.shift();
            if (resolve) resolve(ch);
        },
    };
}

test('putstr_message blocks on overflow until --More-- dismissal key', async () => {
    const display = new HeadlessDisplay();
    display.cols = 40;
    const input = makeBlockingNhgetch();
    display.setNhgetch(input.nhgetch);

    await display.putstr_message('1234567890123456789012345');

    let finished = false;
    const p = display.putstr_message('abcdefghij').then(() => {
        finished = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(finished, false, 'message should still be waiting on --More--');

    input.push(32); // space
    await p;
    assert.equal(finished, true);
});

test('putstr_message ignores non-dismiss keys while waiting at --More--', async () => {
    const display = new HeadlessDisplay();
    display.cols = 40;
    const input = makeBlockingNhgetch();
    display.setNhgetch(input.nhgetch);

    await display.putstr_message('1234567890123456789012345');

    let finished = false;
    const p = display.putstr_message('abcdefghij').then(() => {
        finished = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    input.push('a'.charCodeAt(0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(finished, false, 'non-dismiss key must not clear --More--');

    input.push(27); // ESC dismisses
    await p;
    assert.equal(finished, true);
});
