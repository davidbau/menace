// test/unit/monmove.test.js -- Tests for monster movement AI
// C ref: monmove.c -- verifies monster movement behavior

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng, enableRngLog, disableRngLog, getRngLog } from '../../js/rng.js';
import { COLNO, ROWNO, ROOM, STONE, HWALL, WATER, W_WEP, MTSZ } from '../../js/const.js';
import { GameMap } from '../../js/game.js';
import { movemon, mon_track_add, mon_track_clear, monhaskey, m_can_break_boulder } from '../../js/monmove.js';
import { Player } from '../../js/player.js';
import { setGame } from '../../js/gstate.js';
import { GOLD_PIECE, COIN_CLASS, WEAPON_CLASS, ARMOR_CLASS, ORCISH_DAGGER, ORCISH_HELM,
         SKELETON_KEY, LOCK_PICK, CREDIT_CARD, PICK_AXE, DWARVISH_MATTOCK } from '../../js/objects.js';
import { mons, PM_GOBLIN, PM_LITTLE_DOG, PM_DEATH, PM_PELIAS, AT_WEAP, G_NOCORPSE,
         MS_LEADER, M1_AMPHIBIOUS } from '../../js/monsters.js';

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
            mcanmove: true, mcansee: true,
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

    it('hostile monsters move toward player', async () => {
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
        await movemon(map, player, mockDisplay);
        const endDist = Math.abs(mon.mx - player.x) + Math.abs(mon.my - player.y);

        assert.ok(endDist <= startDist,
            `Monster should move toward player: dist ${startDist} -> ${endDist}`);
    });

    it('sleeping monsters do not move', async () => {
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
            dead: false, msleeping: true,
            confused: false, peaceful: false,
            tame: false, mflee: false,
        };
        map.monsters.push(mon);

        const startX = mon.mx, startY = mon.my;
        await movemon(map, player, mockDisplay);

        // Sleeping monster far from player should stay put
        assert.equal(mon.mx, startX);
        assert.equal(mon.my, startY);
    });

    it('immobile monsters skip dochug movement logic', async () => {
        initRng(42);
        enableRngLog();
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const mon = {
            name: 'frozen',
            mndx: PM_GOBLIN,
            type: mons[PM_GOBLIN],
            mx: 12, my: 10,
            mhp: 10, mhpmax: 10,
            ac: 8, level: 1,
            speed: 12, movement: 12,
            attacks: [],
            dead: false, sleeping: false,
            confused: false, peaceful: false,
            tame: false, flee: false,
            mcanmove: false,
        };
        map.monsters.push(mon);

        await movemon(map, player, mockDisplay);
        const log = (getRngLog() || []).map((entry) => String(entry));
        disableRngLog();
        assert.equal(mon.mx, 12);
        assert.equal(mon.my, 10);
        assert.ok(
            !log.some((line) => line.includes('^distfleeck[27@12,10')),
            'immobile monster should not enter distfleeck phase in dochug'
        );
    });

    it('dog_move treats linked-list minvent as inventory-present', async () => {
        initRng(42);
        enableRngLog();
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const dog = makeLittleDog(18, 10, player);
        dog.m_id = 1;
        const invObj = { otyp: GOLD_PIECE, oclass: COIN_CLASS, quan: 1, owt: 1, owornmask: 0, nobj: null };
        dog.minvent = invObj; // C-style linked list node, not an array
        map.monsters.push(dog);

        await movemon(map, player, mockDisplay);
        const log = (getRngLog() || []).map((entry) => String(entry));
        disableRngLog();

        assert.ok(
            log.some((line) => line.includes('^dog_goal_start[') && line.includes('minvent=1')),
            'dog_goal_start should report minvent=1 when inventory is a linked list'
        );
    });

    it('pet drop logic honors W_WEP inventory marker when mon.weapon is null', async () => {
        initRng(42);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 20; player.y = 10;
        player.initRole(0);

        const pet = makeGoblin(19, 10, player);
        pet.peaceful = true;
        pet.tame = true;
        pet.edog = {
            apport: 10,
            hungrytime: 1000,
            whistletime: 0,
            ogoal: { x: 0, y: 0 },
            mhpmax_penalty: 0,
        };

        const wieldedPick = {
            otyp: PICK_AXE,
            oclass: WEAPON_CLASS,
            quan: 1,
            owt: 100,
            owornmask: W_WEP,
            nobj: null,
        };
        const spareMattock = {
            otyp: DWARVISH_MATTOCK,
            oclass: WEAPON_CLASS,
            quan: 1,
            owt: 120,
            owornmask: 0,
            nobj: null,
        };
        pet.weapon = wieldedPick; // weapon pointer set, matching C MON_WEP semantics
        pet.minvent = [wieldedPick, spareMattock];
        map.monsters.push(pet);

        await movemon(map, player, mockDisplay);

        assert.ok(
            pet.minvent.some((obj) => obj.otyp === PICK_AXE),
            'wielded pick-axe should remain in inventory'
        );
        assert.ok(
            map.objects.some((obj) => obj.otyp === DWARVISH_MATTOCK && obj.ox === 19 && obj.oy === 10),
            'spare mattock should be dropped at pet location'
        );
    });

    it('movemon does not stamp mlstmv for non-combat movement processing', async () => {
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

        await movemon(map, player, mockDisplay);
        assert.equal(mon.mlstmv, 7, 'mlstmv should only be updated by attack paths (mattackm parity)');
    });

    it('dead monsters are removed', async () => {
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
        await movemon(map, player, mockDisplay);
        assert.equal(map.monsters.length, 0, 'Dead monsters should be removed');
    });

    it('monsters do not move through walls', async () => {
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

        await movemon(map, player, mockDisplay);

        // Monster should not have passed through the wall
        assert.ok(mon.mx <= 16 || mon.mx >= 18,
            `Monster at ${mon.mx} should not be on wall at x=17`);
    });

    it('AT_WEAP monsters wield before melee attacking when currently unarmed', async () => {
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

        assert.ok((goblin.attacks || []).some((atk) => atk?.aatyp === AT_WEAP));
        const hpBefore = player.hp;
        const messages = [];
        const display = {
            putstr_message(msg) {
                messages.push(msg);
            },
        };
        setGame({ display, map, player, fov: { canSee: () => true }, flags: { msg_window: false } });

        await movemon(map, player, display);

        assert.equal(goblin.weapon, dagger);
        assert.equal(player.hp, hpBefore);
        assert.ok(messages.some((msg) => /wields/.test(msg)));
        setGame(null);
    });

    it('AT_WEAP throws consume inventory and leave a floor projectile', async () => {
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
        await movemon(map, player, {
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

    it('collectors do not retarget to gold unless they like gold', async () => {
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

        await movemon(map, player, mockDisplay);
        assert.equal(goblin.mx, 16);
        assert.equal(goblin.my, 10);
    });

    it('collectors still retarget to practical items', async () => {
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

        await movemon(map, player, mockDisplay);
        assert.equal(goblin.mx, 16);
        assert.equal(goblin.my, 11);
    });

    it('pets cannot pick up items while standing in WATER tiles', async () => {
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
        await movemon(map, player, mockDisplay);
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
        // Make the dog amphibious so it survives in water (test is about
        // pickup behaviour, not drowning via minliquid).
        waterDog.type = { ...waterDog.type, mflags1: waterDog.type.mflags1 | M1_AMPHIBIOUS };
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

        await movemon(waterMap, waterPlayer, mockDisplay);
        assert.equal(waterDog.minvent.length, 0, 'dog should not pick up while in WATER');
        assert.equal(waterMap.objects.length, 1, 'floor item should remain in WATER square');
    });

    it('monster-vs-monster death drops preserve C top-of-pile ordering', async () => {
        initRng(7);
        const map = makeSimpleMap();
        const player = new Player();
        player.x = 28;
        player.y = 10;
        player.initRole(0);

        const attacker = makeLittleDog(12, 10, player);
        attacker.mlevel = 30;
        attacker.attacks = [{ aatyp: 1, damn: 3, damd: 6 }];

        const target = makeGoblin(13, 10, player);
        target.mhp = 1;
        target.mhpmax = 1;
        target.mac = 10;
        target.type = { ...target.type, geno: (target.type.geno || 0) | G_NOCORPSE };
        target.minvent = [
            { otyp: ORCISH_HELM, oclass: ARMOR_CLASS, quan: 1 },
            { otyp: ORCISH_DAGGER, oclass: WEAPON_CLASS, quan: 1 },
        ];

        map.monsters.push(attacker, target);
        await movemon(map, player, mockDisplay);

        const pile = map.objectsAt(13, 10);
        assert.ok(pile.length >= 2, 'target inventory should drop on death');
        assert.equal(
            pile[pile.length - 1].otyp,
            ORCISH_HELM,
            'top floor object should match C drop ordering for this inventory layout'
        );
    });
});

// ========================================================================
// mon_track_add — C ref: monmove.c:79
// ========================================================================

describe('mon_track_add', () => {
    function makeTrack() {
        return [
            { x: 0, y: 0 }, { x: 0, y: 0 },
            { x: 0, y: 0 }, { x: 0, y: 0 },
        ];
    }

    it('shifts existing entries and places new position at index 0', () => {
        const mon = { mtrack: makeTrack() };
        mon_track_add(mon, 5, 7);
        assert.deepEqual(mon.mtrack[0], { x: 5, y: 7 });
    });

    it('preserves previous entry at index 1 after one add', () => {
        const mon = { mtrack: makeTrack() };
        mon_track_add(mon, 5, 7);
        mon_track_add(mon, 10, 3);
        assert.deepEqual(mon.mtrack[0], { x: 10, y: 3 });
        assert.deepEqual(mon.mtrack[1], { x: 5, y: 7 });
    });

    it('oldest entry is dropped when ring is full', () => {
        const mon = { mtrack: makeTrack() };
        for (let i = 0; i < MTSZ; i++) mon_track_add(mon, i, i);
        // After MTSZ adds, mtrack[MTSZ-1] holds the first-added position
        assert.deepEqual(mon.mtrack[MTSZ - 1], { x: 0, y: 0 });
    });

    it('initializes canonical track ring when mon.mtrack is absent', () => {
        const mon = {};
        assert.doesNotThrow(() => mon_track_add(mon, 1, 2));
        assert.equal(Array.isArray(mon.mtrack), true);
        assert.equal(mon.mtrack.length, MTSZ);
        assert.deepEqual(mon.mtrack[0], { x: 1, y: 2 });
        assert.doesNotThrow(() => mon_track_add(null, 1, 2));
    });
});

// ========================================================================
// mon_track_clear — C ref: monmove.c:90
// ========================================================================

describe('mon_track_clear', () => {
    it('zeroes all track entries', () => {
        const mon = {
            mtrack: [{ x: 3, y: 4 }, { x: 5, y: 6 }, { x: 7, y: 8 }, { x: 9, y: 10 }],
        };
        mon_track_clear(mon);
        for (const t of mon.mtrack) {
            assert.deepEqual(t, { x: 0, y: 0 });
        }
    });

    it('is a no-op when mon.mtrack is absent', () => {
        assert.doesNotThrow(() => mon_track_clear({}));
        assert.doesNotThrow(() => mon_track_clear(null));
    });
});

// ========================================================================
// monhaskey — C ref: monmove.c:97
// ========================================================================

describe('monhaskey', () => {
    it('returns false when monster has no inventory', () => {
        assert.equal(monhaskey({ minvent: [] }, true), false);
        assert.equal(monhaskey({ minvent: [] }, false), false);
    });

    it('returns false when inventory has unrelated items', () => {
        const mon = { minvent: [{ otyp: GOLD_PIECE }] };
        assert.equal(monhaskey(mon, true), false);
        assert.equal(monhaskey(mon, false), false);
    });

    it('returns true with SKELETON_KEY regardless of forUnlocking', () => {
        const mon = { minvent: [{ otyp: SKELETON_KEY }] };
        assert.equal(monhaskey(mon, true), true);
        assert.equal(monhaskey(mon, false), true);
    });

    it('returns true with LOCK_PICK regardless of forUnlocking', () => {
        const mon = { minvent: [{ otyp: LOCK_PICK }] };
        assert.equal(monhaskey(mon, true), true);
        assert.equal(monhaskey(mon, false), true);
    });

    it('returns true with CREDIT_CARD only when forUnlocking=true', () => {
        const mon = { minvent: [{ otyp: CREDIT_CARD }] };
        assert.equal(monhaskey(mon, true), true,
            'credit card should count for unlocking');
        assert.equal(monhaskey(mon, false), false,
            'credit card should not count for non-unlocking (e.g. lock-picking)');
    });

    it('is a no-op when mon is null', () => {
        assert.doesNotThrow(() => monhaskey(null, true));
        assert.equal(monhaskey(null, true), false);
    });
});

// ========================================================================
// m_can_break_boulder — C ref: monmove.c:134
// ========================================================================

describe('m_can_break_boulder', () => {
    it('Rider (Death) can always break boulder', () => {
        const mon = { type: mons[PM_DEATH], mspec_used: 0, isshk: false, ispriest: false };
        assert.equal(m_can_break_boulder(mon), true);
    });

    it('Rider (Death) can break boulder even when mspec_used is set', () => {
        const mon = { type: mons[PM_DEATH], mspec_used: 5, isshk: false, ispriest: false };
        assert.equal(m_can_break_boulder(mon), true);
    });

    it('quest leader (MS_LEADER sound) can break boulder when mspec_used=0', () => {
        const mon = { type: mons[PM_PELIAS], mspec_used: 0, isshk: false, ispriest: false };
        assert.equal(m_can_break_boulder(mon), true);
    });

    it('quest leader cannot break boulder when mspec_used is set', () => {
        const mon = { type: mons[PM_PELIAS], mspec_used: 3, isshk: false, ispriest: false };
        assert.equal(m_can_break_boulder(mon), false);
    });

    it('shopkeeper can break boulder when mspec_used=0', () => {
        const mon = { type: mons[PM_GOBLIN], mspec_used: 0, isshk: true, ispriest: false };
        assert.equal(m_can_break_boulder(mon), true);
    });

    it('priest can break boulder when mspec_used=0', () => {
        const mon = { type: mons[PM_GOBLIN], mspec_used: 0, isshk: false, ispriest: true };
        assert.equal(m_can_break_boulder(mon), true);
    });

    it('ordinary monster cannot break boulder', () => {
        const mon = { type: mons[PM_GOBLIN], mspec_used: 0, isshk: false, ispriest: false };
        assert.equal(m_can_break_boulder(mon), false);
    });
});
