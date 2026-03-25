#!/usr/bin/env node
/**
 * rerecord_sessions.mjs — Re-record all standard (non-multigame) sessions
 * using the C harness, preserving existing keys and seed.
 *
 * Usage: node rerecord_sessions.mjs [sessions/]
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessionsDir = process.argv[2] || join(__dirname, 'sessions');
const harness = join(__dirname, '..', 'hack-c', 'patched', 'hack_harness');

const files = readdirSync(sessionsDir).filter(f => f.endsWith('.json')).sort();
let recorded = 0, skipped = 0, failed = 0;

for (const f of files) {
  const path = join(sessionsDir, f);
  const session = JSON.parse(readFileSync(path, 'utf8'));

  // Skip multigame sessions (JS-only, no C harness)
  if (session.games) {
    skipped++;
    continue;
  }

  const seed = session.seed;
  const keys = (session.steps || []).map(s => s.key).join('');

  if (!keys) {
    console.error(`SKIP ${f}: no keys`);
    skipped++;
    continue;
  }

  try {
    const raw = execFileSync(harness, ['--seed', String(seed), '--keys', keys], {
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024,  // 50MB
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Extract JSON from output (skip non-JSON lines like "No record file")
    const jsonStart = raw.indexOf('{\n');
    if (jsonStart < 0) throw new Error('No JSON found in harness output');
    const output = raw.slice(jsonStart);
    // Validate JSON
    const newSession = JSON.parse(output);
    // Verify step count matches
    if (newSession.steps.length !== session.steps.length) {
      console.error(`WARN ${f}: step count changed ${session.steps.length} → ${newSession.steps.length}`);
    }
    // Verify cursor data present
    if (!newSession.steps[0]?.cursor) {
      console.error(`WARN ${f}: no cursor data in re-recorded session`);
    }
    writeFileSync(path, JSON.stringify(newSession, null, 2) + '\n');
    recorded++;
    if (recorded % 20 === 0) process.stderr.write(`  ${recorded}/${files.length - skipped} recorded\n`);
  } catch (e) {
    console.error(`FAIL ${f}: ${e.message}`);
    failed++;
  }
}

console.log(`Done: ${recorded} re-recorded, ${skipped} skipped, ${failed} failed`);
