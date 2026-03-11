// do_wear.js -- Armor wearing/removing mechanics
// cf. do_wear.c — dowear, doputon, dotakeoff, doremring, doddoremarm, find_ac

import { nhgetch } from './input.js';
import { ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
         WEAPON_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
         WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
         objectData,
         ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK, ARM_SHIRT,
         SPEED_BOOTS, ELVEN_BOOTS, LEVITATION_BOOTS, FUMBLE_BOOTS,
         ELVEN_CLOAK, CLOAK_OF_PROTECTION, CLOAK_OF_INVISIBILITY,
         CLOAK_OF_MAGIC_RESISTANCE, CLOAK_OF_DISPLACEMENT,
         HELM_OF_BRILLIANCE, HELM_OF_TELEPATHY, HELM_OF_OPPOSITE_ALIGNMENT, DUNCE_CAP,
         GAUNTLETS_OF_FUMBLING, GAUNTLETS_OF_POWER, GAUNTLETS_OF_DEXTERITY,
         RIN_ADORNMENT,
         RIN_GAIN_STRENGTH, RIN_GAIN_CONSTITUTION,
         RIN_INCREASE_ACCURACY, RIN_INCREASE_DAMAGE,
         RIN_PROTECTION, RIN_REGENERATION, RIN_SEARCHING,
         RIN_STEALTH, RIN_SUSTAIN_ABILITY, RIN_LEVITATION,
         RIN_HUNGER, RIN_AGGRAVATE_MONSTER, RIN_CONFLICT, RIN_WARNING,
         RIN_POISON_RESISTANCE, RIN_FIRE_RESISTANCE, RIN_COLD_RESISTANCE,
         RIN_SHOCK_RESISTANCE, RIN_FREE_ACTION, RIN_SLOW_DIGESTION,
         RIN_TELEPORTATION, RIN_TELEPORT_CONTROL,
         RIN_POLYMORPH, RIN_POLYMORPH_CONTROL,
         RIN_INVISIBILITY, RIN_SEE_INVISIBLE,
         RIN_PROTECTION_FROM_SHAPE_CHAN,
         AMULET_OF_STRANGULATION, AMULET_OF_CHANGE, AMULET_OF_RESTFUL_SLEEP,
         AMULET_OF_UNCHANGING, AMULET_OF_FLYING, AMULET_OF_REFLECTION,
         AMULET_OF_MAGICAL_BREATHING, AMULET_OF_GUARDING,
         AMULET_OF_ESP, AMULET_OF_LIFE_SAVING, AMULET_VERSUS_POISON,
         BLINDFOLD, TOWEL, LENSES, MEAT_RING,
         GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL,
         GRAY_DRAGON_SCALES, YELLOW_DRAGON_SCALES,
         BLACK_DRAGON_SCALES, BLACK_DRAGON_SCALE_MAIL,
         BLUE_DRAGON_SCALES, BLUE_DRAGON_SCALE_MAIL,
         GREEN_DRAGON_SCALES, GREEN_DRAGON_SCALE_MAIL,
         RED_DRAGON_SCALES, RED_DRAGON_SCALE_MAIL,
         GOLD_DRAGON_SCALES, GOLD_DRAGON_SCALE_MAIL,
         ORANGE_DRAGON_SCALES, ORANGE_DRAGON_SCALE_MAIL,
         WHITE_DRAGON_SCALES, WHITE_DRAGON_SCALE_MAIL,
         SILVER_DRAGON_SCALES, SILVER_DRAGON_SCALE_MAIL } from './objects.js';
import { doname, is_crackable } from './mkobj.js';
import { acurr, extremeattr } from './attrib.js';
import { armor_simple_name, suit_simple_name, cloak_simple_name, helm_simple_name, gloves_simple_name, boots_simple_name, shield_simple_name, shirt_simple_name, safe_typename } from './objnam.js';
import { is_metallic, obj_resists } from './objdata.js';
import {
    which_armor,
    setworn,
    setnotworn,
} from './worn.js';
import { useup, renderOverlayMenuUntilDismiss, buildInventoryOverlayLines, silly_thing } from './invent.js';
import { discoverObject } from './o_init.js';
import { pline, You, Your, You_cant, You_feel, updateLastPlineMessage, impossible } from './pline.js';
import { newsym, see_monsters, set_mimic_blocking } from './display.js';
import { retouch_object } from './artifact.js';
import { rn2, rnd } from './rng.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
         FAST, STEALTH, FUMBLING, LEVITATION, INVIS, SEE_INVIS,
         DISPLACED, TELEPAT, PROTECTION, REGENERATION, SEARCHING,
         FIXED_ABIL, REFLECTING, LIFESAVED, FLYING, UNCHANGING,
         MAGICAL_BREATHING, STRANGLED, SLEEPING, BLINDED,
         HUNGER, AGGRAVATE_MONSTER, CONFLICT, WARNING,
         POISON_RES, FIRE_RES, COLD_RES, SHOCK_RES,
         FREE_ACTION, SLOW_DIGESTION,
         TELEPORT, TELEPORT_CONTROL, POLYMORPH, POLYMORPH_CONTROL,
         PROT_FROM_SHAPE_CHANGERS,
         DRAIN_RES, SICK_RES, STONE_RES, INFRAVISION, ANTIMAGIC,
         TIMEOUT, TT_BEARTRAP, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL,
         W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_AMUL, W_WEP, W_SWAPWEP, W_QUIVER, W_RINGL, W_RINGR, W_TOOL,
         W_RING, W_ACCESSORY, W_ARMOR } from './const.js';
import { set_itimeout, incr_itimeout, toggle_blindness } from './potion.js';
import { float_down } from './trap.js';
import { nomul, unmul } from './hack.js';
import { float_vs_flight } from './polyself.js';
import { mark_vision_dirty } from './vision.js';
import { nohands, nolimbs, cantweararm, slithy, has_horns, has_head, is_humanoid } from './mondata.js';
import { MZ_SMALL, S_CENTAUR } from './monsters.js';
import { hasEnv, getEnv, writeStderr } from './runtime_env.js';

// W_* flags imported from const.js





// ============================================================
// 1. Armor slot mapping
// ============================================================

const ARMOR_SLOTS = {
    [ARM_SUIT]:   { prop: 'armor',   name: 'body armor' },
    [ARM_SHIELD]: { prop: 'shield',  name: 'shield' },
    [ARM_HELM]:   { prop: 'helmet',  name: 'helmet' },
    [ARM_GLOVES]: { prop: 'gloves',  name: 'gloves' },
    [ARM_BOOTS]:  { prop: 'boots',   name: 'boots' },
    [ARM_CLOAK]:  { prop: 'cloak',   name: 'cloak' },
    [ARM_SHIRT]:  { prop: 'shirt',   name: 'shirt' },
};

const ARM_SUB_TO_MASK = {
    [ARM_SUIT]: W_ARM,
    [ARM_SHIELD]: W_ARMS,
    [ARM_HELM]: W_ARMH,
    [ARM_GLOVES]: W_ARMG,
    [ARM_BOOTS]: W_ARMF,
    [ARM_CLOAK]: W_ARMC,
    [ARM_SHIRT]: W_ARMU,
};

// ============================================================
// 2. Slot on/off effect stubs (hook points for future intrinsic effects)
// ============================================================

// cf. do_wear.c fingers_or_gloves() — "fingers" or "gloves" depending on worn gloves
export function fingers_or_gloves(player, check_gloves) {
    if (check_gloves && player.gloves) return "gloves";
    return "fingers";
}

// cf. do_wear.c off_msg() — message when taking off an item
export async function off_msg(obj, player) {
    if (obj) await You("were wearing %s.", doname(obj, player));
}

// cf. do_wear.c on_msg() — message when putting on an item
export async function on_msg(obj, player) {
    if (!obj) return;
    if (obj.oclass === RING_CLASS || obj.oclass === AMULET_CLASS
        || obj.otyp === BLINDFOLD || obj.otyp === TOWEL || obj.otyp === LENSES) {
        // For rings/amulets/eyewear, just show the item name
        return;
    }
    await You("are now wearing %s.", doname(obj, player));
}

// C ref: makeknown(otyp) — discover an object type
export function makeknown(otyp) {
    discoverObject(otyp, true, true);
}

// Helper: toggle stealth — C ref: do_wear.c toggle_stealth()
function toggle_stealth(player, on) {
    const entry = player.ensureUProp(STEALTH);
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
}

// C ref: do_wear.c:147 — toggle_displacement(obj, oldprop, on)
// When called from Cloak_on/off with (player, on), obj defaults to player.cloak.
export function toggle_displacement(player, on, obj, oldprop) {
    if (obj === undefined) obj = player.cloak;
    if (oldprop === undefined) {
        const entry = player.uprops ? player.uprops[DISPLACED] : null;
        oldprop = entry ? (entry.extrinsic || 0) : 0;
    }
    const entry = player.ensureUProp(DISPLACED);
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
    // C ref: skip message during initial equip or cancelled don
    // gi.initial_don / svc.context.takeoff.cancelled_don not fully wired; skip guard
    const uprops = player.uprops || {};
    const displaced = uprops[DISPLACED] || {};
    if (!oldprop
        && !(displaced.intrinsic)
        && !(displaced.blocked)) {
        // Can notice displacement if not blind+invisible, or have telepathy/detect
        const canNotice = (!player.blind && !player.uswallow && !player.invisible)
            || (displaced.extrinsic) // Unblind_telepat-like
            || (player.blind) // Blind_telepat when blind
            || false; // Detect_monsters not checked
        if (canNotice) {
            if (obj) makeknown(obj.otyp);
            // Message uses You_feel (async) but toggle_displacement is sync in callers;
            // just log the message synchronously via pline if available
        }
    }
}

// Helper: adjust a single extrinsic flag by +1 or -1
function toggle_extrinsic(player, prop, on) {
    const entry = player.ensureUProp(prop);
    if (prop === 28 && hasEnv('WEBHACK_RUN_DEBUG')
        && getEnv('WEBHACK_RUN_DEBUG') !== '0') {
        const e = new Error();
        writeStderr(`DBG toggle_extrinsic FAST on=${on} turns=${player?.turns} stack=${e.stack.split('\n').slice(1,8).join('|')}\n`);
    }
    if (on) {
        entry.extrinsic = (entry.extrinsic || 0) + 1;
    } else {
        entry.extrinsic = Math.max(0, (entry.extrinsic || 0) - 1);
    }
}

// cf. do_wear.c:1915 armoroff() — remove armor piece, with delay handling
export async function armoroff(otmp, player, game) {
    if (await cursed_check(otmp, null)) return 0;
    const delay = -(objectData[otmp.otyp]?.oc_delay || 0);
    const armcat = objectData[otmp.otyp]?.oc_armcat;
    if (delay) {
        // Multi-turn removal: set nomul and afternmv callback
        nomul(delay, game);
        game.multi_reason = 'disrobing';
        let what = null;
        switch (armcat) {
            case ARM_SUIT:
                what = suit_simple_name(otmp);
                game.afternmv = () => Armor_off();
                break;
            case ARM_SHIELD:
                what = shield_simple_name(otmp);
                game.afternmv = () => Shield_off();
                break;
            case ARM_HELM:
                what = helm_simple_name(otmp);
                game.afternmv = () => Helmet_off();
                break;
            case ARM_GLOVES:
                what = gloves_simple_name(otmp);
                game.afternmv = () => Gloves_off();
                break;
            case ARM_BOOTS:
                what = boots_simple_name(otmp);
                game.afternmv = async () => await Boots_off();
                break;
            case ARM_CLOAK:
                what = cloak_simple_name(otmp);
                game.afternmv = () => Cloak_off();
                break;
            case ARM_SHIRT:
                what = shirt_simple_name(otmp);
                game.afternmv = () => Shirt_off();
                break;
            default:
                break;
        }
        if (what) {
            game.nomovemsg = `You finish taking off your ${what}.`;
        }
    } else {
        // No delay: call handler immediately
        switch (armcat) {
            case ARM_SUIT: Armor_off(); break;
            case ARM_SHIELD: Shield_off(); break;
            case ARM_HELM: Helmet_off(); break;
            case ARM_GLOVES: Gloves_off(); break;
            case ARM_BOOTS: await Boots_off(); break;
            case ARM_CLOAK: Cloak_off(); break;
            case ARM_SHIRT: Shirt_off(); break;
            default: break;
        }
        await off_msg(otmp, player);
    }
    if (game?.svc?.context?.takeoff) {
        game.svc.context.takeoff.mask = game.svc.context.takeoff.what = 0;
    }
    return 1;
}

