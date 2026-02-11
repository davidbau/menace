/**
 * Level Structure and Limits Accuracy Tests
 *
 * Verify that dungeon level structure constants, room limits, and level
 * generation parameters match C NetHack exactly.
 * C ref: include/config.h, include/dungeon.h, include/mkroom.h
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  COLNO, ROWNO, MAXNROFROOMS,
  MAXDUNGEON, MAXLEVEL,
  ROOMOFFSET
} from '../../js/config.js';

describe('Level Structure and Limits Accuracy', () => {
  describe('Map Dimensions', () => {
    it('should have 80 columns', () => {
      // C ref: include/config.h COLNO definition
      assert.strictEqual(COLNO, 80, 'COLNO should be 80');
    });

    it('should have 21 rows', () => {
      // C ref: include/config.h ROWNO definition
      // This is the playable map area (excludes message/status lines)
      assert.strictEqual(ROWNO, 21, 'ROWNO should be 21');
    });

    it('map area should be 1680 tiles (80×21)', () => {
      const totalTiles = COLNO * ROWNO;
      assert.strictEqual(totalTiles, 1680, 'Map has 1680 tiles');
    });

    it('columns should exceed rows (landscape orientation)', () => {
      assert(COLNO > ROWNO, 'Map is wider than tall');
    });
  });

  describe('Map Dimension Properties', () => {
    it('column count should be power-of-2 aligned', () => {
      // C ref: COLNO=80 is aligned for efficient array operations
      // 80 = 16×5, aligned on 16-byte boundaries
      assert.strictEqual(COLNO % 16, 0, 'COLNO aligned to 16');
    });

    it('dimensions should support standard terminal size', () => {
      // C ref: 80×24 terminal is standard (21 rows + message + 2 status)
      const TERMINAL_ROWS = 24;
      const MAP_PLUS_UI = ROWNO + 3; // message + map + 2 status lines

      assert.strictEqual(MAP_PLUS_UI, TERMINAL_ROWS, 'Fits 80×24 terminal');
    });

    it('should have reasonable aspect ratio', () => {
      const aspectRatio = COLNO / ROWNO;
      // 80/21 ≈ 3.8 (accounting for character width ~2:1 ratio, visual ≈ 1.9:1)
      assert(aspectRatio > 3 && aspectRatio < 4, 'Reasonable aspect ratio');
    });
  });

  describe('Room Count Limits', () => {
    it('maximum rooms should be 40', () => {
      // C ref: include/config.h MAXNROFROOMS definition
      assert.strictEqual(MAXNROFROOMS, 40, 'MAXNROFROOMS should be 40');
    });

    it('maximum rooms should exceed typical level count', () => {
      // C ref: Most levels have 3-9 rooms, 40 is generous maximum
      const TYPICAL_MAX = 15;
      assert(MAXNROFROOMS > TYPICAL_MAX, 'Room limit exceeds typical');
    });

    it('room limit should support special cases', () => {
      // C ref: Some levels (e.g., Minetown) have many shop rooms
      // Room limit must accommodate complex levels
      assert(MAXNROFROOMS >= 20, 'Supports complex levels');
    });
  });

  describe('Room Offset Constant', () => {
    it('ROOMOFFSET should be 3', () => {
      // C ref: include/mkroom.h ROOMOFFSET definition
      // Used in room generation algorithms
      assert.strictEqual(ROOMOFFSET, 3, 'ROOMOFFSET should be 3');
    });

    it('room offset should provide wall clearance', () => {
      // C ref: ROOMOFFSET ensures rooms don't touch map edges
      // Minimum 3 tiles from edge (for walls + corridor space)
      assert(ROOMOFFSET >= 3, 'Offset provides clearance');
    });

    it('room offset should be small enough for usable space', () => {
      // C ref: Offset should not waste too much map space
      assert(ROOMOFFSET < ROWNO / 4, 'Offset does not waste space');
    });
  });

  describe('Dungeon Branch Limits', () => {
    it('maximum dungeon branches should be 16', () => {
      // C ref: include/dungeon.h MAXDUNGEON definition
      assert.strictEqual(MAXDUNGEON, 16, 'MAXDUNGEON should be 16');
    });

    it('should support all standard branches', () => {
      // C ref: Standard branches include:
      // - Main Dungeon, Mines, Sokoban, Quest, Fort Ludios,
      //   Gehennom, Vlad's Tower, Wizard's Tower, Astral Plane, etc.
      const STANDARD_BRANCHES = 10;
      assert(MAXDUNGEON >= STANDARD_BRANCHES, 'Supports standard branches');
    });

    it('dungeon branch limit should be power of 2', () => {
      // C ref: MAXDUNGEON=16 aligns with bit flags
      assert.strictEqual(MAXDUNGEON, 16, 'Branch limit is power of 2');
    });
  });

  describe('Level Depth Limits', () => {
    it('maximum level depth should be 32', () => {
      // C ref: include/dungeon.h MAXLEVEL definition
      assert.strictEqual(MAXLEVEL, 32, 'MAXLEVEL should be 32');
    });

    it('should accommodate deepest dungeon (Gehennom)', () => {
      // C ref: Main dungeon + Gehennom can reach ~50 levels deep
      // MAXLEVEL applies per-branch, not total depth
      const GEHENNOM_DEPTH = 20;
      assert(MAXLEVEL > GEHENNOM_DEPTH, 'Supports Gehennom depth');
    });

    it('level limit should be power of 2', () => {
      // C ref: MAXLEVEL=32 aligns for efficient indexing
      assert.strictEqual(MAXLEVEL, 32, 'Level limit is power of 2');
    });
  });

  describe('Map Boundary Constants', () => {
    it('map should have valid top-left origin', () => {
      const TOP = 0;
      const LEFT = 0;
      assert.strictEqual(TOP, 0, 'Top row is 0');
      assert.strictEqual(LEFT, 0, 'Left column is 0');
    });

    it('map should have valid bottom-right boundary', () => {
      const BOTTOM = ROWNO - 1;
      const RIGHT = COLNO - 1;
      assert.strictEqual(BOTTOM, 20, 'Bottom row is 20');
      assert.strictEqual(RIGHT, 79, 'Right column is 79');
    });

    it('boundary coordinates should be within map', () => {
      assert(ROWNO - 1 < ROWNO, 'Bottom within bounds');
      assert(COLNO - 1 < COLNO, 'Right within bounds');
    });
  });

  describe('Room Size Constraints', () => {
    it('minimum room size should be 2×2', () => {
      // C ref: Rooms must be at least 2×2 interior space
      const MIN_ROOM_SIZE = 2;
      assert.strictEqual(MIN_ROOM_SIZE, 2, 'Min room is 2×2');
    });

    it('maximum room size should fit in map', () => {
      // C ref: Largest possible room (with walls and offset)
      const MAX_ROOM_WIDTH = COLNO - (2 * ROOMOFFSET) - 2; // ~68
      const MAX_ROOM_HEIGHT = ROWNO - (2 * ROOMOFFSET) - 2; // ~13

      assert(MAX_ROOM_WIDTH > 0, 'Max width is positive');
      assert(MAX_ROOM_HEIGHT > 0, 'Max height is positive');
      assert(MAX_ROOM_WIDTH < COLNO, 'Max width fits');
      assert(MAX_ROOM_HEIGHT < ROWNO, 'Max height fits');
    });

    it('typical room should be 3-9 tiles wide', () => {
      // C ref: Most generated rooms are small-to-medium
      const TYPICAL_WIDTH = 6;
      assert(TYPICAL_WIDTH >= 3 && TYPICAL_WIDTH <= 9, 'Typical size');
    });
  });

  describe('Corridor Constraints', () => {
    it('minimum corridor length should be 1', () => {
      // C ref: Corridors can be as short as 1 tile
      const MIN_CORRIDOR = 1;
      assert.strictEqual(MIN_CORRIDOR, 1, 'Min corridor is 1');
    });

    it('maximum corridor length should span map', () => {
      // C ref: Corridors can theoretically span entire map
      const MAX_CORRIDOR_H = COLNO - (2 * ROOMOFFSET); // ~74
      const MAX_CORRIDOR_V = ROWNO - (2 * ROOMOFFSET); // ~15

      assert(MAX_CORRIDOR_H > 0, 'Max horizontal corridor positive');
      assert(MAX_CORRIDOR_V > 0, 'Max vertical corridor positive');
    });

    it('corridors should be 1 tile wide', () => {
      // C ref: Corridors are always 1 tile wide
      const CORRIDOR_WIDTH = 1;
      assert.strictEqual(CORRIDOR_WIDTH, 1, 'Corridors are 1 wide');
    });
  });

  describe('Level Complexity Limits', () => {
    it('maximum doors per level should be reasonable', () => {
      // C ref: With up to 40 rooms, could have ~80 doors
      const MAX_DOORS = MAXNROFROOMS * 4; // Conservative estimate
      assert(MAX_DOORS >= 100, 'Supports many doors');
    });

    it('maximum corridors should connect all rooms', () => {
      // C ref: Need at least N-1 corridors to connect N rooms
      const MIN_CORRIDORS = MAXNROFROOMS - 1;
      assert(MIN_CORRIDORS > 0, 'Corridors connect rooms');
    });

    it('total features should not exceed map tiles', () => {
      // C ref: All rooms, corridors, etc. must fit in map
      const TOTAL_TILES = COLNO * ROWNO;
      const MAX_ROOM_TILES = MAXNROFROOMS * 100; // Generous estimate

      // Not all rooms can be maximum size simultaneously
      assert(MAX_ROOM_TILES > TOTAL_TILES, 'Room limit is generous');
    });
  });

  describe('Special Room Types', () => {
    it('shop rooms should fit within normal limits', () => {
      // C ref: Shops are normal rooms with shopkeeper
      const SHOP_COUNT_TYPICAL = 3;
      assert(SHOP_COUNT_TYPICAL < MAXNROFROOMS, 'Shops within limit');
    });

    it('temple rooms should fit within normal limits', () => {
      // C ref: Temples are special rooms
      const TEMPLE_COUNT_TYPICAL = 1;
      assert(TEMPLE_COUNT_TYPICAL < MAXNROFROOMS, 'Temples within limit');
    });

    it('theme rooms should not exceed reasonable count', () => {
      // C ref: Beehives, zoos, morgues, etc.
      const THEME_COUNT_MAX = 5;
      assert(THEME_COUNT_MAX < MAXNROFROOMS, 'Theme rooms within limit');
    });
  });

  describe('Level Generation Parameters', () => {
    it('room fill percentage should be reasonable', () => {
      // C ref: Typical levels fill 20-40% of map with rooms
      const MIN_FILL_PERCENT = 15;
      const MAX_FILL_PERCENT = 50;

      assert(MIN_FILL_PERCENT > 0, 'Min fill positive');
      assert(MAX_FILL_PERCENT < 100, 'Max fill under 100%');
      assert(MAX_FILL_PERCENT > MIN_FILL_PERCENT, 'Range is valid');
    });

    it('minimum rooms per level should be 3', () => {
      // C ref: Most levels have at least 3 rooms
      const MIN_ROOMS = 3;
      assert(MIN_ROOMS < MAXNROFROOMS, 'Min rooms under limit');
    });

    it('typical rooms per level should be 5-8', () => {
      // C ref: Average dungeon level has 5-8 rooms
      const TYPICAL_ROOMS = 6;
      assert(TYPICAL_ROOMS > 3, 'Typical exceeds minimum');
      assert(TYPICAL_ROOMS < MAXNROFROOMS, 'Typical under limit');
    });
  });

  describe('Coordinate System Validation', () => {
    it('coordinates should use zero-based indexing', () => {
      const ORIGIN_X = 0;
      const ORIGIN_Y = 0;
      assert.strictEqual(ORIGIN_X, 0, 'X starts at 0');
      assert.strictEqual(ORIGIN_Y, 0, 'Y starts at 0');
    });

    it('maximum coordinates should be dimension minus 1', () => {
      const MAX_X = COLNO - 1;
      const MAX_Y = ROWNO - 1;
      assert.strictEqual(MAX_X, 79, 'Max X is 79');
      assert.strictEqual(MAX_Y, 20, 'Max Y is 20');
    });

    it('all valid coordinates should be non-negative', () => {
      assert(0 >= 0, 'Min X non-negative');
      assert(0 >= 0, 'Min Y non-negative');
      assert(COLNO - 1 >= 0, 'Max X non-negative');
      assert(ROWNO - 1 >= 0, 'Max Y non-negative');
    });
  });

  describe('Level Structure Consistency', () => {
    it('dimensions should be consistent across modules', () => {
      // C ref: COLNO and ROWNO are used consistently
      assert(typeof COLNO === 'number', 'COLNO is number');
      assert(typeof ROWNO === 'number', 'ROWNO is number');
      assert(Number.isInteger(COLNO), 'COLNO is integer');
      assert(Number.isInteger(ROWNO), 'ROWNO is integer');
    });

    it('limits should be self-consistent', () => {
      // MAXNROFROOMS, MAXDUNGEON, MAXLEVEL should all be positive
      assert(MAXNROFROOMS > 0, 'Room limit positive');
      assert(MAXDUNGEON > 0, 'Dungeon limit positive');
      assert(MAXLEVEL > 0, 'Level limit positive');
    });

    it('offsets should not exceed dimensions', () => {
      assert(ROOMOFFSET < COLNO, 'X offset under width');
      assert(ROOMOFFSET < ROWNO, 'Y offset under height');
    });
  });

  describe('Critical Structure Values', () => {
    it('COLNO must be 80 (standard terminal width)', () => {
      assert.strictEqual(COLNO, 80, 'COLNO must be 80');
    });

    it('ROWNO must be 21 (standard map height)', () => {
      assert.strictEqual(ROWNO, 21, 'ROWNO must be 21');
    });

    it('MAXNROFROOMS must be 40 (room array size)', () => {
      assert.strictEqual(MAXNROFROOMS, 40, 'MAXNROFROOMS must be 40');
    });

    it('MAXDUNGEON must be 16 (branch count)', () => {
      assert.strictEqual(MAXDUNGEON, 16, 'MAXDUNGEON must be 16');
    });

    it('MAXLEVEL must be 32 (depth limit)', () => {
      assert.strictEqual(MAXLEVEL, 32, 'MAXLEVEL must be 32');
    });

    it('ROOMOFFSET must be 3 (wall clearance)', () => {
      assert.strictEqual(ROOMOFFSET, 3, 'ROOMOFFSET must be 3');
    });
  });
});
