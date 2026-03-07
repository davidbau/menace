import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeSession, stripAnsiSequences } from '../../test/comparison/session_loader.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';

describe('pager quick-look prompt parity', () => {
    it('shows C-style Pick prompt before getpos in quick look (seed033 step 61)', async () => {
        const path = 'test/comparison/sessions/seed033_manual_direct.session.json';
        const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
        const session = normalizeSession(raw, { file: path, dir: '.' });
        const args = prepareReplayArgs(session.meta.seed, session.raw, {
            captureScreens: true,
            maxSteps: 61,
        });
        const replay = await replaySession(args.seed, args.opts, args.keys);
        const step61 = replay.steps[61];
        const top = stripAnsiSequences((step61?.screen || '').split('\n')[0] || '');
        assert.equal(top, 'Pick a monster, object or location.--More--');
    });
});
