// test/unit/keylog_display_parity.test.js
// Replays browser keylogs headlessly using the exact browser init path
// (no character preset — chargen keys consumed from input queue) and asserts
// that the screen state at each nhgetch call is clean: no menu overlap,
// no stale text from previous menus, etc.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHeadlessInput, HeadlessDisplay } from '../../js/headless.js';
import { NetHackGame } from '../../js/allmain.js';

/**
 * Replay a keylog using the browser init path (no character preset).
 * Returns an array of screen snapshots, one per nhgetch() call.
 * Each snapshot: { index, keyReturned, lines: string[24] }
 */
async function replayKeylog(seed, keys, initFlags = {}) {
    const input = createHeadlessInput({ throwOnEmpty: true });
    const display = new HeadlessDisplay();
    const game = new NetHackGame({ display, input });

    const snapshots = [];
    let keyReadCount = 0;

    const origNhgetch = input.nhgetch.bind(input);
    input.nhgetch = async function () {
        // Capture screen before returning key
        const lines = [];
        const rows = display.rows || 24;
        const cols = display.cols || 80;
        for (let r = 0; r < rows; r++) {
            let line = '';
            for (let c = 0; c < cols; c++) {
                line += display.grid?.[r]?.[c] || ' ';
            }
            lines.push(line);
        }

        const ch = await origNhgetch();
        keyReadCount++;
        snapshots.push({ index: keyReadCount, keyReturned: ch, lines });
        return ch;
    };

    // Pre-queue all keys
    for (const code of keys) {
        input.pushInput(code);
    }

    await game.init({
        seed,
        wizard: false,
        flags: initFlags,
    });

    // Run game loop until keys exhausted (throwOnEmpty will throw)
    try {
        while (!game.gameOver) {
            await game._gameLoopStep();
        }
    } catch (e) {
        if (!e.message?.includes('Input queue empty') && !e.message?.includes('pending')) {
            throw e;
        }
        // Expected: input exhausted
    }

    // Capture final screen state (after all commands processed)
    const finalLines = [];
    const fRows = display.rows || 24;
    const fCols = display.cols || 80;
    for (let r = 0; r < fRows; r++) {
        let line = '';
        for (let c = 0; c < fCols; c++) {
            line += display.grid?.[r]?.[c] || ' ';
        }
        finalLines.push(line);
    }

    return { snapshots, game, finalLines };
}

/**
 * Assert that rows in a given range contain no "mixed" menus —
 * i.e., text from two different menus shouldn't overlap on the same rows.
 * Checks that non-blank content in rows startRow..endRow all starts at
 * approximately the same column (within tolerance).
 */
function assertCleanMenuRows(lines, startRow, endRow, description) {
    const contentCols = [];
    for (let r = startRow; r <= endRow; r++) {
        const line = lines[r];
        const trimmed = line.trimStart();
        if (trimmed.trim().length === 0) continue;
        const firstContentCol = line.length - trimmed.length;
        contentCols.push({ row: r, col: firstContentCol, text: trimmed.trimEnd() });
    }
    if (contentCols.length <= 1) return; // 0 or 1 content rows = no overlap possible

    // Check that all content starts at similar columns (within one menu's padding).
    // Two overlapping menus would have very different start columns.
    const cols = contentCols.map(c => c.col);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    // Allow some tolerance for sub-menus (e.g., indented "(ignored unless...)")
    // but flag large gaps that suggest two separate menus overlapping
    const tolerance = 20; // generous — same menu items vary by ~4 chars of indent
    if (maxCol - minCol > tolerance) {
        const details = contentCols.map(c =>
            `  row ${c.row} col ${c.col}: "${c.text}"`
        ).join('\n');
        assert.fail(
            `${description}: menu content spans columns ${minCol}-${maxCol} ` +
            `(tolerance ${tolerance}), suggesting overlapping menus:\n${details}`
        );
    }
}

