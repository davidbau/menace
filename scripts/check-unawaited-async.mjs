#!/usr/bin/env node
/**
 * check-unawaited-async.mjs — Static analysis: find calls to async functions
 * that are not awaited.
 *
 * Scans js/*.js for:
 *   1. All exported async functions (building a set of known-async names)
 *   2. All call sites of those functions
 *   3. Call sites where the call is NOT preceded by `await`
 *
 * This catches the exact bug pattern that violates the single-threaded
 * contract: an async function called without await, creating an orphaned
 * Promise whose continuation fires during unrelated game code.
 *
 * Usage:
 *   node scripts/check-unawaited-async.mjs [--fix-suggestions]
 *
 * Limitations:
 *   - Text-based (not AST) — may have false positives on comments/strings
 *   - Only catches direct calls by name, not calls via variables/callbacks
 *   - Doesn't track async-ness through re-exports or wrappers
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const JS_DIR = join(process.cwd(), 'js');
const files = readdirSync(JS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ name: f, path: join(JS_DIR, f) }));

// Phase 1: Collect all async function names
const asyncFunctions = new Set();

// Known async functions from the codebase (not just exports)
const KNOWN_ASYNC = new Set([
    'pline', 'vpline', 'urgent_pline', 'custompline',
    'You', 'Your', 'You_feel', 'You_cant', 'You_hear',
    'pline_The', 'Norep', 'There',
    'putstr_message', 'more', 'ynFunction', 'getlin', 'nhgetch',
    'getdir', 'getobj', 'getCount',
    'renderOverlayMenuUntilDismiss',
    'prinv', 'pickup_prinv',
    'losehp', 'showdamage',
    'mattacku', 'hmon', 'hitmu',
    'domove_core', 'rhack', 'moveloop_core',
    'movemon', 'dochug', 'dog_move',
    'goto_level', 'deferred_goto',
    'done', 'really_done',
]);

for (const file of files) {
    const src = readFileSync(file.path, 'utf8');
    // Match: export async function NAME
    // Match: async function NAME
    const re = /(?:export\s+)?async\s+function\s+(\w+)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        asyncFunctions.add(m[1]);
    }
}

// Merge known async with discovered
for (const name of KNOWN_ASYNC) asyncFunctions.add(name);

console.log(`Found ${asyncFunctions.size} async functions`);

// Phase 2: Find un-awaited calls
const violations = [];
const AWAIT_RE_CACHE = new Map();

function getCallRegex(fnName) {
    if (!AWAIT_RE_CACHE.has(fnName)) {
        // Match: fnName( but NOT preceded by await on the same line
        // and NOT preceded by "function " (definition, not call)
        AWAIT_RE_CACHE.set(fnName, new RegExp(`\\b${fnName}\\s*\\(`, 'g'));
    }
    return AWAIT_RE_CACHE.get(fnName);
}

for (const file of files) {
    const src = readFileSync(file.path, 'utf8');
    const lines = src.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        // Skip import lines
        if (trimmed.startsWith('import ')) continue;
        // Skip export declarations (function definitions, not calls)
        if (/^export\s+(async\s+)?function\s/.test(trimmed)) continue;
        if (/^async\s+function\s/.test(trimmed)) continue;
        if (/^function\s/.test(trimmed)) continue;

        for (const fnName of asyncFunctions) {
            const re = getCallRegex(fnName);
            re.lastIndex = 0;
            let match;
            while ((match = re.exec(line)) !== null) {
                const col = match.index;
                const before = line.substring(0, col);

                // Check if preceded by await
                if (/\bawait\s+$/.test(before)) continue;
                // Check if preceded by await with optional chaining
                if (/\bawait\s+\S+\?\.\s*$/.test(before)) continue;
                // Check if it's a function definition
                if (/\bfunction\s+$/.test(before)) continue;
                if (/\basync\s+function\s+$/.test(before)) continue;
                // Check if it's a method definition in a class/object
                if (/^\s*(async\s+)?$/.test(before) && lineNum > 0) continue;
                // Check if it's in a .then() callback (already chained)
                if (/\.then\s*\(\s*(async\s*)?\(?[^)]*\)?\s*=>\s*$/.test(before)) continue;
                // Check if it's being assigned to a variable (intentional)
                if (/\b(const|let|var)\s+\w+\s*=\s*(await\s+)?$/.test(before)) continue;
                // Check if it's a return value
                if (/\breturn\s+(await\s+)?$/.test(before)) continue;
                // Check if the call result is used (e.g., passed as argument)
                // This is harder to check statically — skip for now

                violations.push({
                    file: file.name,
                    line: lineNum + 1,
                    col: col + 1,
                    fn: fnName,
                    text: trimmed.substring(0, 80),
                });
            }
        }
    }
}

// Filter out likely false positives
const filtered = violations.filter(v => {
    // Skip test files
    if (v.file.includes('test')) return false;
    // Skip definitions
    if (v.text.includes('function ' + v.fn)) return false;
    // Skip imports
    if (v.text.startsWith('import')) return false;
    // Skip comments
    if (v.text.startsWith('//') || v.text.startsWith('*')) return false;
    return true;
});

if (filtered.length === 0) {
    console.log('No un-awaited async calls found.');
    process.exit(0);
}

console.log(`\n${filtered.length} potential un-awaited async calls:\n`);
for (const v of filtered) {
    console.log(`  ${v.file}:${v.line}:${v.col} — ${v.fn}()`);
    console.log(`    ${v.text}`);
}

process.exit(filtered.length > 0 ? 1 : 0);
