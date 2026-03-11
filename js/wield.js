// wield.js -- Weapon wielding, swapping, quivering, and two-weapon combat
// cf. wield.c — setuwep, dowield, doswapweapon, chwepon, welded, twoweapon

import { more, nhgetch, ynFunction } from './input.js';
import { objectData, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, ARMOR_CLASS,
         RING_CLASS, AMULET_CLASS, COIN_CLASS, HEAVY_IRON_BALL, IRON_CHAIN,
         TIN_OPENER, WORM_TOOTH, CRYSKNIFE, LOADSTONE } from './objects.js';
import { doname, weight, splitobj, xname } from './mkobj.js';
import { rn2, rnd } from './rng.js';
import { W_WEP, W_ARMOR, A_DEX } from './const.js';
import { is_plural, otense } from './objnam.js';
import { Shk_Your } from './shk.js';
import { renderOverlayMenuUntilDismiss, buildInventoryOverlayLines } from './invent.js';
import { addinv_nomerge } from './invent.js';
import { acurr } from './attrib.js';
import { ammo_and_launcher } from './dothrow.js';

// ============================================================
// 1. Slot setters
// ============================================================

// cf. wield.c:100 — setuwep(obj): set hero's main weapon slot
function setuwep(player, obj) {
    player.weapon = obj;
}

// cf. wield.c:280 — setuswapwep(obj): set secondary weapon slot
export function setuswapwep(player, obj) {
    player.swapWeapon = obj;
}

// cf. wield.c:271 — setuqwep(obj): set quivered ammunition slot
export function setuqwep(player, obj) {
    player.quiver = obj;
}

// cf. wield.c:864 — uwepgone(): force-remove main weapon (consumed/destroyed)
function uwepgone(player) {
    player.weapon = null;
}

// cf. wield.c:879 — uswapwepgone(): force-remove secondary weapon
export function uswapwepgone(player) {
    player.swapWeapon = null;
}

// cf. wield.c:888 — uqwepgone(): force-remove quivered weapon
export function uqwepgone(player) {
    player.quiver = null;
}

// ============================================================
// 2. Validation helpers
// ============================================================

// cf. wield.c:63 — erodeable_wep(optr)
function erodeable_wep(obj) {
    if (!obj) return false;
    const od = objectData[obj.otyp];
    if (!od) return false;
    if (od.oc_class === WEAPON_CLASS) return true;
    if (od.weptool) return true;
    if (obj.otyp === HEAVY_IRON_BALL || obj.otyp === IRON_CHAIN) return true;
    return false;
}

// cf. wield.c:68 — will_weld(optr): cursed erodeable weapon or tin opener
function will_weld(obj) {
    if (!obj || !obj.cursed) return false;
    return erodeable_wep(obj) || obj.otyp === TIN_OPENER;
}

// cf. wield.c:1042 — welded(obj): test if obj is hero's welded weapon
// C: welded(otmp) = otmp && otmp == uwep && will_weld(otmp)
export function welded(obj, player) {
    if (obj && obj === player?.weapon && will_weld(obj)) {
        obj.bknown = true;
        return true;
    }
    return false;
}

// cf. wield.c:1052 — weldmsg(obj): print "X is welded to your hand!" message
export async function weldmsg(player, display) {
    if (!player.weapon) return;
    player.weapon.bknown = true;
    await display.putstr_message(`${doname(player.weapon, player)} welded to your hand!`);
}

// cf. wield.c:1068 — mwelded(obj): monster version of welded
// Caller is responsible for ensuring this is a monster's item
// Autotranslated from wield.c:1068
export function mwelded(obj) {
  if (obj && (obj.owornmask & W_WEP) && will_weld(obj)) return true;
  return false;
}

// cf. wield.c:150 — empty_handed(): description when not wielding anything
function empty_handed(player) {
    if (player && player.gloves) return 'empty handed';
    return 'bare handed';
}

// cf. wield.c:132 — cant_wield_corpse(obj): cockatrice petrification check
// Returns true if wielding would petrify (hero doesn't have gloves/resistance)
export function cant_wield_corpse(player, _obj) {
    // Simplified: full cockatrice handling requires instapetrify, touch_petrifies
    // which would kill the hero. For now return false (safety handled elsewhere).
    return false;
}

