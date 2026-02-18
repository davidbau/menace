import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { ARMOR_CLASS, RING_MAIL } from '../../js/objects.js';

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

describe('wear command prompt parity', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('reports no additional armor when only currently worn armor is available', async () => {
        const game = makeGame();
        const armor = {
            invlet: 'c',
            oclass: ARMOR_CLASS,
            otyp: RING_MAIL,
            name: 'ring mail',
            quan: 1,
            known: true,
            dknown: true,
            bknown: true,
            blessed: false,
            cursed: false,
            spe: 0,
            ac: 3,
        };
        game.player.inventory = [armor];
        game.player.armor = armor;
        game.player.ac = 7;

        const result = await rhack('W'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, "You don't have anything else to wear.");
    });

    it('still allows wearing an unworn armor item', async () => {
        const game = makeGame();
        const armor = {
            invlet: 'c',
            oclass: ARMOR_CLASS,
            otyp: RING_MAIL,
            name: 'ring mail',
            quan: 1,
            known: true,
            dknown: true,
            bknown: true,
            blessed: false,
            cursed: false,
            spe: 0,
            ac: 3,
        };
        game.player.inventory = [armor];
        pushInput('c'.charCodeAt(0));

        const result = await rhack('W'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.player.armor, armor);
    });
});
