// more_keys.js -- shared --More-- dismissal primitives.

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
        const ch = await Promise.resolve(readKey());
        if (isMoreDismissKey(ch)) return ch;
    }
}

export async function consumePendingMore(display, readKey, clearMore, {
    game = null,
    site = 'more.consume',
    onNonDismiss = null,
} = {}) {
    if (!display || typeof readKey !== 'function' || typeof clearMore !== 'function') return;
    while (display && display._pendingMore) {
        const ch = await Promise.resolve(readKey());
        if (isMoreDismissKey(ch)) {
            await Promise.resolve(clearMore());
            continue;
        }
        if (typeof onNonDismiss === 'function') onNonDismiss(ch);
    }
}
