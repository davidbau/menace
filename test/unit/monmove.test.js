// test/unit/monmove.test.js -- Tests for monster movement AI
// C ref: monmove.c -- verifies monster movement behavior

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { COLNO, ROWNO, ROOM, STONE, HWALL, WATER } from '../../js/config.js';
import { GameMap } from '../../js/map.js';
import { movemon } from '../../js/monmove.js';
import { Player } from '../../js/player.js';
import { GOLD_PIECE, COIN_CLASS, WEAPON_CLASS, ORCISH_DAGGER } from '../../js/objects.js';
import { mons, PM_GOBLIN, PM_LITTLE_DOG, AT_WEAP } from '../../js/monsters.js';

// Mock display
const mockDisplay = { putstr_message() {} };

// Create a simple open room map
function makeSimpleMap() {
    const map = new GameMap();
    // Make a 20x10 room
    for (let x = 10; x < 30; x++) {
        for (let y = 5; y < 15; y++) {
            map.at(x, y).typ = ROOM;
        }
    }
    // Add walls around
    for (let x = 9; x <= 30; x++) {
        map.at(x, 4).typ = HWALL;
        map.at(x, 15).typ = HWALL;
    }
    return map;
}

describe('Monster movement', () => {
    function makeGoblin(mx, my, player) {
        const type = mons[PM_GOBLIN];
        return {
            name: 'goblin',
            mnum: PM_GOBLIN,
            mndx: PM_GOBLIN,
            type,
            mx, my,
            mhp: 7, mhpmax: 7,
            ac: 10, mac: 10,
            mlevel: 1,
            speed: 12, movement: 12,
            attacks: type.attacks || [],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
            isshk: false, ispriest: false,
            mux: player.x, muy: player.y,
            minvent: [],
            mtrack: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
        };
    }

    function makeLittleDog(mx, my, player) {
        const type = mons[PM_LITTLE_DOG];
        return {
            name: 'little dog',
            mnum: PM_LITTLE_DOG,
            mndx: PM_LITTLE_DOG,
            type,
            mx, my,
            mhp: 5, mhpmax: 5,
            ac: 5, mac: 5,
            mlevel: 2,
            speed: 12, movement: 12,
            attacks: type.attacks || [],
            dead: false, sleeping: false,
            confused: false, peaceful: true,
            tame: true, flee: false,
            mcanmove: true, mcansee: true,
            blind: false,
            mfrozen: 0, mfleetim: 0, mtrapped: 0,
            isshk: false, ispriest: false,
            mux: player.x, muy: player.y,
            minvent: [],
            edog: {
                apport: 3,
                hungrytime: 1000,
                whistletime: 0,
                ogoal: { x: 0, y: 0 },
                mhpmax_penalty: 0,
            },
            mtrack: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
        };
    }

    it('hostile monsters move toward player', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        // Place a hostile monster far from player
        const mon = {
            name: 'test monster',
            mx: 15, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [[0, 0, 1, 4]],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        const startDist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);
        movemon(map, player, mockDisplay);
        const endDist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);

        assert.ok(endDist <= startDist,
            `Monster should move toward player: dist ${startDist} -> ${endDist}`);
    });

    it('sleeping monsters do not move', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const mon = {
            name: 'sleeper',
            mx: 12, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [],
            dead: false, sleeping: true,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        const startX = mon.mx, startY = mon.my;
        movemon(map, player, mockDisplay);

        // Sleeping monster far from player should stay put
        assert.equal(mon.mx, startX);
        assert.equal(mon.my, startY);
    });

    it('movemon does not stamp mlstmv for non-combat movement processing', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const mon = {
            name: 'sleepy witness',
            mx: 12, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [],
            dead: false, sleeping: true,
            confused: false, peaceful: false,
            tame: false, flee: false,
            mlstmv: 7,
        };
        map.monsters.push(mon);

        movemon(map, player, mockDisplay);
        assert.equal(mon.mlstmv, 7, 'mlstmv should only be updated by attack paths (mattackm parity)');
    });

    it('dead monsters are removed', () => {
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        map.monsters.push({
            name: 'dead one',
            mx: 12, my: 10,
            mhp: 0, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 0,
            attacks: [],
            dead: true, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        });

        assert.equal(map.monsters.length, 1);
        movemon(map, player, mockDisplay);
        assert.equal(map.monsters.length, 0, 'Dead monsters should be removed');
    });

    it('monsters do not move through walls', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        // Place a wall between monster and player
        for (let y = 5; y < 15; y++) {
            map.at(17, y).typ = HWALL;
        }

        const mon = {
            name: 'blocked',
            mx: 15, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [[0, 0, 1, 4]],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
        };
        map.monsters.push(mon);

        movemon(map, player, mockDisplay);

        // Monster should not have passed through the wall
        assert.ok(mon.mx <= 16 || mon.mx >= 18,
            `Monster at ${mon.mx} should not be on wall at x=17`);
    });

    it('AT_WEAP monsters wield before melee attacking when currently unarmed', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const goblin = makeGoblin(19, 10, player);
        const dagger = {
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            dknown: true,
        };
        goblin.minvent = [dagger];
        goblin.weapon = null;
        map.monsters.push(goblin);

        assert.ok((goblin.attacks || []).some((atk) => atk?.type === AT_WEAP));
        const hpBefore = player.hp;
        const messages = [];
        const display = {
            putstr_message(msg) {
                messages.push(msg);
            },
        };

        movemon(map, player, display);

        assert.equal(goblin.weapon, dagger);
        assert.equal(player.hp, hpBefore);
        assert.ok(messages.some((msg) => /wields/.test(msg)));
    });

    it('AT_WEAP throws consume inventory and leave a floor projectile', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20;
        player.y = 10;
        player.initRole(0);

        const goblin = makeGoblin(12, 10, player);
        const dagger = {
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            dknown: true,
        };
        goblin.minvent = [dagger];
        goblin.weapon = dagger;
        map.monsters.push(goblin);

        const messages = [];
        const hpBefore = player.hp;
        movemon(map, player, {
            putstr_message(msg) {
                messages.push(msg);
            },
        });

        assert.equal(goblin.minvent.length, 0, 'thrown dagger should be consumed from monster inventory');
        assert.ok(
            map.objects.some((obj) => obj.otyp === ORCISH_DAGGER && obj.quan === 1),
            'thrown dagger should land on the floor'
        );
        assert.ok(messages.some((msg) => /throws/.test(msg)), 'throw message should be emitted');
        assert.ok(player.hp <= hpBefore, 'projectile should not heal the player');
    });

    it('collectors do not retarget to gold unless they like gold', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 24; player.y = 10;
        player.initRole(0);

        const goblin = makeGoblin(15, 10, player);
        map.monsters.push(goblin);
        map.objects.push({
            otyp: GOLD_PIECE,
            oclass: COIN_CLASS,
            quan: 7,
            owt: 1,
            ox: 16,
            oy: 11,
            buried: false,
        });

        movemon(map, player, mockDisplay);
        assert.equal(goblin.mx, 16);
        assert.equal(goblin.my, 10);
    });

    it('collectors still retarget to practical items', () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 24; player.y = 10;
        player.initRole(0);

        const goblin = makeGoblin(15, 10, player);
        map.monsters.push(goblin);
        map.objects.push({
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            owt: 10,
            ox: 16,
            oy: 11,
            buried: false,
        });

        movemon(map, player, mockDisplay);
        assert.equal(goblin.mx, 16);
        assert.equal(goblin.my, 11);
    });

    it('pets cannot pick up items while standing in WATER tiles', () => {
        initRng(1);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 15;
        player.y = 10;
        player.initRole(0);

        const dog = makeLittleDog(12, 10, player);
        map.monsters.push(dog);
        map.objects.push({
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            owt: 10,
            ox: 12,
            oy: 10,
            buried: false,
        });

        // Control check: same seed/position on ROOM allows pickup.
        movemon(map, player, mockDisplay);
        assert.equal(dog.minvent.length, 1, 'dog should pick up on ROOM for this deterministic seed');
        assert.equal(map.objects.length, 0);

        initRng(1);
        const waterMap = makeSimpleMap();
        const waterPlayer = new Player();
        waterPlayer.x = 15;
        waterPlayer.y = 10;
        waterPlayer.initRole(0);
        waterMap.at(12, 10).typ = WATER;
        const waterDog = makeLittleDog(12, 10, waterPlayer);
        waterMap.monsters.push(waterDog);
        waterMap.objects.push({
            otyp: ORCISH_DAGGER,
            oclass: WEAPON_CLASS,
            quan: 1,
            owt: 10,
            ox: 12,
            oy: 10,
            buried: false,
        });

        movemon(waterMap, waterPlayer, mockDisplay);
        assert.equal(waterDog.minvent.length, 0, 'dog should not pick up while in WATER');
        assert.equal(waterMap.objects.length, 1, 'floor item should remain in WATER square');
    });
});
