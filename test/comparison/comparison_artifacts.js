// test/comparison/comparison_artifacts.js
// Persist merged C-vs-JS comparison artifacts for fast divergence debugging.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const DEFAULT_BASE_DIR = resolve(process.cwd(), 'tmp', 'session-comparisons');
const LATEST_FILE = 'LATEST';
const INDEX_FILE = 'index.jsonl';
const FORMAT_VERSION = 'comparison-v1';

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

function stripEventContext(entry) {
    if (typeof entry !== 'string') return '';
    const at = entry.indexOf('] @');
    return at >= 0 ? entry.slice(0, at + 1) : entry;
}

function flattenRawRngFromSessionLike(sessionLike) {
    const startup = Array.isArray(sessionLike?.startup?.rng) ? sessionLike.startup.rng : [];
    const steps = Array.isArray(sessionLike?.steps) ? sessionLike.steps : [];
    const stepRng = steps.map((step) => (Array.isArray(step?.rng) ? step.rng : []));
    return { startup, stepRng, raw: [...startup, ...stepRng.flat()] };
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
    const jsEvents = normalizeChannel(replay, { eventsOnly: true });
    const cEvents = normalizeChannel(session, { eventsOnly: true });

    return {
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
                js: jsRng,
                session: cRng,
            },
            event: {
                matched: cmp?.event?.matched ?? 0,
                total: cmp?.event?.total ?? 0,
                firstDivergence: cmp?.event?.firstDivergence || null,
                js: jsEvents,
                session: cEvents,
            },
        },
    };
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
