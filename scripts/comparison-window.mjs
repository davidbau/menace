#!/usr/bin/env node
// Inspect windows from merged .comparison.json artifacts.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
        if (existsSync(direct)) return direct;
        const byIndex = indexRows.find((row) => row.session === target || row.file === target);
        if (byIndex) return join(runDir, byIndex.file);
        const files = readdirSync(runDir).filter((f) => f.endsWith('.comparison.json'));
        const fuzzy = files.find((f) => f.includes(target));
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

function renderWindow(artifact, channel, center, windowSize) {
    const cmp = artifact?.comparison?.[channel];
    if (!cmp) throw new Error(`Channel not found: ${channel}`);
    const js = cmp.js;
    const c = cmp.session;
    const total = Math.max(js.normalized.length, c.normalized.length);
    const start = Math.max(0, center - windowSize);
    const end = Math.min(total - 1, center + windowSize);
    console.log(`artifact: ${artifact?.session?.file}`);
    console.log(`channel: ${channel} index=${center} window=${windowSize} total=${total}`);
    for (let i = start; i <= end; i++) {
        const marker = i === center ? '>>' : '  ';
        const jVal = js.normalized[i] ?? '(missing)';
        const cVal = c.normalized[i] ?? '(missing)';
        const jRawIdx = js.rawIndexMap[i];
        const cRawIdx = c.rawIndexMap[i];
        const jRaw = jRawIdx != null ? js.raw[jRawIdx] : '(missing)';
        const cRaw = cRawIdx != null ? c.raw[cRawIdx] : '(missing)';
        const jStep = stepForIndex(js.stepEnds, i);
        const cStep = stepForIndex(c.stepEnds, i);
        console.log(`${marker}[${i}] JS(step=${jStep}) ${jVal}`);
        console.log(`${marker}      raw#${jRawIdx ?? '-'} ${jRaw}`);
        console.log(`${marker}   C(step=${cStep}) ${cVal}`);
        console.log(`${marker}      raw#${cRawIdx ?? '-'} ${cRaw}`);
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
    renderWindow(artifact, channel, center, args.window);
}

main();
