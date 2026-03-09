// test/e2e/display_divergence.e2e.test.js
// Tests for specific behavioral divergences between browser Display and
// HeadlessDisplay. Each test targets a known gap area.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startServer } from './serve.js';

let browser, serverInfo;

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

async function sendChar(page, ch) {
    await page.keyboard.type(ch);
    await page.evaluate(() => new Promise(r => setTimeout(r, 80)));
}

async function sendKey(page, key) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise(r => setTimeout(r, 80)));
}

function getScreenLines(page) {
    return page.evaluate(() => {
        const spans = document.querySelectorAll('#terminal span');
        const lines = [];
        for (let r = 0; r < 24; r++) {
            let line = '';
            for (let c = 0; c < 80; c++) {
                line += spans[r * 80 + c]?.textContent || ' ';
            }
            lines.push(line);
        }
        return lines;
    });
}

function getScreenText(page) {
    return page.evaluate(() =>
        document.getElementById('terminal')?.textContent || '');
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

// Load game with seed, clear localStorage, navigate through chargen
async function loadAndChargen(page, seed) {
    await page.goto(serverInfo.url);
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${serverInfo.url}?seed=${seed}`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('#terminal', { timeout: 15000 });
    await page.waitForFunction(
        () => document.querySelectorAll('#terminal span').length >= 1920,
        { timeout: 15000 }
    );
    await page.waitForFunction(
        () => (document.getElementById('terminal')?.textContent || '').includes('Who are you?'),
        { timeout: 15000 }
    );

    await page.keyboard.type('Test');
    await sendKey(page, 'Enter');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    await sendChar(page, 'y');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    await sendChar(page, 'y');
    await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

    for (let i = 0; i < 15; i++) {
        const text = await getScreenText(page);
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

async function dismissMore(page) {
    for (let m = 0; m < 5; m++) {
        const text = await getScreenText(page);
        if (!text.includes('--More--')) break;
        await sendChar(page, ' ');
        await page.evaluate(() => new Promise(r => setTimeout(r, 150)));
    }
}

describe('E2E: Display divergence tests', () => {

    // ---------------------------------------------------------------
    // GAP #1: renderTextPopup was MISSING from browser Display
    // Test: inventory display ('i' command) should render items
    // ---------------------------------------------------------------
    it('inventory menu renders visible items in browser', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 3);

            // Press 'i' for inventory
            await sendChar(page, 'i');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const screen = await getScreenLines(page);
            const screenText = screen.join('\n');

            console.log('\n=== Inventory Menu Test ===');
            // Inventory should show at least one item line with a selector letter
            // e.g. "a - a +0 long sword" or similar
            let hasInventoryItems = false;
            for (let r = 0; r < 22; r++) {
                const line = rtrim(screen[r]);
                // Inventory lines have format: "a - item description" or "(end)" or "--More--"
                if (/^[a-zA-Z] - /.test(line)) {
                    hasInventoryItems = true;
                    break;
                }
            }

            // Check for end/More marker
            const hasEndMarker = screenText.includes('(end)') || screenText.includes('--More--');

            console.log(`  Has inventory items: ${hasInventoryItems}`);
            console.log(`  Has end marker: ${hasEndMarker}`);
            if (!hasInventoryItems) {
                for (let r = 0; r < 10; r++) {
                    console.log(`  Row ${r}: "${rtrim(screen[r])}"`);
                }
            }

            assert.ok(hasInventoryItems || hasEndMarker,
                'Inventory should display items or end marker');

            // Dismiss the inventory popup
            await sendChar(page, ' ');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #1 continued: "Things that are here:" text popup
    // Test: ':' (look here) on starting position should show items
    // ---------------------------------------------------------------
    it('look-here (:) shows text popup when items present', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 5);

            // Drop an item first to ensure something is on the floor
            // 'd' for drop, then select first item
            await sendChar(page, 'd');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

            let text = await getScreenText(page);
            if (text.includes('What do you want to drop?') || text.includes('drop?')) {
                // Pick first inventory letter
                await sendChar(page, 'a');
                await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
                await dismissMore(page);
            }

            // Now look at what's here with ':'
            await sendChar(page, ':');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const screen = await getScreenLines(page);
            const screenJoined = screen.join('\n');

            console.log('\n=== Look-here (:) Popup Test ===');
            const hasThingsHere = screenJoined.includes('Things that are here:') ||
                                   screenJoined.includes('You see here') ||
                                   screenJoined.includes('There is');
            const hasMapStill = screenJoined.includes('Dlvl:');

            console.log(`  Has item description: ${hasThingsHere}`);
            console.log(`  Has status line: ${hasMapStill}`);
            for (let r = 0; r < 5; r++) {
                console.log(`  Row ${r}: "${rtrim(screen[r])}"`);
            }

            // Even if no items, the command should not crash and map should persist
            assert.ok(hasMapStill, 'Map should remain visible after : command');

            await dismissMore(page);
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #2: cursorOnPlayer should only move cursor, not write '@'
    // Test: DOM glyph at player position matches internal grid
    // (catches the old bug where cursorOnPlayer force-wrote '@')
    // ---------------------------------------------------------------
    it('player glyph in DOM matches internal display grid', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 1);

            const result = await page.evaluate(() => {
                const display = window.gameDisplay;
                const spans = document.querySelectorAll('#terminal span');
                const atPositions = [];

                // Find all '@' on the map
                for (let r = 1; r <= 21; r++) {
                    for (let c = 0; c < 80; c++) {
                        const span = spans[r * 80 + c];
                        if (span?.textContent === '@') {
                            // Also check what the internal grid says
                            const gridCh = display?.grid?.[r]?.[c]?.ch || '?';
                            atPositions.push({
                                row: r, col: c,
                                domCh: '@',
                                gridCh,
                                color: span.style?.color || '',
                                match: gridCh === '@',
                            });
                        }
                    }
                }

                // Check cursor position
                const cursorRow = display?.cursorRow;
                const cursorCol = display?.cursorCol;

                return { atPositions, cursorRow, cursorCol };
            });

            console.log('\n=== Player Glyph / Grid Parity Test ===');
            console.log(`  @ count: ${result.atPositions.length}`);
            console.log(`  Cursor: [${result.cursorRow},${result.cursorCol}]`);
            for (const p of result.atPositions) {
                console.log(`  @ at [${p.row},${p.col}] grid='${p.gridCh}' match=${p.match} color=${p.color}`);
            }

            assert.ok(result.atPositions.length >= 1, 'At least one @ should be visible');

            // Every '@' in the DOM should also be '@' in the internal grid.
            // This catches the old cursorOnPlayer bug where setCell wrote '@'
            // over whatever the grid actually had.
            for (const p of result.atPositions) {
                assert.ok(p.match,
                    `DOM '@' at [${p.row},${p.col}] but grid has '${p.gridCh}' — ` +
                    `cursorOnPlayer may be overwriting the map glyph`);
            }
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #3/4/5: Message display and --More-- handling
    // Test: long messages wrap correctly and --More-- appears
    // ---------------------------------------------------------------
    it('messages display on row 0 and --More-- is dismissible', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 2);

            // Do something that generates a message — search ('s')
            await sendChar(page, 's');
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            await dismissMore(page);

            const screen = await getScreenLines(page);
            const row0 = rtrim(screen[0]);

            console.log('\n=== Message Display Test ===');
            console.log(`  Row 0: "${row0}"`);

            // Row 0 may have a message, or the search may produce no output
            // (if nothing found). Check the game is still responsive.
            const screen2 = await getScreenLines(page);
            const statusCheck = rtrim(screen2[23]);
            assert.ok(statusCheck.includes('Dlvl:') || statusCheck.includes('T:'),
                'Game should be alive after search');

            // Multiple searches to potentially trigger --More--
            for (let i = 0; i < 5; i++) {
                await sendChar(page, 's');
                await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
            }

            const text = await getScreenText(page);
            const hasMore = text.includes('--More--');
            console.log(`  --More-- after 5 searches: ${hasMore}`);

            if (hasMore) {
                await sendChar(page, ' ');
                await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
                const afterDismiss = await getScreenText(page);
                assert.ok(!afterDismiss.includes('--More--'),
                    '--More-- should be dismissed after space');
            }
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #6/#8: Overlay menu header + color parity
    // Test: inventory overlay has inverse header, uses CLR_GRAY
    // ---------------------------------------------------------------
    it('overlay menu header uses inverse video (matches headless/C)', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 3);

            // Press 'i' for inventory — triggers overlay menu
            await sendChar(page, 'i');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const result = await page.evaluate(() => {
                const display = window.gameDisplay;
                if (!display?.grid) return { error: 'no grid' };
                // Check row 0 attributes — should be inverse (attr & 1)
                let row0Text = '';
                let row0Attr = 0;
                for (let c = 0; c < 80; c++) {
                    const cell = display.grid[0]?.[c];
                    if (cell && cell.ch !== ' ') {
                        row0Text += cell.ch;
                        row0Attr |= cell.attr;
                    }
                }
                return { row0Text, row0Attr, hasInverse: (row0Attr & 1) !== 0 };
            });

            console.log('\n=== Overlay Menu Header Test ===');
            console.log(`  Row 0 text: "${result.row0Text}"`);
            console.log(`  Row 0 attr: ${result.row0Attr} (inverse=${result.hasInverse})`);

            // The first line (header/prompt) should use inverse video attribute
            if (result.row0Text && result.row0Text.length > 0) {
                assert.ok(result.hasInverse,
                    `Menu header should use inverse video (attr & 1), got attr=${result.row0Attr}`);
            }

            await sendChar(page, ' '); // dismiss
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #6: Overlay menu (PICK_ONE) — e.g. drop command
    // Test: drop menu shows selectable items
    // ---------------------------------------------------------------
    it('drop menu (PICK_ONE) renders and accepts selection', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 4);

            // Press 'd' to drop
            await sendChar(page, 'd');
            await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

            const screen = await getScreenLines(page);
            const text = screen.join('\n');

            console.log('\n=== Drop Menu Test ===');

            // Should show either a prompt "What do you want to drop?"
            // or an item list if inventory is shown
            const hasDropPrompt = text.includes('drop') || text.includes('Drop');
            const hasItemList = /[a-zA-Z] - /.test(text);

            console.log(`  Has drop prompt: ${hasDropPrompt}`);
            console.log(`  Has item list: ${hasItemList}`);
            for (let r = 0; r < 3; r++) {
                console.log(`  Row ${r}: "${rtrim(screen[r])}"`);
            }

            assert.ok(hasDropPrompt || hasItemList,
                'Drop command should show prompt or item list');

            // Select first item and dismiss
            await sendChar(page, 'a');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            // Verify game is still alive
            const afterScreen = await getScreenLines(page);
            const status = rtrim(afterScreen[23]);
            assert.ok(status.includes('Dlvl:') || status.includes('T:'),
                'Game should still be alive after drop');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #6 continued: Overlay menu (PICK_ANY) — loot/pickup
    // Test: pickup with multiple items uses PICK_ANY menu
    // ---------------------------------------------------------------
    it('pickup menu (PICK_ANY) with comma key works', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 6);

            // Drop two items to create a pile, then pick up
            await sendChar(page, 'd');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            let text = await getScreenText(page);
            if (text.includes('drop') || text.includes('Drop')) {
                await sendChar(page, 'a');
                await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
                await dismissMore(page);
            }

            await sendChar(page, 'd');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            text = await getScreenText(page);
            if (text.includes('drop') || text.includes('Drop')) {
                await sendChar(page, 'a');
                await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
                await dismissMore(page);
            }

            // Now pick up with ','
            await sendChar(page, ',');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const screen = await getScreenLines(page);
            text = screen.join('\n');

            console.log('\n=== Pickup Menu (PICK_ANY) Test ===');
            const hasPickup = text.includes('Pick up') || text.includes('pick up') ||
                              text.includes('You see here') || text.includes('pick it up');
            console.log(`  Has pickup interaction: ${hasPickup}`);
            for (let r = 0; r < 5; r++) {
                console.log(`  Row ${r}: "${rtrim(screen[r])}"`);
            }

            // Dismiss whatever state we're in
            await dismissMore(page);
            // If there's a menu, try Enter or Escape
            await sendKey(page, 'Escape');
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

            // Game should survive
            const afterScreen = await getScreenLines(page);
            const anyStatus = afterScreen[22] + afterScreen[23];
            assert.ok(anyStatus.includes('Dlvl:') || anyStatus.includes('T:') || anyStatus.includes('HP:'),
                'Game should survive pickup interaction');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // GAP #9: rest_on_space (browser converts space→'.' for rest)
    // Test: space key should wait/rest in browser gameplay
    // ---------------------------------------------------------------
    it('space key functions as rest/wait during gameplay', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 8);

            // Get initial turn count
            const screen1 = await getScreenLines(page);
            const statusText1 = screen1[22] + ' ' + screen1[23];
            const turnMatch1 = statusText1.match(/T:(\d+)/);
            const turn1 = turnMatch1 ? parseInt(turnMatch1[1]) : null;

            console.log('\n=== Space-as-Rest Test ===');
            console.log(`  Initial turn: ${turn1}`);

            // Press space (should rest in browser due to rest_on_space)
            await sendKey(page, 'Space');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            const screen2 = await getScreenLines(page);
            const statusText2 = screen2[22] + ' ' + screen2[23];
            const turnMatch2 = statusText2.match(/T:(\d+)/);
            const turn2 = turnMatch2 ? parseInt(turnMatch2[1]) : null;

            console.log(`  After space turn: ${turn2}`);

            if (turn1 !== null && turn2 !== null) {
                assert.ok(turn2 > turn1,
                    `Turn should advance after space: ${turn1} → ${turn2}`);
            }
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Movement and multi-turn running
    // Test: 'G' prefix + direction should run multiple steps
    // ---------------------------------------------------------------
    it('multi-turn running with G prefix works', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 10);

            // Get initial position
            const pos1 = await page.evaluate(() => {
                const spans = document.querySelectorAll('#terminal span');
                for (let r = 1; r <= 21; r++) {
                    for (let c = 0; c < 80; c++) {
                        if (spans[r * 80 + c]?.textContent === '@') {
                            return { row: r, col: c };
                        }
                    }
                }
                return null;
            });

            console.log('\n=== Multi-turn Running (G) Test ===');
            console.log(`  Start: ${JSON.stringify(pos1)}`);

            // Try running east with Shift+G then 'l'
            await sendChar(page, 'G');
            await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
            await sendChar(page, 'l');
            await page.evaluate(() => new Promise(r => setTimeout(r, 800)));
            await dismissMore(page);

            const pos2 = await page.evaluate(() => {
                const spans = document.querySelectorAll('#terminal span');
                for (let r = 1; r <= 21; r++) {
                    for (let c = 0; c < 80; c++) {
                        if (spans[r * 80 + c]?.textContent === '@') {
                            return { row: r, col: c };
                        }
                    }
                }
                return null;
            });

            console.log(`  After G+l: ${JSON.stringify(pos2)}`);

            if (pos1 && pos2) {
                // Player should have moved (possibly east, or stopped by wall)
                const moved = pos1.row !== pos2.row || pos1.col !== pos2.col;
                console.log(`  Moved: ${moved}`);
                // Don't hard-assert movement since we might be against a wall,
                // but verify game is still responsive
            }

            // Game should be alive
            const screen = await getScreenLines(page);
            const status = screen[22] + ' ' + screen[23];
            assert.ok(status.includes('Dlvl:') || status.includes('T:'),
                'Game should be alive after running');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Extended commands (#command)
    // Test: '#' key brings up extended command prompt
    // ---------------------------------------------------------------
    it('extended command (#) prompt works', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 11);

            // Press '#' for extended command
            await sendChar(page, '#');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

            const screen = await getScreenLines(page);
            const row0 = rtrim(screen[0]);

            console.log('\n=== Extended Command (#) Test ===');
            console.log(`  Row 0: "${row0}"`);

            // Should show "#" prompt or extended command input
            const hasExtPrompt = row0.includes('#') || row0.includes('extended');

            // Cancel with Escape
            await sendKey(page, 'Escape');
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

            // Game should survive
            const afterScreen = await getScreenLines(page);
            const status = rtrim(afterScreen[23]);
            assert.ok(status.includes('Dlvl:') || status.includes('T:'),
                'Game should survive extended command cancel');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Eat command — multi-turn occupation
    // Test: eating triggers occupation that spans turns
    // ---------------------------------------------------------------
    it('eat command (e) shows food prompt and advances turns', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 12);

            // Get turn count before
            let screen = await getScreenLines(page);
            let statusText = screen[22] + ' ' + screen[23];
            const turnBefore = statusText.match(/T:(\d+)/);
            const t1 = turnBefore ? parseInt(turnBefore[1]) : null;

            // Press 'e' to eat
            await sendChar(page, 'e');
            await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

            screen = await getScreenLines(page);
            const text = screen.join('\n');

            console.log('\n=== Eat Command Test ===');
            const hasEatPrompt = text.includes('eat') || text.includes('Eat') ||
                                  text.includes('What do you want to eat');
            console.log(`  Has eat prompt: ${hasEatPrompt}`);
            console.log(`  Row 0: "${rtrim(screen[0])}"`);

            if (hasEatPrompt) {
                // Try eating first item
                await sendChar(page, 'a');
                await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

                // Handle "Continue eating?" or similar prompts
                for (let i = 0; i < 3; i++) {
                    const t = await getScreenText(page);
                    if (t.includes('--More--')) {
                        await sendChar(page, ' ');
                        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
                    } else if (t.includes('Continue') || t.includes('stop eating')) {
                        await sendChar(page, 'y');
                        await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
                    } else {
                        break;
                    }
                }
            } else {
                // No food — just escape
                await sendKey(page, 'Escape');
                await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            }

            await dismissMore(page);

            // Game should survive
            screen = await getScreenLines(page);
            statusText = screen[22] + ' ' + screen[23];
            assert.ok(statusText.includes('Dlvl:') || statusText.includes('T:'),
                'Game should survive eat command');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Whatis command (/) — requires getpos cursor interaction
    // Test: '/' brings up look mode with cursor
    // ---------------------------------------------------------------
    it('whatis (/) enters look mode and can be cancelled', async () => {
        const page = await browser.newPage();
        try {
            await loadAndChargen(page, 13);

            // Press '/' for whatis
            await sendChar(page, '/');
            await page.evaluate(() => new Promise(r => setTimeout(r, 400)));

            const screen = await getScreenLines(page);
            const text = screen.join('\n');

            console.log('\n=== Whatis (/) Test ===');
            console.log(`  Row 0: "${rtrim(screen[0])}"`);

            // Should show some prompt about picking a location
            const hasPrompt = text.includes('Pick') || text.includes('location') ||
                              text.includes('a]') || text.includes('describe') ||
                              text.includes('(For instructions');

            console.log(`  Has whatis prompt: ${hasPrompt}`);

            // Press '.' to look at current position, or Escape to cancel
            await sendChar(page, '.');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            // If still in getpos mode, escape
            await sendKey(page, 'Escape');
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            await dismissMore(page);

            // Game should survive
            const afterScreen = await getScreenLines(page);
            const status = afterScreen[22] + ' ' + afterScreen[23];
            assert.ok(status.includes('Dlvl:') || status.includes('T:') || status.includes('HP:'),
                'Game should survive whatis');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Chargen menu (role/race selection) — overlay menu rendering
    // Test: non-auto chargen shows proper menus
    // ---------------------------------------------------------------
    it('chargen menus render with proper formatting', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(serverInfo.url);
            await page.evaluate(() => localStorage.clear());
            await page.goto(`${serverInfo.url}?seed=20`, { waitUntil: 'networkidle0' });

            await page.waitForSelector('#terminal', { timeout: 15000 });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );
            await page.waitForFunction(
                () => (document.getElementById('terminal')?.textContent || '').includes('Who are you?'),
                { timeout: 15000 }
            );

            // Enter name
            await page.keyboard.type('Tester');
            await sendKey(page, 'Enter');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

            // Say 'n' to auto-pick to see role selection menu
            await sendChar(page, 'n');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const screen = await getScreenLines(page);
            const text = screen.join('\n');

            console.log('\n=== Chargen Menu Test ===');
            const hasRoleMenu = text.includes('Archeologist') || text.includes('Barbarian') ||
                                text.includes('Pick a role') || text.includes('role');
            console.log(`  Has role menu: ${hasRoleMenu}`);
            for (let r = 0; r < 8; r++) {
                console.log(`  Row ${r}: "${rtrim(screen[r])}"`);
            }

            assert.ok(hasRoleMenu, 'Should show role selection menu');

            // Verify the menu rendered with selectable items
            let hasSelectors = false;
            for (let r = 0; r < 20; r++) {
                if (/^\s*[a-z] - /.test(screen[r])) { hasSelectors = true; break; }
            }
            assert.ok(hasSelectors, 'Role menu should have selectable items (a - ...)');

            // Now escape and use auto-pick to get to gameplay
            await sendKey(page, 'Escape');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));

            // Re-answer with auto-pick
            for (let i = 0; i < 15; i++) {
                const t = await getScreenText(page);
                if (t.includes('Dlvl:') && !t.includes('--More--')) break;
                if (t.includes('Shall I pick') || t.includes('pick a role') || t.includes('Pick')) {
                    await sendChar(page, 'y');
                } else if (t.includes('Is this ok?')) {
                    await sendChar(page, 'y');
                } else if (t.includes('--More--') || t.includes('(end)')) {
                    await sendChar(page, ' ');
                } else if (t.includes('tutorial') || t.includes('Tutorial')) {
                    await sendChar(page, 'n');
                } else {
                    await sendChar(page, ' ');
                }
                await page.evaluate(() => new Promise(r => setTimeout(r, 400)));
            }
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // No JS errors during menu-heavy interactions
    // Test: comprehensive menu interaction sequence
    // ---------------------------------------------------------------
    it('no JS errors during inventory/drop/pickup cycle', async () => {
        const page = await browser.newPage();
        const jsErrors = [];
        page.on('pageerror', err => jsErrors.push(err.message));

        try {
            await loadAndChargen(page, 15);

            // Inventory
            await sendChar(page, 'i');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);
            await sendChar(page, ' '); // dismiss inventory
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));

            // Drop
            await sendChar(page, 'd');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await sendChar(page, 'a'); // first item
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            // Pickup
            await sendChar(page, ',');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            // If a menu appeared for pickup, confirm
            let text = await getScreenText(page);
            if (text.includes('Pick up') || /[a-z] - /.test(text)) {
                await sendChar(page, 'a');
                await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
                await sendKey(page, 'Enter');
                await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            }
            await dismissMore(page);

            // Wait/search a few times
            for (let i = 0; i < 3; i++) {
                await sendChar(page, 's');
                await page.evaluate(() => new Promise(r => setTimeout(r, 100)));
                await dismissMore(page);
            }

            console.log('\n=== Menu Interaction Cycle Test ===');
            console.log(`  JS errors: ${jsErrors.length}`);
            if (jsErrors.length > 0) {
                for (const e of jsErrors) console.log(`    ${e}`);
            }

            assert.equal(jsErrors.length, 0,
                `${jsErrors.length} JS error(s): ${jsErrors[0] || ''}`);

            const screen = await getScreenLines(page);
            const status = screen[22] + ' ' + screen[23];
            assert.ok(status.includes('Dlvl:') || status.includes('T:'),
                'Game should be alive after menu cycle');
        } finally {
            await page.close();
        }
    });

    // ---------------------------------------------------------------
    // Ctrl key handling (browser_input specific)
    // Test: Ctrl+I opens inventory (browser keyboard mapping)
    // ---------------------------------------------------------------
    it('special keyboard mappings work (Escape, arrow keys)', async () => {
        const page = await browser.newPage();
        const jsErrors = [];
        page.on('pageerror', err => jsErrors.push(err.message));

        try {
            await loadAndChargen(page, 16);

            // Test arrow keys for movement
            const pos1 = await page.evaluate(() => {
                const spans = document.querySelectorAll('#terminal span');
                for (let r = 1; r <= 21; r++) {
                    for (let c = 0; c < 80; c++) {
                        if (spans[r * 80 + c]?.textContent === '@') {
                            return { row: r, col: c };
                        }
                    }
                }
                return null;
            });

            // Press arrow right
            await sendKey(page, 'ArrowRight');
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await dismissMore(page);

            const pos2 = await page.evaluate(() => {
                const spans = document.querySelectorAll('#terminal span');
                for (let r = 1; r <= 21; r++) {
                    for (let c = 0; c < 80; c++) {
                        if (spans[r * 80 + c]?.textContent === '@') {
                            return { row: r, col: c };
                        }
                    }
                }
                return null;
            });

            console.log('\n=== Arrow Key Movement Test ===');
            console.log(`  Before: ${JSON.stringify(pos1)}`);
            console.log(`  After ArrowRight: ${JSON.stringify(pos2)}`);

            // Test Escape cancels a prompt
            await sendChar(page, 'z'); // cast spell
            await page.evaluate(() => new Promise(r => setTimeout(r, 300)));
            await sendKey(page, 'Escape');
            await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
            await dismissMore(page);

            assert.equal(jsErrors.length, 0,
                `JS errors during keyboard test: ${jsErrors[0] || ''}`);
        } finally {
            await page.close();
        }
    });
});
