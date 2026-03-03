// test/comparison/comparator_policy.js
// Comparator policies decide how raw recorded JS traces are judged against C.
// Replay/runtime should stay policy-free; add sparse-boundary allowances here.

import {
    compareRng,
    compareScreenLines,
    compareScreenAnsi,
    ansiLineToCells,
    compareEvents,
} from './comparators.js';
import { getSessionScreenAnsiLines } from './session_loader.js';
import { decodeDecSpecialChar } from './symset_normalization.js';

function normalizeGameplayScreenLines(lines) {
    return (Array.isArray(lines) ? lines : [])
        .map((line) => String(line || '').replace(/\r$/, '').replace(/[\x0e\x0f]/g, ''));
}

function ansiCellsToPlainLine(line) {
    return ansiLineToCells(line).map((cell) => cell?.ch || ' ').join('');
}

function decodeSOSILine(line) {
    const src = String(line || '').replace(/\r$/, '');
    let result = '';
    let inDec = false;
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (ch === '\x0e') { inDec = true; continue; }
        if (ch === '\x0f') { inDec = false; continue; }
        result += inDec ? decodeDecSpecialChar(ch) : ch;
    }
    return result;
}

function resolveGameplayComparableLines(plainLines, ansiLines, session) {
    const ansi = Array.isArray(ansiLines) ? ansiLines : [];
    const decgraphics = session?.meta?.options?.symset === 'DECgraphics';
    if (ansi.length > 0) {
        return ansi.map((line) => ansiCellsToPlainLine(line));
    }
    const plain = Array.isArray(plainLines) ? plainLines : [];
    if (!decgraphics) {
        return plain.map(decodeSOSILine);
    }
    return plain
        .map((line) => String(line || '').replace(/\r$/, '').replace(/[\x0e\x0f]/g, ''))
        .map((line) => [...line].map((ch) => decodeDecSpecialChar(ch)).join(''));
}

function compareGameplayScreens(actualLines, expectedLines, session, {
    actualAnsi = null,
    expectedAnsi = null,
} = {}) {
    const comparableActual = resolveGameplayComparableLines(actualLines, actualAnsi, session).slice();
    const comparableExpected = resolveGameplayComparableLines(expectedLines, expectedAnsi, session).slice();
    for (let row = 0; row < Math.min(comparableActual.length, comparableExpected.length); row++) {
        if (isStartupToplineAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        }
    }
    const normalizedExpected = normalizeGameplayScreenLines(comparableExpected);
    const normalizedActual = normalizeGameplayScreenLines(comparableActual);
    return compareScreenLines(normalizedActual, normalizedExpected);
}

