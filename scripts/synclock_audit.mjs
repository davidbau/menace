#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const JS_DIR = join(ROOT, 'js');
const strict = process.argv.includes('--strict');

function walk(dir) {
  const out = [];
  for (const ent of readdirSync(dir)) {
    const p = join(dir, ent);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

function findMatches(file, re) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) hits.push({ line: i + 1, text: lines[i].trim() });
  }
  return hits;
}

const files = walk(JS_DIR);
const checks = [
  {
    key: 'raw_await_nhgetch',
    re: /\bawait\s+nhgetch\s*\(/,
    note: 'direct input wait (consider awaitInput wrapper in command-loop-critical paths)',
  },
  {
    key: 'raw_settimeout0_await',
    re: /\bawait\s+new\s+Promise\s*\(\s*r\s*=>\s*setTimeout\s*\(\s*r\s*,\s*0\s*\)\s*\)/,
    note: 'frame-yield wait (consider awaitAnim wrapper)',
  },
  {
    key: 'display_moreprompt_nhgetch',
    re: /\.morePrompt\s*\(\s*nhgetch\s*\)/,
    note: 'direct more-prompt wait via nhgetch callback',
  },
];

const report = {};
for (const c of checks) report[c.key] = { total: 0, files: [] };

for (const file of files) {
  for (const c of checks) {
    const hits = findMatches(file, c.re);
    if (hits.length) {
      report[c.key].total += hits.length;
      report[c.key].files.push({
        file: relative(ROOT, file),
        count: hits.length,
        hits,
      });
    }
  }
}

const now = new Date().toISOString();
console.log(`SYNCLOCK hygiene audit @ ${now}`);
console.log('');
for (const c of checks) {
  const r = report[c.key];
  console.log(`${c.key}: ${r.total}`);
  console.log(`  ${c.note}`);
  for (const f of r.files.sort((a, b) => a.file.localeCompare(b.file))) {
    console.log(`  - ${f.file} (${f.count})`);
  }
  console.log('');
}

const allmainRaw = (report.raw_await_nhgetch.files.find(f => f.file === 'js/allmain.js')?.count || 0)
  + (report.raw_settimeout0_await.files.find(f => f.file === 'js/allmain.js')?.count || 0);

if (allmainRaw === 0) {
  console.log('allmain.js core-loop guardrail status: CLEAN');
} else {
  console.log(`allmain.js core-loop guardrail status: RAW_WAITS_PRESENT (${allmainRaw})`);
}

if (strict) {
  const totalFindings = checks.reduce((sum, c) => sum + (report[c.key]?.total || 0), 0);
  if (totalFindings > 0) {
    console.error(`SYNCLOCK strict audit failed: ${totalFindings} finding(s).`);
    process.exitCode = 1;
  } else {
    console.log('SYNCLOCK strict audit status: PASS');
  }
}
