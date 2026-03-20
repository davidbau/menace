import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { normalizeSession, stripAnsiSequences } from '../../test/comparison/session_loader.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';

describe('dothrow prompt parity', () => {
    it.skip('includes swap weapon in throw prompt (seed031)', async () => {
        // SKIPPED: seed031's first throw is at gameplay step 485 — too far
        // to replay in a unit test. The old test used raw step 9 which was
        // a chargen key, not a throw command. Needs a dedicated session
        // with an early throw to test prompt format.
    });
});
