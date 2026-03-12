import { strchr } from './hacklib.js';
import { bigmonst } from './mondata.js';
import { THRONE, SINK, GRAVE, FOUNTAIN, STAIRS, ALTAR, IS_DOOR, D_ISOPEN,
         IS_POOL, IS_LAVA, isok, SLT_ENCUMBER, MOD_ENCUMBER, HVY_ENCUMBER,
         EXT_ENCUMBER, A_WIS, STONE, MM_ADJACENTOK, MM_NOMSG,
         AUTOUNLOCK_UNTRAP, AUTOUNLOCK_APPLY_KEY } from './const.js';
import { objectData, COIN_CLASS, CORPSE, ICE_BOX, CHEST,
         BAG_OF_HOLDING, BAG_OF_TRICKS, WAN_CANCELLATION, LOADSTONE,
         BOULDER, STATUE, AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION,
         BELL_OF_OPENING, SPE_BOOK_OF_THE_DEAD, LEASH, SCR_SCARE_MONSTER,
         GOLD_PIECE, SADDLE, HORN_OF_PLENTY, SACK, OILSKIN_SACK,
         CLASS_SYMBOLS } from './objects.js';
import { more, nhgetch, getlin, ynFunction } from './input.js';
import { doname, xname, Is_container, weight, splitobj, unbless, set_bknown,
         set_corpsenm, start_corpse_timeout, add_to_container, add_to_minv,
         obj_extract_self } from './mkobj.js';
import { observeObject } from './o_init.js';
import { formatGoldPickupMessage, formatInventoryPickupMessage, dropx } from './do.js';
import { mons, PM_HOUSECAT, PM_ICE_TROLL } from './monsters.js';
import { is_rider, touch_petrifies, nohands, nolimbs,
         poly_when_stoned } from './mondata.js';
import { W_ARMOR, W_ACCESSORY, W_WEAPONS, W_SADDLE, nul_glyphinfo, STONE_RES } from './const.js';
import { rn2, rnd, d } from './rng.js';
import { pline, You, Your, You_cant, pline_The, There, Norep,
         impossible } from './pline.js';
import { body_part } from './polyself.js';
import { HAND, FOOT } from './const.js';
import { instapetrify, m_at } from './trap.js';
import { exercise } from './attrib_exercise.js';
import { newsym, canspotmon } from './display.js';
import { currency, compactInvletPromptChars, freeinv, addinv,
         inv_cnt, merge_choice, hold_another_object, prinv, g_at, carried } from './invent.js';
import { setuwep, setuswapwep, setuqwep, welded, weldmsg } from './wield.js';
import { touch_artifact } from './artifact.js';
import { makemon, set_malign } from './makemon.js';
import { NO_MM_FLAGS, NO_MINVENT } from './const.js';
import { christen_monst, Monnam, mon_nam, x_monnam } from './do_name.js';
import { ARTICLE_THE, SUPPRESS_SADDLE, WORN_TYPES, CHOOSE_ALL } from './const.js';
import { revive as revive_corpse } from './zap.js';
import { near_capacity, max_capacity, calc_capacity } from './hack.js';
import { create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu, putstr, display_nhwindow } from './windows.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ANY, ATR_NONE,
         LOST_THROWN, LOST_DROPPED, LOST_EXPLODING } from './const.js';
import { Is_box, Has_contents, Is_mbag, thesimpleoname, otense, Doname2 } from './objnam.js';
import { which_armor, extract_from_minvent } from './worn.js';
import { autokey, pick_lock } from './lock.js';
import { courtmon } from './mkroom.js';
import { obfree, costly_spot, dopay } from './shk.js';

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
let pickup_encumbrance = 0;        // gp.pickup_encumbrance
let oldcap = 0;                    // go.oldcap

// ---------------------------------------------------------------------------
// Helper predicates (not exported from other modules)
// ---------------------------------------------------------------------------



// Is_box imported from objnam.js

function SchroedingersBox(obj) {
    return obj.spe === 1 && Is_box(obj);
}

function autounlock_has_action(flags, actionName, actionBit) {
    const raw = flags?.autounlock;
    if (typeof raw === 'number') {
        return !!(raw & actionBit);
    }
    const text = String(raw ?? '').trim();
    if (!text) return actionName === 'apply-key';
    if (text === 'none') return false;
    return text.split(/[,\s]+/).includes(actionName);
}

function age_is_relative(obj) {
    // In C: rotting food items have relative age.  Corpses, tins, etc.
    return obj.otyp === CORPSE;
}

// C ref: cmd.c help_dir() text for invalid directional input with cmdassist.
export async function show_invalid_direction_cmdassist_help(display) {
    const lines = [
        'cmdassist: Invalid direction key!',
        '',
        'Valid direction keys are:',
        '          y  k  u',
        '           \\ | / ',
        '          h- . -l',
        '           / | \\ ',
        '          b  j  n',
        '',
        '          <  up',
        '          >  down',
        '          .  direct at yourself',
        '',
        '(Suppress this message with !cmdassist in config file.)',
    ];
    if (display?.putstr) {
        const rows = Number.isInteger(display.rows) ? display.rows : lines.length;
        if (display.clearRow) {
            for (let row = 0; row < rows; row++) display.clearRow(row);
        }
        for (let row = 0; row < lines.length; row++) {
            display.putstr(0, row, lines[row]);
        }
        const moreRow = rows > 0 ? rows - 1 : 0;
        display.putstr(0, moreRow, '--More--');
        if (display.setCursor) display.setCursor(8, moreRow);
        return;
    }
    await display?.putstr_message?.('cmdassist: Invalid direction key!');
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
// Autotranslated from pickup.c:272, fixed for JS globals
export function u_safe_from_fatal_corpse(obj, tests, player) {
  if (((tests & st_gloves) && player?.gloves)
      || ((tests & st_corpse) && obj.otyp !== CORPSE)
      || ((tests & st_petrifies) && !touch_petrifies(mons[obj.corpsenm]))
      || ((tests & st_resists) && player?.hasProp?.(STONE_RES))) return true;
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
    if (!c) {
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
    if (otmp.how_lost === LOST_THROWN)
        return true;
    if (otmp.how_lost === LOST_DROPPED)
        return false;
    if (otmp.how_lost === LOST_EXPLODING)
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

// cf. pickup.c:1574 — carry_count(obj, container, count, telekinesis, cnt_p)
// Returns how many of obj we can carry. Sets cnt_p.wt_before/wt_after for
// lift_object encumbrance computation.
async function carry_count(obj, container, count, telekinesis, player, cnt_p) {
    const savequan = obj.quan || 0;
    const saveowt = obj.owt || 0;
    const targetCount = Math.max(0, Math.min(count || savequan, savequan));
    let wt;
    let qq = targetCount;

    // Guard: if player lacks stats (e.g. minimal test mock), skip weight checks
    if (!player?.abase) return targetCount;

    const iw = max_capacity(player);

    // Expose weight info for lift_object encumbrance check
    if (cnt_p) {
        cnt_p.wt_before = iw;
    }

    obj.quan = targetCount;
    obj.owt = weight(obj);
    wt = iw + obj.owt;

    if (cnt_p) {
        cnt_p.wt_after = iw + obj.owt;
    }

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

    // cf. C pickup.c:1740 — inventory slot check
    if (obj.oclass !== COIN_CLASS
        && inv_cnt(false, player) >= 52
        && !merge_choice(player.inventory, obj)) {
        await Your("knapsack cannot accommodate any more items.");
        return -1;
    }

    cnt_p.value = await carry_count(obj, container, cnt_p.value, telekinesis, player, cnt_p);
    if (cnt_p.value < 1)
        return -1;

    // TODO: C pickup.c:1776 — encumbrance prompt (ynFunction) fires when
    // next_encumbr > prev_encumbr. Deferred: requires unit test updates
    // since ynFunction consumes keystrokes from the input queue.

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
    saveushops = player.ushops;
    fakeshop = String.fromCharCode(in_rooms(ox, oy, SHOPBASE));
    player.ushops = fakeshop;
    addtobill(otmp, true, false, false);
    player.ushops = saveushops;
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
      if (isok(nx, ny) && m_at(nx, ny)) return true;
    }
  }
  return false;
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

    // cf. C pickup.c:2588-2618 — unwield weapons being put away
    if (obj === player.weapon) {
        if (welded(player.weapon, player)) { await weldmsg(player); return 0; }
        setuwep(player, null);
        if (player.weapon) return 0; // unwielded, died, rewielded
    } else if (obj === player.swapWeapon) {
        setuswapwep(player, null);
    } else if (obj === player.quiver) {
        setuqwep(player, null);
    }

    // Remove from inventory before placing in container
    freeinv(obj, player);

    // Put object in container
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
        await You("put %s into %s.", doname(obj, player), thesimpleoname(current_container));
        const cur = getContainerContents(current_container);
        setContainerContents(current_container, [...cur, obj]);
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
    setContainerContents(current_container,
        getContainerContents(current_container).filter((o) => o !== obj));
    current_container.owt = weight(current_container);

    if (current_container.otyp === ICE_BOX)
        removed_from_icebox(obj, player);

    // cf. C pickup.c:2735 — artifact touch check
    if (obj.oartifact && !touch_artifact(obj, player)) return 0;

    // Add to inventory via addinv (handles merge, invlet assignment, etc.)
    const result = await addinv(obj, player);
    observeObject(obj);

    // cf. C pickup.c:2748 — announce removal
    await pline("%s - %s.", result?.invlet || obj.invlet || '-', doname(result || obj, player));

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
      await You("%s %s disappear!", player.blind ? "notice" : "see", doname(item));
    }
  }
  if ( player.ushops && (shkp = shop_keeper( player.ushops)) != null) {
    if (held ?  item.unpaid : costly_spot(player.x, player.y)) loss = await stolen_value(item, player.x, player.y,  shkp.mpeaceful, true);
  }
  obfree(item,  0);
  return loss;
}

