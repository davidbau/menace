import test from 'node:test';
import assert from 'node:assert/strict';

import {
    display_inventory_items,
    display_inventory,
    getobj,
    ggetobj,
} from '../../js/invent.js';
import { WEAPON_CLASS, TOOL_CLASS } from '../../js/objects.js';

test('display_inventory_items filters by invlet and class symbol', () => {
    const player = {
        inventory: [
            { invlet: 'a', oclass: WEAPON_CLASS },
            { invlet: 'b', oclass: TOOL_CLASS },
        ],
    };

    assert.equal(display_inventory_items('', player).length, 2);
    assert.deepEqual(
        display_inventory_items(')', player).map((o) => o.invlet),
        ['a']
    );
    assert.deepEqual(
        display_inventory_items('b', player).map((o) => o.invlet),
        ['b']
    );
});

test('display_inventory returns NUL when no display runtime is available', async () => {
    const player = {
        inventory: [
            { invlet: 'a', oclass: WEAPON_CLASS },
        ],
    };

    const selected = await display_inventory(')', true, player, null);
    assert.equal(selected, '\0');
});

test('getobj C-name wrapper delegates to simplified selector', () => {
    const player = {
        inventory: [
            { invlet: 'a', oclass: WEAPON_CLASS },
            { invlet: 'b', oclass: TOOL_CLASS },
        ],
    };
    const selected = getobj('apply', (obj) => (obj.invlet === 'b' ? 1 : 0), 0, player);
    assert.equal(selected?.invlet, 'b');
});

test('ggetobj C-name wrapper returns simplified inventory count', () => {
    const player = {
        inventory: [
            { invlet: 'a', oclass: WEAPON_CLASS },
            { invlet: 'b', oclass: TOOL_CLASS },
        ],
    };
    const count = ggetobj('take off', null, 0, null, player);
    assert.equal(count, 2);
});
