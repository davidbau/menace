import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

describe('replay tutorial prompt handling', () => {
    it('does not treat recorded tutorial text as replay control flow', async () => {
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
                    screen: ['Do you want a tutorial?'],
                },
                {
                    key: 'y',
                    action: 'accept-tutorial',
                    rng: [],
                    screen: [],
                },
                {
                    key: ' ',
                    action: 'start-tutorial',
                    rng: [],
                    screen: [],
                },
            ],
        };

        const replay = await replayGameplaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        const joined = (replay.steps[1].screen || []).join('\n');
        assert.ok(!joined.includes('Do you want a tutorial?'));
        assert.equal((replay.steps[1].rng || []).length, 0);
    });

    it('replays follow-up tutorial keys as plain key input', async () => {
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
                    screen: ['Do you want a tutorial?'],
                },
                {
                    key: 'y',
                    action: 'accept-tutorial',
                    rng: [],
                    screen: ['Do you want a tutorial?'],
                },
                {
                    key: ' ',
                    action: 'start-tutorial',
                    rng: [],
                    screen: [],
                },
            ],
        };

        const replay = await replayGameplaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        assert.equal((replay.steps[0].rng || []).length, 0);
        assert.equal((replay.steps[1].rng || []).length, 0);
        assert.ok(!((replay.steps[1].screen || []).join('\n')).includes('Do you want a tutorial?'));
    });
});
