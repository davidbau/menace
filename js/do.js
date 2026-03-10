// do.js -- Miscellaneous player actions
// cf. do.c — dodrop, dodown, doup, flooreffects, goto_level, donull, dowipe

import { more, nhgetch_raw, nhgetch_wrap, ynFunction, getlin } from './input.js';
import { awaitInput } from './suspend.js';
import { COLNO, ROWNO, STAIRS,
         CORR, ROOM, AIR, A_DEX,
         IS_FURNITURE, IS_LAVA, IS_POOL, MAGIC_PORTAL, VIBRATING_SQUARE,
         I_SPECIAL, TIMEOUT, WOUNDED_LEGS,
         W_ARMOR, W_ACCESSORY, W_SADDLE, LOST_DROPPED } from './const.js';
import { rn1, rn2, rnd, c_d } from './rng.js';
import { deltrap, enexto, mklev, assign_level, resolveBranchDestinationForStair } from './dungeon.js';
import { depth as dungeonDepth } from './dungeon.js';
import { mon_arrive } from './dog.js';
import { initrack } from './monmove.js';
import { COIN_CLASS, RING_CLASS, POTION_CLASS,
         BOULDER, CORPSE, LOADSTONE, LEASH, CRYSKNIFE, WORM_TOOTH,
         MEAT_RING, MEATBALL, MEAT_STICK, ENORMOUS_MEATBALL,
         GLOB_OF_GREEN_SLIME, POT_OIL,
         RIN_ADORNMENT, RIN_GAIN_STRENGTH, RIN_GAIN_CONSTITUTION,
         RIN_INCREASE_ACCURACY, RIN_INCREASE_DAMAGE, RIN_PROTECTION,
         RIN_REGENERATION, RIN_SEARCHING, RIN_STEALTH,
         RIN_SUSTAIN_ABILITY, RIN_LEVITATION, RIN_HUNGER,
         RIN_AGGRAVATE_MONSTER, RIN_CONFLICT, RIN_WARNING,
         RIN_POISON_RESISTANCE, RIN_FIRE_RESISTANCE, RIN_COLD_RESISTANCE,
         RIN_SHOCK_RESISTANCE, RIN_FREE_ACTION, RIN_SLOW_DIGESTION,
         RIN_TELEPORTATION, RIN_TELEPORT_CONTROL,
         RIN_POLYMORPH, RIN_POLYMORPH_CONTROL,
         RIN_INVISIBILITY, RIN_SEE_INVISIBLE,
         RIN_PROTECTION_FROM_SHAPE_CHAN,
         objectData, CLASS_SYMBOLS } from './objects.js';
import { doname, xname, splitobj, set_bknown, set_corpsenm } from './mkobj.js';
import { placeFloorObject } from './invent.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { observeObject } from './o_init.js';
import { compactInvletPromptChars, buildInventoryOverlayLines, renderOverlayMenuUntilDismiss } from './invent.js';
import { pline, pline_The, You, Your, You_hear, You_see, You_feel, There, Norep } from './pline.js';
import { hcolor, hliquid, rndmonnam, Monnam } from './do_name.js';
import { an, makeplural } from './objnam.js';
import { body_part } from './polyself.js';
import { FACE, HAND, LEG, STOMACH } from './const.js';
import { IS_SINK, IS_ALTAR, AM_NONE, Align2amask, NON_PM } from './const.js';
import { newsym, mark_vision_dirty, vision_recalc } from './display.js';
import { digests, touch_petrifies, is_rider, is_reviver, throws_rocks, passes_walls, is_whirly } from './mondata.js';
import { mons, S_ZOMBIE, PM_DEATH, PM_PESTILENCE, PM_FAMINE,
         PM_GREEN_SLIME, PM_WRAITH, PM_NURSE, PM_TOURIST } from './monsters.js';
import { zombie_form } from './mon.js';
import { revive } from './zap.js';
import { cansee } from './vision.js';
import { canseemon } from './mondata.js';
import { movebubbles } from './mkmaze.js';
import { newuexp, pluslvl } from './exper.js';
import { setCurrentLevelStairs } from './stairs.js';
import { float_down } from './trap.js';
import { check_special_room, move_update } from './hack.js';
import { W_ART, W_ARTI } from './const.js';

// Translator-compat globals used by some C-emitted helper candidates.
const gd = {};
function encumber_msg(_player) {}
function Wounded_legs(player) { return !!(player?.woundedLegs); }
function EWounded_legs(player) { return Number(player?.eWoundedLegs || 0); }
function HWounded_legs(player) { return Number(player?.hWoundedLegs || 0); }
function strchr(s, ch) {
    if (s == null || ch == null) return null;
    const text = String(s);
    const needle = String(ch)[0] || '';
    const idx = text.indexOf(needle);
    return idx >= 0 ? text.slice(idx) : null;
}


// ============================================================
// Pickup message helpers (used by pickup dispatch in cmd.js)
// ============================================================

export function formatGoldPickupMessage(gold, player) {
    const count = gold?.quan || 1;
    const pieceText = (count === 1) ? 'a gold piece' : `${count} gold pieces`;
    const total = player?.gold || count;
    if (total !== count) {
        return `$ - ${pieceText} (${total} in total).`;
    }
    return `$ - ${pieceText}.`;
}

export function formatInventoryPickupMessage(pickedObj, inventoryObj, player) {
    const pickedCount = Number(pickedObj?.quan || 1);
    const total = Number(inventoryObj?.quan || pickedCount);
    const slot = String(inventoryObj?.invlet || pickedObj?.invlet || '?');
    let detail = doname(pickedObj, null);
    if (player?.quiver === inventoryObj) {
        detail += ' (at the ready)';
    }
    if (total > pickedCount) {
        detail += ` (${total} in total)`;
    }
    return `${slot} - ${detail}.`;
}


// ============================================================
// 1. Drop mechanics
// ============================================================

// cf. do.c canletgo() — check if object can be released (cursed ball etc)
// Returns true if object can be let go, false otherwise.
// word: the action verb ("drop", "throw", etc.); if empty, suppresses messages.
export async function canletgo(obj, word, player) {
    if (!obj) return false;
    const owornmask = obj.owornmask || 0;
    if (owornmask & (W_ARMOR | W_ACCESSORY)) {
        if (word)
            await Norep("You cannot %s %s you are wearing.", word, "something");
        return false;
    }
    if (obj === player.weapon && obj.welded) {
        if (word) {
            let hand = body_part(HAND, player);
            if (obj.bimanual)
                hand = makeplural(hand);
            await Norep("You cannot %s %s welded to your %s.", word, "something", hand);
        }
        return false;
    }
    if (obj.otyp === LOADSTONE && obj.cursed) {
        if (word) {
            await pline("For some reason, you cannot %s the stone%s!",
                  word, (obj.quan || 1) > 1 ? "s" : "");
        }
        set_bknown(obj, 1);
        return false;
    }
    if (obj.otyp === LEASH && obj.leashmon) {
        if (word)
            await pline_The("leash is tied around your %s.", body_part(HAND, player));
        return false;
    }
    if (owornmask & W_SADDLE) {
        if (word)
            await You("cannot %s %s you are sitting on.", word, "something");
        return false;
    }
    return true;
}

// makeplural imported from objnam.js (canonical C-faithful port)

// cf. do.c obj_no_longer_held() — cleanup when object leaves inventory.
// Things that must change when not held; recurse into containers.
// Called for both player and monster drops.
export function obj_no_longer_held(obj) {
    if (!obj) return;
    // Recurse into containers
    if (obj.cobj && Array.isArray(obj.cobj)) {
        for (const contents of obj.cobj) {
            obj_no_longer_held(contents);
        }
    }
    switch (obj.otyp) {
    case CRYSKNIFE:
        // Normal crysknife reverts to worm tooth when not held;
        // fixed crysknife has only 10% chance of reverting.
        if (!obj.oerodeproof || !rn2(10)) {
            obj.otyp = WORM_TOOTH;
            obj.oerodeproof = 0;
        }
        break;
    }
}

// cf. do.c better_not_try_to_drop_that() — warn about dropping
// corpses that could petrify the hero without glove protection.
// Returns true if the player decided NOT to drop it.
export function better_not_try_to_drop_that(otmp, player) {
    // In the full C code this checks for petrifying corpses without gloves.
    // Simplified: if dropping a cockatrice/chickatrice corpse without gloves,
    // we would warn. For now, return false (allow drop).
    if (otmp.otyp === CORPSE && touch_petrifies(mons[otmp.corpsenm])) {
        if (!player.gloves) {
            // Would prompt "Drop the cockatrice corpse without hand protection on?"
            // For now, allow it (the damage would happen via flooreffects or pickup)
            return false;
        }
    }
    return false;
}

