// objnam.js -- Object naming: xname, doname, article handling, pluralization, wishing
// cf. objnam.c — Full port of naming functions from NetHack 3.7
//
// Many functions (xname, doname, makeplural, just_an, rnd_class, erosion_matters)
// have existing implementations in mkobj.js. This module re-exports those and adds
// all remaining naming functions from objnam.c.

import {
    objectData, bases, NUM_OBJECTS,
    WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
    FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK, ARM_SHIRT,
    GEMSTONE, MINERAL,
    CORPSE, SLIME_MOLD, STRANGE_OBJECT, STATUE,
    AMULET_OF_YENDOR, FAKE_AMULET_OF_YENDOR, GOLD_PIECE, BELL_OF_OPENING,
    SPE_NOVEL, SPE_BOOK_OF_THE_DEAD, POT_WATER,
    SHORT_SWORD, BROADSWORD, FLAIL, GLAIVE, LOCK_PICK, WOODEN_HARP,
    MAGIC_HARP, KNIFE, PLATE_MAIL, HELMET, LEATHER_GLOVES,
    FOOD_RATION, POT_BOOZE,
    CRYSKNIFE, SHIELD_OF_REFLECTION, ROBE, MUMMY_WRAPPING, ALCHEMY_SMOCK,
    FLINT, DILITHIUM_CRYSTAL, RUBY, DIAMOND, SAPPHIRE, BLACK_OPAL, EMERALD, OPAL,
    GRAY_DRAGON_SCALES, YELLOW_DRAGON_SCALES,
    GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL,
    SMALL_SHIELD,
    LARGE_BOX, CHEST, TOWEL, BAG_OF_HOLDING,
    ELVEN_LEATHER_HELM, FEDORA, CORNUTHAUM, DUNCE_CAP,
} from './objects.js';
import {
    mons, G_UNIQ,
    PM_HIGH_CLERIC, PM_LONG_WORM_TAIL, PM_WIZARD_OF_YENDOR,
} from './monsters.js';
import { type_is_pname } from './mondata.js';
import {
    xname as mkobj_xname, doname as mkobj_doname, erosion_matters as mkobj_erosion_matters,
    is_rustprone, is_corrodeable, is_flammable, is_crackable, is_rottable,
    Is_container, mksobj, mkobj, bless, curse, uncurse, weight,
} from './mkobj.js';
import { isObjectNameKnown } from './o_init.js';
import { discoverObject } from './o_init.js';
import { artiname, artifact_name, undiscovered_artifact } from './artifact.js';
import { ART_EYES_OF_THE_OVERWORLD, ART_ORB_OF_DETECTION } from './artifacts.js';
import {
    highc, lowc, upstart, s_suffix, letter, digit,
    strstri, fuzzymatch, ordin,
} from './hacklib.js';
import { shk_your } from './shk.js';
import { get_cost_of_shop_item } from './shk.js';
import { currency } from './invent.js';
import { rn2, rnd, rn1 } from './rng.js';
import {
    STONE, POOL, LAVAPOOL, WATER, AIR, CLOUD, ROOM, CORR, VWALL, HWALL, DOOR,
    FOUNTAIN, THRONE, SINK, ALTAR, GRAVE, TREE, IRONBARS, ICE, SDOOR, SCORR,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED, D_SECRET,
    W_NONDIGGABLE, W_NONPASSWALL,
    A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL, Align2amask,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE,
    M_AP_OBJECT,
} from './const.js';
import { maketrap, deltrap } from './dungeon.js';
import { make_grave, del_engr_at } from './engrave.js';
import { water_damage_chain, fire_damage_chain } from './trap.js';
import { recalc_block_point } from './vision.js';

// Wrappers around mkobj naming primitives so objnam owns the C-facing names.
export function xname(obj, opts = {}) {
    return mkobj_xname(obj, opts);
}

export function doname(obj, player) {
    return mkobj_doname(obj, player);
}

export function erosion_matters(obj) {
    return mkobj_erosion_matters(obj);
}

// ============================================================================
// Constants
// ============================================================================

const vowels = 'aeiou';
export const hands_obj = Object.freeze({ _hands_obj: true });

// cf. objnam.c GemStone macro
function GemStone(typ) {
    if (typ === FLINT) return true;
    const od = objectData[typ];
    return od && od.oc_material === GEMSTONE
        && typ !== DILITHIUM_CRYSTAL && typ !== RUBY && typ !== DIAMOND
        && typ !== SAPPHIRE && typ !== BLACK_OPAL && typ !== EMERALD
        && typ !== OPAL;
}

// Japanese item name table (cf. objnam.c Japanese_items[])
const Japanese_items = [
    { item: SHORT_SWORD, name: 'wakizashi' },
    { item: BROADSWORD, name: 'ninja-to' },
    { item: FLAIL, name: 'nunchaku' },
    { item: GLAIVE, name: 'naginata' },
    { item: LOCK_PICK, name: 'osaku' },
    { item: WOODEN_HARP, name: 'koto' },
    { item: MAGIC_HARP, name: 'magic koto' },
    { item: KNIFE, name: 'shito' },
    { item: PLATE_MAIL, name: 'tanko' },
    { item: HELMET, name: 'kabuto' },
    { item: LEATHER_GLOVES, name: 'yugake' },
    { item: FOOD_RATION, name: 'gunyoki' },
    { item: POT_BOOZE, name: 'sake' },
];

// ============================================================================
// Buffer management (no-ops in JS; we use string returns)
// cf. objnam.c:142-198
// ============================================================================

// cf. objnam.c:142 — nextobuf(): no-op in JS (strings are immutable/GC'd)
export function nextobuf() { return ''; }

// cf. objnam.c:150 — releaseobuf(): no-op in JS
export function releaseobuf(_bufp) {}

// cf. objnam.c:167 — maybereleaseobuf(): no-op in JS
export function maybereleaseobuf(_obuffer) {}

// cf. objnam.c:123 — strprepend(): just concatenation in JS
function strprepend(s, pref) { return pref + s; }

// ============================================================================
// obj_typename / simple_typename / safe_typename
// cf. objnam.c:201-330
// ============================================================================

// cf. objnam.c:338-350 — xcalled(): appends " called <name>" to buf
function xcalled(buf, un) {
    return buf + ' called ' + un;
}

// cf. objnam.c:201 — obj_typename(otyp): formal object type name
export function obj_typename(otyp) {
    const ocl = objectData[otyp];
    if (!ocl) return 'object?';
    let actualn = ocl.oc_name;
    const dn = ocl.oc_descr;
    const un = ocl.uname || null; // user-assigned name
    const nn = isObjectNameKnown(otyp);

    // generic items
    if (!actualn) actualn = 'object?';

    let buf = '';
    switch (ocl.oc_class) {
    case COIN_CLASS:
        return actualn; // "gold piece"
    case POTION_CLASS:
        buf = 'potion';
        break;
    case SCROLL_CLASS:
        buf = 'scroll';
        break;
    case WAND_CLASS:
        buf = 'wand';
        break;
    case SPBOOK_CLASS:
        if (otyp !== SPE_NOVEL) {
            buf = 'spellbook';
        } else {
            buf = !nn ? 'book' : 'novel';
            // suppress "of" below for novel when !nn
            if (!nn) {
                if (un) buf = xcalled(buf, un);
                if (dn) buf += ` (${dn})`;
                return buf;
            }
        }
        break;
    case RING_CLASS:
        buf = 'ring';
        break;
    case AMULET_CLASS:
        if (nn) buf = actualn;
        else buf = 'amulet';
        if (un) buf = xcalled(buf, un);
        if (dn) buf += ` (${dn})`;
        return buf;
    case ARMOR_CLASS:
        if ((ocl.oc_subtyp || 0) === ARM_GLOVES || (ocl.oc_subtyp || 0) === ARM_BOOTS)
            buf = 'pair of ';
        else if (otyp >= GRAY_DRAGON_SCALES && otyp <= YELLOW_DRAGON_SCALES)
            buf = 'set of ';
        // fall through to default
        if (nn) {
            buf += actualn;
            if (GemStone(otyp)) buf += ' stone';
            if (un) buf = xcalled(buf, un);
            if (dn) buf += ` (${dn})`;
        } else {
            buf += (dn || actualn);
            if (ocl.oc_class === GEM_CLASS)
                buf += (ocl.oc_material === MINERAL) ? ' stone' : ' gem';
            if (un) buf = xcalled(buf, un);
        }
        return buf;
    default:
        if (nn) {
            buf += actualn;
            if (GemStone(otyp)) buf += ' stone';
            if (un) buf = xcalled(buf, un);
            if (dn) buf += ` (${dn})`;
        } else {
            buf += (dn || actualn);
            if (ocl.oc_class === GEM_CLASS)
                buf += (ocl.oc_material === MINERAL) ? ' stone' : ' gem';
            if (un) buf = xcalled(buf, un);
        }
        return buf;
    }
    // here for ring/scroll/potion/wand/spellbook
    if (nn) {
        if (ocl.unique) buf = actualn;
        else buf += ' of ' + actualn;
    }
    if (un) buf = xcalled(buf, un);
    if (dn) buf += ` (${dn})`;
    return buf;
}

// cf. objnam.c:298 — simple_typename(otyp): concise type name (no user name, no description)
export function simple_typename(otyp) {
    // Temporarily suppress user name and strip description
    let buf = obj_typename(otyp);
    // Strip " called <name>" part
    const calledIdx = buf.indexOf(' called ');
    if (calledIdx >= 0) {
        const parenIdx = buf.indexOf(' (', calledIdx);
        if (parenIdx >= 0) {
            buf = buf.slice(0, calledIdx) + buf.slice(parenIdx);
        } else {
            buf = buf.slice(0, calledIdx);
        }
    }
    // Strip appended description "(foo)"
    const pp = buf.indexOf(' (');
    if (pp >= 0) buf = buf.slice(0, pp);
    return buf;
}

// cf. objnam.c:312 — safe_typename(otyp): type name with sanity check
export function safe_typename(otyp) {
    if (otyp < STRANGE_OBJECT || otyp >= NUM_OBJECTS || !objectData[otyp]?.oc_name) {
        return `glorkum[${otyp}]`;
    }
    // Force fully-discovered view: use the actual name directly
    const ocl = objectData[otyp];
    const actualn = ocl.oc_name || 'object?';
    // Build the simple typename as if oc_name_known were true
    switch (ocl.oc_class) {
    case COIN_CLASS: return actualn;
    case POTION_CLASS: return `potion of ${actualn}`;
    case SCROLL_CLASS: return `scroll of ${actualn}`;
    case WAND_CLASS: return `wand of ${actualn}`;
    case SPBOOK_CLASS:
        if (otyp === SPE_NOVEL) return 'novel';
        if (ocl.unique) return actualn;
        return `spellbook of ${actualn}`;
    case RING_CLASS: return `ring of ${actualn}`;
    case AMULET_CLASS: return actualn;
    case ARMOR_CLASS: {
        let prefix = '';
        if ((ocl.oc_subtyp || 0) === ARM_GLOVES || (ocl.oc_subtyp || 0) === ARM_BOOTS)
            prefix = 'pair of ';
        else if (otyp >= GRAY_DRAGON_SCALES && otyp <= YELLOW_DRAGON_SCALES)
            prefix = 'set of ';
        return prefix + actualn + (GemStone(otyp) ? ' stone' : '');
    }
    default: {
        let name = actualn;
        if (GemStone(otyp)) name += ' stone';
        if (ocl.oc_class === GEM_CLASS && !isObjectNameKnown(otyp))
            name += (ocl.oc_material === MINERAL) ? ' stone' : ' gem';
        return name;
    }
    }
}

