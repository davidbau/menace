#!/usr/bin/env node
// Parse ~/treasure.ans and update POTION_ART in js/promo.js.
// Usage: node scripts/import_treasure.mjs

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

// ── ANSI SGR parser ───────────────────────────────────────────────────────────
function parseSGR(params) {
    let bold = false, color = null;
    for (const p of params) {
        if (p === 0)             { bold = false; color = -1; }
        else if (p === 1)        { bold = true; }
        else if (p >= 30 && p <= 37) { color = p - 30; }
        else if (p >= 90 && p <= 97) { color = p - 90 + 8; }
    }
    if (color !== null && color >= 0 && color < 8 && bold) color += 8;
    return color;
}

// ── Parse .ans into 24×80 grid ────────────────────────────────────────────────
function parseAns(buf, ROWS = 50, COLS = 80) {
    const grid = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({ ch: ' ', color: -1 })));
    let r = 0, c = 0, curColor = -1, i = 0;
    while (i < buf.length) {
        const b = buf[i];
        if (b === 0x1B && buf[i+1] === 0x5B) {
            i += 2;
            let raw = '';
            while (i < buf.length && !(buf[i] >= 0x40 && buf[i] <= 0x7E)) raw += String.fromCharCode(buf[i++]);
            const cmd = buf[i++];
            if (cmd === 0x6D) {
                const nc = parseSGR(raw.split(';').map(s => parseInt(s) || 0));
                if (nc !== null) curColor = nc;
            }
            continue;
        }
        if (b === 0x1A) break; // EOF / SAUCE record marker
        if (b === 0x0D) { c = 0; i++; continue; }
        if (b === 0x0A) { r++; c = 0; i++; continue; }
        const ch = CP437[b] || '?';
        if (r < ROWS && c < COLS) grid[r][c] = { ch, color: curColor };
        c++;
        if (c >= COLS) { r++; c = 0; } // auto-wrap at col 80
        i++;
    }
    return grid;
}

// ── Extract POTION_ART rows (potion scene starts at row 0) ───────────────────
const buf  = readFileSync(path.join(homedir(), 'treasure.ans'));
const grid = parseAns(buf);

const artRows = [];
for (let row = 0; row < 24; row++) {
    const cells = grid[row];
    let lastContent = -1;
    for (let col = cells.length - 1; col >= 0; col--) {
        if (cells[col].color >= 0) { lastContent = col; break; }
    }
    if (lastContent < 0) {
        // Empty row — include only if there are more content rows below
        const hasMore = grid.slice(row + 1).some(r => r.some(c => c.color >= 0));
        if (!hasMore) break; // trailing empty rows: stop here
        artRows.push(['', []]);
        continue;
    }
    let chars = '';
    const colors = [];
    for (let col = 0; col <= lastContent; col++) {
        chars += cells[col].ch;
        colors.push(cells[col].color);
    }
    artRows.push([chars, colors]);
}

console.log(`Extracted ${artRows.length} rows from treasure.ans`);
artRows.forEach(([ch, col], i) => {
    const vis = col.filter(c => c >= 0).length;
    if (vis > 0) console.log(`  row${i}: ${ch.length} chars, ${vis} visible`);
});

// ── Serialize ─────────────────────────────────────────────────────────────────
const newArt = `const POTION_ART = [\n${
    artRows.map(([chars, colors]) =>
        `  [${JSON.stringify(chars)}, [${colors.join(',')}]]`
    ).join(',\n')
},\n];`;

// ── Patch promo.js ────────────────────────────────────────────────────────────
const promoPath = path.join(__dir, '../js/promo.js');
let src = readFileSync(promoPath, 'utf8');
const oldMatch = src.match(/const POTION_ART = \[[\s\S]*?\n\];/);
if (!oldMatch) { console.error('Could not find POTION_ART in promo.js'); process.exit(1); }
src = src.replace(oldMatch[0], newArt);
writeFileSync(promoPath, src);
console.log('Updated POTION_ART in js/promo.js');
