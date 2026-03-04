import { THRONE, SINK, GRAVE, FOUNTAIN, STAIRS, ALTAR, IS_DOOR, D_ISOPEN,
         IS_POOL, IS_LAVA, isok, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER,
         EXT_ENCUMBER, A_WIS, STONE } from './config.js';
import { objectData, COIN_CLASS, CORPSE, ICE_BOX, LARGE_BOX, CHEST,
         BAG_OF_HOLDING, BAG_OF_TRICKS, WAN_CANCELLATION, LOADSTONE,
         BOULDER, STATUE, AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION,
         BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD, LEASH, SCR_SCARE_MONSTER,
         GOLD_PIECE, SADDLE, HORN_OF_PLENTY, SACK, OILSKIN_SACK } from './objects.js';
import { nhgetch } from './input.js';
import { doname, xname, Is_container, weight, splitobj, unbless, set_bknown,
         set_corpsenm } from './mkobj.js';
import { observeObject } from './discovery.js';
import { formatGoldPickupMessage, formatInventoryPickupMessage } from './do.js';
import { mons, PM_HOUSECAT, PM_ICE_TROLL, MZ_LARGE } from './monsters.js';
import { is_rider, touch_petrifies, nohands, nolimbs, notake,
         poly_when_stoned } from './mondata.js';
import { W_ARMOR, W_ACCESSORY, W_WEAPONS, W_SADDLE } from './worn.js';
import { rn2, rnd, d } from './rng.js';
import { pline, You, Your, You_cant, pline_The, There, Norep,
         impossible } from './pline.js';
import { body_part, HAND, FOOT } from './polyself.js';
import { instapetrify } from './trap.js';
import { exercise } from './attrib_exercise.js';
import { newsym } from './monutil.js';
import { currency } from './invent.js';
import { makemon, NO_MM_FLAGS, NO_MINVENT, MM_ADJACENTOK } from './makemon.js';
import { christen_monst, Monnam, mon_nam, x_monnam, ARTICLE_THE,
         SUPPRESS_SADDLE } from './do_name.js';
import { revive as revive_corpse } from './zap.js';
import { near_capacity, max_capacity, calc_capacity } from './hack.js';

// pickup.js -- Autopickup, floor object pickup, container looting
// Ported from NetHack pickup.c

// ---------------------------------------------------------------------------
// Module-level state (cf. C globals)
// ---------------------------------------------------------------------------
let current_container = null;      // gc.current_container
let valid_menu_classes = '';        // gv.valid_menu_classes
let class_filter = false;          // gc.class_filter
let bucx_filter = false;           // gb.bucx_filter
let shop_filter = false;           // gs.shop_filter
let picked_filter = false;         // gp.picked_filter
let val_for_n_or_more = 0;         // gv.val_for_n_or_more
let abort_looting = false;         // ga.abort_looting
let pickup_encumbrance = 0;        // gp.pickup_encumbrance
let oldcap = 0;                    // go.oldcap
let loot_reset_justpicked = false; // gl.loot_reset_justpicked

// ---------------------------------------------------------------------------
// Helper predicates (not exported from other modules)
// ---------------------------------------------------------------------------

// cf. C macro: #define bigmonst(ptr) ((ptr)->msize >= MZ_LARGE)
function bigmonst(ptr) {
    return (ptr.msize || 0) >= MZ_LARGE;
}

// cf. C macro: Is_mbag(obj) — bag of holding, sack, or oilskin sack type
function Is_mbag(obj) {
    return obj.otyp === BAG_OF_HOLDING;
}

function Has_contents(obj) {
    return obj.cobj != null && (Array.isArray(obj.cobj) ? obj.cobj.length > 0 : !!obj.cobj);
}

function Is_box(obj) {
    return obj.otyp === LARGE_BOX || obj.otyp === CHEST;
}

function SchroedingersBox(obj) {
    return obj.spe === 1 && Is_box(obj);
}

function carried(obj) {
    return obj.where === 'OBJ_INVENT' || obj.where === 'invent';
}

function age_is_relative(obj) {
    // In C: rotting food items have relative age.  Corpses, tins, etc.
    return obj.otyp === CORPSE;
}

function obj_extract_self(obj) {
    // Stub: in the JS port, object list management is handled differently.
    // This is a no-op placeholder for C's obj_extract_self().
}

function is_worn(obj) {
    return !!(obj.owornmask);
}

// ---------------------------------------------------------------------------
// Ported pickup.c functions
// ---------------------------------------------------------------------------

// cf. pickup.c:273 — u_safe_from_fatal_corpse(obj, tests)
const st_gloves = 0x01;
const st_corpse = 0x02;
const st_petrifies = 0x04;
const st_resists = 0x08;
const st_all = st_gloves | st_corpse | st_petrifies | st_resists;
// Autotranslated from pickup.c:272
export function u_safe_from_fatal_corpse(obj, tests) {
  if (((tests & st_gloves) && uarmg) || ((tests & st_corpse) && obj.otyp !== CORPSE) || ((tests & st_petrifies) && !touch_petrifies( mons[obj.corpsenm])) || ((tests & st_resists) && Stone_resistance)) return true;
  return false;
}

// cf. pickup.c:285 — fatal_corpse_mistake(obj, remotely)
async function fatal_corpse_mistake(obj, remotely, player) {
    if (u_safe_from_fatal_corpse(obj, st_all, player) || remotely)
        return false;

    if (poly_when_stoned(player.data)) {
        // polymon(PM_STONE_GOLEM) not yet ported; skip
        return false;
    }

    await pline("Touching %s is a fatal mistake.", doname(obj, player));
    await instapetrify("cockatrice corpse", player);
    return true;
}

// cf. pickup.c:303 — rider_corpse_revival(obj, remotely)
export async function rider_corpse_revival(obj, remotely, player, map) {
    if (!obj || obj.otyp !== CORPSE || !is_rider(mons[obj.corpsenm]))
        return false;

    await pline("At your %s, the corpse suddenly moves...",
          remotely ? "attempted acquisition" : "touch");
    await revive_corpse(obj, false, map);
    await exercise(player, A_WIS, false);
    return true;
}

// cf. pickup.c:317 — force_decor(via_probing)
// Stub: describe_decor/mention_decor system not yet ported
function force_decor(_via_probing) { }

// cf. pickup.c:337 — deferred_decor(setup)
function deferred_decor(_setup) { }

// cf. pickup.c:353 — describe_decor()
function describe_decor() { return false; }

// cf. pickup.c:430 — check_here(picked_some)
// Stub: look_here/read_engr not yet ported
function check_here(_picked_some) { }

// cf. pickup.c:460 — n_or_more(obj)
function n_or_more(obj, player) {
    if (obj === player.uchain)
        return false;
    return obj.quan >= val_for_n_or_more;
}

// cf. pickup.c:469 — menu_class_present(c)
function menu_class_present(c) {
    return (c && valid_menu_classes.indexOf(String.fromCharCode(c)) >= 0)
        || (typeof c === 'string' && c && valid_menu_classes.indexOf(c) >= 0);
}

