// nethack.js -- Core game initialization and main loop.
// Mirrors allmain.c from the C source.

import { A_DEX, A_CON,
         A_LAWFUL, A_NEUTRAL, A_CHAOTIC, A_NONE,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
         FEMALE, MALE, TERMINAL_COLS, ROOMOFFSET, SHOPBASE,
         TUTORIAL } from './const.js';
import { NORMAL_SPEED } from './const.js';
import { initRng, rn2, rnd, rn1, getRngState, setRngState, getRngCallCount, setRngCallCount, pushRngLogEntry } from './rng.js';
import { CLR_GRAY } from './display.js';
import { nhgetch_raw, nhgetch_wrap, getCount, getlin, setInputRuntime } from './input.js';
import { awaitDisplayMorePrompt } from './suspend.js';
import { FOV } from './vision.js';
import { Player, roles, races, validRacesForRole, validAlignsForRoleRace,
         needsGenderMenu, rankOf, godForRoleAlign, isGoddess, greetingForRole,
         Goodbye, roleNameForGender, alignName, formatLoreText } from './player.js';
import { GameMap } from './game.js';
import { initLevelGeneration, mklev, setGameSeed, isBranchLevelToDnum } from './dungeon.js';
import { runWithSplevPlayerSnapshot } from './sp_lev.js';
import { monsterNearby } from './hack.js';
import { simulatePostLevelInit, initFirstLevel } from './u_init.js';
import { getArrivalPosition, changeLevel as changeLevelCore } from './do.js';
import { loadSave, deleteSave, hasSave, saveGame,
         loadFlags, saveFlags, deserializeRng,
         restGameState, restLev,
         listSavedData, clearAllData } from './storage.js';
import { buildEntry, saveScore, loadScores, formatTopTenEntry, formatTopTenHeader } from './topten.js';
import { startRecording } from './keylog.js';
import { init_nhwindows, create_nhwindow, destroy_nhwindow,
         start_menu, add_menu, end_menu, select_menu,
       } from './windows.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE } from './const.js';
import { find_ac } from './do_wear.js';

// --- Game State ---
// C ref: decl.h -- globals are accessed via NH object (see DECISIONS.md #7)

// Player role selection -- faithful C chargen flow
// C ref: role.c player_selection() -- choose role, race, gender, alignment
// Autotranslated from role.c:2204
export async function playerSelection(game) {
    // Phase 0: Prompt for player name
    // C ref: role.c plnamesuffix() -> askname() — prompts "Who are you?"
    // Name prompt happens BEFORE role/race/gender/alignment selection
    await promptPlayerName(game);

    // Display copyright notice
    // C ref: allmain.c -- copyright screen displayed with autopick prompt
    game.display.clearScreen();
    await game.display.putstr(0, 4, "NetHack, Copyright 1985-2026", CLR_GRAY);
    await game.display.putstr(0, 5, "         By Stichting Mathematisch Centrum and M. Stephenson.", CLR_GRAY);
    await game.display.putstr(0, 6, "         Version 3.7.0 Royal Jelly — vibe-coded by The Hive.", CLR_GRAY);
    await game.display.putstr(0, 7, "         See license for details.", CLR_GRAY);
    if (game._namePromptEcho) {
        await game.display.putstr(0, 12, game._namePromptEcho, CLR_GRAY);
    }

    // Phase 1: "Shall I pick character's race, role, gender and alignment for you?"
    await game.display.putstr_message(
        "Shall I pick character's race, role, gender and alignment for you? [ynaq]"
    );
    const pickCh = await nhgetch_raw();
    const pickC = String.fromCharCode(pickCh);

    if (pickC === 'q') {
        await game._runLifecycle('promo');
        return;
    }

    if (pickC === 'y' || pickC === 'a') {
        // Auto-pick all attributes randomly
        await autoPickAll(game, pickC === 'y');
        return;
    }

    // 'n' or anything else → manual selection
    await manualSelection(game);
}

// Prompt for player name
// C ref: role.c plnamesuffix() -> askname()
export async function promptPlayerName(game) {
    const MAX_NAME_LENGTH = 31; // C ref: global.h PL_NSIZ = 32 (31 chars + null)

    // Check if name is already saved in options (like C NetHack config file)
    // C ref: options.c — name can be set via OPTIONS=name:playername
    if (game.flags.name && game.flags.name.trim() !== '') {
        // Use saved name (skip prompt)
        (game.u || game.player).name = game.flags.name.trim().substring(0, MAX_NAME_LENGTH);
        game._namePromptEcho = '';
        return;
    }

    // No saved name - prompt for it
    while (true) {
        const name = await getlin('Who are you? ', game.display);

        // C NetHack doesn't allow ESC to cancel - recursively prompts until valid
        if (name === null || name.trim() === '') {
            // Empty or cancelled - prompt again
            continue;
        }

        // Enforce max length (truncate if too long)
        const trimmedName = name.trim().substring(0, MAX_NAME_LENGTH);

        // C NetHack accepts any non-empty name
        (game.u || game.player).name = trimmedName;
        game._namePromptEcho = `Who are you? ${trimmedName}`;

        // Save name to options for future games (like C NetHack config)
        game.flags.name = trimmedName;
        saveFlags(game.flags);

        return;
    }
}

