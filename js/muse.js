// muse.js -- Monster item use: defensive, offensive, miscellaneous
// cf. muse.c — precheck, mzapwand, mplayhorn, mreadmsg, mquaffmsg,
//              m_use_healing, m_sees_sleepy_soldier, m_tele, m_next2m,
//              find_defensive, mon_escape, use_defensive, rnd_defensive_item,
//              linedup_chk_corpse, m_use_undead_turning, hero_behind_chokepoint,
//              mon_has_friends, mon_likes_objpile_at, find_offensive,
//              mbhitm, fhito_loc, mbhit, use_offensive, rnd_offensive_item,
//              find_misc, muse_newcham_mon, mloot_container, use_misc,
//              you_aggravate, mon_consume_unstone, cures_stoning,
//              mcould_eat_tin, muse_unslime, cures_sliming, green_mon,
//              searches_for_item, mon_reflects, ureflects,
//              mcureblindness, munstone, munslime, rnd_misc_item

import { isok, STAIRS, LADDER, SCORR, CORR, ACCESSIBLE,
         TELEP_TRAP, TRAPDOOR, HOLE, PIT, SPIKED_PIT, BEAR_TRAP, WEB,
         POLY_TRAP, FIRE_TRAP,
         is_pit, is_hole,
         IS_FURNITURE, IS_DRAWBRIDGE,
         XKILL_NOMSG, XKILL_NOCONDUCT,
         W_ARM, W_ARMH, W_ARMS, W_AMUL, W_WEP, W_ARMG,
         BOLT_LIM } from './const.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { pline, pline_mon, You_hear } from './pline.js';
import { dist2, distmin } from './hacklib.js';
import { mondead, monnear, helpless as monHelpless } from './mon.js';
import { mpickobj } from './steal.js';
import { newsym, map_invisible, canspotmon } from './display.js';
import { is_animal, is_mindless, mindless, nohands, is_mercenary, is_unicorn,
         is_floater, is_flyer, throws_rocks, passes_walls,
         haseyes, is_undead, poly_when_stoned,
         resists_ston, touch_petrifies, amorphous, noncorporeal,
         unsolid, resists_fire, resists_acid, dmgtype, attacktype,
         can_blow, x_monnam, canseemon, needspick,
         dmgtype_fromattack, is_bat, nonliving,
         mon_knows_traps, mon_learns_traps } from './mondata.js';
import { mons, PM_GHOST, PM_DJINNI, PM_GUARD, PM_PESTILENCE, PM_KI_RIN, PM_LIZARD, PM_ACID_BLOB, PM_SILVER_DRAGON, PM_CHROMATIC_DRAGON, PM_GRID_BUG, AT_EXPL, AT_GAZE, AT_BREA, S_GHOST, S_KOP } from './monsters.js';
import { CORPSE, TIN, EGG, BOULDER,
         POTION_CLASS, WAND_CLASS, SCROLL_CLASS, FOOD_CLASS,
         AMULET_CLASS, TOOL_CLASS, WEAPON_CLASS,
         POT_HEALING, POT_EXTRA_HEALING, POT_FULL_HEALING,
         POT_SICKNESS, POT_ACID, POT_OIL,
         POT_CONFUSION, POT_BLINDNESS, POT_PARALYSIS,
         POT_SPEED, POT_INVISIBILITY, POT_SLEEPING,
         POT_GAIN_LEVEL, POT_POLYMORPH,
         WAN_TELEPORTATION, WAN_DIGGING, WAN_CREATE_MONSTER,
         WAN_UNDEAD_TURNING, WAN_DEATH, WAN_SLEEP,
         WAN_FIRE, WAN_COLD, WAN_LIGHTNING,
         WAN_MAGIC_MISSILE, WAN_STRIKING,
         WAN_MAKE_INVISIBLE, WAN_SPEED_MONSTER, WAN_POLYMORPH,
         SCR_TELEPORTATION, SCR_CREATE_MONSTER, SCR_EARTH, SCR_FIRE,
         FROST_HORN, FIRE_HORN, BUGLE, UNICORN_HORN,
         BULLWHIP, EXPENSIVE_CAMERA, STRANGE_OBJECT,
         HEAVY_IRON_BALL,
         SHIELD_OF_REFLECTION, AMULET_OF_REFLECTION,
         AMULET_OF_LIFE_SAVING, AMULET_OF_GUARDING,
         SILVER_DRAGON_SCALES, SILVER_DRAGON_SCALE_MAIL,
         PICK_AXE, TIN_OPENER, ICE_BOX, LARGE_BOX,
         GLOB_OF_GREEN_SLIME,
         objectData, CLOTH, BAG_OF_TRICKS } from './objects.js';
import { bcsign, splitobj, Is_container, unknow_object } from './mkobj.js';
import { m_carrying } from './mthrowu.js';
import { cansee, couldsee, mark_vision_dirty } from './vision.js';
import { which_armor, extract_from_minvent,
         mon_set_minvis, mon_adjust_speed } from './worn.js';
import { find_mac } from './worn.js';
import { noteleport_level, tele_restrict, rloc, enexto } from './teleport.js';
import { mon_has_amulet, mon_has_special } from './wizard.js';
import { onscary, healmon, mongone, monkilled, xkilled,
         wakeup, seemimic } from './mon.js';
import { monflee } from './monmove.js';
import { makemon, grow_up, rndmonst } from './makemon.js';
import { inhishop } from './shk.js';
import { placeFloorObject } from './invent.js';
import { linedUpToPlayer, m_throw_timed } from './mthrowu.js';
import {
    buzz, ZT_WAND, ZT_BREATH,
    ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP, ZT_DEATH, ZT_LIGHTNING,
} from './zap.js';
import { resist, unturn_dead } from './zap.js';
import { arti_reflects } from './artifact.js';
import { can_carry } from './dogmove.js';
import { sobj_at, carrying } from './invent.js';
import { welded } from './wield.js';
import { ZAP_POS, STRAT_WAITFORU } from './const.js';
import { is_pool, is_lava, is_ice,
         is_drawbridge_wall } from './dbridge.js';
import { Can_dig_down, Can_fall_thru, Can_rise_up, In_endgame,
         Is_earthlevel, On_W_tower_level, In_V_tower, Is_rogue_level } from './dungeon.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_BEAM, DISP_END, NON_PM, OBJ_FLOOR } from './const.js';
import { resists_magm, monsndx, is_vampshifter, DEADMONSTER, mdistu, verysmall, NODIAG } from './mondata.js';
import { u_at } from './hack.js';
import { game as _gstate } from './gstate.js';
import { Has_contents, Is_mbag } from './objnam.js';
import { awaken_soldiers } from './music.js';
import { t_at, m_at } from './trap.js';
import { makeknown, hard_helmet } from './do_wear.js';

// STRAT_WAITFORU imported from const.js

// ========================================================================
// Module-level state — C ref: gm.m struct (defense/offense/misc selections)
// ========================================================================
const m = {
    defensive: null,
    has_defense: 0,
    offensive: null,
    has_offense: 0,
    misc: null,
    has_misc: 0,
};

function mon_can_see(mon) {
    return mon?.mcansee !== 0 && mon?.mcansee !== false;
}

// C ref: gm.m_using — flag to suppress certain messages during monster item use
let m_using = false;

// C ref: gz.zap_oseen — was the zap seen by the hero?
let zap_oseen = false;

// C ref: gt.trapx, gt.trapy — trap coordinates for defensive/misc use
let trapx = 0, trapy = 0;

// C ref: gb.bhitpos — beam hit position tracking
const bhitpos = { x: 0, y: 0 };

function museWandZapType(otyp) {
    switch (otyp) {
    case WAN_MAGIC_MISSILE: return ZT_WAND(ZT_MAGIC_MISSILE);
    case WAN_FIRE: return ZT_WAND(ZT_FIRE);
    case WAN_COLD: return ZT_WAND(ZT_COLD);
    case WAN_SLEEP: return ZT_WAND(ZT_SLEEP);
    case WAN_DEATH: return ZT_WAND(ZT_DEATH);
    case WAN_LIGHTNING: return ZT_WAND(ZT_LIGHTNING);
    default: return ZT_WAND(ZT_MAGIC_MISSILE);
    }
}

function museFlashbeamGlyph(otyp) {
    let color = 11;
    switch (otyp) {
    case WAN_FIRE:
    case FIRE_HORN:
        color = 1;
        break;
    case WAN_COLD:
    case FROST_HORN:
        color = 6;
        break;
    case WAN_SLEEP:
        color = 2;
        break;
    case WAN_DEATH:
        color = 15;
        break;
    case WAN_LIGHTNING:
        color = 11;
        break;
    default:
        color = 12;
        break;
    }
    return { ch: '*', color };
}

// ========================================================================
// Defensive item MUSE constants — C ref: muse.c:307-326
// ========================================================================
const MUSE_SCR_TELEPORTATION = 1;
const MUSE_WAN_TELEPORTATION_SELF = 2;
const MUSE_POT_HEALING = 3;
const MUSE_POT_EXTRA_HEALING = 4;
const MUSE_WAN_DIGGING = 5;
const MUSE_TRAPDOOR = 6;
const MUSE_TELEPORT_TRAP = 7;
const MUSE_UPSTAIRS = 8;
const MUSE_DOWNSTAIRS = 9;
const MUSE_WAN_CREATE_MONSTER = 10;
const MUSE_SCR_CREATE_MONSTER = 11;
const MUSE_UP_LADDER = 12;
const MUSE_DN_LADDER = 13;
const MUSE_SSTAIRS = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_BUGLE = 16;
const MUSE_UNICORN_HORN = 17;
const MUSE_POT_FULL_HEALING = 18;
const MUSE_LIZARD_CORPSE = 19;
const MUSE_DEF_WAN_UNDEAD_TURNING = 20;

// ========================================================================
// Offensive item MUSE constants — C ref: muse.c:1271-1290
// ========================================================================
const MUSE_OFF_WAN_DEATH = 1;
const MUSE_OFF_WAN_SLEEP = 2;
const MUSE_OFF_WAN_FIRE = 3;
const MUSE_OFF_WAN_COLD = 4;
const MUSE_OFF_WAN_LIGHTNING = 5;
const MUSE_OFF_WAN_MAGIC_MISSILE = 6;
const MUSE_OFF_WAN_STRIKING = 7;
const MUSE_OFF_SCR_FIRE = 8;
const MUSE_OFF_POT_PARALYSIS = 9;
const MUSE_OFF_POT_BLINDNESS = 10;
const MUSE_OFF_POT_CONFUSION = 11;
const MUSE_OFF_FROST_HORN = 12;
const MUSE_OFF_FIRE_HORN = 13;
const MUSE_OFF_POT_ACID = 14;
const MUSE_OFF_WAN_TELEPORTATION = 15;
const MUSE_OFF_POT_SLEEPING = 16;
const MUSE_OFF_SCR_EARTH = 17;
const MUSE_OFF_CAMERA = 18;
const MUSE_OFF_WAN_UNDEAD_TURNING = 20;

// ========================================================================
// Misc item MUSE constants — C ref: muse.c:2063-2072
// ========================================================================
const MUSE_MISC_POT_GAIN_LEVEL = 1;
const MUSE_MISC_WAN_MAKE_INVISIBLE = 2;
const MUSE_MISC_POT_INVISIBILITY = 3;
const MUSE_MISC_POLY_TRAP = 4;
const MUSE_MISC_WAN_POLYMORPH = 5;
const MUSE_MISC_POT_SPEED = 6;
const MUSE_MISC_WAN_SPEED_MONSTER = 7;
const MUSE_MISC_BULLWHIP = 8;
const MUSE_MISC_POT_POLYMORPH = 9;
const MUSE_MISC_BAG = 10;

