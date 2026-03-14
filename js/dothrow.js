// dothrow.js -- Throwing and firing mechanics, projectile physics
// cf. dothrow.c — multishot_class_bonus, throw_obj, ok_to_throw, throw_ok,
//                 dothrow, autoquiver, find_launcher, dofire, endmultishot,
//                 hitfloor, walk_path, hurtle_jump, hurtle_step, will_hurtle,
//                 mhurtle_step, hurtle, mhurtle, check_shop_obj,
//                 harmless_missile, toss_up, throwing_weapon,
//                 sho_obj_return_to_u, throwit_return, swallowit,
//                 throwit_mon_hit, throwit, return_throw_to_inv, omon_adj,
//                 tmiss, should_mulch_missile, thitmonst, gem_accept,
//                 hero_breaks, breaks, release_camera_demon, breakobj,
//                 breaktest, breakmsg, throw_gold
//
// dothrow.c handles all throwing and firing mechanics:
//   dothrow(): #throw command -- select object, choose direction, execute throw.
//   dofire(): #fire command -- throw from quiver slot.
//   throwit(): core throw execution including hit resolution and landing.
//   thitmonst(): thrown object hitting a monster with full combat mechanics.
//   hurtle(): move hero through air after kick or impact.
//   breakobj()/breaktest(): object breakage mechanics.

import { ACCESSIBLE, isok, xdir, ydir, W_WEP, W_QUIVER, W_SWAPWEP,
         ERODE_CRACK, EF_DESTROY, EF_VERBOSE, ER_DESTROYED,
         DIRECTION_KEYS } from './const.js';
import { IS_SOFT, ZAP_POS,
         RACE_ELF, RACE_ORC } from './const.js';
import { S_boomleft, S_boomright, defsyms } from './symbols.js';
import { rn2, rnd, rnl } from './rng.js';
import { more, nhgetch } from './input.js';
import { objectData, WEAPON_CLASS, COIN_CLASS, GEM_CLASS, TOOL_CLASS,
         ARMOR_CLASS, POTION_CLASS, SCROLL_CLASS, VENOM_CLASS,
         FLINT, ROCK, SLING, BULLWHIP, BOOMERANG, AKLYS, WAR_HAMMER,
         BOULDER, HEAVY_IRON_BALL,
         EGG, CREAM_PIE, MELON,
         MIRROR, EXPENSIVE_CAMERA, CRYSTAL_BALL, LENSES,
         POT_WATER,
         ACID_VENOM, BLINDING_VENOM,
         YA, YUMI, ELVEN_ARROW, ORCISH_ARROW, ELVEN_BOW, ORCISH_BOW,
         RUBBER_HOSE, BAG_OF_TRICKS, SACK, OILSKIN_SACK, BAG_OF_HOLDING,
         EUCALYPTUS_LEAF, KELP_FROND, SPRIG_OF_WOLFSBANE, FORTUNE_COOKIE, PANCAKE,
         WAN_STRIKING,
         GLASS, GEMSTONE, MINERAL, CLOTH,
         PIERCE,
       } from './objects.js';
import { compactInvletPromptChars, renderOverlayMenuUntilDismiss, buildInventoryOverlayLines } from './invent.js';
import { doname, next_ident, xname, is_crackable } from './mkobj.js';
import { x_monnam, is_unicorn, nohands, notake } from './mondata.js';
import { obj_resists } from './objdata.js';
import { uwepgone, uswapwepgone, uqwepgone, handleSwapWeapon, setuqwep } from './wield.js';
import { placeFloorObject } from './invent.js';
import { pline } from './pline.js';
import { sgn, distmin } from './hacklib.js';
import { Monnam, a_monnam, mon_nam } from './do_name.js';
import { wakeup, setmangry } from './mon.js';
import { MZ_MEDIUM, MZ_HUGE, PM_HOMUNCULUS, PM_IMP, mons,
         PM_WIZARD, PM_CAVE_DWELLER, PM_HEALER, PM_TOURIST,
         PM_MONK, PM_RANGER, PM_ROGUE, PM_SAMURAI } from './monsters.js';
import { hitval, dmgval, weapon_hit_bonus, weapon_type } from './weapon.js';
import { find_mac } from './worn.js';
import { spec_abon } from './artifact.js';
import { is_weptool, Has_contents } from './objnam.js';
import { erode_obj } from './trap.js';
import { goodpos } from './teleport.js';
import { mpickobj } from './steal.js';
import { newsym, flush_screen, canSeeMonsterForMap } from './display.js';
import { makemon, makemon_appear, set_malign } from './makemon.js';
import { exercise } from './attrib_exercise.js';
import { acurr, change_luck } from './attrib.js';
import { A_STR, A_DEX } from './const.js';
import {
    tmp_at, tmp_at_end_async, nh_delay_output,
} from './animation.js';
import { DISP_FLASH, DISP_TETHER, DISP_END, BACKTRACK } from './const.js';
import { u_wipe_engr } from './engrave.js';
import { confdir } from './hack.js';
import { shop_keeper, in_rooms, costly_spot, is_unpaid,
         stolen_value, contained_gold, subfrombill, donate_gold, sellobj } from './shk.js';
import { potionhit, potionbreathe } from './potion.js';
import { SHOPBASE, OBJ_MINVENT, MM_NOMSG,
         P_DAGGER, P_KNIFE, P_SHORT_SWORD, P_SABER, P_SPEAR,
         P_BOW, P_SLING, P_CROSSBOW, P_DART, P_SHURIKEN, P_BOOMERANG } from './const.js';

// ============================================================================
// C macro equivalents -- weapon classification helpers
// cf. obj.h macros: is_ammo, is_missile, is_spear, is_blade, is_sword, etc.
// ============================================================================

// P_* skill constants imported from const.js

// C ref: include/display.h GLYPH_OBJ_OFF/obj_to_glyph().
// tmp_at event payloads are numeric glyph ids in C harness logs.
function objectTmpGlyph(otmp) {
    const otyp = Number.isInteger(otmp?.otyp) ? otmp.otyp : 0;
    const NUMMONS = Array.isArray(mons) ? mons.length : 0;
    const GLYPH_OBJ_OFF = (9 * NUMMONS) + 1;
    return GLYPH_OBJ_OFF + otyp;
}

// PIERCE imported from objects.js

// cf. obj.h: is_ammo(otmp)
export function is_ammo(otmp) {
    if (!otmp) return false;
    if (otmp.oclass !== WEAPON_CLASS && otmp.oclass !== GEM_CLASS) return false;
    const sk = objectData[otmp.otyp]?.oc_subtyp ?? 0;
    return sk >= -P_CROSSBOW && sk <= -P_BOW;
}

// cf. obj.h: is_missile(otmp)
export function is_missile(otmp) {
    if (!otmp) return false;
    if (otmp.oclass !== WEAPON_CLASS && otmp.oclass !== TOOL_CLASS) return false;
    const sk = objectData[otmp.otyp]?.oc_subtyp ?? 0;
    return sk >= -P_BOOMERANG && sk <= -P_DART;
}

// cf. obj.h: is_spear(otmp)
function is_spear(otmp) {
    return otmp && otmp.oclass === WEAPON_CLASS
        && (objectData[otmp.otyp]?.oc_subtyp ?? 0) === P_SPEAR;
}