// Display game over screen
// C ref: end.c done() -> topten() -> outrip()
export async function showGameOver(game) {
    // Delete save file — game is over
    deleteSave();

    const p = (game.u || game.player);
    const deathCause = p.deathCause || game.gameOverReason || 'died';

    // Calculate final score (simplified C formula from end.c)
    // C ref: end.c done_in_by(), calc_score()
    // Base score is accumulated from exp + kills during play
    // Add gold
    p.score += p.gold;
    // Add 50 per dungeon level below 1
    if (p.dungeonLevel > 1) {
        p.score += (p.dungeonLevel - 1) * 50;
    }
    // Depth bonus for deep levels
    if (p.maxDungeonLevel > 20) {
        p.score += (p.maxDungeonLevel - 20) * 1000;
    }
    // Escaped bonus
    if (game.gameOverReason === 'escaped') {
        p.score += p.gold; // double gold for escaping
    }

    // Word-wrap death description for tombstone (max ~16 chars per line)
    const deathLines = wrapDeathText(deathCause, 16);

    // Show tombstone if flags.tombstone is enabled
    if (game.flags && game.flags.tombstone) {
        const year = String(new Date().getFullYear());
        game.display.renderTombstone(p.name, p.gold, deathLines, year);
        // Press any key prompt below tombstone
        await game.display.putstr(0, 20, '(Press any key)', 7);
        await nhgetch_raw();
    }

    // Build and save topten entry
    const entry = buildEntry(p, game.gameOverReason, roles, races);
    const rank = saveScore(entry);

    // Display topten list
    const scores = loadScores();
    game.display.clearScreen();

    const header = formatTopTenHeader();
    let row = 0;
    await game.display.putstr(0, row++, header, 14); // CLR_WHITE

    // Show entries around the player's rank
    // Find the player's entry index in scores (0-based)
    const playerIdx = rank > 0 ? rank - 1 : 0;
    const showStart = Math.max(0, playerIdx - 5);
    const showEnd = Math.min(scores.length, playerIdx + 6);

    if (showStart > 0) {
        await game.display.putstr(0, row++, '  ...', 7);
    }

    for (let i = showStart; i < showEnd; i++) {
        const lines = formatTopTenEntry(scores[i], i + 1);
        const isPlayer = (i === playerIdx);
        const color = isPlayer ? 10 : 7; // CLR_YELLOW : CLR_GRAY
        for (const line of lines) {
            if (row < game.display.rows - 2) {
                await game.display.putstr(0, row++, line.substring(0, game.display.cols), color);
            }
        }
    }

    if (showEnd < scores.length) {
        await game.display.putstr(0, row++, '  ...', 7);
    }

    // Farewell message
    row = Math.min(row + 1, game.display.rows - 3);
    const female = p.gender === FEMALE;
    const roleName = roleNameForGender(p.roleIndex, female);
    const farewell = `${Goodbye(p.roleIndex)} ${p.name} the ${roleName}...`;
    await game.display.putstr(0, row++, farewell, 14);

    // Play again prompt
    row = Math.min(row + 1, game.display.rows - 1);
    await game.display.putstr(0, row, 'Play again? [yn] ', 14);
    const ch = await nhgetch_raw();
    if (String.fromCharCode(ch) === 'y') {
        await game._runLifecycle('restart');
    } else {
        await game._runLifecycle('promo');
    }
}

// C ref: tutorial startup
export async function maybeDoTutorial(game) {
    const win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);
    add_menu(win, null, { ival: 'y' }, 'y'.charCodeAt(0), 0, ATR_NONE, 0, 'Yes, do a tutorial', 0);
    add_menu(win, null, { ival: 'n' }, 'n'.charCodeAt(0), 0, ATR_NONE, 0, 'No, just start play', 0);
    add_menu(win, null, null, 0, 0, ATR_NONE, 0, '', 0);  // C ref: options.c add_menu_str(win, "")
    add_menu(win, null, null, 0, 0, ATR_NONE, 0, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', 0);
    end_menu(win, 'Do you want a tutorial?');  // C ref: options.c — no leading space
    const sel = await select_menu(win, PICK_ONE);
    destroy_nhwindow(win);
    if (sel && sel[0].identifier.ival === 'y') {
        await enterTutorial(game);
    } else {
        // Clear the chargen menu from screen then re-render the map that was
        // already computed before maybeDoTutorial was called.
        game.display?.clearScreen?.();
        if (game.fov && (game.lev || game.map) && (game.u || game.player)) {
            const map = game.lev || game.map;
            const player = game.u || game.player;
            game.fov.compute(map, player.x, player.y);
            game.display.renderMap(map, player, game.fov, game.flags);
            if (typeof game.display.renderStatus === 'function') {
                game.display.renderStatus(player);
            }
            game.display.cursorOnPlayer(player);
        }
    }
}

export async function enterTutorial(game, opts = {}) {
    const { direct = false, deferRender = false } = opts;
    if (!direct) {
        await game.display.putstr_message('Entering the tutorial.');
        await awaitDisplayMorePrompt(game, game.display, () => nhgetch_raw(), {
            site: 'chargen.enterTutorial.morePrompt',
        });
    }

    const player = game.u || game.player;
    const applyTutorialStrip = () => {
        if (!game._tutorialStoredState) {
            game._tutorialStoredState = {
                inventory: Array.isArray(player.inventory) ? player.inventory.slice() : [],
                weapon: player.weapon || null,
                swapWeapon: player.swapWeapon || null,
                quiver: player.quiver || null,
                armor: player.armor || null,
                shield: player.shield || null,
                helmet: player.helmet || null,
                gloves: player.gloves || null,
                boots: player.boots || null,
                cloak: player.cloak || null,
                shirt: player.shirt || null,
                amulet: player.amulet || null,
                leftRing: player.leftRing || null,
                rightRing: player.rightRing || null,
                blindfold: player.blindfold || null,
                twoweap: !!player.twoweap,
                lastInvlet: Number.isInteger(player.lastInvlet) ? player.lastInvlet : null,
            };
        }

        player.inventory = [];
        player.weapon = null;
        player.swapWeapon = null;
        player.quiver = null;
        player.armor = null;
        player.shield = null;
        player.helmet = null;
        player.gloves = null;
        player.boots = null;
        player.cloak = null;
        player.shirt = null;
        player.amulet = null;
        player.leftRing = null;
        player.rightRing = null;
        player.blindfold = null;
        player.twoweap = false;
        // C tutorial flow effectively starts with a fresh, empty inventory.
        // Reset letter allocation so first tutorial pickup is 'a'.
        player.lastInvlet = null;
        find_ac(player);
    };
    game._applyTutorialStrip = applyTutorialStrip;
    if (game.pendingPrompt && typeof game.pendingPrompt.onKey === 'function') {
        game._pendingTutorialStrip = true;
    } else {
        applyTutorialStrip();
    }

    game.lev = await runWithSplevPlayerSnapshot((game.u || game.player), async () =>
        await mklev(1, TUTORIAL, 1, { dungeonAlignOverride: A_NONE })
    );
    game.levels[1] = (game.lev || game.map);
    (game.u || game.player).dungeonLevel = 1;
    (game.u || game.player).inTutorial = true;
    (game.u || game.player).showExp = !!game.flags.showexp;
    if ((game.lev || game.map)?.flags?.lit_corridor) game.flags.lit_corridor = true;
    game.placePlayerOnLevel('teleport');
    const entryEngr = (game.lev || game.map)?.engravingAt?.((game.u || game.player).x, (game.u || game.player).y);
    if (entryEngr) entryEngr.erevealed = true;

    if (!deferRender) {
        game.fov.compute((game.lev || game.map), (game.u || game.player).x, (game.u || game.player).y);
        game.display.renderMap((game.lev || game.map), (game.u || game.player), game.fov, game.flags);
        await game.maybeShowQuestLocateHint((game.u || game.player).dungeonLevel);
    }

}