// ========================================================================
// Local helpers — small utility functions used by multiple muse functions
// ========================================================================


// mindless imported from mondata.js

// NODIAG imported from mondata.js

// monsndx and is_vampshifter imported from mondata.js

// C ref: m_next2u(mtmp) — is monster adjacent to hero?
export function m_next2u(mtmp, player) {
    return dist2(mtmp.mx, mtmp.my, player.x, player.y) <= 2;
}

// MFAST speed constant
const MFAST = 2;




// C ref: accessible(x, y) — can walk there
function accessible(x, y, map) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ);
}

// C ref: stairway_at(x, y) — find stairway at position
// JS: map.upstair / map.dnstair are simple {x, y, isladder} objects
function stairway_at(x, y, map) {
    if (map.upstair && map.upstair.x === x && map.upstair.y === y) {
        return { sx: x, sy: y, up: true, isladder: !!map.upstair.isladder,
                 tolev: map.upstair.tolev || { dnum: 0, dlevel: 0 } };
    }
    if (map.dnstair && map.dnstair.x === x && map.dnstair.y === y) {
        return { sx: x, sy: y, up: false, isladder: !!map.dnstair.isladder,
                 tolev: map.dnstair.tolev || { dnum: 0, dlevel: 0 } };
    }
    return null;
}

// Stub for m_seenres — monster memory of hero resistances
// Not yet tracked in JS; always returns 0 (monster has not seen)
export function m_seenres(_mon, _flag) { return 0; }


// Stub level/dungeon predicates — JS levels are single-dungeon currently
function Is_knox(map) { return !!(map && map.flags && map.flags.is_knox); }
function Inhell(map) { return !!(map && map.flags && map.flags.inhell); }
// In_endgame imported from dungeon.js
function Is_botlevel(map) { return !!(map && map.flags && map.flags.is_botlevel); }
function Sokoban(map) { return !!(map && map.flags && map.flags.sokoban); }


// C ref: is_Vlad(mtmp) — is this monster Vlad?
function is_Vlad(mtmp) { return !!((mtmp.data || mtmp.type) && (mtmp.data || mtmp.type).mname === 'Vlad the Impaler'); }

// C ref: mon_offmap(mon)
function mon_offmap(mon) { return !isok(mon.mx, mon.my); }

// hard_helmet imported from do_wear.js

// C ref: MON_WEP(mon) — wielded weapon
export function MON_WEP(mon) {
    if (mon.weapon) return mon.weapon;
    if (!mon.minvent) return null;
    for (const obj of mon.minvent) {
        if (obj.owornmask && (obj.owornmask & W_WEP)) return obj;
    }
    return null;
}

// C ref: mwelded(obj) — is weapon welded to monster?
function mwelded(obj) { return !!(obj && obj.cursed && (obj.owornmask & W_WEP)); }

// C ref: canletgo(obj, str) — can hero release weapon? (cursed = no)
function canletgo(obj, _str) {
    if (!obj) return false;
    return !obj.cursed;
}

// C ref: is_plural(obj)
function is_plural(obj) { return (obj.quan || 1) > 1; }

function SchroedingersBox(obj) {
    return !!(obj && obj.spe === 1 && obj.otyp === LARGE_BOX);
}

// C ref: WAND_BACKFIRE_CHANCE (100)
const WAND_BACKFIRE_CHANCE = 100;

// C ref: POTION_OCCUPANT_CHANCE(n)
function POTION_OCCUPANT_CHANCE(n) { return ((n) >= 5 ? 1 : (n) >= 4 ? 2 : 4); }

// makeknown imported from do_wear.js


// m_useup — monster uses up an item from inventory
function m_useup(mon, obj) {
    if (!mon || !obj) return;
    const inv = mon.minvent || [];
    const idx = inv.indexOf(obj);
    if (idx < 0) return;
    const qty = Number.isInteger(obj.quan) ? obj.quan : 1;
    if (qty > 1) {
        obj.quan = qty - 1;
        return;
    }
    inv.splice(idx, 1);
    if (mon.weapon === obj) mon.weapon = null;
}

// C ref: migrate_to_level — monster leaves the level
// Simplified: just remove monster (single-level game)
function migrate_to_level(mtmp, _ledger, _migr, _coord, map) {
    // Remove monster from level
    mtmp.mhp = 0;
    mtmp.dead = true;
    if (map) newsym(mtmp.mx, mtmp.my);
}

// C ref: ledger_no(&u.uz) — ledger number of current level
function ledger_no(_dlev) { return 1; }

// C ref: depth(&u.uz) — depth of current level
function depth_uz(map) { return map?.flags?.depth || 1; }

// inhishop imported from shk.js
// grow_up, rndmonst imported from makemon.js

// C ref: newcham — polymorph monster
// Stub: polymorph not yet fully ported
function newcham(mtmp, _pm, _flags) { return true; }


// C ref: mon_consume_unstone — eat lizard/acid to cure stone
export async function mon_consume_unstone(mon, obj, by_you, stoning, map, player) {
    const vis = canseemon(mon, player);
    const tinned = obj.otyp === TIN;
    const food = obj.otyp === CORPSE || tinned;
    const acid = obj.otyp === POT_ACID
        || (food && obj.corpsenm >= 0 && mons[obj.corpsenm]
            && !!(mons[obj.corpsenm].mresists & 0x08)); // MR_ACID
    const lizard = food && obj.corpsenm === PM_LIZARD;

    if (stoning)
        mon_adjust_speed(mon, -3, null);

    if (vis) {
        const name = x_monnam(mon, { article: 'the', capitalize: true });
        const action = (obj.oclass === POTION_CLASS) ? 'quaffs'
            : (obj.otyp === TIN) ? 'opens and eats the contents of'
            : 'eats';
        await pline_mon(mon, `${name} ${action} something.`);
    } else {
        await You_hear((obj.oclass === POTION_CLASS) ? 'drinking.' : 'chewing.');
    }

    m_useup(mon, obj);

    if (acid && !tinned && !resists_acid(mon)) {
        mon.mhp -= rnd(15);
        if (vis) {
            const name = x_monnam(mon, { article: 'the', capitalize: true });
            await pline_mon(mon, `${name} has a very bad case of stomach acid.`);
        }
        if (DEADMONSTER(mon)) {
            const name = x_monnam(mon, { article: 'the', capitalize: true });
            await pline_mon(mon, `${name} dies!`);
            if (by_you)
                xkilled(mon, XKILL_NOMSG | XKILL_NOCONDUCT, map, player);
            else
                mondead(mon, map, player);
            return;
        }
    }
    if (stoning && vis) {
        const name = x_monnam(mon, { article: 'the', capitalize: true });
        await pline_mon(mon, `${name} seems limber!`);
    }
    if (lizard && (mon.mconf || mon.mstun)) {
        mon.mconf = 0;
        mon.mstun = 0;
    }
}

// C ref: cures_stoning — does object cure petrification?
export function cures_stoning(mon, obj, tinok) {
    if (obj.otyp === POT_ACID) return true;
    if (obj.otyp !== CORPSE && (obj.otyp !== TIN || !tinok)) return false;
    if ((obj.corpsenm ?? NON_PM) === NON_PM) return false;
    return (obj.corpsenm === PM_LIZARD
        || (mons[obj.corpsenm] && !!(mons[obj.corpsenm].mresists & 0x08))); // MR_ACID => acidic
}

// C ref: mcould_eat_tin — can monster open a tin?
export function mcould_eat_tin(mon) {
    const mdat = mon.data || mon.type || {};
    if (is_animal(mdat)) return false;
    const mwep = MON_WEP(mon);
    const welded_wep = mwep && mwelded(mwep);
    for (const obj of (mon.minvent || [])) {
        if (welded_wep && obj !== mwep) continue;
        if (obj.otyp === TIN_OPENER) return true;
        const od = objectData[obj.otyp];
        if (od && od.oc_class === WEAPON_CLASS) {
            // P_DAGGER = 1, P_KNIFE = 2 in C; check by skill
            if (od.oc_skill === 1 || od.oc_skill === 2) return true;
        }
    }
    return false;
}

// C ref: mcureblindness(mon, verbos)
export async function mcureblindness(mon, verbos, player) {
    if (mon.mcansee === 0 || mon.mcansee === false) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data || mon.type || {})) {
            const name = x_monnam(mon, { article: 'the', capitalize: true });
            await pline_mon(mon, `${name} can see again.`);
        }
    }
}

// C ref: mon_would_take_item — would monster want this item?
function mon_would_take_item(mon, obj) {
    if (!obj || !mon) return false;
    return searches_for_item(mon, obj);
}

// C ref: linedup_callback — check positions along a line for a condition
function linedup_callback(ax, ay, bx, by, callback, map) {
    const dx = Math.sign(bx - ax);
    const dy = Math.sign(by - ay);
    if (!dx && !dy) return callback(ax, ay, map);
    let x = ax, y = ay;
    while (x !== bx || y !== by) {
        if (callback(x, y, map)) return true;
        x += dx;
        y += dy;
        if (!isok(x, y)) break;
    }
    return callback(bx, by, map);
}

// ========================================================================
// precheck — C ref: muse.c:57
// ========================================================================
async function precheck(mon, obj, map, player) {
    if (!obj) return 0;
    const vis = cansee(map, player, null, mon.mx, mon.my);

    if (obj.oclass === POTION_CLASS) {
        // C: milky potion ghost / smoky potion djinni checks
        // These are rare (rn2 with POTION_OCCUPANT_CHANCE) and only trigger
        // for specific descriptors. We honor RNG gates when descriptor text
        // is available on the object.
        const desc = String(obj.desc || obj.dname || objectData[obj.otyp]?.oc_descr || '').toLowerCase();
        if (desc.includes('milky') && !rn2(POTION_OCCUPANT_CHANCE(4))) {
            makemon(mons[PM_GHOST], mon.mx, mon.my, 0, 0, map);
        } else if (desc.includes('smoky') && !rn2(POTION_OCCUPANT_CHANCE(4))) {
            const mtmp = makemon(mons[PM_DJINNI], mon.mx, mon.my, 0, 0, map);
            if (mtmp) {
                // C: rn2(2) decides peaceful ("You freed me!") vs vanish
                if (rn2(2)) {
                    mtmp.mpeaceful = 1;
                } else {
                    mongone(mtmp, map);
                }
            }
        }
    }

    if (obj.oclass === WAND_CLASS && obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        const dam = d(obj.spe + 2, 6);
        if (vis) {
            const name = x_monnam(mon, { article: 'the', capitalize: true });
            await pline_mon(mon, `${name} zaps something, which suddenly explodes!`);
        } else {
            const range = couldsee(map, player, mon.mx, mon.my)
                ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
            await You_hear(`a zap and an explosion ${
                (mdistu(mon, player) <= range * range) ? 'nearby' : 'in the distance'}.`);
        }
        m_useup(mon, obj);
        mon.mhp -= dam;
        if (DEADMONSTER(mon)) {
            monkilled(mon, '', 0, map, player);
            return 1;
        }
        m.has_defense = m.has_offense = m.has_misc = 0;
    }
    return 0;
}

// ========================================================================
// mzapwand — C ref: muse.c:163
// ========================================================================
async function mzapwand(mtmp, otmp, self, map, player) {
    if (otmp.spe < 1) return;
    const vismon = canseemon(mtmp, player);
    if (!vismon) {
        const range = couldsee(map, player, mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        await You_hear(`a ${(mdistu(mtmp, player) <= range * range) ? 'nearby' : 'distant'} zap.`);
        unknow_object(otmp);
    } else if (self) {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} zaps a wand at itself!`);
    } else {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} zaps a wand!`);
    }
    otmp.spe -= 1;
}

