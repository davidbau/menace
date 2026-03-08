// zap.js -- Wand zapping and beam effects
// C ref: zap.c — dozap(), weffects(), dobuzz(), zhitm(), zap_hit()
// C ref: trap.c — burnarmor()
// C ref: mon.c — xkilled(), corpse_chance()

import { rn2, rnd, d, c_d, rn1, rne, rnz } from './rng.js';
import {
    isok, ACCESSIBLE, IS_WALL, IS_DOOR, COLNO, ROWNO, A_STR, A_WIS, A_CON, A_INT, A_DEX,
    ICE, POOL,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    TELEP_TRAP, LEVEL_TELEP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, MAGIC_PORTAL, VIBRATING_SQUARE,
    MM_NOWAIT, MM_NOMSG, MM_NOCOUNTBIRTH, MM_MALE, MM_FEMALE,
    W_ARMOR, W_ACCESSORY, W_WEP, W_ARMC, W_ARM, W_ARMU, W_ARMH, W_ARMG,
    W_ARMF, W_ARMS, W_AMUL, W_TOOL, W_RING, W_RINGL, W_RINGR,
    TT_NONE,
    MELT_ICE_AWAY,
    HALLUC,
} from './const.js';
import { exercise } from './attrib_exercise.js';
import { objectData, WAND_CLASS, TOOL_CLASS, WEAPON_CLASS, SCROLL_CLASS,
         POTION_CLASS, RING_CLASS, SPBOOK_CLASS, GEM_CLASS, ROCK_CLASS,
         ARMOR_CLASS,
         WAN_FIRE, WAN_COLD, WAN_LIGHTNING,
         WAN_SLEEP, WAN_DEATH, WAN_MAGIC_MISSILE, WAN_STRIKING,
         WAN_DIGGING, WAN_NOTHING,
         WAN_SECRET_DOOR_DETECTION, WAN_ENLIGHTENMENT, WAN_CREATE_MONSTER, WAN_WISHING,
         WAN_SLOW_MONSTER, WAN_SPEED_MONSTER, WAN_UNDEAD_TURNING,
         WAN_POLYMORPH, WAN_CANCELLATION, WAN_TELEPORTATION,
         WAN_MAKE_INVISIBLE, WAN_LOCKING, WAN_PROBING, WAN_OPENING,
         WAN_LIGHT,
         SPE_FORCE_BOLT, SPE_KNOCK, SPE_WIZARD_LOCK,
         SPE_HEALING, SPE_EXTRA_HEALING,
         SPE_SLOW_MONSTER, SPE_CANCELLATION, SPE_TELEPORT_AWAY,
         SPE_POLYMORPH, SPE_TURN_UNDEAD, SPE_STONE_TO_FLESH,
         SPE_DRAIN_LIFE, SPE_MAGIC_MISSILE, SPE_FINGER_OF_DEATH,
         SPE_LIGHT, SPE_DETECT_UNSEEN,
         SPE_NOVEL, SPE_BLANK_PAPER,
         CORPSE, FOOD_CLASS, FLESH,
         PAPER, CLOTH, LEATHER, WOOD, BONE, IRON, METAL, COPPER, SILVER, GOLD,
         PLATINUM, MITHRIL, GLASS, GEMSTONE, MINERAL,
         STRANGE_OBJECT, BOULDER, STATUE, FIGURINE, EGG,
         SCR_FIRE, BAG_OF_HOLDING,
         SCR_MAGIC_MAPPING,
         ROCK, DWARVISH_CLOAK, CHEST, LARGE_BOX, TIN,
         SPE_DIG } from './objects.js';
import { mons, G_FREQ, MZ_TINY, MZ_HUMAN, M1_NOEYES,
         M2_NEUTER, M2_MALE, M2_FEMALE, M2_UNDEAD, M2_DEMON,
         MR_FIRE, MR_COLD, MR_SLEEP, MR_ELEC, MR_POISON, MR_ACID, MR_DISINT,
         PM_LIZARD, PM_LICHEN, PM_DEATH, PM_CLAY_GOLEM,
         PM_IRON_GOLEM, PM_STONE_GOLEM, PM_FLESH_GOLEM, PM_WOOD_GOLEM,
         PM_LEATHER_GOLEM, PM_ROPE_GOLEM, PM_SKELETON, PM_GOLD_GOLEM,
         PM_GLASS_GOLEM, PM_PAPER_GOLEM, PM_STRAW_GOLEM,
         PM_LONG_WORM, PM_GREMLIN, S_TROLL, S_ZOMBIE, S_EEL, S_GOLEM, S_MIMIC } from './monsters.js';
import {
  rndmonnum, makemon,
} from './makemon.js';
import { NO_MINVENT } from './const.js';
import { next_ident, mksobj, mkobj, weight } from './mkobj.js';
import { newexplevel } from './exper.js';
import { corpse_chance } from './mon.js';
import { xkilled, killed, monkilled,
         wakeup, healmon, mondead } from './mon.js';
import { nhgetch } from './input.js';
import { getdir, registerBurnarmor } from './hack.js';
import { nonliving, is_undead, is_demon, is_rider,
         x_monnam, resists_fire, resists_cold, resists_elec,
         resists_poison, resists_acid, resists_disint } from './mondata.js';
import { placeFloorObject } from './invent.js';
import { zap_dig as zap_dig_core } from './dig.js';
import { pline } from './pline.js';
import { mon_nam, Monnam } from './do_name.js';
import {
  find_mac,
  mon_adjust_speed,
  mon_set_minvis,
  which_armor,
} from './worn.js';
import { erode_obj } from './trap.js';
import { game as _gstate } from './gstate.js';
import { ERODE_BURN, EF_GREASE, W_ART } from './const.js';
import { sleep_monst, slept_monst } from './mhitm.js';
import { mstatusline, run_magic_enlightenment_effect } from './insight.js';
import { display_minventory, sobj_at, update_inventory } from './invent.js';
import { obj_resists } from './objdata.js';
import { splitobj, Is_container } from './mkobj.js';
import { delobj } from './invent.js';
import { useupall } from './invent.js';
import { monflee } from './monmove.js';
import { readobjnam, hands_obj } from './objnam.js';
import {
  xname, an, The, simpleonames,
  suit_simple_name, cloak_simple_name, helm_simple_name,
  gloves_simple_name, boots_simple_name, shield_simple_name,
  shirt_simple_name, Is_box,
} from './objnam.js';
import { hold_another_object, prinv } from './invent.js';
import { findit } from './detect.js';
import { is_db_wall, find_drawbridge, open_drawbridge, close_drawbridge, destroy_drawbridge } from './dbridge.js';
import { HOLE, TRAPDOOR } from './const.js';
import { engr_at, del_engr_at, wipe_engr_at, rloc_engr, make_engr_at } from './engrave.js';
import { random_engraving_rng, deltrap } from './dungeon.js';
import { discoverObject } from './o_init.js';
import { u_teleport_mon, rloco, enexto } from './teleport.js';
import { boxlock } from './lock.js';
import { cansee } from './vision.js';
import {
    tmp_at, nh_delay_output,
} from './animation.js';
import { DISP_BEAM, DISP_END } from './const.js';
import { getWinMessage, display_nhwindow } from './windows.js';
import { attach_egg_hatch_timeout } from './timeout.js';
import { impossible, You_feel } from './pline.js';
import { acurr } from './attrib.js';
import { noit_Monnam } from './do_name.js';

// Direction vectors matching cmd.js DIRECTION_KEYS
const DIRECTION_KEYS = {
    'h': [-1,  0],  'j': [ 0,  1],  'k': [ 0, -1],  'l': [ 1,  0],
    'y': [-1, -1],  'u': [ 1, -1],  'b': [-1,  1],  'n': [ 1,  1],
    '.': [ 0,  0],  // self
};

// Beam types (C ref: zap.c AD_* / ZT_*)
const ZT_MAGIC_MISSILE = 0;
const ZT_FIRE = 1;
const ZT_COLD = 2;
const ZT_SLEEP = 3;
const ZT_DEATH = 4;
const ZT_LIGHTNING = 5;
const ZT_POISON_GAS = 6;
const ZT_ACID = 7;

// Beam type encoding for wand/spell/breath
const ZT_WAND = (x) => x;
const ZT_SPELL = (x) => 10 + x;
const ZT_BREATH = (x) => 20 + x;
const BURIED_TOO = 1;
const CONTAINED_TOO = 2;
const PICK_NONE = 0;
const MINV_NOLET = 0x04;
const MINV_ALL = 0x08;

let go_obj_zapped = false;
let gp_poly_zapped = -1;
const objects = objectData;
const observe_object = discoverObject;
const makeknown = observe_object;

function SchroedingersBox(obj) {
  return !!(obj && obj.spe === 1 && Is_container(obj));
}

function t_at(x, y, map) {
  if (!map || !Array.isArray(map.traps)) return null;
  for (const t of map.traps) {
    if (t && t.tx === x && t.ty === y) return t;
  }
  return null;
}

function obj_extract_self(obj, map) {
  if (!obj || !map || !Array.isArray(map.objects)) return;
  if (typeof map.removeObject === 'function') {
    map.removeObject(obj);
    return;
  }
  const idx = map.objects.indexOf(obj);
  if (idx >= 0) map.objects.splice(idx, 1);
}

function is_hero_spell(type) { return type >= 10 && type < 20; }

// C ref: zap.c zaptype() — convert monster zap value to hero zap value
function zaptype(type) {
    if (type <= -30 && -39 <= type) type += 30;
    type = Math.abs(type);
    return type;
}

// C ref: zap.c flash_types[] — beam name strings
const flash_types = [
    "magic missile", "bolt of fire", "bolt of cold", "sleep ray", "death ray",
    "bolt of lightning", "", "", "", "",
    "magic missile", "fireball", "cone of cold", "sleep ray", "finger of death",
    "bolt of lightning", "", "", "", "",
    "blast of missiles", "blast of fire", "blast of frost", "blast of sleep gas",
    "blast of disintegration", "blast of lightning",
    "blast of poison gas", "blast of acid", "", ""
];

function flash_str(fltyp) {
    if (fltyp >= 0 && fltyp < flash_types.length) return flash_types[fltyp];
    return "beam";
}

// MAGIC_COOKIE for disintegration
const MAGIC_COOKIE = 1000;

// Map wand otyp to beam type
function wandToBeamType(otyp) {
    switch (otyp) {
        case WAN_MAGIC_MISSILE: return ZT_MAGIC_MISSILE;
        case WAN_FIRE:          return ZT_FIRE;
        case WAN_COLD:          return ZT_COLD;
        case WAN_SLEEP:         return ZT_SLEEP;
        case WAN_DEATH:         return ZT_DEATH;
        case WAN_LIGHTNING:     return ZT_LIGHTNING;
        default:                return -1;
    }
}

// Beam damage dice (C ref: zap.c bzap array — damage die per type)
function beamDamageDice(type) {
    switch (type) {
        case ZT_MAGIC_MISSILE: return [2, 6];  // 2d6
        case ZT_FIRE:          return [6, 6];  // 6d6
        case ZT_COLD:          return [6, 6];  // 6d6
        case ZT_SLEEP:         return [0, 0];  // sleep has no HP damage
        case ZT_DEATH:         return [0, 0];  // instant death
        case ZT_LIGHTNING:     return [6, 6];  // 6d6
        default:               return [0, 0];
    }
}

