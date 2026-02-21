import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';

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

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
}

describe('look command', () => {
    it('reports no objects when current square is empty', async () => {
        const game = makeGame();
        const result = await rhack(':'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(result.moved, false);
        assert.equal(game.display.topMessage, 'You see no objects here.');
    });
});
