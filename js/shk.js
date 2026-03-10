// shk.js -- Shopkeeper interaction logic
// Mirrors shk.c from the C source.
// Handles shop pricing, billing, entry messages, shopkeeper queries,
// payment, selling, damage tracking, and shopkeeper movement hooks.

import { SHOPBASE, ROOMOFFSET, COLNO, ROWNO, DOOR, CORR, A_CHA, isok,
         COST_CONTENTS, COST_SINGLEOBJ, OBJ_ONBILL, OBJ_CONTAINED } from './const.js';
import { PM_TOURIST } from './monsters.js';
import { Role_if } from './role.js';
import { objectData, WEAPON_CLASS, ARMOR_CLASS, WAND_CLASS, POTION_CLASS, TOOL_CLASS,
         COIN_CLASS, GEM_CLASS, FOOD_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         BALL_CLASS, CHAIN_CLASS, RING_CLASS, AMULET_CLASS,
         POT_WATER, DUNCE_CAP,
         TALLOW_CANDLE, WAX_CANDLE,
         PICK_AXE, DWARVISH_MATTOCK, BOULDER, ROCK,
         MIRROR, LEASH,
         OIL_LAMP, MAGIC_LAMP, MAGIC_MARKER,
         BAG_OF_TRICKS, HORN_OF_PLENTY, CRYSTAL_BALL,
         BRASS_LANTERN, MAGIC_FLUTE, DRUM_OF_EARTHQUAKE,
         CAN_OF_GREASE, TINNING_KIT, EXPENSIVE_CAMERA,
         POT_OIL, CORPSE, EGG, TIN,
         FIRST_REAL_GEM, FIRST_GLASS_GEM,
         DIAMOND, RUBY, JACINTH, SAPPHIRE, BLACK_OPAL, EMERALD,
         CITRINE, AQUAMARINE, AMBER, TOPAZ, JET, OPAL, CHRYSOBERYL,
         AMETHYST, JASPER, FLUORITE, AGATE, JADE,
         STRANGE_OBJECT, GEMSTONE, GLASS,
         CANDELABRUM_OF_INVOCATION } from './objects.js';
import { m_next2u } from './muse.js';
import { isObjectNameKnown } from './o_init.js';
import { doname, next_ident, weight, Is_container, add_to_minv, dealloc_obj, bill_dummy_object } from './mkobj.js';
import { currency, o_on } from './invent.js';
import { Hello } from './player.js';
import { shtypes, shkname, Shknam, saleable, is_izchak } from './shknam.js';
import { rn2, rnd } from './rng.js';
import { pline, You, Your, You_hear, You_cant, pline_The, There,
         verbalize, Norep, impossible, livelog_printf } from './pline.js';
import { s_suffix, strchr, plur } from './hacklib.js';
import { helpless as monHelpless } from './mon.js';
import { newsym, canspotmon } from './display.js';
import { canseemon, y_monnam } from './mondata.js';
import { game as _gstate } from './gstate.js';
import { maybe_reset_pick } from './lock.js';
import { getpos_async } from './getpos.js';

// ============================================================
// Constants
// ============================================================

const BILLSZ = 200;
const REPAIR_DELAY = 5;
const MAXULEV = 30;
const CANDLESHOP = 25;
const LITTER_UPDATE = 0x80;

// Pay result codes (C: PAY_BUY, PAY_CANT, PAY_SKIP, PAY_BROKE)
const PAY_BUY = 1;
const PAY_CANT = 0;
const PAY_SKIP = -1;
const PAY_BROKE = -2;

// C ref: enum bill_use_mode in shk.c
const FullyUsedUp = 0;
const PartlyUsedUp = 1;
const PartlyIntact = 2;
const FullyIntact = 3;
const KnownContainer = 4;
const UndisclosedContainer = 5;

const LITTER_HORIZ = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
const LITTER_VERT = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
function horiz(i) {
    return LITTER_HORIZ[i] ?? 0;
}
function vert(i) {
    return LITTER_VERT[i] ?? 0;
}

// ============================================================
// Room / shop location helpers (existing, preserved)
// ============================================================

function roomMatchesType(map, roomno, typeWanted) {
    if (!Number.isInteger(roomno) || roomno < ROOMOFFSET) return false;
    if (!typeWanted) return true;
    const room = map.rooms?.[roomno - ROOMOFFSET];
    if (!room) return false;
    const rt = Number(room.rtype || 0);
    return rt === typeWanted || (typeWanted === SHOPBASE && rt >= SHOPBASE);
}

function in_rooms(map, x, y, typeWanted = 0) {
    const loc = map.at(x, y);
    if (!loc) return [];
    const out = [];
    const seen = new Set();
    const addRoom = (roomno) => {
        if (!roomMatchesType(map, roomno, typeWanted)) return;
        if (seen.has(roomno)) return;
        seen.add(roomno);
        out.push(roomno);
    };

    const roomno = Number(loc.roomno || 0);
    if (roomno >= ROOMOFFSET) {
        addRoom(roomno);
        return out;
    }

    if (roomno === 1 || roomno === 2) {
        const step = (roomno === 1) ? 2 : 1;
        const minX = Math.max(0, x - 1);
        const maxX = Math.min(COLNO - 1, x + 1);
        const minY = Math.max(0, y - 1);
        const maxY = Math.min(ROWNO - 1, y + 1);
        for (let xx = minX; xx <= maxX; xx += step) {
            for (let yy = minY; yy <= maxY; yy += step) {
                const nloc = map.at(xx, yy);
                addRoom(Number(nloc?.roomno || 0));
            }
        }
    }

    if (typeWanted === SHOPBASE && out.length === 0 && (loc.typ === DOOR || loc.typ === CORR)) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nloc = map.at(x + dx, y + dy);
                addRoom(Number(nloc?.roomno || 0));
            }
        }
    }

    return out;
}

// C ref: shk.c inside_shop() -- x,y is strictly inside shop
function insideShop(map, x, y) {
    const loc = map.at(x, y);
    const roomno = Number(loc?.roomno || 0);
    if (roomno < ROOMOFFSET || !!loc?.edge) return 0;
    if (!roomMatchesType(map, roomno, SHOPBASE)) return 0;
    return roomno;
}

// C ref: shk.c shop_keeper() -- return the shopkeeper for the given room number
function shop_keeper(map, rmno) {
    if (!rmno || rmno < ROOMOFFSET) return null;
    const room = map.rooms?.[rmno - ROOMOFFSET];
    if (!room) return null;
    // Look for the resident shopkeeper
    if (room.resident && !room.resident.dead && room.resident.isshk) {
        return room.resident;
    }
    // Fallback: search monster list
    return findShopkeeper(map, rmno);
}

function findShopkeeper(map, roomno) {
    return (map.monsters || []).find((m) =>
        m && !m.dead && m.isshk && Number(m.shoproom || 0) === roomno
    ) || null;
}

// ============================================================
// Name/string helpers
// ============================================================

function shopkeeperName(shkp) {
    return shkname(shkp);
}

function capitalizeWord(text) {
    const s = String(text || '');
    if (!s) return s;
    return s[0].toUpperCase() + s.slice(1);
}

function sSuffix(name) {
    return s_suffix(name || 'shopkeeper');
}


// C ref: noit_mhe/noit_mhis/noit_mhim -- pronoun helpers
function mhe(shkp) {
    return shkp?.female ? 'she' : 'he';
}

function mhis(shkp) {
    return shkp?.female ? 'her' : 'his';
}

function mhim(shkp) {
    return shkp?.female ? 'her' : 'him';
}

// C ref: muteshk(shkp) -- check if shk is unable to speak
function muteshk(shkp) {
    const mdat = shkp?.data || shkp?.type;
    return monHelpless(shkp) || (mdat?.msound !== undefined && mdat.msound <= 1);
}


// ============================================================
// Pricing helpers
// ============================================================

function roundScaled(value, multiplier, divisor) {
    let out = value * multiplier;
    if (divisor > 1) {
        out = Math.floor((out * 10) / divisor);
        out = Math.floor((out + 5) / 10);
    }
    return out;
}

// C ref: shk.c getprice() -- base price of object
function getprice_base(obj, shk_buying = false) {
    const od = objectData[obj.otyp] || {};
    let tmp = Number(od.oc_cost || 0);

    // Artifact pricing handled via base cost * 4 in get_cost
    // C ref: if (obj->oartifact) tmp = arti_cost(obj);
    // We don't have arti_cost, so just use base cost for artifacts

    switch (obj.oclass) {
    case FOOD_CLASS:
        // C ref: corpsenm_price_adj + hunger multiplier + oeaten check
        tmp += corpsenm_price_adj(obj);
        if (obj.oeaten) tmp = 0;
        break;
    case WAND_CLASS:
        if (Number(obj.spe || 0) === -1) tmp = 0;
        break;
    case POTION_CLASS:
        if (obj.otyp === POT_WATER && !obj.blessed && !obj.cursed) tmp = 0;
        break;
    case ARMOR_CLASS:
    case WEAPON_CLASS:
        if (Number(obj.spe || 0) > 0)
            tmp += 10 * Number(obj.spe || 0);
        break;
    case TOOL_CLASS:
        if (Is_candle(obj)
            && Number(obj.age || 0) < 20 * Number(od.oc_cost || 0))
            tmp = Math.floor(tmp / 2);
        break;
    }
    return tmp;
}

// C ref: Is_candle macro
function Is_candle(obj) {
    return obj.otyp === TALLOW_CANDLE || obj.otyp === WAX_CANDLE;
}

// C ref: shk.c corpsenm_price_adj() -- adjust price for corpse/tin/egg
// Autotranslated from shk.c:4209
export function corpsenm_price_adj(obj) {
  let val = 0;
  if ((obj.otyp === TIN || obj.otyp === EGG || obj.otyp === CORPSE) && ismnum(obj.corpsenm)) {
    let i, tmp = 1, ptr =  mons[obj.corpsenm];
    // C ref: shk.c corpsenm_price_adj() — struct { trinsic, cost } icost[]
    let icost = [ { trinsic: FIRE_RES, cost: 2 }, { trinsic: SLEEP_RES, cost: 3 }, { trinsic: COLD_RES, cost: 2 }, { trinsic: DISINT_RES, cost: 5 }, { trinsic: SHOCK_RES, cost: 4 }, { trinsic: POISON_RES, cost: 2 }, { trinsic: ACID_RES, cost: 1 }, { trinsic: STONE_RES, cost: 3 }, { trinsic: TELEPORT, cost: 2 }, { trinsic: TELEPORT_CONTROL, cost: 3 }, { trinsic: TELEPAT, cost: 5 } ];
    for (i = 0; i < icost.length; i++) {
      if (intrinsic_possible(icost[i].trinsic, ptr)) {
        tmp += icost[i].cost;
      }
    }
    if (unique_corpstat(ptr)) {
      tmp += 50;
    }
    val = Math.max(1, ((ptr.mlevel - 1) * 2));
    if (obj.otyp === CORPSE) {
      val += Math.max(1, Math.floor(ptr.cnutrit / 30));
    }
    val = val * tmp;
  }
  return val;
}

// C ref: shk.c get_pricing_units() -- for globs, price by weight
export function get_pricing_units(obj) {
    let units = Number(obj.quan || 1);
    if (obj.globby) {
        const unit_weight = (objectData[obj.otyp] || {}).wt || 0;
        const wt = Number(obj.owt || 0) || weight(obj);
        if (unit_weight)
            units = Math.floor((wt + unit_weight - 1) / unit_weight);
    }
    return units;
}

// C ref: shk.c:2805 oid_price_adjustment()
export function oid_price_adjustment(obj, oid) {
    const od = objectData[obj.otyp] || {};
    const nameKnown = isObjectNameKnown(obj.otyp);
    if (!(obj.dknown && nameKnown)
        && (obj.oclass !== GEM_CLASS || (od.oc_material || 0) !== GLASS)) {
        return ((oid % 4) === 0) ? 1 : 0;
    }
    return 0;
}

