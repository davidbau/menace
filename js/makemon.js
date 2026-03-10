// makemon.js -- Monster creation
// Faithful port of makemon.c from NetHack 3.7
// C ref: makemon.c — monster creation, selection, weapon/inventory assignment

import { game as _gstate } from './gstate.js';
import { envFlag, getEnv } from './runtime_env.js';
import { rn2, rnd, rn1, d, c_d, getRngCallCount, pushRngLogEntry } from './rng.js';
import { mksobj, mkobj, next_ident, weight, place_object, set_corpsenm } from './mkobj.js';
import { def_monsyms } from './symbols.js';
import { m_dowear, mon_break_armor } from './worn.js';
import {
    SHOPBASE, ROOMOFFSET, IS_POOL, IS_LAVA, IS_STWALL, IS_DOOR, IS_WALL, ACCESSIBLE,
    VAULT, ZOO, DELPHI, TEMPLE,
    D_LOCKED, D_CLOSED, SDOOR, SCORR, isok, COLNO, ROWNO,
    W_NONPASSWALL,
    ALL_TRAPS, HOLE, TRAPDOOR, NO_MM_FLAGS, NO_MINVENT, MAXMONNO, MM_NOWAIT,
    MM_NOCOUNTBIRTH, MM_IGNOREWATER, MM_ADJACENTOK, MM_NONAME, MM_MALE,
    MM_FEMALE, MM_EDOG, MM_ASLEEP, MM_NOGRP, MM_NOMSG, MM_NOEXCLAM,
    MM_IGNORELAVA,
    BOLT_LIM, LS_MONSTER,
} from './const.js';
import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC } from './const.js';
import { couldsee, cansee, getActiveFov } from './vision.js';
import { get_shop_item } from './shknam.js';
import { mons, SPECIAL_PM, MAXMCLASSES, G_FREQ, G_NOGEN, G_UNIQ, G_HELL, G_NOHELL, G_SGROUP, G_LGROUP, G_NOCORPSE, G_IGNORE, S_ANT, S_BLOB, S_COCKATRICE, S_DOG, S_EYE, S_FELINE, S_GREMLIN, S_HUMANOID, S_IMP, S_JELLY, S_KOBOLD, S_LEPRECHAUN, S_MIMIC, S_NYMPH, S_ORC, S_PIERCER, S_QUADRUPED, S_RODENT, S_SPIDER, S_TRAPPER, S_UNICORN, S_VORTEX, S_WORM, S_XAN, S_LIGHT, S_ZRUTY, S_ANGEL, S_BAT, S_CENTAUR, S_DRAGON, S_ELEMENTAL, S_FUNGUS, S_GNOME, S_GIANT, S_JABBERWOCK, S_KOP, S_LICH, S_MUMMY, S_NAGA, S_OGRE, S_PUDDING, S_QUANTMECH, S_RUSTMONST, S_SNAKE, S_TROLL, S_UMBER, S_VAMPIRE, S_WRAITH, S_XORN, S_YETI, S_ZOMBIE, S_HUMAN, S_GHOST, S_GOLEM, S_DEMON, S_EEL, S_LIZARD, S_MIMIC_DEF, M2_MERC, M2_LORD, M2_PRINCE, M2_NASTY, M2_FEMALE, M2_MALE, M2_STRONG, M2_ROCKTHROW, M2_HOSTILE, M2_PEACEFUL, M2_DOMESTIC, M2_NEUTER, M2_GREEDY, M2_SHAPESHIFTER, M2_NOPOLY, M2_ELF, M2_DWARF, M2_MINION, M2_DEMON, M3_WAITFORU, M3_CLOSE, M3_WAITMASK, M3_COVETOUS, M1_FLY, M1_NOHANDS, M1_SWIM, M1_AMPHIBIOUS, M1_WALLWALK, M1_AMORPHOUS, PM_ORC, PM_GIANT, PM_ELF, PM_HUMAN, PM_ETTIN, PM_MINOTAUR, PM_NAZGUL, PM_ELVEN_MONARCH, PM_MASTER_LICH, PM_ARCH_LICH, PM_GRAY_DRAGON, PM_STRAW_GOLEM, PM_PAPER_GOLEM, PM_ROPE_GOLEM, PM_GOLD_GOLEM, PM_LEATHER_GOLEM, PM_WOOD_GOLEM, PM_FLESH_GOLEM, PM_CLAY_GOLEM, PM_STONE_GOLEM, PM_GLASS_GOLEM, PM_IRON_GOLEM, PM_DEATH, PM_FAMINE, PM_WUMPUS, PM_LONG_WORM, PM_GIANT_EEL, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN, PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_GUARD, PM_SHOPKEEPER, AT_WEAP, AT_EXPL, PM_PESTILENCE, PM_GOBLIN, PM_ORC_CAPTAIN, PM_MORDOR_ORC, PM_URUK_HAI, PM_ORC_SHAMAN, PM_OGRE_LEADER, PM_OGRE_TYRANT, PM_GHOST, PM_ERINYS, PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_VLAD_THE_IMPALER, PM_WOLF, PM_FOG_CLOUD, PM_VAMPIRE_BAT, PM_CHAMELEON, PM_ROTHE, PM_CAVE_DWELLER, PM_BARBARIAN, PM_NEANDERTHAL, PM_HORNED_DEVIL, PM_BALROG, PM_ASMODEUS, PM_DISPATER, PM_YEENOGHU, PM_ORCUS, PM_HUMAN_WEREJACKAL, PM_HUMAN_WERERAT, PM_HUMAN_WEREWOLF, PM_WEREJACKAL, PM_WERERAT, PM_WEREWOLF, PM_OWLBEAR, PM_STEAM_VORTEX, PM_GREEN_SLIME, PM_VIOLET_FUNGUS, PM_SHRIEKER, PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_JELLYFISH, PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL, PM_HIGH_CLERIC, MS_LEADER, MS_NEMESIS, MS_GUARDIAN, MS_PRIEST, PM_CROESUS, PM_ARCHEOLOGIST, PM_WIZARD, PM_QUANTUM_MECHANIC, PM_HOUSECAT, PM_PONY, PM_FOREST_CENTAUR } from './monsters.js';
import {
    ROCK, STATUE, FIGURINE, EGG, TIN, STRANGE_OBJECT, GOLD_PIECE, DILITHIUM_CRYSTAL,
    RING_CLASS, WAND_CLASS, WEAPON_CLASS, FOOD_CLASS, COIN_CLASS,
    SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS, AMULET_CLASS, TOOL_CLASS,
    ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS,
    TALLOW_CANDLE, WAX_CANDLE,
    ARROW, DAGGER, KNIFE, SHORT_SWORD, LONG_SWORD, SILVER_SABER, BROADSWORD,
    ATHAME, KATANA,
    SCIMITAR, SPEAR, JAVELIN, TRIDENT, AXE, BATTLE_AXE, MACE, WAR_HAMMER, LUCERN_HAMMER,
    FLAIL, HALBERD, CLUB, AKLYS, RUBBER_HOSE, BULLWHIP, QUARTERSTAFF,
    TWO_HANDED_SWORD, MORNING_STAR, STILETTO, PICK_AXE,
    ORCISH_DAGGER, ORCISH_SHORT_SWORD, ORCISH_SPEAR, ORCISH_HELM,
    ORCISH_SHIELD, ORCISH_RING_MAIL, ORCISH_CHAIN_MAIL,
    ORCISH_BOW, ORCISH_ARROW, ORCISH_CLOAK, URUK_HAI_SHIELD,
    ELVEN_DAGGER, ELVEN_SHORT_SWORD, ELVEN_BROADSWORD, ELVEN_SPEAR, ELVEN_BOW, ELVEN_ARROW,
    ELVEN_LEATHER_HELM, ELVEN_MITHRIL_COAT, ELVEN_CLOAK,
    ELVEN_SHIELD, ELVEN_BOOTS,
    DWARVISH_MATTOCK, DWARVISH_SHORT_SWORD, DWARVISH_SPEAR,
    DWARVISH_IRON_HELM, DWARVISH_MITHRIL_COAT,
    DWARVISH_ROUNDSHIELD, DWARVISH_CLOAK,
    CROSSBOW, CROSSBOW_BOLT, BOW, SLING, FLINT,
    PARTISAN, BEC_DE_CORBIN, RANSEUR, SPETUM, GLAIVE,
    CREAM_PIE, DART, SHURIKEN, YA, YUMI, BOULDER,
    LEATHER_ARMOR, IRON_SHOES, SMALL_SHIELD, LARGE_SHIELD,
    SHIELD_OF_REFLECTION, CHAIN_MAIL, PLATE_MAIL, BRONZE_PLATE_MAIL,
    CRYSTAL_PLATE_MAIL, SPLINT_MAIL, BANDED_MAIL, RING_MAIL, STUDDED_LEATHER_ARMOR,
    HELMET, DENTED_POT, LOW_BOOTS, HIGH_BOOTS, LEATHER_GLOVES, LEATHER_CLOAK,
    CLOAK_OF_PROTECTION, CLOAK_OF_MAGIC_RESISTANCE,
    HELM_OF_BRILLIANCE, ROBE, MUMMY_WRAPPING,
    K_RATION, C_RATION, TIN_WHISTLE, BUGLE, SADDLE,
    MIRROR, POT_OBJECT_DETECTION, POT_HEALING, POT_EXTRA_HEALING,
    POT_FULL_HEALING, POT_SICKNESS, POT_SPEED, POT_INVISIBILITY,
    POT_GAIN_LEVEL, POT_POLYMORPH,
    CRYSTAL_BALL, BRASS_LANTERN, SKELETON_KEY,
    WAN_STRIKING, FOOD_RATION, TIN_OPENER, WAN_NOTHING,
    WAN_MAGIC_MISSILE, WAN_DEATH, WAN_SLEEP, WAN_FIRE, WAN_COLD, WAN_LIGHTNING,
    WAN_TELEPORTATION, WAN_CREATE_MONSTER, WAN_DIGGING,
    WAN_MAKE_INVISIBLE, WAN_SPEED_MONSTER, WAN_POLYMORPH,
    POT_ACID, POT_CONFUSION, POT_BLINDNESS, POT_SLEEPING, POT_PARALYSIS,
    SCR_EARTH, SCR_TELEPORTATION, SCR_CREATE_MONSTER,
    RIN_INVISIBILITY,
    AMULET_OF_LIFE_SAVING, AMULET_OF_YENDOR,
    CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD,
    CORPSE, LARGE_BOX, LUCKSTONE, MAXOCLASSES, objectData,
} from './objects.js';
import { roles, races, initialAlignmentRecordForRole } from './player.js';
import { mpickobj } from './steal.js';
import { dist2 } from './hacklib.js';
import { newsym, senseMonsterForMap, canspotmon, sensemon } from './display.js';
import { canseemon, mon_learns_traps, emits_light, set_mon_data, monsndx,
         is_golem, nonliving, is_humanoid, is_shapeshifter,
         is_swimmer, pm_resistance, is_flyer, is_floater, amorphous,
         noncorporeal, is_whirly } from './mondata.js';
import { Amonnam, Mgender, pmname, YMonnam, mon_nam } from './do_name.js';
import { vtense, an } from './objnam.js';
import { pline, Norep, set_msg_xy, pline_mon } from './pline.js';
import { mondied } from './mon.js';
import { update_inventory } from './invent.js';
import { get_wormno, initworm, place_worm_tail_randomly } from './worm.js';
import { new_light_source } from './light.js';
import { PIT, SPIKED_PIT, LOW_PM } from './const.js';
import { In_sokoban, Is_stronghold, Is_earthlevel, Is_waterlevel, Is_firelevel, Is_airlevel } from './dungeon.js';

// ========================================================================
// Monster flags needed for m_initweap/m_initinv checks
// ========================================================================

// Check helpers
// C ref: mhe(mtmp) — pronoun for monster
function mhe(mtmp) { return mtmp?.female ? 'she' : 'he'; }
// C ref: humanoid(ptr) — alias for is_humanoid
const humanoid = is_humanoid;

function is_mercenary(ptr) { return !!(ptr.mflags2 & M2_MERC); }
function is_lord(ptr) { return !!(ptr.mflags2 & M2_LORD); }
function is_prince(ptr) { return !!(ptr.mflags2 & M2_PRINCE); }
function is_nasty(ptr) { return !!(ptr.mflags2 & M2_NASTY); }
function is_female(ptr) { return !!(ptr.mflags2 & M2_FEMALE); }
function is_male(ptr) { return !!(ptr.mflags2 & M2_MALE); }
function strongmonst(ptr) { return !!(ptr.mflags2 & M2_STRONG); }
function is_neuter(ptr) { return !!(ptr.mflags2 & M2_NEUTER); }
function is_domestic(ptr) { return !!(ptr.mflags2 & M2_DOMESTIC); }
function is_elf(ptr) { return !!(ptr.mflags2 & M2_ELF); }
function is_dwarf(ptr) { return !!(ptr.mflags2 & M2_DWARF); }
function is_hobbit(ptr) { return ptr.mlet === S_HUMANOID && ptr.mname && ptr.mname.includes('hobbit'); }
function is_giant_species(ptr) { return ptr.mlet === S_GIANT && ptr.mname && ptr.mname.includes('giant'); }
// C ref: mondata.h:87 — #define is_armed(ptr) attacktype(ptr, AT_WEAP)
function is_armed(ptr) { return ptr.mattk && ptr.mattk.some(a => a.aatyp === AT_WEAP); }

function canHideUnderObjAt(map, x, y) {
    if (!map) return false;
    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.ttyp !== PIT && trap.ttyp !== SPIKED_PIT) return false;
    const stack = map.objectsAt ? map.objectsAt(x, y) : [];
    if (!stack || stack.length === 0) return false;
    if (stack[0]?.oclass === COIN_CLASS) {
        let coins = 0;
        let i = 0;
        while (i < stack.length && stack[i]?.oclass === COIN_CLASS) {
            coins += Number(stack[i]?.quan || 0);
            if (coins >= 10) break;
            i++;
        }
        if (coins < 10) return false;
    }
    return true;
}
// C ref: #define is_sword(otmp) (otmp->otyp >= SHORT_SWORD && otmp->otyp <= KATANA)
function is_sword(otmp) { return otmp && otmp.otyp >= SHORT_SWORD && otmp.otyp <= KATANA; }
// C ref: #define is_mplayer(ptr) ((ptr) >= &mons[PM_ARCHEOLOGIST] && (ptr) <= &mons[PM_WIZARD])
function is_mplayer_idx(mndx) { return mndx >= PM_ARCHEOLOGIST && mndx <= PM_WIZARD; }
// C ref: is_lminion — lawful minion (angel aligned to lawful god)
// During level generation, we approximate: angel with A_LAWFUL alignment
function is_lminion(mon) {
    return mon.type?.mlet === S_ANGEL && (mon.type?.maligntyp || 0) > 0;
}
function attacktype(ptr, atyp) { return ptr.mattk && ptr.mattk.some(a => a.aatyp === atyp); }
function is_animal(ptr) { return !!(ptr.mflags1 & 0x00040000); } // M1_ANIMAL
function mindless(ptr) { return !!(ptr.mflags1 & 0x00010000); } // M1_MINDLESS
function is_ndemon(ptr) { return ptr.mlet === S_DEMON; }
function always_hostile(ptr) { return !!(ptr.mflags2 & M2_HOSTILE); }
function always_peaceful(ptr) { return !!(ptr.mflags2 & M2_PEACEFUL); }
function playerHasAmulet(map) {
    const inv = map?.player?.inventory;
    return Array.isArray(inv) && inv.some((o) => o?.otyp === AMULET_OF_YENDOR);
}

function sgn(x) {
    return x > 0 ? 1 : (x < 0 ? -1 : 0);
}


