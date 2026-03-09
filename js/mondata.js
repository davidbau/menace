// mondata.js -- Monster predicate functions
// C ref: include/mondata.h — macro predicates on permonst struct
// These operate on a permonst pointer (ptr), which in JS is the mons[] entry.
// Monster instances have a .mnum field indexing into mons[].

import { mons, M1_FLY, M1_SWIM, M1_AMORPHOUS, M1_WALLWALK, M1_CLING, M1_TUNNEL, M1_NEEDPICK, M1_CONCEAL, M1_HIDE, M1_AMPHIBIOUS, M1_BREATHLESS, M1_NOTAKE, M1_NOEYES, M1_NOHANDS, M1_NOLIMBS, M1_NOHEAD, M1_MINDLESS, M1_HUMANOID, M1_ANIMAL, M1_SLITHY, M1_UNSOLID, M1_THICK_HIDE, M1_OVIPAROUS, M1_REGEN, M1_SEE_INVIS, M1_TPORT, M1_TPORT_CNTRL, M1_ACID, M1_POIS, M1_CARNIVORE, M1_HERBIVORE, M1_OMNIVORE, M1_METALLIVORE, M2_NOPOLY, M2_UNDEAD, M2_WERE, M2_HUMAN, M2_ELF, M2_DWARF, M2_GNOME, M2_ORC, M2_DEMON, M2_MERC, M2_LORD, M2_PRINCE, M2_MINION, M2_GIANT, M2_SHAPESHIFTER, M2_MALE, M2_FEMALE, M2_NEUTER, M2_PNAME, M2_HOSTILE, M2_PEACEFUL, M2_DOMESTIC, M2_WANDER, M2_STALK, M2_NASTY, M2_STRONG, M2_ROCKTHROW, M2_GREEDY, M2_JEWELS, M2_COLLECT, M2_MAGIC, M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSBOOK, M3_WANTSCAND, M3_WANTSARTI, M3_WANTSALL, M3_WAITFORU, M3_CLOSE, M3_COVETOUS, M3_WAITMASK, M3_INFRAVISION, M3_INFRAVISIBLE, M3_DISPLACES, S_DOG, S_FELINE, S_GOLEM, S_GHOST, S_IMP, S_RODENT, S_VAMPIRE, S_VORTEX, S_ELEMENTAL, S_KOBOLD, S_OGRE, S_NYMPH, S_CENTAUR, S_DRAGON, S_NAGA, S_ZOMBIE, S_MUMMY, S_LICH, S_WRAITH, S_UNICORN, S_EYE, S_LIGHT, S_TROLL, S_MIMIC, S_FUNGUS, S_JELLY, S_BLOB, S_PUDDING, S_BAT, MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE, AT_ANY, AT_NONE, AT_BOOM, AT_SPIT, AT_GAZE, AT_MAGC, AT_ENGL, AT_HUGS, AT_BREA, AT_WEAP, AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_TENT, AT_EXPL, AD_ANY, AD_PHYS, AD_FIRE, AD_COLD, AD_ELEC, AD_ACID, AD_STCK, AD_WRAP, AD_DGST, AD_MAGM, AD_DRLI, AD_RBRE, AD_BLND, AD_DCAY, AD_RUST, AD_WERE, AD_DRDX, AD_DRCO, MR_FIRE, MR_COLD, MR_SLEEP, MR_DISINT, MR_ELEC, MR_POISON, MR_ACID, MR_STONE, G_UNIQ, G_SGROUP, G_LGROUP, G_GENO, PM_SHADE, PM_TENGU, PM_ROCK_MOLE, PM_WOODCHUCK, PM_PONY, PM_HORSE, PM_WARHORSE, PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_KI_RIN, PM_HORNED_DEVIL, PM_MINOTAUR, PM_ASMODEUS, PM_BALROG, PM_MARILITH, PM_WINGED_GARGOYLE, PM_AIR_ELEMENTAL, PM_GREMLIN, PM_STONE_GOLEM, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_SHOCKING_SPHERE, PM_SALAMANDER, PM_FIRE_ELEMENTAL, PM_CYCLOPS, PM_FLOATING_EYE, PM_ROPE_GOLEM, PM_WOOD_GOLEM, PM_FLESH_GOLEM, PM_LEATHER_GOLEM, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_STALKER, PM_GREEN_SLIME, PM_BLACK_PUDDING, PM_BLACK_LIGHT, PM_MEDUSA, PM_GHOUL, PM_PIRANHA, PM_GIANT, PM_HUMAN, PM_VAMPIRE_BAT, PM_HEZROU, PM_VROCK, PM_FOG_CLOUD, MS_SILENT, MS_BUZZ, MS_BURBLE, S_EEL, S_ANGEL, S_DEMON, S_WORM, S_WORM_TAIL, S_MIMIC_DEF, S_invisible, MAXMCLASSES, NUMMONS, // For grownups table (little_to_big / big_to_little / same_race)
    AD_SLEE, AD_DISN, AD_DRST, AD_STON,
    PM_CHICKATRICE, PM_COCKATRICE, PM_LITTLE_DOG, PM_DOG, PM_LARGE_DOG, PM_HELL_HOUND_PUP, PM_HELL_HOUND, PM_WINTER_WOLF_CUB, PM_WINTER_WOLF, PM_KITTEN, PM_HOUSECAT, PM_LARGE_CAT, PM_KOBOLD, PM_LARGE_KOBOLD, PM_KOBOLD_LEADER, PM_GNOME, PM_GNOME_LEADER, PM_GNOME_RULER, PM_DWARF, PM_DWARF_LEADER, PM_DWARF_RULER, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER, PM_ORC, PM_HILL_ORC, PM_MORDOR_ORC, PM_URUK_HAI, PM_ORC_CAPTAIN, PM_SEWER_RAT, PM_GIANT_RAT, PM_CAVE_SPIDER, PM_GIANT_SPIDER, PM_OGRE, PM_OGRE_LEADER, PM_OGRE_TYRANT, PM_ELF, PM_WOODLAND_ELF, PM_GREEN_ELF, PM_GREY_ELF, PM_ELF_NOBLE, PM_ELVEN_MONARCH, PM_LICH, PM_DEMILICH, PM_MASTER_LICH, PM_ARCH_LICH, PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_BAT, PM_GIANT_BAT, PM_BABY_GRAY_DRAGON, PM_GRAY_DRAGON, PM_BABY_GOLD_DRAGON, PM_GOLD_DRAGON, PM_BABY_SILVER_DRAGON, PM_SILVER_DRAGON, PM_BABY_RED_DRAGON, PM_RED_DRAGON, PM_BABY_WHITE_DRAGON, PM_WHITE_DRAGON, PM_BABY_ORANGE_DRAGON, PM_ORANGE_DRAGON, PM_BABY_BLACK_DRAGON, PM_BLACK_DRAGON, PM_BABY_BLUE_DRAGON, PM_BLUE_DRAGON, PM_BABY_GREEN_DRAGON, PM_GREEN_DRAGON, PM_BABY_YELLOW_DRAGON, PM_YELLOW_DRAGON, PM_RED_NAGA_HATCHLING, PM_RED_NAGA, PM_BLACK_NAGA_HATCHLING, PM_BLACK_NAGA, PM_GOLDEN_NAGA_HATCHLING, PM_GOLDEN_NAGA, PM_GUARDIAN_NAGA_HATCHLING, PM_GUARDIAN_NAGA, PM_SMALL_MIMIC, PM_LARGE_MIMIC, PM_GIANT_MIMIC, PM_BABY_LONG_WORM, PM_LONG_WORM, PM_LONG_WORM_TAIL, PM_BABY_PURPLE_WORM, PM_PURPLE_WORM, PM_BABY_CROCODILE, PM_CROCODILE, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN, PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_ALIGNED_CLERIC, PM_HIGH_CLERIC, PM_STUDENT, PM_ARCHEOLOGIST, PM_ATTENDANT, PM_HEALER, PM_PAGE, PM_KNIGHT, PM_ACOLYTE, PM_CLERIC, PM_APPRENTICE, PM_WIZARD, PM_MANES, PM_LEMURE, PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN, PM_GARGOYLE, PM_KILLER_BEE, PM_QUEEN_BEE, PM_DEATH, PM_FAMINE, PM_PESTILENCE, PM_KOBOLD_ZOMBIE, PM_KOBOLD_MUMMY, PM_MONKEY, PM_APE, PM_LICHEN,
    PM_WATER_DEMON, PM_WATER_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_ICE_VORTEX, PM_FREEZING_SPHERE, PM_STEAM_VORTEX, PM_DUST_VORTEX, PM_ENERGY_VORTEX, PM_GLASS_GOLEM, PM_CLAY_GOLEM, PM_GOLD_GOLEM, PM_YELLOW_LIGHT, PM_ANGEL, PM_RAVEN, PM_AMOROUS_DEMON, PM_VIOLET_FUNGUS, PM_HOMUNCULUS, PM_BALUCHITHERIUM, PM_LURKER_ABOVE, PM_CAVE_DWELLER, PM_DJINNI, PM_MUMAK, PM_ERINYS, PM_HOBBIT, PM_MASTER_OF_THIEVES, PM_MASTER_ASSASSIN, PM_HUMAN_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF, PM_WERERAT, PM_WEREJACKAL, PM_WEREWOLF, PM_SOLDIER_ANT, PM_WOOD_NYMPH, PM_OLOG_HAI, S_XAN } from './monsters.js';
import { m_cansee } from './vision.js';

import { AMULET_OF_YENDOR, AMULET_OF_GUARDING, FOOD_CLASS, VEGGY, CORPSE, BANANA,
         GRAY_DRAGON_SCALES, ARMOR_CLASS, WEAPON_CLASS,
         ALCHEMY_SMOCK, CREAM_PIE, BLINDING_VENOM, POT_BLINDNESS,
         objectData } from './objects.js';
import { ALL_TRAPS, NO_TRAP, W_ARMOR, W_AMUL, W_ARMC, W_ARMH, W_WEP, W_SWAPWEP, W_ACCESSORY, LOW_PM, A_CHA, ANTIMAGIC, DRAIN_RES, BLND_RES,
    FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES, SHOCK_RES, POISON_RES, ACID_RES, STONE_RES,
    REFLECTING, INTRINSIC, MALE, FEMALE, NEUTER, NON_PM, PRONOUN_NO_IT, PRONOUN_HALLU,
    M_SEEN_NOTHING, M_SEEN_MAGR, M_SEEN_FIRE, M_SEEN_COLD, M_SEEN_SLEEP,
    M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_POISON, M_SEEN_ACID, M_SEEN_REFL } from './const.js';
import { dist2, highc } from './hacklib.js';
import { defends, defends_when_carried } from './artifact.js';
import { rn2, rnd } from './rng.js';
import { acurr } from './attrib.js';
import { game as _gstate } from './gstate.js';
import { def_monsyms } from './symbols.js';
import { title_to_mon } from './botl.js';

const NATTK = 6;

// ========================================================================
// Diet predicates — C ref: mondata.h
// ========================================================================

// C ref: #define carnivorous(ptr)   ((ptr)->mflags1 & M1_CARNIVORE)
export function carnivorous(ptr) { return !!(ptr.mflags1 & M1_CARNIVORE); }

// C ref: #define herbivorous(ptr)   ((ptr)->mflags1 & M1_HERBIVORE)
export function herbivorous(ptr) { return !!(ptr.mflags1 & M1_HERBIVORE); }

// C ref: #define is_omnivore(ptr) (((ptr)->mflags1 & M1_OMNIVORE) == M1_OMNIVORE)
// Note: M1_OMNIVORE = M1_CARNIVORE | M1_HERBIVORE
export function is_omnivore(ptr) { return (ptr.mflags1 & M1_OMNIVORE) === M1_OMNIVORE; }

// C ref: #define is_metallivore(ptr) ((ptr)->mflags1 & M1_METALLIVORE)
export function is_metallivore(ptr) { return !!(ptr.mflags1 & M1_METALLIVORE); }

// ========================================================================
// Body type predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_animal(ptr)     ((ptr)->mflags1 & M1_ANIMAL)
export function is_animal(ptr) { return !!(ptr.mflags1 & M1_ANIMAL); }

// C ref: #define is_mindless(ptr)   ((ptr)->mflags1 & M1_MINDLESS)
export function is_mindless(ptr) { return !!(ptr.mflags1 & M1_MINDLESS); }

// C ref: #define is_humanoid(ptr)   ((ptr)->mflags1 & M1_HUMANOID)
export function is_humanoid(ptr) { return !!(ptr.mflags1 & M1_HUMANOID); }

// C ref: #define slithy(ptr)        ((ptr)->mflags1 & M1_SLITHY)
export function slithy(ptr) { return !!(ptr.mflags1 & M1_SLITHY); }

// C ref: #define unsolid(ptr)       ((ptr)->mflags1 & M1_UNSOLID)
export function unsolid(ptr) { return !!(ptr.mflags1 & M1_UNSOLID); }

// C ref: #define nohands(ptr)       ((ptr)->mflags1 & M1_NOHANDS)
export function nohands(ptr) { return !!(ptr.mflags1 & M1_NOHANDS); }

