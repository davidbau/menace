import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { replayGameplaySession } from './session_helpers.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { normalizeSession } from './session_loader.js';

describe('replay key-level snapshot invariants', () => {

function comparable(entries) {
    const out = [];
    for (const raw of (entries || [])) {
        if (typeof raw !== 'string') continue;
        const at = raw.indexOf(' @ ');
        const norm = at >= 0 ? raw.slice(0, at) : raw;
        if (!norm || norm.startsWith('>') || norm.startsWith('<') || norm.startsWith('~')) continue;
        if (norm.startsWith('rne(') || norm.startsWith('rnz(') || norm.startsWith('d(')) continue;
        out.push(norm.replace(/=\d+$/, ''));
    }
    return out;
}

test('replay emits per-key results with correct structure (seed110)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed110_samurai_selfplay200_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed110_samurai_selfplay200_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replayGameplaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        // Per-key results are available as replay.keys
        assert.ok(Array.isArray(replay.keys));
        assert.ok(replay.keys.length > 0);
        const expectedKeys = session.steps.reduce(
            (n, s) => n + ((typeof s?.key === 'string') ? s.key.length : 0),
            0
        );
        assert.equal(replay.keys.length, expectedKeys);
        for (let i = 0; i < replay.keys.length; i++) {
            const k = replay.keys[i];
            assert.equal(typeof k.ch, 'string');
            assert.equal(Array.isArray(k.rng), true);
        }
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

test('per-step RNG equals concatenated per-key RNG (seed5)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed5_gnomish_mines_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replayGameplaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        // Step-level RNG should equal the full per-key RNG stream
        const stepsRng = comparable(replay.steps.flatMap((s) => s.rng || []));
        const keysRng = comparable(replay.keys.flatMap((k) => k.rng || []));
        assert.deepEqual(stepsRng, keysRng);
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

test('global step RNG stream equals global key RNG stream (seed5 maxSteps)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed5_gnomish_mines_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replayGameplaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            maxSteps: 541,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        const stepsRng = comparable(replay.steps.flatMap((s) => s.rng || []));
        const keysRng = comparable(replay.keys.flatMap((k) => k.rng || []));
        assert.deepEqual(stepsRng, keysRng);

        const expectedKeys = session.steps.slice(0, 541).reduce(
            (n, s) => n + ((typeof s?.key === 'string') ? s.key.length : 0),
            0
        );
        assert.equal(replay.keys.length, expectedKeys);
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

}); // describe
