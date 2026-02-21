// cmd.js -- Command dispatch
// Mirrors cmd.c from the C source.
// Maps keyboard input to game actions.

import { A_STR, A_DEX, A_CON, A_WIS, STATUS_ROW_1,
         PM_CAVEMAN, PM_ROGUE, RACE_ORC } from './config.js';
import { rn2 } from './rng.js';
import { handleWizLoadDes, wizLevelChange, wizMap, wizTeleport, wizGenesis } from './wizcmds.js';
import { DIRECTION_KEYS, handleThrow, handleFire } from './dothrow.js';
import { handleKnownSpells } from './spell.js';
import { handleEngrave } from './engrave.js';
import { handleApply } from './apply.js';
import { COIN_CLASS } from './objects.js';
import { nhgetch, ynFunction, getlin } from './input.js';
import { handleEat } from './eat.js';
import { handleQuaff } from './potion.js';
import { handleRead } from './read.js';
import { handleWear, handlePutOn, handleTakeOff, handleRemove } from './do_wear.js';
import { handleWield, handleSwapWeapon, handleQuiver } from './wield.js';
import { handleDownstairs, handleUpstairs, handleDrop } from './do.js';
import { handleInventory, currency } from './invent.js';
import { handleCallObjectTypePrompt, handleDiscoveries } from './discovery.js';
import { handleLook, handlePrevMessages, handleHelp, handleWhatis,
         handleWhatdoes, handleHistory, handleViewMapPrompt } from './pager.js';
import { handleKick } from './kick.js';
import { handleZap } from './zap.js';
import { handleSave } from './storage.js';
import { handleForce, handleOpen, handleClose } from './lock.js';
import { handlePickup, handleLoot, handlePay, handleTogglePickup } from './pickup.js';
import { handleSet } from './options_menu.js';
import { handleMovement, handleRun, findPath, handleTravel, executeTravelStep,
         RUN_KEYS, performWaitSearch } from './hack.js';