// Handle ?reset=1 — list saved data and prompt for deletion
export async function handleReset(game) {
    const items = listSavedData();
    if (items.length === 0) {
        await game.display.putstr_message('No saved data found.');
        await nhgetch_raw();
    } else {
        await game.display.putstr_message('Saved data found:');
        // Show each item on rows 2+
        for (let i = 0; i < items.length && i < 18; i++) {
            await game.display.putstr(2, 2 + i, `- ${items[i].label}`, 7);
        }
        await game.display.putstr(0, 2 + Math.min(items.length, 18),
            'Delete all saved data? [yn]', 15);
        const ch = await nhgetch_raw();
        if (String.fromCharCode(ch) === 'y') {
            clearAllData();
            await game.display.putstr_message('All saved data deleted.');
        } else {
            await game.display.putstr_message('Cancelled.');
        }
        // Clear the listing rows
        for (let i = 0; i < 20; i++) {
            game.display.clearRow(2 + i);
        }
    }
    // Remove ?reset from URL and reload clean.
    await game._runLifecycle('replaceUrlParams', { reset: null });
}

// Restore game state from a save.
// Returns true if restored, false if user declined.
export async function restoreFromSave(game, saveData, urlOpts) {
    await game.display.putstr_message('Saved game found. Restore? [yn]');
    const ans = await nhgetch_raw();
    if (String.fromCharCode(ans) !== 'y') {
        await game.display.putstr_message('Save deleted.');
        return false;
    }

    // Restore game state (player, inventory, equip, context)
    // C ref: dorecover() → restgamestate()
    const gs = saveData.gameState;

    // Replay o_init: init RNG with saved seed, run initLevelGeneration
    game.seed = gs.seed;
    initRng(gs.seed);
    setGameSeed(gs.seed);
    initLevelGeneration(gs.you?.roleIndex, gs.you?.wizard ?? true);

    // Now overwrite RNG state with the saved state
    const restoredCtx = deserializeRng(gs.rng);
    setRngState(restoredCtx);
    setRngCallCount(gs.rngCallCount);

    // Restore game state: player + inventory + equip + context
    const restored = restGameState(gs);
    game.u = restored.player;
    (game.u || game.player).wizard = game.wizard;
    game.wizard = restored.wizard;
    game.turnCount = restored.turnCount;
    game.moves = game.turnCount + 1;
    game.seerTurn = restored.seerTurn;

    // Restore current level (saved first in v2 format)
    // C ref: dorecover() → getlev() for current level
    const currentDepth = saveData.currentDepth;
    game.levels = {};
    if (saveData.currentLevel) {
        game.levels[currentDepth] = restLev(saveData.currentLevel);
    }

    // Restore other cached levels
    // C ref: dorecover() → getlev() loop for other levels
    for (const [depth, levelData] of Object.entries(saveData.otherLevels || {})) {
        game.levels[Number(depth)] = restLev(levelData);
    }

    // Set current level
    (game.u || game.player).dungeonLevel = currentDepth;
    game.lev = game.levels[currentDepth];

    // Restore messages
    if (restored.messages.length > 0) {
        game.display.messages = restored.messages;
    }

    // Delete save (single-save semantics)
    deleteSave();

    // Load flags (C ref: flags struct)
    game.flags = restored.flags || loadFlags();
    game._emitRuntimeBindings();
    (game.u || game.player).showExp = game.flags.showexp;
    (game.u || game.player).showScore = game.flags.showscore;
    (game.u || game.player).showTime = game.flags.time;

    // Render
    game.fov.compute((game.lev || game.map), (game.u || game.player).x, (game.u || game.player).y);
    game.display.renderMap((game.lev || game.map), (game.u || game.player), game.fov, game.flags);
    game.display.renderStatus((game.u || game.player));
    await game.display.putstr_message('Game restored.');

    // Notify that gameplay is starting (restored game)
    game._emitGameplayStart();
    return true;
}

