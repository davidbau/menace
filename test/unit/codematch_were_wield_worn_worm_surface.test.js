import test from 'node:test';
import assert from 'node:assert/strict';

import { initRng } from '../../js/rng.js';
import { PM_WEREWOLF } from '../../js/monsters.js';
import { COIN_CLASS, DAGGER, HELM_OF_TELEPATHY } from '../../js/objects.js';
import { W_ARMH } from '../../js/const.js';
import { you_unwere, you_were } from '../../js/were.js';
import { finish_splitting, ready_ok } from '../../js/wield.js';
import { check_wornmask_slots, recalc_telepat_range } from '../../js/worn.js';
import { random_dir } from '../../js/worm.js';

test('were surface: you_were fallback shape-change path updates hero form', async () => {
    initRng(1);
    const player = { ulycn: PM_WEREWOLF, umonnum: 0, umonster: 0, mtimedone: 0 };
    const changed = await you_were(player);
    assert.equal(changed, true);
    assert.equal(player.umonnum, PM_WEREWOLF);
    assert.ok(player.mtimedone > 0);
});

test('were surface: you_unwere purify clears ulycn', async () => {
    const player = { ulycn: PM_WEREWOLF, umonnum: PM_WEREWOLF, umonster: 0, mtimedone: 10 };
    await you_unwere(player, true);
    assert.equal(player.ulycn, -1);
});

test('were surface: uncontrollable you_were is blocked by nearby monster', async () => {
    const player = { ulycn: PM_WEREWOLF, umonnum: 0, umonster: 0, mtimedone: 0 };
    const changed = await you_were(player, {
        monster_nearby: () => true,
    });
    assert.equal(changed, false);
    assert.equal(player.umonnum, 0);
});

test('were surface: controllable you_were honors confirmation callback', async () => {
    const player = {
        ulycn: PM_WEREWOLF,
        umonnum: 0,
        umonster: 0,
        mtimedone: 0,
        polyControl: true,
    };
    const changed = await you_were(player, {
        confirmWerechange: () => false,
    });
    assert.equal(changed, false);
    assert.equal(player.umonnum, 0);
});

test('were surface: you_unwere can remain in beast form under control and sets timer', async () => {
    initRng(2);
    const player = {
        ulycn: PM_WEREWOLF,
        umonnum: PM_WEREWOLF,
        umonster: 0,
        mtimedone: 0,
        polyControl: true,
    };
    const changed = await you_unwere(player, false, {
        monster_nearby: () => false,
        confirmRemainBeast: () => true,
    });
    assert.equal(changed, false);
    assert.equal(player.umonnum, PM_WEREWOLF);
    assert.ok(player.mtimedone > 0);
});

test('wield surface: ready_ok mirrors C tri-state for common cases', () => {
    const player = {
        quiver: null,
        twoweap: false,
        weapon: { otyp: DAGGER, oclass: 2, quan: 1 },
        swapWeapon: null,
    };
    assert.equal(ready_ok(null, player), 2);
    player.quiver = { otyp: DAGGER, oclass: 2, quan: 1 };
    assert.equal(ready_ok(null, player), 1);
    assert.equal(ready_ok({ oclass: COIN_CLASS, otyp: 0, quan: 1 }, player), 1);
    assert.equal(ready_ok(player.weapon, player), 2);
    assert.equal(ready_ok({ ...player.weapon, quan: 2 }, player), 1);
});

test('wield surface: finish_splitting fallback inserts object into inventory', async () => {
    const player = { inventory: [] };
    const split = { otyp: DAGGER, quan: 1, invlet: 'a' };
    await finish_splitting(split, player);
    assert.equal(player.inventory.length, 1);
    assert.equal(player.inventory[0], split);
});

test('worn surface: recalc_telepat_range computes positive range from worn ESP item', () => {
    const player = {
        helmet: { otyp: HELM_OF_TELEPATHY },
        amulet: { otyp: 201 },
        ETelepat: 0,
    };
    const range = recalc_telepat_range(player);
    assert.ok(range > 0);
});

test('worn surface: check_wornmask_slots reports inconsistent slot masks', () => {
    const helm = { otyp: HELM_OF_TELEPATHY, owornmask: 0 };
    const player = {
        inventory: [helm],
        helmet: helm,
    };
    const issues = check_wornmask_slots(player);
    assert.ok(issues.length >= 1);

    helm.owornmask = W_ARMH;
    const fixed = check_wornmask_slots(player);
    assert.equal(fixed.length, 0);
});

test('worm surface: random_dir returns an adjacent coordinate in bounds near edges', () => {
    initRng(7);
    for (let i = 0; i < 20; i++) {
        const out = random_dir(1, 0);
        const dx = Math.abs(out.x - 1);
        const dy = Math.abs(out.y - 0);
        assert.ok(dx <= 1 && dy <= 1 && (dx + dy) >= 1);
        assert.ok(out.x >= 1);
        assert.ok(out.y >= 0);
    }
});
