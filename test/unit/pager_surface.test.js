import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  append_str,
  waterbody_name,
  ice_descr,
  mhidden_description,
  self_lookat,
  object_from_map,
  look_at_monster,
  lookat,
  add_cmap_descr,
  add_quoted_engraving,
  whatdoes_help,
  whatdoes_cond,
  look_traps,
  look_engrs,
} from '../../js/pager.js';
import { LAVAPOOL, POOL, STAIRS } from '../../js/const.js';

describe('pager compatibility surface', () => {
  it('implements basic pure helpers', () => {
    assert.equal(append_str('ab', 'cd'), 'abcd');
    assert.equal(ice_descr(3, 4), 'ice');
    assert.equal(self_lookat(), 'you');
    assert.equal(mhidden_description(null), 'hidden monster');
    assert.equal(whatdoes_help(), 'Type a key to learn what command it performs.');
  });

  it('maps waterbody names', () => {
    assert.equal(waterbody_name({ typ: POOL }), 'water');
    assert.equal(waterbody_name({ typ: LAVAPOOL }), 'molten lava');
    assert.equal(waterbody_name(null), 'water');
  });

  it('returns top object from object map', () => {
    const map = {
      objectsAt(x, y) {
        if (x === 1 && y === 2) return [{ dname: 'apple' }, { dname: 'pear' }];
        return [];
      },
    };
    assert.equal(object_from_map(0, 1, 2, null, map)?.dname, 'pear');
    assert.equal(object_from_map(0, 8, 9, null, map), null);
  });

  it('provides look-derived descriptions', () => {
    const map = {
      at() {
        return { typ: STAIRS, flags: 0 };
      },
      trapAt(x, y) {
        return x === 7 && y === 8 ? { tseen: true } : null;
      },
      objectsAt() {
        return [];
      },
      monsterAt() {
        return null;
      },
      engravings: [{ x: 7, y: 8, text: 'Elbereth' }],
    };
    const game = { map, player: { x: 0, y: 0 } };

    const looked = lookat(3, 4, game);
    assert.equal(looked.found, true);
    assert.match(looked.text, /staircase down/i);

    assert.equal(look_traps(map, 7, 8), 'a trap');
    assert.equal(look_traps(map, 1, 1), '');
    assert.equal(look_engrs(map, 7, 8), 'Elbereth');
    assert.equal(look_engrs(map, 1, 1), '');
  });

  it('formats text helpers', () => {
    assert.equal(add_quoted_engraving('Seen:', '  Elbereth  '), 'Seen: "Elbereth"');
    assert.equal(add_quoted_engraving('Seen:', ''), 'Seen:');

    const withTerrain = add_cmap_descr('', { typ: STAIRS, flags: 0 });
    assert.match(withTerrain, /staircase down/i);
  });

  it('recognizes command descriptions', () => {
    assert.equal(whatdoes_cond('?'), true);
    assert.equal(whatdoes_cond('h'), true);
    assert.equal(whatdoes_cond('\u0000'), false);
    assert.equal(look_at_monster({ name: 'newt', data: { mname: 'newt' } }), 'newt');
    assert.equal(look_at_monster(null), 'monster');
  });
});