// C ref: #define nolimbs(ptr)       (((ptr)->mflags1 & M1_NOLIMBS) == M1_NOLIMBS)
export function nolimbs(ptr) { return (ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS; }

// C ref: #define nohead(ptr)        ((ptr)->mflags1 & M1_NOHEAD)
export function nohead(ptr) { return !!(ptr.mflags1 & M1_NOHEAD); }

// C ref: #define noeyes(ptr)        ((ptr)->mflags1 & M1_NOEYES)
export function noeyes(ptr) { return !!(ptr.mflags1 & M1_NOEYES); }

// C ref: #define notake(ptr)        ((ptr)->mflags1 & M1_NOTAKE)
export function notake(ptr) { return !!(ptr.mflags1 & M1_NOTAKE); }

// ========================================================================
// Movement predicates — C ref: mondata.h
// ========================================================================

// C ref: #define can_fly(ptr)       ((ptr)->mflags1 & M1_FLY)
export function can_fly(ptr) { return !!(ptr.mflags1 & M1_FLY); }

// C ref: #define can_swim(ptr)      ((ptr)->mflags1 & M1_SWIM)
export function can_swim(ptr) { return !!(ptr.mflags1 & M1_SWIM); }

// C ref: #define amorphous(ptr)     ((ptr)->mflags1 & M1_AMORPHOUS)
export function amorphous(ptr) { return !!(ptr.mflags1 & M1_AMORPHOUS); }

// C ref: #define passes_walls(ptr)  ((ptr)->mflags1 & M1_WALLWALK)
export function passes_walls(ptr) { return !!(ptr.mflags1 & M1_WALLWALK); }

// C ref: #define can_tunnel(ptr)    ((ptr)->mflags1 & M1_TUNNEL)
export function can_tunnel(ptr) { return !!(ptr.mflags1 & M1_TUNNEL); }

// C ref: #define needs_pick(ptr)    ((ptr)->mflags1 & M1_NEEDPICK)
export function needs_pick(ptr) { return !!(ptr.mflags1 & M1_NEEDPICK); }

// C ref: #define hides_under(ptr)   ((ptr)->mflags1 & M1_CONCEAL)
export function hides_under(ptr) { return !!(ptr.mflags1 & M1_CONCEAL); }

// C ref: #define is_hider(ptr)      ((ptr)->mflags1 & M1_HIDE)
export function is_hider(ptr) { return !!(ptr.mflags1 & M1_HIDE); }

// C ref: #define is_clinger(ptr)    ((ptr)->mflags1 & M1_CLING)
export function is_clinger(ptr) { return !!(ptr.mflags1 & M1_CLING); }

// C ref: #define amphibious(ptr)    ((ptr)->mflags1 & M1_AMPHIBIOUS)
export function amphibious(ptr) { return !!(ptr.mflags1 & M1_AMPHIBIOUS); }

// C ref: #define breathless(ptr)    ((ptr)->mflags1 & M1_BREATHLESS)
export function breathless(ptr) { return !!(ptr.mflags1 & M1_BREATHLESS); }

// ========================================================================
// Defense/combat predicates — C ref: mondata.h
// ========================================================================

// C ref: #define acidic(ptr)        ((ptr)->mflags1 & M1_ACID)
export function acidic(ptr) { return !!(ptr.mflags1 & M1_ACID); }

// C ref: #define poisonous(ptr)     ((ptr)->mflags1 & M1_POIS)
export function poisonous(ptr) { return !!(ptr.mflags1 & M1_POIS); }

// C ref: #define thick_skinned(ptr) ((ptr)->mflags1 & M1_THICK_HIDE)
export function thick_skinned(ptr) { return !!(ptr.mflags1 & M1_THICK_HIDE); }

// C ref: #define regenerates(ptr)   ((ptr)->mflags1 & M1_REGEN)
export function regenerates(ptr) { return !!(ptr.mflags1 & M1_REGEN); }

// C ref: #define lays_eggs(ptr)     ((ptr)->mflags1 & M1_OVIPAROUS)
export function lays_eggs(ptr) { return !!(ptr.mflags1 & M1_OVIPAROUS); }

// C ref: #define perceives(ptr)     ((ptr)->mflags1 & M1_SEE_INVIS)
export function perceives(ptr) { return !!(ptr.mflags1 & M1_SEE_INVIS); }

// C ref: #define can_teleport(ptr)  ((ptr)->mflags1 & M1_TPORT)
export function can_teleport(ptr) { return !!(ptr.mflags1 & M1_TPORT); }

// C ref: #define control_teleport(ptr) ((ptr)->mflags1 & M1_TPORT_CNTRL)
export function control_teleport(ptr) { return !!(ptr.mflags1 & M1_TPORT_CNTRL); }

// ========================================================================
// Race/type predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define is_undead(ptr)     ((ptr)->mflags2 & M2_UNDEAD)
export function is_undead(ptr) { return !!(ptr.mflags2 & M2_UNDEAD); }

// C ref: #define is_were(ptr)       ((ptr)->mflags2 & M2_WERE)
export function is_were(ptr) { return !!(ptr.mflags2 & M2_WERE); }

// C ref: #define is_human(ptr)      ((ptr)->mflags2 & M2_HUMAN)
export function is_human(ptr) { return !!(ptr.mflags2 & M2_HUMAN); }

// C ref: #define is_elf(ptr)        ((ptr)->mflags2 & M2_ELF)
export function is_elf(ptr) { return !!(ptr.mflags2 & M2_ELF); }

// C ref: #define is_dwarf(ptr)      ((ptr)->mflags2 & M2_DWARF)
export function is_dwarf(ptr) { return !!(ptr.mflags2 & M2_DWARF); }

// C ref: #define is_gnome(ptr)      ((ptr)->mflags2 & M2_GNOME)
export function is_gnome(ptr) { return !!(ptr.mflags2 & M2_GNOME); }

// C ref: #define is_orc(ptr)        ((ptr)->mflags2 & M2_ORC)
export function is_orc(ptr) { return !!(ptr.mflags2 & M2_ORC); }

// C ref: #define is_demon(ptr)      ((ptr)->mflags2 & M2_DEMON)
export function is_demon(ptr) { return !!(ptr.mflags2 & M2_DEMON); }

// C ref: #define is_mercenary(ptr)  ((ptr)->mflags2 & M2_MERC)
export function is_mercenary(ptr) { return !!(ptr.mflags2 & M2_MERC); }

// C ref: #define is_minion(ptr)     ((ptr)->mflags2 & M2_MINION)
export function is_minion(ptr) { return !!(ptr.mflags2 & M2_MINION); }

// C ref: #define is_giant(ptr)      ((ptr)->mflags2 & M2_GIANT)
export function is_giant(ptr) { return !!(ptr.mflags2 & M2_GIANT); }

// C ref: #define is_shapeshifter(ptr) ((ptr)->mflags2 & M2_SHAPESHIFTER)
export function is_shapeshifter(ptr) { return !!(ptr.mflags2 & M2_SHAPESHIFTER); }

// C ref: #define is_golem(ptr)      ((ptr)->mlet == S_GOLEM)
export function is_golem(ptr) { return ptr.mlet === S_GOLEM; }

// C ref: #define weirdnonliving(ptr) (is_golem(ptr) || (ptr)->mlet == S_VORTEX)
export function weirdnonliving(ptr) { return is_golem(ptr) || ptr.mlet === S_VORTEX; }

// C ref: #define nonliving(ptr) (is_undead(ptr) || (ptr) == &mons[PM_MANES] || weirdnonliving(ptr))
export function nonliving(ptr) {
    return is_undead(ptr) || ptr === mons[PM_MANES] || weirdnonliving(ptr);
}

// ========================================================================
// Behavior predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define is_domestic(ptr)   ((ptr)->mflags2 & M2_DOMESTIC)
export function is_domestic(ptr) { return !!(ptr.mflags2 & M2_DOMESTIC); }

// C ref: #define is_wanderer(ptr)   ((ptr)->mflags2 & M2_WANDER)
export function is_wanderer(ptr) { return !!(ptr.mflags2 & M2_WANDER); }

// C ref: #define always_hostile(ptr) ((ptr)->mflags2 & M2_HOSTILE)
export function always_hostile(ptr) { return !!(ptr.mflags2 & M2_HOSTILE); }

// C ref: #define always_peaceful(ptr) ((ptr)->mflags2 & M2_PEACEFUL)
export function always_peaceful(ptr) { return !!(ptr.mflags2 & M2_PEACEFUL); }

// C ref: #define strongmonst(ptr)   ((ptr)->mflags2 & M2_STRONG)
export function strongmonst(ptr) { return !!(ptr.mflags2 & M2_STRONG); }

// C ref: #define can_rockthrow(ptr) ((ptr)->mflags2 & M2_ROCKTHROW)
export function can_rockthrow(ptr) { return !!(ptr.mflags2 & M2_ROCKTHROW); }

// ========================================================================
// Item affinity predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define likes_gold(ptr)    ((ptr)->mflags2 & M2_GREEDY)
export function likes_gold(ptr) { return !!(ptr.mflags2 & M2_GREEDY); }

// C ref: #define likes_gems(ptr)    ((ptr)->mflags2 & M2_JEWELS)
export function likes_gems(ptr) { return !!(ptr.mflags2 & M2_JEWELS); }

// C ref: #define likes_objs(ptr)    ((ptr)->mflags2 & M2_COLLECT || is_armed(ptr))
export function likes_objs(ptr) { return !!(ptr.mflags2 & M2_COLLECT) || is_armed(ptr); }

// C ref: #define likes_magic(ptr)   ((ptr)->mflags2 & M2_MAGIC)
export function likes_magic(ptr) { return !!(ptr.mflags2 & M2_MAGIC); }

// ========================================================================
// Flags3 predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_covetous(ptr)   ((ptr)->mflags3 & M3_COVETOUS)
export function is_covetous(ptr) { return !!(ptr.mflags3 & M3_COVETOUS); }

// C ref: #define infravision(ptr)   ((ptr)->mflags3 & M3_INFRAVISION)
export function infravision(ptr) { return !!(ptr.mflags3 & M3_INFRAVISION); }

// C ref: #define infravisible(ptr)  ((ptr)->mflags3 & M3_INFRAVISIBLE)
export function infravisible(ptr) { return !!(ptr.mflags3 & M3_INFRAVISIBLE); }

// C ref: #define is_displacer(ptr)  ((ptr)->mflags3 & M3_DISPLACES)
export function is_displacer(ptr) { return !!(ptr.mflags3 & M3_DISPLACES); }

// ========================================================================
// Composite predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_pet(mon)   ((mon)->mtame > 0)
// Note: in our JS, tame is a boolean; in C it's a value (tameness level)
export function is_pet(mon) { return !!mon.tame; }

// C ref: attacktype(ptr, atyp) — delegates to attacktype_fordmg
export function attacktype(ptr, atyp) {
    return !!attacktype_fordmg(ptr, atyp, AD_ANY);
}

// C ref: #define can_breathe(ptr)   attacktype(ptr, AT_BREA)
export function can_breathe(ptr) { return attacktype(ptr, AT_BREA); }

// C ref: mondata.h — pet_type(ptr) checks if S_DOG or S_FELINE
export function is_pet_type(ptr) {
    return ptr.mlet === S_DOG || ptr.mlet === S_FELINE;
}

// ========================================================================
// Utility: get permonst pointer from monster instance
// ========================================================================

// Get the permonst entry for a monster instance
// C ref: mtmp->data = &mons[mtmp->mnum]
export function monsdat(mon) {
    if (!mon) return null;
    if (mon.data || mon.type) return mon.data || mon.type;
    if (Number.isInteger(mon.mndx)) return mons[mon.mndx] || null;
    if (Number.isInteger(mon.mnum)) return mons[mon.mnum] || null;
    return null;
}

// ========================================================================
// Monster naming — C ref: do_name.c x_monnam()
// ========================================================================

// C ref: include/worn.h — W_SADDLE = 0x100000
// Note: canonical constant also exported from worn.js, but imported here
// to avoid circular dependency (worn.js imports from mondata.js).
const W_SADDLE = 0x100000;

// C ref: do_name.c x_monnam() — check for worn saddle
// Returns true when the monster has a saddle in its inventory with
// the W_SADDLE worn-mask bit set (same check C does via
// misc_worn_check & W_SADDLE).
export function hasSaddle(mon) {
    if ((mon?.misc_worn_check || 0) & W_SADDLE) return true;
    return (mon?.minvent || []).some(o => o && (o.owornmask & W_SADDLE));
}

// C ref: do_name.c x_monnam() — returns the base display name for a
// monster, prepending "saddled " when the monster is wearing a saddle.
// This mirrors the adjective logic in x_monnam() without articles.
export function monDisplayName(mon) {
    const name = String(mon?.name || 'monster');
    if (hasSaddle(mon)) return `saddled ${name}`;
    return name;
}

// C ref: do_name.c — has_mgivenname(mtmp)
// Returns true when the monster has a user-given name (e.g. "Idefix")
// that differs from the species name (e.g. "little dog").
// In C, MGIVENNAME is a separate field; in JS, compare mon.name to
// mon.type.mname — if they differ, the monster was named by the player.
export function hasGivenName(mon) {
    if (!mon?.name) return false;
    const speciesName = mon.data?.mname || mon.type?.mname;
    if (!speciesName) return false;
    return mon.name !== speciesName;
}

// C ref: do_name.c y_monnam / mon_nam / Monnam
// Returns the monster's display name with an article prefix.
//   article: 'your' -> "your <name>" for generic, name for given-name
//            'the'  -> "the <name>"  for generic, name for given-name
//            'a'    -> "a <name>"
//            null   -> auto: 'your' if tame, 'the' otherwise
//   capitalize: true -> capitalise the first letter (Monnam / YMonnam)
//
// By default, articles are lowercase ("the", "your", "a") matching
// C's mon_nam() / y_monnam().  Use capitalize=true to get Monnam()
// / YMonnam() behaviour.
export function monNam(mon, { capitalize = false, article = null } = {}) {
    const dname = monDisplayName(mon);
    const effectiveArticle = article !== null ? article
        : (mon?.tame ? 'your' : 'the');
    let result;
    if (effectiveArticle === 'your') {
        result = hasGivenName(mon) ? dname : `your ${dname}`;
    } else if (effectiveArticle === 'the') {
        result = hasGivenName(mon) ? dname : `the ${dname}`;
    } else if (effectiveArticle === 'a') {
        result = `a ${dname}`;
    } else {
        result = dname;
    }
    if (capitalize && result.length > 0) {
        result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
}

// C-style naming helpers for callsites migrating off legacy monNam().
export function y_monnam(mon) {
    return monNam(mon);
}

export function YMonnam(mon) {
    return monNam(mon, { capitalize: true });
}

export function mon_nam(mon) {
    return monNam(mon, { article: 'the' });
}

export function Monnam(mon) {
    return monNam(mon, { article: 'the', capitalize: true });
}

// Lightweight compatibility for C-style x_monnam callsites that only depend on
// article selection and optional capitalization.
export function x_monnam(mon, article = null, _adjective = null, _suppress = 0, capitalize = false) {
    // Compatibility bridge for migrated callsites that pass options object.
    if (article && typeof article === 'object') {
        const opts = article;
        const optArticle = (opts.article === 'none') ? null : (opts.article ?? null);
        const optCap = !!opts.capitalize;
        if (optArticle === null) {
            const base = monDisplayName(mon);
            return optCap && base.length ? base.charAt(0).toUpperCase() + base.slice(1) : base;
        }
        return monNam(mon, { article: optArticle, capitalize: optCap });
    }
    if (article === null || article === undefined) {
        const base = monDisplayName(mon);
        return capitalize && base.length ? base.charAt(0).toUpperCase() + base.slice(1) : base;
    }
    return monNam(mon, { article, capitalize });
}

// ========================================================================
// Trap awareness — C ref: mondata.c
// ========================================================================

// C ref: mondata.c mon_knows_traps(mtmp, ttyp)
// Autotranslated from mondata.c:1616
export function mon_knows_traps(mtmp, ttyp) {
  if (ttyp === ALL_TRAPS) return (mtmp.mtrapseen);
  else if (ttyp === NO_TRAP) return !(mtmp.mtrapseen);
  else {
    return ((mtmp.mtrapseen & (1 << (ttyp - 1))) !== 0);
  }
}

// C ref: mondata.c mon_learns_traps(mtmp, ttyp)
// Autotranslated from mondata.c:1628
export function mon_learns_traps(mtmp, ttyp) {
  if (ttyp === ALL_TRAPS) mtmp.mtrapseen = ~0;
  else if (ttyp === NO_TRAP) mtmp.mtrapseen = 0;
  else {
    mtmp.mtrapseen |= (1 << (ttyp - 1));
  }
}

// ========================================================================
// passes_bars — C ref: mondata.c
// ========================================================================

// C ref: mondata.c passes_bars() — can this monster pass through iron bars?
// passes_walls || amorphous || is_whirly || verysmall || (slithy && !bigmonst)
export function passes_bars(mdat) {
    const f1 = mdat?.mflags1 || 0;
    if (f1 & M1_WALLWALK) return true;  // passes_walls
    if (f1 & M1_AMORPHOUS) return true; // amorphous
    const mlet = mdat?.mlet ?? -1;
    if (mlet === S_VORTEX || mlet === S_ELEMENTAL) return true; // is_whirly
    const size = mdat?.msize || 0;
    if (size === MZ_TINY) return true;  // verysmall
    if ((f1 & M1_SLITHY) && size <= MZ_MEDIUM) return true; // slithy && !bigmonst
    return false;
}

// ========================================================================
// Attack/damage queries — C ref: mondata.c
// ========================================================================

// C ref: mondata.c dmgtype_fromattack(ptr, dtyp, atyp)
// Returns true if monster has an attack of type atyp dealing damage dtyp.
// atyp == AT_ANY matches any attack type.
export function dmgtype_fromattack(ptr, dtyp, atyp) {
    if (!ptr || !ptr.mattk) return false;
    for (const atk of ptr.mattk) {
        const adtyp = atk.adtyp;
        const aatyp = atk.aatyp;
        if (adtyp === dtyp && (atyp === AT_ANY || aatyp === atyp))
            return true;
    }
    return false;
}

// C ref: mondata.c dmgtype(ptr, dtyp)
// Returns true if monster deals this damage type from any attack.
// Autotranslated from mondata.c:711
export function dmgtype(ptr, dtyp) {
  return dmgtype_fromattack(ptr, dtyp, AT_ANY) ? true : false;
}

// C ref: mondata.c noattacks(ptr)
// Returns true if monster has no real attacks (AT_BOOM passive ignored).
// Autotranslated from mondata.c:60
export function noattacks(ptr) {
  let i;
  const mattk = ptr?.mattk || ptr?.attacks || [];
  for (i = 0; i < NATTK; i++) {
    const atk = mattk[i] || null;
    const aatyp = atk?.aatyp ?? 0;
    if (aatyp === AT_BOOM) {
      continue;
    }
    if (aatyp) return false;
  }
  return true;
}

// C ref: muse.h DISTANCE_ATTK_TYPE(aatyp) macro
export function DISTANCE_ATTK_TYPE(aatyp) {
    return aatyp === AT_SPIT || aatyp === AT_BREA || aatyp === AT_MAGC || aatyp === AT_GAZE;
}

// C ref: mondata.c ranged_attk(ptr)
// Returns true if monster has any distance attack (DISTANCE_ATTK_TYPE macro).
// DISTANCE_ATTK_TYPE = AT_SPIT || AT_BREA || AT_MAGC || AT_GAZE
export function ranged_attk(ptr) {
    if (!ptr || !ptr.mattk) return false;
    for (const atk of ptr.mattk) {
        const t = atk.aatyp;
        if (t === AT_SPIT || t === AT_BREA || t === AT_MAGC || t === AT_GAZE)
            return true;
    }
    return false;
}

// C ref: mondata.c sticks(ptr)
// Returns true if monster can stick/grab/wrap targets it hits.
// Autotranslated from mondata.c:653
export function sticks(ptr) {
  return (dmgtype(ptr, AD_STCK) || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL)) || attacktype(ptr, AT_HUGS));
}