describe('Keylog display parity: container loot', () => {
    // This keylog was recorded in the browser: seed 955505340, name "David".
    // It walks to a chest and loots it via #loot → o (take out) → a (all types) → * (select all).
    // The bug was that the "Take out what?" item menu was drawn over the
    // "Take out what type?" class menu without clearing it first.
    const SEED = 955505340;
    const KEYS = [121, 121, 32, 32, 110, 106, 106, 98, 98, 98, 104, 104, 104,
        44, 121, 121, 104, 35, 108, 13, 111, 97, 13, 42, 13];

    it('init consumes exactly 5 chargen/tutorial keys', async () => {
        const { snapshots } = await replayKeylog(SEED, KEYS, { name: 'David', time: true });
        // First 5 keys: y(pick), y(confirm), SPC(lore), SPC(welcome), n(tutorial)
        // Key 6 should be the first gameplay key (j = move south)
        const key6 = snapshots[5]; // 0-indexed: snapshot[5] = nhgetch #6
        assert.equal(key6.keyReturned, 106, 'Key 6 should be j (106) — first gameplay key');
    });

    it('container action menu shows cleanly', async () => {
        const { snapshots } = await replayKeylog(SEED, KEYS, { name: 'David', time: true });
        // nhgetch #21 is where the container menu is shown (before 'o' key)
        const menuSnap = snapshots[20]; // 0-indexed
        assert.equal(menuSnap.keyReturned, 111, 'Should be o (111) at container menu');
        const lines = menuSnap.lines;
        // Check the menu is present
        const hasDoWhat = lines.some(l => l.includes('Do what with the chest?'));
        assert.ok(hasDoWhat, 'Container menu should show "Do what with the chest?"');
        const hasTakeOut = lines.some(l => l.includes('o - take something out'));
        assert.ok(hasTakeOut, 'Container menu should show "o - take something out"');
    });

    it('item selection menu has no remnants from class selection menu', async () => {
        const { snapshots } = await replayKeylog(SEED, KEYS, { name: 'David', time: true });
        // nhgetch #24 is where the item menu is shown (before '*' key)
        const itemMenuSnap = snapshots[23]; // 0-indexed
        assert.equal(itemMenuSnap.keyReturned, 42, 'Should be * (42) at item menu');
        const lines = itemMenuSnap.lines;

        // The item menu should show "Take out what?" but NOT "Auto-select" or
        // "All types" from the class menu
        const hasTakeOutWhat = lines.some(l => l.includes('Take out what?'));
        assert.ok(hasTakeOutWhat, 'Item menu should show "Take out what?"');

        // These should NOT appear — they're from the class selection menu
        const hasAutoSelect = lines.some(l => l.includes('Auto-select'));
        assert.ok(!hasAutoSelect,
            'Item menu should not have remnants of class menu "Auto-select"');
        const hasAllTypes = lines.some(l => l.includes('All types'));
        assert.ok(!hasAllTypes,
            'Item menu should not have remnants of class menu "All types"');
        const hasGems = lines.some(l => l.includes('Gems/Stones'));
        // "Gems/Stones" as a class menu option should be cleared; it may appear
        // as an item category header only if gems are in the container
        const hasGemsAsMenuItem = lines.some(l => /^.*[a-z] [-+] Gems/.test(l));
        assert.ok(!hasGemsAsMenuItem,
            'Item menu should not show class menu "Gems/Stones" as a selectable option');

        // Verify clean menu layout in rows 0-11
        assertCleanMenuRows(lines, 0, 11, 'Item selection menu');
    });

    it('screen is clean after looting completes', async () => {
        const { finalLines: lines } = await replayKeylog(SEED, KEYS, { name: 'David', time: true });

        // No menu remnants should be visible
        const hasMenuText = lines.some(l =>
            l.includes('Take out') || l.includes('Auto-select') ||
            l.includes('(end)') || l.includes('Do what with'));
        assert.ok(!hasMenuText, 'Final screen should have no menu remnants');

        // Status line should be visible
        const hasStatus = lines.some(l => l.includes('Dlvl:'));
        assert.ok(hasStatus, 'Status line should be visible after looting');
    });
});
