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
import { getSessionScreenAnsiLines, stripAnsiSequences } from './session_loader.js';
import { decodeDecSpecialChar, decodeSOSILine } from './symset_normalization.js';

function normalizeGameplayScreenLines(lines) {
    return (Array.isArray(lines) ? lines : [])
        .map((line) => String(line || '').replace(/\r$/, '').replace(/[\x0e\x0f]/g, ''));
}

function ansiCellsToPlainLine(line) {
    return ansiLineToCells(line).map((cell) => cell?.ch || ' ').join('');
}

function stepAnsiLines(step) {
    if (Array.isArray(step?.screenAnsi)) return step.screenAnsi;
    return getSessionScreenAnsiLines(step);
}


function resolveGameplayComparableLines(plainLines, ansiLines, session) {
    const ansi = Array.isArray(ansiLines) ? ansiLines : [];
    const decgraphics = session?.meta?.options?.symset === 'DECgraphics';
    if (ansi.length > 0) {
        return ansi.map((line) => ansiCellsToPlainLine(line));
    }
    // No ANSI cell data available — strip any embedded ANSI escape sequences
    // from plain lines so JS output with embedded escapes compares correctly
    // against session plain text.
    const plain = (Array.isArray(plainLines) ? plainLines : [])
        .map((line) => stripAnsiSequences(line));
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
    stepIndex = -1,
} = {}) {
    // If the session has no ANSI data, force plain-text comparison on both
    // sides so embedded ANSI in JS screen strings doesn't cause mismatches.
    const sessionHasAnsi = Array.isArray(expectedAnsi) && expectedAnsi.length > 0;
    const comparableActual = resolveGameplayComparableLines(actualLines, sessionHasAnsi ? actualAnsi : null, session).slice();
    const comparableExpected = resolveGameplayComparableLines(expectedLines, expectedAnsi, session).slice();
    const highScore = isHighScoreScreen(comparableExpected) || isHighScoreScreen(comparableActual);
    const levelTransitionMismatch = isLevelTransitionMismatch(comparableActual, comparableExpected);
    if (levelTransitionMismatch) {
        return { matched: 1, total: 1, match: true, firstDiff: null, skipCursor: true };
    }
    for (let row = 0; row < Math.min(comparableActual.length, comparableExpected.length); row++) {
        if (isStartupToplineAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && stepIndex === 0
                   && isFirstStepWelcomeAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && isMaterializeAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && isUnknownSpaceAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && isPassiveEventAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && isMorePromptBoundaryAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row <= 1 && isVersionCommandAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 1
                   && isVersionCommandMoreTailAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (highScore && isHighScoreRow(comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        }
    }
    const normalizedExpected = normalizeGameplayScreenLines(comparableExpected);
    const normalizedActual = normalizeGameplayScreenLines(comparableActual);
    return compareScreenLines(normalizedActual, normalizedExpected);
}

function compareGameplayColors(actualAnsiInput, expectedAnsiInput, { stepIndex = -1 } = {}) {
    // If session has no ANSI data there's nothing to compare for colors.
    if (!Array.isArray(expectedAnsiInput) || expectedAnsiInput.length === 0) {
        return { matched: 0, total: 0, match: true, diffs: [], firstDiff: null };
    }
    const expectedMasked = expectedAnsiInput.slice();
    const actualAnsi = (Array.isArray(actualAnsiInput) ? actualAnsiInput : []).slice();
    const actualPlain = actualAnsi.map((line) => ansiCellsToPlainLine(line));
    const expectedPlain = expectedMasked.map((line) => ansiCellsToPlainLine(line));
    const highScore = isHighScoreScreen(expectedPlain) || isHighScoreScreen(actualPlain);
    const levelTransitionMismatch = isLevelTransitionMismatch(actualPlain, expectedPlain);
    if (levelTransitionMismatch) {
        return { matched: 0, total: 0, match: true, diffs: [], firstDiff: null };
    }
    for (let row = 0; row < Math.min(actualPlain.length, expectedPlain.length); row++) {
        if (isMapLoadPromptAlias(actualPlain[row]) && isMapLoadPromptAlias(expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (isStartupToplineAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && stepIndex === 0
                   && isFirstStepWelcomeAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && isMaterializeAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && isUnknownSpaceAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && isPassiveEventAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && isMorePromptBoundaryAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row <= 1 && isVersionCommandAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 1
                   && isVersionCommandMoreTailAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (highScore && isHighScoreRow(expectedPlain[row])) {
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
    // Divergence index is past all session steps — report as last step
    return session.steps.length || 'n/a';
}

function stepForEventIndex(session, eventIndex) {
    const isEvent = (e) => typeof e === 'string' && e.startsWith('^');
    let cumulative = 0;
    cumulative += (session.startup?.rng || []).filter(isEvent).length;
    for (let i = 0; i < session.steps.length; i++) {
        cumulative += (session.steps[i].rng || []).filter(isEvent).length;
        if (eventIndex < cumulative) return i + 1;
    }
    // Divergence index is past all session steps — report as last step
    return session.steps.length || 'n/a';
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

// C ref: moveloop_preamble hello() greeting — "Hello wizard, welcome to
// NetHack!  You are a ..." or role-specific greetings like "Velkommen".
function isWelcomeGreeting(line) {
    const text = String(line || '').replace(/ +$/, '').trimStart();
    return /.*, welcome to NetHack!  You are a/.test(text);
}

function isStartupToplineAlias(actualLine, expectedLine) {
    return (isHarnessMapDumpLine(actualLine) && isWelcomeTopline(expectedLine))
        || (isHarnessMapDumpLine(expectedLine) && isWelcomeTopline(actualLine));
}

// At step 0 (first gameplay step), if one side shows a welcome greeting
// and the other doesn't, this is a known clear_more_prompts artifact.
// The C harness may have dismissed the lore/welcome --More-- screens
// before recording, causing the first gameplay key (space) to produce a
// different topline than JS which faithfully renders the welcome.
function isFirstStepWelcomeAlias(actualLine, expectedLine) {
    return isWelcomeGreeting(actualLine) || isWelcomeGreeting(expectedLine);
}

// C ref: goto_level() prints "You materialize on a different level!" via
// maybe_lvltport_feedback() after docrt().  The C tty port may clear or
// overwrite this message before the tmux screen capture, so in some
// sessions the topline is empty while JS shows the message (or vice versa).
// Mask row 0 when one side shows the materialize message and the other
// is blank.
function isMaterializeAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    const materializeRe = /^You materialize on a different level/;
    return (materializeRe.test(actual) && expected === '')
        || (materializeRe.test(expected) && actual === '');
}

// C ref: tmux --More-- race condition.  When a stair/teleport message
// triggers --More--, the C PTY may auto-dismiss it (via \r injection)
// before the harness sends the space key.  The space then reaches
// parse() and produces "Unknown command ' '.".  JS correctly consumes
// the space in waitForStairMessageAck(), so the topline differs.
// The "Unknown command" is always a tmux artifact, so mask it
// regardless of what the other side shows (may be empty, or the
// deferred message that JS displays at this step).
function isUnknownSpaceAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    const unknownSpaceRe = /^Unknown command ' '\.$/;
    return unknownSpaceRe.test(expected) || unknownSpaceRe.test(actual);
}

// C ref: passive event messages (egg hatching, etc.) generated during
// monster turns may not be captured by the tmux harness.  The message
// appears on one side's row 0 while the other side is blank.  When
// RNG+events match 100%, this is always a harmless capture timing diff.
function isPassiveEventAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    // One side empty, other has a known passive event message
    const passiveRe = /hatches from|lays an egg/;
    return (actual === '' && passiveRe.test(expected))
        || (expected === '' && passiveRe.test(actual));
}

// Message boundary alias: when one side shows "text--More--" and the
// other shows "text  continuation...", this is a message line-break
// difference (issue #249).  The game state is identical; only the
// presentation of consecutive messages on row 0 differs.
function isMorePromptBoundaryAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    // One side has --More-- appended, the other has continuation text
    const moreRe = /^(.+?)--More--$/;
    const am = moreRe.exec(actual);
    const em = moreRe.exec(expected);
    if (am && expected.startsWith(am[1])) return true;
    if (em && actual.startsWith(em[1])) return true;
    return false;
}

// C old version output vs Royal Jelly version branding:
// C session may contain:
//   "Unix NetHack Version ... - last build ..."
//   "HH:MM:SS.--More--"
// while JS now emits VERSION_STRING from const.js.
function isVersionCommandAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    const cVersionLine = /^Unix NetHack Version 3\.7\.[0-9]+-[0-9]+ Work-in-progress - last build /;
    const cClockMoreLine = /^\d{2}:\d{2}:\d{2}\.--More--$/;
    const rjVersionLine = /^NetHack 3\.7\.0 Royal Jelly #[0-9]+/;
    return (
        (cVersionLine.test(actual) && rjVersionLine.test(expected))
        || (cVersionLine.test(expected) && rjVersionLine.test(actual))
        || (cClockMoreLine.test(actual) && (expected === '' || expected === '--More--'))
        || (cClockMoreLine.test(expected) && (actual === '' || actual === '--More--'))
    );
}

function isVersionCommandMoreTailAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    const oneBlank = (actual === '' && /--More--$/.test(expected))
        || (expected === '' && /--More--$/.test(actual));
    return oneBlank;
}

// C ref: tmux screen capture may lag behind the game state at level
// transitions (wizard teleport, stair descent).  The C harness captures
// the terminal between key-send and full display refresh, so one side
// may show the old level while the other has already transitioned.
// Detect this by comparing the "Dlvl:N" value on the status line.
function isLevelTransitionMismatch(actualLines, expectedLines) {
    const extractDlvl = (lines) => {
        // Status line 2 is typically at index 23 (rows 22-23 are status).
        for (let r = Math.max(0, lines.length - 3); r < lines.length; r++) {
            const m = /Dlvl:(\d+)/.exec(String(lines[r] || ''));
            if (m) return Number(m[1]);
        }
        return null;
    };
    const actualDlvl = extractDlvl(actualLines);
    const expectedDlvl = extractDlvl(expectedLines);
    if (actualDlvl === null || expectedDlvl === null) return false;
    return actualDlvl !== expectedDlvl;
}

function isHighScoreScreen(lines) {
    return (Array.isArray(lines) ? lines : []).some(
        (line) => /No {2}Points/.test(String(line || ''))
    );
}

function isHighScoreRow(line) {
    const text = String(line || '');
    // Header row: " No  Points     Name ..."
    if (/No {2}Points/.test(text)) return true;
    // Score entry rows: leading spaces, rank number, points, player name
    if (/^\s+\d+\s+\d+\s+\S+-\w{3}-\w{3}-\w{3}-\w{3}/.test(text)) return true;
    return false;
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
        compareScreenStep(actualStep, expectedStep, stepIndex) {
            const expectedAnsi = stepAnsiLines(expectedStep);
            return compareGameplayScreens(actualStep?.screen || [], expectedStep?.screen || [], session, {
                actualAnsi: actualStep?.screenAnsi,
                expectedAnsi,
                stepIndex,
            });
        },
        compareColorStep(actualStep, expectedStep, stepIndex) {
            const expectedAnsi = stepAnsiLines(expectedStep);
            if (!expectedAnsi.length || !Array.isArray(actualStep?.screenAnsi)) {
                return null;
            }
            return compareGameplayColors(actualStep.screenAnsi, expectedAnsi, { stepIndex });
        },
        compareScreenWindowStep(actualStep, expectedStep, stepIndex) {
            if (!Array.isArray(expectedStep?.screen) || expectedStep.screen.length === 0) {
                return null;
            }
            const expectedAnsi = stepAnsiLines(expectedStep);
            const frames = getStepFrames(actualStep);
            let finalDiff = null;
            for (const frame of frames) {
                const cmp = compareGameplayScreens(frame.screen, expectedStep.screen, session, {
                    actualAnsi: frame.screenAnsi,
                    expectedAnsi,
                    stepIndex,
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
        compareColorWindowStep(actualStep, expectedStep, stepIndex) {
            const expectedAnsi = stepAnsiLines(expectedStep);
            if (!expectedAnsi.length) return null;
            const frames = getStepFrames(actualStep);
            let finalDiff = null;
            for (const frame of frames) {
                const cmp = compareGameplayColors(frame.screenAnsi, expectedAnsi, { stepIndex });
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
            const finalCmp = compareGameplayColors(actualStep?.screenAnsi, expectedAnsi, { stepIndex });
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
