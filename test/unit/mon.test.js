// mon.test.js — Unit tests for new mon.js exported functions
// Tests: zombie_maker, zombie_form, undead_to_corpse, genus, pm_to_cham

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    zombie_maker,
    zombie_form,
    undead_to_corpse,
    genus,
    pm_to_cham,
} from '../../js/mon.js';
import {
    mons,
    PM_KOBOLD, PM_DWARF, PM_GNOME, PM_ORC, PM_ELF, PM_HUMAN,
    PM_GIANT, PM_ETTIN, PM_VAMPIRE, PM_VAMPIRE_LEADER,
    PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE,
    PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE,
    PM_KOBOLD_MUMMY, PM_DWARF_MUMMY,
    PM_GHOUL, PM_SKELETON,
    PM_STUDENT, PM_CHIEFTAIN, PM_NEANDERTHAL, PM_ATTENDANT,
    PM_PAGE, PM_ABBOT, PM_ACOLYTE, PM_HUNTER, PM_THUG,
    PM_ROSHI, PM_GUIDE, PM_WARRIOR, PM_APPRENTICE,
    PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
    PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE,
    PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
    PM_LITTLE_DOG,
    NON_PM,
} from '../../js/monsters.js';

// ========================================================================
// zombie_maker
// ========================================================================

describe('zombie_maker', () => {
    it('returns true for human zombie (S_ZOMBIE, not ghoul/skeleton)', () => {
        // mons[PM_HUMAN_ZOMBIE] has symbol S_ZOMBIE and is not ghoul/skeleton
        const mon = { mndx: PM_HUMAN_ZOMBIE, type: mons[PM_HUMAN_ZOMBIE], mcan: 0 };
        assert.equal(zombie_maker(mon), true);
    });

    it('returns false for ghoul (S_ZOMBIE but is PM_GHOUL)', () => {
        const mon = { mndx: PM_GHOUL, type: mons[PM_GHOUL], mcan: 0 };
        assert.equal(zombie_maker(mon), false);
    });

    it('returns false for skeleton (S_ZOMBIE but is PM_SKELETON)', () => {
        const mon = { mndx: PM_SKELETON, type: mons[PM_SKELETON], mcan: 0 };
        assert.equal(zombie_maker(mon), false);
    });

    it('returns false when mcan is set (cancelled monster)', () => {
        const mon = { mndx: PM_HUMAN_ZOMBIE, type: mons[PM_HUMAN_ZOMBIE], mcan: 1 };
        assert.equal(zombie_maker(mon), false);
    });

    it('returns false for little dog (not zombie or lich)', () => {
        const mon = { mndx: PM_LITTLE_DOG, type: mons[PM_LITTLE_DOG], mcan: 0 };
        assert.equal(zombie_maker(mon), false);
    });
});

// ========================================================================
// zombie_form
// ========================================================================

describe('zombie_form', () => {
    it('returns PM_KOBOLD_ZOMBIE for kobold (S_KOBOLD)', () => {
        assert.equal(zombie_form(mons[PM_KOBOLD]), PM_KOBOLD_ZOMBIE);
    });

    it('returns PM_ORC_ZOMBIE for orc (S_ORC)', () => {
        assert.equal(zombie_form(mons[PM_ORC]), PM_ORC_ZOMBIE);
    });

    it('returns PM_GIANT_ZOMBIE for giant (S_GIANT, not ettin)', () => {
        assert.equal(zombie_form(mons[PM_GIANT]), PM_GIANT_ZOMBIE);
    });

    it('returns PM_ETTIN_ZOMBIE for ettin (S_GIANT, is ettin)', () => {
        assert.equal(zombie_form(mons[PM_ETTIN]), PM_ETTIN_ZOMBIE);
    });

    it('returns PM_ELF_ZOMBIE for elf (S_HUMAN with M2_ELF)', () => {
        // mons[PM_ELF] has S_HUMAN symbol but is_elf flag set
        assert.equal(zombie_form(mons[PM_ELF]), PM_ELF_ZOMBIE);
    });

    it('returns PM_HUMAN_ZOMBIE for human (S_HUMAN without elf flag)', () => {
        assert.equal(zombie_form(mons[PM_HUMAN]), PM_HUMAN_ZOMBIE);
    });

    it('returns PM_GNOME_ZOMBIE for gnome (S_GNOME)', () => {
        assert.equal(zombie_form(mons[PM_GNOME]), PM_GNOME_ZOMBIE);
    });

    it('returns PM_DWARF_ZOMBIE for dwarf (S_HUMANOID with dwarf flag)', () => {
        // mons[PM_DWARF] has S_HUMANOID symbol and M2_DWARF flag
        assert.equal(zombie_form(mons[PM_DWARF]), PM_DWARF_ZOMBIE);
    });

    it('returns NON_PM for zombie (already zombie)', () => {
        assert.equal(zombie_form(mons[PM_HUMAN_ZOMBIE]), NON_PM);
    });

    it('returns NON_PM for little dog (no zombie form)', () => {
        assert.equal(zombie_form(mons[PM_LITTLE_DOG]), NON_PM);
    });

    it('returns NON_PM for null', () => {
        assert.equal(zombie_form(null), NON_PM);
    });
});