function race_peaceful(ptr, playerCtx) {
    const flags2 = ptr.mflags2 || 0;
    const lovemask = races[playerCtx.race]?.lovemask || 0;
    return !!(flags2 & lovemask);
}

function race_hostile(ptr, playerCtx) {
    const flags2 = ptr.mflags2 || 0;
    const hatemask = races[playerCtx.race]?.hatemask || 0;
    return !!(flags2 & hatemask);
}

function normalizePlayerContext(ctx = {}) {
    const roleIndex = Number.isInteger(ctx.roleIndex) ? ctx.roleIndex : undefined;
    const role = roleIndex !== undefined ? roles[roleIndex] : null;
    const ualign = ctx.ualign || null;
    const level = Number.isInteger(ctx.ulevel)
        ? ctx.ulevel
        : (Number.isInteger(ctx.level) ? ctx.level : 1);
    return {
        roleIndex,
        ulevel: Number.isInteger(ctx.ulevel)
            ? ctx.ulevel
            : (Number.isInteger(ctx.level) ? ctx.level : 1),
        alignment: Number.isInteger(ctx.alignment)
            ? ctx.alignment
            : (Number.isInteger(ualign?.type) ? ualign.type : (role?.align || 0)),
        alignmentRecord: Number.isInteger(ctx.alignmentRecord)
            ? ctx.alignmentRecord
            : (Number.isInteger(ualign?.record)
                ? ualign.record
                : initialAlignmentRecordForRole(roleIndex)),
        alignmentAbuse: Number.isInteger(ctx.alignmentAbuse)
            ? ctx.alignmentAbuse
            : (Number.isInteger(ualign?.abuse) ? ualign.abuse : 0),
        race: Number.isInteger(ctx.race) ? ctx.race : 0,
        hasAmulet: !!ctx.hasAmulet,
        ulevel: level > 0 ? level : 1,
        x: Number.isInteger(ctx.x) ? ctx.x : null,
        y: Number.isInteger(ctx.y) ? ctx.y : null,
    };
}

// --- Makemon context: reads live from gstate.game.player ---
// Override is set for special cases (x/y clearing during level change,
// alignmentRecord override for pet creation, role-only context during early init).
let _makemonPlayerOverride = null;

function _getMakemonPlayerCtx() {
    if (_makemonPlayerOverride) return _makemonPlayerOverride;
    const player = _gstate?.player;
    if (!player) {
        return normalizePlayerContext({
            roleIndex: Number.isInteger(_gstate?._makemonRoleIndex)
                ? _gstate._makemonRoleIndex
                : undefined,
            ...(_gstate?._makemonRoleOpts || {}),
        });
    }
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    return normalizePlayerContext({
        roleIndex: Number.isInteger(player.roleIndex)
            ? player.roleIndex
            : (Number.isInteger(_gstate?._makemonRoleIndex) ? _gstate._makemonRoleIndex : undefined),
        alignment: player.alignment,
        alignmentRecord: player.alignmentRecord,
        alignmentAbuse: player.alignmentAbuse,
        ualign: player.ualign,
        race: player.race,
        ulevel: player.ulevel ?? player.level,
        hasAmulet: !!player.uhave?.amulet || inventory.some(o => o?.otyp === AMULET_OF_YENDOR),
        x: player.x,
        y: player.y,
    });
}

// dungeonAlign now stored on gstate.game._dungeonAlign (set by dungeon.js makelevel)
// _getInMklev() now reads from gstate.game._inMklev (unified with dungeon.js/mkobj.js).
function _getInMklev() { return !!_gstate?._inMklev; }

let _rndmonTraceInvocation = 0;

function shouldTraceRndmon() {
    if (!envFlag('WEBHACK_RNDMON_TRACE')) return false;
    const start = Number.parseInt(getEnv('WEBHACK_RNDMON_TRACE_START', '0'), 10);
    const count = Number.parseInt(getEnv('WEBHACK_RNDMON_TRACE_COUNT', '20'), 10);
    return _rndmonTraceInvocation >= start && _rndmonTraceInvocation < (start + count);
}

function getRndmonTraceCtx() {
    const stack = new Error().stack || '';
    const lines = stack.split('\n');
    const toTag = (line) => {
        const m = (line || '').match(/at (?:(\S+)\s+\()?.*?([^/\s]+\.js):(\d+)/);
        if (!m) return null;
        return `${m[1] || '?'}(${m[2]}:${m[3]})`;
    };
    const a = toTag(lines[3]);
    if (!a) return '?';
    const b = toTag(lines[4]);
    return b ? `${a} <= ${b}` : a;
}

// C ref: makemon.c:34 is_home_elemental()
export function is_home_elemental(ptr, lev = null) {
    if (!ptr || ptr.mlet !== S_ELEMENTAL) return false;
    const currentLev = lev || _gstate?.map?.uz || _gstate?.player?.uz || null;
    if (!currentLev) return false;
    const pm = monsndx(ptr);
    switch (pm) {
    case PM_AIR_ELEMENTAL:
        return Is_airlevel(currentLev);
    case PM_FIRE_ELEMENTAL:
        return Is_firelevel(currentLev);
    case PM_EARTH_ELEMENTAL:
        return Is_earthlevel(currentLev);
    case PM_WATER_ELEMENTAL:
        return Is_waterlevel(currentLev);
    default:
        return false;
    }
}

function _normalizeMakemonOverride(playerLike) {
    if (playerLike == null) return null;
    const inventory = Array.isArray(playerLike?.inventory) ? playerLike.inventory : [];
    return normalizePlayerContext({
        roleIndex: playerLike?.roleIndex,
        alignment: playerLike?.alignment,
        alignmentRecord: playerLike?.alignmentRecord,
        alignmentAbuse: playerLike?.alignmentAbuse,
        ualign: playerLike?.ualign,
        race: playerLike?.race,
        ulevel: playerLike?.ulevel,
        level: playerLike?.level,
        hasAmulet: inventory.some(o => o?.otyp === AMULET_OF_YENDOR),
        x: playerLike?.x,
        y: playerLike?.y,
    });
}

export function withMakemonPlayerOverride(playerLike, fn) {
    const prev = _makemonPlayerOverride;
    _makemonPlayerOverride = _normalizeMakemonOverride(playerLike);
    try {
        return fn();
    } finally {
        _makemonPlayerOverride = prev;
    }
}

export async function withMakemonPlayerOverrideAsync(playerLike, fn) {
    const prev = _makemonPlayerOverride;
    _makemonPlayerOverride = _normalizeMakemonOverride(playerLike);
    try {
        return await fn();
    } finally {
        _makemonPlayerOverride = prev;
    }
}

export function getMakemonRoleIndex() {
    const roleIndex = _getMakemonPlayerCtx().roleIndex;
    return Number.isInteger(roleIndex) ? roleIndex : 11;
}

function getMakemonUlevel() {
    const n = Number(_getMakemonPlayerCtx()?.ulevel);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    return 1;
}

// C ref: makemon.c peace_minded(struct permonst *ptr)
function peace_minded(ptr, playerCtx = _getMakemonPlayerCtx()) {
    const mal = ptr.maligntyp || 0;
    const ual = playerCtx.alignment || 0;
    const alignRecord = playerCtx.alignmentRecord;
    const alignAbuse = playerCtx.alignmentAbuse;

    if (always_peaceful(ptr)) return true;
    if (always_hostile(ptr)) return false;
    if (ptr.msound === MS_LEADER || ptr.msound === MS_GUARDIAN) return true;
    if (ptr.msound === MS_NEMESIS) return false;
    if (ptr === mons[PM_ERINYS]) return !alignAbuse;

    if (race_peaceful(ptr, playerCtx)) return true;
    if (race_hostile(ptr, playerCtx)) return false;

    if (sgn(mal) !== sgn(ual)) return false;
    if (mal < 0 && playerCtx.hasAmulet) return false;
    if ((ptr.mflags2 || 0) & M2_MINION) return alignRecord >= 0;

    return !!rn2(16 + (alignRecord < -15 ? -15 : alignRecord))
        && !!rn2(2 + Math.abs(mal));
}

// C ref: objnam.c rnd_class()
function mkobj_rnd_class(first, last) {
    if (first > last) {
        const t = first;
        first = last;
        last = t;
    }
    let sum = 0;
    for (let i = first; i <= last; i++) {
        sum += (objectData[i]?.oc_prob || 0);
    }
    if (sum <= 0) return first;
    let x = rnd(sum);
    for (let i = first; i <= last; i++) {
        x -= (objectData[i]?.oc_prob || 0);
        if (x <= 0) return i;
    }
    return last;
}

// ========================================================================
// rndmonst_adj -- weighted reservoir sampling (exact C port)
// C ref: makemon.c:1655-1728
// ========================================================================

// C ref: monst.h difficulty macros
function monmax_difficulty(levdif, ulevel) {
    return Math.floor((levdif + ulevel) / 2);
}
function monmin_difficulty(levdif) {
    return Math.floor(levdif / 6);
}

// C ref: makemon.c uncommon()
export function uncommon(mndx) {
    const ptr = mons[mndx];
    if (ptr.geno & (G_NOGEN | G_UNIQ)) return true;
    // mvitals not tracked — skip G_GONE check
    // Not Inhell at standard depths → check G_HELL
    return !!(ptr.geno & G_HELL);
}

const ALIGNWEIGHT = 4; // C ref: global.h ALIGNWEIGHT

// C ref: makemon.c align_shift()
function align_shift(ptr) {
    switch (_gstate?._dungeonAlign ?? A_NONE) {
    default:
    case A_NONE:
        return 0;
    case A_LAWFUL:
        return Math.trunc(((ptr.maligntyp || 0) + 20) / (2 * ALIGNWEIGHT));
    case A_NEUTRAL:
        return Math.trunc((20 - Math.abs(ptr.maligntyp || 0)) / ALIGNWEIGHT);
    case A_CHAOTIC:
        return Math.trunc((20 - (ptr.maligntyp || 0)) / (2 * ALIGNWEIGHT));
    }
}

// C ref: makemon.c temperature_shift() — no temperature at standard depths
function temperature_shift(ptr) {
    return 0;
}

// C ref: makemon.c rndmonst_adj()
export function rndmonst_adj(minadj, maxadj, depth) {
    const trace = shouldTraceRndmon();
    const traceIdx = _rndmonTraceInvocation++;
    const traceCtx = trace ? getRndmonTraceCtx() : '?';
    const ulevel = getMakemonUlevel();
    // C ref: level_difficulty() returns depth(&u.uz) for main dungeon
    const zlevel = depth;
    const minmlev = monmin_difficulty(zlevel) + minadj;
    const maxmlev = monmax_difficulty(zlevel, ulevel) + maxadj;

    // Quest check: not in quest → skip rn2(7)

    let totalweight = 0;
    let selected_mndx = -1; // NON_PM

    if (trace) {
        console.log(`[RNDMON] begin #${traceIdx} call=${getRngCallCount()} minadj=${minadj} maxadj=${maxadj} depth=${depth} diff=${minmlev}-${maxmlev} ctx=${traceCtx}`);
    }

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; mndx++) {
        const ptr = mons[mndx];

        // Difficulty filter
        if (ptr.difficulty < minmlev || montoostrong(mndx, maxmlev))
            continue;
        // upper/elemlevel: not applicable at standard depths
        if (uncommon(mndx))
            continue;
        // Not Inhell, so skip G_NOHELL check

        let weight = (ptr.geno & G_FREQ) + align_shift(ptr) + temperature_shift(ptr);
        if (weight < 0 || weight > 127) weight = 0;

        if (weight > 0) {
            totalweight += weight;

            const roll = rn2(totalweight);
            if (trace) {
                console.log(`[RNDMON] #${traceIdx} mndx=${mndx} name=${ptr.mname} w=${weight} total=${totalweight} roll=${roll} pick=${roll < weight ? 1 : 0} ctx=${traceCtx}`);
            }
            if (roll < weight)
                selected_mndx = mndx;
        }
    }

    if (trace) {
        const selectedName = selected_mndx >= 0 ? (mons[selected_mndx]?.mname || `#${selected_mndx}`) : 'NON_PM';
        console.log(`[RNDMON] end #${traceIdx} totalweight=${totalweight} selected=${selected_mndx} ${selectedName} ctx=${traceCtx}`);
    }

    if (selected_mndx < 0 || uncommon(selected_mndx))
        return -1; // NON_PM
    return selected_mndx;
}

// C ref: makemon.c rndmonst()
export function rndmonnum(depth) {
    return rndmonst_adj(0, 0, depth || 1);
}

// C ref: mkobj.c rndmonnum_adj()
export function rndmonnum_adj(minadj, maxadj, depth) {
    const chosen = rndmonst_adj(minadj, maxadj, depth || 1);
    if (chosen >= 0) return chosen;

    // Plan B: any common monster, matching C's rn1-based fallback.
    const excludeflags = G_UNIQ | G_NOGEN | G_HELL;
    let idx;
    do {
        idx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
    } while ((mons[idx].geno & excludeflags) !== 0);
    return idx;
}

// ========================================================================
// mkclass -- Pick a random monster of a given class
// C ref: makemon.c:1750-1967
// ========================================================================

const G_GENO = 0x0020;
const G_GENOD = 0x01;
const G_EXTINCT = 0x02;
const G_GONE = 0x03; // G_GENOD | G_EXTINCT (mvflags)

// C ref: mondata.h is_placeholder()
function is_placeholder(mndx) {
    return mndx === PM_ORC || mndx === PM_GIANT
        || mndx === PM_ELF || mndx === PM_HUMAN;
}

// C ref: makemon.c mk_gen_ok()
export function mk_gen_ok(mndx, mvflagsmask, genomask) {
    const ptr = mons[mndx];
    // mvitals not tracked yet — skip mvflagsmask check
    if (ptr.geno & genomask) return false;
    if (is_placeholder(mndx)) return false;
    return true;
}

// C ref: makemon.c:1750-1823 mongen_order initialization
let mongen_order = null;
let mclass_maxf = null;
// C ref: makemon.c:1756 comparator for mongen_order qsort.
export function cmp_init_mongen_order(i1, i2) {
    const idx1 = Number(i1) | 0;
    const idx2 = Number(i2) | 0;
    const difficulty1 = ((mons[idx1].difficulty | 0) | ((mons[idx1].mlet | 0) << 8));
    const difficulty2 = ((mons[idx2].difficulty | 0) | ((mons[idx2].mlet | 0) << 8));
    return difficulty1 - difficulty2;
}

// C ref: makemon.c:1777 debug check that sorted order remains monotonic.
export function check_mongen_order() {
    if (!Array.isArray(mongen_order) || mongen_order.length === 0) return true;
    let diff = 0;
    let mlet = 0;
    for (let i = LOW_PM; i < mongen_order.length; i++) {
        const mon = mons[mongen_order[i]];
        if (!mon) continue;
        if (mlet === mon.mlet) {
            if ((mon.difficulty | 0) < diff) return false;
            diff = mon.difficulty | 0;
        } else {
            mlet = mon.mlet | 0;
            diff = 0;
        }
    }
    return true;
}

export function init_mongen_order() {
    if (mongen_order) return;
    mongen_order = [];
    mclass_maxf = new Array(MAXMCLASSES).fill(0);
    for (let i = LOW_PM; i < SPECIAL_PM; i++) {
        mongen_order.push(i);
        const mlet = mons[i].mlet;
        const freq = mons[i].geno & G_FREQ;
        if (freq > mclass_maxf[mlet])
            mclass_maxf[mlet] = freq;
    }
    // C ref: qsort by (mlet << 8) | difficulty, ascending
    mongen_order.sort((a, b) => cmp_init_mongen_order(a, b));
    check_mongen_order();
}