// cf. obj.h: is_blade(otmp)
export function is_blade(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = objectData[otmp.otyp]?.oc_subtyp ?? 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

// cf. obj.h: is_sword(otmp)
function is_sword(otmp) {
    if (!otmp || otmp.oclass !== WEAPON_CLASS) return false;
    const sk = objectData[otmp.otyp]?.oc_subtyp ?? 0;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}

// is_weptool imported from objnam.js

// cf. obj.h: matching_launcher(a, l)
function matching_launcher(a, l) {
    if (!l) return false;
    return (objectData[a.otyp]?.oc_subtyp ?? 0) === -(objectData[l.otyp]?.oc_subtyp ?? 0);
}

// cf. obj.h: uslinging() -- player is wielding a sling
function uslinging_check(player) {
    return !!(player.weapon && (objectData[player.weapon.otyp]?.oc_subtyp ?? 0) === P_SLING);
}

// Helper: greatest_erosion(obj) -- cf. obj.h
export function greatest_erosion(obj) {
    return Math.max(obj.oeroded || 0, obj.oeroded2 || 0);
}

// change_luck imported from attrib.js

// Has_contents imported from objnam.js

// Breakflags constants (cf. hack.h)
const BRK_FROM_INV = 1;
const BRK_KNOWN2BREAK = 4;
const BRK_KNOWN2NOTBREAK = 8;
const BRK_KNOWN_OUTCOME = BRK_KNOWN2BREAK | BRK_KNOWN2NOTBREAK;

// C ref: dothrow.c ammo_and_launcher() for dofire fireassist behavior.
export function ammoAndLauncher(ammo, launcher) {
    if (!ammo || !launcher) return false;
    if ((ammo.otyp === FLINT || ammo.otyp === ROCK) && launcher.otyp === SLING) {
        return true;
    }
    const ammoSub = objectData[ammo.otyp]?.oc_subtyp;
    const launcherSub = objectData[launcher.otyp]?.oc_subtyp;
    return Number.isInteger(ammoSub)
        && Number.isInteger(launcherSub)
        && ammoSub < 0
        && launcherSub === -ammoSub;
}

// cf. dothrow.c ammo_and_launcher() -- C macro version using is_ammo + matching_launcher
export function ammo_and_launcher(a, l) {
    return is_ammo(a) && matching_launcher(a, l);
}

export async function promptDirectionAndThrowItem(player, map, display, item, { fromFire = false, game = null } = {}) {
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    replacePromptMessage();
    await display.putstr_message('In what direction? ');
    const dirCh = await nhgetch();
    const dch = String.fromCharCode(dirCh);
    let dir = DIRECTION_KEYS[dch];
    if (!dir && (dirCh === 10 || dirCh === 13)) {
        dir = DIRECTION_KEYS.j;
    }
    if (!dir) {
        replacePromptMessage();
        return { moved: false, tookTime: false };
    }
    player.dx = dir[0];
    player.dy = dir[1];
    player.dz = 0;
    // C ref: getdir() calls confdir() to randomize direction if confused/stunned.
    confdir(false, player);
    // C ref: throw/firing direction commands smudge floor engravings before resolve.
    await u_wipe_engr(player, map, 2);
    replacePromptMessage();
    if (
        player.armor === item
        || player.shield === item
        || player.helmet === item
        || player.gloves === item
        || player.boots === item
        || player.cloak === item
    ) {
        await display.putstr_message('You cannot throw something you are wearing.');
        return { moved: false, tookTime: false };
    }
    // C ref: dothrow.c dothrow() — split item from stack, remove from inventory,
    // then delegate to throwit() for trajectory + hit resolution.
    let wep_mask = 0;
    if (player.weapon === item) wep_mask |= W_WEP;
    if (player.swapWeapon === item) wep_mask |= W_SWAPWEP;
    if (player.quiver === item) wep_mask |= W_QUIVER;
    let thrownItem = item;
    if ((item.quan || 1) > 1) {
        item.quan = (item.quan || 1) - 1;
        thrownItem = { ...item, quan: 1, o_id: next_ident() };
    } else {
        player.removeFromInventory(item);
        if (player.weapon === item) uwepgone(player);
        if (player.swapWeapon === item) uswapwepgone(player);
        if (player.quiver === item) uqwepgone(player);
    }
    thrownItem._thrownByPlayer = true;
    await throwit(thrownItem, wep_mask, false, null, player, map, game);
    return { moved: false, tookTime: true };
}

// Handle throwing
// C ref: dothrow()
export async function handleThrow(player, map, display, game) {
    if (!player.inventory || player.inventory.length === 0) {
        await display.putstr_message("You don't have anything to throw.");
        return { moved: false, tookTime: false };
    }
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const equippedItems = new Set([
        player.armor, player.shield, player.helmet,
        player.gloves, player.boots, player.cloak,
        player.amulet, player.leftRing, player.rightRing,
    ].filter(Boolean));
    const invSorted = [...(player.inventory || [])]
        .filter((o) => o?.invlet)
        .sort((a, b) => String(a.invlet).localeCompare(String(b.invlet)));
    const uslinging = !!(player.weapon && player.weapon.otyp === SLING);
    const promptItems = invSorted.filter((o) => {
        if (!o || equippedItems.has(o)) return false;
        // C-faithful: getobj("throw") allows weapon-slot items (wielded/swap/quiver)
        // to be considered, but excludes non-weapon worn equipment.
        if (o.owornmask && !(o.owornmask & (W_WEP | W_SWAPWEP | W_QUIVER))) return false;
        if (o.oclass === COIN_CLASS) return true;
        if (!uslinging && o.oclass === WEAPON_CLASS && o !== player.weapon) return true;
        if (uslinging && o.oclass === GEM_CLASS) return true;
        return false;
    });
    const throwLetters = promptItems.map((o) => String(o.invlet)).join('');
    const throwChoices = compactInvletPromptChars(throwLetters);
    const throwPrompt = throwChoices
        ? `What do you want to throw? [${throwChoices} or ?*] `
        : 'What do you want to throw? [*] ';
    await display.putstr_message(throwPrompt);
    while (true) {
        const ch = await nhgetch();
        let c = String.fromCharCode(ch);
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const invLines = [];
            let currentHeader = null;
            for (const itm of promptItems) {
                let header = 'Other';
                if (itm.oclass === WEAPON_CLASS) header = 'Weapons';
                else if (itm.oclass === COIN_CLASS) header = 'Coins';
                else if (itm.oclass === GEM_CLASS) header = 'Gems/Stones';
                else if (itm.oclass === TOOL_CLASS) header = 'Tools';
                if (header !== currentHeader) {
                    invLines.push(header);
                    currentHeader = header;
                }
                let invName;
                if (itm.oclass === COIN_CLASS) {
                    const count = itm.quan || player.gold || 0;
                    invName = `${count} ${count === 1 ? 'gold piece' : 'gold pieces'}`;
                } else {
                    invName = doname(itm, player);
                }
                invLines.push(`${itm.invlet} - ${invName}`);
            }
            invLines.push('(end)');
            const selection = await renderOverlayMenuUntilDismiss(display, invLines, throwLetters);
            replacePromptMessage();
            await display.putstr_message(throwPrompt);
            if (!selection) continue;
            c = selection;
        }
        if (c === '-') {
            replacePromptMessage();
            await display.putstr_message('You mime throwing something.');
            return { moved: false, tookTime: false };
        }
        const selItem = player.inventory.find(o => o.invlet === c);
        if (!selItem) {
            replacePromptMessage();
            await display.putstr_message("You don't have that object.");
            await more(display, { site: 'dothrow.handleThrow.invalidInvlet.more' });
            replacePromptMessage();
            await display.putstr_message(throwPrompt);
            continue;
        }
        return await promptDirectionAndThrowItem(player, map, display, selItem, { game });
    }
}

