import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const JS_DIR = path.resolve(process.cwd(), 'js');

// Phase-3/227 policy: exported capitalized bindings are only allowed in
// designated leaf/data modules.
const ALLOWED_CAPS_EXPORT_FILES = new Set([
    'artifacts.js',
    'const.js',
    'engrave_data.js',
    'epitaph_data.js',
    'monsters.js',
    'objects.js',
    'rumor_data.js',
    'symbols.js',
    'storage.js',
    'version.js',
]);

test('capitalized exports are limited to leaf/data modules', () => {
    const offenders = [];
    const files = fs.readdirSync(JS_DIR).filter((name) => name.endsWith('.js')).sort();
    for (const file of files) {
        const full = path.join(JS_DIR, file);
        const src = fs.readFileSync(full, 'utf8');
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!/^export\s+(const|let|var)\s+[A-Z]/.test(line)) continue;
            if (ALLOWED_CAPS_EXPORT_FILES.has(file)) continue;
            offenders.push(`${file}:${i + 1}:${line.trim()}`);
        }
    }
    assert.deepEqual(
        offenders,
        [],
        `Unexpected uppercase exports outside leaf/data modules:\n${offenders.join('\n')}`,
    );
});