// C ref: makemon.c:2007-2039 adj_lev()
export function adj_lev(ptr, depth = 1) {
    const ulevel = getMakemonUlevel();
    let tmp = ptr.mlevel;
    if (tmp > 49) return 50;
    let tmp2 = depth - tmp;
    if (tmp2 < 0) tmp--;
    else tmp += Math.floor(tmp2 / 5);
    tmp2 = ulevel - ptr.mlevel;
    if (tmp2 > 0) tmp += Math.floor(tmp2 / 4);
    tmp2 = Math.floor(3 * ptr.mlevel / 2);
    if (tmp2 > 49) tmp2 = 49;
    return tmp > tmp2 ? tmp2 : (tmp > 0 ? tmp : 0);
}

// C ref: monst.h montoostrong(monindx, lev)
function montoostrong(mndx, lev) {
    return mons[mndx].difficulty > lev;
}

// C ref: makemon.c:1866-1967 mkclass() / mkclass_aligned()
// Returns monster index (mndx) or -1 (NON_PM)
export function mkclass(monclass, spc, depth = 1, atyp = A_NONE) {
    const ulevel = getMakemonUlevel();
    const maxmlev = depth >> 1; // level_difficulty() >> 1
    const gehennom = 0; // not in hell during level gen

    init_mongen_order();
    const zero_freq_for_entire_class = (mclass_maxf[monclass] === 0);

    // Find first monster of this class in sorted order
    let first;
    for (first = 0; first < SPECIAL_PM; first++) {
        if (mons[mongen_order[first]].mlet === monclass) break;
    }
    if (first === SPECIAL_PM) return -1;

    let mv_mask = G_GONE;
    if (spc & G_IGNORE) {
        mv_mask = 0;
        spc &= ~G_IGNORE;
    }

    let num = 0;
    const nums = new Array(SPECIAL_PM + 1).fill(0);
    let last;

    for (last = first; last < SPECIAL_PM && mons[mongen_order[last]].mlet === monclass; last++) {
        const mndx = mongen_order[last];

        // Alignment filter (for mkclass_aligned)
        if (atyp !== A_NONE && Math.sign(mons[mndx].maligntyp) !== Math.sign(atyp))
            continue;

        // C ref: hell/nohell gating — rn2(9) per candidate
        let gn_mask = G_NOGEN | G_UNIQ;
        if (rn2(9) || monclass === S_LICH)
            gn_mask |= (gehennom ? G_NOHELL : G_HELL);
        gn_mask &= ~spc;

        if (mk_gen_ok(mndx, mv_mask, gn_mask)) {
            // C ref: montoostrong early exit — conditional rn2(2)
            if (num && montoostrong(mndx, maxmlev)
                && mons[mndx].difficulty > mons[mongen_order[last - 1]].difficulty
                && rn2(2))
                break;
            let k = mons[mndx].geno & G_FREQ;
            if (k === 0 && zero_freq_for_entire_class) k = 1;
            if (k > 0) {
                // Skew toward lower monsters at lower levels
                nums[mndx] = k + 1 - (adj_lev(mons[mndx], depth) > (ulevel * 2) ? 1 : 0);
                num += nums[mndx];
            }
        }
    }

    if (!num) return -1;

    // C ref: final selection — rnd(num)
    let roll = rnd(num);
    for (let i = first; i < last; i++) {
        const mndx = mongen_order[i];
        roll -= nums[mndx];
        if (roll <= 0)
            return nums[mndx] ? mndx : -1;
    }
    return -1;
}

// C ref: makemon.c:1873 mkclass_aligned()
export function mkclass_aligned(monclass, spc, atyp, depth = 1) {
    return mkclass(monclass, spc, depth, atyp);
}

// C ref: makemon.c:1976 mkclass_poly()
export function mkclass_poly(monclass) {
    let first;
    for (first = LOW_PM; first < SPECIAL_PM; first++) {
        if (mons[first].mlet === monclass) break;
    }
    if (first === SPECIAL_PM) return -1;

    let gmask = G_NOGEN | G_UNIQ;
    const inhell = !!_gstate?.Inhell;
    if (rn2(9) || monclass === S_LICH) {
        gmask |= (inhell ? G_NOHELL : G_HELL);
    }

    let num = 0;
    let last;
    for (last = first; last < SPECIAL_PM && mons[last].mlet === monclass; last++) {
        if (mk_gen_ok(last, G_GENOD, gmask)) {
            num += mons[last].geno & G_FREQ;
        }
    }
    if (!num) return -1;

    let roll = rnd(num);
    for (let i = first; i < last; i++) {
        if (mk_gen_ok(i, G_GENOD, gmask)) {
            roll -= (mons[i].geno & G_FREQ);
            if (roll <= 0) return i;
        }
    }
    return -1;
}

// C ref: drawing.c def_char_to_monclass()
export function def_char_to_monclass(ch) {
    for (let i = 1; i < MAXMCLASSES; i++) {
        if (ch === def_monsyms[i].sym) return i;
    }
    return MAXMCLASSES;
}

// cf. makemon.c:1539 — return the birth limit for a monster type
// (how many of this monster can exist before the population is considered too large)
// Autotranslated from makemon.c:1539
export function mbirth_limit(mndx) {
  return (mndx === PM_NAZGUL ? 9 : mndx === PM_ERINYS ? 3 : MAXMONNO);
}

// C ref: makemon.c:959 propagate()
export function propagate(mndx, tally = true, ghostly = false, game = _gstate) {
    if (!game) return false;
    if (!Array.isArray(game.mvitals)) return false;
    const mv = game.mvitals[mndx];
    if (!mv) return false;

    const lim = mbirth_limit(mndx);
    const gone = !!(mv.mvflags & G_GONE);
    const born = Number(mv.born || 0);
    const result = (born < lim) && !gone;

    if ((mons[mndx].geno & G_UNIQ) && mndx !== PM_HIGH_CLERIC) {
        mv.mvflags |= G_EXTINCT;
    }

    if (born < 255 && tally && (!ghostly || result)) {
        mv.born = born + 1;
    }

    if ((mv.born || 0) >= lim
        && !(mons[mndx].geno & G_NOGEN)
        && !(mv.mvflags & G_EXTINCT)) {
        mv.mvflags |= G_EXTINCT;
    }

    return result;
}

// C ref: makemon.c:1828 debug dump helper for mongen order.
export function dump_mongen() {
    init_mongen_order();
    return mongen_order.slice();
}

// ========================================================================
// newmonhp -- HP calculation (exact C port)
// C ref: makemon.c:1013-1055
// ========================================================================

function golemhp(mndx) {
    switch (mndx) {
    case PM_STRAW_GOLEM: return 20;
    case PM_PAPER_GOLEM: return 20;
    case PM_ROPE_GOLEM: return 30;
    case PM_LEATHER_GOLEM: return 40;
    case PM_GOLD_GOLEM: return 60;
    case PM_WOOD_GOLEM: return 50;
    case PM_FLESH_GOLEM: return 40;
    case PM_CLAY_GOLEM: return 70;
    case PM_STONE_GOLEM: return 100;
    case PM_GLASS_GOLEM: return 80;
    case PM_IRON_GOLEM: return 120;
    default: return 0;
    }
}

export function newmonhp(mndx, depth = 1) {
    const ptr = mons[mndx];
    let m_lev = adj_lev(ptr, depth);
    let hp;
    let basehp = 0;

    if (ptr.mlet === S_GOLEM) {
        hp = golemhp(mndx);
    } else if (mndx === PM_DEATH || mndx === PM_PESTILENCE || mndx === PM_FAMINE) {
        basehp = 10;
        hp = c_d(basehp, 8);
    } else if ((ptr.mlevel || 0) > 49) {
        hp = 2 * ((ptr.mlevel || 0) - 6);
        m_lev = Math.floor(hp / 4);
    } else if (ptr.mlet === S_DRAGON && mndx >= PM_GRAY_DRAGON) {
        basehp = m_lev;
        // In_endgame() path is not yet modeled in JS runtime.
        hp = (4 * basehp) + c_d(basehp, 4);
    } else if (m_lev === 0) {
        basehp = 1;
        hp = rnd(4);
    } else {
        basehp = m_lev;
        hp = c_d(basehp, 8);
    }

    // C ref: if mhpmax == basehp, add 1
    if (hp === basehp) hp++;

    return { hp, m_lev };
}

// ========================================================================
// mongets -- give a monster an object (C ref: makemon.c:2176-2225)
// Creates the object via mksobj, applies monster-specific adjustments,
// then adds to monster inventory via mpickobj.
// ========================================================================
export function mongets(mon,otyp) {
    if (!otyp) return null;
    const otmp = mksobj(otyp, true, false);
    if (!otmp) return null;

    const ptr = mon?.type || (mon?.mndx != null ? mons[mon.mndx] : null);
    if (ptr) {
        // C ref: makemon.c:2186 — demons never get blessed objects
        if (ptr.mflags2 & M2_DEMON) {
            if (otmp.blessed) {
                otmp.blessed = false;
                otmp.cursed = true;
            }
        } else if (is_lminion(mon)) {
            // C ref: makemon.c:2190 — lawful minions don't get cursed/bad/rusting
            otmp.cursed = false;
            if ((otmp.spe || 0) < 0) otmp.spe = 0;
            otmp.oerodeproof = true;
            otmp.oeroded = 0;
            otmp.oeroded2 = 0;
        } else if (is_mplayer_idx(mon.mndx) && is_sword(otmp)) {
            // C ref: makemon.c:2196 — monster players get enchanted swords
            otmp.spe = 3 + rn2(4);
        }

        // C ref: makemon.c:2199-2211 — special artifact handling
        if (otmp.otyp === CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0;
            otmp.lamplit = false;
            otmp.blessed = false;
            otmp.cursed = false;
        } else if (otmp.otyp === BELL_OF_OPENING) {
            otmp.blessed = false;
            otmp.cursed = false;
        } else if (otmp.otyp === SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = false;
            otmp.cursed = true;
        }

        // C ref: makemon.c:2215 — leaders don't tolerate inferior gear
        if (is_prince(ptr)) {
            if (otmp.oclass === WEAPON_CLASS && (otmp.spe || 0) < 1)
                otmp.spe = 1;
            else if (otmp.oclass === ARMOR_CLASS && (otmp.spe || 0) < 0)
                otmp.spe = 0;
        }
    }

    if (mon) mpickobj(mon, otmp);
    return otmp;
}

// ========================================================================
// m_initthrow -- create missile objects
// C ref: makemon.c:149-159
// ========================================================================
// Autotranslated from makemon.c:149
export function m_initthrow(mtmp, otyp, oquan) {
  let otmp;
  otmp = mksobj(otyp, true, false);
  otmp.quan =  rn1(oquan, 3);
  otmp.owt = weight(otmp);
  if (otyp === ORCISH_ARROW) otmp.opoisoned = true;
  mpickobj(mtmp, otmp);
}

// ========================================================================
// m_initweap -- weapon/armor assignment
// C ref: makemon.c:162-573
// This is a huge function. We port all branches to consume correct RNG.
// ========================================================================

