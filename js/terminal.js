// terminal.js -- Shared Terminal base class for all apps (NetHack, Hack, Rogue, Logo, BASIC).
// Provides a character-cell grid with optional DOM rendering.

// --- Color constants ---
export const CLR_BLACK = 0;
export const CLR_RED = 1;
export const CLR_GREEN = 2;
export const CLR_BROWN = 3;
export const CLR_BLUE = 4;
export const CLR_MAGENTA = 5;
export const CLR_CYAN = 6;
export const CLR_GRAY = 7;
export const NO_COLOR = 8;
export const CLR_ORANGE = 9;
export const CLR_BRIGHT_GREEN = 10;
export const CLR_YELLOW = 11;
export const CLR_BRIGHT_BLUE = 12;
export const CLR_BRIGHT_MAGENTA = 13;
export const CLR_BRIGHT_CYAN = 14;
export const CLR_WHITE = 15;

// --- Attribute constants ---
export const ATR_NONE = 0;
export const ATR_INVERSE = 1;
export const ATR_BOLD = 2;
export const ATR_UNDERLINE = 4;

// --- Highlight aliases ---
export const HI_METAL = CLR_CYAN;
export const HI_WOOD = CLR_BROWN;
export const HI_GOLD = CLR_YELLOW;
export const HI_ZAP = CLR_BRIGHT_BLUE;

// CSS color strings for each color constant.
// See display.js DECISIONS.md #2 for color choices.
const COLOR_CSS = [
    '#555',    // 0  - CLR_BLACK (dark gray for visibility on black bg)
    '#a00',    // 1  - CLR_RED
    '#0a0',    // 2  - CLR_GREEN
    '#a50',    // 3  - CLR_BROWN
    '#00d',    // 4  - CLR_BLUE
    '#a0a',    // 5  - CLR_MAGENTA
    '#0aa',    // 6  - CLR_CYAN
    '#ccc',    // 7  - CLR_GRAY
    '#ccc',    // 8  - NO_COLOR (unused, defaults to gray)
    '#f80',    // 9  - CLR_ORANGE
    '#0f0',    // 10 - CLR_BRIGHT_GREEN
    '#ff0',    // 11 - CLR_YELLOW
    '#55f',    // 12 - CLR_BRIGHT_BLUE
    '#f5f',    // 13 - CLR_BRIGHT_MAGENTA
    '#0ff',    // 14 - CLR_BRIGHT_CYAN
    '#fff',    // 15 - CLR_WHITE
];

/**
 * Compute the optimal line-height for seamless box-drawing characters.
 *
 * Terminal box-drawing glyphs extend to the font's full cell height (usWinAscent +
 * usWinDescent), not the smaller typographic metrics. This function measures the
 * actual loaded font via the Canvas API and rounds down to a whole-pixel value.
 *
 * @param {number} fontSize - The font size in pixels (e.g. 16)
 * @param {string} fontFamily - The CSS font-family string
 * @returns {number} line-height as a unitless ratio (e.g. 1.125)
 */
function computeTerminalLineHeight(fontSize, fontFamily) {
    const DEFAULT_LINE_HEIGHT = 1.1875;
    if (typeof document === 'undefined') return DEFAULT_LINE_HEIGHT;
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText('|');
        if (metrics.fontBoundingBoxAscent != null &&
            metrics.fontBoundingBoxDescent != null) {
            const naturalHeight = metrics.fontBoundingBoxAscent
                                + metrics.fontBoundingBoxDescent;
            const naturalRatio = naturalHeight / fontSize;
            const wholePixelHeight = Math.floor(naturalRatio * fontSize);
            return Math.max(wholePixelHeight / fontSize, 1.0);
        }
    } catch (e) {
        // Canvas not available (e.g. Node.js tests)
    }
    return DEFAULT_LINE_HEIGHT;
}

