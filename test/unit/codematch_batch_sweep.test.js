import test from 'node:test';
import assert from 'node:assert/strict';

import { initRng } from '../../js/rng.js';
import { GameMap } from '../../js/game.js';
import { count_surround_traps, invoke_ok, invoke_energy_boost, arti_invoke_cost } from '../../js/artifact.js';
import { check_in_air } from '../../js/trap.js';
import { nohandglow } from '../../js/uhitm.js';
import { summonmu } from '../../js/mhitu.js';
import { return_from_mtoss } from '../../js/mthrowu.js';
import { DOOR, D_TRAPPED, TOOKPLUNGE, PROT_FROM_SHAPE_CHANGERS } from '../../js/const.js';
import { CHEST, DAGGER } from '../../js/objects.js';
import { PM_FLOATING_EYE, PM_HUMAN_WEREWOLF, PM_WEREWOLF, mons } from '../../js/monsters.js';
import { CRYSTAL_BALL } from '../../js/objects.js';

test('artifact.count_surround_traps counts hidden trap/door/container but not shown trap', () => {
    const map = new GameMap();
    const x = 10;
    const y = 10;

    map.traps.push({ tx: x - 1, ty: y, tseen: false });
    map.traps.push({ tx: x + 1, ty: y, tseen: true });
    map.at(x + 1, y).mem_trap = 1;

    map.at(x, y - 1).typ = DOOR;
    map.at(x, y - 1).flags |= D_TRAPPED;

    map.objects.push({ otyp: CHEST, ox: x, oy: y + 1, otrapped: 1 });

    assert.equal(count_surround_traps(x, y, map), 3);
});

test('trap.check_in_air honors floater and plunged flyer logic', () => {
    const floater = { mndx: PM_FLOATING_EYE, type: mons[PM_FLOATING_EYE] };
    assert.equal(check_in_air(floater, 0), true);

    const flyer = { type: { mflags1: 0x00000001 } };
    assert.equal(check_in_air(flyer, 0), true);
    assert.equal(check_in_air(flyer, TOOKPLUNGE), false);

    const you = {
        isPlayer: true,
        hasProp(prop) { return prop === PROT_FROM_SHAPE_CHANGERS ? false : false; },
        flying: true,
    };
    assert.equal(check_in_air(you, TOOKPLUNGE), false);
});

test('uhitm.nohandglow decrements umconf when applicable', () => {
    const player = { umconf: 2 };
    const mon = { mconf: 0 };
    assert.equal(nohandglow(mon, player), true);
    assert.equal(player.umconf, 1);
});

test('mhitu.summonmu respects protectionFromShapeChangers for were form switch', async () => {
    const base = {
        mndx: PM_HUMAN_WEREWOLF,
        data: mons[PM_HUMAN_WEREWOLF],
        type: mons[PM_HUMAN_WEREWOLF],
        minvent: [],
        mx: 10,
        my: 10,
        mhp: 20,
        mhpmax: 20,
    };
    const map = new GameMap();

    initRng(1234);
    let changedProtected = false;
    const protectedMon = { ...base };
    for (let i = 0; i < 200; i++) {
        await summonmu(protectedMon, false, map, { protectionFromShapeChangers: true }, null);
        if (protectedMon.mndx !== PM_HUMAN_WEREWOLF) {
            changedProtected = true;
            break;
        }
    }
    assert.equal(changedProtected, false);
});

test('mhitu.summonmu reverts beast-form were when shapechanger protection is active', async () => {
    const beast = {
        mndx: PM_WEREWOLF,
        data: mons[PM_WEREWOLF],
        type: mons[PM_WEREWOLF],
        minvent: [],
        mx: 10,
        my: 10,
        mhp: 20,
        mhpmax: 20,
    };
    const map = new GameMap();
    await summonmu(beast, false, map, {
        uprops: { [PROT_FROM_SHAPE_CHANGERS]: { extrinsic: 1 } },
    }, null);
    assert.equal(beast.mndx, PM_HUMAN_WEREWOLF);
});

test('mthrowu.return_from_mtoss drops uncaught returning projectile at thrower square', () => {
    initRng(9);
    const map = new GameMap();
    const magr = { mx: 15, my: 8, mconf: 1, mhp: 20, minvent: [] };
    const otmp = { otyp: DAGGER };
    return_from_mtoss(magr, otmp, false, map);
    assert.equal(otmp.ox, 15);
    assert.equal(otmp.oy, 8);
    assert.equal(map.objects.includes(otmp), true);
});

test('artifact.invoke_ok suggests artifact-like invoke targets (crystal ball)', () => {
    const crystal = { otyp: CRYSTAL_BALL, oartifact: 0 };
    assert.equal(invoke_ok(crystal), 2);
});

test('artifact.invoke_energy_boost raises pw and marks botl', async () => {
    const player = { pw: 3, pwmax: 20, uprops: {} };
    const game = { moves: 100, disp: { botl: false } };
    const obj = { oartifact: 27, age: 0 };
    const res = await invoke_energy_boost(obj, game, player);
    assert.equal(res, 1);
    assert.equal(player.pw > 3, true);
    assert.equal(game.disp.botl, true);
});

test('artifact.arti_invoke_cost drains pw for paid invoke-cost artifacts', async () => {
    const player = { pw: 30 };
    const game = { moves: 1, disp: { botl: false } };
    const obj = { oartifact: 5, age: 99 };
    const ok = await arti_invoke_cost(obj, player, game);
    assert.equal(ok, true);
    assert.equal(player.pw, 5);
    assert.equal(game.disp.botl, true);
});
