import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue } from '../../js/input.js';
import { BATTLE_AXE, DAGGER, WEAPON_CLASS } from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;
    player.inventory = [];
    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
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

describe('swap weapon command', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('consumes a turn and reports missing secondary weapon', async () => {
        const game = makeGame();
        const result = await rhack('x'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.topMessage, 'You have no secondary weapon readied.');
    });

    it('swaps primary and secondary weapon when available', async () => {
        const game = makeGame();
        const dagger = {
            invlet: 'a',
            oclass: WEAPON_CLASS,
            otyp: DAGGER,
            quan: 1,
            known: true,
            dknown: true,
            bknown: true,
            blessed: false,
            cursed: false,
            spe: 0,
            name: 'dagger',
        };
        const axe = {
            invlet: 'b',
            oclass: WEAPON_CLASS,
            otyp: BATTLE_AXE,
            quan: 1,
            known: true,
            dknown: true,
            bknown: true,
            blessed: false,
            cursed: false,
            spe: 0,
            name: 'battle-axe',
        };
        game.player.inventory = [dagger, axe];
        game.player.weapon = dagger;
        game.player.swapWeapon = axe;

        const result = await rhack('x'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.player.weapon, axe);
        assert.equal(game.player.swapWeapon, dagger);
        assert.match(game.display.topMessage, /^a - /);
    });
});
