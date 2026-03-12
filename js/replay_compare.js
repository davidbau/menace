// js/replay_compare.js -- Comparison and generation utilities for session tests
//
// Grid comparison, map generation, RNG comparison, screen normalization.
// These are test infrastructure utilities, not part of the replay engine.

import { COLNO, ROWNO } from './const.js';
import { initRng, enableRngLog, getRngLog, disableRngLog } from './rng.js';
import { initLevelGeneration, mklev, setGameSeed } from './dungeon.js';
import { simulatePostLevelInit } from './u_init.js';
import { mon_arrive } from './dog.js';
import { Player, roles } from './player.js';
import { RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC } from './const.js';
import { initrack } from './monmove.js';

// ---------------------------------------------------------------------------
// Screen normalization
// ---------------------------------------------------------------------------

// Strip ANSI escape/control sequences from a terminal line.
export function stripAnsiSequences(text) {
    if (!text) return '';
    return String(text)
        .replace(/\x1b\[(\d*)C/g, (_m, n) => ' '.repeat(Math.max(1, Number(n || '1'))))
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        .replace(/\x1b[@-Z\\-_]/g, '')
        .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '')
        .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

export function getSessionScreenLines(screenHolder) {
    if (Array.isArray(screenHolder?.screenAnsi)) {
        return screenHolder.screenAnsi.map((line) => stripAnsiSequences(line));
    }
    if (Array.isArray(screenHolder?.screen)) {
        return screenHolder.screen.map((line) => stripAnsiSequences(line));
    }
    if (typeof screenHolder?.screenAnsi === 'string') {
        return screenHolder.screenAnsi.split('\n').map((line) => stripAnsiSequences(line));
    }
    if (typeof screenHolder?.screen === 'string') {
        return screenHolder.screen.split('\n').map((line) => stripAnsiSequences(line));
    }
    return [];
}

export function getSessionScreenAnsiLines(screenHolder) {
    if (Array.isArray(screenHolder?.screenAnsi)) {
        return screenHolder.screenAnsi.map((line) => String(line || ''));
    }
    if (Array.isArray(screenHolder?.screen)) {
        return screenHolder.screen.map((line) => String(line || ''));
    }
    if (typeof screenHolder?.screenAnsi === 'string') {
        return screenHolder.screenAnsi.split('\n').map((line) => String(line || ''));
    }
    if (typeof screenHolder?.screen === 'string') {
        return screenHolder.screen.split('\n').map((line) => String(line || ''));
    }
    return [];
}

// ---------------------------------------------------------------------------
// Terrain type names and grid comparison
// ---------------------------------------------------------------------------

const TYP_NAMES = [
    'STONE', 'VWALL', 'HWALL', 'TLCORNER', 'TRCORNER', 'BLCORNER',
    'BRCORNER', 'CROSSWALL', 'TUWALL', 'TDWALL', 'TLWALL', 'TRWALL',
    'DBWALL', 'TREE', 'SDOOR', 'SCORR', 'POOL', 'MOAT', 'WATER',
    'DRAWBRIDGE_UP', 'LAVAPOOL', 'LAVAWALL', 'IRONBARS', 'DOOR', 'CORR',
    'ROOM', 'STAIRS', 'LADDER', 'FOUNTAIN', 'THRONE', 'SINK', 'GRAVE',
    'ALTAR', 'ICE', 'DRAWBRIDGE_DOWN', 'AIR', 'CLOUD',
];

export function typName(t) {
    return TYP_NAMES[t] || `UNKNOWN(${t})`;
}

export function parseTypGrid(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => line.trim().split(/\s+/).map(Number));
}

export function parseSessionTypGrid(grid) {
    if (!grid || !Array.isArray(grid)) return null;
    return grid;
}

export function compareGrids(grid1, grid2) {
    const diffs = [];
    const rows = Math.min(grid1.length, grid2.length);
    for (let y = 0; y < rows; y++) {
        const cols = Math.min(grid1[y].length, grid2[y].length);
        for (let x = 0; x < cols; x++) {
            if (grid1[y][x] !== grid2[y][x]) {
                diffs.push({
                    x, y,
                    a: grid1[y][x],
                    b: grid2[y][x],
                    aName: typName(grid1[y][x]),
                    bName: typName(grid2[y][x]),
                });
            }
        }
    }
    return diffs;
}

