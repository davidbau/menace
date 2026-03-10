import test from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';

import {
    mhitm_ad_were,
    mhitm_ad_pest,
    mhitm_ad_famn,
    mhitm_ad_rust,
    mhitm_ad_corr,
    mhitm_ad_dcay,
    mhitm_ad_curs,
    mhitm_ad_sgld,
    mhitm_ad_sedu,
    mhitm_ad_dise,
    mhitm_ad_dgst,
    mhitm_ad_halu,
    mhitm_ad_tlpt,
    mhitm_ad_ench,
    mhitm_ad_poly,
    mhitm_ad_slim,
    mhitm_ad_ston,
} from '../../js/uhitm.js';
import { AT_KICK, AT_WEAP, M1_THICK_HIDE, M1_HERBIVORE, S_NYMPH, S_FUNGUS, PM_FAMINE, PM_IRON_GOLEM, PM_WOOD_GOLEM, PM_CLAY_GOLEM, PM_STONE_GOLEM, PM_COCKATRICE, mons } from '../../js/monsters.js';
import { CORPSE, GOLD_PIECE, DAGGER, LEATHER_ARMOR } from '../../js/objects.js';
import { M_ATTK_AGR_DONE, M_ATTK_AGR_DIED, M_ATTK_DEF_DIED, M_ATTK_HIT } from '../../js/const.js';

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

test('mhitm_ad_rust kills iron golem target and marks defender death', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: mons[PM_IRON_GOLEM], mhp: 15, dead: false };
    const mhm = { damage: 4, hitflags: 0, done: false };

    mhitm_ad_rust(magr, {}, mdef, mhm);
    assert.equal(mhm.done, true);
    assert.equal((mhm.hitflags & M_ATTK_DEF_DIED) !== 0, true);
});

test('mhitm_ad_corr erodes m-vs-m branch and zeroes base damage', () => {
    initRng(101);
    const magr = { mcan: false, data: {} };
    const mdef = { data: {}, mstrategy: 0x08000000 };
    const mhm = { damage: 7, hitflags: 0 };

    mhitm_ad_corr(magr, {}, mdef, mhm);
    assert.equal(mhm.damage, 0);
    assert.equal((mdef.mstrategy & 0x08000000) !== 0, false);
});

test('mhitm_ad_dcay kills rot-vulnerable golem and marks defender death', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: mons[PM_WOOD_GOLEM], mhp: 12, dead: false };
    const mhm = { damage: 3, hitflags: 0, done: false };

    mhitm_ad_dcay(magr, {}, mdef, mhm);
    assert.equal(mhm.done, true);
    assert.equal((mhm.hitflags & M_ATTK_DEF_DIED) !== 0, true);
});

test('mhitm_ad_ston kills non-stone-resistant defender and marks defender death', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: {}, mhp: 12, dead: false };
    const mhm = { damage: 5, hitflags: 0, done: false };

    mhitm_ad_ston(magr, {}, mdef, mhm);
    assert.equal(mhm.done, true);
    assert.equal((mhm.hitflags & M_ATTK_DEF_DIED) !== 0, true);
});

test('mhitm_ad_ston keeps resistant defender alive and zeroes damage', () => {
    const magr = { mcan: false, data: {} };
    const mdef = { data: mons[PM_STONE_GOLEM], mhp: 22, dead: false };
    const mhm = { damage: 5, hitflags: 0, done: false };

    mhitm_ad_ston(magr, {}, mdef, mhm);
    assert.equal(mhm.done, false);
    assert.equal(mhm.damage, 0);
});

test('mhitm_ad_curs can cancel defender and preserve base damage', () => {
    initRng(9);
    const magr = { mcan: false, data: { mlet: 'd' } };
    let observed = false;
    for (let i = 0; i < 200; i++) {
        const mdef = { data: {}, mcan: 0, mstrategy: 0x08000000 };
        const mhm = { damage: 6, hitflags: 0, done: false };
        mhitm_ad_curs(magr, {}, mdef, mhm);
        if (mdef.mcan === 1) {
            assert.equal(mhm.damage, 6);
            assert.equal((mdef.mstrategy & 0x08000000) !== 0, false);
            observed = true;
            break;
        }
    }
    assert.equal(observed, true);
});

test('mhitm_ad_curs destroys clay golem target on curse branch', () => {
    initRng(13);
    const magr = { mcan: false, data: { mlet: 'd' } };
    let observed = false;
    for (let i = 0; i < 300; i++) {
        const mdef = { data: mons[PM_CLAY_GOLEM], mhp: 14, dead: false, mcan: 0 };
        const mhm = { damage: 6, hitflags: 0, done: false };
        mhitm_ad_curs(magr, {}, mdef, mhm);
        if (mhm.done) {
            assert.equal((mhm.hitflags & M_ATTK_DEF_DIED) !== 0, true);
            observed = true;
            break;
        }
    }
    assert.equal(observed, true);
});