// cf. do_wear.c:1857 ia_dotakeoff() — takeoff wrapper with item_action flag
export async function ia_dotakeoff(player, display, game) {
    if (game?.gi) game.gi.item_action_in_progress = true;
    const res = await handleTakeOff(player, display, game);
    if (game?.gi) game.gi.item_action_in_progress = false;
    return res;
}

// cf. do_wear.c Boots_on() — C ref: do_wear.c:186-260
async function Boots_on(player) {
    if (!player || !player.boots) return;
    const otyp = player.boots.otyp;
    const oldprop = player.uprops[FAST]?.extrinsic || 0;

    switch (otyp) {
    case SPEED_BOOTS:
        toggle_extrinsic(player, FAST, true);
        // C ref: if (!oldprop && !(HFast & TIMEOUT)) { makeknown(); message }
        if (!oldprop && !(player.getPropTimeout(FAST))) {
            makeknown(otyp);
            await You_feel("yourself speed up%s.",
                     player.fast ? " a bit more" : "");
        }
        break;
    case ELVEN_BOOTS:
        toggle_stealth(player, true);
        break;
    case FUMBLE_BOOTS:
        toggle_extrinsic(player, FUMBLING, true);
        // C ref: if (!oldprop && !(HFumbling & ~TIMEOUT))
        //     incr_itimeout(&HFumbling, rnd(20));
        if (!(player.getPropTimeout(FUMBLING)))
            incr_itimeout(player, FUMBLING, rnd(20));
        break;
    case LEVITATION_BOOTS:
        toggle_extrinsic(player, LEVITATION, true);
        // C ref: if (!oldprop && !HLevitation && !(BLevitation & FROMOUTSIDE))
        //     makeknown(otyp); float_up();
        makeknown(otyp);
        break;
    }
    // C ref: player.boots->known = 1 (boots +/- evident from AC)
    if (player.boots) player.boots.known = true;
}

// cf. do_wear.c Boots_off() — C ref: do_wear.c:262-330
async function Boots_off(player) {
    if (!player || !player.boots) return;
    const otyp = player.boots.otyp;

    switch (otyp) {
    case SPEED_BOOTS:
        toggle_extrinsic(player, FAST, false);
        // C ref: if (!Very_fast) { makeknown(otyp); message }
        if (!player.veryFast) {
            makeknown(otyp);
            await You_feel("yourself slow down%s.",
                     player.fast ? " a bit" : "");
        }
        break;
    case ELVEN_BOOTS:
        toggle_stealth(player, false);
        break;
    case FUMBLE_BOOTS:
        toggle_extrinsic(player, FUMBLING, false);
        // C ref: if (!oldprop && !(HFumbling & ~TIMEOUT))
        //     HFumbling = EFumbling = 0;
        {
            const entry = player.uprops[FUMBLING];
            if (entry && !entry.extrinsic) {
                entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            }
        }
        break;
    case LEVITATION_BOOTS:
        toggle_extrinsic(player, LEVITATION, false);
        // C ref: float_down(0L, 0L); makeknown(otyp);
        makeknown(otyp);
        break;
    }
}

// cf. do_wear.c Cloak_on() — C ref: do_wear.c:332-390
function Cloak_on(player) {
    if (!player || !player.cloak) return;
    const otyp = player.cloak.otyp;
    switch (otyp) {
    case ELVEN_CLOAK:
        toggle_stealth(player, true);
        break;
    case CLOAK_OF_DISPLACEMENT:
        toggle_displacement(player, true);
        break;
    case CLOAK_OF_INVISIBILITY:
        toggle_extrinsic(player, INVIS, true);
        if (!player.blind) {
            makeknown(otyp);
        }
        break;
    case CLOAK_OF_MAGIC_RESISTANCE:
        // C ref: EAntimagic (extrinsic ANTIMAGIC while worn)
        toggle_extrinsic(player, ANTIMAGIC, true);
        break;
    case CLOAK_OF_PROTECTION:
        // C ref: makeknown(player.cloak->otyp);
        makeknown(otyp);
        break;
    }
    if (player.cloak && !player.cloak.known) {
        player.cloak.known = true;
    }
}

// cf. do_wear.c Cloak_off() — C ref: do_wear.c:392-430
function Cloak_off(player) {
    if (!player || !player.cloak) return;
    const otyp = player.cloak.otyp;
    switch (otyp) {
    case ELVEN_CLOAK:
        toggle_stealth(player, false);
        break;
    case CLOAK_OF_DISPLACEMENT:
        toggle_displacement(player, false);
        break;
    case CLOAK_OF_INVISIBILITY:
        toggle_extrinsic(player, INVIS, false);
        if (!player.blind) {
            makeknown(otyp);
        }
        break;
    case CLOAK_OF_MAGIC_RESISTANCE:
        // C ref: remove EAntimagic when cloak is taken off
        toggle_extrinsic(player, ANTIMAGIC, false);
        break;
    case CLOAK_OF_PROTECTION:
        break;
    }
}

// cf. do_wear.c Helmet_on() — C ref: do_wear.c:432-490
function Helmet_on(player) {
    if (!player || !player.helmet) return;
    const otyp = player.helmet.otyp;
    switch (otyp) {
    case HELM_OF_BRILLIANCE:
        // Adjust INT and WIS by spe
        adj_abon(player, player.helmet, A_INT, player.helmet.spe || 0);
        adj_abon(player, player.helmet, A_WIS, player.helmet.spe || 0);
        break;
    case HELM_OF_TELEPATHY:
        toggle_extrinsic(player, TELEPAT, true);
        break;
    case DUNCE_CAP:
        // Reduce INT and WIS
        adj_abon(player, player.helmet, A_INT, -(player.helmet.spe || 1));
        adj_abon(player, player.helmet, A_WIS, -(player.helmet.spe || 1));
        break;
    }
}

// cf. do_wear.c Helmet_off() — C ref: do_wear.c:492-540
function Helmet_off(player) {
    if (!player || !player.helmet) return;
    const otyp = player.helmet.otyp;
    switch (otyp) {
    case HELM_OF_BRILLIANCE:
        adj_abon(player, player.helmet, A_INT, -(player.helmet.spe || 0));
        adj_abon(player, player.helmet, A_WIS, -(player.helmet.spe || 0));
        break;
    case HELM_OF_TELEPATHY:
        toggle_extrinsic(player, TELEPAT, false);
        break;
    case DUNCE_CAP:
        adj_abon(player, player.helmet, A_INT, (player.helmet.spe || 1));
        adj_abon(player, player.helmet, A_WIS, (player.helmet.spe || 1));
        break;
    }
}
// cf. do_wear.c hard_helmet() — check if helmet is hard (non-cloth)
// C ref: return (is_metallic(obj) || is_crackable(obj))
export function hard_helmet(obj) {
    if (!obj || objectData[obj.otyp]?.oc_subtyp !== ARM_HELM) return false;
    return is_metallic(obj) || is_crackable(obj);
}

// cf. do_wear.c Gloves_on() — C ref: do_wear.c:542-590
function Gloves_on(player) {
    if (!player || !player.gloves) return;
    const otyp = player.gloves.otyp;
    switch (otyp) {
    case GAUNTLETS_OF_FUMBLING:
        toggle_extrinsic(player, FUMBLING, true);
        if (!(player.getPropTimeout(FUMBLING)))
            incr_itimeout(player, FUMBLING, rnd(20));
        break;
    case GAUNTLETS_OF_POWER:
        // C ref: makeknown(otyp); botl = TRUE;
        // STR becomes 25 while wearing — store old value
        makeknown(otyp);
        player._savedStr = player.attributes[A_STR];
        player.attributes[A_STR] = 25;
        break;
    case GAUNTLETS_OF_DEXTERITY:
        adj_abon(player, player.gloves, A_DEX, player.gloves.spe || 0);
        break;
    }
    if (player.gloves && !player.gloves.known) {
        player.gloves.known = true;
    }
}

// cf. do_wear.c Gloves_off() — C ref: do_wear.c:592-640
function Gloves_off(player) {
    if (!player || !player.gloves) return;
    const otyp = player.gloves.otyp;
    switch (otyp) {
    case GAUNTLETS_OF_FUMBLING:
        toggle_extrinsic(player, FUMBLING, false);
        // C ref: clear fumbling if no other source
        {
            const entry = player.uprops[FUMBLING];
            if (entry && !entry.extrinsic) {
                entry.intrinsic = entry.intrinsic & ~TIMEOUT;
            }
        }
        break;
    case GAUNTLETS_OF_POWER:
        // Restore old STR
        if (player._savedStr !== undefined) {
            player.attributes[A_STR] = player._savedStr;
            delete player._savedStr;
        }
        break;
    case GAUNTLETS_OF_DEXTERITY:
        adj_abon(player, player.gloves, A_DEX, -(player.gloves.spe || 0));
        break;
    }
}
// cf. do_wear.c wielding_corpse() — check if wielding a cockatrice corpse after
// taking off gloves or losing stoning resistance
// Simplified: in JS we don't have full petrification/instapetrify yet
function wielding_corpse(_obj, _how, _voluntary) {
    // TODO: implement petrification from wielding cockatrice corpse bare-handed
    // For now this is a no-op since instapetrify() is not yet ported
}

// cf. do_wear.c Shield_on/off — mostly no-ops in C
function Shield_on(player) {}
function Shield_off(player) {}

// cf. do_wear.c Shirt_on/off — mostly no-ops in C
function Shirt_on(player) {}
function Shirt_off(player) {}

// cf. do_wear.c Armor_on/off (body armor / suit)
export function Armor_on(player) {
    if (!player || !player.armor) return;
    if (!player.armor.known) player.armor.known = true;
    dragon_armor_handling(player, player.armor, true);
}
export function Armor_off(player) {
    if (!player || !player.armor) return;
    dragon_armor_handling(player, player.armor, false);
}
// cf. do_wear.c dragon_armor_handling() — handle dragon scale armor extra abilities
function dragon_armor_handling(player, otmp, puton) {
    if (!otmp) return;
    switch (otmp.otyp) {
    case BLACK_DRAGON_SCALES:
    case BLACK_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, DRAIN_RES, puton);
        break;
    case BLUE_DRAGON_SCALES:
    case BLUE_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, FAST, puton);
        break;
    case GREEN_DRAGON_SCALES:
    case GREEN_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, SICK_RES, puton);
        break;
    case RED_DRAGON_SCALES:
    case RED_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, INFRAVISION, puton);
        break;
    case GOLD_DRAGON_SCALES:
    case GOLD_DRAGON_SCALE_MAIL:
        // C: make_hallucinated — simplified, no hallucination handling yet
        break;
    case ORANGE_DRAGON_SCALES:
    case ORANGE_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, FREE_ACTION, puton);
        break;
    case YELLOW_DRAGON_SCALES:
    case YELLOW_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, STONE_RES, puton);
        break;
    case WHITE_DRAGON_SCALES:
    case WHITE_DRAGON_SCALE_MAIL:
        toggle_extrinsic(player, SLOW_DIGESTION, puton);
        break;
    case SILVER_DRAGON_SCALES:
    case SILVER_DRAGON_SCALE_MAIL:
        // Silver: no extra effect in C
        break;
    case GRAY_DRAGON_SCALES:
    case GRAY_DRAGON_SCALE_MAIL:
        // Grey: no extra effect in C
        break;
    default:
        break;
    }
}

// cf. do_wear.c Armor_gone() — handle armor being destroyed while worn
export function Armor_gone(player) {
    if (!player.armor) return;
    const otmp = player.armor;
    player.armor = null;
    dragon_armor_handling(player, otmp, false);
    find_ac(player);
}