// cf. pickup.c:475 — add_valid_menu_class(c)
function add_valid_menu_class(c) {
    if (c === 0 || c === '\0') {
        valid_menu_classes = '';
        class_filter = false;
        bucx_filter = false;
        shop_filter = false;
        picked_filter = false;
    } else {
        const ch = typeof c === 'number' ? String.fromCharCode(c) : c;
        if (!menu_class_present(c)) {
            valid_menu_classes += ch;
            switch (ch) {
            case 'B': case 'U': case 'C': case 'X':
                bucx_filter = true;
                break;
            case 'P':
                picked_filter = true;
                break;
            case 'u':
                shop_filter = true;
                break;
            default:
                class_filter = true;
                break;
            }
        }
    }
}

// cf. pickup.c:509 — all_but_uchain(obj)
// Autotranslated from pickup.c:508
export function all_but_uchain(obj) {
  return  (obj !== uchain);
}

// cf. pickup.c:517 — allow_all(_obj)
export function allow_all(_obj) {
    return true;
}

// cf. pickup.c:523 — allow_category(obj)
function allow_category(obj, player) {
    if (!class_filter && !shop_filter && !bucx_filter && !picked_filter)
        return false;

    if (obj.oclass === COIN_CLASS && class_filter)
        return valid_menu_classes.indexOf(String.fromCharCode(COIN_CLASS)) >= 0;

    if (bucx_filter) {
        let bucx;
        if (obj.oclass === COIN_CLASS) {
            bucx = 'U';
        } else {
            bucx = !obj.bknown ? 'X'
                 : obj.blessed ? 'B'
                 : obj.cursed ? 'C'
                 : 'U';
        }
        if (valid_menu_classes.indexOf(bucx) < 0)
            return false;
    }
    if (class_filter && valid_menu_classes.indexOf(String.fromCharCode(obj.oclass)) < 0)
        return false;
    if (shop_filter && !obj.unpaid)
        return false;
    if (picked_filter && !obj.pickup_prev)
        return false;
    return true;
}

// cf. pickup.c:597 — allow_cat_no_uchain(obj)  [not used in C either]
function allow_cat_no_uchain(obj, player) {
    if (obj !== player.uchain
        && ((valid_menu_classes.indexOf('u') >= 0 && obj.unpaid)
            || valid_menu_classes.indexOf(String.fromCharCode(obj.oclass)) >= 0))
        return true;
    return false;
}

// cf. pickup.c:609 — is_worn_by_type(otmp)
export function is_worn_by_type(otmp, player) {
    return is_worn(otmp) && allow_category(otmp, player);
}

// cf. pickup.c:616 — reset_justpicked(olist)
// Autotranslated from pickup.c:615
export function reset_justpicked(olist) {
  let otmp;
  for (otmp = olist; otmp; otmp = otmp.nobj) {
    otmp.pickup_prev = 0;
  }
}

// cf. pickup.c:635 — count_justpicked(olist)
// Autotranslated from pickup.c:634
export function count_justpicked(olist) {
  let otmp, cnt = 0;
  for (otmp = olist; otmp; otmp = otmp.nobj) {
    if (otmp.pickup_prev) cnt++;
  }
  return cnt;
}

// cf. pickup.c:648 — find_justpicked(olist)
// Autotranslated from pickup.c:647
export function find_justpicked(olist) {
  let otmp;
  for (otmp = olist; otmp; otmp = otmp.nobj) {
    if (otmp.pickup_prev) return otmp;
  }
  return  0;
}

// cf. pickup.c:913 — check_autopickup_exceptions(obj)
// Stub: autopickup exception regex system not yet ported
function check_autopickup_exceptions(_obj) {
    return null;
}

// cf. pickup.c:930 — autopick_testobj(otmp, calc_costly)
function autopick_testobj(otmp, calc_costly, player) {
    const otypes = (player.flags && player.flags.pickup_types) || '';

    // first check: reject if an unpaid item in a shop
    // (costly_spot not yet ported, skip this check)

    // pickup_thrown/pickup_stolen/nopick_dropped
    if (otmp.how_lost === 'LOST_THROWN')
        return true;
    if (otmp.how_lost === 'LOST_DROPPED')
        return false;
    if (otmp.how_lost === 'LOST_EXPLODING')
        return false;

    // check for pickup_types
    let pickit = (!otypes || otypes.indexOf(String.fromCharCode(otmp.oclass)) >= 0);

    // check for autopickup exceptions
    const ape = check_autopickup_exceptions(otmp);
    if (ape)
        pickit = ape.grab;

    return pickit;
}

// cf. pickup.c:1511 — count_categories(olist, qflags)
// Autotranslated from pickup.c:1510
export function count_categories(olist, qflags, game) {
  let pack, counted_category, ccount = 0, curr;
  let do_worn = (qflags & WORN_TYPES) !== 0;
  pack = game.flags.inv_order;
  do {
    counted_category = false;
    for (curr = olist; curr; curr = FOLLOW(curr, qflags)) {
      if (curr.oclass === pack) {
        if (do_worn && !(curr.owornmask & (W_ARMOR | W_ACCESSORY | W_WEAPONS))) {
          continue;
        }
        if (!counted_category) { ccount++; counted_category = true; }
      }
    }
    pack++;
  } while ( pack);
  return ccount;
}

// cf. pickup.c:1544 — delta_cwt(container, obj)
// Autotranslated from pickup.c:1543
export function delta_cwt(container, obj) {
  let prev, owt, nwt;
  if (container.otyp !== BAG_OF_HOLDING) return obj.owt;
  owt = nwt = container.owt;
  for (prev = container.cobj;  prev; prev = ( prev).nobj) {
    if ( prev === obj) {
      break;
    }
  }
  if (!prev) {
    throw new Error('delta_cwt: obj not inside container?');
  }
  else {
     prev = obj.nobj;
    nwt = weight(container);
     prev = obj;
  }
  return owt - nwt;
}

// cf. pickup.c:1574 — carry_count(obj, container, count, telekinesis)
// Simplified: returns how many of obj we can carry
async function carry_count(obj, container, count, telekinesis, player) {
    const savequan = obj.quan || 0;
    const saveowt = obj.owt || 0;
    const targetCount = Math.max(0, Math.min(count || savequan, savequan));
    let wt;
    let qq = targetCount;
    const iw = max_capacity(player);

    obj.quan = targetCount;
    obj.owt = weight(obj);
    wt = iw + obj.owt;
    obj.quan = savequan;
    obj.owt = saveowt;

    if (wt < 0) {
        return targetCount;
    }

    if (targetCount > 1 || targetCount < savequan) {
        for (qq = 1; qq <= targetCount; qq++) {
            obj.quan = qq;
            obj.owt = weight(obj);
            if (iw + obj.owt >= 0) break;
        }
        qq--;
    } else {
        qq = 0;
    }

    obj.quan = savequan;
    obj.owt = saveowt;

    if (qq > 0 && qq < targetCount) {
        const objName = doname(obj, player);
        const verb = container ? 'carry' : (telekinesis ? 'acquire' : 'lift');
        await You("can only %s %s of the %s %s.", verb,
            qq === 1 ? 'one' : 'some',
            objName,
            container ? `in ${xname(container)}` : 'lying here');
    } else if (qq === 0 && targetCount > 0) {
        const objName = doname(obj, player);
        const verb = container ? 'carry' : (telekinesis ? 'acquire' : 'lift');
        await There("are %s %s, but you cannot %s any more.",
            objName,
            container ? `in ${xname(container)}` : 'here',
            verb);
    }
    return qq;
}