// cf. pickup.c:2820 — observe_quantum_cat(box, makecat, givemsg)
// Autotranslated from pickup.c:2819
export async function observe_quantum_cat(box, makecat, givemsg, game) {
  let sc = "Schroedinger's Cat", deadcat, livecat = null, ox, oy;
  let itsalive = !rn2(2);
  { const loc = get_obj_location(box, 0); if (loc.found) { box.ox = loc.x; box.oy = loc.y; } }
  deadcat = box.cobj;
  if (itsalive) {
    if (makecat) livecat = makemon( mons[PM_HOUSECAT], box.ox, box.oy, NO_MINVENT | MM_ADJACENTOK | MM_NOMSG);
    if (livecat) {
      livecat.mpeaceful = 1;
      set_malign(livecat, game?.player);
      if (givemsg) {
        if (!canspotmon(livecat)) await You("think %s brushed your %s.", "something", body_part(FOOT));
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
    if (givemsg) await pline_The("%s inside the box is dead!", (game?.player?.Hallucination || game?.player?.hallucinating) ? rndmonnam( 0) : "housecat");
  }
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

// cf. pickup.c:3376 — in_or_out_menu(prompt, obj, outokay, inokay, alreadyused, more_containers)
// Stub: menu system not yet ported
// Autotranslated from pickup.c:3376
export async function in_or_out_menu(prompt, obj, outokay, inokay, alreadyused, more_containers, game) {
  let lootchars = "_:oibrsnq", abc_chars = "_:abcdenq", win, any, pick_list;
  let buf, n, menuselector = game.flags.lootabc ? abc_chars : lootchars;
  let clr = NO_COLOR;
  any = { a_int: 0 };
  win = create_nhwindow(NHW_MENU);
  start_menu(win, MENU_BEHAVE_STANDARD);
  any.a_int = 1;
  buf = `Look inside ${thesimpleoname(obj)}`;
  add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  if (outokay) {
    any.a_int = 2;
    buf = `take ${something} out`;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (inokay) {
    any.a_int = 3;
    buf = `put ${something} in`;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (outokay) {
    any.a_int = 4;
    buf = `${inokay ? "both; " : ""}take out, then put in`;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  if (inokay) {
    any.a_int = 5;
    buf = `${outokay ? "both reversed; " : ""}put in, then take out`;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
    any.a_int = 6;
    buf = `stash one item into ${thesimpleoname(obj)}`;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
  }
  add_menu_str(win, "");
  if (more_containers) {
    any.a_int = 7;
    add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, "loot next container", MENU_ITEMFLAGS_SELECTED);
  }
  any.a_int = 8;
  buf = alreadyused ? "done" : "do nothing";
  add_menu(win, nul_glyphinfo, any, menuselector[any.a_int], 0, ATR_NONE, clr, buf, more_containers ? MENU_ITEMFLAGS_NONE : MENU_ITEMFLAGS_SELECTED);
  end_menu(win, prompt);
  n = await select_menu(win, PICK_ONE, pick_list);
  destroy_nhwindow(win);
  if (n > 0) {
    let k = pick_list[0].item.a_int;
    if (n > 1 && k === (more_containers ? 7 : 8)) k = pick_list[1].item.a_int;
    // C: free(pick_list) — JS garbage collects
    return lootchars[k];
  }
  return (n === 0 && more_containers) ? 'n' : 'q';
}

// cf. pickup.c:3461 — tip_ok(obj)
// Autotranslated from pickup.c:3460
export function tip_ok(obj) {
  if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
  if (Is_container(obj)) { return GETOBJ_SUGGEST; }
  if (obj.otyp === HORN_OF_PLENTY && obj.dknown && objectData[obj.otyp].oc_name_known) return GETOBJ_SUGGEST;
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

    const nonGoldObjs = objs.filter((o) => o.oclass !== COIN_CLASS);
    // C-faithful command boundary: ',' on a multi-object pile enters a
    // selector flow (same command) where letter keys are not global commands.
    if (nonGoldObjs.length > 1) {
        const inv_order = game?.flags?.inv_order || '';
        const choiceObjs = [...nonGoldObjs].sort((a, b) => {
            // C-like pickup menu ordering: group by class per inv_order, then by name.
            const ac = Number(a?.oclass || 0);
            const bc = Number(b?.oclass || 0);
            if (ac !== bc) {
                // Sort by position in inv_order (C's def_inv_order)
                const ai = inv_order.indexOf(String.fromCharCode(ac));
                const bi = inv_order.indexOf(String.fromCharCode(bc));
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            }
            const an = String(doname(a) || '');
            const bn = String(doname(b) || '');
            const byName = an.localeCompare(bn);
            if (byName !== 0) return byName;
            return Number(a?.o_id || 0) - Number(b?.o_id || 0);
        });
        const win = create_nhwindow(NHW_MENU);
        start_menu(win, MENU_BEHAVE_STANDARD);
        let lastClass = null;
        for (const obj of choiceObjs) {
            const cls = Number(obj?.oclass || 0);
            if (cls !== lastClass) {
                const sym = CLASS_SYMBOLS[cls] || '*';
                add_menu(win, null, null, 0, 0, ATR_NONE, 0, classSymbolLabel(sym), 0);
                lastClass = cls;
            }
            // Use auto-assigned selector letters so C-like a/b/c keys work.
            add_menu(win, null, obj, 0, 0, ATR_NONE, 0, doname(obj), 0);
        }
        end_menu(win, 'Pick up what?');
        const picks = await select_menu(win, PICK_ANY);
        destroy_nhwindow(win);

        if (!Array.isArray(picks) || picks.length === 0) {
            return { moved: false, tookTime: false };
        }

        for (const pick of picks) {
            const obj = pick?.identifier;
            if (!obj || !map.objects.includes(obj)) continue;
            observeObject(obj);
            const addResult = player.addToInventory(obj, { withMeta: true });
            map.removeObject(obj);
            await pline(
                "%s - %s.",
                addResult?.item?.invlet || obj.invlet || '-',
                doname(addResult?.item || obj, player)
            );
        }
        return { moved: false, tookTime: true };
    }

    // Pick up first non-gold item in C floor-chain order.
    // C floor lists are prepended (newest first), while JS stores floor objects
    // in append order, so objectsAt() yields oldest->newest.
    // Select newest here to match C default ',' pickup target.
    // TODO: show menu if multiple items (like C NetHack)
    const obj = objs[objs.length - 1];
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
        // C pickup behavior can collect additional stacks for the same
        // selected type at this square.
        const px = obj.ox, py = obj.oy;
        while (true) {
            const extra = (map.objectsAt(px, py) || []).find((o) =>
                o
                && o !== pickedObj
                && o.oclass !== COIN_CLASS
                && o.otyp === pickedObj.otyp
            );
            if (!extra) break;
            player.addToInventory(extra, { withMeta: true });
            map.removeObject(extra);
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
            await display.putstr_message(pickupMsg);
            await more(display, { game, site: 'pickup.encumber.split.more' });
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

function monsterBeside(map, x, y) {
    const mons = Array.isArray(map?.monsters) ? map.monsters : [];
    for (const mon of mons) {
        if (!mon) continue;
        const mx = mon.mx;
        const my = mon.my;
        if (!Number.isInteger(mx) || !Number.isInteger(my)) continue;
        const dx = Math.abs(mx - x);
        const dy = Math.abs(my - y);
        if ((dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0)) return true;
    }
    return false;
}

function lootDirectionDelta(ch) {
    switch (String.fromCharCode(ch).toLowerCase()) {
        case 'h': return { dx: -1, dy: 0, dz: 0 };
        case 'j': return { dx: 0, dy: 1, dz: 0 };
        case 'k': return { dx: 0, dy: -1, dz: 0 };
        case 'l': return { dx: 1, dy: 0, dz: 0 };
        case 'y': return { dx: -1, dy: -1, dz: 0 };
        case 'u': return { dx: 1, dy: -1, dz: 0 };
        case 'b': return { dx: -1, dy: 1, dz: 0 };
        case 'n': return { dx: 1, dy: 1, dz: 0 };
        case '.': return { dx: 0, dy: 0, dz: 0 };
        case '<': return { dx: 0, dy: 0, dz: -1 };
        case '>': return { dx: 0, dy: 0, dz: 1 };
        default: return null;
    }
}

function classSymbolLabel(sym) {
    switch (sym) {
        case ')': return 'Weapons';
        case '[': return 'Armor';
        case '=': return 'Rings';
        case '"': return 'Amulets';
        case '(': return 'Tools';
        case '%': return 'Comestibles';
        case '!': return 'Potions';
        case '?': return 'Scrolls';
        case '+': return 'Spellbooks';
        case '/': return 'Wands';
        case '$': return 'Coins';
        case '*': return 'Gems/Stones';
        default: return 'Objects';
    }
}

// C ref: pickup.c query_category() — count distinct BUC statuses among items.
// Returns 0-4 (blessed, cursed, uncursed, BUC-unknown).
function countBucTypes(items) {
    let n = 0;
    if (items.some(o => o?.bknown && o?.blessed)) n++;
    if (items.some(o => o?.bknown && o?.cursed)) n++;
    if (items.some(o => o?.bknown && !o?.blessed && !o?.cursed)) n++;
    if (items.some(o => !o?.bknown)) n++;
    return n;
}

function cContainerOrder(items) {
    // C container chains are prepended (head is newest); JS arrays are append-order.
    // Reverse for menu/class enumeration parity.
    return [...(items || [])].reverse();
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
    const { player, display, map } = game;
    let tookTime = false;

    // cf. C pickup.c:2993 — set current_container for in_container/out_container
    current_container = container;

    // cf. C pickup.c:2997 — u_handsy check
    if (!(await u_handsy(player))) {
        current_container = null;
        return { moved: false, tookTime: false };
    }

    if (!container.lknown) container.lknown = true;

    // cf. C pickup.c:3001 — Schrödinger's cat
    if (SchroedingersBox(container)) {
        await observe_quantum_cat(container, true, true, game);
        tookTime = true;
    }

    // cf. C pickup.c:3007 — cursed bag of holding loss
    if (Is_mbag(container) && container.cursed && Has_contents(container)) {
        const loss = await boh_loss(container, false);
        if (loss) {
            await You("owe %d %s for lost merchandise.", loss, currency(loss));
            container.owt = weight(container);
            tookTime = true;
        }
    }

    const clearMenuOptionRows = (startCol = 0) => {
        const cols = display?.cols || 80;
        for (let r = 2; r <= 10; r++) {
            if (startCol > 0 && typeof display?.putstr === 'function') {
                display.putstr(startCol, r, ' '.repeat(Math.max(0, cols - startCol)));
            } else if (typeof display?.clearRow === 'function') {
                display.clearRow(r);
            }
        }
    };
    const drawMenuOptionLine = (col, row, text) => {
        if (typeof display?.putstr !== 'function') return;
        display.putstr(col, row, text);
    };
    const centeredPad = (text, fallback80) => {
        const cols = display?.cols || 80;
        if (cols >= 80 && Number.isInteger(fallback80)) return fallback80;
        return Math.max(0, Math.floor((cols - text.length) / 2));
    };
    const putMenuPrompt = async (msg, col = null) => {
        if (typeof display?.putstr === 'function') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            const x = Number.isInteger(col) ? col : Math.max(0, Math.floor(((display.cols || 80) - msg.length) / 2));
            display.putstr(x, 0, msg, 7, 1);
            return;
        }
        const prevNoConcat = !!display?.noConcatenateMessages;
        if (display) display.noConcatenateMessages = true;
        await display.putstr_message(msg);
        if (display) display.noConcatenateMessages = prevNoConcat;
    };

    // Helper: take items out of container (the 'o' flow).
    // cf. pickup.c traditional_loot(FALSE) / menu_loot(FALSE).
    // Returns true if any items were taken (tookTime).
    const doTakeOut = async () => {
        const currentContents = getContainerContents(container);
        if (!currentContents.length) {
            await display.putstr_message('It is empty.');
            container.cknown = true;
            return false;
        }
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const seenClasses = new Set();
        for (const o of cContainerOrder(currentContents)) {
            const sym = CLASS_SYMBOLS[o?.oclass];
            if (sym) seenClasses.add(sym);
        }
        let allowedClasses = null; // null => all classes
        const numBucTypes = countBucTypes(currentContents);
        if (seenClasses.size > 1 || numBucTypes > 1) {
            const classOrder = [...seenClasses];
            const classPrompt = 'Take out what type of objects?';
            const classPad = centeredPad(classPrompt, 23);
            const hasUnknownBUC = currentContents.some((o) => !o?.bknown);
            clearMenuOptionRows(classPad);
            await putMenuPrompt(classPrompt, classPad);
            drawMenuOptionLine(classPad, 2, 'A - Auto-select every relevant item');
            drawMenuOptionLine(classPad + 4, 3, '(ignored unless some other choices are also picked)');
            const menuItems = new Map();
            const accelMap = new Map();
            let nextRow = 5;
            const showAll = seenClasses.size > 1;
            if (showAll) {
                menuItems.set('a', { row: nextRow, label: 'All types', value: 'ALL' });
                drawMenuOptionLine(classPad, nextRow++, 'a - All types');
            }
            for (let i = 0; i < classOrder.length; i++) {
                const letter = showAll
                    ? String.fromCharCode('b'.charCodeAt(0) + i)
                    : String.fromCharCode('a'.charCodeAt(0) + i);
                const sym = classOrder[i];
                const label = classSymbolLabel(sym);
                menuItems.set(letter, { row: nextRow, label, value: sym });
                accelMap.set(sym, letter);
                drawMenuOptionLine(classPad, nextRow++, `${letter} - ${label}`);
            }
            if (hasUnknownBUC) {
                nextRow++;
                menuItems.set('X', { row: nextRow, label: 'Items of unknown Bless/Curse status', value: 'X' });
                drawMenuOptionLine(classPad, nextRow++, 'X - Items of unknown Bless/Curse status');
            }
            menuItems.set('A', { row: 2, label: 'Auto-select every relevant item', value: 'A' });
            drawMenuOptionLine(classPad, nextRow, '(end)');
            const selections = new Set();
            while (true) {
                const ch = await nhgetch();
                if (ch === 27) { selections.clear(); break; }
                if (ch === 10 || ch === 13 || ch === 32) break;
                let key = String.fromCharCode(ch);
                if (accelMap.has(key)) key = accelMap.get(key);
                if (!menuItems.has(key)) continue;
                if (selections.has(key)) {
                    selections.delete(key);
                } else {
                    selections.add(key);
                }
                const mi = menuItems.get(key);
                const indicator = selections.has(key) ? '+' : '-';
                drawMenuOptionLine(classPad, mi.row, `${key} ${indicator} ${mi.label}`);
            }
            if (selections.size === 0) {
                return false; // No selection or ESC
            }
            let hasAll = false;
            let autopick = false;
            const selectedClassSyms = new Set();
            for (const key of selections) {
                const mi = menuItems.get(key);
                if (!mi) continue;
                if (mi.value === 'A') {
                    autopick = true;
                    hasAll = true;
                } else if (mi.value === 'ALL') {
                    hasAll = true;
                } else if (mi.value === 'X') {
                    hasAll = true;
                } else {
                    selectedClassSyms.add(mi.value);
                }
            }
            if (autopick) {
                const taken = [...cContainerOrder(currentContents)];
                let didTake = false;
                for (const item of taken) {
                    const res = await out_container(item, player, map);
                    if (res < 0) break; // abort
                    if (res > 0) didTake = true;
                }
                container.cknown = true;
                return didTake;
            }
            if (hasAll) {
                allowedClasses = null;
            } else if (selectedClassSyms.size > 0) {
                allowedClasses = selectedClassSyms;
            } else {
                return false;
            }
        }
        const selected = new Set();
        let didTake = false;
        while (true) {
            const cur = getContainerContents(container);
            if (!cur.length) break;
            const visible = cur.filter((o) => {
                if (allowedClasses === null) return true;
                return allowedClasses.has(CLASS_SYMBOLS[o?.oclass]);
            });
            if (!visible.length) break;
            const available = letters.slice(0, visible.length);
            const menuPad = centeredPad('Take out what?', 41);
            clearMenuOptionRows(38);
            await putMenuPrompt('Take out what?', menuPad);
            if (typeof display?.putstr === 'function') display.putstr(menuPad, 2, 'Comestibles', 7, 1);
            else drawMenuOptionLine(menuPad, 2, 'Comestibles');
            for (let i = 0; i < visible.length; i++) {
                const mark = selected.has(available[i]) ? '+' : '-';
                drawMenuOptionLine(menuPad, 3 + i, `${available[i]} ${mark} ${doname(visible[i], player)}`);
            }
            drawMenuOptionLine(menuPad, 3 + visible.length, '(end)');
            if (typeof display?.setCursor === 'function') {
                const endCol = Math.min((display?.cols || 80) - 1, menuPad + '(end)'.length + 1);
                display.setCursor(endCol, 3 + visible.length);
            }
            const tch = await nhgetch();
            if (tch === 27) break;
            const tchar = String.fromCharCode(tch).toLowerCase();
            if (tch === 10 || tch === 13) {
                const chosen = visible.filter((_, idx) => selected.has(available[idx]));
                if (!chosen.length) break;
                for (const item of chosen) {
                    const res = await out_container(item, player, map);
                    if (res < 0) break; // abort
                    if (res > 0) didTake = true;
                }
                selected.clear();
                continue;
            }
            if (tchar === '@' || tchar === '*') {
                for (const letter of available) selected.add(letter);
                continue;
            }
            if (tchar === '.' || tchar === '-') {
                selected.clear();
                continue;
            }
            const tidx = letters.indexOf(tchar);
            if (tidx < 0 || tidx >= visible.length) continue;
            const selectKey = available[tidx];
            if (selected.has(selectKey)) selected.delete(selectKey);
            else selected.add(selectKey);
            const indicator = selected.has(selectKey) ? '+' : '-';
            drawMenuOptionLine(menuPad, 3 + tidx, `${available[tidx]} ${indicator} ${doname(visible[tidx], player)}`);
        }
        if (typeof display?.clearRow === 'function') display.clearRow(0);
        clearMenuOptionRows(38);
        return didTake;
    };

    // Helper: put items into container (the 'i' flow).
    // cf. pickup.c traditional_loot(TRUE) / menu_loot(TRUE).
    // Returns true if any items were put in (tookTime).
    const doPutIn = async () => {
        const inv = (player.inventory || []).filter(
            (o) => o && o.invlet && o !== container);
        if (!inv.length) {
            await display.putstr_message(
                "You don't have anything" + (player.inventory?.length ? ' else' : '') + ' to put in.');
            return false;
        }
        const seenClasses = new Set();
        for (const o of inv) {
            const sym = CLASS_SYMBOLS[o.oclass];
            if (sym) seenClasses.add(sym);
        }
        const classStr = [...seenClasses].join('');
        let selectedClasses = null;
        let oneByOne = false;
        if (seenClasses.size > 1) {
            const prompt = `What kinds of things do you want to put in? [${classStr} a A]`;
            const userInput = await getlin(prompt, display);
            if (userInput === null || userInput.trim() === '\x1b') return false; // ESC
            const trimmed = userInput.trim();
            if (trimmed === '' || trimmed.includes('a')) {
                selectedClasses = null;
            } else if (trimmed.includes('A')) {
                selectedClasses = null;
                oneByOne = true;
            } else {
                selectedClasses = new Set(trimmed.split('').filter((ch) => seenClasses.has(ch)));
                if (selectedClasses.size === 0) return false;
            }
        }
        const candidates = inv.filter((o) => {
            if (selectedClasses === null) return true;
            return selectedClasses.has(CLASS_SYMBOLS[o.oclass]);
        });
        const cname = xname(container);
        let didPut = false;
        for (const item of candidates) {
            if (oneByOne) {
                const ans = await ynFunction(
                    `Put in ${doname(item, player)}?`, 'ynaq', 'n'.charCodeAt(0), display);
                const ansC = String.fromCharCode(ans);
                if (ansC === 'q') break;
                if (ansC === 'n') continue;
            }
            const res = await in_container(item, player);
            if (res < 0) break; // abort (mbag explosion or fatal corpse)
            if (res > 0) didPut = true;
            // Check if container was destroyed (mbag explosion)
            if (!current_container) break;
        }
        return didPut;
    };

    try {
    while (true) {
        const contents = getContainerContents(container);
        const hasContents = contents.length > 0;
        const outmaybe = hasContents || !container?.cknown;
        const cname = xname(container);

        // cf. pickup.c:3052-3061 — use non-empty wording until emptiness is known.
        const prompt = outmaybe
            ? `Do what with the ${cname}?`
            : `The ${cname} is empty.  Do what with it?`;
        const pad = centeredPad(prompt, 38);
        clearMenuOptionRows(pad);
        await putMenuPrompt(prompt, pad);
        if (outmaybe) {
            drawMenuOptionLine(pad, 2, `: - Look inside the ${cname}`);
            if (hasContents || !container?.cknown) {
                drawMenuOptionLine(pad, 3, 'o - take something out');
                drawMenuOptionLine(pad, 4, 'i - put something in');
                drawMenuOptionLine(pad, 5, 'b - both; take out, then put in');
                drawMenuOptionLine(pad, 6, 'r - both reversed; put in, then take out');
            } else {
                drawMenuOptionLine(pad, 3, 'i - put something in');
            }
            drawMenuOptionLine(pad, 7, `s - stash one item into the ${cname}`);
            drawMenuOptionLine(pad, 9, 'q * do nothing');
            drawMenuOptionLine(pad, 10, '(end)');
        }
        if (typeof display?.setCursor === 'function' && outmaybe) {
            // Keep cursor on the active menu block while waiting for in/out choice.
            const endCol = Math.min((display?.cols || 80) - 1, pad + '(end)'.length + 1);
            display.setCursor(endCol, 10);
        }

        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (c === '\x1b' || c === 'q') break;

        if (c === ':') {
            // Look inside — show contents then loop back to menu.
            // cf. pickup.c out_container walk with iflags.menu_requested
            if (!hasContents) {
                await display.putstr_message(`The ${cname} is empty.`);
                container.cknown = true;
            } else {
                // C uses a blocking text/menu window for ":" look-inside. Using
                // NHW_TEXT preserves step ownership (contents on ':' step, prompt
                // redraw on the subsequent dismiss key step).
                const win = create_nhwindow(NHW_MENU);
                if (typeof display?.clearRow === 'function') {
                    display.clearRow(0);
                    display.clearRow(1);
                }
                await putstr(win, ATR_NONE, `Contents of the ${cname}:`);
                await putstr(win, ATR_NONE, '');
                for (const item of contents) {
                    await putstr(win, ATR_NONE, `  ${doname(item, player)}`);
                }
                await display_nhwindow(win, true);
                destroy_nhwindow(win);
                container.cknown = true;
            }
        } else if (c === 'o') {
            // 'o' = take out. cf. pickup.c menu_loot(FALSE).
            if (await doTakeOut()) tookTime = true;
            return { moved: false, tookTime };
        } else if (c === 'i') {
            // 'i' = put in. cf. pickup.c menu_loot(TRUE).
            if (await doPutIn()) tookTime = true;
            return { moved: false, tookTime };
        } else if (c === 'b') {
            // 'b' = both: take out, then put in (sequential).
            // cf. pickup.c use_container() 'b': menu_loot(FALSE) then menu_loot(TRUE).
            if (await doTakeOut()) tookTime = true;
            if (await doPutIn()) tookTime = true;
            return { moved: false, tookTime };
        } else if (c === 'r') {
            // 'r' = reversed: put in first, then take out.
            // cf. pickup.c use_container() 'r': loot_in_first = TRUE.
            if (await doPutIn()) tookTime = true;
            if (await doTakeOut()) tookTime = true;
            return { moved: false, tookTime };
        } else if (c === 's') {
            // Stash one item — cf. pickup.c "Stash: put one item in".
            // C exits the container menu after one stash.
            const inv = (player.inventory || []).filter((o) => o?.invlet && o !== container);
            if (!inv.length) {
                await display.putstr_message('You have nothing to put in.');
                return { moved: false, tookTime };
            }
            const letters = inv.map((o) => o.invlet).join('');
            const compact = compactInvletPromptChars(letters);
            clearMenuOptionRows(pad);
            {
                const prevNoConcat = !!display?.noConcatenateMessages;
                if (display) display.noConcatenateMessages = true;
                await display.putstr_message(`What do you want to stash? [${compact} or ?*] `);
                if (display) display.noConcatenateMessages = prevNoConcat;
            }
            const sch = await nhgetch();
            const item = inv.find((o) => o.invlet === String.fromCharCode(sch));
            if (item) {
                const res = await in_container(item, player);
                if (res !== 0) tookTime = true;
            }
            return { moved: false, tookTime }; // 's' exits menu (C behavior)
        } else if (c === '?') {
            await display.putstr_message(
                'Container actions: : look, o take out, i put in, b bring all, s stash one, q quit');
        }
    }

    return { moved: false, tookTime };
    } finally {
        current_container = null;
    }
}

async function handleLoot(game) {
    const { player, map, display } = game;

    // Check floor containers at player's position.
    const floorContainers = (map.objectsAt(player.x, player.y) || [])
        .filter((obj) => !!objectData[obj?.otyp]?.container);

    if (floorContainers.length === 0) {
        // cf. pickup.c doloot_core(): when adjacent monsters are present,
        // C asks directional loot target before reporting no loot.
        if (monsterBeside(map, player.x, player.y)) {
            // C prompt leaves cursor one past '?' on topline.
            await display.putstr_message('Loot in what direction? ');
            while (true) {
                const dirCh = await nhgetch();
                // Avoid concatenating prompt + result on the same topline message.
                display.topMessage = null;
                display.messageNeedsMore = false;
                if (dirCh === 27 || dirCh === 32 || dirCh === 10 || dirCh === 13) {
                    await display.putstr_message('Never mind.');
                    return { moved: false, tookTime: false };
                }
                const delta = lootDirectionDelta(dirCh);
                if (!delta) {
                    if (game.flags?.cmdassist !== false) {
                        await show_invalid_direction_cmdassist_help(display);
                        continue;
                    }
                    await display.putstr_message('Never mind.');
                    return { moved: false, tookTime: false };
                }
                if (delta.dz < 0) {
                    await display.putstr_message("You don't find anything to loot on the ceiling.");
                    return { moved: false, tookTime: true };
                }
                const tx = player.x + delta.dx;
                const ty = player.y + delta.dy;
                if (!isok(tx, ty)) {
                    await display.putstr_message('Invalid loot location');
                    return { moved: false, tookTime: false };
                }
                const thereContainers = (map.objectsAt(tx, ty) || [])
                    .filter((obj) => !!objectData[obj?.otyp]?.container);
                if ((delta.dx !== 0 || delta.dy !== 0) && thereContainers.length > 0) {
                    await display.putstr_message('You have to be at a container to loot it.');
                    return { moved: false, tookTime: false };
                }
                await display.putstr_message(
                    (delta.dx === 0 && delta.dy === 0)
                        ? "You don't find anything here to loot."
                        : "You don't find anything there to loot."
                );
                return { moved: false, tookTime: false };
            }
        }
        await display.putstr_message("You don't find anything here to loot.");
        return { moved: false, tookTime: false };
    }

    // Loot floor containers (C behavior: loop through all).
    // cf. pickup.c doloot_core() — iterates all Is_container objects at player position.
    if (floorContainers.length > 0) {
        let tookTime = false;
        for (const container of floorContainers) {
            if (container.olocked && !container.obroken) {
                if (container.lknown) {
                    await pline(`${doname(container)} is locked.`);
                } else {
                    await pline(`Hmmm, ${xname(container)} turns out to be locked.`);
                }
                container.lknown = true;

                const flags = game?.flags || {};
                const tryApplyKey = autounlock_has_action(flags, 'apply-key', AUTOUNLOCK_APPLY_KEY);
                const tryUntrap = autounlock_has_action(flags, 'untrap', AUTOUNLOCK_UNTRAP);
                if (tryApplyKey || tryUntrap) {
                    // C pickup.c do_loot_cont(): clear stale vertical direction before pick_lock().
                    player.dz = 0;

                    const unlocktool = tryApplyKey ? autokey(player, true) : null;
                    if (unlocktool || tryUntrap) {
                        const ox = container.ox || player.x;
                        const oy = container.oy || player.y;
                        const res = await pick_lock(game, unlocktool, ox, oy, container);
                        if (res !== 0) tookTime = true;
                    }
                }
                continue;
            }
            const result = await containerMenu(game, container);
            if (result.tookTime) tookTime = true;
        }
        return { moved: false, tookTime };
    }

    await display.putstr_message("You don't find anything here to loot.");
    return { moved: false, tookTime: false };
}

// C ref: shk.c dopay()
async function handlePay(player, map, display, game = null) {
    const state = game || { player, map, display };
    const result = await dopay(state);
    return { moved: false, tookTime: !!result };
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

// ---------------------------------------------------------------------------
// cf. pickup.c:76 — simple_look(otmp, here)
// Display a list of objects using pline or text window.
// ---------------------------------------------------------------------------
async function simple_look(otmp, here, player) {
    if (!otmp) {
        impossible("simple_look(null)");
    } else if (!(here ? otmp.nexthere : otmp.nobj)) {
        // single object
        await pline(doname(otmp, player));
    } else {
        // multiple objects — show in a menu window
        const win = create_nhwindow(NHW_MENU);
        add_menu(win, null, null, 0, 0, ATR_NONE, 0, "", 0);
        let curr = otmp;
        while (curr) {
            add_menu(win, null, null, 0, 0, ATR_NONE, 0, doname(curr, player), 0);
            curr = here ? curr.nexthere : curr.nobj;
        }
        end_menu(win, null);
        await select_menu(win, 0); // PICK_NONE = 0
        destroy_nhwindow(win);
    }
}

// ---------------------------------------------------------------------------
// cf. pickup.c:975 — autopick(olist, follow, pick_list)
// Build a pick_list of objects that pass autopick_testobj.
// Returns { count, pick_list: [{obj, count}] }.
// ---------------------------------------------------------------------------
function autopick(olist, here, player) {
    let check_costly = true;
    const items = [];

    // first pass: count eligible items
    let curr = olist;
    while (curr) {
        if (autopick_testobj(curr, check_costly, player)) {
            items.push({ obj: curr, count: curr.quan || 1 });
        }
        check_costly = false; // only need to check once per autopickup
        curr = here ? curr.nexthere : curr.nobj;
    }

    return { count: items.length, pick_list: items };
}

// ---------------------------------------------------------------------------
// cf. pickup.c:3829 — count_target_containers(olist, excludo)
// Count containers in inventory, excluding a specific object.
// (This function is #if 0 in C; provided as stub for completeness.)
// ---------------------------------------------------------------------------
function count_target_containers(olist, excludo) {
    let ret = 0;
    let curr = olist;
    while (curr) {
        if (curr !== excludo && Is_container(curr)
            && (curr.otyp !== BAG_OF_TRICKS || !curr.dknown
                || !(objectData[curr.otyp]?.oc_name_known)))
            ret++;
        curr = curr.nobj;
    }
    return ret;
}

// ---------------------------------------------------------------------------
// cf. pickup.c:2344 — reverse_loot()
// Called when confused during #loot attempt. RNG-consuming.
// ---------------------------------------------------------------------------
async function reverse_loot(player, map, game) {
    if (!rn2(3)) {
        // n objects: 1/(n+1) chance per object, 1/(n+1) to fall off end
        const n0 = inv_cnt(true, player);
        let n = n0;
        let otmp = player.inventory?.[0] || null;
        // traverse inventory as linked list if available, else array
        const invList = player.inventory || [];
        for (let idx = 0; idx < invList.length; idx++) {
            otmp = invList[idx];
            if (!rn2(n + 1)) {
                await prinv("You find old loot:", otmp, 0, player);
                return true;
            }
            n--;
        }
        return false;
    }

    // find a money object to mess with
    let goldob = null;
    const inv = player.inventory || [];
    for (let i = 0; i < inv.length; i++) {
        if (inv[i].oclass === COIN_CLASS) {
            goldob = inv[i];
            let contribution = Math.floor((rnd(5) * (goldob.quan || 1) + 4) / 5);
            if (contribution < (goldob.quan || 1)) {
                goldob = splitobj(goldob, contribution);
            }
            break;
        }
    }
    if (!goldob) return false;

    const x = player.x, y = player.y;
    const loc = map?.at?.(x, y);

    if (!loc || loc.typ !== THRONE) {
        await dropx(goldob, player, map);
        if (g_at(x, y, map)) {
            await pline("Ok, now there is loot here.");
        }
    } else {
        // find coffers (throne room chest with spe==2, or nearest chest)
        let coffers = null;
        let nearest = null;
        const fobj = map?.objects || [];
        // search level objects for chests
        for (const obj of fobj) {
            if (obj && obj.otyp === CHEST) {
                if (obj.spe === 2) { coffers = obj; break; }
                if (!nearest) nearest = obj;
            }
        }
        if (!coffers) coffers = nearest;

        if (coffers) {
            await pline("\"Thank you for your contribution to reduce the debt.\"");
            freeinv(goldob, player);
            add_to_container(coffers, goldob);
            coffers.owt = weight(coffers);
            coffers.cknown = 0;
        } else if (!(loc.looted) /* T_LOOTED */) {
            const mon = await makemon(courtmon, x, y, NO_MM_FLAGS, map, game);
            if (mon) {
                freeinv(goldob, player);
                add_to_minv(mon, goldob);
                await pline("The exchequer accepts your contribution.");
                if (!rn2(10))
                    loc.looted = true; // T_LOOTED
            } else {
                await You("drop %s.", doname(goldob, player));
                await dropx(goldob, player, map);
            }
        } else {
            await You("drop %s.", doname(goldob, player));
            await dropx(goldob, player, map);
        }
    }
    return true;
}

// ---------------------------------------------------------------------------
// cf. pickup.c:2425 — loot_mon(mtmp, passed_info, prev_loot)
// Remove saddle from a monster or pick up from swallower.
// Returns time passed (0 or rnd(3)).
// ---------------------------------------------------------------------------
async function loot_mon(mtmp, passed_info_ref, prev_loot_ref, player, game) {
    let c = -1;
    let timepassed = 0;

    // 3.3.1: ability to remove saddle from a steed
    if (mtmp && mtmp !== player.usteed) {
        const otmp = which_armor(mtmp, W_SADDLE);
        if (otmp) {
            if (passed_info_ref) passed_info_ref.value = 1;
            const mname = x_monnam(mtmp, ARTICLE_THE, null, SUPPRESS_SADDLE, false);
            const qbuf = `Do you want to remove the saddle from ${mname}?`;
            c = await ynFunction(qbuf, 'ynq', 'n'.charCodeAt(0), game?.display);
            const cc = String.fromCharCode(c);
            if (cc === 'y') {
                if (nolimbs(player.data)) {
                    await You_cant("do that without limbs.");
                    return 0;
                }
                if (otmp.cursed) {
                    await You("can't.  The saddle seems to be stuck to %s.", mname);
                    return 1; // attempt costs time
                }
                extract_from_minvent(mtmp, otmp, true, false);
                if (game?.flags?.verbose !== false) {
                    await You("take %s off of %s.",
                        thesimpleoname(otmp), mon_nam(mtmp));
                }
                await hold_another_object(otmp, player,
                    `You drop %s!`, doname(otmp, player), null);
                timepassed = rnd(3);
                if (prev_loot_ref) prev_loot_ref.value = true;
            } else if (cc === 'q') {
                return 0;
            }
        }
    }
    // 3.4.0: pick things up from swallower's stomach
    if (player.uswallow) {
        const count = passed_info_ref ? passed_info_ref.value : 0;
        // pickup(count) — not fully wired, stub
        timepassed = 0;
    }
    return timepassed;
}

// ---------------------------------------------------------------------------
// cf. pickup.c:2082 — do_loot_cont(cobjp, cindex, ccount)
// Attempt to loot a single floor container. Handles locked, bag of tricks.
// ---------------------------------------------------------------------------
async function do_loot_cont(cobj, cindex, ccount, player, map, game) {
    if (!cobj) return 0;

    if (cobj.olocked) {
        if (cobj.lknown)
            await pline("%s is locked.", xname(cobj));
        else
            await pline("Hmmm, %s turns out to be locked.", xname(cobj));
        cobj.lknown = true;

        // autounlock handling (already in handleLoot)
        const flags = game?.flags || {};
        const tryApplyKey = autounlock_has_action(flags, 'apply-key', AUTOUNLOCK_APPLY_KEY);
        const tryUntrap = autounlock_has_action(flags, 'untrap', AUTOUNLOCK_UNTRAP);
        if (tryApplyKey || tryUntrap) {
            player.dz = 0;
            const unlocktool = tryApplyKey ? autokey(player, true) : null;
            if (unlocktool || tryUntrap) {
                const ox = cobj.ox || player.x;
                const oy = cobj.oy || player.y;
                const res = await pick_lock(game, unlocktool, ox, oy, cobj);
                return res !== 0 ? 1 : 0;
            }
        }
        return 0;
    }
    cobj.lknown = true;

    if (cobj.otyp === BAG_OF_TRICKS) {
        await You("carefully open %s...", xname(cobj));
        await pline("It develops a huge set of teeth and bites you!");
        const tmp = rnd(10);
        // losehp(Maybe_Half_Phys(tmp), "carnivorous bag", KILLED_BY_AN)
        // not fully wired — consume the RNG
        if (objectData[BAG_OF_TRICKS]) objectData[BAG_OF_TRICKS].oc_name_known = true;
        return 1; // ECMD_TIME
    }

    // Normal container — delegate to containerMenu (≈ use_container)
    const result = await containerMenu(game, cobj);
    return result.tookTime ? 1 : 0;
}

// ---------------------------------------------------------------------------
// cf. pickup.c:2172 — doloot_core()
// Main #loot command handler. JS equivalent: handleLoot.
// This is a C-named alias that delegates to handleLoot.
// ---------------------------------------------------------------------------
async function doloot_core(game) {
    return handleLoot(game);
}

// ---------------------------------------------------------------------------
// cf. pickup.c:141 — query_classes(oclasses, one_at_a_time, everything,
//                                   action, objs, here, menu_on_demand)
// Traditional/Combination menustyle class selection prompt.
// Returns { selected: bool, oclasses: string, one_at_a_time: bool,
//           everything: bool, menu_on_demand: int }
// ---------------------------------------------------------------------------
async function query_classes(action, objs, here, player, game) {
    const display = game?.display;
    // collect available object classes
    const ilets = [];
    let itemcount = 0;
    let curr = objs;
    while (curr) {
        const sym = CLASS_SYMBOLS[curr.oclass];
        if (sym && ilets.indexOf(sym) < 0) ilets.push(sym);
        itemcount++;
        curr = here ? curr.nexthere : curr.nobj;
    }
    if (ilets.length === 0)
        return { selected: false, oclasses: '', one_at_a_time: false, everything: false, menu_on_demand: 0 };

    if (ilets.length === 1) {
        return { selected: true, oclasses: ilets[0], one_at_a_time: false, everything: false, menu_on_demand: 0 };
    }

    // multiple classes available — prompt
    const extras = [' ', 'a', 'A'];
    const allIlets = [...ilets, ...extras];
    const prompt = `What kinds of thing do you want to ${action}? [${allIlets.join('')}]`;
    const inbuf = await getlin(prompt, display);
    if (!inbuf || inbuf === '\x1b') {
        return { selected: false, oclasses: '', one_at_a_time: false, everything: false, menu_on_demand: 0 };
    }

    let oclasses = '';
    let one_at_a_time = false;
    let everything = false;
    let not_everything = false;
    let m_seen = false;
    let filtered = false;

    for (const sym of inbuf) {
        if (sym === ' ') continue;
        else if (sym === 'A') one_at_a_time = true;
        else if (sym === 'a') everything = true;
        else if (sym === ':') {
            await simple_look(objs, here, player);
            // C does goto ask_again; we just continue
        } else if (sym === 'm') {
            m_seen = true;
        } else if ('uBUCXP'.includes(sym)) {
            add_valid_menu_class(sym);
            filtered = true;
        } else if (ilets.includes(sym)) {
            add_valid_menu_class(sym);
            oclasses += sym;
        } else {
            not_everything = true;
        }
    }

    if (m_seen) {
        const mod = ((everything || !oclasses) && !filtered) ? -2 : -3;
        return { selected: false, oclasses: '', one_at_a_time: false, everything: false, menu_on_demand: mod };
    }
    if (!oclasses && (!everything || not_everything)) {
        one_at_a_time = true;
        everything = false;
    }
    return { selected: true, oclasses, one_at_a_time, everything, menu_on_demand: 0 };
}

// ---------------------------------------------------------------------------
// cf. pickup.c:1226 — query_category(qstr, olist, qflags, pick_list, how)
// Menu-based category (class) selection for Full menustyle.
// Returns { count, pick_list: [{item_int, count}] }
// ---------------------------------------------------------------------------
async function query_category(qstr, olist, qflags, how, player, game) {
    if (!olist) return { count: 0, pick_list: [] };

    const FOLLOW = (obj, flags) => ((flags & 1) ? obj.nexthere : obj.nobj);
    const do_worn = !!(qflags & WORN_TYPES);
    const ofilter = do_worn ? is_worn : null;

    // count categories
    let ccount = 0;
    const inv_order = game?.flags?.inv_order || 'aefgkmopqrstuvw!?"+=([*/(';
    for (let ci = 0; ci < inv_order.length; ci++) {
        const pack = inv_order.charCodeAt(ci);
        let found = false;
        for (let c = olist; c; c = FOLLOW(c, qflags)) {
            if (c.oclass === pack) {
                if (ofilter && !ofilter(c)) continue;
                if (!found) { ccount++; found = true; }
            }
        }
    }

    // single category optimization
    const num_buc_types = countBucTypes(olist);
    if (ccount === 1 && num_buc_types <= 1) {
        for (let c = olist; c; c = FOLLOW(c, qflags)) {
            if (ofilter && !ofilter(c)) continue;
            return { count: 1, pick_list: [{ item_int: c.oclass, count: -1 }] };
        }
        return { count: 0, pick_list: [] };
    }

    // build menu for category selection
    const win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);

    const ALL_TYPES_SELECTED = -2;
    const show_a = ccount > 1;
    let invlet = 'a'.charCodeAt(0);

    if (qflags & CHOOSE_ALL) {
        add_menu(win, null, { a_int: 'A'.charCodeAt(0) }, 'A'.charCodeAt(0), 0, ATR_NONE, 0,
            do_worn ? "Auto-select every item being worn or wielded"
                    : "Auto-select every relevant item", 0);
        add_menu(win, null, null, 0, 0, ATR_NONE, 0, "", 0); // blank separator
    }

    if (show_a) {
        add_menu(win, null, { a_int: ALL_TYPES_SELECTED }, invlet, 0, ATR_NONE, 0,
            do_worn ? "All worn and wielded types" : "All types", 0);
        invlet++;
    }

    for (let ci = 0; ci < inv_order.length; ci++) {
        const pack = inv_order.charCodeAt(ci);
        let found = false;
        for (let c = olist; c; c = FOLLOW(c, qflags)) {
            if (c.oclass === pack) {
                if (ofilter && !ofilter(c)) continue;
                if (!found) {
                    const sym = CLASS_SYMBOLS[pack] || '?';
                    add_menu(win, null, { a_int: pack }, invlet, sym.charCodeAt(0), ATR_NONE, 0,
                        classSymbolLabel(sym), 0);
                    invlet++;
                    found = true;
                }
            }
        }
    }

    end_menu(win, qstr);
    const result = await select_menu(win, how);
    destroy_nhwindow(win);

    if (!result || result.length === 0) return { count: 0, pick_list: [] };
    return {
        count: result.length,
        pick_list: result.map(r => ({ item_int: r.item?.a_int || r.a_int || 0, count: r.count || -1 })),
    };
}

// ---------------------------------------------------------------------------
// cf. pickup.c:1025 — query_objlist(qstr, olist_p, qflags, pick_list, how, allow)
// Put up a menu using the given object list. Returns selected items.
// JS returns { count, pick_list: [{obj, count}] }
// ---------------------------------------------------------------------------
async function query_objlist(qstr, olist, qflags, how, allow_fn, player, game) {
    if (!olist) return { count: 0, pick_list: [] };

    const BY_NEXTHERE = 0x01;
    const AUTOSELECT_SINGLE = 0x04;
    const SIGNAL_NOMENU = 0x20;
    const SIGNAL_ESCAPE = 0x40;
    const here = !!(qflags & BY_NEXTHERE);
    const FOLLOW = here ? (o) => o.nexthere : (o) => o.nobj;

    // count eligible items
    let n = 0, last = null;
    for (let curr = olist; curr; curr = FOLLOW(curr)) {
        if (allow_fn(curr)) { last = curr; n++; }
    }

    if (n === 0) return { count: (qflags & SIGNAL_NOMENU) ? -1 : 0, pick_list: [] };

    if (n === 1 && (qflags & AUTOSELECT_SINGLE)) {
        return { count: 1, pick_list: [{ obj: last, count: last.quan || 1 }] };
    }

    // build menu
    const win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);

    for (let curr = olist; curr; curr = FOLLOW(curr)) {
        if (allow_fn(curr)) {
            add_menu(win, null, { a_obj: curr }, curr.invlet || 0, 0, ATR_NONE, 0,
                doname(curr, player), 0);
        }
    }

    end_menu(win, qstr);
    const result = await select_menu(win, how);
    destroy_nhwindow(win);

    if (!result || result.length === 0) {
        const esc = (qflags & SIGNAL_ESCAPE) ? -2 : 0;
        return { count: esc, pick_list: [] };
    }

    // fix up counts
    const items = result.map(r => {
        const obj = r.item?.a_obj || r.a_obj;
        let cnt = r.count;
        if (cnt === -1 || cnt > (obj?.quan || 1)) cnt = obj?.quan || 1;
        return { obj, count: cnt };
    }).filter(r => r.obj);

    return { count: items.length, pick_list: items };
}

// ---------------------------------------------------------------------------
// cf. pickup.c:3210 — traditional_loot(put_in)
// Traditional menustyle looting: query_classes + askchain.
// JS equivalent: doPutIn/doTakeOut in containerMenu.
// This is a C-named wrapper; in JS the containerMenu handles both styles.
// ---------------------------------------------------------------------------
async function traditional_loot(put_in, player, game) {
    // In JS, Traditional/Full menustyle distinction is not maintained.
    // Delegate to menu_loot which is the common path.
    return menu_loot(0, put_in, player, game);
}

// ---------------------------------------------------------------------------
// cf. pickup.c:3245 — menu_loot(retry, put_in)
// Menu-based looting: query_category + query_objlist.
// JS equivalent: doTakeOut/doPutIn in containerMenu.
// Returns n_looted count (>0 means time passed).
// ---------------------------------------------------------------------------
async function menu_loot(retry, put_in, player, game) {
    let n_looted = 0;
    let all_categories = true;
    let loot_everything = false;
    let _autopick = false;
    const action = put_in ? "Put in" : "Take out";

    pickup_encumbrance = 0;

    if (retry) {
        all_categories = (retry === -2);
    } else {
        // Full menustyle: query_category
        all_categories = false;
        const qstr = `${action} what type of objects?`;
        const src = put_in ? player.inventory : getContainerContents(current_container);
        // Build linked-list-like traversal for query_category
        const catResult = await query_category(qstr, src?.[0] || null, 0, PICK_ANY, player, game);
        if (catResult.count === 0) return 0;
        for (const pick of catResult.pick_list) {
            if (pick.item_int === 'A'.charCodeAt(0)) {
                loot_everything = _autopick = true;
            } else if (pick.item_int === -2) { // ALL_TYPES_SELECTED
                all_categories = true;
            } else {
                add_valid_menu_class(pick.item_int);
                loot_everything = false;
            }
        }
    }

    if (_autopick) {
        const items = put_in
            ? [...(player.inventory || [])].filter(o => o && o !== current_container)
            : [...getContainerContents(current_container)];
        for (const otmp of items) {
            if (!current_container) break;
            if (loot_everything || all_categories || allow_category(otmp, player)) {
                const res = put_in
                    ? await in_container(otmp, player)
                    : await out_container(otmp, player, game?.map);
                if (res < 0) break;
                n_looted += res;
            }
        }
    } else {
        // Use query_objlist to select items
        const src = put_in ? player.inventory : getContainerContents(current_container);
        const qstr = `${action} what?`;
        // For array-based inventory, filter through the allow function
        const items = (src || []).filter(o => o && (all_categories || allow_category(o, player)));
        for (const otmp of items) {
            if (!current_container) break;
            const res = put_in
                ? await in_container(otmp, player)
                : await out_container(otmp, player, game?.map);
            if (res < 0) break;
            if (res > 0) n_looted++;
        }
    }
    return n_looted;
}

// ---------------------------------------------------------------------------
// cf. pickup.c:2952 — use_container(objp, held, more_containers)
// Main container interaction function. JS equivalent: containerMenu.
// This is a C-named alias for the JS containerMenu function.
// ---------------------------------------------------------------------------
async function use_container(game, container) {
    return containerMenu(game, container);
}

export { handlePickup, handleLoot, handlePay, handleTogglePickup, fatal_corpse_mistake, force_decor, deferred_decor, describe_decor, check_here, n_or_more, menu_class_present, add_valid_menu_class, allow_category, allow_cat_no_uchain, check_autopickup_exceptions, autopick_testobj, carry_count, lift_object, pickup_object, pickup_prinv, encumber_msg, container_at, able_to_loot, do_boh_explosion, in_container, ck_bag, out_container, container_gone, explain_container_prompt, u_handsy, choose_tip_container_menu, dotip, tipcontainer, tipcontainer_gettarget, tipcontainer_checks, collect_obj_classes, count_unpaid, count_buc, simple_look, autopick, count_target_containers, reverse_loot, loot_mon, do_loot_cont, doloot_core, query_classes, query_category, query_objlist, traditional_loot, menu_loot, use_container };
