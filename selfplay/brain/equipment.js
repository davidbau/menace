// selfplay/brain/equipment.js -- Weapon and armor management
//
// Manages wielding weapons and wearing armor for better combat survival.
// NetHack starting equipment varies by role, and the agent should use it.

/**
 * Weapon quality tiers (simplified)
 */
const WEAPON_PRIORITY = {
    // Two-handed weapons (high damage)
    'two-handed sword': 100,
    'tsurugi': 95,

    // Long swords and good one-handed
    'long sword': 80,
    'katana': 80,
    'broadsword': 75,
    'scimitar': 70,

    // Medium weapons
    'short sword': 60,
    'mace': 55,
    'axe': 55,
    'club': 50,

    // Starting weapons
    'dagger': 40,
    'knife': 35,

    // Missiles (low priority for melee)
    'bow': 20,
    'arrow': 10,
};

/**
 * Get weapon priority score (higher is better)
 */
function getWeaponScore(itemName) {
    const lower = itemName.toLowerCase();

    // Check for exact matches
    for (const [weapon, score] of Object.entries(WEAPON_PRIORITY)) {
        if (lower.includes(weapon)) {
            return score;
        }
    }

    // Unknown weapon - assign medium priority
    return 45;
}

/**
 * Equipment manager
 */
export class EquipmentManager {
    constructor() {
        this.currentWeapon = null; // Currently wielded weapon
        this.currentArmor = null; // Currently worn armor
        this.hasCheckedStarting = false; // Have we checked starting equipment?
    }

    /**
     * Find the best weapon in inventory
     * @param {Array} items - Inventory items
     * @returns {Object|null} - Best weapon item or null
     */
    findBestWeapon(items) {
        const weapons = items.filter(item => item.category === 'Weapons');
        if (weapons.length === 0) return null;

        let best = null;
        let bestScore = -1;

        for (const weapon of weapons) {
            const score = getWeaponScore(weapon.name);
            if (score > bestScore) {
                best = weapon;
                bestScore = score;
            }
        }

        return best;
    }

    /**
     * Find wieldable armor in inventory
     * @param {Array} items - Inventory items
     * @returns {Object|null} - Armor item or null
     */
    findArmor(items) {
        const armor = items.filter(item => item.category === 'Armor');
        return armor.length > 0 ? armor[0] : null;
    }

    /**
     * Check if we should wield a weapon
     * @param {Object} inventory - InventoryTracker instance
     * @returns {Object|null} - Weapon to wield, or null if no action needed
     */
    shouldWieldWeapon(inventory) {
        if (!inventory || inventory.count() === 0) return null;

        const bestWeapon = this.findBestWeapon(inventory.items);
        if (!bestWeapon) return null;

        // If we haven't wielded anything yet, wield the best weapon
        if (!this.currentWeapon) {
            return bestWeapon;
        }

        // If we found a better weapon, switch to it
        const currentScore = getWeaponScore(this.currentWeapon);
        const bestScore = getWeaponScore(bestWeapon.name);
        if (bestScore > currentScore + 10) { // Require significant improvement
            return bestWeapon;
        }

        return null;
    }

    /**
     * Check if we should wear armor
     * @param {Object} inventory - InventoryTracker instance
     * @returns {Object|null} - Armor to wear, or null if no action needed
     */
    shouldWearArmor(inventory) {
        if (!inventory || inventory.count() === 0) return null;
        if (this.currentArmor) return null; // Already wearing armor

        const armor = this.findArmor(inventory.items);
        return armor;
    }

    /**
     * Record that we wielded a weapon
     * @param {string} weaponName - Name of the wielded weapon
     */
    recordWield(weaponName) {
        this.currentWeapon = weaponName;
    }

    /**
     * Record that we wore armor
     * @param {string} armorName - Name of the worn armor
     */
    recordWear(armorName) {
        this.currentArmor = armorName;
    }

    /**
     * Reset equipment state (use after death or game restart)
     */
    reset() {
        this.currentWeapon = null;
        this.currentArmor = null;
        this.hasCheckedStarting = false;
    }
}
