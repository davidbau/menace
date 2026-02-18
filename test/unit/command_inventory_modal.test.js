import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { COIN_CLASS, GOLD_PIECE } from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [{
        oclass: COIN_CLASS,
        otyp: GOLD_PIECE,
        invlet: '$',
        quan: 10,
        known: true,
        dknown: true,
        bknown: true,
        blessed: false,
        cursed: false,
        spe: 0,
    }];

    const display = {
        topMessage: null,
        lastOverlay: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
        renderOverlayMenu(lines) {
            this.lastOverlay = lines;
        },
        renderChargenMenu(lines) {
            this.lastOverlay = lines;
        },
    };

    return {
        game: {
            player,
            map,
            display,
            fov: null,
            flags: { verbose: true },
            menuRequested: false,
        },
    };
}

describe('inventory modal dismissal', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('keeps inventory open on non-dismiss keys and closes on space', async () => {
        const { game } = makeGame();
        pushInput('o'.charCodeAt(0));

        const pending = rhack('i'.charCodeAt(0), game);
        const early = await Promise.race([
            pending.then(() => 'resolved'),
            new Promise((resolve) => setTimeout(() => resolve('pending'), 30)),
        ]);

        assert.equal(early, 'pending');
        pushInput(' '.charCodeAt(0));

        const result = await pending;
        assert.equal(result.tookTime, false);
        assert.ok(Array.isArray(game.display.lastOverlay));
    });

    it('closes inventory on enter', async () => {
        const { game } = makeGame();
        pushInput('\n'.charCodeAt(0));
        const result = await rhack('i'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(Array.isArray(game.display.lastOverlay));
    });
});
