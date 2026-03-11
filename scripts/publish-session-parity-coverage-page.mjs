#!/usr/bin/env node
import fs from 'node:fs';

const summaryPath = 'coverage/coverage-summary.json';
const indexPath = 'coverage/index.html';

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  fail(`Missing ${summaryPath}. Run coverage first.`);
}

const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const total = raw && raw.total;
if (!total || !total.lines || !total.branches || !total.functions || !total.statements) {
  fail(`Invalid coverage summary: ${summaryPath}`);
}

const now = new Date().toISOString();
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mazes of Menace Coverage</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 2rem; color: #111; }
    h1 { margin: 0 0 0.5rem 0; }
    p { margin: 0.25rem 0 1rem 0; }
    table { border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body>
  <h1>C-Parity Session Coverage</h1>
  <p>Coverage computed from deterministic C-parity session replay only.</p>
  <p class="mono">Updated: ${now}</p>
  <table>
    <thead>
      <tr><th>Metric</th><th>Covered</th><th>Total</th><th>Percent</th></tr>
    </thead>
    <tbody>
      <tr><td>Lines</td><td>${total.lines.covered}</td><td>${total.lines.total}</td><td>${total.lines.pct}%</td></tr>
      <tr><td>Statements</td><td>${total.statements.covered}</td><td>${total.statements.total}</td><td>${total.statements.pct}%</td></tr>
      <tr><td>Functions</td><td>${total.functions.covered}</td><td>${total.functions.total}</td><td>${total.functions.pct}%</td></tr>
      <tr><td>Branches</td><td>${total.branches.covered}</td><td>${total.branches.total}</td><td>${total.branches.pct}%</td></tr>
    </tbody>
  </table>
  <p>Raw summary: <a href="coverage-summary.json">coverage-summary.json</a></p>
  <p>Coverage process doc: <a href="/docs/COVERAGE.md">docs/COVERAGE.md</a></p>
</body>
</html>
`;

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Wrote ${indexPath}`);
