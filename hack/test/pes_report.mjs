#!/usr/bin/env node
/**
 * pes_report.mjs — Parity Evidence Summary table for Hack 1982 JS port.
 *
 * Usage:
 *   node replay_test.mjs --all sessions/ | node pes_report.mjs
 *   node pes_report.mjs < results.jsonl
 *   node pes_report.mjs [--diagnose] sessions/   (runs replay_test.mjs inline)
 *
 * Reads replay_test.mjs JSON output (one per line) and displays a colored table:
 *
 *   Session          Steps   Screen%  RNG%    Status
 *   ────────────────────────────────────────────────
 *   seed42              10   100.0%  99.5%   ✅ PASS
 *   seed100             22    87.3%  91.2%   ⚠️  @step3
 *   seed777             22   100.0%  100.0%  ✅ PASS
 *
 * Accepts --diagnose to show diff at first screen divergence.
 */

import { createInterface } from 'readline';
import { spawnSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ANSI colors
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

function colorPct(pct) {
  if (pct >= 100) return `${GREEN}${pct.toFixed(1)}%${RESET}`;
  if (pct >= 80)  return `${YELLOW}${pct.toFixed(1)}%${RESET}`;
  return `${RED}${pct.toFixed(1)}%${RESET}`;
}

function colorStatus(result) {
  if (result.passed) return `${GREEN}✅ PASS${RESET}`;
  if (result.error)  return `${RED}❌ ERROR${RESET}`;
  if (result.first_screen_diverge >= 0) return `${YELLOW}⚠️  @step${result.first_screen_diverge}${RESET}`;
  if (result.js_steps !== result.c_steps) return `${YELLOW}⚠️  steps:${result.js_steps}≠${result.c_steps}${RESET}`;
  return `${YELLOW}⚠️  PARTIAL${RESET}`;
}

function printTable(results, opts = {}) {
  const header = `${'Session'.padEnd(22)} ${'Steps'.padStart(5)} ${'Screen%'.padStart(8)} ${'RNG%'.padStart(7)}   Status`;
  const sep = '─'.repeat(70);

  console.log(`\n${BOLD}Parity Evidence Summary — Hack 1982 JS Port${RESET}`);
  console.log(sep);
  console.log(`${BOLD}${header}${RESET}`);
  console.log(sep);

  let pass = 0, fail = 0, total = 0;
  for (const r of results) {
    total++;
    if (r.passed) pass++;
    else fail++;

    if (opts.failuresOnly && r.passed) continue;

    const name = r.session.padEnd(22);
    const steps = String(r.total_steps).padStart(5);
    const screenPct = colorPct(r.screen_pct ?? 0).padStart(8);
    const rngPct = colorPct(r.rng_pct ?? 0).padStart(7);
    const status = colorStatus(r);
    console.log(`${name} ${steps} ${screenPct} ${rngPct}   ${status}`);

    if (r.error) {
      console.log(`  ${DIM}↳ ${r.error}${RESET}`);
    }
    if (r.diagnose) {
      const d = r.diagnose;
      const rdiv = d.rng_diverge_pos >= 0 ? ` rng_pos=${d.rng_diverge_pos}` : '';
      console.log(`  ${DIM}↳ step${d.step} key='${d.key}'${rdiv}${RESET}`);
      if (d.rng_diverge_pos >= 0) {
        console.log(`    ${DIM}rng@div  JS: [${(d.js_rng_at_div||[]).join(',')}]${RESET}`);
        console.log(`    ${DIM}rng@div   C: [${(d.c_rng_at_div||[]).join(',')}]${RESET}`);
        if ((d.js_events||[]).length || (d.c_events||[]).length) {
          console.log(`    ${DIM}events  JS: ${(d.js_events||[]).map(e=>`@${e.pos}:${e.tag}`).join(' ')}${RESET}`);
          console.log(`    ${DIM}events   C: ${(d.c_events||[]).map(e=>`@${e.pos}:${e.tag}`).join(' ')}${RESET}`);
        }
      }
      if ((d.screen_diffs||[]).length) {
        console.log(`    ${DIM}screen diffs (step${d.screen_step ?? d.step}):${RESET}`);
        for (const diff of d.screen_diffs) {
          console.log(`      JS: ${JSON.stringify(diff.js)}`);
          console.log(`       C: ${JSON.stringify(diff.c)}`);
        }
      }
    }
  }

  console.log(sep);
  const passColor = pass === total ? GREEN : YELLOW;
  console.log(`${BOLD}Results: ${passColor}${pass}/${total} pass${RESET}  ${fail} fail`);
  console.log('');
}

async function readResultsFromStdin() {
  const results = [];
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch (e) {
      // Skip unparseable lines (e.g., debug output)
    }
  }
  return results;
}

function runReplayInline(dir, diagnose) {
  const replay = join(__dirname, 'replay_test.mjs');
  const args = ['--input-type=module', '--eval',
    `import { createRequire } from 'module'; const r = createRequire(import.meta.url); ` +
    'true'];

  // Use spawnSync to run replay_test.mjs --all dir
  const replayArgs = ['--experimental-vm-modules', replay, '--all'];
  if (diagnose) replayArgs.push('--diagnose');
  replayArgs.push(dir);

  const result = spawnSync('node', replayArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;

  const results = [];
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { results.push(JSON.parse(trimmed)); } catch {}
  }
  if (result.stderr) process.stderr.write(result.stderr);
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const diagnose = args.includes('--diagnose');
  const failuresOnly = args.includes('--failures');

  // Check if a sessions directory was passed as argument
  const dirArg = args.filter(a => !a.startsWith('--'))[0];

  let results;
  if (dirArg && existsSync(dirArg)) {
    // Run replay inline on the given directory
    const replay = join(__dirname, 'replay_test.mjs');
    const replayArgs = [replay, '--all'];
    if (diagnose) replayArgs.push('--diagnose');
    replayArgs.push(dirArg);

    const proc = spawnSync('node', replayArgs, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    if (proc.error) { console.error(proc.error); process.exit(1); }
    results = [];
    for (const line of proc.stdout.split('\n')) {
      const t = line.trim();
      if (t) { try { results.push(JSON.parse(t)); } catch {} }
    }
    if (proc.stderr) process.stderr.write(proc.stderr);
  } else if (!process.stdin.isTTY || dirArg) {
    // Read from stdin (piped from replay_test.mjs)
    results = await readResultsFromStdin();
  } else {
    // No input: show usage
    console.log('Usage:');
    console.log('  node replay_test.mjs --all sessions/ | node pes_report.mjs');
    console.log('  node pes_report.mjs [--diagnose] sessions/');
    process.exit(0);
  }

  if (results.length === 0) {
    console.log('No results found.');
    return;
  }

  printTable(results, { failuresOnly });
}

main().catch(e => { console.error(e); process.exit(1); });