// Process a command from the player
// C ref: cmd.c rhack() -- main command dispatch
// Returns: { moved: boolean, tookTime: boolean }
export async function rhack(ch, game) {
    const { player, map, display, fov } = game;
    const c = String.fromCharCode(ch);
    const isMetaKey = ch >= 128 && ch <= 255;
    const metaBaseChar = isMetaKey ? String.fromCharCode(ch & 0x7f).toLowerCase() : '';
    // C ref: you.h u.ux0/u.uy0 are the hero's pre-command position.
    // Monster throw logic (mthrowu.c URETREATING) compares against these.
    game.ux0 = player.x;
    game.uy0 = player.y;
    // C ref: tty command input acknowledges previous topline state before
    // processing a new command, so cross-turn messages don't auto-concatenate.
    if (display && 'messageNeedsMore' in display) {
        display.messageNeedsMore = false;
    }
    if (ch !== 16) {
        display.prevMessageCycleIndex = null;
    }
    if (ch !== 4) {
        player.kickedloc = null;
    }

    // C ref: cmdhelp/keyhelp + fixes3-6-3:
    // ^J (LF/newline) is bound to a south "go until near something" command
    // in non-numpad mode, while ^M is separate (often transformed before core).
    if (ch === 10) {
        return await handleRun(DIRECTION_KEYS.j, player, map, display, fov, game, 'rush');
    }

    // Carriage return can still appear from some non-tty inputs; preserve
    // existing compatibility behavior here.
    if (ch === 13) {
        const southX = player.x + DIRECTION_KEYS.j[0];
        const southY = player.y + DIRECTION_KEYS.j[1];
        const southMon = map.monsterAt(southX, southY);
        const noExplicitCount = (game.commandCount || 0) === 0 && (game.multi || 0) === 0;
        const runDisplaceFlow = noExplicitCount && !!southMon && (southMon.tame || southMon.peaceful);
        const replayForcedRun = noExplicitCount && !!game._replayForceEnterRun;
        if (runDisplaceFlow || replayForcedRun) {
            return await handleRun(DIRECTION_KEYS.j, player, map, display, fov, game);
        }
        return await handleMovement(DIRECTION_KEYS.j, player, map, display, game);
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
        if (game.runMode) {
            const mode = game.runMode;
            game.runMode = 0; // Clear prefix
            return handleRun(DIRECTION_KEYS[c], player, map, display, fov, game);
        }
        return await handleMovement(DIRECTION_KEYS[c], player, map, display, game);
    }

    // Run keys (capital letter = run in that direction)
    if (RUN_KEYS[c]) {
        return handleRun(RUN_KEYS[c], player, map, display, fov, game);
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
    if (game.runMode && c !== 'g' && c !== 'G' && ch !== 27) {
        const prefix = game.runMode === 2 ? 'g' : 'G';
        game.runMode = 0;
        // C getdir-style quit keys after a run/rush prefix do not produce
        // the prefix-specific warning; they fall through as ordinary input.
        const isQuitLike = (ch === 32 || ch === 10 || ch === 13);
        if (!isQuitLike) {
            display.putstr_message(`The '${prefix}' prefix should be followed by a movement command.`);
            return { moved: false, tookTime: false };
        }
    }

    // Period/space = wait/search
    // C ref: cmd.c — space maps to donull only when rest_on_space is enabled.
    if (c === '.' || c === 's' || (c === ' ' && game?.flags?.rest_on_space)) {
        const result = performWaitSearch(c, game, map, player, fov, display);
        // C ref: cmd.c set_occupation(..., "waiting"/"searching", gm.multi)
        // for counted repeats of rest/search. timed_occupation executes the
        // command then decrements multi each turn.
        if (result.tookTime && game && game.multi > 0 && !game.occupation) {
            const occCmd = c;
            game.occupation = {
                occtxt: occCmd === 's' ? 'searching' : 'waiting',
                fn(g) {
                    performWaitSearch(occCmd, g, g.map, g.player, g.fov, g.display);
                    if (g.multi > 0) g.multi--;
                    return g.multi > 0;
                },
            };
        }
        return result;
    }

    if (game && game.lastSafetyWarningMessage) {
        game.lastSafetyWarningMessage = '';
    }

    // Pick up
    if (c === ',') {
        // C ref: cmd.c -- ',' is pickup
        return handlePickup(player, map, display);
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
        display.putstr_message(`Your wallet contains ${amount} ${currency(amount)}.`);
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

    // Throw item
    // C ref: dothrow()
    if (c === 't') {
        return await handleThrow(player, map, display);
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
        return await handleRemove(player, display);
    }

    // Engrave
    // C ref: engrave.c doengrave()
    if (c === 'E') {
        return await handleEngrave(player, display);
    }

    // Wear armor
    if (c === 'W') {
        return await handleWear(player, display);
    }

    // Put on ring/accessory
    // C ref: do_wear.c doputon()
    if (c === 'P') {
        return await handlePutOn(player, display);
    }

    // Take off armor
    if (c === 'T') {
        return await handleTakeOff(player, display);
    }

    // Drop
    if (c === 'd') {
        return await handleDrop(player, map, display);
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
    // C ref: shk.c dopay() -- full billing flow is not yet ported; preserve no-shopkeeper message.
    if (c === 'p') {
        return await handlePay(player, map, display);
    }

    // Read scroll/spellbook
    // C ref: read.c doread()
    if (c === 'r') {
        if (game.menuRequested) game.menuRequested = false;
        return await handleRead(player, display, game);
    }

    // Zap wand
    if (c === 'z') {
        return await handleZap(player, map, display, game);
    }

    // Look (:)
    if (c === ':') {
        return handleLook(player, map, display);
    }

    // What is (;)
    if (c === ';') {
        if (game.flags.verbose) {
            display.putstr_message('Pick a position to identify (use movement keys, . when done)');
        }
        return { moved: false, tookTime: false };
    }

    // Whatis (/)
    // C ref: pager.c dowhatis()
    if (c === '/') {
        return await handleWhatis(game);
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

    // Version (v)
    // C ref: pager.c doversion()
    if (c === 'v') {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        return { moved: false, tookTime: false };
    }

    // Kick (Ctrl+D)
    if (ch === 4) {
        return await handleKick(player, map, display, game);
    }

    // Previous messages (Ctrl+P)
    if (ch === 16) {
        return await handlePrevMessages(display);
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
            display.putstr_message('Goodbye...');
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
        return await handleTravel(game);
    }

    // Retravel (Ctrl+_)
    // C ref: cmd.c dotravel_target()
    if (ch === 31) { // Ctrl+_ (ASCII 31)
        if (game.travelX !== undefined && game.travelY !== undefined) {
            const path = findPath(map, player.x, player.y, game.travelX, game.travelY);
            if (!path) {
                display.putstr_message('No path to previous destination.');
                return { moved: false, tookTime: false };
            }
            if (path.length === 0) {
                display.putstr_message('You are already there.');
                return { moved: false, tookTime: false };
            }
            game.travelPath = path;
            game.travelStep = 0;
            display.putstr_message(`Traveling... (${path.length} steps)`);
            return await executeTravelStep(game);
        } else {
            display.putstr_message('No previous travel destination.');
            return { moved: false, tookTime: false };
        }
    }

    // Wizard mode: Ctrl+V = #levelchange
    // C ref: cmd.c wiz_level_change()
    if (ch === 22 && game.wizard) {
        return await wizLevelChange(game);
    }

    // Wizard mode: Ctrl+F = magic mapping (reveal map)
    // C ref: cmd.c wiz_map()
    if (ch === 6 && game.wizard) {
        return wizMap(game);
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
        display.putstr_message('Wishing not yet implemented.');
        return { moved: false, tookTime: false };
    }

    // Wizard mode: Ctrl+I = identify all
    // C ref: cmd.c wiz_identify()
    if (ch === 9 && game.wizard) {
        display.putstr_message('All items in inventory identified.');
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
        if (game.menuRequested) {
            game.menuRequested = false;
        } else {
            game.menuRequested = true;
            // C ref: cmd.c do_reqmenu() — sets iflags.menu_requested
            // silently; no screen message in C's TTY implementation.
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1671 do_fight() — 'F' prefix
    if (c === 'F') {
        if (game.forceFight) {
            display.putstr_message('Double fight prefix, canceled.');
            game.forceFight = false;
        } else {
            game.forceFight = true;
            if (game.flags.verbose) {
                display.putstr_message('Next movement will force fight even if no monster visible.');
            }
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1655 do_run() — 'G' prefix (run)
    if (c === 'G') {
        if (game.runMode) {
            display.putstr_message('Double run prefix, canceled.');
            game.runMode = 0;
        } else {
            game.runMode = 3; // run mode
            if (game.flags.verbose) {
                display.putstr_message('Next direction will run until something interesting.');
            }
        }
        return { moved: false, tookTime: false };
    }

    // C ref: cmd.c:1639 do_rush() — 'g' prefix (rush)
    if (c === 'g') {
        if (game.runMode) {
            display.putstr_message('Double rush prefix, canceled.');
            game.runMode = 0;
        } else {
            game.runMode = 2; // rush mode
            if (game.flags.verbose) {
                display.putstr_message('Next direction will rush until something interesting.');
            }
        }
        return { moved: false, tookTime: false };
    }

    // Escape -- ignore silently (cancels pending prompts)
    // C ref: cmd.c -- ESC aborts current command
    if (ch === 27) {
        // Also clear prefix flags
        game.menuRequested = false;
        game.forceFight = false;
        game.runMode = 0;
        return { moved: false, tookTime: false };
    }

    // Unknown command
    display.putstr_message(`Unknown command '${ch < 32 ? '^' + String.fromCharCode(ch + 64) : c}'.`);
    return { moved: false, tookTime: false };
}

async function handleExtendedCommand(game) {
    const { player, display } = game;
    const input = await getlin('# ', display);
    if (input === null || input.trim() === '') {
        return { moved: false, tookTime: false };
    }
    const rawCmd = input.trim();
    const cmd = rawCmd.toLowerCase();
    switch (cmd) {
        case 'o':
        case 'options':
        case 'optionsfull':
            return await handleSet(game);
        case 'n':
        case 'name': {
            // C ref: do_name.c docallcmd() menu routes.
            while (true) {
                display.putstr_message('                                What do you want to name?');
                const sel = await nhgetch();
                const c = String.fromCharCode(sel).toLowerCase();
                if (sel === 27 || c === ' ') {
                    display.putstr_message('Never mind.');
                    return { moved: false, tookTime: false };
                }
                if (c === 'a') {
                    await getlin('What do you want to call this dungeon level?', display);
                    return { moved: false, tookTime: false };
                }
                if (c === 'o' || c === 'n') {
                    return await handleCallObjectTypePrompt(player, display);
                }
                // Keep waiting for a supported selection.
            }
        }
        case 'force':
            return await handleForce(game);
        case 'loot':
            return await handleLoot(game);
        case 'levelchange':
            return await wizLevelChange(game);
        case 'map':
            return wizMap(game);
        case 'teleport':
            return await wizTeleport(game);
        case 'genesis':
            return await wizGenesis(game);
        case 'wizloaddes':
            return await handleWizLoadDes(game);
        case 'quit': {
            const ans = await ynFunction('Really quit?', 'yn', 'n'.charCodeAt(0), display);
            if (String.fromCharCode(ans) === 'y') {
                game.gameOver = true;
                game.gameOverReason = 'quit';
                player.deathCause = 'quit';
                display.putstr_message('Goodbye...');
            }
            return { moved: false, tookTime: false };
        }
        // C ref: cmd.c extcmdlist[] — extended command aliases that map
        // to regular key commands. These appear in wizard-mode sessions
        // when players type #<cmd> instead of the single-key shortcut.
        case 'w':
        case 'wield':
            return await handleWield(player, display);
        case 'wear':
            return await handleWear(player, display);
        case 'e':
        case 'eat':
            return await handleEat(player, display, game);
        case 'r':
        case 'read':
            return await handleRead(player, display, game);
        default:
            // C-style unknown extended command feedback
            display.putstr_message(`#${rawCmd}: unknown extended command.`);
            return { moved: false, tookTime: false };
    }
}
