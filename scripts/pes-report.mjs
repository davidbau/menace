#!/usr/bin/env node
/**
 * scripts/pes-report.mjs
 *
 * PES (PRNG / Event / Screen) Session Parity Report
 *
 * Displays per-gameplay-session parity as "step of first divergence / total steps"
 * for each of three channels, with ANSI color coding:
 *   GREEN  = 100% — no divergence through all steps
 *   YELLOW = ≥80% — first divergence at or after step 80% of total
 *   RED    = ≤25% — first divergence at or before step 25% of total
 *   plain  = 26–79% — mid-range
 *
 * Usage:
 *   node scripts/pes-report.mjs                  # Read from latest git note (instant)
 *   node scripts/pes-report.mjs FILE.json         # Read from results JSON file
 *   node scripts/pes-report.mjs --diagnose        # Include full AI TL;DR below the table
 *   node scripts/pes-report.mjs --no-color        # Disable ANSI colors
 *
 * To run all gameplay sessions first, then report:
 *   scripts/run-and-report.sh
 *
 * See docs/PESREPORT.md for full documentation.
 */

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, '..');
const CACHE_FILE = join(REPO_ROOT, 'oracle', 'pes-diagnoses.json');

// ──────────────────────────────────────────────────────────────────────
// ANSI helpers
// ──────────────────────────────────────────────────────────────────────

const ANSI_GREEN  = '\x1b[32m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_RED    = '\x1b[31m';
const ANSI_BOLD   = '\x1b[1m';
const ANSI_DIM    = '\x1b[2m';
const ANSI_RESET  = '\x1b[0m';

let useColor = !process.env.NO_COLOR && process.stdout.isTTY;

function cGreen(t)  { return useColor ? `${ANSI_GREEN}${t}${ANSI_RESET}`  : t; }
function cYellow(t) { return useColor ? `${ANSI_YELLOW}${t}${ANSI_RESET}` : t; }
function cRed(t)    { return useColor ? `${ANSI_RED}${t}${ANSI_RESET}`    : t; }
function cBold(t)   { return useColor ? `${ANSI_BOLD}${t}${ANSI_RESET}`   : t; }
function cDim(t)    { return useColor ? `${ANSI_DIM}${t}${ANSI_RESET}`    : t; }

// Visible length of a string (ignoring ANSI escape codes)
function visLen(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

// Right-pad a (possibly ANSI-colored) string to a given visible width
function padEndVis(s, width, fill = ' ') {
    const need = width - visLen(s);
    return need > 0 ? s + fill.repeat(need) : s;
}
function padStartVis(s, width, fill = ' ') {
    const need = width - visLen(s);
    return need > 0 ? fill.repeat(need) + s : s;
}

// ──────────────────────────────────────────────────────────────────────
// Session name formatting
// ──────────────────────────────────────────────────────────────────────

function shortName(file) {
    // Strip .session.json suffix
    return file.replace(/\.session\.json$/, '');
}

// Key used for the DIAGNOSES map: strip _gameplay from the short name
function diagKey(file) {
    return shortName(file).replace(/_gameplay$/, '');
}

// ──────────────────────────────────────────────────────────────────────
// Metric cell formatting
// ──────────────────────────────────────────────────────────────────────

const CELL_W = 12; // visible width of each PES metric cell

/**
 * Format one PES metric cell.
 * @param {number|null} step   - Step of first divergence (1-indexed), or null if none
 * @param {number}      total  - Total steps in session (screens.total)
 * @param {boolean}     full   - True if channel matched 100%
 * @returns {string}           - ANSI-colored cell of width CELL_W
 */
function fmtCell(step, total, full) {
    if (!total) return ' '.repeat(CELL_W);   // no data — blank

    let raw;
    let pct;
    if (full) {
        raw = `✓${String(total).padStart(CELL_W - 2)}`;
        pct = 1.0;
    } else {
        const stepStr = (step != null) ? String(step) : '?';
        const ratio   = `${stepStr}/${total}`;
        // right-align within the cell: "✗" + padded ratio
        raw = `✗${ratio.padStart(CELL_W - 2)}`;
        pct = (step != null && total > 0) ? step / total : null;
    }

    // Apply color based on pct
    if (pct === null) return raw;
    if (pct >= 1.0)   return cGreen(raw);
    if (pct <= 0.25)  return cRed(raw);
    if (pct >= 0.80)  return cYellow(raw);
    return raw;  // 26–79%: plain
}

// ──────────────────────────────────────────────────────────────────────
// Diagnosis cache (oracle/pes-diagnoses.json)
// Each entry: { hash, cat, tldr }  keyed by diagKey(session)
// hash = MD5 of firstDivergence data; entry is stale if hash mismatches
// ──────────────────────────────────────────────────────────────────────

function hashDivergence(result) {
    const fd = result.firstDivergence || {};
    const data = JSON.stringify({
        step:         fd.step,
        jsRaw:        fd.jsRaw   || fd.js,
        sessionRaw:   fd.sessionRaw || fd.session,
        sessionStack: fd.sessionStack,
    });
    return createHash('md5').update(data).digest('hex').slice(0, 8);
}

function loadCache() {
    try {
        if (existsSync(CACHE_FILE)) return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    } catch {}
    return {};
}

function getCached(cache, result) {
    const entry = cache[diagKey(result.session)];
    if (!entry) return null;
    if (entry.hash !== hashDivergence(result)) return null;  // stale
    return entry;
}

// Extract bare event type from a raw event string like "^dog_goal_start @ dog_move <= ..."
function eventType(s) {
    return (s || '').split(' @ ')[0].split('[')[0] || '?';
}

// Find the first character difference between two screen lines
function screenCharDiff(js, session) {
    const a = js || '', b = session || '';
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
            const got  = a[i] ? `'${a[i]}'` : '(end)';
            const want = b[i] ? `'${b[i]}'` : '(end)';
            return `${got} instead of ${want}`;
        }
    }
    return 'differs';
}