// C ref: shk.c get_cost() -- full price calculation for buying
function get_cost(obj, shkp) {
    let tmp = getprice_base(obj, false);
    let multiplier = 1;
    let divisor = 1;

    if (!tmp) tmp = 5;

    const od = objectData[obj.otyp] || {};
    const nameKnown = isObjectNameKnown(obj.otyp);

    // Shopkeeper may notice if player isn't knowledgeable
    if (!obj.dknown || !nameKnown) {
        if (obj.oclass === GEM_CLASS && (od.oc_material || 0) === GLASS) {
            // Glass gems get priced as if they were real gems
            // C ref: pseudorand pricing for glass gems
            const glassIdx = obj.otyp - FIRST_GLASS_GEM;
            const realGems = [DIAMOND, SAPPHIRE, RUBY, AMBER, JACINTH, CITRINE, BLACK_OPAL, EMERALD, AMETHYST];
            const fakeGems = [OPAL, AQUAMARINE, JASPER, TOPAZ, AGATE, CHRYSOBERYL, JET, JADE, FLUORITE];
            if (glassIdx >= 0 && glassIdx < 9) {
                const oidx = Number(obj.o_id || 0);
                const useFake = (oidx + glassIdx) % 4 === 0;
                const i = (useFake ? fakeGems[glassIdx] : realGems[glassIdx]) || realGems[0];
                tmp = Number((objectData[i] || {}).oc_cost || 0);
            }
        } else if (oid_price_adjustment(obj, Number(obj.o_id || 0)) > 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    // Dunce cap or Tourist penalty
    // C ref: player.helmet && player.helmet->otyp == DUNCE_CAP
    // We check via the shkp.player reference or a global approach
    // For now, just handle the basic multiplier/divisor as in getCost
    // (The existing getCost function already handles player attributes;
    //  this get_cost is the internal C-faithful version used for billing)

    if (obj.oartifact)
        tmp *= 4;

    // Apply multiplier/divisor
    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.floor(tmp / divisor);
        tmp += 5;
        tmp = Math.floor(tmp / 10);
    }

    if (tmp <= 0) tmp = 1;

    // Anger surcharge
    if (shkp && shkp.surcharge)
        tmp += Math.floor((tmp + 2) / 3);

    return tmp;
}

// Existing getCost preserved for floor-object pricing with player CHA
function getCost(obj, player, shkp) {
    let tmp = getprice_base(obj);
    let multiplier = 1;
    let divisor = 1;
    if (!tmp) tmp = 5;

    const dknown = !!obj.dknown || !!obj.known;
    const nameKnown = isObjectNameKnown(obj.otyp);
    if (!(dknown && nameKnown) && obj.oclass !== GEM_CLASS) {
        if ((Number(obj.o_id || 0) % 4) === 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    if (player?.helmet?.otyp === DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if (player?.roleMnum === PM_TOURIST && Number(player.ulevel || 1) < 15) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = Number(player?.attributes?.[A_CHA] || 10);
    if (cha > 18) {
        divisor *= 2;
    } else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) {
        multiplier *= 2;
    } else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp = roundScaled(tmp, multiplier, divisor);
    if (tmp <= 0) tmp = 1;
    if (shkp?.surcharge) {
        tmp += Math.floor((tmp + 2) / 3);
    }
    return tmp;
}

// C ref: shk.c set_cost() -- price shk will pay when buying (selling to player)
// Autotranslated from shk.c:3088
export function set_cost(obj, shkp, player) {
  let tmp, unit_price = getprice(obj, true), multiplier = 1, divisor = 1;
  tmp = get_pricing_units(obj) * unit_price;
  if (player.helmet && player.helmet.otyp === DUNCE_CAP) {
    divisor *= 3;
  }
  else if ((Role_if(player, PM_TOURIST) && player.ulevel < (MAXULEV / 2)) || (player.shirt && !player.armor && !player.cloak)) {
    divisor *= 3;
  }
  else {
    divisor *= 2;
  }
  if (!obj.dknown || !objectData[obj.otyp].oc_name_known) {
    if (obj.oclass === GEM_CLASS) {
      if (objectData[obj.otyp].oc_material === GEMSTONE || objectData[obj.otyp].oc_material === GLASS) {
        tmp = ((obj.otyp - FIRST_REAL_GEM) % (6 - shkp.m_id % 3));
        tmp = (tmp + 3) * obj.quan;
        divisor = 1;
      }
    }
    else if (tmp > 1 && !(shkp.m_id % 4)) multiplier *= 3, divisor *= 4;
  }
  if (tmp >= 1) {
    tmp *= multiplier;
    if (divisor > 1) {
      tmp *= 10;
      tmp /= divisor;
      tmp += 5;
      tmp /= 10;
    }
    if (tmp < 1) tmp = 1;
  }
  return tmp;
}

// ============================================================
// Bill management (C: onbill, next_shkp, addupbill, etc.)
// ============================================================

// C ref: shk.c onbill() -- find bill entry for object
// Autotranslated from shk.c:1076
export function onbill(obj, shkp, silent) {
  if (shkp) {
    const eshkp = ESHK(shkp);
    for (let i = 0; i < eshkp.billct; i++) {
      const bp = eshkp.bill[i];
      if (bp.bo_id === obj.o_id) {
        if (!obj.unpaid) impossible("onbill: paid obj on bill?");
        return bp;
      }
    }
  }
  if (obj.unpaid && !silent) impossible("onbill: unpaid obj %s?", !shkp ? "without shopkeeper" : "not on shk's bill");
  return  0;
}

// C ref: shk.c onshopbill() -- boolean wrapper for onbill
export function onshopbill(obj, shkp, silent) {
    return !!onbill(obj, shkp, silent);
}

// C ref: shk.c next_shkp() -- iterate shopkeepers
// Autotranslated from shk.c:214
export function next_shkp(shkp, withbill) {
  for (shkp; shkp = shkp.nmon; ) {
    if (DEADMONSTER(shkp)) {
      continue;
    }
    if (shkp.isshk && (ESHK(shkp).billct || !withbill)) {
      break;
    }
  }
  if (shkp) {
    if (ANGRY(shkp)) { if (!ESHK(shkp).surcharge) rile_shk(shkp); }
  }
  return shkp;
}

// C ref: shk.c addupbill() -- total of all items on bill
// Autotranslated from shk.c:436
export function addupbill(shkp) {
  const eshkp = ESHK(shkp);
  let total = 0;
  for (let i = 0; i < eshkp.billct; i++) {
    total += eshkp.bill[i].price * eshkp.bill[i].bquan;
  }
  return total;
}

// C ref: shk.c shop_debt() -- total debt to shopkeeper
// Autotranslated from shk.c:930
export function shop_debt(eshkp) {
  let debt = eshkp.debit;
  for (let i = 0; i < eshkp.billct; i++) {
    debt += eshkp.bill[i].price * eshkp.bill[i].bquan;
  }
  return debt;
}

// C ref: shk.c check_credit() -- deduct cost from credit
// Autotranslated from shk.c:1218
export async function check_credit(tmp, shkp) {
  let credit = ESHK(shkp).credit;
  if (credit === 0) {
  }
  else if (credit >= tmp) {
    await pline_The("price is deducted from your credit.");
    ESHK(shkp).credit -= tmp;
    tmp = 0;
  }
  else {
    await pline_The("price is partially covered by your credit.");
    ESHK(shkp).credit = 0;
    tmp -= credit;
  }
  return tmp;
}

// C ref: shk.c pay() -- make payment to shopkeeper
// Autotranslated from shk.c:1237
export async function pay(tmp, shkp, game) {
  let robbed = ESHK(shkp).robbed;
  let balance = ((tmp <= 0) ? tmp : await check_credit(tmp, shkp));
  if (balance > 0) money2mon(shkp, balance);
  else if (balance < 0) money2u(shkp, -balance);
  game.disp.botl = true;
  if (robbed) {
    robbed -= tmp;
    if (robbed < 0) robbed = 0;
    ESHK(shkp).robbed = robbed;
  }
}

// ============================================================
// Money transfer (C: money2mon, money2u)
// ============================================================

// C ref: shk.c money2mon() -- transfer gold from player to monster
export function money2mon(mon, amount) {
    if (amount <= 0) {
        impossible("%s payment in money2mon!", amount ? "negative" : "zero");
        return 0;
    }
    const player = _gstate?.player || null;
    if (player) {
        player.gold = Math.max(0, Number(player.gold || 0) - amount);
    }
    if (mon) {
        mon.mgold = (mon.mgold || 0) + amount;
    }
    return amount;
}

// C ref: shk.c money2u() -- transfer gold from monster to player
export function money2u(mon, amount) {
    if (amount <= 0) {
        impossible("%s payment in money2u!", amount ? "negative" : "zero");
        return;
    }
    if (mon) {
        mon.mgold = Math.max(0, (mon.mgold || 0) - amount);
    }
    const player = _gstate?.player || null;
    if (player) {
        player.gold = Number(player.gold || 0) + amount;
    }
}

// ============================================================
// Bill manipulation (C: add_one_tobill, sub_one_frombill, etc.)
// ============================================================

// Ensure bill array exists on shopkeeper
function ensureBill(shkp) {
    if (!shkp.bill) shkp.bill = [];
    if (shkp.billct === undefined) shkp.billct = 0;
}

// C ref: shk.c add_one_tobill()
// Autotranslated from shk.c:3249
export async function add_one_tobill(obj, dummy, shkp, player) {
  let eshkp, bp, bct, unbilled = false;
  eshkp = ESHK(shkp);
  if (!eshkp.bill_p) eshkp.bill_p = eshkp.bill; // C: bill_p = &bill[0] (pointer to array start)
  if (!billable( shkp, obj, player.ushops, true)) { unbilled = true; }
  else if (eshkp.billct === BILLSZ) { await You("got that for free!"); unbilled = true; }
  if (unbilled) { if (obj.where === OBJ_FREE) dealloc_obj(obj); return; }
  bct = eshkp.billct;
  bp = eshkp.bill_p[bct];
  bp.bo_id = obj.o_id;
  bp.bquan = obj.quan;
  if (dummy) { bp.useup = true; add_to_billobjs(obj); }
  else {
    bp.useup = false;
  }
  bp.price = get_cost(obj, shkp);
  if (obj.globby) {
    bp.price *= get_pricing_units(obj);
    newomid(obj);
    if (obj.oextra) obj.oextra.omid = obj.owt;
  }
  eshkp.billct++;
  obj.unpaid = 1;
}

// C ref: shk.c sub_one_frombill()
// Autotranslated from shk.c:3597
export function sub_one_frombill(obj, shkp) {
  let bp, eshkp;
  if ((bp = onbill(obj, shkp, false)) != null) {
    let otmp;
    obj.unpaid = 0;
    if (bp.bquan > obj.quan) {
      otmp = { ...obj }; // C: *otmp = *obj (struct copy)
      otmp.oextra =  0;
      bp.bo_id = otmp.o_id = next_ident();
      otmp.where = OBJ_FREE;
      otmp.quan = (bp.bquan -= obj.quan);
      otmp.owt = 0;
      bp.useup = true;
      add_to_billobjs(otmp);
      return;
    }
    eshkp = ESHK(shkp);
    eshkp.billct--;
    Object.assign(bp, eshkp.bill[eshkp.billct]); // C: *bp = bill_p[billct] (compact array)
    return;
  }
  else if (obj.unpaid) {
    impossible("sub_one_frombill: unpaid object not on bill");
    obj.unpaid = 0;
  }
}

// C ref: shk.c addtobill() -- add object to shop bill
export function addtobill(obj, ininv, dummy, silent) {
    void ininv;
    void silent;
    if (obj.oclass === COIN_CLASS) return;
    if (obj.no_charge) {
        obj.no_charge = 0;
        return;
    }
    const map = _gstate?.map;
    const player = _gstate?.player;
    if (!map || !player) {
        obj.unpaid = 1;
        return;
    }
    const x = Number.isFinite(obj.ox) ? obj.ox : Number(player.x || 0);
    const y = Number.isFinite(obj.oy) ? obj.oy : Number(player.y || 0);
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (!rooms.length) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp) return;
    // add_one_tobill is async but mostly synchronous in current runtime; keep compatibility.
    void add_one_tobill(obj, !!dummy, shkp, player);
}

// C ref: shk.c splitbill() -- split bill entry when stack is split
export function splitbill(obj, otmp, map) {
    // obj is original, otmp has been split off
    if (!map) return;
    // Find shopkeeper
    const rooms = in_rooms(map, obj.ox || 0, obj.oy || 0, SHOPBASE);
    if (rooms.length === 0) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp) return;

    const bp = onbill(obj, shkp, false);
    if (!bp) {
        impossible("splitbill: not on bill?");
        return;
    }
    if (bp.bquan < Number(otmp.quan || 1)) {
        impossible("Negative quantity on bill??");
    }
    if (bp.bquan === Number(otmp.quan || 1)) {
        impossible("Zero quantity on bill??");
    }
    bp.bquan -= Number(otmp.quan || 1);

    ensureBill(shkp);
    if (shkp.billct >= BILLSZ) {
        otmp.unpaid = 0;
    } else {
        const newbp = {
            bo_id: otmp.o_id,
            bquan: Number(otmp.quan || 1),
            useup: false,
            price: bp.price,
        };
        shkp.bill[shkp.billct] = newbp;
        shkp.billct++;
    }
}

// C ref: shk.c subfrombill() -- recursive removal from bill
export function subfrombill(obj, shkp) {
    sub_one_frombill(obj, shkp);

    if (obj.cobj) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if (otmp.oclass === COIN_CLASS) continue;
            if (otmp.cobj) {
                subfrombill(otmp, shkp);
            } else {
                sub_one_frombill(otmp, shkp);
            }
        }
    }
}

// ============================================================
// Clear unpaid/no_charge (C: setpaid, clear_unpaid, clear_no_charge)
// ============================================================

// C ref: shk.c clear_unpaid_obj()
// Autotranslated from shk.c:308
export function clear_unpaid_obj(shkp, otmp) {
  if (Has_contents(otmp)) clear_unpaid(shkp, otmp.cobj);
  if (onbill(otmp, shkp, true)) otmp.unpaid = 0;
}

// C ref: shk.c clear_unpaid()
// Autotranslated from shk.c:318
export function clear_unpaid(shkp, list) {
  while (list) {
    clear_unpaid_obj(shkp, list);
    list = list.nobj;
  }
}

// C ref: shk.c clear_no_charge_obj()
function clear_no_charge_obj(shkp, otmp) {
    if (otmp.cobj)
        clear_no_charge(shkp, otmp.cobj);
    if (otmp.no_charge) {
        if (!shkp) {
            otmp.no_charge = 0;
        } else {
            otmp.no_charge = 0;
        }
    }
}

// C ref: shk.c clear_no_charge()
// Autotranslated from shk.c:376
export function clear_no_charge(shkp, list) {
  while (list) {
    clear_no_charge_obj(shkp, list);
    list = list.nobj;
  }
}

// C ref: shk.c setpaid() -- clear all unpaid objects and reset bill
export function setpaid(shkp) {
    const walkObjects = (root, fn) => {
        if (!root) return;
        if (Array.isArray(root)) {
            for (const obj of root) walkObjects(obj, fn);
            return;
        }
        fn(root);
        if (root.cobj) walkObjects(root.cobj, fn);
        if (root.nobj) walkObjects(root.nobj, fn);
    };
    const map = _gstate?.map || null;
    const player = _gstate?.player || null;
    walkObjects(player?.inventory || [], (obj) => {
        if (obj && obj.unpaid) obj.unpaid = 0;
        if (obj && obj.no_charge) obj.no_charge = 0;
    });
    walkObjects(map?.objects || [], (obj) => {
        if (obj && obj.unpaid) obj.unpaid = 0;
        if (obj && obj.no_charge) obj.no_charge = 0;
    });
    for (const mon of (map?.monsters || [])) {
        walkObjects(mon?.minvent || [], (obj) => {
            if (obj && obj.unpaid) obj.unpaid = 0;
            if (obj && obj.no_charge) obj.no_charge = 0;
        });
    }

    if (shkp) {
        shkp.billct = 0;
        shkp.credit = 0;
        shkp.debit = 0;
        shkp.loan = 0;
        if (shkp.bill) shkp.bill.length = 0;
    }
}

// ============================================================
// Shop entry/exit (C: inhishop, u_entered_shop, u_left_shop, etc.)
// ============================================================

// C ref: shk.c inhishop() -- is shopkeeper in his own shop?
export function inhishop(shkp, map) {
    if (!shkp || !shkp.isshk) return false;
    if (!map) return false;
    const roomno = Number(shkp.shoproom || 0);
    if (roomno < ROOMOFFSET) return false;
    const rooms = in_rooms(map, shkp.mx, shkp.my, SHOPBASE);
    return rooms.includes(roomno);
}

// ============================================================
// Shopkeeper state changes (C: rile_shk, pacify_shk, rouse_shk, etc.)
// ============================================================

// C ref: shk.c rile_shk() -- make shopkeeper angry, add surcharge
export function rile_shk(shkp) {
    shkp.mpeaceful = false;
    shkp.peaceful = false;
    if (!shkp.surcharge) {
        shkp.surcharge = true;
        const bill = shkp.bill || [];
        for (let i = 0; i < (shkp.billct || 0); i++) {
            const bp = bill[i];
            if (bp) {
                const surcharge = Math.floor((bp.price + 2) / 3);
                bp.price += surcharge;
            }
        }
    }
}

// C ref: shk.c pacify_shk() -- make shopkeeper peaceful, optionally remove surcharge
// Autotranslated from shk.c:1284
export function pacify_shk(shkp, clear_surcharge) {
  shkp.mpeaceful = true; // C: NOTANGRY(shkp) = true
  if (clear_surcharge && ESHK(shkp).surcharge) {
    const eshkp = ESHK(shkp);
    eshkp.surcharge = false;
    for (let i = 0; i < eshkp.billct; i++) {
      let reduction = Math.floor((eshkp.bill[i].price + 3) / 4);
      eshkp.bill[i].price -= reduction;
    }
  }
}