export function formatDiffs(diffs, maxShow = 20) {
    if (diffs.length === 0) return 'PERFECT MATCH';
    const shown = diffs.slice(0, maxShow);
    let report = `${diffs.length} cells differ:`;
    for (const d of shown) {
        report += `\n  (${d.x},${d.y}): JS=${d.aName}(${d.a}) session=${d.bName}(${d.b})`;
    }
    if (diffs.length > maxShow) {
        report += `\n  ... and ${diffs.length - maxShow} more`;
    }
    return report;
}

export function extractTypGrid(map) {
    const grid = [];
    for (let y = 0; y < ROWNO; y++) {
        const row = [];
        for (let x = 0; x < COLNO; x++) {
            const loc = map.at(x, y);
            row.push(loc ? loc.typ : 0);
        }
        grid.push(row);
    }
    return grid;
}

export function compareMapdumpCheckpoint(map, parsedCheckpoint) {
    const divergences = [];
    if (!parsedCheckpoint?.typGrid) return { match: true, divergences };
    const jsGrid = extractTypGrid(map);
    const cGrid = parsedCheckpoint.typGrid;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            const jsVal = jsGrid[y]?.[x] ?? 0;
            const cVal = cGrid[y]?.[x] ?? 0;
            if (jsVal !== cVal) {
                divergences.push({
                    grid: 'typ', x, y,
                    js: jsVal, jsName: typName(jsVal),
                    session: cVal, sessionName: typName(cVal),
                });
            }
        }
    }
    return { match: divergences.length === 0, divergences };
}

// ---------------------------------------------------------------------------
// RNG trace comparison
// ---------------------------------------------------------------------------

function isMidlogEntry(entry) {
    return entry.length > 0 && (entry[0] === '>' || entry[0] === '<' || entry[0] === '~' || entry[0] === '^');
}

function isCompositeEntry(entry) {
    return entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d(');
}

// Convert JS log entry to compact session format.
export function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    return entry.replace(/^\d+\s+/, '');
}

function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}

export function compareRng(jsRng, sessionRng) {
    let si = 0;
    let ji = 0;
    while (ji < jsRng.length && si < sessionRng.length) {
        if (isMidlogEntry(sessionRng[si])) { si++; continue; }
        if (isMidlogEntry(jsRng[ji])) { ji++; continue; }
        if (isCompositeEntry(rngCallPart(jsRng[ji]))) { ji++; continue; }
        if (isCompositeEntry(rngCallPart(sessionRng[si]))) { si++; continue; }
        if (rngCallPart(jsRng[ji]) !== rngCallPart(sessionRng[si])) {
            return { index: ji, js: jsRng[ji], session: sessionRng[si] };
        }
        ji++;
        si++;
    }
    while (si < sessionRng.length && (isMidlogEntry(sessionRng[si]) || isCompositeEntry(rngCallPart(sessionRng[si])))) si++;
    while (ji < jsRng.length && (isMidlogEntry(jsRng[ji]) || isCompositeEntry(rngCallPart(jsRng[ji])))) ji++;
    if (ji < jsRng.length || si < sessionRng.length) {
        return {
            index: ji,
            js: jsRng[ji] || '(end)',
            session: sessionRng[si] || '(end)',
        };
    }
    return { index: -1 };
}

// ---------------------------------------------------------------------------
// Session format helpers
// ---------------------------------------------------------------------------

export function getSessionStartup(session) {
    if (session?.steps?.length) {
        const firstStep = session.steps[0];
        if (firstStep.key === null) {
            return {
                rng: firstStep.rng || [],
                rngCalls: (firstStep.rng || []).length,
                typGrid: firstStep.typGrid,
                screen: firstStep.screen,
                screenAnsi: firstStep.screenAnsi,
            };
        }
    }
    if (session?.startup && typeof session.startup === 'object') {
        return {
            rng: session.startup.rng || [],
            rngCalls: Number.isInteger(session.startup.rngCalls)
                ? session.startup.rngCalls
                : (session.startup.rng || []).length,
            typGrid: session.startup.typGrid,
            screen: session.startup.screen,
            screenAnsi: session.startup.screenAnsi,
        };
    }
    return null;
}

export function getSessionCharacter(session) {
    return parseSessionCharacter(session);
}

