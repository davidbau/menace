// test/comparison/session_comparator.js
// Recorded gameplay trace comparison orchestration.

import { stripAnsiSequences } from './session_loader.js';
import { createGameplayComparatorPolicy } from './comparator_policy.js';
import { compareMapdumpCheckpoints, stripEventContext } from './comparators.js';

export function compareRecordedGameplaySession(session, replay, options = {}) {
    const policy = options.policy || createGameplayComparatorPolicy(session);
    const allJsRng = [
        ...(replay.startup?.rng || []),
        ...(replay.steps || []).flatMap((s) => s.rng || []),
    ];
    const allSessionRng = [
        ...(session.startup?.rng || []),
        ...session.steps.flatMap((s) => s.rng || []),
    ];

    const rngCmp = policy.compareRng(allJsRng, allSessionRng);

    const count = Math.min(session.steps.length, (replay.steps || []).length);
    let screensMatched = 0;
    let screensTotal = 0;
    let firstScreenDivergence = null;
    let colorsMatched = 0;
    let colorsTotal = 0;
    let firstColorDivergence = null;
    let screenWindowMatched = 0;
    let screenWindowTotal = 0;
    let firstScreenWindowDivergence = null;
    let screenEarlyOnlyCount = 0;
    let firstScreenEarlyOnly = null;
    let colorWindowMatched = 0;
    let colorWindowTotal = 0;
    let firstColorWindowDivergence = null;
    let colorEarlyOnlyCount = 0;
    let firstColorEarlyOnly = null;
    let animationBoundariesMatched = 0;
    let animationBoundariesTotal = 0;
    let firstAnimationBoundaryDivergence = null;
    let cursorMatched = 0;
    let cursorTotal = 0;
    let firstCursorDivergence = null;
    let repaintMatched = 0;
    let repaintTotal = 0;
    let firstRepaintDivergence = null;

    const compareExactTrace = (actualEntries, expectedEntries, step) => {
        const expected = Array.isArray(expectedEntries) ? expectedEntries : [];
        const actual = Array.isArray(actualEntries) ? actualEntries : [];
        if (expected.length === 0) return null;
        const total = Math.max(expected.length, actual.length);
        let matched = 0;
        let firstDiff = null;
        for (let j = 0; j < total; j++) {
            if (stripEventContext(expected[j]) === stripEventContext(actual[j])) {
                matched++;
            } else if (!firstDiff) {
                firstDiff = {
                    step,
                    index: j,
                    expected: expected[j] ?? null,
                    actual: actual[j] ?? null,
                };
            }
        }
        return { matched, total, firstDiff };
    };

    const collectRepaintEntries = (stepLike) => {
        const out = [];
        const rng = Array.isArray(stepLike?.rng) ? stepLike.rng : [];
        for (let i = 0; i < rng.length; i++) {
            const entry = rng[i];
            if (typeof entry === 'string' && entry.startsWith('^repaint[')) out.push(entry);
        }
        return out;
    };

    for (let i = 0; i < count; i++) {
        const expected = session.steps[i];
        const actual = replay.steps[i] || {};

        let screenOk = true;
        let screenCmpResult = null;
        if (expected.screen.length > 0) {
            screensTotal++;
            const screenCmp = policy.compareScreenStep(actual, expected, i);
            screenCmpResult = screenCmp;
            if (screenCmp.match) {
                screensMatched++;
            } else {
                screenOk = false;
                if (!firstScreenDivergence && screenCmp.firstDiff) {
                    firstScreenDivergence = { step: i + 1, ...screenCmp.firstDiff };
                }
            }
            const screenWindowCmp = policy.compareScreenWindowStep(actual, expected, i);
            if (screenWindowCmp && screenWindowCmp.total > 0) {
                screenWindowMatched += screenWindowCmp.matched;
                screenWindowTotal += screenWindowCmp.total;
                if (!screenWindowCmp.match && !firstScreenWindowDivergence && screenWindowCmp.firstDiff) {
                    firstScreenWindowDivergence = { step: i + 1, ...screenWindowCmp.firstDiff };
                }
                const earlyOnly = (!screenCmp.match && screenWindowCmp.match && !!screenWindowCmp.early);
                if (earlyOnly) {
                    screenEarlyOnlyCount++;
                    if (!firstScreenEarlyOnly) {
                        firstScreenEarlyOnly = {
                            step: i + 1,
                            frame: screenWindowCmp.matchedFrame || null,
                        };
                    }
                }
            }
        }

        const colorCmp = policy.compareColorStep(actual, expected, i);
        if (colorCmp) {
            colorsMatched += colorCmp.matched;
            colorsTotal += colorCmp.total;
            if (!firstColorDivergence && !colorCmp.match && colorCmp.firstDiff) {
                firstColorDivergence = { step: i + 1, ...colorCmp.firstDiff };
            }
            const colorWindowCmp = policy.compareColorWindowStep(actual, expected, i);
            if (colorWindowCmp && colorWindowCmp.total > 0) {
                colorWindowMatched += colorWindowCmp.matched;
                colorWindowTotal += colorWindowCmp.total;
                if (!colorWindowCmp.match && !firstColorWindowDivergence && colorWindowCmp.firstDiff) {
                    firstColorWindowDivergence = { step: i + 1, ...colorWindowCmp.firstDiff };
                }
                const earlyOnly = (!colorCmp.match && colorWindowCmp.match && !!colorWindowCmp.early);
                if (earlyOnly) {
                    colorEarlyOnlyCount++;
                    if (!firstColorEarlyOnly) {
                        firstColorEarlyOnly = {
                            step: i + 1,
                            frame: colorWindowCmp.matchedFrame || null,
                        };
                    }
                }
            }
        }

        const animationBoundaryCmp = policy.compareAnimationBoundariesStep(actual, expected, i);
        if (animationBoundaryCmp) {
            animationBoundariesMatched += animationBoundaryCmp.matched;
            animationBoundariesTotal += animationBoundaryCmp.total;
            if (!firstAnimationBoundaryDivergence && !animationBoundaryCmp.match && animationBoundaryCmp.firstDiff) {
                firstAnimationBoundaryDivergence = { step: i + 1, ...animationBoundaryCmp.firstDiff };
            }
        }

        // Cursor comparison — optional (old sessions lack cursor field).
        // Supports both [col, row] (legacy) and [col, row, visible] formats.
        // Skip when screen already diverged: cursor position is determined by screen
        // content, so a cursor mismatch at a screen-divergent step is not independent signal.
        const expectedCursor = expected.cursor || null;
        const actualCursor = actual.cursor || null;
        if (expectedCursor && screenOk && !screenCmpResult?.skipCursor) {
            cursorTotal++;
            const [ec, er, ev] = expectedCursor;
            const [ac, ar, av] = actualCursor || [null, null, null];
            // When cursor is invisible on either side, position is meaningless — skip check
            const eitherInvisible = (ev === 0 || av === 0);
            const posMatch = eitherInvisible || (ac === ec && ar === er);
            const visMatch = (ev == null || av == null || av === ev);
            if (posMatch && visMatch) {
                cursorMatched++;
            } else if (!firstCursorDivergence) {
                firstCursorDivergence = {
                    step: i + 1,
                    expected: expectedCursor,
                    actual: actualCursor,
                };
            }
        }

        const repaintCmp = compareExactTrace(
            collectRepaintEntries(actual),
            collectRepaintEntries(expected),
            i + 1
        );
        if (repaintCmp) {
            repaintMatched += repaintCmp.matched;
            repaintTotal += repaintCmp.total;
            if (!firstRepaintDivergence && repaintCmp.firstDiff) {
                firstRepaintDivergence = repaintCmp.firstDiff;
            }
        }
    }

    const eventCmp = policy.compareEvents(allJsRng, allSessionRng);
    const mapdumpCmp = compareMapdumpCheckpoints(
        replay?.checkpoints || null,
        session?.mapdumpCheckpoints || null
    );

    return {
        rng: {
            matched: rngCmp.matched,
            total: rngCmp.total,
            firstDivergence: rngCmp.firstDivergence || null,
        },
        screen: {
            matched: screensMatched,
            total: screensTotal,
            firstDivergence: firstScreenDivergence,
        },
        color: {
            matched: colorsMatched,
            total: colorsTotal,
            firstDivergence: firstColorDivergence,
        },
        screenWindow: {
            matched: screenWindowMatched,
            total: screenWindowTotal,
            firstDivergence: firstScreenWindowDivergence,
            earlyOnlyCount: screenEarlyOnlyCount,
            firstEarlyOnly: firstScreenEarlyOnly,
            rerecordCandidate: screenEarlyOnlyCount > 0,
        },
        colorWindow: {
            matched: colorWindowMatched,
            total: colorWindowTotal,
            firstDivergence: firstColorWindowDivergence,
            earlyOnlyCount: colorEarlyOnlyCount,
            firstEarlyOnly: firstColorEarlyOnly,
            rerecordCandidate: colorEarlyOnlyCount > 0,
        },
        event: {
            matched: eventCmp.matched,
            total: eventCmp.total,
            firstDivergence: eventCmp.firstDivergence || null,
        },
        mapdump: {
            matched: mapdumpCmp.matched,
            total: mapdumpCmp.total,
            firstDivergence: mapdumpCmp.firstDivergence || null,
        },
        animationBoundaries: {
            matched: animationBoundariesMatched,
            total: animationBoundariesTotal,
            firstDivergence: firstAnimationBoundaryDivergence,
        },
        cursor: {
            matched: cursorMatched,
            total: cursorTotal,
            firstDivergence: firstCursorDivergence,
        },
        repaint: {
            matched: repaintMatched,
            total: repaintTotal,
            firstDivergence: firstRepaintDivergence,
        },
    };
}

export { stripAnsiSequences };
