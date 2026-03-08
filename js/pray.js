// pray.js -- Prayer mechanics, sacrifice system, and deity interaction
// cf. pray.c — critically_low_hp, stuck_in_wall, in_trouble,
//              worst_cursed_item, fix_curse_trouble, fix_worst_trouble,
//              god_zaps_you, fry_by_god, angrygods, at_your_feet, gcrownu,
//              give_spell, pleased, water_prayer, godvoice, gods_angry,
//              gods_upset, consume_offering, offer_too_soon,
//              desecrate_altar, offer_real_amulet, offer_negative_valued,
//              offer_fake_amulet, offer_different_alignment_altar,
//              sacrifice_your_race, bestow_artifact, sacrifice_value,
//              dosacrifice, eval_offering, offer_corpse,
//              can_pray, pray_revive, dopray, prayer_done,
//              maybe_turn_mon_iter, doturn,
//              altarmask_at, a_gname, a_gname_at, u_gname,
//              align_gname, halu_gname, align_gtitle,
//              altar_wrath, blocked_boulder
//
// pray.c covers:
//   - Prayer (#pray command): dopray/can_pray/prayer_done, crisis detection
//     (in_trouble, critically_low_hp, stuck_in_wall), and divine response
//     (pleased, fix_worst_trouble, angrygods, god_zaps_you, fry_by_god)
//   - Sacrifice (#offer command): dosacrifice/eval_offering/offer_corpse,
//     sacrifice_value, bestow_artifact, various offer_* cases
//   - Turning undead (#turn command): doturn/maybe_turn_mon_iter
//   - Deity name helpers: align_gname, a_gname, u_gname, halu_gname, align_gtitle
//   - Water prayer (bless/curse water on altar)
//   - Altar wrath on desecration

import { A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, AM_MASK, AM_SHRINE, AM_CHAOTIC,
         AM_SANCTUM, ALTAR, ROOM, SDOOR, SCORR, isok, Amask2align, Align2amask,
         A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         HVY_ENCUMBER, EXT_ENCUMBER, W_SADDLE, TT_NONE, TT_LAVA, TT_BURIEDBALL,
         BOLT_LIM } from './const.js';
import { roles, godForRoleAlign, isGoddess } from './player.js';
import { rn2, rnd, rn1, rnl, rnz, d } from './rng.js';
import { rn2_on_display_rng } from './rng.js';
import { pline, pline_The, verbalize, You, Your, You_feel, You_hear,
         livelog_printf } from './pline.js';
import { S_altar } from './symbols.js';
import { IS_OBSTRUCTED, POOL, LAVAPOOL, M_AP_FURNITURE } from './const.js';
import { mark_vision_dirty } from './vision.js';
import { S_LICH, S_GHOST, S_VAMPIRE, S_WRAITH, S_MUMMY, S_ZOMBIE, S_HUMAN,
         mons, PM_ACID_BLOB, PM_WRAITH,
         PM_CLERIC, PM_KNIGHT, PM_WIZARD, PM_MONK,
         AT_ENGL, AD_BLND } from './monsters.js';
import { Role_if } from './role.js';
import { makeplural, is_weptool } from './objnam.js';
import { CORPSE, STATUE, AMULET_OF_YENDOR, FAKE_AMULET_OF_YENDOR,
         POT_WATER, POTION_CLASS, LOADSTONE, LEVITATION_BOOTS, FUMBLE_BOOTS,
         GAUNTLETS_OF_FUMBLING, HELM_OF_OPPOSITE_ALIGNMENT,
         AMULET_OF_STRANGULATION, AMULET_OF_UNCHANGING, RIN_LEVITATION, RIN_SUSTAIN_ABILITY, TOOL_CLASS,
         SADDLE, LONG_SWORD, RUNESWORD, MAGIC_MARKER,
         WEAPON_CLASS, SPBOOK_CLASS, STRANGE_OBJECT, BOULDER,
         SPE_FINGER_OF_DEATH, SPE_RESTORE_ABILITY, SPE_TURN_UNDEAD,
         SPE_BLANK_PAPER, objectData, bases } from './objects.js';
import { ART_EXCALIBUR, ART_VORPAL_BLADE, ART_STORMBRINGER } from './artifacts.js';
import { artiname, exist_artifact, nartifact_exist, mk_artifact,
         artifact_origin, is_art, confers_luck, discover_artifact } from './artifact.js';
import { mksobj, mkobj, bless as bless_obj, uncurse, xname } from './mkobj.js';
import { hcolor } from './do_name.js';
import { mon_nam, Monnam } from './do_name.js';
import { is_undead, is_demon, is_human, is_unicorn, nohands, throws_rocks,
         can_chant, attacktype_fordmg } from './mondata.js';
import { exercise } from './attrib_exercise.js';
import { upstart, s_suffix, sgn } from './hacklib.js';
import { body_part, rehumanize } from './polyself.js';
import { which_armor } from './worn.js';
import { killed, wake_nearby } from './mon.js';
import { losexp } from './exper.js';
import { rndcurse, attrcurse } from './sit.js';
import { safe_teleds } from './teleport.js';
import { summon_minion, dlord } from './minion.js';
import { makemon } from './makemon.js';
import { weapon_type, unrestrict_weapon_skill, add_weapon_skill } from './weapon.js';
import { monflee } from './monmove.js';
import { newsym } from './display.js';
import { couldsee } from './vision.js';
import { aggravate } from './wizard.js';
import { spelleffects } from './spell.js';
import { buried_ball_to_freedom } from './dig.js';
import { resist } from './zap.js';
import { Luck } from './attrib.js';

// cf. pray.c:58 -- Moloch constant
const Moloch = "Moloch";

// cf. pray.c:60 -- godvoices[] for "The voice of <god> <verb>:"
const godvoices = ["booms out", "thunders", "rings out", "booms"];

// cf. pray.c:2557 -- hallu_gods[] for hallucinated deity names
const hallu_gods = [
    "the Flying Spaghetti Monster", // Church of the FSM
    "Eris",                         // Discordianism
    "the Martians",                 // every science fiction ever
    "Xom",                          // Crawl
    "AnDoR dRaKoN",                 // ADOM
    "the Central Bank of Yendor",   // economics
    "Tooth Fairy",                  // real world(?)
    "Om",                           // Discworld
    "Yawgmoth",                     // Magic: the Gathering
    "Morgoth",                      // LoTR
    "Cthulhu",                      // Lovecraft
    "the Ori",                      // Stargate
    "destiny",                      // why not?
    "your Friend the Computer",     // Paranoia
];

// Trouble constants (cf. pray.c:76-101)
const TROUBLE_STONED = 14;
const TROUBLE_SLIMED = 13;
const TROUBLE_STRANGLED = 12;
const TROUBLE_LAVA = 11;
const TROUBLE_SICK = 10;
const TROUBLE_STARVING = 9;
const TROUBLE_REGION = 8;
const TROUBLE_HIT = 7;
const TROUBLE_LYCANTHROPE = 6;
const TROUBLE_COLLAPSING = 5;
const TROUBLE_STUCK_IN_WALL = 4;
const TROUBLE_CURSED_LEVITATION = 3;
const TROUBLE_UNUSEABLE_HANDS = 2;
const TROUBLE_CURSED_BLINDFOLD = 1;

const TROUBLE_PUNISHED = -1;
const TROUBLE_FUMBLING = -2;
const TROUBLE_CURSED_ITEMS = -3;
const TROUBLE_SADDLE = -4;
const TROUBLE_BLIND = -5;
const TROUBLE_POISONED = -6;
const TROUBLE_WOUNDED_LEGS = -7;
const TROUBLE_HUNGRY = -8;
const TROUBLE_STUNNED = -9;
const TROUBLE_CONFUSED = -10;
const TROUBLE_HALLUCINATION = -11;

// Alignment record thresholds (cf. pray.c:64-68)
const PIOUS = 20;
const DEVOUT = 14;
const FERVENT = 9;
const STRIDENT = 4;

const ALIGNLIM = 14;
const MAXVALUE = 24;
const LUCKMAX = 10;
const NATTK = 6;
const A_MAX = 6;

// Body part constants (cf. mondata.h)
const STOMACH = 6;
const FOOT = 9;
const EYE = 8;

// Hunger thresholds (cf. hunger.h)
// In JS, player.hunger is a numeric value; higher = more fed
// C: SATIATED=0, NOT_HUNGRY=1, HUNGRY=2, WEAK=3, FAINTING=4, FAINTED=5, STARVED=6
// In our JS, hunger values roughly: >300 = not hungry, 150-300 = hungry, 50-150 = weak, <50 = fainting
const HUNGER_WEAK = 50;
const HUNGER_HUNGRY = 150;

// TT_ constants imported from trap.js

// C macro helpers
function Cursed_obj(obj, typ) {
    return obj && obj.otyp === typ && obj.cursed;
}

function ugod_is_angry(player) {
    return player.alignmentRecord < 0;
}

function on_altar(player, map) {
    const loc = map.at(player.x, player.y);
    return loc.typ === ALTAR;
}

function on_shrine(player, map) {
    const loc = map.at(player.x, player.y);
    return !!((loc.flags || 0) & AM_SHRINE);
}

// C ref: xlev_to_rank(xlev) -- maps 1..30 into 0..8
function xlev_to_rank(xlev) {
    if (xlev <= 2) return 0;
    if (xlev <= 5) return 1;
    if (xlev <= 9) return 2;
    if (xlev <= 13) return 3;
    if (xlev <= 17) return 4;
    if (xlev <= 21) return 5;
    if (xlev <= 25) return 6;
    if (xlev <= 29) return 7;
    return 8;
}

// Helper: near_capacity based on encumbrance
function near_capacity(player) {
    // Simplified: return encumbrance level 0-4
    return player.encumbrance || 0;
}

// Helper: welded weapon check
function welded(obj) {
    return obj && obj.cursed && obj.bknown;
}

// Helper: stuck ring check (cursed ring that can't be removed)
function stuck_ring(ring, typ) {
    if (!ring || ring.otyp !== typ) return null;
    if (ring.cursed) return ring;
    return null;
}

// Helper: freehand check
function freehand(player) {
    // True if player has a free hand (not dual-wielding or holding 2H weapon)
    return !player.shield || !player.weapon;
}

// Helper: bimanual weapon check
function bimanual(obj) {
    if (!obj) return false;
    const od = objectData[obj.otyp];
    return od && od.bimanual;
}

// Helper: unchanger -- returns amulet of unchanging if worn
function unchanger(player) {
    // C: returns the item conferring Unchanging
    if (player.amulet && player.amulet.otyp === AMULET_OF_UNCHANGING) return player.amulet;
    return null;
}

// is_weptool imported from objnam.js


// Helper: u_wield_art check
function u_wield_art(player, artid) {
    return player.weapon && player.weapon.oartifact === artid;
}

// Helper: carrying check -- is item type in inventory?
function carrying(player, otyp) {
    return player.inventory.some(o => o.otyp === otyp);
}

// Helper: dropy -- drop object at player's feet
function dropy(obj, player, map) {
    obj.ox = player.x;
    obj.oy = player.y;
    const loc = map.at(player.x, player.y);
    if (loc.objects) {
        loc.objects.push(obj);
    } else {
        loc.objects = [obj];
    }
}

// Helper: place_object
function place_object(obj, x, y, map) {
    obj.ox = x;
    obj.oy = y;
    const loc = map.at(x, y);
    if (loc.objects) {
        loc.objects.push(obj);
    } else {
        loc.objects = [obj];
    }
}

// Helper: carried check -- is object in player inventory?
function carried(obj, player) {
    return player.inventory.includes(obj);
}

// Helper: useup -- consume an item from inventory
function useup(obj, player) {
    if (obj.quan > 1) {
        obj.quan--;
    } else {
        player.removeFromInventory(obj);
    }
}

// Helper: useupf -- consume an item from the floor
function useupf(obj, quan, map) {
    if (obj.quan > quan) {
        obj.quan -= quan;
    } else {
        const loc = map.at(obj.ox, obj.oy);
        if (loc.objects) {
            const idx = loc.objects.indexOf(obj);
            if (idx >= 0) loc.objects.splice(idx, 1);
        }
    }
}

