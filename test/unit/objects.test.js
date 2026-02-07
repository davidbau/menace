// test/unit/objects.test.js -- Tests for the object database
// C ref: objects.h, objects.c -- verifies all object data is correctly ported

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { objectData, NUM_OBJECTS,
         WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
         TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS,
         SPBOOK_CLASS, WAND_CLASS, COIN_CLASS, GEM_CLASS,
         ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS, ILLOBJ_CLASS,
         ARROW, ELVEN_ARROW, LONG_SWORD, KATANA,
         PLATE_MAIL, LEATHER_ARMOR, CHAIN_MAIL,
         FOOD_RATION, TRIPE_RATION, CORPSE,
         POT_HEALING, POT_EXTRA_HEALING, POT_WATER,
         SCR_IDENTIFY, SCR_ENCHANT_WEAPON, SCR_TELEPORTATION,
         WAN_WISHING, WAN_DEATH, WAN_FIRE, WAN_COLD,
         GOLD_PIECE, DIAMOND, RUBY,
         CLASS_SYMBOLS } from '../../js/objects.js';

describe('Objects database', () => {
    it('has correct total count', () => {
        // objectData includes a fencepost sentinel at the end, so length = NUM_OBJECTS + 1
        assert.equal(NUM_OBJECTS + 1, objectData.length);
        assert.ok(NUM_OBJECTS > 400, `Expected >400 objects, got ${NUM_OBJECTS}`);
    });

    it('all objects have required fields', () => {
        for (let i = 0; i < objectData.length; i++) {
            const obj = objectData[i];
            assert.equal(typeof obj.oc_class, 'number', `Object ${i} missing oc_class`);
            assert.equal(typeof obj.symbol, 'string', `Object ${i} missing symbol`);
            assert.equal(typeof obj.color, 'number', `Object ${i} missing color`);
            assert.equal(typeof obj.weight, 'number', `Object ${i} missing weight`);
            assert.equal(typeof obj.cost, 'number', `Object ${i} missing cost`);
        }
    });

    it('weapons have damage dice', () => {
        const weapons = objectData.filter(o => o.oc_class === WEAPON_CLASS && o.prob > 0);
        assert.ok(weapons.length > 50, `Expected >50 weapons, got ${weapons.length}`);
        for (const w of weapons) {
            assert.ok(w.sdam > 0 || w.ldam > 0,
                `Weapon "${w.name}" should have damage dice`);
        }
    });

    it('armor has AC values', () => {
        const armor = objectData.filter(o => o.oc_class === ARMOR_CLASS && o.prob > 0);
        assert.ok(armor.length > 30, `Expected >30 armor, got ${armor.length}`);
        for (const a of armor) {
            assert.ok(a.oc1 >= 0 && a.oc1 <= 10,
                `Armor "${a.name}" AC ${a.oc1} out of range`);
        }
    });

    it('food has nutrition values', () => {
        const food = objectData.filter(o => o.oc_class === FOOD_CLASS && o.prob > 0);
        assert.ok(food.length > 10, `Expected >10 food items, got ${food.length}`);
        // Food ration should have 800 nutrition
        assert.equal(objectData[FOOD_RATION].nutrition, 800);
    });

    it('specific weapon stats match C source', () => {
        // C ref: objects.h -- arrow: sdam=6, ldam=6
        const arrow = objectData[ARROW];
        assert.equal(arrow.name, 'arrow');
        assert.equal(arrow.sdam, 6);
        assert.equal(arrow.ldam, 6);

        // C ref: objects.h -- long sword: sdam=8, ldam=12
        const ls = objectData[LONG_SWORD];
        assert.equal(ls.name, 'long sword');
        assert.equal(ls.sdam, 8);
        assert.equal(ls.ldam, 12);

        // C ref: objects.h -- katana: sdam=10, ldam=12
        const katana = objectData[KATANA];
        assert.equal(katana.name, 'katana');
        assert.equal(katana.sdam, 10);
        assert.equal(katana.ldam, 12);
    });

    it('specific armor stats match C source', () => {
        // C ref: objects.h -- plate mail: AC 3, so oc1 = 10-3 = 7
        const pm = objectData[PLATE_MAIL];
        assert.equal(pm.name, 'plate mail');
        assert.equal(pm.oc1, 7); // 10 - AC

        // Leather armor: AC 8, oc1 = 2
        const la = objectData[LEATHER_ARMOR];
        assert.equal(la.name, 'leather armor');
        assert.equal(la.oc1, 2); // 10 - 8
    });

    it('potions have correct properties', () => {
        const healing = objectData[POT_HEALING];
        assert.equal(healing.name, 'healing');
        assert.equal(healing.oc_class, POTION_CLASS);

        const water = objectData[POT_WATER];
        assert.equal(water.name, 'water');
    });

    it('scrolls exist', () => {
        const identify = objectData[SCR_IDENTIFY];
        assert.equal(identify.name, 'identify');
        assert.equal(identify.oc_class, SCROLL_CLASS);
    });

    it('wands exist with correct class', () => {
        const wishing = objectData[WAN_WISHING];
        assert.equal(wishing.name, 'wishing');
        assert.equal(wishing.oc_class, WAND_CLASS);

        const death = objectData[WAN_DEATH];
        assert.equal(death.name, 'death');
    });

    it('gold piece exists', () => {
        const gold = objectData[GOLD_PIECE];
        assert.equal(gold.name, 'gold piece');
        assert.equal(gold.oc_class, COIN_CLASS);
    });

    it('gems have value', () => {
        const diamond = objectData[DIAMOND];
        assert.equal(diamond.name, 'diamond');
        assert.equal(diamond.cost, 4000);

        const ruby = objectData[RUBY];
        assert.equal(ruby.name, 'ruby');
        assert.equal(ruby.cost, 3500);
    });

    it('class symbols are correct', () => {
        assert.equal(CLASS_SYMBOLS[WEAPON_CLASS], ')');
        assert.equal(CLASS_SYMBOLS[ARMOR_CLASS], '[');
        assert.equal(CLASS_SYMBOLS[RING_CLASS], '=');
        assert.equal(CLASS_SYMBOLS[AMULET_CLASS], '"');
        assert.equal(CLASS_SYMBOLS[TOOL_CLASS], '(');
        assert.equal(CLASS_SYMBOLS[FOOD_CLASS], '%');
        assert.equal(CLASS_SYMBOLS[POTION_CLASS], '!');
        assert.equal(CLASS_SYMBOLS[SCROLL_CLASS], '?');
        assert.equal(CLASS_SYMBOLS[SPBOOK_CLASS], '+');
        assert.equal(CLASS_SYMBOLS[WAND_CLASS], '/');
        assert.equal(CLASS_SYMBOLS[COIN_CLASS], '$');
        assert.equal(CLASS_SYMBOLS[GEM_CLASS], '*');
    });

    it('objects have valid oc_class values', () => {
        const validClasses = new Set([
            ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
            TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
            WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS,
            CHAIN_CLASS, VENOM_CLASS,
        ]);
        for (const obj of objectData) {
            assert.ok(validClasses.has(obj.oc_class),
                `Object "${obj.name}" has invalid class ${obj.oc_class}`);
        }
    });

    it('probabilities are non-negative', () => {
        for (const obj of objectData) {
            assert.ok(obj.prob >= 0,
                `Object "${obj.name}" has negative probability ${obj.prob}`);
        }
    });
});
