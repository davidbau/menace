import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { GameMap } from '../../js/map.js';
import { WATER, AIR, STONE, FOUNTAIN, MAGIC_PORTAL, LAVAPOOL, COLNO, ROWNO } from '../../js/config.js';
import { vision_init, vision_reset } from '../../js/vision.js';
import {
    setup_waterlevel,
    save_waterlevel,
    restore_waterlevel,
    unsetup_waterlevel,
    set_wportal,
    fumaroles,
    movebubbles,
    mv_bubble,
    mk_bubble,
    maybe_adjust_hero_bubble,
    water_friction,
    makemaz,
    fixup_special,
    check_ransacked,
    mark_ransacked,
} from '../../js/mkmaze.js';

describe('mkmaze waterlevel state helpers', () => {
    beforeEach(() => {
        initRng(12345);
    });

    it('setup_waterlevel seeds deterministic scaffold and converts terrain', async () => {
        const map = new GameMap();
        map.flags.hero_memory = true;
        assert.equal(map.at(40, 10).typ, STONE);

        await setup_waterlevel(map, { isWaterLevel: true });
        assert.equal(map.flags.hero_memory, false);
        assert.equal(map.at(40, 10).typ, WATER);
        assert.ok(map._waterLevelSetup);
        assert.equal(map._waterLevelSetup.isWaterLevel, true);
        assert.ok(map._waterLevelSetup.bubbles.length > 0);

        const map2 = new GameMap();
        map2.flags.hero_memory = true;
        await setup_waterlevel(map2, { isWaterLevel: false });
        assert.equal(map2.at(40, 10).typ, AIR);
    });

    it('save/restore round-trips water state and hero_memory', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        set_wportal(map, 10, 10, { dnum: 1, dlevel: 2 });
        await fumaroles(map, [{ x: 11, y: 10 }]);

        const saved = save_waterlevel(map);
        assert.ok(saved && saved.water && saved.waterLevelSetup);

        map.flags.hero_memory = true;
        map._water = null;
        map._waterLevelSetup = null;
        const ok = await restore_waterlevel(map, saved);
        assert.equal(ok, true);
        assert.equal(map.flags.hero_memory, false);
        assert.equal(map._water.portal.x, 10);
        assert.equal(map._water.fumaroles.length, 1);
        assert.equal(map._waterLevelSetup.isWaterLevel, true);
    });

    it('unsetup_waterlevel deactivates and clears runtime movers', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        set_wportal(map, 10, 10, null);
        await fumaroles(map, [{ x: 11, y: 10 }]);
        map._water.heroPos = { x: 10, y: 10, dx: 0, dy: 0 };
        map._water.onHeroMoved = () => {};
        map._water.onVisionRecalc = () => {};

        unsetup_waterlevel(map);
        assert.equal(map._water.active, false);
        assert.equal(map._water.bubbles.length, 0);
        assert.equal(map._water.portal, null);
        assert.equal(map._water.fumaroles.length, 0);
        assert.equal(map._water.heroPos, null);
        assert.equal(map._water.onHeroMoved, null);
        assert.equal(map._water.onVisionRecalc, null);
    });

    it('movebubbles shifts fumaroles in deterministic move mode', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        await fumaroles(map, [{ x: 11, y: 10 }]);
        await movebubbles(map, 1, -1);

        assert.equal(map._water.fumaroles[0].x, 12);
        assert.equal(map._water.fumaroles[0].y, 9);
    });

    it('fumaroles C-mode spawns gas clouds from lava squares', async () => {
        const map = new GameMap();
        for (let x = 3; x < COLNO - 1; x++) {
            for (let y = 3; y < ROWNO - 1; y++) {
                map.at(x, y).typ = LAVAPOOL;
            }
        }
        map.flags.is_firelevel = true;
        map.flags.temperature = 1;
        vision_init();
        vision_reset(map);

        const created = await fumaroles(map, {
            player: { x: 40, y: 10, Deaf: true },
            game: { in_mklev: true },
        });

        assert.equal(Number.isInteger(created), true);
        assert.ok(created >= 0);
        assert.equal(Array.isArray(map.regions), true);
        assert.ok(map.regions.length >= created);
    });

    it('mv_bubble allows 1x1 bubble to occupy xmax', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        const bubble = { x: map._water.xmax - 1, y: 10, n: 1, dx: 0, dy: 0 };
        await mv_bubble(map, bubble, 1, 0);
        assert.equal(bubble.x, map._water.xmax);
    });

    it('movebubbles carries bubble contents for water levels', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        const bubble = await mk_bubble(map, 10, 10, 0);
        assert.ok(bubble);

        const obj = { otyp: 1, ox: 10, oy: 10, quan: 1 };
        map.objects.push(obj);
        const mon = { mx: 10, my: 10, mhp: 5 };
        map.monsters.push(mon);
        const portal = { tx: 10, ty: 10, ttyp: MAGIC_PORTAL, dst: { dnum: 1, dlevel: 2 } };
        map.traps.push(portal);

        await movebubbles(map, 1, 0);

        assert.equal(obj.ox, 11);
        assert.equal(obj.oy, 10);
        assert.equal(mon.mx, 11);
        assert.equal(mon.my, 10);
        assert.equal(portal.tx, 11);
        assert.equal(portal.ty, 10);
        assert.equal(map._water.portal.x, 11);
    });

    it('movebubbles carries hero via water callback', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        const bubble = await mk_bubble(map, 20, 10, 0);
        assert.ok(bubble);

        const hero = { x: 20, y: 10 };
        map._water.heroPos = { x: hero.x, y: hero.y, dx: 1, dy: 0 };
        map._water.onHeroMoved = (x, y) => {
            hero.x = x;
            hero.y = y;
        };

        await movebubbles(map, 1, 0);
        assert.equal(hero.x, 21);
        assert.equal(hero.y, 10);
    });

    it('movebubbles invokes vision recalc callback when provided', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        await mk_bubble(map, 25, 10, 0);
        let called = 0;
        map._water.onVisionRecalc = () => { called++; };

        await movebubbles(map, 1, 0);
        assert.equal(called, 1);
    });

    it('movebubbles displaces monster occupying hero bubble destination', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        const bubble = await mk_bubble(map, 40, 10, 0);
        assert.ok(bubble);

        const hero = { x: 40, y: 10 };
        const mon = { mx: 41, my: 10, mhp: 5 };
        map.monsters.push(mon);
        map._water.heroPos = { x: hero.x, y: hero.y, dx: 1, dy: 0 };
        map._water.onHeroMoved = (x, y) => {
            hero.x = x;
            hero.y = y;
        };

        await movebubbles(map, 1, 0);
        assert.equal(hero.x, 41);
        assert.equal(hero.y, 10);
        assert.equal(mon.mx === 41 && mon.my === 10, false);
    });

    it('maybe_adjust_hero_bubble steers bubble heading', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        const bubble = await mk_bubble(map, 30, 12, 0);
        assert.ok(bubble);
        bubble.dx = 0;
        bubble.dy = 0;

        let changed = false;
        for (let i = 0; i < 20; i++) {
            if (maybe_adjust_hero_bubble(map, { x: 30, y: 12, dx: -1, dy: 1 })) {
                changed = true;
                break;
            }
        }
        assert.equal(changed, true);
        assert.equal(bubble.dx, -1);
        assert.equal(bubble.dy, 1);
    });

    it('water_friction applies C-style directional drift', async () => {
        const map = new GameMap();
        await setup_waterlevel(map, { isWaterLevel: true });
        const player = { x: 20, y: 10, dx: 1, dy: 0, swimming: false };
        let changed = false;
        for (let i = 0; i < 32; i++) {
            const beforeDx = player.dx;
            const beforeDy = player.dy;
            await water_friction(map, player);
            if (player.dx !== beforeDx || player.dy !== beforeDy) {
                changed = true;
                break;
            }
            player.dx = 1;
            player.dy = 0;
        }
        assert.equal(changed, true);
    });

    it('fixup_special applies castle/minetown flag side effects', async () => {
        const castle = new GameMap();
        await fixup_special(castle, { specialName: 'castle' });
        assert.equal(castle.flags.graveyard, true);

        const minetown = new GameMap();
        await fixup_special(minetown, { specialName: 'minetn-1' });
        assert.equal(minetown.flags.has_town, true);
    });

    it('check_ransacked supports lookup by room name', () => {
        const map = new GameMap();
        map.rooms = [{ name: 'Armory', ransacked: false }];
        mark_ransacked(map, 0);
        assert.equal(check_ransacked(map, 'armory'), true);
    });

    it('makemaz loads protofile special levels when provided', async () => {
        const map = new GameMap();
        await makemaz(map, 'oracle', null, null, 5);
        assert.equal(map.flags.is_maze_lev, false);
        let fountains = 0;
        for (let x = 0; x < map.locations.length; x++) {
            for (let y = 0; y < map.locations[x].length; y++) {
                if (map.locations[x][y].typ === FOUNTAIN) fountains++;
            }
        }
        assert.ok(fountains >= 2);
    });
});
