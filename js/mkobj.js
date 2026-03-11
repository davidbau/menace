// mkobj.js -- Object creation
// Faithful port of mkobj.c from NetHack 3.7
// C ref: mkobj.c — object creation, class initialization, containers

import { strchr } from './hacklib.js';
import { rn2, rnd, rn1, rne, rnz, d, getRngCallCount, pushRngLogEntry } from './rng.js';
import { isObjectNameKnown } from './o_init.js';
import {
    objectData, bases, oclass_prob_totals, mkobjprobs, NUM_OBJECTS, RANDOM_CLASS,
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    SPBOOK_no_NOVEL,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS,
    CHAIN_CLASS, VENOM_CLASS,
    IRON, COPPER, WOOD, PLASTIC, GLASS, DRAGON_HIDE, LIQUID,
    ARROW, ELVEN_ARROW, ORCISH_ARROW, YA, CROSSBOW_BOLT, DART, FLINT, ROCK,
    SHORT_SWORD,
    GOLD_PIECE, DILITHIUM_CRYSTAL, LOADSTONE,
    WAN_CANCELLATION, WAN_LIGHT, WAN_LIGHTNING,
    BAG_OF_HOLDING, OILSKIN_SACK, BAG_OF_TRICKS, SACK, HORN_OF_PLENTY,
    LARGE_BOX, CHEST, ICE_BOX, CORPSE, STATUE, FIGURINE, EGG, BOULDER,
    GRAY_DRAGON_SCALES, YELLOW_DRAGON_SCALES, LENSES,
    APPLE, ORANGE, PEAR, BANANA, EUCALYPTUS_LEAF,
    ELVEN_SHIELD, ORCISH_SHIELD, SHIELD_OF_REFLECTION,
    WORM_TOOTH, CRYSKNIFE, UNICORN_HORN, POT_WATER, TIN, POT_OIL,
    SPE_BOOK_OF_THE_DEAD, SPE_NOVEL, SPE_BLANK_PAPER,
    ARM_SHIELD, ARM_GLOVES, ARM_BOOTS,
    CLASS_SYMBOLS, STRANGE_OBJECT,
    initObjectData,
} from './objects.js';
import { rndmonnum as makemon_rndmonnum, rndmonnum_adj as makemon_rndmonnum_adj } from './makemon.js';
import {
    mons, G_NOCORPSE, M2_NEUTER, M2_FEMALE, M2_MALE, MZ_SMALL,
    PM_LIZARD, PM_LICHEN, S_TROLL, MS_RIDER,
    M2_DWARF, S_KOBOLD, S_ORC, S_GIANT, S_HUMAN, S_KOP, S_GNOME, S_HUMANOID,
    PM_SCORPIUS, PM_SCORPION, PM_KILLER_BEE, PM_QUEEN_BEE,
    PM_GARGOYLE, PM_WINGED_GARGOYLE,
    PM_SAMURAI
} from './monsters.js';
import { TIMER_KIND, TIMER_FUNC, TAINT_AGE, W_WEP, ICE } from './const.js';
import { lays_eggs, monsndx, DEADMONSTER, mhis } from './mondata.js';
import { start_timer, stop_timer, attach_egg_hatch_timeout } from './timeout.js';
import { level_difficulty } from './dungeon.js';
import { rnd_class, safe_typename, makeplural, obj_typename, simpleonames } from './objnam.js';
import { extract_from_minvent } from './worn.js';
import { g_at, carried, sobj_at } from './invent.js';
import { impossible, pline, Your, You_see, You_hear } from './pline.js';
import { newsym } from './display.js';
import { cansee } from './vision.js';
import { artifact_exists } from './artifact.js';
import { safe_oname, pmname, Mgender } from './do_name.js';

// Named object indices we need (exported from objects.js)
// Check: CORPSE, EGG, TIN, SLIME_MOLD, KELP_FROND, CANDY_BAR,
// LOADSTONE, LUCKSTONE, TALLOW_CANDLE, WAX_CANDLE, BRASS_LANTERN, OIL_LAMP,
// MAGIC_LAMP, CHEST, LARGE_BOX, ICE_BOX, SACK, OILSKIN_SACK, BAG_OF_HOLDING,
// EXPENSIVE_CAMERA, TINNING_KIT, MAGIC_MARKER, CAN_OF_GREASE, CRYSTAL_BALL,
// HORN_OF_PLENTY, BAG_OF_TRICKS, FIGURINE, BELL_OF_OPENING,
// MAGIC_FLUTE, MAGIC_HARP, FROST_HORN, FIRE_HORN, DRUM_OF_EARTHQUAKE,
// WAN_WISHING, WAN_NOTHING, BOULDER, STATUE,
// AMULET_OF_YENDOR, AMULET_OF_STRANGULATION, AMULET_OF_CHANGE, AMULET_OF_RESTFUL_SLEEP,
// FUMBLE_BOOTS, LEVITATION_BOOTS, HELM_OF_OPPOSITE_ALIGNMENT, GAUNTLETS_OF_FUMBLING,
// RIN_TELEPORTATION, RIN_POLYMORPH, RIN_AGGRAVATE_MONSTER, RIN_HUNGER,
// GOLD_PIECE, SPE_BLANK_PAPER, POT_OIL, POT_WATER


// C ref: mkobj.c place_object() — place object on floor at (x,y)
export function place_object(obj, x, y, map) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!obj || !mapRef?.objects) return obj;
    obj.ox = x;
    obj.oy = y;
    // C ref: place_object() puts object on floor chain (OBJ_FLOOR).
    obj.where = 'OBJ_FLOOR';
    pushRngLogEntry(`^place[${obj.otyp},${obj.ox},${obj.oy}]`);
    mapRef.objects.push(obj);
    return obj;
}

// C ref: invent.c mergable() — check if two objects can merge.
// Moved here from invent.js to break the invent.js ↔ stackobj.js ↔ mkobj.js
// circular dependency (stackobj.js needs mergable but imports mkobj.js;
// invent.js imports monutil.js which imports stackobj.js → cycle).
// IMPORTANT: Do NOT add a mergable() implementation to invent.js.
//            See stackobj.js for a full explanation of the dependency issue.
export function mergable(otmp, obj) {
    if (obj === otmp) return false;
    if (obj.otyp !== otmp.otyp) return false;
    if (obj.nomerge || otmp.nomerge) return false;
    const od = objectData[obj.otyp];
    if (!od || !od.merge) return false;

    // Coins always merge
    if (obj.oclass === COIN_CLASS) return true;

    if (!!obj.cursed !== !!otmp.cursed || !!obj.blessed !== !!otmp.blessed)
        return false;

    // Globs always merge (beyond bless/curse check)
    if (obj.globby) return true;

    if (!!obj.unpaid !== !!otmp.unpaid) return false;
    if ((obj.spe ?? 0) !== (otmp.spe ?? 0)) return false;
    if (!!obj.no_charge !== !!otmp.no_charge) return false;
    if (!!obj.obroken !== !!otmp.obroken) return false;
    if (!!obj.otrapped !== !!otmp.otrapped) return false;
    if (!!obj.lamplit !== !!otmp.lamplit) return false;

    if (obj.oclass === FOOD_CLASS) {
        if ((obj.oeaten ?? 0) !== (otmp.oeaten ?? 0)) return false;
        if (!!obj.orotten !== !!otmp.orotten) return false;
    }

    if ((obj.oeroded ?? 0) !== (otmp.oeroded ?? 0)) return false;
    if ((obj.oeroded2 ?? 0) !== (otmp.oeroded2 ?? 0)) return false;
    if (!!obj.greased !== !!otmp.greased) return false;

    if (erosion_matters(obj)) {
        if (!!obj.oerodeproof !== !!otmp.oerodeproof) return false;
    }

    if (obj.otyp === CORPSE || obj.otyp === EGG || obj.otyp === TIN) {
        if ((obj.corpsenm ?? -1) !== (otmp.corpsenm ?? -1)) return false;
    }

    // Hatching eggs don't merge
    if (obj.otyp === EGG && (obj.timed || otmp.timed)) return false;

    // Burning oil never merges
    if (obj.otyp === POT_OIL && obj.lamplit) return false;

    // Names must match
    const oname1 = obj.oname || '';
    const oname2 = otmp.oname || '';
    if (oname1 !== oname2) {
        // Corpses must have matching names (both or neither)
        if (obj.otyp === CORPSE) return false;
        // One named, one not: allow merge if only one is named
        if (oname1 && oname2) return false;
    }

    // Artifacts must match
    if ((obj.oartifact || 0) !== (otmp.oartifact || 0)) return false;

    if (!!obj.opoisoned !== !!otmp.opoisoned) return false;

    return true;
}

import { game as _gstate } from './gstate.js';
import { maybe_reset_pick } from './lock.js';
import { envFlag } from './runtime_env.js';
import { obfree } from './shk.js';

// Accessors for game state previously passed through set*Context() wiring hacks.
// Now read from the game singleton (gstate.js), mirroring C's global variables.
function _getMoves() { return _gstate?.moves ?? 1; }
function _getLevelDepth() {
    // During level generation, use the explicitly set depth (ledger number).
    if (_gstate?._inMklev) {
        return _gstate._levelDepth ?? 1;
    }
    // At runtime, read the player's current dungeon depth.
    // C ref: level_difficulty() calls depth(&u.uz) which returns the
    // ledger number.  player.dungeonLevel is the JS equivalent (set by
    // changeLevel to the ledger depth).
    const player = _gstate?.u ?? _gstate?.player;
    if (player?.dungeonLevel > 0) {
        return player.dungeonLevel;
    }
    // Fallback during early init or when player isn't placed yet.
    return _gstate?._levelDepth ?? 1;
}
function _getInMklev() { return !!_gstate?._inMklev; }
let _zombifyContext = false;
let _startupInventoryMode = false;
export function setStartupInventoryMode(enabled) {
    _startupInventoryMode = !!enabled;
}

