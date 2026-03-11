#!/usr/bin/env node
/**
 * session-parity-coverage-report.mjs
 *
 * Summarize /coverage/coverage-summary.json for parity-session coverage.
 * Focuses on actionable gameplay files by default (excludes js/levels/* and
 * generated table-heavy modules unless explicitly requested).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArgs(argv) {
  const args = {
    summaryPath: 'coverage/coverage-summary.json',
    top: 25,
    minLines: 200,
    includeLevels: false,
    includeGenerated: false,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--include-levels') args.includeLevels = true;
    else if (arg === '--include-generated') args.includeGenerated = true;
    else if (arg === '--json') args.json = true;
    else if (arg.startsWith('--summary=')) args.summaryPath = arg.slice('--summary='.length);
    else if (arg === '--summary' && argv[i + 1]) args.summaryPath = argv[++i];
    else if (arg.startsWith('--top=')) args.top = Number.parseInt(arg.slice('--top='.length), 10);
    else if (arg === '--top' && argv[i + 1]) args.top = Number.parseInt(argv[++i], 10);
    else if (arg.startsWith('--min-lines=')) args.minLines = Number.parseInt(arg.slice('--min-lines='.length), 10);
    else if (arg === '--min-lines' && argv[i + 1]) args.minLines = Number.parseInt(argv[++i], 10);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/session-parity-coverage-report.mjs [options]');
      console.log('  --summary <path>         coverage summary JSON (default coverage/coverage-summary.json)');
      console.log('  --top <N>                number of rows (default 25)');
      console.log('  --min-lines <N>          ignore tiny files below line count (default 200)');
      console.log('  --include-levels         include js/levels/* files');
      console.log('  --include-generated      include generated table modules');
      console.log('  --json                   output JSON instead of table');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.top) || args.top <= 0) throw new Error('--top must be a positive integer');
  if (!Number.isInteger(args.minLines) || args.minLines < 0) throw new Error('--min-lines must be a non-negative integer');
  return args;
}

function isGeneratedModule(baseName) {
  return new Set([
    'objects.js',
    'monsters.js',
    'artifacts.js',
    'const.js',
    'symbols.js',
  ]).has(baseName);
}

function formatRow(row) {
  const cols = [
    row.baseName.padEnd(20),
    `${row.lines.pct.toFixed(2)}%`.padStart(8),
    `${row.branches.pct.toFixed(2)}%`.padStart(9),
    `${row.functions.pct.toFixed(2)}%`.padStart(8),
    String(row.lines.total).padStart(7),
    String(row.lines.total - row.lines.covered).padStart(9),
  ];
  return cols.join('  ');
}

function main() {
  const args = parseArgs(process.argv);
  const summaryPath = resolve(args.summaryPath);
  const raw = readFileSync(summaryPath, 'utf8');
  const report = JSON.parse(raw);
  const totals = report.total || {};

  const rows = [];
  for (const [filePath, metrics] of Object.entries(report)) {
    if (filePath === 'total') continue;
    if (!filePath.endsWith('.js')) continue;
    const normalized = String(filePath).replace(/\\/g, '/');
    const marker = '/js/';
    const pos = normalized.lastIndexOf(marker);
    if (pos < 0) continue;
    const rel = normalized.slice(pos + 1); // js/...
    if (!args.includeLevels && rel.startsWith('js/levels/')) continue;
    const baseName = rel.slice(rel.lastIndexOf('/') + 1);
    if (!args.includeGenerated && isGeneratedModule(baseName)) continue;
    if ((metrics?.lines?.total || 0) < args.minLines) continue;
    rows.push({
      relPath: rel,
      baseName,
      lines: metrics.lines || { total: 0, covered: 0, pct: 0 },
      branches: metrics.branches || { total: 0, covered: 0, pct: 0 },
      functions: metrics.functions || { total: 0, covered: 0, pct: 0 },
    });
  }

  rows.sort((a, b) => {
    if (a.lines.pct !== b.lines.pct) return a.lines.pct - b.lines.pct;
    return (b.lines.total - a.lines.total);
  });
  const topRows = rows.slice(0, args.top);

  if (args.json) {
    console.log(JSON.stringify({
      summaryPath,
      totals,
      filteredCount: rows.length,
      rows: topRows,
    }, null, 2));
    return;
  }

  const totalLinesPct = Number(totals?.lines?.pct || 0).toFixed(2);
  const totalBranchesPct = Number(totals?.branches?.pct || 0).toFixed(2);
  const totalFunctionsPct = Number(totals?.functions?.pct || 0).toFixed(2);
  console.log(`Parity session coverage summary: ${summaryPath}`);
  console.log(`Overall: lines ${totalLinesPct}%  branches ${totalBranchesPct}%  functions ${totalFunctionsPct}%`);
  console.log(`Rows considered: ${rows.length} (min-lines=${args.minLines}, include-levels=${args.includeLevels ? 1 : 0}, include-generated=${args.includeGenerated ? 1 : 0})`);
  console.log('');
  console.log('File                   Lines%   Branch%   Func%    Lines   Uncovered');
  console.log('--------------------  --------  ---------  -------  -------  ---------');
  for (const row of topRows) {
    console.log(formatRow(row));
  }
}

try {
  main();
} catch (err) {
  console.error(`session-parity-coverage-report: ${err?.message || err}`);
  process.exit(1);
}
