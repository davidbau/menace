#!/usr/bin/env node
// Preview DRAGON_ART or POTION_ART from promo.js using ANSI terminal colors.

// ANSI color codes matching the 16-color palette
const ANSI = {
  '-1': '\x1b[0m',      // reset (transparent)
  '0': '\x1b[38;5;240m', // CLR_BLACK → dark gray
  '1': '\x1b[31m',       // CLR_RED
  '2': '\x1b[32m',       // CLR_GREEN
  '3': '\x1b[33m',       // CLR_BROWN (dark yellow)
  '4': '\x1b[34m',       // CLR_BLUE
  '5': '\x1b[35m',       // CLR_MAGENTA
  '6': '\x1b[36m',       // CLR_CYAN
  '7': '\x1b[37m',       // CLR_GRAY
  '9': '\x1b[38;5;208m', // CLR_ORANGE
  '11': '\x1b[93m',      // CLR_YELLOW
  '12': '\x1b[94m',      // CLR_BRIGHT_BLUE
  '13': '\x1b[95m',      // CLR_BRIGHT_MAGENTA
  '14': '\x1b[96m',      // CLR_BRIGHT_CYAN
  '15': '\x1b[97m',      // CLR_WHITE
};
const RESET = '\x1b[0m';

// Read the art data from promo.js by importing it... or just parse manually
// For simplicity, let's define inline what we want to preview

const which = process.argv[2] || 'dragon';

import('../js/promo.js').catch(() => {});

// We'll just read the file and extract the arrays
import { readFileSync } from 'fs';
const src = readFileSync('js/promo.js', 'utf8');

function extractArt(name) {
    const re = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`, 'm');
    const m = src.match(re);
    if (!m) { console.error(`Could not find ${name}`); return []; }
    // Parse each row: ['chars', [colors]]
    const rows = [];
    const rowRe = /\['([^']*(?:\\.[^']*)*)',\s*\[([^\]]*)\]\]/g;
    let rm;
    while ((rm = rowRe.exec(m[1])) !== null) {
        const chars = rm[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        const colors = rm[2].split(',').map(Number);
        rows.push([chars, colors]);
    }
    return rows;
}

const artName = which === 'potion' ? 'POTION_ART' : 'DRAGON_ART';
const art = extractArt(artName);

console.log(`\x1b[40m`); // black background
for (const [chars, colors] of art) {
    let line = '';
    for (let i = 0; i < chars.length; i++) {
        const ci = i < colors.length ? colors[i] : -1;
        const ansi = ANSI[String(ci)] || RESET;
        if (ci === -1) {
            line += ' ';
        } else {
            line += ansi + chars[i];
        }
    }
    // Pad to 80 cols
    const padded = line + RESET;
    console.log(padded);
}
console.log(RESET);
