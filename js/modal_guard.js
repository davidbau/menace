// modal_guard.js — Single-threaded modal ownership assertions.
//
// C NetHack is single-threaded. When more() calls wgetch(), the CPU blocks
// and nothing else executes until the key is pressed. In JS, `await nhgetch()`
// yields the event loop, allowing any pending microtask to run.
//
// This module enforces the C contract in JS: when a modal operation (more,
// yn_function, getlin, direction prompt) is waiting for input, no other
// game code should be executing. Any violation means the JS execution order
// diverges from C's.
//
// Usage:
//   import { enterModal, exitModal, assertNotInModal, getModalOwner } from './modal_guard.js';
//
//   // In more(), yn_function(), getlin():
//   enterModal('more');
//   try {
//       const key = await nhgetch();  // only allowed operation
//   } finally {
//       exitModal('more');
//   }
//
//   // In any async game function that shouldn't run during a modal wait:
//   assertNotInModal('moveloop_core');  // throws if a modal is active
//
// The guard is lightweight (one string comparison) and can be enabled/disabled
// via the WEBHACK_MODAL_GUARD env flag for production vs debugging.

const _env = typeof process !== 'undefined' ? process.env : {};
const ENABLED = _env.WEBHACK_MODAL_GUARD !== '0'; // enabled by default

let _modalOwner = null;   // string identifying the active modal ('more', 'yn', 'getlin', etc.)
let _modalStack = [];      // stack for nested modals (shouldn't happen but defensive)
let _modalEntryStack = null; // call stack at the point enterModal was called (for debugging)
let _violationCount = 0;
let _violationHandler = null;

/**
 * Enter a modal wait state. Only nhgetch calls from this owner are allowed
 * until exitModal is called.
 *
 * @param {string} owner — identifier for the modal operation ('more', 'yn', 'getlin', 'direction')
 */
export function enterModal(owner) {
    if (!ENABLED) return;
    if (_modalOwner) {
        // Nested modal — push current onto stack (with its entry trace)
        _modalStack.push({ owner: _modalOwner, stack: _modalEntryStack });
    }
    _modalOwner = owner;
    _modalEntryStack = new Error(`enterModal('${owner}')`).stack || null;
}

/**
 * Exit a modal wait state. Must match the most recent enterModal.
 *
 * @param {string} owner — must match the current modal owner
 */
export function exitModal(owner) {
    if (!ENABLED) return;
    if (_modalOwner !== owner) {
        _reportViolation(`exitModal('${owner}') but current owner is '${_modalOwner}'`);
    }
    const prev = _modalStack.pop();
    _modalOwner = prev?.owner || null;
    _modalEntryStack = prev?.stack || null;
}

/**
 * Assert that no modal wait is active. Call this at the start of any
 * game code that should not execute during a modal pause.
 *
 * In C, this code would never run during more()/yn_function()/getlin()
 * because the process is blocked in wgetch(). In JS, if this fires,
 * it means some code is taking advantage of the await-yield to run
 * when it shouldn't.
 *
 * @param {string} caller — identifier for the code asserting (for diagnostics)
 */
export function assertNotInModal(caller) {
    if (!ENABLED || !_modalOwner) return;
    _reportViolation(
        `Game code '${caller}' ran while modal '${_modalOwner}' owns input. `
        + `In C this would be impossible (wgetch blocks). `
        + `This indicates an async ordering bug.`,
        _modalEntryStack
    );
}

/**
 * Get the current modal owner (for diagnostics). Returns null if no modal active.
 */
export function getModalOwner() {
    return _modalOwner;
}

/**
 * Get count of violations detected (for test assertions).
 */
export function getViolationCount() {
    return _violationCount;
}

/**
 * Reset state (for tests).
 */
export function resetModalGuard() {
    _modalOwner = null;
    _modalStack = [];
    _violationCount = 0;
}

/**
 * Set a custom violation handler (for tests). Called with (message, stack).
 * Set to null to use default (console.error + throw).
 */
export function setViolationHandler(handler) {
    _violationHandler = handler;
}

function _reportViolation(message, modalEntryStack) {
    _violationCount++;
    const violationStack = new Error().stack || '';
    if (_violationHandler) {
        _violationHandler(message, violationStack, modalEntryStack);
        return;
    }
    console.error(`[MODAL VIOLATION] ${message}`);
    console.error(`Violation occurred at:\n${violationStack}`);
    if (modalEntryStack) {
        console.error(`Modal was entered at:\n${modalEntryStack}`);
    }
    // In development, throw to make violations loud and unfixable.
    // In production (browser), log but don't crash.
    if (typeof process !== 'undefined') {
        throw new Error(`[MODAL VIOLATION] ${message}`);
    }
}