export async function handleFire(player, map, display, game) {
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const weapon = player.weapon || null;
    const weaponSkill = weapon ? objectData[weapon.otyp]?.oc_subtyp : null;
    const wieldingPolearm = !!weapon
        && weapon.oclass === WEAPON_CLASS
        && (weaponSkill === 18 || weaponSkill === 19);

    if (!player.quiver && wieldingPolearm) {
        await display.putstr_message("Don't know what to hit.");
        return { moved: false, tookTime: false };
    }

    if (!player.quiver && weapon && weapon.otyp === BULLWHIP) {
        await display.putstr_message('In what direction? ');
        const dirCh = await nhgetch();
        const dch = String.fromCharCode(dirCh);
        const dir = DIRECTION_KEYS[dch];
        if (!dir) {
            replacePromptMessage();
            if (!game?.wizard) {
                await display.putstr_message('What a strange direction!  Never mind.');
            }
            return { moved: false, tookTime: false };
        }
        replacePromptMessage();
        return { moved: false, tookTime: false };
    }

    const inventory = player.inventory || [];
    const fireLetters = [];
    const quiverItem = player.quiver && inventory.includes(player.quiver)
        ? player.quiver : null;
    const hasRunTurnHook = typeof game?.advanceRunTurn === 'function';
    let deferredTimedTurn = false;
    if (quiverItem && game?.flags?.fireassist !== false) {
        const weaponMatches = ammoAndLauncher(quiverItem, player.weapon);
        const swapMatches = ammoAndLauncher(quiverItem, player.swapWeapon);
        if (!weaponMatches && swapMatches) {
            const swapResult = await handleSwapWeapon(player, display);
            if (swapResult?.tookTime) {
                if (hasRunTurnHook) {
                    await game.advanceRunTurn();
                    if (game?.fov && typeof game.fov.compute === 'function'
                        && typeof display?.renderMap === 'function') {
                        game.fov.compute(map, player.x, player.y);
                        display.renderMap(map, player, game.fov);
                        if (typeof display.renderStatus === 'function') {
                            display.renderStatus(player);
                        }
                    }
                } else {
                    deferredTimedTurn = true;
                }
            }
        }
    }
    if (quiverItem) {
        const throwResult = await promptDirectionAndThrowItem(player, map, display, quiverItem, { fromFire: true, game });
        if (deferredTimedTurn && !throwResult?.tookTime) {
            return { ...(throwResult || { moved: false, tookTime: false }), tookTime: true };
        }
        return throwResult;
    }
    const autoquiverEnabled = !!game?.flags?.autoquiver;
    if (!autoquiverEnabled) {
        // C ref: dothrow.c dofire(): when no quiver and autoquiver is off,
        // emit this message before prompting for what to fire.
        await display.putstr_message('You have no ammunition readied.');
        await more(display, { game, site: 'dothrow.no-quiver.more' });
    } else {
        autoquiver(player);
        if (player.quiver && inventory.includes(player.quiver)) {
            const throwResult = await promptDirectionAndThrowItem(player, map, display, player.quiver, { fromFire: true, game });
            if (deferredTimedTurn && !throwResult?.tookTime) {
                return { ...(throwResult || { moved: false, tookTime: false }), tookTime: true };
            }
            return throwResult;
        }
        await display.putstr_message('You have nothing appropriate for your quiver.');
        await more(display, { game, site: 'dothrow.no-autoquiver.more' });
    }
    const isLauncher = (o) => {
        if (o.oclass !== WEAPON_CLASS) return false;
        const sk = objectData[o.otyp]?.oc_subtyp ?? 0;
        return sk >= 20 && sk <= 22;
    };
    const isAmmo = (o) => {
        if (o.oclass !== WEAPON_CLASS && o.oclass !== GEM_CLASS) return false;
        const sk = objectData[o.otyp]?.oc_subtyp ?? 0;
        return sk >= -22 && sk <= -20;
    };
    for (const itm of inventory) {
        if (!itm?.invlet) continue;
        if (itm === player.weapon) {
            if ((itm.quan || 1) > 1) fireLetters.push(itm.invlet);
            continue;
        }
        if (isAmmo(itm)) {
            if (ammoAndLauncher(itm, player.weapon)
                || ammoAndLauncher(itm, player.swapWeapon)) {
                fireLetters.push(itm.invlet);
            }
        } else if (isLauncher(itm)) {
            // Launchers: downplay
        } else if (itm.oclass === WEAPON_CLASS || itm.oclass === COIN_CLASS) {
            fireLetters.push(itm.invlet);
        }
    }
    const fireChoices = compactInvletPromptChars(fireLetters.join(''));
    const firePrompt = fireChoices
        ? `What do you want to fire? [${fireChoices} or ?*] `
        : 'What do you want to fire? [*] ';
    await display.putstr_message(firePrompt);
    let pendingCount = '';
    while (true) {
        const ch = await nhgetch();
        let c = String.fromCharCode(ch);
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c >= '0' && c <= '9') {
            if (pendingCount.length === 0) {
                pendingCount = c;
            } else {
                pendingCount += c;
                replacePromptMessage();
                await display.putstr_message(`Count: ${pendingCount}`);
            }
            continue;
        }
        if (c === '?' || c === '*') {
            replacePromptMessage();
            const lines = buildInventoryOverlayLines(player);
            const allInvLetters = (player.inventory || [])
                .filter((o) => o && o.invlet)
                .map((o) => o.invlet)
                .join('');
            const menuSelection = await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
            if (menuSelection) {
                c = menuSelection;
                // Fall through to item processing below.
            } else {
                replacePromptMessage();
                await display.putstr_message(firePrompt);
                continue;
            }
        }
        const selected = inventory.find((itm) => itm?.invlet === c);
        if (selected) {
            if (selected === player.weapon) {
                replacePromptMessage();
                await display.putstr_message('You are wielding that.  Ready it instead? [ynq] (q) ');
                while (true) {
                    const ans = await nhgetch();
                    const a = String.fromCharCode(ans).toLowerCase();
                    if (ans === 27 || ans === 10 || ans === 13 || a === ' ' || a === 'q' || a === 'n') {
                        replacePromptMessage();
                        await display.putstr_message(`Your ${selected.name} remains wielded.`);
                        return { moved: false, tookTime: false };
                    }
                    if (a === 'y') break;
                }
            }
            const replacingQuiver = (player.quiver !== selected);
            setuqwep(player, selected);
            if (replacingQuiver) {
                const savedQuiver = player.quiver;
                player.quiver = null;
                const readyName = doname(selected, player);
                player.quiver = savedQuiver;
                await display.putstr_message(`You ready: ${selected.invlet} - ${readyName}.`);
                await more(display, { game, site: 'dothrow.ready-from-fire.more' });
            }
            return await promptDirectionAndThrowItem(player, map, display, selected, { fromFire: true, game });
        }
        await display.putstr_message("You don't have that object.");
        await more(display, { game, site: 'dothrow.handleFire.invalidInvlet.more' });
        replacePromptMessage();
        await display.putstr_message(firePrompt);
    }
}

// ============================================================================
// Ported C functions
// ============================================================================

// cf. dothrow.c:38 -- multishot_class_bonus(pm, ammo, launcher)
export function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = objectData[ammo.otyp]?.oc_subtyp ?? 0;
    switch (pm) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR) multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN) multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER) multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER) multishot++;
        break;
    case PM_SAMURAI:
        if (ammo.otyp === YA && launcher && launcher.otyp === YUMI) multishot++;
        break;
    default:
        break;
    }
    return multishot;
}

// cf. dothrow.c:86 [static] -- throw_obj(obj, shotlimit)
function throw_obj(player, obj, shotlimit) {
    let multishot = 1;
    const skill = objectData[obj.otyp]?.oc_subtyp ?? 0;
    const uwep = player.weapon;
    if ((obj.quan || 1) > 1
        && (is_ammo(obj) ? matching_launcher(obj, uwep) : obj.oclass === WEAPON_CLASS)) {
        const roleMnum = player.roleMnum ?? 0;
        const weakmultishot = (roleMnum === PM_WIZARD || roleMnum === PM_CAVE_DWELLER
            || (roleMnum === PM_HEALER && skill !== P_KNIFE)
            || (roleMnum === PM_TOURIST && skill !== -P_DART)
            || acurr(player, A_DEX) <= 6);
        const pskill = player.skills?.[weapon_type(obj)] || 0;
        if (pskill >= 4) { multishot++; if (!weakmultishot) multishot++; }
        else if (pskill >= 3) { if (!weakmultishot) multishot++; }
        multishot += multishot_class_bonus(roleMnum, obj, uwep);
        if (!weakmultishot) {
            const race = player.race ?? 0;
            if (race === RACE_ELF && obj.otyp === ELVEN_ARROW && uwep && uwep.otyp === ELVEN_BOW) multishot++;
            else if (race === RACE_ORC && obj.otyp === ORCISH_ARROW && uwep && uwep.otyp === ORCISH_BOW) multishot++;
        }
        if (multishot > 1 && skill === -P_CROSSBOW
            && ammo_and_launcher(obj, uwep) && acurr(player, A_STR) < 18)
            multishot = rnd(multishot);
        multishot = rnd(multishot);
        if (multishot > (obj.quan || 1)) multishot = obj.quan || 1;
        if (shotlimit > 0 && multishot > shotlimit) multishot = shotlimit;
    }
    return multishot;
}

