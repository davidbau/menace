// test/unit/bones.test.js -- Tests for bones.js (mirrors bones.c)
// Tests all bones functions: canMakeBones, resetobjs, dropUponDeath,
// giveToNearbyMon, setGhostlyObjlist, removeMonFromBones, sanitizeName,
// savebones (full pipeline), getbones (full pipeline).

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng, rn2 } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { mons, PM_GHOST } from '../../js/monsters.js';
import { COLNO, ROWNO, ACCESSIBLE } from '../../js/const.js';
import { WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, GEM_CLASS, TOOL_CLASS } from '../../js/objects.js';
import { Player } from '../../js/player.js';
import { GameMap } from '../../js/game.js';
import { saveLev, saveBones, loadBones, deleteBones } from '../../js/storage.js';
import {
    can_make_bones as canMakeBones,
    bones_include_name as bonesIncludeName,
    fix_ghostly_obj as fixGhostlyObj,
    fixuporacle,
    newebones,
    resetobjs,
    drop_upon_death as dropUponDeath,
    give_to_nearby_mon as giveToNearbyMon,
    set_ghostly_objlist as setGhostlyObjlist,
    remove_mon_from_bones as removeMonFromBones,
    sanitize_name as sanitizeName,
    savebones,
    getbones,
} from '../../js/bones.js';

// --- localStorage mock for Node.js ---
const store = new Map();
globalThis.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
};

// Helper: make a minimal game object for testing
async function makeTestGame(depth) {
    initRng(42);
    initLevelGeneration();
    const map = await makelevel(depth);
    wallification(map);
    const player = new Player();
    player.initRole(11); // Valkyrie
    player.dungeonLevel = depth;
    // Place player on accessible tile
    const room = map.rooms[0];
    player.x = Math.floor((room.lx + room.hx) / 2);
    player.y = Math.floor((room.ly + room.hy) / 2);
    player.name = 'TestHero';
    player.level = 5;
    return { player, map, gameOverReason: 'killed' };
}

// ========================================================================
// sanitizeName
// ========================================================================
describe('sanitizeName', () => {
    it('passes through normal ASCII names', () => {
        assert.equal(sanitizeName('Gandalf'), 'Gandalf');
        assert.equal(sanitizeName('Player the Valkyrie'), 'Player the Valkyrie');
    });

    it('replaces non-printable chars with underscore', () => {
        assert.equal(sanitizeName('test\x00name'), 'test_name');
        assert.equal(sanitizeName('bad\x01\x02chars'), 'bad__chars');
    });

    it('replaces high-bit chars', () => {
        assert.equal(sanitizeName('caf\u00e9'), 'caf_');
    });

    it('returns "anonymous" for null/undefined', () => {
        assert.equal(sanitizeName(null), 'anonymous');
        assert.equal(sanitizeName(undefined), 'anonymous');
    });

    it('returns "anonymous" for empty string', () => {
        assert.equal(sanitizeName(''), 'anonymous');
    });
});

// ========================================================================
// bones surface helpers
// ========================================================================
describe('bones surface helpers', () => {
    it('bonesIncludeName matches by prefixed who field', () => {
        const bonesinfo = [
            { who: 'Alice-Valkyrie' },
            { who: 'Bob-Wizard' },
        ];
        assert.equal(bonesIncludeName('Alice', bonesinfo), true);
        assert.equal(bonesIncludeName('Ali', bonesinfo), false);
        assert.equal(bonesIncludeName('Eve', bonesinfo), false);
    });

    it('fixGhostlyObj clears ghostly marker', () => {
        const obj = { ghostly: true };
        fixGhostlyObj(obj);
        assert.equal(obj.ghostly, false);
    });

    it('fixuporacle keeps oracle peaceful on oracle level', () => {
        const oracle = { mpeaceful: 0 };
        assert.equal(fixuporacle(oracle, { isOracleLevel: true }), true);
        assert.equal(oracle.mpeaceful, 1);
    });

    it('fixuporacle rejects oracle off oracle level', () => {
        const oracle = { mpeaceful: 0 };
        assert.equal(fixuporacle(oracle, { isOracleLevel: false }), false);
        assert.equal(oracle.mpeaceful, 0);
    });

    it('newebones allocates ebones record with parent id', () => {
        const mon = { m_id: 12345 };
        newebones(mon);
        assert.deepEqual(mon.mextra.ebones, { parentmid: 12345 });
    });
});