// cf. do.c menudrop_split() — handle splitting a stack for partial drop
export async function menudrop_split(otmp, cnt, player, map) {
    if (cnt && cnt < (otmp.quan || 1)) {
        if (otmp.welded) {
            // don't split
        } else if (otmp.otyp === LOADSTONE && otmp.cursed) {
            // don't split, same kludge as C
        } else {
            otmp = splitobj(otmp, cnt);
        }
    }
    return await drop_single(otmp, player, map);
}

// cf. do.c drop() — drop a single object from inventory.
// Returns true if time was consumed.
async function drop_single(obj, player, map) {
    if (!obj) return false;
    if (!await canletgo(obj, "drop", player)) return false;
    if (obj.otyp === CORPSE && better_not_try_to_drop_that(obj, player))
        return false;

    if (obj === player.weapon) {
        if (obj.welded) return false;
        uwepgone(player);
    }
    if (obj === player.quiver) uqwepgone(player);
    if (obj === player.swapWeapon) uswapwepgone(player);

    if (player.uswallow) {
        // Barrier between you and the floor
        await You("drop %s into %s.", doname(obj, null),
            player.ustuck ? "the monster" : "the void");
    } else {
        const loc = map.at(player.x, player.y);
        if ((obj.oclass === RING_CLASS || obj.otyp === MEAT_RING)
            && loc && IS_SINK(loc.typ)) {
            player.removeFromInventory(obj);
            await dosinkring(obj, player, map);
            return true;
        }
        if (loc && IS_ALTAR(loc.typ)) {
            // Altar drop: don't print "You drop" — altar message instead
        } else {
            await You("drop %s.", doname(obj, null));
        }
    }
    // Remove from inventory and place
    player.removeFromInventory(obj);
    obj.how_lost = LOST_DROPPED;
    await dropx(obj, player, map);
    return true;
}

// cf. do.c dropx() — take dropped item out of inventory;
// may produce output (eg altar identification).
export async function dropx(obj, player, map) {
    if (!player.uswallow) {
        const loc = map.at(player.x, player.y);
        if (loc && IS_ALTAR(loc.typ))
            await doaltarobj(obj, player, map); // set bknown
    }
    await dropy(obj, player, map);
}

// cf. do.c dropy() — put dropped object at destination
// Autotranslated from do.c:800
export async function dropy(obj, player, map) {
    await dropz(obj, false, player, map);
}

// cf. do.c dropz() — really put dropped object at its destination
export async function dropz(obj, with_impact, player, map) {
    if (obj === player.weapon) uwepgone(player);
    if (obj === player.quiver) uqwepgone(player);
    if (obj === player.swapWeapon) uswapwepgone(player);

    if (player.uswallow) {
        // Hero has dropped an item while inside an engulfer.
        // In C, this adds to the engulfer's inventory or digests food.
        if (player.ustuck) {
            if (!await engulfer_digests_food(obj, player)) {
                // Would add to engulfer's inventory via mpickobj
                // For now, the object is consumed
            }
        }
    } else {
        if (await flooreffects(obj, player.x, player.y, "drop", player, map))
            return;
        // Place on floor
        obj.ox = player.x;
        obj.oy = player.y;
        placeFloorObject(map, obj);
        newsym(player.x, player.y);
    }
}

// cf. do.c engulfer_digests_food() — when swallowed, engulfer may
// eat dropped food items. Returns true if object is consumed.
export async function engulfer_digests_food(obj, player) {
    if (!player.ustuck) return false;
    const mptr = player.ustuck.type || player.ustuck.data;
    if (!mptr) return false;
    // Animal swallower (purple worm) eats corpses, globs, meat items
    if (digests(mptr)
        && (obj.otyp === CORPSE || obj.globby
            || obj.otyp === MEATBALL || obj.otyp === ENORMOUS_MEATBALL
            || obj.otyp === MEAT_RING || obj.otyp === MEAT_STICK)) {
        let could_petrify = false, could_grow = false, could_heal = false;
        if (obj.otyp === CORPSE) {
            could_petrify = touch_petrifies(mons[obj.corpsenm]);
            could_grow = (obj.corpsenm === PM_WRAITH);
            could_heal = (obj.corpsenm === PM_NURSE);
        }
        await pline("%s instantly digested!",
              (obj.quan || 1) > 1 ? `${doname(obj, null)} are` : `${doname(obj, null)} is`);
        // Effects on the engulfer would go here (petrify, polymorph, etc.)
        // Object is consumed
        return true;
    }
    return false;
}


// ============================================================
// 2. Floor effects
// ============================================================

// cf. do.c boulder_hits_pool() — boulder falls into pool/lava.
// Returns true if the boulder is consumed.
export async function boulder_hits_pool(otmp, rx, ry, pushing, player, map) {
    if (!otmp || otmp.otyp !== BOULDER) return false;
    const loc = map?.at?.(rx, ry);
    if (!loc) return false;
    if (!IS_POOL(loc.typ) && !IS_LAVA(loc.typ)) return false;

    const lava = IS_LAVA(loc.typ);
    const chance = rn2(10); // water: 90%; lava: 10%
    // Simplified fill-up chance: lava 10%, water 90%
    const fills_up = lava ? (chance === 0) : (chance !== 0);

    if (fills_up) {
        loc.typ = ROOM;
        loc.flags = 0;
        newsym(rx, ry);
        if (pushing) {
            await pline("You push %s into the %s.", xname(otmp),
                  lava ? "lava" : "water");
            if (!player.blind)
                await pline("Now you can cross it!");
        }
    }
    if (!fills_up || !pushing) {
        // Splashing
        if (pushing ? !player.blind : true) {
            await There("is a large splash as %s %s the %s.",
                  xname(otmp),
                  fills_up ? "fills" : "falls into",
                  lava ? "lava" : "water");
        } else if (!player.deaf) {
            await You_hear("a%s splash.", lava ? " sizzling" : "");
        }
    }
    // Boulder is now gone — remove from map objects if present
    if (typeof map?.removeObject === 'function') {
        map.removeObject(otmp);
    } else {
        const idx = map.objects?.indexOf(otmp);
        if (idx >= 0) map.objects.splice(idx, 1);
    }
    return true;
}

// cf. do.c flooreffects() — effects of object landing on floor.
// Returns true if the object goes away.
export async function flooreffects(obj, x, y, verb, player, map) {
    if (!obj) return false;

    if (obj.otyp === BOULDER && await boulder_hits_pool(obj, x, y, false, player, map)) {
        return true;
    }
    // Boulder into pit/hole — simplified: skip trap interactions for now
    // as trap system is not fully wired

    if (IS_LAVA(map?.at?.(x, y)?.typ)) {
        // lava_damage would destroy most objects
        // Simplified: object is destroyed
        return true;
    }
    if (IS_POOL(map?.at?.(x, y)?.typ)) {
        // water_damage
        // Simplified: some objects may be destroyed
        return false;
    }
    // Altar interaction when monster drops object
    const loc = map?.at?.(x, y);
    if (loc && IS_ALTAR(loc.typ)) {
        await doaltarobj(obj, player, map);
    }
    return false;
}


// ============================================================
// 3. Altar/sink/fountain interactions
// ============================================================

// cf. do.c doaltarobj() — drop object on altar (BUC identification)
export async function doaltarobj(obj, player, map) {
    if (player.blind) return;

    if (obj.oclass !== COIN_CLASS) {
        // KMH, conduct — atheism broken
    } else {
        // coins don't have bless/curse status
        obj.blessed = 0;
        obj.cursed = 0;
    }

    if (obj.blessed || obj.cursed) {
        await There("is %s flash as %s hit%s the altar.",
              obj.blessed ? "an amber" : "a black",
              doname(obj, null),
              (obj.quan || 1) > 1 ? "" : "s");
        if (!player.hallucinating)
            obj.bknown = 1;
    } else {
        await pline("%s land%s on the altar.",
              doname(obj, null),
              (obj.quan || 1) > 1 ? "" : "s");
        if (obj.oclass !== COIN_CLASS)
            obj.bknown = 1;
    }
}

// cf. do.c trycall() — prompt to name object class after identification.
// If obj is neither formally identified nor informally named, prompt to call it.
export function trycall(obj) {
    // In C this calls docall() to let player name the object type.
    // Simplified: just mark as observed for discovery tracking.
    if (obj && typeof observeObject === 'function') {
        observeObject(obj);
    }
}

