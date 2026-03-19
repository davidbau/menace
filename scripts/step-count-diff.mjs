#!/usr/bin/env node
// step-count-diff: Find step boundary shifts between JS and C sessions.
//
// Compares per-step filtered RNG entry counts between a JS replay and
// a C-recorded session. Flags steps where counts differ (step boundary
// shifts) and identifies the first value divergence.
//
// Usage:
//   node scripts/step-count-diff.mjs <session-path> [--from N] [--to M] [--context K]
//
// Examples:
//   node scripts/step-count-diff.mjs test/comparison/sessions/seed033_manual_direct.session.json
//   node scripts/step-count-diff.mjs test/comparison/sessions/seed033_manual_direct.session.json --from 190 --to 210

import { replaySession } from '../js/replay_core.js';
import { prepareReplayArgs, getSessionGameplaySteps } from '../js/replay_compare.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function isComparable(e) {
    if (typeof e !== 'string') return false;
    if (e[0] === '^' || e[0] === '>' || e[0] === '<' || e[0] === '~') return false;
    if (e.startsWith('d(') || e.startsWith('rne(') || e.startsWith('rnz(') || e.startsWith('rnl(')) return false;
    return true;
}

function normalize(e) {
    return e.replace(/ @.*$/, '');
}

async function main() {
    const args = process.argv.slice(2);
    const sessionPath = args.find(a => !a.startsWith('--'));
    if (!sessionPath) {
        console.error('Usage: node scripts/step-count-diff.mjs <session-path> [--from N] [--to M] [--context K] [--find-entry REGEX]');
        process.exit(1);
    }

    const fromArg = args.find(a => a.startsWith('--from'));
    const toArg = args.find(a => a.startsWith('--to'));
    const ctxArg = args.find(a => a.startsWith('--context'));
    const findEntryArg = args.indexOf('--find-entry');
    const fromStep = fromArg ? Number(args[args.indexOf(fromArg) + 1]) : 0;
    const toStep = toArg ? Number(args[args.indexOf(toArg) + 1]) : Infinity;
    const contextWindow = ctxArg ? Number(args[args.indexOf(ctxArg) + 1]) : 3;
    const findEntryPattern = findEntryArg >= 0 ? new RegExp(args[findEntryArg + 1]) : null;

    const session = require(sessionPath.startsWith('/') ? sessionPath : `${process.cwd()}/${sessionPath}`);
    const replayArgs = prepareReplayArgs(session.seed, session, { captureScreens: false });
    const gameplaySteps = getSessionGameplaySteps(session);

    console.log(`Replaying ${sessionPath.split('/').pop()}...`);
    const result = await replaySession(replayArgs.seed, {
        ...replayArgs.opts,
        captureScreens: false,
    }, replayArgs.keys);

    const maxStep = Math.min(toStep, gameplaySteps.length - 1, result.steps.length - 2);
    let totalJsFiltered = 0;
    let totalCFiltered = 0;
    let firstCountMismatch = -1;
    let firstValueMismatch = -1;
    let countMismatches = [];

    // Pass 1: Find count mismatches and first value divergence
    for (let i = fromStep; i <= maxStep; i++) {
        const jsRng = (result.steps[i + 1]?.rng || []);
        const cRng = (gameplaySteps[i]?.rng || []);
        const jsF = jsRng.filter(isComparable);
        const cF = cRng.filter(isComparable);
        totalJsFiltered += jsF.length;
        totalCFiltered += cF.length;

        if (jsF.length !== cF.length) {
            if (firstCountMismatch < 0) firstCountMismatch = i;
            countMismatches.push({
                step: i,
                key: gameplaySteps[i]?.key,
                jsCount: jsF.length,
                cCount: cF.length,
                jsFirst: jsRng.slice(0, 3),
                cFirst: cRng.slice(0, 3),
            });
        }

        if (firstValueMismatch < 0) {
            const minLen = Math.min(jsF.length, cF.length);
            for (let j = 0; j < minLen; j++) {
                if (normalize(jsF[j]) !== normalize(cF[j])) {
                    firstValueMismatch = i;
                    break;
                }
            }
            if (jsF.length !== cF.length && firstValueMismatch < 0) {
                firstValueMismatch = i;
            }
        }
    }

    // Output
    if (firstCountMismatch < 0 && firstValueMismatch < 0) {
        console.log(`Steps ${fromStep}-${maxStep}: all counts and values match (${totalJsFiltered} filtered entries)`);
        return;
    }

    if (firstCountMismatch >= 0) {
        console.log(`Steps ${fromStep}-${firstCountMismatch - 1}: counts match`);
        console.log(`\nFirst COUNT mismatch at step ${firstCountMismatch}:`);

        // Show context around the first mismatch
        const contextStart = Math.max(fromStep, firstCountMismatch - 1);
        const contextEnd = Math.min(maxStep, firstCountMismatch + contextWindow * 2);

        for (let i = contextStart; i <= contextEnd; i++) {
            const jsRng = (result.steps[i + 1]?.rng || []);
            const cRng = (gameplaySteps[i]?.rng || []);
            const jsF = jsRng.filter(isComparable);
            const cF = cRng.filter(isComparable);
            const key = gameplaySteps[i]?.key;
            const marker = jsF.length !== cF.length ? '>>>' : '   ';
            const label = jsF.length !== cF.length
                ? (jsF.length > cF.length ? 'JS-EXTRA' : 'C-EXTRA')
                : '';
            console.log(`${marker} Step ${i} key=${JSON.stringify(key).padEnd(5)} JS=${String(jsF.length).padStart(3)} C=${String(cF.length).padStart(3)} ${label}`);

            if (jsF.length !== cF.length) {
                if (cF.length > jsF.length) {
                    const extra = cF.slice(jsF.length);
                    for (const e of extra.slice(0, 3)) {
                        console.log(`      C: ${e}`);
                    }
                } else {
                    const extra = jsF.slice(cF.length);
                    for (const e of extra.slice(0, 3)) {
                        console.log(`      JS: ${e}`);
                    }
                }
            }
        }

        // Check for shift pattern: if step N has C-extra and step N+K has JS-extra
        // with matching values, it's a confirmed step boundary shift
        if (countMismatches.length >= 2) {
            const first = countMismatches[0];
            for (let k = 1; k < Math.min(countMismatches.length, 5); k++) {
                const other = countMismatches[k];
                if ((first.cCount > first.jsCount && other.jsCount > other.cCount)
                    || (first.jsCount > first.cCount && other.cCount > other.jsCount)) {
                    // Check if values match
                    const firstEntries = first.cCount > first.jsCount ? first.cFirst : first.jsFirst;
                    const otherEntries = other.jsCount > other.cCount ? other.jsFirst : other.cFirst;
                    const entriesMatch = firstEntries.length > 0 && otherEntries.length > 0
                        && firstEntries.some((e, idx) => otherEntries[idx] && e.includes(otherEntries[idx].split(' @')[0]?.trim()));
                    if (entriesMatch) {
                        console.log(`\n  → STEP BOUNDARY SHIFT confirmed: step ${first.step} entries appear at step ${other.step} in the other side`);
                    }
                }
            }
        }
    }

    if (firstValueMismatch >= 0 && firstValueMismatch !== firstCountMismatch) {
        const jsRng = (result.steps[firstValueMismatch + 1]?.rng || []).filter(isComparable);
        const cRng = (gameplaySteps[firstValueMismatch]?.rng || []).filter(isComparable);
        console.log(`\nFirst VALUE divergence at step ${firstValueMismatch} key=${JSON.stringify(gameplaySteps[firstValueMismatch]?.key)}:`);
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

    // --find-entry: search for a specific RNG pattern across steps in both JS and C
    if (findEntryPattern) {
        console.log(`\n--- Searching for /${findEntryPattern.source}/ ---`);
        const searchFrom = Math.max(0, (firstCountMismatch >= 0 ? firstCountMismatch - 2 : fromStep));
        const searchTo = Math.min(maxStep, searchFrom + 20);
        for (let i = searchFrom; i <= searchTo; i++) {
            const jsRng = (result.steps[i + 1]?.rng || []);
            const cRng = (gameplaySteps[i]?.rng || []);
            const jsMatches = jsRng.filter(e => typeof e === 'string' && findEntryPattern.test(e));
            const cMatches = cRng.filter(e => typeof e === 'string' && findEntryPattern.test(e));
            if (jsMatches.length > 0 || cMatches.length > 0) {
                const key = gameplaySteps[i]?.key;
                console.log(`  Step ${i} key=${JSON.stringify(key)}:`);
                for (const e of cMatches) console.log(`    C:  ${e}`);
                for (const e of jsMatches) console.log(`    JS: ${e}`);
            }
        }
    }
}

main().catch(e => { console.error(e); process.exit(1); });
