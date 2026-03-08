// worn.js -- Equipment slot management and monster armor mechanics
// cf. worn.c — setworn/setnotworn, monster armor AI, bypass bits, extrinsics

import { objectData, ARMOR_CLASS, AMULET_CLASS, RING_CLASS, WEAPON_CLASS,
         TOOL_CLASS, FOOD_CLASS, GEM_CLASS, BALL_CLASS, CHAIN_CLASS,
         BLINDFOLD, TOWEL, LENSES, SADDLE, MEAT_RING, SPEED_BOOTS,
         MUMMY_WRAPPING, AMULET_OF_GUARDING, TIN_OPENER,
       } from './objects.js';
import { nohands, is_animal, is_mindless, cantweararm, slithy, has_horns,
         is_humanoid, breakarm, sliparm, is_whirly, noncorporeal,
         attacktype, canseemon,
       } from './mondata.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_WEP, W_QUIVER, W_SWAPWEP, W_WEAPONS,
    W_AMUL, W_RINGL, W_RINGR, W_RING, W_TOOL, W_ACCESSORY,
    W_SADDLE, W_BALL, W_CHAIN,
} from './const.js';
import { S_MUMMY, S_CENTAUR,
         PM_SKELETON, PM_HOBBIT, MZ_TINY, MZ_SMALL, MZ_HUMAN, MZ_HUGE,
         AT_WEAP,
       } from './monsters.js';
import { mons } from './monsters.js';
import { newsym } from './display.js';
import { You_hear } from './pline.js';
import { placeFloorObject } from './invent.js';

// Armor category constants — cf. objclass.h
const ARM_SUIT   = 0;
const ARM_SHIELD = 1;
const ARM_HELM   = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS  = 4;
const ARM_CLOAK  = 5;
const ARM_SHIRT  = 6;

// armcat → wornmask mapping
const ARMCAT_TO_MASK = {
    [ARM_SUIT]:   W_ARM,
    [ARM_SHIELD]: W_ARMS,
    [ARM_HELM]:   W_ARMH,
    [ARM_GLOVES]: W_ARMG,
    [ARM_BOOTS]:  W_ARMF,
    [ARM_CLOAK]:  W_ARMC,
    [ARM_SHIRT]:  W_ARMU,
};

// Speed constants — cf. monflag.h
const MSLOW = 1;
const MFAST = 2;

// Property constants — cf. prop.h (subset needed for update_mon_extrinsics)
const FIRE_RES    = 1;
const COLD_RES    = 2;
const SLEEP_RES   = 3;
const DISINT_RES  = 4;
const SHOCK_RES   = 5;
const POISON_RES  = 6;
const ACID_RES    = 7;
const STONE_RES   = 8;
const INVIS       = 40;
const FAST        = 64;
const ANTIMAGIC   = 12;
const REFLECTING  = 65;
const PROTECTION  = 59;
const CLAIRVOYANT = 35;
const STEALTH     = 42;
const TELEPAT     = 30;
const LEVITATION  = 48;
const FLYING      = 49;
const WWALKING    = 50;
const DISPLACED   = 41;
const FUMBLING    = 25;
const JUMPING     = 45;

// cf. prop.h res_to_mr macro
function res_to_mr(r) {
    return (r >= FIRE_RES && r <= STONE_RES) ? (1 << (r - 1)) : 0;
}

// cf. worn.c w_blocks macro — mummy wrapping blocks INVIS
function w_blocks(obj, mask) {
    if (obj.otyp === MUMMY_WRAPPING && (mask & W_ARMC))
        return INVIS;
    return 0;
}

