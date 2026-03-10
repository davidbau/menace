import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  iter_mons,
  iter_mons_safe,
  relmon,
  m_into_limbo,
  mnearto,
  mnexto,
  mon_allowflags,
  mon_animal_list,
  pick_animal,
  decide_to_shapeshift,
  validspecmon,
  validvamp,
  wiz_force_cham_form,
  dead_species,
  egg_type_from_parent,
  kill_genocided_monsters,
  mon_leaving_level,
  monstone,
  movemon_singlemon,
  mpickstuff,
  normal_shape,
  peacefuls_respond,
  deal_with_overcrowding,
  usmellmon,
} from '../../js/mon.js';
import { ALLOW_M, ALLOW_TRAPS, ALLOW_MDISP } from '../../js/const.js';
import { PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_KILLER_BEE, mons, G_GENO } from '../../js/monsters.js';
import { ROCK_CLASS } from '../../js/objects.js';

describe('mon compatibility surface', () => {
  it('iterates and mutates monster lists', () => {
    const m1 = { mx: 1, my: 1, mndx: PM_KILLER_BEE, data: mons[PM_KILLER_BEE] };
    const m2 = { mx: 2, my: 2, mndx: PM_KILLER_BEE, data: mons[PM_KILLER_BEE] };
    const map = { monsters: [m1, m2] };

    let seen = 0;
    iter_mons(() => { seen++; }, map);
    assert.equal(seen, 2);

    iter_mons_safe(mon => { relmon(mon, map); }, map);
    assert.equal(map.monsters.length, 0);

    map.monsters.push(m1);
    m_into_limbo(m1, map);
    assert.equal(map.monsters.length, 0);
    assert.equal(m1.mstate, 'limbo');
  });

  it('moves and classifies monsters', async () => {
    const mon = { mx: 0, my: 0, mndx: PM_KILLER_BEE, data: mons[PM_KILLER_BEE], mpeaceful: 0, movement: 0 };
    const target = { x: 5, y: 6 };
    const player = { x: 5, y: 6 };
    const map = { monsters: [mon], objects: [] };

    assert.equal(mnearto(mon, 3, 4, map), true);
    assert.equal(mon.mx, 3);
    assert.equal(mon.my, 4);
    assert.equal(mnexto(mon, target, map), true);
    assert.equal(mon.mx, 5);
    assert.equal(mon.my, 6);

    const flags = mon_allowflags(mon, map, player);
    assert.equal((flags & ALLOW_M) !== 0, true);
    assert.equal((flags & ALLOW_TRAPS) !== 0, true);
    assert.equal((flags & ALLOW_MDISP) !== 0, true);

    assert.equal(await movemon_singlemon(mon, map, player), true);
  });

  it('handles shapeshift/genocide helpers', () => {
    const mon = { mndx: PM_VAMPIRE, cham: PM_VAMPIRE_LEADER, data: mons[PM_VAMPIRE], mx: 1, my: 1 };
    const game = { mvitals: Array.from({ length: 700 }, () => ({ mvflags: 0 })) };

    assert.equal(validspecmon(PM_VAMPIRE), true);
    assert.equal(validvamp(PM_VAMPIRE), true);
    assert.equal(validvamp(PM_VAMPIRE_LEADER), true);
    assert.equal(!!mon_animal_list().length, true);
    assert.equal(Number.isInteger(pick_animal()), true);

    assert.equal(wiz_force_cham_form(mon, PM_VAMPIRE_LEADER), true);
    assert.equal(mon.mndx, PM_VAMPIRE_LEADER);
    assert.equal(normal_shape(mon), true);

    game.mvitals[PM_KILLER_BEE] = { mvflags: G_GENO };
    assert.equal(dead_species(PM_KILLER_BEE, false, game), true);
    assert.equal(dead_species(PM_VAMPIRE, false, game), false);
    assert.equal(egg_type_from_parent(PM_KILLER_BEE) >= 0, true);

    const doomed = { mx: 4, my: 4, mndx: PM_KILLER_BEE, data: mons[PM_KILLER_BEE] };
    const map = { monsters: [doomed] };
    assert.equal(kill_genocided_monsters(map, game), 1);
    assert.equal(map.monsters.length, 0);

    const shapeshiftDecision = decide_to_shapeshift(mon, game);
    assert.equal(shapeshiftDecision === true || shapeshiftDecision === false, true);
  });

  it('supports leaving-level, pickup, peaceful response, overcrowding, smell', () => {
    const mon = { mx: 2, my: 2, mndx: PM_KILLER_BEE, data: mons[PM_KILLER_BEE], mpeaceful: 1, minvent: [] };
    const player = { x: 2, y: 2, ustuck: mon };
    const obj = { ox: 2, oy: 2, oclass: ROCK_CLASS, where: 'OBJ_FLOOR' };
    const map = { monsters: [mon], objects: [obj], at() { return { mem_invis: false }; } };

    const picked = mpickstuff(mon, map);
    assert.equal(!!picked, true);

    assert.equal(mon_leaving_level(mon, map, player), true);
    map.monsters.push(mon);
    assert.equal(monstone(mon, map, player), 1);

    map.monsters.push({ mpeaceful: 1, mx: 1, my: 1 }, { mpeaceful: 1, mx: 2, my: 2 });
    assert.equal(peacefuls_respond(map) >= 2, true);

    map.monsters = Array.from({ length: 125 }, (_, i) => ({ mx: i % 10, my: i % 10 }));
    assert.equal(deal_with_overcrowding(map), 5);
    assert.equal(map.monsters.length, 120);

    assert.equal(usmellmon({ mx: 2, my: 2 }, { x: 3, y: 3 }), true);
    assert.equal(usmellmon({ mx: 20, my: 20 }, { x: 1, y: 1 }), false);
  });
});