// cf. do.c polymorph_sink() — transforms the sink at the player's position
// into a fountain, throne, altar or grave.
export async function polymorph_sink(player, map) {
    const loc = map.at(player.x, player.y);
    if (!loc || !IS_SINK(loc.typ)) return;

    const sinklooted = loc.looted ? 1 : 0;
    loc.flags = 0;
    const FOUNTAIN = 28, THRONE = 29, SINK = 30, GRAVE = 31, ALTAR = 32;
    switch (rn2(4)) {
    default:
    case 0:
        loc.typ = FOUNTAIN;
        loc.blessedftn = 0;
        if (sinklooted) loc.looted = 1;
        await pline_The("sink transforms into a fountain!");
        break;
    case 1:
        loc.typ = THRONE;
        if (sinklooted) loc.looted = 1;
        await pline_The("sink transforms into a throne!");
        break;
    case 2: {
        loc.typ = ALTAR;
        // C ref: do.c:431-438 — rn2(3)-1 for alignment, second rn2(3) in Gehennom
        const algn = rn2(3) - 1; // -1 (A_Cha) or 0 (A_Neu) or +1 (A_Law)
        const inhell = !!(map && map.flags && map.flags.inhell);
        loc.altarmask = (inhell && rn2(3)) ? AM_NONE : Align2amask(algn);
        await pline_The("sink transforms into an altar!");
        break;
    }
    case 3:
        loc.typ = ROOM;
        // Would call make_grave() here
        await pline_The("sink vanishes.");
        break;
    }
    newsym(player.x, player.y);
}

// cf. do.c teleport_sink() — teleport the sink at the player's position
// to a random location. Returns true if sink teleported.
function teleport_sink(player, map) {
    let trycnt = 0;
    const SINK = 30;
    do {
        const cx = 1 + rnd((COLNO - 1) - 2);  // 2..COLNO-2
        const cy = 1 + rn2(ROWNO - 2);         // 1..ROWNO-2
        const loc = map.at(cx, cy);
        if (loc && loc.typ === ROOM && !map.trapAt?.(cx, cy)) {
            const dist = (cx - player.x) * (cx - player.x) + (cy - player.y) * (cy - player.y);
            if (!cansee(map, player, null, cx, cy) || dist > 9) {
                const oldloc = map.at(player.x, player.y);
                const alreadylooted = oldloc.looted || 0;
                // Remove old sink
                oldloc.typ = ROOM;
                oldloc.looted = 0;
                newsym(player.x, player.y);
                // Create sink at new position
                loc.typ = SINK;
                loc.looted = alreadylooted ? 1 : 0;
                newsym(cx, cy);
                return true;
            }
        }
    } while (++trycnt < 200);
    return false;
}

// cf. do.c dosinkring() — drop ring into kitchen sink effects
export async function dosinkring(obj, player, map) {
    let ideed = true;
    let nosink = false;

    await You("drop %s down the drain.", doname(obj, null));
    obj.in_use = true; // block free identification via interrupt

    switch (obj.otyp) {
    // Effects that can be noticed without eyes
    case RIN_SEARCHING:
        await You("thought %s got lost in the sink, but there it is!", doname(obj, null));
        // Give back the ring
        obj.in_use = false;
        obj.ox = player.x;
        obj.oy = player.y;
        placeFloorObject(map, obj);
        trycall(obj);
        return;
    case RIN_SLOW_DIGESTION:
        await pline_The("ring is regurgitated!");
        obj.in_use = false;
        obj.ox = player.x;
        obj.oy = player.y;
        placeFloorObject(map, obj);
        trycall(obj);
        return;
    case RIN_LEVITATION:
        await pline_The("sink quivers upward for a moment.");
        break;
    case RIN_POISON_RESISTANCE:
        await You("smell rotten fruit.");
        break;
    case RIN_AGGRAVATE_MONSTER:
        await pline("Several %s buzz angrily around the sink.",
              player.hallucinating ? rndmonnam() + "s" : "flies");
        break;
    case RIN_SHOCK_RESISTANCE:
        await pline("Static electricity surrounds the sink.");
        break;
    case RIN_CONFLICT:
        await You_hear("loud noises coming from the drain.");
        break;
    case RIN_SUSTAIN_ABILITY:
        await pline_The("%s flow seems fixed.", hliquid("water"));
        break;
    case RIN_GAIN_STRENGTH:
        await pline_The("%s flow seems %ser now.",
                  hliquid("water"),
                  (obj.spe < 0) ? "weak" : "strong");
        break;
    case RIN_GAIN_CONSTITUTION:
        await pline_The("%s flow seems %ser now.",
                  hliquid("water"),
                  (obj.spe < 0) ? "less" : "great");
        break;
    case RIN_INCREASE_ACCURACY:
        await pline_The("%s flow %s the drain.",
                  hliquid("water"),
                  (obj.spe < 0) ? "misses" : "hits");
        break;
    case RIN_INCREASE_DAMAGE:
        await pline("The water's force seems %ser now.",
              (obj.spe < 0) ? "small" : "great");
        break;
    case RIN_HUNGER:
        ideed = false;
        // Would eat floor objects at the sink location
        break;
    case MEAT_RING:
        await pline("Several flies buzz around the sink.");
        break;
    case RIN_TELEPORTATION:
        nosink = teleport_sink(player, map);
        await pline_The("sink %svanishes.", nosink ? "" : "momentarily ");
        ideed = false;
        break;
    case RIN_POLYMORPH:
        await polymorph_sink(player, map);
        nosink = true;
        ideed = (map.at(player.x, player.y)?.typ !== ROOM);
        break;
    default:
        ideed = false;
        break;
    }
    if (!player.blind && !ideed) {
        ideed = true;
        switch (obj.otyp) {
        case RIN_ADORNMENT:
            await pline_The("faucets flash brightly for a moment.");
            break;
        case RIN_REGENERATION:
            await pline_The("sink looks as good as new.");
            break;
        case RIN_INVISIBILITY:
            await You("don't see anything happen to the sink.");
            break;
        case RIN_FREE_ACTION:
            await You_see("the ring slide right down the drain!");
            break;
        case RIN_SEE_INVISIBLE:
            await You_see("some %s in the sink.",
                    player.hallucinating ? "oxygen molecules" : "air");
            break;
        case RIN_STEALTH:
            await pline_The("sink seems to blend into the floor for a moment.");
            break;
        case RIN_FIRE_RESISTANCE:
            await pline_The("hot %s faucet flashes brightly for a moment.",
                      hliquid("water"));
            break;
        case RIN_COLD_RESISTANCE:
            await pline_The("cold %s faucet flashes brightly for a moment.",
                      hliquid("water"));
            break;
        case RIN_PROTECTION_FROM_SHAPE_CHAN:
            await pline_The("sink looks nothing like a fountain.");
            break;
        case RIN_PROTECTION:
            await pline_The("sink glows %s for a moment.",
                      hcolor((obj.spe < 0) ? "black" : "silver"));
            break;
        case RIN_WARNING:
            await pline_The("sink glows %s for a moment.", hcolor("white"));
            break;
        case RIN_TELEPORT_CONTROL:
            await pline_The("sink looks like it is being beamed aboard somewhere.");
            break;
        case RIN_POLYMORPH_CONTROL:
            await pline_The("sink momentarily looks like a regularly erupting geyser.");
            break;
        default:
            break;
        }
    }
    if (ideed) {
        trycall(obj);
    } else if (!nosink) {
        await You_hear("the ring bouncing down the drainpipe.");
    }
    if (!rn2(20) && !nosink) {
        await pline_The("sink backs up, leaving %s.", doname(obj, null));
        obj.in_use = false;
        obj.ox = player.x;
        obj.oy = player.y;
        placeFloorObject(map, obj);
    } else if (!rn2(5)) {
        // Bury the ring
        obj.in_use = false;
        obj.ox = player.x;
        obj.oy = player.y;
        obj.buried = true;
        // In C this calls add_to_buried(); simplified — just mark as buried
    } else {
        // Ring is consumed (useup)
        // Object is gone
    }
}


