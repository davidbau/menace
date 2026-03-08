import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('synclock strict audit passes with no raw awaits or direct morePrompt callbacks', () => {
    const run = spawnSync(process.execPath, ['scripts/synclock_audit.mjs', '--strict'], {
        encoding: 'utf8',
    });
    assert.equal(run.status, 0, `strict audit failed:\n${run.stdout || ''}\n${run.stderr || ''}`);
    assert.match(run.stdout || '', /raw_await_nhgetch:\s+0/);
    assert.match(run.stdout || '', /display_moreprompt_nhgetch:\s+0/);
    assert.match(run.stdout || '', /SYNCLOCK strict audit status: PASS/);
});
