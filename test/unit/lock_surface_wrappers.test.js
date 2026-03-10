import test from 'node:test';
import assert from 'node:assert/strict';

import { DOOR, D_CLOSED, M_AP_FURNITURE } from '../../js/const.js';
import {
    doopen_indir,
    forcelock,
    picklock,
    stumble_on_door_mimic,
} from '../../js/lock.js';

function makeDisplay(messages) {
    return {
        topMessage: null,
        messageNeedsMore: false,
        async putstr_message(msg) {
            messages.push(String(msg));
            this.topMessage = String(msg);
        },
    };
}

test('stumble_on_door_mimic reveals door mimic', async () => {
    const mon = { m_ap_type: M_AP_FURNITURE, mappearance: DOOR };
    const map = {
        monsterAt: () => mon,
    };
    const hit = await stumble_on_door_mimic(5, 5, map);
    assert.equal(hit, true);
    assert.equal(mon.m_ap_type, 0);
    assert.equal(mon.mappearance, null);
});

test('doopen_indir returns a command result for closed door attempt', async () => {
    const messages = [];
    const display = makeDisplay(messages);
    const loc = { typ: DOOR, flags: D_CLOSED };
    const map = {
        at: () => loc,
        monsterAt: () => null,
        objectsAt: () => [],
    };
    const player = { x: 10, y: 10, attributes: [18, 18, 18, 18, 18, 18] };
    const res = await doopen_indir(player, map, display, { player, map, display }, 1, 0);
    assert.equal(res.moved, false);
    assert.equal(typeof res.tookTime, 'boolean');
    assert.equal(res.tookTime, true);
    assert.ok(messages.some((m) => m.includes('door')));
});

test('forcelock wrapper exits when no target box is set', async () => {
    const game = {
        xlock: { usedtime: 0, chance: 0, picktyp: 0, magic_key: false, door: null, box: null },
        player: { weapon: null },
        map: { objectsAt: () => [] },
        display: makeDisplay([]),
    };
    const busy = await forcelock(game);
    assert.equal(busy, false);
});

test('picklock wrapper returns busy/finished state without throwing', async () => {
    const game = {
        xlock: { usedtime: 0, chance: 0, picktyp: 0, magic_key: false, door: null, box: null },
        player: {},
        map: { at: () => null, objectsAt: () => [] },
        display: makeDisplay([]),
    };
    const busy = await picklock(game);
    assert.equal(typeof busy, 'boolean');
});
