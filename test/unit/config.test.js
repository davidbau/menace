// test/unit/config.test.js -- Tests for game constants and helper functions
// C ref: rm.h, hack.h -- verifies terrain types and utility functions

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, HWALL, VWALL, TLCORNER,
         TRCORNER, BLCORNER, BRCORNER, SDOOR,
         D_CLOSED, D_ISOPEN, D_LOCKED,
         IS_WALL, IS_DOOR, IS_ROOM, ACCESSIBLE, isok } from '../../js/config.js';

describe('Config module', () => {
    it('has correct map dimensions', () => {
        assert.equal(COLNO, 80);
        assert.equal(ROWNO, 21);
    });

    it('terrain type constants are distinct', () => {
        const types = [STONE, ROOM, CORR, DOOR, STAIRS, HWALL, VWALL,
                       TLCORNER, TRCORNER, BLCORNER, BRCORNER, SDOOR];
        const unique = new Set(types);
        assert.equal(unique.size, types.length, 'All terrain types should be unique');
    });

    it('IS_WALL identifies wall types', () => {
        assert.ok(IS_WALL(HWALL));
        assert.ok(IS_WALL(VWALL));
        assert.ok(IS_WALL(TLCORNER));
        assert.ok(IS_WALL(TRCORNER));
        assert.ok(IS_WALL(BLCORNER));
        assert.ok(IS_WALL(BRCORNER));
        assert.ok(!IS_WALL(ROOM));
        assert.ok(!IS_WALL(STONE));
        assert.ok(!IS_WALL(DOOR));
    });

    it('IS_DOOR identifies door types', () => {
        assert.ok(IS_DOOR(DOOR));
        assert.ok(!IS_DOOR(ROOM));
        assert.ok(!IS_DOOR(HWALL));
    });

    it('IS_ROOM identifies room type', () => {
        assert.ok(IS_ROOM(ROOM));
        assert.ok(!IS_ROOM(CORR));
        assert.ok(!IS_ROOM(STONE));
    });

    it('ACCESSIBLE identifies walkable terrain', () => {
        assert.ok(ACCESSIBLE(ROOM));
        assert.ok(ACCESSIBLE(CORR));
        assert.ok(ACCESSIBLE(DOOR));
        assert.ok(ACCESSIBLE(STAIRS));
        assert.ok(!ACCESSIBLE(STONE));
        assert.ok(!ACCESSIBLE(HWALL));
        assert.ok(!ACCESSIBLE(VWALL));
    });

    it('isok validates coordinate bounds', () => {
        // isok excludes the outer edge (row 0, last row, col 0, last col)
        assert.ok(isok(1, 1));
        assert.ok(isok(COLNO - 2, ROWNO - 2));
        assert.ok(isok(40, 10));
        assert.ok(!isok(-1, 0));
        assert.ok(!isok(0, -1));
        assert.ok(!isok(COLNO, 0));
        assert.ok(!isok(0, ROWNO));
        assert.ok(!isok(0, 0), 'Edge coordinates excluded');
    });

    it('door flags are distinct', () => {
        assert.notEqual(D_CLOSED, D_ISOPEN);
        assert.notEqual(D_CLOSED, D_LOCKED);
        assert.notEqual(D_ISOPEN, D_LOCKED);
    });
});