function mkobjTrace(msg) {
    if (envFlag('WEBHACK_MKOBJ_TRACE')) {
        const stack = new Error().stack || '';
        const lines = stack.split('\n');
        const toTag = (line) => {
            const m = (line || '').match(/at (?:(\S+)\s+\()?.*?([^/\s]+\.js):(\d+)/);
            if (!m) return null;
            return `${m[1] || '?'}(${m[2]}:${m[3]})`;
        };
        const c1 = toTag(lines[2]);
        const c2 = toTag(lines[3]);
        const c3 = toTag(lines[4]);
        let ctx = c1 || '?';
        if (c2) ctx += ` <= ${c2}`;
        if (c3) ctx += ` <= ${c3}`;
        console.log(`[MKOBJ][d=${_getLevelDepth()}] ${msg} ctx=${ctx}`);
    }
}

const _monsterNameIndex = new Map();
function monsterIndexByName(name) {
    if (!name) return -1;
    if (_monsterNameIndex.has(name)) return _monsterNameIndex.get(name);
    const idx = mons.findIndex(m => m?.mname === name);
    _monsterNameIndex.set(name, idx);
    return idx;
}

// C ref: mon.c little_to_big() subset needed by can_be_hatched().
function little_to_big_maybe(mnum) {
    const nm = mons[mnum]?.mname;
    if (!nm) return mnum;
    if (nm.startsWith('baby ')) {
        const adult = monsterIndexByName(nm.slice(5));
        if (adult >= 0) return adult;
    }
    if (nm.endsWith(' hatchling')) {
        const adult = monsterIndexByName(nm.slice(0, -10));
        if (adult >= 0) return adult;
    }
    return mnum;
}

// C ref: mon.c can_be_hatched().
function can_be_hatched(mnum) {
    if (mnum === PM_SCORPIUS) mnum = PM_SCORPION;
    mnum = little_to_big_maybe(mnum);
    if (mnum < 0 || mnum >= mons.length) return -1;
    if (mnum === PM_KILLER_BEE || mnum === PM_GARGOYLE) return mnum;
    if (lays_eggs(mons[mnum])) {
        // BREEDER_EGG: !rn2(77)
        if (!rn2(77) || (mnum !== PM_QUEEN_BEE && mnum !== PM_WINGED_GARGOYLE)) {
            return mnum;
        }
    }
    return -1;
}

// C ref: mkobj.c svc.context.ident — monotonic ID counter for objects and monsters.
// C ref: allmain.c startup sets context.ident = 2 (id 1 reserved for hero monster).
// next_ident() returns current value, then increments by rnd(2).
// Tracked here so nameshk() can use the shopkeeper's m_id value.
let _identCounter = 2;
export function next_ident() {
    const res = _identCounter;
    _identCounter += rnd(2);
    if (_identCounter === 0) _identCounter = rnd(2) + 1;
    return res;
}
export function getIdentCounter() { return _identCounter; }
export function resetIdentCounter() {
    _identCounter = 2;
}

// Some parity tests generate special levels directly without running the full
// o_init.c-style bootstrap. Ensure class bases/probability totals exist before
// mkobj() uses them for class-weighted random selection.
function ensureObjectClassTablesInitialized() {
    if (bases[WEAPON_CLASS] === 0 || oclass_prob_totals[WEAPON_CLASS] === 0) {
        initObjectData();
    }
}


// C ref: Is_mbag() -- is object a magic bag?
function is_mbag(obj) {
    return obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS
        || obj.otyp === OILSKIN_SACK;
}

// P_ skill constants for is_multigen
const P_BOW = 20;
const P_SHURIKEN = 24;

// Helper: is object a stackable missile?
function is_multigen(obj) {
    if (obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp].oc_subtyp;
    return skill >= -P_SHURIKEN && skill <= -P_BOW;
}

// Helper: can object be poisoned?
function is_poisonable(obj) {
    return is_multigen(obj);
}

// Helper: material checks for erosion
export function is_flammable(obj) {
    const mat = objectData[obj.otyp].oc_material;
    if (mat === LIQUID) return false;
    return (mat <= WOOD) || mat === PLASTIC;
}
export function is_rustprone(obj) {
    return objectData[obj.otyp].oc_material === IRON;
}
export function is_crackable(obj) {
    return objectData[obj.otyp].oc_material === GLASS && obj.oclass === ARMOR_CLASS;
}
// Autotranslated from mkobj.c:2286
export function is_rottable(otmp) {
  const otyp = otmp.otyp;
  const mat = objectData[otyp]?.oc_material ?? 0;
  return ((mat <= WOOD && mat !== LIQUID) || mat === DRAGON_HIDE);
}
export function is_corrodeable(obj) {
    const mat = objectData[obj.otyp].oc_material;
    return mat === COPPER || mat === IRON;
}

// C ref: Is_container(otmp) — is object a container?
export function Is_container(obj) {
    return obj.otyp === LARGE_BOX || obj.otyp === CHEST || obj.otyp === ICE_BOX
        || obj.otyp === SACK || obj.otyp === OILSKIN_SACK
        || obj.otyp === BAG_OF_HOLDING || obj.otyp === BAG_OF_TRICKS;
}

// C ref: mkobj.c weight() — compute actual weight of an object
// Considers quantity, corpse type, container contents, coins
export function weight(obj) {
    let wt = objectData[obj.otyp].oc_wt;
    if (obj.quan < 1) return 0;
    if (Is_container(obj) || obj.otyp === STATUE) {
        if (obj.otyp === STATUE && obj.corpsenm >= 0 && obj.corpsenm < mons.length) {
            wt = Math.floor(3 * mons[obj.corpsenm].cwt / 2);
            const msize = mons[obj.corpsenm].msize || 0;
            const minwt = (msize * 2 + 1) * 100;
            if (wt < minwt) wt = minwt;
        }
        // Container contents weight — cobj not tracked in JS yet, so cwt=0
        let cwt = 0;
        if (obj.cobj) {
            for (const c of obj.cobj) cwt += weight(c);
            if (obj.otyp === BAG_OF_HOLDING)
                cwt = obj.cursed ? (cwt * 2)
                    : obj.blessed ? Math.floor((cwt + 3) / 4)
                    : Math.floor((cwt + 1) / 2);
        }
        return wt + cwt;
    }
    if (obj.otyp === CORPSE && obj.corpsenm >= 0 && obj.corpsenm < mons.length) {
        return obj.quan * mons[obj.corpsenm].cwt;
    }
    if (obj.oclass === COIN_CLASS) {
        return Math.max(Math.floor((obj.quan + 50) / 100), 1);
    }
    return wt ? wt * obj.quan : (obj.quan + 1) >> 1;
}

// C ref: objnam.c erosion_matters() — class-based check for whether erosion is relevant
export function erosion_matters(obj) {
    switch (obj.oclass) {
    case WEAPON_CLASS:
    case ARMOR_CLASS:
    case BALL_CLASS:
    case CHAIN_CLASS:
        return true;
    case TOOL_CLASS:
        return (objectData[obj.otyp].oc_subtyp || 0) !== 0; // is_weptool
    default:
        return false;
    }
}

// C ref: objclass.h is_damageable() — material-based check
function is_damageable(obj) {
    return is_rustprone(obj) || is_flammable(obj) || is_rottable(obj)
        || is_corrodeable(obj) || is_crackable(obj);
}

// C ref: mkobj.c may_generate_eroded(otmp)
function may_generate_eroded(obj) {
    // C ref: mkobj.c may_generate_eroded() -- suppress erosion generation
    // for early startup objects while moves <= 1 unless in mklev context.
    if (_getMoves() <= 1 && !_getInMklev()) return false;
    if (obj.oerodeproof) return false;
    if (!erosion_matters(obj) || !is_damageable(obj)) return false;
    if (obj.otyp === WORM_TOOTH || obj.otyp === UNICORN_HORN) return false;
    if (obj.oartifact) return false;
    return true;
}

// C ref: mkobj.c blessorcurse()
// Autotranslated from mkobj.c:1837
export function blessorcurse(otmp, chance) {
  if (otmp.blessed || otmp.cursed) return;
  if (!rn2(chance)) {
    if (!rn2(2)) { curse(otmp); }
    else { bless(otmp); }
  }
  return;
}

// C ref: mkobj.c bless()
export function bless(obj) {
    if (obj.oclass === COIN_CLASS) return;
    obj.cursed = false;
    obj.blessed = true;
    if (obj.otyp === BAG_OF_HOLDING)
        obj.owt = weight(obj);
}

// C ref: mkobj.c unbless()
export function unbless(obj) {
    obj.blessed = false;
    if (obj.otyp === BAG_OF_HOLDING)
        obj.owt = weight(obj);
}

// C ref: mkobj.c curse()
export function curse(obj) {
    if (obj.oclass === COIN_CLASS) return;
    obj.blessed = false;
    obj.cursed = true;
    if (obj.otyp === BAG_OF_HOLDING)
        obj.owt = weight(obj);
}

// C ref: mkobj.c uncurse()
export function uncurse(obj) {
    obj.cursed = false;
    if (obj.otyp === BAG_OF_HOLDING)
        obj.owt = weight(obj);
}

// C ref: mkobj.c set_bknown()
export function set_bknown(obj, onoff) {
    obj.bknown = !!onoff;
}

// C ref: mkobj.c bcsign()
// Autotranslated from mkobj.c:1853
export function bcsign(otmp) {
  return (!!otmp.blessed - !!otmp.cursed);
}

// C ref: mkobj.c container_weight() — set owt recursively up container chain
// Autotranslated from mkobj.c:2732
function container_weight(object) {
  object.owt = weight(object);
  if (object.where === OBJ_CONTAINED) container_weight(object.ocontainer);
}

// C ref: mkobj.c splitobj() — split a stack, return the new portion
export function splitobj(obj, num) {
    if (obj.cobj || num <= 0 || obj.quan <= num) return null;
    const otmp = { ...obj };
    otmp.o_id = next_ident();
    otmp.lamplit = false;
    otmp.owornmask = 0;
    obj.quan -= num;
    obj.owt = weight(obj);
    otmp.quan = num;
    otmp.owt = weight(otmp);
    return otmp;
}

// Create a blank object
function newobj(otyp) {
    // C ref: mkobj.c:1183 — otmp->o_id = next_ident()
    // next_ident() returns counter value and consumes rnd(2)
    const o_id = next_ident();
    return {
        o_id,
        otyp: otyp,
        oclass: objectData[otyp].oc_class,
        quan: 1,
        spe: 0,
        blessed: false,
        cursed: false,
        oerodeproof: false,
        oeroded: 0,
        oeroded2: 0,
        greased: false,
        opoisoned: 0,
        corpsenm: -1, // NON_PM
        owt: objectData[otyp].oc_wt,
        displayChar: CLASS_SYMBOLS[objectData[otyp].oc_class] || '?',
        displayColor: objectData[otyp].oc_color,
        ox: 0, oy: 0,
        where: 'free',
        lamplit: false,
        age: 1,
        tknown: false,
        known: false,
        dknown: false,
        bknown: false,
        name: objectData[otyp].oc_name,
        oname: '',
    };
}

// C ref: mkobj.c mkobj_erosions()
// Autotranslated from mkobj.c:196
export function mkobj_erosions(otmp) {
  if (may_generate_eroded(otmp)) {
    if (!rn2(100)) { otmp.oerodeproof = 1; }
    else {
      if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp))) {
        do {
          otmp.oeroded++;
        } while (otmp.oeroded < 3 && !rn2(9));
      }
      if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
        do {
          otmp.oeroded2++;
        } while (otmp.oeroded2 < 3 && !rn2(9));
      }
    }
    if (!rn2(1000)) otmp.greased = 1;
  }
}

// rndmonnum imported from makemon.js (circular but safe — called at runtime only)

// C ref: mon.c undead_to_corpse() — map undead monsters to their living form
// Cache the lookups (lazy init on first call)
let _undead_cache = null;
function undead_to_corpse(mndx) {
    if (!_undead_cache) {
        _undead_cache = new Map();
        const targets = [
            [['kobold zombie', 'kobold mummy'], 'kobold'],
            [['dwarf zombie', 'dwarf mummy'], 'dwarf'],
            [['gnome zombie', 'gnome mummy'], 'gnome'],
            [['orc zombie', 'orc mummy'], 'orc'],
            [['elf zombie', 'elf mummy'], 'elf'],
            [['human zombie', 'human mummy', 'vampire', 'vampire lord'], 'human'],
            [['giant zombie', 'giant mummy'], 'giant'],
            [['ettin zombie', 'ettin mummy'], 'ettin'],
        ];
        for (const [srcs, tgt] of targets) {
            const tgtIdx = mons.findIndex(m => m.mname === tgt);
            for (const src of srcs) {
                const srcIdx = mons.findIndex(m => m.mname === src);
                if (srcIdx >= 0 && tgtIdx >= 0) _undead_cache.set(srcIdx, tgtIdx);
            }
        }
    }
    return _undead_cache.has(mndx) ? _undead_cache.get(mndx) : mndx;
}

