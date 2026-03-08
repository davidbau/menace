import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { beginCommandExec, endCommandExec } from '../../js/exec_guard.js';
import { awaitInput, awaitMore, awaitAnim } from '../../js/suspend.js';

describe('synclock exec guard (S0)', () => {
    let oldMode;

    beforeEach(() => {
        oldMode = process.env.WEBHACK_STRICT_SINGLE_THREAD;
        delete process.env.WEBHACK_STRICT_SINGLE_THREAD;
    });

    afterEach(() => {
        if (oldMode === undefined) delete process.env.WEBHACK_STRICT_SINGLE_THREAD;
        else process.env.WEBHACK_STRICT_SINGLE_THREAD = oldMode;
    });

    it('tracks begin/end command lifecycle without behavior change by default', () => {
        const events = [];
        const game = {
            emitDiagnosticEvent(type, details) {
                events.push({ type, details });
            },
        };
        const token = beginCommandExec(game, { site: 'unit' });
        assert.equal(Number.isInteger(token), true);
        endCommandExec(game, token, { site: 'unit' });
        assert.equal(events.some((e) => e.type === 'synclock.command.begin'), true);
        assert.equal(events.some((e) => e.type === 'synclock.command.end'), true);
    });

    it('typed suspension wrappers preserve resolved value', async () => {
        const game = { emitDiagnosticEvent() {} };
        const token = beginCommandExec(game, { site: 'unit.suspend' });
        const a = await awaitInput(game, Promise.resolve(11), { site: 'unit.awaitInput' });
        const b = await awaitMore(game, Promise.resolve(22), { site: 'unit.awaitMore' });
        const c = await awaitAnim(game, Promise.resolve(33), { site: 'unit.awaitAnim' });
        endCommandExec(game, token, { site: 'unit.suspend' });
        assert.equal(a, 11);
        assert.equal(b, 22);
        assert.equal(c, 33);
    });

    it('strict mode throws on nested command begin', () => {
        process.env.WEBHACK_STRICT_SINGLE_THREAD = '1';
        const game = { emitDiagnosticEvent() {} };
        const token = beginCommandExec(game, { site: 'outer' });
        assert.throws(
            () => beginCommandExec(game, { site: 'inner' }),
            /SYNCLOCK nested-command/
        );
        endCommandExec(game, token, { site: 'outer' });
    });
});

