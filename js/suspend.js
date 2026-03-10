// suspend.js -- typed suspension wrappers for SYNCLOCK phase S0.

import { beforeTypedSuspend, afterTypedSuspend } from './gstate.js';

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
