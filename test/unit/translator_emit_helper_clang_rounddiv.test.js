import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';

test('clang-backed emit-helper translates rounddiv body', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-clang-')),
        'rounddiv.json',
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
            'nethack-c/upstream/src/hack.c',
            '--func',
            'rounddiv',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'rounddiv');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /let r, m, divsgn = 1;/);
    assert.match(payload.js, /throw new Error\('division by zero in rounddiv'\)/);
    assert.match(payload.js, /Math\.trunc\(x \/ y\)/);
    assert.doesNotMatch(payload.js, /UNIMPLEMENTED_TRANSLATED_FUNCTION/);
});

test('clang-backed emit-helper translates invocation_pos body', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-clang-')),
        'invocation_pos.json',
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
            'nethack-c/upstream/src/hack.c',
            '--func',
            'invocation_pos',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'invocation_pos');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /Invocation_lev\(map\.uz\)/);
    assert.match(payload.js, /x === map\.inv_pos\.x/);
    assert.match(payload.js, /y === map\.inv_pos\.y/);
    assert.doesNotMatch(payload.js, /&u\./);
    assert.doesNotMatch(payload.js, /svi\./);
    assert.doesNotMatch(payload.js, /\bmap\._/);
    assert.doesNotMatch(payload.js, /UNIMPLEMENTED_TRANSLATED_FUNCTION/);
    assert.equal(
        (payload.diag || []).some((d) => d.code === 'LEGACY_JS_TARGETS'),
        false,
    );
});

test('clang-backed emit-helper translates may_passwall with canonical rewrites', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-clang-')),
        'may_passwall.json',
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
            'nethack-c/upstream/src/hack.c',
            '--func',
            'may_passwall',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'may_passwall');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /map\.locations\[x\]\[y\]\.typ/);
    assert.match(payload.js, /W_NONPASSWALL/);
    assert.equal(
        (payload.diag || []).some((d) => d.code === 'UNRESOLVED_C_TOKENS'),
        false,
    );
});

test('clang-backed emit-helper translates async runmode_delay_output with rewrites', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-clang-')),
        'runmode_delay_output.json',
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
            'nethack-c/upstream/src/hack.c',
            '--func',
            'runmode_delay_output',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'runmode_delay_output');
    assert.equal(payload.meta.translated, true);
    assert.equal(payload.meta.requires_async, true);
    assert.match(payload.js, /export async function runmode_delay_output\((display, game|game, display)\)/);
    assert.match(payload.js, /await nh_delay_output\(\);/);
    assert.doesNotMatch(payload.js, /\bsvc\./);
    assert.doesNotMatch(payload.js, /\bflags\./);
    assert.doesNotMatch(payload.js, /\bsvm\./);
    assert.equal(
        (payload.diag || []).some((d) => d.code === 'UNRESOLVED_C_TOKENS'),
        false,
    );
});
