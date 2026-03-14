// cmd.js -- Command dispatch
// Mirrors cmd.c from the C source.
// Maps keyboard input to game actions.

import { RACE_ORC, SQKY_BOARD,
         DART_TRAP, ARROW_TRAP,
         DIRECTION_KEYS, RUN_KEYS, CQ_REPEAT, P_NUM_SKILLS,
         P_FIRST_H_TO_H, P_LAST_H_TO_H, P_FIRST_WEAPON, P_LAST_WEAPON,
         P_FIRST_SPELL, P_LAST_SPELL,
         xdir, ydir, N_DIRS, N_DIRS_Z, VERSION_STRING, SIZE, nul_glyphinfo,
         isok, Never_mind, ECMD_TIME } from './const.js';
import { rn2, rnl, midlog_enter, midlog_exit_int } from './rng.js';
import { handleWizLoadDes, wizLevelChange, wizLevelPort, wizMap, wizTeleport, wizGenesis, wizWish } from './wizcmds.js';
import { handleThrow, handleFire } from './dothrow.js';
import { handleKnownSpells, docast } from './spell.js';
import { handleEngrave } from './engrave.js';
import { handleApply, reset_trapset } from './apply.js';
import { DART, ARROW } from './objects.js';
import { more, nhgetch, ynFunction, getlin, cmdq_pop_command, cmdq_clear, cmdq_add_ec,
       } from './input.js';
import { handleEat } from './eat.js';
import { handleQuaff } from './potion.js';
import { handleRead } from './read.js';
import { handleWear, handlePutOn, handleTakeOff, handleRemove, handleRemoveAll, reset_remarm } from './do_wear.js';
import { which_armor } from './worn.js';
import { handleWield, handleSwapWeapon, handleQuiver, handleTwoWeapon } from './wield.js';
import { handleDownstairs, handleUpstairs, handleDrop, handleDropTypes, dowipe } from './do.js';
import {
    handleInventory, currency, doorganize, display_inventory, renderOverlayMenuUntilDismiss, getobj,
    doprwep, doprarm, doprring, dopramulet, doprtool, doprinuse,
} from './invent.js';
import { dopray, doturn, dosacrifice } from './pray.js';
import { doinvoke } from './artifact.js';
import { dodip } from './potion.js';
import { handleCallObjectTypePrompt, mon_nam, x_monnam, do_mgivenname, do_oname, namefloorobj } from './do_name.js';
import { upstart } from './hacklib.js';
import { handleDiscoveries } from './o_init.js';
import {
    handlePrevMessages, handleHelp, handleWhatdoes, handleHistory,
    handleViewMapPrompt, dolook, dowhatis, doquickwhatis,
} from './pager.js';
import { handleKick } from './kick.js';
import { handleZap } from './zap.js';
import { handleSave } from './storage.js';
import { handleForce, handleOpen, handleClose, reset_pick } from './lock.js';
import { handlePickup, handleLoot, handlePay, handleTogglePickup } from './pickup.js';
import { dotalk } from './sounds.js';
import { add_skills_to_menu, skill_advance, skill_practice_value, weapon_slots_available } from './weapon.js';
import { handleSet } from './options.js';
import { dosit } from './sit.js';
import { doride } from './steed.js';
import { wiz_debug_cmd_bury } from './dig.js';
import { runShell } from '../shell/shell.js';
import { doattributes, doconduct } from './insight.js';
import { pline, pline1, impossible, You, Norep, set_msg_xy } from './pline.js';
import { domove, do_run, do_rush, findPath, dotravel, dotravel_target,
         performWaitSearch, dist2, u_at } from './hack.js';
import { cnv_trap_obj, t_at, m_at } from './trap.js';
import { an } from './objnam.js';
import { PM_GRID_BUG, AT_BREA } from './monsters.js';
import { canspotmon, glyph_at } from './display.js';
import { attacktype, can_breathe } from './mondata.js';
import { dobreathe } from './polyself.js';
import { glyph_is_invisible } from './symbols.js';
import { IS_STWALL, IS_DOOR, IS_TREE, IS_WATERWALL,
         LAVAWALL, IRONBARS, SCORR, SDOOR, DRAWBRIDGE_UP,
         D_CLOSED, D_LOCKED, D_ISOPEN } from './const.js';




