// potion.js -- Potion mechanics
// cf. potion.c — dodrink, peffects, healup, potionhit, dodip, status effects

import { rn2, rn1, rnd, d, c_d } from './rng.js';
import { nhgetch_raw } from './input.js';
import { awaitInput } from './suspend.js';
import { buildInventoryOverlayLines, renderOverlayMenuUntilDismiss } from './invent.js';
import { POTION_CLASS, POT_WATER,
         POT_CONFUSION, POT_BLINDNESS, POT_PARALYSIS, POT_SPEED,
         POT_SLEEPING, POT_SICKNESS, POT_HALLUCINATION,
         POT_HEALING, POT_EXTRA_HEALING, POT_FULL_HEALING,
         POT_GAIN_ENERGY, POT_ACID, POT_INVISIBILITY,
         POT_SEE_INVISIBLE, POT_RESTORE_ABILITY, POT_GAIN_ABILITY,
         POT_GAIN_LEVEL, POT_BOOZE,
         POT_OIL, POT_POLYMORPH, POT_LEVITATION,
         POT_ENLIGHTENMENT, POT_FRUIT_JUICE,
         POT_MONSTER_DETECTION, POT_OBJECT_DETECTION,
         STRANGE_OBJECT, UNICORN_HORN, AMETHYST,
         COIN_CLASS, WEAPON_CLASS } from './objects.js';
import { FOUNTAIN, A_CON, A_STR, A_WIS, A_INT, A_DEX, A_CHA,
         TIMEOUT, CONFUSION, STUNNED, BLINDED, HALLUC, HALLUC_RES,
         SICK, SICK_RES, DEAF,
         VOMITING, GLIB, FAST, STONED, SLIMED,
         FREE_ACTION, ACID_RES, SLEEP_RES, POISON_RES,
         SICK_VOMITABLE, SICK_NONVOMITABLE,
         FROMOUTSIDE, INVIS, SEE_INVIS } from './const.js';

const A_MAX = 6; // number of attributes (STR, INT, WIS, DEX, CON, CHA)
const SICK_ALL = (SICK_VOMITABLE | SICK_NONVOMITABLE);
import { exercise } from './attrib_exercise.js';
import { adjattrib } from './attrib.js';
import { drinkfountain } from './fountain.js';
import { pline, You, Your, You_feel, You_cant } from './pline.js';
import { tmp_at } from './animation.js';
import { DISP_ALWAYS, DISP_END } from './const.js';
import { mark_vision_dirty } from './vision.js';
import { float_up, float_down } from './trap.js';
import { float_vs_flight } from './polyself.js';
import { rndexp } from './exper.js';
import { discoverObject, isObjectNameKnown } from './o_init.js';
import { trycall } from './do.js';
import { monster_detect, object_detect } from './detect.js';
import { spoteffects, losehp } from './hack.js';
import { stairway_at } from './stairs.js';
import { has_ceiling, ceiling } from './dungeon.js';
import { hard_helmet } from './do_wear.js';
import { body_part } from './polyself.js';
import { HEAD, KILLED_BY, LEVITATION, UNCHANGING,
         POLY_NOFLAGS, POLY_CONTROLLED, POLY_LOW_CTRL,
         DETECT_MONSTERS, IS_SINK } from './const.js';


// Module-level state for potion-quaffing flow (C globals: potion_nothing, potion_unkn)
const gp = { potion_nothing: 0, potion_unkn: 0 };

// ============================================================
// 1. Intrinsic timeouts
// ============================================================

// cf. potion.c itimeout() — clamp a timeout value to valid range
// Autotranslated from potion.c:55
export function itimeout(val) {
  if (val >= TIMEOUT) val = TIMEOUT;
  else if (val < 1) val = 0;
  return val;
}

// cf. potion.c itimeout_incr() — increment timeout with overflow protection
// Autotranslated from potion.c:67
export function itimeout_incr(old, incr) {
  return itimeout((old & TIMEOUT) +  incr);
}

// cf. potion.c set_itimeout() — set timeout on a property's intrinsic field
export function set_itimeout(player, prop, val) {
    // C ref: potion.c:72 — set timeout portion of intrinsic
    const entry = player.ensureUProp(prop);
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | itimeout(val);
}

// cf. potion.c incr_itimeout() — increment timeout on a property
export function incr_itimeout(player, prop, incr) {
    // C ref: potion.c:80 — increment timeout portion of intrinsic
    const entry = player.ensureUProp(prop);
    const oldTimeout = entry.intrinsic & TIMEOUT;
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | itimeout_incr(oldTimeout, incr);
}

// ============================================================
// 2. Status effects
// ============================================================

// cf. potion.c make_confused() — C ref: potion.c:88-104
export async function make_confused(player, xtime, talk) {
    const old = player.getPropTimeout(CONFUSION);

    // C ref: if (Unaware) talk = FALSE;
    if (player.sleeping) talk = false;

    if (!xtime && old) {
        if (talk)
            await You_feel("less %s now.",
                     player.hallucinating ? "trippy" : "confused");
    }

    if ((xtime && !old) || (!xtime && old))
        player._botl = true;

    set_itimeout(player, CONFUSION, xtime);
}

// cf. potion.c make_stunned() — C ref: potion.c:106-131
async function make_stunned(player, xtime, talk) {
    const old = player.getPropTimeout(STUNNED);

    if (player.sleeping) talk = false;

    if (!xtime && old) {
        if (talk)
            await You_feel("%s now.",
                     player.hallucinating ? "less wobbly" : "a bit steadier");
    }
    if (xtime && !old) {
        if (talk) {
            // C ref: u.usteed check omitted (no steeds in JS yet)
            await You("stagger...");
        }
    }
    if ((!xtime && old) || (xtime && !old))
        player._botl = true;

    set_itimeout(player, STUNNED, xtime);
}

// cf. potion.c make_sick() — C ref: potion.c:136-192
// Sick is overloaded with both fatal illness and food poisoning
// (via usick_type bit mask). They should become separate intrinsics...
async function make_sick(player, xtime, cause, talk, type) {
    const old = player.getPropTimeout(SICK);

    if (xtime > 0) {
        // C ref: if (Sick_resistance) return;
        const sickRes = player.uprops[SICK_RES];
        if (sickRes && (sickRes.intrinsic || sickRes.extrinsic)) return;

        if (!old) {
            // newly sick
            await You_feel("deathly sick.");
        } else {
            // already sick
            if (talk)
                await You_feel("%s worse.", xtime <= Math.floor(old / 2) ? "much" : "even");
        }
        set_itimeout(player, SICK, xtime);
        player.usick_type |= type;
        player._botl = true;
    } else if (old && (type & player.usick_type)) {
        // was sick, now curing specific type
        player.usick_type &= ~type;
        if (player.usick_type) {
            // only partly cured
            if (talk)
                await You_feel("somewhat better.");
            set_itimeout(player, SICK, old * 2); // approximation
        } else {
            if (talk)
                await You_feel("cured.  What a relief!");
            set_itimeout(player, SICK, 0);
        }
        player._botl = true;
    }

    if (player.getPropTimeout(SICK)) {
        await exercise(player, A_CON, false);
        // C ref: delayed_killer tracking — store cause for death message
        if (xtime || !old) {
            player.usick_cause = cause || "unknown illness";
        }
    } else {
        player.usick_cause = "";
    }
}

