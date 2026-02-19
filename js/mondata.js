// mondata.js -- Monster predicate functions
// C ref: include/mondata.h — macro predicates on permonst struct
// These operate on a permonst pointer (ptr), which in JS is the mons[] entry.
// Monster instances have a .mnum field indexing into mons[].

import {
    mons,
    M1_FLY, M1_SWIM, M1_AMORPHOUS, M1_WALLWALK, M1_CLING,
    M1_TUNNEL, M1_NEEDPICK, M1_CONCEAL, M1_HIDE, M1_AMPHIBIOUS,
    M1_BREATHLESS, M1_NOTAKE, M1_NOEYES, M1_NOHANDS, M1_NOLIMBS,
    M1_NOHEAD, M1_MINDLESS, M1_HUMANOID, M1_ANIMAL, M1_SLITHY,
    M1_UNSOLID, M1_THICK_HIDE, M1_OVIPAROUS, M1_REGEN,
    M1_SEE_INVIS, M1_TPORT, M1_TPORT_CNTRL,
    M1_ACID, M1_POIS, M1_CARNIVORE, M1_HERBIVORE, M1_OMNIVORE,
    M1_METALLIVORE,
    M2_NOPOLY, M2_UNDEAD, M2_WERE, M2_HUMAN, M2_ELF, M2_DWARF,
    M2_GNOME, M2_ORC, M2_DEMON, M2_MERC, M2_LORD, M2_PRINCE,
    M2_MINION, M2_GIANT, M2_SHAPESHIFTER,
    M2_MALE, M2_FEMALE, M2_NEUTER, M2_PNAME,
    M2_HOSTILE, M2_PEACEFUL, M2_DOMESTIC, M2_WANDER, M2_STALK,
    M2_NASTY, M2_STRONG, M2_ROCKTHROW,
    M2_GREEDY, M2_JEWELS, M2_COLLECT, M2_MAGIC,
    M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSBOOK, M3_WANTSCAND,
    M3_WANTSARTI, M3_WANTSALL, M3_WAITFORU, M3_CLOSE,
    M3_COVETOUS, M3_WAITMASK,
    M3_INFRAVISION, M3_INFRAVISIBLE, M3_DISPLACES,
    S_DOG, S_FELINE, S_GOLEM,
    S_GHOST, S_IMP, S_RODENT, S_VAMPIRE,
    S_VORTEX, S_ELEMENTAL,
    S_KOBOLD, S_OGRE, S_NYMPH, S_CENTAUR, S_DRAGON, S_NAGA,
    S_ZOMBIE, S_MUMMY, S_LICH, S_WRAITH, S_UNICORN,
    S_EYE, S_LIGHT, S_TROLL, S_MIMIC, S_FUNGUS, S_JELLY, S_BLOB, S_PUDDING, S_BAT,
    MZ_TINY, MZ_SMALL, MZ_MEDIUM, MZ_LARGE,
    AT_ANY, AT_NONE, AT_BOOM, AT_SPIT, AT_GAZE, AT_MAGC,
    AT_ENGL, AT_HUGS, AT_BREA, AT_WEAP,
    AD_ANY, AD_STCK, AD_WRAP, AD_DGST,
    G_UNIQ,
    PM_SHADE, PM_TENGU,
    PM_ROCK_MOLE, PM_WOODCHUCK,
    PM_PONY, PM_HORSE, PM_WARHORSE,
    PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_KI_RIN,
    PM_HORNED_DEVIL, PM_MINOTAUR, PM_ASMODEUS, PM_BALROG,
    PM_MARILITH, PM_WINGED_GARGOYLE, PM_AIR_ELEMENTAL,
    PM_GREMLIN, PM_STONE_GOLEM,
    PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_SHOCKING_SPHERE, PM_SALAMANDER,
    PM_FIRE_ELEMENTAL,
    PM_CYCLOPS, PM_FLOATING_EYE,
    PM_ROPE_GOLEM, PM_WOOD_GOLEM, PM_FLESH_GOLEM, PM_LEATHER_GOLEM, PM_PAPER_GOLEM,
    PM_STRAW_GOLEM, PM_IRON_GOLEM,
    PM_STALKER,
    PM_GREEN_SLIME, PM_BLACK_PUDDING,
    PM_BLACK_LIGHT,
    PM_MEDUSA,
    PM_GHOUL, PM_PIRANHA,
    PM_GIANT, PM_HUMAN,
    PM_VAMPIRE_BAT,
    PM_HEZROU, PM_VROCK,
    MS_SILENT, MS_BUZZ, MS_BURBLE,
    S_EEL,
    // For grownups table (little_to_big / big_to_little / same_race)
    PM_CHICKATRICE, PM_COCKATRICE,
    PM_LITTLE_DOG, PM_DOG, PM_LARGE_DOG,
    PM_HELL_HOUND_PUP, PM_HELL_HOUND,
    PM_WINTER_WOLF_CUB, PM_WINTER_WOLF,
    PM_KITTEN, PM_HOUSECAT, PM_LARGE_CAT,
    PM_KOBOLD, PM_LARGE_KOBOLD, PM_KOBOLD_LEADER,
    PM_GNOME, PM_GNOME_LEADER, PM_GNOME_RULER,
    PM_DWARF, PM_DWARF_LEADER, PM_DWARF_RULER,
    PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER,
    PM_ORC, PM_HILL_ORC, PM_MORDOR_ORC, PM_URUK_HAI, PM_ORC_CAPTAIN,
    PM_SEWER_RAT, PM_GIANT_RAT,
    PM_CAVE_SPIDER, PM_GIANT_SPIDER,
    PM_OGRE, PM_OGRE_LEADER, PM_OGRE_TYRANT,
    PM_ELF, PM_WOODLAND_ELF, PM_GREEN_ELF, PM_GREY_ELF,
    PM_ELF_NOBLE, PM_ELVEN_MONARCH,
    PM_LICH, PM_DEMILICH, PM_MASTER_LICH, PM_ARCH_LICH,
    PM_VAMPIRE, PM_VAMPIRE_LEADER,
    PM_BAT, PM_GIANT_BAT,
    PM_BABY_GRAY_DRAGON, PM_GRAY_DRAGON,
    PM_BABY_GOLD_DRAGON, PM_GOLD_DRAGON,
    PM_BABY_SILVER_DRAGON, PM_SILVER_DRAGON,
    PM_BABY_RED_DRAGON, PM_RED_DRAGON,
    PM_BABY_WHITE_DRAGON, PM_WHITE_DRAGON,
    PM_BABY_ORANGE_DRAGON, PM_ORANGE_DRAGON,
    PM_BABY_BLACK_DRAGON, PM_BLACK_DRAGON,
    PM_BABY_BLUE_DRAGON, PM_BLUE_DRAGON,
    PM_BABY_GREEN_DRAGON, PM_GREEN_DRAGON,
    PM_BABY_YELLOW_DRAGON, PM_YELLOW_DRAGON,
    PM_RED_NAGA_HATCHLING, PM_RED_NAGA,
    PM_BLACK_NAGA_HATCHLING, PM_BLACK_NAGA,
    PM_GOLDEN_NAGA_HATCHLING, PM_GOLDEN_NAGA,
    PM_GUARDIAN_NAGA_HATCHLING, PM_GUARDIAN_NAGA,
    PM_SMALL_MIMIC, PM_LARGE_MIMIC, PM_GIANT_MIMIC,
    PM_BABY_LONG_WORM, PM_LONG_WORM, PM_LONG_WORM_TAIL,
    PM_BABY_PURPLE_WORM, PM_PURPLE_WORM,
    PM_BABY_CROCODILE, PM_CROCODILE,
    PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN,
    PM_WATCHMAN, PM_WATCH_CAPTAIN,
    PM_ALIGNED_CLERIC, PM_HIGH_CLERIC,
    PM_STUDENT, PM_ARCHEOLOGIST,
    PM_ATTENDANT, PM_HEALER,
    PM_PAGE, PM_KNIGHT,
    PM_ACOLYTE, PM_CLERIC,
    PM_APPRENTICE, PM_WIZARD,
    PM_MANES, PM_LEMURE,
    PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN,
    PM_GARGOYLE,
    PM_KILLER_BEE, PM_QUEEN_BEE,
    PM_DEATH, PM_FAMINE, PM_PESTILENCE,
    PM_KOBOLD_ZOMBIE, PM_KOBOLD_MUMMY,
    PM_MONKEY, PM_APE, PM_LICHEN,
} from './monsters.js';

