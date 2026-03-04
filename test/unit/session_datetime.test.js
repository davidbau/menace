import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { recordedAtToDatetime, resolveSessionFixedDatetime } from '../comparison/session_datetime.js';

describe('session datetime helpers', () => {
    test('recordedAtToDatetime converts ISO timestamps to UTC yyyymmddhhmmss', () => {
        assert.equal(
            recordedAtToDatetime('2026-03-03T21:53:14.530344+00:00'),
            '20260303215314'
        );
        assert.equal(
            recordedAtToDatetime('2026-03-03T22:30:16.799-05:00'),
            '20260304033016'
        );
    });

    test('recordedAtToDatetime returns null for invalid values', () => {
        assert.equal(recordedAtToDatetime('not-a-date'), null);
        assert.equal(recordedAtToDatetime(''), null);
        assert.equal(recordedAtToDatetime(null), null);
    });

    test('resolveSessionFixedDatetime honors source preference', () => {
        const session = {
            meta: {
                options: {
                    datetime: '20000110090000',
                    recordedAt: '2026-03-03T22:30:16.799Z',
                },
            },
        };
        assert.equal(resolveSessionFixedDatetime(session, 'session'), '20000110090000');
        assert.equal(resolveSessionFixedDatetime(session, 'recorded-at-prefer'), '20260303223016');
        assert.equal(resolveSessionFixedDatetime(session, 'recorded-at-only'), '20260303223016');
    });

    test('resolveSessionFixedDatetime falls back between session and recordedAt', () => {
        const onlyRecordedAt = {
            meta: {
                options: {
                    recordedAt: '2026-03-03T22:30:16.799Z',
                },
            },
        };
        assert.equal(resolveSessionFixedDatetime(onlyRecordedAt, 'session'), '20260303223016');

        const onlyDatetime = {
            meta: {
                options: {
                    datetime: '20000110090000',
                },
            },
        };
        assert.equal(resolveSessionFixedDatetime(onlyDatetime, 'recorded-at-prefer'), '20000110090000');
        assert.equal(resolveSessionFixedDatetime(onlyDatetime, 'recorded-at-only'), null);
    });
});

