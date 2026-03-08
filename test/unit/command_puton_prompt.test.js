import { describe, test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { RING_CLASS, RIN_PROTECTION } from '../../js/objects.js';

describe('put on prompt', () => {

    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
    };
    return { player, map, display, fov: null, flags: { verbose: false } };
}

test('put on reports no available accessories when no rings are available', async () => {
    const game = makeGame();
    clearInputQueue();

    const result = await rhack('P'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, "You don't have anything else to put on.");
});

test('put on allows selecting a ring and equips it on left finger', async () => {
    const game = makeGame();
    game.player.inventory = [{
        invlet: 'a',
        oclass: RING_CLASS,
        otyp: RIN_PROTECTION,
        name: 'ring of protection',
        quan: 1,
    }];
    clearInputQueue();
    pushInput('a'.charCodeAt(0)); // select the ring
    pushInput('l'.charCodeAt(0)); // choose left finger (C ref: "Which ring-finger, Right or Left?")

    const result = await rhack('P'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.equal(game.player.leftRing?.invlet, 'a');
});

test('put on allows selecting a ring and equips it on right finger', async () => {
    const game = makeGame();
    game.player.inventory = [{
        invlet: 'a',
        oclass: RING_CLASS,
        otyp: RIN_PROTECTION,
        name: 'ring of protection',
        quan: 1,
    }];
    clearInputQueue();
    pushInput('a'.charCodeAt(0)); // select the ring
    pushInput('r'.charCodeAt(0)); // choose right finger

    const result = await rhack('P'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.equal(game.player.rightRing?.invlet, 'a');
});

test('put on skips ring-finger prompt when left slot already occupied', async () => {
    const game = makeGame();
    const existingRing = { invlet: 'b', oclass: RING_CLASS, otyp: RIN_PROTECTION, quan: 1 };
    const newRing = { invlet: 'a', oclass: RING_CLASS, otyp: RIN_PROTECTION, quan: 1 };
    game.player.inventory = [newRing, existingRing];
    game.player.leftRing = existingRing;
    clearInputQueue();
    pushInput('a'.charCodeAt(0)); // select ring — no finger prompt, goes to right

    const result = await rhack('P'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.equal(game.player.rightRing?.invlet, 'a'); // auto-assigned to right
});

test('put on ring-finger prompt cancels on Enter without consuming a turn', async () => {
    const game = makeGame();
    game.player.inventory = [{
        invlet: 'a',
        oclass: RING_CLASS,
        otyp: RIN_PROTECTION,
        quan: 1,
    }];
    clearInputQueue();
    pushInput('a'.charCodeAt(0)); // select ring
    pushInput('\n'.charCodeAt(0)); // cancel finger prompt (C yn default '\0')

    const result = await rhack('P'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.player.leftRing, null);
    assert.equal(game.player.rightRing, null);
});

}); // describe
