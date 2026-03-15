import { readFileSync } from 'fs';

const PALETTE = [
    [0x00, 0x00, 0x00],  // 0 CLR_BLACK
    [0xaa, 0x00, 0x00],  // 1 CLR_RED
    [0x00, 0xaa, 0x00],  // 2 CLR_GREEN
    [0xaa, 0x55, 0x00],  // 3 CLR_BROWN
    [0x00, 0x00, 0xdd],  // 4 CLR_BLUE
    [0xaa, 0x00, 0xaa],  // 5 CLR_MAGENTA
    [0x00, 0xaa, 0xaa],  // 6 CLR_CYAN
    [0xcc, 0xcc, 0xcc],  // 7 CLR_GRAY
    [0xcc, 0xcc, 0xcc],  // 8 NO_COLOR (same as gray)
    [0xff, 0x88, 0x00],  // 9 CLR_ORANGE
    [0x00, 0xff, 0x00],  // 10 CLR_BRIGHT_GREEN
    [0xff, 0xff, 0x00],  // 11 CLR_YELLOW
    [0x55, 0x55, 0xff],  // 12 CLR_BRIGHT_BLUE
    [0xff, 0x55, 0xff],  // 13 CLR_BRIGHT_MAGENTA
    [0x00, 0xff, 0xff],  // 14 CLR_BRIGHT_CYAN
    [0xff, 0xff, 0xff],  // 15 CLR_WHITE
];

function parseColor(hex) {
    // Handle #RRGGBB
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return [r, g, b];
}

function nearestColor(rgb) {
    const [r, g, b] = rgb;
    // Very dark colors -> CLR_BLACK (will render as #555)
    if (r + g + b < 30) return 0;

    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
        // Skip index 8 (duplicate of 7)
        if (i === 8) continue;
        const [pr, pg, pb] = PALETTE[i];
        const dr = r - pr, dg = g - pg, db = b - pb;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
        }
    }
    return bestIdx;
}

const html = readFileSync('/Users/davidbau/Downloads/ascii-art.html', 'utf-8');

// Extract body content
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
const body = bodyMatch[1].trim();

// Split by <br>
const rowStrs = body.split('<br>');

const rows = [];
const spanRe = /<span style="color:(#[0-9a-fA-F]+)">([\s\S])<\/span>/g;

for (const rowStr of rowStrs) {
    if (!rowStr.trim()) continue;
    const chars = [];
    const colors = [];
    let m;
    spanRe.lastIndex = 0;
    while ((m = spanRe.exec(rowStr)) !== null) {
        const color = parseColor(m[1]);
        const ch = m[2];
        const colorIdx = nearestColor(color);
        chars.push(ch);
        colors.push(colorIdx);
    }
    if (chars.length > 0) {
        rows.push({ chars: chars.join(''), colors });
    }
}

// Output as JS constant
console.log('const DRAGON_ART = [');
for (let i = 0; i < rows.length; i++) {
    const { chars, colors } = rows[i];
    console.log(`  // row ${i}`);
    console.log(`  [${JSON.stringify(chars)}, ${JSON.stringify(colors)}],`);
}
console.log('];');
