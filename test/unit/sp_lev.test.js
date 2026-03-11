/**
 * Tests for special level generation (sp_lev.js)
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
    des, resetLevelState, getLevelState, withFinalizeContext,
    mapfrag_fromstr, mapfrag_canmatch, mapfrag_error, mapfrag_match,
    check_mapchr, get_table_mapchr_opt, get_table_mapchr, l_selection_filter_mapchar,
    get_table_boolean, get_table_boolean_opt, get_table_int, get_table_int_opt,
    get_table_str, get_table_str_opt, get_table_option,
    l_selection_new, l_selection_setpoint, l_selection_getpoint,
    l_selection_and, l_selection_or, l_selection_xor, l_selection_sub, l_selection_numpoints
} from '../../js/sp_lev.js';
import { place_lregion } from '../../js/mkmaze.js';
import {
    STONE, ROOM, CORR, DOOR, HWALL, VWALL, STAIRS, LAVAPOOL, PIT, MAGIC_PORTAL, CROSSWALL, GRAVE,
    WATER, AIR,
    ALTAR, THRONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, ROOMOFFSET,
    LR_DOWNSTAIR, LR_UPSTAIR, LR_TELE,
} from '../../js/const.js';
import { BOULDER, DAGGER, GOLD_PIECE } from '../../js/objects.js';

// Alias for stairs
const STAIRS_UP = STAIRS;
import { initRng } from '../../js/rng.js';

describe('sp_lev.js - des.* API', () => {
    before(() => {
        initRng(42);
    });

    it('should initialize with solidfill style', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const state = getLevelState();
        assert.equal(state.init.style, 'solidfill');
        assert.equal(state.init.fg, STONE);

        // Check that map is filled with stone
        const map = state.map;
        assert.ok(map, 'Map should be created');
        assert.equal(map.locations[0][0].typ, STONE);
        assert.equal(map.locations[40][10].typ, STONE);
        assert.equal(map.locations[79][20].typ, STONE);
    });

    it('should honor solidfill filling override like C level_init', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.', filling: ' ' });

        const state = getLevelState();
        assert.equal(state.init.fg, ROOM, 'fg should still parse independently');
        assert.equal(state.init.filling, STONE, 'filling should parse and override solidfill terrain');
        assert.equal(state.map.locations[40][10].typ, STONE, 'solidfill should use filling, not fg');
    });

    it('should parse maze init deadends/corrwid/wallthick like C', () => {
        resetLevelState();
        des.level_init({ style: 'maze', corrwid: 2, wallthick: 3, deadends: false });

        const state = getLevelState();
        assert.equal(state.init.corrwid, 2);
        assert.equal(state.init.wallthick, 3);
        assert.equal(state.init.rm_deadends, true, 'rm_deadends should invert deadends option');
    });

    it('exposes C-registered des API surface for implemented functions', () => {
        assert.equal(typeof des.message, 'function');
        assert.equal(typeof des.room, 'function');
        assert.equal(typeof des.corridor, 'function');
        assert.equal(typeof des.replace_terrain, 'function');
        assert.equal(typeof des.mineralize, 'function');
        assert.equal(typeof des.grave, 'function');
        assert.equal(typeof des.random_corridors, 'function');
        assert.equal(typeof des.wallify, 'function');
        assert.equal(typeof des.reset_level, 'function');
    });

    it('should set level flags correctly', () => {
        resetLevelState();
        des.level_flags('noteleport', 'hardfloor', 'mazelevel', 'sokoban');

        const state = getLevelState();
        assert.equal(state.flags.noteleport, true);
        assert.equal(state.flags.hardfloor, true);
        assert.equal(state.flags.is_maze_lev, true);
    });

    it('should place a simple map', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const testMap = `-----
|...|
|...|
-----`;

        await des.map(testMap);

        const state = getLevelState();
        const map = state.map;
        const ox = state.xstart;
        const oy = state.ystart;

        assert.equal(map.locations[ox][oy].typ, HWALL, 'Top-left should be wall');
        assert.equal(map.locations[ox][oy + 1].typ, VWALL, 'Left edge should be wall');
        assert.equal(map.locations[ox + 1][oy + 1].typ, ROOM, 'Inside should be room');
    });

    it('should set individual terrain with des.terrain', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        des.terrain(10, 5, '<');
        des.terrain(20, 10, '>');

        const state = getLevelState();
        const map = state.map;

        assert.equal(map.locations[10][5].typ, STAIRS_UP);
        assert.equal(map.locations[20][10].typ, STAIRS_UP); // STAIRS (same as STAIRS_UP)
    });

    it('should handle map alignment options', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const smallMap = `---
|.|
---`;

        await des.map({ map: smallMap, halign: 'left', valign: 'top' });

        const state = getLevelState();
        const map = state.map;
        const ox = state.xstart;
        const oy = state.ystart;

        assert.equal(map.locations[ox][oy].typ, HWALL);
        assert.equal(map.locations[ox][oy + 1].typ, VWALL);
        assert.equal(map.locations[ox + 1][oy + 1].typ, ROOM);
    });

    it('should handle explicit x,y coordinates for map placement', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const smallMap = `..
..`;

        await des.map({ map: smallMap, x: 50, y: 10 });

        const state = getLevelState();
        const map = state.map;

        assert.equal(map.locations[50][10].typ, ROOM);
        assert.equal(map.locations[51][10].typ, ROOM);
        assert.equal(map.locations[50][11].typ, ROOM);
        assert.equal(map.locations[51][11].typ, ROOM);
    });

    it('des.map clears per-cell metadata before applying terrain', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });

        const map = getLevelState().map;
        map.locations[10][5].flags = 0x7fff;
        map.locations[10][5].horizontal = 1;
        map.locations[10][5].roomno = 42;
        map.locations[10][5].edge = 1;

        await des.map({ map: '.', x: 10, y: 5 });

        assert.equal(map.locations[10][5].typ, ROOM);
        assert.equal(map.locations[10][5].flags, 0);
        assert.equal(map.locations[10][5].horizontal, 0);
        assert.equal(map.locations[10][5].roomno, 0);
        assert.equal(map.locations[10][5].edge, 0);
    });

    it('des.altar places ALTAR terrain and alignment metadata', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });

        des.altar({ x: 12, y: 7, align: 'law' });
        let map = getLevelState().map;
        assert.equal(map.locations[12][7].typ, ALTAR);
        assert.equal(map.locations[12][7].altarAlign, A_LAWFUL);

        des.altar({ x: 13, y: 7, align: 'chaos' });
        map = getLevelState().map;
        assert.equal(map.locations[13][7].typ, ALTAR);
        assert.equal(map.locations[13][7].altarAlign, A_CHAOTIC);
    });

    it('des.altar honors map-relative coordinates after des.map', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '..\n..', x: 10, y: 5 });

        des.altar({ x: 1, y: 1, align: 'neutral' });
        const map = getLevelState().map;
        assert.equal(map.locations[11][6].typ, ALTAR);
        assert.equal(map.locations[11][6].altarAlign, A_NEUTRAL);
    });

    it('des.feature places C feature terrain types', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.feature('throne', 20, 8);

        const map = getLevelState().map;
        assert.equal(map.locations[20][8].typ, THRONE);
    });

    it('des.feature supports C-style "random" boolean flags', () => {
        resetLevelState();
        initRng(7);
        des.level_init({ style: 'solidfill', fg: '.' });
        des.feature({ type: 'fountain', x: 10, y: 6, looted: 'random', warned: 'random' });

        const loc = getLevelState().map.locations[10][6];
        assert.equal(typeof loc.featureFlags.looted, 'boolean');
        assert.equal(typeof loc.featureFlags.warned, 'boolean');
        assert.equal((loc.flags & 1) !== 0, loc.featureFlags.looted);
        assert.equal((loc.flags & 2) !== 0, loc.featureFlags.warned);
    });

    it('des.object preserves achievement marker for branch prize objects', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        const obj = await des.object({ id: 'luckstone', x: 12, y: 7, achievement: 1 });

        assert.ok(obj, 'object should be created');
        assert.equal(obj.achievement, 1, 'achievement marker should be copied to object');
        // Object is placed immediately on the floor (no deferral)
        assert.equal(obj.ox, 12, 'object should be placed at x=12');
        assert.equal(obj.oy, 7, 'object should be placed at y=7');
    });

    it('des.gas_cloud uses absolute x/y and C-style ttl override semantics', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '..\n..', x: 10, y: 5 });

        des.gas_cloud({ x: 1, y: 1, damage: 3 });
        let clouds = getLevelState().map.gasClouds;
        assert.equal(clouds.length, 1);
        assert.equal(clouds[0].x, 1, 'gas_cloud x should be absolute (not map-relative)');
        assert.equal(clouds[0].y, 1, 'gas_cloud y should be absolute (not map-relative)');
        assert.equal(clouds[0].damage, 3);
        assert.equal('ttl' in clouds[0], false, 'ttl should not be forced when omitted');

        des.gas_cloud({ x: 2, y: 2, damage: 1, ttl: 9 });
        clouds = getLevelState().map.gasClouds;
        assert.equal(clouds.length, 2);
        assert.equal(clouds[1].ttl, 9, 'explicit ttl should be preserved');
    });

    it('des.map parses backslash as THRONE terrain', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '\\\\', x: 10, y: 5 });

        const map = getLevelState().map;
        assert.equal(map.locations[10][5].typ, THRONE);
    });

    it('mapfrag_match treats "w" as wall wildcard and uses center coordinates', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.terrain(10, 5, '-');
        des.terrain(11, 5, '.');

        const wallFrag = mapfrag_fromstr('w');
        assert.equal(mapfrag_error(wallFrag), null);
        assert.equal(mapfrag_match(getLevelState().map, wallFrag, 10, 5), true);
        assert.equal(mapfrag_match(getLevelState().map, wallFrag, 11, 5), false);
    });

    it('mapfrag_canmatch/mapfrag_error reject even-sized fragments', () => {
        const frag = mapfrag_fromstr('..\n..');
        assert.equal(mapfrag_canmatch(null, frag), false);
        assert.equal(mapfrag_error(frag), 'mapfragment needs to have odd height and width');
    });

    it('des.replace_terrain supports mapfragment matching at runtime', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.terrain(10, 5, '-');
        des.terrain(11, 5, '.');

        des.replace_terrain({
            mapfragment: 'w',
            toterrain: '.',
            chance: 100,
            region: [9, 5, 11, 5]
        });

        const map = getLevelState().map;
        assert.equal(map.locations[10][5].typ, ROOM, 'wall match should be replaced');
        assert.equal(map.locations[11][5].typ, ROOM, 'non-wall floor stays floor');
    });

    it('mapchar helpers validate and parse map characters like nhlua', () => {
        assert.equal(check_mapchr('.'), true);
        assert.equal(check_mapchr('w'), true);
        assert.equal(check_mapchr('x'), true);
        assert.equal(check_mapchr('!'), false);
        assert.equal(get_table_mapchr_opt({ typ: '.' }, 'typ', null), '.');
        assert.equal(get_table_mapchr_opt({ typ: '!' }, 'typ', '?'), '?');
        assert.equal(get_table_mapchr({ typ: 'w' }, 'typ'), 'w');
        assert.throws(() => get_table_mapchr({}, 'typ'));
    });

    it('l_selection_filter_mapchar supports wall wildcard and transparent selector', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.terrain(10, 5, '-');
        des.terrain(11, 5, '.');

        const walls = l_selection_filter_mapchar(null, 'w');
        assert.equal(walls.coords.some(c => c.x === 10 && c.y === 5), true);
        assert.equal(walls.coords.some(c => c.x === 11 && c.y === 5), false);

        const all = l_selection_filter_mapchar({ x1: 10, y1: 5, x2: 11, y2: 5 }, 'x');
        assert.equal(all.coords.some(c => c.x === 10 && c.y === 5), true);
        assert.equal(all.coords.some(c => c.x === 11 && c.y === 5), true);
    });

    it('nhlua table helpers parse booleans/ints/strings/options', () => {
        assert.equal(get_table_boolean({ b: true }, 'b'), true);
        assert.equal(get_table_boolean_opt({}, 'b', true), true);
        assert.equal(get_table_int({ n: 7 }, 'n'), 7);
        assert.equal(get_table_int_opt({}, 'n', 9), 9);
        assert.equal(get_table_str({ s: 42 }, 's'), '42');
        assert.equal(get_table_str_opt({}, 's', 'd'), 'd');
        assert.equal(get_table_option({ o: 'a' }, 'o', ['a', 'b'], 'b'), 'a');
        assert.equal(get_table_option({ o: 'x' }, 'o', ['a', 'b'], 'b'), 'b');
    });

    it('nhlsel wrappers compose selections with C-name helpers', () => {
        const a = l_selection_new();
        const b = l_selection_new();
        l_selection_setpoint(a, 10, 5, true);
        l_selection_setpoint(a, 11, 5, true);
        l_selection_setpoint(b, 11, 5, true);

        assert.equal(l_selection_getpoint(a, 10, 5), true);
        assert.equal(l_selection_numpoints(l_selection_and(a, b)), 1);
        assert.equal(l_selection_numpoints(l_selection_or(a, b)), 2);
        assert.equal(l_selection_numpoints(l_selection_xor(a, b)), 1);
        assert.equal(l_selection_numpoints(l_selection_sub(a, b)), 1);
    });

    it('des.altar does not overwrite stairs/ladder tiles', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.stair('up', 10, 5);
        des.altar({ x: 10, y: 5, align: 'law' });

        const map = getLevelState().map;
        assert.equal(map.locations[10][5].typ, STAIRS_UP);
    });

    it('des.gold supports C call forms and default random amount', () => {
        resetLevelState();
        initRng(123);
        des.level_init({ style: 'solidfill', fg: '.' });

        des.gold(500, 10, 5);
        let map = getLevelState().map;
        assert.equal(map.objects.some(o => o.otyp === GOLD_PIECE && o.ox === 10 && o.oy === 5 && o.quan === 500), true);

        des.gold(250, [11, 5]);
        map = getLevelState().map;
        assert.equal(map.objects.some(o => o.otyp === GOLD_PIECE && o.ox === 11 && o.oy === 5 && o.quan === 250), true);

        des.gold();
        map = getLevelState().map;
        const randomGold = map.objects.find(o => o.otyp === GOLD_PIECE && !(o.ox === 10 && o.oy === 5) && !(o.ox === 11 && o.oy === 5));
        assert.ok(randomGold, 'gold() should place random gold');
        assert.ok(randomGold.quan >= 1 && randomGold.quan <= 200, 'gold() amount should be rnd(200)');
    });

    it('des.monster fleeing option sets runtime flee state', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });

        des.monster({ id: 'goblin', x: 12, y: 8, fleeing: 9 });

        const monsters = getLevelState().map.monsters;
        assert.equal(monsters.length, 1);
        assert.equal(monsters[0].mx, 12);
        assert.equal(monsters[0].my, 8);
        assert.equal(monsters[0].mflee, true);
        assert.equal(monsters[0].mfleetim, 9);
    });

    it('finalize_level applies C solidify_map to untouched stone/walls', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('solidify');

        const map = getLevelState().map;
        map.locations[10][5].typ = ROOM; // touched/open tile
        map.locations[30][10].typ = STONE; // untouched tile

        await des.finalize_level();

        assert.equal(map.locations[30][10].nondiggable, true, 'untouched stone should become nondiggable');
        assert.equal(map.locations[30][10].nonpasswall, true, 'untouched stone should become nonpasswall');
        assert.equal(map.locations[10][5].nonpasswall, undefined, 'touched tile should not be force-solidified');
    });

    it('should preserve leading and trailing blank map lines', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        await des.map({ map: '..\n..', x: 10, y: 5 });
        let state = getLevelState();
        let map = state.map;
        assert.equal(state.xsize, 2);
        assert.equal(state.ysize, 2);
        assert.equal(map.locations[10][5].typ, ROOM);
        assert.equal(map.locations[10][6].typ, ROOM);

        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '..\n..\n', x: 10, y: 5 });
        state = getLevelState();
        map = state.map;
        assert.equal(state.xsize, 2);
        assert.equal(state.ysize, 3);
        assert.equal(map.locations[10][5].typ, ROOM);
        assert.equal(map.locations[10][6].typ, ROOM);
        assert.equal(map.locations[10][7].typ, STONE);

        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '\n..\n..\n', x: 10, y: 5 });
        state = getLevelState();
        map = state.map;
        assert.equal(state.xsize, 2);
        assert.equal(state.ysize, 4);
        assert.equal(map.locations[10][5].typ, STONE);
        assert.equal(map.locations[10][6].typ, ROOM);
        assert.equal(map.locations[10][7].typ, ROOM);
    });

    it('applies des.region coordinates relative to des.map origin by default', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ', lit: 0 });
        await des.map({ map: '..\n..', x: 10, y: 5 });

        await des.region({ region: [0, 0, 0, 0], lit: true });
        const map = getLevelState().map;
        assert.equal(map.locations[10][5].lit, 1, 'relative region should target map origin');
        assert.equal(map.locations[0][0].lit, false, 'absolute origin should remain unchanged');

        await des.region({ region: [0, 0, 0, 0], lit: true, region_islev: true });
        assert.equal(map.locations[0][0].lit, 1, 'region_islev should use absolute level coordinates');
    });

    it('creates room metadata for non-ordinary des.region', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.', lit: 0 });
        await des.region({ region: [10, 5, 12, 7], lit: true, type: 'temple', filled: 2, joined: false });

        const state = getLevelState();
        const map = state.map;
        assert.equal(map.nroom, 1);
        assert.equal(map.rooms.length, 1);
        assert.equal(map.rooms[0].rtype, 10);
        assert.equal(map.rooms[0].needfill, 2);
        assert.equal(map.rooms[0].needjoining, false);
        assert.equal(map.locations[11][6].roomno, 3, 'room interior should be assigned roomno');
        assert.equal(map.locations[11][6].lit, 1, 'lit region room should be lit');
    });

    it('levregion and teleport_region enforce C-style option validation', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        assert.throws(() => des.levregion({ type: 'stair-up' }));
        assert.throws(() => des.levregion({ region: [0, 0, 1, 1], type: 'bad-type' }));
        assert.throws(() => des.teleport_region({ region: [0, 0, 1, 1], dir: 'sideways' }));
        assert.throws(() => des.teleport_region({ dir: 'both' }));
        assert.throws(() => des.exclusion({ type: 'teleport', region: { x1: 0, y1: 0, x2: 1, y2: 1 } }));
    });

    it('keeps ordinary rectangular des.region as light-only (no room)', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.', lit: 0 });
        await des.region({ region: [10, 5, 10, 5], lit: true, type: 'ordinary' });

        const map = getLevelState().map;
        assert.equal(map.nroom, 0);
        assert.equal(map.rooms.length, 0);
        assert.equal(map.locations[10][5].lit, 1);
    });

    it('applies des.non_diggable coordinates relative to des.map origin', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '--\n..', x: 10, y: 5 });

        des.non_diggable({ x1: 0, y1: 0, x2: 0, y2: 0 });
        const map = getLevelState().map;
        assert.equal(map.locations[10][5].nondiggable, true, 'relative non_diggable should target map origin');
        assert.equal(map.locations[10][6].nondiggable, false, 'non-wall tiles should remain diggable');
        assert.equal(map.locations[0][0].nondiggable, false, 'absolute origin should remain diggable');
    });

    it('applies des.wall_property default nondiggable to region coordinates', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '--\n..', x: 10, y: 5 });

        des.wall_property({ region: [0, 0, 0, 0] });
        const map = getLevelState().map;
        assert.equal(map.locations[10][5].nondiggable, true, 'relative region should target map origin');
        assert.equal(map.locations[10][6].nondiggable, false, 'non-wall tiles should remain unchanged');
    });

    it('applies des.wall_property nonpasswall option', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        await des.map({ map: '--\n..', x: 10, y: 5 });

        des.wall_property({ x1: 0, y1: 0, x2: 0, y2: 0, property: 'nonpasswall' });
        const map = getLevelState().map;
        assert.equal(map.locations[10][5].nonpasswall, true, 'wall should become non-passwall');
        assert.equal(map.locations[10][6].nonpasswall, undefined, 'non-wall tiles should remain unchanged');
    });

    it('applies des.wallify bounded x1/y1/x2/y2 semantics', () => {
        // C ref: sp_lev.c wallify_map() — converts STONE→wall when adjacent to ROOM.
        // Non-STONE tiles (existing walls) are left unchanged.
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        // Place a ROOM tile at (10,9) and STONE at (10,10) (the default).
        des.terrain(10, 9, '.');
        const map = getLevelState().map;
        assert.equal(map.locations[10][9].typ, ROOM, 'test setup should place a room tile');
        assert.equal(map.locations[10][10].typ, STONE, 'test setup: (10,10) should start as STONE');

        // wallify within a region that includes both: STONE adjacent to ROOM becomes HWALL.
        des.wallify({ x1: 9, y1: 9, x2: 11, y2: 11 });
        assert.equal(map.locations[10][10].typ, HWALL, 'STONE adjacent to ROOM above should become HWALL');

        // An existing HWALL placed explicitly is NOT converted (only STONE is processed).
        des.terrain(12, 10, '-');
        des.wallify({ x1: 12, y1: 10, x2: 12, y2: 10 });
        assert.equal(map.locations[12][10].typ, HWALL, 'existing wall stays unchanged by wallify');
    });

    it('accepts des.mineralize option table without regressions', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.mineralize({ gem_prob: 0, gold_prob: 0, kelp_pool: 0, kelp_moat: 0 });

        const map = getLevelState().map;
        assert.ok(map, 'map should remain valid after mineralize options call');
    });

    it('places grave terrain and epitaph text from table form', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });

        des.grave({ x: 12, y: 7, text: 'Here lies JS.' });
        const map = getLevelState().map;
        assert.equal(map.locations[12][7].typ, GRAVE);
        assert.equal(map.engravings.some(e => e.x === 12 && e.y === 7 && e.text === 'Here lies JS.'), true);
    });

    it('does not place grave on trap-occupied square', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        await des.trap('pit', 10, 5);

        des.grave(10, 5, 'blocked');
        const map = getLevelState().map;
        assert.notEqual(map.locations[10][5].typ, GRAVE);
        assert.equal(map.engravings.some(e => e.x === 10 && e.y === 5 && e.text === 'blocked'), false);
    });

    it('connects rooms with des.corridor table form', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        const map = getLevelState().map;
        map.rooms = [
            { lx: 5, ly: 5, hx: 8, hy: 8, needjoining: true },
            { lx: 20, ly: 5, hx: 23, hy: 8, needjoining: true }
        ];
        map.nroom = 2;
        map.locations[9][5].typ = DOOR;   // east wall door for room 0
        map.locations[19][5].typ = DOOR;  // west wall door for room 1

        des.corridor({ srcroom: 0, srcdoor: 0, srcwall: 'east', destroom: 1, destdoor: 0, destwall: 'west' });
        let corridorLike = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                if (map.locations[x][y].typ === CORR) corridorLike++;
            }
        }
        assert.ok(corridorLike > 0, 'corridor call should carve at least one corridor tile');
    });

    it('ignores incomplete des.corridor table', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        const map = getLevelState().map;
        map.rooms = [
            { lx: 5, ly: 5, hx: 8, hy: 8, needjoining: true },
            { lx: 20, ly: 5, hx: 23, hy: 8, needjoining: true }
        ];
        map.nroom = 2;
        map.locations[9][5].typ = DOOR;
        map.locations[19][5].typ = DOOR;

        des.corridor({ srcroom: 0, srcwall: 'east', destroom: 1, destwall: 'west' });
        let corridorLike = 0;
        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                if (map.locations[x][y].typ === CORR) corridorLike++;
            }
        }
        assert.equal(corridorLike, 0, 'incomplete corridor spec should not carve');
    });

    it('finalize_level map cleanup removes boulders and destroyable traps on liquid', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const state = getLevelState();
        const map = state.map;
        state.coder.allow_flips = 0;
        map.locations[10][10].typ = LAVAPOOL;
        map.locations[11][10].typ = ROOM;

        map.objects.push({ otyp: BOULDER, ox: 10, oy: 10 });
        map.objects.push({ otyp: DAGGER, ox: 10, oy: 10 });

        map.traps.push({ ttyp: PIT, tx: 10, ty: 10 });
        map.traps.push({ ttyp: MAGIC_PORTAL, tx: 10, ty: 10 });
        map.traps.push({ ttyp: PIT, tx: 11, ty: 10 });
        map.engravings.push({ x: 10, y: 10, text: 'burned' });
        map.engravings.push({ x: 11, y: 10, text: 'safe' });

        await des.finalize_level();

        assert.equal(map.objects.some(o => o.otyp === BOULDER && o.ox === 10 && o.oy === 10), false,
            'boulder on liquid should be removed');
        assert.equal(map.objects.some(o => o.otyp === DAGGER && o.ox === 10 && o.oy === 10), true,
            'non-boulder object on liquid should remain');

        assert.equal(map.traps.some(t => t.ttyp === PIT && t.tx === 10 && t.ty === 10), false,
            'destroyable trap on liquid should be removed');
        assert.equal(map.traps.some(t => t.ttyp === MAGIC_PORTAL && t.tx === 10 && t.ty === 10), true,
            'undestroyable trap on liquid should remain');
        assert.equal(map.traps.some(t => t.ttyp === PIT && t.tx === 11 && t.ty === 10), true,
            'trap on non-liquid terrain should remain');
        assert.equal(map.engravings.some(e => e.x === 10 && e.y === 10), false,
            'engraving on liquid should be removed');
        assert.equal(map.engravings.some(e => e.x === 11 && e.y === 10), true,
            'engraving on non-liquid should remain');
    });

    it('finalize_level converts touched boundary CROSSWALL tiles to ROOM', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });

        const state = getLevelState();
        const map = state.map;
        state.coder.allow_flips = 0;
        des.terrain(10, 10, 'B'); // touched CROSSWALL
        map.locations[11][10].typ = CROSSWALL; // untouched CROSSWALL

        await des.finalize_level();

        assert.notEqual(map.locations[10][10].typ, CROSSWALL,
            'touched CROSSWALL should no longer remain CROSSWALL');
        assert.equal(map.locations[11][10].typ, CROSSWALL,
            'untouched CROSSWALL should remain CROSSWALL');
    });

    it('finalize_level links doors to rooms like C link_doors_rooms', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        const map = getLevelState().map;
        map.rooms = [{ lx: 10, ly: 6, hx: 13, hy: 9, needjoining: true, doorct: 0, fdoor: 0, roomnoidx: 0, irregular: false, nsubrooms: 0, sbrooms: [] }];
        map.nroom = 1;
        const room = map.rooms[0];
        for (let x = room.lx; x <= room.hx; x++) {
            for (let y = room.ly; y <= room.hy; y++) {
                map.locations[x][y].roomno = ROOMOFFSET;
            }
        }
        const doorX = 14;
        const doorY = 6;
        map.locations[doorX][doorY].typ = DOOR;

        await des.finalize_level();

        assert.ok(room.doorct > 0, 'finalize should attach adjacent doors to room metadata');
        assert.equal(map.doors.some(d => d.x === doorX && d.y === doorY), true, 'door list should include linked door');
    });

    it('finalize_level keeps stair metadata aligned after vertical flip', async () => {
        resetLevelState();
        initRng(1); // first rn2(2) => 1, so vertical flip is applied
        des.level_init({ style: 'solidfill', fg: '.', lit: 0 });
        des.stair('up', 10, 5);

        const state = getLevelState();
        state.coder.allow_flips = 1; // vertical only
        const map = await des.finalize_level();

        assert.equal(map.locations[10][15].typ, STAIRS, 'stair terrain should flip to mirrored y');
        assert.equal(map.upstair.x, 10, 'upstair x metadata should remain aligned');
        assert.equal(map.upstair.y, 15, 'upstair y metadata should be flipped');
    });

    it('place_lregion oneshot removes destroyable trap blocker', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        const map = getLevelState().map;
        map.traps.push({ ttyp: PIT, tx: 10, ty: 10 });

        place_lregion(map, 10, 10, 10, 10, 0, 0, 0, 0, LR_UPSTAIR);

        assert.equal(map.trapAt(10, 10), null, 'destroyable trap should be removed in oneshot fallback');
        assert.equal(map.at(10, 10).typ, STAIRS, 'stairs should be placed after removing trap');
    });

    it('place_lregion oneshot keeps undestroyable trap blocker', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        const map = getLevelState().map;
        map.traps.push({ ttyp: MAGIC_PORTAL, tx: 10, ty: 10 });

        place_lregion(map, 10, 10, 10, 10, 0, 0, 0, 0, LR_UPSTAIR);

        assert.notEqual(map.trapAt(10, 10), null, 'undestroyable trap should remain');
        assert.notEqual(map.at(10, 10).typ, STAIRS, 'stairs should not overwrite undestroyable trap location');
    });

    it('place_lregion oneshot teleport relocates occupying monster', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        const map = getLevelState().map;
        map.monsters.push({ mx: 10, my: 10, mhp: 10 });

        // LR_TELE in const.js
        place_lregion(map, 10, 10, 10, 10, 0, 0, 0, 0, LR_TELE);

        assert.equal(map.monsterAt(10, 10), null, 'occupying monster should be displaced from teleport location');
        assert.equal(map.monsters.length, 1, 'monster should remain on level when relocation is possible');
    });

    it('place_lregion oneshot teleport limbos occupying monster when no relocation exists', () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        const map = getLevelState().map;
        map.at(10, 10).typ = ROOM;
        map.monsters.push({ mx: 10, my: 10, mhp: 10 });

        // LR_TELE in const.js
        place_lregion(map, 10, 10, 10, 10, 0, 0, 0, 0, LR_TELE);

        assert.equal(map.monsters.length, 0, 'monster should be removed when no legal relocation exists');
    });

    it('fixup_special LR_PORTAL resolves named destination level', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.levregion({ region: [10, 10, 10, 10], region_islev: 1, type: 'portal', name: 'fire' });
        getLevelState().coder.allow_flips = 0;

        const map = await withFinalizeContext(
            { dnum: 0, dlevel: 1, specialName: 'portal-test' },
            async () => await des.finalize_level()
        );
        const portal = map.trapAt(10, 10);
        assert.ok(portal, 'portal trap should be placed');
        assert.equal(portal.ttyp, MAGIC_PORTAL, 'trap should be MAGIC_PORTAL');
        assert.equal(portal.dst.dnum, 0, 'named destination should resolve destination dungeon');
        assert.equal(portal.dst.dlevel, -3, 'named destination should resolve destination level');
    });

    it('fixup_special LR_PORTAL resolves numeric destination level in current dungeon', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.levregion({ region: [12, 10, 12, 10], region_islev: 1, type: 'portal', name: '7' });
        getLevelState().coder.allow_flips = 0;

        const map = await withFinalizeContext(
            { dnum: 6, dlevel: 2, specialName: 'portal-test' },
            async () => await des.finalize_level()
        );
        const portal = map.trapAt(12, 10);
        assert.ok(portal, 'portal trap should be placed');
        assert.equal(portal.ttyp, MAGIC_PORTAL, 'trap should be MAGIC_PORTAL');
        assert.equal(portal.dst.dnum, 6, 'numeric destination should keep current dungeon');
        assert.equal(portal.dst.dlevel, 7, 'numeric destination should set destination level');
    });

    it('fixup_special water setup clears hero_memory and converts fallback stone to WATER', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('premapped');
        getLevelState().coder.allow_flips = 0;

        const map = await withFinalizeContext(
            { specialName: 'water' },
            async () => await des.finalize_level()
        );
        assert.equal(map.flags.hero_memory, false, 'water setup should force hero_memory off');
        assert.equal(map.at(40, 10).typ, WATER, 'water setup should convert default STONE to WATER');
    });

    it('fixup_special air setup clears hero_memory and converts fallback stone to AIR', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: ' ' });
        des.level_flags('premapped');
        getLevelState().coder.allow_flips = 0;

        const map = await withFinalizeContext(
            { specialName: 'air' },
            async () => await des.finalize_level()
        );
        assert.equal(map.flags.hero_memory, false, 'air setup should force hero_memory off');
        assert.equal(map.at(40, 10).typ, AIR, 'air setup should convert default STONE to AIR');
    });

    it('fixup_special water setup seeds bubble scaffold and consumes setup RNG', async () => {
        resetLevelState();
        initRng(123);
        des.level_init({ style: 'solidfill', fg: ' ' });
        getLevelState().coder.allow_flips = 0;

        const map = await withFinalizeContext(
            { specialName: 'water' },
            async () => await des.finalize_level()
        );
        const setup = map._waterLevelSetup;

        assert.ok(setup, 'water setup should store seeded setup metadata');
        assert.equal(setup.isWaterLevel, true, 'metadata should mark water setup');
        assert.equal(setup.xmin, 3, 'setup bounds should follow C xmin');
        assert.equal(setup.ymin, 1, 'setup bounds should follow C ymin');
        assert.ok(setup.xmax >= setup.xmin, 'setup bounds should be valid');
        assert.ok(setup.ymax >= setup.ymin, 'setup bounds should be valid');
        assert.ok(setup.xskip >= 10 && setup.xskip <= 19, 'water xskip should match C range');
        assert.ok(setup.yskip >= 4 && setup.yskip <= 7, 'water yskip should match C range');
        assert.ok(Array.isArray(setup.bubbles), 'bubble scaffold should be an array');
        assert.ok(setup.bubbles.length > 0, 'bubble scaffold should include seeded entries');
    });

    it('finalize_level applies premapped reveal when level flag is set', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        des.level_flags('premapped');
        await des.trap('pit', 10, 5);
        getLevelState().coder.allow_flips = 0;

        const map = getLevelState().map;
        assert.notEqual(map.at(10, 5).seenv, 0xFF, 'square should not be pre-revealed before finalize');

        await des.finalize_level();

        assert.equal(map.at(10, 5).seenv, 0xFF, 'premapped should reveal terrain visibility bits');
        assert.equal(map.at(10, 5).waslit, true, 'premapped should mark terrain as lit/known');
        assert.equal(map.trapAt(10, 5)?.tseen, 1, 'premapped should reveal trap visibility');
    });

    it('des.trap accepts packed SP_COORD coords in table form', async () => {
        resetLevelState();
        des.level_init({ style: 'solidfill', fg: '.' });
        const packed = (12 << 8) | 7;
        await des.trap({ type: 'pit', coord: packed });
        const map = getLevelState().map;
        assert.ok(map.trapAt(12, 7), 'packed coordinate trap should be placed at decoded x/y');
    });
});
