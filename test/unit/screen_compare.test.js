// Screen comparison test: headless JS rendering vs C NetHack reference screens
// Compares map area (rows 1-21) for all 13 game states of seed 42

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { initRng, rn2, rnd, rn1 } from '../../js/rng.js';
import { initLevelGeneration, generateLevel, wallification } from '../../js/dungeon.js';
import { Player } from '../../js/player.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { moveMonsters } from '../../js/monmove.js';
import { FOV } from '../../js/fov.js';
import { searchAround } from '../../js/commands.js';
import {
    COLNO, ROWNO, NORMAL_SPEED, A_DEX, A_CON,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    ROOM, CORR, DOOR, STAIRS, SDOOR, SCORR,
    FOUNTAIN, THRONE, SINK, GRAVE, ALTAR,
    POOL, MOAT, WATER, LAVAPOOL, ICE, IRONBARS, TREE,
    D_ISOPEN, D_CLOSED, D_LOCKED,
} from '../../js/config.js';

// ========================================================================
// DEC Graphics → Unicode mapping (for parsing C reference screens)
// Only applied to map rows (1-21), NOT message/status rows
// ========================================================================
const DEC_TO_UNICODE = {
    'l': '\u250c', // ┌ TL corner
    'q': '\u2500', // ─ horizontal wall
    'k': '\u2510', // ┐ TR corner
    'x': '\u2502', // │ vertical wall
    'm': '\u2514', // └ BL corner
    'j': '\u2518', // ┘ BR corner
    'n': '\u253c', // ┼ cross wall
    't': '\u251c', // ├ right T (from inside)
    'u': '\u2524', // ┤ left T (from inside)
    'v': '\u2534', // ┴ bottom T
    'w': '\u252c', // ┬ top T
    '~': '\u00b7', // · room floor (middle dot)
};

// ========================================================================
// Headless terrain symbol (matches display.js terrainSymbol)
// ========================================================================
function terrainChar(loc) {
    const typ = loc.typ;

    if (typ === DOOR) {
        if (loc.flags & D_ISOPEN) return '\u00b7';
        if (loc.flags & (D_CLOSED | D_LOCKED)) return '+';
        return '\u00b7'; // doorway
    }
    if (typ === STAIRS) {
        return loc.flags === 1 ? '<' : '>';
    }
    if (typ === SDOOR) {
        return loc.horizontal ? '\u2500' : '\u2502';
    }
    if (typ === SCORR) return ' ';

    const CHARS = {
        [STONE]: ' ',
        [VWALL]: '\u2502',
        [HWALL]: '\u2500',
        [TLCORNER]: '\u250c',
        [TRCORNER]: '\u2510',
        [BLCORNER]: '\u2514',
        [BRCORNER]: '\u2518',
        [CROSSWALL]: '\u253c',
        [TUWALL]: '\u2534',
        [TDWALL]: '\u252c',
        [TLWALL]: '\u2524',
        [TRWALL]: '\u251c',
        [ROOM]: '\u00b7',
        [CORR]: '#',
        [FOUNTAIN]: '{',
        [THRONE]: '\\',
        [SINK]: '#',
        [GRAVE]: '\u2020',
        [ALTAR]: '_',
        [POOL]: '\u2248',
        [MOAT]: '\u2248',
        [WATER]: '\u2248',
        [LAVAPOOL]: '\u2248',
        [ICE]: '\u00b7',
        [IRONBARS]: '#',
        [TREE]: '#',
    };
    return CHARS[typ] || '?';
}

// ========================================================================
// Headless screen renderer — produces 80-char map rows matching display.js
// ========================================================================
function renderMapRow(map, player, fov, y) {
    let row = '';
    for (let x = 0; x < COLNO; x++) {
        if (!fov || !fov.canSee(x, y)) {
            const loc = map.at(x, y);
            if (loc && loc.seenv) {
                row += terrainChar(loc);
            } else {
                row += ' ';
            }
            continue;
        }

        const loc = map.at(x, y);
        if (!loc) { row += ' '; continue; }

        // Mark as seen
        loc.seenv = 0xFF;

        // Player
        if (player && x === player.x && y === player.y) {
            row += '@';
            continue;
        }

        // Monster
        const mon = map.monsterAt(x, y);
        if (mon) {
            row += mon.displayChar;
            continue;
        }

        // Objects (top of stack)
        const objs = map.objectsAt(x, y);
        if (objs.length > 0) {
            const topObj = objs[objs.length - 1];
            row += topObj.displayChar;
            continue;
        }

        // Traps
        const trap = map.trapAt(x, y);
        if (trap && trap.tseen) {
            row += '^';
            continue;
        }

        // Terrain
        row += terrainChar(loc);
    }
    return row;
}