// ============================================================================
// worn[] table — maps wornmask to player property name
// cf. worn.c:14 — the worn[] table
// ============================================================================
const WORN_TABLE = [
    { mask: W_ARM,     prop: 'armor',     what: 'suit' },
    { mask: W_ARMC,    prop: 'cloak',     what: 'cloak' },
    { mask: W_ARMH,    prop: 'helmet',    what: 'helmet' },
    { mask: W_ARMS,    prop: 'shield',    what: 'shield' },
    { mask: W_ARMG,    prop: 'gloves',    what: 'gloves' },
    { mask: W_ARMF,    prop: 'boots',     what: 'boots' },
    { mask: W_ARMU,    prop: 'shirt',     what: 'shirt' },
    { mask: W_RINGL,   prop: 'leftRing',  what: 'left ring' },
    { mask: W_RINGR,   prop: 'rightRing', what: 'right ring' },
    { mask: W_WEP,     prop: 'weapon',    what: 'weapon' },
    { mask: W_SWAPWEP, prop: 'swapWeapon', what: 'alternate weapon' },
    { mask: W_QUIVER,  prop: 'quiver',    what: 'quiver' },
    { mask: W_AMUL,    prop: 'amulet',    what: 'amulet' },
    { mask: W_TOOL,    prop: 'blindfold', what: 'facewear' },
    { mask: W_BALL,    prop: 'ball',      what: 'chained ball' },
    { mask: W_CHAIN,   prop: 'chain',     what: 'attached chain' },
];

// ============================================================================
// ARM_BONUS — cf. hack.h:1531
// ============================================================================
function arm_bonus(obj) {
    if (!obj) return 0;
    const od = objectData[obj.otyp];
    if (!od) return 0;
    const baseAc = Number(od.oc_oc1 || 0);  // a_ac
    const spe = Number(obj.spe || 0);
    const erosion = Math.max(Number(obj.oeroded || 0), Number(obj.oeroded2 || 0));
    return baseAc + spe - Math.min(erosion, baseAc);
}

// ============================================================================
// setworn — cf. worn.c:73
// ============================================================================
// Equip obj into hero slot(s) indicated by mask.
// Simplified: no extrinsic/artifact property tracking (hero properties not
// yet modeled in JS), but handles owornmask and slot pointers.
export function setworn(player, obj, mask) {
    for (const wp of WORN_TABLE) {
        if (wp.mask & mask) {
            const oobj = player[wp.prop];
            if (oobj) {
                oobj.owornmask = (oobj.owornmask || 0) & ~wp.mask;
            }
            player[wp.prop] = obj;
            if (obj) {
                obj.owornmask = (obj.owornmask || 0) | wp.mask;
            }
        }
    }
}

// ============================================================================
// setnotworn — cf. worn.c:147
// ============================================================================
// Force-remove obj from being worn (e.g. item destroyed while worn).
export function setnotworn(player, obj) {
    if (!obj) return;
    for (const wp of WORN_TABLE) {
        if (player[wp.prop] === obj) {
            player[wp.prop] = null;
            obj.owornmask = (obj.owornmask || 0) & ~wp.mask;
        }
    }
}

// ============================================================================
// allunworn — cf. worn.c:180
// ============================================================================
// Clear all hero worn-slot pointers (save cleanup).
export function allunworn(player) {
    if (player.twoweap) player.twoweap = false;
    for (const wp of WORN_TABLE) {
        player[wp.prop] = null;
    }
}

// ============================================================================
// wearmask_to_obj — cf. worn.c:198
// ============================================================================
// Return item worn in slot indicated by wornmask.
export function wearmask_to_obj(player, wornmask) {
    for (const wp of WORN_TABLE) {
        if (wp.mask & wornmask) return player[wp.prop] || null;
    }
    return null;
}

// ============================================================================
// wornmask_to_armcat — cf. worn.c:210
// ============================================================================
// Convert an armor wornmask to corresponding ARM_* category.
// Autotranslated from worn.c:209
export function wornmask_to_armcat(mask) {
  let cat = 0;
  switch (mask & W_ARMOR) {
    case W_ARM:
      cat = ARM_SUIT;
    break;
    case W_ARMC:
      cat = ARM_CLOAK;
    break;
    case W_ARMH:
      cat = ARM_HELM;
    break;
    case W_ARMS:
      cat = ARM_SHIELD;
    break;
    case W_ARMG:
      cat = ARM_GLOVES;
    break;
    case W_ARMF:
      cat = ARM_BOOTS;
    break;
    case W_ARMU:
      cat = ARM_SHIRT;
    break;
  }
  return cat;
}