// ========================================================================
// mplayhorn — C ref: muse.c:193
// ========================================================================
export async function mplayhorn(mtmp, otmp, self, map, player) {
    const vismon = canseemon(mtmp, player);
    if (!vismon) {
        const range = couldsee(map, player, mtmp.mx, mtmp.my)
            ? (BOLT_LIM + 1) : (BOLT_LIM - 3);
        await You_hear(`a horn being played ${
            (mdistu(mtmp, player) <= range * range) ? 'nearby' : 'in the distance'}.`);
        unknow_object(otmp);
    } else if (self) {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} plays a horn directed at itself!`);
        makeknown(otmp.otyp);
    } else {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} plays a horn directed at you!`);
        makeknown(otmp.otyp);
    }
    otmp.spe -= 1;
}

// ========================================================================
// mreadmsg — C ref: muse.c:236
// ========================================================================
async function mreadmsg(mtmp, otmp, player) {
    const vismon = canseemon(mtmp, player);
    if (vismon) {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} reads a scroll!`);
    } else {
        await You_hear('someone reading a scroll.');
    }
    if (mtmp.mconf) {
        const name2 = x_monnam(mtmp, { article: 'none' });
        await pline(`Being confused, ${name2} mispronounces the magic words...`);
    }
}

// ========================================================================
// mquaffmsg — C ref: muse.c:291
// ========================================================================
export async function mquaffmsg(mtmp, otmp, player) {
    const vismon = canseemon(mtmp, player);
    if (vismon) {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} drinks a potion!`);
    } else {
        await You_hear('a chugging sound.');
    }
}

// ========================================================================
// m_use_healing — C ref: muse.c:335
// ========================================================================
export function m_use_healing(mtmp) {
    let obj;
    if ((obj = m_carrying(mtmp, POT_FULL_HEALING)) != null) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_FULL_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_EXTRA_HEALING)) != null) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_EXTRA_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_HEALING)) != null) {
        m.defensive = obj;
        m.has_defense = MUSE_POT_HEALING;
        return true;
    }
    return false;
}

// ========================================================================
// m_sees_sleepy_soldier — C ref: muse.c:359
// ========================================================================
export function m_sees_sleepy_soldier(mtmp, map) {
    const x = mtmp.mx, y = mtmp.my;
    for (let xx = x - 3; xx <= x + 3; xx++) {
        for (let yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y)) continue;
            const mon2 = m_at(xx, yy, map);
            if (mon2 && is_mercenary(mon2.data || mon2.type || {})
                && mon2.mndx !== PM_GUARD
                && monHelpless(mon2)) {
                return true;
            }
        }
    }
    return false;
}

// ========================================================================
// m_tele — C ref: muse.c:382
// ========================================================================
async function m_tele(mtmp, vismon, oseen, how, map, player) {
    if (tele_restrict(mtmp, map)) {
        if (vismon && how) makeknown(how);
        if (noteleport_level(mtmp, map))
            mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(map)) && !rn2(3)) {
        if (vismon) {
            const name = x_monnam(mtmp, { article: 'the', capitalize: true });
            await pline_mon(mtmp, `${name} seems disoriented for a moment.`);
        }
    } else {
        if (how && oseen) makeknown(how);
        await rloc(mtmp, 0, map, player);
    }
}

// ========================================================================
// m_next2m — C ref: muse.c:418
// ========================================================================
export function m_next2m(mtmp, map) {
    if (DEADMONSTER(mtmp) || mon_offmap(mtmp)) return false;
    for (let x = mtmp.mx - 1; x <= mtmp.mx + 1; x++) {
        for (let y = mtmp.my - 1; y <= mtmp.my + 1; y++) {
            if (!isok(x, y)) continue;
            const m2 = m_at(x, y, map);
            if (m2 && m2 !== mtmp) return true;
        }
    }
    return false;
}

// ========================================================================
// reveal_trap — C ref: muse.c:756
// When a monster deliberately enters a trap, ensure concealed trap squares
// become normal corridor and mark trap seen if the hero witnessed it.
// ========================================================================
function reveal_trap(t, seeit, map) {
    if (!t || !map) return;
    const loc = map.at ? map.at(t.tx, t.ty) : null;
    if (loc && loc.typ === SCORR) {
        loc.typ = CORR;
        loc.flags = 0;
    }
    if (seeit) {
        t.tseen = 1;
        if (map?.newsym) map.newsym(t.tx, t.ty);
    }
}