// For 'manual-direct-live' sessions, find all large-RNG bursts (level gen, tutorial gen)
// and compute the boundary index in raw.steps after which gameplay begins.
// Returns { boundary, hasTutorial, firstBurst, lastBurst } or null.
// Takes the raw session (raw.steps has the null-key startup at index 0).
function getManualDirectChargenInfo(rawSession) {
    const steps = rawSession?.steps || [];
    let firstBurst = -1;
    let lastBurst = -1;
    for (let i = 1; i < steps.length; i++) {
        if ((steps[i].rng || []).length > 100) {
            if (firstBurst < 0) firstBurst = i;
            lastBurst = i;
        }
        // Stop scanning after 10 steps past first burst — all setup bursts are nearby
        if (firstBurst >= 0 && i > firstBurst + 10) break;
    }
    if (firstBurst < 0) return null;
    // hasTutorial: a secondary burst (tutorial level gen) follows the primary (dungeon level gen)
    const hasTutorial = lastBurst > firstBurst;
    // Scan forward from the last large burst: include steps with ≤ 3 raw RNG entries.
    // Non-tutorial: preamble (2 RNG) + welcome dismiss (0) + tutorial-answer-"n" (0).
    // Tutorial: tutorial level gen burst + starting engraving dismissals (0 RNG each).
    // The first actual gameplay step has 4+ RNG entries.
    let boundary = lastBurst;
    for (let j = lastBurst + 1; j < steps.length && j <= lastBurst + 10; j++) {
        if ((steps[j].rng || []).length > 3) break;
        boundary = j;
    }
    return { boundary, hasTutorial, firstBurst, lastBurst };
}

function getManualDirectChargenBoundary(rawSession) {
    return getManualDirectChargenInfo(rawSession)?.boundary ?? -1;
}

export function getSessionGameplaySteps(session) {
    if (!session?.steps) return [];
    if (session.steps.length > 0 && session.steps[0].key === null) {
        // For manual-direct-live, skip all embedded chargen+lore steps.
        // The boundary points to the last pre-gameplay step; gameplay starts at boundary+1.
        if (session.regen?.mode === 'manual-direct-live') {
            const boundary = getManualDirectChargenBoundary(session);
            if (boundary >= 0) return session.steps.slice(boundary + 1);
        }
        return session.steps.slice(1);
    }
    return session.steps;
}

export function getChargenKeys(session) {
    if (session.type !== 'chargen') return [];
    const keys = [];
    for (const step of (session.steps || [])) {
        if (step.key === null) break;
        if (typeof step.key === 'string' && step.key.length > 0) {
            keys.push(step.key);
        }
    }
    return keys;
}

// For manual-direct-live sessions, build a comparison-ready session view that:
//  1. Folds ALL pre-gameplay RNG (chargen + level-gen + moveloop_preamble + lore dismiss)
//     into startup.rng, so the flat JS startup RNG can match it.
//  2. Slices session.steps to only include gameplay steps (so screen indices align).
//  3. Sets startup.screen from the first gameplay step (so parseSessionCharacter works).
// This is called in the test runner before passing to compareRecordedGameplaySession.
export function applyManualDirectChargenView(session) {
    if (session.raw?.regen?.mode !== 'manual-direct-live') return session;
    // session.steps = raw.steps.slice(1) — null-key startup was extracted to session.startup.
    // getManualDirectChargenBoundary returns a raw.steps index (extended by +2 for lore steps).
    // sessionBoundary = rawBoundary - 1 (converts raw index to session.steps index).
    const rawBoundary = getManualDirectChargenBoundary(session.raw);
    if (rawBoundary < 0) return session;
    const sessionBoundary = rawBoundary - 1; // index in session.steps
    const chargenSteps = session.steps.slice(0, sessionBoundary + 1);
    const chargenRng = chargenSteps.flatMap((s) => s.rng || []);
    const hasPickAlign = chargenSteps.some((s) =>
        (s.rng || []).some((r) => typeof r === 'string' && r.includes('pick_align'))
    );
    // Use first gameplay step's screen so parseSessionCharacter can detect the character.
    const firstGameplayStep = session.steps[sessionBoundary + 1];
    return {
        ...session,
        startup: {
            ...(session.startup || {}),
            rng: [...(session.startup?.rng || []), ...chargenRng],
            screen: firstGameplayStep?.screen ?? (session.startup?.screen ?? []),
        },
        steps: session.steps.slice(sessionBoundary + 1),
        _manualDirectChargen: { hasPickAlign },
    };
}

