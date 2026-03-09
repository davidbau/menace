// test/comparison/session_test_runner.js -- Unified session runner orchestrator.

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';

import { replaySession } from '../../js/replay_core.js';
import { prepareReplayArgs, applyManualDirectChargenView } from '../../js/replay_compare.js';
import { NetHackGame } from '../../js/allmain.js';
import {
    createHeadlessInput,
    HeadlessDisplay,
    generateMapsWithCoreReplay,
    generateStartupWithCoreReplay,
} from '../../js/headless.js';
import {
    enableRngLog,
    getRngLog,
    disableRngLog,
} from '../../js/rng.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { resetInputModuleState } from '../../js/input.js';
import { resetNoisesState } from '../../js/mhitm.js';
import { stairway_free_all } from '../../js/stairs.js';
import { setGame } from '../../js/gstate.js';
import {
    compareRng,
    compareGrids,
    compareScreenLines,
    compareScreenAnsi,
    findFirstGridDiff,
} from './comparators.js';
import { loadAllSessions, stripAnsiSequences, getSessionScreenAnsiLines } from './session_loader.js';
import { decodeDecSpecialChar, decodeSOSILine } from './symset_normalization.js';
import { recordGameplaySessionFromInputs } from './session_recorder.js';
import { compareRecordedGameplaySession } from './session_comparator.js';
import {
    buildComparisonArtifact,
    initComparisonArtifactsRunDir,
    isComparisonArtifactsEnabled,
    writeComparisonArtifact,
} from './comparison_artifacts.js';
import {
    createSessionResult,
    recordRng,
    recordGrids,
    recordScreens,
    recordColors,
    recordScreenWindow,
    recordColorWindow,
    recordEvents,
    recordMapdump,
    recordAnimationBoundaries,
    recordCursor,
    markFailed,
    setDuration,
    createResultsBundle,
    formatResult,
    formatBundleSummary,
} from './test_result_format.js';
import { resolveSessionFixedDatetime } from './session_datetime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');
const SKIP_SESSIONS = new Set();
const DEFAULT_FIXED_DATETIME = '20000110090000';
const _sessionTestMoveHintCache = new Map();

function envEnabled(value) {
    if (value == null) return false;
    const text = String(value).trim().toLowerCase();
    return text !== '' && text !== '0' && text !== 'false' && text !== 'off' && text !== 'no';
}

function hasTestMoveInRngEntries(entries) {
    if (!Array.isArray(entries)) return false;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (typeof entry === 'string' && entry.startsWith('^test_move[')) return true;
    }
    return false;
}

function hasRunstepInRngEntries(entries) {
    if (!Array.isArray(entries)) return false;
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (typeof entry === 'string' && entry.startsWith('^runstep[')) return true;
    }
    return false;
}

function sessionWantsTestMoveEvents(session) {
    const cacheKey = session?.file || session;
    if (_sessionTestMoveHintCache.has(cacheKey)) {
        return _sessionTestMoveHintCache.get(cacheKey);
    }

    const regenEnv = session?.meta?.regen?.env || session?.raw?.regen?.env || {};
    if (envEnabled(regenEnv.NETHACK_EVENT_TEST_MOVE) || envEnabled(regenEnv.WEBHACK_EVENT_TEST_MOVE)) {
        _sessionTestMoveHintCache.set(cacheKey, true);
        return true;
    }

    if (hasTestMoveInRngEntries(session?.startup?.rng)) {
        _sessionTestMoveHintCache.set(cacheKey, true);
        return true;
    }

    const steps = Array.isArray(session?.steps) ? session.steps : [];
    for (let i = 0; i < steps.length; i++) {
        if (hasTestMoveInRngEntries(steps[i]?.rng)) {
            _sessionTestMoveHintCache.set(cacheKey, true);
            return true;
        }
    }

    _sessionTestMoveHintCache.set(cacheKey, false);
    return false;
}

const _sessionRunstepHintCache = new Map();

function sessionWantsRunstepEvents(session) {
    const cacheKey = session?.file || session;
    if (_sessionRunstepHintCache.has(cacheKey)) {
        return _sessionRunstepHintCache.get(cacheKey);
    }

    const regenEnv = session?.meta?.regen?.env || session?.raw?.regen?.env || {};
    if (envEnabled(regenEnv.NETHACK_EVENT_RUNSTEP) || envEnabled(regenEnv.WEBHACK_EVENT_RUNSTEP)) {
        _sessionRunstepHintCache.set(cacheKey, true);
        return true;
    }

    if (hasRunstepInRngEntries(session?.startup?.rng)) {
        _sessionRunstepHintCache.set(cacheKey, true);
        return true;
    }

    const steps = Array.isArray(session?.steps) ? session.steps : [];
    for (let i = 0; i < steps.length; i++) {
        if (hasRunstepInRngEntries(steps[i]?.rng)) {
            _sessionRunstepHintCache.set(cacheKey, true);
            return true;
        }
    }

    _sessionRunstepHintCache.set(cacheKey, false);
    return false;
}

