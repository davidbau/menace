#!/usr/bin/env node
/**
 * Replay a captured C NetHack session with the JS engine and report RNG parity.
 *
 * Usage:
 *   node test/comparison/test_session_replay.js <session.json> [--verbose] [--stop-on-mismatch]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { compareRng, replaySession, generateStartupWithRng, hasStartupBurstInFirstStep } from './session_helpers.js';

function loadSession(filepath) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function usage() {
    console.log('Usage: node test/comparison/test_session_replay.js <session.json> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --verbose              Print every step result');
    console.log('  --stop-on-mismatch     Stop at first mismatch');
    console.log('  --compare-screen       Compare rendered screen against captured screen');
    console.log('  --strict-message-row   Include row 0 (message row) in screen comparison');
    console.log('  --help                 Show this help');
}

function mismatchLine(prefix, div) {
    return `${prefix} diverges at ${div.index}: JS="${div.js}" C="${div.session}"`;
}

function inferReplayStart(sessionPath, session) {
    if (Number.isInteger(session?.startDnum) || Number.isInteger(session?.startDlevel)) {
        return {
            startDnum: Number.isInteger(session?.startDnum) ? session.startDnum : undefined,
            startDlevel: Number.isInteger(session?.startDlevel) ? session.startDlevel : 1,
            startDungeonAlign: Number.isInteger(session?.startDungeonAlign)
                ? session.startDungeonAlign
                : undefined,
        };
    }
    return {};
}

const DEC_TO_UNICODE = {
    l: '\u250c',
    q: '\u2500',
    k: '\u2510',
    x: '\u2502',
    m: '\u2514',
    j: '\u2518',
    n: '\u253c',
    t: '\u251c',
    u: '\u2524',
    v: '\u2534',
    w: '\u252c',
    '~': '\u00b7',
    a: '\u00b7',
};

function normalizeCapturedLine(line, row, screenMode, isMapScreen) {
    let out = (line || '').replace(/\r$/, '');
    if (screenMode === 'decgraphics' && row >= 1) {
        // tmux capture drops terminal column 0 for non-top rows.
        out = ` ${out}`;
    }
    if (isMapScreen && screenMode === 'decgraphics' && row >= 1 && row <= 21) {
        out = [...out].map(ch => DEC_TO_UNICODE[ch] || ch).join('');
    }
    return out.padEnd(80);
}

function normalizeJsLine(line) {
    return (line || '').padEnd(80);
}

function normalizeStatusLine(line, row) {
    if (row === 22) {
        const idx = line.indexOf('St:');
        return idx >= 0 ? line.slice(idx).trimEnd().padEnd(80) : line;
    }
    if (row === 23) {
        const idx = line.indexOf('Dlvl:');
        return idx >= 0 ? line.slice(idx).trimEnd().padEnd(80) : line;
    }
    return line;
}

function compareStepScreen(jsScreen, capturedScreen, screenMode, strictMessageRow = false) {
    if (!Array.isArray(capturedScreen) || capturedScreen.length === 0) {
        return { ok: true, row: -1, js: '', c: '' };
    }
    const isMapScreen = capturedScreen.some(line => typeof line === 'string' && line.includes('Dlvl:'));
    const rowStart = strictMessageRow ? 0 : 1;
    for (let row = rowStart; row < 24; row++) {
        const cLine = normalizeStatusLine(
            normalizeCapturedLine(capturedScreen[row], row, screenMode, isMapScreen),
            row
        );
        const jLine = normalizeStatusLine(normalizeJsLine(jsScreen?.[row]), row);
        if (cLine !== jLine) {
            return { ok: false, row, js: jLine, c: cLine };
        }
    }
    return { ok: true, row: -1, js: '', c: '' };
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help')) {
        usage();
        process.exit(0);
    }

    const sessionPath = path.resolve(args[0]);
    const verbose = args.includes('--verbose');
    const stopOnMismatch = args.includes('--stop-on-mismatch');
    const compareScreen = args.includes('--compare-screen');
    const strictMessageRow = args.includes('--strict-message-row');

    const session = loadSession(sessionPath);
    const seed = session.seed;

    console.log(`Session: ${sessionPath}`);
    console.log(`Seed: ${seed}`);
    if (session.character) {
        console.log(`Character: ${session.character.name} (${session.character.role} ${session.character.race} ${session.character.gender} ${session.character.align})`);
    }

    let failures = 0;

    if (session.startup?.rng && !hasStartupBurstInFirstStep(session)) {
        const startup = generateStartupWithRng(seed, session);
        const div = compareRng(startup.rng, session.startup.rng);
        if (div.index === -1) {
            console.log(`startup: ok (${startup.rngCalls} calls)`);
        } else {
            failures++;
            console.log(mismatchLine('startup RNG', div));
            if (stopOnMismatch) {
                process.exit(1);
            }
        }
    } else if (hasStartupBurstInFirstStep(session)) {
        console.log('startup: skipped (keylog trace stores startup RNG in step 0)');
    }

    const replayOpts = inferReplayStart(sessionPath, session);
    const replay = await replaySession(seed, session, {
        ...replayOpts,
        captureScreens: compareScreen,
    });
    const totalSteps = (session.steps || []).length;
    let matchedSteps = 0;
    let matchedScreenSteps = 0;

    for (let i = 0; i < totalSteps; i++) {
        const jsStep = replay.steps[i];
        const cStep = session.steps[i];
        const div = compareRng(jsStep?.rng || [], cStep?.rng || []);
        const ok = div.index === -1;
        if (ok) {
            matchedSteps++;
            if (verbose) {
                console.log(`step ${i}: ok (${cStep.action || cStep.key})`);
            }
        } else {
            failures++;
            console.log(`step ${i} (${cStep.action || cStep.key}): ${mismatchLine('RNG', div)}`);
            if (stopOnMismatch) {
                break;
            }
        }

        if (compareScreen) {
            const screenCmp = compareStepScreen(
                jsStep?.screen || [],
                cStep?.screen || [],
                session.screenMode || 'decgraphics',
                strictMessageRow
            );
            if (screenCmp.ok) {
                matchedScreenSteps++;
            } else {
                failures++;
                console.log(`step ${i} (${cStep.action || cStep.key}): screen diverges at row ${screenCmp.row}`);
                if (verbose) {
                    console.log(`  C : "${screenCmp.c}"`);
                    console.log(`  JS: "${screenCmp.js}"`);
                }
                if (stopOnMismatch) {
                    break;
                }
            }
        }
    }

    console.log(`steps: ${matchedSteps}/${totalSteps} matched`);
    if (compareScreen) {
        console.log(`screen steps: ${matchedScreenSteps}/${totalSteps} matched${strictMessageRow ? ' (rows 0-23)' : ' (rows 1-23)'}`);
    }
    if (failures > 0) {
        process.exit(1);
    }
    console.log('result: PASS');
}

main().catch((err) => {
    console.error(err);
    process.exit(2);
});