// C ref: zap.c:6070 resist() — magic resistance saving throw
// Returns true if monster resists (damage halved by caller).
// Consumes one rn2() call.
export function resist(mon, oclass) {
    const mdat = mons[mon.mndx];
    // C ref: zap.c:6081-6103 — attack level based on object class
    let alev;
    switch (oclass) {
    case WAND_CLASS:    alev = 12; break;
    case TOOL_CLASS:    alev = 10; break;
    case WEAPON_CLASS:  alev = 10; break;
    case SCROLL_CLASS:  alev = 9; break;
    case POTION_CLASS:  alev = 6; break;
    case RING_CLASS:    alev = 5; break;
    default:            alev = _gstate?.player?.ulevel || 1; break; // C: u.ulevel for spells
    }

    // C ref: zap.c:6104-6109 — defense level
    let dlev = mon.m_lev ?? 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;

    // C ref: zap.c:6111 — rn2(100 + alev - dlev) < mr
    const mr = mdat.mr || 0;
    return rn2(100 + alev - dlev) < mr;
}

// C ref: trap.c:88-157 burnarmor() — check if victim's armor burns
// Handles both monsters and the player. While loop picks random armor slot;
// case 1 (body armor) always returns TRUE.
export function burnarmor(victim, player) {
    if (!victim) return false;
    const hitting_u = (victim === player);
    // C ref: trap.c:100-109 — towel drying (rn2 consumed); skipped for now

    function getArmor(slot) {
        if (hitting_u) {
            switch (slot) {
            case W_ARMH: return player.helmet;
            case W_ARMC: return player.cloak;
            case W_ARM:  return player.armor;
            case W_ARMU: return player.shirt;
            case W_ARMS: return player.shield;
            case W_ARMG: return player.gloves;
            case W_ARMF: return player.boots;
            default: return null;
            }
        }
        return which_armor(victim, slot);
    }

    while (true) {
        switch (rn2(5)) {
        case 0: {
            const item = getArmor(W_ARMH);
            if (!erode_obj(item, 'helmet', ERODE_BURN, EF_GREASE))
                continue;
            break;
        }
        case 1: {
            let item = getArmor(W_ARMC);
            if (item) {
                erode_obj(item, null, ERODE_BURN, EF_GREASE);
                return true;
            }
            item = getArmor(W_ARM);
            if (item) {
                erode_obj(item, null, ERODE_BURN, EF_GREASE);
                return true;
            }
            item = getArmor(W_ARMU);
            if (item)
                erode_obj(item, 'shirt', ERODE_BURN, EF_GREASE);
            return true;
        }
        case 2: {
            const item = getArmor(W_ARMS);
            if (!erode_obj(item, 'wooden shield', ERODE_BURN, EF_GREASE))
                continue;
            break;
        }
        case 3: {
            const item = getArmor(W_ARMG);
            if (!erode_obj(item, 'gloves', ERODE_BURN, EF_GREASE))
                continue;
            break;
        }
        case 4: {
            const item = getArmor(W_ARMF);
            if (!erode_obj(item, 'boots', ERODE_BURN, EF_GREASE))
                continue;
            break;
        }
        }
        break;
    }
    return false;
}
registerBurnarmor(burnarmor);

// C ref: zap.c:4646 zap_hit() — determine if beam hits a monster
export function zap_hit(ac, type) {
    // C ref: zap.c:4650 — rn2(20) chance check
    const chance = rn2(20);
    if (!chance) {
        // C ref: zap.c:4655 — small chance for naked target to dodge
        return rnd(10) < ac;
    }
    return (3 - chance < ac);
}

// C ref: zap.c:4224 zhitm() — apply beam damage to a monster
// Returns damage dealt
function zhitm(mon, type, nd, map) {
    const mdat = mons[mon.mndx];
    let tmp = 0;
    const damgtype = zaptype(type) % 10;

    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        // C: resists_magm(mon) || defended(mon, AD_MAGM)
        // Approximation: mr > 50 (high magic resistance score)
        if ((mdat.mr || 0) > 50) {
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_FIRE:
        if (mdat.mresists & MR_FIRE) {
            break; // resistant — no damage
        }
        tmp = d(nd, 6);
        if (mdat.mresists & MR_COLD) tmp += 7; // cold-resistant takes extra fire
        // C ref: if (burnarmor(mtmp)) { if (!rn2(3)) { destroy_items } }
        if (burnarmor(mon)) {
            if (!rn2(3)) {
                // destroy_items — stub: item destruction not ported
            }
        }
        break;
    case ZT_COLD:
        if (mdat.mresists & MR_COLD) {
            break; // resistant
        }
        tmp = d(nd, 6);
        if (mdat.mresists & MR_FIRE) tmp += d(nd, 3); // fire-resistant takes extra cold
        if (!rn2(3)) {
            // destroy_items
        }
        break;
    case ZT_SLEEP:
        tmp = 0;
        sleep_monst(mon, d(nd, 25), type === ZT_WAND(ZT_SLEEP) ? WAND_CLASS : 0);
        break;
    case ZT_DEATH:
        if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) {
            // death ray (not disintegration)
            if (mon.mndx === PM_DEATH) {
                // PM_DEATH absorbs death ray, heals
                healmon(mon, Math.floor(mon.mhpmax * 3 / 2), Math.floor(mon.mhpmax / 2));
                if (mon.mhpmax >= MAGIC_COOKIE)
                    mon.mhpmax = MAGIC_COOKIE - 1;
                tmp = 0;
                break;
            }
            if (nonliving(mdat) || is_demon(mdat)) {
                break; // immune
            }
            type = -1; // no saving throw
        } else {
            // disintegration breath
            if (mdat.mresists & MR_DISINT) {
                break; // resistant
            }
            // No armor handling — simplified; full kill
            tmp = MAGIC_COOKIE;
            type = -1;
            break;
        }
        tmp = mon.mhp + 1;
        break;
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        if (mdat.mresists & MR_ELEC) {
            tmp = 0; // resistant, but still rolls damage for RNG
        }
        // blindness from lightning
        if (!(mdat.mflags1 & M1_NOEYES) && nd > 2) {
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            if (((mon.mblinded || 0) + rnd_tmp) > 127)
                mon.mblinded = 127;
            else
                mon.mblinded = (mon.mblinded || 0) + rnd_tmp;
        }
        if (!rn2(3)) {
            // destroy_items
        }
        break;
    case ZT_POISON_GAS:
        if (mdat.mresists & MR_POISON) {
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        if (mdat.mresists & MR_ACID) {
            break;
        }
        tmp = d(nd, 6);
        if (!rn2(6)) { /* acid_damage(MON_WEP) */ }
        if (!rn2(6)) { /* erode_armor */ }
        break;
    }

    // C ref: zap.c:4375-4377 — resist halves damage
    if (tmp > 0 && type >= 0 &&
        resist(mon, type < ZT_SPELL(0) ? WAND_CLASS : 0)) {
        tmp = Math.floor(tmp / 2);
    }
    if (tmp < 0) tmp = 0;

    mon.mhp -= tmp;
    return tmp;
}

// C ref: mon.c:3178-3252 corpse_chance() — use shared implementation from mon.js
// (imported at top of file)

// C ref: mon.c:3581 xkilled() — handle monster death
// Creates corpse, awards XP
async function xkilled_local(mon, map, player, display) {
    // Award experience
    const exp = (mon.m_lev + 1) * (mon.m_lev + 1);
    player.exp += exp;
    player.score += exp;
    await newexplevel(player, display);

    // C ref: mon.c:3581 — "illogical but traditional" treasure drop
    rn2(6);

    // C ref: mon.c:3243 — corpse_chance
    const createCorpse = corpse_chance(mon);

    if (createCorpse) {
        // C ref: mksobj(CORPSE, TRUE, FALSE) — newobj() consumes next_ident().
        const o_id = next_ident();

        // C ref: mksobj_init -> rndmonnum for corpse init
        const rndmndx = rndmonnum(1);

        // C ref: mksobj_postinit -> gender for random monster
        if (rndmndx >= 0) {
            const rndmon = mons[rndmndx];
            const f2 = rndmon ? rndmon.mflags2 || 0 : 0;
            if (!(f2 & M2_NEUTER) && !(f2 & M2_FEMALE) && !(f2 & M2_MALE)) {
                rn2(2); // sex
            }
        }

        // C ref: set_corpsenm -> start_corpse_timeout for the RANDOM monster
        // (lichen/lizard skip is checked against random monster, not actual monster)
        if (rndmndx !== PM_LIZARD && rndmndx !== PM_LICHEN
            && mons[rndmndx] && mons[rndmndx].mlet !== S_TROLL) {
            // Normal rot timeout: rnz(10) during gameplay, rnz(25) during mklev
            rnz(10);
        }

        // Place corpse on the map
        if (map) {
            const corpse = {
                otyp: CORPSE,
                oclass: FOOD_CLASS,
                material: FLESH,
                o_id,
                corpsenm: mon.mndx || 0,
                displayChar: '%',
                displayColor: 7,
                ox: mon.mx,
                oy: mon.my,
                cursed: false,
                blessed: false,
                oartifact: 0,
                // C ref: mkobj.c set_corpsenm() stamps corpse age with monstermoves.
                age: (player?.turns || 0) + 1,
            };
            placeFloorObject(map, corpse);
        }
    }
}

// Main zap handler — called from cmd.js
// C ref: zap.c dozap() — faithfully follows C ordering
export async function handleZap(player, map, display, game) {
    // C ref: zap.c:2626 — getobj("zap", zap_ok, GETOBJ_NOFLAGS)
    const wands = (player.inventory || []).filter(o => o.oclass === WAND_CLASS);
    if (wands.length === 0) {
        await pline("You don't have anything to zap.");
        return { moved: false, tookTime: false };
    }

    const zapPrompt = `What do you want to zap? [${wands.map(w => w.invlet).join('')} or ?*] `;
    await display.putstr_message(zapPrompt);
    const itemCh = await nhgetch();
    const itemChar = String.fromCharCode(itemCh);
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };

    if (itemCh === 27 || itemCh === 10 || itemCh === 13 || itemChar === ' ') {
        replacePromptMessage();
        await pline('Never mind.');
        return { moved: false, tookTime: false };
    }

    const selected = player.inventory.find(o => o.invlet === itemChar);
    if (selected && selected.oclass !== WAND_CLASS) {
        replacePromptMessage();
        await pline("That's not a wand!");
        return { moved: false, tookTime: false };
    }
    const wand = wands.find(w => w.invlet === itemChar);
    if (!wand) {
        replacePromptMessage();
        await pline("You don't have that object.");
        return { moved: false, tookTime: false };
    }
    replacePromptMessage();

    // C ref: zap.c:2632 — need_dir check BEFORE direction prompt
    const need_dir = (objectData[wand.otyp]?.oc_dir || 0) !== 1; // NODIR = 1

    // C ref: zap.c:2633-2634 — zappable check (before direction prompt)
    if (!zappable(wand)) {
        await pline('Nothing happens.');
        return { moved: false, tookTime: true };
    }

    // C ref: zap.c:2635-2640 — cursed wand backfire (before direction prompt)
    // WAND_BACKFIRE_CHANCE = 100 in C (hack.h:1415)
    if (wand.cursed && !rn2(100)) {
        await backfire(wand, player);
        await exercise(player, A_STR, false);
        useupall(wand, player);
        return { moved: false, tookTime: true };
    }

    // C ref: zap.c:2641 — getdir for directional wands
    if (need_dir) {
        const dirResult = await getdir(null, display);
        if (!dirResult) {
            // C ref: zap.c:2642-2643 — "glows and fades" when direction cancelled
            if (!player.blind) {
                await pline(`${The(xname(wand))} glows and fades.`);
            }
            // C: "make him pay for knowing !NODIR" — still takes time
            return { moved: false, tookTime: true };
        }
        player.dx = dirResult.dx;
        player.dy = dirResult.dy;
        player.dz = dirResult.dz;
    } else {
        // NODIR wands: no direction needed
        player.dx = 0;
        player.dy = 0;
        player.dz = 0;
    }

    // C ref: zap.c:2645-2652 — zapping yourself (direction = self)
    if (need_dir && !player.dx && !player.dy && !player.dz) {
        const damage = await zapyourself(wand, player, true, map);
        if (damage > 0) {
            // hp loss is already applied in zapyourself()
        }
    } else {
        // C ref: zap.c:2660-2663 — weffects for directed/non-directed wands
        await weffects(wand, player, map, display, game);
    }

    // C ref: zap.c:2665-2669 — post-zap: wand turns to dust if spe < 0
    if (wand && wand.spe < 0) {
        await pline(`${The(xname(wand))} turns to dust.`);
        useupall(wand, player);
    }

    return { moved: false, tookTime: true };
}

