// js/replay_core.js -- Session replay engine
//
// Game-agnostic: feeds a string of single-byte keystrokes to the game,
// records RNG traces and display state after each keystroke.
// Returns a V3-format session object (source: 'js').

import { enableRngLog, getRngLog, disableRngLog } from './rng.js';
import { pushInput } from './input.js';
import { initrack } from './monmove.js';
import { NetHackGame, maybe_deferred_goto_after_rhack, run_command, execute_repeat_command } from './allmain.js';
import { HeadlessDisplay, createHeadlessInput } from './headless.js';
import { consumeHarnessMapdumpPayloads } from './dungeon.js';

export { HeadlessDisplay };

// Strip leading RNG count prefix: "1 rn2(12)=2" → "rn2(12)=2"
function toCompactRng(entry) {
    if (entry.length > 0 && (entry[0] === '>' || entry[0] === '<' || entry[0] === '~' || entry[0] === '^')) return entry;
    return entry.replace(/^\d+\s+/, '');
}

// Run a command promise until it either resolves or blocks waiting for input.
async function tryResolve(commandPromise, inputRuntime) {
    let done = false;
    let value;
    let error;
    commandPromise.then(
        (v) => { done = true; value = v; },
        (e) => { done = true; error = e; }
    );
    while (!done) {
        if (typeof inputRuntime?.isWaitingInput === 'function' && inputRuntime.isWaitingInput()) {
            return { done: false };
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (error) throw error;
    return { done: true, value };
}

function captureScreen(display) {
    const lines = (typeof display.getScreenAnsiLines === 'function')
        ? display.getScreenAnsiLines()
        : display.getScreenLines() || [];
    return lines.join('\n');
}

function captureCursor(display) {
    return (typeof display.getCursor === 'function') ? display.getCursor() : null;
}

function rerenderLikeMainLoop(game) {
    if (typeof game?.docrt === 'function') {
        game.docrt();
        return;
    }
    if (!game?.fov || !game?.map || !game?.player || !game?.display) return;
    game.fov.compute(game.map, game.player.x, game.player.y);
    game.display.renderMap(game.map, game.player, game.fov, game.flags);
    game.display.renderStatus(game.player);
    game.display.cursorOnPlayer(game.player);
}

// ---------------------------------------------------------------------------
// replaySession(seed, opts, keys)
//
//   seed  — RNG seed (number)
//   opts  — { initOpts, displayFlags, chargenKeys, captureScreens, onKey }
//   keys  — string of single-byte keystrokes to feed to the game
//
// Returns a V3-format session: { version, seed, source, steps }
//   steps[0] = startup (key: null, rng, screen, cursor)
//   steps[1..N] = one per keystroke (key, rng, screen, cursor)
// ---------------------------------------------------------------------------

export async function replaySession(seed, opts, keys) {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = {};
    }
    initrack();
    enableRngLog();

    const display = new HeadlessDisplay();
    const input = createHeadlessInput();
    const game = new NetHackGame({ display, input });

    // Pre-push chargen keys if provided.
    if (Array.isArray(opts.chargenKeys)) {
        for (const key of opts.chargenKeys) {
            for (let i = 0; i < key.length; i++) {
                input.pushKey(key.charCodeAt(i));
            }
        }
    }

    const initOpts = { seed, ...(opts.initOpts || {}) };
    await game.init(initOpts);

    // Enable --More-- blocking now that chargen is complete.
    if (game.display && typeof game.display._moreBlockingEnabled !== 'undefined') {
        game.display._moreBlockingEnabled = true;
    }

    // C ref: c-harness keylog_to_session calls clear_more_prompts() before
    // capturing the startup screen. In C, the welcome message triggers a
    // --More-- that is dismissed (and the topline cleared) before step 0.
    // Simulate that here so the startup topline is blank, matching session.
    if (game.display && game.display.topMessage) {
        game.display.clearRow(0);
        game.display.topMessage = null;
        game.display.messageNeedsMore = false;
    }

    // Apply display flags.
    if (opts.displayFlags && typeof opts.displayFlags === 'object') {
        Object.assign(game.display.flags, opts.displayFlags);
        Object.assign(game.flags, opts.displayFlags);
        const player = game.u || game.player;
        if (player) {
            player.showExp = !!opts.displayFlags.showexp;
            player.showTime = !!opts.displayFlags.time;
            player.showScore = !!opts.displayFlags.showscore;
        }
    }

    // steps[0]: startup frame
    const startupRng = getRngLog().map(toCompactRng);
    const steps = [{
        key: null,
        rng: startupRng,
        screen: opts.captureScreens ? captureScreen(display) : '',
        cursor: captureCursor(display),
    }];

    // Feed each keystroke to the game, record results.
    let pendingCommand = null;

    for (let i = 0; i < keys.length; i++) {
        const prevCount = getRngLog().length;
        const ch = keys.charCodeAt(i);
        let commandSettled = false;

        if (pendingCommand) {
            pushInput(ch);
            const settled = await tryResolve(pendingCommand, game.input);
            if (settled.done) {
                await maybe_deferred_goto_after_rhack(game, settled.value);
                pendingCommand = null;
                commandSettled = true;
            }
        } else {
            const commandPromise = (ch === 1)
                ? execute_repeat_command(game)
                : run_command(game, ch);
            const settled = await tryResolve(commandPromise, game.input);
            if (!settled.done) {
                pendingCommand = commandPromise;
            } else {
                await maybe_deferred_goto_after_rhack(game, settled.value);
                commandSettled = true;
            }
        }

        // C ref: allmain.c handleInput loop re-renders after each consumed key.
        // Replay must do the same so cursor/topline/map state matches captured C steps.
        if (commandSettled) {
            rerenderLikeMainLoop(game);
        }

        const raw = getRngLog().slice(prevCount);
        const step = {
            key: keys[i],
            rng: raw.map(toCompactRng),
            screen: opts.captureScreens ? captureScreen(display) : '',
            cursor: captureCursor(display),
        };
        steps.push(step);

        if (typeof opts.onKey === 'function') {
            opts.onKey({ index: i, ch: keys[i], game, step });
        }
    }

    // If session ends while a command is waiting for input, cancel with ESC.
    if (pendingCommand) {
        pushInput(27);
        const settled = await Promise.race([
            pendingCommand.then(() => true, () => true),
            new Promise((resolve) => setTimeout(() => resolve(false), 20)),
        ]);
        if (!settled) {
            pushInput(13);
            await Promise.race([
                pendingCommand.then(() => true, () => true),
                new Promise((resolve) => setTimeout(() => resolve(false), 20)),
            ]);
        }
    }

    disableRngLog();

    const checkpoints = consumeHarnessMapdumpPayloads();

    return {
        version: 3,
        seed,
        source: 'js',
        steps,
        checkpoints,
    };
}
