// test/comparison/session_loader.js -- Session format normalization and loading.

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const keylogMetaCache = new Map();

function isFourteenDigitDatetime(value) {
    return typeof value === 'string' && /^\d{14}$/.test(value);
}

function keylogMetaFromPath(keylogPath) {
    if (!keylogPath || typeof keylogPath !== 'string') return null;
    const resolved = resolve(keylogPath);
    if (keylogMetaCache.has(resolved)) return keylogMetaCache.get(resolved);
    let out = null;
    try {
        if (existsSync(resolved)) {
            const firstLine = readFileSync(resolved, 'utf8').split(/\r?\n/, 1)[0] || '';
            if (firstLine.trim()) {
                const row = JSON.parse(firstLine);
                if (row?.type === 'meta') {
                    out = {
                        datetime: isFourteenDigitDatetime(row?.datetime) ? row.datetime : null,
                        recordedAt: (typeof row?.recordedAt === 'string' && row.recordedAt.length > 0)
                            ? row.recordedAt
                            : null,
                    };
                }
            }
        }
    } catch {
        out = null;
    }
    keylogMetaCache.set(resolved, out);
    return out;
}

function inferSessionDatetime(raw) {
    const fromOptions = raw?.options?.datetime;
    if (isFourteenDigitDatetime(fromOptions)) return fromOptions;
    const fromRegen = raw?.regen?.datetime;
    if (isFourteenDigitDatetime(fromRegen)) return fromRegen;
    const keylog = raw?.regen?.keylog;
    if (typeof keylog === 'string' && keylog.length > 0) {
        return keylogMetaFromPath(keylog)?.datetime || null;
    }
    return null;
}

function inferSessionRecordedAt(raw) {
    const fromOptions = raw?.options?.recordedAt;
    if (typeof fromOptions === 'string' && fromOptions.length > 0) return fromOptions;
    const fromRegen = raw?.regen?.recordedAt;
    if (typeof fromRegen === 'string' && fromRegen.length > 0) return fromRegen;
    const keylog = raw?.regen?.keylog;
    if (typeof keylog === 'string' && keylog.length > 0) {
        return keylogMetaFromPath(keylog)?.recordedAt || null;
    }
    return null;
}

export function stripAnsiSequences(text) {
    if (!text) return '';
    return String(text)
        // Preserve horizontal cursor-forward movement used in C captures
        // (e.g., "\x1b[9CVersion ...") as literal leading spaces.
        .replace(/\x1b\[(\d*)C/g, (_m, n) => ' '.repeat(Math.max(1, Number(n || '1'))))
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        .replace(/\x1b[@-Z\\-_]/g, '')
        .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '');
}

export function getSessionScreenLines(screenHolder) {
    if (typeof screenHolder?.screen === 'string') {
        return screenHolder.screen.split('\n').map((line) => stripAnsiSequences(line));
    }
    return [];
}

export function getSessionScreenAnsiLines(screenHolder) {
    if (typeof screenHolder?.screen === 'string') {
        // v3 canonical: ANSI-compressed screen is stored directly in `screen`.
        return screenHolder.screen.split('\n').map((line) => String(line || ''));
    }
    return [];
}

function deriveType(raw, fileName) {
    if (typeof raw?.type === 'string' && raw.type.length > 0) {
        return raw.type;
    }
    if (fileName.includes('_chargen')) return 'chargen';
    if (fileName.includes('_gameplay')) return 'gameplay';
    if (fileName.includes('_special_')) return 'special';
    if (fileName.startsWith('interface_')) return 'interface';
    if (fileName.includes('_map')) return 'map';
    return 'gameplay';
}

function normalizeStep(step, index) {
    const row = step || {};
    const rng = Array.isArray(row.rng) ? row.rng : [];
    const hasExplicitRngCalls = Number.isInteger(row.rngCalls);
    return {
        index,
        key: row.key ?? null,
        action: row.action ?? null,
        turn: Number.isInteger(row.turn) ? row.turn : null,
        depth: (typeof row.depth === 'string' && row.depth.length > 0) ? row.depth : null,
        rng,
        // Prefer explicit traces over count-only comparison. For captured
        // `rng: []`, leave rngCalls null so downstream uses compareRng()
        // semantics (ignoring midlog/composite entries) instead of raw length.
        rngCalls: hasExplicitRngCalls ? row.rngCalls : null,
        screen: getSessionScreenLines(row),
        screenAnsi: getSessionScreenAnsiLines(row),
        typGrid: normalizeGrid(row.typGrid),
        checkpoints: normalizeCheckpoints(row.checkpoints),
        // Cursor: [col, row] or [col, row, visible] — null if absent.
        cursor: Array.isArray(row.cursor) ? row.cursor : null,
    };
}

