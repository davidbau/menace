import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { setGame } from '../../js/gstate.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { ALTAR } from '../../js/const.js';

describe('extended command case', () => {

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const display = {
        topMessage: null,
        messages: [],
        clearRow() {},
        putstr() {},
        putstr_message(msg) {
            this.topMessage = msg;
            this.messages.push(msg);
        },
    };

    const game = {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
    setGame(game);
    return game;
}

test('extended command unknown feedback preserves typed casing', async () => {
    clearInputQueue();
    const game = makeGame();

    for (const ch of 'Oyce') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);

    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, '#Oyce: unknown extended command.');
});

test('#l autocompletes to loot (C prefix-completion parity)', async () => {
    // C ref: get_ext_cmd() accepts a unique prefix — '#l\n' resolves to 'loot'.
    clearInputQueue();
    const game = makeGame();
    pushInput('l'.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);

    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, "You don't find anything here to loot.");
});

test('#untrap on current square with no trap uses C no-trap wording', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'untrap') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput('.'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);

    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages.at(-1), 'You know of no traps there.');
});

test('#name object-type path rejects non-callable inventory item with C wording', async () => {
    clearInputQueue();
    const game = makeGame();
    game.player.inventory = [
        { invlet: 'a', oclass: 1, otyp: 27, name: 'spear', dknown: true, bknown: true, known: true },
        { invlet: 'b', oclass: 1, otyp: 34, name: 'dagger', dknown: true, bknown: true, known: true },
        { invlet: 'c', oclass: 2, otyp: 150, name: 'small shield', dknown: true, bknown: true, known: true },
        { invlet: 'd', oclass: 6, otyp: 291, name: 'food ration', dknown: true, bknown: true, known: false },
        { invlet: 'e', oclass: 7, otyp: 299, name: 'paralysis', dknown: true, bknown: false, known: false },
        { invlet: 'g', oclass: 8, otyp: 334, name: 'identify', dknown: true, bknown: false, known: false },
    ];

    for (const ch of 'name') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput('o'.charCodeAt(0));
    pushInput('h'.charCodeAt(0));
    pushInput('h'.charCodeAt(0));
    pushInput('a'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);

    assert.equal(result.tookTime, false);
    assert.ok(game.display.messages.includes('                                What do you want to name?'));
    assert.ok(game.display.messages.includes('What do you want to call? [eg or ?*] '));
    assert.equal(game.display.topMessage, 'That is a silly thing to call.');
});

test('#repeat returns repeat request sentinel', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'repeat') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.repeatRequest, true);
    assert.equal(result.tookTime, false);
});

test('#wipe prints face-clean message and returns tookTime true', async () => {
    clearInputQueue();
    const game = makeGame();
    game.player.ucreamed = 0;
    for (const ch of 'wipe') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.ok(game.display.messages.some(m => m.includes('already clean') || m.includes('face')),
        `expected face message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#pray shows prayer message', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'pray') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    await rhack('#'.charCodeAt(0), game);
    // dopray should say something — either prayer start or "can't pray" message
    assert.ok(game.display.messages.length > 0,
        'expected at least one message from #pray');
    assert.ok(game.display.messages.some(m =>
        m.toLowerCase().includes('pray') || m.toLowerCase().includes('surrounded')
        || m.toLowerCase().includes('shimmering') || m.toLowerCase().includes('align')),
        `expected prayer message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#turn shows turn-undead message', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'turn') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    await rhack('#'.charCodeAt(0), game);
    // Non-priest/knight role should get "don't know how to turn undead"
    assert.ok(game.display.messages.length > 0,
        'expected at least one message from #turn');
    assert.ok(game.display.messages.some(m =>
        m.toLowerCase().includes('turn') || m.toLowerCase().includes('undead')
        || m.toLowerCase().includes('spell')),
        `expected turn-undead message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#dip shows unavailable message', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'dip') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.ok(game.display.messages.length > 0,
        'expected at least one message from #dip');
    assert.ok(game.display.messages.some(m => m.length > 0),
        `expected non-empty message from #dip, got: ${JSON.stringify(game.display.messages)}`);
});

test('#enhance shows skill list for initialized role (Wizard has 22 skills)', async () => {
    clearInputQueue();
    const game = makeGame(); // makeGame calls player.initRole(11) = Valkyrie
    // re-init as Wizard (role index 12) for spell skills
    game.player.initRole(12);
    for (const ch of 'enhance') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput(27); // ESC from skill selection (no slots to advance at level 1)

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    // With role skills initialized, should show "Current skills:" (no advance slots yet)
    assert.ok(game.display.messages.some((m) => m.includes('Current skills') || m.includes('Pick a skill')),
        `expected skills heading, got: ${JSON.stringify(game.display.messages)}`);
    // Should list at least one skill (Wizard has 22)
    assert.ok(game.display.messages.some((m) => m.includes('dagger') || m.includes('spell') || m.includes('quarterstaff')),
        `expected a skill name in messages, got: ${JSON.stringify(game.display.messages)}`);
});

test('#chat with ESC direction shows nothing or cancels', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'chat') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput(27); // ESC = cancel direction prompt

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    // cancelled at direction prompt — no error
});

test('#chat with no monster at target cell says no one to talk to', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'chat') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput('j'.charCodeAt(0)); // south — no monster there

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.messages.some((m) => m.includes('nobody') || m.includes('no one')),
        `expected no-one-to-talk message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#offer off altar prints C wording', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'offer') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    // cf. pray.c dosacrifice(): "You are not on an altar." (or "over" when levitating)
    assert.ok(game.display.messages.some((m) => m.includes('altar')),
        `expected altar message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#offer on altar does not say not-on-altar', async () => {
    clearInputQueue();
    const game = makeGame();
    // Place an altar at player position
    const loc = game.map.at(game.player.x, game.player.y);
    loc.typ = ALTAR;
    for (const ch of 'offer') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    await rhack('#'.charCodeAt(0), game);
    assert.ok(!game.display.messages.some((m) => m.includes('not on') || m.includes('not over')),
        `expected no "not on altar" message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#monster when not polymorphed prints C wording', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'monster') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    // cf. cmd.c domonability(): "You don't have a special ability in your normal form!"
    assert.ok(game.display.topMessage.includes('normal form'),
        `expected normal-form message, got: ${game.display.topMessage}`);
});

test('#adjust with empty inventory shows message', async () => {
    clearInputQueue();
    const game = makeGame();
    game.player.inventory = [];
    for (const ch of 'adjust') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.topMessage.includes('nothing to adjust'));
});

test('#adjust swaps inventory letters', async () => {
    clearInputQueue();
    const game = makeGame();
    game.player.inventory = [
        { invlet: 'a', oclass: 1, otyp: 27, quan: 1, name: 'spear' },
        { invlet: 'b', oclass: 1, otyp: 34, quan: 1, name: 'dagger' },
    ];
    for (const ch of 'adjust') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput('a'.charCodeAt(0)); // select item 'a'
    pushInput('c'.charCodeAt(0)); // assign to 'c'

    await rhack('#'.charCodeAt(0), game);
    assert.equal(game.player.inventory[0].invlet, 'c');
    assert.equal(game.player.inventory[1].invlet, 'b');
});

}); // describe
