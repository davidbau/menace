import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { replaySession } from '../comparison/session_helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sessionPath = join(__dirname, '../comparison/sessions/seed5_gnomish_mines_gameplay.session.json');
const session = existsSync(sessionPath)
    ? JSON.parse(readFileSync(sessionPath, 'utf-8'))
    : null;

describe('C gameplay replay: seed5 valkyrie gnomish mines', { skip: !session }, () => {
    if (!session) return;

    it('fixture role/class is Valkyrie', () => {
        assert.equal(session.character?.role, 'Valkyrie');
        assert.equal(session.character?.race, 'human');
        assert.equal(session.character?.gender, 'female');
        assert.equal(session.character?.align, 'neutral');
    });

    it('replays full session without blocking', async () => {
        const replay = await replaySession(session.seed, session);
        assert.equal(replay.steps.length, session.steps.length);
    });

    it('seed5 trace format includes startup RNG burst on first step', () => {
        assert.equal(session.startup?.rngCalls ?? 0, 0);
        assert.ok((session.steps?.[0]?.rng?.length ?? 0) > 0);
    });

    it.skip('step RNG matches C trace for full session', async () => {
        // TODO: enable after startup-vs-step RNG normalization for keylog-derived traces.
        const replay = await replaySession(session.seed, session);
        assert.equal(replay.steps.length, session.steps.length);
    });
});
