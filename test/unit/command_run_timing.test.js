import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { CORR, ROOM } from '../../js/const.js';
import { setGame } from '../../js/gstate.js';

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

    const game = {
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
    setGame(game);
    return game;
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

    const game = {
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
    setGame(game);
    return game;
}

describe('run timing on blocked steps', () => {
    it('force-fight prefix rejects run commands with message', async () => {
        // C ref: cmd.c:3808 — F prefix is invalid before run/rush commands.
        // Uppercase direction keys map to do_run_* which lack CMD_gGF_PREFIX.
        const game = makeGame();

        const result = await rhack('L'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(result.moved, false);
        assert.equal(game.display.topMessage, "The 'F' prefix should be followed by a movement command.");
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

    it('newline rush stops at a corridor corner (does not auto-turn)', async () => {
        const game = makeCornerRunGame();
        let runTurns = 0;
        game.advanceRunTurn = async () => { runTurns++; };

        const result = await rhack(10, game); // ^J / newline

        assert.equal(result.tookTime, false);
        assert.equal(result.moved, true);
        assert.equal(runTurns, 1);
        assert.equal(game.player.x, 10);
        assert.equal(game.player.y, 11);
    });
});
