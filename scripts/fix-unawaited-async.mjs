#!/usr/bin/env node
/**
 * fix-unawaited-async.mjs — AST-based auto-fix for un-awaited async calls.
 *
 * For each violation:
 * 1. Add `await` before the call in the source text
 * 2. Find the enclosing function using AST and make it async if not already
 * 3. Iterate until no more violations cascade
 *
 * Suppressions: queueRepeatExtcmd, map, putstr, _runAutosave
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const SUPPRESS = new Set(['queueRepeatExtcmd', 'map', 'putstr', '_runAutosave']);
const MAX_ITERATIONS = 30;

function getViolations() {
    try {
        const output = execSync('node scripts/check-unawaited-async.mjs --json 2>&1', {
            encoding: 'utf8', maxBuffer: 10_000_000
        });
        return JSON.parse(output).filter(v => !SUPPRESS.has(v.fn));
    } catch (e) {
        try { return JSON.parse(e.stdout || '[]').filter(v => !SUPPRESS.has(v.fn)); }
        catch { return []; }
    }
}

// Find the enclosing function node for a given line number using AST
function findEnclosingFunction(ast, targetLine) {
    let result = null;
    walk.ancestor(ast, {
        FunctionDeclaration(node, ancestors) {
            if (node.loc.start.line <= targetLine && node.loc.end.line >= targetLine) {
                if (!result || node.loc.start.line > result.loc.start.line) result = node;
            }
        },
        FunctionExpression(node, ancestors) {
            if (node.loc.start.line <= targetLine && node.loc.end.line >= targetLine) {
                if (!result || node.loc.start.line > result.loc.start.line) result = node;
            }
        },
        ArrowFunctionExpression(node, ancestors) {
            if (node.loc.start.line <= targetLine && node.loc.end.line >= targetLine) {
                if (!result || node.loc.start.line > result.loc.start.line) result = node;
            }
        },
    });
    return result;
}

for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const violations = getViolations();
    if (violations.length === 0) {
        console.log(`✓ All clear after ${iter} iterations.`);
        break;
    }

    console.log(`\nIteration ${iter + 1}: ${violations.length} violations`);

    // Group by file
    const byFile = new Map();
    for (const v of violations) {
        if (!byFile.has(v.file)) byFile.set(v.file, []);
        byFile.get(v.file).push(v);
    }

    let awaitCount = 0;
    let asyncCount = 0;

    for (const [file, vs] of byFile) {
        let src = readFileSync(file, 'utf8');
        let lines = src.split('\n');

        // Parse AST for enclosing function detection
        let ast;
        try {
            ast = acorn.parse(src, {
                ecmaVersion: 2025, sourceType: 'module',
                allowAwaitOutsideFunction: true, locations: true,
            });
        } catch {
            console.error(`  Skip ${file}: parse error`);
            continue;
        }

        // Process violations from bottom to top (preserve line numbers)
        const sorted = [...vs].sort((a, b) => b.line - a.line);
        const asyncifiedLines = new Set(); // track lines we already made async

        for (const v of sorted) {
            const lineIdx = v.line - 1;
            const line = lines[lineIdx];
            if (!line) continue;

            // Add await
            const fnCall = v.fn + '(';
            const idx = line.indexOf(fnCall);
            if (idx < 0) continue;
            const before = line.substring(0, idx);
            if (before.trimEnd().endsWith('await')) continue;

            lines[lineIdx] = line.substring(0, idx) + 'await ' + line.substring(idx);
            awaitCount++;

            // Find enclosing function and make it async if needed
            const enclosing = findEnclosingFunction(ast, v.line);
            if (enclosing && !enclosing.async && !asyncifiedLines.has(enclosing.loc.start.line)) {
                const fnLineIdx = enclosing.loc.start.line - 1;
                const fnLine = lines[fnLineIdx];
                // Insert 'async ' before 'function' keyword
                const funcIdx = fnLine.indexOf('function');
                if (funcIdx >= 0 && !fnLine.substring(0, funcIdx).includes('async')) {
                    lines[fnLineIdx] = fnLine.substring(0, funcIdx) + 'async ' + fnLine.substring(funcIdx);
                    asyncifiedLines.add(enclosing.loc.start.line);
                    asyncCount++;
                }
                // Handle arrow functions: (args) => { ... } → async (args) => { ... }
                if (funcIdx < 0 && enclosing.type === 'ArrowFunctionExpression') {
                    const arrowLine = lines[fnLineIdx];
                    // Find the start of the arrow function params
                    const arrowStart = enclosing.loc.start.column;
                    if (!arrowLine.substring(0, arrowStart + 6).includes('async')) {
                        lines[fnLineIdx] = arrowLine.substring(0, arrowStart) + 'async ' + arrowLine.substring(arrowStart);
                        asyncifiedLines.add(enclosing.loc.start.line);
                        asyncCount++;
                    }
                }
            }
        }

        const newSrc = lines.join('\n');
        if (newSrc !== src) {
            writeFileSync(file, newSrc);
        }
    }

    console.log(`  Added ${awaitCount} awaits, made ${asyncCount} functions async`);

    // Verify syntax
    let broken = 0;
    for (const file of byFile.keys()) {
        try {
            execSync(`node -c ${file} 2>&1`, { encoding: 'utf8' });
        } catch {
            broken++;
        }
    }
    if (broken > 0) {
        console.log(`  ⚠ ${broken} files have syntax errors — need manual review`);
    }
}

// Final report
const remaining = getViolations();
console.log(`\nFinal: ${remaining.length} violations remaining (suppressed: ${[...SUPPRESS].join(', ')})`);
if (remaining.length > 0) {
    const fns = new Set(remaining.map(v => v.fn));
    console.log(`Functions: ${[...fns].join(', ')}`);
}