// C ref: zap.c dozap() name-parity surface.
export async function dozap(player, map, display, game) {
  return handleZap(player, map, display, game);
}

// -- Phase 5: Additional zap functions --

// Beam type constants (exported)
export { ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP, ZT_DEATH, ZT_LIGHTNING };
export { ZT_POISON_GAS, ZT_ACID, ZT_WAND, ZT_SPELL, ZT_BREATH };
export { MAGIC_COOKIE };
export { zaptype, flash_str, is_hero_spell };

// cf. zap.c destroy_item() — destroy items in hero inventory by type
// osym: object class symbol, dmgtyp: AD_FIRE/AD_COLD/AD_ELEC
export function destroy_item(osym, dmgtyp, player) {
  if (!player || !player.inventory) return 0;
  let cnt = 0;
  // Iterate inventory, check each item for destroyability
  for (const obj of player.inventory) {
    if (obj.oartifact) continue; // artifacts immune
    if (!destroyable_by(obj, dmgtyp)) continue;
    // Each item has 1 in 3 chance of being destroyed per unit
    for (let i = 0; i < (obj.quan || 1); i++) {
      if (!rn2(3)) cnt++;
    }
  }
  // Actual destruction deferred — just consume RNG for parity
  return cnt;
}

// cf. zap.c destroy_mitem() — destroy items in monster inventory
export function destroy_mitem(mon, osym, dmgtyp) {
  if (!mon || !mon.minvent) return 0;
  let cnt = 0;
  for (const obj of mon.minvent) {
    if (obj.oartifact) continue;
    if (!destroyable_by(obj, dmgtyp)) continue;
    for (let i = 0; i < (obj.quan || 1); i++) {
      if (!rn2(3)) cnt++;
    }
  }
  return cnt;
}

// Check if object is destroyable by damage type
function destroyable_by(obj, dmgtyp) {
  const { AD_FIRE, AD_COLD, AD_ELEC } = { AD_FIRE: 2, AD_COLD: 3, AD_ELEC: 6 };
  if (dmgtyp === AD_FIRE) {
    return obj.oclass === POTION_CLASS || obj.oclass === SCROLL_CLASS ||
           obj.oclass === SPBOOK_CLASS;
  }
  if (dmgtyp === AD_COLD) {
    return obj.oclass === POTION_CLASS;
  }
  if (dmgtyp === AD_ELEC) {
    return obj.oclass === RING_CLASS || obj.oclass === WAND_CLASS;
  }
  return false;
}

// ============================================================
// cf. zap.c revive() — revive a corpse into a living monster
// ============================================================
const CORPSTAT_GENDER = 0x03;
const CORPSTAT_FEMALE = 1;
const CORPSTAT_MALE = 2;

export async function revive(obj, by_hero, map, player = null) {
  if (!obj || obj.otyp !== CORPSE) return null;

  const montype = obj.corpsenm;
  if (montype == null || montype < 0) return null;
  const mptr = mons[montype];
  if (!mptr) return null;

  const is_zomb = (mptr.mlet === S_ZOMBIE);

  // C ref: zap.c:910-937 — get location from corpse
  let x = obj.ox || 0;
  let y = obj.oy || 0;

  // C ref: zap.c:948-950 — container checks
  // If in a bag of holding, rn2(40) chance to fail
  if (obj.where === 'contained' && obj.ocontainer) {
    const container = obj.ocontainer;
    if (container.olocked) return null;
    if (container.otyp === BAG_OF_HOLDING && rn2(40)) return null;
  }

  if (!x && !y) return null;

  // C ref: zap.c:960-963 — if occupied, try adjacent spot via enexto(),
  // which consumes collect_coords RNG in teleport.c.
  if (map?.monsterAt?.(x, y)) {
    const xy = { x: 0, y: 0 };
    if (enexto(xy, x, y, mptr, map, player)) {
      x = xy.x;
      y = xy.y;
    }
  }

  // C ref: zap.c:965-971 — norevive or eel-not-in-water check
  if (obj.norevive) return null;

  // C ref: zap.c:974-979,1004-1007 — pass corpse sex flags through mmflags.
  const cgend = Number(obj.spe || 0) & CORPSTAT_GENDER;
  // C ref: zap.c revive() initializes mmflags to
  // NO_MINVENT | MM_NOWAIT | MM_NOMSG, then ORs MM_NOCOUNTBIRTH.
  let mmflags = NO_MINVENT | MM_NOWAIT | MM_NOMSG | MM_NOCOUNTBIRTH;
  if (cgend === CORPSTAT_MALE) mmflags |= MM_MALE;
  else if (cgend === CORPSTAT_FEMALE) mmflags |= MM_FEMALE;

  // C ref: zap.c revive() passes MM_NOCOUNTBIRTH plus optional gender flags.
  const reviveDepth = Number.isInteger(player?.dungeonLevel)
    ? player.dungeonLevel
    : (Number.isInteger(map?.uz?.dlevel) ? map.uz.dlevel : 1);
  const mtmp = makemon(mptr, x, y, mmflags, reviveDepth, map);
  if (!mtmp) return null;

  // C ref: zap.c:1012-1017 — unhide revived monster
  if (mtmp.mundetected) mtmp.mundetected = 0;

  // C ref: zap.c:1019-1021 — handle quan > 1
  // (simplified: just use up the corpse)

  // C ref: zap.c:1024-1060 — by_hero shop charge and messages
  if (by_hero) {
    await pline("The corpse glows iridescently.");
  }

  // Remove the corpse from the map
  if (map) {
    if (typeof map.removeObject === 'function') map.removeObject(obj);
    else if (typeof map.removeFloorObject === 'function') map.removeFloorObject(obj);
  }

  return mtmp;
}

// ============================================================
// cf. zap.c cancel_monst() — cancel a monster's magical abilities
// ============================================================
export function cancel_monst(mon, obj, youattack, allow_cancel_kill, self_cancel) {
  if (!mon) return false;

  // C ref: zap.c:3146-3148 — resist check
  const oclass = obj ? obj.oclass : 0;
  if (resist(mon, oclass, 0)) return false;

  // C ref: zap.c:3150-3162 — self_cancel: cancel inventory
  if (self_cancel) {
    if (mon.minvent) {
      for (const otmp of mon.minvent) {
        cancel_item(otmp);
      }
    }
  }

  // C ref: zap.c:3184-3200 — cancel the monster
  mon.mcan = 1;

  // C ref: zap.c:3189-3200 — clay golem dies when cancelled
  if (mon.mndx === PM_CLAY_GOLEM) {
    if (allow_cancel_kill) {
      mon.mhp = 0;
      // Caller handles death
    }
  }
  return true;
}

// Helper: cancel_item — cancel an object's magical properties
function cancel_item(obj) {
  if (!obj) return;
  // C ref: zap.c — cancel items: remove charges from wands, remove
  // enchantment from weapons/armor, etc.
  if (obj.oclass === WAND_CLASS) {
    obj.spe = -1; // discharged
  }
  if (obj.blessed) obj.blessed = false;
  if (obj.spe > 0 && (obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS)) {
    obj.spe = 0;
  }
  obj.oerodeproof = false;
}

// ============================================================
// cf. zap.c bhitm() — bolt/beam hits monster (IMMEDIATE wand effect)
// ============================================================
export async function bhitm(mon, otmp, map, player) {
  if (!mon || !otmp) return 0;
  let ret = 0;
  let wake = true;
  const otyp = otmp.otyp;

  switch (otyp) {
  case WAN_STRIKING:
  case SPE_FORCE_BOLT: {
    // C ref: zap.c:200 — rnd(20) < 10 + find_mac(mon)
    const mac = find_mac ? find_mac(mon) : (mon.mac || 10);
    if (rnd(20) < 10 + mac) {
      const dmg = d(2, 12);
      resist(mon, otmp.oclass);
      mon.mhp -= dmg;
    }
    break;
  }
  case WAN_SLOW_MONSTER:
  case SPE_SLOW_MONSTER:
    if (!resist(mon, otmp.oclass)) {
      mon_adjust_speed(mon, -1, otmp);
    }
    break;
  case WAN_SPEED_MONSTER:
    if (!resist(mon, otmp.oclass)) {
      mon_adjust_speed(mon, 1, otmp);
    }
    break;
  case WAN_UNDEAD_TURNING:
  case SPE_TURN_UNDEAD: {
    wake = false;
    const mdat = mons[mon.mndx];
    if (is_undead(mdat)) {
      wake = true;
      const dmg = rnd(8);
      if (!resist(mon, otmp.oclass)) {
        mon.mhp -= dmg;
        await monflee(mon, 0, false, true);
      }
    }
    break;
  }
  case WAN_POLYMORPH:
  case SPE_POLYMORPH:
    // C: resists_magm gate (no RNG) before resist() call
    if ((mons[mon.mndx]?.mr || 0) > 50) {
      // magic resistance blocks polymorph — no RNG consumed
    } else if (!resist(mon, otmp.oclass)) {
      // C: rn2(25) only for natural (non-shapechanger) monsters
      const NON_PM = -1;
      if ((mon.cham === undefined || mon.cham === NON_PM) && !rn2(25)) {
        // system shock — kills the monster
        mon.mhp = 0;
      }
      // else: would call newcham() — simplified, no actual poly
    }
    break;
  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
    cancel_monst(mon, otmp, true, true, false);
    break;
  case WAN_TELEPORTATION:
  case SPE_TELEPORT_AWAY:
    // C: no resist() check — just teleport directly
    u_teleport_mon(mon, true, map, player, null, null);
    break;
  case WAN_MAKE_INVISIBLE:
    mon_set_minvis(mon, map);
    break;
  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    wake = false;
    break;
  case WAN_PROBING:
    wake = false;
    await probe_monster(mon);
    break;
  case WAN_OPENING:
  case SPE_KNOCK:
    wake = false;
    break;
  case SPE_HEALING:
  case SPE_EXTRA_HEALING: {
    const healamt = d(6, otyp === SPE_EXTRA_HEALING ? 8 : 4);
    wake = false;
    if (mon.mndx !== PM_DEATH - 1) { // not Pestilence
      healmon(mon, healamt, 0);
    } else {
      resist(mon, otmp.oclass);
    }
    break;
  }
  case WAN_LIGHT:
    // broken wand light effect — simplified
    break;
  case WAN_SLEEP:
    // broken wand sleep effect
    if (sleep_monst(mon, d(1 + (otmp.spe || 0), 12), WAND_CLASS))
      slept_monst(mon);
    break;
  case SPE_DRAIN_LIFE:
    // drain life — simplified
    if (!resist(mon, otmp.oclass)) {
      const dmg = d(2, 8);
      mon.mhp -= dmg;
    }
    break;
  default:
    ret = 0;
    break;
  }

  // Wake the monster (if appropriate)
  if (wake && mon.mhp > 0) {
    if (mon.msleeping) {
        mon.msleeping = 0;
        mon.sleeping = false;
    }
    if (mon.mcanmove === false || mon.mcanmove === 0) { mon.mcanmove = 1; mon.mfrozen = 0; }
  }

  return ret;
}

