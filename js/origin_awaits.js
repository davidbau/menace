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

export async function display_sync() {
    const game = activeGame;
    if (!game) return;
    const map = game.map || game.lev || null;
    const player = game.u || game.player || null;
    if (game.fov && map && player && typeof game.fov.compute === 'function') {
        game.fov.compute(map, player.x, player.y);
    }
    if (game.display && map && player) {
        if (typeof game.display.renderMap === 'function') {
            game.display.renderMap(map, player, game.fov, game.flags);
        }
        if (typeof game.display.renderStatus === 'function') {
            game.display.renderStatus(player);
        }
        if (typeof game.display.cursorOnPlayer === 'function') {
            game.display.cursorOnPlayer(player);
        }
    }
    if (game.headless) return;
    const snap = beginOriginAwait(activeGame, 'display_sync');
    try {
        await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
        endOriginAwait(activeGame, snap);
    }
}
