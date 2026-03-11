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
    } else {
      // Arrow keys → vi keys
      switch (e.key) {
        case 'ArrowLeft':  ch = 'h'; break;
        case 'ArrowRight': ch = 'l'; break;
        case 'ArrowUp':    ch = 'k'; break;
        case 'ArrowDown':  ch = 'j'; break;
        case 'Escape':     ch = '\x1b'; break;
        case 'Enter':      ch = '\r'; break;
        case 'Backspace':  ch = '\b'; break;
        case ' ':          ch = ' '; break;
      }
    }
    if (ch === null) return;

    // Prevent browser default for game keys
    if ('hjklyubn'.includes(ch) || e.key.startsWith('Arrow')) {
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
