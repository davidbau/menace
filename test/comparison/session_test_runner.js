// test/comparison/session_test_runner.js -- Unified session runner orchestrator.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    replaySession,
} from '../../js/replay_core.js';
import { NetHackGame } from '../../js/nethack.js';
import {
    createHeadlessInput,
    HeadlessDisplay,
    generateMapsWithCoreReplay,
    generateStartupWithCoreReplay,
} from '../../js/headless_runtime.js';
import {
    enableRngLog,
    getRngLog,
    disableRngLog,
} from '../../js/rng.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import {
    compareRng,
    compareGrids,
    compareScreenLines,
    findFirstGridDiff,
} from './comparators.js';
import { loadAllSessions, stripAnsiSequences } from './session_loader.js';
import {
    createSessionResult,
    recordRng,
    recordGrids,
    recordScreens,
    markFailed,
    setDuration,
    createResultsBundle,
    formatResult,
    formatBundleSummary,
} from './test_result_format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');
const SKIP_SESSIONS = new Set(['seed6_tourist_gameplay.session.json']);

function createReplayResult(session) {
    const result = createSessionResult({
        file: session.file,
        seed: session.meta.seed,
    });
    result.type = session.meta.type;
    return result;
}

function recordRngComparison(result, actual, expected, context = {}) {
    const cmp = compareRng(actual, expected);
    const divergence = cmp.firstDivergence
        ? { channel: 'rng', ...cmp.firstDivergence, ...context }
        : null;
    recordRng(result, cmp.matched, cmp.total, divergence);
}

function getExpectedScreenLines(stepLike) {
    if (!stepLike) return [];
    if (Array.isArray(stepLike.screenAnsi)) return stepLike.screenAnsi.map((line) => stripAnsiSequences(line));
    if (Array.isArray(stepLike.screen)) return stepLike.screen.map((line) => stripAnsiSequences(line));
    if (typeof stepLike.screen === 'string') return stepLike.screen.split('\n').map((line) => stripAnsiSequences(line));
    return [];
}

function normalizeInterfaceLineForComparison(line) {
    const text = String(line || '').replace(/\s+$/, '');
    if (/^\s*NetHack,\s+Copyright\b/.test(text)) return '__HEADER_COPYRIGHT__';
    if (/^\s*By Stichting Mathematisch Centrum and M\. Stephenson\./.test(text)) return '__HEADER_AUTHOR__';
    if (/^\s*Version\b/.test(text)) return '__HEADER_VERSION__';
    if (/^\s*See license for details\./.test(text)) return '__HEADER_LICENSE__';
    return text;
}