// C ref: shk.c rouse_shk() -- wake up shopkeeper
// Autotranslated from shk.c:1321
export async function rouse_shk(shkp, verbosely) {
  if (monHelpless(shkp)) {
    if (verbosely && canspotmon(shkp)) await pline("%s %s.", Shknam(shkp), shkp.msleeping ? "wakes up" : "can move again");
    shkp.msleeping = 0;
    shkp.sleeping = false;
    shkp.mfrozen = 0;
    shkp.mcanmove = 1;
  }
}

// C ref: shk.c make_happy_shk()
export async function make_happy_shk(shkp, silentkops, map) {
    const wasmad = !shkp.mpeaceful;
    pacify_shk(shkp, false);
    shkp.following = 0;
    shkp.robbed = 0;

    if (map && !inhishop(shkp, map)) {
        // Try to send shk home
        home_shk(shkp, false, map);
        if (canspotmon(shkp))
            await pline("%s returns to %s shop.", Shknam(shkp), mhis(shkp));
    } else if (wasmad) {
        await pline("%s calms down.", Shknam(shkp));
    }

    make_happy_shoppers(silentkops, map);
}

// C ref: shk.c make_happy_shoppers()
export function make_happy_shoppers(silentkops, map) {
    if (map && !angry_shk_exists(map)) {
        kops_gone(silentkops);
    }
}

// C ref: shk.c make_angry_shk()
export async function make_angry_shk(shkp, ox, oy) {
    // All pending shop transactions become "past due"
    if ((shkp.billct || 0) > 0 || (shkp.debit || 0) > 0
        || (shkp.loan || 0) > 0 || (shkp.credit || 0) > 0) {
        shkp.robbed = (shkp.robbed || 0)
            + addupbill(shkp) + (shkp.debit || 0) + (shkp.loan || 0);
        shkp.robbed -= (shkp.credit || 0);
        if (shkp.robbed < 0) shkp.robbed = 0;
        setpaid(shkp);
    }

    await pline("%s %s!", Shknam(shkp),
          shkp.mpeaceful ? "gets angry" : "is furious");
    hot_pursuit(shkp);
}

// C ref: shk.c hot_pursuit()
export function hot_pursuit(shkp) {
    if (!shkp.isshk) return;
    rile_shk(shkp);
    shkp.following = 1;
    const map = _gstate?.map || null;
    for (const obj of (map?.objects || [])) {
        if (obj && obj.no_charge) obj.no_charge = 0;
    }
}

// C ref: shk.c home_shk()
export function home_shk(shkp, killkops, map) {
    const x = shkp.shk?.x;
    const y = shkp.shk?.y;
    if (x !== undefined && y !== undefined) {
        // C uses mnearto semantics; JS fallback is direct relocation.
        if (map) {
            const _omx = shkp.mx, _omy = shkp.my;
            map.removeMonster?.(shkp);
            shkp.mx = x;
            shkp.my = y;
            map.placeMonster?.(shkp, x, y);
            newsym(_omx, _omy);
            newsym(x, y);
        }
    }
    if (killkops) kops_gone(true);
    after_shk_move(shkp, map);
}

// C ref: shk.c angry_shk_exists()
export function angry_shk_exists(map) {
    const monsters = map?.monsters || [];
    for (let i = 0; i < monsters.length; i++) {
        const m = monsters[i];
        if (m && !m.dead && m.isshk && !m.mpeaceful)
            return true;
    }
    return false;
}

// ============================================================
// Shopkeeper lifecycle (C: shkgone, replshk, set_residency)
// ============================================================

// C ref: shk.c shkgone() -- called when shopkeeper dies
export function shkgone(mtmp, map) {
    if (!mtmp || !map) return;
    const roomno = Number(mtmp.shoproom || 0);
    if (roomno < ROOMOFFSET) return;
    const room = map.rooms?.[roomno - ROOMOFFSET];
    if (!room) return;

    // Remove residency
    if (room.resident === mtmp) {
        room.resident = null;
    }

    // Clear no_charge on all objects in shop
    if (room.lx !== undefined && room.hx !== undefined) {
        for (let sx = room.lx; sx <= room.hx; sx++) {
            for (let sy = room.ly; sy <= room.hy; sy++) {
                const objs = map.objectsAt?.(sx, sy) || [];
                for (const otmp of objs) {
                    if (otmp) otmp.no_charge = 0;
                }
            }
        }
    }

    // Clear the bill
    setpaid(mtmp);
}

// C ref: shk.c replshk() -- replace shopkeeper (e.g., when polymorphed)
export function replshk(mtmp, mtmp2, map) {
    if (!map) return;
    const roomno = Number(mtmp2.shoproom || 0);
    if (roomno >= ROOMOFFSET) {
        const room = map.rooms?.[roomno - ROOMOFFSET];
        if (room) room.resident = mtmp2;
    }
}

// C ref: shk.c set_residency()
export function set_residency(shkp, zero_out, map) {
    if (!map) return;
    const roomno = Number(shkp.shoproom || 0);
    if (roomno >= ROOMOFFSET) {
        const room = map.rooms?.[roomno - ROOMOFFSET];
        if (room) room.resident = zero_out ? null : shkp;
    }
}

// ============================================================
// Predicates (C: shk_impaired, costly_spot, costly_adjacent, etc.)
// ============================================================

// C ref: shk.c shk_impaired()
export function shk_impaired(shkp, map) {
    if (!shkp || !shkp.isshk) return true;
    if (map && !inhishop(shkp, map)) return true;
    if (monHelpless(shkp) || shkp.following) return true;
    return false;
}

// C ref: shk.c costly_spot() -- is this a spot where shop goods are costly?
export function costly_spot(x, y, map) {
    if (!map) return false;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return false;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return false;
    const shoproom = insideShop(map, x, y);
    if (!shoproom) return false;
    // Exclude the shopkeeper's "free spot"
    if (shkp.shk && shkp.shk.x === x && shkp.shk.y === y) return false;
    return true;
}

// C ref: shk.c costly_adjacent() -- is spot on shop boundary?
export function costly_adjacent(shkp, x, y, map) {
    if (!shkp || !shkp.isshk) return false;
    if (map && !inhishop(shkp, map)) return false;
    if (!isok(x, y)) return false;
    const loc = map?.at(x, y);
    if (loc?.edge) return true;
    if (shkp.shk && shkp.shk.x === x && shkp.shk.y === y) return true;
    return false;
}

// C ref: shk.c shop_object() -- get first non-gold object at shop location
export function shop_object(x, y, map) {
    if (!map) return null;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return null;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return null;

    const objs = map.objectsAt?.(x, y) || [];
    let otmp = null;
    for (const obj of objs) {
        if (obj && obj.oclass !== COIN_CLASS) {
            otmp = obj;
            break;
        }
    }
    if (!otmp) return null;
    if (!costly_spot(x, y, map)) return null;
    if (!shkp.mpeaceful) return null;
    if (muteshk(shkp)) return null;
    return otmp;
}

// C ref: shk.c billable() -- does shopkeeper think item belongs to shop?
export function billable(shkp, obj, roomno, reset_nocharge, map) {
    if (!shkp) {
        if (!roomno) return false;
        shkp = map ? shop_keeper(map, roomno) : null;
        if (!shkp) return false;
        if (map && !inhishop(shkp, map)) return false;
    }
    // Already on bill?
    if (onbill(obj, shkp, true)) return false;
    // Eaten food?
    if (obj.oclass === FOOD_CLASS && obj.oeaten) return false;
    // No-charge items
    if (obj.no_charge) {
        if (reset_nocharge && obj.oclass !== COIN_CLASS) {
            obj.no_charge = 0;
        }
        return false;
    }
    return true;
}

// C ref: shk.c is_unpaid() -- check if object or contents are unpaid
export function is_unpaid(obj) {
    if (obj.unpaid) return true;
    if (obj.cobj) {
        for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
            if (is_unpaid(otmp)) return true;
        }
    }
    return false;
}

// C ref: shk.c is_fshk() -- is this a following shopkeeper?
export function is_fshk(mtmp) {
    return !!(mtmp?.isshk && mtmp.following);
}

// ============================================================
// Stolen value (C: stolen_value)
// ============================================================

// C ref: shk.c stolen_value()
export async function stolen_value(obj, x, y, peaceful, silent, map) {
    if (!map) return 0;

    // Find shopkeeper
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return 0;
    let shkp = shop_keeper(map, rooms[0]);
    if (!shkp) return 0;

    let value = 0;
    let gvalue = 0;
    let billamt = 0;

    // Check if on bill
    const bp = onbill(obj, shkp, true);
    if (bp) {
        billamt = bp.bquan * bp.price;
        sub_one_frombill(obj, shkp);
    }

    if (obj.oclass === COIN_CLASS) {
        gvalue += Number(obj.quan || 0);
    } else {
        if (billamt) {
            value += billamt;
        } else if (!obj.no_charge) {
            value += get_pricing_units(obj) * get_cost(obj, shkp);
        }
    }

    if (gvalue + value === 0) return 0;

    value += gvalue;

    if (peaceful) {
        const credit_use = !!(shkp.credit);
        value = await check_credit(value, shkp);
        if (!shkp.mpeaceful) {
            shkp.robbed = (shkp.robbed || 0) + value;
        } else {
            shkp.debit = (shkp.debit || 0) + value;
        }

        if (!silent) {
            if (credit_use) {
                if (shkp.credit) {
                    await You("have %d %s credit remaining.",
                        shkp.credit, currency(shkp.credit));
                    return value;
                } else if (!value) {
                    await You("have no credit remaining.");
                    return 0;
                }
            }
            if (value) {
                await You("owe %s %d %s for %s!",
                    shkname(shkp), value, currency(value),
                    Number(obj.quan || 1) > 1 ? "them" : "it");
            }
        }
    } else {
        shkp.robbed = (shkp.robbed || 0) + value;
        if (!silent) {
            if (canspotmon(shkp)) {
                await Norep("%s booms: \"%s, you are a thief!\"",
                      Shknam(shkp), "");
            } else {
                await You_hear("a scream, \"Thief!\"");
            }
        }
        hot_pursuit(shkp);
    }
    return value;
}

// ============================================================
// Costly gold (C: costly_gold, donate_gold)
// ============================================================

// C ref: shk.c costly_gold()
export async function costly_gold(x, y, amount, silent, map) {
    if (!costly_spot(x, y, map)) return;

    const rooms = in_rooms(map, x, y, SHOPBASE);
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp) return;

    const credit = Number(shkp.credit || 0);
    if (credit >= amount) {
        if (!silent) {
            if (credit > amount)
                await Your("credit is reduced by %d %s.", amount, currency(amount));
            else
                await Your("credit is erased.");
        }
        shkp.credit = credit - amount;
    } else {
        const delta = amount - credit;
        if (!silent) {
            if (credit) await Your("credit is erased.");
            if (shkp.debit)
                await Your("debt increases by %d %s.", delta, currency(delta));
            else
                await You("owe %s %d %s.", shkname(shkp), delta, currency(delta));
        }
        shkp.debit = (shkp.debit || 0) + delta;
        shkp.loan = (shkp.loan || 0) + delta;
        shkp.credit = 0;
    }
}

// C ref: shk.c donate_gold()
export async function donate_gold(gltmp, shkp, selling) {
    const debit = Number(shkp.debit || 0);
    if (debit >= gltmp) {
        if (shkp.loan) {
            shkp.loan = (shkp.loan > gltmp) ? shkp.loan - gltmp : 0;
        }
        shkp.debit = debit - gltmp;
        await Your("debt is %spaid off.", shkp.debit ? "partially " : "");
    } else {
        const delta = gltmp - debit;
        shkp.credit = (shkp.credit || 0) + delta;
        if (debit) {
            shkp.debit = 0;
            shkp.loan = 0;
            await Your("debt is paid off.");
        }
        if (shkp.credit === delta) {
            await You("have %sestablished %d %s credit.",
                !selling ? "re-" : "", delta, currency(delta));
        } else {
            await pline("%d %s added%s to your credit; total is now %d %s.",
                  delta, currency(delta), !selling ? " back" : "",
                  shkp.credit, currency(shkp.credit));
        }
    }
}

// ============================================================
// Check unpaid usage (C: check_unpaid, check_unpaid_usage, cost_per_charge)
// ============================================================

// C ref: shk.c cost_per_charge()
export function cost_per_charge(shkp, otmp, altusage, map) {
    if (!shkp || (map && !inhishop(shkp, map))) return 0;
    let tmp = get_cost(otmp, shkp);

    if (otmp.otyp === MAGIC_LAMP) {
        if (!altusage)
            tmp = Number((objectData[OIL_LAMP] || {}).oc_cost || 0);
        else
            tmp += Math.floor(tmp / 3);
    } else if (otmp.otyp === MAGIC_MARKER) {
        tmp = Math.floor(tmp / 2);
    } else if (otmp.otyp === BAG_OF_TRICKS || otmp.otyp === HORN_OF_PLENTY) {
        if (!altusage) tmp = Math.floor(tmp / 5);
    } else if (otmp.otyp === CRYSTAL_BALL || otmp.otyp === OIL_LAMP
               || otmp.otyp === BRASS_LANTERN
               || (otmp.otyp >= MAGIC_FLUTE && otmp.otyp <= DRUM_OF_EARTHQUAKE)
               || otmp.oclass === WAND_CLASS) {
        if (Number(otmp.spe || 0) > 1) tmp = Math.floor(tmp / 4);
    } else if (otmp.oclass === SPBOOK_CLASS) {
        tmp -= Math.floor(tmp / 5);
    } else if (otmp.otyp === CAN_OF_GREASE || otmp.otyp === TINNING_KIT
               || otmp.otyp === EXPENSIVE_CAMERA) {
        tmp = Math.floor(tmp / 10);
    } else if (otmp.otyp === POT_OIL) {
        tmp = Math.floor(tmp / 5);
    }
    return tmp;
}

// C ref: shk.c:5623 check_unpaid_usage()
export function check_unpaid_usage(otmp, altusage, map) {
    if (!otmp.unpaid) return;

    const rooms = in_rooms(map, otmp.ox || 0, otmp.oy || 0, SHOPBASE);
    if (rooms.length === 0) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return;

    const tmp = cost_per_charge(shkp, otmp, altusage, map);
    if (!tmp) return;

    // cf. shk.c:5639-5665 — verbalize block with RNG consumption
    let arg1 = "", arg2 = "";
    if (otmp.oclass === SPBOOK_CLASS) {
        arg1 = rn2(2) ? `This is no free library!  ` : "";
        arg2 = (shkp.debit || 0) > 0 ? " an additional" : "";
    } else if (otmp.otyp === POT_OIL) {
        // no rn2 calls for POT_OIL
    } else if (altusage && (otmp.otyp === BAG_OF_TRICKS
                            || otmp.otyp === HORN_OF_PLENTY)) {
        if (!rn2(3))
            arg1 = "Whoa!  ";
        if (!rn2(3))
            arg1 = "Watch it!  ";
    } else {
        if (!rn2(3))
            arg1 = "Hey!  ";
        if (!rn2(3))
            arg2 = "Ahem.  ";
    }

    if (!muteshk(shkp)) {
        verbalize(`${arg1}${arg2}Usage fee, ${tmp} zorkmid${tmp !== 1 ? 's' : ''}.`);
    }

    shkp.debit = (shkp.debit || 0) + tmp;
}

