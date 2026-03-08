import { beforeEach, describe, it, afterEach} from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/cmd.js';
import { GameMap } from '../../js/game.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput, setThrowOnEmptyInput, getInputQueueLength } from '../../js/input.js';
import { ROOM } from '../../js/const.js';
import { ARMOR_CLASS, COIN_CLASS, FLINT, GEM_CLASS, ORCISH_DAGGER, POTION_CLASS, WEAPON_CLASS } from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    for (let y = 9; y <= 11; y++) {
        for (let x = 9; x <= 11; x++) {
            map.at(x, y).typ = ROOM;
        }
    }
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [
        { invlet: 'b', oclass: WEAPON_CLASS, otyp: ORCISH_DAGGER, name: 'dagger' },
        { invlet: 'd', oclass: POTION_CLASS, name: 'potion of healing' },
    ];

    const display = {
        topMessage: null,
        messages: [],
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

describe('throw prompt behavior', () => {
    beforeEach(() => {
        setThrowOnEmptyInput(true);
        clearInputQueue();
    });

    it('shows inventory letters in throw prompt using C-style format', async () => {
        const game = makeGame();
        pushInput(27);

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [b or ?*] ');
        assert.equal(game.display.topMessage, 'Never mind.');
    });

    it('still allows selecting a non-weapon inventory letter manually', async () => {
        const game = makeGame();
        pushInput('d'.charCodeAt(0));
        pushInput(27);

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[1], 'In what direction? ');
        assert.equal(game.display.messages.length, 2);
        assert.equal(game.display.topMessage, null);
    });

    it('treats "-" selection as mime-throw cancel', async () => {
        const game = makeGame();
        pushInput('-'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, 'You mime throwing something.');
    });

    it('does not suggest currently wielded weapon as default throw choice', async () => {
        const game = makeGame();
        game.player.weapon = game.player.inventory[0];
        pushInput(27);
        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [*] ');
    });

    it('falls back to coin letter when only wielded weapon plus coins remain', async () => {
        const game = makeGame();
        game.player.inventory = [
            { invlet: 'a', oclass: WEAPON_CLASS, name: 'scalpel' },
            { invlet: '$', oclass: COIN_CLASS, name: 'gold piece', quan: 50 },
            { invlet: 'e', oclass: POTION_CLASS, name: 'potion of extra healing', quan: 4 },
        ];
        game.player.weapon = game.player.inventory[0];
        game.player.quiver = game.player.inventory[2];
        pushInput(27);
        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [$ or ?*] ');
    });

    it('single throw clears direction prompt without synthetic throw topline', async () => {
        const game = makeGame();
        pushInput('b'.charCodeAt(0));
        pushInput('l'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.messages[0], 'What do you want to throw? [b or ?*] ');
        assert.equal(game.display.messages[1], 'In what direction? ');
        assert.equal(game.display.messages.length, 2);
        assert.equal(game.display.topMessage, null);
    });

    it('throw at adjacent monster emits miss message and lands at target square', async () => {
        const game = makeGame();
        game.map.monsters.push({ mx: 11, my: 10, mhp: 5, name: 'kitten' });
        pushInput('b'.charCodeAt(0));
        pushInput('l'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.messages.at(-1), 'The orcish dagger misses the kitten.');
        const thrown = game.map.objects.find((o) => o.name === 'dagger');
        assert.ok(thrown);
        assert.equal(thrown.ox, 11);
        assert.equal(thrown.oy, 10);
    });

    it('asks direction before rejecting worn item throw', async () => {
        const game = makeGame();
        const worn = { invlet: 'e', oclass: ARMOR_CLASS, name: 'leather armor' };
        game.player.inventory.push(worn);
        game.player.armor = worn;
        pushInput('e'.charCodeAt(0));
        pushInput('l'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [b or ?*] ');
        assert.equal(game.display.messages[1], 'In what direction? ');
        assert.equal(game.display.messages.at(-1), 'You cannot throw something you are wearing.');
    });

    it('space cancels throw direction prompt without extra cancel message', async () => {
        const game = makeGame();
        pushInput('d'.charCodeAt(0));
        pushInput(' '.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.messages[0], 'What do you want to throw? [b or ?*] ');
        assert.equal(game.display.messages[1], 'In what direction? ');
        assert.equal(game.display.messages.length, 2);
        assert.equal(game.display.topMessage, null);
    });

    it('enter uses keypad-down direction in throw prompt', async () => {
        const game = makeGame();
        pushInput('b'.charCodeAt(0));
        pushInput('\n'.charCodeAt(0));

        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        const thrown = game.map.objects.find((o) => o.name === 'dagger');
        assert.ok(thrown);
        assert.equal(thrown.ox, 10);
        assert.equal(thrown.oy, 11);
    });

    it('keeps throw prompt stable on invalid letters', async () => {
        const game = makeGame();
        pushInput('i'.charCodeAt(0));
        pushInput('o'.charCodeAt(0));
        pushInput('n'.charCodeAt(0));
        pushInput(27);
        const result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.deepEqual(game.display.messages, [
            'What do you want to throw? [b or ?*] ',
            "You don't have that object.--More--",
            "You don't have that object.--More--",
            "You don't have that object.--More--",
            'Never mind.',
        ]);
    });

    it('stacks repeated throws onto existing floor object', async () => {
        const game = makeGame();
        game.player.inventory = [
            { invlet: 'f', oclass: GEM_CLASS, otyp: FLINT, name: 'flint stone', quan: 2 },
        ];

        pushInput('f'.charCodeAt(0));
        pushInput('l'.charCodeAt(0));
        let result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);

        pushInput('f'.charCodeAt(0));
        pushInput('l'.charCodeAt(0));
        result = await rhack('t'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);

        const landed = game.map.objects.filter((o) => o.ox === 11 && o.oy === 10 && o.otyp === FLINT);
        assert.equal(landed.length, 1);
        assert.equal(landed[0].quan, 2);
    });
});