import { AMULET_OF_YENDOR, FOOD_CLASS, VEGGY, CORPSE, BANANA,
         objectData } from './objects.js';

// ========================================================================
// Diet predicates — C ref: mondata.h
// ========================================================================

// C ref: #define carnivorous(ptr)   ((ptr)->mflags1 & M1_CARNIVORE)
export function carnivorous(ptr) { return !!(ptr.flags1 & M1_CARNIVORE); }

// C ref: #define herbivorous(ptr)   ((ptr)->mflags1 & M1_HERBIVORE)
export function herbivorous(ptr) { return !!(ptr.flags1 & M1_HERBIVORE); }

// C ref: #define is_omnivore(ptr) (((ptr)->mflags1 & M1_OMNIVORE) == M1_OMNIVORE)
// Note: M1_OMNIVORE = M1_CARNIVORE | M1_HERBIVORE
export function is_omnivore(ptr) { return (ptr.flags1 & M1_OMNIVORE) === M1_OMNIVORE; }

// C ref: #define is_metallivore(ptr) ((ptr)->mflags1 & M1_METALLIVORE)
export function is_metallivore(ptr) { return !!(ptr.flags1 & M1_METALLIVORE); }

// ========================================================================
// Body type predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_animal(ptr)     ((ptr)->mflags1 & M1_ANIMAL)
export function is_animal(ptr) { return !!(ptr.flags1 & M1_ANIMAL); }

// C ref: #define is_mindless(ptr)   ((ptr)->mflags1 & M1_MINDLESS)
export function is_mindless(ptr) { return !!(ptr.flags1 & M1_MINDLESS); }

