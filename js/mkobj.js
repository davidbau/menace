// mkobj.js -- Object creation
// Mirrors mkobj.c from the C source.

import { COLNO, ROWNO, ROOM, IS_ROOM, ACCESSIBLE, isok } from './config.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { CLR_BLACK, CLR_CYAN, CLR_BROWN, CLR_GRAY, CLR_WHITE, CLR_YELLOW,
         CLR_RED, CLR_GREEN, CLR_BLUE, CLR_MAGENTA, CLR_ORANGE,
         CLR_BRIGHT_GREEN, CLR_BRIGHT_BLUE, HI_METAL, HI_GOLD } from './display.js';

// Object class constants
// C ref: objclass.h
export const WEAPON_CLASS = 0;
export const ARMOR_CLASS = 1;
export const RING_CLASS = 2;
export const AMULET_CLASS = 3;
export const TOOL_CLASS = 4;
export const FOOD_CLASS = 5;
export const POTION_CLASS = 6;
export const SCROLL_CLASS = 7;
export const SPBOOK_CLASS = 8;
export const WAND_CLASS = 9;
export const COIN_CLASS = 10;
export const GEM_CLASS = 11;
export const ROCK_CLASS = 12;
export const BALL_CLASS = 13;
export const CHAIN_CLASS = 14;
export const VENOM_CLASS = 15;

// Object class symbols (from defsym.h OBJCLASS section)
const CLASS_SYMBOLS = {
    [WEAPON_CLASS]: ')',
    [ARMOR_CLASS]:  '[',
    [RING_CLASS]:   '=',
    [AMULET_CLASS]: '"',
    [TOOL_CLASS]:   '(',
    [FOOD_CLASS]:   '%',
    [POTION_CLASS]: '!',
    [SCROLL_CLASS]: '?',
    [SPBOOK_CLASS]: '+',
    [WAND_CLASS]:   '/',
    [COIN_CLASS]:   '$',
    [GEM_CLASS]:    '*',
    [ROCK_CLASS]:   '`',
    [BALL_CLASS]:   '0',
    [CHAIN_CLASS]:  '_',
    [VENOM_CLASS]:  '.',
};

// Simplified object types for the initial port
// C ref: include/objects.h -- full data is in objects.js (generated)
export const objectTypes = [
    // Weapons
    { name: 'orcish dagger',       oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 10, cost: 4, damage: [1,3], large_damage: [1,3] },
    { name: 'dagger',              oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 10, cost: 4, damage: [1,4], large_damage: [1,3] },
    { name: 'knife',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 5, cost: 4, damage: [1,3], large_damage: [1,2] },
    { name: 'short sword',         oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 10, damage: [1,6], large_damage: [1,8] },
    { name: 'orcish short sword',  oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BLACK, weight: 30, cost: 10, damage: [1,5], large_damage: [1,8] },
    { name: 'long sword',          oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 40, cost: 15, damage: [1,8], large_damage: [1,12] },
    { name: 'mace',                oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 5, damage: [1,6], large_damage: [1,6] },
    { name: 'war hammer',          oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 50, cost: 5, damage: [1,4], large_damage: [1,4] },
    { name: 'club',                oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BROWN, weight: 30, cost: 3, damage: [1,6], large_damage: [1,3] },
    { name: 'spear',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 30, cost: 3, damage: [1,6], large_damage: [1,8] },
    { name: 'bow',                 oc_class: WEAPON_CLASS, symbol: ')', color: CLR_BROWN, weight: 30, cost: 60, damage: [1,2], large_damage: [1,2] },
    { name: 'arrow',               oc_class: WEAPON_CLASS, symbol: ')', color: HI_METAL, weight: 1, cost: 2, damage: [1,6], large_damage: [1,6], stackable: true },

    // Armor
    { name: 'leather armor',       oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 150, cost: 5, ac: 8 },
    { name: 'studded leather armor', oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 200, cost: 15, ac: 7 },
    { name: 'ring mail',           oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 250, cost: 100, ac: 7 },
    { name: 'scale mail',          oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 250, cost: 45, ac: 6 },
    { name: 'chain mail',          oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 300, cost: 75, ac: 5 },
    { name: 'small shield',        oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 30, cost: 3, ac: 9, isShield: true },
    { name: 'leather gloves',      oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 10, cost: 8, ac: 9, isGloves: true },
    { name: 'low boots',           oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BROWN, weight: 10, cost: 8, ac: 9, isBoots: true },
    { name: 'helmet',              oc_class: ARMOR_CLASS, symbol: '[', color: HI_METAL, weight: 30, cost: 10, ac: 9, isHelmet: true },
    { name: 'elven cloak',         oc_class: ARMOR_CLASS, symbol: '[', color: CLR_BLACK, weight: 10, cost: 60, ac: 9, isCloak: true },

    // Food
    { name: 'food ration',         oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 20, cost: 45, nutrition: 800 },
    { name: 'apple',               oc_class: FOOD_CLASS, symbol: '%', color: CLR_RED, weight: 2, cost: 7, nutrition: 50 },
    { name: 'melon',               oc_class: FOOD_CLASS, symbol: '%', color: CLR_BRIGHT_GREEN, weight: 5, cost: 10, nutrition: 100 },
    { name: 'tripe ration',        oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 10, cost: 15, nutrition: 200 },
    { name: 'corpse',              oc_class: FOOD_CLASS, symbol: '%', color: CLR_BROWN, weight: 0, cost: 0, nutrition: 0 },

    // Potions
    { name: 'potion of healing',   oc_class: POTION_CLASS, symbol: '!', color: CLR_MAGENTA, weight: 20, cost: 100 },
    { name: 'potion of extra healing', oc_class: POTION_CLASS, symbol: '!', color: CLR_GREEN, weight: 20, cost: 100 },
    { name: 'potion of water',     oc_class: POTION_CLASS, symbol: '!', color: CLR_BLUE, weight: 20, cost: 100 },

    // Scrolls
    { name: 'scroll of identify',  oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 20 },
    { name: 'scroll of teleportation', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 100 },
    { name: 'scroll of enchant weapon', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 60 },
    { name: 'scroll of enchant armor', oc_class: SCROLL_CLASS, symbol: '?', color: CLR_WHITE, weight: 5, cost: 80 },

    // Gold
    { name: 'gold piece',          oc_class: COIN_CLASS, symbol: '$', color: HI_GOLD, weight: 1, cost: 1, stackable: true },

    // Gems/rocks
    { name: 'worthless piece of glass', oc_class: GEM_CLASS, symbol: '*', color: CLR_GREEN, weight: 1, cost: 0 },
    { name: 'rock',                oc_class: ROCK_CLASS, symbol: '`', color: CLR_GRAY, weight: 10, cost: 0, stackable: true },

    // Tools
    { name: 'skeleton key',        oc_class: TOOL_CLASS, symbol: '(', color: HI_METAL, weight: 3, cost: 10 },
    { name: 'lamp',                oc_class: TOOL_CLASS, symbol: '(', color: CLR_YELLOW, weight: 20, cost: 10 },
    { name: 'pick-axe',            oc_class: TOOL_CLASS, symbol: '(', color: HI_METAL, weight: 100, cost: 50 },

    // Wands
    { name: 'wand of striking',    oc_class: WAND_CLASS, symbol: '/', color: HI_METAL, weight: 7, cost: 150, charges: [3,5] },
    { name: 'wand of fire',        oc_class: WAND_CLASS, symbol: '/', color: CLR_ORANGE, weight: 7, cost: 175, charges: [4,8] },
    { name: 'wand of cold',        oc_class: WAND_CLASS, symbol: '/', color: CLR_BRIGHT_BLUE, weight: 7, cost: 175, charges: [4,8] },
];

