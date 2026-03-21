// Logo display — 80×24 transparent character grid over a canvas.
// Adapted from rogue/js/display.js but with transparent cell backgrounds
// so the turtle canvas shows through.

export class LogoDisplay {
  constructor(container) {
    this.COLS = 80;
    this.ROWS = 24;

    // Character grid: [row][col] = { ch, color }  (0-based)
    this.grid = [];
    for (let r = 0; r < this.ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.COLS; c++) {
        this.grid[r][c] = { ch: ' ', color: '#0f0' };
      }
    }

    this.cursorRow = 0;
    this.cursorCol = 0;
    this.cursorVisible = true;

    this._container = container;
    this._pre = null;
    this._spans = [];
    this._cursorSpan = null;
    this._dirty = true;
    this._init();
  }

  _init() {
    const pre = document.createElement('pre');
    pre.id = 'logo-terminal';
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--game-font-size')
    ) || 16;
    const lineHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--game-line-height')
    ) || 1.1875;
    pre.style.cssText = [
      'font-family: "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", monospace',
      `font-size: ${fontSize}px`,
      `line-height: ${lineHeight}`,
      'background: transparent',
      'color: #0f0',
      'margin: 0',
      'padding: 8px',
      'white-space: pre',
      'user-select: none',
      'cursor: default',
      'position: relative',
      'z-index: 1',
    ].join(';');

    // Create per-cell spans for color + cursor support
    this._spans = [];
    for (let r = 0; r < this.ROWS; r++) {
      this._spans[r] = [];
      for (let c = 0; c < this.COLS; c++) {
        const span = document.createElement('span');
        span.textContent = ' ';
        span.style.color = '#0f0';
        span.style.backgroundColor = 'transparent';
        pre.appendChild(span);
        this._spans[r][c] = span;
      }
      if (r < this.ROWS - 1) {
        pre.appendChild(document.createTextNode('\n'));
      }
    }

    // Cursor blink CSS
    const style = document.createElement('style');
    style.textContent = `
@keyframes logo-cursor-blink {
  0%, 49% { background-color: rgba(0, 255, 0, 0.7); color: #000; }
  50%, 100% { background-color: transparent; }
}
span.logo-cursor {
  animation: logo-cursor-blink 0.8s step-end infinite;
}
`;
    this._container.appendChild(style);
    this._container.appendChild(pre);
    this._pre = pre;
  }

  // Put a character at (col, row) with optional color — 0-based
  putChar(col, row, ch, color) {
    if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return;
    const cell = this.grid[row][col];
    cell.ch = ch;
    if (color !== undefined) cell.color = color;
    const span = this._spans[row][col];
    span.textContent = ch;
    span.style.color = cell.color;
  }

  // Write a string starting at (col, row)
  putStr(col, row, str, color) {
    for (let i = 0; i < str.length && col + i < this.COLS; i++) {
      this.putChar(col + i, row, str[i], color);
    }
  }

  // Clear a row
  clearRow(row) {
    for (let c = 0; c < this.COLS; c++) {
      this.putChar(c, row, ' ', '#0f0');
    }
  }

  // Clear entire screen
  clearScreen() {
    for (let r = 0; r < this.ROWS; r++) {
      this.clearRow(r);
    }
    this.cursorRow = 0;
    this.cursorCol = 0;
  }

  // Scroll text up by one row (row 0 disappears, row ROWS-1 becomes blank)
  scrollUp() {
    for (let r = 0; r < this.ROWS - 1; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const src = this.grid[r + 1][c];
        this.putChar(c, r, src.ch, src.color);
      }
    }
    this.clearRow(this.ROWS - 1);
  }

  // Update cursor display
  setCursor(col, row) {
    // Remove old cursor
    if (this._cursorSpan) {
      this._cursorSpan.classList.remove('logo-cursor');
      this._cursorSpan = null;
    }
    this.cursorCol = col;
    this.cursorRow = row;
    if (this.cursorVisible && row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) {
      const span = this._spans[row][col];
      span.classList.add('logo-cursor');
      this._cursorSpan = span;
    }
  }

  // Get the <pre> element (for sizing the canvas to match)
  getPreElement() {
    return this._pre;
  }
}