// C ref: #define is_humanoid(ptr)   ((ptr)->mflags1 & M1_HUMANOID)
export function is_humanoid(ptr) { return !!(ptr.flags1 & M1_HUMANOID); }

// C ref: #define slithy(ptr)        ((ptr)->mflags1 & M1_SLITHY)
export function slithy(ptr) { return !!(ptr.flags1 & M1_SLITHY); }

// C ref: #define unsolid(ptr)       ((ptr)->mflags1 & M1_UNSOLID)
export function unsolid(ptr) { return !!(ptr.flags1 & M1_UNSOLID); }

// C ref: #define nohands(ptr)       ((ptr)->mflags1 & M1_NOHANDS)
export function nohands(ptr) { return !!(ptr.flags1 & M1_NOHANDS); }

// C ref: #define nolimbs(ptr)       (((ptr)->mflags1 & M1_NOLIMBS) == M1_NOLIMBS)
export function nolimbs(ptr) { return (ptr.flags1 & M1_NOLIMBS) === M1_NOLIMBS; }

// C ref: #define nohead(ptr)        ((ptr)->mflags1 & M1_NOHEAD)
export function nohead(ptr) { return !!(ptr.flags1 & M1_NOHEAD); }

// C ref: #define noeyes(ptr)        ((ptr)->mflags1 & M1_NOEYES)
export function noeyes(ptr) { return !!(ptr.flags1 & M1_NOEYES); }

// C ref: #define notake(ptr)        ((ptr)->mflags1 & M1_NOTAKE)
export function notake(ptr) { return !!(ptr.flags1 & M1_NOTAKE); }

// ========================================================================
// Movement predicates — C ref: mondata.h
// ========================================================================

// C ref: #define can_fly(ptr)       ((ptr)->mflags1 & M1_FLY)
export function can_fly(ptr) { return !!(ptr.flags1 & M1_FLY); }

// C ref: #define can_swim(ptr)      ((ptr)->mflags1 & M1_SWIM)
export function can_swim(ptr) { return !!(ptr.flags1 & M1_SWIM); }

// C ref: #define amorphous(ptr)     ((ptr)->mflags1 & M1_AMORPHOUS)
export function amorphous(ptr) { return !!(ptr.flags1 & M1_AMORPHOUS); }

// C ref: #define passes_walls(ptr)  ((ptr)->mflags1 & M1_WALLWALK)
export function passes_walls(ptr) { return !!(ptr.flags1 & M1_WALLWALK); }

// C ref: #define can_tunnel(ptr)    ((ptr)->mflags1 & M1_TUNNEL)
export function can_tunnel(ptr) { return !!(ptr.flags1 & M1_TUNNEL); }

// C ref: #define needs_pick(ptr)    ((ptr)->mflags1 & M1_NEEDPICK)
export function needs_pick(ptr) { return !!(ptr.flags1 & M1_NEEDPICK); }

// C ref: #define hides_under(ptr)   ((ptr)->mflags1 & M1_CONCEAL)
export function hides_under(ptr) { return !!(ptr.flags1 & M1_CONCEAL); }

// C ref: #define is_hider(ptr)      ((ptr)->mflags1 & M1_HIDE)
export function is_hider(ptr) { return !!(ptr.flags1 & M1_HIDE); }

// C ref: #define is_clinger(ptr)    ((ptr)->mflags1 & M1_CLING)
export function is_clinger(ptr) { return !!(ptr.flags1 & M1_CLING); }

// C ref: #define amphibious(ptr)    ((ptr)->mflags1 & M1_AMPHIBIOUS)
export function amphibious(ptr) { return !!(ptr.flags1 & M1_AMPHIBIOUS); }

// C ref: #define breathless(ptr)    ((ptr)->mflags1 & M1_BREATHLESS)
export function breathless(ptr) { return !!(ptr.flags1 & M1_BREATHLESS); }

// ========================================================================
// Defense/combat predicates — C ref: mondata.h
// ========================================================================

// C ref: #define acidic(ptr)        ((ptr)->mflags1 & M1_ACID)
export function acidic(ptr) { return !!(ptr.flags1 & M1_ACID); }

// C ref: #define poisonous(ptr)     ((ptr)->mflags1 & M1_POIS)
export function poisonous(ptr) { return !!(ptr.flags1 & M1_POIS); }

// C ref: #define thick_skinned(ptr) ((ptr)->mflags1 & M1_THICK_HIDE)
export function thick_skinned(ptr) { return !!(ptr.flags1 & M1_THICK_HIDE); }

// C ref: #define regenerates(ptr)   ((ptr)->mflags1 & M1_REGEN)
export function regenerates(ptr) { return !!(ptr.flags1 & M1_REGEN); }

// C ref: #define lays_eggs(ptr)     ((ptr)->mflags1 & M1_OVIPAROUS)
export function lays_eggs(ptr) { return !!(ptr.flags1 & M1_OVIPAROUS); }

// C ref: #define perceives(ptr)     ((ptr)->mflags1 & M1_SEE_INVIS)
export function perceives(ptr) { return !!(ptr.flags1 & M1_SEE_INVIS); }

