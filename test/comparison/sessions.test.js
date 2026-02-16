/**
 * Session Tests - Node.js test runner wrapper
 *
 * Runs session_test_runner.js (CLI mode) and reports
 * results in node:test format with grouping by session type.
 */

import { describe, test, before } from 'node:test';
import { runSessionBundle } from './session_test_runner.js';

// Store results after async loading
let results = null;
let loadError = null;

// Run the session test runner and collect results
async function runSessionTests() {
    const bundle = await runSessionBundle({ verbose: false, useGolden: false });
    return bundle.results;
}

// Group results by type
function groupResults(results) {
    const groups = {
        chargen: [],
        interface: [],
        map: [],
        gameplay: [],
        special: [],
        other: []
    };

    for (const r of results) {
        const type = r.type || 'other';
        if (groups[type]) {
            groups[type].push(r);
        } else {
            groups.other.push(r);
        }
    }
    return groups;
}

// Generate error message for failed test
function getErrorMessage(r) {
    if (r.error) return r.error;
    if (r.firstDivergence) {
        return `Diverged at step ${r.firstDivergence.step}, RNG call ${r.firstDivergence.rngCall}`;
    }
    if (r.failedLevels) {
        return `Failed levels: ${r.failedLevels.join(', ')}`;
    }
    return `Failed: ${JSON.stringify(r.metrics || {})}`;
}

describe('Session Tests', async () => {
    before(async () => {
        try {
            results = await runSessionTests();
        } catch (e) {
            loadError = e;
        }
    });

    test('session runner completed', () => {
        if (loadError) throw loadError;
        if (!results) throw new Error('No results loaded');
    });

    describe('Chargen Sessions', () => {
        before(() => {
            if (!results) return;
        });

        test('chargen tests', async (t) => {
            if (!results) return t.skip('No results');
            const groups = groupResults(results);
            for (const r of groups.chargen) {
                await t.test(r.session, () => {
                    if (!r.passed) throw new Error(getErrorMessage(r));
                });
            }
        });
    });

    describe('Interface Sessions', () => {
        test('interface tests', async (t) => {
            if (!results) return t.skip('No results');
            const groups = groupResults(results);
            for (const r of groups.interface) {
                await t.test(r.session, () => {
                    if (!r.passed) throw new Error(getErrorMessage(r));
                });
            }
        });
    });

    describe('Map Sessions', () => {
        test('map tests', async (t) => {
            if (!results) return t.skip('No results');
            const groups = groupResults(results);
            for (const r of groups.map) {
                await t.test(r.session, () => {
                    if (!r.passed) throw new Error(getErrorMessage(r));
                });
            }
        });
    });

    describe('Gameplay Sessions', () => {
        test('gameplay tests', async (t) => {
            if (!results) return t.skip('No results');
            const groups = groupResults(results);
            for (const r of groups.gameplay) {
                await t.test(r.session, () => {
                    if (!r.passed) throw new Error(getErrorMessage(r));
                });
            }
        });
    });

    describe('Special Sessions', () => {
        test('special tests', async (t) => {
            if (!results) return t.skip('No results');
            const groups = groupResults(results);
            for (const r of groups.special) {
                await t.test(r.session, () => {
                    if (!r.passed) throw new Error(getErrorMessage(r));
                });
            }
        });
    });
});