function m_initweap(mon, mndx, depth) {
    const ptr = mons[mndx];
    const mm = ptr.mlet; // mlet
    const bias = is_lord(ptr) ? 1 : is_prince(ptr) ? 2 : is_nasty(ptr) ? 1 : 0;

    switch (mm) {
    case S_GIANT:
        // C ref: makemon.c:182-185
        if (rn2(2)) {
            mongets(mon,(mndx !== PM_ETTIN) ? BOULDER : CLUB);
        }
        if ((mndx !== PM_ETTIN) && !rn2(5)) {
            mongets(mon,rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE);
        }
        break;

    case S_HUMAN:
        if (is_mercenary(ptr)) {
            // C ref: makemon.c:188-226
            let w1 = 0;
            let w2 = 0;
            switch (mndx) {
            case PM_WATCHMAN:
            case PM_SOLDIER:
                if (!rn2(3)) {
                    w1 = rn1(BEC_DE_CORBIN - PARTISAN + 1, PARTISAN);
                    w2 = rn2(2) ? DAGGER : KNIFE;
                } else {
                    w1 = rn2(2) ? SPEAR : SHORT_SWORD;
                }
                break;
            case PM_SERGEANT:
                w1 = rn2(2) ? FLAIL : MACE;
                break;
            case PM_LIEUTENANT:
                w1 = rn2(2) ? BROADSWORD : LONG_SWORD;
                break;
            case PM_CAPTAIN:
            case PM_WATCH_CAPTAIN:
                w1 = rn2(2) ? LONG_SWORD : SILVER_SABER;
                break;
            default:
                if (!rn2(4)) w1 = DAGGER;
                if (!rn2(7)) w2 = SPEAR;
                break;
            }
            if (w1) mongets(mon,w1);
            if (!w2 && w1 !== DAGGER && !rn2(4)) w2 = KNIFE;
            if (w2) mongets(mon,w2);
        } else if (is_elf(ptr)) {
            // C ref: makemon.c elf equipment branch.
            if (rn2(2)) {
                mongets(mon,rn2(2) ? ELVEN_MITHRIL_COAT : ELVEN_CLOAK);
            }
            if (rn2(2)) mongets(mon,ELVEN_LEATHER_HELM);
            else if (!rn2(4)) mongets(mon,ELVEN_BOOTS);
            if (rn2(2)) mongets(mon,ELVEN_DAGGER);
            const w = rn2(3);
            if (w === 0) {
                if (!rn2(4)) mongets(mon,ELVEN_SHIELD);
                if (rn2(3)) mongets(mon,ELVEN_SHORT_SWORD);
                mongets(mon,ELVEN_BOW);
                m_initthrow(mon, ELVEN_ARROW, 12);
            } else if (w === 1) {
                mongets(mon,ELVEN_BROADSWORD);
                if (rn2(2)) mongets(mon,ELVEN_SHIELD);
            } else {
                if (rn2(2)) {
                    mongets(mon,ELVEN_SPEAR);
                    mongets(mon,ELVEN_SHIELD);
                }
            }
            if (mndx === PM_ELVEN_MONARCH) {
                if (rn2(3)) mongets(mon, PICK_AXE);
                if (!rn2(50)) mongets(mon, CRYSTAL_BALL);
            }
        } else {
            // Generic human — check specific types
            // Ninja, priest, cleric, etc. — simplified
            if (ptr.msound === MS_PRIEST) {
                // C ref: makemon.c m_initweap() priest branch uses mksobj()
                // directly (not mongets), so no WEAPON_CLASS init RNG here.
                const otmp = mksobj(MACE, false, false);
                if (otmp) {
                    otmp.spe = rnd(3);
                    if (!rn2(2)) otmp.cursed = true;
                    mpickobj(mon, otmp);
                }
            } else if (ptr.mname && ptr.mname === 'ninja') {
                if (rn2(4)) m_initthrow(mon, SHURIKEN, 8);
                else m_initthrow(mon, DART, 8);
                if (rn2(4)) mongets(mon,SHORT_SWORD);
                else mongets(mon,AXE);
            }
        }
        break;

    case S_ANGEL:
        if (rn2(3)) {
            mongets(mon,rn2(2) ? LONG_SWORD : MACE);
        }
        // Artifact check — rn2(20)
        if (!rn2(20)) { /* mk_artifact */ }
        {
            const otmp = mongets(mon,rn2(4) ? SHIELD_OF_REFLECTION : LARGE_SHIELD);
            otmp.spe = rn2(4);
        }
        break;

    case S_HUMANOID:
        if (is_hobbit(ptr)) {
            switch (rn2(3)) {
            case 0: mongets(mon, DAGGER); break;
            case 1: mongets(mon, ELVEN_DAGGER); break;
            case 2:
                mongets(mon, SLING);
                m_initthrow(mon, !rn2(4) ? FLINT : ROCK, 6);
                break;
            }
            if (!rn2(10)) mongets(mon,ELVEN_MITHRIL_COAT);
            if (!rn2(10)) mongets(mon,DWARVISH_CLOAK);
        } else if (is_dwarf(ptr)) {
            if (rn2(7)) mongets(mon,DWARVISH_CLOAK);
            if (rn2(7)) mongets(mon,IRON_SHOES);
            if (!rn2(4)) {
                mongets(mon,DWARVISH_SHORT_SWORD);
                if (rn2(2)) {
                    mongets(mon,DWARVISH_MATTOCK);
                } else {
                    mongets(mon,rn2(2) ? AXE : DWARVISH_SPEAR);
                    mongets(mon,DWARVISH_ROUNDSHIELD);
                }
                mongets(mon,DWARVISH_IRON_HELM);
                if (!rn2(3)) mongets(mon,DWARVISH_MITHRIL_COAT);
            } else {
                mongets(mon,!rn2(3) ? PICK_AXE : DAGGER);
            }
        }
        break;

    case S_KOP:
        if (!rn2(4)) m_initthrow(mon, CREAM_PIE, 2);
        if (!rn2(3)) mongets(mon,rn2(2) ? CLUB : RUBBER_HOSE);
        break;

    case S_ORC: {
        // C ref: makemon.c:411-446
        if (rn2(2)) mongets(mon,ORCISH_HELM);
        const orcType = (mndx !== PM_ORC_CAPTAIN) ? mndx
            : rn2(2) ? PM_MORDOR_ORC : PM_URUK_HAI;
        if (orcType === PM_MORDOR_ORC) {
            if (!rn2(3)) mongets(mon,SCIMITAR);
            if (!rn2(3)) mongets(mon,ORCISH_SHIELD);
            if (!rn2(3)) mongets(mon,KNIFE);
            if (!rn2(3)) mongets(mon,ORCISH_CHAIN_MAIL);
        } else if (orcType === PM_URUK_HAI) {
            if (!rn2(3)) mongets(mon,ORCISH_CLOAK);
            if (!rn2(3)) mongets(mon,ORCISH_SHORT_SWORD);
            if (!rn2(3)) mongets(mon,IRON_SHOES);
            if (!rn2(3)) {
                mongets(mon,ORCISH_BOW);
                m_initthrow(mon, ORCISH_ARROW, 12);
            }
            if (!rn2(3)) mongets(mon,URUK_HAI_SHIELD);
        } else {
            // default: common orc
            if (mndx !== PM_ORC_SHAMAN && rn2(2))
                mongets(mon,(mndx === PM_GOBLIN || rn2(2) === 0) ? ORCISH_DAGGER : SCIMITAR);
        }
        break;
    }

    case S_OGRE:
        // C ref: makemon.c:447-452
        if (!rn2(mndx === PM_OGRE_TYRANT ? 3 : mndx === PM_OGRE_LEADER ? 6 : 12)) {
            mongets(mon,BATTLE_AXE);
        } else {
            mongets(mon,CLUB);
        }
        break;

    case S_TROLL:
        // C ref: makemon.c:454-467
        if (!rn2(2)) {
            const w = rn2(4);
            if (w === 0) mongets(mon,RANSEUR);
            else if (w === 1) mongets(mon,PARTISAN);
            else if (w === 2) mongets(mon,GLAIVE);
            else mongets(mon,SPETUM);
        }
        break;

    case S_KOBOLD:
        if (!rn2(4)) m_initthrow(mon, DART, 12);
        break;

    case S_CENTAUR:
        // C ref: makemon.c:477 — forest centaurs get BOW+ARROW, others CROSSBOW+BOLT
        if (rn2(2)) {
            if (mndx === PM_FOREST_CENTAUR) {
                mongets(mon, BOW);
                m_initthrow(mon, ARROW, 12);
            } else {
                mongets(mon, CROSSBOW);
                m_initthrow(mon, CROSSBOW_BOLT, 12);
            }
        }
        break;

    case S_WRAITH:
        mongets(mon,KNIFE);
        mongets(mon,LONG_SWORD);
        break;

    case S_ZOMBIE:
        if (!rn2(4)) mongets(mon,LEATHER_ARMOR);
        if (!rn2(4)) {
            mongets(mon,rn2(3) ? KNIFE : SHORT_SWORD);
        }
        break;

    case S_LIZARD:
        // Salamander
        if (ptr.mname && ptr.mname === 'salamander') {
            if (!rn2(7)) mongets(mon,SPEAR);
            else if (!rn2(3)) mongets(mon,TRIDENT);
            else mongets(mon,STILETTO);
        }
        break;

    case S_DEMON:
        // Horned devil
        if (ptr.mname && ptr.mname === 'horned devil') {
            if (!rn2(4)) {
                mongets(mon,rn2(2) ? TRIDENT : BULLWHIP);
            }
        }
        break;

    default:
        // Generic weapon assignment for armed monsters
        // C ref: makemon.c:534-571
        if (ptr.mattk && ptr.mattk.some(a => a.aatyp === 254)) { // AT_WEAP
            const w = rnd(Math.max(1, 14 - 2 * bias));
            switch (w) {
            case 1:
                if (strongmonst(ptr)) mongets(mon,BATTLE_AXE);
                else m_initthrow(mon, DART, 12);
                break;
            case 2:
                if (strongmonst(ptr)) mongets(mon,TWO_HANDED_SWORD);
                else {
                    mongets(mon,CROSSBOW);
                    m_initthrow(mon, CROSSBOW_BOLT, 12);
                }
                break;
            case 3:
                mongets(mon,BOW);
                m_initthrow(mon, ARROW, 12);
                break;
            case 4:
                if (strongmonst(ptr)) mongets(mon,LONG_SWORD);
                else m_initthrow(mon, DAGGER, 3);
                break;
            case 5:
                if (strongmonst(ptr)) mongets(mon,LUCERN_HAMMER);
                else mongets(mon,AKLYS);
                break;
            default:
                break;
            }
        }
        break;
    }

    // C ref: makemon.c:571 — offensive item check, OUTSIDE the switch,
    // always called for ALL monsters. rn2(75) is always consumed.
    if ((mon.m_lev ?? 0) > rn2(75)) {
        // C ref: makemon.c -> muse.c rnd_offensive_item()
        const otyp = rnd_offensive_item(mon);
        if (otyp) mongets(mon, otyp);
    }
}

// ========================================================================
// rnd_defensive_item -- select random defensive item for monster
// C ref: muse.c:1221-1274
// ========================================================================

function rnd_defensive_item(mon, mndx, map) {
    const ptr = mons[mndx];
    const difficulty = ptr.difficulty || 0;
    let trycnt = 0;

    // Animals, exploders, mindless, ghosts, Kops don't get defensive items
    if (is_animal(ptr) || attacktype(ptr, AT_EXPL) || mindless(ptr)
        || ptr.mlet === S_GHOST || ptr.mlet === S_KOP) {
        return 0;
    }

    // Difficulty-based item selection (with retry loop for teleport cases)
    while (true) {
        const roll = rn2(8 + (difficulty > 3 ? 1 : 0) + (difficulty > 6 ? 1 : 0) + (difficulty > 8 ? 1 : 0));

        switch (roll) {
        case 6:
        case 9:
            // C ref: muse.c:1234 — retry (goto try_again) on noteleport level
            if ((map && map.flags && map.flags.noteleport) && ++trycnt < 2) continue;
            if (!rn2(3)) return WAN_TELEPORTATION;
            // Fall through
        case 0:
        case 1:
            return SCR_TELEPORTATION;
        case 8:
        case 10:
            if (!rn2(3)) return WAN_CREATE_MONSTER;
            // Fall through
        case 2:
            return SCR_CREATE_MONSTER;
        case 3:
            return POT_HEALING;
        case 4:
            return POT_EXTRA_HEALING;
        case 5:
            return (mndx !== PM_PESTILENCE) ? POT_FULL_HEALING : POT_SICKNESS;
        case 7:
            // Note: Sokoban check omitted (not during level gen), shopkeeper/priest checks omitted
            return WAN_DIGGING;
        }
        return 0;
    }
}

// ========================================================================
// rnd_misc_item -- select random misc item for monster
// C ref: muse.c:2619-2657
// ========================================================================

function rnd_misc_item(mon) {
    const mndx = mon?.mndx;
    if (!Number.isInteger(mndx) || mndx < 0 || mndx >= mons.length) return 0;
    const ptr = mons[mndx];
    const difficulty = ptr.difficulty || 0;

    // Animals, exploders, mindless, ghosts, Kops don't get misc items
    if (is_animal(ptr) || attacktype(ptr, AT_EXPL) || mindless(ptr)
        || ptr.mlet === S_GHOST || ptr.mlet === S_KOP) {
        return 0;
    }

    // Weak monsters (difficulty < 6) can get polymorph items
    if (difficulty < 6 && !rn2(30)) {
        return rn2(6) ? POT_POLYMORPH : WAN_POLYMORPH;
    }

    // Non-living monsters and vampshifters don't get amulet of life saving
    // Note: is_vampshifter check omitted (only applies to existing monsters)
    const nonliving_monster = !!(ptr.mflags3 & 0x00000040); // MZ_NONLIVING
    if (!rn2(40) && !nonliving_monster) {
        return AMULET_OF_LIFE_SAVING;
    }

    switch (rn2(3)) {
    case 0:
        // C ref: muse.c rnd_misc_item() — vault guard gets no speed item.
        if (mon?.isgd) return 0;
        return rn2(6) ? POT_SPEED : WAN_SPEED_MONSTER;
    case 1:
        // C ref: muse.c rnd_misc_item() — peaceful monsters avoid invis item
        // when hero lacks See_invisible. For levelgen parity we treat
        // See_invisible as false.
        if (mon?.mpeaceful) return 0;
        return rn2(6) ? POT_INVISIBILITY : WAN_MAKE_INVISIBLE;
    case 2:
        return POT_GAIN_LEVEL;
    }
    return 0;
}

// ========================================================================
// rnd_offensive_item -- select random offensive item for monster
// C ref: muse.c:2014-2060
// ========================================================================
function rnd_offensive_item(mon) {
    const mndx = mon?.mndx;
    if (!Number.isInteger(mndx) || mndx < 0 || mndx >= mons.length) return 0;
    const ptr = mons[mndx];
    const difficulty = ptr.difficulty || 0;

    // Animals, exploders, mindless, ghosts, Kops don't get offensive items.
    if (is_animal(ptr) || attacktype(ptr, AT_EXPL) || mindless(ptr)
        || ptr.mlet === S_GHOST || ptr.mlet === S_KOP) {
        return 0;
    }

    if (difficulty > 7 && !rn2(35)) return WAN_DEATH;

    const range = 9 - (difficulty < 4 ? 1 : 0) + 4 * (difficulty > 6 ? 1 : 0);
    switch (rn2(range)) {
    case 0:
        // C's case 0 can fall through to case 1 for many monsters; in
        // levelgen this branch must produce WAN_STRIKING in the common path.
        return WAN_STRIKING;
    case 1:
        return WAN_STRIKING;
    case 2:
        return POT_ACID;
    case 3:
        return POT_CONFUSION;
    case 4:
        return POT_BLINDNESS;
    case 5:
        return POT_SLEEPING;
    case 6:
        return POT_PARALYSIS;
    case 7:
    case 8:
        return WAN_MAGIC_MISSILE;
    case 9:
        return WAN_SLEEP;
    case 10:
        return WAN_FIRE;
    case 11:
        return WAN_COLD;
    case 12:
        return WAN_LIGHTNING;
    default:
        return 0;
    }
}

// ========================================================================
// m_initinv -- inventory items
// C ref: makemon.c:590-810
// Simplified: only port branches that consume RNG
// ========================================================================

function findgold(minvent) {
    if (!Array.isArray(minvent)) return false;
    return minvent.some((obj) => obj && obj.otyp === GOLD_PIECE && Number(obj.quan || 0) > 0);
}
export function mkmonmoney(mon, amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const gold = mksobj(GOLD_PIECE, false, false);
    if (!gold) return;
    gold.quan = Math.trunc(amount);
    gold.owt = weight(gold);
    // C ref: mkmonmoney uses add_to_minv (not mpickobj), no pickup event
    if (mon && Array.isArray(mon.minvent)) {
        mon.minvent.push(gold);
    }
}

