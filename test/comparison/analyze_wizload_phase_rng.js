#!/usr/bin/env node

import fs from 'node:fs';

function usage() {
  console.error(
    'Usage: node test/comparison/analyze_wizload_phase_rng.js <comparison.json> [--window N] [--step N] [--all]'
  );
}

function parseArgs(argv) {
  const out = {
    path: '',
    window: 120,
    step: null,
    all: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && !out.path) {
      out.path = a;
      continue;
    }
    if (a === '--all') {
      out.all = true;
      continue;
    }
    if (a === '--window') {
      out.window = Number(argv[++i]);
      continue;
    }
    if (a === '--step') {
      out.step = Number(argv[++i]);
      continue;
    }
    if (a.startsWith('--window=')) {
      out.window = Number(a.slice('--window='.length));
      continue;
    }
    if (a.startsWith('--step=')) {
      out.step = Number(a.slice('--step='.length));
      continue;
    }
    console.error(`Unknown argument: ${a}`);
    usage();
    process.exit(2);
  }
  return out;
}

const args = parseArgs(process.argv);
const path = args.path;
if (!path) {
  usage();
  process.exit(2);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(path, 'utf8'));
} catch (err) {
  console.error(`Failed to read/parse JSON: ${err.message}`);
  process.exit(1);
}

const jsSource = data?.comparison?.rng?.js;
const cSource = data?.comparison?.rng?.session;
const jsNorm = Array.isArray(jsSource) ? jsSource : jsSource?.normalized;
const cNorm = Array.isArray(cSource) ? cSource : cSource?.normalized;
const jsRaw = Array.isArray(jsSource?.raw) ? jsSource.raw : jsNorm;
const cRaw = Array.isArray(cSource?.raw) ? cSource.raw : cNorm;
const jsRawIndexMap = Array.isArray(jsSource?.rawIndexMap) ? jsSource.rawIndexMap : null;
const cRawIndexMap = Array.isArray(cSource?.rawIndexMap) ? cSource.rawIndexMap : null;
if (!Array.isArray(jsNorm) || !Array.isArray(cNorm)) {
  console.error('comparison.rng.js/session normalized arrays not found in artifact');
  process.exit(1);
}
const firstDiv = data?.comparison?.rng?.firstDivergence;
const focusIndex = Number.isInteger(firstDiv?.index) ? firstDiv.index : null;
const focusStep = Number.isInteger(args.step) ? args.step : firstDiv?.step;

const interesting = /(\^ckpt\[phase=after_(wallification_special|finalize_special|wallification|levregions_fixup|finalize)|rn2\([^)]*\)=\d+ @ (place_lregion|placeRegion|flip_level_rnd|water_has_kelp|mineralize))/;

function indexWindow(arr, idx, window) {
  if (!Number.isInteger(idx)) return [0, arr.length - 1];
  const start = Math.max(0, idx - window);
  const end = Math.min(arr.length - 1, idx + window);
  return [start, end];
}

function findCkpt(arr, idx, dir) {
  if (!Number.isInteger(idx)) return null;
  if (dir < 0) {
    for (let i = idx; i >= 0; i--) {
      const line = String(arr[i] || '');
      if (line.startsWith('^ckpt[')) return { i, line };
    }
  } else {
    for (let i = idx; i < arr.length; i++) {
      const line = String(arr[i] || '');
      if (line.startsWith('^ckpt[')) return { i, line };
    }
  }
  return null;
}

function emitLine(i, line) {
  console.log(`${String(i).padStart(6, ' ')}  ${line}`);
}

function rawCheckpointPhase(line) {
  const m = String(line || '').match(/^\^ckpt\[phase=([^ \]]+)/);
  return m ? m[1] : null;
}

function findRawCheckpointIndex(rawArr, phaseName, startAt = 0) {
  for (let i = Math.max(0, startAt); i < rawArr.length; i++) {
    const phase = rawCheckpointPhase(rawArr[i]);
    if (phase === phaseName) return i;
  }
  return -1;
}