// ========================================================================
// find_defensive — C ref: muse.c:439
// ========================================================================
export async function find_defensive(mon, tryescape, map, player) {
    let obj;
    let t;
    const x = mon.mx, y = mon.my;
    const mdat = mon.data || mon.type || {};
    const stuck = (mon === player.ustuck);
    const immobile = ((mdat.mmove || 0) === 0);

    m.defensive = null;
    m.has_defense = 0;

    if (is_animal(mdat) || mindless(mdat)) return false;
    if (!tryescape && dist2(x, y, mon.mux ?? player.x, mon.muy ?? player.y) > 25)
        return false;
    if (tryescape && Is_knox(map) && !m_next2u(mon, player) && m_next2m(mon, map))
        return false;
    if (player.uswallow && stuck) return false;

    // Unicorn horn for confusion/stun/blindness
    if (mon.mconf || mon.mstun || !mon_can_see(mon)) {
        obj = null;
        if (!nohands(mdat)) {
            for (const o of (mon.minvent || [])) {
                if (o.otyp === UNICORN_HORN && !o.cursed) { obj = o; break; }
            }
        }
        if (obj || is_unicorn(mdat) || (mdat.mndx === PM_KI_RIN)) {
            m.defensive = obj;
            m.has_defense = MUSE_UNICORN_HORN;
            return true;
        }
    }

    // Lizard corpse/tin for confusion/stun
    if (mon.mconf || mon.mstun) {
        let liztin = null;
        for (const o of (mon.minvent || [])) {
            if (o.otyp === CORPSE && o.corpsenm === PM_LIZARD) {
                m.defensive = o;
                m.has_defense = MUSE_LIZARD_CORPSE;
                return true;
            } else if (o.otyp === TIN && o.corpsenm === PM_LIZARD) {
                liztin = o;
            }
        }
        if (liztin && mcould_eat_tin(mon) && rn2(3)) {
            m.defensive = liztin;
            m.has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    // Healing for blind (non-Pestilence)
    if (!mon_can_see(mon) && !nohands(mdat) && mdat.mndx !== PM_PESTILENCE) {
        if (m_use_healing(mon)) return true;
    }

    // Wand of undead turning against cockatrice-corpse-wielding hero
    const uwep = player.weapon;
    if (!mon.mpeaceful && !nohands(mdat)
        && uwep && uwep.otyp === CORPSE
        && touch_petrifies(mons[uwep.corpsenm] || {})
        && !poly_when_stoned(mdat) && !resists_ston(mon)
        && linedUpToPlayer(mon, map, player)) {
        for (const o of (mon.minvent || [])) {
            if (o.otyp === WAN_UNDEAD_TURNING && o.spe > 0) {
                m.defensive = o;
                m.has_defense = MUSE_DEF_WAN_UNDEAD_TURNING;
                return true;
            }
        }
    }

    if (!tryescape) {
        // Health fraction check
        const fraction = player.ulevel < 10 ? 5 : player.ulevel < 14 ? 4 : 3;
        if (mon.mhp >= mon.mhpmax
            || (mon.mhp >= 10 && mon.mhp * fraction >= mon.mhpmax))
            return false;

        if (mon.mpeaceful) {
            if (!nohands(mdat)) {
                if (m_use_healing(mon)) return true;
            }
            return false;
        }
    }

    // Stairs/traps for escape
    if (stuck || immobile || mon.mtrapped) {
        // can't flee by stairs or traps
    } else {
        const loc = map.at(x, y);
        if (loc && loc.typ === STAIRS) {
            const stway = await stairway_at(x, y, map);
            if (stway && !stway.up && !is_floater(mdat)) {
                m.has_defense = MUSE_DOWNSTAIRS;
            } else if (stway && stway.up) {
                m.has_defense = MUSE_UPSTAIRS;
            }
        } else if (loc && loc.typ === LADDER) {
            const stway = await stairway_at(x, y, map);
            if (stway && stway.up) {
                m.has_defense = MUSE_UP_LADDER;
            } else if (stway && !stway.up && !is_floater(mdat)) {
                m.has_defense = MUSE_DN_LADDER;
            }
        } else {
            // Check nearby traps (trap doors, teleport traps)
            const locs = [];
            locs.push([x, y]);
            for (let xx = x - 1; xx <= x + 1; xx++) {
                for (let yy = y - 1; yy <= y + 1; yy++) {
                    if (isok(xx, yy) && (xx !== x || yy !== y)) {
                        locs.push([xx, yy]);
                    }
                }
            }

            const ignore_boulders = verysmall(mdat) || throws_rocks(mdat) || passes_walls(mdat);
            const diag_ok = !NODIAG(monsndx(mdat));

            for (const [xx, yy] of locs) {
                if (u_at(player, xx, yy)) continue;
                if (xx !== x && yy !== y && !diag_ok) continue;
                if (m_at(xx, yy, map) && !(xx === x && yy === y)) continue;

                t = t_at(xx, yy, map);
                if (!t) continue;
                if (!ignore_boulders && sobj_at(BOULDER, xx, yy, map)) continue;
                if (onscary(map, xx, yy, mon)) continue;

                if (is_hole(t.ttyp) && !is_floater(mdat)
                    && !mon.isshk && !mon.isgd && !mon.ispriest
                    && Can_fall_thru(map)) {
                    trapx = xx;
                    trapy = yy;
                    m.has_defense = MUSE_TRAPDOOR;
                    break;
                } else if (t.ttyp === TELEP_TRAP) {
                    trapx = xx;
                    trapy = yy;
                    m.has_defense = MUSE_TELEPORT_TRAP;
                }
            }
        }
    }

    if (nohands(mdat)) {
        return !!m.has_defense;
    }

    // Bugle for soldiers
    if (is_mercenary(mdat)) {
        const bugle = m_carrying(mon, BUGLE);
        if (bugle && m_sees_sleepy_soldier(mon, map)) {
            m.defensive = bugle;
            m.has_defense = MUSE_BUGLE;
        }
    }

    // Use immediate physical escape prior to magic
    if (m.has_defense) return true;

    // Kludge to cut trap destruction
    t = t_at(x, y, map);
    if (t && (is_pit(t.ttyp) || t.ttyp === WEB || t.ttyp === BEAR_TRAP))
        t = null;

    // Inventory scan for defensive items
    for (const obj2 of (mon.minvent || [])) {
        // Don't always use same selection pattern
        if (m.has_defense && !rn2(3)) break;

        // Wand of digging
        if (m.has_defense === MUSE_WAN_DIGGING) break;
        if (obj2.otyp === WAN_DIGGING && obj2.spe > 0 && !stuck && !t
            && !mon.isshk && !mon.isgd && !mon.ispriest
            && !is_floater(mdat) && !Sokoban(map)
            && !Is_botlevel(map) && !In_endgame(map)
            && !(is_Vlad(mon) && In_V_tower(map))) {
            const loc2 = map.at(x, y);
            if (loc2 && !(is_ice(x, y, map) || is_pool(x, y, map) || is_lava(x, y, map))) {
                m.defensive = obj2;
                m.has_defense = MUSE_WAN_DIGGING;
            }
        }
        if (m.has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
        if (m.has_defense === MUSE_WAN_TELEPORTATION) continue;
        if (obj2.otyp === WAN_TELEPORTATION && obj2.spe > 0) {
            if (!noteleport_level(mon, map) || !mon_knows_traps(mon, TELEP_TRAP)) {
                m.defensive = obj2;
                m.has_defense = mon_has_amulet(mon)
                    ? MUSE_WAN_TELEPORTATION : MUSE_WAN_TELEPORTATION_SELF;
            }
        }
        if (m.has_defense === MUSE_SCR_TELEPORTATION) continue;
        if (obj2.otyp === SCR_TELEPORTATION && mon_can_see(mon) && haseyes(mdat)
            && (!obj2.cursed || (!(mon.isshk && inhishop(mon, map))
                && !mon.isgd && !mon.ispriest))) {
            if (!noteleport_level(mon, map) || !mon_knows_traps(mon, TELEP_TRAP)) {
                m.defensive = obj2;
                m.has_defense = MUSE_SCR_TELEPORTATION;
            }
        }

        if (mdat.mndx !== PM_PESTILENCE) {
            if (m.has_defense === MUSE_POT_FULL_HEALING) continue;
            if (obj2.otyp === POT_FULL_HEALING) {
                m.defensive = obj2;
                m.has_defense = MUSE_POT_FULL_HEALING;
            }
            if (m.has_defense === MUSE_POT_EXTRA_HEALING) continue;
            if (obj2.otyp === POT_EXTRA_HEALING) {
                m.defensive = obj2;
                m.has_defense = MUSE_POT_EXTRA_HEALING;
            }
            if (m.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (obj2.otyp === WAN_CREATE_MONSTER && obj2.spe > 0) {
                m.defensive = obj2;
                m.has_defense = MUSE_WAN_CREATE_MONSTER;
            }
            if (m.has_defense === MUSE_POT_HEALING) continue;
            if (obj2.otyp === POT_HEALING) {
                m.defensive = obj2;
                m.has_defense = MUSE_POT_HEALING;
            }
        } else {
            // Pestilence uses sickness as full healing
            if (m.has_defense === MUSE_POT_FULL_HEALING) continue;
            if (obj2.otyp === POT_SICKNESS) {
                m.defensive = obj2;
                m.has_defense = MUSE_POT_FULL_HEALING;
            }
            if (m.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
            if (obj2.otyp === WAN_CREATE_MONSTER && obj2.spe > 0) {
                m.defensive = obj2;
                m.has_defense = MUSE_WAN_CREATE_MONSTER;
            }
        }
        if (m.has_defense === MUSE_SCR_CREATE_MONSTER) continue;
        if (obj2.otyp === SCR_CREATE_MONSTER) {
            m.defensive = obj2;
            m.has_defense = MUSE_SCR_CREATE_MONSTER;
        }
    }

    return !!m.has_defense;
}

// ========================================================================
// mon_escape — C ref: muse.c:778
// ========================================================================
export async function mon_escape(mtmp, vismon, map, player) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && (player.no_of_wizards || 0) < 2))
        return 0;
    if (vismon) {
        const name = x_monnam(mtmp, { article: 'the', capitalize: true });
        await pline_mon(mtmp, `${name} escapes the dungeon!`);
    }
    mongone(mtmp, map, player);
    return 2;
}

// ========================================================================
// use_defensive — C ref: muse.c:794
// ========================================================================
export async function use_defensive(mon, map, player) {
    let i;
    const otmp = m.defensive;
    const mdat = mon.data || mon.type || {};

    if ((i = await precheck(mon, otmp, map, player)) !== 0) return i;

    const vis = cansee(map, player, null, mon.mx, mon.my);
    const vismon = canseemon(mon, player);
    const oseen = otmp && vismon;

    // Flee timer
    const fleetim = !mon.mflee ? (33 - Math.floor(30 * mon.mhp / (mon.mhpmax || 1))) : 0;
    async function m_flee(mt) {
        if (fleetim && !mt.iswiz) {
            await monflee(mt, fleetim, false, false, player);
        }
    }

    const name = x_monnam(mon, { article: 'the', capitalize: true });

    switch (m.has_defense) {
    case MUSE_UNICORN_HORN:
        if (vismon) {
            if (otmp)
                await pline_mon(mon, `${name} uses a unicorn horn!`);
            else {
                const name2 = x_monnam(mon, { article: 'none' });
                await pline(`The tip of ${name2}'s horn glows!`);
            }
        }
    if (!mon_can_see(mon)) {
            await mcureblindness(mon, vismon, player);
        } else if (mon.mconf || mon.mstun) {
            mon.mconf = 0;
            mon.mstun = 0;
            if (vismon)
                await pline_mon(mon, `${name} seems steadier now.`);
        }
        return 2;

    case MUSE_BUGLE:
        if (!otmp) return 0;
        if (vismon) {
            await pline_mon(mon, `${name} plays a bugle!`);
        } else {
            await You_hear('a bugle playing reveille!');
        }
        await awaken_soldiers(mon, map, player);
        return 2;

    case MUSE_WAN_TELEPORTATION_SELF:
        if (!otmp) return 0;
        if ((mon.isshk && inhishop(mon, map)) || mon.isgd || mon.ispriest) return 2;
        await m_flee(mon);
        await mzapwand(mon, otmp, true, map, player);
        await m_tele(mon, vismon, oseen, WAN_TELEPORTATION, map, player);
        return 2;

    case MUSE_WAN_TELEPORTATION:
        if (!otmp) return 0;
        zap_oseen = oseen;
        await mzapwand(mon, otmp, false, map, player);
        m_using = true;
        await mbhit(mon, rn1(8, 6), mbhitm, null, otmp, map, player);
        if (noteleport_level(mon, map))
            mon_learns_traps(mon, TELEP_TRAP);
        m_using = false;
        return 2;

    case MUSE_SCR_TELEPORTATION: {
        if (!otmp) return 0;
        const obj_is_cursed = otmp.cursed;
        if (mon.isshk || mon.isgd || mon.ispriest) return 2;
        await m_flee(mon);
        // Extract scroll from inventory before teleport
        let scroll = otmp;
        if ((scroll.quan || 1) > 1) scroll = splitobj(scroll, 1);
        extract_from_minvent(mon, scroll, false, false);
        await mreadmsg(mon, scroll, player);
        if (obj_is_cursed || mon.mconf) {
            if (vismon) {
                await pline_mon(mon, `${name} seems very disoriented for a moment.`);
            }
        } else {
            await m_tele(mon, vismon, oseen, SCR_TELEPORTATION, map, player);
        }
        // scroll used up (already extracted)
        return 2;
    }

    case MUSE_WAN_DIGGING: {
        if (!otmp) return 0;
        await m_flee(mon);
        await mzapwand(mon, otmp, false, map, player);
        if (oseen) makeknown(WAN_DIGGING);
        const loc = map.at(mon.mx, mon.my);
        if (loc && (IS_FURNITURE(loc.typ) || IS_DRAWBRIDGE(loc.typ)
            || await stairway_at(mon.mx, mon.my, map))) {
            await pline('The digging ray is ineffective.');
            return 2;
        }
        if (!Can_dig_down(map)) {
            if (vismon) {
                await pline('The floor here is too hard to dig in.');
            }
            return 2;
        }
        // Monster digs hole and falls through
        if (vis) {
            await pline_mon(mon, `${name} has made a hole in the floor.`);
            await pline_mon(mon, `${name} ${is_flyer(mdat) ? 'dives' : 'falls'} through...`);
        } else {
            await You_hear('something crash through the floor.');
        }
        await migrate_to_level(mon, ledger_no(null) + 1, 0, null, map);
        return 2;
    }

    case MUSE_DEF_WAN_UNDEAD_TURNING:
        if (!otmp) return 0;
        zap_oseen = oseen;
        await mzapwand(mon, otmp, false, map, player);
        m_using = true;
        await mbhit(mon, rn1(8, 6), mbhitm, null, otmp, map, player);
        m_using = false;
        return 2;

    case MUSE_WAN_CREATE_MONSTER: {
        if (!otmp) return 0;
        const cc = {};
        if (!enexto(cc, mon.mx, mon.my, null, map, player)) return 0;
        await mzapwand(mon, otmp, false, map, player);
        const newmon = makemon(null, cc.x, cc.y, 0, 0, map);
        if (newmon && canspotmon(newmon, player, null, map) && oseen)
            makeknown(WAN_CREATE_MONSTER);
        return 2;
    }

    case MUSE_SCR_CREATE_MONSTER: {
        if (!otmp) return 0;
        let cnt = 1;
        if (!rn2(73)) cnt += rnd(4);
        if (mon.mconf || otmp.cursed) cnt += 12;
        let pm = null;
        if (mon.mconf) pm = mons[PM_ACID_BLOB];
        await mreadmsg(mon, otmp, player);
        let known = false;
        while (cnt-- > 0) {
            const cc = {};
            if (!enexto(cc, mon.mx, mon.my, pm, map, player)) break;
            const newmon = makemon(pm, cc.x, cc.y, 0, 0, map);
            if (newmon && canspotmon(newmon, player, null, map)) known = true;
        }
        if (known) makeknown(SCR_CREATE_MONSTER);
        m_useup(mon, otmp);
        return 2;
    }

    case MUSE_TRAPDOOR: {
        if (Is_botlevel(map)) return 0;
        await m_flee(mon);
        const t2 = t_at(trapx, trapy, map);
        if (vis && t2) {
            await pline_mon(mon, `${name} jumps into a trap!`);
        }
        if (t2) reveal_trap(t2, vis, map);
        // Move monster to trap and migrate
        await migrate_to_level(mon, ledger_no(null) + 1, 0, null, map);
        return 2;
    }

    case MUSE_UPSTAIRS: {
        await m_flee(mon);
        const stway = await stairway_at(mon.mx, mon.my, map);
        if (!stway) return 0;
        if (vismon)
            await pline_mon(mon, `${name} escapes upstairs!`);
        await migrate_to_level(mon, 0, 0, null, map);
        return 2;
    }

    case MUSE_DOWNSTAIRS: {
        await m_flee(mon);
        const stway = await stairway_at(mon.mx, mon.my, map);
        if (!stway) return 0;
        if (vismon)
            await pline_mon(mon, `${name} escapes downstairs!`);
        await migrate_to_level(mon, 0, 0, null, map);
        return 2;
    }

    case MUSE_UP_LADDER: {
        await m_flee(mon);
        const stway = await stairway_at(mon.mx, mon.my, map);
        if (!stway) return 0;
        if (vismon)
            await pline_mon(mon, `${name} escapes up the ladder!`);
        await migrate_to_level(mon, 0, 0, null, map);
        return 2;
    }

    case MUSE_DN_LADDER: {
        await m_flee(mon);
        const stway = await stairway_at(mon.mx, mon.my, map);
        if (!stway) return 0;
        if (vismon)
            await pline_mon(mon, `${name} escapes down the ladder!`);
        await migrate_to_level(mon, 0, 0, null, map);
        return 2;
    }

    case MUSE_SSTAIRS: {
        await m_flee(mon);
        const stway = await stairway_at(mon.mx, mon.my, map);
        if (!stway) return 0;
        if (vismon)
            await pline_mon(mon, `${name} escapes ${stway.up ? 'up' : 'down'}stairs!`);
        await migrate_to_level(mon, 0, 0, null, map);
        return 2;
    }

    case MUSE_TELEPORT_TRAP: {
        await m_flee(mon);
        const t2 = t_at(trapx, trapy, map);
        if (vis && t2) {
            await pline_mon(mon, `${name} jumps onto a teleport trap!`);
        }
        if (t2) reveal_trap(t2, vis, map);
        await m_tele(mon, vismon, false, 0, map, player);
        return 2;
    }

    case MUSE_POT_HEALING:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        i = d(6 + 2 * bcsign(otmp), 4);
        healmon(mon, i, 1);
        if (!otmp.cursed && !mon_can_see(mon))
            await mcureblindness(mon, vismon, player);
        if (vismon)
            await pline_mon(mon, `${name} looks better.`);
        if (oseen) makeknown(POT_HEALING);
        m_useup(mon, otmp);
        return 2;

    case MUSE_POT_EXTRA_HEALING:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        i = d(6 + 2 * bcsign(otmp), 8);
        healmon(mon, i, otmp.blessed ? 5 : 2);
        if (!mon_can_see(mon))
            await mcureblindness(mon, vismon, player);
        if (vismon)
            await pline_mon(mon, `${name} looks much better.`);
        if (oseen) makeknown(POT_EXTRA_HEALING);
        m_useup(mon, otmp);
        return 2;

    case MUSE_POT_FULL_HEALING:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        if (otmp.otyp === POT_SICKNESS) {
            // Pestilence — unbless
            otmp.blessed = false;
        }
        healmon(mon, mon.mhpmax || 1, otmp.blessed ? 8 : 4);
        if (!mon_can_see(mon) && otmp.otyp !== POT_SICKNESS)
            await mcureblindness(mon, vismon, player);
        if (vismon)
            await pline_mon(mon, `${name} looks completely healed.`);
        if (oseen) makeknown(otmp.otyp);
        m_useup(mon, otmp);
        return 2;

    case MUSE_LIZARD_CORPSE:
        if (!otmp) return 0;
        await mon_consume_unstone(mon, otmp, false, false, map, player);
        return 2;

    case 0:
        return 0; // exploded wand

    default:
        break;
    }
    return 0;
}

// ========================================================================
// rnd_defensive_item — C ref: muse.c:1220
// Note: also implemented in makemon.js for level generation.
// This version is for runtime use.
// ========================================================================
export function rnd_defensive_item(mtmp, map) {
    const pm = mtmp.data || mtmp.type || {};
    const difficulty = pm.difficulty || pm.mlevel || 0;
    let trycnt = 0;

    if (is_animal(pm) || attacktype(pm, AT_EXPL) || mindless(pm)
        || pm.mlet === S_GHOST || pm.mlet === S_KOP)
        return 0;

    while (true) {
        const roll = rn2(8 + (difficulty > 3 ? 1 : 0)
            + (difficulty > 6 ? 1 : 0) + (difficulty > 8 ? 1 : 0));
        switch (roll) {
        case 6:
        case 9:
            if (noteleport_level(mtmp, map) && ++trycnt < 2) continue;
            if (!rn2(3)) return WAN_TELEPORTATION;
            // fall through
        case 0:
        case 1:
            return SCR_TELEPORTATION;
        case 8:
        case 10:
            if (!rn2(3)) return WAN_CREATE_MONSTER;
            // fall through
        case 2:
            return SCR_CREATE_MONSTER;
        case 3:
            return POT_HEALING;
        case 4:
            return POT_EXTRA_HEALING;
        case 5:
            return (pm.mndx !== PM_PESTILENCE) ? POT_FULL_HEALING : POT_SICKNESS;
        case 7:
            if (Sokoban(map) && rn2(4)) continue;
            if (is_floater(pm) || mtmp.isshk || mtmp.isgd || mtmp.ispriest) return 0;
            return WAN_DIGGING;
        }
        return 0;
    }
}

// ========================================================================
// linedup_chk_corpse — C ref: muse.c:1292
// ========================================================================
export function linedup_chk_corpse(x, y, map) {
    return sobj_at(CORPSE, x, y, map) != null;
}

// ========================================================================
// m_use_undead_turning — C ref: muse.c:1298
// ========================================================================
export function m_use_undead_turning(mtmp, obj, map, player) {
    const ax = player.x + Math.sign((mtmp.mux ?? player.x) - mtmp.mx) * 3;
    const ay = player.y + Math.sign((mtmp.muy ?? player.y) - mtmp.my) * 3;
    const bx = mtmp.mx, by = mtmp.my;

    if (!(obj.otyp === WAN_UNDEAD_TURNING && obj.spe > 0)) return;

    if (carrying(CORPSE, player)
        || linedup_callback(ax, ay, bx, by, (x2, y2) => linedup_chk_corpse(x2, y2, map), map)) {
        m.offensive = obj;
        m.has_offense = MUSE_OFF_WAN_UNDEAD_TURNING;
    }
}

// ========================================================================
// hero_behind_chokepoint — C ref: muse.c:1341
// ========================================================================
export function hero_behind_chokepoint(mtmp, map, player) {
    const mux = mtmp.mux ?? player.x;
    const muy = mtmp.muy ?? player.y;
    const dx = Math.sign(mtmp.mx - mux);
    const dy = Math.sign(mtmp.my - muy);

    const x = mux + dx;
    const y = muy + dy;

    const c1x = x - dy, c1y = y + dx;
    const c2x = x + dy, c2y = y - dx;

    if ((!isok(c1x, c1y) || !accessible(c1x, c1y, map))
        && (!isok(c2x, c2y) || !accessible(c2x, c2y, map)))
        return true;
    return false;
}

// ========================================================================
// mon_has_friends — C ref: muse.c:1368
// ========================================================================
export function mon_has_friends(mtmp, map) {
    if (mtmp.tame || mtmp.mpeaceful) return false;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const x = mtmp.mx + dx, y = mtmp.my + dy;
            if (!isok(x, y)) continue;
            const mon2 = m_at(x, y, map);
            if (mon2 && mon2 !== mtmp && !mon2.tame && !mon2.mpeaceful)
                return true;
        }
    }
    return false;
}