// ============================================================================
// obj_is_pname
// cf. objnam.c:333
// ============================================================================

// cf. objnam.c:333 — obj_is_pname(obj): does object have an artifact personal name?
export function obj_is_pname(obj) {
    if (!obj.oartifact || !obj.oname) return false;
    if (not_fully_identified(obj)) return false;
    return true;
}

// ============================================================================
// Fruit functions
// cf. objnam.c:431-574
// ============================================================================

let fruitCounter = 1;
const fruitById = new Map();
const fruitByName = new Map();

// cf. objnam.c:431 — fruit_from_indx(indx): lookup custom fruit by index
export function fruit_from_indx(indx) {
    if (!Number.isInteger(indx) || indx <= 0) return null;
    return fruitById.get(indx) || null;
}

// cf. objnam.c:443 — fruit_from_name(name): lookup/create custom fruit by name
export function fruit_from_name(name, create = true) {
    if (typeof name !== 'string') return 0;
    const key = name.trim().toLowerCase();
    if (!key) return 0;
    const existing = fruitByName.get(key);
    if (existing) return existing;
    if (!create) return 0;
    const idx = fruitCounter++;
    fruitByName.set(key, idx);
    fruitById.set(idx, name.trim());
    return idx;
}

// cf. objnam.c:414 — fruitname(juice): stringify fruit by index
export function fruitname(juice) {
    const fromList = fruit_from_indx(juice);
    return fromList || 'slime mold';
}

// cf. objnam.c:523 — reorder_fruit(forward): sort fruit list by index
export function reorder_fruit(forward) {
    const ordered = [...fruitById.entries()]
        .sort((a, b) => (forward ? a[0] - b[0] : b[0] - a[0]));
    fruitById.clear();
    for (const [idx, name] of ordered) fruitById.set(idx, name);
}

// cf. objnam.c:347 — distant_name(obj, func): naming without side effects
export async function distant_name(obj, func = xname) {
    if (!obj) return '';
    if (typeof func !== 'function') return xname(obj);
    return await func(obj);
}

// cf. objnam.c:2000 — short_oname(obj): short object name
export function short_oname(obj) {
    if (!obj) return '';
    return obj.oname || minimal_xname(obj);
}

// cf. objnam.c:5614 — safe_qbuf(): bounded prompt assembly
export function safe_qbuf(prefix, suffix, thing, otherthing, limit = 80) {
    const p = prefix || '';
    const s = suffix || '';
    const t = thing || '';
    const o = otherthing || '';
    const primary = `${p}${t}${s}`;
    if (primary.length <= limit) return primary;
    const fallback = `${p}${o}${s}`;
    if (fallback.length <= limit) return fallback;
    return fallback.slice(0, Math.max(0, limit));
}

// cf. objnam.c:3910 — dbterrainmesg(typ): describe terrain wishes
export function dbterrainmesg(typ) {
    switch (typ) {
    case STONE: return 'stone';
    case POOL:
    case WATER: return 'water';
    case LAVAPOOL: return 'lava';
    case AIR: return 'air';
    case CLOUD: return 'cloud';
    case ROOM: return 'room';
    case CORR: return 'corridor';
    case VWALL:
    case HWALL: return 'wall';
    case DOOR: return 'door';
    default: return 'terrain';
    }
}

// cf. objnam.c:3529 — set_wallprop_from_str(str)
export function set_wallprop_from_str(str) {
    if (typeof str !== 'string') return null;
    const s = str.trim().toLowerCase();
    if (!s) return null;
    if (s === 'nondiggable' || s === 'non-diggable') return 'nondiggable';
    if (s === 'nonpasswall' || s === 'non-passwall' || s === 'non passwall')
        return 'nonpasswall';
    return null;
}

// cf. objnam.c:3544 — wizterrainwish(): wizard terrain wish parser
export function wizterrainwish(ctx) {
    const text = String(ctx?.text || '').trim().toLowerCase();
    if (!text) return null;

    // Parse wizard terrain wish intent. Full map mutation wiring remains
    // outside this helper, but this no longer hard-noops.
    const result = { kind: 'terrainwish', text, terrain: null, wallprops: [] };
    if (text.includes('nondiggable') || text.includes('non-diggable')) {
        result.wallprops.push('nondiggable');
    }
    if (text.includes('nonpasswall') || text.includes('non-passwall') || text.includes('non passwall')) {
        result.wallprops.push('nonpasswall');
    }

    const endsWith = (s) => text.endsWith(s);
    if (endsWith('fountain')) result.terrain = 'fountain';
    else if (endsWith('throne')) result.terrain = 'throne';
    else if (endsWith('sink')) result.terrain = 'sink';
    else if (endsWith('pool') || endsWith('moat') || endsWith('wall of water')) result.terrain = 'water';
    else if (endsWith('lava') || endsWith('wall of lava')) result.terrain = 'lava';
    else if (endsWith('ice')) result.terrain = 'ice';
    else if (endsWith('altar')) result.terrain = 'altar';
    else if (endsWith('grave') || endsWith('headstone')) result.terrain = 'grave';
    else if (endsWith('tree')) result.terrain = 'tree';
    else if (endsWith('bars')) result.terrain = 'iron bars';
    else if (endsWith('cloud')) result.terrain = 'cloud';
    else if (endsWith('door') || endsWith('doorway') || endsWith('secret door')) result.terrain = 'door';
    else if (endsWith('wall')) result.terrain = 'wall';
    else if (endsWith('secret corridor')) result.terrain = 'secret corridor';
    else if (endsWith('room') || endsWith('floor') || endsWith('ground')) result.terrain = 'room';

    const trapWishes = [
        ['arrow trap', ARROW_TRAP],
        ['dart trap', DART_TRAP],
        ['rock trap', ROCKTRAP],
        ['squeaky board', SQKY_BOARD],
        ['squeakyboard', SQKY_BOARD],
        ['bear trap', BEAR_TRAP],
        ['land mine', LANDMINE],
        ['landmine', LANDMINE],
        ['rolling boulder trap', ROLLING_BOULDER_TRAP],
        ['sleep gas trap', SLP_GAS_TRAP],
        ['rust trap', RUST_TRAP],
        ['fire trap', FIRE_TRAP],
        ['pit', PIT],
        ['spiked pit', SPIKED_PIT],
        ['hole', HOLE],
        ['trap door', TRAPDOOR],
        ['trapdoor', TRAPDOOR],
        ['teleport trap', TELEP_TRAP],
        ['level teleport trap', LEVEL_TELEP],
        ['magic portal', MAGIC_PORTAL],
        ['web', WEB],
        ['statue trap', STATUE_TRAP],
        ['magic trap', MAGIC_TRAP],
        ['anti magic trap', ANTI_MAGIC],
        ['anti-magic trap', ANTI_MAGIC],
        ['polymorph trap', POLY_TRAP],
        ['vibrating square', VIBRATING_SQUARE],
    ];
    for (const [name, ttyp] of trapWishes) {
        if (text === name || text.startsWith(`${name} `) || text.endsWith(` ${name}`)) {
            result.trap = ttyp;
            break;
        }
    }

    if (!result.terrain && !result.trap) return null;

    const map = ctx?.map || ctx?.player?.map || null;
    const player = ctx?.player || null;
    const x = Number.isInteger(ctx?.x) ? ctx.x : (player?.x ?? player?.ux);
    const y = Number.isInteger(ctx?.y) ? ctx.y : (player?.y ?? player?.uy);
    if (!map || !Number.isInteger(x) || !Number.isInteger(y) || !map.at) {
        return result;
    }
    const loc = map.at(x, y);
    if (!loc) return result;

    const oldtyp = loc.typ;
    const hadFountain = oldtyp === FOUNTAIN;
    const hadSink = oldtyp === SINK;

    const setWallProps = () => {
        if (result.wallprops.includes('nondiggable')) {
            loc.wall_info = (Number(loc.wall_info || 0) | W_NONDIGGABLE);
            loc.nondiggable = true; // compatibility mirror
        }
        if (result.wallprops.includes('nonpasswall')) {
            loc.wall_info = (Number(loc.wall_info || 0) | W_NONPASSWALL);
            loc.nonpasswall = true; // compatibility mirror
        }
    };

    if (result.trap) {
        const t = maketrap(map, x, y, result.trap);
        result.applied = !!t;
        result.kind = 'trapwish';
        return result;
    }

    if (result.terrain === 'fountain') {
        loc.typ = FOUNTAIN;
    } else if (result.terrain === 'throne') {
        loc.typ = THRONE;
    } else if (result.terrain === 'sink') {
        loc.typ = SINK;
    } else if (result.terrain === 'water') {
        loc.typ = POOL;
        del_engr_at(map, x, y);
        if (typeof map.objectsAt === 'function') water_damage_chain(map.objectsAt(x, y), true);
    } else if (result.terrain === 'lava') {
        loc.typ = LAVAPOOL;
        del_engr_at(map, x, y);
        if (typeof map.objectsAt === 'function') fire_damage_chain(map.objectsAt(x, y), true, true, x, y);
    } else if (result.terrain === 'ice') {
        loc.typ = ICE;
        del_engr_at(map, x, y);
    } else if (result.terrain === 'altar') {
        loc.typ = ALTAR;
        let al = A_NEUTRAL;
        if (text.includes('chaotic')) al = A_CHAOTIC;
        else if (text.includes('lawful')) al = A_LAWFUL;
        else if (text.includes('unaligned')) al = A_NONE;
        loc.flags = Align2amask(al);
    } else if (result.terrain === 'grave') {
        // C ref: objnam.c create_terrain_at() passes NULL text to make_grave().
        make_grave(map, x, y, null);
        loc.disturbed = text.includes('disturbed') || text.includes('looted');
    } else if (result.terrain === 'tree') {
        loc.typ = TREE;
        setWallProps();
    } else if (result.terrain === 'iron bars') {
        loc.typ = IRONBARS;
        setWallProps();
    } else if (result.terrain === 'cloud') {
        loc.typ = CLOUD;
        del_engr_at(map, x, y);
    } else if (result.terrain === 'door') {
        const secret = text.includes('secret door');
        let mask = D_CLOSED;
        if (text.includes('doorless') || text.includes('doorway')) mask = D_NODOOR;
        else if (text.includes('broken')) mask = D_BROKEN;
        else if (text.includes('open')) mask = D_ISOPEN;
        else if (text.includes('locked')) mask = D_LOCKED;
        else if (text.includes('closed')) mask = D_CLOSED;
        if (text.includes('trapped') && !text.includes('untrapped')
            && (mask === D_LOCKED || mask === D_CLOSED || secret)) {
            mask |= D_TRAPPED;
        }
        loc.typ = secret ? SDOOR : DOOR;
        loc.flags = mask;
        if (secret) loc.flags |= D_SECRET;
    } else if (result.terrain === 'wall') {
        loc.typ = HWALL;
        setWallProps();
    } else if (result.terrain === 'secret corridor') {
        loc.typ = SCORR;
    } else if (result.terrain === 'room') {
        loc.typ = ROOM;
        const t = typeof map.trapAt === 'function' ? map.trapAt(x, y) : null;
        if (t && t.ttyp !== MAGIC_PORTAL) deltrap(map, t);
    }

    // Keep fountain/sink counters approximately in sync.
    if (map.flags) {
        if (hadFountain && loc.typ !== FOUNTAIN) {
            map.flags.nfountains = Math.max(0, (map.flags.nfountains || 0) - 1);
        } else if (!hadFountain && loc.typ === FOUNTAIN) {
            map.flags.nfountains = (map.flags.nfountains || 0) + 1;
        }
        if (hadSink && loc.typ !== SINK) {
            map.flags.nsinks = Math.max(0, (map.flags.nsinks || 0) - 1);
        } else if (!hadSink && loc.typ === SINK) {
            map.flags.nsinks = (map.flags.nsinks || 0) + 1;
        }
    }

    recalc_block_point(x, y);
    result.applied = true;
    return result;
}

