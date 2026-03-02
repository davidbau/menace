// test/comparison/session_runtime.js -- Session replay runtime utilities
//
// Phase 7 extracted runtime-heavy logic from session_helpers.js so helpers can
// stay small and focused on comparison/normalization wiring.

import {
    COLNO, ROWNO, STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, STAIRS, VAULT,
    IS_WALL, IS_DOOR, ACCESSIBLE, SDOOR, SCORR, IRONBARS,
    CORR, ROOM, DOOR, isok, TERMINAL_COLS, TERMINAL_ROWS,
    D_ISOPEN, D_CLOSED, D_LOCKED, D_NODOOR,
    ALTAR, FOUNTAIN, THRONE, SINK, GRAVE, POOL, MOAT, WATER, LAVAPOOL,
    LAVAWALL, ICE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD, TREE,
    MAP_ROW_START, STATUS_ROW_1, STATUS_ROW_2,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC
} from './config.js';
import { initRng, enableRngLog, getRngLog, disableRngLog } from './rng.js';
import { initLevelGeneration, makelevel, setGameSeed } from './dungeon.js';
import { DUNGEONS_OF_DOOM } from './special_levels.js';
import { simulatePostLevelInit } from './u_init.js';
import { mon_arrive } from './dog.js';
import { Player, roles, rankOf } from './player.js';
import { RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC } from './config.js';
import { SHOPBASE, ROOMOFFSET } from './config.js';
import { makemon } from './makemon.js';
import { pushInput } from './input.js';
import { initrack } from './monmove.js';
import { NetHackGame, maybe_deferred_goto_after_rhack, run_command } from './allmain.js';
import { HeadlessDisplay, createHeadlessInput } from './headless.js';

export { HeadlessDisplay };

// Terrain type names for readable diffs (matches C's levltyp[] in cmd.c)
export const TYP_NAMES = [
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

// Strip ANSI escape/control sequences from a terminal line.
export function stripAnsiSequences(text) {
    if (!text) return '';
    return String(text)
        // Preserve horizontal cursor-forward movement used in C captures
        // as literal leading spaces for stable screen comparisons.
        .replace(/\x1b\[(\d*)C/g, (_m, n) => ' '.repeat(Math.max(1, Number(n || '1'))))
        // CSI sequences (e.g. ESC[31m, ESC[0K)
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
        // OSC sequences (e.g. ESC]...BEL or ESC]...ESC\)
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        // Single-character ESC sequences (e.g. ESC(0, ESC)0)
        .replace(/\x1b[@-Z\\-_]/g, '')
        // Remaining raw C1 CSI
        .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '')
        // Remaining C0 controls (keep tab/newline semantics out of single line text)
        .replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
}

// Session screens may provide plain `screen`, richer `screenAnsi`, or both.
// Prefer ANSI when present, but normalize to plain text for existing comparisons.
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
// Session format helpers (v3 format only)
// ---------------------------------------------------------------------------

// Get startup data from a v3 session.
// V3 format: startup is the first step with key === null.
// Returns the startup object or null if not found.
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

    // Legacy v1 sessions keep startup data in a top-level `startup` field.
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

// Get character config from v3 session (from options field)
export function getSessionCharacter(session) {
    if (!session?.options) return {};
    let startupName = null;
    let startupRank = null;
    const startup = getSessionStartup(session);
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
    // Some recorded sessions have stale options.role metadata.
    // Prefer the startup statusline rank title when it uniquely maps to a role.
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
    return {
        name: startupName || session.options.name,
        role: roleFromStartup || session.options.role,
        race: session.options.race,
        gender: session.options.gender,
        align: session.options.align,
    };
}

// Get gameplay steps (excluding startup step in v3 format)
export function getSessionGameplaySteps(session) {
    if (!session?.steps) return [];

    // Skip first step if it's startup (key === null)
    if (session.steps.length > 0 && session.steps[0].key === null) {
        return session.steps.slice(1);
    }

    return session.steps;
}

// ---------------------------------------------------------------------------
// Grid comparison
// ---------------------------------------------------------------------------

// Parse a typ grid from text (21 lines of 80 space-separated integers)
export function parseTypGrid(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => line.trim().split(/\s+/).map(Number));
}

// Parse a typ grid from session format (array of arrays of numbers)
export function parseSessionTypGrid(grid) {
    if (!grid || !Array.isArray(grid)) return null;
    // Already in array-of-arrays format
    return grid;
}

// Compare two 21x80 grids, return array of diffs
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

// Format diffs for diagnostic output
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