function decodeCell(cell) {
    if (typeof cell !== 'string' || cell.length === 0) return 0;
    if (/^\d+$/.test(cell)) return Number(cell);
    const code = cell.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48;        // 0..9
    if (code >= 97 && code <= 122) return 10 + (code - 97); // a..z => 10..35
    if (code >= 65 && code <= 90) return 36 + (code - 65);  // A..Z => 36..61
    return 0;
}

function decodeRleGridRow(row, rowWidth = 80) {
    if (!row) return new Array(rowWidth).fill(0);
    const out = [];
    const tokens = String(row).split(',').filter((token) => token.length > 0);
    for (const token of tokens) {
        const sep = token.indexOf(':');
        let count = 1;
        let cell = token;
        if (sep !== -1) {
            count = Number.parseInt(token.slice(0, sep), 10);
            cell = token.slice(sep + 1);
        }
        const value = decodeCell(cell);
        if (!Number.isInteger(count) || count < 1) continue;
        for (let i = 0; i < count; i++) out.push(value);
    }
    if (out.length < rowWidth) out.push(...new Array(rowWidth - out.length).fill(0));
    return out.slice(0, rowWidth);
}

function decodeRleGrid(grid, rowCount = 21, rowWidth = 80) {
    if (typeof grid !== 'string') return null;
    const rows = String(grid).split('|');
    const out = rows.map((row) => decodeRleGridRow(row, rowWidth));
    while (out.length < rowCount) out.push(new Array(rowWidth).fill(0));
    return out.slice(0, rowCount);
}

function normalizeGrid(grid) {
    if (Array.isArray(grid)) return grid;
    if (typeof grid === 'string') return decodeRleGrid(grid);
    return null;
}

// ---------------------------------------------------------------------------
// Compact mapdump format decoder (017-auto-mapdump)
// ---------------------------------------------------------------------------

/** Decode a single cell char from compact encoding: '0'-'9'->0-9, 'a'-'z'->10-35, 'A'-'Z'->36-61 */
function decodeCompactCell(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 48 && c <= 57) return c - 48;        // '0'-'9'
    if (c >= 97 && c <= 122) return c - 97 + 10;  // 'a'-'z'
    if (c >= 65 && c <= 90) return c - 65 + 36;   // 'A'-'Z'
    return 0;
}

/** Decode a compact RLE row: literal cell chars, with ~{count},{char} for runs of 3+. */
function decodeCompactRleRow(rowStr, rowWidth = 80) {
    const out = [];
    let i = 0;
    while (i < rowStr.length) {
        if (rowStr[i] === '~') {
            // RLE run: ~{count},{char}
            i++; // skip '~'
            let j = i;
            while (j < rowStr.length && rowStr[j] >= '0' && rowStr[j] <= '9') j++;
            const count = parseInt(rowStr.slice(i, j), 10);
            // Skip the comma separator between count and cell char
            if (j < rowStr.length && rowStr[j] === ',') j++;
            if (j < rowStr.length && count >= 1) {
                const val = decodeCompactCell(rowStr[j]);
                for (let k = 0; k < count; k++) out.push(val);
                i = j + 1;
            } else {
                i = j;
            }
        } else {
            // Literal cell character
            out.push(decodeCompactCell(rowStr[i]));
            i++;
        }
    }
    while (out.length < rowWidth) out.push(0);
    return out.slice(0, rowWidth);
}

/** Decode a compact RLE grid (rows separated by '|'). */
function decodeCompactRleGrid(gridStr, rowCount = 21, rowWidth = 80) {
    const rows = gridStr.split('|');
    const out = rows.map((row) => decodeCompactRleRow(row, rowWidth));
    while (out.length < rowCount) out.push(new Array(rowWidth).fill(0));
    return out.slice(0, rowCount);
}

/** Parse a sparse list like "x,y,otyp,quan;x,y,otyp,quan;..." */
function parseCompactSparseList(str, fieldCount) {
    if (!str || !str.trim()) return [];
    return str.split(';').filter(Boolean).map((item) => {
        const parts = item.split(',').map(Number);
        return parts.slice(0, fieldCount);
    });
}

function parseCompactSparseListVariable(str, minFieldCount = 1) {
    if (!str || !str.trim()) return [];
    return str.split(';').filter(Boolean).map((item) => {
        const parts = item.split(',').map(Number);
        if (parts.length < minFieldCount) return null;
        return parts;
    }).filter(Boolean);
}