// ========================================================================
// mon_likes_objpile_at — C ref: muse.c:1392
// ========================================================================
function mon_likes_objpile_at(mtmp, x, y, map) {
    if (!isok(x, y)) return false;
    const objects = map.objectsAt ? map.objectsAt(x, y) : [];
    if (!objects || objects.length === 0) return false;

    let i = 0;
    for (const otmp of objects) {
        if (i >= 3) break;
        if (mon_would_take_item(mtmp, otmp)) return true;
        i++;
    }
    if (i >= 3) return true;
    return false;
}

// ========================================================================
// find_offensive — C ref: muse.c:1419
// ========================================================================
export async function find_offensive(mtmp, map, player) {
    const mdat = mtmp.data || mtmp.type || {};

    m.offensive = null;
    m.has_offense = 0;

    if (mtmp.mpeaceful || is_animal(mdat) || mindless(mdat) || nohands(mdat))
        return false;
    if (player.uswallow) return false;
    if (onscary(map, mtmp.mx, mtmp.my, mtmp)) return false;
    if (dmgtype(mdat, 11 /* AD_HEAL */)
        && !player.weapon && !player.shirt && !player.armor && !player.helmet
        && !player.shield && !player.gloves && !player.cloak && !player.boots) {
        return false;
    }

    if (!linedUpToPlayer(mtmp, map, player)) return false;

    const reflection_skip = (m_seenres(mtmp, 0) !== 0
        || monnear(mtmp, mtmp.mux ?? player.x, mtmp.muy ?? player.y));
    const mtmp_helmet = which_armor(mtmp, W_ARMH);

    for (const obj of (mtmp.minvent || [])) {
        if (!reflection_skip) {
            if (m.has_offense === MUSE_OFF_WAN_DEATH) continue;
            if (obj.otyp === WAN_DEATH && obj.spe > 0) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_DEATH;
            }
            if (m.has_offense === MUSE_OFF_WAN_SLEEP) continue;
            if (obj.otyp === WAN_SLEEP && obj.spe > 0 && !((_gstate?.multi || 0) < 0)) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_SLEEP;
            }
            if (m.has_offense === MUSE_OFF_WAN_FIRE) continue;
            if (obj.otyp === WAN_FIRE && obj.spe > 0) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_FIRE;
            }
            if (m.has_offense === MUSE_OFF_FIRE_HORN) continue;
            if (obj.otyp === FIRE_HORN && obj.spe > 0 && can_blow(mdat)) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_FIRE_HORN;
            }
            if (m.has_offense === MUSE_OFF_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && obj.spe > 0) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_COLD;
            }
            if (m.has_offense === MUSE_OFF_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && obj.spe > 0 && can_blow(mdat)) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_FROST_HORN;
            }
            if (m.has_offense === MUSE_OFF_WAN_LIGHTNING) continue;
            if (obj.otyp === WAN_LIGHTNING && obj.spe > 0) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_LIGHTNING;
            }
            if (m.has_offense === MUSE_OFF_WAN_MAGIC_MISSILE) continue;
            if (obj.otyp === WAN_MAGIC_MISSILE && obj.spe > 0) {
                m.offensive = obj;
                m.has_offense = MUSE_OFF_WAN_MAGIC_MISSILE;
            }
        }
        if (m.has_offense === MUSE_OFF_WAN_UNDEAD_TURNING) continue;
        m_use_undead_turning(mtmp, obj, map, player);

        if (m.has_offense === MUSE_OFF_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && obj.spe > 0) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_WAN_STRIKING;
        }

        if (m.has_offense === MUSE_OFF_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0
            && !player.teleport_control
            && (!noteleport_level(mtmp, map) || !mon_knows_traps(mtmp, TELEP_TRAP))
            && (onscary(map, player.x, player.y, mtmp)
                || (hero_behind_chokepoint(mtmp, map, player) && mon_has_friends(mtmp, map))
                || mon_likes_objpile_at(mtmp, player.x, player.y, map)
                || await stairway_at(player.x, player.y, map))) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_WAN_TELEPORTATION;
        }

        if (m.has_offense === MUSE_OFF_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && !((_gstate?.multi || 0) < 0)) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_POT_PARALYSIS;
        }
        if (m.has_offense === MUSE_OFF_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS && !attacktype(mdat, AT_GAZE)) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_POT_BLINDNESS;
        }
        if (m.has_offense === MUSE_OFF_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_POT_CONFUSION;
        }
        if (m.has_offense === MUSE_OFF_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_POT_SLEEPING;
        }
        if (m.has_offense === MUSE_OFF_POT_ACID) continue;
        if (obj.otyp === POT_ACID) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_POT_ACID;
        }

        if (m.has_offense === MUSE_OFF_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(mdat) || passes_walls(mdat)
                || noncorporeal(mdat) || unsolid(mdat)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux ?? player.x, mtmp.muy ?? player.y) <= 2
            && mtmp.mcansee && haseyes(mdat)
            && !Is_rogue_level(map)
            && (!In_endgame(map) || Is_earthlevel(map))) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_SCR_EARTH;
        }

        if (m.has_offense === MUSE_OFF_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA
            && !player.blind
            && dist2(mtmp.mx, mtmp.my, mtmp.mux ?? player.x, mtmp.muy ?? player.y) <= 2
            && obj.spe > 0 && !rn2(6)) {
            m.offensive = obj;
            m.has_offense = MUSE_OFF_CAMERA;
        }
    }
    return !!m.has_offense;
}

