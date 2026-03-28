#!/usr/bin/env node
/**
 * rng_step_diff.js — Per-step RNG divergence drill-down.
 *
 * Purpose: After session_test_runner identifies the first divergence step,
 * this tool shows the detailed RNG comparison for that step, including
 * raw entries with source locations, call stacks, and event context.
 *
 * Uses the SAME comparison logic as session_test_runner (via comparators.js)
 * to ensure consistent results.
 *
 * Usage:
 *   node test/comparison/rng_step_diff.js <session.json> --step <N> [--window <N>]
 *   node test/comparison/rng_step_diff.js <session.json> --phase startup [--window <N>]
 *   node test/comparison/rng_step_diff.js <session.json> --display-rng [--from <N>] [--to <N>]
 *
 * Modes:
 *   (default)       Compare core RNG at a single step
 *   --display-rng   Compare display RNG (~drn2) entries per step over a range.
 *                   Requires session recorded with NETHACK_RNGLOG_DISP=1 and
 *                   JS replay with RNG_LOG_DISP=1. Shows per-step caller counts
 *                   and individual entries for mismatched steps.
 *
 * Environment:
 *   RNG_LOG_DISP=1  Enable JS display RNG logging (required for --display-rng)
 *   RNG_LOG_TAGS=1  Include caller tags in RNG entries (auto-set)
 */
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

import { replayGameplaySession } from './session_helpers.js';
import { DEFAULT_FLAGS, parseNethackrcFull } from '../../js/storage.js';
import { normalizeSession } from './session_loader.js';
import { compareRng } from './comparators.js';

function parseArg(name, fallback) {
    const idx = process.argv.indexOf(name);
    if (idx < 0 || idx + 1 >= process.argv.length) return fallback;
    const n = Number.parseInt(process.argv[idx + 1], 10);
    return Number.isInteger(n) ? n : fallback;
}

function parseStringArg(name, fallback) {
    const idx = process.argv.indexOf(name);
    if (idx < 0 || idx + 1 >= process.argv.length) return fallback;
    return process.argv[idx + 1];
}

function isDisplayRngEntry(entry) {
    return typeof entry === 'string' && entry.startsWith('~drn2');
}

function isCosmicEntry(entry) {
    return typeof entry === 'string' && (
        entry.startsWith('~drn2_disp[') ||
        entry.startsWith('^disp_owner_') ||
        entry.startsWith('^disp_newsym[') ||
        entry.startsWith('^disp_maploc[')
    );
}

function isEventEntry(entry) {
    return typeof entry === 'string' && entry.startsWith('^');
}

/**
 * Extract display RNG entries from a step's rng array.
 * Only counts actual ~drn2 calls (not cosmic ^disp_ events).
 * Returns { count, entries: string[], callerCounts: Map<string, number>, cosmicCount }
 */
function extractDisplayRng(rng) {
    const entries = [];
    const callerCounts = new Map();
    let cosmicCount = 0;
    for (const r of rng || []) {
        if (isCosmicEntry(r) && !isDisplayRngEntry(r)) {
            cosmicCount++;
            continue;
        }
        if (!isDisplayRngEntry(r)) continue;
        entries.push(r);
        // Extract caller from ~drn2(N)=R @ caller(file:line) or ~drn2_disp[...owner=X...] format
        const cosmicOwner = r.match(/owner=([^ \]]+)/);
        const atMatch = r.match(/@ ([^\n]+)/);
        const caller = cosmicOwner ? cosmicOwner[1] : (atMatch ? atMatch[1].trim() : '(no-tag)');
        callerCounts.set(caller, (callerCounts.get(caller) || 0) + 1);
    }
    return { count: entries.length, entries, callerCounts, cosmicCount };
}

/**
 * Extract event entries (^-prefixed) matching a pattern.
 */
function extractEvents(rng, prefix) {
    return (rng || []).filter(r => typeof r === 'string' && r.startsWith(prefix));
}

