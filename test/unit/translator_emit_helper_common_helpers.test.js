import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';
const SRC = 'test/fixtures/translator_helper_fixture.c';

function emitHelper(funcName) {
    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-common-')),
        `${funcName}.json`,
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
            SRC,
            '--func',
            funcName,
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    return JSON.parse(fs.readFileSync(outFile, 'utf8'));
}

test('emit-helper lowers Sprintf/Snprintf and string helpers', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const fmtAssign = emitHelper('fmt_assign');
    assert.equal(fmtAssign.meta.translated, true);
    // Now emits template literal: buf = `18/${String(st - 18).padStart(2, "0")}`
    assert.match(fmtAssign.js, /buf = `18\/\$\{String\(st - 18\)\.padStart\(2, "0"\)\}`/);
    assert.doesNotMatch(fmtAssign.js, /\bSprintf\s*\(/);

    const fmtAppend = emitHelper('fmt_append');
    assert.equal(fmtAppend.meta.translated, true);
    // Now emits: buf += `-${x}`
    assert.match(fmtAppend.js, /buf \+= `-\$\{x\}`/);
    assert.doesNotMatch(fmtAppend.js, /\beos\s*\(/);

    const fmtBound = emitHelper('fmt_bound');
    assert.equal(fmtBound.meta.translated, true);
    // Now emits: buf = x (single %d optimized to plain assignment)
    assert.match(fmtBound.js, /buf = x/);
    assert.doesNotMatch(fmtBound.js, /\bSnprintf\s*\(/);

    const strOps = emitHelper('str_ops');
    assert.equal(strOps.meta.translated, true);
    // Strcpy now emits: buf = src (no ?? '')
    assert.match(strOps.js, /buf = src;/);
    assert.match(strOps.js, /buf = \(buf \?\? ''\) \+ \("!" \?\? ''\);/);
    assert.match(strOps.js, /buf = \(src \?\? ''\)\.slice\(0, Math\.max\(0, Number\(3\)\)\);/);

    const convOps = emitHelper('conv_ops');
    assert.equal(convOps.meta.translated, true);
    assert.match(convOps.js, /\(s \?\? ''\)\.length/);
    assert.match(convOps.js, /Number\.parseInt\(s, 10\)/);
    assert.match(convOps.js, /Math\.abs\(x\)/);
    assert.match(convOps.js, /toLowerCase\(\)\.localeCompare/);
});
