// test/comparison/test_result_format.js
// Standard test result format for all test types
//
// Supports:
// - Session tests (chargen, gameplay, interface, special)
// - Unit tests
// - E2E tests
//
// Used by test runners and stored in git notes.

import { execSync } from 'node:child_process';

/**
 * Create a generic test result (for unit/e2e tests)
 * @param {string} name - Test name or file
 * @param {string} type - Test type: 'unit', 'e2e', etc.
 * @returns {Object} Test result object
 */
export function createTestResult(name, type) {
    return {
        test: name,
        type,
        passed: true,
        duration: null, // ms, set via setDuration()
    };
}

/**
 * Set duration on a result (works for both session and generic tests)
 * @param {Object} result - Test result object
 * @param {number} durationMs - Duration in milliseconds
 */
export function setDuration(result, durationMs) {
    result.duration = durationMs;
}

/**
 * Create a new session test result
 * @param {Object} session - Session object with file, seed, type info
 * @returns {Object} Test result object
 */
export function createSessionResult(session) {
    const result = {
        session: session.file,
        type: inferSessionType(session.file),
        seed: session.seed,
        passed: true,
        metrics: {
            rngCalls: { matched: 0, total: 0 },
            keys: { matched: 0, total: 0 },
            grids: { matched: 0, total: 0 },
            screens: { matched: 0, total: 0 },
            colors: { matched: 0, total: 0 },
            screenWindow: { matched: 0, total: 0, earlyOnlyCount: 0 },
            colorWindow: { matched: 0, total: 0, earlyOnlyCount: 0 },
            events: { matched: 0, total: 0 },
            mapdump: { matched: 0, total: 0 },
            animationBoundaries: { matched: 0, total: 0 },
            cursor: { matched: 0, total: 0 },
        },
    };

    // Add metadata based on session type
    if (result.type === 'chargen') {
        const match = session.file.match(/chargen_(\w+)/);
        if (match) result.role = match[1];
        // Check for race/alignment variants
        const variant = session.file.match(/chargen_\w+_(\w+)\./);
        if (variant) result.variant = variant[1];
    }

    return result;
}

/**
 * Infer session type from filename
 */
function inferSessionType(filename) {
    if (filename.includes('_chargen')) return 'chargen';
    if (filename.includes('_gameplay')) return 'gameplay';
    if (filename.includes('interface_')) return 'interface';
    if (filename.includes('_special_')) return 'special';
    if (filename.startsWith('seed') && filename.includes('_')) {
        // Option tests like seed301_verbose_on
        const parts = filename.split('_');
        if (parts.length >= 2 && !parts[1].includes('chargen') && !parts[1].includes('gameplay')) {
            return 'option';
        }
    }
    return 'unknown';
}

/**
 * Record RNG comparison for a session
 */
export function recordRng(result, matched, total, divergence = null) {
    result.metrics.rngCalls.matched += matched;
    result.metrics.rngCalls.total += total;
    if (matched < total) {
        result.passed = false;
        if (!result.firstDivergence && divergence) {
            result.firstDivergence = divergence;
        }
    }
}

/**
 * Record keystroke comparison
 */
