#!/usr/bin/env node
/**
 * check-unawaited-async.mjs — Import-resolving AST-based static analysis
 * to find async/await issues in the codebase.
 *
 * Two checks:
 * 1. Un-awaited calls: calls to known-async functions that are not awaited,
 *    returned, assigned, or otherwise handled.
 * 2. Needlessly-async functions: functions declared async that never use await
 *    in their own body (not counting nested functions). These are a bug magnet:
 *    callers get Promises where they expect values.
 *
 * Phase 1: Parse all JS files, collect async function declarations and their
 *          source modules.
 * Phase 2: Parse import statements in each file, resolve which imported
 *          names are async by tracing through the import graph.
 * Phase 3: Walk AST of each file:
 *          (a) Find un-awaited calls to async functions.
 *          (b) Find async functions whose body contains no await.
 *
 * Usage:
 *   node scripts/check-unawaited-async.mjs [--verbose] [--json] [dir...]
 *
 * Exit code: 0 if clean, 1 if violations found.
 * Intended for CI gating (npm run lint:async or pre-commit hook).
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const jsonOutput = args.includes('--json');
const dirs = args.filter(a => !a.startsWith('--'));
if (dirs.length === 0) dirs.push('js');

const ROOT = process.cwd();

// ─── Suppression lists ──────────────────────────────────────────────────
// Known-intentional un-awaited async patterns.
// Format: function name → reason (for documentation).
const SUPPRESSED_UNAWAITED = new Map([
    ['queueRepeatExtcmd', 'intentional: queues command for later async execution'],
    ['_runAutosave', 'intentional: fire-and-forget background save'],
    ['observeObject', 'intentional: fire-and-forget in sync display path (newsym→map_object)'],
]);

// Method names that are NEVER our async functions (builtin prototypes).
// When a call is obj.method(), if method is in this set, skip it even if
// an async function with the same name exists in our codebase.
const BUILTIN_METHOD_NAMES = new Set([
    'map', 'filter', 'find', 'findIndex', 'some', 'every', 'reduce', 'reduceRight',
    'forEach', 'flatMap', 'flat', 'sort', 'splice', 'slice', 'concat', 'join',
    'push', 'pop', 'shift', 'unshift', 'reverse', 'fill', 'copyWithin',
    'includes', 'indexOf', 'lastIndexOf', 'keys', 'values', 'entries',
    'endsWith', 'startsWith', 'match', 'matchAll', 'replace', 'replaceAll',
    'search', 'split', 'trim', 'trimStart', 'trimEnd', 'padStart', 'padEnd',
    'charAt', 'charCodeAt', 'codePointAt', 'normalize', 'repeat',
    'substring', 'slice', 'toLowerCase', 'toUpperCase', 'localeCompare',
    'toString', 'valueOf', 'toFixed', 'toPrecision', 'toExponential',
    'then', 'catch', 'finally',
    'set', 'get', 'has', 'delete', 'clear', 'add',
    'next', 'return', 'throw',
    'addEventListener', 'removeEventListener', 'dispatchEvent',
    'setAttribute', 'getAttribute', 'removeAttribute',
    'appendChild', 'removeChild', 'insertBefore', 'replaceChild',
    'querySelector', 'querySelectorAll', 'getElementById',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'assign', 'freeze', 'keys', 'values', 'entries', 'fromEntries',
    'stringify', 'parse',
]);

// display.putstr() is a sync DOM method, not our async putstr export.
// Suppress method calls named 'putstr' (the async version is putstr_message).
BUILTIN_METHOD_NAMES.add('putstr');

// ─── Phase 1: Collect all async declarations per source file ──────────

// Map: absolute file path → Set of async export names
const asyncExports = new Map();
// Map: absolute file path → Set of locally-defined async function names (not exported)
const asyncLocals = new Map();
// Map: absolute file path → Map of re-exports: { exportedName → { source, importedName } }
const reExports = new Map();

function resolveModulePath(importPath, fromFile) {
    if (!importPath.startsWith('.')) return null;
    let resolved = resolve(dirname(fromFile), importPath);
    if (!resolved.endsWith('.js') && !resolved.endsWith('.mjs')) {
        if (existsSync(resolved + '.js')) resolved += '.js';
        else if (existsSync(resolved + '.mjs')) resolved += '.mjs';
        else if (existsSync(resolved + '/index.js')) resolved += '/index.js';
    }
    return resolved;
}

function collectFiles(dirPaths) {
    const files = [];
    for (const dir of dirPaths) {
        const absDir = resolve(ROOT, dir);
        if (!existsSync(absDir)) continue;
        for (const name of readdirSync(absDir)) {
            if (name.endsWith('.js') || name.endsWith('.mjs')) {
                files.push({ name: `${dir}/${name}`, path: join(absDir, name) });
            }
        }
    }
    return files;
}

const files = collectFiles(dirs);

function parseFile(filePath) {
    let src;
    try { src = readFileSync(filePath, 'utf8'); } catch { return null; }
    try {
        return {
            src,
            ast: acorn.parse(src, {
                ecmaVersion: 2025,
                sourceType: 'module',
                allowAwaitOutsideFunction: true,
                locations: true,
            }),
        };
    } catch (e) {
        if (verbose) console.error(`  Parse error: ${filePath}: ${e.message}`);
        return null;
    }
}

// First pass: collect async exports and re-exports
for (const file of files) {
    const parsed = parseFile(file.path);
    if (!parsed) continue;
    const { ast } = parsed;

    const exports = new Set();
    const locals = new Set();
    const reExs = new Map();

    walk.simple(ast, {
        ExportNamedDeclaration(node) {
            if (node.declaration) {
                if (node.declaration.type === 'FunctionDeclaration' && node.declaration.async) {
                    const name = node.declaration.id?.name;
                    if (name) exports.add(name);
                }
                if (node.declaration.type === 'VariableDeclaration') {
                    for (const decl of node.declaration.declarations) {
                        if (decl.init?.async && decl.id?.name) {
                            exports.add(decl.id.name);
                        }
                    }
                }
            }
            if (node.source && node.specifiers) {
                const sourcePath = resolveModulePath(node.source.value, file.path);
                for (const spec of node.specifiers) {
                    const exportedName = spec.exported?.name;
                    const importedName = spec.local?.name;
                    if (exportedName && importedName && sourcePath) {
                        reExs.set(exportedName, { source: sourcePath, importedName });
                    }
                }
            }
        },
        ExportDefaultDeclaration(node) {
            if (node.declaration?.async) {
                exports.add('default');
            }
        },
    });

    // Also collect non-exported async functions (local to file)
    walk.simple(ast, {
        FunctionDeclaration(node) {
            if (node.async && node.id?.name) {
                locals.add(node.id.name);
            }
        },
        VariableDeclarator(node) {
            if (node.init?.async && node.id?.name) {
                locals.add(node.id.name);
            }
        },
    });

    asyncExports.set(file.path, exports);
    asyncLocals.set(file.path, locals);
    reExports.set(file.path, reExs);
}

// Resolve re-exports transitively
function isAsyncExport(filePath, name, visited = new Set()) {
    if (visited.has(`${filePath}:${name}`)) return false;
    visited.add(`${filePath}:${name}`);
    const exports = asyncExports.get(filePath);
    if (exports?.has(name)) return true;
    const reExs = reExports.get(filePath);
    const re = reExs?.get(name);
    if (re) return isAsyncExport(re.source, re.importedName, visited);
    return false;
}

if (verbose) {
    let total = 0;
    for (const [, exps] of asyncExports) total += exps.size;
    console.log(`Phase 1: ${total} async exports across ${files.length} files`);
}

// ─── Phase 2+3: Check each file ────────────────────────────────────────

const unawaitedViolations = [];
const needlesslyAsyncViolations = [];

for (const file of files) {
    const parsed = parseFile(file.path);
    if (!parsed) continue;
    const { ast, src } = parsed;
    const lines = src.split('\n');

    // Build map: local name → is-async for this file
    const asyncNames = new Set(asyncLocals.get(file.path) || []);

    // Add imported names that resolve to async exports
    walk.simple(ast, {
        ImportDeclaration(node) {
            const sourcePath = resolveModulePath(node.source?.value, file.path);
            if (!sourcePath) return;
            for (const spec of node.specifiers) {
                const localName = spec.local?.name;
                const importedName = spec.imported?.name || spec.local?.name;
                if (localName && importedName && isAsyncExport(sourcePath, importedName)) {
                    asyncNames.add(localName);
                }
            }
        },
    });

    // ─── Check 1: Un-awaited async calls ────────────────────────────
    walk.ancestor(ast, {
        CallExpression(node, ancestors) {
            let fnName = null;
            let isMethodCall = false;

            // Direct call: foo()
            if (node.callee.type === 'Identifier') {
                fnName = node.callee.name;
            }
            // Method call: obj.foo()
            else if (node.callee.type === 'MemberExpression' && node.callee.property?.type === 'Identifier') {
                fnName = node.callee.property.name;
                isMethodCall = true;
            }
            // Optional chain: foo?.()
            else if (node.callee.type === 'ChainExpression') {
                const inner = node.callee.expression;
                if (inner?.type === 'MemberExpression' && inner.property?.type === 'Identifier') {
                    fnName = inner.property.name;
                    isMethodCall = true;
                }
            }

            if (!fnName || !asyncNames.has(fnName)) return;

            // Skip builtin method names on object instances
            if (isMethodCall && BUILTIN_METHOD_NAMES.has(fnName)) return;

            // Skip suppressed patterns
            if (SUPPRESSED_UNAWAITED.has(fnName)) return;

            // Check ancestor chain for valid contexts
            const parent = ancestors[ancestors.length - 2];

            // ✓ await foo()
            if (parent?.type === 'AwaitExpression') return;

            // Find enclosing function to check if it's async
            let enclosingFnAsync = false;
            for (let i = ancestors.length - 2; i >= 0; i--) {
                const a = ancestors[i];
                if (a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression'
                    || a.type === 'ArrowFunctionExpression') {
                    enclosingFnAsync = !!a.async;
                    break;
                }
            }

            // ✓ return foo() — OK only in async function (returns Promise to caller)
            if (parent?.type === 'ReturnStatement' && enclosingFnAsync) return;
            // ✓ foo().then(...) — already chained
            if (parent?.type === 'MemberExpression' && parent.object === node) return;
            // ✓ [foo(), bar()] — likely Promise.all
            if (parent?.type === 'ArrayExpression') return;
            // ✓ condition ? await foo() : await bar() — parent is ConditionalExpression
            //   but only if the conditional itself is awaited
            if (parent?.type === 'ConditionalExpression') {
                const gp = ancestors[ancestors.length - 3];
                if (gp?.type === 'AwaitExpression') return;
                if (gp?.type === 'ReturnStatement' && enclosingFnAsync) return;
            }
            // ✓ void foo() — intentional fire-and-forget
            if (parent?.type === 'UnaryExpression' && parent.operator === 'void') return;
            // ✓ async arrow: () => foo() — implicit return (only if arrow is async)
            if (parent?.type === 'ArrowFunctionExpression' && parent.body === node && parent.async) return;
            // ✓ Template literal: `${foo()}`
            if (parent?.type === 'TemplateLiteral') return;

            unawaitedViolations.push({
                file: file.name,
                line: node.loc.start.line,
                col: node.loc.start.column + 1,
                fn: fnName,
                text: (lines[node.loc.start.line - 1] || '').trim().substring(0, 90),
                kind: 'unawaited',
            });
        },
    });

    // ─── Check 2: Needlessly-async functions ────────────────────────
    // An async function whose body contains no AwaitExpression (at its
    // own level — nested functions don't count) returns a Promise
    // wrapping a plain value. This silently breaks callers that don't
    // await, producing Promises-as-values (NaN coordinates, [object
    // Promise] messages, etc.).
    function bodyContainsAwait(body) {
        let found = false;
        walk.simple(body, {
            AwaitExpression() { found = true; },
            // Don't descend into nested functions — their awaits don't help us
            FunctionDeclaration() { /* skip children */ },
            FunctionExpression() { /* skip children */ },
            ArrowFunctionExpression() { /* skip children */ },
        }, {
            ...walk.base,
            // Override to skip nested function bodies
            FunctionDeclaration(node, st, c) { /* don't recurse */ },
            FunctionExpression(node, st, c) { /* don't recurse */ },
            ArrowFunctionExpression(node, st, c) { /* don't recurse */ },
        });
        return found;
    }

    walk.simple(ast, {
        FunctionDeclaration(node) {
            if (!node.async || !node.id?.name || !node.body) return;
            if (!bodyContainsAwait(node.body)) {
                needlesslyAsyncViolations.push({
                    file: file.name,
                    line: node.loc.start.line,
                    col: node.loc.start.column + 1,
                    fn: node.id.name,
                    text: (lines[node.loc.start.line - 1] || '').trim().substring(0, 90),
                    kind: 'needlessly-async',
                });
            }
        },
    });
}