// ========================================================================
// Silver/blessing vulnerability — C ref: mondata.c
// ========================================================================

// C ref: mondata.c hates_silver(ptr)
// Returns true if this monster type is especially affected by silver weapons.
// Autotranslated from mondata.c:523
export function hates_silver(ptr) {
  return  (is_were(ptr) || ptr.mlet === S_VAMPIRE || is_demon(ptr) || ptr === mons[PM_SHADE] || (ptr.mlet === S_IMP && ptr !== mons[PM_TENGU]));
}

// C ref: mondata.c mon_hates_silver(mon)
// Returns true if this monster instance hates silver.
// Note: C also checks is_vampshifter() (shapeshifter in vampire form); omitted here.
export function mon_hates_silver(mon) {
    const ptr = monsdat(mon);
    return ptr ? hates_silver(ptr) : false;
}

// C ref: mondata.c hates_blessings(ptr)
// Returns true if this monster type is especially affected by blessed objects.
// Autotranslated from mondata.c:539
export function hates_blessings(ptr) {
  return (is_undead(ptr) || is_demon(ptr));
}

// C ref: mondata.c mon_hates_blessings(mon)
// Returns true if this monster instance hates blessings.
// Note: C also checks is_vampshifter() (shapeshifter in vampire form); omitted here.
export function mon_hates_blessings(mon) {
    const ptr = monsdat(mon);
    return ptr ? hates_blessings(ptr) : false;
}

// ========================================================================
// Body/armor predicates — C ref: mondata.c / mondata.h
// ========================================================================

// C ref: mondata.c cantvomit(ptr)
// Returns true if monster type is incapable of vomiting.
// Autotranslated from mondata.c:662
export function cantvomit(ptr) {
  if (ptr.mlet === S_RODENT && ptr !== mons[PM_ROCK_MOLE] && ptr !== mons[PM_WOODCHUCK]) return true;
  if (ptr === mons[PM_WARHORSE] || ptr === mons[PM_HORSE] || ptr === mons[PM_PONY]) return true;
  return false;
}

// C ref: mondata.c num_horns(ptr)
// Returns the number of horns this monster type has.
export function num_horns(ptr) {
    if (ptr === mons[PM_HORNED_DEVIL] || ptr === mons[PM_MINOTAUR]
        || ptr === mons[PM_ASMODEUS] || ptr === mons[PM_BALROG]) return 2;
    if (ptr === mons[PM_WHITE_UNICORN] || ptr === mons[PM_GRAY_UNICORN]
        || ptr === mons[PM_BLACK_UNICORN] || ptr === mons[PM_KI_RIN]) return 1;
    return 0;
}

// C ref: mondata.c sliparm(ptr)
// Returns true if creature would slip out of armor (too small, whirly, or noncorporeal).
// is_whirly: S_VORTEX || PM_AIR_ELEMENTAL; noncorporeal: S_GHOST
// Autotranslated from mondata.c:631
export function sliparm(ptr) {
  return (is_whirly(ptr) || ptr.msize <= MZ_SMALL || noncorporeal(ptr));
}

// C ref: mondata.c breakarm(ptr)
// Returns true if creature would break out of armor (too large or non-humanoid).
// PM_MARILITH and PM_WINGED_GARGOYLE are special-cased humanoids that can't wear suits.
export function breakarm(ptr) {
    if (sliparm(ptr)) return false;
    const sz = ptr.msize || 0;
    return sz >= MZ_LARGE
        || (sz > MZ_SMALL && !is_humanoid(ptr))
        || ptr === mons[PM_MARILITH]
        || ptr === mons[PM_WINGED_GARGOYLE];
}

// C ref: mondata.h haseyes macro — #define haseyes(ptr) (((ptr)->mflags1 & M1_NOEYES) == 0)
export function haseyes(ptr) { return !(ptr.mflags1 & M1_NOEYES); }

// C ref: mondata.h hates_light macro — #define hates_light(ptr) ((ptr) == &mons[PM_GREMLIN])
export function hates_light(ptr) { return ptr === mons[PM_GREMLIN]; }

// C ref: mondata.c:547 — mon_hates_light(mon)
// Autotranslated from mondata.c:546
// Autotranslated from mondata.c:546
export function mon_hates_light(mon) {
  return  hates_light((monsdat(mon) || {}));
}

// C ref: mondata.c:80 — poly_when_stoned(ptr)
// Returns true if a non-stone golem should polymorph into a stone golem when stoned.
// Note: C also checks if PM_STONE_GOLEM is genocided (G_GENOD flag); JS omits genocide tracking.
export function poly_when_stoned(ptr) {
    return is_golem(ptr) && ptr !== mons[PM_STONE_GOLEM];
}

// C ref: mondata.c:622 — can_track(ptr)
// Returns true if monster type can track the player.
// Note: C also returns true if player wields Excalibur (u_wield_art check); JS omits
// the artifact check since it needs player state — pass player.wieldsExcalibur to override.
export function can_track(ptr, wieldsExcalibur = false) {
    if (wieldsExcalibur) return true;
    return haseyes(ptr);
}

// C ref: mondata.c:567 — can_blow(mtmp)
// Returns true if monster can blow a horn.
// Note: C also checks Strangled for the hero; pass isStrangled=true for that case.
// C ref: is_silent(ptr) = msound == MS_SILENT; has_head(ptr) = !(M1_NOHEAD)
// C ref: verysmall(ptr) = msize < MZ_SMALL
export function can_blow(ptr, isStrangled = false) {
    if ((ptr.msound === MS_SILENT || ptr.msound === MS_BUZZ)
        && (breathless(ptr) || ptr.msize < MZ_SMALL || nohead(ptr) || ptr.mlet === S_EEL))
        return false;
    if (isStrangled) return false;
    return true;
}

// C ref: mondata.c:580 — can_chant(mtmp)
// Returns true if monster can chant (cast spells verbally or read scrolls).
// Note: C also checks Strangled for the hero; pass isStrangled=true for that case.
export function can_chant(ptr, isStrangled = false) {
    if (isStrangled || ptr.msound === MS_SILENT || nohead(ptr)
        || ptr.msound === MS_BUZZ || ptr.msound === MS_BURBLE)
        return false;
    return true;
}

// C ref: mondata.c:591 — can_be_strangled(mon)
// Returns true if monster is vulnerable to strangulation.
// Note: C checks worn amulet of magical breathing for monsters; JS omits (no worn item tracking).
// nobrainer = mindless(ptr); nonbreathing = breathless(ptr)
export function can_be_strangled(ptr) {
    if (nohead(ptr)) return false;
    const nobrainer = is_mindless(ptr);
    const nonbreathing = breathless(ptr);
    return !nobrainer || !nonbreathing;
}

// ========================================================================
// Monster growth/species predicates — C ref: mondata.c:1228-1360
// ========================================================================