// cf. pickup.c:1709 — lift_object(obj, container, cnt_p, telekinesis)
// Returns: 1 = ok, 0 = skip, -1 = abort
async function lift_object(obj, container, cnt_p, telekinesis, player) {
    if (obj.otyp === BOULDER) {
        // Sokoban check would go here
    }
    if (obj.otyp === LOADSTONE) {
        return 1; // lift regardless
    }

    cnt_p.value = await carry_count(obj, container, cnt_p.value, telekinesis, player);
    if (cnt_p.value < 1)
        return -1;

    // Encumbrance check stub: always allow
    if (obj.otyp === SCR_SCARE_MONSTER && !container)
        ; // spe handling done by caller

    return 1;
}

// cf. pickup.c:1897 — pick_obj(otmp)
// Autotranslated from pickup.c:1896
export async function pick_obj(otmp, player) {
  let result, ox = otmp.ox, oy = otmp.oy;
  let robshop = (!player.uswallow && otmp !== uball && costly_spot(ox, oy));
  obj_extract_self(otmp);
  newsym(ox, oy);
  if (robshop) {
    let saveushops, fakeshop;
    Strcpy(saveushops, player.ushops);
    fakeshop[0] = in_rooms(ox, oy, SHOPBASE);
    fakeshop[1] = '\0';
    Strcpy(player.ushops, fakeshop);
    addtobill(otmp, true, false, false);
    Strcpy(player.ushops, saveushops);
    robshop = otmp.unpaid && !strchr(player.ushops, fakeshop);
  }
  result = await addinv(otmp, player);
  if (robshop) await remote_burglary(ox, oy);
  return result;
}

// cf. pickup.c:1802 — pickup_object(obj, count, telekinesis)
async function pickup_object(obj, count, telekinesis, player, map) {
    if (obj.quan < count) {
        impossible("pickup_object: count %d > quan %d?", count, obj.quan);
        return 0;
    }

    observeObject(obj);

    if (obj === player.uchain)
        return 0;

    if (obj.otyp === CORPSE) {
        if (await fatal_corpse_mistake(obj, telekinesis, player)
            || await rider_corpse_revival(obj, telekinesis, player, map))
            return -1;
    } else if (obj.otyp === SCR_SCARE_MONSTER) {
        if (obj.blessed) {
            unbless(obj);
        } else if (!obj.spe && !obj.cursed) {
            obj.spe = 1;
        } else {
            await pline_The("scroll%s %s to dust as you %s %s up.",
                      obj.quan !== 1 ? "s" : "",
                      obj.quan !== 1 ? "turn" : "turns",
                      telekinesis ? "raise" : "pick",
                      obj.quan === 1 ? "it" : "them");
            // useupf not yet ported
            return 1;
        }
    }

    const cnt_p = { value: count || obj.quan };
    const res = await lift_object(obj, null, cnt_p, telekinesis, player);
    if (res <= 0)
        return res;

    if (obj.quan !== cnt_p.value && obj.otyp !== LOADSTONE)
        obj = splitobj(obj, cnt_p.value);

    obj = await pick_obj(obj, player, map);
    // C ref: pickup.c — encumber_msg() called after pick_obj/pickup_prinv
    await encumber_msg(player);
    return 1;
}

// cf. pickup.c:1945 — pickup_prinv(obj, count, verb)
// Stub: prinv not yet ported; message handled by handlePickup
function pickup_prinv(_obj, _count, _verb) { }

// cf. pickup.c:1972 — encumber_msg()
// Uses player._oldcap to track per-session baseline (avoids
// module-level oldcap contaminating multiple test sessions).
async function encumber_msg(player) {
    const newcap = near_capacity(player);
    // C ref: static int oldcap = 0; — per-session initial encumbrance baseline
    const oldcap_val = Number.isInteger(player?._oldcap) ? player._oldcap : 0;
    const encMsg = get_encumber_msg_for_change(oldcap_val, newcap);

    if (encMsg) {
        await pline(encMsg);
    }
    if (player) {
        player._oldcap = newcap;
        player.encumbrance = newcap;
    }
    oldcap = newcap;
}

function get_encumber_msg_for_change(oldcap_val, newcap) {
    if (oldcap_val < newcap) {
        switch (newcap) {
        case 1:
            return "Your movements are slowed slightly because of your load.";
        case 2:
            return "You rebalance your load.  Movement is difficult.";
        case 3:
            return "You stagger under your heavy load.  Movement is very hard.";
        default:
            return (newcap === 4)
                ? "You can barely move a handspan with this load!"
                : "You can't even move a handspan with this load!";
        }
    }
    if (oldcap_val > newcap) {
        switch (newcap) {
        case 0:
            return "Your movements are now unencumbered.";
        case 1:
            return "Your movements are only slowed slightly by your load.";
        case 2:
            return "You rebalance your load.  Movement is still difficult.";
        case 3:
            return "You stagger under your load.  Movement is still very hard.";
        default:
            return null;
        }
    }
    return null;
}

// cf. pickup.c:2018 — container_at(x, y, countem)
function container_at(x, y, countem, map) {
    let container_count = 0;
    const objs = map.objectsAt(x, y) || [];
    for (const cobj of objs) {
        if (Is_container(cobj)) {
            container_count++;
            if (!countem)
                break;
        }
    }
    return container_count;
}

// cf. pickup.c:2034 — able_to_loot(x, y, looting)
async function able_to_loot(x, y, looting, player, map) {
    const verb = looting ? "loot" : "tip";
    const loc = map.at(x, y);
    if (loc && IS_POOL(loc.typ)) {
        await You("cannot %s things that are deep in the water.", verb);
        return false;
    }
    if (loc && IS_LAVA(loc.typ)) {
        await You("cannot %s things that are deep in the lava.", verb);
        return false;
    }
    if (nolimbs(player.data || {})) {
        await pline("Without limbs, you cannot %s anything.", verb);
        return false;
    }
    if (looting && nohands(player.data || {})) {
        await pline("Without a free %s, you cannot loot anything.",
              body_part(HAND, player));
        return false;
    }
    return true;
}

// cf. pickup.c:2066 — mon_beside(x, y)
// Autotranslated from pickup.c:2065
export function mon_beside(x, y) {
  let i, j, nx, ny;
  for (i = -1; i <= 1; i++) {
    for (j = -1; j <= 1; j++) {
      nx = x + i;
      ny = y + j;
      if (isok(nx, ny) && MON_AT(nx, ny)) return true;
    }
  }
  return false;
}

