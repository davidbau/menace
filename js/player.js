// player.js -- Player state and actions
// Mirrors struct you from you.h and player-related globals from decl.h

import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, NUM_ATTRS,
         A_NEUTRAL, A_LAWFUL, A_CHAOTIC,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
         FEMALE, MALE,
         CONFUSION, STUNNED, BLINDED, HALLUC, HALLUC_RES, SICK, FAST,
         TIMEOUT, INTRINSIC, SICK_VOMITABLE, SICK_NONVOMITABLE } from './const.js';
import { objectData, COIN_CLASS, FOOD_CLASS } from './objects.js';
import { NORMAL_SPEED } from './const.js';
import { weight } from './mkobj.js';
import { skill_init, skills_for_role } from './weapon.js';

// Import roles/races from role.js (moved from player.js in Phase 3)
import { roles, races,
         validRacesForRole, validAlignsForRoleRace, needsGenderMenu,
         rankOf, godForRoleAlign, isGoddess, greetingForRole,
         Hello, Goodbye,
         roleNameForGender, alignName, initialAlignmentRecordForRole,
         formatLoreText } from './role.js';
// Re-export for backward compatibility during migration
export { roles, races,
         validRacesForRole, validAlignsForRoleRace, needsGenderMenu,
         rankOf, godForRoleAlign, isGoddess, greetingForRole,
         Hello, Goodbye,
         roleNameForGender, alignName, initialAlignmentRecordForRole,
         formatLoreText };

