#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

function usage() {
  console.log('Usage: node scripts/session-marginal-coverage.mjs --sessions=<a,b,c>');
  console.log('   or: node scripts/session-marginal-coverage.mjs <a> <b> <c>');
}

function parseArgs(argv) {
  const out = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      usage();
      process.exit(0);
    } else if (a.startsWith('--sessions=')) {
      out.push(...a.slice('--sessions='.length).split(',').filter(Boolean));
    } else {
      out.push(a);
    }
  }
  return out;
}

function runCoverage(sessions) {
  const arg = `--sessions=${sessions.map((s) => resolve(s)).join(',')}`;
  const proc = spawnSync('bash', ['scripts/run-session-parity-coverage.sh', arg], {
    stdio: 'ignore',
    encoding: 'utf8',
  });
  if (proc.status !== 0) {
    throw new Error(`coverage run failed for ${sessions.length} session(s)`);
  }
  const summary = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'));
  return {
    linesCovered: summary.total.lines.covered,
    linesTotal: summary.total.lines.total,
    linesPct: summary.total.lines.pct,
    branchesCovered: summary.total.branches.covered,
    branchesTotal: summary.total.branches.total,
    branchesPct: summary.total.branches.pct,
    functionsCovered: summary.total.functions.covered,
    functionsTotal: summary.total.functions.total,
    functionsPct: summary.total.functions.pct,
  };
}

function formatDelta(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function main() {
  const sessions = parseArgs(process.argv);
  if (sessions.length < 2) {
    usage();
    process.exit(1);
  }
  const baseline = runCoverage(sessions);
  const rows = [];
  for (const session of sessions) {
    const subset = sessions.filter((s) => s !== session);
    const minus = runCoverage(subset);
    rows.push({
      session,
      lines: baseline.linesCovered - minus.linesCovered,
      branches: baseline.branchesCovered - minus.branchesCovered,
      functions: baseline.functionsCovered - minus.functionsCovered,
    });
  }
  rows.sort((a, b) => (b.lines + b.branches + b.functions) - (a.lines + a.branches + a.functions));

  console.log(`Baseline (${sessions.length} sessions): lines=${baseline.linesCovered}/${baseline.linesTotal} (${baseline.linesPct}%), branches=${baseline.branchesCovered}/${baseline.branchesTotal} (${baseline.branchesPct}%), functions=${baseline.functionsCovered}/${baseline.functionsTotal} (${baseline.functionsPct}%)`);
  console.log('');
  console.log('Marginal contribution by session (drop-one):');
  for (const row of rows) {
    console.log(
      `${basename(row.session)}\tlines=${formatDelta(row.lines)}\tbranches=${formatDelta(row.branches)}\tfunctions=${formatDelta(row.functions)}`,
    );
  }
}

main();
