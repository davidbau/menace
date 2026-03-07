/**
 * mock_input.mjs — DOM-free Input adapter for Node.js testing.
 *
 * Implements the same interface as hack/js/input.js but without
 * document.addEventListener. Used by node_runner.mjs.
 */

export class MockInput {
  constructor() {
    this._queue = [];
    this._resolve = null;
  }

  // Inject a single key programmatically
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

  // await getKey() — returns next queued character
  getKey() {
    if (this._queue.length > 0) {
      return Promise.resolve(this._queue.shift());
    }
    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  // destroy — no-op (no DOM listener to remove)
  destroy() {}
}