// Helper: update_inventory display refresh
function update_inventory() {
    // Display update stub -- handled by game loop
}

// Helper: adjalign -- adjust alignment record
function adjalign(player, delta) {
    player.alignmentRecord = (player.alignmentRecord || 0) + delta;
}

// Helper: adjattrib -- adjust an attribute
function adjattrib(player, attr, delta, _silent) {
    if (attr >= 0 && attr < A_MAX && player.attributes) {
        player.attributes[attr] = Math.max(3, player.attributes[attr] + delta);
    }
    return delta !== 0;
}

// Helper: change_luck
function change_luck(player, delta) {
    player.luck = (player.luck || 0) + delta;
}

// Helper: init_uhunger -- reset hunger to normal
function init_uhunger(player) {
    player.hunger = 900;
}

// Helper: make_sick
function make_sick(player, duration, _cause, _talk, _type) {
    player.sick = duration ? duration : 0;
}

// Helper: make_stunned
function make_stunned(player, duration, _talk) {
    player.stunned = duration ? duration : 0;
}

// Helper: make_confused
function make_confused(player, duration, _talk) {
    player.confused = duration ? duration : 0;
}

// Helper: make_hallucinated
function make_hallucinated(player, duration, _talk, _mask) {
    player.hallucinating = duration ? duration : 0;
}

// Helper: make_blinded
function make_blinded(player, duration, _talk) {
    const was_blind = !!player.blind;
    player.blind = duration ? duration : 0;
    if (!!player.blind !== was_blind) mark_vision_dirty();
}

// Helper: make_stoned
async function make_stoned(player, duration, msg, _opt, _arg) {
    if (player.stoned !== undefined) player.stoned = duration ? duration : 0;
    if (msg) await pline(msg);
}

// Helper: make_slimed
async function make_slimed(player, duration, msg) {
    if (player.slimed !== undefined) player.slimed = duration ? duration : 0;
    if (msg) await pline(msg);
}

// Helper: nomul -- set multi-turn paralysis
function nomul(player, turns) {
    player.multi = turns;
}

// Helper: losehp -- lose hit points
function losehp(player, dmg, reason, _type) {
    player.uhp -= dmg;
    if (player.uhp <= 0) {
        player.deathCause = reason;
    }
}

// Helper: done -- end the game
function done(player, reason) {
    player.deathCause = reason;
    // Game ending is handled externally
}

// Helper: unpunish
function unpunish(player) {
    player.punished = false;
}

// Helper: punish
function punish(player) {
    player.punished = true;
}

// Helper: heal_legs
function heal_legs(player) {
    if (player.woundedLegs) player.woundedLegs = 0;
}

// Helper: you_unwere -- cure lycanthropy
function you_unwere(player, _talk) {
    player.ulycn = -1;
}

// Helper: encumber_msg
function encumber_msg() {
    // Display update stub
}

// Helper: setuhpmax
function setuhpmax(player, newmax, alwaysSetBase) {
    if (alwaysSetBase || !player.Upolyd) {
        player.uhpmax = newmax;
    }
    if (player.Upolyd) {
        player.mhmax = newmax;
    }
}

// Helper: region_danger / region_safety stubs
function region_danger() { return false; }
function region_safety() { }

// Helper: reset_utrap
function reset_utrap(player, _talk) {
    player.utrap = 0;
    player.utraptype = TT_NONE;
}

// Helper: rescued_from_terrain stub
function rescued_from_terrain() { }

// Helper: set_itimeout -- set intrinsic timeout
function set_itimeout(player, prop, val) {
    // Stub: set property timeout
}

// Helper: make_glib
function make_glib(player, duration) {
    // Stub: slippery gloves
}

// Helper: shieldeff stub
function shieldeff() { }

// Helper: observe_object stub
function observe_object() { }

// Helper: makeknown stub
function makeknown() { }

// Helper: feel_cockatrice stub -- would cause stoning
function feel_cockatrice() { return false; }

// Helper: rider_corpse_revival stub
function rider_corpse_revival() { return false; }

// Helper: corpse_xname stub
function corpse_xname(obj) { return xname(obj); }

// Helper: your_race check
function your_race(ptr, player) {
    // Check if monster is same race as player
    const raceData = player.race || 0;
    if (is_human(ptr) && raceData === 0) return true; // human
    return false;
}

// Helper: has_omonst / get_mtraits stubs
function has_omonst(obj) { return obj && obj.omonst; }
function get_mtraits(obj) { return obj.omonst || null; }

// makeplural imported from objnam.js

// Helper: vtense -- verb tense adjustment for singular/plural subject
function vtense(subj, verb) {
    // Simplified: if subject appears plural, use base form; else add 's'
    if (subj && (subj.endsWith('s') || subj === 'you')) return verb;
    if (verb === 'are') return 'is';
    if (verb === 'have') return 'has';
    if (verb === 'drop') return 'drops';
    if (verb === 'land') return 'lands';
    if (verb === 'appear') return 'appears';
    if (verb === 'feel') return 'feels';
    if (verb === 'look') return 'looks';
    return verb + 's';
}

// Helper: otense -- object tense
function otense(obj, verb) {
    return vtense(xname(obj), verb);
}

// Helper: An -- "A" or "An" + str
function An(str) {
    if (!str) return "A thing";
    const first = str[0].toLowerCase();
    const article = 'aeiou'.includes(first) ? "An" : "A";
    return article + " " + str;
}

// Helper: an -- "a" or "an" + str
function an(str) {
    if (!str) return "a thing";
    const first = str[0].toLowerCase();
    const article = 'aeiou'.includes(first) ? "an" : "a";
    return article + " " + str;
}

// Helper: Yobjnam2 -- "Your <obj> <verb>"
function Yobjnam2(obj, verb) {
    return "Your " + xname(obj) + " " + verb;
}

// Helper: yname
function yname(obj) {
    return "your " + xname(obj);
}

// Helper: ansimpleoname
function ansimpleoname(obj) {
    return an(xname(obj));
}

// Helper: known_spell
function known_spell(player, otyp) {
    // Returns spell knowledge level: -1=unknown, 0=forgotten, 1+=known
    if (!player.spells) return -1;
    const spell = player.spells.find(s => s.otyp === otyp);
    if (!spell) return -1;
    return spell.sp_know > 0 ? 1 : 0;
}

// Helper: force_learn_spell stub
function force_learn_spell(player, otyp) {
    // Would teach spell; returns letter or null
    if (!player.spells) player.spells = [];
    const existing = player.spells.find(s => s.otyp === otyp);
    if (existing) {
        existing.sp_know = 20000;
        return String.fromCharCode(97 + player.spells.indexOf(existing));
    }
    player.spells.push({ otyp, sp_lev: 0, sp_know: 20000 });
    return String.fromCharCode(97 + player.spells.length - 1);
}

// Helper: mbodypart
function mbodypart(mon, part) {
    // Simplified stub
    if (part === STOMACH) return "stomach";
    if (part === FOOT) return "feet";
    return "body";
}

// Helper: uhim
function uhim(player) {
    return player.female ? "her" : "him";
}

// Helper: dist2
function dist2(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
}

// Helper: mdistu
function mdistu(mon, player) {
    return dist2(player.x, player.y, mon.mx, mon.my);
}

// Helper: angry_priest stub
function angry_priest() { }

// Helper: findpriest stub
function findpriest() { return null; }

// Helper: temple_occupied stub
function temple_occupied() { return null; }

// Helper: p_coaligned stub
function p_coaligned() { return false; }

// Helper: is_pool_or_lava -- checks if tile is pool or lava
function is_pool_or_lava(x, y, map) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    return loc.typ === POOL || loc.typ === LAVAPOOL;
}

// Helper: sobj_at -- checks if object type is at location
function sobj_at(otyp, x, y, map) {
    const loc = map.at(x, y);
    if (!loc.objects) return false;
    return loc.objects.some(o => o.otyp === otyp);
}

// Helper: set_malign
function set_malign(mon) {
    // Stub
}

// Helper: Sokoban check
function in_sokoban() { return false; }

// Helper: record_achievement stub
function record_achievement() { }

// Helper: display_nhwindow stub
function display_nhwindow() { }

// Helper: Soundeffect stub
function Soundeffect() { }

// Helper: oname stub
function oname_obj(obj, name) {
    obj.onamelth = name;
    return obj;
}

// Helper: see_monsters stub
function see_monsters() { }

// Helper: align_str
function align_str(alignment) {
    if (alignment > 0) return "lawful";
    if (alignment < 0) return "chaotic";
    return "neutral";
}

// Helper: ismnum -- check if lycanthrope type is valid
function ismnum(n) { return n != null && n >= 0; }

// Helper: Passes_walls check
function Passes_walls(player) {
    return player.hasProp && player.hasProp('passes_walls');
}

// Helper: Blindfolded check
function Blindfolded(player) {
    return player.blindfold && player.blindfold.cursed;
}

// Helper: Wounded_legs check
function Wounded_legs(player) {
    return player.woundedLegs > 0;
}

// Helper: Fixed_abil check
function Fixed_abil(player) {
    // C: HFixed_abil (sustain ability)
    return false;
}

// Helper: Levitation check
function Levitation(player) {
    return player.levitating;
}

// Helper: Flying check
function Flying(player) {
    return player.flying;
}

// Helper: Reflecting check
function Reflecting(player) {
    return player.reflecting;
}

// Helper: Shock_resistance check
function Shock_resistance(player) {
    return player.shock_resistance;
}

// Helper: Disint_resistance check
function Disint_resistance(player) {
    return player.disint_resistance;
}

// Helper: Antimagic check
function Antimagic(player) {
    return player.antimagic;
}

// Helper: Deaf check
function Deaf(player) {
    return player.deaf;
}

// Helper: Upolyd check
function Upolyd(player) {
    return player.Upolyd || false;
}

// Helper: Unchanging check
function Unchanging(player) {
    return player.Unchanging || false;
}

// Helper: Punished check
function Punished(player) {
    return player.punished;
}

// Helper: Inhell check
function Inhell(player) {
    return player.inGehennom || false;
}

// Helper: Is_astralevel / Is_sanctum
function Is_astralevel() { return false; }
function Is_sanctum() { return false; }

// Helper: resists_elec
function resists_elec(mon) {
    if (!mon || !mon.data) return false;
    return !!(mon.data.mresists & 0x10); // MR_ELEC
}

// Helper: resists_disint
function resists_disint(mon) {
    if (!mon || !mon.data) return false;
    return !!(mon.data.mresists & 0x20); // MR_DISINT
}

// Helper: ureflects stub
function ureflects() { return false; }

// Helper: monstseesu / monstunseesu stubs
function monstseesu() { }
function monstunseesu() { }

// Helper: destroy_arm stub
function destroy_arm() { }

// Helper: obfree stub
function obfree(obj) { /* discard temporary object */ }

// Helper: p_type storage -- prayer state (module-level, set by can_pray)
let p_aligntyp = A_NONE;
let p_trouble = 0;
let p_type = 0;

// Helper: peek_at_iced_corpse_age stub
function peek_at_iced_corpse_age(otmp) {
    return otmp.age || 0;
}

// Helper: spell_skilltype stub
function spell_skilltype() { return 0; }

// Helper: P_RESTRICTED stub
function P_RESTRICTED() { return false; }

// Helper: rnd_class stub -- random object in class range
function rnd_class(low, high) {
    return low + rn2(high - low + 1);
}

// ================================================================
// cf. pray.c:116 -- critically_low_hp(only_if_injured)
// ================================================================
export function critically_low_hp(player, only_if_injured) {
    const curhp = Upolyd(player) ? (player.mh || 0) : player.uhp;
    const rawmax = Upolyd(player) ? (player.mhmax || 1) : player.uhpmax;
    const ulevel = player.ulevel || 1;

    if (only_if_injured && !(curhp < rawmax))
        return false;

    let maxhp = rawmax;
    const hplim = 15 * ulevel;
    if (maxhp > hplim) maxhp = hplim;

    let divisor;
    switch (xlev_to_rank(ulevel)) {
    case 0: case 1: divisor = 5; break;
    case 2: case 3: divisor = 6; break;
    case 4: case 5: divisor = 7; break;
    case 6: case 7: divisor = 8; break;
    default: divisor = 9; break;
    }
    return (curhp <= 5 || curhp * divisor <= maxhp);
}

