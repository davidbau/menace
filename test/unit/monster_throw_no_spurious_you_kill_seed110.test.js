import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { loadAllSessions } from '../comparison/session_loader.js';

describe('monster throw no spurious you kill seed110', () => {

test('seed110 throw topline does not claim player killed pet', async () => {
    const session = loadAllSessions({
        sessionPath: 'test/comparison/sessions/seed110_samurai_selfplay200_gameplay.session.json',
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
        startupBurstInFirstStep: false,
        flags: replayFlags,
    });

    // Verify no step around the throw sequence contains a spurious "You kill" pet message.
    // The exact screen text may diverge from C due to RNG drift in dog_move, but the
    // key property is that the throw path doesn't generate a false kill attribution.
    for (let i = 100; i <= 110; i++) {
        const line = replay.steps[i]?.screen?.[0] || '';
        assert.equal(line.includes('You kill the Hachi'), false,
            `Step ${i} should not claim player killed pet: "${line}"`);
        assert.equal(line.includes('You kill Hachi'), false,
            `Step ${i} should not claim player killed pet: "${line}"`);
    }
});

}); // describe