// ========================================================================
// mbhitm — C ref: muse.c:1595
// ========================================================================
async function mbhitm(mtmp, otmp, map, player) {
    let tmp;
    let reveal_invis = false;
    let learnit = false;
    const hits_you = (mtmp === player);

    if (!hits_you && otmp.otyp !== WAN_UNDEAD_TURNING) {
        mtmp.msleeping = 0;
        mtmp.sleeping = false;
        if (mtmp.m_ap_type) seemimic(mtmp, map);
    }

    switch (otmp.otyp) {
    case WAN_STRIKING:
        reveal_invis = true;
        if (hits_you) {
            // Hero hit by striking wand
            if (player.antimagic) {
                await pline('Boing!');
                learnit = true;
            } else if (rnd(20) < 10 + (player.ac ?? 10)) {
                await pline('The wand hits you!');
                tmp = d(2, 12);
                if (player.halfSpellDamage) tmp = Math.floor((tmp + 1) / 2);
                player.uhp = Math.max(0, (player.uhp || 0) - tmp);
                learnit = true;
            } else {
                await pline('The wand misses you.');
            }
        } else {
            // Monster hit by striking wand
            if (resists_magm(mtmp)) {
                learnit = true;
            } else if (rnd(20) < 10 + find_mac(mtmp)) {
                tmp = d(2, 12);
                mtmp.mhp -= tmp;
                resist(mtmp, WAND_CLASS);
                learnit = true;
            }
        }
        if (learnit && zap_oseen) makeknown(WAN_STRIKING);
        break;

    case WAN_TELEPORTATION:
        if (hits_you) {
            // Hero teleport handling is routed through global teleport flow.
            if (zap_oseen) makeknown(WAN_TELEPORTATION);
        } else {
            if (!tele_restrict(mtmp, map))
                await rloc(mtmp, 0, map, player);
        }
        break;

    case WAN_UNDEAD_TURNING:
        if (hits_you) {
            // Hero-side unturn effects are handled by shared zap flow.
            learnit = zap_oseen;
        } else {
            let wake = false;
            if (unturn_dead(mtmp)) wake = true;
            if (is_undead(mtmp.data || mtmp.type || {}) || is_vampshifter(mtmp)) {
                wake = reveal_invis = true;
                resist(mtmp, WAND_CLASS, rnd(8));
            }
            if (wake) {
                if (!DEADMONSTER(mtmp))
                    wakeup(mtmp, false, map, player);
                learnit = zap_oseen;
            }
        }
        if (learnit) makeknown(WAN_UNDEAD_TURNING);
        break;

    default:
        break;
    }

    if (reveal_invis && !DEADMONSTER(mtmp)
        && cansee(map, player, null, bhitpos.x, bhitpos.y)
        && !canspotmon(mtmp, player, null, map))
        map_invisible(map, bhitpos.x, bhitpos.y, player);

    return 0;
}

// ========================================================================
// fhito_loc — C ref: muse.c:1704
// ========================================================================
function fhito_loc(obj, tx, ty, fhito, map) {
    if (!fhito) return false;
    const objects = map.objectsAt ? map.objectsAt(tx, ty) : [];
    if (!objects || objects.length === 0) return false;

    let hitanything = 0;
    for (const otmp of [...objects]) {
        hitanything += fhito(otmp, obj);
    }
    return hitanything > 0;
}

// ========================================================================
// mbhit — C ref: muse.c:1731
// ========================================================================
async function mbhit(mon, range, fhitm, fhito, obj, map, player) {
    bhitpos.x = mon.mx;
    bhitpos.y = mon.my;
    const ddx = Math.sign((mon.mux ?? player.x) - mon.mx);
    const ddy = Math.sign((mon.muy ?? player.y) - mon.my);
    if (!ddx && !ddy) return;

    // C ref: muse.c mbhit() path uses bhit traversal that displays flashbeam.
    tmp_at(DISP_BEAM, museFlashbeamGlyph(obj?.otyp));
    try {
        while (range-- > 0) {
            bhitpos.x += ddx;
            bhitpos.y += ddy;
            const x = bhitpos.x;
            const y = bhitpos.y;

            if (!isok(x, y)) {
                bhitpos.x -= ddx;
                bhitpos.y -= ddy;
                break;
            }

            tmp_at(x, y);
            await nh_delay_output();

            if (u_at(player, bhitpos.x, bhitpos.y)) {
                if (fhitm) fhitm(player, obj, map, player);
                range -= 3;
            } else {
                const mtmp = m_at(bhitpos.x, bhitpos.y, map);
                if (mtmp) {
                    if (cansee(map, player, null, bhitpos.x, bhitpos.y)
                        && !canspotmon(mtmp, player, null, map))
                        map_invisible(map, bhitpos.x, bhitpos.y, player);
                    if (fhitm) fhitm(mtmp, obj, map, player);
                    range -= 3;
                }
            }

            if (fhito && fhito_loc(obj, bhitpos.x, bhitpos.y, fhito, map))
                range--;

            const loc = map.at(bhitpos.x, bhitpos.y);
            const ltyp = loc ? loc.typ : 0;

            if (!ZAP_POS(ltyp)
                || (loc && (loc.flags & 0x03) /* D_LOCKED | D_CLOSED */)) {
                bhitpos.x -= ddx;
                bhitpos.y -= ddy;
                break;
            }
        }
    } finally {
        tmp_at(DISP_END, 0);
    }
}

// ========================================================================
// use_offensive — C ref: muse.c:1815
// ========================================================================
export async function use_offensive(mtmp, map, player) {
    let i;
    const otmp = m.offensive;
    const mdat = mtmp.data || mtmp.type || {};

    // Offensive potions are thrown, not drunk — skip precheck for them
    if (otmp.oclass !== POTION_CLASS && (i = await precheck(mtmp, otmp, map, player)) !== 0)
        return i;
    const oseen = canseemon(mtmp, player);
    const name = x_monnam(mtmp, { article: 'the', capitalize: true });

    switch (m.has_offense) {
    case MUSE_OFF_WAN_DEATH:
    case MUSE_OFF_WAN_SLEEP:
    case MUSE_OFF_WAN_FIRE:
    case MUSE_OFF_WAN_COLD:
    case MUSE_OFF_WAN_LIGHTNING:
    case MUSE_OFF_WAN_MAGIC_MISSILE:
        await mzapwand(mtmp, otmp, false, map, player);
        if (oseen) makeknown(otmp.otyp);
        m_using = true;
        // C: buzz(BZ_M_WAND(...), nd, mx, my, dx, dy)
        {
            const nd = (otmp.otyp === WAN_MAGIC_MISSILE) ? 2 : 6;
            const ztyp = museWandZapType(otmp.otyp);
            await buzz(ztyp, nd, mtmp.mx, mtmp.my,
                Math.sign((mtmp.mux ?? player.x) - mtmp.mx),
                Math.sign((mtmp.muy ?? player.y) - mtmp.my),
                map, player);
        }
        m_using = false;
        return DEADMONSTER(mtmp) ? 1 : 2;

    case MUSE_OFF_FIRE_HORN:
    case MUSE_OFF_FROST_HORN:
        await mplayhorn(mtmp, otmp, false, map, player);
        m_using = true;
        await buzz(
            ZT_BREATH(otmp.otyp === FIRE_HORN ? ZT_FIRE : ZT_COLD),
            rn1(6, 6), mtmp.mx, mtmp.my,
            Math.sign((mtmp.mux ?? player.x) - mtmp.mx),
            Math.sign((mtmp.muy ?? player.y) - mtmp.my),
            map, player
        );
        m_using = false;
        return DEADMONSTER(mtmp) ? 1 : 2;

    case MUSE_OFF_WAN_TELEPORTATION:
    case MUSE_OFF_WAN_UNDEAD_TURNING:
    case MUSE_OFF_WAN_STRIKING:
        zap_oseen = oseen;
        await mzapwand(mtmp, otmp, false, map, player);
        m_using = true;
        await mbhit(mtmp, rn1(8, 6), mbhitm, null, otmp, map, player);
        m_using = false;
        return 2;

    case MUSE_OFF_SCR_EARTH: {
        const mmx = mtmp.mx, mmy = mtmp.my;
        await mreadmsg(mtmp, otmp, player);
        if (canspotmon(mtmp, player, null, map)) {
            await pline('The ceiling rumbles!');
            if (oseen) makeknown(otmp.otyp);
        }
        m_useup(mtmp, otmp);
        if (dist2(mmx, mmy, player.x, player.y) <= 2 && !otmp.cursed) {
            const dmg = rnd(6);
            if (Number.isFinite(player.uhp)) player.uhp -= dmg;
            await pline('A boulder crashes down near you!');
        }
        return DEADMONSTER(mtmp) ? 1 : 2;
    }

    case MUSE_OFF_CAMERA:
        if (!player.blind) {
            const cname = x_monnam(mtmp, { article: 'the', capitalize: true });
            await pline(`${cname} takes a picture of you!`);
        }
        m_using = true;
        if (!player.blind) {
            await pline('You are blinded by the flash of light!');
            player.blind = true;
            player.blindTimeout = (player.blindTimeout || 0) + rnd(51);
            mark_vision_dirty();
        }
        m_using = false;
        otmp.spe--;
        return 1;

    case MUSE_OFF_POT_PARALYSIS:
    case MUSE_OFF_POT_BLINDNESS:
    case MUSE_OFF_POT_CONFUSION:
    case MUSE_OFF_POT_SLEEPING:
    case MUSE_OFF_POT_ACID:
        if (cansee(map, player, null, mtmp.mx, mtmp.my)) {
            await pline_mon(mtmp, `${name} hurls a potion!`);
        }
        await m_throw_timed(mtmp, mtmp.mx, mtmp.my,
            Math.sign((mtmp.mux ?? player.x) - mtmp.mx),
            Math.sign((mtmp.muy ?? player.y) - mtmp.my),
            distmin(mtmp.mx, mtmp.my, mtmp.mux ?? player.x, mtmp.muy ?? player.y),
            otmp, map, player);
        return 2;

    case 0:
        return 0; // exploded wand

    default:
        break;
    }
    return 0;
}

// ========================================================================
// rnd_offensive_item — C ref: muse.c:2014
// ========================================================================
// Autotranslated from muse.c:2014
export function rnd_offensive_item(mtmp) {
  let pm = mtmp.data, difficulty = mons[(monsndx(pm))].difficulty;
  if (is_animal(pm) || attacktype(pm, AT_EXPL) || mindless(mtmp.data) || pm.mlet === S_GHOST || pm.mlet === S_KOP) return 0;
  if (difficulty > 7 && !rn2(35)) return WAN_DEATH;
  switch (rn2(9 - (difficulty < 4) + 4 * (difficulty > 6))) {
    case 0:
      let mtmp_helmet = which_armor(mtmp, W_ARMH);
      if (hard_helmet(mtmp_helmet) || amorphous(pm) || passes_walls(pm) || noncorporeal(pm) || unsolid(pm)) return SCR_EARTH;
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
  }
  return 0;
}

