import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replaySession } from '../../js/replay_core.js';

describe('replay tutorial prompt handling', () => {
    it('accepting tutorial transitions out of the prompt flow', async () => {
        const session = {
            version: 3,
            seed: 1,
            options: {
                name: 'Wizard',
                role: 'Valkyrie',
                race: 'human',
                gender: 'female',
                align: 'neutral',
            },
            steps: [
                {
                    key: null,
                    action: 'startup',
                    rng: [],
                    screen: 'Do you want a tutorial?\n',
                },
                {
                    key: 'y',
                    action: 'accept-tutorial',
                    rng: [],
                    screen: '',
                },
            ],
        };

        const replay = await replaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
            maxSteps: 1,
        });

        assert.equal(replay.steps.length, 1);
        const joined = (replay.steps[0].screen || []).join('\n');
        assert.ok(!joined.includes('Do you want a tutorial?'));
        assert.ok((replay.steps[0].screen || []).some((line) => line.includes('@')));
    });
});