// ============================================================================
// armcat_to_wornmask — cf. worn.c:242
// ============================================================================
// Convert an ARM_* category to corresponding wornmask bit.
// Autotranslated from worn.c:241
export function armcat_to_wornmask(cat) {
  let mask = 0;
  switch (cat) {
    case ARM_SUIT:
      mask = W_ARM;
    break;
    case ARM_CLOAK:
      mask = W_ARMC;
    break;
    case ARM_HELM:
      mask = W_ARMH;
    break;
    case ARM_SHIELD:
      mask = W_ARMS;
    break;
    case ARM_GLOVES:
      mask = W_ARMG;
    break;
    case ARM_BOOTS:
      mask = W_ARMF;
    break;
    case ARM_SHIRT:
      mask = W_ARMU;
    break;
  }
  return mask;
}

// ============================================================================
// wearslot — cf. worn.c:274
// ============================================================================
// Return bitmask of equipment slot(s) a given item might be worn in.
export function wearslot(obj) {
    const od = objectData[obj.otyp];
    if (!od) return 0;
    const oc_class = od.oc_class;

    switch (oc_class) {
    case AMULET_CLASS:
        return W_AMUL;
    case RING_CLASS:
        return W_RINGL | W_RINGR;
    case ARMOR_CLASS: {
        const armcat = od.oc_subtyp;
        return ARMCAT_TO_MASK[armcat] || 0;
    }
    case WEAPON_CLASS: {
        let res = W_WEP | W_SWAPWEP;
        if (od.merge) res |= W_QUIVER;
        return res;
    }
    case TOOL_CLASS:
        if (obj.otyp === BLINDFOLD || obj.otyp === TOWEL || obj.otyp === LENSES)
            return W_TOOL;
        if (od.weptool || obj.otyp === TIN_OPENER)
            return W_WEP | W_SWAPWEP;
        if (obj.otyp === SADDLE)
            return W_SADDLE;
        return 0;
    case FOOD_CLASS:
        if (obj.otyp === MEAT_RING)
            return W_RINGL | W_RINGR;
        return 0;
    case GEM_CLASS:
        return W_QUIVER;
    case BALL_CLASS:
        return W_BALL;
    case CHAIN_CLASS:
        return W_CHAIN;
    default:
        return 0;
    }
}

// ============================================================================
// mon_set_minvis — cf. worn.c:466
// ============================================================================
// Set monster to permanently invisible.
export function mon_set_minvis(mon, map) {
    mon.perminvis = true;
    if (!mon.invis_blkd) {
        mon.minvis = true;
        if (map) newsym(mon.mx, mon.my);
    }
}

// ============================================================================
// mon_adjust_speed — cf. worn.c:478
// ============================================================================
// Change monster's speed based on adjust parameter.
export function mon_adjust_speed(mon, adjust, _obj) {
    const oldspeed = mon.mspeed || 0;

    switch (adjust) {
    case 2:
        mon.permspeed = MFAST;
        break;
    case 1:
        if (mon.permspeed === MSLOW)
            mon.permspeed = 0;
        else
            mon.permspeed = MFAST;
        break;
    case 0: // just check for worn speed boots
        break;
    case -1:
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        else
            mon.permspeed = MSLOW;
        break;
    case -2:
        mon.permspeed = MSLOW;
        break;
    case -3: // petrification
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        break;
    case -4: // green slime
        if (mon.permspeed === MFAST)
            mon.permspeed = 0;
        break;
    }

    // Check for speed boots in inventory
    let hasSpeedBoots = false;
    for (const otmp of (mon.minvent || [])) {
        if (otmp.owornmask) {
            const od = objectData[otmp.otyp];
            if (od && od.oc_oprop === FAST) {
                hasSpeedBoots = true;
                break;
            }
        }
    }
    if (hasSpeedBoots)
        mon.mspeed = MFAST;
    else
        mon.mspeed = mon.permspeed || 0;
}