// ========================================================================
// find_misc — C ref: muse.c:2074
// ========================================================================
export async function find_misc(mon, map, player) {
    const mdat = mon.data || mon.type || {};
    const x = mon.mx, y = mon.my;
    const immobile = ((mdat.mmove || 0) === 0);
    const stuck = (mon === player.ustuck);

    m.misc = null;
    m.has_misc = 0;
    if (is_animal(mdat) || mindless(mdat)) return false;
    if (player.uswallow && stuck) return false;

    if (dist2(x, y, mon.mux ?? player.x, mon.muy ?? player.y) > 36)
        return false;

    // Poly trap check for weak monsters
    const pmidx = monsndx(mdat);
    if (!stuck && !immobile && !mon.mtrapped && (mon.cham === undefined || mon.cham === NON_PM)
        && (mdat.difficulty || mdat.mlevel || 0) < 6) {
        const ignore_boulders = verysmall(mdat) || throws_rocks(mdat) || passes_walls(mdat);
        const diag_ok = !NODIAG(pmidx);

        for (let xx = x - 1; xx <= x + 1; xx++) {
            for (let yy = y - 1; yy <= y + 1; yy++) {
                if (!isok(xx, yy) || u_at(player, xx, yy)) continue;
                if (!diag_ok && xx !== x && yy !== y) continue;
                if ((xx !== x || yy !== y) && m_at(xx, yy, map)) continue;
                const t = t_at(xx, yy, map);
                if (!t) continue;
                if (!ignore_boulders && sobj_at(BOULDER, xx, yy, map)) continue;
                if (onscary(map, xx, yy, mon)) continue;
                if (t.ttyp === POLY_TRAP) {
                    trapx = xx;
                    trapy = yy;
                    m.has_misc = MUSE_MISC_POLY_TRAP;
                    return true;
                }
            }
        }
    }

    if (nohands(mdat)) return false;

    // Inventory scan for misc items
    for (const obj of (mon.minvent || [])) {
        if (obj.otyp === POT_GAIN_LEVEL
            && (!obj.cursed || (!mon.isgd && !mon.isshk && !mon.ispriest))) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_POT_GAIN_LEVEL;
        }

        if (m.has_misc === MUSE_MISC_BULLWHIP) continue;
        if (obj.otyp === BULLWHIP && !mon.mpeaceful
            && player.weapon && !rn2(5) && obj === MON_WEP(mon)
            && u_at(player, mon.mux ?? player.x, mon.muy ?? player.y)
            && m_next2u(mon, player)
            && !player.uswallow
            && await canletgo(player.weapon, '')) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_BULLWHIP;
        }

        if (m.has_misc === MUSE_MISC_WAN_MAKE_INVISIBLE) continue;
        if (obj.otyp === WAN_MAKE_INVISIBLE && obj.spe > 0 && !mon.minvis
            && !mon.invis_blkd && (!mon.mpeaceful || player.seeInvisible)
            && (!attacktype(mdat, AT_GAZE) || mon.mcan)) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_WAN_MAKE_INVISIBLE;
        }

        if (m.has_misc === MUSE_MISC_POT_INVISIBILITY) continue;
        if (obj.otyp === POT_INVISIBILITY && !mon.minvis
            && !mon.invis_blkd && (!mon.mpeaceful || player.seeInvisible)
            && (!attacktype(mdat, AT_GAZE) || mon.mcan)) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_POT_INVISIBILITY;
        }

        if (m.has_misc === MUSE_MISC_WAN_SPEED_MONSTER) continue;
        if (obj.otyp === WAN_SPEED_MONSTER && obj.spe > 0
            && mon.mspeed !== MFAST && !mon.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_WAN_SPEED_MONSTER;
        }

        if (m.has_misc === MUSE_MISC_POT_SPEED) continue;
        if (obj.otyp === POT_SPEED && mon.mspeed !== MFAST && !mon.isgd) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_POT_SPEED;
        }

        if (m.has_misc === MUSE_MISC_WAN_POLYMORPH) continue;
        if (obj.otyp === WAN_POLYMORPH && obj.spe > 0
            && (mon.cham === undefined || mon.cham === NON_PM)
            && (mdat.difficulty || mdat.mlevel || 0) < 6) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_WAN_POLYMORPH;
        }

        if (m.has_misc === MUSE_MISC_POT_POLYMORPH) continue;
        if (obj.otyp === POT_POLYMORPH
            && (mon.cham === undefined || mon.cham === NON_PM)
            && (mdat.difficulty || mdat.mlevel || 0) < 6) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_POT_POLYMORPH;
        }

        if (m.has_misc === MUSE_MISC_BAG) continue;
        if (Is_container(obj) && obj.otyp !== BAG_OF_TRICKS
            && !rn2(5)
            && !m.has_misc && Has_contents(obj)
            && !obj.olocked && !obj.otrapped) {
            m.misc = obj;
            m.has_misc = MUSE_MISC_BAG;
        }
    }

    return !!m.has_misc;
}

// ========================================================================
// muse_newcham_mon — C ref: muse.c:2227
// ========================================================================
export function muse_newcham_mon(mon) {
    const m_armr = which_armor(mon, W_ARM);
    if (m_armr && (m_armr.otyp === SILVER_DRAGON_SCALES
        || m_armr.otyp === SILVER_DRAGON_SCALE_MAIL)) {
        return mons[PM_SILVER_DRAGON];
    }
    if (m_armr) {
        const n = String(objectData[m_armr.otyp]?.oc_name || '').toLowerCase();
        if (n.includes('chromatic')) return mons[PM_CHROMATIC_DRAGON];
    }
    return rndmonst();
}

// ========================================================================
// mloot_container — C ref: muse.c:2241
// ========================================================================
async function mloot_container(mon, container, vismon, map, player) {
    if (!container || !Has_contents(container) || container.olocked)
        return 0;
    if (Is_mbag(container) && container.cursed) return 0;
    if (SchroedingersBox(container)) return 0;

    let takeout_count;
    const roll = rn2(10);
    if (roll <= 3) takeout_count = 1;
    else if (roll <= 6) takeout_count = 2;
    else if (roll <= 8) takeout_count = 3;
    else takeout_count = 4;

    let res = 0;
    for (let takeout_indx = 0; takeout_indx < takeout_count; ++takeout_indx) {
        if (!Has_contents(container)) break;

        let nitems = container.cobj.length;
        if (!rn2(nitems + 1)) break;
        const idx = rn2(nitems);
        const xobj = container.cobj[idx];
        if (!xobj) break;

        // Remove from container
        container.cobj.splice(idx, 1);

        if (can_carry(mon, xobj)) {
            if (vismon) {
                const name = x_monnam(mon, { article: 'the', capitalize: true });
                await pline_mon(mon, `${name} rummages through a container.`);
            }
            mpickobj(mon, xobj);
            res = 2;
        } else {
            // Put back
            container.cobj.push(xobj);
            break;
        }
    }
    return res;
}

// ========================================================================
// you_aggravate — C ref: muse.c:2595
// ========================================================================
async function you_aggravate(mtmp) {
    const who = x_monnam(mtmp, { article: 'the' });
    await pline(`For some reason, ${who}'s presence is known to you.`);
    await pline(`You feel aggravated at ${who}.`);
}

// ========================================================================
// use_misc — C ref: muse.c:2360
// ========================================================================
export async function use_misc(mon, map, player) {
    let i;
    const otmp = m.misc;
    const mdat = mon.data || mon.type || {};

    if ((i = await precheck(mon, otmp, map, player)) !== 0) return i;

    const vis = cansee(map, player, null, mon.mx, mon.my);
    const vismon = canseemon(mon, player);
    const oseen = otmp && vismon;
    const name = x_monnam(mon, { article: 'the', capitalize: true });

    switch (m.has_misc) {
    case MUSE_MISC_POT_GAIN_LEVEL:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        if (otmp.cursed) {
            if (Can_rise_up(mon.mx, mon.my, map)) {
                if (vismon) {
                    await pline_mon(mon, `${name} rises up, through the ceiling!`);
                }
                m_useup(mon, otmp);
                await migrate_to_level(mon, 0, 0, null, map);
                return 2;
            }
            if (vismon) {
                await pline_mon(mon, `${name} looks uneasy.`);
            }
            m_useup(mon, otmp);
            return 2;
        }
        if (vismon)
            await pline_mon(mon, `${name} seems more experienced.`);
        if (oseen) makeknown(POT_GAIN_LEVEL);
        m_useup(mon, otmp);
        if (!await grow_up(mon, null, _gstate)) return 1;
        return 2;

    case MUSE_MISC_WAN_MAKE_INVISIBLE:
    case MUSE_MISC_POT_INVISIBILITY:
        if (!otmp) return 0;
        if (otmp.otyp === WAN_MAKE_INVISIBLE) {
            await mzapwand(mon, otmp, true, map, player);
        } else {
            await mquaffmsg(mon, otmp, player);
        }
        mon_set_minvis(mon, map);
        if (vismon && mon.minvis) {
            if (canspotmon(mon, player, null, map)) {
                await pline(`${name}'s body takes on a strange transparency.`);
            } else {
                const name2 = x_monnam(mon, { article: 'none' });
                await pline(`Suddenly you cannot see ${name2}.`);
                if (vis) map_invisible(map, mon.mx, mon.my, player);
            }
            if (oseen) makeknown(otmp.otyp);
        }
        if (otmp.otyp === POT_INVISIBILITY) {
            if (otmp.cursed) await you_aggravate(mon);
            m_useup(mon, otmp);
        }
        return 2;

    case MUSE_MISC_WAN_SPEED_MONSTER:
        if (!otmp) return 0;
        await mzapwand(mon, otmp, true, map, player);
        mon_adjust_speed(mon, 1, otmp);
        return 2;

    case MUSE_MISC_POT_SPEED:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        mon_adjust_speed(mon, 1, otmp);
        m_useup(mon, otmp);
        return 2;

    case MUSE_MISC_WAN_POLYMORPH:
        if (!otmp) return 0;
        await mzapwand(mon, otmp, true, map, player);
        newcham(mon, muse_newcham_mon(mon), 0);
        if (oseen) makeknown(WAN_POLYMORPH);
        return 2;

    case MUSE_MISC_POT_POLYMORPH:
        if (!otmp) return 0;
        await mquaffmsg(mon, otmp, player);
        m_useup(mon, otmp);
        if (vismon)
            await pline_mon(mon, `${name} suddenly mutates!`);
        newcham(mon, muse_newcham_mon(mon), 0);
        if (oseen) makeknown(POT_POLYMORPH);
        return 2;

    case MUSE_MISC_POLY_TRAP: {
        const t = t_at(trapx, trapy, map);
        if (vismon || (t && vis)) {
            await pline_mon(mon, `${name} deliberately jumps onto a trap!`);
        }
        // C: relocate monster, then newcham
        newcham(mon, null, 0);
        return 2;
    }

    case MUSE_MISC_BAG:
        if (!otmp) return 0;
        return await mloot_container(mon, otmp, vismon, map, player);

    case MUSE_MISC_BULLWHIP: {
        // Attempt to disarm hero
        const The_whip = vismon ? 'The bullwhip' : 'A whip';
        let where_to = rn2(4);
        let obj = player.weapon;
        if (!obj) break;

        if (vismon)
            await pline_mon(mon, `${name} flicks a bullwhip towards your hand!`);
        if (obj.otyp === HEAVY_IRON_BALL) {
            await pline(`${The_whip} fails to wrap around the ball.`);
            return 1;
        }
        await pline(`${The_whip} wraps around what you're wielding!`);
        if (welded(obj, player)) {
            await pline('It is welded to your hand!');
            where_to = 0;
        }
        if (!where_to) {
            await pline('The whip slips free.');
            return 1;
        }
        await pline_mon(mon, `${name} yanks your weapon away!`);
        if (Array.isArray(player.inventory)) {
            const idx = player.inventory.indexOf(obj);
            if (idx >= 0) player.inventory.splice(idx, 1);
        }
        if (player.weapon === obj) player.weapon = null;
        obj.owornmask = 0;
        obj.ox = player.x;
        obj.oy = player.y;

        if (where_to === 3 && can_carry(mon, obj)) {
            mpickobj(mon, obj);
        } else if (where_to === 2) {
            obj.ox = mon.mx;
            obj.oy = mon.my;
            placeFloorObject(map, obj);
        } else {
            placeFloorObject(map, obj);
        }
        return 1;
    }

    case 0:
        return 0; // exploded wand

    default:
        break;
    }
    return 0;
}