// C ref: shk.c check_unpaid()
export function check_unpaid(otmp, map) {
    check_unpaid_usage(otmp, false, map);
}

// ============================================================
// Price quote / shop chat (C: price_quote, shk_chat, shk_embellish)
// ============================================================

// C ref: shk.c shk_embellish()
function shk_embellish(itm, cost) {
    if (!rn2(3)) {
        let choice = rn2(5);
        if (choice === 0)
            choice = (cost < 100 ? 1 : cost < 500 ? 2 : 3);
        switch (choice) {
        case 4:
            if (cost < 10) break;
            if (itm.oclass === FOOD_CLASS) return ", gourmets' delight!";
            return ", superb craftsmanship!";
        case 3: return ", finest quality.";
        case 2: return ", an excellent choice.";
        case 1: return ", a real bargain.";
        default: break;
        }
    } else if (itm.oartifact) {
        return ", one of a kind!";
    }
    return ".";
}

// C ref: shk.c price_quote()
export async function price_quote(first_obj, map) {
    if (!map) return;
    const shoproom = insideShop(map, first_obj?.ox || 0, first_obj?.oy || 0);
    if (!shoproom) return;
    const shkp = shop_keeper(map, shoproom);
    if (!shkp || !inhishop(shkp, map)) return;

    let cnt = 0;
    const lines = ["Fine goods for sale:", ""];

    const objs = map.objectsAt?.(first_obj.ox, first_obj.oy) || [first_obj];
    for (const otmp of objs) {
        if (!otmp || otmp.oclass === COIN_CLASS) continue;
        let cost = (otmp.no_charge) ? 0 : get_cost(otmp, shkp);
        if (otmp.globby) cost *= get_pricing_units(otmp);
        let priceStr;
        if (!cost) {
            priceStr = "no charge";
        } else {
            const each = Number(otmp.quan || 1) > 1 ? " each" : "";
            priceStr = `${cost} ${currency(cost)}${each}`;
        }
        lines.push(`${doname(otmp, null)}, ${priceStr}`);
        cnt++;
    }

    if (cnt === 1) {
        // Single item: verbalize
        const otmp = first_obj;
        let cost = (otmp.no_charge) ? 0 : get_cost(otmp, shkp);
        if (!cost) {
            await verbalize("%s!", capitalizeWord(doname(otmp, null) + ", no charge"));
        } else {
            const emb = shk_embellish(otmp, cost);
            await verbalize("%s, price %d %s%s%s",
                      capitalizeWord(doname(otmp, null)),
                      cost, currency(cost),
                      Number(otmp.quan || 1) > 1 ? " each" : "",
                      emb);
        }
    } else if (cnt > 1) {
        // Multiple items: would show in a menu window
        for (const line of lines) {
            await pline(line);
        }
    }
}

// Izchak quotes (C ref)
const Izchak_speaks = [
    "%s says: 'These shopping malls give me a headache.'",
    "%s says: 'Slow down.  Think clearly.'",
    "%s says: 'You need to take things one at a time.'",
    "%s says: 'I don't like poofy coffee... give me Colombian Supremo.'",
    "%s says that getting the devteam's agreement on anything is difficult.",
    "%s says that he has noticed those who serve their deity will prosper.",
    "%s says: 'Don't try to steal from me - I have friends in high places!'",
    "%s says: 'You may well need something from this shop in the future.'",
    "%s comments about the Valley of the Dead as being a gateway."
];

// C ref: shk.c shk_chat()
export async function shk_chat(shkp, map) {
    if (!shkp.isshk) {
        await pline("%s asks whether you've seen any untended shops recently.",
              Shknam(shkp));
        return;
    }

    if (!shkp.mpeaceful) {
        await pline("%s %s how much %s dislikes %s customers.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "mentions" : "indicates",
              mhe(shkp), shkp.robbed ? "non-paying" : "rude");
    } else if (shkp.following) {
        if (!muteshk(shkp)) {
            await verbalize("Didn't you forget to pay?");
        } else {
            await pline("%s taps you.", Shknam(shkp));
        }
    } else if ((shkp.billct || 0) > 0) {
        const total = addupbill(shkp) + (shkp.debit || 0);
        await pline("%s %s that your bill comes to %d %s.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "says" : "indicates",
              total, currency(total));
    } else if (shkp.debit) {
        await pline("%s %s that you owe %s %d %s.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "reminds you" : "indicates",
              mhim(shkp), shkp.debit, currency(shkp.debit));
    } else if (shkp.credit) {
        await pline("%s encourages you to use your %d %s of credit.",
              Shknam(shkp), shkp.credit, currency(shkp.credit));
    } else if (shkp.robbed) {
        await pline("%s %s about a recent robbery.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "complains" : "indicates concern");
    } else if (shkp.surcharge) {
        await pline("%s %s that %s is watching you carefully.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "warns you" : "indicates",
              mhe(shkp));
    } else if ((shkp.mgold || 0) < 50) {
        await pline("%s %s that business is bad.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "complains" : "indicates");
    } else if ((shkp.mgold || 0) > 4000) {
        await pline("%s %s that business is good.",
              Shknam(shkp),
              (!muteshk(shkp)) ? "says" : "indicates");
    } else if (is_izchak(shkp)) {
        if (!muteshk(shkp)) {
            const msg = Izchak_speaks[rn2(Izchak_speaks.length)];
            await pline(msg, shkname(shkp));
        }
    } else {
        if (!muteshk(shkp))
            await pline("%s talks about the problem of shoplifters.", Shknam(shkp));
    }
}

// ============================================================
// shk_names_obj (C ref: shk.c)
// ============================================================

// C ref: shk.c shk_names_obj() -- shopkeeper names/describes object after transaction
export async function shk_names_obj(shkp, obj, fmt, amt, arg) {
    const obj_name = doname(obj, _gstate?.player || null);
    await You(fmt, obj_name, amt, plur(amt), arg || "");
}

// ============================================================
// Shop entry / exit messages (existing, enhanced)
// ============================================================

function getShopQuoteForFloorObject(obj, player, map) {
    if (!obj || obj.oclass === COIN_CLASS) return null;
    if (!Number.isInteger(obj.ox) || !Number.isInteger(obj.oy)) return null;

    const playerShops = in_rooms(map, player.x, player.y, SHOPBASE);
    if (playerShops.length === 0) return null;
    const objShops = in_rooms(map, obj.ox, obj.oy, SHOPBASE);
    const shoproom = playerShops.find((r) => objShops.includes(r));
    if (!shoproom) return null;

    const shkp = findShopkeeper(map, shoproom);
    if (!shkp || insideShop(map, shkp.mx, shkp.my) !== shoproom) return null;

    const freeSpot = !!(shkp.shk
        && Number(shkp.shk.x) === obj.ox
        && Number(shkp.shk.y) === obj.oy);
    const noCharge = !!obj.no_charge || freeSpot;
    if (!obj.unpaid && noCharge) {
        return { cost: 0, noCharge: true };
    }
    const units = Math.max(1, Number(obj.quan || 1));
    return { cost: units * getCost(obj, player, shkp), noCharge: false };
}

export function describeGroundObjectForPlayer(obj, player, map) {
    const base = doname(obj, null);
    const quote = getShopQuoteForFloorObject(obj, player, map);
    if (!quote) return base;
    if (quote.cost > 0) {
        return `${base} (for sale, ${quote.cost} ${currency(quote.cost)})`;
    }
    if (quote.noCharge) {
        return `${base} (no charge)`;
    }
    return base;
}

export async function maybeHandleShopEntryMessage(game, oldX, oldY) {
    const { map, player, display } = game;
    const oldShops = in_rooms(map, oldX, oldY, SHOPBASE);
    const newShops = in_rooms(map, player.x, player.y, SHOPBASE);
    game._ushops = newShops;
    const entered = newShops.filter((r) => !oldShops.includes(r));
    if (entered.length === 0) return;

    const shoproom = entered[0];
    const shkp = findShopkeeper(map, shoproom);
    if (!shkp || insideShop(map, shkp.mx, shkp.my) !== shoproom || shkp.following) return;

    const room = map.rooms?.[shoproom - ROOMOFFSET];
    const rtype = Number(room?.rtype || SHOPBASE);
    const shopTypeName = shtypes[rtype - SHOPBASE]?.name || 'shop';
    const plname = String(player?.name || 'customer').toLowerCase();
    const shkName = shopkeeperName(shkp);

    if (shkp.peaceful === false || shkp.mpeaceful === false) {
        await display.putstr_message(`"So, ${plname}, you dare return to ${sSuffix(shkName)} ${shopTypeName}?!"`);
        return;
    }
    if (shkp.surcharge) {
        await display.putstr_message(`"Back again, ${plname}?  I've got my eye on you."`);
        return;
    }
    if (shkp.robbed) {
        await display.putstr_message(`${capitalizeWord(shkName)} mutters imprecations against shoplifters.`);
        return;
    }

    const visitct = Number(shkp.visitct || 0);
    // C ref: shk.c — uses Hello(shkp) which gives Samurai "Irasshaimase" for shopkeepers
    const greeting = Hello(shkp, player.roleIndex);
    await display.putstr_message(`"${greeting}, ${plname}!  Welcome${visitct ? ' again' : ''} to ${sSuffix(shkName)} ${shopTypeName}!"`);
    shkp.visitct = visitct + 1;
}

// ============================================================
// dopay -- the #pay command (C: shk.c dopay)
// ============================================================

// C ref: shk.c dopay() -- the #pay command
export async function dopay(game) {
    const { map, player } = game;
    if (!map) return 0;
    let tookTime = false;
    const moneyOnHand = () => {
        let total = Number(player?.gold || 0);
        const inv = Array.isArray(player?.inventory) ? player.inventory : [];
        for (const otmp of inv) {
            if (!otmp) continue;
            if (otmp.oclass === COIN_CLASS || otmp.otyp === GOLD_PIECE) {
                total += Number(otmp.quan || 0);
            }
        }
        return total;
    };

    const monsters = map.monsters || [];
    const hereRooms = in_rooms(map, player.x, player.y, SHOPBASE);
    let sk = 0, seensk = 0, nexttosk = 0;
    let nxtm = null;
    let resident = null;

    for (const m of monsters) {
        if (!m || m.dead || !m.isshk) continue;
        sk++;
        if (m_next2u(m, player)) {
            nexttosk++;
            if (!nxtm || nxtm.mpeaceful !== false) nxtm = m;
        }
        if (canspotmon(m)) seensk++;
        if (hereRooms.length > 0 && Number(m.shoproom || 0) === hereRooms[0] && inhishop(m, map)) {
            resident = m;
        }
    }

    let shkp = null;
    if (nxtm && nexttosk === 1) {
        shkp = nxtm;
    } else if (!sk) {
        await There("appears to be no shopkeeper here to receive your payment.");
        return 0;
    } else if (!seensk) {
        await You_cant("see...");
        return 0;
    } else if (sk === 1 && resident) {
        shkp = resident;
    } else if (seensk === 1) {
        shkp = monsters.find((m) => m && !m.dead && m.isshk && canspotmon(m)) || null;
        if (shkp && shkp !== resident && !m_next2u(shkp, player)) {
            await pline("%s is not near enough to receive your payment.", Shknam(shkp));
            return 0;
        }
    } else if (resident) {
        shkp = resident;
    } else {
        await pline("Pay whom?");
        const cc = { x: Number(player?.x || 1), y: Number(player?.y || 0) };
        const pick = await getpos_async(cc, true, "the creature you want to pay", { map, display: game?.display, player });
        if (pick < 0) return 0;
        const cx = Number(cc.x);
        const cy = Number(cc.y);
        if (cx < 0) {
            await pline("Try again...");
            return 0;
        }
        if (cx === Number(player?.x) && cy === Number(player?.y)) {
            await You("are generous to yourself.");
            return 0;
        }
        const mtmp = (typeof map.monsterAt === 'function')
            ? map.monsterAt(cx, cy)
            : (map.monsters || []).find((m) => m && !m.dead && Number(m.mx) === cx && Number(m.my) === cy);
        if (!mtmp || !canspotmon(mtmp)) {
            await You("can't see anyone there.");
            return 0;
        }
        if (!mtmp.isshk) {
            await pline("%s is not interested in your payment.", y_monnam(mtmp));
            return 0;
        }
        if (mtmp !== resident && !m_next2u(mtmp, player)) {
            await pline("%s is too far to receive your payment.", Shknam(mtmp));
            return 0;
        }
        shkp = mtmp;
    }

    if (!shkp) return 0;

    const robbed = Number(shkp.robbed || 0);
    if (robbed || Number(shkp.billct || 0) || Number(shkp.debit || 0)) {
        rouse_shk(shkp, true);
    }
    if (monHelpless(shkp)) {
        await pline("%s %s.", Shknam(shkp), rn2(2) ? "seems to be napping" : "doesn't respond");
        return 0;
    }

    if (shkp !== resident && shkp.mpeaceful !== false) {
        const umoney = moneyOnHand();
        if (!robbed) {
            await You("do not owe %s anything.", shkname(shkp));
            tookTime = true;
        } else if (!umoney) {
            await You("have no gold.");
            tookTime = true;
        } else {
            await pay(Math.min(umoney, robbed), shkp, game);
            if (umoney >= robbed) {
                await make_happy_shk(shkp, false, map);
            }
            tookTime = true;
        }
        return tookTime ? 1 : 0;
    }

    let paid = false;
    let pay_done = true;
    const eshkp = shkp;

    if (!eshkp.billct && !eshkp.debit) {
        const umoney = moneyOnHand();
        if (!robbed && shkp.mpeaceful !== false) {
            await You("do not owe %s anything.", shkname(shkp));
            if (!umoney) await pline("You have no money.");
            tookTime = true;
        } else if (robbed) {
            await pline("%s is after blood, not gold!", shkname(shkp));
            if (umoney < Math.floor(robbed / 2)) {
                if (!umoney) await pline("You have no money.");
                else await pline("You don't have enough to interest %s.", mhim(shkp));
                return 1;
            }
            await pline("But since %s shop has been robbed recently,", mhis(shkp));
            await pline("you %scompensate %s for %s losses.",
                (umoney < robbed) ? "partially " : "", shkname(shkp), mhis(shkp));
            await pay(umoney < robbed ? umoney : robbed, shkp, game);
            await make_happy_shk(shkp, false, map);
            tookTime = true;
        } else {
            await pline("%s is after your hide, not your gold!", Shknam(shkp));
            if (umoney < 1000) {
                if (!umoney) await pline("You have no money.");
                else await pline("You don't have enough to interest %s.", mhim(shkp));
                return 1;
            }
            await You("try to appease %s by giving %s 1000 gold pieces.",
                canspotmon(shkp) ? `the angry ${shkname(shkp)}` : shkname(shkp), mhim(shkp));
            await pay(1000, shkp, game);
            if (rn2(3)) {
                await make_happy_shk(shkp, false, map);
            } else {
                await pline("But %s is as angry as ever.", shkname(shkp));
            }
            tookTime = true;
        }
        return tookTime ? 1 : 0;
    }

    if (shkp !== resident) {
        impossible("dopay: not to shopkeeper?");
        if (resident) setpaid(resident);
        return 0;
    }

    if (eshkp.debit) {
        let dtmp = Number(eshkp.debit || 0);
        const loan = Number(eshkp.loan || 0);
        const umoney = moneyOnHand();
        let debtMsg = `You owe ${shkname(shkp)} ${dtmp} ${currency(dtmp)} `;
        if (loan) {
            debtMsg += (loan === dtmp)
                ? "you picked up in the store."
                : "for gold picked up and the use of merchandise.";
        } else {
            debtMsg += "for the use of merchandise.";
        }
        await pline("%s", debtMsg);

        if (umoney + Number(eshkp.credit || 0) < dtmp) {
            await pline("But you don't have enough gold%s.", eshkp.credit ? " or credit" : "");
            return 1;
        }

        if (Number(eshkp.credit || 0) >= dtmp) {
            eshkp.credit = Number(eshkp.credit || 0) - dtmp;
            eshkp.debit = 0;
            eshkp.loan = 0;
            await Your("debt is covered by your credit.");
        } else if (!Number(eshkp.credit || 0)) {
            money2mon(shkp, dtmp);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await You("pay that debt.");
        } else {
            dtmp -= Number(eshkp.credit || 0);
            eshkp.credit = 0;
            money2mon(shkp, dtmp);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline("That debt is partially offset by your credit.");
            await You("pay the remainder.");
        }
        paid = true;
        tookTime = true;
    }

    if (eshkp.billct) {
        const ibill = make_itemized_bill(shkp);
        const paidRef = { paid };
        if (!await pay_billed_items(shkp, ibill.length, ibill, false, paidRef)) {
            pay_done = false;
        } else {
            paid = paidRef.paid;
            if (paid) tookTime = true;
        }
    }

    if (pay_done && shkp.mpeaceful !== false && paid) {
        if (!muteshk(shkp)) {
            await verbalize("Thank you for shopping in %s %s%s",
                sSuffix(shkname(shkp)),
                shtypes[Number(shkp.shoptype || SHOPBASE) - SHOPBASE]?.name || "shop",
                !shkp.surcharge ? "!" : ".");
        } else {
            await pline("%s nods%s at you for shopping in %s %s%s",
                Shknam(shkp),
                !shkp.surcharge ? " appreciatively" : "",
                mhis(shkp),
                shtypes[Number(shkp.shoptype || SHOPBASE) - SHOPBASE]?.name || "shop",
                !shkp.surcharge ? "!" : ".");
        }
    }

    return (paid || tookTime) ? 1 : 0;
}

// C ref: shk.c make_itemized_bill()
function make_itemized_bill(shkp) {
    const eshkp = shkp || {};
    const bill = Array.isArray(eshkp.bill) ? eshkp.bill : [];
    const ebillct = Number(eshkp.billct || bill.length);
    const player = _gstate?.player || null;
    const isOnBill = (obj) => {
        const where = String(obj?.where ?? '').toUpperCase();
        return where === 'OBJ_ONBILL' || Number(obj?.where) === OBJ_ONBILL;
    };
    const isContained = (obj) => {
        const where = String(obj?.where ?? '').toUpperCase();
        return where === 'OBJ_CONTAINED' || Number(obj?.where) === OBJ_CONTAINED;
    };
    const ibill = [];
    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        if (!bp) continue;
        let obj = bp_to_obj(bp);
        if (!obj) continue;

        let bidx = i;
        const bquan = Number(bp.bquan || 0);
        const oquan = Number(obj.quan || 0);
        if (oquan === 0 || isOnBill(obj)) {
            obj.quan = bquan;
            bp.useup = 1;
        } else if (oquan < bquan) {
            ibill.push({
                obj,
                cost: Number(bp.price || 0) * (bquan - oquan),
                quan: bquan - oquan,
                bidx,
                usedup: PartlyUsedUp,
                queuedpay: false,
            });
        }

        let quan;
        let cost;
        let used;
        if (isOnBill(obj)) {
            quan = bquan;
            cost = Number(bp.price || 0) * quan;
            used = FullyUsedUp;
        } else if (isContained(obj) || Has_contents(obj)) {
            const item = obj;
            let cknown = true;
            while (isContained(obj) && obj.ocontainer) {
                obj = obj.ocontainer;
                if (!obj.cknown) cknown = false;
            }
            const existing = ibill.find((entry) => entry.obj === obj);
            if (existing) {
                if (existing.usedup === FullyIntact) {
                    existing.usedup = cknown ? KnownContainer : UndisclosedContainer;
                }
                continue;
            }
            quan = 1;
            cost = unpaid_cost(obj, COST_CONTENTS, player);
            if (!obj.unpaid) bidx = -1;
            used = (obj === item)
                ? FullyIntact
                : (cknown ? KnownContainer : UndisclosedContainer);
        } else {
            quan = Number(obj.quan || 0);
            cost = Number(bp.price || 0) * quan;
            used = (quan < bquan) ? PartlyIntact : FullyIntact;
        }
        ibill.push({
            obj,
            cost,
            quan,
            bidx,
            usedup: used,
            queuedpay: false,
        });
    }
    ibill.sort(sortbill_cmp);
    return ibill;
}

// C ref: shk.c menu_pick_pay_items()
function menu_pick_pay_items(_ibillct, ibill) {
    for (const item of (ibill || [])) {
        item.queuedpay = true;
    }
    return 1;
}

// C ref: shk.c reject_purchase()
function reject_purchase(shkp, obj, quantity) {
    const name = doname(obj, _gstate?.player || null);
    const qty = Number(quantity || obj?.quan || 1);
    void pline("%s declines to sell %ld %s.", Shknam(shkp), qty, name);
}

// C ref: shk.c insufficient_funds()
function insufficient_funds(shkp, obj, ltmp) {
    const player = _gstate?.player || null;
    let cash = Number(player?.gold || 0);
    if (!cash && Array.isArray(player?.inventory)) {
        for (const otmp of player.inventory) {
            if (!otmp) continue;
            if (otmp.oclass === COIN_CLASS || otmp.otyp === GOLD_PIECE) {
                cash += Number(otmp.quan || 0);
            }
        }
    }
    const credit = Number(shkp?.credit || 0);
    if (!ltmp) return (cash + credit) <= 0;
    return (cash + credit) < Number(ltmp);
}

// C ref: shk.c dopayobj()
async function dopayobj(shkp, bp, obj, which, itemize, _sightunseen) {
    if (!shkp || !bp || !obj) return PAY_SKIP;
    if (!obj.unpaid && !bp.useup && !(Has_contents(obj) && unpaid_cost(obj, COST_CONTENTS, _gstate?.player || null))) {
        impossible("Paid object on bill??");
        return PAY_BUY;
    }
    if (itemize && insufficient_funds(shkp, obj, 0)) return PAY_BROKE;

    const consumed = which === 0;
    const saveQuan = Number(obj.quan || 0);
    let quan = consumed ? Number(bp.bquan || 0) : saveQuan;
    if (consumed && quan > saveQuan) quan -= saveQuan;
    const ltmp = Number(bp.price || 0) * quan;

    obj.quan = quan;

    let buy = PAY_BUY;
    if (quan < Number(bp.bquan || 0) && !consumed) {
        reject_purchase(shkp, obj, Number(bp.bquan || 0));
        buy = PAY_SKIP;
    }
    if (buy === PAY_BUY && insufficient_funds(shkp, obj, ltmp)) {
        buy = itemize ? PAY_SKIP : PAY_CANT;
    }
    if (buy === PAY_BUY) {
        await pay(ltmp, shkp, _gstate);
    }
    obj.quan = saveQuan;

    return buy;
}

// C ref: shk.c buy_container()
async function buy_container(shkp, indx, ibillct, ibill) {
    if (!Array.isArray(ibill) || indx < 0 || indx >= ibill.length) return 2;
    const item = ibill[indx];
    const container = item?.obj;
    const eshkp = shkp || {};
    const ebillct = Number(eshkp.billct || 0);
    const bill = Array.isArray(eshkp.bill) ? eshkp.bill : [];
    if (!container || !ebillct) return 2;

    const totalcost = Number(item.cost || 0);
    if (insufficient_funds(shkp, container, 0) || insufficient_funds(shkp, container, totalcost)) return 1;

    const boids = [];
    const unpaidContainer = !!container.unpaid;

    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        const otmp = bp_to_obj(bp);
        if (!bp || !otmp) continue;
        const owhere = String(otmp.where ?? '').toUpperCase();
        const isContained = (owhere === 'OBJ_CONTAINED' || Number(otmp.where) === OBJ_CONTAINED);
        if (!isContained && !Has_contents(otmp)) continue;
        let top = otmp;
        while (top?.where === OBJ_CONTAINED && top.ocontainer) top = top.ocontainer;
        if (top !== container) continue;
        if (Number(otmp.quan || 0) < Number(bp.bquan || 0)) {
            reject_purchase(shkp, otmp, Number(bp.bquan || 0));
            return 1;
        }
        if (bp.bo_id !== container.o_id) boids.push(bp.bo_id);
    }
    if (unpaidContainer) boids.push(container.o_id);

    let bought = 0;
    for (const boid of boids) {
        let bidx = -1;
        for (let i = 0; i < ebillct; i++) {
            if (bill[i]?.bo_id === boid) {
                bidx = i;
                break;
            }
        }
        if (bidx < 0) continue;
        const bp = bill[bidx];
        const otmp = bp_to_obj(bp);
        const buy = await dopayobj(shkp, bp, otmp, 1, false, false);
        if (buy !== PAY_BUY) continue;
        update_bill((boid === container.o_id) ? indx : -1, ibillct, ibill, eshkp, bp, otmp);
        bought++;
    }
    return bought ? 0 : 2;
}