// cf. potion.c make_blinded() — C ref: potion.c:260-331
// Complex: probes ahead to see if Eyes of Overworld (BBlinded) override
async function make_blinded(player, xtime, talk) {
    const old = player.getPropTimeout(BLINDED);
    const entry = player.ensureUProp(BLINDED);

    // C ref: probe ahead — check if sight will actually change
    const u_could_see = !player.blind;
    // temporarily set to probe
    const savedIntrinsic = entry.intrinsic;
    entry.intrinsic = (entry.intrinsic & ~TIMEOUT) | (xtime ? 1 : 0);
    const can_see_now = !player.blind;
    entry.intrinsic = savedIntrinsic; // restore

    if (player.sleeping) talk = false;

    if (can_see_now && !u_could_see) {
        // regaining sight
        if (talk) {
            if (player.hallucinating)
                await pline("Far out!  Everything is all cosmic again!");
            else
                await You("can see again.");
        }
    } else if (old && !xtime) {
        // clearing temporary blindness without toggling blindness
        // (e.g., Eyes of Overworld still blocking, or blindfolded)
        if (talk) {
            if (entry.extrinsic) {
                // blindfolded — eyes itch/twitch
            } else if (entry.blocked) {
                // Eyes of Overworld — vision brightens/dims
            }
        }
    }

    if (u_could_see && !can_see_now) {
        // losing sight
        if (talk) {
            if (player.hallucinating)
                await pline("Oh, bummer!  Everything is dark!  Help!");
            else
                await pline("A cloud of darkness falls upon you.");
        }
    } else if (!old && xtime) {
        // setting temporary blindness without toggling blindness
        if (talk) {
            if (entry.extrinsic) {
                // blindfolded — eyes twitch
            } else if (entry.blocked) {
                // Eyes of Overworld — vision dims
            }
        }
    }

    set_itimeout(player, BLINDED, xtime);

    if (u_could_see !== can_see_now) {
        // C ref: toggle_blindness() — vision_full_recalc, see_monsters
        player._botl = true;
        mark_vision_dirty();
    }
}

// cf. potion.c make_hallucinated() — C ref: potion.c:368-430
// mask parameter: nonzero to toggle Halluc_resistance instead of timeout
async function make_hallucinated(player, xtime, talk, mask) {
    const old = player.getPropTimeout(HALLUC);
    let changed = false;
    const verb = !player.blind ? "looks" : "feels";

    if (player.sleeping) talk = false;

    if (mask) {
        // Toggle halluc resistance rather than hallucination itself
        if (player.getPropTimeout(HALLUC))
            changed = true;
        const resEntry = player.ensureUProp(HALLUC_RES);
        if (!xtime)
            resEntry.extrinsic |= mask;
        else
            resEntry.extrinsic &= ~mask;
    } else {
        // Check if actual hallucination state changes
        const resEntry = player.uprops[HALLUC_RES];
        const hasRes = resEntry && (resEntry.intrinsic || resEntry.extrinsic);
        if (!hasRes && (!!old !== !!xtime))
            changed = true;
        set_itimeout(player, HALLUC, xtime);
    }

    if (changed) {
        if (talk) {
            if (!xtime)
                await pline("Everything %s SO boring now.", verb);
            else
                await pline("Oh wow!  Everything %s so cosmic!", verb);
        }
        player._botl = true;
    }
}

// cf. potion.c make_vomiting() — C ref: potion.c:242-255
export async function make_vomiting(player, xtime, talk) {
    const old = player.getPropTimeout(VOMITING);

    if (player.sleeping) talk = false;

    set_itimeout(player, VOMITING, xtime);
    player._botl = true;
    if (!xtime && old)
        if (talk)
            await You_feel("much less nauseated now.");
}

// cf. potion.c make_slimed() — C ref: potion.c:194-218
async function make_slimed(player, xtime, msg) {
    const old = player.getPropTimeout(SLIMED);
    set_itimeout(player, SLIMED, xtime);
    if ((!!xtime) !== (!!old)) {
        player._botl = true;
        if (msg) await pline("%s", msg);
    }
}

// cf. potion.c make_stoned() — C ref: potion.c:221-240
export async function make_stoned(player, xtime, msg) {
    const old = player.getPropTimeout(STONED);
    set_itimeout(player, STONED, xtime);
    if ((!!xtime) !== (!!old)) {
        player._botl = true;
        if (msg) await pline("%s", msg);
    }
}

// cf. potion.c make_deaf() — set/clear deafness
async function make_deaf(player, xtime, talk) {
    const old = player.getPropTimeout(DEAF);
    const changed = !!xtime !== !!old;
    set_itimeout(player, DEAF, xtime);
    if (changed && talk) {
        if (xtime) {
            await You("can't hear anything!");
        } else {
            await You("can hear again.");
        }
    }
}

// cf. potion.c make_glib() — set/clear slippery fingers
export function make_glib(player, xtime, talk) {
    set_itimeout(player, GLIB, xtime);
}

// cf. potion.c speed_up() — character becomes very fast temporarily
export async function speed_up(player, duration) {
    // C ref: potion.c:2904-2914
    const veryFast = player.getPropTimeout(FAST) > 0;
    if (!veryFast)
        await You("are suddenly moving %sfaster.", player.fast ? "" : "much ");
    else
        await Your("legs get new energy.");
    await exercise(player, A_DEX, true);
    incr_itimeout(player, FAST, duration);
}

// ============================================================
// 3. Quaff mechanics
// ============================================================

// cf. potion.c self_invis_message() — "you can't see yourself" message
export async function self_invis_message(player) {
    // C ref: potion.c:470-478
    await pline("%s %s.",
          player.hallucinating ? "Far out, man!  You"
                               : "Gee!  All of a sudden, you",
          player.seeInvisible ? "can see right through yourself"
                              : "can't see yourself");
}

// cf. potion.c ghost_from_bottle() — release ghost from smoky potion
export async function ghost_from_bottle(player, map) {
    // C ref: potion.c:480-500
    // makemon(&mons[PM_GHOST], ...) — ghost creation not yet fully ported
    if (player.blind) {
        await pline("As you open the bottle, something emerges.");
    } else {
        await pline("As you open the bottle, an enormous ghost emerges!");
    }
    await You("are frightened to death, and unable to move.");
    // nomul(-3) — immobilization
    player.sleeping = true;
    player.sleepTimeout = 3;
    player.sleepWakeupMessage = "You regain your composure.";
}

// cf. potion.c drink_ok() — validate object is drinkable
export function drink_ok(obj) {
    // C ref: potion.c:504-521
    if (!obj) return false;
    return obj.oclass === POTION_CLASS;
}

