import { strchr } from './hacklib.js';
// o_init.js -- Object initialization (description shuffling)
// Faithful port of o_init.c from NetHack 3.7.
// C ref: o_init.c init_objects(), shuffle_all(), shuffle(), randomize_gem_colors()
//
// This module performs the same RNG-consuming operations as C's o_init.c:
// randomize_gem_colors (3 rn2 calls), shuffle_all, WAN_NOTHING direction (1 rn2 call).

import { rn2 } from './rng.js';
import { exercise } from './attrib_exercise.js';
import { A_WIS } from './const.js';
import { game as _gstate } from './gstate.js';
import { resetIdentCounter, doname } from './mkobj.js';
import { nhgetch_raw } from './input.js';
import { awaitInput } from './suspend.js';
import {
    objectData, initObjectData, bases,
    WEAPON_CLASS, ARMOR_CLASS, AMULET_CLASS, FOOD_CLASS,
    POTION_CLASS, RING_CLASS, SCROLL_CLASS,
    SPBOOK_CLASS, WAND_CLASS, TOOL_CLASS,
    COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    ARM_GLOVES, ARM_BOOTS,
    // Gem indices for randomize_gem_colors
    TURQUOISE, AQUAMARINE, FLUORITE,
    SAPPHIRE, DIAMOND, EMERALD,
    // Amulet range
    AMULET_OF_ESP, AMULET_OF_FLYING,
    // Potion range
    POT_GAIN_ABILITY, POT_OIL, POT_WATER,
    // Scroll range
    SCR_ENCHANT_ARMOR, SC20,
    // Spellbook range
    SPE_DIG, SPE_CHAIN_LIGHTNING,
    // Wand range (entire class via bases)
    WAN_NOTHING,
    // Armor sub-ranges
    HELMET, HELM_OF_TELEPATHY,
    LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY,
    CLOAK_OF_PROTECTION, CLOAK_OF_DISPLACEMENT,
    SPEED_BOOTS, LEVITATION_BOOTS,
    // Venom range (entire class via bases)
    // Gem probability constants
    LAST_REAL_GEM, oclass_prob_totals,
} from './objects.js';

// C ref: objclass.h
const NODIR = 1;
const IMMEDIATE = 2;

// Save canonical (unshuffled) object properties on first call.
// Since JS may call init_objects() multiple times (once per makelevel),
// we restore originals before each shuffle to ensure determinism.
let savedProps = null;

function save_originals() {
    if (savedProps) return; // only save once (from the pristine objectData)
    savedProps = objectData.map(obj => ({
        desc: obj.oc_descr,
        oc_color: obj.oc_color,
        tough: obj.tough || 0,
        material: obj.oc_material,
        oc_dir: obj.oc_dir,
    }));
}

function restore_originals() {
    for (let i = 0; i < objectData.length; i++) {
        objectData[i].oc_descr = savedProps[i].desc;
        objectData[i].oc_color = savedProps[i].oc_color;
        if (savedProps[i].tough) objectData[i].tough = savedProps[i].tough;
        else delete objectData[i].tough;
        objectData[i].oc_material = savedProps[i].material;
        objectData[i].oc_dir = savedProps[i].oc_dir;
    }
}

// ========================================================================
// randomize_gem_colors -- swap gem descriptions randomly
// C ref: o_init.c:83-108
// 3 rn2 calls total
// ========================================================================

function copy_obj_descr(dst_idx, src_idx) {
    objectData[dst_idx].oc_descr = objectData[src_idx].oc_descr;
    objectData[dst_idx].oc_color = objectData[src_idx].oc_color;
}
export function randomize_gem_colors() {
    // Turquoise: maybe change from green to blue (copy from sapphire)
    if (rn2(2)) {
        copy_obj_descr(TURQUOISE, SAPPHIRE);
    }
    // Aquamarine: maybe change from green to blue (copy from sapphire)
    if (rn2(2)) {
        copy_obj_descr(AQUAMARINE, SAPPHIRE);
    }
    // Fluorite: maybe change from violet to blue/white/green
    const j = rn2(4);
    if (j === 1) copy_obj_descr(FLUORITE, SAPPHIRE);
    else if (j === 2) copy_obj_descr(FLUORITE, DIAMOND);
    else if (j === 3) copy_obj_descr(FLUORITE, EMERALD);
    // j === 0: stays violet (no change)
}

