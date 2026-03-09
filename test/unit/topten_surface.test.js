import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  formatkiller,
  writeentry,
  readentry,
  nsb_mung_line,
  nsb_unmung_line,
  topten_print,
  topten_print_bold,
  score_wanted,
  classmon,
  encode_extended_achievements,
  outentry,
} from '../../js/topten.js';

describe('topten C-surface wrappers', () => {
  it('formats and serializes entry surfaces', () => {
    assert.strictEqual(formatkiller({ death: 'killed by a newt' }), 'killed by a newt');
    const line = writeentry({ points: 10, name: 'A' });
    const parsed = readentry(line);
    assert.strictEqual(parsed.points, 10);
    assert.strictEqual(parsed.name, 'A');
  });

  it('mung/unmung roundtrip and print helpers are deterministic', () => {
    const src = 'hello, score!';
    const mung = nsb_mung_line(src);
    assert.strictEqual(nsb_unmung_line(mung), src);
    assert.strictEqual(topten_print('x'), 'x');
    assert.strictEqual(topten_print_bold('x'), '**x**');
  });

  it('compat helper APIs execute and return structured values', () => {
    assert.strictEqual(score_wanted({}, 0), true);
    assert.strictEqual(typeof classmon('WIZ'), 'number');
    assert.strictEqual(typeof encode_extended_achievements(false, { uachieved: [] }), 'number');
    const lines = outentry(
      {
        points: 1, name: 'A', plrole: 'Wiz', plrace: 'Hum', plgend: 'Mal',
        plalign: 'Neu', death: 'quit', deathlev: 1, maxlvl: 1, hp: 1, maxhp: 1, turns: 1,
      },
      1
    );
    assert.ok(Array.isArray(lines) && lines.length >= 1);
  });
});

