import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { STAIRS } from '../../js/config.js';

function makeGameForStairs(flag, depth) {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11); // Valkyrie
    player.dungeonLevel = depth;
    player.maxDungeonLevel = depth;
    player.x = 10;
    player.y = 10;
    const loc = map.at(player.x, player.y);
    loc.typ = STAIRS;
    loc.flags = flag; // 0: down stairs, 1: up stairs

    const calls = [];
    const game = {
        player,
        map,
        display: { putstr_message: () => {} },
        fov: null,
        changeLevel: (newDepth, dir) => calls.push({ newDepth, dir }),
        flags: {},
    };
    return { game, calls };
}

describe('Stair transition direction', () => {
    it('downstairs command passes transitionDir=down', async () => {
        const { game, calls } = makeGameForStairs(0, 1);
        const res = await rhack('>'.charCodeAt(0), game);
        assert.equal(res.tookTime, true);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].newDepth, 2);
        assert.equal(calls[0].dir, 'down');
    });

    it('upstairs command passes transitionDir=up', async () => {
        const { game, calls } = makeGameForStairs(1, 2);
        const res = await rhack('<'.charCodeAt(0), game);
        assert.equal(res.tookTime, true);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].newDepth, 1);
        assert.equal(calls[0].dir, 'up');
    });
});
