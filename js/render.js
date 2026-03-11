// render.js — Shared rendering logic for all display frontends.
// Contains any rendering decisions (glyph selection, symbol lookup, color) that
// do not depend on HTML/DOM or headless-specific infrastructure, so that
// display.js (browser) and headless.js (Node.js test runner) can both import
// from here rather than duplicating logic.
// C ref: display.c

import {
    COLNO, ROWNO,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, CORR, ROOM, STAIRS, LADDER,
    ALTAR, FOUNTAIN, THRONE, SINK, GRAVE, POOL, MOAT, WATER, LAVAPOOL,
    LAVAWALL, ICE, IRONBARS, TREE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    AIR, CLOUD, SDOOR, SCORR,
    D_ISOPEN, D_CLOSED, D_LOCKED,
    IS_WALL, Amask2align,
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, NO_COLOR, CLR_ORANGE, CLR_BRIGHT_GREEN,
    CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, CLR_WHITE,
    HI_METAL, HI_WOOD, HI_GOLD, HI_ZAP,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
} from './const.js';
import { defsyms, trap_to_defsym } from './symbols.js';
import { strongmonst } from './mondata.js';

// Re-export shared render constants from const.js for existing imports.
export {
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, NO_COLOR, CLR_ORANGE, CLR_BRIGHT_GREEN,
    CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, CLR_WHITE,
    HI_METAL, HI_WOOD, HI_GOLD, HI_ZAP,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
};

// ============================================================================
// Terrain symbol tables
// C ref: dat/symbols (ASCII and DECgraphics symsets)
// ============================================================================
const TERRAIN_SYMBOLS_ASCII = {
    [STONE]:          { ch: ' ',   color: CLR_GRAY },
    [VWALL]:          { ch: '|',   color: CLR_GRAY },
    [HWALL]:          { ch: '-',   color: CLR_GRAY },
    [TLCORNER]:       { ch: '-',   color: CLR_GRAY },
    [TRCORNER]:       { ch: '-',   color: CLR_GRAY },
    [BLCORNER]:       { ch: '-',   color: CLR_GRAY },
    [BRCORNER]:       { ch: '-',   color: CLR_GRAY },
    [CROSSWALL]:      { ch: '-',   color: CLR_GRAY },
    [TUWALL]:         { ch: '-',   color: CLR_GRAY },
    [TDWALL]:         { ch: '-',   color: CLR_GRAY },
    [TLWALL]:         { ch: '|',   color: CLR_GRAY },
    [TRWALL]:         { ch: '|',   color: CLR_GRAY },
    [DOOR]:           { ch: '+',   color: CLR_BROWN },
    [CORR]:           { ch: '#',   color: CLR_GRAY },
    [ROOM]:           { ch: '.',   color: CLR_GRAY },
    [STAIRS]:         { ch: '<',   color: CLR_GRAY },
    [FOUNTAIN]:       { ch: '{',   color: CLR_BRIGHT_BLUE },
    [THRONE]:         { ch: '\\',  color: HI_GOLD },
    [SINK]:           { ch: '{',   color: CLR_WHITE },
    [GRAVE]:          { ch: '|',   color: CLR_WHITE },
    [ALTAR]:          { ch: '_',   color: CLR_GRAY },
    [POOL]:           { ch: '}',   color: CLR_BLUE },
    [MOAT]:           { ch: '}',   color: CLR_BLUE },
    [WATER]:          { ch: '}',   color: CLR_BRIGHT_BLUE },
    [LAVAPOOL]:       { ch: '}',   color: CLR_RED },
    [LAVAWALL]:       { ch: '}',   color: CLR_ORANGE },
    [ICE]:            { ch: '.',   color: CLR_CYAN },
    [IRONBARS]:       { ch: '#',   color: HI_METAL },
    [TREE]:           { ch: '#',   color: CLR_GREEN },
    [DRAWBRIDGE_UP]:  { ch: '#',   color: CLR_BROWN },
    [DRAWBRIDGE_DOWN]:{ ch: '.',   color: CLR_BROWN },
    [AIR]:            { ch: ' ',   color: CLR_CYAN },
    [CLOUD]:          { ch: '#',   color: CLR_GRAY },
    [SDOOR]:          { ch: '|',   color: CLR_GRAY },
    [SCORR]:          { ch: ' ',   color: CLR_GRAY },
};

