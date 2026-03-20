import { describe, test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { WAND_CLASS } from '../../js/objects.js';
import { ROOM } from '../../js/const.js';

describe('engrave prompt', () => {

    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

function makeGame() {
    const map = new GameMap();
    // Ensure player's cell has a valid floor type so u_can_engrave succeeds
    const loc = map.at(10, 10) || {};
    loc.typ = ROOM;
    if (typeof map.setTyp === 'function') map.setTyp(10, 10, ROOM);
    else if (map.levl) { if (!map.levl[10]) map.levl[10] = []; map.levl[10][10] = loc; }
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [
        { oclass: WAND_CLASS, otyp: 0, invlet: 'f', name: 'sleep', spe: 7 },
    ];
    const display = {
        topMessage: null,
        messages: [],
        putstr_message(msg) {
            this.topMessage = msg;
            this.messages.push(msg);
        },
        clearRow() {},
    };
    return { player, map, display, fov: null, flags: { verbose: false } };
}

test('engrave prompt stays open on invalid keys and cancels on enter', async () => {
    const game = makeGame();
    clearInputQueue();
    pushInput('S'.charCodeAt(0));
    pushInput('P'.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('E'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[0], 'What do you want to write with? [- f or ?*] ');
    assert.equal(game.display.messages.at(-1), 'Never mind.');
    assert.equal(game.display.topMessage, 'Never mind.');
});

}); // describe