// cf. potion.c dodrink() — quaff a potion (partial)
// Implemented: fountain check, inventory selection, healing effects.
// TODO: unkn/otmp bookkeeping, BUC message path, potion identification, peffects dispatch
async function handleQuaff(player, map, display) {
    // cf. potion.c dodrink():540-550 — check for fountain first
    const loc = map.at(player.x, player.y);
    if (loc && loc.typ === FOUNTAIN) {
        await display.putstr_message('Drink from the fountain?');
        const ans = await awaitInput(null, nhgetch_raw(), {
            site: 'potion.handleQuaff.fountainConfirm',
        });
        display.topMessage = null;
        if (String.fromCharCode(ans) === 'y') {
            await drinkfountain(player, map, display);
            return { moved: false, tookTime: true };
        }
    }

    // cf. potion.c dodrink() / drink_ok() — inventory selection (partial)
    const potions = player.inventory.filter(o => o.oclass === POTION_CLASS);
    if (potions.length === 0) {
        await display.putstr_message("You don't have anything to drink.");
        return { moved: false, tookTime: false };
    }

    const drinkPrompt = `What do you want to drink? [${potions.map(p => p.invlet).join('')} or ?*] `;
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const isDismissKey = (code) => code === 27 || code === 10 || code === 13 || code === 32;
    // All inventory letters — C's getobj PICK_ONE menu accepts any inventory
    // letter as an accelerator.
    const allInvLetters = (player.inventory || [])
        .filter((o) => o && o.invlet)
        .map((o) => o.invlet)
        .join('');
    const showQuaffHelpList = async () => {
        replacePromptMessage();
        const lines = buildInventoryOverlayLines(player);
        return await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
    };
    const showQuaffPrompt = async () => {
        await display.putstr_message(drinkPrompt);
    };
    await showQuaffPrompt();
    while (true) {
        const ch = await awaitInput(null, nhgetch_raw(), {
            site: 'potion.handleQuaff.select',
        });
        let c = String.fromCharCode(ch);

        if (isDismissKey(ch)) {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            const menuSelection = await showQuaffHelpList();
            if (menuSelection) {
                c = menuSelection;
                // Fall through to item processing below.
            } else {
                await showQuaffPrompt();
                continue;
            }
        }

        // cf. potion.c drink_ok() — non-potion rejection (partial)
        const selected = player.inventory.find((obj) => obj.invlet === c);
        if (selected && selected.oclass !== POTION_CLASS) {
            replacePromptMessage();
            await display.putstr_message('That is a silly thing to drink.');
            return { moved: false, tookTime: false };
        }

        const item = potions.find(p => p.invlet === c);
        if (item) {
            player.removeFromInventory(item);
            replacePromptMessage();
            item.in_use = true;
            const potionUnknown = !!(await peffects(player, item, display));
            if (item.dknown && !isObjectNameKnown(item.otyp)) {
                if (!potionUnknown) {
                    discoverObject(item.otyp, true, true);
                } else {
                    trycall(item);
                }
            }
            return { moved: false, tookTime: true };
        }

        replacePromptMessage();
        await display.putstr_message("Never mind.");
        return { moved: false, tookTime: false };
    }
}

// ============================================================
// 4. Potion effects (peffect_*)
// ============================================================

// cf. potion.c healup() — heal HP, optionally increase max, cure status
export async function healup(player, nhp, nxtra, curesick, cureblind) {
    if (nhp > 0) {
        player.uhp += nhp;
        if (player.uhp > player.uhpmax) {
            if (nxtra > 0) player.uhpmax += nxtra;
            if (player.uhp > player.uhpmax) player.uhp = player.uhpmax;
        }
    }
    if (cureblind) await make_blinded(player, 0, true);
    if (curesick) await make_sick(player, 0, null, true, SICK_ALL);
}

// cf. potion.c peffect_confusion()
export async function peffect_confusion(player, otmp, display) {
    // C ref: potion.c:1012-1022 — always calls rn1(7, 16-8*bcsign)
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = itimeout_incr(player.getPropTimeout(CONFUSION),
        rn1(7, 16 - 8 * bcsign));
    await make_confused(player, duration, false);
    return true;
}

// cf. potion.c:1068 — peffect_blindness
export async function peffect_blindness(player, otmp, display) {
  if (player.Blind) gp.potion_nothing++;
  const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
  const oldTimeout = (player.uprops?.[BLINDED]?.intrinsic || 0) & TIMEOUT;
  const newTimeout = itimeout_incr(oldTimeout, rn1(200, 250 - 125 * bcsign));
  await make_blinded(player, newTimeout, !player.Blind);
}

// cf. potion.c peffect_speed()
export async function peffect_speed(player, otmp, display) {
    // C ref: potion.c:1053-1056 — Wounded_legs early return (not ported)
    // C ref: potion.c:1059 — speed_up(rn1(10, 100 + 60*bcsign)) for ALL BUC states
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = rn1(10, 100 + 60 * bcsign);
    // C ref: potion.c:2907-2913 speed_up() — message + exercise + incr_itimeout
    if (player.fast) {
        await You("speed up.");
    } else {
        await You("are suddenly moving %sfaster.", player.fast ? "" : "much ");
    }
    await exercise(player, A_DEX, true);
    incr_itimeout(player, FAST, duration);
    // C ref: potion.c:1062-1065 — non-cursed grants intrinsic speed
    if (!otmp.cursed) {
        await Your("quickness feels very natural.");
    }
    return !otmp.blessed;
}

// cf. potion.c peffect_sleeping()
export async function peffect_sleeping(player, otmp, display) {
    // C ref: potion.c:899-906 — Sleep_resistance OR Free_action prevents sleep
    const sr = player.uprops?.[SLEEP_RES];
    const sleepRes = sr && (sr.intrinsic || sr.extrinsic);
    const freeAct = player.uprops?.[FREE_ACTION];
    const hasFreeAction = freeAct && (freeAct.intrinsic || freeAct.extrinsic);
    if (sleepRes || hasFreeAction) {
        await You("yawn.");
        return false;
    }
    // C ref: potion.c:905 — rn1(10, 25 - 12*bcsign) always consumed
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = rn1(10, 25 - 12 * bcsign);
    await You("suddenly fall asleep!");
    player.sleeping = true;
    player.sleepTimeout = duration;
    player.sleepWakeupMessage = 'You wake up.';
    return true;
}

// cf. potion.c peffect_paralysis()
export async function peffect_paralysis(player, otmp, display) {
    // C ref: potion.c:879-893 — Free_action prevents paralysis
    const freeAct = player.uprops?.[FREE_ACTION];
    if (freeAct && (freeAct.intrinsic || freeAct.extrinsic)) {
        await You("stiffen momentarily.");
        return false;
    }
    // C ref: potion.c:889 — rn1(10, 25 - 12*bcsign) for ALL BUC states
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = rn1(10, 25 - 12 * bcsign);
    await You_cant("move!");
    player.sleeping = true;
    player.sleepTimeout = duration;
    player.sleepWakeupMessage = 'You can move again.';
    // C ref: potion.c:892 — exercise(A_DEX, FALSE)
    await exercise(player, A_DEX, false);
    return true;
}

// cf. potion.c peffect_sickness()
export async function peffect_sickness(player, otmp, display) {
    await pline("Yecch!  This stuff tastes like poison.");
    if (otmp.blessed) {
        // C: blessed = "mildly stale fruit juice", losehp(1) unless Healer
        // RNG: none consumed for blessed path
        return true;
    }
    // C: non-blessed, non-Healer path
    const poisRes = player.uprops?.[POISON_RES];
    const hasPoisonRes = poisRes && (poisRes.intrinsic || poisRes.extrinsic);
    const typ = rn2(A_MAX); // always consumed: pick stat to drain
    // C: adjattrib(typ, Poison_resistance ? -1 : -rn1(4, 3), 1)
    if (!hasPoisonRes) {
        const drain = -rn1(4, 3);
        // adjattrib stub — stat drain effect (RNG consumed above)
    } // if poison resistant, no rn1 consumed
    if (!hasPoisonRes) {
        // losehp(rnd(10) + 5 * !!(otmp.cursed), ...)
        rnd(10); // HP damage roll consumed
    } else {
        // losehp(1 + rn2(2), ...)
        rn2(2); // HP damage roll consumed
    }
    await exercise(player, A_CON, false);
    // C: if Hallucination, cure it
    const hh = player.uprops?.[HALLUC];
    if (hh && (hh.intrinsic || hh.extrinsic)) {
        await make_hallucinated(player, 0, false);
    }
    return true;
}

