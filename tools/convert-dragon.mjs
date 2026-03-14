#!/usr/bin/env node
// Converts ascii-art HTML files to Display-compatible art data.
// Parses colored <span> elements, maps 24-bit colors to 16-color palette.

import { readFileSync } from 'fs';

const PALETTE = [
    [0x55, 0x55, 0x55],  // 0 CLR_BLACK (renders as #555)
    [0xaa, 0x00, 0x00],  // 1 CLR_RED
    [0x00, 0xaa, 0x00],  // 2 CLR_GREEN
    [0xaa, 0x55, 0x00],  // 3 CLR_BROWN
    [0x00, 0x00, 0xdd],  // 4 CLR_BLUE
    [0xaa, 0x00, 0xaa],  // 5 CLR_MAGENTA
    [0x00, 0xaa, 0xaa],  // 6 CLR_CYAN
    [0xcc, 0xcc, 0xcc],  // 7 CLR_GRAY
    [0xcc, 0xcc, 0xcc],  // 8 NO_COLOR
    [0xff, 0x88, 0x00],  // 9 CLR_ORANGE
    [0x00, 0xff, 0x00],  // 10 CLR_BRIGHT_GREEN
    [0xff, 0xff, 0x00],  // 11 CLR_YELLOW
    [0x55, 0x55, 0xff],  // 12 CLR_BRIGHT_BLUE
    [0xff, 0x55, 0xff],  // 13 CLR_BRIGHT_MAGENTA
    [0x00, 0xff, 0xff],  // 14 CLR_BRIGHT_CYAN
    [0xff, 0xff, 0xff],  // 15 CLR_WHITE
];

function colorDist(c1, c2) {
    const dr = c1[0] - c2[0], dg = c1[1] - c2[1], db = c1[2] - c2[2];
    return dr * dr + dg * dg + db * db;
}

function nearestColor(r, g, b) {
    // Very dark = skip (background)
    if (r + g + b < 40) return -1;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        if (i === 8) continue; // skip NO_COLOR duplicate
        const d = colorDist([r, g, b], PALETTE[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

function parseHTML(filename) {
    const html = readFileSync(filename, 'utf8');
    const rows = [];
    // Split by <br>
    const rowStrs = html.split('<br>');

    for (const rowStr of rowStrs) {
        const cells = [];
        const re = /<span style="color:(#[0-9a-f]{6})">(.)<\/span>/gi;
        let m;
        while ((m = re.exec(rowStr)) !== null) {
            const hex = m[1];
            const ch = m[2];
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            cells.push({ ch, r, g, b });
        }
        if (cells.length > 0) rows.push(cells);
    }
    return rows;
}

// Parse both files
const blockFile = process.argv[2] || '/Users/davidbau/Downloads/ascii-art.html';
const asciiFile = process.argv[3] || '/Users/davidbau/Downloads/ascii-art (1).html';

for (const [label, file] of [['BLOCK', blockFile], ['ASCII', asciiFile]]) {
    const rows = parseHTML(file);
    console.log(`\n// === ${label} version (${file}) ===`);
    console.log(`// ${rows.length} rows x ${rows[0]?.length || 0} cols`);

    // Generate compact representation: for each row, output chars and colors
    // Skip cells mapped to -1 (background)
    console.log(`const DRAGON_${label} = [`);
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        let chars = '';
        let colors = [];
        for (const cell of row) {
            const ci = nearestColor(cell.r, cell.g, cell.b);
            if (ci === -1) {
                chars += ' ';
                colors.push(-1);
            } else {
                chars += cell.ch;
                colors.push(ci);
            }
        }
        // Trim trailing spaces
        const trimmed = chars.trimEnd();
        const trimColors = colors.slice(0, trimmed.length);
        console.log(`  ['${trimmed.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', [${trimColors.join(',')}]],`);
    }
    console.log(`];`);

    // Print color usage stats
    const colorCounts = {};
    for (const row of rows) {
        for (const cell of row) {
            const ci = nearestColor(cell.r, cell.g, cell.b);
            if (ci >= 0) colorCounts[ci] = (colorCounts[ci] || 0) + 1;
        }
    }
    console.log(`// Color usage: ${JSON.stringify(colorCounts)}`);
}
