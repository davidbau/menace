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
    AT_BREA,
} from './monsters.js';

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

// C ref: #define is_giant(ptr)      ((ptr)->mflags2 & M2_GIANT)
export function is_giant(ptr) { return !!(ptr.flags2 & M2_GIANT); }

// C ref: #define is_shapeshifter(ptr) ((ptr)->mflags2 & M2_SHAPESHIFTER)
export function is_shapeshifter(ptr) { return !!(ptr.flags2 & M2_SHAPESHIFTER); }

// C ref: #define is_golem(ptr)      ((ptr)->mlet == S_GOLEM)
export function is_golem(ptr) { return ptr.symbol === S_GOLEM; }

// C ref: #define nonliving(ptr)     (is_golem(ptr) || is_undead(ptr))
// In C NetHack, nonliving() also checks MH_NONLIVING race flag for vortexes/elementals,
// but is_golem + is_undead covers the primary cases (golems, zombies, mummies, etc.)
export function nonliving(ptr) { return is_golem(ptr) || is_undead(ptr); }

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

// C ref: #define likes_objs(ptr)    ((ptr)->mflags2 & M2_COLLECT)
export function likes_objs(ptr) { return !!(ptr.flags2 & M2_COLLECT); }

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
    return (mon.minvent || []).some(o => o && (o.owornmask & W_SADDLE));
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