// ========================================================================
// shuffle -- Fisher-Yates variant with oc_name_known skip
// C ref: o_init.c:111-147
// ========================================================================

function is_name_known(idx) {
    // In C, oc_name_known is set for objects with no description.
    // C ref: o_init.c:210-224 validation
    return !objectData[idx].oc_descr;
}

// C ref: obj_shuffle_range() for AMULET/SCROLL/SPBOOK classes.
// Returns the high index: scan from bases[cl] until oc_unique or !oc_magic.
function classShuffleEnd(ocls) {
    let i = bases[ocls];
    while (objectData[i] && objectData[i].oc_class === ocls) {
        if (objectData[i].unique || !objectData[i].magic)
            break;
        i++;
    }
    return i - 1;
}
export function shuffle(o_low, o_high, domaterial) {
    // Count shufflable items
    let num_to_shuffle = 0;
    for (let j = o_low; j <= o_high; j++) {
        if (!is_name_known(j)) num_to_shuffle++;
    }
    if (num_to_shuffle < 2) return;

    for (let j = o_low; j <= o_high; j++) {
        if (is_name_known(j)) continue;

        // Pick random swap target, retrying if it's name_known
        let i;
        do {
            i = j + rn2(o_high - j + 1);
        } while (is_name_known(i));

        // Swap desc (C: oc_descr_idx)
        let sw = objectData[j].oc_descr;
        objectData[j].oc_descr = objectData[i].oc_descr;
        objectData[i].oc_descr = sw;

        // Swap tough (C: oc_tough)
        sw = objectData[j].tough || 0;
        objectData[j].tough = objectData[i].tough || 0;
        objectData[i].tough = sw;

        // Swap color (C: oc_color)
        const color = objectData[j].oc_color;
        objectData[j].oc_color = objectData[i].oc_color;
        objectData[i].oc_color = color;

        // Swap material if domaterial (class shuffles)
        if (domaterial) {
            sw = objectData[j].oc_material;
            objectData[j].oc_material = objectData[i].oc_material;
            objectData[i].oc_material = sw;
        }
    }
}

// ========================================================================
// shuffle_all -- shuffle descriptions for all applicable ranges
// C ref: o_init.c:320-346
// 194 rn2 calls total (when no oc_name_known items in ranges)
// ========================================================================

function shuffle_all() {
    // Group 1: Entire classes (domaterial = true)
    // C ref: shuffle_classes[] = AMULET, POTION, RING, SCROLL, SPBOOK, WAND, VENOM

    // C ref: shuffle_classes[] with obj_shuffle_range() for each class.
    // AMULET/SCROLL/SPBOOK: bases[cl] up to last magic non-unique item.
    // POTION: bases[cl] to POT_WATER - 1 (POT_WATER has fixed description).
    // RING/WAND/VENOM: entire class via bases[].
    shuffle(bases[AMULET_CLASS], classShuffleEnd(AMULET_CLASS), true);
    shuffle(bases[POTION_CLASS], POT_WATER - 1, true);
    shuffle(bases[RING_CLASS], bases[RING_CLASS + 1] - 1, true);
    shuffle(bases[SCROLL_CLASS], classShuffleEnd(SCROLL_CLASS), true);
    shuffle(bases[SPBOOK_CLASS], classShuffleEnd(SPBOOK_CLASS), true);
    shuffle(bases[WAND_CLASS], bases[WAND_CLASS + 1] - 1, true);
    shuffle(bases[VENOM_CLASS], bases[VENOM_CLASS + 1] - 1, true);

    // Group 2: Armor sub-ranges (domaterial = false)
    // C ref: shuffle_types[] = HELMET, LEATHER_GLOVES, CLOAK_OF_PROTECTION, SPEED_BOOTS

    // Helmets: HELMET(97)..HELM_OF_TELEPATHY(100) — 4 items
    shuffle(HELMET, HELM_OF_TELEPATHY, false);

    // Gloves: LEATHER_GLOVES(157)..GAUNTLETS_OF_DEXTERITY(160) — 4 items
    shuffle(LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY, false);

    // Cloaks: CLOAK_OF_PROTECTION(146)..CLOAK_OF_DISPLACEMENT(149) — 4 items
    shuffle(CLOAK_OF_PROTECTION, CLOAK_OF_DISPLACEMENT, false);

    // Boots: SPEED_BOOTS(164)..LEVITATION_BOOTS(170) — 7 items
    shuffle(SPEED_BOOTS, LEVITATION_BOOTS, false);
}