// cf. dothrow.c:296 [static] -- ok_to_throw(shotlimit_p)
async function ok_to_throw(player, command_count) {
    const shotlimit = Math.max(0, command_count || 0);
    if (player.polyData && notake(player.polyData)) {
        await pline("You are physically incapable of throwing or shooting anything.");
        return { ok: false, shotlimit };
    }
    if (player.polyData && nohands(player.polyData)) {
        await pline("You can't throw or shoot without hands.");
        return { ok: false, shotlimit };
    }
    return { ok: true, shotlimit };
}

// cf. dothrow.c:316 [static] -- throw_ok(obj)
function throw_ok(obj, player) {
    if (!obj) return 0;
    if (obj.bknown && obj.welded) return 2;
    if (obj.otyp === BOOMERANG || obj.otyp === AKLYS) return 1;
    if ((obj.quan || 1) === 1 && (obj === player.weapon || obj === player.swapWeapon)) return 2;
    if (obj.oclass === COIN_CLASS) return 1;
    if (!uslinging_check(player) && obj.oclass === WEAPON_CLASS) return 1;
    if (uslinging_check(player) && obj.oclass === GEM_CLASS) return 1;
    return 2;
}

// cf. dothrow.c:380 [static] -- autoquiver(player)
function autoquiver(player) {
    if (player.quiver) return;
    let oammo = null, omissile = null, omisc = null, altammo = null;
    const uwep = player.weapon;
    const uswapwep = player.swapWeapon;
    for (const otmp of (player.inventory || [])) {
        if (!otmp) continue;
        if (otmp.owornmask || otmp.oartifact || !otmp.dknown) {
            continue;
        } else if (otmp.otyp === ROCK
                   || (otmp.otyp === FLINT && objectData[otmp.otyp]?.known)
                   || (otmp.oclass === GEM_CLASS
                       && (objectData[otmp.otyp]?.oc_material ?? 0) === GLASS
                       && objectData[otmp.otyp]?.known)) {
            if (uslinging_check(player)) oammo = otmp;
            else if (ammo_and_launcher(otmp, uswapwep)) altammo = otmp;
            else if (!omisc) omisc = otmp;
        } else if (otmp.oclass === GEM_CLASS) {
            continue;
        } else if (is_ammo(otmp)) {
            if (ammo_and_launcher(otmp, uwep)) oammo = otmp;
            else if (ammo_and_launcher(otmp, uswapwep)) altammo = otmp;
            else omisc = otmp;
        } else if (is_missile(otmp)) {
            omissile = otmp;
        } else if (otmp.oclass === WEAPON_CLASS && throwing_weapon(otmp)) {
            if ((objectData[otmp.otyp]?.oc_subtyp ?? 0) === P_DAGGER && !omissile) omissile = otmp;
            else if (otmp.otyp === AKLYS) continue;
            else omisc = otmp;
        }
    }
    if (oammo) setuqwep(player, oammo);
    else if (omissile) setuqwep(player, omissile);
    else if (altammo) setuqwep(player, altammo);
    else if (omisc) setuqwep(player, omisc);
}

// cf. dothrow.c:446 [static] -- find_launcher(ammo, player)
function find_launcher(ammo, player) {
    if (!ammo) return null;
    let oX = null;
    for (const otmp of (player.inventory || [])) {
        if (!otmp) continue;
        if (otmp.cursed && otmp.bknown) continue;
        if (ammo_and_launcher(ammo, otmp)) {
            if (otmp.bknown) return otmp;
            if (!oX) oX = otmp;
        }
    }
    return oX;
}

// cf. dothrow.c:589 -- endmultishot(verbose, m_shot)
async function endmultishot(verbose, m_shot) {
    if (!m_shot) return;
    if (m_shot.i < m_shot.n) {
        if (verbose) {
            const ord = m_shot.i === 1 ? '1st' : m_shot.i === 2 ? '2nd'
                : m_shot.i === 3 ? '3rd' : `${m_shot.i}th`;
            await pline(`You stop ${m_shot.s ? 'firing' : 'throwing'} after the ${ord} ${m_shot.s ? 'shot' : 'toss'}.`);
        }
        m_shot.n = m_shot.i;
    }
}

// cf. dothrow.c:605 -- hitfloor(obj, verbosely, player, map)
export async function hitfloor(obj, verbosely, player, map) {
    const ux = player.x, uy = player.y;
    const loc = typeof map.at === 'function' ? map.at(ux, uy) : null;
    if (loc && (IS_SOFT(loc.typ) || player.uinwater || player.uswallow)) {
        obj.ox = ux; obj.oy = uy;
        placeFloorObject(map, obj);
        return;
    }
    if (verbosely && loc) {
        const verb = (obj.otyp === WAN_STRIKING) ? 'strikes' : 'hits';
        await pline(`The ${xname(obj)} ${verb} the floor.`);
    }
    if (await hero_breaks(obj, ux, uy, BRK_FROM_INV, player, map)) return;
    obj.ox = ux; obj.oy = uy;
    placeFloorObject(map, obj);
}

// cf. dothrow.c:655 -- walk_path(src_cc, dest_cc, check_proc, arg)
export function walk_path(src_cc, dest_cc, check_proc, arg) {
    let dx = dest_cc.x - src_cc.x;
    let dy = dest_cc.y - src_cc.y;
    let prev_x = src_cc.x, prev_y = src_cc.y;
    let x = src_cc.x, y = src_cc.y;
    let x_change, y_change;
    if (dx < 0) { x_change = -1; dx = -dx; } else { x_change = 1; }
    if (dy < 0) { y_change = -1; dy = -dy; } else { y_change = 1; }
    let i = 0, err = 0;
    let keep_going = true;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x; prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) { x += x_change; err -= dy << 1; }
            if (!(keep_going = check_proc(arg, x, y))) break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x; prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) { y += y_change; err -= dx << 1; }
            if (!(keep_going = check_proc(arg, x, y))) break;
        }
    }
    if (keep_going) return true;
    dest_cc.x = prev_x; dest_cc.y = prev_y;
    return false;
}

// cf. dothrow.c:741 -- hurtle_jump(arg, x, y)
export async function hurtle_jump(arg, x, y) {
    const save = arg._ewwalking_special || false;
    arg._ewwalking_special = true;
    const res = await hurtle_step(arg, x, y);
    arg._ewwalking_special = save;
    return res;
}

// cf. dothrow.c:772 -- hurtle_step(arg, x, y)
export async function hurtle_step(arg, x, y) {
    const { player, map } = arg;
    if (!isok(x, y)) { await pline("You feel the spirits holding you back."); return false; }
    if (arg.range <= 0) return false;
    const loc = typeof map.at === 'function' ? map.at(x, y) : null;
    if (!loc) return false;
    if (loc.typ !== undefined && !ACCESSIBLE(loc.typ)) {
        await pline("Ouch!");
        rnd(2 + arg.range); // consume RNG for damage
        return false;
    }
    const mon = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mon) {
        await pline(`You bump into ${a_monnam(mon)}.`);
        wakeup(mon, false, map, player);
        setmangry(mon, false, map, player);
        return false;
    }
    player.x = x; player.y = y;
    if (--arg.range < 0) arg.range = 0;
    return true;
}

