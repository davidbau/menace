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
import {
    prepareReplayArgs,
    getSessionGameplaySteps,
    applyManualDirectChargenView,
    getGameplayRawStepBase,
} from '../js/replay_compare.js';
import { replaySession } from '../js/replay_core.js';

function usage() {
    console.log('Usage: node scripts/movement-propagation.mjs <session.json> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --step-from <N>     First gameplay step to show (default: 1)');
    console.log('  --step-to <N>       Last gameplay step to show (default: step-from)');
    console.log('  --raw-from <N>      First raw replay step to show (side-by-side C vs JS)');
    console.log('  --raw-to <N>        Last raw replay step to show (default: raw-from)');
    console.log('  --raw-find-mismatch Find the first raw key mismatch at/after raw-from');
    console.log('  --grep <REGEX>      Extra filter for printed entries');
    console.log('  --all-rng           Print all RNG/event entries, not just movement-focused ones');
    console.log('  --mon-id <N>        Filter entries to a specific monster id');
    console.log('  --mndx <N>          Filter entries to a specific monster species index');
    console.log('  --monmove-trace     Include [MONMOVE_TRACE]/[MONMOVE_PHASE3] lines');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/movement-propagation.mjs test/comparison/sessions/seed032_manual_direct.session.json --step-from 89 --step-to 91');
    console.log('  node scripts/movement-propagation.mjs test/comparison/sessions/seed031_manual_direct.session.json --step-from 404 --step-to 407 --grep dog_goal');
    console.log('  node scripts/movement-propagation.mjs test/comparison/sessions/seed031_manual_direct.session.json --raw-from 478 --raw-to 500');
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
    let rawFrom = null;
    let rawTo = null;
    let rawFindMismatch = false;
    let grep = null;
    let allRng = false;
    let monId = null;
    let mndx = null;
    let monmoveTrace = false;
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--step-from') {
            stepFrom = Number.parseInt(args[++i], 10);
        } else if (a === '--step-to') {
            stepTo = Number.parseInt(args[++i], 10);
        } else if (a === '--raw-from') {
            rawFrom = Number.parseInt(args[++i], 10);
        } else if (a === '--raw-to') {
            rawTo = Number.parseInt(args[++i], 10);
        } else if (a === '--raw-find-mismatch') {
            rawFindMismatch = true;
        } else if (a === '--grep') {
            grep = new RegExp(args[++i], 'i');
        } else if (a === '--all-rng') {
            allRng = true;
        } else if (a === '--mon-id') {
            monId = Number.parseInt(args[++i], 10);
        } else if (a === '--mndx') {
            mndx = Number.parseInt(args[++i], 10);
        } else if (a === '--monmove-trace') {
            monmoveTrace = true;
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
    if (rawFrom != null && (!Number.isInteger(rawFrom) || rawFrom < 1)) {
        throw new Error(`Invalid --raw-from: ${rawFrom}`);
    }
    if (rawTo != null && (!Number.isInteger(rawTo) || rawTo < 1)) {
        throw new Error(`Invalid --raw-to: ${rawTo}`);
    }
    if (rawFrom == null && rawTo != null) rawFrom = rawTo;
    if (rawFrom != null && (rawTo == null || rawTo < rawFrom)) rawTo = rawFrom;
    return { sessionPath, stepFrom, stepTo, rawFrom, rawTo, rawFindMismatch, grep, allRng, monId, mndx, monmoveTrace };
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

function entryMatchesMonster(entry, monId, mndx) {
    const text = String(entry || '');
    if (monId != null && !new RegExp(`(?:\\bid=${monId}\\b|\\[${monId}@|M${monId}\\b)`).test(text)) {
        return false;
    }
    if (mndx != null && !new RegExp(`(?:\\bmndx=${mndx}\\b|\\[${mndx}@)`).test(text)) {
        return false;
    }
    return true;
}

function entryMatchesSessionMonster(entry, mndx) {
    const text = String(entry || '');
    if (mndx != null && !new RegExp(`(?:\\bmndx=${mndx}\\b|\\[${mndx}@)`).test(text)) {
        return false;
    }
    return true;
}

function filterTraceEntries(entries, grep, monId, mndx) {
    const out = [];
    for (const entry of entries || []) {
        const text = String(entry || '');
        if ((monId != null || mndx != null) && !entryMatchesMonster(text, monId, mndx)) continue;
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

function topLine(screen) {
    if (Array.isArray(screen)) return String(screen[0] || '').trimEnd();
    return String(screen || '').split('\n')[0].trimEnd();
}

function printRawWindow(cRawSteps, jsRawSteps, rawFrom, rawTo) {
    console.log('');
    console.log(`raw steps: ${rawFrom}..${rawTo}`);
    console.log('');
    for (let i = rawFrom; i <= rawTo; i++) {
        const cStep = cRawSteps[i - 1] || {};
        const jsStep = jsRawSteps[i - 1] || {};
        console.log(
            `${String(i).padStart(4, ' ')} C key=${JSON.stringify(cStep.key ?? null).padEnd(6)} top=${JSON.stringify(topLine(cStep.screen)).slice(0, 120)}`
        );
        console.log(
            `     J key=${JSON.stringify(jsStep.key ?? null).padEnd(6)} top=${JSON.stringify(topLine(jsStep.screen)).slice(0, 120)}`
        );
    }
}

function findRawMismatch(cRawSteps, jsRawSteps, rawFrom = 1) {
    const limit = Math.min(cRawSteps.length, jsRawSteps.length);
    for (let i = rawFrom; i <= limit; i++) {
        const cKey = JSON.stringify(cRawSteps[i - 1]?.key ?? null);
        const jsKey = JSON.stringify(jsRawSteps[i - 1]?.key ?? null);
        if (cKey !== jsKey) return i;
    }
    return null;
}

function buildGameplayRawRanges(cGameplaySteps, rawBase) {
    const ranges = [];
    let cursor = rawBase;
    for (const step of cGameplaySteps) {
        const len = (typeof step?.key === 'string' && step.key.length > 0) ? step.key.length : 0;
        const from = cursor;
        const to = len > 0 ? (cursor + len - 1) : (cursor - 1);
        ranges.push({ from, to, len });
        cursor += len;
    }
    return ranges;
}

async function main() {
    const { sessionPath, stepFrom, stepTo, rawFrom, rawTo, rawFindMismatch, grep, allRng, monId, mndx, monmoveTrace } = parseArgs(process.argv);
    const absPath = resolve(sessionPath);
    const raw = JSON.parse(readFileSync(absPath, 'utf8'));
    const normalized = normalizeSession(raw, {
        file: basename(absPath),
        dir: dirname(absPath),
    });
    if (normalized.meta.type !== 'gameplay') {
        throw new Error(`Only gameplay sessions are supported (got type=${normalized.meta.type}).`);
    }
    const sessionForCmp = applyManualDirectChargenView(normalized);

    const cGameplaySteps = getSessionGameplaySteps(sessionForCmp);
    const replayArgs = prepareReplayArgs(normalized.meta.seed, normalized.raw, {});
    const cRawBase = getGameplayRawStepBase(normalized.raw);
    const cRawRanges = buildGameplayRawRanges(cGameplaySteps, cRawBase);

    const prevEnv = {
        WEBHACK_EVENT_RUNSTEP: process.env.WEBHACK_EVENT_RUNSTEP,
        WEBHACK_RUN_TRACE: process.env.WEBHACK_RUN_TRACE,
        WEBHACK_TRACE_STEP_FROM: process.env.WEBHACK_TRACE_STEP_FROM,
        WEBHACK_TRACE_STEP_TO: process.env.WEBHACK_TRACE_STEP_TO,
        WEBHACK_MONMOVE_TRACE: process.env.WEBHACK_MONMOVE_TRACE,
        WEBHACK_MONMOVE_PHASE3_TRACE: process.env.WEBHACK_MONMOVE_PHASE3_TRACE,
        WEBHACK_MFNDPOS_TRACE: process.env.WEBHACK_MFNDPOS_TRACE,
    };
    process.env.WEBHACK_EVENT_RUNSTEP = '1';
    process.env.WEBHACK_RUN_TRACE = '1';
    process.env.WEBHACK_TRACE_STEP_FROM = String(stepFrom);
    process.env.WEBHACK_TRACE_STEP_TO = String(stepTo);
    if (monmoveTrace || monId != null || mndx != null) {
        process.env.WEBHACK_MONMOVE_TRACE = '1';
        process.env.WEBHACK_MONMOVE_PHASE3_TRACE = '1';
        process.env.WEBHACK_MFNDPOS_TRACE = '1';
    }

    const runTraceLines = [];
    const monmoveTraceLines = [];
    const origConsoleLog = console.log;
    console.log = (...args) => {
        const text = args.map((v) => String(v)).join(' ');
        if (text.startsWith('[RUN_TRACE]')) {
            runTraceLines.push(text);
            return;
        }
        if (text.startsWith('[MONMOVE_TRACE]') || text.startsWith('[MONMOVE_PHASE3]')) {
            monmoveTraceLines.push(text);
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
    const monmoveTraceByStep = new Map();
    for (const line of monmoveTraceLines) {
        const step = traceStep(line);
        if (!Number.isInteger(step)) continue;
        const list = monmoveTraceByStep.get(step) || [];
        list.push(line.replace(/^\[(MONMOVE_TRACE|MONMOVE_PHASE3)\]\s*/, ''));
        monmoveTraceByStep.set(step, list);
    }

    console.log(`session: ${absPath}`);
    if (sessionForCmp !== normalized) {
        console.log('view: manual-direct comparison view (chargen folded into startup)');
    }
    console.log(`steps: ${stepFrom}..${stepTo}`);

    if (rawFindMismatch) {
        const mismatch = findRawMismatch(normalized.raw.steps || [], jsReplay.steps || [], rawFrom || 1);
        console.log(`first raw key mismatch at/after ${rawFrom || 1}: ${mismatch ?? 'none'}`);
    }
    if (rawFrom != null) {
        printRawWindow(normalized.raw.steps || [], jsReplay.steps || [], rawFrom, rawTo);
    }
    console.log('');

    for (let step = stepFrom; step <= stepTo; step++) {
        const cStep = cGameplaySteps[step - 1] || {};
        const jsStep = jsGrouped[step - 1] || { rng: [], rawKeys: [] };
        const cEntries = filterEntries(cStep.rng || [], grep, allRng)
            .filter((entry) => entryMatchesSessionMonster(entry, mndx));
        const jsEntries = filterEntries(jsStep.rng || [], grep, allRng)
            .filter((entry) => entryMatchesMonster(entry, monId, mndx));
        const runEntries = filterEntries(runTraceByStep.get(step) || [], grep, true);
        const monmoveEntries = filterTraceEntries(monmoveTraceByStep.get(step) || [], grep, monId, mndx);
        const cRawRange = cRawRanges[step - 1] || { from: null, to: null };
        const cRawKeys = (cRawRange.from != null && cRawRange.to >= cRawRange.from)
            ? (normalized.raw.steps || []).slice(cRawRange.from - 1, cRawRange.to).map((s) => s?.key ?? null)
            : [];
        const turn = Number.isInteger(cStep.turn) ? cStep.turn : '?';
        console.log(
            `=== Step ${step} key=${JSON.stringify(cStep.key ?? null)} turn=${turn} cRaw=${cRawRange.from == null ? '[]' : `[${cRawRange.from}..${cRawRange.to}]`} cRawKeys=${JSON.stringify(cRawKeys)} jsRawKeys=${JSON.stringify(jsStep.rawKeys)} ===`
        );
        console.log('C step entries:');
        if (cEntries.length === 0) console.log('  (none)');
        else for (const entry of cEntries) console.log(`  ${entry}`);
        console.log('JS step entries:');
        if (jsEntries.length === 0) console.log('  (none)');
        else for (const entry of jsEntries) console.log(`  ${entry}`);
        console.log('JS RUN_TRACE:');
        if (runEntries.length === 0) console.log('  (none)');
        else for (const entry of runEntries) console.log(`  ${entry}`);
        console.log('JS MONMOVE_TRACE:');
        if (monmoveEntries.length === 0) console.log('  (none)');
        else for (const entry of monmoveEntries) console.log(`  ${entry}`);
        if (step < stepTo) console.log('');
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