// C ref: shk.c pay_billed_items()
async function pay_billed_items(shkp, ibillct, ibill, _stashedGold, paidRef = { paid: false }) {
    const eshkp = shkp || {};
    if (!menu_pick_pay_items(ibillct, ibill)) return false;
    let paidAny = false;
    for (let i = 0; i < ibill.length; i++) {
        const item = ibill[i];
        if (!item?.queuedpay) continue;
        let buy;
        if (Number(item.usedup || 0) >= KnownContainer) {
            const boxbagResult = await buy_container(shkp, i, ibillct, ibill);
            buy = (boxbagResult === 0) ? PAY_BUY : PAY_CANT;
        } else {
            const bidx = Number(item.bidx);
            const bp = (Array.isArray(eshkp.bill) && Number.isInteger(bidx) && bidx >= 0)
                ? eshkp.bill[bidx]
                : null;
            if (!bp || !item.obj) continue;
            const pass = (Number(item.usedup || 0) <= PartlyUsedUp) ? 0 : 1;
            buy = await dopayobj(shkp, bp, item.obj, pass, false, false);
            if (buy === PAY_BUY) update_bill(i, ibillct, ibill, eshkp, bp, item.obj);
        }
        if (buy === PAY_CANT) return false;
        if (buy === PAY_BROKE) {
            paidRef.paid = true;
            return true;
        }
        if (buy === PAY_BUY) paidAny = true;
    }
    paidRef.paid = paidAny;
    return true;
}

// C ref: shk.c inherits()
function inherits(shkp, _numsk, _croaked, _silently) {
    if (!shkp) return false;
    const debt = Number(shop_debt(shkp) || 0);
    if (debt <= 0) return false;
    shkp.robbed = Number(shkp.robbed || 0) + debt;
    setpaid(shkp);
    return true;
}

// ============================================================
// sellobj -- selling objects in shops (C: shk.c sellobj)
// Complex interactive function; stub
// ============================================================

// C ref: shk.c sellobj_state()
let sell_response = '';
let sell_how = 0;
const SELL_NORMAL = 0;
const SELL_DELIBERATE = 1;
const SELL_DONTSELL = 2;

export function sellobj_state(deliberate) {
    sell_response = (deliberate !== SELL_NORMAL) ? '' : 'a';
    sell_how = deliberate;
}

// C ref: shk.c sellobj()
export function sellobj(obj, x, y, map) {
    if (!map) return;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return;
    if (!costly_spot(x, y, map)) return;

    if (obj.unpaid) {
        sub_one_frombill(obj, shkp);
        return;
    }
    if (!saleable(shkp, obj) || !shkp.mpeaceful) return;
    const value = Math.max(0, Number(set_cost(obj, shkp) || 0) * Number(get_pricing_units(obj) || 1));
    if (!value) return;
    shkp.credit = Number(shkp.credit || 0) + value;
    obj.no_charge = 1;
}

// ============================================================
// doinvbill -- inventory of used-up items (C: shk.c doinvbill)
// ============================================================

// C ref: shk.c doinvbill()
export function doinvbill(mode, map) {
    void mode;
    if (!map) return 0;
    let count = 0;
    for (const shkp of (map.monsters || [])) {
        if (!shkp || shkp.dead || !shkp.isshk) continue;
        count += Number(shkp.billct || 0);
    }
    return count;
}

// ============================================================
// Shopkeeper financial report (C: shopper_financial_report)
// ============================================================

// C ref: shk.c shopper_financial_report()
export async function shopper_financial_report(player, map) {
    if (!map || !player) return;

    const playerShopRoom = insideShop(map, player.x, player.y);
    let this_shkp = playerShopRoom ? shop_keeper(map, playerShopRoom) : null;

    if (this_shkp && !(this_shkp.credit || shop_debt(this_shkp))) {
        await You("have no credit or debt in here.");
        this_shkp = null;
    }

    const monsters = map.monsters || [];
    for (const shkp of monsters) {
        if (!shkp || shkp.dead || !shkp.isshk) continue;
        const amt_credit = Number(shkp.credit || 0);
        const amt_debt = shop_debt(shkp);

        if (amt_credit) {
            await You("have %d %s credit at %s %s.",
                amt_credit, currency(amt_credit),
                sSuffix(shkname(shkp)),
                shtypes[(shkp.shoptype || SHOPBASE) - SHOPBASE]?.name || 'shop');
        } else if (shkp === this_shkp) {
            await You("have no credit in here.");
        }
        if (amt_debt) {
            await You("owe %s %d %s.", shkname(shkp), amt_debt, currency(amt_debt));
        } else if (shkp === this_shkp) {
            await You("don't owe any gold here.");
        }
    }
}

// ============================================================
// Rob shop (C: rob_shop)
// ============================================================