// Short inline note: cached cat, or per-channel fallback
function shortNote(result, cache) {
    const entry = getCached(cache, result);
    if (entry) return entry.cat;
    const fds = result.firstDivergences || {};
    if (fds.rng) {
        const jsFn   = (fds.rng.jsRaw      || '').split(' @ ')[1]?.split('(')[0] || '?';
        const sessFn = (fds.rng.sessionRaw  || '').split(' @ ')[1]?.split('(')[0] || '?';
        return `${jsFn} vs ${sessFn}`;
    }
    if (fds.event) {
        return `event: ${eventType(fds.event.js)} vs ${eventType(fds.event.session)}`;
    }
    if (fds.screen) {
        return `screen row ${fds.screen.row ?? '?'}, ${screenCharDiff(fds.screen.js, fds.screen.session)}`;
    }
    return 'unknown divergence';
}

// Full paragraph: cached tldr, or per-channel fallback
function fullDiagnose(result, cache) {
    const entry = getCached(cache, result);
    if (entry) return entry.tldr;
    const fds = result.firstDivergences || {};
    if (fds.rng) {
        const fd     = fds.rng;
        const jsFn   = (fd.jsRaw      || '').split(' @ ')[1]?.split('(')[0] || '?';
        const sessFn = (fd.sessionRaw  || '').split(' @ ')[1]?.split('(')[0] || '?';
        const stack  = Array.isArray(fd.sessionStack) && fd.sessionStack.length > 0
            ? ` (C stack: ${fd.sessionStack.map(s => s.split(' @ ')[1]?.split('(')[0]).join('→')})`
            : '';
        return `JS calls ${jsFn} while C calls ${sessFn}${stack}. (Run scripts/gen-pes-diagnoses.mjs to generate AI analysis.)`;
    }
    if (fds.event) {
        return `Events diverge at step ${fds.event.step ?? '?'}: JS emits ${eventType(fds.event.js)} while C emits ${eventType(fds.event.session)}. (Run scripts/gen-pes-diagnoses.mjs to generate AI analysis.)`;
    }
    if (fds.screen) {
        const diff = screenCharDiff(fds.screen.js, fds.screen.session);
        return `Screen diverges at step ${fds.screen.step ?? '?'}, row ${fds.screen.row ?? '?'}: ${diff}. (Run scripts/gen-pes-diagnoses.mjs to generate AI analysis.)`;
    }
    return 'No divergence data recorded.';
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);

    if (args.includes('--no-color')) useColor = false;
    if (args.includes('--color'))    useColor = true;

    const showDiagnose   = args.includes('--diagnose');
    const diagnoseOnly   = args.includes('--diagnose-only');
    const failuresOnly   = args.includes('--failures');

    // Determine results source
    let bundle;
    const fileArg = args.find(a => !a.startsWith('--'));
    if (fileArg) {
        bundle = JSON.parse(readFileSync(resolve(process.cwd(), fileArg), 'utf8'));
    } else {
        try {
            const raw = execSync('git notes --ref=test-results show HEAD 2>/dev/null', { encoding: 'utf8' });
            bundle = JSON.parse(raw);
        } catch {
            console.error('Error: No results file given and no git note found on HEAD.');
            console.error('Usage: node scripts/pes-report.mjs [results.json]');
            process.exit(1);
        }
    }

    const cache = loadCache();
    const allResults  = Array.isArray(bundle.results) ? bundle.results : [];
    const allGameplay = allResults.filter(r => r.type === 'gameplay');
    const gameplay    = failuresOnly ? allGameplay.filter(r => !r.passed) : allGameplay;

    if (allGameplay.length === 0) {
        console.log('No gameplay sessions found in results.');
        process.exit(0);
    }

    // ── Header ────────────────────────────────────────────────────────
    const commit = bundle.commit || '?';
    const date   = (bundle.timestamp || '').slice(0, 10) || '?';
    const NAME_W = 46;
    const LINE_W = NAME_W + 3 * (CELL_W + 2);

    if (!diagnoseOnly) {
        console.log();
        console.log(cBold('PES SESSION TEST REPORT') +
            cDim(`   commit=${commit}   ${date}`));
        console.log('═'.repeat(LINE_W));

        // Column headers
        const hdr = padEndVis(cBold('Session'), NAME_W)
            + '  ' + padEndVis(cBold('PRNG'), CELL_W)
            + '  ' + padEndVis(cBold('Events'), CELL_W)
            + '  ' + padEndVis(cBold('Screen'), CELL_W);
        console.log(hdr);
        console.log('─'.repeat(LINE_W));
    }

    // ── Per-session rows ──────────────────────────────────────────────
    const failingResults = [];

    for (const r of gameplay) {
        const name  = shortName(r.session);
        const m     = r.metrics || {};
        const fds   = r.firstDivergences || {};

        // Total steps: use screens.total as the per-step denominator
        const total = m.screens?.total || 0;

        // RNG channel
        const rngFull  = (m.rngCalls?.total > 0) && (m.rngCalls.matched === m.rngCalls.total);
        const rngTotal = total;   // show divergence in "steps" units
        const rngStep  = fds.rng?.step ?? null;

        // Events channel
        const evFull  = (m.events?.total > 0) && (m.events.matched === m.events.total);
        const evHasData = m.events?.total > 0;
        const evTotal = evHasData ? total : 0;
        const evStep  = fds.event?.step ?? null;

        // Screen channel
        const scFull  = (m.screens?.total > 0) && (m.screens.matched === m.screens.total);
        const scTotal = total;
        const scStep  = fds.screen?.step ?? null;

        if (!diagnoseOnly) {
            const rngCell = fmtCell(rngStep, rngTotal, rngFull);
            const evCell  = fmtCell(evStep,  evTotal,  evFull);
            const scCell  = fmtCell(scStep,  scTotal,  scFull);

            const passIndicator = r.passed ? cGreen('✓') : cRed('✗');
            const namePad = padEndVis(name, NAME_W - 2);  // -2 for indicator + space

            // Short inline note for failing sessions (from cache if valid)
            const note = (!r.passed) ? cDim('  ' + shortNote(r, cache)) : '';

            console.log(
                passIndicator + ' ' + namePad +
                '  ' + rngCell +
                '  ' + evCell  +
                '  ' + scCell  +
                note
            );
        }

        if (!r.passed) failingResults.push(r);
    }

    // ── Summary ───────────────────────────────────────────────────────
    if (!diagnoseOnly) {
        console.log('═'.repeat(LINE_W));

        // Always report against the full session set, even with --failures
        const passing = allGameplay.filter(r => r.passed).length;
        const failing = allGameplay.length - passing;
        const passingStr = cGreen(String(passing));
        const failingStr = failing > 0 ? cRed(String(failing)) : String(failing);
        console.log(
            cBold('Gameplay: ') + `${passingStr}/${allGameplay.length} passing, ${failingStr} failing`
        );

        // Aggregate per-channel counts from full set
        const rngFull  = allGameplay.filter(r => (r.metrics?.rngCalls?.total > 0)
            && r.metrics.rngCalls.matched === r.metrics.rngCalls.total).length;
        const evFull   = allGameplay.filter(r => (r.metrics?.events?.total > 0)
            && r.metrics.events.matched === r.metrics.events.total).length;
        const scFull   = allGameplay.filter(r => (r.metrics?.screens?.total > 0)
            && r.metrics.screens.matched === r.metrics.screens.total).length;
        const rngComp  = allGameplay.filter(r => r.metrics?.rngCalls?.total > 0).length;
        const evComp   = allGameplay.filter(r => r.metrics?.events?.total > 0).length;
        const scComp   = allGameplay.filter(r => r.metrics?.screens?.total > 0).length;

        console.log(
            cDim('  100% channels: ')
            + `PRNG ${cGreen(rngFull + '/' + rngComp)}`
            + `   Events ${cGreen(evFull + '/' + evComp)}`
            + `   Screen ${cGreen(scFull + '/' + scComp)}`
        );

        // ── Color legend ──────────────────────────────────────────────
        console.log(cDim(
            `  Color: ${ANSI_GREEN}GREEN=100%${ANSI_RESET}${ANSI_DIM}   `
            + `${ANSI_YELLOW}YELLOW=≥80%${ANSI_RESET}${ANSI_DIM}   `
            + `plain=26–79%   `
            + `${ANSI_RED}RED=≤25%${ANSI_RESET}`
        ));
    }

    // ── Failure diagnoses (--diagnose or --diagnose-only) ─────────────
    if ((showDiagnose || diagnoseOnly) && failingResults.length > 0) {
        console.log();
        console.log(cBold('FAILURE DIAGNOSES — AI TL;DR'));
        console.log('─'.repeat(LINE_W));

        for (const r of failingResults) {
            const name  = shortName(r.session);
            const total = r.metrics?.screens?.total || 0;
            const fd    = r.firstDivergence || {};
            const step  = fd.step ?? '?';
            const body  = fullDiagnose(r, cache);

            console.log();
            console.log(`${cBold(name)}  ${cDim(`(first div: step ${step}/${total})`)}`);
            console.log(`  ${cBold('[' + shortNote(r, cache) + ']')}`);
            // Word-wrap the body
            const words = body.split(' ');
            let line = '  ';
            for (const word of words) {
                if (line.length + word.length + 1 > LINE_W - 2) {
                    console.log(line);
                    line = '    ' + word;
                } else {
                    line += (line === '  ' ? '' : ' ') + word;
                }
            }
            if (line.trim()) console.log(line);
        }
    }

    console.log();
}

main();