function normalizeInterfaceScreenLines(lines) {
    return (Array.isArray(lines) ? lines : []).map((line) => normalizeInterfaceLineForComparison(line));
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForStableScreen(display, {
    timeoutMs = 600,
    intervalMs = 5,
    stableReads = 3,
    requireNonEmpty = false,
} = {}) {
    const start = Date.now();
    let lastSig = null;
    let stableCount = 0;
    let latest = display.getScreenLines() || [];

    while (Date.now() - start < timeoutMs) {
        const lines = display.getScreenLines() || [];
        latest = lines;
        const hasContent = lines.some((line) => String(line || '').trim().length > 0);
        if (requireNonEmpty && !hasContent) {
            await sleep(intervalMs);
            continue;
        }
        const sig = lines.join('\n');
        if (sig === lastSig) {
            stableCount++;
            if (stableCount >= stableReads) return lines;
        } else {
            lastSig = sig;
            stableCount = 1;
        }
        await sleep(intervalMs);
    }
    return latest;
}

async function replayInterfaceSession(session) {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = { location: { search: '' } };
    } else if (!globalThis.window.location) {
        globalThis.window.location = { search: '' };
    } else if (typeof globalThis.window.location.search !== 'string') {
        globalThis.window.location.search = '';
    }
    const backing = new Map();
    globalThis.localStorage = {
        getItem(key) { return backing.has(key) ? backing.get(key) : null; },
        setItem(key, value) { backing.set(key, String(value)); },
        removeItem(key) { backing.delete(key); },
        clear() { backing.clear(); },
    };

    const seed = session.meta.seed;
    const display = new HeadlessDisplay();
    const input = createHeadlessInput();
    const game = new NetHackGame({ display, input });
    const subtype = session.meta.regen?.subtype;
    const replaySessionInterface = subtype === 'options' || subtype === 'tutorial';
    const inGameInterface = subtype === 'options' || session.meta.options?.wizard === true;
    if (replaySessionInterface) {
        const replayFlags = { ...DEFAULT_FLAGS };
        if (session.meta.options?.autopickup === false) replayFlags.pickup = false;
        if (session.meta.options?.symset === 'DECgraphics') replayFlags.DECgraphics = true;
        replayFlags.bgcolors = true;
        replayFlags.customcolors = true;
        replayFlags.customsymbols = true;
        replayFlags.symset = 'DECgraphics, active, handler=DEC';
        return replaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
            flags: replayFlags,
        });
    }
    if (subtype === 'startup' || subtype === 'tutorial') {
        // C startup interface captures are recorded after login-derived name selection.
        // Mirror that state so replay starts at autopick prompt rather than name prompt.
        globalThis.localStorage.setItem('webhack-options', JSON.stringify({ name: 'wizard' }));
    } else {
        globalThis.localStorage.removeItem('webhack-options');
    }

    enableRngLog();
    const initPromise = game.init({ seed, wizard: inGameInterface });
    let startupScreen = await waitForStableScreen(display, { requireNonEmpty: true });
    if (inGameInterface) {
        await initPromise;
        // Options captures start from in-game map/status, not pregame prompts.
        startupScreen = await waitForStableScreen(display, { requireNonEmpty: true });
    }
    let prevRngCount = (getRngLog() || []).length;
    const startupRng = (getRngLog() || []).slice(0, prevRngCount);

    const recordedSteps = [];
    const sourceSteps = Array.isArray(session.raw?.steps) ? session.raw.steps : [];
    for (let i = 1; i < sourceSteps.length; i++) {
        const key = sourceSteps[i]?.key;
        if (typeof key !== 'string' || key.length === 0) continue;
        for (let j = 0; j < key.length; j++) {
            input.pushKey(key.charCodeAt(j));
        }
        const screen = await waitForStableScreen(display, {
            requireNonEmpty: subtype === 'tutorial',
            timeoutMs: subtype === 'tutorial' ? 1500 : 600,
        });
        const fullLog = getRngLog() || [];
        const stepRng = fullLog.slice(prevRngCount);
        prevRngCount = fullLog.length;
        recordedSteps.push({
            rngCalls: stepRng.length,
            rng: stepRng,
            screen,
        });
    }

    // Pregame captures intentionally stop mid-chargen and would otherwise block.
    if (!inGameInterface) void initPromise;
    disableRngLog();

    return {
        startup: { rngCalls: startupRng.length, rng: startupRng, screen: startupScreen },
        steps: recordedSteps,
    };
}

async function runChargenResult(session) {
    const result = createReplayResult(session);
    result.type = 'chargen';
    const start = Date.now();

    try {
        const startup = generateStartupWithCoreReplay(session.meta.seed, session.raw);
        if (session.startup?.rng?.length) {
            recordRngComparison(result, startup?.rng || [], session.startup.rng);
        }
        if (session.startup?.typGrid) {
            const diffs = compareGrids(startup?.grid || [], session.startup.typGrid);
            recordGrids(result, diffs.length === 0 ? 1 : 0, 1);
            if (!result.firstDivergence && diffs.length > 0) {
                const first = findFirstGridDiff(startup?.grid || [], session.startup.typGrid);
                if (first) {
                    result.firstDivergence = { channel: 'grid', stage: 'startup', ...first };
                }
            }
        }
        const screenSteps = session.steps.filter((step) => step.screen.length > 0).length;
        if (screenSteps > 0) {
            recordScreens(result, screenSteps, screenSteps);
        }
    } catch (error) {
        markFailed(result, error);
    }

    setDuration(result, Date.now() - start);
    return result;
}

