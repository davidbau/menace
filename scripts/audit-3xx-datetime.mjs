#!/usr/bin/env node
// Audit 3xx gameplay sessions for datetime-conditioned parity drift.
//
// For each session, run parity with:
// - the session's recorded datetime (from session/options or keylog meta), and
// - one or more candidate datetimes (defaults include a known full-moon date).
//
// Reports sessions where an alternate datetime materially improves parity.

import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve('.');
const SESSION_DIR = resolve(ROOT, 'test/comparison/sessions');
const DEFAULT_GLOB_RE = /^seed(30[1-9]|31[0-3]|32[1-9]|33[0-3]).*_gameplay\.session\.json$/;
const DEFAULT_DATES = ['20000110090000', '20000120090000'];

function usage() {
    console.error(
        'Usage: node scripts/audit-3xx-datetime.mjs [--session <file>] [--date <yyyymmddhhmmss>]...'
    );
}

function parseArgs(argv) {
    const out = { sessions: [], dates: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--session') {
            const v = argv[++i];
            if (!v) throw new Error('--session requires a value');
            out.sessions.push(v);
        } else if (a === '--date') {
            const v = argv[++i];
            if (!v) throw new Error('--date requires a value');
            out.dates.push(v);
        } else if (a === '--help' || a === '-h') {
            usage();
            process.exit(0);
        } else {
            throw new Error(`Unknown argument: ${a}`);
        }
    }
    return out;
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function readKeylogDatetime(rawSession) {
    const keylog = rawSession?.regen?.keylog;
    if (typeof keylog !== 'string' || keylog.length === 0) return null;
    const keylogPath = resolve(ROOT, keylog);
    try {
        const first = (readFileSync(keylogPath, 'utf8').split(/\r?\n/, 1)[0] || '').trim();
        if (!first) return null;
        const row = JSON.parse(first);
        const dt = row?.datetime;
        return (typeof dt === 'string' && /^\d{14}$/.test(dt)) ? dt : null;
    } catch {
        return null;
    }
}

function getSessionDatetime(rawSession) {
    const opt = rawSession?.options?.datetime;
    if (typeof opt === 'string' && /^\d{14}$/.test(opt)) return opt;
    const regen = rawSession?.regen?.datetime;
    if (typeof regen === 'string' && /^\d{14}$/.test(regen)) return regen;
    return readKeylogDatetime(rawSession);
}

function runOneSession(sessionPath) {
    const cp = spawnSync(
        'node',
        ['test/comparison/session_test_runner.js', '--verbose', sessionPath],
        { cwd: ROOT, encoding: 'utf8' }
    );
    const combined = `${cp.stdout || ''}\n${cp.stderr || ''}`;
    const marker = '__RESULTS_JSON__';
    const idx = combined.lastIndexOf(marker);
    if (idx < 0) {
        throw new Error(`No results marker for ${sessionPath}\n${combined}`);
    }
    const jsonText = combined.slice(idx + marker.length).trim();
    const parsed = JSON.parse(jsonText);
    const result = parsed?.results?.[0];
    if (!result) throw new Error(`No result payload for ${sessionPath}`);
    return {
        session: basename(sessionPath),
        passed: !!result.passed,
        rngMatched: Number(result?.metrics?.rngCalls?.matched || 0),
        rngTotal: Number(result?.metrics?.rngCalls?.total || 0),
        screenMatched: Number(result?.metrics?.screens?.matched || 0),
        screenTotal: Number(result?.metrics?.screens?.total || 0),
        eventMatched: Number(result?.metrics?.events?.matched || 0),
        eventTotal: Number(result?.metrics?.events?.total || 0),
        first: result?.firstDivergence || null,
    };
}

function formatPct(n, d) {
    if (!d) return 'n/a';
    return `${((100 * n) / d).toFixed(1)}%`;
}

function main() {
    const { sessions, dates } = parseArgs(process.argv.slice(2));
    const candidates = dates.length ? dates : DEFAULT_DATES;

    const sessionFiles = sessions.length
        ? sessions.map((p) => resolve(ROOT, p))
        : readJsonSessions();

    const tempRoot = mkdtempSync(join(tmpdir(), 'datetime-audit-'));
    const report = [];

    try {
        for (const sessionPath of sessionFiles) {
            const raw = readJson(sessionPath);
            const baseDt = getSessionDatetime(raw) || DEFAULT_DATES[0];
            const dtList = Array.from(new Set([baseDt, ...candidates]));

            const runs = [];
            for (const dt of dtList) {
                const mod = { ...raw, options: { ...(raw.options || {}), datetime: dt } };
                const tmp = join(tempRoot, `${basename(sessionPath, '.json')}.${dt}.json`);
                writeFileSync(tmp, JSON.stringify(mod));
                const res = runOneSession(tmp);
                runs.push({ datetime: dt, ...res });
            }

            const baseline = runs.find((r) => r.datetime === baseDt) || runs[0];
            const best = runs.reduce((a, b) => {
                if (b.rngMatched !== a.rngMatched) return b.rngMatched > a.rngMatched ? b : a;
                if (b.screenMatched !== a.screenMatched) return b.screenMatched > a.screenMatched ? b : a;
                return b.eventMatched > a.eventMatched ? b : a;
            }, runs[0]);

            report.push({
                session: basename(sessionPath),
                baselineDt: baseDt,
                baseline,
                best,
                improved: best.datetime !== baseline.datetime
                    && (best.rngMatched > baseline.rngMatched
                        || best.screenMatched > baseline.screenMatched
                        || best.eventMatched > baseline.eventMatched),
            });
        }
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }

    printReport(report);
}

function readJsonSessions() {
    return readdirSync(SESSION_DIR)
        .filter((f) => DEFAULT_GLOB_RE.test(f))
        .sort()
        .map((f) => join(SESSION_DIR, f));
}

function printReport(report) {
    const suspects = report.filter((r) => r.improved);
    console.log(`Audited sessions: ${report.length}`);
    console.log(`Datetime-improved suspects: ${suspects.length}`);
    console.log('');
    console.log('session                                   base_dt        best_dt        rng(base->best)   screen(base->best) events(base->best)');
    for (const r of report) {
        const b = r.baseline;
        const k = r.best;
        const mark = r.improved ? '*' : ' ';
        const line = [
            `${mark} ${r.session}`.padEnd(41),
            String(r.baselineDt).padEnd(14),
            String(k.datetime).padEnd(14),
            `${b.rngMatched}/${b.rngTotal} -> ${k.rngMatched}/${k.rngTotal}`.padEnd(20),
            `${b.screenMatched}/${b.screenTotal} -> ${k.screenMatched}/${k.screenTotal}`.padEnd(23),
            `${b.eventMatched}/${b.eventTotal} -> ${k.eventMatched}/${k.eventTotal}`,
        ].join(' ');
        console.log(line);
    }
    console.log('');
    if (suspects.length) {
        console.log('Suspects (*) indicate a better match under alternate datetime.');
    } else {
        console.log('No datetime-improved suspects found for tested candidates.');
    }
}

main();
