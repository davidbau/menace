import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { headlessStart } from '../../js/headless.js';

describe('status hunger satiated', () => {

test('status line shows Satiated when hunger is above satiation threshold', async () => {
    const game = await headlessStart(1, { roleIndex: 11, wizard: true });
    game.u.uhs = 0; // 0 = Satiated (C ref: botl.c hunger state enum)
    game.u._botl = true;
    if (typeof game.display.renderStatus === 'function') {
        game.display.renderStatus(game.u);
    }
    const line2 = (game.display.getScreenLines() || [])[game.display.rows - 1] || '';
    assert.match(line2, /\bSatiated\b/);
});

}); // describe
