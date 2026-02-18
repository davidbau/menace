import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
    };

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
        runMode: 0,
        menuRequested: false,
        forceFight: false,
        multi: 0,
    };
}

describe('run/rush prefix validation', () => {
    it('reports invalid command after g-prefix', async () => {
        const game = makeGame();
        const setPrefix = await rhack('g'.charCodeAt(0), game);
        assert.equal(setPrefix.tookTime, false);
        assert.equal(game.runMode, 2);

        const invalid = await rhack('a'.charCodeAt(0), game);
        assert.equal(invalid.tookTime, false);
        assert.equal(game.runMode, 0);
        assert.equal(game.display.topMessage, "The 'g' prefix should be followed by a movement command.");
    });

    it('falls through to normal unknown-command handling for space after g-prefix', async () => {
        const game = makeGame();
        const setPrefix = await rhack('g'.charCodeAt(0), game);
        assert.equal(setPrefix.tookTime, false);
        assert.equal(game.runMode, 2);

        const afterSpace = await rhack(' '.charCodeAt(0), game);
        assert.equal(afterSpace.tookTime, false);
        assert.equal(game.runMode, 0);
        assert.equal(game.display.topMessage, "Unknown command ' '.");
    });

    it('shows double-rush cancellation message even when verbose is off', async () => {
        const game = makeGame();
        const first = await rhack('g'.charCodeAt(0), game);
        assert.equal(first.tookTime, false);
        assert.equal(game.runMode, 2);

        const second = await rhack('g'.charCodeAt(0), game);
        assert.equal(second.tookTime, false);
        assert.equal(game.runMode, 0);
        assert.equal(game.display.topMessage, 'Double rush prefix, canceled.');
    });
});