// cf. dothrow.c:976 -- will_hurtle(mon, x, y, map, player)
export function will_hurtle(mon, x, y, map, player) {
    if (!isok(x, y)) return false;
    const data = mon.data || (mons ? mons[mon.mndx] : null) || {};
    if ((data.msize || 0) >= MZ_HUGE || mon.mtrapped) return false;
    return goodpos(x, y, mon, 0, map, player);
}

// cf. dothrow.c:991 [static] -- mhurtle_step(mon, x, y, map, player)
async function mhurtle_step(mon, x, y, map, player) {
    if (!isok(x, y)) return false;
    if (will_hurtle(mon, x, y, map, player)) {
        const _omx = mon.mx, _omy = mon.my;
        if (typeof map.removeMonster === 'function') map.removeMonster(mon.mx, mon.my);
        mon.mx = x; mon.my = y;
        if (typeof map.placeMonster === 'function') map.placeMonster(mon, x, y);
        newsym(_omx, _omy);
        newsym(x, y);
        return true;
    }
    const mtmp = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mtmp && mtmp !== mon) {
        // C ref: dothrow.c mhurtle_step(): only print bump message when at
        // least one of the two monsters is visible to the hero.
        if (canSeeMonsterForMap(mon, map, player, null)
            || canSeeMonsterForMap(mtmp, map, player, null)) {
            await pline(`${Monnam(mon)} bumps into ${a_monnam(mtmp)}.`);
        }
        wakeup(mtmp, true, map, player);
    } else if (player && x === player.x && y === player.y) {
        await pline(`${Monnam(mon)} bumps into you.`);
    }
    return false;
}

// cf. dothrow.c:1077 -- hurtle(dx, dy, range, verbose, player, map)
export async function hurtle(dx, dy, range, verbose, player, map) {
    if (player.utrap) { await pline("You are anchored by the trap."); return; }
    dx = sgn(dx); dy = sgn(dy);
    if (!range || (!dx && !dy)) return;
    if (verbose) await pline(`You ${range > 1 ? 'hurtle' : 'float'} in the opposite direction.`);
    await endmultishot(true, player._m_shot);
    const uc = { x: player.x, y: player.y };
    const cc = { x: player.x + dx * range, y: player.y + dy * range };
    const arg = { range, player, map };
    walk_path(uc, cc, async (a, hx, hy) => await hurtle_step(a, hx, hy), arg);
}

// cf. dothrow.c:1129 -- mhurtle(mon, dx, dy, range, map, player)
export async function mhurtle(mon, dx, dy, range, map, player) {
    wakeup(mon, true, map, player);
    mon.movement = 0; mon.mstun = 1;
    const data = mon.data || (mons ? mons[mon.mndx] : null) || {};
    if ((data.msize || 0) >= MZ_HUGE || mon.mtrapped) {
        await pline(`${Monnam(mon)} doesn't budge!`);
        return;
    }
    dx = sgn(dx); dy = sgn(dy);
    if (!range || (!dx && !dy)) return;
    if (mon.mundetected) mon.mundetected = 0;
    const mc = { x: mon.mx, y: mon.my };
    const cc = { x: mon.mx + dx * range, y: mon.my + dy * range };
    walk_path(mc, cc, async (_a, hx, hy) => await mhurtle_step(mon, hx, hy, map, player), mon);
}

// cf. dothrow.c:1180 [static] -- check_shop_obj(obj, x, y, broken)
// Autotranslated from dothrow.c:1180
export async function check_shop_obj(obj, x, y, broken, player, map) {
  let costly_xy, shkp = shop_keeper(map, player.ushops);
  if (!shkp) return;
  costly_xy = costly_spot(x, y, map);
  if (broken || !costly_xy || in_rooms(map, x, y, SHOPBASE) !== player.ushops) {
    if (is_unpaid(obj)) {
      await stolen_value(obj, player.x, player.y, shkp.mpeaceful, false, map);
    }
    if (broken) obj.no_charge = 1;
  }
  else if (costly_xy) {
    let oshops = in_rooms(map, x, y, SHOPBASE);
    if ( oshops === player.ushops || oshops === player.ushops0) {
      if (is_unpaid(obj)) {
        let gtg = Has_contents(obj) ? contained_gold(obj, true) : 0;
        subfrombill(obj, shkp);
        if (gtg > 0) await donate_gold(gtg, shkp, true);
      }
      else if (x !== shkp.mx || y !== shkp.my) { sellobj(obj, x, y, map); }
    }
  }
}

// cf. dothrow.c:1219 -- harmless_missile(obj)
export function harmless_missile(obj) {
    switch (obj.otyp) {
    case SLING: case EUCALYPTUS_LEAF: case KELP_FROND:
    case SPRIG_OF_WOLFSBANE: case FORTUNE_COOKIE: case PANCAKE:
        return true;
    case RUBBER_HOSE: case BAG_OF_TRICKS:
        return (obj.spe || 0) < 1;
    case SACK: case OILSKIN_SACK: case BAG_OF_HOLDING:
        return !Has_contents(obj);
    default:
        if (obj.oclass === SCROLL_CLASS) return true;
        if ((objectData[obj.otyp]?.oc_material ?? 0) === CLOTH) return true;
        break;
    }
    return false;
}

// cf. dothrow.c:1255 [static] -- toss_up(obj, hitsroof, player, map)
export async function toss_up(obj, hitsroof, player, map) {
    if (hitsroof) {
        if (breaktest(obj)) {
            await pline(`The ${xname(obj)} hits the ceiling.`);
            await breakmsg(obj, !player.blind);
            if (await breakobj(obj, player.x, player.y, true, true, player, map)) return false;
            await hitfloor(obj, false, player, map);
            return true;
        }
    }
    await pline(`The ${xname(obj)} hits the ceiling, then falls back on top of your head.`);
    if (obj.oclass === POTION_CLASS) {
        await potionhit(player, obj, 1, player, map); // POTHIT_HERO_THROW=1
        return false;
    } else if (breaktest(obj)) {
        await breakmsg(obj, !player.blind);
        if (await breakobj(obj, player.x, player.y, true, true, player, map)) return false;
        await hitfloor(obj, false, player, map);
    } else if (harmless_missile(obj)) {
        await pline("It doesn't hurt.");
        await hitfloor(obj, false, player, map);
    } else {
        let dmg = dmgval(obj, player);
        if (!dmg) {
            dmg = Math.floor(((obj.owt || 1) + 2) / 3);
            dmg = dmg <= 1 ? 1 : rnd(dmg);
            if (dmg > 6) dmg = 6;
        }
        await hitfloor(obj, true, player, map);
    }
    return true;
}

// cf. dothrow.c:1429 -- throwing_weapon(obj)
export function throwing_weapon(obj) {
    if (!obj) return false;
    return is_missile(obj) || is_spear(obj)
        || (is_blade(obj) && !is_sword(obj) && ((objectData[obj.otyp]?.oc_dir ?? 0) & PIERCE) !== 0)
        || obj.otyp === WAR_HAMMER || obj.otyp === AKLYS;
}

// C ref: zap.c boomhit() direction helpers.
function dirClamp8(i) {
    if (!Number.isInteger(i)) return 0;
    return ((i % 8) + 8) % 8;
}

function dirLeft8(i) {
    return dirClamp8(i + 1);
}

function dirRight8(i) {
    return dirClamp8(i - 1);
}

function xytod8(dx, dy) {
    for (let i = 0; i < 8; i++) {
        if (xdir[i] === dx && ydir[i] === dy) return i;
    }
    return -1;
}

function boomerangCmapGlyph(symIdx) {
    const sym = defsyms[symIdx];
    if (!sym || typeof sym.ch !== 'string' || sym.ch.length === 0) {
        return { ch: ')', color: 3 };
    }
    return {
        ch: sym.ch[0],
        color: Number.isInteger(sym.color) ? sym.color : 3,
    };
}

