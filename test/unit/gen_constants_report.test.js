import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const GEN_CONSTANTS = path.resolve(process.cwd(), 'scripts/generators/gen_constants.py');
const CONST_JS_URL = pathToFileURL(path.resolve(process.cwd(), 'js/const.js')).href;

function loadDeferredReport() {
    const raw = execFileSync('python3', [GEN_CONSTANTS, '--report-deferred-json'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(raw);
}

async function loadConstRootBlockers() {
    const mod = await import(CONST_JS_URL);
    return mod.DEFERRED_HEADER_CONST_ROOT_BLOCKERS;
}

test('gen_constants deferred report JSON shape is stable', () => {
    const report = loadDeferredReport();
    assert.equal(typeof report, 'object');
    assert.equal(typeof report.deferredCount, 'number');
    assert.ok(Array.isArray(report.details));
    assert.ok(Array.isArray(report.rootBlockers));
    assert.ok(Array.isArray(report.ownerSummary));
    assert.ok(Array.isArray(report.unknownOwnerBlockers));
    assert.equal(typeof report.immediateMissingCounts, 'object');
    assert.equal(typeof report.rootMissingCounts, 'object');
    assert.equal(report.details.length, report.deferredCount);

    for (const entry of report.details) {
        assert.equal(typeof entry.name, 'string');
        assert.equal(typeof entry.source, 'string');
        assert.equal(typeof entry.expr, 'string');
        assert.ok(Array.isArray(entry.missingDeps));
        assert.ok(Array.isArray(entry.rootMissingDeps));
    }

    for (const blocker of report.rootBlockers) {
        assert.equal(typeof blocker.name, 'string');
        assert.equal(typeof blocker.count, 'number');
        assert.equal(typeof blocker.ownerHint, 'string');
    }
    for (const ownerEntry of report.ownerSummary) {
        assert.equal(typeof ownerEntry.ownerHint, 'string');
        assert.equal(typeof ownerEntry.count, 'number');
    }
    for (const name of report.unknownOwnerBlockers) {
        assert.equal(typeof name, 'string');
    }
});

test('deferred constants inventory does not regress beyond current envelope', () => {
    const report = loadDeferredReport();
    // Guardrail for phase-3 constants hygiene: keep deferred inventory bounded.
    assert.ok(
        report.deferredCount <= 48,
        `deferredCount regressed: ${report.deferredCount} > 48`,
    );

    const knownRootBlockers = new Set(report.rootBlockers.map((b) => b.name));
    for (const required of ['NUMMONS', 'NUM_OBJECTS', 'GLYPH_SWALLOW_OFF']) {
        assert.ok(knownRootBlockers.has(required), `missing expected root blocker ${required}`);
    }

    assert.deepEqual(
        report.unknownOwnerBlockers,
        [],
        `unknown owner hints for root blockers: ${report.unknownOwnerBlockers.join(', ')}`,
    );
});

test('generator root-blocker report matches generated const.js export', async () => {
    const report = loadDeferredReport();
    const constRootBlockers = await loadConstRootBlockers();
    assert.ok(Array.isArray(constRootBlockers));

    const norm = (arr) => arr
        .map((x) => ({ name: x.name, count: x.count, ownerHint: x.ownerHint }))
        .sort((a, b) => a.name.localeCompare(b.name));

    assert.deepEqual(
        norm(report.rootBlockers),
        norm(constRootBlockers),
        'generator report rootBlockers must match const.js DEFERRED_HEADER_CONST_ROOT_BLOCKERS',
    );
});

test('deferred report accounting invariants hold', () => {
    const report = loadDeferredReport();

    const sum = (arr) => arr.reduce((acc, x) => acc + Number(x), 0);
    const rootBlockerTotal = sum(report.rootBlockers.map((b) => b.count));
    const rootMissingTotal = sum(Object.values(report.rootMissingCounts));
    assert.equal(rootBlockerTotal, rootMissingTotal);

    const ownerSummaryTotal = sum(report.ownerSummary.map((o) => o.count));
    assert.equal(ownerSummaryTotal, rootBlockerTotal);

    const unknownByOwner = report.rootBlockers
        .filter((b) => b.ownerHint === 'unknown')
        .map((b) => b.name)
        .sort();
    const unknownDeclared = [...report.unknownOwnerBlockers].sort();
    assert.deepEqual(unknownDeclared, unknownByOwner);
});
