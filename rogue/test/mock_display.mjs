/**
 * mock_display.mjs — DOM-free Display adapter for Node.js testing.
 * Implements the same interface as rogue/js/display.js.
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

    this.curx = 1;
    this.cury = 1;
  }

  moveCursor(x, y) {
    this.curx = x;
    this.cury = y;
  }

  putCharAtCursor(ch) {
    if (this.cury >= 1 && this.cury <= this.ROWS &&
        this.curx >= 1 && this.curx <= this.COLS) {
      this.grid[this.cury][this.curx] = typeof ch === 'number' ? String.fromCharCode(ch) : ch;
    }
    this.curx++;
  }

  putChar(x, y, ch, attr) {
    if (y >= 1 && y <= this.ROWS && x >= 1 && x <= this.COLS) {
      this.grid[y][x] = typeof ch === 'number' ? String.fromCharCode(ch) : ch;
      if (attr) {
        if (!this._attrGrid) {
          this._attrGrid = [];
          for (let r = 0; r <= this.ROWS; r++) this._attrGrid[r] = new Array(this.COLS + 1).fill(0);
        }
        this._attrGrid[y][x] = attr;
      } else if (this._attrGrid) {
        this._attrGrid[y][x] = 0;
      }
    }
  }

  getChar(x, y) {
    if (y >= 1 && y <= this.ROWS && x >= 1 && x <= this.COLS) {
      return this.grid[y][x];
    }
    return ' ';
  }

  putString(str) {
    for (const ch of str) this.putCharAtCursor(ch);
  }

  clearToEol() {
    for (let x = this.curx; x <= this.COLS; x++) {
      this.grid[this.cury][x] = ' ';
    }
  }

  clearScreen() {
    for (let r = 1; r <= this.ROWS; r++) {
      for (let c = 1; c <= this.COLS; c++) {
        this.grid[r][c] = ' ';
      }
    }
    this.curx = 1;
    this.cury = 1;
  }

  flush() {}
  scheduleRender() {}

  // Get cursor position as [row, col] (0-based, matching C's 0-based coords)
  getCursor() {
    return [this.cury - 1, this.curx - 1];
  }

  // Get screen as 24-element array of trimmed strings (0-indexed, rows 0..23)
  getRows() {
    const rows = [];
    for (let r = 1; r <= this.ROWS; r++) {
      let line = this.grid[r].slice(1).join('');
      let end = line.length;
      while (end > 0 && line[end - 1] === ' ') end--;
      rows.push(line.slice(0, end));
    }
    return rows;
  }
}
