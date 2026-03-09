// test/e2e/display_method_parity.e2e.test.js
// Runs the same Display method calls through both browser Display and
// HeadlessDisplay and compares the resulting grid output cell-by-cell.
// This catches behavioral divergences in shared methods without needing
// game RNG alignment.

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

// Extract grid state from browser Display
function getBrowserGrid(page, rows = 24, cols = 80) {
    return page.evaluate(({ rows, cols }) => {
        const display = window.gameDisplay;
        if (!display?.grid) return null;
        const grid = [];
        for (let r = 0; r < rows; r++) {
            let line = '';
            for (let c = 0; c < cols; c++) {
                line += display.grid[r]?.[c]?.ch || ' ';
            }
            grid.push(line.replace(/ +$/, ''));
        }
        return grid;
    }, { rows, cols });
}

// Extract grid colors from browser Display
function getBrowserColors(page, rows = 24, cols = 80) {
    return page.evaluate(({ rows, cols }) => {
        const display = window.gameDisplay;
        if (!display?.grid) return null;
        const colors = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push(display.grid[r]?.[c]?.color ?? -1);
            }
            colors.push(row);
        }
        return colors;
    }, { rows, cols });
}

// Extract grid attrs from browser Display
function getBrowserAttrs(page, rows = 24, cols = 80) {
    return page.evaluate(({ rows, cols }) => {
        const display = window.gameDisplay;
        if (!display?.grid) return null;
        const attrs = [];
        for (let r = 0; r < rows; r++) {
            const row = [];
            for (let c = 0; c < cols; c++) {
                row.push(display.grid[r]?.[c]?.attr ?? 0);
            }
            attrs.push(row);
        }
        return attrs;
    }, { rows, cols });
}

// Run a display method on the browser Display and return the grid
async function runOnBrowser(page, code) {
    return page.evaluate(code);
}

// HeadlessDisplay for comparison
let HeadlessDisplay;
async function getHeadlessDisplay() {
    if (!HeadlessDisplay) {
        const mod = await import('../../js/headless.js');
        HeadlessDisplay = mod.HeadlessDisplay;
    }
    return new HeadlessDisplay();
}

function rtrim(s) { return s.replace(/\s+$/, ''); }