// C ref: #define can_teleport(ptr)  ((ptr)->mflags1 & M1_TPORT)
export function can_teleport(ptr) { return !!(ptr.flags1 & M1_TPORT); }

// C ref: #define control_teleport(ptr) ((ptr)->mflags1 & M1_TPORT_CNTRL)
export function control_teleport(ptr) { return !!(ptr.flags1 & M1_TPORT_CNTRL); }

// ========================================================================
// Race/type predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define is_undead(ptr)     ((ptr)->mflags2 & M2_UNDEAD)
export function is_undead(ptr) { return !!(ptr.flags2 & M2_UNDEAD); }

// C ref: #define is_were(ptr)       ((ptr)->mflags2 & M2_WERE)
export function is_were(ptr) { return !!(ptr.flags2 & M2_WERE); }

// C ref: #define is_human(ptr)      ((ptr)->mflags2 & M2_HUMAN)
export function is_human(ptr) { return !!(ptr.flags2 & M2_HUMAN); }

// C ref: #define is_elf(ptr)        ((ptr)->mflags2 & M2_ELF)
export function is_elf(ptr) { return !!(ptr.flags2 & M2_ELF); }

// C ref: #define is_dwarf(ptr)      ((ptr)->mflags2 & M2_DWARF)
export function is_dwarf(ptr) { return !!(ptr.flags2 & M2_DWARF); }

// C ref: #define is_gnome(ptr)      ((ptr)->mflags2 & M2_GNOME)
export function is_gnome(ptr) { return !!(ptr.flags2 & M2_GNOME); }

// C ref: #define is_orc(ptr)        ((ptr)->mflags2 & M2_ORC)
export function is_orc(ptr) { return !!(ptr.flags2 & M2_ORC); }

// C ref: #define is_demon(ptr)      ((ptr)->mflags2 & M2_DEMON)
export function is_demon(ptr) { return !!(ptr.flags2 & M2_DEMON); }

// C ref: #define is_mercenary(ptr)  ((ptr)->mflags2 & M2_MERC)
export function is_mercenary(ptr) { return !!(ptr.flags2 & M2_MERC); }

// C ref: #define is_minion(ptr)     ((ptr)->mflags2 & M2_MINION)
export function is_minion(ptr) { return !!(ptr.flags2 & M2_MINION); }

// C ref: #define is_giant(ptr)      ((ptr)->mflags2 & M2_GIANT)
export function is_giant(ptr) { return !!(ptr.flags2 & M2_GIANT); }

// C ref: #define is_shapeshifter(ptr) ((ptr)->mflags2 & M2_SHAPESHIFTER)
export function is_shapeshifter(ptr) { return !!(ptr.flags2 & M2_SHAPESHIFTER); }

// C ref: #define is_golem(ptr)      ((ptr)->mlet == S_GOLEM)
export function is_golem(ptr) { return ptr.symbol === S_GOLEM; }

// C ref: #define weirdnonliving(ptr) (is_golem(ptr) || (ptr)->mlet == S_VORTEX)
export function weirdnonliving(ptr) { return is_golem(ptr) || ptr.symbol === S_VORTEX; }

// C ref: #define nonliving(ptr) (is_undead(ptr) || (ptr) == &mons[PM_MANES] || weirdnonliving(ptr))
export function nonliving(ptr) {
    return is_undead(ptr) || ptr === mons[PM_MANES] || weirdnonliving(ptr);
}

// ========================================================================
// Behavior predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define is_domestic(ptr)   ((ptr)->mflags2 & M2_DOMESTIC)
export function is_domestic(ptr) { return !!(ptr.flags2 & M2_DOMESTIC); }

// C ref: #define is_wanderer(ptr)   ((ptr)->mflags2 & M2_WANDER)
export function is_wanderer(ptr) { return !!(ptr.flags2 & M2_WANDER); }

// C ref: #define always_hostile(ptr) ((ptr)->mflags2 & M2_HOSTILE)
export function always_hostile(ptr) { return !!(ptr.flags2 & M2_HOSTILE); }

// C ref: #define always_peaceful(ptr) ((ptr)->mflags2 & M2_PEACEFUL)
export function always_peaceful(ptr) { return !!(ptr.flags2 & M2_PEACEFUL); }

// C ref: #define strongmonst(ptr)   ((ptr)->mflags2 & M2_STRONG)
export function strongmonst(ptr) { return !!(ptr.flags2 & M2_STRONG); }

// C ref: #define can_rockthrow(ptr) ((ptr)->mflags2 & M2_ROCKTHROW)
export function can_rockthrow(ptr) { return !!(ptr.flags2 & M2_ROCKTHROW); }

// ========================================================================
// Item affinity predicates — C ref: mondata.h (flags2)
// ========================================================================

// C ref: #define likes_gold(ptr)    ((ptr)->mflags2 & M2_GREEDY)
export function likes_gold(ptr) { return !!(ptr.flags2 & M2_GREEDY); }

// C ref: #define likes_gems(ptr)    ((ptr)->mflags2 & M2_JEWELS)
export function likes_gems(ptr) { return !!(ptr.flags2 & M2_JEWELS); }