export class Terminal {
    /**
     * @param {string|null} containerId - DOM container id, or null/undefined for headless
     * @param {object} opts
     * @param {number} opts.rows - number of rows (default 24)
     * @param {number} opts.cols - number of columns (default 80)
     * @param {HTMLCanvasElement} opts.graphicsCanvas - optional canvas overlay
     */
    constructor(containerId, { rows = 24, cols = 80, graphicsCanvas } = {}) {
        this.rows = rows;
        this.cols = cols;

        // The character grid: [row][col] = {ch, color, attr}
        // attr: 0=normal, 1=inverse, 2=bold, 4=underline (can be OR'd)
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = { ch: ' ', color: CLR_GRAY, attr: 0 };
            }
        }

        // Cursor state
        this.cursorCol = 0;
        this.cursorRow = 0;
        this.cursorVisible = 1;

        // Focus point (stored for external use, e.g. scroll-into-view)
        this._focusCol = 0;
        this._focusRow = 0;

        // DOM elements (null when headless)
        this.spans = null;
        this._pre = null;
        this._canvas = graphicsCanvas || null;
        this._cursorSpan = null;
        this.container = null;

        // Optional flags object (NetHack sets this.flags = { color, use_darkgray, ... })
        // Simple apps leave it undefined.
        this.flags = undefined;

        if (containerId != null) {
            this._createDOM(containerId);
        }
    }

    _createDOM(containerId) {
        this.container = typeof containerId === 'string'
            ? document.getElementById(containerId)
            : containerId;  // accept DOM element directly
        const pre = document.createElement('pre');
        pre.id = 'terminal';
        const fontFamily = '"DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", monospace';
        const fontSize = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--game-font-size')) || 16;
        const lineHeight = computeTerminalLineHeight(fontSize, fontFamily);
        pre.style.cssText = `
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            background: #000;
            color: #ccc;
            padding: 8px;
            margin: 0;
            display: inline-block;
            white-space: pre;
            cursor: default;
            user-select: none;
        `;

        // Create spans for each cell
        this.spans = [];
        for (let r = 0; r < this.rows; r++) {
            this.spans[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const span = document.createElement('span');
                span.textContent = ' ';
                span.style.color = COLOR_CSS[CLR_GRAY];
                span.dataset.row = r;
                span.dataset.col = c;
                this.spans[r][c] = span;
                pre.appendChild(span);
            }
            if (r < this.rows - 1) {
                pre.appendChild(document.createTextNode('\n'));
            }
        }

        // CSS animation for blinking cursor
        const style = document.createElement('style');
        style.textContent = `
@keyframes terminal-cursor-blink {
  0%, 49% { box-shadow: inset 0 -3px 0 0 rgba(255,255,255,0.85); }
  50%, 100% { box-shadow: none; }
}
span.terminal-cursor {
  animation: terminal-cursor-blink 0.8s step-end infinite;
}
`;
        this.container.innerHTML = '';
        this.container.appendChild(style);
        this.container.appendChild(pre);
        this._pre = pre;
    }

    // --- Color utilities ---

    /** Convert a color value (integer CLR_* constant or CSS string) to a CSS color. */
    colorToCss(color) {
        if (typeof color === 'string') return color;
        return COLOR_CSS[color] || COLOR_CSS[CLR_GRAY];
    }

    // --- Cell operations ---

    /**
     * Set a character at terminal position (col, row) with color and attributes.
     * color: integer CLR_* constant (0-15) or CSS color string.
     * attr: 0=normal, 1=inverse, 2=bold, 4=underline (can be OR'd together).
     */
    setCell(col, row, ch, color, attr = 0) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;

        // Resolve display color. When this.flags exists, honor its color/use_darkgray options.
        // Applied to grid value (not just DOM) so headless screen capture sees correct colors.
        let displayColor = color;
        if (typeof color === 'number' && this.flags) {
            if (this.flags.color === false) {
                displayColor = CLR_GRAY;
            } else if (color === CLR_BLACK && this.flags.use_darkgray !== false) {
                displayColor = NO_COLOR;
            }
        }

        const cell = this.grid[row][col];
        if (cell.ch === ch && cell.color === displayColor && cell.attr === attr) return;
        cell.ch = ch;
        cell.color = displayColor;
        cell.attr = attr;

        if (!this.spans) return;

        const span = this.spans[row][col];
        span.textContent = ch;
        const css = this.colorToCss(displayColor);

        const isInverse = (attr & ATR_INVERSE) !== 0;
        const isBold = (attr & ATR_BOLD) !== 0;
        const isUnderline = (attr & ATR_UNDERLINE) !== 0;

        if (isInverse) {
            span.style.color = '#000';
            span.style.backgroundColor = css;
        } else {
            span.style.color = css;
            span.style.backgroundColor = '';
        }

        span.style.fontWeight = isBold ? 'bold' : '';
        span.style.textDecoration = isUnderline ? 'underline' : '';
    }

    /** Clear a row to spaces with CLR_GRAY. */
    clearRow(row) {
        for (let c = 0; c < this.cols; c++) {
            this.setCell(c, row, ' ', CLR_GRAY);
        }
    }

    /** Write a string at position (col, row) with optional color and attributes. */
    putstr(col, row, str, color = CLR_GRAY, attr = 0) {
        for (let i = 0; i < str.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, str[i], color, attr);
        }
    }

    /** Clear the entire screen. */
    clearScreen() {
        for (let r = 0; r < this.rows; r++) {
            this.clearRow(r);
        }
        this.setCursor(0, 0);
    }

    // --- Cursor ---

    /** Move the visible cursor to (col, row). 0-based. */
    setCursor(col, row) {
        if (this._cursorSpan) {
            this._cursorSpan.classList.remove('terminal-cursor');
            this._cursorSpan = null;
        }
        this.cursorCol = col;
        this.cursorRow = row;
        if (this.cursorVisible
            && row >= 0 && row < this.rows && col >= 0 && col < this.cols
            && this.spans && this.spans[row] && this.spans[row][col]) {
            this._cursorSpan = this.spans[row][col];
            this._cursorSpan.classList.add('terminal-cursor');
        }
    }

    /** Return [col, row, visible]. */
    getCursor() {
        return [this.cursorCol, this.cursorRow, this.cursorVisible];
    }

    /** Set cursor visibility (truthy = visible). */
    cursSet(visibility) {
        this.cursorVisible = visibility ? 1 : 0;
        if (this._cursorSpan) {
            if (!this.cursorVisible) {
                this._cursorSpan.classList.remove('terminal-cursor');
            } else {
                this._cursorSpan.classList.add('terminal-cursor');
            }
        }
    }

    /** Flush pending output. (DOM writes are immediate, so this is a no-op.) */
    flush() {
        // Browser display is immediate through setCell/DOM writes.
    }

    // --- 1-based legacy wrappers (for curses-style apps) ---

    /** Move cursor to 1-based (x, y). */
    moveCursor(x, y) {
        this.setCursor(x - 1, y - 1);
    }

    /** Write character at 1-based (x, y) with attribute. */
    putChar(x, y, ch, attr = 0) {
        this.setCell(x - 1, y - 1, ch, CLR_GRAY, attr);
    }

    /** Read character at 1-based (x, y). Returns the ch string. */
    getChar(x, y) {
        const col = x - 1;
        const row = y - 1;
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return ' ';
        return this.grid[row][col].ch;
    }

    // --- Cursor-relative writing ---

    /** Write a string at the current cursor position, advancing the cursor. */
    putString(str) {
        for (let i = 0; i < str.length; i++) {
            this.putCharAtCursor(str[i]);
        }
    }

    /** Write a single character at the cursor and advance it one column. */
    putCharAtCursor(ch) {
        if (this.cursorRow >= 0 && this.cursorRow < this.rows
            && this.cursorCol >= 0 && this.cursorCol < this.cols) {
            this.setCell(this.cursorCol, this.cursorRow, ch, CLR_GRAY);
        }
        this.cursorCol++;
    }

    /** Clear from cursor to end of line. */
    clearToEol() {
        const row = this.cursorRow;
        if (row < 0 || row >= this.rows) return;
        for (let c = this.cursorCol; c < this.cols; c++) {
            this.setCell(c, row, ' ', CLR_GRAY);
        }
    }

    /** Scroll all rows up by one; clear the bottom row. */
    scrollUp() {
        // Shift grid data up
        for (let r = 0; r < this.rows - 1; r++) {
            for (let c = 0; c < this.cols; c++) {
                const src = this.grid[r + 1][c];
                this.grid[r][c].ch = src.ch;
                this.grid[r][c].color = src.color;
                this.grid[r][c].attr = src.attr;
            }
        }
        // Clear bottom row
        for (let c = 0; c < this.cols; c++) {
            const cell = this.grid[this.rows - 1][c];
            cell.ch = ' ';
            cell.color = CLR_GRAY;
            cell.attr = 0;
        }
        // Repaint spans if present
        if (this.spans) {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const cell = this.grid[r][c];
                    const span = this.spans[r][c];
                    span.textContent = cell.ch;
                    const css = this.colorToCss(cell.color);
                    const isInverse = (cell.attr & ATR_INVERSE) !== 0;
                    if (isInverse) {
                        span.style.color = '#000';
                        span.style.backgroundColor = css;
                    } else {
                        span.style.color = css;
                        span.style.backgroundColor = '';
                    }
                    span.style.fontWeight = (cell.attr & ATR_BOLD) ? 'bold' : '';
                    span.style.textDecoration = (cell.attr & ATR_UNDERLINE) ? 'underline' : '';
                }
            }
        }
    }

    // --- Accessors ---

    /** Return the <pre> DOM element (or null if headless). */
    getPreElement() {
        return this._pre;
    }

    /** Return the graphics canvas (or null). */
    getCanvas() {
        return this._canvas;
    }

    /** Store a focus point for external scroll-into-view logic. */
    setFocusPoint(col, row) {
        this._focusCol = col;
        this._focusRow = row;
    }
}

/**
 * HeadlessTerminal -- Terminal with no DOM.
 * Screen capture methods will be added later via screen_capture.js.
 */
export class HeadlessTerminal extends Terminal {
    constructor(opts) {
        super(null, opts);
    }
}