// ============================================================================
// update_mon_extrinsics — cf. worn.c:569
// ============================================================================
// Update monster's resistances/properties when armor is worn or removed.
export function update_mon_extrinsics(mon, obj, on, silently) {
    const od = objectData[obj.otyp];
    if (!od) return;

    let which = od.oc_oprop || 0;
    // altprop for alchemy smock: confers both poison and acid resistance
    let altwhich = 0;
    if (od.oc_name === 'alchemy smock') {
        altwhich = POISON_RES + ACID_RES - which;
    }

    if (!which && !altwhich) {
        // fall through to maybe_blocks
    } else {
        _apply_extrinsic(mon, obj, which, on, silently);
        if (altwhich && altwhich !== which) {
            _apply_extrinsic(mon, obj, altwhich, on, silently);
        }
    }

    // maybe_blocks: mummy wrapping blocks INVIS
    const blocked = w_blocks(obj, ~0);
    if (blocked === INVIS) {
        mon.invis_blkd = on ? true : false;
        mon.minvis = on ? false : !!mon.perminvis;
    }
}

function _apply_extrinsic(mon, obj, which, on, silently) {
    if (!mon.mextrinsics) mon.mextrinsics = 0;

    if (on) {
        switch (which) {
        case INVIS:
            mon.minvis = !mon.invis_blkd;
            break;
        case FAST:
            mon_adjust_speed(mon, 0, obj);
            break;
        case ANTIMAGIC: case REFLECTING: case PROTECTION:
        case CLAIRVOYANT: case STEALTH: case TELEPAT:
        case LEVITATION: case FLYING: case WWALKING:
        case DISPLACED: case FUMBLING: case JUMPING:
            break;
        default:
            mon.mextrinsics |= res_to_mr(which);
            break;
        }
    } else {
        switch (which) {
        case INVIS:
            mon.minvis = !!mon.perminvis;
            break;
        case FAST:
            mon_adjust_speed(mon, 0, obj);
            break;
        case FIRE_RES: case COLD_RES: case SLEEP_RES: case DISINT_RES:
        case SHOCK_RES: case POISON_RES: case ACID_RES: case STONE_RES: {
            // Check if another worn item provides this resistance
            const mask = res_to_mr(which);
            let found = false;
            for (const otmp of (mon.minvent || [])) {
                if (otmp === obj || !otmp.owornmask) continue;
                const otd = objectData[otmp.otyp];
                if (!otd) continue;
                if (otd.oc_oprop === which) { found = true; break; }
                // check altprop (alchemy smock)
                if (otd.oc_name === 'alchemy smock' &&
                    (POISON_RES + ACID_RES - otd.oc_oprop) === which) {
                    found = true; break;
                }
            }
            if (!found) mon.mextrinsics &= ~mask;
            break;
        }
        default:
            break;
        }
    }
}

// ============================================================================
// find_mac — cf. worn.c:707
// ============================================================================
// Calculate monster's effective armor class accounting for worn armor.
export function find_mac(mon) {
    const ptr = mon.data || mon.type || {};
    let base = ptr.ac ?? 10;
    const mwflags = mon.misc_worn_check || 0;

    if (mwflags) {
        for (const obj of (mon.minvent || [])) {
            if ((obj.owornmask || 0) & mwflags) {
                if (obj.otyp !== undefined) {
                    const od = objectData[obj.otyp];
                    // AMULET_OF_GUARDING gives fixed -2
                    if (od && od.otyp === AMULET_OF_GUARDING) {
                        base -= 2;
                    } else if (od && od.oc_name === 'amulet of guarding') {
                        base -= 2;
                    } else {
                        base -= arm_bonus(obj);
                    }
                }
            }
        }
    }

    // Cap at ±AC_MAX (same as hero, AC_MAX = 127 in C)
    if (Math.abs(base) > 127) base = Math.sign(base) * 127;
    return base;
}

// ============================================================================
// which_armor — cf. worn.c:996
// ============================================================================
// Return the item a monster is wearing in a given slot (wornmask flag).
export function which_armor(mon, flag) {
    for (const obj of (mon.minvent || [])) {
        if ((obj.owornmask || 0) & flag) return obj;
    }
    return null;
}

