#!/usr/bin/env node
/**
 * pes_report.mjs — Parity Evidence Summary table for Hack 1982 JS port.
 *
 * Usage:
 *   node pes_report.mjs [sessions/]
 *
 * Prints a table showing pass/fail per session per channel (screen, RNG, events).
 * This is a STUB for Phase 4 — will be filled in when sessions exist.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function main() {
  const sessionsDir = process.argv[2] || join(__dirname, 'sessions');

  if (!existsSync(sessionsDir)) {
    console.log('No sessions directory found. Run run_session.py to capture reference sessions.');
    console.log('Expected:', sessionsDir);
    return;
  }

  const files = readdirSync(sessionsDir).filter(f => f.endsWith('.json')).sort();
  if (files.length === 0) {
    console.log('No session files found in', sessionsDir);
    return;
  }

  console.log('Parity Evidence Summary — Hack 1982 JS Port');
  console.log('='.repeat(60));
  console.log('STUB: Full PES report requires Phase 4 replay engine.');
  console.log('');
  console.log(`Found ${files.length} session file(s):`);
  for (const f of files) {
    try {
      const session = JSON.parse(readFileSync(join(sessionsDir, f), 'utf8'));
      const steps = session.steps ? session.steps.length : '?';
      console.log(`  ${f.padEnd(40)} seed=${String(session.seed).padEnd(10)} steps=${steps}`);
    } catch (e) {
      console.log(`  ${f} (parse error: ${e.message})`);
    }
  }
}

main();
