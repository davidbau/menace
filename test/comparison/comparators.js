// test/comparison/comparators.js -- Pure comparison functions for session testing
//
// All functions in this module are pure (no side effects) and stateless.
// They compare data structures and return results without modifying anything.

import {
    COLNO, ROWNO, STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, STAIRS, VAULT,
    IS_WALL, IS_DOOR, ACCESSIBLE, SDOOR, SCORR, IRONBARS, CORR, isok,
} from '../../js/config.js';

// ---------------------------------------------------------------------------
// Terrain type names
// ---------------------------------------------------------------------------

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
// RNG trace comparison
// ---------------------------------------------------------------------------

// Check if a log entry is a mid-level function trace (>entry or <exit).
export function isMidlogEntry(entry) {
    return entry && entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

// Check if a log entry is a composite RNG function whose individual
// random number consumptions are not visible as separate rn2/rnd entries.
export function isCompositeEntry(entry) {
    return entry && (entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d('));
}

// Strip leading count prefix and trailing source tag from RNG entry.
// "1 rn2(12)=2 @ caller(file.js:45)" → "rn2(12)=2"
export function stripRngSourceTag(entry) {
    if (!entry || typeof entry !== 'string') return '';
    const noPrefix = entry.replace(/^\d+\s+/, '');
    const atIdx = noPrefix.indexOf(' @ ');
    return atIdx >= 0 ? noPrefix.substring(0, atIdx) : noPrefix;
}

// Convert JS log entry to compact session format.
// JS format: "1 rn2(12)=2" or "1 rn2(12)=2 @ caller(file.js:45)"
// Compact:   "rn2(12)=2"
export function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    return entry.replace(/^\d+\s+/, '');
}

// Extract the fn(arg)=result portion from a compact RNG entry, ignoring @ source tags.
export function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}

// Compare two RNG trace arrays.
// Returns { index: -1 } on match, or { index, js, session } at first divergence.
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

// Compare RNG arrays with filtering, return match stats and first divergence
export function compareRngArrays(jsRng = [], cRng = []) {
    const jsFiltered = jsRng.map(stripRngSourceTag).filter(e => !isMidlogEntry(e) && !isCompositeEntry(e));
    const cFiltered = cRng.map(stripRngSourceTag).filter(e => !isMidlogEntry(e) && !isCompositeEntry(e));
    const len = Math.min(jsFiltered.length, cFiltered.length);
    let matched = 0;
    let firstDivergence = null;
    for (let i = 0; i < len; i++) {
        if (jsFiltered[i] === cFiltered[i]) {
            matched++;
        } else if (!firstDivergence) {
            firstDivergence = { rngCall: i, expected: cFiltered[i], actual: jsFiltered[i] };
        }
    }
    return {
        matched,
        total: Math.max(jsFiltered.length, cFiltered.length),
        firstDivergence,
    };
}

// Return the JS index where the full session RNG prefix is consumed, or -1
// if JS and session diverge before session RNG is exhausted.
export function matchingJsPrefixLength(jsRng, sessionRng) {
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

// Find first comparable (non-midlog, non-composite) entry
export function firstComparableEntry(entries) {
    for (const e of entries || []) {
        if (isMidlogEntry(e)) continue;
        if (isCompositeEntry(rngCallPart(e))) continue;
        return e;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Screen comparison
// ---------------------------------------------------------------------------

// Compare two screen line arrays
export function compareScreens(jsLines, cLines) {
    const a = Array.isArray(jsLines) ? jsLines : [];
    const b = Array.isArray(cLines) ? cLines : [];
    const len = Math.max(a.length, b.length);
    let matching = 0;
    for (let i = 0; i < len; i++) {
        if ((a[i] || '') === (b[i] || '')) matching++;
    }
    return { matched: matching, total: len };
}

// ---------------------------------------------------------------------------
// Map validation functions
// ---------------------------------------------------------------------------

// Check that all rooms have complete wall borders
export function checkWallCompleteness(map) {
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
