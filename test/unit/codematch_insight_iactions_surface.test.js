import test from 'node:test';
import assert from 'node:assert/strict';

import { SCROLL_CLASS, SPBOOK_CLASS, FORTUNE_COOKIE, T_SHIRT, DAGGER } from '../../js/objects.js';
import {
    item_naming_classification,
    item_reading_classification,
    itemactions,
    itemactions_pushkeys,
} from '../../js/iactions.js';
import {
    attributes_enlightenment,
    cause_known,
    show_achievements,
} from '../../js/insight.js';

test('iactions: reading and naming classification surfaces return actionable text', () => {
    const readBuf = { value: '' };
    const nameBuf = { value: '' };
    const callBuf = { value: '' };

    const scroll = { otyp: 0, oclass: SCROLL_CLASS, dknown: true };
    const rc = item_reading_classification(scroll, readBuf);
    assert.ok(rc > 0);
    assert.match(readBuf.value, /Read/i);

    const obj = { otyp: DAGGER, oclass: 2, oname: '' };
    const nc = item_naming_classification(obj, nameBuf, callBuf);
    assert.ok(nc > 0);
    assert.match(nameBuf.value, /Name/i);
    assert.match(callBuf.value, /Call|Rename/i);
});

test('iactions: itemactions menu and pushkeys expose stable action wiring', () => {
    const cookie = { otyp: FORTUNE_COOKIE, oclass: 0 };
    const rows = itemactions(cookie);
    assert.ok(Array.isArray(rows));
    assert.ok(rows.length >= 2);
    assert.deepEqual(itemactions_pushkeys(cookie, 'read'), ['r']);
});

test('insight: cause_known supports array and object representations', () => {
    assert.equal(cause_known('petrification', { knownCauses: ['petrification'] }), true);
    assert.equal(cause_known('lava', { known_causes: { lava: true } }), true);
    assert.equal(cause_known('lava', { known_causes: {} }), false);
});

test('insight: attributes_enlightenment surface runs on minimal game object', async () => {
    const game = { player: { name: 'Hero', role: 'Knight', ulevel: 1, uhp: 10, uhpmax: 10, ac: 10 } };
    const rc = await attributes_enlightenment(0, 0, game);
    assert.equal(rc, 0);
});

test('insight: show_achievements returns text lines without display dependency', async () => {
    const game = { player: { uachieved: [1, 2, 6] } };
    const lines = await show_achievements(0, game);
    assert.ok(Array.isArray(lines));
    assert.ok(lines.length >= 2);
});

