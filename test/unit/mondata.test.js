// mondata.test.js — Unit tests for new mondata.js exported functions
// Tests: dmgtype_fromattack, dmgtype, noattacks, ranged_attk,
//        hates_silver, hates_blessings, mon_hates_silver, mon_hates_blessings,
//        sticks, cantvomit, num_horns, sliparm, breakarm,
//        haseyes, hates_light, mon_hates_light, poly_when_stoned, can_track,
//        can_blow, can_chant, can_be_strangled,
//        little_to_big, big_to_little, big_little_match, same_race,
//        is_mind_flayer, is_unicorn, is_rider, is_longworm,
//        levl_follower,
//        pm_resistance, immune_poisongas, is_flyer, is_swimmer, tunnels, needspick,
//        is_floater, noncorporeal, is_whirly, cant_drown, grounded, ceiling_hider,
//        eyecount, has_head, has_horns, is_wooden, hug_throttles, flaming, is_silent,
//        is_vampire, passes_rocks, is_male, is_female, is_neuter, type_is_pname,
//        is_lord, is_prince, is_ndemon, is_dlord, is_dprince, polyok,
//        extra_nasty, throws_rocks, is_armed, cantwield, could_twoweap, cantweararm,
//        digests, enfolds, slimeproof, eggs_in_water, telepathic, webmaker,
//        is_mplayer, is_watch, is_placeholder, is_reviver, unique_corpstat, emits_light,
//        likes_lava, pm_invisible, likes_fire, touch_petrifies, flesh_petrifies,
//        weirdnonliving, nonliving, completelyburns, completelyrots, completelyrusts,
//        is_bat, is_bird, vegan, vegetarian, corpse_eater, likes_objs (fixed),
//        befriend_with_obj

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    dmgtype_fromattack, dmgtype,
    noattacks, ranged_attk,
    hates_silver, hates_blessings,
    mon_hates_silver, mon_hates_blessings,
    sticks, cantvomit, num_horns,
    sliparm, breakarm,
    haseyes, hates_light, mon_hates_light,
    poly_when_stoned, can_track,
    can_blow, can_chant, can_be_strangled,
    little_to_big, big_to_little, big_little_match, same_race,
    is_mind_flayer, is_unicorn, is_rider, is_longworm,
    levl_follower,
    pm_resistance, immune_poisongas,
    is_flyer, is_swimmer, tunnels, needspick,
    is_floater, noncorporeal, is_whirly, cant_drown, grounded, ceiling_hider,
    eyecount, has_head, has_horns,
    is_wooden, hug_throttles, flaming, is_silent,
    is_vampire, passes_rocks,
    is_male, is_female, is_neuter, type_is_pname,
    is_lord, is_prince, is_ndemon, is_dlord, is_dprince, polyok,
    extra_nasty, throws_rocks,
    is_armed, cantwield, could_twoweap, cantweararm,
    digests, enfolds, slimeproof, eggs_in_water, telepathic, webmaker,
    is_mplayer, is_watch, is_placeholder, is_reviver, unique_corpstat, emits_light,
    likes_lava, pm_invisible, likes_fire, touch_petrifies, flesh_petrifies,
    weirdnonliving, nonliving, completelyburns, completelyrots, completelyrusts,
    is_bat, is_bird, vegan, vegetarian, corpse_eater, likes_objs,
    befriend_with_obj,
} from '../../js/mondata.js';
import {
    mons,
    PM_LITTLE_DOG, PM_DOG, PM_LARGE_DOG,
    PM_WEREWOLF, PM_VAMPIRE, PM_SHADE, PM_TENGU,
    PM_ROCK_MOLE, PM_WOODCHUCK, PM_HORSE, PM_WARHORSE,
    PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_KI_RIN,
    PM_HORNED_DEVIL, PM_MINOTAUR, PM_ASMODEUS, PM_BALROG,
    PM_GAS_SPORE, PM_GREMLIN, PM_STONE_GOLEM, PM_IRON_GOLEM,
    PM_KILLER_BEE,
    PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER,
    PM_DEATH, PM_FAMINE, PM_PESTILENCE,
    PM_LONG_WORM, PM_LONG_WORM_TAIL, PM_BABY_LONG_WORM,
    PM_PONY,
    PM_ELF, PM_GREY_ELF, PM_ELF_NOBLE,
    PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_WATER_ELEMENTAL,
    PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_SHOCKING_SPHERE, PM_SALAMANDER,
    PM_CYCLOPS, PM_FLOATING_EYE,
    PM_STALKER, PM_BLACK_LIGHT,
    PM_WOOD_GOLEM, PM_ROPE_GOLEM, PM_PAPER_GOLEM, PM_STRAW_GOLEM,
    PM_FLESH_GOLEM, PM_LEATHER_GOLEM,
    PM_HEZROU, PM_VROCK,
    PM_COCKATRICE, PM_CHICKATRICE, PM_MEDUSA,
    PM_CAVE_SPIDER, PM_GIANT_SPIDER,
    PM_WATCHMAN, PM_WATCH_CAPTAIN,
    PM_ARCHEOLOGIST, PM_WIZARD,
    PM_ORC, PM_GIANT, PM_HUMAN,
    PM_MANES, PM_JUIBLEX, PM_ORCUS,
    PM_DWARF,
    PM_PURPLE_WORM, PM_BABY_PURPLE_WORM, PM_GHOUL, PM_PIRANHA,
    PM_BLACK_PUDDING, PM_GREEN_SLIME,
    PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT,
    PM_BABY_GOLD_DRAGON, PM_GOLD_DRAGON,
    PM_VAMPIRE_LEADER,
    PM_MONKEY, PM_APE, PM_LICHEN, PM_GOBLIN,
    MR_FIRE, MR_COLD, MR_POISON, MR_STONE,
    AT_CLAW, AT_BITE, AT_WEAP, AT_ENGL,
    AD_STCK, AD_FIRE, AD_DGST, AD_WRAP,
    G_UNIQ,
} from '../../js/monsters.js';
import { AMULET_OF_YENDOR, FOOD_CLASS, BANANA, CORPSE, TRIPE_RATION,
         CARROT } from '../../js/objects.js';

// ========================================================================
// noattacks
// ========================================================================