// cf. do_wear.c Amulet_on() — C ref: do_wear.c:1100-1235
async function Amulet_on(player) {
    if (!player || !player.amulet) return;
    const otyp = player.amulet.otyp;
    switch (otyp) {
    case AMULET_OF_ESP:
        toggle_extrinsic(player, TELEPAT, true);
        break;
    case AMULET_OF_LIFE_SAVING:
        toggle_extrinsic(player, LIFESAVED, true);
        break;
    case AMULET_OF_STRANGULATION:
        // Start strangulation timer
        toggle_extrinsic(player, STRANGLED, true);
        await pline("It constricts your throat!");
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        toggle_extrinsic(player, SLEEPING, true);
        break;
    case AMULET_VERSUS_POISON:
        // Passive poison resistance — tracked via extrinsic
        break;
    case AMULET_OF_CHANGE:
        // Gender swap — simplified
        player.gender = player.gender === 0 ? 1 : 0;
        await pline("You are suddenly very %s!", player.gender === 0 ? "masculine" : "feminine");
        break;
    case AMULET_OF_UNCHANGING:
        toggle_extrinsic(player, UNCHANGING, true);
        break;
    case AMULET_OF_REFLECTION:
        toggle_extrinsic(player, REFLECTING, true);
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        toggle_extrinsic(player, MAGICAL_BREATHING, true);
        break;
    case AMULET_OF_GUARDING:
        // AC bonus handled by find_ac()
        break;
    case AMULET_OF_FLYING:
        toggle_extrinsic(player, FLYING, true);
        break;
    }
}

// cf. do_wear.c Amulet_off() — C ref: do_wear.c:1237-1300
function Amulet_off(player) {
    if (!player || !player.amulet) return;
    const otyp = player.amulet.otyp;
    switch (otyp) {
    case AMULET_OF_ESP:
        toggle_extrinsic(player, TELEPAT, false);
        break;
    case AMULET_OF_LIFE_SAVING:
        toggle_extrinsic(player, LIFESAVED, false);
        break;
    case AMULET_OF_STRANGULATION:
        toggle_extrinsic(player, STRANGLED, false);
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        toggle_extrinsic(player, SLEEPING, false);
        break;
    case AMULET_OF_UNCHANGING:
        toggle_extrinsic(player, UNCHANGING, false);
        break;
    case AMULET_OF_REFLECTION:
        toggle_extrinsic(player, REFLECTING, false);
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        toggle_extrinsic(player, MAGICAL_BREATHING, false);
        break;
    case AMULET_OF_GUARDING:
        break;
    case AMULET_OF_FLYING:
        toggle_extrinsic(player, FLYING, false);
        break;
    }
}

// C ref: do_wear.c:3254 adj_abon(otmp, delta) — adjust attribute bonus
// Modifies player.abon[] (attribute bonus array), NOT base attributes.
export function adj_abon(player, obj, attr, delta) {
    if (!delta) return;
    // Ensure abon array exists
    if (!player.abon || player.abon.length < 7) {
        player.abon = new Array(7).fill(0);
    }
    player.abon[attr] = (player.abon[attr] || 0) + delta;
}

// Helper: learn ring type from wearing effects — C ref: do_wear.c learnring()
export function learnring(obj, _seen) {
    if (obj) obj.known = true;
}

// C ref: objects[].oc_oprop — maps ring otyp to property index
// Used for oldprop check: was property already active from another source?
const RING_OPROP_MAP = {
    [RIN_TELEPORTATION]: TELEPORT, [RIN_REGENERATION]: REGENERATION,
    [RIN_SEARCHING]: SEARCHING, [RIN_HUNGER]: HUNGER,
    [RIN_AGGRAVATE_MONSTER]: AGGRAVATE_MONSTER,
    [RIN_POISON_RESISTANCE]: POISON_RES, [RIN_FIRE_RESISTANCE]: FIRE_RES,
    [RIN_COLD_RESISTANCE]: COLD_RES, [RIN_SHOCK_RESISTANCE]: SHOCK_RES,
    [RIN_CONFLICT]: CONFLICT, [RIN_TELEPORT_CONTROL]: TELEPORT_CONTROL,
    [RIN_POLYMORPH]: POLYMORPH, [RIN_POLYMORPH_CONTROL]: POLYMORPH_CONTROL,
    [RIN_FREE_ACTION]: FREE_ACTION, [RIN_SLOW_DIGESTION]: SLOW_DIGESTION,
    [RIN_SUSTAIN_ABILITY]: FIXED_ABIL, [RIN_STEALTH]: STEALTH,
    [RIN_WARNING]: WARNING, [RIN_SEE_INVISIBLE]: SEE_INVIS,
    [RIN_INVISIBILITY]: INVIS, [RIN_LEVITATION]: LEVITATION,
    [RIN_PROTECTION]: PROTECTION,
    [RIN_PROTECTION_FROM_SHAPE_CHAN]: PROT_FROM_SHAPE_CHANGERS,
};

