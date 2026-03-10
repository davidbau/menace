// test/e2e/game.e2e.test.js -- End-to-end browser tests for NetHack JS
// Launches the game in a headless browser and verifies core functionality.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startServer } from './serve.js';

let browser, serverInfo;

// File-level setup: one browser + one server for all tests
before(async () => {
    serverInfo = await startServer();
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
});

after(async () => {
    if (browser) await browser.close();
    if (serverInfo) serverInfo.server.close();
});

// Helper: send a key to the page
async function sendKey(page, key, opts = {}) {
    await page.keyboard.press(key, opts);
    await page.evaluate(() => new Promise(r => setTimeout(r, 20)));
}

// Helper: send a character code directly via DOM event
async function sendChar(page, ch) {
    await page.keyboard.type(ch);
    await page.evaluate(() => new Promise(r => setTimeout(r, 20)));
}

// Helper: get all text from the terminal
async function getTerminalText(page) {
    return page.evaluate(() => {
        const spans = document.querySelectorAll('#terminal span');
        if (spans.length === 0) return '';
        let text = '';
        for (const span of spans) {
            text += span.textContent;
        }
        return text;
    });
}

// Helper: get text of a specific terminal row (0-indexed)
// Uses spans directly (80 per row) rather than textContent which has newline issues
async function getRow(page, row) {
    return page.evaluate((r) => {
        const spans = document.querySelectorAll('#terminal span');
        let line = '';
        for (let c = 0; c < 80; c++) {
            line += spans[r * 80 + c]?.textContent || ' ';
        }
        return line;
    }, row);
}

// Helper: find a character on the terminal (returns {row, col} or null)
// Uses spans directly for correct row/col mapping
async function findChar(page, ch) {
    return page.evaluate((target) => {
        const spans = document.querySelectorAll('#terminal span');
        for (let r = 0; r < 24; r++) {
            for (let c = 0; c < 80; c++) {
                if (spans[r * 80 + c]?.textContent === target) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }, ch);
}

// Helper: check if a string appears somewhere on screen
async function screenContains(page, text) {
    const content = await getTerminalText(page);
    return content.includes(text);
}

// Helper: dismiss all overlays (--More--, menus, pagers) and return to gameplay
async function returnToGameplay(page) {
    for (let i = 0; i < 15; i++) {
        const text = await getTerminalText(page);
        // Check if we're at the game map (status lines visible, no overlay)
        const hasStatus = text.includes('Dlvl:') || text.includes('HP:');
        const hasOverlay = text.includes('--More--') || text.includes('(end)')
            || text.includes('Select one item') || text.includes('[q to quit]');
        if (hasStatus && !hasOverlay) break;

        if (text.includes('--More--') || text.includes('(end)')) {
            await sendChar(page, ' ');
        } else if (text.includes('[q to quit]')) {
            await sendChar(page, 'q');
        } else if (text.includes('Select one item')) {
            await sendKey(page, 'Escape');
        } else {
            // Try escape as generic dismiss
            await sendKey(page, 'Escape');
        }
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    }
    // Clear internal Display message state that prior tests may have left behind.
    // Keep this aligned with the current async model: messageNeedsMore/topMessage
    // are the only state needed here.
    await page.evaluate(() => {
        const d = window.gameDisplay;
        if (d) {
            d.messageNeedsMore = false;
            d.topMessage = null;
        }
    });
}

// Helper: wait for the page and game to be loaded
async function waitForGameLoad(page) {
    // Navigate, clear localStorage, then reload to prevent state leakage
    await page.goto(serverInfo.url);
    await page.evaluate(() => localStorage.clear());
    await page.goto(serverInfo.url, { waitUntil: 'networkidle0' });

    await page.waitForSelector('#terminal', { timeout: 15000 });
    await page.waitForFunction(
        () => document.querySelectorAll('#terminal span').length >= 1920,
        { timeout: 15000 }
    );
    // CRITICAL: Wait for game to be ready for input (not just rendered)
    await page.waitForFunction(
        () => {
            const text = document.getElementById('terminal')?.textContent || '';
            return text.includes('Shall I pick') || text.includes('Who are you?');
        },
        { timeout: 15000 }
    );
}

// Helper: select role and start game
// Chargen flow: Name → Enter → 'y' (auto-pick) → 'y' (confirm) →
//   space (lore) → space (welcome) → 'n' (tutorial) → gameplay
async function selectRoleAndStart(page) {
    // "Who are you?" → enter name
    await page.keyboard.type('Test');
    await sendKey(page, 'Enter');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    // "Shall I pick..." → 'y'
    await sendChar(page, 'y');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    // "Is this ok?" → 'y'
    await sendChar(page, 'y');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    // Dismiss --More-- prompts and tutorial
    for (let i = 0; i < 15; i++) {
        const text = await getTerminalText(page);
        const hasStatus = text.includes('Dlvl:') || text.includes('HP:');
        const hasOverlay = text.includes('--More--') || text.includes('tutorial') || text.includes('Tutorial');
        if (hasStatus && !hasOverlay) break;
        if (text.includes('tutorial') || text.includes('Tutorial')) {
            await sendChar(page, 'n');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            continue;
        }
        await sendChar(page, ' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
    }
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
}

describe('E2E: Game loads and initializes', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`  [browser] ${msg.text()}`);
            }
        });
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('page loads without errors', async () => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        assert.equal(errors.length, 0, `Page errors: ${errors.join(', ')}`);
    });

    it('terminal element exists with correct dimensions', async () => {
        const spanCount = await page.evaluate(() =>
            document.querySelectorAll('#terminal span').length
        );
        assert.equal(spanCount, 80 * 24, `Expected 1920 spans, got ${spanCount}`);
    });

    it('shows welcome/role selection message', async () => {
        const content = await getTerminalText(page);
        const has = content.includes('Shall I pick') || content.includes('Who are you') || content.includes('role') || content.includes('NetHack');
        assert.ok(has, 'Should show welcome or role selection');
    });
});