// cf. pickup.c:2082 — do_loot_cont(cobjp, cindex, ccount)
async function do_loot_cont(cobj, cindex, ccount, player, map, display) {
    if (!cobj)
        return 0;
    if (cobj.olocked) {
        if (cobj.lknown)
            await pline("%s is locked.", xname(cobj));
        else
            await pline("Hmmm, %s turns out to be locked.", xname(cobj));
        cobj.lknown = 1;
        return 0;
    }
    cobj.lknown = 1;

    if (cobj.otyp === BAG_OF_TRICKS) {
        await You("carefully open %s...", xname(cobj));
        await pline("It develops a huge set of teeth and bites you!");
        const tmp = rnd(10);
        // losehp stub: damage not yet applied
        abort_looting = true;
        return 1;
    }
    return await use_container_simple(cobj, false, cindex < ccount, player, map, display);
}

// cf. pickup.c:2160 — doloot()
async function doloot(player, map, display) {
    loot_reset_justpicked = true;
    const res = await doloot_core(player, map, display);
    loot_reset_justpicked = false;
    return res;
}

// cf. pickup.c:2172 — doloot_core()
async function doloot_core(player, map, display) {
    let c = -1;
    let timepassed = 0;
    abort_looting = false;

    if (nohands(player.data || {})) {
        await You("have no hands!");
        return 0;
    }
    if (player.Confusion) {
        // cf. pickup.c:2197 — RNG: rn2(6) then rn2(2)
        if (rn2(6) && await reverse_loot(player, map, display))
            return 1;
        if (rn2(2)) {
            await pline("Being confused, you find nothing to loot.");
            return 1;
        }
    }

    const x = player.x, y = player.y;
    const num_conts = container_at(x, y, true, map);
    if (num_conts > 0) {
        if (!await able_to_loot(x, y, true, player, map))
            return 0;

        const floorObjs = map.objectsAt(x, y) || [];
        for (const cobj of floorObjs) {
            if (Is_container(cobj)) {
                timepassed |= await do_loot_cont(cobj, 1, 1, player, map, display);
                if (abort_looting)
                    return timepassed ? 1 : 0;
            }
        }
        if (timepassed)
            c = 'y';
    }

    if (c !== 'y') {
        await You("don't find anything here to loot.");
    }
    return timepassed ? 1 : 0;
}

// cf. pickup.c:2344 — reverse_loot()
async function reverse_loot(player, map, display) {
    // cf. pickup.c:2351 — RNG: rn2(3)
    if (!rn2(3)) {
        // n objects: 1/(n+1) chance per object
        const inv = player.inventory || [];
        let n = inv.length;
        for (const otmp of inv) {
            // cf. pickup.c:2355 — RNG: rn2(n+1) for each item
            if (!rn2(n + 1)) {
                await pline("You find old loot: %s", doname(otmp, player));
                return true;
            }
            n--;
        }
        return false;
    }

    // find gold to mess with
    const inv = player.inventory || [];
    let goldob = null;
    for (const otmp of inv) {
        if (otmp.oclass === COIN_CLASS) {
            goldob = otmp;
            // cf. pickup.c:2365 — RNG: rnd(5)
            const contribution = Math.floor((rnd(5) * otmp.quan + 4) / 5);
            if (contribution < otmp.quan)
                goldob = splitobj(otmp, contribution);
            break;
        }
    }
    if (!goldob)
        return false;

    // Simplified: just drop gold on floor
    await pline("Ok, now there is loot here.");
    return true;
}

// cf. pickup.c:2425 — loot_mon(mtmp, passed_info, prev_loot)
// Stub: saddle removal not yet fully ported
function loot_mon(mtmp, passed_info, prev_loot, player) {
    return 0;
}

// cf. pickup.c:2482 — mbag_explodes(obj, depthin)
// Autotranslated from pickup.c:2481
export function mbag_explodes(obj, depthin) {
  if ((obj.otyp === WAN_CANCELLATION || obj.otyp === BAG_OF_TRICKS) && obj.spe <= 0) return false;
  if ((Is_mbag(obj) || obj.otyp === WAN_CANCELLATION) && (rn2(1 << (depthin > 7 ? 7 : depthin)) <= depthin)) return true;
  else if (Has_contents(obj)) {
    let otmp;
    for (otmp = obj.cobj; otmp; otmp = otmp.nobj) {
      if (mbag_explodes(otmp, depthin + 1)) return true;
    }
  }
  return false;
}

// cf. pickup.c:2504 — is_boh_item_gone()
// Autotranslated from pickup.c:2503
export function is_boh_item_gone() {
  return  (!rn2(13));
}

// cf. pickup.c:2512 — do_boh_explosion(boh, on_floor)
// Stub: scatter not yet ported; just destroy contents
async function do_boh_explosion(boh, on_floor) {
    const contents = Array.isArray(boh.cobj) ? [...boh.cobj] : [];
    for (const otmp of contents) {
        if (is_boh_item_gone()) {
            obj_extract_self(otmp);
            await mbag_item_gone(!on_floor, otmp, true);
        } else {
            // scatter stub: items vanish (scatter not yet ported)
            obj_extract_self(otmp);
        }
    }
    if (Array.isArray(boh.cobj)) boh.cobj.length = 0;
}

// cf. pickup.c:2531 — boh_loss(container, held)
// Autotranslated from pickup.c:2530
export async function boh_loss(container, held) {
  if (Is_mbag(container) && container.cursed && Has_contents(container)) {
    let loss = 0, curr, otmp;
    for (curr = container.cobj; curr; curr = otmp) {
      otmp = curr.nobj;
      if (is_boh_item_gone()) { obj_extract_self(curr); loss += await mbag_item_gone(held, curr, false); }
    }
    return loss;
  }
  return 0;
}

// cf. pickup.c:2552 — in_container(obj)
async function in_container(obj, player) {
    if (!current_container) {
        impossible("<in> no current_container?");
        return 0;
    }
    if (obj === player.uball || obj === player.uchain) {
        await You("must be kidding.");
        return 0;
    }
    if (obj === current_container) {
        await pline("That would be an interesting topological exercise.");
        return 0;
    }
    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        await Norep("You cannot %s %s you are wearing.",
              current_container.otyp === ICE_BOX ? "refrigerate" : "stash",
              "something");
        return 0;
    }
    if (obj.otyp === LOADSTONE && obj.cursed) {
        set_bknown(obj, 1);
        await pline_The("stone%s won't leave your person.", obj.quan !== 1 ? "s" : "");
        return 0;
    }
    if (obj.otyp === AMULET_OF_YENDOR
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === BELL_OF_OPENING
        || obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        await pline("%s cannot be confined in such trappings.", xname(obj));
        return 0;
    }
    if (obj.otyp === LEASH && obj.leashmon) {
        await pline("%s attached to your pet.", doname(obj, player));
        return 0;
    }

    if (await fatal_corpse_mistake(obj, false, player))
        return -1;

    // boxes, boulders, big statues can't fit
    if (obj.otyp === ICE_BOX || Is_box(obj) || obj.otyp === BOULDER
        || (obj.otyp === STATUE && bigmonst(mons[obj.corpsenm] || {}))) {
        await You("cannot fit %s into %s.", doname(obj, player), xname(current_container));
        return 0;
    }

    // Simplified: put object in container
    if (current_container.otyp === ICE_BOX && !age_is_relative(obj)) {
        // freeze: record age
        obj.age = (player.moves || 0) - (obj.age || 0);
    } else if (Is_mbag(current_container) && mbag_explodes(obj, 0)) {
        await pline("As you put %s inside, you are blasted by a magical explosion!",
              doname(obj, player));
        // d(6,6) damage — RNG preserved
        const dmg = d(6, 6);
        // losehp stub
        await do_boh_explosion(current_container, !carried(current_container));
        current_container = null;
    }

    if (current_container) {
        await You("put %s into %s.", doname(obj, player), xname(current_container));
        if (!Array.isArray(current_container.cobj))
            current_container.cobj = [];
        current_container.cobj.push(obj);
        current_container.owt = weight(current_container);
    }
    return current_container ? 1 : -1;
}