// Show role menu and wait for selection
export async function showRoleMenu(game, raceIdx, gender, align, isFirstMenu) {
    const lines = [];
    lines.push(' Pick a role or profession');
    lines.push('');
    lines.push(' ' + buildHeaderLine(game, -1, raceIdx, gender, align));
    lines.push('');

    // Role items
    const roleLetters = {};
    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        // Filter by ~ filtering
        if (!okRole(game, i)) continue;
        // Filter by race constraint if race is already picked
        if (raceIdx >= 0 && !role.validRaces.includes(raceIdx)) continue;
        // Filter by alignment constraint if alignment is already picked
        if (align !== -128 && !role.validAligns.includes(align)) continue;

        const ch = role.menuChar;
        const article = role.menuArticle || 'a';
        const nameDisplay = role.namef
            ? `${role.name}/${role.namef}`
            : role.name;
        lines.push(` ${ch} - ${article} ${nameDisplay}`);
        roleLetters[ch] = i;
    }

    // Extra items
    lines.push(' * * Random');
    lines.push(' / - Pick race first');
    lines.push(' " - Pick gender first');
    lines.push(' [ - Pick alignment first');
    lines.push(` ~ - ${filterLabel(game)}`);
    lines.push(' q - Quit');
    lines.push(' (end)');

    game.display.renderChargenMenu(lines, isFirstMenu);
    const ch = await nhgetch_raw();
    const c = String.fromCharCode(ch);

    if (c === 'q') return { action: 'quit' };
    if (c === '/') return { action: 'pick-race' };
    if (c === '"') return { action: 'pick-gender' };
    if (c === '[') return { action: 'pick-align' };
    if (c === '~') return { action: 'filter' };
    if (c === '*') {
        // Random role from valid ones
        const validKeys = Object.keys(roleLetters);
        const pick = validKeys[rn2(validKeys.length)];
        return { action: 'selected', value: roleLetters[pick] };
    }
    if (roleLetters[c] !== undefined) {
        return { action: 'selected', value: roleLetters[c] };
    }
    // Invalid key: re-show menu without mutating current selection.
    return { action: 'invalid' };
}

// Show race menu and wait for selection
export async function showRaceMenu(game, roleIdx, gender, align, isFirstMenu) {
    const role = roles[roleIdx];
    const validRaces = validRacesForRole(roleIdx);

    // Check if alignment is forced across all valid races for this role
    // If so, show the forced alignment in the header
    const allAligns = new Set();
    for (const ri of validRaces) {
        for (const a of validAlignsForRoleRace(roleIdx, ri)) {
            allAligns.add(a);
        }
    }
    const alignForHeader = allAligns.size === 1 ? [...allAligns][0] : align;

    const lines = [];
    lines.push('Pick a race or species');
    lines.push('');
    lines.push(buildHeaderLine(game, roleIdx, -1, gender, alignForHeader));
    lines.push('');

    const raceLetters = {};
    for (const ri of validRaces) {
        const race = races[ri];
        // Filter by ~ filtering
        if (!okRace(game, ri)) continue;
        // Filter by alignment constraint if already set
        if (align !== -128) {
            const vAligns = validAlignsForRoleRace(roleIdx, ri);
            if (!vAligns.includes(align)) continue;
        }
        lines.push(`${race.menuChar} - ${race.name}`);
        raceLetters[race.menuChar] = ri;
    }
    lines.push('* * Random');

    // Navigation — C ref: wintty.c menu navigation items
    // Order: ?, ", constraint notes, [, ~, q, (end)
    lines.push('');
    lines.push('? - Pick another role first');

    // Only show gender nav if gender not forced
    if (gender < 0 && needsGenderMenu(roleIdx)) {
        lines.push('" - Pick gender first');
    }

    // Constraint notes
    if (role.forceGender === 'female') {
        lines.push('    role forces female');
    }
    if (allAligns.size === 1) {
        lines.push('    role forces ' + alignName([...allAligns][0]));
    }

    // Alignment navigation if not forced
    if (align === -128 && allAligns.size > 1) {
        lines.push('[ - Pick alignment first');
    }

    lines.push(`~ - ${filterLabel(game)}`);
    lines.push('q - Quit');
    lines.push('(end)');

    game.display.renderChargenMenu(lines, isFirstMenu);
    const ch = await nhgetch_raw();
    const c = String.fromCharCode(ch);

    if (c === 'q') return { action: 'quit' };
    if (c === '?') return { action: 'pick-role' };
    if (c === '/') return { action: 'pick-race' };
    if (c === '"') return { action: 'pick-gender' };
    if (c === '[') return { action: 'pick-align' };
    if (c === '~') return { action: 'filter' };
    if (c === '*') {
        const validKeys = Object.keys(raceLetters);
        const pick = validKeys[rn2(validKeys.length)];
        return { action: 'selected', value: raceLetters[pick] };
    }
    if (raceLetters[c] !== undefined) {
        return { action: 'selected', value: raceLetters[c] };
    }
    return { action: 'invalid' };
}

// Show gender menu
export async function showGenderMenu(game, roleIdx, raceIdx, align, isFirstMenu) {
    const role = roles[roleIdx];
    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx);
    const lines = [];
    lines.push('Pick a gender or sex');
    lines.push('');

    // Build header with current alignment if forced
    const alignDisplay = validAligns.length === 1 ? validAligns[0] : -128;
    lines.push(buildHeaderLine(game, roleIdx, raceIdx, -1, alignDisplay));
    lines.push('');

    const genderOptions = [];
    if (okGend(game, MALE)) { lines.push('m - male'); genderOptions.push(MALE); }
    if (okGend(game, FEMALE)) { lines.push('f - female'); genderOptions.push(FEMALE); }
    lines.push('* * Random');

    // Navigation — C ref: wintty.c menu navigation items
    // Order: ?, /, constraint notes, [, ~, q, (end)
    lines.push('');
    lines.push('? - Pick another role first');

    // Only show "/" if there are multiple valid races for this role
    const validRaces = validRacesForRole(roleIdx);
    if (validRaces.length > 1) {
        lines.push('/ - Pick another race first');
    }

    // Constraint notes (after ? and / nav items)
    if (validRaces.length === 1) {
        lines.push('    role forces ' + races[validRaces[0]].name);
    }
    if (validAligns.length === 1) {
        // C ref: "role forces" if role has only one alignment, "race forces" if race restricts it
        const forcer = role.validAligns.length === 1 ? 'role' : 'race';
        lines.push(`    ${forcer} forces ` + alignName(validAligns[0]));
    }

    // Alignment nav if multiple options
    if (align === -128 && validAligns.length > 1) {
        lines.push('[ - Pick alignment first');
    }

    lines.push(`~ - ${filterLabel(game)}`);
    lines.push('q - Quit');
    lines.push('(end)');

    game.display.renderChargenMenu(lines, isFirstMenu);
    const ch = await nhgetch_raw();
    const c = String.fromCharCode(ch);

    if (c === 'q') return { action: 'quit' };
    if (c === '?') return { action: 'pick-role' };
    if (c === '/') return { action: 'pick-race' };
    if (c === '"') return { action: 'pick-gender' };
    if (c === '[') return { action: 'pick-align' };
    if (c === '~') return { action: 'filter' };
    if (c === 'm' && okGend(game, MALE)) return { action: 'selected', value: MALE };
    if (c === 'f' && okGend(game, FEMALE)) return { action: 'selected', value: FEMALE };
    if (c === '*') {
        if (genderOptions.length > 0) return { action: 'selected', value: genderOptions[rn2(genderOptions.length)] };
        return { action: 'selected', value: rn2(2) };
    }
    return { action: 'invalid' };
}

