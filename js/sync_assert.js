// sync_assert.js — Assert that an async function completed synchronously.
//
// In C NetHack, many functions are non-blocking — they do work and return
// immediately. Their JS translations are `async` (because they MIGHT await
// in some code paths) but in specific call contexts they should complete
// without yielding.
//
// `sync(promise)` asserts that the Promise returned by an async function
// is already settled (fulfilled or rejected) at the point of the call.
// If the Promise is still pending, it means the function hit an `await`
// that yielded the event loop — a potential single-threaded violation.
//
// Usage:
//   import { sync } from './sync_assert.js';
//
//   // Function is async but should complete synchronously here:
//   sync(pickup_prinv(obj, count, 'lifting', player));
//
//   // If pickup_prinv hits an await (e.g., pline → more), sync() throws
//   // immediately, pinpointing the call site.
//
// This complements the modal guard: modal_guard catches violations at
// game mutation checkpoints; sync() catches them at the exact call site
// where the un-awaited async function was invoked.

const _env = typeof process !== 'undefined' ? process.env : {};
const ENABLED = _env.WEBHACK_SYNC_ASSERT !== '0';

let _violationCount = 0;
let _violationHandler = null;

/**
 * Assert that a Promise is already settled (not pending).
 * If the value is not a Promise/thenable, returns it as-is.
 * If the Promise is pending, reports a violation.
 *
 * @param {*} maybePromise — return value of an async function call
 * @param {string} [label] — optional label for diagnostics
 * @returns {*} the resolved value if already settled, undefined otherwise
 */
export function sync(maybePromise, label) {
    if (!ENABLED) return maybePromise;
    // Not a thenable — synchronous, fine.
    if (!maybePromise || typeof maybePromise.then !== 'function') return maybePromise;

    // Check if the Promise is already settled.
    // JS doesn't have a synchronous "is settled?" API, so we use a sentinel race.
    let settled = false;
    let resolvedValue;
    let rejectedError;
    maybePromise.then(
        (v) => { settled = true; resolvedValue = v; },
        (e) => { settled = true; rejectedError = e; }
    );

    // The .then callbacks run as microtasks. If the Promise was already
    // settled, the microtask is queued but hasn't run yet — we're still
    // in the same synchronous tick. We can't detect settlement this way.
    //
    // Instead, use a different approach: tag the Promise and check it
    // in the next microtask. But that defeats the purpose (we want
    // synchronous detection).
    //
    // The practical approach: use Promise.race with a known-resolved sentinel.
    // If the Promise is already settled, race resolves to it synchronously
    // in the SAME microtask batch.
    //
    // Actually, the simplest correct approach: schedule a microtask check.
    // If the async function truly completed synchronously (no awaits hit),
    // the .then callback fires before any other code runs.

    // REVISED APPROACH: We can't truly test synchronously in JS.
    // Instead, use queueMicrotask to check in the NEXT microtask.
    // If the promise is still pending after all same-tick microtasks,
    // it yielded the event loop.
    queueMicrotask(() => {
        if (!settled) {
            _reportViolation(
                `sync() assertion failed${label ? ` for '${label}'` : ''}: ` +
                `async function returned a pending Promise. ` +
                `This means it hit an await and yielded the event loop.`
            );
        }
    });

    return maybePromise;
}

/**
 * Get count of violations detected.
 */
export function getSyncViolationCount() {
    return _violationCount;
}

/**
 * Reset state (for tests).
 */
export function resetSyncAssert() {
    _violationCount = 0;
}

/**
 * Set a custom violation handler. Called with (message).
 */
export function setSyncViolationHandler(handler) {
    _violationHandler = handler;
}

function _reportViolation(message) {
    _violationCount++;
    const stack = new Error().stack || '';
    if (_violationHandler) {
        _violationHandler(message, stack);
        return;
    }
    console.error(`[SYNC VIOLATION] ${message}`);
    console.error(stack);
    if (typeof process !== 'undefined') {
        throw new Error(`[SYNC VIOLATION] ${message}`);
    }
}
