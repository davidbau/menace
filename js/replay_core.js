// js/replay_core.js -- Session replay engine
//
// Game-agnostic: feeds a string of single-byte keystrokes to the game,
// records RNG traces and display state after each keystroke.

import { enableRngLog, getRngLog, disableRngLog } from './rng.js';
import { pushInput } from './input.js';
import { initrack } from './monmove.js';
import { NetHackGame, maybe_deferred_goto_after_rhack, run_command, execute_repeat_command } from './allmain.js';
import { HeadlessDisplay, createHeadlessInput } from './headless.js';

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

// ---------------------------------------------------------------------------
// replaySession(seed, opts, keys)
//
//   seed  — RNG seed (number)
//   opts  — { initOpts, displayFlags, chargenKeys, captureScreens, onKey }
//   keys  — string of single-byte keystrokes to feed to the game
//
// Returns { startup, keys: [...] } where each key entry has
//   { ch, rng, screen, screenAnsi, cursor }
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

    const startupLog = getRngLog();
    const startupRng = startupLog.map(toCompactRng);

    // Feed each keystroke to the game, record results.
    const keyResults = [];
    let pendingCommand = null;

    for (let i = 0; i < keys.length; i++) {
        const prevCount = getRngLog().length;
        const ch = keys.charCodeAt(i);

        if (pendingCommand) {
            pushInput(ch);
            const settled = await tryResolve(pendingCommand, game.input);
            if (settled.done) {
                await maybe_deferred_goto_after_rhack(game, settled.value);
                pendingCommand = null;
            }
        } else {
            const commandPromise = (ch === 1)
                ? execute_repeat_command(game, { computeFov: true })
                : run_command(game, ch, { computeFov: true });
            const settled = await tryResolve(commandPromise, game.input);
            if (!settled.done) {
                pendingCommand = commandPromise;
            } else {
                await maybe_deferred_goto_after_rhack(game, settled.value);
            }
        }

        const raw = getRngLog().slice(prevCount);
        const result = {
            ch: keys[i],
            rng: raw.map(toCompactRng),
        };
        if (opts.captureScreens) {
            result.screen = display.getScreenLines() || [];
            if (typeof display.getScreenAnsiLines === 'function') {
                result.screenAnsi = display.getScreenAnsiLines();
            }
        }
        if (typeof display.getCursor === 'function') {
            result.cursor = display.getCursor();
        }
        keyResults.push(result);

        if (typeof opts.onKey === 'function') {
            opts.onKey({ index: i, ch: keys[i], game, result });
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

    return {
        startup: { rng: startupRng },
        keys: keyResults,
    };
}