// Show alignment menu
export async function showAlignMenu(game, roleIdx, raceIdx, gender, isFirstMenu) {
    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx);
    const lines = [];
    lines.push('Pick an alignment or creed');
    lines.push('');
    lines.push(buildHeaderLine(game, roleIdx, raceIdx, gender, -128));
    lines.push('');

    const alignLetters = {};
    const alignChars = { [A_LAWFUL]: 'l', [A_NEUTRAL]: 'n', [A_CHAOTIC]: 'c' };
    for (const a of validAligns) {
        // Filter by ~ filtering
        if (!okAlign(game, a)) continue;
        const ch = alignChars[a];
        lines.push(`${ch} - ${alignName(a)}`);
        alignLetters[ch] = a;
    }
    lines.push('* * Random');

    // Navigation — C ref: wintty.c menu navigation items
    // Order: ?, /, constraint notes, ", ~, q, (end)
    lines.push('');
    lines.push('? - Pick another role first');

    // Only show "/" if there are multiple valid races for this role
    const role = roles[roleIdx];
    const validRacesForAlign = validRacesForRole(roleIdx);
    if (validRacesForAlign.length > 1) {
        lines.push('/ - Pick another race first');
    }

    // Constraint notes (after ? and / nav items)
    if (validRacesForAlign.length === 1) {
        lines.push('    role forces ' + races[validRacesForAlign[0]].name);
    }
    if (role.forceGender === 'female') {
        lines.push('    role forces female');
    }

    // Gender nav if gender is not forced
    if (needsGenderMenu(roleIdx)) {
        lines.push('" - Pick another gender first');
    }

    lines.push(`~ - ${filterLabel(game)}`);
    lines.push('q - Quit');
    lines.push('(end)');

    game.display.renderChargenMenu(lines, isFirstMenu);
    const ch = await nhgetch_raw();
    const c = String.fromCharCode(ch);

    if (c === 'q') return { action: 'quit' };
    if (c === '?') return { action: 'pick-role' };
    if (c === '/') return { action: 'pick-race' };
    if (c === '"') return { action: 'pick-gender' };
    if (c === '~') return { action: 'filter' };
    if (c === '*') {
        const pick = validAligns[rn2(validAligns.length)];
        return { action: 'selected', value: pick };
    }
    if (alignLetters[c] !== undefined) {
        return { action: 'selected', value: alignLetters[c] };
    }
    return { action: 'invalid' };
}

// Show confirmation screen
// Returns true if confirmed, false if user wants to restart
export async function showConfirmation(game, roleIdx, raceIdx, gender, align) {
    const female = gender === FEMALE;
    const rName = roleNameForGender(roleIdx, female);
    const raceName = races[raceIdx].adj;
    const genderStr = female ? 'female' : 'male';
    const alignStr = alignName(align);
    const confirmText = `${(game.u || game.player).name} the ${alignStr} ${genderStr} ${raceName} ${rName}`;

    const lines = [];
    lines.push('Is this ok? [ynq]');
    lines.push('');
    lines.push(confirmText);
    lines.push('');
    lines.push('y * Yes; start game');
    lines.push('n - No; choose role again');
    lines.push('q - Quit');
    lines.push('(end)');

    game.display.renderChargenMenu(lines, false);
    const ch = await nhgetch_raw();
    const c = String.fromCharCode(ch);

    if (c === 'q') { await game._runLifecycle('promo'); return false; }
    // Both 'y' and '*' accept (as shown in menu: "y * Yes")
    return c === 'y' || c === '*';
}

