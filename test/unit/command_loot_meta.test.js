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
        pushInput('b'.charCodeAt(0)); // containerMenu: 'b' = bring all out

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.ok(messages.at(-1).startsWith('You loot '), `expected loot message, got: ${messages.at(-1)}`);
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
        pushInput('b'.charCodeAt(0)); // containerMenu: 'b' = bring all out

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.ok(messages.at(-1).startsWith('You loot '), `expected loot message, got: ${messages.at(-1)}`);
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
        pushInput('b'.charCodeAt(0)); // containerMenu: 'b' = bring all out

        const result = await rhack('#'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
        assert.ok(messages.at(-1).startsWith('You loot '), `expected loot message, got: ${messages.at(-1)}`);
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

    it('containerMenu q quit does not take items', async () => {
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
        pushInput('q'.charCodeAt(0)); // quit the menu immediately

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
        assert.ok(messages.some((m) => m.includes('Do what with')),
            `expected "Do what with" prompt, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu : look-in shows chest contents without taking them', async () => {
        const { game, messages } = makeGame();
        const item = makeTestItem();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [item],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput(':'.charCodeAt(0)); // look inside
        pushInput('q'.charCodeAt(0)); // quit after looking

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
        assert.ok(messages.some((m) => m.includes('Contents of')),
            `expected "Contents of" message, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu empty chest shows empty prompt wording', async () => {
        const { game, messages } = makeGame();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('q'.charCodeAt(0)); // quit immediately

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some((m) => m.includes('is empty')),
            `expected "is empty" prompt, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu s stash puts item into container and exits menu', async () => {
        const { game, messages } = makeGame();
        const item = makeTestItem();
        item.invlet = 'a';
        game.player.inventory = [item];
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('s'.charCodeAt(0)); // stash
        pushInput('a'.charCodeAt(0)); // stash item 'a'

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
        assert.ok(messages.some((m) => m.includes('You put')),
            `expected "You put" message, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu o take-out selects one item at a time then ESC returns to menu', async () => {
        const { game, messages } = makeGame();
        const item1 = makeTestItem();
        const item2 = makeTestItem();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [item1, item2],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        // 'o' → take-out loop; 'a' → take first item; ESC → back to "Do what?"
        // then 'q' to quit the outer menu
        pushInput('o'.charCodeAt(0));
        pushInput('a'.charCodeAt(0)); // take first item (letter 'a')
        pushInput(27);                // ESC — return to "Do what?" menu
        pushInput('q'.charCodeAt(0)); // quit

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);  // only one item taken
        assert.equal(chest.contents.length, 1);          // one item remains
        assert.ok(messages.some((m) => m.includes('Take out what')),
            `expected "Take out what?" prompt, got: ${JSON.stringify(messages)}`);
        assert.ok(messages.some((m) => m.includes('You take out')),
            `expected "You take out" message, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu o take-out ESC immediately leaves items untouched', async () => {
        const { game, messages } = makeGame();
        const item = makeTestItem();
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [item],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('o'.charCodeAt(0)); // take-out mode
        pushInput(27);                // ESC immediately → back to "Do what?"
        pushInput('q'.charCodeAt(0)); // quit outer menu

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
    });
});