test('mhitm_ad_sgld transfers defender gold to attacker inventory', () => {
    const magr = { mcan: false, data: { mlet: 'n' }, minvent: [] };
    const gold = { otyp: GOLD_PIECE, quan: 77 };
    const mdef = { data: { mlet: 'o' }, minvent: [gold], mstrategy: 0x08000000 };
    const mhm = { damage: 5, hitflags: 0 };

    mhitm_ad_sgld(magr, {}, mdef, mhm);
    assert.equal(mhm.damage, 0);
    assert.equal((mhm.hitflags & M_ATTK_AGR_DONE) !== 0, true);
    assert.equal(mdef.minvent.length, 0);
    assert.equal(magr.minvent.length, 1);
    assert.equal(magr.minvent[0].otyp, GOLD_PIECE);
    assert.equal(magr.minvent[0].quan, 77);
});

test('mhitm_ad_sgld steals from same-class target in m-vs-m branch', () => {
    const magr = { mcan: false, data: { mlet: 'n' }, minvent: [] };
    const gold = { otyp: GOLD_PIECE, quan: 10 };
    const mdef = { data: { mlet: 'n' }, minvent: [gold], mstrategy: 0 };
    const mhm = { damage: 1, hitflags: 0 };

    mhitm_ad_sgld(magr, {}, mdef, mhm);
    assert.equal(mdef.minvent.length, 0);
    assert.equal(magr.minvent.length, 1);
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

test('mhitm_ad_sedu can petrify defender via mselftouch side effect', () => {
    const magr = { mcan: false, mtame: 0, data: { mlet: 'h' }, minvent: [] };
    const stolen = { otyp: DAGGER, cursed: false, owornmask: 0 };
    const cockCorpse = { otyp: CORPSE, corpsenm: PM_COCKATRICE, cursed: false, owornmask: 0 };
    const mdef = {
        minvent: [stolen, cockCorpse],
        weapon: cockCorpse,
        data: { mresists: 0, mattk: [{ aatyp: AT_WEAP }] },
        mstrategy: 0,
        mhp: 15,
    };
    const mhm = { damage: 4, hitflags: 0, done: false };

    mhitm_ad_sedu(magr, {}, mdef, mhm);
    assert.equal((mhm.hitflags & M_ATTK_DEF_DIED) !== 0, true);
    assert.equal(mhm.done, true);
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

test('mhitm_ad_dgst swallows non-rider defender (damage becomes defender hp)', () => {
    const mhm = { damage: 1, hitflags: 0, done: false };
    const mdef = { mhp: 23, data: { mlet: 'o' } };
    mhitm_ad_dgst({ mhp: 20, data: {} }, {}, mdef, mhm);
    assert.equal(mhm.damage, 23);
    assert.equal(mhm.done, false);
});

test('mhitm_ad_dgst marks aggressor death when digesting a Rider', () => {
    const mhm = { damage: 2, hitflags: 0, done: false };
    const magr = { mhp: 0, data: {}, minvent: [] };
    const mdef = { mhp: 40, mndx: PM_FAMINE, data: mons[PM_FAMINE] };
    mhitm_ad_dgst(magr, {}, mdef, mhm);
    assert.equal(mhm.done, true);
    assert.equal((mhm.hitflags & M_ATTK_AGR_DIED) !== 0, true);
});

test('mhitm_ad_halu confuses seeing, eyeful defender and zeroes damage', () => {
    const mhm = { damage: 5 };
    const mdef = { data: {}, mcansee: true, mconf: 0, mstrategy: 0x08000000 };
    mhitm_ad_halu({ mcan: false }, {}, mdef, mhm);
    assert.equal(mhm.damage, 0);
    assert.equal(mdef.mconf, 1);
    assert.equal((mdef.mstrategy & 0x08000000) !== 0, false);
});

test('mhitm_ad_tlpt keeps damage and clears wait strategy when teleport branch is eligible', () => {
    const mhm = { damage: 3 };
    const magr = { mcan: false, data: {} };
    const mdef = { mhp: 10, data: {}, mstrategy: 0x08000000 };
    mhitm_ad_tlpt(magr, {}, mdef, mhm);
    assert.equal(mhm.damage, 3);
    assert.equal((mdef.mstrategy & 0x08000000) !== 0, false);
});

test('mhitm_ad_ench preserves incoming damage in m-vs-m branch', () => {
    const mhm = { damage: 4 };
    mhitm_ad_ench({}, {}, {}, mhm);
    assert.equal(mhm.damage, 4);
});

test('mhitm_ad_poly sets hit/done and cooldown when eligible', () => {
    const mhm = { damage: 2, hitflags: 0, done: false };
    const magr = { mcan: false, mspec_used: 0, data: {} };
    const mdef = { mhp: 9, data: {} };
    mhitm_ad_poly(magr, {}, mdef, mhm);
    assert.equal((mhm.hitflags & M_ATTK_HIT) !== 0, true);
    assert.equal(mhm.done, true);
    assert.equal(magr.mspec_used >= 1, true);
});

test('mhitm_ad_slim can enter zero-damage slime branch under RNG gating', () => {
    const magr = { mcan: false, data: {} };
    let observed = false;
    for (let i = 0; i < 300; i++) {
        const mhm = { damage: 5, hitflags: 0 };
        const mdef = { data: {}, mstrategy: 0x08000000 };
        mhitm_ad_slim(magr, {}, mdef, mhm);
        if (mhm.damage === 0 && (mhm.hitflags & M_ATTK_HIT) !== 0) {
            assert.equal((mdef.mstrategy & 0x08000000) !== 0, false);
            observed = true;
            break;
        }
    }
    assert.equal(observed, true);
});