// ============================================================================
// m_dowear — cf. worn.c:747
// ============================================================================
// Monster equips best available armor.
export function m_dowear(mon, creation) {
    const ptr = mon.data || mon.type || {};
    // Guards: verysmall, nohands, animal skip entirely
    if ((ptr.msize || 0) < MZ_SMALL || nohands(ptr) || is_animal(ptr))
        return;
    // Mindless skip unless mummy or skeleton at creation
    if (is_mindless(ptr)
        && (!creation || (ptr.mlet !== S_MUMMY
                          && mon.mndx !== PM_SKELETON)))
        return;

    m_dowear_type(mon, W_AMUL, creation, false);
    const can_wear_armor = !cantweararm(ptr);
    // Can't put on shirt if already wearing suit
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        m_dowear_type(mon, W_ARMU, creation, false);
    // C ref: can_wear_armor || WrappingAllowed(mon->data)
    if (can_wear_armor || is_humanoid(ptr))
        m_dowear_type(mon, W_ARMC, creation, false);
    m_dowear_type(mon, W_ARMH, creation, false);
    // Skip shield if wielding two-handed weapon
    const mwep = mon.weapon;
    if (!mwep || !(objectData[mwep.otyp]?.big))
        m_dowear_type(mon, W_ARMS, creation, false);
    m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy(ptr) && ptr.mlet !== S_CENTAUR)
        m_dowear_type(mon, W_ARMF, creation, false);
    if (can_wear_armor)
        m_dowear_type(mon, W_ARM, creation, false);
    else
        m_dowear_type(mon, W_ARM, creation, true); // RACE_EXCEPTION
}

// ============================================================================
// m_dowear_type — cf. worn.c:789
// ============================================================================
function m_dowear_type(mon, flag, creation, racialexception) {
    if (mon.mfrozen) return;

    const old = which_armor(mon, flag);
    if (old && old.cursed) return;
    if (old && flag === W_AMUL) {
        const odn = objectData[old.otyp]?.oc_name;
        if (odn !== 'amulet of guarding') return; // already have life-saving/reflection
    }
    let best = old;

    for (const obj of (mon.minvent || [])) {
        const od = objectData[obj.otyp];
        if (!od) continue;

        // Check if this item fits the slot
        if (flag === W_AMUL) {
            if (od.oc_class !== AMULET_CLASS) continue;
            if (od.oc_name !== 'amulet of life saving'
                && od.oc_name !== 'amulet of reflection'
                && od.oc_name !== 'amulet of guarding') continue;
            if (!best || od.oc_name !== 'amulet of guarding') {
                best = obj;
                if (od.oc_name !== 'amulet of guarding') break; // life-saving/reflection: use immediately
            }
            continue;
        }

        if (od.oc_class !== ARMOR_CLASS) continue;
        const armcat = od.oc_subtyp;

        switch (flag) {
        case W_ARMU: if (armcat !== ARM_SHIRT) continue; break;
        case W_ARMC:
            if (armcat !== ARM_CLOAK) continue;
            // mummy wrapping is only cloak for monsters bigger than human
            if (((mon.data || mon.type)?.msize || 0) > MZ_HUMAN && obj.otyp !== MUMMY_WRAPPING)
                continue;
            break;
        case W_ARMH:
            if (armcat !== ARM_HELM) continue;
            // Horned monsters can only wear flimsy helms
            if (has_horns(mon.data || mon.type) && (od.oc_material || 0) > 7) // LEATHER=7
                continue;
            break;
        case W_ARMS: if (armcat !== ARM_SHIELD) continue; break;
        case W_ARMG: if (armcat !== ARM_GLOVES) continue; break;
        case W_ARMF: if (armcat !== ARM_BOOTS) continue; break;
        case W_ARM:
            if (armcat !== ARM_SUIT) continue;
            if (racialexception && racial_exception(mon, obj) < 1)
                continue;
            break;
        default: continue;
        }

        if (obj.owornmask) continue; // already worn in another slot

        if (best && (arm_bonus(best) + extra_pref(mon, best)
                     >= arm_bonus(obj) + extra_pref(mon, obj)))
            continue;
        best = obj;
    }

    if (!best || best === old) return;

    // Equip the item
    if (old) {
        update_mon_extrinsics(mon, old, false, creation);
        old.owornmask = (old.owornmask || 0) & ~flag;
        mon.misc_worn_check &= ~flag;
    }
    mon.misc_worn_check |= flag;
    best.owornmask = (best.owornmask || 0) | flag;
    // autocurse: dunce cap / helm of opposite alignment
    // (simplified: C checks oc_oprop for autocurse but we skip that)
    update_mon_extrinsics(mon, best, true, creation);
}