// ============================================================
// 2b. Two-weapon combat helpers
// ============================================================

// cf. wield.c:829 — set_twoweap(on_off)
export function set_twoweap(player, on) {
    player.twoweap = !!on;
}

// cf. wield.c:897 — untwoweapon(): disable two-weapon mode
export async function untwoweapon(player, display) {
    if (player.twoweap) {
        if (display) await display.putstr_message('You can no longer wield two weapons at once.');
        set_twoweap(player, false);
    }
}

// cf. wield.c:756 — can_twoweapon(): check if hero can dual-wield
// Simplified: role check not implemented (would need urole.roledata)
async function can_twoweapon(player, display) {
    if (!player) return false;
    if (!player.weapon || !player.swapWeapon) {
        if (display) await display.putstr_message('Your hands are empty.');
        return false;
    }
    // TWOWEAPOK: must be weapon-class (not launcher/ammo/missile) or weptool
    const twoweapok = (obj) => {
        const od = objectData[obj.otyp];
        if (!od) return false;
        if (od.oc_class === WEAPON_CLASS) {
            // Exclude launchers, ammo, missiles
            const sub = od.oc_subtyp || 0;
            if (sub < 0) return false; // launcher (negative skill = ammo_for_launcher)
            if (od.missile) return false;
            return true;
        }
        return !!od.weptool;
    };
    if (!twoweapok(player.weapon) || !twoweapok(player.swapWeapon)) {
        if (display) await display.putstr_message('That is not a suitable weapon.');
        return false;
    }
    if (objectData[player.weapon.otyp]?.big || objectData[player.swapWeapon.otyp]?.big) {
        if (display) await display.putstr_message("That isn't one-handed.");
        return false;
    }
    if (player.shield) {
        if (display) await display.putstr_message("You can't use two weapons while wearing a shield.");
        return false;
    }
    if (player.swapWeapon.cursed) {
        player.swapWeapon.bknown = true;
        // Drop secondary weapon
        await drop_uswapwep(player, display);
        return false;
    }
    return true;
}

// cf. wield.c:803 — drop_uswapwep(): drop secondary weapon
async function drop_uswapwep(player, display) {
    const obj = player.swapWeapon;
    if (!obj) return;
    if (display) {
        if (!obj.cursed) {
            await display.putstr_message(`${doname(obj, player)} slips from your left hand!`);
        } else {
            await display.putstr_message(`${doname(obj, player)} drops from your left hand!`);
        }
    }
    setuswapwep(player, null);
    // In C, dropx() places object on ground. Simplified: just clear the slot.
    // Full drop handling would need floor placement.
}

// C ref: wield.c:289 — ready_ok(obj): getobj callback for quiver selection.
// Return values mirror GETOBJ_* tri-state used across command filters:
// 0 = exclude, 1 = suggest, 2 = downplay.
export function ready_ok(obj, player) {
    if (!obj) return player?.quiver ? 1 : 2;

    if (obj === player?.weapon || (obj === player?.swapWeapon && player?.twoweap)) {
        return (Number(obj.quan || 0) === 1) ? 2 : 1;
    }

    const od = objectData[obj.otyp] || {};
    const likelyLauncher = !!od.launcher || Number(od.oc_subtyp || 0) < 0;
    if (od.ammo) {
        const matched = !!((player?.weapon && ammo_and_launcher(obj, player.weapon))
            || (player?.swapWeapon && ammo_and_launcher(obj, player.swapWeapon)));
        return matched ? 1 : 2;
    } else if (likelyLauncher) {
        return 2;
    }

    if (obj.oclass === WEAPON_CLASS || obj.oclass === COIN_CLASS) return 1;
    return 2;
}

// cf. wield.c:836 — dotwoweapon(): #twoweapon command
async function handleTwoWeapon(player, display, game = null) {
    void game;
    // Can always toggle off
    if (player.twoweap) {
        await display.putstr_message('You switch to your primary weapon.');
        set_twoweap(player, false);
        return { moved: false, tookTime: false };
    }
    if (await can_twoweapon(player, display)) {
        set_twoweap(player, true);
        await display.putstr_message('You begin two-weapon combat.');
        return { moved: false, tookTime: rnd(20) > acurr(player, A_DEX) };
    }
    return { moved: false, tookTime: false };
}

