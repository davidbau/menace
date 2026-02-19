// were.test.js — Unit tests for were.js exported functions
// Tests: counter_were, were_beastie, were_summon

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import {
    counter_were,
    were_beastie,
    were_summon,
} from '../../js/were.js';
import {
    mons,
    PM_WERERAT, PM_WEREJACKAL, PM_WEREWOLF,
    PM_HUMAN_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF,
    PM_SEWER_RAT, PM_GIANT_RAT, PM_RABID_RAT,
    PM_JACKAL, PM_FOX, PM_COYOTE,
    PM_WOLF, PM_WARG, PM_WINTER_WOLF, PM_WINTER_WOLF_CUB,
    PM_LITTLE_DOG,
} from '../../js/monsters.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';

// ========================================================================
// counter_were
// ========================================================================

describe('counter_were', () => {
    it('werewolf <-> human werewolf', () => {
        assert.equal(counter_were(PM_WEREWOLF), PM_HUMAN_WEREWOLF);
        assert.equal(counter_were(PM_HUMAN_WEREWOLF), PM_WEREWOLF);
    });

    it('wererat <-> human wererat', () => {
        assert.equal(counter_were(PM_WERERAT), PM_HUMAN_WERERAT);
        assert.equal(counter_were(PM_HUMAN_WERERAT), PM_WERERAT);
    });

    it('werejackal <-> human werejackal', () => {
        assert.equal(counter_were(PM_WEREJACKAL), PM_HUMAN_WEREJACKAL);
        assert.equal(counter_were(PM_HUMAN_WEREJACKAL), PM_WEREJACKAL);
    });

    it('returns null for non-lycanthrope', () => {
        assert.equal(counter_were(PM_LITTLE_DOG), null);
    });
});

// ========================================================================
// were_beastie
// ========================================================================

describe('were_beastie', () => {
    it('wererat and its variants map to PM_WERERAT', () => {
        assert.equal(were_beastie(PM_WERERAT), PM_WERERAT);
        assert.equal(were_beastie(PM_SEWER_RAT), PM_WERERAT);
        assert.equal(were_beastie(PM_GIANT_RAT), PM_WERERAT);
        assert.equal(were_beastie(PM_RABID_RAT), PM_WERERAT);
    });

    it('werejackal and its variants map to PM_WEREJACKAL', () => {
        assert.equal(were_beastie(PM_WEREJACKAL), PM_WEREJACKAL);
        assert.equal(were_beastie(PM_JACKAL), PM_WEREJACKAL);
        assert.equal(were_beastie(PM_FOX), PM_WEREJACKAL);
        assert.equal(were_beastie(PM_COYOTE), PM_WEREJACKAL);
    });

    it('werewolf and its variants map to PM_WEREWOLF', () => {
        assert.equal(were_beastie(PM_WEREWOLF), PM_WEREWOLF);
        assert.equal(were_beastie(PM_WOLF), PM_WEREWOLF);
        assert.equal(were_beastie(PM_WARG), PM_WEREWOLF);
        assert.equal(were_beastie(PM_WINTER_WOLF), PM_WEREWOLF);
        assert.equal(were_beastie(PM_WINTER_WOLF_CUB), PM_WEREWOLF);
    });

    it('returns null for unrelated monster', () => {
        assert.equal(were_beastie(PM_LITTLE_DOG), null);
    });
});

// ========================================================================
// were_summon
// ========================================================================

describe('were_summon', () => {
    it('returns zero total for non-lycanthrope ptr (default case in switch)', () => {
        initRng(42);
        // little_dog is not a lycanthrope — switch hits default every iteration
        const ptr = mons[PM_LITTLE_DOG];
        const { total, visible, genbuf } = were_summon(ptr, 5, 5, false, null, null, 1);
        assert.equal(total, 0);
        assert.equal(visible, 0);
        assert.equal(genbuf, null);
    });

    it('returns zero total when protection_from_shape_changers and !yours', () => {
        initRng(42);
        const ptr = mons[PM_WEREWOLF];
        const ctx = { player: { protectionFromShapeChangers: true } };
        const { total, genbuf } = were_summon(ptr, 5, 5, false, ctx, null, 1);
        assert.equal(total, 0);
        assert.equal(genbuf, null);
    });

    it('proceeds past protection check when yours=true', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const ptr = mons[PM_WEREWOLF];
        const ctx = { player: { protectionFromShapeChangers: true } };
        // even with protection, yours=true should proceed
        const { genbuf } = were_summon(ptr, cx, cy, true, ctx, map, 1);
        assert.equal(genbuf, 'wolf');
    });

    it('sets genbuf to "wolf" for werewolf', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const { genbuf } = were_summon(mons[PM_WEREWOLF], cx, cy, false, null, map, 1);
        assert.equal(genbuf, 'wolf');
    });

    it('sets genbuf to "rat" for wererat', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const { genbuf } = were_summon(mons[PM_WERERAT], cx, cy, false, null, map, 1);
        assert.equal(genbuf, 'rat');
    });

    it('sets genbuf to "jackal" for werejackal', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const { genbuf } = were_summon(mons[PM_WEREJACKAL], cx, cy, false, null, map, 1);
        assert.equal(genbuf, 'jackal');
    });

    it('sets genbuf for human were forms too (PM_HUMAN_WEREWOLF)', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const { genbuf } = were_summon(mons[PM_HUMAN_WEREWOLF], cx, cy, false, null, map, 1);
        assert.equal(genbuf, 'wolf');
    });

    it('spawns at least one monster on a valid map', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        const { total } = were_summon(mons[PM_WEREWOLF], cx, cy, false, null, map, 1);
        assert.ok(total >= 1, `Expected at least 1 summoned wolf, got ${total}`);
    });

    it('total <= 5 (rnd(5) iterations max)', () => {
        initRng(42);
        initLevelGeneration();
        const map = makelevel(1);
        wallification(map);
        const room = map.rooms[0];
        const cx = Math.floor((room.lx + room.hx) / 2);
        const cy = Math.floor((room.ly + room.hy) / 2);
        // Run several seeds to verify upper bound
        for (let seed = 0; seed < 10; seed++) {
            initRng(seed);
            initLevelGeneration();
            const m2 = makelevel(1);
            wallification(m2);
            const r2 = m2.rooms[0];
            const x2 = Math.floor((r2.lx + r2.hx) / 2);
            const y2 = Math.floor((r2.ly + r2.hy) / 2);
            const { total } = were_summon(mons[PM_WEREWOLF], x2, y2, false, null, m2, 1);
            assert.ok(total <= 5, `Expected total <= 5, got ${total} for seed ${seed}`);
        }
    });
});
