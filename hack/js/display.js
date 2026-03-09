// Browser display adapter for 80×24 terminal grid (22 map rows + 2 status lines)
// Adapted from Menace display.js — simplified for Hack's fixed 80×24 layout.
//
// Screen layout (1-based, matching C conventions):
//   Row 1:    message/top line
//   Rows 2-23: map (map y 0-21 → screen rows 2-23)
//   Row 24:   status line (level, gold, hp, str, exp)
//
// This class uses 1-based coordinates internally (matching C curx/cury).

export class Display {
  constructor(container) {
    this.COLS = 80;
    this.ROWS = 24;  // 1 msg + 1 blank + 22 map + 1 status (C uses rows 1..24)

    // Character grid (1-based: grid[row][col], row 1..24, col 1..80)
    this.grid = [];
    for (let r = 0; r <= this.ROWS; r++) {
      this.grid[r] = new Array(this.COLS + 1).fill(' ');
    }

    // Current cursor position (1-based)
    this.curx = 1;
    this.cury = 1;

    this._container = container;
    this._pre = null;
    this._dirty = true;
    this._pendingRaf = false;
    this._init();
  }

  _init() {
    const pre = document.createElement('pre');
    pre.id = 'hack-screen';
    pre.style.cssText = [
      'font-family: "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", monospace',
      'font-size: ' + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-font-size')) || 16) + 'px',
      'line-height: ' + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--game-line-height')) || 1.1875),
      'background: #000',
      'color: #ccc',
      'margin: 0',
      'padding: 8px',
      'white-space: pre',
      'user-select: none',
      'cursor: default',
    ].join(';');
    this._container.appendChild(pre);
    this._pre = pre;
    this._render();
  }

  // Move cursor to (x, y) — 1-based
  moveCursor(x, y) {
    this.curx = x;
    this.cury = y;
  }

  // Put character at current cursor position, advance curx
  putCharAtCursor(ch) {
    if (this.cury >= 1 && this.cury <= this.ROWS &&
        this.curx >= 1 && this.curx <= this.COLS) {
      this.grid[this.cury][this.curx] = typeof ch === 'number' ? String.fromCharCode(ch) : ch;
      this._dirty = true;
    }
    this.curx++;
  }

  // Put character at position (x, y) — 1-based, don't move cursor
  putChar(x, y, ch) {
    if (y >= 1 && y <= this.ROWS && x >= 1 && x <= this.COLS) {
      this.grid[y][x] = typeof ch === 'number' ? String.fromCharCode(ch) : ch;
      this._dirty = true;
    }
  }

  // Get character at position (x, y) — 1-based
  getChar(x, y) {
    if (y >= 1 && y <= this.ROWS && x >= 1 && x <= this.COLS) {
      return this.grid[y][x];
    }
    return ' ';
  }

  // Put a string starting at current cursor, advance curx
  putString(str) {
    for (const ch of str) {
      this.putCharAtCursor(ch);
    }
  }

  // Clear to end of current line from curx
  clearToEol() {
    for (let x = this.curx; x <= this.COLS; x++) {
      this.grid[this.cury][x] = ' ';
    }
    this._dirty = true;
  }

  // Clear entire screen, move cursor to (1,1)
  clearScreen() {
    for (let r = 1; r <= this.ROWS; r++) {
      for (let c = 1; c <= this.COLS; c++) {
        this.grid[r][c] = ' ';
      }
    }
    this.curx = 1;
    this.cury = 1;
    this._dirty = true;
  }

  // Flush — render to DOM
  flush() {
    if (this._dirty) this._render();
  }

  _render() {
    let lines = [];
    for (let r = 1; r <= this.ROWS; r++) {
      let line = this.grid[r].slice(1).join(''); // slice(1) to skip index 0
      lines.push(line);
    }
    // Add cursor indicator (non-destructive — doesn't modify grid)
    // We use a blinking cursor via CSS on a span, for now just render text
    this._pre.textContent = lines.join('\n');
    this._dirty = false;
  }

  // Schedule async render (for when multiple ops happen before next frame)
  scheduleRender() {
    if (!this._pendingRaf) {
      this._pendingRaf = true;
      requestAnimationFrame(() => {
        this._pendingRaf = false;
        if (this._dirty) this._render();
      });
    }
  }
}
