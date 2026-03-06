import { test } from 'node:test';
import assert from 'node:assert/strict';

import { monsterNearby } from '../../js/monutil.js';
import { PM_GAS_SPORE, mons, PM_GIANT_ANT, M1_HIDE } from '../../js/monsters.js';
import { SCR_SCARE_MONSTER } from '../../js/objects.js';

function mkMap({ monsters = {}, objects = [], engravings = [] } = {}) {
    return {
        monsterAt(x, y) {
            return monsters[`${x},${y}`] || null;
        },
        objects,
        engravings,
        at() {
            return { typ: 0, flags: 0 };
        },
    };
}

function hostileMonster(type = mons[PM_GIANT_ANT], overrides = {}) {
    return {
        mx: 11,
        my: 10,
        dead: false,
        tame: false,
        peaceful: false,
        type,
        m_ap_type: 'monster',
        mundetected: false,
        mcanmove: true,
        mfrozen: 0,
        sleeping: false,
        stunned: false,
        ...overrides,
    };
}

test('monsterNearby blocks hostile adjacent monster', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const map = mkMap({
        monsters: { '11,10': hostileMonster() },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), true);
});

test('monsterNearby ignores nonattacking monster types', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const map = mkMap({
        monsters: { '11,10': hostileMonster(mons[PM_GAS_SPORE]) },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), false);
});

test('monsterNearby ignores hidden apes in mimic/furniture/object appearances', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const map = mkMap({
        monsters: {
            '11,10': hostileMonster(undefined, { m_ap_type: 'furniture' }),
            '10,11': hostileMonster(undefined, { m_ap_type: 'object' }),
        },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), false);
});

test('monsterNearby ignores undetected hiders', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const hiddenType = { mflags1: M1_HIDE };
    const map = mkMap({
        monsters: { '11,10': hostileMonster(hiddenType, { mundetected: true }) },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), false);
});

test('monsterNearby ignores helpless monsters', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const map = mkMap({
        monsters: {
            '11,10': hostileMonster(undefined, { sleeping: true }),
            '10,11': hostileMonster(undefined, { mcanmove: false }),
            '9,9': hostileMonster(undefined, { mfrozen: 1 }),
            // Note: stunned (mstun) is NOT helpless in C — stunned monsters
            // can still attack (just move randomly), so they DO stop running.
        },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), false);
});

test('monsterNearby ignores monsters in line of fear', () => {
    const player = { x: 10, y: 10, hallucinating: false };
    const map = mkMap({
        monsters: { '11,10': hostileMonster() },
        objects: [{ otyp: SCR_SCARE_MONSTER, ox: 10, oy: 10, buried: false }],
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), false);
});

test('monsterNearby allows peaceful monster during hallucination', () => {
    const player = { x: 10, y: 10, hallucinating: true };
    const map = mkMap({
        monsters: { '11,10': hostileMonster(undefined, { peaceful: true }) },
    });

    assert.equal(monsterNearby(map, player, { canSee: () => true }), true);
});