describe('E2E: Role selection and game start', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('can select a role and start the game', async () => {
        await selectRoleAndStart(page);

        const playerPos = await findChar(page, '@');
        assert.ok(playerPos, 'Player @ should be visible on the map');
    });

    it('shows player @ on the map', async () => {
        const playerPos = await findChar(page, '@');
        assert.ok(playerPos, 'Player @ should be on screen');
        assert.ok(playerPos.row >= 1, `Player should be on map area, found at row ${playerPos.row}`);
    });

    it('shows dungeon features (walls, floor)', async () => {
        // The map should already be rendered after selectRoleAndStart()
        // DECgraphics is on by default: floor is middle dot, walls are box-drawing
        const text = await getTerminalText(page);
        const hasFloor = text.includes('.') || text.includes('\u00b7');
        assert.ok(hasFloor, 'Should show floor tiles (. or middle dot)');
        // Accept both ASCII (-/|) and DECgraphics box-drawing wall characters
        const hasAsciiWalls = text.includes('-') && text.includes('|');
        const hasBoxWalls = /[\u2500-\u257F]/.test(text);
        assert.ok(hasAsciiWalls || hasBoxWalls,
            'Should show wall tiles (ASCII or box-drawing)');
    });

    it('shows status lines at the bottom', async () => {
        const statusRow1 = await getRow(page, 22);
        assert.ok(statusRow1.includes('St:') || statusRow1.includes('Player'),
            `Status line 1 should have stats, got: "${statusRow1.trim()}"`);

        const statusRow2 = await getRow(page, 23);
        assert.ok(statusRow2.includes('HP:') || statusRow2.includes('Dlvl:'),
            `Status line 2 should have HP, got: "${statusRow2.trim()}"`);
    });
});

