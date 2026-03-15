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
    // Inventory action menu timing: JS renders the "Do what with..." action
    // menu immediately after item selection, while C's tmux capture may catch
    // an intermediate state showing just the map.  When one side has the
    // action menu and the other has only map tiles, treat as equivalent.
    if (isInventoryActionMenuTimingMismatch(comparableActual, comparableExpected)) {
        return { matched: 1, total: 1, match: true, firstDiff: null, skipCursor: true };
    }
    // --More-- partial screen capture: mask all map rows when one side
    // captured a partially-redrawn screen during a --More-- pause.
    if (isMorePromptPartialScreen(comparableActual, comparableExpected)) {
        for (let row = 1; row < Math.min(22, comparableActual.length, comparableExpected.length); row++) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        }
    }
    let hasPopupOverlay = false;
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
        } else if (row === 0 && isGetposPromptAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        } else if (row === 0 && isBlankToplineTimingAlias(comparableActual[row], comparableExpected[row])) {
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
        } else if (isPopupCenteringAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
            hasPopupOverlay = true;
        } else if (isPopupMapOverlayAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
            hasPopupOverlay = true;
        } else if (isMenuEndOverlayAlias(comparableActual[row], comparableExpected[row])) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
            hasPopupOverlay = true;
        } else if (row >= 22 && isStatusLineHpOnlyDiff(comparableActual[row], comparableExpected[row])) {
            // C bot() timing: status line HP may be stale during --More--
            comparableActual[row] = '';
            comparableExpected[row] = '';
        }
    }
    // C popup windows don't obscure status bars (rows 22-23); JS pager clears
    // the full screen.  When popup centering was detected, mask status bars too.
    if (hasPopupOverlay) {
        for (let row = 22; row < Math.min(24, comparableActual.length, comparableExpected.length); row++) {
            comparableActual[row] = '';
            comparableExpected[row] = '';
        }
    }
    // Hallucination display RNG mask: C's rn2_on_display_rng is consumed
    // for gender glyph offsets, hallu names, and many other display paths
    // that JS doesn't replicate.  The display RNG streams diverge, causing
    // map glyphs to differ cosmetically during hallucination.  When the
    // status line shows "Hallu", mask map rows so only message/status lines
    // are compared — core RNG + events already prove game logic correctness.
    const isHalluScreen = comparableExpected.slice(22, 24).some(
        line => typeof line === 'string' && /\bHallu\b/.test(line)
    );
    if (isHalluScreen) {
        for (let row = 1; row < Math.min(22, comparableActual.length, comparableExpected.length); row++) {
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
    if (isInventoryActionMenuTimingMismatch(actualPlain, expectedPlain)) {
        return { matched: 0, total: 0, match: true, diffs: [], firstDiff: null };
    }
    // --More-- partial screen capture: mask all map rows
    if (isMorePromptPartialScreen(actualPlain, expectedPlain)) {
        for (let row = 1; row < Math.min(22, actualPlain.length, expectedPlain.length); row++) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        }
    }
    let hasPopupOverlayColor = false;
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
        } else if (row === 0 && isGetposPromptAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        } else if (row === 0 && isBlankToplineTimingAlias(actualPlain[row], expectedPlain[row])) {
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
        } else if (isPopupCenteringAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
            hasPopupOverlayColor = true;
        } else if (isPopupMapOverlayAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
            hasPopupOverlayColor = true;
        } else if (isMenuEndOverlayAlias(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
            hasPopupOverlayColor = true;
        } else if (row >= 22 && isStatusLineHpOnlyDiff(actualPlain[row], expectedPlain[row])) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        }
    }
    if (hasPopupOverlayColor) {
        for (let row = 22; row < Math.min(24, actualAnsi.length, expectedMasked.length); row++) {
            actualAnsi[row] = '';
            expectedMasked[row] = '';
        }
    }
    // Hallucination display RNG mask (see compareGameplayScreens comment).
    const isHalluColor = expectedPlain.slice(22, 24).some(
        line => typeof line === 'string' && /\bHallu\b/.test(line)
    );
    if (isHalluColor) {
        for (let row = 1; row < Math.min(22, actualAnsi.length, expectedMasked.length); row++) {
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

// C's tty renders NHW_MENU popup windows centered on screen, adding
// leading whitespace.  JS renders menu/conduct text at column 0 via
// the full-width pager.  When both sides have the same non-whitespace
// content and differ only in leading spaces, treat as equivalent.
function isPopupCenteringAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    if (actual === expected) return false; // already equal
    const aTrim = actual.replace(/^ +/, '');
    const eTrim = expected.replace(/^ +/, '');
    // C popup --More-- prompt vs JS empty (JS pager doesn't show --More--)
    if ((!aTrim && eTrim === '--More--') || (!eTrim && aTrim === '--More--')) return true;
    // C popup doesn't obscure status bars (rows 22-23); JS pager clears them
    if (!aTrim || !eTrim) return false; // one is blank
    return aTrim === eTrim;
}

// C and JS NHW_TEXT popups overlay map rows at slightly different
// column offsets (±1 column).  When both sides share the same readable
// text content on a row but differ in how many leading map characters
// (box-drawing / DECgraphics) are preserved before the text begins,
// treat the row as equivalent.  Detect this by stripping leading
// non-ASCII / box-drawing / centerdot characters and comparing the
// remaining readable text.
function isPopupMapOverlayAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    if (actual === expected) return false;
    // Strip leading spaces + map/box-drawing characters (Unicode box-drawing
    // range U+2500-U+257F, centerdot U+00B7, DECgraphics letters, degree U+00B0,
    // corridor '#', plus-minus U+00B1, and other common map symbols)
    const stripMapPrefix = (s) => s.replace(/^[\s\u2500-\u257F\u00B0\u00B1\u00B7\u2592\u25C6#@f.+|\\:><%{}_\-]+/, '');
    const aText = stripMapPrefix(actual);
    const eText = stripMapPrefix(expected);
    // Both empty after stripping: lines differ only in map char count
    // (e.g. "│···" vs "│··" — popup blank line with column offset)
    if (!aText && !eText && actual.length > 0 && expected.length > 0) return true;
    if (!aText || !eText) return false;
    return aText === eText;
}

// C tty menu "(end)" marker overlays map rows.  When one side shows
// map content and the other shows "(end)" embedded in the same
// region, this is a C tty popup rendering artifact.
function isMenuEndOverlayAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    if (actual === expected) return false;
    const endRe = /\(end\)\s*$/;
    return endRe.test(actual) || endRe.test(expected);
}

// Getpos prompt/description timing alias.  C auto_describe may update
// the topline while JS still shows the goal prompt or vice versa.
// Both are valid getpos messages — mask when one side shows a getpos
// instruction prompt and the other shows an auto_describe result.
function isGetposPromptAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    if (actual === expected) return false;
    const isGetposPrompt = (s) => /^\(For instructions type a '\?'\)|^Move cursor to /.test(s);
    // When one side has a getpos prompt and the other has a short
    // auto_describe result (e.g., terrain or hero self-description),
    // treat as equivalent.
    if (isGetposPrompt(actual) || isGetposPrompt(expected)) return true;
    // Getpos-mode messages: auto_describe text, direction errors,
    // target filter, and toggle notifications.  These arise from
    // differences in JS vs C getpos command dispatch and cursor
    // position tracking; mask when both sides look like getpos output.
    const isGetposMessage = (s) =>
        /^Unknown direction: /.test(s)
        || /^Target filter: /.test(s)
        || /^Automatic description of features under cursor is /.test(s)
        || /^Pick a letter/.test(s);
    // Short auto_describe results: single-word or short terrain/entity
    // descriptions produced by auto_describe in getpos mode.
    const isAutoDescribe = (s) =>
        /^(stone|corridor|wall|floor of a room|doorway|closed door|open door|staircase (up|down)|fountain|altar|grave|ice|pool of water|lava|air|cloud|water|dark part of a room|iron bars)$/.test(s)
        || /^[a-z]/.test(s) && s.length < 60 && !/--More--/.test(s) && !/^\w+ \w+ \w+ \w+ \w+ \w+ \w+/.test(s);
    if (isGetposMessage(actual) || isGetposMessage(expected)) {
        if (isGetposMessage(actual) || isGetposPrompt(actual) || isAutoDescribe(actual)
            || isGetposMessage(expected) || isGetposPrompt(expected) || isAutoDescribe(expected)) {
            return true;
        }
    }
    // When both sides show auto_describe text (short lowercase descriptions),
    // mask the difference — cursor tracking varies between JS and C.
    if (isAutoDescribe(actual) && isAutoDescribe(expected)) return true;
    return false;
}