// C ref: #define likes_objs(ptr)    ((ptr)->mflags2 & M2_COLLECT || is_armed(ptr))
export function likes_objs(ptr) { return !!(ptr.flags2 & M2_COLLECT) || is_armed(ptr); }

// C ref: #define likes_magic(ptr)   ((ptr)->mflags2 & M2_MAGIC)
export function likes_magic(ptr) { return !!(ptr.flags2 & M2_MAGIC); }

// ========================================================================
// Flags3 predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_covetous(ptr)   ((ptr)->mflags3 & M3_COVETOUS)
export function is_covetous(ptr) { return !!(ptr.flags3 & M3_COVETOUS); }

// C ref: #define infravision(ptr)   ((ptr)->mflags3 & M3_INFRAVISION)
export function infravision(ptr) { return !!(ptr.flags3 & M3_INFRAVISION); }

// C ref: #define infravisible(ptr)  ((ptr)->mflags3 & M3_INFRAVISIBLE)
export function infravisible(ptr) { return !!(ptr.flags3 & M3_INFRAVISIBLE); }

// C ref: #define is_displacer(ptr)  ((ptr)->mflags3 & M3_DISPLACES)
export function is_displacer(ptr) { return !!(ptr.flags3 & M3_DISPLACES); }

// ========================================================================
// Composite predicates — C ref: mondata.h
// ========================================================================

// C ref: #define is_pet(mon)   ((mon)->mtame > 0)
// Note: in our JS, tame is a boolean; in C it's a value (tameness level)
export function is_pet(mon) { return !!mon.tame; }

// C ref: #define attacktype(ptr, atyp) — check if monster has this attack type
export function attacktype(ptr, atyp) {
    if (!ptr.attacks) return false;
    for (const atk of ptr.attacks) {
        if (atk.type === atyp) return true;
    }
    return false;
}

// C ref: #define can_breathe(ptr)   attacktype(ptr, AT_BREA)
export function can_breathe(ptr) { return attacktype(ptr, AT_BREA); }

// C ref: mondata.h — pet_type(ptr) checks if S_DOG or S_FELINE
export function is_pet_type(ptr) {
    return ptr.symbol === S_DOG || ptr.symbol === S_FELINE;
}

// ========================================================================
// Utility: get permonst pointer from monster instance
// ========================================================================

// Get the permonst entry for a monster instance
// C ref: mtmp->data = &mons[mtmp->mnum]
export function monsdat(mon) {
    if (mon.mnum !== undefined) return mons[mon.mnum];
    // Fallback for old-style monster instances without mnum
    return null;
}

// ========================================================================
// Monster naming — C ref: do_name.c x_monnam()
// ========================================================================