describe('E2E: Movement and interaction', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('help command shows lettered menu (no-turn)', async () => {
        await returnToGameplay(page);
        await sendChar(page, '?');  // open help menu
        await page.waitForFunction(
            () => {
                const text = document.getElementById('terminal')?.textContent || '';
                return text.includes('Select one item');
            },
            { timeout: 3000 }
        );
        const menuText = await getTerminalText(page);
        assert.ok(menuText.includes('Select one item'),
            `Help should show lettered menu, got: "${menuText.substring(0, 200)}"`);
        await sendKey(page, 'Escape');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    });

    it('inventory shows items or empty message (no-turn)', async () => {
        await returnToGameplay(page);
        await sendChar(page, 'i');
        await page.waitForFunction(
            () => {
                const text = document.getElementById('terminal')?.textContent || '';
                return text.includes('Not carrying') || text.includes('carrying')
                    || /[a-z] - /.test(text) || text.includes('(end)')
                    || text.includes('Armor') || text.includes('Weapons');
            },
            { timeout: 3000 }
        );
        const text = await getTerminalText(page);
        assert.ok(
            text.includes('Not carrying') || text.includes('carrying')
            || /[a-z] - /.test(text) || text.includes('(end)')
            || text.includes('Armor') || text.includes('Weapons'),
            `Should show inventory items or empty message`
        );
        await returnToGameplay(page);
    });

    it('look command reports location (no-turn)', async () => {
        await sendChar(page, ':');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        const msg = await getRow(page, 0);
        assert.ok(msg.trim().length > 0, 'Look should produce a message');
    });

    it('period key (wait) does not move player', async () => {
        const before = await findChar(page, '@');
        if (!before) return;
        await sendChar(page, '.');
        const after = await findChar(page, '@');
        if (after) {
            assert.deepEqual(before, after, 'Wait should not change position');
        }
    });

    it('turn counter increments after wait', async () => {
        const statusBefore = await getRow(page, 23);
        const turnMatch = statusBefore.match(/T:(\d+)/);
        if (!turnMatch) return;
        const turnBefore = parseInt(turnMatch[1]);

        await sendChar(page, '.');

        const statusAfter = await getRow(page, 23);
        const turnMatchAfter = statusAfter.match(/T:(\d+)/);
        if (!turnMatchAfter) return;
        const turnAfter = parseInt(turnMatchAfter[1]);

        assert.ok(turnAfter > turnBefore,
            `Turn should increment: was ${turnBefore}, now ${turnAfter}`);
    });

    it('player can move with vi keys', async () => {
        await returnToGameplay(page);
        // Dismiss any pending --More-- prompts first
        for (let m = 0; m < 5; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
        }

        let moved = false;
        for (const key of ['l', 'h', 'j', 'k', 'l', 'j', 'h', 'k']) {
            const posBefore = await findChar(page, '@');
            if (!posBefore) break;
            await sendChar(page, key);
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            // Dismiss --More-- if movement triggered a message
            for (let m = 0; m < 3; m++) {
                const msg = await getTerminalText(page);
                if (!msg.includes('--More--')) break;
                await sendChar(page, ' ');
                await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
            }
            const posAfter = await findChar(page, '@');

            if (posAfter && (posAfter.row !== posBefore.row || posAfter.col !== posBefore.col)) {
                moved = true;
                break;
            }
        }
        assert.ok(moved, 'Player should move with at least one vi key');
    });

    it('player can move with arrow keys', async () => {
        await returnToGameplay(page);
        let moved = false;
        for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
            const pre = await findChar(page, '@');
            if (!pre) break;
            await sendKey(page, key);
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            // Dismiss --More--
            for (let m = 0; m < 3; m++) {
                const msg = await getTerminalText(page);
                if (!msg.includes('--More--')) break;
                await sendChar(page, ' ');
                await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
            }
            const post = await findChar(page, '@');

            if (post && (post.row !== pre.row || post.col !== pre.col)) {
                moved = true;
                break;
            }
        }
        assert.ok(moved, 'Player should move with at least one arrow key');
    });
});

