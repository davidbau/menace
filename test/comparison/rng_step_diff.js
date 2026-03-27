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

async function main() {
    const input = process.argv[2];
    if (!input) {
        console.error('Usage: node rng_step_diff.js <session.json> --step <N> [--window <N>]');
        process.exit(2);
    }
    const step = parseArg('--step', 1);
    const window = parseArg('--window', 6);
    const isStartup = process.argv.includes('--phase') && process.argv[process.argv.indexOf('--phase') + 1] === 'startup';
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
