import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  line_dist_coord,
  selection_new,
  selection_setpoint,
  selection_getpoint,
  selection_clone,
  selection_clear,
  selection_do_line,
  selection_do_ellipse,
  selection_size_description,
  selection_from_mkroom,
  selection_is_irregular,
  selection_rndcoord,
} from '../../js/sp_lev.js';

describe('selvar compatibility surface', () => {
  it('line_dist_coord returns zero for points on the segment', () => {
    assert.equal(line_dist_coord(0, 0, 4, 0, 2, 0), 0);
    assert.ok(line_dist_coord(0, 0, 4, 0, 2, 3) > 0);
  });

  it('selection_new/setpoint/getpoint/clone/clear are coherent', () => {
    const sel = selection_new();
    selection_setpoint(2, 3, sel, true);
    assert.equal(selection_getpoint(2, 3, sel), true);
    const cloned = selection_clone(sel);
    assert.equal(selection_getpoint(2, 3, cloned), true);
    selection_clear(sel);
    assert.equal(selection_getpoint(2, 3, sel), false);
    assert.equal(selection_getpoint(2, 3, cloned), true);
  });

  it('selection_do_line includes endpoints', () => {
    const sel = selection_new();
    selection_do_line(sel, 1, 1, 4, 1);
    assert.ok(Array.isArray(sel.coords));
    assert.ok(sel.coords.length >= 2);
    const ys = new Set(sel.coords.map(c => c.y));
    assert.equal(ys.size, 1);
  });

  it('ellipse/size/irregular wrappers are executable', () => {
    const sel = selection_new();
    selection_do_ellipse(sel, 10, 10, 2, 2, false);
    assert.equal(typeof selection_size_description(sel), 'string');
    assert.equal(typeof selection_is_irregular(sel), 'boolean');
    const rc = selection_rndcoord(sel);
    assert.ok(rc && Number.isInteger(rc.x) && Number.isInteger(rc.y));
  });

  it('selection_from_mkroom builds inclusive room area', () => {
    const sel = selection_from_mkroom({ lx: 5, ly: 6, hx: 6, hy: 7 });
    assert.equal(selection_getpoint(5, 6, sel), true);
    assert.equal(selection_getpoint(6, 7, sel), true);
    assert.equal(selection_getpoint(7, 7, sel), false);
  });
});
