// test/comparison/gen_golden.js -- Generate golden reference maps for comparison tests
// Produces one text file per (seed, depth) combination in test/comparison/golden/
// Each file is an 80x21 character grid representing the terrain map.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    COLNO, ROWNO, STONE, VWALL, HWALL, TLCORNER, TRCORNER,
    BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, CORR, ROOM, STAIRS, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, IRONBARS, TREE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD, SDOOR, SCORR,
    D_ISOPEN, D_CLOSED, D_LOCKED
} from '../../js/config.js';
import { initRng } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GOLDEN_DIR = join(__dirname, 'golden');

// Terrain type to display character mapping
// Mirrors display.js terrainSymbol() but without requiring a DOM
const TERRAIN_CHAR = {
    [STONE]:           ' ',
    [VWALL]:           '|',
    [HWALL]:           '-',
    [TLCORNER]:        '-',
    [TRCORNER]:        '-',
    [BLCORNER]:        '-',
    [BRCORNER]:        '-',
    [CROSSWALL]:       '-',
    [TUWALL]:          '-',
    [TDWALL]:          '-',
    [TLWALL]:          '|',
    [TRWALL]:          '|',
    [CORR]:            '#',
    [ROOM]:            '.',
    [FOUNTAIN]:        '{',
    [THRONE]:          '\\',
    [SINK]:            '{',
    [GRAVE]:           '|',
    [ALTAR]:           '_',
    [POOL]:            '}',
    [MOAT]:            '}',
    [WATER]:           '}',
    [LAVAPOOL]:        '}',
    [LAVAWALL]:        '}',
    [ICE]:             '.',
    [IRONBARS]:        '#',
    [TREE]:            '#',
    [DRAWBRIDGE_UP]:   '#',
    [DRAWBRIDGE_DOWN]: '.',
    [AIR]:             ' ',
    [CLOUD]:           '#',
    [SDOOR]:           '|',   // default; overridden by horizontal check below
    [SCORR]:           ' ',
};

// Render a map location to its display character, matching display.js terrainSymbol()
function locToChar(loc) {
    const typ = loc.typ;

    // Door: depends on open/closed state
    if (typ === DOOR) {
        if (loc.flags & D_ISOPEN) return '.';
        if (loc.flags & (D_CLOSED | D_LOCKED)) return '+';
        return '.'; // D_NODOOR -- open doorway
    }

    // Stairs: up vs down
    if (typ === STAIRS) {
        return loc.flags === 1 ? '<' : '>';
    }

    // Secret door: looks like a wall
    if (typ === SDOOR) {
        return loc.horizontal ? '-' : '|';
    }

    const ch = TERRAIN_CHAR[typ];
    if (ch !== undefined) return ch;

    return '?'; // unknown terrain
}

// Render a GameMap to an array of 21 strings, each 80 characters wide
export function renderMap(map) {
    const rows = [];
    for (let y = 0; y < ROWNO; y++) {
        let line = '';
        for (let x = 0; x < COLNO; x++) {
            const loc = map.at(x, y);
            line += loc ? locToChar(loc) : ' ';
        }
        rows.push(line);
    }
    return rows;
}

// Generate a map for (seed, depth) and return rendered text
export function generateMapText(seed, depth) {
    initRng(seed);
    initLevelGeneration();
    const map = makelevel(depth);
    wallification(map);
    return renderMap(map);
}

// Test configurations
const CONFIGS = [
    { seed: 42,  depth: 1 },
    { seed: 42,  depth: 3 },
    { seed: 42,  depth: 5 },
    { seed: 100, depth: 1 },
    { seed: 100, depth: 3 },
    { seed: 100, depth: 5 },
    { seed: 999, depth: 1 },
    { seed: 999, depth: 3 },
    { seed: 999, depth: 5 },
    { seed: 7,   depth: 1 },
    { seed: 7,   depth: 3 },
    { seed: 7,   depth: 5 },
    { seed: 314, depth: 1 },
    { seed: 314, depth: 3 },
    { seed: 314, depth: 5 },
    { seed: 555, depth: 1 },
    { seed: 555, depth: 3 },
    { seed: 555, depth: 5 },
];

export { CONFIGS };

// When executed directly, write golden files
function main() {
    mkdirSync(GOLDEN_DIR, { recursive: true });

    for (const { seed, depth } of CONFIGS) {
        const rows = generateMapText(seed, depth);
        const filename = `seed${seed}_depth${depth}.txt`;
        const filepath = join(GOLDEN_DIR, filename);
        writeFileSync(filepath, rows.join('\n') + '\n', 'utf-8');
        console.log(`Wrote ${filepath}  (${rows.length} rows, ${rows[0].length} cols)`);
    }
    console.log('Golden reference generation complete.');
}

// Only run main() when this file is executed directly (not imported)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
}
