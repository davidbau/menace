// browser_bootstrap.js -- Browser-specific entry point
//
// This module handles browser-specific concerns:
// - DOM initialization (DOMContentLoaded)
// - URL parameter parsing
// - Browser-specific lifecycle callbacks
// - Browser input initialization
// - Keylog console APIs
//
// The core game logic lives in nethack.js and can be used headlessly.

import { NetHackGame, getKeylog, saveKeylog, startReplay } from './nethack.js';
import { getUrlParams } from './storage.js';
import { initBrowserInput } from './browser_input.js';

function createBrowserLifecycle() {
    return {
        restart: () => window.location.reload(),
        replaceUrlParams: (params) => {
            const url = new URL(window.location.href);
            for (const [key, value] of Object.entries(params)) {
                if (value === null) {
                    url.searchParams.delete(key);
                } else {
                    url.searchParams.set(key, value);
                }
            }
            window.history.replaceState({}, '', url.toString());
        },
    };
}

function registerKeylogApis() {
    window.get_keylog = () => {
        const kl = getKeylog();
        console.log(JSON.stringify(kl, null, 2));
        return kl;
    };
    window.run_keylog = async (src) => {
        const data = typeof src === 'string' ? await (await fetch(src)).json() : src;
        startReplay(data);
    };
    window.save_keylog = saveKeylog;
}

// --- Browser Entry Point ---
// Start the game when the page loads
window.addEventListener('DOMContentLoaded', async () => {
    registerKeylogApis();

    // Parse URL parameters into game options
    const urlOpts = getUrlParams();
    const options = {
        seed: urlOpts.seed,
        wizard: urlOpts.wizard,
        reset: urlOpts.reset,
    };

    // Mutable references for flags/display (set via hook after init)
    let currentFlags = null;
    let currentDisplay = null;

    // Initialize browser input with getters for flags/display
    const inputAdapter = initBrowserInput({
        getFlags: () => currentFlags,
        getDisplay: () => currentDisplay,
    });

    // Create browser-specific dependencies
    const deps = {
        // Display will be created by the game if not provided
        display: null,

        // Input adapter (browser-specific)
        input: inputAdapter,

        // Lifecycle callbacks for browser environment
        lifecycle: createBrowserLifecycle(),

        // Hooks for observability
        hooks: {
            // Called after flags and display are initialized
            onRuntimeBindings: ({ game, flags, display }) => {
                // Update references for input adapter
                currentFlags = flags;
                currentDisplay = display;

                // Expose globally for debugging
                window.gameInstance = game;
                window.gameFlags = flags;
                window.gameDisplay = display;
            },
        },
    };

    // Create and run the game
    const game = new NetHackGame(options, deps);
    await game.init();
    await game.gameLoop();
});