// ========================================================================
// rnd_misc_item — C ref: muse.c:2619
// Note: also implemented in makemon.js for level generation.
// ========================================================================
// Autotranslated from muse.c:2618
export function rnd_misc_item(mtmp) {
  let pm = mtmp.data, difficulty = mons[(monsndx(pm))].difficulty;
  if (is_animal(pm) || attacktype(pm, AT_EXPL) || mindless(mtmp.data) || pm.mlet === S_GHOST || pm.mlet === S_KOP) return 0;
  if (difficulty < 6 && !rn2(30)) return rn2(6) ? POT_POLYMORPH : WAN_POLYMORPH;
  if (!rn2(40) && !nonliving(pm) && !is_vampshifter(mtmp)) return AMULET_OF_LIFE_SAVING;
  switch (rn2(3)) {
    case 0:
      if (mtmp.isgd) return 0;
    return rn2(6) ? POT_SPEED : WAN_SPEED_MONSTER;
    case 1:
      if (mtmp.mpeaceful && !See_invisible) return 0;
    return rn2(6) ? POT_INVISIBILITY : WAN_MAKE_INVISIBLE;
    case 2:
      return POT_GAIN_LEVEL;
  }
  return 0;
}

// ========================================================================
// necrophiliac — C ref: muse.c:2656 (#if 0 in C; retained as helper surface)
// ========================================================================
function necrophiliac(objlist, any_corpse = false) {
    let cur = objlist;
    while (cur) {
        if (cur.otyp === CORPSE
            && (any_corpse || touch_petrifies(mons[cur.corpsenm] || {}))) {
            return true;
        }
        if (Has_contents(cur) && necrophiliac(cur.cobj, false)) {
            return true;
        }
        cur = cur.nobj || null;
    }
    return false;
}

// ========================================================================
// searches_for_item — C ref: muse.c:2670
// ========================================================================
export function searches_for_item(mon, obj) {
    const typ = obj.otyp;
    const mdat = mon.data || mon.type || {};

    // Don't interact with protected items on scary squares
    if (obj.where === OBJ_FLOOR && obj.ox === mon.mx && obj.oy === mon.my
        && onscary(null, obj.ox, obj.oy, mon))
        return false;

    if (is_animal(mdat) || mindless(mdat) || mdat.mndx === PM_GHOST)
        return false;

    if (typ === WAN_MAKE_INVISIBLE || typ === POT_INVISIBILITY)
        return !mon.minvis && !mon.invis_blkd && !attacktype(mdat, AT_GAZE);
    if (typ === WAN_SPEED_MONSTER || typ === POT_SPEED)
        return mon.mspeed !== MFAST;

    const od = objectData[typ];
    if (!od) return false;
    const oclass = od.oc_class;

    switch (oclass) {
    case WAND_CLASS:
        if (obj.spe <= 0) return false;
        if (typ === WAN_DIGGING) return !is_floater(mdat);
        if (typ === WAN_POLYMORPH) return (mdat.difficulty || mdat.mlevel || 0) < 6;
        if (typ === WAN_STRIKING || typ === WAN_UNDEAD_TURNING
            || typ === WAN_TELEPORTATION || typ === WAN_CREATE_MONSTER)
            return true;
        // Ray wands
        if (typ === WAN_DEATH || typ === WAN_SLEEP || typ === WAN_FIRE
            || typ === WAN_COLD || typ === WAN_LIGHTNING || typ === WAN_MAGIC_MISSILE)
            return true;
        break;
    case POTION_CLASS:
        if (typ === POT_HEALING || typ === POT_EXTRA_HEALING
            || typ === POT_FULL_HEALING || typ === POT_POLYMORPH
            || typ === POT_GAIN_LEVEL || typ === POT_PARALYSIS
            || typ === POT_SLEEPING || typ === POT_ACID || typ === POT_CONFUSION)
            return true;
        if (typ === POT_BLINDNESS && !attacktype(mdat, AT_GAZE))
            return true;
        break;
    case SCROLL_CLASS:
        if (typ === SCR_TELEPORTATION || typ === SCR_CREATE_MONSTER
            || typ === SCR_EARTH || typ === SCR_FIRE)
            return true;
        break;
    case AMULET_CLASS:
        if (typ === AMULET_OF_LIFE_SAVING)
            return !(mdat.mflags3 & 0x00000040); // !nonliving
        if (typ === AMULET_OF_REFLECTION || typ === AMULET_OF_GUARDING)
            return true;
        break;
    case TOOL_CLASS:
        if (typ === PICK_AXE) return needspick(mdat);
        if (typ === UNICORN_HORN)
            return !obj.cursed && !is_unicorn(mdat) && mdat.mndx !== PM_KI_RIN;
        if (typ === FROST_HORN || typ === FIRE_HORN)
            return obj.spe > 0 && can_blow(mdat);
        if (Is_container(obj) && !(Is_mbag(obj) && obj.cursed) && !obj.olocked)
            return true;
        if (typ === EXPENSIVE_CAMERA)
            return obj.spe > 0;
        break;
    case FOOD_CLASS:
        if (typ === CORPSE)
            return ((mon.misc_worn_check & W_ARMG)
                && touch_petrifies(mons[obj.corpsenm] || {}))
                || (!resists_ston(mon)
                    && cures_stoning(mon, obj, false));
        if (typ === TIN)
            return mcould_eat_tin(mon)
                && !resists_ston(mon)
                && cures_stoning(mon, obj, true);
        if (typ === EGG && (obj.corpsenm ?? NON_PM) !== NON_PM)
            return touch_petrifies(mons[obj.corpsenm] || {});
        break;
    default:
        break;
    }
    return false;
}

// ========================================================================
// mon_reflects — C ref: muse.c:2761
// ========================================================================
export async function mon_reflects(mon, str) {
    const mdat = mon.data || mon.type || {};
    let orefl = which_armor(mon, W_ARMS);
    if (orefl && orefl.otyp === SHIELD_OF_REFLECTION) {
        if (str) {
            const name = x_monnam(mon, { article: 'none' });
            await pline(`It is reflected by ${name}'s shield.`);
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    }
    if (arti_reflects(MON_WEP(mon))) {
        if (str) {
            const name = x_monnam(mon, { article: 'none' });
            await pline(`It is reflected by ${name}'s weapon.`);
        }
        return true;
    }
    orefl = which_armor(mon, W_AMUL);
    if (orefl && orefl.otyp === AMULET_OF_REFLECTION) {
        if (str) {
            const name = x_monnam(mon, { article: 'none' });
            await pline(`It is reflected by ${name}'s amulet.`);
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    }
    orefl = which_armor(mon, W_ARM);
    if (orefl && (orefl.otyp === SILVER_DRAGON_SCALES
        || orefl.otyp === SILVER_DRAGON_SCALE_MAIL)) {
        if (str) {
            const name = x_monnam(mon, { article: 'none' });
            await pline(`It is reflected by ${name}'s armor.`);
        }
        return true;
    }
    if (mdat.mndx === PM_SILVER_DRAGON || mdat.mndx === PM_CHROMATIC_DRAGON) {
        if (str) {
            const name = x_monnam(mon, { article: 'none' });
            await pline(`It is reflected by ${name}'s scales.`);
        }
        return true;
    }
    return false;
}

// ========================================================================
// ureflects — C ref: muse.c:2800
// ========================================================================
export async function ureflects(fmt, str, player) {
    if (!player) return false;
    const erefl = player.extrinsic_reflecting || 0;
    if (erefl & W_ARMS) {
        if (fmt && str) {
            await pline(`${str} is reflected by your shield.`);
            makeknown(SHIELD_OF_REFLECTION);
        }
        return true;
    }
    if (erefl & W_WEP) {
        if (fmt && str) await pline(`${str} is reflected by your weapon.`);
        return true;
    }
    if (erefl & W_AMUL) {
        if (fmt && str) {
            await pline(`${str} is reflected by your medallion.`);
            makeknown(AMULET_OF_REFLECTION);
        }
        return true;
    }
    if (erefl & W_ARM) {
        if (fmt && str) await pline(`${str} is reflected by your armor.`);
        return true;
    }
    return false;
}

// ========================================================================
// munstone — C ref: muse.c:2848
// ========================================================================
// Autotranslated from muse.c:2848
export async function munstone(mon, by_you) {
  let obj, tinok;
  if (resists_ston(mon)) return false;
  if (mon.meating || monHelpless(mon)) return false;
  mon.mstrategy &= ~STRAT_WAITFORU;
  tinok = mcould_eat_tin(mon);
  for (obj = mon.minvent; obj; obj = obj.nobj) {
    if (cures_stoning(mon, obj, tinok)) { await mon_consume_unstone(mon, obj, by_you, true); return true; }
  }
  return false;
}

// ========================================================================
// munslime — C ref: muse.c:2995
// ========================================================================
export async function munslime(mon, by_you, map, player) {
    const mptr = mon.data || mon.type || {};

    // slimeproof check
    if (mptr.mflags3 && (mptr.mflags3 & 0x00002000)) return false; // MH_SLIME
    if (mon.meating || monHelpless(mon)) return false;
    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITFORU;

    // Fire breath on self
    if (!mon.mcan && !mon.mspec_used
        && dmgtype_fromattack(mptr, 1, AT_BREA)) { // AD_FIRE = 1
        // Monster breathes fire on itself
        const vis = canseemon(mon, player);
        if (vis)
            await pline_mon(mon, `${x_monnam(mon, { article: 'the', capitalize: true })} starts turning green.`);
        mon_adjust_speed(mon, -4, null);
        if (vis)
            await pline_mon(mon, `${x_monnam(mon, { article: 'the', capitalize: true })} breathes fire on itself.`);
        if (!rn2(3)) mon.mspec_used = rn1(10, 5);
        return true;
    }

    // Check inventory for fire items
    if (!is_animal(mptr) && !mindless(mptr)) {
        for (const obj of (mon.minvent || [])) {
            if (cures_sliming(mon, obj)) {
                return await muse_unslime(mon, obj, null, by_you, map, player);
            }
        }
    }

    return false;
}

// C ref: cures_sliming(mon, obj) — can this object cure green slime?
// Autotranslated from muse.c:3210
export function cures_sliming(mon, obj) {
  if (obj.otyp === SCR_FIRE) return (haseyes(mon.data) && mon_can_see(mon) && !nohands(mon.data));
  if (obj.otyp === POT_OIL) return !nohands(mon.data);
  return ((obj.otyp === WAN_FIRE || (obj.otyp === FIRE_HORN && can_blow(mon))) && obj.spe > 0);
}

// C ref: muse_unslime — use fire item to cure slime
async function muse_unslime(mon, obj, trap, by_you, map, player) {
    const vis = canseemon(mon, player);
    if (vis) {
        const name = x_monnam(mon, { article: 'the', capitalize: true });
        await pline_mon(mon, `${name} starts turning green.`);
    }
    mon_adjust_speed(mon, -4, null);

    if (obj.otyp === WAN_FIRE || obj.otyp === FIRE_HORN) {
        if (obj.otyp === FIRE_HORN)
            await mplayhorn(mon, obj, true, map, player);
        else
            await mzapwand(mon, obj, true, map, player);
    } else if (obj.otyp === SCR_FIRE) {
        await mreadmsg(mon, obj, player);
        m_useup(mon, obj);
    } else if (obj.otyp === POT_OIL) {
        m_useup(mon, obj);
    }

    if (vis) {
        const name = x_monnam(mon, { article: 'the', capitalize: true });
        if (!DEADMONSTER(mon))
            await pline_mon(mon, `${name}'s slime is burned away!`);
    }
    return true;
}

// C ref: green_mon — is monster green?
function green_mon(mon) {
    const ptr = mon.data || mon.type || {};
    return (ptr.mcolor === 2 || ptr.mcolor === 10); // CLR_GREEN or CLR_BRIGHT_GREEN
}