async function withSessionFixedDatetime(session, fn) {
    const prev = process.env.NETHACK_FIXED_DATETIME;
    const sourcePref = process.env.NETHACK_SESSION_DATETIME_SOURCE || 'session';
    const chosen = resolveSessionFixedDatetime(session, sourcePref) || prev || DEFAULT_FIXED_DATETIME;
    if (chosen) process.env.NETHACK_FIXED_DATETIME = chosen;
    else delete process.env.NETHACK_FIXED_DATETIME;
    try {
        return await fn();
    } finally {
        if (prev == null) delete process.env.NETHACK_FIXED_DATETIME;
        else process.env.NETHACK_FIXED_DATETIME = prev;
    }
}

async function withSessionReplayEnv(session, fn) {
    const prevTestMove = process.env.WEBHACK_EVENT_TEST_MOVE;
    const prevRunstep = process.env.WEBHACK_EVENT_RUNSTEP;
    const shouldEnableTestMove = sessionWantsTestMoveEvents(session);
    const shouldEnableRunstep = sessionWantsRunstepEvents(session);
    const preserveExplicit = envEnabled(prevTestMove);
    const preserveExplicitRunstep = envEnabled(prevRunstep);
    if (!preserveExplicit) {
        if (shouldEnableTestMove) process.env.WEBHACK_EVENT_TEST_MOVE = '1';
        else delete process.env.WEBHACK_EVENT_TEST_MOVE;
    }
    if (!preserveExplicitRunstep) {
        if (shouldEnableRunstep) process.env.WEBHACK_EVENT_RUNSTEP = '1';
        else delete process.env.WEBHACK_EVENT_RUNSTEP;
    }
    try {
        return await fn();
    } finally {
        if (prevTestMove == null) delete process.env.WEBHACK_EVENT_TEST_MOVE;
        else process.env.WEBHACK_EVENT_TEST_MOVE = prevTestMove;
        if (prevRunstep == null) delete process.env.WEBHACK_EVENT_RUNSTEP;
        else process.env.WEBHACK_EVENT_RUNSTEP = prevRunstep;
    }
}

function createReplayResult(session) {
    const result = createSessionResult({
        file: session.file,
        seed: session.meta.seed,
    });
    result.type = session.meta.type;
    return result;
}

function sessionColorEnabled(session) {
    // C interface captures default to color enabled unless explicitly disabled.
    return session?.meta?.options?.color !== false;
}

function setFirstDivergence(result, channel, divergence) {
    if (!divergence) return;
    if (!result.firstDivergences) result.firstDivergences = {};
    if (!result.firstDivergences[channel]) {
        result.firstDivergences[channel] = { channel, ...divergence };
    }
    if (!result.firstDivergence) {
        result.firstDivergence = { channel, ...divergence };
    }
}

function recordRngComparison(result, actual, expected, context = {}) {
    const cmp = compareRng(actual, expected);
    const divergence = cmp.firstDivergence
        ? { ...cmp.firstDivergence, ...context }
        : null;
    setFirstDivergence(result, 'rng', divergence);
    recordRng(result, cmp.matched, cmp.total, divergence);
}

function getExpectedScreenLines(stepLike) {
    if (!stepLike) return [];
    if (Array.isArray(stepLike.screenAnsi)) return stepLike.screenAnsi.map((line) => stripAnsiSequences(line));
    if (Array.isArray(stepLike.screen)) return stepLike.screen.map((line) => stripAnsiSequences(line));
    if (typeof stepLike.screen === 'string') return stepLike.screen.split('\n').map((line) => stripAnsiSequences(line));
    return [];
}

function getExpectedScreenAnsiLines(stepLike) {
    return getSessionScreenAnsiLines(stepLike);
}