// cf. pickup.c:2714 — ck_bag(obj)
function ck_bag(obj) {
    return (current_container && obj !== current_container);
}

// cf. pickup.c:2721 — out_container(obj)
async function out_container(obj, player, map) {
    if (!current_container) {
        impossible("<out> no current_container?");
        return -1;
    }

    if (await fatal_corpse_mistake(obj, false, player))
        return -1;

    const count = obj.quan;
    const cnt_p = { value: count };
    const res = await lift_object(obj, current_container, cnt_p, false, player);
    if (res <= 0)
        return res;

    if (obj.quan !== cnt_p.value && obj.otyp !== LOADSTONE)
        obj = splitobj(obj, cnt_p.value);

    // Remove from container
    obj_extract_self(obj);
    if (Array.isArray(current_container.cobj)) {
        const idx = current_container.cobj.indexOf(obj);
        if (idx >= 0) current_container.cobj.splice(idx, 1);
    }
    current_container.owt = weight(current_container);

    if (current_container.otyp === ICE_BOX)
        removed_from_icebox(obj, player);

    // Add to inventory
    if (player.addToInventory)
        player.addToInventory(obj);

    return 1;
}

// cf. pickup.c:2775 — removed_from_icebox(obj)
// Autotranslated from pickup.c:2774
export function removed_from_icebox(obj, game) {
  if (!age_is_relative(obj)) {
    obj.age = (Number(game?.moves) || 0) - obj.age;
    if (obj.otyp === CORPSE) {
      let m = get_mtraits(obj, false);
      let iceT = m ? (m.data === mons[PM_ICE_TROLL]) : (obj.corpsenm === PM_ICE_TROLL);
      obj.norevive = iceT ? 0 : 1;
      start_corpse_timeout(obj);
    }
    else if (obj.globby) { start_glob_timeout(obj, 0); }
  }
}

// cf. pickup.c:2797 — mbag_item_gone(held, item, silent)
// Autotranslated from pickup.c:2796
export async function mbag_item_gone(held, item, silent, player) {
  let shkp, loss = 0;
  if (!silent) {
    if (item.dknown) await pline("%s %s vanished!", Doname2(item), otense(item, "have"));
    else {
      await You("%s %s disappear!", Blind ? "notice" : "see", doname(item));
    }
  }
  if ( player.ushops && (shkp = shop_keeper( player.ushops)) !== 0) {
    if (held ?  item.unpaid : costly_spot(player.x, player.y)) loss = await stolen_value(item, player.x, player.y,  shkp.mpeaceful, true);
  }
  obfree(item,  0);
  return loss;
}

// cf. pickup.c:2820 — observe_quantum_cat(box, makecat, givemsg)
// Autotranslated from pickup.c:2819
export async function observe_quantum_cat(box, makecat, givemsg, game) {
  let sc = "Schroedinger's Cat", deadcat, livecat = 0, ox, oy;
  let itsalive = !rn2(2);
  if (get_obj_location(box, ox, oy, 0)) box.ox = ox, box.oy = oy;
  deadcat = box.cobj;
  if (itsalive) {
    if (makecat) livecat = makemon( mons[PM_HOUSECAT], box.ox, box.oy, NO_MINVENT | MM_ADJACENTOK | MM_NOMSG);
    if (livecat) {
      livecat.mpeaceful = 1;
      set_malign(livecat);
      if (givemsg) {
        if (!canspotmon(livecat)) await You("think %s brushed your %s.", something, body_part(FOOT));
        else {
          await pline("%s inside the box is still alive!", Monnam(livecat));
        }
      }
      christen_monst(livecat, sc);
      if (deadcat) { obj_extract_self(deadcat); obfree(deadcat,  0), deadcat = 0; }
      box.owt = weight(box);
      box.spe = 0;
    }
  }
  else {
    box.spe = 0;
    if (deadcat) {
      deadcat.age = (Number(game?.moves) || 0);
      set_corpsenm(deadcat, PM_HOUSECAT);
      deadcat = await oname(deadcat, sc, ONAME_NO_FLAGS);
    }
    if (givemsg) await pline_The("%s inside the box is dead!", Hallucination ? rndmonnam( 0) : "housecat");
  }
  nhUse(deadcat);
  return;
}

// cf. pickup.c:2883 — container_gone(fn)
function container_gone(fn) {
    return (fn === in_container || fn === out_container) && !current_container;
}

// cf. pickup.c:2891 — explain_container_prompt(more_containers)
// Stub: NHW_TEXT window system not yet ported
async function explain_container_prompt(more_containers) {
    await pline("Container actions: : look, o out, i in, b both, r reversed, s stash, n next, q quit");
}

// cf. pickup.c:2923 — u_handsy()
async function u_handsy(player) {
    if (nohands(player.data || {})) {
        await You("have no hands!");
        return false;
    }
    return true;
}

// cf. pickup.c:2937 — stash_ok(obj)
// Autotranslated from pickup.c:2936
export async function stash_ok(obj) {
  if (!obj) return GETOBJ_EXCLUDE;
  if (!ck_bag(obj)) return GETOBJ_EXCLUDE_SELECTABLE;
  return GETOBJ_SUGGEST;
}

// cf. pickup.c:2951 — use_container (simplified)
async function use_container_simple(obj, held, more_containers, player, map, display) {
    // Simplified use_container for the JS port
    // Just handles basic open-and-loot for floor containers
    current_container = obj;
    let used = 0;

    if (!await u_handsy(player)) {
        current_container = null;
        return 0;
    }

    if (!obj.lknown) {
        obj.lknown = 1;
    }
    if (obj.olocked) {
        await pline("%s is locked.", xname(obj));
        current_container = null;
        return 0;
    }

    // Check for Schroedinger's cat
    if (SchroedingersBox(current_container)) {
        await observe_quantum_cat(current_container, true, true, player, map);
        used = 1;
    }

    // Cursed magic bag losses
    if (Is_mbag(current_container) && current_container.cursed
        && Has_contents(current_container)) {
        const loss = await boh_loss(current_container, held);
        if (loss) {
            used = 1;
            await You("owe %d %s for lost merchandise.", loss, currency(loss));
            current_container.owt = weight(current_container);
        }
    }

    current_container = null;
    return used;
}

