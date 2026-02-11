/**
 * Terrain and Map Accuracy Tests
 *
 * Verify that terrain types, symbols, and rendering match C NetHack exactly.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
  CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, DBWALL,
  SDOOR, SCORR, DOOR, CORR, ROOM, STAIRS,
  FOUNTAIN, THRONE, SINK, GRAVE, ALTAR,
  POOL, MOAT, LAVAPOOL, DRAWBRIDGE_UP,
  IS_WALL, IS_DOOR, IS_ROCK, ACCESSIBLE,
  COLNO, ROWNO
} from '../../js/config.js';

describe('Terrain Accuracy', () => {
  describe('Terrain Type Constants', () => {
    it('should have correct values matching C NetHack', () => {
      // C ref: rm.h terrain type values
      assert.strictEqual(STONE, 0, 'STONE should be 0');
      assert.strictEqual(VWALL, 1, 'VWALL should be 1');
      assert.strictEqual(HWALL, 2, 'HWALL should be 2');
      assert.strictEqual(ROOM, 25, 'ROOM should be 25');
      assert.strictEqual(CORR, 24, 'CORR should be 24');
      assert.strictEqual(DOOR, 23, 'DOOR should be 23');
    });

    it('wall corners should be sequential', () => {
      // C ref: rm.h - corners are TLCORNER(3) through BRCORNER(6)
      assert.strictEqual(TLCORNER, 3, 'TLCORNER should be 3');
      assert.strictEqual(TRCORNER, 4, 'TRCORNER should be 4');
      assert.strictEqual(BLCORNER, 5, 'BLCORNER should be 5');
      assert.strictEqual(BRCORNER, 6, 'BRCORNER should be 6');
    });

    it('T-walls should be sequential', () => {
      // C ref: rm.h - T-junctions are TUWALL through TRWALL
      assert.strictEqual(TUWALL, 8, 'TUWALL should be 8');
      assert.strictEqual(TDWALL, 9, 'TDWALL should be 9');
      assert.strictEqual(TLWALL, 10, 'TLWALL should be 10');
      assert.strictEqual(TRWALL, 11, 'TRWALL should be 11');
    });

    it('special terrain should have correct values', () => {
      assert.strictEqual(SDOOR, 14, 'SDOOR should be 14');
      assert.strictEqual(SCORR, 15, 'SCORR should be 15');
      assert.strictEqual(STAIRS, 26, 'STAIRS should be 26');
      assert.strictEqual(FOUNTAIN, 28, 'FOUNTAIN should be 28');
      assert.strictEqual(ALTAR, 32, 'ALTAR should be 32');
    });
  });

  describe('Terrain Classification Macros', () => {
    it('IS_WALL should correctly identify walls', () => {
      // C ref: rm.h IS_WALL(typ) macro
      assert(IS_WALL(VWALL), 'VWALL should be a wall');
      assert(IS_WALL(HWALL), 'HWALL should be a wall');
      assert(IS_WALL(TLCORNER), 'TLCORNER should be a wall');
      assert(IS_WALL(CROSSWALL), 'CROSSWALL should be a wall');
      assert(IS_WALL(TUWALL), 'TUWALL should be a wall');

      assert(!IS_WALL(ROOM), 'ROOM should not be a wall');
      assert(!IS_WALL(CORR), 'CORR should not be a wall');
      assert(!IS_WALL(DOOR), 'DOOR should not be a wall');
    });

    it('IS_DOOR should correctly identify doors', () => {
      // C ref: rm.h IS_DOOR(typ) macro
      assert(IS_DOOR(DOOR), 'DOOR should be a door');
      assert(!IS_DOOR(VWALL), 'VWALL should not be a door');
      assert(!IS_DOOR(ROOM), 'ROOM should not be a door');
    });

    it('IS_ROCK should correctly identify rock', () => {
      // C ref: rm.h IS_ROCK(typ) macro
      assert(IS_ROCK(STONE), 'STONE should be rock');
      assert(IS_ROCK(SCORR), 'SCORR should be rock');

      assert(!IS_ROCK(ROOM), 'ROOM should not be rock');
      assert(!IS_ROCK(CORR), 'CORR should not be rock');
    });

    it('ACCESSIBLE should correctly identify walkable terrain', () => {
      // C ref: rm.h ACCESSIBLE(typ) macro
      assert(ACCESSIBLE(ROOM), 'ROOM should be accessible');
      assert(ACCESSIBLE(CORR), 'CORR should be accessible');
      assert(ACCESSIBLE(DOOR), 'DOOR should be accessible');

      assert(!ACCESSIBLE(STONE), 'STONE should not be accessible');
      assert(!ACCESSIBLE(VWALL), 'VWALL should not be accessible');
      assert(!ACCESSIBLE(POOL), 'POOL should not be accessible (normally)');
    });
  });

  describe('Map Dimensions', () => {
    it('should match C NetHack map size', () => {
      // C ref: config.h COLNO=80, ROWNO=21
      assert.strictEqual(COLNO, 80, 'Map should be 80 columns wide');
      assert.strictEqual(ROWNO, 21, 'Map should be 21 rows tall');
    });
  });

  describe('Secret Doors and Corridors', () => {
    it('SDOOR should be distinct from DOOR', () => {
      assert.notStrictEqual(SDOOR, DOOR,
        'Secret doors and regular doors should have different type values');
    });

    it('SCORR should be distinct from CORR', () => {
      assert.notStrictEqual(SCORR, CORR,
        'Secret corridors and regular corridors should have different type values');
    });

    it('SDOOR should be classified as rock (hidden)', () => {
      // C ref: Secret doors appear as walls until discovered
      assert(IS_ROCK(SDOOR), 'SDOOR should be classified as rock (hidden)');
    });

    it('SCORR should be classified as rock (hidden)', () => {
      assert(IS_ROCK(SCORR), 'SCORR should be classified as rock (hidden)');
    });
  });

  describe('Water and Lava', () => {
    it('should have different types for water features', () => {
      assert.notStrictEqual(POOL, MOAT, 'POOL and MOAT should be different');
    });

    it('should have lava pool type', () => {
      assert(typeof LAVAPOOL === 'number', 'LAVAPOOL should be defined');
      assert(LAVAPOOL >= 0, 'LAVAPOOL should be a valid type');
    });
  });

  describe('Dungeon Features', () => {
    it('should have all furniture types', () => {
      assert(typeof FOUNTAIN === 'number', 'FOUNTAIN should be defined');
      assert(typeof THRONE === 'number', 'THRONE should be defined');
      assert(typeof SINK === 'number', 'SINK should be defined');
      assert(typeof GRAVE === 'number', 'GRAVE should be defined');
      assert(typeof ALTAR === 'number', 'ALTAR should be defined');
    });

    it('furniture should not be walls', () => {
      assert(!IS_WALL(FOUNTAIN), 'FOUNTAIN should not be a wall');
      assert(!IS_WALL(THRONE), 'THRONE should not be a wall');
      assert(!IS_WALL(ALTAR), 'ALTAR should not be a wall');
    });

    it('furniture should be accessible', () => {
      assert(ACCESSIBLE(FOUNTAIN), 'FOUNTAIN should be accessible');
      assert(ACCESSIBLE(THRONE), 'THRONE should be accessible');
      assert(ACCESSIBLE(SINK), 'SINK should be accessible');
      assert(ACCESSIBLE(ALTAR), 'ALTAR should be accessible');
    });
  });

  describe('Drawbridge', () => {
    it('should have drawbridge type', () => {
      assert(typeof DRAWBRIDGE_UP === 'number', 'DRAWBRIDGE_UP should be defined');
    });

    it('raised drawbridge should not be accessible', () => {
      // C ref: Raised drawbridges block movement
      assert(!ACCESSIBLE(DRAWBRIDGE_UP),
        'Raised drawbridge should not be accessible');
    });
  });

  describe('Terrain Type Ranges', () => {
    it('all terrain types should be in valid range', () => {
      const terrainTypes = [
        STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
        CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
        SDOOR, SCORR, DOOR, CORR, ROOM, STAIRS,
        FOUNTAIN, THRONE, SINK, ALTAR
      ];

      for (const typ of terrainTypes) {
        assert(typ >= 0 && typ < 100,
          `Terrain type ${typ} should be in range [0, 100)`);
      }
    });
  });

  describe('Wall Type Completeness', () => {
    it('should have all standard wall types', () => {
      // C ref: NetHack has walls for all directions and combinations
      // Note: IS_WALL covers VWALL(1) through TRWALL(11), not DBWALL(12)
      const wallTypes = [
        VWALL,      // Vertical
        HWALL,      // Horizontal
        TLCORNER,   // Top-left corner
        TRCORNER,   // Top-right corner
        BLCORNER,   // Bottom-left corner
        BRCORNER,   // Bottom-right corner
        TUWALL,     // T pointing up
        TDWALL,     // T pointing down
        TLWALL,     // T pointing left
        TRWALL,     // T pointing right
        CROSSWALL   // Four-way cross
      ];

      for (const wall of wallTypes) {
        assert(typeof wall === 'number', `Wall type should be defined`);
        assert(IS_WALL(wall), `Type ${wall} should be identified as wall by IS_WALL`);
      }
    });

    it('DBWALL should be defined but not in IS_WALL range', () => {
      // C ref: DBWALL(12) is a special wall type handled separately
      assert.strictEqual(DBWALL, 12, 'DBWALL should be 12');
      assert(!IS_WALL(DBWALL), 'DBWALL should not be in IS_WALL range (uses IS_STWALL)');
    });
  });
});