// cf. objnam.c:575/581 — xname_flags wrapper
export function xname_flags(obj, flags = 0) {
    if (obj == null) return '';
    // Support either numeric bitmask-like usage or direct option object.
    if (typeof flags === 'object' && flags !== null) return xname(obj, flags);
    const singular = !!(flags & 1);
    return xname(obj, singular ? { singular: true } : {});
}

// cf. objnam.c:1223 — doname_base wrapper
export function doname_base(obj, player) {
    return doname(obj, player);
}

// cf. objnam.c:1745 — doname wrapper exists, expose symbol for codematch scanner
export function add_erosion_words(buf, obj) {
    if (!obj || !erosion_matters(obj)) return buf || '';
    const prefix = [];
    if (obj.oeroded2 > 0) prefix.push(is_corrodeable(obj) ? 'corroded' : 'rotted');
    if (obj.oeroded > 0) prefix.push(is_rustprone(obj) ? 'rusty' : (is_flammable(obj) ? 'burnt' : 'eroded'));
    return prefix.length ? `${prefix.join(' ')} ${buf || ''}`.trim() : (buf || '');
}

// ============================================================================
// the_unique_obj / the_unique_pm
// cf. objnam.c:1106-1140
// ============================================================================

// cf. objnam.c:1106 — the_unique_obj(obj): should use "the" for this object?
export function the_unique_obj(obj) {
    const known = !!obj.known;
    if (!obj.dknown) return false;
    if (obj.otyp === FAKE_AMULET_OF_YENDOR && !known) return true; // lie
    return !!(objectData[obj.otyp]?.unique
              && (known || obj.otyp === AMULET_OF_YENDOR));
}

// cf. objnam.c:1121 — the_unique_pm(ptr): should use "the" for this monster type?
export function the_unique_pm(ptr) {
    if (type_is_pname(ptr)) return false;
    let uniq = !!(ptr.geno & G_UNIQ);
    if (ptr === mons[PM_HIGH_CLERIC] || ptr === mons[PM_LONG_WORM_TAIL])
        uniq = false;
    if (ptr === mons[PM_WIZARD_OF_YENDOR])
        uniq = true;
    return uniq;
}

// ============================================================================
// mshot_xname
// cf. objnam.c:1090
// ============================================================================

// cf. objnam.c:1090 — mshot_xname(obj): object name with multishot info
export function mshot_xname(obj) {
    if (!obj) return '';
    const onm = xname(obj);
    const shot = obj._m_shot || obj.m_shot || null;
    if (shot && shot.n > 1 && shot.o === obj.otyp && shot.i > 0) {
        return strprepend(onm, `the ${shot.i}${ordin(shot.i)} `);
    }
    return onm;
}

// ============================================================================
// not_fully_identified
// cf. objnam.c:1778
// ============================================================================

// C ref: obj.h is_wet_towel(o) — towel with wetness
export function is_wet_towel(obj) {
    return obj && obj.otyp === TOWEL && (obj.spe || 0) > 0;
}

export function is_weptool(obj) {
    return obj.oclass === TOOL_CLASS && (objectData[obj.otyp]?.oc_subtyp || 0) !== 0;
}

function is_damageable(obj) {
    const mat = objectData[obj.otyp]?.oc_material;
    if (!mat) return false;
    // is_rustprone || is_flammable || is_rottable || is_corrodeable
    return is_rustprone(obj) || is_flammable(obj) || is_rottable(obj) || is_corrodeable(obj);
}

// cf. objnam.c:1778 — not_fully_identified(otmp): needs more identification?
export function not_fully_identified(otmp) {
    if (otmp.oclass === COIN_CLASS) return false;
    if (!otmp.known || !otmp.dknown || !otmp.bknown
        || !isObjectNameKnown(otmp.otyp))
        return true;
    if ((!otmp.cknown && (Is_container(otmp) || otmp.otyp === STATUE))
        || (!otmp.lknown && Is_box(otmp)))
        return true;
    if (otmp.oartifact && undiscovered_artifact(otmp.oartifact))
        return true;
    if (otmp.rknown
        || (otmp.oclass !== ARMOR_CLASS && otmp.oclass !== WEAPON_CLASS
            && !is_weptool(otmp) && otmp.oclass !== BALL_CLASS))
        return false;
    return is_damageable(otmp);
}

// C ref: obj.h Has_contents(o) — container with objects inside
export function Has_contents(obj) {
    return obj && obj.cobj != null && (Array.isArray(obj.cobj) ? obj.cobj.length > 0 : !!obj.cobj);
}

export function Is_box(obj) {
    const otyp = obj.otyp;
    return otyp === LARGE_BOX || otyp === CHEST;
}

// C ref: obj.h Is_mbag(o) — magical bag (bag of holding)
export function Is_mbag(obj) {
    return obj && obj.otyp === BAG_OF_HOLDING;
}

// ============================================================================
// is_plural
// cf. obj.h is_plural macro
// ============================================================================

export function is_plural(obj) {
    return (obj.quan || 1) !== 1
        || (obj.oartifact === ART_EYES_OF_THE_OVERWORLD
            && !undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD));
}

// ============================================================================
// doname_with_price / doname_vague_quan / Doname2
// cf. objnam.c:1752-1774, 2293
// ============================================================================

// cf. objnam.c:1752 — doname_with_price(obj): name with shop price appended
export function doname_with_price(obj, player) {
    if (!obj) return '';
    const base = doname(obj, player);

    let label = '';
    let cost = 0;
    if (obj.unpaid) {
        const explicit = Number(obj.unpaidCost || 0);
        if (explicit > 0) {
            cost = explicit;
            label = 'unpaid';
        } else {
            const unit = Number(obj.price || 0);
            if (unit > 0) {
                cost = unit * (obj.quan || 1);
                label = 'unpaid';
            }
        }
    }

    if (!(cost > 0)) {
        const map = player?.map || null;
        if (player && map) {
            const quote = get_cost_of_shop_item(obj, map, player);
            if (quote && quote.cost > 0) {
                cost = quote.cost;
                label = quote.nochrg ? 'contents' : 'for sale';
            }
        }
    }

    if (!(cost > 0) || !label) return base;
    return `${base} (${label}, ${cost} ${currency(cost)})`;
}

// cf. objnam.c:1759 — doname_vague_quan(obj): "some" for unknown quantity
export function doname_vague_quan(obj, player) {
    if (!obj) return '';
    const quan = obj.quan || 1;
    if (quan <= 1 || obj.dknown) return doname(obj, player);

    // Farlook-style behavior: if quantity isn't known, use "some".
    const pluralName = xname({ ...obj, quan: Math.max(2, quan) }, {
        known: !!obj.known,
        dknown: !!obj.dknown || !!obj.known,
        bknown: !!obj.bknown,
    });
    return `some ${pluralName}`;
}

// cf. objnam.c:2293 — Doname2(obj): capitalized doname
export function Doname2(obj, player) {
    const s = doname(obj, player);
    return s ? highc(s[0]) + s.slice(1) : '';
}

// ============================================================================
// cxname / cxname_singular / corpse_xname / killer_xname
// cf. objnam.c:1815-1996
// ============================================================================

// cf. objnam.c:1815 — corpse_xname(): format corpse name with monster type
export function corpse_xname(otmp, adjective, { singular: ignorequan = false, noPfx = false, thePrefix = false, article: anyPrefix = false } = {}) {
    const omndx = otmp.corpsenm;
    let possessive = false;
    let glob = (otmp.otyp !== CORPSE && !!otmp.globby);
    let mnam;
    let no_prefix = noPfx;
    let the_prefix = thePrefix;
    let any_prefix = anyPrefix;

    if (glob) {
        mnam = objectData[otmp.otyp]?.oc_name || 'glob'; // "glob of <monster>"
    } else if (omndx == null || omndx < 0 || !mons[omndx]) {
        mnam = 'thing';
    } else {
        mnam = mons[omndx].mname;
        if (the_unique_pm(mons[omndx]) || type_is_pname(mons[omndx])) {
            mnam = s_suffix(mnam);
            possessive = true;
            if (type_is_pname(mons[omndx])) no_prefix = true;
            else if (the_unique_pm(mons[omndx]) && !no_prefix) the_prefix = true;
        }
    }
    if (no_prefix) the_prefix = any_prefix = false;
    else if (the_prefix) any_prefix = false;

    let nambuf = '';
    if (the_prefix) nambuf = 'the ';

    if (!adjective) {
        nambuf += mnam;
    } else {
        if (possessive) nambuf += `${mnam} ${adjective}`;
        else nambuf += `${adjective} ${mnam}`;
        nambuf = nambuf.replace(/\s+/g, ' ').trim();
        if (digit(adjective[0])) any_prefix = false;
    }

    if (glob) {
        // omit_corpse doesn't apply; quantity is always 1
    } else {
        nambuf += ' corpse';
        if ((otmp.quan || 1) > 1 && !ignorequan) {
            nambuf += 's';
            any_prefix = false;
        }
    }

    if (any_prefix) {
        nambuf = an(nambuf);
    }
    return nambuf;
}