// Handle dropping an item (the interactive UI handler)
// C ref: do.c dodrop()
export async function handleDrop(player, map, display) {
    if (player.inventory.length === 0) {
        await display.putstr_message("You don't have anything to drop.");
        return { moved: false, tookTime: false };
    }

    const dropChoices = compactInvletPromptChars(player.inventory.map((o) => o.invlet).join(''));
    let countMode = false;
    let countDigits = '';
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const showToplineErrorWithMore = async (message, sourceTag) => {
        replacePromptMessage();
        await display.putstr_message(message);
        if (typeof display?.renderMoreMarker === 'function') {
            display.renderMoreMarker();
            if (typeof display?.markMorePending === 'function') {
                display.markMorePending({ source: sourceTag });
            }
        } else if (typeof display?.morePrompt === 'function') {
            await more(display, {
                site: 'do.handleDrop.moreBoundary',
            });
        }
    };
    while (true) {
        if (!display?._pendingMore) {
            replacePromptMessage();
        }
        if (countMode && countDigits.length > 1) {
            await display.putstr_message(`Count: ${countDigits}`);
        } else {
            const dropPrompt = `What do you want to drop? [${dropChoices} or ?*] `;
            await display.putstr_message(dropPrompt);
        }
        const ch = await awaitInput(null, nhgetch_wrap(), {
            site: 'do.handleDrop.select',
        });
        let c = String.fromCharCode(ch);
        if (ch === 22) { // Ctrl+V
            countMode = true;
            countDigits = '';
            continue;
        }
        if (countMode && c >= '0' && c <= '9') {
            countDigits += c;
            continue;
        }
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const invLines = buildInventoryOverlayLines(player);
            const selectionResult = await renderOverlayMenuUntilDismiss(
                display,
                invLines,
                dropChoices,
                { allowCountPrefix: true }
            );
            const selection = (selectionResult && typeof selectionResult === 'object')
                ? selectionResult.selection
                : selectionResult;
            const requestedCount = (selectionResult && typeof selectionResult === 'object')
                ? selectionResult.count
                : null;
            if (!selection) continue;
            c = selection;
            if (requestedCount && requestedCount > 0) {
                countMode = true;
                countDigits = String(requestedCount);
            }
        }

        const item = player.inventory.find(o => o.invlet === c);
        if (!item) {
            await showToplineErrorWithMore("You don't have that object.", 'do.drop-invalid-invlet');
            continue;
        }
        if (countMode && countDigits.length > 0) {
            const requestedCount = parseInt(countDigits, 10);
            const stackCount = Number(item.quan || 1);
            countMode = false;
            countDigits = '';
            if (Number.isFinite(requestedCount) && requestedCount > stackCount) {
                await showToplineErrorWithMore(
                    `You don't have that many!  You have only ${stackCount}.`,
                    'do.drop-too-many'
                );
                continue;
            }
        }
        return await dropSelectedItem(item, player, map, display);
    }
}

async function dropSelectedItem(item, player, map, display) {
    const isWornArmor =
        player.armor === item
        || player.shield === item
        || player.helmet === item
        || player.gloves === item
        || player.boots === item
        || player.cloak === item
        || player.amulet === item;
    if (isWornArmor) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        await display.putstr_message('You cannot drop something you are wearing.');
        return { moved: false, tookTime: false };
    }

    // Unequip weapon slots if dropping the item.
    if (player.weapon === item) uwepgone(player);
    if (player.swapWeapon === item) uswapwepgone(player);
    if (player.quiver === item) uqwepgone(player);

    player.removeFromInventory(item);
    item.how_lost = LOST_DROPPED;
    item.ox = player.x;
    item.oy = player.y;
    placeFloorObject(map, item);
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
    await display.putstr_message(`You drop ${doname(item, null)}.`);
    return { moved: false, tookTime: true };
}

async function showDropCandidates(candidates, display) {
    if (!Array.isArray(candidates) || candidates.length === 0) return;
    const forceMoreOnSingle = candidates.length === 1;
    for (let i = 0; i < candidates.length; i++) {
        const item = candidates[i];
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        const isLast = i === candidates.length - 1;
        const needsMore = forceMoreOnSingle || !isLast;
        const suffix = needsMore ? '.--More--' : '.';
        await display.putstr_message(`${item.invlet} - ${doname(item, null)}${suffix}`);
        if (needsMore) {
            if (typeof display.renderMoreMarker === 'function') {
                display.renderMoreMarker();
                display.markMorePending({ source: 'do.drop-candidates' });
            }
            await awaitInput(null, nhgetch_wrap(), {
                site: 'do.showDropCandidates.more',
            });
        }
    }
}

function dropClassLabel(sym) {
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

async function promptDropTypeClass(display, player) {
    const prompt = 'Drop what type of items?';
    const promptCol = 23;
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
    const classSet = new Set();
    for (const obj of inventory) {
        const sym = CLASS_SYMBOLS?.[obj?.oclass];
        if (typeof sym === 'string' && sym.length > 0) classSet.add(sym);
    }
    const order = [')', '[', '%', '(', '=', '"', '!', '?', '+', '/', '$', '*'];
    const typeEntries = [];
    for (const sym of order) {
        if (!classSet.has(sym)) continue;
        typeEntries.push(dropClassLabel(sym));
    }
    const hasKnownUncursed = inventory.some((obj) => obj?.bknown && !obj?.blessed && !obj?.cursed);
    const menuLastRow = 6 + typeEntries.length + (hasKnownUncursed ? 2 : 0);
    const restoreAfterPrompt = () => {
        const last = display?._lastMapState;
        if (last?.gameMap && typeof display?.renderMap === 'function') {
            display.renderMap(last.gameMap, last.player, last.fov, last.flags || display.flags || {});
            if (typeof display?.renderStatus === 'function') {
                display.renderStatus(last.player);
            }
            if (typeof display?.renderMessageWindow === 'function') {
                display.renderMessageWindow();
            }
            return;
        }
        if (typeof display?.setCell === 'function'
            && Number.isInteger(display?.cols)
            && Number.isInteger(display?.rows)) {
            const lastRow = Math.min(menuLastRow, display.rows - 1);
            for (let r = 0; r <= lastRow; r++) {
                for (let c = promptCol; c < display.cols; c++) {
                    display.setCell(c, r, ' ', 7, 0);
                }
            }
            return;
        }
        if (typeof display?.clearRow === 'function') {
            display.clearRow(0);
            display.clearRow(2);
            display.clearRow(3);
        }
    };
    if (typeof display?.clearRow === 'function') {
        display.clearRow(0);
        display.clearRow(2);
        display.clearRow(3);
    }
    if (typeof display?.setCell === 'function'
        && Number.isInteger(display?.cols)
        && Number.isInteger(display?.rows)) {
        const maxRow = Math.min(menuLastRow, display.rows - 1);
        for (let r = 4; r <= maxRow; r++) {
            for (let c = promptCol; c < display.cols; c++) {
                display.setCell(c, r, ' ', 7, 0);
            }
        }
    }
    const menuLines = new Map();
    const selected = new Set();
    const drawMenuChoice = (key, row, label) => {
        if (typeof display?.putstr !== 'function') return;
        const indicator = selected.has(key) ? '+' : '-';
        display.putstr(promptCol, row, `${key} ${indicator} ${label}`);
    };
    if (typeof display?.putstr === 'function') {
        display.putstr(promptCol, 0, prompt, undefined, 1);
        menuLines.set('A', { row: 2, label: 'Auto-select every relevant item' });
        drawMenuChoice('A', 2, 'Auto-select every relevant item');
        display.putstr(promptCol + 4, 3, '(ignored unless some other choices are also picked)');
        let row = 5;
        menuLines.set('a', { row, label: 'All types' });
        drawMenuChoice('a', row++, 'All types');
        let accel = 'b'.charCodeAt(0);
        for (const label of typeEntries) {
            const key = String.fromCharCode(accel++);
            menuLines.set(key, { row, label });
            drawMenuChoice(key, row++, label);
        }
        if (hasKnownUncursed) {
            row++;
            menuLines.set('U', { row, label: 'Items known to be Uncursed' });
            drawMenuChoice('U', row++, 'Items known to be Uncursed');
        }
        display.putstr(promptCol, row, '(end)');
        // C ref: process_text_window places cursor at end of "(end)" marker.
        // C's 1-based cursor yields column offx + strlen("(end)") + 1 (0-based).
        if (typeof display?.setCursor === 'function') {
            display.setCursor(promptCol + 5 + 1, row);
        }
    } else if (typeof display?.putstr_message === 'function') {
        await display.putstr_message(`${' '.repeat(promptCol)}${prompt}`);
    }
    let input = '';
    while (true) {
        const ch = await awaitInput(null, nhgetch_wrap(), {
            site: 'do.promptDropTypeClass.input',
        });
        if (ch === 10 || ch === 13 || ch === 32) {
            restoreAfterPrompt();
            return input;
        }
        if (ch === 27) {
            restoreAfterPrompt();
            return null;
        }
        if (ch === 8 || ch === 127) {
            if (input.length > 0) input = input.slice(0, -1);
            continue;
        }
        if (ch >= 32 && ch < 127) {
            const key = String.fromCharCode(ch);
            const menuLine = menuLines.get(key);
            if (menuLine) {
                if (selected.has(key)) selected.delete(key);
                else selected.add(key);
                drawMenuChoice(key, menuLine.row, menuLine.label);
            }
            input += key;
        }
    }
}

// C ref: do.c doddrop() — drop by class/category.
// Focused path used by parity sessions: class query + invlet selection.
export async function handleDropTypes(player, map, display) {
    if (!player?.inventory || player.inventory.length === 0) {
        await display.putstr_message("You don't have anything to drop.");
        return { moved: false, tookTime: false };
    }

    const cls = await promptDropTypeClass(display, player);
    if (cls == null) return { moved: false, tookTime: false };
    const trimmed = String(cls).trim();
    if (!trimmed) return { moved: false, tookTime: false };

    let candidates = [];
    if (trimmed.includes('u')) {
        candidates = player.inventory.filter((obj) => !!obj?.unpaid && !!obj?.invlet);
    }
    if (candidates.length === 0) {
        if (trimmed.includes('A')) {
            await display.putstr_message('No relevant items selected.');
        }
        return { moved: false, tookTime: false };
    }

    // C getobj-style letter selection for filtered inventory.
    const sel = await awaitInput(null, nhgetch_wrap(), {
        site: 'do.handleDropTypes.select',
    });
    if (sel === 27 || sel === 10 || sel === 13 || sel === 32) {
        return { moved: false, tookTime: false };
    }
    const invlet = String.fromCharCode(sel);
    const picked = candidates.find((o) => o.invlet === invlet);
    if (!picked) {
        await showDropCandidates(candidates, display);
        return { moved: false, tookTime: false };
    }
    return await dropSelectedItem(picked, player, map, display);
}


// ============================================================
// 4. Stair commands
// ============================================================

async function waitForStairMessageAck(display, player = null) {
    // C ref: do.c goto_level() message path:
    // preserve key-boundary behavior without forcing visible --More-- marker
    // or cursor relocation on the topline.
    if (!display?._moreBlockingEnabled) return;
    display.markMorePending({ source: 'do.stair-ack' });
    display._pendingMoreNoCursor = true;
    void player;
    return;
}

// cf. do.c u_stuck_cannot_go() — check if engulfed/grabbed preventing movement
export async function u_stuck_cannot_go(updn, player) {
    if (player.ustuck) {
        if (player.uswallow || !player.sticksToMonsters) {
            const mptr = player.ustuck.type || player.ustuck.data;
            await You("are %s, and cannot go %s.",
                !player.uswallow ? "being held"
                : (mptr && digests(mptr)) ? "swallowed"
                : "engulfed", updn);
            return true;
        } else {
            // Release the monster
            const mtmp = player.ustuck;
            player.ustuck = null;
            await You("release %s.", mtmp.name || "it");
        }
    }
    return false;
}

// Handle going downstairs
// C ref: do.c dodown()
export async function handleDownstairs(player, map, display, game) {
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== STAIRS || loc.flags !== 0) {
        await display.putstr_message("You can't go down here.");
        return { moved: false, tookTime: false };
    }

    // C ref: do.c goto_level() — clear travel destination cache on level change.
    if (game) {
        game.travelX = 0;
        game.travelY = 0;
    }

    // C ref: do.c goto_level() ordinary descent message when verbose.
    await display.putstr_message('You descend the stairs.');
    await waitForStairMessageAck(display, player);

    const currentDnum = Number.isInteger(game?.dnum)
        ? game.dnum
        : (Number.isInteger(map?._genDnum) ? map._genDnum : 0);
    if (loc.branchStair) {
        const branchDest = resolveBranchDestinationForStair(
            currentDnum,
            Number.isInteger(player?.dungeonLevel) ? player.dungeonLevel : 1,
            false
        );
        if (branchDest) {
            await game.changeLevel(branchDest.dlevel, 'down', { targetDnum: branchDest.dnum });
            return { moved: false, tookTime: true };
        }
    }

    // Go to next level
    const newDepth = player.dungeonLevel + 1;
    if (newDepth > player.maxDungeonLevel) {
        player.maxDungeonLevel = newDepth;
    }
    // Generate new level (changeLevel sets player.dungeonLevel)
    await game.changeLevel(newDepth, 'down');
    return { moved: false, tookTime: true };
}

