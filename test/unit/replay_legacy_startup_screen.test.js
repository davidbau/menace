import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getSessionStartup } from '../../js/replay_core.js';

describe('replay legacy startup parsing', () => {
    it('reads startup data from top-level v1 startup field', () => {
        const session = {
            version: 1,
            startup: {
                rng: ['rn2(10)=3 @ test'],
                rngCalls: 1,
                typGrid: [[1, 2], [3, 4]],
                screen: ['line 1'],
                screenAnsi: ['line 1'],
            },
            steps: [
                { key: ' ', action: 'key- ', rng: [], screen: ['Unknown command'] },
            ],
        };

        const startup = getSessionStartup(session);
        assert.ok(startup);
        assert.deepEqual(startup.rng, ['rn2(10)=3 @ test']);
        assert.equal(startup.rngCalls, 1);
        assert.deepEqual(startup.typGrid, [[1, 2], [3, 4]]);
        assert.deepEqual(startup.screen, ['line 1']);
        assert.deepEqual(startup.screenAnsi, ['line 1']);
    });
});