/**
 * Parse a compact mapdump file content string into a structured checkpoint.
 * Returns parsed compact mapdump sections (grids, sparse lists, vectors).
 */
export function parseCompactMapdump(content) {
    if (!content) return null;
    const result = { _sections: {} };
    const lines = content.split('\n').filter(Boolean);
    for (const line of lines) {
        const prefix = line[0];
        const data = line.slice(1);
        result._sections[prefix] = true;
        switch (prefix) {
            case 'T': result.typGrid = decodeCompactRleGrid(data); break;
            case 'F': result.flagsGrid = decodeCompactRleGrid(data); break;
            case 'H': result.horizontalGrid = decodeCompactRleGrid(data); break;
            case 'L': result.litGrid = decodeCompactRleGrid(data); break;
            case 'R': result.roomnoGrid = decodeCompactRleGrid(data); break;
            case 'O': result.objects = parseCompactSparseList(data, 4); break;  // x,y,otyp,quan
            case 'M': result.monsters = parseCompactSparseList(data, 4); break; // x,y,mndx,mhp
            case 'K': result.traps = parseCompactSparseList(data, 3); break;    // x,y,ttyp
            case 'W': result.wallInfoGrid = decodeCompactRleGrid(data); break;
            case 'U': result.hero = data.split(',').map(Number); break;
            case 'A': result.anchor = data.split(',').map(Number); break;
            case 'C': result.context = data; break;
            case 'G': result.flags = data; break;
            case 'Q': result.objectDetails = parseCompactSparseListVariable(data, 4); break;
            case 'N': result.monsterDetails = parseCompactSparseListVariable(data, 4); break;
            case 'J': result.trapDetails = parseCompactSparseListVariable(data, 3); break;
            case 'E': result.engravings = parseCompactSparseListVariable(data, 3); break;
        }
    }
    return result;
}

function normalizeCheckpoints(checkpoints) {
    if (!Array.isArray(checkpoints)) return null;
    return checkpoints.map((cp) => ({
        ...cp,
        typGrid: normalizeGrid(cp?.typGrid),
        flagGrid: normalizeGrid(cp?.flagGrid),
        wallInfoGrid: normalizeGrid(cp?.wallInfoGrid),
    }));
}

function normalizeLevels(levels) {
    const list = Array.isArray(levels) ? levels : [];
    return list.map((level) => ({
        depth: Number.isInteger(level?.depth) ? level.depth : 1,
        typGrid: normalizeGrid(level?.typGrid),
        rng: Array.isArray(level?.rng) ? level.rng : [],
        rngCalls: Number.isInteger(level?.rngCalls) ? level.rngCalls : null,
        screen: getSessionScreenLines(level),
        screenAnsi: getSessionScreenAnsiLines(level),
        checkpoints: normalizeCheckpoints(level?.checkpoints),
        levelName: level?.levelName || null,
    }));
}

export function normalizeSession(raw, meta = {}) {
    const file = meta.file || raw?.file || 'unknown.session.json';
    const dir = meta.dir || raw?.dir || '';
    const version = Number.isInteger(raw?.version) ? raw.version : 1;
    const source = raw?.source || 'unknown';
    const seed = Number.isInteger(raw?.seed) ? raw.seed : 0;
    const type = deriveType(raw, file);
    const options = { ...(raw?.options || {}) };
    const inferredDatetime = inferSessionDatetime(raw);
    if (!options.datetime && inferredDatetime) {
        options.datetime = inferredDatetime;
    }
    const inferredRecordedAt = inferSessionRecordedAt(raw);
    if (!options.recordedAt && inferredRecordedAt) {
        options.recordedAt = inferredRecordedAt;
    }

    const sourceSteps = Array.isArray(raw?.steps) ? raw.steps : [];
    const startupFromStep = sourceSteps.length > 0
        && sourceSteps[0]?.key === null
        ? sourceSteps[0]
        : null;
    const startupRaw = raw?.startup || startupFromStep;

    const startup = startupRaw
        ? {
            rng: Array.isArray(startupRaw.rng) ? startupRaw.rng : [],
            rngCalls: Number.isInteger(startupRaw.rngCalls) ? startupRaw.rngCalls : null,
            screen: getSessionScreenLines(startupRaw),
            screenAnsi: getSessionScreenAnsiLines(startupRaw),
            typGrid: normalizeGrid(startupRaw.typGrid),
            checkpoints: normalizeCheckpoints(startupRaw.checkpoints),
        }
        : null;

    const replaySteps = startupFromStep ? sourceSteps.slice(1) : sourceSteps;
    const steps = replaySteps.map((step, index) => normalizeStep(step, index));

    // Compact mapdump checkpoints: { id: "file contents", ... }
    // Stored at session top level by run_session.py when NETHACK_MAPDUMP_DIR is set.
    const mapdumpCheckpoints = (raw?.checkpoints && typeof raw.checkpoints === 'object'
        && !Array.isArray(raw.checkpoints))
        ? raw.checkpoints
        : null;

    return {
        file,
        dir,
        meta: {
            version,
            source,
            seed,
            type,
            options,
            group: raw?.group || null,
            regen: raw?.regen || null,
            screenMode: raw?.screenMode || null,
        },
        startup,
        steps,
        levels: normalizeLevels(raw?.levels),
        mapdumpCheckpoints,
        raw,
    };
}

