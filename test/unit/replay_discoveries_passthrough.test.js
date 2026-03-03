import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

describe('replay discoveries modal handling', () => {
    it('consumes space used to dismiss discoveries instead of passthrough command', async () => {
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
                { key: ' ', action: 'key-', rng: [], screen: ['restored map frame'] },
            ],
        };

        const replay = await replayGameplaySession(2, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        assert.match((replay.steps[0].screen || [])[0] || '', /Discoveries, by order of discovery/i);
        assert.ok((replay.steps[1].screen || []).length > 0);
        assert.equal(replay.steps[1].rngCalls || 0, 0);
        assert.doesNotMatch((replay.steps[1].screen || []).join('\n'), /Unknown command/i);
    });
});
