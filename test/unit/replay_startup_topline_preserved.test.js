import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

describe('replay startup topline preservation', () => {
    it('does not inject recorded startup topline into live replay state', async () => {
        const startupTopline = 'Map dumped to /tmp/webhack-session-test/dumpmap.txt.';
        const session = {
            version: 4,
            seed: 204,
            env: { NETHACK_SEED: '204', NETHACK_FIXED_DATETIME: '20000110090000' },
            nethackrc: 'OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral,!tutorial\nWIZARD=Wizard\n',
            steps: [
                {
                    key: null,
                    action: 'startup',
                    rng: [],
                    screen: [startupTopline, '', ''],
                },
                // First key dismisses lore --More-- and shows welcome
                {
                    key: ' ',
                    action: 'lore-dismiss',
                    rng: [],
                    screen: [],
                },
                {
                    key: '1',
                    action: 'key-1',
                    rng: [],
                    screen: [],
                },
                {
                    key: '5',
                    action: 'key-5',
                    rng: [],
                    screen: ['Count: 15'],
                },
            ],
        };

        const replay = await replayGameplaySession(204, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        // Lore dismiss + '1' + '5' = 3 gameplay steps
        assert.equal(replay.steps.length, 3);
        // First step: space dismisses lore, shows welcome (not recorded startup topline)
        const firstTopline = (replay.steps[0].screen || [])[0];
        assert.notEqual(firstTopline, startupTopline,
            'Recorded startup topline should not leak into live replay');
        // Last step: "Count: 15" from the count prefix
        assert.equal((replay.steps[2].screen || [])[0], 'Count: 15');
    });
});
