import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  create_region,
  add_rect_to_reg,
  add_mon_to_reg,
  clone_region,
  remove_mon_from_regions,
  replace_mon_regions,
  save_regions,
  rest_regions,
} from '../../js/region.js';

describe('region C-surface wrappers', () => {
  it('clone_region deep-copies region arrays and structs', () => {
    const reg = create_region(null, 0);
    add_rect_to_reg(reg, { lx: 1, ly: 1, hx: 2, hy: 2 });
    reg.monsters.push(42);
    const cloned = clone_region(reg);
    assert.notEqual(cloned, reg);
    assert.notEqual(cloned.rects, reg.rects);
    assert.notEqual(cloned.monsters, reg.monsters);
    assert.deepEqual(cloned.rects, reg.rects);
    assert.deepEqual(cloned.monsters, reg.monsters);
  });

  it('remove_mon_from_regions and replace_mon_regions keep membership coherent', () => {
    const map = { regions: [] };
    const reg = create_region([{ lx: 1, ly: 1, hx: 3, hy: 3 }], 1);
    map.regions.push(reg);
    const mon = { m_id: 99, mx: 2, my: 2 };

    add_mon_to_reg(reg, mon);
    assert.deepEqual(reg.monsters, [99]);
    remove_mon_from_regions(mon, map);
    assert.deepEqual(reg.monsters, []);

    replace_mon_regions(mon, map);
    assert.deepEqual(reg.monsters, [99]);
    mon.mx = 10;
    mon.my = 10;
    replace_mon_regions(mon, map);
    assert.deepEqual(reg.monsters, []);
  });

  it('save_regions/rest_regions roundtrip serialized region data', () => {
    const map = { regions: [], monsters: [{ m_id: 7, dead: false }, { m_id: 8, dead: false }] };
    const player = { x: 1, y: 1 };
    const reg = create_region([{ lx: 0, ly: 0, hx: 2, hy: 2 }], 1);
    reg.visible = true;
    reg.monsters = [7, 8];
    map.regions.push(reg);

    const snap = save_regions(map);
    map.regions = [];
    rest_regions(snap, map, player);

    assert.equal(map.regions.length, 1);
    assert.deepEqual(map.regions[0].monsters, [7, 8]);
    assert.equal(map.regions[0].visible, true);
    assert.notEqual(map.regions[0], reg);
  });
});
