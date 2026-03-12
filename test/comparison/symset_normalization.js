// test/comparison/symset_normalization.js
// Canonical glyph normalization for symbol-set comparisons.

// DEC special graphics mapping (VT100 alternate character set).
// NetHack primarily uses the subset below, but we map the full common range
// so ANSI/SO-SI captures and Unicode-rendered captures compare consistently.
export const DEC_SPECIAL_TO_UNICODE = Object.freeze({
    '`': '\u25c6', // diamond
    a: '\u2592', // checkerboard (open door in DECgraphics)
    f: '\u00b0', // degree
    g: '\u00b1', // plus/minus
    h: '\u2424', // newline symbol
    i: '\u240b', // vertical tab symbol
    j: '\u2518',
    k: '\u2510',
    l: '\u250c',
    m: '\u2514',
    n: '\u253c',
    o: '\u23ba',
    p: '\u23bb',
    q: '\u2500',
    r: '\u23bc',
    s: '\u23bd',
    t: '\u251c',
    u: '\u2524',
    v: '\u2534',
    w: '\u252c',
    x: '\u2502',
    y: '\u2264',
    z: '\u2265',
    '{': '\u03c0',
    '|': '\u2260',
    '}': '\u00a3',
    '~': '\u00b7', // centered dot
});

export function decodeDecSpecialChar(ch) {
    return DEC_SPECIAL_TO_UNICODE[String(ch || '')] || String(ch || '');
}

// Decode DEC special graphics characters embedded inside SO (0x0E) / SI (0x0F)
// regions and strip the shift control codes.  Converts e.g. "\x0elqqqqk\x0f"
// to "┌────┐" (Unicode box-drawing characters).
export function decodeSOSILine(line) {
    const src = String(line || '').replace(/\r$/, '');
    let result = '';
    let inDec = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '\x0e') { inDec = true; continue; }
        if (ch === '\x0f') { inDec = false; continue; }
        // Skip ANSI escape sequences — pass them through without DEC decoding.
        // C's tmux captures can embed ANSI color codes (e.g. \x1b[33m) inside
        // SO/SI regions; the terminal `m` (or other letter) must not be treated
        // as a DEC graphics character.
        if (ch === '\x1b' && i + 1 < src.length && src[i + 1] === '[') {
            let end = i + 2;
            while (end < src.length && !/[A-Za-z]/.test(src[end])) end++;
            if (end < src.length) end++; // include the terminating letter
            result += src.substring(i, end);
            i = end - 1; // -1 because the for loop will i++
            continue;
        }
        result += inDec ? decodeDecSpecialChar(ch) : ch;
    }
    return result;
}

export function normalizeSymsetLine(line, { decGraphics = false } = {}) {
    const src = String(line || '');
    if (!src) return src;
    if (!decGraphics) return src;
    return [...src].map((ch) => decodeDecSpecialChar(ch)).join('');
}
