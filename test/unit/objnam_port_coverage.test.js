import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    fruit_from_name,
    fruit_from_indx,
    fruitname,
    reorder_fruit,
    safe_qbuf,
    set_wallprop_from_str,
    readobjnam_init,
    readobjnam_preparse,
    readobjnam_parse_charges,
    readobjnam_postparse1,
    readobjnam_postparse2,
    readobjnam,
    hands_obj,
    mshot_xname,
    doname_with_price,
    doname_vague_quan,
    wizterrainwish,
    xname_flags,
    doname_base,
    distant_name,
    dbterrainmesg,
} from '../../js/objnam.js';
import { mksobj } from '../../js/mkobj.js';
import { LONG_SWORD } from '../../js/objects.js';
import { STONE, ROOM, WATER, DOOR, D_LOCKED, FIRE_TRAP } from '../../js/config.js';
import { GameMap } from '../../js/map.js';
import { initRng } from '../../js/rng.js';

describe('objnam port coverage', () => {
    it('tracks fruit names and indexes', () => {
        const idx = fruit_from_name('pear');
        assert.ok(idx > 0);
        assert.equal(fruit_from_name('pear', false), idx);
        assert.equal(fruit_from_indx(idx), 'pear');
        assert.equal(fruitname(idx), 'pear');
        reorder_fruit(true);
    });

    it('builds bounded safe_qbuf output', () => {
        const s = safe_qbuf('Really ', '?', 'very long thing name', 'thing', 20);
        assert.ok(s.length <= 20);
    });

    it('maps wall-property strings', () => {
        assert.equal(set_wallprop_from_str('nondiggable'), 'nondiggable');
        assert.equal(set_wallprop_from_str('non-passwall'), 'nonpasswall');
        assert.equal(set_wallprop_from_str('unknown'), null);
    });

    it('preparses readobjnam wish modifiers', () => {
        const state = readobjnam_init();
        const text = readobjnam_preparse(state, '3 blessed +2 long sword');
        assert.equal(text, 'long sword');
        assert.equal(state.quan, 3);
        assert.equal(state.buc, 1);
        assert.equal(state.spe, 2);

        const s2 = readobjnam_init();
        assert.equal(readobjnam_parse_charges(s2, '-1 dagger'), 'dagger');
        assert.equal(s2.spe, -1);
    });

    it('postparses called/labeled and class hints', () => {
        const state = readobjnam_init();
        readobjnam_preparse(state, 'scroll labeled qwerty');
        readobjnam_postparse1(state);
        assert.equal(state.oclass > 0, true);
        assert.equal(state.actualn, 'scroll');
        assert.equal(state.dn, 'qwerty');

        const s2 = readobjnam_init();
        readobjnam_preparse(s2, 'pair of speed boots');
        readobjnam_postparse1(s2);
        assert.equal(s2.actualn, 'speed boots');

        const s3 = readobjnam_init();
        readobjnam_preparse(s3, 'blue gem');
        readobjnam_postparse1(s3);
        readobjnam_postparse2(s3);
        assert.equal(s3.actualn, 'blue');
    });

    it('keeps readobjnam wish path operational', () => {
        initRng(1234);
        const otmp = readobjnam('blessed long sword', false);
        assert.ok(otmp);
        assert.equal(otmp.blessed, true);
    });

    it('provides naming wrappers and terrain names', async () => {
        const obj = mksobj(LONG_SWORD, true, false);
        assert.ok(xname_flags(obj, 0).length > 0);
        assert.ok(doname_base(obj, null).length > 0);
        assert.ok((await distant_name(obj)).length > 0);
        assert.equal(dbterrainmesg(STONE), 'stone');
        assert.equal(dbterrainmesg(ROOM), 'room');
        assert.equal(dbterrainmesg(WATER), 'water');
    });

    it('formats multishot and vague/price naming helpers', () => {
        const obj = mksobj(LONG_SWORD, true, false);
        obj._m_shot = { n: 3, i: 2, o: obj.otyp };
        const shotName = mshot_xname(obj);
        assert.match(shotName, /^the 2nd /);

        obj.quan = 5;
        obj.dknown = false;
        const vague = doname_vague_quan(obj, null);
        assert.match(vague, /^some /);

        obj.unpaid = true;
        obj.unpaidCost = 42;
        const priced = doname_with_price(obj, null);
        assert.match(priced, /\(unpaid, 42 zorkmids?\)$/);
    });

    it('parses wizard terrain wish intents', () => {
        const wall = wizterrainwish({ text: 'nondiggable wall' });
        assert.equal(wall?.terrain, 'wall');
        assert.deepEqual(wall?.wallprops, ['nondiggable']);
        assert.equal(wizterrainwish({ text: 'fountain' })?.terrain, 'fountain');
        assert.equal(wizterrainwish({ text: 'mysterious orb' }), null);
    });

    it('mutates live map for wizard terrain wishes', () => {
        const map = new GameMap();
        const player = { x: 10, y: 10, map };
        map.at(10, 10).typ = ROOM;

        const doorWish = wizterrainwish({ text: 'locked door', player, map });
        assert.equal(doorWish?.applied, true);
        assert.equal(map.at(10, 10).typ, DOOR);
        assert.equal((map.at(10, 10).flags & D_LOCKED) !== 0, true);

        const trapWish = wizterrainwish({ text: 'fire trap', player, map });
        assert.equal(trapWish?.applied, true);
        assert.ok(map.trapAt(10, 10));
        assert.equal(map.trapAt(10, 10).ttyp, FIRE_TRAP);
    });

    it('routes terrain wishes through readobjnam in wizard mode', () => {
        const map = new GameMap();
        const player = { x: 12, y: 12, map, wizard: true };
        map.at(12, 12).typ = ROOM;

        const res = readobjnam('locked door', false, { wizard: true, player, map });
        assert.equal(res, hands_obj);
        assert.equal(map.at(12, 12).typ, DOOR);
        assert.equal((map.at(12, 12).flags & D_LOCKED) !== 0, true);

        map.at(12, 12).typ = ROOM;
        map.at(12, 12).flags = 0;
        const nonwiz = readobjnam('locked door', false, { wizard: false, player, map });
        assert.equal(nonwiz, null);
        assert.equal(map.at(12, 12).typ, ROOM);
    });
});
