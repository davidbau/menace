// screen_capture.js — Free functions for screen capture/restore on a grid
// Grid format: grid[r][c] = { ch, color, attr }

import { CLR_GRAY } from './terminal.js';

// DEC Special Graphics Character Set — map raw VT100 alternate charset
// codes to Unicode so the display grid always holds display-ready characters.
// C ref: nethack win/tty uses SO/SI (\x0e/\x0f) to toggle this charset.
export const DEC_TO_UNICODE = {
    '`': '\u25c6', a: '\u2592', f: '\u00b0', g: '\u00b1',
    j: '\u2518', k: '\u2510', l: '\u250c', m: '\u2514', n: '\u253c',
    q: '\u2500', t: '\u251c', u: '\u2524', v: '\u2534', w: '\u252c',
    x: '\u2502', '~': '\u00b7',
};

// Return rows-line string array matching C TTY screen format.
export function getScreenLines(grid, rows, cols) {
    const result = [];
    for (let r = 0; r < rows; r++) {
        let line = '';
        for (let c = 0; c < cols; c++) {
            line += grid[r][c].ch;
        }
        // Right-trim spaces (C session screens are right-trimmed)
        line = line.replace(/ +$/, '');
        result.push(line);
    }
    return result;
}

// Return rows-line ANSI string array including SGR color/attribute changes.
export function getScreenAnsiLines(grid, rows, cols) {
    const fgCode = (color) => {
        switch (color) {
            case 0: return 30;  // black
            case 1: return 31;  // red
            case 2: return 32;  // green
            case 3: return 33;  // brown
            case 4: return 34;  // blue
            case 5: return 35;  // magenta
            case 6: return 36;  // cyan
            case 7: return 37;  // gray
            case 8: return 90;  // no-color/dark gray
            case 9: return 91;  // orange / bright red in tty SGR
            case 10: return 92; // bright green
            case 11: return 93; // yellow
            case 12: return 94; // bright blue
            case 13: return 95; // bright magenta
            case 14: return 96; // bright cyan
            case 15: return 97; // white
            default: return 37;
        }
    };
    const bgCode = (color) => {
        switch (color) {
            case 0: return 40;  case 1: return 41;
            case 2: return 42;  case 3: return 43;
            case 4: return 44;  case 5: return 45;
            case 6: return 46;  case 7: return 47;
            case 8: return 100; case 9: return 101;
            case 10: return 102; case 11: return 103;
            case 12: return 104; case 13: return 105;
            case 14: return 106; case 15: return 107;
            default: return 40;
        }
    };
    const styleKey = (fg, bg, attr) => `${fg}|${bg}|${attr}`;

    const out = [];
    for (let r = 0; r < rows; r++) {
        // Trim trailing plain (non-styled) spaces
        let end = cols - 1;
        while (end >= 0 && grid[r][end].ch === ' ' && !grid[r][end].attr) end--;
        if (end < 0) {
            out.push('');
            continue;
        }

        let line = '';
        let curKey = '';
        for (let c = 0; c <= end; c++) {
            const cell = grid[r][c];
            const ch = cell.ch || ' ';
            const fg = Number.isInteger(cell.color) ? cell.color : 7;
            const a = Number.isInteger(cell.attr) ? cell.attr : 0;
            const inverse = (a & 1) !== 0;
            const bold = (a & 2) !== 0;
            const underline = (a & 4) !== 0;
            const styleFg = fg;
            const styleBg = 0;
            const key = styleKey(styleFg, styleBg, a);
            if (key !== curKey) {
                const sgr = [0, fgCode(styleFg), bgCode(styleBg)];
                if (bold) sgr.push(1);
                if (underline) sgr.push(4);
                if (inverse) sgr.push(7);
                line += `\x1b[${sgr.join(';')}m`;
                curKey = key;
            }
            line += ch;
        }
        line += '\x1b[0m';
        out.push(line);
    }
    return out;
}

// Overwrite the grid from captured plain-text session lines.
export function setScreenLines(grid, rows, cols, lines) {
    const src = Array.isArray(lines) ? lines : [];
    for (let r = 0; r < rows; r++) {
        const line = (r < src.length ? src[r] : '') || '';
        for (let c = 0; c < cols; c++) {
            grid[r][c] = { ch: c < line.length ? line[c] : ' ', color: CLR_GRAY, attr: 0 };
        }
    }
}

// Overwrite grid from ANSI-colored session lines.
export function setScreenAnsiLines(grid, rows, cols, lines) {
    // Clear first
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            grid[r][c] = { ch: ' ', color: CLR_GRAY, attr: 0 };
        }
    }
    const src = Array.isArray(lines) ? lines : [];
    for (let r = 0; r < rows && r < src.length; r++) {
        const line = String(src[r] || '');
        let i = 0;
        let col = 0;
        let fg = CLR_GRAY;
        let attr = 0; // bit1=inverse, bit2=bold, bit4=underline

        const applySgr = (codes) => {
            const list = codes.length ? codes : [0];
            for (const code of list) {
                if (code === 0) {
                    fg = CLR_GRAY;
                    attr = 0;
                } else if (code === 1) attr |= 2;
                else if (code === 4) attr |= 4;
                else if (code === 7) attr |= 1;
                else if (code === 22) attr &= ~2;
                else if (code === 24) attr &= ~4;
                else if (code === 27) attr &= ~1;
                else if (code >= 30 && code <= 37) fg = code - 30;
                else if (code >= 90 && code <= 97) fg = 8 + (code - 90);
                else if (code === 39) fg = CLR_GRAY;
            }
        };

        let decGraphics = false;
        while (i < line.length && col < cols) {
            const ch = line[i];
            if (ch === '\x0e') { decGraphics = true; i++; continue; }
            if (ch === '\x0f') { decGraphics = false; i++; continue; }
            if (ch === '\x1b' && line[i + 1] === '[') {
                let j = i + 2;
                while (j < line.length && !/[A-Za-z]/.test(line[j])) j++;
                if (j < line.length) {
                    const cmd = line[j];
                    const body = line.slice(i + 2, j);
                    if (cmd === 'm') {
                        const codes = body.length === 0
                            ? [0]
                            : body.split(';')
                                .map((s) => Number.parseInt(s || '0', 10))
                                .filter((n) => Number.isFinite(n));
                        applySgr(codes);
                    } else if (cmd === 'C') {
                        const n = Math.max(1, Number.parseInt(body || '1', 10) || 1);
                        for (let k = 0; k < n && col < cols; k++, col++) {
                            grid[r][col] = { ch: ' ', color: fg, attr };
                        }
                    }
                    i = j + 1;
                    continue;
                }
            }
            if (ch !== '\r' && ch !== '\n') {
                const decoded = decGraphics ? (DEC_TO_UNICODE[ch] || ch) : ch;
                grid[r][col] = { ch: decoded, color: fg, attr };
                col++;
            }
            i++;
        }
    }
}

// Return rows-line attribute array matching session format.
// Each line is cols chars where each char is an attribute code:
// '0' = normal, '1' = inverse, '2' = bold, '4' = underline
export function getAttrLines(grid, rows, cols) {
    const result = [];
    for (let r = 0; r < rows; r++) {
        let attrLine = '';
        for (let c = 0; c < cols; c++) {
            attrLine += String(grid[r][c].attr);
        }
        attrLine = attrLine.padEnd(cols, '0');
        result.push(attrLine);
    }
    return result;
}