// ---------------------------------------------------------------------------
// Sequential map generation (matching C's RNG stream)
// ---------------------------------------------------------------------------

// Extract a typ grid from a map object: 21 rows of 80 integers
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

// Generate levels 1→maxDepth sequentially on one continuous RNG stream.
// Returns { grids: { depth: number[][] }, maps: { depth: GameMap } }
export function generateMapsSequential(seed, maxDepth) {
    initrack(); // reset player track buffer between tests
    initRng(seed);
    setGameSeed(seed);

    // initLevelGeneration handles init_objects() and init_dungeons() internally
    // Pass roleIndex=11 for Valkyrie (matches C map test harness)
    initLevelGeneration(11);
    const grids = {};
    const maps = {};
    for (let depth = 1; depth <= maxDepth; depth++) {
        const map = makelevel(depth);
        // Note: wallification and place_lregion are now called inside makelevel

        grids[depth] = extractTypGrid(map);
        maps[depth] = map;
    }
    return { grids, maps };
}

// ---------------------------------------------------------------------------
// RNG trace capture and comparison
// ---------------------------------------------------------------------------

// Check if a log entry is a mid-level function trace (>entry or <exit).
function isMidlogEntry(entry) {
    return entry.length > 0 && (entry[0] === '>' || entry[0] === '<' || entry[0] === '~' || entry[0] === '^');
}

// Check if a log entry is a composite RNG function whose individual
// random number consumptions are not visible as separate rn2/rnd entries.
// - rne/rnz: internal rn2 calls ARE logged separately by C, so these
//   wrapper entries would cause double-counting during comparison.
// - d(): internal RND() calls bypass rn2 and are NOT logged individually.
//   Both C and JS log d() as a single entry, but old C session files
//   may have d() filtered out.  Skip during comparison for compatibility.
function isCompositeEntry(entry) {
    return entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d(');
}

// Convert JS log entry to compact session format.
// JS format: "1 rn2(12)=2" or "1 rn2(12)=2 @ caller(file.js:45)"
// Compact:   "rn2(12)=2" or "rn2(12)=2 @ caller(file.js:45)"
// Mid-level trace entries (>/<) are passed through unchanged.
function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    // Strip leading count prefix: "1 rn2(...)=result ..." → "rn2(...)=result ..."
    return entry.replace(/^\d+\s+/, '');
}

// Extract the fn(arg)=result portion from a compact RNG entry, ignoring @ source tags.
function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}