// C ref: mondata.c:1228 — grownups table (pairs of [little, big])
// Encodes which monster types can grow into which.
const grownups = [
    [PM_CHICKATRICE,          PM_COCKATRICE],
    [PM_LITTLE_DOG,           PM_DOG],
    [PM_DOG,                  PM_LARGE_DOG],
    [PM_HELL_HOUND_PUP,       PM_HELL_HOUND],
    [PM_WINTER_WOLF_CUB,      PM_WINTER_WOLF],
    [PM_KITTEN,               PM_HOUSECAT],
    [PM_HOUSECAT,             PM_LARGE_CAT],
    [PM_PONY,                 PM_HORSE],
    [PM_HORSE,                PM_WARHORSE],
    [PM_KOBOLD,               PM_LARGE_KOBOLD],
    [PM_LARGE_KOBOLD,         PM_KOBOLD_LEADER],
    [PM_GNOME,                PM_GNOME_LEADER],
    [PM_GNOME_LEADER,         PM_GNOME_RULER],
    [PM_DWARF,                PM_DWARF_LEADER],
    [PM_DWARF_LEADER,         PM_DWARF_RULER],
    [PM_MIND_FLAYER,          PM_MASTER_MIND_FLAYER],
    [PM_ORC,                  PM_ORC_CAPTAIN],
    [PM_HILL_ORC,             PM_ORC_CAPTAIN],
    [PM_MORDOR_ORC,           PM_ORC_CAPTAIN],
    [PM_URUK_HAI,             PM_ORC_CAPTAIN],
    [PM_SEWER_RAT,            PM_GIANT_RAT],
    [PM_CAVE_SPIDER,          PM_GIANT_SPIDER],
    [PM_OGRE,                 PM_OGRE_LEADER],
    [PM_OGRE_LEADER,          PM_OGRE_TYRANT],
    [PM_ELF,                  PM_ELF_NOBLE],
    [PM_WOODLAND_ELF,         PM_ELF_NOBLE],
    [PM_GREEN_ELF,            PM_ELF_NOBLE],
    [PM_GREY_ELF,             PM_ELF_NOBLE],
    [PM_ELF_NOBLE,            PM_ELVEN_MONARCH],
    [PM_LICH,                 PM_DEMILICH],
    [PM_DEMILICH,             PM_MASTER_LICH],
    [PM_MASTER_LICH,          PM_ARCH_LICH],
    [PM_VAMPIRE,              PM_VAMPIRE_LEADER],
    [PM_BAT,                  PM_GIANT_BAT],
    [PM_BABY_GRAY_DRAGON,     PM_GRAY_DRAGON],
    [PM_BABY_GOLD_DRAGON,     PM_GOLD_DRAGON],
    [PM_BABY_SILVER_DRAGON,   PM_SILVER_DRAGON],
    [PM_BABY_RED_DRAGON,      PM_RED_DRAGON],
    [PM_BABY_WHITE_DRAGON,    PM_WHITE_DRAGON],
    [PM_BABY_ORANGE_DRAGON,   PM_ORANGE_DRAGON],
    [PM_BABY_BLACK_DRAGON,    PM_BLACK_DRAGON],
    [PM_BABY_BLUE_DRAGON,     PM_BLUE_DRAGON],
    [PM_BABY_GREEN_DRAGON,    PM_GREEN_DRAGON],
    [PM_BABY_YELLOW_DRAGON,   PM_YELLOW_DRAGON],
    [PM_RED_NAGA_HATCHLING,   PM_RED_NAGA],
    [PM_BLACK_NAGA_HATCHLING, PM_BLACK_NAGA],
    [PM_GOLDEN_NAGA_HATCHLING,PM_GOLDEN_NAGA],
    [PM_GUARDIAN_NAGA_HATCHLING, PM_GUARDIAN_NAGA],
    [PM_SMALL_MIMIC,          PM_LARGE_MIMIC],
    [PM_LARGE_MIMIC,          PM_GIANT_MIMIC],
    [PM_BABY_LONG_WORM,       PM_LONG_WORM],
    [PM_BABY_PURPLE_WORM,     PM_PURPLE_WORM],
    [PM_BABY_CROCODILE,       PM_CROCODILE],
    [PM_SOLDIER,              PM_SERGEANT],
    [PM_SERGEANT,             PM_LIEUTENANT],
    [PM_LIEUTENANT,           PM_CAPTAIN],
    [PM_WATCHMAN,             PM_WATCH_CAPTAIN],
    [PM_ALIGNED_CLERIC,       PM_HIGH_CLERIC],
    [PM_STUDENT,              PM_ARCHEOLOGIST],
    [PM_ATTENDANT,            PM_HEALER],
    [PM_PAGE,                 PM_KNIGHT],
    [PM_ACOLYTE,              PM_CLERIC],
    [PM_APPRENTICE,           PM_WIZARD],
    [PM_MANES,                PM_LEMURE],
    [PM_KEYSTONE_KOP,         PM_KOP_SERGEANT],
    [PM_KOP_SERGEANT,         PM_KOP_LIEUTENANT],
    [PM_KOP_LIEUTENANT,       PM_KOP_KAPTAIN],
];

// C ref: mondata.c:1303 — little_to_big(montype)
// Returns the grown-up form of a monster index, or the index itself if none.
export function little_to_big(montype) {
    for (const [little, big] of grownups)
        if (montype === little) return big;
    return montype;
}

// C ref: mondata.c:1316 — big_to_little(montype)
// Returns the juvenile form of a monster index, or the index itself if none.
// Autotranslated from mondata.c:1315
// TRANSLATOR: MANUAL big_to_little-grownups-shape
// Reason: JS runtime uses grownups tuple iteration; C-style grownups[i][k]
// emits are shape-incompatible and have caused restitch regressions.
export function big_to_little(montype) {
    for (const [little, big] of grownups)
        if (montype === big) return little;
    return montype;
}

// C ref: mondata.c:1331 — big_little_match(montyp1, montyp2)
// Returns true if the two monster indices are part of the same growth chain.
export function big_little_match(montyp1, montyp2) {
    if (montyp1 === montyp2) return true;
    if (mons[montyp1]?.mlet !== mons[montyp2]?.mlet) return false;
    // Check whether montyp1 can grow up into montyp2
    for (let l = montyp1, b; (b = little_to_big(l)) !== l; l = b)
        if (b === montyp2) return true;
    // Check whether montyp2 can grow up into montyp1
    for (let l = montyp2, b; (b = little_to_big(l)) !== l; l = b)
        if (b === montyp1) return true;
    return false;
}

// C ref: mondata.h macros used by same_race
// is_mind_flayer: PM_MIND_FLAYER or PM_MASTER_MIND_FLAYER
export function is_mind_flayer(ptr) {
    return ptr === mons[PM_MIND_FLAYER] || ptr === mons[PM_MASTER_MIND_FLAYER];
}
// is_unicorn: S_UNICORN symbol && likes_gems
export function is_unicorn(ptr) {
    return ptr.mlet === S_UNICORN && likes_gems(ptr);
}
// is_rider: Death, Famine, or Pestilence
export function is_rider(ptr) {
    return ptr === mons[PM_DEATH] || ptr === mons[PM_FAMINE] || ptr === mons[PM_PESTILENCE];
}
// is_longworm: baby long worm, long worm, or long worm tail
export function is_longworm(ptr) {
    return ptr === mons[PM_BABY_LONG_WORM] || ptr === mons[PM_LONG_WORM]
        || ptr === mons[PM_LONG_WORM_TAIL];
}

// C ref: mondata.c:771 — same_race(pm1, pm2)
// Returns true if two monster types are from the same species.
// Note: C's grow-up chain uses monsndx; JS uses mons.indexOf(ptr).
export function same_race(pm1, pm2) {
    if (pm1 === pm2) return true;
    // Player races
    if (is_human(pm1)) return is_human(pm2);
    if (is_elf(pm1)) return is_elf(pm2);
    if (is_dwarf(pm1)) return is_dwarf(pm2);
    if (is_gnome(pm1)) return is_gnome(pm2);
    if (is_orc(pm1)) return is_orc(pm2);
    // Other creature groupings
    if (is_giant(pm1)) return is_giant(pm2);
    if (is_golem(pm1)) return is_golem(pm2);
    if (is_mind_flayer(pm1)) return is_mind_flayer(pm2);
    // Kobolds (including zombie/mummy forms)
    const lkob = pm1.mlet === S_KOBOLD || pm1 === mons[PM_KOBOLD_ZOMBIE]
               || pm1 === mons[PM_KOBOLD_MUMMY];
    if (lkob) {
        return pm2.mlet === S_KOBOLD || pm2 === mons[PM_KOBOLD_ZOMBIE]
            || pm2 === mons[PM_KOBOLD_MUMMY];
    }
    if (pm1.mlet === S_OGRE) return pm2.mlet === S_OGRE;
    if (pm1.mlet === S_NYMPH) return pm2.mlet === S_NYMPH;
    if (pm1.mlet === S_CENTAUR) return pm2.mlet === S_CENTAUR;
    if (is_unicorn(pm1)) return is_unicorn(pm2);
    if (pm1.mlet === S_DRAGON) return pm2.mlet === S_DRAGON;
    if (pm1.mlet === S_NAGA) return pm2.mlet === S_NAGA;
    // Riders and minions
    if (is_rider(pm1)) return is_rider(pm2);
    if (is_minion(pm1)) return is_minion(pm2);
    // Tengu don't match imps
    const m1idx = mons.indexOf(pm1), m2idx = mons.indexOf(pm2);
    if (pm1 === mons[PM_TENGU] || pm2 === mons[PM_TENGU]) return false;
    if (pm1.mlet === S_IMP) return pm2.mlet === S_IMP;
    else if (pm2.mlet === S_IMP) return false;
    if (is_demon(pm1)) return is_demon(pm2);
    // Undead by sub-type
    if (is_undead(pm1)) {
        if (pm1.mlet === S_ZOMBIE) return pm2.mlet === S_ZOMBIE;
        if (pm1.mlet === S_MUMMY) return pm2.mlet === S_MUMMY;
        if (pm1.mlet === S_VAMPIRE) return pm2.mlet === S_VAMPIRE;
        if (pm1.mlet === S_LICH) return pm2.mlet === S_LICH;
        if (pm1.mlet === S_WRAITH) return pm2.mlet === S_WRAITH;
        if (pm1.mlet === S_GHOST) return pm2.mlet === S_GHOST;
    } else if (is_undead(pm2)) return false;
    // Check grow-up chains (same symbol class)
    if (pm1.mlet === pm2.mlet && m1idx >= 0 && m2idx >= 0) {
        if (big_little_match(m1idx, m2idx)) return true;
    }
    // Gargoyle family
    if (pm1 === mons[PM_GARGOYLE] || pm1 === mons[PM_WINGED_GARGOYLE])
        return pm2 === mons[PM_GARGOYLE] || pm2 === mons[PM_WINGED_GARGOYLE];
    // Bee family
    if (pm1 === mons[PM_KILLER_BEE] || pm1 === mons[PM_QUEEN_BEE])
        return pm2 === mons[PM_KILLER_BEE] || pm2 === mons[PM_QUEEN_BEE];
    // Longworm family
    if (is_longworm(pm1)) return is_longworm(pm2);
    return false;
}

// C ref: mondata.c:1211 — determine if monster will follow player across levels
// player arg carries: player.usteed (steed ref), player.inventory (to check for Amulet of Yendor)
// mon arg is a live monster (not just permonst ptr): has tame, iswiz, flee, isshk, following, minvent
export function levl_follower(mon, player) {
    // C: if (mtmp == u.usteed) return TRUE
    if (player && mon === player.usteed) return true;
    // C: if (mtmp->iswiz && mon_has_amulet(mtmp)) return FALSE
    // mon_has_amulet: monster inventory contains the Amulet of Yendor
    if (mon.iswiz && (mon.minvent || []).some(o => o?.otyp === AMULET_OF_YENDOR)) return false;
    // C: if (mtmp->mtame || mtmp->iswiz || is_fshk(mtmp)) return TRUE
    // is_fshk: isshk && eshk->following
    if (mon.tame || mon.iswiz || (mon.isshk && mon.following)) return true;
    // C: return (mtmp->data->mflags2 & M2_STALK) && (!mtmp->mflee || u.uhave.amulet)
    const playerHasAmulet = player && Array.isArray(player.inventory)
        && player.inventory.some(o => o?.otyp === AMULET_OF_YENDOR);
    return !!((mon.data || mon.type)?.mflags2 & M2_STALK) && (!mon.mflee || !!playerHasAmulet);
}

// ========================================================================
// Missing mondata.h macro predicates — C ref: include/mondata.h
// ========================================================================

// C ref: #define pm_resistance(ptr, typ) (((ptr)->mresists & (typ)) != 0)
export function pm_resistance(ptr, typ) { return !!(ptr.mresists & typ); }

// ========================================================================
// Resistance check helpers — C ref: include/mondata.h resists_* macros
// These take a monster instance (has .type/.data) and check intrinsic
// resistance from the permonst entry. Equipment-based resistance is omitted
// since JS doesn't yet track monster worn items with oc_oprop.
// ========================================================================

// Helper to get permonst from either a monster instance or a permonst pointer
function _mdat(mon) { return mon?.type || mon?.data || mon; }

// C ref: #define resists_fire(mon) (mon->data->mresists & MR_FIRE || defended(mon, AD_FIRE))
export function resists_fire(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_FIRE); }

// C ref: #define resists_cold(mon)
export function resists_cold(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_COLD); }

// C ref: #define resists_sleep(mon)
export function resists_sleep(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_SLEEP); }

// C ref: #define resists_disint(mon)
export function resists_disint(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_DISINT); }

// C ref: #define resists_elec(mon)
export function resists_elec(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_ELEC); }

// C ref: #define resists_poison(mon)
export function resists_poison(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_POISON); }

// C ref: #define resists_acid(mon)
export function resists_acid(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_ACID); }

// C ref: #define resists_ston(mon) — stoning resistance
export function resists_ston(mon) { return !!((_mdat(mon)?.mresists || 0) & MR_STONE); }

// ========================================================================
// monsndx — C ref: mondata.c:monsndx / mon.h macro
// Get the mons[] array index for a permonst pointer.
// ========================================================================
export function monsndx(ptr) {
    if (ptr == null) return -1;
    if (typeof ptr.mndx === 'number') return ptr.mndx;
    const idx = mons.indexOf(ptr);
    return idx >= 0 ? idx : -1;
}

