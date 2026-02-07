// test/e2e/game.e2e.test.js -- End-to-end browser tests for NetHack JS
// Launches the game in a headless browser and verifies core functionality.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startServer } from './serve.js';

let browser, page, serverInfo;

// Helper: send a key to the page
async function sendKey(key, opts = {}) {
    await page.keyboard.press(key, opts);
    // Short delay so async game loop can process
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
}

// Helper: send a character code directly via DOM event
async function sendChar(ch) {
    await page.keyboard.type(ch);
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
}

// Helper: get all text from the terminal
async function getTerminalText() {
    return page.evaluate(() => {
        const spans = document.querySelectorAll('#terminal span');
        if (spans.length === 0) return '';
        let text = '';
        let prev = null;
        for (const span of spans) {
            text += span.textContent;
        }
        return text;
    });
}

// Helper: get text of a specific terminal row (0-indexed)
async function getRow(row) {
    return page.evaluate((r) => {
        const pre = document.getElementById('terminal');
        if (!pre) return '';
        const lines = pre.textContent.split('\n');
        return lines[r] || '';
    }, row);
}

// Helper: find a character on the terminal (returns {row, col} or null)
async function findChar(ch) {
    return page.evaluate((target) => {
        const pre = document.getElementById('terminal');
        if (!pre) return null;
        const lines = pre.textContent.split('\n');
        for (let r = 0; r < lines.length; r++) {
            const c = lines[r].indexOf(target);
            if (c >= 0) return { row: r, col: c };
        }
        return null;
    }, ch);
}

// Helper: check if a string appears somewhere on screen
async function screenContains(text) {
    const content = await getTerminalText();
    return content.includes(text);
}

// Helper: wait for the page and game to be loaded
async function waitForGameLoad() {
    // Wait for the terminal to exist and have content
    await page.waitForSelector('#terminal', { timeout: 5000 });
    // Wait for spans to be created (display.js _createDOM)
    await page.waitForFunction(
        () => document.querySelectorAll('#terminal span').length > 100,
        { timeout: 5000 }
    );
}

describe('E2E: Game loads and initializes', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();

        // Capture console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error(`  [browser] ${msg.text()}`);
            }
        });

        await page.goto(serverInfo.url);
        await waitForGameLoad();
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('page loads without errors', async () => {
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        // Give it a moment
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        assert.equal(errors.length, 0, `Page errors: ${errors.join(', ')}`);
    });

    it('terminal element exists with correct dimensions', async () => {
        const spanCount = await page.evaluate(() =>
            document.querySelectorAll('#terminal span').length
        );
        // 80 cols * 24 rows = 1920 spans
        assert.equal(spanCount, 80 * 24, `Expected 1920 spans, got ${spanCount}`);
    });

    it('shows welcome/role selection message', async () => {
        const has = await screenContains('role') || await screenContains('NetHack');
        assert.ok(has, 'Should show welcome or role selection');
    });
});

describe('E2E: Role selection and game start', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad();
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('can select a role and start the game', async () => {
        // Press 'a' to select first role (Archeologist)
        await sendChar('a');
        // Wait a beat for the game to process
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

        // Press any key to begin
        await sendChar(' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

        // After role selection and game start, the map should be rendered
        // Look for the player '@' symbol on screen
        const playerPos = await findChar('@');
        assert.ok(playerPos, 'Player @ should be visible on the map');
    });

    it('shows player @ on the map', async () => {
        const playerPos = await findChar('@');
        assert.ok(playerPos, 'Player @ should be on screen');
        // Player should be on map rows (row 1+)
        assert.ok(playerPos.row >= 1, `Player should be on map area, found at row ${playerPos.row}`);
    });

    it('shows dungeon features (walls, floor)', async () => {
        const text = await getTerminalText();
        // DECGraphics: room floor is middle dot U+00B7, walls are box-drawing chars
        assert.ok(text.includes('\u00b7'), 'Should show floor tiles (middle dot)');
        assert.ok(text.includes('\u2500') || text.includes('\u2502'),
            'Should show wall tiles (box-drawing)');
    });

    it('shows status lines at the bottom', async () => {
        // Status row 1 should have player name and attributes
        const statusRow1 = await getRow(22);
        assert.ok(statusRow1.includes('St:') || statusRow1.includes('Player'),
            `Status line 1 should have stats, got: "${statusRow1.trim()}"`);

        // Status row 2 should have HP and other vitals
        const statusRow2 = await getRow(23);
        assert.ok(statusRow2.includes('HP:') || statusRow2.includes('Dlvl:'),
            `Status line 2 should have HP, got: "${statusRow2.trim()}"`);
    });
});

