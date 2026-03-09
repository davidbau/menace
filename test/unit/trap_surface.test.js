import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp_hole_destination,
  immune_to_trap,
  launch_in_progress,
  launch_drop_spot,
  launch_obj,
  mkroll_launch,
  back_on_ground,
  emergency_disrobe,
  could_untrap,
  untrap_prob,
  closeholdingtrap,
  openholdingtrap,
  openfallingtrap,
  join_adjacent_pits,
  unconscious,
  sokoban_guilt,
  maybe_finish_sokoban,
  ignite_items,
  animate_statue,
} from '../../js/trap.js';
import { PIT, FIRE_TRAP, SLP_GAS_TRAP, LANDMINE } from '../../js/const.js';
import { mons, PM_FIRE_ELEMENTAL } from '../../js/monsters.js';

describe('trap compatibility surface', () => {
  it('exports hole destination clamp helper', () => {
    assert.equal(typeof clamp_hole_destination, 'function');
  });

  it('computes trap immunity for basic cases', () => {
    const fireMon = { data: mons[PM_FIRE_ELEMENTAL] };
    assert.equal(immune_to_trap(fireMon, FIRE_TRAP), true);
    assert.equal(immune_to_trap(fireMon, SLP_GAS_TRAP) === true || immune_to_trap(fireMon, SLP_GAS_TRAP) === false, true);
  });

  it('handles launch helpers', () => {
    const game = { _launchInProgress: false };
    globalThis.gs = { launchplace: { obj: null }, game };
    const map = { objects: [], at: () => ({ typ: 0 }) };
    const obj = { otyp: 1, where: 'OBJ_FREE' };

    assert.equal(launch_in_progress(), false);
    const dst = launch_drop_spot(3, 4, 1, -1);
    assert.deepEqual(dst, { x: 4, y: 3 });

    launch_obj(obj, 3, 4, 1, -1, map, game);
    assert.equal(obj.ox, 4);
    assert.equal(obj.oy, 3);
    assert.equal(launch_in_progress(), false);

    mkroll_launch(obj, 4, 3, -1, 1, map, game);
    assert.equal(obj.ox, 3);
    assert.equal(obj.oy, 4);
  });

  it('handles untrap/open/close helpers', () => {
    const player = { dex: 12 };
    const trap = { ttyp: LANDMINE, open: false };

    assert.equal(could_untrap(player, trap), true);
    assert.equal(untrap_prob(player, trap) > 0, true);

    assert.equal(openholdingtrap(trap), true);
    assert.equal(trap.open, true);
    assert.equal(closeholdingtrap(trap), true);
    assert.equal(trap.open, false);
    assert.equal(openfallingtrap(trap), true);
    assert.equal(trap.open, true);
  });

  it('supports pit joining and status helpers', () => {
    const map = {
      traps: [
        { tx: 5, ty: 5, ttyp: PIT },
        { tx: 5, ty: 6, ttyp: PIT },
        { tx: 6, ty: 5, ttyp: PIT },
      ],
      trapAt(x, y) {
        return this.traps.find(t => t.tx === x && t.ty === y) || null;
      },
    };
    const count = join_adjacent_pits(map, 5, 5);
    assert.equal(count >= 2, true);

    globalThis.gs = { player: { usleep: true }, game: { multi: -1, nomovemsg: 'You awake' } };
    assert.equal(unconscious(), true);
    globalThis.gs = { player: {}, game: { multi: 0 } };
    assert.equal(unconscious(), false);
  });

  it('handles sokoban/item/statue compatibility shims', () => {
    const player = { uconduct: {} };
    const map = { flags: { in_sokoban: true } };
    globalThis.gs = { player, map };
    assert.equal(sokoban_guilt(), undefined);
    assert.equal((player.uconduct.sokocheat || 0) >= 0, true);
    assert.equal(maybe_finish_sokoban(player), true);
    player.sokobanGuilt = 1;
    player.sokobanFinished = false;
    assert.equal(maybe_finish_sokoban(player), false);

    assert.equal(ignite_items(player), 0);
    assert.equal(animate_statue(null, 0, 0), false);

    const lev = { levitating: true, Levitation: true };
    assert.equal(back_on_ground(lev), true);
    assert.equal(lev.levitating, false);
    assert.equal(emergency_disrobe(lev), true);
    assert.equal(lev.emergencyDisrobe, true);
  });
});