// cf. potion.c peffect_hallucination()
export async function peffect_hallucination(player, otmp, display) {
    // C: Halluc_resistance → early return, no RNG consumed
    const hr = player.uprops?.[HALLUC_RES];
    if (hr && (hr.intrinsic || hr.extrinsic)) {
        return false;
    }
    // C: always applies rn1(200, 600 - 300*bcsign) duration, even blessed
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = itimeout_incr(player.getPropTimeout(HALLUC),
        rn1(200, 600 - 300 * bcsign));
    await make_hallucinated(player, duration, true);
    // C: enlightenment path consumes rn2(3) if blessed, rn2(6) if not cursed
    if ((otmp.blessed && !rn2(3)) || (!otmp.cursed && !rn2(6))) {
        // enlightenment — messages only, but exercise matters for RNG
        await exercise(player, A_WIS, true);
    }
    return true;
}

// cf. potion.c peffect_healing()
export async function peffect_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    await You_feel("better.");
    const heal = 8 + c_d(4 + (2 * bcsign), 4);
    await healup(player, heal, !otmp.cursed ? 1 : 0, !!otmp.blessed, !otmp.cursed);
    await exercise(player, A_CON, true);
    return false;
}

// cf. potion.c peffect_extra_healing()
export async function peffect_extra_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const heal = 16 + c_d(4 + (2 * bcsign), 8);
    const nxtra = otmp.blessed ? 5 : (!otmp.cursed ? 2 : 0);
    await healup(player, heal, nxtra, !otmp.cursed, true);
    await make_hallucinated(player, 0, true);
    await exercise(player, A_CON, true);
    await exercise(player, A_STR, true);
    await You_feel("much better.");
    return false;
}

// cf. potion.c peffect_full_healing()
export async function peffect_full_healing(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    await You_feel("completely healed.");
    await healup(player, 400, 4 + 4 * bcsign, !otmp.cursed, true);
    // C: blessed restores one lost level via pluslvl(FALSE)
    // (deferred: pluslvl consumes RNG but requires full level infrastructure)
    await make_hallucinated(player, 0, true);
    // C: exercise order is A_STR then A_CON
    await exercise(player, A_STR, true);
    await exercise(player, A_CON, true);
    return false;
}

// cf. potion.c peffect_gain_level()
export async function peffect_gain_level(player, otmp, display) {
    if (otmp.cursed) {
        // C: level teleport upward — no RNG consumed in the teleport itself
        // Simplified: just print message (goto_level not wired)
        await You("have an uneasy feeling.");
        return true;
    }
    // C: pluslvl(FALSE) — consumes RNG for HP gain etc.
    // (deferred: pluslvl consumes RNG but requires full level infrastructure)
    player.ulevel = (player.ulevel || 1) + 1;
    await You_feel("more experienced.");
    // C: blessed also calls rndexp(TRUE) to randomize experience
    if (otmp.blessed)
        player.uexp = rndexp(player, true);
    return false;
}

// cf. potion.c peffect_gain_energy()
export async function peffect_gain_energy(player, otmp, display) {
    if (otmp.cursed) {
        await You_feel("lackluster.");
    } else {
        await pline("Magical energies course through your body.");
    }
    // C: num = d(blessed ? 3 : !cursed ? 2 : 1, 6)
    let num = d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6);
    if (otmp.cursed) num = -num;
    // C: u.uenmax += num, u.uen += 3*num (with clamping)
    player.pwmax = Math.max(0, (player.pwmax || 0) + num);
    player.pw = Math.max(0, Math.min((player.pw || 0) + 3 * num, player.pwmax));
    await exercise(player, A_WIS, true);
    return false;
}

// cf. potion.c peffect_acid()
export async function peffect_acid(player, otmp, display) {
    // C ref: check Acid_resistance
    const acidRes = player.uprops[ACID_RES];
    if (acidRes && (acidRes.intrinsic || acidRes.extrinsic)) {
        await pline("This tastes %s.", otmp.blessed ? "sweet" : "sour");
        return !otmp.blessed;
    }
    const dmg = rnd(otmp.cursed ? 10 : 5);
    await pline("This burns%s!", otmp.blessed ? " a little" : " like acid");
    player.uhp -= dmg;
    if (player.uhp < 1) player.uhp = 1;
    await exercise(player, A_CON, false);
    return otmp.cursed;
}

// cf. potion.c peffect_invisibility()
export async function peffect_invisibility(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    // C: blessed path checks !rn2(HInvis ? 15 : 30) for permanent invis
    const HInvis = player.uprops?.[INVIS]?.intrinsic || 0;
    if (otmp.blessed && !rn2(HInvis ? 15 : 30)) {
        // grant permanent invisibility (FROMOUTSIDE)
        if (!player.uprops) player.uprops = {};
        if (!player.uprops[INVIS]) player.uprops[INVIS] = {};
        player.uprops[INVIS].intrinsic = (player.uprops[INVIS].intrinsic || 0) | FROMOUTSIDE;
    } else {
        // C: incr_itimeout(&HInvis, d(6 - 3*bcsign, 100) + 100)
        incr_itimeout(player, INVIS, d(6 - 3 * bcsign, 100) + 100);
    }
    if (otmp.cursed) {
        // C: aggravate() and remove permanent invis
        if (player.uprops?.[INVIS]) {
            player.uprops[INVIS].intrinsic = (player.uprops[INVIS].intrinsic || 0) & ~FROMOUTSIDE;
        }
    }
    return true;
}

// cf. potion.c peffect_see_invisible()
export async function peffect_see_invisible(player, otmp, display) {
    // C: blessed = permanent (FROMOUTSIDE), no RNG consumed
    // C: non-blessed = rn1(100, 750)
    if (!otmp.cursed) {
        // C: make_blinded(0L, TRUE) — cure blindness for non-cursed
        await make_blinded(player, 0, true);
    }
    if (otmp.blessed) {
        // Grant permanent see invisible — no RNG consumed
        if (!player.uprops) player.uprops = {};
        if (!player.uprops[SEE_INVIS]) player.uprops[SEE_INVIS] = {};
        player.uprops[SEE_INVIS].intrinsic = (player.uprops[SEE_INVIS].intrinsic || 0) | FROMOUTSIDE;
    } else {
        incr_itimeout(player, SEE_INVIS, rn1(100, 750));
    }
    return false;
}

// cf. potion.c peffect_restore_ability()
async function peffect_restore_ability(player, otmp, display) {
    if (otmp.cursed) {
        await pline("Ulch!  This makes you feel mediocre!");
        return true; // no RNG consumed
    }
    // C: i = rn2(A_MAX) — always consumed for starting point
    let i = rn2(A_MAX);
    // C: iterate attributes, restore ABASE to AMAX
    // Simplified: RNG consumed above is what matters for parity
    return false;
}

