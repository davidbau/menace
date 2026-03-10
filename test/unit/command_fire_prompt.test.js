import { describe, test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, createInputQueue, pushInput, setInputRuntime, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import {
    WEAPON_CLASS, FOOD_CLASS, COIN_CLASS, GOLD_PIECE, LANCE, LONG_SWORD,
    ARROW, BOW, FLINT, ROCK, SLING, GEM_CLASS,
} from '../../js/objects.js';

describe('fire prompt', () => {

    beforeEach(() => {
        setInputRuntime(createInputQueue());
        clearInputQueue();
        setThrowOnEmptyInput(true);
    });

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [];
    const display = {
        topMessage: null,
        messages: [],
        putstr_message(msg) {
            this.topMessage = msg;
            this.messages.push(msg);
        },
        clearRow() {},
    };
    return { player, map, display, fov: null, flags: { verbose: false } };
}

test('fire command keeps prompt open until canceled', async () => {
    const game = makeGame();
    game.player.weapon = { otyp: LONG_SWORD, oclass: WEAPON_CLASS, invlet: 'a', name: 'long sword' };
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput(27);

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[0], 'You have no ammunition readied.');
    assert.equal(game.display.messages[1], 'What do you want to fire? [*] ');
    assert.equal(game.display.topMessage, 'Never mind.');
});

test('fire command with wielded polearm and no quiver prints C-style no-target message', async () => {
    const game = makeGame();
    game.player.weapon = { otyp: LANCE, oclass: WEAPON_CLASS, invlet: 'a', name: 'lance' };
    clearInputQueue();

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, "Don't know what to hit.");
});

test('fire prompt includes C-style candidate letters for non-wielded weapon plus wielded non-weapon', async () => {
    const game = makeGame();
    const lance = { otyp: LANCE, oclass: WEAPON_CLASS, invlet: 'b', name: 'lance' };
    const carrots = { otyp: 0, oclass: FOOD_CLASS, invlet: 'h', name: 'carrot', quan: 11 };
    game.player.inventory = [lance, carrots];
    game.player.weapon = carrots;
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput(27);

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[0], 'You have no ammunition readied.');
    assert.equal(game.display.messages[1], 'What do you want to fire? [bh or ?*] ');
    assert.equal(game.display.topMessage, 'Never mind.');
});

test('fire prompt shows count after second digit prefix', async () => {
    const game = makeGame();
    const lance = { otyp: LANCE, oclass: WEAPON_CLASS, invlet: 'b', name: 'lance' };
    game.player.inventory = [lance];
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput('1'.charCodeAt(0));
    pushInput('4'.charCodeAt(0));
    pushInput(27);

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[2], 'Count: 14');
    assert.equal(game.display.topMessage, 'Never mind.');
});

test('fire prompt falls back to coin letter when no launcher candidates exist', async () => {
    const game = makeGame();
    game.player.inventory = [
        { oclass: COIN_CLASS, otyp: GOLD_PIECE, invlet: '$', name: 'gold piece', quan: 10 },
    ];
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput(27);

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[0], 'You have no ammunition readied.');
    assert.equal(game.display.messages[1], 'What do you want to fire? [$ or ?*] ');
    assert.equal(game.display.topMessage, 'Never mind.');
});

test('fire prompt shows C-style invalid-object more() loop', async () => {
    const game = makeGame();
    game.player.inventory = [
        { oclass: COIN_CLASS, otyp: GOLD_PIECE, invlet: '$', name: 'gold piece', quan: 10 },
    ];
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput('f'.charCodeAt(0)); // invalid inventory letter at fire prompt
    pushInput(' '.charCodeAt(0)); // acknowledge more() boundary and re-show prompt
    pushInput(27); // cancel

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.deepEqual(game.display.messages, [
        'You have no ammunition readied.',
        'What do you want to fire? [$ or ?*] ',
        "You don't have that object.",
        'What do you want to fire? [$ or ?*] ',
        'Never mind.',
    ]);
});

test('fire with readied quiver skips item prompt and asks for direction', async () => {
    const game = makeGame();
    const readied = { oclass: WEAPON_CLASS, otyp: LONG_SWORD, invlet: 'a', name: 'dart', quan: 2 };
    game.player.inventory = [readied];
    game.player.quiver = readied;
    clearInputQueue();
    pushInput('j'.charCodeAt(0));

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.equal(game.display.messages[0], 'In what direction? ');
    assert.equal(game.display.messages.includes('What do you want to fire? [a or ?*] '), false);
    assert.equal(readied.quan, 1);
});

