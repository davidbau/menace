#!/usr/bin/env node
// Fix dragon art: fill black gaps in fire/sword with bright colors,
// tone down misplaced whites around dragon body.

import { readFileSync, writeFileSync } from 'fs';

const src = readFileSync('js/promo.js', 'utf8');

// Extract DRAGON_ART
const re = /const DRAGON_ART = \[([\s\S]*?)\];/m;
const m = src.match(re);
if (!m) { console.error('Could not find DRAGON_ART'); process.exit(1); }

const rows = [];
const rowRe = /\['([^']*(?:\\.[^']*)*)',\s*\[([^\]]*)\]\]/g;
let rm;
while ((rm = rowRe.exec(m[1])) !== null) {
    const chars = rm[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    const colors = rm[2].split(',').map(Number);
    rows.push({ chars: [...chars], colors: [...colors] });
}

console.log(`Loaded ${rows.length} rows, max width ${Math.max(...rows.map(r => r.chars.length))}`);

// Helper: set a cell
function set(row, col, ch, color) {
    if (row >= 0 && row < rows.length) {
        while (rows[row].chars.length <= col) { rows[row].chars.push(' '); rows[row].colors.push(-1); }
        rows[row].chars[col] = ch;
        rows[row].colors[col] = color;
    }
}
function get(row, col) {
    if (row >= 0 && row < rows.length && col < rows[row].colors.length) {
        return rows[row].colors[col];
    }
    return -1;
}

// ANSI preview
const ANSI = {
    '-1': '\x1b[0m', '0': '\x1b[38;5;240m', '1': '\x1b[31m', '2': '\x1b[32m',
    '3': '\x1b[33m', '6': '\x1b[36m', '7': '\x1b[37m', '9': '\x1b[38;5;208m',
    '11': '\x1b[93m', '12': '\x1b[94m', '14': '\x1b[96m', '15': '\x1b[97m',
};

function preview(label) {
    console.log(`\n\x1b[40m=== ${label} ===`);
    for (const { chars, colors } of rows) {
        let line = '';
        for (let i = 0; i < chars.length; i++) {
            const ci = i < colors.length ? colors[i] : -1;
            if (ci === -1) { line += ' '; }
            else { line += (ANSI[String(ci)] || '') + chars[i]; }
        }
        console.log(line + '\x1b[0m');
    }
    console.log('\x1b[0m');
}

preview('BEFORE');

// === FIX 1: Fill black holes inside the fire region ===
// Fire is roughly cols 30-55, rows 6-10.
// Any -1 cell surrounded by fire colors (3,9,11) should become fire.
for (let pass = 0; pass < 3; pass++) {
    for (let r = 5; r <= 11; r++) {
        for (let c = 30; c <= 58; c++) {
            if (get(r, c) !== -1) continue;
            // Count fire-colored neighbors
            let fireNeighbors = 0;
            let totalNeighbors = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nc = get(r + dr, c + dc);
                    if (nc !== -1) totalNeighbors++;
                    if (nc === 3 || nc === 9 || nc === 11) fireNeighbors++;
                }
            }
            if (fireNeighbors >= 3) {
                // Pick color based on position — brighter toward center
                const distFromCenter = Math.abs(c - 42) + Math.abs(r - 7);
                let color = distFromCenter < 5 ? 11 : distFromCenter < 8 ? 9 : 3;
                set(r, c, '\u2592', color); // ▒
            }
        }
    }
}

// === FIX 2: Fill black holes inside the sword glow ===
// Sword glow is roughly cols 58-66, rows 0-6.
for (let pass = 0; pass < 3; pass++) {
    for (let r = 0; r <= 7; r++) {
        for (let c = 55; c <= 68; c++) {
            if (get(r, c) !== -1) continue;
            let cyanNeighbors = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nc = get(r + dr, c + dc);
                    if (nc === 6 || nc === 7 || nc === 14 || nc === 15) cyanNeighbors++;
                }
            }
            if (cyanNeighbors >= 3) {
                set(r, c, '\u2591', 14); // ░ bright cyan
            }
        }
    }
}

