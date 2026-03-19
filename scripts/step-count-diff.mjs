#!/usr/bin/env node
// step-count-diff: Find step boundary shifts between JS and C sessions.
//
// Compares per-step filtered RNG entry counts between a JS replay and
// a C-recorded session. Flags steps where counts differ (step boundary
// shifts) and identifies the first value divergence.
//
// Steps are 1-indexed to match the test comparator and movement-propagation.
//
// Usage:
//   node scripts/step-count-diff.mjs <session-path> [--from N] [--to M] [--context K] [--find-entry REGEX]
//
// Examples:
//   node scripts/step-count-diff.mjs test/comparison/sessions/seed033_manual_direct.session.json
//   node scripts/step-count-diff.mjs test/comparison/sessions/seed033_manual_direct.session.json --from 205 --find-entry 'rnd\(2\)'

import { replaySession } from '../js/replay_core.js';
import { prepareReplayArgs, getSessionGameplaySteps } from '../js/replay_compare.js';
import { isComparable, normalize, toArrayIndex, toReplayIndex,
         summarizeEntries, describeKey, STEP_INDEX_HELP } from './triage-lib.mjs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function main() {
    const args = process.argv.slice(2);
    const sessionPath = args.find(a => !a.startsWith('--'));
    if (!sessionPath) {
        console.error('Usage: node scripts/step-count-diff.mjs <session-path> [options]');
        console.error('');
        console.error('Options:');
        console.error('  --from N          Start at step N (1-indexed, default: 1)');
        console.error('  --to M            End at step M');
        console.error('  --context K       Show K steps of context around mismatches (default: 3)');
        console.error('  --values          Also scan for first per-entry value mismatch (slower)');
        console.error('  --find-entry RE   Search for a specific RNG pattern across steps');
        console.error('');
        console.error(STEP_INDEX_HELP);
        process.exit(1);
    }

    const fromArg = args.indexOf('--from');
    const toArg = args.indexOf('--to');
    const ctxArg = args.indexOf('--context');
    const findEntryArg = args.indexOf('--find-entry');
    const valuesFlag = args.includes('--values');
    const fromStep = fromArg >= 0 ? Number(args[fromArg + 1]) : 1;    // 1-indexed
    const toStep = toArg >= 0 ? Number(args[toArg + 1]) : Infinity;
    const contextWindow = ctxArg >= 0 ? Number(args[ctxArg + 1]) : 3;
    const findEntryPattern = findEntryArg >= 0 ? new RegExp(args[findEntryArg + 1]) : null;

    const session = require(sessionPath.startsWith('/') ? sessionPath : `${process.cwd()}/${sessionPath}`);
    const replayArgs = prepareReplayArgs(session.seed, session, { captureScreens: false });
    const gameplaySteps = getSessionGameplaySteps(session);

    console.log(`Replaying ${sessionPath.split('/').pop()}...`);
    const result = await replaySession(replayArgs.seed, {
        ...replayArgs.opts,
        captureScreens: false,
    }, replayArgs.keys);

    const maxStep = Math.min(toStep, gameplaySteps.length, result.steps.length - 1); // 1-indexed max
    let firstCountMismatch = -1;
    let firstValueMismatch = -1;
    let countMismatches = [];

    // Pass 1: Find count mismatches and first value divergence (1-indexed)
    for (let step = fromStep; step <= maxStep; step++) {
        const ai = toArrayIndex(step);
        const ri = toReplayIndex(step);
        const jsRng = (result.steps[ri]?.rng || []);
        const cRng = (gameplaySteps[ai]?.rng || []);
        const jsF = jsRng.filter(isComparable);
        const cF = cRng.filter(isComparable);

        if (jsF.length !== cF.length) {
            if (firstCountMismatch < 0) firstCountMismatch = step;
            countMismatches.push({
                step,
                key: gameplaySteps[ai]?.key,
                jsCount: jsF.length,
                cCount: cF.length,
                jsFirst: jsRng.slice(0, 3),
                cFirst: cRng.slice(0, 3),
            });
        }

        // --values: scan for per-entry value mismatches even when counts match
        if (firstValueMismatch < 0 && (valuesFlag || jsF.length !== cF.length)) {
            const minLen = Math.min(jsF.length, cF.length);
            for (let j = 0; j < minLen; j++) {
                if (normalize(jsF[j]) !== normalize(cF[j])) {
                    firstValueMismatch = step;
                    break;
                }
            }
            if (jsF.length !== cF.length && firstValueMismatch < 0) {
                firstValueMismatch = step;
            }
        }
    }

    // Output
    if (firstCountMismatch < 0 && firstValueMismatch < 0) {
        console.log(`Steps ${fromStep}-${maxStep}: all counts and values match`);
        return;
    }

    if (firstCountMismatch >= 0) {
        console.log(`Steps ${fromStep}-${firstCountMismatch - 1}: counts match`);
        console.log(`\nFirst COUNT mismatch at step ${firstCountMismatch}:`);

        const contextStart = Math.max(fromStep, firstCountMismatch - 1);
        const contextEnd = Math.min(maxStep, firstCountMismatch + contextWindow * 2);

        for (let step = contextStart; step <= contextEnd; step++) {
            const ai = toArrayIndex(step);
            const ri = toReplayIndex(step);
            const jsRng = (result.steps[ri]?.rng || []);
            const cRng = (gameplaySteps[ai]?.rng || []);
            const jsF = jsRng.filter(isComparable);
            const cF = cRng.filter(isComparable);
            const key = gameplaySteps[ai]?.key;
            const marker = jsF.length !== cF.length ? '>>>' : '   ';
            const label = jsF.length !== cF.length
                ? (jsF.length > cF.length ? 'JS-EXTRA' : 'C-EXTRA')
                : '';
            console.log(`${marker} Step ${step} key=${JSON.stringify(key).padEnd(5)} (${describeKey(key).padEnd(12)}) JS=${String(jsF.length).padStart(3)} C=${String(cF.length).padStart(3)} ${label}`);

            if (jsF.length !== cF.length) {
                if (cF.length > jsF.length) {
                    const extra = cRng.filter(isComparable);
                    console.log(`      C: ${summarizeEntries(extra)}`);
                } else {
                    const extra = jsRng.filter(isComparable);
                    console.log(`      JS: ${summarizeEntries(extra)}`);
                }
            }
        }

        // Check for shift pattern
        if (countMismatches.length >= 2) {
            const first = countMismatches[0];
            for (let k = 1; k < Math.min(countMismatches.length, 5); k++) {
                const other = countMismatches[k];
                if ((first.cCount > first.jsCount && other.jsCount > other.cCount)
                    || (first.jsCount > first.cCount && other.cCount > other.jsCount)) {
                    console.log(`\n  → STEP BOUNDARY SHIFT: entries at step ${first.step} in one side appear at step ${other.step} in the other`);
                    break;
                }
            }
        }
    }

    if (firstValueMismatch >= 0 && firstValueMismatch !== firstCountMismatch) {
        const ai = toArrayIndex(firstValueMismatch);
        const ri = toReplayIndex(firstValueMismatch);
        const jsRng = (result.steps[ri]?.rng || []).filter(isComparable);
        const cRng = (gameplaySteps[ai]?.rng || []).filter(isComparable);
        console.log(`\nFirst VALUE divergence at step ${firstValueMismatch} key=${JSON.stringify(gameplaySteps[ai]?.key)}:`);
        const minLen = Math.min(jsRng.length, cRng.length);
        for (let j = 0; j < minLen; j++) {
            if (normalize(jsRng[j]) !== normalize(cRng[j])) {
                console.log(`  entry ${j}:`);
                console.log(`    JS: ${jsRng[j]}`);
                console.log(`    C:  ${cRng[j]}`);
                break;
            }
        }
    }

    console.log(`\nTotal count mismatches: ${countMismatches.length} steps`);

    // --find-entry: search for a specific RNG pattern across steps
    if (findEntryPattern) {
        console.log(`\n--- Searching for /${findEntryPattern.source}/ ---`);
        const searchFrom = Math.max(1, (firstCountMismatch >= 0 ? firstCountMismatch - 2 : fromStep));
        const searchTo = Math.min(maxStep, searchFrom + 20);
        for (let step = searchFrom; step <= searchTo; step++) {
            const ai = toArrayIndex(step);
            const ri = toReplayIndex(step);
            const jsRng = (result.steps[ri]?.rng || []);
            const cRng = (gameplaySteps[ai]?.rng || []);
            const jsMatches = jsRng.filter(e => typeof e === 'string' && findEntryPattern.test(e));
            const cMatches = cRng.filter(e => typeof e === 'string' && findEntryPattern.test(e));
            if (jsMatches.length > 0 || cMatches.length > 0) {
                const key = gameplaySteps[ai]?.key;
                console.log(`  Step ${step} key=${JSON.stringify(key)}:`);
                for (const e of cMatches) console.log(`    C:  ${e}`);
                for (const e of jsMatches) console.log(`    JS: ${e}`);
            }
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });
