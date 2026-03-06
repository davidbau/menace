import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const GEN_CONSTANTS = path.resolve(process.cwd(), 'scripts/generators/gen_constants.py');

function loadDeferredReport() {
    const raw = execFileSync('python3', [GEN_CONSTANTS, '--report-deferred-json'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
    });
    return JSON.parse(raw);
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
