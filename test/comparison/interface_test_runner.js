// Interface test runner - compares JS port UI to C NetHack screen captures
// Tests startup sequence, options menu, and all interface elements character-by-character

import { test } from 'node:test';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, 'sessions');

/**
 * Load an interface session file
 */
function loadSession(filename) {
    const filepath = path.join(SESSIONS_DIR, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

/**
 * Compare two screens character-by-character
 * @param {string[]} jsScreen - 24 lines from JS
 * @param {string[]} cScreen - 24 lines from C
 * @param {string[]} cAttrs - 24 lines of attribute codes from C (optional)
 * @returns {object} { matches: boolean, diffs: array of differences }
 */
function compareScreens(jsScreen, cScreen, cAttrs = null) {
    const diffs = [];

    for (let row = 0; row < 24; row++) {
        const jsLine = (jsScreen[row] || '').padEnd(80);
        const cLine = (cScreen[row] || '').padEnd(80);
        const cAttrLine = cAttrs ? (cAttrs[row] || '0'.repeat(80)).padEnd(80, '0') : null;

        for (let col = 0; col < 80; col++) {
            const jsChar = jsLine[col] || ' ';
            const cChar = cLine[col] || ' ';
            const cAttr = cAttrLine ? cAttrLine[col] : '0';

            // Character mismatch
            if (jsChar !== cChar) {
                diffs.push({
                    type: 'char',
                    row,
                    col,
                    js: jsChar,
                    c: cChar,
                    attr: cAttr
                });
            }

            // TODO: Check attribute mismatches when JS supports attributes
            // For now, we only check character content
        }
    }

    return {
        matches: diffs.length === 0,
        diffs: diffs.slice(0, 20)  // Limit to first 20 diffs for readability
    };
}

/**
 * Format diff report for assertion messages
 */
function formatDiffReport(stepDesc, diffs) {
    if (diffs.length === 0) return '';

    let report = `\n${stepDesc}:\n`;
    for (const diff of diffs.slice(0, 10)) {
        const pos = `(${diff.row},${diff.col})`;
        report += `  ${pos}: JS='${diff.js}' C='${diff.c}'`;
        if (diff.attr !== '0') {
            report += ` [attr=${diff.attr}]`;
        }
        report += '\n';
    }
    if (diffs.length > 10) {
        report += `  ... and ${diffs.length - 10} more differences\n`;
    }
    return report;
}

// Load all interface session files
const sessionFiles = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.startsWith('interface_') && f.endsWith('.session.json'));

if (sessionFiles.length === 0) {
    console.log('⚠️  No interface session files found. Run gen_interface_sessions.py first.');
    console.log('   python3 test/comparison/c-harness/gen_interface_sessions.py --startup');
    console.log('   python3 test/comparison/c-harness/gen_interface_sessions.py --options');
}

// Generate tests for each session file
for (const filename of sessionFiles) {
    const session = loadSession(filename);
    const subtype = session.subtype || 'unknown';

    test(`Interface: ${subtype} - ${session.description || filename}`, async (t) => {
        // This is a placeholder - actual implementation needs to:
        // 1. Initialize JS NetHack in headless mode
        // 2. Replay the key sequence from session.steps
        // 3. Capture JS screen after each step
        // 4. Compare with C screen

        // For now, just verify session structure
        assert.ok(session.version, 'Session has version');
        assert.ok(session.type === 'interface', 'Session type is interface');
        assert.ok(Array.isArray(session.steps), 'Session has steps array');

        for (const step of session.steps) {
            assert.ok(Array.isArray(step.screen), `Step ${step.key} has screen array`);
            assert.strictEqual(step.screen.length, 24, `Step ${step.key} screen has 24 lines`);

            if (step.attrs) {
                assert.ok(Array.isArray(step.attrs), `Step ${step.key} has attrs array`);
                assert.strictEqual(step.attrs.length, 24, `Step ${step.key} attrs has 24 lines`);
            }
        }

        // TODO: Implement actual JS replay and comparison
        // This requires extending the test framework to support headless UI testing
        console.log(`  📋 Session structure verified: ${session.steps.length} steps`);
    });
}

// Export for use in other test files
export { compareScreens, formatDiffReport, loadSession };