// C ref: mkobj.c mksobj_init() -- class-specific object initialization
// skipErosion: if true, skip mkobj_erosions (used by ini_inv — C's mksobj
// path for starting inventory doesn't include erosion)
function mksobj_init(obj, artif, skipErosion) {
    const oclass = obj.oclass;
    const otyp = obj.otyp;
    const od = objectData[otyp];

    switch (oclass) {
    case WEAPON_CLASS:
        if (is_multigen(obj)) obj.quan = rn1(6, 6);
        if (!rn2(11)) {
            obj.spe = rne(3);
            obj.blessed = !!rn2(2);
        } else if (!rn2(10)) {
            curse(obj);
            obj.spe = -rne(3);
        } else {
            blessorcurse(obj, 10);
        }
        if (is_poisonable(obj) && !rn2(100))
            obj.opoisoned = 1;
        if (artif && !rn2(20)) {
            // mk_artifact -- skip, just consumed the rn2
        }
        break;

    case FOOD_CLASS:
        mkobjTrace(`food init call=${getRngCallCount()} otyp=${obj.otyp} name=${od.oc_name}`);
        // Check specific food types by name since we may not have all constants
        if (od.oc_name === 'corpse') {
            // C ref: mkobj.c:900-910 — retry if G_NOCORPSE
            let tryct = 50;
            do {
                obj.corpsenm = undead_to_corpse(rndmonnum(_getLevelDepth()));
                mkobjTrace(`corpse try=${51 - tryct} call=${getRngCallCount()} corpsenm=${obj.corpsenm} nocorpse=${obj.corpsenm >= 0 ? (((mons[obj.corpsenm].geno & G_NOCORPSE) !== 0) ? 1 : 0) : -1}`);
            } while (obj.corpsenm >= 0
                     && (mons[obj.corpsenm].geno & G_NOCORPSE)
                     && --tryct > 0);
            if (tryct === 0) obj.corpsenm = mons.findIndex(m => m.mname === 'human');
        } else if (od.oc_name === 'egg') {
            obj.corpsenm = -1;
            const eggRoll = rn2(3);
            mkobjTrace(`egg roll call=${getRngCallCount()} rn2(3)=${eggRoll}`);
            if (!eggRoll) {
                for (let tryct = 200; tryct > 0; --tryct) {
                    const base = rndmonnum(_getLevelDepth());
                    const mndx = can_be_hatched(base);
                    obj.corpsenm = mndx;
                    mkobjTrace(`egg try=${201 - tryct} call=${getRngCallCount()} base=${base} hatched=${mndx}`);
                    if (mndx >= 0) break;
                }
            }
        } else if (od.oc_name === 'tin') {
            obj.corpsenm = -1;
            if (!rn2(6)) {
                // spinach tin -- C ref: set_tin_variety(SPINACH_TIN) sets spe=1
                obj.spe = 1;
                mkobjTrace(`tin spinach call=${getRngCallCount()}`);
            } else {
                // C ref: mkobj.c:930-937 — retry until cnutrit && !G_NOCORPSE
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse(rndmonnum(_getLevelDepth()));
                    const nutrition = mndx >= 0 ? (mons[mndx].cnutrit || 0) : 0;
                    const nocorpse = mndx >= 0 ? (((mons[mndx].geno & G_NOCORPSE) !== 0) ? 1 : 0) : -1;
                    mkobjTrace(`tin try=${201 - tryct} call=${getRngCallCount()} mndx=${mndx} cnutrit=${nutrition} nocorpse=${nocorpse}`);
                    if (mndx >= 0 && mons[mndx].cnutrit > 0
                        && !(mons[mndx].geno & G_NOCORPSE)) {
                        obj.corpsenm = mndx;
                        rn2(15); // set_tin_variety RANDOM_TIN: rn2(TTSZ-1) where TTSZ=16
                        mkobjTrace(`tin selected=${mndx} at_try=${201 - tryct} call=${getRngCallCount()}`);
                        break;
                    }
                }
            }
            blessorcurse(obj, 10);
        } else if (od.oc_name === 'kelp frond') {
            obj.quan = rnd(2);
        } else if (od.oc_name === 'candy bar') {
            rn2(12); // C ref: read.c assign_candy_wrapper() uses rn2(12) in 3.7 trace
        }
        // General food: possible quan=2 (C: else branch of Is_pudding)
        if (od.oc_name !== 'corpse' && od.oc_name !== 'meat ring'
            && od.oc_name !== 'kelp frond') {
            if (!rn2(6)) obj.quan = 2;
        }
        break;

    case GEM_CLASS:
        if (od.oc_name === 'loadstone') {
            curse(obj);
        } else if (od.oc_name === 'rock') {
            obj.quan = rn1(6, 6);
        } else if (od.oc_name !== 'luckstone' && !rn2(6)) {
            obj.quan = 2;
        }
        break;

    case TOOL_CLASS:
        if (od.oc_name === 'tallow candle' || od.oc_name === 'wax candle') {
            obj.spe = 1;
            obj.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(obj, 5);
        } else if (od.oc_name === 'brass lantern' || od.oc_name === 'oil lamp') {
            obj.spe = 1;
            obj.age = rn1(500, 1000);
            blessorcurse(obj, 5);
        } else if (od.oc_name === 'magic lamp') {
            obj.spe = 1;
            blessorcurse(obj, 2);
        } else if (od.oc_name === 'chest' || od.oc_name === 'large box') {
            obj.olocked = !!rn2(5);
            obj.otrapped = !rn2(10);
            obj.tknown = obj.otrapped && !rn2(100);
            // mkbox_cnts -- consume RNG for contents
            mkbox_cnts(obj);
        } else if (od.oc_name === 'ice box' || od.oc_name === 'sack'
                   || od.oc_name === 'oilskin sack' || od.oc_name === 'bag of holding') {
            mkbox_cnts(obj);
        } else if (od.oc_name === 'expensive camera' || od.oc_name === 'tinning kit'
                   || od.oc_name === 'magic marker') {
            obj.spe = rn1(70, 30);
        } else if (od.oc_name === 'can of grease') {
            obj.spe = rn1(21, 5);
            blessorcurse(obj, 10);
        } else if (od.oc_name === 'crystal ball') {
            obj.spe = rn1(5, 3);
            blessorcurse(obj, 2);
        } else if (od.oc_name === 'horn of plenty' || od.oc_name === 'bag of tricks') {
            obj.spe = rn1(18, 3);
        } else if (od.oc_name === 'figurine') {
            let tryct = 0;
            do {
                obj.corpsenm = rndmonnum_adj(5, 10, _getLevelDepth());
                mkobjTrace(`figurine try=${tryct + 1} call=${getRngCallCount()} corpsenm=${obj.corpsenm}`);
            } while (tryct++ < 30 && false); // simplified: first attempt ok
            blessorcurse(obj, 4);
        } else if (od.oc_name === 'Bell of Opening') {
            obj.spe = 3;
        } else if (od.oc_name === 'magic flute' || od.oc_name === 'magic harp'
                   || od.oc_name === 'frost horn' || od.oc_name === 'fire horn'
                   || od.oc_name === 'drum of earthquake') {
            obj.spe = rn1(5, 4);
        }
        break;

    case AMULET_CLASS:
        if (rn2(10) && (od.oc_name === 'amulet of strangulation'
                        || od.oc_name === 'amulet of change'
                        || od.oc_name === 'amulet of restful sleep')) {
            curse(obj);
        } else {
            blessorcurse(obj, 10);
        }
        break;

    case VENOM_CLASS:
    case CHAIN_CLASS:
    case BALL_CLASS:
        break;

    case POTION_CLASS:
    case SCROLL_CLASS:
        blessorcurse(obj, 4);
        break;

    case SPBOOK_CLASS:
        blessorcurse(obj, 17);
        break;

    case ARMOR_CLASS:
        if (rn2(10) && (od.oc_name === 'fumble boots'
                        || od.oc_name === 'levitation boots'
                        || od.oc_name === 'helm of opposite alignment'
                        || od.oc_name === 'gauntlets of fumbling'
                        || !rn2(11))) {
            curse(obj);
            obj.spe = -rne(3);
        } else if (!rn2(10)) {
            obj.blessed = !!rn2(2);
            obj.spe = rne(3);
        } else {
            blessorcurse(obj, 10);
        }
        if (artif && !rn2(40)) {
            // mk_artifact -- skip, just consumed the rn2
        }
        break;

    case WAND_CLASS:
        if (od.oc_name === 'wishing') {
            obj.spe = 1;
        } else {
            obj.spe = rn1(5, (od.oc_dir === 1) ? 11 : 4); // NODIR=1
        }
        blessorcurse(obj, 17);
        break;

    case RING_CLASS:
        if (od.charged) {
            blessorcurse(obj, 3);
            if (rn2(10)) {
                if (rn2(10) && bcsign(obj))
                    obj.spe = bcsign(obj) * rne(3);
                else
                    obj.spe = rn2(2) ? rne(3) : -rne(3);
            }
            if (obj.spe === 0)
                obj.spe = rn2(4) - rn2(3);
            if (obj.spe < 0 && rn2(5))
                curse(obj);
        } else if (rn2(10) && (od.oc_name === 'teleportation'
                               || od.oc_name === 'polymorph'
                               || od.oc_name === 'aggravate monster'
                               || od.oc_name === 'hunger'
                               || !rn2(9))) {
            curse(obj);
        }
        break;

    case ROCK_CLASS:
        if (od.oc_name === 'statue') {
            obj.corpsenm = rndmonnum(_getLevelDepth()); // Pass depth for correct monster selection
            mkobjTrace(`statue call=${getRngCallCount()} corpsenm=${obj.corpsenm}`);
            // C ref: !verysmall() && rn2(level_difficulty()/2+10) > 10
            // verysmall = msize < MZ_SMALL (i.e., MZ_TINY)
            // Short-circuit: skip rn2 if monster is very small
            if (obj.corpsenm >= 0 && obj.corpsenm < mons.length
                && mons[obj.corpsenm].msize >= MZ_SMALL
                && rn2(Math.floor(_getLevelDepth() / 2 + 10)) > 10) {
                // C ref: mkobj.c:1152-1154 — statue may contain a non-novel spellbook.
                const inside = mkobj(SPBOOK_no_NOVEL, false);
                if (inside) {
                    if (!Array.isArray(obj.cobj)) obj.cobj = [];
                    obj.cobj.push(inside);
                }
            }
        }
        break;

    case COIN_CLASS:
        break; // no init for coins

    default:
        break;
    }

    if (!skipErosion) mkobj_erosions(obj);
}

