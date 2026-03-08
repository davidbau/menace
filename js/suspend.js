// suspend.js -- typed suspension wrappers for SYNCLOCK phase S0.

import { beforeTypedSuspend, afterTypedSuspend } from './exec_guard.js';

async function awaitTyped(game, type, awaited, details = {}) {
    const snap = beforeTypedSuspend(game, type, details);
    try {
        return await awaited;
    } finally {
        afterTypedSuspend(game, snap, details);
    }
}

export async function awaitInput(game, awaited, details = {}) {
    return awaitTyped(game, 'input', awaited, details);
}

export async function awaitMore(game, awaited, details = {}) {
    return awaitTyped(game, 'more', awaited, details);
}

export async function awaitAnim(game, awaited, details = {}) {
    return awaitTyped(game, 'anim', awaited, details);
}

export async function awaitDisplayMorePrompt(game, display, keyReader, details = {}) {
    if (!display || typeof display.morePrompt !== 'function' || typeof keyReader !== 'function') {
        return;
    }
    const site = details?.site || 'morePrompt';
    const readMoreKey = () => awaitInput(game, Promise.resolve(keyReader()), { site: `${site}.key` });
    return awaitMore(game, display.morePrompt(readMoreKey), { ...details, site });
}