function summarizePhaseWindow(rawArr, label, startPhase, endPhase) {
  const start = findRawCheckpointIndex(rawArr, startPhase);
  if (start < 0) {
    console.log(`\n${label}: missing start checkpoint ${startPhase}`);
    return;
  }
  const end = findRawCheckpointIndex(rawArr, endPhase, start + 1);
  if (end < 0) {
    console.log(`\n${label}: missing end checkpoint ${endPhase}`);
    return;
  }
  const matches = [];
  for (let i = start + 1; i < end; i++) {
    const line = String(rawArr[i] || '');
    if (line.includes('@ place_lregion') || line.includes('@ placeRegion')) {
      matches.push({ i, line });
    }
  }
  console.log(`\n${label}: ${startPhase} -> ${endPhase}`);
  console.log(`  raw window: [${start}, ${end}]`);
  console.log(`  place_lregion/placeRegion calls: ${matches.length}`);
  for (const m of matches) {
    emitLine(m.i, m.line);
  }
}

const interestingRaw = /(\^ckpt\[|@(.*place_lregion|.*placeRegion|.*finalize_level|.*fixupSpecialLevel|.*flip_level_rnd|.*mineralize))/;

function printStream(name, arr, rawArr, rawIndexMap, idx, window, showAll) {
  console.log(`\n=== ${name} normalized (${arr.length}) raw (${rawArr.length}) ===`);
  const [start, end] = showAll ? [0, arr.length - 1] : indexWindow(arr, idx, window);
  const before = findCkpt(arr, start, -1);
  const after = findCkpt(arr, end, 1);
  if (!showAll) {
    console.log(`Window: [${start}, ${end}]${Number.isInteger(idx) ? ` around index ${idx}` : ''}`);
    if (before) emitLine(before.i, `${before.line}  (prev-ckpt)`);
  }

  const rawStart = Number.isInteger(rawIndexMap?.[start]) ? Math.max(0, rawIndexMap[start] - 100) : 0;
  const rawEnd = Number.isInteger(rawIndexMap?.[end])
    ? Math.min(rawArr.length - 1, rawIndexMap[end] + 100)
    : rawArr.length - 1;

  let skippedMineralize = 0;
  for (let i = rawStart; i <= rawEnd; i++) {
    const line = String(rawArr[i] || '');
    if (!showAll && !interestingRaw.test(line)) continue;
    if (interesting.test(line)) {
      const isMineralize = line.includes('@ mineralize');
      if (isMineralize && !showAll) {
        skippedMineralize++;
        if (skippedMineralize > 10) continue;
      }
      emitLine(i, line);
    }
  }
  if (skippedMineralize > 10 && !showAll) {
    console.log(`       … skipped ${skippedMineralize - 10} additional @ mineralize lines (use --all to show)`);
  }
  if (!showAll && after) emitLine(after.i, `${after.line}  (next-ckpt)`);

  const rawFocus = Number.isInteger(rawIndexMap?.[idx]) ? rawIndexMap[idx] : null;
  if (Number.isInteger(rawFocus)) {
    const rs = Math.max(0, rawFocus - 20);
    const re = Math.min(rawArr.length - 1, rawFocus + 20);
    console.log(`Raw focus window: [${rs}, ${re}] around raw index ${rawFocus}`);
    for (let i = rs; i <= re; i++) {
      const line = String(rawArr[i] || '');
      if (!showAll && !interestingRaw.test(line) && i !== rawFocus) continue;
      emitLine(i, line);
    }
  }
}

console.log(`Artifact: ${path}`);
if (firstDiv) {
  console.log(`First divergence: index=${firstDiv.index} step=${firstDiv.step}`);
  if (firstDiv.jsRaw) console.log(`JS: ${firstDiv.jsRaw}`);
  if (firstDiv.sessionRaw) console.log(`C : ${firstDiv.sessionRaw}`);
}
if (Number.isInteger(focusStep)) console.log(`Focus step: ${focusStep}`);
printStream('JS', jsNorm, jsRaw, jsRawIndexMap, focusIndex, args.window, args.all);
printStream('C', cNorm, cRaw, cRawIndexMap, focusIndex, args.window, args.all);

summarizePhaseWindow(
  jsRaw,
  'JS phase summary (special pass)',
  'after_wallification_special',
  'after_levregions_fixup'
);
summarizePhaseWindow(
  cRaw,
  'C phase summary (special pass)',
  'after_wallification_special',
  'after_levregions_fixup'
);
summarizePhaseWindow(
  jsRaw,
  'JS phase summary (second pass)',
  'after_wallification',
  'after_levregions_fixup'
);
summarizePhaseWindow(
  cRaw,
  'C phase summary (second pass)',
  'after_wallification',
  'after_levregions_fixup'
);