// DECgraphics terrain symbols (box-drawing characters)
// C ref: dat/symbols DECgraphics symset
const TERRAIN_SYMBOLS_DEC = {
    [STONE]:          { ch: ' ',       color: CLR_GRAY },
    [VWALL]:          { ch: '\u2502',  color: CLR_GRAY },   // BOX VERT
    [HWALL]:          { ch: '\u2500',  color: CLR_GRAY },   // BOX HORIZ
    [TLCORNER]:       { ch: '\u250c',  color: CLR_GRAY },   // BOX TL
    [TRCORNER]:       { ch: '\u2510',  color: CLR_GRAY },   // BOX TR
    [BLCORNER]:       { ch: '\u2514',  color: CLR_GRAY },   // BOX BL
    [BRCORNER]:       { ch: '\u2518',  color: CLR_GRAY },   // BOX BR
    [CROSSWALL]:      { ch: '\u253c',  color: CLR_GRAY },   // BOX CROSS
    [TUWALL]:         { ch: '\u2534',  color: CLR_GRAY },   // BOX UP-T
    [TDWALL]:         { ch: '\u252c',  color: CLR_GRAY },   // BOX DOWN-T
    [TLWALL]:         { ch: '\u2524',  color: CLR_GRAY },   // BOX LEFT-T
    [TRWALL]:         { ch: '\u251c',  color: CLR_GRAY },   // BOX RIGHT-T
    [DOOR]:           { ch: '+',       color: CLR_BROWN },
    [CORR]:           { ch: '#',       color: CLR_GRAY },
    [ROOM]:           { ch: '\u00b7', color: CLR_GRAY },    // MIDDLE DOT
    [STAIRS]:         { ch: '<',       color: CLR_GRAY },
    [FOUNTAIN]:       { ch: '{',       color: CLR_BRIGHT_BLUE },
    [THRONE]:         { ch: '\\',      color: HI_GOLD },
    [SINK]:           { ch: '{',       color: CLR_WHITE },
    [GRAVE]:          { ch: '\u2020',  color: CLR_WHITE },  // DAGGER
    [ALTAR]:          { ch: '\u03c0',  color: CLR_GRAY },   // PI (DEC meta-{)
    // C ref: dat/symbols DECgraphics
    // S_pool/S_water/S_lava/S_lavawall use meta-\ (DEC diamond).
    [POOL]:           { ch: '\u25c6',  color: CLR_BLUE },   // BLACK DIAMOND
    [MOAT]:           { ch: '\u25c6',  color: CLR_BLUE },
    [WATER]:          { ch: '\u25c6',  color: CLR_BRIGHT_BLUE },
    [LAVAPOOL]:       { ch: '\u25c6',  color: CLR_RED },
    [LAVAWALL]:       { ch: '\u25c6',  color: CLR_ORANGE },
    [ICE]:            { ch: '\u00b7', color: CLR_CYAN },    // MIDDLE DOT
    // C ref: dat/symbols DECgraphics
    // S_bars: meta-| (not-equals), S_tree: meta-g (plus-or-minus).
    [IRONBARS]:       { ch: '\u2260',  color: HI_METAL },   // NOT EQUAL TO
    [TREE]:           { ch: '\u00b1',  color: CLR_GREEN },  // PLUS-MINUS
    [DRAWBRIDGE_UP]:  { ch: '#',       color: CLR_BROWN },
    [DRAWBRIDGE_DOWN]:{ ch: '\u00b7', color: CLR_BROWN },   // MIDDLE DOT
    [AIR]:            { ch: ' ',       color: CLR_CYAN },
    [CLOUD]:          { ch: '#',       color: CLR_GRAY },
    [SDOOR]:          { ch: '\u2502',  color: CLR_GRAY },   // BOX VERT
    [SCORR]:          { ch: ' ',       color: CLR_GRAY },
};

