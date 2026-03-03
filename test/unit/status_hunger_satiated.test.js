import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createHeadlessGame } from '../../js/headless.js';

describe('status hunger satiated', () => {

test('status line shows Satiated when hunger is above satiation threshold', async () => {
    const game = await createHeadlessGame(1, 11, { wizard: true });
    game.player.hunger = 1201;
    game.docrt();
    const line2 = (game.display.getScreenLines() || [])[23] || '';
    assert.match(line2, /\bSatiated\b/);
});

}); // describe