// ========================================================================
// set_mon_data — C ref: mondata.c:13
// Assign new permonst pointer to a monster, prorating movement if slower.
// ========================================================================
export function set_mon_data(mon, ptr) {
    const old_speed = mon.data ? mon.data.mmove : 0;
    mon.data = ptr;
    mon.mnum = monsndx(ptr);

    if (mon.movement) {
        const new_speed = ptr.mmove;
        if (new_speed < old_speed && old_speed > 0) {
            mon.movement = Math.floor(mon.movement * new_speed / old_speed);
        }
    }
}

// ========================================================================
// attacktype_fordmg — C ref: mondata.c:42
// Returns the attack entry matching atyp+dtyp, or null.
// ========================================================================
export function attacktype_fordmg(ptr, atyp, dtyp) {
    if (!ptr || !ptr.mattk) return null;
    for (const a of ptr.mattk) {
        if (a.aatyp === atyp && (dtyp === AD_ANY || a.adtyp === dtyp))
            return a;
    }
    return null;
}

// ========================================================================
// is_vampshifter — C ref: mon.h
// True if mon's cham form is a vampire type.
// ========================================================================
export function is_vampshifter(mtmp) {
    if (mtmp.cham == null || mtmp.cham < 0) return false;
    const chamData = mons[mtmp.cham];
    return chamData && chamData.mlet === S_VAMPIRE;
}

// ========================================================================
// defended — C ref: mondata.c:91
// Is monster protected against damage type via wielded artifact or dragon armor?
// ========================================================================
export function defended(mon, adtyp) {
    if (!mon) return false;
    // Check wielded artifact
    const wep = mon.weapon || mon.mw || null;
    if (wep && wep.oartifact && defends(adtyp, wep))
        return true;

    // Check if monster IS an adult dragon (treat as wearing own scales)
    const mndx = monsndx(mon.data || mon);
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_GRAY_DRAGON + 9) {
        // Simulate dragon scales object for defends() check
        const fakeObj = { oclass: ARMOR_CLASS, otyp: GRAY_DRAGON_SCALES + (mndx - PM_GRAY_DRAGON) };
        if (defends(adtyp, fakeObj))
            return true;
    } else {
        // Check worn body armor (W_ARM slot)
        const inv = mon.minvent;
        if (inv) {
            for (let o = inv; o; o = o.nobj) {
                if ((o.owornmask & W_ARMOR) && o.oartifact && defends(adtyp, o))
                    return true;
                // Dragon scales/mail check
                if ((o.owornmask & W_ARMOR) && o.otyp >= GRAY_DRAGON_SCALES
                    && o.otyp <= GRAY_DRAGON_SCALES + 19 // scales + mail variants
                    && defends(adtyp, o))
                    return true;
            }
        }
    }
    return false;
}

// ========================================================================
// resists_magm — C ref: mondata.c:215
// True if monster is magic-missile (general magic) resistant.
// ========================================================================
export function resists_magm(mon) {
    const ptr = _mdat(mon);
    if (!ptr) return false;
    // Gray dragons, Angels, Oracle, Yeenoghu (AD_MAGM), Chromatic Dragon (AD_RBRE)
    if (dmgtype(ptr, AD_MAGM) || ptr === mons[PM_BABY_GRAY_DRAGON]
        || dmgtype(ptr, AD_RBRE))
        return true;
    // Check wielded artifact
    const wep = mon.weapon || mon.mw || null;
    if (wep && wep.oartifact && defends(AD_MAGM, wep))
        return true;
    // Check worn/carried items for ANTIMAGIC property
    if (mon.minvent) {
        for (let o = mon.minvent; o; o = o.nobj) {
            if ((o.owornmask & (W_ARMOR | W_AMUL))
                && objectData[o.otyp]?.oc_oprop === ANTIMAGIC)
                return true;
            if (o.oartifact && defends_when_carried(AD_MAGM, o))
                return true;
        }
    }
    return false;
}

// ========================================================================
// resists_drli — C ref: mondata.c:201
// True if monster is drain-life resistant.
// ========================================================================
export function resists_drli(mon) {
    const ptr = _mdat(mon);
    if (!ptr) return false;
    if (is_undead(ptr) || is_demon(ptr) || is_were(ptr)
        || is_vampshifter(mon))
        return true;
    return defended(mon, AD_DRLI);
}

// ========================================================================
// Resists_Elem — C ref: mondata.c:129
// True if monster resists elemental property (FIRE_RES..STONE_RES, ANTIMAGIC, DRAIN_RES, BLND_RES).
// ========================================================================
export function Resists_Elem(mon, propindx) {
    const is_you = !!(mon && Array.isArray(mon.inventory));
    let u_resist = 0, damgtype = 0, rsstmask = 0;

    switch (propindx) {
    case FIRE_RES: case COLD_RES: case SLEEP_RES: case DISINT_RES:
    case SHOCK_RES: case POISON_RES: case ACID_RES: case STONE_RES:
        damgtype = propindx + 1;
        rsstmask = 1 << (propindx - 1);
        if (is_you) {
            const player = mon;
            u_resist = (player.uprops?.[propindx]?.intrinsic || 0)
                     | (player.uprops?.[propindx]?.extrinsic || 0);
        }
        break;
    case ANTIMAGIC:
        return resists_magm(mon);
    case DRAIN_RES:
        return resists_drli(mon);
    case BLND_RES:
        return resists_blnd(mon);
    default:
        return false;
    }

    if (is_you ? u_resist : ((mon_resistancebits(mon) & rsstmask) !== 0))
        return true;
    // Check wielded weapon artifact
    const wep = is_you ? (mon.weapon || null) : (mon.mw || mon.weapon || null);
    if (wep && wep.oartifact && defends(damgtype, wep))
        return true;
    // Check worn/carried items
    const inv = is_you ? (mon.inventoryChain || null) : (mon.minvent || null);
    let slotmask = W_ARMOR | W_ACCESSORY;
    if (!is_you || (wep && (wep.oclass === WEAPON_CLASS || _is_weptool(wep))))
        slotmask |= W_WEP;
    if (is_you && mon.twoweap)
        slotmask |= W_SWAPWEP;
    for (let o = inv; o; o = o.nobj) {
        if (((o.owornmask & slotmask) !== 0
             && objectData[o.otyp]?.oc_oprop === propindx)
            || ((o.owornmask & W_ARMC) === W_ARMC
                && o.otyp === ALCHEMY_SMOCK
                && (propindx === POISON_RES || propindx === ACID_RES))
            || (o.oartifact && defends_when_carried(damgtype, o)))
            return true;
    }
    return false;
}

// Helper: mon_resistancebits — get mresists bitmask from monster data
function mon_resistancebits(mon) {
    const ptr = _mdat(mon);
    return (ptr?.mresists || 0) | (mon?.mintrinsics || 0);
}

// Lazy import helper for is_weptool (avoid circular dep)
function _is_weptool(obj) {
    try { return obj && (objectData[obj.otyp]?.oc_class === WEAPON_CLASS || false); }
    catch { return false; }
}

// ========================================================================
// resists_blnd — C ref: mondata.c:248
// True if monster is resistant to light-induced blindness.
// ========================================================================
export function resists_blnd(mon) {
    const ptr = _mdat(mon);
    if (!ptr) return false;
    const is_you = !!(mon && Array.isArray(mon.inventory));

    if (is_you) {
        // Player: Blind || Unaware
        if (mon.blind || mon.creamed) return true;
    } else {
        // Monster: mblinded || !mcansee || !haseyes || msleeping
        if (mon.mblinded || !mon.mcansee || !haseyes(ptr) || mon.msleeping)
            return true;
    }
    // Yellow light, Archon: AT_EXPL+AD_BLND or AT_GAZE+AD_BLND
    if (dmgtype_fromattack(ptr, AD_BLND, AT_EXPL)
        || dmgtype_fromattack(ptr, AD_BLND, AT_GAZE))
        return true;
    // Sunsword
    if (resists_blnd_by_arti(mon))
        return true;
    return false;
}

// ========================================================================
// resists_blnd_by_arti — C ref: mondata.c:278
// True if monster resists blindness due to worn/wielded magical equipment.
// ========================================================================
export function resists_blnd_by_arti(mon) {
    const is_you = !!(mon && Array.isArray(mon.inventory));
    const wep = is_you ? (mon.weapon || null) : (mon.mw || mon.weapon || null);
    if (wep && wep.oartifact && defends(AD_BLND, wep))
        return true;
    const inv = is_you ? (mon.inventoryChain || null) : (mon.minvent || null);
    for (let o = inv; o; o = o.nobj) {
        if (defends_when_carried(AD_BLND, o))
            return true;
    }
    return false;
}

// ========================================================================
// can_blnd — C ref: mondata.c:305
// True if mdef can be blinded by magr's attack of type aatyp with obj.
// ========================================================================
export function can_blnd(magr, mdef, aatyp, obj) {
    const is_you = !!(mdef && Array.isArray(mdef.inventory));
    let check_visor = false;

    if (!haseyes(mdef.data || mdef))
        return false;
    if (!is_you && mon_perma_blind(mdef))
        return false;
    // Ravens don't blind each other
    if (magr && (magr.data || magr) === mons[PM_RAVEN]
        && (mdef.data || mdef) === mons[PM_RAVEN])
        return false;

    switch (aatyp) {
    case AT_EXPL: case AT_BOOM: case AT_GAZE: case AT_MAGC: case AT_BREA:
        if (magr && magr.mcan) return false;
        return !resists_blnd(mdef);
    case AT_WEAP: case AT_SPIT: case AT_NONE:
        if (obj && obj.otyp === CREAM_PIE) {
            if (is_you && mdef.blindfolded) return false;
        } else if (obj && obj.otyp === BLINDING_VENOM) {
            if (is_you && (mdef.ublindf || mdef.creamed)) return false;
            check_visor = true;
        } else if (obj && obj.otyp === POT_BLINDNESS) {
            return true;
        } else {
            return false;
        }
        if (magr && (magr === _gstate?.youmonst) && _gstate?.player?.uswallow)
            return false;
        break;
    case AT_ENGL:
        if (is_you && (mdef.blindfolded || mdef.blind || mdef.creamed))
            return false;
        if (!is_you && mdef.msleeping) return false;
        break;
    case AT_CLAW:
        if (is_you && mdef.ublindf) return false;
        if (magr && (magr === _gstate?.youmonst) && _gstate?.player?.uswallow)
            return false;
        check_visor = true;
        break;
    case AT_TUCH: case AT_STNG:
        if (magr && magr.mcan) return false;
        break;
    default:
        break;
    }

    if (check_visor) {
        const inv = is_you ? (mdef.inventoryChain || null) : (mdef.minvent || null);
        for (let o = inv; o; o = o.nobj) {
            if ((o.owornmask & W_ARMH) && _objdescr_is(o, 'visored helmet'))
                return false;
        }
    }
    return true;
}

// Helper: mon_perma_blind — C ref: monst.h
function mon_perma_blind(mon) {
    return !mon.mcansee && !mon.mblinded;
}

// Lazy objdescr_is helper (avoid circular dep with o_init.js)
function _objdescr_is(obj, descr) {
    const d = objectData[obj.otyp]?.oc_descr;
    return d ? d.toLowerCase() === descr.toLowerCase() : false;
}

// ========================================================================
// max_passive_dmg — C ref: mondata.c:720
// Maximum passive damage mdef can do to magr.
// ========================================================================
export function max_passive_dmg(mdef, magr) {
    const mdefData = _mdat(mdef);
    const magrData = _mdat(magr);
    if (!mdefData || !magrData) return 0;

    let multi2 = 0;
    for (let i = 0; i < NATTK; i++) {
        const a = magrData.mattk?.[i];
        if (!a) continue;
        switch (a.aatyp) {
        case AT_CLAW: case AT_BITE: case AT_KICK: case AT_BUTT:
        case AT_TUCH: case AT_STNG: case AT_HUGS: case AT_ENGL:
        case AT_TENT: case AT_WEAP:
            multi2++;
            break;
        default: break;
        }
    }

    let dmg = 0;
    for (let i = 0; i < NATTK; i++) {
        const a = mdefData.mattk?.[i];
        if (!a) continue;
        if (a.aatyp !== AT_NONE && a.aatyp !== AT_BOOM) continue;
        const adtyp = a.adtyp;
        if ((adtyp === AD_FIRE && completelyburns(magrData))
            || (adtyp === AD_DCAY && completelyrots(magrData))
            || (adtyp === AD_RUST && completelyrusts(magrData))) {
            dmg = magr.mhp || 0;
        } else if ((adtyp === AD_ACID && !resists_acid(magr))
                   || (adtyp === AD_COLD && !resists_cold(magr))
                   || (adtyp === AD_FIRE && !resists_fire(magr))
                   || (adtyp === AD_ELEC && !resists_elec(magr))
                   || adtyp === AD_PHYS) {
            dmg = a.damn || 0;
            if (!dmg) dmg = (mdefData.mlevel || 0) + 1;
            dmg *= (a.damd || 0);
        }
        dmg *= multi2;
        break;
    }
    return dmg;
}