function compareGameplayColors(actualAnsiInput, expectedAnsiInput) {
    const expectedMasked = (Array.isArray(expectedAnsiInput) ? expectedAnsiInput : []).slice();
    const actualAnsi = (Array.isArray(actualAnsiInput) ? actualAnsiInput : []).slice();
    const actualPlain = actualAnsi.map((line) => ansiCellsToPlainLine(line));
    const expectedPlain = expectedMasked.map((line) => ansiCellsToPlainLine(line));
    for (let row = 0; row < Math.min(actualPlain.length, expectedPlain.length); row++) {
        if (isMapLoadPromptAlias(actualPlain[row]) && isMapLoadPromptAlias(expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (isStartupToplineAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        }
    }
    return compareScreenAnsi(actualAnsi, expectedMasked);
}

function getStepFrames(actualStep) {
    const boundaries = Array.isArray(actualStep?.animationBoundaries) ? actualStep.animationBoundaries : [];
    const frames = boundaries.map((boundary, idx) => ({
        kind: 'boundary',
        index: idx,
        screen: Array.isArray(boundary?.screen) ? boundary.screen : [],
        screenAnsi: Array.isArray(boundary?.screenAnsi) ? boundary.screenAnsi : null,
    }));
    frames.push({
        kind: 'final',
        index: boundaries.length,
        screen: Array.isArray(actualStep?.screen) ? actualStep.screen : [],
        screenAnsi: Array.isArray(actualStep?.screenAnsi) ? actualStep.screenAnsi : null,
    });
    return frames;
}

function approximateStepForRngIndex(session, normalizedIndex) {
    let cumulative = 0;
    const count = (entries) => {
        let n = 0;
        for (const e of entries) {
            if (typeof e !== 'string' || !e.length) continue;
            const c = e[0];
            if (c === '>' || c === '<' || c === '^') continue;
            const stripped = e.replace(/^\d+\s+/, '').replace(/ @ .*/, '');
            if (stripped.startsWith('rne(') || stripped.startsWith('rnz(') || stripped.startsWith('d(')) continue;
            n++;
        }
        return n;
    };
    cumulative += count(session.startup?.rng || []);
    for (let i = 0; i < session.steps.length; i++) {
        cumulative += count(session.steps[i].rng || []);
        if (normalizedIndex < cumulative) return i + 1;
    }
    return 'n/a';
}

function stepForEventIndex(session, eventIndex) {
    const isEvent = (e) => typeof e === 'string' && e.startsWith('^');
    let cumulative = 0;
    cumulative += (session.startup?.rng || []).filter(isEvent).length;
    for (let i = 0; i < session.steps.length; i++) {
        cumulative += (session.steps[i].rng || []).filter(isEvent).length;
        if (eventIndex < cumulative) return i + 1;
    }
    return 'n/a';
}

function expectedDelayBoundaryCount(step) {
    const entries = Array.isArray(step?.rng) ? step.rng : [];
    let comparable = false;
    let count = 0;
    for (const entry of entries) {
        if (typeof entry !== 'string') continue;
        if (entry.startsWith('^delay_output[')
            || entry.includes('animation(tmp_at)')) {
            comparable = true;
        }
        if (entry.startsWith('>runmode_delay_output') && entry.includes('animation(tmp_at)')) {
            count++;
        }
    }
    return { comparable, count };
}

function isMapLoadPromptAlias(line) {
    const text = String(line || '').replace(/ +$/, '').trimStart();
    return text.startsWith('Load which des lua file?') || text.startsWith('Load which level?');
}

function isHarnessMapDumpLine(line) {
    const text = String(line || '').replace(/ +$/, '').trimStart();
    return /^Map dumped to \/tmp\/[^ ]*dumpmap\.txt\.$/.test(text);
}

function isWelcomeTopline(line) {
    const text = String(line || '').replace(/ +$/, '').trimStart();
    return /^NetHack Royal Jelly -- Welcome to the Mazes of Menace! \[WIZARD MODE\] \(seed:\d+\)$/.test(text);
}

function isStartupToplineAlias(actualLine, expectedLine) {
    return (isHarnessMapDumpLine(actualLine) && isWelcomeTopline(expectedLine))
        || (isHarnessMapDumpLine(expectedLine) && isWelcomeTopline(actualLine));
}

export function createGameplayComparatorPolicy(session, options = {}) {
    const name = options.name || 'strict-default';
    return {
        name,
        compareRng(allJsRng, allSessionRng) {
            const rngCmp = compareRng(allJsRng, allSessionRng);
            if (rngCmp.firstDivergence) {
                rngCmp.firstDivergence.step = approximateStepForRngIndex(
                    session, rngCmp.firstDivergence.index
                );
            }
            return rngCmp;
        },
        compareScreenStep(actualStep, expectedStep) {
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            return compareGameplayScreens(actualStep?.screen || [], expectedStep?.screen || [], session, {
                actualAnsi: actualStep?.screenAnsi,
                expectedAnsi,
            });
        },
        compareColorStep(actualStep, expectedStep) {
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            if (!expectedAnsi.length || !Array.isArray(actualStep?.screenAnsi)) {
                return null;
            }
            return compareGameplayColors(actualStep.screenAnsi, expectedAnsi);
        },
        compareScreenWindowStep(actualStep, expectedStep) {
            if (!Array.isArray(expectedStep?.screen) || expectedStep.screen.length === 0) {
                return null;
            }
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            const frames = getStepFrames(actualStep);
            let finalDiff = null;
            for (const frame of frames) {
                const cmp = compareGameplayScreens(frame.screen, expectedStep.screen, session, {
                    actualAnsi: frame.screenAnsi,
                    expectedAnsi,
                });
                if (cmp.match) {
                    return {
                        matched: 1,
                        total: 1,
                        match: true,
                        early: frame.kind !== 'final',
                        matchedFrame: { kind: frame.kind, index: frame.index },
                        firstDiff: null,
                    };
                }
                if (frame.kind === 'final') finalDiff = cmp.firstDiff || null;
            }
            return {
                matched: 0,
                total: 1,
                match: false,
                early: false,
                matchedFrame: null,
                firstDiff: finalDiff,
            };
        },
        compareColorWindowStep(actualStep, expectedStep) {
            const expectedAnsi = getSessionScreenAnsiLines(expectedStep);
            if (!expectedAnsi.length) return null;
            const frames = getStepFrames(actualStep);
            let finalDiff = null;
            for (const frame of frames) {
                const cmp = compareGameplayColors(frame.screenAnsi, expectedAnsi);
                if (cmp.match) {
                    return {
                        matched: cmp.matched,
                        total: cmp.total,
                        match: true,
                        early: frame.kind !== 'final',
                        matchedFrame: { kind: frame.kind, index: frame.index },
                        firstDiff: null,
                    };
                }
                if (frame.kind === 'final') finalDiff = cmp.firstDiff || null;
            }
            // Keep denominator aligned to strict color denominator for this step.
            const finalCmp = compareGameplayColors(actualStep?.screenAnsi, expectedAnsi);
            return {
                matched: 0,
                total: finalCmp.total,
                match: false,
                early: false,
                matchedFrame: null,
                firstDiff: finalDiff,
            };
        },
        compareEvents(allJsRng, allSessionRng) {
            const cmp = compareEvents(allJsRng, allSessionRng);
            if (cmp.firstDivergence) {
                cmp.firstDivergence.step = stepForEventIndex(
                    session, cmp.firstDivergence.index
                );
            }
            return cmp;
        },
        compareAnimationBoundariesStep(actualStep, expectedStep) {
            const expected = expectedDelayBoundaryCount(expectedStep);
            if (!expected.comparable) return null;
            const expectedCount = expected.count;
            const actualCount = Array.isArray(actualStep?.animationBoundaries)
                ? actualStep.animationBoundaries.length
                : 0;
            const match = expectedCount === actualCount;
            return {
                matched: match ? 1 : 0,
                total: 1,
                match,
                firstDiff: match ? null : {
                    expectedCount,
                    actualCount,
                },
            };
        },
    };
}
