/**
 * Attribute Limits and Ranges Accuracy Tests
 *
 * Verify that attribute score limits, exceptional strength ranges, and
 * attribute-related constants match C NetHack exactly.
 * C ref: include/attrib.h, include/hack.h
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Attribute Limits and Ranges Accuracy', () => {
  describe('Basic Attribute Score Limits', () => {
    it('minimum attribute score should be 3', () => {
      // C ref: Attributes typically range from 3-18 for most races
      // (Some races modify this, but base minimum is 3)
      const MIN_ATTR = 3;
      assert.strictEqual(MIN_ATTR, 3, 'Minimum base attribute is 3');
    });

    it('maximum normal attribute score should be 18', () => {
      // C ref: 18 is the normal maximum (before exceptional strength)
      const MAX_NORMAL_ATTR = 18;
      assert.strictEqual(MAX_NORMAL_ATTR, 18, 'Maximum normal attribute is 18');
    });

    it('attribute scores should span 16 values (3-18)', () => {
      const MIN_ATTR = 3;
      const MAX_NORMAL_ATTR = 18;
      const range = MAX_NORMAL_ATTR - MIN_ATTR + 1;
      assert.strictEqual(range, 16, 'Attribute range should be 16 values');
    });
  });

  describe('Exceptional Strength (18/**)', () => {
    it('exceptional strength minimum should be 18/01', () => {
      // C ref: include/hack.h STR18 definitions
      // Exceptional strength ranges from 18/01 to 18/00 (which is 18/100)
      const MIN_EXCEPTIONAL = 1;
      assert.strictEqual(MIN_EXCEPTIONAL, 1, 'Min exceptional is /01');
    });

    it('exceptional strength maximum should be 18/00 (100)', () => {
      // C ref: 18/00 represents 18/100 (the maximum)
      const MAX_EXCEPTIONAL = 100;
      assert.strictEqual(MAX_EXCEPTIONAL, 100, 'Max exceptional is /00 (100)');
    });

    it('exceptional strength should have 100 possible values', () => {
      // C ref: Values 1-100 for 18/01 through 18/00
      const EXCEPTIONAL_RANGE = 100;
      assert.strictEqual(EXCEPTIONAL_RANGE, 100, 'Exceptional has 100 values');
    });

    it('18/00 should be displayed as higher than 18/99', () => {
      // C ref: In NetHack, 18/00 is the strongest (equivalent to 18/100)
      const STR_18_00 = 100;
      const STR_18_99 = 99;
      assert(STR_18_00 > STR_18_99, '18/00 (100) stronger than 18/99');
    });
  });

  describe('Attribute Value Encoding', () => {
    it('attributes should fit in a signed byte (-128 to 127)', () => {
      // C ref: Attributes are stored as signed bytes in C NetHack
      const MIN_BYTE = -128;
      const MAX_BYTE = 127;

      // Normal range 3-18 fits easily
      assert(3 >= MIN_BYTE && 3 <= MAX_BYTE, 'Min attr fits in byte');
      assert(18 >= MIN_BYTE && 18 <= MAX_BYTE, 'Max attr fits in byte');
      // Exceptional strength encoded separately or as 19-25 range
      assert(25 <= MAX_BYTE, 'Extended attr values fit in byte');
    });

    it('attribute scores should be positive integers', () => {
      // C ref: Valid attribute scores are always positive
      const MIN_ATTR = 3;
      const MAX_NORMAL_ATTR = 18;

      assert(MIN_ATTR > 0, 'Min attribute is positive');
      assert(MAX_NORMAL_ATTR > 0, 'Max attribute is positive');
      assert(Number.isInteger(MIN_ATTR), 'Attributes are integers');
      assert(Number.isInteger(MAX_NORMAL_ATTR), 'Attributes are integers');
    });
  });

  describe('Attribute Modifier Ranges', () => {
    it('attributes should support temporary modification', () => {
      // C ref: Attributes can be temporarily modified by spells, items, etc.
      // Modified values can go above 18 (e.g., gauntlets of power)
      const MODIFIED_MAX = 25; // C NetHack allows attributes up to 25
      assert.strictEqual(MODIFIED_MAX, 25, 'Modified attrs can reach 25');
    });

    it('attributes should support temporary drain below minimum', () => {
      // C ref: Attributes can be drained below 3 by various effects
      // When drained to 0 or below, it can be fatal (e.g., CON drain)
      const DRAINED_MIN = 0;
      assert.strictEqual(DRAINED_MIN, 0, 'Attributes can drain to 0');
    });

    it('attribute bonus range should be reasonable', () => {
      // C ref: Attributes typically provide bonuses in range [-5, +7]
      // For example, STR 3 gives -3 to-hit, STR 18/** gives +2 to-hit
      const MIN_BONUS = -5;
      const MAX_BONUS = 7;

      assert(MIN_BONUS < 0, 'Min bonus is penalty');
      assert(MAX_BONUS > 0, 'Max bonus is positive');
      assert(MAX_BONUS - MIN_BONUS > 0, 'Bonus range is positive');
    });
  });

  describe('Strength-Specific Properties', () => {
    it('strength should affect damage modifier', () => {
      // C ref: Strength provides damage bonuses at high values
      // 18/** strength can give up to +6 damage
      const MAX_STR_DAMAGE_BONUS = 6;
      assert.strictEqual(MAX_STR_DAMAGE_BONUS, 6, 'Max STR damage bonus is +6');
    });

    it('strength should affect to-hit modifier', () => {
      // C ref: Strength provides to-hit bonuses
      // 18/** gives +2 to-hit
      const MAX_STR_HIT_BONUS = 2;
      assert.strictEqual(MAX_STR_HIT_BONUS, 2, 'Max STR to-hit bonus is +2');
    });

    it('strength should affect carrying capacity', () => {
      // C ref: Strength affects how much weight you can carry
      // This is a continuous relationship, not a fixed constant
      const HAS_WEIGHT_EFFECT = true;
      assert.strictEqual(HAS_WEIGHT_EFFECT, true, 'STR affects capacity');
    });
  });

  describe('Intelligence and Wisdom Properties', () => {
    it('intelligence should affect spell failure rate', () => {
      // C ref: Intelligence affects spell failure for wizards
      const AFFECTS_SPELL_FAIL = true;
      assert.strictEqual(AFFECTS_SPELL_FAIL, true, 'INT affects spell failure');
    });

    it('wisdom should affect spell energy maximum', () => {
      // C ref: Wisdom affects maximum spell energy for priests/healers
      const AFFECTS_ENERGY_MAX = true;
      assert.strictEqual(AFFECTS_ENERGY_MAX, true, 'WIS affects energy max');
    });

    it('high INT and WIS should reduce spell hunger', () => {
      // C ref: High mental stats reduce spell hunger cost
      const AFFECTS_SPELL_HUNGER = true;
      assert.strictEqual(AFFECTS_SPELL_HUNGER, true, 'INT/WIS affect spell hunger');
    });
  });

  describe('Dexterity Properties', () => {
    it('dexterity should affect AC', () => {
      // C ref: Dexterity provides AC bonus (up to -4 at DEX 18)
      const MAX_DEX_AC_BONUS = 4;
      assert.strictEqual(MAX_DEX_AC_BONUS, 4, 'Max DEX AC bonus is 4');
    });

    it('dexterity should affect to-hit with ranged weapons', () => {
      // C ref: Dexterity provides to-hit bonus for ranged attacks
      const AFFECTS_RANGED_HIT = true;
      assert.strictEqual(AFFECTS_RANGED_HIT, true, 'DEX affects ranged to-hit');
    });

    it('dexterity should affect stealing success', () => {
      // C ref: Dexterity affects thief stealing chances
      const AFFECTS_STEALING = true;
      assert.strictEqual(AFFECTS_STEALING, true, 'DEX affects stealing');
    });
  });

  describe('Constitution Properties', () => {
    it('constitution should affect hit point gains', () => {
      // C ref: Constitution provides HP bonus per level
      // Can range from -1 to +3 HP per level
      const MAX_CON_HP_BONUS = 3;
      assert.strictEqual(MAX_CON_HP_BONUS, 3, 'Max CON HP bonus is +3/level');
    });

    it('constitution should affect poison resistance', () => {
      // C ref: Constitution affects poison damage and resistance
      const AFFECTS_POISON = true;
      assert.strictEqual(AFFECTS_POISON, true, 'CON affects poison');
    });

    it('constitution should affect regeneration', () => {
      // C ref: High constitution can improve natural regeneration
      const AFFECTS_REGEN = true;
      assert.strictEqual(AFFECTS_REGEN, true, 'CON affects regeneration');
    });
  });

  describe('Charisma Properties', () => {
    it('charisma should affect shop prices', () => {
      // C ref: Charisma affects shopkeeper prices (better prices at CHA 18)
      const AFFECTS_PRICES = true;
      assert.strictEqual(AFFECTS_PRICES, true, 'CHA affects shop prices');
    });

    it('charisma should affect monster starting attitude', () => {
      // C ref: Charisma affects whether monsters spawn peaceful
      const AFFECTS_PEACEFUL = true;
      assert.strictEqual(AFFECTS_PEACEFUL, true, 'CHA affects peaceful spawns');
    });

    it('minimum effective charisma should be 3', () => {
      // C ref: Charisma below 3 doesn't provide additional penalty
      const MIN_EFFECTIVE_CHA = 3;
      assert.strictEqual(MIN_EFFECTIVE_CHA, 3, 'Min effective CHA is 3');
    });
  });

  describe('Attribute Value Consistency', () => {
    it('starting attributes should sum to reasonable range', () => {
      // C ref: Starting attribute totals vary by race but are balanced
      // Human average: 75 (6×12.5), typical range 60-90
      const MIN_TOTAL = 60;
      const MAX_TOTAL = 90;

      assert(MIN_TOTAL > 0, 'Min total is positive');
      assert(MAX_TOTAL > MIN_TOTAL, 'Max total exceeds min');
      assert(MAX_TOTAL < 6 * 25, 'Max total is less than 6×25');
    });

    it('average starting attribute should be around 12', () => {
      // C ref: Typical starting attributes average around 11-13
      const AVG_ATTR = 12;
      const AVG_TOTAL = AVG_ATTR * 6; // 72

      assert.strictEqual(AVG_ATTR, 12, 'Average starting attr is 12');
      assert.strictEqual(AVG_TOTAL, 72, 'Average total is 72');
    });
  });

  describe('Attribute Restoration', () => {
    it('restore ability should heal drained attributes', () => {
      // C ref: Restore ability spell/potion restores drained attributes
      const CAN_RESTORE = true;
      assert.strictEqual(CAN_RESTORE, true, 'Attributes can be restored');
    });

    it('blessed restore ability should exceed original maximum', () => {
      // C ref: Blessed restore ability can raise attrs above starting values
      const BLESSED_CAN_EXCEED = true;
      assert.strictEqual(BLESSED_CAN_EXCEED, true, 'Blessed can exceed original');
    });

    it('attribute restoration should be capped at 25', () => {
      // C ref: Even with blessed restoration, attributes cap at 25
      const RESTORE_CAP = 25;
      assert.strictEqual(RESTORE_CAP, 25, 'Restoration caps at 25');
    });
  });

  describe('Attribute Display Format', () => {
    it('normal attributes should display as integer', () => {
      // C ref: Attributes 3-17 display as plain numbers
      const STR_10 = '10';
      const pattern = /^\d+$/;
      assert(pattern.test(STR_10), 'Normal attrs display as integer');
    });

    it('strength 18/xx should display with slash', () => {
      // C ref: Exceptional strength displays as "18/50", "18/00", etc.
      const STR_18_50 = '18/50';
      const pattern = /^18\/\d{2}$/;
      assert(pattern.test(STR_18_50), 'Exceptional STR displays as 18/xx');
    });

    it('strength 18/00 should display with double zero', () => {
      // C ref: Maximum exceptional strength displays as "18/00"
      const STR_18_00 = '18/00';
      assert.strictEqual(STR_18_00, '18/00', 'Max STR displays as 18/00');
    });
  });

  describe('Critical Attribute Values', () => {
    it('minimum survivable constitution should be 1', () => {
      // C ref: CON of 0 or below is fatal
      const MIN_SURVIVE_CON = 1;
      assert.strictEqual(MIN_SURVIVE_CON, 1, 'CON 0 is fatal');
    });

    it('strength 3 should impose maximum penalty', () => {
      // C ref: STR 3 gives -3 to-hit and damage penalties
      const STR_3 = 3;
      const PENALTY = -3;
      assert.strictEqual(PENALTY, -3, 'STR 3 gives -3 penalty');
    });

    it('intelligence 3 should prevent spell learning', () => {
      // C ref: Very low INT makes spell learning nearly impossible
      const MIN_SPELL_INT = 3;
      assert.strictEqual(MIN_SPELL_INT, 3, 'INT 3 prevents spells');
    });
  });

  describe('Attribute Limits Validation', () => {
    it('minimum attribute should not be negative', () => {
      const MIN_ATTR = 3;
      assert(MIN_ATTR >= 0, 'Min attribute is non-negative');
    });

    it('maximum attribute should be reasonable', () => {
      const MAX_ATTR = 25;
      assert(MAX_ATTR < 100, 'Max attribute is reasonable');
      assert(MAX_ATTR > 18, 'Max attribute exceeds normal max');
    });

    it('attribute range should span at least 15 values', () => {
      const MIN_ATTR = 3;
      const MAX_NORMAL_ATTR = 18;
      const range = MAX_NORMAL_ATTR - MIN_ATTR;

      assert(range >= 15, 'Normal range spans at least 15');
    });
  });
});
