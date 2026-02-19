import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import {
    DOOR, CORR, ROOM, D_ISOPEN,
    SHOPBASE, ROOMOFFSET, A_CHA,
} from '../../js/config.js';
import { SPBOOK_CLASS, SPE_TELEPORT_AWAY } from '../../js/objects.js';
import { initDiscoveryState } from '../../js/discovery.js';
import { Player } from '../../js/player.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11); // Valkyrie: "Velkommen"
    player.name = 'wizard';
    player.attributes[A_CHA] = 8; // 4/3 charisma price multiplier
    player.x = 10;
    player.y = 10;

    map.rooms[0] = {
        lx: 12, ly: 10, hx: 13, hy: 11,
        rtype: SHOPBASE + 9, // rare books
    };

    const start = map.at(10, 10);
    start.typ = CORR;
    start.roomno = 0;
    start.edge = false;

    const door = map.at(11, 10);
    door.typ = DOOR;
    door.flags = D_ISOPEN;
    door.roomno = 0;
    door.edge = false;

    const shopTile = map.at(12, 10);
    shopTile.typ = ROOM;
    shopTile.roomno = ROOMOFFSET;
    shopTile.edge = false;

    const keeperTile = map.at(12, 11);
    keeperTile.typ = ROOM;
    keeperTile.roomno = ROOMOFFSET;
    keeperTile.edge = false;

    map.monsters.push({
        mx: 12, my: 11, mhp: 20,
        isshk: true, peaceful: true, dead: false,
        shoproom: ROOMOFFSET,
        shknam: 'Dunfanaghy',
        shk: { x: 12, y: 11 },
        visitct: 0,
    });

    map.objects.push({
        otyp: SPE_TELEPORT_AWAY,
        oclass: SPBOOK_CLASS,
        ox: 12, oy: 10,
        quan: 1,
        spe: 0,
        o_id: 69,
        known: false,
        dknown: true,
        bknown: false,
    });

    const display = {
        topMessage: '',
        messageNeedsMore: false,
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
        flags: {
            verbose: false,
            pickup: false,
        },
        runMode: 0,
        menuRequested: false,
        forceFight: false,
        multi: 0,
    };
}

describe('shop entry and pricing messages', () => {
    beforeEach(() => {
        initDiscoveryState();
    });

    it('shows shop greeting on doorway entry and for-sale pricing in shop', async () => {
        const game = makeGame();

        const step1 = await rhack('l'.charCodeAt(0), game);
        assert.equal(step1.moved, true);
        assert.equal(
            game.display.topMessage,
            "\"Velkommen, wizard!  Welcome to Dunfanaghy's rare books!\""
        );

        const step2 = await rhack('l'.charCodeAt(0), game);
        assert.equal(step2.moved, true);
        assert.match(
            game.display.topMessage,
            /^You see here a .* spellbook \(for sale, 800 zorkmids\)\.$/
        );
    });

    it('shows welcome again after leaving and re-entering the shop', async () => {
        const game = makeGame();

        await rhack('l'.charCodeAt(0), game); // enter doorway: first welcome
        await rhack('l'.charCodeAt(0), game); // enter room
        await rhack('h'.charCodeAt(0), game); // back to doorway
        await rhack('h'.charCodeAt(0), game); // back to corridor

        const reenter = await rhack('l'.charCodeAt(0), game);
        assert.equal(reenter.moved, true);
        assert.equal(
            game.display.topMessage,
            "\"Velkommen, wizard!  Welcome again to Dunfanaghy's rare books!\""
        );
    });
});
