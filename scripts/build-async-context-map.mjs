#!/usr/bin/env node
/**
 * build-async-context-map.mjs — Build a context map classifying functions
 * as "sync-context" (levelgen/init) vs "async-context" (gameplay).
 *
 * Approach:
 * 1. Parse all js/*.js files, collect function declarations and call sites
 * 2. Build a call graph (caller → callees)
 * 3. BFS from levelgen roots → mark as "sync" context
 * 4. BFS from gameplay roots → mark as "async" context
 * 5. Functions in both → "dual" (need await from gameplay, sync() from levelgen)
 * 6. Output the map as JSON
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const ROOT = process.cwd();
const JS_DIR = join(ROOT, 'js');
const files = readdirSync(JS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => ({ name: `js/${f}`, path: join(JS_DIR, f) }));

// ── Phase 1: Parse all files, collect functions and calls ─────────────

// Map: "file:functionName" → { async, file, line, callees: Set<name> }
const functions = new Map();
// Map: functionName → Set<"file:functionName"> (handle same name in different files)
const byName = new Map();

for (const file of files) {
    let src;
    try { src = readFileSync(file.path, 'utf8'); } catch { continue; }
    let ast;
    try {
        ast = acorn.parse(src, {
            ecmaVersion: 2025, sourceType: 'module',
            allowAwaitOutsideFunction: true, locations: true,
        });
    } catch { continue; }

    // Collect function declarations
    const fileFunctions = new Map(); // name → node
    walk.simple(ast, {
        FunctionDeclaration(node) {
            if (node.id?.name) {
                const key = `${file.name}:${node.id.name}`;
                fileFunctions.set(node.id.name, node);
                functions.set(key, {
                    name: node.id.name,
                    async: node.async,
                    file: file.name,
                    line: node.loc.start.line,
                    callees: new Set(),
                });
                if (!byName.has(node.id.name)) byName.set(node.id.name, new Set());
                byName.get(node.id.name).add(key);
            }
        },
    });

    // Collect calls within each function
    walk.ancestor(ast, {
        CallExpression(node, ancestors) {
            let calleeName = null;
            if (node.callee.type === 'Identifier') {
                calleeName = node.callee.name;
            } else if (node.callee.type === 'MemberExpression' && node.callee.property?.type === 'Identifier') {
                calleeName = node.callee.property.name;
            }
            if (!calleeName) return;

            // Find enclosing function
            for (let i = ancestors.length - 2; i >= 0; i--) {
                const anc = ancestors[i];
                if (anc.type === 'FunctionDeclaration' && anc.id?.name) {
                    const key = `${file.name}:${anc.id.name}`;
                    if (functions.has(key)) {
                        functions.get(key).callees.add(calleeName);
                    }
                    break;
                }
            }
        },
    });
}

// ── Phase 2: BFS from entry points ───────────────────────────────────

const LEVELGEN_ROOTS = [
    'mklev', 'makelevel', 'fill_ordinary_room', 'makecorridors',
    'mineralize', 'mkroom', 'simulatePostLevelInit', 'initFirstLevel',
    'fill_room', 'makerooms', 'mklev_init', 'sp_level_setup',
    'load_special', 'lspo_finalize_level',
];

const GAMEPLAY_ROOTS = [
    'rhack', 'moveloop_core', 'domove_core', 'movemon', 'mattacku',
    'dog_move', 'dochug', 'hmon', 'hitmu', 'run_command',
    'finalizeTimedCommand', 'advanceTimedTurn',
];

function bfs(roots, label) {
    const visited = new Set();
    const queue = [];

    // Seed with all functions matching root names
    for (const root of roots) {
        const fns = byName.get(root);
        if (fns) {
            for (const key of fns) {
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(key);
                }
            }
        }
    }

    // BFS through call graph
    while (queue.length > 0) {
        const key = queue.shift();
        const fn = functions.get(key);
        if (!fn) continue;

        for (const calleeName of fn.callees) {
            const callees = byName.get(calleeName);
            if (!callees) continue;
            for (const calleeKey of callees) {
                if (!visited.has(calleeKey)) {
                    visited.add(calleeKey);
                    queue.push(calleeKey);
                }
            }
        }
    }

    return visited;
}

const levelgenFunctions = bfs(LEVELGEN_ROOTS, 'levelgen');
const gameplayFunctions = bfs(GAMEPLAY_ROOTS, 'gameplay');

// ── Phase 3: Classify ─────────────────────────────────────────────────

const contextMap = {};
const stats = { syncOnly: 0, asyncOnly: 0, dual: 0, neither: 0 };

for (const [key, fn] of functions) {
    const inLevelgen = levelgenFunctions.has(key);
    const inGameplay = gameplayFunctions.has(key);

    let context;
    if (inLevelgen && inGameplay) { context = 'dual'; stats.dual++; }
    else if (inLevelgen) { context = 'sync'; stats.syncOnly++; }
    else if (inGameplay) { context = 'async'; stats.asyncOnly++; }
    else { context = 'neither'; stats.neither++; }

    contextMap[fn.name] = contextMap[fn.name] || [];
    contextMap[fn.name].push({
        file: fn.file,
        line: fn.line,
        async: fn.async,
        context,
    });
}

// ── Phase 4: Report ──────────────────────────────────────────────────

console.log(`Context map: ${functions.size} functions analyzed`);
console.log(`  Sync-only (levelgen): ${stats.syncOnly}`);
console.log(`  Async-only (gameplay): ${stats.asyncOnly}`);
console.log(`  Dual (both contexts): ${stats.dual}`);
console.log(`  Neither: ${stats.neither}`);

// Show dual-context functions (the interesting ones)
console.log(`\nDual-context functions (need await in gameplay, sync() in levelgen):`);
const dualFns = new Map();
for (const [name, entries] of Object.entries(contextMap)) {
    for (const e of entries) {
        if (e.context === 'dual') {
            if (!dualFns.has(name)) dualFns.set(name, []);
            dualFns.get(name).push(e);
        }
    }
}
for (const [name, entries] of [...dualFns.entries()].sort()) {
    const asyncMark = entries.some(e => e.async) ? ' [async]' : '';
    console.log(`  ${name}${asyncMark} — ${entries.map(e => `${e.file}:${e.line}`).join(', ')}`);
}

// Show async functions called from sync context (violations)
console.log(`\nAsync functions called ONLY from sync context (should use sync()):`);
for (const [name, entries] of Object.entries(contextMap)) {
    for (const e of entries) {
        if (e.context === 'sync' && e.async) {
            console.log(`  ${name} — ${e.file}:${e.line}`);
        }
    }
}

// Write JSON output
const outputPath = join(ROOT, 'scripts', 'async-context-map.json');
writeFileSync(outputPath, JSON.stringify({
    stats,
    levelgenRoots: LEVELGEN_ROOTS,
    gameplayRoots: GAMEPLAY_ROOTS,
    dualContext: Object.fromEntries(dualFns),
    functions: contextMap,
}, null, 2));
console.log(`\nWritten to: ${outputPath}`);