async function runDisplayRngMode(abs, session, replay) {
    const from = parseArg('--from', 1);
    const to = parseArg('--to', 0);
    const filterMismatch = process.argv.includes('--mismatch-only');
    const showEntries = process.argv.includes('--entries');

    const cSteps = session.meta.type === 'interface'
        ? (Array.isArray(session.raw?.steps) ? session.raw.steps.slice(1) : [])
        : session.steps;
    const jsSteps = replay.steps || [];

    const maxStep = to > 0 ? to : Math.max(cSteps.length, jsSteps.length);
    const startStep = Math.max(1, from);

    console.log(`session=${basename(abs)}`);
    console.log(`Display RNG comparison: steps ${startStep}–${maxStep}`);
    if (!process.env.RNG_LOG_DISP) {
        console.log('WARNING: RNG_LOG_DISP not set — JS display RNG entries will be empty');
    }
    console.log('');

    // Check if C session has display RNG entries at all
    let cTotalDprng = 0;
    for (const st of cSteps) {
        for (const r of st?.rng || []) {
            if (isDisplayRngEntry(r)) { cTotalDprng++; break; }
        }
        if (cTotalDprng > 0) break;
    }
    if (cTotalDprng === 0) {
        console.log('WARNING: C session has no ~drn2 entries.');
        console.log('Re-record with NETHACK_RNGLOG_DISP=1 to capture display RNG.');
        console.log('');
    }

    let totalMatched = 0;
    let totalMismatched = 0;
    let totalConly = 0;
    let totalJSonly = 0;

    console.log('Step | Key   | C dprng | JS dprng | Match | C callers');
    console.log('-----|-------|---------|----------|-------|----------');

    for (let i = startStep; i <= maxStep; i++) {
        const cStep = cSteps[i - 1];
        const jsStep = jsSteps[i - 1];
        if (!cStep && !jsStep) continue;

        const cDrng = extractDisplayRng(cStep?.rng);
        const jsDrng = extractDisplayRng(jsStep?.rng);

        if (cDrng.count === 0 && jsDrng.count === 0) {
            if (!filterMismatch) {
                // Skip steps with no display RNG on either side (quiet)
            }
            continue;
        }

        const match = cDrng.count === jsDrng.count;
        if (match) totalMatched++;
        else totalMismatched++;
        if (cDrng.count > 0 && jsDrng.count === 0) totalConly++;
        if (jsDrng.count > 0 && cDrng.count === 0) totalJSonly++;

        if (filterMismatch && match) continue;

        const key = cStep?.key || jsStep?.key || '';
        const keyRepr = JSON.stringify(key).replace(/"/g, '').padEnd(5);
        const matchStr = match ? '  ok  ' : ' DIFF ';

        // Summarize C callers
        const callerSummary = [];
        for (const [caller, count] of cDrng.callerCounts) {
            callerSummary.push(count > 1 ? `${caller} x${count}` : caller);
        }

        console.log(
            `${String(i).padStart(4)} | ${keyRepr} | ${String(cDrng.count).padStart(7)} | ${String(jsDrng.count).padStart(8)} | ${matchStr} | ${callerSummary.join(', ')}`
        );

        // Show individual entries when mismatched and --entries flag is set
        if (!match && showEntries) {
            console.log('     C entries:');
            for (const e of cDrng.entries) console.log(`       ${e}`);
            console.log('     JS entries:');
            for (const e of jsDrng.entries) console.log(`       ${e}`);
        }

        // Show mlc phase context if available
        const cMlc = extractEvents(cStep?.rng, '^mlc[');
        const jsMlc = extractEvents(jsStep?.rng, '^mlc[');
        if (!match && (cMlc.length > 0 || jsMlc.length > 0)) {
            const cPhases = cMlc.map(m => { const mm = m.match(/phase=([^ \]]+)/); return mm?.[1] || '?'; });
            const jsPhases = jsMlc.map(m => { const mm = m.match(/phase=([^ \]]+)/); return mm?.[1] || '?'; });
            if (cPhases.length || jsPhases.length) {
                console.log(`     phases: C=[${cPhases.join(',')}] JS=[${jsPhases.join(',')}]`);
            }
        }
    }

    console.log('');
    console.log(`Summary: ${totalMatched} matched, ${totalMismatched} mismatched`);
    if (totalConly) console.log(`  C-only steps (C has dprng, JS has 0): ${totalConly}`);
    if (totalJSonly) console.log(`  JS-only steps (JS has dprng, C has 0): ${totalJSonly}`);
}