// ============================================================
// cf. zap.c burn_floor_objects() — fire on floor
// ============================================================
export async function burn_floor_objects(x, y, give_feedback, u_caused, map) {
  if (!map) return 0;
  let cnt = 0;
  const objects_at = map.objectsAt ? map.objectsAt(x, y) : [];
  if (!objects_at || objects_at.length === 0) return 0;

  // C ref: zap.c:4594 — iterate floor objects
  for (const obj of [...objects_at]) {
    if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
      // SCR_FIRE and SPE_FIREBALL resist
      if (obj.otyp === SCR_FIRE) continue;
      if (obj_resists(obj, 2, 100)) continue;

      const scrquan = obj.quan || 1;
      let delquan = 0;
      for (let i = scrquan; i > 0; i--) {
        if (!rn2(3)) delquan++;
      }
      if (delquan) {
        cnt += delquan;
        if (give_feedback) {
          if (delquan > 1)
            await pline("%d objects burn.", delquan);
          else
            await pline("An object burns.");
        }
        // Simplified: remove entire object if all copies burned
        if (delquan >= scrquan) {
          if (map.removeFloorObject) map.removeFloorObject(obj);
        } else {
          obj.quan = scrquan - delquan;
        }
      }
    }
  }
  return cnt;
}

// ============================================================
// cf. zap.c buzz() — main beam propagation (C-style interface)
// ============================================================
// Autotranslated from zap.c:4705
export function buzz(type, nd, sx, sy, dx, dy) {
  dobuzz(type, nd, sx, sy, dx, dy, true, false);
}

export async function zapnodir(obj, player, map, display, game) {
  if (!obj) return;
  let known = false;

  switch (obj.otyp) {
  case WAN_LIGHT:
  case SPE_LIGHT:
    await pline("A lit field surrounds you.");
    known = !!obj.dknown;
    break;
  case WAN_SECRET_DOOR_DETECTION:
  case SPE_DETECT_UNSEEN:
    await findit(player, map, display, game);
    known = !!obj.dknown;
    break;
  case WAN_CREATE_MONSTER: {
    // C ref: zap.c zapnodir() create_critters(rn2(23)?1:rn1(7,2), ...).
    const count = rn2(23) ? 1 : rn1(7, 2);
    let created = 0;
    for (let i = 0; i < count; i++) {
      const mon = makemon(null, player?.x || 0, player?.y || 0, 0, player?.dungeonLevel || 1, map);
      if (mon) created++;
    }
    if (created > 0) known = !!obj.dknown;
    break;
  }
  case WAN_WISHING:
    // Keep non-blocking behavior for replay safety.
    if (((player?.luck || 0) + rn2(5)) < 0) {
      await pline("Unfortunately, nothing happens.");
    } else {
      await pline("You feel that a wish is possible.");
      known = !!obj.dknown;
    }
    break;
  case WAN_ENLIGHTENMENT:
    await do_enlightenment_effect(player, display, game);
    known = !!obj.dknown;
    break;
  default:
    break;
  }

  // C ref: zap.c zapnodir() -> learnwand() when effect is observable.
  if (known) discoverObject(obj.otyp, true, true);
}

async function bhit_zapped_wand(obj, player, map) {
  if (!obj || !player || !map) return null;
  const ddx = player.dx || 0;
  const ddy = player.dy || 0;
  if (!ddx && !ddy) return null;

  // C ref: zap.c bhit() uses flashbeam glyph for zapped wand traversal.
  const flashbeam = { ch: '*', color: 11 };
  // C ref: zap.c weffects()->bhit(..., rn1(8,6), ...)
  let range = rn1(8, 6);
  let result = null;
  let x = player.x;
  let y = player.y;

  tmp_at(DISP_BEAM, flashbeam);
  try {
    while (range-- > 0) {
      x += ddx;
      y += ddy;

      if (!isok(x, y)) {
        x -= ddx;
        y -= ddy;
        break;
      }
      const loc = map.at(x, y);
      if (!loc) break;

      tmp_at(x, y);
      await nh_delay_output();

      const mon = map.monsterAt ? map.monsterAt(x, y) : null;
      if (mon && !mon.dead) {
        if (await bhitm(mon, obj, map, player)) {
          result = mon;
          break;
        }
        range -= 3;
      }

      if (await bhitpile(obj, bhito, x, y, 0, map)) {
        range--;
      }

      if (IS_WALL(loc.typ) || (IS_DOOR(loc.typ) && loc.flags)) {
        x -= ddx;
        y -= ddy;
        break;
      }
    }
  } finally {
    tmp_at(DISP_END, 0);
  }

  return result;
}

function beamTempGlyph(type, dx, dy) {
  const fltyp = zaptype(type);
  const damgtype = fltyp % 10;
  const ch = (dx !== 0 && dy !== 0) ? '/' : (dx !== 0 ? '-' : '|');
  let color = 12;
  if (damgtype === ZT_FIRE) color = 1;
  else if (damgtype === ZT_COLD) color = 6;
  else if (damgtype === ZT_LIGHTNING) color = 11;
  else if (damgtype === ZT_POISON_GAS) color = 2;
  else if (damgtype === ZT_ACID) color = 10;
  return { ch, color };
}

// cf. zap.c:4720 dobuzz() — full beam propagation with bounce logic
async function dobuzz(type, nd, sx, sy, dx, dy, sayhit, saymiss, map, player) {
  const fltyp = zaptype(type);
  const damgtype = fltyp % 10;
  // C: int hdmgtype = Hallucination ? rn2(6) : damgtype;
  // rn2(6) consumed when hallucinating (display only, but RNG matters)
  const halluc = player?.uprops?.[HALLUC];
  if (halluc && (halluc.intrinsic || halluc.extrinsic)) {
    rn2(6); // hallucination beam color randomization
  }
  let range = rn1(7, 7); // C ref: zap.c:4763
  if (dx === 0 && dy === 0) range = 1;

  let lsx, lsy;
  let shopdamage = false;

  tmp_at(DISP_BEAM, beamTempGlyph(type, dx, dy));
  try {
    while (range-- > 0) {
      lsx = sx;
      sx += dx;
      lsy = sy;
      sy += dy;

      if (!isok(sx, sy)) { sx = lsx; sy = lsy; break; }
      const loc = map ? map.at(sx, sy) : null;
      if (!loc) { sx = lsx; sy = lsy; break; }
      tmp_at(sx, sy);
      await nh_delay_output();
      if (loc.typ === 0) goto_bounce(); // STONE

      // C ref: zap.c:4797-4802 — zap_over_floor for non-fireball, non-gas
      if (damgtype !== ZT_POISON_GAS) {
        range += await zap_over_floor(sx, sy, type, { value: shopdamage }, true, 0, map);
      }

      // Check for monster
      const mon = map ? map.monsterAt(sx, sy) : null;
      if (mon && !mon.dead) {
        const mac = find_mac ? find_mac(mon) : (mon.mac || 10);
        if (zap_hit(mac, 0)) {
          // C ref: zap.c:4825 — zhitm
          const tmp = zhitm(mon, type, nd, map);

          if (tmp === MAGIC_COOKIE) {
            // disintegration
            mon.mhp = 0;
          }
          if (mon.mhp <= 0) {
            // monster killed
            if (type >= 0) {
              // killed by hero
              if (map.removeMonster) map.removeMonster(mon);
              mondead(mon, map, player);
            } else {
              // killed by other monster
              if (map.removeMonster) map.removeMonster(mon);
              mondead(mon, map, player);
            }
          } else {
            if (damgtype === ZT_SLEEP && mon.msleeping) {
              slept_monst(mon);
            }
          }
          range -= 2;
        }
      }

      // Check for player hit
      if (player && sx === player.x && sy === player.y && range >= 0) {
        if (zap_hit(player.uac || 10, 0)) {
          range -= 2;
          // C ref: zap.c:4920 — zhitu / zap_over_floor player damage
          const damgtype = zaptype(type) % 10;
          const dam = d(nd, 6);
          if (player.uhp) player.uhp -= dam;
          // C ref: exercise calls from zap_over_floor (zap.c:4395-4524)
          if (damgtype === ZT_MAGIC_MISSILE) {
            exercise(player, A_STR, false);
          } else if (damgtype === ZT_FIRE) {
            if (burnarmor(player, player) || rn2(3)) { /* destroy_items stub */ }
          } else if (damgtype === ZT_COLD) {
            if (!rn2(3)) { /* destroy_items stub */ }
          } else if (damgtype === ZT_LIGHTNING) {
            exercise(player, A_CON, false);
            if (!rn2(3)) { /* destroy_items stub */ }
          } else if (damgtype === ZT_ACID) {
            exercise(player, A_STR, false);
          }
        }
      }

      // C ref: zap.c:4938-4993 — beam bounce off walls
      if (loc && (IS_WALL(loc.typ) || IS_DOOR(loc.typ))) {
        // Bounce logic
        // C ref: STONE→10, mine walls→20, else→75
        const bchance = (loc.typ === 0 /*STONE*/) ? 10 : IS_WALL(loc.typ) ? 75 : 75;
        if (!dx || !dy || !rn2(bchance)) {
          dx = -dx;
          dy = -dy;
        } else {
          // Check diagonal bounce directions
          const loc1 = map.at(sx, lsy);
          const loc2 = map.at(lsx, sy);
          let bounce = 0;
          if (loc1 && !IS_WALL(loc1.typ) && !IS_DOOR(loc1.typ))
            bounce = 1;
          if (loc2 && !IS_WALL(loc2.typ) && !IS_DOOR(loc2.typ)) {
            if (!bounce || rn2(2)) bounce = 2;
          }
          switch (bounce) {
          case 0: dx = -dx; // fallthrough
          case 1: dy = -dy; break;
          case 2: dx = -dx; break;
          }
        }
        // Back up to before wall
        sx = lsx;
        sy = lsy;
      }
    }
  } finally {
    tmp_at(DISP_END, 0);
  }

  function goto_bounce() {
    // For STONE tiles, reverse
    sx = lsx;
    sy = lsy;
    dx = -dx;
    dy = -dy;
  }
}

// ============================================================
// cf. zap.c weffects() — wand zap dispatch
// ============================================================
export async function weffects(obj, player, map, display = null, game = null) {
  if (!obj) return;
  const otyp = obj.otyp;
  const wasUnknown = !objectData[otyp]?.known;
  let disclose = false;

  // C ref: zap.c:3424 — exercise wisdom
  if (player) await exercise(player, A_WIS, true);

  const od = objectData[otyp];
  const dir_type = od ? od.oc_dir : 0;
  // NODIR=1, IMMEDIATE=2, RAY=3 in objectData.

  if (player?.usteed && dir_type !== 1 && !player.dx && !player.dy && player.dz > 0) {
    if (await zap_steed(obj, player, map)) disclose = true;
  } else
  if (dir_type === 2) {
    // C ref: zap.c:3436 — bhit for lateral, zap_updown for up/down.
    zapsetup(player);
    if (player?.ustuck) {
      await bhitm(player.ustuck, obj, map, player);
    } else if (player && player.dz) {
      if (await zap_updown(obj, player, map)) disclose = true;
    } else {
      await bhit_zapped_wand(obj, player, map);
    }
    await zapwrapup(obj, disclose, player, display);
  } else if (dir_type === 1) {
    await zapnodir(obj, player, map, display, game);
  } else {
    // RAY wand or spell
    if (otyp === WAN_DIGGING || otyp === SPE_DIG) {
      await zap_dig_core(map, player);
    } else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
      const beamType = wandToBeamType(otyp);
      if (beamType >= 0 && player) {
        const nd = (otyp === WAN_MAGIC_MISSILE) ? 2 : 6;
        await buzz(ZT_WAND(beamType), nd, player.x, player.y,
            player.dx || 0, player.dy || 0, map, player);
        disclose = true;
      }
    }
  }
  if (disclose || wasUnknown) {
    learnwand(obj);
  }
}