// ================================================================
// cf. pray.c:2677 -- blocked_boulder(dx, dy, player, map)
// ================================================================
function blocked_boulder(dx, dy, player, map) {
    const bx = player.x + dx, by = player.y + dy;
    if (!isok(bx, by)) return false;

    const loc = map.at(bx, by);
    let count = 0;
    if (loc.objects) {
        for (const obj of loc.objects) {
            if (obj.otyp === BOULDER) count += (obj.quan || 1);
        }
    }

    const nx = player.x + 2 * dx, ny = player.y + 2 * dy;
    switch (count) {
    case 0: return false;
    case 1: break;
    case 2:
        if (isok(nx, ny) && is_pool_or_lava(nx, ny, map)) break;
        // FALLTHRU
    default: return true;
    }
    if (dx && dy && in_sokoban()) return true;
    if (!isok(nx, ny)) return true;
    if (IS_OBSTRUCTED(map.at(nx, ny).typ)) return true;
    if (sobj_at(BOULDER, nx, ny, map)) return true;
    return false;
}

// ================================================================
// cf. pray.c:161 -- stuck_in_wall(player, map)
// ================================================================
export function stuck_in_wall(player, map) {
    if (Passes_walls(player)) return false;
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        const x = player.x + i;
        for (let j = -1; j <= 1; j++) {
            if (!i && !j) continue;
            const y = player.y + j;
            if (!isok(x, y)) {
                count++;
                continue;
            }
            const loc = map.at(x, y);
            if ((IS_OBSTRUCTED(loc.typ)
                 && loc.typ !== SDOOR && loc.typ !== SCORR)
                || (blocked_boulder(i, j, player, map)
                    && !(player.data && throws_rocks(player.data)))) {
                count++;
            }
        }
    }
    return count === 8;
}

// ================================================================
// cf. pray.c:198 -- in_trouble(player, map)
// ================================================================
export function in_trouble(player, map) {
    // Major troubles
    if (player.stoned) return TROUBLE_STONED;
    if (player.slimed) return TROUBLE_SLIMED;
    if (player.strangled) return TROUBLE_STRANGLED;
    if (player.utrap && player.utraptype === TT_LAVA)
        return TROUBLE_LAVA;
    if (player.sick) return TROUBLE_SICK;
    if ((player.hunger || 0) <= HUNGER_WEAK) return TROUBLE_STARVING;
    if (region_danger()) return TROUBLE_REGION;
    if ((!Upolyd(player) || Unchanging(player)) && critically_low_hp(player, false))
        return TROUBLE_HIT;
    if (ismnum(player.ulycn)) return TROUBLE_LYCANTHROPE;
    if (near_capacity(player) >= EXT_ENCUMBER
        && player.attributes
        && (player.attrMax ? player.attrMax[A_STR] : player.attributes[A_STR])
           - player.attributes[A_STR] > 3)
        return TROUBLE_COLLAPSING;
    if (stuck_in_wall(player, map)) return TROUBLE_STUCK_IN_WALL;
    if (Cursed_obj(player.boots, LEVITATION_BOOTS)
        || stuck_ring(player.leftRing, RIN_LEVITATION)
        || stuck_ring(player.rightRing, RIN_LEVITATION))
        return TROUBLE_CURSED_LEVITATION;
    if (player.data && nohands(player.data) || !freehand(player)) {
        if (welded(player.weapon))
            return TROUBLE_UNUSEABLE_HANDS;
        if (Upolyd(player) && player.data && nohands(player.data)
            && (!Unchanging(player) || (unchanger(player) && unchanger(player).cursed)))
            return TROUBLE_UNUSEABLE_HANDS;
    }
    if (player.blindfold && player.blindfold.cursed)
        return TROUBLE_CURSED_BLINDFOLD;

    // Minor troubles
    if (Punished(player) || (player.utrap && player.utraptype === TT_BURIEDBALL))
        return TROUBLE_PUNISHED;
    if (Cursed_obj(player.gloves, GAUNTLETS_OF_FUMBLING)
        || Cursed_obj(player.boots, FUMBLE_BOOTS))
        return TROUBLE_FUMBLING;
    if (worst_cursed_item(player))
        return TROUBLE_CURSED_ITEMS;
    if (player.steed) {
        const saddle = which_armor(player.steed, W_SADDLE);
        if (Cursed_obj(saddle, SADDLE))
            return TROUBLE_SADDLE;
    }
    if (player.blind && !(player.uswallow
            && player.ustuck && player.ustuck.data
            && attacktype_fordmg(player.ustuck.data, AT_ENGL, AD_BLND)))
        return TROUBLE_BLIND;
    if (player.deaf)
        return TROUBLE_BLIND; // deafness cured with blindness

    if (player.attributes) {
        const attrMax = player.attrMax || player.attributes;
        for (let i = 0; i < A_MAX; i++) {
            if (player.attributes[i] < attrMax[i])
                return TROUBLE_POISONED;
        }
    }
    if (Wounded_legs(player) && !player.steed)
        return TROUBLE_WOUNDED_LEGS;
    if ((player.hunger || 0) <= HUNGER_HUNGRY)
        return TROUBLE_HUNGRY;
    if (player.stunned) return TROUBLE_STUNNED;
    if (player.confused) return TROUBLE_CONFUSED;
    if (player.hallucinating) return TROUBLE_HALLUCINATION;
    return 0;
}

// ================================================================
// cf. pray.c:288 -- worst_cursed_item(player)
// ================================================================
export function worst_cursed_item(player) {
    let otmp;

    // If strained or worse, check for loadstone first
    if (near_capacity(player) >= HVY_ENCUMBER) {
        for (const obj of player.inventory) {
            if (Cursed_obj(obj, LOADSTONE)) return obj;
        }
    }
    // weapon takes precedence if interfering with ring/shield
    if (welded(player.weapon) && (player.rightRing || bimanual(player.weapon))) {
        otmp = player.weapon;
    } else if (player.gloves && player.gloves.cursed) {
        otmp = player.gloves;
    } else if (player.shield && player.shield.cursed) {
        otmp = player.shield;
    } else if (player.cloak && player.cloak.cursed) {
        otmp = player.cloak;
    } else if (player.armor && player.armor.cursed) {
        otmp = player.armor;
    } else if (player.helmet && player.helmet.cursed
               && player.helmet.otyp !== HELM_OF_OPPOSITE_ALIGNMENT) {
        otmp = player.helmet;
    } else if (player.boots && player.boots.cursed) {
        otmp = player.boots;
    } else if (player.shirt && player.shirt.cursed) {
        otmp = player.shirt;
    } else if (player.amulet && player.amulet.cursed) {
        otmp = player.amulet;
    } else if (player.leftRing && player.leftRing.cursed) {
        otmp = player.leftRing;
    } else if (player.rightRing && player.rightRing.cursed) {
        otmp = player.rightRing;
    } else if (player.blindfold && player.blindfold.cursed) {
        otmp = player.blindfold;
    } else if (welded(player.weapon)) {
        otmp = player.weapon;
    } else if (player.swapWeapon && player.swapWeapon.cursed && player.twoweap) {
        otmp = player.swapWeapon;
    } else {
        for (const obj of player.inventory) {
            if (!obj.cursed) continue;
            if (obj.otyp === LOADSTONE || confers_luck(obj)) return obj;
        }
        return null;
    }
    return otmp;
}

// ================================================================
// cf. pray.c:349 -- fix_curse_trouble(otmp, what, player)
// ================================================================
async function fix_curse_trouble(otmp, what, player) {
    if (!otmp) {
        // impossible
        return;
    }
    if (otmp === player.gloves && player.glib) {
        player.glib = 0;
        await Your("hands are no longer slippery.");
        if (!otmp.cursed) return;
    }
    if (!player.blind || (otmp === player.blindfold)) {
        await pline("%s %s.",
              what || (Yobjnam2(otmp, "softly glow")),
              hcolor("amber"));
        otmp.bknown = !player.hallucinating;
    }
    uncurse(otmp);
    update_inventory();
}

// ================================================================
// cf. pray.c:373 -- fix_worst_trouble(trouble, player, map)
// ================================================================
async function fix_worst_trouble(trouble, player, map) {
    let otmp = null;
    let what = null;
    const leftglow = "Your left ring softly glows";
    const rightglow = "Your right ring softly glows";

    switch (trouble) {
    case TROUBLE_STONED:
        await make_stoned(player, 0, "You feel more limber.");
        break;
    case TROUBLE_SLIMED:
        await make_slimed(player, 0, "The slime disappears.");
        break;
    case TROUBLE_STRANGLED:
        if (player.amulet && player.amulet.otyp === AMULET_OF_STRANGULATION) {
            await Your("amulet vanishes!");
            useup(player.amulet, player);
            player.amulet = null;
        }
        await You("can breathe again.");
        player.strangled = 0;
        break;
    case TROUBLE_LAVA:
        if (!await safe_teleds(0, { player, map }))
            await reset_utrap(player, true);
        rescued_from_terrain();
        break;
    case TROUBLE_STARVING:
        // FALLTHRU
    case TROUBLE_HUNGRY:
        await Your("%s feels content.", body_part(STOMACH, player));
        await init_uhunger(player);
        break;
    case TROUBLE_SICK:
        await You_feel("better.");
        await make_sick(player, 0, null, false, 0);
        break;
    case TROUBLE_REGION:
        await region_safety();
        break;
    case TROUBLE_HIT: {
        await You_feel("much better.");
        let maxhp;
        if (Upolyd(player)) {
            maxhp = (player.mhmax || 0) + rnd(5);
            player.mhmax = Math.max(maxhp, 6);
            player.mh = player.mhmax;
        }
        maxhp = player.uhpmax;
        if (maxhp < (player.ulevel || 1) * 5 + 11)
            maxhp += rnd(5);
        player.uhpmax = Math.max(maxhp, 6);
        player.uhp = player.uhpmax;
        break;
    }
    case TROUBLE_COLLAPSING: {
        const attrMax = player.attrMax || player.attributes;
        const diff = attrMax[A_STR] - player.attributes[A_STR];
        await You_feel("%sstronger.", diff > 6 ? "much " : "");
        player.attributes[A_STR] = attrMax[A_STR];
        if (Fixed_abil(player)) {
            otmp = stuck_ring(player.leftRing, RIN_SUSTAIN_ABILITY);
            if (otmp && otmp === player.leftRing) what = leftglow;
            if (!otmp) {
                otmp = stuck_ring(player.rightRing, RIN_SUSTAIN_ABILITY);
                if (otmp && otmp === player.rightRing) what = rightglow;
            }
            if (otmp) {
                await fix_curse_trouble(otmp, what, player);
                break;
            }
        }
        break;
    }
    case TROUBLE_STUCK_IN_WALL:
        if (await safe_teleds(0, { player, map })) {
            await Your("surroundings change.");
        } else {
            // C: set_itimeout(&HPasses_walls, d(4,4)+4) — confer phasing
            d(4, 4); // consume RNG for passes_walls timeout
            await You_feel("much slimmer.");
        }
        break;
    case TROUBLE_CURSED_LEVITATION:
        if (Cursed_obj(player.boots, LEVITATION_BOOTS)) {
            otmp = player.boots;
        } else if ((otmp = stuck_ring(player.leftRing, RIN_LEVITATION)) != null) {
            if (otmp === player.leftRing) what = leftglow;
        } else if ((otmp = stuck_ring(player.rightRing, RIN_LEVITATION)) != null) {
            if (otmp === player.rightRing) what = rightglow;
        }
        await fix_curse_trouble(otmp, what, player);
        break;
    case TROUBLE_UNUSEABLE_HANDS:
        if (welded(player.weapon)) {
            otmp = player.weapon;
            await fix_curse_trouble(otmp, what, player);
            break;
        }
        if (Upolyd(player) && player.data && nohands(player.data)) {
            if (!Unchanging(player)) {
                await Your("shape becomes uncertain.");
                await rehumanize(player);
            } else {
                const unch = unchanger(player);
                if (unch && unch.cursed) {
                    await fix_curse_trouble(unch, what, player);
                    break;
                }
            }
        }
        break;
    case TROUBLE_CURSED_BLINDFOLD:
        otmp = player.blindfold;
        await fix_curse_trouble(otmp, what, player);
        break;
    case TROUBLE_LYCANTHROPE:
        you_unwere(player, true);
        break;
    case TROUBLE_PUNISHED:
        await Your("chain disappears.");
        if (player.utrap && player.utraptype === TT_BURIEDBALL)
            buried_ball_to_freedom();
        else
            unpunish(player);
        break;
    case TROUBLE_FUMBLING:
        if (Cursed_obj(player.gloves, GAUNTLETS_OF_FUMBLING))
            otmp = player.gloves;
        else if (Cursed_obj(player.boots, FUMBLE_BOOTS))
            otmp = player.boots;
        await fix_curse_trouble(otmp, what, player);
        break;
    case TROUBLE_CURSED_ITEMS:
        otmp = worst_cursed_item(player);
        if (otmp === player.rightRing) what = rightglow;
        else if (otmp === player.leftRing) what = leftglow;
        await fix_curse_trouble(otmp, what, player);
        break;
    case TROUBLE_POISONED:
        if (player.hallucinating)
            await pline("There's a tiger in your tank.");
        else
            await You_feel("in good health again.");
        if (player.attributes && player.attrMax) {
            for (let i = 0; i < A_MAX; i++) {
                if (player.attributes[i] < player.attrMax[i]) {
                    player.attributes[i] = player.attrMax[i];
                }
            }
        }
        await encumber_msg();
        break;
    case TROUBLE_BLIND:
        if (player.blind) {
            await pline("Your eyes feel better.");
            await make_blinded(player, 0, false);
        }
        if (player.deaf) {
            await pline("You can hear again.");
        }
        break;
    case TROUBLE_WOUNDED_LEGS:
        await heal_legs(player);
        break;
    case TROUBLE_STUNNED:
        await make_stunned(player, 0, true);
        break;
    case TROUBLE_CONFUSED:
        await make_confused(player, 0, true);
        break;
    case TROUBLE_HALLUCINATION:
        await pline("Looks like you are back in Kansas.");
        await make_hallucinated(player, 0, false, 0);
        break;
    case TROUBLE_SADDLE:
        if (player.steed) {
            otmp = which_armor(player.steed, W_SADDLE);
            if (otmp) {
                if (!player.blind) {
                    await pline("%s %s.", Yobjnam2(otmp, "softly glow"), hcolor("amber"));
                }
                uncurse(otmp);
            }
        }
        break;
    }
}