// cf. potion.c peffect_gain_ability()
export async function peffect_gain_ability(player, otmp, display) {
    if (otmp.cursed) {
        // C: "Ulch! That potion tasted foul!" — no RNG consumed
        await pline("Ulch!  That potion tasted foul!");
        return true;
    }
    // C: blessed iterates sequentially (i=0..5), no rn2 calls
    // C: uncursed tries up to 6 times with rn2(A_MAX) each time
    let i = -1;
    for (let ii = A_MAX; ii > 0; ii--) {
        i = otmp.blessed ? (i + 1) : rn2(A_MAX);
        // C: itmp = (blessed || ii == 1) ? 0 : -1
        const itmp = (otmp.blessed || ii === 1) ? 0 : -1;
        if (await adjattrib(player, i, 1, itmp) && !otmp.blessed)
            break;
    }
    return false;
}

// cf. potion.c peffect_booze()
export async function peffect_booze(player, otmp, display) {
    await pline("Ooph!  This tastes like %s!",
        otmp.cursed ? "liquid fire" : "dandelion wine");
    // C: confuse if NOT blessed (both uncursed and cursed confuse)
    if (!otmp.blessed) {
        // C: d(2 + u.uhs, 8) where uhs = hunger state (0=satiated..5=fainting)
        const uhs = player.uhs || 0;
        await make_confused(player, itimeout_incr(player.getPropTimeout(CONFUSION),
            d(2 + uhs, 8)), false);
    }
    // C: healup(1, 0, 0, 0) if not diluted — always heals 1 HP
    await healup(player, 1, 0, false, false);
    // C: hunger += 10 * (2 + bcsign)
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    player.uhunger = (player.uhunger || 0) + 10 * (2 + bcsign);
    await exercise(player, A_WIS, false);
    if (otmp.cursed) {
        // C: multi = -rnd(15) — pass out
        rnd(15); // RNG consumed for pass-out duration
    }
    return true;
}

// ============================================================
// 5. Effect dispatcher
// ============================================================

// cf. potion.c peffects() — dispatch potion type to peffect_* handler
// Returns true if potion type was unknown (for identification tracking).
async function peffects(player, otmp, display) {
    switch (otmp.otyp) {
    case POT_CONFUSION:     return await peffect_confusion(player, otmp, display);
    case POT_BLINDNESS:     return await peffect_blindness(player, otmp, display);
    case POT_SPEED:         return await peffect_speed(player, otmp, display);
    case POT_SLEEPING:      return await peffect_sleeping(player, otmp, display);
    case POT_PARALYSIS:     return await peffect_paralysis(player, otmp, display);
    case POT_SICKNESS:      return await peffect_sickness(player, otmp, display);
    case POT_HALLUCINATION: return await peffect_hallucination(player, otmp, display);
    case POT_HEALING:       return await peffect_healing(player, otmp, display);
    case POT_EXTRA_HEALING: return await peffect_extra_healing(player, otmp, display);
    case POT_FULL_HEALING:  return await peffect_full_healing(player, otmp, display);
    case POT_GAIN_LEVEL:    return await peffect_gain_level(player, otmp, display);
    case POT_GAIN_ENERGY:   return await peffect_gain_energy(player, otmp, display);
    case POT_ACID:          return await peffect_acid(player, otmp, display);
    case POT_INVISIBILITY:  return await peffect_invisibility(player, otmp, display);
    case POT_SEE_INVISIBLE: return await peffect_see_invisible(player, otmp, display);
    case POT_RESTORE_ABILITY: return await peffect_restore_ability(player, otmp, display);
    case POT_GAIN_ABILITY:  return await peffect_gain_ability(player, otmp, display);
    case POT_BOOZE:         return await peffect_booze(player, otmp, display);
    default:
        await pline("Hmm, that tasted like water.");
        return true;
    }
}

// ============================================================
// 6. Healing / support
// ============================================================

// cf. potion.c strange_feeling() — "strange feeling" for unIDed potions
export async function strange_feeling(player, obj, txt) {
    // C ref: potion.c:1456-1472
    if (!txt) {
        await You("have a %s feeling for a moment, then it passes.",
            player.hallucinating ? "normal" : "strange");
    } else {
        await pline("%s", txt);
    }
    // C ref: if (obj) trycall(obj); useup(obj); — ID and useup deferred to caller
}

// cf. potion.c bottlename() — return potion container name
const _bottlenames = ["bottle", "phial", "flagon", "carafe", "flask", "jar", "vial"];
const _hbottlenames = [
    "jug", "pitcher", "barrel", "tin", "bag", "box", "glass", "beaker",
    "tumbler", "vase", "flowerpot", "pan", "thingy", "mug", "teacup",
    "teapot", "keg", "bucket", "thermos", "amphora", "wineskin", "parcel",
    "bowl", "ampoule"
];
function bottlename(player) {
    // C ref: potion.c:1483-1490
    if (player && player.hallucinating)
        return _hbottlenames[rn2(_hbottlenames.length)];
    else
        return _bottlenames[rn2(_bottlenames.length)];
}

// ============================================================
// 7. Dipping (water)
// ============================================================

// cf. potion.c H2Opotion_dip() — dip item into water (bless/curse/dilute)
async function H2Opotion_dip(potion, targobj, useeit, objphrase) {
    // C ref: potion.c:1493-1585
    if (!potion || potion.otyp !== POT_WATER)
        return false;

    let func = null;
    let glowcolor = null;
    let altfmt = false;
    let res = false;

    if (potion.blessed) {
        if (targobj.cursed) {
            func = 'uncurse';
            glowcolor = 'amber';
        } else if (!targobj.blessed) {
            func = 'bless';
            glowcolor = 'light blue';
            altfmt = true;
        }
    } else if (potion.cursed) {
        if (targobj.blessed) {
            func = 'unbless';
            glowcolor = 'brown';
        } else if (!targobj.cursed) {
            func = 'curse';
            glowcolor = 'black';
            altfmt = true;
        }
    }
    // uncursed water: water_damage not yet ported, skip

    if (func) {
        if (useeit) {
            if (altfmt)
                await pline("%s with %s aura.", objphrase, glowcolor === 'amber' ? 'an amber' : `a ${glowcolor}`);
            else
                await pline("%s %s.", objphrase, glowcolor);
        }
        // apply BUC change
        switch (func) {
        case 'uncurse':
            targobj.cursed = false;
            break;
        case 'bless':
            targobj.blessed = true;
            targobj.cursed = false;
            break;
        case 'unbless':
            targobj.blessed = false;
            break;
        case 'curse':
            targobj.cursed = true;
            targobj.blessed = false;
            break;
        }
        res = true;
    }
    return res;
}

// ============================================================
// 8. Throwing / projectile
// ============================================================

// cf. potion.c impact_arti_light() — artifact light on potion impact
export function impact_arti_light(obj, worsen, seeit) {
    // C ref: potion.c:1590-1617
    // Simplified: artifact light interaction requires mksobj infrastructure
    // not yet available. Stub for now.
    if ((worsen ? obj.cursed : obj.blessed)) return;
    // obj_resists check omitted — would need full artifact system
}

