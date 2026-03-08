import { describe, test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { ARMOR_CLASS, WEAPON_CLASS } from '../../js/objects.js';

describe('drop count prompt', () => {

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
    player.inventory = [
        { invlet: 'b', oclass: WEAPON_CLASS, name: 'short sword' },
        { invlet: 'c', oclass: ARMOR_CLASS, name: 'ring mail' },
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

test('drop prompt supports count entry via Ctrl+V digits', async () => {
    const game = makeGame();
    clearInputQueue();
    pushInput('P'.charCodeAt(0));
    pushInput('e'.charCodeAt(0));
    pushInput(22); // Ctrl+V
    pushInput('1'.charCodeAt(0));
    pushInput('8'.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('d'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.messages.includes('Count: 18'));
    assert.equal(game.display.topMessage, 'Never mind.');
});

}); // describe
