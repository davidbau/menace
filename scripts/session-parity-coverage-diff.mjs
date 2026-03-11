#!/usr/bin/env node
/**
 * session-parity-coverage-diff.mjs
 *
 * Compare two session parity coverage snapshots.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    base: null,
    head: 'docs/metrics/session_parity_coverage_latest.json',
    top: 20,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--base=')) args.base = arg.slice('--base='.length);
    else if (arg === '--base' && argv[i + 1]) args.base = argv[++i];
    else if (arg.startsWith('--head=')) args.head = arg.slice('--head='.length);
    else if (arg === '--head' && argv[i + 1]) args.head = argv[++i];
    else if (arg.startsWith('--top=')) args.top = Number.parseInt(arg.slice('--top='.length), 10);
    else if (arg === '--top' && argv[i + 1]) args.top = Number.parseInt(argv[++i], 10);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/session-parity-coverage-diff.mjs --base <snapshot.json> [--head <snapshot.json>] [--top N]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.base) throw new Error('--base is required');
  if (!Number.isInteger(args.top) || args.top <= 0) throw new Error('--top must be positive');
  return args;
}

function loadSnapshot(path) {
  const obj = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (!obj || obj.kind !== 'session_parity_coverage_snapshot_v1') {
    throw new Error(`Not a parity coverage snapshot v1: ${path}`);
  }
  return obj;
}

function fmt(n) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function main() {
  const args = parseArgs(process.argv);
  const base = loadSnapshot(args.base);
  const head = loadSnapshot(args.head);

  const baseMap = new Map((base.lowestCovered || []).map((row) => [row.relPath, row]));
  const headMap = new Map((head.lowestCovered || []).map((row) => [row.relPath, row]));
  const shared = [];
  for (const [relPath, h] of headMap.entries()) {
    const b = baseMap.get(relPath);
    if (!b) continue;
    shared.push({
      relPath,
      headPct: Number(h?.lines?.pct || 0),
      basePct: Number(b?.lines?.pct || 0),
      deltaPct: Number(h?.lines?.pct || 0) - Number(b?.lines?.pct || 0),
      uncoveredHead: Number(h?.lines?.total || 0) - Number(h?.lines?.covered || 0),
    });
  }
  shared.sort((a, b) => {
    if (a.deltaPct !== b.deltaPct) return a.deltaPct - b.deltaPct;
    return b.uncoveredHead - a.uncoveredHead;
  });

  console.log(`Coverage diff`);
  console.log(`  base: ${args.base}`);
  console.log(`  head: ${args.head}`);
  console.log(`  overall lines: ${base.overall.linesPct.toFixed(2)}% -> ${head.overall.linesPct.toFixed(2)}% (${fmt(head.overall.linesPct - base.overall.linesPct)})`);
  console.log(`  overall branches: ${base.overall.branchesPct.toFixed(2)}% -> ${head.overall.branchesPct.toFixed(2)}% (${fmt(head.overall.branchesPct - base.overall.branchesPct)})`);
  console.log(`  overall functions: ${base.overall.functionsPct.toFixed(2)}% -> ${head.overall.functionsPct.toFixed(2)}% (${fmt(head.overall.functionsPct - base.overall.functionsPct)})`);
  console.log('');
  console.log(`Most regressed tracked files (top ${args.top})`);
  console.log('File                                   Base     Head    Delta');
  console.log('-------------------------------------  -------  ------- -------');
  for (const row of shared.slice(0, args.top)) {
    const file = row.relPath.padEnd(37);
    const basePct = `${row.basePct.toFixed(2)}%`.padStart(7);
    const headPct = `${row.headPct.toFixed(2)}%`.padStart(7);
    const delta = fmt(row.deltaPct).padStart(7);
    console.log(`${file}  ${basePct}  ${headPct} ${delta}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`session-parity-coverage-diff: ${err?.message || err}`);
  process.exit(1);
}