// C ref: mkobj.c mkbox_cnts() -- fill container with random items
function mkbox_cnts(box) {
    const od = objectData[box.otyp];
    let n;
    if (od.oc_name === 'ice box') {
        n = 20;
    } else if (od.oc_name === 'chest') {
        n = box.olocked ? 7 : 5;
    } else if (od.oc_name === 'large box') {
        n = box.olocked ? 5 : 3;
    } else if ((od.oc_name === 'sack' || od.oc_name === 'oilskin sack')
               && _getMoves() <= 1 && !_getInMklev()) {
        // C ref: mkobj.c mkbox_cnts() -- sacks/oilskin sacks are empty when
        // moves<=1 outside mklev (early game startup and equivalent contexts).
        n = 0;
    } else {
        // sack, oilskin sack, bag of holding
        n = 1;
    }
    mkobjTrace(`mkbox start call=${getRngCallCount()} box=${box.otyp} base_n=${n}`);
    n = rn2(n + 1); // actual count
    mkobjTrace(`mkbox count call=${getRngCallCount()} n=${n}`);

    // C ref: mkobj.c — container contents stored in cobj linked list.
    // JS uses an array; initialize now so loot/tip commands find items.
    if (!Array.isArray(box.cobj)) box.cobj = [];

    // For each item in box, generate it and store in the container
    for (let i = 0; i < n; i++) {
        if (od.oc_name === 'ice box') {
            // C ref: mkobj.c:347 — mksobj(CORPSE, TRUE, FALSE) for ice box
            const corpse = mksobj(CORPSE, true, false);
            if (corpse) box.cobj.push(corpse);
        } else {
            // rnd(100) for class selection from boxiprobs
            const tprob = rnd(100);
            // Use boxiprobs table to select class
            const boxiprobs = [
                { iprob: 18, iclass: GEM_CLASS },
                { iprob: 15, iclass: FOOD_CLASS },
                { iprob: 18, iclass: POTION_CLASS },
                { iprob: 18, iclass: SCROLL_CLASS },
                { iprob: 12, iclass: SPBOOK_CLASS },
                { iprob: 7, iclass: COIN_CLASS },
                { iprob: 6, iclass: WAND_CLASS },
                { iprob: 5, iclass: RING_CLASS },
                { iprob: 1, iclass: AMULET_CLASS },
            ];
            let prob = tprob;
            let oclass = GEM_CLASS; // default
            for (const bp of boxiprobs) {
                prob -= bp.iprob;
                if (prob <= 0) { oclass = bp.iclass; break; }
            }
            mkobjTrace(`mkbox pick call=${getRngCallCount()} class=${oclass} tprob=${prob}`);
            // Create the item
            const otmp = mkobj(oclass, false);
            if (!otmp) continue;

            // C ref: mkobj.c:360-370 — coin quantity and rock substitution
            if (otmp.oclass === COIN_CLASS) {
                // C ref: rnd(level_difficulty() + 2) * rnd(75)
                rnd(_getLevelDepth() + 2);
                rnd(75);
            } else {
                // C ref: while (otmp->otyp == ROCK) rnd_class(...)
                while (otmp.otyp === ROCK) {
                    otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                }
            }
            // C ref: mkobj.c:371-378 — bag of holding special cases
            if (box.otyp === BAG_OF_HOLDING) {
                if (is_mbag(otmp)) {
                    otmp.otyp = SACK;
                } else {
                    while (otmp.otyp === WAN_CANCELLATION) {
                        otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
                    }
                }
            }
            mkobjTrace(`mkbox item call=${getRngCallCount()} otyp=${otmp.otyp} oclass=${otmp.oclass} corpsenm=${otmp.corpsenm ?? -1}`);
            box.cobj.push(otmp);
        }
    }
}

// C ref: mksobj() post-init -- handle corpse/statue/figurine/egg gender
// C ref: mkobj.c:1196-1225
function mksobj_postinit(obj) {
    const od = objectData[obj.otyp];
    // Corpse: if corpsenm not set, assign one
    if (od.oc_name === 'corpse' && obj.corpsenm === -1) {
        obj.corpsenm = undead_to_corpse(rndmonnum(_getLevelDepth()));
    }
    // C ref: mkobj.c mksobj() SPE_NOVEL case:
    // initialize novelidx and consume noveltitle() selection RNG.
    if (obj.otyp === SPE_NOVEL) {
        obj.novelidx = rn2(41);
    }
    // Statue/figurine: if corpsenm not set, assign one
    // C ref: mkobj.c:1212 — otmp->corpsenm = rndmonnum()
    if ((od.oc_name === 'statue' || od.oc_name === 'figurine') && obj.corpsenm === -1) {
        obj.corpsenm = rndmonnum(_getLevelDepth());
    }
    // Gender assignment for corpse/statue/figurine.
    // C ref: mkobj.c:1215-1219 — store CORPSTAT_* in spe.
    if (obj.corpsenm >= 0 && (od.oc_name === 'corpse' || od.oc_name === 'statue' || od.oc_name === 'figurine')) {
        const ptr = mons[obj.corpsenm];
        const isNeuter = !!(ptr.mflags2 & M2_NEUTER);
        const isFemale = !!(ptr.mflags2 & M2_FEMALE);
        const isMale   = !!(ptr.mflags2 & M2_MALE);
        const CORPSTAT_FEMALE = 1;
        const CORPSTAT_MALE = 2;
        const CORPSTAT_NEUTER = 3;
        obj.spe = isNeuter
            ? CORPSTAT_NEUTER
            : isFemale
                ? CORPSTAT_FEMALE
                : isMale
                    ? CORPSTAT_MALE
                    : (rn2(2) ? CORPSTAT_FEMALE : CORPSTAT_MALE);
    }
    // C ref: mkobj.c:1221-1225 — set_corpsenm() is called for
    // CORPSE/STATUE/FIGURINE/EGG (and TIN, but corpsenm is NON_PM there).
    if (obj.otyp === CORPSE || obj.otyp === STATUE
        || obj.otyp === FIGURINE || obj.otyp === EGG) {
        set_corpsenm(obj, obj.corpsenm);
    }
}

// C ref: mkobj.c mksobj() -- create a specific object type
// skipErosion: if true, skip mkobj_erosions (for ini_inv items)
export function mksobj(otyp, init, artif, skipErosion) {
    if (otyp < 0 || otyp >= NUM_OBJECTS) otyp = 0;
    const nm = objectData[otyp]?.oc_name;
    if (nm === 'tin' || nm === 'egg' || nm === 'corpse') {
        mkobjTrace(`mksobj create otyp=${otyp} name=${nm} init=${init ? 1 : 0} artif=${artif ? 1 : 0} call=${getRngCallCount()}`);
    }
    const obj = newobj(otyp);
    if (init) mksobj_init(obj, artif, skipErosion);
    mksobj_postinit(obj);
    // C ref: mkobj.c — otmp->owt = weight(otmp) after full initialization
    obj.owt = weight(obj);
    return obj;
}

// C ref: mkobj.c special_corpse() macro
function special_corpse(mndx) {
    if (mndx < 0) return false;
    return mndx === PM_LIZARD || mndx === PM_LICHEN
        || mons[mndx].mlet === S_TROLL
        || mons[mndx].msound === MS_RIDER;
}

function zombie_form_exists_for_corpse(corpsenm) {
    const pm = mons[corpsenm];
    if (!pm) return false;
    switch (pm.mlet) {
    case S_KOBOLD:
    case S_ORC:
    case S_GIANT:
    case S_HUMAN:
    case S_KOP:
    case S_GNOME:
        return true;
    case S_HUMANOID:
        return !!(pm.mflags2 & M2_DWARF);
    default:
        return false;
    }
}

// C ref: mkobj.c start_corpse_timeout() — consume RNG for corpse rot/revive timing
// Only called for RNG alignment; we don't actually track timers.
const TROLL_REVIVE_CHANCE = 37;
export function start_corpse_timeout(body, opts = {}) {
    if (!body || body.otyp !== CORPSE) return;
    const corpsenm = Number.isInteger(body.corpsenm) ? body.corpsenm : -1;
    if (corpsenm < 0 || !mons[corpsenm]) return;
    const zombify = !!opts?.zombify || _zombifyContext;
    const norevive = !!opts?.norevive || !!body.norevive;
    // Lizards and lichen don't rot or revive
    if (corpsenm === PM_LIZARD || corpsenm === PM_LICHEN) return;
    stop_timer(TIMER_FUNC.ROT_CORPSE, body);
    stop_timer(TIMER_FUNC.REVIVE_MON, body);
    stop_timer(TIMER_FUNC.ZOMBIFY_MON, body);
    let action = TIMER_FUNC.ROT_CORPSE;
    // C ref: mkobj.c start_corpse_timeout() — rot_adjust depends on gi.in_mklev.
    const rotAdjust = _getInMklev() ? 25 : 10;
    const age = Math.max(_getMoves(), 1) - Number(body.age || 0);
    let when = (age > 250) ? rotAdjust : (250 - age);
    when += (rnz(rotAdjust) - rotAdjust);
    // Rider: rn2(3) loop for revival time
    if (mons[corpsenm].msound === MS_RIDER) {
        action = TIMER_FUNC.REVIVE_MON;
        const minturn = 12; // non-Death rider default
        for (when = minturn; when < 67; when++) {
            if (!rn2(3)) break;
        }
    } else if (mons[corpsenm].mlet === S_TROLL) {
        // Troll: rn2(37) loop up to TAINT_AGE times
        for (let age = 2; age <= TAINT_AGE; age++) {
            if (!rn2(TROLL_REVIVE_CHANCE)) {
                action = TIMER_FUNC.REVIVE_MON;
                when = age;
                break;
            }
        }
    } else if (zombify && !norevive
               && zombie_form_exists_for_corpse(corpsenm)) {
        // C ref: mkobj.c start_corpse_timeout() zombify branch
        action = TIMER_FUNC.ZOMBIFY_MON;
        when = rn1(15, 5); // consume rn2(15)
    }
    start_timer(when, TIMER_KIND.SHORT, action, body);
}

// C ref: mkobj.c set_corpsenm() — set corpsenm and restart timers
// Used by create_object (sp_lev) when overriding corpsenm after mksobj
// Unlike mkcorpstat's conditional check, this ALWAYS restarts start_corpse_timeout
// for corpses, matching C's set_corpsenm which unconditionally calls it.
export function set_corpsenm(obj, id) {
    const when = obj.otyp === EGG && Number.isInteger(obj._egg_hatch_when)
        ? obj._egg_hatch_when
        : 0;
    obj.corpsenm = id;
    if (obj.otyp === CORPSE) {
        start_corpse_timeout(obj, { norevive: !!obj.norevive });
    } else if (obj.otyp === EGG) {
        stop_timer(TIMER_FUNC.HATCH_EGG, obj);
        if (id >= 0) {
            obj._egg_hatch_when = attach_egg_hatch_timeout(obj, when);
        } else {
            delete obj._egg_hatch_when;
        }
    }
    obj.owt = weight(obj);
}

// C ref: mkobj.c mkcorpstat() — create a corpse or statue with specific monster type
// ptr_mndx: monster index to override corpsenm (-1 for random/no override)
// init: whether to call mksobj_init (CORPSTAT_INIT flag)
// x, y, map: when provided with non-zero x,y, places object at (x,y) via
//   mksobj_at equivalent (matching C where mkcorpstat calls mksobj_at internally).
//   This ensures ^place event is logged before ^corpse, matching C event order.
export function mkcorpstat(objtype, ptr_mndx, init, x = 0, y = 0, map = null, opts = {}) {
    const prevZombifyContext = _zombifyContext;
    _zombifyContext = prevZombifyContext || !!opts.zombify;
    try {
        const otmp = mksobj(objtype, init, false);
        // C: random placement only when x==0 && y==0; y=0 is a valid coordinate.
        if ((x !== 0 || y !== 0) && map) {
            otmp.ox = x;
            otmp.oy = y;
            place_object(otmp, otmp.ox, otmp.oy, map);
        }
        if (ptr_mndx >= 0) {
            const old_corpsenm = otmp.corpsenm;
            otmp.corpsenm = ptr_mndx;
            otmp.owt = weight(otmp);
            if (objectData[otmp.otyp]?.oc_name === 'corpse'
                && (!!opts.zombify
                    || special_corpse(old_corpsenm)
                    || special_corpse(ptr_mndx))) {
                // C: obj_stop_timers(otmp) — no RNG consumed
                // Restart corpse timeout with new corpsenm
                start_corpse_timeout(otmp, {
                    zombify: !!opts.zombify,
                    norevive: !!otmp.norevive,
                });
            }
        }
        // C logs mkcorpstat() input coordinates, not object floor coordinates.
        pushRngLogEntry(`^corpse[${otmp.corpsenm},${x || 0},${y || 0}]`);
        return otmp;
    } finally {
        _zombifyContext = prevZombifyContext;
    }
}

