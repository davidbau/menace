/**
 * delay.js - Animation timing system
 * JavaScript port of C NetHack's nh_delay_output() (50ms delays)
 */

// Standard delay time in milliseconds (matching C NetHack's msleep(50))
const ANIMATION_DELAY_MS = 50;

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay output for animation timing
 * Matches C NetHack's nh_delay_output() behavior (50ms delay)
 * 
 * Usage:
 *   await delay_output();
 * 
 * @param {number} [ms=50] - Override delay time (default 50ms)
 * @returns {Promise} Resolves after delay
 */
export async function delay_output(ms = ANIMATION_DELAY_MS) {
    // Skip delays in test/debug mode
    if (typeof global !== 'undefined' && global.SKIP_ANIMATION_DELAYS) {
        return;
    }
    if (typeof window !== 'undefined' && window.SKIP_ANIMATION_DELAYS) {
        return;
    }

    await sleep(ms);
}

/**
 * Delay with requestAnimationFrame for smoother animations
 * Alternative to delay_output for browser environments
 * 
 * @param {number} [ms=50] - Target delay time
 * @returns {Promise} Resolves after delay
 */
export async function delay_output_raf(ms = ANIMATION_DELAY_MS) {
    // Skip delays in test/debug mode
    if (typeof global !== 'undefined' && global.SKIP_ANIMATION_DELAYS) {
        return;
    }
    if (typeof window !== 'undefined' && window.SKIP_ANIMATION_DELAYS) {
        return;
    }

    const start = performance.now();
    
    return new Promise(resolve => {
        function checkTime() {
            const elapsed = performance.now() - start;
            if (elapsed >= ms) {
                resolve();
            } else {
                requestAnimationFrame(checkTime);
            }
        }
        requestAnimationFrame(checkTime);
    });
}

/**
 * Set global delay time (for testing or speed control)
 * @param {number} ms - New delay time in milliseconds
 */
export function setAnimationDelay(ms) {
    // Store in module-level variable
    ANIMATION_DELAY_MS = ms;
}

/**
 * Get current delay time
 * @returns {number} Current delay in milliseconds
 */
export function getAnimationDelay() {
    return ANIMATION_DELAY_MS;
}

/**
 * Enable/disable animation delays (for testing)
 * @param {boolean} skip - True to skip delays
 */
export function skipAnimationDelays(skip) {
    if (typeof global !== 'undefined') {
        global.SKIP_ANIMATION_DELAYS = skip;
    }
    if (typeof window !== 'undefined') {
        window.SKIP_ANIMATION_DELAYS = skip;
    }
}

export default {
    delay_output,
    delay_output_raf,
    setAnimationDelay,
    getAnimationDelay,
    skipAnimationDelays,
    ANIMATION_DELAY_MS
};