// C ref: zap.c boomhit() visual path.
async function boomhit_visual(obj, dx, dy, player, map, game) {
    const counterclockwise = true; // C default for right-handed hero.
    let x = player.x;
    let y = player.y;
    let i = xytod8(dx, dy);
    if (i < 0) {
        if (game?.bhitpos) {
            game.bhitpos = { x: game.bhitpos.x, y: game.bhitpos.y };
        }
        return;
    }

    let boom = counterclockwise ? S_boomleft : S_boomright;
    tmp_at(DISP_FLASH, boomerangCmapGlyph(boom));
    for (let ct = 0; ct < 10; ct++) {
        i = dirClamp8(i);
        boom = (S_boomleft + S_boomright - boom);
        tmp_at(DISP_CHANGE, boomerangCmapGlyph(boom));

        const stepDx = xdir[i];
        const stepDy = ydir[i];
        const nx = x + stepDx;
        const ny = y + stepDy;

        if (!isok(nx, ny)) break;
        const loc = map?.at?.(nx, ny);
        if (!loc || !ZAP_POS(loc.typ)) break;

        x = nx;
        y = ny;
        tmp_at(x, y);
        await nh_delay_output();

        if (ct % 5 !== 0) {
            i = counterclockwise ? dirLeft8(i) : dirRight8(i);
        }
    }
    tmp_at(DISP_END, 0);
    flush_screen(1); // C ref: dothrow.c:912 — flush after boomerang animation
    if (game) game.bhitpos = { x, y };
}

// cf. dothrow.c:1459 [static] -- throwit_return(clear_thrownobj, game)
function throwit_return(clear_thrownobj, game) {
    if (game) game.returning_missile = null;
    if (clear_thrownobj && game) game.thrownobj = null;
}

// cf. dothrow.c:1467 [static] -- swallowit(obj, player, game)
export function swallowit(obj, player, game) {
    if (player.ustuck) {
        mpickobj(player.ustuck, obj);
        throwit_return(false, game);
    } else {
        throwit_return(true, game);
    }
}

// cf. dothrow.c:1481 -- throwit_mon_hit(obj, mon, player, map, game)
export async function throwit_mon_hit(obj, mon, player, map, game) {
    if (mon) {
        if (mon.isshk && obj.where === OBJ_MINVENT && obj.ocarry === mon) return true;
        const obj_gone = await thitmonst(mon, obj, player, map, game);
        if (obj_gone && game) game.thrownobj = null;
    }
    return false;
}

// cf. dothrow.c:1509 -- throwit(obj, wep_mask, twoweap, oldslot, player, map, game)
export async function throwit(obj, wep_mask, twoweap, oldslot, player, map, game) {
    const uwep = player.weapon;
    const impaired = !!(player.confused || player.stunned || player.blind
        || player.hallucinating || player.fumbling);
    const tethered_weapon = obj.otyp === AKLYS && (wep_mask & W_WEP) !== 0;
    if ((obj.cursed || obj.greased) && (player.dx || player.dy) && !rn2(7)) {
        let slipok = true;
        if (ammo_and_launcher(obj, uwep)) {
            await pline(`The ${xname(obj)} misfires!`);
        } else {
            if (obj.greased || throwing_weapon(obj))
                await pline(`The ${xname(obj)} slips as you throw it!`);
            else slipok = false;
        }
        if (slipok) {
            player.dx = rn2(3) - 1;
            player.dy = rn2(3) - 1;
            if (!player.dx && !player.dy) player.dz = 1;
        }
    }
    if (game) { game.thrownobj = obj; obj.how_lost = 'thrown'; }

    if (player.dz) {
        if (player.dz < 0) await toss_up(obj, rn2(5), player, map);
        else await hitfloor(obj, true, player, map);
        throwit_return(true, game);
        return;
    }

    const crossbowing = ammo_and_launcher(obj, uwep) && weapon_type(uwep) === P_CROSSBOW;
    let urange = (crossbowing ? 18 : acurr(player, A_STR)) >> 1;
    let range;
    if (obj.otyp === HEAVY_IRON_BALL) range = urange - Math.floor((obj.owt || 0) / 100);
    else range = urange - Math.floor((obj.owt || 0) / 40);
    if (range < 1) range = 1;
    if (is_ammo(obj)) {
        if (ammo_and_launcher(obj, uwep)) {
            if (crossbowing) range = 8; else range++;
        } else if (obj.oclass !== GEM_CLASS) {
            range = Math.floor(range / 2);
        }
    }
    if (obj.otyp === BOULDER) range = 20;

    let hitMon = null;
    const dx = player.dx || 0, dy = player.dy || 0;
    let bx = player.x, by = player.y;
    const projGlyph = objectTmpGlyph(obj);
    let animationClosed = false;
    tmp_at(tethered_weapon ? DISP_TETHER : DISP_FLASH, projGlyph);
    try {
        for (let i = 0; i < range; i++) {
            const nx = bx + dx, ny = by + dy;
            if (!isok(nx, ny)) break;
            const loc = typeof map.at === 'function' ? map.at(nx, ny) : null;
            if (!loc || !ZAP_POS(loc.typ)) break;
            bx = nx; by = ny;
            // C ref: zap.c bhit() checks monster hit before tmp_at(x,y).
            // If thitmonst returns 0 (miss), object continues past the monster.
            const mon = map.monsterAt ? map.monsterAt(bx, by) : null;
            if (mon) {
                if (mon.isshk && obj.where === OBJ_MINVENT && obj.ocarry === mon) {
                    hitMon = mon; break;
                }
                // C ref: bhit() ends animation before calling fhitm callback
                tmp_at(DISP_END, 0);
                const obj_gone = await thitmonst(mon, obj, player, map, game);
                if (obj_gone) {
                    if (game) game.thrownobj = null;
                    hitMon = mon;
                    animationClosed = true;
                    break;
                }
                // miss: object flies past the monster, restart animation and continue
                tmp_at(tethered_weapon ? DISP_TETHER : DISP_FLASH, projGlyph);
                tmp_at(bx, by);
                await nh_delay_output();
                continue;
            }
            tmp_at(bx, by);
            await nh_delay_output();
        }
    } finally {
        if (!animationClosed) tmp_at(DISP_END, 0);
    }
    if (game) game.bhitpos = { x: bx, y: by };

    if (hitMon) { throwit_return(true, game); return; }
    if (game && !game.thrownobj) { throwit_return(false, game); return; }

    if (tethered_weapon) {
        const madeItBack = !!rn2(100);
        if (madeItBack) {
            animationClosed = true;
            await tmp_at_end_async(BACKTRACK);
            if (!impaired && rn2(100)) {
                return_throw_to_inv(obj, wep_mask, twoweap, oldslot, player);
                throwit_return(true, game);
                return;
            }
            obj.ox = player.x;
            obj.oy = player.y;
            placeFloorObject(map, obj);
            if (game) game.thrownobj = null;
            throwit_return(true, game);
            return;
        }
    } else if (obj.otyp === BOOMERANG) {
        // C ref: zap.c boomhit() — curving boomerang visual sequence.
        await boomhit_visual(obj, dx, dy, player, map, game);
    }

    const landLoc = typeof map.at === 'function' ? map.at(bx, by) : null;
    if (landLoc && !IS_SOFT(landLoc.typ) && breaktest(obj)) {
        await breakmsg(obj, true);
        if (await breakobj(obj, bx, by, true, true, player, map)) { throwit_return(true, game); return; }
    }
    obj.ox = bx; obj.oy = by;
    placeFloorObject(map, obj);
    if (game) game.thrownobj = null;
    throwit_return(false, game);
}

