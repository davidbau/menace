#!/usr/bin/env node
// Check for duplicate exported names across all js/*.js files.
// Reports any name exported from more than one file.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const jsDir = join(import.meta.dirname, '..', 'js');
const files = readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();

// Map: exportedName -> [{ file, line }]
const allExports = new Map();

function addExport(name, file, line) {
    if (!allExports.has(name)) allExports.set(name, []);
    const list = allExports.get(name);
    if (!list.some(e => e.file === file && e.line === line)) {
        list.push({ file, line });
    }
}

for (const file of files) {
    const filepath = join(jsDir, file);
    const lines = readFileSync(filepath, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip re-exports: export { ... } from '...'
        if (/export\s*\{[^}]*\}\s*from\s/.test(line)) continue;

        // export const NAME = ... (possibly multiple: export const A = 1, B = 2)
        if (/^export\s+const\s+/.test(line)) {
            for (const m of line.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g)) {
                addExport(m[1], file, i + 1);
            }
            continue;
        }

        // export let NAME = ...
        if (/^export\s+let\s+/.test(line)) {
            for (const m of line.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g)) {
                addExport(m[1], file, i + 1);
            }
            continue;
        }

        // export var NAME = ...
        if (/^export\s+var\s+/.test(line)) {
            for (const m of line.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g)) {
                addExport(m[1], file, i + 1);
            }
            continue;
        }

        // export function NAME(...) or export async function NAME(...)
        const funcMatch = line.match(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (funcMatch) {
            addExport(funcMatch[1], file, i + 1);
            continue;
        }

        // export class NAME
        const classMatch = line.match(/^export\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (classMatch) {
            addExport(classMatch[1], file, i + 1);
            continue;
        }

        // export { NAME, NAME2, ... }  (local re-exports within same file, no 'from')
        const braceMatch = line.match(/^export\s*\{([^}]+)\}/);
        if (braceMatch && !line.includes(' from ')) {
            for (const m of braceMatch[1].matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\b(?:\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*))?/g)) {
                addExport(m[2] || m[1], file, i + 1);
            }
            continue;
        }
    }
}

// Find duplicates (exported from >1 file)
const duplicates = [];
for (const [name, locations] of allExports) {
    const uniqueFiles = new Set(locations.map(l => l.file));
    if (uniqueFiles.size > 1) {
        duplicates.push({ name, locations });
    }
}

// Report
const totalExports = allExports.size;
const totalFiles = files.length;

console.log(`Scanned ${totalFiles} files in js/, found ${totalExports} unique exported names.`);

if (duplicates.length === 0) {
    console.log('\nNo duplicates found. Every exported name comes from exactly one file.');
    process.exit(0);
} else {
    console.log(`\n${duplicates.length} name(s) exported from multiple files:\n`);
    duplicates.sort((a, b) => a.name.localeCompare(b.name));
    for (const { name, locations } of duplicates) {
        console.log(`  ${name}:`);
        for (const loc of locations) {
            console.log(`    ${loc.file}:${loc.line}`);
        }
    }
    process.exit(1);
}
