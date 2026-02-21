import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { LONG_SWORD, SMALL_SHIELD } from '../../js/objects.js';
import { mksobj } from '../../js/mkobj.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const sword = mksobj(LONG_SWORD, true, false);
    sword.invlet = 'a';
    sword.known = true;
    sword.dknown = true;
    sword.bknown = true;
    sword.spe = 1;
    sword.cursed = false;
    sword.blessed = false;
    player.inventory = [sword];

    const display = {
        topMessage: null,
        messageNeedsMore: false,
        putstr_message(msg) {
            this.topMessage = msg;
            this.messageNeedsMore = true;
        },
        clearRow() {},
    };

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
}

describe('drop message formatting', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('uses full object name instead of bare item.name', async () => {
        const game = makeGame();
        pushInput('a'.charCodeAt(0));
        const result = await rhack('d'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.topMessage, 'You drop a +1 long sword.');
    });

    it('rejects dropping worn armor pieces directly', async () => {
        const game = makeGame();
        const shield = mksobj(SMALL_SHIELD, true, false);
        shield.invlet = 'b';
        game.player.inventory.push(shield);
        game.player.shield = shield;

        pushInput('b'.charCodeAt(0));
        const result = await rhack('d'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, 'You cannot drop something you are wearing.');
        assert.equal(game.player.inventory.includes(shield), true);
        assert.equal(game.player.shield, shield);
    });

    it('supports selecting an item letter from the ? overlay menu', async () => {
        const game = makeGame();
        const shield = mksobj(SMALL_SHIELD, true, false);
        shield.invlet = 'b';
        game.player.inventory.push(shield);

        game.display.cols = 80;
        game.display.renderOverlayMenu = () => 0;

        pushInput('?'.charCodeAt(0));
        pushInput('j'.charCodeAt(0)); // consumed while menu stays open
        pushInput('b'.charCodeAt(0)); // menu selection letter

        const result = await rhack('d'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.includes(shield), false);
        assert.match(game.display.topMessage, /^You drop /);
    });
});
