#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';

function usage() {
    console.log(
        'Usage:\n'
        + '  node scripts/debug/repaint_square_trace.mjs <session.json> --cell <col,row> [--steps <from-to>] [--stack]\n'
        + '\n'
        + 'Example:\n'
        + '  node scripts/debug/repaint_square_trace.mjs \\\n'
        + '    test/comparison/sessions/pending/t11_s754_w_covmax8_gp.session.json \\\n'
        + '    --cell 34,18 --steps 1609-1611 --stack\n'
    );
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('--help')) {
    usage();
    process.exit(argv.length === 0 ? 1 : 0);
}

const sessionPath = argv[0];
let cell = null;
let steps = null;
let stack = false;

for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--cell') {
        cell = argv[++i] || null;
    } else if (arg === '--steps') {
        steps = argv[++i] || null;
    } else if (arg === '--stack') {
        stack = true;
    } else {
        console.error(`Unknown arg: ${arg}`);
        usage();
        process.exit(1);
    }
}

if (!cell) {
    console.error('--cell is required');
    usage();
    process.exit(1);
}

const env = {
    ...process.env,
    WEBHACK_TRACE_CELL: cell,
};
if (steps) env.WEBHACK_TRACE_CELL_STEPS = steps;
if (stack) env.WEBHACK_TRACE_CELL_STACK = '1';

const runner = path.join('test', 'comparison', 'session_test_runner.js');
const child = spawn(
    process.execPath,
    [runner, `--sessions=${sessionPath}`, '--fail-fast', '--verbose'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] }
);

const interesting = [
    /^\^celltrace\[/,
    /^\[FAIL\]/,
    /^SUMMARY$/,
    /^__RESULTS_JSON__$/,
    /^\{".*"summary":/,
];

function maybePrint(chunk) {
    const text = String(chunk || '');
    for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        if (interesting.some((re) => re.test(line))) {
            console.log(line);
        }
    }
}

child.stdout.on('data', maybePrint);
child.stderr.on('data', maybePrint);
child.on('exit', (code, signal) => {
    if (signal) {
        console.error(`trace run terminated by signal ${signal}`);
        process.exit(1);
    }
    process.exit(code ?? 1);
});
