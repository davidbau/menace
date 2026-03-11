#!/usr/bin/env node
/**
 * session-parity-coverage-snapshot.mjs
 *
 * Export a stable, diff-friendly snapshot from coverage/coverage-summary.json.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    summaryPath: 'coverage/coverage-summary.json',
    outPath: 'docs/metrics/session_parity_coverage_latest.json',
    top: 50,
    minLines: 200,
    includeLevels: false,
    includeGenerated: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--include-levels') args.includeLevels = true;
    else if (arg === '--include-generated') args.includeGenerated = true;
    else if (arg.startsWith('--summary=')) args.summaryPath = arg.slice('--summary='.length);
    else if (arg === '--summary' && argv[i + 1]) args.summaryPath = argv[++i];
    else if (arg.startsWith('--out=')) args.outPath = arg.slice('--out='.length);
    else if (arg === '--out' && argv[i + 1]) args.outPath = argv[++i];
    else if (arg.startsWith('--top=')) args.top = Number.parseInt(arg.slice('--top='.length), 10);
    else if (arg === '--top' && argv[i + 1]) args.top = Number.parseInt(argv[++i], 10);
    else if (arg.startsWith('--min-lines=')) args.minLines = Number.parseInt(arg.slice('--min-lines='.length), 10);
    else if (arg === '--min-lines' && argv[i + 1]) args.minLines = Number.parseInt(argv[++i], 10);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/session-parity-coverage-snapshot.mjs [options]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function isGenerated(baseName) {
  return new Set(['objects.js', 'monsters.js', 'artifacts.js', 'const.js', 'symbols.js']).has(baseName);
}

function gitRevParse(ref) {
  try {
    return execSync(`git rev-parse ${ref}`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function toRows(summary, { includeLevels, includeGenerated, minLines }) {
  const rows = [];
  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === 'total') continue;
    if (!filePath.endsWith('.js')) continue;
    const normalized = String(filePath).replace(/\\/g, '/');
    const marker = '/js/';
    const pos = normalized.lastIndexOf(marker);
    if (pos < 0) continue;
    const relPath = normalized.slice(pos + 1);
    if (!includeLevels && relPath.startsWith('js/levels/')) continue;
    const baseName = relPath.slice(relPath.lastIndexOf('/') + 1);
    if (!includeGenerated && isGenerated(baseName)) continue;
    const lines = metrics?.lines || { total: 0, covered: 0, pct: 0 };
    if ((lines.total || 0) < minLines) continue;
    rows.push({
      relPath,
      baseName,
      lines: {
        total: lines.total || 0,
        covered: lines.covered || 0,
        pct: Number(lines.pct || 0),
      },
      branches: {
        total: metrics?.branches?.total || 0,
        covered: metrics?.branches?.covered || 0,
        pct: Number(metrics?.branches?.pct || 0),
      },
      functions: {
        total: metrics?.functions?.total || 0,
        covered: metrics?.functions?.covered || 0,
        pct: Number(metrics?.functions?.pct || 0),
      },
    });
  }
  rows.sort((a, b) => {
    if (a.lines.pct !== b.lines.pct) return a.lines.pct - b.lines.pct;
    return b.lines.total - a.lines.total;
  });
  return rows;
}

function main() {
  const args = parseArgs(process.argv);
  const summaryPath = resolve(args.summaryPath);
  const outPath = resolve(args.outPath);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const rows = toRows(summary, args);

  const snapshot = {
    kind: 'session_parity_coverage_snapshot_v1',
    generatedAt: new Date().toISOString(),
    commit: gitRevParse('HEAD'),
    sourceSummaryPath: summaryPath,
    filters: {
      top: args.top,
      minLines: args.minLines,
      includeLevels: !!args.includeLevels,
      includeGenerated: !!args.includeGenerated,
    },
    overall: {
      linesPct: Number(summary?.total?.lines?.pct || 0),
      branchesPct: Number(summary?.total?.branches?.pct || 0),
      functionsPct: Number(summary?.total?.functions?.pct || 0),
    },
    filteredCount: rows.length,
    lowestCovered: rows.slice(0, args.top),
  };

  writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`Overall: lines ${snapshot.overall.linesPct.toFixed(2)}% branches ${snapshot.overall.branchesPct.toFixed(2)}% funcs ${snapshot.overall.functionsPct.toFixed(2)}%`);
  console.log(`Rows tracked: ${snapshot.filteredCount}, lowestCovered emitted: ${snapshot.lowestCovered.length}`);
}

try {
  main();
} catch (err) {
  console.error(`session-parity-coverage-snapshot: ${err?.message || err}`);
  process.exit(1);
}
