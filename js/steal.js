// steal.js -- Monster stealing mechanics
// cf. steal.c — leprechaun gold theft, nymph/monkey item theft, monster pickup/drop

import { rn1, rn2, rnd } from './rng.js';
import { GOLD_PIECE, COIN_CLASS, objectData } from './objects.js';
import { newsym, mdrop_obj } from './monutil.js';

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
    mon.flee = true;
    mon.fleetim = 0;
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

// ============================================================================
// remove_worn_item — cf. steal.c:213
// ============================================================================
// Remove a worn item from hero. Simplified: clears the appropriate equipment
// slot and owornmask. Full C version handles armor off effects, ring effects,
// amulet effects, ball/chain, etc.
export function remove_worn_item(player, obj) {
    if (!obj || !obj.owornmask) return;

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

// ============================================================================
// steal — cf. steal.c:343
// ============================================================================
// Main monster steal function (nymph/monkey vs hero).
// Simplified: picks a random non-gold item from hero inventory.
// Full C version has armor layering, seduction, multi-turn delays.
// Returns 1 if stolen (monster should flee), 0 if nothing stolen,
// -1 if monster died in attempt.
export async function steal(mon, player, display) {
    if (!mon || !player) return 0;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];

    // Filter eligible items (skip gold — nymphs/monkeys don't steal gold)
    const eligible = inv.filter((obj) => obj && obj.oclass !== COIN_CLASS);
    if (eligible.length === 0) {
        if (display) {
            await display.putstr_message(
                `${mon.type?.name || 'Something'} tries to rob you, but there is nothing to steal!`);
        }
        return 1; // let her flee
    }

    // C ref: steal.c:414-428 — weighted random selection (worn items 5x weight)
    let total = 0;
    for (const obj of eligible) {
        total += (obj.owornmask & 0x007F) ? 5 : 1; // W_ARMOR | W_ACCESSORY
    }
    let pick = rn2(total);
    let otmp = null;
    for (const obj of eligible) {
        pick -= (obj.owornmask & 0x007F) ? 5 : 1;
        if (pick < 0) { otmp = obj; break; }
    }
    if (!otmp) return 0;

    // Can't steal worn items easily if they're covered
    // Simplified: just redirect to outermost layer
    if (otmp === player.armor && player.cloak) otmp = player.cloak;
    if (otmp === player.shirt && player.cloak) otmp = player.cloak;
    else if (otmp === player.shirt && player.armor) otmp = player.armor;

    // Remove from worn slots if worn
    if (otmp.owornmask) {
        remove_worn_item(player, otmp);
    }

    // Remove from hero inventory
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);

    // Add to monster inventory
    if (!Array.isArray(mon.minvent)) mon.minvent = [];
    mon.minvent.push(otmp);

    if (display) {
        const monName = mon.type?.name || 'Something';
        const objName = objectData[otmp.otyp]?.name || 'something';
        await display.putstr_message(`${monName} stole ${objName}!`);
    }

    // Set mavenge flag
    mon.mavenge = true;

    // Monster flees after theft
    mon.flee = true;
    mon.fleetim = 0;

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
