#!/usr/bin/env node
/**
 * replay_test.mjs — Replay a session JSON against the JS engine and compare.
 *
 * Usage:
 *   node replay_test.mjs sessions/seed42.json
 *   node replay_test.mjs --all sessions/
 *
 * For each session, replays keystroke-by-keystroke and compares:
 *   - Screen frames (character-by-character)
 *   - RNG log (fn/x/y/v per call)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// We can't easily import ES modules (browser-targeted) in Node.js without
// a bundler, so this is a STUB for Phase 4.
// The actual replay logic will be implemented when the JS engine stabilizes.

async function replaySession(sessionFile) {
  const session = JSON.parse(readFileSync(sessionFile, 'utf8'));
  const steps = session.steps || [];
  console.log(`Session: ${sessionFile}`);
  console.log(`  Seed: ${session.seed}`);
  console.log(`  Steps: ${steps.length}`);
  console.log('  STUB: replay not yet implemented (Phase 4)');
  return { pass: null, total: steps.length, rng_match: null, screen_match: null };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node replay_test.mjs <session.json> [...]');
    console.log('       node replay_test.mjs --all sessions/');
    process.exit(1);
  }

  const files = [];
  for (const arg of args) {
    if (arg === '--all') continue;
    const nextArg = args[args.indexOf(arg) + 1];
    if (arg === '--all' && nextArg) {
      // All sessions in directory
      const dir = nextArg;
      for (const f of readdirSync(dir)) {
        if (f.endsWith('.json')) files.push(join(dir, f));
      }
    } else if (!arg.startsWith('--')) {
      files.push(arg);
    }
  }

  if (files.length === 0 && args.includes('--all')) {
    const dir = args[args.indexOf('--all') + 1] || join(__dirname, 'sessions');
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.json')) files.push(join(dir, f));
    }
  }

  let passed = 0, failed = 0, total = 0;
  for (const f of files) {
    const result = await replaySession(f);
    total++;
    if (result.pass === true) passed++;
    else if (result.pass === false) failed++;
  }

  console.log(`\nResults: ${total} sessions, ${passed} pass, ${failed} fail`);
}

main().catch(e => { console.error(e); process.exit(1); });
