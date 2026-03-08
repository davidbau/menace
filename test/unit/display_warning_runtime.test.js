import test from 'node:test';
import assert from 'node:assert/strict';

import { display_warning, warning_of, mon_warning, newsym, senseMonsterForMap } from '../../js/display.js';
import { setGame } from '../../js/gstate.js';
import { ROOM } from '../../js/const.js';

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

test('newsym uses warning glyph (not monster glyph) for warning-only sensing', () => {
    const cells = [];
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
    };
    const loc = {
        typ: ROOM,
        mem_invis: false,
        seenv: 1,
        flags: 0,
        waslit: true,
    };
    const mon = {
        mx: 12,
        my: 10,
        m_lev: 8,
        mhp: 12,
        mpeaceful: 0,
        mtame: 0,
        minvis: true, // not visible without see-invisible
        mundetected: 0,
    };
    const player = {
        x: 10,
        y: 10,
        warning: true,
    };
    const map = {
        at: () => loc,
        monsterAt: () => mon,
        objectsAt: () => [],
        trapAt: () => null,
        engravingAt: () => null,
    };
    const fov = { canSee: () => true };
    setGame({ display, map, player, fov, flags: { msg_window: false } });
    try {
        newsym(12, 10);
    } finally {
        setGame(null);
    }
    assert.equal(cells.length > 0, true);
    const cell = cells[cells.length - 1];
    assert.equal(cell.x, 11);
    assert.equal(cell.y, 11);
    // C-faithful behavior: warning-only sensing draws warning glyph path
    // and should not mark monster as physically displayed/seen.
    assert.notEqual(mon.meverseen, 1);
});

test('senseMonsterForMap: WARNING does not sense peaceful monsters', () => {
    const player = { x: 10, y: 10, warning: true };
    const mon = { mx: 12, my: 10, m_lev: 8, mhp: 12, mpeaceful: 1, mtame: 0 };
    const map = { at: () => ({ typ: ROOM }) };
    assert.equal(senseMonsterForMap(mon, map, player), false);
});

test('senseMonsterForMap: WARNING senses hostile monsters', () => {
    const player = { x: 10, y: 10, warning: true };
    const mon = { mx: 12, my: 10, m_lev: 8, mhp: 12, mpeaceful: 0, mtame: 0 };
    const map = { at: () => ({ typ: ROOM }) };
    assert.equal(senseMonsterForMap(mon, map, player), true);
});
