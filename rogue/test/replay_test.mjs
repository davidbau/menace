#!/usr/bin/env node
/**
 * replay_test.mjs — Replay session JSON files against the JS Rogue engine.
 *
 * Usage:
 *   node replay_test.mjs sessions/seed42.json
 *   node replay_test.mjs --all [sessions/]
 *   node replay_test.mjs --diagnose sessions/seed42.json
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { runSession } from './node_runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizeC(row) {
  let out = '';
  for (const ch of row) {
    const cp = ch.codePointAt(0);
    if (cp === 0xfc) out += '|';
    else if (cp === 0xc0) out += '@';
    else if (cp > 0x7e) out += '?';
    else out += ch;
  }
  return out;
}

function compareScreens(jsScreen, cScreen) {
  const COLS = 80;
  let matches = 0;
  const total = 24 * COLS;
  const rowDiffs = [];

  for (let r = 0; r < 24; r++) {
    const jsRow = (jsScreen[r] || '').padEnd(COLS);
    const cRow = normalizeC(cScreen[r] || '').padEnd(COLS);
    let rowMatches = 0;
    for (let c = 0; c < COLS; c++) {
      if (jsRow[c] === cRow[c]) { matches++; rowMatches++; }
    }
    if (rowMatches < COLS) {
      rowDiffs.push({ row: r + 1, js: jsRow.trimEnd(), c: cRow.trimEnd() });
    }
  }
  return { matches, total, rowDiffs };
}

function rngNums(arr) {
  return (arr || []).filter(v => typeof v === 'number');
}

function compareRng(jsRng, cRng) {
  const jsNums = rngNums(jsRng);
  const cNums = rngNums(cRng);
  const minLen = Math.min(jsNums.length, cNums.length);
  let firstDiverge = -1;
  for (let i = 0; i < minLen; i++) {
    if (jsNums[i] !== cNums[i]) { firstDiverge = i; break; }
  }
  if (firstDiverge < 0 && jsNums.length !== cNums.length) firstDiverge = minLen;
  return { match: firstDiverge < 0, jsLen: jsNums.length, cLen: cNums.length, firstDiverge };
}

async function replaySession(sessionFile, opts = {}) {
  const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
  // Strip C harness sentinel \x00 step (always added as final step by C harness)
  const cSteps = (session.steps || []).filter(s => s.key !== '\x00');
  const seed = session.seed;
  const name = basename(sessionFile, '.json');

  if (cSteps.length === 0) {
    return { session: name, seed, passed: false, total_steps: 0, screen_pct: 0, rng_pct: 0, error: 'empty session' };
  }

  const keys = cSteps.map(s => s.key).join('');
  const runOpts = { wizard: !!session.wizard };

  let jsSteps;
  try {
    jsSteps = await runSession(seed, keys, runOpts);
  } catch (e) {
    return { session: name, seed, passed: false, total_steps: cSteps.length, screen_pct: 0, rng_pct: 0, error: e.message };
  }

  const totalSteps = Math.min(jsSteps.length, cSteps.length);
  let totalScreenMatches = 0, totalScreenCells = 0;
  let totalRngMatches = 0, totalRngCells = 0;
  let firstScreenDiverge = -1, firstRngDiverge = -1;

  for (let i = 0; i < totalSteps; i++) {
    const js = jsSteps[i];
    const c = cSteps[i];

    const screenComp = compareScreens(js.screen, c.screen);
    totalScreenMatches += screenComp.matches;
    totalScreenCells += screenComp.total;
    if (screenComp.matches < screenComp.total && firstScreenDiverge < 0) firstScreenDiverge = i;

    const rngComp = compareRng(js.rng, c.rng);
    const matchCount = rngComp.firstDiverge < 0 ? rngComp.jsLen :
                       rngComp.firstDiverge >= 0 ? rngComp.firstDiverge : rngComp.jsLen;
    totalRngMatches += matchCount;
    totalRngCells += Math.max(rngComp.jsLen, rngComp.cLen, 1);
    if (!rngComp.match && firstRngDiverge < 0) firstRngDiverge = i;
  }

  const screenPct = totalScreenCells > 0 ? (totalScreenMatches / totalScreenCells * 100) : 0;
  const rngPct = totalRngCells > 0 ? (totalRngMatches / totalRngCells * 100) : 0;
  const passed = firstScreenDiverge < 0 && jsSteps.length === cSteps.length;

  const result = {
    session: name,
    seed,
    passed,
    total_steps: totalSteps,
    js_steps: jsSteps.length,
    c_steps: cSteps.length,
    screen_pct: Math.round(screenPct * 10) / 10,
    rng_pct: Math.round(rngPct * 10) / 10,
    first_screen_diverge: firstScreenDiverge,
    first_rng_diverge: firstRngDiverge,
  };

  if (opts.diagnose && (firstScreenDiverge >= 0 || firstRngDiverge >= 0)) {
    const diagStep = firstRngDiverge >= 0 ? firstRngDiverge :
                     firstScreenDiverge >= 0 ? firstScreenDiverge : -1;
    if (diagStep >= 0) {
      const js = jsSteps[diagStep];
      const c = cSteps[diagStep];
      const rngComp = compareRng(js ? js.rng : [], c ? c.rng : []);
      const div = rngComp.firstDiverge;
      result.diagnose = {
        step: diagStep,
        key: js ? js.key : '?',
        rng_diverge_pos: div,
        js_rng_at_div: div >= 0 ? rngNums(js ? js.rng : []).slice(Math.max(0, div - 2), div + 3) : [],
        c_rng_at_div: div >= 0 ? rngNums(c ? c.rng : []).slice(Math.max(0, div - 2), div + 3) : [],
      };
      if (firstScreenDiverge >= 0) {
        const sc = jsSteps[firstScreenDiverge];
        const sc_c = cSteps[firstScreenDiverge];
        result.diagnose.screen_diffs = compareScreens(
          sc ? sc.screen : [], sc_c ? sc_c.screen : []
        ).rowDiffs.slice(0, 4);
        result.diagnose.screen_step = firstScreenDiverge;
      }
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const diagnose = args.includes('--diagnose');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length === 0 && !args.includes('--all')) {
    console.error('Usage: node replay_test.mjs [--diagnose] <session.json> [...]');
    console.error('       node replay_test.mjs [--diagnose] --all [sessions/]');
    process.exit(1);
  }

  const files = [];
  if (args.includes('--all')) {
    const dir = filteredArgs[0] || join(__dirname, 'sessions');
    for (const f of readdirSync(dir).sort()) {
      if (f.endsWith('.json')) files.push(join(dir, f));
    }
  } else {
    files.push(...filteredArgs);
  }

  for (const f of files) {
    const result = await replaySession(f, { diagnose });
    console.log(JSON.stringify(result));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
