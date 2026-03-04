import { test } from 'node:test';
import assert from 'node:assert/strict';

import { domove_attackmon_at } from '../../js/hack.js';

test('domove_attackmon_at stops running when safe monster blocks movement', async () => {
    const player = {
        x: 10,
        y: 10,
        punished: true,
    };
    const mon = {
        mx: 11,
        my: 10,
        peaceful: true,
        tame: false,
        mfrozen: 0,
        mcanmove: true,
        msleeping: false,
        type: { speed: 12, flags1: 0 },
    };
    const map = {
        at() {
            return { typ: 0, flags: 0 };
        },
    };
    const messages = [];
    const display = {
        async putstr_message(msg) {
            messages.push(msg);
        },
    };
    const game = {
        running: true,
        travelPath: [[1, 0]],
        travelStep: 1,
        multi: 7,
        context: {
            run: 3,
            travel: 1,
            travel1: 1,
            forcefight: 0,
            nopick: 0,
        },
    };

    const result = await domove_attackmon_at(mon, 11, 10, [1, 0], player, map, display, game);
    assert.equal(result.handled, true);
    assert.equal(result.moved, false);
    assert.equal(result.tookTime, true);
    assert.equal(game.context.run, 0);
    assert.equal(game.context.travel, 0);
    assert.equal(game.context.travel1, 0);
    assert.equal(game.running, false);
    assert.equal(game.multi, 0);
    // Message now routes through pline/You for C-faithful --More-- handling.
    // This unit test validates control-flow state changes, not display plumbing.
});
