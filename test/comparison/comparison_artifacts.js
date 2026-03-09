// test/comparison/comparison_artifacts.js
// Persist merged C-vs-JS comparison artifacts for fast divergence debugging.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { getComparableEventStreams, stripEventContext } from './comparators.js';

const DEFAULT_BASE_DIR = resolve(process.cwd(), 'tmp', 'session-comparisons');
const LATEST_FILE = 'LATEST';
const INDEX_FILE = 'index.jsonl';
const FORMAT_VERSION = 'comparison-v1';

function envEnabled(name) {
    const v = process.env[name];
    if (v == null) return false;
    const s = String(v).trim().toLowerCase();
    return !(s === '' || s === '0' || s === 'false' || s === 'no' || s === 'off');
}

function parsePositiveInt(value, fallback) {
    const n = Number.parseInt(String(value ?? ''), 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

function shouldKeepEntry(entry, { eventsOnly = false } = {}) {
    if (typeof entry !== 'string' || entry.length === 0) return false;
    if (eventsOnly) {
        if (entry[0] !== '^') return false;
        return true;
    }
    const noPrefix = entry.replace(/^\d+\s+/, '');
    if (!noPrefix) return false;
    if (noPrefix[0] === '>' || noPrefix[0] === '<' || noPrefix[0] === '^') return false;
    if (noPrefix.startsWith('rne(') || noPrefix.startsWith('rnz(') || noPrefix.startsWith('d(')) return false;
    return true;
}

function stripRngSourceTag(entry) {
    if (!entry || typeof entry !== 'string') return '';
    const noPrefix = entry.replace(/^\d+\s+/, '');
    const atIndex = noPrefix.indexOf(' @ ');
    return atIndex >= 0 ? noPrefix.slice(0, atIndex) : noPrefix;
}

function flattenRawRngFromSessionLike(sessionLike) {
    const startup = Array.isArray(sessionLike?.startup?.rng) ? sessionLike.startup.rng : [];
    const steps = Array.isArray(sessionLike?.steps) ? sessionLike.steps : [];
    const stepRng = steps.map((step) => (Array.isArray(step?.rng) ? step.rng : []));
    return { startup, stepRng, raw: [...startup, ...stepRng.flat()] };
}

function buildComparableEventChannel(entries = []) {
    const filtered = Array.isArray(entries) ? entries : [];
    return {
        raw: filtered,
        normalized: filtered.map((entry) => stripEventContext(entry)),
        rawIndexMap: filtered.map((_entry, idx) => idx),
        stepEnds: [],
    };
}

function normalizeChannel(sessionLike, { eventsOnly = false } = {}) {
    const { startup, stepRng, raw } = flattenRawRngFromSessionLike(sessionLike);
    const normalized = [];
    const rawIndexMap = [];
    const stepEnds = [0]; // step 0 == startup
    let rawIndex = 0;

    const scan = (entries) => {
        for (const entry of entries) {
            if (shouldKeepEntry(entry, { eventsOnly })) {
                normalized.push(eventsOnly ? stripEventContext(entry) : stripRngSourceTag(entry));
                rawIndexMap.push(rawIndex);
            }
            rawIndex++;
        }
    };

    scan(startup);
    stepEnds[0] = normalized.length;
    for (const entries of stepRng) {
        scan(entries);
        stepEnds.push(normalized.length);
    }

    return { raw, normalized, rawIndexMap, stepEnds };
}

function boundedSlice(arr, center, radius = 64) {
    const list = Array.isArray(arr) ? arr : [];
    if (!Number.isInteger(center) || center < 0 || list.length === 0) {
        return { start: 0, end: -1, entries: [] };
    }
    const safeRadius = Math.max(0, radius | 0);
    const start = Math.max(0, center - safeRadius);
    const endExcl = Math.min(list.length, center + safeRadius + 1);
    return {
        start,
        end: endExcl - 1,
        entries: list.slice(start, endExcl),
    };
}

function summarizeChannelForArtifact(channel, firstDivergence, {
    fullLimit = 20000,
    contextRadius = 80,
    edgeSize = 256,
} = {}) {
    const ch = channel || {};
    const raw = Array.isArray(ch.raw) ? ch.raw : [];
    const normalized = Array.isArray(ch.normalized) ? ch.normalized : [];
    const rawIndexMap = Array.isArray(ch.rawIndexMap) ? ch.rawIndexMap : [];
    const stepEnds = Array.isArray(ch.stepEnds) ? ch.stepEnds : [];

    if (normalized.length <= fullLimit && raw.length <= fullLimit) {
        return {
            mode: 'full',
            raw,
            normalized,
            rawIndexMap,
            stepEnds,
        };
    }

    const divNorm = Number.isInteger(firstDivergence?.index) ? firstDivergence.index : null;
    const divRaw = (divNorm !== null && divNorm >= 0 && divNorm < rawIndexMap.length)
        ? rawIndexMap[divNorm]
        : null;

    const normWindow = boundedSlice(normalized, divNorm, contextRadius);
    const rawWindow = boundedSlice(raw, divRaw, contextRadius);

    return {
        mode: 'windowed',
        totals: {
            raw: raw.length,
            normalized: normalized.length,
        },
        firstDivergence: {
            normalizedIndex: divNorm,
            rawIndex: divRaw,
        },
        normalizedWindow: normWindow,
        rawWindow,
        normalizedHead: normalized.slice(0, edgeSize),
        normalizedTail: edgeSize > 0 ? normalized.slice(-edgeSize) : [],
        rawHead: raw.slice(0, edgeSize),
        rawTail: edgeSize > 0 ? raw.slice(-edgeSize) : [],
        stepEnds: stepEnds.length <= fullLimit ? stepEnds : stepEnds.slice(0, 4096),
    };
}

function safeComparisonFilename(sessionFile) {
    const base = basename(sessionFile || 'unknown.session.json');
    if (base.endsWith('.session.json')) return base.replace(/\.session\.json$/, '.comparison.json');
    if (base.endsWith('.json')) return base.replace(/\.json$/, '.comparison.json');
    return `${base}.comparison.json`;
}

export function isComparisonArtifactsEnabled() {
    const v = process.env.WEBHACK_COMPARISON_ARTIFACTS;
    if (v == null) return true;
    return !(v === '0' || v.toLowerCase?.() === 'false');
}

function buildStepScreenContext(session, replay, result, targetStep = null) {
    const first = result?.firstDivergence || null;
    const fds = result?.firstDivergences || {};
    const screenLike = first?.channel === 'screen'
        || first?.channel === 'color'
        || first?.channel === 'screenWindow'
        || first?.channel === 'colorWindow'
        || first?.channel === 'cursor'
        || !!fds.screen
        || !!fds.color
        || !!fds.screenWindow
        || !!fds.colorWindow
        || !!fds.cursor;
    if (!screenLike) return null;

    const preferred = Number.isInteger(targetStep) ? targetStep : (first?.step
        ?? fds.screen?.step
        ?? fds.color?.step
        ?? fds.screenWindow?.step
        ?? fds.colorWindow?.step
        ?? fds.cursor?.step
        ?? null);
    const center = Number.isInteger(preferred) ? preferred : null;
    if (!center || center < 1) return null;

    const radius = parsePositiveInt(process.env.WEBHACK_COMPARISON_SCREEN_CONTEXT, 2);
    const steps = [];
    const start = Math.max(1, center - radius);
    const end = center + radius;
    for (let step = start; step <= end; step++) {
        const idx = step - 1;
        const cStep = session?.steps?.[idx] || null;
        const jStep = replay?.steps?.[idx] || null;
        steps.push({
            step,
            key: cStep?.key ?? null,
            session: {
                screen: Array.isArray(cStep?.screen) ? cStep.screen : [],
                screenAnsi: Array.isArray(cStep?.screenAnsi) ? cStep.screenAnsi : [],
                cursor: Array.isArray(cStep?.cursor) ? cStep.cursor : null,
            },
            js: {
                screen: Array.isArray(jStep?.screen) ? jStep.screen : [],
                screenAnsi: Array.isArray(jStep?.screenAnsi) ? jStep.screenAnsi : [],
                cursor: Array.isArray(jStep?.cursor) ? jStep.cursor : null,
            },
        });
    }

    return {
        centerStep: center,
        radius,
        steps,
    };
}

export function initComparisonArtifactsRunDir({ baseDir = DEFAULT_BASE_DIR } = {}) {
    mkdirSync(baseDir, { recursive: true });
    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-pid${process.pid}`;
    const runDir = join(baseDir, runId);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(baseDir, LATEST_FILE), `${runDir}\n`, 'utf8');
    writeFileSync(join(runDir, 'README.txt'),
        'Comparison artifacts for fast C-vs-JS divergence debugging.\n',
        'utf8');
    return runDir;
}

export function getLatestComparisonArtifactsRunDir({ baseDir = DEFAULT_BASE_DIR } = {}) {
    const latestPath = join(baseDir, LATEST_FILE);
    if (!existsSync(latestPath)) return null;
    const dir = readFileSync(latestPath, 'utf8').trim();
    return dir || null;
}

export function buildComparisonArtifact(session, replay, cmp, result) {
    const jsRng = normalizeChannel(replay, { eventsOnly: false });
    const cRng = normalizeChannel(session, { eventsOnly: false });
    const jsRaw = flattenRawRngFromSessionLike(replay).raw;
    const cRaw = flattenRawRngFromSessionLike(session).raw;
    const { js: jsComparableEvents, session: cComparableEvents } = getComparableEventStreams(jsRaw, cRaw);
    const jsEvents = buildComparableEventChannel(jsComparableEvents);
    const cEvents = buildComparableEventChannel(cComparableEvents);

    const artifact = {
        format: FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        session: {
            file: session.file,
            type: session?.meta?.type || null,
            seed: session?.meta?.seed ?? null,
            role: session?.meta?.role || null,
            race: session?.meta?.race || null,
            gender: session?.meta?.gender || null,
            alignment: session?.meta?.alignment || null,
            options: session?.meta?.options || {},
            stepCount: Array.isArray(session?.steps) ? session.steps.length : 0,
        },
        result: {
            passed: !!result?.passed,
            metrics: result?.metrics || {},
            firstDivergence: result?.firstDivergence || null,
            firstDivergences: result?.firstDivergences || {},
            duration: result?.duration ?? null,
        },
        comparison: {
            rng: {
                matched: cmp?.rng?.matched ?? 0,
                total: cmp?.rng?.total ?? 0,
                firstDivergence: cmp?.rng?.firstDivergence || null,
                js: summarizeChannelForArtifact(jsRng, cmp?.rng?.firstDivergence),
                session: summarizeChannelForArtifact(cRng, cmp?.rng?.firstDivergence),
            },
            event: {
                matched: cmp?.event?.matched ?? 0,
                total: cmp?.event?.total ?? 0,
                firstDivergence: cmp?.event?.firstDivergence || null,
                js: summarizeChannelForArtifact(jsEvents, cmp?.event?.firstDivergence),
                session: summarizeChannelForArtifact(cEvents, cmp?.event?.firstDivergence),
            },
        },
    };

    if (envEnabled('WEBHACK_COMPARISON_INCLUDE_SCREENS')) {
        const context = buildStepScreenContext(session, replay, result);
        if (context) artifact.screenContext = context;
        const cursorStep = result?.firstDivergences?.cursor?.step;
        if (Number.isInteger(cursorStep)) {
            const cursorContext = buildStepScreenContext(session, replay, result, cursorStep);
            if (cursorContext) artifact.cursorContext = cursorContext;
        }
    }

    return artifact;
}

export function writeComparisonArtifact(runDir, sessionFile, artifact) {
    const filename = safeComparisonFilename(sessionFile);
    const path = join(runDir, filename);
    writeFileSync(path, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    const summary = {
        session: sessionFile,
        file: filename,
        passed: !!artifact?.result?.passed,
        firstDivergenceChannel: artifact?.result?.firstDivergence?.channel
            || Object.keys(artifact?.result?.firstDivergences || {})[0]
            || null,
        firstDivergence: artifact?.result?.firstDivergence || null,
        createdAt: artifact?.createdAt || new Date().toISOString(),
    };
    appendFileSync(join(runDir, INDEX_FILE), `${JSON.stringify(summary)}\n`, 'utf8');
    return path;
}