// cf. objnam.c:1915 — cxname(obj): xname with corpse monster type included
export function cxname(obj) {
    if (obj.otyp === CORPSE)
        return corpse_xname(obj, null);
    return xname(obj);
}

// cf. objnam.c:1924 — cxname_singular(obj): singular form of cxname
export function cxname_singular(obj) {
    if (obj.otyp === CORPSE)
        return corpse_xname(obj, null, { singular: true });
    // Call xname with quan forced to 1
    const saveQuan = obj.quan;
    obj.quan = 1;
    const result = xname(obj);
    obj.quan = saveQuan;
    return result;
}

// cf. objnam.c:1933 — killer_xname(obj): fully identified name for death messages
export function killer_xname(obj) {
    if (obj.oartifact) return bare_artifactname(obj);

    // Temporarily make fully identified
    const saveKnown = obj.known;
    const saveDknown = obj.dknown;
    const saveBknown = obj.bknown;
    const saveRknown = obj.rknown;
    const saveGreased = obj.greased;
    const saveOpoisoned = obj.opoisoned;
    const saveBlessed = obj.blessed;
    const saveCursed = obj.cursed;
    const saveOname = obj.oname;

    obj.known = obj.dknown = true;
    obj.bknown = obj.rknown = obj.greased = false;
    if (obj.otyp !== POT_WATER) {
        obj.blessed = obj.cursed = false;
    } else {
        obj.bknown = true;
    }
    obj.opoisoned = false;
    if (!obj.oartifact) obj.oname = '';

    let buf;
    if (obj.otyp === CORPSE) {
        buf = corpse_xname(obj, null);
    } else if (obj.otyp === SLIME_MOLD) {
        buf = `deadly slime mold${(obj.quan || 1) !== 1 ? 's' : ''}`;
    } else {
        buf = xname(obj);
    }

    // Apply article
    if ((obj.quan || 1) === 1 && !strstri(buf, "'s ") && !strstri(buf, "s' ")) {
        buf = (obj_is_pname(obj) || the_unique_obj(obj)) ? the(buf) : an(buf);
    }

    // Restore
    obj.known = saveKnown;
    obj.dknown = saveDknown;
    obj.bknown = saveBknown;
    obj.rknown = saveRknown;
    obj.greased = saveGreased;
    obj.opoisoned = saveOpoisoned;
    obj.blessed = saveBlessed;
    obj.cursed = saveCursed;
    obj.oname = saveOname;

    return buf;
}

// ============================================================================
// singular
// cf. objnam.c:2082
// ============================================================================

// cf. objnam.c:2082 — singular(otmp, func): apply naming func as if quan == 1
export async function singular(otmp, func) {
    let fn = func || xname;
    if (otmp.otyp === CORPSE && fn === xname) fn = cxname;
    const saveQuan = otmp.quan;
    otmp.quan = 1;
    const nam = await fn(otmp);
    otmp.quan = saveQuan;
    return nam;
}

// ============================================================================
// Article functions: just_an, an, An, the, The
// cf. objnam.c:2100-2230
// ============================================================================

// cf. objnam.c:2100 — just_an(str): pick article prefix "", "a ", or "an "
export function just_an(str) {
    if (!str || !str.length) return 'a ';
    const c0 = lowc(str[0]);
    if (!str[1] || str[1] === ' ') {
        // single letter
        return 'aefhilmnosx'.includes(c0) ? 'an ' : 'a ';
    }
    if (str.toLowerCase().startsWith('the ')
        || str.toLowerCase() === 'molten lava'
        || str.toLowerCase() === 'iron bars'
        || str.toLowerCase() === 'ice') {
        return ''; // no article
    }
    // normal case
    if ((vowels.includes(c0)
         // exceptions warranting "a <vowel>"
         && (!str.toLowerCase().startsWith('one') || (str[3] && !'-_ '.includes(str[3])))
         && !str.toLowerCase().startsWith('eu')
         && !str.toLowerCase().startsWith('uke')
         && !str.toLowerCase().startsWith('ukulele')
         && !str.toLowerCase().startsWith('unicorn')
         && !str.toLowerCase().startsWith('uranium')
         && !str.toLowerCase().startsWith('useful'))
        || (c0 === 'x' && !vowels.includes(lowc(str[1] || '')))) {
        return 'an ';
    }
    return 'a ';
}

// cf. objnam.c:2136 — an(str): "a/an" + string with proper article
export function an(str) {
    if (!str) return 'an []';
    const prefix = just_an(str);
    return prefix + str;
}

// cf. objnam.c:2149 — An(str): capitalized "A/An" + string
export function An(str) {
    const tmp = an(str);
    return highc(tmp[0]) + tmp.slice(1);
}

// cf. objnam.c:2162 — the(str): "the" prefix as appropriate
export function the(str) {
    if (!str) return 'the []';
    if (str.toLowerCase().startsWith('the ')) {
        return lowc(str[0]) + str.slice(1);
    }
    let insert_the = false;
    if (str[0] < 'A' || str[0] > 'Z') {
        // not capitalized => not a proper name
        insert_the = true;
    } else {
        // Capitalized - check if it's a proper name
        // Look for last space or hyphen
        let lastSep = -1;
        for (let i = str.length - 1; i >= 0; i--) {
            if (str[i] === ' ' || str[i] === '-') { lastSep = i; break; }
        }
        if (lastSep >= 0 && (str[lastSep + 1] < 'A' || str[lastSep + 1] > 'Z')) {
            // capitalized adjective followed by lowercase noun
            insert_the = !str.includes("'");
        } else if (lastSep >= 0 && str.indexOf(' ') < lastSep) {
            // has multiple spaces; check for "of"
            const ofIdx = str.toLowerCase().indexOf(' of ');
            const namedIdx = str.toLowerCase().indexOf(' named ');
            const calledIdx = str.toLowerCase().indexOf(' called ');
            let named = namedIdx;
            if (calledIdx >= 0 && (named < 0 || calledIdx < named))
                named = calledIdx;
            if (ofIdx >= 0 && (named < 0 || ofIdx < named))
                insert_the = true;
            else if (named < 0 && str.length >= 31
                     && str.endsWith('Platinum Yendorian Express Card'))
                insert_the = true;
        }
    }
    return (insert_the ? 'the ' : '') + str;
}

// cf. objnam.c:2224 — The(str): capitalized "The" + string
export function The(str) {
    const tmp = the(str);
    return highc(tmp[0]) + tmp.slice(1);
}

// ============================================================================
// Object+verb formatting: aobjnam, yobjnam, Yobjnam2, Tobjnam
// cf. objnam.c:2234-2289
// ============================================================================

// Helper: carried(obj) - is object in player inventory?
function carried(obj) {
    return obj.where === 'invent' || !!obj.carried;
}

// cf. objnam.c:2234 — aobjnam(otmp, verb): "count cxname verb"
export function aobjnam(otmp, verb) {
    let bp = cxname(otmp);
    if ((otmp.quan || 1) !== 1) {
        bp = `${otmp.quan} ${bp}`;
    }
    if (verb) {
        bp += ' ' + otense(otmp, verb);
    }
    return bp;
}

// cf. objnam.c:2252 — yobjnam(obj, verb): "your X verb"
export function yobjnam(obj, verb) {
    let s = aobjnam(obj, verb);
    if (!carried(obj) || !obj_is_pname(obj)
        || obj.oartifact >= ART_ORB_OF_DETECTION) {
        const prefix = shk_your(obj);
        s = prefix + s;
    }
    return s;
}

// cf. objnam.c:2270 — Yobjnam2(obj, verb): capitalized "Your X verb"
export function Yobjnam2(obj, verb) {
    const s = yobjnam(obj, verb);
    return highc(s[0]) + s.slice(1);
}

// cf. objnam.c:2280 — Tobjnam(otmp, verb): "The <xname> <verb>"
export function Tobjnam(otmp, verb) {
    let bp = The(xname(otmp));
    if (verb) {
        bp += ' ' + otense(otmp, verb);
    }
    return bp;
}

// ============================================================================
// paydoname
// cf. objnam.c:2303
// ============================================================================

// cf. objnam.c:2303 — paydoname(obj): object name for shop payment menu
export function paydoname(obj, player) {
    // Simplified: shop payment formatting not fully ported
    return doname(obj, player);
}

// ============================================================================
// yname / Yname2 / ysimple_name / Ysimple_name2
// cf. objnam.c:2349-2398
// ============================================================================

// cf. objnam.c:2349 — yname(obj): "[your] cxname"
export function yname(obj) {
    let s = cxname(obj);
    if (!carried(obj) || !obj_is_pname(obj)
        || obj.oartifact >= ART_ORB_OF_DETECTION) {
        const prefix = shk_your(obj);
        s = prefix + s;
    }
    return s;
}

// cf. objnam.c:2368 — Yname2(obj): capitalized "Your cxname"
export function Yname2(obj) {
    const s = yname(obj);
    return highc(s[0]) + s.slice(1);
}

// Helper: minimal_xname(obj) — xname with user-supplied name suppressed
function minimal_xname(obj) {
    // Temporarily suppress user-supplied name
    const saveOname = obj.oname;
    obj.oname = '';
    const result = xname(obj);
    obj.oname = saveOname;
    return result;
}

// cf. objnam.c:2381 — ysimple_name(obj): "your" + minimal name
export function ysimple_name(obj) {
    const prefix = shk_your(obj);
    return prefix + minimal_xname(obj);
}

// cf. objnam.c:2392 — Ysimple_name2(obj): capitalized "Your" + simple name
export function Ysimple_name2(obj) {
    const s = ysimple_name(obj);
    return highc(s[0]) + s.slice(1);
}

// ============================================================================
// simpleonames / ansimpleoname / thesimpleoname
// cf. objnam.c:2418-2473
// ============================================================================

// cf. objnam.c:2418 — simpleonames(obj): plural-aware minimal name
export function simpleonames(obj) {
    let s = minimal_xname(obj);
    if ((obj.quan || 1) !== 1) s = makeplural(s);
    return s;
}

// cf. objnam.c:2436 — ansimpleoname(obj): articled simple name
export function ansimpleoname(obj) {
    const simplename = simpleonames(obj);
    let otyp = obj.otyp;
    if (otyp === FAKE_AMULET_OF_YENDOR) otyp = AMULET_OF_YENDOR;
    if (objectData[otyp]?.unique && objectData[otyp]?.oc_name
        && simplename === objectData[otyp].oc_name) {
        return the(simplename);
    }
    if ((obj.quan || 1) === 1) return an(simplename);
    return simplename;
}

// cf. objnam.c:2464 — thesimpleoname(obj): "the" + simple name
export function thesimpleoname(obj) {
    return the(simpleonames(obj));
}

// ============================================================================
// actualoname / bare_artifactname
// cf. objnam.c:2480-2505
// ============================================================================

