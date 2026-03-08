import { test, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { handleWizLoadDes } from '../../js/wizcmds.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';

test('#wizloaddes prompt matches C wording', async () => {
    clearInputQueue();
    pushInput('\n'.charCodeAt(0));

    let topline = '';
    const display = {
        clearRow() {},
        async putstr(_x, _y, text) {
            topline = String(text || '');
        },
        putstr_message() {},
    };

    const game = {
        player: { dungeonLevel: 1 },
        display,
        changeLevel: async () => {},
    };

    const result = await handleWizLoadDes(game);
    assert.equal(result.tookTime, false);
    assert.equal(topline, 'Load which des lua file? ');
});
