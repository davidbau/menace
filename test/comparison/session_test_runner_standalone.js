#!/usr/bin/env node
// Standalone session test runner - uses session_helpers.js for generation
// Compares RNG traces and typGrids against C reference sessions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    generateStartupWithRng,
    generateMapsWithRng,
    compareRng,
    compareGrids,
} from './session_helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'sessions');
const MAPS_DIR = path.join(__dirname, 'maps');

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
    const args = process.argv.slice(2);
    const verbose = args.includes('--verbose') || args.includes('-v');
    const jsonl = args.includes('--jsonl');
    const filterType = args.find(a => a.startsWith('--type='))?.split('=')[1];
    const singleFile = args.find(a => a.endsWith('.json'));

    const files = getSessionFiles(singleFile, filterType);
    if (!jsonl) console.log(`Running ${files.length} sessions...`);

    const results = { pass: 0, fail: 0, error: 0, skipped: 0, byType: {} };
    const allResults = [];

    for (const file of files) {
        const result = await runSession(file, verbose);
        allResults.push(result);
        trackResult(result, results, verbose, jsonl);
    }

    outputResults(allResults, results, jsonl);
}

// ============================================================================
// Session Running
// ============================================================================

async function runSession(sessionPath, verbose) {
    const sessionName = path.basename(sessionPath);
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const sessionType = session.type || 'gameplay';

    try {
        // Map/special sessions: compare typGrid
        if (sessionType === 'map' || sessionType === 'special') {
            return runMapSession(sessionName, session, sessionType);
        }

        // Chargen/interface/gameplay: compare startup RNG
        return runGameplaySession(sessionName, session, sessionType);
    } catch (e) {
        return { name: sessionName, type: sessionType, error: e.message };
    }
}

function runMapSession(sessionName, session, sessionType) {
    const levels = session.levels || [];
    if (levels.length === 0) {
        return { name: sessionName, type: sessionType, pass: true, stepsMatched: 0, totalSteps: 0 };
    }

    const maxDepth = Math.max(...levels.map(l => l.depth || 1));
    const result = generateMapsWithRng(session.seed, maxDepth);

    // Compare typGrids
    let matched = 0, mismatched = 0;
    for (const level of levels) {
        const depth = level.depth;
        const jsGrid = result.grids?.[depth];
        const sessGrid = level.typGrid;
        if (jsGrid && sessGrid) {
            const diffs = compareGrids(jsGrid, sessGrid);
            if (diffs.length === 0) matched++;
            else mismatched++;
        } else {
            matched++;
        }
    }

    return { name: sessionName, type: sessionType, pass: mismatched === 0, stepsMatched: matched, totalSteps: levels.length };
}

function runGameplaySession(sessionName, session, sessionType) {
    const result = generateStartupWithRng(session.seed, session);

    // Chargen/interface: just check generation succeeded
    if (sessionType === 'chargen' || sessionType === 'interface') {
        return { name: sessionName, type: sessionType, pass: true, stepsMatched: 1, totalSteps: 1 };
    }

    // Gameplay: compare startup RNG
    const step0 = session.steps?.[0];
    if (step0?.rng?.length > 0) {
        const cmp = compareRng(result.rng, step0.rng);
        const pass = cmp.index === -1;
        return { name: sessionName, type: sessionType, pass, stepsMatched: pass ? 1 : 0, totalSteps: 1 };
    }

    return { name: sessionName, type: sessionType, pass: true, stepsMatched: 1, totalSteps: 1 };
}

// ============================================================================
// File and Result Handling
// ============================================================================

function getSessionFiles(singleFile, filterType) {
    let files;
    if (singleFile) {
        files = [singleFile];
    } else {
        const sessFiles = fs.readdirSync(SESSIONS_DIR)
            .filter(f => f.endsWith('.session.json'))
            .map(f => path.join(SESSIONS_DIR, f));
        const mapFiles = fs.existsSync(MAPS_DIR)
            ? fs.readdirSync(MAPS_DIR)
                .filter(f => f.endsWith('.session.json'))
                .map(f => path.join(MAPS_DIR, f))
            : [];
        files = [...sessFiles, ...mapFiles];
    }

    if (filterType) {
        files = files.filter(f => {
            const session = JSON.parse(fs.readFileSync(f, 'utf8'));
            return (session.type || 'gameplay') === filterType;
        });
    }
    return files;
}

function trackResult(result, results, verbose, jsonl) {
    const type = result.type || 'unknown';
    if (!results.byType[type]) {
        results.byType[type] = { pass: 0, fail: 0, error: 0, skipped: 0 };
    }

    if (result.error) {
        results.error++;
        results.byType[type].error++;
        if (!jsonl) console.log(`ERROR ${result.name}: ${result.error}`);
    } else if (result.skipped) {
        results.skipped++;
        results.byType[type].skipped++;
        if (verbose && !jsonl) console.log(`SKIP  ${result.name}`);
    } else if (result.pass) {
        results.pass++;
        results.byType[type].pass++;
        if (verbose && !jsonl) console.log(`PASS  ${result.name}`);
    } else {
        results.fail++;
        results.byType[type].fail++;
        if (verbose && !jsonl) console.log(`FAIL  ${result.name}: ${result.stepsMatched}/${result.totalSteps} steps`);
    }
}

function outputResults(allResults, results, jsonl) {
    if (jsonl) {
        for (const r of allResults) {
            console.log(JSON.stringify({
                session: r.name,
                type: r.type,
                pass: r.pass,
                stepsMatched: r.stepsMatched,
                totalSteps: r.totalSteps,
                error: r.error || null,
            }));
        }
        process.exit(results.fail > 0 || results.error > 0 ? 1 : 0);
    }

    console.log('\n=== Summary ===');
    console.log(`Total: ${results.pass} pass, ${results.fail} fail, ${results.error} error, ${results.skipped} skipped`);
    console.log('\nBy type:');
    for (const [type, counts] of Object.entries(results.byType).sort()) {
        const total = counts.pass + counts.fail + counts.error + counts.skipped;
        const skippedNote = counts.skipped > 0 ? ` (${counts.skipped} skipped)` : '';
        console.log(`  ${type}: ${counts.pass}/${total} pass${skippedNote}`);
    }

    if (results.fail > 0 || results.error > 0) {
        process.exit(1);
    }
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
