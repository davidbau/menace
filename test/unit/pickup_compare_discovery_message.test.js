import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Player } from '../../js/player.js';
import { handlePickup } from '../../js/pickup.js';
import { POT_HEALING, POTION_CLASS } from '../../js/objects.js';

test('pickup merge comparison emits discovery message', async () => {
    const player = new Player();
    player.initRole(0);
    player.x = 10;
    player.y = 10;

    player.inventory = [{
        otyp: POT_HEALING,
        oclass: POTION_CLASS,
        quan: 1,
        invlet: 'a',
        name: 'potion of healing',
        known: true,
        rknown: true,
        bknown: true,
    }];

    const floorObj = {
        otyp: POT_HEALING,
        oclass: POTION_CLASS,
        quan: 1,
        x: 10,
        y: 10,
        name: 'potion of healing',
        known: false,
        rknown: false,
        bknown: false,
    };

    const map = {
        objects: [floorObj],
        objectsAt(x, y) {
            return this.objects.filter((o) => o.x === x && o.y === y);
        },
        removeObject(obj) {
            this.objects = this.objects.filter((o) => o !== obj);
        },
        at() {
            return { typ: 0, flags: 0 };
        },
        trapAt() {
            return null;
        },
    };

    const messages = [];
    const display = {
        cols: 80,
        async putstr_message(msg) {
            messages.push(msg);
        },
    };

    const result = await handlePickup(player, map, display, { flags: {} });
    assert.equal(result.tookTime, true);
    assert.ok(
        messages.includes('You learn more about your items by comparing them.'),
        'expected compare-discovery message when merged stacks reveal knowledge'
    );
});
