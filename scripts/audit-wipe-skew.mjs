#!/usr/bin/env node
// Detect likely stale recordings by comparing ^wipe vs ^movemon_turn event counts.
// This is diagnostic-only; it does not change comparator behavior.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getLatestComparisonArtifactsRunDir } from '../test/comparison/comparison_artifacts.js';

function usage() {
    console.log('Usage: node scripts/audit-wipe-skew.mjs [--dir <artifact-run-dir>] [--limit <N>]');
}

function parseArgs(argv) {
    const out = { dir: null, limit: 50 };
    const args = argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--help' || a === '-h') return { help: true };
        if (a === '--dir') { out.dir = args[++i]; continue; }
        if (a === '--limit') { out.limit = Number.parseInt(args[++i], 10) || 50; continue; }
        throw new Error(`Unknown arg: ${a}`);
    }
    return out;
}

function loadIndex(runDir) {
    const p = join(runDir, 'index.jsonl');
    if (!existsSync(p)) return [];
    return readFileSync(p, 'utf8')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => JSON.parse(s));
}

function countEvent(raw = []) {
    let wipe = 0;
    let movemon = 0;
    for (const entry of raw) {
        const s = String(entry);
        if (s.startsWith('^wipe[')) wipe++;
        if (s.startsWith('^movemon_turn[')) movemon++;
    }
    return { wipe, movemon };
}

function ratio(wipe, movemon) {
    if (movemon <= 0) return 0;
    return wipe / movemon;
}

function classify(js, c) {
    const jsRatio = ratio(js.wipe, js.movemon);
    const cRatio = ratio(c.wipe, c.movemon);
    const hugeGap = c.wipe >= Math.max(20, js.wipe * 20);
    const severeSkew = c.wipe >= 20 && hugeGap && cRatio >= 0.6;
    const moderateSkew = c.wipe >= 5 && c.wipe >= Math.max(10, js.wipe * 8) && cRatio >= 0.3;
    return { jsRatio, cRatio, severeSkew, moderateSkew };
}

function render(n) {
    return Number.isFinite(n) ? n.toFixed(3) : '0.000';
}

async function main() {
    const opts = parseArgs(process.argv);
    if (opts.help) {
        usage();
        return;
    }
    const runDir = opts.dir ? resolve(opts.dir) : getLatestComparisonArtifactsRunDir();
    if (!runDir || !existsSync(runDir)) {
        throw new Error('No comparison artifacts directory found.');
    }

    const indexRows = loadIndex(runDir);
    const files = indexRows.length > 0
        ? indexRows.map((r) => r.file)
        : readdirSync(runDir).filter((f) => f.endsWith('.comparison.json'));

    const rows = [];
    for (const file of files) {
        const p = join(runDir, file);
        if (!existsSync(p)) continue;
        const data = JSON.parse(readFileSync(p, 'utf8'));
        const js = countEvent(data?.comparison?.event?.js?.raw || []);
        const c = countEvent(data?.comparison?.event?.session?.raw || []);
        const flags = classify(js, c);
        rows.push({
            file,
            session: data?.session?.file || file,
            js,
            c,
            ...flags,
        });
    }

    rows.sort((a, b) => {
        const sA = Number(b.severeSkew) - Number(a.severeSkew);
        if (sA !== 0) return sA;
        const mA = Number(b.moderateSkew) - Number(a.moderateSkew);
        if (mA !== 0) return mA;
        return (b.cRatio - a.cRatio);
    });

    console.log(`runDir: ${runDir}`);
    console.log('session\tjs_wipe/js_move\tc_wipe/c_move\tjs_ratio\tc_ratio\tflag');
    let printed = 0;
    for (const r of rows) {
        const flag = r.severeSkew ? 'SEVERE' : (r.moderateSkew ? 'MODERATE' : '');
        if (!flag && printed >= opts.limit) continue;
        console.log(
            `${r.session}\t${r.js.wipe}/${r.js.movemon}\t${r.c.wipe}/${r.c.movemon}\t${render(r.jsRatio)}\t${render(r.cRatio)}\t${flag}`
        );
        printed++;
    }
}

main().catch((err) => {
    console.error(`audit-wipe-skew: ${err.message}`);
    process.exit(1);
});
