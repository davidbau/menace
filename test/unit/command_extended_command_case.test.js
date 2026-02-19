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

    const display = {
        topMessage: null,
        messages: [],
        clearRow() {},
        putstr() {},
        putstr_message(msg) {
            this.topMessage = msg;
            this.messages.push(msg);
        },
    };

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
}

test('extended command unknown feedback preserves typed casing', async () => {
    clearInputQueue();
    const game = makeGame();

    for (const ch of 'Oyce') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);

    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, '#Oyce: unknown extended command.');
});
