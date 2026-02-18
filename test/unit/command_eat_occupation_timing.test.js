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
    const ration = {
        invlet: 'd',
        oclass: 6,
        otyp: 291, // FOOD_RATION
        name: 'food ration',
        quan: 1,
    };
    player.inventory = [ration];

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

describe('eat occupation timing', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('removes inventory food when occupation finishes (before post-turn callbacks)', async () => {
        const game = makeGame();
        const ration = game.player.inventory[0];
        pushInput('d'.charCodeAt(0));

        const result = await rhack('e'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.ok(game.occupation, 'expected eating occupation');
        assert.ok(game.player.inventory.includes(ration), 'food should remain during ongoing occupation');

        let sawContinue = false;
        let removedOnDone = false;

        while (game.occupation) {
            const hadBefore = game.player.inventory.includes(ration);
            const cont = game.occupation.fn();
            const hasAfter = game.player.inventory.includes(ration);
            if (cont) {
                sawContinue = true;
                assert.ok(hasAfter, 'food should still be present on non-final occupation turns');
            } else {
                removedOnDone = hadBefore && !hasAfter;
                game.occupation = null;
            }
        }

        assert.ok(sawContinue, 'food ration should require multiple occupation turns');
        assert.ok(removedOnDone, 'food should be removed on the finishing occupation turn');
    });
});
