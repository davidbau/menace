// menace.js -- Browser-only game startup wiring.
// Keeps DOM, URL, and window lifecycle logic out of the NetHackGame core.

import { Display } from './display.js';
import { initBrowserInput } from './browser_input.js';
import { clearGameUrlParams, getUrlParams, saveGame, deleteSave } from './storage.js';
import { NetHackGame } from './allmain.js';
import { getKeylog, saveKeylog, startReplay } from './keylog.js';
import { VERSION_STRING } from './const.js';
import { nhgetch } from './input.js';
import { Promo } from './promo.js';
import { nhfetch } from './origin_awaits.js';
window.MENACE_VERSION = VERSION_STRING;

function captureDisplayRows(display) {
    if (!display || !display.grid) return null;
    const rows = [];
    for (let r = 0; r < (display.rows || 24); r++) {
        let lastNonSpace = -1;
        const cells = [];
        for (let c = 0; c < (display.cols || 80); c++) {
            const cell = display.grid[r]?.[c];
            const ch = cell?.ch || ' ';
            cells.push({ ch, color: cell?.color });
            if (ch !== ' ') lastNonSpace = c;
        }
        if (lastNonSpace >= 0) {
            rows.push({
                text: cells.slice(0, lastNonSpace + 1).map(c => c.ch).join(''),
                colors: cells.slice(0, lastNonSpace + 1).map(c => c.color),
            });
        }
    }
    return rows.length > 0 ? rows : null;
}

function createBrowserLifecycle(display, promo, restart) {
    return {
        restart,
        promo: () => promo.run(display, nhgetch, restart),
        shell: () => {
            localStorage.setItem('shell_context', JSON.stringify({
                app: 'nethack', user: 'rodney',
                rows: captureDisplayRows(display),
            }));
            window.location.href = '/shell/';
        },
        replaceUrlParams: (params) => {
            const url = new URL(window.location.href);
            for (const [key, value] of Object.entries(params || {})) {
                if (value === null || value === undefined) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, String(value));
                }
            }
            window.history.replaceState({}, '', url.toString());
        },
    };
}

function registerMenuApis(display, promo, restart) {
    window._saveAndQuit = async function() {
        if (window.gameInstance) await saveGame(window.gameInstance);
        await promo.run(display, nhgetch, restart);
    };
    window._newGame = function() {
        deleteSave();
        restart();
    };
}

function registerKeylogApis() {
    window.get_keylog = () => {
        const kl = getKeylog();
        console.log(JSON.stringify(kl, null, 2));
        return kl;
    };
    window.run_keylog = async (src) => {
        const data = typeof src === 'string' ? await (await nhfetch(src)).json() : src;
        startReplay(data);
    };
    window.save_keylog = saveKeylog;
}

