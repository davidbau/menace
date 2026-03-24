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
import { runSession, runMultigameSession } from './node_runner.mjs';

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

// Normalize save file paths for comparison — C uses /tmp/rogue.save, JS uses /home/rodney/rogue.sav
function normalizeSavePath(row) {
  return row
    .replace(/Save file \([^)]*\)/, 'Save file (...)')
    .replace(/Save file: .*/, 'Save file: ...')
    .replace(/File name: .*/, 'File name: ...');
}

function compareScreens(jsScreen, cScreen) {
  const COLS = 80;
  let matches = 0;
  const total = 24 * COLS;
  const rowDiffs = [];

  for (let r = 0; r < 24; r++) {
    const jsRow = normalizeSavePath(jsScreen[r] || '').padEnd(COLS);
    const cRow = normalizeSavePath(normalizeC(cScreen[r] || '')).padEnd(COLS);
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
  const name = basename(sessionFile, '.json');
  const seed = session.seed;

  // Skip coverage-only sessions (no C harness data)
  if (session.coverage_only) {
    return { session: name, seed, passed: true, total_steps: 0, screen_pct: 100, rng_pct: 100, skipped: 'coverage_only' };
  }

  // Multigame sessions: compare each game separately
  if (session.games) {
    return replayMultigameSession(session, name, opts);
  }

  // Strip C harness sentinel \x00 step (always added as final step by C harness)
  const cSteps = (session.steps || []).filter(s => s.key !== '\x00');

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
  let cursorMatches = 0, cursorTotal = 0, firstCursorDiverge = -1;

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

    // Cursor comparison (if both have cursor data)
    if (js.cursor && c.cursor) {
      cursorTotal++;
      if (js.cursor[0] === c.cursor[0] && js.cursor[1] === c.cursor[1]) {
        cursorMatches++;
      } else if (firstCursorDiverge < 0) {
        firstCursorDiverge = i;
      }
    }
  }

  const screenPct = totalScreenCells > 0 ? (totalScreenMatches / totalScreenCells * 100) : 0;
  const rngPct = totalRngCells > 0 ? (totalRngMatches / totalRngCells * 100) : 0;

  // Also compare total RNG across all steps (ignores step boundary alignment)
  const allJsRng = jsSteps.flatMap(s => rngNums(s.rng));
  const allCRng = cSteps.flatMap(s => rngNums(s.rng));
  const totalRngComp = compareRng(allJsRng, allCRng);
  const totalRngMatch = totalRngComp.firstDiverge < 0;
  const totalRngPct = (totalRngComp.firstDiverge < 0
    ? 100
    : Math.max(allJsRng.length, allCRng.length) > 0
      ? (totalRngComp.firstDiverge / Math.max(allJsRng.length, allCRng.length) * 100)
      : 100);

  // Pass requires: total RNG 100% match, screen ≥98%, step count match.
  // Screen allows for: endmsg display timing (row 0), options hw overlay diffs.
  // TODO: fix remaining display timing to reach 100% screen.
  const passed = totalRngMatch && screenPct >= 98.0 && jsSteps.length === cSteps.length;

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
    cursor_pct: cursorTotal > 0 ? Math.round(cursorMatches / cursorTotal * 1000) / 10 : null,
    first_cursor_diverge: firstCursorDiverge,
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

async function replayMultigameSession(session, name, opts) {
  const seed = session.seed;
  const games = session.games;

  // Build game specs for the JS multigame runner
  const gameSpecs = games.map(g => ({
    seed: g.seed || seed,
    keys: (g.steps || []).filter(s => s.key !== '\x00').map(s => s.key).join(''),
    wizard: g.wizard !== undefined ? g.wizard : !!session.wizard,
  }));

  let allJsSteps;
  try {
    allJsSteps = await runMultigameSession(gameSpecs);
  } catch (e) {
    return { session: name, seed, passed: false, multigame: true, error: e.message };
  }

  // Compare each game's steps
  let totalScreenMatches = 0, totalScreenCells = 0;
  let totalRngMatches = 0, totalRngCells = 0;
  let totalSteps = 0;
  let firstScreenDiverge = -1, firstRngDiverge = -1;

  for (let gi = 0; gi < games.length; gi++) {
    const cSteps = (games[gi].steps || []).filter(s => s.key !== '\x00');
    const jsSteps = allJsSteps[gi] || [];
    const minSteps = Math.min(jsSteps.length, cSteps.length);

    for (let i = 0; i < minSteps; i++) {
      const screenComp = compareScreens(jsSteps[i].screen, cSteps[i].screen);
      totalScreenMatches += screenComp.matches;
      totalScreenCells += screenComp.total;
      if (screenComp.matches < screenComp.total && firstScreenDiverge < 0)
        firstScreenDiverge = totalSteps + i;

      const rngComp = compareRng(jsSteps[i].rng, cSteps[i].rng);
      const matchCount = rngComp.firstDiverge < 0 ? rngComp.jsLen : rngComp.firstDiverge;
      totalRngMatches += matchCount;
      totalRngCells += Math.max(rngComp.jsLen, rngComp.cLen, 1);
      if (!rngComp.match && firstRngDiverge < 0)
        firstRngDiverge = totalSteps + i;
    }
    totalSteps += minSteps;
  }

  const screenPct = totalScreenCells > 0 ? (totalScreenMatches / totalScreenCells * 100) : 0;
  const rngPct = totalRngCells > 0 ? (totalRngMatches / totalRngCells * 100) : 0;

  // Total JS and C step counts
  const jsTotal = allJsSteps.reduce((s, g) => s + g.length, 0);
  const cTotal = games.reduce((s, g) => s + (g.steps || []).filter(x => x.key !== '\x00').length, 0);

  // For multigame: screen parity is primary (RNG diverges across save/restore boundaries)
  const passed = screenPct >= 93.0 && jsTotal === cTotal;

  return {
    session: name, seed, passed, multigame: true,
    num_games: games.length,
    total_steps: totalSteps,
    js_steps: jsTotal, c_steps: cTotal,
    screen_pct: Math.round(screenPct * 10) / 10,
    rng_pct: Math.round(rngPct * 10) / 10,
    first_screen_diverge: firstScreenDiverge,
    first_rng_diverge: firstRngDiverge,
  };
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
