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

describe('wallet command', () => {
    it('reports plural zorkmids without consuming time', async () => {
        const game = makeGame();
        game.player.gold = 422;

        const result = await rhack('$'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(result.moved, false);
        assert.equal(game.display.topMessage, 'Your wallet contains 422 zorkmids.');
    });

    it('reports singular zorkmid', async () => {
        const game = makeGame();
        game.player.gold = 1;

        await rhack('$'.charCodeAt(0), game);
        assert.equal(game.display.topMessage, 'Your wallet contains 1 zorkmid.');
    });
});
