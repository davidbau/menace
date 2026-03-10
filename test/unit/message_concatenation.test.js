import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { HeadlessDisplay } from '../comparison/session_helpers.js';

function makeBlockingNhgetch() {
    const waiters = [];
    const queued = [];
    return {
        nhgetch: () => {
            if (queued.length > 0) {
                return Promise.resolve(queued.shift());
            }
            return new Promise((resolve) => waiters.push(resolve));
        },
        push(ch) {
            const resolve = waiters.shift();
            if (resolve) {
                resolve(ch);
            } else {
                queued.push(ch);
            }
        },
    };
}

describe('message concatenation', () => {
    test('short messages combine with two spaces', async () => {
        const display = new HeadlessDisplay(80, 24);
        await display.putstr_message('a - a +1 ring mail.');
        await display.putstr_message('There is a staircase down here.');
        assert.equal(display.topMessage, 'a - a +1 ring mail.  There is a staircase down here.');
    });

    test('overflow combine blocks for --More-- dismissal', async () => {
        const display = new HeadlessDisplay();
        display.cols = 40;
        const input = makeBlockingNhgetch();
        display.setNhgetch(input.nhgetch);

        await display.putstr_message('1234567890123456789012345');
        let done = false;
        const p = display.putstr_message('There is a fountain here.').then(() => {
            done = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(done, false);
        input.push(32);
        await p;
        assert.equal(done, true);
    });

    test('"You die..." forces a --More-- boundary before replacement', async () => {
        const display = new HeadlessDisplay(80, 24);
        const input = makeBlockingNhgetch();
        display.setNhgetch(input.nhgetch);

        await display.putstr_message('The orc hits!');
        let done = false;
        const p = display.putstr_message('You die...').then(() => {
            done = true;
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(done, false);
        input.push(32);
        input.push(32);
        await p;
        assert.equal(done, true);
    });
});
