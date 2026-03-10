import test from 'node:test';
import assert from 'node:assert/strict';

import {
    study_book, confused_book, book_cursed, learn, rejectcasting, spelleffects,
} from '../../js/spell.js';
import {
    SPE_BLANK_PAPER, SPE_BOOK_OF_THE_DEAD, SPE_MAGIC_MISSILE, SPE_CURE_BLINDNESS,
} from '../../js/objects.js';
import { explosionmask, engulfer_explosion_msg, scatter } from '../../js/explode.js';
import { AD_FIRE } from '../../js/monsters.js';
import { MR_FIRE } from '../../js/monsters.js';
import { cursetxt, touch_of_death } from '../../js/mcastu.js';

test('spell study_book handles blank paper and returns success', async () => {
    const player = { spells: [] };
    const book = { otyp: SPE_BLANK_PAPER };
    const rv = await study_book(book, player);
    assert.equal(rv, 1);
});

test('spell confused_book handles BOTD path without destroying book', async () => {
    const player = {};
    const book = { otyp: SPE_BOOK_OF_THE_DEAD };
    const destroyed = await confused_book(book, player);
    assert.equal(destroyed, false);
});

test('spell book_cursed cancels matching reading occupation', async () => {
    const book = { cursed: true, known: true, bknown: false };
    const player = { occupation: { book } };
    await book_cursed(book, player);
    assert.equal(book.bknown, true);
    assert.equal(player.occupation, null);
});

test('spell learn adds a new spell from occupation book', async () => {
    const book = { otyp: SPE_MAGIC_MISSILE, spestudied: 0, cursed: false };
    const player = { spells: [], occupation: { book }, ulevel: 1 };
    const rv = await learn(player);
    assert.equal(rv, 0);
    assert.equal(player.spells.length, 1);
    assert.equal(player.spells[0].otyp, SPE_MAGIC_MISSILE);
});

test('spell rejectcasting blocks stunned casters', async () => {
    const blocked = await rejectcasting({ stunned: true });
    assert.equal(blocked, true);
});

test('spell spelleffects handles forgotten spell path', async () => {
    const player = {
        spells: [{ otyp: SPE_CURE_BLINDNESS, sp_know: 0, sp_lev: 1 }],
        power: 20,
        attributes: [10, 10, 10, 10, 10, 10],
    };
    const elapsed = await spelleffects(SPE_CURE_BLINDNESS, true, player, null, null);
    assert.equal(elapsed, 1);
});

test('explode helpers provide basic resistance/message/scatter behavior', () => {
    const mon = { data: { mresists: MR_FIRE } };
    assert.equal(explosionmask(mon, AD_FIRE, 0), 1);
    assert.match(engulfer_explosion_msg(AD_FIRE, 0), /fire/);

    const obj = { ox: 5, oy: 5 };
    let removed = false;
    let added = false;
    const map = {
        removeObject: (o) => { if (o === obj) removed = true; },
        addObject: (o) => { if (o === obj) added = true; },
    };
    const moved = scatter(5, 5, 2, 0, obj, map);
    assert.equal(moved, 1);
    assert.equal(removed, true);
    assert.equal(added, true);
});

test('mcastu cursetxt and touch_of_death provide effects', () => {
    const mtmp = { name: 'lich' };
    const text = cursetxt(mtmp, true);
    assert.match(text, /lich/);
    assert.equal(mtmp.lastCurseText, text);

    const player = { uhp: 100, magicResistance: true };
    const dmg = touch_of_death(mtmp, player);
    assert.ok(dmg >= 8);
    assert.ok(dmg <= 48);
    assert.equal(player.uhp, 100 - dmg);
});
