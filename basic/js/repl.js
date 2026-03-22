// BASIC REPL — immediate mode prompt, uppercase input, Ctrl-C break.

import { BasicError, BreakError } from './interpreter.js';

export class BasicRepl {
  constructor(display, interpreter) {
    this._display = display;
    this._interp = interpreter;
    this._row = 0;
    this._col = 0;
    this._inputBuf = '';
    this._history = [];
    this._historyIdx = -1;
    this._breakFlag = false;

    // Wire interpreter I/O
    interpreter._output = (str) => this._write(str);
    interpreter._input = (prompt) => this._promptRead(prompt);
    interpreter._checkBreak = () => {
      if (this._breakFlag) { this._breakFlag = false; return true; }
      return false;
    };
  }

  async start(getch) {
    this._getch = getch;

    // Startup banner
    this._write('BASIC  1.0  (1982)\n');
    this._write('READY.\n');

    // Main REPL loop
    while (true) {
      this._write(']');
      const line = await this._readLine();
      if (line === null) continue;

      if (this._history.length === 0 || this._history[this._history.length - 1] !== line) {
        if (line.trim()) this._history.push(line);
        if (this._history.length > 50) this._history.shift();
      }
      this._historyIdx = -1;

      try {
        await this._interp.execImmediate(line);
      } catch (e) {
        if (e instanceof BasicError) {
          let msg = e.message;
          if (e.lineNum) msg += ` IN ${e.lineNum}`;
          this._write(msg + '\n');
        } else if (e instanceof BreakError) {
          this._write('\nBREAK\n');
        } else {
          this._write('?ERROR: ' + (e.message || e) + '\n');
        }
      }
    }
  }

  _write(str) {
    for (const ch of str) {
      if (ch === '\n') {
        this._col = 0;
        this._row++;
        if (this._row >= this._display.ROWS) {
          this._display.scrollUp();
          this._row = this._display.ROWS - 1;
        }
        continue;
      }
      if (this._col >= this._display.COLS) {
        this._col = 0;
        this._row++;
        if (this._row >= this._display.ROWS) {
          this._display.scrollUp();
          this._row = this._display.ROWS - 1;
        }
      }
      this._display.putChar(this._col, this._row, ch);
      this._col++;
    }
    this._display.setCursor(this._col, this._row);
  }

  async _readLine() {
    this._inputBuf = '';
    const startCol = this._col;

    while (true) {
      this._display.setCursor(startCol + this._inputBuf.length, this._row);
      const code = await this._getch();

      if (code === 13 || code === 10) {
        this._write('\n');
        return this._inputBuf;
      }

      if (code === 8 || code === 127) {
        if (this._inputBuf.length > 0) {
          this._inputBuf = this._inputBuf.slice(0, -1);
          this._redrawInput(startCol);
        }
        continue;
      }

      if (code === 3) {
        // Ctrl-C — break running program or quit if at prompt
        if (this._interp._running) {
          this._breakFlag = true;
        } else {
          // At the prompt, Ctrl-C exits to shell
          this._write('^C\n');
          if (typeof window !== 'undefined') {
            var rows = window._basicDisplay ? window._basicDisplay.getRows() : [];
            try { localStorage.setItem('shell_context', JSON.stringify({ app: 'basic', user: 'rodney', rows: rows })); } catch(e) {}
            window.location.href = '/shell/';
          }
          return null;
        }
        continue;
      }

      if (code === 16) { // Up arrow
        if (this._historyIdx < 0) this._historyIdx = this._history.length;
        if (this._historyIdx > 0) {
          this._historyIdx--;
          this._inputBuf = this._history[this._historyIdx];
          this._redrawInput(startCol);
        }
        continue;
      }

      if (code === 14) { // Down arrow
        if (this._historyIdx >= 0 && this._historyIdx < this._history.length - 1) {
          this._historyIdx++;
          this._inputBuf = this._history[this._historyIdx];
        } else {
          this._historyIdx = -1;
          this._inputBuf = '';
        }
        this._redrawInput(startCol);
        continue;
      }

      // Printable — uppercase
      if (code >= 32 && code < 127) {
        const ch = String.fromCharCode(code).toUpperCase();
        this._inputBuf += ch;
        this._display.putChar(startCol + this._inputBuf.length - 1, this._row, ch);
        this._display.setCursor(startCol + this._inputBuf.length, this._row);
      }
    }
  }

  _redrawInput(startCol) {
    for (let c = startCol; c < this._display.COLS; c++) {
      this._display.putChar(c, this._row, ' ');
    }
    for (let i = 0; i < this._inputBuf.length; i++) {
      this._display.putChar(startCol + i, this._row, this._inputBuf[i]);
    }
    this._display.setCursor(startCol + this._inputBuf.length, this._row);
  }

  async _promptRead(prompt) {
    if (prompt) this._write(prompt);
    return this._readLine();
  }
}
