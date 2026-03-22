// Async keyboard input queue for Rogue browser port.
// Identical to hack/js/input.js.

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
    let ch = null;
    if (e.key.length === 1) {
      ch = e.key;
    } else {
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

  inject(ch) {
    if (this._resolve) {
      const res = this._resolve;
      this._resolve = null;
      res(ch);
    } else {
      this._queue.push(ch);
    }
  }

  injectAll(keys) {
    for (const ch of keys) this.inject(ch);
  }

  // await getKey() — returns next key pressed, or throws Interrupted on ^C
  getKey() {
    if (this._interrupted) { this._interrupted = false; return Promise.reject(new Interrupted()); }
    if (this._queue.length > 0) return Promise.resolve(this._queue.shift());
    return new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  destroy() {
    document.removeEventListener('keydown', this._bound);
  }
}
