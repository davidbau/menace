// Test message concatenation behavior matching C NetHack
// C ref: win/tty/topl.c:264-267
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { HeadlessDisplay } from '../comparison/session_helpers.js';

describe('message concatenation', () => {

test('message concatenation: short messages combine with two spaces', () => {
    const display = new HeadlessDisplay(80, 24);

    // First message
    display.putstr_message('a - a +1 ring mail.');
    assert.strictEqual(display.topMessage, 'a - a +1 ring mail.');

    // Second message should concatenate
    display.putstr_message('There is a staircase down here.');
    assert.strictEqual(display.topMessage, 'a - a +1 ring mail.  There is a staircase down here.');
});

test('message concatenation: long combined message triggers --More--', () => {
    const display = new HeadlessDisplay(80, 24);

    // First long message
    const longMsg = 'a - a very long description of some magical item that takes up lots of space';
    display.putstr_message(longMsg);

    // Second message triggers --More-- (combined would exceed cols - 9)
    display.putstr_message('There is a fountain here.');
    assert.strictEqual(display._pendingMore, true, '--More-- should be pending');
    assert.strictEqual(display._messageQueue.length, 1, 'new message should be queued');
    assert.strictEqual(display._messageQueue[0], 'There is a fountain here.');

    // After clearing --More--, the new message is displayed
    display._clearMore();
    assert.strictEqual(display.topMessage, 'There is a fountain here.');
    assert.strictEqual(display._pendingMore, false);
});

test('message concatenation: "You die" never concatenates', () => {
    const display = new HeadlessDisplay(80, 24);

    display.putstr_message('The orc hits!');
    assert.strictEqual(display.topMessage, 'The orc hits!');

    // "You die" should NOT concatenate even if it fits
    display.putstr_message('You die...');
    assert.strictEqual(display.topMessage, 'You die...');
});

test('message display: long single message pauses with --More-- on row 0', () => {
    const display = new HeadlessDisplay(80, 24);
    const msg = 'You read: "Never mind the monsters hit?i?c be?.  they just replace the chargemen with robots and carry on."';

    display.putstr_message(msg);

    assert.strictEqual(display._pendingMore, true, 'long message should wait for --More--');
    assert.strictEqual(display._messageQueue.length, 1, 'overflow text should be queued');
    assert.ok(display.topMessage.length <= 70, 'visible topline should reserve room for --More--');

    let row1HasText = false;
    for (let c = 0; c < display.cols; c++) {
        if (display.grid[1][c] !== ' ') {
            row1HasText = true;
            break;
        }
    }
    assert.strictEqual(row1HasText, false, 'overflow should not spill onto row 1');
});

test('message concatenation: matches C NetHack spacing', () => {
    const display = new HeadlessDisplay(80, 24);

    display.putstr_message('10 gold pieces.');
    display.putstr_message('You see here a scroll.');

    // Should have exactly two spaces between messages
    assert.strictEqual(display.topMessage, '10 gold pieces.  You see here a scroll.');
});

test('message concatenation: triple message combination', () => {
    const display = new HeadlessDisplay(80, 24);

    display.putstr_message('a - a dagger.');
    display.putstr_message('b - a key.');
    display.putstr_message('c - an apple.');

    // All three should combine if they fit
    const expected = 'a - a dagger.  b - a key.  c - an apple.';
    if (expected.length + 3 < 80 - 8) {
        assert.strictEqual(display.topMessage, expected);
    }
});

}); // describe