async function main() {
    const input = process.argv[2];
    if (!input) {
        console.error('Usage: node rng_step_diff.js <session.json> --step <N> [--window <N>]');
        console.error('       node rng_step_diff.js <session.json> --display-rng [--from <N>] [--to <N>] [--mismatch-only] [--entries]');
        process.exit(2);
    }
    const abs = resolve(input);

    const rawJson = JSON.parse(readFileSync(abs, 'utf8'));
    const session = normalizeSession(rawJson, { file: basename(abs), dir: resolve(abs, '..') });

    process.env.RNG_LOG_TAGS = '1';
    const replayFlags = { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true };
    const rcDiff = session.raw?.nethackrc ? parseNethackrcFull(session.raw.nethackrc) : null;
    if (rcDiff?.flags?.pickup === false) replayFlags.pickup = false;
    const replay = await replayGameplaySession(session.meta.seed, session.raw, {
        captureScreens: true,
        startupBurstInFirstStep: false,
        flags: replayFlags,
        replayMode: session.meta.type === 'interface' ? 'interface' : undefined,
    });

    // Display RNG mode
    if (process.argv.includes('--display-rng')) {
        return await runDisplayRngMode(abs, session, replay);
    }

    // Standard single-step RNG comparison mode
    const step = parseArg('--step', 1);
    const window = parseArg('--window', 6);
    const isStartup = process.argv.includes('--phase') && process.argv[process.argv.indexOf('--phase') + 1] === 'startup';

    let jsRng, cRng;
    if (isStartup) {
        jsRng = Array.isArray(replay.startup?.rng) ? replay.startup.rng : [];
        cRng = Array.isArray(session.raw?.startup?.rng) ? session.raw.startup.rng : [];
    } else {
        const cSteps = session.meta.type === 'interface'
            ? (Array.isArray(session.raw?.steps) ? session.raw.steps.slice(1) : [])
            : session.steps;
        jsRng = Array.isArray(replay.steps?.[step - 1]?.rng) ? replay.steps[step - 1].rng : [];
        cRng = Array.isArray(cSteps[step - 1]?.rng) ? cSteps[step - 1].rng : [];
    }

    console.log(`session=${basename(abs)} ${isStartup ? 'phase=startup' : 'step=' + step}`);
    console.log(`JS raw entries: ${jsRng.length}  C raw entries: ${cRng.length}`);

    // Use the SAME compareRng as session_test_runner
    const cmp = compareRng(jsRng, cRng);

    if (!cmp.firstDivergence) {
        console.log(`RNG matched: ${cmp.matched}/${cmp.total}`);
        return;
    }

    const div = cmp.firstDivergence;
    console.log(`\nFirst divergence at normalized index ${div.index}:`);
    console.log(`  JS: ${div.js || '(end)'}  ${div.jsRaw ? '  raw: ' + div.jsRaw : ''}`);
    console.log(`  C:  ${div.session || '(end)'}  ${div.sessionRaw ? '  raw: ' + div.sessionRaw : ''}`);
    if (div.jsStack?.length) console.log(`  JS stack: ${div.jsStack.join(' | ')}`);
    if (div.sessionStack?.length) console.log(`  C  stack: ${div.sessionStack.join(' | ')}`);
    console.log(`  Matched before divergence: ${cmp.matched}/${cmp.total}`);

    // Show raw RNG window around divergence for both sides
    console.log(`\n--- JS raw entries around divergence ---`);
    printRawWindow(jsRng, div.jsRawIndex, window, 'JS');
    console.log(`\n--- C raw entries around divergence ---`);
    printRawWindow(cRng, div.sessionRawIndex, window, 'C');
}

function printRawWindow(entries, centerIdx, windowSize, label) {
    if (!entries?.length) { console.log(`  (empty)`); return; }
    const center = Number.isInteger(centerIdx) ? centerIdx : 0;
    const lo = Math.max(0, center - windowSize);
    const hi = Math.min(entries.length - 1, center + windowSize);
    for (let i = lo; i <= hi; i++) {
        const mark = (i === center) ? '>>' : '  ';
        const entry = entries[i];
        const display = typeof entry === 'number' ? String(entry) : entry;
        console.log(`${mark} [${i}] ${display}`);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
