// Async keyboard input queue for Hack browser port.
// Adapted from Menace input.js — same async queue pattern.

export class Interrupted extends Error {
  constructor() { super('Interrupted'); }
}

export class Input {
  constructor() {
    this._queue = [];
    this._resolve = null;
    this._reject = null;
    this._interrupted = false;
    this._bound = this._onKeyDown.bind(this);
    document.addEventListener('keydown', this._bound);
  }

  _onKeyDown(e) {
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (this._reject) {
        const rej = this._reject;
        this._resolve = null; this._reject = null;
        rej(new Interrupted());
      } else {
        this._interrupted = true;
      }
      return;
    }
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

  // Hook called before waiting for input — sync display cursor to game state.
  // Set by the game after construction: input.beforeWait = () => { ... }
  beforeWait = null;

  // await getKey() — returns next key pressed, or throws Interrupted on ^C
  getKey() {
    if (this._interrupted) { this._interrupted = false; return Promise.reject(new Interrupted()); }
    if (this._queue.length > 0) return Promise.resolve(this._queue.shift());
    // Sync display cursor before blocking for input (C: cursor is already
    // at the right position because terminal output moves it naturally)
    if (this.beforeWait) this.beforeWait();
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  destroy() {
    document.removeEventListener('keydown', this._bound);
  }
}
