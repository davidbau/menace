import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { headlessStart } from '../../js/headless.js';

describe('status hunger satiated', () => {

test('status line shows Satiated when hunger is above satiation threshold', async () => {
    const game = await headlessStart(1, { roleIndex: 11, wizard: true });
    game.u.hunger = 1201;
    game.docrt();
    const line2 = (game.display.getScreenLines() || [])[23] || '';
    assert.match(line2, /\bSatiated\b/);
});

}); // describe
