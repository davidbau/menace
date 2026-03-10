// js/replay_core.js -- Session replay engine
//
// Game-agnostic: feeds a string of single-byte keystrokes to the game,
// records RNG traces and display state after each keystroke.
// Returns a V3-format session object (source: 'js').

import { enableRngLog, getRngLog, disableRngLog, pushRngLogEntry } from './rng.js';
import { pushInput } from './input.js';
import { NetHackGame, inputSnap } from './allmain.js';
import { HeadlessDisplay, createHeadlessInput } from './headless.js';
import { consumeHarnessMapdumpPayloads } from './dungeon.js';
import { envFlag, getEnv } from './runtime_env.js';

export { HeadlessDisplay };

// Strip leading RNG count prefix: "1 rn2(12)=2" → "rn2(12)=2"
function toCompactRng(entry) {
    if (entry.length > 0 && (entry[0] === '>' || entry[0] === '<' || entry[0] === '~' || entry[0] === '^')) return entry;
    return entry.replace(/^\d+\s+/, '');
}

// Drain the microtask queue until the command either completes or blocks
// waiting for input (e.g., direction prompt, --More--, inventory selection).
async function drainUntilInput(commandPromise, inputRuntime) {
    const completion = commandPromise.then(
        (value) => ({ type: 'done', value }),
        (error) => ({ type: 'error', error })
    );
    const hasBoundaryWaitApi = typeof inputRuntime?.waitForInputWait === 'function'
        && typeof inputRuntime?.getInputState === 'function';
    let waitEpoch = hasBoundaryWaitApi
        ? Number(inputRuntime.getInputState()?.waitEpoch || 0)
        : 0;

    while (true) {
        if (typeof inputRuntime?.isWaitingInput === 'function' && inputRuntime.isWaitingInput()) {
            return { done: false };
        }

        if (!hasBoundaryWaitApi) {
            const next = await Promise.race([
                completion,
                new Promise((resolve) => setTimeout(() => resolve({ type: 'tick' }), 0)),
            ]);
            if (next.type === 'done') return { done: true, value: next.value };
            if (next.type === 'error') throw next.error;
            continue;
        }

        const waitAbort = new AbortController();
        const waitPromise = inputRuntime
            .waitForInputWait({ afterEpoch: waitEpoch, signal: waitAbort.signal })
            .then((epoch) => ({ type: 'wait', epoch }))
            .catch((err) => {
                if (err?.name === 'AbortError') return { type: 'aborted' };
                throw err;
            });

        const next = await Promise.race([completion, waitPromise]);
        if (next.type === 'done') {
            waitAbort.abort();
            return { done: true, value: next.value };
        }
        if (next.type === 'error') {
            waitAbort.abort();
            throw next.error;
        }
        if (next.type === 'wait') {
            waitEpoch = next.epoch;
            if (typeof inputRuntime?.isWaitingInput === 'function' && inputRuntime.isWaitingInput()) {
                return { done: false };
            }
        }
    }
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

function replayPendingTraceEnabled() {
    return envFlag('WEBHACK_REPLAY_PENDING_TRACE');
}

function traceStepWindow() {
    const fromRaw = getEnv('WEBHACK_TRACE_STEP_FROM', '');
    const toRaw = getEnv('WEBHACK_TRACE_STEP_TO', '');
    const from = Number.parseInt(String(fromRaw || '').trim(), 10);
    const to = Number.parseInt(String(toRaw || '').trim(), 10);
    return {
        from: Number.isInteger(from) ? from : null,
        to: Number.isInteger(to) ? to : null,
    };
}

function parseTraceStep(args) {
    for (const a of args) {
        const m = /(?:^|\s)step=(\d+)(?:\s|$)/.exec(String(a || ''));
        if (m) return Number.parseInt(m[1], 10);
    }
    return null;
}

function stepInTraceWindow(step) {
    if (!Number.isInteger(step)) return true;
    const { from, to } = traceStepWindow();
    if (Number.isInteger(from) && step < from) return false;
    if (Number.isInteger(to) && step > to) return false;
    return true;
}

function replayPendingTrace(...args) {
    if (!replayPendingTraceEnabled()) return;
    const step = parseTraceStep(args);
    if (!stepInTraceWindow(step)) return;
    // eslint-disable-next-line no-console
    console.log('[REPLAY_PENDING_TRACE]', ...args);
}

function replayBoundaryState(game, inputRuntime) {
    const boundary = game ? inputSnap(game) : null;
    if (boundary) {
        return [
            `owner=${String(boundary.owner || 'none')}`,
            `waiting=${boundary.waitingForInput ? 1 : 0}`,
            `ack=${boundary.ackRequired ? 1 : 0}`,
            `pending=${Number(boundary.pendingCount || 0)}`,
        ].join(' ');
    }
    const waiting = !!(typeof inputRuntime?.isWaitingInput === 'function' && inputRuntime.isWaitingInput());
    return `boundary=unknown waiting=${waiting ? 1 : 0}`;
}

function pendingWaitSite(inputRuntime) {
    const st = inputRuntime?.getInputState?.();
    const raw = String(st?.waitContext || st?.waitStack || '');
    if (!raw) return '';
    const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    const frames = lines.slice(1);
    const jsFrame = frames.find((line) => (
        line.includes('/js/')
        && !line.includes('/js/headless.js')
        && !line.includes('/js/input.js')
        && !line.includes('/js/replay_core.js')
        && !line.includes('node:internal')
    ));
    if (jsFrame) return jsFrame;
    const nonInternal = frames.find((line) => (
        !line.includes('/js/headless.js')
        && !line.includes('/js/input.js')
        && !line.includes('/js/replay_core.js')
        && !line.includes('node:internal')
    ));
    return nonInternal || frames[1] || frames[0] || '';
}

function emitStartupRunstepIfEnabled(game) {
    if (!envFlag('WEBHACK_EVENT_RUNSTEP')) return;
    const ctx = game?.context || {};
    const p = game?.u || game?.player || {};
    const ux = Number.isFinite(Number(p?.x)) ? Number(p.x) : Number(p?.ux || 0);
    const uy = Number.isFinite(Number(p?.y)) ? Number(p.y) : Number(p?.uy || 0);
    pushRngLogEntry(
        `^runstep[path=fresh_cmd keyarg=0 cmd=0 cc=0 moves=${(game?.moves | 0)} multi=${(game?.multi | 0)} run=${(ctx?.run | 0)} mv=${ctx?.mv ? 1 : 0} move=1 occ=${game?.occupation ? 1 : 0} umoved=${p?.umoved ? 1 : 0} ux=${ux | 0} uy=${uy | 0}]`
    );
}

async function settleStartupInputBoundaries(game) {
    const maxIterations = 32;
    for (let i = 0; i < maxIterations; i++) {
        // Handle replay-startup tutorial prompt leftovers so the first replay
        // key reaches gameplay. Do not auto-answer arbitrary prompt boundaries.
        const replayStartupPrompt = !!(game?.pendingPrompt?.isReplayStartupPrompt);
        if (replayStartupPrompt && game?.pendingPrompt && typeof game.pendingPrompt.onKey === 'function') {
            await Promise.resolve(game.pendingPrompt.onKey('n'.charCodeAt(0), game));
            continue;
        }

        break;
    }
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
    enableRngLog();

    const display = new HeadlessDisplay();
    const input = createHeadlessInput();
    const game = new NetHackGame({ display, input });
    const synclockDiagTypes = [
        'boundary.more.owner-missing',
        'boundary.more.fallback-no-owner',
        'boundary.more.fallback-synced',
        'boundary.more.clear-missing',
    ];
    const synclockDiagCounts = Object.fromEntries(synclockDiagTypes.map((type) => [type, 0]));
    let synclockDiagTotal = 0;
    const unsubscribeDiagnostics = (typeof game.subscribeDiagnostics === 'function')
        ? game.subscribeDiagnostics((ev) => {
            const type = String(ev?.type || '');
            if (!Object.hasOwn(synclockDiagCounts, type)) return;
            synclockDiagCounts[type] += 1;
            synclockDiagTotal += 1;
        })
        : null;

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
    await settleStartupInputBoundaries(game);
    emitStartupRunstepIfEnabled(game);

    // The welcome/lore message from init may still be visible on the topline.
    // Leave it in place so step 0 shows the natural post-init screen state.
    // The first keystroke (typically space) will dismiss it via --More--.

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
        const preMap = game.lev || game.map || null;
        if (preMap) preMap._replayStepIndex = i;
        const prevCount = getRngLog().length;
        const ch = keys.charCodeAt(i);
        // Expose current replay step to runtime diagnostics (run/monmove traces).
        // This is debug-only metadata and does not affect game logic.
        if (game?.map) game.map._replayStepIndex = i;
        if (game?.lev) game.lev._replayStepIndex = i;

        if (pendingCommand) {
            replayPendingTrace(
                `step=${i + 1}`,
                `key=${JSON.stringify(String.fromCharCode(ch))}`,
                'mode=resume',
                replayBoundaryState(game, game.input)
            );
            pushInput(ch);
            const settled = await drainUntilInput(pendingCommand, game.input);
            if (settled.done) {
                pendingCommand = null;
                replayPendingTrace(
                    `step=${i + 1}`,
                    'resume=done',
                    pendingWaitSite(game.input),
                    replayBoundaryState(game, game.input)
                );
            } else {
                replayPendingTrace(
                    `step=${i + 1}`,
                    'resume=waiting',
                    pendingWaitSite(game.input),
                    replayBoundaryState(game, game.input)
                );
            }
        } else {
            pushInput(ch);
            const commandPromise = game._gameLoopStep();
            const settled = await drainUntilInput(commandPromise, game.input);
            if (!settled.done) {
                pendingCommand = commandPromise;
                replayPendingTrace(
                    `step=${i + 1}`,
                    `key=${JSON.stringify(String.fromCharCode(ch))}`,
                    'mode=start-gameloop',
                    'start=waiting',
                    pendingWaitSite(game.input),
                    replayBoundaryState(game, game.input)
                );
            } else {
                replayPendingTrace(
                    `step=${i + 1}`,
                    `key=${JSON.stringify(String.fromCharCode(ch))}`,
                    'mode=start-gameloop',
                    'start=done',
                    replayBoundaryState(game, game.input)
                );
            }
        }

        // Rendering ownership lives in run_command/game runtime paths.
        // Replay captures the already-rendered screen after each consumed key.
        const postMap = game.lev || game.map || null;
        if (postMap) postMap._replayStepIndex = i;

        // C ref: the C harness captures the tmux screen AFTER the key is
        // fully processed (including deferred_goto which runs inside
        // run_command). Screen capture here reflects the post-command state.
        await Promise.resolve();
        const screenCapture = opts.captureScreens ? captureScreen(display) : '';
        const cursorCapture = captureCursor(display);

        const raw = getRngLog().slice(prevCount);
        const step = {
            key: keys[i],
            rng: raw.map(toCompactRng),
            screen: screenCapture,
            cursor: cursorCapture,
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
    if (typeof unsubscribeDiagnostics === 'function') unsubscribeDiagnostics();

    return {
        version: 3,
        seed,
        source: 'js',
        steps,
        checkpoints,
        synclockDiagnostics: {
            total: synclockDiagTotal,
            counts: synclockDiagCounts,
        },
    };
}
