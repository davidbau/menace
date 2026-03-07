#!/usr/bin/env node
/**
 * replay_test.mjs — Replay session JSON files against the JS engine and compare.
 *
 * Usage:
 *   node replay_test.mjs sessions/seed42.json
 *   node replay_test.mjs --all sessions/
 *
 * For each session, replays keystroke-by-keystroke and compares:
 *   - Screen frames (character-by-character, 24 rows × 80 cols)
 *   - RNG sequences (raw rand() value arrays per step)
 *
 * Output: one JSON result line per session to stdout.
 * Errors/diagnostics to stderr.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { runSession } from './node_runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Normalize a C-harness screen row:
//   \u00fc (0xfc) → | (wall vertical)
//   \u00c0 (0xc0) → @ (player — stored in signed 7-bit bitfield)
//   Other chars > 0x7e: replace with ? (for diagnostic display)
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

// Compare two 24-row screen arrays char-by-char (each row padded to 80 chars).
// Returns { matches, total, rowDiffs } where rowDiffs = [{row, jsRow, cRow}] for mismatches.
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

// Extract only numeric (rand()) values from a mixed rng/event array.
function rngNums(arr) {
  return arr.filter(v => typeof v === 'number');
}

// Compare RNG arrays step-by-step, ignoring ^event strings.
function compareRng(jsRng, cRng) {
  const jsNums = rngNums(jsRng);
  const cNums = rngNums(cRng);
  const minLen = Math.min(jsNums.length, cNums.length);
  let firstDiverge = -1;
  for (let i = 0; i < minLen; i++) {
    if (jsNums[i] !== cNums[i]) { firstDiverge = i; break; }
  }
  if (firstDiverge < 0 && jsNums.length !== cNums.length) firstDiverge = minLen;
  return {
    match: firstDiverge < 0,
    jsLen: jsNums.length,
    cLen: cNums.length,
    firstDiverge,
  };
}

// Extract events (^-prefixed strings) from a rng array with their positions.
// Returns [{pos, tag}] where pos is the index in the numeric-only sequence.
function rngEvents(arr) {
  const evts = [];
  let numPos = 0;
  for (const v of arr) {
    if (typeof v === 'string' && v.startsWith('^')) evts.push({ pos: numPos, tag: v.slice(1) });
    else numPos++;
  }
  return evts;
}

async function replaySession(sessionFile, opts = {}) {
  const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
  const cSteps = session.steps || [];
  const seed = session.seed;
  const name = basename(sessionFile, '.json');

  if (cSteps.length === 0) {
    return { session: name, seed, passed: false, total_steps: 0, screen_pct: 0, rng_pct: 0, error: 'empty session' };
  }

  const keys = cSteps.map(s => s.key).join('');

  let jsSteps;
  try {
    jsSteps = await runSession(seed, keys);
  } catch (e) {
    return { session: name, seed, passed: false, total_steps: cSteps.length, screen_pct: 0, rng_pct: 0, error: e.message };
  }

  const totalSteps = Math.min(jsSteps.length, cSteps.length);
  let totalScreenMatches = 0;
  let totalScreenCells = 0;
  let totalRngMatches = 0;
  let totalRngCells = 0;
  let firstScreenDiverge = -1;
  let firstRngDiverge = -1;
  const stepDetails = [];

  for (let i = 0; i < totalSteps; i++) {
    const js = jsSteps[i];
    const c = cSteps[i];

    const screenComp = compareScreens(js.screen, c.screen);
    totalScreenMatches += screenComp.matches;
    totalScreenCells += screenComp.total;
    if (screenComp.matches < screenComp.total && firstScreenDiverge < 0) {
      firstScreenDiverge = i;
    }

    const cRng = c.rng || [];
    const jsRng = js.rng || [];
    const rngComp = compareRng(jsRng, cRng);
    // Count matching values up to the shorter numeric length
    const matchCount = rngComp.firstDiverge < 0 ? rngComp.jsLen :
                       rngComp.firstDiverge >= 0 ? rngComp.firstDiverge : rngComp.jsLen;
    totalRngMatches += matchCount;
    totalRngCells += Math.max(rngComp.jsLen, rngComp.cLen, 1);
    if (!rngComp.match && firstRngDiverge < 0) {
      firstRngDiverge = i;
    }

    if (opts.verbose || opts.diagnose) {
      stepDetails.push({ step: i, key: js.key, screen: screenComp, rng: rngComp });
    }
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

  // Diagnose: show events around first RNG or screen divergence
  if (opts.diagnose) {
    const diagStep = firstRngDiverge >= 0 ? firstRngDiverge :
                     firstScreenDiverge >= 0 ? firstScreenDiverge : -1;
    if (diagStep >= 0) {
      const js = jsSteps[diagStep];
      const c  = cSteps[diagStep];
      const cRng = c ? (c.rng || []) : [];
      const jsRng = js ? (js.rng || []) : [];
      const rngComp = compareRng(jsRng, cRng);
      const div = rngComp.firstDiverge;

      // Events just before the divergence (last 5 before div)
      const jsEvts = rngEvents(jsRng);
      const cEvts  = rngEvents(cRng);
      const nearEvts = (evts) => evts.filter(e => div < 0 || (e.pos >= div - 5 && e.pos <= div + 2)).slice(-8);

      result.diagnose = {
        step: diagStep,
        key: js ? js.key : '?',
        rng_diverge_pos: div,
        js_rng_at_div: div >= 0 ? rngNums(jsRng).slice(Math.max(0, div-2), div+3) : [],
        c_rng_at_div:  div >= 0 ? rngNums(cRng).slice(Math.max(0, div-2), div+3) : [],
        js_events: nearEvts(jsEvts),
        c_events:  nearEvts(cEvts),
        screen_diffs: js && c ? compareScreens(js.screen || [], c.screen || []).rowDiffs : [],
      };
      if (firstScreenDiverge >= 0) {
        const sc = jsSteps[firstScreenDiverge];
        const sc_c = cSteps[firstScreenDiverge];
        result.diagnose.screen_diffs = compareScreens(sc ? sc.screen : [], sc_c ? sc_c.screen : []).rowDiffs.slice(0, 4);
        result.diagnose.screen_step = firstScreenDiverge;
      }
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const diagnose = args.includes('--diagnose');
  const verbose = args.includes('--verbose');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length === 0 && !args.includes('--all')) {
    console.error('Usage: node replay_test.mjs [--diagnose] [--verbose] <session.json> [...]');
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
    const result = await replaySession(f, { diagnose, verbose });
    console.log(JSON.stringify(result));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
