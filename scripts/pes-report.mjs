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
 *   node scripts/pes-report.mjs                  # Run tests if stale, then show report
 *   node scripts/pes-report.mjs FILE.json         # Read from results JSON file
 *   node scripts/pes-report.mjs --cached          # Read from git note without staleness check
 *   node scripts/pes-report.mjs --diagnose        # Include full AI TL;DR below the table
 *   node scripts/pes-report.mjs --no-color        # Disable ANSI colors
 *
 * To run all gameplay sessions first, then report:
 *   scripts/run-and-report.sh
 *
 * See docs/PESREPORT.md for full documentation.
 */

import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
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
 * Compute the yellow threshold for a column from its array of pct values.
 * - If any pct >= 0.90, threshold = 0.90 (highlight everything near-perfect)
 * - Else if any pct > 0.50, threshold = the maximum such pct (highlight the
 *   easiest case in the column so something is always yellow if possible)
 * - Else null (no yellow shown)
 * @param {Array<number|null>} pcts  - Pct values (0–1) for non-full sessions; nulls ignored
 * @returns {number|null}
 */
function columnYellowThreshold(pcts) {
    const valid = pcts.filter(p => p !== null && p < 1.0);
    if (valid.some(p => p >= 0.90)) return 0.90;
    const above50 = valid.filter(p => p > 0.50);
    if (above50.length === 0) return null;
    return Math.max(...above50);
}

/**
 * Format one PES metric cell.
 * @param {number|null} step        - Step of first divergence (1-indexed), or null if none
 * @param {number}      total       - Total steps in session (screens.total)
 * @param {boolean}     full        - True if channel matched 100%
 * @param {number|null} yellowThres - Yellow threshold for this column (from columnYellowThreshold)
 * @returns {string}                - ANSI-colored cell of width CELL_W
 */
function fmtCell(step, total, full, yellowThres = null) {
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
    if (full && pct >= 1.0) return cGreen(raw);
    if (pct <= 0.25)  return cRed(raw);
    if (yellowThres !== null && pct >= yellowThres) return cYellow(raw);
    return raw;  // plain
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
    const a = String(js || '');
    const b = String(session || '');
    const maxLen = Math.max(a.length, b.length);
    const quote = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
    const clip = (s, n = 24) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
    for (let i = 0; i < maxLen; i++) {
        const aCh = i < a.length ? a[i] : ' ';
        const bCh = i < b.length ? b[i] : ' ';
        // Reporting-only normalization: treat line-end and trailing spaces
        // as equivalent right-padding, but keep all non-space diffs visible.
        if (aCh !== bCh) {
            let j = i + 1;
            while (j < maxLen) {
                const aj = j < a.length ? a[j] : ' ';
                const bj = j < b.length ? b[j] : ' ';
                if (aj === bj) break;
                j++;
            }
            const gotSeg = clip(a.slice(i, Math.min(j, a.length)).padEnd(j - i, ' '));
            const wantSeg = clip(b.slice(i, Math.min(j, b.length)).padEnd(j - i, ' '));
            const got = quote(gotSeg);
            const want = quote(wantSeg);
            return `${got} instead of ${want}`;
        }
    }
    return 'trailing spaces only';
}

function timeoutSummary(result) {
    if (!result?.error || !/timed out/i.test(String(result.error))) return null;
    const td = result.timeoutDiagnostics || {};
    const step = Number.isInteger(td.step) ? td.step : null;
    const key = (typeof td.key === 'string' && td.key.length > 0) ? td.key : null;
    const topline = (typeof td.topline === 'string' && td.topline.length > 0) ? td.topline : null;
    const pendingPrompt = !!td.pendingPrompt;
    const multi = Number.isInteger(td.multi) ? td.multi : 0;
    return { step, key, topline, pendingPrompt, multi };
}

function truncateText(s, max = CELL_W - 2) {
    const src = String(s || '');
    if (src.length <= max) return src;
    if (max <= 1) return src.slice(0, max);
    return `${src.slice(0, max - 1)}…`;
}

