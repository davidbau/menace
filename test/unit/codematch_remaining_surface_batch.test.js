import test from 'node:test';
import assert from 'node:assert/strict';

import { decl_globals_init, sa_victual } from '../../js/decl.js';
import { monst_globals_init } from '../../js/monst.js';
import { objects_globals_init, SADDLE } from '../../js/objects.js';
import { dev_name, get_mplname } from '../../js/mplayer.js';
import { dropp } from '../../js/polyself.js';
import { move_special, priestini } from '../../js/priest.js';
import { init_shop_selection, neweshk } from '../../js/shknam.js';
import { unstolenarm, stealarm } from '../../js/steal.js';
import { use_saddle } from '../../js/steed.js';
import { W_SADDLE } from '../../js/const.js';
import { S_UNICORN, MZ_MEDIUM } from '../../js/monsters.js';

test('decl/monst/objects init surfaces are callable', () => {
    decl_globals_init();
    monst_globals_init();
    objects_globals_init();
    const v = { eaten: 1 };
    assert.equal(sa_victual(v), v);
});

test('mplayer naming surfaces are callable', () => {
    globalThis.gs = { map: { monsters: [] } };
    const name = dev_name([]);
    assert.equal(typeof name, 'string');
    const mtmp = { data: { female: false }, m_lev: 5 };
    const full = get_mplname(mtmp);
    assert.match(full, / the /);
});

test('polyself dropp delegates to dropx', async () => {
    let dropped = null;
    const player = { dropx: async (obj) => { dropped = obj; } };
    const obj = { o_id: 99 };
    await dropp(obj, player);
    assert.equal(dropped, obj);
});

test('priest compatibility exports exist', () => {
    assert.equal(typeof move_special, 'function');
    assert.equal(typeof priestini, 'function');
});

test('shknam compatibility surfaces validate and allocate', () => {
    init_shop_selection();
    const mon = { m_id: 123 };
    neweshk(mon);
    assert.equal(mon.mextra.eshk.parentmid, 123);
    assert.equal(mon.mextra.eshk.bill_p, null);
});

test('steal delayed callbacks are callable', async () => {
    const player = { inventory: [{ o_id: 1, name: 'mail' }] };
    const map = { monsters: [{ m_id: 7, minvent: [] }] };
    globalThis.gs = { stealoid: 1, stealmid: 7 };
    assert.equal(await stealarm(player, map), 0);
    globalThis.gs = { stealoid: 1 };
    assert.equal(await unstolenarm(player), 0);
});

test('use_saddle applies saddle to adjacent mount candidate', async () => {
    const saddle = { otyp: SADDLE, owornmask: 0 };
    const mon = { mx: 6, my: 5, mtame: 5, data: { mlet: S_UNICORN, msize: MZ_MEDIUM }, minvent: [], misc_worn_check: 0, m_id: 42 };
    const map = {
        monsters: [mon],
        monsterAt: (x, y) => (x === 6 && y === 5 ? mon : null),
    };
    const player = { x: 5, y: 5 };
    const display = { putstr_message: async () => {} };
    const rv = await use_saddle(saddle, player, map, display, 1, 0);
    assert.equal(rv, 1);
    assert.ok(mon.misc_worn_check & W_SADDLE);
    assert.equal(saddle.owornmask, W_SADDLE);
});