export function hasStartupBurstInFirstStep(session) {
    if (!session) return false;
    return session.steps?.[0]?.key === null;
}

// Build (seed, opts, keys) args for replaySession from a session object.
export function prepareReplayArgs(seed, session, opts = {}) {
    const chargenKeys = getChargenKeys(session);
    const sessionChar = parseSessionCharacter(session);
    const initOpts = chargenKeys.length > 0
        ? { flags: { name: sessionChar.name || '' } }
        : {
            wizard: session.options?.wizard ?? true,
            character: {
                role: sessionChar.role,
                name: sessionChar.name,
                gender: sessionChar.gender,
                race: sessionChar.race,
                align: sessionChar.align,
            },
            startDnum: Number.isInteger(opts.startDnum) ? opts.startDnum : undefined,
            startDlevel: Number.isInteger(opts.startDlevel) ? opts.startDlevel : 1,
            dungeonAlignOverride: Number.isInteger(opts.startDungeonAlign) ? opts.startDungeonAlign : undefined,
            flags: { tutorial: opts.tutorial === true },
            replayTutorialStartupPrompts: Array.isArray(opts.replayTutorialStartupPrompts)
                ? opts.replayTutorialStartupPrompts : [],
            tutorialStartupEnterAfterPromptCount: Number.isInteger(opts.tutorialStartupEnterAfterPromptCount)
                ? opts.tutorialStartupEnterAfterPromptCount : undefined,
            tutorialDirectStart: opts.tutorialDirectStart === true,
        };
    // Detect whether the C session recorded lore/welcome screens (step 0 has
    // lore text).  When present, enable lore/welcome rendering in JS init so
    // both sides match.  Sessions recorded with clear_more_prompts won't have
    // lore at step 0, so JS skips it to stay compatible.
    if (chargenKeys.length === 0) {
        const step0Screen = String(session.steps?.[0]?.screen || '');
        if (/It is written in the Book of/.test(step0Screen)) {
            initOpts.showLoreAndWelcome = true;
        }
    }
    // For manual-direct-live sessions, add RNG simulation so the JS startup matches
    // the combined C startup (chargen + level-gen + moveloop_preamble steps folded in).
    if (session.regen?.mode === 'manual-direct-live') {
        const info = getManualDirectChargenInfo(session);
        if (info) {
            // Search steps before level gen (steps 1..firstBurst-1) for pick_align RNG entries.
            const chargenOnlySteps = (session.steps || []).slice(1, info.firstBurst);
            const hasPickAlign = chargenOnlySteps.some((s) =>
                (s.rng || []).some((r) => typeof r === 'string' && r.includes('pick_align'))
            );
            initOpts.simulateManualDirectChargen = { hasPickAlign, hasTutorial: info.hasTutorial };
        }
    }

    const hasCheckpointEvents = (Array.isArray(session?.steps) ? session.steps : []).some((step) =>
        Array.isArray(step?.rng) && step.rng.some((entry) => typeof entry === 'string' && entry.startsWith('^ckpt['))
    );
    if (hasCheckpointEvents) {
        initOpts.captureSpecialLevelCheckpoints = true;
    }

    // Flatten all gameplay step keys into a single string.
    const steps = getSessionGameplaySteps(session);
    let maxKeys = opts.maxSteps;
    let keys = '';
    for (let i = 0; i < steps.length; i++) {
        if (Number.isInteger(maxKeys) && i >= maxKeys) break;
        if (typeof steps[i].key === 'string') keys += steps[i].key;
    }

    // Build display flags from session metadata.
    const sessionSymset = session?.options?.symset || session?.meta?.options?.symset;
    const decgraphicsMode = session.screenMode === 'decgraphics' || sessionSymset === 'DECgraphics';
    const displayFlags = { DECgraphics: !!decgraphicsMode };
    if (opts.flags && typeof opts.flags === 'object') {
        Object.assign(displayFlags, opts.flags);
    }

    return {
        seed,
        opts: {
            initOpts,
            chargenKeys: chargenKeys.length > 0 ? chargenKeys : undefined,
            displayFlags,
            captureScreens: opts.captureScreens,
            onKey: opts.onKey,
        },
        keys,
        // Expose step boundaries so the comparator can group key results back into steps.
        stepBoundaries: steps.map(s => (typeof s.key === 'string' ? s.key.length : 0)),
    };
}