// Create a game object instance
// C ref: mkobj.c mksobj()
export function createObject(typeOrNull, x, y) {
    let type;
    if (typeOrNull) {
        type = typeOrNull;
    } else {
        type = objectTypes[rn2(objectTypes.length)];
    }

    const obj = {
        type: type,
        name: type.name,
        displayChar: type.symbol || CLASS_SYMBOLS[type.oc_class] || '?',
        displayColor: type.color || CLR_GRAY,
        oc_class: type.oc_class,
        ox: x,
        oy: y,
        weight: type.weight || 0,
        cost: type.cost || 0,
        invlet: '',    // inventory letter (assigned when picked up)
        quantity: 1,
        blessed: false,
        cursed: false,
        known: false,  // identified
        enchantment: 0,

        // Weapon-specific
        damage: type.damage || null,
        large_damage: type.large_damage || null,

        // Armor-specific
        ac: type.ac || 0,

        // Food-specific
        nutrition: type.nutrition || 0,

        // Wand-specific
        charges: type.charges ? rn1(type.charges[1] - type.charges[0] + 1, type.charges[0]) : 0,

        // Stackable items
        stackable: type.stackable || false,
    };

    return obj;
}

// Place random objects on a level
// C ref: mkobj.c -- called from mklev.c level generation
export function populateObjects(map, depth) {
    // Number of initial objects: roughly 5 + depth/2
    const numObjects = rn1(5, 3 + Math.floor(depth / 2));

    for (let i = 0; i < numObjects; i++) {
        // Find a suitable spot
        for (let attempts = 0; attempts < 100; attempts++) {
            const x = rn1(COLNO - 4, 2);
            const y = rn1(ROWNO - 4, 2);
            const loc = map.at(x, y);
            if (loc && ACCESSIBLE(loc.typ)) {
                // Pick a random object type (not gold too often)
                let type;
                if (rn2(5) === 0) {
                    // Gold
                    type = objectTypes.find(t => t.name === 'gold piece');
                } else {
                    // Random non-gold object
                    const nonGold = objectTypes.filter(t => t.oc_class !== COIN_CLASS);
                    type = nonGold[rn2(nonGold.length)];
                }

                const obj = createObject(type, x, y);
                if (obj.oc_class === COIN_CLASS) {
                    obj.quantity = rn1(20 * depth, 5);
                }
                map.objects.push(obj);
                break;
            }
        }
    }
}