// ============================================================================
// Trap glyph helper
// C ref: display.c _trapGlyph / trap_to_defsym(ttyp) + defsyms[] in defsym.h
// ============================================================================
export function trapGlyph(ttyp) {
    const idx = trap_to_defsym(ttyp);
    const sym = (idx >= 0 && idx < defsyms.length) ? defsyms[idx] : null;
    return {
        ch:    sym?.ch    || '^',
        color: Number.isInteger(sym?.color) ? sym.color : CLR_MAGENTA,
        name:  sym?.desc  || 'trap',
    };
}

// ============================================================================
// Wall helpers (used by terrainSymbol for doors and secret doors)
// ============================================================================

// C ref: display.c glyph_at() — door orientation based on E/W wall neighbors.
export function isDoorHorizontal(gameMap, x, y) {
    if (!gameMap || x < 0 || y < 0) return false;
    const hasWallEast = x + 1 < COLNO && IS_WALL(gameMap.at(x + 1, y)?.typ || 0);
    const hasWallWest = x - 1 >= 0   && IS_WALL(gameMap.at(x - 1, y)?.typ || 0);
    return hasWallEast || hasWallWest;
}

// C ref: display.c — SDOOR renders as the wall type its neighbors imply.
export function determineWallType(gameMap, x, y) {
    if (!gameMap || x < 0 || y < 0) return VWALL;
    const N = y - 1 >= 0    && IS_WALL(gameMap.at(x,     y - 1)?.typ || 0);
    const S = y + 1 < ROWNO && IS_WALL(gameMap.at(x,     y + 1)?.typ || 0);
    const E = x + 1 < COLNO && IS_WALL(gameMap.at(x + 1, y    )?.typ || 0);
    const W = x - 1 >= 0    && IS_WALL(gameMap.at(x - 1, y    )?.typ || 0);
    if (N && W && !S && !E) return TLCORNER;
    if (N && E && !S && !W) return TRCORNER;
    if (S && W && !N && !E) return BLCORNER;
    if (S && E && !N && !W) return BRCORNER;
    if (N && S && E && !W) return TRWALL;
    if (N && S && W && !E) return TLWALL;
    if (E && W && N && !S) return TUWALL;
    if (E && W && S && !N) return TDWALL;
    if (N && S && E && W)  return CROSSWALL;
    if ((N || S) && !E && !W) return VWALL;
    if ((E || W) && !N && !S) return HWALL;
    return VWALL;
}

