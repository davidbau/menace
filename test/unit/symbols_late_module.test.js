import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const GEN_CONSTANTS = path.resolve(process.cwd(), 'scripts/generators/gen_constants.py');
const SYMBOLS_JS_URL = pathToFileURL(path.resolve(process.cwd(), 'js/symbols.js')).href;

function loadDeferredNames() {
    const raw = execFileSync('python3', [GEN_CONSTANTS, '--report-deferred-json'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
    });
    const report = JSON.parse(raw);
    return report.details.map((d) => d.name);
}

test('symbols.js late module loads and exports all deferred constants', async () => {
    const deferred = loadDeferredNames();
    const symbols = await import(SYMBOLS_JS_URL);
    for (const name of deferred) {
        assert.ok(name in symbols, `symbols.js missing deferred export: ${name}`);
        assert.notEqual(symbols[name], undefined, `symbols.js export undefined: ${name}`);
    }
});

test('symbols.js key glyph ordering invariants hold', async () => {
    const s = await import(SYMBOLS_JS_URL);
    assert.equal(s.GLYPH_MON_MALE_OFF, 0);
    assert.ok(s.GLYPH_OBJ_OFF > s.GLYPH_MON_MALE_OFF);
    assert.ok(s.GLYPH_CMAP_OFF > s.GLYPH_OBJ_OFF);
    assert.ok(s.GLYPH_SWALLOW_OFF > s.GLYPH_CMAP_C_OFF);
    assert.ok(s.MAX_GLYPH > s.GLYPH_NOTHING_OFF);
});