// ---------------------------------------------------------------------------
// Map generation utilities
// ---------------------------------------------------------------------------

export async function generateMapsSequential(seed, maxDepth) {
    initrack();
    initRng(seed);
    setGameSeed(seed);
    initLevelGeneration(11);
    const grids = {};
    const maps = {};
    for (let depth = 1; depth <= maxDepth; depth++) {
        const map = await mklev(depth);
        grids[depth] = extractTypGrid(map);
        maps[depth] = map;
    }
    return { grids, maps };
}

export async function generateMapsWithRng(seed, maxDepth) {
    initrack();
    initRng(seed);
    setGameSeed(seed);
    enableRngLog();
    initLevelGeneration(11);
    const grids = {};
    const maps = {};
    const rngLogs = {};
    let harnessPlayer = null;
    let prevCount = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
        const previousMap = depth > 1 ? maps[depth - 1] : null;
        const map = await mklev(depth);
        grids[depth] = extractTypGrid(map);
        maps[depth] = map;
        if (depth === 1) {
            harnessPlayer = new Player();
            harnessPlayer.initRole(11);
            if (map.upstair) {
                harnessPlayer.x = map.upstair.x;
                harnessPlayer.y = map.upstair.y;
            }
            simulatePostLevelInit(harnessPlayer, map, 1);
        } else {
            if (harnessPlayer && previousMap) {
                mon_arrive(previousMap, map, harnessPlayer, {
                    heroX: map.upstair.x,
                    heroY: map.upstair.y,
                });
            }
        }
        if (harnessPlayer) {
            if (map.upstair) {
                harnessPlayer.x = map.upstair.x;
                harnessPlayer.y = map.upstair.y;
            }
            harnessPlayer.dungeonLevel = depth;
        }
        const fullLog = getRngLog();
        const depthLog = fullLog.slice(prevCount);
        const compactRng = depthLog.map(toCompactRng);
        const filteredRng = compactRng.filter(e => {
            const call = rngCallPart(e);
            return !isCompositeEntry(call) && !isMidlogEntry(e);
        });
        rngLogs[depth] = { rngCalls: filteredRng.length, rng: filteredRng };
        prevCount = fullLog.length;
    }
    disableRngLog();
    return { grids, maps, rngLogs };
}

const ROLE_INDEX = {};
for (let i = 0; i < roles.length; i++) ROLE_INDEX[roles[i].name] = i;

// Local session character parser (avoids circular dependency with replay_core).
function parseSessionCharacter(session) {
    if (!session?.options) return {};
    let startupName = null;
    let startupRank = null;
    // Find character name from startup status line.
    // For manual-direct-live sessions, the startup screen is blank (chargen menus);
    // use the first gameplay step's screen instead.
    let startup;
    if (session.regen?.mode === 'manual-direct-live') {
        const info = getManualDirectChargenInfo(session);
        startup = info ? (session.steps || [])[info.boundary + 1] : null;
    } else {
        startup = session?.steps?.[0]?.key === null ? session.steps[0] : session?.startup;
    }
    const startupLines = getSessionScreenLines(startup || {});
    for (const line of startupLines) {
        if (!line || !line.includes('St:')) continue;
        const m = line.match(/^\s*(.*?)\s+St:/);
        if (!m) continue;
        const statusPrefix = m[1].trim();
        const theIdx = statusPrefix.indexOf(' the ');
        if (theIdx > 0) {
            startupName = statusPrefix.slice(0, theIdx).trim();
            startupRank = statusPrefix.slice(theIdx + 5).trim();
        } else if (statusPrefix.length > 0) {
            startupName = statusPrefix;
        }
        if (startupName) break;
    }
    let roleFromStartup = null;
    if (startupRank) {
        const matches = [];
        for (const role of roles) {
            if (!role?.ranks) continue;
            if (role.ranks.some((r) => r?.m === startupRank || r?.f === startupRank)) {
                matches.push(role.name);
            }
        }
        if (matches.length === 1) roleFromStartup = matches[0];
    }

    // For manual-direct-live sessions, parse race/gender/align from the welcome message.
    // The welcome message (step after level gen) reads: "You are a(n)? {align} [gender] {race_adj} {role}."
    // session.options.race/gender/align are placeholder defaults and cannot be trusted.
    let alignFromWelcome = null, genderFromWelcome = null, raceFromWelcome = null, roleFromWelcome = null;
    if (session.regen?.mode === 'manual-direct-live') {
        const info = getManualDirectChargenInfo(session);
        if (info) {
            const welcomeStep = (session.steps || [])[info.firstBurst + 1];
            const welcomeLines = getSessionScreenLines(welcomeStep || {});
            const raceAdjMap = { human: 'human', elven: 'elf', dwarven: 'dwarf', gnomish: 'gnome', orcish: 'orc' };
            for (const line of welcomeLines) {
                if (!line?.includes('You are a')) continue;
                // Format: "You are a(n)? {align} [male|female] {race_adj} {role}."
                const m = line.match(/You are an?\s+(chaotic|neutral|lawful)\s+(?:(male|female)\s+)?(\w+)\s+(\w+)/);
                if (m) {
                    alignFromWelcome = m[1];
                    genderFromWelcome = m[2] || 'male';
                    raceFromWelcome = raceAdjMap[m[3]] || m[3];
                    const roleMatch = roles.find((r) => r.name === m[4]);
                    if (roleMatch) roleFromWelcome = roleMatch.name;
                    break;
                }
            }
        }
    }

    return {
        name: startupName || session.options.name,
        role: roleFromStartup || roleFromWelcome || session.options.role,
        race: raceFromWelcome || session.options.race,
        gender: genderFromWelcome || session.options.gender,
        align: alignFromWelcome || session.options.align,
    };
}

