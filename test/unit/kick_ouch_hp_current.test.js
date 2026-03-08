import test from 'node:test';
import assert from 'node:assert/strict';

import { handleKick } from '../../js/kick.js';
import { setInputRuntime, createInputQueue, resetInputModuleState, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA, ROOM, TREE } from '../../js/const.js';

function makeDisplay() {
    return {
        topMessage: null,
        messageNeedsMore: false,
        async putstr_message(msg) {
            this.topMessage = String(msg);
        },
        clearRow() {},
    };
}

test('kick_ouch subtracts from current HP (uhp), not max HP (uhpmax)', async () => {
    resetInputModuleState();
    const input = createInputQueue({ throwOnEmpty: true });
    setInputRuntime(input);

    const display = makeDisplay();
    input.pushInput('j'.charCodeAt(0));

    const player = {
        x: 10,
        y: 10,
        strDamage: 0,
        uhp: 5,
        uhpmax: 50,
        attributes: [],
        aexercise: [0, 0, 0, 0, 0, 0],
    };
    player.attributes[A_STR] = 10;
    player.attributes[A_DEX] = 10;
    player.attributes[A_CON] = 10;
    player.attributes[A_INT] = 10;
    player.attributes[A_WIS] = 10;
    player.attributes[A_CHA] = 10;

    const nearSleeper = { mx: 10, my: 15, dead: false, mhp: 5, msleeping: 1, sleeping: true, mstrategy: 0 };
    const farSleeper = { mx: 20, my: 20, dead: false, mhp: 5, msleeping: 1, sleeping: true, mstrategy: 0 };
    const map = {
        rooms: [],
        engravings: [],
        monsters: [nearSleeper, farSleeper],
        at(x, y) {
            if (x === 10 && y === 11) return { typ: TREE, flags: 0, roomno: 0 };
            return { typ: ROOM, flags: 0, roomno: 0 };
        },
        monsterAt() { return null; },
        removeMonster() {},
    };

    const game = { flags: { verbose: true }, moves: 1 };
    const result = await handleKick(player, map, display, game);

    assert.equal(result.tookTime, true);
    assert.equal(result.moved, false);
    assert.ok(player.uhp >= 1 && player.uhp <= 4,
        `expected HP to be reduced from current HP 5; got ${player.uhp}`);
    assert.equal(nearSleeper.msleeping, 0);
    assert.equal(nearSleeper.sleeping, false);
    assert.equal(farSleeper.msleeping, 1);
    assert.equal(farSleeper.sleeping, true);
});