// cf. objnam.c:2480 — actualoname(obj): name as if fully discovered
export function actualoname(obj) {
    // Temporarily force identification
    const saveKnown = obj.known;
    const saveDknown = obj.dknown;
    obj.known = obj.dknown = true;
    const result = minimal_xname(obj);
    obj.known = saveKnown;
    obj.dknown = saveDknown;
    return result;
}

// cf. objnam.c:2492 — bare_artifactname(obj): artifact name without object type
export function bare_artifactname(obj) {
    if (obj.oartifact) {
        let name = artiname(obj.oartifact);
        if (name.startsWith('The ')) name = lowc(name[0]) + name.slice(1);
        return name;
    }
    return xname(obj);
}

// ============================================================================
// otense / vtense — verb conjugation
// cf. objnam.c:2521-2643
// ============================================================================

// Special subjects that look plural but are singular
const special_subjs = [
    'erinys', 'manes', 'Cyclops', 'Hippocrates', 'Pelias', 'aklys',
    'amnesia', 'detect monsters', 'paralysis', 'shape changers',
    'nemesis',
];

// cf. objnam.c:2521 — otense(otmp, verb): verb conjugated for object plurality
export function otense(otmp, verb) {
    if (!is_plural(otmp))
        return vtense(null, verb);
    return verb;
}

// cf. objnam.c:2553 — vtense(subj, verb): conjugate verb for subject
export function vtense(subj, verb) {
    // If subj is provided and appears plural, return verb as-is (plural form)
    if (subj) {
        if (subj.toLowerCase().startsWith('a ') || subj.toLowerCase().startsWith('an '))
            return _singularize_verb(verb); // goto sing

        // Find relevant ending position (before "of", "from", "called", etc.)
        let spot = null;
        const spaces = [];
        for (let i = 0; i < subj.length; i++) {
            if (subj[i] === ' ') spaces.push(i);
        }
        for (const sp of spaces) {
            const rest = subj.slice(sp);
            if (rest.toLowerCase().startsWith(' of ')
                || rest.toLowerCase().startsWith(' from ')
                || rest.toLowerCase().startsWith(' called ')
                || rest.toLowerCase().startsWith(' named ')
                || rest.toLowerCase().startsWith(' labeled ')) {
                if (sp > 0) spot = sp - 1;
                break;
            }
        }
        const len = subj.length;
        if (spot == null) spot = len - 1;

        const lc = lowc(subj[spot]);
        // Check if it looks plural
        if ((lc === 's' && spot > 0 && !'us'.includes(lowc(subj[spot - 1])))
            || (spot >= 3 && subj.slice(spot - 3, spot + 1).toLowerCase() === 'eeth')
            || (spot >= 3 && subj.slice(spot - 3, spot + 1).toLowerCase() === 'feet')
            || (spot >= 1 && subj.slice(spot - 1, spot + 1).toLowerCase() === 'ia')
            || (spot >= 1 && subj.slice(spot - 1, spot + 1).toLowerCase() === 'ae')) {
            // Check special cases
            const checkLen = spot + 1;
            const checkStr = subj.slice(0, checkLen);
            for (const spec of special_subjs) {
                if (checkLen === spec.length
                    && checkStr.toLowerCase() === spec.toLowerCase())
                    return _singularize_verb(verb);
                if (checkLen > spec.length
                    && subj[spot - spec.length] === ' '
                    && subj.slice(spot - spec.length + 1, spot + 1).toLowerCase() === spec.toLowerCase())
                    return _singularize_verb(verb);
            }
            return verb; // plural subject, return verb as-is
        }
        if (subj.toLowerCase() === 'they' || subj.toLowerCase() === 'you')
            return verb;
    }

    // Singular form
    return _singularize_verb(verb);
}

// Internal: convert plural verb to singular 3rd person present
function _singularize_verb(verb) {
    if (!verb) return '';
    const len = verb.length;
    if (verb.toLowerCase() === 'are') return 'is';
    if (verb.toLowerCase() === 'have') return 'has';

    const last = lowc(verb[len - 1]);
    if ('zxs'.includes(last)
        || (len >= 2 && last === 'h' && 'cs'.includes(lowc(verb[len - 2])))
        || (len === 2 && last === 'o')) {
        return verb + 'es';
    }
    if (last === 'y' && len >= 2 && !vowels.includes(lowc(verb[len - 2]))) {
        return verb.slice(0, -1) + 'ies';
    }
    return verb + 's';
}

// ============================================================================
// makeplural / makesingular — Full C-faithful ports
// cf. objnam.c:2826-3154
// ============================================================================

// Word pairs for irregular singular/plural (cf. objnam.c one_off[])
const one_off = [
    ['child', 'children'],
    ['cubus', 'cubi'],    // in-/suc-cubus
    ['culus', 'culi'],    // homunculus
    ['Cyclops', 'Cyclopes'],
    ['djinni', 'djinn'],
    ['erinys', 'erinyes'],
    ['foot', 'feet'],
    ['fungus', 'fungi'],
    ['goose', 'geese'],
    ['knife', 'knives'],
    ['labrum', 'labra'],  // candelabrum
    ['louse', 'lice'],
    ['mouse', 'mice'],
    ['mumak', 'mumakil'],
    ['nemesis', 'nemeses'],
    ['ovum', 'ova'],
    ['ox', 'oxen'],
    ['passerby', 'passersby'],
    ['rtex', 'rtices'],   // vortex
    ['serum', 'sera'],
    ['staff', 'staves'],
    ['tooth', 'teeth'],
];

// Words that are both singular and plural
const as_is = [
    'boots', 'shoes', 'gloves', 'lenses', 'scales',
    'eyes', 'gauntlets', 'iron bars',
    'bison', 'deer', 'elk', 'fish', 'fowl',
    'tuna', 'yaki', '-hai', 'krill', 'manes',
    'moose', 'ninja', 'sheep', 'ronin', 'roshi',
    'shito', 'tengu', 'ki-rin', 'Nazgul', 'gunyoki',
    'piranha', 'samurai', 'shuriken', 'haggis', 'Bordeaux',
];

// Compounds that separate the pluralizable head from the rest
const compounds = [
    ' of ', ' labeled ', ' called ',
    ' named ', ' above', ' versus ',
    ' from ', ' in ', ' on ', ' a la ',
    ' with', ' de ', " d'", ' du ',
    ' au ', '-in-', '-at-',
];

// ch words that make a k-sound (pluralize with 's' not 'es')
const ch_k = [
    'monarch', 'poch', 'tech', 'mech', 'stomach', 'psych',
    'amphibrach', 'anarch', 'atriarch', 'azedarach', 'broch',
    'gastrotrich', 'isopach', 'loch', 'oligarch', 'peritrich',
    'sandarach', 'sumach', 'symposiarch',
];
export function ch_ksound(basestr) {
    if (!basestr || basestr.length < 4) return false;
    const lower = basestr.toLowerCase();
    for (const ck of ch_k) {
        if (lower.endsWith(ck)) return true;
    }
    return false;
}

// Prefixes for *man that don't have a *men plural
const no_men = [
    'albu', 'antihu', 'anti', 'ata', 'auto', 'bildungsro', 'cai', 'cay',
    'ceru', 'corner', 'decu', 'des', 'dura', 'fir', 'hanu', 'het',
    'infrahu', 'inhu', 'nonhu', 'otto', 'out', 'prehu', 'protohu',
    'subhu', 'superhu', 'talis', 'unhu', 'sha',
    'hu', 'un', 'le', 're', 'so', 'to', 'at', 'a',
];

// Prefixes for *men that don't have a *man singular
const no_man = [
    'abdo', 'acu', 'agno', 'ceru', 'cogno', 'cycla', 'fleh', 'grava',
    'hegu', 'preno', 'sonar', 'speci', 'dai', 'exa', 'fla', 'sta', 'teg',
    'tegu', 'vela', 'da', 'hy', 'lu', 'no', 'nu', 'ra', 'ru', 'se', 'vi',
    'ya', 'o', 'a',
];
// Autotranslated from objnam.c:3183
export function badman(basestr, to_plural) {
  // C: objnam.c:3183 — check if "man"/"men" ending should NOT be converted
  // e.g., "human" should NOT become "humen", "omen" should NOT become "oman"
  const no_men = [ "albu", "antihu", "anti", "ata", "auto", "bildungsro", "cai", "cay", "ceru", "corner", "decu", "des", "dura", "fir", "hanu", "het", "infrahu", "inhu", "nonhu", "otto", "out", "prehu", "protohu", "subhu", "superhu", "talis", "unhu", "sha", "hu", "un", "le", "re", "so", "to", "at", "a", ];
  const no_man = [ "abdo", "acu", "agno", "ceru", "cogno", "cycla", "fleh", "grava", "hegu", "preno", "sonar", "speci", "dai", "exa", "fla", "sta", "teg", "tegu", "vela", "da", "hy", "lu", "no", "nu", "ra", "ru", "se", "vi", "ya", "o", "a", ];
  if (!basestr || basestr.length < 4) return false;
  const lower = basestr.toLowerCase();
  // to_plural: basestr ends in "man", check no_men prefixes
  // !to_plural: basestr ends in "men", check no_man prefixes
  const list = to_plural ? no_men : no_man;
  const suffix = to_plural ? "man" : "men";
  for (let i = 0; i < list.length; i++) {
    const prefix = list[i];
    const spot = basestr.length - (prefix.length + suffix.length);
    if (spot < 0) continue;
    if (lower.substring(spot, spot + prefix.length) === prefix
        && (spot === 0 || basestr[spot - 1] === ' '))
      return true;
  }
  return false;
}

// Find compound separator in string
export function singplur_compound(str) {
    const lower = str.toLowerCase();
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch !== ' ' && ch !== '-') continue;
        for (const cmpd of compounds) {
            if (lower.startsWith(cmpd.toLowerCase(), i))
                return i;
        }
    }
    return -1;
}

// Lookup in as_is/one_off tables
function singplur_lookup(basestr, to_plural, alt_as_is) {
    const lower = basestr.toLowerCase();
    for (const word of as_is) {
        if (lower.endsWith(word.toLowerCase())) return true;
    }
    if (alt_as_is) {
        for (const word of alt_as_is) {
            if (lower.endsWith(word.toLowerCase())) return true;
        }
    }
    // "craft" suffix
    if (basestr.length > 5 && lower.endsWith('craft')) return true;
    // "slice" and "mongoose" special cases
    if (lower === 'slice' || lower === 'mongoose') {
        if (to_plural) return basestr + 's'; // signal: transform done
        return true;
    }
    // "ox" -> "foxes" when pluralizing
    if (to_plural && basestr.length > 2
        && lower.endsWith('ox')
        && !(basestr.length > 5 && lower.endsWith('muskox'))) {
        return basestr + 'es'; // "foxes"
    }
    // man/men badman check
    if (to_plural) {
        if (basestr.length > 2 && lower.endsWith('man') && badman(basestr, true))
            return basestr + 's';
    } else {
        if (basestr.length > 2 && lower.endsWith('men') && badman(basestr, false))
            return true;
    }
    // one_off table
    for (const [sing, plur] of one_off) {
        const same = to_plural ? plur : sing;
        if (lower.endsWith(same.toLowerCase())) return true;
        const other = to_plural ? sing : plur;
        if (lower.endsWith(other.toLowerCase())) {
            return basestr.slice(0, basestr.length - other.length) + same;
        }
    }
    return false;
}

