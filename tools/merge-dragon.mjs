#!/usr/bin/env node
// Merge two colored ASCII art HTML files by taking the more saturated color
// at each cell position. Crop to 80x13 centered.

import { readFileSync } from 'fs';

const PALETTE = [
    [0x55, 0x55, 0x55],  // 0 CLR_BLACK
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
    if (r + g + b < 25) return -1;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        if (i === 8) continue;
        const d = colorDist([r, g, b], PALETTE[i]);
        if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
}

// Saturation: how "colorful" vs gray
function saturation(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === 0) return 0;
    return (max - min) / max;
}

// Brightness
function brightness(r, g, b) {
    return r + g + b;
}

function parseHTML(file) {
    const html = readFileSync(file, 'utf8');
    const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/);
    const content = preMatch[1];
    const htmlRows = content.split('\n').filter(l => l.includes('<span'));
    const grid = [];
    for (const row of htmlRows) {
        const cells = [];
        const re = /color:rgb\((\d+),(\d+),(\d+)\)">(.)<\/span>/g;
        let m;
        while ((m = re.exec(row)) !== null) {
            cells.push({ ch: m[4], r: +m[1], g: +m[2], b: +m[3] });
        }
        grid.push(cells);
    }
    return grid;
}

const file3 = process.argv[2] || '/Users/davidbau/Downloads/colored-ascii-art (3).html';
const file4 = process.argv[3] || '/Users/davidbau/Downloads/colored-ascii-art (4).html';

const grid3 = parseHTML(file3);
const grid4 = parseHTML(file4);

const srcH = Math.max(grid3.length, grid4.length);
const srcW = Math.max(
    ...grid3.map(r => r.length),
    ...grid4.map(r => r.length)
);
console.log(`// Source 3: ${grid3[0]?.length}x${grid3.length}`);
console.log(`// Source 4: ${grid4[0]?.length}x${grid4.length}`);

// Crop to 80x13 centered
const tgtW = 80;
const tgtH = Math.min(srcH, 13);
const cropLeft = Math.max(0, Math.floor((srcW - tgtW) / 2));
const cropTop = Math.max(0, Math.floor((srcH - tgtH) / 2));
console.log(`// Crop: left=${cropLeft}, top=${cropTop}, target=${tgtW}x${tgtH}`);

const rows = [];
for (let ty = 0; ty < tgtH; ty++) {
    const sy = cropTop + ty;
    let chars = '';
    let colors = [];

    for (let tx = 0; tx < tgtW; tx++) {
        const sx = cropLeft + tx;
        const c3 = (grid3[sy] || [])[sx];
        const c4 = (grid4[sy] || [])[sx];

        // Pick the more saturated/brighter of the two
        let best = null;
        if (c3 && c4) {
            const s3 = saturation(c3.r, c3.g, c3.b);
            const s4 = saturation(c4.r, c4.g, c4.b);
            const b3 = brightness(c3.r, c3.g, c3.b);
            const b4 = brightness(c4.r, c4.g, c4.b);
            // Prefer the one with higher saturation; break ties by brightness
            if (s3 > s4 + 0.05) best = c3;
            else if (s4 > s3 + 0.05) best = c4;
            else best = b3 >= b4 ? c3 : c4;
        } else {
            best = c3 || c4;
        }

        if (!best || best.ch === ' ') {
            const ci = best ? nearestColor(best.r, best.g, best.b) : -1;
            chars += ' ';
            colors.push(ci);
            continue;
        }

        const ci = nearestColor(best.r, best.g, best.b);
        chars += best.ch;
        colors.push(ci);
    }
    rows.push([chars, colors]);
}

// Output
console.log('const DRAGON_ART = [');
for (const [chars, colors] of rows) {
    let end = chars.length;
    while (end > 0 && chars[end - 1] === ' ' && colors[end - 1] === -1) end--;
    const trimChars = chars.slice(0, end);
    const trimColors = colors.slice(0, end);
    const escaped = trimChars.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    console.log(`  ['${escaped}', [${trimColors.join(',')}]],`);
}
console.log('];');

const colorCounts = {};
for (const [, colors] of rows) {
    for (const c of colors) if (c >= 0) colorCounts[c] = (colorCounts[c] || 0) + 1;
}
console.log(`// Color usage: ${JSON.stringify(colorCounts)}`);

console.log('\n// Visual preview:');
for (const [chars] of rows) {
    let end = chars.length;
    while (end > 0 && chars[end - 1] === ' ') end--;
    console.log('// ' + chars.slice(0, end));
}
