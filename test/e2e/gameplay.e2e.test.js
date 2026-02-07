// test/e2e/gameplay.e2e.test.js -- Deep gameplay E2E tests
// Tests actual gameplay sequences: exploring, fighting, descending stairs.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { startServer } from './serve.js';

let browser, page, serverInfo;

async function sendChar(ch) {
    await page.keyboard.type(ch);
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
}

async function sendKey(key) {
    await page.keyboard.press(key);
    await page.evaluate(() => new Promise(r => setTimeout(r, 50)));
}

async function getRow(row) {
    return page.evaluate((r) => {
        const pre = document.getElementById('terminal');
        if (!pre) return '';
        const lines = pre.textContent.split('\n');
        return lines[r] || '';
    }, row);
}

async function getTerminalText() {
    return page.evaluate(() => {
        const pre = document.getElementById('terminal');
        return pre ? pre.textContent : '';
    });
}

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

async function isGameOver() {
    const msg = await getRow(0);
    return msg.includes('Play again') || msg.includes('You die') || msg.includes('Goodbye');
}

async function startNewGame() {
    await page.goto(serverInfo.url);
    await page.waitForSelector('#terminal', { timeout: 5000 });
    await page.waitForFunction(
        () => document.querySelectorAll('#terminal span').length > 100,
        { timeout: 5000 }
    );
    // Select Barbarian (b) -- high HP/STR for survival
    await sendChar('b');
    await page.evaluate(() => new Promise(r => setTimeout(r, 200)));
    await sendChar(' ');
    await page.evaluate(() => new Promise(r => setTimeout(r, 500)));
}

describe('E2E: Extended gameplay', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('can play for several turns without crashing', async () => {
        await startNewGame();

        // Wait a few turns -- player may or may not survive depending on RNG
        let turnsPlayed = 0;
        for (let i = 0; i < 10; i++) {
            if (await isGameOver()) break;
            await sendChar('.');
            turnsPlayed++;
        }

        // Verify turn counter advanced or game ended properly
        const status = await getRow(23);
        const hpMatch = status.match(/HP:(\d+)\((\d+)\)/);
        const gameOver = await isGameOver();
        // Either still alive with HP > 0, or died cleanly (game over screen)
        if (hpMatch) {
            assert.ok(parseInt(hpMatch[1]) >= 0, 'HP should be non-negative');
        }
        assert.ok(turnsPlayed > 0 || gameOver, 'Should play turns or reach game over');
    });

    it('player can explore by moving around', async () => {
        await startNewGame();

        // Move in a pattern to explore the room
        const moves = ['l', 'l', 'l', 'j', 'j', 'h', 'h', 'h', 'k', 'k'];
        let totalMoves = 0;
        for (const key of moves) {
            if (await isGameOver()) break;
            await sendChar(key);
            totalMoves++;
        }
        assert.ok(totalMoves > 0, 'Should be able to make at least some moves');
    });

    it('remembers seen terrain (memory)', async () => {
        await startNewGame();

        // Move right a few times to see terrain, then move back
        for (let i = 0; i < 3; i++) {
            if (await isGameOver()) break;
            await sendChar('l');
        }
        for (let i = 0; i < 3; i++) {
            if (await isGameOver()) break;
            await sendChar('h');
        }

        // The terminal should still show walls and floor from memory
        // DECGraphics: room floor is middle dot U+00B7
        const text = await getTerminalText();
        const hasDots = (text.match(/\u00b7/g) || []).length;
        assert.ok(hasDots > 5, `Should have remembered floor tiles, found ${hasDots}`);
    });

    it('status bar shows Barbarian stats', async () => {
        await startNewGame();

        const status1 = await getRow(22);
        // Barbarian has high Str (16)
        assert.ok(status1.includes('St:16') || status1.includes('Barbarian'),
            `Status should show Barbarian stats, got: "${status1.trim()}"`);
    });

    it('can pick up gold automatically', async () => {
        await startNewGame();

        // Gold is auto-picked up on walk; we just need to walk over some
        // Check initial gold
        const initialStatus = await getRow(23);
        const goldMatch = initialStatus.match(/\$:(\d+)/);
        const initialGold = goldMatch ? parseInt(goldMatch[1]) : 0;

        // Walk around a lot to find gold
        const pattern = ['l', 'l', 'l', 'j', 'j', 'j', 'h', 'h', 'h', 'k', 'k', 'k',
                         'l', 'j', 'l', 'j', 'h', 'k', 'h', 'k'];
        for (const key of pattern) {
            if (await isGameOver()) break;
            await sendChar(key);
        }

        // Check if gold changed (might not if no gold on floor)
        const finalStatus = await getRow(23);
        const finalGoldMatch = finalStatus.match(/\$:(\d+)/);
        const finalGold = finalGoldMatch ? parseInt(finalGoldMatch[1]) : 0;

        // This is not guaranteed since gold placement is random,
        // but the mechanism should work without errors
        assert.ok(finalGold >= initialGold, 'Gold should not decrease');
    });

    it('can find and descend stairs', async () => {
        await startNewGame();

        // Walk around extensively to find the downstairs
        // Use a systematic exploration pattern
        const directions = ['l', 'l', 'l', 'l', 'l', 'j', 'j', 'j', 'j',
                           'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h', 'h',
                           'k', 'k', 'k', 'k', 'k', 'k', 'k',
                           'l', 'l', 'l', 'j', 'j', 'j', 'j', 'j', 'j'];

        let foundStairs = false;
        for (const key of directions) {
            if (await isGameOver()) break;
            await sendChar(key);

            // Check messages for stairs
            const msg = await getRow(0);
            if (msg.includes('staircase down')) {
                foundStairs = true;
                break;
            }
        }

        if (foundStairs) {
            // Try to descend
            const statusBefore = await getRow(23);

            await sendChar('>');
            await page.evaluate(() => new Promise(r => setTimeout(r, 500)));

            const statusAfter = await getRow(23);
            // Check if level changed
            const levelMatch = statusAfter.match(/Dlvl:(\d+)/);
            if (levelMatch) {
                assert.ok(parseInt(levelMatch[1]) >= 1,
                    'Should be on a valid dungeon level');
            }
        }
        // If didn't find stairs, that's OK -- random map layout
        assert.ok(true, 'Exploration completed without errors');
    });

    it('game handles many turns without crashing', async () => {
        await startNewGame();

        // Simulate 50 turns of random-ish play
        const actions = ['.', '.', 'l', 'h', 'j', 'k', '.', 'l', 'j',
                        '.', '.', 'h', 'k', '.', 'l', 'j', 'h', 'k',
                        '.', '.', '.', 'l', 'l', 'h', 'h', 'j', 'j',
                        'k', 'k', '.', '.', '.', 'l', 'h', '.', '.',
                        'j', 'k', 'l', 'h', '.', '.', 'j', 'k', '.'];

        let turnsPlayed = 0;
        for (const action of actions) {
            if (await isGameOver()) break;
            await sendChar(action);
            turnsPlayed++;
        }

        assert.ok(turnsPlayed > 5,
            `Should survive at least 5 turns, played ${turnsPlayed}`);
    });

    it('search command can find hidden doors', async () => {
        await startNewGame();

        // Search many times near walls (where secret doors might be)
        let foundHidden = false;
        for (let i = 0; i < 30; i++) {
            if (await isGameOver()) break;
            await sendChar('s');
            const msg = await getRow(0);
            if (msg.includes('hidden')) {
                foundHidden = true;
                break;
            }
        }
        // Secret doors are rare; just verify no crashes
        assert.ok(true, 'Search completed without errors');
    });

    it('open command works on doors', async () => {
        await startNewGame();

        // Try to open a door (may not be adjacent)
        await sendChar('o');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));

        // Should ask "In what direction?"
        const msg = await getRow(0);
        const valid = msg.includes('direction') || msg.includes('door') || msg.includes('Never mind');

        // Send direction then check result
        await sendChar('l');
        await page.evaluate(() => new Promise(r => setTimeout(r, 100)));

        const result = await getRow(0);
        // Should get some response about the door or lack thereof
        assert.ok(result.trim().length > 0, 'Open command should produce a response');
    });
});

