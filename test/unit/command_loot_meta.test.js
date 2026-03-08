import { beforeEach, describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { CHEST, FOOD_CLASS, objectData } from '../../js/objects.js';
import { setGame } from '../../js/gstate.js';

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

    const game = {
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
    };
    setGame(game);
    return { game, messages };
}

function makeTestItem(otyp = 18) {
    return {
        otyp,
        oclass: objectData[otyp].oc_class,
        quan: 1,
        name: objectData[otyp].name,
    };
}

describe('loot via meta key', () => {
    beforeEach(() => {
        setThrowOnEmptyInput(true);
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
        // 'o' = take out interactively: select item 'a', then Enter to confirm
        pushInput('o'.charCodeAt(0));
        pushInput('a'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
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
        // 'o' = take out interactively: select item 'a', then Enter to confirm
        pushInput('o'.charCodeAt(0));
        pushInput('a'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));

        const result = await rhack('o'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
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
        // 'o' = take out interactively: select item 'a', then Enter to confirm
        pushInput('o'.charCodeAt(0));
        pushInput('a'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));

        const result = await rhack('#'.charCodeAt(0), game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(chest.contents.length, 0);
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
        assert.ok(messages.at(-1).includes('turns out to be locked'), `Expected locked message, got: ${messages.at(-1)}`);
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

    it('containerMenu unknown empty chest still uses generic prompt wording', async () => {
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
        assert.ok(messages.some((m) => m.includes('Do what with the chest?')),
            `expected generic unknown-emptiness prompt, got: ${JSON.stringify(messages)}`);
    });

    it('loot direction prompt cancels on escape after invalid direction key', async () => {
        const { game, messages } = makeGame();
        // No containers on player square, but adjacent monster triggers direction prompt path.
        game.map.monsters.push({ mx: game.player.x + 1, my: game.player.y, mpeaceful: 0, data: {} });
        pushInput('o'.charCodeAt(0));   // invalid direction key
        pushInput(27);                  // ESC to cancel

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.includes('Loot in what direction? '));
        assert.ok(messages.includes('Never mind.'));
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
        // 'o' → take-out loop; 'a' selects item; Enter commits selection;
        // ESC returns to "Do what?"; then 'q' quits outer menu.
        pushInput('o'.charCodeAt(0));
        pushInput('a'.charCodeAt(0)); // select first item (letter 'a')
        pushInput('\n'.charCodeAt(0)); // commit selected item
        pushInput(27);                // ESC — return to "Do what?" menu
        pushInput('q'.charCodeAt(0)); // quit

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);  // only one item taken
        assert.equal(chest.contents.length, 1);          // one item remains
        assert.ok(messages.some((m) => m.includes('Take out what')),
            `expected "Take out what?" prompt, got: ${JSON.stringify(messages)}`);
        // out_container uses C-style invlet announcement ("a - <item>.")
        assert.ok(messages.some((m) => /^[a-z] - /.test(m) || m.includes('You take out')),
            `expected take-out message, got: ${JSON.stringify(messages)}`);
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

    it('containerMenu o take-out supports @ select-all then Enter commit', async () => {
        const { game } = makeGame();
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
        pushInput('o'.charCodeAt(0)); // take-out mode
        pushInput('@'.charCodeAt(0)); // select all visible
        pushInput('\n'.charCodeAt(0)); // commit selection

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        const movedQty = game.player.inventory.reduce((sum, it) => sum + (it.quan || 1), 0);
        assert.equal(movedQty, 2);
        assert.equal(chest.contents.length, 0);
    });

    it('containerMenu o take-out Enter with no selection exits take-out', async () => {
        const { game } = makeGame();
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
        pushInput('\n'.charCodeAt(0)); // no selection => leave take-out

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
    });

    it('containerMenu o take-out prompts for object type when classes differ', async () => {
        const { game, messages } = makeGame();
        const weapon = makeTestItem(18); // class ')'
        const armor = makeTestItem(95); // class '['
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [weapon, armor],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('o'.charCodeAt(0)); // take-out mode
        // C ref: query_category select_menu(PICK_ANY) — toggle class, then confirm
        pushInput(')'.charCodeAt(0)); // toggle weapon class (accelerator key)
        pushInput('\n'.charCodeAt(0)); // confirm class filter selection
        pushInput('a'.charCodeAt(0)); // select first visible item
        pushInput('\n'.charCodeAt(0)); // commit selected item
        pushInput(27);                // ESC back to container menu
        pushInput('q'.charCodeAt(0)); // quit

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 1);
        assert.equal(game.player.inventory[0].otyp, 18);
        assert.equal(chest.contents.length, 1);
        assert.ok(messages.some((m) => m.includes('Take out what type of objects?')),
            `expected type-filter prompt, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu i put-in with a=all moves all inventory into chest', async () => {
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
        pushInput('i'.charCodeAt(0)); // put-in mode
        // Only one class → no class-query prompt; getlin prompt for classes skipped
        // But with multiple classes we'd get a getlin — here only one class so auto-selected
        // Actually with only one class, still uses getlin. Let's use 'a' to select all.
        // Push 'a\n' for the getlin class-selection prompt (all classes).
        pushInput('a'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));
        pushInput('q'.charCodeAt(0)); // quit outer menu (should not be reached)

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.equal(game.player.inventory.length, 0);
        assert.equal(chest.contents.length, 1);
        assert.ok(messages.some((m) => m.includes('You put')),
            `expected "You put" message, got: ${JSON.stringify(messages)}`);
    });

    it('containerMenu i put-in ESC on class prompt cancels without moving items', async () => {
        // With two different classes in inventory, the class-selection getlin appears.
        // ESC on that getlin (getlin returns null) should cancel put-in.
        const { game, messages } = makeGame();
        const weapon = makeTestItem();  // otyp 18 = arrow, class 1 (WEAPON)
        weapon.invlet = 'a';
        const food = { otyp: 291, oclass: FOOD_CLASS, quan: 1, name: 'food ration', invlet: 'b' };
        game.player.inventory = [weapon, food];
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('i'.charCodeAt(0)); // put-in mode → shows class-selection getlin
        pushInput(27);                // ESC → getlin returns null → cancel
        pushInput('q'.charCodeAt(0)); // quit outer menu

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.equal(game.player.inventory.length, 2);
        assert.equal(chest.contents.length, 0);
    });

    it('containerMenu i put-in with empty inventory shows message', async () => {
        const { game, messages } = makeGame();
        game.player.inventory = [];
        const chest = {
            otyp: CHEST,
            ox: game.player.x,
            oy: game.player.y,
            contents: [],
            olocked: false,
            obroken: false,
        };
        game.map.objects.push(chest);
        pushInput('i'.charCodeAt(0)); // put-in mode (should say "nothing to put in")
        pushInput('q'.charCodeAt(0)); // quit outer menu

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some((m) => m.includes("don't have anything")),
            `expected "don't have anything" message, got: ${JSON.stringify(messages)}`);
    });

    it('loot prompts for direction when monster is adjacent and no containers exist', async () => {
        const { game, messages } = makeGame();
        game.map.monsters.push({ mx: game.player.x + 1, my: game.player.y, m_id: 1 });
        pushInput('.'.charCodeAt(0)); // underfoot target

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some((m) => m.includes('Loot in what direction?')),
            `expected direction prompt, got: ${JSON.stringify(messages)}`);
        assert.ok(messages.some((m) => m.includes("don't find anything here to loot")),
            `expected no-loot message, got: ${JSON.stringify(messages)}`);
    });

    it('loot directional target away from self says there to loot', async () => {
        const { game, messages } = makeGame();
        game.map.monsters.push({ mx: game.player.x + 1, my: game.player.y, m_id: 1 });
        pushInput('l'.charCodeAt(0)); // east target

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some((m) => m.includes("don't find anything there to loot")),
            `expected directional no-loot message, got: ${JSON.stringify(messages)}`);
    });

    it('loot direction up reports ceiling wording and consumes a turn', async () => {
        const { game, messages } = makeGame();
        game.map.monsters.push({ mx: game.player.x + 1, my: game.player.y, m_id: 1 });
        pushInput('<'.charCodeAt(0));

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, true);
        assert.ok(messages.some((m) => m.includes('to loot on the ceiling')),
            `expected ceiling message, got: ${JSON.stringify(messages)}`);
    });

    it('loot invalid direction key cancels with never mind', async () => {
        const { game, messages } = makeGame();
        game.map.monsters.push({ mx: game.player.x + 1, my: game.player.y, m_id: 1 });
        pushInput('x'.charCodeAt(0));   // invalid direction key → cmdassist
        pushInput('\n'.charCodeAt(0));  // cancel direction prompt

        const result = await rhack('l'.charCodeAt(0) | 0x80, game);

        assert.equal(result.tookTime, false);
        assert.ok(messages.some((m) => m.includes('Never mind.')),
            `expected cancellation message, got: ${JSON.stringify(messages)}`);
    });
});
