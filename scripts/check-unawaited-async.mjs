#!/usr/bin/env node
/**
 * check-unawaited-async.mjs — Import-resolving AST-based static analysis
 * to find calls to async functions that are not awaited.
 *
 * Phase 1: Parse all JS files, collect async function declarations and their
 *          source modules.
 * Phase 2: Parse import statements in each file, resolve which imported
 *          names are async by tracing through the import graph.
 * Phase 3: Walk AST of each file. For each CallExpression, check if the
 *          callee resolves to a known-async function. If so, verify it's
 *          inside an AwaitExpression or other valid context.
 *
 * This eliminates Array.map/filter false positives since those are never
 * imported from our modules as async functions.
 *
 * Usage:
 *   node scripts/check-unawaited-async.mjs [--verbose] [--json] [dir...]
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

// ─── Phase 1: Collect all async declarations per source file ──────────

// Map: absolute file path → Set of async export names
const asyncExports = new Map();
// Map: absolute file path → Set of locally-defined async function names (not exported)
const asyncLocals = new Map();
// Map: absolute file path → Map of re-exports: { exportedName → { source, importedName } }
const reExports = new Map();

function resolveModulePath(importPath, fromFile) {
    // Resolve relative import to absolute path
    if (!importPath.startsWith('.')) return null; // skip bare specifiers (npm packages)
    let resolved = resolve(dirname(fromFile), importPath);
    // Try with .js extension if not present
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
        // export async function foo() {}
        ExportNamedDeclaration(node) {
            if (node.declaration) {
                if (node.declaration.type === 'FunctionDeclaration' && node.declaration.async) {
                    const name = node.declaration.id?.name;
                    if (name) exports.add(name);
                }
                // export const foo = async () => {}
                if (node.declaration.type === 'VariableDeclaration') {
                    for (const decl of node.declaration.declarations) {
                        if (decl.init?.async && decl.id?.name) {
                            exports.add(decl.id.name);
                        }
                    }
                }
            }
            // export { foo } from './bar.js' — re-export
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
        // export default async function() {} — rare but possible
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
                // If also exported, already in exports set
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

// Resolve re-exports: if file A re-exports foo from file B, and B's foo is async,
// then A's foo is async too.
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

// ─── Phase 2+3: For each file, resolve imports and find un-awaited calls ──

const violations = [];

for (const file of files) {
    const parsed = parseFile(file.path);
    if (!parsed) continue;
    const { ast, src } = parsed;
    const lines = src.split('\n');

    // Build map: local name → is-async for this file
    // Start with locally-defined async functions
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

    // Walk AST to find un-awaited calls
    walk.ancestor(ast, {
        CallExpression(node, ancestors) {
            let fnName = null;

            // Direct call: foo()
            if (node.callee.type === 'Identifier') {
                fnName = node.callee.name;
            }
            // Method call: obj.foo() — check if foo is async
            // Only for: display.putstr_message(), display.renderStatus(), etc.
            else if (node.callee.type === 'MemberExpression' && node.callee.property?.type === 'Identifier') {
                fnName = node.callee.property.name;
                // For member calls, only flag if the method name is in our async set
                // This handles display.putstr_message() but not array.map()
            }
            // Optional chain: foo?.()
            else if (node.callee.type === 'ChainExpression') {
                const inner = node.callee.expression;
                if (inner?.type === 'MemberExpression' && inner.property?.type === 'Identifier') {
                    fnName = inner.property.name;
                }
            }

            if (!fnName || !asyncNames.has(fnName)) return;

            // Check ancestor chain for valid contexts
            const parent = ancestors[ancestors.length - 2];

            // ✓ await foo()
            if (parent?.type === 'AwaitExpression') return;

            // ✓ return foo()
            if (parent?.type === 'ReturnStatement') return;

            // ✓ const x = foo()
            if (parent?.type === 'VariableDeclarator') return;

            // ✓ x = foo()
            if (parent?.type === 'AssignmentExpression' && parent.right === node) return;

            // ✓ foo().then(...)  — already chained
            const gp = ancestors[ancestors.length - 3];
            if (parent?.type === 'MemberExpression' && parent.object === node) return;

            // ✓ [foo(), bar()] — likely Promise.all
            if (parent?.type === 'ArrayExpression') return;

            // ✓ condition ? foo() : bar()
            if (parent?.type === 'ConditionalExpression') return;

            // ✓ foo() || bar()
            if (parent?.type === 'LogicalExpression') return;

            // ✓ void foo() — intentional fire-and-forget (flag as warning)
            if (parent?.type === 'UnaryExpression' && parent.operator === 'void') return;

            // ✓ fn(foo()) — passed as argument to another function
            // (the receiving function is responsible for the Promise)
            if (parent?.type === 'CallExpression' && parent.callee !== node) return;

            // ✓ async arrow: () => foo() — implicit return
            if (parent?.type === 'ArrowFunctionExpression' && parent.body === node) return;

            // ✓ Property value in object literal: { key: foo() }
            if (parent?.type === 'Property' && parent.value === node) return;

            // ✓ Sequence expression: (a, foo()) — last value returned
            if (parent?.type === 'SequenceExpression') return;

            // ✓ Template literal expression: `${foo()}`
            if (parent?.type === 'TemplateLiteral') return;

            violations.push({
                file: file.name,
                line: node.loc.start.line,
                col: node.loc.start.column + 1,
                fn: fnName,
                text: (lines[node.loc.start.line - 1] || '').trim().substring(0, 90),
            });
        },
    });
}

// ─── Report ────────────────────────────────────────────────────────────

if (jsonOutput) {
    console.log(JSON.stringify(violations, null, 2));
    process.exit(violations.length > 0 ? 1 : 0);
}

if (violations.length === 0) {
    console.log(`✓ No un-awaited async calls found across ${files.length} files (${[...asyncExports.values()].reduce((s, e) => s + e.size, 0)} async exports tracked).`);
    process.exit(0);
}

// Group by file
const byFile = new Map();
for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
}

console.log(`\n${violations.length} un-awaited async calls in ${byFile.size} files:\n`);
for (const [file, vs] of [...byFile.entries()].sort()) {
    console.log(`  ${file}:`);
    for (const v of vs) {
        console.log(`    L${v.line}:${v.col}  ${v.fn}()  — ${v.text}`);
    }
}

console.log(`\n✗ ${violations.length} violations found.`);
process.exit(1);