// ========================================================================
// init_objects -- main entry point
// C ref: o_init.c init_objects()
// Total rn2 calls: 3 gem + shuffle + 1 WAN_NOTHING
// ========================================================================

export function init_objects() {
    // Compute bases[] and probability totals first
    initObjectData();
    initDiscoveryState();

    // Save/restore canonical descriptions so repeated calls are deterministic
    save_originals();
    restore_originals();

    // Reset identity counter for deterministic monster/object IDs
    resetIdentCounter();

    // Randomize some gem colors (3 rn2 calls)
    // C ref: o_init.c:193
    randomize_gem_colors();

    // Shuffle object descriptions (194 rn2 calls)
    // C ref: o_init.c:228
    shuffle_all();

    // Randomize WAN_NOTHING direction (1 rn2 call)
    // C ref: o_init.c:233
    objectData[WAN_NOTHING].oc_dir = rn2(2) ? NODIR : IMMEDIATE;
}

// cf. o_init.c:351 — check if an object's description matches a string
// Returns true if obj's shuffled/unshuffled description equals descr.
export function objdescr_is(obj, descr) {
    if (!obj) return false;
    const objdescr = objectData[obj.otyp]?.oc_descr;
    if (!objdescr) return false;
    return objdescr === descr;
}

// cf. o_init.c:268 — return the shuffleable range containing otyp
// Returns { lo, hi } — the range of object indices whose descriptions are
// shuffled together.  If otyp is not in any shuffled range, lo === hi === otyp.
export function obj_shuffle_range(otyp) {
    const ocls = objectData[otyp]?.oc_class;
    let lo = otyp, hi = otyp;

    switch (ocls) {
    case ARMOR_CLASS:
        if (otyp >= HELMET && otyp <= HELM_OF_TELEPATHY)
            { lo = HELMET; hi = HELM_OF_TELEPATHY; }
        else if (otyp >= LEATHER_GLOVES && otyp <= GAUNTLETS_OF_DEXTERITY)
            { lo = LEATHER_GLOVES; hi = GAUNTLETS_OF_DEXTERITY; }
        else if (otyp >= CLOAK_OF_PROTECTION && otyp <= CLOAK_OF_DISPLACEMENT)
            { lo = CLOAK_OF_PROTECTION; hi = CLOAK_OF_DISPLACEMENT; }
        else if (otyp >= SPEED_BOOTS && otyp <= LEVITATION_BOOTS)
            { lo = SPEED_BOOTS; hi = LEVITATION_BOOTS; }
        break;
    case POTION_CLASS:
        // potion of water has the only fixed description
        lo = bases[POTION_CLASS];
        hi = POT_WATER - 1;
        break;
    case AMULET_CLASS:
    case SCROLL_CLASS:
    case SPBOOK_CLASS:
        // exclude non-magic types and also unique ones
        lo = bases[ocls];
        { let i = lo;
          while (i < objectData.length && objectData[i].oc_class === ocls) {
              if (objectData[i].unique || !objectData[i].magic) break;
              i++;
          }
          hi = i - 1; }
        break;
    case RING_CLASS:
    case WAND_CLASS:
    case VENOM_CLASS:
        // entire class
        lo = bases[ocls];
        hi = bases[ocls + 1] - 1;
        break;
    }

    // artifact checking: if otyp fell outside the computed range, reset
    if (otyp < lo || otyp > hi) lo = hi = otyp;
    return { lo, hi };
}

// cf. o_init.c:53 — adjust gem probabilities based on dungeon depth
// Gems deeper in the list are rarer; deeper levels make more gems available.
// In C, lev = ledger_no(dlev); in JS, depth is used directly as lev.
export function setgemprobs(depth) {
    const lev = depth || 0;
    let first = bases[GEM_CLASS];
    let sum = 0;

    // Zero out the first (9 - floor(lev/3)) gems (the rarest, depth-limited ones)
    let j;
    for (j = 0; j < 9 - Math.floor(lev / 3); j++)
        objectData[first + j].oc_prob = 0;
    first += j; // first now points to the first accessible gem

    // Set probability for accessible gems proportionally
    // C: (171 + j - first) / (LAST_REAL_GEM + 1 - first) — integer division
    const denom = LAST_REAL_GEM + 1 - first;
    for (j = first; j <= LAST_REAL_GEM; j++)
        objectData[j].oc_prob = denom > 0 ? Math.floor((171 + j - first) / denom) : 0;

    // Recompute GEM_CLASS probability total (including rocks/stones beyond LAST_REAL_GEM)
    for (j = bases[GEM_CLASS]; j < bases[GEM_CLASS + 1]; j++)
        sum += (objectData[j].oc_prob || 0);
    oclass_prob_totals[GEM_CLASS] = sum;
}

