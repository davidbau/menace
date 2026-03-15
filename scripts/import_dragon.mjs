#!/usr/bin/env node
// Parse ~/dragon.ans and update DRAGON_ART in js/promo.js.
// Usage: node scripts/import_dragon.mjs

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// ── CP437 → Unicode ───────────────────────────────────────────────────────────
const CP437 = new Array(256).fill('?');
for (let i = 0x20; i < 0x7F; i++) CP437[i] = String.fromCharCode(i);
CP437[0xB0] = '░'; CP437[0xB1] = '▒'; CP437[0xB2] = '▓';
CP437[0xDB] = '█'; CP437[0xDC] = '▄'; CP437[0xDD] = '▌';
CP437[0xDE] = '▐'; CP437[0xDF] = '▀';

// ── ANSI SGR parser → CGA color index (-1 = default/reset) ───────────────────
// Handles: 0=reset, 1=bold, 30-37=standard fg, 90-97=bright fg
function parseSGR(params) {
    let bold = false, color = null;
    for (const p of params) {
        if (p === 0)             { bold = false; color = -1; }
        else if (p === 1)        { bold = true; }
        else if (p >= 30 && p <= 37) { color = p - 30; }
        else if (p >= 90 && p <= 97) { color = p - 90 + 8; }
        // 38;5;n, 48;5;n etc. — ignored
    }
    if (color !== null && color >= 0 && color < 8 && bold) color += 8;
    return color; // null = no fg change, -1 = reset, 0-15 = color
}

// ── Parse .ans into 24×80 grid of {ch, color} ─────────────────────────────────
// color=-1 means "not explicitly colored" (transparent/default)
function parseAns(buf, ROWS = 24, COLS = 80) {
    const grid = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({ ch: ' ', color: -1 })));

    let r = 0, c = 0;
    let curColor = -1; // current SGR foreground (-1 = reset)
    let i = 0;

    while (i < buf.length) {
        const b = buf[i];

        if (b === 0x1B && buf[i + 1] === 0x5B) { // ESC [
            i += 2;
            // Collect CSI parameter bytes and the command byte
            let raw = '';
            while (i < buf.length && !(buf[i] >= 0x40 && buf[i] <= 0x7E)) {
                raw += String.fromCharCode(buf[i++]);
            }
            const cmd = buf[i++]; // consume command byte
            if (cmd === 0x6D) { // 'm' = SGR
                const params = raw.split(';').map(s => parseInt(s) || 0);
                const newColor = parseSGR(params);
                if (newColor !== null) curColor = newColor;
            }
            // Other CSI commands (cursor movement etc.) ignored
            continue;
        }

        if (b === 0x1A) break; // EOF / SAUCE record marker
        if (b === 0x0D) { c = 0; i++; continue; } // CR
        if (b === 0x0A) { r++; c = 0; i++; continue; } // LF

        // Content byte
        const ch = CP437[b] || '?';
        if (r < ROWS && c < COLS) {
            grid[r][c] = { ch, color: curColor };
        }
        c++;
        if (c >= COLS) { r++; c = 0; } // auto-wrap at col 80
        i++;
    }
    return grid;
}

// ── Extract DRAGON_ART rows from grid ────────────────────────────────────────
// Dragon art occupies rows 10–22 (startRow=10, 13 rows)
const DRAGON_START = 10;
const DRAGON_ROWS  = 13;

const buf  = readFileSync(path.join(homedir(), 'dragon.ans'));
const grid = parseAns(buf);

console.log('\nExtracted dragon rows (visible chars only):');
const artRows = [];
for (let dr = 0; dr < DRAGON_ROWS; dr++) {
    const row = grid[DRAGON_START + dr];

    // Find last explicitly-colored (non-default) cell
    let lastContent = -1;
    for (let col = row.length - 1; col >= 0; col--) {
        if (row[col].color >= 0) { lastContent = col; break; }
    }

    // Build chars string and colors array up to lastContent
    let chars = '';
    const colors = [];
    for (let col = 0; col <= lastContent; col++) {
        chars += row[col].ch;
        colors.push(row[col].color); // -1 = transparent, 0-15 = colored
    }

    artRows.push([chars, colors]);
    const visible = colors.filter(c => c >= 0).join('');
    const visChars = [...chars].filter((_, i) => colors[i] >= 0).join('');
    console.log(`  dr${dr}: len=${chars.length} visible=${colors.filter(c=>c>=0).length} [${visChars}]`);
}

// ── Serialize DRAGON_ART ──────────────────────────────────────────────────────
function jsonRow([chars, colors]) {
    // Escape the chars string properly for JS source
    const charsJson = JSON.stringify(chars);
    const colorsJson = '[' + colors.join(',') + ']';
    return `  [${charsJson}, ${colorsJson}]`;
}

const newArt = `const DRAGON_ART = [\n${artRows.map(jsonRow).join(',\n')},\n];`;

// ── Patch promo.js ────────────────────────────────────────────────────────────
const promoPath = path.join(__dir, '../js/promo.js');
let src = readFileSync(promoPath, 'utf8');

const oldMatch = src.match(/const DRAGON_ART = \[[\s\S]*?\n\];/);
if (!oldMatch) { console.error('Could not find DRAGON_ART in promo.js'); process.exit(1); }

src = src.replace(oldMatch[0], newArt);
writeFileSync(promoPath, src);
console.log('\nUpdated DRAGON_ART in js/promo.js');
