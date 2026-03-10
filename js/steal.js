// steal.js -- Monster stealing mechanics
// cf. steal.c — leprechaun gold theft, nymph/monkey item theft, monster pickup/drop

import { rn1, rn2, rnd, pushRngLogEntry } from './rng.js';
import { GOLD_PIECE, COIN_CLASS } from './objects.js';
import { newsym } from './display.js';
import { addToMonsterInventory, stackobj } from './invent.js';
import { place_object, weight } from './mkobj.js';
import { extract_from_minvent, update_mon_extrinsics } from './worn.js';
import { doname } from './objnam.js';
import { Some_Monnam } from './do_name.js';
import {
    W_ARMOR, W_ACCESSORY, W_WEAPONS,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
    W_AMUL, W_WEP, W_SWAPWEP, W_QUIVER,
} from './const.js';
import { S_NYMPH } from './monsters.js';

function isWornForSteal(obj, player) {
    if (!obj || !player) return false;
    if ((obj.owornmask & (W_ARMOR | W_ACCESSORY)) !== 0) return true;
    return obj === player.armor
        || obj === player.cloak
        || obj === player.helmet
        || obj === player.gloves
        || obj === player.boots
        || obj === player.shield
        || obj === player.shirt
        || obj === player.leftRing
        || obj === player.rightRing
        || obj === player.amulet
        ;
}

// ============================================================================
// somegold — cf. steal.c:14
// ============================================================================
// Proportional subset of gold quantity. Uses rn1 for randomization.
export function somegold(lmoney) {
    let igold = Math.min(lmoney, 0x7FFFFFFF); // LARGEST_INT

    if (igold < 50)
        ; // all gold
    else if (igold < 100)
        igold = rn1(igold - 25 + 1, 25);
    else if (igold < 500)
        igold = rn1(igold - 50 + 1, 50);
    else if (igold < 1000)
        igold = rn1(igold - 100 + 1, 100);
    else if (igold < 5000)
        igold = rn1(igold - 500 + 1, 500);
    else if (igold < 10000)
        igold = rn1(igold - 1000 + 1, 1000);
    else
        igold = rn1(igold - 5000 + 1, 5000);

    return igold;
}

// ============================================================================
// findgold — cf. steal.c:45
// ============================================================================
// Find first gold object in an inventory array. Returns the object or null.
// (Differs from makemon.js findgold which returns boolean.)
// Autotranslated from steal.c:44
export function findgold(argchain) {
  let chain = argchain;
  while (chain && chain.otyp !== GOLD_PIECE) {
    chain = chain.nobj;
  }
  return chain;
}

// ============================================================================
// stealgold — cf. steal.c:58
// ============================================================================
// Leprechaun steals gold coins from hero. Simplified: no floor gold pickup,
// no steed, no teleportation (rloc). Handles hero inventory gold only.
export async function stealgold(mon, player, display) {
    if (!mon || !player) return;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];

    const ygold = findgold(inv);
    if (!ygold) {
        if (display) await display.putstr_message('Your purse feels lighter.');
        return;
    }

    const goldAmt = Number(ygold.quan || 0);
    if (goldAmt <= 0) return;

    const stolen = Math.min(somegold(goldAmt), goldAmt);
    if (stolen <= 0) return;

    if (stolen < goldAmt) {
        // Partial steal: reduce hero's gold
        ygold.quan = goldAmt - stolen;
    } else {
        // Steal all gold: remove from inventory
        const idx = inv.indexOf(ygold);
        if (idx >= 0) inv.splice(idx, 1);
    }

    // Add gold to monster inventory
    const monGold = findgold(mon.minvent || []);
    if (monGold) {
        monGold.quan = (monGold.quan || 0) + stolen;
    } else {
        if (!Array.isArray(mon.minvent)) mon.minvent = [];
        mon.minvent.push({
            otyp: GOLD_PIECE,
            oclass: COIN_CLASS,
            quan: stolen,
            ox: mon.mx,
            oy: mon.my,
        });
    }

    if (display) await display.putstr_message('Your purse feels lighter.');

    // C ref: steal.c:111-113 — leprechaun flees after theft
    mon.mflee = true;
    mon.mfleetim = 0;
}

// ============================================================================
// thiefdead — cf. steal.c:120
// ============================================================================
// Monster who was stealing from hero has just died. Clear multi-turn state.
export function thiefdead(_player) {
    // Multi-turn armor theft callbacks not fully ported; stub.
}

// ============================================================================
// unresponsive — cf. steal.c:133
// ============================================================================
// Check if hero is unresponsive to seduction attempts.
export function unresponsive(player) {
    if (!player) return false;
    if (player.unconscious || player.fainted) return true;
    if (player.frozen || player.paralyzed) return true;
    return false;
}

// C ref: steal.c:147 — unstolenarm()
// Called when armor takeoff completes but thief is gone.
export async function unstolenarm(player, display = null) {
    const gs = globalThis.gs || {};
    const stealoid = Number(gs.stealoid || 0);
    gs.stealoid = 0;
    if (!stealoid || !player) return 0;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    const obj = inv.find((it) => Number(it?.o_id || 0) === stealoid) || null;
    if (obj && display) await display.putstr_message(`You finish taking off your ${obj.name || 'armor'}.`);
    return 0;
}

