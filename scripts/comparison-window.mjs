#!/usr/bin/env node
// Inspect windows from merged .comparison.json artifacts.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { getLatestComparisonArtifactsRunDir } from '../test/comparison/comparison_artifacts.js';

function usage() {
    console.log('Usage: node scripts/comparison-window.mjs [session|file] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dir <path>        Artifact run directory (default: latest run)');
    console.log('  --session <name>    Session basename to inspect (alias for positional target)');
    console.log('  --file <path>       Path to a .comparison.json artifact');
    console.log('  --list              List artifacts in the selected directory');
    console.log('  --channel <name>    rng|event (default: rng)');
    console.log('  --index <n>         Explicit normalized index (default: first divergence)');
    console.log('  --window <n>        Context on each side (default: 8)');
    console.log('  --view <name>       normalized|filtered-raw|raw|all (default: all)');
    console.log('  --raw-filter <name> none|gameplay (default: gameplay)');
    console.log('  --raw-step          Show raw slices for the normalized divergence step');
    console.log('  --step-summary      Show per-step RNG/event count deltas');
    console.log('  --step-from <n>     First step for --step-summary (default: 1)');
    console.log('  --step-to <n>       Last step for --step-summary (default: session step count)');
    console.log('  --help              Show this help');
}

function parseArgs(argv) {
    const args = argv.slice(2);
    const out = {
        target: null,
        dir: null,
        list: false,
        channel: 'rng',
        index: null,
        window: 8,
        view: 'all',
        rawFilter: 'gameplay',
        rawStep: false,
        stepSummary: false,
        stepFrom: null,
        stepTo: null,
    };
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--help' || a === '-h') return { help: true };
        if (a === '--list') { out.list = true; continue; }
        if (a === '--dir') { out.dir = args[++i]; continue; }
        if (a === '--session' || a === '--file') { out.target = args[++i]; continue; }
        if (a === '--channel') { out.channel = args[++i] || 'rng'; continue; }
        if (a === '--index') { out.index = Number.parseInt(args[++i], 10); continue; }
        if (a === '--window') { out.window = Number.parseInt(args[++i], 10) || 8; continue; }
        if (a === '--view') { out.view = args[++i] || 'all'; continue; }
        if (a === '--raw-filter') { out.rawFilter = args[++i] || 'gameplay'; continue; }
        if (a === '--raw-step') { out.rawStep = true; continue; }
        if (a === '--step-summary') { out.stepSummary = true; continue; }
        if (a === '--step-from') { out.stepFrom = Number.parseInt(args[++i], 10); continue; }
        if (a === '--step-to') { out.stepTo = Number.parseInt(args[++i], 10); continue; }
        if (!out.target) { out.target = a; continue; }
        throw new Error(`Unknown arg: ${a}`);
    }
    return out;
}