const INVENTORY_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Player {
    constructor() {
        // Position
        // C ref: you.h u.ux, u.uy
        this.x = 0;
        this.y = 0;

        // Identity
        this.name = 'Adventurer';
        this.roleIndex = 0;
        this.roleMnum = 0;  // C ref: urole.mnum — monster table PM_* index
        this.race = RACE_HUMAN;
        this.gender = 0;
        this.alignment = A_NEUTRAL;
        this.alignmentRecord = 0; // C ref: u.ualign.record
        this.alignmentAbuse = 0;  // C ref: u.ualign.abuse

        // Vital stats
        // C ref: you.h u.uhp, u.uhpmax, u.uen, u.uenmax
        this.hp = 12;
        this.hpmax = 12;
        this.pw = 1;     // power (mana)
        this.pwmax = 1;
        this.ac = 10;    // armor class (lower is better)
        this.level = 1;  // experience level
        this.exp = 0;    // experience points
        this.score = 0;

        // Attributes [STR, INT, WIS, DEX, CON, CHA]
        // C ref: attrib.h, you.h acurr/abon/amax/atemp etc.
        this.attributes = [10, 10, 10, 10, 10, 10];

        // Dungeon position
        this.dungeonLevel = 1;
        this.maxDungeonLevel = 1;
        this.inTutorial = false;

        // Resources
        this.gold = 0;

        // Hunger: 900 = normal starting value
        // C ref: you.h u.uhunger (starts at 900)
        this.hunger = 900;
        this.nutrition = 900;

        // Movement
        this.movement = NORMAL_SPEED;
        this.umovement = NORMAL_SPEED;
        this.speed = NORMAL_SPEED;
        this.moved = false;

        // Luck
        // C ref: you.h u.uluck, u.moreluck.
        // Keep legacy `player.luck` as an alias so old callsites stay in sync.
        this.uluck = 0;
        Object.defineProperty(this, 'luck', {
            get: () => this.uluck,
            set: (v) => { this.uluck = v; },
            enumerable: true,
            configurable: true,
        });
        this.moreluck = 0;

        // Intrinsic properties (C ref: you.h u.uprops[])
        // Sparse object: only populated properties have entries.
        // Each entry: { intrinsic: number, extrinsic: number, blocked: number }
        this.uprops = {};
        // Sickness type (C ref: you.h u.usick_type)
        this.usick_type = 0;

        // Inventory
        // C ref: decl.h invent (linked list in C, array in JS)
        this.inventory = [];
        // Known spells (C ref: svs.spl_book[] in spell.c)
        // Each entry: { otyp, sp_lev, sp_know } matching C struct spell
        this.spells = [];
        // C ref: invent.c static lastinvnr (starts at max index so first item is 'a')
        this.lastInvlet = INVENTORY_LETTERS.length - 1;

        // Equipment slots
        // C ref: decl.h uarm, uarmc, uarmh, etc.
        this.weapon = null;
        this.armor = null;
        this.shield = null;
        this.helmet = null;
        this.gloves = null;
        this.boots = null;
        this.cloak = null;
        this.shirt = null;  // C ref: uarmu
        this.amulet = null;
        this.leftRing = null;
        this.rightRing = null;
        this.swapWeapon = null;  // C ref: uswapwep
        this.quiver = null;      // C ref: uquiver

        // Turns
        this.turns = 0;
        this.wizard = false;
        this.displacedPetThisTurn = false;
        this._bashmsgWepObj = null;
        this.kickedloc = null;
        this.questLocateHintShown = false;

        // Death cause -- C ref: killer.name from end.c
        this.deathCause = '';

        // Display options
        this.showExp = false;
        this.showScore = false;
        this.showTime = false;
    }

    // Initialize player for a new game with a given role
    // C ref: u_init.c u_init()
    initRole(roleIndex) {
        this.roleIndex = roleIndex;
        const role = roles[roleIndex];
        if (!role) return;
        this.roleMnum = role.mnum;

        this.attributes[A_STR] = role.str;
        this.attributes[A_INT] = role.int;
        this.attributes[A_WIS] = role.wis;
        this.attributes[A_DEX] = role.dex;
        this.attributes[A_CON] = role.con;
        this.attributes[A_CHA] = role.cha;

        this.hp = role.startingHP;
        this.hpmax = role.startingHP;
        this.pw = role.startingPW;
        this.pwmax = role.startingPW;
        this.alignment = role.align;
        this.alignmentRecord = initialAlignmentRecordForRole(roleIndex);
        this.alignmentAbuse = 0;

        // Starting AC depends on role; default 10 = unarmored
        this.ac = 10;

        // cf. u_init.c:1400 — skill_init(skills_for_role())
        // Initialize weapon/spell skill caps from the role's skill table.
        skill_init(skills_for_role(roleIndex));
    }

    // Get the role name
    get roleName() {
        return roles[this.roleIndex]?.name || 'Adventurer';
    }

    // Get strength display string (handles 18/xx notation)
    // C ref: attrib.c str_string()
    get strDisplay() {
        const s = this.attributes[A_STR];
        if (s <= 18) return String(s);
        if (s === 118) return '18/**';  // STR18(100) — C ref: attrib.c str_string()
        return `18/${String(s - 18).padStart(2, '0')}`;
    }

    // Get to-hit bonus from strength
    // C ref: attrib.c abon()
    get strToHit() {
        const s = this.attributes[A_STR];
        if (s < 6) return -2;
        if (s < 8) return -1;
        if (s < 17) return 0;
        if (s <= 18) return 1;
        if (s <= 20) return 2;
        return 3;
    }

    // Get damage bonus from strength
    // C ref: attrib.c dbon()
    get strDamage() {
        const s = this.attributes[A_STR];
        if (s < 6) return -1;
        if (s < 16) return 0;
        if (s < 18) return 1;
        if (s === 18) return 2;
        if (s <= 20) return 3;
        if (s <= 22) return 4;
        return 6;
    }

    // Get AC bonus from dexterity
    get dexAC() {
        const d = this.attributes[A_DEX];
        if (d < 4) return 3;
        if (d < 6) return 2;
        if (d < 8) return 1;
        if (d < 14) return 0;
        if (d < 18) return -1;
        if (d <= 20) return -2;
        return -3;
    }

    // Add an item to inventory, assigning an inventory letter
    // C ref: invent.c addinv()
    addToInventory(obj, options = {}) {
        const withMeta = !!options?.withMeta;
        // C ref: the special mines/sokoban prize marker is cleared once the
        // hero picks the object up, allowing normal monster interactions later.
        if (obj && obj.achievement) obj.achievement = 0;

        // Keep coins in inventory for existing gameplay logic, but do not let
        // them consume a normal inventory letter slot.
        if (obj.oclass === COIN_CLASS) {
            this.gold += (obj.quan || 1);
            const existingCoin = this.inventory.find(it => it.oclass === COIN_CLASS);
            if (existingCoin) {
                existingCoin.quan = (existingCoin.quan || 1) + (obj.quan || 1);
                existingCoin.invlet = '$';
                return withMeta
                    ? { item: existingCoin, merged: true, discoveredByCompare: false }
                    : existingCoin;
            }
            obj.invlet = '$';
            this.inventory.push(obj);
            return withMeta
                ? { item: obj, merged: false, discoveredByCompare: false }
                : obj;
        }

        // C ref: invent.c mergable() — merge before assigning a new invlet.
        const canMerge = (a, b) => {
            if (!a || !b || a === b) return false;
            if (a.otyp !== b.otyp) return false;
            const od = objectData[a.otyp];
            if (!od?.merge || a.nomerge || b.nomerge) return false;
            if (a.oclass === COIN_CLASS) return true;
            if (!!a.cursed !== !!b.cursed || !!a.blessed !== !!b.blessed) return false;
            if ((a.spe ?? 0) !== (b.spe ?? 0)) return false;
            if (!!a.no_charge !== !!b.no_charge) return false;
            if (!!a.obroken !== !!b.obroken || !!a.otrapped !== !!b.otrapped) return false;
            if (!!a.lamplit !== !!b.lamplit) return false;
            if (a.oclass === FOOD_CLASS
                && ((a.oeaten ?? 0) !== (b.oeaten ?? 0) || !!a.orotten !== !!b.orotten)) {
                return false;
            }
            if ((a.oeroded ?? 0) !== (b.oeroded ?? 0) || (a.oeroded2 ?? 0) !== (b.oeroded2 ?? 0)) {
                return false;
            }
            if (!!a.greased !== !!b.greased) return false;
            if (!!a.oerodeproof !== !!b.oerodeproof) return false;
            if ((a.corpsenm ?? -1) !== (b.corpsenm ?? -1)) return false;
            if (!!a.opoisoned !== !!b.opoisoned) return false;
            return true;
        };

        const existing = this.inventory.find(it => canMerge(it, obj));
        if (existing) {
            let discoveredByCompare = false;
            if (!!existing.known !== !!obj.known) discoveredByCompare = true;
            if (!!existing.rknown !== !!obj.rknown && !!existing.oerodeproof) {
                discoveredByCompare = true;
            }
            const roleName = String(this.roleName || '');
            const roleIsCleric = roleName === 'Priest' || roleName === 'Priestess' || roleName === 'Cleric';
            if (!!existing.bknown !== !!obj.bknown && !roleIsCleric) {
                discoveredByCompare = true;
            }
            if (!!existing.known !== !!obj.known) existing.known = true;
            if (!!existing.rknown !== !!obj.rknown) existing.rknown = true;
            if (!!existing.bknown !== !!obj.bknown) existing.bknown = true;
            existing.quan = (existing.quan || 1) + (obj.quan || 1);
            existing.owt = weight(existing);
            return withMeta
                ? { item: existing, merged: true, discoveredByCompare }
                : existing;
        }

        // C ref: invent.c assigninvlet() — preserve an object's existing invlet
        // when possible, otherwise rotate from lastinvnr and wrap.
        const usedLetters = new Set(
            this.inventory
                .map(o => (o?.invlet ? String(o.invlet) : ''))
                .filter(Boolean)
        );
        const currentInvlet = String(obj?.invlet || '');
        const isAlphabeticInvlet = /^[a-zA-Z]$/.test(currentInvlet);
        if (isAlphabeticInvlet && !usedLetters.has(currentInvlet)) {
            obj.invlet = currentInvlet;
            this.inventory.push(obj);
            return obj;
        }
        const letterCount = INVENTORY_LETTERS.length;
        const start = Number.isInteger(this.lastInvlet)
            ? this.lastInvlet
            : (letterCount - 1);
        let assignedIndex = -1;
        for (let offset = 1; offset <= letterCount; offset++) {
            const idx = (start + offset) % letterCount;
            const candidate = INVENTORY_LETTERS[idx];
            if (!usedLetters.has(candidate)) {
                assignedIndex = idx;
                obj.invlet = candidate;
                break;
            }
        }
        if (assignedIndex >= 0) {
            this.lastInvlet = assignedIndex;
        } else {
            obj.invlet = '?';
        }
        this.inventory.push(obj);
        return withMeta
            ? { item: obj, merged: false, discoveredByCompare: false }
            : obj;
    }

    // Remove item from inventory
    removeFromInventory(obj) {
        const idx = this.inventory.indexOf(obj);
        if (idx >= 0) {
            if (obj.oclass === COIN_CLASS) {
                this.gold = Math.max(0, this.gold - (obj.quan || 1));
            }
            this.inventory.splice(idx, 1);
        }
    }

    // Get the effective AC (including dexterity bonus)
    get effectiveAC() {
        return this.ac + this.dexAC;
    }

    // Check if player is dead
    get isDead() {
        return this.hp <= 0;
    }

    // Take damage
    takeDamage(amount, source) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        return this.hp <= 0;
    }

    // Heal
    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.hpmax);
    }

    // C-compat aliases for struct you naming.
    get uhp() { return this.hp; }
    set uhp(v) { this.hp = v; }
    get uhpmax() { return this.hpmax; }
    set uhpmax(v) { this.hpmax = v; }
    get uen() { return this.pw; }
    set uen(v) { this.pw = v; }
    get uenmax() { return this.pwmax; }
    set uenmax(v) { this.pwmax = v; }
    get ulevel() { return this.level; }
    set ulevel(v) { this.level = v; }
    get uexp() { return this.exp; }
    set uexp(v) { this.exp = v; }
    get ux() { return this.x; }
    set ux(v) { this.x = v; }
    get uy() { return this.y; }
    set uy(v) { this.y = v; }

    // --- Intrinsic property helpers ---

    // Ensure a uprops entry exists for the given property index.
    // Returns the entry { intrinsic, extrinsic, blocked }.
    ensureUProp(prop) {
        if (!this.uprops[prop]) {
            this.uprops[prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        }
        return this.uprops[prop];
    }

    // Get the timeout value for a property (intrinsic & TIMEOUT).
    getPropTimeout(prop) {
        const entry = this.uprops[prop];
        if (!entry) return 0;
        return entry.intrinsic & TIMEOUT;
    }

    // Check if a property is active from any source (intrinsic, extrinsic, or blocked=0).
    hasProp(prop) {
        const entry = this.uprops[prop];
        if (!entry) return false;
        return (entry.intrinsic !== 0) || (entry.extrinsic !== 0);
    }

    // --- Backward-compatible getter/setters for status effects ---
    // Getters return truthy (timeout value) or falsy (0).
    // Setters accept boolean for backward compat: true → default timeout, false → clear.

    get confused() {
        return this.getPropTimeout(CONFUSION);
    }
    set confused(val) {
        const entry = this.ensureUProp(CONFUSION);
        if (val === true) {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    get stunned() {
        return this.getPropTimeout(STUNNED);
    }
    set stunned(val) {
        const entry = this.ensureUProp(STUNNED);
        if (val === true) {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    // C ref: youprop.h — Blind = (HBlinded || EBlinded) && !BBlinded
    get blind() {
        const entry = this.uprops[BLINDED];
        if (!entry) return 0;
        if (entry.blocked) return 0;
        return (entry.intrinsic & TIMEOUT) || entry.extrinsic || 0;
    }
    set blind(val) {
        const entry = this.ensureUProp(BLINDED);
        if (val === true) {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    // C ref: youprop.h — Hallucination = HHallucination && !Halluc_resistance
    get hallucinating() {
        const hh = this.getPropTimeout(HALLUC);
        if (!hh) return 0;
        const res = this.uprops[HALLUC_RES];
        if (res && (res.intrinsic || res.extrinsic)) return 0;
        return hh;
    }
    set hallucinating(val) {
        const entry = this.ensureUProp(HALLUC);
        if (val === true) {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    get sick() {
        return this.getPropTimeout(SICK);
    }
    set sick(val) {
        const entry = this.ensureUProp(SICK);
        if (val === true) {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
            this.usick_type = SICK_NONVOMITABLE;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            this.usick_type = 0;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    get foodpoisoned() {
        return (this.getPropTimeout(SICK) > 0) && (this.usick_type & SICK_VOMITABLE);
    }
    set foodpoisoned(val) {
        if (val) {
            const entry = this.ensureUProp(SICK);
            if (!(entry.intrinsic & TIMEOUT)) {
                entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | 100;
            }
            this.usick_type |= SICK_VOMITABLE;
        } else {
            this.usick_type &= ~SICK_VOMITABLE;
            // If no sickness type remains, clear the timeout
            if (!this.usick_type) {
                const entry = this.uprops[SICK];
                if (entry) entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            }
        }
    }

    // C ref: youprop.h — Fast = HFast || EFast
    get fast() {
        const entry = this.uprops[FAST];
        if (!entry) return 0;
        return entry.intrinsic || entry.extrinsic || 0;
    }
    set fast(val) {
        const entry = this.ensureUProp(FAST);
        if (val === true) {
            // C ref: role ability tables set HFast |= FROMEXPER for permanent speed.
            // Use INTRINSIC bit so it doesn't expire via timeout decrement.
            entry.intrinsic = entry.intrinsic | INTRINSIC;
        } else if (val === false || val === 0) {
            entry.intrinsic = entry.intrinsic & ~INTRINSIC & ~TIMEOUT;
        } else if (typeof val === 'number') {
            entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (val & TIMEOUT);
        }
    }

    // C ref: youprop.h — Very_fast = (HFast & ~INTRINSIC) || EFast
    get veryFast() {
        const entry = this.uprops[FAST];
        if (!entry) return 0;
        return (entry.intrinsic & ~INTRINSIC) || entry.extrinsic || 0;
    }

}