// C ref: shk.c rob_shop()
async function rob_shop(shkp) {
    await rouse_shk(shkp, true);
    let total = addupbill(shkp) + (shkp.debit || 0);
    if ((shkp.credit || 0) >= total) {
        await Your("credit of %d %s is used to cover your shopping bill.",
             shkp.credit, currency(shkp.credit));
        total = 0;
    } else {
        await You("escaped the shop without paying!");
        total -= (shkp.credit || 0);
    }
    setpaid(shkp);
    if (!total) return false;

    shkp.robbed = (shkp.robbed || 0) + total;
    await You("stole %d %s worth of merchandise.", total, currency(total));
    hot_pursuit(shkp);
    return true;
}

// ============================================================
// Damage tracking (C: add_damage, pay_for_damage, shopdig, etc.)
// ============================================================

// C ref: shk.c add_damage() -- record damage to shop
export function add_damage(x, y, cost, map, moves) {
    if (!map) return;
    if (!map._damagelist) map._damagelist = [];

    // Check if damage already recorded at this spot
    for (const dam of map._damagelist) {
        if (dam.x === x && dam.y === y) {
            dam.cost += cost;
            dam.when = moves || 0;
            return;
        }
    }

    const loc = map.at(x, y);
    map._damagelist.push({
        when: moves || 0,
        x, y,
        cost,
        typ: loc?.typ || 0,
        flags: loc?.flags || 0,
    });
}

// C ref: shk.c pay_for_damage()
export function pay_for_damage(dmgstr, cant_mollify, map, player, moves) {
    if (!map || !player) return;
    const damagelist = map._damagelist || [];

    let cost_of_damage = 0;
    let shkp = null;

    for (const dam of damagelist) {
        if (dam.when !== moves || !dam.cost) continue;
        cost_of_damage += dam.cost;
        const rooms = in_rooms(map, dam.x, dam.y, SHOPBASE);
        for (const r of rooms) {
            const tmp_shk = shop_keeper(map, r);
            if (tmp_shk && inhishop(tmp_shk, map)) {
                shkp = tmp_shk;
            }
        }
    }

    if (!cost_of_damage || !shkp) return;

    // If shk is already angry, just pursue
    if (!shkp.mpeaceful || shkp.following) {
        hot_pursuit(shkp);
        return;
    }

    shkp.customer = player.name || '';
    getcad(shkp, dmgstr, player.x, player.y, true, false, true);
    hot_pursuit(shkp);
}

// C ref: shk.c getcad() -- verbal rebuke helper
function getcad(shkp, dmgstr, _x, _y, _uinshop, _animal, _pursue) {
    if (!shkp || muteshk(shkp)) return;
    const offense = dmgstr || 'that';
    void verbalize("Cad!  You did %s!", offense);
}

// C ref: shk.c shopdig()
export async function shopdig(fall, map, player) {
    if (!map || !player) return;
    const rooms = in_rooms(map, player.x, player.y, SHOPBASE);
    if (rooms.length === 0) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp) return;
    if (!inhishop(shkp, map)) return;

    if (!fall) {
        // Digging in shop floor
        if (!muteshk(shkp)) {
            await verbalize("Do not damage the floor here!");
        }
    }
    if (fall) {
        await rob_shop(shkp);
    }
}

// ============================================================
// Block door/entry (C: block_door, block_entry)
// ============================================================

// C ref: shk.c block_door()
export async function block_door(x, y, map, player) {
    if (!map || !player) return false;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return false;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return false;

    if (shkp.shk && shkp.mx === shkp.shk.x && shkp.my === shkp.shk.y
        && shkp.shd && shkp.shd.x === x && shkp.shd.y === y
        && !monHelpless(shkp)
        && ((shkp.debit || 0) > 0 || (shkp.billct || 0) > 0 || (shkp.robbed || 0) > 0)) {
        await pline("%s blocks your way!", Shknam(shkp));
        return true;
    }
    return false;
}

// C ref: shk.c block_entry()
export async function block_entry(x, y, map, player) {
    if (!map || !player) return false;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return false;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return false;

    if (shkp.shd && shkp.shd.x === player.x && shkp.shd.y === player.y
        && shkp.shk && shkp.mx === shkp.shk.x && shkp.my === shkp.shk.y
        && !monHelpless(shkp)) {
        await pline("%s blocks your way!", Shknam(shkp));
        return true;
    }
    return false;
}

// ============================================================
// shk_your / Shk_Your (C: shk.c)
// ============================================================

// C ref: shk.c append_honorific()
function append_honorific(buf, player = _gstate?.player) {
    const honored = [
        'good', 'honored', 'most gracious', 'esteemed', 'most renowned and sacred'
    ];
    const demigod = Number(player?.uevent?.udemigod || 0);
    const idx = rn2(honored.length - 1) + (demigod ? 1 : 0);
    let out = `${buf}${honored[Math.max(0, Math.min(honored.length - 1, idx))]}`;

    const female = !!player?.female;
    const race = String(player?.race || '').toLowerCase();
    const role = String(player?.roleName || '').toLowerCase();
    const isVampireForm = !!player?.vampireForm || role.includes('vampire');
    if (isVampireForm) {
        out += female ? ' dark lady' : ' dark lord';
    } else if (race === 'elf' || race.includes('elf')) {
        out += female ? ' hiril' : ' hir';
    } else {
        const nonHuman = race && race !== 'human';
        out += nonHuman ? ' creature' : (female ? ' lady' : ' sir');
    }
    return out;
}

// C ref: shk.c shk_owns()
function shk_owns(obj, map = _gstate?.map) {
    if (!obj || !map) return null;
    const x = Number(obj.ox);
    const y = Number(obj.oy);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const isFloor = (obj.where === 'floor' || obj.where === 3 || obj.where === 'OBJ_FLOOR');
    if (!(obj.unpaid || (isFloor && !obj.no_charge && costly_spot(x, y, map)))) return null;
    const shkp = shop_keeper(map, inside_shop(x, y, map));
    return shkp ? sSuffix(shkname(shkp)) : 'the';
}

// C ref: shk.c mon_owns()
function mon_owns(obj) {
    if (!obj) return null;
    const where = obj.where;
    const minvent = (where === 'minvent' || where === 4 || where === 'OBJ_MINVENT');
    if (!minvent || !obj.ocarry) return null;
    return sSuffix(y_monnam(obj.ocarry));
}

// C ref: shk.c sasc_bug() -- historical compiler workaround.
export function sasc_bug(op, x) {
    if (!op) return;
    op.unpaid = x;
}

// C ref: shk.c shk_your() -- "your " or "Foobar's "
export function shk_your(obj, map) {
    if (!obj) return 'your ';
    const own = shk_owns(obj, map) || mon_owns(obj);
    if (own) return `${own} `;
    const inInvent = (obj.where === 'invent' || obj.where === 1 || obj.where === 'OBJ_INVENT');
    return inInvent || obj.carried ? 'your ' : 'the ';
}

// C ref: shk.c Shk_Your()
export function Shk_Your(buf, obj) {
    // Backward-compatible with legacy JS order: Shk_Your(obj, map).
    const looksLikeObj = (v) => !!(v && typeof v === 'object'
        && ('otyp' in v || 'where' in v || 'carried' in v));
    if (looksLikeObj(buf) && !looksLikeObj(obj)) {
        const result = shk_your(buf, obj);
        return result.charAt(0).toUpperCase() + result.slice(1);
    }

    const result = shk_your(obj || buf, null);
    return result.charAt(0).toUpperCase() + result.slice(1);
}

// C ref: shk.c shk_his_her() -- returns possessive pronoun for shopkeeper
export function shk_his_her(shkp) {
    return mhis(shkp);
}

// ============================================================
// Movement hooks (C: shk_move, after_shk_move)
// These are handled in monmove.js; export wrappers here.
// ============================================================

// C ref: shk.c after_shk_move()
export function after_shk_move(shkp, map) {
    if (shkp && map && inhishop(shkp, map)) {
        // C: reset bill_p if it was invalidated
        ensureBill(shkp);
    }
}

// C ref: shk.c shk_move()
// Returns 1 moved, 0 stayed, -1 delegate to generic m_move, -2 died.
export function shk_move(shkp, map, player) {
    if (!shkp || !map || !player) return 0;
    const dist2 = (x1, y1, x2, y2) => {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy;
    };
    const omx = Number(shkp.mx || 0);
    const omy = Number(shkp.my || 0);
    const home = shkp.shk || { x: omx, y: omy };
    const door = shkp.shd || { x: home.x, y: home.y };
    const udist = dist2(omx, omy, player.x, player.y);

    if (inhishop(shkp, map)) {
        // Keep behavior C-shaped: repairs are attempted before movement.
        void shk_fixes_damage(shkp, map, _gstate);
    }

    if (udist < 3 && (shkp.mpeaceful === false || shkp.peaceful === false)) {
        return 0;
    }

    let gtx = home.x;
    let gty = home.y;
    if (shkp.following) {
        if (udist > 4 && !Number(shkp.billct || 0)) return -1;
        gtx = player.x;
        gty = player.y;
        // cf. shk.c:4859 — rn2(9) rile_shk when following
        if (!rn2(9)) {
            shkp.mpeaceful = false;
            shkp.peaceful = false;
        }
    } else if (shkp.mpeaceful === false || shkp.peaceful === false) {
        gtx = player.x;
        gty = player.y;
    }

    const step = (cur, goal) => (goal > cur ? 1 : (goal < cur ? -1 : 0));
    const nx = omx + step(omx, gtx);
    const ny = omy + step(omy, gty);
    if (!isok(nx, ny)) return 0;
    if (nx === player.x && ny === player.y) return 0;
    if (typeof map.monsterAt === 'function' && map.monsterAt(nx, ny)) return 0;

    shkp.mx = nx;
    shkp.my = ny;
    if (typeof newsym === 'function') {
        newsym(omx, omy);
        newsym(nx, ny);
    }
    after_shk_move(shkp, map);
    return (nx !== omx || ny !== omy) ? 1 : 0;
}

// ============================================================
// Contained cost/gold (C: contained_cost, contained_gold)
// ============================================================

// C ref: shk.c contained_cost()
export function contained_cost(obj, shkp, price, usell, unpaid_only) {
    if (!obj || !obj.cobj) return price;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) continue;
        if (usell) {
            if (saleable(shkp, otmp) && !otmp.unpaid
                && otmp.oclass !== BALL_CLASS
                && !(otmp.oclass === FOOD_CLASS && otmp.oeaten)
                && !(Is_candle(otmp) && Number(otmp.age || 0) < 20 * Number((objectData[otmp.otyp] || {}).oc_cost || 0)))
                price += set_cost(otmp, shkp);
        } else {
            if (otmp.unpaid || !unpaid_only)
                price += get_cost(otmp, shkp) * get_pricing_units(otmp);
        }
        if (otmp.cobj)
            price = contained_cost(otmp, shkp, price, usell, unpaid_only);
    }
    return price;
}

// C ref: shk.c contained_gold()
export function contained_gold(obj, even_if_unknown) {
    let value = 0;
    if (!obj || !obj.cobj) return value;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) {
            value += Number(otmp.quan || 0);
        } else if (otmp.cobj && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}

// ============================================================
// Same price (C: same_price)
// ============================================================

// C ref: shk.c same_price()
export function same_price(obj1, obj2, map) {
    // Check if two unpaid objects have the same price on the same shk's bill
    if (!map) return false;
    const monsters = map.monsters || [];
    let bp1 = null, bp2 = null;
    let shkp1 = null, shkp2 = null;

    for (const m of monsters) {
        if (!m || m.dead || !m.isshk) continue;
        if (!bp1) {
            const b = onbill(obj1, m, true);
            if (b) { bp1 = b; shkp1 = m; }
        }
    }
    if (shkp1) {
        bp2 = onbill(obj2, shkp1, true);
        if (bp2) shkp2 = shkp1;
    }
    if (!bp2) {
        for (const m of monsters) {
            if (!m || m.dead || !m.isshk) continue;
            const b = onbill(obj2, m, true);
            if (b) { bp2 = b; shkp2 = m; break; }
        }
    }

    if (!bp1 || !bp2) return false;
    return shkp1 === shkp2 && bp1.price === bp2.price;
}

// ============================================================
// Paybill at death (C: paybill, finish_paybill)
// Stubs for death/quit handling
// ============================================================

// C ref: shk.c paybill()
export function paybill(croaked, silently, map) {
    if (!map) return false;
    let taken = false;
    let numsk = 0;
    for (const m of (map.monsters || [])) {
        if (!m || m.dead || !m.isshk) continue;
        numsk++;
    }
    for (const m of (map.monsters || [])) {
        if (!m || m.dead || !m.isshk) continue;
        taken = inherits(m, numsk, croaked, silently) || taken;
    }
    return taken;
}

// C ref: shk.c finish_paybill()
export function finish_paybill() {
    // No extra finalization needed in current JS runtime.
}

// ============================================================
// Credit report (C: credit_report)
// ============================================================

// C ref: shk.c credit_report()
export function credit_report(shkp, idx, silent) {
    void idx;
    if (!shkp) return;
    if (!silent) {
        const credit = Number(shkp.credit || 0);
        const debt = Number(shop_debt(shkp) || 0);
        void pline("%s has credit=%ld debt=%ld.", Shknam(shkp), credit, debt);
    }
}

// ============================================================
// Remote burglary (C: remote_burglary)
// ============================================================

// C ref: shk.c remote_burglary()
export async function remote_burglary(x, y, map) {
    if (!map) return;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    if (rooms.length === 0) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || !inhishop(shkp, map)) return;
    if (!(shkp.billct || 0) && !(shkp.debit || 0)) return;
    await rob_shop(shkp);
}

// ============================================================
// U entered/left shop (C: u_entered_shop, u_left_shop)
// ============================================================

// C ref: shk.c u_entered_shop() -- called from check_special_room
export function u_entered_shop(enterroom, map, player) {
    // The existing maybeHandleShopEntryMessage handles this case
    // This export provides the C-compatible interface
}

// C ref: shk.c u_left_shop()
export async function u_left_shop(leaveroom, newlev, map, player) {
    if (!map || !player) return;
    void newlev;
    const roomno = (typeof leaveroom === 'string' && leaveroom.length > 0)
        ? leaveroom.charCodeAt(0)
        : Number(leaveroom || 0);
    const shkp = shop_keeper(map, roomno);
    if (!shkp || !inhishop(shkp, map)) return;

    const hasDebt = !!((shkp.billct || 0) || (shkp.debit || 0));
    const hasUnpaidInventory = (player.inventory || []).some((obj) => !!obj?.unpaid);
    if (!hasDebt && !hasUnpaidInventory) return;

    // If the hero is on the boundary square, issue a warning first.
    const heroInsideThisShop = (insideShop(map, player.x, player.y) === roomno);
    if (heroInsideThisShop && !muteshk(shkp)) {
        await verbalize("%s!  Please pay before leaving.", String(player?.name || 'Customer'));
        return;
    }

    hot_pursuit(shkp);
}

// ============================================================
// Pick pick (C: pick_pick)
// ============================================================

