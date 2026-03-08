#!/usr/bin/env node
// Capture step-targeted JS mapdumps, optional C snapshots, and compare them.

import { basename, dirname, join, resolve } from 'node:path';
import {
    existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';

import { normalizeSession, parseCompactMapdump } from './session_loader.js';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';
import { buildDebugMapdumpPayload } from '../../js/dungeon.js';
import { resolveSessionFixedDatetime } from './session_datetime.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { runSessionBundle } from './session_test_runner.js';
import { findFirstGridDiff } from './comparators.js';

const GRID_SECTIONS = new Set(['T', 'F', 'H', 'L', 'R', 'W']);
const VECTOR_SECTIONS = new Set(['U', 'A']);
const SPARSE_SECTIONS = new Set(['O', 'Q', 'M', 'N', 'K', 'J', 'E']);
const ALL_SECTIONS = [...GRID_SECTIONS, ...VECTOR_SECTIONS, ...SPARSE_SECTIONS];
const DEFAULT_COMPARE_SECTIONS = ['U', 'A', 'O', 'Q', 'M', 'N', 'K', 'J', 'E', 'T', 'F', 'W'];

function usage() {
    const sectionLegend = [
        'T typGrid',
        'F flagsGrid',
        'H horizontalGrid',
        'L litGrid',
        'R roomnoGrid',
        'W wallInfoGrid',
        'U hero vector',
        'A anchor vector',
        'O object sparse',
        'Q object details sparse',
        'M monster sparse',
        'N monster details sparse',
        'K trap sparse',
        'J trap details sparse',
        'E engraving sparse',
    ].join(', ');
    console.log(
        'dbgmapdump: capture step-targeted JS mapdumps, optional C snapshots, and section-aware diffs.\n\n'
        + 'Usage:\n'
        + '  node test/comparison/dbgmapdump.js <session.json> (--steps <spec> | --first-divergence) [options]\n'
        + '  node test/comparison/dbgmapdump.js --help\n\n'
        + 'Arguments:\n'
        + '  <session.json>            Canonical replay session file.\n\n'
        + 'Core options:\n'
        + '  --steps <spec>            Step selection (1-based gameplay steps).\n'
        + '                            Supports comma/ranges: 89,88-92,120\n'
        + '  --window <N>              Expand each selected step by +/- N (default: 0)\n'
        + '  --first-divergence        Auto-select first divergence step from session comparator\n'
        + '                            (prefers RNG, then event, then screen)\n'
        + '  --out-dir <DIR>           Output directory (default: tmp/dbgmapdump/<session>_<ts>)\n\n'
        + 'Capture options:\n'
        + '  --sections <list>         Filter written sections (comma list from: '
        + ALL_SECTIONS.join(',') + '; default: all)\n'
        + '  --context <N>             Include RNG/event context from +/- N raw replay steps (default: 8)\n'
        + '  --adjacent-diff           Compare each captured JS step to the previous captured JS step\n'
        + '                            and report first differing section (uses --sections)\n'
        + '  --c-side                  Also capture C-side snapshots for selected steps\n\n'
        + 'Compare options:\n'
        + '  --compare <DIR>           Compare JS mapdumps against mapdumps in DIR\n'
        + '                            If --c-side is set and --compare omitted, compares against <out-dir>/c\n'
        + '  --compare-sections <list> Section set for compare (default: '
        + DEFAULT_COMPARE_SECTIONS.join(',') + ')\n\n'
        + 'Section legend:\n'
        + `  ${sectionLegend}\n\n`
        + 'Output layout:\n'
        + '  <out-dir>/index.json              Summary: selected steps, signatures, context, compare results\n'
        + '  <out-dir>/replay_keys.json        Exact normalized replay key stream used for JS/C capture alignment\n'
        + '  <out-dir>/js/stepNNNN.mapdump     JS compact mapdump per selected session step\n'
        + '  <out-dir>/c/stepNNNN.mapdump      C-derived compact mapdump (when --c-side)\n'
        + '  <out-dir>/c/stepNNNN.snapshot.json Raw C checkpoint JSON (when --c-side)\n\n'
        + 'Notes:\n'
        + '  - Step numbers are gameplay/session steps (1-based), not raw replay key indices.\n'
        + '  - --steps and --first-divergence are mutually exclusive; when both are passed, --first-divergence wins.\n'
        + '  - Compare requires peer files named stepNNNN.mapdump.\n'
        + '  - Exit code is non-zero on argument/IO/capture errors.\n\n'
        + 'Examples:\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed032_manual_direct.session.json --steps 89 --window 1\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed031_manual_direct.session.json --first-divergence --window 1 --c-side\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed031_manual_direct.session.json --steps 14-16 --c-side --compare-sections U,A,M,N,O,Q\n'
        + '  node test/comparison/dbgmapdump.js test/comparison/sessions/seed033_manual_direct.session.json --steps 140-145 --sections T,F,W,U,M,N --context 16 --adjacent-diff --out-dir tmp/dbgmapdump/seed033_focus\n'
    );
}

function parseArgs(argv) {
    const out = {
        steps: '',
        window: 0,
        outDir: '',
        sections: '',
        compareSections: '',
        compareDir: '',
        context: 8,
        sessionPath: '',
        cSide: false,
        firstDivergence: false,
        adjacentDiff: false,
    };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--steps') out.steps = String(argv[++i] || '');
        else if (a.startsWith('--steps=')) out.steps = a.slice('--steps='.length);
        else if (a === '--window') out.window = Number.parseInt(argv[++i] || '0', 10) || 0;
        else if (a.startsWith('--window=')) out.window = Number.parseInt(a.slice('--window='.length), 10) || 0;
        else if (a === '--out-dir') out.outDir = String(argv[++i] || '');
        else if (a.startsWith('--out-dir=')) out.outDir = a.slice('--out-dir='.length);
        else if (a === '--sections') out.sections = String(argv[++i] || '');
        else if (a.startsWith('--sections=')) out.sections = a.slice('--sections='.length);
        else if (a === '--compare') out.compareDir = String(argv[++i] || '');
        else if (a.startsWith('--compare=')) out.compareDir = a.slice('--compare='.length);
        else if (a === '--compare-sections') out.compareSections = String(argv[++i] || '');
        else if (a.startsWith('--compare-sections=')) out.compareSections = a.slice('--compare-sections='.length);
        else if (a === '--context') out.context = Number.parseInt(argv[++i] || '8', 10) || 8;
        else if (a.startsWith('--context=')) out.context = Number.parseInt(a.slice('--context='.length), 10) || 8;
        else if (a === '--c-side') out.cSide = true;
        else if (a === '--first-divergence') out.firstDivergence = true;
        else if (a === '--adjacent-diff') out.adjacentDiff = true;
        else if (a === '--help' || a === '-h') out.help = true;
        else if (!out.sessionPath) out.sessionPath = a;
        else throw new Error(`Unknown arg: ${a}`);
    }
    return out;
}

