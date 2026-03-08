import test from 'node:test';
import assert from 'node:assert/strict';

import { ROOM } from '../../js/const.js';
import { setGame } from '../../js/gstate.js';
import { unmap_invisible, unmap_object } from '../../js/display.js';

function makeLoc(overrides = {}) {
    return {
        typ: ROOM,
        seenv: 1,
        flags: 0,
        waslit: true,
        mem_invis: false,
        mem_obj: '!',
        mem_obj_color: 7,
        mem_trap: 0,
        mem_trap_color: 0,
        mem_terrain_ch: '.',
        mem_terrain_color: 8,
        ...overrides,
    };
}

test('unmap_object clears invisible-memory marker', () => {
    const loc = makeLoc({ mem_invis: true });
    const map = {
        flags: { hero_memory: true },
        at: () => loc,
        trapAt: () => null,
        engravingAt: () => null,
    };
    const ctx = { map, player: { x: 10, y: 10 }, fov: { canSee: () => false }, flags: {} };
    unmap_object(12, 10, ctx);
    assert.equal(loc.mem_invis, false);
});

test('unmap_object prefers remembered seen trap over object memory', () => {
    const loc = makeLoc({ mem_obj: '!', mem_obj_color: 7 });
    const map = {
        flags: { hero_memory: true },
        at: () => loc,
        trapAt: () => ({ ttyp: 0, tseen: 1 }),
        engravingAt: () => null,
    };
    const ctx = { map, player: { x: 10, y: 10 }, fov: { canSee: () => false }, flags: {} };
    unmap_object(12, 10, ctx);
    assert.equal(loc.mem_obj, 0);
    assert.equal(typeof loc.mem_trap, 'string');
    assert.equal(loc.mem_trap.length, 1);
});

test('unmap_object is no-op when hero memory is disabled', () => {
    const loc = makeLoc({ mem_obj: '$' });
    const map = {
        flags: { hero_memory: false },
        at: () => loc,
        trapAt: () => null,
        engravingAt: () => null,
    };
    const ctx = { map, player: { x: 10, y: 10 }, fov: { canSee: () => false }, flags: {} };
    unmap_object(12, 10, ctx);
    assert.equal(loc.mem_obj, '$');
});

test('unmap_invisible clears remembered invisible marker and redraws', () => {
    const loc = makeLoc({ mem_invis: true, mem_obj: 0 });
    const cells = [];
    const map = {
        flags: { hero_memory: true },
        at: () => loc,
        trapAt: () => null,
        engravingAt: () => null,
        monsterAt: () => null,
        objectsAt: () => [],
    };
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
    };
    const player = { x: 10, y: 10 };
    setGame({ display, map, player, fov: { canSee: () => false }, flags: { msg_window: false } });
    try {
        assert.equal(unmap_invisible(12, 10, map), true);
    } finally {
        setGame(null);
    }
    assert.equal(loc.mem_invis, false);
    assert.equal(cells.length > 0, true);
});