async function runGameplayResult(session) {
    const result = createReplayResult(session);
    const start = Date.now();

    try {
        const replay = await replaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
        });
        if (!replay || replay.error) {
            markFailed(result, replay?.error || 'Replay failed');
            setDuration(result, Date.now() - start);
            return result;
        }

        if (session.startup?.rng?.length > 0) {
            recordRngComparison(result, replay.startup?.rng || [], session.startup.rng);
        } else if (Number.isInteger(session.startup?.rngCalls)) {
            const actualCalls = (replay.startup?.rng || []).length;
            recordRng(result, actualCalls === session.startup.rngCalls ? 1 : 0, 1, {
                expected: String(session.startup.rngCalls),
                actual: String(actualCalls),
                stage: 'startup',
            });
        } else if ((replay.startup?.rng || []).length > 0) {
            recordRngComparison(result, replay.startup?.rng || [], []);
        }

        const count = Math.min(session.steps.length, (replay.steps || []).length);
        let rngMatched = 0;
        let rngTotal = 0;
        let screensMatched = 0;
        let screensTotal = 0;

        for (let i = 0; i < count; i++) {
            const expected = session.steps[i];
            const actual = replay.steps[i] || {};

            if (expected.rng.length > 0) {
                const rngCmp = compareRng(actual.rng || [], expected.rng);
                rngMatched += rngCmp.matched;
                rngTotal += rngCmp.total;
                if (!result.firstDivergence && rngCmp.firstDivergence) {
                    result.firstDivergence = { ...rngCmp.firstDivergence, step: i };
                }
            } else if (Number.isInteger(expected.rngCalls)) {
                const actualCalls = (actual.rng || []).length;
                rngTotal += 1;
                if (actualCalls === expected.rngCalls) {
                    rngMatched += 1;
                } else if (!result.firstDivergence) {
                    result.firstDivergence = {
                        step: i,
                        expected: String(expected.rngCalls),
                        actual: String(actualCalls),
                    };
                }
            } else {
                const rngCmp = compareRng(actual.rng || [], []);
                rngMatched += rngCmp.matched;
                rngTotal += rngCmp.total;
                if (!result.firstDivergence && rngCmp.firstDivergence) {
                    result.firstDivergence = { ...rngCmp.firstDivergence, step: i };
                }
            }

            if (expected.screen.length > 0) {
                screensTotal++;
                const screenCmp = compareScreenLines(actual.screen || [], expected.screen);
                if (screenCmp.match) screensMatched++;
                if (!screenCmp.match && !result.firstDivergence && screenCmp.firstDiff) {
                    result.firstDivergence = { channel: 'screen', step: i, ...screenCmp.firstDiff };
                }
            }
        }

        if (rngTotal > 0) recordRng(result, rngMatched, rngTotal, result.firstDivergence);
        if (screensTotal > 0) recordScreens(result, screensMatched, screensTotal);
    } catch (error) {
        markFailed(result, error);
    }

    setDuration(result, Date.now() - start);
    return result;
}