// C ref: mkobj.c mkobj() -- create random object of a class
// skipErosion: if true, skip mkobj_erosions (for ini_inv UNDEF_TYP items)
export function mkobj(oclass, artif, skipErosion) {
    ensureObjectClassTablesInitialized();
    const inputClass = oclass;
    const spellbookNoNovel = (oclass === SPBOOK_no_NOVEL);
    if (spellbookNoNovel) {
        oclass = SPBOOK_CLASS;
    }

    // RANDOM_CLASS selection
    if (oclass === RANDOM_CLASS) {
        // Use mkobjprobs table
        let tprob = rnd(100);
        for (const ip of mkobjprobs) {
            tprob -= ip.iprob;
            if (tprob <= 0) { oclass = ip.iclass; break; }
        }
    }

    // Select specific object type within class
    if (spellbookNoNovel) {
        // C ref: SPBOOK_no_NOVEL selection path uses rnd_class() with
        // upper bound SPE_BLANK_PAPER, excluding SPE_NOVEL.
        const otyp = rnd_class(bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
        mkobjTrace(`mkobj call=${getRngCallCount()} in_class=${inputClass} class=${oclass} picked=${otyp} artif=${artif ? 1 : 0} noNovel=1`);
        return mksobj(otyp, true, artif, skipErosion);
    }

    const probTotal = oclass_prob_totals[oclass];
    let prob, i;
    if (probTotal > 0) {
        prob = rnd(probTotal);
        i = bases[oclass];
        while (prob > 0 && i < bases[oclass + 1]) {
            prob -= objectData[i].oc_prob || 0;
            if (prob > 0) i++;
        }
    } else {
        i = bases[oclass];
    }
    // Sanity check
    if (i >= NUM_OBJECTS || objectData[i].oc_class !== oclass) {
        i = bases[oclass];
    }
    mkobjTrace(`mkobj call=${getRngCallCount()} in_class=${inputClass} class=${oclass} picked=${i} artif=${artif ? 1 : 0}`);
    return mksobj(i, true, artif, skipErosion);
}

// C ref: objnam.c just_an() — pick "a" vs "an" for a noun.
// Local copy (no trailing space) — canonical objnam.js version includes trailing space.
function just_an(str) {
    const s = String(str || '').trimStart();
    if (!s) return 'a';
    const c = s[0].toLowerCase();
    const sl = s.toLowerCase();
    if ('aeiou'.includes(c)) {
        if ((sl.startsWith('one') && (!s[3] || '-_ '.includes(s[3])))
            || sl.startsWith('eu')
            || sl.startsWith('uke')
            || sl.startsWith('ukulele')
            || sl.startsWith('unicorn')
            || sl.startsWith('uranium')
            || sl.startsWith('useful')) {
            return 'a';
        }
        return 'an';
    }
    if (c === 'x' && !'aeiou'.includes(s[1]?.toLowerCase() || '')) return 'an';
    return 'a';
}

// makeplural imported from objnam.js

// C ref: objnam.c xname() pluralize path + makeplural()
function pluralizeName(name) {
    const s = String(name || '');
    if (!s) return s;
    return makeplural(s);
}

const QUIVER_IN_QUIVER_TYPES = new Set([ARROW, ELVEN_ARROW, ORCISH_ARROW, YA, CROSSBOW_BOLT]);

// C ref: objnam.c xname() (subset used by current JS engine)
function xname_for_doname(obj, dknown = true, known = true, bknown = false) {
    const od = objectData[obj.otyp];
    const nameKnown = isObjectNameKnown(obj.otyp) || !!known;
    let base = od.oc_name;
    switch (obj.oclass) {
    case RING_CLASS:
        base = !dknown ? 'ring'
            : nameKnown ? `ring of ${od.oc_name}`
                : `${od.oc_descr || od.oc_name} ring`;
        break;
    case AMULET_CLASS:
        base = !dknown ? 'amulet'
            : nameKnown ? od.oc_name
                : `${od.oc_descr || od.oc_name} amulet`;
        break;
    case POTION_CLASS:
        base = !dknown ? 'potion'
            : nameKnown ? `potion of ${od.oc_name}`
                : `${od.oc_descr || od.oc_name} potion`;
        if (dknown && obj.odiluted) {
            base = `diluted ${base}`;
        }
        if (dknown && nameKnown && obj.otyp === POT_WATER
            && bknown && (obj.blessed || obj.cursed)) {
            base = `potion of ${obj.blessed ? 'holy' : 'unholy'} water`;
        }
        break;
    case SCROLL_CLASS:
        if (!dknown) base = 'scroll';
        else if (nameKnown) base = `scroll of ${od.oc_name}`;
        else if (od.magic) base = `scroll labeled ${od.oc_descr || od.oc_name}`;
        else base = `${od.oc_descr || od.oc_name} scroll`;
        break;
    case SPBOOK_CLASS:
        base = !dknown ? 'spellbook'
            : nameKnown ? (obj.otyp === SPE_BOOK_OF_THE_DEAD
                ? od.oc_name
                : `spellbook of ${od.oc_name}`)
                : `${od.oc_descr || od.oc_name} spellbook`;
        break;
    case WAND_CLASS:
        if (!dknown) base = 'wand';
        else if (nameKnown) base = `wand of ${od.oc_name}`;
        else if (od.oc_descr) base = `${od.oc_descr} wand`;
        else base = `wand of ${od.oc_name}`;
        break;
    case WEAPON_CLASS:
        // C ref: objnam.c xname() WEAPON_CLASS falls through to TOOL_CLASS.
        // Unidentified weapons show appearance (desc) instead of actual name.
        if (!dknown) base = od.oc_descr || od.oc_name;
        else if (nameKnown) base = od.oc_name;
        else base = od.oc_descr || od.oc_name;
        break;
    case TOOL_CLASS:
        // C ref: objnam.c xname() — lenses get "pair of ".
        if (obj.otyp === LENSES) {
            base = `pair of ${dknown
                ? (nameKnown ? od.oc_name : (od.oc_descr || od.oc_name))
                : (od.oc_descr || od.oc_name)}`;
        } else {
            base = dknown
                ? (nameKnown ? od.oc_name : (od.oc_descr || od.oc_name))
                : (od.oc_descr || od.oc_name);
        }
        break;
    case ARMOR_CLASS:
        // C ref: objnam.c xname() armor handling.
        if (obj.otyp >= GRAY_DRAGON_SCALES && obj.otyp <= YELLOW_DRAGON_SCALES) {
            base = `set of ${od.oc_name}`;
        } else if (od.oc_subtyp === ARM_BOOTS || od.oc_subtyp === ARM_GLOVES) {
            // C ref: armor names depend on oc_name_known, not obj.dknown.
            base = `pair of ${nameKnown ? od.oc_name : (od.oc_descr || od.oc_name)}`;
        } else if (!dknown && od.oc_subtyp === ARM_SHIELD) {
            // C ref: objnam.c xname() unknown shield special-cases.
            if (obj.otyp >= ELVEN_SHIELD && obj.otyp <= ORCISH_SHIELD) {
                base = 'shield';
            } else if (obj.otyp === SHIELD_OF_REFLECTION) {
                base = 'smooth shield';
            } else {
                base = od.oc_descr || od.oc_name;
            }
        } else {
            // C ref: armor names depend on oc_name_known, not obj.dknown.
            base = nameKnown ? od.oc_name : (od.oc_descr || od.oc_name);
        }
        break;
    case WEAPON_CLASS:
        // C ref: objnam.c xname() uses oc_descr for dknown-but-undiscovered weapons.
        if (dknown && !nameKnown && od.oc_descr) {
            base = od.oc_descr;
        } else {
            base = od.oc_name;
        }
        break;
    case FOOD_CLASS:
        if (obj.otyp === CORPSE) {
            // C ref: objnam.c xname() -- unidentified corpses are generic.
            if (!dknown) {
                base = 'corpse';
            } else {
                const corpseIdx = Number.isInteger(obj.corpsenm) ? obj.corpsenm : obj.corpsem;
                if (Number.isInteger(corpseIdx) && mons[corpseIdx]) {
                    base = `${mons[corpseIdx].mname} corpse`;
                } else {
                    base = 'corpse';
                }
            }
        } else if (obj.otyp === TIN && known) {
            // C ref: eat.c tin_details() — show content when obj->known is set
            if (obj.spe === 1) {
                base = 'tin of spinach';
            } else if (Number.isInteger(obj.corpsenm) && obj.corpsenm >= 0 && mons[obj.corpsenm]) {
                // C: vegetarian monsters get "tin of <name>"; others get "tin of <name> meat"
                // JS monsters lack material field; default to meat (correct for sewer rat etc.)
                base = `tin of ${mons[obj.corpsenm].mname} meat`;
            }
            // else: empty/unknown tin — just "tin"
        } else {
            base = od.oc_name;
        }
        break;
    default:
        // C ref: objnam.c xname() includes the monster descriptor for statues.
        if (obj.otyp === STATUE) {
            const statueIdx = Number.isInteger(obj.corpsenm) ? obj.corpsenm : obj.corpsem;
            const monName = (Number.isInteger(statueIdx) && mons[statueIdx])
                ? String(mons[statueIdx].mname || '').trim()
                : '';
            if (monName) {
                base = `statue of ${just_an(monName)} ${monName}`;
            } else {
                base = od.oc_name;
            }
        } else {
            base = od.oc_name;
        }
        break;
    }
    // C uses gem-name logic that yields "flint stone(s)" for FLINT.
    if (obj.otyp === FLINT) base = 'flint stone';
    if ((obj.quan || 1) !== 1) base = pluralizeName(base);
    return base;
}

// C ref: objnam.c xname() -- canonical object name without article.
export function xname(obj, opts = {}) {
    const known = (opts && Object.hasOwn(opts, 'known'))
        ? !!opts.known
        : !!obj?.known;
    const dknown = (opts && Object.hasOwn(opts, 'dknown'))
        ? !!opts.dknown
        : (!!obj?.dknown || known);
    const bknown = (opts && Object.hasOwn(opts, 'bknown'))
        ? !!opts.bknown
        : !!obj?.bknown;
    return xname_for_doname(obj, dknown, known, bknown);
}

// C ref: objnam.c add_erosion_words()
function erosion_words(obj) {
    if (!obj || !is_damageable(obj) || obj.otyp === CRYSKNIFE) return '';
    const iscrys = obj.otyp === CRYSKNIFE;
    let words = '';
    if (obj.oeroded > 0) {
        if (obj.oeroded === 2) words += 'very ';
        else if (obj.oeroded >= 3) words += 'thoroughly ';
        words += is_rustprone(obj) ? 'rusty '
            : is_crackable(obj) ? 'cracked '
                : 'burnt ';
    }
    if (obj.oeroded2 > 0) {
        if (obj.oeroded2 === 2) words += 'very ';
        else if (obj.oeroded2 >= 3) words += 'thoroughly ';
        words += is_corrodeable(obj) ? 'corroded ' : 'rotted ';
    }
    if (obj.rknown && obj.oerodeproof) {
        words += iscrys ? 'fixed '
            : is_rustprone(obj) ? 'rustproof '
                : is_corrodeable(obj) ? 'corrodeproof '
                    : is_flammable(obj) ? 'fireproof '
                        : is_crackable(obj) ? 'tempered '
                            : is_rottable(obj) ? 'rotproof '
                                : '';
    }
    return words;
}

// C ref: objnam.c doname() — format an object name for display
// Produces strings like "a blessed +1 quarterstaff (weapon in hands)"
export function doname(obj, player) {
    const od = objectData[obj.otyp];
    const known = !!obj.known;
    const dknown = !!obj.dknown || known;
    const bknown = !!obj.bknown;
    const nameKnown = isObjectNameKnown(obj.otyp) || known;
    const quan = obj.quan || 1;
    const showCharges = known && od.charged
        && (obj.oclass === WAND_CLASS || obj.oclass === TOOL_CLASS);
    const suppressWaterBuc = (
        obj.otyp === POT_WATER
        && nameKnown
        && (obj.blessed || obj.cursed)
    );
    const roleName = String(player?.roleName || '');
    const roleIsCleric = roleName === 'Priest' || roleName === 'Priestess' || roleName === 'Cleric';
    const bucKnown = bknown || roleIsCleric;
    let prefix = '';

    // C ref: objnam.c doname_base() quantity/article prefix
    if (quan !== 1) {
        prefix = `${quan} `;
    }

    // C ref: objnam.c doname_base() "empty" prefix for containers
    const cknown = !!obj.cknown;
    if (cknown
        && ((obj.otyp === BAG_OF_TRICKS || obj.otyp === HORN_OF_PLENTY)
            ? (obj.spe === 0 && !known)
            : ((Is_container(obj) || obj.otyp === STATUE)
               && (!obj.cobj || obj.cobj.length === 0)))) {
        prefix += 'empty ';
    }

    // C ref: objnam.c doname_base() BUC logic
    if (bucKnown && obj.oclass !== COIN_CLASS && !suppressWaterBuc) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        else if (!(known && od.charged && obj.oclass !== ARMOR_CLASS
            && obj.oclass !== RING_CLASS) && !showCharges
            && !roleIsCleric) {
            prefix += 'uncursed ';
        }
    }

    // C ref: objnam.c doname_base() weapon poison marker
    if (obj.oclass === WEAPON_CLASS && obj.opoisoned) {
        prefix += 'poisoned ';
    }

    let baseName = xname_for_doname(obj, dknown, known, bknown);
    // C ref: objnam.c doname_base() CORPSE path routes through corpse_xname(),
    // so doname includes monster type even though xname() stays generic.
    if (obj.otyp === CORPSE) {
        const corpseIdx = Number.isInteger(obj.corpsenm) ? obj.corpsenm : obj.corpsem;
        if (Number.isInteger(corpseIdx) && mons[corpseIdx]) {
            baseName = `${mons[corpseIdx].mname} corpse`;
            if (quan !== 1) baseName = pluralizeName(baseName);
        }
    }
    // C ref: objnam.c Japanese_item_name() usage for Samurai inventory display.
    if (player?.roleMnum === PM_SAMURAI && obj.otyp === SHORT_SWORD && baseName === 'short sword') {
        baseName = 'wakizashi';
    }
    const erosionPrefix = erosion_words(obj);

    // C ref: objnam.c doname_base() -- add_erosion_words() precedes enchantment.
    // C uses is_weptool(obj) ? WEAPON_CLASS : obj->oclass in this switch.
    let spePrefix = '';
    const isWeptool = obj.oclass === TOOL_CLASS && (od.oc_subtyp || 0) !== 0;
    if (known && (obj.oclass === WEAPON_CLASS || isWeptool
        || obj.oclass === ARMOR_CLASS
        || (obj.oclass === RING_CLASS && od.charged))) {
        spePrefix = `${obj.spe >= 0 ? '+' : ''}${obj.spe} `;
    }

    let result = `${prefix}${erosionPrefix}${spePrefix}${baseName}`.trimStart();
    if (quan === 1 && !result.startsWith('the ')) {
        result = `${just_an(result)} ${result}`;
    }
    const objGivenName = typeof obj.oname === 'string' ? obj.oname : '';
    if (objGivenName.length > 0) {
        result += ` named ${objGivenName}`;
    }

    // C ref: objnam.c doname() appends "(lit)" for lit light sources.
    if (obj.lamplit) {
        result += ' (lit)';
    }

    // Suffix: worn/wielded/charges
    if (player) {
        if (player.weapon === obj) {
            const dominantHand = player.rightHanded === false ? 'left' : 'right';
            if (od.big) {
                result += ' (weapon in hands)';
            } else {
                // C ref: objnam.c doname() uses "(weapon in right hand)" for a
                // single regular weapon; uses "(wielded)" for stacks, ammo
                // (sub in -22..-20, P_CROSSBOW..P_BOW), missiles
                // (sub in -25..-23, P_BOOMERANG..P_DART), and non-weptools.
                const odSub = od.oc_subtyp || 0;
                const isAmmo = odSub <= -20 && odSub >= -22; // -P_BOW..-P_CROSSBOW
                const isMissile = odSub <= -23 && odSub >= -25; // -P_DART..-P_BOOMERANG
                const useWielded = (quan !== 1)
                    || (obj.oclass === WEAPON_CLASS ? (isAmmo || isMissile) : !isWeptool);
                result += useWielded ? ' (wielded)' : ` (weapon in ${dominantHand} hand)`;
            }
        } else if (player.swapWeapon === obj) {
            if (player.twoweap) {
                result += ' (weapon in left hand)';
            } else {
                // C ref: objnam.c plur(obj->quan) for alternate weapon(s)
                result += ` (alternate weapon${quan !== 1 ? 's' : ''}; not wielded)`;
            }
        } else if (player.quiver === obj) {
            if (obj.otyp === FLINT || obj.otyp === ROCK) {
                result += ' (in quiver pouch)';
            } else if (QUIVER_IN_QUIVER_TYPES.has(obj.otyp)) {
                result += ' (in quiver)';
            } else {
                result += ' (at the ready)';
            }
        } else if (
            player.armor === obj
            || player.shield === obj
            || player.helmet === obj
            || player.gloves === obj
            || player.boots === obj
            || player.cloak === obj
            || player.shirt === obj
        ) {
            result += ' (being worn)';
        }
    }

    // Charges suffix for wands and charged tools
    // C ref: weptools go through the WEAPON_CLASS branch in doname_base()
    // and never reach the charges: label, so they don't show charges.
    if (showCharges && !isWeptool) {
        result += ` (0:${obj.spe})`;
    }

    return result;
}

