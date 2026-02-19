import { beforeEach, describe, it } from 'node:test';
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
    player.inventory = [
        { invlet: 'a', oclass: 1, name: 'dagger' },
        { invlet: 'd', oclass: 7, name: 'potion of healing' },
        { invlet: 'e', oclass: 7, name: 'potion of healing' },
    ];

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

describe('quaff prompt', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('rejects non-potion inventory letters with C-style message', async () => {
        const game = makeGame();
        pushInput('a'.charCodeAt(0));
        const result = await rhack('q'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, 'That is a silly thing to drink.');
    });

    it('extra healing at full HP increases max HP like C healup overflow', async () => {
        const game = makeGame();
        game.player.hp = 10;
        game.player.hpmax = 10;
        game.player.inventory.push({ invlet: 'k', oclass: 7, name: 'potion of extra healing' });
        pushInput('k'.charCodeAt(0));

        const result = await rhack('q'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.topMessage, 'You feel much better.');
        assert.equal(game.player.hp, 12);
        assert.equal(game.player.hpmax, 12);
    });
});
