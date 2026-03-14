import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    compareRng,
    compareScreenLines,
    compareGrids,
    findFirstGridDiff,
    getComparableEventStreams,
    isIgnorableEventEntry,
    formatRngDivergence,
    formatScreenDiff,
    formatGridDiff,
    createDiagnosticReport,
} from '../comparison/comparators.js';

describe('comparators.compareRng', () => {
    it('matches equal normalized RNG traces', () => {
        const result = compareRng(
            ['1 rn2(10)=5 @ source.js:1', '>foo', 'rne(2)=1', '1 rnd(6)=3'],
            ['rn2(10)=5', 'rnd(6)=3']
        );
        assert.equal(result.matched, 2);
        assert.equal(result.total, 2);
        assert.equal(result.firstDivergence, null);
    });

    it('captures first divergence with raw entries', () => {
        const jsEntries = ['rn2(10)=1 @ foo.c:1', 'rn2(10)=2 @ foo.c:2', 'rn2(10)=3 @ foo.c:3'];
        const sessionEntries = ['rn2(10)=1 @ bar.c:1', 'rn2(10)=9 @ bar.c:2', 'rn2(10)=3 @ bar.c:3'];
        const result = compareRng(jsEntries, sessionEntries);
        assert.equal(result.firstDivergence.index, 1);
        assert.equal(result.firstDivergence.js, 'rn2(10)=2');
        assert.equal(result.firstDivergence.session, 'rn2(10)=9');
        // Raw entries include source locations
        assert.equal(result.firstDivergence.jsRaw, 'rn2(10)=2 @ foo.c:2');
        assert.equal(result.firstDivergence.sessionRaw, 'rn2(10)=9 @ bar.c:2');
    });
});

describe('comparators.compareScreenLines', () => {
    it('matches lines after right-trim', () => {
        const result = compareScreenLines(['abc   '], ['abc']);
        assert.equal(result.match, true);
        assert.equal(result.firstDiff, null);
    });

    it('reports first mismatch', () => {
        const result = compareScreenLines(['a', 'b'], ['a', 'c']);
        assert.equal(result.match, false);
        assert.equal(result.firstDiff.row, 1);
    });
});

describe('comparators.compareGrids', () => {
    it('finds grid diffs and first diff helper', () => {
        const a = [[1, 2], [3, 4]];
        const b = [[1, 9], [3, 5]];
        const diffs = compareGrids(a, b);
        assert.equal(diffs.length, 2);
        assert.deepEqual(findFirstGridDiff(a, b), { x: 1, y: 0, js: 2, session: 9 });
    });
});

describe('comparators diagnostic formatting', () => {
    it('formats RNG divergence', () => {
        const formatted = formatRngDivergence({
            index: 5,
            js: 'rn2(10)=7',
            session: 'rn2(10)=3',
            contextBefore: { js: ['rn2(10)=1'], session: ['rn2(10)=1'] },
            contextAfter: { js: ['rn2(10)=8'], session: ['rn2(10)=8'] },
        }, { showContext: true });
        assert.match(formatted, /index 5/);
        assert.match(formatted, /rn2\(10\)=7/);
        assert.match(formatted, /Context before/);
    });

    it('formats screen and grid diffs', () => {
        const screen = formatScreenDiff({
            matched: 22,
            total: 24,
            match: false,
            diffs: [{ row: 5, js: 'Hello', session: 'World' }],
        });
        const grid = formatGridDiff([{ x: 2, y: 3, js: 10, session: 11 }]);
        assert.match(screen, /22\/24/);
        assert.match(screen, /Row 5/);
        assert.match(grid, /\(2,3\)/);
    });

    it('creates structured diagnostic report', () => {
        const report = createDiagnosticReport({
            session: 'sample.session.json',
            type: 'gameplay',
            seed: 123,
            passed: false,
            firstDivergence: { index: 9, js: 'rn2(4)=3', session: 'rn2(4)=0' },
            metrics: {
                grids: { matched: 1, total: 2 },
                screens: { matched: 3, total: 4 },
            },
            error: new Error('boom'),
        });
        assert.equal(report.session, 'sample.session.json');
        assert.equal(report.passed, false);
        assert.ok(report.channels.rng);
        assert.ok(report.channels.grid);
        assert.ok(report.channels.screen);
        assert.equal(report.channels.error.message, 'boom');
    });
});

describe('comparators event filtering', () => {
    it('treats repaint trace entries as non-event diagnostic data', () => {
        assert.equal(isIgnorableEventEntry('^repaint[flush hp=1]'), true);
        const streams = getComparableEventStreams(
            ['^event[a]', '^repaint[flush hp=1]', '^event[b]'],
            ['^event[a]', '^event[b]']
        );
        assert.deepEqual(streams.js, ['^event[a]', '^event[b]']);
        assert.deepEqual(streams.session, ['^event[a]', '^event[b]']);
    });
});
