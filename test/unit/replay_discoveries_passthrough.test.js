import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

describe('replay discoveries modal handling', () => {
    it('consumes space used to dismiss discoveries instead of passthrough command', async () => {
        const session = {
            version: 4,
            seed: 2,
            env: { NETHACK_SEED: '2', NETHACK_FIXED_DATETIME: '20000110090000' },
            nethackrc: 'OPTIONS=name:Wizard,role:Wizard,race:human,gender:male,align:neutral,!tutorial\nWIZARD=Wizard\n',
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                // Dismiss lore --More--
                { key: ' ', action: 'lore-dismiss', rng: [], screen: [] },
                { key: '\\', action: 'discoveries', rng: [], screen: [] },
                { key: ' ', action: 'key-', rng: [], screen: ['restored map frame'] },
            ],
        };

        const replay = await replayGameplaySession(2, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 3);
        // Step 0: lore dismiss (shows welcome)
        // Step 1: discoveries modal
        assert.match((replay.steps[1].screen || [])[0] || '', /Discoveries/i);
        // Step 2: space dismisses discoveries, no "Unknown command"
        assert.ok((replay.steps[2].screen || []).length > 0);
        assert.doesNotMatch((replay.steps[2].screen || []).join('\n'), /Unknown command/i);
    });
});