// ========================================================================
// mstrength — C ref: mondata.c:428
// Approximation of monster strength (for difficulty rating).
// ========================================================================
export function mstrength(ptr) {
    let tmp = ptr.mlevel || 0;
    if (tmp > 49) tmp = Math.floor(2 * (tmp - 6) / 4);

    let n = !!(ptr.geno & G_SGROUP) ? 1 : 0;
    n += (!!(ptr.geno & G_LGROUP)) << 1;

    if (mstrength_ranged_attk(ptr)) n++;

    n += (ptr.ac < 4) ? 1 : 0;
    n += (ptr.ac < 0) ? 1 : 0;
    n += (ptr.mmove >= 18) ? 1 : 0;

    for (let i = 0; i < NATTK; i++) {
        const a = ptr.mattk?.[i];
        if (!a) continue;
        const tmp2 = a.aatyp;
        n += (tmp2 > 0) ? 1 : 0;
        n += (tmp2 === AT_MAGC) ? 1 : 0;
        n += (tmp2 === AT_WEAP && (ptr.mflags2 & M2_STRONG)) ? 1 : 0;
        if (tmp2 === AT_EXPL) {
            const tmp3 = a.adtyp;
            n += ((tmp3 === AD_COLD || tmp3 === AD_FIRE) ? 3
                  : (tmp3 === AD_ELEC) ? 5 : 0);
        }
    }

    for (let i = 0; i < NATTK; i++) {
        const a = ptr.mattk?.[i];
        if (!a) continue;
        const tmp2 = a.adtyp;
        if (tmp2 === AD_DRLI || tmp2 === AD_STON || tmp2 === AD_DRST
            || tmp2 === AD_DRDX || tmp2 === AD_DRCO || tmp2 === AD_WERE)
            n += 2;
        else if ((ptr.mname || '') !== 'grid bug')
            n += (tmp2 !== AD_PHYS) ? 1 : 0;
        n += (((a.damd || 0) * (a.damn || 0)) > 23) ? 1 : 0;
    }

    if ((ptr.mname || '') === 'leprechaun') n -= 2;
    if ((ptr.mname || '') === 'killer bee' || (ptr.mname || '') === 'soldier ant')
        n += 2;

    if (n === 0) tmp -= 1;
    else if (n < 6) tmp += (Math.floor(n / 3) + 1);
    else tmp += Math.floor(n / 2);

    return tmp >= 0 ? tmp : 0;
}

// ========================================================================
// raceptr — C ref: mondata.c:1359
// Return the permonst ptr for the race of the monster.
// ========================================================================
export function raceptr(mtmp) {
    const player = _gstate?.player;
    if (player && mtmp === player && !player.Upolyd) {
        const raceNum = player.urace?.mnum ?? -1;
        return raceNum >= 0 ? mons[raceNum] : mtmp.data;
    }
    return mtmp.data;
}

// ========================================================================
// on_fire — C ref: mondata.c:1411
// Returns description of what happens when monster is on fire.
// ========================================================================
export function on_fire(mptr, mattk) {
    const mndx = monsndx(mptr);
    switch (mndx) {
    case PM_FLAMING_SPHERE: case PM_FIRE_VORTEX:
    case PM_FIRE_ELEMENTAL: case PM_SALAMANDER:
        return 'already on fire';
    case PM_WATER_ELEMENTAL: case PM_FOG_CLOUD: case PM_STEAM_VORTEX:
        return 'boiling';
    case PM_ICE_VORTEX: case PM_GLASS_GOLEM:
        return 'melting';
    case PM_STONE_GOLEM: case PM_CLAY_GOLEM: case PM_GOLD_GOLEM:
    case PM_AIR_ELEMENTAL: case PM_EARTH_ELEMENTAL:
    case PM_DUST_VORTEX: case PM_ENERGY_VORTEX:
        return 'heating up';
    default:
        return (mattk && mattk.aatyp === AT_HUGS) ? 'being roasted' : 'on fire';
    }
}

// ========================================================================
// msummon_environ — C ref: mondata.c:1449
// Returns {what, cloud} describing summoning environment for monster.
// ========================================================================
export function msummon_environ(mptr) {
    const mndx = (mptr.mlet === S_ANGEL) ? PM_ANGEL
                 : (mptr.mlet === S_LIGHT) ? PM_YELLOW_LIGHT
                   : monsndx(mptr);
    let cloud = 'cloud';
    let what;
    switch (mndx) {
    case PM_WATER_DEMON: case PM_AIR_ELEMENTAL: case PM_WATER_ELEMENTAL:
    case PM_FOG_CLOUD: case PM_ICE_VORTEX: case PM_FREEZING_SPHERE:
        what = 'vapor'; break;
    case PM_STEAM_VORTEX:
        what = 'steam'; break;
    case PM_ENERGY_VORTEX: case PM_SHOCKING_SPHERE:
        cloud = 'shower'; what = 'sparks'; break;
    case PM_EARTH_ELEMENTAL: case PM_DUST_VORTEX:
        what = 'dust'; break;
    case PM_FIRE_ELEMENTAL: case PM_FIRE_VORTEX: case PM_FLAMING_SPHERE:
        cloud = 'ball'; what = 'flame'; break;
    case PM_ANGEL: case PM_YELLOW_LIGHT:
        cloud = 'flash'; what = 'light'; break;
    default:
        what = 'smoke'; break;
    }
    return { what, cloud };
}

// ========================================================================
// pronoun_gender — C ref: mondata.c:1191
// Returns 0=male, 1=female, 2=neuter, 3=they(hallu).
// ========================================================================
export function pronoun_gender(mtmp, pg_flags) {
    const override_vis = !!(pg_flags & PRONOUN_NO_IT);
    const hallu_rand = !!(pg_flags & PRONOUN_HALLU);
    const player = _gstate?.player;

    if (hallu_rand && player?.hallucination) return rn2(4);
    if (!override_vis && !canseemon(mtmp)) return 2;
    if (is_neuter(mtmp.data || mtmp)) return 2;
    const ptr = mtmp.data || mtmp;
    return (humanoid(ptr) || (ptr.geno & G_UNIQ) || type_is_pname(ptr))
        ? (mtmp.female ? 1 : 0) : 2;
}

// ========================================================================
// name_to_mon — C ref: mondata.c:883
// Wrapper for name_to_monplus.
// ========================================================================
export function name_to_mon(in_str) {
    return name_to_monplus(in_str, null);
}

// ========================================================================
// name_to_monplus — C ref: mondata.c:893
// Figure out monster type from user-supplied string; return PM index.
// ========================================================================
export function name_to_monplus(in_str, remainder_ref) {
    if (!in_str) return NON_PM;
    let str = in_str;

    // Strip leading articles
    if (str.startsWith('a ')) str = str.slice(2);
    else if (str.startsWith('an ')) str = str.slice(3);
    else if (str.startsWith('the ')) str = str.slice(4);

    // Depluralization
    if (str.includes('vortices')) str = str.replace('vortices', 'vortex');
    else if (str.length > 3 && str.endsWith('ies')
             && !(str.length >= 7 && str.endsWith('zombies')))
        str = str.slice(0, -3) + 'y';
    else if (str.length > 3 && str.endsWith('ves'))
        str = str.slice(0, -3) + 'f';

    // Alternate spellings table
    const altNames = [
        ['grey dragon', PM_GRAY_DRAGON, NEUTER],
        ['baby grey dragon', PM_BABY_GRAY_DRAGON, NEUTER],
        ['grey unicorn', PM_GRAY_UNICORN, NEUTER],
        ['mindflayer', PM_MIND_FLAYER, NEUTER],
        ['master mindflayer', PM_MASTER_MIND_FLAYER, NEUTER],
        ['aligned priest', PM_ALIGNED_CLERIC, MALE],
        ['aligned priestess', PM_ALIGNED_CLERIC, FEMALE],
        ['high priest', PM_HIGH_CLERIC, MALE],
        ['high priestess', PM_HIGH_CLERIC, FEMALE],
        ['master of thief', PM_MASTER_OF_THIEVES, NEUTER],
        ['master thief', PM_MASTER_OF_THIEVES, NEUTER],
        ['master of assassin', PM_MASTER_ASSASSIN, NEUTER],
        ['master-lich', PM_MASTER_LICH, NEUTER],
        ['masterlich', PM_MASTER_LICH, NEUTER],
        ['invisible stalker', PM_STALKER, NEUTER],
        ['high-elf', PM_ELVEN_MONARCH, NEUTER],
        ['wood-elf', PM_WOODLAND_ELF, NEUTER],
        ['wood elf', PM_WOODLAND_ELF, NEUTER],
        ['woodland nymph', PM_WOOD_NYMPH, NEUTER],
        ['halfling', PM_HOBBIT, NEUTER],
        ['genie', PM_DJINNI, NEUTER],
        ['human wererat', PM_HUMAN_WERERAT, NEUTER],
        ['human werejackal', PM_HUMAN_WEREJACKAL, NEUTER],
        ['human werewolf', PM_HUMAN_WEREWOLF, NEUTER],
        ['rat wererat', PM_WERERAT, NEUTER],
        ['jackal werejackal', PM_WEREJACKAL, NEUTER],
        ['wolf werewolf', PM_WEREWOLF, NEUTER],
        ['ki rin', PM_KI_RIN, NEUTER],
        ['kirin', PM_KI_RIN, NEUTER],
        ['uruk hai', PM_URUK_HAI, NEUTER],
        ['orc captain', PM_ORC_CAPTAIN, NEUTER],
        ['woodland elf', PM_WOODLAND_ELF, NEUTER],
        ['green elf', PM_GREEN_ELF, NEUTER],
        ['grey elf', PM_GREY_ELF, NEUTER],
        ['gray elf', PM_GREY_ELF, NEUTER],
        ['elf lady', PM_ELF_NOBLE, FEMALE],
        ['elf lord', PM_ELF_NOBLE, MALE],
        ['elf noble', PM_ELF_NOBLE, NEUTER],
        ['olog hai', PM_OLOG_HAI, NEUTER],
        ['arch lich', PM_ARCH_LICH, NEUTER],
        ['archlich', PM_ARCH_LICH, NEUTER],
        ['incubi', PM_AMOROUS_DEMON, MALE],
        ['succubi', PM_AMOROUS_DEMON, FEMALE],
        ['violet fungi', PM_VIOLET_FUNGUS, NEUTER],
        ['homunculi', PM_HOMUNCULUS, NEUTER],
        ['baluchitheria', PM_BALUCHITHERIUM, NEUTER],
        ['lurkers above', PM_LURKER_ABOVE, NEUTER],
        ['cavemen', PM_CAVE_DWELLER, MALE],
        ['cavewomen', PM_CAVE_DWELLER, FEMALE],
        ['watchmen', PM_WATCHMAN, NEUTER],
        ['djinn', PM_DJINNI, NEUTER],
        ['mumakil', PM_MUMAK, NEUTER],
        ['erinyes', PM_ERINYS, NEUTER],
    ];
    const strLower = str.toLowerCase();
    for (const [name, pm, gend] of altNames) {
        const len = name.length;
        if (strLower.startsWith(name)
            && (!str[len] || str[len] === ' ' || str[len] === '\'')) {
            if (remainder_ref) remainder_ref.value = in_str.slice(in_str.length - str.length + len);
            return pm;
        }
    }

    // Match against mons[].mname (longest match wins)
    let mntmp = NON_PM, bestLen = 0;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        const mname = mons[i].mname;
        if (!mname) continue;
        const mLen = mname.length;
        if (mLen > bestLen && strLower.startsWith(mname.toLowerCase())) {
            if (mLen === str.length) {
                mntmp = i; bestLen = mLen; break; // exact match
            } else if (str.length > mLen) {
                const after = str.slice(mLen);
                if (after === ' ' || after.startsWith(' ')
                    || /^(s|s |'|' |'s|'s |es|es )$/i.test(after)
                    || after.startsWith('s ') || after.startsWith("' ")
                    || after.startsWith("'s ") || after.startsWith('es ')) {
                    mntmp = i; bestLen = mLen;
                }
            }
        }
    }
    if (mntmp === NON_PM) {
        const result = title_to_mon(str, null, null);
        if (result >= 0) mntmp = result;
    }
    if (bestLen && remainder_ref) {
        remainder_ref.value = in_str.slice(in_str.length - str.length + bestLen);
    }
    return mntmp;
}

// ========================================================================
// name_to_monclass — C ref: mondata.c:1090
// Returns monster class from user input; used for genocide/polymorph.
// ========================================================================
export function name_to_monclass(in_str, mndx_ref) {
    if (mndx_ref) mndx_ref.value = NON_PM;
    if (!in_str || !in_str[0]) return 0;

    if (in_str.length === 1) {
        let i = _def_char_to_monclass(in_str.charCodeAt(0));
        if (i === S_MIMIC_DEF) i = S_MIMIC;
        else if (i === S_WORM_TAIL) {
            i = S_WORM;
            if (mndx_ref) mndx_ref.value = PM_LONG_WORM;
        } else if (i === MAXMCLASSES) {
            i = (in_str === 'I') ? S_invisible : 0;
        }
        return i;
    }

    // Multiple characters
    if (in_str.toLowerCase() === 'long') return 0;

    const falsematch = ['an', 'the', 'or', 'other', 'or other'];
    const truematch = [
        ['long worm', PM_LONG_WORM, NEUTER],
        ['demon', -S_DEMON, NEUTER],
        ['devil', -S_DEMON, NEUTER],
        ['bug', -S_XAN, NEUTER],
        ['fish', -S_EEL, NEUTER],
    ];

    const lower = in_str.toLowerCase();
    for (const f of falsematch)
        if (lower === f) return 0;
    for (const [name, pm_val] of truematch) {
        if (lower === name) {
            if (pm_val < 0) return -pm_val;
            if (mndx_ref) mndx_ref.value = pm_val;
            return mons[pm_val].mlet;
        }
    }

    // Check class descriptions
    const len = in_str.length;
    for (let i = 1; i < MAXMCLASSES; i++) {
        const x = def_monsyms[i]?.explain || '';
        const idx = x.toLowerCase().indexOf(lower);
        if (idx >= 0 && (idx === 0 || x[idx - 1] === ' ')) {
            if (x.length - idx >= len && (idx + len >= x.length || x[idx + len] === ' ' || x[idx + len] === '\0'))
                return i;
        }
    }

    // Check individual species
    const i = name_to_mon(in_str);
    if (i !== NON_PM) {
        if (mndx_ref) mndx_ref.value = i;
        return mons[i].mlet;
    }
    return 0;
}

