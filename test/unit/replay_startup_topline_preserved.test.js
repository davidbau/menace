import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

describe('replay startup topline preservation', () => {
    it('does not inject recorded startup topline into live replay state', async () => {
        const startupTopline = 'Map dumped to /tmp/webhack-session-test/dumpmap.txt.';
        const liveWelcomeTopline = 'NetHack Royal Jelly -- Welcome to the Mazes of Menace! [WIZARD MODE] (seed:204)';
        const statusLine1 = 'Wizard the Stripling      St:18 Dx:9 Co:18 In:8 Wi:7 Ch:11 Neutral';
        const statusLine2 = 'Dlvl:1 $:0 HP:16(16) Pw:2(2) AC:6 Xp:1';
        const session = {
            version: 3,
            seed: 204,
            options: {
                name: 'Wizard',
                role: 'Valkyrie',
                race: 'human',
                gender: 'female',
                align: 'neutral',
                wizard: true,
            },
            steps: [
                {
                    key: null,
                    action: 'startup',
                    rng: [],
                    screen: [startupTopline, '', '', statusLine1, statusLine2],
                },
                {
                    key: '1',
                    action: 'key-1',
                    rng: [],
                    screen: [startupTopline, '', '', statusLine1, statusLine2],
                },
                {
                    key: '5',
                    action: 'key-5',
                    rng: [],
                    screen: ['Count: 15', '', '', statusLine1, statusLine2],
                },
            ],
        };

        const replay = await replayGameplaySession(204, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 2);
        const firstTopline = (replay.steps[0].screen || [])[0];
        assert.ok(firstTopline === '' || firstTopline === liveWelcomeTopline);
        assert.notEqual(firstTopline, startupTopline);
        assert.equal((replay.steps[1].screen || [])[0], 'Count: 15');
    });
});
