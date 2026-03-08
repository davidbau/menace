// Browser display adapter for Rogue 3.6 — 80×24 terminal grid.
// Rogue uses full 24 rows:
//   Row 0 (1-based: row 1): message line (top)
//   Rows 1-22 (1-based: rows 2-23): dungeon map
//   Row 23 (1-based: row 24): status line (bottom)
//
// This class uses 1-based coordinates internally (matching C curses conventions).
// The game code uses 0-based y,x coordinates; caller converts.

export class Display {
  constructor(container) {
    this.COLS = 80;
    this.ROWS = 24;

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
    this._init();
  }

  _init() {
    const pre = document.createElement('pre');
    pre.id = 'rogue-screen';
    pre.style.cssText = [
      'font-family: "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", monospace',
      'font-size: 16px',
      'line-height: 1.2',
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
      const raw = this.grid[r].slice(1).join('');
      let line = '';
      for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '\t') {
          const nextStop = (Math.floor(line.length / 8) + 1) * 8;
          while (line.length < nextStop && line.length < this.COLS) line += ' ';
        } else {
          line += raw[i];
        }
      }
      lines.push(line);
    }
    this._pre.textContent = lines.join('\n');
    this._dirty = false;
  }

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