// ============================================================================
// extra_pref — cf. worn.c:1328
// ============================================================================
// Monster's preference bonus for armor with special benefits.
// Autotranslated from worn.c:1328
export function extra_pref(mon, obj) {
  if (obj) {
    if (obj.otyp === SPEED_BOOTS && mon.permspeed !== MFAST) return 20;
  }
  return 0;
}

// ============================================================================
// racial_exception — cf. worn.c:1350
// ============================================================================
// Race-based armor exceptions.
export function racial_exception(mon, obj) {
    const ptr = mon.data || mon.type || {};
    // Allow hobbits to wear elven armor - LoTR
    if (ptr === mons[PM_HOBBIT]) {
        const od = objectData[obj.otyp];
        if (od && /^elven /i.test(od.oc_name || ''))
            return 1;
    }
    return 0;
}

// ============================================================================
// extract_from_minvent — cf. worn.c:1367
// ============================================================================
// Remove an object from monster's inventory with full cleanup.
export function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask || 0;

    // Remove from inventory
    const idx = Array.isArray(mon.minvent) ? mon.minvent.indexOf(obj) : -1;
    if (idx >= 0) mon.minvent.splice(idx, 1);

    obj.owornmask = 0;

    if (unwornmask) {
        if (!mon.dead && do_extrinsics) {
            update_mon_extrinsics(mon, obj, false, silently);
        }
        mon.misc_worn_check = (mon.misc_worn_check || 0) & ~unwornmask;
    }

    // If this was the wielded weapon, clear weapon reference
    if (unwornmask & W_WEP) {
        if (mon.weapon === obj) mon.weapon = null;
        mon.weapon_check = 1; // NEED_WEAPON
    }
}

// ============================================================================
// m_lose_armor — cf. worn.c:1029
// ============================================================================
// Remove armor from monster and drop on floor.
export function m_lose_armor(mon, obj, polyspot, map) {
    extract_from_minvent(mon, obj, true, false);
    obj.ox = mon.mx;
    obj.oy = mon.my;
    placeFloorObject(map, obj);
    if (polyspot) bypass_obj(obj);
    if (map) newsym(mon.mx, mon.my);
}