// Autotranslated from o_init.c:367
export function oinit(map) {
  setgemprobs(map.uz);
}

// Autotranslated from o_init.c:440
export function observe_object(obj) {
  obj.dknown = 1;
  discover_object(obj.otyp, false, true, false);
}

// Autotranslated from o_init.c:519
export function interesting_to_discover(i) {
  if (Role_if(PM_SAMURAI) && Japanese_item_name(i,  0)) return true;
  return  (objectData[i].oc_uname !==  0 || ((objectData[i].oc_name_known || objectData[i].oc_encountered) && OBJ_DESCR(objectData[i]) !==  0));
}

// Autotranslated from o_init.c:601
export async function choose_disco_sort(mode, game) {
  let tmpwin, selected, any, i, n, choice, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; disco_orders_descr; ++i) {
    any.a_int = disco_order_let;
    add_menu(tmpwin, nul_glyphinfo, any,  any.a_int, 0, ATR_NONE, clr, disco_orders_descr, (disco_order_let === game.flags.discosort) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
  }
  if (mode === 2) {
    add_menu_str(tmpwin, "");
    add_menu_str(tmpwin, "Note: full alphabetical and alphabetical within class");
    add_menu_str(tmpwin, " are equivalent for single class discovery, but");
    add_menu_str(tmpwin, " will matter for future use of total discoveries.");
  }
  end_menu(tmpwin, "Ordering of discoveries");
  n = await select_menu(tmpwin, PICK_ONE, selected);
  destroy_nhwindow(tmpwin);
  if (n > 0) {
    choice = selected[0].item.a_int;
    if (n > 1 && choice ===  game.flags.discosort) choice = selected[1].item.a_int;
    (selected, 0);
    game.flags.discosort = choice;
  }
  return n;
}

// Autotranslated from o_init.c:651
export function disco_typename(otyp) {
  let result = obj_typename(otyp);
  if (Role_if(PM_SAMURAI) && Japanese_item_name(otyp,  0)) {
    let buf;
    let actualn = (((otyp !== MAGIC_HARP && otyp !== WOODEN_HARP) || objectData[otyp].oc_name_known) ? OBJ_NAME(objectData[otyp]) : "harp");
    if (!actualn) {
    }
    else if (strstri(result, " called")) { buf = ` [${actualn}] called`; strsubst(result, " called", buf); }
    else if (strstri(result, " (")) { buf = ` [${actualn}] (`; strsubst(result, " (", buf); }
    else { result += ` [${actualn}]`; }
  }
  return result;
}

// Autotranslated from o_init.c:707
export async function disco_output_sorted(tmpwin, sorted_lines, sorted_ct, lootsort) {
  let p, j;
  qsort(sorted_lines, sorted_ct, sizeof , discovered_cmp);
  for (j = 0; j < sorted_ct; ++j) {
    p = sorted_lines;
    assert(p !== null);
    if (lootsort) { p = p; p += 6; }
    await putstr(tmpwin, 0, p);
    (sorted_lines[j], 0), sorted_lines = 0;
  }
}

// C ref: o_init.c:832 — return class name in lowercase
// NOTE: dead code (0 JS callers); Strcpy/lowc not imported.
export function oclass_to_name(oclass, buf) {
  const name = let_to_name(oclass, false, false);
  return (name || '').toLowerCase();
}

// Autotranslated from o_init.c:1138
export function get_sortdisco(opts, cnf, game) {
  let p = strchr(disco_order_let, game.flags.discosort);
  if (!p) game.flags.discosort = 'o', p = disco_order_let;
  if (cnf) {
    opts = `${game.flags.discosort}`;
  }
  else {
    opts = disco_orders_descr[p - disco_order_let];
  }
}

// ========================================================================
// Object discovery state (merged from discovery.js)
// C ref: o_init.c discover_object(), observe_object(), dodiscovered()
// ========================================================================

// Generic placeholder object indices occupy [0..17] in this port.
const FIRST_OBJECT = 18;