// cf. pickup.c:3210 — traditional_loot(put_in)
// Stub: askchain/query_classes not yet ported
function traditional_loot(_put_in) {
    return 0;
}

// cf. pickup.c:3245 — menu_loot(retry, put_in)
// Stub: query_objlist/query_category not yet ported
function menu_loot(_retry, _put_in) {
    return 0;
}

// cf. pickup.c:3376 — in_or_out_menu(prompt, obj, outokay, inokay, alreadyused, more_containers)
// Stub: menu system not yet ported
// Autotranslated from pickup.c:3376
export async function in_or_out_menu(prompt, obj, outokay, inokay, alreadyused, more_containers, game) {
  let lootchars = "_:oibrsnq", abc_chars = "_:abcdenq", win, any, pick_list;
  let buf, n, menuselector = game.flags.lootabc ? abc_chars : lootchars;
  let clr = NO_COLOR;
  any = cg.zeroany;
  win = create_nhwindow(NHW_MENU);
  start_menu(win, MENU_BEHAVE_STANDARD);
  any.a_int = 1;
  Sprintf(buf, "Look inside %s", thesimpleoname(obj));
  add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  if (outokay) {
    any.a_int = 2;
    Sprintf(buf, "take %s out", something);
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (inokay) {
    any.a_int = 3;
    Sprintf(buf, "put %s in", something);
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (outokay) {
    any.a_int = 4;
    Sprintf(buf, "%stake out, then put in", inokay ? "both; " : "");
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (inokay) {
    any.a_int = 5;
    Sprintf(buf, "%sput in, then take out", outokay ? "both reversed; " : "");
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    any.a_int = 6;
    Sprintf(buf, "stash one item into %s", thesimpleoname(obj));
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  add_menu_str(win, "");
  if (more_containers) {
    any.a_int = 7;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, "loot next container", MENU_ITEMFLAGS_SELECTED);
  }
  any.a_int = 8;
  Strcpy(buf, alreadyused ? "done" : "do nothing");
  add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, more_containers ? MENU_ITEMFLAGS_NONE : MENU_ITEMFLAGS_SELECTED);
  end_menu(win, prompt);
  n = await select_menu(win, PICK_ONE, pick_list);
  destroy_nhwindow(win);
  if (n > 0) {
    let k = pick_list[0].item.a_int;
    if (n > 1 && k === (more_containers ? 7 : 8)) k = pick_list[1].item.a_int;
    (pick_list, 0);
    return lootchars[k];
  }
  return (n === 0 && more_containers) ? 'n' : 'q';
}

// cf. pickup.c:3461 — tip_ok(obj)
// Autotranslated from pickup.c:3460
export function tip_ok(obj) {
  if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
  if (Is_container(obj)) { return GETOBJ_SUGGEST; }
  if (obj.otyp === HORN_OF_PLENTY && obj.dknown && objects[obj.otyp].oc_name_known) return GETOBJ_SUGGEST;
  return GETOBJ_DOWNPLAY;
}

// cf. pickup.c:3485 — choose_tip_container_menu()
// Stub: menu system not yet ported
function choose_tip_container_menu() {
    return 0;
}

// cf. pickup.c:3542 — dotip()
// Stub: getobj/tipcontainer flow not yet ported
function dotip(player, map) {
    return 0;
}

// cf. pickup.c:3668 — tipcontainer(box)
// Stub: tip flow not yet fully ported
function tipcontainer(_box) { }

// cf. pickup.c:3851 — tipcontainer_gettarget(box, cancelled)
// Stub: menu system not yet ported
function tipcontainer_gettarget(_box) {
    return null;
}

// cf. pickup.c:3934 — tipcontainer_checks(box, targetbox, allowempty)
// Stub: chest_trap not yet ported
function tipcontainer_checks(_box, _targetbox, _allowempty) {
    return 0; // TIPCHECK_OK
}

// cf. pickup.c:100 — collect_obj_classes(ilets, otmp, here, filter, itemcount)
function collect_obj_classes(objs, filter) {
    const ilets = new Set();
    let itemcount = 0;
    for (const obj of objs) {
        if (!filter || filter(obj)) {
            ilets.add(obj.oclass);
        }
        itemcount++;
    }
    return { classes: [...ilets], itemcount };
}

// cf. pickup.c:1168 — count_unpaid(list)
function count_unpaid(list) {
    if (!list) return 0;
    const items = Array.isArray(list) ? list : [];
    let count = 0;
    for (const obj of items) {
        if (obj.unpaid) count++;
    }
    return count;
}

// cf. pickup.c count_buc — count objects by BUC status
function count_buc(list) {
    const items = Array.isArray(list) ? list : [];
    let bcnt = 0, ucnt = 0, ccnt = 0, xcnt = 0;
    for (const obj of items) {
        if (!obj.bknown) xcnt++;
        else if (obj.blessed) bcnt++;
        else if (obj.cursed) ccnt++;
        else ucnt++;
    }
    return { bcnt, ucnt, ccnt, xcnt };
}

// ---------------------------------------------------------------------------
// Implemented pickup / loot / pay functions
// ---------------------------------------------------------------------------

// Handle picking up items
// C ref: pickup.c pickup()
function parse_pickup_burden_level(flags) {
    const raw = flags?.pickup_burden;
    if (Number.isInteger(raw)) return raw;
    if (typeof raw === 'string') {
        const key = raw.trim().toLowerCase();
        const table = {
            unencumbered: 0,
            burdened: 1,
            slight: 1,
            stressed: 2,
            moderate: 2,
            strained: 3,
            heavy: 3,
            overtaxed: 4,
            severe: 4,
            overloaded: 5,
        };
        if (key in table) return table[key];
    }
    return MOD_ENCUMBER;
}

function burden_prefix(enc) {
    if (enc >= EXT_ENCUMBER) return 'You have extreme difficulty';
    if (enc >= HVY_ENCUMBER) return 'You have much trouble';
    if (enc >= MOD_ENCUMBER) return 'You have trouble';
    return 'You have a little trouble';
}

async function handlePickup(player, map, display, game = null) {
    const objs = map.objectsAt(player.x, player.y);
    if (objs.length === 0) {
        const loc = map.at(player.x, player.y);
        if (loc && loc.typ === THRONE) {
            await display.putstr_message(`It must weigh${loc.looted ? ' almost' : ''} a ton!`);
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === SINK) {
            await display.putstr_message('The plumbing connects it to the floor.');
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === GRAVE) {
            await display.putstr_message("You don't need a gravestone.  Yet.");
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === FOUNTAIN) {
            await display.putstr_message('You could drink the water...');
            return { moved: false, tookTime: false };
        }
        if (loc && IS_DOOR(loc.typ) && (loc.flags & D_ISOPEN)) {
            await display.putstr_message("It won't come off the hinges.");
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === ALTAR) {
            await display.putstr_message('Moving the altar would be a very bad idea.');
            return { moved: false, tookTime: false };
        }
        if (loc && loc.typ === STAIRS) {
            await display.putstr_message('The stairs are solidly affixed.');
            return { moved: false, tookTime: false };
        }
        await display.putstr_message('There is nothing here to pick up.');
        return { moved: false, tookTime: false };
    }

    // Pick up gold first if present
    const gold = objs.find(o => o.oclass === COIN_CLASS);
    if (gold) {
        player.addToInventory(gold);
        map.removeObject(gold);
        await display.putstr_message(formatGoldPickupMessage(gold, player));
        return { moved: false, tookTime: true };
    }

    // Pick up first other item
    // TODO: show menu if multiple items (like C NetHack)
    const obj = objs[0];
    if (!obj) {
        await display.putstr_message('There is nothing here to pick up.');
        return { moved: false, tookTime: false };
    }
    const cnt_p = { value: obj.quan || 1 };
    const liftResult = await lift_object(obj, null, cnt_p, false, player);
    if (liftResult <= 0 || cnt_p.value < 1) {
        return { moved: false, tookTime: liftResult < 0 };
    }

    const completePickup = async () => {
        let pickedObj = obj;
        if ((obj.quan || 1) !== cnt_p.value && obj.otyp !== LOADSTONE) {
            pickedObj = splitobj(obj, cnt_p.value);
            if (!pickedObj) {
                return { moved: false, tookTime: false };
            }
        }

        const addResult = player.addToInventory(pickedObj, { withMeta: true });
        const inventoryObj = addResult.item;
        if (pickedObj === obj) {
            map.removeObject(obj);
        }
        observeObject(pickedObj);
        if (addResult.discoveredByCompare) {
            await display.putstr_message('You learn more about your items by comparing them.');
        }
        const pickupMsg = formatInventoryPickupMessage(pickedObj, inventoryObj, player);
        const oldcapVal = Number.isInteger(player?._oldcap) ? player._oldcap : 0;
        const newcapVal = near_capacity(player);
        const encMsg = get_encumber_msg_for_change(oldcapVal, newcapVal);
        const combinedFits = !encMsg
            || ((pickupMsg.length + 2 + encMsg.length + 9) < Number(display?.cols || 80));

        if (encMsg && !combinedFits && game) {
            await display.putstr_message(`${pickupMsg}--More--`);
            player._oldcap = newcapVal;
            player.encumbrance = newcapVal;
            game.pendingPrompt = {
                type: 'pickup_encumber_more',
                onKey: async (_chCode, gameCtx) => {
                    gameCtx.pendingPrompt = null;
                    if (typeof display.clearRow === 'function') display.clearRow(0);
                    if ('messageNeedsMore' in display) display.messageNeedsMore = false;
                    await display.putstr_message(encMsg);
                    return { handled: true, moved: false, tookTime: false };
                },
            };
        } else {
            await display.putstr_message(pickupMsg);
            await encumber_msg(player);
        }
        return { moved: false, tookTime: true };
    };

    const saveQuan = obj.quan;
    const saveOwt = obj.owt;
    obj.quan = cnt_p.value;
    obj.owt = weight(obj);
    const addWt = obj.owt;
    const promptObjName = xname(obj);
    obj.quan = saveQuan;
    obj.owt = saveOwt;

    const prevEnc = near_capacity(player);
    const pickupBurden = parse_pickup_burden_level(game?.flags || player?.flags || {});
    const nextEnc = calc_capacity(player, addWt);
    if (game && nextEnc > Math.max(prevEnc, pickupBurden)) {
        await display.putstr_message(
            `${burden_prefix(nextEnc)} lifting ${promptObjName}.  Continue? [ynq] (q)`
        );
        game.pendingPrompt = {
            type: 'pickup_continue',
            onKey: async (chCode, gameCtx) => {
                if (chCode === 121 || chCode === 89) { // y/Y
                    gameCtx.pendingPrompt = null;
                    const pickupResult = await completePickup();
                    return { handled: true, ...pickupResult };
                }
                if (chCode === 110 || chCode === 78 // n/N
                    || chCode === 113 || chCode === 81 // q/Q
                    || chCode === 13 || chCode === 10
                    || chCode === 27) {
                    gameCtx.pendingPrompt = null;
                    return { handled: true, moved: false, tookTime: false };
                }
                if (chCode === 32) { // space: ack wrapped message; keep prompt active
                    return { handled: true, moved: false, tookTime: false };
                }
                return { handled: true, moved: false, tookTime: false };
            },
        };
        return { moved: false, tookTime: false, prompt: true };
    }

    return await completePickup();
}

function getContainerContents(container) {
    if (Array.isArray(container?.contents)) return container.contents;
    if (Array.isArray(container?.cobj)) return container.cobj;
    return [];
}

function setContainerContents(container, items) {
    const out = Array.isArray(items) ? items : [];
    if (Array.isArray(container?.contents)) container.contents = out;
    if (Array.isArray(container?.cobj)) container.cobj = out;
    if (!Array.isArray(container?.contents) && !Array.isArray(container?.cobj)) {
        container.contents = out;
    }
}

async function announceLootedItems(display, player, items, verb) {
    for (const item of (items || [])) {
        await display.putstr_message(`You ${verb} ${doname(item, player)}.`);
    }
}

// cf. pickup.c use_container() — interactive "Do what with <container>?" menu.
// Options: ':' look in, 'o' take out, 'i' put in, 'b' bring all, 's' stash one,
//          'r' reversed (put in then take out), 'q'/ESC quit.
// Returns { moved: false, tookTime: bool }.
async function containerMenu(game, container) {
    const { player, display } = game;
    let tookTime = false;

    while (true) {
        const contents = getContainerContents(container);
        const hasContents = contents.length > 0;
        const cname = xname(container);

        // cf. pickup.c:3052-3061 — empty vs non-empty prompt wording
        const prompt = hasContents
            ? `Do what with the ${cname}? [:oibrsq or ?] (q)`
            : `The ${cname} is empty.  Do what with it? [:irsq or ?] (q)`;
        await display.putstr_message(prompt);

        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || c === 'q') break;

        if (c === ':') {
            // Look inside — show contents then loop back to menu.
            // cf. pickup.c out_container walk with iflags.menu_requested
            if (!hasContents) {
                await display.putstr_message(`The ${cname} is empty.`);
            } else {
                await display.putstr_message(`Contents of the ${cname}:`);
                for (const item of contents) {
                    await display.putstr_message(`  ${doname(item, player)}`);
                }
            }
        } else if (c === 'b') {
            // 'b' = bring all out — takes everything, exits menu.
            // cf. pickup.c use_container() 'b' case.
            if (!hasContents) { await display.putstr_message('It is empty.'); continue; }
            const taken = [...contents];
            for (const item of taken) { player.addToInventory(item); observeObject(item); }
            setContainerContents(container, []);
            await announceLootedItems(display, player, taken, 'loot');
            tookTime = true;
            break; // exit menu after bringing all (C behavior)
        } else if (c === 'o') {
            // 'o' = take out — per-item selection loop.
            // cf. pickup.c out_container(): prompts "Take out what? [letters or ?*]"
            // loops until ESC, then returns to outer "Do what?" menu.
            if (!hasContents) { await display.putstr_message('It is empty.'); continue; }
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            while (true) {
                const cur = getContainerContents(container);
                if (!cur.length) break;
                const available = letters.slice(0, cur.length);
                await display.putstr_message(`Take out what? [${available} or ?*]`);
                const tch = await nhgetch();
                if (tch === 27) break; // ESC → back to "Do what?" menu
                const tidx = letters.indexOf(String.fromCharCode(tch));
                if (tidx < 0 || tidx >= cur.length) continue;
                const item = cur[tidx];
                player.addToInventory(item); observeObject(item);
                setContainerContents(container, cur.filter((_, i) => i !== tidx));
                await display.putstr_message(`You take out ${doname(item, player)}.`);
                tookTime = true;
            }
            // after ESC from take-out, loop back to "Do what?" menu (C behavior)
        } else if (c === 's') {
            // Stash one item — cf. pickup.c "Stash: put one item in".
            // C exits the container menu after one stash.
            const inv = (player.inventory || []).filter((o) => o?.invlet);
            if (!inv.length) {
                await display.putstr_message('You have nothing to put in.');
                return { moved: false, tookTime };
            }
            const letters = inv.map((o) => o.invlet).join('');
            await display.putstr_message(`What do you want to stash? [${letters} or ?*]`);
            const sch = await nhgetch();
            const item = inv.find((o) => o.invlet === String.fromCharCode(sch));
            if (item) {
                player.inventory = player.inventory.filter((o) => o !== item);
                const cur = getContainerContents(container);
                setContainerContents(container, [...cur, item]);
                await display.putstr_message(`You put ${doname(item, player)} into the ${cname}.`);
                tookTime = true;
            }
            return { moved: false, tookTime }; // 's' exits menu (C behavior)
        } else if (c === 'i') {
            // Put things in — cf. pickup.c "Put in" with type filter.
            // Show type-filter prompt; stub: accept all types with a single keypress.
            await display.putstr_message('Put in what type of objects?');
            await nhgetch(); // consume the class-filter key (stub)
            // Full query_classes() type filter not yet ported — treated as cancel.
        } else if (c === '?') {
            await display.putstr_message(
                'Container actions: : look, o take out, i put in, b bring all, s stash one, q quit');
        }
    }

    return { moved: false, tookTime };
}

async function handleLoot(game) {
    const { player, map, display } = game;

    // Check floor containers at player's position.
    const floorContainers = (map.objectsAt(player.x, player.y) || [])
        .filter((obj) => !!objectData[obj?.otyp]?.container);

    // Check inventory containers the player is carrying.
    // cf. pickup.c doloot_core() — also offers to loot carried containers.
    const invContainers = (player.inventory || [])
        .filter((obj) => obj && !!objectData[obj?.otyp]?.container);

    if (floorContainers.length === 0 && invContainers.length === 0) {
        await display.putstr_message("You don't find anything here to loot.");
        return { moved: false, tookTime: false };
    }

    // Loot floor container first (C behavior: floor takes priority).
    // cf. pickup.c use_container() — show interactive "Do what?" menu.
    if (floorContainers.length > 0) {
        const container = floorContainers[0];
        if (container.olocked && !container.obroken) {
            await display.putstr_message('Hmmm, it seems to be locked.');
            return { moved: false, tookTime: false };
        }
        return await containerMenu(game, container);
    }

    // Loot an inventory container (take things out).
    // cf. pickup.c doloot_core() — "Do you want to take things out?"
    // If only one inventory container, offer it directly; else prompt for letter.
    let container;
    if (invContainers.length === 1) {
        container = invContainers[0];
    } else {
        // Build letter prompt from inventory letters.
        const letters = invContainers.map((o) => o.invlet).filter(Boolean).join('');
        const prompt = letters
            ? `Loot which container? [${letters} or ?*]`
            : 'Loot which container? [?*]';
        while (true) {
            await display.putstr_message(prompt);
            const ch = await nhgetch();
            const c = String.fromCharCode(ch);
            if (ch === 27 || ch === 10 || ch === 13 || ch === 32) {
                display.topMessage = null;
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            container = invContainers.find((o) => o.invlet === c);
            if (container) break;
        }
        display.topMessage = null;
    }

    // cf. pickup.c doloot_core() — "Do you want to take things out of <x>? [yn]"
    const containerName = doname(container, player);
    await display.putstr_message(`Do you want to take things out of your ${containerName}? [yn] `);
    const ans = await nhgetch();
    display.topMessage = null;
    if (String.fromCharCode(ans) !== 'y') {
        await display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }

    const contents = getContainerContents(container);
    if (contents.length === 0) {
        await display.putstr_message("It's empty.");
        return { moved: false, tookTime: true };
    }
    for (const item of contents) {
        player.addToInventory(item);
        observeObject(item);
    }
    setContainerContents(container, []);
    await announceLootedItems(display, player, contents, 'take out');
    return { moved: false, tookTime: true };
}

// C ref: shk.c dopay() — stub; full billing flow not yet ported.
async function handlePay(player, map, display) {
    // C ref: shk.c dopay() can still report "There appears..." even when
    // shopkeepers exist elsewhere on level; our billing-state model is partial,
    // so keep the C-safe no-shopkeeper text for strict replay parity.
    await display.putstr_message('There appears to be no shopkeeper here to receive your payment.');
    return { moved: false, tookTime: false };
}

// Toggle autopickup (@)
// C ref: options.c dotogglepickup()
async function handleTogglePickup(game) {
    const { display } = game;

    // Toggle pickup flag
    game.flags.pickup = !game.flags.pickup;

    // Build message matching C NetHack format
    let msg;
    if (game.flags.pickup) {
        const pickupTypes = String(game.flags.pickup_types || '');
        if (pickupTypes.length > 0) {
            msg = `Autopickup: ON, for ${pickupTypes} objects.`;
        } else {
            msg = 'Autopickup: ON, for all objects.';
        }
    } else {
        msg = 'Autopickup: OFF.';
    }

    await display.putstr_message(msg);
    return { moved: false, tookTime: false };
}

export { handlePickup, handleLoot, handlePay, handleTogglePickup, fatal_corpse_mistake, force_decor, deferred_decor, describe_decor, check_here, n_or_more, menu_class_present, add_valid_menu_class, allow_category, allow_cat_no_uchain, check_autopickup_exceptions, autopick_testobj, carry_count, lift_object, pickup_object, pickup_prinv, encumber_msg, container_at, able_to_loot, do_loot_cont, doloot, doloot_core, reverse_loot, loot_mon, do_boh_explosion, in_container, ck_bag, out_container, container_gone, explain_container_prompt, u_handsy, use_container_simple, traditional_loot, menu_loot, choose_tip_container_menu, dotip, tipcontainer, tipcontainer_gettarget, tipcontainer_checks, collect_obj_classes, count_unpaid, count_buc };
