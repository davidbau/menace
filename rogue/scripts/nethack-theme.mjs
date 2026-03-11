#!/usr/bin/env node
/**
 * nethack-theme.mjs — Post-processes Istanbul HTML coverage reports
 * to apply a NetHack-style dark terminal theme with witty messages.
 *
 * Usage: node nethack-theme.mjs <coverage-dir>
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const FORTUNES = {
  perfect: [
    "The light of Tyr shines upon thy code.  All paths are illuminated!",
    "You have achieved the Amulet of Coverage!  A voice booms: WELL DONE!",
    "You feel a sudden sense of enlightenment.",
    "The wizard nods approvingly.  Even the Oracle is surprised.",
    "Congratulations!  Your coverage is so complete that Izchak stocks extra candles.",
  ],
  excellent: [
    "You sense a few hidden corridors you have not yet explored.",
    "A small voice whispers: thou art close to perfection, but a few dark rooms remain.",
    "You feel mostly enlightened.  The Oracle peers at you with mild approval.",
    "You are surrounded by a shimmering aura.  Some code lurks just beyond the light.",
    "The Wizard of Yendor: 'Impressive.  But your quest is not yet complete.'",
  ],
  good: [
    "You hear the sound of uncovered branches in the distance.",
    "You feel unprepared for the deeper dungeons of logic.",
    "Beware the unlit passages ahead.  Many code paths remain in shadow.",
    "You are fairly well-equipped.  Some dark rooms lurk in the coverage map.",
    "The Oracle says: thou hast covered much ground, but the dungeon goes deeper.",
  ],
  mediocre: [
    "You are surrounded by untested code.  It is very dangerous!",
    "The Wizard of Yendor laughs at your coverage.  Ha ha ha!",
    "A ghost of uncovered functions haunts this dungeon!",
    "You sense that many paths remain in shadow.  You feel worried.",
    "You hear a voice: 'More tests!  The dungeon demands more tests!'",
  ],
  poor: [
    "You begin to panic.  Untested branches lurk around every corner!",
    "The gnome lord cackles: 'Your functions remain untested!  Bwahaha!'",
    "You are in great danger.  Coverage is perilously low.",
    "The troll of uncovered code bars your path!",
    "Suddenly a trap door opens beneath your confidence.",
  ],
  dire: [
    "You die...  --More--",
    "You were killed by insufficient coverage.\n     Do you want your possessions identified?",
    "The Dungeon of Yendor claims another victim.  Killed by an uncovered branch.",
    "You die of a lack of test coverage.  The dungeon master is not surprised.",
    "You are dead.  The Oracle remarks: 'I could have told you this would happen.'",
  ],
};

function fortuneFor(pct) {
  const tier = pct >= 100 ? 'perfect'
             : pct >= 90  ? 'excellent'
             : pct >= 80  ? 'good'
             : pct >= 70  ? 'mediocre'
             : pct >= 60  ? 'poor'
             :              'dire';
  const msgs = FORTUNES[tier];
  // deterministic pick based on pct for reproducibility
  return msgs[Math.floor(pct * 137) % msgs.length];
}

function extractOverallPct(html) {
  // First <span class="strong">XX.XX% </span> is Statements
  const m = html.match(/<span class="strong">([\d.]+)%\s*<\/span>/);
  return m ? parseFloat(m[1]) : 50;
}

function extractFilePct(html) {
  // In per-file pages, look for the Statements % in the header summary
  const m = html.match(/<span class="strong">([\d.]+)%\s*<\/span>/);
  return m ? parseFloat(m[1]) : 50;
}

function cssLink(depth) {
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  return `<link rel="stylesheet" href="${prefix}nethack.css" />`;
}

function fortuneBox(msg, pct) {
  const tier = pct >= 100 ? 'perfect'
             : pct >= 90  ? 'excellent'
             : pct >= 80  ? 'good'
             : pct >= 70  ? 'mediocre'
             : pct >= 60  ? 'poor'
             :              'dire';
  return `<div class="nh-fortune nh-${tier}"><span class="nh-bracket">[</span> ${msg} <span class="nh-bracket">]</span></div>`;
}

function themeHtml(html, depth = 0, gameName = null) {
  const pct = depth === 0 ? extractOverallPct(html) : extractFilePct(html);
  const msg = fortuneFor(pct);
  const link = cssLink(depth);
  const box = fortuneBox(msg, pct);

  // Inject CSS after base.css link
  html = html.replace(
    /(<link rel="stylesheet" href="[^"]*base\.css"[^>]*\/>)/,
    `$1\n    ${link}`
  );

  // Inject fortune after the stats clearfix div, before the keyboard hint p
  html = html.replace(
    /(<\/div>\s*<p class="quiet">)/,
    `$1\n        ${box}\n        `
  );

  // Retitle the page with Rogue/NetHack flavor
  html = html.replace(
    /<title>Code coverage report for (.*?)<\/title>/,
    '<title>Coverage Oracle: $1</title>'
  );

  // Replace "All files" with game name in title and h1
  if (gameName) {
    html = html.replace(
      /<title>Coverage Oracle: All files<\/title>/,
      `<title>Coverage Oracle: ${gameName} — Parity Session Coverage</title>`
    );
    html = html.replace(
      /<h1>All files<\/h1>/,
      `<h1>${gameName} — Parity Session Coverage</h1>`
    );
  }

  // Footer: replace generic Istanbul credit with something witty
  html = html.replace(
    /Code coverage generated by\s*<a href="https:\/\/istanbul\.js\.org\/"[^>]*>istanbul<\/a>/,
    'Coverage divined by the Oracle of Istanbul'
  );

  return html;
}

// Main
const args = process.argv.slice(2);
const gameIdx = args.indexOf('--game');
const gameName = gameIdx >= 0 ? args[gameIdx + 1] : null;
const dir = args.find(a => !a.startsWith('--') && a !== (gameName ?? ''));
if (!dir) {
  console.error('Usage: node nethack-theme.mjs <coverage-dir> [--game GameName]');
  process.exit(1);
}

const files = readdirSync(dir).filter(f => f.endsWith('.html'));
let count = 0;
for (const f of files) {
  const path = join(dir, f);
  const original = readFileSync(path, 'utf8');
  const depth = 0; // all files in same directory
  const themed = themeHtml(original, depth, gameName);
  if (themed !== original) {
    writeFileSync(path, themed, 'utf8');
    count++;
  }
}
console.log(`Themed ${count}/${files.length} HTML files in ${dir}`);
