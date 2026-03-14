#!/usr/bin/env node
// Convert colored wide ASCII art HTML to Display-compatible 80x13 art data.
// Parses rgb() colored spans, downscales by block-averaging, maps to 16-color palette.

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
    if (r + g + b < 25) return -1; // background
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        if (i === 8) continue;
        const d = colorDist([r, g, b], PALETTE[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

const DENSITY = { ' ': 0, '\u2591': 1, '\u2592': 2, '\u2593': 3, '\u2588': 4 };

// Parse the HTML
const file = process.argv[2] || '/Users/davidbau/Downloads/colored-ascii-art (2).html';
const html = readFileSync(file, 'utf8');
const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/);
const content = preMatch[1];
const htmlRows = content.split('\n').filter(l => l.includes('<span'));

// Parse each row into cells: [{ch, r, g, b}, ...]
const srcGrid = [];
for (const row of htmlRows) {
    const cells = [];
    const re = /color:rgb\((\d+),(\d+),(\d+)\)">(.)<\/span>/g;
    let m;
    while ((m = re.exec(row)) !== null) {
        cells.push({ ch: m[4], r: +m[1], g: +m[2], b: +m[3] });
    }
    srcGrid.push(cells);
}

const srcH = srcGrid.length;
const srcW = Math.max(...srcGrid.map(r => r.length));
console.log(`// Source: ${srcW}x${srcH}`);

// Target dimensions — must fit in 13 display rows (rows 10-22)
const tgtW = 80;
const tgtH = 13;
console.log(`// Target: ${tgtW}x${tgtH}, hScale=${(srcW/tgtW).toFixed(2)}, vScale=${(srcH/tgtH).toFixed(2)}`);

const OUT_CHARS = [' ', '\u2591', '\u2592', '\u2593', '\u2588'];

const rows = [];
for (let ty = 0; ty < tgtH; ty++) {
    const sy0 = Math.floor(ty * srcH / tgtH);
    const sy1 = Math.floor((ty + 1) * srcH / tgtH);
    let chars = '';
    let colors = [];

    for (let tx = 0; tx < tgtW; tx++) {
        const sx0 = Math.floor(tx * srcW / tgtW);
        const sx1 = Math.floor((tx + 1) * srcW / tgtW);

        // Sample source region - pick the most prominent (brightest) cell
        let bestCell = null;
        let bestBright = 0;
        let totalDensity = 0;
        let count = 0;

        for (let sy = sy0; sy < sy1; sy++) {
            for (let sx = sx0; sx < sx1; sx++) {
                const cell = (srcGrid[sy] || [])[sx];
                if (!cell) continue;
                const bright = cell.r + cell.g + cell.b;
                const d = DENSITY[cell.ch] || 0;
                totalDensity += d;
                count++;
                if (bright > bestBright) {
                    bestBright = bright;
                    bestCell = cell;
                }
            }
        }

        if (!bestCell || bestBright < 25) {
            chars += ' ';
            colors.push(-1);
            continue;
        }

        // Map color
        const ci = nearestColor(bestCell.r, bestCell.g, bestCell.b);
        if (ci < 0) {
            chars += ' ';
            colors.push(-1);
            continue;
        }

        // Pick output character from average density
        const avgDensity = count > 0 ? totalDensity / count : 0;
        let outIdx;
        if (avgDensity < 0.3) outIdx = 1;      // ░
        else if (avgDensity < 1.0) outIdx = 2;  // ▒
        else if (avgDensity < 2.5) outIdx = 3;  // ▓
        else outIdx = 4;                          // █

        chars += OUT_CHARS[outIdx];
        colors.push(ci);
    }

    rows.push([chars, colors]);
}

// Output JS constant
console.log('const DRAGON_ART = [');
for (const [chars, colors] of rows) {
    let end = chars.length;
    while (end > 0 && chars[end - 1] === ' ') end--;
    const trimChars = chars.slice(0, end);
    const trimColors = colors.slice(0, end);
    const escaped = trimChars.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    console.log(`  ['${escaped}', [${trimColors.join(',')}]],`);
}
console.log('];');

// Color stats
const colorCounts = {};
for (const [, colors] of rows) {
    for (const c of colors) if (c >= 0) colorCounts[c] = (colorCounts[c] || 0) + 1;
}
console.log(`// Color usage: ${JSON.stringify(colorCounts)}`);

// Preview
console.log('\n// Visual preview:');
for (const [chars] of rows) {
    let end = chars.length;
    while (end > 0 && chars[end - 1] === ' ') end--;
    console.log('// ' + chars.slice(0, end));
}