// C ref: shk.c pick_pick() -- called when removing pick from container
export function pick_pick(obj, map) {
    if (!obj || obj.unpaid || !is_pick(obj)) return;
    const player = _gstate?.player || null;
    if (!player || !map) return;
    const rooms = in_rooms(map, Number(player.x || 0), Number(player.y || 0), SHOPBASE);
    if (!rooms.length) return;
    const shkp = shop_keeper(map, rooms[0]);
    if (!shkp || muteshk(shkp)) return;
    void verbalize("Careful with that pick-axe!");
}

function is_pick(obj) {
    return obj.otyp === PICK_AXE || obj.otyp === DWARVISH_MATTOCK;
}

// ============================================================
// Picked/dropped container (C: picked_container, dropped_container)
// ============================================================

// C ref: shk.c picked_container()
export function picked_container(obj) {
    if (!obj || !obj.cobj) return;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) continue;
        if (otmp.no_charge) otmp.no_charge = 0;
        if (otmp.cobj) picked_container(otmp);
    }
}

// C ref: shk.c dropped_container()
// Autotranslated from shk.c:3004
export function dropped_container(obj, shkp, sale) {
  let otmp;
  for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
    if (otmp.oclass === COIN_CLASS) {
      continue;
    }
    if (!otmp.unpaid && !(sale && saleable(shkp, otmp))) otmp.no_charge = 1;
    if (Has_contents(otmp)) dropped_container(otmp, shkp, sale);
  }
}

// ============================================================
// Tended shop / noisy shop (C: tended_shop, noisy_shop)
// ============================================================

// C ref: shk.c tended_shop()
// Autotranslated from shk.c:1058
export function tended_shop(sroom) {
  let mtmp = sroom.resident;
  return !mtmp ? false : inhishop(mtmp);
}

// C ref: shk.c noisy_shop()
export function noisy_shop(sroom, map) {
    if (!sroom || !sroom.resident) return;
    if (inhishop(sroom.resident, map)) {
        const sx = Number(sroom.resident.mx || 0);
        const sy = Number(sroom.resident.my || 0);
        for (const m of (map?.monsters || [])) {
            if (!m || m.dead) continue;
            const dx = Number(m.mx || 0) - sx;
            const dy = Number(m.my || 0) - sy;
            if (dx * dx + dy * dy <= (11 * 11)) {
                m.msleeping = 0;
                m.sleeping = false;
                m.mfrozen = 0;
                m.mcanmove = 1;
            }
        }
    }
}

// ============================================================
// Alter cost / gem learned (C: alter_cost, gem_learned)
// ============================================================

// C ref: shk.c alter_cost()
export function alter_cost(obj, amt, map) {
    if (!obj || !map) return;
    const owner = find_objowner(obj, Number(obj.ox || 0), Number(obj.oy || 0), map);
    if (!owner) return;
    const bp = onbill(obj, owner, true);
    if (!bp) return;
    bp.price = Math.max(0, Number(bp.price || 0) + Number(amt || 0));
}

// C ref: shk.c gem_learned()
export function gem_learned(oindx, map) {
    if (!map) return;
    for (const shkp of (map.monsters || [])) {
        if (!shkp || shkp.dead || !shkp.isshk) continue;
        const bill = Array.isArray(shkp.bill) ? shkp.bill : [];
        for (const bp of bill) {
            const obj = bp_to_obj(bp);
            if (!obj) continue;
            if (Number(obj.otyp) === Number(oindx)) {
                bp.price = Math.max(0, Number(set_cost(obj, shkp) || bp.price || 0));
            }
        }
    }
}

// ============================================================
// Find obj owner (C: find_objowner)
// ============================================================

// C ref: shk.c find_objowner()
export function find_objowner(obj, x, y, map) {
    if (!map) return null;
    const rooms = in_rooms(map, x, y, SHOPBASE);
    for (const r of rooms) {
        const shkp = shop_keeper(map, r);
        if (shkp) return shkp;
    }
    return null;
}

// ============================================================
// Get cost of shop item (C: get_cost_of_shop_item)
// ============================================================

// C ref: shk.c get_cost_of_shop_item()
export function get_cost_of_shop_item(obj, map, player) {
    if (!map || !player) return { cost: 0, nochrg: -1 };
    const x = obj.ox, y = obj.oy;
    if (x === undefined || y === undefined) return { cost: 0, nochrg: -1 };

    const shoproom = insideShop(map, x, y);
    if (!shoproom) return { cost: 0, nochrg: -1 };
    const shkp = shop_keeper(map, shoproom);
    if (!shkp || !inhishop(shkp, map)) return { cost: 0, nochrg: -1 };

    const freespot = !!(shkp.shk && shkp.shk.x === x && shkp.shk.y === y);
    const nochrg = obj.no_charge || freespot ? 1 : 0;

    let cost = 0;
    if (!nochrg) {
        cost = get_cost(obj, shkp) * get_pricing_units(obj);
    }
    return { cost, nochrg };
}

// ============================================================
// Fix shop damage (C: fix_shop_damage)
// ============================================================

// C ref: shk.c fix_shop_damage()
export function fix_shop_damage(map) {
    if (!map || !Array.isArray(map.monsters)) return;
    for (const shkp of map.monsters) {
        if (!shkp || shkp.dead || !shkp.isshk) continue;
        if (shk_impaired(shkp, map)) continue;
        for (;;) {
            const dam = find_damage(shkp, map, _gstate);
            if (!dam) break;
            repair_damage(shkp, dam, true, map);
            discard_damage_struct(dam, map);
        }
    }
}

// ============================================================
// Shk catch (C: shkcatch)
// ============================================================

// C ref: shk.c shkcatch() -- shopkeeper catches thrown pick-axe
export function shkcatch(obj, x, y, map) {
    if (!map) return null;
    const shoproom = insideShop(map, x, y);
    if (!shoproom) return null;
    const shkp = shop_keeper(map, shoproom);
    if (!shkp || !inhishop(shkp, map)) return null;
    if (!obj) return null;
    if (!is_pick(obj)) return null;
    obj.no_charge = 1;
    if (typeof map.removeObject === 'function') map.removeObject(obj);
    add_to_minv(shkp, obj);
    return shkp;
}

// ============================================================
// Glob bill fixup (C: globby_bill_fixup)
// ============================================================

// C ref: shk.c globby_bill_fixup()
export function globby_bill_fixup(obj_absorber, obj_absorbed) {
    if (!obj_absorber || !obj_absorbed) return;
    const map = _gstate?.map;
    const x = Number(obj_absorber.ox ?? obj_absorbed.ox);
    const y = Number(obj_absorber.oy ?? obj_absorbed.oy);
    const shkp = find_objowner(obj_absorber, x, y, map) || find_objowner(obj_absorbed, x, y, map);
    if (!shkp) return;
    const bpAbsorbed = onbill(obj_absorbed, shkp, true);
    const bpAbsorber = onbill(obj_absorber, shkp, true);
    if (bpAbsorbed && bpAbsorber) {
        bpAbsorber.price = Number(bpAbsorber.price || 0) + Number(bpAbsorbed.price || 0);
        sub_one_frombill(obj_absorbed, shkp);
    } else if (bpAbsorbed && !bpAbsorber) {
        obj_absorber.unpaid = 1;
        addtobill(obj_absorber, false, false, true);
        const bpNew = onbill(obj_absorber, shkp, true);
        if (bpNew) bpNew.price = Number(bpNew.price || 0) + Number(bpAbsorbed.price || 0);
        sub_one_frombill(obj_absorbed, shkp);
    }
}

// ============================================================
// Check unpaid count for inventory display (C: doinvbill mode 0)
// ============================================================

// C ref: shk.c delete_contents()
export function delete_contents(obj) {
    // Not a shk function per se, but declared in shk.c
    if (!obj) return;
    obj.cobj = null;
}

// ============================================================
// Deserted shop message (C: deserted_shop)
// ============================================================

async function deserted_shop(enterroom, map) {
    await pline("This shop %s deserted.", "seems to be");
}

// ============================================================
// Special stock (C: special_stock)
// ============================================================
// Autotranslated from shk.c:3043
export async function special_stock(obj, shkp, quietly, player) {
  if (ESHK(shkp).shoptype === CANDLESHOP && obj.otyp === CANDELABRUM_OF_INVOCATION) {
    if (!quietly) {
      if (is_izchak(shkp, true) && !player.uevent.invoked) {
        if (Deaf || muteshk(shkp)) {
          await pline("%s seems %s that you want to sell that.", Shknam(shkp), (obj.spe < 7) ? "horrified" : "concerned");
        }
        else {
          await verbalize("No thanks, I'd hang onto that if I were yoplayer.");
          if (obj.spe < 7) {
            await verbalize( "You'll need %d%s candle%s to go along with it.", (7 - obj.spe), (obj.spe > 0) ? " more" : "", plur(7 - obj.spe));
          }
        }
      }
      else {
        if (!Deaf && !muteshk(shkp)) {
          await verbalize("I won't stock that. Take it out of here!");
        }
        else {
          await pline("%s shakes %s %s in refusal.", Shknam(shkp), noit_mhis(shkp), mbodypart(shkp, HEAD));
        }
      }
    }
    return true;
  }
  return false;
}

// ============================================================
// Cad (C: cad) -- gendered insult
// ============================================================

function cad(altusage) {
    const player = _gstate?.player || {};
    const female = !!player.female;
    const race = String(player.race || '').toLowerCase();
    let res = 'cad';
    if (race.includes('demon')) res = 'fiend';
    else if (race.includes('beast')) res = 'beast';
    else if (female) res = 'minx';
    if (altusage) return `"${res.charAt(0).toUpperCase() + res.slice(1)}!  `;
    return res;
}

// ============================================================
// Kops (C: call_kops, kops_gone, makekops)
// ============================================================
// Autotranslated from shk.c:450
export async function call_kops(shkp, nearshop, game, player) {
  let nokops;
  if (!shkp) return;
  if (!player.Deaf) await pline("An alarm sounds!");
  nokops = ((game.mvitals[PM_KEYSTONE_KOP].mvflags & G_GONE) && (game.mvitals[PM_KOP_SERGEANT].mvflags & G_GONE) && (game.mvitals[PM_KOP_LIEUTENANT].mvflags & G_GONE) && (game.mvitals[PM_KOP_KAPTAIN].mvflags & G_GONE));
  if (!await angry_guards(!!player.Deaf) && nokops) {
    if (game.flags.verbose && !player.Deaf) await pline("But no one seems to respond to it.");
    return;
  }
  if (nokops) return;
  const mm = { x: 0, y: 0 };
  const sx_out = { x: 0 }, sy_out = { y: 0 };
  choose_stairs(sx_out, sy_out, true);
  const sx = sx_out.x, sy = sy_out.y;
  if (nearshop) {
    if (game.flags.verbose) await pline_The("Keystone Kops appear!");
    mm.x = player.x;
    mm.y = player.y;
    makekops( mm);
    return;
  }
  if (game.flags.verbose) await pline_The("Keystone Kops are after you!");
  if (isok(sx, sy)) {
    mm.x = sx;
    mm.y = sy;
    makekops( mm);
  }
  mm.x = shkp.mx;
  mm.y = shkp.my;
  makekops( mm);
}

function kops_gone(silent) {
    void silent;
    const map = _gstate?.map || null;
    if (!map) return;
    for (const mon of (map.monsters || [])) {
        if (!mon || mon.dead) continue;
        const n = String(mon?.data?.mname || mon?.type?.mname || mon?.name || '').toLowerCase();
        if (n.includes('kop')) {
            mon.fleeing = true;
        }
    }
}

// ============================================================
// Utility: rloco is in teleport.js, but re-export awareness
// ============================================================

// Note: rloco() is implemented in teleport.js, not here.
// C ref: teleport.c rloco() -- random relocation of object

// ============================================================
// Discard offer (not a C function name, but referenced in instructions)
// ============================================================

// C ref: There is no "discard_offer" in C; this may refer to
// the sell flow where an offer is declined. Already handled in sellobj stub.

// ============================================================
// Export internal utilities used by other modules
// ============================================================

export { shop_keeper, findShopkeeper, in_rooms, get_cost, monHelpless as shk_helpless, muteshk };

// Autotranslated from shk.c:388
export function clear_no_charge_pets(shkp, map) {
  let mtmp;
  for (mtmp = (map?.fmon || null); mtmp; mtmp = mtmp.nmon) {
    if (mtmp.mtame && mtmp.minvent) clear_no_charge(shkp, mtmp.minvent);
  }
}

// Autotranslated from shk.c:289
export function restshk(shkp, ghostly, map) {
  if (map.uz.dlevel) {
    let eshkp = ESHK(shkp);
    if (eshkp.bill_p !==  -1000) eshkp.bill_p = eshkp.bill; // C: bill_p = &bill[0]
    if (ghostly) {
      assign_level( eshkp.shoplevel, map.uz);
      if (ANGRY(shkp) && strncmpi(eshkp.customer, svp.plname, PL_NSIZ)) pacify_shk(shkp, true);
    }
  }
}

// Autotranslated from shk.c:508
export function inside_shop(x, y, map) {
  let rno;
  rno = map.locations[x][y].roomno;
  if ((rno < ROOMOFFSET) || map.locations[x][y].edge || !IS_SHOP(rno - ROOMOFFSET)) rno = NO_ROOM;
  return rno;
}

// Autotranslated from shk.c:1127
export function obfree(obj, merge, player) {
  let bp, bpm, shkp;
  if (obj.otyp === LEASH && obj.leashmon) o_unleash(obj);
  if (obj.oclass === FOOD_CLASS) food_disappears(obj);
  if (obj.oclass === SPBOOK_CLASS) book_disappears(obj);
  if (Has_contents(obj)) delete_contents(obj);
  if (Is_container(obj)) maybe_reset_pick(_gstate, obj);
  if (obj.otyp === BOULDER) obj.next_boulder = 0;
  shkp = 0;
  if (obj.unpaid) {
    for (shkp = next_shkp(fmon, true); shkp; shkp = next_shkp(shkp.nmon, true)) {
      if (onbill(obj, shkp, true)) {
        break;
      }
    }
  }
  if (!shkp) shkp = shop_keeper( player.ushops);
  if ((bp = onbill(obj, shkp, false)) != null) {
    if (!merge) {
      bp.useup = true;
      obj.unpaid = 0;
      if (obj.globby && !obj.owt && has_omid(obj)) obj.owt = OMID(obj);
      add_to_billobjs(obj);
      return;
    }
    bpm = onbill(merge, shkp, false);
    if (!bpm) {
      impossible( "obfree: not on bill, %s = (%d,%d,%ld,%d) (%d,%d,%ld,%d)?", "otyp,where,quan,unpaid", obj.otyp, obj.where, obj.quan, obj.unpaid ? 1 : 0, merge.otyp, merge.where, merge.quan, merge.unpaid ? 1 : 0);
      return;
    }
    else {
      let eshkp = ESHK(shkp);
      bpm.bquan += bp.bquan;
      eshkp.billct--;
      Object.assign(bp, eshkp.bill[eshkp.billct]); // C: *bp = bill_p[billct] (compact)
    }
  }
  else {
    if (merge && (oid_price_adjustment(obj, obj.o_id) > oid_price_adjustment(merge, merge.o_id))) merge.o_id = obj.o_id;
  }
  if (obj.owornmask) {
    impossible("obfree: deleting worn obj (%d: %ld)", obj.otyp, obj.owornmask);
    setnotworn(obj);
  }
  dealloc_obj(obj);
}

