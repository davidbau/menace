// potion.js -- Potion mechanics
// cf. potion.c — dodrink, peffects, healup, potionhit, dodip, status effects

import { rn2, rn1, rnd, d, c_d } from './rng.js';
import { more, nhgetch, ynFunction } from './input.js';
import { buildInventoryOverlayLines, renderOverlayMenuUntilDismiss, getobj, useup, useupall, compactInvletPromptChars } from './invent.js';
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
         COIN_CLASS, WEAPON_CLASS, SPBOOK_CLASS } from './objects.js';
import { FOUNTAIN, A_CON, A_STR, A_WIS, A_INT, A_DEX, A_CHA,
         TIMEOUT, CONFUSION, STUNNED, BLINDED, HALLUC, HALLUC_RES,
         SICK, SICK_RES, DEAF,
         VOMITING, GLIB, FAST, STONED, SLIMED,
         FREE_ACTION, ACID_RES, SLEEP_RES, POISON_RES,
         SICK_VOMITABLE, SICK_NONVOMITABLE, SICK_ALL, COLNO, ROWNO,
         FROMOUTSIDE, INVIS, SEE_INVIS, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, A_MAX } from './const.js';
import { exercise } from './attrib_exercise.js';
import { adjattrib, poisontell } from './attrib.js';
import { drinkfountain, dipfountain, dipsink } from './fountain.js';
import { pline, You, Your, You_feel, You_cant, impossible } from './pline.js';
import { tmp_at } from './animation.js';
import { DISP_ALWAYS, DISP_END } from './const.js';
import { mark_vision_dirty } from './vision.js';
import { float_up, float_down } from './trap.js';
import { float_vs_flight, polyself } from './polyself.js';
import { rndexp, pluslvl } from './exper.js';
import { discoverObject, isObjectNameKnown, objdescr_is } from './o_init.js';
import { trycall } from './do.js';
import { heal_legs } from './do.js';
import { monster_detect, object_detect } from './detect.js';
import { spoteffects, losehp, Maybe_Half_Phys } from './hack.js';
import { stairway_at } from './stairs.js';
import { has_ceiling, ceiling } from './dungeon.js';
import { hard_helmet } from './do_wear.js';
import { body_part } from './polyself.js';
import { HEAD, FACE, KILLED_BY, KILLED_BY_AN, LEVITATION, UNCHANGING,
         POLY_NOFLAGS, POLY_CONTROLLED, POLY_LOW_CTRL,
         DETECT_MONSTERS, IS_SINK,
         I_SPECIAL, INTRINSIC, FIXED_ABIL,
         FIRE_RES, COLD_RES,
         A_NONE as A_NONE_ALIGN, A_LAWFUL, A_CHAOTIC } from './const.js';
import { hliquid } from './do_name.js';
import { makeplural, doname, fruitname } from './objnam.js';
import { mon_hates_blessings, likes_fire } from './mondata.js';
import { burn_away_slime, fall_asleep } from './timeout.js';
import { do_enlightenment_effect } from './zap.js';
import { mons } from './monsters.js';
import { PM_HEALER, PM_GHOST, PM_DJINNI, G_GONE } from './monsters.js';
import { game as gstateGame } from './gstate.js';
import { see_monsters, see_objects, see_traps, swallowed, vision_recalc, unmap_object, newsym, set_mimic_blocking } from './display.js';
import { update_inventory, learn_unseen_invent } from './invent.js';
import { eatmupdate, newuhs, fix_petrification } from './eat.js';
import { you_were, you_unwere, set_ulycn } from './were.js';
import { can_reach_floor } from './engrave.js';
import { is_pool } from './dbridge.js';
import { glyph_is_invisible } from './symbols.js';
import { delayed_killer, find_delayed_killer, dealloc_killer } from './end.js';
import { aggravate } from './wizard.js';
import { Role_if } from './role.js';
import { getEnv, writeStderr } from './runtime_env.js';

// Module-level state for potion-quaffing flow (C globals: potion_nothing, potion_unkn)
const gp = { potion_nothing: 0, potion_unkn: 0 };
const diagQuaff = (() => {
    const v = getEnv('WEBHACK_DIAG_QUAFF');
    return v === '1' || v === 'true';
})();

function activeMap(mapArg = null) {
    if (mapArg) return mapArg;
    if (gstateGame?.map) return gstateGame.map;
    return null;
}

function isValidPm(pm) {
    return Number.isInteger(pm) && pm >= 0;
}

function isCurrentlyLycanForm(player) {
    return isValidPm(player?.ulycn)
        && isValidPm(player?.umonnum)
        && Number(player.umonnum) === Number(player.ulycn);
}

function isUpolyd(player) {
    if (!isValidPm(player?.umonnum) || !isValidPm(player?.umonster)) return false;
    return Number(player.umonnum) !== Number(player.umonster);
}

function hungerStateForBooze(player) {
    if (Number.isInteger(player?.uhs)) return player.uhs;
    if (Number.isInteger(player?.hungerState)) return player.hungerState;
    const h = Number(player?.uhunger ?? player?.hunger ?? 0);
    if (h > 1000) return 0; // SATIATED
    if (h > 150) return 1;  // NOT_HUNGRY
    if (h > 50) return 2;   // HUNGRY
    if (h > 0) return 3;    // WEAK
    return 4;               // FAINTING
}

function isHeroBlind(player) {
    return !!(player?.Blind || player?.blind);
}