function readGoldenFile(relativePath, goldenBranch) {
    try {
        return execSync(`git show ${goldenBranch}:${relativePath}`, {
            encoding: 'utf8',
            maxBuffer: 20 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
    } catch {
        return null;
    }
}

function listGoldenDir(relativePath, goldenBranch) {
    try {
        const output = execSync(`git ls-tree --name-only ${goldenBranch}:${relativePath}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return output.trim().split('\n').filter(Boolean);
    } catch {
        return [];
    }
}

function loadSessionsFromDir(
    dir,
    {
        useGolden = false,
        goldenBranch = 'golden',
        recursive = false,
    } = {},
) {
    const repoRoot = process.cwd();
    const relativePath = dir.startsWith(repoRoot) ? dir.slice(repoRoot.length + 1) : dir;

    if (useGolden) {
        const queue = [''];
        const files = [];
        while (queue.length > 0) {
            const rel = queue.shift();
            const fullRel = rel ? `${relativePath}/${rel}` : relativePath;
            const entries = listGoldenDir(fullRel, goldenBranch);
            for (const entry of entries) {
                const child = rel ? `${rel}/${entry}` : entry;
                if (entry.endsWith('.session.json')) {
                    files.push(child);
                    continue;
                }
                if (!recursive) continue;
                // Heuristic: tree entries with no dot suffix are directories.
                if (!entry.includes('.')) queue.push(child);
            }
        }
        return files
            .map((file) => {
                const text = readGoldenFile(`${relativePath}/${file}`, goldenBranch);
                if (!text) return null;
                try {
                    return normalizeSession(JSON.parse(text), {
                        file,
                        dir: `golden:${relativePath}`,
                    });
                } catch {
                    return null;
                }
            })
            .filter(Boolean);
    }

    if (!existsSync(dir)) return [];

    const queue = [dir];
    const out = [];
    while (queue.length > 0) {
        const current = queue.shift();
        const entries = readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (recursive) queue.push(join(current, entry.name));
                continue;
            }
            if (!entry.name.endsWith('.session.json')) continue;
            try {
                const fullPath = join(current, entry.name);
                const text = readFileSync(fullPath, 'utf8');
                out.push(normalizeSession(JSON.parse(text), { file: entry.name, dir: current }));
            } catch {
                // Keep session loading resilient to malformed files.
            }
        }
    }
    return out;
}

function asTypeSet(typeFilter) {
    if (!typeFilter) return null;
    if (Array.isArray(typeFilter)) {
        return new Set(typeFilter.map((t) => String(t).trim()).filter(Boolean));
    }
    return new Set(String(typeFilter).split(',').map((t) => t.trim()).filter(Boolean));
}

export function loadAllSessions({
    sessionsDir,
    mapsDir,
    useGolden = false,
    goldenBranch = 'golden',
    typeFilter = null,
    sessionPath = null,
} = {}) {
    const typeSet = asTypeSet(typeFilter);

    if (sessionPath) {
        const resolved = resolve(sessionPath);
        const text = readFileSync(resolved, 'utf8');
        const normalized = normalizeSession(JSON.parse(text), {
            file: basename(resolved),
            dir: resolved.slice(0, resolved.length - basename(resolved).length - 1),
        });
        if (typeSet && !typeSet.has(normalized.meta.type)) return [];
        return [normalized];
    }

    const coverageDir = join(sessionsDir, 'coverage');
    const sessions = [
        ...loadSessionsFromDir(sessionsDir, { useGolden, goldenBranch }),
        ...loadSessionsFromDir(coverageDir, { useGolden, goldenBranch, recursive: true }),
        ...loadSessionsFromDir(mapsDir, { useGolden, goldenBranch }),
    ];

    const filtered = typeSet
        ? sessions.filter((session) => typeSet.has(session.meta.type))
        : sessions;

    return filtered.sort((a, b) => a.file.localeCompare(b.file));
}