// Autotranslated from shk.c:1462
export function cheapest_item(ibillct, ibill) {
  let i, gmin = ibill[0].cost;
  for (i = 1; i < ibillct; ++i) {
    if (ibill[i].cost < gmin) gmin = ibill[i].cost;
  }
  return gmin;
}

// Autotranslated from shk.c:2111
export function update_bill(indx, ibillct, ibill, eshkp, bp, paiditem) {
  let j, newebillct;
  if (indx >= 0 && ibill[indx].usedup === PartlyUsedUp) {
    bp.bquan = paiditem.quan;
    for (j = 0; j < ibillct; ++j) {
      if (ibill[j].obj === paiditem && ibill[j].usedup === PartlyIntact) { ibill[j].usedup = FullyIntact; break; }
    }
  }
  else {
    paiditem.unpaid = 0;
    if (paiditem.where === OBJ_ONBILL) { obj_extract_self(paiditem); dealloc_obj(paiditem); }
    newebillct = eshkp.billct - 1;
    // C: *bp = bill_p[newebillct] — compact array by moving last entry into bp's slot
    const bpIdx = eshkp.bill.indexOf(bp);
    Object.assign(bp, eshkp.bill[newebillct]);
    for (j = 0; j < ibillct; ++j) {
      if (ibill[j].bidx === newebillct) ibill[j].bidx = bpIdx;
    }
    eshkp.billct = newebillct;
  }
  return;
}

// C ref: shk.c sortbill_cmp() -- qsort comparator for itemized billing
function sortbill_cmp(vptr1, vptr2) {
    const sbi1 = vptr1;
    const sbi2 = vptr2;
    const cost1 = Number(sbi1?.cost || 0);
    const cost2 = Number(sbi2?.cost || 0);
    const bidx1 = Number(sbi1?.bidx || 0);
    const bidx2 = Number(sbi2?.bidx || 0);
    const used1 = Number(sbi1?.usedup || 0) <= PartlyUsedUp;
    const used2 = Number(sbi2?.usedup || 0) <= PartlyUsedUp;

    if (used1 !== used2) return Number(used2) - Number(used1);
    if (cost1 !== cost2) return cost2 - cost1;
    return bidx1 - bidx2;
}

// Autotranslated from shk.c:2622
export function set_repo_loc(shkp, player) {
  let ox, oy, eshkp = ESHK(shkp);
  if (gr.repo.shopkeeper) return;
  ox = player.x ? player.x : player.x0;
  oy = player.x ? player.y : player.y0;
  if (!strchr(player.ushops, eshkp.shoproom) || costly_adjacent(shkp, ox, oy)) {
    ox = eshkp.shk.x;
    oy = eshkp.shk.y;
    ox += sgn(ox - eshkp.shd.x);
    oy += sgn(oy - eshkp.shd.y);
  }
  else {
  }
  gr.repo.location.x = ox;
  gr.repo.location.y = oy;
  gr.repo.shopkeeper = shkp;
}

// Autotranslated from shk.c:2699
export function bp_to_obj(bp) {
  let obj, id = bp.bo_id;
  if (bp.useup) {
    const billobjs = Array.isArray(_gstate?.billobjs) ? _gstate.billobjs : [];
    obj = o_on(id, billobjs);
  } else {
    obj = find_oid(id);
  }
  return obj;
}

// C ref: shk.c find_oid() -- search all object lists except billobjs
export function find_oid(id, map = _gstate?.map, player = _gstate?.player) {
    const oid = Number(id);
    if (!Number.isFinite(oid)) return null;

    const inv = Array.isArray(player?.inventory) ? player.inventory : [];
    let obj = o_on(oid, inv);
    if (obj) return obj;

    const floorObjects = Array.isArray(map?.objects) ? map.objects : [];
    obj = o_on(oid, floorObjects);
    if (obj) return obj;

    const buriedObjects = Array.isArray(map?.buriedobjlist)
        ? map.buriedobjlist
        : (Array.isArray(map?.buriedObjects) ? map.buriedObjects : []);
    obj = o_on(oid, buriedObjects);
    if (obj) return obj;

    const migratingObjs = Array.isArray(_gstate?.migrating_objs) ? _gstate.migrating_objs : [];
    obj = o_on(oid, migratingObjs);
    if (obj) return obj;

    const scanMonList = (headOrArray) => {
        if (!headOrArray) return null;
        if (Array.isArray(headOrArray)) {
            for (const mon of headOrArray) {
                const hit = o_on(oid, mon?.minvent || []);
                if (hit) return hit;
            }
            return null;
        }
        for (let mon = headOrArray; mon; mon = mon.nmon) {
            const hit = o_on(oid, mon?.minvent || []);
            if (hit) return hit;
        }
        return null;
    };

    const monLists = [
        map?.fmon || map?.monsters || null,
        _gstate?.migrating_mons || null,
        _gstate?.mydogs || null,
    ];
    for (const list of monLists) {
        obj = scanMonList(list);
        if (obj) return obj;
    }
    return null;
}

// Autotranslated from shk.c:3200
export function unpaid_cost(unp_obj, cost_type, player) {
  let bp = null, shkp = null, amt = 0;
  const shops = player.ushops || '';
  for (let si = 0; si < shops.length; si++) {
    const shop = shops[si];
    if ((shkp = shop_keeper(shop)) != null) {
      if ((bp = onbill(unp_obj, shkp, true))) {
        amt = bp.price;
        if (cost_type !== COST_SINGLEOBJ) { amt *= unp_obj.quan; }
      }
      if (cost_type === COST_CONTENTS && Has_contents(unp_obj)) amt = contained_cost(unp_obj, shkp, amt, false, true);
      if (bp || (!unp_obj.unpaid && amt)) {
        break;
      }
    }
  }
  if (!shkp || (unp_obj.unpaid && !bp)) impossible("unpaid_cost: object wasn't on any bill.");
  return amt;
}

// Autotranslated from shk.c:3305
export function add_to_billobjs(obj) {
  if (obj.where !== OBJ_FREE) throw new Error('add_to_billobjs: obj not free');
  if (obj.timed) obj_stop_timers(obj);
  if (!Array.isArray(_gstate.billobjs)) _gstate.billobjs = [];
  _gstate.billobjs.unshift(obj);
  obj.where = OBJ_ONBILL;
  obj.in_use = 0;
  obj.bypass = 0;
}

// Autotranslated from shk.c:3326
export async function bill_box_content(obj, ininv, dummy, shkp) {
  let otmp;
  if (SchroedingersBox(obj)) return;
  for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
    if (otmp.oclass === COIN_CLASS) {
      continue;
    }
    if (!otmp.no_charge) await add_one_tobill(otmp, dummy, shkp);
    if (Has_contents(otmp)) await bill_box_content(otmp, ininv, dummy, shkp);
  }
}

// Autotranslated from shk.c:3649
export function stolen_container(obj, shkp, price, ininv) {
  let otmp, bp, billamt;
  for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
    if (otmp.oclass === COIN_CLASS) {
      continue;
    }
    billamt = 0;
    if (!billable( shkp, otmp, ESHK(shkp).shoproom, true)) {
      if ((bp = onbill(otmp, shkp, false)) == null) {
        continue;
      }
      if (!shkp) continue;
      billamt = bp.bquan * bp.price;
      sub_one_frombill(otmp, shkp);
    }
    if (billamt) {
      price += billamt;
    }
    else if (ininv ? otmp.unpaid : !otmp.no_charge) {
      price += get_pricing_units(otmp) * get_cost(otmp, shkp);
    }
    if (Has_contents(otmp)) price = stolen_container(otmp, shkp, price, ininv);
  }
  return price;
}

// Autotranslated from shk.c:4253
export function getprice(obj, shk_buying, player) {
  let tmp =  objectData[obj.otyp].oc_cost;
  if (obj.oartifact) {
    tmp = arti_cost(obj);
    if (shk_buying) {
      tmp /= 4;
    }
  }
  switch (obj.oclass) {
    case FOOD_CLASS:
      tmp += corpsenm_price_adj(obj);
    if (player.uhs >= HUNGRY && !shk_buying) {
      tmp *=  player.uhs;
    }
    if (obj.oeaten) tmp = 0;
    break;
    case WAND_CLASS:
      if (obj.spe === -1) tmp = 0;
    break;
    case POTION_CLASS:
      if (obj.otyp === POT_WATER && !obj.blessed && !obj.cursed) tmp = 0;
    break;
    case ARMOR_CLASS:
      case WEAPON_CLASS:
        if (obj.spe > 0) {
          tmp += 10 *  obj.spe;
        }
    break;
    case TOOL_CLASS:
      if (Is_candle(obj) && obj.age < 20 *  objectData[obj.otyp].oc_cost) {
        tmp /= 2;
      }
    break;
  }
  return tmp;
}

// Autotranslated from shk.c:4386
export function repairable_damage(dam, shkp, game, map = _gstate?.map) {
    if (!dam || !shkp || !map) return false;
    if (shk_impaired(shkp, map)) return false;

    const x = Number(dam.x ?? dam.place?.x);
    const y = Number(dam.y ?? dam.place?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (((Number(game?.moves || _gstate?.moves) || 0) - Number(dam.when || 0)) < REPAIR_DELAY) {
        return false;
    }
    if (x === Number(shkp.mx) && y === Number(shkp.my)) return false;

    const player = game?.player || _gstate?.player || null;
    if (player && x === Number(player.x) && y === Number(player.y)) return false;
    if (typeof map.monsterAt === 'function') {
        const mtmp = map.monsterAt(x, y);
        if (mtmp && mtmp !== shkp) return false;
    }

    const shoproom = Number(shkp?.shoproom ?? shkp?.shopRoom ?? shkp?.eshkp?.shoproom);
    if (!Number.isFinite(shoproom)) return false;
    return in_rooms(map, x, y, SHOPBASE).includes(shoproom);
}

// C ref: shk.c repair_damage()
function repair_damage(shkp, dam, _catchup, map = _gstate?.map) {
    if (!dam || !map) return false;
    const x = Number(dam.x ?? dam.place?.x);
    const y = Number(dam.y ?? dam.place?.y);
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc) return false;
    if (Number.isFinite(dam.typ)) loc.typ = dam.typ;
    if (Number.isFinite(dam.flags)) loc.flags = dam.flags;
    newsym(x, y);
    return true;
}

// C ref: shk.c find_damage() -- first repairable damage for shopkeeper
function find_damage(shkp, map = _gstate?.map, game = _gstate) {
    const damagelist = Array.isArray(map?._damagelist) ? map._damagelist : [];
    if (shk_impaired(shkp, map)) return null;
    for (const dam of damagelist) {
        if (repairable_damage(dam, shkp, game)) return dam;
    }
    return null;
}

// C ref: shk.c discard_damage_struct()
function discard_damage_struct(dam, map = _gstate?.map) {
    if (!dam || !Array.isArray(map?._damagelist)) return;
    const idx = map._damagelist.indexOf(dam);
    if (idx >= 0) map._damagelist.splice(idx, 1);
}

// C ref: shk.c discard_damage_owned_by()
function discard_damage_owned_by(shkp, map = _gstate?.map) {
    if (!shkp || !Array.isArray(map?._damagelist)) return;
    const room = Number(shkp?.shoproom ?? shkp?.shopRoom ?? shkp?.eshkp?.shoproom);
    if (!Number.isFinite(room)) return;
    map._damagelist = map._damagelist.filter((dam) => {
        const rooms = in_rooms(map, Number(dam?.x), Number(dam?.y), SHOPBASE);
        return !rooms.includes(room);
    });
}

// Autotranslated from shk.c:4490
export async function shk_fixes_damage(shkp, map = _gstate?.map, game = _gstate) {
    const dam = find_damage(shkp, map, game);
    if (!dam) return;
    const player = game?.player || _gstate?.player || null;
    const shkCloseBy = !!player
        && ((Number(shkp.mx) - Number(player.x)) ** 2
            + (Number(shkp.my) - Number(player.y)) ** 2) <= 64;
    if (canseemon(shkp)) {
        await pline("%s whispers %s.", Shknam(shkp), shkCloseBy ? 'an incantation' : 'something');
    } else if (shkCloseBy) {
        await You_hear('someone muttering an incantation.');
    }
    repair_damage(shkp, dam, false, map);
    discard_damage_struct(dam, map);
}

// Autotranslated from shk.c:4646
export function litter_newsyms(litter, x, y) {
  let i;
  for (i = 0; i < 9; i++) {
    if (litter[i] & LITTER_UPDATE) newsym(x + horiz(i), y + vert(i));
  }
}

// C ref: shk.c litter_getpos()
function litter_getpos(litter, x, y, shkp) {
    if (!Array.isArray(litter) || litter.length < 9) return 0;
    let touched = 0;
    for (let i = 0; i < 9; i++) {
        litter[i] = 0;
        const xx = x + horiz(i);
        const yy = y + vert(i);
        if (!isok(xx, yy)) continue;
        if (shkp && xx === shkp.mx && yy === shkp.my) continue;
        litter[i] = 1;
        touched++;
    }
    return touched;
}

// C ref: shk.c litter_scatter()
function litter_scatter(litter, x, y, _shkp) {
    if (!Array.isArray(litter)) return;
    for (let i = 0; i < 9; i++) {
        if (litter[i]) litter[i] |= 0x80;
    }
    litter_newsyms(litter, x, y);
}

// Autotranslated from shk.c:5047
export function makekops(mm, game, map) {
  let k_mndx = [ PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN ];
  let k_cnt = [], cnt, mndx, k;
  k_cnt[0] = cnt = Math.abs(depth(map.uz)) + rnd(5);
  k_cnt[1] = Math.floor(cnt / 3) + 1;
  k_cnt[2] = Math.floor(cnt / 6);
  k_cnt[3] = Math.floor(cnt / 9);
  for (k = 0; k < 4; k++) {
    if ((cnt = k_cnt[k]) === 0) {
      break;
    }
    mndx = k_mndx[k];
    if (game.mvitals[mndx].mvflags & G_GONE) {
      continue;
    }
    while (cnt--) {
      if (enexto(mm, mm.x, mm.y, mons[mndx])) {
        makemon( mons[mndx], mm.x, mm.y, MM_NOMSG);
      }
    }
  }
}

// Autotranslated from shk.c:6035
export async function use_unpaid_trapobj(otmp, x, y, player) {
  if (otmp.unpaid) {
    if (!player.Deaf) {
      let shkp = find_objowner(otmp, x, y);
      if (shkp && !muteshk(shkp)) { await verbalize("You set it, you buy it!"); }
    }
    bill_dummy_object(otmp, player);
  }
}
