#!/usr/bin/env node
/**
 * cursor_diff.mjs — Compare cursor positions between C session and JS replay.
 *
 * Usage:
 *   node scripts/debug/cursor_diff.mjs <session.json> [--limit N]
 *
 * Uses raw session steps (no normalizeSession) aligned 1:1 with replay steps
 * to avoid the index-shift bug that normalizeSession introduces.
 */

import { readFileSync } from 'fs';
import { prepareReplayArgs } from '../../js/replay_compare.js';
import { replaySession } from '../../js/replay_core.js';

const sessionPath = process.argv[2];
if (!sessionPath) {
    console.error('Usage: node scripts/debug/cursor_diff.mjs <session.json> [--limit N]');
    process.exit(1);
}
const limitIdx = process.argv.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : Infinity;

const raw = JSON.parse(readFileSync(sessionPath, 'utf8'));
const { seed, opts, keys } = prepareReplayArgs(raw.seed, raw, { captureScreens: true });
const result = await replaySession(seed, opts, keys);

// raw.steps[i] aligns with result.steps[i] (both have step 0 = startup)
const count = Math.min(raw.steps.length, result.steps.length);

const diffs = [];
for (let i = 1; i < count; i++) {
    const cCur = raw.steps[i].cursor;
    const jsCur = result.steps[i]?.cursor;
    if (!cCur || !jsCur) continue;
    const [cx, cy] = cCur;
    const [jx, jy] = jsCur;
    if (cx !== jx || cy !== jy) {
        const cScreen = typeof raw.steps[i]?.screen === 'string'
            ? raw.steps[i].screen.split('\n') : [];
        const row0 = (cScreen[0] || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').substring(0, 70);
        diffs.push({
            step: i,
            key: raw.steps[i].key,
            cx, cy, jx, jy,
            dx: jx - cx, dy: jy - cy,
            row0,
        });
    }
}

// Group by delta
const byDelta = {};
for (const d of diffs) {
    const k = `${d.dx},${d.dy}`;
    if (!byDelta[k]) byDelta[k] = [];
    byDelta[k].push(d);
}

console.log(`Cursor mismatches: ${diffs.length} / ${count - 1} steps\n`);

const sorted = Object.entries(byDelta).sort((a, b) => b[1].length - a[1].length);
for (const [delta, items] of sorted) {
    const keys = [...new Set(items.map(i => JSON.stringify(i.key)))].join(', ');
    console.log(`delta=(${delta}): ${items.length} cases, keys: ${keys}`);
    const show = items.slice(0, Math.min(items.length, limit));
    for (const d of show) {
        console.log(`  step ${d.step} key=${JSON.stringify(d.key)} C=(${d.cx},${d.cy}) JS=(${d.jx},${d.jy}) row0: ${d.row0.substring(0, 55)}`);
    }
    if (items.length > show.length) console.log(`  ... +${items.length - show.length} more`);
}
