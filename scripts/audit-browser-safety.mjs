#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const jsRoot = path.join(repoRoot, 'js');

const FILE_SKIP_RE = /\.(backup|bak)$/i;
const NODE_IMPORT_RE = /\bfrom\s+['"](fs|path|child_process|os|worker_threads|net|tls|dgram)['"]/;
const REQUIRE_RE = /\brequire\s*\(/;
const PROCESS_ENV_RE = /\bprocess\.env\b/;
const PROCESS_DOT_RE = /\bprocess\.[A-Za-z_]/;
const PROCESS_OPTIONAL_RE = /\bprocess\?\./;
const TYPEOF_PROCESS_GUARD_RE = /typeof\s+process\s*[!=]==?\s*['"]undefined['"]/;

function isCommentLine(line) {
    const t = line.trim();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/');
}

function hasNearbyProcessGuard(lines, idx) {
    for (let i = idx; i >= Math.max(0, idx - 12); i--) {
        const line = lines[i];
        if (TYPEOF_PROCESS_GUARD_RE.test(line)) return true;
    }
    return false;
}

async function listJsFiles(dir) {
    const out = [];
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of ents) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            out.push(...await listJsFiles(full));
        } else if (ent.isFile() && ent.name.endsWith('.js') && !FILE_SKIP_RE.test(ent.name)) {
            out.push(full);
        }
    }
    return out;
}

function rel(p) {
    return path.relative(repoRoot, p).replaceAll(path.sep, '/');
}

async function main() {
    const files = await listJsFiles(jsRoot);
    const findings = [];

    for (const file of files) {
        const src = await fs.readFile(file, 'utf8');
        const lines = src.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (isCommentLine(line)) continue;

            if (NODE_IMPORT_RE.test(line)) {
                findings.push({
                    type: 'node-import',
                    file: rel(file),
                    line: i + 1,
                    text: line.trim(),
                });
            }

            if (REQUIRE_RE.test(line)) {
                findings.push({
                    type: 'require-call',
                    file: rel(file),
                    line: i + 1,
                    text: line.trim(),
                });
            }

            if (PROCESS_ENV_RE.test(line)) {
                const guarded = hasNearbyProcessGuard(lines, i);
                const optional = PROCESS_OPTIONAL_RE.test(line);
                if (!guarded && !optional) {
                    findings.push({
                        type: 'unguarded-process-env',
                        file: rel(file),
                        line: i + 1,
                        text: line.trim(),
                    });
                }
                continue;
            }

            if (PROCESS_DOT_RE.test(line) && !PROCESS_OPTIONAL_RE.test(line)) {
                if (!hasNearbyProcessGuard(lines, i)) {
                    findings.push({
                        type: 'unguarded-process',
                        file: rel(file),
                        line: i + 1,
                        text: line.trim(),
                    });
                }
            }
        }
    }

    if (findings.length === 0) {
        console.log('browser-safety audit: clean');
        return;
    }

    console.log(`browser-safety audit: ${findings.length} finding(s)`);
    for (const f of findings) {
        console.log(`${f.type}: ${f.file}:${f.line}  ${f.text}`);
    }
    process.exitCode = 1;
}

await main();
