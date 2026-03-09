import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM, STONE } from '../../js/const.js';
import { check_pos, set_seenv, swallow_to_glyph } from '../../js/display.js';
import { S_sw_tl, S_sw_br } from '../../js/symbols.js';

test('swallow_to_glyph returns numeric glyph in valid swallow range', () => {
    const g = swallow_to_glyph(5, S_sw_tl);
    assert.equal(Number.isInteger(g), true);
    const g2 = swallow_to_glyph(5, S_sw_br);
    assert.equal(Number.isInteger(g2), true);
    assert.notEqual(g, g2);
});

test('check_pos supports map.at style maps', () => {
    const map = { at: () => ({ typ: STONE }) };
    assert.equal(check_pos(12, 10, 1, map), 1);
});

test('set_seenv sets direction visibility bits without undefined helpers', () => {
    const lev = { seenv: 0 };
    set_seenv(lev, 10, 10, 11, 10);
    assert.equal(lev.seenv !== 0, true);
});

test('check_pos returns 0 on non-wall/non-corr tiles', () => {
    const map = { at: () => ({ typ: ROOM }) };
    assert.equal(check_pos(12, 10, 1, map), 0);
});
