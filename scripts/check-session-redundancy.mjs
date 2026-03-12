#!/usr/bin/env node
/**
 * Session redundancy audit.
 *
 * Flags:
 * - exact duplicate files (byte-identical content) => always error
 * - duplicate key streams (same key sequence) => error unless intentionally allowlisted
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';

const REPO_ROOT = process.cwd();
const SESSIONS_ROOT = join(REPO_ROOT, 'test', 'comparison', 'sessions');

const ALLOWED_KEY_DUP_GROUPS = new Set([
    [
        'seed301_verbose_on.session.json',
        'seed302_verbose_off.session.json',
    ].sort().join('|'),
    [
        'seed303_DECgraphics_off.session.json',
        'seed304_DECgraphics_on.session.json',
        'seed305_time_on.session.json',
        'seed306_time_off.session.json',
    ].sort().join('|'),
]);

function walkSessions(dir) {
    const out = [];
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) {
            out.push(...walkSessions(p));
        } else if (ent.isFile() && ent.name.endsWith('.session.json')) {
            out.push(p);
        }
    }
    return out;
}

function hashString(s) {
    return createHash('sha1').update(s).digest('hex');
}

function keySequenceHash(jsonText) {
    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return null;
    }
    const steps = Array.isArray(parsed?.steps) ? parsed.steps : [];
    const keys = steps.map((s) => (s && Object.prototype.hasOwnProperty.call(s, 'key') ? s.key : null));
    return hashString(JSON.stringify(keys));
}

const files = walkSessions(SESSIONS_ROOT);
const byContent = new Map();
const byKeys = new Map();

for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const contentHash = hashString(text);
    const keyHash = keySequenceHash(text);

    if (!byContent.has(contentHash)) byContent.set(contentHash, []);
    byContent.get(contentHash).push(file);

    if (keyHash) {
        if (!byKeys.has(keyHash)) byKeys.set(keyHash, []);
        byKeys.get(keyHash).push(file);
    }
}

const exactDupGroups = [...byContent.values()].filter((g) => g.length > 1);
const keyDupGroups = [...byKeys.values()].filter((g) => g.length > 1);

let hasError = false;

if (exactDupGroups.length > 0) {
    hasError = true;
    console.error(`Exact duplicate session groups: ${exactDupGroups.length}`);
    for (const group of exactDupGroups) {
        console.error('  -');
        for (const f of group.sort()) {
            console.error(`    ${relative(REPO_ROOT, f)}`);
        }
    }
} else {
    console.log('Exact duplicate sessions: none');
}

const unexpectedKeyDupGroups = [];
const allowedKeyDupGroups = [];
for (const group of keyDupGroups) {
    const baseKey = group.map((f) => basename(f)).sort().join('|');
    if (ALLOWED_KEY_DUP_GROUPS.has(baseKey)) {
        allowedKeyDupGroups.push(group);
    } else {
        unexpectedKeyDupGroups.push(group);
    }
}

if (allowedKeyDupGroups.length > 0) {
    console.log(`Intentional key-duplicate groups: ${allowedKeyDupGroups.length}`);
    for (const group of allowedKeyDupGroups) {
        console.log('  -');
        for (const f of group.sort()) {
            console.log(`    ${relative(REPO_ROOT, f)}`);
        }
    }
}

if (unexpectedKeyDupGroups.length > 0) {
    hasError = true;
    console.error(`Unexpected key-duplicate groups: ${unexpectedKeyDupGroups.length}`);
    for (const group of unexpectedKeyDupGroups) {
        const sizes = group.map((f) => {
            try {
                return statSync(f).size;
            } catch {
                return -1;
            }
        });
        console.error(`  - group size=${group.length} fileSizes=${sizes.join(',')}`);
        for (const f of group.sort()) {
            console.error(`    ${relative(REPO_ROOT, f)}`);
        }
    }
} else {
    console.log('Unexpected key-duplicate sessions: none');
}

if (hasError) {
    process.exit(1);
}

console.log(`Session redundancy audit passed (${files.length} sessions).`);

