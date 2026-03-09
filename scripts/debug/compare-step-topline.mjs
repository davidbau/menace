#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { normalizeSession } from '../../test/comparison/session_loader.js';
import { recordGameplaySessionFromInputs } from '../../test/comparison/session_recorder.js';

function usage() {
    console.log('Usage: node scripts/debug/compare-step-topline.mjs <session.json> [--from N] [--to M]');
    process.exit(1);
}

function stripAnsi(line) {
    return String(line || '')
        .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
        .replace(/\u000e|\u000f/g, '');
}

function topline(screen) {
    if (Array.isArray(screen)) {
        return stripAnsi(screen[0] || '');
    }
    return stripAnsi(String(screen || '').split('\n')[0] || '');
}

function parseArgs(argv) {
    if (argv.length < 3) usage();
    const args = argv.slice(2);
    const sessionPath = args[0];
    let from = 1;
    let to = null;
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--from') {
            from = Number(args[++i]);
        } else if (a === '--to') {
            to = Number(args[++i]);
        } else {
            usage();
        }
    }
    if (!Number.isInteger(from) || from < 1) usage();
    return { sessionPath, from, to };
}

async function main() {
    const { sessionPath, from, to } = parseArgs(process.argv);
    const abs = resolve(sessionPath);
    const raw = JSON.parse(readFileSync(abs, 'utf8'));
    const normalized = normalizeSession(raw, {
        file: abs.split('/').pop(),
        dir: dirname(abs),
    });
    if (normalized.meta.type !== 'gameplay') {
        throw new Error(`Only gameplay sessions are supported (got ${normalized.meta.type}).`);
    }

    const replay = await recordGameplaySessionFromInputs(normalized);
    const sessSteps = normalized.steps || [];
    const jsSteps = replay.steps || [];
    const max = Math.min(sessSteps.length, jsSteps.length);
    const end = Number.isInteger(to) ? Math.min(to, max) : max;

    console.log(`session=${abs}`);
    console.log(`steps=${max}, range=${from}-${end}`);
    for (let i = from; i <= end; i++) {
        const s = sessSteps[i - 1] || {};
        const j = jsSteps[i - 1] || {};
        const skey = s.key == null ? 'null' : String(s.key);
        const jkey = j.key == null ? 'null' : String(j.key);
        const st = topline(s.screen);
        const jt = topline(j.screen);
        const mark = st === jt ? ' ' : '!';
        console.log(`${mark} step ${i} key sess=${JSON.stringify(skey)} js=${JSON.stringify(jkey)}`);
        console.log(`    sess: ${JSON.stringify(st)}`);
        console.log(`    js  : ${JSON.stringify(jt)}`);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