// ================================================================
// cf. pray.c:610 -- god_zaps_you(resp_god, player, map)
// ================================================================
export async function god_zaps_you(resp_god, player, map) {
    if (player.uswallow) {
        await pline(
          "Suddenly a bolt of lightning comes down at you from the heavens!");
        await pline("It strikes %s!", mon_nam(player.ustuck));
        if (!resists_elec(player.ustuck)) {
            await pline("%s fries to a crisp!", Monnam(player.ustuck));
            await killed(player.ustuck, map, player);
        } else {
            await pline("%s seems unaffected.", Monnam(player.ustuck));
        }
    } else {
        await pline("Suddenly, a bolt of lightning strikes you!");
        if (Reflecting(player)) {
            shieldeff();
            if (player.blind)
                await pline("For some reason you're unaffected.");
            else
                await pline("It reflects from your %s.", "body");
        } else if (Shock_resistance(player)) {
            shieldeff();
            await pline("It seems not to affect you.");
        } else {
            await fry_by_god(resp_god, false, player);
        }
    }

    await pline("%s is not deterred...", align_gname(resp_god, player));
    if (player.uswallow) {
        await pline("A wide-angle disintegration beam aimed at you hits %s!",
              mon_nam(player.ustuck));
        if (!resists_disint(player.ustuck)) {
            await pline("%s disintegrates into a pile of dust!", Monnam(player.ustuck));
            await killed(player.ustuck, map, player);
        } else {
            await pline("%s seems unaffected.", Monnam(player.ustuck));
        }
    } else {
        await pline("A wide-angle disintegration beam hits you!");
        // Destroy armor before disintegrating
        if (player.shield) await destroy_arm();
        if (player.cloak) await destroy_arm();
        if (player.armor && !player.cloak) await destroy_arm();
        if (player.shirt && !player.armor && !player.cloak) await destroy_arm();
        if (!Disint_resistance(player)) {
            await fry_by_god(resp_god, true, player);
        } else {
            await You("bask in its black glow for a minute...");
            await godvoice(resp_god, "I believe it not!", player);
        }
        if (Is_astralevel() || Is_sanctum()) {
            await verbalize("Thou cannot escape my wrath, mortal!");
            await summon_minion(resp_god, false, map, player);
            await summon_minion(resp_god, false, map, player);
            await summon_minion(resp_god, false, map, player);
            await verbalize("Destroy %s, my servants!", uhim(player));
        }
    }
}

// ================================================================
// cf. pray.c:694 -- fry_by_god(resp_god, via_disintegration, player)
// ================================================================
export async function fry_by_god(resp_god, via_disintegration, player) {
    await You("%s!", !via_disintegration ? "fry to a crisp"
                                   : "disintegrate into a pile of dust");
    player.deathCause = "the wrath of " + align_gname(resp_god, player);
    await done(player, "DIED");
}

// ================================================================
// cf. pray.c:704 -- angrygods(resp_god, player, map)
// ================================================================
async function angrygods(resp_god, player, map) {
    let maxanger;

    if (Inhell(player)) resp_god = A_NONE;
    player.ublessed = 0; // lose divine protection

    const lk = Luck(player);
    if (resp_god !== player.alignment)
        maxanger = Math.floor((player.alignmentRecord || 0) / 2)
                   + (lk > 0 ? Math.floor(-lk / 3) : -lk);
    else
        maxanger = 3 * (player.ugangr || 0)
                   + ((lk > 0 || (player.alignmentRecord || 0) >= STRIDENT)
                      ? Math.floor(-lk / 3)
                      : -lk);
    if (maxanger < 1) maxanger = 1;
    else if (maxanger > 15) maxanger = 15;

    const mletH = player.data ? player.data.mlet : S_HUMAN;

    switch (rn2(maxanger)) {
    case 0:
    case 1:
        await You_feel("that %s is %s.", align_gname(resp_god, player),
                 player.hallucinating ? "bummed" : "displeased");
        break;
    case 2:
    case 3:
        await godvoice(resp_god, null, player);
        await pline("\"Thou %s, %s.\"",
              (ugod_is_angry(player) && resp_god === player.alignment)
                  ? "hast strayed from the path"
                  : "art arrogant",
              mletH === S_HUMAN ? "mortal" : "creature");
        await verbalize("Thou must relearn thy lessons!");
        await adjattrib(player, A_WIS, -1, false);
        await losexp(player);
        break;
    case 6:
        if (!Punished(player)) {
            await gods_angry(resp_god, player);
            punish(player);
            break;
        }
        // FALLTHRU
    case 4:
    case 5:
        await gods_angry(resp_god, player);
        if (!player.blind && !Antimagic(player))
            await pline("%s glow surrounds you.", An(hcolor("black")));
        if (rn2(2) || !await attrcurse(player))
            await rndcurse(player, map);
        break;
    case 7:
    case 8:
        await godvoice(resp_god, null, player);
        await verbalize("Thou durst %s me?",
                  (on_altar(player, map) && a_align(player.x, player.y, map) !== resp_god)
                      ? "scorn"
                      : "call upon");
        await pline("\"Then die, %s!\"",
              mletH === S_HUMAN ? "mortal" : "creature");
        await summon_minion(resp_god, false, map, player);
        break;
    default:
        await gods_angry(resp_god, player);
        await god_zaps_you(resp_god, player, map);
        break;
    }
    // Set prayer timer
    const new_ublesscnt = rnz(300);
    if (new_ublesscnt > (player.ublesscnt || 0))
        player.ublesscnt = new_ublesscnt;
}

// ================================================================
// cf. pray.c:788 -- at_your_feet(str, player)
// ================================================================
export async function at_your_feet(str, player) {
    if (player.blind) str = "Something";
    if (player.uswallow) {
        await pline("%s drops into %s %s.", str,
              s_suffix(mon_nam(player.ustuck)),
              mbodypart(player.ustuck, STOMACH));
    } else {
        await pline("%s %s %s your %s!", str,
              player.blind ? "lands" : "appears",
              Levitation(player) ? "beneath" : "at",
              makeplural(body_part(FOOT, player)));
    }
}

// ================================================================
// cf. pray.c:805 -- gcrownu(player, map)
// ================================================================
async function gcrownu(player, map) {
    let obj;
    let what;
    let already_exists, in_hand;
    let class_gift;

    // Grant resistances
    // (In full C port these are intrinsic flags; here we note them)
    // HSee_invisible, HFire/Cold/Shock/Sleep/Poison_resistance |= FROMOUTSIDE
    await godvoice(player.alignment, null, player);

    class_gift = STRANGE_OBJECT;
    if (Role_if(player, PM_WIZARD)
        && !u_wield_art(player, ART_VORPAL_BLADE)
        && !u_wield_art(player, ART_STORMBRINGER)
        && !carrying(player, SPE_FINGER_OF_DEATH)) {
        class_gift = SPE_FINGER_OF_DEATH;
    } else if (Role_if(player, PM_MONK)
               && (!player.weapon || !player.weapon.oartifact)
               && !carrying(player, SPE_RESTORE_ABILITY)) {
        class_gift = SPE_RESTORE_ABILITY;
    }

    const ok_wep = (o) => o && (o.oclass === WEAPON_CLASS || is_weptool(o));
    obj = ok_wep(player.weapon) ? player.weapon : null;
    already_exists = false;
    in_hand = false;

    switch (player.alignment) {
    case A_LAWFUL:
        if (!player.uevent) player.uevent = {};
        player.uevent.uhand_of_elbereth = 1;
        await verbalize("I crown thee...  The Hand of Elbereth!");
        livelog_printf(0, "was crowned \"The Hand of Elbereth\" by %s",
                       u_gname(player));
        break;
    case A_NEUTRAL:
        if (!player.uevent) player.uevent = {};
        player.uevent.uhand_of_elbereth = 2;
        in_hand = u_wield_art(player, ART_VORPAL_BLADE);
        already_exists = exist_artifact(LONG_SWORD, artiname(ART_VORPAL_BLADE));
        await verbalize("Thou shalt be my Envoy of Balance!");
        livelog_printf(0, "became %s Envoy of Balance", s_suffix(u_gname(player)));
        break;
    case A_CHAOTIC:
        if (!player.uevent) player.uevent = {};
        player.uevent.uhand_of_elbereth = 3;
        in_hand = u_wield_art(player, ART_STORMBRINGER);
        already_exists = exist_artifact(RUNESWORD, artiname(ART_STORMBRINGER));
        what = (((already_exists && !in_hand) || class_gift !== STRANGE_OBJECT)
                ? "take lives" : "steal souls");
        await verbalize("Thou art chosen to %s for My Glory!", what);
        livelog_printf(0, "was chosen to %s for the Glory of %s",
                       what, u_gname(player));
        break;
    }

    // Grant class-specific spellbook gift
    const od = class_gift !== STRANGE_OBJECT ? objectData[class_gift] : null;
    if (od && od.oclass === SPBOOK_CLASS) {
        obj = mksobj(class_gift, true, false);
        bless_obj(obj);
        obj.bknown = true;
        await at_your_feet(upstart(ansimpleoname(obj)), player);
        await dropy(obj, player, map);
        player.ugifts = (player.ugifts || 0) + 1;
        livelog_printf(0, "was bestowed with %s", xname(obj));
        if (known_spell(player, class_gift) >= 0 && ok_wep(player.weapon))
            obj = player.weapon;
    }

    // Grant alignment-specific artifact
    switch (player.alignment) {
    case A_LAWFUL:
        if (class_gift === STRANGE_OBJECT && obj && obj.otyp === LONG_SWORD && !obj.oartifact) {
            if (!player.blind) await Your("sword shines brightly for a moment.");
            obj = oname_obj(obj, artiname(ART_EXCALIBUR));
            if (is_art(obj, ART_EXCALIBUR)) {
                player.ugifts = (player.ugifts || 0) + 1;
            }
        }
        unrestrict_weapon_skill(weapon_type({ otyp: LONG_SWORD }));
        break;
    case A_NEUTRAL:
        if (class_gift === STRANGE_OBJECT) {
            if (obj && in_hand) {
                await Your("%s goes snicker-snack!", xname(obj));
            } else if (!already_exists) {
                obj = mksobj(LONG_SWORD, false, false);
                obj = oname_obj(obj, artiname(ART_VORPAL_BLADE));
                obj.spe = 1;
                await at_your_feet("A sword", player);
                await dropy(obj, player, map);
                player.ugifts = (player.ugifts || 0) + 1;
                livelog_printf(0, "was bestowed with %s", artiname(ART_VORPAL_BLADE));
            }
        }
        unrestrict_weapon_skill(weapon_type({ otyp: LONG_SWORD }));
        break;
    case A_CHAOTIC: {
        const swordbuf = hcolor("black") + " sword";
        if (class_gift === STRANGE_OBJECT) {
            if (obj && in_hand) {
                await Your("%s hums ominously!", swordbuf);
            } else if (!already_exists) {
                obj = mksobj(RUNESWORD, false, false);
                obj = oname_obj(obj, artiname(ART_STORMBRINGER));
                obj.spe = 1;
                await at_your_feet(An(swordbuf), player);
                await dropy(obj, player, map);
                player.ugifts = (player.ugifts || 0) + 1;
                livelog_printf(0, "was bestowed with %s", artiname(ART_STORMBRINGER));
            }
        }
        // P_BROAD_SWORD skill
        unrestrict_weapon_skill(weapon_type({ otyp: RUNESWORD }));
        break;
    }
    default:
        obj = null;
        break;
    }

    // Enhance weapon
    if (ok_wep(obj)) {
        bless_obj(obj);
        obj.oeroded = 0;
        obj.oeroded2 = 0;
        obj.oerodeproof = true;
        obj.bknown = true;
        obj.rknown = true;
        if ((obj.spe || 0) < 1) obj.spe = 1;
        unrestrict_weapon_skill(weapon_type(obj));
    } else if (class_gift === STRANGE_OBJECT) {
        await You_feel("unworthy.");
    }
    update_inventory();
    add_weapon_skill(1);
}

