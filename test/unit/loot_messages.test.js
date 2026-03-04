import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { handleLoot } from '../../js/pickup.js';
import { objectData, CHEST, APPLE, CARROT } from '../../js/objects.js';

describe('loot messaging', () => {
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

        const result = await handleLoot(game);

        assert.equal(result.tookTime, true);
        assert.equal(messages.length, 2);
        assert.equal(messages[0].startsWith('You loot '), true);
        assert.equal(messages[1].startsWith('You loot '), true);
        assert.equal(messages.some((m) => m.includes('You loot 2 items.')), false);
        assert.equal(chest.cobj.length, 0);
        assert.equal(game.player.inventory.length, 2);
    });
});