function timeoutDetailText(timeout, maxWidth = 999) {
    const baseParts = ['TIMEOUT'];
    if (timeout.step != null) baseParts.push(`step=${timeout.step}`);
    if (timeout.key) baseParts.push(`key=${JSON.stringify(timeout.key)}`);
    baseParts.push(`p=${timeout.pendingPrompt ? 1 : 0}`);
    baseParts.push(`m=${timeout.multi}`);
    let text = baseParts.join(' ');
    if (!timeout.topline) return truncateText(text, maxWidth);
    const toplinePart = ` topline=${JSON.stringify(timeout.topline)}`;
    if (text.length + toplinePart.length <= maxWidth) return text + toplinePart;
    const remaining = maxWidth - text.length;
    if (remaining > 14) {
        return text + truncateText(toplinePart, remaining);
    }
    return truncateText(text, maxWidth);
}

function trimMiddleWords(s, max = 96) {
    const src = String(s || '').replace(/\s+/g, ' ').trim();
    if (src.length <= max) return src;
    if (max <= 7) return src.slice(0, max);
    const keep = max - 3;
    const left = Math.ceil(keep * 0.6);
    const right = Math.floor(keep * 0.4);
    return `${src.slice(0, left)}...${src.slice(src.length - right)}`;
}

function mismatchedChannels(result) {
    const out = [];
    const m = result?.metrics || {};
    const pushIfMismatch = (name, metric) => {
        if (!metric) return;
        const matched = Number(metric.matched ?? 0);
        const total = Number(metric.total ?? 0);
        if (total > 0 && matched < total) out.push(name);
    };
    pushIfMismatch('rng', m.rngCalls);
    pushIfMismatch('event', m.events);
    pushIfMismatch('screen', m.screens);
    pushIfMismatch('color', m.colors);
    pushIfMismatch('screenWindow', m.screenWindow);
    pushIfMismatch('colorWindow', m.colorWindow);
    pushIfMismatch('cursor', m.cursor);
    pushIfMismatch('mapdump', m.mapdump);
    pushIfMismatch('anim', m.animationBoundaries);
    return out;
}

// Short inline note: cached cat, or per-channel fallback
function shortNote(result, cache) {
    const screenEarlyOnly = result?.metrics?.screenWindow?.earlyOnlyCount || 0;
    const colorEarlyOnly = result?.metrics?.colorWindow?.earlyOnlyCount || 0;
    if (screenEarlyOnly > 0 || colorEarlyOnly > 0) {
        const steps = Array.isArray(result?.rerecordHint?.steps) ? result.rerecordHint.steps : [];
        const stepHint = steps.length ? ` @ step${steps.length > 1 ? 's' : ''} ${steps.join(',')}` : '';
        return `timing window match${stepHint}`;
    }
    const entry = getCached(cache, result);
    if (entry) return entry.cat;
    const timeout = timeoutSummary(result);
    if (timeout) {
        const stepPart = timeout.step != null ? `step ${timeout.step}` : 'unknown step';
        const keyPart = timeout.key ? ` key=${JSON.stringify(timeout.key)}` : '';
        return `timeout at ${stepPart}${keyPart} prompt=${timeout.pendingPrompt} multi=${timeout.multi}`;
    }
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
    if (fds.color) {
        const row = fds.color.row ?? '?';
        const col = fds.color.col ?? '?';
        return `color row ${row} col ${col}`;
    }
    if (fds.cursor) {
        return `cursor step ${fds.cursor.step ?? '?'}`;
    }
    if (fds.mapdump) {
        const cp = fds.mapdump.checkpointId || '?';
        const sec = fds.mapdump.section || '?';
        const x = fds.mapdump.x ?? '?';
        const y = fds.mapdump.y ?? '?';
        return `mapdump ${cp} ${sec}[${x},${y}]`;
    }
    if (result?.firstDivergence?.channel) {
        return `${result.firstDivergence.channel} divergence`;
    }
    const channels = mismatchedChannels(result);
    if (channels.length) return `unknown divergence (${channels.join(',')})`;
    return 'unknown divergence (no channel hint)';
}

