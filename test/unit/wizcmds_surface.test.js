import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  makemap_remove_mons,
  wiz_makemap,
  wiz_identify,
  wiz_kill,
  wiz_fuzzer,
  sanity_check,
  wiz_show_stats,
  list_migrating_mons,
  wiz_migrate_mons,
  wizcustom_callback,
  wiz_wish,
  wiz_load_lua,
  wiz_show_vision,
  wiz_map_levltyp,
  wiz_levltyp_legend,
} from '../../js/wizcmds.js';

function makeGame() {
  return {
    wizard: true,
    wizFuzzer: false,
    player: {
      x: 2, y: 2,
      hp: 10, hpmax: 10,
      mh: 1, mhmax: 1,
      uen: 5, uenmax: 5,
      inventory: [{}, {}],
    },
    map: {
      locations: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => ({ typ: 0 }))),
      monsters: [{ mx: 1, my: 1, mhp: 5 }],
      objects: [{ ox: 1, oy: 1 }],
      traps: [{ tx: 1, ty: 1 }],
      monsterAt() { return null; },
    },
    display: { putstr_message: async () => {} },
    migratingMonsters: [{ id: 1 }, { id: 2 }],
  };
}

describe('wizcmds C-surface wrappers', () => {
  it('map removal/regen wrappers mutate map state', async () => {
    const g = makeGame();
    assert.strictEqual(g.map.monsters.length, 1);
    makemap_remove_mons(g.map);
    assert.strictEqual(g.map.monsters.length, 0);
    g.map.monsters.push({ mx: 1, my: 1, mhp: 3 });
    await wiz_makemap(g);
    assert.strictEqual(g.map.monsters.length, 0);
  });

  it('identify/kill/fuzzer wrappers are executable', async () => {
    const g = makeGame();
    await wiz_identify(g);
    assert.strictEqual(g.player.inventory[0].known, true);
    await wiz_kill(g);
    assert.strictEqual(g.map.monsters.length, 0);
    assert.strictEqual(wiz_fuzzer(g), 1);
    assert.strictEqual(wiz_fuzzer(g), 0);
  });

  it('sanity/stats/migration/custom callback wrappers return structured outputs', async () => {
    const g = makeGame();
    await sanity_check(g);
    const stats = await wiz_show_stats(g);
    assert.strictEqual(typeof stats.monsters, 'number');
    assert.strictEqual(list_migrating_mons(g).length, 2);
    assert.strictEqual(await wiz_migrate_mons(g), 2);
    assert.strictEqual(wizcustom_callback(null, 12, 'G_foo'), '12:G_foo');
    await wiz_load_lua(g);
    await wiz_show_vision(g);
    assert.ok(Array.isArray(wiz_map_levltyp(g)));
    assert.ok(typeof wiz_levltyp_legend() === 'string');
    await wiz_wish({ ...g, wizard: false });
  });
});
