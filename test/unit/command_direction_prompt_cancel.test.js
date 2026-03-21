import { beforeEach, describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { setGame } from '../../js/gstate.js';

function makeGame(verbose = true) {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const messages = [];
    const display = {
        topMessage: null,
        putstr_message(msg) {
            messages.push(msg);
            this.topMessage = msg;
        },
    };

    const game = {
        u: player,
        map,
        display,
        fov: null,
        flags: { verbose, cmdassist: false },
        menuRequested: false,
    };
    setGame(game);
    return { game, messages };
}

describe('direction prompt cancel flow', () => {
    beforeEach(() => {
        setThrowOnEmptyInput(true);
        clearInputQueue();
    });

    it('open command cancels on invalid direction without consuming time', async () => {
        const { game, messages } = makeGame();
        pushInput('t'.charCodeAt(0));

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(messages[0], 'In what direction? ');
        assert.ok(messages.some(m => m.includes('What a strange direction!')));
        assert.equal(messages.at(-1), 'Never mind.');
    });

    // C ref: doclose() uses getdir() directly. Invalid direction shows
    // "What a strange direction!" when cmdassist is off and not wizard.
    // doclose does NOT print "Never mind." (unlike doopen).
    it('close command invalid direction shows strange-direction message', async () => {
        const { game, messages } = makeGame();
        pushInput('t'.charCodeAt(0));

        const result = await rhack('c'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(messages[0], 'In what direction? ');
        assert.ok(messages.some(m => m.includes('What a strange direction!')));
    });

    it('open cancel message is still emitted when verbose is false', async () => {
        const { game, messages } = makeGame(false);
        pushInput('t'.charCodeAt(0));

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some(m => m.includes('What a strange direction!')));
        assert.equal(messages.at(-1), 'Never mind.');
    });

    it('open uses C wording when no door exists in chosen direction', async () => {
        const { game, messages } = makeGame();
        pushInput('l'.charCodeAt(0));

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(messages.at(-1), 'You see no door there.');
    });

    it('close uses C wording when no door exists in chosen direction', async () => {
        const { game, messages } = makeGame();
        pushInput('l'.charCodeAt(0));

        const result = await rhack('c'.charCodeAt(0), game);

        assert.equal(result.tookTime, false);
        assert.equal(messages.at(-1), 'You see no door there.');
    });
});