export function recordKeys(result, matched, total) {
    result.metrics.keys.matched += matched;
    result.metrics.keys.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record grid comparison
 */
export function recordGrids(result, matched, total) {
    result.metrics.grids.matched += matched;
    result.metrics.grids.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record screen comparison
 */
export function recordScreens(result, matched, total) {
    result.metrics.screens.matched += matched;
    result.metrics.screens.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record color/ANSI screen comparison
 */
export function recordColors(result, matched, total) {
    result.metrics.colors.matched += matched;
    result.metrics.colors.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record screen-window comparison (non-gating).
 */
export function recordScreenWindow(result, matched, total, earlyOnlyCount = 0) {
    result.metrics.screenWindow.matched += matched;
    result.metrics.screenWindow.total += total;
    result.metrics.screenWindow.earlyOnlyCount += Math.max(0, Number(earlyOnlyCount) || 0);
}

/**
 * Record color-window comparison (non-gating).
 */
export function recordColorWindow(result, matched, total, earlyOnlyCount = 0) {
    result.metrics.colorWindow.matched += matched;
    result.metrics.colorWindow.total += total;
    result.metrics.colorWindow.earlyOnlyCount += Math.max(0, Number(earlyOnlyCount) || 0);
}

/**
 * Record event log comparison.
 * Event parity is required for a session to pass.
 */
export function recordEvents(result, matched, total) {
    result.metrics.events.matched += matched;
    result.metrics.events.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record mapdump checkpoint comparison.
 * Mapdump parity is required when checkpoints are present.
 */
export function recordMapdump(result, matched, total) {
    result.metrics.mapdump.matched += matched;
    result.metrics.mapdump.total += total;
    if (matched < total) {
        result.passed = false;
    }
}

/**
 * Record animation delay-boundary comparison.
 * This is a parallel metric and does not currently change pass/fail.
 */
export function recordAnimationBoundaries(result, matched, total) {
    result.metrics.animationBoundaries.matched += matched;
    result.metrics.animationBoundaries.total += total;
}

/**
 * Record cursor position comparison (non-gating).
 */
export function recordCursor(result, matched, total) {
    result.metrics.cursor.matched += matched;
    result.metrics.cursor.total += total;
}

/**
 * Mark session as failed with optional error
 */
export function markFailed(result, error = null) {
    result.passed = false;
    if (error) {
        result.error = typeof error === 'string' ? error : error.message;
        if (error && typeof error === 'object' && typeof error.stack === 'string') {
            result.errorStack = error.stack;
        }
    }
}

/**
 * Finalize a result - remove empty/default fields
 */
export function finalizeResult(result) {
    // Remove zero-total metrics for cleaner output
    if (result.metrics) {
        const m = result.metrics;
        if (m.rngCalls?.total === 0) delete m.rngCalls;
        if (m.keys?.total === 0) delete m.keys;
        if (m.grids?.total === 0) delete m.grids;
        if (m.screens?.total === 0) delete m.screens;
        if (m.colors?.total === 0) delete m.colors;
        if (m.screenWindow?.total === 0) delete m.screenWindow;
        if (m.colorWindow?.total === 0) delete m.colorWindow;
        if (m.events?.total === 0) delete m.events;
        if (m.mapdump?.total === 0) delete m.mapdump;
        if (m.animationBoundaries?.total === 0) delete m.animationBoundaries;
        if (m.cursor?.total === 0) delete m.cursor;

        // Remove empty metrics object
        if (Object.keys(m).length === 0) delete result.metrics;
    }

    // Remove null duration
    if (result.duration === null) delete result.duration;

    return result;
}

/**
 * Create a results bundle from multiple session results
 * @param {Object[]} results - Array of session results
 * @param {Object} options - Bundle options
 * @returns {Object} Results bundle
 */
export function createResultsBundle(results, options = {}) {
    const bundle = {
        timestamp: new Date().toISOString(),
        commit: options.commit || getGitCommit(),
        goldenBranch: options.goldenBranch || null,
        results: results.map(finalizeResult),
    };

    // Add summary counts
    bundle.summary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
    };

    const gameplayResults = results.filter((r) => r.type === 'gameplay');
    if (gameplayResults.length > 0) {
        const rngComparable = gameplayResults.filter((r) => r.metrics?.rngCalls?.total > 0);
        const eventsComparable = gameplayResults.filter((r) => r.metrics?.events?.total > 0);
        const animationComparable = gameplayResults.filter((r) => r.metrics?.animationBoundaries?.total > 0);
        const screenWindowComparable = gameplayResults.filter((r) => r.metrics?.screenWindow?.total > 0);
        const colorWindowComparable = gameplayResults.filter((r) => r.metrics?.colorWindow?.total > 0);
        const cursorComparable = gameplayResults.filter((r) => r.metrics?.cursor?.total > 0);
        const rngFull = gameplayResults.filter((r) =>
            r.metrics?.rngCalls?.total > 0
            && r.metrics.rngCalls.matched === r.metrics.rngCalls.total
        );
        const eventsFull = gameplayResults.filter((r) =>
            r.metrics?.events?.total > 0
            && r.metrics.events.matched === r.metrics.events.total
        );
        const animationFull = gameplayResults.filter((r) =>
            r.metrics?.animationBoundaries?.total > 0
            && r.metrics.animationBoundaries.matched === r.metrics.animationBoundaries.total
        );
        const rngFullButEventsNot = gameplayResults.filter((r) =>
            r.metrics?.rngCalls?.total > 0
            && r.metrics.rngCalls.matched === r.metrics.rngCalls.total
            && r.metrics?.events?.total > 0
            && r.metrics.events.matched !== r.metrics.events.total
        );
        const eventsFullButRngNot = gameplayResults.filter((r) =>
            r.metrics?.events?.total > 0
            && r.metrics.events.matched === r.metrics.events.total
            && r.metrics?.rngCalls?.total > 0
            && r.metrics.rngCalls.matched !== r.metrics.rngCalls.total
        );
        const cursorFull = gameplayResults.filter((r) =>
            r.metrics?.cursor?.total > 0
            && r.metrics.cursor.matched === r.metrics.cursor.total
        );
        const rerecordCandidates = gameplayResults.filter((r) =>
            (r.metrics?.screenWindow?.earlyOnlyCount || 0) > 0
            || (r.metrics?.colorWindow?.earlyOnlyCount || 0) > 0
        );
        const moreOwnerMissingSessions = gameplayResults.filter((r) =>
            Number(r.synclockDiagnostics?.counts?.['boundary.more.owner-missing'] || 0) > 0
        );
        const moreFallbackSessions = gameplayResults.filter((r) =>
            Number(r.synclockDiagnostics?.counts?.['boundary.more.fallback-no-owner'] || 0) > 0
        );
        bundle.summary.gameplayParity = {
            sessions: gameplayResults.length,
            rngComparable: rngComparable.length,
            eventsComparable: eventsComparable.length,
            animationComparable: animationComparable.length,
            screenWindowComparable: screenWindowComparable.length,
            colorWindowComparable: colorWindowComparable.length,
            cursorComparable: cursorComparable.length,
            rngFull: rngFull.length,
            eventsFull: eventsFull.length,
            animationFull: animationFull.length,
            cursorFull: cursorFull.length,
            rngFullButEventsNot: rngFullButEventsNot.length,
            eventsFullButRngNot: eventsFullButRngNot.length,
            rerecordCandidates: rerecordCandidates.length,
            moreOwnerMissingSessions: moreOwnerMissingSessions.length,
            moreFallbackSessions: moreFallbackSessions.length,
        };
    }

    return bundle;
}

/**
 * Get current git commit hash
 */
function getGitCommit() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim().slice(0, 8);
    } catch {
        return '';
    }
}

/**
 * Format a single result for console output
 */
export function formatResult(result) {
    const status = result.passed ? 'PASS' : 'FAIL';
    const m = result.metrics || {};
    const parts = [`[${status}] ${result.session}`];

    if (m.rngCalls) parts.push(`rng=${m.rngCalls.matched}/${m.rngCalls.total}`);
    if (m.grids) parts.push(`grids=${m.grids.matched}/${m.grids.total}`);
    if (m.screens) parts.push(`screens=${m.screens.matched}/${m.screens.total}`);
    if (m.colors) parts.push(`colors=${m.colors.matched}/${m.colors.total}`);
    if (m.screenWindow) parts.push(`screenWindow=${m.screenWindow.matched}/${m.screenWindow.total}`);
    if (m.colorWindow) parts.push(`colorWindow=${m.colorWindow.matched}/${m.colorWindow.total}`);
    if ((m.screenWindow?.earlyOnlyCount || 0) > 0 || (m.colorWindow?.earlyOnlyCount || 0) > 0) {
        parts.push(`earlyOnly=${(m.screenWindow?.earlyOnlyCount || 0) + (m.colorWindow?.earlyOnlyCount || 0)}`);
    }
    if (m.events) parts.push(`events=${m.events.matched}/${m.events.total}`);
    if (m.mapdump) parts.push(`mapdump=${m.mapdump.matched}/${m.mapdump.total}`);
    if (m.animationBoundaries) parts.push(`anim=${m.animationBoundaries.matched}/${m.animationBoundaries.total}`);
    if (m.cursor) parts.push(`cursor=${m.cursor.matched}/${m.cursor.total}`);
    const synclockCounts = result.synclockDiagnostics?.counts || null;
    if (synclockCounts) {
        const ownerMissing = Number(synclockCounts['boundary.more.owner-missing'] || 0);
        const fallbackNoOwner = Number(synclockCounts['boundary.more.fallback-no-owner'] || 0);
        if (ownerMissing > 0 || fallbackNoOwner > 0) {
            parts.push(`moreOwner(ownerMissing=${ownerMissing},fallback=${fallbackNoOwner})`);
        }
    }
    if (result.error) parts.push(`error: ${result.error}`);

    return parts.join(' ');
}

/**
 * Format bundle summary for console output
 */
export function formatBundleSummary(bundle) {
    const s = bundle.summary;
    const lines = [
        `Commit: ${bundle.commit || '(unknown)'}`,
        `Tests: ${s.passed}/${s.total} passed (${s.failed} failed)`,
    ];
    if (bundle.goldenBranch) {
        lines.splice(1, 0, `Golden: ${bundle.goldenBranch}`);
    }
    if (bundle.summary?.gameplayParity) {
        const g = bundle.summary.gameplayParity;
        lines.push(
            `Gameplay parity: rngFull=${g.rngFull}/${g.rngComparable}, `
            + `eventsFull=${g.eventsFull}/${g.eventsComparable}, `
            + `animFull=${g.animationFull}/${g.animationComparable}, `
            + `cursorFull=${g.cursorFull || 0}/${g.cursorComparable || 0}, `
            + `rngFull&&eventsNot=${g.rngFullButEventsNot}, `
            + `eventsFull&&rngNot=${g.eventsFullButRngNot}, `
            + `rerecordCandidates=${g.rerecordCandidates || 0}, `
            + `moreOwnerMissing=${g.moreOwnerMissingSessions || 0}, `
            + `moreFallback=${g.moreFallbackSessions || 0}`
        );
    }
    return lines.join('\n');
}

/**
 * Merge multiple bundles into one (e.g., session + unit + e2e)
 * @param {Object[]} bundles - Array of result bundles
 * @param {Object} options - Override options (commit, timestamp)
 * @returns {Object} Merged bundle
 */
export function mergeBundles(bundles, options = {}) {
    const allResults = bundles.flatMap(b => b.results || []);
    const merged = {
        timestamp: options.timestamp || new Date().toISOString(),
        commit: options.commit || bundles[0]?.commit || getGitCommit(),
        goldenBranch: bundles.find(b => b.goldenBranch)?.goldenBranch || null,
        results: allResults,
        summary: {
            total: allResults.length,
            passed: allResults.filter(r => r.passed).length,
            failed: allResults.filter(r => !r.passed).length,
        },
    };
    return merged;
}