// Full paragraph: cached tldr, or per-channel fallback
function fullDiagnose(result, cache) {
    const screenEarlyOnly = result?.metrics?.screenWindow?.earlyOnlyCount || 0;
    const colorEarlyOnly = result?.metrics?.colorWindow?.earlyOnlyCount || 0;
    if (screenEarlyOnly > 0 || colorEarlyOnly > 0) {
        const steps = Array.isArray(result?.rerecordHint?.steps) ? result.rerecordHint.steps : [];
        const stepHint = steps.length
            ? ` Focus re-record delay around steps ${steps.join(', ')}.`
            : '';
        return `Strict screen/color mismatches have an early animation-boundary match in JS, indicating likely capture timing misalignment rather than core RNG/event drift.${stepHint}`;
    }
    const entry = getCached(cache, result);
    if (entry) return entry.tldr;
    const timeout = timeoutSummary(result);
    if (timeout) {
        const stepPart = timeout.step != null ? `last observed step ${timeout.step}` : 'no observed step';
        const keyPart = timeout.key ? ` last key ${JSON.stringify(timeout.key)}.` : '.';
        const toplinePart = timeout.topline ? ` Topline: ${JSON.stringify(timeout.topline)}.` : '';
        return `Session timed out with ${stepPart}${keyPart} pendingPrompt=${timeout.pendingPrompt}, multi=${timeout.multi}.${toplinePart}`;
    }
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
    if (fds.color) {
        const row = fds.color.row ?? '?';
        const col = fds.color.col ?? '?';
        return `Color diverges at step ${fds.color.step ?? '?'}, row ${row}, col ${col}. (Run scripts/gen-pes-diagnoses.mjs to generate AI analysis.)`;
    }
    if (fds.cursor) {
        const exp = JSON.stringify(fds.cursor.expected ?? '?');
        const act = JSON.stringify(fds.cursor.actual ?? '?');
        return `Cursor diverges at step ${fds.cursor.step ?? '?'}: JS=${act}, C=${exp}. (Run scripts/gen-pes-diagnoses.mjs to generate AI analysis.)`;
    }
    if (fds.mapdump) {
        const fd = fds.mapdump;
        const cp = fd.checkpointId || '?';
        const sec = fd.section || '?';
        const x = fd.x ?? '?';
        const y = fd.y ?? '?';
        return `Mapdump diverges at checkpoint ${cp} (${sec}[${x},${y}]): JS=${JSON.stringify(fd.js ?? '?')}, C=${JSON.stringify(fd.session ?? '?')}.`;
    }
    if (result?.firstDivergence?.channel) {
        return `Divergence recorded on channel '${result.firstDivergence.channel}', but detailed payload was not available in firstDivergences.`;
    }
    const channels = mismatchedChannels(result);
    if (channels.length) {
        return `Divergence detected but no detailed firstDivergences payload was captured; mismatched channels: ${channels.join(', ')}.`;
    }
    return 'No divergence data recorded.';
}

// ──────────────────────────────────────────────────────────────────────
// Staleness check + auto-run
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns the newest mtime (ms) of any file that would affect gameplay test results:
 * session JSON files and JS source files.
 */
function newestRelevantMtime() {
    let newest = 0;

    function scanDir(dir, ext) {
        if (!existsSync(dir)) return;
        for (const f of readdirSync(dir)) {
            if (!f.endsWith(ext)) continue;
            try {
                const mt = statSync(join(dir, f)).mtimeMs;
                if (mt > newest) newest = mt;
            } catch { /* skip */ }
        }
    }

    // Session files
    scanDir(join(REPO_ROOT, 'test', 'comparison', 'sessions'), '.session.json');
    scanDir(join(REPO_ROOT, 'test', 'comparison', 'maps'), '.session.json');
    // JS game sources (changes invalidate cached results)
    scanDir(join(REPO_ROOT, 'js'), '.js');
    scanDir(join(REPO_ROOT, 'test', 'comparison'), '.js');

    return newest;
}

/**
 * Load results from git note if fresh, otherwise auto-run the gameplay tests.
 */