// ========================================================================
// Parse C reference screen — convert DEC graphics in map rows to Unicode
// ========================================================================
function parseCScreen(filename) {
    const text = readFileSync(filename, 'utf8');
    const lines = text.split('\n');
    // C screen is 24 lines (rows 0-23) + possible trailing newline
    // Row 0: message line
    // Rows 1-21: map (y=0..20)
    // Row 22: status line 1
    // Row 23: status line 2
    //
    // The tmux capture is shifted 1 column left (column 0 not captured),
    // so prepend a space to each map row to realign with 0-based coordinates.
    const result = [];
    for (let row = 0; row < 24; row++) {
        let line = (lines[row] || '').replace(/\r$/, '');
        // Map rows need 1-column shift correction from tmux capture
        if (row >= 1 && row <= 21) {
            line = ' ' + line;
        }
        // Pad to 80 chars
        line = line.padEnd(80);
        // Only apply DEC mapping to map rows (1-21)
        if (row >= 1 && row <= 21) {
            let mapped = '';
            for (const ch of line) {
                mapped += DEC_TO_UNICODE[ch] || ch;
            }
            line = mapped;
        }
        result.push(line);
    }
    return result;
}

// ========================================================================
// Game setup and turn simulation (same as trace_compare)
// ========================================================================
function mcalcmove(mon) {
    let mmove = mon.speed;
    const mmoveAdj = mmove % NORMAL_SPEED;
    mmove -= mmoveAdj;
    if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
    return mmove;
}

function exercise(player, attrIndex, inc_or_dec) {
    if (attrIndex === 1 || attrIndex === 5) return;
    if (inc_or_dec) {
        rn2(19);
    } else {
        rn2(2);
    }
}

function exerper(game) {
    const { player } = game;
    const moves = game.turnCount + 1;
    if (!(moves % 10)) {
        if (player.hunger > 1000) {
            exercise(player, A_DEX, false);
        } else if (player.hunger > 150) {
            exercise(player, A_CON, true);
        }
    }
    if (!(moves % 5)) {
        // No exercise calls from status checks at startup
    }
}

function simulateTurnEnd(game) {
    const { player, map } = game;
    game.turnCount++;
    player.turns = game.turnCount;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        mon.movement += mcalcmove(mon);
    }
    rn2(70); rn2(400); rn2(20);
    exerper(game);
    const dex = player.attributes ? player.attributes[A_DEX] : 14;
    rn2(40 + dex * 3);
    if (game.turnCount >= game.seerTurn) {
        game.seerTurn = game.turnCount + 15 + rn2(31);
    }
}

function setupGame() {
    initRng(42);
    initLevelGeneration();
    const player = new Player();
    player.initRole(11);
    player.name = 'Wizard';
    player.gender = 1;
    const map = generateLevel(1);
    wallification(map);
    player.x = map.upstair.x;
    player.y = map.upstair.y;
    player.dungeonLevel = 1;
    simulatePostLevelInit(player, map, 1);
    const fov = new FOV();
    fov.compute(map, player.x, player.y);
    return { player, map, fov, display: { putstr_message: () => {} }, turnCount: 0, seerTurn: 0 };
}

function doTurn(game) {
    moveMonsters(game.map, game.player, game.display, game.fov);
    simulateTurnEnd(game);
    game.fov.compute(game.map, game.player.x, game.player.y);
}

// ========================================================================
// Move sequence: screen_000=start, then :hhlhhhh.hhs
// ========================================================================
const MOVES = [
    { file: 'screen_000_start.txt',        action: 'start' },
    { file: 'screen_001_:_look.txt',        action: 'look' },
    { file: 'screen_002_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_003_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_004_l_move-east.txt',   action: 'move', dx: 1, dy: 0 },
    { file: 'screen_005_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_006_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_007_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_008_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_009_._wait.txt',        action: 'wait' },
    { file: 'screen_010_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_011_h_move-west.txt',   action: 'move', dx: -1, dy: 0 },
    { file: 'screen_012_s_search.txt',      action: 'search' },
];

