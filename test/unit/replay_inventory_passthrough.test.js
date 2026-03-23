import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { replayGameplaySession } from '../comparison/session_helpers.js';

const V4_RC = 'OPTIONS=name:Wizard,role:Valkyrie,race:human,gender:female,align:neutral,!tutorial\nWIZARD=Wizard\n';

describe('replay inventory modal handling', () => {
    it('keeps inventory open on non-space keys in replay', async () => {
        const session = {
            version: 4,
            seed: 1,
            env: { NETHACK_SEED: '1', NETHACK_FIXED_DATETIME: '20000110090000' },
            nethackrc: V4_RC,
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                { key: ' ', action: 'lore-dismiss', rng: [], screen: [] },
                { key: 'i', action: 'inventory', rng: [], screen: [] },
                { key: 's', action: 'search', rng: [], screen: [] },
            ],
        };

        const replay = await replayGameplaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 3);
        // Step 1: inventory should show Weapons
        assert.match((replay.steps[1].screen || [])[0] || '', /Weapons/);
        // Step 2: 's' key should keep inventory open (not search command)
        assert.match((replay.steps[2].screen || [])[0] || '', /Weapons/);
        assert.equal(replay.steps[2].rngCalls || 0, 0);
    });

    it('does not passthrough Enter after dismissing inventory', async () => {
        const session = {
            version: 4,
            seed: 1,
            env: { NETHACK_SEED: '1', NETHACK_FIXED_DATETIME: '20000110090000' },
            nethackrc: V4_RC,
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                { key: ' ', action: 'lore-dismiss', rng: [], screen: [] },
                { key: 'i', action: 'inventory', rng: [], screen: [] },
                { key: '\n', action: 'key-', rng: [], screen: [] },
            ],
        };

        const replay = await replayGameplaySession(1, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 3);
        assert.equal(replay.steps[2].rngCalls || 0, 0);
        assert.doesNotMatch((replay.steps[2].screen || []).join('\n'), /Unknown command|You see no|Do what|Weapons/);
    });

    it('propagates typed chars while inventory ":" search prompt is pending', async () => {
        const session = {
            version: 4,
            seed: 42,
            env: { NETHACK_SEED: '42', NETHACK_FIXED_DATETIME: '20000110090000' },
            nethackrc: V4_RC,
            steps: [
                { key: null, action: 'startup', rng: [], screen: [] },
                { key: ' ', action: 'lore-dismiss', rng: [], screen: [] },
                { key: 'i', action: 'inventory', rng: [], screen: [] },
                { key: ':', action: 'look', rng: [], screen: ['Search for:'] },
                { key: 'k', action: 'move-north', rng: [], screen: ['Search for: k'] },
            ],
        };

        const replay = await replayGameplaySession(42, session, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });

        assert.equal(replay.steps.length, 4);
        // Step 1: inventory
        assert.match((replay.steps[1].screen || [])[0] || '', /Weapons/);
        // Step 2: ":" search prompt
        assert.equal((replay.steps[2].screen || [])[0] || '', 'Search for:');
        // Step 3: typed 'k' shows in search
        assert.equal((replay.steps[3].screen || [])[0] || '', 'Search for: k');
        assert.equal(replay.steps[3].rngCalls || 0, 0);
    });
});
