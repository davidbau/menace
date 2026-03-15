#!/usr/bin/env node
// Export NetHack promo scenes as CP437-encoded ANSI .ans files.
// Usage: node scripts/export_ans.mjs

import { writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const home  = homedir();

// ── CP437 encoding ────────────────────────────────────────────────────────────
// Map Unicode code points → CP437 byte values for block/shade chars.
// Quarter-block chars (▘▝▖▗▞▟▛▜▙▚) are NOT in CP437; substituted with nearest.

const UNI_TO_CP437 = {
    0x0020: 0x20, // space
    // Shade blocks
    0x2591: 0xB0, // ░ light shade
    0x2592: 0xB1, // ▒ medium shade
    0x2593: 0xB2, // ▓ dark shade
    // Half/full blocks
    0x2588: 0xDB, // █ full block
    0x2584: 0xDC, // ▄ lower half
    0x258C: 0xDD, // ▌ left half
    0x2590: 0xDE, // ▐ right half
    0x2580: 0xDF, // ▀ upper half
    // Quarter-block substitutions (not in CP437 — use nearest half-block)
    0x2596: 0xDC, // ▖ lower-left  → ▄
    0x2597: 0xDC, // ▗ lower-right → ▄
    0x2598: 0xDF, // ▘ upper-left  → ▀
    0x259D: 0xDF, // ▝ upper-right → ▀
    0x259A: 0xB1, // ▚ diagonal    → ▒
    0x259E: 0xB1, // ▞ diagonal    → ▒
    0x2599: 0xDB, // ▙ → █
    0x259B: 0xDB, // ▛ → █
    0x259C: 0xDB, // ▜ → █
    0x259F: 0xDB, // ▟ → █
};

function charToCp437(ch) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) return cp; // ASCII passthrough
    const b = UNI_TO_CP437[cp];
    if (b !== undefined) return b;
    return 0x3F; // '?' fallback
}

// Build a CP437 Buffer from a string that may contain ANSI escapes + block chars.
// ANSI escape sequences are pure ASCII so they pass through charToCp437 fine.
function toBuf(str) {
    const bytes = [];
    for (const ch of str) {
        bytes.push(charToCp437(ch));
    }
    return Buffer.from(bytes);
}

// ── ANSI color helpers ────────────────────────────────────────────────────────
// CGA index → ANSI foreground escape (ASCII-safe)
function fg(idx) {
    if (idx < 0)   return '\x1b[0m';
    if (idx === 0) return '\x1b[30m';
    if (idx < 8)   return `\x1b[3${idx}m`;
    return `\x1b[9${idx - 8}m`;
}
const RESET = '\x1b[0m';

// ── Logo data ─────────────────────────────────────────────────────────────────
// Quarter-block chars will be substituted in CP437; they are preserved here for
// reference so the substitution table above keeps them legible.

const LETTERS = {
    N: ['█   █', '██▄ █', '█▝█▘█', '█ ▀██', '█   █'],
    E: ['█████', '█    ', '████ ', '█    ', '█████'],
    T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
    H: ['█   █', '█   █', '█████', '█   █', '█   █'],
    A: [' ▄█▄ ', '█   █', '█████', '█   █', '█   █'],
    C: [' ▄███', '█    ', '█    ', '█    ', ' ▀███'],
    K: ['█ ▄█ ', '██▘  ', '███  ', '██▖  ', '█ ▀█ '],
};

// ── Grid renderer ─────────────────────────────────────────────────────────────

function emptyGrid(rows, cols) {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ ch: ' ', color: -1 })));
}

function gridToAns(grid) {
    let out = '';
    for (const row of grid) {
        // Find last non-space cell so we don't pad to 80 cols (that causes
        // the editor to auto-wrap AND process \r\n, creating double blank rows).
        let lastContent = -1;
        for (let i = row.length - 1; i >= 0; i--) {
            if (row[i].ch !== ' ' || row[i].color >= 0) { lastContent = i; break; }
        }

        let curColor = -999;
        for (let i = 0; i <= lastContent; i++) {
            const cell = row[i];
            if (cell.color !== curColor) {
                out += cell.color < 0 ? RESET : fg(cell.color);
                curColor = cell.color;
            }
            out += cell.ch;
        }
        out += RESET + '\r\n';
    }
    return out;
}

// ── nethack.ans ───────────────────────────────────────────────────────────────

{
    const ROWS = 24, COLS = 80;
    const grid = emptyGrid(ROWS, COLS);

    const word = 'NETHACK';
    const lw = 5, gap = 2;
    const startCol = Math.floor((COLS - (word.length * lw + (word.length - 1) * gap)) / 2);
    for (let li = 0; li < word.length; li++) {
        const rows = LETTERS[word[li]];
        const colOff = startCol + li * (lw + gap);
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < lw; c++) {
                const ch = rows[r][c];
                if (ch !== ' ') grid[2 + r][colOff + c] = { ch, color: 11 };
            }
        }
    }

    writeFileSync(path.join(home, 'nethack.ans'), toBuf(gridToAns(grid)));
    console.log('Written: ~/nethack.ans');
}

// ── Parse art arrays from promo.js ───────────────────────────────────────────

const promoSrc = readFileSync(path.join(__dir, '../js/promo.js'), 'utf8');

const dragonMatch = promoSrc.match(/const DRAGON_ART = (\[[\s\S]*?\n\];)/);
const potionMatch  = promoSrc.match(/const POTION_ART = (\[[\s\S]*?\n\];)/);
if (!dragonMatch || !potionMatch) { console.error('art extract failed'); process.exit(1); }

let DRAGON_ART, POTION_ART;
eval(`DRAGON_ART = ${dragonMatch[1]}`);
eval(`POTION_ART = ${potionMatch[1]}`);

function renderScene(art, startRow, ROWS = 24, COLS = 80) {
    const grid = emptyGrid(ROWS, COLS);
    for (let r = 0; r < art.length; r++) {
        const [chars, colors] = art[r];
        const row = startRow + r;
        if (row >= ROWS) break;
        for (let c = 0; c < chars.length && c < COLS; c++) {
            const ci = colors[c];
            if (ci >= 0) grid[row][c] = { ch: chars[c], color: ci };
        }
    }
    return gridToAns(grid);
}

// ── dragon.ans ────────────────────────────────────────────────────────────────

writeFileSync(path.join(home, 'dragon.ans'), toBuf(renderScene(DRAGON_ART, 10)));
console.log('Written: ~/dragon.ans');

// ── treasure.ans ──────────────────────────────────────────────────────────────

writeFileSync(path.join(home, 'treasure.ans'), toBuf(renderScene(POTION_ART, 0)));
console.log('Written: ~/treasure.ans');