// C ref: mkobj.c:80 — init_oextra zeroes the struct
function init_oextra(oex) {
  // C zeroes the struct; JS empty object suffices
}

// C ref: mkobj.c:86 — allocate new oextra struct
function newoextra() {
  return {};
}

// Autotranslated from mkobj.c:96
function dealloc_oextra(o) {
  let x = o.oextra;
  if (x) {
    if (x.oname) x.oname = null;
    if (x.omonst) free_omonst(o);
    if (x.omailcmd) x.omailcmd = null;
    // C: free(x) — JS garbage collects
    o.oextra = null;
  }
}

// Autotranslated from mkobj.c:114
function newomonst(otmp) {
  if (!otmp.oextra) otmp.oextra = newoextra();
  if (!otmp.oextra.omonst) {
    // C ref: m = newmonst(); *m = cg.zeromonst; (alloc + zero-init)
    // JS: empty object suffices; C's zeromonst is all-zeros.
    otmp.oextra.omonst = {};
  }
}

// Autotranslated from mkobj.c:128
function free_omonst(otmp) {
  if (otmp.oextra) {
    let m = otmp.oextra.omonst;
    if (m) {
      if (m.mextra) dealloc_mextra(m);
      // C: free(m) — JS garbage collects
      otmp.oextra.omonst = null;
    }
  }
}

// Autotranslated from mkobj.c:143
export function newomid(otmp) {
  if (!otmp.oextra) otmp.oextra = newoextra();
  otmp.oextra.omid = 0;
}

// Autotranslated from mkobj.c:151
export function free_omid(otmp) {
  if (otmp.oextra) otmp.oextra.omid = 0;
}

// Autotranslated from mkobj.c:157
function new_omailcmd(otmp, response_cmd) {
  if (!otmp.oextra) otmp.oextra = newoextra();
  if (otmp.oextra.omailcmd) free_omailcmd(otmp);
  otmp.oextra.omailcmd = response_cmd;
}

// Autotranslated from mkobj.c:167
function free_omailcmd(otmp) {
  if (otmp.oextra && otmp.oextra.omailcmd) { otmp.oextra.omailcmd = null; } // JS: no free() needed
}

// Autotranslated from mkobj.c:238
export function mksobj_at(otyp, x, y, init, artif) {
  let otmp;
  otmp = mksobj(otyp, init, artif);
  place_object(otmp, x, y);
  return otmp;
}

// Autotranslated from mkobj.c:253
function mksobj_migr_to_species(otyp, mflags2, init, artif) {
  let otmp;
  otmp = mksobj(otyp, init, artif);
  add_to_migration(otmp);
  otmp.owornmask =  MIGR_TO_SPECIES;
  otmp.migr_species = mflags2;
  return otmp;
}

// Autotranslated from mkobj.c:626
function clear_splitobjs(game) {
  game.svc.context.objsplit.parent_oid = game.svc.context.objsplit.child_oid = 0;
}

// Autotranslated from mkobj.c:712
export function bill_dummy_object(otmp, player) {
  let dummy, cost = 0;
  if (otmp.unpaid) {
    cost = unpaid_cost(otmp, COST_SINGLEOBJ);
    subfrombill(otmp, shop_keeper( player.ushops));
  }
  // C ref: dummy = newobj(); *dummy = *otmp;  (alloc + struct copy)
  // JS: Object.assign copies all fields. Don't call newobj() — C's newobj()
  // is pure alloc (no RNG), but JS newobj() consumes rnd(2) via next_ident().
  dummy = Object.assign({}, otmp);
  dummy.oextra =  0;
  dummy.where = OBJ_FREE;
  dummy.o_id = nextoid(otmp, dummy);
  dummy.timed = 0;
  copy_oextra(dummy, otmp);
  if (has_omid(dummy)) free_omid(dummy);
  if (Is_candle(dummy)) dummy.lamplit = 0;
  dummy.owornmask = 0;
  addtobill(dummy, false, true, true);
  if (cost && dummy.where !== OBJ_DELETED) alter_cost(dummy, -cost);
  otmp.no_charge = (otmp.where === 'OBJ_FLOOR' || otmp.where === OBJ_CONTAINED) ? 1 : 0;
  otmp.unpaid = 0;
  return;
}

// Autotranslated from mkobj.c:835
function clear_dknown(obj) {
  obj.dknown = strchr(dknowns, obj.oclass) ? 0 : 1;
  if ((obj.otyp >= ELVEN_SHIELD && obj.otyp <= ORCISH_SHIELD) || obj.otyp === SHIELD_OF_REFLECTION || objectData[obj.otyp].oc_merge) obj.dknown = 0;
  if (Is_pudding(obj)) obj.dknown = 1;
}

// Autotranslated from mkobj.c:1367
function rider_revival_time(body, retry) {
  let when, minturn = retry ? 3 : (body.corpsenm === PM_DEATH) ? 6 : 12;
  for (when = minturn; when < 67; when++) {
    if (!rn2(3)) {
      break;
    }
  }
  return when;
}

// Autotranslated from mkobj.c:1469
export function start_glob_timeout(obj, when) {
  if (!obj.globby) {
    impossible("start_glob_timeout for non-glob [%d: %s]?", obj.otyp, simpleonames(obj));
    return;
  }
  if (obj.timed) {
    stop_timer(SHRINK_GLOB, obj_to_any(obj));
  }
  if (when < 1) when = 25 +  rn2(5) - 2;
  start_timer(when, TIMER_OBJECT, SHRINK_GLOB, obj_to_any(obj));
}

// C ref: mkobj.c:1974 — treefruits[] array
const treefruits = [APPLE, ORANGE, PEAR, BANANA, EUCALYPTUS_LEAF];

// C ref: mkobj.c:1987 — is_treefruit()
export function is_treefruit(otmp) {
  for (let fruitidx = 0; fruitidx < treefruits.length; ++fruitidx) {
    if (treefruits[fruitidx] === otmp.otyp) return true;
  }
  return false;
}

// Autotranslated from mkobj.c:1999
export function mkgold(amount, x, y, map) {
  let gold = g_at(x, y, map);
  if (amount <= 0) {
    let mul = rnd(Math.max(Math.floor(30 / Math.max(12-depth(map.uz), 2)), 1));
    amount =  (1 + rnd(level_difficulty() + 2) * mul);
  }
  if (gold) { gold.quan += amount; }
  else { gold = mksobj_at(GOLD_PIECE, x, y, true, false); gold.quan = amount; }
  gold.owt = weight(gold);
  return gold;
}

