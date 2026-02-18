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
        { invlet: 'b', oclass: 1, name: 'dagger' },
        { invlet: 'd', oclass: 7, name: 'potion of healing' },
    ];

    const display = {
        topMessage: null,
        messages: [],
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

describe('throw prompt behavior', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('shows inventory letters in throw prompt using C-style format', async () => {
        const game = makeGame();
        pushInput(27);

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [b or ?*]');
        assert.equal(game.display.topMessage, 'Never mind.');
    });

    it('still allows selecting a non-weapon inventory letter manually', async () => {
        const game = makeGame();
        pushInput('d'.charCodeAt(0));
        pushInput(27);

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[1], 'In what direction?');
        assert.equal(game.display.topMessage, 'Never mind.');
    });

    it('treats "-" selection as mime-throw cancel', async () => {
        const game = makeGame();
        pushInput('-'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, 'You mime throwing something.');
    });

    it('does not suggest currently wielded weapon as default throw choice', async () => {
        const game = makeGame();
        game.player.weapon = game.player.inventory[0];
        pushInput(27);
        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [*]');
    });
});