export async function generateStartupWithRng(seed, session) {
    initrack();
    enableRngLog();
    initRng(seed);
    setGameSeed(seed);

    const charOpts = parseSessionCharacter(session);
    const roleIndex = ROLE_INDEX[charOpts.role] ?? 11;

    const preStartupEntries = getPreStartupRngEntries(session);
    consumeRngEntries(preStartupEntries);

    const alignMap0 = { lawful: 1, neutral: 0, chaotic: -1 };
    const raceMap0 = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
    initLevelGeneration(roleIndex, session.options?.wizard ?? true, {
        alignment: alignMap0[charOpts.align],
        race: raceMap0[charOpts.race],
    });

    const map = await mklev(1);
    const grid = extractTypGrid(map);

    const player = new Player();
    player.initRole(roleIndex);
    player.name = charOpts.name || 'Wizard';
    player.gender = charOpts.gender === 'female' ? 1 : 0;

    const alignMap = { lawful: 1, neutral: 0, chaotic: -1 };
    if (charOpts.align && alignMap[charOpts.align] !== undefined) {
        player.alignment = alignMap[charOpts.align];
    }

    const raceMap = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
    player.race = raceMap[charOpts.race] ?? RACE_HUMAN;

    if (map.upstair) {
        player.x = map.upstair.x;
        player.y = map.upstair.y;
    }

    const preChargenCount = getRngLog().length;
    simulatePostLevelInit(player, map, 1);

    const fullLog = getRngLog();
    disableRngLog();

    const stripCount = session.type === 'chargen' ? preStartupEntries.length : 0;
    const startupLog = fullLog.slice(stripCount);
    const chargenLog = fullLog.slice(preChargenCount);

    return {
        grid,
        map,
        player,
        rngCalls: startupLog.length,
        rng: startupLog.map(toCompactRng),
        chargenRngCalls: chargenLog.length,
        chargenRng: chargenLog.map(toCompactRng),
    };
}

// These are referenced by generateStartupWithRng but may not be defined
// in the session format. Provide stubs that callers can override.
function getPreStartupRngEntries(session) {
    if (!session?.steps) return [];
    // Chargen sessions: steps before key===null are pre-startup
    if (session.type === 'chargen') {
        const entries = [];
        for (const step of session.steps) {
            if (step.key === null) break;
            if (Array.isArray(step.rng)) entries.push(...step.rng);
        }
        return entries;
    }
    return [];
}

function consumeRngEntries(entries) {
    // Advance the RNG by calling it for each entry.
    // This is a no-op stub — the actual RNG is seeded and the entries
    // are consumed by the map generation that follows.
    // The real implementation would need to parse and replay each entry.
}
