#!/usr/bin/env node
// Inspect movement ownership/propagation for a gameplay session over a step window.
//
// Replays the JS side with:
// - WEBHACK_EVENT_RUNSTEP=1 to capture ^runstep[...] markers in RNG logs
// - WEBHACK_RUN_TRACE=1 to capture [RUN_TRACE] stdout diagnostics
//
// Then groups the JS replay back into gameplay steps and prints the selected
// step window alongside the corresponding C-captured step entries.

import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { normalizeSession } from '../test/comparison/session_loader.js';
import { prepareReplayArgs, getSessionGameplaySteps } from '../js/replay_compare.js';
import { replaySession } from '../js/replay_core.js';

function usage() {
    console.log('Usage: node scripts/movement-propagation.mjs <session.json> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --step-from <N>     First gameplay step to show (default: 1)');
    console.log('  --step-to <N>       Last gameplay step to show (default: step-from)');
    console.log('  --grep <REGEX>      Extra filter for printed entries');
    console.log('  --all-rng           Print all RNG/event entries, not just movement-focused ones');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/movement-propagation.mjs test/comparison/sessions/seed032_manual_direct.session.json --step-from 89 --step-to 91');
    console.log('  node scripts/movement-propagation.mjs test/comparison/sessions/seed031_manual_direct.session.json --step-from 404 --step-to 407 --grep dog_goal');
}

function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        usage();
        process.exit(0);
    }
    const sessionPath = args[0];
    let stepFrom = 1;
    let stepTo = null;
    let grep = null;
    let allRng = false;
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--step-from') {
            stepFrom = Number.parseInt(args[++i], 10);
        } else if (a === '--step-to') {
            stepTo = Number.parseInt(args[++i], 10);
        } else if (a === '--grep') {
            grep = new RegExp(args[++i], 'i');
        } else if (a === '--all-rng') {
            allRng = true;
        } else {
            throw new Error(`Unknown arg: ${a}`);
        }
    }
    if (!Number.isInteger(stepFrom) || stepFrom < 1) {
        throw new Error(`Invalid --step-from: ${stepFrom}`);
    }
    if (!Number.isInteger(stepTo) || stepTo < stepFrom) {
        stepTo = stepFrom;
    }
    return { sessionPath, stepFrom, stepTo, grep, allRng };
}

function traceStep(line) {
    const m = /(?:^|\s)step=(\d+)(?:\s|$)/.exec(String(line || ''));
    return m ? Number.parseInt(m[1], 10) : null;
}

function defaultMovementFilter(entry) {
    const text = String(entry || '');
    return /(^\^runstep\[|^\^movemon_turn\[|^\^mcalcmove\[|^\^distfleeck\[|^\^dog_|>runmode_delay_output|<runmode_delay_output|^\^tmp_at_|^\^place\[|dog_move|dochug|mfndpos|domove_|lookaround|test_move|promptDirectionAndThrowItem)/.test(text);
}

function filterEntries(entries, grep, allRng = false) {
    const out = [];
    for (const entry of entries || []) {
        const text = String(entry || '');
        if (!allRng && !defaultMovementFilter(text)) continue;
        if (grep && !grep.test(text)) continue;
        out.push(text);
    }
    return out;
}

function groupGameplaySteps(jsReplay, stepBoundaries) {
    const grouped = [];
    const gameplay = jsReplay.steps.slice(1);
    let cursor = 0;
    for (const len of stepBoundaries) {
        const slice = gameplay.slice(cursor, cursor + len);
        grouped.push({
            rng: slice.flatMap((step) => step.rng || []),
            rawKeys: slice.map((step) => step.key),
        });
        cursor += len;
    }
    return grouped;
}

async function main() {
    const { sessionPath, stepFrom, stepTo, grep, allRng } = parseArgs(process.argv);
    const absPath = resolve(sessionPath);
    const raw = JSON.parse(readFileSync(absPath, 'utf8'));
    const normalized = normalizeSession(raw, {
        file: basename(absPath),
        dir: dirname(absPath),
    });
    if (normalized.meta.type !== 'gameplay') {
        throw new Error(`Only gameplay sessions are supported (got type=${normalized.meta.type}).`);
    }

    const cGameplaySteps = getSessionGameplaySteps(normalized.raw);
    const replayArgs = prepareReplayArgs(normalized.meta.seed, normalized.raw, {});

    const prevEnv = {
        WEBHACK_EVENT_RUNSTEP: process.env.WEBHACK_EVENT_RUNSTEP,
        WEBHACK_RUN_TRACE: process.env.WEBHACK_RUN_TRACE,
        WEBHACK_TRACE_STEP_FROM: process.env.WEBHACK_TRACE_STEP_FROM,
        WEBHACK_TRACE_STEP_TO: process.env.WEBHACK_TRACE_STEP_TO,
    };
    process.env.WEBHACK_EVENT_RUNSTEP = '1';
    process.env.WEBHACK_RUN_TRACE = '1';
    process.env.WEBHACK_TRACE_STEP_FROM = String(stepFrom);
    process.env.WEBHACK_TRACE_STEP_TO = String(stepTo);

    const runTraceLines = [];
    const origConsoleLog = console.log;
    console.log = (...args) => {
        const text = args.map((v) => String(v)).join(' ');
        if (text.startsWith('[RUN_TRACE]')) {
            runTraceLines.push(text);
            return;
        }
        origConsoleLog(...args);
    };

    let jsReplay;
    try {
        jsReplay = await replaySession(replayArgs.seed, replayArgs.opts, replayArgs.keys);
    } finally {
        console.log = origConsoleLog;
        for (const [key, value] of Object.entries(prevEnv)) {
            if (value == null) delete process.env[key];
            else process.env[key] = value;
        }
    }

    const jsGrouped = groupGameplaySteps(jsReplay, replayArgs.stepBoundaries);
    const runTraceByStep = new Map();
    for (const line of runTraceLines) {
        const step = traceStep(line);
        if (!Number.isInteger(step)) continue;
        const list = runTraceByStep.get(step) || [];
        list.push(line.replace(/^\[RUN_TRACE\]\s*/, ''));
        runTraceByStep.set(step, list);
    }

    console.log(`session: ${absPath}`);
    console.log(`steps: ${stepFrom}..${stepTo}`);
    console.log('');

    for (let step = stepFrom; step <= stepTo; step++) {
        const cStep = cGameplaySteps[step - 1] || {};
        const jsStep = jsGrouped[step - 1] || { rng: [], rawKeys: [] };
        const cEntries = filterEntries(cStep.rng || [], grep, allRng);
        const jsEntries = filterEntries(jsStep.rng || [], grep, allRng);
        const runEntries = filterEntries(runTraceByStep.get(step) || [], grep, true);
        const turn = Number.isInteger(cStep.turn) ? cStep.turn : '?';
        console.log(`=== Step ${step} key=${JSON.stringify(cStep.key ?? null)} turn=${turn} rawKeys=${JSON.stringify(jsStep.rawKeys)} ===`);
        console.log('C step entries:');
        if (cEntries.length === 0) console.log('  (none)');
        else for (const entry of cEntries) console.log(`  ${entry}`);
        console.log('JS step entries:');
        if (jsEntries.length === 0) console.log('  (none)');
        else for (const entry of jsEntries) console.log(`  ${entry}`);
        console.log('JS RUN_TRACE:');
        if (runEntries.length === 0) console.log('  (none)');
        else for (const entry of runEntries) console.log(`  ${entry}`);
        if (step < stepTo) console.log('');
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