// ============================================================
// cf. zap.c bhitpile() — beam hits pile of objects
// ============================================================
export async function bhitpile(obj, fhito_fn, tx, ty, zz, map) {
  if (!map) return 0;
  const objects_at = map.objectsAt ? map.objectsAt(tx, ty) : [];
  if (!objects_at || objects_at.length === 0) return 0;

  let hitanything = 0;
  for (const otmp of [...objects_at]) {
    hitanything += fhito_fn(otmp, obj, map);
  }
  if (gp_poly_zapped >= 0) {
    const pileNow = map.objectsAt ? map.objectsAt(tx, ty) : [];
    if (pileNow && pileNow.length > 0) {
      await create_polymon(pileNow[0], gp_poly_zapped, map, null);
    }
    gp_poly_zapped = -1;
  }
  return hitanything;
}

// ============================================================
// cf. zap.c backfire() — wand backfire on hero
// ============================================================
export async function backfire(obj, player) {
  if (!obj || !player) return;
  // C ref: zap.c:2593-2602
  await pline("The wand suddenly explodes!");
  const dmg = d((obj.spe || 0) + 2, 6);
  if (player.uhp) player.uhp -= dmg;
  // C would call useupall — simplified
}

// ============================================================
// cf. zap.c poly_obj() — polymorph object
// ============================================================
export function poly_obj(obj, id) {
  if (!obj) return obj;

  // C ref: zap.c:1700-1987
  if (id === STRANGE_OBJECT) {
    // Standard polymorph — try up to 3 times to match magic status
    let try_limit = 3;
    const magic_obj = objectData[obj.otyp] ? (objectData[obj.otyp].oc_magic || 0) : 0;
    let otmp = null;
    do {
      // mkobj creates a random object of the same class
      // Simplified: just pick a new otyp of the same class
      otmp = mkobj(obj.oclass, false);
    } while (--try_limit > 0 && otmp &&
             (objectData[otmp.otyp] ? (objectData[otmp.otyp].oc_magic || 0) : 0) !== magic_obj);

    if (otmp) {
      // Preserve properties
      otmp.quan = obj.quan || 1;
      otmp.cursed = obj.cursed;
      otmp.blessed = obj.blessed;
      otmp.ox = obj.ox;
      otmp.oy = obj.oy;
      // C ref: zap.c:1830 — merge check
      if (otmp.quan > 1 && rn2(1000) < otmp.quan) otmp.quan = 1;
    }
    return otmp || obj;
  } else {
    // Specific polymorph target
    const otmp = mksobj(id, false, false);
    if (otmp) {
      otmp.quan = obj.quan || 1;
      otmp.cursed = obj.cursed;
      otmp.blessed = obj.blessed;
      otmp.ox = obj.ox;
      otmp.oy = obj.oy;
    }
    return otmp || obj;
  }
}

// ============================================================
// cf. zap.c obj_zapped() — object hit by beam type
// (Not the same as bhito — this is for RAY beams hitting floor objects)
// ============================================================
export function obj_zapped(obj, type) {
  if (!obj) return false;
  // C does not have a standalone obj_zapped function of this form;
  // RAY beam floor effects are handled by zap_over_floor.
  // This is kept for interface compatibility.
  return false;
}

// ============================================================
// cf. zap.c:1474 obj_shudders() — object resists polymorph (shudder check)
// Returns true if object should be destroyed instead of polymorphed
// ============================================================
// Autotranslated from zap.c:1473
export function obj_shudders(obj, game) {
  let zap_odds;
  if (game.svc.context.bypasses && obj.bypass) return false;
  if (obj.oclass === WAND_CLASS) zap_odds = 3;
  else if (obj.cursed) zap_odds = 3;
  else if (obj.blessed) zap_odds = 12;
  else {
    zap_odds = 8;
  }
  if (obj.quan > 4) {
    zap_odds /= 2;
  }
  return !rn2(zap_odds);
}

// ============================================================
// cf. zap.c:1635 do_osshock() — destroy an object on the floor (polymorph zap)
// ============================================================
export function do_osshock(obj, map, player) {
  if (!obj) return;

  // C ref: zap.c:1643
  go_obj_zapped = true;

  // C ref: zap.c:1645-1652 — check for polymorph into golem
  // poly_zapped check: each unit has Luck+45 chance
  const quan = obj.quan || 1;
  if (gp_poly_zapped < 0) {
    for (let i = quan; i > 0; i--) {
      const luck = (player && player.luck) || 0;
      if (!rn2(luck + 45)) {
        gp_poly_zapped = objectData[obj.otyp]?.oc_material ?? 0;
        break;
      }
    }
  }

  // C ref: zap.c:1655-1660 — split if quan > 1
  if (quan > 1) {
    rnd(quan - 1); // consume RNG for split amount
  }

  // C ref: zap.c:1671 — delete the object
  if (map && map.removeFloorObject) {
    map.removeFloorObject(obj);
  }
}

// C ref: zap.c makewish() — grant an object wish and hand it to hero.
export async function makewish(wishText, player, display) {
    let otmp = readobjnam(wishText, false, {
        wizard: !!player?.wizard,
        wizkit_wishing: !!player?.program_state?.wizkit_wishing,
        player,
        map: player?.map || null,
    });
    if (otmp === hands_obj) {
        return otmp;
    }
    if (!otmp) {
        if (display) await display.putstr_message('Nothing fitting that description exists.');
        return null;
    }
    const got = await hold_another_object(otmp, player, 'Oops!  %s to the floor!', null, null);
    if (player) {
        player.ublesscnt = (player.ublesscnt || 0) + rn1(100, 50);
    }
    return got || otmp;
}

// ============================================================
// cf. zap.c:624 probe_monster() — probing wand effect
// ============================================================
export async function probe_monster(mon) {
  if (!mon) return;

  // C ref: zap.c:626 — mstatusline
  await mstatusline(mon);

  // C ref: zap.c:630-637 — display inventory or "not carrying anything"
  if (mon.minvent && mon.minvent.length > 0) {
    display_minventory(mon);
  } else {
    await pline("%s is not carrying anything.", Monnam(mon));
  }
}

// ============================================================
// cf. zap.c:3567 skiprange() — range calculation for thrown rocks
// ============================================================
// Autotranslated from zap.c:3566
export function skiprange(range) {
  let tr = Math.floor(range / 4), tmp = range - ((tr > 0) ? rnd(tr) : 0);
  const skipstart = tmp;
  let skipend = tmp - (Math.floor(tmp / 4) * rnd(3));
  if (skipend >= tmp) skipend = tmp - 1;
  return { skipstart, skipend };
}

// ============================================================
// cf. zap.c maybe_explode_wand — not actually in C as a standalone
// This was a JS-only stub. Keeping for interface but implementing
// the logic from dozap's cursed-wand backfire check.
// ============================================================
export function maybe_explode_wand(obj, dx, dy) {
  if (!obj) return false;
  // C ref: zap.c:2635 — cursed wands have 1/WAND_BACKFIRE_CHANCE to explode
  // WAND_BACKFIRE_CHANCE = 100 in C (hack.h:1415)
  if (obj.cursed && !rn2(100)) return true;
  return false;
}

// ============================================================
// cf. zap.c break_wand — wand breaking with explosion
// Called when a wand is broken (applied '#a' or force-breaking)
// ============================================================
export async function break_wand(obj, player, map) {
  if (!obj || !player) return;
  const {
    explode, EXPL_DARK, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY,
  } = await import('./explode.js');

  // C ref: do_break_wand in zap.c (dozap.c in older versions)
  // Determine explosion type and damage
  const spe = obj.spe || 0;
  let dmg = 0;

  const beamType = wandToBeamType(obj.otyp);
  if (beamType >= 0) {
    // RAY wand — explodes with beam damage
    // C ref: damage is d(spe+2, 6) for the wand explosion
    dmg = d(spe + 2, 6);
  } else {
    // Non-beam wand — less dramatic
    dmg = d(spe + 2, 6);
  }

  await pline("The wand explodes!");
  if (beamType < 0 || !map) {
    if (player.uhp) player.uhp -= dmg;
    return;
  }

  let adtyp = 0;
  let expltype = EXPL_DARK;
  switch (beamType) {
  case ZT_MAGIC_MISSILE:
    adtyp = 1; // AD_MAGM
    expltype = EXPL_MAGICAL;
    break;
  case ZT_FIRE:
    adtyp = 2; // AD_FIRE
    expltype = EXPL_FIERY;
    break;
  case ZT_COLD:
    adtyp = 3; // AD_COLD
    expltype = EXPL_FROSTY;
    break;
  case ZT_SLEEP:
  case ZT_DEATH:
  case ZT_LIGHTNING:
  default:
    adtyp = 0; // AD_PHYS-ish fallback in current explode.js
    expltype = EXPL_MAGICAL;
    break;
  }
  await explode(player.x, player.y, adtyp, dmg, WAND_CLASS, expltype, map, player);
}

// ============================================================
// cf. zap.c:5111 zap_over_floor() — beam floor effects
// Effects on floor tiles: melt ice, evaporate pools, burn scrolls, etc.
// Returns range modifier (negative = reduce range)
// ============================================================
export async function zap_over_floor(x, y, type, shopdamage_ref, ignoremon, exploding_wand_typ, map) {
  if (!map) return 0;
  let rangemod = 0;
  const damgtype = zaptype(type) % 10;
  const loc = map.at(x, y);
  if (!loc) return 0;

  switch (damgtype) {
  case ZT_FIRE:
    // C ref: zap.c:5133-5206 — fire effects on floor
    // burn webs, melt ice, evaporate pools, etc.
    // Simplified: burn floor objects if present
    if (map.objectsAt) {
      const objs = map.objectsAt(x, y);
      if (objs && objs.length > 0) {
        await burn_floor_objects(x, y, false, type > 0, map);
      }
    }
    break;

  case ZT_COLD:
    // C ref: zap.c:5208-5303 — cold effects: freeze water, etc.
    // Simplified: no pool/ice handling yet
    break;

  case ZT_POISON_GAS:
    // C ref: zap.c:5306-5312 — create gas cloud
    // Simplified: no gas cloud system yet
    break;

  case ZT_LIGHTNING:
  case ZT_ACID:
    // C ref: zap.c:5314-5340 — melt iron bars, etc.
    break;

  default:
    break;
  }

  // C ref: zap.c:5367-5379 — secret door revelation
  // C ref: zap.c:5381-5457 — door destruction by beams
  if (loc && IS_DOOR(loc.typ)) {
    switch (damgtype) {
    case ZT_FIRE:
    case ZT_COLD:
    case ZT_LIGHTNING:
      // Door destroyed
      rangemod = -1000;
      break;
    default:
      // Door absorbs the beam
      rangemod = -1000;
      break;
    }
  }

  return rangemod;
}

