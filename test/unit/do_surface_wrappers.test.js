import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    doddrop,
    dodown,
    doup,
    goto_level,
    menu_drop,
    u_collide_m,
} from '../../js/do.js';

describe('do.c compatibility wrappers', () => {
    it('exports wrapper functions', () => {
        assert.equal(typeof doddrop, 'function');
        assert.equal(typeof dodown, 'function');
        assert.equal(typeof doup, 'function');
        assert.equal(typeof goto_level, 'function');
        assert.equal(typeof menu_drop, 'function');
        assert.equal(typeof u_collide_m, 'function');
    });

    it('dodown and doup preserve non-stair behavior', async () => {
        const messages = [];
        const display = {
            _moreBlockingEnabled: false,
            async putstr_message(msg) { messages.push(msg); },
        };
        const map = { at: () => ({ typ: 0, flags: 0 }) };
        const game = {
            changeLevel: async () => {
                throw new Error('changeLevel should not run on invalid stair square');
            },
        };
        const player = { x: 10, y: 10, dungeonLevel: 3, maxDungeonLevel: 3 };

        const down = await dodown(player, map, display, game);
        assert.deepEqual(down, { moved: false, tookTime: false });
        assert.equal(messages.at(-1), "You can't go down here.");

        const up = await doup(player, map, display, game);
        assert.deepEqual(up, { moved: false, tookTime: false });
        assert.equal(messages.at(-1), "You can't go up here.");
    });

    it('menu wrappers return drop-cancel shape for empty inventory', async () => {
        const display = {
            async putstr_message() {},
        };
        const player = { inventory: [] };
        const map = {};
        const r1 = await doddrop(player, map, display);
        const r2 = await menu_drop(player, map, display);
        assert.deepEqual(r1, { moved: false, tookTime: false });
        assert.deepEqual(r2, { moved: false, tookTime: false });
    });

    it('u_collide_m wrapper is safe when no monster collision exists', () => {
        const player = { x: 5, y: 5 };
        const map = {
            monsterAt() { return null; },
        };
        assert.doesNotThrow(() => u_collide_m({ player, map }));
    });
});