// C ref: steal.c:165 — stealarm()
// Completes delayed armor theft after takeoff.
export async function stealarm(player, map, display = null) {
    const gs = globalThis.gs || {};
    const stealoid = Number(gs.stealoid || 0);
    const stealmid = Number(gs.stealmid || 0);
    if (!stealoid || !stealmid || !player) {
        gs.stealoid = 0;
        gs.stealmid = 0;
        return 0;
    }
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    const obj = inv.find((it) => Number(it?.o_id || 0) === stealoid) || null;
    const thief = (map?.monsters || []).find((m) => Number(m?.m_id || 0) === stealmid) || null;
    if (obj && thief) {
        const idx = inv.indexOf(obj);
        if (idx >= 0) inv.splice(idx, 1);
        if (!Array.isArray(thief.minvent)) thief.minvent = [];
        thief.minvent.push(obj);
        if (display) await display.putstr_message(`${Some_Monnam(thief)} steals ${doname(obj, player)}!`);
    }
    gs.stealoid = 0;
    gs.stealmid = 0;
    return 0;
}

// ============================================================================
// remove_worn_item — cf. steal.c:213
// ============================================================================
// Remove a worn item from hero. Simplified: clears the appropriate equipment
// slot and owornmask. Full C version handles armor off effects, ring effects,
// amulet effects, ball/chain, etc.
export function remove_worn_item(player, obj) {
    if (!obj) return;

    // Clear equipment slots
    if (obj === player.armor) player.armor = null;
    else if (obj === player.cloak) player.cloak = null;
    else if (obj === player.helmet) player.helmet = null;
    else if (obj === player.gloves) player.gloves = null;
    else if (obj === player.boots) player.boots = null;
    else if (obj === player.shield) player.shield = null;
    else if (obj === player.shirt) player.shirt = null;
    else if (obj === player.amulet) player.amulet = null;
    else if (obj === player.weapon) player.weapon = null;
    else if (obj === player.swapWeapon) player.swapWeapon = null;
    else if (obj === player.quiver) player.quiver = null;

    obj.owornmask = 0;
}

function inferred_wornmask(player, obj) {
    let mask = Number(obj?.owornmask || 0);
    if (!player || !obj) return mask;
    if (obj === player.armor) mask |= W_ARM;
    else if (obj === player.cloak) mask |= W_ARMC;
    else if (obj === player.helmet) mask |= W_ARMH;
    else if (obj === player.shield) mask |= W_ARMS;
    else if (obj === player.gloves) mask |= W_ARMG;
    else if (obj === player.boots) mask |= W_ARMF;
    else if (obj === player.shirt) mask |= W_ARMU;
    else if (obj === player.amulet) mask |= W_AMUL;
    else if (obj === player.weapon) mask |= W_WEP;
    else if (obj === player.swapWeapon) mask |= W_SWAPWEP;
    else if (obj === player.quiver) mask |= W_QUIVER;
    return mask;
}

function stripLeadArticle(text, replacement) {
    if (text.startsWith('the ')) return replacement + text.slice(4);
    if (text.startsWith('an ')) return replacement + text.slice(3);
    if (text.startsWith('a ')) return replacement + text.slice(2);
    return text;
}

function worn_item_removal_desc(obj, player) {
    // C ref: steal.c:worn_item_removal() doname()-massage logic.
    let desc = doname(obj, player);
    desc = stripLeadArticle(desc, 'your ');
    desc = desc.replace(' (being worn)', '');
    desc = desc.replace(' (alternate weapon; not wielded)', '');
    desc = desc.replace(' (on left hand)', ' (from left hand)');
    desc = desc.replace(' (on right hand)', ' (from right hand)');
    return desc;
}

async function worn_item_removal(mon, obj, player, display) {
    const desc = worn_item_removal_desc(obj, player);
    const mask = inferred_wornmask(player, obj);
    const verb = (mask & W_WEAPONS) ? 'disarms'
        : (mask & W_ACCESSORY) ? 'removes'
            : 'takes off';
    await display.putstr_message(`${Some_Monnam(mon)} ${verb} ${desc}.`);
    remove_worn_item(player, obj);
}

