import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { setFixedDatetime } from '../../js/calendar.js';
import { startRecording, getKeylog, startReplay } from '../../js/keylog.js';

describe('keylog datetime repro contract', () => {
    const prevWindow = globalThis.window;
    const prevSessionStorage = globalThis.sessionStorage;

    beforeEach(() => {
        const session = new Map();
        globalThis.sessionStorage = {
            getItem(key) { return session.has(key) ? session.get(key) : null; },
            setItem(key, value) { session.set(key, String(value)); },
            removeItem(key) { session.delete(key); },
        };
        globalThis.window = {
            location: { href: 'https://example.test/nethack/' },
            gameInstance: { turnCount: 12 },
        };
        setFixedDatetime('20000110090000');
    });

    afterEach(() => {
        setFixedDatetime(null);
        globalThis.window = prevWindow;
        globalThis.sessionStorage = prevSessionStorage;
    });

    test('getKeylog records deterministic session datetime', () => {
        startRecording(12345, {});
        const keylog = getKeylog();
        assert.equal(keylog.seed, 12345);
        assert.equal(keylog.datetime, '20000110090000');
        assert.equal(keylog.metadata.turns, 12);
    });

    test('startReplay restores datetime into replay URL', () => {
        startReplay({
            seed: 12345,
            datetime: '20000110090000',
            options: { pickup: true },
            keys: [104, 106],
        });
        const url = new URL(globalThis.window.location.href);
        assert.equal(url.searchParams.get('seed'), '12345');
        assert.equal(url.searchParams.get('datetime'), '20000110090000');
        assert.equal(url.searchParams.get('pickup'), 'true');
    });
});