// cf. dothrow.c:1854 [static] -- return_throw_to_inv(obj, wep_mask, twoweap, oldslot, player)
export function return_throw_to_inv(obj, wep_mask, _twoweap, _oldslot, player) {
    if (player.inventory) player.inventory.push(obj);
    if ((wep_mask & W_WEP) && !player.weapon) {
        player.weapon = obj; obj.owornmask = (obj.owornmask || 0) | W_WEP;
    } else if ((wep_mask & W_SWAPWEP) && !player.swapWeapon) {
        player.swapWeapon = obj; obj.owornmask = (obj.owornmask || 0) | W_SWAPWEP;
    } else if ((wep_mask & W_QUIVER) && !player.quiver) {
        setuqwep(player, obj);
    }
    return obj;
}

// cf. dothrow.c:1912 -- omon_adj(mon, obj, mon_notices)
export function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;
    const data = mon.data || (mons ? mons[mon.mndx] : null) || {};
    tmp += ((data.msize || MZ_MEDIUM) - MZ_MEDIUM);
    if (mon.msleeping) tmp += 2;
    if (mon.mcanmove === false || mon.mcanmove === 0 || !(data.mmove || 0)) {
        tmp += 4;
        if (mon_notices && (data.mmove || 0) && !rn2(10)) {
            mon.mcanmove = 1; mon.mfrozen = 0;
        }
    }
    switch (obj.otyp) {
    case HEAVY_IRON_BALL: tmp += 2; break;
    case BOULDER: tmp += 6; break;
    default:
        if (obj.oclass === WEAPON_CLASS || is_weptool(obj) || obj.oclass === GEM_CLASS)
            tmp += hitval(obj, mon);
        break;
    }
    return tmp;
}

// cf. dothrow.c:1950 [static] -- tmiss(obj, mon, maybe_wakeup, player, map)
export async function tmiss(obj, mon, maybe_wakeup, player, map) {
    await pline(`The ${xname(obj)} misses ${mon_nam(mon)}.`);
    if (maybe_wakeup && !rn2(3)) wakeup(mon, true, map, player);
}

// cf. dothrow.c:1975 -- should_mulch_missile(obj, mon_moving, luck)
export function should_mulch_missile(obj, mon_moving = false, luck = 0) {
    if (!obj) return false;
    if (!(is_ammo(obj) || is_missile(obj))) return false;
    if (obj.otyp === BOOMERANG) return false;
    if (objectData[obj.otyp]?.magic) return false;
    let chance = 3 + greatest_erosion(obj) - (obj.spe || 0);
    let broken = chance > 1 ? !!rn2(chance) : !rn2(4);
    // C ref: dothrow.c:1992 — mon_moving uses rn2(3), player uses rnl(4)
    if (obj.blessed && (mon_moving ? !rn2(3) : !rnl(4, luck))) broken = false;
    if (((obj.oclass === GEM_CLASS && objectData[obj.otyp]?.tough)
         || obj.otyp === FLINT) && !rn2(2))
        broken = false;
    return broken;
}

// cf. dothrow.c:2010 -- thitmonst(mon, obj, player, map, game)
export async function thitmonst(mon, obj, player, map, game) {
    const uwep = player.weapon;
    const otyp = obj.otyp;
    const data = mon.data || (mons ? mons[mon.mndx] : null) || {};
    let tmp = -1 + (player.luck || 0) + find_mac(mon) + (player.uhitinc || 0) + (player.ulevel || 1);
    const dex = acurr(player, A_DEX);
    if (dex < 4) tmp -= 3;
    else if (dex < 6) tmp -= 2;
    else if (dex < 8) tmp -= 1;
    else if (dex >= 14) tmp += (dex - 14);

    let disttmp = 3 - distmin(player.x, player.y, mon.mx, mon.my);
    if (disttmp < -4) disttmp = -4;
    tmp += disttmp;

    if (player.gloves && uwep && (objectData[uwep.otyp]?.oc_subtyp ?? 0) === P_BOW) tmp -= 2;

    tmp += omon_adj(mon, obj, true);

    // Unicorn gem acceptance
    if (obj.oclass === GEM_CLASS && is_unicorn(data)
        && (objectData[obj.otyp]?.oc_material ?? 0) !== MINERAL && !uslinging_check(player)) {
        if (mon.msleeping || mon.mcanmove === false || mon.mcanmove === 0) { await tmiss(obj, mon, false, player, map); return 0; }
        else if (mon.mtame) { await pline(`${Monnam(mon)} catches and drops the ${xname(obj)}.`); return 0; }
        else { await pline(`${Monnam(mon)} catches the ${xname(obj)}.`); return await gem_accept(mon, obj, player, map); }
    }

    const dieroll = rnd(20);
    if (obj.oclass === WEAPON_CLASS || is_weptool(obj) || obj.oclass === GEM_CLASS) {
        if (is_ammo(obj)) {
            if (!ammo_and_launcher(obj, uwep)) tmp -= 4;
            else {
                tmp += (uwep.spe || 0) - greatest_erosion(uwep);
                tmp += weapon_hit_bonus(uwep);
                if (uwep.oartifact) tmp += spec_abon(uwep, mon);
            }
        } else {
            if (otyp === BOOMERANG) tmp += 4;
            else if (throwing_weapon(obj)) tmp += 2;
            else tmp -= 2;
            tmp += weapon_hit_bonus(obj);
        }
        if (tmp >= dieroll) {
            const dmg = dmgval(obj, mon);
            if (mon.mhp !== undefined) mon.mhp -= dmg;
            await exercise(player, A_DEX, true);
            if (should_mulch_missile(obj, false, player.luck || 0)) return 1;
        } else {
            await tmiss(obj, mon, true, player, map);
        }
    } else if (otyp === HEAVY_IRON_BALL) {
        await exercise(player, A_STR, true);
        if (tmp >= dieroll) {
            await exercise(player, A_DEX, true);
            const dmg = dmgval(obj, mon);
            if (mon.mhp !== undefined) mon.mhp -= dmg;
        } else { await tmiss(obj, mon, true, player, map); }
    } else if (otyp === BOULDER) {
        await exercise(player, A_STR, true);
        if (tmp >= dieroll) {
            await exercise(player, A_DEX, true);
            const dmg = dmgval(obj, mon);
            if (mon.mhp !== undefined) mon.mhp -= dmg;
        } else { await tmiss(obj, mon, true, player, map); }
    } else if ((otyp === EGG || otyp === CREAM_PIE || otyp === BLINDING_VENOM || otyp === ACID_VENOM)
               && (dex > rnd(25))) {
        const dmg = dmgval(obj, mon);
        if (mon.mhp !== undefined) mon.mhp -= dmg;
        return 1;
    } else if (obj.oclass === POTION_CLASS && (dex > rnd(25))) {
        await potionhit(mon, obj, 1, player, map); // POTHIT_HERO_THROW=1
        return 1;
    } else {
        await tmiss(obj, mon, true, player, map);
    }
    return 0;
}

// cf. dothrow.c:2308 [static] -- gem_accept(mon, obj, player, map)
async function gem_accept(mon, obj, player, _map) {
    const data = mon.data || (mons ? mons[mon.mndx] : null) || {};
    const is_buddy = sgn(data.maligntyp || 0) === sgn(player.alignment || 0);
    const is_gem = (objectData[obj.otyp]?.oc_material ?? 0) === GEMSTONE;
    let ret = 0;
    let buf = Monnam(mon);
    mon.mpeaceful = 1; mon.mavenge = 0;

    if (obj.dknown && objectData[obj.otyp]?.known) {
        if (is_gem) {
            if (is_buddy) { buf += ' gratefully'; change_luck(5, player); }
            else { buf += ' hesitatingly'; change_luck(rn2(7) - 3, player); }
        } else { await pline(`${buf} is not interested in your junk.`); return 0; }
    } else if (obj.oname || objectData[obj.otyp]?.uname) {
        if (is_gem) {
            if (is_buddy) { buf += ' gratefully'; change_luck(2, player); }
            else { buf += ' hesitatingly'; change_luck(rn2(3) - 1, player); }
        } else { await pline(`${buf} is not interested in your junk.`); return 0; }
    } else {
        if (is_gem) {
            if (is_buddy) { buf += ' gratefully'; change_luck(1, player); }
            else { buf += ' hesitatingly'; change_luck(rn2(3) - 1, player); }
        } else { buf += ' graciously'; }
    }
    buf += ' accepts your gift.';
    mpickobj(mon, obj);
    ret = 1;
    await pline(buf);
    return ret;
}

