import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    beginCommandExec,
    endCommandExec,
    beginOriginAwait,
    endOriginAwait,
} from '../../js/gstate.js';

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

    it('origin await begin/end registers without changing behavior', () => {
        const game = { emitDiagnosticEvent() {} };
        const token = beginCommandExec(game, { site: 'unit.suspend' });
        const a = beginOriginAwait(game, 'input');
        endOriginAwait(game, a);
        const b = beginOriginAwait(game, 'more');
        endOriginAwait(game, b);
        const c = beginOriginAwait(game, 'anim');
        endOriginAwait(game, c);
        endCommandExec(game, token, { site: 'unit.suspend' });
        assert.equal(Number.isInteger(a?.token), true);
        assert.equal(Number.isInteger(b?.token), true);
        assert.equal(Number.isInteger(c?.token), true);
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
