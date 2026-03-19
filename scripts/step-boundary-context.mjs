#!/usr/bin/env node
// step-boundary-context: Show diagnostic context for a step where JS and C
// have different RNG entry counts.
//
// For the specified step, replays the JS session and captures game state
// (player position, pendingPrompt, messageNeedsMore, topMessage, etc.)
// alongside C's raw entries. Helps explain WHY a step boundary shift occurs.
//
// Usage:
//   node scripts/step-boundary-context.mjs <session-path> --step N [--window K]
//
// Steps are 1-indexed to match the test comparator output (step=N in test failures).
//
// Examples:
//   node scripts/step-boundary-context.mjs test/comparison/sessions/seed033_manual_direct.session.json --step 192
//   node scripts/step-boundary-context.mjs test/comparison/sessions/seed033_manual_direct.session.json --step 208

import { replaySession } from '../js/replay_core.js';
import { prepareReplayArgs, getSessionGameplaySteps } from '../js/replay_compare.js';
import { createRequire } from 'module';
import {
    isComparable, normalize, toArrayIndex, toReplayIndex,
    summarizeEntries, describeTurnEnd, describeKey, STEP_INDEX_HELP
} from './triage-lib.mjs';

const require = createRequire(import.meta.url);

async function main() {
    const args = process.argv.slice(2);
    const sessionPath = args.find(a => !a.startsWith('--'));
    const stepIdx = args.indexOf('--step');
    const windowIdx = args.indexOf('--window');
    const targetStep = stepIdx >= 0 ? Number(args[stepIdx + 1]) : null;
    const windowSize = windowIdx >= 0 ? Number(args[windowIdx + 1]) : 3;

    if (!sessionPath || targetStep === null || !Number.isInteger(targetStep) || targetStep < 1) {
        console.error('Usage: node scripts/step-boundary-context.mjs <session-path> --step N [--window K]');
        console.error(`  ${STEP_INDEX_HELP}`);
        process.exit(1);
    }

    const session = require(sessionPath.startsWith('/') ? sessionPath : `${process.cwd()}/${sessionPath}`);
    const replayArgs = prepareReplayArgs(session.seed, session, { captureScreens: true });
    const gameplaySteps = getSessionGameplaySteps(session);

    if (toArrayIndex(targetStep) >= gameplaySteps.length) {
        console.error(`Step ${targetStep} out of range (session has ${gameplaySteps.length} gameplay steps, 1-indexed)`);
        process.exit(1);
    }

    // Capture game state at each step in the window (using 0-indexed for onKey callback)
    const capturedStates = {};
    const fromStep = Math.max(1, targetStep - windowSize);
    const toStep = Math.min(gameplaySteps.length, targetStep + windowSize);

    console.log(`Replaying ${sessionPath.split('/').pop()} (capturing steps ${fromStep}-${toStep})...`);
    const result = await replaySession(replayArgs.seed, {
        ...replayArgs.opts,
        captureScreens: true,
        onKey({ index, game, step }) {
            // index is 0-based from the replay; convert to 1-indexed step
            const step1 = index + 1;
            if (step1 >= fromStep && step1 <= toStep) {
                const p = game.u || game.player;
                const display = game.display;
                const ctx = game.context || game.svc?.context || {};
                const screenLines = step.screen?.split('\n') || [];
                capturedStates[step1] = {
                    pos: p ? `(${p.x},${p.y})` : '?',
                    dlevel: p?.dungeonLevel || (game.lev || game.map)?.uz?.dlevel || '?',
                    pendingPrompt: game.pendingPrompt
                        ? (game.pendingPrompt.type || 'unknown')
                        : null,
                    messageNeedsMore: !!display?.messageNeedsMore,
                    topMessage: display?.topMessage || null,
                    running: !!game.running,
                    multi: game.multi || 0,
                    occupation: !!game.occupation,
                    contextRun: ctx.run || 0,
                    contextMv: ctx.mv || false,
                    msgRow0: screenLines[0]?.replace(/\x1b\[[^m]*m/g, '').trim() || '',
                };
            }
        }
    }, replayArgs.keys);

    // Display results
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Step boundary context for step ${targetStep} (1-indexed)`);
    console.log(`${'='.repeat(70)}\n`);

    for (let step1 = fromStep; step1 <= toStep; step1++) {
        const jsRng = (result.steps[toReplayIndex(step1)]?.rng || []);
        const cRng = (gameplaySteps[toArrayIndex(step1)]?.rng || []);
        const jsF = jsRng.filter(isComparable);
        const cF = cRng.filter(isComparable);
        const key = gameplaySteps[toArrayIndex(step1)]?.key;
        const state = capturedStates[step1];
        const isTarget = step1 === targetStep;
        const countsDiffer = jsF.length !== cF.length;
        const marker = isTarget ? '>>>' : (countsDiffer ? ' ! ' : '   ');

        console.log(`${marker} Step ${step1} key=${JSON.stringify(key)} (${describeKey(key)})`);
        console.log(`    JS: ${jsF.length} filtered (${jsRng.length} raw)  |  C: ${cF.length} filtered (${cRng.length} raw)`);

        // Annotate turn-end pattern
        const turnEndC = describeTurnEnd(cRng);
        const turnEndJS = describeTurnEnd(jsRng);
        if (turnEndC) console.log(`    C pattern: ${turnEndC}`);
        if (turnEndJS && turnEndJS !== turnEndC) console.log(`    JS pattern: ${turnEndJS}`);

        if (state) {
            console.log(`    pos=${state.pos} dlevel=${state.dlevel} running=${state.running}`);
            if (state.pendingPrompt) {
                console.log(`    pendingPrompt: ${state.pendingPrompt}`);
            }
            if (state.messageNeedsMore) {
                console.log(`    messageNeedsMore: true`);
            }
            if (state.topMessage) {
                const msg = state.topMessage.length > 60
                    ? state.topMessage.slice(0, 60) + '...'
                    : state.topMessage;
                console.log(`    topMessage: ${JSON.stringify(msg)}`);
            }
            if (state.msgRow0 && state.msgRow0 !== (state.topMessage || '').slice(0, state.msgRow0.length)) {
                console.log(`    screen row0: ${JSON.stringify(state.msgRow0.slice(0, 60))}`);
            }
            if (state.multi) console.log(`    multi: ${state.multi}`);
            if (state.occupation) console.log(`    occupation: active`);
            if (state.contextRun) console.log(`    context.run: ${state.contextRun}`);
        }

        if (countsDiffer) {
            // Show the "extra" entries with annotations
            if (cF.length > jsF.length) {
                const extra = cRng.filter(isComparable).slice(jsF.length);
                console.log(`    C-EXTRA entries (${cF.length - jsF.length}): ${summarizeEntries(extra)}`);
                for (const e of extra.slice(0, 5)) {
                    console.log(`      ${e}`);
                }
            } else if (jsF.length > cF.length) {
                const extra = jsRng.filter(isComparable).slice(cF.length);
                console.log(`    JS-EXTRA entries (${jsF.length - cF.length}): ${summarizeEntries(extra)}`);
                for (const e of extra.slice(0, 5)) {
                    console.log(`      ${e}`);
                }
            }

            // Check if the extra entries appear in an adjacent step on the other side
            if (cF.length > jsF.length) {
                // C has extra — look for them in JS at adjacent steps
                const cExtra = cRng.filter(isComparable).slice(0, 3);
                for (let adj = step1 + 1; adj <= Math.min(step1 + 4, toStep); adj++) {
                    const adjJsRng = (result.steps[toReplayIndex(adj)]?.rng || []).filter(isComparable);
                    if (adjJsRng.length > 0 && cExtra.length > 0
                        && normalize(adjJsRng[0]) === normalize(cExtra[0])) {
                        console.log(`    → SHIFT: C's entries appear in JS at step ${adj}`);
                        break;
                    }
                }
            } else {
                const jsExtra = jsRng.filter(isComparable).slice(0, 3);
                for (let adj = step1 + 1; adj <= Math.min(step1 + 4, toStep); adj++) {
                    const adjCRng = (gameplaySteps[toArrayIndex(adj)]?.rng || []).filter(isComparable);
                    if (adjCRng.length > 0 && jsExtra.length > 0
                        && normalize(adjCRng[0]) === normalize(jsExtra[0])) {
                        console.log(`    → SHIFT: JS's entries appear in C at step ${adj}`);
                        break;
                    }
                }
            }
        }

        // Check for value divergence within matching counts
        if (jsF.length === cF.length && jsF.length > 0) {
            for (let j = 0; j < jsF.length; j++) {
                if (normalize(jsF[j]) !== normalize(cF[j])) {
                    console.log(`    VALUE DIVERGENCE at entry ${j}:`);
                    console.log(`      JS: ${jsF[j]}`);
                    console.log(`      C:  ${cF[j]}`);
                    break;
                }
            }
        }

        console.log('');
    }

    // Summary diagnosis
    const targetJsRng = (result.steps[toReplayIndex(targetStep)]?.rng || []);
    const targetCRng = (gameplaySteps[toArrayIndex(targetStep)]?.rng || []);
    const targetJsF = targetJsRng.filter(isComparable);
    const targetCF = targetCRng.filter(isComparable);
    const targetState = capturedStates[targetStep];

    console.log(`${'='.repeat(70)}`);
    console.log('DIAGNOSIS:');

    if (targetJsF.length === targetCF.length) {
        if (targetJsF.every((e, j) => normalize(e) === normalize(targetCF[j]))) {
            console.log(`  Step ${targetStep} matches between JS and C.`);
        } else {
            console.log(`  Step ${targetStep} has matching counts but different VALUES.`);
            console.log(`  This indicates accumulated RNG state divergence from earlier steps.`);
        }
    } else if (targetCF.length > targetJsF.length && targetJsF.length === 0) {
        if (targetState?.pendingPrompt) {
            console.log(`  JS has a pendingPrompt (${targetState.pendingPrompt}) at step ${targetStep}.`);
            console.log(`  The key "${gameplaySteps[toArrayIndex(targetStep)]?.key}" was consumed by the prompt`);
            console.log(`  instead of reaching the game command handler.`);
            console.log(`  C processes the key as a game command (${describeKey(gameplaySteps[toArrayIndex(targetStep)]?.key)}).`);
        } else if (targetState?.messageNeedsMore) {
            console.log(`  JS has messageNeedsMore=true at step ${targetStep}.`);
            console.log(`  The key "${gameplaySteps[toArrayIndex(targetStep)]?.key}" was consumed by --More-- dismiss.`);
            console.log(`  C processes the key as a game command.`);
            if (targetState.topMessage) {
                console.log(`  Message: "${targetState.topMessage.slice(0, 60)}"`);
            }
        } else {
            console.log(`  C has ${targetCF.length} entries but JS has 0.`);
            console.log(`  JS may have deferred this processing to a later step.`);
        }
    } else if (targetJsF.length > targetCF.length && targetCF.length === 0) {
        console.log(`  JS has ${targetJsF.length} entries but C has 0.`);
        console.log(`  JS may be processing deferred entries from an earlier step.`);
    } else {
        const diff = targetJsF.length - targetCF.length;
        console.log(`  JS has ${diff > 0 ? diff + ' more' : Math.abs(diff) + ' fewer'} entries than C.`);
        console.log(`  This may indicate accumulated game state differences`);
        console.log(`  (different monster positions, different object counts).`);
    }

    console.log(`${'='.repeat(70)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