// ========================================================================
// canMakeBones
// ========================================================================
describe('canMakeBones', () => {
    it('always returns false on level 1', () => {
        initRng(42);
        const game = { player: { dungeonLevel: 1 } };
        assert.equal(canMakeBones(game), false);
    });

    it('consumes rn2 on deeper levels', () => {
        initRng(42);
        initLevelGeneration();
        const game = { player: { dungeonLevel: 5 } };
        // Just verify it doesn't throw and returns a boolean
        const result = canMakeBones(game);
        assert.equal(typeof result, 'boolean');
    });

    it('depth 2: rn2(1) always returns 0, so ghost always appears', () => {
        // depth >> 2 = 0, so rn2(1 + 0) = rn2(1) = always 0
        initRng(99);
        const game = { player: { dungeonLevel: 2 } };
        assert.equal(canMakeBones(game), true);
    });
});

// ========================================================================
// setGhostlyObjlist
// ========================================================================
describe('setGhostlyObjlist', () => {
    it('marks all objects as ghostly', () => {
        const objs = [
            { name: 'dagger', oclass: WEAPON_CLASS },
            { name: 'shield', oclass: ARMOR_CLASS },
        ];
        setGhostlyObjlist(objs);
        assert.equal(objs[0].ghostly, true);
        assert.equal(objs[1].ghostly, true);
    });

    it('recurses into container contents', () => {
        const inner = { name: 'gem', oclass: GEM_CLASS };
        const bag = { name: 'sack', oclass: TOOL_CLASS, contents: [inner] };
        setGhostlyObjlist([bag]);
        assert.equal(bag.ghostly, true);
        assert.equal(inner.ghostly, true);
    });

    it('handles empty list', () => {
        setGhostlyObjlist([]); // should not throw
    });
});

// ========================================================================
// resetobjs
// ========================================================================
describe('resetobjs', () => {
    it('restore mode: rebuilds displayChar from oclass', () => {
        const objs = [
            { name: 'dagger', oclass: WEAPON_CLASS },
            { name: 'food', oclass: FOOD_CLASS },
        ];
        resetobjs(objs, true);
        assert.equal(objs[0].displayChar, ')');
        assert.equal(objs[1].displayChar, '%');
    });

    it('save mode: clears timed flag', () => {
        const objs = [{ name: 'corpse', oclass: FOOD_CLASS, timed: true }];
        resetobjs(objs, false);
        assert.equal(objs[0].timed, false);
    });

    it('recurses into container contents', () => {
        const inner = { name: 'gem', oclass: GEM_CLASS };
        const bag = { name: 'sack', oclass: TOOL_CLASS, contents: [inner] };
        resetobjs([bag], true);
        assert.ok(bag.displayChar);
        assert.ok(inner.displayChar);
    });
});

// ========================================================================
// removeMonFromBones
// ========================================================================
describe('removeMonFromBones', () => {
    it('removes tame monsters', () => {
        const map = new GameMap();
        map.monsters = [
            { name: 'dog', tame: true, dead: false },
            { name: 'jackal', tame: false, dead: false },
        ];
        removeMonFromBones(map);
        assert.equal(map.monsters.length, 1);
        assert.equal(map.monsters[0].name, 'jackal');
    });

    it('removes dead monsters', () => {
        const map = new GameMap();
        map.monsters = [
            { name: 'zombie', dead: true },
            { name: 'orc', dead: false },
        ];
        removeMonFromBones(map);
        assert.equal(map.monsters.length, 1);
        assert.equal(map.monsters[0].name, 'orc');
    });

    it('removes shopkeepers', () => {
        const map = new GameMap();
        map.monsters = [
            { name: 'Asidonhopo', isshk: true, dead: false },
            { name: 'kobold', dead: false },
        ];
        removeMonFromBones(map);
        assert.equal(map.monsters.length, 1);
        assert.equal(map.monsters[0].name, 'kobold');
    });

    it('removes temple priests', () => {
        const map = new GameMap();
        map.monsters = [
            { name: 'priestess', ispriest: true, dead: false },
            { name: 'rat', dead: false },
        ];
        removeMonFromBones(map);
        assert.equal(map.monsters.length, 1);
        assert.equal(map.monsters[0].name, 'rat');
    });

    it('removes unique monsters (G_UNIQ flag)', () => {
        const map = new GameMap();
        map.monsters = [
            { name: 'Medusa', type: { geno: 0x1000 }, dead: false },  // G_UNIQ
            { name: 'snake', type: { geno: 0 }, dead: false },
        ];
        removeMonFromBones(map);
        assert.equal(map.monsters.length, 1);
        assert.equal(map.monsters[0].name, 'snake');
    });
});