// Process a command from the player
// C ref: cmd.c rhack() -- main command dispatch
// Returns: { moved: boolean, tookTime: boolean }
// Autotranslated from cmd.c:3744
export async function rhack(ch, game) {
    const { player, map, display, fov } = game;
    const svc = game.svc || (game.svc = {});
    const context = svc.context || (svc.context = {});
    const getRunMode = () => {
        // Prefix parser state is only rush/run (2/3). C uses many non-prefix
        // context.run values during movement/travel (for example 8), which
        // must not be interpreted as pending g/G prefixes.
        if (Number.isInteger(game.runMode)) {
            const mode = Number(game.runMode || 0);
            if (mode === 2 || mode === 3) return mode;
            return 0;
        }
        if (Number.isInteger(context.run)) {
            const mode = Number(context.run || 0);
            if (mode === 2 || mode === 3) return mode;
            return 0;
        }
        return 0;
    };
    const getMenuRequested = () => {
        if (Number.isInteger(context.nopick)) return !!context.nopick;
        if (typeof game.menuRequested !== 'undefined') return !!game.menuRequested;
        return false;
    };
    const setMenuRequested = (value) => {
        context.nopick = value ? 1 : 0;
        if ('menuRequested' in game) game.menuRequested = !!value;
    };
    const getForceFight = () => {
        if (Number.isInteger(context.forcefight)) return !!context.forcefight;
        if (typeof game.forceFight !== 'undefined') return !!game.forceFight;
        return false;
    };
    const setForceFight = (value) => {
        context.forcefight = value ? 1 : 0;
        if ('forceFight' in game) game.forceFight = !!value;
    };
    const clearRunMode = () => {
        context.run = 0;
        if ('runMode' in game) game.runMode = 0;
    };
    const setRunMode = (mode) => {
        const n = Number(mode) || 0;
        const canonical = (n === 2) ? 2 : (n ? 3 : 0);
        context.run = canonical;
        if ('runMode' in game) game.runMode = canonical;
    };
    let dispatchedFromQueue = false;
    if (ch === 0) {
        const queued = cmdq_pop_command(!!game?.inDoAgain);
        if (!queued) return { moved: false, tookTime: false };
        if (queued.countPrefix > 0) {
            game.commandCount = queued.countPrefix;
            game.multi = Math.max(0, queued.countPrefix - 1);
        }
        if (queued.extcmd) {
            if (typeof queued.extcmd === 'function') {
                return await queued.extcmd(game);
            }
            if (typeof queued.extcmd?.ef_funct === 'function') {
                return await queued.extcmd.ef_funct(game);
            }
            return { moved: false, tookTime: false };
        }
        if (!queued.key) return { moved: false, tookTime: false };
        dispatchedFromQueue = true;
        ch = queued.key;
    }

    // C ref: cmd.c rhack() clears travel state before handling most commands.
    context.travel = 0;
    context.travel1 = 0;

    const c = String.fromCharCode(ch);
    const isMetaKey = ch >= 128 && ch <= 255;
    const metaBaseChar = isMetaKey ? String.fromCharCode(ch & 0x7f).toLowerCase() : '';
    // C ref: you.h u.ux0/u.uy0 are the hero's pre-command position.
    // Monster throw logic (mthrowu.c URETREATING) compares against these.
    game.ux0 = player.x;
    game.uy0 = player.y;
    if (ch !== 16) {
        display.prevMessageCycleIndex = null;
    }
    if (ch !== 4) {
        player.kickedloc = null;
    }

    // C ref: cmd.c parse() / get_count() — digit keys '1'-'9' start a count
    // prefix; '0'-'9' extend an existing one.  C only displays "Count: N"
    // after the second digit (when N > 9, get_count.c:4839).
    if (ch >= 49 && ch <= 57) {
        // '1'-'9': start or extend count accumulator
        game.countAccum = ((game.countAccum || 0) * 10) + (ch - 48);
        if (game.countAccum > 9) {
            clearTopline();
            await display.putstr_message(`Count: ${game.countAccum}`);
        }
        // isCountDigitWithDisplay: cursor was set to topline by putstr_message;
        // caller must NOT call cursorOnPlayer (would clobber topline cursor pos).
        return { moved: false, tookTime: false, isCountDigitWithDisplay: game.countAccum > 9 };
    }
    if (ch === 48 && game.countAccum != null) {
        // '0': extend an in-progress count (not allowed as first digit)
        game.countAccum = game.countAccum * 10;
        if (game.countAccum > 9) {
            clearTopline();
            await display.putstr_message(`Count: ${game.countAccum}`);
        }
        return { moved: false, tookTime: false, isCountDigitWithDisplay: game.countAccum > 9 };
    }
    // Non-digit: if a count was accumulated, apply it as the command count.
    // C ref: cmd.c:4909-4914 — gm.multi = command_count - 1; clear_nhwindow
    if (game.countAccum != null) {
        game.commandCount = game.countAccum;
        game.multi = Math.max(0, game.countAccum - 1);
        game.countAccum = null;
        clearTopline();
    }

    // C ref: cmdhelp/keyhelp + fixes3-6-3:
    // ^J (LF/newline) is bound to a south "go until near something" command
    // in non-numpad mode, while ^M is separate (often transformed before core).
    if (ch === 10) {
        return await do_rush(DIRECTION_KEYS.j, player, map, display, fov, game);
    }

    // C-faithful: both LF (^J) and CR from Enter should behave like the
    // movement binding in non-numpad mode (rush south).
    if (ch === 13) {
        return await do_rush(DIRECTION_KEYS.j, player, map, display, fov, game);
    }

    // Meta command keys (M-x / Alt+x).
    // C ref: command set includes M('l') for loot, M('f') for #force.
    if (metaBaseChar === 'l') {
        return await handleLoot(game);
    }
    if (metaBaseChar === 'f') {
        return await handleForce(game);
    }

    // Movement keys
    if (DIRECTION_KEYS[c]) {
        // Check if 'G' or 'g' prefix was used (run/rush mode)
        const prefRunMode = getRunMode();
        if (prefRunMode) {
            clearRunMode();
            if (prefRunMode === 2) {
                return do_rush(DIRECTION_KEYS[c], player, map, display, fov, game);
            }
            return do_run(DIRECTION_KEYS[c], player, map, display, fov, game);
        }
        return await domove(DIRECTION_KEYS[c], player, map, display, game);
    }

    // Run keys (capital letter = run in that direction)
    if (RUN_KEYS[c]) {
        // C ref: do_run_<dir>() uses set_move_cmd(dir, 1), which differs from
        // #run/G prefix semantics (context.run=3). Preserve that distinct mode.
        return do_run(RUN_KEYS[c], player, map, display, fov, game, 'shiftRun');
    }

    function clearTopline() {
        if (!display) return;
        if (typeof display.clearRow === 'function') display.clearRow(0);
        if ('topMessage' in display) display.topMessage = '';
        if ('messageNeedsMore' in display) display.messageNeedsMore = false;
    }

    // C ref: cmd.c do_rush()/do_run() prefix handling.
    // If the next key after g/G is not a movement command, cancel prefix
    // with a specific message instead of treating it as an unknown command.
    if (getRunMode() && c !== 'g' && c !== 'G' && ch !== 27) {
        const prefix = getRunMode() === 2 ? 'g' : 'G';
        clearRunMode();
        // C getdir-style quit keys after a run/rush prefix do not produce
        // the prefix-specific warning; they fall through as ordinary input.
        const isQuitLike = (ch === 32 || ch === 10 || ch === 13);
        if (!isQuitLike) {
            await display.putstr_message(`The '${prefix}' prefix should be followed by a movement command.`);
            return { moved: false, tookTime: false };
        }
    }

    // Period/space = wait/search
    // C ref: cmd.c — space maps to donull only when rest_on_space is enabled.
    if (c === '.' || c === 's' || (c === ' ' && game?.flags?.rest_on_space)) {
        // C ref: cmd.c set_occupation(..., gm.multi) is established before the
        // command executes when a count prefix is active.
        let armedOccupation = false;
        if (game && game.multi > 0 && !game.occupation) {
            const occCmd = c;
            game.occupation = {
                occtxt: occCmd === 's' ? 'searching' : 'waiting',
                async fn(g) {
                    await performWaitSearch(occCmd, g, g.map, g.player, g.fov, g.display);
                    if (g.multi > 0) g.multi--;
                    return g.multi > 0;
                },
            };
            armedOccupation = true;
        }

        const result = await performWaitSearch(c, game, map, player, fov, display);
        // If the command didn't take time (for example, safety-prevented),
        // don't leave a pre-armed occupation behind.
        if (armedOccupation && !result.tookTime) {
            game.occupation = null;
        }
        return result;
    }

    // Pick up
    if (c === ',') {
        // C ref: cmd.c -- ',' is pickup
        return await handlePickup(player, map, display, game);
    }

    // Go down stairs
    if (c === '>') {
        return await handleDownstairs(player, map, display, game);
    }

    // Go up stairs
    if (c === '<') {
        return await handleUpstairs(player, map, display, game);
    }

    // Open door
    if (c === 'o') {
        return await handleOpen(player, map, display, game);
    }

    // Close door
    if (c === 'c') {
        return await handleClose(player, map, display, game);
    }

    // Inventory
    if (c === 'i') {
        return await handleInventory(player, display, game);
    }

    // Count gold
    // C ref: cmd.c doprgold()
    if (c === '$') {
        const amount = Number.isFinite(player.gold) ? Math.max(0, Math.floor(player.gold)) : 0;
        await display.putstr_message(`Your wallet contains ${amount} ${currency(amount)}.`);
        return { moved: false, tookTime: false };
    }

    // Inventory inspection shortcuts
    // C ref: invent.c doprwep/doprarm/doprring/dopramulet/doprtool/doprinuse
    if (c === ')') {
        await doprwep(player);
        return { moved: false, tookTime: false };
    }
    if (c === '[') {
        await doprarm(player);
        return { moved: false, tookTime: false };
    }
    if (c === '=') {
        await doprring(player);
        return { moved: false, tookTime: false };
    }
    if (c === '"') {
        await dopramulet(player);
        return { moved: false, tookTime: false };
    }
    if (c === '(') {
        await doprtool(player);
        return { moved: false, tookTime: false };
    }
    if (c === '*') {
        await doprinuse(player);
        return { moved: false, tookTime: false };
    }

    // Wield weapon
    if (c === 'w') {
        return await handleWield(player, display);
    }

    // Swap primary/secondary weapon
    // C ref: wield.c doswapweapon()
    if (c === 'x') {
        return await handleSwapWeapon(player, display);
    }

    // Toggle two-weapon combat
    // C ref: wield.c dotwoweapon()
    if (c === 'X') {
        return await handleTwoWeapon(player, display, game);
    }

    // Throw item
    // C ref: dothrow()
    if (c === 't') {
        return await handleThrow(player, map, display, game);
    }

    // Fire from quiver/launcher
    // C ref: dothrow() fire command path
    if (c === 'f') {
        return await handleFire(player, map, display, game);
    }

    // Quiver
    // C ref: wield.c dowieldquiver()
    if (c === 'Q') {
        return await handleQuiver(player, display);
    }

    // Remove ring/amulet
    // C ref: do_wear.c doremring()
    if (c === 'R') {
        return await handleRemove(player, display, game);
    }

    // Take off all worn items (category menu)
    // C ref: do_wear.c doddoremarm()
    if (c === 'A') {
        return await handleRemoveAll(player, display, game);
    }

    // Engrave
    // C ref: engrave.c doengrave()
    if (c === 'E') {
        return await handleEngrave(player, display, game);
    }

    // Wear armor
    if (c === 'W') {
        return await handleWear(player, display, game);
    }

    // Put on ring/accessory
    // C ref: do_wear.c doputon()
    if (c === 'P') {
        return await handlePutOn(player, display, game);
    }

    // Take off armor
    if (c === 'T') {
        return await handleTakeOff(player, display, game);
    }

    // Drop
    if (c === 'd') {
        return await handleDrop(player, map, display);
    }

    // Drop by class/category
    // C ref: cmd.c binds 'D' to doddrop().
    if (c === 'D') {
        return await handleDropTypes(player, map, display);
    }

    // Eat
    if (c === 'e') {
        return await handleEat(player, display, game);
    }

    // Quaff (drink)
    if (c === 'q') {
        return await handleQuaff(player, map, display);
    }

    // Apply / use item
    // C ref: apply.c doapply()
    if (c === 'a') {
        return await handleApply(player, map, display, game);
    }

    // Pay shopkeeper
    // C ref: shk.c dopay()
    if (c === 'p') {
        return await handlePay(player, map, display, game);
    }

    // Read scroll/spellbook
    // C ref: read.c doread()
    if (c === 'r') {
        if (getMenuRequested()) setMenuRequested(false);
        return await handleRead(player, display, game);
    }

    // Zap wand
    if (c === 'z') {
        return await handleZap(player, map, display, game);
    }

    // Look (:)
    if (c === ':') {
        return await dolook(game);
    }

    // What is (;)
    if (c === ';') {
        return await doquickwhatis(game);
    }

    // Whatis (/)
    // C ref: pager.c dowhatis()
    if (c === '/') {
        return await dowhatis(game);
    }

    // Whatdoes (&)
    // C ref: pager.c dowhatdoes()
    if (c === '&') {
        return await handleWhatdoes(game);
    }

    // Discoveries (\)
    // C ref: o_init.c dodiscovered()
    if (c === '\\') {
        return await handleDiscoveries(game);
    }

    // History (V)
    // C ref: pager.c dohistory()
    if (c === 'V') {
        return await handleHistory(game);
    }

    // List known spells (+)
    // C ref: spell.c dovspell()
    if (c === '+') {
        return await handleKnownSpells(player, display);
    }

    // Cast spell (Z)
    // C ref: spell.c docast()
    if (c === 'Z') {
        return await docast(player, display, map, game);
    }

    // Version (v)
    // C ref: pager.c doversion()
    if (c === 'v') {
        // Keep the existing nonblocking --More-- boundary behavior for parity,
        // but populate the message with the current Royal Jelly build string.
        const line0 = VERSION_STRING;
        const line1 = '--More--';
        if (typeof display.clearRow === 'function') display.clearRow(0);
        if (typeof display.clearRow === 'function') display.clearRow(1);
        display.topMessage = null;
        display._topMessageRow1 = undefined;
        display.messageNeedsMore = false;
        if (typeof display.putstr === 'function') {
            display.putstr(0, 0, line0);
            display.putstr(0, 1, line1);
            if (typeof display.setCursor === 'function') {
                display.setCursor(Math.min(line1.length, (display.cols || 80) - 1), 1);
            }
        } else {
            await display.putstr_message(`${line0} ${line1}`);
            return { moved: false, tookTime: false, terminalScreenOwned: true };
        }
        display.topMessage = line0;
        display._topMessageRow1 = line1;
        display.messageNeedsMore = true;
        await more(display, { game, site: 'cmd.version' });
        return { moved: false, tookTime: false, terminalScreenOwned: true };
    }

    // Kick (Ctrl+D)
    if (ch === 4) {
        return await handleKick(player, map, display, game);
    }

    // Previous messages (Ctrl+P)
    if (ch === 16) {
        return await handlePrevMessages(display);
    }

    // Attributes / Enlightenment (Ctrl+X)
    // C ref: cmd.c doattributes()
    if (ch === 24) {
        await doattributes(game);
        return { moved: false, tookTime: false };
    }

    // View map overlays (DEL / Backspace on some tty keymaps)
    // C ref: cmd.c dooverview()
    if (ch === 127 || ch === 8) {
        return await handleViewMapPrompt(game);
    }

    // Help (?)
    if (c === '?') {
        return await handleHelp(game);
    }

    // Save (S)
    if (c === 'S') {
        return await handleSave(game);
    }

    // Options (O) — C ref: doset()
    if (c === 'O') {
        return await handleSet(game);
    }

    // Toggle autopickup (@) — C ref: dotogglepickup()
    if (c === '@') {
        return await handleTogglePickup(game);
    }

    // Quit (#quit or Ctrl+C)
    if (ch === 3) {
        const ans = await ynFunction('Really quit?', 'yn', 'n'.charCodeAt(0), display);
        if (String.fromCharCode(ans) === 'y') {
            game.gameOver = true;
            game.gameOverReason = 'quit';
            player.deathCause = 'quit';
            await display.putstr_message('Goodbye...');
        }
        return { moved: false, tookTime: false };
    }

    // Extended command (#)
    // C ref: cmd.c doextcmd()
    if (c === '#') {
        return await handleExtendedCommand(game);
    }

    // Travel command (_)
    // C ref: cmd.c dotravel()
    if (c === '_') {
        return await dotravel(game);
    }

    // Retravel (Ctrl+_)
    // C ref: cmd.c dotravel_target()
    if (ch === 31) { // Ctrl+_ (ASCII 31)
        if (game.travelX !== undefined && game.travelY !== undefined) {
            const path = findPath(map, player.x, player.y, game.travelX, game.travelY);
            if (!path) {
                await display.putstr_message('No path to previous destination.');
                return { moved: false, tookTime: false };
            }
            if (path.length === 0) {
                await display.putstr_message('You are already there.');
                return { moved: false, tookTime: false };
            }
            game.travelPath = path;
            game.travelStep = 0;
            await display.putstr_message(`Traveling... (${path.length} steps)`);
            return await dotravel_target(game);
        } else {
            await display.putstr_message('No previous travel destination.');
            return { moved: false, tookTime: false };
        }
    }

    // Wizard mode: Ctrl+V = #wizlevelport (level teleport)
    // C ref: cmd.c wiz_level_tele()
    if (ch === 22 && game.wizard) {
        return await wizLevelPort(game);
    }

    // Wizard mode: Ctrl+F = magic mapping (reveal map)
    // C ref: cmd.c wiz_map()
    if (ch === 6 && game.wizard) {
        return await wizMap(game);
    }

    // Wizard mode: Ctrl+T = teleport
    // C ref: cmd.c wiz_teleport()
    if (ch === 20 && game.wizard) {
        return await wizTeleport(game);
    }

    // Wizard mode: Ctrl+G = genesis (create monster)
    // C ref: cmd.c wiz_genesis()
    if (ch === 7 && game.wizard) {
        return await wizGenesis(game);
    }

    // Wizard mode: Ctrl+W = wish
    // C ref: cmd.c wiz_wish()
    if (ch === 23 && game.wizard) {
        return await wizWish(game);
    }

    // Wizard mode: Ctrl+I = identify all
    // C ref: cmd.c wiz_identify()
    if (ch === 9 && game.wizard) {
        await display_inventory(null, false, player, display, {
            wizardIdentify: true,
            wizIdentifyAccel: ch,
        });
        return { moved: false, tookTime: false };
    }

    // Redraw (Ctrl+R)
    if (ch === 18) {
        display.renderMap(map, player, fov);
        display.renderStatus(player);
        return { moved: false, tookTime: false };
    }

    // Prefix commands (modifiers for next command)
    // C ref: cmd.c:1624 do_reqmenu() — 'm' prefix
    if (c === 'm') {
        if (getMenuRequested()) {
            setMenuRequested(false);
        } else {
            setMenuRequested(true);
            // C ref: cmd.c do_reqmenu() — sets iflags.menu_requested
            // silently; no screen message in C's TTY implementation.
        }
        if (game?.inDoAgain && dispatchedFromQueue) {
            return await rhack(0, game);
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1671 do_fight() — 'F' prefix
    if (c === 'F') {
        if (getForceFight()) {
            await display.putstr_message('Double fight prefix, canceled.');
            setForceFight(false);
            if (game?.inDoAgain && dispatchedFromQueue) {
                return { moved: false, tookTime: false };
            }
        } else {
            setForceFight(true);
            // C does not print a message for the success case (only for double-prefix cancel)
            if (game?.inDoAgain && dispatchedFromQueue) {
                return await rhack(0, game);
            }
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1655 do_run() — 'G' prefix (run)
    if (c === 'G') {
        if (getRunMode()) {
            await display.putstr_message('Double run prefix, canceled.');
            clearRunMode();
            if (game?.inDoAgain && dispatchedFromQueue) {
                return { moved: false, tookTime: false };
            }
        } else {
            setRunMode(3); // run mode
            // C does not print a message for the success case
            if (game?.inDoAgain && dispatchedFromQueue) {
                return await rhack(0, game);
            }
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1639 do_rush() — 'g' prefix (rush)
    if (c === 'g') {
        if (getRunMode()) {
            await display.putstr_message('Double rush prefix, canceled.');
            clearRunMode();
            if (game?.inDoAgain && dispatchedFromQueue) {
                return { moved: false, tookTime: false };
            }
        } else {
            setRunMode(2); // rush mode
            // C does not print a message for the success case
            if (game?.inDoAgain && dispatchedFromQueue) {
                return await rhack(0, game);
            }
        }
        return { moved: false, tookTime: false };
    }

    // Escape -- ignore silently (cancels pending prompts)
    // C ref: cmd.c -- ESC aborts current command; parse():4891 clears count
    if (ch === 27) {
        // Also clear prefix flags
        setMenuRequested(false);
        setForceFight(false);
        clearRunMode();
        game.countAccum = null;
        return { moved: false, tookTime: false };
    }

    // Unknown command — use pline() so _lastMessage is updated for Norep tracking
    await pline(`Unknown command '${ch < 32 ? '^' + String.fromCharCode(ch + 64) : c}'.`);
    return { moved: false, tookTime: false };
}

async function handleExtendedCommand(game) {
    const { player, display } = game;
    const input = await readExtendedCommandLine(game, display);
    if (input !== null && (game?.cmdKey | 0) === '#'.charCodeAt(0)
        && typeof game.emitRunstep === 'function') {
        // C ref: moveloop_core() emits RUNSTEP_EVENT("fresh_cmd", 0) in the
        // command cycle where #<extcmd> is finalized (Enter), not on the
        // initial '#' prefix key.
        game.emitRunstep(0, 'fresh_cmd', game.cmdKey | 0);
    }
    if (input === null || input.trim() === '') {
        return { moved: false, tookTime: false };
    }
    const rawCmd = input.trim();
    // C ref: get_ext_cmd() accepts a unique prefix and resolves it to the full
    // command name. "#l\n" → "loot", "#lo\n" → "loot", etc.
    const completedRaw = displayCompletedExtcmd(rawCmd, game);
    const cmd = completedRaw.toLowerCase();
    const queueRepeatExtcmd = async (fn) => {
        if (game?.inDoAgain || typeof fn !== 'function') return;
        cmdq_clear(CQ_REPEAT);
        cmdq_add_ec(CQ_REPEAT, fn);
    };
    switch (cmd) {
        case 'o':
        case 'options':
            queueRepeatExtcmd((g) => handleSet(g));
            return await handleSet(game);
        case 'optionsfull':
            queueRepeatExtcmd((g) => handleSet(g, { showAdvanced: true }));
            return await handleSet(game, { showAdvanced: true });
        case 'adjust':
            queueRepeatExtcmd((g) => doorganize(g));
            return await doorganize(game);
        case 'wipe':
            queueRepeatExtcmd((g) => dowipe(g.player).then(t => ({ moved: false, tookTime: !!t })));
            return { moved: false, tookTime: !!(await dowipe(player)) };
        case 'pray':
            queueRepeatExtcmd((g) => dopray(g.player, g.map).then(t => ({ moved: false, tookTime: !!t })));
            return { moved: false, tookTime: !!(await dopray(player, game.map)) };
        case 'turn':
            queueRepeatExtcmd((g) => doturn(g.player, g.map).then(t => ({ moved: false, tookTime: !!t })));
            return { moved: false, tookTime: !!(await doturn(player, game.map)) };
        case 'dip':
            queueRepeatExtcmd((g) => dodip(g.player, g.map, g.display).then(t => ({ moved: false, tookTime: !!t })));
            return { moved: false, tookTime: !!(await dodip(player, game.map, display)) };
        case 'enhance': {
            // cf. weapon.c enhance_weapon_skill() — skill advancement menu.
            const rows = add_skills_to_menu();
            const advanceable = rows.filter((r) => r.canAdvance);
            if (!rows.length) {
                await display.putstr_message('You have no skills to show.');
                return { moved: false, tookTime: false };
            }
            if (!advanceable.length && game?.wizard) {
                await display.putstr_message('Advance skills without practice? [yn] (n) ');
                const resp = await nhgetch();
                const rc = String.fromCharCode(resp).toLowerCase();
                if (resp === 27 || rc === 'n') {
                    return { moved: false, tookTime: false };
                }
                const ranges = [
                    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: 'Fighting Skills' },
                    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: 'Weapon Skills' },
                    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: 'Spellcasting Skills' },
                ];
                const longest = rows.reduce((m, r) => Math.max(m, (r.name || '').length), 0);
                const slots = weapon_slots_available();
                const menuLines = [` Current skills:  (${slots} slots available)`, ''];
                for (const range of ranges) {
                    const group = rows.filter((r) => Number.isInteger(r.skill)
                        && r.skill >= range.first && r.skill <= range.last);
                    if (!group.length) continue;
                    menuLines.push(` ${range.name}`);
                    for (const r of group) {
                        const displayName = String(r.name || '').replace('bare-handed', 'bare handed');
                        const label = displayName.padEnd(longest, ' ');
                        const levelLabel = String(r.levelName || '').padEnd(12, ' ');
                        const practice = String(skill_practice_value(r.skill)).padStart(5, ' ');
                        const needed = String(Math.max(1, r.level || 0) * Math.max(1, r.level || 0) * 20).padStart(4, ' ');
                        menuLines.push(` ${label} ${levelLabel} ${practice}(${needed})`);
                    }
                }
                const rowsCap = Number.isInteger(display?.rows) ? display.rows : 24;
                const contentRows = Math.max(1, rowsCap - 1);
                const totalPages = Math.max(1, Math.ceil(menuLines.length / contentRows));
                for (let page = 0; page < totalPages; page++) {
                    const pageLines = menuLines.slice(page * contentRows, (page + 1) * contentRows);
                    pageLines.push(`(${page + 1} of ${totalPages})`);
                    if (display) {
                        if (Object.hasOwn(display, 'topMessage')) display.topMessage = null;
                        if (Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
                        if (typeof display.clearRow === 'function') display.clearRow(0);
                    }
                    if (typeof display.renderOverlayMenu === 'function') {
                        // Force full-screen for subsequent pages so leftover
                        // content from page 1 is fully cleared.
                        const menuOpts = page > 0 ? { forceFullScreen: true } : null;
                        display.renderOverlayMenu(pageLines, menuOpts);
                    }
                    if (typeof display?.setCursor === 'function') {
                        const cols = display.cols || 80;
                        const row = Math.max(0, Math.min(rowsCap, pageLines.length) - 1);
                        const marker = String(pageLines[row] || '');
                        display.setCursor(Math.min(cols - 1, 1 + marker.length), row);
                    }
                    const ch = await nhgetch();
                    // C ref: tty display — ESC or 'q' exits multi-page text windows immediately
                    if (ch === 27 || ch === 113) break; // ESC or 'q'
                }
                const last = display?._lastMapState;
                if (last?.gameMap && typeof display.renderMap === 'function') {
                    display.renderMap(last.gameMap, last.player, last.fov, last.flags || display.flags || {});
                    if (typeof display.renderStatus === 'function') display.renderStatus(last.player);
                    if (typeof display.renderMessageWindow === 'function') display.renderMessageWindow();
                }
                return { moved: false, tookTime: false };
            }
            const heading = advanceable.length > 0 ? 'Pick a skill to advance:' : 'Current skills:';
            await display.putstr_message(heading);
            const letters = 'abcdefghijklmnopqrstuvwxyz';
            for (let idx = 0; idx < rows.length; idx++) {
                const r = rows[idx];
                const letter = letters[idx] || '?';
                const mark = r.canAdvance ? ' *' : '';
                await display.putstr_message(`  ${letter} - ${r.name} [${r.levelName}]${mark}`);
            }
            if (!advanceable.length) return { moved: false, tookTime: false };
            await display.putstr_message('Skill to advance (letter or ESC):');
            const ech = await nhgetch();
            if (ech === 27) return { moved: false, tookTime: false };
            const ec = String.fromCharCode(ech);
            const idx = letters.indexOf(ec);
            const chosen = (idx >= 0 && idx < rows.length) ? rows[idx] : null;
            if (chosen && chosen.canAdvance) {
                skill_advance(chosen.skill);
                await display.putstr_message('You feel you could be more dangerous!');
                return { moved: false, tookTime: false };
            }
            return { moved: false, tookTime: false };
        }
        case 'chat':
            queueRepeatExtcmd((g) => dotalk(g));
            return { moved: false, tookTime: !!(await dotalk(game)) };
        case 'offer': {
            const tookTimeOffer = await dosacrifice(player, game.map);
            return { moved: false, tookTime: !!tookTimeOffer };
        }
        case 'sit':
            queueRepeatExtcmd((g) => dosit(g.player, g.map, g.display).then(t => ({ moved: false, tookTime: !!t })));
            return { moved: false, tookTime: !!(await dosit(player, game.map, display)) };
        case 'ride':
            queueRepeatExtcmd((g) => doride(g.player, g.map, g.display).then(t => ({ moved: false, tookTime: !!(t & ECMD_TIME) })));
            return { moved: false, tookTime: !!((await doride(player, game.map, display)) & ECMD_TIME) };
        case 'monster': {
            // cf. cmd.c domonability() — use polymorphed monster special ability.
            const isPolyd = !!(player.Upolyd || (player.mtimedone && player.mtimedone > 0));
            if (isPolyd) {
                if (player.type && can_breathe(player.type) && attacktype(player.type, AT_BREA)) {
                    return { moved: false, tookTime: !!(await dobreathe(player, game.map, display, game)) };
                }
                await display.putstr_message('Any special ability you may have is purely reflexive.');
            } else {
                await display.putstr_message("You don't have a special ability in your normal form!");
            }
            return { moved: false, tookTime: false };
        }
        case 'n':
        case 'name': {
            queueRepeatExtcmd(async (g) => handleExtendedCommandName(g));
            return await handleExtendedCommandName(game);
        }
        case 'force':
            queueRepeatExtcmd((g) => handleForce(g));
            return await handleForce(game);
        case 'loot':
            queueRepeatExtcmd((g) => handleLoot(g));
            return await handleLoot(game);
        case 'levelchange':
            queueRepeatExtcmd((g) => wizLevelChange(g));
            return await wizLevelChange(game);
        case 'wish':
            queueRepeatExtcmd((g) => wizWish(g));
            return await wizWish(game);
        case 'map':
            queueRepeatExtcmd(async (g) => await wizMap(g));
            return await wizMap(game);
        case 'teleport':
            queueRepeatExtcmd((g) => wizTeleport(g));
            return await wizTeleport(game);
        case 'genesis':
            queueRepeatExtcmd((g) => wizGenesis(g));
            return await wizGenesis(game);
        case 'wizloaddes':
            queueRepeatExtcmd((g) => handleWizLoadDes(g));
            return await handleWizLoadDes(game);
        case 'wizbury':
            queueRepeatExtcmd((g) => wiz_debug_cmd_bury(g.map, g.player).then(() => ({ moved: false, tookTime: false })));
            await wiz_debug_cmd_bury(game.map, player);
            return { moved: false, tookTime: false };
        case 'quit': {
            const ans = await ynFunction('Really quit?', 'yn', 'n'.charCodeAt(0), display);
            if (String.fromCharCode(ans) === 'y') {
                game.gameOver = true;
                game.gameOverReason = 'quit';
                player.deathCause = 'quit';
                await display.putstr_message('Goodbye...');
            }
            return { moved: false, tookTime: false };
        }
        // C ref: cmd.c extcmdlist[] — extended command aliases that map
        // to regular key commands. These appear in wizard-mode sessions
        // when players type #<cmd> instead of the single-key shortcut.
        case 'w':
        case 'wield':
            queueRepeatExtcmd((g) => handleWield(g.player, g.display));
            return await handleWield(player, display);
        case 'wear':
            queueRepeatExtcmd((g) => handleWear(g.player, g.display, g));
            return await handleWear(player, display, game);
        case 'e':
        case 'eat':
            queueRepeatExtcmd((g) => handleEat(g.player, g.display, g));
            return await handleEat(player, display, game);
        case 'r':
        case 'read':
            queueRepeatExtcmd((g) => handleRead(g.player, g.display, g));
            return await handleRead(player, display, game);
        case 'a':
        case 'again':
        case 'repeat':
            return { moved: false, tookTime: false, repeatRequest: true };
        case 'attributes':
            return { moved: false, tookTime: !!(await doattributes(game)) };
        case 'conduct':
            return { moved: false, tookTime: !!(await doconduct(game)) };
        case 'invoke':
            return await doinvoke(player, game);
        case 'u':
        case 'untrap':
            queueRepeatExtcmd(async (g) => handleExtendedCommandUntrap(g));
            return await handleExtendedCommandUntrap(game);
        case 'shell':
            await runShell(display, nhgetch, game.lifecycle);
            // Restore display after shell returns
            display.clearScreen();
            return { moved: false, tookTime: false };
        default:
            // C-style unknown extended command feedback
            await display.putstr_message(`#${rawCmd}: unknown extended command.`);
            return { moved: false, tookTime: false };
    }
}

function knownExtendedCommands(game) {
    const cmds = [
        'options', 'optionsfull', 'adjust', 'attributes', 'wipe', 'pray', 'turn', 'dip',
        'enhance', 'chat', 'conduct', 'offer', 'sit', 'monster', 'name', 'force', 'loot',
        'ride', 'quit', 'wield', 'wear', 'eat', 'read', 'again', 'repeat', 'untrap', 'invoke',
    ];
    if (game?.wizard) {
        cmds.push('levelchange', 'wish', 'map', 'teleport', 'genesis', 'wizloaddes', 'wizbury');
    }
    return cmds;
}

function displayCompletedExtcmd(typed, game) {
    const raw = String(typed || '');
    const lowered = raw.toLowerCase();
    if (!lowered) return raw;
    // C autocomplete table resolves bare "#e" to "#enhance".
    if (lowered === 'e') return 'enhance';
    // C shows literal one-letter progress for some extcmds while typing.
    // Keep these literal so typed echo matches C.
    if (lowered === 'd' || lowered === 's' || lowered === 'c' || lowered === 'ch' || lowered === 'p') return raw;
    const cmds = knownExtendedCommands(game);
    const exact = cmds.find((c) => c === lowered);
    if (exact) return raw;
    const matches = cmds.filter((c) => c.startsWith(lowered));
    if (matches.length === 1) return matches[0];
    return raw;
}

async function readExtendedCommandLine(game, display) {
    if (!display || typeof display.putstr !== 'function' || typeof display.clearRow !== 'function') {
        return await getlin('# ', display);
    }
    let line = '';
    while (true) {
        const shown = displayCompletedExtcmd(line, game);
        display.clearRow(0);
        await display.putstr(0, 0, `# ${shown}`);
        if (typeof display.setCursor === 'function') {
            const cols = display.cols || 80;
            // Cursor remains at typed length even when showing completion text.
            display.setCursor(Math.min(`# ${line}`.length, cols - 1), 0);
        }

        const ch = await nhgetch();
        if (ch === 13 || ch === 10) {
            if (display) {
                display.topMessage = null;
                display.messageNeedsMore = false;
                if (typeof display.clearRow === 'function') display.clearRow(0);
            }
            return line;
        }
        if (ch === 27) {
            if (display) {
                display.topMessage = null;
                display.messageNeedsMore = false;
                if (typeof display.clearRow === 'function') display.clearRow(0);
            }
            return null;
        }
        if (ch === 8 || ch === 127) {
            if (line.length > 0) line = line.slice(0, -1);
            continue;
        }
        if (ch >= 32 && ch < 127) {
            line += String.fromCharCode(ch);
        }
    }
}

async function handleExtendedCommandUntrap(game) {
    const { player, map, display } = game;
    let dir = null;
    while (!dir) {
        await display.putstr_message('In what direction? ');
        const dirCh = await nhgetch();
        display.topMessage = null;
        display.messageNeedsMore = false;

        if (dirCh === 27 || dirCh === 32) {
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        const c = String.fromCharCode(dirCh).toLowerCase();
        dir = DIRECTION_KEYS[c] || null;
        // C getdir() accepts '.'/s as "here" for commands like #untrap.
        if (!dir && (c === '.' || c === 's')) dir = [0, 0];
    }

    // Until full trap.c untrap mechanics are ported, consume the command flow
    // without allowing the direction key to turn into accidental movement.
    const tx = player.x + dir[0];
    const ty = player.y + dir[1];
    const trap = map?.trapAt?.(tx, ty);
    if (!trap) {
        // C ref: trap.c untrap(): no floor trap and no adjacent door trap path.
        await display.putstr_message('You know of no traps there.');
        return { moved: false, tookTime: false };
    }

    // C-faithful core for shooting traps: untrap_prob() + disarm_shooting_trap().
    if (trap.ttyp === DART_TRAP || trap.ttyp === ARROW_TRAP) {
        let chance = 3;
        if (player.confused || player.hallucinating) chance++;
        if (player.blind) chance++;
        if (player.stunned) chance += 2;
        if (player.fumbling) chance *= 2;
        if (trap.madeby_u) chance--;
        if (chance < 1) chance = 1;

        if (rn2(chance)) {
            const tname = (trap.ttyp === DART_TRAP) ? 'dart trap' : 'arrow trap';
            const which = trap.madeby_u ? 'Your' : 'That';
            await display.putstr_message(`${which} ${tname} is difficult to disarm.`);
            return { moved: false, tookTime: true };
        }

        const which = trap.madeby_u ? 'your' : 'the';
        await display.putstr_message(`You disarm ${which} trap.`);
        const otyp = (trap.ttyp === DART_TRAP) ? DART : ARROW;
        await cnv_trap_obj(otyp, 50 - rnl(50), trap, false, player, map);
        return { moved: false, tookTime: true };
    }

    if (trap.ttyp === SQKY_BOARD) {
        while (true) {
            const untrapPrompt = 'What do you want to untrap with? [*] ';
            await display.putstr_message(untrapPrompt);
            const toolCh = await nhgetch();
            if (toolCh === 27 || toolCh === 32) {
                await display.putstr_message('Never mind.');
                return { moved: false, tookTime: false };
            }
        }
    }

    await display.putstr_message('You cannot disable that trap.');
    return { moved: false, tookTime: false };
}

// C ref: cmd.c do_naming() — #name command menu
// C shows a PICK_ONE menu first; if dismissed, falls through to a ynFunction prompt.
async function handleExtendedCommandName(game) {
    const { player, display, map } = game;

    // C ref: cmd.c do_naming() — build PICK_ONE menu matching C's tty output
    const menuLines = [
        'What do you want to name?',
        '',
        'm - a monster',
        'i - a particular object in inventory',
        'o - the type of an object in inventory',
        'f - the type of an object upon the floor',
        'd - the type of an object on discoveries list',
        'a - record an annotation for the current level',
        '(end)',
    ];
    let sel = await renderOverlayMenuUntilDismiss(display, menuLines, 'miofda', { dismissOnUnrecognized: true });

    // C ref: if menu is dismissed without selection, re-prompt as a single-line yn prompt.
    // C's tty_yn_function formats letter choices as [min-max or ?*], not [adefimo].
    // For choices 'adefimo', min='a', max='o' → "[a-o or ?*]"
    if (!sel) {
        const prompt = 'What do you want to name? [a-o or ?*] ';
        if (typeof display.clearRow === 'function') {
            display.clearRow(0);
            if (Object.hasOwn(display, '_topMessageRow1') && display._topMessageRow1 !== undefined) {
                display.clearRow(1);
                display._topMessageRow1 = undefined;
            }
        }
        if (Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
        if (Object.hasOwn(display, 'moreMarkerActive')) display.moreMarkerActive = false;
        if (Object.hasOwn(display, 'topMessage')) display.topMessage = null;
        await display.putstr(0, 0, prompt, 7); // CLR_GRAY=7
        if (Object.hasOwn(display, 'topMessage')) display.topMessage = prompt.trimEnd();
        const cols = Number.isInteger(display.cols) ? display.cols : 80;
        if (typeof display.setCursor === 'function') {
            display.setCursor(Math.min(prompt.length, cols - 1), 0);
        }
        const ch = await nhgetch();
        const c = String.fromCharCode(ch).toLowerCase();
        if (c === '\x1b' || c === ' ' || c === '\0' || c === '\n' || c === '\r'
            || !'adefimo'.includes(c)) {
            // C ref: do_naming() returns 0 → "Never mind." from getobj paths
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        sel = c;
    }
    return await executeNamingChoice(sel, player, display, map);
}

async function executeNamingChoice(sel, player, display, map) {
    switch (sel) {
    case 'm':
        await do_mgivenname(player);
        return { moved: false, tookTime: false };
    case 'i': {
        const name_ok = (obj) => obj ? 1 : 0; // GETOBJ_SUGGEST for any item
        const obj = await getobj('name', name_ok, 0, player);
        if (obj) await do_oname(obj, player);
        return { moved: false, tookTime: false };
    }
    case 'o':
        return await handleCallObjectTypePrompt(player, display);
    case 'f':
        await namefloorobj(player, map, display);
        return { moved: false, tookTime: false };
    case 'd':
        // C ref: docallcmd_by_class() — name type by discovery list
        return { moved: false, tookTime: false };
    case 'a':
        await getlin('What do you want to call this dungeon level?', display);
        return { moved: false, tookTime: false };
    default:
        return { moved: false, tookTime: false };
    }
}

// Autotranslated from cmd.c:407
export function doprev_message() {
  nh_doprev_message();
  return ECMD_OK;
}

// Autotranslated from cmd.c:415
export function timed_occupation(game) {
  let result;
  midlog_enter("timed_occupation", "cmd.js", 0, "timed_occupation");
  timed_occ_fn();
  if (game.multi > 0) game.multi--;
  result = game.multi > 0;
  midlog_exit_int("timed_occupation", result, "cmd.js", 0, "timed_occupation");
  return result;
}

// Autotranslated from cmd.c:442
export function reset_occupations() {
  reset_remarm();
  reset_pick();
  reset_trapset();
}

// Autotranslated from cmd.c:622
export function cmdq_reverse(head) {
  let prev = null, curr = head, next;
  while (curr) {
    next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}

// Autotranslated from cmd.c:1201
export async function enter_explore_mode() {
  if (discover) { await You("are already in explore mode."); }
  else {
    let oldmode = !wizard ? "normal game" : "debug mode";
    if (!authorize_explore_mode()) {
      if (!wizard) { await You("cannot access explore mode."); return ECMD_OK; }
      else {
        await pline( "Note: normally you wouldn't be allowed into explore mode.");
      }
    }
    await pline("Beware! From explore mode there will be no return to %s,", oldmode);
    if (paranoid_query(ParanoidQuit, "Do you want to enter explore mode?")) {
      discover = true;
      wizard = false;
      clear_nhwindow(WIN_MESSAGE);
      await You("are now in non-scoring explore mode.");
    }
    else { clear_nhwindow(WIN_MESSAGE); await pline("Continuing with %s.", oldmode); }
  }
  return ECMD_OK;
}

// Autotranslated from cmd.c:1323
export async function wiz_dumpmap(map) {
  let fname, fp, x, y;
  fname = getenv("NETHACK_DUMPMAP");
  if (!fname || !fname) fname = "dumpmap.txt";
  fp = fopen(fname, "w");
  if (!fp) { await pline("Cannot open %s for writing.", fname); return ECMD_OK; }
  for (y = 0; y < ROWNO; y++) {
    for (x = 0; x < COLNO; x++) {
      if (x > 0) fputc(' ', fp);
      fprintf(fp, "%d", map.locations[x][y].typ);
    }
    fputc('\n', fp);
  }
  fclose(fp);
  await pline("Map dumped to %s.", fname);
  return ECMD_OK;
}

// Autotranslated from cmd.c:1357
export async function wiz_dumpobj() {
  let fname, fp, obj;
  fname = getenv("NETHACK_DUMPOBJ");
  if (!fname || !fname) fname = "dumpobj.txt";
  fp = fopen(fname, "w");
  if (!fp) { await pline("Cannot open %s for writing.", fname); return ECMD_OK; }
  for (obj = fobj; obj; obj = obj.nobj) {
    fprintf(fp, "%d %d %d %u %s\n", obj.ox, obj.oy, obj.otyp, obj.owt, objectData[obj.otyp].oc_name);
  }
  fclose(fp);
  await pline("Objects dumped to %s.", fname);
  return ECMD_OK;
}

// Autotranslated from cmd.c:1387
export async function wiz_dumpsnap() {
  let phasebuf;
  phasebuf = "manual";
  await getlin("Checkpoint phase tag:", phasebuf);
  mungspaces(phasebuf);
  if (!phasebuf) {
    phasebuf = "manual";
  }
  harness_dump_checkpoint(phasebuf);
  await pline("Snapshot appended (%s).", phasebuf);
  return ECMD_OK;
}

// Autotranslated from cmd.c:1595
export function dolookaround_floodfill_findroom(x, y, map) {
  let typ = map.locations[x][y].typ;
  if (IS_STWALL(typ) || IS_DOOR(typ) || IS_TREE(typ) || IS_WATERWALL(typ) || typ === LAVAWALL || typ === IRONBARS || typ === SCORR || typ === SDOOR || typ === DRAWBRIDGE_UP) return false;
  return true;
}

// Autotranslated from cmd.c:1608
export async function lookaround_known_room(x, y, player) {
  let sel = selection_new(), rmno = player.urooms[0] - ROOMOFFSET, qbuf;
  set_selection_floodfillchk(dolookaround_floodfill_findroom);
  selection_floodfill(sel, x, y, true);
  if (!u_at(player, x, y)) set_msg_xy(x, y);
  if (u_have_seen_whole_selection(sel)) {
    let u_in =  selection_getpoint(x, y, sel);
    await You("%s %s %s.", u_at(player, x, y) && u_in && u_can_see_whole_selection(sel) ? "are in" : (u_at(player, x, y)) ? "remember this as" : "remember that as", an(selection_size_description(sel, qbuf)), rmno >= 0 ? "room" : "area");
  }
  else if (u_have_seen_bounds_selection(sel)) {
    await You("guess %s to be %s %s.", u_at(player, x, y) ? "this" : "that", an(selection_size_description(sel, qbuf)), rmno >= 0 ? "room" : "area");
  }
  else {
    await You("can't guess the size of %s area.", u_at(player, x, y) ? "this" : "that");
  }
  selection_free(sel, true);
}

// Autotranslated from cmd.c:1721
export function do_move_west() {
  set_move_cmd(DIR_W, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1728
export function do_move_northwest() {
  set_move_cmd(DIR_NW, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1735
export function do_move_north() {
  set_move_cmd(DIR_N, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1742
export function do_move_northeast() {
  set_move_cmd(DIR_NE, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1749
export function do_move_east() {
  set_move_cmd(DIR_E, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1756
export function do_move_southeast() {
  set_move_cmd(DIR_SE, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1763
export function do_move_south() {
  set_move_cmd(DIR_S, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1770
export function do_move_southwest() {
  set_move_cmd(DIR_SW, 0);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1778
export function do_rush_west() {
  set_move_cmd(DIR_W, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1785
export function do_rush_northwest() {
  set_move_cmd(DIR_NW, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1792
export function do_rush_north() {
  set_move_cmd(DIR_N, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1799
export function do_rush_northeast() {
  set_move_cmd(DIR_NE, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1806
export function do_rush_east() {
  set_move_cmd(DIR_E, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1813
export function do_rush_southeast() {
  set_move_cmd(DIR_SE, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1820
export function do_rush_south() {
  set_move_cmd(DIR_S, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1827
export function do_rush_southwest() {
  set_move_cmd(DIR_SW, 3);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1835
export function do_run_west() {
  set_move_cmd(DIR_W, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1842
export function do_run_northwest() {
  set_move_cmd(DIR_NW, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1849
export function do_run_north() {
  set_move_cmd(DIR_N, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1856
export function do_run_northeast() {
  set_move_cmd(DIR_NE, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1863
export function do_run_east() {
  set_move_cmd(DIR_E, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1870
export function do_run_southeast() {
  set_move_cmd(DIR_SE, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1877
export function do_run_south() {
  set_move_cmd(DIR_S, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1884
export function do_run_southwest() {
  set_move_cmd(DIR_SW, 1);
  return ECMD_TIME;
}

// Autotranslated from cmd.c:1939
export async function do_fight(game) {
  if (game.svc.context.forcefight) {
    await Norep("Double fight prefix, canceled.");
    game.svc.context.forcefight = 0;
    game.gd.domove_attempting = 0;
    return ECMD_CANCEL;
  }
  game.svc.context.forcefight = 1;
  game.gd.domove_attempting |= DOMOVE_WALK;
  return ECMD_OK;
}

// Autotranslated from cmd.c:2613
export async function handler_change_autocompletions() {
  let win, any, i, n, picks = null, clr = NO_COLOR, ec, buf;
  win = create_nhwindow(NHW_MENU);
  start_menu(win, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < extcmdlist_length; i++) {
    ec = extcmdlist[i];
    if ((ec.flags & (INTERNALCMD|CMD_NOT_AVAILABLE)) !== 0) {
      continue;
    }
    if (ec.ef_txt.length < 2) {
      continue;
    }
    any.a_int = (i + 1);
    buf = `${(ec.flags & AUTOCOMP_ADJ) ? '*' : ' '} ${ec.ef_txt}: ${ec.ef_desc}`;
    add_menu(win, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf, (ec.flags & AUTOCOMPLETE) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
  }
  end_menu(win, "Which commands autocomplete?");
  n = await select_menu(win, PICK_ANY, picks);
  if (n >= 0) {
    let j;
    for (i = 0; i < extcmdlist_length; i++) {
      let setit = false;
      ec = extcmdlist[i];
      if ((ec.flags & (INTERNALCMD|CMD_NOT_AVAILABLE)) !== 0) {
        continue;
      }
      if (ec.ef_txt.length < 2) {
        continue;
      }
      buf = ec.ef_txt;
      for (j = 0; j < n; ++j) {
        if (ec === extcmdlist[(picks[j].item.a_int - 1)]) {
          parseautocomplete(buf, true);
          setit = true;
          break;
        }
      }
      if (!setit) { parseautocomplete(buf, false); }
    }
    if (n > 0) (picks, 0);
  }
  destroy_nhwindow(win);
}

// Autotranslated from cmd.c:3144
export function cmd_from_dir(dir, mode) {
  return cmd_from_func(move_funcs[dir][mode]);
}

// Autotranslated from cmd.c:3321
export function spkey_name(nhkf) {
  let name = 0, i;
  for (i = 0; i < SIZE(spkeys_binds); i++) {
    if (spkeys_binds[i].nhkf === nhkf) {
      name = (nhkf === NHKF_ESC) ? "escape" : spkeys_binds[i].name;
      break;
    }
  }
  return name;
}

// Autotranslated from cmd.c:3409
export function all_options_autocomplete(sbuf) {
  let efp, buf;
  for (efp = extcmdlist; efp.ef_txt; efp++) {
    if ((efp.flags & AUTOCOMP_ADJ) !== 0) {
      buf = `AUTOCOMPLETE=${(efp.flags & AUTOCOMPLETE) ? "" : "!"}${efp.ef_txt}\n`;
      strbuf_append(sbuf, buf);
    }
  }
}

// Autotranslated from cmd.c:3425
export function count_autocompletions() {
  let efp, n = 0;
  for (efp = extcmdlist; efp.ef_txt; efp++) {
    if ((efp.flags & AUTOCOMP_ADJ) !== 0) n++;
  }
  return n;
}

// Autotranslated from cmd.c:3717
export function rnd_extcmd_idx() {
  return rn2(extcmdlist_length + 1) - 1;
}

// C ref: cmd.c:3960 xytod() — convert dx,dy to direction index
export function xytod(x, y) {
  for (let dd = 0; dd < N_DIRS; dd++) {
    if (x === xdir[dd] && y === ydir[dd]) return dd;
  }
  return DIR_ERR;
}

// C ref: cmd.c:3972 dtoxy() — convert direction index to dx,dy
export function dtoxy(cc, dd) {
  if (dd > DIR_ERR && dd < N_DIRS_Z) { cc.x = xdir[dd]; cc.y = ydir[dd]; }
}

// C ref: cmd.c:4014 dxdy_moveok() — clear diagonal if NODIAG monster
export function dxdy_moveok(player) {
  if (player.dx && player.dy && player.umonnum === PM_GRID_BUG) player.dx = player.dy = 0;
  return player.dx || player.dy;
}

// Autotranslated from cmd.c:4042
export async function get_adjacent_loc(prompt, emsg, x, y, cc, player) {
  let new_x, new_y;
  if (!await getdir(prompt)) { pline1(Never_mind); return 0; }
  new_x = x + player.dx;
  new_y = y + player.dy;
  if (cc && isok(new_x, new_y)) { cc.x = new_x; cc.y = new_y; }
  else { if (emsg) pline1(emsg); return 0; }
  return 1;
}

// Autotranslated from cmd.c:4233
export async function show_direction_keys(win, centerchar, nodiag) {
  let buf;
  if (!centerchar) centerchar = ' ';
  if (nodiag) {
    buf = ` ${visctrl(cmd_from_func(do_move_north))} `;
    await putstr(win, 0, buf);
    await putstr(win, 0, " | ");
    buf = ` ${visctrl(cmd_from_func(do_move_west))}- ${centerchar} -${visctrl(cmd_from_func(do_move_east))}`;
    await putstr(win, 0, buf);
    await putstr(win, 0, " | ");
    buf = ` ${visctrl(cmd_from_func(do_move_south))} `;
    await putstr(win, 0, buf);
  }
  else {
    buf = ` ${visctrl(cmd_from_func(do_move_northwest))} ${visctrl(cmd_from_func(do_move_north))} ${visctrl(cmd_from_func(do_move_northeast))}`;
    await putstr(win, 0, buf);
    await putstr(win, 0, " \\ | / ");
    buf = ` ${visctrl(cmd_from_func(do_move_west))}- ${centerchar} -${visctrl(cmd_from_func(do_move_east))}`;
    await putstr(win, 0, buf);
    await putstr(win, 0, " / | \\ ");
    buf = ` ${visctrl(cmd_from_func(do_move_southwest))} ${visctrl(cmd_from_func(do_move_south))} ${visctrl(cmd_from_func(do_move_southeast))}`;
    await putstr(win, 0, buf);
  }
}

// confdir() moved to hack.js (near u_maybe_impaired/impaired_movement)

// C ref: cmd.c:4424 directionname() — direction index to name string
export function directionname(dir) {
  const dirnames = [ "west", "northwest", "north", "northeast", "east", "southeast", "south", "southwest", "down", "up", ];
  if (dir < 0 || dir >= N_DIRS_Z) return "invalid";
  return dirnames[dir];
}

// Autotranslated from cmd.c:4635
export function there_cmd_menu_next2u(win, x, y, mod, act, map, player) {
  let K = 0, buf, typ = map.locations[x][y].typ, ttmp, mtmp;
  if (!next2u(x, y)) return K;
  if (IS_DOOR(typ)) {
    let key_or_pick, card, dm = map.locations[x][y].flags || 0;
    if ((dm & (D_CLOSED | D_LOCKED))) {
      mcmd_addmenu(win, MCMD_OPEN_DOOR, "Open the door"), ++K;
      key_or_pick = (carrying(SKELETON_KEY) || carrying(LOCK_PICK));
      card = (carrying(CREDIT_CARD) != null);
      if (key_or_pick || card) {
        buf = `${key_or_pick ? "lock or " : ""}unlock the door`;
        mcmd_addmenu(win, MCMD_LOCK_DOOR, upstart(buf)), ++K;
      }
      mcmd_addmenu(win, MCMD_UNTRAP_DOOR, "Search the door for a trap"), ++K;
      mcmd_addmenu(win, MCMD_KICK_DOOR, "Kick the door"), ++K;
    }
    else if ((dm & D_ISOPEN) && (mod === CLICK_2)) {
      mcmd_addmenu(win, MCMD_CLOSE_DOOR, "Close the door"), ++K;
    }
  }
  if (typ <= SCORR) mcmd_addmenu(win, MCMD_SEARCH, "Search for secret doors"), ++K;
  if ((ttmp = t_at(x, y, map)) != null && ttmp.tseen) {
    mcmd_addmenu(win, MCMD_LOOK_TRAP, "Examine trap"), ++K;
    if (ttmp.ttyp !== VIBRATING_SQUARE) mcmd_addmenu(win, MCMD_UNTRAP_TRAP, "Attempt to disarm trap"), ++K;
    mcmd_addmenu(win, MCMD_MOVE_DIR, "Move on the trap"), ++K;
  }
  if (map.locations[x][y].glyph === objnum_to_glyph(BOULDER)) mcmd_addmenu(win, MCMD_MOVE_DIR, "Push the boulder"), ++K;
  mtmp = m_at(x, y, map);
  if (mtmp && !canspotmon(mtmp)) mtmp = null;
  if (mtmp && which_armor(mtmp, W_SADDLE)) {
    let mnam = x_monnam(mtmp, ARTICLE_THE,  0, SUPPRESS_SADDLE, false);
    if (!player.usteed) { buf = `Ride ${mnam}`; mcmd_addmenu(win, MCMD_RIDE, buf), ++K; }
    buf = `Remove saddle from ${mnam}`;
    mcmd_addmenu(win, MCMD_REMOVE_SADDLE, buf), ++K;
  }
  if (mtmp && can_saddle(mtmp) && !which_armor(mtmp, W_SADDLE) && carrying(SADDLE)) {
    buf = `Put saddle on ${mon_nam(mtmp)}`;
    mcmd_addmenu(win, MCMD_APPLY_SADDLE, buf), ++K;
  }
  if (mtmp && (mtmp.mpeaceful || mtmp.mtame)) {
    buf = `Talk to ${mon_nam(mtmp)}`;
    mcmd_addmenu(win, MCMD_TALK, buf), ++K;
    buf = `Swap places with ${mon_nam(mtmp)}`;
    mcmd_addmenu(win, MCMD_MOVE_DIR, buf), ++K;
    buf = `${!has_mgivenname(mtmp) ? "Name" : "Rename"} ${mon_nam(mtmp)}`;
    mcmd_addmenu(win, MCMD_NAME, buf), ++K;
  }
  if ((mtmp && !(mtmp.mpeaceful || mtmp.mtame)) || glyph_is_invisible(glyph_at(x, y))) {
    buf = `Attack ${mtmp ? mon_nam(mtmp) : "unseen creature"}`;
    mcmd_addmenu(win, MCMD_ATTACK_NEXT2U, buf), ++K;
     act = MCMD_ATTACK_NEXT2U;
  }
  else {
  }
  return K;
}

// Autotranslated from cmd.c:4735
export function there_cmd_menu_far(win, x, y, mod, player) {
  let K = 0;
  if (mod === CLICK_1) {
    if (linedup(player.x, player.y, x, y, 1) && dist2(player.x, player.y, x, y) < 18*18) mcmd_addmenu(win, MCMD_THROW_OBJ, "Throw something"), ++K;
    mcmd_addmenu(win, MCMD_TRAVEL, "Travel here"), ++K;
  }
  return K;
}

// Autotranslated from cmd.c:4750
export function there_cmd_menu_common(win, x, y, mod, act, player) {
  let K = 0;
  if (mod === CLICK_1 || mod === CLICK_2) {
    if (!u_at(player, x, y) || (player?.Upolyd || (player?.mtimedone > 0) || false) || glyph_at(x, y) !== hero_glyph) mcmd_addmenu(win, MCMD_LOOK_AT, "Look at map symbol"), ++K;
  }
  return K;
}

// Autotranslated from cmd.c:5010
export async function here_cmd_menu(player) {
  await there_cmd_menu(player.x, player.y, CLICK_1);
  return '';
}

// Autotranslated from cmd.c:5385
export async function readchar(player) {
  let ch, x = player.x, y = player.y, mod = 0;
  ch = readchar_core( x, y, mod);
  return ch;
}

// Autotranslated from cmd.c:5511
export function yn_func_menu_opt(win, key, text, def) {
  let any;
  any = { a_int: 0 };
  any.a_char = key;
  add_menu(win, nul_glyphinfo, any, key, 0, ATR_NONE, NO_COLOR, text, (def === key) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
}

// Autotranslated from cmd.c:5808
export function dummyfunction() {
  return ECMD_CANCEL;
}

// Autotranslated from cmd.c:2416
export function extcmds_getentry(i) {
  if (i < 0 || i > extcmdlist_length) return 0;
  return extcmdlist[i];
}

// Autotranslated from cmd.c:3338
export function key2txt(c, txt) {
  if (c === ' ') {
    txt = "<space>";
  }
  else if (c === '\x1b') {
    txt = "<esc>";
  }
  else if (c === '\n') {
    txt = "<enter>";
  }
  else if (c === '\x7f') {
    txt = "<del>";
  }
  else {
    txt = visctrl( c);
  }
  return txt;
}

// Autotranslated from cmd.c:3697
export function random_response(buf, sz) {
  let c, count = 0;
  for (; ; ) {
    c = randomkey();
    if (c === '\n') {
      break;
    }
    if (c === '\x1b') { count = 0; break; }
    if (count < sz - 1) buf[count++] = c;
  }
  buf[count] = '\x00';
}

// Autotranslated from cmd.c:154
export function json_write_escaped(fp, s) {
  let c;
  if (!s) { fputs("", fp); return; }
  while ((c =  s++) !== '\x00') {
    if (c === '"' || c === '\\') { fputc('\\', fp); fputc(c, fp); }
    else if (c >= 0x20 && c <= 0x7e) { fputc(c, fp); }
    else { fprintf(fp, "\\u%04x", c & 0xff); }
  }
}

// Autotranslated from cmd.c:773
export function doc_extcmd_flagstr(menuwin, efp) {
  let Abuf;
  if (!efp) {
    let qbuf;
    add_menu_str(menuwin, "[A] Command autocompletes");
    qbuf = `[m] Command accepts '${visctrl(cmd_from_func(do_reqmenu))}' prefix`;
    add_menu_str(menuwin, qbuf);
    return  0;
  }
  else {
    let mprefix = accept_menu_prefix(efp), autocomplete = (efp.flags & AUTOCOMPLETE) !== 0;
    let p = Abuf;
    if (mprefix || autocomplete) {
       p = '[';
      if (mprefix) p = 'm';
      if (autocomplete) p = 'A';
       p = ']';
    }
     p = '\x00';
    return Abuf;
  }
}
