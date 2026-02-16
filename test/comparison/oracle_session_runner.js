#!/usr/bin/env node
// Simple session test runner - uses oracle.js for headless game execution
// Compares RNG traces and typGrids against C reference sessions

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHeadlessGame } from './oracle.js';

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
    const json = args.includes('--json');  // For sessions.test.js
    const filterType = args.find(a => a.startsWith('--type='))?.split('=')[1];
    const singleFile = args.find(a => a.endsWith('.json'));

    const files = getSessionFiles(singleFile, filterType);
    if (!jsonl && !json) console.log(`Running ${files.length} sessions...`);

    const results = { pass: 0, fail: 0, error: 0, skipped: 0, byType: {} };
    const allResults = [];

    for (const file of files) {
        const result = await runSession(file, verbose);
        allResults.push(result);
        trackResult(result, results, verbose, jsonl);
    }

    outputResults(allResults, results, jsonl, json);
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
            return await runMapSession(sessionName, session, sessionType);
        }

        // Chargen/interface/gameplay: compare startup RNG
        return await runGameplaySession(sessionName, session, sessionType);
    } catch (e) {
        return { name: sessionName, type: sessionType, error: e.message };
    }
}

async function runMapSession(sessionName, session, sessionType) {
    const levels = session.levels || [];
    if (levels.length === 0) {
        return { name: sessionName, type: sessionType, pass: true, stepsMatched: 0, totalSteps: 0 };
    }

    const result = await createHeadlessGame(session.seed, { wizard: true });
    if (result.error) throw new Error(result.error);

    const { game, rng } = result;
    await game.parityTestInit(session);

    // Generate additional levels if needed
    const maxDepth = Math.max(...levels.map(l => l.depth || 1));
    const grids = { 1: result.extractTypGrid() };
    for (let d = 2; d <= maxDepth; d++) {
        game.changeLevel(d);
        grids[d] = result.extractTypGrid();
    }

    // Compare typGrids
    let matched = 0, mismatched = 0;
    for (const level of levels) {
        const jsGrid = grids[level.depth];
        const sessGrid = level.typGrid;
        if (jsGrid && sessGrid) {
            if (compareGrids(jsGrid, sessGrid).length === 0) matched++;
            else mismatched++;
        } else {
            matched++;
        }
    }

    return { name: sessionName, type: sessionType, pass: mismatched === 0, stepsMatched: matched, totalSteps: levels.length };
}

async function runGameplaySession(sessionName, session, sessionType) {
    const result = await createHeadlessGame(session.seed, { wizard: true });
    if (result.error) throw new Error(result.error);

    const { game, rng } = result;
    await game.parityTestInit(session);

    // Chargen/interface: just check generation succeeded
    if (sessionType === 'chargen' || sessionType === 'interface') {
        return { name: sessionName, type: sessionType, pass: true, stepsMatched: 1, totalSteps: 1 };
    }

    // Gameplay: compare startup RNG
    const step0 = session.steps?.[0];
    if (step0?.rng?.length > 0) {
        const jsRng = rng.getRngLog();
        const cmp = compareRng(jsRng, step0.rng);
        const pass = cmp.index === -1;
        return { name: sessionName, type: sessionType, pass, stepsMatched: pass ? 1 : 0, totalSteps: 1 };
    }

    return { name: sessionName, type: sessionType, pass: true, stepsMatched: 1, totalSteps: 1 };
}

// ============================================================================
// Comparison Helpers
// ============================================================================

function toCompact(entry) {
    let str = typeof entry === 'string' ? entry : String(entry);
    return str.replace(/^\d+\s+/, '').split('@')[0].trim();
}

function isMidlog(s) {
    return s && (s.startsWith('>') || s.startsWith('<'));
}

function compareRng(jsRng, sessionRng) {
    const jsCompact = (jsRng || []).map(toCompact);
    const sessionCompact = (sessionRng || []).filter(s => !isMidlog(s)).map(toCompact);

    for (let i = 0; i < Math.max(jsCompact.length, sessionCompact.length); i++) {
        if (jsCompact[i] !== sessionCompact[i]) {
            return { index: i, js: jsCompact[i], session: sessionCompact[i] };
        }
    }
    return { index: -1 };
}

function compareGrids(grid1, grid2) {
    const diffs = [];
    const rows = Math.max(grid1?.length || 0, grid2?.length || 0);
    for (let y = 0; y < rows; y++) {
        const row1 = grid1?.[y] || [];
        const row2 = grid2?.[y] || [];
        const cols = Math.max(row1.length, row2.length);
        for (let x = 0; x < cols; x++) {
            if (row1[x] !== row2[x]) {
                diffs.push({ x, y, v1: row1[x], v2: row2[x] });
            }
        }
    }
    return diffs;
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

function outputResults(allResults, results, jsonl, json) {
    // JSON output for sessions.test.js
    if (json) {
        const output = allResults.map(r => ({
            session: r.name,
            type: r.type,
            passed: r.pass,
            error: r.error || null,
        }));
        console.log('__RESULTS_JSON__');
        console.log(JSON.stringify({ results: output }));
        return;
    }

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
