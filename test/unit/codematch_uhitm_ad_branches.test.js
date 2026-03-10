import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mhitm_ad_were,
    mhitm_ad_pest,
    mhitm_ad_famn,
    mhitm_ad_sgld,
    mhitm_ad_sedu,
    mhitm_ad_dise,
} from '../../js/uhitm.js';
import { AT_KICK, M1_THICK_HIDE, M1_HERBIVORE, S_NYMPH, S_FUNGUS } from '../../js/monsters.js';
import { GOLD_PIECE, DAGGER, LEATHER_ARMOR } from '../../js/objects.js';
import { M_ATTK_AGR_DONE } from '../../js/const.js';

test('mhitm_ad_were delegates through physical handling (kick vs thick hide -> zero damage)', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: { mflags1: M1_THICK_HIDE } };
    const mattk = { aatyp: AT_KICK };
    const mhm = { damage: 7 };

    mhitm_ad_were(magr, mattk, mdef, mhm);
    assert.equal(mhm.damage, 0);
});

test('mhitm_ad_pest routes to AD_DISE behavior (fungus target -> zero damage)', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: { mlet: S_FUNGUS } };
    const mattk = { adtyp: 0 };
    const mhm = { damage: 9 };

    mhitm_ad_pest(magr, mattk, mdef, mhm);
    assert.equal(mhm.damage, 0);
});

test('mhitm_ad_famn zeroes damage only for non-eaters', () => {
    const magr = { mcan: false, data: {} };
    const mattk = { adtyp: 0 };

    const nonEater = { data: { mflags1: 0 } };
    const mhm1 = { damage: 6 };
    mhitm_ad_famn(magr, mattk, nonEater, mhm1);
    assert.equal(mhm1.damage, 0);

    const eater = { data: { mflags1: M1_HERBIVORE } };
    const mhm2 = { damage: 6 };
    mhitm_ad_famn(magr, mattk, eater, mhm2);
    assert.equal(mhm2.damage, 6);
});

test('mhitm_ad_sgld transfers defender gold to attacker inventory', () => {
    const magr = { mcan: false, data: { mlet: 'n' }, minvent: [] };
    const gold = { otyp: GOLD_PIECE, quan: 77 };
    const mdef = { data: { mlet: 'o' }, minvent: [gold], mstrategy: 0x08000000 };
    const mhm = { damage: 5, hitflags: 0 };

    mhitm_ad_sgld(magr, {}, mdef, mhm);
    assert.equal(mhm.damage, 0);
    assert.equal(mdef.minvent.length, 0);
    assert.equal(magr.minvent.length, 1);
    assert.equal(magr.minvent[0].otyp, GOLD_PIECE);
    assert.equal(magr.minvent[0].quan, 77);
});

test('mhitm_ad_sedu steals an item and marks AGR_DONE for nymphs', () => {
    const magr = { mcan: false, mtame: 0, data: { mlet: S_NYMPH }, minvent: [] };
    const item = { otyp: DAGGER, cursed: false, owornmask: 0 };
    const mdef = { minvent: [item], mstrategy: 0x08000000 };
    const mhm = { damage: 4, hitflags: 0 };

    mhitm_ad_sedu(magr, {}, mdef, mhm);
    assert.equal(mhm.damage, 0);
    assert.equal((mhm.hitflags & M_ATTK_AGR_DONE) !== 0, true);
    assert.equal(mdef.minvent.length, 0);
    assert.equal(magr.minvent.length, 1);
    assert.equal(magr.minvent[0].otyp, DAGGER);
});

test('mhitm_ad_sedu tame thief avoids cursed item when uncursed available', () => {
    const magr = { mcan: false, mtame: 5, data: { mlet: 'h' }, minvent: [] };
    const cursedArmor = { otyp: LEATHER_ARMOR, cursed: true, owornmask: 0 };
    const uncursedDagger = { otyp: DAGGER, cursed: false, owornmask: 0 };
    const mdef = { minvent: [cursedArmor, uncursedDagger], mstrategy: 0 };
    const mhm = { damage: 1, hitflags: 0 };

    mhitm_ad_sedu(magr, {}, mdef, mhm);
    assert.equal(mdef.minvent.length, 1);
    assert.equal(mdef.minvent[0].otyp, LEATHER_ARMOR);
    assert.equal(magr.minvent.length, 1);
    assert.equal(magr.minvent[0].otyp, DAGGER);
});

test('mhitm_ad_dise keeps normal damage on susceptible targets', () => {
    const mhm = { damage: 8 };
    const mdef = { mndx: 0, data: { mlet: 'o' } };
    mhitm_ad_dise({}, {}, mdef, mhm);
    assert.equal(mhm.damage, 8);
});