// ================================================================
// cf. pray.c:999 -- give_spell(player, map)
// ================================================================
async function give_spell(player, map) {
    // Create a random spellbook
    let otmp = mkobj(SPBOOK_CLASS, true);
    let trycnt = (player.ulevel || 1) + 1;
    while (--trycnt > 0) {
        if (otmp.otyp !== SPE_BLANK_PAPER) {
            if (known_spell(player, otmp.otyp) <= 0)
                break;
        } else {
            break;
        }
        // C: rnd_class(svb.bases[SPBOOK_CLASS], SPE_BLANK_PAPER) — always full range
        otmp.otyp = rnd_class(bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
    }

    // 25% chance of learning directly
    if (otmp.otyp !== SPE_BLANK_PAPER && !rn2(4)
        && known_spell(player, otmp.otyp) !== 1) {
        const spe_let = force_learn_spell(player, otmp.otyp);
        if (spe_let) {
            const spe_name = objectData[otmp.otyp] ? objectData[otmp.otyp].oc_name : "a spell";
            const prior = known_spell(player, otmp.otyp);
            if (prior <= 0)
                await pline("Divine knowledge of %s fills your mind!  Spell '%s'.",
                      spe_name, spe_let);
            else
                await Your("knowledge of spell '%s' - %s is refreshed.", spe_let, spe_name);
        }
        obfree(otmp);
    } else {
        // C: if (otmp->otyp == SPE_BLANK_PAPER || !rn2(100)) makeknown(otmp->otyp)
        if (otmp.otyp === SPE_BLANK_PAPER || !rn2(100)) {
            // makeknown — RNG consumed above
        }
        bless_obj(otmp);
        await at_your_feet(upstart(ansimpleoname(otmp)), player);
        place_object(otmp, player.x, player.y, map);
        newsym(player.x, player.y);
    }
}

// ================================================================
// cf. pray.c:1071 -- pleased(g_align, player, map)
// ================================================================
async function pleased(g_align, player, map) {
    let trouble = in_trouble(player, map);
    let pat_on_head = 0;

    await You_feel("that %s is %s.", align_gname(g_align, player),
             ((player.alignmentRecord || 0) >= DEVOUT)
                 ? (player.hallucinating ? "pleased as punch" : "well-pleased")
                 : ((player.alignmentRecord || 0) >= STRIDENT)
                       ? (player.hallucinating ? "ticklish" : "pleased")
                       : (player.hallucinating ? "full" : "satisfied"));

    // Not your deity
    if (on_altar(player, map) && p_aligntyp !== player.alignment) {
        adjalign(player, -1);
        return;
    } else if ((player.alignmentRecord || 0) < 2 && trouble <= 0) {
        adjalign(player, 1);
    }

    if (!trouble && (player.alignmentRecord || 0) >= DEVOUT) {
        if (p_trouble === 0) pat_on_head = 1;
    } else {
        let tryct = 0;
        let prayer_luck = Math.max(Luck(player), -1);
        let action = rn1(prayer_luck + (on_altar(player, map) ? 3 + (on_shrine(player, map) ? 1 : 0) : 2), 1);
        if (!on_altar(player, map))
            action = Math.min(action, 3);
        if ((player.alignmentRecord || 0) < STRIDENT)
            action = ((player.alignmentRecord || 0) > 0 || !rnl(2, Luck(player))) ? 1 : 0;

        switch (Math.min(action, 5)) {
        case 5:
            pat_on_head = 1;
            // FALLTHRU
        case 4:
            do {
                await fix_worst_trouble(trouble, player, map);
            } while ((trouble = in_trouble(player, map)) !== 0);
            break;
        case 3:
            await fix_worst_trouble(trouble, player, map);
            // FALLTHRU
        case 2:
            while ((trouble = in_trouble(player, map)) > 0 && ++tryct < 10)
                await fix_worst_trouble(trouble, player, map);
            break;
        case 1:
            if (trouble > 0)
                await fix_worst_trouble(trouble, player, map);
            break;
        case 0:
            break; // blown off
        }
    }

    if (pat_on_head)
        switch (rn2(Math.floor((Luck(player) + 6) / 2))) {
        case 0:
            break;
        case 1:
            if (player.weapon && (welded(player.weapon)
                || player.weapon.oclass === WEAPON_CLASS
                || is_weptool(player.weapon))) {
                if (player.weapon.cursed) {
                    if (!player.blind) {
                        await pline("%s %s.", Yobjnam2(player.weapon, "softly glow"),
                              hcolor("amber"));
                    } else {
                        await You_feel("the power of %s over %s.", u_gname(player),
                                 yname(player.weapon));
                    }
                    uncurse(player.weapon);
                    player.weapon.bknown = true;
                } else if (!player.weapon.blessed) {
                    if (!player.blind) {
                        await pline("%s with %s aura.",
                              Yobjnam2(player.weapon, "softly glow"),
                              an(hcolor("light blue")));
                    } else {
                        await You_feel("the blessing of %s over %s.", u_gname(player),
                                 yname(player.weapon));
                    }
                    bless_obj(player.weapon);
                    player.weapon.bknown = true;
                }
                if (player.weapon.oeroded || player.weapon.oeroded2) {
                    player.weapon.oeroded = 0;
                    player.weapon.oeroded2 = 0;
                }
                update_inventory();
            }
            break;
        case 3:
            // Castle tune hint
            if (!player.uevent) player.uevent = {};
            if (!player.uevent.uopened_dbridge && !player.uevent.gehennom_entered) {
                if ((player.uevent.uheard_tune || 0) < 1) {
                    await godvoice(g_align, null, player);
                    await verbalize("Hark, %s!",
                              (player.data && is_human(player.data)) ? "mortal" : "creature");
                    await verbalize("To enter the castle, thou must play the right tune!");
                    player.uevent.uheard_tune = (player.uevent.uheard_tune || 0) + 1;
                    break;
                } else if ((player.uevent.uheard_tune || 0) < 2) {
                    await You_hear("a divine music...");
                    await pline("It sounds like:  \"%s\".", player.tune || "");
                    player.uevent.uheard_tune = (player.uevent.uheard_tune || 0) + 1;
                    record_achievement();
                    break;
                }
            }
            // FALLTHRU
        case 2:
            if (!player.blind)
                await You("are surrounded by %s glow.", an(hcolor("golden")));
            if ((player.ulevel || 1) < (player.levelmax || player.ulevel || 1)) {
                // Would call pluslvl
            } else {
                player.uhpmax = (player.uhpmax || 0) + 5;
                if (Upolyd(player))
                    player.mhmax = (player.mhmax || 0) + 5;
            }
            player.uhp = player.uhpmax;
            if (Upolyd(player))
                player.mh = player.mhmax;
            if (player.attributes && player.attrMax
                && player.attributes[A_STR] < player.attrMax[A_STR]) {
                player.attributes[A_STR] = player.attrMax[A_STR];
                await encumber_msg();
            }
            if ((player.hunger || 0) < 900) await init_uhunger(player);
            if ((player.luck || 0) < 0) player.luck = 0;
            player.ucreamed = 0;
            await make_blinded(player, 0, true);
            break;
        case 4: {
            if (player.blind)
                await You_feel("the power of %s.", u_gname(player));
            else
                await You("are surrounded by %s aura.", an(hcolor("light blue")));
            let any = 0;
            for (const otmp of player.inventory) {
                if (otmp.cursed
                    && (otmp !== player.helmet
                        || player.helmet.otyp !== HELM_OF_OPPOSITE_ALIGNMENT)) {
                    if (!player.blind) {
                        await pline("%s %s.", Yobjnam2(otmp, "softly glow"),
                              hcolor("amber"));
                        otmp.bknown = true;
                        any++;
                    }
                    uncurse(otmp);
                }
            }
            if (any) update_inventory();
            break;
        }
        case 5: {
            const msg = "\"and thus I grant thee the gift of %s!\"";
            await godvoice(player.alignment, "Thou hast pleased me with thy progress,", player);
            // Grant intrinsic in priority order
            if (!player.telepat) {
                await pline(msg, "Telepathy");
            } else if (!player.fast) {
                await pline(msg, "Speed");
            } else if (!player.stealth) {
                await pline(msg, "Stealth");
            } else {
                // C: if !(HProtection & INTRINSIC): ublessed = rn1(3, 2), else ublessed++
                if (!player.ublessed) {
                    player.ublessed = rn1(3, 2);
                } else {
                    player.ublessed = (player.ublessed || 0) + 1;
                }
                await pline(msg, "my protection");
            }
            await verbalize("Use it wisely in my name!");
            break;
        }
        case 7:
        case 8:
            if ((player.alignmentRecord || 0) >= PIOUS
                && !(player.uevent && player.uevent.uhand_of_elbereth)) {
                await gcrownu(player, map);
                break;
            }
            // FALLTHRU
        case 6:
            await give_spell(player, map);
            break;
        default:
            break;
        }

    player.ublesscnt = rnz(350);
    let kick_on_butt = (player.uevent && player.uevent.udemigod) ? 1 : 0;
    if (player.uevent && player.uevent.uhand_of_elbereth) kick_on_butt++;
    if (kick_on_butt) player.ublesscnt += kick_on_butt * rnz(1000);

    // Anti-DoS: increase prayer timeout for very long games
    const moves = player.turns || 0;
    if (moves > 100000) {
        let incr = Math.floor((moves - 100000) / 100);
        if (incr > 32000 - player.ublesscnt) incr = 32000 - player.ublesscnt;
        if (incr > 0) player.ublesscnt += incr;
    }
}

// ================================================================
// cf. pray.c:1387 -- water_prayer(bless_water, player, map)
// ================================================================
export async function water_prayer(bless_water, player, map) {
    let changed = 0;
    let other = false;
    const bc_known = !(player.blind || player.hallucinating);

    const loc = map.at(player.x, player.y);
    const objs = loc.objects || [];
    for (const otmp of objs) {
        if (otmp.otyp === POT_WATER
            && (bless_water ? !otmp.blessed : !otmp.cursed)) {
            otmp.blessed = bless_water;
            otmp.cursed = !bless_water;
            otmp.bknown = bc_known;
            changed += (otmp.quan || 1);
        } else if (objectData[otmp.otyp] && objectData[otmp.otyp].oclass === POTION_CLASS) {
            other = true;
        }
    }
    if (!player.blind && changed) {
        await pline("%s potion%s on the altar glow%s %s for a moment.",
              ((other && changed > 1) ? "Some of the"
                                       : (other ? "One of the" : "The")),
              ((other || changed > 1) ? "s" : ""),
              (changed > 1 ? "" : "s"),
              (bless_water ? hcolor("light blue") : hcolor("black")));
    }
    return changed > 0;
}

// cf. pray.c:1415 -- godvoice(g_align, words): print god's voice message
export async function godvoice(g_align, words, player) {
    let quot = "";
    if (words) {
        quot = "\"";
    } else {
        words = "";
    }
    const verb = godvoices[rn2(godvoices.length)];
    await pline_The("voice of %s %s: %s%s%s", align_gname(g_align, player),
              verb, quot, words, quot);
}

// cf. pray.c:1429 -- gods_angry(g_align): print angry god message
// Autotranslated from pray.c:1428
export async function gods_angry(g_align) {
  await godvoice(g_align, "Thou hast angered me.");
}

// ================================================================
// cf. pray.c:1436 -- gods_upset(g_align, player, map)
// ================================================================
// Autotranslated from pray.c:1435
export async function gods_upset(g_align, player) {
  if (g_align === player.ualign.type) player.ugangr++;
  else if (player.ugangr) player.ugangr--;
  await angrygods(g_align);
}

// ================================================================
// cf. pray.c:1446 -- consume_offering(otmp, player, map)
// ================================================================
// Autotranslated from pray.c:1445
export async function consume_offering(otmp, player) {
  if (Hallucination) {
    switch (rn2(3)) {
      case 0:
        await Your("sacrifice sprouts wings and a propeller and roars away!");
      break;
      case 1:
        await Your("sacrifice puffs up, swelling bigger and bigger, and pops!");
      break;
      case 2:
        await Your( "sacrifice collapses into a cloud of dancing particles and fades away!");
      break;
    }
  }
  else if (Blind && player.ualign.type === A_LAWFUL) await Your("sacrifice disappears!");
  else {
    await Your("sacrifice is consumed in a %s!", (player.ualign.type === A_LAWFUL) ? "flash of light" : (player.ualign.type === A_NEUTRAL) ? "plume of smoke" : "burst of flame");
  }
  if (carried(otmp)) useup(otmp);
  else {
    useupf(otmp, 1);
  }
  await exercise(player, A_WIS, true);
}

// ================================================================
// cf. pray.c:1480 -- offer_too_soon(altaralign, player, map)
// ================================================================
async function offer_too_soon(altaralign, player, map) {
    if (altaralign === A_NONE && Inhell(player)) {
        await gods_upset(A_NONE, player, map);
        return;
    }
    await You_feel("%s.", player.hallucinating
                    ? "homesick"
                    : (altaralign === player.alignment)
                        ? "an urge to return to the surface"
                        : "ashamed");
}

// ================================================================
// cf. pray.c:1501 -- desecrate_altar(highaltar, altaralign, player, map)
// ================================================================
export async function desecrate_altar(highaltar, altaralign, player, map) {
    if (altaralign === player.alignment) {
        adjalign(player, -20);
        player.ugangr = (player.ugangr || 0) + 5;
    }
    await You_feel("the air around you grow charged...");
    await pline("Suddenly, you realize that %s has noticed you...",
          align_gname(altaralign, player));
    await godvoice(altaralign, "So, mortal!  You dare desecrate my "
             + (highaltar ? "High Temple" : "altar") + "!", player);
    await god_zaps_you(altaralign, player, map);
}

// ================================================================
// cf. pray.c:1529 -- offer_real_amulet(otmp, altaralign, player, map)
// ================================================================
async function offer_real_amulet(otmp, altaralign, player, map) {
    // Remove the amulet
    if (player.amulet === otmp) player.amulet = null;
    if (carried(otmp, player))
        useup(otmp, player);
    else
        useupf(otmp, 1, map);

    await You("offer the Amulet of Yendor to %s...", a_gname(player, map));

    if (altaralign === A_NONE) {
        if ((player.alignmentRecord || 0) > -99) player.alignmentRecord = -99;
        await pline("An invisible choir chants, and you are bathed in darkness...");
        await pline("%s shrugs and retains dominion over %s,", Moloch, u_gname(player));
        await pline("then mercilessly snuffs out your life.");
        player.deathCause = Moloch + " indifference";
        await done(player, "DIED");
        await pline("%s snarls and tries again...", Moloch);
        await fry_by_god(A_NONE, true, player);
        await done(player, "ESCAPED");
    } else if (player.alignment !== altaralign) {
        adjalign(player, -99);
        await pline("%s accepts your gift, and gains dominion over %s...",
              a_gname(player, map), u_gname(player));
        await pline("%s is enraged...", u_gname(player));
        await pline("Fortunately, %s permits you to live...", a_gname(player, map));
        await pline("A cloud of %s smoke surrounds you...", hcolor("orange"));
        await done(player, "ESCAPED");
    } else {
        if (!player.uevent) player.uevent = {};
        player.uevent.ascended = 1;
        adjalign(player, 10);
        await pline("An invisible choir sings, and you are bathed in radiance...");
        await godvoice(altaralign, "Mortal, thou hast done well!", player);
        display_nhwindow();
        await verbalize("In return for thy service, I grant thee the gift of Immortality!");
        await You("ascend to the status of Demigod%s...",
            player.female ? "dess" : "");
        await done(player, "ASCENDED");
    }
}

// ================================================================
// cf. pray.c:1592 -- offer_negative_valued(highaltar, altaralign, player, map)
// ================================================================
export async function offer_negative_valued(highaltar, altaralign, player, map) {
    if (altaralign !== player.alignment && highaltar) {
        await desecrate_altar(highaltar, altaralign, player, map);
    } else {
        await gods_upset(altaralign, player, map);
    }
}

// ================================================================
// cf. pray.c:1602 -- offer_fake_amulet(otmp, highaltar, altaralign, player, map)
// ================================================================
export async function offer_fake_amulet(otmp, highaltar, altaralign, player, map) {
    if (!highaltar && !otmp.known) {
        await offer_too_soon(altaralign, player, map);
        return;
    }
    await You_hear("a nearby thunderclap.");
    if (!otmp.known) {
        await You("realize you have made a %s.",
            player.hallucinating ? "boo-boo" : "mistake");
        otmp.known = true;
        change_luck(player, -1);
    } else {
        if (Deaf(player))
            await pline("Oh, no.");
        change_luck(player, -3);
        adjalign(player, -1);
        player.ugangr = (player.ugangr || 0) + 3;
        await offer_negative_valued(highaltar, altaralign, player, map);
    }
}

// ================================================================
// cf. pray.c:1631 -- offer_different_alignment_altar(otmp, altaralign, player, map)
// ================================================================
export async function offer_different_alignment_altar(otmp, altaralign, player, map) {
    if (ugod_is_angry(player) || (altaralign === A_NONE && Inhell(player))) {
        const ualignbase_current = player.ualignbase_current || player.alignment;
        const ualignbase_original = player.ualignbase_original || player.alignment;
        if (ualignbase_current === ualignbase_original && altaralign !== A_NONE) {
            await You("have a strong feeling that %s is angry...", u_gname(player));
            await consume_offering(otmp, player, map);
            await pline("%s accepts your allegiance.", a_gname(player, map));
            // Conversion
            player.alignment = altaralign;
            change_luck(player, -3);
            player.ublesscnt = (player.ublesscnt || 0) + 300;
        } else {
            player.ugangr = (player.ugangr || 0) + 3;
            adjalign(player, -5);
            await pline("%s rejects your sacrifice!", a_gname(player, map));
            await godvoice(altaralign, "Suffer, infidel!", player);
            change_luck(player, -5);
            await adjattrib(player, A_WIS, -2, true);
            if (!Inhell(player))
                await angrygods(player.alignment, player, map);
        }
    } else {
        await consume_offering(otmp, player, map);
        await You("sense a conflict between %s and %s.", u_gname(player), a_gname(player, map));
        if (rn2(8 + (player.ulevel || 1)) > 5) {
            await You_feel("the power of %s increase.", u_gname(player));
            await exercise(player, A_WIS, true);
            change_luck(player, 1);
            const loc = map.at(player.x, player.y);
            const shrine = on_shrine(player, map);
            loc.flags = Align2amask(player.alignment);
            if (shrine) loc.flags |= AM_SHRINE;
            newsym(player.x, player.y);
            if (!player.blind) {
                const color = (player.alignment === A_LAWFUL) ? "white"
                             : player.alignment ? "black" : "gray";
                await pline_The("altar glows %s.", hcolor(color));
            }
            if (rnl(player.ulevel || 1, Luck(player)) > 6 && (player.alignmentRecord || 0) > 0
                && rnd(player.alignmentRecord) > Math.floor(3 * ALIGNLIM / 4))
                await summon_minion(altaralign, true, map, player);
            angry_priest();
        } else {
            await pline("Unluckily, you feel the power of %s decrease.", u_gname(player));
            change_luck(player, -1);
            await exercise(player, A_WIS, false);
            if (rnl(player.ulevel || 1, Luck(player)) > 6 && (player.alignmentRecord || 0) > 0
                && rnd(player.alignmentRecord) > Math.floor(7 * ALIGNLIM / 8))
                await summon_minion(altaralign, true, map, player);
        }
    }
}

// ================================================================
// cf. pray.c:1698 -- sacrifice_your_race(otmp, highaltar, altaralign, player, map)
// ================================================================
async function sacrifice_your_race(otmp, highaltar, altaralign, player, map) {
    if (player.data && is_demon(player.data)) {
        await You("find the idea very satisfying.");
        await exercise(player, A_WIS, true);
    } else if (player.alignment !== A_CHAOTIC) {
        await pline("You'll regret this infamous offense!");
        await exercise(player, A_WIS, false);
    }

    if (highaltar && (altaralign !== A_CHAOTIC || player.alignment !== A_CHAOTIC)) {
        await desecrate_altar(highaltar, altaralign, player, map);
        return;
    } else if (altaralign !== A_CHAOTIC && altaralign !== A_NONE) {
        await pline_The("altar is stained with %s blood.", "your");
        const loc = map.at(player.x, player.y);
        loc.flags = AM_CHAOTIC;
        newsym(player.x, player.y);
        angry_priest();
    } else {
        let demonless_msg;
        if (altaralign === A_CHAOTIC && player.alignment !== A_CHAOTIC) {
            await pline("The blood floods the altar, which vanishes in %s cloud!",
                  an(hcolor("black")));
            const loc = map.at(player.x, player.y);
            loc.typ = ROOM;
            loc.flags = 0;
            newsym(player.x, player.y);
            angry_priest();
            demonless_msg = "cloud dissipates";
        } else {
            await pline_The("blood covers the altar!");
            change_luck(player, altaralign === A_NONE ? -2 : 2);
            demonless_msg = "blood coagulates";
        }
        const pm = dlord(altaralign);
        if (pm >= 0) {
            const dmon = makemon(mons[pm], player.x, player.y, 0, player.dungeonLevel, map);
            if (dmon) {
                await You("have summoned %s!", mon_nam(dmon));
                if (sgn(player.alignment) === sgn(dmon.data ? dmon.data.maligntyp || 0 : 0))
                    dmon.mpeaceful = true;
                await You("are terrified, and unable to move.");
                nomul(player, -3);
            } else {
                await pline_The("%s.", demonless_msg);
            }
        } else {
            await pline_The("%s.", demonless_msg);
        }
    }

    if (player.alignment !== A_CHAOTIC) {
        adjalign(player, -5);
        player.ugangr = (player.ugangr || 0) + 3;
        await adjattrib(player, A_WIS, -1, true);
        if (!Inhell(player))
            await angrygods(player.alignment, player, map);
        change_luck(player, -5);
    } else {
        adjalign(player, 5);
    }
    if (carried(otmp, player))
        useup(otmp, player);
    else
        useupf(otmp, 1, map);
}

// ================================================================
// cf. pray.c:1781 -- bestow_artifact(max_giftvalue, player, map)
// ================================================================
export async function bestow_artifact(max_giftvalue, player, map) {
    const nartifacts = nartifact_exist();
    let do_bestow = (player.ulevel || 1) > 2 && (player.luck || 0) >= 0;
    if (do_bestow)
        do_bestow = !rn2(6 + 2 * (player.ugifts || 0) * nartifacts);

    if (do_bestow) {
        const otmp = mk_artifact(null, a_align(player.x, player.y, map),
                                 max_giftvalue, true);
        if (otmp) {
            artifact_origin(otmp, 0);
            if ((otmp.spe || 0) < 0) otmp.spe = 0;
            if (otmp.cursed) uncurse(otmp);
            otmp.oerodeproof = true;
            const buf = player.hallucinating ? "A doodad"
                      : player.blind ? "An object"
                      : ansimpleoname(otmp);
            await at_your_feet(upstart(buf), player);
            await dropy(otmp, player, map);
            await godvoice(player.alignment, "Use my gift wisely!", player);
            player.ugifts = (player.ugifts || 0) + 1;
            player.ublesscnt = rnz(300 + 50 * nartifacts);
            await exercise(player, A_WIS, true);
            livelog_printf(0, "was bestowed with %s by %s",
                           artiname(otmp.oartifact),
                           align_gname(player.alignment, player));
            unrestrict_weapon_skill(weapon_type(otmp));
            if (!player.hallucinating && !player.blind) {
                discover_artifact(otmp.oartifact);
            }
            return true;
        }
    }
    return false;
}

// ================================================================
// cf. pray.c:1839 -- sacrifice_value(otmp, player)
// ================================================================
export function sacrifice_value(otmp, player) {
    let value = 0;
    if (otmp.corpsenm === PM_ACID_BLOB
        || ((player.turns || 0) <= peek_at_iced_corpse_age(otmp) + 50)) {
        const mdat = mons[otmp.corpsenm];
        value = (mdat ? mdat.difficulty || 0 : 0) + 1;
        if (otmp.oeaten)
            value = Math.floor(value * (otmp.oeaten / 100)); // simplified eaten_stat
    }
    return value;
}

// ================================================================
// cf. pray.c:1854 -- dosacrifice(player, map)
// ================================================================
export async function dosacrifice(player, map) {
    if (!on_altar(player, map) || player.uswallow) {
        await You("are not %s an altar.",
            (Levitation(player) || Flying(player)) ? "over" : "on");
        return 0;
    }
    if (player.confused || player.stunned) {
        await You("are too impaired to perform the rite.");
        return 0;
    }

    const loc = map.at(player.x, player.y);
    const highaltar = !!((loc.flags || 0) & AM_SANCTUM);
    const altaralign = a_align(player.x, player.y, map);

    // Find a corpse or amulet to sacrifice (floor first, then inventory)
    const floorObjs = loc.objects || [];
    let otmp = floorObjs.find(o => o.otyp === CORPSE || o.otyp === AMULET_OF_YENDOR
                                   || o.otyp === FAKE_AMULET_OF_YENDOR);
    if (!otmp) {
        otmp = player.inventory.find(o => o.otyp === CORPSE || o.otyp === AMULET_OF_YENDOR
                                          || o.otyp === FAKE_AMULET_OF_YENDOR);
    }
    if (!otmp) return 0;

    if (otmp.otyp === AMULET_OF_YENDOR) {
        if (!highaltar) {
            await offer_too_soon(altaralign, player, map);
            return 1;
        } else {
            await offer_real_amulet(otmp, altaralign, player, map);
            return 1;
        }
    }
    if (otmp.otyp === FAKE_AMULET_OF_YENDOR) {
        await offer_fake_amulet(otmp, highaltar, altaralign, player, map);
        return 1;
    }
    if (otmp.otyp === CORPSE) {
        await offer_corpse(otmp, highaltar, altaralign, player, map);
        return 1;
    }
    await pline("Nothing happens.");
    return 1;
}

// ================================================================
// cf. pray.c:1899 -- eval_offering(otmp, altaralign, player)
// ================================================================
// Autotranslated from pray.c:1898
export async function eval_offering(otmp, altaralign, player) {
  let ptr, value;
  value = sacrifice_value(otmp);
  if (!value) return 0;
  ptr = mons[otmp.corpsenm];
  if (is_undead(ptr)) {
    if (player.ualign.type !== A_CHAOTIC   || (ptr === mons[PM_WRAITH] && player.uconduct.unvegetarian)) {
      value += 1;
    }
  }
  else if (is_unicorn(ptr)) {
    let unicalign = sgn(ptr.maligntyp);
    if (unicalign === altaralign) {
      await pline("Such an action is an insult to %s!", (unicalign === A_CHAOTIC) ? "chaos" : unicalign ? "law" : "balance");
      await adjattrib(A_WIS, -1, true);
      return -1;
    }
    else if (player.ualign.type === altaralign) {
      if (player.ualign.record < ALIGNLIM) await You_feel("appropriately %s.", align_str(player.ualign.type));
      else {
        await You_feel("you are thoroughly on the right path.");
      }
      adjalign(5);
      value += 3;
    }
    else if (unicalign === player.ualign.type) { player.ualign.record = -1; value = 1; }
    else { value += 3; }
  }
  return value;
}

// ================================================================
// cf. pray.c:1959 -- offer_corpse(otmp, highaltar, altaralign, player, map)
// ================================================================
export async function offer_corpse(otmp, highaltar, altaralign, player, map) {
    // Conduct tracking
    if (!player.uconduct) player.uconduct = {};
    if (!player.uconduct.gnostic) player.uconduct.gnostic = 0;
    player.uconduct.gnostic++;

    await feel_cockatrice();
    if (await rider_corpse_revival()) return;

    const ptr = mons[otmp.corpsenm];
    if (ptr && your_race(ptr, player)) {
        await sacrifice_your_race(otmp, highaltar, altaralign, player, map);
        return;
    }

    // Former pet check
    if (has_omonst(otmp)) {
        const mtmp = get_mtraits(otmp);
        if (mtmp && mtmp.mtame) {
            await pline("So this is how you repay loyalty?");
            adjalign(player, -3);
            await offer_negative_valued(highaltar, altaralign, player, map);
            return;
        }
    }

    let value = await eval_offering(otmp, altaralign, player);
    if (value === 0) {
        await pline("Nothing happens.");
        return;
    }
    if (value < 0) {
        await offer_negative_valued(highaltar, altaralign, player, map);
        return;
    }

    if (altaralign !== player.alignment && highaltar) {
        await desecrate_altar(highaltar, altaralign, player, map);
        return;
    }
    if (player.alignment !== altaralign) {
        await offer_different_alignment_altar(otmp, altaralign, player, map);
        return;
    }

    await consume_offering(otmp, player, map);

    // Brownie points
    if (player.ugangr) {
        const saved_anger = player.ugangr;
        player.ugangr -= Math.floor(value * (player.alignment === A_CHAOTIC ? 2 : 3) / MAXVALUE);
        if (player.ugangr < 0) player.ugangr = 0;
        if (player.ugangr !== saved_anger) {
            if (player.ugangr) {
                await pline("%s seems %s.", u_gname(player),
                      player.hallucinating ? "groovy" : "slightly mollified");
                if ((player.luck || 0) < 0) change_luck(player, 1);
            } else {
                await pline("%s seems %s.", u_gname(player),
                      player.hallucinating ? "cosmic (not a new fact)" : "mollified");
                if ((player.luck || 0) < 0) player.luck = 0;
            }
        } else {
            if (player.hallucinating)
                await pline_The("gods seem tall.");
            else
                await You("have a feeling of inadequacy.");
        }
    } else if (ugod_is_angry(player)) {
        if (value > MAXVALUE) value = MAXVALUE;
        if (value > -(player.alignmentRecord || 0))
            value = -(player.alignmentRecord || 0);
        adjalign(player, value);
        await You_feel("partially absolved.");
    } else if ((player.ublesscnt || 0) > 0) {
        const saved_cnt = player.ublesscnt;
        player.ublesscnt -= Math.floor(value * (player.alignment === A_CHAOTIC ? 500 : 300) / MAXVALUE);
        if (player.ublesscnt < 0) player.ublesscnt = 0;
        if (player.ublesscnt !== saved_cnt) {
            if (player.ublesscnt) {
                if (player.hallucinating)
                    await You("realize that the gods are not like you and I.");
                else
                    await You("have a hopeful feeling.");
                if ((player.luck || 0) < 0) change_luck(player, 1);
            } else {
                if (player.hallucinating)
                    await pline("Overall, there is a smell of fried onions.");
                else
                    await You("have a feeling of reconciliation.");
                if ((player.luck || 0) < 0) player.luck = 0;
            }
        }
    } else {
        if (await bestow_artifact(value, player, map))
            return;

        const orig_luck = player.luck || 0;
        let luck_increase = Math.floor(value * LUCKMAX / (MAXVALUE * 2));
        if (orig_luck > value)
            luck_increase = 0;
        else if (orig_luck + luck_increase > value)
            luck_increase = value - orig_luck;

        change_luck(player, luck_increase);
        if ((player.luck || 0) < 0) player.luck = 0;
        if ((player.luck || 0) !== orig_luck) {
            if (player.blind)
                await You("think %s brushed your %s.", "something", body_part(FOOT, player));
            else
                await You(player.hallucinating
                    ? "see crabgrass at your %s.  A funny thing in a dungeon."
                    : "glimpse a four-leaf clover at your %s.",
                    makeplural(body_part(FOOT, player)));
        }
    }
}

// ================================================================
// cf. pray.c:2124 -- can_pray(praying, player, map)
// ================================================================
export async function can_pray(praying, player, map) {
    let alignment;

    p_aligntyp = on_altar(player, map) ? a_align(player.x, player.y, map) : player.alignment;
    p_trouble = in_trouble(player, map);

    if (player.data && is_demon(player.data)
        && (p_aligntyp === A_LAWFUL || p_aligntyp === A_NEUTRAL)) {
        if (praying)
            await pline_The("very idea of praying to a %s god is repugnant to you.",
                      p_aligntyp ? "lawful" : "neutral");
        return false;
    }

    if (praying)
        await You("begin praying to %s.", align_gname(p_aligntyp, player));

    if (player.alignment && player.alignment === -p_aligntyp)
        alignment = -(player.alignmentRecord || 0);
    else if (player.alignment !== p_aligntyp)
        alignment = Math.floor((player.alignmentRecord || 0) / 2);
    else
        alignment = player.alignmentRecord || 0;

    if (p_aligntyp === A_NONE) {
        p_type = -2;
    } else if ((p_trouble > 0) ? ((player.ublesscnt || 0) > 200)
             : (p_trouble < 0) ? ((player.ublesscnt || 0) > 100)
               : ((player.ublesscnt || 0) > 0)) {
        p_type = 0;
    } else if (Luck(player) < 0 || (player.ugangr || 0) || alignment < 0) {
        p_type = 1;
    } else {
        if (on_altar(player, map) && player.alignment !== p_aligntyp)
            p_type = 2;
        else
            p_type = 3;
    }

    if (player.data && is_undead(player.data) && !Inhell(player)
        && (p_aligntyp === A_LAWFUL
            || (p_aligntyp === A_NEUTRAL && !rn2(10))))
        p_type = -1;

    return !praying ? (p_type === 3 && !Inhell(player)) : true;
}

// ================================================================
// cf. pray.c:2177 -- pray_revive(player, map)
// ================================================================
export function pray_revive(player, map) {
    const loc = map.at(player.x, player.y);
    const objs = loc.objects || [];
    let otmp = null;
    for (const obj of objs) {
        if ((obj.otyp === CORPSE || obj.otyp === STATUE)
            && has_omonst(obj)) {
            const traits = get_mtraits(obj);
            if (traits && traits.mtame && !traits.isminion) {
                otmp = obj;
                break;
            }
        }
    }
    if (!otmp) return false;
    // Would call revive() or animate_statue() -- stub for now
    return false;
}

// ================================================================
// cf. pray.c:2199 -- dopray(player, map)
// ================================================================
export async function dopray(player, map) {
    // Conduct tracking
    if (!player.uconduct) player.uconduct = {};
    if (!player.uconduct.gnostic) player.uconduct.gnostic = 0;
    player.uconduct.gnostic++;

    if (!await can_pray(true, player, map))
        return 0;

    nomul(player, -3);
    player.multi_reason = "praying";
    player.nomovemsg = "You finish your prayer.";
    // Schedule prayer_done callback
    player.afternmv = async () => await prayer_done(player, map);

    if (p_type === 3 && !Inhell(player)) {
        if (!player.blind)
            await You("are surrounded by a shimmering light.");
        player.uinvulnerable = true;
    }

    return 1;
}

// ================================================================
// cf. pray.c:2276 -- prayer_done(player, map)
// ================================================================
export async function prayer_done(player, map) {
    const alignment = p_aligntyp;

    player.uinvulnerable = false;
    if (p_type === -2) {
        await You("%s diabolical laughter all around you...",
            !Deaf(player) ? "hear" : "intuit");
        wake_nearby(false, player, map);
        adjalign(player, -2);
        await exercise(player, A_WIS, false);
        if (!Inhell(player)) {
            await pline("Nothing else happens.");
            return 1;
        }
    } else if (p_type === -1) {
        await godvoice(alignment,
                 (alignment === A_LAWFUL)
                    ? "Vile creature, thou durst call upon me?"
                    : "Walk no more, perversion of nature!", player);
        await You_feel("like you are falling apart.");
        await rehumanize(player);
        await losehp(player, rnd(20), "residual undead turning effect");
        await exercise(player, A_CON, false);
        return 1;
    }
    if (Inhell(player)) {
        await pline("Since you are in Gehennom, %s can't help you.",
              align_gname(alignment, player));
        if ((player.alignmentRecord || 0) <= 0 || rnl((player.alignmentRecord || 0), Luck(player)))
            await angrygods(player.alignment, player, map);
        return 0;
    }

    if (p_type === 0) {
        if (on_altar(player, map) && player.alignment !== alignment)
            await water_prayer(false, player, map);
        player.ublesscnt = (player.ublesscnt || 0) + rnz(250);
        change_luck(player, -3);
        await gods_upset(player.alignment, player, map);
    } else if (p_type === 1) {
        if (on_altar(player, map) && player.alignment !== alignment)
            await water_prayer(false, player, map);
        await angrygods(player.alignment, player, map);
    } else if (p_type === 2) {
        if (await water_prayer(false, player, map)) {
            player.ublesscnt = (player.ublesscnt || 0) + rnz(250);
            change_luck(player, -3);
            await gods_upset(player.alignment, player, map);
        } else {
            await pleased(alignment, player, map);
        }
    } else {
        // Coaligned
        if (on_altar(player, map)) {
            pray_revive(player, map);
            await water_prayer(true, player, map);
        }
        await pleased(alignment, player, map);
    }
    return 1;
}

// ================================================================
// cf. pray.c:2347 -- maybe_turn_mon_iter(mtmp, player, map)
// ================================================================
let turn_undead_range = 0;
let turn_undead_msg_cnt = 0;

async function maybe_turn_mon_iter(mtmp, player, map) {
    if (!couldsee(map, player, mtmp.mx, mtmp.my)
        || mdistu(mtmp, player) > turn_undead_range)
        return;

    const mdat = mtmp.data || (mtmp.mndx != null ? mons[mtmp.mndx] : null);
    if (!mdat) return;

    if (!mtmp.mpeaceful
        && (is_undead(mdat)
            || (is_demon(mdat) && (player.ulevel || 1) > 15))) {
        mtmp.msleeping = 0;
        mtmp.sleeping = false;
        if (player.confused) {
            if (!turn_undead_msg_cnt++)
                await pline("Unfortunately, your voice falters.");
            mtmp.mflee = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = true;
        } else if (!resist(mtmp, '\0')) {
            let xlev = 6;
            switch (mdat.mlet) {
            case S_LICH:    xlev += 2; // FALLTHRU
            case S_GHOST:   xlev += 2; // FALLTHRU
            case S_VAMPIRE: xlev += 2; // FALLTHRU
            case S_WRAITH:  xlev += 2; // FALLTHRU
            case S_MUMMY:   xlev += 2; // FALLTHRU
            case S_ZOMBIE:
                if ((player.ulevel || 1) >= xlev && !resist(mtmp, '\0')) {
                    if (player.alignment === A_CHAOTIC) {
                        mtmp.mpeaceful = true;
                        set_malign(mtmp);
                    } else {
                        await killed(mtmp, map, player);
                    }
                    break;
                }
                // FALLTHRU
            default:
                await monflee(mtmp, 0, false, true, player);
                break;
            }
        }
    }
}

// ================================================================
// cf. pray.c:2414 -- doturn(player, map)
// ================================================================
export async function doturn(player, map) {
    if (!Role_if(player, PM_CLERIC) && !Role_if(player, PM_KNIGHT)) {
        if (known_spell(player, SPE_TURN_UNDEAD) >= 0)
            return await spelleffects(SPE_TURN_UNDEAD, false, player, map);
        await You("don't know how to turn undead!");
        return 0;
    }
    if (!player.uconduct) player.uconduct = {};
    if (!player.uconduct.gnostic) player.uconduct.gnostic = 0;
    player.uconduct.gnostic++;

    const Gname = halu_gname(player.alignment, player);

    const playerData = player.data || {};
    if (!can_chant(playerData, player.strangled)) {
        await You("are %s upon %s to turn aside evilness.",
            player.strangled ? "not able to call" : "incapable of calling", Gname);
        return (player.uconduct.gnostic === 1) ? 1 : 0;
    }
    if ((player.alignment !== A_CHAOTIC
         && (is_demon(playerData) || is_undead(playerData)))
        || (player.ugangr || 0) > 6) {
        await pline("For some reason, %s seems to ignore you.", Gname);
        aggravate(map);
        await exercise(player, A_WIS, false);
        return 1;
    }
    if (Inhell(player)) {
        await pline("Since you are in Gehennom, %s %s help you.",
              Gname, Gname === Moloch ? "won't" : "can't");
        aggravate(map);
        return 1;
    }
    await pline("Calling upon %s, you chant an arcane formula.", Gname);
    await exercise(player, A_WIS, true);

    turn_undead_range = BOLT_LIM + Math.floor((player.ulevel || 1) / 5);
    turn_undead_range *= turn_undead_range;
    turn_undead_msg_cnt = 0;

    // Iterate over all monsters on the map
    if (map.monsters) {
        for (const mtmp of map.monsters) {
            await maybe_turn_mon_iter(mtmp, player, map);
        }
    }

    nomul(player, -(5 - Math.floor(((player.ulevel || 1) - 1) / 6)));
    player.multi_reason = "trying to turn the monsters";
    player.nomovemsg = "You can move again.";
    return 1;
}

// ================================================================
// cf. pray.c:2490 -- altarmask_at(x, y, map)
// ================================================================
export function altarmask_at(x, y, map) {
    let res = 0;
    if (isok(x, y)) {
        const loc = map.at(x, y);
        const mon = loc.monster;
        if (mon && mon.m_ap_type === M_AP_FURNITURE && mon.mappearance === S_altar) {
            res = mon.mcorpsenm || 0;
        } else if (loc.typ === ALTAR) {
            res = loc.flags || 0;
        }
    }
    return res;
}

// cf. pray.c:107 -- a_align(x, y): altar alignment at position
function a_align(x, y, map) {
    const loc = map.at(x, y);
    return Amask2align((loc.flags || 0) & AM_MASK);
}

// cf. pray.c:2507 -- a_gname(): name of altar's deity at player position
// Autotranslated from pray.c:2506
export function a_gname(player) {
  return a_gname_at(player.x, player.y);
}

// cf. pray.c:2514 -- a_gname_at(x, y): name of altar's deity at position
export function a_gname_at(x, y, player, map) {
    const loc = map.at(x, y);
    if (loc.typ !== ALTAR) return null;
    return align_gname(a_align(x, y, map), player);
}

// cf. pray.c:2524 -- u_gname(): player's own deity name
// Autotranslated from pray.c:2523
export function u_gname(player) {
  return align_gname(player.ualign.type);
}

// cf. pray.c:2530 -- align_gname(alignment): alignment to deity name
export function align_gname(alignment, player) {
    let gnam;
    switch (alignment) {
    case A_NONE:
        gnam = Moloch;
        break;
    case A_LAWFUL:
    case A_NEUTRAL:
    case A_CHAOTIC:
        gnam = godForRoleAlign(player.roleIndex, alignment);
        break;
    default:
        gnam = "someone";
        break;
    }
    if (gnam && gnam.startsWith('_')) gnam = gnam.substring(1);
    return gnam || "someone";
}

// cf. pray.c:2577 -- halu_gname(alignment): hallucination deity name
export function halu_gname(alignment, player) {
    if (!player.hallucinating) return align_gname(alignment, player);

    let which;
    do {
        which = rn2_on_display_rng(roles.length);
    } while (!roles[which].gods[0]);

    let gnam = null;
    switch (rn2_on_display_rng(9)) {
    case 0: case 1:
        gnam = roles[which].gods[0];
        break;
    case 2: case 3:
        gnam = roles[which].gods[1];
        break;
    case 4: case 5:
        gnam = roles[which].gods[2];
        break;
    case 6: case 7:
        gnam = hallu_gods[rn2_on_display_rng(hallu_gods.length)];
        break;
    case 8:
        gnam = Moloch;
        break;
    }
    if (!gnam) gnam = "your Friend the Computer";
    if (gnam.startsWith('_')) gnam = gnam.substring(1);
    return gnam;
}

// cf. pray.c:2628 -- align_gtitle(alignment): deity title string
export function align_gtitle(alignment, player) {
    let result = "god";
    switch (alignment) {
    case A_LAWFUL:
    case A_NEUTRAL:
    case A_CHAOTIC:
        if (isGoddess(player.roleIndex, alignment)) {
            result = "goddess";
        }
        break;
    default:
        break;
    }
    return result;
}

// cf. pray.c:2652 -- altar_wrath(x, y): divine wrath for altar desecration
export async function altar_wrath(x, y, player, map) {
    const altaralign = a_align(x, y, map);

    if (player.alignment === altaralign && player.alignmentRecord > -rn2(4)) {
        await godvoice(altaralign, "How darest thou desecrate my altar!", player);
        await adjattrib(player, A_WIS, -1, false);
        player.alignmentRecord--;
    } else {
        await pline("%s %s%s:",
              "A voice (could it be",
              align_gname(altaralign, player),
              "?) whispers");
        await verbalize("Thou shalt pay, infidel!");
        const luck = player.luck || 0;
        if (luck > -5 && rn2(luck + 6)) {
            player.luck = luck + (rn2(20) ? -1 : -2);
        }
    }
}
