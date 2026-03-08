import test from 'node:test';
import assert from 'node:assert/strict';

import { display_warning, warning_of, mon_warning } from '../../js/display.js';

function makeCtx(overrides = {}) {
    const cells = [];
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
    };
    const loc = { typ: 0, mem_invis: false };
    const map = {
        at: () => loc,
    };
    const player = {
        x: 10,
        y: 10,
        warning: true,
        ...overrides.player,
    };
    const ctx = {
        display,
        map,
        player,
        fov: null,
        flags: { msg_window: false },
    };
    return { ctx, cells, loc, player };
}

test('warning_of scales from monster level when warning is active', () => {
    const { player } = makeCtx();
    const mon = { m_lev: 20, mhp: 10, mpeaceful: 0, mtame: 0 };
    assert.equal(mon_warning(mon, player), true);
    assert.equal(warning_of(mon, player), 5);
});

test('display_warning writes a warning glyph cell without throwing', () => {
    const { ctx, cells, loc } = makeCtx();
    const mon = { mx: 12, my: 11, m_lev: 8, mhp: 10, mpeaceful: 0, mtame: 0 };
    display_warning(mon, ctx.player, ctx);
    assert.equal(cells.length, 1);
    assert.equal(cells[0].x, 11);
    assert.equal(cells[0].y, 12);
    assert.equal(typeof cells[0].ch, 'string');
    assert.equal(cells[0].ch.length, 1);
    assert.equal(loc.mem_invis, false);
});
