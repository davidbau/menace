// test/comparison/session_recorder.js
// Pure recording helpers: execute JS using C-captured inputs and return raw trace.

import { replaySession } from '../../js/replay_core.js';
import { prepareReplayArgs, stripAnsiSequences } from '../../js/replay_compare.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { resolveSessionFixedDatetime } from './session_datetime.js';

const DEFAULT_FIXED_DATETIME = '20000110090000';

function ensureSessionGlobals() {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = { location: { search: '' } };
    } else if (!globalThis.window.location) {
        globalThis.window.location = { search: '' };
    } else if (typeof globalThis.window.location.search !== 'string') {
        globalThis.window.location.search = '';
    }

    const backing = new Map();
    const storage = {
        getItem(key) { return backing.has(key) ? backing.get(key) : null; },
        setItem(key, value) { backing.set(key, String(value)); },
        removeItem(key) { backing.delete(key); },
        clear() { backing.clear(); },
    };
    Object.defineProperty(globalThis, 'localStorage', {
        value: storage,
        configurable: true,
        enumerable: true,
        writable: true,
    });
}

export function buildGameplayReplayFlags(session) {
    const flags = { ...DEFAULT_FLAGS };
    flags.color = session?.meta?.options?.color !== false;
    // NetHack defaults verbose=true; preserve that unless a session explicitly disables it.
    flags.verbose = session?.meta?.options?.verbose !== false;
    if (session?.meta?.options?.autopickup === false) flags.pickup = false;
    if (session?.meta?.options?.rest_on_space) flags.rest_on_space = true;
    flags.DECgraphics = session?.meta?.options?.symset === 'DECgraphics';
    flags.bgcolors = true;
    flags.customcolors = true;
    flags.customsymbols = true;
    if (flags.DECgraphics) {
        flags.symset = 'DECgraphics, active, handler=DEC';
    }
    return flags;
}

// Split a V3 screen string into ANSI and plain-text line arrays.
function splitScreen(screenStr) {
    const ansi = (screenStr || '').split('\n');
    const plain = ansi.map(line => stripAnsiSequences(line));
    return { ansi, plain };
}

export function resolveRecorderFixedDatetime(session, {
    prevDatetime = process.env.NETHACK_FIXED_DATETIME,
    sourcePref = process.env.NETHACK_SESSION_DATETIME_SOURCE || 'session',
} = {}) {
    const sessionDatetime = resolveSessionFixedDatetime(session, sourcePref);
    return sessionDatetime || prevDatetime || DEFAULT_FIXED_DATETIME;
}

export async function withRecorderFixedDatetime(session, fn, {
    sourcePref = process.env.NETHACK_SESSION_DATETIME_SOURCE || 'session',
} = {}) {
    const prevDatetime = process.env.NETHACK_FIXED_DATETIME;
    const chosenDatetime = resolveRecorderFixedDatetime(session, { prevDatetime, sourcePref });
    if (chosenDatetime) process.env.NETHACK_FIXED_DATETIME = chosenDatetime;
    else delete process.env.NETHACK_FIXED_DATETIME;
    try {
        return await fn();
    } finally {
        if (prevDatetime == null) delete process.env.NETHACK_FIXED_DATETIME;
        else process.env.NETHACK_FIXED_DATETIME = prevDatetime;
    }
}

export async function recordGameplaySessionFromInputs(session, opts = {}) {
    ensureSessionGlobals();

    let jsSession;
    let stepBoundaries;
    await withRecorderFixedDatetime(session, async () => {
        const flags = opts.flags || buildGameplayReplayFlags(session);
        const tutorial = typeof opts.tutorial === 'boolean'
            ? opts.tutorial
            : (
                session?.meta?.regen?.tutorial === true
                || session?.meta?.options?.tutorial === true
                || session?.raw?.options?.tutorial === true
            );
        const replayTutorialStartupPrompts = Array.isArray(session?.raw?.replayTutorialStartupPrompts)
            ? session.raw.replayTutorialStartupPrompts
            : [];
        const tutorialStartupEnterAfterPromptCount = Number.isInteger(session?.raw?.tutorialStartupEnterAfterPromptCount)
            ? session.raw.tutorialStartupEnterAfterPromptCount
            : undefined;
        const emitProgress = (typeof globalThis.__SESSION_PROGRESS_EMIT === 'function')
            ? globalThis.__SESSION_PROGRESS_EMIT
            : null;
        const args = prepareReplayArgs(
            session.meta.seed, session.raw, {
                captureScreens: true,
                flags,
                tutorial,
                replayTutorialStartupPrompts,
                tutorialStartupEnterAfterPromptCount,
                onKey: emitProgress ? ({ index, ch, game }) => {
                    let topline = '';
                    if (typeof game?.display?.getScreenLines === 'function') {
                        const lines = game.display.getScreenLines() || [];
                        topline = String(lines[0] || '');
                    }
                    emitProgress({
                        step: index + 1,
                        key: ch,
                        topline: topline.slice(0, 160),
                        pendingPrompt: !!game?.pendingPrompt,
                        multi: Number.isInteger(game?.multi) ? game.multi : 0,
                    });
                } : undefined,
            }
        );
        stepBoundaries = args.stepBoundaries;
        jsSession = await replaySession(args.seed, args.opts, args.keys);
    });

    // Adapt V3 session for the comparator.
    // jsSession.steps[0] is startup, jsSession.steps[1..] are per-keystroke.
    // Group per-keystroke steps using stepBoundaries to align with C session steps.
    const startupScreen = splitScreen(jsSession.steps[0].screen);
    const startup = {
        rng: jsSession.steps[0].rng,
        screen: startupScreen.plain,
        screenAnsi: startupScreen.ansi,
        cursor: jsSession.steps[0].cursor,
    };

    const gameplaySteps = jsSession.steps.slice(1);
    const steps = [];
    let keyIdx = 0;
    for (const len of (stepBoundaries || [])) {
        const stepSlice = gameplaySteps.slice(keyIdx, keyIdx + len);
        const lastStep = stepSlice.length > 0 ? stepSlice[stepSlice.length - 1] : null;
        const scr = splitScreen(lastStep?.screen);
        steps.push({
            rng: stepSlice.flatMap(k => k.rng),
            rngCalls: stepSlice.reduce((n, k) => n + k.rng.length, 0),
            screen: scr.plain,
            screenAnsi: scr.ansi,
            cursor: lastStep?.cursor,
        });
        keyIdx += len;
    }

    return {
        startup,
        steps,
        checkpoints: (jsSession?.checkpoints && typeof jsSession.checkpoints === 'object')
            ? jsSession.checkpoints
            : null,
        synclockDiagnostics: (jsSession?.synclockDiagnostics && typeof jsSession.synclockDiagnostics === 'object')
            ? jsSession.synclockDiagnostics
            : null,
    };
}
