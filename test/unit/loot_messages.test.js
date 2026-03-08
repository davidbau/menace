import { describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { handleLoot } from '../../js/pickup.js';
import { objectData, CHEST, APPLE, CARROT } from '../../js/objects.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';

describe('loot messaging', () => {
    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

    it('shows each looted item instead of only a summary count', async () => {
        const apple = { otyp: APPLE, oclass: objectData[APPLE].oc_class, quan: 1, dknown: true };
        const carrot = { otyp: CARROT, oclass: objectData[CARROT].oc_class, quan: 1, dknown: true };
        const chest = {
            otyp: CHEST,
            oclass: objectData[CHEST].oc_class,
            cobj: [apple, carrot],
            olocked: false,
            obroken: false,
        };

        const messages = [];
        const game = {
            player: {
                x: 10,
                y: 5,
                inventory: [],
                addToInventory(obj) { this.inventory.push(obj); },
            },
            map: {
                objectsAt(x, y) {
                    return (x === 10 && y === 5) ? [chest] : [];
                },
            },
            display: {
                async putstr_message(msg) { messages.push(String(msg)); },
            },
        };

        // containerMenu: 'o' = take out interactively.
        // '@' selects all items, Enter confirms.
        clearInputQueue();
        pushInput('o'.charCodeAt(0));
        pushInput('@'.charCodeAt(0)); // select all
        pushInput('\n'.charCodeAt(0)); // confirm

        const result = await handleLoot(game);

        assert.equal(result.tookTime, true);
        assert.equal(chest.cobj.length, 0);
        assert.equal(game.player.inventory.length, 2);
    });
});