function m_initinv(mon, mndx, depth, m_lev, map) {
    const ptr = mons[mndx];
    // C ref: makemon.c:597-599 — no initial inventory logic on rogue levels.
    if (map?.flags?.is_rogue_lev || map?.flags?.roguelike || map?.flags?.is_rogue) {
        return;
    }
    const mm = ptr.mlet;
    switch (mm) {
    case S_HUMAN:
        if (is_mercenary(ptr)) {
            // C ref: makemon.c m_initinv() mercenary branch.
            // Keep the same roll order and gating so RNG stays aligned.
            let mac = 0;
            if (mndx === PM_SOLDIER) mac = 3;
            else if (mndx === PM_SERGEANT) mac = 0;
            else if (mndx === PM_LIEUTENANT) mac = -2;
            else if (mndx === PM_CAPTAIN) mac = -3;
            else if (mndx === PM_WATCHMAN) mac = 3;
            else if (mndx === PM_WATCH_CAPTAIN) mac = -2;

            const addAc = (otyp) => {
                if (!Number.isFinite(otyp)) return;
                const obj = mongets(mon,otyp);
                const baseAc = Number(objectData[otyp]?.oc_oc1 || 0);
                const spe = Number(obj?.spe || 0);
                const erosion = Math.max(Number(obj?.oeroded || 0), Number(obj?.oeroded2 || 0));
                // C ref: ARM_BONUS(obj) = a_ac + spe - min(greatest_erosion, a_ac)
                mac += (baseAc + spe - Math.min(erosion, baseAc));
            };

            if (mac < -1 && rn2(5)) {
                addAc(rn2(5) ? PLATE_MAIL : CRYSTAL_PLATE_MAIL);
            } else if (mac < 3 && rn2(5)) {
                addAc(rn2(3) ? SPLINT_MAIL : BANDED_MAIL);
            } else if (rn2(5)) {
                addAc(rn2(3) ? RING_MAIL : STUDDED_LEATHER_ARMOR);
            } else {
                addAc(LEATHER_ARMOR);
            }

            if (mac < 10 && rn2(3)) {
                addAc(HELMET);
            } else if (mac < 10 && rn2(2)) {
                addAc(DENTED_POT);
            }

            if (mac < 10 && rn2(3)) {
                addAc(SMALL_SHIELD);
            } else if (mac < 10 && rn2(2)) {
                addAc(LARGE_SHIELD);
            }

            if (mac < 10 && rn2(3)) {
                addAc(LOW_BOOTS);
            } else if (mac < 10 && rn2(2)) {
                addAc(HIGH_BOOTS);
            }

            if (mac < 10 && rn2(3)) {
                addAc(LEATHER_GLOVES);
            } else if (mac < 10 && rn2(2)) {
                addAc(LEATHER_CLOAK);
            }

            if (mndx === PM_WATCH_CAPTAIN) {
                // No extra gear in C.
            } else if (mndx === PM_WATCHMAN) {
                if (rn2(3)) mongets(mon,TIN_WHISTLE);
            } else if (mndx === PM_GUARD) {
                mongets(mon,TIN_WHISTLE);
            } else {
                // Soldiers and officers.
                if (!rn2(3)) mongets(mon,K_RATION);
                if (!rn2(2)) mongets(mon,C_RATION);
                if (mndx !== PM_SOLDIER && !rn2(3)) mongets(mon,BUGLE);
            }
        } else if (ptr.msound === MS_PRIEST) {
            mongets(mon,rn2(7) ? ROBE : (rn2(3) ? CLOAK_OF_PROTECTION : CLOAK_OF_MAGIC_RESISTANCE));
            mongets(mon,SMALL_SHIELD);
            mkmonmoney(mon, rn1(10, 20));
        } else if (mndx === PM_SHOPKEEPER) {
            // C ref: makemon.c:703-721 — SKELETON_KEY + fall-through switch
            mongets(mon,SKELETON_KEY);
            const w = rn2(4);
            // MAJOR fall through: case 0 gets all items, case 3 only WAN_STRIKING
            if (w <= 0) mongets(mon,WAN_MAGIC_MISSILE);
            if (w <= 1) mongets(mon,POT_EXTRA_HEALING);
            if (w <= 2) mongets(mon,POT_HEALING);
            mongets(mon,WAN_STRIKING); // case 3 always executes
        }
        break;

    case S_NYMPH:
        if (!rn2(2)) mongets(mon,MIRROR);
        if (!rn2(2)) mongets(mon,POT_OBJECT_DETECTION);
        break;

    case S_GIANT:
        // C ref: makemon.c:740-751
        if (mndx === PM_MINOTAUR) {
            if (!rn2(3)) {
                mongets(mon,WAN_DIGGING);
            }
        } else if (is_giant_species(ptr)) {
            const cnt = rn2(Math.floor(m_lev / 2));
            for (let i = 0; i < cnt; i++) {
                const otyp = mkobj_rnd_class(DILITHIUM_CRYSTAL, LUCKSTONE - 1);
                const otmp = mksobj(otyp, false, false);
                otmp.quan = rn1(2, 3);
                otmp.owt = otmp.quan * (objectData[otmp.otyp].oc_wt || 1);
                mpickobj(mon, otmp);
            }
        }
        break;

    case S_WRAITH:
        if (mndx === PM_NAZGUL) {
            const otmp = mksobj(RIN_INVISIBILITY, false, false);
            otmp.cursed = true;
            mpickobj(mon, otmp);
        }
        break;

    case S_LICH:
        // C ref: makemon.c lich equipment
        if (mndx === PM_MASTER_LICH) {
            if (!rn2(13)) mongets(mon,rn2(7) ? ATHAME : WAN_NOTHING);
        } else if (mndx === PM_ARCH_LICH && !rn2(3)) {
            // C ref: mksobj(rn2(3) ? ATHAME : QUARTERSTAFF, TRUE, rn2(13)?FALSE:TRUE)
            // Consume the enchantment RNG draw regardless; cursedness is not fully modeled here.
            const otmp = mongets(mon,rn2(3) ? ATHAME : QUARTERSTAFF);
            rn2(13);
            if (otmp && (otmp.spe || 0) < 2) {
                otmp.spe = rnd(3);
            }
            if (otmp && !rn2(4)) {
                otmp.oerodeproof = true;
            }
        }
        break;

    case S_MUMMY:
        // C ref: makemon.c gives wrapping on rn2(7)!=0 (6/7 chance)
        if (rn2(7)) mongets(mon,MUMMY_WRAPPING);
        break;

    case S_GNOME:
        // C ref: makemon.c:811 — gnome candle
        // Not in mines at depth 1, so rn2(60)
        if (!rn2(60)) {
            mongets(mon,rn2(4) ? TALLOW_CANDLE : WAX_CANDLE);
        }
        break;

    case S_LEPRECHAUN:
        mkmonmoney(mon, c_d(Math.max(depth, 1), 30));
        break;

    case S_QUANTMECH:
        // C ref: makemon.c:779-793 — Schroedinger's Box check for quantum mechanic.
        // Always consumes rn2(20); creates a large box with a cat corpse when triggered.
        if (!rn2(20) && mndx === PM_QUANTUM_MECHANIC) {
            const box = mksobj(LARGE_BOX, false, false);
            if (box) {
                box.spe = 1; // Schroedinger's Box flag
                const catcorpse = mksobj(CORPSE, true, false);
                if (catcorpse) {
                    set_corpsenm(catcorpse, PM_HOUSECAT);
                    if (!Array.isArray(box.cobj)) box.cobj = [];
                    box.cobj.push(catcorpse);
                    box.owt = weight(box);
                }
                mpickobj(mon, box);
            }
        }
        break;

    default:
        break;
    }

    // C ref: makemon.c:824 — soldier check (skips tail for most soldiers)
    if (mndx === PM_SOLDIER && rn2(13))
        return;

    // C ref: makemon.c:827-833 — tail section: defensive/misc items and gold
    // These rn2 checks always fire; the item creation only triggers when m_lev > result
    // At depth 1 (m_lev typically 0-1), the checks almost never pass
    const rollDef = rn2(50);
    if (m_lev > rollDef) {
        const otyp = rnd_defensive_item(mon, mndx, map);
        if (otyp) mongets(mon,otyp);
    }
    if (m_lev > rn2(100)) {
        const otyp = rnd_misc_item(mon);
        if (otyp) mongets(mon,otyp);
    }
    if ((ptr.mflags2 & M2_GREEDY) && !findgold(mon?.minvent) && !rn2(5)) {
        // C ref: mkmonmoney(mtmp, d(level_difficulty(), minvent ? 5 : 10))
        const moneyDie = (Array.isArray(mon?.minvent) && mon.minvent.length > 0) ? 5 : 10;
        const amount = c_d(Math.max(depth, 1), moneyDie);
        mkmonmoney(mon, amount);
    }
}

// ========================================================================
// ========================================================================
// set_mimic_sym — assign mimic appearance
// C ref: makemon.c:2386-2475
// For RNG alignment during level generation.
// During mklev, mimics are placed in ordinary rooms (OROOM), so we always
// take the default "else" branch: ROLL_FROM(syms) → rn2(17).
// ========================================================================

// MAXOCLASSES imported from objects.js

// C ref: makemon.c:2378 — syms[] array for mimic appearance
const mimic_syms = [
    MAXOCLASSES,  MAXOCLASSES,     RING_CLASS,   WAND_CLASS,   WEAPON_CLASS,
    FOOD_CLASS,   COIN_CLASS,      SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS,
    AMULET_CLASS, TOOL_CLASS,      ROCK_CLASS,   GEM_CLASS,    SPBOOK_CLASS,
    S_MIMIC_DEF,  S_MIMIC_DEF,
];

function is_placeholder_mndx(mndx) {
    return mndx === PM_ORC || mndx === PM_GIANT
        || mndx === PM_ELF || mndx === PM_HUMAN;
}

function polyok_for_newcham(ptr) {
    if (!ptr) return false;
    // C ref: mondata.h polyok(ptr) => ((ptr->mflags2 & M2_NOPOLY) == 0L)
    return ((ptr.mflags2 || 0) & M2_NOPOLY) === 0;
}
function accept_newcham_form(chamMndx, mndx) {
    if (!Number.isInteger(mndx) || mndx < LOW_PM || mndx >= SPECIAL_PM) return null;
    if (is_placeholder_mndx(mndx)) return null;
    const mdat = mons[mndx];
    if (!mdat) return null;
    // C ref: accept_newcham_form() allows mplayer forms even when !polyok.
    if (is_mplayer_idx(mndx)) return mdat;
    // C ref: allow only the monster's own natural shapeshifter form.
    if ((mdat.mflags2 & M2_SHAPESHIFTER) && mndx === chamMndx) return mdat;
    if (!polyok_for_newcham(mdat)) return null;
    return mdat;
}

let _animalList = null;
function pick_animal_newcham() {
    if (!_animalList) {
        _animalList = [];
        for (let i = LOW_PM; i < SPECIAL_PM; i++) {
            if (is_animal(mons[i])) _animalList.push(i);
        }
    }
    if (_animalList.length === 0) return -1;
    return _animalList[rn2(_animalList.length)];
}

function select_newcham_form(mon, chamMndx, map = null) {
    let mndx = -1;
    switch (chamMndx) {
    case PM_CHAMELEON:
        if (!rn2(3)) mndx = pick_animal_newcham();
        break;
    case PM_VLAD_THE_IMPALER:
    case PM_VAMPIRE_LEADER:
    case PM_VAMPIRE:
        mndx = pickvampshape(mon, chamMndx, map);
        break;
    default:
        break;
    }
    // C ref: select_newcham_form() random fallback: rn1(SPECIAL_PM - LOW_PM, LOW_PM)
    if (mndx === -1) {
        mndx = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
    }
    return mndx;
}

function is_vampshifter_mndx(mndx) {
    return mndx === PM_VAMPIRE || mndx === PM_VAMPIRE_LEADER || mndx === PM_VLAD_THE_IMPALER;
}

function is_pool_or_lava_for_mon(mon, map) {
    if (!mon || !map || typeof map.at !== 'function') return false;
    const loc = map.at(mon.mx, mon.my);
    if (!loc) return false;
    return !!(IS_POOL(loc.typ) || IS_LAVA(loc.typ));
}

// C ref: mon.c pickvampshape()
function pickvampshape(mon, chamMndx, map) {
    let mndx = chamMndx;
    let wolfchance = 10;
    const uppercase_only = !!(map?.flags?.is_rogue_lev || map?.flags?.is_rogue || map?.flags?.roguelike);
    switch (chamMndx) {
    case PM_VLAD_THE_IMPALER:
        // C keeps Vlad in base form if mon_has_special(mon). Not modeled in JS.
        wolfchance = 3;
        // fall through
    case PM_VAMPIRE_LEADER:
        if (!rn2(wolfchance) && !uppercase_only && !is_pool_or_lava_for_mon(mon, map)) {
            mndx = PM_WOLF;
            break;
        }
        // fall through
    case PM_VAMPIRE:
        mndx = (!rn2(4) && !uppercase_only) ? PM_FOG_CLOUD : PM_VAMPIRE_BAT;
        break;
    default:
        break;
    }
    // C also checks genocide and may revert with rn2(4) when in alternate form.
    if (mon && mon.mndx !== chamMndx && !rn2(4)) {
        return chamMndx;
    }
    return mndx;
}

function maybe_init_long_worm_after_newcham(mon, newMndx, map = null, player = null) {
    // C ref: mon.c newcham(): long worm gets new wormno and rn2(5)-sized tail.
    if (newMndx !== PM_LONG_WORM) return;
    const wormno = get_wormno();
    mon.wormno = wormno;
    if (!wormno) return;
    initworm(mon, rn2(5));
    place_worm_tail_randomly(mon, mon.mx, mon.my, map, player);
}

function maybe_usmellmon_after_newcham(mdat, newMndx) {
    if (!mdat) return null;

    // C ref: mon.c usmellmon() first switch by monster index.
    let nonspecific = false;
    switch (newMndx) {
    case PM_ROTHE:
    case PM_MINOTAUR:
        return 'You notice a bovine smell.';
    case PM_CAVE_DWELLER:
    case PM_BARBARIAN:
    case PM_NEANDERTHAL:
        return 'You smell body odor.';
    case PM_HORNED_DEVIL:
    case PM_BALROG:
    case PM_ASMODEUS:
    case PM_DISPATER:
    case PM_YEENOGHU:
    case PM_ORCUS:
        return null;
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREWOLF:
    case PM_WEREJACKAL:
    case PM_WERERAT:
    case PM_WEREWOLF:
    case PM_OWLBEAR:
        return "You detect an odor reminiscent of an animal's den.";
    case PM_STEAM_VORTEX:
        return 'You smell steam.';
    case PM_GREEN_SLIME:
        return 'Something stinks.';
    case PM_VIOLET_FUNGUS:
    case PM_SHRIEKER:
        return 'You smell mushrooms.';
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_JELLYFISH:
        return null;
    default:
        nonspecific = true;
        break;
    }

    if (!nonspecific) return null;

    // C ref: mon.c usmellmon() nonspecific mlet switch.
    switch (mdat.mlet) {
    case S_DOG:
        return 'You notice a dog smell.';
    case S_DRAGON:
        return 'You smell a dragon!';
    case S_FUNGUS:
        return 'Something smells moldy.';
    case S_UNICORN: {
        const a = (newMndx === PM_PONY) ? 'n' : ' strong';
        return `You detect a${a} odor reminiscent of a stable.`;
    }
    case S_ZOMBIE:
        return 'You smell rotting flesh.';
    case S_EEL:
        return 'You smell fish.';
    case S_ORC:
        return 'A foul stench makes you feel a little nauseated.';
    default:
        return null;
    }
}

function apply_newcham_from_base(mon, baseMndx, depth, map = null, player = null, fov = null, _display = null, _showMsg = false) {
    let target = null;
    let tryct = 20;
    do {
        const picked = select_newcham_form(mon, baseMndx, map);
        target = accept_newcham_form(baseMndx, picked);
        if (target) break;
    } while (--tryct > 0);
    if (!target) return false;

    const newMndx = mons.indexOf(target);
    if (newMndx < 0 || newMndx === baseMndx) return false;

    // C ref: mgender_from_permonst() -- RNG call for ungendered forms.
    if (!is_male(target) && !is_female(target) && !is_neuter(target)) {
        if (!rn2(10) && !(target.mlet === S_VAMPIRE || is_vampshifter_mndx(baseMndx))) {
            // female toggle omitted; RNG parity only.
        }
    }

    const { hp: newHp, m_lev: newLev } = newmonhp(newMndx, depth || 1);

    const symEntry = def_monsyms[target.mlet];
    mon.mndx = newMndx;
    mon.data = target;
    mon.type = target;
    mon.name = target.mname;
    mon.displayChar = symEntry ? symEntry.sym : '?';
    mon.displayColor = target.mcolor;
    mon.attacks = target.attacks;
    mon.mhp = newHp;
    mon.mhpmax = newHp;
    mon.m_lev = newLev;
    mon.m_lev = newLev;
    mon.mac = target.ac;
    // C ref: newcham() post-transform gear handling.
    mon_break_armor(mon, false, map, { visible: canseemon(mon, player, fov, map) });
    maybe_init_long_worm_after_newcham(mon, newMndx, map, player);
    return true;
}

// C ref: mon.c newcham() with specific target ptr — apply form change to a known target mndx.
// Used when the target form was already selected (e.g., pickvampshape was already called).
// Unlike apply_newcham_from_base, does NOT re-call select_newcham_form/pickvampshape.
function apply_newcham_direct(mon, targetMndx, depth, map = null, player = null, fov = null, _display = null, _showMsg = false) {
    const target = mons[targetMndx];
    if (!target) return false;

    const chamMndx = Number.isInteger(mon.cham) ? mon.cham : -1;

    // C ref: mgender_from_permonst() -- RNG call for ungendered forms.
    if (!is_male(target) && !is_female(target) && !is_neuter(target)) {
        if (!rn2(10) && !(target.mlet === S_VAMPIRE || is_vampshifter_mndx(chamMndx))) {
            // female toggle omitted; RNG parity only.
        }
    }

    const { hp: newHp, m_lev: newLev } = newmonhp(targetMndx, depth || 1);
    const symEntry = def_monsyms[target.mlet];
    mon.mndx = targetMndx;
    mon.data = target;
    mon.type = target;
    mon.name = target.mname;
    mon.displayChar = symEntry ? symEntry.sym : '?';
    mon.displayColor = target.mcolor;
    mon.attacks = target.attacks;
    mon.mhp = newHp;
    mon.mhpmax = newHp;
    mon.m_lev = newLev;
    mon.mac = target.ac;
    // C ref: newcham() post-transform gear handling.
    mon_break_armor(mon, false, map, { visible: canseemon(mon, player, fov, map) });
    maybe_init_long_worm_after_newcham(mon, targetMndx, map, player);
    return true;
}

function maybe_apply_newcham(mon, baseMndx, depth, map = null) {
    const basePtr = mons[baseMndx];
    if (!(basePtr.mflags2 & M2_SHAPESHIFTER)) return false;
    if (baseMndx === PM_VLAD_THE_IMPALER) return false;
    mon.cham = baseMndx;
    return apply_newcham_from_base(mon, baseMndx, depth, map, null, null, null, false);
}