// C ref: include/worn.h — W_SADDLE = 0x100000
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
// mon.type.name — if they differ, the monster was named by the player.
export function hasGivenName(mon) {
    if (!mon?.name) return false;
    const speciesName = mon.type?.name;
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

// ========================================================================
// Trap awareness — C ref: mondata.c
// ========================================================================

// C ref: mondata.c mon_knows_traps(mtmp, ttyp)
export function mon_knows_traps(mon, ttyp) {
    const seen = Number(mon?.mtrapseen || 0) >>> 0;
    if (ttyp === -1) return seen !== 0; // ALL_TRAPS
    if (ttyp === 0) return seen === 0;  // NO_TRAP
    const bit = ttyp - 1;
    if (bit < 0 || bit >= 31) return false;
    return (seen & (1 << bit)) !== 0;
}

// C ref: mondata.c mon_learns_traps(mtmp, ttyp)
export function mon_learns_traps(mon, ttyp) {
    if (!mon) return;
    const seen = Number(mon.mtrapseen || 0) >>> 0;
    if (ttyp === -1) {
        mon.mtrapseen = 0x7fffffff;
        return;
    }
    if (ttyp === 0) {
        mon.mtrapseen = 0;
        return;
    }
    const bit = ttyp - 1;
    if (bit < 0 || bit >= 31) return;
    mon.mtrapseen = (seen | (1 << bit)) >>> 0;
}

// ========================================================================
// passes_bars — C ref: mondata.c
// ========================================================================

// C ref: mondata.c passes_bars() — can this monster pass through iron bars?
// passes_walls || amorphous || is_whirly || verysmall || (slithy && !bigmonst)
export function passes_bars(mdat) {
    const f1 = mdat?.flags1 || 0;
    if (f1 & M1_WALLWALK) return true;  // passes_walls
    if (f1 & M1_AMORPHOUS) return true; // amorphous
    const mlet = mdat?.symbol ?? -1;
    if (mlet === S_VORTEX || mlet === S_ELEMENTAL) return true; // is_whirly
    const size = mdat?.size || 0;
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
    if (!ptr.attacks) return false;
    for (const atk of ptr.attacks) {
        if (atk.damage === dtyp && (atyp === AT_ANY || atk.type === atyp))
            return true;
    }
    return false;
}

// C ref: mondata.c dmgtype(ptr, dtyp)
// Returns true if monster deals this damage type from any attack.
export function dmgtype(ptr, dtyp) {
    return dmgtype_fromattack(ptr, dtyp, AT_ANY);
}

// C ref: mondata.c noattacks(ptr)
// Returns true if monster has no real attacks (AT_BOOM passive ignored).
export function noattacks(ptr) {
    if (!ptr.attacks) return true;
    for (const atk of ptr.attacks) {
        if (atk.type === AT_BOOM) continue;
        if (atk.type !== AT_NONE && atk.type) return false;
    }
    return true;
}

// C ref: mondata.c ranged_attk(ptr)
// Returns true if monster has any distance attack (DISTANCE_ATTK_TYPE macro).
// DISTANCE_ATTK_TYPE = AT_SPIT || AT_BREA || AT_MAGC || AT_GAZE
export function ranged_attk(ptr) {
    if (!ptr.attacks) return false;
    for (const atk of ptr.attacks) {
        const t = atk.type;
        if (t === AT_SPIT || t === AT_BREA || t === AT_MAGC || t === AT_GAZE)
            return true;
    }
    return false;
}

// C ref: mondata.c sticks(ptr)
// Returns true if monster can stick/grab/wrap targets it hits.
export function sticks(ptr) {
    return dmgtype(ptr, AD_STCK)
        || (dmgtype(ptr, AD_WRAP) && !attacktype(ptr, AT_ENGL))
        || attacktype(ptr, AT_HUGS);
}

// ========================================================================
// Silver/blessing vulnerability — C ref: mondata.c
// ========================================================================

// C ref: mondata.c hates_silver(ptr)
// Returns true if this monster type is especially affected by silver weapons.
export function hates_silver(ptr) {
    return is_were(ptr)
        || ptr.symbol === S_VAMPIRE
        || is_demon(ptr)
        || ptr === mons[PM_SHADE]
        || (ptr.symbol === S_IMP && ptr !== mons[PM_TENGU]);
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
export function hates_blessings(ptr) {
    return is_undead(ptr) || is_demon(ptr);
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
export function cantvomit(ptr) {
    if (ptr.symbol === S_RODENT && ptr !== mons[PM_ROCK_MOLE] && ptr !== mons[PM_WOODCHUCK])
        return true;
    if (ptr === mons[PM_WARHORSE] || ptr === mons[PM_HORSE] || ptr === mons[PM_PONY])
        return true;
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
export function sliparm(ptr) {
    return ptr.symbol === S_VORTEX
        || ptr === mons[PM_AIR_ELEMENTAL]
        || (ptr.size || 0) <= MZ_SMALL
        || ptr.symbol === S_GHOST;
}

// C ref: mondata.c breakarm(ptr)
// Returns true if creature would break out of armor (too large or non-humanoid).
// PM_MARILITH and PM_WINGED_GARGOYLE are special-cased humanoids that can't wear suits.
export function breakarm(ptr) {
    if (sliparm(ptr)) return false;
    const sz = ptr.size || 0;
    return sz >= MZ_LARGE
        || (sz > MZ_SMALL && !is_humanoid(ptr))
        || ptr === mons[PM_MARILITH]
        || ptr === mons[PM_WINGED_GARGOYLE];
}

// C ref: mondata.h haseyes macro — #define haseyes(ptr) (((ptr)->mflags1 & M1_NOEYES) == 0)
export function haseyes(ptr) { return !(ptr.flags1 & M1_NOEYES); }

// C ref: mondata.h hates_light macro — #define hates_light(ptr) ((ptr) == &mons[PM_GREMLIN])
export function hates_light(ptr) { return ptr === mons[PM_GREMLIN]; }

// C ref: mondata.c:547 — mon_hates_light(mon)
export function mon_hates_light(mon) {
    const ptr = monsdat(mon);
    return ptr ? hates_light(ptr) : false;
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
    if ((ptr.sound === MS_SILENT || ptr.sound === MS_BUZZ)
        && (breathless(ptr) || ptr.size < MZ_SMALL || nohead(ptr) || ptr.symbol === S_EEL))
        return false;
    if (isStrangled) return false;
    return true;
}

// C ref: mondata.c:580 — can_chant(mtmp)
// Returns true if monster can chant (cast spells verbally or read scrolls).
// Note: C also checks Strangled for the hero; pass isStrangled=true for that case.
export function can_chant(ptr, isStrangled = false) {
    if (isStrangled || ptr.sound === MS_SILENT || nohead(ptr)
        || ptr.sound === MS_BUZZ || ptr.sound === MS_BURBLE)
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
export function big_to_little(montype) {
    for (const [little, big] of grownups)
        if (montype === big) return little;
    return montype;
}

// C ref: mondata.c:1331 — big_little_match(montyp1, montyp2)
// Returns true if the two monster indices are part of the same growth chain.
export function big_little_match(montyp1, montyp2) {
    if (montyp1 === montyp2) return true;
    if (mons[montyp1]?.symbol !== mons[montyp2]?.symbol) return false;
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
    return ptr.symbol === S_UNICORN && likes_gems(ptr);
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
    const lkob = pm1.symbol === S_KOBOLD || pm1 === mons[PM_KOBOLD_ZOMBIE]
               || pm1 === mons[PM_KOBOLD_MUMMY];
    if (lkob) {
        return pm2.symbol === S_KOBOLD || pm2 === mons[PM_KOBOLD_ZOMBIE]
            || pm2 === mons[PM_KOBOLD_MUMMY];
    }
    if (pm1.symbol === S_OGRE) return pm2.symbol === S_OGRE;
    if (pm1.symbol === S_NYMPH) return pm2.symbol === S_NYMPH;
    if (pm1.symbol === S_CENTAUR) return pm2.symbol === S_CENTAUR;
    if (is_unicorn(pm1)) return is_unicorn(pm2);
    if (pm1.symbol === S_DRAGON) return pm2.symbol === S_DRAGON;
    if (pm1.symbol === S_NAGA) return pm2.symbol === S_NAGA;
    // Riders and minions
    if (is_rider(pm1)) return is_rider(pm2);
    if (is_minion(pm1)) return is_minion(pm2);
    // Tengu don't match imps
    const m1idx = mons.indexOf(pm1), m2idx = mons.indexOf(pm2);
    if (pm1 === mons[PM_TENGU] || pm2 === mons[PM_TENGU]) return false;
    if (pm1.symbol === S_IMP) return pm2.symbol === S_IMP;
    else if (pm2.symbol === S_IMP) return false;
    if (is_demon(pm1)) return is_demon(pm2);
    // Undead by sub-type
    if (is_undead(pm1)) {
        if (pm1.symbol === S_ZOMBIE) return pm2.symbol === S_ZOMBIE;
        if (pm1.symbol === S_MUMMY) return pm2.symbol === S_MUMMY;
        if (pm1.symbol === S_VAMPIRE) return pm2.symbol === S_VAMPIRE;
        if (pm1.symbol === S_LICH) return pm2.symbol === S_LICH;
        if (pm1.symbol === S_WRAITH) return pm2.symbol === S_WRAITH;
        if (pm1.symbol === S_GHOST) return pm2.symbol === S_GHOST;
    } else if (is_undead(pm2)) return false;
    // Check grow-up chains (same symbol class)
    if (pm1.symbol === pm2.symbol && m1idx >= 0 && m2idx >= 0) {
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
    return !!(mon.type?.flags2 & M2_STALK) && (!mon.flee || !!playerHasAmulet);
}

// ========================================================================
// Missing mondata.h macro predicates — C ref: include/mondata.h
// ========================================================================

// C ref: #define pm_resistance(ptr, typ) (((ptr)->mresists & (typ)) != 0)
// JS: C's mresists maps to ptr.mr1 in the JS monster struct.
export function pm_resistance(ptr, typ) { return !!(ptr.mr1 & typ); }

// C ref: #define immune_poisongas(ptr) ((ptr)==&mons[PM_HEZROU] || (ptr)==&mons[PM_VROCK])
export function immune_poisongas(ptr) {
    return ptr === mons[PM_HEZROU] || ptr === mons[PM_VROCK];
}

// Movement aliases — C ref: mondata.h
// C ref: #define is_flyer(ptr)   (((ptr)->mflags1 & M1_FLY) != 0L)
export function is_flyer(ptr) { return !!(ptr.flags1 & M1_FLY); }

// C ref: #define is_swimmer(ptr) (((ptr)->mflags1 & M1_SWIM) != 0L)
export function is_swimmer(ptr) { return !!(ptr.flags1 & M1_SWIM); }

// C ref: #define tunnels(ptr)    (((ptr)->mflags1 & M1_TUNNEL) != 0L)
export function tunnels(ptr) { return !!(ptr.flags1 & M1_TUNNEL); }

// C ref: #define needspick(ptr)  (((ptr)->mflags1 & M1_NEEDPICK) != 0L)
export function needspick(ptr) { return !!(ptr.flags1 & M1_NEEDPICK); }

// C ref: #define is_floater(ptr) ((ptr)->mlet == S_EYE || (ptr)->mlet == S_LIGHT)
export function is_floater(ptr) { return ptr.symbol === S_EYE || ptr.symbol === S_LIGHT; }

// C ref: #define noncorporeal(ptr) ((ptr)->mlet == S_GHOST)
export function noncorporeal(ptr) { return ptr.symbol === S_GHOST; }

// C ref: #define is_whirly(ptr) ((ptr)->mlet == S_VORTEX || (ptr)==&mons[PM_AIR_ELEMENTAL])
export function is_whirly(ptr) {
    return ptr.symbol === S_VORTEX || ptr === mons[PM_AIR_ELEMENTAL];
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
        && ((is_clinger(ptr) && ptr.symbol !== S_MIMIC) || is_flyer(ptr));
}

// C ref: #define eyecount(ptr) (!haseyes(ptr) ? 0 : ((ptr)==&mons[PM_CYCLOPS] || (ptr)==&mons[PM_FLOATING_EYE]) ? 1 : 2)
export function eyecount(ptr) {
    if (!haseyes(ptr)) return 0;
    if (ptr === mons[PM_CYCLOPS] || ptr === mons[PM_FLOATING_EYE]) return 1;
    return 2;
}

// C ref: #define has_head(ptr) (((ptr)->mflags1 & M1_NOHEAD) == 0L)
export function has_head(ptr) { return !(ptr.flags1 & M1_NOHEAD); }

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
export function is_silent(ptr) { return ptr.sound === MS_SILENT; }

// C ref: #define is_vampire(ptr) ((ptr)->mlet == S_VAMPIRE)
export function is_vampire(ptr) { return ptr.symbol === S_VAMPIRE; }

// C ref: #define passes_rocks(ptr) (passes_walls(ptr) && !unsolid(ptr))
export function passes_rocks(ptr) { return passes_walls(ptr) && !unsolid(ptr); }

// Race/gender predicates — C ref: mondata.h (flags2)
// C ref: #define is_male(ptr)    (((ptr)->mflags2 & M2_MALE) != 0L)
export function is_male(ptr) { return !!(ptr.flags2 & M2_MALE); }

// C ref: #define is_female(ptr)  (((ptr)->mflags2 & M2_FEMALE) != 0L)
export function is_female(ptr) { return !!(ptr.flags2 & M2_FEMALE); }

// C ref: #define is_neuter(ptr)  (((ptr)->mflags2 & M2_NEUTER) != 0L)
export function is_neuter(ptr) { return !!(ptr.flags2 & M2_NEUTER); }

// C ref: #define type_is_pname(ptr) (((ptr)->mflags2 & M2_PNAME) != 0L)
export function type_is_pname(ptr) { return !!(ptr.flags2 & M2_PNAME); }

// C ref: #define is_lord(ptr)    (((ptr)->mflags2 & M2_LORD) != 0L)
export function is_lord(ptr) { return !!(ptr.flags2 & M2_LORD); }

// C ref: #define is_prince(ptr)  (((ptr)->mflags2 & M2_PRINCE) != 0L)
export function is_prince(ptr) { return !!(ptr.flags2 & M2_PRINCE); }

// C ref: #define is_ndemon(ptr) (is_demon(ptr) && (((ptr)->mflags2 & (M2_LORD|M2_PRINCE)) == 0L))
export function is_ndemon(ptr) { return is_demon(ptr) && !(ptr.flags2 & (M2_LORD | M2_PRINCE)); }

// C ref: #define is_dlord(ptr) (is_demon(ptr) && is_lord(ptr))
export function is_dlord(ptr) { return is_demon(ptr) && is_lord(ptr); }

// C ref: #define is_dprince(ptr) (is_demon(ptr) && is_prince(ptr))
export function is_dprince(ptr) { return is_demon(ptr) && is_prince(ptr); }

// C ref: #define polyok(ptr) (((ptr)->mflags2 & M2_NOPOLY) == 0L)
export function polyok(ptr) { return !(ptr.flags2 & M2_NOPOLY); }

// C ref: #define extra_nasty(ptr) (((ptr)->mflags2 & M2_NASTY) != 0L)
export function extra_nasty(ptr) { return !!(ptr.flags2 & M2_NASTY); }

// C ref: #define throws_rocks(ptr) (((ptr)->mflags2 & M2_ROCKTHROW) != 0L)
export function throws_rocks(ptr) { return !!(ptr.flags2 & M2_ROCKTHROW); }

// Combat predicates — C ref: mondata.h
// C ref: #define is_armed(ptr) attacktype(ptr, AT_WEAP)
export function is_armed(ptr) { return attacktype(ptr, AT_WEAP); }

// C ref: #define cantwield(ptr) (nohands(ptr) || verysmall(ptr))
// verysmall(ptr): (ptr)->msize < MZ_SMALL
export function cantwield(ptr) { return nohands(ptr) || (ptr.size || 0) < MZ_SMALL; }

// C ref: #define could_twoweap(ptr) — multiple AT_WEAP in first 3 attack slots
export function could_twoweap(ptr) {
    const atks = ptr.attacks;
    if (!atks) return false;
    let count = 0;
    for (let i = 0; i < 3; i++) {
        if (atks[i]?.type === AT_WEAP) count++;
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
    return lays_eggs(ptr) && ptr.symbol === S_EEL && is_swimmer(ptr);
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
export function is_reviver(ptr) { return is_rider(ptr) || ptr.symbol === S_TROLL; }

// C ref: #define unique_corpstat(ptr) (((ptr)->geno & G_UNIQ) != 0)
export function unique_corpstat(ptr) { return !!(ptr.geno & G_UNIQ); }

// C ref: #define emits_light(ptr) — returns light range (0 or 1)
export function emits_light(ptr) {
    if (ptr.symbol === S_LIGHT
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
export function is_bird(ptr) { return ptr.symbol === S_BAT && !is_bat(ptr); }

// Diet predicates — C ref: mondata.h
// C ref: #define vegan(ptr) (blobs/jellies/fungi/vortexes/lights/most elementals/most golems/noncorporeal)
export function vegan(ptr) {
    const sym = ptr.symbol;
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
        || (ptr.symbol === S_PUDDING && ptr !== mons[PM_BLACK_PUDDING]);
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
        && (ptr.symbol !== S_UNICORN
            || (objectData[obj.otyp]?.material === VEGGY)
            || (obj.otyp === CORPSE && obj.corpsenm === PM_LICHEN));
}