// === FIX 3: Convert gray/white cells in dragon body area to red dragon texture ===
// Dragon body is roughly cols 0-35, rows 0-10.
// Gray (7) and white (15) cells here should become red with texture characters.
for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].colors.length; c++) {
        const ci = rows[r].colors[c];
        if (ci !== 7 && ci !== 15) continue;
        const inKnight = c >= 56 && c <= 78 && r >= 0 && r <= 10;
        const inSword = c >= 55 && c <= 68 && r >= 0 && r <= 7;
        const inFire = c >= 30 && c <= 58 && r >= 5 && r <= 10;
        if (inKnight || inSword || inFire) continue;
        // This is a misplaced bright cell in the dragon/rock area — make it red texture
        if (r <= 8 && c <= 35) {
            rows[r].colors[c] = 1; // red dragon body
            rows[r].chars[c] = '\u2593'; // ▓ for texture
        } else {
            rows[r].colors[c] = 0; // dark gray for rocks
        }
    }
}

// === FIX 3b: Add edge characters to dragon silhouette ===
// Scan for transitions between filled and empty cells, add directional edges
for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].colors.length; c++) {
        const ci = get(r, c);
        if (ci !== 1 && ci !== 0) continue; // only dragon body / dark cells
        // Check if this is an edge cell (adjacent to transparent)
        const above = get(r - 1, c);
        const below = get(r + 1, c);
        const left = get(r, c - 1);
        const right = get(r, c + 1);

        // Only modify cells at the dragon body boundary (cols 0-35, rows 0-9)
        if (c > 35 || r > 9) continue;
        if (ci !== 1) continue; // only red cells

        // Top edge of dragon body — use ▀ or curved chars
        if (above === -1 && below !== -1) {
            rows[r].chars[c] = '\u2580'; // ▀ upper half block
        }
        // Bottom edge
        else if (below === -1 && above !== -1) {
            rows[r].chars[c] = '\u2584'; // ▄ lower half block
        }
        // Left edge
        else if (left === -1 && right !== -1) {
            rows[r].chars[c] = '\u258C'; // ▌ left half block
        }
        // Right edge (going into empty space)
        else if (right === -1 && left !== -1) {
            rows[r].chars[c] = '\u2590'; // ▐ right half block
        }
    }
}

// === FIX 4: Add dragon eye ===
set(3, 37, '\u2588', 11); // █ yellow-green eye

// === FIX 5: Brighten the fire core ===
// The very center of the fire (around cols 38-48, rows 6-8) should be yellow (11)
for (let r = 6; r <= 8; r++) {
    for (let c = 36; c <= 50; c++) {
        if (get(r, c) === 9) {
            const distFromCenter = Math.abs(c - 43) + Math.abs(r - 7);
            if (distFromCenter < 4) {
                rows[r].colors[c] = 11;
            }
        }
    }
}

preview('AFTER');

// === Output new JS constant ===
let output = 'const DRAGON_ART = [\n';
for (const { chars, colors } of rows) {
    let end = chars.length;
    while (end > 0 && chars[end - 1] === ' ' && colors[end - 1] === -1) end--;
    const trimChars = chars.slice(0, end).join('');
    const trimColors = colors.slice(0, end);
    // Escape for JS
    let escaped = '';
    for (const ch of trimChars) {
        const cp = ch.codePointAt(0);
        if (cp > 127) escaped += `\\u${cp.toString(16).padStart(4, '0')}`;
        else if (ch === "'") escaped += "\\'";
        else if (ch === '\\') escaped += '\\\\';
        else escaped += ch;
    }
    output += `  ['${escaped}', [${trimColors.join(',')}]],\n`;
}
output += '];';

console.log('\n// Paste this into promo.js:');
console.log(output);
