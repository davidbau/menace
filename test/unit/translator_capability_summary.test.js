import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';

test('clang-backed capability-summary reports translated and blocked functions', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for translator capability-summary run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-capability-summary-')),
        'hack_capability.json',
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
            '--emit',
            'capability-summary',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.emit_mode, 'capability-summary');
    assert.equal(typeof payload.function_count, 'number');
    assert.equal(typeof payload.translated_count, 'number');
    assert.equal(typeof payload.blocked_count, 'number');
    assert.equal(payload.function_count, payload.translated_count + payload.blocked_count);
    assert.ok(payload.function_count > 0);

    const fnMap = new Map((payload.functions || []).map((fn) => [fn.name, fn]));
    assert.equal(fnMap.get('rounddiv')?.translated, true);
    assert.equal(fnMap.get('may_passwall')?.translated, true);
});
