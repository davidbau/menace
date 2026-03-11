#!/usr/bin/env node
/**
 * Inject run metadata into coverage/index.html for parity-session coverage.
 *
 * Usage:
 *   node scripts/annotate-session-parity-coverage.mjs [coverageDir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const coverageDir = process.argv[2] || 'coverage';
const indexPath = path.join(coverageDir, 'index.html');
const jsIndexPath = path.join(coverageDir, 'js', 'index.html');
const levelsIndexPath = path.join(coverageDir, 'js', 'levels', 'index.html');

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
}

if (!fs.existsSync(indexPath)) {
  console.error(`annotate-session-parity-coverage: missing ${indexPath}`);
  process.exit(1);
}

const commit = sh('git rev-parse HEAD');
const shortCommit = sh('git rev-parse --short HEAD');
const branch = sh('git rev-parse --abbrev-ref HEAD');
const dirty = sh('git status --porcelain').length > 0 ? 'dirty' : 'clean';
const generatedAt = new Date().toISOString();
const localGeneratedAt = new Date().toString();

const metadataHtml =
  `<div class="quiet" id="parity-coverage-meta">` +
  `Parity-session coverage run: ${generatedAt} (${localGeneratedAt})` +
  ` | commit <code>${shortCommit}</code> (${commit})` +
  ` | branch <code>${branch}</code>` +
  ` | tree <code>${dirty}</code>` +
  `</div>`;

let html = fs.readFileSync(indexPath, 'utf8');

// Remove any previous injection to keep output stable across reruns.
html = html.replace(/\n?\s*<div class="quiet" id="parity-coverage-meta">[\s\S]*?<\/div>/g, '');

if (html.includes('<h1>All files</h1>')) {
  html = html.replace('<h1>All files</h1>', `<h1>All files</h1>\n        ${metadataHtml}`);
} else {
  html = html.replace(
    /<div class='pad1'>/,
    `<div class='pad1'>\n        ${metadataHtml}`
  );
}

function extractSection(markup, tag) {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'i');
  const m = markup.match(re);
  return m ? m[0] : null;
}

function extractTbody(markup) {
  const m = markup.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  return m ? m[1] : null;
}

function rewriteRowHrefs(rows, prefix) {
  return rows.replace(/href="([^"]+)"/g, (_m, href) => `href="${prefix}${href}"`);
}

if (fs.existsSync(jsIndexPath) && fs.existsSync(levelsIndexPath)) {
  const jsHtml = fs.readFileSync(jsIndexPath, 'utf8');
  const levelsHtml = fs.readFileSync(levelsIndexPath, 'utf8');

  const rootThead = extractSection(html, 'thead');
  const jsRows = extractTbody(jsHtml);
  const levelsRows = extractTbody(levelsHtml);

  if (rootThead && jsRows && levelsRows) {
    const rootBodyReplacement = [
      '<h2 class="quiet">js</h2>',
      '<table class="coverage-summary">',
      rootThead,
      `<tbody>${rewriteRowHrefs(jsRows, 'js/')}</tbody>`,
      '</table>',
      '',
      '<h2 class="quiet">js/levels</h2>',
      '<table class="coverage-summary">',
      rootThead,
      `<tbody>${rewriteRowHrefs(levelsRows, 'js/levels/')}</tbody>`,
      '</table>',
    ].join('\n');

    html = html.replace(
      /<table class="coverage-summary">[\s\S]*?<\/table>/i,
      rootBodyReplacement
    );
  }
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Annotated coverage metadata in ${indexPath}`);