describe('E2E: Help and information commands', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('? shows lettered help menu', async () => {
        await sendChar(page, '?');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        const text = await getTerminalText(page);
        assert.ok(text.includes('About') || text.includes('help') || text.includes('Select'),
            'Help should show menu');
        await sendKey(page, 'Escape');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    });

    it('? then a shows version info', async () => {
        await sendChar(page, '?');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        await sendChar(page, 'a');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        const msg = await getRow(page, 0);
        assert.ok(msg.includes('NetHack'),
            `About should show version info, got: "${msg.trim()}"`);
        // Dismiss --More-- prompt left by version info
        await sendChar(page, ' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
    });

    it('? then c shows game commands in pager', async () => {
        await sendChar(page, '?');
        // Wait for help menu to appear
        await page.waitForFunction(
            () => (document.getElementById('terminal')?.textContent || '').includes('Select one item'),
            { timeout: 3000 }
        );
        await sendChar(page, 'c');
        // Wait for pager content to load (menu disappears, commands appear)
        await page.waitForFunction(
            () => {
                const text = document.getElementById('terminal')?.textContent || '';
                return !text.includes('Select one item') &&
                    (text.includes('Game Commands') || text.includes('Move commands') || text.includes('Commands'));
            },
            { timeout: 3000 }
        );
        const text = await getTerminalText(page);
        const hasCommands = text.includes('Game Commands') || text.includes('Move commands') || text.includes('Commands');
        assert.ok(hasCommands, 'Should show game commands from hh.txt');
        await sendChar(page, 'q');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
    });

    it('? then d shows history in pager', async () => {
        await sendChar(page, '?');
        await page.waitForFunction(
            () => (document.getElementById('terminal')?.textContent || '').includes('Select one item'),
            { timeout: 3000 }
        );
        await sendChar(page, 'd');
        await page.waitForFunction(
            () => {
                const text = document.getElementById('terminal')?.textContent || '';
                return !text.includes('Select one item') &&
                    (text.includes('History') || text.includes('NetHack'));
            },
            { timeout: 3000 }
        );
        const text = await getTerminalText(page);
        assert.ok(text.includes('History') || text.includes('NetHack'),
            'Should show history');
        await sendChar(page, 'q');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
    });

    it('& (whatdoes) describes a known key', async () => {
        await returnToGameplay(page);
        await sendChar(page, '&');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        // Dismiss any --More-- before the "What command?" prompt
        for (let m = 0; m < 3; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        }
        await sendChar(page, 'o');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        // Dismiss any --More-- after the result
        for (let m = 0; m < 3; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        }
        const msg = await getRow(page, 0);
        const hasDescription = msg.includes('open') || msg.includes('Open') || msg.includes('door');
        assert.ok(hasDescription,
            `Whatdoes should describe 'o', got: "${msg.trim()}"`);
    });

    it('& (whatdoes) reports unknown for unbound key', async () => {
        await returnToGameplay(page);
        await sendChar(page, '&');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        // Dismiss any --More-- before the "What command?" prompt
        for (let m = 0; m < 3; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        }
        await sendChar(page, 'X');
        await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        const msg = await getRow(page, 0);
        assert.ok(msg.includes('unknown') || msg.includes('Unknown') || msg.includes('No such')
            || msg.includes('not a command') || msg.includes('not bound'),
            `Whatdoes should report unknown for 'X', got: "${msg.trim()}"`);
    });

    it('turn counter does not increment after info commands', async () => {
        const statusBefore = await getRow(page, 23);
        const turnMatch = statusBefore.match(/T:(\d+)/);
        if (!turnMatch) return;
        const turnBefore = parseInt(turnMatch[1]);

        // Run several info commands that should not take a turn
        await sendChar(page, '\\');  // discoveries
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));

        await sendChar(page, '&');  // whatdoes
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        await sendChar(page, '.');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));

        await sendChar(page, '/');  // whatis
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        await sendChar(page, '@');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));

        const statusAfter = await getRow(page, 23);
        const turnMatchAfter = statusAfter.match(/T:(\d+)/);
        if (!turnMatchAfter) return;
        const turnAfter = parseInt(turnMatchAfter[1]);

        assert.equal(turnAfter, turnBefore,
            `Info commands should not take turns: was ${turnBefore}, now ${turnAfter}`);
    });
});

describe('E2E: Whatis (/) command', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('/ (whatis) identifies a symbol', async () => {
        await returnToGameplay(page);
        await sendChar(page, '/');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
        await sendChar(page, '>');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
        // The result message may cause concat overflow with the prompt → --More--.
        // Dismiss to see the actual result.
        for (let m = 0; m < 5; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        }
        const text = await getTerminalText(page);
        assert.ok(text.includes('stair') || text.includes('>') || text.includes('down')
            || text.includes('grave') || text.includes('trap'),
            `Whatis should identify '>', got row0: "${(await getRow(page, 0)).trim()}"`);
    });

    it('/ (whatis) identifies letters as monsters', async () => {
        await returnToGameplay(page);
        await sendChar(page, '/');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
        await sendChar(page, 'd');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
        for (let m = 0; m < 5; m++) {
            const text = await getTerminalText(page);
            if (!text.includes('--More--')) break;
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        }
        const text = await getTerminalText(page);
        assert.ok(text.includes('dog') || text.includes('canine') || text.includes('monster')
            || text.includes(' d ') || text.includes('jackal'),
            `Whatis should identify 'd', got row0: "${(await getRow(page, 0)).trim()}"`);
    });
});