test('fireassist swaps to launcher before direction prompt and can consume a turn via run hook', async () => {
    const game = makeGame();
    const arrows = { oclass: WEAPON_CLASS, otyp: ARROW, invlet: 'a', name: 'arrow', quan: 5 };
    const bow = { oclass: WEAPON_CLASS, otyp: BOW, invlet: 'b', name: 'bow', quan: 1 };
    const sword = { oclass: WEAPON_CLASS, otyp: LONG_SWORD, invlet: 'c', name: 'long sword', quan: 1 };
    game.player.inventory = [arrows, bow, sword];
    game.player.quiver = arrows;
    game.player.weapon = sword;
    game.player.swapWeapon = bow;
    let runTurns = 0;
    game.advanceRunTurn = async () => { runTurns++; };
    clearInputQueue();
    pushInput('e'.charCodeAt(0)); // invalid direction -> cancel

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(runTurns, 1);
    assert.equal(game.player.weapon, bow);
    assert.equal(game.player.swapWeapon, sword);
    assert.ok(game.display.messages.includes('In what direction? '));
});

test('fireassist swap preserves timed turn without run hook when direction is canceled', async () => {
    const game = makeGame();
    const arrows = { oclass: WEAPON_CLASS, otyp: ARROW, invlet: 'a', name: 'arrow', quan: 5 };
    const bow = { oclass: WEAPON_CLASS, otyp: BOW, invlet: 'b', name: 'bow', quan: 1 };
    const sword = { oclass: WEAPON_CLASS, otyp: LONG_SWORD, invlet: 'c', name: 'long sword', quan: 1 };
    game.player.inventory = [arrows, bow, sword];
    game.player.quiver = arrows;
    game.player.weapon = sword;
    game.player.swapWeapon = bow;
    clearInputQueue();
    pushInput('e'.charCodeAt(0)); // invalid direction -> cancel

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, true);
    assert.equal(game.player.weapon, bow);
    assert.equal(game.player.swapWeapon, sword);
});

test('fireassist treats flint/rock as sling ammo for launcher swap', async () => {
    const game = makeGame();
    const flints = { oclass: GEM_CLASS, otyp: FLINT, invlet: 'f', name: 'flint stone', quan: 5 };
    const sling = { oclass: WEAPON_CLASS, otyp: SLING, invlet: 's', name: 'sling', quan: 1 };
    const rocks = { oclass: GEM_CLASS, otyp: ROCK, invlet: 'r', name: 'rock', quan: 10 };
    game.player.inventory = [flints, sling, rocks];
    game.player.quiver = flints;
    game.player.weapon = rocks;
    game.player.swapWeapon = sling;
    let runTurns = 0;
    game.advanceRunTurn = async () => { runTurns++; };
    clearInputQueue();
    pushInput('e'.charCodeAt(0)); // invalid direction => cancel prompt

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(runTurns, 1);
    assert.equal(game.player.weapon, sling);
    assert.equal(game.player.swapWeapon, rocks);
    assert.ok(game.display.messages.includes('In what direction? '));
});

test('fire accepts manual inventory letters then asks direction', async () => {
    const game = makeGame();
    const readied = { oclass: FOOD_CLASS, otyp: 0, invlet: 'e', name: 'carrot', quan: 1 };
    game.player.inventory = [
        { oclass: COIN_CLASS, otyp: GOLD_PIECE, invlet: '$', name: 'gold piece', quan: 10 },
        readied,
    ];
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput('e'.charCodeAt(0));
    pushInput(27); // may dismiss a boundary
    pushInput(27); // explicit cancel at direction prompt

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    // C's setuqwep prints the readied item before direction prompt
    assert.equal(game.display.messages[2], 'You ready: e - a strange object.');
    assert.equal(game.display.messages[3], 'In what direction? ');
    assert.equal(game.player.quiver, readied);
});

test("fire invalid inventory letter shows C-style don't-have-object more() loop", async () => {
    const game = makeGame();
    game.player.inventory = [
        { oclass: COIN_CLASS, otyp: GOLD_PIECE, invlet: '$', name: 'gold piece', quan: 10 },
        { oclass: FOOD_CLASS, otyp: 0, invlet: 'b', name: 'food ration', quan: 1 },
    ];
    clearInputQueue();
    pushInput(' '.charCodeAt(0)); // dismiss no-ammo --More--
    pushInput('f'.charCodeAt(0)); // invalid item letter
    pushInput(' '.charCodeAt(0)); // dismiss more() and reprompt
    pushInput(27); // may dismiss a boundary
    pushInput(27); // cancel

    const result = await rhack('f'.charCodeAt(0), game);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.messages[2], "You don't have that object.");
    assert.equal(game.display.messages[3], 'What do you want to fire? [$ or ?*] ');
    assert.equal(game.display.topMessage, 'Never mind.');
});

}); // describe
