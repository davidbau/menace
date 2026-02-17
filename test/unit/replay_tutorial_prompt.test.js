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

        const replay = await replaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        const joined = (replay.steps[1].screen || []).join('\n');
        assert.ok(!joined.includes('Do you want a tutorial?'));
        assert.ok((replay.steps[1].screen || []).some((line) => line.includes('@')));
    });

    it('defers tutorial map generation to the follow-up space step', async () => {
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
                {
                    key: ' ',
                    action: 'more-prompt',
                    rng: [],
                    screen: ['--More--'],
                },
            ],
        };

        const replay = await replaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 3);
        assert.equal((replay.steps[0].rng || []).length, 0);
        const joined = (replay.steps[1].screen || []).join('\n');
        assert.ok(joined.includes('@'));
        assert.ok(!joined.includes('Unknown command'));
        assert.equal((replay.steps[2].rng || []).length, 0);
        assert.equal((replay.steps[2].screen || [])[0], '--More--');
    });
});
