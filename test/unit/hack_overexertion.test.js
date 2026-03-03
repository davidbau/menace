import test from 'node:test';
import assert from 'node:assert/strict';

import { overexertion } from '../../js/hack.js';
import { initRng, enableRngLog, getRngLog, disableRngLog } from '../../js/rng.js';
import { HVY_ENCUMBER } from '../../js/config.js';

function makePlayer() {
    return {
        hp: 10,
        hpmax: 10,
        hunger: 301,
        hungerState: 1,
        attributes: [3, 10, 10, 10, 3, 10], // A_STR=0, A_CON=4
        inventory: [{ owt: 900 }],
    };
}

test('overexertion uses gethungry path and consumes hunger RNG', async () => {
    const player = makePlayer();
    const game = { moves: 1, multi: 0 };
    const display = { putstr_message() {} };

    initRng(12345);
    enableRngLog();
    const fainted = await overexertion(player, game, display);
    const log = getRngLog() || [];
    disableRngLog();

    assert.equal(fainted, false);
    assert.equal(player.hunger, 300);
    assert.equal(player.hp, 9); // encumbered and moves%3 != 0
    assert.ok(log.some((entry) => entry.includes('rn2(20)='))); // gethungry()
});

test('overexertion still applies hunger when encumbrance damage gate is off', async () => {
    const player = makePlayer();
    player.inventory = [];
    const game = { moves: 3, multi: 0 };
    const display = { putstr_message() {} };

    initRng(7);
    enableRngLog();
    await overexertion(player, game, display);
    const log = getRngLog() || [];
    disableRngLog();

    assert.equal(player.hunger, 300);
    assert.equal(player.hp, 10); // no overexert_hp on moves%3 == 0
    assert.ok(log.some((entry) => entry.includes('rn2(20)=')));
});

test('overexertion uses polymorph HP pool when upolyd is active', async () => {
    const player = makePlayer();
    player.upolyd = true;
    player.mh = 6;
    const game = { moves: 1, multi: 0 };
    const display = { putstr_message() {} };

    initRng(77);
    await overexertion(player, game, display);

    assert.equal(player.mh, 5);
    assert.equal(player.hp, 10); // unchanged when using poly hp pool
});