let ocNameKnown = [];
let ocEncountered = [];
let discoByClass = new Map();

function resetDiscoByClass() {
    discoByClass = new Map();
    for (const oclass of [
        WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
        FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
        COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    ]) {
        discoByClass.set(oclass, []);
    }
}

// C ref: o_init.c init_objects() + sanity check of oc_name_known/oc_descr.
export function initDiscoveryState() {
    ocNameKnown = new Array(objectData.length).fill(false);
    ocEncountered = new Array(objectData.length).fill(false);
    for (let i = 0; i < objectData.length; i++) {
        const od = objectData[i];
        ocNameKnown[i] = !!od?.known || !od?.oc_descr;
        ocEncountered[i] = false;
    }
    resetDiscoByClass();
}

export function isObjectNameKnown(otyp) {
    if (ocNameKnown.length === 0) {
        const od = objectData[otyp];
        return !!od?.known || !od?.oc_descr;
    }
    return !!ocNameKnown[otyp];
}

export function isObjectEncountered(otyp) {
    return !!ocEncountered[otyp];
}

function pushDisco(otyp) {
    const od = objectData[otyp];
    if (!od) return;
    const cls = od.oc_class;
    const arr = discoByClass.get(cls);
    if (!arr) return;
    if (!arr.includes(otyp)) arr.push(otyp);
}

// C ref: o_init.c discover_object() (subset; no samurai special naming yet).
export function discoverObject(otyp, markAsKnown, markAsEncountered, creditClue = true) {
    if (ocNameKnown.length === 0) initDiscoveryState();
    if (!Number.isInteger(otyp) || otyp < FIRST_OBJECT || otyp >= objectData.length) return;
    if ((!ocNameKnown[otyp] && markAsKnown) || (!ocEncountered[otyp] && markAsEncountered)) {
        pushDisco(otyp);
        if (markAsEncountered) ocEncountered[otyp] = true;
        if (!ocNameKnown[otyp] && markAsKnown) ocNameKnown[otyp] = true;
        // C ref: o_init.c:477 — exercise(A_WIS, TRUE) on object discovery
        // C guard: credit_clue && ct<NUM_OBJECTS (another item in class already known).
        // JS: markAsKnown maps to C's mark_as_known; C's ini_inv passes credit_clue=FALSE
        // so exercise never fires during chargen. We approximate with turnCount>0.
        if (creditClue && markAsKnown && _gstate && _gstate.turnCount > 0) {
            const od = objectData[otyp];
            if (od) {
                const cls = od.oc_class;
                // Check if any OTHER item in this class is already name-known
                const classItems = discoByClass.get(cls);
                const hasOtherKnown = classItems && classItems.some(
                    t => t !== otyp && ocNameKnown[t]);
                if (hasOtherKnown) {
                    const player = _gstate.u || _gstate.player;
                    if (player) exercise(player, A_WIS, true);
                }
            }
        }
    }
}

// C ref: o_init.c undiscover_object()
export function undiscoverObject(oindx) {
    if (ocNameKnown.length === 0) initDiscoveryState();
    if (!Number.isInteger(oindx) || oindx < FIRST_OBJECT || oindx >= objectData.length) return;
    const od = objectData[oindx];
    if (!od) return;
    if (!ocNameKnown[oindx] && !ocEncountered[oindx]) {
        const arr = discoByClass.get(od.oc_class);
        if (!arr) return;
        const idx = arr.indexOf(oindx);
        if (idx >= 0) arr.splice(idx, 1);
    }
}

// C ref: o_init.c observe_object()
export function observeObject(obj) {
    if (!obj) return;
    obj.dknown = true;
    discoverObject(obj.otyp, false, true);
}

// C ref: o_init.c interesting_to_discover() (subset: no oc_uname yet).
function interestingToDiscover(otyp) {
    const od = objectData[otyp];
    if (!od) return false;
    return ((ocNameKnown[otyp] || ocEncountered[otyp]) && !!od.oc_descr);
}