// ========================================================================
// undead_to_corpse
// ========================================================================

describe('undead_to_corpse', () => {
    it('converts PM_KOBOLD_ZOMBIE to PM_KOBOLD', () => {
        assert.equal(undead_to_corpse(PM_KOBOLD_ZOMBIE), PM_KOBOLD);
    });

    it('converts PM_KOBOLD_MUMMY to PM_KOBOLD', () => {
        assert.equal(undead_to_corpse(PM_KOBOLD_MUMMY), PM_KOBOLD);
    });

    it('converts PM_DWARF_ZOMBIE to PM_DWARF', () => {
        assert.equal(undead_to_corpse(PM_DWARF_ZOMBIE), PM_DWARF);
    });

    it('converts PM_DWARF_MUMMY to PM_DWARF', () => {
        assert.equal(undead_to_corpse(PM_DWARF_MUMMY), PM_DWARF);
    });

    it('converts PM_ELF_ZOMBIE to PM_ELF', () => {
        assert.equal(undead_to_corpse(PM_ELF_ZOMBIE), PM_ELF);
    });

    it('converts PM_HUMAN_ZOMBIE to PM_HUMAN', () => {
        assert.equal(undead_to_corpse(PM_HUMAN_ZOMBIE), PM_HUMAN);
    });

    it('converts PM_VAMPIRE to PM_HUMAN', () => {
        assert.equal(undead_to_corpse(PM_VAMPIRE), PM_HUMAN);
    });

    it('converts PM_VAMPIRE_LEADER to PM_HUMAN', () => {
        assert.equal(undead_to_corpse(PM_VAMPIRE_LEADER), PM_HUMAN);
    });

    it('converts PM_GIANT_ZOMBIE to PM_GIANT', () => {
        assert.equal(undead_to_corpse(PM_GIANT_ZOMBIE), PM_GIANT);
    });

    it('converts PM_ETTIN_ZOMBIE to PM_ETTIN', () => {
        assert.equal(undead_to_corpse(PM_ETTIN_ZOMBIE), PM_ETTIN);
    });

    it('returns input unchanged for non-undead (little dog)', () => {
        assert.equal(undead_to_corpse(PM_LITTLE_DOG), PM_LITTLE_DOG);
    });
});

// ========================================================================
// genus
// ========================================================================

describe('genus', () => {
    it('returns PM_HUMAN for PM_STUDENT (mode=0)', () => {
        assert.equal(genus(PM_STUDENT, 0), PM_HUMAN);
    });

    it('returns PM_ARCHEOLOGIST for PM_STUDENT (mode=1)', () => {
        assert.equal(genus(PM_STUDENT, 1), PM_ARCHEOLOGIST);
    });

    it('returns PM_HUMAN for PM_CHIEFTAIN (mode=0)', () => {
        assert.equal(genus(PM_CHIEFTAIN, 0), PM_HUMAN);
    });

    it('returns PM_BARBARIAN for PM_CHIEFTAIN (mode=1)', () => {
        assert.equal(genus(PM_CHIEFTAIN, 1), PM_BARBARIAN);
    });

    it('returns PM_KNIGHT for PM_PAGE (mode=1)', () => {
        assert.equal(genus(PM_PAGE, 1), PM_KNIGHT);
    });

    it('returns PM_VALKYRIE for PM_WARRIOR (mode=1)', () => {
        assert.equal(genus(PM_WARRIOR, 1), PM_VALKYRIE);
    });

    it('returns PM_WIZARD for PM_APPRENTICE (mode=1)', () => {
        assert.equal(genus(PM_APPRENTICE, 1), PM_WIZARD);
    });

    it('returns PM_HUMAN for a human monster (default case)', () => {
        // PM_HUMAN itself should return PM_HUMAN via is_human check
        assert.equal(genus(PM_HUMAN, 0), PM_HUMAN);
    });

    it('returns PM_ELF for an elf monster (default case)', () => {
        assert.equal(genus(PM_ELF, 0), PM_ELF);
    });

    it('returns PM_LITTLE_DOG unchanged (no race match)', () => {
        // little dog is not human/elf/dwarf/gnome/orc — returns unchanged
        assert.equal(genus(PM_LITTLE_DOG, 0), PM_LITTLE_DOG);
    });
});

// ========================================================================
// pm_to_cham
// ========================================================================

describe('pm_to_cham', () => {
    it('returns mndx for vampire (M2_SHAPESHIFTER)', () => {
        // Vampire (PM_VAMPIRE=226) has M2_SHAPESHIFTER flag
        assert.equal(pm_to_cham(PM_VAMPIRE), PM_VAMPIRE);
    });

    it('returns NON_PM for little dog (not shapeshifter)', () => {
        assert.equal(pm_to_cham(PM_LITTLE_DOG), NON_PM);
    });

    it('returns NON_PM for NON_PM input', () => {
        assert.equal(pm_to_cham(NON_PM), NON_PM);
    });
});