// ============================================================
// cf. zap.c:3207 zap_updown() — zap immediate wand up or down
// ============================================================
export async function zap_updown(obj, player, map) {
  if (!obj || !player) return false;
  let disclose = false;
  const x = player.x || 0;
  const y = player.y || 0;
  const loc = map?.at ? map.at(x, y) : null;

  const openOrDestroyBridge = (destroy = false) => {
    if (!map) return false;
    let bx = x;
    let by = y;
    if (!is_db_wall(bx, by, map) && (!loc || (loc.typ !== DRAWBRIDGE_UP
        && loc.typ !== DRAWBRIDGE_DOWN))) {
      return false;
    }
    const db = find_drawbridge(bx, by, map);
    if (!db?.found) return false;
    if (destroy) destroy_drawbridge(db.x, db.y, map, player);
    else open_drawbridge(db.x, db.y, map, player);
    return true;
  };

  const zap_map_downward = async () => {
    if (!map) return;
    const engr = engr_at(map, x, y);
    if (!engr || engr.type === 'headstone') return;
    switch (obj.otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH: {
      del_engr_at(map, x, y);
      const etxt = random_engraving_rng() || '';
      make_engr_at(map, x, y, etxt, 'mark', { degrade: true });
      break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
    case WAN_MAKE_INVISIBLE:
      del_engr_at(map, x, y);
      break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
      rloc_engr(map, engr);
      break;
    case SPE_STONE_TO_FLESH:
      if (engr.type === 'engrave') {
        await pline("The edges on the floor get smoother.");
        await wipe_engr_at(map, x, y, d(2, 4), true);
      }
      break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
      await wipe_engr_at(map, x, y, d(2, 4), true);
      break;
    default:
      break;
    }
  };

  switch (obj.otyp) {
  case WAN_PROBING:
    if (player.dz && player.dz < 0) {
      await pline("You probe towards the ceiling.");
    } else {
      // C ref: zap.c zap_map() handles down-zap engraving effects.
      await zap_map_downward();
      await pline("You probe beneath the floor.");
      // C ref: zap.c:3232 — bhitpile for floor objects
      if (map) await bhitpile(obj, bhito, x, y, player.dz || 1, map);
    }
    return true;

  case WAN_OPENING:
  case SPE_KNOCK:
    // C ref: zap.c:3251-3277 — open drawbridge, release traps
    if (openOrDestroyBridge(false)) {
      disclose = true;
    }
    if (player.dz && player.dz > 0 && player.utrap) {
      player.utrap = 0;
      player.utraptype = TT_NONE;
      disclose = true;
    }
    break;

  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
    // C ref: zap.c:3278-3341 — striking up: dislodge rock
    if (openOrDestroyBridge(true)) {
      disclose = true;
      break;
    }
    if (player.dz && player.dz < 0 && rn2(3)) {
      await pline("A rock is dislodged from the ceiling and falls on your head.");
      const dmg = rnd(6);
      if (player.uhp) player.uhp -= dmg;
    }
    if (player.dz && player.dz > 0 && map?.trapAt) {
      const ttmp = map.trapAt(x, y);
      if (ttmp && ttmp.ttyp === TRAPDOOR) {
        ttmp.ttyp = HOLE;
        ttmp.tseen = 1;
        disclose = true;
      }
    }
    break;

  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    if (map) {
      const db = find_drawbridge(x, y, map);
      if (db?.found) {
        close_drawbridge(db.x, db.y, map, player);
        disclose = true;
        break;
      }
    }
    if (player.dz && player.dz > 0 && map?.trapAt) {
      const ttmp = map.trapAt(x, y);
      if (ttmp && ttmp.ttyp === HOLE) {
        ttmp.ttyp = TRAPDOOR;
        ttmp.tseen = 1;
        disclose = true;
      }
    }
    break;

  default:
    break;
  }

  // C ref: zap.c:3370-3396 — bhitpile for down zaps
  if (player.dz && player.dz > 0 && map) {
    await bhitpile(obj, bhito, x, y, player.dz, map);
    // C ref: zap.c zap_map() — down-zap engraving handling.
    await zap_map_downward();
  }

  return disclose;
}

// ============================================================
// cf. zap.c:2117 bhito() — wand/spell effect hits an object on floor
// ============================================================
export async function bhito(obj, otmp, map) {
  if (!obj || !otmp) return 0;
  if (obj === otmp) return 0; // wand can't affect itself
  let res = 1;

  switch (otmp.otyp) {
  case WAN_POLYMORPH:
  case SPE_POLYMORPH:
    // C ref: zap.c:2189-2219 — polymorph object
    if (obj_shudders(obj)) {
      do_osshock(obj, map);
      break;
    }
    // Would call poly_obj — simplified
    break;

  case WAN_PROBING:
    // C ref: zap.c:2220-2272 — probe object (reveal contents)
    res = 1;
    break;

  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
    // C ref: zap.c:2273-2310 — break boulders, statues
    if (obj.otyp === BOULDER) {
      // fracture_rock — simplified
      obj.otyp = ROCK;
      obj.oclass = GEM_CLASS;
      obj.quan = rn1(60, 7);
    }
    break;

  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
    cancel_item(obj);
    break;

  case SPE_DRAIN_LIFE:
    // drain_item — simplified
    break;

  case WAN_TELEPORTATION:
  case SPE_TELEPORT_AWAY:
    if (map) rloco(obj, map, null);
    break;

  case WAN_MAKE_INVISIBLE:
    break;

  case WAN_UNDEAD_TURNING:
  case SPE_TURN_UNDEAD:
    // C ref: zap.c:2332-2390 — revive corpse or egg
    if (obj.otyp === CORPSE) {
      await revive(obj, true, map);
    }
    break;

  case WAN_OPENING:
  case SPE_KNOCK:
  case WAN_LOCKING:
  case SPE_WIZARD_LOCK:
    // C ref: zap.c bhito() boxlock() path for box-like containers.
    if (obj.oclass === TOOL_CLASS) {
      const shimGame = { player: { roleIndex: -1 } };
      res = await boxlock(shimGame, obj, otmp) ? 1 : 0;
    } else {
      res = 0;
    }
    break;

  case WAN_SLOW_MONSTER:
  case SPE_SLOW_MONSTER:
  case WAN_SPEED_MONSTER:
  case WAN_NOTHING:
  case SPE_HEALING:
  case SPE_EXTRA_HEALING:
    res = 0;
    break;

  case SPE_STONE_TO_FLESH:
    // stone_to_flesh_obj — simplified
    res = 0;
    break;

  default:
    res = 0;
    break;
  }

  return res;
}

// ============================================================
// Additional zap.c name-parity helpers
// ============================================================

// C ref: zap.c adtyp_to_prop()
export function adtyp_to_prop(adtyp) {
  switch (adtyp) {
  case 1: return 'magic_missile_resistance';
  case 2: return 'fire_resistance';
  case 3: return 'cold_resistance';
  case 4: return 'sleep_resistance';
  case 5: return 'disintegration_resistance';
  case 6: return 'shock_resistance';
  case 7: return 'poison_resistance';
  case 8: return 'acid_resistance';
  default: return null;
  }
}

// C ref: zap.c learnwand()
export function learnwand(obj) {
  if (!obj) return;
  discoverObject(obj.otyp, true, true);
}

// C ref: zap.c zappable()
export function zappable(obj) {
  if (!obj || obj.oclass !== WAND_CLASS) return false;
  const spe = Number(obj.spe || 0);
  if (spe < 0) return false;
  if (spe === 0 && rn2(121)) return false;
  obj.spe = spe - 1;
  return true;
}

// C ref: zap.c zap_ok()
// Autotranslated from zap.c:2605
export function zap_ok(obj) {
  if (obj && obj.oclass === WAND_CLASS) return GETOBJ_SUGGEST;
  return GETOBJ_EXCLUDE;
}

// C ref: zap.c zapsetup()/zapwrapup() naming surfaces.
export function zapsetup(player, dx = 0, dy = 0, dz = 0) {
  go_obj_zapped = false;
  gp_poly_zapped = -1;
  if (!player) return;
  player.dx = dx;
  player.dy = dy;
  player.dz = dz;
}

export async function zapwrapup(_obj, _disclose = false, player = null, display = null) {
  if (go_obj_zapped) {
    if (display?.putstr_message) await display.putstr_message('You feel shuddering vibrations.');
    else if (player) await pline('You feel shuddering vibrations.');
  }
  go_obj_zapped = false;
  gp_poly_zapped = -1;
}

// C ref: zap.c exclam()
export function exclam(force) {
  if (force < 0) return '?';
  if (force <= 4) return '.';
  return '!';
}

// C ref: zap.c miss()/hit() message helpers.
export async function miss(fltxt = 'beam') {
  await pline('The %s misses.', fltxt);
}

export async function hit(fltxt = 'beam') {
  await pline('The %s hits!', fltxt);
}

// C ref: zap.c do_enlightenment_effect()
export async function do_enlightenment_effect(player = null, display = null, game = null) {
  if (display?.putstr_message) {
    await display.putstr_message('You feel self-knowledgeable...');
  } else {
    await pline('You feel self-knowledgeable...');
  }
  await display_nhwindow(getWinMessage(), false);
  if (game) await run_magic_enlightenment_effect(game);
  if (display?.putstr_message) {
    await display.putstr_message('The feeling subsides.');
  } else {
    await pline('The feeling subsides.');
  }
  if (player) await exercise(player, A_WIS, true);
  if (player) player._recentEnlightenment = true;
}

// C ref: zap.c wishcmdassist()
export function wishcmdassist(text) {
  return typeof text === 'string' ? text.trim() : '';
}

// C ref: zap.c zapyourself()/zap_steed().
export async function zapyourself(obj, player, ordinary = true, map = null) {
  if (!obj || !player) return 0;
  let damage = 0;
  switch (obj.otyp) {
  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
    if (player.antimagic) {
      await pline('Boing!');
    } else {
      if (ordinary) await pline('You bash yourself!');
      damage = ordinary ? d(2, 12) : d(1 + Math.max(0, obj.spe || 0), 6);
      await exercise(player, A_STR, false);
    }
    break;
  case WAN_LIGHTNING: {
    // C: orig_dmg = d(12, 6) consumed unconditionally (before resistance check)
    const orig_dmg = d(12, 6);
    if (player.shock_resistance) {
      await pline('You zap yourself, but seem unharmed.');
    } else {
      await pline('You shock yourself!');
      damage = orig_dmg;
      await exercise(player, A_CON, false);
    }
    // C: destroy_items(&youmonst, AD_ELEC, orig_dmg) — stub
    // C: flashburn(rnd(100), TRUE)
    rnd(100); // flashburn duration — RNG consumed unconditionally
    break;
  }
  case WAN_FIRE: {
    const orig_dmg = d(12, 6);
    if (player.fire_resistance) {
      await pline('You feel rather warm.');
    } else {
      await pline("You've set yourself afire!");
      damage = orig_dmg;
    }
    // C ref: zap.c:2755-2757 — unconditional burnarmor + destroy_items
    burnarmor(player, player);
    // destroy_items(&youmonst, AD_FIRE, orig_dmg) — stub
    break;
  }
  case WAN_COLD: {
    const orig_dmg = d(12, 6);
    if (player.cold_resistance) {
      await pline('You feel a little chill.');
    } else {
      await pline('You imitate a popsicle!');
      damage = orig_dmg;
    }
    // C ref: zap.c:2775 — unconditional destroy_items
    // destroy_items(&youmonst, AD_COLD, orig_dmg) — stub
    break;
  }
  case WAN_MAGIC_MISSILE:
  case SPE_MAGIC_MISSILE:
    if (player.antimagic) {
      await pline('The missiles bounce!');
    } else {
      await pline("Idiot!  You've shot yourself!");
      damage = d(4, 6);
    }
    break;
  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
    // Hero cancellation side effects are not fully modeled in JS yet.
    // Keep no-damage behavior here to avoid misapplying monster-only logic.
    break;
  case WAN_LIGHT:
    damage = await lightdamage(obj, player, ordinary ? 5 : d(Math.max(1, obj.spe || 1), 25), ordinary);
    if (await flashburn(rnd(25) + damage, false, player)) {
      discoverObject(obj.otyp, true, true);
    }
    damage = 0;
    break;
  case WAN_UNDEAD_TURNING:
  case SPE_TURN_UNDEAD:
    unturn_you(obj, player, map);
    break;
  default:
    await pline('You zap yourself.');
    damage = d(2, 6);
    break;
  }
  if (Number.isFinite(player.uhp) && damage > 0) player.uhp -= damage;
  return Math.max(0, damage);
}

export async function zap_steed(obj, player, map) {
  if (!obj || !player?.usteed) return false;
  const steed = player.usteed;
  switch (obj.otyp) {
  case WAN_PROBING:
    await probe_monster(steed);
    learnwand(obj);
    return true;
  case WAN_TELEPORTATION:
  case SPE_TELEPORT_AWAY:
    learnwand(obj);
    return true;
  case WAN_MAKE_INVISIBLE:
  case WAN_CANCELLATION:
  case SPE_CANCELLATION:
  case WAN_POLYMORPH:
  case SPE_POLYMORPH:
  case WAN_STRIKING:
  case SPE_FORCE_BOLT:
  case WAN_SLOW_MONSTER:
  case SPE_SLOW_MONSTER:
  case WAN_SPEED_MONSTER:
  case SPE_HEALING:
  case SPE_EXTRA_HEALING:
  case SPE_DRAIN_LIFE:
  case WAN_OPENING:
  case SPE_KNOCK:
    await bhitm(steed, obj, map, player);
    return true;
  default:
    return false;
  }
}

// C ref: zap.c boxlock_invent()
export async function boxlock_invent(player, otmp) {
  if (!player || !Array.isArray(player.inventory) || !otmp) return 0;
  let changed = 0;
  const shimGame = { player };
  for (const obj of player.inventory) {
    if (await boxlock(shimGame, obj, otmp)) changed++;
  }
  return changed;
}

// C ref: zap.c location helpers.
// Autotranslated from zap.c:651
// C ref: zap.c:651 — get_obj_location(obj, &xp, &yp, locflags)
// Returns { found: bool, x, y } since JS has no pass-by-reference.
export function get_obj_location(obj, locflags = 0, player = null) {
  switch (obj.where) {
    case OBJ_INVENT:
      return { found: true, x: player.x, y: player.y };
    case OBJ_FLOOR:
      return { found: true, x: obj.ox, y: obj.oy };
    case OBJ_MINVENT:
      if (obj.ocarry.mx) {
        return { found: true, x: obj.ocarry.mx, y: obj.ocarry.my };
      }
      break;
    case OBJ_BURIED:
      if (locflags & BURIED_TOO) {
        return { found: true, x: obj.ox, y: obj.oy };
      }
      break;
    case OBJ_CONTAINED:
      if (locflags & CONTAINED_TOO) return get_obj_location(obj.ocontainer, locflags, player);
      break;
  }
  return { found: false, x: 0, y: 0 };
}

export function get_mon_location(mon, out = null, locflags = 0, player = null) {
  if (!mon) return null;
  let x = 0;
  let y = 0;
  if (player && (mon === player || mon === player.usteed)) {
    x = Number(player.x || 0);
    y = Number(player.y || 0);
  } else if (Number(mon.mx || 0) > 0 && (!mon.mburied || locflags)) {
    x = Number(mon.mx || 0);
    y = Number(mon.my || 0);
  }
  if (!x || !y) return null;
  const pos = { x, y };
  if (out && typeof out === 'object') {
    out.x = x;
    out.y = y;
  }
  return pos;
}

export function get_container_location(container, out = null, container_nesting = null) {
  let obj = container;
  let nest = 0;
  while (obj && String(obj.where || '').toUpperCase() === 'OBJ_CONTAINED') {
    nest++;
    obj = obj.ocontainer || null;
  }
  if (container_nesting && typeof container_nesting === 'object') {
    container_nesting.value = nest;
  }
  const loc = get_obj_location(obj, BURIED_TOO | CONTAINED_TOO);
  if (out && typeof out === 'object') {
    out.x = loc.x;
    out.y = loc.y;
  }
  return loc.found;
}

// C ref: zap.c release_hold()
export function release_hold(mon, player) {
  if (!player) return false;
  if (player.ustuck && (!mon || player.ustuck === mon)) {
    player.ustuck = null;
    if (player.uswallow) player.uswallow = 0;
    return true;
  }
  return false;
}

// C ref: zap.c object-destruction utility names.
export function maybe_destroy_item(obj, dmgtyp, player) {
  if (!obj) return 0;
  if (player && inventory_resistance_check(dmgtyp, player)) return 0;
  if (!destroyable_by(obj, dmgtyp)) return 0;
  if (obj.in_use && Number(obj.quan || 1) === 1) return 0;
  let cnt = 0;
  const quan = Number(obj.quan || 1);
  for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
  return cnt;
}

export function inventory_resistance_check(_osym_or_dmgtyp, maybe_dmgtyp = null, maybe_player = null) {
  const dmgtyp = (maybe_player == null) ? _osym_or_dmgtyp : maybe_dmgtyp;
  const player = (maybe_player == null) ? maybe_dmgtyp : maybe_player;
  const prob = u_adtyp_resistance_obj(player, dmgtyp);
  if (!prob) return false;
  return rn2(100) < prob;
}

export function item_what(_osym_or_dmgtyp, maybe_dmgtyp = null, maybe_player = null) {
  const dmgtyp = (maybe_player == null) ? _osym_or_dmgtyp : maybe_dmgtyp;
  const player = (maybe_player == null) ? maybe_dmgtyp : maybe_player;
  const prob = u_adtyp_resistance_obj(player, dmgtyp);
  if (!prob) return '';
  const prop = adtyp_to_prop(dmgtyp);
  const xtrinsic = Number(player?.uprops?.[prop]?.extrinsic || 0);
  let what = '';
  const safeName = (fn, obj) => (obj ? fn(obj) : '');
  if (!prop || !xtrinsic) return '';
  if (xtrinsic & W_ARMC) {
    what = safeName(cloak_simple_name, player?.cloak);
  } else if (xtrinsic & W_ARM) {
    what = safeName(suit_simple_name, player?.armor);
  } else if (xtrinsic & W_ARMU) {
    what = safeName(shirt_simple_name, player?.shirt);
  } else if (xtrinsic & W_ARMH) {
    what = safeName(helm_simple_name, player?.helmet);
  } else if (xtrinsic & W_ARMG) {
    what = safeName(gloves_simple_name, player?.gloves);
  } else if (xtrinsic & W_ARMF) {
    what = safeName(boots_simple_name, player?.boots);
  } else if (xtrinsic & W_ARMS) {
    what = safeName(shield_simple_name, player?.shield);
  } else if (xtrinsic & (W_AMUL | W_TOOL)) {
    const obj = (xtrinsic & W_AMUL) ? player?.amulet : player?.blindfold;
    what = obj ? simpleonames(obj) : '';
  } else if (xtrinsic & W_RING) {
    if ((xtrinsic & W_RING) === W_RING) what = 'rings';
    else {
      const obj = (xtrinsic & W_RINGL) ? player?.leftRing : player?.rightRing;
      what = obj ? simpleonames(obj) : '';
    }
  } else if (xtrinsic & W_WEP) {
    what = player?.weapon ? simpleonames(player.weapon) : '';
  }
  return what ? `by your ${what}` : '';
}

// Is_box imported from objnam.js

function is_magical_trap(ttyp) {
  return ttyp === MAGIC_TRAP || ttyp === ANTI_MAGIC || ttyp === POLY_TRAP
    || ttyp === TELEP_TRAP || ttyp === LEVEL_TELEP;
}

function undestroyable_trap(ttyp) {
  return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

function build_obj_chain(head) {
  if (!head) return [];
  if (Array.isArray(head)) return head;
  const out = [];
  let cur = head;
  while (cur) {
    out.push(cur);
    cur = cur.nobj || cur.nexthere || null;
  }
  return out;
}

function mark_probe_obj_known(otmp) {
  if (!otmp) return;
  otmp.dknown = 1;
  if (Is_box(otmp) || otmp.otyp === STATUE) {
    otmp.lknown = 1;
    otmp.cknown = 1;
  } else if (otmp.otyp === TIN) {
    otmp.known = 1;
  }
  const contents = Array.isArray(otmp.cobj) ? otmp.cobj : build_obj_chain(otmp.cobj || null);
  for (const inner of contents) mark_probe_obj_known(inner);
}

function material_to_golem(okind) {
  switch (okind) {
  case IRON:
  case METAL:
  case MITHRIL: return PM_IRON_GOLEM;
  case COPPER:
  case SILVER:
  case PLATINUM:
  case GEMSTONE:
  case MINERAL: return rn2(2) ? PM_STONE_GOLEM : PM_CLAY_GOLEM;
  case 0:
  case FLESH: return PM_FLESH_GOLEM;
  case WOOD: return PM_WOOD_GOLEM;
  case LEATHER: return PM_LEATHER_GOLEM;
  case CLOTH: return PM_ROPE_GOLEM;
  case BONE: return PM_SKELETON;
  case GOLD: return PM_GOLD_GOLEM;
  case GLASS: return PM_GLASS_GOLEM;
  case PAPER: return PM_PAPER_GOLEM;
  default: return PM_STRAW_GOLEM;
  }
}

function iterate_pile(objhdr) {
  if (!objhdr) return [];
  if (Array.isArray(objhdr)) return [...objhdr];
  if (objhdr.nexthere || objhdr.where === 'OBJ_FLOOR' || objhdr.where === 'floor') {
    const out = [];
    let cur = objhdr;
    while (cur) {
      out.push(cur);
      cur = cur.nexthere || null;
    }
    return out;
  }
  return [objhdr];
}

function polyuse_internal(objhdr, mat, minwt, map) {
  if (!objhdr || minwt <= 0) return;
  for (const otmp of iterate_pile(objhdr)) {
    if (minwt <= 0) break;
    if (!otmp) continue;
    if (obj_resists(otmp, 0, 0)) continue;
    const omat = objectData[otmp.otyp]?.oc_material ?? otmp.material ?? 0;
    if (((omat === mat) === (rn2(minwt + 1) !== 0))) {
      minwt -= Math.max(1, Number(otmp.quan || 1));
      if (map?.removeFloorObject) map.removeFloorObject(otmp);
      else otmp.deleted = true;
    }
  }
}

function pick_material_text(okind) {
  switch (okind) {
  case IRON:
  case METAL:
  case MITHRIL: return 'metal ';
  case COPPER:
  case SILVER:
  case PLATINUM:
  case GEMSTONE:
  case MINERAL: return 'lithic ';
  case 0:
  case FLESH: return 'organic ';
  case WOOD: return 'wood ';
  case LEATHER: return 'leather ';
  case CLOTH: return 'cloth ';
  case BONE: return 'bony ';
  case GOLD: return 'gold ';
  case GLASS: return 'glassy ';
  case PAPER: return 'paper ';
  default: return '';
  }
}

// C ref: zap.c remaining helper names.
export function blank_novel(obj) {
  if (!obj) return false;
  if (obj.otyp === SPE_NOVEL) obj.otyp = SPE_BLANK_PAPER;
  if (obj.otyp !== SPE_BLANK_PAPER) return false;
  obj.novelidx = 0;
  delete obj.oname;
  delete obj.title;
  return true;
}
export async function boomhit(dx, dy, range, obj, player, map) {
  // Reuse bhit line traversal behavior for boomerang-style probing.
  const hit = await bhit(dx, dy, range, 0, null, null, obj, map, player);
  return hit ? 1 : 0;
}
export function break_statue(obj, map) {
  if (!obj || obj.otyp !== STATUE) return false;
  obj.otyp = ROCK;
  obj.oclass = GEM_CLASS;
  if (map && map.removeFloorObject) {
    map.removeFloorObject(obj);
    placeFloorObject(map, obj);
  }
  return true;
}
export async function create_polymon(obj, mndx, map, player) {
  if (!obj) return null;
  const x = Number(obj.ox ?? player?.x ?? 0);
  const y = Number(obj.oy ?? player?.y ?? 0);
  const pm_index = Number.isInteger(mndx) ? mndx : material_to_golem(mndx);
  const mon = makemon(mons[pm_index] || null, x, y, 0, player?.dungeonLevel || 1, map);
  const minwt = Number(mons[pm_index]?.cwt || 1);
  polyuse_internal(obj, mndx, minwt, map);
  if (mon) {
    const material = pick_material_text(mndx);
    await pline(`Some ${material}objects meld, and ${x_monnam(mon)} arises from the pile!`);
  }
  return mon || null;
}
export function disintegrate_mon(mon, map, player) {
  if (!mon) return false;
  mon.mhp = 0;
  if (map?.removeMonster) map.removeMonster(mon);
  mondead(mon, map, player);
  return true;
}
export async function flashburn(duration, via_lightning = false, player = null) {
  const p = player || null;
  if (!p?.blind) {
    await pline('You are blinded by the flash!');
    if (p && Number.isFinite(duration) && duration > 0) {
      p.blind = Math.max(Number(p.blind || 0), Math.floor(duration));
    }
    return true;
  }
  if (!via_lightning && p?.blind_resist_artifact) return true;
  return false;
}
export async function lightdamage(obj, playerOrUwep, amt, ordinary = true) {
  const player = (playerOrUwep && playerOrUwep.hp != null) ? playerOrUwep : null;
  let dmg = Number.isFinite(amt) ? Math.max(0, Math.floor(amt)) : 0;
  if (!player || !dmg) return dmg;
  if (player.umonnum === PM_GREMLIN || player.formName === 'gremlin') {
    dmg = rnd(dmg);
    if (dmg > 10) dmg = 10 + rnd(dmg - 10);
    if (dmg > 20) dmg = 20;
    await pline(`Ow, that light hurts${(dmg > 2 || (player.uhp || 0) <= 5) ? '!' : '.'}`);
    if (Number.isFinite(player.uhp)) player.uhp -= dmg;
  }
  return dmg;
}
export function maybe_explode_trap(x, y, type, map, _player) {
  const trap = map?.trapAt ? map.trapAt(x, y) : null;
  if (!trap || !map) return false;
  const cancel = (type === WAN_CANCELLATION || type === SPE_CANCELLATION);
  if (!cancel) return false;
  if (undestroyable_trap(trap.ttyp)) {
    trap.tseen = 1;
    return true;
  }
  if (!is_magical_trap(trap.ttyp)) return false;
  deltrap(trap, map);
  return true;
}
export function melt_ice(x, y, _range, map) {
  if (!map?.at) return false;
  const loc = map.at(x, y);
  if (!loc || loc.typ !== ICE) return false;
  loc.typ = POOL;
  return true;
}
export function melt_ice_away(x, y, map) {
  return melt_ice(x, y, 0, map);
}
export async function mon_spell_hits_spot(typ, x, y, _mon, map, _player) {
  if (!map) return false;
  let adtyp = Number(typ);
  if (!Number.isFinite(adtyp)) return false;
  let zt = adtyp > 0 && adtyp < 20 ? adtyp - 1 : adtyp;
  if (zt < ZT_MAGIC_MISSILE || zt > ZT_ACID) return false;
  const spellType = -ZT_SPELL(zt);
  await zap_over_floor(x, y, spellType, { value: false }, true, 0, map);
  return true;
}
export function montraits(obj, _fd) {
  if (!obj) return null;
  if (obj.omonst) return { ...obj.omonst, mrevived: 1, mcanmove: 1 };
  if (obj.otyp !== CORPSE) return null;
  return { mndx: Number(obj.corpsenm ?? 0), mhp: Number(obj.oeaten || 0), mrevived: 1 };
}
// C ref: obj.h unpolyable(o) macro.
function unpolyable(obj) {
  if (!obj) return false;
  return obj.otyp === WAN_POLYMORPH
      || obj.otyp === SPE_POLYMORPH;
}
export function obj_unpolyable(obj) {
  if (!obj) return true;
  if (unpolyable(obj) || obj.otyp === STATUE) return true;
  return !!obj.oartifact || obj_resists(obj, 5, 95);
}
export function polyuse(objhdr, mat = 0, minwt = 0, map = null) {
  if (!objhdr) return 0;
  if (!minwt) return Number(objhdr.quan || 1);
  polyuse_internal(objhdr, mat, minwt, map);
  return minwt;
}
export async function probe_objchain(obj, display) {
  const chain = build_obj_chain(obj);
  for (const otmp of chain) mark_probe_obj_known(otmp);
  if (display?.putstr_message) await display.putstr_message(`${chain.length} object${chain.length === 1 ? '' : 's'}.`);
  return chain.length;
}
export function revive_egg(obj, _silent, map, player) {
  if (!obj || obj.otyp !== EGG) return false;
  const mndx = Number.isInteger(obj.corpsenm) ? obj.corpsenm : null;
  if (mndx == null || mndx < 0) return false;
  attach_egg_hatch_timeout(obj, 0);
  return true;
}
export function start_melt_ice_timeout(x, y, map) {
  if (!map) return;
  if (!Array.isArray(map._meltIcePending)) map._meltIcePending = [];
  const min = 49;
  const max = 2000;
  let when = min;
  while (++when <= max) {
    if (!rn2((max - when) + 50)) break;
  }
  if (when <= max) map._meltIcePending.push({ x, y, when });
}
export function u_adtyp_resistance_obj(player, adtyp) {
  if (!player) return 0;
  const prop = adtyp_to_prop(adtyp);
  if (!prop) return 0;
  const xtrinsic = Number(player?.uprops?.[prop]?.extrinsic || 0);
  if ((xtrinsic & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0) return 99;
  if ((xtrinsic & W_ARMC) && player?.cloak?.otyp === DWARVISH_CLOAK
      && (adtyp === 2 /* AD_FIRE */ || adtyp === 3 /* AD_COLD */)) return 90;
  return 0;
}
// Autotranslated from zap.c:4699
export function ubuzz(type, nd, player) {
  dobuzz(type, nd, player.x, player.y, player.dx, player.dy, true, false);
}
export async function ubreatheu(type, nd, sx, sy, dx, dy, map, player) {
  await buzz(ZT_BREATH(type), nd, sx, sy, dx, dy, map, player);
}
export function unturn_dead(_obj, mon, map, player) {
  if (!mon) return false;
  const mdat = mons[mon.mndx] || {};
  if (!is_undead(mdat)) return false;
  mon.mhp -= d(2, 6);
  if (mon.mhp <= 0) disintegrate_mon(mon, map, player);
  return true;
}
export function unturn_you(_obj, player, _map) {
  if (!player) return false;
  unturn_dead(_obj, { minvent: player.inventory || [] }, _map, player);
  if (player.isUndead) {
    player.stunned = Math.max(Number(player.stunned || 0), rnd(30));
  }
  return true;
}
export function zombie_can_dig(arg1, arg2, arg3, arg4) {
  let x, y, map;
  if (typeof arg1 === 'number' && typeof arg2 === 'number') {
    x = arg1; y = arg2; map = arg3;
  } else {
    x = arg3; y = arg4; map = arg2;
  }
  if (!map?.at || !isok(x, y)) return false;
  if (map.trapAt && map.trapAt(x, y)) return false;
  const typ = map.at(x, y)?.typ;
  return typ === 1 || typ === 2 || typ === 12;
}
export function spell_hit_bonus(skill, player) {
  const dex = (player?.attributes?.[A_DEX] || 10);
  const prof = Number(player?.spellSkill?.[skill] ?? 1); // 0..3 => unskilled..expert
  let hit_bon = 0;
  if (prof <= 0) hit_bon = -4;
  else if (prof === 1) hit_bon = 0;
  else if (prof === 2) hit_bon = 2;
  else hit_bon = 3;
  if (dex < 4) hit_bon -= 3;
  else if (dex < 6) hit_bon -= 2;
  else if (dex < 8) hit_bon -= 1;
  else if (dex >= 14) hit_bon += (dex - 14);
  return hit_bon;
}
export function spell_damage_bonus(dmg, player) {
  let out = Number(dmg || 0);
  const intell = (player?.attributes?.[A_INT] || 10);
  const level = player?.ulevel ?? player?.level ?? 1;
  if (intell <= 9) {
    if (out > 1) out = (out <= 3) ? 1 : out - 3;
  } else if (intell <= 13 || level < 5) {
    // no-op
  } else if (intell <= 18) {
    out += 1;
  } else if (intell <= 24 || level < 14) {
    out += 2;
  } else {
    out += 3;
  }
  return out;
}


// ============================================================
// cf. zap.c:3815 bhit() — beam travel for IMMEDIATE wands
// Travels in a line, calling fhitm/fhito for each monster/object hit
// ============================================================
export async function bhit(ddx, ddy, range, weapon, fhitm_fn, fhito_fn, obj, map, player) {
  if (!map || !obj) return null;
  let result = null;
  let x = player ? player.x : 0;
  let y = player ? player.y : 0;

  // C ref: zap.c:3844-3847 — skiprange for thrown rocks
  let skiprange_start = 0, skiprange_end = 0;
  const allow_skip = false;

  // Beam types: ZAPPED_WAND=3, THROWN_WEAPON=0, KICKED_WEAPON=1, FLASHED_LIGHT=2
  const ZAPPED_WAND = 3;

  while (range-- > 0) {
    x += ddx;
    y += ddy;

    if (!isok(x, y)) { x -= ddx; y -= ddy; break; }
    const loc = map.at(x, y);
    if (!loc) break;

    // Check for monster
    const mon = map.monsterAt(x, y);
    if (mon && !mon.dead) {
      if (weapon === ZAPPED_WAND && fhitm_fn) {
        if (fhitm_fn(mon, obj, map, player)) {
          result = mon;
          break;
        }
        range -= 3; // wand zap loses range when hitting monster
      } else {
        result = mon;
        break;
      }
    }

    // Hit pile of objects
    if (fhito_fn) {
      if (await bhitpile(obj, fhito_fn, x, y, 0, map)) {
        range--;
      }
    }

    // Check for wall/closed door — beam stops
    if (IS_WALL(loc.typ) || (IS_DOOR(loc.typ) && loc.flags)) {
      x -= ddx;
      y -= ddy;
      break;
    }
  }

  return result;
}

// ============================================================
// cf. zap.c resists_blnd() — blindness resistance
// TODO: should eventually move to mondata.js, but kept here to avoid circular deps with mondata
// ============================================================
export function resists_blnd(mon) {
  // Check if monster resists blindness
  if (!mon) return false;
  const mdat = mon.data || (mon.mndx != null ? mons[mon.mndx] : null);
  if (!mdat) return false;
  // Blind resistance: no eyes or already blind
  return !!(mdat.mflags1 & M1_NOEYES);
}

// cf. zap.c resists_stun() — stun resistance
export function resists_stun(mon) {
  if (!mon) return false;
  const mdat = mon.data || (mon.mndx != null ? mons[mon.mndx] : null);
  if (!mdat) return false;
  return !!(mdat.mflags1 & M1_NOEYES);
}

// ============================================================
// Exported zhitm and zap_hit for use by other modules (e.g., mcastu)
// ============================================================
export { zhitm };

// Autotranslated from zap.c:5582
export function destroyable(obj, adtyp) {
  if (obj.oartifact) { return false; }
  if (obj.in_use && obj.quan === 1) { return false; }
  if (adtyp === AD_FIRE) {
    if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL) { return false; }
    if (obj.otyp === GLOB_OF_GREEN_SLIME || obj.oclass === POTION_CLASS || obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) { return true; }
  }
  else if (adtyp === AD_COLD) {
    if (obj.oclass === POTION_CLASS && obj.otyp !== POT_OIL) { return true; }
  }
  else if (adtyp === AD_ELEC) {
    if (obj.oclass !== RING_CLASS && obj.oclass !== WAND_CLASS) { return false; }
    if (obj.otyp !== RIN_SHOCK_RESISTANCE && obj.otyp !== WAN_LIGHTNING) { return true; }
  }
  return false;
}