// C ref: wield.c:341 — finish_splitting(obj)
// Split stack object gets its own inventory identity/slot.
export async function finish_splitting(obj, player, _parentObj = null) {
    if (!obj || !player) return obj;
    // Ensure split object can receive a fresh invlet assignment.
    if (Object.prototype.hasOwnProperty.call(obj, 'invlet')) obj.invlet = undefined;
    if (typeof player.addToInventory === 'function') {
        await addinv_nomerge(obj, player);
        return obj;
    }
    if (!Array.isArray(player.inventory)) player.inventory = [];
    if (!player.inventory.includes(obj)) player.inventory.push(obj);
    return obj;
}

// ============================================================
// 2c. Weapon enchantment
// ============================================================

// cf. wield.c:908 — chwepon(otmp, amount): enchant/corrode wielded weapon
// Called from scroll of enchant weapon. Returns 1 if something happened.
export async function chwepon(player, display, otmp, amount) {
    const uwep = player.weapon;
    const od = uwep ? objectData[uwep.otyp] : null;

    if (!uwep || (od?.oc_class !== WEAPON_CLASS && !od?.weptool)) {
        // No weapon or not a real weapon
        if (amount >= 0 && uwep && will_weld(uwep)) {
            // Uncurse welded tin opener
            if (display) await display.putstr_message(`${doname(uwep, player)} glows with an amber aura.`);
            uwep.cursed = false;
        } else {
            if (display) {
                const msg = amount >= 0 ? 'Your hands twitch.' : 'Your hands itch.';
                await display.putstr_message(msg);
            }
        }
        return 0;
    }

    // Worm tooth → crysknife
    if (uwep.otyp === WORM_TOOTH && amount >= 0) {
        if (display) await display.putstr_message('Your weapon is much sharper now.');
        uwep.otyp = CRYSKNIFE;
        uwep.oerodeproof = false;
        if (uwep.quan > 1) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        if (uwep.cursed) uwep.cursed = false;
        return 1;
    }
    // Crysknife → worm tooth
    if (uwep.otyp === CRYSKNIFE && amount < 0) {
        if (display) await display.putstr_message('Your weapon is much duller now.');
        uwep.otyp = WORM_TOOTH;
        uwep.oerodeproof = false;
        if (uwep.quan > 1) {
            uwep.quan = 1;
            uwep.owt = weight(uwep);
        }
        return 1;
    }

    // Soft limits at +5/-5
    if (((uwep.spe > 5 && amount >= 0) || (uwep.spe < -5 && amount < 0))
        && rn2(3)) {
        if (display) await display.putstr_message(`${doname(uwep, player)} violently glows and evaporates.`);
        // Destroy weapon
        player.weapon = null;
        return 1;
    }

    // Normal enchant/disenchant
    if (display) {
        const xtime = (amount * amount === 1) ? 'a moment' : 'a while';
        const color = amount < 0 ? 'black' : 'blue';
        await display.putstr_message(`${doname(uwep, player)} glows ${color} for ${xtime}.`);
    }
    uwep.spe = (uwep.spe || 0) + amount;
    if (amount > 0 && uwep.cursed) uwep.cursed = false;

    // Vibration warning at high enchant
    if ((uwep.spe > 5) && !rn2(7)) {
        if (display) await display.putstr_message(`${doname(uwep, player)} suddenly vibrates unexpectedly.`);
    }

    return 1;
}

// ============================================================
// 2d. Wield tool helper
// ============================================================

// cf. wield.c:677 — wield_tool(obj, verb): wield a tool during #apply
async function wield_tool(player, display, obj, _verb) {
    if (player.weapon && obj === player.weapon) return true;
    if (obj.owornmask & W_ARMOR) {
        // W_ARMOR | W_ACCESSORY bits — can't wield worn item
        if (display) await display.putstr_message("You can't wield that while wearing it.");
        return false;
    }
    if (welded(player.weapon, player)) {
        await weldmsg(player, display);
        return false;
    }
    if (objectData[obj.otyp]?.big && player.shield) {
        if (display) await display.putstr_message('You cannot wield a two-handed tool while wearing a shield.');
        return false;
    }
    if (display) await display.putstr_message(`You now wield ${doname(obj, player)}.`);
    setuwep(player, obj);
    if (player.twoweap) await untwoweapon(player, display);
    return true;
}