// ─── Report ────────────────────────────────────────────────────────────

const allViolations = [...unawaitedViolations, ...needlesslyAsyncViolations];

if (jsonOutput) {
    console.log(JSON.stringify(allViolations, null, 2));
    process.exit(allViolations.length > 0 ? 1 : 0);
}

if (allViolations.length === 0) {
    const totalAsync = [...asyncExports.values()].reduce((s, e) => s + e.size, 0);
    console.log(`✓ No async violations found across ${files.length} files (${totalAsync} async exports tracked).`);
    process.exit(0);
}

function printSection(title, violations) {
    if (violations.length === 0) return;
    const byFile = new Map();
    for (const v of violations) {
        if (!byFile.has(v.file)) byFile.set(v.file, []);
        byFile.get(v.file).push(v);
    }
    console.log(`\n${title} (${violations.length} in ${byFile.size} files):\n`);
    for (const [file, vs] of [...byFile.entries()].sort()) {
        console.log(`  ${file}:`);
        for (const v of vs) {
            console.log(`    L${v.line}:${v.col}  ${v.fn}()  — ${v.text}`);
        }
    }
}

printSection('Un-awaited async calls', unawaitedViolations);
printSection('Needlessly-async functions (async but no await in body)', needlesslyAsyncViolations);

console.log(`\n✗ ${allViolations.length} violations found (${unawaitedViolations.length} unawaited, ${needlesslyAsyncViolations.length} needlessly-async).`);
process.exit(1);