function loadIndex(runDir) {
    const indexPath = join(runDir, 'index.jsonl');
    if (!existsSync(indexPath)) return [];
    return readFileSync(indexPath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function pickArtifactPath(runDir, target, indexRows) {
    if (target) {
        const direct = resolve(target);
        const targetBase = basename(target);
        const targetStem = targetBase
            .replace(/\.session\.json$/i, '')
            .replace(/\.comparison\.json$/i, '')
            .replace(/\.json$/i, '');
        if (existsSync(direct) && direct.endsWith('.comparison.json')) return direct;
        const byIndex = indexRows.find((row) => {
            const rowSession = row.session || '';
            const rowFile = row.file || '';
            const rowSessionBase = basename(rowSession);
            const rowFileBase = basename(rowFile);
            const rowStem = rowSessionBase
                .replace(/\.session\.json$/i, '')
                .replace(/\.json$/i, '');
            return row.session === target
                || row.file === target
                || rowSessionBase === targetBase
                || rowFileBase === targetBase
                || rowStem === targetStem;
        });
        if (byIndex) return join(runDir, byIndex.file);
        const files = readdirSync(runDir).filter((f) => f.endsWith('.comparison.json'));
        const fuzzy = files.find((f) => f.includes(target) || f.includes(targetBase) || f.includes(targetStem));
        if (fuzzy) return join(runDir, fuzzy);
        return null;
    }
    const firstFail = indexRows.find((row) => row.passed === false);
    if (firstFail) return join(runDir, firstFail.file);
    if (indexRows[0]) return join(runDir, indexRows[0].file);
    const files = readdirSync(runDir).filter((f) => f.endsWith('.comparison.json'));
    return files[0] ? join(runDir, files[0]) : null;
}

function listRunDirs(baseDir) {
    if (!existsSync(baseDir)) return [];
    return readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(baseDir, d.name))
        .sort((a, b) => b.localeCompare(a));
}

function stepForIndex(stepEnds, index) {
    const ends = Array.isArray(stepEnds) ? stepEnds : [];
    for (let i = 0; i < ends.length; i++) {
        if (index < ends[i]) return i; // 0=startup, 1..N = step
    }
    return 'n/a';
}

function stepRange(stepEnds, step) {
    const ends = Array.isArray(stepEnds) ? stepEnds : [];
    const n = Number(step);
    if (!Number.isInteger(n) || n < 0 || n >= ends.length) return null;
    const start = n === 0 ? 0 : (ends[n - 1] || 0);
    const end = (ends[n] || 0) - 1;
    return { start, end };
}

function rawStepRange(side, step) {
    const normalizedRange = stepRange(side?.stepEnds, step);
    if (!normalizedRange) return null;
    const map = Array.isArray(side?.rawIndexMap) ? side.rawIndexMap : [];
    if (normalizedRange.end < normalizedRange.start || map.length === 0) return null;
    const rawStart = map[normalizedRange.start];
    const rawEnd = map[normalizedRange.end];
    if (!Number.isInteger(rawStart) || !Number.isInteger(rawEnd)) return null;
    return { start: rawStart, end: rawEnd };
}

function clampRawRangeToWindow(rawRange, rawWindow) {
    if (!rawRange || !rawWindow) return { range: rawRange, partial: false };
    const windowStart = rawWindow.start;
    const windowEnd = (rawWindow.end || (rawWindow.start + rawWindow.entries.length)) - 1;
    const start = Math.max(rawRange.start, windowStart);
    const end = Math.min(rawRange.end, windowEnd);
    return {
        range: start <= end ? { start, end } : null,
        partial: start !== rawRange.start || end !== rawRange.end,
        requested: rawRange,
        available: { start: windowStart, end: windowEnd },
    };
}

function isGameplayRawEntry(entry, channel) {
    if (typeof entry !== 'string' || entry.length === 0) return false;
    if (channel === 'event') return true;
    const line = entry.replace(/^\d+\s+/, '');
    if (!line) return false;
    if (line.startsWith('^tmp_at_step')) return false;
    if (line.startsWith('^runmode_delay_output')) return false;
    if (line.startsWith('^render')) return false;
    if (line.startsWith('^docrt')) return false;
    if (line.startsWith('^vision_recalc')) return false;
    if (line.startsWith('~drn2(')) return false;
    return true;
}

function filterRawEntries(entries, channel, rawFilter) {
    const list = Array.isArray(entries) ? entries : [];
    if (rawFilter !== 'gameplay') return list;
    return list.filter((entry) => isGameplayRawEntry(entry?.entry, channel));
}

function formatRawRows(entries, { center }) {
    const rows = [];
    for (const item of entries) {
        const rawIndex = item?.rawIndex;
        const marker = rawIndex === center ? '>>' : '  ';
        rows.push(`${marker}[${rawIndex}] ${item?.entry ?? '(missing)'}`);
    }
    return rows;
}

function printRows(title, rows) {
    console.log('');
    console.log(title);
    if (!rows.length) {
        console.log('(empty)');
        return;
    }
    for (const row of rows) console.log(row);
}

function hasLegacyArrays(side) {
    return side && Array.isArray(side.normalized) && Array.isArray(side.raw);
}

function hasWindowArrays(side) {
    return side
        && side.normalizedWindow
        && Array.isArray(side.normalizedWindow.entries)
        && side.rawWindow
        && Array.isArray(side.rawWindow.entries);
}

function getWindowSlice(side, center, windowSize) {
    if (hasLegacyArrays(side)) {
        const total = side.normalized.length;
        const start = Math.max(0, center - windowSize);
        const end = Math.min(total - 1, center + windowSize);
        const rows = [];
        for (let i = start; i <= end; i++) {
            const rawIdx = side.rawIndexMap?.[i];
            rows.push({
                globalIndex: i,
                normalized: side.normalized[i] ?? '(missing)',
                rawIndex: rawIdx ?? null,
                raw: rawIdx != null ? (side.raw?.[rawIdx] ?? '(missing)') : '(missing)',
                step: stepForIndex(side.stepEnds, i),
            });
        }
        return { start, end, total, rows };
    }
    if (hasWindowArrays(side)) {
        const w = side.normalizedWindow;
        const rw = side.rawWindow;
        const total = Number.isInteger(side.totals?.normalized) ? side.totals.normalized : w.end;
        const start = Math.max(w.start, center - windowSize);
        const end = Math.min(w.end - 1, center + windowSize);
        const rows = [];
        for (let i = start; i <= end; i++) {
            const rel = i - w.start;
            const rawRel = i - rw.start;
            rows.push({
                globalIndex: i,
                normalized: w.entries[rel] ?? '(missing)',
                rawIndex: Number.isInteger(rawRel) ? rw.start + rawRel : null,
                raw: rw.entries[rawRel] ?? '(missing)',
                step: stepForIndex(side.stepEnds, i),
            });
        }
        return {
            start,
            end,
            total,
            rows,
            windowStart: w.start,
            windowEnd: w.end,
        };
    }
    return null;
}

function getRawContainer(side) {
    if (hasLegacyArrays(side)) {
        return {
            start: 0,
            end: side.raw.length - 1,
            entries: side.raw,
        };
    }
    if (side?.rawWindow && Array.isArray(side.rawWindow.entries)) {
        return {
            start: side.rawWindow.start,
            end: (side.rawWindow.end || (side.rawWindow.start + side.rawWindow.entries.length)) - 1,
            entries: side.rawWindow.entries,
        };
    }
    return null;
}

function renderWindow(artifact, channel, center, windowSize, { view = 'all', rawFilter = 'gameplay', rawStep = false } = {}) {
    const cmp = artifact?.comparison?.[channel];
    if (!cmp) throw new Error(`Channel not found: ${channel}`);
    const js = cmp.js;
    const c = cmp.session;
    if (channel !== 'rng' && (view === 'all' || view === 'filtered-raw' || view === 'raw')) {
        console.log('note: raw event views are not yet supported; event artifacts do not retain normalized-to-raw step mapping.');
        view = 'normalized';
        rawStep = false;
    } else if (rawStep && channel !== 'rng') {
        console.log('note: --raw-step is currently only supported for rng artifacts; event artifacts do not yet carry per-step raw index maps.');
        rawStep = false;
    }
    const jsWin = getWindowSlice(js, center, windowSize);
    const cWin = getWindowSlice(c, center, windowSize);
    if (!jsWin || !cWin) throw new Error(`Unsupported comparison shape for channel: ${channel}`);
    const total = Math.max(jsWin.total || 0, cWin.total || 0);
    const start = Math.min(jsWin.start, cWin.start);
    const end = Math.max(jsWin.end, cWin.end);
    console.log(`artifact: ${artifact?.session?.file}`);
    console.log(`channel: ${channel} index=${center} window=${windowSize} total=${total}`);
    if (Number.isInteger(jsWin.windowStart) || Number.isInteger(cWin.windowStart)) {
        const jsRange = Number.isInteger(jsWin.windowStart) ? `${jsWin.windowStart}..${jsWin.windowEnd - 1}` : 'full';
        const cRange = Number.isInteger(cWin.windowStart) ? `${cWin.windowStart}..${cWin.windowEnd - 1}` : 'full';
        console.log(`available normalized windows: js=${jsRange} c=${cRange}`);
    }
    if (view === 'all' || view === 'normalized') {
        const jsByIndex = new Map((jsWin.rows || []).map((r) => [r.globalIndex, r]));
        const cByIndex = new Map((cWin.rows || []).map((r) => [r.globalIndex, r]));
        console.log('');
        console.log('normalized');
        for (let i = start; i <= end; i++) {
            const marker = i === center ? '>>' : '  ';
            const jRow = jsByIndex.get(i);
            const cRow = cByIndex.get(i);
            const jVal = jRow?.normalized ?? '(missing)';
            const cVal = cRow?.normalized ?? '(missing)';
            const jRawIdx = jRow?.rawIndex;
            const cRawIdx = cRow?.rawIndex;
            const jRaw = jRow?.raw ?? '(missing)';
            const cRaw = cRow?.raw ?? '(missing)';
            const jStep = jRow?.step ?? stepForIndex(js.stepEnds, i);
            const cStep = cRow?.step ?? stepForIndex(c.stepEnds, i);
            console.log(`${marker}[${i}] JS(step=${jStep}) ${jVal}`);
            console.log(`${marker}      raw#${jRawIdx ?? '-'} ${jRaw}`);
            console.log(`${marker}   C(step=${cStep}) ${cVal}`);
            console.log(`${marker}      raw#${cRawIdx ?? '-'} ${cRaw}`);
        }
    }

    if (view === 'all' || view === 'filtered-raw' || view === 'raw') {
        const showFiltered = view === 'all' || view === 'filtered-raw';
        const showRaw = view === 'all' || view === 'raw';
        const jsStep = stepForIndex(js.stepEnds, center);
        const cStep = stepForIndex(c.stepEnds, center);
        const jsRawRange = rawStep ? rawStepRange(js, jsStep) : null;
        const cRawRange = rawStep ? rawStepRange(c, cStep) : null;
        const jsRawWin = getRawContainer(js);
        const cRawWin = getRawContainer(c);
        if (jsRawWin && Array.isArray(jsRawWin.entries)) {
            const rawCenter = Number.isInteger(js?.firstDivergence?.rawIndex)
                ? js.firstDivergence.rawIndex
                : jsRawWin.start;
            const requestedRange = rawStep && jsRawRange
                ? clampRawRangeToWindow(jsRawRange, jsRawWin)
                : null;
            const rawStart = requestedRange?.range
                ? requestedRange.range.start
                : Math.max(jsRawWin.start, rawCenter - windowSize);
            const rawEnd = requestedRange?.range
                ? requestedRange.range.end
                : Math.min(jsRawWin.end, rawCenter + windowSize);
            const entries = [];
            for (let r = rawStart; r <= rawEnd; r++) {
                const rel = r - jsRawWin.start;
                entries.push({ rawIndex: r, entry: jsRawWin.entries[rel] ?? '(missing)' });
            }
            if (rawStep && requestedRange?.partial) {
                console.log('');
                console.log(`note: JS raw-step view is partial; requested [${requestedRange.requested.start}..${requestedRange.requested.end}] but artifact only has [${requestedRange.available.start}..${requestedRange.available.end}]`);
            }
            if (showFiltered) {
                printRows(
                    `raw-window JS gameplay-filtered: [${rawStart}..${rawEnd}]`,
                    formatRawRows(filterRawEntries(entries, channel, rawFilter), { center: rawCenter })
                );
            }
            if (showRaw) {
                printRows(`raw-window JS: [${rawStart}..${rawEnd}]`, formatRawRows(entries, { center: rawCenter }));
            }
        }
        if (cRawWin && Array.isArray(cRawWin.entries)) {
            const rawCenter = Number.isInteger(c?.firstDivergence?.rawIndex)
                ? c.firstDivergence.rawIndex
                : cRawWin.start;
            const requestedRange = rawStep && cRawRange
                ? clampRawRangeToWindow(cRawRange, cRawWin)
                : null;
            const rawStart = requestedRange?.range
                ? requestedRange.range.start
                : Math.max(cRawWin.start, rawCenter - windowSize);
            const rawEnd = requestedRange?.range
                ? requestedRange.range.end
                : Math.min(cRawWin.end, rawCenter + windowSize);
            const entries = [];
            for (let r = rawStart; r <= rawEnd; r++) {
                const rel = r - cRawWin.start;
                entries.push({ rawIndex: r, entry: cRawWin.entries[rel] ?? '(missing)' });
            }
            if (rawStep && requestedRange?.partial) {
                console.log('');
                console.log(`note: C raw-step view is partial; requested [${requestedRange.requested.start}..${requestedRange.requested.end}] but artifact only has [${requestedRange.available.start}..${requestedRange.available.end}]`);
            }
            if (showFiltered) {
                printRows(
                    `raw-window C gameplay-filtered: [${rawStart}..${rawEnd}]`,
                    formatRawRows(filterRawEntries(entries, channel, rawFilter), { center: rawCenter })
                );
            }
            if (showRaw) {
                printRows(`raw-window C : [${rawStart}..${rawEnd}]`, formatRawRows(entries, { center: rawCenter }));
            }
        }
    }
}

function stepCountFromEnds(stepEnds) {
    if (!Array.isArray(stepEnds) || stepEnds.length === 0) return 0;
    return Math.max(0, stepEnds.length - 1);
}

function perStepCount(stepEnds, stepNum) {
    // stepNum is 1-based gameplay step index
    if (!Array.isArray(stepEnds)) return 0;
    const idx = Number(stepNum);
    if (!Number.isInteger(idx) || idx < 1 || idx >= stepEnds.length) return 0;
    return Math.max(0, (stepEnds[idx] || 0) - (stepEnds[idx - 1] || 0));
}

function renderStepSummary(artifact, stepFrom, stepTo) {
    const rng = artifact?.comparison?.rng;
    const evt = artifact?.comparison?.event;
    if (!rng || !evt) throw new Error('Artifact missing rng/event comparison data');
    const maxSteps = Math.max(
        stepCountFromEnds(rng.js.stepEnds),
        stepCountFromEnds(rng.session.stepEnds),
        stepCountFromEnds(evt.js.stepEnds),
        stepCountFromEnds(evt.session.stepEnds),
    );
    const from = Number.isInteger(stepFrom) ? Math.max(1, stepFrom) : 1;
    const to = Number.isInteger(stepTo) ? Math.min(maxSteps, stepTo) : maxSteps;
    let cumRng = 0;
    let cumEvt = 0;

    console.log(`artifact: ${artifact?.session?.file}`);
    console.log(`step-summary: steps ${from}..${to} (max=${maxSteps})`);
    for (let step = from; step <= to; step++) {
        const jsRng = perStepCount(rng.js.stepEnds, step);
        const cRng = perStepCount(rng.session.stepEnds, step);
        const jsEvt = perStepCount(evt.js.stepEnds, step);
        const cEvt = perStepCount(evt.session.stepEnds, step);
        cumRng += jsRng - cRng;
        cumEvt += jsEvt - cEvt;
        const marker = (jsRng !== cRng || jsEvt !== cEvt) ? '!!' : '  ';
        console.log(`${marker} step=${step} rng js/c=${jsRng}/${cRng} d=${jsRng - cRng} cum=${cumRng} | evt js/c=${jsEvt}/${cEvt} d=${jsEvt - cEvt} cum=${cumEvt}`);
    }
}

function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        usage();
        process.exit(0);
    }
    const initialRunDir = args.dir ? resolve(args.dir) : getLatestComparisonArtifactsRunDir();
    if (!initialRunDir) throw new Error('No comparison artifact run found. Run session_test_runner first.');
    if (!existsSync(initialRunDir)) throw new Error(`Comparison run directory not found: ${initialRunDir}`);
    let runDir = initialRunDir;

    let indexRows = loadIndex(runDir);
    if (args.list) {
        console.log(`runDir: ${runDir}`);
        if (indexRows.length === 0) {
            console.log('(no index rows)');
            return;
        }
        for (const row of indexRows) {
            const first = row.firstDivergence?.channel || row.firstDivergenceChannel || '-';
            console.log(`${row.passed ? 'PASS' : 'FAIL'} ${row.session} first=${first} file=${row.file}`);
        }
        return;
    }

    let artifactPath = pickArtifactPath(runDir, args.target, indexRows);
    if (!artifactPath && args.target && !args.dir) {
        const baseDir = dirname(initialRunDir);
        for (const candidateRunDir of listRunDirs(baseDir)) {
            if (candidateRunDir === initialRunDir) continue;
            const candidateIndexRows = loadIndex(candidateRunDir);
            const candidatePath = pickArtifactPath(candidateRunDir, args.target, candidateIndexRows);
            if (candidatePath) {
                runDir = candidateRunDir;
                indexRows = candidateIndexRows;
                artifactPath = candidatePath;
                break;
            }
        }
    }
    if (!artifactPath) throw new Error(`No artifact found for target: ${args.target || '(default)'}`);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    if (args.stepSummary) {
        renderStepSummary(artifact, args.stepFrom, args.stepTo);
        return;
    }
    const channel = args.channel === 'event' ? 'event' : 'rng';
    const first = artifact?.comparison?.[channel]?.firstDivergence?.index;
    const center = Number.isInteger(args.index) ? args.index : (Number.isInteger(first) ? first : 0);
    renderWindow(artifact, channel, center, args.window, {
        view: args.view,
        rawFilter: args.rawFilter,
        rawStep: args.rawStep,
    });
}

main();
