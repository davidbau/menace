// selfplay/test/equipment.test.js -- Tests for equipment management

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EquipmentManager } from '../brain/equipment.js';

describe('Equipment Management', () => {
    it('finds best weapon in inventory', () => {
        const manager = new EquipmentManager();
        const items = [
            { letter: 'a', name: 'a dagger', category: 'Weapons' },
            { letter: 'b', name: 'a long sword', category: 'Weapons' },
            { letter: 'c', name: 'a short sword', category: 'Weapons' },
        ];

        const best = manager.findBestWeapon(items);
        assert.equal(best.name, 'a long sword');
    });

    it('returns null when no weapons available', () => {
        const manager = new EquipmentManager();
        const items = [
            { letter: 'a', name: 'a food ration', category: 'Comestibles' },
        ];

        const best = manager.findBestWeapon(items);
        assert.equal(best, null);
    });

    it('recommends wielding weapon when none equipped', () => {
        const manager = new EquipmentManager();
        const inventory = {
            items: [
                { letter: 'a', name: 'a long sword', category: 'Weapons' },
            ],
            count: () => 1,
        };

        const weapon = manager.shouldWieldWeapon(inventory);
        assert.equal(weapon.name, 'a long sword');
    });

    it('recommends upgrading to better weapon', () => {
        const manager = new EquipmentManager();
        manager.currentWeapon = 'a dagger';

        const inventory = {
            items: [
                { letter: 'a', name: 'a dagger', category: 'Weapons' },
                { letter: 'b', name: 'a long sword', category: 'Weapons' },
            ],
            count: () => 2,
        };

        const weapon = manager.shouldWieldWeapon(inventory);
        assert.equal(weapon.name, 'a long sword');
    });

    it('does not recommend switching for minor upgrades', () => {
        const manager = new EquipmentManager();
        manager.currentWeapon = 'a short sword'; // Score 60

        const inventory = {
            items: [
                { letter: 'a', name: 'a mace', category: 'Weapons' }, // Score 55
            ],
            count: () => 1,
        };

        const weapon = manager.shouldWieldWeapon(inventory);
        assert.equal(weapon, null);
    });

    it('finds armor in inventory', () => {
        const manager = new EquipmentManager();
        const items = [
            { letter: 'a', name: 'a dagger', category: 'Weapons' },
            { letter: 'b', name: 'a leather armor', category: 'Armor' },
        ];

        const armor = manager.findArmor(items);
        assert.equal(armor.name, 'a leather armor');
    });

    it('recommends wearing armor when none equipped', () => {
        const manager = new EquipmentManager();
        const inventory = {
            items: [
                { letter: 'a', name: 'a leather armor', category: 'Armor' },
            ],
            count: () => 1,
        };

        const armor = manager.shouldWearArmor(inventory);
        assert.equal(armor.name, 'a leather armor');
    });

    it('does not recommend armor when already wearing', () => {
        const manager = new EquipmentManager();
        manager.currentArmor = 'a leather armor';

        const inventory = {
            items: [
                { letter: 'a', name: 'a chain mail', category: 'Armor' },
            ],
            count: () => 1,
        };

        const armor = manager.shouldWearArmor(inventory);
        assert.equal(armor, null);
    });

    it('records wielded weapon', () => {
        const manager = new EquipmentManager();
        manager.recordWield('a long sword');
        assert.equal(manager.currentWeapon, 'a long sword');
    });

    it('records worn armor', () => {
        const manager = new EquipmentManager();
        manager.recordWear('a leather armor');
        assert.equal(manager.currentArmor, 'a leather armor');
    });

    it('resets equipment state', () => {
        const manager = new EquipmentManager();
        manager.recordWield('a long sword');
        manager.recordWear('a leather armor');
        manager.reset();

        assert.equal(manager.currentWeapon, null);
        assert.equal(manager.currentArmor, null);
    });
});
