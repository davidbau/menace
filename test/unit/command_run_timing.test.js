import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { CORR, ROOM } from '../../js/config.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    // Open floor around the hero so movement logic reaches force-fight.
    map.at(10, 10).typ = ROOM;
    map.at(11, 10).typ = ROOM;

    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
        renderMap() {},
        renderStatus() {},
    };

    return {
        player,
        map,
        display,
        fov: {
            compute() {},
            canSee() { return true; },
        },
        flags: { verbose: false },
        runMode: 0,
        menuRequested: false,
        forceFight: true,
        multi: 0,
        commandCount: 0,
        cmdKey: 0,
    };
}

function makeCornerRunGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    map.at(10, 10).typ = CORR;
    map.at(10, 11).typ = CORR;
    map.at(9, 11).typ = CORR;

    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
        renderMap() {},
        renderStatus() {},
    };

    return {
        player,
        map,
        display,
        fov: {
            compute() {},
            canSee() { return true; },
        },
        flags: { verbose: false },
        runMode: 0,
        menuRequested: false,
        forceFight: false,
        multi: 0,
        commandCount: 0,
        cmdKey: 0,
    };
}

describe('run timing on blocked steps', () => {
    it('run hook advances one timed turn when force-fight blocks movement', async () => {
        const game = makeGame();
        let runTurns = 0;
        game.advanceRunTurn = async () => { runTurns++; };

        const result = await rhack('L'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(result.moved, false);
        assert.equal(runTurns, 1);
        assert.equal(game.display.topMessage, 'You attack thin air.');
    });

    it('non-hook run reports the blocked timed turn in runSteps', async () => {
        const game = makeGame();
        delete game.advanceRunTurn;

        const result = await rhack('L'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(result.moved, false);
        assert.equal(result.runSteps, 1);
    });

    it('newline command uses run-style south movement timing', async () => {
        const game = makeGame();
        let runTurns = 0;
        game.advanceRunTurn = async () => { runTurns++; };

        const result = await rhack(10, game); // ^J / newline

        assert.equal(result.tookTime, false);
        assert.equal(result.moved, false);
        assert.equal(runTurns, 1);
    });

    it('run auto-turns through a single corridor corner', async () => {
        const game = makeCornerRunGame();
        let runTurns = 0;
        game.advanceRunTurn = async () => { runTurns++; };

        const result = await rhack(10, game); // ^J / newline

        assert.equal(result.tookTime, false);
        assert.equal(result.moved, true);
        assert.equal(runTurns, 2);
        assert.equal(game.player.x, 9);
        assert.equal(game.player.y, 11);
    });
});
