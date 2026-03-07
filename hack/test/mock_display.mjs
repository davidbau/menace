/**
 * mock_display.mjs — DOM-free Display adapter for Node.js testing.
 *
 * Implements the same interface as hack/js/display.js but uses a plain
 * 2D array instead of a DOM element. Used by node_runner.mjs.
 */

export class MockDisplay {
  constructor() {
    this.COLS = 80;
    this.ROWS = 24;

    // Character grid (1-based: grid[row][col], row 1..24, col 1..80)
    this.grid = [];
    for (let r = 0; r <= this.ROWS; r++) {
      this.grid[r] = new Array(this.COLS + 1).fill(' ');
    }

    // Current cursor position (1-based, matching C curx/cury)
    this.curx = 1;
    this.cury = 1;
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
    }
    this.curx++;
  }

  // Put character at position (x, y) — 1-based, don't move cursor
  putChar(x, y, ch) {
    if (y >= 1 && y <= this.ROWS && x >= 1 && x <= this.COLS) {
      this.grid[y][x] = typeof ch === 'number' ? String.fromCharCode(ch) : ch;
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
  }

  // Flush — no-op in mock (no DOM)
  flush() {}

  // scheduleRender — no-op in mock
  scheduleRender() {}

  // Get the screen as an array of 24 strings (0-indexed rows 0..23)
  // Each string is trimmed of trailing spaces (matching C harness format).
  getRows() {
    const rows = [];
    for (let r = 1; r <= this.ROWS; r++) {
      let line = this.grid[r].slice(1).join(''); // skip index 0
      // Trim trailing spaces
      let end = line.length;
      while (end > 0 && line[end - 1] === ' ') end--;
      rows.push(line.slice(0, end));
    }
    return rows;
  }
}