// Show lore text and welcome message
export async function showLoreAndWelcome(game, roleIdx, raceIdx, gender, align) {
    const female = gender === FEMALE;

    // Get deity name for the alignment
    let deityName = godForRoleAlign(roleIdx, align);
    let goddess = isGoddess(roleIdx, align);

    // Priest special case: gods are null, pick from random role's pantheon
    // C ref: role.c role_init() — if Priest has no gods, pick random role's gods
    // This must consume the same RNG as C
    if (!deityName) {
        // Find a role that has gods via rn2
        let donorRole;
        do {
            donorRole = rn2(roles.length);
        } while (!roles[donorRole].gods[0]);
        // Use donor role's gods
        deityName = godForRoleAlign(donorRole, align);
        goddess = isGoddess(donorRole, align);
        // Store the donor pantheon on the role temporarily
        // so lore text references are correct
    }

    const godOrGoddess = goddess ? 'goddess' : 'god';
    const rankTitle = rankOf(1, roleIdx, female);
    const loreText = formatLoreText(deityName, godOrGoddess, rankTitle);
    const loreLines = loreText.split('\n');

    // Calculate offset for lore text display
    // C ref: The lore text is displayed with an offset that allows the map to show through
    let maxLoreWidth = 0;
    for (const line of loreLines) {
        if (line.length > maxLoreWidth) maxLoreWidth = line.length;
    }
    const loreOffx = Math.max(0, TERMINAL_COLS - maxLoreWidth - 1);

    // Add --More-- at the end
    loreLines.push('--More--');

    // Render lore text overlaid on screen
    game.display.renderLoreText(loreLines, loreOffx);

    // Wait for key to dismiss lore
    await nhgetch_raw();

    // Clear the lore text area
    for (let r = 0; r < loreLines.length && r < game.display.rows - 2; r++) {
        for (let c = loreOffx; c < game.display.cols; c++) {
            game.display.setCell(c, r, ' ', 7);
        }
    }

    // Welcome message
    // C ref: allmain.c welcome() — "<greeting> <name>, welcome to NetHack!  You are a <align> <gender?> <race> <role>."
    const greeting = greetingForRole(roleIdx);
    const rName = roleNameForGender(roleIdx, female);
    const raceAdj = races[raceIdx].adj;
    const alignStr = alignName(align);

    // C only shows gender in welcome when role has gendered variants or forced gender
    // For Priestess/Cavewoman: gender is implicit in the role name, so it's omitted
    // For Valkyrie: forceGender is set, so gender word is omitted
    // For others: include gender if the role name doesn't change and gender isn't forced
    let genderStr = '';
    if (roles[roleIdx].namef || roles[roleIdx].forceGender) {
        // Gender implicit in role name or forced — omit gender word
    } else {
        genderStr = female ? 'female ' : 'male ';
    }

    const welcomeMsg = `${greeting} ${(game.u || game.player).name}, welcome to NetHack!  You are a ${alignStr} ${genderStr}${raceAdj} ${rName}.`;
    await game.display.putstr_message(welcomeMsg);

    // Show --More-- after welcome
    // Need to determine where the message ended (may have wrapped to 2 lines)
    const moreStr = '--More--';
    let moreRow = 0;
    let moreCol;

    if (welcomeMsg.length <= game.display.cols) {
        // Message fits on one line
        if (welcomeMsg.length + 8 >= game.display.cols) {
            // --More-- won't fit on same line, wrap to next line
            moreRow = 1;
            moreCol = 0;
        } else {
            // --More-- fits on same line with space
            moreRow = 0;
            moreCol = welcomeMsg.length + 1;
        }
    } else {
        // Message wrapped to two lines
        // Find where the first line broke (last space before cols)
        let breakPoint = welcomeMsg.lastIndexOf(' ', game.display.cols);
        if (breakPoint === -1) breakPoint = game.display.cols;

        const wrapped = welcomeMsg.substring(breakPoint).trim();
        if (wrapped.length + 8 >= game.display.cols) {
            // --More-- won't fit after wrapped text, use row 2
            moreRow = 2;
            moreCol = 0;
        } else {
            // --More-- fits after wrapped text on row 1
            moreRow = 1;
            moreCol = wrapped.length + 1;
        }
    }

    await game.display.putstr(moreCol, moreRow, moreStr, 2); // CLR_GREEN
    await nhgetch_raw();
    game.display.clearRow(0);
    if (moreRow > 0) game.display.clearRow(1);
    if (moreRow > 1) game.display.clearRow(2);
}

// Show the ~ filter menu (PICK_ANY multi-select)
// C ref: role.c reset_role_filtering() — four sections with toggle selection
export async function showFilterMenu(game) {
    const lines = [];
    const prompt = hasFilters(game)
        ? 'Pick all that apply and/or unpick any that no longer apply'
        : 'Pick all that apply';
    lines.push(prompt);
    lines.push('');

    // Build item list: letter → { type, index, selected }
    const items = [];

    // Section 1: Unacceptable roles
    lines.push('Unacceptable roles');
    for (let i = 0; i < roles.length; i++) {
        const ch = roles[i].menuChar;
        const sel = game.rfilter.roles[i];
        const article = roles[i].menuArticle || 'a';
        const nameDisplay = roles[i].namef
            ? `${roles[i].name}/${roles[i].namef}`
            : roles[i].name;
        lines.push(` ${ch} ${sel ? '+' : '-'} ${article} ${nameDisplay}`);
        items.push({ ch, type: 'roles', index: i, selected: sel });
    }

    // Section 2: Unacceptable races (uppercase to avoid conflict with role letters)
    // C ref: setup_racemenu uses highc(this_ch) in filter mode
    lines.push('Unacceptable races');
    for (let i = 0; i < races.length; i++) {
        const ch = races[i].menuChar.toUpperCase();
        const sel = game.rfilter.races[i];
        lines.push(` ${ch} ${sel ? '+' : '-'} ${races[i].name}`);
        items.push({ ch, type: 'races', index: i, selected: sel });
    }

    // Section 3: Unacceptable genders (uppercase)
    // C ref: setup_gendmenu uses highc(this_ch) in filter mode
    lines.push('Unacceptable genders');
    const genderChars = ['M', 'F'];
    const genderNames = ['male', 'female'];
    for (let i = 0; i < 2; i++) {
        const ch = genderChars[i];
        const sel = game.rfilter.genders[i];
        lines.push(` ${ch} ${sel ? '+' : '-'} ${genderNames[i]}`);
        items.push({ ch, type: 'genders', index: i, selected: sel });
    }

    // Section 4: Unacceptable alignments (uppercase)
    // C ref: setup_algnmenu uses highc(this_ch) in filter mode
    lines.push('Unacceptable alignments');
    const alignChars = ['L', 'N', 'C'];
    const alignNames = ['lawful', 'neutral', 'chaotic'];
    const alignIndices = [2, 1, 0]; // A_LAWFUL=1→idx2, A_NEUTRAL=0→idx1, A_CHAOTIC=-1→idx0
    for (let i = 0; i < 3; i++) {
        const ch = alignChars[i];
        const sel = game.rfilter.aligns[alignIndices[i]];
        lines.push(` ${ch} ${sel ? '+' : '-'} ${alignNames[i]}`);
        items.push({ ch, type: 'aligns', index: alignIndices[i], selected: sel });
    }

    lines.push('(end)');

    // Build a lookup from char to item indices (some chars are reused across sections)
    // In C, each item has a unique accelerator; we use the same scheme
    const charToItems = {};
    for (let i = 0; i < items.length; i++) {
        if (!charToItems[items[i].ch]) charToItems[items[i].ch] = [];
        charToItems[items[i].ch].push(i);
    }

    // Render and handle input loop
    // PICK_ANY: user toggles items, Enter/Esc to finish
    game.display.renderChargenMenu(lines, true);

    while (true) {
        const ch = await nhgetch_raw();
        const c = String.fromCharCode(ch);

        if (c === '\r' || c === '\n' || c === ' ') {
            // Confirm: apply current selections
            for (const item of items) {
                game.rfilter[item.type][item.index] = item.selected;
            }
            return;
        }

        if (ch === 27) { // ESC
            // Cancel: no changes
            return;
        }

        // Toggle items matching this character
        if (charToItems[c]) {
            for (const idx of charToItems[c]) {
                items[idx].selected = !items[idx].selected;
            }
            // Re-render the menu with updated selections
            const updatedLines = [];
            updatedLines.push(lines[0]); // prompt
            updatedLines.push('');
            let itemIdx = 0;

            updatedLines.push('Unacceptable roles');
            for (let i = 0; i < roles.length; i++) {
                const item = items[itemIdx++];
                const article = roles[i].menuArticle || 'a';
                const nameDisplay = roles[i].namef
                    ? `${roles[i].name}/${roles[i].namef}`
                    : roles[i].name;
                updatedLines.push(` ${item.ch} ${item.selected ? '+' : '-'} ${article} ${nameDisplay}`);
            }

            updatedLines.push('Unacceptable races');
            for (let i = 0; i < races.length; i++) {
                const item = items[itemIdx++];
                updatedLines.push(` ${item.ch} ${item.selected ? '+' : '-'} ${races[i].name}`);
            }

            updatedLines.push('Unacceptable genders');
            for (let g = 0; g < 2; g++) {
                const item = items[itemIdx++];
                updatedLines.push(` ${item.ch} ${item.selected ? '+' : '-'} ${genderNames[g]}`);
            }

            updatedLines.push('Unacceptable alignments');
            for (let ai = 0; ai < 3; ai++) {
                const item = items[itemIdx++];
                updatedLines.push(` ${item.ch} ${item.selected ? '+' : '-'} ${alignNames[ai]}`);
            }

            updatedLines.push('(end)');
            game.display.renderChargenMenu(updatedLines, true);
        }
    }
}

