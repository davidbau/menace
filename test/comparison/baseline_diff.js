#!/usr/bin/env node
// test/comparison/baseline_diff.js -- Capture and diff session runner results
//
// Phase 0 guardrail: compare old vs new runner results during migration.
//
// Usage:
//   node baseline_diff.js capture [filename]    # Capture current results to file
//   node baseline_diff.js diff [old] [new]      # Compare two captured results
//   node baseline_diff.js check                  # Compare against baseline
//
// The captured format includes session runner results plus metadata.

import { spawn, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASELINE_FILE = join(__dirname, 'baseline_results.json');
const SCHEMA_VERSION = 2;

function getMetadata() {
    let commit = 'unknown';
    let branch = 'unknown';
    try {
        commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (e) {
        // ignore git errors
    }
    return {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        commit,
        branch,
        nodeVersion: process.version,
        platform: `${os.platform()}/${os.arch()}`,
    };
}

async function runSessionRunner() {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const child = spawn('node', [join(__dirname, 'session_test_runner.js')], {
            cwd: join(__dirname, '../..'),
            stdio: ['inherit', 'pipe', 'inherit'],
        });

        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            const durationMs = Date.now() - startTime;
            // Extract JSON from output
            const marker = '__RESULTS_JSON__';
            const idx = output.indexOf(marker);
            if (idx === -1) {
                reject(new Error('No __RESULTS_JSON__ marker found in output'));
                return;
            }
            const jsonStr = output.slice(idx + marker.length).trim();
            try {
                const results = JSON.parse(jsonStr);
                results.durationMs = durationMs;
                resolve(results);
            } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
        });

        child.on('error', reject);
    });
}

function computeByType(results) {
    const byType = {};
    for (const r of results) {
        const type = r.type || 'other';
        if (!byType[type]) {
            byType[type] = { total: 0, passed: 0, failed: 0 };
        }
        byType[type].total++;
        if (r.passed) {
            byType[type].passed++;
        } else {
            byType[type].failed++;
        }
    }
    return byType;
}

function getFailingSamples(results, limit = 20) {
    return results
        .filter(r => !r.passed)
        .slice(0, limit)
        .map(r => ({
            session: r.session,
            type: r.type || 'other',
            firstDivergence: r.firstDivergence || null,
            error: r.error || null,
        }));
}

function summarizeResults(bundle) {
    const bySession = {};
    const results = bundle.results || [];
    for (const r of results) {
        bySession[r.session] = {
            passed: r.passed,
            type: r.type || 'other',
            seed: r.seed,
            duration: r.duration,
            error: r.error || null,
        };
    }
    // Handle both old format (bundle.summary) and new format (bundle.session.summary)
    const summary = bundle.session?.summary || bundle.summary || { total: 0, passed: 0, failed: 0 };
    return {
        timestamp: bundle.generatedAt || bundle.timestamp,
        commit: bundle.commit,
        summary,
        byType: bundle.session?.byType || computeByType(results),
        bySession,
    };
}

function diffResults(oldBundle, newBundle) {
    const oldSummary = summarizeResults(oldBundle);
    const newSummary = summarizeResults(newBundle);

    const diffs = {
        summaryChanges: {},
        sessionChanges: [],
        newSessions: [],
        removedSessions: [],
    };

    // Compare summary counts
    for (const key of ['total', 'passed', 'failed']) {
        if (oldSummary.summary[key] !== newSummary.summary[key]) {
            diffs.summaryChanges[key] = {
                old: oldSummary.summary[key],
                new: newSummary.summary[key],
            };
        }
    }

    // Compare individual sessions
    const oldSessions = new Set(Object.keys(oldSummary.bySession));
    const newSessions = new Set(Object.keys(newSummary.bySession));

    for (const session of oldSessions) {
        if (!newSessions.has(session)) {
            diffs.removedSessions.push(session);
        } else if (oldSummary.bySession[session].passed !== newSummary.bySession[session].passed) {
            diffs.sessionChanges.push({
                session,
                oldPassed: oldSummary.bySession[session].passed,
                newPassed: newSummary.bySession[session].passed,
            });
        }
    }

    for (const session of newSessions) {
        if (!oldSessions.has(session)) {
            diffs.newSessions.push(session);
        }
    }

    return diffs;
}

