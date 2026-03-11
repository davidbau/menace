import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  init_dummyobj,
  where_name,
  unknow_object,
  copy_oextra,
  add_to_buried,
  item_on_ice,
  shrink_glob,
  shrinking_glob_gone,
  rnd_treefruit_at,
  mk_named_object,
  mkobj_at,
  remove_object,
  replace_object,
} from '../../js/mkobj.js';
import { FOOD_CLASS, APPLE, STATUE, ICE_BOX, POT_WATER } from '../../js/objects.js';
import { ICE, ROOM } from '../../js/const.js';

describe('mkobj compatibility surface', () => {
  it('initializes and reports object location names', () => {
    const d = init_dummyobj();
    assert.equal(d.where, 'OBJ_FREE');
    assert.equal(where_name(d), 'free');
  });

  it('can clear known flags and copy oextra', () => {
    const o = { dknown: 1, bknown: 1, rknown: 1 };
    unknow_object(o);
    assert.equal(o.dknown, 0);
    assert.equal(o.bknown, 0);
    assert.equal(o.rknown, 0);

    const dst = copy_oextra({ oextra: { foo: 1 } }, {});
    assert.deepEqual(dst.oextra, { foo: 1 });
  });

  it('handles buried placement and ice checks', () => {
    const map = {
      buried: [],
      at(x, y) {
        return { typ: (x === 3 && y === 4) ? ICE : ROOM };
      },
      objects: [],
    };
    const o = { ox: 3, oy: 4, otyp: POT_WATER };
    add_to_buried(o, map);
    assert.equal(o.where, 6); // OBJ_BURIED
    assert.equal(map.buried.length, 1);
    assert.equal(item_on_ice(o, map), true);
  });

  it('shrinks globs and reports disappearance', () => {
    const glob = { owt: 3, oeaten: 3 };
    shrink_glob(glob, 2);
    assert.equal(glob.owt, 1);
    assert.equal(shrinking_glob_gone(glob), false);
    shrink_glob(glob, 5);
    assert.equal(shrinking_glob_gone(glob), true);
  });

  it('creates and manipulates floor objects', () => {
    const map = {
      objects: [],
      at() { return { typ: ROOM }; },
    };
    const a = mkobj_at(map, FOOD_CLASS, 10, 11, false);
    assert.equal(!!a, true);
    assert.equal(map.objects.length, 1);

    const b = mk_named_object(STATUE, 'hero statue', map, 10, 11);
    assert.equal(b.oname, 'hero statue');
    assert.equal(map.objects.length, 2);

    const repl = mk_named_object(ICE_BOX, 'cold box');
    replace_object(a, repl, map);
    assert.equal(map.objects.includes(repl), true);
    remove_object(repl, map);
    assert.equal(map.objects.includes(repl), false);
  });

  it('picks tree fruit from known fruit set', () => {
    const fruit = rnd_treefruit_at(1, 2, null);
    assert.equal(typeof fruit, 'number');
    assert.equal(fruit === APPLE || fruit > 0, true);
  });
});