// ============================================================================
// steal — cf. steal.c:343
// ============================================================================
// Main monster steal function (nymph/monkey vs hero).
// Simplified: picks a random non-gold item from hero inventory.
// Full C version has armor layering, seduction, multi-turn delays.
// Returns 1 if stolen (monster should flee), 0 if nothing stolen,
// -1 if monster died in attempt.
export async function steal(mon, player, display, map = null) {
    if (!mon || !player) return 0;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];

    // Filter eligible items (skip gold — nymphs/monkeys don't steal gold)
    const eligible = inv.filter((obj) => obj && obj.oclass !== COIN_CLASS);
    if (eligible.length === 0) {
        if (display) {
            await display.putstr_message(
                `${mon.data?.mname || mon.type?.mname || 'Something'} tries to rob you, but there is nothing to steal!`);
        }
        return 1; // let her flee
    }

    // C ref: steal.c:414-428 — weighted random selection (worn items 5x weight)
    let total = 0;
    for (const obj of eligible) {
        total += isWornForSteal(obj, player) ? 5 : 1;
    }
    let pick = rn2(total);
    let otmp = null;
    for (const obj of eligible) {
        pick -= isWornForSteal(obj, player) ? 5 : 1;
        if (pick < 0) { otmp = obj; break; }
    }
    if (!otmp) return 0;

    // Can't steal worn items easily if they're covered
    // Simplified: just redirect to outermost layer
    if (otmp === player.armor && player.cloak) otmp = player.cloak;
    if (otmp === player.shirt && player.cloak) otmp = player.cloak;
    else if (otmp === player.shirt && player.armor) otmp = player.armor;

    const wasWorn = (inferred_wornmask(player, otmp) !== 0);
    if (wasWorn) {
        await worn_item_removal(mon, otmp, player, display);
    }

    // Remove from hero inventory
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);

    // Add to monster inventory (C uses mpickobj and emits pickup event logs).
    if (map) {
        mpickobj(mon, otmp, map);
    } else {
        if (!Array.isArray(mon.minvent)) mon.minvent = [];
        mon.minvent.push(otmp);
    }

    if (display) {
        // C ref: steal.c:600-604 — nymph theft after worn-item removal uses "She".
        const thiefName = (wasWorn && (mon?.data?.mlet ?? mon?.type?.mlet) === S_NYMPH) ? 'She' : Some_Monnam(mon);
        await display.putstr_message(`${thiefName} stole ${doname(otmp, player)}.`);
    }

    // Set mavenge flag
    mon.mavenge = true;

    // Monster flees after theft
    mon.mflee = true;
    mon.mfleetim = 0;

    return 1;
}

// ============================================================================
// stealamulet — cf. steal.c:689
// ============================================================================
// Wizard/nemesis steals quest artifact or Amulet from hero.
// Stub: quest artifacts and invocation items not yet implemented.
export function stealamulet(_mon, _player, _display) {
    // Not implemented: requires quest artifact tracking, freeinv, etc.
}

// ============================================================================
// maybe_absorb_item — cf. steal.c:772
// ============================================================================
// Mimic absorbs item poked at it. Stub.
export function maybe_absorb_item(_mon, _obj, _ochance, _achance) {
    // Not implemented: requires full object handling
}

// ============================================================================
// mdrop_special_objs — cf. steal.c:852
// ============================================================================
// Prevent special items (Amulet, invocation, quest artifacts) from leaving level.
// Stub: quest artifacts and invocation items not yet tracked.
export function mdrop_special_objs(_mon) {
    // Not implemented: requires obj_resists, is_quest_artifact
}

// ============================================================================
// relobj — cf. steal.c:875
// ============================================================================
// Release all objects from monster inventory to floor.
// Used by mondead via m_detach. Replaces inline loop in monutil.js.
export function relobj(mon, map, show, _is_pet) {
    if (!mon || !map) return;

    // C ref: steal.c:894 — drop all inventory via mdrop_obj
    // Pets would use droppables() to keep worn items; simplified: drop all.
    while (mon.minvent && mon.minvent.length > 0) {
        // Drop from end to match C's linked-list order
        const obj = mon.minvent[mon.minvent.length - 1];
        if (!obj) { mon.minvent.pop(); continue; }
        mdrop_obj(mon, obj, map);
    }

    if (show) {
        newsym(mon.mx, mon.my);
    }
}

// C ref: steal.c:619 mpickobj()
// Adds object to monster inventory with event logging.
// Callers are responsible for floor removal before calling this.
export function mpickobj(mon, obj) {
    pushRngLogEntry(`^pickup[${mon.mndx}@${mon.mx},${mon.my},${obj.otyp}]`);
    return addToMonsterInventory(mon, obj);
}

// C ref: steal.c:814 mdrop_obj()
// Removes object from monster inventory and places on floor with event logging.
// Uses extract_from_minvent for proper worn-item cleanup.
export function mdrop_obj(mon, obj, map) {
    // C ref: extract_from_minvent with do_extrinsics=FALSE, silently=TRUE
    const unwornmask = obj.owornmask || 0;
    extract_from_minvent(mon, obj, false, true);
    obj.ox = mon.mx;
    obj.oy = mon.my;
    // C ref: steal.c:838-841 — place_object(); stackobj(); then event_log(EV_DROP)
    place_object(obj, obj.ox, obj.oy, map);
    stackobj(obj, map);
    pushRngLogEntry(`^drop[${mon.mndx}@${mon.mx},${mon.my},${obj.otyp}]`);
    // C ref: steal.c:846-847 — update extrinsics after placement
    if (!mon.dead && unwornmask) {
        update_mon_extrinsics(mon, obj, false, true);
    }
}