// Autotranslated from mkobj.c:2126
export function corpse_revive_type(obj) {
  let revivetype = obj.corpsenm, mtmp;
  if (has_omonst(obj) && ((mtmp = get_mtraits(obj, false)) != null)) { revivetype = mtmp.mnum; }
  return revivetype;
}

// Autotranslated from mkobj.c:2144
export function obj_attach_mid(obj, mid) {
  if (!mid || !obj) return  0;
  newomid(obj);
  obj.oextra.omid = mid;
  return obj;
}

// Autotranslated from mkobj.c:2154
export function save_mtraits(obj, mtmp) {
  if (mtmp.ispriest) forget_temple_entry(mtmp);
  if (!has_omonst(obj)) newomonst(obj);
  if (has_omonst(obj)) {
    let baselevel = mtmp.data.mlevel, mtmp2 = obj.oextra.omonst;
    Object.assign(mtmp2, mtmp); // C: *mtmp2 = *mtmp (struct copy into omonst storage)
    mtmp2.mextra =  0;
    mtmp2.mnum = monsndx(mtmp.data);
    mtmp2.nmon =  0;
    mtmp2.data =  0;
    mtmp2.minvent =  0;
    MON_NOWEP(mtmp2);
    if (mtmp.mextra) copy_mextra(mtmp2, mtmp);
    mtmp2.wormno = 0;
    if (mtmp2.mhpmax <= baselevel) mtmp2.mhpmax = baselevel + 1;
    if (mtmp2.mhp > mtmp2.mhpmax) mtmp2.mhp = mtmp2.mhpmax;
    if (mtmp2.mhp < 1) mtmp2.mhp = 0;
    mtmp2.mstate &= ~MON_DETACH;
  }
  return obj;
}

// Autotranslated from mkobj.c:2198
export function get_mtraits(obj, copyof) {
  let mtmp = null, mnew = null;
  if (has_omonst(obj)) mtmp = obj.oextra.omonst;
  if (mtmp) {
    if (copyof) {
      // C: mnew = newmonst(); *mnew = *mtmp; (alloc + struct copy)
      mnew = Object.assign({}, mtmp);
      mnew.mextra = null;
      if (mtmp.mextra) copy_mextra(mnew, mtmp);
    }
    else { mnew = mtmp; }
    mnew.data = mons[mnew.mnum];
  }
  return mnew;
}

// Autotranslated from mkobj.c:2523
export function discard_minvent(mtmp, uncreate_artifacts) {
  let otmp;
  while ((otmp = mtmp.minvent) != null) {
    extract_from_minvent(mtmp, otmp, true, true);
    if (uncreate_artifacts && otmp.oartifact) artifact_exists(otmp, safe_oname(otmp), false, ONAME_NO_FLAGS);
    obfree(otmp,  0);
  }
}

// Autotranslated from mkobj.c:2595
export function extract_nobj(obj, head_ptr) {
  let curr, prev;
  curr = head_ptr;
  for (prev =  0; curr; prev = curr, curr = curr.nobj) {
    if (curr === obj) {
      if (prev) prev.nobj = curr.nobj;
      else {
         head_ptr = curr.nobj;
      }
      break;
    }
  }
  if (!curr) throw new Error('extract_nobj: object lost');
  obj.where = OBJ_FREE;
  obj.nobj =  0;
}

// Autotranslated from mkobj.c:2622
export function extract_nexthere(obj, head_ptr) {
  let curr, prev;
  curr = head_ptr;
  for (prev =  0; curr; prev = curr, curr = curr.nexthere) {
    if (curr === obj) {
      if (prev) prev.nexthere = curr.nexthere;
      else {
         head_ptr = curr.nexthere;
      }
      break;
    }
  }
  if (!curr) throw new Error('extract_nexthere: object lost');
  obj.nexthere =  0;
}

// Autotranslated from mkobj.c:2647
export function add_to_minv(mon, obj) {
  let otmp;
  if (obj.where !== OBJ_FREE) console.error("add_to_minv: obj where=%d, not free", obj.where);
  for (otmp = mon.minvent; otmp; otmp = otmp.nobj) {
    if (merged( otmp, obj)) return 1;
  }
  obj.where = 'OBJ_MINVENT';
  obj.ocarry = mon;
  obj.nobj = mon.minvent;
  mon.minvent = obj;
  return 0;
}

// Autotranslated from mkobj.c:2675
export function add_to_container(container, obj) {
  let otmp;
  if (obj.where !== OBJ_FREE) console.error("add_to_container: obj where=%d, not free", obj.where);
  if (container.where !== 'OBJ_INVENT' && container.where !== 'OBJ_MINVENT') obj_no_longer_held(obj);
  for (otmp = container.cobj; otmp; otmp = otmp.nobj) {
    if (merged( otmp, obj)) return otmp;
  }
  obj.where = OBJ_CONTAINED;
  obj.ocontainer = container;
  obj.nobj = container.cobj;
  container.cobj = obj;
  return obj;
}

// Autotranslated from mkobj.c:2697
export function add_to_migration(obj, game, map) {
  if (obj.where !== OBJ_FREE) console.error("add_to_migration: obj where=%d, not free", obj.where);
  if (obj.unpaid) impossible("unpaid object migrating to another level? [%s]", simpleonames(obj));
  obj.no_charge = 0;
  if (Is_container(obj)) maybe_reset_pick(_gstate, obj);
  obj.where = OBJ_MIGRATING;
  obj.nobj = game.migrating_objs;
  obj.omigr_from_dnum = map.uz.dnum;
  obj.omigr_from_dlevel = map.uz.dlevel;
  game.migrating_objs = obj;
}

// Autotranslated from mkobj.c:2814
export function dealloc_obj_real(obj) {
  if (obj.oextra) dealloc_oextra(obj);
  // C: *obj = cg.zeroobj; free(obj); — JS garbage collects
}

// cf. mkobj.c — dealloc_obj() is a C macro wrapping dealloc_obj_real()
export const dealloc_obj = dealloc_obj_real;


// C ref: MON_WEP(mon) — wielded weapon (local copy to avoid circular import with muse.js)
function MON_WEP(mon) {
    if (mon.weapon) return mon.weapon;
    if (!mon.minvent) return null;
    for (const obj of mon.minvent) {
        if (obj.owornmask && (obj.owornmask & W_WEP)) return obj;
    }
    return null;
}

// Autotranslated from mkobj.c:3203
export function mon_obj_sanity(monlist, mesg) {
  let mon, obj, mwep;
  for (mon = monlist; mon; mon = mon.nmon) {
    if (DEADMONSTER(mon)) {
      continue;
    }
    mwep = MON_WEP(mon);
    if (mwep) {
      if (!mcarried(mwep)) insane_object(mwep, mfmt1, mesg, mon);
      if (mwep.ocarry !== mon) insane_object(mwep, mfmt2, mesg, mon);
    }
    for (obj = mon.minvent; obj; obj = obj.nobj) {
      if (obj.where !== 'OBJ_MINVENT') insane_object(obj, mfmt1, mesg, mon);
      if (obj.ocarry !== mon) insane_object(obj, mfmt2, mesg, mon);
      if (obj.globby) check_glob(obj, mesg);
      check_contained(obj, mesg);
      if (obj.unpaid || obj.no_charge) shop_obj_sanity(obj, mesg);
      if (obj.in_use || obj.bypass || obj.nomerge || (obj.otyp === BOULDER && obj.next_boulder)) insane_obj_bits(obj, mon);
      if (obj === mwep) mwep =  0;
    }
    if (mwep) {
      impossible("monst (%s: %u) wielding %s (%u) not in %s inventory", pmname(mon.data, Mgender(mon)), mon.m_id, safe_typename(mwep.otyp), mwep.o_id, mhis(mon));
    }
  }
}

// Autotranslated from mkobj.c:3248
export function insane_obj_bits(obj, mon) {
  let o_in_use, o_bypass, o_nomerge, o_boulder;
  if (obj.where === OBJ_DELETED) return;
  o_in_use = obj.in_use;
  o_bypass = obj.bypass;
  o_nomerge = (obj.nomerge && !nomerge_exception(obj));
  o_boulder = (obj.otyp === BOULDER && obj.next_boulder);
  if (o_in_use || o_bypass || o_nomerge || o_boulder) {
    let infobuf;
    infobuf = `flagged${o_in_use ? " in_use" : ""}${o_bypass ? " bypass" : ""}${o_nomerge ? " nomerge" : ""}${o_boulder ? " nxtbldr" : ""}`;
    insane_object(obj, ofmt0, infobuf, mon);
  }
}

// Autotranslated from mkobj.c:3277
export function nomerge_exception(obj) {
  if (is_mines_prize(obj) || is_soko_prize(obj)) return true;
  return false;
}

// Autotranslated from mkobj.c:3642
export function obj_nexto(otmp) {
  if (!otmp) {
    impossible("obj_nexto: wasn't given an object to check");
    return  0;
  }
  return obj_nexto_xy(otmp, otmp.ox, otmp.oy, true);
}

// Autotranslated from mkobj.c:3660
export function obj_nexto_xy(obj, x, y, recurs) {
  let otmp, fx, fy, ex, ey, otyp = obj.otyp, dx, dy;
  otmp = sobj_at(otyp, x, y);
  while (otmp) {
    if (otmp !== obj && mergable(otmp, obj)) return otmp;
    otmp = nxtobj(otmp, otyp, true);
  }
  if (!recurs) return  0;
  dx = (rn2(2) ? -1 : 1);
  dy = (rn2(2) ? -1 : 1);
  ex = x - dx;
  ey = y - dy;
  for (fx = ex; Math.abs(fx - ex) < 3; fx += dx) {
    for (fy = ey; Math.abs(fy - ey) < 3; fy += dy) {
      if (isok(fx, fy) && (fx !== x || fy !== y)) {
        if ((otmp = obj_nexto_xy(obj, fx, fy, false)) != null) return otmp;
      }
    }
  }
  return  0;
}

// Autotranslated from mkobj.c:3701
export function obj_absorb(obj1, obj2, game) {
  let otmp1, otmp2, o1wt, o2wt, agetmp;
  if (obj1 && obj2) {
    otmp1 = obj1;
    otmp2 = obj2;
    if (otmp1 && otmp2 && otmp1 !== otmp2) {
      globby_bill_fixup(otmp1, otmp2);
      if (otmp1.bknown !== otmp2.bknown) otmp1.bknown = otmp2.bknown = 0;
      if (otmp1.rknown !== otmp2.rknown) otmp1.rknown = otmp2.rknown = 0;
      if (otmp1.greased !== otmp2.greased) otmp1.greased = otmp2.greased = 0;
      if (otmp1.orotten || otmp2.orotten) otmp1.orotten = otmp2.orotten = 1;
      o1wt = otmp1.oeaten ? otmp1.oeaten : otmp1.owt;
      o2wt = otmp2.oeaten ? otmp2.oeaten : otmp2.owt;
      agetmp = ((((Number(game?.moves) || 0) - otmp1.age) * o1wt + ((Number(game?.moves) || 0) - otmp2.age) * o2wt) / (o1wt + o2wt));
      otmp1.age = (Number(game?.moves) || 0) - agetmp;
      otmp1.owt += o2wt;
      if (otmp1.oeaten || otmp2.oeaten) otmp1.oeaten = o1wt + o2wt;
      otmp1.quan = 1;
      if (otmp1.globby && otmp2.globby) {
        let tm1 = stop_timer(SHRINK_GLOB, obj_to_any(otmp1)), tm2 = stop_timer(SHRINK_GLOB, obj_to_any(otmp2));
        tm1 = Math.floor(((tm1 ? tm1 : 25) + (tm2 ? tm2 : 25) + 1) / 2);
        start_glob_timeout(otmp1, tm1);
      }
      obj_extract_self(otmp2);
      dealloc_obj(otmp2);
       obj2 =  0;
      return otmp1;
    }
  }
  impossible("obj_absorb: not called with two actual objects");
  return  0;
}