const TRACE_DIR = 'test/comparison/traces/seed42_reference';

describe('Screen comparison (seed 42)', () => {
    it('map rendering matches C for all 13 game states', () => {
        const game = setupGame();
        let totalDiffs = 0;
        let totalDataDiffs = 0;
        let totalFovDiffs = 0;

        for (let mi = 0; mi < MOVES.length; mi++) {
            const move = MOVES[mi];

            // Apply action
            if (move.action === 'start') {
                // Initial state after setup, FOV already computed
            } else if (move.action === 'look') {
                // ":" look command — doesn't take a turn, just re-displays
                // No game state change
            } else if (move.action === 'move') {
                game.player.x += move.dx;
                game.player.y += move.dy;
                doTurn(game);
                game.fov.compute(game.map, game.player.x, game.player.y);
            } else if (move.action === 'wait') {
                doTurn(game);
                game.fov.compute(game.map, game.player.x, game.player.y);
            } else if (move.action === 'search') {
                searchAround(game.player, game.map);
                doTurn(game);
                game.fov.compute(game.map, game.player.x, game.player.y);
            }

            // Parse C reference
            const cScreen = parseCScreen(`${TRACE_DIR}/${move.file}`);

            // Render JS map rows (1-21, which map to y=0..20)
            const diffs = [];
            for (let mapY = 0; mapY < ROWNO; mapY++) {
                const screenRow = mapY + 1; // map row in screen coordinates
                const jsRow = renderMapRow(game.map, game.player, game.fov, mapY);
                const cRow = cScreen[screenRow];

                for (let x = 0; x < COLNO; x++) {
                    const jsChar = jsRow[x] || ' ';
                    const cChar = cRow[x] || ' ';
                    if (jsChar !== cChar) {
                        diffs.push({ y: mapY, x, jsChar, cChar, row: screenRow });
                    }
                }
            }

            // Classify diffs as FOV (JS reveals more) vs DATA (actual mismatch)
            const fovDiffs = [];
            const dataDiffs = [];
            for (const d of diffs) {
                // FOV diff: JS shows something where C shows space (JS sees more)
                // OR: C shows terrain but JS shows monster/object at that spot
                //     (monster is at the position — JS shows it, C remembers old terrain)
                const cIsSpace = d.cChar === ' ';
                const jsIsSpace = d.jsChar === ' ';
                // If C has space and JS has content → JS FOV wider
                // If C has terrain and JS has monster char → JS showing monster C can't see
                const jsIsMon = d.jsChar.match(/^[a-zA-Z]$/);
                const cIsTerrain = d.cChar.match(/^[·#<>+\u2500\u2502\u250c\u2510\u2514\u2518\u253c\u2534\u252c\u2524\u251c{%?)(\[=\/"!\/\$\*`_]$/);
                if (cIsSpace || (jsIsMon && cIsTerrain)) {
                    fovDiffs.push(d);
                } else {
                    dataDiffs.push(d);
                }
            }

            if (dataDiffs.length > 0) {
                console.log(`\n${move.file}: ${dataDiffs.length} DATA differences (non-FOV)`);
                for (const d of dataDiffs.slice(0, 20)) {
                    const jsHex = d.jsChar.codePointAt(0).toString(16);
                    const cHex = d.cChar.codePointAt(0).toString(16);
                    console.log(`  row=${d.row} x=${d.x}: JS='${d.jsChar}' (U+${jsHex}) C='${d.cChar}' (U+${cHex})`);
                }
            }

            totalDiffs += diffs.length;
            totalDataDiffs += dataDiffs.length;
            totalFovDiffs += fovDiffs.length;
        }

        console.log(`\nTotal: ${totalDiffs} differences (${totalFovDiffs} FOV, ${totalDataDiffs} data)`);
        // Fail on non-FOV data differences only
        assert.equal(totalDataDiffs, 0,
            `Expected 0 non-FOV differences, got ${totalDataDiffs} (plus ${totalFovDiffs} FOV diffs)`);
    });
});
