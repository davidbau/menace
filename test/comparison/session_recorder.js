// test/comparison/session_recorder.js
// Pure recording helpers: execute JS using C-captured inputs and return raw trace.

import { replaySession } from '../../js/replay_core.js';
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
        : (session?.meta?.regen?.tutorial === true);
    return replaySession(session.meta.seed, session.raw, {
        captureScreens: true,
        startupBurstInFirstStep: false,
        flags,
        tutorial,
    });
}