// Handle going upstairs
// C ref: do.c doup()
export async function handleUpstairs(player, map, display, game) {
    const loc = map.at(player.x, player.y);
    if (!loc || loc.typ !== STAIRS || loc.flags !== 1) {
        await display.putstr_message("You can't go up here.");
        return { moved: false, tookTime: false };
    }

    if (player.dungeonLevel <= 1) {
        const ans = await ynFunction('Escape the dungeon?', 'yn', 'n'.charCodeAt(0), display);
        if (String.fromCharCode(ans) === 'y') {
            game.gameOver = true;
            game.gameOverReason = 'escaped';
            player.deathCause = 'escaped';
            await display.putstr_message('You escape the dungeon...');
        }
        return { moved: false, tookTime: false };
    }

    // C ref: do.c goto_level() — clear travel destination cache on level change.
    if (game) {
        game.travelX = 0;
        game.travelY = 0;
    }

    // C ref: do.c goto_level() ordinary ascent message when verbose.
    await display.putstr_message('You climb up the stairs.');
    await waitForStairMessageAck(display, player);

    const currentDnum = Number.isInteger(game?.dnum)
        ? game.dnum
        : (Number.isInteger(map?._genDnum) ? map._genDnum : 0);
    if (loc.branchStair) {
        const branchDest = resolveBranchDestinationForStair(
            currentDnum,
            Number.isInteger(player?.dungeonLevel) ? player.dungeonLevel : 1,
            true
        );
        if (branchDest) {
            await game.changeLevel(branchDest.dlevel, 'up', { targetDnum: branchDest.dnum });
            return { moved: false, tookTime: true };
        }
    }

    const newDepth = player.dungeonLevel - 1;
    await game.changeLevel(newDepth, 'up');
    return { moved: false, tookTime: true };
}


// ============================================================
// 5. Level transitions — C ref: do.c goto_level(), u_collide_m()
//    and dungeon.c u_on_rndspot(), mkmaze.c place_lregion()
// ============================================================

// cf. do.c schedule_goto() — schedule a deferred level change.
// In C this sets u.utotype and u.utolev for deferred_goto() to process
// at end of turn. In JS we store on the player object.
export function schedule_goto(player, tolev, utotype_flags, pre_msg, post_msg) {
    player.utotype = (utotype_flags || 0) | 0x80; // UTOTYPE_DEFERRED
    player.utolev = tolev;
    player.dfr_pre_msg = pre_msg || null;
    player.dfr_post_msg = post_msg || null;
}

// cf. do.c deferred_goto() — execute a scheduled level change.
// Called at end of turn if player.utotype is set.
export async function deferred_goto(player, game) {
    if (!player.utolev || !player.utotype) return;
    const dest = player.utolev;
    const typmask = Number(player.utotype) || 0;
    const fromDepth = Number(player.dungeonLevel) || 1;
    const fromDnum = Number.isInteger(game?.dnum)
        ? game.dnum
        : (Number.isInteger(game?.map?._genDnum) ? game.map._genDnum : 0);
    if (dest !== player.dungeonLevel) {
        if (player.dfr_pre_msg)
            await pline(player.dfr_pre_msg);
        // In C this calls goto_level(); in JS we use changeLevel()
        await game.changeLevel(dest, 'teleport');
        // C ref: do.c deferred_goto() prints dfr_post_msg after goto_level()
        // iff level actually changed. maybe_lvltport_feedback() can consume
        // this early for specific paths (for example Sting side effects).
        const toDnum = Number.isInteger(game?.dnum)
            ? game.dnum
            : (Number.isInteger(game?.map?._genDnum) ? game.map._genDnum : fromDnum);
        const levelChanged = (Number(player.dungeonLevel) !== fromDepth) || (toDnum !== fromDnum);
        if (player.dfr_post_msg && levelChanged) {
            await pline(player.dfr_post_msg);
        }
        // C ref: do.c goto_level(falling) damage uses d(max(dist,1),6) from
        // rnd.c (composite d() log entry).
        if (typmask & 0x02) {
            const dist = Math.max(1, Math.abs((Number(dest) || fromDepth) - fromDepth));
            const dmg = c_d(dist, 6);
            if (typeof player.takeDamage === 'function') {
                player.takeDamage(Math.max(0, dmg), 'falling down a mine shaft');
            } else {
                const hp = Number(player.uhp);
                if (Number.isFinite(hp)) player.uhp = Math.max(0, hp - Math.max(0, dmg));
            }
        }
    }
    // C ref: do.c goto_level() calls u_entered_or_left_rooms(TRUE) then
    // check_special_room(FALSE) before return. The newlev=TRUE call resets
    // urooms so the subsequent FALSE call detects all rooms as "entered".
    if (dest !== fromDepth) {
        const newMap = game?.map || game?.lev;
        move_update(true, player, newMap);
        await check_special_room(false, player, newMap, game?.display, game?.fov || null);
    }
    player.utotype = 0;
    player.dfr_pre_msg = null;
    player.dfr_post_msg = null;
}

// cf. do.c maybe_lvltport_feedback() — print level teleport arrival message
export async function maybe_lvltport_feedback(player) {
    if (player.dfr_post_msg
        && player.dfr_post_msg.startsWith("You materialize")) {
        await pline(player.dfr_post_msg);
        player.dfr_post_msg = null;
    }
}

