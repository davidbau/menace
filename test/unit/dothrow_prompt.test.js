import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeSession, stripAnsiSequences } from '../../test/comparison/session_loader.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';

describe('dothrow prompt parity', () => {
    it('includes swap weapon in throw prompt (seed031 step 9)', async () => {
        const path = 'test/comparison/sessions/seed031_manual_direct.session.json';
        const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
        const session = normalizeSession(raw, { file: path, dir: '.' });
        const args = prepareReplayArgs(session.meta.seed, session.raw, {
            captureScreens: true,
            maxSteps: 9,
        });
        const replay = await replaySession(args.seed, args.opts, args.keys);
        const step9 = replay.steps[9];
        const top = stripAnsiSequences((step9?.screen || '').split('\n')[0] || '');
        assert.equal(top, 'What do you want to throw? [b or ?*]');
    });
});
