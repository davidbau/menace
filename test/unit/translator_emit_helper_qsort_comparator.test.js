import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';

test('emit-helper lowers qsort comparator pointer params for cond_cmp', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-qsort-')),
        'cond_cmp.json',
    );

    const r = spawnSync(
        CONDA,
        [
            'run',
            '--live-stream',
            '-n',
            'base',
            'python',
            'tools/c_translator/main.py',
            '--src',
            'nethack-c/upstream/src/botl.c',
            '--func',
            'cond_cmp',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'cond_cmp');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /let indx1 =\s*vptr1, indx2 =\s*vptr2/);
    assert.doesNotMatch(payload.js, /\*\s*vptr1|\*\s*vptr2/);
    assert.doesNotMatch(payload.js, /UNIMPLEMENTED_TRANSLATED_FUNCTION/);
});

test('emit-helper rewrites qsort(cond_cmp/menualpha_cmp) callsites to Array.sort', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-qsort-callsite-'));
    const fixture = 'test/fixtures/translator_qsort_fixture.c';

    const condOut = path.join(outDir, 'cond_sort_callsite.json');
    const condRun = spawnSync(
        CONDA,
        [
            'run',
            '--live-stream',
            '-n',
            'base',
            'python',
            'tools/c_translator/main.py',
            '--src',
            fixture,
            '--func',
            'cond_sort_callsite',
            '--emit',
            'emit-helper',
            '--out',
            condOut,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(condRun.status, 0, condRun.stderr || condRun.stdout);
    const condPayload = JSON.parse(fs.readFileSync(condOut, 'utf8'));
    assert.equal(condPayload.meta.translated, true);
    assert.match(condPayload.js, /cond_idx\.sort\(cond_cmp\)/);
    assert.doesNotMatch(condPayload.js, /\bqsort\s*\(/);

    const alphaOut = path.join(outDir, 'menualpha_sort_callsite.json');
    const alphaRun = spawnSync(
        CONDA,
        [
            'run',
            '--live-stream',
            '-n',
            'base',
            'python',
            'tools/c_translator/main.py',
            '--src',
            fixture,
            '--func',
            'menualpha_sort_callsite',
            '--emit',
            'emit-helper',
            '--out',
            alphaOut,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(alphaRun.status, 0, alphaRun.stderr || alphaRun.stdout);
    const alphaPayload = JSON.parse(fs.readFileSync(alphaOut, 'utf8'));
    assert.equal(alphaPayload.meta.translated, true);
    assert.match(alphaPayload.js, /sequence\.sort\(menualpha_cmp\)/);
    assert.doesNotMatch(alphaPayload.js, /\bqsort\s*\(/);
});