// ============================================================
// 3. ready_weapon — core wield logic
// ============================================================

// cf. wield.c:163 — ready_weapon(wep): perform the actual wield
async function ready_weapon(player, display, wep) {
    if (wep === null) {
        if (player.weapon) {
            setuwep(player, null);
            await display.putstr_message(`You are ${empty_handed(player)}.`);
            return { tookTime: true };
        }
        await display.putstr_message(`You are already ${empty_handed(player)}.`);
        return { tookTime: false };
    }

    // Can't wield worn armor/rings/amulet
    if (wep === player.armor || wep === player.shield || wep === player.helmet
        || wep === player.gloves || wep === player.boots || wep === player.cloak
        || wep === player.amulet) {
        await display.putstr_message('You cannot wield that!');
        return { tookTime: false };
    }

    // Bimanual + shield check
    if (objectData[wep.otyp]?.big && player.shield) {
        await display.putstr_message('You cannot wield a two-handed weapon while wearing a shield.');
        return { tookTime: false };
    }

    setuwep(player, wep);
    await display.putstr_message(`${wep.invlet} - ${doname(wep, player)}.`);
    // Disable two-weapon if new weapon is incompatible
    if (player.twoweap && !await can_twoweapon(player, null)) {
        await untwoweapon(player, display);
    }
    return { tookTime: true };
}

// ============================================================
// 4. Command handlers
// ============================================================

// Helper to clear prompt line (same pattern used throughout cmd.js)
function replacePromptMessage(display) {
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
}

async function ynqPrompt(display, prompt) {
    const resp = await ynFunction(prompt, 'ynq', 'q'.charCodeAt(0), display);
    return String.fromCharCode(resp);
}

function invCountWithoutGold(player) {
    let ct = 0;
    for (const obj of (player?.inventory || [])) {
        if (obj?.invlet !== '$') ct++;
    }
    return ct;
}

function splittableLikeC(obj, player) {
    if (obj?.otyp === LOADSTONE && obj?.cursed) return false;
    if (obj === player?.weapon && obj?.welded) return false;
    return true;
}

function buildWieldMenuLines(player, inventory) {
    const lines = [];
    lines.push('Miscellaneous');
    lines.push('- - your bare hands');

    const weapons = [];
    const tools = [];
    for (const obj of inventory) {
        if (!obj || obj.invlet === '$') continue;
        if (obj.oclass === WEAPON_CLASS) {
            weapons.push(obj);
            continue;
        }
        const od = objectData[obj.otyp];
        if (obj.oclass === TOOL_CLASS && (od?.oc_subtyp || 0) !== 0) {
            tools.push(obj);
        }
    }

    if (weapons.length) {
        lines.push('Weapons');
        for (const obj of weapons) lines.push(`${obj.invlet} - ${doname(obj, player)}`);
    }
    if (tools.length) {
        lines.push('Tools');
        for (const obj of tools) lines.push(`${obj.invlet} - ${doname(obj, player)}`);
    }
    lines.push('(end)');
    return lines;
}

