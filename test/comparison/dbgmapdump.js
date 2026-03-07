#!/usr/bin/env node
// Capture compact debug mapdumps at selected gameplay steps during JS replay.

import { basename, resolve, join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { normalizeSession } from './session_loader.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';
import { buildDebugMapdumpPayload } from '../../js/dungeon.js';
import { resolveSessionFixedDatetime } from './session_datetime.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';

function parseArgs(argv) {
    const out = {
        steps: '',
        window: 0,
        outDir: '',
        sessionPath: '',
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--steps') out.steps = String(argv[++i] || '');
        else if (a === '--window') out.window = Number.parseInt(argv[++i] || '0', 10) || 0;
        else if (a === '--out-dir') out.outDir = String(argv[++i] || '');
        else if (a === '--help' || a === '-h') out.help = true;
        else if (!out.sessionPath) out.sessionPath = a;
        else throw new Error(`Unknown arg: ${a}`);
    }
    return out;
}

function parseStepSet(spec, stepCount, window = 0) {
    const set = new Set();
    if (!spec || !spec.trim()) return set;
    const parts = spec.split(',').map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
        const m = /^(\d+)-(\d+)$/.exec(p);
        if (m) {
            const a = Number.parseInt(m[1], 10);
            const b = Number.parseInt(m[2], 10);
            const lo = Math.min(a, b);
            const hi = Math.max(a, b);
            for (let i = lo; i <= hi; i++) set.add(i);
        } else if (/^\d+$/.test(p)) {
            set.add(Number.parseInt(p, 10));
        } else {
            throw new Error(`Invalid step token: ${p}`);
        }
    }
    if (window > 0) {
        const expanded = new Set();
        for (const s of set) {
            for (let i = s - window; i <= s + window; i++) expanded.add(i);
        }
        set.clear();
        for (const s of expanded) set.add(s);
    }
    const filtered = new Set();
    for (const s of set) {
        if (s >= 1 && s <= stepCount) filtered.add(s);
    }
    return filtered;
}

function usage() {
    console.log(
        'Usage: node test/comparison/dbgmapdump.js <session.json> --steps <list> [--window N] [--out-dir DIR]\n'
        + '\n'
        + 'Examples:\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed032_manual_direct.session.json --steps 89\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed032_manual_direct.session.json --steps 88-90,120 --window 1\n'
    );
}

function loadSession(sessionPath) {
    const raw = JSON.parse(readFileSync(sessionPath, 'utf8'));
    return normalizeSession(raw, { file: basename(sessionPath), dir: resolve('.') });
}

function buildStepToRawEnd(stepBoundaries) {
    const map = new Map();
    let raw = 0;
    for (let i = 0; i < stepBoundaries.length; i++) {
        const n = Number.isInteger(stepBoundaries[i]) ? stepBoundaries[i] : 0;
        raw += n;
        map.set(i + 1, n > 0 ? raw : null);
    }
    return map;
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help || !args.sessionPath || !args.steps) {
        usage();
        process.exit(args.help ? 0 : 2);
    }

    const sessionPath = resolve(args.sessionPath);
    const session = loadSession(sessionPath);
    const opts = { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true };
    if (session.meta.options?.autopickup === false) opts.pickup = false;

    const replayArgs = prepareReplayArgs(session.meta.seed, session.raw, {
        captureScreens: false,
        startupBurstInFirstStep: false,
        flags: opts,
        replayMode: session.meta.type === 'interface' ? 'interface' : undefined,
    });

    const stepCount = replayArgs.stepBoundaries.length;
    const selectedSteps = parseStepSet(args.steps, stepCount, args.window);
    if (selectedSteps.size === 0) {
        throw new Error(`No valid steps selected (step count=${stepCount})`);
    }

    const outDir = args.outDir
        ? resolve(args.outDir)
        : resolve('tmp', 'dbgmapdump', `${basename(sessionPath).replace(/\.session\.json$/, '')}_${Date.now()}`);
    mkdirSync(outDir, { recursive: true });

    const stepToRawEnd = buildStepToRawEnd(replayArgs.stepBoundaries);
    const rawTargets = new Map();
    for (const s of selectedSteps) {
        const raw = stepToRawEnd.get(s);
        if (Number.isInteger(raw) && raw > 0) rawTargets.set(raw, s);
    }

    const captures = [];
    replayArgs.opts.onKey = ({ index, game }) => {
        const rawStep = index + 1;
        const sessionStep = rawTargets.get(rawStep);
        if (!sessionStep) return;
        const map = game?.lev || game?.map || null;
        if (!map) return;
        const payload = buildDebugMapdumpPayload(map, {
            hero: game?.u || game?.player || null,
            moves: Number.isFinite(game?.moves) ? Math.trunc(game.moves) : undefined,
        });
        const file = `step${String(sessionStep).padStart(4, '0')}_raw${String(rawStep).padStart(4, '0')}.mapdump`;
        const abs = join(outDir, file);
        writeFileSync(abs, payload, 'utf8');
        captures.push({
            sessionStep,
            rawStep,
            file,
            absPath: abs,
        });
    };

    const prevDatetime = process.env.NETHACK_FIXED_DATETIME;
    const fixedDatetime = resolveSessionFixedDatetime(session, process.env.NETHACK_SESSION_DATETIME_SOURCE || 'session');
    if (fixedDatetime) process.env.NETHACK_FIXED_DATETIME = fixedDatetime;
    try {
        await replaySession(replayArgs.seed, replayArgs.opts, replayArgs.keys);
    } finally {
        if (prevDatetime == null) delete process.env.NETHACK_FIXED_DATETIME;
        else process.env.NETHACK_FIXED_DATETIME = prevDatetime;
    }

    captures.sort((a, b) => a.sessionStep - b.sessionStep);
    const summary = {
        session: sessionPath,
        seed: session.meta.seed,
        selectedSteps: [...selectedSteps].sort((a, b) => a - b),
        captured: captures,
        outDir,
    };
    writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`Captured ${captures.length} debug mapdump(s) -> ${outDir}`);
    for (const c of captures) {
        console.log(`  step ${c.sessionStep} (raw ${c.rawStep}): ${c.file}`);
    }
}

main().catch((err) => {
    console.error(`dbgmapdump error: ${err.message}`);
    process.exit(1);
});