describe('E2E: Display method parity (browser vs headless)', () => {

    // -------------------------------------------------------------------
    // putstr: same string at same position produces same grid
    // -------------------------------------------------------------------
    it('putstr produces identical grid output', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForSelector('#terminal', { timeout: 15000 });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            // Clear and write test strings on both implementations
            const browserGrid = await page.evaluate(() => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.putstr(0, 0, 'Hello, World!', 7);       // CLR_GRAY=7
                d.putstr(5, 3, 'Test at col 5, row 3', 7);
                d.putstr(70, 10, '1234567890', 7);         // wraps near edge
                const grid = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            });

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.putstr(0, 0, 'Hello, World!', 7);
            hd.putstr(5, 3, 'Test at col 5, row 3', 7);
            hd.putstr(70, 10, '1234567890', 7);
            const headlessGrid = hd.getScreenLines();

            console.log('\n=== putstr Parity ===');
            let diffs = 0;
            for (let r = 0; r < 24; r++) {
                const bLine = rtrim(browserGrid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    diffs++;
                    console.log(`  Row ${r} DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
            }
            console.log(`  Diffs: ${diffs}/24`);
            assert.equal(diffs, 0, `putstr grid diffs: ${diffs} rows differ`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderTextPopup: same lines produce same grid
    // -------------------------------------------------------------------
    it('renderTextPopup produces identical grid output', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            const testLines = [
                'Things that are here:',
                'a +0 long sword',
                'a food ration',
            ];

            const browserGrid = await page.evaluate((lines) => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.renderTextPopup(lines, { isTextWindow: false });
                const grid = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            }, testLines);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.renderTextPopup(testLines, { isTextWindow: false });
            const headlessGrid = hd.getScreenLines();

            console.log('\n=== renderTextPopup Parity ===');
            let diffs = 0;
            for (let r = 0; r < 24; r++) {
                const bLine = rtrim(browserGrid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    diffs++;
                    console.log(`  Row ${r} DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
            }
            console.log(`  Diffs: ${diffs}/24`);
            assert.equal(diffs, 0, `renderTextPopup grid diffs: ${diffs} rows differ`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderTextPopup with isTextWindow: same grid
    // -------------------------------------------------------------------
    it('renderTextPopup (NHW_TEXT) produces identical output', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            const testLines = [
                'Discoveries',
                '',
                'Potions',
                '  clear potion is water',
                '  ruby potion is potion of see invisible',
                '',
                'Scrolls',
                '  scroll labeled ZELGO MER is scroll of light',
            ];

            const browserGrid = await page.evaluate((lines) => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.renderTextPopup(lines, { isTextWindow: true });
                const grid = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            }, testLines);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.renderTextPopup(testLines, { isTextWindow: true });
            const headlessGrid = hd.getScreenLines();

            console.log('\n=== renderTextPopup NHW_TEXT Parity ===');
            let diffs = 0;
            for (let r = 0; r < 24; r++) {
                const bLine = rtrim(browserGrid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    diffs++;
                    console.log(`  Row ${r} DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
            }
            console.log(`  Diffs: ${diffs}/24`);
            assert.equal(diffs, 0, `renderTextPopup NHW_TEXT diffs: ${diffs} rows differ`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderOverlayMenu: same lines produce same grid content
    // -------------------------------------------------------------------
    it('renderOverlayMenu produces identical grid content', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            const menuLines = [
                'Pick up what?',
                ' Weapons',
                ' a - a +0 long sword',
                ' b - a +0 dagger',
                ' Armor',
                ' c - a +0 leather armor',
                '(end)',
            ];

            const browserResult = await page.evaluate((lines) => {
                const d = window.gameDisplay;
                d.clearScreen();
                const offx = d.renderOverlayMenu(lines);
                const grid = [];
                const attrs = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    const rowAttrs = [];
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                        rowAttrs.push(d.grid[r][c].attr);
                    }
                    grid.push(line.replace(/ +$/, ''));
                    attrs.push(rowAttrs);
                }
                return { grid, attrs, offx };
            }, menuLines);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            const headlessOffx = hd.renderOverlayMenu(menuLines);
            const headlessGrid = hd.getScreenLines();
            const headlessAttrs = hd.getAttrLines();

            console.log('\n=== renderOverlayMenu Parity ===');
            console.log(`  Browser offx: ${browserResult.offx}, Headless offx: ${headlessOffx}`);

            assert.equal(browserResult.offx, headlessOffx,
                `offx should match: browser=${browserResult.offx} headless=${headlessOffx}`);

            let charDiffs = 0;
            let attrDiffs = 0;
            for (let r = 0; r < Math.min(menuLines.length, 24); r++) {
                const bLine = rtrim(browserResult.grid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    charDiffs++;
                    console.log(`  Row ${r} CHAR DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
                // Check header attrs for first row
                if (r === 0) {
                    const bInverse = browserResult.attrs[0].some(a => (a & 1) !== 0);
                    // headlessAttrs[0] is a string like "00001110..." where '1' = inverse
                    const hInverse = headlessAttrs ? headlessAttrs[0].includes('1') : false;
                    if (bInverse !== hInverse) {
                        attrDiffs++;
                        console.log(`  Row 0 ATTR DIFF: browser inverse=${bInverse} headless inverse=${hInverse}`);
                    }
                }
            }
            console.log(`  Char diffs: ${charDiffs}, Attr diffs: ${attrDiffs}`);
            assert.equal(charDiffs, 0, `renderOverlayMenu char diffs: ${charDiffs}`);
            assert.equal(attrDiffs, 0, `renderOverlayMenu attr diffs: ${attrDiffs}`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderChargenMenu: same lines produce same grid
    // -------------------------------------------------------------------
    it('renderChargenMenu produces identical grid content', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            const chargenLines = [
                ' Pick a role or profession',
                '',
                ' <role> <race> <gender> <alignment>',
                '',
                ' a - an Archeologist',
                ' b - a Barbarian',
                ' c - a Caveman/Cavewoman',
                ' h - a Healer',
                ' k - a Knight',
                ' m - a Monk',
            ];

            const browserGrid = await page.evaluate((lines) => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.renderChargenMenu(lines, true);
                const grid = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            }, chargenLines);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.renderChargenMenu(chargenLines, true);
            const headlessGrid = hd.getScreenLines();

            console.log('\n=== renderChargenMenu Parity ===');
            let diffs = 0;
            for (let r = 0; r < 24; r++) {
                const bLine = rtrim(browserGrid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    diffs++;
                    console.log(`  Row ${r} DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
            }
            console.log(`  Diffs: ${diffs}/24`);
            assert.equal(diffs, 0, `renderChargenMenu grid diffs: ${diffs} rows differ`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // clearTextPopup: clears the same area in both
    // -------------------------------------------------------------------
    it('clearTextPopup restores grid correctly', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            const testLines = ['Things that are here:', 'a +0 long sword'];

            const browserGrid = await page.evaluate((lines) => {
                const d = window.gameDisplay;
                d.clearScreen();
                // Write some background content
                d.putstr(0, 0, 'Background text on row 0', 7);
                d.putstr(0, 1, 'Background text on row 1', 7);
                // Show and clear popup
                d.renderTextPopup(lines, { isTextWindow: false });
                d.clearTextPopup();
                const grid = [];
                for (let r = 0; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            }, testLines);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.putstr(0, 0, 'Background text on row 0', 7);
            hd.putstr(0, 1, 'Background text on row 1', 7);
            hd.renderTextPopup(testLines, { isTextWindow: false });
            hd.clearTextPopup();
            const headlessGrid = hd.getScreenLines();

            console.log('\n=== clearTextPopup Parity ===');
            let diffs = 0;
            for (let r = 0; r < 24; r++) {
                const bLine = rtrim(browserGrid[r] || '');
                const hLine = rtrim(headlessGrid[r] || '');
                if (bLine !== hLine) {
                    diffs++;
                    console.log(`  Row ${r} DIFF:`);
                    console.log(`    browser:  "${bLine}"`);
                    console.log(`    headless: "${hLine}"`);
                }
            }
            console.log(`  Diffs: ${diffs}/24`);
            assert.equal(diffs, 0, `clearTextPopup grid diffs: ${diffs} rows differ`);
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderMoreMarker: --More-- marker at same position and color
    // -------------------------------------------------------------------
    it('renderMoreMarker produces identical grid and color', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            // Set up a message on row 0 then render --More--
            const browserResult = await page.evaluate(() => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.topMessage = 'You see a door.';
                d.putstr(0, 0, 'You see a door.', 7);
                d.renderMoreMarker();
                const grid = [];
                const colors = [];
                for (let c = 0; c < 80; c++) {
                    grid.push(d.grid[0][c].ch);
                    colors.push(d.grid[0][c].color);
                }
                return { grid: grid.join('').replace(/ +$/, ''), colors };
            });

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.topMessage = 'You see a door.';
            hd.putstr(0, 0, 'You see a door.', 7);
            hd.renderMoreMarker();
            const headlessRow = hd.getScreenLines()[0];
            const headlessColors = [];
            for (let c = 0; c < 80; c++) {
                headlessColors.push(hd.colors[0][c]);
            }

            assert.equal(rtrim(browserResult.grid), rtrim(headlessRow),
                `--More-- row should match: browser="${rtrim(browserResult.grid)}" headless="${rtrim(headlessRow)}"`);

            // Check --More-- marker color (should be CLR_GRAY=7 in both, matching C)
            const moreStart = browserResult.grid.indexOf('--More--');
            if (moreStart >= 0) {
                const browserColor = browserResult.colors[moreStart];
                const headlessColor = headlessColors[moreStart];
                assert.equal(browserColor, headlessColor,
                    `--More-- color should match: browser=${browserColor} headless=${headlessColor} (CLR_GRAY=7)`);
                assert.equal(browserColor, 7,
                    `--More-- should be CLR_GRAY (7), got ${browserColor}`);
            }
        } finally {
            await page.close();
        }
    });

    // -------------------------------------------------------------------
    // renderStatus: same player object produces same status lines
    // -------------------------------------------------------------------
    it('renderStatus produces identical status lines', async () => {
        const page = await browser.newPage();
        try {
            await page.goto(`${serverInfo.url}?seed=99`, { waitUntil: 'networkidle0' });
            await page.waitForFunction(
                () => document.querySelectorAll('#terminal span').length >= 1920,
                { timeout: 15000 }
            );

            // Player object must match internal format:
            // attributes[]: A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5
            const testPlayer = {
                name: 'TestHero',
                roleIndex: 0,
                race: 0,
                gender: 0,
                uhp: 14,
                uhpmax: 16,
                uenergy: 5,
                uenmax: 8,
                uac: 7,
                x: 40,
                y: 10,
                ulevel: 1,
                uexp: 0,
                ugold: 42,
                depth: 1,
                dungeonName: 'The Dungeons of Doom',
                attributes: [14, 10, 11, 12, 13, 9],  // Str,Int,Wis,Dex,Con,Cha
                _screenStrength: '14',
                alignment: 'neutral',
                turncount: 150,
                hunger: '',
            };

            const browserStatus = await page.evaluate((player) => {
                const d = window.gameDisplay;
                d.clearScreen();
                d.renderStatus(player);
                const grid = [];
                for (let r = 22; r < 24; r++) {
                    let line = '';
                    for (let c = 0; c < 80; c++) {
                        line += d.grid[r][c].ch;
                    }
                    grid.push(line.replace(/ +$/, ''));
                }
                return grid;
            }, testPlayer);

            const hd = await getHeadlessDisplay();
            hd.clearScreen();
            hd.renderStatus(testPlayer);
            const fullGrid = hd.getScreenLines();
            const headlessStatus = [fullGrid[22], fullGrid[23]];

            console.log('\n=== renderStatus Parity ===');
            console.log(`  Browser S1: "${browserStatus[0]}"`);
            console.log(`  Headless S1: "${headlessStatus[0]}"`);
            console.log(`  Browser S2: "${browserStatus[1]}"`);
            console.log(`  Headless S2: "${headlessStatus[1]}"`);

            let diffs = 0;
            for (let i = 0; i < 2; i++) {
                if (rtrim(browserStatus[i] || '') !== rtrim(headlessStatus[i] || '')) {
                    diffs++;
                    console.log(`  Status line ${i + 1} DIFFERS`);
                }
            }
            assert.equal(diffs, 0, `renderStatus diffs: ${diffs} lines differ`);
        } finally {
            await page.close();
        }
    });
});
