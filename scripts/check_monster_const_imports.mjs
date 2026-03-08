#!/usr/bin/env node
// Check who imports monster-domain constants (AD_*, AT_*, S_*, M1/2/3_*, G_*, MZ_*, MS_*, WT_*)
// from const.js vs monsters.js

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const jsDir = join(import.meta.dirname, '..', 'js');
const files = readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();

// Collect monster-domain constants exported from monsters.js
const monsContent = readFileSync(join(jsDir, 'monsters.js'), 'utf8');
const monsExports = new Set();
const prefixPattern = /^(AD_|AT_|S_|M[123]_|G_|MZ_|MS_|WT_|PM_)/;
// Skip CLR_ per user request (those belong in const.js)
for (const m of monsContent.matchAll(/export\s+const\s+([A-Z][A-Z0-9_]*)\s*=/g)) {
    if (prefixPattern.test(m[1])) monsExports.add(m[1]);
}

// Scan all js files for imports of these from const.js
const fromConst = new Map();   // name -> Set<file>
const fromMonsters = new Map(); // name -> Set<file>

for (const file of files) {
    if (file === 'const.js' || file === 'monsters.js') continue;
    const content = readFileSync(join(jsDir, file), 'utf8');

    // Parse imports from const.js
    for (const im of content.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/const\.js'/gs)) {
        for (const token of im[1].matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
            const name = token[1];
            if (monsExports.has(name)) {
                if (!fromConst.has(name)) fromConst.set(name, new Set());
                fromConst.get(name).add(file);
            }
        }
    }

    // Parse imports from monsters.js
    for (const im of content.matchAll(/import\s*\{([^}]+)\}\s*from\s*'\.\/monsters\.js'/gs)) {
        for (const token of im[1].matchAll(/\b([A-Z][A-Z0-9_]*)\b/g)) {
            const name = token[1];
            if (monsExports.has(name)) {
                if (!fromMonsters.has(name)) fromMonsters.set(name, new Set());
                fromMonsters.get(name).add(file);
            }
        }
    }
}

// Group by prefix
function groupByPrefix(map) {
    const groups = new Map();
    for (const [name, fileSet] of map) {
        const prefix = name.match(/^[A-Z]+[0-9]?/)?.[0] || name;
        if (!groups.has(prefix)) groups.set(prefix, { names: new Set(), files: new Set() });
        const g = groups.get(prefix);
        g.names.add(name);
        for (const f of fileSet) g.files.add(f);
    }
    return groups;
}

console.log('=== Monster-domain constants imported from CONST.JS (would need import update) ===\n');
const constGroups = groupByPrefix(fromConst);
let totalConstNames = 0;
let totalConstFiles = new Set();
for (const [prefix, g] of [...constGroups].sort((a, b) => b[1].names.size - a[1].names.size)) {
    console.log(`  ${prefix}_*: ${g.names.size} constants, ${g.files.size} files`);
    console.log(`    files: ${[...g.files].sort().join(', ')}`);
    totalConstNames += g.names.size;
    for (const f of g.files) totalConstFiles.add(f);
}
console.log(`\n  TOTAL: ${totalConstNames} constant imports from const.js across ${totalConstFiles.size} files\n`);

console.log('=== Monster-domain constants imported from MONSTERS.JS (already correct) ===\n');
const monsGroups = groupByPrefix(fromMonsters);
let totalMonsNames = 0;
let totalMonsFiles = new Set();
for (const [prefix, g] of [...monsGroups].sort((a, b) => b[1].names.size - a[1].names.size)) {
    console.log(`  ${prefix}_*: ${g.names.size} constants, ${g.files.size} files`);
    totalMonsNames += g.names.size;
    for (const f of g.files) totalMonsFiles.add(f);
}
console.log(`\n  TOTAL: ${totalMonsNames} constant imports from monsters.js across ${totalMonsFiles.size} files\n`);

// Which files import the SAME constant from BOTH?
console.log('=== Files importing same constant from BOTH const.js AND monsters.js ===\n');
let bothCount = 0;
for (const [name, constFiles] of fromConst) {
    const monsFiles = fromMonsters.get(name);
    if (!monsFiles) continue;
    for (const f of constFiles) {
        if (monsFiles.has(f)) {
            console.log(`  ${f}: ${name} from both`);
            bothCount++;
        }
    }
}
if (bothCount === 0) console.log('  (none)');
