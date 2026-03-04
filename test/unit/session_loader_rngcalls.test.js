import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getSessionScreenAnsiLines, normalizeSession } from '../comparison/session_loader.js';

describe('session loader rngCalls', () => {

test('normalizeSession does not synthesize rngCalls from explicit rng traces', () => {
    const normalized = normalizeSession({
        version: 3,
        seed: 1,
        steps: [
            { key: null, action: 'startup', rng: [], screen: '' },
            { key: 's', action: 'search', rng: [], screen: '' },
            { key: 'h', action: 'move-west', rng: ['rn2(5)=1'], screen: '' },
        ],
    }, { file: 'tmp.session.json', dir: '.' });

    assert.equal(normalized.startup?.rngCalls, null);
    assert.equal(normalized.steps[0]?.rngCalls, null);
    assert.equal(normalized.steps[1]?.rngCalls, null);
});

test('normalizeSession preserves explicit rngCalls values', () => {
    const normalized = normalizeSession({
        version: 3,
        seed: 1,
        startup: { rngCalls: 0, screen: '' },
        steps: [
            { key: 's', action: 'search', rngCalls: 2, screen: '' },
        ],
    }, { file: 'tmp.session.json', dir: '.' });

    assert.equal(normalized.startup?.rngCalls, 0);
    assert.equal(normalized.steps[0]?.rngCalls, 2);
});

test('getSessionScreenAnsiLines returns ANSI lines from v3 screen string', () => {
    // v3 canonical: screen is a string with ANSI sequences, split by newline.
    const lines = getSessionScreenAnsiLines({
        screen: '\u001b[31mred-line\u001b[0m\nplain-line',
    });
    assert.deepEqual(lines, ['\u001b[31mred-line\u001b[0m', 'plain-line']);
});

test('normalizeSession infers datetime and recordedAt from keylog meta row', () => {
    const dir = mkdtempSync(join(tmpdir(), 'session-loader-test-'));
    try {
        const keylog = join(dir, 'session.jsonl');
        writeFileSync(
            keylog,
            `${JSON.stringify({
                type: 'meta',
                datetime: '20000110090000',
                recordedAt: '2026-03-03T22:30:16.799Z',
            })}\n{"type":"key","key":"h"}\n`
        );

        const normalized = normalizeSession({
            version: 3,
            seed: 1,
            regen: { keylog },
            steps: [],
        }, { file: 'tmp.session.json', dir: '.' });

        assert.equal(normalized.meta.options.datetime, '20000110090000');
        assert.equal(normalized.meta.options.recordedAt, '2026-03-03T22:30:16.799Z');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

}); // describe