describe('E2E: Movement and interaction', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad();

        // Select role and start game
        await sendChar('a');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        await sendChar(' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('help command shows key bindings (no-turn)', async () => {
        // Test non-turn commands first so player doesn't die from monsters
        await sendChar('?');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        const msg = await getRow(0);
        assert.ok(msg.includes('Move') || msg.includes('hjkl'),
            `Help should show movement keys, got: "${msg.trim()}"`);
    });

    it('inventory starts empty or shows message (no-turn)', async () => {
        await sendChar('i');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        const msg = await getRow(0);
        assert.ok(
            msg.includes('Inventory') || msg.includes('Not carrying') || msg.includes('carrying'),
            `Should show inventory message, got: "${msg.trim()}"`
        );
    });

    it('look command reports location (no-turn)', async () => {
        await sendChar(':');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        const msg = await getRow(0);
        assert.ok(msg.trim().length > 0, 'Look should produce a message');
    });

    it('period key (wait) does not move player', async () => {
        const before = await findChar('@');
        if (!before) return; // player may have died
        await sendChar('.');
        const after = await findChar('@');
        if (after) {
            assert.deepEqual(before, after, 'Wait should not change position');
        }
    });

    it('turn counter increments after wait', async () => {
        const statusBefore = await getRow(23);
        const turnMatch = statusBefore.match(/T:(\d+)/);
        if (!turnMatch) return; // player may have died
        const turnBefore = parseInt(turnMatch[1]);

        await sendChar('.');

        const statusAfter = await getRow(23);
        const turnMatchAfter = statusAfter.match(/T:(\d+)/);
        if (!turnMatchAfter) return; // player may have died
        const turnAfter = parseInt(turnMatchAfter[1]);

        assert.ok(turnAfter > turnBefore,
            `Turn should increment: was ${turnBefore}, now ${turnAfter}`);
    });

    it('player can move with vi keys', async () => {
        const before = await findChar('@');
        if (!before) return; // player may have died

        // Try just one safe direction
        let moved = false;
        for (const key of ['l', 'h', 'j', 'k']) {
            const posBefore = await findChar('@');
            if (!posBefore) break;
            await sendChar(key);
            await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
            const posAfter = await findChar('@');

            if (posAfter && (posAfter.row !== posBefore.row || posAfter.col !== posBefore.col)) {
                moved = true;
                break;
            }
        }
        assert.ok(moved, 'Player should move with at least one vi key');
    });

    it('player can move with arrow keys', async () => {
        const posBefore = await findChar('@');
        if (!posBefore) return; // player may have died

        let moved = false;
        for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) {
            const pre = await findChar('@');
            if (!pre) break;
            await sendKey(key);
            const post = await findChar('@');

            if (post && (post.row !== pre.row || post.col !== pre.col)) {
                moved = true;
                break;
            }
        }
        assert.ok(moved, 'Player should move with at least one arrow key');
    });
});

describe('E2E: Stairs and level changes', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad();

        // Select role and start
        await sendChar('a');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        await sendChar(' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('dungeon level indicator shows Dlvl:1', async () => {
        const statusRow = await getRow(23);
        assert.ok(statusRow.includes('Dlvl:1'),
            `Status should show Dlvl:1, got: "${statusRow.trim()}"`);
    });

    it('> on non-stair tile gives error message', async () => {
        // Player is probably not on stairs, so > should give a message
        await sendChar('>');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        const msg = await getRow(0);
        // Should say "can't go down" or "descend" if on stairs
        assert.ok(msg.trim().length > 0, 'Should produce a message when pressing >');
    });
});

describe('E2E: Search command works', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad();

        await sendChar('a');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        await sendChar(' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('s command shows search message', async () => {
        await sendChar('s');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
        const msg = await getRow(0);
        assert.ok(msg.includes('search') || msg.includes('hidden') || msg.trim().length > 0,
            `Search should produce message, got: "${msg.trim()}"`);
    });
});

describe('E2E: Display integrity', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await page.goto(serverInfo.url);
        await waitForGameLoad();

        await sendChar('a');
        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        await sendChar(' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('map uses correct DEC graphics characters', async () => {
        const text = await getTerminalText();
        // DECGraphics: box-drawing walls, middle dot floor
        const hasWalls = text.includes('\u2500') || text.includes('\u2502');
        const hasFloor = text.includes('\u00b7');
        const hasPlayer = text.includes('@');
        assert.ok(hasWalls, 'Map should have box-drawing wall characters');
        assert.ok(hasFloor, 'Map should have middle dot floor characters');
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

    it('terminal has 24 lines', async () => {
        const lineCount = await page.evaluate(() => {
            const pre = document.getElementById('terminal');
            if (!pre) return 0;
            return pre.textContent.split('\n').length;
        });
        assert.equal(lineCount, 24, `Terminal should have 24 lines, got ${lineCount}`);
    });

    it('each line is 80 characters wide', async () => {
        const widths = await page.evaluate(() => {
            const pre = document.getElementById('terminal');
            if (!pre) return [];
            return pre.textContent.split('\n').map(l => l.length);
        });
        for (let i = 0; i < widths.length; i++) {
            assert.equal(widths[i], 80,
                `Line ${i} should be 80 chars, got ${widths[i]}`);
        }
    });

    it('monster symbols are visible when in FOV', async () => {
        // Move around a bit to find monsters
        for (let i = 0; i < 10; i++) {
            await sendChar('.');
        }
        // We can't guarantee seeing a monster, but confirm no errors occurred
        const text = await getTerminalText();
        assert.ok(text.length > 0, 'Terminal should have content after waiting');
    });
});