function isHeroInvisible(player) {
    const p = player?.uprops?.[INVIS] || {};
    const intrinsic = Number(p.intrinsic || 0);
    const hasInvis = !!((intrinsic & TIMEOUT) || (intrinsic & FROMOUTSIDE) || p.extrinsic);
    return hasInvis && !p.blocked;
}

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

    // C ref: potion.c:95-100 — onset message when first becoming confused
    if (xtime && !old) {
        if (talk) {
            if (player.hallucinating || player.Hallucination)
                await pline("What a trippy feeling!");
            else
                await pline("Huh, What?  Where am I?");
        }
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

    const kptr = find_delayed_killer(SICK);
    if (player.getPropTimeout(SICK)) {
        await exercise(player, A_CON, false);
        // C ref: potion.c make_sick() delayed_killer update condition.
        if (xtime || !old || !kptr) {
            const kpfx = (cause && cause === "#wizintrinsic") ? KILLED_BY : KILLED_BY_AN;
            delayed_killer(SICK, kpfx, cause || "");
        }
        player.usick_cause = find_delayed_killer(SICK)?.name || "";
    } else {
        dealloc_killer(kptr);
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
        await toggle_blindness(player);
    }
}

// cf. potion.c toggle_blindness()
// Blindness has just toggled due to timeout or eyewear changes.
export async function toggle_blindness(player) {
    if (!player) return;
    player._botl = true;
    mark_vision_dirty();
    // C ref: potion.c toggle_blindness() forces immediate vision recalc.
    vision_recalc();
    // C calls see_monsters() when blind telepathy/infravision/stinging are active.
    // JS keeps this broad as a safe display refresh hook.
    see_monsters(activeMap());
    if (!player.blind) {
        // C ref: learn_unseen_invent() when blindness ends.
        learn_unseen_invent(player);
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
        // C ref: when hallucination ends, refresh mimic appearance messaging.
        if (!player.getPropTimeout(HALLUC)) {
            eatmupdate(player);
        }
        if (player.uswallow) {
            await swallowed(0, player);
        } else {
            // C ref: refresh visual overlays before announcing message.
            see_monsters(activeMap());
            see_objects();
            see_traps();
        }
        update_inventory(player);
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
    if (!player.getPropTimeout(SLIMED)) {
        dealloc_killer(find_delayed_killer(SLIMED));
    }
}

// cf. potion.c make_stoned() — C ref: potion.c:221-240
export async function make_stoned(player, xtime, msg, killedby = KILLED_BY_AN, killername = "petrification") {
    const old = player.getPropTimeout(STONED);
    set_itimeout(player, STONED, xtime);
    if ((!!xtime) !== (!!old)) {
        player._botl = true;
        if (msg) await pline("%s", msg);
    }
    if (!player.getPropTimeout(STONED)) {
        dealloc_killer(find_delayed_killer(STONED));
    } else if (!old) {
        delayed_killer(STONED, killedby, killername);
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
    // C ref: potion.c ghost_from_bottle() uses nomul(-3), multi_reason, nomovemsg.
    fall_asleep(-3, false);
    if (gstateGame) {
        gstateGame.multi_reason = 'being frightened to death';
        gstateGame.nomovemsg = 'You regain your composure.';
    }
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
        const ans = await ynFunction('Drink from the fountain?', 'yn', 'n'.charCodeAt(0), display);
        if (ans === 'y'.charCodeAt(0)) {
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

    const rawLetters = potions.map(p => p.invlet).join('');
    if (diagQuaff) {
        const potionSummary = potions
            .map((p) => `${String(p?.invlet || '?')}:${Number(p?.otyp || -1)}:q${Number(p?.quan || 0)}:w${Number(p?.owt || 0)}`)
            .join('|');
        writeStderr(`[QUAFF_MENU] letters=${rawLetters} cap=${Number(player?.encumbrance || 0)} pots=${potionSummary}\n`);
    }
    const drinkPrompt = `What do you want to drink? [${compactInvletPromptChars(rawLetters)} or ?*] `;
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
        const ch = await nhgetch();
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
            if (diagQuaff) {
                const isMilky = objdescr_is(item, 'milky');
                const isSmoky = objdescr_is(item, 'smoky');
                writeStderr(
                    `[QUAFF] invlet=${String(c)} otyp=${Number(item?.otyp)} milky=${isMilky ? 1 : 0} smoky=${isSmoky ? 1 : 0} gBorn=${Number(gstateGame?.mvitals?.[PM_GHOST]?.born || 0)} dBorn=${Number(gstateGame?.mvitals?.[PM_DJINNI]?.born || 0)}\n`
                );
            }
            // C parity: inventory-selected items are description-known by the
            // time they are acted on (otmp->dknown guards makeknown/trycall).
            item.dknown = true;
            item.in_use = true;
            gp.potion_nothing = 0;
            gp.potion_unkn = 0;
            // C ref: potion.c:601-613 — milky (ghost) and smoky (djinni) checks
            const game = gstateGame;
            const mvitals = game?.mvitals;
            if (objdescr_is(item, 'milky')
                && mvitals && !(mvitals[PM_GHOST]?.mvflags & G_GONE)
                && !rn2(13 + 2 * (mvitals[PM_GHOST]?.born || 0))) {
                await ghost_from_bottle(player, map);
                // C ref: useup(item) — decrements stack quantity and recomputes
                // object weight before inventory update.
                useup(item, player);
                replacePromptMessage();
                return { moved: false, tookTime: true };
            } else if (objdescr_is(item, 'smoky')
                && mvitals && !(mvitals[PM_DJINNI]?.mvflags & G_GONE)
                && !rn2(13 + 2 * (mvitals[PM_DJINNI]?.born || 0))) {
                await djinni_from_bottle(player, item, map);
                // C ref: useup(item) — decrements stack quantity and recomputes
                // object weight before inventory update.
                useup(item, player);
                replacePromptMessage();
                return { moved: false, tookTime: true };
            }
            const retval = await peffects(player, item, display, map);
            // C parity: dodrink consumes one potion after effects resolve.
            useup(item, player);
            if (retval >= 0) {
                item.in_use = false;
                return { moved: false, tookTime: !!retval };
            }
            // retval === -1: normal path
            if (gp.potion_nothing) {
                gp.potion_unkn++;
                await You("have a %s feeling for a moment, then it passes.",
                    (player.hallucinating || player.Hallucination) ? "normal" : "peculiar");
            }
            const potionUnknown = !!gp.potion_unkn;
            if (item.dknown && !isObjectNameKnown(item.otyp)) {
                if (!potionUnknown) {
                    discoverObject(item.otyp, true, true);
                } else {
                    await trycall(item);
                }
            }
            item.in_use = false;
            return { moved: false, tookTime: true };
        }

        // C ref: getobj() always shows error for invalid invlet and re-prompts.
        replacePromptMessage();
        await display.putstr_message("You don't have that object.");
        await more(display, {
            site: 'potion.handleQuaff.invalidInvletMorePrompt',
        });
        await showQuaffPrompt();
        continue;
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
    await make_confused(player, duration, true);
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

// cf. potion.c:1048 — peffect_speed
export async function peffect_speed(player, otmp, display) {
    const is_speed = (otmp.otyp === POT_SPEED);
    if (is_speed && !!player.woundedLegs && !otmp.cursed && !player.steed) {
        await heal_legs(0, player);
        gp.potion_unkn++;
        return;
    }
    await speed_up(player, rn1(10, 100 + 60 * (otmp.blessed ? 1 : (otmp.cursed ? -1 : 0))));
    // C ref: potion.c:1062-1065 — non-cursed potion grants intrinsic speed
    if (is_speed && !otmp.cursed) {
        const fastProp = player.ensureUProp(FAST);
        if (!(Number(fastProp.intrinsic || 0) & INTRINSIC)) {
            await Your("quickness feels very natural.");
            fastProp.intrinsic = Number(fastProp.intrinsic || 0) | FROMOUTSIDE;
        }
    }
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
    // C ref: potion.c peffect_sleeping() -> fall_asleep(-duration, TRUE).
    fall_asleep(-duration, true);
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
    // C ref: potion.c peffect_paralysis() uses nomul(-duration), not fall_asleep.
    // Use fall_asleep(..., FALSE) for shared nomul/usleep wiring, then override reason.
    fall_asleep(-duration, false);
    if (gstateGame) gstateGame.multi_reason = 'frozen by a potion';
    // C ref: potion.c:892 — exercise(A_DEX, FALSE)
    await exercise(player, A_DEX, false);
    return true;
}

// cf. potion.c peffect_sickness()
export async function peffect_sickness(player, otmp, display) {
    await pline("Yecch!  This stuff tastes like poison.");
    if (otmp.blessed) {
        await pline("(But in fact it was mildly stale %s.)", fruitname(true));
        if (!Role_if(player, PM_HEALER)) {
            await losehp(1, "mildly contaminated potion", KILLED_BY_AN, player, display || gstateGame?.display, gstateGame);
        }
        return true;
    }

    const poisRes = player.uprops?.[POISON_RES];
    const hasPoisonRes = poisRes && (poisRes.intrinsic || poisRes.extrinsic);
    if (hasPoisonRes) {
        await pline("(But in fact it was biologically contaminated %s.)", fruitname(true));
    }
    if (Role_if(player, PM_HEALER)) {
        await pline("Fortunately, you have been immunized.");
    } else {
        const contaminant = `${hasPoisonRes ? "mildly " : ""}${otmp.fromsink ? "contaminated tap water" : "contaminated potion"}`;
        const typ = rn2(A_MAX);
        const fixedAbil = player.uprops?.[FIXED_ABIL];
        if (!(fixedAbil && (fixedAbil.intrinsic || fixedAbil.extrinsic))) {
            await poisontell(player, typ, false);
            await adjattrib(player, typ, hasPoisonRes ? -1 : -rn1(4, 3), 1);
        }
        if (!hasPoisonRes) {
            await losehp(
                rnd(10) + 5 * !!otmp.cursed,
                contaminant,
                otmp.fromsink ? KILLED_BY : KILLED_BY_AN,
                player,
                display || gstateGame?.display,
                gstateGame,
            );
        } else {
            await losehp(
                1 + rn2(2),
                contaminant,
                otmp.fromsink ? KILLED_BY : KILLED_BY_AN,
                player,
                display || gstateGame?.display,
                gstateGame,
            );
        }
        await exercise(player, A_CON, false);
    }

    // C: if Hallucination, cure it
    const hh = player.uprops?.[HALLUC];
    if (hh && (hh.intrinsic || hh.extrinsic)) {
        await You("are shocked back to your senses!");
        await make_hallucinated(player, 0, false);
    }
    return true;
}

// cf. potion.c:693 — peffect_hallucination
export async function peffect_hallucination(player, otmp, display) {
    const hr = player.uprops?.[HALLUC_RES];
    if (hr && (hr.intrinsic || hr.extrinsic)) {
        gp.potion_nothing++;
        return;
    }
    const hallu = player.hallucinating || player.Hallucination;
    if (hallu) gp.potion_nothing++;
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const duration = itimeout_incr(player.getPropTimeout(HALLUC),
        rn1(200, 600 - 300 * bcsign));
    await make_hallucinated(player, duration, true);
    if ((otmp.blessed && !rn2(3)) || (!otmp.cursed && !rn2(6))) {
        await You("perceive yourself...");
        // C: display_nhwindow(WIN_MESSAGE, FALSE); enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
        await do_enlightenment_effect(player, display);
        await Your("awareness re-normalizes.");
        await exercise(player, A_WIS, true);
    }
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
    if (otmp.blessed && player.ulevel < (player.ulevelmax || player.ulevel)) {
        player.ulevelmax = (player.ulevelmax || player.ulevel) - 1;
        await pluslvl(player, display, false);
    }
    await make_hallucinated(player, 0, true);
    // C: exercise order is A_STR then A_CON
    await exercise(player, A_STR, true);
    await exercise(player, A_CON, true);
    return false;
}

// cf. potion.c peffect_gain_level()
export async function peffect_gain_level(player, otmp, display) {
    if (otmp.cursed) {
        gp.potion_unkn++;
        // C: level teleport upward — no RNG consumed in the teleport itself
        // Simplified: just print message (goto_level not wired)
        await You("have an uneasy feeling.");
        return true;
    }
    await pluslvl(player, display, false);
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
    let num = c_d(otmp.blessed ? 3 : !otmp.cursed ? 2 : 1, 6);
    if (otmp.cursed) num = -num;
    // C: u.uenmax += num, u.uen += 3*num (with clamping)
    player.pwmax = Math.max(0, (player.pwmax || 0) + num);
    player.pw = Math.max(0, Math.min((player.pw || 0) + 3 * num, player.pwmax));
    await exercise(player, A_WIS, true);
    return false;
}

// cf. potion.c peffect_acid()
export async function peffect_acid(player, otmp, display) {
    const acidRes = player.uprops?.[ACID_RES];
    if (acidRes && (acidRes.intrinsic || acidRes.extrinsic)) {
        await pline("This tastes %s.",
            (player.hallucinating || player.Hallucination) ? "tangy" : "sour");
    } else {
        await pline("This burns%s!",
            otmp.blessed ? " a little" : (otmp.cursed ? " a lot" : " like acid"));
        const dmg = c_d(otmp.cursed ? 2 : 1, otmp.blessed ? 4 : 8);
        await losehp(
            Maybe_Half_Phys(dmg, player),
            "potion of acid",
            KILLED_BY_AN,
            player,
            display || gstateGame?.display,
            gstateGame,
        );
        await exercise(player, A_CON, false);
    }
    if (player.getPropTimeout(STONED)) await fix_petrification();
    gp.potion_unkn++;
    return false;
}

// cf. potion.c peffect_invisibility()
export async function peffect_invisibility(player, otmp, display) {
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    const invisProp = player.ensureUProp(INVIS);
    const intrinsic = Number(invisProp.intrinsic || 0);
    if (isHeroInvisible(player) || isHeroBlind(player) || invisProp.blocked) {
        gp.potion_nothing++;
    } else {
        await self_invis_message(player);
    }
    if (otmp.blessed && !rn2((intrinsic & TIMEOUT) ? 15 : 30)) {
        invisProp.intrinsic = intrinsic | FROMOUTSIDE;
    } else {
        incr_itimeout(player, INVIS, c_d(6 - 3 * bcsign, 100) + 100);
    }
    const mapRef = activeMap();
    if (Number.isInteger(player?.x) && Number.isInteger(player?.y)) newsym(player.x, player.y, mapRef);
    if (otmp.cursed) {
        await pline("For some reason, you feel your presence is known.");
        aggravate(mapRef, player);
        invisProp.intrinsic = Number(invisProp.intrinsic || 0) & ~FROMOUTSIDE;
    }
    return true;
}

// cf. potion.c peffect_see_invisible()
export async function peffect_see_invisible(player, otmp, display) {
    const msg = isHeroInvisible(player) && !isHeroBlind(player);
    gp.potion_unkn++;
    if (otmp.cursed) {
        await pline("Yecch!  This tastes %s.",
            (player.hallucinating || player.Hallucination) ? "overripe" : "rotten");
    } else {
        const diluted = otmp.odiluted ? "reconstituted " : "";
        if (player.hallucinating || player.Hallucination) {
            await pline("This tastes like 10%% real %s%s all-natural beverage.", diluted, fruitname(true));
        } else {
            await pline("This tastes like %s%s.", diluted, fruitname(true));
        }
    }
    if (otmp.otyp === POT_FRUIT_JUICE) {
        const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
        player.uhunger = (player.uhunger || 0) + (otmp.odiluted ? 5 : 10) * (2 + bcsign);
        await newuhs(player, false);
        return false;
    }
    if (!otmp.cursed) {
        await make_blinded(player, 0, true);
    }
    const seeInvisProp = player.ensureUProp(SEE_INVIS);
    if (otmp.blessed) {
        seeInvisProp.intrinsic = Number(seeInvisProp.intrinsic || 0) | FROMOUTSIDE;
    } else {
        incr_itimeout(player, SEE_INVIS, rn1(100, 750));
    }
    set_mimic_blocking();
    see_monsters(activeMap());
    if (Number.isInteger(player?.x) && Number.isInteger(player?.y)) newsym(player.x, player.y, activeMap());
    if (msg && !isHeroBlind(player)) {
        await You("can see through yourself, but you are visible!");
        gp.potion_unkn--;
    }
    return false;
}

// cf. potion.c peffect_restore_ability()
async function peffect_restore_ability(player, otmp, display) {
    gp.potion_unkn++;
    if (otmp.cursed) {
        await pline("Ulch!  This makes you feel mediocre!");
        return true; // no RNG consumed
    }

    const attrs = Array.isArray(player.attributes) ? player.attributes : [];
    const attrMax = Array.isArray(player.attrMax) ? player.attrMax : attrs.slice();
    player.attributes = attrs;
    player.attrMax = attrMax;
    const hasUnfixableTrouble = attrs.some((v, idx) => Number(v || 0) < Number(attrMax[idx] || 0));
    await pline("Wow!  This makes you feel %s!",
        !otmp.blessed ? "good" : (hasUnfixableTrouble ? "better" : "great"));

    // C: i = rn2(A_MAX) — always consumed for starting point
    let i = rn2(A_MAX);
    // C: iterate attributes, restore ABASE to AMAX, one stat unless blessed
    for (let ii = 0; ii < A_MAX; ii++) {
        if (attrs[i] == null) attrs[i] = 10;
        if (attrMax[i] == null) attrMax[i] = attrs[i];
        if (attrs[i] < attrMax[i]) {
            attrs[i] = attrMax[i];
            player._botl = true;
            if (!otmp.blessed) break;
        }
        i = (i + 1) % A_MAX;
    }

    // C: potion (not spell) can restore lost levels; blessed restores all.
    if (otmp.otyp === POT_RESTORE_ABILITY
        && Number(player.ulevel || 1) < Number(player.ulevelmax || player.ulevel || 1)) {
        const levelDisplay = (display && typeof display.putstr_message === 'function')
            ? display
            : { putstr_message: async () => {} };
        do {
            await pluslvl(player, levelDisplay, false);
        } while (Number(player.ulevel || 1) < Number(player.ulevelmax || player.ulevel || 1)
                 && !!otmp.blessed);
    }

    return false;
}

// cf. potion.c peffect_gain_ability()
export async function peffect_gain_ability(player, otmp, display) {
    if (otmp.cursed) {
        // C: "Ulch! That potion tasted foul!" — no RNG consumed
        await pline("Ulch!  That potion tasted foul!");
        gp.potion_unkn++;
        return true;
    }
    const fixedAbil = player.uprops?.[FIXED_ABIL];
    if (fixedAbil && (fixedAbil.intrinsic || fixedAbil.extrinsic)) {
        gp.potion_nothing++;
        return false;
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

// cf. potion.c:768 — peffect_booze
export async function peffect_booze(player, otmp, display) {
    gp.potion_unkn++;
    const hallu = player.hallucinating || player.Hallucination;
    await pline("Ooph!  This tastes like %s%s!",
        otmp.odiluted ? "watered down " : "",
        hallu ? "dandelion wine" : "liquid fire");
    if (!otmp.blessed) {
        // C: d(2 + u.uhs, 8) where uhs = hunger state (0=satiated..5=fainting)
        const uhs = hungerStateForBooze(player);
        await make_confused(player, itimeout_incr(player.getPropTimeout(CONFUSION),
            c_d(2 + uhs, 8)), false);
    }
    // C: healup(1, 0, 0, 0) if not diluted
    if (!otmp.odiluted)
        await healup(player, 1, 0, false, false);
    // C: hunger += 10 * (2 + bcsign)
    const bcsign = otmp.blessed ? 1 : (otmp.cursed ? -1 : 0);
    player.uhunger = (player.uhunger || 0) + 10 * (2 + bcsign);
    await newuhs(player, false);
    await exercise(player, A_WIS, false);
    if (otmp.cursed) {
        // C: multi = -rnd(15) — pass out
        rnd(15); // RNG consumed for pass-out duration
    }
}

// cf. potion.c:714 — peffect_water
export async function peffect_water(player, otmp, display) {
    if (!otmp.blessed && !otmp.cursed) {
        // plain water
        await pline("This tastes like %s.", hliquid("water"));
        player.uhunger = (player.uhunger || 0) + rnd(10);
        // newuhs(FALSE) — hunger state update (not exported yet)
        return;
    }
    gp.potion_unkn++;
    const playerAlign = player.alignment ?? 0;
    const hasLycan = isValidPm(player?.ulycn);
    // C: mon_hates_blessings checks if player is undead or demon form
    const hatesBlessings = mon_hates_blessings(player);
    if (hatesBlessings || playerAlign === A_CHAOTIC) {
        if (otmp.blessed) {
            await pline("This burns like %s!", hliquid("acid"));
            await exercise(player, A_CON, false);
            // C: cure lycanthropy if applicable
            if (hasLycan) {
                const mdat = mons[player.ulycn];
                const mname = String(mdat?.mname || 'beast');
                await Your("affinity to %s disappears!", makeplural(mname));
                if (isCurrentlyLycanForm(player)) {
                    await you_unwere(player, false);
                }
                set_ulycn(player, -1);
            }
            const dmg = c_d(2, 6);
            const halfPhys = player.halfPhysDamage ? Math.max(1, Math.floor(dmg / 2)) : dmg;
            await losehp(halfPhys, "potion of holy water", KILLED_BY_AN, player, display, gstateGame);
        } else if (otmp.cursed) {
            await You_feel("quite proud of yourself.");
            await healup(player, c_d(2, 6), 0, false, false);
            if (hasLycan && !isUpolyd(player)) {
                await you_were(player);
            }
            await exercise(player, A_CON, true);
        }
    } else {
        if (otmp.blessed) {
            await You_feel("full of awe.");
            await make_sick(player, 0, null, true, SICK_ALL);
            await exercise(player, A_WIS, true);
            await exercise(player, A_CON, true);
            if (hasLycan) {
                await you_unwere(player, true);
            }
        } else {
            // cursed (unholy water) for non-chaotic
            if (playerAlign === A_LAWFUL) {
                await pline("This burns like %s!", hliquid("acid"));
                const dmg = c_d(2, 6);
                const halfPhys = player.halfPhysDamage ? Math.max(1, Math.floor(dmg / 2)) : dmg;
                await losehp(halfPhys, "potion of unholy water", KILLED_BY_AN, player, display, gstateGame);
            } else {
                await You_feel("full of dread.");
            }
            if (hasLycan && !isUpolyd(player)) {
                await you_were(player);
            }
            await exercise(player, A_CON, false);
        }
    }
}

// cf. potion.c:792 — peffect_enlightenment
export async function peffect_enlightenment(player, otmp, display) {
    if (otmp.cursed) {
        gp.potion_unkn++;
        await You("have an uneasy feeling...");
        await exercise(player, A_WIS, false);
    } else {
        if (otmp.blessed) {
            await adjattrib(player, A_INT, 1, false);
            await adjattrib(player, A_WIS, 1, false);
        }
        await do_enlightenment_effect(player, display);
    }
}

// cf. potion.c:1256 — peffect_oil
export async function peffect_oil(player, otmp, display) {
    let good_for_you = false;
    if (otmp.lamplit) {
        const playerData = player.youmonst?.data || player.data;
        if (playerData && likes_fire(playerData)) {
            await pline("Ahh, a refreshing drink.");
            good_for_you = true;
        } else {
            await You("burn your %s.", body_part(FACE));
            // C: vulnerable = !Fire_resistance || Cold_resistance
            const fireRes = player.hasProp(FIRE_RES);
            const coldRes = player.hasProp(COLD_RES);
            const vulnerable = !fireRes || coldRes;
            const dmg = c_d(vulnerable ? 4 : 2, 4);
            await losehp(dmg, "quaffing a burning potion of oil", KILLED_BY, player, display, gstateGame);
        }
        await burn_away_slime();
    } else if (otmp.cursed) {
        await pline("This tastes like castor oil.");
    } else {
        await pline("That was smooth!");
    }
    await exercise(player, A_WIS, good_for_you);
}

// ============================================================
// 5. Effect dispatcher
// ============================================================

// cf. potion.c peffects() — dispatch potion type to peffect_* handler
// Returns -1 normally, 0 for ECMD_OK, 1 for ECMD_TIME (monster_detection/object_detection).
async function peffects(player, otmp, display, map) {
    switch (otmp.otyp) {
    case POT_RESTORE_ABILITY:
        await peffect_restore_ability(player, otmp, display); break;
    case POT_HALLUCINATION:
        await peffect_hallucination(player, otmp, display); break;
    case POT_WATER:
        await peffect_water(player, otmp, display); break;
    case POT_BOOZE:
        await peffect_booze(player, otmp, display); break;
    case POT_ENLIGHTENMENT:
        await peffect_enlightenment(player, otmp, display); break;
    case POT_INVISIBILITY:
        await peffect_invisibility(player, otmp, display); break;
    case POT_SEE_INVISIBLE:
    case POT_FRUIT_JUICE:
        await peffect_see_invisible(player, otmp, display); break;
    case POT_PARALYSIS:
        await peffect_paralysis(player, otmp, display); break;
    case POT_SLEEPING:
        await peffect_sleeping(player, otmp, display); break;
    case POT_MONSTER_DETECTION:
        if (await peffect_monster_detection(otmp, map, player)) return 1;
        break;
    case POT_OBJECT_DETECTION:
        if (await peffect_object_detection(otmp, player)) return 1;
        break;
    case POT_SICKNESS:
        await peffect_sickness(player, otmp, display); break;
    case POT_CONFUSION:
        await peffect_confusion(player, otmp, display); break;
    case POT_GAIN_ABILITY:
        await peffect_gain_ability(player, otmp, display); break;
    case POT_SPEED:
        await peffect_speed(player, otmp, display); break;
    case POT_BLINDNESS:
        await peffect_blindness(player, otmp, display); break;
    case POT_GAIN_LEVEL:
        await peffect_gain_level(player, otmp, display); break;
    case POT_HEALING:
        await peffect_healing(player, otmp, display); break;
    case POT_EXTRA_HEALING:
        await peffect_extra_healing(player, otmp, display); break;
    case POT_FULL_HEALING:
        await peffect_full_healing(player, otmp, display); break;
    case POT_LEVITATION:
        await peffect_levitation(otmp, map, player); break;
    case POT_GAIN_ENERGY:
        await peffect_gain_energy(player, otmp, display); break;
    case POT_OIL:
        await peffect_oil(player, otmp, display); break;
    case POT_ACID:
        await peffect_acid(player, otmp, display); break;
    case POT_POLYMORPH:
        await peffect_polymorph(otmp, player); break;
    default:
        impossible("What a funny potion! (%d)", otmp.otyp);
        return 0;
    }
    return -1;
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
            fall_asleep(-rnd(5), false);
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
            fall_asleep(-rnd(5), false);
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

function getobjChoicesForPrompt(player, obj_ok) {
    const inv = Array.isArray(player?.inventory) ? player.inventory : [];
    const choices = [];
    for (const obj of inv) {
        if (!obj || typeof obj_ok !== 'function') continue;
        const verdict = obj_ok(obj);
        if (verdict !== GETOBJ_EXCLUDE) choices.push(obj);
    }
    return choices;
}

function buildGetobjPrompt(word, compactLetters) {
    return `What do you want to ${word}? [${compactLetters} or ?*] `;
}

function splitPromptForTopline(prompt, cols) {
    const limit = Math.max(1, cols - 1);
    if (prompt.length <= limit) return [prompt, ''];
    // C getobj prompt display wraps at terminal width without word-boundary
    // reflow; preserve exact character flow into row 1.
    const breakPoint = limit;
    const row0 = prompt.slice(0, breakPoint);
    const row1 = prompt.slice(breakPoint);
    return [row0, row1];
}

async function renderGetobjPromptTopline(display, prompt) {
    if (!display || typeof display.putstr_message !== 'function') return;
    if (typeof display.putstr !== 'function' || typeof display.clearRow !== 'function') {
        await display.putstr_message(prompt);
        return;
    }
    const cols = Number.isInteger(display.cols) ? display.cols : COLNO;
    const [row0, row1] = splitPromptForTopline(prompt, cols);
    display.clearRow(0);
    display.clearRow(1);
    display.putstr(0, 0, row0);
    if (row1) display.putstr(0, 1, row1);
    if (Object.hasOwn(display, 'topMessage')) display.topMessage = row0;
    if (Object.hasOwn(display, '_topMessageRow1')) {
        display._topMessageRow1 = row1 || undefined;
    }
    if (Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
    if (Object.hasOwn(display, 'moreMarkerActive')) display.moreMarkerActive = false;
    if (typeof display.setCursor === 'function') {
        if (row1) display.setCursor(Math.min(row1.length, cols - 1), 1);
        else display.setCursor(Math.min(row0.length, cols - 1), 0);
    }
}

async function getobj_prompt_local(word, obj_ok, display, player) {
    const choices = getobjChoicesForPrompt(player, obj_ok);
    if (!choices.length) return null;
    if (!display || typeof display.putstr_message !== 'function') {
        // Headless/unit fallback: choose first valid object when no prompt UI exists.
        return choices[0];
    }

    const letters = [];
    const seen = new Set();
    for (const obj of choices) {
        const invlet = typeof obj.invlet === 'string' ? obj.invlet : '';
        if (!invlet || seen.has(invlet)) continue;
        seen.add(invlet);
        letters.push(invlet);
    }
    const menuLetters = letters.join('');
    const compactLetters = compactInvletPromptChars(menuLetters);
    const prompt = buildGetobjPrompt(word, compactLetters);
    await renderGetobjPromptTopline(display, prompt);

    while (true) {
        const ch = await nhgetch();
        if (ch === 27) return null; // ESC
        const c = String.fromCharCode(ch);
        if (c === '?' || c === '*') {
            await renderGetobjPromptTopline(display, prompt);
            continue;
        }
        const chosen = choices.find((obj) => obj.invlet === c);
        if (chosen) return chosen;
    }
}

// cf. potion.c dodip() — dip command entry point
async function dodip(player, map, display) {
    // C ref: potion.c:2252-2358
    const pmap = activeMap(map);
    const hasPos = Number.isInteger(player?.x) && Number.isInteger(player?.y);
    const here = (pmap && player && hasPos) ? pmap.at(player.x, player.y) : null;
    const at_pool = !!(pmap && player && hasPos && is_pool(player.x, player.y, pmap));
    const at_fountain = !!(here && here.typ === FOUNTAIN);
    const at_sink = !!(here && IS_SINK(here.typ));

    // C chooses object first (dip target), then possibly asks about floor feature.
    const obj = await getobj_prompt_local(
        'dip',
        (o) => dip_ok(o) ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE,
        display,
        player
    );
    if (!obj) {
        await You("don't have anything to dip.");
        return false;
    }

    if (pmap && hasPos && can_reach_floor(player, pmap, false)) {
        const obuf = doname(obj, player);
        if (at_fountain) {
            const ans = await ynFunction(`Dip ${obuf} into the fountain?`, 'yn', 'n'.charCodeAt(0), display);
            if (ans === 'y'.charCodeAt(0)) {
                await dipfountain(obj, player, pmap, display, null);
                return true;
            }
        } else if (at_sink) {
            const ans = await ynFunction(`Dip ${obuf} into the sink?`, 'yn', 'n'.charCodeAt(0), display);
            if (ans === 'y'.charCodeAt(0)) {
                await dipsink(obj, player, pmap, display, null);
                return true;
            }
        } else if (at_pool) {
            // TODO(C-faithful): pool dipping path (water_damage/wash_hands etc.).
        }
    }

    const potion = await getobj_prompt_local(
        `dip ${doname(obj, player)} into`,
        (o) => (o && o.oclass === POTION_CLASS) ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE,
        display,
        player
    );
    if (!potion) {
        // C-like getobj messaging is object-specific for this prompt branch.
        const obuf = doname(obj, player);
        await You(`don't have anything to dip ${obuf} into.`);
        return false;
    }

    await potion_dip(player, obj, potion);
    return true;
}

// cf. potion.c dip_into() — alternate dip entry (potion selected first)
export async function dip_into(player, map, display, target = null) {
    // C ref: potion.c:2364-2391
    // Select potion first and then apply dip to provided/selected target object.
    const obj = target || getobj(
        'dip',
        (o) => dip_ok(o) ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE,
        0,
        player
    );
    if (!obj) {
        await You("don't have anything to dip.");
        return false;
    }
    const potion = getobj(
        'dip into',
        (o) => (o && o.oclass === POTION_CLASS) ? GETOBJ_SUGGEST : GETOBJ_EXCLUDE,
        0,
        player
    );
    if (!potion) {
        await You("don't have anything to dip into.");
        return false;
    }
    await potion_dip(player, obj, potion);
    return true;
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
        useupall(obj, player);
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
                useupall(obj, player);
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

// The quaffing path is handleQuaff → dopotion-equivalent → peffects (line ~937).

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
    const gameMap = activeMap(map);
    for (let x = 1; x < COLNO; x++) {
      for (let y = 0; y < ROWNO; y++) {
        const loc = gameMap?.at?.(x, y);
        if (!loc) continue;
        if (glyph_is_invisible(loc.glyph)) {
          unmap_object(x, y, gameMap);
          newsym(x, y, gameMap);
        }
        if (gameMap?.monsterAt?.(x, y)) gp.potion_unkn = 0;
      }
    }
    const heroUnderwater = !!(player.uinwater || player.underwater || player.Underwater);
    if (!player.uswallow && !heroUnderwater) {
      see_monsters(gameMap);
      if (gp.potion_unkn) await You_feel("lonely.");
      return 0;
    }
  }
  if (await monster_detect(otmp, 0, player, activeMap(), gstateGame?.display || gstateGame?.disp, gstateGame)) return 1;
  await exercise(player, A_WIS, true);
  return 0;
}

// Autotranslated from potion.c:950
export async function peffect_object_detection(otmp, player) {
  if (await object_detect(otmp, 0, player, activeMap(), gstateGame?.display || gstateGame?.disp, gstateGame)) return 1;
  await exercise(player, A_WIS, true);
  return 0;
}

// cf. potion.c:1160 — peffect_levitation
export async function peffect_levitation(otmp, map, player) {
    const prop = player.ensureUProp(LEVITATION);
    const hadLev = !!(player.getPropTimeout(LEVITATION) || prop.extrinsic);
    const blockedLev = !!(prop.blocked || 0);
    const gameRef = gstateGame || { disp: {} };
    const mapRef = activeMap(map);
    if (!hadLev && !blockedLev) {
        // C ref: set timeout to 1 first so float_up() sees active levitation.
        set_itimeout(player, LEVITATION, 1);
        await float_up(player, gameRef);
    } else {
        gp.potion_nothing++;
    }
    if (otmp.cursed) {
        // C ref: can't descend at will from cursed levitation.
        prop.intrinsic &= ~I_SPECIAL;
        if (!blockedLev) {
            const stway = await stairway_at(player.x, player.y);
            if (stway && stway.up) {
                // doup() side-effect path isn't ported here yet.
                gp.potion_nothing = 0;
            } else if (has_ceiling((player && player.uz) || (mapRef && mapRef.uz) || mapRef)) {
                const helm = player.helmet;
                let dmg = rnd(!helm ? 10 : !hard_helmet(helm) ? 6 : 3);
                if (player.halfPhysDamage) dmg = Math.max(1, Math.floor(dmg / 2));
                await You("hit your %s on the %s.", body_part(HEAD), ceiling(player.x, player.y, mapRef));
                await losehp(dmg, "colliding with the ceiling", KILLED_BY, player, gstateGame?.display, gstateGame);
                gp.potion_nothing = 0;
            }
        }
    } else if (otmp.blessed) {
        incr_itimeout(player, LEVITATION, rn1(50, 250));
        prop.intrinsic |= I_SPECIAL;
    } else {
        incr_itimeout(player, LEVITATION, rn1(140, 10));
    }
    player.levitating = !!(player.getPropTimeout(LEVITATION) || prop.extrinsic) && !blockedLev;
    const here = mapRef?.at?.(player.x, player.y);
    if (player.levitating && here && IS_SINK(here.typ)) {
        await spoteffects(
            false,
            player,
            mapRef || gstateGame?.map || null,
            gstateGame?.display || gstateGame?.disp || null,
            gstateGame || null,
        );
    }
    float_vs_flight(gameRef, player);
}

// Autotranslated from potion.c:1313
export async function peffect_polymorph(otmp, player) {
  await You_feel("a little %s.", (player?.Hallucination || player?.hallucinating || false) ? "normal" : "strange");
  // C: Unchanging = intrinsic|extrinsic property check
  const unchanging = player.uprops?.[UNCHANGING]?.extrinsic || player.uprops?.[UNCHANGING]?.intrinsic;
  if (!unchanging) {
    if (!otmp.blessed || (player.umonnum !== player.umonster)) await polyself(player, POLY_NOFLAGS);
    else {
      await polyself(player, POLY_CONTROLLED | POLY_LOW_CTRL);
      if (player.mtimedone && player.umonnum !== player.umonster) {
        // C macro parity: min(a, rn2(15)+10) may evaluate the rn2 expression
        // twice when the second arm is selected.
        const clampCandidate = rn2(15) + 10;
        if (player.mtimedone >= clampCandidate) {
          player.mtimedone = rn2(15) + 10;
        }
      }
    }
  }
}
