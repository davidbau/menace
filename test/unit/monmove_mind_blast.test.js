import test from 'node:test';
import assert from 'node:assert/strict';

import { initRng } from '../../js/rng.js';
import { mind_blast } from '../../js/monmove.js';
import { mons, PM_MIND_FLAYER } from '../../js/monsters.js';

function makeDisplay() {
    const messages = [];
    return {
        messages,
        async putstr_message(msg) {
            messages.push(String(msg));
        },
    };
}

function makeMap(mon) {
    return {
        monsters: [mon],
        at() {
            return { typ: 0, seenv: 0 };
        },
        monsterAt(x, y) {
            return this.monsters.find((m) => m.mx === x && m.my === y) || null;
        },
    };
}

function makeMindFlayer() {
    return {
        mndx: PM_MIND_FLAYER,
        data: mons[PM_MIND_FLAYER],
        mx: 10,
        my: 10,
        mpeaceful: false,
        peaceful: false,
        mcansee: true,
        dead: false,
    };
}

test('mind_blast reveals hidden hero and applies telepathy lock-on damage', async () => {
    initRng(7);
    const mon = makeMindFlayer();
    const map = makeMap(mon);
    const display = makeDisplay();
    const player = {
        x: 10,
        y: 11,
        uhp: 30,
        telepathy: true,
        blind: false,
        uundetected: 1,
        m_ap_type: 0,
        mappearance: 0,
        halfSpellDamage: false,
        uinvulnerable: false,
    };

    await mind_blast(mon, map, player, display, null, null);

    assert.equal(player.uundetected, 0);
    assert.ok(player.uhp < 30);
    assert.ok(display.messages.includes('A wave of psychic energy pours over you!'));
    assert.ok(display.messages.includes('It locks on to your telepathy!'));
});

test('mind_blast reveals mimic disguise when lock-on succeeds', async () => {
    initRng(8);
    const mon = makeMindFlayer();
    const map = makeMap(mon);
    const display = makeDisplay();
    const player = {
        x: 10,
        y: 11,
        uhp: 30,
        telepathy: true,
        blind: false,
        uundetected: 0,
        m_ap_type: 2,
        mappearance: 123,
        halfSpellDamage: false,
        uinvulnerable: false,
    };

    await mind_blast(mon, map, player, display, null, null);

    assert.equal(player.m_ap_type, 0);
    assert.equal(player.mappearance, 0);
    assert.ok(display.messages.includes('It locks on to your telepathy!'));
});

test('mind_blast from peaceful mind flayer is soothing and non-damaging', async () => {
    initRng(9);
    const mon = makeMindFlayer();
    mon.mpeaceful = true;
    mon.peaceful = true;
    const map = makeMap(mon);
    const display = makeDisplay();
    const player = {
        x: 10,
        y: 11,
        uhp: 30,
        telepathy: true,
        blind: false,
        uundetected: 0,
        m_ap_type: 0,
        mappearance: 0,
        halfSpellDamage: false,
        uinvulnerable: false,
    };

    await mind_blast(mon, map, player, display, null, null);

    assert.equal(player.uhp, 30);
    assert.ok(display.messages.includes('It feels quite soothing.'));
});

test('mind_blast wakes sleeping monster victims before applying damage', async () => {
    initRng(10);
    const mon = makeMindFlayer();
    const victim = {
        mndx: PM_MIND_FLAYER,
        data: mons[PM_MIND_FLAYER],
        mx: 11,
        my: 11,
        mpeaceful: true,
        peaceful: true,
        mcansee: true,
        blind: true,
        sleeping: true,
        mhp: 20,
        dead: false,
    };
    const map = makeMap(mon);
    map.monsters.push(victim);
    const display = makeDisplay();
    const player = {
        x: 10,
        y: 11,
        uhp: 30,
        telepathy: true,
        blind: false,
        uundetected: 0,
        m_ap_type: 0,
        mappearance: 0,
        halfSpellDamage: false,
        uinvulnerable: false,
    };
    const fov = { canSee: () => true };

    await mind_blast(mon, map, player, display, fov, null);

    assert.equal(victim.sleeping, false);
});
