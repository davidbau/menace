import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { loadAllSessions } from '../comparison/session_loader.js';

describe('monster throw overflow message seed206', () => {

test('seed206 starts wizard wish prompt via Ctrl+W', async () => {
    const session = loadAllSessions({
        sessionPath: 'test/comparison/sessions/seed206_monk_wizard_gameplay.session.json',
    })[0];

    const replayFlags = { ...DEFAULT_FLAGS };
    replayFlags.color = session.meta.options?.color !== false;
    replayFlags.verbose = (session.meta.options?.verbose === true);
    if (session.meta.options?.autopickup === false) replayFlags.pickup = false;
    if (session.meta.options?.symset === 'DECgraphics') replayFlags.DECgraphics = true;
    replayFlags.bgcolors = true;
    replayFlags.customcolors = true;
    replayFlags.customsymbols = true;
    if (replayFlags.DECgraphics) {
        replayFlags.symset = 'DECgraphics, active, handler=DEC';
    }

    const replay = await replayGameplaySession(session.meta.seed, session.raw, {
        captureScreens: true,
        maxSteps: 10,
        startupBurstInFirstStep: false,
        flags: replayFlags,
    });

    // Wizard wish is now driven by Ctrl+W in this session.
    assert.equal(
        replay.steps[9].screen[0],
        'For what do you wish? 7 blessed'
    );
});

}); // describe