// cf. wield.c:350 — dowield(): #wield command
// Moved from cmd.js handleWield
async function handleWield(player, display) {
    // Weld check
    if (welded(player.weapon, player)) {
        await weldmsg(player, display);
        return { moved: false, tookTime: false };
    }

    const inventory = Array.isArray(player.inventory) ? player.inventory : [];
    const suggestWield = (obj) => {
        if (!obj) return false;
        if (obj.oclass === WEAPON_CLASS) return true;
        // C ref: wield.c wield_ok() includes is_weptool() in suggestions.
        return obj.oclass === TOOL_CLASS && (objectData[obj.otyp]?.oc_subtyp || 0) !== 0;
    };

    // C ref: wield.c getobj() prompt format for wield command.
    const letters = inventory.filter(suggestWield).map((item) => item.invlet).join('');
    const wieldPrompt = letters.length > 0
        ? `What do you want to wield? [- ${letters} or ?*] `
        : 'What do you want to wield? [- or ?*] ';
    await display.putstr_message(wieldPrompt);

    while (true) {
        const ch = await nhgetch();
        let c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage(display);
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage(display);
            const menuLines = buildWieldMenuLines(player, inventory);
            const allowed = `-${inventory.map((o) => o?.invlet || '').join('')}`;
            const picked = await renderOverlayMenuUntilDismiss(display, menuLines, allowed);
            if (picked) {
                c = picked;
            } else {
                await display.putstr_message(wieldPrompt);
                continue;
            }
        }

        if (c === '-') {
            replacePromptMessage(display);
            const result = await ready_weapon(player, display, null);
            return { moved: false, tookTime: result.tookTime };
        }

        const item = inventory.find((o) => o.invlet === c);
        if (!item) {
            replacePromptMessage(display);
            await display.putstr_message("You don't have that object.");
            await more(display, {
                site: 'wield.handleWield.invalidInvletMorePrompt',
            });
            await display.putstr_message(wieldPrompt);
            continue;
        }

        // C ref: wield.c dowield() — selecting current weapon is a no-op failure.
        if (player.weapon && item === player.weapon) {
            replacePromptMessage(display);
            await display.putstr_message('You are already wielding that!');
            return { moved: false, tookTime: false };
        }

        // C ref: wield.c dowield() — selecting uswapwep triggers doswapweapon().
        if (player.swapWeapon && item === player.swapWeapon) {
            const oldwep = player.weapon || null;
            replacePromptMessage(display);
            // C ref: doswapweapon() calls ready_weapon(oldswap) first, which
            // temporarily sets wep->owornmask |= W_WEP before prinv so doname
            // produces "(weapon in right hand)". Replicate by temporarily
            // setting player.weapon to the new weapon before doname.
            player.weapon = item;
            await display.putstr_message(`${item.invlet} - ${doname(item, player)}.`);
            // Now actually perform the swap.
            setuwep(player, item);
            setuswapwep(player, oldwep);
            // C ref: doswapweapon() calls prinv(uswapwep) after setuswapwep.
            if (player.swapWeapon) {
                await display.putstr_message(`${player.swapWeapon.invlet} - ${doname(player.swapWeapon, player)}.`);
            } else {
                await display.putstr_message('You have no secondary weapon readied.');
            }
            return { moved: false, tookTime: true };
        }

        // C ref: wield.c dowield() — selecting uquiver requires confirmation
        // and may split stacks for wielding a single readied item.
        if (player.quiver && item === player.quiver) {
            replacePromptMessage(display);
            const canSplitQuiverStack = (item.quan || 1) > 1
                && invCountWithoutGold(player) < 52 /* invlet_basic in C */
                && splittableLikeC(item, player);

            if (canSplitQuiverStack) {
                const choice = await ynqPrompt(
                    display,
                    `You have ${(item.quan || 1)} ${xname(item)} readied.  Wield one?`
                );
                if (choice === 'q') {
                    return { moved: false, tookTime: false };
                }
                if (choice === 'y') {
                    const split = splitobj(item, 1);
                    if (split) {
                        await finish_splitting(split, player, item);
                        const result = await ready_weapon(player, display, split);
                        return { moved: false, tookTime: result.tookTime };
                    }
                }
                const wieldAllChoice = await ynqPrompt(display, 'Wield all of them instead?');
                if (wieldAllChoice !== 'y') {
                    await display.putstr_message(
                        `${Shk_Your('', item)}${xname(item)} ${otense(item, 'remain')} readied.`
                    );
                    return { moved: false, tookTime: false };
                }
            } else {
                const usePlural = is_plural(item);
                const wieldChoice = await ynqPrompt(
                    display,
                    `You have ${usePlural ? 'those' : 'that'} readied.  Wield ${usePlural ? 'them' : 'it'} instead?`
                );
                if (wieldChoice !== 'y') {
                    await display.putstr_message(
                        `${Shk_Your('', item)}${xname(item)} ${otense(item, 'remain')} readied.`
                    );
                    return { moved: false, tookTime: false };
                }
            }
            // Wielding whole readied stack, so clear quiver slot first.
            setuqwep(player, null);
            const result = await ready_weapon(player, display, item);
            return { moved: false, tookTime: result.tookTime };
        }

        replacePromptMessage(display);
        // Clear from swap slot if this item was there
        if (player.swapWeapon === item) {
            setuswapwep(player, null);
        }
        const result = await ready_weapon(player, display, item);
        return { moved: false, tookTime: result.tookTime };
    }
}

