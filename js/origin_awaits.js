// origin_awaits.js -- canonical async origin wrappers.

import { game as activeGame, beginOriginAwait, endOriginAwait } from './gstate.js';

export async function nhimport(specifier) {
    const snap = beginOriginAwait(activeGame, 'import');
    try {
        return await import(specifier);
    } finally {
        endOriginAwait(activeGame, snap);
    }
}

export async function nhfetch(url, opts = undefined) {
    const snap = beginOriginAwait(activeGame, 'fetch');
    try {
        return await fetch(url, opts);
    } finally {
        endOriginAwait(activeGame, snap);
    }
}

export async function nhload(loadFn) {
    const snap = beginOriginAwait(activeGame, 'load');
    try {
        return await Promise.resolve(typeof loadFn === 'function' ? loadFn() : null);
    } finally {
        endOriginAwait(activeGame, snap);
    }
}