// cf. do.c familiar_level_msg() — "You have a sense of deja vu" etc.
export async function familiar_level_msg(player) {
    const fam_msgs = [
        "You have a sense of deja vu.",
        "You feel like you've been here before.",
        "This place %s familiar...",
        null, // no message
    ];
    const halu_fam_msgs = [
        "Whoa!  Everything %s different.",
        "You are surrounded by twisty little passages, all alike.",
        "Gee, this %s like uncle Conan's place...",
        null, // no message
    ];
    const which = rn2(4);
    let mesg = player.hallucinating ? halu_fam_msgs[which] : fam_msgs[which];
    if (mesg && mesg.includes('%s')) {
        mesg = mesg.replace('%s', !player.blind ? "looks" : "seems");
    }
    if (mesg)
        await pline(mesg);
}

// cf. do.c hellish_smoke_mesg() — Gehennom smoke flavor messages.
// Also given if restoring a game in Gehennom.
export async function hellish_smoke_mesg(map, player) {
    const temperature = map?.flags?.temperature || 0;
    if (temperature)
        await pline("It is %s here.", temperature > 0 ? "hot" : "cold");
    if (temperature > 0)
        await You("%s smoke...", "sense");
}

// cf. do.c temperature_change_msg() — temperature change on level transition
export async function temperature_change_msg(prev_temperature, map, player) {
    const cur_temperature = map?.flags?.temperature || 0;
    if (prev_temperature !== cur_temperature) {
        if (cur_temperature)
            await hellish_smoke_mesg(map, player);
        else if (prev_temperature > 0)
            await pline_The("heat is gone.");
        else if (prev_temperature < 0)
            await You("are out of the cold.");
    }
}

// cf. do.c final_level() — handle arrival on the Astral Plane.
// Creates player-monsters and a guardian angel.
export function final_level(player, map) {
    // Reset monster hostility
    if (map.monsters) {
        for (const mon of map.monsters) {
            if (mon.dead) continue;
            mon.mpeaceful = false;
        }
    }
    // Create some player-monsters: rn1(4, 3) = 3..6
    const nplayers = rn1(4, 3);
    // Would call create_mplayers(nplayers, true) and gain_guardian_angel()
    // These subsystems are not yet fully wired in JS
}

// cf. do.c save_currentstate() — save current level state.
// In JS, level state is kept in memory (game.levels[]), so this is a no-op.
export function save_currentstate() {
    // No file I/O needed in JS — levels are cached in game.levels[]
}

// cf. do.c currentlevel_rewrite() — rewrite current level file.
// No-op in JS.
export function currentlevel_rewrite() {
    return true; // always succeeds in JS
}

// cf. do.c badspot() — check if landing spot is unsuitable.
// Commented out in C source; included for completeness.
export function badspot(map, x, y) {
    const loc = map?.at?.(x, y);
    if (!loc) return true;
    if (loc.typ !== ROOM && loc.typ !== AIR && loc.typ !== CORR) return true;
    if (map.monsterAt?.(x, y)) return true;
    return false;
}

// --- Teleport arrival placement (C ref: dungeon.c u_on_rndspot, mkmaze.c place_lregion) ---

function isTeleportArrivalBlocked(map, x, y) {
    if (map?.trapAt?.(x, y)) return true;
    const loc = map?.at?.(x, y);
    if (!loc) return true;
    if (IS_FURNITURE(loc.typ)) return true;
    if (IS_LAVA(loc.typ) || IS_POOL(loc.typ)) return true;
    const inv_pos = map.inv_pos || map._invPos;
    const isInvocationLevel = !!(map.is_invocation_lev || map._isInvocationLevel);
    if (isInvocationLevel && inv_pos
        && x === inv_pos.x && y === inv_pos.y) {
        return true;
    }
    return false;
}

function isValidTeleportArrivalCell(map, x, y) {
    if (isTeleportArrivalBlocked(map, x, y)) return false;
    const loc = map?.at?.(x, y);
    if (!loc) return false;
    return ((loc.typ === CORR && !!map?.flags?.is_maze_lev)
        || loc.typ === ROOM
        || loc.typ === AIR);
}

function withinBoundedArea(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

function normalizeRegion(region) {
    return {
        lx: Number.isFinite(region?.lx) ? region.lx : 0,
        ly: Number.isFinite(region?.ly) ? region.ly : 0,
        hx: Number.isFinite(region?.hx) ? region.hx : 0,
        hy: Number.isFinite(region?.hy) ? region.hy : 0,
        nlx: Number.isFinite(region?.nlx) ? region.nlx : 0,
        nly: Number.isFinite(region?.nly) ? region.nly : 0,
        nhx: Number.isFinite(region?.nhx) ? region.nhx : 0,
        nhy: Number.isFinite(region?.nhy) ? region.nhy : 0,
    };
}

// C ref: dungeon.c u_on_rndspot() + mkmaze.c place_lregion().
function getTeleportRegion(map, opts = {}) {
    const up = !!opts.up;
    const wasInWTower = !!opts.wasInWTower;
    if (wasInWTower && map?.dndest) {
        return normalizeRegion({
            lx: map.dndest.nlx,
            ly: map.dndest.nly,
            hx: map.dndest.nhx,
            hy: map.dndest.nhy,
            nlx: 0, nly: 0, nhx: 0, nhy: 0,
        });
    }
    return normalizeRegion(up ? map?.updest : map?.dndest);
}

// C ref: dungeon.c u_on_rndspot() -> mkmaze.c place_lregion().
function getTeleportArrivalPosition(map, opts = {}) {
    let { lx, ly, hx, hy, nlx, nly, nhx, nhy } = getTeleportRegion(map, opts);

    if (!lx) {
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }

    if (lx < 1) lx = 1;
    if (hx > COLNO - 1) hx = COLNO - 1;
    if (ly < 0) ly = 0;
    if (hy > ROWNO - 1) hy = ROWNO - 1;

    const oneshot = (lx === hx && ly === hy);

    const isBadLocation = (x, y) => {
        if (withinBoundedArea(x, y, nlx, nly, nhx, nhy)) return true;
        if (!isValidTeleportArrivalCell(map, x, y)) return true;
        return false;
    };

    const canPlaceAt = (x, y, force) => {
        let invalid = isBadLocation(x, y);
        if (invalid && !force) return false;
        if (invalid && force) {
            const trap = map?.trapAt?.(x, y);
            if (trap && trap.ttyp !== MAGIC_PORTAL && trap.ttyp !== VIBRATING_SQUARE) {
                deltrap(map, trap);
            }
            invalid = isBadLocation(x, y);
            if (invalid) return false;
        }
        const mon = map?.monsterAt?.(x, y);
        if (mon) return false;
        return true;
    };

    for (let i = 0; i < 200; i++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (canPlaceAt(x, y, oneshot)) {
            return { x, y };
        }
    }

    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            if (canPlaceAt(x, y, true)) {
                return { x, y };
            }
        }
    }

    return { x: 1, y: 1 };
}

// --- Hero arrival position (C ref: stairs.c u_on_upstairs/u_on_dnstairs, dungeon.c u_on_rndspot) ---

// Determine the hero arrival position on a level.
// transitionDir:
//   'down' -> arriving from above, place on upstair
//   'up'   -> arriving from below, place on downstairs
//   'teleport' -> random placement via place_lregion
//   null   -> normal non-teleport arrival behavior
export function getArrivalPosition(map, dungeonLevel, transitionDir = null) {
    if (transitionDir === 'teleport') {
        return getTeleportArrivalPosition(map, { up: false, wasInWTower: false });
    }

    const hasUpstair = !!(map?.upstair && map.upstair.x > 0 && map.upstair.y > 0);
    const hasDownstair = !!(map?.dnstair && map.dnstair.x > 0 && map.dnstair.y > 0);
    const hasUpdest = !!(map?.updest && Number.isFinite(map.updest.lx) && Number.isFinite(map.updest.ly));
    const hasDndest = !!(map?.dndest && Number.isFinite(map.dndest.lx) && Number.isFinite(map.dndest.ly));

    if (transitionDir === 'down' && hasUpdest) {
        return { x: map.updest.lx, y: map.updest.ly };
    }
    if (transitionDir === 'up' && hasDndest) {
        return { x: map.dndest.lx, y: map.dndest.ly };
    }

    if (transitionDir === 'down' && hasUpstair) {
        return { x: map.upstair.x, y: map.upstair.y };
    }
    if (transitionDir === 'up' && hasDownstair) {
        return { x: map.dnstair.x, y: map.dnstair.y };
    }

    // C-like default for normal arrival: upstairs when available.
    if (hasUpstair) {
        return { x: map.upstair.x, y: map.upstair.y };
    }
    if (hasDownstair) {
        return { x: map.dnstair.x, y: map.dnstair.y };
    }
    return getTeleportArrivalPosition(map, { up: false, wasInWTower: false });
}

// --- u_collide_m (C ref: do.c u_collide_m) ---

