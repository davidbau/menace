import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parent_dnum,
  parent_dlevel,
  level_range,
  pick_level,
  level_difficulty,
  init_mapseen,
  update_mapseen_for,
  save_mapseen,
  load_mapseen,
  rm_mapseen,
  remdun_mapseen,
  recalc_mapseen,
  interest_mapseen,
  print_mapseen,
  overview_stats,
  update_lastseentyp,
  count_feat_lastseentyp,
  query_annotation,
  u_on_rndspot,
  earth_sense,
} from '../../js/dungeon.js';
import { ROOM, STONE } from '../../js/const.js';

function makeMap(game, roomTyp = ROOM) {
  return {
    game,
    uz: { dnum: 0, dlevel: 3 },
    upstair: { x: 5, y: 6 },
    at(x, y) {
      if (x >= 4 && x <= 6 && y >= 5 && y <= 7) return { typ: roomTyp };
      return { typ: STONE };
    },
  };
}

describe('dungeon compatibility surface', () => {
  it('implements parent/level helpers', () => {
    assert.equal(parent_dnum({ end1: { dnum: 7 } }), 7);
    assert.equal(parent_dlevel({ end1: { dlevel: 9 } }), 9);

    const startRef = { value: 0 };
    const count = level_range(0, 3, 5, -1, null, startRef);
    assert.equal(count >= 1, true);
    assert.equal(startRef.value >= 1, true);

    assert.equal(pick_level([false, false, true, false, true], 0), 2);
    assert.equal(pick_level([false, false, true, false, true], 1), 4);

    assert.equal(level_difficulty({ dnum: 0, dlevel: 6 }) >= 1, true);
  });

  it('tracks mapseen state and annotations', () => {
    const game = { mapseenchn: null };
    const map = makeMap(game);

    init_mapseen(game);
    update_mapseen_for(map, game);
    assert.equal(recalc_mapseen(game), 1);

    const saved = save_mapseen(game);
    assert.equal(saved.length, 1);

    const mptr = game.mapseenchn;
    update_lastseentyp(mptr, ROOM, 2);
    assert.equal(count_feat_lastseentyp(mptr, ROOM) >= 2, true);
    assert.equal(interest_mapseen(mptr), true);

    query_annotation(map.uz, game, 'shop route');
    assert.equal(print_mapseen(null, mptr, 0, 0, true).includes('Dlvl'), true);
    assert.equal(overview_stats(game).annotated, 1);

    rm_mapseen(map.uz, game);
    assert.equal(recalc_mapseen(game), 0);

    load_mapseen(saved, game);
    assert.equal(recalc_mapseen(game), 1);

    remdun_mapseen(0, game);
    assert.equal(recalc_mapseen(game), 0);
  });

  it('supports random hero placement and earth sense shim', () => {
    const game = { mapseenchn: null };
    const map = makeMap(game);
    const player = { x: 0, y: 0 };

    assert.equal(u_on_rndspot(map, player), true);
    assert.equal(player.x, 5);
    assert.equal(player.y, 6);
    assert.equal(earth_sense(map, player), true);
  });
});