export function discoveryTypeName(otyp) {
    const od = objectData[otyp];
    if (!od) return 'unknown object';
    const nn = ocNameKnown[otyp];
    const dn = od.oc_descr || od.oc_name;
    const an = od.oc_name;
    const withDesc = (base) => od.oc_descr ? `${base} (${od.oc_descr})` : base;

    switch (od.oc_class) {
    case COIN_CLASS:
        return an;
    case POTION_CLASS:
        return withDesc(nn ? `potion of ${an}` : 'potion');
    case SCROLL_CLASS:
        return withDesc(nn ? `scroll of ${an}` : 'scroll');
    case WAND_CLASS:
        return withDesc(nn ? `wand of ${an}` : 'wand');
    case SPBOOK_CLASS:
        return withDesc(nn ? `spellbook of ${an}` : 'spellbook');
    case RING_CLASS:
        return withDesc(nn ? `ring of ${an}` : 'ring');
    case AMULET_CLASS:
        return withDesc(nn ? an : 'amulet');
    default:
        if (nn) {
            const pairPrefix = (od.oc_class === ARMOR_CLASS
                && (od.oc_subtyp === ARM_GLOVES || od.oc_subtyp === ARM_BOOTS))
                ? 'pair of '
                : '';
            return withDesc(`${pairPrefix}${an}`);
        }
        return dn;
    }
}

export function getDiscoveriesMenuLines() {
    const lines = [];
    const classOrder = [
        COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
        SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS,
        TOOL_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
    ];
    const classLabel = {
        [AMULET_CLASS]: 'Amulets',
        [WEAPON_CLASS]: 'Weapons',
        [ARMOR_CLASS]: 'Armor',
        [FOOD_CLASS]: 'Comestibles',
        [TOOL_CLASS]: 'Tools',
        [RING_CLASS]: 'Rings',
        [POTION_CLASS]: 'Potions',
        [SCROLL_CLASS]: 'Scrolls',
        [SPBOOK_CLASS]: 'Spellbooks',
        [WAND_CLASS]: 'Wands',
        [COIN_CLASS]: 'Coins',
        [GEM_CLASS]: 'Gems/Stones',
        [ROCK_CLASS]: 'Rocks',
        [BALL_CLASS]: 'Balls',
        [CHAIN_CLASS]: 'Chains',
        [VENOM_CLASS]: 'Venoms',
    };

    for (const cls of classOrder) {
        const discovered = (discoByClass.get(cls) || []).filter(interestingToDiscover);
        if (discovered.length === 0) continue;
        lines.push(classLabel[cls]);
        for (const otyp of discovered) {
            const star = ocEncountered[otyp] ? '  ' : '* ';
            lines.push(`${star}${discoveryTypeName(otyp)}`);
        }
    }
    return lines;
}

// C ref: savenames/restnames persists discovery-relevant object-class state.
export function getDiscoveryState() {
    if (ocNameKnown.length === 0) initDiscoveryState();
    const disco = [];
    for (const arr of discoByClass.values()) {
        for (const otyp of arr) disco.push(otyp);
    }
    return {
        ocNameKnown: [...ocNameKnown],
        ocEncountered: [...ocEncountered],
        disco,
    };
}

export function setDiscoveryState(state) {
    initDiscoveryState();
    if (!state || !Array.isArray(state.ocNameKnown) || !Array.isArray(state.ocEncountered)) {
        return;
    }
    const n = objectData.length;
    for (let i = 0; i < n; i++) {
        ocNameKnown[i] = !!state.ocNameKnown[i];
        ocEncountered[i] = !!state.ocEncountered[i];
        if (ocNameKnown[i] || ocEncountered[i]) pushDisco(i);
    }
    if (Array.isArray(state.disco)) {
        for (const otyp of state.disco) pushDisco(otyp);
    }
}

// -----------------------------------------------------------------------
// Discoveries display UI
// C ref: o_init.c dodiscovered()
// -----------------------------------------------------------------------

const DISCOVERIES_TITLE = 'Discoveries, by order of discovery within each class';
const DISCOVERY_HEADER_RE = /^(Unique items|Artifact items|Discovered items|Weapons|Armor|Rings|Amulets|Tools|Comestibles|Potions|Scrolls|Spellbooks|Wands|Coins|Gems\/Stones|Rocks|Balls|Chains|Venoms)$/;

function buildDiscoveriesPages(lines, rows) {
    const contentRows = Math.max(1, (rows || 24) - 1);
    const entries = [
        { text: DISCOVERIES_TITLE, attr: 0 },
        { text: '', attr: 0 },
        ...lines.map((line) => ({
            text: String(line || ''),
            attr: DISCOVERY_HEADER_RE.test(String(line || '')) ? 1 : 0,
        })),
    ];
    const pages = [];
    for (let i = 0; i < entries.length; i += contentRows) {
        pages.push(entries.slice(i, i + contentRows));
    }
    return pages.length > 0 ? pages : [[{ text: DISCOVERIES_TITLE, attr: 0 }]];
}

