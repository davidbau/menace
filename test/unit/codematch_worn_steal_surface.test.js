import test from 'node:test';
import assert from 'node:assert/strict';

import {
    bypass_obj,
    bypass_objlist,
    clear_bypass,
    clear_bypasses,
    nxt_unbypassed_obj,
    nxt_unbypassed_loot,
} from '../../js/worn.js';
import {
    thiefdead,
    maybe_absorb_item,
    mdrop_special_objs,
    stealarm,
    unstolenarm,
    stealamulet,
} from '../../js/steal.js';
import {
    AMULET_OF_YENDOR,
    FAKE_AMULET_OF_YENDOR,
    BELL_OF_OPENING,
    WEAPON_CLASS,
} from '../../js/objects.js';

test('worn bypass_obj and bypass_objlist set bypass flags', () => {
    globalThis.gs = { svc: { context: { bypasses: false } } };
    const a = { bypass: 0 };
    const b = { bypass: 0 };
    bypass_obj(a);
    assert.equal(a.bypass, 1);
    assert.equal(globalThis.gs.svc.context.bypasses, true);
    bypass_objlist([a, b], false);
    assert.equal(a.bypass, 0);
    assert.equal(b.bypass, 0);
});

test('worn clear_bypass and nxt_unbypassed_obj support linked chains', () => {
    const c = { bypass: 1, nobj: null };
    const b = { bypass: 0, nobj: c };
    const a = { bypass: 1, nobj: b };
    clear_bypass(a);
    assert.equal(a.bypass, 0);
    assert.equal(b.bypass, 0);
    assert.equal(c.bypass, 0);
    const first = nxt_unbypassed_obj(a);
    assert.equal(first, a);
    assert.equal(a.bypass, 1);
});

test('worn nxt_unbypassed_loot returns first unbypassed valid object', () => {
    const o1 = { bypass: 1, nobj: null };
    const o2 = { bypass: 0, nobj: null };
    o1.nobj = o2;
    const picked = nxt_unbypassed_loot([{ obj: o1 }, { obj: o2 }], o1);
    assert.equal(picked, o2);
    assert.equal(o2.bypass, 1);
});

test('worn clear_bypasses resets map and inventory bypass bits', () => {
    const floor = { bypass: 1 };
    const inv = { bypass: 1 };
    globalThis.gs = {
        svc: { context: { bypasses: true } },
        map: { objects: [floor], monsters: [] },
        player: { inventory: [inv] },
    };
    clear_bypasses();
    assert.equal(floor.bypass, 0);
    assert.equal(inv.bypass, 0);
    assert.equal(globalThis.gs.svc.context.bypasses, false);
});

test('steal thiefdead rewrites afternmv from stealarm to unstolenarm', () => {
    globalThis.gs = { stealmid: 99 };
    globalThis.gs.afternmv = maybe_absorb_item; // non-matching baseline
    thiefdead();
    assert.equal(globalThis.gs.stealmid, 0);

    globalThis.gs = { stealmid: 77, afternmv: null, nomovemsg: 'x' };
    globalThis.gs.afternmv = stealarm;
    thiefdead();
    assert.equal(globalThis.gs.afternmv, unstolenarm);
    assert.equal(globalThis.gs.nomovemsg, null);
});

test('steal maybe_absorb_item moves carried object to monster inventory', async () => {
    const player = { inventory: [] };
    const obj = { o_id: 1, oclass: WEAPON_CLASS, otyp: 18, owornmask: 0, name: 'arrow' };
    const mon = { mndx: 1, mx: 3, my: 4, minvent: [] };
    player.inventory.push(obj);
    const display = { putstr_message: async () => {} };
    const absorbed = await maybe_absorb_item(mon, obj, 100, 100, player, display);
    assert.equal(absorbed, true);
    assert.equal(player.inventory.includes(obj), false);
    assert.equal(mon.minvent.includes(obj), true);
});

test('steal mdrop_special_objs drops invocation item from monster inventory', () => {
    const special = { otyp: AMULET_OF_YENDOR, owornmask: 0, bypass: 0 };
    const mon = { mndx: 1, mx: 8, my: 9, minvent: [special], dead: false };
    const map = { objects: [] };
    mdrop_special_objs(mon, map);
    assert.equal(mon.minvent.length, 0);
    assert.equal(map.objects.length, 1);
    assert.equal(map.objects[0].otyp, AMULET_OF_YENDOR);
});

test('stealamulet steals fake amulet from non-wizard and updates uhave flags', async () => {
    const fake = { otyp: FAKE_AMULET_OF_YENDOR, oclass: 5, owornmask: 0 };
    const player = {
        inventory: [fake],
        uhave: { amulet: true },
        removeFromInventory(obj) {
            const idx = this.inventory.indexOf(obj);
            if (idx >= 0) this.inventory.splice(idx, 1);
        },
    };
    const mon = { mndx: 2, mx: 4, my: 4, minvent: [], iswiz: false, data: {} };
    const msgs = [];
    const display = { putstr_message: async (s) => msgs.push(s) };
    const rv = await stealamulet(mon, player, display, null);
    assert.equal(rv, 1);
    assert.equal(player.inventory.length, 0);
    assert.equal(mon.minvent.length, 1);
    assert.equal(mon.minvent[0].otyp, FAKE_AMULET_OF_YENDOR);
    assert.equal(player.uhave.amulet, true);
    assert.ok(msgs.some((m) => m.includes('steals')));
});

test('stealamulet ignores fake amulet for Wizard and steals real bell', async () => {
    const fake = { otyp: FAKE_AMULET_OF_YENDOR, oclass: 5, owornmask: 0 };
    const bell = { otyp: BELL_OF_OPENING, oclass: 2, owornmask: 0 };
    const player = {
        inventory: [fake, bell],
        uhave: { amulet: false, bell: true },
        removeFromInventory(obj) {
            const idx = this.inventory.indexOf(obj);
            if (idx >= 0) this.inventory.splice(idx, 1);
        },
    };
    const mon = { mndx: 3, mx: 4, my: 4, minvent: [], iswiz: true, data: {} };
    const rv = await stealamulet(mon, player, null, null);
    assert.equal(rv, 1);
    assert.equal(mon.minvent.length, 1);
    assert.equal(mon.minvent[0].otyp, BELL_OF_OPENING);
    assert.equal(player.uhave.bell, false);
});
