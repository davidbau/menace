import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { enableRngLog, disableRngLog, getRngLog, initRng } from '../../js/rng.js';
import { bogusmon } from '../../js/do_name.js';

describe('bogusmon C-faithful display RNG range', () => {
    it('uses get_rnd_text-style display RNG span (7320 bytes)', () => {
        const prevDisp = process.env.RNG_LOG_DISP;
        try {
            process.env.RNG_LOG_DISP = '1';
            initRng(1200);
            enableRngLog(true);
            const out = bogusmon();
            const log = getRngLog() || [];
            assert.ok(log.length >= 1, 'expected display RNG log entries');
            assert.match(String(log[0]), /^~drn2\(7320\)=\d+/, `unexpected first log entry: ${log[0]}`);
            assert.ok(typeof out?.name === 'string' && out.name.length > 0, 'expected non-empty bogus monster name');
        } finally {
            if (prevDisp === undefined) delete process.env.RNG_LOG_DISP;
            else process.env.RNG_LOG_DISP = prevDisp;
            disableRngLog();
        }
    });
});