function formatDiff(diffs) {
    const lines = [];

    if (Object.keys(diffs.summaryChanges).length > 0) {
        lines.push('Summary changes:');
        for (const [key, change] of Object.entries(diffs.summaryChanges)) {
            const delta = change.new - change.old;
            const sign = delta > 0 ? '+' : '';
            lines.push(`  ${key}: ${change.old} -> ${change.new} (${sign}${delta})`);
        }
    }

    if (diffs.sessionChanges.length > 0) {
        lines.push('\nSession status changes:');
        for (const change of diffs.sessionChanges) {
            const status = change.newPassed ? 'FIXED' : 'REGRESSED';
            lines.push(`  [${status}] ${change.session}`);
        }
    }

    if (diffs.newSessions.length > 0) {
        lines.push(`\nNew sessions (${diffs.newSessions.length}):`);
        for (const session of diffs.newSessions) {
            lines.push(`  + ${session}`);
        }
    }

    if (diffs.removedSessions.length > 0) {
        lines.push(`\nRemoved sessions (${diffs.removedSessions.length}):`);
        for (const session of diffs.removedSessions) {
            lines.push(`  - ${session}`);
        }
    }

    if (lines.length === 0) {
        lines.push('No differences found.');
    }

    return lines.join('\n');
}

async function captureCommand(filename) {
    const outFile = filename || BASELINE_FILE;
    console.log('Running session tests...');
    const rawResults = await runSessionRunner();

    // Build enhanced baseline format
    const baseline = {
        ...getMetadata(),
        session: {
            durationMs: rawResults.durationMs,
            summary: rawResults.summary,
            byType: computeByType(rawResults.results),
            failingSamples: getFailingSamples(rawResults.results),
        },
        // Keep full results for detailed diffing
        results: rawResults.results,
    };

    writeFileSync(outFile, JSON.stringify(baseline, null, 2));
    console.log(`Captured ${baseline.session.summary.total} results to ${outFile}`);
    console.log(`  Passed: ${baseline.session.summary.passed}`);
    console.log(`  Failed: ${baseline.session.summary.failed}`);
    console.log(`  Duration: ${baseline.session.durationMs}ms`);
    console.log('\nBy type:');
    for (const [type, counts] of Object.entries(baseline.session.byType)) {
        console.log(`  ${type}: ${counts.passed}/${counts.total} passed`);
    }
}

async function diffCommand(oldFile, newFile) {
    if (!existsSync(oldFile)) {
        console.error(`Old file not found: ${oldFile}`);
        process.exit(1);
    }
    if (!existsSync(newFile)) {
        console.error(`New file not found: ${newFile}`);
        process.exit(1);
    }

    const oldBundle = JSON.parse(readFileSync(oldFile, 'utf-8'));
    const newBundle = JSON.parse(readFileSync(newFile, 'utf-8'));

    console.log(`Comparing:`);
    console.log(`  Old: ${oldFile} (${oldBundle.timestamp})`);
    console.log(`  New: ${newFile} (${newBundle.timestamp})`);
    console.log();

    const diffs = diffResults(oldBundle, newBundle);
    console.log(formatDiff(diffs));

    // Exit with error if regressions found
    const regressions = diffs.sessionChanges.filter(c => !c.newPassed);
    if (regressions.length > 0) {
        process.exit(1);
    }
}

async function checkCommand() {
    if (!existsSync(BASELINE_FILE)) {
        console.error(`Baseline file not found: ${BASELINE_FILE}`);
        console.error('Run "node baseline_diff.js capture" first.');
        process.exit(1);
    }

    console.log('Running session tests...');
    const rawResults = await runSessionRunner();
    // Wrap raw results in new format for comparison
    const newBundle = {
        ...getMetadata(),
        session: {
            durationMs: rawResults.durationMs,
            summary: rawResults.summary,
            byType: computeByType(rawResults.results),
        },
        results: rawResults.results,
    };

    const oldBundle = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));

    const timestamp = oldBundle.generatedAt || oldBundle.timestamp;
    console.log(`\nComparing against baseline (${timestamp}):`);
    const diffs = diffResults(oldBundle, newBundle);
    console.log(formatDiff(diffs));

    // Exit with error if regressions found
    const regressions = diffs.sessionChanges.filter(c => !c.newPassed);
    if (regressions.length > 0) {
        console.error(`\n${regressions.length} regression(s) detected!`);
        process.exit(1);
    }
}

// CLI
const [,, command, ...args] = process.argv;

switch (command) {
    case 'capture':
        captureCommand(args[0]).catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    case 'diff':
        if (args.length < 2) {
            console.error('Usage: baseline_diff.js diff <old-file> <new-file>');
            process.exit(1);
        }
        diffCommand(args[0], args[1]).catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    case 'check':
        checkCommand().catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    default:
        console.log('Usage:');
        console.log('  node baseline_diff.js capture [filename]  - Capture current results');
        console.log('  node baseline_diff.js diff <old> <new>    - Compare two result files');
        console.log('  node baseline_diff.js check               - Check against baseline');
        process.exit(1);
}
