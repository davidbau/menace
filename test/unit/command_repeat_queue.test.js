import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { run_command, get_repeat_command_snapshot, execute_repeat_command } from '../../js/allmain.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { cmdq_clear, cmdq_copy } from '../../js/input.js';
import { CQ_REPEAT } from '../../js/const.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    return {
        player,
        map,
        display: {
            clearRow() {},
            putstr() {},
            putstr_message() {},
            renderMap() {},
            renderStatus() {},
        },
        fov: { compute() {} },
        flags: { verbose: false },
        pendingPrompt: null,
        multi: 0,
        commandCount: 0,
        cmdKey: 0,
    };
}

describe('CQ_REPEAT wiring', () => {
    beforeEach(() => {
        cmdq_clear(CQ_REPEAT);
    });

    test('run_command stores key snapshot into repeat queue', async () => {
        const game = makeGame();
        await run_command(game, '~'.charCodeAt(0), { countPrefix: 23 });
        const snapshot = get_repeat_command_snapshot();
        assert.deepEqual(snapshot, {
            key: '~'.charCodeAt(0),
            countPrefix: 0,
        });
    });

    test('Ctrl+A execution does not overwrite existing repeat snapshot', async () => {
        const game = makeGame();
        await run_command(game, '~'.charCodeAt(0), { countPrefix: 7 });
        await run_command(game, 1); // Ctrl+A key itself shouldn't replace CQ_REPEAT
        const snapshot = get_repeat_command_snapshot();
        assert.deepEqual(snapshot, {
            key: '~'.charCodeAt(0),
            countPrefix: 0,
        });
    });

    test('execute_repeat_command replays and restores CQ_REPEAT payload', async () => {
        const game = makeGame();
        await run_command(game, '~'.charCodeAt(0), { countPrefix: 5 });
        await execute_repeat_command(game);
        const snapshot = get_repeat_command_snapshot();
        assert.deepEqual(snapshot, {
            key: '~'.charCodeAt(0),
            countPrefix: 0,
        });
    });

    test('prefix command chain is preserved in CQ_REPEAT (F then h)', async () => {
        const game = makeGame();
        await run_command(game, 'F'.charCodeAt(0));
        await run_command(game, 'h'.charCodeAt(0));
        const q = cmdq_copy(CQ_REPEAT);
        assert.ok(q);
        assert.equal(q.key, 'F'.charCodeAt(0));
        assert.ok(q.next);
        assert.equal(q.next.key, 'h'.charCodeAt(0));
    });
});