// Handle hero landing on a monster at arrival.
export function resolveArrivalCollision(game) {
    const mtmp = (game.lev || game.map)?.monsterAt?.((game.u || game.player).x, (game.u || game.player).y);
    if (!mtmp || mtmp === (game.u || game.player)?.usteed) return;

    const moveMonsterNearby = () => {
        const pos = enexto((game.u || game.player).x, (game.u || game.player).y, (game.lev || game.map));
        if (pos) {
            const _omx = mtmp.mx, _omy = mtmp.my;
            mtmp.mx = pos.x; mtmp.my = pos.y;
            newsym(_omx, _omy);
            newsym(pos.x, pos.y);
        }
    };

    if (!rn2(2)) {
        const cc = enexto((game.u || game.player).x, (game.u || game.player).y, (game.lev || game.map));
        if (cc && Math.abs(cc.x - (game.u || game.player).x) <= 1 && Math.abs(cc.y - (game.u || game.player).y) <= 1) {
            (game.u || game.player).x = cc.x;
            (game.u || game.player).y = cc.y;
        } else {
            moveMonsterNearby();
        }
    } else {
        moveMonsterNearby();
    }

    const still = (game.lev || game.map)?.monsterAt?.((game.u || game.player).x, (game.u || game.player).y);
    if (!still) return;
    const fallback = enexto((game.u || game.player).x, (game.u || game.player).y, (game.lev || game.map));
    if (fallback) { still.mx = fallback.x; still.my = fallback.y; }
    else { (game.lev || game.map).removeMonster(still); }
}

// --- goto_level core (C ref: do.c goto_level) ---

// Core level transition: cache old level, install new map, place hero,
// migrate followers, resolve collisions.
//
// game must provide: .map, .player, .levels
// opts.map: pre-generated map (e.g., wizloaddes)
// opts.makeLevel(depth): custom level generator (default: mklev(depth))
export async function changeLevel(game, depth, transitionDir = null, opts = {}) {
    const currentDnum = Number.isInteger(game.dnum)
        ? game.dnum
        : (Number.isInteger((game.lev || game.map)?._genDnum) ? (game.lev || game.map)._genDnum : 0);
    const levelKey = (dnum, dlev) => `${dnum}:${dlev}`;
    if (!game.levelsByBranch) game.levelsByBranch = {};

    const previousDepth = (game.u || game.player)?.dungeonLevel;
    const fromX = (game.u || game.player)?.x;
    const fromY = (game.u || game.player)?.y;

    // Cache current level
    if ((game.lev || game.map)) {
        game.levels[(game.u || game.player).dungeonLevel] = (game.lev || game.map);
        game.levelsByBranch[levelKey(currentDnum, (game.u || game.player).dungeonLevel)] = (game.lev || game.map);
    }
    const previousMap = game.levels[(game.u || game.player).dungeonLevel];
    const targetDnum = Number.isInteger(opts?.targetDnum)
        ? opts.targetDnum
        : (Number.isInteger(game.dnum) ? game.dnum : currentDnum);
    const branchCacheKey = levelKey(targetDnum, depth);

    // Use pre-generated map if provided, otherwise check cache or generate new.
    if (opts.map) {
        game.lev = opts.map;
        game.levels[depth] = opts.map;
        game.levelsByBranch[branchCacheKey] = opts.map;
    } else if (game.levelsByBranch[branchCacheKey]) {
        game.lev = game.levelsByBranch[branchCacheKey];
    } else if (targetDnum === currentDnum && game.levels[depth]) {
        game.lev = game.levels[depth];
    } else {
        game.lev = opts.makeLevel ? await opts.makeLevel(depth) : await mklev(depth);
        game.levels[depth] = (game.lev || game.map);
        game.levelsByBranch[branchCacheKey] = (game.lev || game.map);
    }

    if (Number.isInteger((game.lev || game.map)?._genDnum)) {
        game.dnum = (game.lev || game.map)._genDnum;
    }
    setCurrentLevelStairs(game.lev || game.map);

    (game.u || game.player).dungeonLevel = depth;
    (game.u || game.player).inTutorial = !!(game.lev || game.map)?.flags?.is_tutorial;

    // C ref: dungeon.c u_on_rndspot() / stairs.c u_on_upstairs()
    const pos = getArrivalPosition((game.lev || game.map), depth, transitionDir);
    (game.u || game.player).x = pos.x;
    (game.u || game.player).y = pos.y;

    // C ref: cmd.c goto_level() clears hero track history on level change.
    if (Number.isInteger(previousDepth) && depth !== previousDepth) {
        initrack();
    }

    // C ref: do.c goto_level() -> losedogs() -> mon_arrive()
    // Migrate followers from old level; resolve hero-monster collision.
    if (previousMap && previousMap !== (game.lev || game.map)) {
        mon_arrive(previousMap, (game.lev || game.map), (game.u || game.player), {
            sourceHeroX: fromX,
            sourceHeroY: fromY,
            heroX: (game.u || game.player).x,
            heroY: (game.u || game.player).y,
        });
        resolveArrivalCollision(game);
    }

    // C ref: do.c goto_level() — initial bubble/cloud move before vision refresh.
    if ((game.lev || game.map)?.flags?.is_waterlevel || (game.lev || game.map)?.flags?.is_airlevel) {
        if ((game.lev || game.map)?._water && (game.u || game.player)) {
            (game.lev || game.map)._water.heroPos = {
                x: (game.u || game.player).x,
                y: (game.u || game.player).y,
                dx: (game.u || game.player).dx || 0,
                dy: (game.u || game.player).dy || 0,
            };
            (game.lev || game.map)._water.onHeroMoved = (x, y) => {
                (game.u || game.player).x = x;
                (game.u || game.player).y = y;
                mark_vision_dirty(); // player position changed
            };
            (game.lev || game.map)._water.onVisionRecalc = () => {
                vision_recalc();
            };
        }
        await movebubbles((game.lev || game.map));
    }

    // C ref: do.c goto_level() — tourists gain depth-based XP on each
    // first entry to a new level, which can immediately trigger level-up.
    if (Number.isInteger(previousDepth) && depth !== previousDepth) {
        const player = (game.u || game.player);
        if (player?.roleMnum === PM_TOURIST) {
            const lev = {
                dnum: Number.isInteger(game.dnum) ? game.dnum : 0,
                dlevel: Number.isInteger(player.dungeonLevel) ? player.dungeonLevel : 1,
            };
            const exper = dungeonDepth(lev);
            player.uexp = (Number(player.uexp) || 0) + exper;
            player.urexp = (Number(player.urexp) || 0) + (4 * exper);
            if ((Number(player.urexp) || 0) >= 2000 && game?.flags) {
                game.flags.beginner = false;
            }
            if ((Number(player.ulevel) || 0) < 30
                && (Number(player.uexp) || 0) >= newuexp(Number(player.ulevel) || 0)) {
                await pluslvl(player, game?.display, true);
            }
        }
    }

}


// ============================================================
// 6. Corpse revival
// ============================================================

// cf. do.c revive_corpse() — revive a corpse into a monster.
// Returns true if we created a monster for the corpse. If successful,
// the corpse is gone.
export async function revive_corpse(corpse, player, map) {
    if (!corpse || corpse.otyp !== CORPSE) return false;

    const montype = corpse.corpsenm;
    const is_zomb = (mons[montype]?.mlet === S_ZOMBIE
                     || (corpse.buried && is_reviver(mons[montype])));
    const chewed = (corpse.oeaten || 0) !== 0;
    const where = corpse.where || 'floor';

    // Attempt to revive via zap.js revive()
    const mtmp = await revive(corpse, false, map, player);
    if (!mtmp) return false;

    // Give appropriate messages based on location
    if (where === 'invent') {
        await You_feel("squirming in your backpack!");
    } else if (where === 'floor' || !where) {
        const ptr = mtmp.data || mtmp.type;
        let effect = "";
        if (ptr === mons[PM_DEATH]) effect = " in a whirl of spectral skulls";
        else if (ptr === mons[PM_PESTILENCE]) effect = " in a churning pillar of flies";
        else if (ptr === mons[PM_FAMINE]) effect = " in a ring of withered crops";

        if (!player.blind) {
            const name = chewed ? `A bite-covered ${ptr?.mname || "monster"}`
                                : (ptr?.mname || "Something");
            await pline("%s rises from the dead%s!", name, effect);
        }
    }
    return true;
}

// cf. do.c revive_mon() — timeout callback to revive a corpse.
export async function revive_mon(body, player, map) {
    if (!body || body.otyp !== CORPSE) return;
    const mptr = mons[body.corpsenm];

    // Rider displacement logic (simplified)
    // If the corpse is on floor and a monster is at that spot,
    // try to move the monster away
    // (Full implementation would need get_obj_location, rloc, etc.)

    if (!await revive_corpse(body, player, map)) {
        // Revival failed; in C this would schedule ROT_CORPSE or retry for Riders
        if (is_rider(mptr) && rn2(99)) {
            // Rider usually tries again — would reschedule timer
        } else {
            // rot this corpse away — would start ROT_CORPSE timer
        }
    }
}