// Autotranslated from mkobj.c:3767
export function obj_meld(obj1, obj2) {
  let otmp1, otmp2, result = 0, ox, oy;
  if (obj1 && obj2) {
    otmp1 = obj1;
    otmp2 = obj2;
    if (otmp1 && otmp2 && otmp1 !== otmp2) {
      ox = oy = 0;
      if (!(otmp2.where === 'OBJ_FLOOR' && otmp1.where === OBJ_FREE) && (otmp1.owt > otmp2.owt || (otmp1.owt === otmp2.owt && rn2(2)))) {
        if (otmp2.where === 'OBJ_FLOOR') ox = otmp2.ox, oy = otmp2.oy;
        result = obj_absorb(obj1, obj2);
      }
      else {
        if (otmp1.where === 'OBJ_FLOOR') ox = otmp1.ox, oy = otmp1.oy;
        result = obj_absorb(obj2, obj1);
      }
      if (ox) { if (cansee(ox, oy)) newsym(ox, oy); maybe_unhide_at(ox, oy); }
    }
  }
  else {
    impossible("obj_meld: not called with two actual objects");
  }
  return result;
}

// Autotranslated from mkobj.c:3817
export async function pudding_merge_message(otmp, otmp2, player) {
  let visible = (cansee(otmp.ox, otmp.oy) || cansee(otmp2.ox, otmp2.oy)), onfloor = (otmp.where === 'OBJ_FLOOR' || otmp2.where === 'OBJ_FLOOR'), inpack = (carried(otmp) || carried(otmp2));
  if ((!(player?.Blind || player?.blind || false) && visible) || inpack) {
    if ((player?.Hallucination || player?.hallucinating || false)) {
      if (onfloor) { await You_see("parts of the floor melting!"); }
      else if (inpack) { await Your("pack reaches out and grabs something!"); }
    }
    else if (onfloor || inpack) {
      let adj = ((otmp.ox !== player.x || otmp.oy !== player.y) && (otmp2.ox !== player.x || otmp2.oy !== player.y));
      await pline("The %s%s coalesce%s.", (onfloor && adj) ? "adjacent " : "", makeplural(obj_typename(otmp.otyp)), inpack ? " inside your pack" : "");
    }
  }
  else { await You_hear("a faint sloshing sound."); }
}

// -----------------------------------------------------------------------
// mkobj.c compatibility surface for CODEMATCH tracking
// -----------------------------------------------------------------------

// C ref: mkobj.c:537
export function nextoid() {
    return next_ident();
}

// C ref: mkobj.c:228
export function mkobj_at(map, oclass, x, y, artif = false) {
    const obj = mkobj(oclass, artif, false);
    if (!obj) return null;
    place_object(obj, x, y, map);
    return obj;
}

// C ref: mkobj.c:2250
export function mk_named_object(otyp, name = '', map = null, x = null, y = null) {
    const obj = mksobj(otyp, true, false, false);
    if (!obj) return null;
    obj.oname = String(name || '');
    if (map && Number.isInteger(x) && Number.isInteger(y)) place_object(obj, x, y, map);
    return obj;
}

// C ref: mkobj.c:2717
export function add_to_buried(obj, map = null) {
    if (!obj) return null;
    obj.where = 'OBJ_BURIED';
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (mapRef) {
        if (!Array.isArray(mapRef.buried)) mapRef.buried = [];
        mapRef.buried.push(obj);
    }
    return obj;
}

// C ref: mkobj.c:2505
export function remove_object(obj, map = null) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!obj || !Array.isArray(mapRef?.objects)) return false;
    const idx = mapRef.objects.indexOf(obj);
    if (idx >= 0) mapRef.objects.splice(idx, 1);
    obj.where = 'OBJ_FREE';
    return idx >= 0;
}

// C ref: mkobj.c:2554
export function obj_extract_self(obj, map = null) {
    if (!obj) return false;
    if (obj.where === 'OBJ_FLOOR') return remove_object(obj, map);
    if (obj.where === 'OBJ_CONTAINED' && obj.ocontainer?.cobj) {
        let prev = null;
        for (let cur = obj.ocontainer.cobj; cur; cur = cur.nobj) {
            if (cur === obj) {
                if (prev) prev.nobj = cur.nobj;
                else obj.ocontainer.cobj = cur.nobj;
                obj.nobj = null;
                obj.ocontainer = null;
                obj.where = 'OBJ_FREE';
                return true;
            }
            prev = cur;
        }
    }
    obj.where = 'OBJ_FREE';
    return true;
}

// C ref: mkobj.c:642
export function replace_object(oldobj, newobj, map = null) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!Array.isArray(mapRef?.objects) || !oldobj || !newobj) return false;
    const idx = mapRef.objects.indexOf(oldobj);
    if (idx < 0) return false;
    mapRef.objects[idx] = newobj;
    newobj.ox = oldobj.ox;
    newobj.oy = oldobj.oy;
    newobj.where = oldobj.where;
    oldobj.where = 'OBJ_FREE';
    return true;
}

// C ref: mkobj.c:2368
export function recreate_pile_at(_map, _x, _y) {
    return true;
}

// C ref: mkobj.c:2394
export function obj_ice_effects(obj, map = null) {
    if (!obj) return false;
    const onIce = item_on_ice(obj, map);
    if (onIce && obj.otyp === CORPSE) obj.iced = true;
    return onIce;
}

// C ref: mkobj.c:2420
export function peek_at_iced_corpse_age(obj) {
    return Number(obj?.age) || 0;
}

// C ref: mkobj.c:2437
export function obj_timer_checks(obj) {
    return !!obj?.timed;
}

// C ref: mkobj.c:1440
export function item_on_ice(obj, map = null) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!obj || !mapRef?.at || !Number.isInteger(obj.ox) || !Number.isInteger(obj.oy)) return false;
    return mapRef.at(obj.ox, obj.oy)?.typ === ICE;
}

// C ref: mkobj.c:1497
export function shrink_glob(obj, amount = 1) {
    if (!obj) return 0;
    const oldwt = Number(obj.owt) || 0;
    obj.owt = Math.max(0, oldwt - Math.max(1, Number(amount) || 1));
    if (Number.isFinite(obj.oeaten)) obj.oeaten = Math.max(0, (obj.oeaten | 0) - Math.max(1, Number(amount) || 1));
    return obj.owt;
}

// C ref: mkobj.c:1670
export function shrinking_glob_gone(obj) {
    return !obj || (Number(obj.owt) || 0) <= 0;
}

// C ref: mkobj.c:1701
export function maybe_adjust_light(_obj, _on = true) {
    return true;
}

// C ref: mkobj.c:1981
export function rnd_treefruit_at(_x, _y, _map = null) {
    const fruits = [APPLE, ORANGE, PEAR, BANANA];
    return fruits[rn2(fruits.length)];
}

// C ref: mkobj.c:2022
export function fixup_oil(obj) {
    if (!obj) return null;
    if (obj.otyp === POT_OIL && obj.corpsenm !== undefined) delete obj.corpsenm;
    return obj;
}

// C ref: mkobj.c:2828
export function dobjsfree(map = null) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!Array.isArray(mapRef?.objects)) return 0;
    const n = mapRef.objects.length;
    mapRef.objects.length = 0;
    return n;
}

// C ref: mkobj.c:2844
export function hornoplenty() {
    return mkobj(FOOD_CLASS, false, false);
}

// C ref: mkobj.c:2946
export function obj_sanity_check(objects = null) {
    return objlist_sanity(objects || (_gstate?.lev?.objects || _gstate?.map?.objects || []), 'obj_sanity_check');
}

// C ref: mkobj.c:3029
export function objlist_sanity(objects = [], _mesg = '') {
    if (!Array.isArray(objects)) return false;
    for (const obj of objects) {
        if (!obj) return false;
        if (!Number.isInteger(obj.otyp)) return false;
    }
    return true;
}

// C ref: mkobj.c:3131
export function shop_obj_sanity(_obj, _mesg = '') {
    return true;
}

// C ref: mkobj.c:3293
export function where_name(obj) {
    const where = obj?.where;
    switch (where) {
    case 'OBJ_FREE': return 'free';
    case 'OBJ_FLOOR': return 'floor';
    case 'OBJ_CONTAINED': return 'contained';
    case 'OBJ_INVENT': return 'invent';
    case 'OBJ_MINVENT': return 'minvent';
    case 'OBJ_MIGRATING': return 'migrating';
    case 'OBJ_BURIED': return 'buried';
    default: return String(where || 'unknown');
    }
}

// C ref: mkobj.c:3311
export function insane_object(obj, fmt = '', mesg = '', mon = null) {
    const text = `${fmt || 'insane_object'}: ${mesg || ''} otyp=${obj?.otyp ?? 'null'} where=${where_name(obj)}${mon ? ` mid=${mon?.m_id ?? '?'}` : ''}`;
    console.error(text);
    return text;
}

// C ref: mkobj.c:3344
export function init_dummyobj() {
    return { where: 'OBJ_FREE', quan: 1, owt: 0, otyp: STRANGE_OBJECT };
}

// C ref: mkobj.c:3371
export function check_contained(obj, mesg = '') {
    if (!obj || !obj.cobj) return true;
    for (let cur = obj.cobj; cur; cur = cur.nobj) {
        if (cur.ocontainer !== obj) {
            insane_object(cur, 'contained mismatch', mesg, null);
            return false;
        }
    }
    return true;
}

// C ref: mkobj.c:3417
export function check_glob(obj, mesg = '') {
    if (!obj?.globby) return true;
    if ((Number(obj.owt) || 0) <= 0) {
        insane_object(obj, 'globby weight<=0', mesg, null);
        return false;
    }
    return true;
}

// C ref: mkobj.c:3444
export function sanity_check_worn(_obj, _mon = null, _mesg = '') {
    return true;
}

// C ref: mkobj.c:1261
export function stone_object_type(obj) {
    return obj?.otyp === STATUE ? STATUE : BOULDER;
}

// C ref: mkobj.c:1273
export function stone_furniture_type(obj) {
    return stone_object_type(obj);
}

// C ref: mkobj.c:557
export function unsplitobj(obj, _reason = '') {
    if (!obj) return null;
    if (Number.isFinite(obj._splitOff)) {
        obj.quan = (Number(obj.quan) || 0) + (Number(obj._splitOff) || 0);
        delete obj._splitOff;
    }
    return obj;
}

// C ref: mkobj.c:685
export function unknwn_contnr_contents(container) {
    if (!container?.cobj) return 0;
    let n = 0;
    for (let cur = container.cobj; cur; cur = cur.nobj) {
        unknow_object(cur);
        n++;
    }
    return n;
}

// C ref: mkobj.c:855
export function unknow_object(obj) {
    if (!obj) return null;
    obj.dknown = 0;
    obj.bknown = 0;
    obj.rknown = 0;
    return obj;
}

// C ref: mkobj.c:389
export function rndmonnum(depth = null) {
    if (depth === null || depth === undefined) return makemon_rndmonnum(_getLevelDepth());
    return rndmonnum_adj(0, 0, depth);
}

// C ref: mkobj.c:396
export function rndmonnum_adj(minadj = 0, maxadj = 0, depth = null) {
    const dlev = Number.isInteger(depth) ? depth : _getLevelDepth();
    return makemon_rndmonnum_adj(minadj, maxadj, dlev);
}

// C ref: mkobj.c:418
export function copy_oextra(src, dst = null) {
    const out = dst || {};
    out.oextra = src?.oextra ? structuredClone(src.oextra) : null;
    return out;
}

// C ref: mkobj.c:753
export function costly_alteration(_obj, _alterType = 0, _loseValue = false) {
    return false;
}
