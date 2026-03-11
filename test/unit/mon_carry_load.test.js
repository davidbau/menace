import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { curr_mon_load } from '../../js/mon.js';
import { BOULDER, ROCK } from '../../js/objects.js';
import { M2_ROCKTHROW } from '../../js/monsters.js';

function chain(items) {
  for (let i = 0; i < items.length - 1; i++) {
    items[i].nobj = items[i + 1];
  }
  if (items.length) items[items.length - 1].nobj = null;
  return items[0] || null;
}

describe('curr_mon_load', () => {
  it('counts boulder weight for non-rockthrowers', () => {
    const mon = {
      data: { mflags2: 0 },
      minvent: chain([
        { otyp: BOULDER, owt: 6000 },
        { otyp: ROCK, owt: 10 },
      ]),
    };

    assert.equal(curr_mon_load(mon), 6010);
  });

  it('ignores boulder weight for rockthrowers', () => {
    const mon = {
      data: { mflags2: M2_ROCKTHROW },
      minvent: chain([
        { otyp: BOULDER, owt: 6000 },
        { otyp: ROCK, owt: 10 },
      ]),
    };

    assert.equal(curr_mon_load(mon), 10);
  });

  it('does not crash when monster data is missing', () => {
    const mon = {
      minvent: chain([
        { otyp: BOULDER, owt: 6000 },
      ]),
    };

    assert.equal(curr_mon_load(mon), 6000);
  });
});