// ============================================================================
// mon_break_armor — cf. worn.c:1167
// ============================================================================
// Remove/destroy armor when monster polymorphs.
export async function mon_break_armor(mon, polyspot, map, opts = {}) {
    const mdat = mon.data || mon.type || {};
    const handless_or_tiny = nohands(mdat) || (mdat.msize || 0) < MZ_SMALL;
    const vis = canseemon(mon, opts.player || null, opts.fov || null, map);
    let clankEmitted = false;
    const emitClank = async () => {
        if (clankEmitted) return;
        const currentTop = String(opts?.display?.topMessage || '');
        if (currentTop.includes('You hear a clank.')) {
            clankEmitted = true;
            return;
        }
        clankEmitted = true;
        if (opts?.display && typeof opts.display.putstr_message === 'function') {
            if (opts.display.messageNeedsMore && typeof opts.display.clearRow === 'function') {
                opts.display.clearRow(0);
                opts.display.topMessage = null;
                opts.display.messageNeedsMore = false;
            }
            await opts.display.putstr_message('You hear a clank.');
            return;
        }
        await You_hear('a clank.');
    };
    let otmp;
    if (breakarm(mdat)) {
        // Body armor breaks
        if ((otmp = which_armor(mon, W_ARM)) != null) {
            if (!vis && (objectData[otmp.otyp]?.oc_subtyp === ARM_HELM)) await emitClank();
            // Destroy it (m_useup equivalent: remove from inventory)
            extract_from_minvent(mon, otmp, true, false);
        }
        // Cloak tears apart (unless mummy wrapping)
        if ((otmp = which_armor(mon, W_ARMC)) != null
            && otmp.otyp !== MUMMY_WRAPPING) {
            extract_from_minvent(mon, otmp, true, false);
        }
        // Shirt rips
        if ((otmp = which_armor(mon, W_ARMU)) != null) {
            extract_from_minvent(mon, otmp, true, false);
        }
    } else if (sliparm(mdat)) {
        // Armor falls off
        if ((otmp = which_armor(mon, W_ARM)) != null) {
            if (!vis && (objectData[otmp.otyp]?.oc_subtyp === ARM_HELM)) await emitClank();
            m_lose_armor(mon, otmp, polyspot, map);
        }
        if ((otmp = which_armor(mon, W_ARMC)) != null
            && otmp.otyp !== MUMMY_WRAPPING) {
            m_lose_armor(mon, otmp, polyspot, map);
        }
        if ((otmp = which_armor(mon, W_ARMU)) != null) {
            m_lose_armor(mon, otmp, polyspot, map);
        }
    }

    if (handless_or_tiny) {
        if ((otmp = which_armor(mon, W_ARMG)) != null) {
            m_lose_armor(mon, otmp, polyspot, map);
        }
        if ((otmp = which_armor(mon, W_ARMS)) != null) {
            if (!vis) await emitClank();
            m_lose_armor(mon, otmp, polyspot, map);
        }
    }

    if (handless_or_tiny || has_horns(mdat)) {
        if ((otmp = which_armor(mon, W_ARMH)) != null
            && (handless_or_tiny || (objectData[otmp.otyp]?.oc_material || 0) > 7)) {
            if (!vis) await emitClank();
            m_lose_armor(mon, otmp, polyspot, map);
        }
    }

    if (handless_or_tiny || slithy(mdat) || mdat.mlet === S_CENTAUR) {
        if ((otmp = which_armor(mon, W_ARMF)) != null) {
            m_lose_armor(mon, otmp, polyspot, map);
        }
    }

    // Saddle: simplified — just drop it if monster can no longer be saddled
    if ((otmp = which_armor(mon, W_SADDLE)) != null) {
        // can_saddle: check humanoid or animal + right size
        const canSaddle = !nohands(mdat) || (is_animal(mdat) && (mdat.msize || 0) >= MZ_SMALL);
        if (!canSaddle) {
            m_lose_armor(mon, otmp, polyspot, map);
        }
    }
}

// ============================================================================
// Bypass system — stubs cf. worn.c:1109-1163
// ============================================================================
export function bypass_obj(obj) {
    if (obj) obj.bypass = true;
}

export function bypass_objlist(objchain, on) {
    if (!Array.isArray(objchain)) return;
    for (const obj of objchain) {
        obj.bypass = on ? true : false;
    }
}

export function clear_bypasses() {
    // No-op stub: bypass tracking not needed for current JS gameplay
}

export function nxt_unbypassed_obj(objchain) {
    if (!Array.isArray(objchain)) return null;
    for (const obj of objchain) {
        if (!obj.bypass) {
            bypass_obj(obj);
            return obj;
        }
    }
    return null;
}

// Autotranslated from worn.c:1044
export function clear_bypass(objchn) {
  let o;
  for (o = objchn; o; o = o.nobj) {
    o.bypass = 0;
    if (Has_contents(o)) clear_bypass(o.cobj);
  }
}

// Autotranslated from worn.c:1148
export function nxt_unbypassed_loot(lootarray, listhead) {
  let o, obj;
  while ((obj = lootarray.obj) != null) {
    for (o = listhead; o; o = o.nobj) {
      if (o === obj) {
        break;
      }
    }
    if (o && !obj.bypass) { bypass_obj(obj); break; }
    ++lootarray;
  }
  return obj;
}