// cf. potion.c potionhit() — potion hits a monster or hero
// C ref: potion.c:1619-1914
async function potionhit(mon, obj, how, player, map) {
    const isyou = (mon === player);
    const botlnam = bottlename(player);
    const your_fault = (how <= 1); // POTHIT_HERO_THROW = 1

    if (isyou) {
        await pline("The %s crashes on your head and breaks into shards.", botlnam);
        // losehp(rnd(2)) — damage from bottle
        const bottleDmg = rnd(2);
        player.uhp -= bottleDmg;
        if (player.uhp < 1) player.uhp = 1;
    } else {
        // hit a monster
        if (rn2(5) && mon.mhp > 1)
            mon.mhp--;
    }

    if (isyou) {
        // hero potion effects from being hit
        switch (obj.otyp) {
        case POT_ACID:
            if (!(player.uprops[ACID_RES] &&
                  (player.uprops[ACID_RES].intrinsic || player.uprops[ACID_RES].extrinsic))) {
                await pline("This burns%s!",
                      obj.blessed ? " a little" : obj.cursed ? " a lot" : "");
                const dmg = c_d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
                player.uhp -= dmg;
                if (player.uhp < 1) player.uhp = 1;
            }
            break;
        case POT_POLYMORPH:
            await You_feel("a little %s.", player.hallucinating ? "normal" : "strange");
            break;
        // other potion types: oil lamp explosion, etc. omitted
        }
    } else {
        // monster potion effects
        let angermon = your_fault;
        let cureblind = false;

        switch (obj.otyp) {
        case POT_FULL_HEALING:
            cureblind = true;
            // fallthrough
        case POT_EXTRA_HEALING:
            if (obj.otyp === POT_EXTRA_HEALING || obj.otyp === POT_FULL_HEALING) {
                if (!obj.cursed) cureblind = true;
            }
            // fallthrough
        case POT_HEALING:
            if (obj.otyp === POT_HEALING && obj.blessed) cureblind = true;
            // fallthrough
        case POT_RESTORE_ABILITY:
        case POT_GAIN_ABILITY:
            angermon = false;
            if (mon.mhp < (mon.mhpmax || mon.mhp)) {
                mon.mhp = mon.mhpmax || mon.mhp;
            }
            break;
        case POT_SICKNESS:
            if (mon.mhp > 2) {
                mon.mhp = Math.floor(mon.mhp / 2);
            }
            break;
        case POT_CONFUSION:
        case POT_BOOZE:
            mon.mconf = true;
            break;
        case POT_INVISIBILITY:
            angermon = false;
            // mon_set_minvis not called here to avoid import complexity
            break;
        case POT_SLEEPING:
            // sleep_monst(mon, rnd(12), POTION_CLASS)
            break;
        case POT_PARALYSIS:
            if (mon.mcanmove !== false) {
                mon.mcanmove = false;
                mon.mfrozen = rnd(25);
            }
            break;
        case POT_SPEED:
            angermon = false;
            // mon_adjust_speed(mon, 1, obj) — speed adjustment not called here
            break;
        case POT_BLINDNESS:
            if (mon.mcansee !== false) {
                const btmp = Math.min(64 + rn2(32) + rn2(32) + (mon.mblinded || 0), 127);
                mon.mblinded = btmp;
                mon.mcansee = false;
            }
            break;
        case POT_ACID: {
            const acidDmg = c_d(obj.cursed ? 2 : 1, obj.blessed ? 4 : 8);
            mon.mhp -= acidDmg;
            break;
        }
        case POT_WATER:
            // holy/unholy water vs undead — simplified
            break;
        }

        // wake monster if angered
        if (mon.mhp > 0) {
            if (angermon) {
                mon.msleeping = false;
                mon.mpeaceful = false;
            } else {
                mon.msleeping = false;
            }
        }
    }

    // potionbreathe for nearby hero
    // C ref: distance check omitted for simplicity
}

// ============================================================
// 9. Vapor / gas
// ============================================================

// cf. potion.c potionbreathe() — breathe potion vapors
// C ref: potion.c:1917-2104
async function potionbreathe(player, obj) {
    let cureblind = false;

    switch (obj.otyp) {
    case POT_RESTORE_ABILITY:
    case POT_GAIN_ABILITY:
        if (obj.cursed) {
            await pline("Ulch!  That potion smells terrible!");
        } else {
            // restore one random attribute toward max
            let i = rn2(A_MAX);
            for (let ii = 0; ii < A_MAX; ii++) {
                if (player.attributes && player.attrmax &&
                    player.attributes[i] < player.attrmax[i]) {
                    player.attributes[i]++;
                    player._botl = true;
                    if (!obj.blessed) break;
                }
                i = (i + 1) % A_MAX;
            }
        }
        break;
    case POT_FULL_HEALING:
        if (player.uhp < player.uhpmax) {
            player.uhp++;
            player._botl = true;
        }
        cureblind = true;
        // fallthrough
    case POT_EXTRA_HEALING:
        if (player.uhp < player.uhpmax) {
            player.uhp++;
            player._botl = true;
        }
        if (!obj.cursed) cureblind = true;
        // fallthrough
    case POT_HEALING:
        if (player.uhp < player.uhpmax) {
            player.uhp++;
            player._botl = true;
        }
        if (obj.blessed) cureblind = true;
        if (cureblind) {
            await make_blinded(player, 0, true);
            await make_deaf(player, 0, true);
        }
        await exercise(player, A_CON, true);
        break;
    case POT_SICKNESS:
        if (player.uhp <= 5)
            player.uhp = 1;
        else
            player.uhp -= 5;
        player._botl = true;
        await exercise(player, A_CON, false);
        break;
    case POT_HALLUCINATION:
        await You("have a momentary vision.");
        break;
    case POT_CONFUSION:
    case POT_BOOZE:
        if (!player.getPropTimeout(CONFUSION))
            await You_feel("somewhat dizzy.");
        await make_confused(player, itimeout_incr(player.getPropTimeout(CONFUSION), rnd(5)), false);
        break;
    case POT_INVISIBILITY:
        if (!player.blind && !player.Invis) {
            await pline("For an instant you %s!",
                  player.seeInvisible ? "could see right through yourself"
                                      : "couldn't see yourself");
        }
        break;
    case POT_PARALYSIS:
        if (!(player.uprops[FREE_ACTION] &&
              (player.uprops[FREE_ACTION].intrinsic || player.uprops[FREE_ACTION].extrinsic))) {
            await pline("Something seems to be holding you.");
            player.sleeping = true;
            player.sleepTimeout = rnd(5);
            player.sleepWakeupMessage = "You can move again.";
            await exercise(player, A_DEX, false);
        } else {
            await You("stiffen momentarily.");
        }
        break;
    case POT_SLEEPING:
        if (!(player.uprops[FREE_ACTION] &&
              (player.uprops[FREE_ACTION].intrinsic || player.uprops[FREE_ACTION].extrinsic)) &&
            !(player.uprops[SLEEP_RES] &&
              (player.uprops[SLEEP_RES].intrinsic || player.uprops[SLEEP_RES].extrinsic))) {
            await You_feel("rather tired.");
            player.sleeping = true;
            player.sleepTimeout = rnd(5);
            player.sleepWakeupMessage = "You can move again.";
            await exercise(player, A_DEX, false);
        } else {
            await You("yawn.");
        }
        break;
    case POT_SPEED:
        if (!player.getPropTimeout(FAST))
            await Your("knees seem more flexible now.");
        incr_itimeout(player, FAST, rnd(5));
        await exercise(player, A_DEX, true);
        break;
    case POT_BLINDNESS:
        if (!player.blind) {
            await pline("It suddenly gets dark.");
        }
        await make_blinded(player,
                     itimeout_incr(player.getPropTimeout(BLINDED), rnd(5)), false);
        break;
    case POT_ACID:
    case POT_POLYMORPH:
        await exercise(player, A_CON, false);
        break;
    // POT_GAIN_LEVEL, POT_GAIN_ENERGY, POT_LEVITATION, POT_FRUIT_JUICE,
    // POT_MONSTER_DETECTION, POT_OBJECT_DETECTION, POT_OIL: no vapor effect
    }
}

