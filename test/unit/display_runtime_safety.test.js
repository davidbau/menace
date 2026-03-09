import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM } from '../../js/const.js';
import { setGame } from '../../js/gstate.js';
import { feel_newsym, glyph_at, newsym_force, under_ground } from '../../js/display.js';

function setupCtx(locOverrides = {}) {
    const loc = {
        typ: ROOM,
        seenv: 1,
        flags: 0,
        waslit: true,
        mem_obj: 0,
        mem_obj_color: 0,
        mem_trap: 0,
        mem_trap_color: 0,
        ...locOverrides,
    };
    const cells = [];
    const map = {
        at: () => loc,
        monsterAt: () => null,
        objectsAt: () => [],
        trapAt: () => null,
        engravingAt: () => null,
    };
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
        rows: 3,
        clearRow: () => {},
    };
    const player = { x: 10, y: 10 };
    const ctx = { display, map, player, fov: { canSee: () => true }, flags: { msg_window: false } };
    return { ctx, map, loc, cells, player };
}

test('glyph_at returns location glyph when present', () => {
    const { ctx } = setupCtx({ glyph: 1234 });
    setGame(ctx);
    try {
        assert.equal(glyph_at(12, 10), 1234);
    } finally {
        setGame(null);
    }
});

test('newsym_force does not require legacy gbuf globals', () => {
    const { ctx, cells } = setupCtx();
    setGame(ctx);
    try {
        assert.doesNotThrow(() => newsym_force(12, 10));
    } finally {
        setGame(null);
    }
    assert.equal(cells.length > 0, true);
});

test('feel_newsym blind path uses felt mapping without throwing', () => {
    const { ctx, cells, player } = setupCtx();
    player.blind = true;
    setGame(ctx);
    try {
        assert.doesNotThrow(() => feel_newsym(12, 10, player));
    } finally {
        setGame(null);
    }
    assert.equal(cells.length > 0, true);
});

test('under_ground uses deferred clear state without undefined symbol crashes', async () => {
    const { ctx, player } = setupCtx();
    setGame(ctx);
    try {
        await under_ground(2, player);
        await under_ground(0, player);
    } finally {
        setGame(null);
    }
    assert.equal(true, true);
});