// (S_XAN imported from monsters.js)

// Helper: def_char_to_monclass by character code
function _def_char_to_monclass(ch) {
    for (let i = 1; i < MAXMCLASSES; i++) {
        if (def_monsyms[i] && def_monsyms[i].sym === String.fromCharCode(ch))
            return i;
    }
    return MAXMCLASSES;
}

// ========================================================================
// resist_conflict — C ref: mondata.c:1607
// Returns true if monster resists Conflict effect.
// ========================================================================
export function resist_conflict(mtmp, player) {
    const m_lev = mtmp.m_lev || (mtmp.data || mtmp.type || {}).mlevel || 0;
    const cha = player ? acurr(player, A_CHA) : 10;
    const ulevel = player?.ulevel || 1;
    const resist_chance = Math.min(19, cha - m_lev + ulevel);
    return rnd(20) > resist_chance;
}

// ========================================================================
// Magic negation — C ref: mhitu.c:1085 magic_negation()
// Computes armor-based magic cancellation level (0-3).
// Uses worn inventory masks (owornmask), matching C traversal over gi.invent
// for hero and mon->minvent for monsters.
// ========================================================================
export function magic_negation(mon) {
    const ptr = _mdat(mon);
    const isYou = !!(mon && Array.isArray(mon.inventory));
    let mc = 0;
    let viaAmul = false;
    let gotprot = !isYou && ptr === mons[PM_HIGH_CLERIC];

    const inv = [];
    if (Array.isArray(mon?.inventory)) inv.push(...mon.inventory);
    if (Array.isArray(mon?.minvent)) inv.push(...mon.minvent);
    else if (mon?.minvent && typeof mon.minvent === 'object') {
        const seen = new Set();
        for (let o = mon.minvent; o && !seen.has(o); o = o.nobj) {
            seen.add(o);
            inv.push(o);
        }
    }

    for (const o of inv) {
        if (!o) continue;
        const worn = o.owornmask || 0;
        if (worn & W_ARMOR) {
            const armpro = Number(objectData[o.otyp]?.oc_oc2) || 0; // objects[].a_can
            if (armpro > mc) mc = armpro;
        } else if ((worn & W_AMUL) && o.otyp === AMULET_OF_GUARDING) {
            viaAmul = true;
        }
    }

    if (gotprot) {
        mc += viaAmul ? 2 : 1;
        if (mc > 3) mc = 3;
    } else if (mc < 1) {
        if (!isYou && (ptr === mons[PM_ALIGNED_CLERIC] || is_minion(ptr))) {
            mc = 1;
        }
    }
    return mc;
}

// C ref: #define immune_poisongas(ptr) ((ptr)==&mons[PM_HEZROU] || (ptr)==&mons[PM_VROCK])
export function immune_poisongas(ptr) {
    return ptr === mons[PM_HEZROU] || ptr === mons[PM_VROCK];
}

// Movement aliases — C ref: mondata.h
// C ref: #define is_flyer(ptr)   (((ptr)->mflags1 & M1_FLY) != 0L)
export function is_flyer(ptr) { return !!(ptr.mflags1 & M1_FLY); }

// C ref: #define is_swimmer(ptr) (((ptr)->mflags1 & M1_SWIM) != 0L)
export function is_swimmer(ptr) { return !!(ptr.mflags1 & M1_SWIM); }

// C ref: #define tunnels(ptr)    (((ptr)->mflags1 & M1_TUNNEL) != 0L)
export function tunnels(ptr) { return !!(ptr.mflags1 & M1_TUNNEL); }

// C ref: #define needspick(ptr)  (((ptr)->mflags1 & M1_NEEDPICK) != 0L)
export function needspick(ptr) { return !!(ptr.mflags1 & M1_NEEDPICK); }

// C ref: #define is_floater(ptr) ((ptr)->mlet == S_EYE || (ptr)->mlet == S_LIGHT)
export function is_floater(ptr) { return ptr.mlet === S_EYE || ptr.mlet === S_LIGHT; }

// C ref: #define noncorporeal(ptr) ((ptr)->mlet == S_GHOST)
export function noncorporeal(ptr) { return ptr.mlet === S_GHOST; }

// C ref: #define is_whirly(ptr) ((ptr)->mlet == S_VORTEX || (ptr)==&mons[PM_AIR_ELEMENTAL])
export function is_whirly(ptr) {
    return ptr.mlet === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
}

// C ref: #define cant_drown(ptr) (is_swimmer(ptr) || amphibious(ptr) || breathless(ptr))
export function cant_drown(ptr) { return is_swimmer(ptr) || amphibious(ptr) || breathless(ptr); }

// C ref: #define grounded(ptr) (!is_flyer(ptr) && !is_floater(ptr) && (!is_clinger(ptr) || !has_ceiling(&u.uz)))
// hasCeiling: pass false for levels without a ceiling (outdoors, Astral Plane, etc.).
// Defaults to true (standard dungeon levels have a ceiling).
export function grounded(ptr, hasCeiling = true) {
    return !is_flyer(ptr) && !is_floater(ptr) && (!is_clinger(ptr) || !hasCeiling);
}

// C ref: #define ceiling_hider(ptr) (is_hider(ptr) && ((is_clinger(ptr) && (ptr)->mlet != S_MIMIC) || is_flyer(ptr)))
export function ceiling_hider(ptr) {
    return is_hider(ptr)
        && ((is_clinger(ptr) && ptr.mlet !== S_MIMIC) || is_flyer(ptr));
}

// C ref: #define eyecount(ptr) (!haseyes(ptr) ? 0 : ((ptr)==&mons[PM_CYCLOPS] || (ptr)==&mons[PM_FLOATING_EYE]) ? 1 : 2)
export function eyecount(ptr) {
    if (!haseyes(ptr)) return 0;
    if (ptr === mons[PM_CYCLOPS] || ptr === mons[PM_FLOATING_EYE]) return 1;
    return 2;
}

// C ref: #define has_head(ptr) (((ptr)->mflags1 & M1_NOHEAD) == 0L)
export function has_head(ptr) { return !(ptr.mflags1 & M1_NOHEAD); }

// C ref: #define has_horns(ptr) (num_horns(ptr) > 0)
export function has_horns(ptr) { return num_horns(ptr) > 0; }

// C ref: #define is_wooden(ptr) ((ptr) == &mons[PM_WOOD_GOLEM])
export function is_wooden(ptr) { return ptr === mons[PM_WOOD_GOLEM]; }

// C ref: #define hug_throttles(ptr) ((ptr) == &mons[PM_ROPE_GOLEM])
export function hug_throttles(ptr) { return ptr === mons[PM_ROPE_GOLEM]; }

// C ref: #define flaming(ptr) (PM_FIRE_VORTEX || PM_FLAMING_SPHERE || PM_FIRE_ELEMENTAL || PM_SALAMANDER)
export function flaming(ptr) {
    return ptr === mons[PM_FIRE_VORTEX] || ptr === mons[PM_FLAMING_SPHERE]
        || ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_SALAMANDER];
}

// C ref: #define is_silent(ptr) ((ptr)->msound == MS_SILENT)
export function is_silent(ptr) { return ptr.msound === MS_SILENT; }

// C ref: #define is_vampire(ptr) ((ptr)->mlet == S_VAMPIRE)
export function is_vampire(ptr) { return ptr.mlet === S_VAMPIRE; }

// C ref: #define passes_rocks(ptr) (passes_walls(ptr) && !unsolid(ptr))
export function passes_rocks(ptr) { return passes_walls(ptr) && !unsolid(ptr); }

// Race/gender predicates — C ref: mondata.h (flags2)
// C ref: #define is_male(ptr)    (((ptr)->mflags2 & M2_MALE) != 0L)
export function is_male(ptr) { return !!(ptr.mflags2 & M2_MALE); }

// C ref: #define is_female(ptr)  (((ptr)->mflags2 & M2_FEMALE) != 0L)
export function is_female(ptr) { return !!(ptr.mflags2 & M2_FEMALE); }

// C ref: #define is_neuter(ptr)  (((ptr)->mflags2 & M2_NEUTER) != 0L)
export function is_neuter(ptr) { return !!(ptr.mflags2 & M2_NEUTER); }

// C ref: #define type_is_pname(ptr) (((ptr)->mflags2 & M2_PNAME) != 0L)
export function type_is_pname(ptr) { return !!(ptr.mflags2 & M2_PNAME); }

// C ref: #define is_lord(ptr)    (((ptr)->mflags2 & M2_LORD) != 0L)
export function is_lord(ptr) { return !!(ptr.mflags2 & M2_LORD); }

// C ref: #define is_prince(ptr)  (((ptr)->mflags2 & M2_PRINCE) != 0L)
export function is_prince(ptr) { return !!(ptr.mflags2 & M2_PRINCE); }

// C ref: #define is_ndemon(ptr) (is_demon(ptr) && (((ptr)->mflags2 & (M2_LORD|M2_PRINCE)) == 0L))
export function is_ndemon(ptr) { return is_demon(ptr) && !(ptr.mflags2 & (M2_LORD | M2_PRINCE)); }

// C ref: #define is_dlord(ptr) (is_demon(ptr) && is_lord(ptr))
export function is_dlord(ptr) { return is_demon(ptr) && is_lord(ptr); }

// C ref: #define is_dprince(ptr) (is_demon(ptr) && is_prince(ptr))
export function is_dprince(ptr) { return is_demon(ptr) && is_prince(ptr); }

// C ref: #define polyok(ptr) (((ptr)->mflags2 & M2_NOPOLY) == 0L)
export function polyok(ptr) { return !(ptr.mflags2 & M2_NOPOLY); }

// C ref: #define extra_nasty(ptr) (((ptr)->mflags2 & M2_NASTY) != 0L)
export function extra_nasty(ptr) { return !!(ptr.mflags2 & M2_NASTY); }

// C ref: #define throws_rocks(ptr) (((ptr)->mflags2 & M2_ROCKTHROW) != 0L)
export function throws_rocks(ptr) { return !!(ptr.mflags2 & M2_ROCKTHROW); }

// Combat predicates — C ref: mondata.h
// C ref: #define is_armed(ptr) attacktype(ptr, AT_WEAP)
export function is_armed(ptr) { return attacktype(ptr, AT_WEAP); }

// C ref: #define cantwield(ptr) (nohands(ptr) || verysmall(ptr))
// verysmall(ptr): (ptr)->msize < MZ_SMALL
export function cantwield(ptr) { return nohands(ptr) || (ptr.msize || 0) < MZ_SMALL; }

// C ref: #define could_twoweap(ptr) — multiple AT_WEAP in first 3 attack slots
export function could_twoweap(ptr) {
    const atks = ptr.mattk;
    if (!atks) return false;
    let count = 0;
    for (let i = 0; i < 3; i++) {
        if (atks[i]?.aatyp === AT_WEAP) count++;
    }
    return count > 1;
}

// C ref: #define cantweararm(ptr) (breakarm(ptr) || sliparm(ptr))
export function cantweararm(ptr) { return breakarm(ptr) || sliparm(ptr); }

// Food/digestion predicates — C ref: mondata.h
// C ref: #define digests(ptr) (dmgtype_fromattack((ptr), AD_DGST, AT_ENGL) != 0)
export function digests(ptr) { return dmgtype_fromattack(ptr, AD_DGST, AT_ENGL); }

// C ref: #define enfolds(ptr) (dmgtype_fromattack((ptr), AD_WRAP, AT_ENGL) != 0)
export function enfolds(ptr) { return dmgtype_fromattack(ptr, AD_WRAP, AT_ENGL); }

// C ref: #define slimeproof(ptr) ((ptr)==&mons[PM_GREEN_SLIME] || flaming(ptr) || noncorporeal(ptr))
export function slimeproof(ptr) {
    return ptr === mons[PM_GREEN_SLIME] || flaming(ptr) || noncorporeal(ptr);
}

// C ref: #define eggs_in_water(ptr) (lays_eggs(ptr) && (ptr)->mlet == S_EEL && is_swimmer(ptr))
export function eggs_in_water(ptr) {
    return lays_eggs(ptr) && ptr.mlet === S_EEL && is_swimmer(ptr);
}

// C ref: #define telepathic(ptr) (PM_FLOATING_EYE || PM_MIND_FLAYER || PM_MASTER_MIND_FLAYER)
export function telepathic(ptr) {
    return ptr === mons[PM_FLOATING_EYE]
        || ptr === mons[PM_MIND_FLAYER]
        || ptr === mons[PM_MASTER_MIND_FLAYER];
}

// Monster identity predicates — C ref: mondata.h
// C ref: #define webmaker(ptr) ((ptr)==&mons[PM_CAVE_SPIDER] || (ptr)==&mons[PM_GIANT_SPIDER])
export function webmaker(ptr) {
    return ptr === mons[PM_CAVE_SPIDER] || ptr === mons[PM_GIANT_SPIDER];
}

// C ref: #define is_mplayer(ptr) ((ptr) >= &mons[PM_ARCHEOLOGIST] && (ptr) <= &mons[PM_WIZARD])
export function is_mplayer(ptr) {
    const idx = mons.indexOf(ptr);
    return idx >= PM_ARCHEOLOGIST && idx <= PM_WIZARD;
}

// C ref: #define is_watch(ptr) ((ptr)==&mons[PM_WATCHMAN] || (ptr)==&mons[PM_WATCH_CAPTAIN])
export function is_watch(ptr) {
    return ptr === mons[PM_WATCHMAN] || ptr === mons[PM_WATCH_CAPTAIN];
}

