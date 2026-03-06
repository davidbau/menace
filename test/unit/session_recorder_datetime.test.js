import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
    resolveRecorderFixedDatetime,
    withRecorderFixedDatetime,
} from '../comparison/session_recorder.js';

describe('session recorder datetime helpers', () => {
    test('resolveRecorderFixedDatetime follows session datetime policy', () => {
        const session = {
            meta: {
                options: {
                    datetime: '20000110090000',
                    recordedAt: '2026-03-03T22:30:16.799Z',
                },
            },
        };
        assert.equal(
            resolveRecorderFixedDatetime(session, {
                prevDatetime: '19991231235959',
                sourcePref: 'session',
            }),
            '20000110090000'
        );
        assert.equal(
            resolveRecorderFixedDatetime(session, {
                prevDatetime: '19991231235959',
                sourcePref: 'recorded-at-prefer',
            }),
            '20260303223016'
        );
    });

    test('resolveRecorderFixedDatetime falls back to env/default datetime', () => {
        const session = { meta: { options: {} } };
        assert.equal(
            resolveRecorderFixedDatetime(session, {
                prevDatetime: '19991231235959',
                sourcePref: 'session',
            }),
            '19991231235959'
        );
        assert.equal(
            resolveRecorderFixedDatetime(session, {
                prevDatetime: undefined,
                sourcePref: 'session',
            }),
            '20000110090000'
        );
    });

    test('withRecorderFixedDatetime sets and restores datetime env', async () => {
        const prev = process.env.NETHACK_FIXED_DATETIME;
        process.env.NETHACK_FIXED_DATETIME = '19990101000000';

        const session = {
            meta: {
                options: {
                    datetime: '20000110090000',
                },
            },
        };

        let inside;
        try {
            await withRecorderFixedDatetime(session, async () => {
                inside = process.env.NETHACK_FIXED_DATETIME;
            }, { sourcePref: 'session' });
            assert.equal(inside, '20000110090000');
            assert.equal(process.env.NETHACK_FIXED_DATETIME, '19990101000000');
        } finally {
            if (prev == null) delete process.env.NETHACK_FIXED_DATETIME;
            else process.env.NETHACK_FIXED_DATETIME = prev;
        }
    });

    test('withRecorderFixedDatetime restores env on thrown error', async () => {
        const prev = process.env.NETHACK_FIXED_DATETIME;
        delete process.env.NETHACK_FIXED_DATETIME;

        let thrown = null;
        try {
            await withRecorderFixedDatetime({ meta: { options: {} } }, async () => {
                assert.equal(process.env.NETHACK_FIXED_DATETIME, '20000110090000');
                throw new Error('boom');
            });
        } catch (err) {
            thrown = err;
        } finally {
            if (prev == null) delete process.env.NETHACK_FIXED_DATETIME;
            else process.env.NETHACK_FIXED_DATETIME = prev;
        }

        assert.equal(thrown?.message, 'boom');
        assert.equal(process.env.NETHACK_FIXED_DATETIME, prev);
    });
});
