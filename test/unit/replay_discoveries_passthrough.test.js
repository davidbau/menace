import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replaySession } from '../../js/replay_core.js';

describe('replay discoveries modal handling', () => {
    it('consumes space used to dismiss discoveries instead of passthrough command', async () => {
        const expectedRestored = 'restored map frame';
        const session = {
            version: 3,
            seed: 2,
            options: {
                name: 'Wizard',
                role: 'Wizard',
                race: 'human',
                gender: 'male',
                align: 'neutral',
            },
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                { key: '\\', action: 'discoveries', rng: [], screen: [] },
                { key: ' ', action: 'key-', rng: [], screen: [expectedRestored] },
            ],
        };

        const replay = await replaySession(2, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        assert.match((replay.steps[0].screen || [])[0] || '', /Discoveries, by order of discovery/i);
        assert.equal((replay.steps[1].screen || [])[0] || '', expectedRestored);
        assert.equal(replay.steps[1].rngCalls || 0, 0);
        assert.doesNotMatch((replay.steps[1].screen || []).join('\n'), /Unknown command/i);
    });
});
