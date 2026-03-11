#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseCompactMapdump } from '../test/comparison/session_loader.js';

function usage() {
    // eslint-disable-next-line no-console
    console.error(
        'Usage: node scripts/checkpoint_feature_scan.mjs <session.json> [checkpoint-id] [--top N]\n'
        + 'Example: node scripts/checkpoint_feature_scan.mjs tmp/theme01-preflight/theme01_seed541_preflight.session.json'
    );
}

function getArg(name, fallback = null) {
    const idx = process.argv.indexOf(name);
    if (idx < 0) return fallback;
    return process.argv[idx + 1] ?? fallback;
}

function parseIntSafe(v, fallback) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
}

function main() {
    const sessionPath = process.argv[2];
    if (!sessionPath || sessionPath.startsWith('-')) {
        usage();
        process.exit(2);
    }
    const checkpointId = process.argv[3] && !process.argv[3].startsWith('-')
        ? process.argv[3]
        : null;
    const topN = parseIntSafe(getArg('--top', '12'), 12);

    const raw = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const checkpoints = raw?.checkpoints;
    if (!checkpoints || typeof checkpoints !== 'object' || Array.isArray(checkpoints)) {
        // eslint-disable-next-line no-console
        console.error('No compact top-level checkpoints found in session.');
        process.exit(1);
    }
    const ids = Object.keys(checkpoints);
    if (!ids.length) {
        // eslint-disable-next-line no-console
        console.error('Session checkpoints object is empty.');
        process.exit(1);
    }
    const chosen = checkpointId || ids[0];
    if (!Object.hasOwn(checkpoints, chosen)) {
        // eslint-disable-next-line no-console
        console.error(`Checkpoint id not found: ${chosen}`);
        // eslint-disable-next-line no-console
        console.error(`Available: ${ids.join(', ')}`);
        process.exit(1);
    }

    const parsed = parseCompactMapdump(checkpoints[chosen]);
    const typ = parsed?.typGrid;
    if (!Array.isArray(typ) || !typ.length) {
        // eslint-disable-next-line no-console
        console.error('Checkpoint has no typGrid.');
        process.exit(1);
    }

    const counts = new Map();
    const coords = new Map();
    for (let y = 0; y < typ.length; y++) {
        const row = typ[y];
        if (!Array.isArray(row)) continue;
        for (let x = 0; x < row.length; x++) {
            const v = row[x];
            counts.set(v, (counts.get(v) || 0) + 1);
            if (!coords.has(v)) coords.set(v, []);
            const arr = coords.get(v);
            if (arr.length < 24) arr.push([x + 1, y + 1]); // 1-based dungeon coords
        }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    // eslint-disable-next-line no-console
    console.log(`Session: ${path.resolve(sessionPath)}`);
    // eslint-disable-next-line no-console
    console.log(`Checkpoint: ${chosen}`);
    if (Array.isArray(parsed?.hero) && parsed.hero.length >= 2) {
        // U section is compact hero payload; first fields are usually x,y.
        // Some captures store zero placeholders here; print anchor as backup.
        // eslint-disable-next-line no-console
        console.log(`Hero(U): x=${parsed.hero[0]} y=${parsed.hero[1]}`);
    }
    if (Array.isArray(parsed?.anchor) && parsed.anchor.length >= 2) {
        // eslint-disable-next-line no-console
        console.log(`Anchor(A): x=${parsed.anchor[0]} y=${parsed.anchor[1]}`);
    }
    // eslint-disable-next-line no-console
    console.log(`Unique typ values: ${sorted.length}`);
    // eslint-disable-next-line no-console
    console.log('Top typ values by count:');
    for (const [v, c] of sorted.slice(0, topN)) {
        const sample = (coords.get(v) || []).slice(0, 8).map(([x, y]) => `${x},${y}`).join(' ');
        // eslint-disable-next-line no-console
        console.log(`  typ=${v} count=${c} sample=${sample}`);
    }
}

main();