// cf. wield.c:456 — doswapweapon(): #swap command
// Moved from cmd.js handleSwapWeapon
async function handleSwapWeapon(player, display) {
    // Weld check
    if (welded(player.weapon, player)) {
        await weldmsg(player, display);
        return { moved: false, tookTime: false };
    }

    const oldwep = player.weapon || null;
    const oldswap = player.swapWeapon || null;

    // C ref: wield.c doswapweapon() — clear secondary, ready old secondary as
    // new primary, then place old primary into secondary slot.
    setuswapwep(player, null);
    const result = await ready_weapon(player, display, oldswap);
    if (player.weapon === oldwep) {
        // Wield failed/cancelled for some reason: restore previous secondary.
        setuswapwep(player, oldswap);
    } else {
        setuswapwep(player, oldwep);
    }
    if (player.swapWeapon) {
        await display.putstr_message(`${player.swapWeapon.invlet} - ${doname(player.swapWeapon, player)}.`);
    } else {
        await display.putstr_message('You have no secondary weapon readied.');
    }
    // C ref: wield.c:492 — disable two-weapon if incompatible after swap
    if (player.twoweap && !await can_twoweapon(player, null)) {
        await untwoweapon(player, display);
    }
    return { moved: false, tookTime: !!result?.tookTime };
}

// cf. wield.c:499+507 — dowieldquiver() / doquiver_core(): Q command
async function handleQuiver(player, display) {
    const inventory = Array.isArray(player.inventory) ? player.inventory : [];

    // C ref: wield.c ready_ok() — suggest ammo, missiles, gems; downplay launchers
    const quiverEligible = inventory.filter((obj) => {
        const verdict = ready_ok(obj, player);
        return verdict === 1 || verdict === 2;
    });

    const letters = quiverEligible.map((item) => item.invlet).join('');
    const prompt = letters.length > 0
        ? `What do you want to ready? [- ${letters} or ?*] `
        : 'What do you want to ready? [- or ?*] ';
    await display.putstr_message(prompt);

    while (true) {
        const ch = await nhgetch();
        let c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage(display);
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            replacePromptMessage(display);
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
                await display.putstr_message(prompt);
                continue;
            }
        }

        if (c === '-') {
            replacePromptMessage(display);
            setuqwep(player, null);
            await display.putstr_message('You now have no ammunition readied.');
            return { moved: false, tookTime: false };
        }

        const item = inventory.find((o) => o.invlet === c);
        if (!item) {
            // C ref: getobj() always shows error for invalid invlet.
            replacePromptMessage(display);
            await display.putstr_message("You don't have that object.");
            await more(display, {
                site: 'wield.handleQuiver.invalidInvletMorePrompt',
            });
            await display.putstr_message(prompt);
            continue;
        }

        replacePromptMessage(display);
        setuqwep(player, item);
        await display.putstr_message(`${doname(item, player)} ready to be thrown.`);
        return { moved: false, tookTime: false };
    }
}

export { setuwep, uwepgone, will_weld, erodeable_wep, can_twoweapon, drop_uswapwep, empty_handed, wield_tool, ready_weapon, handleWield, handleSwapWeapon, handleQuiver, handleTwoWeapon };

// C ref: wield.c:325 — wield_ok(obj): filter for getobj wielding prompt
export function wield_ok(obj) {
  if (!obj) return 1; // GETOBJ_SUGGEST
  if (obj.oclass === COIN_CLASS) return 0; // GETOBJ_EXCLUDE
  if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) return 1; // GETOBJ_SUGGEST
  return 2; // GETOBJ_DOWNPLAY
}
