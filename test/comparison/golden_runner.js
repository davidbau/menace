#!/usr/bin/env node
// test/comparison/golden_runner.js
// Minimal-dependency test runner for golden testing and backfill
//
// Runs session tests and outputs results in standard JSON format.
// Uses v3 session format exclusively.
//
// Usage:
//   node test/comparison/golden_runner.js [--verbose] [--output results.json]

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import {
    createTestResult, recordRngResult, recordKeyResult,
    recordGridResult, recordScreenResult, finalizeResult,
    aggregateResults, formatResultSummary, formatAggregateSummary,
} from './test_result_format.js';

import {
    generateStartupWithRng, replaySession,
    getSessionStartup, getSessionCharacter, getSessionGameplaySteps,
    compareRng, compareGrids, getSessionScreenLines,
} from './session_helpers.js';

// Parse command line args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx >= 0 ? args[outputIdx + 1] : null;

// Directories to scan
const SESSIONS_DIR = join(__dirname, 'sessions');

async function main() {
    console.log('Golden Runner - Session Comparison Tests');
    console.log('=========================================');
    console.log();

    // Discover session files
    const sessionFiles = [];
    if (existsSync(SESSIONS_DIR)) {
        for (const f of readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.session.json')).sort()) {
            sessionFiles.push({ file: f, path: join(SESSIONS_DIR, f) });
        }
    }

    console.log(`Found ${sessionFiles.length} session files`);
    console.log();

    const results = [];

    for (const { file, path } of sessionFiles) {
        try {
            const session = JSON.parse(readFileSync(path, 'utf8'));
            const sessionStartup = getSessionStartup(session);
            const character = getSessionCharacter(session);

            const result = createTestResult(file, session.seed, session.source || 'c');

            // Skip non-gameplay sessions for now (chargen, special, etc.)
            const type = session.type || session.regen?.mode || 'gameplay';
            if (type !== 'gameplay' && type !== 'map') {
                if (verbose) console.log(`[SKIP] ${file}: ${type} session`);
                continue;
            }

            // Test startup RNG
            if (sessionStartup?.rng && sessionStartup.rng.length > 0) {
                try {
                    const startup = generateStartupWithRng(session.seed, session);
                    const div = compareRng(startup.rng, sessionStartup.rng);
                    const matched = div.index === -1;
                    recordRngResult(result, matched,
                        matched ? sessionStartup.rng.length : div.index,
                        sessionStartup.rng.length,
                        matched ? null : {
                            rngCall: div.index,
                            expected: div.session,
                            actual: div.js,
                        }
                    );

                    if (verbose) {
                        console.log(`  startup: ${matched ? 'ok' : 'FAIL'} (${startup.rngCalls} calls)`);
                    }
                } catch (e) {
                    result.passed = false;
                    if (verbose) console.log(`  startup: ERROR - ${e.message}`);
                }
            }

            // Test startup grid
            if (sessionStartup?.typGrid) {
                try {
                    const startup = generateStartupWithRng(session.seed, session);
                    const diffs = compareGrids(startup.grid, sessionStartup.typGrid);
                    recordGridResult(result, diffs.length === 0, 0, diffs.length);
                } catch (e) {
                    result.passed = false;
                }
            }

            // Test step replay
            const gameplaySteps = getSessionGameplaySteps(session);
            if (gameplaySteps.length > 0 && sessionStartup?.rng) {
                try {
                    const replay = await replaySession(session.seed, session);

                    for (let i = 0; i < gameplaySteps.length; i++) {
                        const step = gameplaySteps[i];
                        const jsStep = replay.steps[i];

                        // Compare RNG
                        if (step.rng && jsStep) {
                            const div = compareRng(jsStep.rng || [], step.rng);
                            const matched = div.index === -1;
                            recordRngResult(result, matched,
                                matched ? step.rng.length : Math.min(div.index, step.rng.length),
                                step.rng.length,
                                matched ? null : {
                                    key: i + 1,
                                    rngCall: div.index,
                                    expected: div.session,
                                    actual: div.js,
                                }
                            );
                            recordKeyResult(result, matched);
                        }

                        // Compare grid if present
                        if (step.typGrid && jsStep?.grid) {
                            const diffs = compareGrids(jsStep.grid, step.typGrid);
                            recordGridResult(result, diffs.length === 0, i + 1, diffs.length);
                        }
                    }
                } catch (e) {
                    result.passed = false;
                    if (verbose) console.log(`  replay: ERROR - ${e.message}`);
                }
            }

            const finalResult = finalizeResult(result);
            results.push(finalResult);
            console.log(formatResultSummary(finalResult));

        } catch (e) {
            console.log(`[ERROR] ${file}: ${e.message}`);
        }
    }

    console.log();
    console.log('Summary');
    console.log('-------');
    const aggregate = aggregateResults(results);
    console.log(formatAggregateSummary(aggregate));

    if (outputFile) {
        writeFileSync(outputFile, JSON.stringify(aggregate, null, 2) + '\n');
        console.log();
        console.log(`Results written to: ${outputFile}`);
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
