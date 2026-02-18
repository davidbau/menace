import test from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [];
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

test('fire command keeps prompt open until canceled', async () => {
    const game = makeGame();
    clearInputQueue();
    pushInput('u'.charCodeAt(0));
    pushInput('l'.charCodeAt(0));
    pushInput('l'.charCodeAt(0));
    pushInput(' '.charCodeAt(0));

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[0], 'What do you want to fire? [*]');
    assert.equal(game.display.topMessage, 'Never mind.');
});
