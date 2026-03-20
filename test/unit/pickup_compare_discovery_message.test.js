import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Player } from '../../js/player.js';
import { handlePickup } from '../../js/pickup.js';
import { POT_HEALING, POTION_CLASS, GOLD_PIECE, COIN_CLASS } from '../../js/objects.js';
import { clearInputQueue, getInputQueueLength, pushInput, setThrowOnEmptyInput } from '../../js/input.js';

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

test('mixed gold floor piles still use pickup menu with $ selector', async () => {
    clearInputQueue();
    setThrowOnEmptyInput(true);

    const player = new Player();
    player.initRole(0);
    player.x = 10;
    player.y = 10;

    const gold = {
        otyp: GOLD_PIECE,
        oclass: COIN_CLASS,
        quan: 10,
        ox: 10,
        oy: 10,
        where: 1,
    };
    const potion = {
        otyp: POT_HEALING,
        oclass: POTION_CLASS,
        quan: 1,
        ox: 10,
        oy: 10,
        where: 1,
    };

    const map = {
        objects: [gold, potion],
        objectsAt(x, y) {
            return this.objects.filter((o) => o.ox === x && o.oy === y);
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
            messages.push(String(msg));
        },
    };

    pushInput('$'.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await handlePickup(player, map, display, { flags: {} });

    assert.equal(result.tookTime, true);
    assert.equal(player.gold, 10);
    assert.equal(map.objects.includes(gold), false);
    assert.equal(map.objects.includes(potion), true);
    assert.equal(getInputQueueLength(), 0, 'menu keys should be consumed by pickup flow');
});
