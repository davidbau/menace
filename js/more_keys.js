// more_keys.js -- shared --More-- dismissal primitives.

import { awaitMore } from './suspend.js';

export function isMoreDismissKey(ch) {
    const code = typeof ch === 'number'
        ? ch
        : (typeof ch === 'string' && ch.length > 0 ? ch.charCodeAt(0) : 0);
    // C ref: tty xwaitforspace("\033 ") plus dismiss_more (^P).
    return code === 32 || code === 27 || code === 10 || code === 13 || code === 16;
}

export async function waitForMoreDismissKey(readKey, { game = null, site = 'more.dismiss' } = {}) {
    if (typeof readKey !== 'function') return;
    for (;;) {
        const ch = await awaitMore(game, Promise.resolve(readKey()), { site });
        if (isMoreDismissKey(ch)) return ch;
    }
}