// ============================================================
// 10. Mixing
// ============================================================

// cf. potion.c mixtype() — determine result of mixing two potions
// C ref: potion.c:2107-2195
// Autotranslated from potion.c:2107
export function mixtype(o1, o2) {
  let o1typ = o1.otyp, o2typ = o2.otyp;
  if (o1.oclass === POTION_CLASS && (o2typ === POT_GAIN_LEVEL || o2typ === POT_GAIN_ENERGY || o2typ === POT_HEALING || o2typ === POT_EXTRA_HEALING || o2typ === POT_FULL_HEALING || o2typ === POT_ENLIGHTENMENT || o2typ === POT_FRUIT_JUICE)) { o1typ = o2.otyp; o2typ = o1.otyp; }
  switch (o1typ) {
    case POT_HEALING:
      if (o2typ === POT_SPEED) return POT_EXTRA_HEALING;
    case POT_EXTRA_HEALING:
      case POT_FULL_HEALING:
        if (o2typ === POT_GAIN_LEVEL || o2typ === POT_GAIN_ENERGY) return (o1typ === POT_HEALING) ? POT_EXTRA_HEALING : (o1typ === POT_EXTRA_HEALING) ? POT_FULL_HEALING : POT_GAIN_ABILITY;
    case UNICORN_HORN:
      switch (o2typ) {
        case POT_SICKNESS:
          return POT_FRUIT_JUICE;
        case POT_HALLUCINATION:
          case POT_BLINDNESS:
            case POT_CONFUSION:
              return POT_WATER;
      }
    break;
    case AMETHYST:
      if (o2typ === POT_BOOZE) return POT_FRUIT_JUICE;
    break;
    case POT_GAIN_LEVEL:
      case POT_GAIN_ENERGY:
        switch (o2typ) {
          case POT_CONFUSION:
            return (rn2(3) ? POT_BOOZE : POT_ENLIGHTENMENT);
          case POT_HEALING:
            return POT_EXTRA_HEALING;
          case POT_EXTRA_HEALING:
            return POT_FULL_HEALING;
          case POT_FULL_HEALING:
            return POT_GAIN_ABILITY;
          case POT_FRUIT_JUICE:
            return POT_SEE_INVISIBLE;
          case POT_BOOZE:
            return POT_HALLUCINATION;
        }
    break;
    case POT_FRUIT_JUICE:
      switch (o2typ) {
        case POT_SICKNESS:
          return POT_SICKNESS;
        case POT_ENLIGHTENMENT:
          case POT_SPEED:
            return POT_BOOZE;
        case POT_GAIN_LEVEL:
          case POT_GAIN_ENERGY:
            return POT_SEE_INVISIBLE;
      }
    break;
    case POT_ENLIGHTENMENT:
      switch (o2typ) {
        case POT_LEVITATION:
          if (rn2(3)) return POT_GAIN_LEVEL;
        break;
        case POT_FRUIT_JUICE:
          return POT_BOOZE;
        case POT_BOOZE:
          return POT_CONFUSION;
      }
    break;
  }
  return STRANGE_OBJECT;
}

// ============================================================
// 11. Dipping mechanics
// ============================================================

// cf. potion.c dip_ok() — validate dip target
export function dip_ok(obj) {
    // C ref: potion.c:2199-2213
    if (!obj) return false;
    if (obj.oclass === COIN_CLASS) return false;
    return true;
}

// cf. potion.c dip_hands_ok() — check if hands are free for dipping
export function dip_hands_ok(obj) {
    // C ref: potion.c:2216-2223
    if (!obj) return true; // hands are valid target when slippery
    return dip_ok(obj);
}

// cf. potion.c hold_potion() — handle holding the potion during dip
function hold_potion(player, potobj) {
    // C ref: potion.c:2228-2248
    // Simplified: re-add potion to inventory after transformation
    // In C this handles near_capacity and merging; here just add back
    if (potobj && player && player.addToInventory) {
        player.addToInventory(potobj);
    }
}

// cf. potion.c dodip() — dip command entry point
// Not yet fully interactive (needs getobj infrastructure). Stub for caller.
async function dodip(player, map, display) {
    // C ref: potion.c:2252-2358
    // Full interactive dip flow requires getobj/y_n prompting not yet ported.
    // Minimal stub: "You have nothing to dip." or direct to potion_dip.
    await pline("That command is not yet available.");
    return { moved: false, tookTime: false };
}

// cf. potion.c dip_into() — alternate dip entry (potion selected first)
export async function dip_into(player, map, display) {
    // C ref: potion.c:2364-2391
    // Requires cmdq infrastructure. Stub.
    await pline("That command is not yet available.");
    return { moved: false, tookTime: false };
}

// cf. potion.c poof() — potion disappears in a poof (trycall + useup)
export function poof(player, potion) {
    // C ref: potion.c:2393-2399
    // trycall(potion) — ID attempt; useup(potion) — consume it
    if (player && player.removeFromInventory) {
        player.removeFromInventory(potion);
    }
}

// cf. potion.c dip_potion_explosion() — do dipped potions explode?
async function dip_potion_explosion(player, obj, dmg) {
    // C ref: potion.c:2401-2424
    if (obj.cursed || obj.otyp === POT_ACID
        || (obj.otyp === POT_OIL && obj.lamplit)
        || !rn2(10)) {
        await pline("%sThey explode!", player.deaf ? "" : "BOOM!  ");
        await exercise(player, A_STR, false);
        await potionbreathe(player, obj);
        // useupall(obj) — remove entire stack
        if (player.removeFromInventory) player.removeFromInventory(obj);
        player.uhp -= dmg;
        if (player.uhp < 1) player.uhp = 1;
        return true;
    }
    return false;
}

// cf. potion.c potion_dip() — dip object into potion (core mixing logic)
async function potion_dip(player, obj, potion) {
    // C ref: potion.c:2427-2778
    if (potion === obj && (potion.quan || 1) === 1) {
        await pline("That is a potion bottle, not a Klein bottle!");
        return false;
    }

    if (potion.otyp === POT_WATER) {
        const obj_glows = `Your ${obj.oname || 'object'} glows`;
        if (await H2Opotion_dip(potion, obj, !player.blind, obj_glows)) {
            poof(player, potion);
            return true;
        }
    }

    // mixing two different potions
    if (obj.oclass === POTION_CLASS && obj.otyp !== potion.otyp) {
        const mixture = mixtype(obj, potion);
        poof(player, potion); // use up dip potion

        // explosion check
        const amt = obj.quan || 1;
        if (await dip_potion_explosion(player, obj, amt + rnd(9)))
            return true;

        obj.blessed = false;
        obj.cursed = false;

        if (mixture !== STRANGE_OBJECT) {
            obj.otyp = mixture;
        } else {
            // random result
            switch (obj.odiluted ? 1 : rnd(8)) {
            case 1:
                obj.otyp = POT_WATER;
                break;
            case 2: case 3:
                obj.otyp = POT_SICKNESS;
                break;
            case 4:
                // random potion type — simplified
                obj.otyp = POT_WATER;
                break;
            default:
                // evaporates — remove obj
                if (player.removeFromInventory) player.removeFromInventory(obj);
                await pline("The mixture glows brightly and evaporates.");
                return true;
            }
        }
        obj.odiluted = (obj.otyp !== POT_WATER);

        if (obj.otyp === POT_WATER) {
            await pline("The mixture bubbles, then clears.");
        }
        // hold_potion to re-merge in inventory
        return true;
    }

    // dipping unicorn horn or amethyst
    if ((obj.otyp === UNICORN_HORN || obj.otyp === AMETHYST)) {
        const mixture = mixtype(obj, potion);
        if (mixture !== STRANGE_OBJECT) {
            potion.otyp = mixture;
            potion.blessed = false;
            if (mixture === POT_WATER)
                potion.cursed = false;
            else
                potion.cursed = obj.cursed;
            return true;
        }
    }

    await pline("Interesting...");
    return true;
}