// C ref: mon.c m_calcdistress() decide_to_shapeshift()
// Handles both regular shapechangers and vampshifters.
// player/fov optional: needed only to evaluate canseemon check after rn2 passes.
export async function runtimeDecideToShapeshift(mon, depth = 1, map = null, player = null, fov = null, display = null) {
    if (!mon || mon.dead) return false;
    const maybeEmitUsmell = async (changed) => {
        if (!changed) return false;
        if (!display || typeof display.putstr_message !== 'function') return true;
        if (canseemon(mon, player, fov, map)) return true;
        const msg = maybe_usmellmon_after_newcham(mon.type || mon.data, mon.mndx);
        if (msg) await display.putstr_message(msg);
        return true;
    };
    const chamMndx = Number.isInteger(mon.cham) ? mon.cham : -1;
    if (chamMndx < LOW_PM || chamMndx >= SPECIAL_PM) return false;

    if (!is_vampshifter_mndx(chamMndx)) {
        // Regular shapeshifter: rn2(6) to decide
        if (rn2(6) !== 0) return false;
        return await maybeEmitUsmell(apply_newcham_from_base(mon, chamMndx, depth, map, player, fov, display, true));
    }

    // Vampshifter — C ref: mon.c:4882 decide_to_shapeshift() vampshifter path
    const STRAT_WAITFORU = 0x20000000;
    if (mon.mstrategy & STRAT_WAITFORU) return false;

    const currentMlet = mons[mon.mndx]?.mlet;

    if (currentMlet !== S_VAMPIRE) {
        // Currently shifted to non-vampire form
        if (mon.mhp <= Math.floor((mon.mhpmax + 5) / 6)) {
            // C: low HP — consume rn2(4); if nonzero → shift back to base form
            if (!rn2(4)) return false;
            // Shift back to base vampire form directly (C: newcham with specific ptr)
            if (chamMndx >= LOW_PM && chamMndx < SPECIAL_PM)
                return await maybeEmitUsmell(apply_newcham_direct(mon, chamMndx, depth, map, player, fov, display, true));
        } else if (mon.mndx === PM_FOG_CLOUD && mon.mhp === mon.mhpmax) {
            // C: fog cloud at full HP — consume rn2(4); if zero AND unseen/far → new shape
            if (rn2(4) !== 0) return false;
            const seen = canseemon(mon, player, fov, map);
            const distSq = player ? dist2(player.x, player.y, mon.mx, mon.my) : 999;
            if (seen && distSq <= BOLT_LIM * BOLT_LIM) return false;
            // pickvampshape selects new form; use apply_newcham_direct to avoid double-calling
            const newMndx = pickvampshape(mon, chamMndx, map);
            if (newMndx < 0 || newMndx === mon.mndx) return false;
            return await maybeEmitUsmell(apply_newcham_direct(mon, newMndx, depth, map, player, fov, display, true));
        }
    } else {
        // Currently in vampire (base) form — maybe shift to alternate form
        if (mon.mhp >= Math.floor(9 * mon.mhpmax / 10)) {
            // C: high HP — consume rn2(6); if zero AND unseen/far → shift
            if (rn2(6) !== 0) return false;
            const seen = canseemon(mon, player, fov, map);
            const distSq = player ? dist2(player.x, player.y, mon.mx, mon.my) : 999;
            if (seen && distSq <= BOLT_LIM * BOLT_LIM) return false;
            return await maybeEmitUsmell(apply_newcham_from_base(mon, chamMndx, depth, map, player, fov, display, true));
        }
    }
    return false;
}

function set_mimic_sym(mndx, x, y, map, depth) {
    // C ref: makemon.c:2386-2540 — determine mimic appearance
    const loc = map?.at?.(x, y);
    const typ = loc?.typ;
    // C ref: makemon.c set_mimic_sym() early branches:
    // - mimic existing floor object (OBJ_AT)
    // - mimic door/wall/secret-corridor as furniture
    // Neither branch consumes RNG.
    if (typeof map?.floorObjectAt === 'function' && map.floorObjectAt(x, y)) {
        return 'object';
    }
    if (Number.isInteger(typ)
        && (IS_DOOR(typ) || IS_WALL(typ) || typ === SDOOR || typ === SCORR)) {
        return 'furniture';
    }
    // C ref: makemon.c set_mimic_sym() maze-level branch.
    // Excludes Mine Town and Sokoban; this path consumes rn2(2).
    const inMineTown = !!(map?.flags?.has_town);
    const inSokoban = Number.isInteger(map?._genDnum) && map._genDnum === 2;
    if (map?.flags?.is_maze_lev && !inMineTown && !inSokoban && rn2(2)) {
        return 'object';
    }

    // Look up room type at (x, y) from map
    let rt = 0;
    let roomno = -1;
    if (map && map.at) {
        if (loc && loc.roomno >= ROOMOFFSET) {
            roomno = loc.roomno - ROOMOFFSET;
            if (roomno >= 0 && roomno < map.rooms.length) {
                rt = map.rooms[roomno].rtype;
            }
        }
    }

    // C ref: set_mimic_sym() branch for out-of-room non-trap tiles.
    if (roomno < 0 && !(typeof map?.trapAt === 'function' && map.trapAt(x, y))) {
        return 'object';
    }
    // C ref: zoo/vault mimics become gold pieces (no RNG).
    if (rt === ZOO || rt === VAULT) {
        return 'object';
    }
    // C ref: Delphi alternates statue/fountain with rn2(2).
    if (rt === DELPHI) {
        if (rn2(2)) {
            return 'object';
        }
        return 'furniture';
    }
    // C ref: Temple mimics become altars (no RNG).
    if (rt === TEMPLE) {
        return 'furniture';
    }

    // Determine s_sym and possibly set appear directly
    let s_sym;
    let appear;

    if (rt >= SHOPBASE) {
        // C ref: makemon.c:2460-2479 — shop mimic appearance
        if (rn2(10) >= (depth || 1)) {
            s_sym = S_MIMIC_DEF;
            // fall through to assign_sym below
        } else {
            s_sym = get_shop_item(rt - SHOPBASE);
            if (s_sym < 0) {
                // Specific item type: appear = -s_sym (no goto assign_sym)
                appear = -s_sym;
            } else if (rt === SHOPBASE + 10 && s_sym > MAXOCLASSES) {
                // FODDERSHOP: health food store with VEGETARIAN_CLASS
                rn2(2); // C: rn2(2) ? LUMP_OF_ROYAL_JELLY : SLIME_MOLD
                return 'object'; // M_AP_OBJECT; no post-fixup RNG for these items
            } else {
                if (s_sym === 0 || s_sym >= MAXOCLASSES) // RANDOM_CLASS or VEGETARIAN
                    s_sym = mimic_syms[rn2(15) + 2]; // syms[rn2(SIZE(syms)-2)+2]
                // fall through to assign_sym below
            }
        }
    } else {
        // Default: ROLL_FROM(syms) = syms[rn2(17)]
        s_sym = mimic_syms[rn2(17)];
    }

    // assign_sym logic (only if appear not already set)
    if (appear === undefined) {
        if (s_sym === MAXOCLASSES) {
            // Furniture appearance: rn2(8) from furnsyms
            rn2(8);
            // No further RNG — furniture doesn't trigger corpsenm fixup
            return 'furniture'; // M_AP_FURNITURE
        } else if (s_sym === S_MIMIC_DEF) {
            appear = STRANGE_OBJECT;
        } else if (s_sym === COIN_CLASS) {
            appear = GOLD_PIECE;
        } else {
            // mkobj(s_sym, FALSE) — create a temp object to get its otyp
            // This consumes RNG for object selection + mksobj init.
            // C then calls obfree() to discard it.
            const obj = mkobj(s_sym, false);
            appear = obj ? obj.otyp : STRANGE_OBJECT;
        }
    }

    // Post-fixup: if appearance is STATUE/FIGURINE/CORPSE/EGG/TIN,
    // pick a monster type for corpsenm
    // C ref: makemon.c:2508-2518
    if (appear === STATUE || appear === FIGURINE
        || appear === CORPSE || appear === EGG || appear === TIN) {
        const rndmndx = rndmonnum();
        const nocorpse = (mons[rndmndx].geno & G_NOCORPSE) !== 0;
        if (appear === CORPSE && nocorpse) {
            // C: rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST) = rn1(13, 330)
            rn1(13, 330); // consumes 1 rn2(13) call
        }
        // For EGG with non-hatchable or TIN with nocorpse: mndx = NON_PM (no extra RNG)
    }
    return 'object'; // M_AP_OBJECT (default for non-furniture appearances)
}

// makemon -- main monster creation
// C ref: makemon.c:1148-1505
// Simplified for level generation PRNG alignment
// ========================================================================

// C ref: makemon.c makemon_rnd_goodpos() — find random valid position
// Tries up to 50 random positions using rn2(COLNO-3)+2, rn2(ROWNO).
// During mklev, cansee() is FALSE so it always checks goodpos.
// Simplified goodpos: SPACE_POS(typ) terrain, no monster already there.
function boulderBlocks(ptr, map, x, y) {
    if (!Array.isArray(map?.objects)) return false;
    const hasBoulder = map.objects.some(o => o && o.otyp === BOULDER && o.ox === x && o.oy === y);
    if (!hasBoulder) return false;
    return !ptr || ((ptr.mflags2 || 0) & M2_ROCKTHROW) === 0;
}

function eelDryPlacementFails(ptr, typ) {
    // C ref: teleport.c goodpos() eel clause:
    // else if (mdat->mlet == S_EEL && rn2(13) && !ignorewater) return FALSE;
    if (!ptr || ptr.mlet !== S_EEL) return false;
    if (IS_POOL(typ)) return false;
    return rn2(13) !== 0;
}

function closedDoorAt(map, x, y) {
    const loc = map?.at?.(x, y);
    return !!loc && IS_DOOR(loc.typ) && !!(loc.flags & (D_LOCKED | D_CLOSED));
}

function accessibleAt(map, x, y) {
    const loc = map?.at?.(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) && !closedDoorAt(map, x, y);
}

function mayPasswallAt(map, x, y) {
    const loc = map?.at?.(x, y);
    if (!loc) return false;
    // C ref: hack.c may_passwall() checks W_NONPASSWALL on stone walls.
    const wallInfo = Number(loc.wall_info ?? loc.flags ?? 0);
    return !IS_STWALL(loc.typ) || !(wallInfo & W_NONPASSWALL);
}

// C ref: teleport.c goodpos() subset used by makemon paths.
function makemonGoodpos(map, x, y, ptr, mmflags = NO_MM_FLAGS, avoidMonpos = true) {
    if (!isok(x, y)) return false;
    const loc = map?.at?.(x, y);
    if (!loc) return false;
    const ignoreWater = !!(mmflags & MM_IGNOREWATER);
    const ignoreLava = !!(mmflags & MM_IGNORELAVA);

    // C ref: teleport.c goodpos() rejects hero location unless GP_ALLOW_U.
    // makemon_rnd_goodpos() doesn't set GP_ALLOW_U, so keep hero tile invalid.
    const pctx = _getMakemonPlayerCtx();
    if (Number.isInteger(pctx?.x) && Number.isInteger(pctx?.y)
        && x === pctx.x && y === pctx.y) {
        return false;
    }

    if (avoidMonpos) {
        for (const m of map.monsters || []) {
            if (m.mx === x && m.my === y) return false;
        }
    }

    if (ptr) {
        if (IS_POOL(loc.typ) && !ignoreWater) {
            const f1 = ptr.mflags1 || 0;
            if (!(f1 & (M1_SWIM | M1_AMPHIBIOUS | M1_FLY))) return false;
        } else if (ptr.mlet === S_EEL && !ignoreWater && eelDryPlacementFails(ptr, loc.typ)) {
            return false;
        } else if (IS_LAVA(loc.typ) && !ignoreLava) {
            const f1 = ptr.mflags1 || 0;
            if (!(f1 & M1_FLY)) return false;
        }

        if ((ptr.mflags1 & M1_WALLWALK) && mayPasswallAt(map, x, y)) return true;
        if ((ptr.mflags1 & M1_AMORPHOUS) && closedDoorAt(map, x, y)) return true;
    }

    if (!accessibleAt(map, x, y)) {
        if (!(IS_POOL(loc.typ) && ignoreWater)
            && !(IS_LAVA(loc.typ) && ignoreLava)) return false;
    }
    if (boulderBlocks(ptr, map, x, y)) return false;
    return true;
}

// C ref: teleport.c enexto_core() — find nearby valid position
// Uses collect_coords() + Fisher-Yates shuffle per ring (radii 1-3),
// then scans for first position passing goodpos().
// Called by makemon for "byyou" placement (e.g., pet creation at hero pos).
function enexto_core(cx, cy, ptr, map, mmflags) {
    const allPositions = [];
    for (let radius = 1; radius <= 3; radius++) {
        const ringStart = allPositions.length;
        // C ref: teleport.c:671-690 — row-major: y outer loop, x inner loop
        const loy = cy - radius, hiy = cy + radius;
        const lox = cx - radius, hix = cx + radius;
        for (let y = Math.max(loy, 0); y <= Math.min(hiy, ROWNO - 1); y++) {
            for (let x = Math.max(lox, 1); x <= Math.min(hix, COLNO - 1); x++) {
                // Only ring boundary positions
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                if (isok(x, y)) allPositions.push({ x, y });
            }
        }
        // C ref: teleport.c:694-702 — Fisher-Yates from front
        let n = allPositions.length - ringStart;
        let passIdx = ringStart;
        while (n > 1) {
            const swap = rn2(n);
            if (swap) {
                const tmp = allPositions[passIdx];
                allPositions[passIdx] = allPositions[passIdx + swap];
                allPositions[passIdx + swap] = tmp;
            }
            passIdx++;
            n--;
        }
    }
    // Scan for first valid position
    for (const pos of allPositions) {
        if (makemonGoodpos(map, pos.x, pos.y, ptr, mmflags, true)) {
            return pos;
        }
    }
    return null;
}

function makemon_rnd_goodpos(map, ptr, mmflags = NO_MM_FLAGS) {
    const COLNO = 80, ROWNO = 21;
    let lastNx = 2;
    let lastNy = 0;
    for (let tryct = 0; tryct < 50; tryct++) {
        const nx = rn2(COLNO - 3) + 2; // rn1(COLNO-3, 2)
        const ny = rn2(ROWNO);
        lastNx = nx;
        lastNy = ny;
        // C ref: makemon.c makemon_rnd_goodpos()
        // good = (!in_mklev && cansee(nx,ny)) ? FALSE : goodpos(...)
        const pctx = _getMakemonPlayerCtx();
        if (!_getInMklev()
            && Number.isInteger(pctx?.x) && Number.isInteger(pctx?.y)
            && cansee(
                map,
                { x: pctx.x, y: pctx.y },
                getActiveFov(),
                nx,
                ny
            )) {
            continue;
        }
        if (makemonGoodpos(map, nx, ny, ptr, mmflags, true)) return { x: nx, y: ny };
    }
    // C ref: makemon.c makemon_rnd_goodpos() fallback scan order.
    // Uses offset-wrapped traversal over x:1..79, y:1..20 from last probe.
    const xofs = lastNx;
    const yofs = lastNy;
    for (let dx = 0; dx < COLNO; dx++) {
        for (let dy = 0; dy < ROWNO; dy++) {
            const nx = ((dx + xofs) % (COLNO - 1)) + 1;
            const ny = ((dy + yofs) % (ROWNO - 1)) + 1;
            if (makemonGoodpos(map, nx, ny, ptr, mmflags, true)) return { x: nx, y: ny };
        }
    }
    return null;
}