// ============================================================================
// terrainSymbol — canonical glyph + color for a map location
// C ref: display.c back_to_glyph(), defsym.h PCHAR definitions
//
// flags: { useDEC: bool, lit_corridor: bool }
// Returns { ch, color }.
// ============================================================================
export function terrainSymbol(loc, gameMap = null, x = -1, y = -1, flags = {}) {
    const typ = loc.typ;
    const useDEC = flags.DECgraphics || false;
    const TERRAIN_SYMBOLS = useDEC ? TERRAIN_SYMBOLS_DEC : TERRAIN_SYMBOLS_ASCII;

    // C ref: display.c wall_angle() — T-wall glyph depends on seenv viewing angle.
    if (typ === TDWALL || typ === TUWALL || typ === TLWALL || typ === TRWALL) {
        const seenv = loc.seenv || 0;
        if (!seenv) return TERRAIN_SYMBOLS[STONE] || { ch: ' ', color: CLR_GRAY };
        const displayTyp = wallAngleTWall(typ, seenv, loc.flags || 0);
        return TERRAIN_SYMBOLS[displayTyp] || { ch: ' ', color: CLR_GRAY };
    }

    // Handle door states
    // C ref: defsym.h S_vodoor / S_hodoor
    if (typ === DOOR) {
        if (loc.flags & D_ISOPEN) {
            const horiz = isDoorHorizontal(gameMap, x, y);
            return useDEC
                ? { ch: '\u2592', color: CLR_BROWN }  // DEC checkerboard
                : { ch: horiz ? '|' : '-', color: CLR_BROWN };
        }
        if (loc.flags & D_CLOSED || loc.flags & D_LOCKED) {
            return { ch: '+', color: CLR_BROWN };
        }
        // Doorway (no door)
        return useDEC
            ? { ch: '\u00b7', color: CLR_GRAY }
            : { ch: '.', color: CLR_GRAY };
    }

    // Stairs direction
    if (typ === STAIRS) {
        const isBranchStair = !!loc.branchStair;
        return loc.flags === 1
            ? { ch: '<', color: isBranchStair ? HI_GOLD : CLR_GRAY }
            : { ch: '>', color: isBranchStair ? HI_GOLD : CLR_GRAY };
    }

    // Ladders — C ref: dat/symbols DECgraphics S_upladder/S_dnladder
    // DEC: ≤ (up) / ≥ (down); ASCII: < / >
    if (typ === LADDER) {
        const up = loc.flags === 1;
        return useDEC
            ? { ch: up ? '\u2264' : '\u2265', color: CLR_GRAY }
            : { ch: up ? '<' : '>', color: CLR_GRAY };
    }

    // Altar alignment color
    // C ref: display.h altar_color enum — without USE_GENERAL_ALTAR_COLORS
    // (the default build), all altar alignments render as CLR_GRAY.
    if (typ === ALTAR) {
        const altarCh = useDEC ? '\u03c0' : '_'; // DEC: pi; ASCII: underscore
        return { ch: altarCh, color: CLR_GRAY };
    }

    // C ref: display.c wall_angle() SDOOR case:
    // - arboreal secret door -> tree
    // - otherwise horizontal ? HWALL : VWALL
    // - apply wall visibility angle/mode; may render as stone
    if (typ === SDOOR) {
        if (loc.arboreal_sdoor) {
            return TERRAIN_SYMBOLS[TREE] || { ch: '#', color: CLR_GREEN };
        }
        const wallType = loc.horizontal ? HWALL : VWALL;
        if (!wallIsVisible(wallType, loc.seenv || 0, loc.flags || 0)) {
            return TERRAIN_SYMBOLS[STONE] || { ch: ' ', color: CLR_GRAY };
        }
        return TERRAIN_SYMBOLS[wallType] || TERRAIN_SYMBOLS[VWALL];
    }

    // Lit corridor option
    if (typ === CORR && flags.lit_corridor) {
        return { ch: '#', color: CLR_CYAN };
    }

    return TERRAIN_SYMBOLS[typ] || { ch: '?', color: CLR_MAGENTA };
}

// ============================================================================
// C ref: display.c:3502-3765 wall_angle() — visibility check portion.
// Returns true if a wall cell should render as its wall type;
// false if the viewing angle means it should show as blank stone.
// ============================================================================
export function wallIsVisible(typ, seenv, wallInfo) {
    if (!seenv) return false;
    const mode = wallInfo & WM_MASK;
    switch (typ) {
    case VWALL:
        if (mode === 0) return true;
        if (mode === 1) return !!(seenv & (SV1 | SV2 | SV3 | SV4 | SV5));
        if (mode === 2) return !!(seenv & (SV0 | SV1 | SV5 | SV6 | SV7));
        return true;
    case HWALL:
        if (mode === 0) return true;
        if (mode === 1) return !!(seenv & (SV3 | SV4 | SV5 | SV6 | SV7));
        if (mode === 2) return !!(seenv & (SV0 | SV1 | SV2 | SV3 | SV7));
        return true;
    case TLCORNER:
        if (mode === 0) return true;
        if (mode === WM_C_OUTER) return !!(seenv & (SV3 | SV4 | SV5));
        if (mode === WM_C_INNER) return !!(seenv & ~SV4);
        return true;
    case TRCORNER:
        if (mode === 0) return true;
        if (mode === WM_C_OUTER) return !!(seenv & (SV5 | SV6 | SV7));
        if (mode === WM_C_INNER) return !!(seenv & ~SV6);
        return true;
    case BLCORNER:
        if (mode === 0) return true;
        if (mode === WM_C_OUTER) return !!(seenv & (SV1 | SV2 | SV3));
        if (mode === WM_C_INNER) return !!(seenv & ~SV2);
        return true;
    case BRCORNER:
        if (mode === 0) return true;
        if (mode === WM_C_OUTER) return !!(seenv & (SV7 | SV0 | SV1));
        if (mode === WM_C_INNER) return !!(seenv & ~SV0);
        return true;
    default:
        // T-walls, crosswalls, and other types: visible whenever seenv > 0
        return true;
    }
}