// cf. do.c zombify_mon() — timeout callback to revive corpse as zombie.
export async function zombify_mon(body, player, map) {
    if (!body || body.otyp !== CORPSE) return;
    const zmon = zombie_form(mons[body.corpsenm]);
    if (zmon !== NON_PM && zmon !== undefined) {
        // C ref: do.c zombify_mon() uses set_corpsenm(), which consumes
        // corpse timeout RNG and resets corpse timers before revive.
        set_corpsenm(body, zmon);
        await revive_mon(body, player, map);
    } else {
        // rot_corpse — would start rot timer
    }
}


// ============================================================
// 7. Null/wait/wipe
// ============================================================

// cf. do.c danger_uprops() — return true if hero properties are dangerous
// Autotranslated from do.c:2308
export function danger_uprops(player) {
    return !!(player.stoned || player.slimed || player.strangled || player.sick);
}

// cf. do.c cmd_safety_prevention() — prevent dangerous commands when
// monsters are nearby or hero has dangerous properties.
// Returns true if the command should be prevented.
export async function cmd_safety_prevention(ucverb, cmddesc, act, player) {
    if (player.safe_wait && !player.menu_requested) {
        if (player.monsterNearby) {
            await Norep("%s", act);
            return true;
        } else if (danger_uprops(player)) {
            await Norep("%s doesn't feel like a good idea right now.", ucverb);
            return true;
        }
    }
    return false;
}

// cf. do.c donull() — do nothing (wait/search command).
// '.' command: rest. Returns true if time was consumed.
export function donull(player) {
    // In C, this checks cmd_safety_prevention first.
    // Simplified: always succeeds (time passes).
    return true; // Do nothing, but let other things happen
}

// cf. do.c wipeoff() — continuation function for wiping face while blinded.
// Returns 1 if still busy, 0 if done.
export async function wipeoff(player) {
    let udelta = player.ucreamed || 0;
    let ldelta = player.blindedTimeout || 0;

    if (udelta > 4) udelta = 4;
    player.ucreamed = (player.ucreamed || 0) - udelta;

    if (ldelta > 4) ldelta = 4;
    if (player.blindedTimeout)
        player.blindedTimeout = Math.max(0, player.blindedTimeout - ldelta);

    if (!player.blindedTimeout) {
        await pline("You've got the glop off.");
        player.ucreamed = 0;
        return 0; // done
    } else if (!player.ucreamed) {
        await Your("%s feels clean now.", body_part(FACE, player));
        return 0; // done
    }
    return 1; // still busy
}

// cf. do.c dowipe() — the #wipe command: start wiping face.
// Returns true if time was consumed.
export async function dowipe(player) {
    if (player.ucreamed) {
        // Set occupation to wipeoff
        // In C, set_occupation(wipeoff, "wiping off your face", 0)
        // Simplified: do one wipe step
        await wipeoff(player);
        return true;
    }
    await Your("%s is already clean.", body_part(FACE, player));
    return true;
}


// ============================================================
// 8. Wounded legs
// ============================================================

// cf. do.c legs_in_no_shape() — common wounded legs feedback.
// for_what: "jumping", "kicking", "riding", etc.
// by_steed: true if the steed's legs are the issue.
// Autotranslated from do.c:2403
export async function legs_in_no_shape(for_what, by_steed, player) {
  const LEFT_SIDE = 0x20000, RIGHT_SIDE = 0x40000, BOTH_SIDES = 0x60000;
  if (by_steed && player.usteed) {
    await pline("%s is in_ no shape for %s.", Monnam(player.usteed), for_what);
  }
  else {
    let wl = EWounded_legs(player) & BOTH_SIDES, bp = body_part(LEG);
    if (wl === BOTH_SIDES) bp = makeplural(bp);
    await Your("%s%s %s in no shape for %s.", (wl === LEFT_SIDE) ? "left " : (wl === RIGHT_SIDE) ? "right " : "", bp, (wl === BOTH_SIDES) ? "are" : "is", for_what);
  }
}

// cf. do.c set_wounded_legs() — set wounded legs condition.
// side: LEFT_SIDE or RIGHT_SIDE or BOTH_SIDES
// timex: duration of the condition
export function set_wounded_legs(side, timex, player) {
    const BOTH_SIDES = 0x60000;

    if (!player.woundedLegs) {
        // First time getting wounded legs: reduce DEX
        if (player.atempDex !== undefined)
            player.atempDex--;
        else if (player.attributes)
            player.attributes[A_DEX] = (player.attributes[A_DEX] || 0) - 1;
    }

    if (!player.woundedLegs || (player.hWoundedLegs || 0) < timex)
        player.hWoundedLegs = timex;
    if (typeof player.ensureUProp === 'function') {
        const entry = player.ensureUProp(WOUNDED_LEGS);
        const oldTimeout = Number(entry?.intrinsic || 0) & TIMEOUT;
        if (oldTimeout < timex) {
            entry.intrinsic = ((Number(entry?.intrinsic || 0) & ~TIMEOUT) | (timex & TIMEOUT));
        }
    }
    player.eWoundedLegs = (player.eWoundedLegs || 0) | side;
    player.woundedLegs = true;
}

// cf. do.c heal_legs() — heal wounded legs.
// how: 0 = ordinary, 1 = dismounting steed, 2 = limbs turn to stone
export async function heal_legs(how, player) {
    const BOTH_SIDES = 0x60000;

    if (player.woundedLegs) {
        // Restore DEX
        if (player.atempDex !== undefined && player.atempDex < 0)
            player.atempDex++;
        else if (player.attributes) {
            player.attributes[A_DEX] = (player.attributes[A_DEX] || 0) + 1;
        }

        if (!player.usteed && how !== 2) {
            const wl = (player.eWoundedLegs || 0) & BOTH_SIDES;
            let legs = body_part(LEG, player);
            if (wl === BOTH_SIDES)
                legs = makeplural(legs);
            await Your("%s %s better.", legs, (wl === BOTH_SIDES) ? "feel" : "feels");
        }

        player.hWoundedLegs = 0;
        player.eWoundedLegs = 0;
        player.woundedLegs = false;
        if (typeof player.ensureUProp === 'function') {
            const entry = player.ensureUProp(WOUNDED_LEGS);
            entry.intrinsic = Number(entry?.intrinsic || 0) & ~TIMEOUT;
        }
    }
}

// Autotranslated from do.c:28
export async function dodrop(player) {
  let result;
  if ( player.ushops) sellobj_state(SELL_DELIBERATE);
  result = await drop(getobj("drop", any_obj_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT));
  if ( player.ushops) sellobj_state(SELL_NORMAL);
  if (result) reset_occupations();
  return result;
}

// Autotranslated from do.c:713
export async function drop(obj, game, map, player) {
  if (!obj) return ECMD_FAIL;
  if (!await canletgo(obj, "drop")) return ECMD_FAIL;
  if (obj.otyp === CORPSE && better_not_try_to_drop_that(obj)) return ECMD_FAIL;
  if (obj === player.weapon) {
    if (welded(player.weapon)) { await weldmsg(obj); return ECMD_FAIL; }
    setuwep( 0);
  }
  if (obj === player.quiver) { setuqwep( 0); }
  if (obj === player.swapWeapon) { setuswapwep( 0); }
  if (player.uswallow) {
    if (game.flags.verbose) {
      let onam_p, mnam_p;
      mnam_p = mon_nam(player.ustuck);
      if (digests(player.ustuck.data)) {
        mnam_p = `${s_suffix(mnam_p)} ${mbodypart(player.ustuck, STOMACH)}`;
      }
      onam_p = is_unpaid(obj) ? yobjnam(obj,  0) : doname(obj);
      await You("drop %s into %s.", onam_p, mnam_p);
    }
  }
  else {
    if ((obj.oclass === RING_CLASS || obj.otyp === MEAT_RING) && IS_SINK(map.locations[player.x][player.y].typ)) { await dosinkring(obj); return ECMD_TIME; }
    if (!can_reach_floor(true)) {
      let levhack = finesse_ahriman(obj);
      // TODO: if (levhack) E(Levitation) = W_ART — autotranslation stub
      if (game.flags.verbose) await You("drop %s.", doname(obj));
      freeinv(obj);
      await hitfloor(obj, true);
      if (levhack) await float_down(I_SPECIAL | TIMEOUT, W_ARTI | W_ART, player, game);
      return ECMD_TIME;
    }
    if (!IS_ALTAR(map.locations[player.x][player.y].typ) && game.flags.verbose) await You("drop %s.", doname(obj));
  }
  obj.how_lost = LOST_DROPPED;
  await dropx(obj);
  return ECMD_TIME;
}