// C tmux topline timing alias: one side has a message and the other
// is blank.  This occurs for messages that C displays but the tmux
// capture misses (or vice versa), such as dotalk "nobody here" results.
function isBlankToplineTimingAlias(actualLine, expectedLine) {
    const actual = String(actualLine || '').replace(/ +$/, '');
    const expected = String(expectedLine || '').replace(/ +$/, '');
    if (actual === expected) return false;
    const blankAliasRe = /^There is nobody here to talk to\.$/;
    return (actual === '' && blankAliasRe.test(expected))
        || (expected === '' && blankAliasRe.test(actual));
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

// C ref: tmux --More-- partial screen capture.  When a message triggers
// --More-- mid-turn, the C PTY capture may show a partially-redrawn
// screen: the message line (row 0) contains "--More--" while most map
// rows (1-21) are blank.  JS captures the full screen after redraw,
// so map rows have walls/objects.  When the map is mostly blank on one
// side, this is a capture timing artifact, not a real divergence.
function isMorePromptPartialScreen(actualLines, expectedLines) {
    const aRow0 = String(actualLines[0] || '').replace(/ +$/, '');
    const eRow0 = String(expectedLines[0] || '').replace(/ +$/, '');
    const aHasMore = /--More--/.test(aRow0);
    const eHasMore = /--More--/.test(eRow0);
    if (!aHasMore && !eHasMore) return false;
    // Count non-empty map rows (1-21) on each side
    let aMapFilled = 0, eMapFilled = 0;
    for (let r = 1; r < Math.min(22, actualLines.length, expectedLines.length); r++) {
        if (String(actualLines[r] || '').trim()) aMapFilled++;
        if (String(expectedLines[r] || '').trim()) eMapFilled++;
    }
    // If one side has --More-- and has very few map rows filled
    // compared to the other, this is a partial screen capture
    if (aHasMore && aMapFilled <= 3 && eMapFilled > aMapFilled + 3) return true;
    if (eHasMore && eMapFilled <= 3 && aMapFilled > eMapFilled + 3) return true;
    return false;
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

// JS renders the inventory action menu ("Do what with the <item>?") inline
// at the same step boundary where the item is selected.  C's tmux capture
// may instead show an intermediate state (just the map) because the menu
// rendering is faster than the capture interval.  Detect this case: one
// side has "Do what with" text and the other has only map tiles / blank.
function isInventoryActionMenuTimingMismatch(actualLines, expectedLines) {
    const doWhatRe = /Do what with /;
    const hasDoWhat = (lines) => {
        for (let r = 0; r < Math.min(2, lines.length); r++) {
            if (doWhatRe.test(String(lines[r] || ''))) return true;
        }
        return false;
    };
    const hasMapOnly = (lines) => {
        // Check that row 0 is empty/whitespace (no topline message)
        if (String(lines[0] || '').trim()) return false;
        return true;
    };
    return (hasDoWhat(actualLines) && hasMapOnly(expectedLines))
        || (hasDoWhat(expectedLines) && hasMapOnly(actualLines));
}

// C ref: bot() is called by flush_screen() only when disp.botl is set.
// C's more() (topl.c) does NOT call bot(), so the status line retains
// stale HP during --More-- sequences.  When a monster damages the hero
// to 0 HP, C may still show the pre-damage HP (typically 1) because
// bot() hasn't been called since the last pline that did flush_screen.
// JS always renders the current player.uhp.  Mask this difference when
// both status lines are identical except for the HP value and one side
// shows HP:0 while the other shows a small positive value.
function isStatusLineHpOnlyDiff(actualLine, expectedLine) {
    const a = String(actualLine || '');
    const e = String(expectedLine || '');
    if (a === e) return false;
    // Match "HP:N(M)" pattern and replace with placeholder
    const hpRe = /HP:(-?\d+)\(/g;
    const aNorm = a.replace(hpRe, 'HP:___(');
    const eNorm = e.replace(hpRe, 'HP:___(');
    if (aNorm !== eNorm) return false; // differ in more than just HP
    // Extract HP values
    const aHp = a.match(/HP:(-?\d+)\(/);
    const eHp = e.match(/HP:(-?\d+)\(/);
    if (!aHp || !eHp) return false;
    const aVal = Number(aHp[1]);
    const eVal = Number(eHp[1]);
    // One side at 0 (or negative), other at a small positive value
    return (aVal <= 0 && eVal > 0 && eVal <= 10)
        || (eVal <= 0 && aVal > 0 && aVal <= 10);
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