// ============================================================================
// C ref: display.c:3502-3586 wall_angle() T-wall section.
// Returns the terrain type to DISPLAY for a T-wall (TDWALL/TUWALL/TLWALL/TRWALL),
// taking into account which octants the player has seen the cell from (seenv)
// and the wall_info mode bits in wallInfo.
//
// All four T-wall orientations are rotated to the TDWALL canonical orientation
// before pattern-matching, then the result is mapped back through wall_matrix.
// May return STONE if the viewing angle reveals no arm of the junction.
// ============================================================================
export function wallAngleTWall(typ, seenv, wallInfo) {
    // Wall matrix rows: each row maps T-result columns to the real terrain type
    // for that T-wall orientation.  C ref: display.c:3405-3410 wall_matrix[4][5].
    // Columns: [T_stone=0, T_tlcorn=1, T_trcorn=2, T_hwall=3, T_tdwall=4]
    const WM = [
        [STONE, TLCORNER, TRCORNER, HWALL,  TDWALL], // row T_d=0 (TDWALL)
        [STONE, TRCORNER, BRCORNER, VWALL,  TLWALL], // row T_l=1 (TLWALL)
        [STONE, BRCORNER, BLCORNER, HWALL,  TUWALL], // row T_u=2 (TUWALL)
        [STONE, BLCORNER, TLCORNER, VWALL,  TRWALL], // row T_r=3 (TRWALL)
    ];

    let rowIdx;
    let sv = seenv & 0xff;

    // Rotate seenv bits so all T-wall types look like TDWALL.
    // C ref: display.c:3510-3524
    switch (typ) {
    case TUWALL: rowIdx = 2; sv = (sv >> 4 | sv << 4) & 0xff; break;
    case TLWALL: rowIdx = 1; sv = (sv >> 2 | sv << 6) & 0xff; break;
    case TRWALL: rowIdx = 3; sv = (sv >> 6 | sv << 2) & 0xff; break;
    default:     rowIdx = 0; break; // TDWALL — no rotation needed
    }

    const row  = WM[rowIdx];
    const mode = wallInfo & WM_MASK;
    const only = (bits) => !!(sv & bits) && !(sv & ~bits);

    let col;
    switch (mode) {
    case 0: // default — no forced corridor endpoint
        if (sv === SV4)
            col = 1; // T_tlcorn
        else if (sv === SV6)
            col = 2; // T_trcorn
        else if ((sv & (SV3 | SV5 | SV7)) || ((sv & SV4) && (sv & SV6)))
            col = 4; // T_tdwall
        else if (sv & (SV0 | SV1 | SV2))
            col = (sv & (SV4 | SV6)) ? 4 : 3; // T_tdwall or T_hwall
        else
            col = 0; // T_stone
        break;

    case 1: // WM_T_LONG — the stem is the long side
        if ((sv & (SV3 | SV4)) && !(sv & (SV5 | SV6 | SV7)))
            col = 1; // T_tlcorn
        else if ((sv & (SV6 | SV7)) && !(sv & (SV3 | SV4 | SV5)))
            col = 2; // T_trcorn
        else if ((sv & SV5) || ((sv & (SV3 | SV4)) && (sv & (SV6 | SV7))))
            col = 4; // T_tdwall
        else
            col = 0; // T_stone (only top octants SV0|SV1|SV2 visible)
        break;

    case 2: // WM_T_BL — bottom-left quarter is solid rock
        if (only(SV4 | SV5))
            col = 1; // T_tlcorn
        else if ((sv & (SV0 | SV1 | SV2 | SV7)) && !(sv & (SV3 | SV4 | SV5)))
            col = 3; // T_hwall
        else if (only(SV6))
            col = 0; // T_stone
        else
            col = 4; // T_tdwall
        break;

    case 3: // WM_T_BR — bottom-right quarter is solid rock
        if (only(SV5 | SV6))
            col = 2; // T_trcorn
        else if ((sv & (SV0 | SV1 | SV2 | SV3)) && !(sv & (SV5 | SV6 | SV7)))
            col = 3; // T_hwall
        else if (only(SV4))
            col = 0; // T_stone
        else
            col = 4; // T_tdwall
        break;

    default:
        col = 0; // T_stone
        break;
    }

    return row[col];
}