// cf. dothrow.c:2416 -- hero_breaks(obj, x, y, breakflags, player, map)
export async function hero_breaks(obj, x, y, breakflags, player, map) {
    const from_invent = (breakflags & BRK_FROM_INV) !== 0;
    const in_view = player.blind ? false : from_invent;
    let brk = breakflags & BRK_KNOWN_OUTCOME;
    if (!brk) brk = breaktest(obj) ? BRK_KNOWN2BREAK : BRK_KNOWN2NOTBREAK;
    if (brk === BRK_KNOWN2NOTBREAK) return 0;
    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, true, from_invent, player, map);
}

// cf. dothrow.c:2443 -- breaks(obj, x, y, player, map)
export async function breaks(obj, x, y, player, map) {
    const in_view = player && !player.blind;
    if (!breaktest(obj)) return 0;
    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, false, false, player, map);
}

// cf. dothrow.c:2456 -- release_camera_demon(obj, x, y, map)
export async function release_camera_demon(obj, x, y, map) {
    if (!rn2(3)) {
        const pm = rn2(3) ? PM_HOMUNCULUS : PM_IMP;
        const mtmp = await makemon_appear(mons[pm], x, y, MM_NOMSG, 0, map);
        if (mtmp) {
            await pline("The picture-painting demon is released!");
            mtmp.mpeaceful = !obj.cursed ? 1 : 0;
            set_malign(mtmp);
        }
    }
}

// cf. dothrow.c:2479 -- breakobj(obj, x, y, hero_caused, from_invent, player, map)
export async function breakobj(obj, x, y, hero_caused, from_invent, player, map) {
    let fracture = false;
    if (is_crackable(obj)) {
        const result = erode_obj(obj, null, ERODE_CRACK, EF_DESTROY | EF_VERBOSE);
        return result === ER_DESTROYED ? 1 : 0;
    }
    const etype = obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp;
    switch (etype) {
    case MIRROR: if (hero_caused) change_luck(-2, player); break;
    case POT_WATER:
        // C ref: breakobj() calls potionhit or potionbreathe when a potion breaks.
        // If hero is at the location, potionhit hits the hero directly.
        // Otherwise if hero is within distance 2, potionbreathe for vapors.
        if (player && x === player.x && y === player.y) {
            await potionhit(player, obj, 2, player, map); // POTHIT_OTHER_THROW=2
        } else if (player && distmin(x, y, player.x, player.y) <= 2) {
            await potionbreathe(player, obj);
        }
        // C ref: breakobj() calls obj_resists(obj, 1, 99) after potionhit/potionbreathe
        // to check if artifact potion resists destruction.
        if (obj_resists(obj, 1, 99)) {
            return 0; // potion resists breaking
        }
        break;
    case EXPENSIVE_CAMERA: await release_camera_demon(obj, x, y, map); break;
    case EGG:
        if (hero_caused && obj.spe && obj.corpsenm !== undefined && obj.corpsenm >= 0)
            change_luck(-Math.min(obj.quan || 1, 5), player);
        break;
    case BOULDER: fracture = true; break;
    default: break;
    }
    if (hero_caused && (from_invent || obj.unpaid)) await check_shop_obj(obj, x, y, true, player, map);
    if (!fracture) {
        if (typeof map.removeFloorObject === 'function') map.removeFloorObject(obj);
        obj._deleted = true;
    }
    return 1;
}

// cf. dothrow.c:2581 -- breaktest(obj)
export function breaktest(obj) {
    let nonbreakchance = 1;
    if (obj.oclass === ARMOR_CLASS && (objectData[obj.otyp]?.oc_material ?? 0) === GLASS)
        nonbreakchance = 90;
    if (obj_resists(obj, nonbreakchance, 99)) return false;
    if ((objectData[obj.otyp]?.oc_material ?? 0) === GLASS && !obj.oartifact && obj.oclass !== GEM_CLASS)
        return true;
    const etype = obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp;
    switch (etype) {
    case EXPENSIVE_CAMERA: case POT_WATER: case EGG: case CREAM_PIE:
    case MELON: case ACID_VENOM: case BLINDING_VENOM:
        return true;
    default: return false;
    }
}

// cf. dothrow.c:2611 [static] -- breakmsg(obj, in_view)
export async function breakmsg(obj, in_view) {
    if (is_crackable(obj)) return;
    let to_pieces = '';
    const etype = obj.oclass === POTION_CLASS ? POT_WATER : obj.otyp;
    switch (etype) {
    case LENSES: case MIRROR: case CRYSTAL_BALL: case EXPENSIVE_CAMERA:
        to_pieces = ' into a thousand pieces';
        // fall through
    case POT_WATER: // eslint-disable-line no-fallthrough
        if (!in_view) await pline('You hear something shatter!');
        else await pline(`The ${xname(obj)} shatters${to_pieces}!`);
        break;
    case EGG: case MELON: await pline("Splat!"); break;
    case CREAM_PIE: if (in_view) await pline("What a mess!"); break;
    case ACID_VENOM: case BLINDING_VENOM: await pline("Splash!"); break;
    default:
        if (!in_view) await pline('You hear something shatter!');
        else await pline(`The ${xname(obj)} shatters${to_pieces}!`);
        break;
    }
}

// cf. dothrow.c:2655 [static] -- throw_gold(obj, player, map, game)
export async function throw_gold(obj, player, map, _game) {
    const dx = player.dx || 0, dy = player.dy || 0, dz = player.dz || 0;
    if (!dx && !dy && !dz) { await pline("You cannot throw gold at yourself."); return 0; }
    if (typeof player.removeFromInventory === 'function') player.removeFromInventory(obj);
    if (player.uswallow && player.ustuck) {
        await pline(`The gold disappears into ${mon_nam(player.ustuck)}.`);
        mpickobj(player.ustuck, obj);
        return 1;
    }
    let bx = player.x, by = player.y;
    if (dz) {
        if (dz < 0) await pline("The gold hits the ceiling, then falls back on top of your head.");
    } else {
        const range = Math.max(1, Math.floor(acurr(player, A_STR) / 2 - (obj.owt || 0) / 40));
        const odx = player.x + dx, ody = player.y + dy;
        if (isok(odx, ody)) {
            for (let i = 0; i < range; i++) {
                const nx = bx + dx, ny = by + dy;
                if (!isok(nx, ny)) break;
                const loc = typeof map.at === 'function' ? map.at(nx, ny) : null;
                if (!loc || !ZAP_POS(loc.typ)) break;
                bx = nx; by = ny;
                const mon = map.monsterAt ? map.monsterAt(bx, by) : null;
                if (mon) break;
            }
        }
    }
    if (dz > 0) await pline("The gold hits the floor.");
    obj.ox = bx; obj.oy = by;
    placeFloorObject(map, obj);
    return 1;
}

// Autotranslated from dothrow.c:1441
export async function sho_obj_return_to_u(obj, game, player) {
  if ((player.dx || player.dy) && (game.gb.bhitpos.x !== player.x || game.gb.bhitpos.y !== player.y)) {
    let x = game.gb.bhitpos.x - player.dx, y = game.gb.bhitpos.y - player.dy;
    tmp_at(DISP_FLASH, obj_to_glyph(obj, rn2_on_display_rng));
    while (isok(x,y) && (x !== player.x || y !== player.y)) {
      tmp_at(x, y);
      await nh_delay_output();
      x -= player.dx;
      y -= player.dy;
    }
    tmp_at(DISP_END, 0);
  }
}
