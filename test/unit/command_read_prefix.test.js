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
        messageNeedsMore: false,
        putstr_message(msg) {
            this.topMessage = msg;
            this.messageNeedsMore = true;
        },
    };
    return { player, map, display, fov: null, flags: { verbose: false }, menuRequested: false };
}

test('m-prefix does not block read command prompt', async () => {
    const game = makeGame();
    clearInputQueue();
    await rhack('m'.charCodeAt(0), game);
    assert.equal(game.menuRequested, true);

    pushInput(' '.charCodeAt(0)); // cancel read prompt
    const result = await rhack('r'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.menuRequested, false);
    assert.equal(game.display.topMessage, 'Never mind.');
});
