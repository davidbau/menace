#!/usr/bin/env node
// Enforce compact session filename policy.
// Rule: for new/renamed files, keep "<name>.session.json" <= 40 chars.

import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
let maxLen = 40;
const roots = [];

for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--max' && i + 1 < args.length) {
        maxLen = Number(args[++i]);
        continue;
    }
    roots.push(a);
}

if (!Number.isInteger(maxLen) || maxLen < 1) {
    console.error(`Invalid --max value: ${maxLen}`);
    process.exit(2);
}

function gitChangedPaths() {
    try {
        const out = execSync('git ls-files --modified --others --exclude-standard', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        });
        return out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
        return [];
    }
}

const scanRoots = roots.length ? roots : gitChangedPaths();

function* walk(dir) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = resolve(dir, ent.name);
        if (ent.isDirectory()) {
            yield* walk(p);
            continue;
        }
        if (ent.isFile() && ent.name.endsWith('.session.json')) {
            yield p;
        }
    }
}

const offenders = [];
for (const root of scanRoots) {
    let st = null;
    try {
        st = statSync(root);
    } catch {
        continue;
    }
    if (st.isFile()) {
        const name = root.split('/').at(-1) || root;
        if (name.endsWith('.session.json') && name.length > maxLen) {
            offenders.push({ len: name.length, path: root });
        }
        continue;
    }
    for (const p of walk(root)) {
        const name = p.split('/').at(-1) || p;
        if (name.length > maxLen) offenders.push({ len: name.length, path: p });
    }
}

if (!roots.length && !offenders.length) {
    console.log('OK: no changed session filenames exceed length policy.');
    process.exit(0);
}

if (!offenders.length) {
    console.log(`OK: no session filenames exceed ${maxLen} chars.`);
    process.exit(0);
}

offenders.sort((a, b) => b.len - a.len || a.path.localeCompare(b.path));
console.error(`Found ${offenders.length} session filename(s) longer than ${maxLen}:`);
for (const o of offenders) {
    console.error(`  ${o.len}: ${o.path}`);
}
process.exit(1);