describe('noattacks', () => {
    it('returns true for gas spore (only AT_BOOM passive attack)', () => {
        // gas spore has only AT_BOOM which is a passive death explosion
        assert.equal(noattacks(mons[PM_GAS_SPORE]), true);
    });

    it('returns true for acid blob (all AT_NONE attacks)', () => {
        // acid blob has type:0 (AT_NONE) attacks — no active attack
        assert.equal(noattacks(mons[6]), true);
    });

    it('returns false for little dog (has AT_BITE)', () => {
        assert.equal(noattacks(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// dmgtype_fromattack and dmgtype
// ========================================================================

describe('dmgtype_fromattack', () => {
    it('returns true for large mimic with AD_STCK from AT_CLAW', () => {
        // large mimic (mons[65]) has AT_CLAW with AD_STCK damage
        assert.equal(dmgtype_fromattack(mons[65], AD_STCK, AT_CLAW), true);
    });

    it('returns false for large mimic with AD_STCK from AT_BITE (wrong attack type)', () => {
        assert.equal(dmgtype_fromattack(mons[65], AD_STCK, AT_BITE), false);
    });

    it('returns false for little dog with AD_STCK', () => {
        assert.equal(dmgtype_fromattack(mons[PM_LITTLE_DOG], AD_STCK, AT_CLAW), false);
    });
});

describe('dmgtype', () => {
    it('returns true for large mimic with AD_STCK (sticking damage)', () => {
        assert.equal(dmgtype(mons[65], AD_STCK), true);
    });

    it('returns false for little dog with AD_STCK', () => {
        assert.equal(dmgtype(mons[PM_LITTLE_DOG], AD_STCK), false);
    });

    it('returns false for little dog with AD_FIRE', () => {
        assert.equal(dmgtype(mons[PM_LITTLE_DOG], AD_FIRE), false);
    });
});

// ========================================================================
// ranged_attk
// ========================================================================

describe('ranged_attk', () => {
    it('returns true for winter wolf cub (has AT_BREA breath attack)', () => {
        // mons[22] = winter wolf cub, has AT_BREA
        assert.equal(ranged_attk(mons[22]), true);
    });

    it('returns false for little dog (melee only)', () => {
        assert.equal(ranged_attk(mons[PM_LITTLE_DOG]), false);
    });

    it('returns false for large mimic (claw only)', () => {
        assert.equal(ranged_attk(mons[65]), false);
    });
});

// ========================================================================
// hates_silver
// ========================================================================

describe('hates_silver', () => {
    it('returns true for werewolf (M2_WERE flag)', () => {
        assert.equal(hates_silver(mons[PM_WEREWOLF]), true);
    });

    it('returns true for vampire (S_VAMPIRE symbol)', () => {
        assert.equal(hates_silver(mons[PM_VAMPIRE]), true);
    });

    it('returns true for shade (specific PM_SHADE identity)', () => {
        assert.equal(hates_silver(mons[PM_SHADE]), true);
    });

    it('returns false for tengu (S_IMP symbol but is PM_TENGU exception)', () => {
        assert.equal(hates_silver(mons[PM_TENGU]), false);
    });

    it('returns false for little dog', () => {
        assert.equal(hates_silver(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// hates_blessings
// ========================================================================

describe('hates_blessings', () => {
    it('returns true for lich (M2_UNDEAD)', () => {
        // mons[183] = lich, is undead
        assert.equal(hates_blessings(mons[183]), true);
    });

    it('returns false for little dog', () => {
        assert.equal(hates_blessings(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// mon_hates_silver / mon_hates_blessings
// ========================================================================

describe('mon_hates_silver', () => {
    it('returns true for a werewolf monster instance', () => {
        const mon = { mnum: PM_WEREWOLF };
        assert.equal(mon_hates_silver(mon), true);
    });

    it('returns false for a little dog monster instance', () => {
        const mon = { mnum: PM_LITTLE_DOG };
        assert.equal(mon_hates_silver(mon), false);
    });

    it('returns false for a monster with no mnum', () => {
        const mon = {};
        assert.equal(mon_hates_silver(mon), false);
    });
});

describe('mon_hates_blessings', () => {
    it('returns true for a lich monster instance', () => {
        const mon = { mnum: 183 }; // lich
        assert.equal(mon_hates_blessings(mon), true);
    });

    it('returns false for a little dog monster instance', () => {
        const mon = { mnum: PM_LITTLE_DOG };
        assert.equal(mon_hates_blessings(mon), false);
    });
});

// ========================================================================
// sticks
// ========================================================================

describe('sticks', () => {
    it('returns true for large mimic (has AD_STCK damage)', () => {
        assert.equal(sticks(mons[65]), true);
    });

    it('returns true for python (has AT_HUGS)', () => {
        // mons[217] = python, has AT_HUGS
        assert.equal(sticks(mons[217]), true);
    });

    it('returns false for little dog', () => {
        assert.equal(sticks(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// cantvomit
// ========================================================================

describe('cantvomit', () => {
    it('returns true for sewer rat (S_RODENT, not rock mole or woodchuck)', () => {
        // mons[88] = sewer rat
        assert.equal(cantvomit(mons[88]), true);
    });

    it('returns false for rock mole (S_RODENT but is PM_ROCK_MOLE exception)', () => {
        assert.equal(cantvomit(mons[PM_ROCK_MOLE]), false);
    });

    it('returns false for woodchuck (S_RODENT but is PM_WOODCHUCK exception)', () => {
        assert.equal(cantvomit(mons[PM_WOODCHUCK]), false);
    });

    it('returns true for warhorse (PM_WARHORSE)', () => {
        assert.equal(cantvomit(mons[PM_WARHORSE]), true);
    });

    it('returns true for horse (PM_HORSE)', () => {
        assert.equal(cantvomit(mons[PM_HORSE]), true);
    });

    it('returns false for little dog', () => {
        assert.equal(cantvomit(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// num_horns
// ========================================================================

describe('num_horns', () => {
    it('returns 1 for white unicorn', () => {
        assert.equal(num_horns(mons[PM_WHITE_UNICORN]), 1);
    });

    it('returns 1 for gray unicorn', () => {
        assert.equal(num_horns(mons[PM_GRAY_UNICORN]), 1);
    });

    it('returns 1 for black unicorn', () => {
        assert.equal(num_horns(mons[PM_BLACK_UNICORN]), 1);
    });

    it('returns 1 for ki-rin', () => {
        assert.equal(num_horns(mons[PM_KI_RIN]), 1);
    });

    it('returns 2 for minotaur', () => {
        assert.equal(num_horns(mons[PM_MINOTAUR]), 2);
    });

    it('returns 2 for horned devil', () => {
        assert.equal(num_horns(mons[PM_HORNED_DEVIL]), 2);
    });

    it('returns 2 for Asmodeus', () => {
        assert.equal(num_horns(mons[PM_ASMODEUS]), 2);
    });

    it('returns 2 for Balrog', () => {
        assert.equal(num_horns(mons[PM_BALROG]), 2);
    });

    it('returns 0 for little dog', () => {
        assert.equal(num_horns(mons[PM_LITTLE_DOG]), 0);
    });
});

// ========================================================================
// sliparm
// ========================================================================

describe('sliparm', () => {
    it('returns true for acid blob (MZ_TINY, size <= MZ_SMALL)', () => {
        // mons[6] = acid blob, size=0=MZ_TINY
        assert.equal(sliparm(mons[6]), true);
    });

    it('returns true for little dog (MZ_SMALL, size <= MZ_SMALL)', () => {
        // little dog has size=1=MZ_SMALL
        assert.equal(sliparm(mons[PM_LITTLE_DOG]), true);
    });

    it('returns true for shade (S_GHOST symbol = noncorporeal)', () => {
        assert.equal(sliparm(mons[PM_SHADE]), true);
    });

    it('returns false for minotaur (large humanoid, not ghost/vortex)', () => {
        // minotaur has size=3=MZ_LARGE > MZ_SMALL
        assert.equal(sliparm(mons[PM_MINOTAUR]), false);
    });
});

// ========================================================================
// breakarm
// ========================================================================

describe('breakarm', () => {
    it('returns true for large mimic (MZ_LARGE, bigmonst)', () => {
        // large mimic: not sliparm (size=3>MZ_SMALL, not ghost), bigmonst (size>=MZ_LARGE)
        assert.equal(breakarm(mons[65]), true);
    });

    it('returns false for acid blob (sliparm is true, so breakarm false)', () => {
        assert.equal(breakarm(mons[6]), false);
    });

    it('returns false for little dog (sliparm is true, size=MZ_SMALL)', () => {
        assert.equal(breakarm(mons[PM_LITTLE_DOG]), false);
    });

    it('returns true for minotaur (MZ_LARGE, bigmonst)', () => {
        assert.equal(breakarm(mons[PM_MINOTAUR]), true);
    });
});

// ========================================================================
// haseyes
// ========================================================================

describe('haseyes', () => {
    it('returns true for little dog (has eyes)', () => {
        assert.equal(haseyes(mons[PM_LITTLE_DOG]), true);
    });

    it('returns true for human (has eyes)', () => {
        // mons[183] = lich (has eyes as an ex-human)
        assert.equal(haseyes(mons[183]), true);
    });

    it('returns false for quivering blob (PM_QUIVERING_BLOB — M1_NOEYES)', () => {
        // quivering blob has M1_NOEYES (gas spore does not — it IS an eye type)
        assert.equal(haseyes(mons[7]), false); // PM_QUIVERING_BLOB = 7
    });
});

// ========================================================================
// hates_light / mon_hates_light
// ========================================================================

describe('hates_light', () => {
    it('returns true for gremlin (only light-hating monster)', () => {
        assert.equal(hates_light(mons[PM_GREMLIN]), true);
    });

    it('returns false for little dog', () => {
        assert.equal(hates_light(mons[PM_LITTLE_DOG]), false);
    });

    it('returns false for vampire (not PM_GREMLIN)', () => {
        assert.equal(hates_light(mons[PM_VAMPIRE]), false);
    });
});

describe('mon_hates_light', () => {
    it('returns true for a gremlin monster instance', () => {
        const mon = { mnum: PM_GREMLIN };
        assert.equal(mon_hates_light(mon), true);
    });

    it('returns false for a little dog monster instance', () => {
        const mon = { mnum: PM_LITTLE_DOG };
        assert.equal(mon_hates_light(mon), false);
    });
});

// ========================================================================
// poly_when_stoned
// ========================================================================

describe('poly_when_stoned', () => {
    it('returns true for iron golem (golem, not stone golem)', () => {
        assert.equal(poly_when_stoned(mons[PM_IRON_GOLEM]), true);
    });

    it('returns false for stone golem itself', () => {
        assert.equal(poly_when_stoned(mons[PM_STONE_GOLEM]), false);
    });

    it('returns false for little dog (not a golem)', () => {
        assert.equal(poly_when_stoned(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// can_track
// ========================================================================

describe('can_track', () => {
    it('returns true for little dog (has eyes)', () => {
        assert.equal(can_track(mons[PM_LITTLE_DOG]), true);
    });

    it('returns false for quivering blob (no eyes, no Excalibur)', () => {
        assert.equal(can_track(mons[7]), false); // PM_QUIVERING_BLOB
    });

    it('returns true for quivering blob when wieldsExcalibur=true', () => {
        assert.equal(can_track(mons[7], true), true); // PM_QUIVERING_BLOB
    });

    it('returns true for gremlin (has eyes)', () => {
        assert.equal(can_track(mons[PM_GREMLIN]), true);
    });
});

// ========================================================================
// can_blow
// ========================================================================

describe('can_blow', () => {
    it('returns true for little dog (has sound, has head, not breathless)', () => {
        assert.equal(can_blow(mons[PM_LITTLE_DOG]), true);
    });

    it('returns false for acid blob (MS_SILENT + M1_BREATHLESS)', () => {
        // acid blob is silent and breathless — can_blow returns false
        assert.equal(can_blow(mons[6]), false); // PM_ACID_BLOB = 6
    });

    it('returns false for killer bee (MS_BUZZ + MZ_TINY)', () => {
        // killer bee: MS_BUZZ and verysmall (MZ_TINY) — can_blow returns false
        assert.equal(can_blow(mons[PM_KILLER_BEE]), false);
    });

    it('returns false when isStrangled=true even for little dog', () => {
        assert.equal(can_blow(mons[PM_LITTLE_DOG], true), false);
    });
});

// ========================================================================
// can_chant
// ========================================================================

describe('can_chant', () => {
    it('returns true for little dog (has sound, has head, not silent)', () => {
        assert.equal(can_chant(mons[PM_LITTLE_DOG]), true);
    });

    it('returns false for acid blob (MS_SILENT)', () => {
        assert.equal(can_chant(mons[6]), false); // PM_ACID_BLOB = 6
    });

    it('returns false for killer bee (MS_BUZZ)', () => {
        assert.equal(can_chant(mons[PM_KILLER_BEE]), false);
    });

    it('returns false when isStrangled=true even for little dog', () => {
        assert.equal(can_chant(mons[PM_LITTLE_DOG], true), false);
    });

    it('returns false for quivering blob (MS_SILENT, M1_NOHEAD)', () => {
        assert.equal(can_chant(mons[7]), false); // PM_QUIVERING_BLOB = 7
    });
});

// ========================================================================
// can_be_strangled
// ========================================================================

describe('can_be_strangled', () => {
    it('returns true for little dog (has head, not mindless, not breathless)', () => {
        assert.equal(can_be_strangled(mons[PM_LITTLE_DOG]), true);
    });

    it('returns false for acid blob (M1_NOHEAD)', () => {
        // acid blob has M1_NOHEAD — no head means no strangulation
        assert.equal(can_be_strangled(mons[6]), false); // PM_ACID_BLOB = 6
    });

    it('returns false for quivering blob (M1_NOHEAD)', () => {
        assert.equal(can_be_strangled(mons[7]), false); // PM_QUIVERING_BLOB = 7
    });

    it('returns true for killer bee (has head, not mindless, not breathless)', () => {
        // killer bee has no M1_NOHEAD, no M1_MINDLESS, no M1_BREATHLESS
        assert.equal(can_be_strangled(mons[PM_KILLER_BEE]), true);
    });

    it('returns true for werewolf (mindless=false, breathless=false, has head)', () => {
        // werewolf is not mindless nor breathless — can be strangled
        assert.equal(can_be_strangled(mons[PM_WEREWOLF]), true);
    });
});

// ========================================================================
// is_mind_flayer, is_unicorn, is_rider, is_longworm
// ========================================================================

describe('is_mind_flayer', () => {
    it('returns true for mind flayer', () => {
        assert.equal(is_mind_flayer(mons[PM_MIND_FLAYER]), true);
    });
    it('returns true for master mind flayer', () => {
        assert.equal(is_mind_flayer(mons[PM_MASTER_MIND_FLAYER]), true);
    });
    it('returns false for little dog', () => {
        assert.equal(is_mind_flayer(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_unicorn', () => {
    it('returns true for white unicorn (S_UNICORN + likes_gems)', () => {
        assert.equal(is_unicorn(mons[PM_WHITE_UNICORN]), true);
    });
    it('returns true for gray unicorn (S_UNICORN + likes_gems)', () => {
        assert.equal(is_unicorn(mons[PM_GRAY_UNICORN]), true);
    });
    it('returns false for ki-rin (S_ANGEL, not S_UNICORN)', () => {
        // ki-rin is classified as S_ANGEL in monsters.js — not S_UNICORN
        assert.equal(is_unicorn(mons[PM_KI_RIN]), false);
    });
    it('returns false for little dog', () => {
        assert.equal(is_unicorn(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_rider', () => {
    it('returns true for Death', () => {
        assert.equal(is_rider(mons[PM_DEATH]), true);
    });
    it('returns true for Famine', () => {
        assert.equal(is_rider(mons[PM_FAMINE]), true);
    });
    it('returns true for Pestilence', () => {
        assert.equal(is_rider(mons[PM_PESTILENCE]), true);
    });
    it('returns false for little dog', () => {
        assert.equal(is_rider(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_longworm', () => {
    it('returns true for long worm', () => {
        assert.equal(is_longworm(mons[PM_LONG_WORM]), true);
    });
    it('returns true for baby long worm', () => {
        assert.equal(is_longworm(mons[PM_BABY_LONG_WORM]), true);
    });
    it('returns true for long worm tail', () => {
        assert.equal(is_longworm(mons[PM_LONG_WORM_TAIL]), true);
    });
    it('returns false for little dog', () => {
        assert.equal(is_longworm(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// little_to_big, big_to_little, big_little_match
// ========================================================================

describe('little_to_big', () => {
    it('returns PM_DOG for PM_LITTLE_DOG', () => {
        assert.equal(little_to_big(PM_LITTLE_DOG), PM_DOG);
    });
    it('returns PM_LARGE_DOG for PM_DOG', () => {
        assert.equal(little_to_big(PM_DOG), PM_LARGE_DOG);
    });
    it('returns PM_WARHORSE for PM_HORSE', () => {
        assert.equal(little_to_big(PM_HORSE), PM_WARHORSE);
    });
    it('returns same index for PM_WARHORSE (no grown-up form)', () => {
        assert.equal(little_to_big(PM_WARHORSE), PM_WARHORSE);
    });
    it('returns PM_ELF_NOBLE for PM_GREY_ELF', () => {
        assert.equal(little_to_big(PM_GREY_ELF), PM_ELF_NOBLE);
    });
});

describe('big_to_little', () => {
    it('returns PM_LITTLE_DOG for PM_DOG', () => {
        assert.equal(big_to_little(PM_DOG), PM_LITTLE_DOG);
    });
    it('returns PM_DOG for PM_LARGE_DOG', () => {
        assert.equal(big_to_little(PM_LARGE_DOG), PM_DOG);
    });
    it('returns PM_PONY for PM_HORSE', () => {
        assert.equal(big_to_little(PM_HORSE), PM_PONY);
    });
    it('returns same index for PM_LITTLE_DOG (no juvenile form)', () => {
        assert.equal(big_to_little(PM_LITTLE_DOG), PM_LITTLE_DOG);
    });
});

describe('big_little_match', () => {
    it('returns true for PM_LITTLE_DOG and PM_DOG (direct growth)', () => {
        assert.equal(big_little_match(PM_LITTLE_DOG, PM_DOG), true);
    });
    it('returns true for PM_LITTLE_DOG and PM_LARGE_DOG (two-step growth)', () => {
        assert.equal(big_little_match(PM_LITTLE_DOG, PM_LARGE_DOG), true);
    });
    it('returns true for same index', () => {
        assert.equal(big_little_match(PM_LITTLE_DOG, PM_LITTLE_DOG), true);
    });
    it('returns false for little dog and horse (different symbol classes)', () => {
        assert.equal(big_little_match(PM_LITTLE_DOG, PM_HORSE), false);
    });
});

// ========================================================================
// same_race
// ========================================================================

describe('same_race', () => {
    it('returns true for same monster', () => {
        assert.equal(same_race(mons[PM_LITTLE_DOG], mons[PM_LITTLE_DOG]), true);
    });

    it('returns true for two elves (is_elf branch)', () => {
        // all elves have M2_ELF
        assert.equal(same_race(mons[PM_ELF], mons[PM_GREY_ELF]), true);
    });

    it('returns false for elf and little dog', () => {
        assert.equal(same_race(mons[PM_ELF], mons[PM_LITTLE_DOG]), false);
    });

    it('returns true for mind flayer and master mind flayer', () => {
        assert.equal(same_race(mons[PM_MIND_FLAYER], mons[PM_MASTER_MIND_FLAYER]), true);
    });

    it('returns true for two unicorns', () => {
        assert.equal(same_race(mons[PM_WHITE_UNICORN], mons[PM_GRAY_UNICORN]), true);
    });

    it('returns true for Death and Famine (both riders)', () => {
        assert.equal(same_race(mons[PM_DEATH], mons[PM_FAMINE]), true);
    });

    it('returns false for Death and little dog', () => {
        assert.equal(same_race(mons[PM_DEATH], mons[PM_LITTLE_DOG]), false);
    });

    it('returns true for little dog and large dog (grow-up chain)', () => {
        assert.equal(same_race(mons[PM_LITTLE_DOG], mons[PM_LARGE_DOG]), true);
    });

    it('returns false for tengu and imp (tengu exception)', () => {
        // tengu is S_IMP but does not match imps
        assert.equal(same_race(mons[PM_TENGU], mons[PM_TENGU - 1]), false);
    });
});

// ========================================================================
// levl_follower (C ref: mondata.c:1211)
// ========================================================================

describe('levl_follower', () => {
    function makeMon(overrides = {}) {
        return { type: mons[PM_DOG], tame: 0, iswiz: false, isshk: false,
                 following: false, flee: false, minvent: [], ...overrides };
    }

    it('steed always follows (mtmp == u.usteed)', () => {
        const mon = makeMon();
        const player = { usteed: mon, inventory: [] };
        assert.equal(levl_follower(mon, player), true);
    });

    it('tame monster always follows', () => {
        const mon = makeMon({ tame: 5 });
        assert.equal(levl_follower(mon, { inventory: [] }), true);
    });

    it('wizard follows (iswiz=true, no amulet)', () => {
        const mon = makeMon({ iswiz: true });
        assert.equal(levl_follower(mon, { inventory: [] }), true);
    });

    it('wizard with Amulet of Yendor does NOT follow', () => {
        const amulet = { otyp: AMULET_OF_YENDOR };
        const mon = makeMon({ iswiz: true, minvent: [amulet] });
        assert.equal(levl_follower(mon, { inventory: [] }), false);
    });

    it('following shopkeeper follows (is_fshk)', () => {
        const mon = makeMon({ isshk: true, following: true });
        assert.equal(levl_follower(mon, { inventory: [] }), true);
    });

    it('non-following shopkeeper does not follow via is_fshk path', () => {
        // isshk but not following — falls through to M2_STALK check
        // PM_DOG has no M2_STALK, so should be false
        const mon = makeMon({ isshk: true, following: false });
        assert.equal(levl_follower(mon, { inventory: [] }), false);
    });

    it('stalking monster (Death) follows when not fleeing', () => {
        const mon = makeMon({ type: mons[PM_DEATH], flee: false });
        assert.equal(levl_follower(mon, { inventory: [] }), true);
    });

    it('stalking monster fleeing does NOT follow (no player amulet)', () => {
        const mon = makeMon({ type: mons[PM_DEATH], flee: true });
        assert.equal(levl_follower(mon, { inventory: [] }), false);
    });

    it('stalking monster fleeing DOES follow when player has Amulet of Yendor', () => {
        const mon = makeMon({ type: mons[PM_DEATH], flee: true });
        const player = { inventory: [{ otyp: AMULET_OF_YENDOR }] };
        assert.equal(levl_follower(mon, player), true);
    });

    it('non-stalking, non-tame monster does not follow', () => {
        // PM_GRID_BUG has no M2_STALK
        const gridBugIdx = mons.findIndex(m => m.name === 'grid bug');
        const mon = makeMon({ type: mons[gridBugIdx] });
        assert.equal(levl_follower(mon, { inventory: [] }), false);
    });
});

// ========================================================================
// pm_resistance / immune_poisongas
// ========================================================================

describe('pm_resistance', () => {
    it('returns true for fire elemental vs MR_FIRE', () => {
        assert.equal(pm_resistance(mons[PM_FIRE_ELEMENTAL], MR_FIRE), true);
    });
    it('returns false for little dog vs MR_COLD', () => {
        assert.equal(pm_resistance(mons[PM_LITTLE_DOG], MR_COLD), false);
    });
    it('returns true for cockatrice vs MR_STONE (stoning resistance)', () => {
        assert.equal(pm_resistance(mons[PM_COCKATRICE], MR_STONE), true);
    });
});

describe('immune_poisongas', () => {
    it('returns true for hezrou', () => {
        assert.equal(immune_poisongas(mons[PM_HEZROU]), true);
    });
    it('returns true for vrock', () => {
        assert.equal(immune_poisongas(mons[PM_VROCK]), true);
    });
    it('returns false for little dog', () => {
        assert.equal(immune_poisongas(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// Movement predicate aliases
// ========================================================================

describe('is_flyer / is_swimmer / tunnels / needspick', () => {
    it('is_flyer: bat flies', () => {
        assert.equal(is_flyer(mons[PM_BAT]), true);
    });
    it('is_flyer: little dog does not fly', () => {
        assert.equal(is_flyer(mons[PM_LITTLE_DOG]), false);
    });
    it('is_swimmer: water elemental swims', () => {
        assert.equal(is_swimmer(mons[PM_WATER_ELEMENTAL]), true);
    });
    it('tunnels: rock mole tunnels', () => {
        assert.equal(tunnels(mons[PM_ROCK_MOLE]), true);
    });
    it('needspick: dwarf needs pick (M1_NEEDPICK)', () => {
        assert.equal(needspick(mons[PM_DWARF]), true);
    });
    it('needspick: little dog does not need pick', () => {
        assert.equal(needspick(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_floater / noncorporeal / is_whirly', () => {
    it('is_floater: floating eye is a floater (S_EYE)', () => {
        assert.equal(is_floater(mons[PM_FLOATING_EYE]), true);
    });
    it('is_floater: little dog is not a floater', () => {
        assert.equal(is_floater(mons[PM_LITTLE_DOG]), false);
    });
    it('noncorporeal: shade is noncorporeal (S_GHOST)', () => {
        assert.equal(noncorporeal(mons[PM_SHADE]), true);
    });
    it('noncorporeal: little dog is not noncorporeal', () => {
        assert.equal(noncorporeal(mons[PM_LITTLE_DOG]), false);
    });
    it('is_whirly: fire vortex is whirly', () => {
        assert.equal(is_whirly(mons[PM_FIRE_VORTEX]), true);
    });
    it('is_whirly: air elemental is whirly', () => {
        assert.equal(is_whirly(mons[PM_AIR_ELEMENTAL]), true);
    });
    it('is_whirly: little dog is not whirly', () => {
        assert.equal(is_whirly(mons[PM_LITTLE_DOG]), false);
    });
});

describe('cant_drown / grounded', () => {
    it('cant_drown: water elemental (swimmer) cannot drown', () => {
        assert.equal(cant_drown(mons[PM_WATER_ELEMENTAL]), true);
    });
    it('cant_drown: iron golem (breathless) cannot drown', () => {
        assert.equal(cant_drown(mons[PM_IRON_GOLEM]), true);
    });
    it('cant_drown: little dog can drown', () => {
        assert.equal(cant_drown(mons[PM_LITTLE_DOG]), false);
    });
    it('grounded: little dog is grounded (with ceiling)', () => {
        assert.equal(grounded(mons[PM_LITTLE_DOG], true), true);
    });
    it('grounded: bat is not grounded (flies)', () => {
        assert.equal(grounded(mons[PM_BAT], true), false);
    });
    it('grounded: floating eye is not grounded (floater)', () => {
        assert.equal(grounded(mons[PM_FLOATING_EYE], true), false);
    });
});

// ========================================================================
// Body type predicates
// ========================================================================

describe('ceiling_hider / eyecount', () => {
    it('ceiling_hider: rock piercer (clinger+hider, not mimic) is ceiling hider', () => {
        const piercerIdx = mons.findIndex(m => m && m.name === 'rock piercer');
        assert.equal(ceiling_hider(mons[piercerIdx]), true);
    });
    it('eyecount: floating eye has 1 eye', () => {
        assert.equal(eyecount(mons[PM_FLOATING_EYE]), 1);
    });
    it('eyecount: cyclops has 1 eye', () => {
        assert.equal(eyecount(mons[PM_CYCLOPS]), 1);
    });
    it('eyecount: little dog has 2 eyes', () => {
        assert.equal(eyecount(mons[PM_LITTLE_DOG]), 2);
    });
    it('eyecount: acid blob (M1_NOEYES) has 0 eyes', () => {
        const acidBlobIdx = mons.findIndex(m => m && m.name === 'acid blob');
        assert.equal(eyecount(mons[acidBlobIdx]), 0);
    });
});

describe('has_head / has_horns', () => {
    it('has_head: little dog has a head', () => {
        assert.equal(has_head(mons[PM_LITTLE_DOG]), true);
    });
    it('has_head: acid blob has no head (M1_NOHEAD)', () => {
        const acidBlobIdx = mons.findIndex(m => m && m.name === 'acid blob');
        assert.equal(has_head(mons[acidBlobIdx]), false);
    });
    it('has_horns: minotaur has horns', () => {
        assert.equal(has_horns(mons[PM_MINOTAUR]), true);
    });
    it('has_horns: little dog has no horns', () => {
        assert.equal(has_horns(mons[PM_LITTLE_DOG]), false);
    });
    it('has_horns: gray unicorn has 1 horn', () => {
        assert.equal(has_horns(mons[PM_GRAY_UNICORN]), true);
    });
});

describe('is_wooden / hug_throttles / flaming / is_silent / is_vampire', () => {
    it('is_wooden: wood golem is wooden', () => {
        assert.equal(is_wooden(mons[PM_WOOD_GOLEM]), true);
    });
    it('is_wooden: stone golem is not wooden', () => {
        assert.equal(is_wooden(mons[PM_STONE_GOLEM]), false);
    });
    it('hug_throttles: rope golem throttles', () => {
        assert.equal(hug_throttles(mons[PM_ROPE_GOLEM]), true);
    });
    it('hug_throttles: wood golem does not throttle', () => {
        assert.equal(hug_throttles(mons[PM_WOOD_GOLEM]), false);
    });
    it('flaming: fire elemental is flaming', () => {
        assert.equal(flaming(mons[PM_FIRE_ELEMENTAL]), true);
    });
    it('flaming: flaming sphere is flaming', () => {
        assert.equal(flaming(mons[PM_FLAMING_SPHERE]), true);
    });
    it('flaming: little dog is not flaming', () => {
        assert.equal(flaming(mons[PM_LITTLE_DOG]), false);
    });
    it('is_silent: iron golem is silent (MS_SILENT)', () => {
        assert.equal(is_silent(mons[PM_IRON_GOLEM]), true);
    });
    it('is_silent: little dog is not silent', () => {
        assert.equal(is_silent(mons[PM_LITTLE_DOG]), false);
    });
    it('is_vampire: vampire is S_VAMPIRE', () => {
        assert.equal(is_vampire(mons[PM_VAMPIRE]), true);
    });
    it('is_vampire: vampire leader is S_VAMPIRE', () => {
        assert.equal(is_vampire(mons[PM_VAMPIRE_LEADER]), true);
    });
    it('is_vampire: little dog is not S_VAMPIRE', () => {
        assert.equal(is_vampire(mons[PM_LITTLE_DOG]), false);
    });
});

describe('passes_rocks', () => {
    it('xorn passes rocks (passes_walls && !unsolid)', () => {
        const xornIdx = mons.findIndex(m => m.name === 'xorn');
        assert.equal(passes_rocks(mons[xornIdx]), true);
    });
    it('shade does not pass rocks (is unsolid)', () => {
        assert.equal(passes_rocks(mons[PM_SHADE]), false);
    });
    it('little dog does not pass rocks', () => {
        assert.equal(passes_rocks(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// Race/gender flag predicates
// ========================================================================

describe('is_male / is_female / is_neuter / type_is_pname', () => {
    it('is_male: Cyclops is male (M2_MALE)', () => {
        assert.equal(is_male(mons[PM_CYCLOPS]), true);
    });
    it('is_female: medusa is female', () => {
        assert.equal(is_female(mons[PM_MEDUSA]), true);
    });
    it('is_neuter: flaming sphere is neuter (M2_NEUTER)', () => {
        assert.equal(is_neuter(mons[PM_FLAMING_SPHERE]), true);
    });
    it('type_is_pname: Death is a proper name', () => {
        assert.equal(type_is_pname(mons[PM_DEATH]), true);
    });
    it('type_is_pname: little dog is not a proper name', () => {
        assert.equal(type_is_pname(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_lord / is_prince / is_ndemon / is_dlord / is_dprince', () => {
    it('is_lord: Juiblex is a lord-level demon (M2_LORD)', () => {
        assert.equal(is_lord(mons[PM_JUIBLEX]), true);
    });
    it('is_prince: Orcus is a prince-level demon', () => {
        assert.equal(is_prince(mons[PM_ORCUS]), true);
    });
    it('is_ndemon: hezrou is a non-lord, non-prince demon', () => {
        assert.equal(is_ndemon(mons[PM_HEZROU]), true);
    });
    it('is_ndemon: Juiblex (demon lord) is not ndemon', () => {
        assert.equal(is_ndemon(mons[PM_JUIBLEX]), false);
    });
    it('is_dlord: Juiblex is a demon lord (is_demon && is_lord)', () => {
        assert.equal(is_dlord(mons[PM_JUIBLEX]), true);
    });
    it('is_dprince: Orcus is a demon prince', () => {
        assert.equal(is_dprince(mons[PM_ORCUS]), true);
    });
});

describe('polyok / extra_nasty / throws_rocks', () => {
    it('polyok: little dog can be polymorph target', () => {
        assert.equal(polyok(mons[PM_LITTLE_DOG]), true);
    });
    it('polyok: Death cannot (M2_NOPOLY)', () => {
        assert.equal(polyok(mons[PM_DEATH]), false);
    });
    it('extra_nasty: minotaur is nasty', () => {
        assert.equal(extra_nasty(mons[PM_MINOTAUR]), true);
    });
    it('extra_nasty: little dog is not nasty', () => {
        assert.equal(extra_nasty(mons[PM_LITTLE_DOG]), false);
    });
    it('throws_rocks: giant (M2_ROCKTHROW) throws rocks', () => {
        assert.equal(throws_rocks(mons[PM_GIANT]), true);
    });
    it('throws_rocks: little dog does not throw rocks', () => {
        assert.equal(throws_rocks(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// Combat predicates
// ========================================================================

describe('is_armed / cantwield / could_twoweap / cantweararm', () => {
    it('is_armed: soldier (wielder) is armed', () => {
        const soldierIdx = mons.findIndex(m => m.name === 'soldier');
        assert.equal(is_armed(mons[soldierIdx]), true);
    });
    it('is_armed: little dog (no weapon attacks) is not armed', () => {
        assert.equal(is_armed(mons[PM_LITTLE_DOG]), false);
    });
    it('cantwield: little dog (no hands) cannot wield', () => {
        assert.equal(cantwield(mons[PM_LITTLE_DOG]), true);
    });
    it('cantwield: bat (no hands) cannot wield', () => {
        assert.equal(cantwield(mons[PM_BAT]), true);
    });
    it('cantweararm: iron golem (breakarm) cannot wear armor', () => {
        assert.equal(cantweararm(mons[PM_IRON_GOLEM]), true);
    });
    it('cantweararm: shade (sliparm) cannot wear armor', () => {
        assert.equal(cantweararm(mons[PM_SHADE]), true);
    });
});

// ========================================================================
// Food/diet predicates
// ========================================================================

describe('digests / enfolds / slimeproof / eggs_in_water / telepathic', () => {
    it('digests: purple worm digests (AD_DGST via AT_ENGL)', () => {
        assert.equal(digests(mons[PM_PURPLE_WORM]), true);
    });
    it('digests: little dog does not digest', () => {
        assert.equal(digests(mons[PM_LITTLE_DOG]), false);
    });
    it('slimeproof: green slime is slimeproof', () => {
        assert.equal(slimeproof(mons[PM_GREEN_SLIME]), true);
    });
    it('slimeproof: fire elemental is slimeproof (flaming)', () => {
        assert.equal(slimeproof(mons[PM_FIRE_ELEMENTAL]), true);
    });
    it('slimeproof: shade is slimeproof (noncorporeal)', () => {
        assert.equal(slimeproof(mons[PM_SHADE]), true);
    });
    it('slimeproof: little dog is not slimeproof', () => {
        assert.equal(slimeproof(mons[PM_LITTLE_DOG]), false);
    });
    it('telepathic: floating eye is telepathic', () => {
        assert.equal(telepathic(mons[PM_FLOATING_EYE]), true);
    });
    it('telepathic: mind flayer is telepathic', () => {
        assert.equal(telepathic(mons[PM_MIND_FLAYER]), true);
    });
    it('telepathic: little dog is not telepathic', () => {
        assert.equal(telepathic(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// Identity predicates
// ========================================================================

describe('webmaker / is_mplayer / is_watch / is_placeholder', () => {
    it('webmaker: cave spider makes webs', () => {
        assert.equal(webmaker(mons[PM_CAVE_SPIDER]), true);
    });
    it('webmaker: giant spider makes webs', () => {
        assert.equal(webmaker(mons[PM_GIANT_SPIDER]), true);
    });
    it('webmaker: little dog does not make webs', () => {
        assert.equal(webmaker(mons[PM_LITTLE_DOG]), false);
    });
    it('is_mplayer: archeologist is a player monster', () => {
        assert.equal(is_mplayer(mons[PM_ARCHEOLOGIST]), true);
    });
    it('is_mplayer: wizard is a player monster', () => {
        assert.equal(is_mplayer(mons[PM_WIZARD]), true);
    });
    it('is_mplayer: little dog is not a player monster', () => {
        assert.equal(is_mplayer(mons[PM_LITTLE_DOG]), false);
    });
    it('is_watch: watchman is watch', () => {
        assert.equal(is_watch(mons[PM_WATCHMAN]), true);
    });
    it('is_watch: watch captain is watch', () => {
        assert.equal(is_watch(mons[PM_WATCH_CAPTAIN]), true);
    });
    it('is_watch: little dog is not watch', () => {
        assert.equal(is_watch(mons[PM_LITTLE_DOG]), false);
    });
    it('is_placeholder: PM_ORC is a placeholder', () => {
        assert.equal(is_placeholder(mons[PM_ORC]), true);
    });
    it('is_placeholder: PM_GIANT is a placeholder', () => {
        assert.equal(is_placeholder(mons[PM_GIANT]), true);
    });
    it('is_placeholder: little dog is not a placeholder', () => {
        assert.equal(is_placeholder(mons[PM_LITTLE_DOG]), false);
    });
});

describe('is_reviver / unique_corpstat / emits_light', () => {
    it('is_reviver: Death is a reviver (rider)', () => {
        assert.equal(is_reviver(mons[PM_DEATH]), true);
    });
    it('is_reviver: troll is a reviver (S_TROLL)', () => {
        const trollIdx = mons.findIndex(m => m.name === 'troll');
        assert.equal(is_reviver(mons[trollIdx]), true);
    });
    it('is_reviver: little dog is not a reviver', () => {
        assert.equal(is_reviver(mons[PM_LITTLE_DOG]), false);
    });
    it('unique_corpstat: Death has G_UNIQ set', () => {
        assert.equal(unique_corpstat(mons[PM_DEATH]), true);
    });
    it('unique_corpstat: little dog does not have G_UNIQ', () => {
        assert.equal(unique_corpstat(mons[PM_LITTLE_DOG]), false);
    });
    it('emits_light: fire elemental emits light', () => {
        assert.equal(emits_light(mons[PM_FIRE_ELEMENTAL]), 1);
    });
    it('emits_light: flaming sphere emits light', () => {
        assert.equal(emits_light(mons[PM_FLAMING_SPHERE]), 1);
    });
    it('emits_light: little dog does not emit light', () => {
        assert.equal(emits_light(mons[PM_LITTLE_DOG]), 0);
    });
});

describe('likes_lava / pm_invisible / likes_fire', () => {
    it('likes_lava: fire elemental likes lava', () => {
        assert.equal(likes_lava(mons[PM_FIRE_ELEMENTAL]), true);
    });
    it('likes_lava: salamander likes lava', () => {
        assert.equal(likes_lava(mons[PM_SALAMANDER]), true);
    });
    it('likes_lava: little dog does not like lava', () => {
        assert.equal(likes_lava(mons[PM_LITTLE_DOG]), false);
    });
    it('pm_invisible: stalker is invisible', () => {
        assert.equal(pm_invisible(mons[PM_STALKER]), true);
    });
    it('pm_invisible: black light is invisible', () => {
        assert.equal(pm_invisible(mons[PM_BLACK_LIGHT]), true);
    });
    it('pm_invisible: little dog is not invisible', () => {
        assert.equal(pm_invisible(mons[PM_LITTLE_DOG]), false);
    });
    it('likes_fire: flaming sphere likes fire', () => {
        assert.equal(likes_fire(mons[PM_FLAMING_SPHERE]), true);
    });
    it('likes_fire: fire elemental likes fire (likes_lava)', () => {
        assert.equal(likes_fire(mons[PM_FIRE_ELEMENTAL]), true);
    });
    it('likes_fire: little dog does not like fire', () => {
        assert.equal(likes_fire(mons[PM_LITTLE_DOG]), false);
    });
});

describe('touch_petrifies / flesh_petrifies', () => {
    it('touch_petrifies: cockatrice petrifies', () => {
        assert.equal(touch_petrifies(mons[PM_COCKATRICE]), true);
    });
    it('touch_petrifies: chickatrice petrifies', () => {
        assert.equal(touch_petrifies(mons[PM_CHICKATRICE]), true);
    });
    it('touch_petrifies: little dog does not petrify', () => {
        assert.equal(touch_petrifies(mons[PM_LITTLE_DOG]), false);
    });
    it('flesh_petrifies: medusa petrifies if eaten', () => {
        assert.equal(flesh_petrifies(mons[PM_MEDUSA]), true);
    });
    it('flesh_petrifies: cockatrice petrifies (via touch_petrifies)', () => {
        assert.equal(flesh_petrifies(mons[PM_COCKATRICE]), true);
    });
    it('flesh_petrifies: little dog does not petrify', () => {
        assert.equal(flesh_petrifies(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// weirdnonliving / nonliving (fixed) / golem destruction
// ========================================================================

describe('weirdnonliving / nonliving', () => {
    it('weirdnonliving: stone golem (S_GOLEM) is weirdnonliving', () => {
        assert.equal(weirdnonliving(mons[PM_STONE_GOLEM]), true);
    });
    it('weirdnonliving: fire vortex (S_VORTEX) is weirdnonliving', () => {
        assert.equal(weirdnonliving(mons[PM_FIRE_VORTEX]), true);
    });
    it('weirdnonliving: little dog is not weirdnonliving', () => {
        assert.equal(weirdnonliving(mons[PM_LITTLE_DOG]), false);
    });
    it('nonliving: human zombie is nonliving (undead)', () => {
        const zombieIdx = mons.findIndex(m => m && m.name === 'human zombie');
        assert.equal(nonliving(mons[zombieIdx]), true);
    });
    it('nonliving: manes is nonliving (special case)', () => {
        assert.equal(nonliving(mons[PM_MANES]), true);
    });
    it('nonliving: stone golem is nonliving (weirdnonliving)', () => {
        assert.equal(nonliving(mons[PM_STONE_GOLEM]), true);
    });
    it('nonliving: little dog is not nonliving', () => {
        assert.equal(nonliving(mons[PM_LITTLE_DOG]), false);
    });
});

describe('completelyburns / completelyrots / completelyrusts', () => {
    it('completelyburns: paper golem burns completely', () => {
        assert.equal(completelyburns(mons[PM_PAPER_GOLEM]), true);
    });
    it('completelyburns: straw golem burns completely', () => {
        assert.equal(completelyburns(mons[PM_STRAW_GOLEM]), true);
    });
    it('completelyburns: stone golem does not burn completely', () => {
        assert.equal(completelyburns(mons[PM_STONE_GOLEM]), false);
    });
    it('completelyrots: wood golem rots completely', () => {
        assert.equal(completelyrots(mons[PM_WOOD_GOLEM]), true);
    });
    it('completelyrots: leather golem rots completely', () => {
        assert.equal(completelyrots(mons[PM_LEATHER_GOLEM]), true);
    });
    it('completelyrots: iron golem does not rot completely', () => {
        assert.equal(completelyrots(mons[PM_IRON_GOLEM]), false);
    });
    it('completelyrusts: iron golem rusts completely', () => {
        assert.equal(completelyrusts(mons[PM_IRON_GOLEM]), true);
    });
    it('completelyrusts: stone golem does not rust completely', () => {
        assert.equal(completelyrusts(mons[PM_STONE_GOLEM]), false);
    });
});

// ========================================================================
// is_bat / is_bird / vegan / vegetarian / corpse_eater
// ========================================================================

describe('is_bat / is_bird', () => {
    it('is_bat: bat is a bat', () => {
        assert.equal(is_bat(mons[PM_BAT]), true);
    });
    it('is_bat: vampire bat is a bat', () => {
        assert.equal(is_bat(mons[PM_VAMPIRE_BAT]), true);
    });
    it('is_bat: little dog is not a bat', () => {
        assert.equal(is_bat(mons[PM_LITTLE_DOG]), false);
    });
    it('is_bird: raven is a bird (S_BAT but not bat)', () => {
        const ravenIdx = mons.findIndex(m => m.name === 'raven');
        assert.equal(is_bird(mons[ravenIdx]), true);
    });
    it('is_bird: bat is not a bird', () => {
        assert.equal(is_bird(mons[PM_BAT]), false);
    });
});

describe('vegan / vegetarian / corpse_eater', () => {
    it('vegan: fire vortex (S_VORTEX) is vegan', () => {
        assert.equal(vegan(mons[PM_FIRE_VORTEX]), true);
    });
    it('vegan: iron golem (S_GOLEM, not flesh/leather) is vegan', () => {
        assert.equal(vegan(mons[PM_IRON_GOLEM]), true);
    });
    it('vegan: flesh golem (S_GOLEM but flesh) is NOT vegan', () => {
        assert.equal(vegan(mons[PM_FLESH_GOLEM]), false);
    });
    it('vegan: shade (noncorporeal) is vegan', () => {
        assert.equal(vegan(mons[PM_SHADE]), true);
    });
    it('vegan: little dog is not vegan', () => {
        assert.equal(vegan(mons[PM_LITTLE_DOG]), false);
    });
    it('vegetarian: brown pudding (S_PUDDING, not black) is vegetarian', () => {
        const brownPuddingIdx = mons.findIndex(m => m.name === 'brown pudding');
        assert.equal(vegetarian(mons[brownPuddingIdx]), true);
    });
    it('vegetarian: black pudding is NOT vegetarian', () => {
        assert.equal(vegetarian(mons[PM_BLACK_PUDDING]), false);
    });
    it('corpse_eater: purple worm eats corpses', () => {
        assert.equal(corpse_eater(mons[PM_PURPLE_WORM]), true);
    });
    it('corpse_eater: ghoul eats corpses', () => {
        assert.equal(corpse_eater(mons[PM_GHOUL]), true);
    });
    it('corpse_eater: little dog does not eat corpses', () => {
        assert.equal(corpse_eater(mons[PM_LITTLE_DOG]), false);
    });
});

describe('likes_objs (fixed: includes is_armed)', () => {
    it('likes_objs: soldier (armed, M2_COLLECT not required) is true', () => {
        const soldierIdx = mons.findIndex(m => m.name === 'soldier');
        assert.equal(likes_objs(mons[soldierIdx]), true);
    });
    it('likes_objs: wood nymph (M2_COLLECT) is true', () => {
        const nymphIdx = mons.findIndex(m => m && m.name === 'wood nymph');
        assert.equal(likes_objs(mons[nymphIdx]), true);
    });
    it('likes_objs: little dog (no M2_COLLECT, no weapon attacks) is false', () => {
        assert.equal(likes_objs(mons[PM_LITTLE_DOG]), false);
    });
});

// ========================================================================
// befriend_with_obj — C ref: mondata.h:255
// ========================================================================

describe('befriend_with_obj', () => {
    it('monkey is befriended by banana', () => {
        const obj = { otyp: BANANA, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_MONKEY], obj), true);
    });

    it('monkey is NOT befriended by non-banana food', () => {
        const obj = { otyp: TRIPE_RATION, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_MONKEY], obj), false);
    });

    it('ape is befriended by banana', () => {
        const obj = { otyp: BANANA, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_APE], obj), true);
    });

    it('little dog (domestic) is befriended by food', () => {
        const obj = { otyp: TRIPE_RATION, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_LITTLE_DOG], obj), true);
    });

    it('little dog is NOT befriended by non-food', () => {
        const obj = { otyp: AMULET_OF_YENDOR, oclass: 0 };
        assert.equal(befriend_with_obj(mons[PM_LITTLE_DOG], obj), false);
    });

    // Unicorns have M2_JEWELS but NOT M2_DOMESTIC (C monsters.h:1017 confirmed).
    // befriend_with_obj requires is_domestic(ptr) first, so the unicorn-specific
    // veggy/lichen-corpse clause in the macro is dead code for standard unicorns.
    it('unicorn NOT befriended by veggy food (not domestic)', () => {
        const obj = { otyp: CARROT, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_WHITE_UNICORN], obj), false);
    });

    it('unicorn NOT befriended by lichen corpse (not domestic)', () => {
        const obj = { otyp: CORPSE, oclass: FOOD_CLASS, corpsenm: PM_LICHEN };
        assert.equal(befriend_with_obj(mons[PM_WHITE_UNICORN], obj), false);
    });

    it('goblin (not domestic) is not befriended by food', () => {
        const obj = { otyp: TRIPE_RATION, oclass: FOOD_CLASS };
        assert.equal(befriend_with_obj(mons[PM_GOBLIN], obj), false);
    });
});