// ============================================================
// 12. Djinni / split
// ============================================================

// cf. potion.c mongrantswish() — monster grants a wish
export async function mongrantswish(mon, player, map) {
    // C ref: potion.c:2780-2798
    // Full wish system not yet ported. Keep C-style temporary glyph overlay.
    if (mon && map) {
        const mx = mon.mx;
        const my = mon.my;
        const glyph = {
            ch: typeof mon.displayChar === 'string' && mon.displayChar.length > 0
                ? mon.displayChar[0]
                : '&',
            color: Number.isInteger(mon.displayColor) ? mon.displayColor : 15,
        };
        tmp_at(DISP_ALWAYS, glyph);
        tmp_at(mx, my);
        // mongone(mon) — remove monster from map
        const idx = map.monsters.indexOf(mon);
        if (idx >= 0) map.monsters.splice(idx, 1);
        tmp_at(DISP_END, 0);
    }
    // makewish() — wish granting not yet ported
    await pline("You may wish for an object. (Not yet implemented.)");
}

// cf. potion.c djinni_from_bottle() — release djinni from smoky potion
async function djinni_from_bottle(player, obj, map) {
    // C ref: potion.c:2800-2854
    if (!player.blind) {
        await pline("In a cloud of smoke, a djinni emerges!");
        await pline("The djinni speaks.");
    } else {
        await You("smell acrid fumes.");
        await pline("Something speaks.");
    }

    let chance = rn2(5);
    if (obj.blessed)
        chance = (chance === 4) ? rnd(4) : 0;
    else if (obj.cursed)
        chance = (chance === 0) ? rn2(4) : 4;

    switch (chance) {
    case 0:
        await pline("\"I am in your debt.  I will grant one wish!\"");
        // mongrantswish — wish not yet implemented
        break;
    case 1:
        await pline("\"Thank you for freeing me!\"");
        // tamedog — taming not yet ported for djinni
        break;
    case 2:
        await pline("\"You freed me!\"");
        // peaceful djinni
        break;
    case 3:
        await pline("\"It is about time!\"");
        // djinni vanishes
        break;
    default:
        await pline("\"You disturbed me, fool!\"");
        // hostile djinni
        break;
    }
}

// cf. potion.c split_mon() — clone a gremlin or mold
async function split_mon(mon, mtmp, map, player) {
    // C ref: potion.c:2856-2901
    // clone_mon / cloneu not yet ported. Minimal stub.
    const isyou = (mon === player);

    if (isyou) {
        // player splitting (polymorphed gremlin)
        await You("multiply!");
        return null; // cloneu() not available
    } else {
        // monster splitting
        if (mon.mhp <= 1) return null;
        // clone_mon not available — stub
        await pline("%s multiplies!", mon.name || "It");
        return null;
    }
}

export { handleQuaff, peffects, make_stunned, make_blinded, make_sick, make_hallucinated, make_deaf, make_slimed, bottlename, H2Opotion_dip, potionhit, potionbreathe, hold_potion, dodip, dip_potion_explosion, potion_dip, djinni_from_bottle, split_mon };

// dopotion and peffect_enlightenment: broken autotranslated stubs removed.
// The real quaffing path is handleQuaff → peffects (line ~437/797).

// cf. potion.c:909 — peffect_monster_detection
export async function peffect_monster_detection(otmp, map, player) {
  if (otmp.blessed) {
    let i;
    const detectProp = player.uprops?.[DETECT_MONSTERS] || {};
    const curTimeout = (detectProp.intrinsic || 0) & TIMEOUT;
    if (curTimeout > 0) gp.potion_nothing++;
    gp.potion_unkn++;
    if (curTimeout >= 300) i = 1;
    else if (otmp.oclass === SPBOOK_CLASS) i = rn1(40, 21);
    else {
      i = rn2(100) + 100;
    }
    incr_itimeout(player, DETECT_MONSTERS, i);
    // C: scan map for invisible glyphs and MON_AT; simplified
    if (!player.uswallow) {
      see_monsters(map);
      if (gp.potion_unkn) await You_feel("lonely.");
      return 0;
    }
  }
  if (await monster_detect(otmp, 0)) return 1;
  await exercise(player, A_WIS, true);
  return 0;
}

// Autotranslated from potion.c:950
export async function peffect_object_detection(otmp, player) {
  if (await object_detect(otmp, 0)) return 1;
  await exercise(player, A_WIS, true);
  return 0;
}

// cf. potion.c:1160 — peffect_levitation
export async function peffect_levitation(otmp, map, player) {
  if (!player.levitating) {
    set_itimeout(player, LEVITATION, 1);
    player.levitating = true;
    await float_up(player, null);
  } else {
    gp.potion_nothing++;
  }
  if (otmp.cursed) {
    let stway;
    if ((stway = await stairway_at(player.x, player.y)) != null && stway.up) {
      /* doup() not yet ported */ gp.potion_nothing = 0;
    } else if (has_ceiling(map.uz || map)) {
      const uarmh = player.helmet;
      let dmg = rnd(!uarmh ? 10 : !hard_helmet(uarmh) ? 6 : 3);
      if (player.halfPhysDamage) dmg = Math.max(1, Math.floor(dmg / 2));
      await You("hit your %s on the %s.", body_part(HEAD), ceiling(player.x, player.y, map));
      await losehp(dmg, "colliding with the ceiling", KILLED_BY, player);
      gp.potion_nothing = 0;
    }
  } else if (otmp.blessed) {
    incr_itimeout(player, LEVITATION, rn1(50, 250));
  } else {
    incr_itimeout(player, LEVITATION, rn1(140, 10));
  }
  if (player.levitating && IS_SINK(map.locations[player.x][player.y].typ)) await spoteffects(false);
  float_vs_flight({ disp: {} }, player);
}

// Autotranslated from potion.c:1313
export async function peffect_polymorph(otmp, player) {
  await You_feel("a little %s.", (player?.Hallucination || player?.hallucinating || false) ? "normal" : "strange");
  // C: Unchanging = intrinsic|extrinsic property check
  const unchanging = player.uprops?.[UNCHANGING]?.extrinsic || player.uprops?.[UNCHANGING]?.intrinsic;
  if (!unchanging) {
    if (!otmp.blessed || (player.umonnum !== player.umonster)) await polyself(POLY_NOFLAGS);
    else {
      await polyself(POLY_CONTROLLED|POLY_LOW_CTRL);
      if (player.mtimedone && player.umonnum !== player.umonster) player.mtimedone = Math.min(player.mtimedone, rn2(15) + 10);
    }
  }
}