function parseSectionSet(spec, fallback = ALL_SECTIONS) {
    if (!spec || !spec.trim()) return new Set(fallback);
    const set = new Set();
    for (const token of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (!ALL_SECTIONS.includes(token)) throw new Error(`Unknown section: ${token}`);
        set.add(token);
    }
    return set;
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
    for (const s of set) if (s >= 1 && s <= stepCount) filtered.add(s);
    return filtered;
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

function filterMapdumpSections(payload, sectionSet) {
    const lines = String(payload || '').split('\n').filter(Boolean);
    const out = [];
    for (const line of lines) {
        if (sectionSet.has(line[0])) out.push(line);
    }
    return `${out.join('\n')}\n`;
}

function encodeCompactCell(v) {
    const n = Math.max(0, Math.trunc(Number(v) || 0));
    if (n <= 9) return String.fromCharCode(48 + n);
    if (n <= 35) return String.fromCharCode(97 + (n - 10));
    if (n <= 61) return String.fromCharCode(65 + (n - 36));
    return 'Z';
}

function encodeCompactRow(row, width = 80) {
    const vals = Array.isArray(row) ? row.slice(0, width) : [];
    while (vals.length < width) vals.push(0);
    const out = [];
    let runVal = vals[0];
    let runLen = 0;
    const emit = () => {
        if (runLen <= 0) return;
        if (runLen >= 3) out.push(`~${runLen},${encodeCompactCell(runVal)}`);
        else {
            for (let i = 0; i < runLen; i++) out.push(encodeCompactCell(runVal));
        }
    };
    for (const v of vals) {
        if (runLen === 0) {
            runVal = v;
            runLen = 1;
        } else if (v === runVal) {
            runLen++;
        } else {
            emit();
            runVal = v;
            runLen = 1;
        }
    }
    emit();
    return out.join('');
}

function encodeCompactGrid(grid, rows = 21, cols = 80, mapFn = null) {
    const out = [];
    for (let y = 0; y < rows; y++) {
        const row = Array.isArray(grid?.[y]) ? grid[y] : [];
        const mapped = mapFn ? row.map(mapFn) : row;
        out.push(encodeCompactRow(mapped, cols));
    }
    return out.join('|');
}

function toSparse(entries) {
    return entries.filter(Boolean).join(';');
}

function buildCompactMapdumpFromCSnapshot(capture, sectionSet) {
    const cp = capture?.checkpoint || {};
    const lines = [];
    if (sectionSet.has('T') && cp.typGrid) lines.push(`T${encodeCompactGrid(cp.typGrid)}`);
    if (sectionSet.has('F') && cp.flagGrid) lines.push(`F${encodeCompactGrid(cp.flagGrid, 21, 80, (v) => (Number(v) || 0) & 0x1f)}`);
    if (sectionSet.has('W') && cp.wallInfoGrid) lines.push(`W${encodeCompactGrid(cp.wallInfoGrid, 21, 80, (v) => (Number(v) || 0) & 0x1f)}`);
    else if (sectionSet.has('W') && cp.flagGrid) lines.push(`W${encodeCompactGrid(cp.flagGrid, 21, 80, (v) => (Number(v) || 0) & 0x1f)}`);
    if (sectionSet.has('U')) {
        const ux = Number(cp.u_ux) || 0;
        const uy = Number(cp.u_uy) || 0;
        lines.push(`U${ux},${uy},0,0,0,0,0,0,0,0,0,0,0,0,0,0`);
    }
    if (sectionSet.has('A')) lines.push('A0,0');

    if (sectionSet.has('O')) {
        const objs = Array.isArray(cp.objects) ? cp.objects : [];
        lines.push(`O${toSparse(objs.map((o) => `${o.x | 0},${o.y | 0},${o.otyp | 0},${Math.trunc(Number(o.quan) || 0)}`))}`);
    }
    if (sectionSet.has('Q')) {
        const objs = Array.isArray(cp.objects) ? cp.objects : [];
        const rows = objs.map((o) => {
            const x = o.x | 0;
            const y = o.y | 0;
            const otyp = o.otyp | 0;
            const quan = Math.trunc(Number(o.quan) || 0);
            const cursed = o.cursed ? 1 : 0;
            const noCharge = o.no_charge ? 1 : 0;
            return `0,${x},${y},${otyp},${quan},0,${cursed},0,0,0,0,0,0,${noCharge}`;
        }).sort();
        lines.push(`Q${toSparse(rows)}`);
    }
    if (sectionSet.has('M')) {
        const mons = Array.isArray(cp.monsters) ? cp.monsters : [];
        lines.push(`M${toSparse(mons.map((m) => `${m.x | 0},${m.y | 0},${m.mnum | 0},${m.mhp | 0}`))}`);
    }
    if (sectionSet.has('N')) {
        const mons = Array.isArray(cp.monsters) ? cp.monsters : [];
        const rows = mons.map((m) => {
            const id = m.m_id | 0;
            const x = m.x | 0;
            const y = m.y | 0;
            const mnum = m.mnum | 0;
            const mhp = m.mhp | 0;
            const mtame = m.mtame | 0;
            const peaceful = m.mpeaceful ? 1 : 0;
            const sleeping = m.msleeping ? 1 : 0;
            const canmove = m.mcanmove ? 1 : 0;
            const apType = m.m_ap_type | 0;
            const appearance = m.mappearance | 0;
            const minvcount = m.minvcount | 0;
            return `${id},${x},${y},${mnum},${mhp},${mhp},${mtame},${peaceful},${sleeping},0,${canmove},0,${apType},${appearance},${minvcount}`;
        }).sort();
        lines.push(`N${toSparse(rows)}`);
    }
    if (sectionSet.has('K')) {
        const traps = Array.isArray(cp.traps) ? cp.traps : [];
        lines.push(`K${toSparse(traps.map((t) => `${(t.tx ?? t.x) | 0},${(t.ty ?? t.y) | 0},${(t.ttyp ?? t.type ?? 0) | 0}`))}`);
    }
    if (sectionSet.has('J')) {
        const traps = Array.isArray(cp.traps) ? cp.traps : [];
        const rows = traps.map((t) => `${(t.tx ?? t.x) | 0},${(t.ty ?? t.y) | 0},${(t.ttyp ?? t.type ?? 0) | 0},${t.tseen ? 1 : 0},${t.once ? 1 : 0},${t.madeby_u ? 1 : 0},-1,-1`);
        lines.push(`J${toSparse(rows)}`);
    }
    if (sectionSet.has('E') && Array.isArray(cp.engravings)) {
        const engrs = cp.engravings;
        const rows = engrs.map((e) => {
            const x = (e.engr_x ?? e.x ?? 0) | 0;
            const y = (e.engr_y ?? e.y ?? 0) | 0;
            const etype = (e.engr_type ?? e.type ?? 0) | 0;
            const text = e.engr_txt?.actual_text ?? e.text ?? '';
            const textLen = String(text).length | 0;
            const nowipeout = e.nowipeout ? 1 : 0;
            const guardobjects = e.guardobjects ? 1 : 0;
            return `${x},${y},${etype},${textLen},${nowipeout},${guardobjects}`;
        }).sort();
        lines.push(`E${toSparse(rows)}`);
    }
    return `${lines.join('\n')}\n`;
}

function mapdumpSignature(parsed) {
    const hero = parsed?.hero || [];
    const monCount = Array.isArray(parsed?.monsters) ? parsed.monsters.length : 0;
    const objCount = Array.isArray(parsed?.objects) ? parsed.objects.length : 0;
    const trapCount = Array.isArray(parsed?.traps) ? parsed.traps.length : 0;
    const engrCount = Array.isArray(parsed?.engravings) ? parsed.engravings.length : 0;
    return `u=(${hero[0] ?? '?'},${hero[1] ?? '?'}) hp=${hero[2] ?? '?'} mons=${monCount} objs=${objCount} traps=${trapCount} engr=${engrCount}`;
}

function sparseCompare(aList = [], bList = []) {
    const norm = (arr) => (Array.isArray(arr) ? arr : [])
        .map((r) => (Array.isArray(r) ? r.map((v) => Number(v) || 0) : []))
        .sort((a, b) => a.join(',').localeCompare(b.join(',')));
    const a = norm(aList);
    const b = norm(bList);
    const total = Math.max(a.length, b.length);
    for (let i = 0; i < total; i++) {
        if (!a[i] || !b[i]) return { match: false, diff: { index: i, a: a[i] || null, b: b[i] || null } };
        if (a[i].length !== b[i].length) return { match: false, diff: { index: i, a: a[i], b: b[i] } };
        for (let j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) return { match: false, diff: { index: i, a: a[i], b: b[i] } };
    }
    return { match: true, diff: null };
}

function sectionField(section) {
    return ({
        T: 'typGrid', F: 'flagsGrid', H: 'horizontalGrid', L: 'litGrid', R: 'roomnoGrid', W: 'wallInfoGrid',
        U: 'hero', A: 'anchor',
        O: 'objects', Q: 'objectDetails', M: 'monsters', N: 'monsterDetails', K: 'traps', J: 'trapDetails',
        E: 'engravings',
    })[section];
}

function compareParsedMapdumps(aParsed, bParsed, sectionSet) {
    const diffs = [];
    for (const section of sectionSet) {
        const field = sectionField(section);
        const aHas = !!aParsed?._sections?.[section];
        const bHas = !!bParsed?._sections?.[section];
        if (!aHas || !bHas) {
            diffs.push({ section, kind: 'missing', aHas, bHas });
            continue;
        }
        if (GRID_SECTIONS.has(section)) {
            const diff = findFirstGridDiff(aParsed[field] || [], bParsed[field] || []);
            if (diff) diffs.push({ section, kind: 'grid', ...diff });
        } else if (VECTOR_SECTIONS.has(section)) {
            const cmp = sparseCompare([aParsed[field]], [bParsed[field]]);
            if (!cmp.match) diffs.push({ section, kind: 'vector', ...cmp.diff });
        } else {
            const cmp = sparseCompare(aParsed[field], bParsed[field]);
            if (!cmp.match) diffs.push({ section, kind: 'sparse', ...cmp.diff });
        }
    }
    return diffs;
}

function getContextEntries(replay, rawStep, span = 8) {
    const out = [];
    const steps = Array.isArray(replay?.steps) ? replay.steps : [];
    const lo = Math.max(1, rawStep - span);
    const hi = Math.min(steps.length - 1, rawStep + span);
    for (let rs = lo; rs <= hi; rs++) {
        const rng = Array.isArray(steps[rs]?.rng) ? steps[rs].rng : [];
        for (const entry of rng) out.push({ rawStep: rs, entry });
    }
    return out;
}

function runCStepCapture(sessionPath, rawStep, outJson, fixedDatetime = null, keysJsonPath = null) {
    const script = resolve('test/comparison/c-harness/capture_step_snapshot.py');
    const env = { ...process.env };
    if (fixedDatetime) env.NETHACK_FIXED_DATETIME = fixedDatetime;
    const args = [script, sessionPath, String(rawStep - 1), outJson];
    if (keysJsonPath) {
        args.push('--keys-json', keysJsonPath);
    }
    const res = spawnSync('python3', args, {
        encoding: 'utf8',
        stdio: 'pipe',
        env,
    });
    if (res.status !== 0) {
        const msg = (res.stderr || res.stdout || '').trim();
        throw new Error(`C snapshot failed at raw step ${rawStep}: ${msg}`);
    }
}

async function inferFirstDivergenceStep(sessionPath) {
    const bundle = await runSessionBundle({
        sessionPath,
        verbose: false,
        parallel: 0,
        sessionTimeoutMs: 30000,
    });
    const r = bundle?.results?.[0];
    if (!r) return null;
    return r?.firstDivergences?.rng?.step
        || r?.firstDivergences?.event?.step
        || r?.firstDivergences?.screen?.step
        || r?.firstDivergence?.step
        || null;
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help || !args.sessionPath || (!args.steps && !args.firstDivergence)) {
        usage();
        process.exit(args.help ? 0 : 2);
    }

    const sessionPath = resolve(args.sessionPath);
    const session = loadSession(sessionPath);
    const sectionSet = parseSectionSet(args.sections, ALL_SECTIONS);
    const compareSectionSet = parseSectionSet(args.compareSections, DEFAULT_COMPARE_SECTIONS);

    const flags = { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true };
    if (session.meta.options?.autopickup === false) flags.pickup = false;

    const replayArgs = prepareReplayArgs(session.meta.seed, session.raw, {
        captureScreens: false,
        startupBurstInFirstStep: false,
        flags,
        replayMode: session.meta.type === 'interface' ? 'interface' : undefined,
    });
    const stepCount = replayArgs.stepBoundaries.length;
    const fixedDatetime = resolveSessionFixedDatetime(session, process.env.NETHACK_SESSION_DATETIME_SOURCE || 'session');

    let stepSpec = args.steps;
    if (args.firstDivergence) {
        const fd = await inferFirstDivergenceStep(sessionPath);
        if (!fd) throw new Error('Could not infer first divergence step for this session');
        stepSpec = String(fd);
        console.log(`Auto-selected first divergence step: ${fd}`);
    }
    const selectedSteps = parseStepSet(stepSpec, stepCount, args.window);
    if (selectedSteps.size === 0) throw new Error(`No valid steps selected (step count=${stepCount})`);

    const outDir = args.outDir
        ? resolve(args.outDir)
        : resolve('tmp', 'dbgmapdump', `${basename(sessionPath).replace(/\.session\.json$/, '')}_${Date.now()}`);
    const jsDir = join(outDir, 'js');
    const cDir = join(outDir, 'c');
    mkdirSync(jsDir, { recursive: true });
    if (args.cSide) mkdirSync(cDir, { recursive: true });

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
        const full = buildDebugMapdumpPayload(map, {
            hero: game?.u || game?.player || null,
            moves: Number.isFinite(game?.moves) ? Math.trunc(game.moves) : undefined,
        });
        const payload = filterMapdumpSections(full, sectionSet);
        const file = `step${String(sessionStep).padStart(4, '0')}.mapdump`;
        const abs = join(jsDir, file);
        writeFileSync(abs, payload, 'utf8');
        const parsed = parseCompactMapdump(payload);
        captures.push({
            sessionStep,
            rawStep,
            file,
            jsPath: abs,
            signature: mapdumpSignature(parsed),
        });
    };

    const prevDatetime = process.env.NETHACK_FIXED_DATETIME;
    if (fixedDatetime) process.env.NETHACK_FIXED_DATETIME = fixedDatetime;
    let replay = null;
    try {
        replay = await replaySession(replayArgs.seed, replayArgs.opts, replayArgs.keys);
    } finally {
        if (prevDatetime == null) delete process.env.NETHACK_FIXED_DATETIME;
        else process.env.NETHACK_FIXED_DATETIME = prevDatetime;
    }

    captures.sort((a, b) => a.sessionStep - b.sessionStep);
    for (const c of captures) {
        c.rngContext = getContextEntries(replay, c.rawStep, Math.max(0, args.context));
    }

    if (args.cSide) {
        const keysJsonPath = join(outDir, 'replay_keys.json');
        writeFileSync(keysJsonPath, `${JSON.stringify(replayArgs.keys)}\n`, 'utf8');
        for (const c of captures) {
            const outJson = join(cDir, `step${String(c.sessionStep).padStart(4, '0')}.snapshot.json`);
            runCStepCapture(sessionPath, c.rawStep, outJson, fixedDatetime, keysJsonPath);
            const capture = JSON.parse(readFileSync(outJson, 'utf8'));
            const cPayloadFull = buildCompactMapdumpFromCSnapshot(capture, sectionSet);
            const cPayload = filterMapdumpSections(cPayloadFull, sectionSet);
            const cMapdumpPath = join(cDir, `step${String(c.sessionStep).padStart(4, '0')}.mapdump`);
            writeFileSync(cMapdumpPath, cPayload, 'utf8');
            c.cPath = cMapdumpPath;
            c.cSnapshotPath = outJson;
            c.cSignature = mapdumpSignature(parseCompactMapdump(cPayload));
        }
    }

    let compareDir = args.compareDir ? resolve(args.compareDir) : '';
    if (!compareDir && args.cSide) compareDir = cDir;
    let comparisons = [];
    if (compareDir) {
        if (!existsSync(compareDir)) throw new Error(`compare dir does not exist: ${compareDir}`);
        comparisons = captures.map((c) => {
            const name = `step${String(c.sessionStep).padStart(4, '0')}.mapdump`;
            const peer = join(compareDir, name);
            if (!existsSync(peer)) {
                return { sessionStep: c.sessionStep, ok: false, missingPeer: peer, diffs: [{ kind: 'missing_peer' }] };
            }
            const aParsed = parseCompactMapdump(readFileSync(c.jsPath, 'utf8'));
            const bParsed = parseCompactMapdump(readFileSync(peer, 'utf8'));
            const diffs = compareParsedMapdumps(aParsed, bParsed, compareSectionSet);
            return {
                sessionStep: c.sessionStep,
                ok: diffs.length === 0,
                peerPath: peer,
                diffs,
            };
        });
    }

    let adjacentComparisons = [];
    if (args.adjacentDiff && captures.length >= 2) {
        const ordered = captures.slice().sort((a, b) => a.sessionStep - b.sessionStep);
        adjacentComparisons = ordered.slice(1).map((curr, idx) => {
            const prev = ordered[idx];
            const aParsed = parseCompactMapdump(readFileSync(prev.jsPath, 'utf8'));
            const bParsed = parseCompactMapdump(readFileSync(curr.jsPath, 'utf8'));
            const diffs = compareParsedMapdumps(aParsed, bParsed, sectionSet);
            return {
                fromStep: prev.sessionStep,
                toStep: curr.sessionStep,
                ok: diffs.length === 0,
                diffs,
            };
        });
    }

    const summary = {
        session: sessionPath,
        seed: session.meta.seed,
        selectedSteps: [...selectedSteps].sort((a, b) => a - b),
        options: {
            window: args.window,
            sections: [...sectionSet],
            compareSections: [...compareSectionSet],
            cSide: args.cSide,
            compareDir: compareDir || null,
            context: args.context,
            firstDivergence: args.firstDivergence,
            adjacentDiff: args.adjacentDiff,
        },
        captured: captures,
        comparisons,
        adjacentComparisons,
        outDir,
        jsDir,
        cDir: args.cSide ? cDir : null,
    };
    writeFileSync(join(outDir, 'index.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

    console.log(`Captured ${captures.length} JS debug mapdump(s) -> ${jsDir}`);
    for (const c of captures) {
        console.log(`  step ${c.sessionStep} raw=${c.rawStep} sig=${c.signature}`);
    }
    if (args.cSide) {
        console.log(`Captured ${captures.length} C snapshot mapdump(s) -> ${cDir}`);
    }
    if (compareDir) {
        const ok = comparisons.filter((c) => c.ok).length;
        console.log(`Compare summary (${[...compareSectionSet].join(',')}): ${ok}/${comparisons.length} step(s) match`);
        for (const row of comparisons.filter((c) => !c.ok)) {
            const d = row.diffs?.[0];
            if (d?.section) console.log(`  step ${row.sessionStep}: first diff section=${d.section} kind=${d.kind}`);
            else if (row.missingPeer) console.log(`  step ${row.sessionStep}: missing peer ${row.missingPeer}`);
            else console.log(`  step ${row.sessionStep}: mismatch`);
        }
    }
    if (args.adjacentDiff && adjacentComparisons.length > 0) {
        const ok = adjacentComparisons.filter((c) => c.ok).length;
        console.log(`Adjacent JS diff summary (${[...sectionSet].join(',')}): ${ok}/${adjacentComparisons.length} transition(s) unchanged`);
        for (const row of adjacentComparisons.filter((c) => !c.ok)) {
            const d = row.diffs?.[0];
            if (d?.section) console.log(`  ${row.fromStep} -> ${row.toStep}: first diff section=${d.section} kind=${d.kind}`);
            else console.log(`  ${row.fromStep} -> ${row.toStep}: mismatch`);
        }
    }
}

main().catch((err) => {
    console.error(`dbgmapdump error: ${err.message}`);
    process.exit(1);
});
