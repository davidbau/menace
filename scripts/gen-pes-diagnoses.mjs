#!/usr/bin/env node
/**
 * scripts/gen-pes-diagnoses.mjs
 *
 * Uses `claude -p` to generate AI diagnoses for failing gameplay sessions
 * and writes them to oracle/pes-diagnoses.json (the cache read by pes-report.mjs).
 *
 * All stale/missing sessions are sent in a single batch prompt, so the whole
 * run costs one claude invocation regardless of how many sessions need analysis.
 *
 * Each cache entry is keyed by session name (minus _gameplay.session.json) and
 * carries an MD5 hash of the firstDivergence data. Entries are skipped when the
 * hash is still valid (divergence hasn't changed). Use --force to regenerate all.
 *
 * Usage (must be run OUTSIDE a Claude Code session):
 *   node scripts/gen-pes-diagnoses.mjs              # analyze new/stale failures
 *   node scripts/gen-pes-diagnoses.mjs results.json # use specific results file
 *   node scripts/gen-pes-diagnoses.mjs --force      # regenerate all entries
 *   node scripts/gen-pes-diagnoses.mjs --model=haiku # use haiku (faster/cheaper)
 *
 * If run inside a Claude Code session, unset CLAUDECODE first:
 *   CLAUDECODE= node scripts/gen-pes-diagnoses.mjs
 */

import { execSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const REPO_ROOT  = resolve(__dirname, '..');
const CACHE_FILE = join(REPO_ROOT, 'oracle', 'pes-diagnoses.json');

// ──────────────────────────────────────────────────────────────────────
// CLI args
// ──────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const force    = args.includes('--force');
const fileArg  = args.find(a => !a.startsWith('--'));
const modelArg = args.find(a => a.startsWith('--model='));
const model    = modelArg ? modelArg.slice('--model='.length) : 'sonnet';

// ──────────────────────────────────────────────────────────────────────
// Load results bundle
// ──────────────────────────────────────────────────────────────────────

let bundle;
if (fileArg) {
    bundle = JSON.parse(readFileSync(resolve(process.cwd(), fileArg), 'utf8'));
} else {
    try {
        const raw = execSync('git notes --ref=test-results show HEAD 2>/dev/null', { encoding: 'utf8' });
        bundle = JSON.parse(raw);
    } catch {
        console.error('Error: No results file given and no git note found on HEAD.');
        process.exit(1);
    }
}

// ──────────────────────────────────────────────────────────────────────
// Cache helpers (shared logic with pes-report.mjs)
// ──────────────────────────────────────────────────────────────────────

function diagKey(file) {
    return file.replace(/\.session\.json$/, '').replace(/_gameplay$/, '');
}

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

function saveCache(cache) {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

// ──────────────────────────────────────────────────────────────────────
// Build a single batch prompt covering all sessions to analyze
// ──────────────────────────────────────────────────────────────────────

function buildBatchPrompt(results) {
    const lines = [
        'You are analyzing PRNG divergences in a JavaScript port of NetHack 3.7.',
        'The JS port must produce byte-identical RNG call sequences to the C original.',
        'A "step" is one player keypress processed through the game loop (~1 game turn).',
        '',
        'Analyze ALL of the following failing sessions.',
        'Respond with ONLY valid JSON — no markdown, no explanation outside JSON.',
        'Return a single object mapping each session key to its diagnosis:',
        '',
        '{',
        '  "<session-key>": {',
        '    "cat": "category label (5–8 words, slash-separated theme/cause, e.g. \'pet-move / post-combat ordering\')",',
        '    "tldr": "2–4 sentence paragraph: what JS is doing, what C is doing, why the RNG sequences diverge"',
        '  },',
        '  ...',
        '}',
        '',
        '━━━ Sessions to analyze ━━━',
        '',
    ];

    for (const result of results) {
        const key   = diagKey(result.session);
        const total = result.metrics?.screens?.total || '?';
        const fd    = result.firstDivergence || {};
        const fds   = result.firstDivergences || {};
        const step  = fd.step ?? '?';

        const stack = Array.isArray(fd.sessionStack) && fd.sessionStack.length > 0
            ? fd.sessionStack.map(s => '  ' + s).join('\n')
            : '  (no stack captured)';

        const evDiv = fds.event
            ? `Event channel diverges at step ${fds.event.step ?? '?'}:\n  JS:  ${fds.event.js || ''}\n  C:   ${fds.event.session || ''}`
            : '(no event divergence data)';

        lines.push(`--- ${key} ---`);
        lines.push(`Total steps: ${total}`);
        lines.push(`First RNG divergence at step: ${step}/${total}`);
        lines.push(`At divergence:`);
        lines.push(`  JS calls:  ${fd.jsRaw || fd.js || '(unknown)'}`);
        lines.push(`  C calls:   ${fd.sessionRaw || fd.session || '(unknown)'}`);
        lines.push(`C call stack context:`);
        lines.push(stack);
        lines.push(evDiv);
        lines.push('');
    }

    return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────
// Call claude -p with the batch prompt
// ──────────────────────────────────────────────────────────────────────

function callClaudeBatch(results) {
    const prompt = buildBatchPrompt(results);
    const env = { ...process.env };
    delete env.CLAUDECODE;  // allow running from inside a Claude Code session

    const proc = spawnSync(
        'claude',
        ['-p', '--output-format=text', `--model=${model}`, '--no-session-persistence'],
        { input: prompt, encoding: 'utf8', env, cwd: REPO_ROOT }
    );

    if (proc.error) throw proc.error;
    if (proc.status !== 0) {
        throw new Error(`claude exited ${proc.status}: ${(proc.stderr || proc.stdout || '').slice(0, 200)}`);
    }

    const text = (proc.stdout || '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON in response:\n${text.slice(0, 300)}`);
    return JSON.parse(jsonMatch[0]);
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

async function main() {
    const allResults = Array.isArray(bundle.results) ? bundle.results : [];
    const failing    = allResults.filter(r => r.type === 'gameplay' && !r.passed);

    if (failing.length === 0) {
        console.log('No failing gameplay sessions — nothing to diagnose.');
        return;
    }

    const cache = loadCache();

    const toAnalyze = failing.filter(r => {
        if (force) return true;
        const entry = cache[diagKey(r.session)];
        return !entry || entry.hash !== hashDivergence(r);
    });

    if (toAnalyze.length === 0) {
        console.log('All failing sessions have valid cached diagnoses. Use --force to regenerate.');
        return;
    }

    console.log(`Analyzing ${toAnalyze.length} session(s) in one batch with model=${model}…`);

    try {
        const diagnoses = callClaudeBatch(toAnalyze);
        let saved = 0;
        for (const result of toAnalyze) {
            const key  = diagKey(result.session);
            const diag = diagnoses[key];
            if (diag?.cat && diag?.tldr) {
                cache[key] = { hash: hashDivergence(result), cat: diag.cat, tldr: diag.tldr };
                saved++;
                console.log(`  ${key}: ${diag.cat}`);
            } else {
                console.log(`  ${key}: missing in response`);
            }
        }
        saveCache(cache);
        console.log(`\n${saved}/${toAnalyze.length} diagnoses written to ${CACHE_FILE}`);
    } catch (err) {
        console.error(`ERROR: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