// --- Private helper functions (not exported) ---

// Auto-pick all chargen attributes randomly
// C ref: role.c plnamesiz auto-pick path
async function autoPickAll(game, showConfirm) {
    // Pick role
    let roleIdx = rn2(roles.length);
    // Pick race
    const vr = validRacesForRole(roleIdx);
    let raceIdx = vr[rn2(vr.length)];
    // Pick gender
    let gender;
    if (roles[roleIdx].forceGender === 'female') {
        gender = FEMALE;
        rn2(1); // C consumes rn2(1) for forced gender
    } else {
        gender = rn2(2); // 0=male, 1=female
    }
    // Pick alignment
    const va = validAlignsForRoleRace(roleIdx, raceIdx);
    let align = va[rn2(va.length)];

    (game.u || game.player).roleIndex = roleIdx;
    (game.u || game.player).race = raceIdx;
    (game.u || game.player).gender = gender;
    (game.u || game.player).alignment = align;

    if (showConfirm) {
        // Show confirmation screen
        const confirmed = await showConfirmation(game, roleIdx, raceIdx, gender, align);
        if (!confirmed) {
            // 'n' → restart from manual selection
            await manualSelection(game);
            return;
        }
    }

    // Apply the selection
    (game.u || game.player).initRole(roleIdx);
    (game.u || game.player).alignment = align;

    // Show lore and welcome
    await showLoreAndWelcome(game, roleIdx, raceIdx, gender, align);
}

