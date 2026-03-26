#!/usr/bin/env node
/**
 * check-unawaited-async.mjs — AST-based static analysis to find calls
 * to async functions that are not awaited.
 *
 * Uses acorn to parse ES modules and walks the AST to find CallExpression
 * nodes where the callee is a known async function and the parent is NOT
 * an AwaitExpression.
 *
 * Usage:
 *   node scripts/check-unawaited-async.mjs [--verbose] [file...]
 *
 * If no files specified, scans all js/*.js files.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const fileArgs = args.filter(a => !a.startsWith('--'));

const JS_DIR = join(process.cwd(), 'js');
const files = fileArgs.length > 0
    ? fileArgs.map(f => ({ name: relative(process.cwd(), f), path: f }))
    : readdirSync(JS_DIR).filter(f => f.endsWith('.js')).map(f => ({ name: `js/${f}`, path: join(JS_DIR, f) }));

// Phase 1: Collect all async function names from all files
const asyncFunctions = new Set();

for (const file of files) {
    let src;
    try { src = readFileSync(file.path, 'utf8'); } catch { continue; }
    let ast;
    try {
        ast = acorn.parse(src, {
            ecmaVersion: 2025,
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
        });
    } catch (e) {
        if (verbose) console.error(`Parse error in ${file.name}: ${e.message}`);
        continue;
    }

    walk.simple(ast, {
        FunctionDeclaration(node) {
            if (node.async && node.id?.name) asyncFunctions.add(node.id.name);
        },
        // Also catch: const foo = async function() {} and const foo = async () => {}
        VariableDeclarator(node) {
            if (node.init && (node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression')) {
                if (node.init.async && node.id?.name) asyncFunctions.add(node.id.name);
            }
        },
        // Method definitions: async foo() {} in classes/objects
        MethodDefinition(node) {
            if (node.value?.async && node.key?.name) asyncFunctions.add(node.key.name);
        },
        Property(node) {
            if (node.value?.async && node.key?.name) asyncFunctions.add(node.key.name);
        },
    });
}

if (verbose) console.log(`Found ${asyncFunctions.size} async functions`);

// Phase 2: Find un-awaited calls
const violations = [];

for (const file of files) {
    let src;
    try { src = readFileSync(file.path, 'utf8'); } catch { continue; }
    const lines = src.split('\n');
    let ast;
    try {
        ast = acorn.parse(src, {
            ecmaVersion: 2025,
            sourceType: 'module',
            allowAwaitOutsideFunction: true,
            locations: true,
        });
    } catch { continue; }

    // Walk with ancestor tracking to check parent nodes
    walk.ancestor(ast, {
        CallExpression(node, ancestors) {
            // Get the function name being called
            let fnName = null;
            if (node.callee.type === 'Identifier') {
                fnName = node.callee.name;
            } else if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
                fnName = node.callee.property.name;
            }

            if (!fnName || !asyncFunctions.has(fnName)) return;

            // Check if this call is awaited
            const parent = ancestors[ancestors.length - 2];
            if (parent?.type === 'AwaitExpression') return;

            // Check if it's a return value (return foo())
            if (parent?.type === 'ReturnStatement') return;

            // Check if assigned to a variable (const p = foo())
            if (parent?.type === 'VariableDeclarator') return;

            // Check if it's the init of an assignment (x = foo())
            if (parent?.type === 'AssignmentExpression' && parent.right === node) return;

            // Check if it's in a .then() chain
            const grandparent = ancestors[ancestors.length - 3];
            if (grandparent?.type === 'MemberExpression' && grandparent.property?.name === 'then') return;

            // Check if it's a void expression (intentional fire-and-forget)
            if (parent?.type === 'UnaryExpression' && parent.operator === 'void') {
                violations.push({
                    file: file.name,
                    line: node.loc.start.line,
                    col: node.loc.start.column + 1,
                    fn: fnName,
                    text: lines[node.loc.start.line - 1]?.trim().substring(0, 80) || '',
                    severity: 'warn',
                    reason: 'void suppresses Promise — intentional fire-and-forget?',
                });
                return;
            }

            // Check if it's an argument to another function (foo(bar()))
            // This is often intentional — the outer function handles the Promise
            if (parent?.type === 'CallExpression' && parent.callee !== node) return;

            // Check if it's in Promise.all/race
            if (parent?.type === 'ArrayExpression') {
                const gp = ancestors[ancestors.length - 3];
                if (gp?.type === 'CallExpression') return; // likely Promise.all([...])
            }

            // Check if it's a conditional expression value
            if (parent?.type === 'ConditionalExpression') return;
            if (parent?.type === 'LogicalExpression') return;

            violations.push({
                file: file.name,
                line: node.loc.start.line,
                col: node.loc.start.column + 1,
                fn: fnName,
                text: lines[node.loc.start.line - 1]?.trim().substring(0, 80) || '',
                severity: 'error',
                reason: 'async function called without await',
            });
        },
    });
}

// Report
const errors = violations.filter(v => v.severity === 'error');
const warnings = violations.filter(v => v.severity === 'warn');

if (errors.length > 0) {
    console.log(`\n${errors.length} un-awaited async calls (ERRORS):\n`);
    for (const v of errors) {
        console.log(`  ${v.file}:${v.line}:${v.col} — ${v.fn}()`);
        console.log(`    ${v.text}`);
    }
}

if (warnings.length > 0 && verbose) {
    console.log(`\n${warnings.length} intentional fire-and-forget (void) calls:\n`);
    for (const v of warnings) {
        console.log(`  ${v.file}:${v.line}:${v.col} — void ${v.fn}()`);
    }
}

if (errors.length === 0) {
    console.log(`\n✓ No un-awaited async calls found across ${files.length} files.`);
    process.exit(0);
} else {
    console.log(`\n✗ ${errors.length} violations found.`);
    process.exit(1);
}