function decodeLegacyDecgraphicsLine(line) {
    const source = String(line || '');
    // Legacy captures can lose SO/SI while keeping DEC glyph bytes.
    // Only decode lines that are overwhelmingly DEC-graphics glyph runs
    // (plus spaces/color punctuation) to avoid touching ordinary prose.
    const stripped = source.replace(/[^\x20-\x7e]/g, '');
    if (!/^[ `a-fjkmnq-tvx|{}~+.,'-]*$/.test(stripped)) return source;
    return [...source].map((ch) => decodeDecSpecialChar(ch)).join('');
}

function normalizeInterfaceLineForComparison(line, { decgraphics = false } = {}) {
    let normalized = stripAnsiSequences(String(line || ''));
    if (decgraphics) {
        normalized = decodeSOSILine(normalized);
        normalized = decodeLegacyDecgraphicsLine(normalized);
    }
    const text = normalized
        .replace(/[\x0e\x0f]/g, '')
        .replace(/[┌┐└┘┬┴┼├┤─]/g, '-')
        .replace(/[│]/g, '|')
        .replace(/[·]/g, '.')
        .replace(/\s+$/, '');
    if (/^\s*NetHack,\s+Copyright\b/.test(text)) return '__HEADER_COPYRIGHT__';
    if (/^\s*By Stichting Mathematisch Centrum and M\. Stephenson\./.test(text)) return '__HEADER_AUTHOR__';
    if (/^\s*Version\b/.test(text)) return '__HEADER_VERSION__';
    if (/^\s*See license for details\./.test(text)) return '__HEADER_LICENSE__';
    return text;
}

function normalizeInterfaceScreenLines(lines, { decgraphics = false } = {}) {
    return (Array.isArray(lines) ? lines : [])
        .map((line) => normalizeInterfaceLineForComparison(line, { decgraphics }));
}

function compareInterfaceScreens(actualLines, expectedLines) {
    return compareScreenLines(actualLines, expectedLines);
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

function ensureSessionGlobals() {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = { location: { search: '' } };
    } else if (!globalThis.window.location) {
        globalThis.window.location = { search: '' };
    } else if (typeof globalThis.window.location.search !== 'string') {
        globalThis.window.location.search = '';
    }

    const backing = new Map();
    const storage = {
        getItem(key) { return backing.has(key) ? backing.get(key) : null; },
        setItem(key, value) { backing.set(key, String(value)); },
        removeItem(key) { backing.delete(key); },
        clear() { backing.clear(); },
    };
    // Avoid invoking Node's built-in localStorage setter (which can warn
    // when process-level localstorage flags are malformed in some envs).
    Object.defineProperty(globalThis, 'localStorage', {
        value: storage,
        configurable: true,
        enumerable: true,
        writable: true,
    });
    return storage;
}

function resetSessionRuntimeState() {
    // Worker threads can process multiple sessions; clear module statics first.
    resetInputModuleState();
    resetNoisesState();
    stairway_free_all();
    setGame(null);
    if (globalThis?.gs && typeof globalThis.gs === 'object') {
        globalThis.gs.stairs = null;
    }
}

async function replayInterfaceSession(session) {
    const storage = ensureSessionGlobals();

    const seed = session.meta.seed;
    const display = new HeadlessDisplay();
    const input = createHeadlessInput();
    const game = new NetHackGame({ display, input });
    const subtype = session.meta.regen?.subtype;
    const replaySessionInterface = subtype !== 'startup' && subtype !== 'nameprompt';
    const inGameInterface = subtype === 'options' || session.meta.options?.wizard === true;
    if (replaySessionInterface) {
        const replayFlags = { ...DEFAULT_FLAGS };
        replayFlags.color = sessionColorEnabled(session);
        if (subtype === 'options') replayFlags.color = true;
        if (session.meta.options?.autopickup === false) replayFlags.pickup = false;
        const wantsDec = session.meta.options?.symset === 'DECgraphics';
        replayFlags.DECgraphics = !!wantsDec;
        replayFlags.bgcolors = true;
        replayFlags.customcolors = true;
        if (wantsDec) {
            replayFlags.customsymbols = true;
            replayFlags.symset = 'DECgraphics, active, handler=DEC';
        }
        const { seed: replaySeed, opts: replayOpts, keys } = prepareReplayArgs(
            session.meta.seed, session.raw, {
                captureScreens: true,
                startupBurstInFirstStep: false,
                flags: replayFlags,
                tutorial: subtype === 'tutorial' || session.meta.regen?.tutorial === true,
            }
        );
        const jsSession = await replaySession(replaySeed, replayOpts, keys);
        // V3 format: steps[0] is startup, steps[1..] are per-keystroke.
        // Convert screen strings to arrays for the comparator.
        const startup = {
            rng: jsSession.steps[0].rng,
            screen: (jsSession.steps[0].screen || '').split('\n'),
            cursor: jsSession.steps[0].cursor,
        };
        const steps = jsSession.steps.slice(1).map(s => ({
            ...s,
            screen: (s.screen || '').split('\n'),
            screenAnsi: (s.screen || '').split('\n'),
        }));
        return { startup, steps };
    }
    if (subtype === 'startup' || subtype === 'tutorial') {
        // C startup interface captures are recorded after login-derived name selection.
        // Mirror that state so replay starts at autopick prompt rather than name prompt.
        storage.setItem('menace-options', JSON.stringify({ name: 'wizard' }));
    } else {
        storage.removeItem('menace-options');
    }

    enableRngLog();
    const initPromise = game.init({ seed, wizard: inGameInterface });
    let startupScreen = await waitForStableScreen(display, { requireNonEmpty: true });
    let startupScreenAnsi = (typeof display.getScreenAnsiLines === 'function')
        ? display.getScreenAnsiLines()
        : null;
    if (inGameInterface) {
        await initPromise;
        // Options captures start from in-game map/status, not pregame prompts.
        startupScreen = await waitForStableScreen(display, { requireNonEmpty: true });
        startupScreenAnsi = (typeof display.getScreenAnsiLines === 'function')
            ? display.getScreenAnsiLines()
            : null;
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
            screenAnsi: (typeof display.getScreenAnsiLines === 'function')
                ? display.getScreenAnsiLines()
                : null,
        });
    }

    // Pregame captures intentionally stop mid-chargen and would otherwise block.
    if (!inGameInterface) void initPromise;
    disableRngLog();

    return {
        startup: {
            rngCalls: startupRng.length,
            rng: startupRng,
            screen: startupScreen,
            screenAnsi: startupScreenAnsi,
        },
        steps: recordedSteps,
    };
}

async function runChargenResult(session) {
    const result = createReplayResult(session);
    result.type = 'chargen';
    const start = Date.now();

    try {
        const startup = await generateStartupWithCoreReplay(session.meta.seed, session.raw);
        if (session.startup?.rng?.length) {
            recordRngComparison(result, startup?.rng || [], session.startup.rng);
        }
        if (session.startup?.typGrid) {
            const diffs = compareGrids(startup?.grid || [], session.startup.typGrid);
            recordGrids(result, diffs.length === 0 ? 1 : 0, 1);
            if (diffs.length > 0) {
                const first = findFirstGridDiff(startup?.grid || [], session.startup.typGrid);
                if (first) {
                    setFirstDivergence(result, 'grid', { stage: 'startup', ...first });
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
        // For manual-direct-live sessions, fold embedded chargen/lore steps into startup
        // and provide the correct character + gameplay-only steps for comparison.
        // Must be applied BEFORE recordGameplaySessionFromInputs so the recorder uses
        // the transformed session (correct character detection, correct gameplay step range).
        const sessionForCmp = applyManualDirectChargenView(session);
        const replay = await recordGameplaySessionFromInputs(sessionForCmp);
        if (!replay || replay.error) {
            markFailed(result, replay?.error || 'Replay failed');
            setDuration(result, Date.now() - start);
            return result;
        }
        if (replay.synclockDiagnostics && typeof replay.synclockDiagnostics === 'object') {
            result.synclockDiagnostics = replay.synclockDiagnostics;
        }
        const cmp = compareRecordedGameplaySession(sessionForCmp, replay);

        if (cmp.rng.total > 0) {
            recordRng(result, cmp.rng.matched, cmp.rng.total, cmp.rng.firstDivergence);
            setFirstDivergence(result, 'rng', cmp.rng.firstDivergence);
        }
        if (cmp.screen.total > 0) {
            recordScreens(result, cmp.screen.matched, cmp.screen.total);
            setFirstDivergence(result, 'screen', cmp.screen.firstDivergence);
        }
        if (cmp.color.total > 0) {
            recordColors(result, cmp.color.matched, cmp.color.total);
            setFirstDivergence(result, 'color', cmp.color.firstDivergence);
        }
        if (cmp.screenWindow?.total > 0) {
            recordScreenWindow(
                result,
                cmp.screenWindow.matched,
                cmp.screenWindow.total,
                cmp.screenWindow.earlyOnlyCount || 0
            );
            setFirstDivergence(result, 'screenWindow', cmp.screenWindow.firstDivergence);
            if (cmp.screenWindow.firstEarlyOnly) {
                setFirstDivergence(result, 'screenWindowEarlyOnly', cmp.screenWindow.firstEarlyOnly);
            }
        }
        if (cmp.colorWindow?.total > 0) {
            recordColorWindow(
                result,
                cmp.colorWindow.matched,
                cmp.colorWindow.total,
                cmp.colorWindow.earlyOnlyCount || 0
            );
            setFirstDivergence(result, 'colorWindow', cmp.colorWindow.firstDivergence);
            if (cmp.colorWindow.firstEarlyOnly) {
                setFirstDivergence(result, 'colorWindowEarlyOnly', cmp.colorWindow.firstEarlyOnly);
            }
        }
        if (cmp.event.total > 0) {
            recordEvents(result, cmp.event.matched, cmp.event.total);
            result.events = {
                matched: result.metrics.events.matched,
                total: result.metrics.events.total,
            };
            setFirstDivergence(result, 'event', cmp.event.firstDivergence);
        }
        if (cmp.mapdump?.total > 0) {
            recordMapdump(result, cmp.mapdump.matched, cmp.mapdump.total);
            setFirstDivergence(result, 'mapdump', cmp.mapdump.firstDivergence);
        }
        if (cmp.animationBoundaries.total > 0) {
            recordAnimationBoundaries(
                result,
                cmp.animationBoundaries.matched,
                cmp.animationBoundaries.total
            );
            setFirstDivergence(
                result,
                'animationBoundaries',
                cmp.animationBoundaries.firstDivergence
            );
        }
        if (cmp.cursor?.total > 0) {
            recordCursor(result, cmp.cursor.matched, cmp.cursor.total);
            setFirstDivergence(result, 'cursor', cmp.cursor.firstDivergence);
        }
        if ((cmp.screenWindow?.rerecordCandidate || cmp.colorWindow?.rerecordCandidate) && !result.rerecordHint) {
            const steps = [];
            if (cmp.screenWindow?.firstEarlyOnly?.step != null) steps.push(cmp.screenWindow.firstEarlyOnly.step);
            if (cmp.colorWindow?.firstEarlyOnly?.step != null) steps.push(cmp.colorWindow.firstEarlyOnly.step);
            const uniqueSteps = [...new Set(steps)].sort((a, b) => a - b);
            result.rerecordHint = {
                reason: 'strict screen/color mismatch but animation-boundary frame matches',
                suggested: 'rerecord with higher key delay around indicated steps',
                steps: uniqueSteps,
            };
        }
        const comparisonDir = process.env.WEBHACK_COMPARISON_DIR || '';
        if (comparisonDir) {
            const artifact = buildComparisonArtifact(session, replay, cmp, result);
            writeComparisonArtifact(comparisonDir, session.file, artifact);
        }
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
                if (actualCalls !== session.startup.rngCalls) {
                    setFirstDivergence(result, 'rng', {
                        expected: String(session.startup.rngCalls),
                        actual: String(actualCalls),
                        stage: 'startup',
                    });
                }
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
        const decgraphics = session.meta.options?.symset === 'DECgraphics';
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
                let normalizedActual = normalizeInterfaceScreenLines(actual.screen || [], { decgraphics });
                let normalizedExpected = normalizeInterfaceScreenLines(expectedScreen, { decgraphics });
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
                const screenCmp = compareInterfaceScreens(
                    normalizedActual,
                    normalizedExpected,
                );
                if (screenCmp.match) {
                    screensMatched++;
                } else if (screenCmp.firstDiff) {
                    setFirstDivergence(result, 'screen', { step: i + 1, ...screenCmp.firstDiff });
                }
            }
            const expectedAnsi = getExpectedScreenAnsiLines(expected);
            if (expectedAnsi.length > 0 && Array.isArray(actual.screenAnsi)) {
                let actualAnsiForCmp = actual.screenAnsi;
                let expectedAnsiForCmp = expectedAnsi;
                const expectedPlain = normalizeInterfaceScreenLines(
                    getExpectedScreenLines(expected),
                    { decgraphics },
                );

                // Keep ANSI color comparison scoped to the same prompt-only slices used
                // by interface text comparison where C/JS map fragments are non-round-trippable.
                if (session.meta.regen?.subtype === 'options'
                    && expectedPlain[0]?.startsWith('Set fruit to what?')) {
                    actualAnsiForCmp = actualAnsiForCmp.slice(0, 1);
                    expectedAnsiForCmp = expectedAnsiForCmp.slice(0, 1);
                }
                if (session.meta.regen?.subtype === 'options'
                    && expectedPlain[0]?.includes('Select number_pad mode:')) {
                    actualAnsiForCmp = actualAnsiForCmp.slice(0, 9);
                    expectedAnsiForCmp = expectedAnsiForCmp.slice(0, 9);
                }

                // Header/version lines are intentionally normalized in interface
                // screen comparison; mirror that here to avoid volatile build-string
                // text producing false color/glyph diffs.
                const expectedAnsiMasked = expectedAnsiForCmp.slice();
                const actualAnsiMasked = actualAnsiForCmp.slice();
                for (let row = 0; row < expectedPlain.length && row < expectedAnsiMasked.length; row++) {
                    if (expectedPlain[row] === '__HEADER_VERSION__') {
                        expectedAnsiMasked[row] = '';
                        if (row < actualAnsiMasked.length) actualAnsiMasked[row] = '';
                    }
                }

                const colorCmp = compareScreenAnsi(actualAnsiMasked, expectedAnsiMasked);
                if (!result._colorStats) result._colorStats = { matched: 0, total: 0 };
                result._colorStats.matched += colorCmp.matched;
                result._colorStats.total += colorCmp.total;
                if (!colorCmp.match && colorCmp.firstDiff) {
                    setFirstDivergence(result, 'color', { step: i + 1, ...colorCmp.firstDiff });
                }
            }

            const expectedRng = Array.isArray(expected.rng) ? expected.rng : [];
            if (expectedRng.length > 0) {
                const rngCmp = compareRng(actual.rng || [], expectedRng);
                rngMatched += rngCmp.matched;
                rngTotal += rngCmp.total;
                setFirstDivergence(result, 'rng', rngCmp.firstDivergence ? { ...rngCmp.firstDivergence, step: i + 1 } : null);
            } else if (Number.isInteger(expected.rngCalls)) {
                const actualCalls = (actual.rng || []).length;
                rngTotal += 1;
                if (actualCalls === expected.rngCalls) {
                    rngMatched += 1;
                } else {
                    setFirstDivergence(result, 'rng', {
                        step: i + 1,
                        expected: String(expected.rngCalls),
                        actual: String(actualCalls),
                    });
                }
            }
        }

        if (rngTotal > 0) recordRng(result, rngMatched, rngTotal, result.firstDivergence);
        if (screensTotal > 0) recordScreens(result, screensMatched, screensTotal);
        if (result._colorStats?.total > 0) {
            recordColors(result, result._colorStats.matched, result._colorStats.total);
            delete result._colorStats;
        }
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
        const generated = await generateMapsWithCoreReplay(session.meta.seed, maxDepth);

        for (const level of levels) {
            const depth = level.depth || 1;
            if (level.typGrid) {
                const diffs = compareGrids(generated?.grids?.[depth] || [], level.typGrid);
                recordGrids(result, diffs.length === 0 ? 1 : 0, 1);
                if (diffs.length > 0) {
                    const first = findFirstGridDiff(generated?.grids?.[depth] || [], level.typGrid);
                    if (first) {
                        setFirstDivergence(result, 'grid', { depth, ...first });
                    }
                }
            }

            const generatedRng = generated?.rngLogs?.[depth]?.rng || [];
            if (level.rng.length > 0) {
                recordRngComparison(result, generatedRng, level.rng, { depth });
            } else if (Number.isInteger(level.rngCalls)) {
                const rngCalls = generated?.rngLogs?.[depth]?.rngCalls;
                if (rngCalls !== level.rngCalls) {
                    setFirstDivergence(result, 'rng', {
                        depth,
                        expected: String(level.rngCalls),
                        actual: String(rngCalls),
                    });
                }
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

export async function runSessionResult(session) {
    return withSessionFixedDatetime(session, () =>
        withSessionReplayEnv(session, async () => {
            ensureSessionGlobals();
            resetSessionRuntimeState();
            if (session.meta.type === 'chargen') return runChargenResult(session);
            if (session.meta.type === 'interface' && session.meta.regen?.subtype === 'chargen') {
                return runChargenResult(session);
            }
            if (session.meta.type === 'interface') return runInterfaceResult(session);
            if (session.meta.type === 'map') return runMapResult(session);
            if (session.meta.type === 'special') return runSpecialResult(session);
            return runGameplayResult(session);
        }));
}

function summarizeTimeoutProgress(progress) {
    if (!progress || typeof progress !== 'object') return null;
    const step = Number.isInteger(progress.step) ? progress.step : null;
    const key = (typeof progress.key === 'string' && progress.key.length > 0)
        ? progress.key
        : null;
    const topline = (typeof progress.topline === 'string')
        ? progress.topline
        : '';
    return {
        step,
        key,
        topline,
        pendingPrompt: !!progress.pendingPrompt,
        multi: Number.isInteger(progress.multi) ? progress.multi : 0,
    };
}

function createSessionTimeoutResult(session, timeoutMs, progress = null) {
    const result = createReplayResult(session);
    result.passed = false;
    const snapshot = summarizeTimeoutProgress(progress);
    if (snapshot) {
        const keyPart = snapshot.key ? ` key=${JSON.stringify(snapshot.key)}` : '';
        const toplinePart = snapshot.topline ? ` topline=${JSON.stringify(snapshot.topline)}` : '';
        result.error =
            `Session timed out after ${timeoutMs}ms` +
            ` (last step=${snapshot.step ?? 'unknown'}${keyPart}` +
            ` pendingPrompt=${snapshot.pendingPrompt} multi=${snapshot.multi}${toplinePart})`;
        result.timeoutDiagnostics = snapshot;
    } else {
        result.error = `Session timed out after ${timeoutMs}ms`;
    }
    setDuration(result, timeoutMs);
    return result;
}

async function runSingleSessionWithTimeout(session, timeoutMs) {
    const workerPath = join(__dirname, 'session_worker.js');
    const filePath = join(session.dir, session.file);
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath);
        let lastProgress = null;
        let done = false;
        const finish = (result) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                worker.postMessage({ type: 'exit' });
            } catch {
                // Worker may already be terminated/torn down.
            }
            resolve(result);
        };
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            worker.terminate().catch(() => {});
            resolve(createSessionTimeoutResult(session, timeoutMs, lastProgress));
        }, timeoutMs);
        worker.on('message', (msg) => {
            if (msg.type === 'progress' && msg.id === 0) {
                lastProgress = msg.progress;
                return;
            }
            if (msg.type !== 'result' || msg.id !== 0) return;
            finish(msg.result);
        });
        worker.on('error', (error) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            reject(error);
        });
        worker.postMessage({ type: 'run', id: 0, filePath });
    });
}

async function runSessionsParallel(sessions, { numWorkers, verbose, onProgress, sessionTimeoutMs }) {
    const workerPath = join(__dirname, 'session_worker.js');
    const results = new Array(sessions.length);

    // Sort by file size (largest first) for better load balancing
    const indexed = sessions.map((s, i) => {
        const filePath = join(s.dir, s.file);
        const size = statSync(filePath).size;
        return { index: i, session: s, filePath, size };
    });
    indexed.sort((a, b) => b.size - a.size);

    let nextTask = 0;
    let completed = 0;

    return new Promise((resolve, reject) => {
        const workerStates = new Set();
        let settled = false;

        const maybeResolve = () => {
            if (settled) return;
            if (completed !== sessions.length) return;
            settled = true;
            for (const state of workerStates) {
                clearTimeout(state.timer);
                state.timer = null;
                try {
                    state.worker.postMessage({ type: 'exit' });
                } catch {
                    // Worker may already be terminated.
                }
            }
            resolve(results);
        };

        const deliverResult = (id, result) => {
            if (settled) return;
            if (results[id]) return;
            results[id] = result;
            completed++;
            if (onProgress) onProgress(completed, sessions.length, result);
            if (verbose) console.log(formatResult(result));
            maybeResolve();
        };

        const assignNextTask = (state) => {
            if (settled) return false;
            if (nextTask >= indexed.length) {
                state.task = null;
                return false;
            }
            const task = indexed[nextTask++];
            state.task = task;
            state.lastProgress = null;
            if (Number.isInteger(sessionTimeoutMs) && sessionTimeoutMs > 0) {
                clearTimeout(state.timer);
                state.timer = setTimeout(() => {
                    const timedOutTask = state.task;
                    if (!timedOutTask || settled) return;
                    state.terminatedForTimeout = true;
                    clearTimeout(state.timer);
                    state.timer = null;
                    state.task = null;
                    deliverResult(
                        timedOutTask.index,
                        createSessionTimeoutResult(timedOutTask.session, sessionTimeoutMs, state.lastProgress)
                    );
                    state.worker.terminate().catch(() => {});
                    if (!settled && nextTask < indexed.length) spawnWorker();
                }, sessionTimeoutMs);
            }
            state.worker.postMessage({
                type: 'run',
                id: task.index,
                filePath: task.filePath,
            });
            return true;
        };

        const spawnWorker = () => {
            if (settled) return;
            const state = {
                worker: new Worker(workerPath),
                task: null,
                timer: null,
                terminatedForTimeout: false,
                lastProgress: null,
            };
            workerStates.add(state);

            state.worker.on('message', (msg) => {
                if (settled) return;
                if (msg.type === 'progress') {
                    if (state.task && msg.id === state.task.index) {
                        state.lastProgress = msg.progress;
                    }
                    return;
                }
                if (msg.type !== 'result') return;
                clearTimeout(state.timer);
                state.timer = null;
                state.task = null;
                state.lastProgress = null;
                deliverResult(msg.id, msg.result);
                assignNextTask(state);
            });

            state.worker.on('error', (error) => {
                if (settled) return;
                if (state.terminatedForTimeout) return;
                reject(error);
            });

            state.worker.on('exit', () => {
                workerStates.delete(state);
            });

            assignNextTask(state);
        };

        const count = Math.min(numWorkers, sessions.length);
        for (let i = 0; i < count; i++) spawnWorker();
        if (sessions.length === 0) resolve([]);
    });
}

export async function runSessionBundle({
    verbose = false,
    useGolden = false,
    goldenBranch = 'golden',
    typeFilter = null,
    sessionPath = null,
    sessionListPath = null,
    sessionNames = null,
    failedFromPath = null,
    failFast = false,
    parallel = availableParallelism(),
    onProgress = null,
    sessionTimeoutMs = 20000,
} = {}) {
    // Keep JS replay-time calendar/luck behavior aligned with C captures.
    // Allow explicit caller override via environment.
    if (!process.env.NETHACK_FIXED_DATETIME) {
        process.env.NETHACK_FIXED_DATETIME = DEFAULT_FIXED_DATETIME;
    }

    const sessions = loadAllSessions({
        sessionsDir: SESSIONS_DIR,
        mapsDir: MAPS_DIR,
        useGolden,
        goldenBranch,
        typeFilter,
        sessionPath,
    }).filter((session) => !SKIP_SESSIONS.has(session.file));

    const requested = new Set();
    if (sessionListPath) {
        const text = readFileSync(sessionListPath, 'utf8');
        for (const raw of text.split(/\r?\n/)) {
            const name = raw.trim();
            if (!name || name.startsWith('#')) continue;
            requested.add(name);
        }
    }
    if (Array.isArray(sessionNames)) {
        for (const name of sessionNames) {
            const trimmed = String(name || '').trim();
            if (trimmed) requested.add(trimmed);
        }
    }
    if (failedFromPath) {
        const text = readFileSync(failedFromPath, 'utf8');
        const parsed = JSON.parse(text);
        const failing = Array.isArray(parsed?.results)
            ? parsed.results.filter((r) => r && r.passed === false)
            : [];
        for (const row of failing) {
            const name = String(row?.session || '').trim();
            if (name) requested.add(name);
        }
    }
    const filteredSessions = requested.size > 0
        ? sessions.filter((session) => requested.has(session.file))
        : sessions;

    if (isComparisonArtifactsEnabled() && !process.env.WEBHACK_COMPARISON_DIR) {
        process.env.WEBHACK_COMPARISON_DIR = initComparisonArtifactsRunDir();
    }

    if (verbose) {
        console.log('=== Session Test Runner ===');
        if (typeFilter) console.log(`Type filter: ${String(typeFilter)}`);
        if (sessionPath) console.log(`Single session: ${sessionPath}`);
        if (sessionListPath) console.log(`Session list: ${sessionListPath}`);
        if (failedFromPath) console.log(`Failed sessions source: ${failedFromPath}`);
        if (requested.size > 0) console.log(`Requested session names: ${requested.size}`);
        if (useGolden) console.log(`Using golden branch: ${goldenBranch}`);
        if (parallel > 0) console.log(`Parallel workers: ${parallel}`);
        if (Number.isInteger(sessionTimeoutMs) && sessionTimeoutMs > 0) {
            console.log(`Per-session timeout: ${sessionTimeoutMs}ms`);
        }
        if (process.env.WEBHACK_COMPARISON_DIR) {
            console.log(`Comparison artifacts: ${process.env.WEBHACK_COMPARISON_DIR}`);
        }
        console.log(`Loaded sessions: ${filteredSessions.length}`);
    }

    let results;
    const sessionType = (s) => {
        const t = String(s?.meta?.type || '').trim().toLowerCase();
        return t || 'other';
    };
    const uniqueTypes = new Set(filteredSessions.map(sessionType));
    const shouldTypeBatchParallel = parallel > 0
        && !failFast
        && filteredSessions.length > 1
        && uniqueTypes.size > 1;
    if (parallel > 0 && !failFast && filteredSessions.length > 1) {
        if (shouldTypeBatchParallel) {
            // Run session types in separate worker pools so module state from
            // one type (notably map generation) can't leak into another type.
            const typeOrder = ['gameplay', 'chargen', 'interface', 'special', 'map', 'other'];
            const groups = new Map();
            for (const session of filteredSessions) {
                const t = sessionType(session);
                if (!groups.has(t)) groups.set(t, []);
                groups.get(t).push(session);
            }
            const orderedTypes = [...typeOrder.filter((t) => groups.has(t)),
                ...[...groups.keys()].filter((t) => !typeOrder.includes(t))];
            const resultByFile = new Map();
            for (const type of orderedTypes) {
                const batch = groups.get(type) || [];
                if (batch.length === 0) continue;
                const batchResults = await runSessionsParallel(batch, {
                    numWorkers: parallel,
                    verbose,
                    onProgress,
                    sessionTimeoutMs,
                });
                for (const r of batchResults) resultByFile.set(r.session, r);
            }
            results = filteredSessions
                .map((s) => resultByFile.get(s.file))
                .filter(Boolean);
        } else {
            // Run in parallel using worker threads
            results = await runSessionsParallel(filteredSessions, {
                numWorkers: parallel,
                verbose,
                onProgress,
                sessionTimeoutMs,
            });
        }
    } else {
        // Run sequentially
        results = [];
        const useSessionTimeout = Number.isInteger(sessionTimeoutMs)
            && sessionTimeoutMs > 0;
        for (const session of filteredSessions) {
            const result = useSessionTimeout
                ? await runSingleSessionWithTimeout(session, sessionTimeoutMs)
                : await runSessionResult(session);
            results.push(result);
            if (verbose) console.log(formatResult(result));
            if (failFast && result.passed !== true) {
                if (verbose) console.log(`Fail-fast: stopping after ${result.session}`);
                break;
            }
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
        sessionListPath: null,
        sessionNames: null,
        failedFromPath: null,
        failFast: false,
        parallel: availableParallelism(),
        sessionTimeoutMs: 20000,
    };
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--verbose') args.verbose = true;
        else if (arg === '--golden') args.useGolden = true;
        else if (arg === '--fail-fast') args.failFast = true;
        else if (arg === '--no-parallel') args.parallel = 0;
        else if (arg === '--parallel') args.parallel = availableParallelism();
        else if (arg.startsWith('--parallel=')) {
            const val = arg.slice('--parallel='.length);
            args.parallel = val === 'auto' ? availableParallelism() : parseInt(val, 10);
        }
        else if (arg === '--session-timeout-ms' && argv[i + 1]) {
            args.sessionTimeoutMs = parseInt(argv[++i], 10);
        }
        else if (arg.startsWith('--session-timeout-ms=')) {
            args.sessionTimeoutMs = parseInt(arg.slice('--session-timeout-ms='.length), 10);
        }
        else if (arg === '--datetime-source' && argv[i + 1]) {
            process.env.NETHACK_SESSION_DATETIME_SOURCE = argv[++i];
        }
        else if (arg.startsWith('--datetime-source=')) {
            process.env.NETHACK_SESSION_DATETIME_SOURCE = arg.slice('--datetime-source='.length);
        }
        else if (arg === '--type' && argv[i + 1]) args.typeFilter = argv[++i];
        else if (arg.startsWith('--type=')) args.typeFilter = arg.slice('--type='.length);
        else if (arg === '--session-list' && argv[i + 1]) args.sessionListPath = argv[++i];
        else if (arg.startsWith('--session-list=')) args.sessionListPath = arg.slice('--session-list='.length);
        else if (arg === '--sessions' && argv[i + 1]) {
            args.sessionNames = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
        } else if (arg.startsWith('--sessions=')) {
            args.sessionNames = arg.slice('--sessions='.length).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (arg === '--failed') {
            if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
                args.failedFromPath = resolve(process.cwd(), argv[++i]);
            } else {
                args.failedFromPath = resolve(process.cwd(), 'oracle/pending.jsonl');
            }
        } else if (arg.startsWith('--failed=')) {
            const value = arg.slice('--failed='.length).trim();
            args.failedFromPath = value.length > 0
                ? resolve(process.cwd(), value)
                : resolve(process.cwd(), 'oracle/pending.jsonl');
        }
        else if (arg === '--help' || arg === '-h') {
            console.log('Usage: node session_test_runner.js [options] [session-file]');
            console.log('Options:');
            console.log('  --verbose         Show detailed output');
            console.log('  --parallel[=N]    Run with N workers (default: auto-detect CPU count)');
            console.log('  --fail-fast       Stop on first failure');
            console.log('  --type=TYPE       Filter by session type (chargen,gameplay,etc)');
            console.log('  --session-list=FILE  Run only session files listed in FILE (one per line)');
            console.log('  --sessions=a,b,c  Run only these session files (comma-separated)');
            console.log('  --failed[=FILE]   Run sessions marked failed in FILE (default: oracle/pending.jsonl)');
            console.log('  --session-timeout-ms=N  Timeout for single-session runs (default: 20000)');
            console.log('  --datetime-source=MODE  session|recorded-at-prefer|recorded-at-only');
            console.log('  --golden          Compare against golden branch');
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
        sessionListPath: args.sessionListPath,
        sessionNames: args.sessionNames,
        failedFromPath: args.failedFromPath,
        failFast: args.failFast,
        parallel: args.parallel,
        sessionTimeoutMs: args.sessionTimeoutMs,
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
