import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { setOutputContext } from '../../js/pline.js';

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

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
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
    assert.ok(game.display.messages.includes('What do you want to call? [eg or ?*]'));
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
    setOutputContext(game.display);
    for (const ch of 'wipe') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.ok(game.display.messages.some(m => m.includes('already clean') || m.includes('face')),
        `expected face message, got: ${JSON.stringify(game.display.messages)}`);
});

test('#pray returns without crashing', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'pray') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    // dopray may or may not consume time depending on cooldown; just check no crash
    assert.ok(typeof result.tookTime === 'boolean');
});

test('#turn returns without crashing', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'turn') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.ok(typeof result.tookTime === 'boolean');
});

test('#dip returns without crashing when no items', async () => {
    clearInputQueue();
    const game = makeGame();
    game.player.inventory = [];
    for (const ch of 'dip') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));
    pushInput(27); // escape any prompts

    const result = await rhack('#'.charCodeAt(0), game);
    assert.ok(typeof result.tookTime === 'boolean');
});

test('#enhance reports not yet implemented', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'enhance') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.topMessage.includes('not yet implemented'));
});

test('#chat reports not yet implemented', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'chat') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.topMessage.includes('not yet implemented'));
});

test('#offer reports not yet implemented', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'offer') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.topMessage.includes('not yet implemented'));
});

test('#monster reports not yet implemented', async () => {
    clearInputQueue();
    const game = makeGame();
    for (const ch of 'monster') pushInput(ch.charCodeAt(0));
    pushInput('\n'.charCodeAt(0));

    const result = await rhack('#'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.ok(game.display.topMessage.includes('not yet implemented'));
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
