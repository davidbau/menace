import test from 'node:test';
import assert from 'node:assert/strict';

import { MAXOCLASSES } from '../../js/objects.js';
import { MAXMCLASSES } from '../../js/monsters.js';
import {
    def_oc_syms,
    def_monsyms,
    S_upstair,
    def_char_to_objclass,
    def_char_to_monclass,
    def_char_is_furniture,
} from '../../js/symbols.js';
import { untouchable } from '../../js/artifact.js';

test('def_char_to_objclass matches def_oc_syms and unknown fallback', () => {
    const weaponSym = def_oc_syms[2].sym;
    assert.equal(def_char_to_objclass(weaponSym), 2);
    assert.equal(def_char_to_objclass('\u0000'), MAXOCLASSES);
});

test('def_char_to_monclass matches def_monsyms and unknown fallback', () => {
    const antSym = def_monsyms[1].sym;
    assert.equal(def_char_to_monclass(antSym), 1);
    assert.equal(def_char_to_monclass('\u0000'), MAXMCLASSES);
});

test('def_char_is_furniture returns furniture index or -1', () => {
    const stairSym = '<'; // S_upstair default symbol
    const idx = def_char_is_furniture(stairSym);
    assert.ok(idx >= S_upstair, `expected furniture index >= S_upstair, got ${idx}`);
    assert.equal(def_char_is_furniture('a'), -1);
});

test('artifact untouchable is callable and returns boolean', async () => {
    const obj = { otyp: 1, oartifact: 0, owornmask: 1 };
    const player = { uprops: {} };
    const res = await untouchable(obj, false, player);
    assert.equal(typeof res, 'boolean');
});
