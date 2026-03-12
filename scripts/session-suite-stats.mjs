#!/usr/bin/env node
/**
 * Session suite inventory and cost report.
 *
 * Outputs:
 * - total session count
 * - total recorded steps
 * - count/steps by top-level session subdirectory
 * - shortest and longest sessions
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SESSIONS_DIR = join(ROOT, 'test', 'comparison', 'sessions');

function walk(dir) {
    const out = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) out.push(...walk(p));
        else if (ent.isFile() && ent.name.endsWith('.session.json')) out.push(p);
    }
    return out;
}

function stepCount(file) {
    try {
        const parsed = JSON.parse(readFileSync(file, 'utf8'));
        if (Array.isArray(parsed?.steps)) return parsed.steps.length;
        if (Array.isArray(parsed?.turns)) return parsed.turns.length;
        return 0;
    } catch {
        return 0;
    }
}

const files = walk(SESSIONS_DIR);
const rows = files.map((f) => {
    const rel = relative(ROOT, f);
    const parts = rel.split('/');
    // test/comparison/sessions/<bucket>/...
    const bucket = parts.length >= 5 ? parts[4] : '(root)';
    return { file: rel, bucket, steps: stepCount(f) };
});

const totalSteps = rows.reduce((a, r) => a + r.steps, 0);
const byBucket = new Map();
for (const r of rows) {
    if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, { count: 0, steps: 0 });
    const b = byBucket.get(r.bucket);
    b.count++;
    b.steps += r.steps;
}

const sortedByStepsAsc = [...rows].sort((a, b) => (a.steps - b.steps) || a.file.localeCompare(b.file));
const sortedByStepsDesc = [...rows].sort((a, b) => (b.steps - a.steps) || a.file.localeCompare(b.file));
const buckets = [...byBucket.entries()].sort((a, b) => b[1].steps - a[1].steps);

console.log(`Sessions: ${rows.length}`);
console.log(`Total steps: ${totalSteps}`);
console.log('');
console.log('By bucket (sorted by total steps):');
for (const [bucket, data] of buckets) {
    const avg = data.count > 0 ? (data.steps / data.count).toFixed(1) : '0.0';
    console.log(`  ${bucket.padEnd(26)} count=${String(data.count).padStart(3)} steps=${String(data.steps).padStart(6)} avg=${avg}`);
}

console.log('');
console.log('Top 10 longest sessions:');
for (const r of sortedByStepsDesc.slice(0, 10)) {
    console.log(`  ${String(r.steps).padStart(4)}  ${r.file}`);
}

console.log('');
console.log('Top 10 shortest sessions:');
for (const r of sortedByStepsAsc.slice(0, 10)) {
    console.log(`  ${String(r.steps).padStart(4)}  ${r.file}`);
}
