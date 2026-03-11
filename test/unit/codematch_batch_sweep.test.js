import test from 'node:test';
import assert from 'node:assert/strict';

import { initRng } from '../../js/rng.js';
import { GameMap } from '../../js/game.js';
import { count_surround_traps, invoke_ok, invoke_energy_boost, arti_invoke_cost, is_magic_key, doinvoke, invoke_healing, invoke_charge_obj, arti_invoke } from '../../js/artifact.js';
import { check_in_air } from '../../js/trap.js';
import { nohandglow } from '../../js/uhitm.js';
import { summonmu } from '../../js/mhitu.js';
import { return_from_mtoss } from '../../js/mthrowu.js';
import { DOOR, D_TRAPPED, TOOKPLUNGE, PROT_FROM_SHAPE_CHANGERS, ECMD_TIME, ECMD_CANCEL, BLINDED, SICK, SLIMED, TIMEOUT } from '../../js/const.js';
import { CHEST, DAGGER, POTION_CLASS, POT_WATER, POT_OIL, WEAPON_CLASS, SCR_CHARGING, WAND_CLASS, WAN_FIRE } from '../../js/objects.js';
import { PM_FLOATING_EYE, PM_HUMAN_WEREWOLF, PM_WEREWOLF, mons } from '../../js/monsters.js';
import { CRYSTAL_BALL } from '../../js/objects.js';
import { PM_ROGUE } from '../../js/monsters.js';
import { ART_MASTER_KEY_OF_THIEVERY } from '../../js/artifacts.js';
import { dodip, dip_into } from '../../js/potion.js';
import { seffect_charging, seffect_taming, seffect_punishment } from '../../js/read.js';

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
    assert.equal(invoke_ok(crystal), 1);
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

test('artifact.doinvoke selects an invokable item and consumes a turn', async () => {
    const player = { pw: 30, pwmax: 30, inventory: [{ oartifact: 5, age: 99 }], uprops: {} };
    const game = { moves: 1, disp: { botl: false } };
    const rc = await doinvoke(player, game);
    assert.equal(rc, ECMD_TIME);
});

test('artifact.invoke_healing cures sick/slimed and reduces timed blindness to cream', async () => {
    const player = {
        uhp: 9,
        uhpmax: 20,
        ucreamed: 2,
        uprops: {
            [BLINDED]: { intrinsic: 15, extrinsic: 0, blocked: 0 },
            [SICK]: { intrinsic: 12, extrinsic: 0, blocked: 0 },
            [SLIMED]: { intrinsic: 9, extrinsic: 0, blocked: 0 },
        },
        getPropTimeout(prop) { return (this.uprops[prop]?.intrinsic || 0) & TIMEOUT; },
    };
    const rc = await invoke_healing({ oartifact: 27 }, player);
    assert.equal(rc, ECMD_TIME);
    assert.equal(player.uhp > 9, true);
    assert.equal(player.getPropTimeout(SICK), 0);
    assert.equal(player.getPropTimeout(SLIMED), 0);
    assert.equal(player.getPropTimeout(BLINDED), 2);
});

test('artifact.invoke_charge_obj cancels and clears cooldown when no player/target', async () => {
    const obj = { oartifact: 27, age: 123, blessed: 0, cursed: 0 };
    const rc = await invoke_charge_obj(obj, null, null);
    assert.equal(rc, ECMD_CANCEL);
    assert.equal(obj.age, 0);
});

test('artifact.arti_invoke routes plain crystal ball to crystal-ball path', async () => {
    const rc = await arti_invoke({ oartifact: 0, otyp: CRYSTAL_BALL, spe: 1 }, { blind: false, uprops: {} }, null);
    assert.equal(rc, ECMD_TIME);
});

test('artifact.is_magic_key follows rogue-vs-nonrogue bless/curse rules', () => {
    const key = { oartifact: ART_MASTER_KEY_OF_THIEVERY, blessed: 0, cursed: 0 };
    assert.equal(is_magic_key({ mndx: PM_ROGUE }, key), true);
    key.cursed = 1;
    assert.equal(is_magic_key({ mndx: PM_ROGUE }, key), false);
    key.cursed = 0;
    assert.equal(is_magic_key({ mndx: PM_FLOATING_EYE }, key), false);
    key.blessed = 1;
    assert.equal(is_magic_key({ mndx: PM_FLOATING_EYE }, key), true);
});