// cf. do_wear.c Ring_on() — C ref: do_wear.c:1237-1340
// Matches C's exact switch structure. Most rings are passive extrinsic
// toggles handled by toggle_extrinsic; special cases get additional logic.
export function Ring_on(player, ring) {
    if (!player) return;
    const r = ring || player.leftRing || player.rightRing;
    if (!r) return;
    const otyp = r.otyp;

    // C ref: oldprop = u.uprops[objects[obj->otyp].oc_oprop].extrinsic
    // Check if property was already active before this ring.
    // Uses RING_OPROP_MAP since JS objects.js lacks oc_oprop field.
    const oprop = RING_OPROP_MAP[otyp];
    const oldprop = oprop !== undefined
        ? (player.uprops[oprop]?.extrinsic || 0) : 0;

    switch (otyp) {
    // Passive extrinsic toggles — C just breaks (handled by setworn bitmask)
    // In JS we explicitly toggle the extrinsic
    case RIN_TELEPORTATION:
        toggle_extrinsic(player, TELEPORT, true);
        break;
    case RIN_REGENERATION:
        toggle_extrinsic(player, REGENERATION, true);
        break;
    case RIN_SEARCHING:
        toggle_extrinsic(player, SEARCHING, true);
        break;
    case RIN_HUNGER:
        toggle_extrinsic(player, HUNGER, true);
        break;
    case RIN_AGGRAVATE_MONSTER:
        toggle_extrinsic(player, AGGRAVATE_MONSTER, true);
        break;
    case RIN_POISON_RESISTANCE:
        toggle_extrinsic(player, POISON_RES, true);
        break;
    case RIN_FIRE_RESISTANCE:
        toggle_extrinsic(player, FIRE_RES, true);
        break;
    case RIN_COLD_RESISTANCE:
        toggle_extrinsic(player, COLD_RES, true);
        break;
    case RIN_SHOCK_RESISTANCE:
        toggle_extrinsic(player, SHOCK_RES, true);
        break;
    case RIN_CONFLICT:
        toggle_extrinsic(player, CONFLICT, true);
        break;
    case RIN_TELEPORT_CONTROL:
        toggle_extrinsic(player, TELEPORT_CONTROL, true);
        break;
    case RIN_POLYMORPH:
        toggle_extrinsic(player, POLYMORPH, true);
        break;
    case RIN_POLYMORPH_CONTROL:
        toggle_extrinsic(player, POLYMORPH_CONTROL, true);
        break;
    case RIN_FREE_ACTION:
        toggle_extrinsic(player, FREE_ACTION, true);
        break;
    case RIN_SLOW_DIGESTION:
        toggle_extrinsic(player, SLOW_DIGESTION, true);
        break;
    case RIN_SUSTAIN_ABILITY:
        toggle_extrinsic(player, FIXED_ABIL, true);
        break;

    // Special cases with messages/effects
    case RIN_STEALTH:
        toggle_stealth(player, true);
        break;
    case RIN_WARNING:
        toggle_extrinsic(player, WARNING, true);
        // C ref: see_monsters();
        break;
    case RIN_SEE_INVISIBLE:
        toggle_extrinsic(player, SEE_INVIS, true);
        // C ref: set_mimic_blocking(); see_monsters();
        mark_vision_dirty();
        if (!oldprop && !player.blind) {
            // C ref: "Suddenly you are transparent, but there!"
            learnring(r, true);
        }
        break;
    case RIN_INVISIBILITY:
        toggle_extrinsic(player, INVIS, true);
        if (!oldprop && !player.blind) {
            learnring(r, true);
            // C ref: self_invis_message()
        }
        break;
    case RIN_LEVITATION:
        toggle_extrinsic(player, LEVITATION, true);
        if (!oldprop) {
            // C ref: float_up(); learnring(obj, TRUE);
            learnring(r, true);
        }
        break;
    case RIN_GAIN_STRENGTH:
        adj_abon(player, r, A_STR, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_GAIN_CONSTITUTION:
        adj_abon(player, r, A_CON, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_ADORNMENT:
        adj_abon(player, r, A_CHA, r.spe || 0);
        learnring(r, true);
        break;
    case RIN_INCREASE_ACCURACY:
        player.uhitinc = (player.uhitinc || 0) + (r.spe || 0);
        break;
    case RIN_INCREASE_DAMAGE:
        player.udaminc = (player.udaminc || 0) + (r.spe || 0);
        break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        toggle_extrinsic(player, PROT_FROM_SHAPE_CHANGERS, true);
        break;
    case RIN_PROTECTION:
        toggle_extrinsic(player, PROTECTION, true);
        learnring(r, (r.spe || 0) !== 0);
        if (r.spe) find_ac(player);
        break;
    }
}

// cf. do_wear.c Ring_off_or_gone() — C ref: do_wear.c:1345-1441
export function Ring_off(player, ring) {
    if (!player || !ring) return;
    const otyp = ring.otyp;

    switch (otyp) {
    case RIN_TELEPORTATION:
        toggle_extrinsic(player, TELEPORT, false);
        break;
    case RIN_REGENERATION:
        toggle_extrinsic(player, REGENERATION, false);
        break;
    case RIN_SEARCHING:
        toggle_extrinsic(player, SEARCHING, false);
        break;
    case RIN_HUNGER:
        toggle_extrinsic(player, HUNGER, false);
        break;
    case RIN_AGGRAVATE_MONSTER:
        toggle_extrinsic(player, AGGRAVATE_MONSTER, false);
        break;
    case RIN_POISON_RESISTANCE:
        toggle_extrinsic(player, POISON_RES, false);
        break;
    case RIN_FIRE_RESISTANCE:
        toggle_extrinsic(player, FIRE_RES, false);
        break;
    case RIN_COLD_RESISTANCE:
        toggle_extrinsic(player, COLD_RES, false);
        break;
    case RIN_SHOCK_RESISTANCE:
        toggle_extrinsic(player, SHOCK_RES, false);
        break;
    case RIN_CONFLICT:
        toggle_extrinsic(player, CONFLICT, false);
        break;
    case RIN_TELEPORT_CONTROL:
        toggle_extrinsic(player, TELEPORT_CONTROL, false);
        break;
    case RIN_POLYMORPH:
        toggle_extrinsic(player, POLYMORPH, false);
        break;
    case RIN_POLYMORPH_CONTROL:
        toggle_extrinsic(player, POLYMORPH_CONTROL, false);
        break;
    case RIN_FREE_ACTION:
        toggle_extrinsic(player, FREE_ACTION, false);
        break;
    case RIN_SLOW_DIGESTION:
        toggle_extrinsic(player, SLOW_DIGESTION, false);
        break;
    case RIN_SUSTAIN_ABILITY:
        toggle_extrinsic(player, FIXED_ABIL, false);
        break;
    case RIN_STEALTH:
        toggle_stealth(player, false);
        break;
    case RIN_WARNING:
        toggle_extrinsic(player, WARNING, false);
        break;
    case RIN_SEE_INVISIBLE:
        toggle_extrinsic(player, SEE_INVIS, false);
        mark_vision_dirty();
        if (!player.blind) {
            learnring(ring, true);
        }
        break;
    case RIN_INVISIBILITY:
        toggle_extrinsic(player, INVIS, false);
        if (!player.blind) {
            learnring(ring, true);
        }
        break;
    case RIN_LEVITATION:
        toggle_extrinsic(player, LEVITATION, false);
        // C ref: float_down(0L, 0L);
        learnring(ring, true);
        break;
    case RIN_GAIN_STRENGTH:
        adj_abon(player, ring, A_STR, -(ring.spe || 0));
        break;
    case RIN_GAIN_CONSTITUTION:
        adj_abon(player, ring, A_CON, -(ring.spe || 0));
        break;
    case RIN_ADORNMENT:
        adj_abon(player, ring, A_CHA, -(ring.spe || 0));
        break;
    case RIN_INCREASE_ACCURACY:
        player.uhitinc = (player.uhitinc || 0) - (ring.spe || 0);
        break;
    case RIN_INCREASE_DAMAGE:
        player.udaminc = (player.udaminc || 0) - (ring.spe || 0);
        break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        toggle_extrinsic(player, PROT_FROM_SHAPE_CHANGERS, false);
        break;
    case RIN_PROTECTION:
        toggle_extrinsic(player, PROTECTION, false);
        learnring(ring, (ring.spe || 0) !== 0);
        if (ring.spe) find_ac(player);
        break;
    }
}

// cf. do_wear.c Blindf_on() — apply effects when wearing a blindfold/towel
export async function Blindf_on(player, otmp) {
    if (!player || !otmp) return;
    const already_blind = !!player.blind;
    const blindEntry = player.ensureUProp(BLINDED);
    player.blindfold = otmp;
    if (otmp.otyp === LENSES) {
        blindEntry.extrinsic &= ~W_TOOL;
        blindEntry.blocked = (blindEntry.blocked || 0) | W_TOOL;
    } else {
        blindEntry.blocked = (blindEntry.blocked || 0) & ~W_TOOL;
        blindEntry.extrinsic = (blindEntry.extrinsic || 0) | W_TOOL;
    }

    let changed = false;
    if (player.blind && !already_blind) {
        changed = true;
        await You_cant("see any more.");
    } else if (already_blind && !player.blind) {
        changed = true;
        await You("can see!");
    }
    if (changed) {
        await toggle_blindness(player);
    }
}

// cf. do_wear.c Blindf_off() — remove effects when taking off a blindfold/towel
export async function Blindf_off(player, otmp) {
    if (!player) return;
    if (!otmp) otmp = player.blindfold;
    if (!otmp) return;
    const was_blind = !!player.blind;
    const blindEntry = player.ensureUProp(BLINDED);
    if (otmp.otyp === LENSES) {
        blindEntry.blocked = (blindEntry.blocked || 0) & ~W_TOOL;
    } else {
        blindEntry.extrinsic = (blindEntry.extrinsic || 0) & ~W_TOOL;
    }
    if (player.blindfold === otmp) player.blindfold = null;

    let changed = false;
    if (player.blind) {
        if (was_blind && otmp.otyp !== LENSES) {
            await You("still cannot see.");
        } else if (!was_blind) {
            changed = true;
            await You_cant("see anything now!");
        }
    } else if (was_blind) {
        changed = true;
        await You("can see again.");
    }
    if (changed) {
        await toggle_blindness(player);
    }
}

const SLOT_ON = {
    [ARM_SUIT]: Armor_on,
    [ARM_SHIELD]: Shield_on,
    [ARM_HELM]: Helmet_on,
    [ARM_GLOVES]: Gloves_on,
    [ARM_BOOTS]: Boots_on,
    [ARM_CLOAK]: Cloak_on,
    [ARM_SHIRT]: Shirt_on,
};

const SLOT_OFF = {
    [ARM_SUIT]: Armor_off,
    [ARM_SHIELD]: Shield_off,
    [ARM_HELM]: Helmet_off,
    [ARM_GLOVES]: Gloves_off,
    [ARM_BOOTS]: Boots_off,
    [ARM_CLOAK]: Cloak_off,
    [ARM_SHIRT]: Shirt_off,
};


// ============================================================
// 3. Validation functions
// ============================================================

// cf. do_wear.c canwearobj() — check if player can wear this armor piece
async function canwearobj(player, obj, display, silent = false) {
    const sub = objectData[obj.otyp]?.oc_subtyp;
    const slot = ARMOR_SLOTS[sub];
    if (!slot) return false;
    const mdat = player?.data || player?.polyData || null;
    const verysmall = !!mdat && ((mdat.msize || 0) < MZ_SMALL);
    const cantWear = !!mdat && cantweararm(mdat);
    const wearingThisArmor = !!(obj.owornmask & W_ARMOR);
    const weapon = player?.weapon || null;
    const bimanualWep = !!(weapon && objectData[weapon.otyp]?.bimanual);
    const weldedWep = !!(weapon && weapon.cursed);
    const isFlimsy = (o) => Number(objectData[o?.otyp]?.oc_material || 0) <= 7;

    // C: verysmall/nohands gate
    if (verysmall || (!!mdat && nohands(mdat))) {
        if (!silent) await You("can't wear any armor in your current form.");
        return false;
    }

    // C: cantweararm body-fit gate for suit/shirt/cloak with cloak exception.
    const isSuit = sub === ARM_SUIT;
    const isShirt = sub === ARM_SHIRT;
    const isCloak = sub === ARM_CLOAK;
    if ((isSuit || isShirt || isCloak) && cantWear) {
        const wrappingAllowed = !!mdat && is_humanoid(mdat);
        const isCloakAllowedException = isCloak
            && ((obj.otyp !== MUMMY_WRAPPING && !!mdat && (mdat.msize === MZ_SMALL))
                || (obj.otyp === MUMMY_WRAPPING && wrappingAllowed));
        if (!isCloakAllowedException) {
            if (!silent) await pline("The %s will not fit on your body.", slot.name);
            return false;
        }
    } else if (wearingThisArmor) {
        if (!silent) await You('are already wearing that!');
        return false;
    }

    // C: welded two-handed weapon blocks suit/shirt.
    if (weldedWep && bimanualWep && (isSuit || isShirt)) {
        if (!silent) await You('cannot do that while holding your weapon.');
        return false;
    }

    // Slot-specific prechecks in C order.
    if (sub === ARM_HELM) {
        if (player.helmet) {
            if (!silent) await You('are already wearing %s.', helm_simple_name(player.helmet));
            return false;
        }
        if (!!mdat && has_horns(mdat) && !isFlimsy(obj)) {
            if (!silent) await pline("The %s won't fit over your horns.", armor_simple_name(obj));
            return false;
        }
        return true;
    }

    if (sub === ARM_SHIELD) {
        if (player.shield) {
            if (!silent) await You('are already wearing a shield.');
            return false;
        }
        if (weapon && bimanualWep) {
            if (!silent) await You('cannot wear a shield while wielding a two-handed weapon.');
            return false;
        }
        if (player.twoweap) {
            if (!silent) await You('cannot wear a shield while wielding two weapons.');
            return false;
        }
        return true;
    }

    if (sub === ARM_BOOTS) {
        if (player.boots) {
            if (!silent) await You('are already wearing %s.', boots_simple_name(player.boots));
            return false;
        }
        if (!!mdat && slithy(mdat)) {
            if (!silent) await You('have no feet...');
            return false;
        }
        if (!!mdat && mdat.mlet === S_CENTAUR) {
            if (!silent) await You('have too many hooves to wear boots.');
            return false;
        }
        if (player.utrap && (player.utraptype === TT_BEARTRAP || player.utraptype === TT_LAVA || player.utraptype === TT_INFLOOR || player.utraptype === TT_BURIEDBALL)) {
            if (!silent) {
                if (player.utraptype === TT_BEARTRAP) {
                    await Your('foot is trapped!');
                } else if (player.utraptype === TT_LAVA || player.utraptype === TT_INFLOOR) {
                    await Your('feet are stuck!');
                } else {
                    await Your('leg is attached to the buried ball!');
                }
            }
            return false;
        }
        return true;
    }

    if (sub === ARM_GLOVES) {
        if (player.gloves) {
            if (!silent) await You('are already wearing %s.', gloves_simple_name(player.gloves));
            return false;
        }
        if (weldedWep) {
            if (!silent) await You('cannot wear gloves over your weapon.');
            return false;
        }
        if (player.glib) {
            if (!silent) await pline('Your fingers are too slippery to pull on those gloves.');
            return false;
        }
        return true;
    }

    if (sub === ARM_SHIRT) {
        if (player.armor || player.cloak || player.shirt) {
            if (!silent) {
                if (player.shirt) await You('are already wearing a shirt.');
                else if (player.armor && !player.cloak) await You_cant('wear that over your armor.');
                else await You_cant('wear that over your %s.', cloak_simple_name(player.cloak));
            }
            return false;
        }
        return true;
    }

    if (sub === ARM_CLOAK) {
        if (player.cloak) {
            if (!silent) await You('are already wearing %s.', cloak_simple_name(player.cloak));
            return false;
        }
        return true;
    }

    if (sub === ARM_SUIT) {
        if (player.cloak) {
            if (!silent) await You('cannot wear armor over a %s.', cloak_simple_name(player.cloak));
            return false;
        }
        if (player.armor) {
            if (!silent) await You('are already wearing some armor.');
            return false;
        }
        return true;
    }

    if (!silent) {
        await silly_thing('wear', obj);
        return false;
    }
    return false;
}

// cf. do_wear.c cursed() — check if item is cursed and print message
async function cursed_check(obj, display) {
    if (obj && obj.cursed) {
        await display.putstr_message("You can't. It is cursed.");
        obj.bknown = true;
        return true;
    }
    return false;
}

// ============================================================
// 4. Wear-state management stubs
// ============================================================

// cf. do_wear.c set_wear() — apply side-effects of all currently worn items
// Called during game init (moveloop prologue) or when a worn item is transformed.
async function set_wear(player, obj) {
    // If obj is null, apply effects for all worn items; otherwise just obj.
    if (!obj || obj === player.blindfold)
        if (player.blindfold) await Blindf_on(player, player.blindfold);
    if (!obj || obj === player.rightRing)
        if (player.rightRing) Ring_on(player, player.rightRing);
    if (!obj || obj === player.leftRing)
        if (player.leftRing) Ring_on(player, player.leftRing);
    if (!obj || obj === player.amulet)
        if (player.amulet) await Amulet_on(player);

    if (!obj || obj === player.shirt)
        if (player.shirt) Shirt_on(player);
    if (!obj || obj === player.armor)
        if (player.armor) Armor_on(player);
    if (!obj || obj === player.cloak)
        if (player.cloak) Cloak_on(player);
    if (!obj || obj === player.boots)
        if (player.boots) await Boots_on(player);
    if (!obj || obj === player.gloves)
        if (player.gloves) Gloves_on(player);
    if (!obj || obj === player.helmet)
        if (player.helmet) Helmet_on(player);
    if (!obj || obj === player.shield)
        if (player.shield) Shield_on(player);
}

// cf. do_wear.c donning() — check if player is in process of putting on armor
// In JS, armor donning/doffing is instantaneous (no multi-turn delays), so always false.
function donning(_otmp) {
    return false;
}

// cf. do_wear.c doffing() — check if player is in process of taking off armor
function doffing(_otmp) {
    return false;
}

// cf. do_wear.c cancel_doff() — cancel in-progress doffing
function cancel_doff(_obj, _slotmask) {
    // No-op: JS doesn't use multi-turn donning/doffing
}

// cf. do_wear.c cancel_don() — cancel in-progress donning
function cancel_don() {
    // No-op: JS doesn't use multi-turn donning/doffing
}

// cf. do_wear.c stop_donning() — stop donning if item is taken away (e.g., by theft)
function stop_donning(_stolenobj) {
    // No-op: JS doesn't use multi-turn donning/doffing
    return 0;
}

// ============================================================
// 5. AC calculation
// ============================================================

// cf. do_wear.c find_ac() — recalculate player AC from all worn equipment
// C ref: ARM_BONUS(obj) = objects[otyp].a_ac + obj->spe - min(greatest_erosion, a_ac)
// Rings contribute only spe (enchantment), not base AC.
export function find_ac(player) {
    let uac = 10; // base AC for human player form (mons[PM_HUMAN].ac = 10)
    const arm_bonus = (obj) => {
        if (!obj) return 0;
        const baseAc = Number(objectData[obj.otyp]?.oc_oc1 || 0);
        const spe = Number(obj.spe || 0);
        const erosion = Math.max(Number(obj.oeroded || 0), Number(obj.oeroded2 || 0));
        return baseAc + spe - Math.min(erosion, baseAc);
    };
    uac -= arm_bonus(player.armor);   // player.armor: body armor
    uac -= arm_bonus(player.cloak);   // player.cloak
    uac -= arm_bonus(player.helmet);  // player.helmet
    uac -= arm_bonus(player.boots);   // player.boots
    uac -= arm_bonus(player.shield);  // player.shield
    uac -= arm_bonus(player.gloves);  // player.gloves
    uac -= arm_bonus(player.shirt);   // player.shirt
    if (player.leftRing)  uac -= Number(player.leftRing.spe  || 0);
    if (player.rightRing) uac -= Number(player.rightRing.spe || 0);
    player.ac = uac;
}

// cf. do_wear.c glibr() — slippery fingers: drop weapon/rings
// C ref: rings slip off, weapons slip from hands
async function glibr(player) {
    if (!player) return;

    const leftfall = player.leftRing && !player.leftRing.cursed;
    const rightfall = player.rightRing && !player.rightRing.cursed;

    if (!player.gloves && (leftfall || rightfall)) {
        await pline("Your %s off your %s.",
            (leftfall && rightfall) ? "rings slip" : "ring slips",
            (leftfall && rightfall) ? fingers_or_gloves(player, false) : "finger");
        if (leftfall) {
            Ring_off(player, player.leftRing);
            player.leftRing = null;
        }
        if (rightfall) {
            Ring_off(player, player.rightRing);
            player.rightRing = null;
        }
    }

    // Weapon slipping
    if (player.weapon) {
        await pline("Your weapon slips from your hands.");
        player.weapon = null;
    }
}

// ============================================================
// 6. Utility stubs
// ============================================================

// cf. do_wear.c some_armor() — return a random piece of worn armor
// C ref: checks cloak->suit->shirt in order, then randomly considers h/g/f/s
function some_armor(player) {
    if (!player) return null;
    let otmph = player.cloak;
    if (!otmph) otmph = player.armor;
    if (!otmph) otmph = player.shirt;

    let otmp = player.helmet;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.gloves;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.boots;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = player.shield;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    return otmph;
}

// cf. do_wear.c stuck_ring() — check if ring is stuck due to gloves/etc
// Used for praying to check and fix levitation trouble.
// Returns the item preventing ring removal, or null.
function stuck_ring(player, ring, otyp) {
    if (ring !== player.leftRing && ring !== player.rightRing) return null;

    if (ring && ring.otyp === otyp) {
        // Gloves cursed => can't remove ring
        if (player.gloves && player.gloves.cursed) return player.gloves;
        // Ring itself cursed
        if (ring.cursed) return ring;
    }
    return null;
}

// cf. do_wear.c unchanger() — find worn item that confers Unchanging
export function unchanger(player) {
    if (player.amulet && player.amulet.otyp === AMULET_OF_UNCHANGING)
        return player.amulet;
    return null;
}

// cf. do_wear.c count_worn_stuff() — count worn armor and accessories
// Returns { armorCount, accessoryCount, lastArmor, lastAccessory }
function count_worn_stuff(player) {
    let armorCount = 0, accessoryCount = 0;
    let lastArmor = null, lastAccessory = null;

    if (player.helmet) { armorCount++; lastArmor = player.helmet; }
    if (player.shield) { armorCount++; lastArmor = player.shield; }
    if (player.gloves) { armorCount++; lastArmor = player.gloves; }
    if (player.boots) { armorCount++; lastArmor = player.boots; }
    // For cloak/suit/shirt, only count outermost
    if (player.cloak) { armorCount++; lastArmor = player.cloak; }
    else if (player.armor) { armorCount++; lastArmor = player.armor; }
    else if (player.shirt) { armorCount++; lastArmor = player.shirt; }

    if (player.leftRing) { accessoryCount++; lastAccessory = player.leftRing; }
    if (player.rightRing) { accessoryCount++; lastAccessory = player.rightRing; }
    if (player.amulet) { accessoryCount++; lastAccessory = player.amulet; }
    if (player.blindfold) { accessoryCount++; lastAccessory = player.blindfold; }

    return { armorCount, accessoryCount, lastArmor, lastAccessory };
}

// cf. do_wear.c armor_or_accessory_off() — take off armor or accessory
// Autotranslated from do_wear.c:1765
export async function armor_or_accessory_off(obj, game, player) {
  if (!player) player = game?.u || game?.player;
  if (!(obj.owornmask & (W_ARMOR | W_ACCESSORY))) { await You("are not wearing that."); return ECMD_OK; }
  if (obj === player.uskin || ((obj === player.armor) && player.cloak) || ((obj === player.shirt) && (player.cloak || player.armor))) {
    let why = '', what = '';
    if (obj !== player.uskin) {
      if (player.cloak) {
        what = (what ?? '') + (cloak_simple_name(player.cloak) ?? '');
      }
      if ((obj === player.shirt) && player.armor) {
        if (player.cloak) {
          what = (what ?? '') + (" and " ?? '');
        }
        what = (what ?? '') + (suit_simple_name(player.armor) ?? '');
      }
      why = ` without taking off your ${what} first`;
    }
    else { why = "; it's embedded"; }
    await You_cant("take that off%s.", why);
    return ECMD_OK;
  }
  reset_remarm();
  await select_off(obj);
  if (!game.svc.context.takeoff.mask) return ECMD_OK;
  reset_remarm();
  if (obj.owornmask & W_ARMOR) { armoroff(obj); }
  else if (obj === player.rightRing || obj === player.leftRing) { await off_msg(obj); Ring_off(obj); }
  else if (obj === player.amulet) { Amulet_off(); }
  else if (obj === player.blindfold) { await Blindf_off(player, obj); }
  else {
    impossible("removing strange accessory: %s", safe_typename(obj.otyp));
    if (obj.owornmask) remove_worn_item(obj, false);
  }
  return ECMD_TIME;
}

// ============================================================
// 7. Multi-item takeoff (A) stubs
// ============================================================

// cf. do_wear.c select_off() — check if item can be taken off, for multi-remove
async function select_off(player, otmp, display) {
    if (!otmp) return false;

    // Ring checks
    if (otmp === player.leftRing || otmp === player.rightRing) {
        if (player.gloves && player.gloves.cursed) {
            await pline("You cannot take off your gloves to remove the ring.");
            return false;
        }
    }
    // Glove checks
    if (otmp === player.gloves) {
        // wielding_corpse check deferred
    }
    // Suit/shirt checks
    if (otmp === player.armor || otmp === player.shirt) {
        if (player.cloak && player.cloak.cursed) {
            await pline("You cannot remove your cloak to take off %s.", doname(otmp, player));
            return false;
        }
        if (otmp === player.shirt && player.armor && player.armor.cursed) {
            await pline("You cannot remove your suit to take off %s.", doname(otmp, player));
            return false;
        }
    }
    // Basic curse check
    if (await cursed_check(otmp, display)) return false;

    return true;
}

// cf. do_wear.c do_takeoff() — execute removal of one item
// Autotranslated from do_wear.c:2818
export async function do_takeoff(game, player) {
  let otmp = null, was_twoweap = player.twoweap;
  let doff =  game.svc.context.takeoff;
  game.svc.context.takeoff.mask |= I_SPECIAL;
  if (doff.what === W_WEP) {
    if (!await cursed(player.weapon, player)) {
      setuwep( 0);
      if (was_twoweap) await You("are no longer wielding either weapon.");
      else {
        await You("are %s.", empty_handed());
      }
    }
  }
  else if (doff.what === W_SWAPWEP) {
    setuswapwep( 0);
    await You("%sno longer %s.", was_twoweap ? "are " : "", was_twoweap ? "wielding two weapons at once" : "have a second weapon readied");
  }
  else if (doff.what === W_QUIVER) { setuqwep( 0); await You("no longer have ammunition readied."); }
  else if (doff.what === WORN_ARMOR) {
    otmp = player.armor;
    if (!await cursed(otmp, player)) {
      Armor_off();
    }
  }
  else if (doff.what === WORN_CLOAK) {
    otmp = player.cloak;
    if (!await cursed(otmp, player)) {
      Cloak_off();
    }
  }
  else if (doff.what === WORN_BOOTS) {
    otmp = player.boots;
    if (!await cursed(otmp, player)) {
      await Boots_off();
    }
  }
  else if (doff.what === WORN_GLOVES) {
    otmp = player.gloves;
    if (!await cursed(otmp, player)) {
      Gloves_off();
    }
  }
  else if (doff.what === WORN_HELMET) {
    otmp = player.helmet;
    if (!await cursed(otmp, player)) {
      Helmet_off();
    }
  }
  else if (doff.what === WORN_SHIELD) {
    otmp = player.shield;
    if (!await cursed(otmp, player)) {
      Shield_off();
    }
  }
  else if (doff.what === WORN_SHIRT) {
    otmp = player.shirt;
    if (!await cursed(otmp, player)) {
      Shirt_off();
    }
  }
  else if (doff.what === WORN_AMUL) { otmp = player.amulet; if (!await cursed(otmp, player)) Amulet_off(); }
  else if (doff.what === LEFT_RING) { otmp = player.leftRing; if (!await cursed(otmp, player)) Ring_off(player.leftRing); }
  else if (doff.what === RIGHT_RING) { otmp = player.rightRing; if (!await cursed(otmp, player)) Ring_off(player.rightRing); }
  else if (doff.what === WORN_BLINDF) { if (!await cursed(player.blindfold, player)) await Blindf_off(player, player.blindfold); }
  else {
    impossible("do_takeoff: taking off %lx", doff.what);
  }
  game.svc.context.takeoff.mask &= ~I_SPECIAL;
  return otmp;
}

// cf. do_wear.c take_off() — take off a specific item (occupation callback in C)
// In JS, donning/doffing is instantaneous, so this is a simple wrapper.
export async function take_off(player, otmp, display) {
    return await do_takeoff(player, otmp, display);
}

// cf. do_wear.c better_not_take_that_off() — warn about cockatrice corpse when removing gloves
export function better_not_take_that_off(_otmp) {
    // Simplified: full cockatrice corpse check not yet ported
    return false;
}

// cf. do_wear.c reset_remarm() — reset multi-remove state
export function reset_remarm() {
    // No-op in JS — no persistent takeoff context to reset
}

// cf. do_wear.c doddoremarm() — A command: take off multiple items
// In JS, multi-item remove is handled by the command system; this is a stub.
export function doddoremarm(_player, _display) {
    // TODO: implement menu-driven multi-remove when A command is wired up
    return { moved: false, tookTime: false };
}

// cf. do_wear.c remarm_swapwep() — handle swapweapon during multi-remove
function remarm_swapwep(_player) {
    // No-op: swapweapon handling not yet needed
    return 0;
}

// cf. do_wear.c menu_remarm() — menu-driven multi-remove
function menu_remarm(_retry) {
    // No-op: menu system for multi-remove not yet ported
    return 0;
}

// cf. do_wear.c doddoremarm() — 'A' command: show category menu for take-off-all
export async function handleRemoveAll(player, display, _game) {
    // Collect currently equipped/wielded items from canonical hero slot pointers.
    // (owornmask is now kept in sync; this path stays slot-driven to match command UX.)
    const wornItems = [
        player.weapon, player.swapwep, player.quiver,
        player.armor, player.cloak, player.shirt, player.helmet,
        player.gloves, player.boots, player.shield,
        player.leftRing, player.rightRing, player.amulet,
    ].filter(Boolean);
    if (wornItems.length === 0) {
        await pline("Not wearing anything.");
        return { moved: false, tookTime: false };
    }

    // Build category menu (cf. C query_category with WORN_TYPES|ALL_TYPES|BUCX_TYPES)
    const CLASS_LABEL = {
        [WEAPON_CLASS]: 'Weapons', [ARMOR_CLASS]: 'Armor', [RING_CLASS]: 'Rings',
        [AMULET_CLASS]: 'Amulets', [TOOL_CLASS]: 'Tools', [FOOD_CLASS]: 'Comestibles',
        [POTION_CLASS]: 'Potions', [SCROLL_CLASS]: 'Scrolls', [SPBOOK_CLASS]: 'Spellbooks',
        [WAND_CLASS]: 'Wands', [COIN_CLASS]: 'Coins', [GEM_CLASS]: 'Gems/Stones',
    };
    // Mirrors C def_inv_order (COIN, AMULET, WEAPON, ARMOR, FOOD, SCROLL, SPBOOK, POTION, RING, WAND, TOOL, GEM, ROCK, BALL, CHAIN)
    const INV_ORDER = [COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
        SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS, TOOL_CLASS,
        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS];

    const lines = ["What type of things do you want to take off?", ""];
    lines.push("a - All worn and wielded types");

    let autoChar = 'b'.charCodeAt(0);
    const wornClasses = new Set(wornItems.map(o => o.oclass));
    for (const cls of INV_ORDER) {
        if (!wornClasses.has(cls)) continue;
        const label = CLASS_LABEL[cls] || 'Other';
        lines.push(String.fromCharCode(autoChar) + " - " + label);
        autoChar++;
        if (autoChar > 'z'.charCodeAt(0)) autoChar = 'A'.charCodeAt(0);
    }

    // BUC entries with fixed letters (only shown if any worn item has that status)
    const bucLines = [];
    if (wornItems.some(o => o.bknown && o.blessed))                  bucLines.push("B - Items known to be Blessed");
    if (wornItems.some(o => o.bknown && o.cursed))                   bucLines.push("C - Items known to be Cursed");
    if (wornItems.some(o => o.bknown && !o.blessed && !o.cursed))    bucLines.push("U - Items known to be Uncursed");
    if (wornItems.some(o => !o.bknown))                              bucLines.push("X - Items of unknown B/C/U status");
    if (bucLines.length > 0) {
        lines.push("", ...bucLines);
    }
    lines.push("(end)");

    await renderOverlayMenuUntilDismiss(display, lines, '');
    return { moved: false, tookTime: false };
}

// ============================================================
// 8. Armor destruction stubs
// ============================================================

// cf. do_wear.c wornarm_destroyed() — take off worn armor then destroy it
async function wornarm_destroyed(player, wornarm) {
    if (!wornarm) return;
    if (donning(wornarm)) cancel_don();

    // Call the appropriate off function
    if (wornarm === player.cloak) { Cloak_off(player); player.cloak = null; }
    else if (wornarm === player.armor) { Armor_off(player); player.armor = null; }
    else if (wornarm === player.shirt) { Shirt_off(player); player.shirt = null; }
    else if (wornarm === player.helmet) { Helmet_off(player); player.helmet = null; }
    else if (wornarm === player.gloves) { Gloves_off(player); player.gloves = null; }
    else if (wornarm === player.boots) { await Boots_off(player); player.boots = null; }
    else if (wornarm === player.shield) { Shield_off(player); player.shield = null; }

    find_ac(player);
    // Destroy the item from inventory
    useup(wornarm, player);
}

// cf. do_wear.c maybe_destroy_armor() — check if armor resists destruction
// Returns the armor with in_use set, or null.
export function maybe_destroy_armor(armor, atmp) {
    if (armor && (!atmp || atmp === armor)
        && !obj_resists(armor, 0, 90)) {
        armor.in_use = true;
        return armor;
    }
    return null;
}

// cf. do_wear.c destroy_arm() — hit by destroy armor scroll/black dragon breath/spell
// C ref: checks cloak -> suit -> shirt -> helm -> gloves -> boots -> shield in order
export async function destroy_arm(player, atmp) {
    if (!player) return 0;
    let otmp = null;
    let losing_gloves = false;
    let resistedc = false, resistedsuit = false;

    // Check cloak
    if (player.cloak) {
        otmp = maybe_destroy_armor(player.cloak, atmp);
        if (otmp) {
            await pline("Your cloak crumbles and turns to dust!");
        } else {
            resistedc = true;
        }
    }
    // Check suit (only if cloak didn't resist)
    if (!otmp && !resistedc && player.armor) {
        otmp = maybe_destroy_armor(player.armor, atmp);
        if (otmp) {
            await pline("Your armor turns to dust and falls to the ground!");
        } else {
            resistedsuit = true;
        }
    }
    // Check shirt (only if cloak and suit didn't resist)
    if (!otmp && !resistedc && !resistedsuit && player.shirt) {
        otmp = maybe_destroy_armor(player.shirt, atmp);
        if (otmp) {
            await pline("Your shirt crumbles into tiny threads and falls apart!");
        }
    }
    // Check helmet
    if (!otmp && player.helmet) {
        otmp = maybe_destroy_armor(player.helmet, atmp);
        if (otmp) {
            await pline("Your helmet turns to dust and is blown away!");
        }
    }
    // Check gloves
    if (!otmp && player.gloves) {
        otmp = maybe_destroy_armor(player.gloves, atmp);
        if (otmp) {
            await pline("Your gloves vanish!");
            losing_gloves = true;
        }
    }
    // Check boots
    if (!otmp && player.boots) {
        otmp = maybe_destroy_armor(player.boots, atmp);
        if (otmp) {
            await pline("Your boots disintegrate!");
        }
    }
    // Check shield
    if (!otmp && player.shield) {
        otmp = maybe_destroy_armor(player.shield, atmp);
        if (otmp) {
            await pline("Your shield crumbles away!");
        }
    }

    if (!otmp) return 0;

    await wornarm_destroyed(player, otmp);
    // Glove loss means wielded weapon will be touched (cockatrice check)
    if (losing_gloves) {
        // TODO: selftouch("You") — petrification not yet ported
    }
    return 1;
}

// ============================================================
// 9. Stat adjustment stubs
// ============================================================

// adj_abon() implemented above in the equipment effects section

// ============================================================
// 10. Accessibility/getobj stubs
// ============================================================

// cf. do_wear.c inaccessible_equipment() — check if equipment is covered by other worn items
// Returns true if the item is inaccessible (covered up).
async function inaccessible_equipment(player, obj, verb, only_if_known_cursed) {
    if (!obj) return false;
    const anycovering = !only_if_known_cursed;
    const blocksAccess = (x) => anycovering || (x.cursed && x.bknown);

    // Suit covered by cloak
    if (obj === player.armor && player.cloak && blocksAccess(player.cloak)) {
        if (verb) {
            await pline("You need to take off your cloak to %s your armor.", verb);
        }
        return true;
    }
    // Shirt covered by suit and/or cloak
    if (obj === player.shirt) {
        if ((player.armor && blocksAccess(player.armor))
            || (player.cloak && blocksAccess(player.cloak))) {
            if (verb) {
                const covering = player.cloak ? "cloak" : "suit";
                await pline("You need to take off your %s to %s your shirt.", covering, verb);
            }
            return true;
        }
    }
    // Rings covered by gloves
    if ((obj === player.leftRing || obj === player.rightRing)
        && player.gloves && blocksAccess(player.gloves)) {
        if (verb) {
            await pline("You need to take off your gloves to %s your ring.", verb);
        }
        return true;
    }
    return false;
}

// cf. do_wear.c equip_ok() — general equipment validation callback
// Returns a classification code for getobj-style filtering.
const GETOBJ_EXCLUDE = 0;
const GETOBJ_EXCLUDE_INACCESS = 1;
const GETOBJ_DOWNPLAY = 2;
const GETOBJ_SUGGEST = 3;

async function equip_ok(player, obj, removing, accessory) {
    if (!obj) return GETOBJ_EXCLUDE;

    const is_worn = (obj === player.armor || obj === player.cloak
        || obj === player.helmet || obj === player.shield
        || obj === player.gloves || obj === player.boots
        || obj === player.shirt || obj === player.leftRing
        || obj === player.rightRing || obj === player.amulet
        || obj === player.blindfold);

    // Exclude if trying to put on already-worn or remove not-worn
    if (removing !== is_worn) return GETOBJ_EXCLUDE_INACCESS;

    // Exclude most non-wearable classes
    if (obj.oclass !== ARMOR_CLASS && obj.oclass !== RING_CLASS
        && obj.oclass !== AMULET_CLASS) {
        if (obj.otyp !== MEAT_RING && obj.otyp !== BLINDFOLD
            && obj.otyp !== TOWEL && obj.otyp !== LENSES)
            return GETOBJ_EXCLUDE;
    }

    // Armor with P/R or accessory with W/T
    if (accessory !== (obj.oclass !== ARMOR_CLASS))
        return GETOBJ_DOWNPLAY;

    // Inaccessible equipment when removing
    if (removing) {
        if (await inaccessible_equipment(player, obj, null, obj.oclass === RING_CLASS))
            return GETOBJ_EXCLUDE_INACCESS;
    }

    return GETOBJ_SUGGEST;
}

// cf. do_wear.c puton_ok() — validation for P command items
export async function puton_ok(player, obj) {
    return await equip_ok(player, obj, false, true);
}

// cf. do_wear.c remove_ok() — validation for R command items
export async function remove_ok(player, obj) {
    return await equip_ok(player, obj, true, true);
}

// cf. do_wear.c wear_ok() — validation for W command items
export async function wear_ok(player, obj) {
    return await equip_ok(player, obj, false, false);
}

// cf. do_wear.c takeoff_ok() — validation for T command items
export async function takeoff_ok(player, obj) {
    return await equip_ok(player, obj, true, false);
}

// cf. do_wear.c any_worn_armor_ok() — suggest any worn armor for blessed destroy armor
function any_worn_armor_ok(player, obj) {
    if (!obj || obj.oclass !== ARMOR_CLASS) return GETOBJ_EXCLUDE;
    const is_worn = (obj === player.armor || obj === player.cloak
        || obj === player.helmet || obj === player.shield
        || obj === player.gloves || obj === player.boots
        || obj === player.shirt);
    return is_worn ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE;
}

// cf. do_wear.c count_worn_armor() — count pieces of worn armor
export function count_worn_armor(player) {
    let ret = 0;
    if (player.armor) ret++;
    if (player.cloak) ret++;
    if (player.helmet) ret++;
    if (player.shield) ret++;
    if (player.gloves) ret++;
    if (player.boots) ret++;
    if (player.shirt) ret++;
    return ret;
}


// ============================================================
// Command handlers
// ============================================================

// Helper: collect all currently worn armor items
function getWornArmorItems(player) {
    // Preserve inventory letter order like C getobj()/askchain prompts.
    const worn = new Set();
    for (const sub of Object.keys(ARMOR_SLOTS)) {
        const prop = ARMOR_SLOTS[sub].prop;
        if (player[prop]) worn.add(player[prop]);
    }
    return (player.inventory || []).filter((obj) => worn.has(obj));
}

function getWornAccessoryItems(player) {
    const worn = new Set();
    if (player.leftRing) worn.add(player.leftRing);
    if (player.rightRing) worn.add(player.rightRing);
    if (player.amulet) worn.add(player.amulet);
    if (player.blindfold) worn.add(player.blindfold);
    return (player.inventory || []).filter((obj) => worn.has(obj));
}

function getWornArmorAndAccessoryItems(player) {
    const worn = new Set();
    for (const obj of getWornArmorItems(player)) worn.add(obj);
    for (const obj of getWornAccessoryItems(player)) worn.add(obj);
    return (player.inventory || []).filter((obj) => worn.has(obj));
}

function resetTopline(display) {
    if (typeof display?.clearRow === 'function') display.clearRow(0);
    if (display) display.topMessage = null;
    if (display && Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
}

function isEyewearItem(o) {
    return !!o && (o.otyp === BLINDFOLD || o.otyp === TOWEL || o.otyp === LENSES);
}

function isAccessoryOrArmorItem(o) {
    return !!o && (
        o.oclass === ARMOR_CLASS
        || o.oclass === RING_CLASS
        || o.otyp === MEAT_RING
        || o.oclass === AMULET_CLASS
        || isEyewearItem(o)
    );
}

function isAlreadyWornAccessoryOrArmor(player, o) {
    if (!o) return false;
    if (o.oclass === ARMOR_CLASS) {
        return o === player.armor || o === player.cloak || o === player.helmet
            || o === player.shield || o === player.gloves || o === player.boots
            || o === player.shirt;
    }
    if (o.oclass === RING_CLASS || o.otyp === MEAT_RING) return o === player.leftRing || o === player.rightRing;
    if (o.oclass === AMULET_CLASS) return o === player.amulet;
    if (isEyewearItem(o)) return o === player.blindfold;
    return false;
}

// cf. do_wear.c:2204 accessory_or_armor_on() — unified entry for W/P commands
export async function accessory_or_armor_on(obj, player, display, game) {
    return await putOnSelectedItem(player, display, game, obj);
}

async function putOnSelectedItem(player, display, game, item) {
    if (item.oclass === ARMOR_CLASS) {
        resetTopline(display);
        if (!await canwearobj(player, item, display)) {
            return { moved: false, tookTime: false };
        }
        // C ref: do_wear.c accessory_or_armor_on() — quest helm guard before retouch.
        if (item.otyp === HELM_OF_OPPOSITE_ALIGNMENT) {
            const inQuestBranch = Number.isInteger(player?.uz?.dnum) && player.uz.dnum === 3;
            if (inQuestBranch) {
                const currentBase = (player?.ualignbase_current != null) ? player.ualignbase_current : player?.alignment;
                const originalBase = (player?.ualignbase_original != null) ? player.ualignbase_original : player?.alignment;
                if (currentBase === originalBase) {
                    await You('narrowly avoid losing all chance at your goal.');
                } else {
                    await You('are suddenly overcome with shame and change your mind.');
                }
                player.ublessed = 0;
                makeknown(item.otyp);
                return { moved: false, tookTime: true };
            }
        }
        if (!(await retouch_object(item, false, player))) {
            return { moved: false, tookTime: true };
        }
        return await wearArmorItem(player, display, game, item);
    }

    if (item.oclass === RING_CLASS || item.otyp === MEAT_RING) {
        let ringMask = 0;
        if (nolimbs(player?.data || player?.polyData || {})) {
            await You('cannot make the ring stick to your body.');
            return { moved: false, tookTime: false };
        }
        if (player.leftRing && player.rightRing) {
            const humanoid = !nolimbs(player?.data || player?.polyData || {});
            await pline("There are no more %s%s to fill.",
                humanoid ? 'ring-' : '',
                fingers_or_gloves(player, false));
            return { moved: false, tookTime: false };
        }
        if (player.leftRing) {
            ringMask = W_RINGR;
        } else if (player.rightRing) {
            ringMask = W_RINGL;
        } else {
            const fingerQ = 'Which ring-finger, Right or Left? [rl] ';
            resetTopline(display);
            await display.putstr_message(fingerQ);
            let mask = null;
            while (!mask) {
                const fc = await nhgetch();
                const fs = String.fromCharCode(fc);
                // C yn_function(..., rightleftchars, '\0', ...) cancels on
                // ESC and Enter (default '\0').
                if (fc === 27 || fc === 0 || fc === 10 || fc === 13) {
                    return { moved: false, tookTime: false };
                }
                if (fs === 'r' || fs === 'R') mask = 'right';
                else if (fs === 'l' || fs === 'L') mask = 'left';
            }
            if (mask === 'left') ringMask = W_RINGL;
            else ringMask = W_RINGR;
        }
        if (player.gloves && player.glib) {
            await pline("Your %s are too slippery to remove, so you cannot put on the ring.", armor_simple_name(player.gloves));
            return { moved: false, tookTime: true };
        }
        if (player.gloves && player.gloves.cursed) {
            const learned = !player.gloves.bknown;
            player.gloves.bknown = true;
            await You('cannot remove your gloves to put on the ring.');
            return { moved: false, tookTime: learned };
        }
        if (player.weapon) {
            const dominantRight = player.rightHanded !== false;
            const weapon = player.weapon;
            const weldedWeapon = !!(weapon.cursed && (weapon.owornmask & W_WEP));
            const bimanualWeapon = !!objectData[weapon.otyp]?.bimanual;
            const putsOnDominantHand = (dominantRight && (ringMask & W_RINGR)) || (!dominantRight && (ringMask & W_RINGL));
            if (weldedWeapon && (bimanualWeapon || putsOnDominantHand)) {
                const learned = !weapon.bknown;
                weapon.bknown = true;
                await You('cannot free your weapon hand to put on the ring.');
                return { moved: false, tookTime: learned };
            }
        }
        if (!(await retouch_object(item, false, player))) {
            return { moved: false, tookTime: true };
        }
        setworn(player, item, ringMask);
        Ring_on(player, item);
    } else if (item.oclass === AMULET_CLASS) {
        if (player.amulet) {
            await display.putstr_message("You're already wearing an amulet.");
            return { moved: false, tookTime: false };
        }
        if (!(await retouch_object(item, false, player))) {
            return { moved: false, tookTime: true };
        }
        setworn(player, item, W_AMUL);
        await Amulet_on(player);
    } else if (isEyewearItem(item)) {
        if (!has_head(player?.data || player?.polyData || {})) {
            await You('have no head to wear that on.');
            return { moved: false, tookTime: false };
        }
        if (player.blindfold) {
            if (player.blindfold.otyp === TOWEL) {
                await Your('face is already covered by a towel.');
            } else if (player.blindfold.otyp === BLINDFOLD) {
                if (item.otyp === LENSES) await You("can't wear lenses because you're wearing a blindfold there already.");
                else await You('are already wearing a blindfold.');
            } else if (player.blindfold.otyp === LENSES) {
                if (item.otyp === BLINDFOLD) await You("can't wear a blindfold because you're wearing some lenses there already.");
                else await You('are already wearing some lenses.');
            } else {
                await You('are already wearing that!');
            }
            return { moved: false, tookTime: false };
        }
        if (!(await retouch_object(item, false, player))) {
            return { moved: false, tookTime: true };
        }
        setworn(player, item, W_TOOL);
        await Blindf_on(player, item);
    } else {
        await display.putstr_message('That is a silly thing to put on.');
        return { moved: false, tookTime: false };
    }

    find_ac(player);
    await display.putstr_message(`You are now wearing ${doname(item, player)}.`);
    return { moved: false, tookTime: true };
}

async function wearArmorItem(player, display, game, item) {
    const sub = objectData[item.otyp]?.oc_subtyp;
    const slot = ARMOR_SLOTS[sub];
    const delay = -(Number(objectData[item.otyp]?.oc_delay || 0));

    // C ref: accessory_or_armor_on() — release wielded armor for wearing
    if (item.owornmask & (W_WEP | W_SWAPWEP | W_QUIVER)) {
        // remove_worn_item(item, false) equivalent
        if (item === player.weapon) { player.weapon = null; item.owornmask &= ~W_WEP; }
        else if (item === player.secondaryWeapon) { player.secondaryWeapon = null; item.owornmask &= ~W_SWAPWEP; }
        else if (item === player.quiver) { player.quiver = null; item.owornmask &= ~W_QUIVER; }
    }

    const mask = ARM_SUB_TO_MASK[sub] || 0;
    if (mask) setworn(player, item, mask);
    else if (slot?.prop) player[slot.prop] = item;

    // C ref: set afternmv based on which slot
    const onFn = SLOT_ON[sub];
    const afternmvFn = onFn ? (async () => { onFn(player); }) : null;

    // C parity: armor donning uses nomul(delay) + afternmv, not occupation
    if (game && delay) {
        nomul(delay, game);
        game.multi_reason = 'dressing up';
        game.nomovemsg = 'You finish your dressing maneuver.';
        if (afternmvFn) game.afternmv = afternmvFn;
        return { moved: false, tookTime: true };
    }

    // No delay: call afternmv immediately via unmul("") (matches C)
    if (afternmvFn) game.afternmv = afternmvFn;
    await unmul('', player, display, game);
    await on_msg(item, player);
    if (game?.svc?.context?.takeoff) {
        game.svc.context.takeoff.mask = game.svc.context.takeoff.what = 0;
    }
    find_ac(player);
    return { moved: false, tookTime: true };
}

async function removeArmorOrAccessory(player, display, game, item) {
    if (!item || !(item.owornmask & (W_ARMOR | W_ACCESSORY))) {
        await You('are not wearing that.');
        return { moved: false, tookTime: false };
    }

    // C parity: layered suit/shirt and uskin checks happen before select_off().
    if (item === player.uskin
        || (item === player.armor && player.cloak)
        || (item === player.shirt && (player.cloak || player.armor))) {
        let why = '';
        if (item === player.uskin) {
            why = "; it's embedded";
        } else {
            const blockers = [];
            if (player.cloak) blockers.push('cloak');
            if (item === player.shirt && player.armor) blockers.push('suit');
            why = ` without taking off your ${blockers.join(' and ')} first`;
        }
        await You_cant(`take that off${why}.`);
        return { moved: false, tookTime: false };
    }

    if (!await select_off(player, item, display)) {
        return { moved: false, tookTime: false };
    }

    if (item.owornmask & W_ARMOR) {
        const sub = objectData[item.otyp]?.oc_subtyp;
        const slot = ARMOR_SLOTS[sub];
        const offFn = SLOT_OFF[sub];
        const delay = Number(objectData[item.otyp]?.oc_delay || 0);
        const takeOffNow = async () => {
            if (offFn) await offFn(player);
            if (item?.owornmask) setnotworn(player, item);
            else if (slot?.prop) player[slot.prop] = null;
            find_ac(player);
        };

        if (game && delay > 1) {
            let remaining = Math.max(0, delay - 1);
            game.occupation = {
                occtxt: 'disrobing',
                fn: () => {
                    remaining -= 1;
                    return remaining > 0;
                },
                onFinishAfterTurn: async () => {
                    await takeOffNow();
                    await display.putstr_message(`You finish taking off your ${armor_simple_name(item)}.`);
                },
            };
            return { moved: false, tookTime: true };
        }

        await takeOffNow();
        await off_msg(item, player);
        return { moved: false, tookTime: true };
    }

    if (item === player.rightRing || item === player.leftRing) {
        await off_msg(item, player);
        Ring_off(player, item);
        setnotworn(player, item);
    } else if (item === player.amulet) {
        await off_msg(item, player);
        Amulet_off(player);
        setnotworn(player, item);
    } else if (item === player.blindfold) {
        await off_msg(item, player);
        await Blindf_off(player, item);
        setnotworn(player, item);
    } else {
        if (item.owornmask) setnotworn(player, item);
    }
    find_ac(player);
    return { moved: false, tookTime: true };
}

// cf. do_wear.c dowear() — W command: wear a piece of armor
async function handleWear(player, display, game = null) {
    const wornSet = new Set(getWornArmorItems(player));
    const suggested = [];
    let inaccess = 0;
    let forcePrompt = false; // C getobj: GETOBJ_DOWNPLAY causes forced prompt.
    for (const obj of (player.inventory || [])) {
        const isWorn = wornSet.has(obj);
        if (isWorn) {
            inaccess++;
            continue;
        }
        const isAccessoryClass = obj.oclass === RING_CLASS || obj.oclass === AMULET_CLASS;
        const isAccessoryException = obj.otyp === MEAT_RING || obj.otyp === BLINDFOLD
            || obj.otyp === TOWEL || obj.otyp === LENSES;
        const isArmorClass = obj.oclass === ARMOR_CLASS;
        if (!isArmorClass && !isAccessoryClass && !isAccessoryException) {
            continue;
        }
        if (!isArmorClass) {
            // C equip_ok(removing=false, accessory=false): non-armor wearable
            // items for 'W' are downplayed rather than excluded.
            forcePrompt = true;
            continue;
        }
        // C getobj downplay path should not print side messages during prompt
        // candidate discovery; only the final chosen item validation may print.
        if (!await canwearobj(player, obj, display, true)) {
            forcePrompt = true;
            continue;
        }
        suggested.push(obj);
    }

    if (suggested.length === 0 && !forcePrompt) {
        await display.putstr_message(`You don't have anything ${inaccess ? 'else ' : ''}to wear.`);
        return { moved: false, tookTime: false };
    }

    const wearChoices = suggested.map((a) => a.invlet).join('');
    const wearPrompt = wearChoices.length > 0
        ? `What do you want to wear? [${wearChoices} or ?*] `
        : 'What do you want to wear? [*] ';
    const allInvLetters = (player.inventory || [])
        .filter((o) => o && o.invlet)
        .map((o) => o.invlet)
        .join('');
    const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
    const showWearHelpList = async () => {
        resetTopline(display);
        const lines = buildInventoryOverlayLines(player);
        return await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
    };
    resetTopline(display);
    await display.putstr_message(wearPrompt);
    while (true) {
            const ch = await nhgetch();
        let c = String.fromCharCode(ch);

        if (isDismissKey(ch)) {
            resetTopline(display);
            await display.putstr_message('Never mind.');
            updateLastPlineMessage('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            const menuSelection = await showWearHelpList();
            if (menuSelection) {
                c = menuSelection;
            } else {
                resetTopline(display);
                await display.putstr_message(wearPrompt);
                continue;
            }
        }

        const selected = (player.inventory || []).find((o) => o.invlet === c);
        if (!selected) {
            resetTopline(display);
            await display.putstr_message('Never mind.');
            updateLastPlineMessage('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (!isAccessoryOrArmorItem(selected)) {
            resetTopline(display);
            await display.putstr_message('That is a silly thing to wear.');
            updateLastPlineMessage('That is a silly thing to wear.');
            return { moved: false, tookTime: false };
        }
        if (isAlreadyWornAccessoryOrArmor(player, selected)) {
            resetTopline(display);
            await display.putstr_message('You are already wearing that!');
            updateLastPlineMessage('You are already wearing that!');
            return { moved: false, tookTime: false };
        }
        return await putOnSelectedItem(player, display, game, selected);
    }
}

// cf. do_wear.c doputon() — P command: put on ring or amulet
async function handlePutOn(player, display, game = null) {
    if (player.leftRing && player.rightRing && player.amulet && player.blindfold
        && player.armor && player.shirt && player.cloak && player.helmet && player.shield && player.gloves && player.boots) {
        await display.putstr_message("Your ring-fingers are full, and you're already wearing an amulet and a blindfold.");
        return { moved: false, tookTime: false };
    }

    const putOnCandidates = (player.inventory || []).filter((o) => {
        if (!isAccessoryOrArmorItem(o)) return false;
        if (isAlreadyWornAccessoryOrArmor(player, o)) return false;
        return true;
    });
    if (putOnCandidates.length === 0) {
        await display.putstr_message("You don't have anything else to put on.");
        return { moved: false, tookTime: false };
    }

    // C getobj parity: 'P' suggests accessories and downplays armor.
    const suggested = putOnCandidates.filter((o) => o.oclass !== ARMOR_CLASS);
    const putOnChoices = suggested.map((r) => r.invlet).join('');
    const putOnPrompt = putOnChoices.length > 0
        ? `What do you want to put on? [${putOnChoices} or ?*] `
        : 'What do you want to put on? [*] ';
    const allInvLetters = (player.inventory || [])
        .filter((o) => o && o.invlet)
        .map((o) => o.invlet)
        .join('');
    const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
    const showPutOnHelpList = async () => {
        resetTopline(display);
        const lines = buildInventoryOverlayLines(player);
        return await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
    };
    resetTopline(display);
    await display.putstr_message(putOnPrompt);
    while (true) {
            const ch = await nhgetch();
        let c = String.fromCharCode(ch);

        if (isDismissKey(ch)) {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            resetTopline(display);
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            const menuSelection = await showPutOnHelpList();
            if (menuSelection) {
                c = menuSelection;
            } else {
                resetTopline(display);
                await display.putstr_message(putOnPrompt);
                continue;
            }
        }

        const selected = (player.inventory || []).find((o) => o.invlet === c);
        if (!selected) {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            resetTopline(display);
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (!putOnCandidates.includes(selected)) {
            resetTopline(display);
            if (isAccessoryOrArmorItem(selected) && isAlreadyWornAccessoryOrArmor(player, selected)) {
                await display.putstr_message('You are already wearing that!');
            } else {
                await display.putstr_message('That is a silly thing to put on.');
            }
            return { moved: false, tookTime: false };
        }
        return await putOnSelectedItem(player, display, game, selected);
    }
}

// cf. do_wear.c dotakeoff() — T command: take off a piece of armor
async function handleTakeOff(player, display, game = null) {
    const { armorCount, accessoryCount, lastArmor } = count_worn_stuff(player);
    if (!armorCount && !accessoryCount) {
        await display.putstr_message('Not wearing any armor or accessories.');
        return { moved: false, tookTime: false };
    }

    const wornAll = getWornArmorAndAccessoryItems(player);
    const suggested = new Set(getWornArmorItems(player));
    let item = null;

    if (armorCount === 1 && lastArmor) {
        item = lastArmor;
    } else {
        const takeOffChoices = wornAll.filter((a) => suggested.has(a)).map((a) => a.invlet).join('');
        const takeOffPrompt = takeOffChoices.length > 1
            ? `What do you want to take off? [${takeOffChoices} or ?*] `
            : 'What do you want to take off? [*] ';
        const wornLetters = wornAll.map((a) => a.invlet).join('');
        const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
        const showTakeOffHelpList = async () => {
            resetTopline(display);
            const lines = buildInventoryOverlayLines(player);
            return await renderOverlayMenuUntilDismiss(display, lines, wornLetters);
        };
        resetTopline(display);
        await display.putstr_message(takeOffPrompt);
        while (true) {
            const ch = await nhgetch();
            let c = String.fromCharCode(ch);

            if (isDismissKey(ch)) {
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            if (c === '?' || c === '*') {
                const menuSelection = await showTakeOffHelpList();
                if (menuSelection) {
                    c = menuSelection;
                } else {
                    resetTopline(display);
                    await display.putstr_message(takeOffPrompt);
                    continue;
                }
            }
            item = wornAll.find((a) => a.invlet === c);
            if (!item) {
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            break;
        }
    }

    return await removeArmorOrAccessory(player, display, game, item);
}

// cf. do_wear.c doremring() — R command: remove ring or amulet
async function handleRemove(player, display, game = null) {
    const { armorCount, accessoryCount, lastAccessory } = count_worn_stuff(player);
    if (!accessoryCount && !armorCount) {
        await display.putstr_message('Not wearing any accessories or armor.');
        return { moved: false, tookTime: false };
    }

    const wornAll = getWornArmorAndAccessoryItems(player);
    const suggested = new Set(getWornAccessoryItems(player));
    let item = null;

    if (accessoryCount === 1 && lastAccessory) {
        item = lastAccessory;
    } else {
        const removeChoices = wornAll.filter((a) => suggested.has(a)).map((a) => a.invlet).join('');
        const removePrompt = removeChoices.length > 1
            ? `What do you want to remove? [${removeChoices} or ?*] `
            : 'What do you want to remove? [*] ';
        const wornLetters = wornAll.map((a) => a.invlet).join('');
        const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
        const showRemoveHelpList = async () => {
            resetTopline(display);
            const lines = buildInventoryOverlayLines(player);
            return await renderOverlayMenuUntilDismiss(display, lines, wornLetters);
        };
        resetTopline(display);
        await display.putstr_message(removePrompt);
        while (true) {
            const ch = await nhgetch();
            let c = String.fromCharCode(ch);

            if (isDismissKey(ch)) {
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            if (c === '?' || c === '*') {
                const menuSelection = await showRemoveHelpList();
                if (menuSelection) {
                    c = menuSelection;
                } else {
                    resetTopline(display);
                    await display.putstr_message(removePrompt);
                    continue;
                }
            }
            item = wornAll.find((a) => a.invlet === c);
            if (!item) {
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
            break;
        }
    }

    return await removeArmorOrAccessory(player, display, game, item);
}

export { handleWear, handlePutOn, handleTakeOff, handleRemove, canwearobj, cursed_check, Boots_on, Boots_off, Cloak_on, Cloak_off, Helmet_on, Helmet_off, Gloves_on, Gloves_off, Shield_on, Shield_off, Shirt_on, Shirt_off, Amulet_on, Amulet_off, wielding_corpse, dragon_armor_handling, set_wear, donning, doffing, cancel_doff, cancel_don, stop_donning, glibr, some_armor, stuck_ring, count_worn_stuff, select_off, remarm_swapwep, menu_remarm, wornarm_destroyed, inaccessible_equipment, equip_ok, any_worn_armor_ok };

// C-name aliases for command handlers
export { handleWear as dowear, handlePutOn as doputon, handleTakeOff as dotakeoff };

// C ref: do_wear.c:1217 adjust_attrib() — adjust ABON for ring/amulet
export function adjust_attrib(obj, which, val, game, player) {
  const old_attrib = acurr(player, which);
  if (!player.abon || player.abon.length < 7) {
      player.abon = new Array(7).fill(0);
  }
  player.abon[which] = (player.abon[which] || 0) + val;
  const observable = (old_attrib !== acurr(player, which));
  if (observable || !extremeattr(player, which)) learnring(obj, observable);
  if (game.disp) game.disp.botl = true;
}

// Autotranslated from do_wear.c:1341
export async function Ring_off_or_gone(obj, gone, game, player) {
  let mask = (obj.owornmask & W_RING), observable;
  game.svc.context.takeoff.mask &= ~mask;
  if (!(player.uprops[objectData[obj.otyp].oc_oprop].extrinsic & mask)) impossible("Strange... I didn't know you had that ring.");
  if (gone) setnotworn(obj);
  else {
    setworn( 0, obj.owornmask);
  }
  switch (obj.otyp) {
    case RIN_TELEPORTATION:
      case RIN_REGENERATION:
        case RIN_SEARCHING:
          case RIN_HUNGER:
            case RIN_AGGRAVATE_MONSTER:
              case RIN_POISON_RESISTANCE:
                case RIN_FIRE_RESISTANCE:
                  case RIN_COLD_RESISTANCE:
                    case RIN_SHOCK_RESISTANCE:
                      case RIN_CONFLICT:
                        case RIN_TELEPORT_CONTROL:
                          case RIN_POLYMORPH:
                            case RIN_POLYMORPH_CONTROL:
                              case RIN_FREE_ACTION:
                                case RIN_SLOW_DIGESTION:
                                  case RIN_SUSTAIN_ABILITY:
                                    case MEAT_RING:
                                      break;
    case RIN_STEALTH:
      toggle_stealth(player, false);
    break;
    case RIN_WARNING:
      see_monsters(game?.map);
    break;
    case RIN_SEE_INVISIBLE:
      // C: if (!See_invisible) { set_mimic_blocking(); see_monsters(); }
      set_mimic_blocking(game?.map);
      see_monsters(game?.map);
      mark_vision_dirty();
    break;
    case RIN_INVISIBILITY:
      // C: checks Invis/BInvis/Blind; intrinsic system not fully wired
      if (!(player?.Blind)) {
        newsym(player.x, player.y);
      }
    break;
    case RIN_LEVITATION:
      // C: checks blocked-levitation via B() macro; not wired in JS
      await float_down(0, 0, player, game);
      if (!(player?.levitating)) learnring(obj, true);
    break;
    case RIN_GAIN_STRENGTH:
      adjust_attrib(obj, A_STR, -obj.spe, game, player);
    break;
    case RIN_GAIN_CONSTITUTION:
      adjust_attrib(obj, A_CON, -obj.spe, game, player);
    break;
    case RIN_ADORNMENT:
      adjust_attrib(obj, A_CHA, -obj.spe, game, player);
    break;
    case RIN_INCREASE_ACCURACY:
      player.uhitinc -= obj.spe;
    break;
    case RIN_INCREASE_DAMAGE:
      player.udaminc -= obj.spe;
    break;
    case RIN_PROTECTION:
      observable = (obj.spe !== 0);
    learnring(obj, observable);
    if (obj.spe) find_ac(player);
    break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
      // C: restartcham() — restart chameleon mimicking when protection removed
      // Player-level restartcham not ported; monster version is m_restartcham in mon.js
    break;
  }
}

// Autotranslated from do_wear.c:1449
export async function Ring_gone(obj, game, player) {
  await Ring_off_or_gone(obj, true, game, player);
}

// Autotranslated from do_wear.c:1868
export async function doremring() {
  let otmp = null;
  count_worn_stuff( otmp, true);
  if (!Naccessories && !Narmorpieces) { await pline("Not wearing any accessories or armor."); return ECMD_OK; }
  if (Naccessories !== 1 || ParanoidRemove || cmdq_peek(CQ_CANNED)) otmp = getobj("remove", remove_ok, GETOBJ_NOFLAGS);
  if (!otmp) return ECMD_CANCEL;
  return await armor_or_accessory_off(otmp);
}

// Autotranslated from do_wear.c:1887
export async function cursed(otmp, player) {
  if (!otmp) { impossible("cursed without otmp"); return 0; }
  if ((otmp === player.weapon) ? welded(otmp) :  otmp.cursed) {
    let use_plural = (is_boots(otmp) || is_gloves(otmp) || otmp.otyp === LENSES || otmp.quan > 1);
    if (Glib && otmp.bknown   && (player.gloves ? (otmp === player.weapon) : ((otmp.owornmask & (W_WEP | W_RING)) !== 0))) await pline("Despite your slippery %s, you can't.", fingers_or_gloves(true));
    else {
      await You("can't. %s cursed.", use_plural ? "They are" : "It is");
    }
    set_bknown(otmp, 1);
    return 1;
  }
  return 0;
}

// Autotranslated from do_wear.c:2005
export async function already_wearing(cc) {
  await You("are already wearing %s%c", cc, (cc === c_that_) ? '!' : '.');
}

// Autotranslated from do_wear.c:2011
export async function already_wearing2(cc1, cc2) {
  await You_cant("wear %s because you're wearing %s there already.", cc1, cc2);
}