// C ref: #define is_placeholder(ptr) ((ptr)==&mons[PM_ORC] || PM_GIANT || PM_ELF || PM_HUMAN)
export function is_placeholder(ptr) {
    return ptr === mons[PM_ORC] || ptr === mons[PM_GIANT]
        || ptr === mons[PM_ELF] || ptr === mons[PM_HUMAN];
}

// C ref: #define is_reviver(ptr) (is_rider(ptr) || (ptr)->mlet == S_TROLL)
export function is_reviver(ptr) { return is_rider(ptr) || ptr.mlet === S_TROLL; }

// C ref: #define unique_corpstat(ptr) (((ptr)->geno & G_UNIQ) != 0)
export function unique_corpstat(ptr) { return !!(ptr.geno & G_UNIQ); }

// C ref: #define emits_light(ptr) — returns light range (0 or 1)
export function emits_light(ptr) {
    if (ptr.mlet === S_LIGHT
        || ptr === mons[PM_FLAMING_SPHERE]
        || ptr === mons[PM_SHOCKING_SPHERE]
        || ptr === mons[PM_BABY_GOLD_DRAGON]
        || ptr === mons[PM_FIRE_VORTEX]) return 1;
    if (ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_GOLD_DRAGON]) return 1;
    return 0;
}

// C ref: #define likes_lava(ptr) (PM_FIRE_ELEMENTAL || PM_SALAMANDER)
export function likes_lava(ptr) {
    return ptr === mons[PM_FIRE_ELEMENTAL] || ptr === mons[PM_SALAMANDER];
}

// C ref: #define pm_invisible(ptr) (PM_STALKER || PM_BLACK_LIGHT)
export function pm_invisible(ptr) {
    return ptr === mons[PM_STALKER] || ptr === mons[PM_BLACK_LIGHT];
}

// C ref: #define likes_fire(ptr) (PM_FIRE_VORTEX || PM_FLAMING_SPHERE || likes_lava(ptr))
export function likes_fire(ptr) {
    return ptr === mons[PM_FIRE_VORTEX] || ptr === mons[PM_FLAMING_SPHERE] || likes_lava(ptr);
}

// C ref: monst.h #define engulfing_u(mon) (u.uswallow && (u.ustuck == (mon)))
// Accesses player from gstate like C accesses global u
export function engulfing_u(mon) {
    const player = _gstate?.player;
    return !!(player && player.uswallow && player.ustuck === mon);
}

// C ref: #define touch_petrifies(ptr) (PM_COCKATRICE || PM_CHICKATRICE)
export function touch_petrifies(ptr) {
    return ptr === mons[PM_COCKATRICE] || ptr === mons[PM_CHICKATRICE];
}

// C ref: #define flesh_petrifies(pm) (touch_petrifies(pm) || (pm)==&mons[PM_MEDUSA])
export function flesh_petrifies(ptr) { return touch_petrifies(ptr) || ptr === mons[PM_MEDUSA]; }

// Golem destruction predicates — C ref: mondata.h
// C ref: #define completelyburns(ptr) (PM_PAPER_GOLEM || PM_STRAW_GOLEM)
export function completelyburns(ptr) {
    return ptr === mons[PM_PAPER_GOLEM] || ptr === mons[PM_STRAW_GOLEM];
}

// C ref: #define completelyrots(ptr) (PM_WOOD_GOLEM || PM_LEATHER_GOLEM)
export function completelyrots(ptr) {
    return ptr === mons[PM_WOOD_GOLEM] || ptr === mons[PM_LEATHER_GOLEM];
}

// C ref: #define completelyrusts(ptr) ((ptr)==&mons[PM_IRON_GOLEM])
export function completelyrusts(ptr) { return ptr === mons[PM_IRON_GOLEM]; }

// Bat predicates — C ref: mondata.h
// C ref: #define is_bat(ptr) (PM_BAT || PM_GIANT_BAT || PM_VAMPIRE_BAT)
export function is_bat(ptr) {
    return ptr === mons[PM_BAT] || ptr === mons[PM_GIANT_BAT] || ptr === mons[PM_VAMPIRE_BAT];
}

// C ref: #define is_bird(ptr) ((ptr)->mlet == S_BAT && !is_bat(ptr))
export function is_bird(ptr) { return ptr.mlet === S_BAT && !is_bat(ptr); }

// cf. monst.h canseemon(mon) — player can see this monster
export function canseemon(mon, player, fov) {
    if (!mon || !player) return false;
    if (!(fov?.canSee ? fov.canSee(mon.mx, mon.my) : false)) return false;
    if (player.blind) return false;
    if (mon.mundetected) return false;
    if (mon.minvis && !player.seeInvisible) return false;
    return true;
}

// Diet predicates — C ref: mondata.h
// C ref: #define vegan(ptr) (blobs/jellies/fungi/vortexes/lights/most elementals/most golems/noncorporeal)
export function vegan(ptr) {
    const sym = ptr.mlet;
    if (sym === S_BLOB || sym === S_JELLY || sym === S_FUNGUS
        || sym === S_VORTEX || sym === S_LIGHT) return true;
    if (sym === S_ELEMENTAL && ptr !== mons[PM_STALKER]) return true;
    if (sym === S_GOLEM && ptr !== mons[PM_FLESH_GOLEM] && ptr !== mons[PM_LEATHER_GOLEM])
        return true;
    return noncorporeal(ptr);
}

// C ref: #define vegetarian(ptr) (vegan(ptr) || (S_PUDDING && not PM_BLACK_PUDDING))
export function vegetarian(ptr) {
    return vegan(ptr)
        || (ptr.mlet === S_PUDDING && ptr !== mons[PM_BLACK_PUDDING]);
}

// C ref: #define corpse_eater(ptr) (PM_PURPLE_WORM || PM_BABY_PURPLE_WORM || PM_GHOUL || PM_PIRANHA)
export function corpse_eater(ptr) {
    return ptr === mons[PM_PURPLE_WORM] || ptr === mons[PM_BABY_PURPLE_WORM]
        || ptr === mons[PM_GHOUL] || ptr === mons[PM_PIRANHA];
}

// ========================================================================
// befriend_with_obj — C ref: include/mondata.h:255
// ========================================================================

// C ref: mondata.h:255 — #define befriend_with_obj(ptr, obj)
// obj is an inventory item (obj.otyp, obj.oclass); ptr is the permonst type.
// Returns true if offering obj will befriend monster type ptr.
export function befriend_with_obj(ptr, obj) {
    if (ptr === mons[PM_MONKEY] || ptr === mons[PM_APE])
        return obj.otyp === BANANA;
    return is_domestic(ptr) && obj.oclass === FOOD_CLASS
        && (ptr.mlet !== S_UNICORN
            || (objectData[obj.otyp]?.oc_material === VEGGY)
            || (obj.otyp === CORPSE && obj.corpsenm === PM_LICHEN));
}

// Autotranslated from mondata.c:500
export function mstrength_ranged_attk(ptr) {
  let i, j, atk_mask = (1 << AT_BREA) | (1 << AT_SPIT) | (1 << AT_GAZE);
  for (i = 0; i < NATTK; i++) {
    if ((j = ptr.mattk[i].aatyp) >= AT_WEAP || (j < 32 && (atk_mask & (1 << j)) !== 0)) return true;
  }
  return false;
}

// Autotranslated from mondata.c:1179
export function gender(mtmp) {
  if (is_neuter(mtmp.data)) return 2;
  return mtmp.female;
}

// Autotranslated from mondata.c:1379
export function locomotion(ptr, def) {
  let locoindx = ( def !== highc( def)) ? 0 : 1;
  return (is_floater(ptr) ? levitate[locoindx] : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[locoindx] : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[locoindx] : slithy(ptr) ? slither[locoindx] : amorphous(ptr) ? ooze[locoindx] : !ptr.mmove ? immobile[locoindx] : nolimbs(ptr) ? crawl[locoindx] : def);
}

// Autotranslated from mondata.c:1394
export function stagger(ptr, def) {
  let locoindx = ( def !== highc( def)) ? 2 : 3;
  return (is_floater(ptr) ? levitate[locoindx] : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[locoindx] : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[locoindx] : slithy(ptr) ? slither[locoindx] : amorphous(ptr) ? ooze[locoindx] : !ptr.mmove ? immobile[locoindx] : nolimbs(ptr) ? crawl[locoindx] : def);
}

// Autotranslated from mondata.c:1506
export function olfaction(mdat) {
  if (is_golem(mdat) || mdat.mlet === S_EYE   || mdat.mlet === S_JELLY || mdat.mlet === S_PUDDING || mdat.mlet === S_BLOB || mdat.mlet === S_VORTEX || mdat.mlet === S_ELEMENTAL || mdat.mlet === S_FUNGUS   || mdat.mlet === S_LIGHT) return false;
  return true;
}

// C ref: monst.h DEADMONSTER(mon) — true if monster has non-positive HP
export function DEADMONSTER(mon) { return mon && mon.mhp <= 0; }

// C ref: mondata.h mdistu(mtmp) — squared distance from player to monster
export function mdistu(mon, player) {
    const dx = player.x - mon.mx, dy = player.y - mon.my;
    return dx * dx + dy * dy;
}

// C ref: monst.h ROLL_FROM(arr) — pick a random element
function ROLL_FROM(arr) { return arr[rn2(arr.length)]; }

// C ref: monst.h m_setseenres(mon, seenres) — set bits on mon->mseenres
function m_setseenres(mon, seenres) { mon.mseenres = (mon.mseenres || 0) | seenres; }

// C ref: monst.h m_clearseenres(mon, seenres) — clear bits on mon->mseenres
function m_clearseenres(mon, seenres) { mon.mseenres = (mon.mseenres || 0) & ~seenres; }

// C ref: prop.h res_to_mr macro — convert property index to monster resistance bit
function res_to_mr(r) {
    return (r >= FIRE_RES && r <= STONE_RES) ? (1 << (r - 1)) : 0;
}

// Autotranslated from mondata.c:1521
export function cvt_adtyp_to_mseenres(adtyp) {
  switch (adtyp) {
    case AD_MAGM:
      return M_SEEN_MAGR;
    case AD_FIRE:
      return M_SEEN_FIRE;
    case AD_COLD:
      return M_SEEN_COLD;
    case AD_SLEE:
      return M_SEEN_SLEEP;
    case AD_DISN:
      return M_SEEN_DISINT;
    case AD_ELEC:
      return M_SEEN_ELEC;
    case AD_DRST:
      return M_SEEN_POISON;
    case AD_ACID:
      return M_SEEN_ACID;
    default:
      return M_SEEN_NOTHING;
  }
}

// Autotranslated from mondata.c:1539
export function cvt_prop_to_mseenres(prop) {
  switch (prop) {
    case ANTIMAGIC:
      return M_SEEN_MAGR;
    case FIRE_RES:
      return M_SEEN_FIRE;
    case COLD_RES:
      return M_SEEN_COLD;
    case SLEEP_RES:
      return M_SEEN_SLEEP;
    case DISINT_RES:
      return M_SEEN_DISINT;
    case POISON_RES:
      return M_SEEN_POISON;
    case SHOCK_RES:
      return M_SEEN_ELEC;
    case ACID_RES:
      return M_SEEN_ACID;
    case REFLECTING:
      return M_SEEN_REFL;
    default:
      return M_SEEN_NOTHING;
  }
}

// Autotranslated from mondata.c:1557
export function monstseesu(seenres, map, player) {
  let mtmp;
  if (seenres === M_SEEN_NOTHING || player.uswallow) return;
  for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp.nmon) {
    if (!DEADMONSTER(mtmp) && m_canseeu(mtmp)) {
      m_setseenres(mtmp, seenres);
    }
  }
}

// Autotranslated from mondata.c:1571
export function monstunseesu(seenres, map, player) {
  let mtmp;
  if (seenres === M_SEEN_NOTHING || player.uswallow) return;
  for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp.nmon) {
    if (!DEADMONSTER(mtmp) && m_canseeu(mtmp)) {
      m_clearseenres(mtmp, seenres);
    }
  }
}

// Autotranslated from mondata.c:1640
export function mons_see_trap(ttmp, map) {
  if (!ttmp || !map || !Array.isArray(map.monsters)) return;
  const tx = ttmp.tx;
  const ty = ttmp.ty;
  const lit = !!map.at?.(tx, ty)?.lit;
  const maxdist = lit ? 49 : 2;
  for (const mtmp of map.monsters) {
    if (!mtmp || mtmp.dead) continue;
    const mdat = mtmp.data || mtmp.type || {};
    if (is_animal(mdat) || is_mindless(mdat) || !haseyes(mdat) || mtmp.mcansee === 0 || mtmp.mcansee === false) {
      continue;
    }
    const dx = mtmp.mx - tx;
    const dy = mtmp.my - ty;
    if ((dx * dx + dy * dy) > maxdist) {
      continue;
    }
    if (!m_cansee(mtmp, map, tx, ty)) {
      continue;
    }
    mon_learns_traps(mtmp, ttmp.ttyp);
  }
}

// Autotranslated from mondata.c:1659
export function get_atkdam_type(adtyp) {
  if (adtyp === AD_RBRE) {
    let rnd_breath_typ = [ AD_MAGM, AD_FIRE, AD_COLD, AD_SLEE, AD_DISN, AD_ELEC, AD_DRST, AD_ACID ];
    return ROLL_FROM(rnd_breath_typ);
  }
  return adtyp;
}

// Autotranslated from mondata.c:1585
export function give_u_to_m_resistances(mtmp, player) {
  let intr;
  for (intr = FIRE_RES; intr <= STONE_RES; intr++) {
    if ((player.uprops[intr].intrinsic & INTRINSIC) !== 0) { mtmp.mintrinsics |=  res_to_mr(intr); }
  }
}