function loadFreshOrCachedBundle() {
    // Try to read existing git note
    let raw;
    try {
        raw = execSync('git notes --ref=test-results show HEAD 2>/dev/null', { encoding: 'utf8' });
    } catch { /* no note */ }

    if (raw) {
        try {
            const cached = JSON.parse(raw);
            const cachedTs = cached.timestamp ? new Date(cached.timestamp).getTime() : 0;
            const newestSession = newestRelevantMtime();
            if (cachedTs >= newestSession) {
                // Cache is fresh
                return cached;
            }
            console.error('Session files changed since last run — re-running tests...');
        } catch { /* parse error, re-run */ }
    } else {
        console.error('No cached results — running gameplay tests...');
    }

    // Run session tests and capture output
    const runner = join(REPO_ROOT, 'test', 'comparison', 'session_test_runner.js');
    const result = spawnSync(
        process.execPath,
        [runner, '--type=gameplay'],
        { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const output = (result.stdout || '') + (result.stderr || '');
    const match = output.match(/__RESULTS_JSON__\n(\{.*\})/s);
    if (!match) {
        console.error('Error: session_test_runner.js produced no results JSON.');
        process.exit(1);
    }
    return JSON.parse(match[1]);
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
    const useCached = args.includes('--cached');
    const fileArg = args.find(a => !a.startsWith('--'));
    if (fileArg) {
        bundle = JSON.parse(readFileSync(resolve(process.cwd(), fileArg), 'utf8'));
    } else if (useCached) {
        try {
            const raw = execSync('git notes --ref=test-results show HEAD 2>/dev/null', { encoding: 'utf8' });
            bundle = JSON.parse(raw);
        } catch {
            console.error('Error: --cached requested but no git note found on HEAD.');
            process.exit(1);
        }
    } else {
        // Auto-run if no git note exists or if session files are newer than cached results.
        bundle = loadFreshOrCachedBundle();
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

    // ── Compute per-column yellow thresholds ─────────────────────────
    function sessionPct(r, channel) {
        const m   = r.metrics || {};
        const fds = r.firstDivergences || {};
        const total = m.screens?.total || 0;
        if (!total) return null;
        if (channel === 'rng') {
            const full = (m.rngCalls?.total > 0) && (m.rngCalls.matched === m.rngCalls.total);
            if (full) return 1.0;
            const step = fds.rng?.step ?? null;
            return (step != null) ? step / total : null;
        }
        if (channel === 'ev') {
            const full = (m.events?.total > 0) && (m.events.matched === m.events.total);
            if (full) return 1.0;
            const hasData = m.events?.total > 0;
            if (!hasData) return null;
            const step = fds.event?.step ?? null;
            return (step != null) ? step / total : null;
        }
        if (channel === 'sc') {
            const full = (m.screens?.total > 0) && (m.screens.matched === m.screens.total);
            if (full) return 1.0;
            const step = fds.screen?.step ?? null;
            return (step != null) ? step / total : null;
        }
        return null;
    }
    const rngThres = columnYellowThreshold(gameplay.map(r => sessionPct(r, 'rng')));
    const evThres  = columnYellowThreshold(gameplay.map(r => sessionPct(r, 'ev')));
    const scThres  = columnYellowThreshold(gameplay.map(r => sessionPct(r, 'sc')));

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
            const timeout = timeoutSummary(r);
            const noPesData = (rngTotal === 0 && evTotal === 0 && scTotal === 0);
            const passIndicator = r.passed ? cGreen('✓') : cRed('✗');
            const namePad = padEndVis(name, NAME_W - 2);  // -2 for indicator + space

            if (timeout && noPesData) {
                const metricsW = LINE_W - NAME_W - 2;
                const merged = '  ' + timeoutDetailText(timeout, metricsW - 2);
                const payload = cRed(padEndVis(merged, metricsW));
                const safeTopline = timeout.topline
                    ? String(timeout.topline).replace(/\s+/g, ' ').trim()
                    : '';
                const toplineNote = timeout.topline
                    ? cDim(trimMiddleWords(safeTopline, 96))
                    : '';
                console.log(passIndicator + ' ' + namePad + '  ' + payload + toplineNote);
                if (!r.passed) failingResults.push(r);
                continue;
            }

            const rngCell = fmtCell(rngStep, rngTotal, rngFull, rngThres);
            const evCell  = fmtCell(evStep,  evTotal,  evFull,  evThres);
            const scCell  = fmtCell(scStep,  scTotal,  scFull,  scThres);

            // Short inline note for failing sessions (from cache if valid)
            const note = (!r.passed)
                ? cDim('  ' + shortNote(r, cache))
                : '';

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
            + `${ANSI_YELLOW}YELLOW=best-per-col (≥90% or closest >50%)${ANSI_RESET}${ANSI_DIM}   `
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
