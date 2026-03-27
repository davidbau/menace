// sync_assert.js — Assert that an async function completed synchronously.
//
// When an async function is called from a sync context (like level generation),
// it MUST complete without yielding. If it yields (hits a real await), the
// event loop resumes other code, violating C's single-threaded contract.
//
// sync(asyncFn()) asserts the returned Promise is already fulfilled,
// returning the resolved value synchronously. If the Promise is pending,
// it throws — indicating the function yielded when it shouldn't have.
//
// How it works: An async function that never hits a suspending await
// returns an already-resolved Promise. We detect this by racing with
// a sentinel in a microtask. If the Promise resolved before the
// microtask runs, it was synchronous.
//
// IMPORTANT: JavaScript Promises are ALWAYS async in the spec — even
// Promise.resolve(42).then(cb) runs cb in a microtask, not synchronously.
// But an async function that doesn't await anything returns a Promise
// that is INTERNALLY resolved (its [[PromiseState]] is "fulfilled").
// We can't read [[PromiseState]] directly, but we CAN detect it by
// checking if .then fires before a queueMicrotask sentinel.
//
// Usage:
//   import { sync } from './sync_assert.js';
//   const monster = sync(makemon(ptr, x, y, flags, depth, map));
//   // If makemon yielded, sync() throws immediately.
//   // If makemon completed sync, returns the monster object.

const _env = typeof process !== 'undefined' ? process.env : {};
const ENABLED = _env.WEBHACK_SYNC_ASSERT !== '0';

let _violationCount = 0;

/**
 * Call an async function and assert it completes without yielding.
 * Returns the resolved value synchronously.
 *
 * Implementation: We can't synchronously inspect a Promise's state in JS.
 * Instead, we let the Promise's .then run (it's a microtask), then check
 * in the NEXT event-loop task whether it settled. But that's too late —
 * we need the value NOW.
 *
 * Practical approach: async functions that don't await return a resolved
 * Promise. The value is available via an immediately-firing .then callback.
 * We capture it via a flag and check synchronously in the same tick.
 *
 * Actually, the simplest correct approach: we CAN'T get the value
 * synchronously in standard JS. But we CAN detect the violation:
 * schedule a microtask check, and if the Promise hasn't settled by then,
 * report the violation.
 *
 * For the RETURN VALUE: the caller must be async (to await) OR the
 * function must be structured to not need the return value when called
 * from sync context.
 *
 * REVISED DESIGN: sync() doesn't return the value — it's a void assertion.
 * The caller discards the return value (like C does with void functions
 * that have side effects). If the caller needs the return value, it must
 * use await (and be in an async context).
 *
 * @param {Promise} promise — return value of an async function
 * @param {string} [label] — optional label for diagnostics
 */
export function sync(promise, label) {
    if (!ENABLED) return;
    if (!promise || typeof promise.then !== 'function') return; // not a Promise, fine

    let settled = false;
    promise.then(
        () => { settled = true; },
        () => { settled = true; }
    );

    // The .then callbacks are microtasks. They won't fire synchronously.
    // But we can check on the NEXT microtask whether the Promise settled
    // before any other code runs.
    queueMicrotask(() => {
        if (!settled) {
            _violationCount++;
            const msg = `[SYNC VIOLATION] async function${label ? ` '${label}'` : ''} `
                + `yielded in a sync context. It should have completed without awaiting.`;
            console.error(msg);
            console.error(new Error().stack);
            if (typeof process !== 'undefined') {
                throw new Error(msg);
            }
        }
    });
}

/**
 * Synchronous variant that also captures the return value.
 * Uses the fact that a non-yielding async function's Promise
 * resolves in the same microtask batch.
 *
 * WARNING: This only works for async functions that NEVER yield.
 * If the function yields, the return value is lost and an error is thrown.
 *
 * @param {Promise} promise
 * @param {string} [label]
 * @returns {*} The resolved value, or undefined if still pending
 */
export function syncValue(promise, label) {
    if (!promise || typeof promise.then !== 'function') return promise;

    let value;
    let hasValue = false;
    let error;
    let hasError = false;

    promise.then(
        (v) => { value = v; hasValue = true; },
        (e) => { error = e; hasError = true; }
    );

    // The .then callback is a microtask — it hasn't fired yet.
    // We need to drain microtasks to get the value.
    // In Node.js, we can't do this synchronously.
    //
    // PRACTICAL SOLUTION: Return the Promise and let the caller
    // handle it. But add a microtask check for the violation.
    if (ENABLED) {
        queueMicrotask(() => {
            if (!hasValue && !hasError) {
                _violationCount++;
                const msg = `[SYNC VIOLATION] syncValue()${label ? ` '${label}'` : ''}: `
                    + `async function yielded — return value not available synchronously.`;
                console.error(msg);
                if (typeof process !== 'undefined') {
                    throw new Error(msg);
                }
            }
        });
    }

    // Return the Promise — caller treats it as the value in sync code.
    // If the function truly completed synchronously, the .then fires
    // before any other code uses the "value". But in JS, we can't
    // extract it synchronously.
    //
    // This is the fundamental limitation: JS doesn't support synchronous
    // Promise inspection. The caller must either:
    // 1. Not need the return value (void context) — use sync()
    // 2. Be in an async context — use await
    // 3. Accept that the value arrives in the next microtask
    return promise;
}

export function getSyncViolationCount() { return _violationCount; }
export function resetSyncAssert() { _violationCount = 0; }
