#!/usr/bin/env node
import fs from 'node:fs';

const C_PATH = 'nethack-c/patched/src/shk.c';
const JS_PATH = 'js/shk.js';

const cText = fs.readFileSync(C_PATH, 'utf8');
const jsText = fs.readFileSync(JS_PATH, 'utf8');

function extractCFunctions(text) {
    const lines = text.split('\n');
    const names = [];
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.trim().startsWith('#')) continue;
        if (line.includes(';')) continue;
        if (!line.includes('(') || line.includes('=') || line.trim().startsWith('/*')) continue;
        const next = lines[i + 1].trim();
        if (next !== '{' && !line.trim().endsWith('{')) continue;
        const m = line.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\([^\)]*\)\s*\{?\s*$/);
        if (!m) continue;
        const name = m[1];
        if (['if', 'for', 'while', 'switch', 'return', 'sizeof'].includes(name)) continue;
        if (!names.includes(name)) names.push(name);
    }
    return names;
}

function extractCDeclaredFunctions(text) {
    const out = new Set();
    const chunks = text.split(';');
    for (const chunk of chunks) {
        if (!chunk.includes('staticfn')) continue;
        if (chunk.includes('{')) continue;
        const flat = chunk.replace(/\s+/g, ' ').trim();
        // Example: "staticfn int make_itemized_bill(struct monst *shkp, Bill **ibill) NONNULLPTRS"
        const m = flat.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
        if (!m) continue;
        const name = m[1];
        if (['if', 'for', 'while', 'switch', 'return', 'sizeof'].includes(name)) continue;
        out.add(name);
    }
    return [...out];
}

function extractJsFunctions(text) {
    const set = new Set();
    for (const m of text.matchAll(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) set.add(m[1]);
    for (const m of text.matchAll(/\bexport\s+async\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) set.add(m[1]);
    for (const m of text.matchAll(/\bexport\s+function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)) set.add(m[1]);
    return set;
}

const cFuncs = extractCFunctions(cText);
const cDeclaredFuncs = extractCDeclaredFunctions(cText);
const jsFuncs = extractJsFunctions(jsText);
const missing = cFuncs.filter((n) => !jsFuncs.has(n));
const missingDeclared = cDeclaredFuncs.filter((n) => !jsFuncs.has(n));

const placeholderMatches = [...jsText.matchAll(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([\s\S]*?UNIMPLEMENTED_TRANSLATED_FUNCTION/g)];
const placeholders = [...new Set(placeholderMatches.map((m) => m[1]))];

const stubLines = jsText.split('\n')
    .map((line, idx) => ({ idx: idx + 1, line }))
    .filter(({ line }) => line.includes('Stub:') || line.includes('TODO(iron-parity)'));

console.log(`shk parity audit`);
console.log(`  c functions: ${cFuncs.length}`);
console.log(`  js functions: ${jsFuncs.size}`);
console.log(`  missing: ${missing.length}`);
for (const fn of missing) console.log(`    - ${fn}`);

console.log(`  declared staticfn in c: ${cDeclaredFuncs.length}`);
console.log(`  missing from declared staticfn set: ${missingDeclared.length}`);
for (const fn of missingDeclared) console.log(`    - ${fn}`);

console.log(`  placeholder bodies: ${placeholders.length}`);
for (const fn of placeholders) console.log(`    - ${fn}`);

console.log(`  stub/todo markers: ${stubLines.length}`);
for (const { idx, line } of stubLines.slice(0, 40)) {
    console.log(`    - ${JS_PATH}:${idx}: ${line.trim()}`);
}
if (stubLines.length > 40) {
    console.log(`    ... (${stubLines.length - 40} more)`);
}
