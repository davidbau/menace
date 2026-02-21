import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { CHEST, objectData } from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const messages = [];
    const display = {
        topMessage: null,
        messageNeedsMore: false,
        clearRow() {},
        putstr() {},
        putstr_message(msg) {
            messages.push(msg);
            this.topMessage = msg;
        },
    };

    return {
        game: {
            player,
            map,
            display,
            fov: null,
            flags: { verbose: false },
            menuRequested: false,
            forceFight: false,
            runMode: 0,
            commandCount: 0,
            multi: 0,
        },
        messages,
    };
}

function makeTestItem() {
    const otyp = 18;
    return {
        otyp,
        oclass: objectData[otyp].oc_class,
        quan: 1,
        name: objectData[otyp].name,
    };
}

describe('loot via meta key', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('M-l loots container contents on current square', async () => {
        const { game, messages } = makeGame();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [makeTestItem()],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.equal(messages.at(-1), 'You loot 1 item.');
    });

    it('open self-direction routes to loot handling', async () => {
        const { game, messages } = makeGame();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [makeTestItem()],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('.'.charCodeAt(0));

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.equal(messages.at(-1), 'You loot 1 item.');
    });

    it('#loot loots container contents on current square', async () => {
        const { game, messages } = makeGame();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [makeTestItem()],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('l'.charCodeAt(0));
        pushInput('o'.charCodeAt(0));
        pushInput('o'.charCodeAt(0));
        pushInput('t'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));

        const result = await rhack('#'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.equal(messages.at(-1), 'You loot 1 item.');
    });

    it('loot reports locked containers without consuming time', async () => {
        const { game, messages } = makeGame();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [makeTestItem()],
            olocked: true,
            obroken: false,
        };
        game.map.objects.push(chest);

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
        assert.equal(messages.at(-1), 'Hmmm, it seems to be locked.');
    });
});