// Pronoun gender table (C: genders[])
const genders = [
    { he: 'he', him: 'him', his: 'his' },    // male
    { he: 'she', him: 'her', his: 'her' },    // female
    { he: 'it', him: 'it', his: 'its' },      // neuter
    { he: 'they', him: 'them', his: 'their' }, // plural
];

// cf. objnam.c:2826 — makeplural(oldstr): full English pluralization
export function makeplural(oldstr) {
    if (oldstr) {
        while (oldstr.length && oldstr[0] === ' ') oldstr = oldstr.slice(1);
    }
    if (!oldstr || !oldstr.length) return 's';

    // Check pronouns
    for (let i = 0; i <= 2; i++) {
        if (oldstr.toLowerCase() === genders[i].he.toLowerCase()) {
            let r = genders[3].he;
            if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
            return r;
        }
        if (oldstr.toLowerCase() === genders[i].him.toLowerCase()) {
            let r = genders[3].him;
            if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
            return r;
        }
        if (oldstr.toLowerCase() === genders[i].his.toLowerCase()) {
            let r = genders[3].his;
            if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
            return r;
        }
    }

    let str = oldstr;
    // "pair of" — skip to bottom
    if (str.toLowerCase().startsWith('pair of ')) return str;

    // Look for compound separator
    let excess = '';
    const compIdx = singplur_compound(str);
    if (compIdx >= 0) {
        excess = oldstr.slice(compIdx);
        str = str.slice(0, compIdx);
    }

    // Strip trailing spaces
    str = str.replace(/\s+$/, '');
    if (!str.length) return 's' + excess;

    const len = str.length;
    let spot = str[len - 1];

    // Single letters or non-letter ending
    if (len === 1 || !letter(spot)) {
        return str + "'s" + excess;
    }

    // Check as_is/one_off tables
    const already_plural = ['ae', 'eaux', 'matzot'];
    const lookup = singplur_lookup(str, true, already_plural);
    if (lookup === true) return str + excess;
    if (typeof lookup === 'string') return lookup + excess;

    // "ya" check
    if ((len === 2 && str.toLowerCase() === 'ya')
        || (len >= 3 && str.toLowerCase().endsWith(' ya')))
        return str + excess;

    const lower = str.toLowerCase();

    // man/men
    if (len >= 3 && lower.endsWith('man') && !badman(str, true)) {
        return str.slice(0, -2) + 'en' + excess;
    }

    // f endings
    if (lowc(spot) === 'f') {
        const lo_prev = lowc(str[len - 2] || '');
        if (len >= 3 && lower.endsWith('erf')) {
            // fall through to default
        } else if ('lr'.includes(lo_prev) || vowels.includes(lo_prev)) {
            return str.slice(0, -1) + 'ves' + excess;
        }
    }

    // ium/ia
    if (len >= 3 && lower.endsWith('ium')) {
        return str.slice(0, -3) + 'ia' + excess;
    }

    // alga/larva/hypha/amoeba/vertebra -> ae
    if ((len >= 4 && lower.endsWith('alga'))
        || (len >= 5 && (lower.endsWith('hypha') || lower.endsWith('larva')))
        || (len >= 6 && lower.endsWith('amoeba'))
        || (len >= 8 && lower.endsWith('vertebra'))) {
        return str + 'e' + excess;
    }

    // us -> i (fungus/fungi, homunculus/homunculi, but not lotus, wumpus)
    if (len > 3 && lower.endsWith('us')
        && !(len >= 5 && lower.endsWith('lotus'))
        && !(len >= 6 && lower.endsWith('wumpus'))) {
        return str.slice(0, -2) + 'i' + excess;
    }

    // sis -> ses
    if (len >= 3 && lower.endsWith('sis')) {
        return str.slice(0, -2) + 'es' + excess;
    }

    // eau -> eaux (but not bureau)
    if (len >= 3 && lower.endsWith('eau')
        && !(len >= 6 && lower.endsWith('bureau'))) {
        return str + 'x' + excess;
    }

    // matzoh/matzah -> matzot
    if (len >= 6 && (lower.endsWith('matzoh') || lower.endsWith('matzah'))) {
        return str.slice(0, -2) + 'ot' + excess;
    }
    if (len >= 5 && (lower.endsWith('matzo') || lower.endsWith('matza'))) {
        return str.slice(0, -1) + 'ot' + excess;
    }

    // codex/spadix/neocortex -> ices
    if (len >= 5
        && (lower.endsWith('dex') || lower.endsWith('dix') || lower.endsWith('tex'))
        && !lower.endsWith('index')) {
        return str.slice(0, -2) + 'ices' + excess;
    }

    const lo_c = lowc(spot);

    // Ends in z, x, s, ch, sh -> add "es"
    if ('zxs'.includes(lo_c)
        || (len >= 2 && lo_c === 'h' && 'cs'.includes(lowc(str[len - 2]))
            && !(len >= 4 && lowc(str[len - 2]) === 'c' && ch_ksound(str)))
        || (len >= 4 && lower.endsWith('ato'))
        || (len >= 5 && lower.endsWith('dingo'))) {
        return str + 'es' + excess;
    }

    // y -> ies
    if (lo_c === 'y' && !vowels.includes(lowc(str[len - 2] || ''))) {
        return str.slice(0, -1) + 'ies' + excess;
    }

    // Default: append 's'
    return str + 's' + excess;
}

// cf. objnam.c:3027 — makesingular(oldstr): convert plural to singular
export function makesingular(oldstr) {
    if (oldstr) {
        while (oldstr.length && oldstr[0] === ' ') oldstr = oldstr.slice(1);
    }
    if (!oldstr || !oldstr.length) return '';

    // Check pronouns
    if (oldstr.toLowerCase() === genders[3].he.toLowerCase()) {  // "they"
        let r = genders[2].he; // "it"
        if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
        return r;
    }
    if (oldstr.toLowerCase() === genders[3].him.toLowerCase()) { // "them"
        let r = genders[2].him; // "it"
        if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
        return r;
    }
    if (oldstr.toLowerCase() === genders[3].his.toLowerCase()) { // "their"
        let r = genders[2].his; // "its"
        if (oldstr[0] === highc(oldstr[0])) r = highc(r[0]) + r.slice(1);
        return r;
    }

    let bp = oldstr;
    let excess = '';

    // Check for compound separator
    const compIdx = singplur_compound(bp);
    if (compIdx >= 0) {
        excess = oldstr.slice(compIdx);
        bp = bp.slice(0, compIdx);
    }

    // Strip trailing spaces
    bp = bp.replace(/\s+$/, '');
    const lower = bp.toLowerCase();
    const p = bp.length;

    // Check as_is/one_off tables
    const lookup = singplur_lookup(bp, false, special_subjs);
    if (lookup === true) return bp + excess;
    if (typeof lookup === 'string') return lookup + excess;

    // Remove -s or -es or -ies
    if (p >= 1 && lowc(bp[p - 1]) === 's') {
        if (p >= 2 && lowc(bp[p - 2]) === 'e') {
            if (p >= 3 && lowc(bp[p - 3]) === 'i') { // "ies"
                if ((p >= 7 && lower.endsWith('cookies'))
                    || (lower.endsWith('pies') && (p - 4 === 0 || bp[p - 5] === ' '))
                    || (lower.endsWith('genies') && (p - 6 === 0 || bp[p - 7] === ' '))
                    || (p >= 5 && lower.endsWith('mbies'))  // zombie
                    || (p >= 5 && lower.endsWith('yries'))) { // valkyrie
                    // just drop 's'
                    return bp.slice(0, -1) + excess;
                }
                // ies -> y
                return bp.slice(0, -3) + 'y' + excess;
            }
            // ves -> f (wolves)
            if (p >= 4 && (('lr'.includes(lowc(bp[p - 4]))
                            || vowels.includes(lowc(bp[p - 4]))))
                && lower.endsWith('ves')) {
                if ((p >= 6 && lower.endsWith('cloves'))
                    || (p >= 6 && lower.endsWith('nerves'))) {
                    return bp.slice(0, -1) + excess; // just drop s
                }
                return bp.slice(0, -3) + 'f' + excess;
            }
            // Various -es endings
            if ((p >= 4 && lower.endsWith('eses'))
                || (p >= 4 && lower.endsWith('oxes'))
                || (p >= 4 && lower.endsWith('nxes'))
                || (p >= 4 && lower.endsWith('ches'))
                || (p >= 4 && lower.endsWith('uses'))
                || (p >= 4 && lower.endsWith('shes'))
                || (p >= 4 && lower.endsWith('sses'))
                || (p >= 5 && lower.endsWith('atoes'))
                || (p >= 7 && lower.endsWith('dingoes'))
                || (p >= 7 && lower.endsWith('aleaxes'))) {
                return bp.slice(0, -2) + excess; // drop 'es'
            }
            // else fall through to drop just 's'
        } else if (lower.endsWith('us')) { // lotus, fungus
            if (!(p >= 6 && lower.endsWith('tengus'))
                && !(p >= 7 && lower.endsWith('hezrous'))) {
                return bp + excess; // keep as-is (it's already singular)
            }
        } else if (lower.endsWith('ss')
                   || (p >= 5 && lower.endsWith(' lens'))
                   || (p === 4 && lower === 'lens')) {
            return bp + excess; // already singular
        }
        // Drop 's'
        return bp.slice(0, -1) + excess;
    }

    // Input doesn't end in 's'
    if (p >= 3 && lower.endsWith('men') && !badman(bp, false)) {
        return bp.slice(0, -2) + 'an' + excess;
    }
    // matzot -> matzo, algae -> alga, eaux -> eau
    if ((p >= 6 && lower.endsWith('matzot'))
        || (p >= 2 && lower.endsWith('ae'))
        || (p >= 4 && lower.endsWith('eaux'))) {
        return bp.slice(0, -1) + excess; // drop last char
    }
    // ia -> ium (balactheria -> balactherium)
    if (p >= 4 && lower.endsWith('ia')
        && 'lr'.includes(lowc(bp[p - 3])) && lowc(bp[p - 4]) === 'e') {
        return bp.slice(0, -1) + 'um' + excess;
    }

    return bp + excess;
}

// ============================================================================
// rnd_otyp_by_wpnskill / shiny_obj / rnd_class
// cf. objnam.c:3422-3525, 5393
// ============================================================================