window.addEventListener('DOMContentLoaded', async () => {
    registerKeylogApis();
    const opts = getUrlParams();
    let currentFlags = null;
    let currentDisplay = null;
    const input = initBrowserInput({
        getFlags: () => currentFlags,
        getDisplay: () => currentDisplay,
    });

    const urlParams = new URLSearchParams(window.location.search);

    // &clearLocalStorage URL param — wipe all saved state before init
    if (urlParams.has('clearLocalStorage')) {
        Object.keys(localStorage).forEach(k => localStorage.removeItem(k));
    }

    const display = new Display('game');
    const restart = () => window.location.reload();
    const promo = new Promo();
    registerMenuApis(display, promo, restart);

    // Legacy redirect: ?shell=1 links now go to /shell/
    if (urlParams.get('shell') === '1') {
        window.location.replace('/shell/');
        return;
    }

    const game = new NetHackGame({
        display,
        input,
        lifecycle: createBrowserLifecycle(display, promo, restart),
        hooks: {
            onRuntimeBindings: ({ game: runningGame, flags, display }) => {
                currentFlags = flags;
                currentDisplay = display;
                window.gameInstance = runningGame;
                window.gameFlags = flags;
                window.gameDisplay = display;
            },
            onGameplayStart: () => {
                clearGameUrlParams();
                document.body.classList.add('gameplay-active');
            },
            onGameOver: () => {
                document.body.classList.remove('gameplay-active');
            },
        },
    });

    const initOpts = {
        seed: opts.seed,
        wizard: opts.wizard,
        reset: opts.reset,
    };
    // URL params role/race/gender/align → skip chargen
    // Session replay: ?session=path loads a session file for step-by-step replay
    const sessionParam = urlParams.get('session');
    if (sessionParam) {
        try {
            const resp = await nhfetch(sessionParam);
            const session = await resp.json();
            const sessOpts = session.options || {};
            initOpts.seed = session.seed;
            initOpts.wizard = sessOpts.wizard || false;
            initOpts.datetime = session.datetime || '20000110090000';
            initOpts.character = {
                role: sessOpts.role || 'Valkyrie',
                name: sessOpts.name || 'Player',
                race: sessOpts.race || undefined,
                gender: sessOpts.gender || undefined,
                align: sessOpts.align || undefined,
            };
            initOpts.tutorial = false;
            initOpts.flags = {
                tutorial: false,
                symset: sessOpts.symset || undefined,
                autopickup: sessOpts.autopickup !== undefined ? sessOpts.autopickup : undefined,
            };
            // Collect gameplay keys
            const gameKeys = [];
            for (const step of (session.steps || [])) {
                const k = step.key;
                if (k == null) { gameKeys.push(null); continue; }
                if (k.length === 1) gameKeys.push(k.charCodeAt(0));
                else if (k === 'escape') gameKeys.push(27);
                else if (k === 'space') gameKeys.push(32);
                else if (k === 'return' || k === 'enter') gameKeys.push(13);
                else gameKeys.push(null);
            }
            // Set up step-by-step replay after game starts
            const origOnGameplayStart = initOpts.hooks?.onGameplayStart;
            if (!initOpts.hooks) initOpts.hooks = {};
            // Expose step functions on window after a short delay
            setTimeout(() => {
                let idx = 0;
                window._sessionKeys = gameKeys;
                window._sessionIdx = 0;
                window.step = function() {
                    while (window._sessionIdx < gameKeys.length) {
                        const k = gameKeys[window._sessionIdx++];
                        if (k == null) continue;
                        input.pushInput(k);
                        const ch = k >= 32 && k < 127 ? String.fromCharCode(k) : (k === 13 ? 'Enter' : (k === 27 ? 'Esc' : (k < 32 ? '^' + String.fromCharCode(k+64) : '?')));
                        return 'step ' + (window._sessionIdx-1) + '/' + gameKeys.length + ': ' + ch + ' (' + k + ')';
                    }
                    return 'done';
                };
                window.stepN = async function(n, delay) {
                    delay = delay || 300;
                    for (let i = 0; i < n; i++) {
                        const r = window.step();
                        if (r === 'done') return r;
                        console.log(r);
                        await new Promise(r => setTimeout(r, delay));
                    }
                    return 'at ' + window._sessionIdx + '/' + gameKeys.length;
                };
                window.stepAll = function(delay) { return window.stepN(gameKeys.length, delay || 300); };
                console.log('Session replay ready: ' + gameKeys.filter(k=>k!=null).length + ' keys. Use step(), stepN(n), or stepAll(delay).');
            }, 500);
        } catch (e) {
            console.error('Failed to load session:', e);
        }
    }
    if (opts.role) {
        const urlParams = new URLSearchParams(window.location.search);
        initOpts.character = {
            role: opts.role,
            name: urlParams.get('name') || 'Player',
            race: urlParams.get('race') || undefined,
            gender: urlParams.get('gender') || undefined,
            align: urlParams.get('align') || undefined,
        };
        initOpts.tutorial = false;
        initOpts.flags = { tutorial: false };
        if (urlParams.has('wizard')) initOpts.wizard = true;
    }
    await game.init(initOpts);
    await game.gameLoop();
});
