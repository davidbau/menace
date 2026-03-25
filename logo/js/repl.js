// Logo REPL — reads lines, evaluates, manages text display.
// Runs in the LogoDisplay's 80×24 character grid.

import { LogoError } from './interpreter.js';

export class LogoRepl {
  constructor(display, interpreter) {
    this._display = display;
    this._interp = interpreter;
    this._row = 0;     // current output row
    this._col = 0;     // current output column
    this._inputBuf = '';
    this._history = [];
    this._historyIdx = -1;
    this._resolver = null; // for async line reads
    this._running = false;

    // Wire interpreter's output to our display
    interpreter._output = (str) => this._write(str);
    interpreter._clearText = () => this._clearText();
    interpreter._readLine = (prompt) => this._promptRead(prompt);
  }

  async start(getch) {
    this._getch = getch;
    this._running = true;

    // Startup banner
    this._write('LOGO  VERSION 1.0  (1982)\n');
    this._write('\n');

    // Main REPL loop
    while (this._running) {
      const prompt = this._interp.isPendingDefinition ? '> ' : '? ';
      this._write(prompt);
      const line = await this._readLine();
      if (line === null) break; // Ctrl-C during startup or similar

      if (this._interp.isPendingDefinition) {
        // Collecting TO..END body
        this._interp.addDefinitionLine(line);
        continue;
      }

      if (line.trim() === '') continue;

      // Add to history
      if (this._history.length === 0 || this._history[this._history.length - 1] !== line) {
        this._history.push(line);
        if (this._history.length > 50) this._history.shift();
      }
      this._historyIdx = -1;

      try {
        await this._interp.run(line);
      } catch (e) {
        if (e instanceof LogoError) {
          this._write(e.message + '\n');
        } else if (e && e.name === 'LogoError') {
          this._write(e.message + '\n');
        } else {
          this._write('ERROR: ' + (e.message || e) + '\n');
        }
      }
    }
  }

  // Write a string to the display at current position
  _write(str) {
    for (const ch of str) {
      if (ch === '\n') {
        this._col = 0;
        this._row++;
        if (this._row >= this._display.rows) {
          this._display.scrollUp();
          this._row = this._display.rows - 1;
        }
        continue;
      }
      if (this._col >= this._display.cols) {
        this._col = 0;
        this._row++;
        if (this._row >= this._display.rows) {
          this._display.scrollUp();
          this._row = this._display.rows - 1;
        }
      }
      this._display.setCell(this._col, this._row, ch);
      this._col++;
    }
    this._display.setCursor(this._col, this._row);
  }

  _clearText() {
    this._display.clearScreen();
    this._row = 0;
    this._col = 0;
  }

  // Read a line with editing (Backspace, Enter, Up/Down history)
  async _readLine() {
    this._inputBuf = '';
    const startCol = this._col;
    const startRow = this._row;

    while (true) {
      this._display.setCursor(startCol + this._inputBuf.length, this._row);
      const code = await this._getch();

      if (code === 13 || code === 10) {
        // Enter
        this._write('\n');
        return this._inputBuf;
      }

      if (code === 8 || code === 127) {
        // Backspace
        if (this._inputBuf.length > 0) {
          this._inputBuf = this._inputBuf.slice(0, -1);
          this._redrawInput(startCol, startRow);
        }
        continue;
      }

      if (code === 3) {
        // Ctrl-C — quit Logo, return to shell (shell adds its own ^C line)
        this._running = false;
        if (typeof window !== 'undefined') {
          if (window._logoDisplay && window._logoDisplay.captureForShell) window._logoDisplay.captureForShell();
          var rows = window._logoDisplay ? window._logoDisplay.getRows() : [];
          try { localStorage.setItem('shell_context', JSON.stringify({ app: 'logo', user: 'rodney', rows: rows })); } catch(e) {}
          window.location.href = '/shell/';
        }
        return null;
      }

      if (code === 12) {
        // Ctrl-L — clear screen
        this._clearText();
        return '';
      }

      if (code === 16) {
        // Up arrow (mapped as Ctrl-P)
        if (this._historyIdx < 0) this._historyIdx = this._history.length;
        if (this._historyIdx > 0) {
          this._historyIdx--;
          this._inputBuf = this._history[this._historyIdx];
          this._redrawInput(startCol, startRow);
        }
        continue;
      }

      if (code === 14) {
        // Down arrow (mapped as Ctrl-N)
        if (this._historyIdx >= 0 && this._historyIdx < this._history.length - 1) {
          this._historyIdx++;
          this._inputBuf = this._history[this._historyIdx];
        } else {
          this._historyIdx = -1;
          this._inputBuf = '';
        }
        this._redrawInput(startCol, startRow);
        continue;
      }

      // Printable character — uppercase (1982 Logo convention)
      if (code >= 32 && code < 127) {
        const ch = String.fromCharCode(code).toUpperCase();
        this._inputBuf += ch;
        this._display.setCell(startCol + this._inputBuf.length - 1, this._row, ch);
        this._display.setCursor(startCol + this._inputBuf.length, this._row);
      }
    }
  }

  _redrawInput(startCol, startRow) {
    // Clear from startCol to end of line
    for (let c = startCol; c < this._display.cols; c++) {
      this._display.setCell(c, startRow, ' ');
    }
    // Redraw input buffer
    for (let i = 0; i < this._inputBuf.length; i++) {
      this._display.setCell(startCol + i, startRow, this._inputBuf[i]);
    }
    this._display.setCursor(startCol + this._inputBuf.length, startRow);
  }

  // For READLIST — prompt and read
  async _promptRead(prompt) {
    if (prompt) this._write(prompt);
    return this._readLine();
  }
}
