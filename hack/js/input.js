// Async keyboard input queue for Hack browser port.
// Adapted from Menace input.js — same async queue pattern.

export class Input {
  constructor() {
    this._queue = [];
    this._resolve = null;
    this._bound = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._bound);
  }

  _onKeyDown(e) {
    // Translate keydown → character
    let ch = null;
    if (e.key.length === 1) {
      ch = e.key;
      // ctrl+direction letter → uppercase run command (standard 1982 Hack behavior)
      if (e.ctrlKey && 'hjklyubn'.includes(ch)) ch = ch.toUpperCase();
    } else {
      // Arrow keys → vi keys; ctrl+arrow → run (uppercase)
      switch (e.key) {
        case 'ArrowLeft':  ch = e.ctrlKey ? 'H' : 'h'; break;
        case 'ArrowRight': ch = e.ctrlKey ? 'L' : 'l'; break;
        case 'ArrowUp':    ch = e.ctrlKey ? 'K' : 'k'; break;
        case 'ArrowDown':  ch = e.ctrlKey ? 'J' : 'j'; break;
        case 'Escape':     ch = '\x1b'; break;
        case 'Enter':      ch = '\r'; break;
        case 'Backspace':  ch = '\b'; break;
        case ' ':          ch = ' '; break;
      }
    }
    if (ch === null) return;

    // Prevent browser default for game keys (including ctrl+direction)
    if ('hjklyubnHJKLYUBN'.includes(ch) || e.key.startsWith('Arrow')) {
      e.preventDefault();
    }

    if (this._resolve) {
      const res = this._resolve;
      this._resolve = null;
      res(ch);
    } else {
      this._queue.push(ch);
    }
  }

  // Inject a key programmatically (for replay/testing)
  inject(ch) {
    if (this._resolve) {
      const res = this._resolve;
      this._resolve = null;
      res(ch);
    } else {
      this._queue.push(ch);
    }
  }

  // Inject multiple keys
  injectAll(keys) {
    for (const ch of keys) this.inject(ch);
  }

  // await getKey() — returns next key pressed
  getKey() {
    if (this._queue.length > 0) {
      return Promise.resolve(this._queue.shift());
    }
    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  destroy() {
    document.removeEventListener('keydown', this._bound);
  }
}