// cf. objnam.c:3422 — rnd_otyp_by_wpnskill(skill): random weapon type by skill
export function rnd_otyp_by_wpnskill(skill) {
    let n = 0;
    let otyp = STRANGE_OBJECT;
    let base = -1;
    for (let i = 0; i < NUM_OBJECTS; i++) {
        if (objectData[i]?.oc_class === WEAPON_CLASS) {
            base = i;
            break;
        }
    }
    if (base < 0) return otyp;
    for (let i = base; i < NUM_OBJECTS && objectData[i].oc_class === WEAPON_CLASS; i++) {
        if (objectData[i].oc_subtyp === skill) {
            n++;
            otyp = i;
        }
    }
    if (n > 0) {
        let r = rn2(n);
        for (let i = base; i < NUM_OBJECTS && objectData[i].oc_class === WEAPON_CLASS; i++) {
            if (objectData[i].oc_subtyp === skill) {
                if (--r < 0) return i;
            }
        }
    }
    return otyp;
}

function classBounds(oclass) {
    let lo = -1;
    let hi = -1;
    for (let i = 0; i < NUM_OBJECTS; i++) {
        if (objectData[i]?.oc_class === oclass) {
            if (lo < 0) lo = i;
            hi = i;
        }
    }
    return [lo, hi];
}

// cf. objnam.c:3233 — compare user string against object name/description
function wishymatch(u_str, o_str, retry_inverted) {
    if (!u_str || !o_str) return false;
    if (fuzzymatch(u_str, o_str, ' -', true)) return true;

    if (retry_inverted) {
        const uOf = strstri(u_str, ' of ');
        const oOf = strstri(o_str, ' of ');
        if (uOf && !oOf) {
            const cut = u_str.toLowerCase().indexOf(' of ');
            const inverted = `${u_str.slice(cut + 4)} ${u_str.slice(0, cut)}`.trim();
            if (fuzzymatch(inverted, o_str, ' -', true)) return true;
        } else if (oOf && !uOf) {
            const cut = o_str.toLowerCase().indexOf(' of ');
            const inverted = `${o_str.slice(cut + 4)} ${o_str.slice(0, cut)}`.trim();
            if (fuzzymatch(u_str, inverted, ' -', true)) return true;
        }
    }

    if (o_str.startsWith('dwarvish ')) {
        if (u_str.toLowerCase().startsWith('dwarven ')) {
            return fuzzymatch(u_str.slice(8), o_str.slice(9), ' -', true);
        }
    } else if (o_str.startsWith('elven ')) {
        const lu = u_str.toLowerCase();
        if (lu.startsWith('elvish ')) {
            return fuzzymatch(u_str.slice(7), o_str.slice(6), ' -', true);
        }
        if (lu.startsWith('elfin ')) {
            return fuzzymatch(u_str.slice(6), o_str.slice(6), ' -', true);
        }
    } else if (strstri(o_str, 'helm') && strstri(u_str, 'helmet')) {
        return wishymatch(u_str.replace(/helmet/gi, 'helm'), o_str, true);
    } else if (strstri(o_str, 'gauntlets') && strstri(u_str, 'gloves')) {
        return wishymatch(u_str.replace(/gloves/gi, 'gauntlets'), o_str, true);
    }

    return false;
}

// cf. objnam.c:3445 — choose random matching object by name/description
function rnd_otyp_by_namedesc(name, oclass, xtra_prob) {
    if (!name || !name.trim()) return STRANGE_OBJECT;
    const q = name.trim();
    const check_of = !strstri(q, ' of ');
    const validobjs = [];
    let maxprob = 0;

    let lo;
    let hi;
    if (oclass) {
        [lo, hi] = classBounds(oclass);
    } else {
        lo = 1;
        hi = NUM_OBJECTS - 1;
    }
    if (lo < 0 || hi < lo) return STRANGE_OBJECT;

    for (let i = lo; i <= hi; i++) {
        const od = objectData[i];
        if (!od || !od.oc_name) continue;
        if (oclass && od.oc_class !== oclass) continue;

        const zn = od.oc_name;
        const desc = od.oc_descr || null;
        const uname = od.uname || null;
        const ofInName = check_of ? strstri(zn, ' of ') : null;
        const ofInDesc = (check_of && desc) ? strstri(desc, ' of ') : null;

        let matched = wishymatch(q, zn, true);
        if (!matched && ofInName) {
            const cut = zn.toLowerCase().indexOf(' of ');
            if (cut >= 0) matched = wishymatch(q, zn.slice(cut + 4), false);
        }
        if (!matched && desc) matched = wishymatch(q, desc, false);
        if (!matched && ofInDesc) {
            const cut = desc.toLowerCase().indexOf(' of ');
            if (cut >= 0) matched = wishymatch(q, desc.slice(cut + 4), false);
        }
        if (!matched && uname) matched = wishymatch(q, uname, false);

        if (matched) {
            validobjs.push(i);
            maxprob += (od.oc_prob || 0) + xtra_prob;
        }
    }

    if (validobjs.length > 0 && maxprob > 0) {
        let prob = rn2(maxprob);
        for (let i = 0; i < validobjs.length - 1; i++) {
            prob -= (objectData[validobjs[i]].oc_prob || 0) + xtra_prob;
            if (prob < 0) return validobjs[i];
        }
        return validobjs[validobjs.length - 1];
    }
    return STRANGE_OBJECT;
}

// cf. objnam.c:3522 — shiny_obj(oclass): random shiny object of class
export function shiny_obj(oclass) {
    return rnd_otyp_by_namedesc('shiny', oclass, 0);
}

// cf. objnam.c:5393 — rnd_class(first, last): random type in range
// Already implemented in mkobj.js; re-export for completeness
// Autotranslated from objnam.c:5392
export function rnd_class(first, last) {
  let i, x, sum = 0;
  if (last > first) {
    for (i = first; i <= last; i++) {
      sum += objectData[i].oc_prob;
    }
    if (!sum) return rn1(last - first + 1, first);
    x = rnd(sum);
    for (i = first; i <= last; i++) {
      if ((x -= objectData[i].oc_prob) <= 0) return i;
    }
  }
  return (first === last) ? first : STRANGE_OBJECT;
}

// ============================================================================
// readobjnam — Wishing parser
// cf. objnam.c:4900
// ============================================================================

// cf. objnam.c:3923 — readobjnam_init()
export function readobjnam_init() {
    return {
        quan: 1,
        spe: null,
        buc: 0,
        text: '',
        origbp: '',
        dn: '',
        un: '',
        name: '',
        oclass: 0,
        actualn: '',
        forcedTyp: 0,
    };
}

// cf. objnam.c:4168 — readobjnam_parse_charges()
export function readobjnam_parse_charges(state, text) {
    if (!state || typeof text !== 'string') return text;
    const speMatch = text.match(/^([+-]\d+)\s+/);
    if (!speMatch) return text;
    state.spe = parseInt(speMatch[1], 10);
    return text.slice(speMatch[0].length).trim();
}

// cf. objnam.c:3956 — readobjnam_preparse()
export function readobjnam_preparse(state, bp) {
    if (!state || typeof bp !== 'string') return '';
    let text = bp.trim().toLowerCase();
    if (!text) return '';
    text = text.replace(/\s+/g, ' ');
    state.origbp = text;

    const qMatch = text.match(/^(\d+)\s+/);
    if (qMatch) {
        state.quan = Math.max(1, parseInt(qMatch[1], 10) || 1);
        text = text.slice(qMatch[0].length).trim();
    }

    if (text.startsWith('blessed ')) {
        state.buc = 1;
        text = text.slice(8).trim();
    } else if (text.startsWith('uncursed ')) {
        state.buc = 2;
        text = text.slice(9).trim();
    } else if (text.startsWith('cursed ')) {
        state.buc = -1;
        text = text.slice(7).trim();
    }

    text = readobjnam_parse_charges(state, text);

    if (text.startsWith('a ')) text = text.slice(2).trim();
    else if (text.startsWith('an ')) text = text.slice(3).trim();
    else if (text.startsWith('the ')) text = text.slice(4).trim();

    state.text = text;
    state.actualn = text;
    state.dn = text;
    state.un = '';
    state.name = '';
    state.oclass = 0;
    state.forcedTyp = 0;
    return text;
}

const readobjnam_class_prefixes = [
    ['potions of ', POTION_CLASS],
    ['potion of ', POTION_CLASS],
    ['scrolls of ', SCROLL_CLASS],
    ['scroll of ', SCROLL_CLASS],
    ['wands of ', WAND_CLASS],
    ['wand of ', WAND_CLASS],
    ['rings of ', RING_CLASS],
    ['ring of ', RING_CLASS],
    ['spellbooks of ', SPBOOK_CLASS],
    ['spellbook of ', SPBOOK_CLASS],
    ['amulets of ', AMULET_CLASS],
    ['amulet of ', AMULET_CLASS],
];

const readobjnam_class_suffixes = [
    [' potions', POTION_CLASS],
    [' potion', POTION_CLASS],
    [' scrolls', SCROLL_CLASS],
    [' scroll', SCROLL_CLASS],
    [' wands', WAND_CLASS],
    [' wand', WAND_CLASS],
    [' rings', RING_CLASS],
    [' ring', RING_CLASS],
    [' amulets', AMULET_CLASS],
    [' amulet', AMULET_CLASS],
    [' spellbooks', SPBOOK_CLASS],
    [' spellbook', SPBOOK_CLASS],
];

function readobjnam_classify(state, rawText) {
    let text = (rawText || '').trim();
    let oclass = state.oclass || 0;
    let forcedTyp = state.forcedTyp || 0;

    if (!oclass) {
        for (const [prefix, cls] of readobjnam_class_prefixes) {
            if (text.startsWith(prefix)) {
                oclass = cls;
                text = text.slice(prefix.length).trim();
                break;
            }
        }
    }

    if (!oclass) {
        for (const [suffix, cls] of readobjnam_class_suffixes) {
            if (text.endsWith(suffix)) {
                oclass = cls;
                text = text.slice(0, -suffix.length).trim();
                break;
            }
        }
    }

    if (text.endsWith(' dragon scale mail')) {
        oclass = ARMOR_CLASS;
        for (let i = 0; i < NUM_OBJECTS; i++) {
            if ((objectData[i]?.oc_name || '').toLowerCase() === text) {
                forcedTyp = i;
                break;
            }
        }
        text = 'scale mail';
    }

    if (!oclass) {
        if (text === 'potion' || text === 'potions') oclass = POTION_CLASS;
        else if (text === 'scroll' || text === 'scrolls') oclass = SCROLL_CLASS;
        else if (text === 'wand' || text === 'wands') oclass = WAND_CLASS;
        else if (text === 'ring' || text === 'rings') oclass = RING_CLASS;
        else if (text === 'amulet' || text === 'amulets') oclass = AMULET_CLASS;
        else if (text === 'spellbook' || text === 'spellbooks') oclass = SPBOOK_CLASS;
    }

    state.oclass = oclass;
    state.forcedTyp = forcedTyp;
    return text;
}