test('potion.dodip performs a dip turn when potion and target exist', async () => {
    initRng(123);
    const pot = { oclass: POTION_CLASS, otyp: POT_WATER, invlet: 'a', quan: 1, blessed: 0, cursed: 0 };
    const obj = { oclass: WEAPON_CLASS, otyp: DAGGER, invlet: 'b', blessed: 0, cursed: 0 };
    const player = {
        inventory: [pot, obj],
        removeFromInventory(item) {
            this.inventory = this.inventory.filter((it) => it !== item);
        },
    };
    const tookTime = await dodip(player, new GameMap(), null);
    assert.equal(tookTime, true);
});

test('potion.dip_into can dip a selected object into a potion', async () => {
    initRng(124);
    const pot = { oclass: POTION_CLASS, otyp: POT_OIL, invlet: 'a', quan: 1, blessed: 0, cursed: 0 };
    const obj = { oclass: WEAPON_CLASS, otyp: DAGGER, invlet: 'b', blessed: 0, cursed: 0 };
    const player = {
        inventory: [obj, pot],
        removeFromInventory(item) {
            this.inventory = this.inventory.filter((it) => it !== item);
        },
    };
    const tookTime = await dip_into(player, new GameMap(), null, obj);
    assert.equal(tookTime, true);
});

test('read.seffect_charging non-confused recharges selected chargeable object', async () => {
    initRng(77);
    const scroll = { otyp: SCR_CHARGING, oclass: 0, blessed: 0, cursed: 0 };
    const wand = { oclass: WAND_CLASS, otyp: WAN_FIRE, spe: 0, invlet: 'a', recharged: 0 };
    const player = {
        confused: 0,
        inventory: [wand],
        removeFromInventory(item) {
            this.inventory = this.inventory.filter((it) => it !== item);
        },
    };
    const display = { putstr_message: async () => {} };
    const consumed = await seffect_charging(scroll, player, display, { disp: { botl: false }, display });
    assert.equal(consumed, true);
    assert.equal(wand.spe > 0, true);
});

test('read.seffect_taming cursed scroll angers peaceful nearby monster', async () => {
    initRng(78);
    const map = new GameMap();
    const mon = {
        mx: 11, my: 10,
        dead: false, mhp: 10,
        mndx: PM_WEREWOLF,
        peaceful: true, tame: false,
        mpeaceful: 1, mtame: 0,
        data: { mlet: 'd', mr: 0, mflags1: 0, mflags2: 0, mflags3: 0 },
    };
    map.monsters.push(mon);
    const player = {
        x: 10, y: 10, confused: 0,
        usteed: null, uswallow: false, ustuck: null,
        ualign: { type: 0, record: 0 },
        data: {},
    };
    const display = { putstr_message: async () => {} };
    const scroll = { cursed: 1, blessed: 0 };

    const consumed = await seffect_taming(scroll, player, display, { map, fov: null });
    assert.equal(consumed, false);
    assert.equal(!!mon.peaceful || !!mon.mpeaceful, false);
});

test('read.seffect_taming uses u.ustuck path when player is swallowed', async () => {
    initRng(79);
    const map = new GameMap();
    const stuck = {
        mx: 10, my: 10,
        dead: false, mhp: 12,
        mndx: PM_WEREWOLF,
        peaceful: true, tame: false,
        mpeaceful: 1, mtame: 0,
        data: { mlet: 'h', mr: 0, mflags1: 0, mflags2: 0, mflags3: 0 },
    };
    map.monsters.push(stuck);
    const player = {
        x: 10, y: 10, confused: 0,
        usteed: null, uswallow: true, ustuck: stuck,
    };
    const display = { putstr_message: async () => {} };
    const scroll = { cursed: 1, blessed: 0 };

    const consumed = await seffect_taming(scroll, player, display, { map, fov: null, moves: 1 });
    assert.equal(consumed, false);
    assert.equal(!!stuck.peaceful || !!stuck.mpeaceful, false);
});

test('read.seffect_punishment confused or blessed only feels guilty', async () => {
    const display = { putstr_message: async () => {} };
    const player = { confused: 1, data: {}, Punished: false };
    const consumedConfused = await seffect_punishment({ blessed: 0 }, player, display);
    assert.equal(consumedConfused, false);
    assert.equal(!!player.Punished, false);

    player.confused = 0;
    const consumedBlessed = await seffect_punishment({ blessed: 1 }, player, display);
    assert.equal(consumedBlessed, false);
    assert.equal(!!player.Punished, false);
});

test('read.seffect_punishment applies punishment when not blessed/confused', async () => {
    const display = { putstr_message: async () => {} };
    const player = { confused: 0, data: {}, Punished: false };
    const consumed = await seffect_punishment({ blessed: 0, cursed: 0 }, player, display);
    assert.equal(consumed, false);
    assert.equal(!!player.Punished, true);
    assert.equal(!!player.punished, true);
    assert.equal(!!player.uball, true);
});