// C ref: teleport.c collect_coords() + enexto() for group placement.
function group_collect_coords(cx, cy, maxradius) {
    const COLNO = 80;
    const ROWNO = 21;
    const rowrange = (cy < Math.floor(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.floor(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    const k = Math.max(rowrange, colrange);
    const lim = maxradius ? Math.min(maxradius, k) : k;
    const result = [];

    for (let radius = 1; radius <= lim; radius++) {
        const ringStart = result.length;
        const lox = cx - radius;
        const hix = cx + radius;
        const loy = cy - radius;
        const hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                result.push({ x, y });
            }
        }
        let n = result.length - ringStart;
        let passIdx = ringStart;
        while (n > 1) {
            const swap = rn2(n);
            if (swap) {
                const tmp = result[passIdx];
                result[passIdx] = result[passIdx + swap];
                result[passIdx + swap] = tmp;
            }
            passIdx++;
            n--;
        }
    }
    return result;
}

function group_sp_goodpos(x, y, map) {
    const DOOR = 23;
    if (x < 0 || y < 0 || x >= 80 || y >= 21) return false;
    const loc = map.at(x, y);
    if (!loc || loc.typ <= DOOR) return false;
    for (const m of map.monsters || []) {
        if (m.mx === x && m.my === y) return false;
    }
    return true;
}

function group_enexto(cx, cy, map) {
    const nearCoords = group_collect_coords(cx, cy, 3);
    for (const cc of nearCoords) {
        if (group_sp_goodpos(cc.x, cc.y, map)) return cc;
    }
    const allCoords = group_collect_coords(cx, cy, 0);
    for (let i = nearCoords.length; i < allCoords.length; i++) {
        if (group_sp_goodpos(allCoords[i].x, allCoords[i].y, map)) return allCoords[i];
    }
    return null;
}

function randomMonGoodpos(ptr, x, y, map, mmflags = NO_MM_FLAGS) {
    if (!map || x === undefined || y === undefined) return true;
    return makemonGoodpos(map, x, y, ptr, mmflags, true);
}

function makemonVisibleToPlayer(mon, map) {
    const pctx = _getMakemonPlayerCtx();
    const ux = pctx?.x;
    const uy = pctx?.y;
    if (!Number.isInteger(ux) || !Number.isInteger(uy) || !map || !mon) return false;
    const player = map?.player || null;
    if (player) {
        if (sensemon(mon, player, map)) return true;
        return canseemon(mon, player, getActiveFov());
    }
    if (!cansee(map, { x: ux, y: uy }, getActiveFov(), mon.mx, mon.my)) return false;
    if (mon.mundetected) return false;
    if (mon.minvis) return false;
    return true;
}

export function makemon(ptr_or_null, x, y, mmflags, depth, map) {
    let mndx;
    let anymon = false;

    const DEBUG_MAKEMON = envFlag('WEBHACK_MAKEMON_TRACE');
    if (DEBUG_MAKEMON && depth >= 2) {
        console.log(`\nmakemon(${ptr_or_null === null ? 'null' : ptr_or_null}, ${x}, ${y}, ${mmflags}, depth=${depth})`);
    }

    let specifiedPtr = null;
    if (ptr_or_null !== null && ptr_or_null !== undefined) {
        if (typeof ptr_or_null === 'number') specifiedPtr = mons[ptr_or_null];
        else specifiedPtr = ptr_or_null;
    }

    // C ref: makemon.c:1169-1170 — no random monster generation on nomongen levels
    if (map?.flags?.nomongen && !specifiedPtr) {
        return null;
    }

    // C ref: makemon.c:1161 — allow_minvent flag
    const allow_minvent = !(mmflags & NO_MINVENT);

    // C ref: makemon.c:1160 — byyou: creating monster at hero position
    const pctx = _getMakemonPlayerCtx();
    const byyou = map && !_getInMklev()
        && Number.isInteger(pctx?.x) && Number.isInteger(pctx?.y)
        && x === pctx.x && y === pctx.y;

    // C ref: makemon.c:1173-1178 — random position finding for (0,0)
    // Happens before random monster selection when ptr is null.
    if (x === 0 && y === 0 && map) {
        const pos = makemon_rnd_goodpos(map, specifiedPtr, mmflags || NO_MM_FLAGS);
        if (pos) { x = pos.x; y = pos.y; }
        else return null;
    } else if (byyou && map) {
        // C ref: makemon.c:1181-1186 — enexto_core for byyou placement
        const pos = enexto_core(x, y, specifiedPtr, map, mmflags);
        if (!pos) return null;
        x = pos.x;
        y = pos.y;
    }

    // C ref: makemon.c:1196-1202 — if monster already at position, bail or find adjacent
    if (map && map.monsterAt(x, y)) {
        if (!(mmflags & MM_ADJACENTOK)) return null;
        const pos = enexto_core(x, y, specifiedPtr, map, mmflags);
        if (!pos) return null;
        x = pos.x;
        y = pos.y;
    }

    let ptr;
    if (ptr_or_null === null || ptr_or_null === undefined) {
        // C ref: makemon.c random monster path retries up to 50 times for
        // fixed coordinates until goodpos() accepts the chosen monster.
        anymon = true;
        let tryct = 0;
        do {
            mndx = rndmonst_adj(0, 0, depth || 1);
            if (mndx < 0) return null; // No valid monster found
            ptr = mons[mndx];
            const ok = randomMonGoodpos(ptr, x, y, map, mmflags || NO_MM_FLAGS);
            if (DEBUG_MAKEMON) {
                console.log(`[MAKEMON] rnd try=${tryct + 1} depth=${depth || 1} at=${x},${y} mndx=${mndx} name=${ptr?.mname || '?'} ok=${ok}`);
            }
            if (++tryct > 50 || ok) break;
        } while (true);
    } else if (typeof ptr_or_null === 'number') {
        mndx = ptr_or_null;
        ptr = mons[mndx];
    } else {
        mndx = mons.indexOf(ptr_or_null);
        ptr = mons[mndx];
    }

    if (mndx < 0 || mndx >= mons.length) return null;
    if (!ptr) return null;

    // C ref: makemon.c:1252 — mtmp->m_id = next_ident()
    // next_ident() returns counter value and consumes rnd(2)
    const m_id = next_ident();

    // C ref: makemon.c:1259 — newmonhp
    const { hp, m_lev } = newmonhp(mndx, depth || 1);

    // Gender assignment
    // C ref: makemon.c:1262-1281
    let monFemale = false;
    if (mmflags & MM_FEMALE) {
        monFemale = true;
    } else if (mmflags & MM_MALE) {
        monFemale = false;
    } else if (is_female(ptr)) {
        monFemale = true;
    } else if (is_male(ptr)) {
        monFemale = false;
    } else if (!is_neuter(ptr)) {
        monFemale = !!rn2(2); // random sex for gendered-but-unfixed forms
    }

    // C ref: makemon.c:1296 — peace_minded called BEFORE post-placement switch
    const monPeaceful = peace_minded(ptr);

    // C ref: makemon.c:1299-1310 — post-placement switch on mlet
    let mimicApType = null;
    let startsUndetected = false;
    if (ptr.mlet === S_MIMIC) {
        mimicApType = set_mimic_sym(mndx, x, y, map, depth);
    } else if ((ptr.mlet === S_SPIDER || ptr.mlet === S_SNAKE) && map) {
        // C ref: in_mklev && x && y → mkobj_at(RANDOM_CLASS, x, y, TRUE)
        // mkobj_at creates a random object, places it at (x,y), then hideunder (no RNG)
        if (_getInMklev() && x && y) {
            const hideObj = mkobj(0, true); // RANDOM_CLASS = 0, artif = true
            if (hideObj) {
                place_object(hideObj, x, y, map); // emits ^place event, matches C
            }
        }
        // C ref: makemon.c calls hideunder(); it may fail on non-pit traps
        // or with non-hideable floor object stacks.
        if (_getInMklev()) {
            const loc = map.at(x, y);
            startsUndetected = canHideUnderObjAt(map, x, y)
                && !IS_POOL(loc?.typ)
                && !IS_LAVA(loc?.typ);
        }
    } else if (ptr.mlet === S_EEL && map) {
        // C ref: makemon.c:1319-1322 — eels in mklev call hideunder() (no RNG).
        // Eels hide only in water and not on the Plane of Water.
        if (_getInMklev()) {
            const loc = map.at(x, y);
            startsUndetected = !!(IS_POOL(loc?.typ) && !map?.flags?.is_waterlevel);
        }
    }

    // C ref: makemon.c:1299-1340 switch(ptr->mlet), sleep-related cases.
    // Keep RNG consumption aligned with existing port order and apply sleep state
    // after monster object creation.
    const hasAmulet = playerHasAmulet(map);
    let startsSleeping = false;
    if (ptr.mlet === S_LEPRECHAUN) {
        startsSleeping = true;
    }
    if ((ptr.mlet === S_JABBERWOCK || ptr.mlet === S_NYMPH)
        && !hasAmulet && rn2(5)) {
        startsSleeping = true;
    }

    // C ref: makemon.c:1382-1386 -- in_mklev only.
    // During mklev and without Amulet, selected monsters may start asleep.
    if ((is_ndemon(ptr) || mndx === PM_WUMPUS
        || mndx === PM_LONG_WORM || mndx === PM_GIANT_EEL)
        && !hasAmulet && rn2(5)) {
        startsSleeping = true;
    }

    // C ref: makemon.c:1370-1371 — ghost naming via rndghostname()
    // rndghostname: rn2(7), and if nonzero, rn2(34) to pick from ghostnames
    // MM_NONAME suppresses naming (used by bones ghost creation).
    if (mndx === PM_GHOST && !(mmflags & MM_NONAME)) {
        if (rn2(7)) {
            rn2(34); // ROLL_FROM(ghostnames)
        }
    }

    // C ref: makemon.c mitem special-cases before m_initweap/m_initinv.
    // Needed for PRNG parity on special unique monsters (notably Croesus).
    let mitem = STRANGE_OBJECT;
    if (mndx === PM_CROESUS) {
        mitem = TWO_HANDED_SWORD;
    }

    // Build full monster object for gameplay.
    // C ref: makemon.c creates/places monster before group and inventory setup.
    const symEntry = def_monsyms[ptr.mlet];
    const mon = {
        mndx,
        m_id,
        data: ptr,
        type: ptr,
        name: ptr.mname,
        displayChar: symEntry ? symEntry.sym : '?',
        displayColor: ptr.mcolor,
        mx: x,
        my: y,
        mhp: hp,
        mhpmax: hp,
        mlevel: m_lev,
        m_lev,
        mac: ptr.ac,
        speed: ptr.mmove,
        movement: 0,  // C ref: *mtmp = cg.zeromonst (zero-init)
        attacks: ptr.mattk,
        peaceful: monPeaceful,
        mpeaceful: false,
        female: monFemale,
        tame: false,
        mflee: false,
        mfleetim: 0,
        confused: false,
        stunned: false,
        blind: false,
        sleeping: false,
        msleeping: 0,
        mundetected: startsUndetected ? 1 : 0,
        dead: false,
        passive: false,
        minvent: [],
        cham: null,
        mux: 0,
        muy: 0,
        mtrack: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}],
        mtrapseen: 0,
        mcanmove: 1,  // C ref: makemon.c:1293 — mtmp->mcansee = mtmp->mcanmove = 1
        mcansee: 1,
    };
    mon.mpeaceful = mon.peaceful;

    // C ref: makemon.c:1283-1291 — initial trap knowledge by branch/special role.
    const levelRef = map?.uz || map || null;
    const inSokoban = In_sokoban(levelRef);
    const inStronghold = Is_stronghold(levelRef);
    if (!mindless(ptr)) {
        if (inSokoban) {
            mon_learns_traps(mon, PIT);
            mon_learns_traps(mon, HOLE);
        }
        if (inStronghold) {
            mon_learns_traps(mon, TRAPDOOR);
        }
    }
    if (ptr.msound === MS_LEADER || ptr.msound === MS_NEMESIS) {
        mon_learns_traps(mon, ALL_TRAPS);
    }

    // C ref: makemon.c — MM_ASLEEP sets initial sleep state.
    if (mmflags & MM_ASLEEP) {
        mon.msleeping = 1;
        mon.sleeping = true;
    }
    if (startsSleeping) {
        mon.msleeping = 1;
        mon.sleeping = true;
    }

    // C ref: makemon.c:1396 — MM_EDOG: allocate edog structure
    if (mmflags & MM_EDOG) {
        mon.edog = {};
    }

    // C ref: makemon.c:2506 — mimics get appearance type from set_mimic_sym()
    if (mimicApType) {
        mon.m_ap_type = mimicApType;
    }

    // Add to map if provided
    if (map && x !== undefined && y !== undefined) {
        map.addMonster(mon);
    }

    // C ref: makemon.c shapechanger path (pm_to_cham/newcham).
    const allowMinvent = allow_minvent && !maybe_apply_newcham(mon, mndx, depth || 1, map || null);

    // C ref: makemon.c + light.c integration — monster light sources are
    // attached to the live monster pointer so do_light_sources() can follow movement.
    const monLightRange = emits_light(mon.data);
    if (monLightRange > 0) {
        new_light_source(mon.mx, mon.my, monLightRange, LS_MONSTER, mon);
    }

    // Group formation
    // C ref: makemon.c:1427-1435 — only for anymon (random monster)
    if (anymon && !(mmflags & MM_NOGRP)) {
        const initgrp = (n) => {
            const ulevel = getMakemonUlevel();
            let cnt = rnd(n);
            cnt = Math.floor(cnt / ((ulevel < 3) ? 4 : (ulevel < 5) ? 2 : 1));
            if (!cnt) cnt = 1;
            let gx = mon.mx;
            let gy = mon.my;
            while (cnt-- > 0) {
                if (peace_minded(mon.type)) continue;
                const cc = map ? group_enexto(gx, gy, map) : null;
                if (!cc) continue;
                gx = cc.x;
                gy = cc.y;
                const mate = makemon(mndx, gx, gy, mmflags | MM_NOGRP, depth, map);
                if (mate) {
                    mate.peaceful = false;
                    mate.mpeaceful = false;
                    mate.mavenge = 0;
                }
            }
        };

        if ((ptr.geno & G_SGROUP) && rn2(2)) {
            initgrp(3);
        } else if (ptr.geno & G_LGROUP) {
            if (rn2(3)) initgrp(10);
            else initgrp(3);
        }
    }

    // Weapon/inventory initialization
    // C ref: makemon.c:1380-1381 — mitem mongets, guarded by allow_minvent
    if (allowMinvent && mitem !== STRANGE_OBJECT) {
        mongets(mon,mitem);
    }
    // C ref: makemon.c:1438-1448 (guarded by allow_minvent)
    if (allowMinvent) {
        if (is_armed(ptr))
            m_initweap(mon, mndx, depth || 1);
        m_initinv(mon, mndx, depth || 1, m_lev, map);
        m_dowear(mon, true);

        // C evaluates !rn2(100) first (always consumed), then is_domestic
        if (!rn2(100) && is_domestic(ptr)) {
            mongets(mon,SADDLE);
        }
    }

    // C ref: makemon.c:1457-1463 — set mstrategy from mflags3 unless MM_NOWAIT.
    if ((ptr.mflags3 || 0) && !(mmflags & MM_NOWAIT)) {
        const STRAT_WAITFORU  = 0x20000000;
        const STRAT_CLOSE     = 0x10000000;
        const STRAT_APPEARMSG = 0x80000000;
        if (ptr.mflags3 & M3_WAITFORU) mon.mstrategy = (mon.mstrategy || 0) | STRAT_WAITFORU;
        if (ptr.mflags3 & M3_CLOSE)    mon.mstrategy = (mon.mstrategy || 0) | STRAT_CLOSE;
        if (ptr.mflags3 & (M3_WAITMASK | M3_COVETOUS)) mon.mstrategy = (mon.mstrategy || 0) | STRAT_APPEARMSG;
    }

    // C ref: makemon.c:1469-1498 — runtime appear message outside mklev.
    if (!_getInMklev()) {
        newsym(mon.mx, mon.my);
        if (!(mmflags & MM_NOMSG) && makemonVisibleToPlayer(mon, map)) {
            const exclaim = !(mmflags & MM_NOEXCLAM);
            const what = Amonnam(mon);
            const pctx = _getMakemonPlayerCtx();
            const ux = Number.isInteger(pctx?.x) ? pctx.x : null;
            const uy = Number.isInteger(pctx?.y) ? pctx.y : null;
            let suffix = '';
            if (ux != null && uy != null) {
                if (dist2(x, y, ux, uy) <= 2) suffix = ' next to you';
                else if (dist2(x, y, ux, uy) <= (BOLT_LIM * BOLT_LIM)) suffix = ' close by';
            }
            set_msg_xy(mon.mx, mon.my);
            void Norep('%s%s %s%s%s',
                what,
                exclaim ? ' suddenly' : '',
                vtense(what, 'appear'),
                suffix,
                exclaim ? '!' : '.');
        }
    }

    // C ref: event_log("makemon[%d@%d,%d]", mndx, mtmp->mx, mtmp->my)
    pushRngLogEntry(`^makemon[${mndx}@${mon?.mx ?? 0},${mon?.my ?? 0}]`);
    return mon;
}