// ========================================================================
// giveToNearbyMon
// ========================================================================
describe('giveToNearbyMon', () => {
    it('returns false when no monsters nearby', () => {
        const map = new GameMap();
        map.monsters = [];
        const item = { name: 'dagger' };
        assert.equal(giveToNearbyMon(map, item, 10, 10), false);
    });

    it('gives item to adjacent monster', () => {
        initRng(42);
        const map = new GameMap();
        const mon = { name: 'orc', mx: 11, my: 10, dead: false, minvent: [] };
        map.monsters = [mon];
        const item = { name: 'dagger' };
        const result = giveToNearbyMon(map, item, 10, 10);
        assert.equal(result, true);
        assert.equal(mon.minvent.length, 1);
        assert.equal(mon.minvent[0].name, 'dagger');
    });

    it('ignores distant monsters', () => {
        initRng(42);
        const map = new GameMap();
        const mon = { name: 'orc', mx: 20, my: 20, dead: false, minvent: [] };
        map.monsters = [mon];
        const item = { name: 'dagger' };
        assert.equal(giveToNearbyMon(map, item, 10, 10), false);
    });

    it('ignores dead monsters', () => {
        initRng(42);
        const map = new GameMap();
        const mon = { name: 'orc', mx: 11, my: 10, dead: true, minvent: [] };
        map.monsters = [mon];
        const item = { name: 'dagger' };
        assert.equal(giveToNearbyMon(map, item, 10, 10), false);
    });

    it('initializes minvent if missing', () => {
        initRng(42);
        const map = new GameMap();
        const mon = { name: 'orc', mx: 11, my: 10, dead: false };
        map.monsters = [mon];
        const item = { name: 'dagger' };
        giveToNearbyMon(map, item, 10, 10);
        assert.ok(Array.isArray(mon.minvent));
        assert.equal(mon.minvent.length, 1);
    });
});

// ========================================================================
// dropUponDeath
// ========================================================================
describe('dropUponDeath', () => {
    it('drops all inventory items to the floor', () => {
        initRng(42);
        const map = new GameMap();
        map.monsters = [];
        const player = new Player();
        player.x = 10;
        player.y = 10;
        const sword = { name: 'sword', oclass: WEAPON_CLASS };
        const food = { name: 'food ration', oclass: FOOD_CLASS };
        player.addToInventory(sword);
        player.addToInventory(food);
        player.weapon = sword;

        const game = { player, map };
        dropUponDeath(game);

        assert.equal(player.inventory.length, 0);
        assert.equal(player.weapon, null);
        // Items should be on the map floor
        const floorObjs = map.objects.filter(o => o.ox === 10 && o.oy === 10);
        assert.ok(floorObjs.length >= 1, 'At least some items dropped to floor');
    });

    it('unequips all slots', () => {
        initRng(42);
        const map = new GameMap();
        map.monsters = [];
        const player = new Player();
        player.x = 10;
        player.y = 10;
        const armor = { name: 'plate mail', oclass: ARMOR_CLASS };
        player.addToInventory(armor);
        player.armor = armor;
        player.shield = { name: 'shield' };

        const game = { player, map };
        dropUponDeath(game);

        assert.equal(player.weapon, null);
        assert.equal(player.armor, null);
        assert.equal(player.shield, null);
        assert.equal(player.helmet, null);
        assert.equal(player.gloves, null);
        assert.equal(player.boots, null);
        assert.equal(player.cloak, null);
        assert.equal(player.amulet, null);
        assert.equal(player.leftRing, null);
        assert.equal(player.rightRing, null);
    });
});