// Compare two RNG trace arrays.
// Returns { index: -1 } on match, or { index, js, session } at first divergence.
// Compares fn(arg)=result portion only (ignores @ source:line tags).
// Mid-level trace entries (>/<) from C sessions are skipped during comparison
// since JS does not (yet) emit them.
export function compareRng(jsRng, sessionRng) {
    let si = 0; // session index
    let ji = 0; // js index
    while (ji < jsRng.length && si < sessionRng.length) {
        // Skip midlog entries in session trace
        if (isMidlogEntry(sessionRng[si])) { si++; continue; }
        // Skip midlog entries in JS trace (future-proofing)
        if (isMidlogEntry(jsRng[ji])) { ji++; continue; }
        // Skip composite RNG entries (rne/rnz/d) in JS trace — see isCompositeEntry().
        if (isCompositeEntry(rngCallPart(jsRng[ji]))) { ji++; continue; }
        if (isCompositeEntry(rngCallPart(sessionRng[si]))) { si++; continue; }
        if (rngCallPart(jsRng[ji]) !== rngCallPart(sessionRng[si])) {
            return { index: ji, js: jsRng[ji], session: sessionRng[si] };
        }
        ji++;
        si++;
    }
    // Skip trailing midlog/composite entries
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

// Return the JS index where the full session RNG prefix is consumed, or -1
// if JS and session diverge before session RNG is exhausted.
function matchingJsPrefixLength(jsRng, sessionRng) {
    let si = 0;
    let ji = 0;
    while (ji < jsRng.length && si < sessionRng.length) {
        if (isMidlogEntry(sessionRng[si])) { si++; continue; }
        if (isMidlogEntry(jsRng[ji])) { ji++; continue; }
        if (isCompositeEntry(rngCallPart(jsRng[ji]))) { ji++; continue; }
        if (isCompositeEntry(rngCallPart(sessionRng[si]))) { si++; continue; }
        if (rngCallPart(jsRng[ji]) !== rngCallPart(sessionRng[si])) return -1;
        ji++;
        si++;
    }
    while (si < sessionRng.length
           && (isMidlogEntry(sessionRng[si]) || isCompositeEntry(rngCallPart(sessionRng[si])))) si++;
    while (ji < jsRng.length
           && (isMidlogEntry(jsRng[ji]) || isCompositeEntry(rngCallPart(jsRng[ji])))) ji++;
    if (si < sessionRng.length) return -1;
    return ji;
}

function firstComparableEntry(entries) {
    for (const e of entries || []) {
        if (isMidlogEntry(e)) continue;
        if (isCompositeEntry(rngCallPart(e))) continue;
        return e;
    }
    return null;
}

function replayPendingTraceEnabled() {
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    return env.WEBHACK_REPLAY_PENDING_TRACE === '1';
}

function replayPendingTrace(...args) {
    if (!replayPendingTraceEnabled()) return;
    console.log('[REPLAY_PENDING_TRACE]', ...args);
}

async function settleCommandOrInputWait(commandPromise, inputRuntime) {
    let done = false;
    let value;
    let error;
    commandPromise.then(
        (v) => { done = true; value = v; },
        (e) => { done = true; error = e; }
    );

    while (!done) {
        if (typeof inputRuntime?.isWaitingInput === 'function' && inputRuntime.isWaitingInput()) {
            return { done: false };
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (error) throw error;
    return { done: true, value };
}

// Generate levels 1→maxDepth with RNG trace capture.
// Returns { grids, maps, rngLogs } where rngLogs[depth] = { rngCalls, rng }.
export function generateMapsWithRng(seed, maxDepth) {
    initrack(); // reset player track buffer between tests
    initRng(seed);
    setGameSeed(seed);
    enableRngLog(); // Start logging RNG calls

    // initLevelGeneration handles init_objects() and init_dungeons() internally
    // Pass roleIndex=11 for Valkyrie (matches C map test harness)
    initLevelGeneration(11);
    const grids = {};
    const maps = {};
    const rngLogs = {};
    let harnessPlayer = null;
    let prevCount = 0;
    for (let depth = 1; depth <= maxDepth; depth++) {
        const previousMap = depth > 1 ? maps[depth - 1] : null;
        const map = makelevel(depth);
        // Note: wallification and place_lregion are now called inside makelevel

        grids[depth] = extractTypGrid(map);
        maps[depth] = map;

        // C map harness runs a full game as Valkyrie. Depth 1 includes
        // post-level init (pet creation, hero inventory, attributes, welcome).
        // Depth 2+ includes pet arrival via wizard_level_teleport.
        if (depth === 1) {
            harnessPlayer = new Player();
            harnessPlayer.initRole(11); // Valkyrie
            if (map.upstair) {
                harnessPlayer.x = map.upstair.x;
                harnessPlayer.y = map.upstair.y;
            }
            simulatePostLevelInit(harnessPlayer, map, 1);
        } else {
            // C ref: dog.c:474 mon_arrive — use real migration path.
            if (harnessPlayer && previousMap) {
                mon_arrive(previousMap, map, harnessPlayer, {
                    heroX: map.upstair.x,
                    heroY: map.upstair.y,
                });
            }
        }

        // Keep player position synchronized so subsequent level changes use
        // C-like adjacency checks for follower migration eligibility.
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
        // Filter out composite entries (rne, rnz, d) and midlog markers (>, <)
        // to match C map session comparison format.
        // Note: C session files contain midlog markers, but we filter them for comparison
        // since JS doesn't generate them (JS suppresses nested RNG logging instead).
        const filteredRng = compactRng.filter(e => {
            const call = rngCallPart(e);
            return !isCompositeEntry(call) && !isMidlogEntry(e);
        });
        const rngCalls = filteredRng.length;
        rngLogs[depth] = { rngCalls, rng: filteredRng };
        prevCount = fullLog.length;
    }
    disableRngLog();
    return { grids, maps, rngLogs };
}

// Map role name → roles[] index
const ROLE_INDEX = {};
for (let i = 0; i < roles.length; i++) ROLE_INDEX[roles[i].name] = i;

// Extract chargen+init keystrokes from a chargen session.
// Collects all keys needed during game.init(): character selection, lore/welcome
// more-prompts, and tutorial response — stopping at the game-ready marker.
// Returns [] for non-chargen sessions (wizard path uses character opts directly).
function getChargenKeys(session) {
    if (session.type !== 'chargen') return [];
    const keys = [];
    for (const step of (session.steps || [])) {
        if (step.key === null) break; // end of init phase
        if (typeof step.key === 'string' && step.key.length > 0) {
            keys.push(step.key);
        }
    }
    return keys;
}

// Detect when startup RNG is stored in step[0].rng instead of a separate startup field.
// This happens in:
// - v3 format: startup is intentionally the first step with key === null
// - Some keylog-derived sessions: startup.rng was empty, RNG recorded in step[0]
// In either case, replay output should be normalized for strict per-step comparison.
export function hasStartupBurstInFirstStep(session) {
    if (!session) return false;
    // V3 format: startup is the first step with key === null.
    return session.steps?.[0]?.key === null;
}

// Generate full startup (map gen + post-level init) with RNG trace capture.
// Matches the C startup sequence: o_init → dungeon_init → makelevel → wallification
// → player placement → simulatePostLevelInit (pet, inventory, attributes, welcome).
// For chargen sessions, pre-startup menu RNG calls are consumed first.
// Returns { grid, map, rngCalls, rng }.
export function generateStartupWithRng(seed, session) {
    initrack(); // reset player track buffer between tests
    enableRngLog();
    initRng(seed);
    setGameSeed(seed);

    // Determine role before level generation (needed for role-specific RNG)
    const charOpts = getSessionCharacter(session);
    const roleIndex = ROLE_INDEX[charOpts.role] ?? 11; // default Valkyrie

    // Chargen sessions have RNG consumed during character selection menus
    // (e.g., pick_align) before the newgame() startup. Consume those first.
    const preStartupEntries = getPreStartupRngEntries(session);
    consumeRngEntries(preStartupEntries);

    // Pass player's actual alignment and race so peace_minded() uses
    // them during level generation (C sets u.ualign.type before mklev).
    const alignMap0 = { lawful: 1, neutral: 0, chaotic: -1 };
    const raceMap0 = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
    initLevelGeneration(roleIndex, session.options?.wizard ?? true, {
        alignment: alignMap0[charOpts.align],
        race: raceMap0[charOpts.race],
    });

    const map = makelevel(1);
    // Note: wallification is now called inside makelevel

    // NOTE: Wizard mode (-D flag) enables omniscience for the PLAYER,
    // but does NOT make pets aware of trap locations (trap.tseen).
    // Traps are only seen when discovered during gameplay.
    // Removed automatic trap revelation here.

    const grid = extractTypGrid(map);

    // Set up player matching the session's character configuration
    const player = new Player();
    player.initRole(roleIndex);
    player.name = charOpts.name || 'Wizard';
    player.gender = charOpts.gender === 'female' ? 1 : 0;

    // Override alignment if session specifies one (for non-default alignment variants)
    const alignMap = { lawful: 1, neutral: 0, chaotic: -1 };
    if (charOpts.align && alignMap[charOpts.align] !== undefined) {
        player.alignment = alignMap[charOpts.align];
    }

    // Set race from session (default Human)
    const raceMap = { human: RACE_HUMAN, elf: RACE_ELF, dwarf: RACE_DWARF, gnome: RACE_GNOME, orc: RACE_ORC };
    player.race = raceMap[charOpts.race] ?? RACE_HUMAN;

    // Place player at upstair (matching C's u_on_upstairs)
    if (map.upstair) {
        player.x = map.upstair.x;
        player.y = map.upstair.y;
    }

    // Capture pre-chargen RNG count for isolating chargen calls
    const preChargenCount = getRngLog().length;

    // Post-level init: pet creation, inventory, attributes, welcome
    simulatePostLevelInit(player, map, 1);

    const fullLog = getRngLog();
    disableRngLog();

    // Strip pre-startup menu RNG calls from the log.
    // For chargen-type sessions, startup step's rng excludes chargen steps, so strip them.
    // For gameplay sessions with chargen, startup step's rng INCLUDES chargen RNG, so keep them.
    const stripCount = session.type === 'chargen' ? preStartupEntries.length : 0;
    const startupLog = fullLog.slice(stripCount);

    // Isolate chargen-only RNG (post-map: pet + inventory + attributes + welcome)
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

// ---------------------------------------------------------------------------
// Headless game replay for gameplay session testing
// ---------------------------------------------------------------------------

// Null display that swallows all output (for headless testing)
export async function replaySession(seed, session, opts = {}) {
    if (typeof globalThis.window === 'undefined') {
        globalThis.window = {};
    }
    initrack(); // clear hero track buffer between sessions
    enableRngLog();

    let stepAnimationBoundaries = [];
    const display = new HeadlessDisplay();
    const input = createHeadlessInput();
    const game = new NetHackGame({
        display,
        input,
        hooks: {
            onAnimationDelayBoundary: () => {
                if (!opts.captureScreens) return;
                const snap = {
                    screen: display.getScreenLines(),
                    screenAnsi: (typeof display.getScreenAnsiLines === 'function')
                        ? display.getScreenAnsiLines()
                        : null,
                };
                stepAnimationBoundaries.push(snap);
            },
        },
    });

    // Determine chargen keys for interactive chargen sessions
    const chargenKeys = getChargenKeys(session);
    for (const key of chargenKeys) {
        for (let i = 0; i < key.length; i++) {
            input.pushKey(key.charCodeAt(i));
        }
    }

    const sessionChar = getSessionCharacter(session);
    const tutorialEnabled = (opts.tutorial === true);
    const startDnum = Number.isInteger(opts.startDnum) ? opts.startDnum : undefined;
    const startDlevel = Number.isInteger(opts.startDlevel) ? opts.startDlevel : 1;
    const startDungeonAlign = Number.isInteger(opts.startDungeonAlign) ? opts.startDungeonAlign : undefined;

    const initOpts = chargenKeys.length > 0
        ? { seed, flags: { name: sessionChar.name || '' } }
        : {
            seed,
            wizard: session.options?.wizard ?? true,
            character: {
                role: sessionChar.role,
                name: sessionChar.name,
                gender: sessionChar.gender,
                race: sessionChar.race,
                align: sessionChar.align,
            },
            startDnum,
            startDlevel,
            dungeonAlignOverride: startDungeonAlign,
            flags: { tutorial: tutorialEnabled },
        };

    await game.init(initOpts);

    const sessionSymset = session?.options?.symset || session?.meta?.options?.symset;
    const decgraphicsMode = session.screenMode === 'decgraphics' || sessionSymset === 'DECgraphics';
    game.display.flags.DECgraphics = !!decgraphicsMode;
    game.flags.DECgraphics = !!decgraphicsMode;
    if (opts.flags && typeof opts.flags === 'object') {
        Object.assign(game.flags, opts.flags);
        (game.u || game.player).showExp = !!game.flags.showexp;
        (game.u || game.player).showTime = !!game.flags.time;
        (game.u || game.player).showScore = !!game.flags.showscore;
    }

    const startupLog = getRngLog();
    const startupRng = startupLog.map(toCompactRng);

    // Replay each step
    // C ref: allmain.c moveloop_core() step boundary analysis:
    //   Each step captures: rhack(player action) + context.move block (movemon + turnEnd)
    //   The context.move block runs AFTER rhack in the same moveloop_core iteration.
    //   This matches the JS ordering: rhack → movemon → turnEnd.
    //
    // C harness keystrokes are captured one-by-one, including count prefixes
    // ('0'..'9'). A following command can consume the accumulated count and run
    // multiple turns before the next captured keystroke.
    const allSteps = getSessionGameplaySteps(session);
    const maxSteps = Number.isInteger(opts.maxSteps)
        ? Math.max(0, Math.min(opts.maxSteps, allSteps.length))
        : allSteps.length;
    const stepResults = [];
    const byteResults = [];
    let pendingCommand = null;
    let pendingCount = 0;
    let lastCommand = null; // C ref: do_repeat() remembered command for Ctrl+A
    // game.pendingDeferredTimedTurn is used instead (game-level flag)

    const captureSnapshot = (rawLog, screen, screenAnsiOverride, stepIndex, byteIndex, key) => {
        const compact = rawLog.map(toCompactRng);
        const normalizedScreen = Array.isArray(screen)
            ? screen.map((line) => stripAnsiSequences(line))
            : [];
        const normalizedScreenAnsi = opts.captureScreens
            ? (Array.isArray(screenAnsiOverride)
                ? screenAnsiOverride
                : ((typeof game.display?.getScreenAnsiLines === 'function')
                    ? game.display.getScreenAnsiLines()
                    : null))
            : null;
        const frame = {
            key,
            stepIndex,
            byteIndex,
            rngCalls: rawLog.length,
            rng: compact,
            screen: normalizedScreen,
            screenAnsi: normalizedScreenAnsi,
        };
        byteResults.push(frame);
        return frame;
    };
    const applyPostRhack = (rhackResult) => {
        maybe_deferred_goto_after_rhack(game, rhackResult);
        return rhackResult;
    };
    const beginTimedCommand = (commandKey, countPrefix = 0) => (
        run_command(game, commandKey, {
            countPrefix: (Number.isInteger(countPrefix) && countPrefix > 0) ? countPrefix : 0,
            computeFov: true,
        })
    );

    for (let stepIndex = 0; stepIndex < maxSteps; stepIndex++) {
        stepAnimationBoundaries = [];
        const step = allSteps[stepIndex];
        (game.lev || game.map)._replayStepIndex = stepIndex;
        const stepStartCount = getRngLog().length;
        game._replayForceEnterRun = false;
        // pendingDeferredTimedTurn is consumed later (after the player's command)
        // so that the player's post-move position is in effect for monster
        // decisions like dog_goal's On_stairs check. See below.

        // Keep replay harness simple: execute captured keys directly.
        // Comparator logic handles sparse/legacy log flexibility.

        const stepFrames = [];
        const keyText = typeof step.key === 'string' ? step.key : '';
        for (let byteIndex = 0; byteIndex < keyText.length; byteIndex++) {
            const prevByteCount = getRngLog().length;
            const ch = keyText.charCodeAt(byteIndex);
            let capturedScreenOverride = null;
            let capturedScreenAnsiOverride = null;

            const isCountPrefixDigit = !!(
                !pendingCommand
                && keyText[byteIndex] >= '0'
                && keyText[byteIndex] <= '9'
            );
            // Keep blocking prompts/messages visible while waiting for more input.
            // C preserves existing topline while entering the first count digit.
            if (!pendingCommand && !isCountPrefixDigit) {
                game.display.clearRow(0);
                game.display.topMessage = null;
            }
            if (!pendingCommand
                && ((game.u || game.player)?.deathCause || (game.u || game.player)?.dead || ((game.u || game.player)?.hp || 0) <= 0)) {
                game.renderCurrentScreen();
                const raw = getRngLog().slice(prevByteCount);
                const frame = captureSnapshot(
                    raw,
                    opts.captureScreens ? game.display.getScreenLines() : undefined,
                    (typeof game.display?.getScreenAnsiLines === 'function')
                        ? game.display.getScreenAnsiLines()
                        : null,
                    stepIndex,
                    byteIndex,
                    keyText[byteIndex]
                );
                stepFrames.push(frame);
                continue;
            }

            // C ref: cmd.c:4958 — digit keys start count prefix accumulation.
            // First digit keeps prior topline; continued count (or leading zero)
            // updates topline to "Count: N". No time/RNG is consumed.
            if (!pendingCommand && ch >= 48 && ch <= 57) { // '0'-'9'
                const hadCount = pendingCount > 0;
                const digit = ch - 48;
                pendingCount = Math.min(32767, (pendingCount * 10) + digit);
                if (hadCount || digit === 0) {
                    game.display.clearRow(0);
                    game.display.topMessage = null;
                    game.display.putstr_message(`Count: ${pendingCount}`);
                }
                game.renderCurrentScreen();
                const raw = getRngLog().slice(prevByteCount);
                const frame = captureSnapshot(
                    raw,
                    opts.captureScreens ? game.display.getScreenLines() : undefined,
                    (typeof game.display?.getScreenAnsiLines === 'function')
                        ? game.display.getScreenAnsiLines()
                        : null,
                    stepIndex,
                    byteIndex,
                    keyText[byteIndex]
                );
                stepFrames.push(frame);
                continue;
            }

            if (pendingCommand) {
                replayPendingTrace(
                    `step=${stepIndex + 1}`,
                    `key=${JSON.stringify(keyText[byteIndex] || '')}`,
                    'pending-start'
                );
                pushInput(ch);
                const settled = await settleCommandOrInputWait(pendingCommand, game.input);
                replayPendingTrace(
                    `step=${stepIndex + 1}`,
                    `key=${JSON.stringify(keyText[byteIndex] || '')}`,
                    `settled=${settled.done ? 1 : 0}`
                );
                if (settled.done) {
                    applyPostRhack(settled.value);
                    pendingCommand = null;
                } else if (opts.captureScreens) {
                    capturedScreenOverride = game.display.getScreenLines();
                    capturedScreenAnsiOverride = (typeof game.display?.getScreenAnsiLines === 'function')
                        ? game.display.getScreenAnsiLines()
                        : null;
                }
            } else {
                let effectiveCh = ch;
                let countPrefixForRun = pendingCount > 0 ? pendingCount : 0;
                if (ch === 1) { // Ctrl+A
                    if (lastCommand) {
                        effectiveCh = lastCommand.key;
                        countPrefixForRun = lastCommand.count || 0;
                    } else {
                        const raw = getRngLog().slice(prevByteCount);
                        const frame = captureSnapshot(
                            raw,
                            opts.captureScreens ? game.display.getScreenLines() : undefined,
                            (typeof game.display?.getScreenAnsiLines === 'function')
                                ? game.display.getScreenAnsiLines()
                                : null,
                            stepIndex,
                            byteIndex,
                            keyText[byteIndex]
                        );
                        stepFrames.push(frame);
                        continue;
                    }
                }
                pendingCount = 0;

                // Execute the command once (one turn per keystroke).
                if (ch !== 1 && countPrefixForRun === 0) {
                    lastCommand = { key: ch, count: countPrefixForRun };
                }
                const commandPromise = beginTimedCommand(effectiveCh, countPrefixForRun);
                const settled = await settleCommandOrInputWait(commandPromise, game.input);
                if (!settled.done) {
                    pendingCommand = commandPromise;
                    replayPendingTrace(
                        `step=${stepIndex + 1}`,
                        `key=${JSON.stringify(keyText[byteIndex] || '')}`,
                        'setPending=1'
                    );
                    if (opts.captureScreens) {
                        capturedScreenOverride = game.display.getScreenLines();
                        capturedScreenAnsiOverride = (typeof game.display?.getScreenAnsiLines === 'function')
                            ? game.display.getScreenAnsiLines()
                            : null;
                    }
                } else {
                    applyPostRhack(settled.value);
                }
            }

            if (!pendingCommand) {
                game.renderCurrentScreen();
            }

            const raw = getRngLog().slice(prevByteCount);
            const frame = captureSnapshot(
                raw,
                opts.captureScreens ? (capturedScreenOverride || game.display.getScreenLines()) : undefined,
                capturedScreenAnsiOverride,
                stepIndex,
                byteIndex,
                keyText[byteIndex]
            );
            stepFrames.push(frame);
        }

        if (typeof opts.onStep === 'function') {
            opts.onStep({ stepIndex, step, game });
        }

        const stepRaw = getRngLog().slice(stepStartCount);
        const lastFrame = stepFrames[stepFrames.length - 1] || null;
        stepResults.push({
            rngCalls: stepRaw.length,
            rng: stepRaw.map(toCompactRng),
            screen: lastFrame ? lastFrame.screen : [],
            screenAnsi: lastFrame ? lastFrame.screenAnsi : null,
            byteFrames: stepFrames,
            animationBoundaries: stepAnimationBoundaries.slice(),
        });
    }

    // If session ends while a command is waiting for input, cancel it with ESC.
    if (pendingCommand) {
        pushInput(27);
        const settled = await Promise.race([
            pendingCommand.then(() => true, () => true),
            new Promise((resolve) => setTimeout(() => resolve(false), 20)),
        ]);
        // Some prompt flows can remain blocked even after a synthetic ESC;
        // don't let replay hang on EOF cleanup.
        if (!settled) {
            pushInput(13);
            await Promise.race([
                pendingCommand.then(() => true, () => true),
                new Promise((resolve) => setTimeout(() => resolve(false), 20)),
            ]);
        }
    }

    // Legacy keylog fixtures sometimes stored startup RNG in step 0. New v3
    // session flow keeps startup as a distinct channel, so preserve it by
    // default unless explicitly requested for backward compatibility.
    const foldStartupIntoStep0 = opts.startupBurstInFirstStep === true;
    let normalizedStartup = { rngCalls: startupRng.length, rng: startupRng };
    if (foldStartupIntoStep0) {
        normalizedStartup = { rngCalls: 0, rng: [] };
        if (stepResults.length > 0) {
            stepResults[0] = {
                rngCalls: startupRng.length + stepResults[0].rngCalls,
                rng: startupRng.concat(stepResults[0].rng),
                screen: stepResults[0].screen,
                screenAnsi: stepResults[0].screenAnsi,
            };
        }
    }

    disableRngLog();

    return {
        source: 'js-replay',
        startup: normalizedStartup,
        bytes: byteResults,
        steps: stepResults,
    };
}

// ---------------------------------------------------------------------------
// Structural validation tests (extracted from map_compare.test.js)
// ---------------------------------------------------------------------------

// Check that all rooms have complete wall borders
export function checkWallCompleteness(map, label) {
    const errors = [];
    for (const room of map.rooms) {
        // Top edge
        for (let x = room.lx - 1; x <= room.hx + 1; x++) {
            const y = room.ly - 1;
            if (!isok(x, y)) continue;
            const loc = map.at(x, y);
            if (!IS_WALL(loc.typ) && !IS_DOOR(loc.typ) && loc.typ !== CORR &&
                loc.typ !== SDOOR && loc.typ !== SCORR && loc.typ !== IRONBARS) {
                errors.push(`Gap in top wall at (${x},${y}): typ=${loc.typ}`);
            }
        }
        // Bottom edge
        for (let x = room.lx - 1; x <= room.hx + 1; x++) {
            const y = room.hy + 1;
            if (!isok(x, y)) continue;
            const loc = map.at(x, y);
            if (!IS_WALL(loc.typ) && !IS_DOOR(loc.typ) && loc.typ !== CORR &&
                loc.typ !== SDOOR && loc.typ !== SCORR && loc.typ !== IRONBARS) {
                errors.push(`Gap in bottom wall at (${x},${y}): typ=${loc.typ}`);
            }
        }
        // Left edge
        for (let y = room.ly - 1; y <= room.hy + 1; y++) {
            const x = room.lx - 1;
            if (!isok(x, y)) continue;
            const loc = map.at(x, y);
            if (!IS_WALL(loc.typ) && !IS_DOOR(loc.typ) && loc.typ !== CORR &&
                loc.typ !== SDOOR && loc.typ !== SCORR && loc.typ !== IRONBARS) {
                errors.push(`Gap in left wall at (${x},${y}): typ=${loc.typ}`);
            }
        }
        // Right edge
        for (let y = room.ly - 1; y <= room.hy + 1; y++) {
            const x = room.hx + 1;
            if (!isok(x, y)) continue;
            const loc = map.at(x, y);
            if (!IS_WALL(loc.typ) && !IS_DOOR(loc.typ) && loc.typ !== CORR &&
                loc.typ !== SDOOR && loc.typ !== SCORR && loc.typ !== IRONBARS) {
                errors.push(`Gap in right wall at (${x},${y}): typ=${loc.typ}`);
            }
        }
    }
    return errors;
}

// Check that all non-vault rooms are reachable from the first non-vault room
export function checkConnectivity(map) {
    const nonVaultRooms = map.rooms.filter(r => r.rtype !== VAULT);
    if (nonVaultRooms.length <= 1) return [];

    const start = nonVaultRooms[0];
    const sx = Math.floor((start.lx + start.hx) / 2);
    const sy = Math.floor((start.ly + start.hy) / 2);

    const visited = [];
    for (let x = 0; x < COLNO; x++) {
        visited[x] = new Uint8Array(ROWNO);
    }

    const queue = [[sx, sy]];
    visited[sx][sy] = 1;

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!isok(nx, ny)) continue;
            if (visited[nx][ny]) continue;
            const t = map.at(nx, ny).typ;
            if (ACCESSIBLE(t) || t === SDOOR || t === SCORR) {
                visited[nx][ny] = 1;
                queue.push([nx, ny]);
            }
        }
    }

    const errors = [];
    for (let i = 1; i < map.rooms.length; i++) {
        const room = map.rooms[i];
        if (room.rtype === VAULT) continue;
        const rx = Math.floor((room.lx + room.hx) / 2);
        const ry = Math.floor((room.ly + room.hy) / 2);
        if (!visited[rx][ry]) {
            errors.push(`Room ${i} (center ${rx},${ry}) is not reachable from room 0`);
        }
    }
    return errors;
}

// Check stairs are placed correctly
export function checkStairs(map, depth) {
    const errors = [];

    if (!map.dnstair || (map.dnstair.x === 0 && map.dnstair.y === 0)) {
        errors.push('No downstairs placed');
    } else {
        const loc = map.at(map.dnstair.x, map.dnstair.y);
        if (loc.typ !== STAIRS) {
            errors.push(`Downstairs at (${map.dnstair.x},${map.dnstair.y}) is not STAIRS, typ=${loc.typ}`);
        }
    }

    if (depth > 1) {
        if (!map.upstair || (map.upstair.x === 0 && map.upstair.y === 0)) {
            errors.push('No upstairs placed for depth > 1');
        } else {
            const loc = map.at(map.upstair.x, map.upstair.y);
            if (loc.typ !== STAIRS) {
                errors.push(`Upstairs at (${map.upstair.x},${map.upstair.y}) is not STAIRS, typ=${loc.typ}`);
            }
        }
    }

    return errors;
}

// Check grid dimensions
export function checkDimensions(grid) {
    const errors = [];
    if (grid.length !== ROWNO) {
        errors.push(`Expected ${ROWNO} rows, got ${grid.length}`);
    }
    for (let y = 0; y < grid.length; y++) {
        if (grid[y].length !== COLNO) {
            errors.push(`Row ${y} has ${grid[y].length} cols, expected ${COLNO}`);
        }
    }
    return errors;
}

// Check all typ values are valid
export function checkValidTypValues(grid) {
    const errors = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] < 0 || grid[y][x] >= TYP_NAMES.length) {
                errors.push(`Invalid typ ${grid[y][x]} at (${x},${y})`);
            }
        }
    }
    return errors;
}