// Manual selection loop: role → race → gender → alignment
// C ref: role.c player_selection() manual path
async function manualSelection(game) {
    let roleIdx = -1;
    let raceIdx = -1;
    let gender = -1;
    let align = -128; // A_NONE
    let isFirstMenu = true;

    // Selection loop
    selectionLoop:
    while (true) {
        // Determine what we still need to pick
        // C order: role → race → gender → alignment
        // But navigation keys can jump to any step

        // --- ROLE ---
        if (roleIdx < 0) {
            const result = await showRoleMenu(game, raceIdx, gender, align, isFirstMenu);
            isFirstMenu = false;
            if (result.action === 'quit') { await game._runLifecycle('promo'); return; }
            if (result.action === 'pick-race') { raceIdx = -1; roleIdx = -1; continue; }
            if (result.action === 'pick-gender') { gender = -1; roleIdx = -1; continue; }
            if (result.action === 'pick-align') { align = -128; roleIdx = -1; continue; }
            if (result.action === 'filter') { await showFilterMenu(game); isFirstMenu = true; continue; }
            if (result.action === 'invalid') { continue; }
            if (result.action === 'selected') {
                roleIdx = result.value;
                // Validate role index
                if (roleIdx < 0 || roleIdx >= roles.length) {
                    roleIdx = -1;
                    continue;
                }
                // Force gender if needed
                if (roles[roleIdx].forceGender === 'female') {
                    gender = FEMALE;
                    rn2(1); // C consumes rn2(1) for forced gender
                }
            }
        }

        // --- RACE ---
        if (roleIdx >= 0 && raceIdx < 0) {
            const validRaces = validRacesForRole(roleIdx).filter(ri => okRace(game, ri));
            // Filter down to valid races given current constraints
            if (validRaces.length === 1) {
                raceIdx = validRaces[0];
                // Will show as forced in next menu
            } else {
                const result = await showRaceMenu(game, roleIdx, gender, align, isFirstMenu);
                isFirstMenu = false;
                if (result.action === 'quit') { await game._runLifecycle('promo'); return; }
                if (result.action === 'pick-role') { roleIdx = -1; raceIdx = -1; gender = -1; align = -128; continue; }
                if (result.action === 'pick-gender') { gender = -1; continue; }
                if (result.action === 'pick-align') { align = -128; continue; }
                if (result.action === 'filter') { await showFilterMenu(game); roleIdx = -1; raceIdx = -1; gender = -1; align = -128; isFirstMenu = true; continue; }
                if (result.action === 'invalid') { continue; }
                if (result.action === 'selected') {
                    raceIdx = result.value;
                    // Validate race index
                    if (raceIdx < 0 || raceIdx >= races.length) {
                        raceIdx = -1;
                        continue;
                    }
                }
            }
        }

        // --- GENDER ---
        if (roleIdx >= 0 && raceIdx >= 0 && gender < 0) {
            if (!needsGenderMenu(roleIdx)) {
                gender = roles[roleIdx].forceGender === 'female' ? FEMALE : MALE;
            } else {
                // C ref: plsel_startmenu(RS_GENDER) → rigid_role_checks() → pick_align(PICK_RIGID)
                // When alignment is forced to a single choice, rn2(n) is consumed even before the menu.
                if (align === -128) {
                    const validAligns = validAlignsForRoleRace(roleIdx, raceIdx).filter(a => okAlign(game, a));
                    if (validAligns.length === 1) {
                        rn2(1); // C ref: role.c:1222 pick_align via rigid_role_checks(PICK_RIGID)
                    }
                }
                const result = await showGenderMenu(game, roleIdx, raceIdx, align, isFirstMenu);
                isFirstMenu = false;
                if (result.action === 'quit') { await game._runLifecycle('promo'); return; }
                if (result.action === 'pick-role') { roleIdx = -1; raceIdx = -1; gender = -1; align = -128; continue; }
                if (result.action === 'pick-race') { raceIdx = -1; gender = -1; continue; }
                if (result.action === 'pick-align') { align = -128; continue; }
                if (result.action === 'filter') { await showFilterMenu(game); roleIdx = -1; raceIdx = -1; gender = -1; align = -128; isFirstMenu = true; continue; }
                if (result.action === 'invalid') { continue; }
                if (result.action === 'selected') {
                    gender = result.value;
                    // Validate gender (0=MALE, 1=FEMALE)
                    if (gender < 0 || gender > 1) {
                        gender = -1;
                        continue;
                    }
                }
            }
        }

        // --- ALIGNMENT ---
        if (roleIdx >= 0 && raceIdx >= 0 && gender >= 0 && align === -128) {
            const validAligns = validAlignsForRoleRace(roleIdx, raceIdx).filter(a => okAlign(game, a));
            if (validAligns.length === 1) {
                align = validAligns[0];
            } else {
                const result = await showAlignMenu(game, roleIdx, raceIdx, gender, isFirstMenu);
                isFirstMenu = false;
                if (result.action === 'quit') { await game._runLifecycle('promo'); return; }
                if (result.action === 'pick-role') { roleIdx = -1; raceIdx = -1; gender = -1; align = -128; continue; }
                if (result.action === 'pick-race') { raceIdx = -1; align = -128; continue; }
                if (result.action === 'pick-gender') { gender = -1; align = -128; continue; }
                if (result.action === 'filter') { await showFilterMenu(game); roleIdx = -1; raceIdx = -1; gender = -1; align = -128; isFirstMenu = true; continue; }
                if (result.action === 'invalid') { continue; }
                if (result.action === 'selected') {
                    align = result.value;
                    // Validate alignment (A_CHAOTIC=-1, A_NEUTRAL=0, A_LAWFUL=1)
                    if (align < -1 || align > 1) {
                        align = -128;
                        continue;
                    }
                }
            }
        }

        // --- CONFIRMATION ---
        if (roleIdx >= 0 && raceIdx >= 0 && gender >= 0 && align !== -128) {
            const confirmed = await showConfirmation(game, roleIdx, raceIdx, gender, align);
            if (confirmed) {
                // Apply selection
                (game.u || game.player).roleIndex = roleIdx;
                (game.u || game.player).race = raceIdx;
                (game.u || game.player).gender = gender;
                (game.u || game.player).alignment = align;
                (game.u || game.player).initRole(roleIdx);
                (game.u || game.player).alignment = align;
                // Show lore and welcome
                await showLoreAndWelcome(game, roleIdx, raceIdx, gender, align);
                return;
            } else {
                // Start over
                roleIdx = -1;
                raceIdx = -1;
                gender = -1;
                align = -128;
                isFirstMenu = true;
                continue;
            }
        }
    }
}

// Build the header line showing current selections
// C ref: role.c plnamesiz — "<role> <race> <gender> <alignment>"
function buildHeaderLine(game, roleIdx, raceIdx, gender, align) {
    const parts = [];
    // Role
    if (roleIdx >= 0) {
        const female = gender === FEMALE;
        parts.push(roleNameForGender(roleIdx, female));
    } else {
        parts.push('<role>');
    }
    // Race
    if (raceIdx >= 0) {
        parts.push(races[raceIdx].name);
    } else {
        parts.push('<race>');
    }
    // Gender
    if (gender === FEMALE) {
        parts.push('female');
    } else if (gender === MALE) {
        parts.push('male');
    } else {
        parts.push('<gender>');
    }
    // Alignment
    if (align !== -128) {
        parts.push(alignName(align));
    } else {
        parts.push('<alignment>');
    }
    return parts.join(' ');
}

// C ref: role.c ok_role/ok_race/ok_gend/ok_align — filter checks
function okRole(game, i) { return !game.rfilter.roles[i]; }
function okRace(game, i) { return !game.rfilter.races[i]; }
function okGend(game, g) { return !game.rfilter.genders[g]; }
function okAlign(game, a) { return !game.rfilter.aligns[a + 1]; } // a: -1,0,1 → index 0,1,2
function hasFilters(game) {
    return game.rfilter.roles.some(Boolean) || game.rfilter.races.some(Boolean) ||
           game.rfilter.genders.some(Boolean) || game.rfilter.aligns.some(Boolean);
}
function filterLabel(game) {
    return hasFilters(game) ? 'Reset role/race/&c filtering' : 'Set role/race/&c filtering';
}

// Word-wrap a death description to fit within maxWidth chars per line.
// Returns array of up to 4 lines.
function wrapDeathText(text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        if (current.length === 0) {
            current = word;
        } else if (current.length + 1 + word.length <= maxWidth) {
            current += ' ' + word;
        } else {
            lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    // Limit to 4 lines
    return lines.slice(0, 4);
}

export { NetHackGame } from './allmain.js';