// Autotranslated from makemon.c:57
export function wrong_elem_type(ptr, map) {
  if (ptr.mlet === S_ELEMENTAL) { return  !is_home_elemental(ptr); }
  else if (Is_earthlevel(map.uz)) {
  }
  else if (Is_waterlevel(map.uz)) { if (!is_swimmer(ptr)) return true; }
  else if (Is_firelevel(map.uz)) { if (!pm_resistance(ptr, MR_FIRE)) return true; }
  else if (Is_airlevel(map.uz)) {
    if (!(is_flyer(ptr) && ptr.mlet !== S_TRAPPER) && !is_floater(ptr) && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr)) return true;
  }
  return false;
}

// Autotranslated from makemon.c:80
export function m_initgrp(mtmp, x, y, n, mmflags, player) {
  let mm = {x, y}, cnt = rnd(n), mon;
  cnt = Math.floor(cnt / ((player.ulevel < 3) ? 4 : (player.ulevel < 5) ? 2 : 1));
  if (!cnt) cnt++;
  while (cnt--) {
    if (peace_minded(mtmp.data)) {
      continue;
    }
    if (enexto_gpflags( mm, mm.x, mm.y, mtmp.data, mmflags)) {
      mon = makemon(mtmp.data, mm.x, mm.y, (mmflags | MM_NOGRP));
      if (mon) {
        mon.mpeaceful = false;
        mon.mavenge = 0;
        set_malign(mon);
      }
    }
  }
}

// Autotranslated from makemon.c:987
export function monhp_per_lvl(mon) {
  let ptr = mon.data, hp = rnd(8);
  if (is_golem(ptr)) { hp = Math.floor(golemhp(monsndx(ptr)) /  ptr.mlevel); }
  else if (ptr.mlevel > 49) { hp = 4 + rnd(4); }
  else if (ptr.mlet === S_DRAGON && monsndx(ptr) >= PM_GRAY_DRAGON) { hp = 4 + rn2(5); }
  else if (!mon.m_lev) { hp = rnd(4); }
  return hp;
}

// C ref: makemon.c:1060 — init_mextra zeroes and sets mcorpsenm
export function init_mextra(mex) {
  if (mex) mex.mcorpsenm = NON_PM;
}

// C ref: makemon.c:1067 — allocate new mextra struct
export function newmextra() {
  const mextra = { mcorpsenm: NON_PM };
  return mextra;
}

// Autotranslated from makemon.c:1511
export function unmakemon(mon, mmflags, game) {
  let countbirth = ((mmflags & MM_NOCOUNTBIRTH) === 0);
  let mndx = monsndx(mon.data);
  if (countbirth && game.mvitals[mndx].born > 0 && game.mvitals[mndx].born < 255) {
    game.mvitals[mndx].born -= 1;
  }
  if ((mon.data.geno & G_UNIQ) !== 0) {
    game.mvitals[mndx].mvflags &= ~G_EXTINCT;
  }
  mon.mhp = 0;
  discard_minvent(mon, true);
  mongone(mon);
  return  0;
}

// Autotranslated from makemon.c:1553
export function create_critters(cnt, mptr, neverask, player) {
  let c = {x: 0, y: 0}, x, y, mon, known = false, ask = (wizard && !neverask);
  while (cnt--) {
    if (ask) {
      if (create_particular()) { known = true; continue; }
      else {
        ask = false;
      }
    }
    x = player.x, y = player.y;
    if (!mptr && player.uinwater && enexto( c, x, y, mons[PM_GIANT_EEL])) x = c.x, y = c.y;
    if ((mon = makemon(mptr, x, y, NO_MM_FLAGS)) == null) {
      continue;
    }
    if ((canseemon(mon, player, null, player?.map || null) && (M_AP_TYPE(mon) === M_AP_NOTHING || M_AP_TYPE(mon) === M_AP_MONSTER))
        || sensemon(mon, player, player?.map || null)) known = true;
  }
  return known;
}

// Autotranslated from makemon.c:1649
export function rndmonst() {
  return rndmonst_adj(0, 0);
}

// Autotranslated from makemon.c:2045
export async function grow_up(mtmp, victim, game) {
  let oldtype, newtype, max_increase, cur_increase, lev_limit, hp_threshold;
  let fem, ptr = mtmp.data;
  if (DEADMONSTER(mtmp)) return  0;
  oldtype = monsndx(ptr);
  newtype = (oldtype === PM_KILLER_BEE && !victim) ? PM_QUEEN_BEE : little_to_big(oldtype);
  if (victim) {
    hp_threshold = mtmp.m_lev * 8;
    if (!mtmp.m_lev) hp_threshold = 4;
    else if (is_golem(ptr)) hp_threshold = (Math.floor(mtmp.mhpmax / 10) + 1) * 10 - 1;
    else if (is_home_elemental(ptr)) {
      hp_threshold *= 3;
    }
    lev_limit = Math.floor(3 *  ptr.mlevel / 2);
    if (oldtype !== newtype && mons[newtype].mlevel > lev_limit) lev_limit =  mons[newtype].mlevel;
    max_increase = rnd( victim.m_lev + 1);
    if (mtmp.mhpmax + max_increase > hp_threshold + 1) max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
    cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
  }
  else {
    max_increase = cur_increase = rnd(8);
    hp_threshold = 0;
    lev_limit = 50;
  }
  mtmp.mhpmax += max_increase;
  mtmp.mhp += cur_increase;
  if (mtmp.mhpmax <= hp_threshold) return ptr;
  if (is_mplayer(ptr)) lev_limit = 30;
  else if (lev_limit < 5) lev_limit = 5;
  else if (lev_limit > 49) lev_limit = (ptr.mlevel > 49 ? 50 : 49);
  if ( ++mtmp.m_lev >= mons[newtype].mlevel && newtype !== oldtype) {
    ptr = mons[newtype];
    fem = is_male(ptr) ? 0 : is_female(ptr) ? 1 : mtmp.female;
    if (game.mvitals[newtype].mvflags & G_GENOD) {
      if (canspotmon(mtmp)) await pline("As %s grows up into %s, %s %s!", mon_nam(mtmp), an(pmname(ptr, Mgender(mtmp))), mhe(mtmp), nonliving(ptr) ? "expires" : "dies");
      set_mon_data(mtmp, ptr);
      mondied(mtmp);
      return  0;
    }
    else if (canspotmon(mtmp)) {
      let buf = `${(mtmp.female && !fem) ? "male " : (fem && !mtmp.female) ? "female " : ""}${pmname(ptr, fem)}`;
      await pline_mon(mtmp, "%s %s %s.", YMonnam(mtmp), (fem !== mtmp.female) ? "changes into" : humanoid(ptr) ? "becomes" : "grows up into", an(buf));
    }
    set_mon_data(mtmp, ptr);
    if (mtmp.cham === oldtype && is_shapeshifter(ptr)) mtmp.cham = newtype;
    newsym(mtmp.mx, mtmp.my);
    lev_limit =  mtmp.m_lev;
    mtmp.female = fem;
    if (mtmp.mleashed) update_inventory();
  }
  if ( mtmp.m_lev > lev_limit) {
    mtmp.m_lev--;
    if (mtmp.mhpmax === hp_threshold + 1) mtmp.mhpmax--;
  }
  if (mtmp.mhpmax > 50 * 8) mtmp.mhpmax = 50 * 8;
  if (mtmp.mhp > mtmp.mhpmax) mtmp.mhp = mtmp.mhpmax;
  return ptr;
}

// Autotranslated from makemon.c:2315
export function set_malign(mtmp, game, player) {
  let mal = mtmp.data.maligntyp, coaligned;
  if (mtmp.ispriest || mtmp.isminion) {
    if (mtmp.ispriest && EPRI(mtmp)) mal = EPRI(mtmp).shralign;
    else if (mtmp.isminion && EMIN(mtmp)) mal = EMIN(mtmp).min_align;
    if (mal !== A_NONE) {
      mal *= 5;
    }
  }
  coaligned = (sgn(mal) === sgn(player.ualigame.gn.type));
  if (mtmp.data.msound === MS_LEADER) { mtmp.malign = -20; }
  else if (mal === A_NONE) {
    if (mtmp.mpeaceful) mtmp.malign = 0;
    else {
      mtmp.malign = 20;
    }
  }
  else if (always_peaceful(mtmp.data)) {
    let absmal = Math.abs(mal);
    if (mtmp.mpeaceful) mtmp.malign = -3 * Math.max(5, absmal);
    else {
      mtmp.malign = 3 * Math.max(5, absmal);
    }
  }
  else if (always_hostile(mtmp.data)) {
    let absmal = Math.abs(mal);
    if (coaligned) mtmp.malign = 0;
    else {
      mtmp.malign = Math.max(5, absmal);
    }
  }
  else if (coaligned) {
    let absmal = Math.abs(mal);
    if (mtmp.mpeaceful) mtmp.malign = -3 * Math.max(3, absmal);
    else {
      mtmp.malign = Math.max(3, absmal);
    }
  }
  else {
    mtmp.malign = Math.abs(mal);
  }
}

// Autotranslated from makemon.c:2364
export function newmcorpsenm(mtmp) {
  if (!mtmp.mextra) mtmp.mextra = newmextra();
  mtmp.mextra.mcorpsenm = NON_PM;
}

// Autotranslated from makemon.c:2373
export function freemcorpsenm(mtmp) {
  if (has_mcorpsenm(mtmp)) mtmp.mextra.mcorpsenm = NON_PM;
}

// Autotranslated from makemon.c:2548
export function bagotricks(bag, tipping, seencount, player) {
  let moncount = 0;
  if (!bag || bag.otyp !== BAG_OF_TRICKS) { impossible("bad bag o' tricks"); }
  else if (bag.spe < 1) {
    pline1((tipping && bag.cknown) ? "It's empty." : nothing_happens);
    if (bag.dknown && objectData[bag.otyp].oc_name_known) { bag.cknown = 1; update_inventory(); }
  }
  else {
    let mtmp, creatcnt = 1, seecount = 0;
    consume_obj_charge(bag, !tipping);
    if (!rn2(23)) {
      creatcnt += rnd(7);
    }
    do {
      mtmp = makemon( 0, player.x, player.y, NO_MM_FLAGS);
      if (mtmp) {
        ++moncount;
        if ((canseemon(mtmp, player, null, player?.map || null) && (M_AP_TYPE(mtmp) === M_AP_NOTHING || M_AP_TYPE(mtmp) === M_AP_MONSTER))
            || sensemon(mtmp, player, player?.map || null)) ++seecount;
      }
    } while (--creatcnt > 0);
    if (seecount) {
      if (seencount) {
         seencount += seecount;
      }
      if (bag.dknown) { makeknown(BAG_OF_TRICKS); update_inventory(); }
    }
    else if (!tipping) {
      pline1(!moncount ? nothing_happens : nothing_seems_to_happen);
    }
  }
  return moncount;
}

// Autotranslated from makemon.c:2599
export function summon_furies(limit, player) {
  let i = 0;
  while (mk_gen_ok(PM_ERINYS, G_GONE, 0) && (i < limit || !limit)) {
    makemon(mons[PM_ERINYS], player.x, player.y, MM_ADJACENTOK | MM_NOWAIT);
    i++;
  }
}

// Autotranslated from makemon.c:838
export function clone_mon(mon, x, y, game, player) {
  let mm = {x: 0, y: 0}, m2;
  if (mon.mhp <= 1 || (game.mvitals[monsndx(mon.data)].mvflags & G_EXTINCT) !== 0) return null;
  if (x === 0) { mm.x = mon.mx; mm.y = mon.my; }
  else { mm.x = x; mm.y = y; }
  if (!isok(mm.x, mm.y)) {
    impossible("clone_mon trying to create a monster at <%d,%d>?", mm.x, mm.y);
    return null;
  }
  if (MON_AT(mm.x, mm.y)) {
    if (!enexto( mm, mm.x, mm.y, mon.data) || MON_AT(mm.x, mm.y)) return null;
  }
  // C: m2 = newmonst(); *m2 = *mon; (alloc + struct copy)
  // JS: Object.assign copies fields; skip newmonst() to avoid spurious RNG
  m2 = Object.assign({}, mon);
  m2.mextra = null;
  m2.nmon = fmon;
  fmon = m2;
  m2.m_id = next_ident();
  m2.mx = mm.x;
  m2.my = mm.y;
  m2.mundetected = 0;
  m2.mtrapped = 0;
  m2.mcloned = 1;
  m2.minvent =  null;
  m2.mleashed = 0;
  m2.mhpmax = mon.mhpmax;
  m2.mhp = Math.floor(mon.mhp / 2);
  mon.mhp -= m2.mhp;
  m2.isshk = 0;
  m2.isgd = 0;
  m2.ispriest = 0;
  mon_track_clear(m2);
  place_monster(m2, m2.mx, m2.my);
  if (emits_light(m2.data)) new_light_source(m2.mx, m2.my, emits_light(m2.data), LS_MONSTER, m2);
  if (has_mgivenname(mon)) { m2 = christen_monst(m2, MGIVENNAME(mon)); }
  else if (mon.isshk) { m2 = christen_monst(m2, shkname(mon)); }
  if (!game.svc.context.mon_moving && mon.mpeaceful) {
    if (mon.mtame) m2.mtame = rn2(Math.max(2 + player.uluck, 2)) ? mon.mtame : 0;
    else if (mon.mpeaceful) m2.mpeaceful = rn2(Math.max(2 + player.uluck, 2)) ? 1 : 0;
  }
  if (m2.isminion) {
    let atyp;
    newemin(m2);
    assert(has_emin(m2) && has_emin(mon));
     m2.mextra.emin = { ...mon.mextra.emin };
    atyp = m2.mextra.emin.min_align;
    m2.mextra.emin.renegade = (atyp !== player.ualign.type) ^ !m2.mpeaceful;
  }
  else if (m2.mtame) {
    m2.mtame = 0;
    // TODO: tamedog not yet ported to JS
    // if (tamedog(m2, 0, false)) { assert(has_edog(m2) && has_edog(mon)); EDOG(m2) = EDOG(mon); }
  }
  set_malign(m2);
  newsym(m2.mx, m2.my);
  return m2;
}