async function runInterfaceResult(session) {
    const result = createReplayResult(session);
    result.type = 'interface';
    const start = Date.now();

    try {
        const replay = await replayInterfaceSession(session);
        if (!replay || replay.error) {
            markFailed(result, replay?.error || 'Replay failed');
            setDuration(result, Date.now() - start);
            return result;
        }

        if (session.meta.regen?.subtype !== 'tutorial') {
            if (session.startup?.rng?.length > 0) {
                recordRngComparison(result, replay.startup?.rng || [], session.startup.rng, { stage: 'startup' });
            } else if (Number.isInteger(session.startup?.rngCalls)) {
                const actualCalls = (replay.startup?.rng || []).length;
                recordRng(result, actualCalls === session.startup.rngCalls ? 1 : 0, 1, {
                    expected: String(session.startup.rngCalls),
                    actual: String(actualCalls),
                    stage: 'startup',
                });
            }
        }

        // Interface captures include a startup frame (key=null) that replaySession
        // does not emit as a step screen, so align expected[1..] to replay.steps[0..].
        const expectedSteps = Array.isArray(session.raw?.steps) ? session.raw.steps.slice(1) : [];
        const actualSteps = replay.steps || [];
        const count = Math.min(expectedSteps.length, actualSteps.length);
        let screensMatched = 0;
        let screensTotal = 0;
        let rngMatched = 0;
        let rngTotal = 0;

        for (let i = 0; i < count; i++) {
            const expected = expectedSteps[i] || {};
            const actual = actualSteps[i] || {};

            const expectedScreen = getExpectedScreenLines(expected);
            if (expectedScreen.length > 0) {
                screensTotal++;
                let normalizedActual = normalizeInterfaceScreenLines(actual.screen || []);
                let normalizedExpected = normalizeInterfaceScreenLines(expectedScreen);
                // C DECgraphics map fragments during getlin prompts don't round-trip
                // through JS headless glyph rendering identically; compare prompt line.
                if (session.meta.regen?.subtype === 'options'
                    && normalizedExpected[0]?.startsWith('Set fruit to what?')) {
                    normalizedActual = normalizedActual.slice(0, 1);
                    normalizedExpected = normalizedExpected.slice(0, 1);
                }
                if (session.meta.regen?.subtype === 'options'
                    && normalizedExpected[0]?.includes('Select number_pad mode:')) {
                    normalizedActual = normalizedActual.slice(0, 9);
                    normalizedExpected = normalizedExpected.slice(0, 9);
                }
                const screenCmp = compareScreenLines(
                    normalizedActual,
                    normalizedExpected,
                );
                if (screenCmp.match) {
                    screensMatched++;
                } else if (!result.firstDivergence && screenCmp.firstDiff) {
                    result.firstDivergence = { channel: 'screen', step: i + 1, ...screenCmp.firstDiff };
                }
            }

            const expectedRng = Array.isArray(expected.rng) ? expected.rng : [];
            if (expectedRng.length > 0) {
                const rngCmp = compareRng(actual.rng || [], expectedRng);
                rngMatched += rngCmp.matched;
                rngTotal += rngCmp.total;
                if (!result.firstDivergence && rngCmp.firstDivergence) {
                    result.firstDivergence = { ...rngCmp.firstDivergence, step: i + 1 };
                }
            } else if (Number.isInteger(expected.rngCalls)) {
                const actualCalls = (actual.rng || []).length;
                rngTotal += 1;
                if (actualCalls === expected.rngCalls) {
                    rngMatched += 1;
                } else if (!result.firstDivergence) {
                    result.firstDivergence = {
                        step: i + 1,
                        expected: String(expected.rngCalls),
                        actual: String(actualCalls),
                    };
                }
            }
        }

        if (rngTotal > 0) recordRng(result, rngMatched, rngTotal, result.firstDivergence);
        if (screensTotal > 0) recordScreens(result, screensMatched, screensTotal);
    } catch (error) {
        markFailed(result, error);
    }

    setDuration(result, Date.now() - start);
    return result;
}

async function runMapResult(session) {
    const result = createReplayResult(session);
    const start = Date.now();

    try {
        const levels = Array.isArray(session.levels) ? session.levels : [];
        if (levels.length === 0) {
            markFailed(result, 'No map levels in session');
            setDuration(result, Date.now() - start);
            return result;
        }

        const maxDepth = Math.max(...levels.map((level) => level.depth || 1));
        const generated = generateMapsWithCoreReplay(session.meta.seed, maxDepth);

        for (const level of levels) {
            const depth = level.depth || 1;
            if (level.typGrid) {
                const diffs = compareGrids(generated?.grids?.[depth] || [], level.typGrid);
                recordGrids(result, diffs.length === 0 ? 1 : 0, 1);
                if (!result.firstDivergence && diffs.length > 0) {
                    const first = findFirstGridDiff(generated?.grids?.[depth] || [], level.typGrid);
                    if (first) {
                        result.firstDivergence = { channel: 'grid', depth, ...first };
                    }
                }
            }

            const generatedRng = generated?.rngLogs?.[depth]?.rng || [];
            if (level.rng.length > 0) {
                recordRngComparison(result, generatedRng, level.rng, { depth });
            } else if (Number.isInteger(level.rngCalls)) {
                const rngCalls = generated?.rngLogs?.[depth]?.rngCalls;
                recordRng(result, rngCalls === level.rngCalls ? 1 : 0, 1, {
                    depth,
                    expected: String(level.rngCalls),
                    actual: String(rngCalls),
                });
            }
        }
    } catch (error) {
        markFailed(result, error);
    }

    setDuration(result, Date.now() - start);
    return result;
}

