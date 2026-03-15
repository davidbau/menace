#!/usr/bin/env node
// Parse ~/nethack.ans and update LETTERS in js/promo.js.
// Usage: node scripts/import_ans.mjs

import { readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// ── CP437 → Unicode (block/shade chars only) ──────────────────────────────────
const CP437 = new Array(256).fill('?');
// ASCII passthrough
for (let i = 0x20; i < 0x7F; i++) CP437[i] = String.fromCharCode(i);
CP437[0x20] = ' ';
CP437[0xB0] = '░'; CP437[0xB1] = '▒'; CP437[0xB2] = '▓';
CP437[0xDB] = '█'; CP437[0xDC] = '▄'; CP437[0xDD] = '▌';
CP437[0xDE] = '▐'; CP437[0xDF] = '▀';

// ── Parse .ans into 2D char grid ──────────────────────────────────────────────
function parseAns(buf, rows = 24, cols = 80) {
    const grid = Array.from({ length: rows }, () => Array(cols).fill(' '));
    let r = 0, c = 0, i = 0;
    while (i < buf.length) {
        const b = buf[i];
        if (b === 0x1B && buf[i+1] === 0x5B) { // ESC [
            // Skip CSI sequence: ESC [ ... (letter)
            i += 2;
            while (i < buf.length && !(buf[i] >= 0x40 && buf[i] <= 0x7E)) i++;
            i++; // consume terminating letter
            continue;
        }
        if (b === 0x0D) { c = 0; i++; continue; } // CR
        if (b === 0x0A) { r++; c = 0; i++; continue; } // LF
        // Content byte
        const ch = CP437[b] || '?';
        if (r < rows && c < cols) grid[r][c] = ch;
        c++;
        i++;
    }
    return grid;
}

// ── Extract NETHACK letters from grid ─────────────────────────────────────────
// Logo layout matches drawLogo(): 7 letters × 5 wide, gap 2, startCol 16, rows 2-6
const WORD = 'NETHACK';
const LW = 5, GAP = 2;
const START_COL = Math.floor((80 - (WORD.length * LW + (WORD.length - 1) * GAP)) / 2);
const START_ROW = 2;

const buf = readFileSync(path.join(homedir(), 'nethack.ans'));
const grid = parseAns(buf);

// Debug: show what we got in the logo region
console.log('\nExtracted logo (rows 2–6):');
for (let row = START_ROW; row < START_ROW + 5; row++) {
    console.log(JSON.stringify(grid[row].join('')));
}

const letters = {};
for (let li = 0; li < WORD.length; li++) {
    const letter = WORD[li];
    const colOff = START_COL + li * (LW + GAP);
    const rows = [];
    for (let row = START_ROW; row < START_ROW + 5; row++) {
        rows.push(grid[row].slice(colOff, colOff + LW).join(''));
    }
    letters[letter] = rows;
    console.log(`\n${letter} (col ${colOff}):`);
    rows.forEach(r => console.log('  ' + JSON.stringify(r)));
}

// ── Build replacement LETTERS object ─────────────────────────────────────────
function jsLetter(rows) {
    return `[${rows.map(r => JSON.stringify(r)).join(', ')}]`;
}

const lettersJs = `const LETTERS = {\n${
    WORD.split('').map(l => `    ${l}: ${jsLetter(letters[l])},`).join('\n')
}\n};`;

console.log('\nNew LETTERS object:\n' + lettersJs);

// ── Patch promo.js ────────────────────────────────────────────────────────────
const promoPath = path.join(__dir, '../js/promo.js');
let src = readFileSync(promoPath, 'utf8');

const oldMatch = src.match(/const LETTERS = \{[\s\S]*?\};/);
if (!oldMatch) { console.error('Could not find LETTERS in promo.js'); process.exit(1); }

src = src.replace(oldMatch[0], lettersJs);
writeFileSync(promoPath, src);
console.log('\nUpdated js/promo.js');