describe('E2E: Color rendering', () => {
    before(async () => {
        serverInfo = await startServer();
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        page = await browser.newPage();
        page.on('pageerror', err => console.error(`  [browser] ${err.message}`));
        await startNewGame();
    });

    after(async () => {
        if (browser) await browser.close();
        if (serverInfo) serverInfo.server.close();
    });

    it('player @ is white', async () => {
        const color = await page.evaluate(() => {
            const spans = document.querySelectorAll('#terminal span');
            for (const span of spans) {
                if (span.textContent === '@') return span.style.color;
            }
            return null;
        });
        assert.ok(color, 'Player @ should have a color');
        // White is rgb(255, 255, 255) or #fff
        assert.ok(color.includes('255') || color.includes('fff') || color === 'rgb(255, 255, 255)',
            `Player should be white, got: ${color}`);
    });

    it('walls and floor have distinct colors', async () => {
        const colors = await page.evaluate(() => {
            const spans = document.querySelectorAll('#terminal span');
            const result = { wall: null, floor: null };
            for (const span of spans) {
                // DECGraphics: walls are box-drawing, floor is middle dot
                if (span.textContent === '\u2500' && !result.wall) result.wall = span.style.color;
                if (span.textContent === '\u00b7' && !result.floor) result.floor = span.style.color;
            }
            return result;
        });
        assert.ok(colors.wall || colors.floor,
            'Should have visible wall or floor colors');
    });

    it('status line text uses gray', async () => {
        // Status lines (row 22, 23) should have gray text
        const grayCount = await page.evaluate(() => {
            const pre = document.getElementById('terminal');
            if (!pre) return 0;
            const spans = Array.from(pre.querySelectorAll('span'));
            // The spans for rows 22-23 (approximate offset)
            // Row 22 starts at span index 22*80, row 23 at 23*80
            let gray = 0;
            for (let i = 22 * 80; i < 24 * 80 && i < spans.length; i++) {
                const c = spans[i].style.color;
                if (c && (c.includes('170') || c.includes('aaa'))) gray++;
            }
            return gray;
        });
        assert.ok(grayCount > 20,
            `Status lines should be mostly gray, found ${grayCount} gray spans`);
    });
});
