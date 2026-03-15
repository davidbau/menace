import test from 'node:test';
import assert from 'node:assert/strict';

import { setGame } from '../../js/gstate.js';
import {
    display_used_invlets,
    doperminv,
    dotypeinv,
    dounpaid,
    count_unidentified,
} from '../../js/invent.js';
import { ORCISH_DAGGER, FOOD_RATION, WEAPON_CLASS, FOOD_CLASS, LARGE_BOX } from '../../js/objects.js';

function makeDisplay() {
    const messages = [];
    return {
        messages,
        async putstr_message(msg) {
            messages.push(String(msg));
        },
    };
}

function makePlayer() {
    return {
        inventory: [
            {
                otyp: ORCISH_DAGGER,
                oclass: WEAPON_CLASS,
                invlet: 'a',
                quan: 1,
                unpaid: false,
                known: false,
                bknown: false,
                rknown: false,
                dknown: false,
            },
            {
                otyp: FOOD_RATION,
                oclass: FOOD_CLASS,
                invlet: 'b',
                quan: 1,
                unpaid: true,
                known: true,
                bknown: true,
                rknown: true,
                dknown: true,
            },
            {
                otyp: LARGE_BOX,
                oclass: FOOD_CLASS,
                invlet: 'c',
                quan: 1,
                unpaid: false,
                known: true,
                bknown: true,
                rknown: true,
                dknown: true,
                cobj: [
                    {
                        otyp: FOOD_RATION,
                        oclass: FOOD_CLASS,
                        invlet: 'd',
                        quan: 1,
                        unpaid: true,
                        known: true,
                        bknown: true,
                        rknown: true,
                        dknown: true,
                    },
                ],
            },
        ],
        gold: 0,
    };
}

test('display_used_invlets reports current letters', async () => {
    const display = makeDisplay();
    const player = makePlayer();
    setGame({ player, display, flags: {} });

    const msg = display_used_invlets();

    assert.equal(msg, 'Used inventory letters: abc');
    assert.equal(display.messages.at(-1), 'Used inventory letters: abc');
    setGame(null);
});

test('doperminv toggles perm_invent and reports state', async () => {
    const display = makeDisplay();
    const player = makePlayer();
    const game = { player, display, flags: { perm_invent: false } };
    setGame(game);

    await doperminv();
    assert.equal(game.flags.perm_invent, true);
    await doperminv();
    assert.equal(game.flags.perm_invent, false);
    assert.match(display.messages.join('\n'), /Permanent inventory display enabled\./);
    assert.match(display.messages.join('\n'), /Permanent inventory display disabled\./);

    setGame(null);
});

test('dotypeinv renders inventory lines when carrying items', async () => {
    const display = makeDisplay();
    const player = makePlayer();
    setGame({ player, display, flags: {} });

    await dotypeinv();

    assert.ok(display.messages.length > 0);
    assert.ok(display.messages.some((m) => m.includes('Weapons')));
    setGame(null);
});

test('dounpaid reports unpaid items including container contents', async () => {
    const display = makeDisplay();
    const player = makePlayer();
    setGame({ player, display, flags: {} });

    await dounpaid();

    assert.equal(display.messages[0], 'Unpaid items:');
    assert.ok(display.messages.some((m) => m.includes('b -')));
    assert.ok(display.messages.some((m) => m.includes('c -')));
    setGame(null);
});

test('count_unidentified handles array inventories', () => {
    const player = makePlayer();
    assert.equal(count_unidentified(player.inventory), 2);
});