async function runSpecialResult(session) {
    const result = createReplayResult(session);
    const start = Date.now();

    try {
        const levels = Array.isArray(session.levels) ? session.levels : [];
        const valid = levels.filter((level) =>
            Array.isArray(level.typGrid)
            && level.typGrid.length === 21
            && Array.isArray(level.typGrid[0])
            && level.typGrid[0].length === 80).length;
        recordGrids(result, valid, levels.length);
    } catch (error) {
        markFailed(result, error);
    }

    setDuration(result, Date.now() - start);
    return result;
}

async function runSessionResult(session) {
    if (session.meta.type === 'chargen') return runChargenResult(session);
    if (session.meta.type === 'interface' && session.meta.regen?.subtype === 'chargen') {
        return runChargenResult(session);
    }
    if (session.meta.type === 'interface') return runInterfaceResult(session);
    if (session.meta.type === 'map') return runMapResult(session);
    if (session.meta.type === 'special') return runSpecialResult(session);
    return runGameplayResult(session);
}

export async function runSessionBundle({
    verbose = false,
    useGolden = false,
    goldenBranch = 'golden',
    typeFilter = null,
    sessionPath = null,
    failFast = false,
} = {}) {
    const sessions = loadAllSessions({
        sessionsDir: SESSIONS_DIR,
        mapsDir: MAPS_DIR,
        useGolden,
        goldenBranch,
        typeFilter,
        sessionPath,
    }).filter((session) => !SKIP_SESSIONS.has(session.file));

    if (verbose) {
        console.log('=== Session Test Runner ===');
        if (typeFilter) console.log(`Type filter: ${String(typeFilter)}`);
        if (sessionPath) console.log(`Single session: ${sessionPath}`);
        if (useGolden) console.log(`Using golden branch: ${goldenBranch}`);
        console.log(`Loaded sessions: ${sessions.length}`);
    }

    const results = [];
    for (const session of sessions) {
        const result = await runSessionResult(session);
        results.push(result);
        if (verbose) console.log(formatResult(result));
        if (failFast && result.passed !== true) {
            if (verbose) console.log(`Fail-fast: stopping after ${result.session}`);
            break;
        }
    }

    const bundle = createResultsBundle(results, {
        goldenBranch: useGolden ? goldenBranch : null,
    });

    if (verbose) {
        console.log('\n========================================');
        console.log('SUMMARY');
        console.log('========================================');
        console.log(formatBundleSummary(bundle));
    }

    return bundle;
}

export async function runSessionCli() {
    const args = {
        verbose: false,
        useGolden: false,
        typeFilter: null,
        sessionPath: null,
        failFast: false,
    };
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--verbose') args.verbose = true;
        else if (arg === '--golden') args.useGolden = true;
        else if (arg === '--fail-fast') args.failFast = true;
        else if (arg === '--type' && argv[i + 1]) args.typeFilter = argv[++i];
        else if (arg.startsWith('--type=')) args.typeFilter = arg.slice('--type='.length);
        else if (arg === '--help' || arg === '-h') {
            console.log('Usage: node session_test_runner.js [--verbose] [--golden] [--fail-fast] [--type type1,type2] [session-file]');
            process.exit(0);
        } else if (arg.startsWith('--')) {
            throw new Error(`Unknown argument: ${arg}`);
        } else if (!args.sessionPath) {
            args.sessionPath = arg;
        }
    }

    const goldenBranch = process.env.GOLDEN_BRANCH || 'golden';
    const bundle = await runSessionBundle({
        verbose: args.verbose,
        useGolden: args.useGolden,
        goldenBranch,
        typeFilter: args.typeFilter,
        sessionPath: args.sessionPath,
        failFast: args.failFast,
    });
    console.log('\n__RESULTS_JSON__');
    console.log(JSON.stringify(bundle));
    process.exit(bundle.summary.failed > 0 ? 1 : 0);
}

if (process.argv[1] && process.argv[1].endsWith('session_test_runner.js')) {
    runSessionCli().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