// cf. objnam.c postparse phases
export function readobjnam_postparse1(state) {
    if (!state) return state;
    let text = (state.text || '').trim();
    if (!text) return state;

    // "foo named bar", "foo called bar", "foo labeled bar".
    const named = strstri(text, ' named ');
    if (named) {
        const cut = text.toLowerCase().indexOf(' named ');
        if (cut >= 0) {
            state.name = text.slice(cut + 7).trim();
            text = text.slice(0, cut).trim();
        }
    }
    const called = strstri(text, ' called ');
    if (called) {
        const cut = text.toLowerCase().indexOf(' called ');
        if (cut >= 0) {
            state.un = text.slice(cut + 8).trim();
            text = text.slice(0, cut).trim();
        }
    }
    const labeled = strstri(text, ' labeled ') || strstri(text, ' labelled ');
    if (labeled) {
        let marker = ' labeled ';
        let cut = text.toLowerCase().indexOf(marker);
        if (cut < 0) {
            marker = ' labelled ';
            cut = text.toLowerCase().indexOf(marker);
        }
        if (cut >= 0) {
            state.dn = text.slice(cut + marker.length).trim();
            text = text.slice(0, cut).trim();
        }
    }

    if (text.startsWith('pair of ')) {
        text = text.slice(8).trim();
    } else if (text.startsWith('pairs of ')) {
        text = text.slice(9).trim();
    } else if (text.startsWith('set of ')) {
        text = text.slice(7).trim();
    } else if (text.startsWith('sets of ')) {
        text = text.slice(8).trim();
    }

    state.actualn = readobjnam_classify(state, text);
    if (!state.dn) state.dn = state.actualn;
    state.text = text;
    return state;
}

export function readobjnam_postparse2(state) {
    if (!state) return state;
    let actualn = (state.actualn || '').trim();
    if (!actualn) return state;

    // C-like generic gem/stone class coercion for "<color> gem"/"<color> stone".
    if (actualn.endsWith(' stone')) {
        actualn = actualn.slice(0, -6).trim();
        state.oclass = GEM_CLASS;
        state.actualn = actualn;
        state.dn = actualn;
    } else if (actualn.endsWith(' gem')) {
        actualn = actualn.slice(0, -4).trim();
        state.oclass = GEM_CLASS;
        state.actualn = actualn;
        state.dn = actualn;
    }
    return state;
}

export function readobjnam_postparse3(state) {
    return state;
}

// cf. objnam.c:4900 — readobjnam(bp, no_wish): parse wish string into object
export function readobjnam(bp, no_wish, opts = {}) {
    if (typeof bp !== 'string') return null;
    const state = readobjnam_init();
    if (!readobjnam_preparse(state, bp)) return null;

    readobjnam_postparse1(state);
    readobjnam_postparse2(state);
    readobjnam_postparse3(state);

    const actualn = state.actualn || '';
    const dn = state.dn || actualn;
    const un = state.un || '';
    const origbp = state.origbp || '';
    const oclass = state.oclass || 0;
    const forcedTyp = state.forcedTyp || 0;

    let otyp = rnd_otyp_by_namedesc(actualn, oclass, 1);
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && dn && dn !== actualn) {
        otyp = rnd_otyp_by_namedesc(dn, oclass, 1);
    }
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && un) {
        otyp = rnd_otyp_by_namedesc(un, oclass, 1);
    }
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && origbp && origbp !== actualn) {
        otyp = rnd_otyp_by_namedesc(origbp, oclass, 1);
    }

    if (otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) {
        otyp = rnd_otyp_by_namedesc(actualn, 0, 1);
    }
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && dn && dn !== actualn) {
        otyp = rnd_otyp_by_namedesc(dn, 0, 1);
    }
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && un) {
        otyp = rnd_otyp_by_namedesc(un, 0, 1);
    }
    if ((otyp <= STRANGE_OBJECT || otyp >= NUM_OBJECTS) && origbp && origbp !== actualn) {
        otyp = rnd_otyp_by_namedesc(origbp, 0, 1);
    }
    if (forcedTyp > STRANGE_OBJECT && forcedTyp < NUM_OBJECTS) {
        otyp = forcedTyp;
    }

    let otmp = null;
    if (otyp > STRANGE_OBJECT && otyp < NUM_OBJECTS) {
        if (no_wish && objectData[otyp]?.no_wish) return null;
        otmp = mksobj(otyp, true, false);
    } else if (oclass) {
        otmp = mkobj(oclass, false);
    }
    if (!otmp) {
        // C flow parity: terrain/trap wishing is part of readobjnam, gated to
        // wizard mode and disabled for wizkit startup wishing.
        const wizard = !!opts.wizard;
        const wizkit_wishing = !!opts.wizkit_wishing;
        if (wizard && !wizkit_wishing && !oclass) {
            const terrain = wizterrainwish({
                text: bp,
                player: opts.player || null,
                map: opts.map || opts.player?.map || null,
                x: opts.x,
                y: opts.y,
            });
            if (terrain) return hands_obj;
        }
        return null;
    }
    otyp = otmp.otyp;

    if (state.quan > 1) {
        otmp.quan = state.quan;
        otmp.owt = weight(otmp);
    }
    if (state.buc === 1) bless(otmp);
    else if (state.buc === -1) curse(otmp);
    else if (state.buc === 2) uncurse(otmp);

    if (state.spe !== null) {
        otmp.spe = state.spe;
    }
    // C readobjnam returns an object with dknown set (appearance seen),
    // but does not auto-discover the true object type.
    otmp.dknown = true;

    return otmp;
}

// ============================================================================
// Japanese_item_name
// cf. objnam.c:5412
// ============================================================================

// cf. objnam.c:5412 — Japanese_item_name(i, ordinaryname): Samurai item name
// Autotranslated from objnam.c:5411
export function Japanese_item_name(i, ordinaryname) {
  for (const j of Japanese_items) {
    if (!j.item) break;
    if (i === j.item) return j.name;
  }
  return ordinaryname;
}

// ============================================================================
// Armor simple name functions
// cf. objnam.c:5425-5593
// ============================================================================

function Is_dragon_mail(obj) {
    return obj.otyp >= GRAY_DRAGON_SCALE_MAIL && obj.otyp <= YELLOW_DRAGON_SCALE_MAIL;
}

function Is_dragon_scales(obj) {
    return obj.otyp >= GRAY_DRAGON_SCALES && obj.otyp <= YELLOW_DRAGON_SCALES;
}

// cf. objnam.c:5461 — suit_simple_name(suit): simple body armor name
export function suit_simple_name(suit) {
    if (suit) {
        if (Is_dragon_mail(suit)) return 'dragon mail';
        if (Is_dragon_scales(suit)) return 'dragon scales';
        const suitnm = objectData[suit.otyp]?.oc_name || '';
        if (suitnm.length > 5 && suitnm.endsWith(' mail')) return 'mail';
        if (suitnm.length > 7 && suitnm.endsWith(' jacket')) return 'jacket';
    }
    return 'suit';
}

// cf. objnam.c:5482 — cloak_simple_name(cloak): simple cloak name
export function cloak_simple_name(cloak) {
    if (cloak) {
        if (cloak.otyp === ROBE) return 'robe';
        if (cloak.otyp === MUMMY_WRAPPING) return 'wrapping';
        if (cloak.otyp === ALCHEMY_SMOCK) {
            return (isObjectNameKnown(cloak.otyp) && cloak.dknown)
                ? 'smock' : 'apron';
        }
    }
    return 'cloak';
}

// cf. objnam.c:5503 — helm_simple_name(helmet): simple helmet name
export function helm_simple_name(helmet) {
    // hard_helmet: dwarvish iron helm and all non-hat helmets
    // Hats: fedora, cornuthaum, dunce cap, elven leather helm
    if (helmet) {
        const otyp = helmet.otyp;
        // C: hard_helmet checks material; simplified here
        const od = objectData[otyp];
        // Items that are "hats" (don't provide hard helmet protection):
        // fedora (92), cornuthaum (93), dunce cap (94), elven leather helm (89)
        if (otyp === ELVEN_LEATHER_HELM || otyp === FEDORA || otyp === CORNUTHAUM || otyp === DUNCE_CAP) return 'hat';
    }
    return 'helm';
}

// cf. objnam.c:5522 — gloves_simple_name(gloves): simple gloves name
export function gloves_simple_name(gloves) {
    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp;
        const actualn = objectData[otyp]?.oc_name || '';
        const descrpn = objectData[otyp]?.oc_descr || '';
        const nameKnown = isObjectNameKnown(otyp);
        const checkStr = nameKnown ? actualn : descrpn;
        if (checkStr.toLowerCase().includes('gauntlets')) return 'gauntlets';
    }
    return 'gloves';
}

// cf. objnam.c:5541 — boots_simple_name(boots): simple boots name
export function boots_simple_name(boots) {
    if (boots && boots.dknown) {
        const otyp = boots.otyp;
        const actualn = objectData[otyp]?.oc_name || '';
        const descrpn = objectData[otyp]?.oc_descr || '';
        if (descrpn.toLowerCase().includes('shoes')
            || (isObjectNameKnown(otyp) && actualn.toLowerCase().includes('shoes')))
            return 'shoes';
    }
    return 'boots';
}

// cf. objnam.c:5560 — shield_simple_name(shield): simple shield name
// Autotranslated from objnam.c:5559
export function shield_simple_name(shield) {
  if (shield) {
    if (shield.otyp === SHIELD_OF_REFLECTION) return shield.dknown ? "silver shield" : "smooth shield";
  }
  return "shield";
}

// cf. objnam.c:5590 — shirt_simple_name(shirt): simple shirt name
// Autotranslated from objnam.c:5589
export function shirt_simple_name(shirt) {
  return "shirt";
}

// cf. objnam.c:5425 — armor_simple_name(armor): dispatch to specific armor type
export function armor_simple_name(armor) {
    const armcat = objectData[armor.otyp]?.oc_subtyp;
    switch (armcat) {
    case ARM_SUIT: return suit_simple_name(armor);
    case ARM_CLOAK: return cloak_simple_name(armor);
    case ARM_HELM: return helm_simple_name(armor);
    case ARM_GLOVES: return gloves_simple_name(armor);
    case ARM_BOOTS: return boots_simple_name(armor);
    case ARM_SHIELD: return shield_simple_name(armor);
    case ARM_SHIRT: return shirt_simple_name(armor);
    default: return simpleonames(armor);
    }
}

// ============================================================================
// mimic_obj_name
// cf. objnam.c:5596
// ============================================================================

// cf. objnam.c:5596 — mimic_obj_name(mtmp): object name for mimic disguise
export function mimic_obj_name(mtmp) {
    if (mtmp.m_ap_type === M_AP_OBJECT) {
        if (mtmp.mappearance === GOLD_PIECE) return 'gold';
        if (mtmp.mappearance != null && mtmp.mappearance !== STRANGE_OBJECT)
            return simple_typename(mtmp.mappearance);
    }
    return 'whatcha-may-callit';
}
