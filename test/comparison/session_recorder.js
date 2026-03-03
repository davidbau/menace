// test/comparison/session_recorder.js
// Pure recording helpers: execute JS using C-captured inputs and return raw trace.

import { replaySession } from '../../js/replay_core.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';

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
    // C harness gameplay captures default to concise messaging unless explicit.
    flags.verbose = (session?.meta?.options?.verbose === true);
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

export async function recordGameplaySessionFromInputs(session, opts = {}) {
    ensureSessionGlobals();
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
    const { seed: replaySeed, opts: replayOpts, keys, stepBoundaries } = prepareReplayArgs(
        session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
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
    const raw = await replaySession(replaySeed, replayOpts, keys);

    // Group flat per-key results into per-step results for the comparator.
    const steps = [];
    let keyIdx = 0;
    for (const len of stepBoundaries) {
        const stepKeys = raw.keys.slice(keyIdx, keyIdx + len);
        steps.push({
            rng: stepKeys.flatMap(k => k.rng),
            rngCalls: stepKeys.reduce((n, k) => n + k.rng.length, 0),
            screen: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].screen : [],
            screenAnsi: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].screenAnsi : undefined,
            cursor: stepKeys.length > 0 ? stepKeys[stepKeys.length - 1].cursor : undefined,
        });
        keyIdx += len;
    }

    return { startup: raw.startup, steps };
}