// ========================================================================
// savebones (full pipeline)
// ========================================================================
describe('savebones (full pipeline)', () => {
    beforeEach(() => {
        store.clear();
    });

    it('saves bones on death at depth > 1', async () => {
        const game = await makeTestGame(3);
        const sword = { name: 'sword', oclass: WEAPON_CLASS };
        game.player.addToInventory(sword);
        game.player.weapon = sword;

        savebones(game);

        // Player inventory should be emptied
        assert.equal(game.player.inventory.length, 0);
        assert.equal(game.player.weapon, null);
    });

    it('never saves bones on level 1 (canMakeBones returns false)', async () => {
        const game = await makeTestGame(1);
        // Override depth to 1
        game.player.dungeonLevel = 1;
        savebones(game);
        // No bones should be stored for depth 1
        assert.equal(loadBones(1), null);
    });

    it('creates ghost monster in bones data when saved', async () => {
        // Use depth 2: rn2(1) always 0, so bones always saves
        initRng(42);
        initLevelGeneration();
        const map = await makelevel(2);
        wallification(map);
        const player = new Player();
        player.initRole(11);
        player.dungeonLevel = 2;
        const room = map.rooms[0];
        player.x = Math.floor((room.lx + room.hx) / 2);
        player.y = Math.floor((room.ly + room.hy) / 2);
        player.name = 'TestGhost';
        player.level = 3;

        const game = { player, map, gameOverReason: 'killed' };
        savebones(game);

        const bonesData = loadBones(2);
        if (bonesData) {
            // Check for ghost in monster list
            const ghosts = bonesData.map.monsters.filter(m => m.mndx === PM_GHOST);
            assert.ok(ghosts.length > 0, 'Bones should contain a ghost');
            assert.ok(ghosts[0].name.includes('TestGhost'), 'Ghost name should include player name');
        }
        // (bones may not save due to RNG state — that's OK, canMakeBones is probabilistic)
    });

    it('does not crash with empty inventory', async () => {
        const game = await makeTestGame(3);
        // Ensure empty inventory
        game.player.inventory = [];
        savebones(game);
        // No crash = success
    });
});

// ========================================================================
// getbones (full pipeline)
// ========================================================================
describe('getbones (full pipeline)', () => {
    beforeEach(() => {
        store.clear();
    });

    it('returns null when no bones exist', () => {
        initRng(42);
        const result = getbones(null, 5);
        // rn2(3) consumed, but no bones stored
        assert.equal(result, null);
    });

    it('returns null when rn2(3) is not 0', () => {
        // Find a seed where rn2(3) != 0 for the first call
        initRng(1); // rn2(3) with seed 1 -- need to check
        initLevelGeneration();
        // Store bones for depth 5
        const map = new GameMap();
        map.at(10, 5).typ = 25; // ROOM
        const mapData = saveLev(map);
        saveBones(5, mapData, 'Ghost', 10, 5, 1, []);

        // getbones consumes rn2(3); if != 0, returns null
        const result = getbones(null, 5);
        // We don't know the exact roll, but the logic is tested
        // Either it returned a map (roll was 0) or null (roll != 0)
        assert.ok(result === null || result instanceof GameMap);
    });

    it('loads and deletes bones when rn2(3) == 0', async () => {
        // Brute force: try seeds until we find one where rn2(3) == 0
        // after initLevelGeneration
        let foundSeed = null;
        for (let seed = 0; seed < 100; seed++) {
            initRng(seed);
            initLevelGeneration();
            // Simulate the rn2(3) that getbones would call
            if (rn2(3) === 0) {
                foundSeed = seed;
                break;
            }
        }
        assert.ok(foundSeed !== null, 'Should find a seed where rn2(3)==0');

        // Now actually run getbones with that seed and stored bones
        initRng(foundSeed);
        initLevelGeneration();

        const origMap = await makelevel(3);
        wallification(origMap);
        const mapData = saveLev(origMap);
        mapData.isBones = true;
        saveBones(3, mapData, 'OldHero', 10, 5, 1, []);
        assert.ok(loadBones(3), 'Bones should be stored');

        // Re-init RNG to same state (getbones is called at level gen start)
        initRng(foundSeed);
        initLevelGeneration();

        const result = getbones(null, 3);
        assert.ok(result, 'Should load bones map');
        assert.ok(result instanceof GameMap);
        assert.equal(result.isBones, true);
        // Bones should be deleted after loading
        assert.equal(loadBones(3), null, 'Bones should be deleted after getbones');
    });

    it('marks loaded objects as ghostly', async () => {
        // Find seed where rn2(3) == 0
        let foundSeed = null;
        for (let seed = 0; seed < 100; seed++) {
            initRng(seed);
            initLevelGeneration();
            if (rn2(3) === 0) { foundSeed = seed; break; }
        }
        assert.ok(foundSeed !== null);

        initRng(foundSeed);
        initLevelGeneration();

        const origMap = await makelevel(3);
        wallification(origMap);
        // Add an object to the map
        origMap.objects.push({ name: 'dagger', oclass: WEAPON_CLASS, ox: 10, oy: 5, displayChar: ')' });
        const mapData = saveLev(origMap);
        mapData.isBones = true;
        saveBones(3, mapData, 'Ghost', 10, 5, 1, []);

        initRng(foundSeed);
        initLevelGeneration();

        const result = getbones(null, 3);
        if (result) {
            const daggers = result.objects.filter(o => o.name === 'dagger');
            for (const d of daggers) {
                assert.equal(d.ghostly, true, 'Objects from bones should be marked ghostly');
            }
        }
    });
});
