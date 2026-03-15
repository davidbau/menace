import { describe, it, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/chargen.js';
import { createInputQueue, clearInputQueue, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { createHeadlessGame, HeadlessDisplay } from '../../js/headless.js';
import { COLNO, ROWNO, STONE } from '../../js/const.js';

function queueLine(input, text) {
    for (const ch of String(text)) {
        input.pushInput(ch.charCodeAt(0));
    }
    input.pushInput(13); // Enter
}

function queueMoves(input, from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const step = (ch, count) => {
        const key = ch.charCodeAt(0);
        for (let i = 0; i < Math.abs(count); i++) {
            input.pushInput(key);
        }
    };
    if (dx !== 0) step(dx > 0 ? 'l' : 'h', dx);
    if (dy !== 0) step(dy > 0 ? 'j' : 'k', dy);
    input.pushInput('.'.charCodeAt(0));
}

describe('wizard mode init and commands', () => {
    beforeEach(() => {
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

    it('NetHackGame init honors wizard option from init options', async () => {
        const input = createInputQueue();
        const game = new NetHackGame({
            display: new HeadlessDisplay(),
            input,
            lifecycle: {},
            hooks: {},
        });

        input.pushInput(32);
        input.pushInput(32);
        await game.init({ seed: 123, wizard: true });

        assert.equal(game.wizard, true);
        assert.equal(game.player.wizard, true);
        assert.equal(game.player.name, 'Wizard');
    });

    it('Ctrl+V level teleport moves through depths 2-5 in wizard mode', async () => {
        const game = await createHeadlessGame(5, 11, { wizard: true });

        for (let depth = 2; depth <= 5; depth++) {
            queueLine(game.input, String(depth));
            const result = await game.executeCommand(22); // Ctrl+V
            assert.equal(result.tookTime, false);
            assert.equal(game.player.dungeonLevel, depth);
            assert.ok(game.levels[depth], `Expected cached level ${depth}`);
        }

        assert.ok(game.levels[1], 'Expected original level to remain cached');
    });

    it('Ctrl+V is unavailable when wizard mode is off', async () => {
        const game = await createHeadlessGame(5, 11, { wizard: false });
        const beforeDepth = game.player.dungeonLevel;

        queueLine(game.input, '5');
        const result = await game.executeCommand(22); // Ctrl+V

        assert.equal(result.tookTime, false);
        assert.equal(game.player.dungeonLevel, beforeDepth);
    });

    it('Ctrl+F reveals the full level in wizard mode', async () => {
        const game = await createHeadlessGame(7, 11, { wizard: true });

        const result = await game.executeCommand(6); // Ctrl+F
        assert.equal(result.tookTime, false);

        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.map.at(x, y);
                assert.equal(loc.seenv, 0xff);
            }
        }
    });

    it('Ctrl+T teleports to requested accessible coordinates in wizard mode', async () => {
        const game = await createHeadlessGame(9, 11, { wizard: true });
        const before = { x: game.player.x, y: game.player.y };
        const target = game.map.dnstair;
        assert.ok(target, 'Expected downstairs coordinates');
        game.player._tipsShown = { ...(game.player._tipsShown || {}), getpos: true };

        queueMoves(game.input, before, target);
        const result = await game.executeCommand(20); // Ctrl+T

        assert.equal(result.tookTime, true);
        assert.equal(game.player.x, target.x);
        assert.equal(game.player.y, target.y);
        assert.ok(before.x !== target.x || before.y !== target.y, 'Expected teleport destination to differ from start');
    });

    it('Ctrl+T rejects inaccessible coordinates in wizard mode', async () => {
        const game = await createHeadlessGame(9, 11, { wizard: true });
        const before = { x: game.player.x, y: game.player.y };
        game.player._tipsShown = { ...(game.player._tipsShown || {}), getpos: true };

        let stone = null;
        for (let y = 0; y < ROWNO && !stone; y++) {
            for (let x = 0; x < COLNO; x++) {
                const loc = game.map.at(x, y);
                if (loc?.typ === STONE) {
                    stone = { x, y };
                    break;
                }
            }
        }
        assert.ok(stone, 'Expected at least one stone tile');

        queueMoves(game.input, before, stone);
        const result = await game.executeCommand(20); // Ctrl+T

        assert.equal(result.tookTime, true);
        assert.ok(game.player.x !== stone.x || game.player.y !== stone.y, 'Expected teleport to avoid stone target');
    });

    it('Ctrl+T is unavailable when wizard mode is off', async () => {
        const game = await createHeadlessGame(9, 11, { wizard: false });
        const before = { x: game.player.x, y: game.player.y };

        queueLine(game.input, '1,1');
        const result = await game.executeCommand(20); // Ctrl+T

        assert.equal(result.tookTime, false);
        assert.equal(game.player.x, before.x);
        assert.equal(game.player.y, before.y);
    });
});
