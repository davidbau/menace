// entry.js -- Standalone entry point for shell/index.html.
// Reads localStorage shell_context (set by nethack/rogue/hack before navigating here),
// then runs the shell as logged-in rodney (if context present) or shows a login prompt.

import { Display } from '../../js/display.js';
import { Shell, runLoginLoop } from '../shell.js';

const SHELL_CONTEXT_KEY = 'shell_context';

// Read and immediately delete the one-shot context from localStorage.
function readAndClearContext() {
    try {
        const s = localStorage.getItem(SHELL_CONTEXT_KEY);
        if (s) {
            localStorage.removeItem(SHELL_CONTEXT_KEY);
            return JSON.parse(s);
        }
    } catch (e) { /* ignore */ }
    return null;
}

// Simple char-code getch that does not depend on the NetHack input runtime.
function makeGetch() {
    const queue = [];
    let resolver = null;
    function deliver(code) {
        if (resolver) { const r = resolver; resolver = null; r(code); }
        else queue.push(code);
    }
    document.addEventListener('keydown', e => {
        let code = null;
        if (e.ctrlKey && !e.altKey && !e.metaKey) {
            const c = e.key.toLowerCase().charCodeAt(0);
            if (c >= 97 && c <= 122) code = c - 96; // Ctrl-A … Ctrl-Z
        } else if (!e.ctrlKey && !e.altKey && !e.metaKey) {
            if (e.key === 'Enter')     { code = 13; }
            else if (e.key === 'Backspace') { code = 8;  e.preventDefault(); }
            else if (e.key === 'Delete')    { code = 127; }
            else if (e.key === 'Escape')    { code = 27; }
            else if (e.key === 'Tab')       { code = 9;  e.preventDefault(); }
            else if (e.key === 'ArrowUp')   { code = 16; e.preventDefault(); } // ≈ Ctrl-P
            else if (e.key === 'ArrowDown') { code = 14; e.preventDefault(); } // ≈ Ctrl-N
            else if (e.key.length === 1)    { code = e.key.charCodeAt(0); }
        }
        if (code !== null) deliver(code);
    });
    return () => queue.length > 0
        ? Promise.resolve(queue.shift())
        : new Promise(r => { resolver = r; });
}

function navigateToGame(game) {
    if (game === 'nethack') window.location.href = '/';
    else if (game === 'hack')  window.location.href = '/hack/';
    else if (game === 'rogue') window.location.href = '/rogue/';
}

window.addEventListener('DOMContentLoaded', async () => {
    const display = new Display('shell-container');
    const getch   = makeGetch();

    const context = readAndClearContext();

    if (context) {
        // Arrived from a game — run as already-logged-in rodney.
        const shell  = new Shell(display, getch);
        const result = await shell.run({ rows: context.rows || null, app: context.app });
        if (result && result.action === 'launch') {
            navigateToGame(result.game);
            return;
        }
        // Shell exited — fall through to login loop.
    }

    // No context (direct URL access) or shell exited: show login prompt.
    const lifecycle = { restart: () => window.location.href = '/shell/' };
    await runLoginLoop(display, getch, lifecycle);
});
