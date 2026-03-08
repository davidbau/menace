import test from 'node:test';
import assert from 'node:assert/strict';

import {
    map_background,
    map_object,
    map_trap,
    map_location,
} from '../../js/display.js';
import { ROOM } from '../../js/const.js';

function makeCtx(locOverrides = {}) {
    const loc = {
        typ: ROOM,
        seenv: 1,
        flags: 0,
        waslit: true,
        mem_obj: 0,
        mem_obj_color: 0,
        mem_trap: 0,
        mem_trap_color: 0,
        mem_terrain_ch: '.',
        mem_terrain_color: 8,
        ...locOverrides,
    };
    const cells = [];
    const map = {
        at: () => loc,
        objectsAt: () => [],
        trapAt: () => null,
        engravingAt: () => null,
    };
    const display = {
        setCell: (x, y, ch, color) => cells.push({ x, y, ch, color }),
    };
    const player = { x: 10, y: 10 };
    const ctx = { map, display, player, fov: null, flags: { msg_window: false } };
    return { ctx, map, loc, cells };
}

test('map_object stores remembered object glyph', () => {
    const { ctx, loc } = makeCtx();
    const obj = { otyp: 1, quan: 1, ox: 12, oy: 10 };
    map_object(obj, 0, ctx);
    assert.equal(typeof loc.mem_obj, 'string');
    assert.equal(loc.mem_obj.length, 1);
});

test('map_trap stores remembered trap glyph', () => {
    const { ctx, loc } = makeCtx();
    map_trap({ tx: 12, ty: 10, ttyp: 0 }, 0, ctx);
    assert.equal(typeof loc.mem_trap, 'string');
    assert.equal(loc.mem_trap.length, 1);
});

test('map_background records terrain memory and can render when show=1', () => {
    const { ctx, loc, cells } = makeCtx();
    map_background(12, 10, 1, ctx);
    assert.equal(typeof loc.mem_terrain_ch, 'string');
    assert.equal(loc.mem_terrain_ch.length, 1);
    assert.equal(cells.length, 1);
});

test('map_location prefers object over trap/background', () => {
    const { ctx, map, loc } = makeCtx();
    const obj = { otyp: 1, quan: 1, ox: 12, oy: 10 };
    map.objectsAt = () => [obj];
    map.trapAt = () => ({ tx: 12, ty: 10, ttyp: 0, tseen: 1 });
    map_location(12, 10, 0, ctx);
    assert.equal(typeof loc.mem_obj, 'string');
    assert.equal(loc.mem_trap, 0);
});