async function drawDiscoveriesPage(display, page) {
    const contentRows = Math.max(1, (display.rows || 24) - 1);
    const cols = display.cols || 80;
    display.clearScreen();
    for (let r = 0; r < contentRows; r++) {
        const row = page[r];
        if (!row) continue;
        await display.putstr(0, r, row.text.substring(0, cols), undefined, row.attr || 0);
    }
    display.clearRow(contentRows);
    await display.putstr(0, contentRows, '--More--', undefined, 0);
}

export async function handleDiscoveries(game) {
    const { display } = game;
    const lines = getDiscoveriesMenuLines();
    if (!lines.length) {
        await display.putstr_message("You haven't discovered anything yet...");
        return { moved: false, tookTime: false };
    }

    const savedAnsi = (typeof display.getScreenAnsiLines === 'function')
        ? display.getScreenAnsiLines()
        : null;
    const savedLines = (typeof display.getScreenLines === 'function')
        ? display.getScreenLines()
        : null;

    const pages = buildDiscoveriesPages(lines, display.rows || 24);
    let pageIndex = 0;
    while (true) {
        await drawDiscoveriesPage(display, pages[pageIndex] || []);
        const ch = await awaitInput(game, nhgetch_raw(), { site: 'o_init.handleDiscoveries.pageNav' });
        if (ch === 32 || ch === 10 || ch === 13) {
            if (pageIndex + 1 < pages.length) {
                pageIndex++;
                continue;
            }
            break;
        }
        if (ch === 98 && pageIndex > 0) {
            pageIndex--;
            continue;
        }
        break;
    }

    if (Array.isArray(savedAnsi)
        && savedAnsi.length > 0
        && typeof display.setScreenAnsiLines === 'function') {
        display.setScreenAnsiLines(savedAnsi);
    } else if (Array.isArray(savedLines)
        && savedLines.length > 0
        && typeof display.setScreenLines === 'function') {
        display.setScreenLines(savedLines);
    } else if (typeof game.docrt === 'function') {
        game.docrt();
    }
    display.topMessage = null;
    display.messageNeedsMore = false;
    return { moved: false, tookTime: false };
}

// -----------------------------------------------------------------------
// C-surface wrappers for o_init.c parity and CODEMATCH tracking
// -----------------------------------------------------------------------

// cf. o_init.c:34 — window-port tile shuffling hook (no-op for JS tilesets)
export function shuffle_tiles() {
    return;
}

// cf. o_init.c:264 — initialize class probability totals and bases[]
export function init_oclass_probs() {
    initObjectData();
}

// cf. o_init.c:473
export function discover_object(otyp, mark_as_known, credit_clue, mark_as_encountered) {
    discoverObject(otyp, !!mark_as_known, !!mark_as_encountered, !!credit_clue);
}

// cf. o_init.c:517
export function undiscover_object(oindx) {
    undiscoverObject(oindx);
}

// cf. o_init.c:569
export function discovered_cmp(a, b) {
    return String(a).localeCompare(String(b));
}

// cf. o_init.c:583
export function sortloot_descr(a, b) {
    return discovered_cmp(a, b);
}

// cf. o_init.c:709
export function disco_append_typename(prefix, otyp) {
    const name = discoveryTypeName(otyp);
    const pfx = prefix ? String(prefix) : '';
    return pfx ? `${pfx}${name}` : name;
}

// cf. o_init.c:756
export async function dodiscovered(game) {
    return handleDiscoveries(game);
}

// cf. o_init.c:870
export async function doclassdisco(_oclass, game) {
    return handleDiscoveries(game);
}

// cf. o_init.c:399
export function savenames(nhfp) {
    if (!nhfp || typeof nhfp !== 'object')
        return;
    nhfp.discoveryState = JSON.parse(JSON.stringify(getDiscoveryState()));
}

// cf. o_init.c:435
export function restnames(nhfp) {
    if (!nhfp || typeof nhfp !== 'object' || !nhfp.discoveryState)
        return;
    setDiscoveryState(nhfp.discoveryState);
}

// cf. o_init.c:1087
export function rename_disco(otyp, uname) {
    const od = objectData[otyp];
    if (!od)
        return;
    od.oc_uname = uname ? String(uname) : null;
}
