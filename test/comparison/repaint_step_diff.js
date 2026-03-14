// repaint_step_diff.js
// Compare expected vs JS repaint entries for startup and selected steps.

import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { normalizeSession } from './session_loader.js';
import { recordGameplaySessionFromInputs } from './session_recorder.js';

function collectRepaintEntries(stepLike) {
    return (Array.isArray(stepLike?.rng) ? stepLike.rng : [])
        .filter((entry) => typeof entry === 'string' && entry.startsWith('^repaint['));
}

function parseArgs(argv) {
    const args = { sessionPath: null, steps: [], includeStartup: true };
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (!args.sessionPath && !arg.startsWith('--')) {
            args.sessionPath = arg;
            continue;
        }
        if (arg === '--no-startup') {
            args.includeStartup = false;
            continue;
        }
        if (arg === '--steps' && i + 1 < argv.length) {
            args.steps = argv[++i].split(',').map((s) => Number.parseInt(s, 10)).filter(Number.isInteger);
            continue;
        }
        if (arg.startsWith('--steps=')) {
            args.steps = arg.slice('--steps='.length).split(',').map((s) => Number.parseInt(s, 10)).filter(Number.isInteger);
            continue;
        }
    }
    if (!args.sessionPath) {
        throw new Error('usage: node test/comparison/repaint_step_diff.js <session-path> [--steps=1,2,3] [--no-startup]');
    }
    return args;
}

function diffEntries(expected, actual) {
    const total = Math.max(expected.length, actual.length);
    const rows = [];
    for (let i = 0; i < total; i++) {
        rows.push({
            index: i,
            expected: expected[i] ?? null,
            actual: actual[i] ?? null,
            match: expected[i] === actual[i],
        });
    }
    return rows;
}

async function main() {
    const args = parseArgs(process.argv);
    process.env.WEBHACK_REPAINT_TRACE = '1';

    const raw = JSON.parse(readFileSync(args.sessionPath, 'utf8'));
    const session = normalizeSession(raw, {
        file: basename(args.sessionPath),
        dir: dirname(args.sessionPath),
    });
    const replay = await recordGameplaySessionFromInputs(session);

    const out = {};
    if (args.includeStartup) {
        out.startup = diffEntries(
            collectRepaintEntries(session.startup),
            collectRepaintEntries(replay.startup)
        );
    }
    for (const step of args.steps) {
        if (step < 1) continue;
        out[`step${step}`] = diffEntries(
            collectRepaintEntries(session.steps?.[step - 1]),
            collectRepaintEntries(replay.steps?.[step - 1])
        );
    }
    console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