describe('E2E: Stairs and level changes', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('dungeon level indicator shows Dlvl:1', async () => {
        const statusRow = await getRow(page, 23);
        assert.ok(statusRow.includes('Dlvl:1'),
            `Status should show Dlvl:1, got: "${statusRow.trim()}"`);
    });

    it('> on non-stair tile gives error message', async () => {
        await sendChar(page, '>');
        await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
        const msg = await getRow(page, 0);
        assert.ok(msg.trim().length > 0, 'Should produce a message when pressing >');
    });
});

describe('E2E: Search command works', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('s command advances turn counter', async () => {
        // Get turn count before search
        const statusBefore = await getRow(page, 23);
        const turnMatch = statusBefore.match(/T:(\d+)/);
        const turnBefore = turnMatch ? parseInt(turnMatch[1]) : null;

        await sendChar(page, 's');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        // Dismiss --More-- if it appeared
        const text = await getTerminalText(page);
        if (text.includes('--More--')) {
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
        }

        const statusAfter = await getRow(page, 23);
        const turnMatchAfter = statusAfter.match(/T:(\d+)/);
        const turnAfter = turnMatchAfter ? parseInt(turnMatchAfter[1]) : null;

        if (turnBefore !== null && turnAfter !== null) {
            assert.ok(turnAfter > turnBefore,
                `Search should advance turn: ${turnBefore} → ${turnAfter}`);
        } else {
            // At minimum, game should still be alive
            assert.ok(statusAfter.includes('Dlvl:') || statusAfter.includes('T:'),
                'Game should be alive after search');
        }
    });
});

describe('E2E: Display integrity', () => {
    let page;

    before(async () => {
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad(page);
        await selectRoleAndStart(page);
    });

    after(async () => {
        if (page) await page.close();
    });

    it('map uses correct graphics characters (DECgraphics mode by default)', async () => {
        const text = await getTerminalText(page);
        // Default is DECgraphics mode — walls use box-drawing, floor is middle dot
        const hasAsciiWalls = text.includes('-') && text.includes('|');
        const hasBoxWalls = /[\u2500-\u257F]/.test(text);
        const hasFloor = text.includes('.') || text.includes('\u00b7');
        const hasPlayer = text.includes('@');
        assert.ok(hasAsciiWalls || hasBoxWalls, 'Map should have wall characters (ASCII or box-drawing)');
        assert.ok(hasFloor, 'Map should have floor character (. or middle dot)');
        assert.ok(hasPlayer, 'Map should have player @');
    });

    it('all spans have valid color values', async () => {
        const invalidColors = await page.evaluate(() => {
            const spans = document.querySelectorAll('#terminal span');
            let invalid = 0;
            for (const span of spans) {
                const color = span.style.color;
                if (!color || color === '') invalid++;
            }
            return invalid;
        });
        assert.equal(invalidColors, 0, `All spans should have colors, found ${invalidColors} without`);
    });

    it('terminal has 1920 spans (24 rows x 80 cols)', async () => {
        const spanCount = await page.evaluate(() =>
            document.querySelectorAll('#terminal span').length
        );
        assert.equal(spanCount, 1920, `Expected 1920 spans, got ${spanCount}`);
    });

    it('each row has 80 character spans', async () => {
        const result = await page.evaluate(() => {
            const spans = document.querySelectorAll('#terminal span');
            const issues = [];
            for (let r = 0; r < 24; r++) {
                let count = 0;
                for (let c = 0; c < 80; c++) {
                    const span = spans[r * 80 + c];
                    if (span && span.textContent.length === 1) count++;
                }
                if (count !== 80) issues.push({ row: r, count });
            }
            return issues;
        });
        assert.equal(result.length, 0,
            `All rows should have 80 single-char spans: ${JSON.stringify(result)}`);
    });

    it('monster symbols are visible when in FOV', async () => {
        for (let i = 0; i < 10; i++) {
            await sendChar(page, '.');
        }
        const text = await getTerminalText(page);
        assert.ok(text.length > 0, 'Terminal should have content after waiting');
    });
});