// ---------------------------------------------------------------------------
// Status line formatting — shared between HeadlessDisplay and Display.
// C ref: botl.c bot1str(), bot2str()
// ---------------------------------------------------------------------------

/**
 * Format status line 1 text.
 * @param {Object} player - Player state object
 * @param {Function} rankOfFn - rankOf(level, roleIndex, female) → rank string
 * @returns {string} Complete line 1 string, ready for putstr
 */
export function formatStatusLine1(player, rankOfFn) {
    const upolyd = !!((Number(player?.mtimedone) || 0) > 0 && player?.type);
    const level = Number.isFinite(player?.ulevel) ? player.ulevel : (player?.level || 1);
    const female = player.gender === 1;
    const rank = rankOfFn(level, player.roleIndex, female);
    const polyName = String(player?.type?.mname || '')
        .replace(/\b([a-z])/g, (m) => m.toUpperCase());
    const title = upolyd && polyName
        ? `${player.name} the ${polyName}`
        : `${player.name} the ${rank}`;
    const strDisplay = upolyd && strongmonst(player.type)
        ? '18/**'
        : (player._screenStrength || player.strDisplay);
    const parts = [];
    parts.push(`St:${strDisplay}`);
    parts.push(`Dx:${player.attributes[3]}`);
    parts.push(`Co:${player.attributes[4]}`);
    parts.push(`In:${player.attributes[1]}`);
    parts.push(`Wi:${player.attributes[2]}`);
    parts.push(`Ch:${player.attributes[5]}`);
    const alignStr = player.alignment < 0 ? 'Chaotic'
        : player.alignment > 0 ? 'Lawful' : 'Neutral';
    parts.push(alignStr);
    if (player.showScore && player.score > 0) parts.push(`S:${player.score}`);
    return `${title.padEnd(31)}${parts.join(' ')}`;
}

/**
 * Format status line 2 text.
 * @param {Object} player - Player state object
 * @returns {string} Complete line 2 string, ready for putstr
 */
export function formatStatusLine2(player) {
    const upolyd = !!((Number(player?.mtimedone) || 0) > 0 && player?.type);
    const heroHp = upolyd
        ? (Number.isFinite(player?.mh) ? player.mh : 0)
        : (Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0));
    const heroHpMax = upolyd
        ? (Number.isFinite(player?.mhmax) ? player.mhmax : 0)
        : (Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0));
    const level = Number.isFinite(player?.ulevel) ? player.ulevel : (player?.level || 1);
    const parts = [];
    const levelLabel = player.inTutorial ? 'Tutorial' : 'Dlvl';
    parts.push(`${levelLabel}:${player.dungeonLevel}`);
    parts.push(`$:${player.gold}`);
    parts.push(`HP:${heroHp}(${heroHpMax})`);
    parts.push(`Pw:${player.pw}(${player.pwmax})`);
    parts.push(`AC:${player.ac}`);
    if (upolyd) {
        const hd = Number.isFinite(player?.type?.mlevel) ? player.type.mlevel : 0;
        parts.push(`HD:${hd}`);
    } else if (player.showExp) {
        parts.push(`Xp:${level}/${player.exp}`);
    } else {
        parts.push(`Xp:${level}`);
    }
    if (player.showTime) parts.push(`T:${player.turns}`);
    if (player.hunger > 1000) parts.push('Satiated');
    else if (player.hunger <= 50) parts.push('Fainting');
    else if (player.hunger <= 150) parts.push('Weak');
    else if (player.hunger <= 300) parts.push('Hungry');
    if ((player.encumbrance || 0) > 0) {
        const encNames = ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
        const idx = Math.max(0, Math.min(encNames.length - 1, (player.encumbrance || 1) - 1));
        parts.push(encNames[idx]);
    }
    if (player.blind) parts.push('Blind');
    if (player.confused) parts.push('Conf');
    if (player.stunned) parts.push('Stun');
    if (player.hallucinating) parts.push('Hallu');
    if (upolyd && player.flying) parts.push('Fly');
    return parts.join(' ');
}
