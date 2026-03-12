// display.js -- Browser-based TTY display
// Implements the window_procs interface from winprocs.h for browser rendering.
// See DECISIONS.md #2 for why we use <pre> with <span> elements.

import {
    COLNO, ROWNO, TERMINAL_COLS, TERMINAL_ROWS,
    MESSAGE_ROW, MAP_ROW_START, STATUS_ROW_1, STATUS_ROW_2,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, DOOR, CORR, ROOM,
    STAIRS, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, POOL, MOAT,
    WATER, LAVAPOOL, LAVAWALL, ICE, IRONBARS, TREE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD, SDOOR, SCORR,
    DB_UNDER, DB_MOAT,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED,
    IS_WALL, IS_STWALL, IS_SDOOR,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_C_OUTER, WM_C_INNER, WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
} from './const.js';

import { def_monsyms, def_oc_syms, S_sw_tl, S_sw_br, NUM_ZAP, GLYPH_ZAP_OFF, GLYPH_SWALLOW_OFF,
    glyph_is_invisible, glyph_is_trap, GLYPH_CMAP_MAIN_OFF,
} from './symbols.js';
import { M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import { tempGlyphToCell } from './temp_glyph.js';
import { isObjectNameKnown, isObjectEncountered, discoveryTypeName } from './o_init.js';
import {
    wallIsVisible,
    trapGlyph,
    terrainSymbol as renderTerrainSymbol,
    formatStatusLine1, formatStatusLine2,
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, NO_COLOR, CLR_ORANGE, CLR_BRIGHT_GREEN,
    CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN,
    CLR_WHITE, HI_METAL, HI_WOOD, HI_GOLD, HI_ZAP,
} from './render.js';
import { rankOf } from './player.js';
import { update_inventory } from './invent.js';
import { do_lookat, format_do_look_html } from './pager.js';
import { isok, SEE_INVIS, DETECT_MONSTERS, TELEPAT, INFRAVISION, WARNING, WARN_OF_MON,
         BOLT_LIM,
         MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS, MONSEEN_TELEPAT,
         MONSEEN_XRAYVIS, MONSEEN_DETECT, MONSEEN_WARNMON,
         def_warnsyms, WARNCOUNT, ECMD_OK } from './const.js';
import { cansee, couldsee, clear_vision_full_recalc } from './vision.js';
import { do_light_sources } from './light.js';
import { emits_light, infravisible, is_mindless, monsndx } from './mondata.js';
import { worm_known } from './worm.js';
import { rn2 } from './rng.js';
import { set_wall_state as dungeonSetWallState, xy_set_wall_state as dungeonXySetWallState } from './dungeon.js';
import { more } from './input.js';
export { mark_vision_dirty } from './vision.js';

// Re-export color constants from the canonical source (render.js)
export {
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, NO_COLOR, CLR_ORANGE, CLR_BRIGHT_GREEN,
    CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN,
    CLR_WHITE, HI_METAL, HI_WOOD, HI_GOLD, HI_ZAP,
};

// CSS color strings for each NetHack color
// See DECISIONS.md #2 for color choices
// C ref: display.h color constants (0-7, skip 8, 9-15)
const COLOR_CSS = [
    '#555',    // 0  - CLR_BLACK (dark gray for visibility on black bg)
    '#a00',    // 1  - CLR_RED
    '#0a0',    // 2  - CLR_GREEN
    '#a50',    // 3  - CLR_BROWN
    '#00d',    // 4  - CLR_BLUE
    '#a0a',    // 5  - CLR_MAGENTA
    '#0aa',    // 6  - CLR_CYAN
    '#ccc',    // 7  - CLR_GRAY
    '#ccc',    // 8  - NO_COLOR (unused, defaults to gray)
    '#f80',    // 9  - CLR_ORANGE
    '#0f0',    // 10 - CLR_BRIGHT_GREEN
    '#ff0',    // 11 - CLR_YELLOW
    '#55f',    // 12 - CLR_BRIGHT_BLUE
    '#f5f',    // 13 - CLR_BRIGHT_MAGENTA
    '#0ff',    // 14 - CLR_BRIGHT_CYAN
    '#fff',    // 15 - CLR_WHITE
];

// Terrain symbol tables and rendering logic live in render.js.

function spotShowsEngravings(loc) {
    const typ = loc?.typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

function isPoolAt(loc) {
    if (!loc) return false;
    if (loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER) return true;
    if (loc.typ === DRAWBRIDGE_UP) {
        return (loc.drawbridgemask & DB_UNDER) === DB_MOAT;
    }
    return false;
}

function coversObjectsAt(loc, player) {
    const underwater = !!(player?.underwater || player?.uinwater || player?.Underwater);
    return ((isPoolAt(loc) && !underwater)
        || loc?.typ === LAVAPOOL
        || loc?.typ === LAVAWALL);
}

// C ref: display.c newsym() — see_it logic (lines 1004-1006)
// A monster glyph is shown if mon_visible OR sensed via telepathy/warn_of_mon
// or detect_monsters. Plain WARNING uses warning glyphs, not monster glyphs.
function monsterShownOnMap(mon, player, map) {
    if (!mon) return false;
    const ap = mon.m_ap_type;
    // Mimic disguises always hide the monster glyph (show furniture/object instead)
    if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) return false;
    // mon_visible: not mundetected AND not invisible-without-see-invis
    const monVisible = !mon.mundetected
        && !(mon.minvis && !playerCanSeeInvisible(player));
    if (monVisible) return true;
    const detectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
    const warnOfMon = hasPlayerProp(player, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon');
    return detectMonsters || warnOfMon || telepathySensesMonsterForMap(mon, player);
}

function playerMapGlyph(player) {
    const upolyd = !!((Number(player?.mtimedone) || 0) > 0);
    const mlet = Number(player?.type?.mlet);
    if (upolyd && Number.isInteger(mlet) && mlet >= 0) {
        const sym = def_monsyms[mlet]?.sym || '@';
        const color = Number.isInteger(player?.type?.mcolor) ? player.type.mcolor : CLR_WHITE;
        return { ch: sym, color };
    }
    return { ch: '@', color: CLR_WHITE };
}


/**
 * Compute the optimal line-height for seamless box-drawing characters.
 *
 * Terminal box-drawing glyphs (│, ┌, ─, └, etc.) are designed to tile
 * seamlessly by extending to the font's full cell height, which is defined
 * by the OS/2 table's usWinAscent + usWinDescent (the clipping bounds),
 * NOT the smaller sTypoAscender + sTypoDescender (typographic metrics).
 *
 * Chrome (and most browsers) compute "normal" line-height from the typo
 * metrics when USE_TYPO_METRICS is set, which for DejaVu Sans Mono gives
 * line-height: 1.0 — too short, clipping box-drawing glyphs. Meanwhile
 * line-height: 1.2 is too tall, leaving visible gaps between lines.
 *
 * The ideal ratio is (usWinAscent + usWinDescent) / unitsPerEm, but
 * the product of line-height × font-size must land on an INTEGER pixel
 * value, otherwise sub-pixel rounding causes inconsistent row heights
 * and occasional 1px gaps between lines.
 *
 * This function measures the actual loaded font's metrics via the Canvas
 * API (fontBoundingBoxAscent + fontBoundingBoxDescent), computes the
 * natural ratio, then rounds down to the nearest value whose product
 * with fontSize is a whole pixel.
 *
 * @param {number} fontSize - The font size in pixels (e.g. 16)
 * @param {string} fontFamily - The CSS font-family string
 * @returns {number} line-height as a unitless ratio (e.g. 1.125)
 */
function computeTerminalLineHeight(fontSize, fontFamily) {
    // Default: Chrome's fontBoundingBoxAscent+Descent for DejaVu Sans Mono at 16px
    // gives 19px (not 18px from usWinAscent/usWinDescent), so floor(19)/16 = 1.1875.
    const DEFAULT_LINE_HEIGHT = 1.1875;
    if (typeof document === 'undefined') return DEFAULT_LINE_HEIGHT;
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText('│');
        // fontBoundingBox metrics give the font-wide ascent/descent
        // (not per-glyph), matching usWinAscent/usWinDescent.
        if (metrics.fontBoundingBoxAscent != null &&
            metrics.fontBoundingBoxDescent != null) {
            const naturalHeight = metrics.fontBoundingBoxAscent
                                + metrics.fontBoundingBoxDescent;
            const naturalRatio = naturalHeight / fontSize;
            // Round down to nearest value giving a whole-pixel line height.
            // E.g. at 16px, ratio 1.164 → 18.62px → floor to 18px → 1.125.
            const wholePixelHeight = Math.floor(naturalRatio * fontSize);
            // Don't go below 1.0
            return Math.max(wholePixelHeight / fontSize, 1.0);
        }
    } catch (e) {
        // Canvas not available (e.g. Node.js tests)
    }
    return DEFAULT_LINE_HEIGHT;
}

export class Display {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.cols = TERMINAL_COLS;
        this.rows = TERMINAL_ROWS;

        // The character grid: [row][col] = {ch, color, attr}
        // attr: 0=normal, 1=inverse, 2=bold, 4=underline (can be OR'd)
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = { ch: ' ', color: CLR_GRAY, attr: 0 };
            }
        }

        // DOM spans: [row][col] = <span>
        this.spans = [];

        // Cell info for hover: [row][col] = { name, desc, color }
        this.cellInfo = [];
        for (let r = 0; r < this.rows; r++) {
            this.cellInfo[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.cellInfo[r][c] = null;
            }
        }

        // Message history
        this.messages = [];
        this.topMessage = null;
        this.messageNeedsMore = false; // C ref: TOPLINE_NEED_MORE - true if message not acknowledged by keypress
        this.moreMarkerActive = false;
        this.messageCursorCol = 0;

        // Game flags (updated by game, used for display options)
        this.flags = {};
        this._lastMapState = null;
        this._mapBaseCells = new Map();
        // key => stack of transient cells (top is active overlay)
        this._tempOverlay = new Map();
        this.cursorCol = 0;
        this.cursorRow = 0;
        this.cursorVisible = 1;
        this._cursorSpan = null; // currently highlighted <span>
        this._nhgetch = null;
        this._topMessageRow1 = undefined; // set when message wraps to row 1
        this._lastTextPopup = null;

        this._createDOM();
    }

    setNhgetch(fn) { this._nhgetch = fn; }

    _createDOM() {
        // Create the pre element
        const pre = document.createElement('pre');
        pre.id = 'terminal';
        const fontFamily = '"DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Liberation Mono", monospace';
        // Read the current font size from the CSS variable (may differ from 16 if user changed it).
        const fontSize = parseFloat(getComputedStyle(document.documentElement)
            .getPropertyValue('--game-font-size')) || 16;
        const lineHeight = computeTerminalLineHeight(fontSize, fontFamily);
        pre.style.cssText = `
            font-family: ${fontFamily};
            font-size: ${fontSize}px;
            line-height: ${lineHeight};
            background: #000;
            color: #ccc;
            padding: 8px;
            margin: 0;
            display: inline-block;
            white-space: pre;
            cursor: default;
            user-select: none;
        `;

        // Create spans for each cell
        for (let r = 0; r < this.rows; r++) {
            this.spans[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const span = document.createElement('span');
                span.textContent = ' ';
                span.style.color = COLOR_CSS[CLR_GRAY];
                span.dataset.row = r;
                span.dataset.col = c;
                this.spans[r][c] = span;
                pre.appendChild(span);
            }
            if (r < this.rows - 1) {
                pre.appendChild(document.createTextNode('\n'));
            }
        }

        // CSS animation for blinking cursor
        const style = document.createElement('style');
        style.textContent = `
@keyframes nh-cursor-blink {
  0%, 49% { box-shadow: inset 0 -3px 0 0 rgba(255,255,255,0.85); }
  50%, 100% { box-shadow: none; }
}
span.nh-cursor {
  animation: nh-cursor-blink 0.8s step-end infinite;
}
`;
        this.container.innerHTML = '';
        this.container.appendChild(style);
        this.container.appendChild(pre);

        // Set up hover info panel
        this._setupHover(pre);
    }

    // Set a character at terminal position (col, row) with color and attributes
    // attr: 0=normal, 1=inverse, 2=bold, 4=underline (can be OR'd together)
    setCell(col, row, ch, color, attr = 0) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        const cell = this.grid[row][col];
        if (cell.ch === ch && cell.color === color && cell.attr === attr) return; // no change
        cell.ch = ch;
        cell.color = color;
        cell.attr = attr;
        const span = this.spans[row][col];
        span.textContent = ch;

        // Apply color flag - disable colors when color=false
        // C ref: iflags.wc_color
        const displayColor = (this.flags.color !== false)
            ? ((color === CLR_BLACK && this.flags.use_darkgray !== false) ? NO_COLOR : color)
            : CLR_GRAY;

        // Apply attributes via CSS
        // C ref: win/tty/termcap.c - inverse video, bold, underline
        const isInverse = (attr & 1) !== 0;
        const isBold = (attr & 2) !== 0;
        const isUnderline = (attr & 4) !== 0;

        if (isInverse) {
            // Inverse video: swap foreground and background
            span.style.color = '#000';
            span.style.backgroundColor = COLOR_CSS[displayColor] || COLOR_CSS[CLR_GRAY];
        } else {
            span.style.color = COLOR_CSS[displayColor] || COLOR_CSS[CLR_GRAY];
            span.style.backgroundColor = '';
        }

        span.style.fontWeight = isBold ? 'bold' : '';
        span.style.textDecoration = isUnderline ? 'underline' : '';
    }

    // Clear a row
    clearRow(row) {
        for (let c = 0; c < this.cols; c++) {
            this.setCell(c, row, ' ', CLR_GRAY);
        }
    }

    // Write a string at position (col, row) with optional attributes
    putstr(col, row, str, color = CLR_GRAY, attr = 0) {
        for (let i = 0; i < str.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, str[i], color, attr);
        }
    }

    // --- Window interface methods (mirrors winprocs.h) ---

    // Display a message on the top line
    // C ref: winprocs.h win_putstr for NHW_MESSAGE
    async putstr_message(msg) {
        // Add to message history
        if (msg.trim()) {
            this.messages.push(msg);
            // Keep last 20 messages
            if (this.messages.length > 20) {
                this.messages.shift();
            }
        }

        // If msg_window is enabled, render the message window
        // C ref: win/tty/topl.c — message window modes
        if (this.flags.msg_window) {
            this.renderMessageWindow();
            return;
        }

        const isDeathMessage = msg.startsWith('You die...');
        // C-faithful death staging: if a death line arrives while another
        // message is pending acknowledgement, force a --More-- boundary first.
        if (this.topMessage && this.messageNeedsMore && isDeathMessage) {
            this.renderMoreMarker();
            if (this._nhgetch) {
                await more(this, {
                    site: 'display.more.dismiss',
                    clearAfter: false,
                    readKey: this._nhgetch,
                });
            }
            this.clearRow(MESSAGE_ROW);
            if (this._topMessageRow1 !== undefined) {
                this.clearRow(MESSAGE_ROW + 1);
                this._topMessageRow1 = undefined;
            }
            this.messageNeedsMore = false;
            this.topMessage = null;
        }

        // C ref: win/tty/topl.c:262-267 — Concatenate messages if they fit.
        // C reserves space for " --More--" (9 chars) when deciding whether to concatenate.
        if (this.topMessage && this.messageNeedsMore) {
            const combined = this.topMessage + '  ' + msg;
            // C ref: win/tty/topl.c update_topl() uses strict '<' for fit check.
            if (combined.length + 9 < this.cols) {
                this.clearRow(MESSAGE_ROW);
                this.putstr(0, MESSAGE_ROW, combined, CLR_GRAY);
                this.topMessage = combined;
                this.messageCursorCol = Math.min(combined.length, this.cols - 1);
                this.setCursor(this.messageCursorCol, 0);
                return;
            }
            // C ref: win/tty/topl.c update_topl():
            // - concat overflow triggers more()
            // - "You die..." also forces more() before the new message
            // C ref: topl.c more() → flush_screen(1) → bot() before xwaitforspace().
            this.renderMoreMarker();
            if (this._nhgetch) {
                await more(this, {
                    site: 'display.more.dismiss',
                    clearAfter: false,
                    readKey: this._nhgetch,
                });
            }
            // Continue to display this message fresh after dismissal.
            this.clearRow(MESSAGE_ROW);
            if (this._topMessageRow1 !== undefined) {
                this.clearRow(MESSAGE_ROW + 1);
                this._topMessageRow1 = undefined;
            }
            this.messageNeedsMore = false;
            this.topMessage = null;
        }

        // Display message, wrapping to row 1 if needed.
        // C ref: win/tty/topl.c update_topl() inserts '\n' at word boundaries
        // when n0 >= CO, then more() places --More-- on the last row used.
        this.clearRow(MESSAGE_ROW);

        if (msg.length <= this.cols) {
            this.putstr(0, MESSAGE_ROW, msg, CLR_GRAY);
            this.topMessage = msg;
            this.messageCursorCol = Math.min(msg.length, this.cols - 1);
        } else {
            // Break at word boundary near cols (C uses CO-1 as scan start).
            let breakPoint = msg.lastIndexOf(' ', this.cols - 1);
            if (breakPoint <= 0) {
                breakPoint = this.cols; // hard break if no space found
            }

            const row0 = msg.substring(0, breakPoint);
            const row1rest = msg.substring(breakPoint).trimStart();

            this.putstr(0, MESSAGE_ROW, row0, CLR_GRAY);
            this.topMessage = row0;
            this.messageCursorCol = Math.min(row0.length, this.cols - 1);

            if (row1rest.length > 0) {
                // Page via row 1 + --More--, then continue with any remaining text recursively.
                const row1 = row1rest.substring(0, this.cols);
                this.clearRow(MESSAGE_ROW + 1);
                this.putstr(0, MESSAGE_ROW + 1, row1, CLR_GRAY);
                this._topMessageRow1 = row1;
                this.messageNeedsMore = true;
                this.renderMoreMarker();
                if (this._nhgetch) {
                    await more(this, {
                        site: 'display.more.dismiss',
                        clearAfter: false,
                        readKey: this._nhgetch,
                    });
                }
                this.clearRow(MESSAGE_ROW);
                this.clearRow(MESSAGE_ROW + 1);
                this._topMessageRow1 = undefined;
                this.messageNeedsMore = false;
                this.topMessage = null;
                const row1overflow = row1rest.substring(this.cols).trimStart();
                if (row1overflow.length > 0) {
                    await this.putstr_message(row1overflow);
                }
                return;
            }
        }

        // Mark message as needing acknowledgement (for concatenation logic)
        // C ref: toplin = TOPLINE_NEED_MORE after displaying message
        this.messageNeedsMore = true;
        if (isDeathMessage) {
            this.renderMoreMarker();
            if (this._nhgetch) {
                await more(this, {
                    site: 'display.more.dismiss',
                    clearAfter: false,
                    readKey: this._nhgetch,
                });
                this.clearRow(MESSAGE_ROW);
                this.messageNeedsMore = false;
                this.topMessage = null;
            }
        }
        this.setCursor(this.messageCursorCol, 0);
    }

    // Render message window (last 3 messages)
    // C ref: win/tty/topl.c prevmsg_window == 'f' (full)
    renderMessageWindow() {
        const MSG_WINDOW_ROWS = 3;
        // Clear message window area
        for (let r = 0; r < MSG_WINDOW_ROWS; r++) {
            this.clearRow(r);
        }

        // Show last 3 messages (most recent at bottom)
        const recentMessages = this.messages.slice(-MSG_WINDOW_ROWS);
        for (let i = 0; i < recentMessages.length; i++) {
            const msg = recentMessages[i];
            const row = MSG_WINDOW_ROWS - recentMessages.length + i;
            if (msg.length <= this.cols) {
                this.putstr(0, row, msg.substring(0, this.cols), CLR_GRAY);
            } else {
                // Truncate long messages
                this.putstr(0, row, msg.substring(0, this.cols - 3) + '...', CLR_GRAY);
            }
        }
    }

    // Render the "--More--" marker on the message row without waiting for input.
    // Called by putstr_message() when message overflow requires a --More-- pause,
    // and by dolook/engrave for parity with C screen captures.
    // C ref: win/tty/topl.c more() — wraps to next row if curx >= CO - 8.
    renderMoreMarker() {
        const moreStr = '--More--';
        this.moreMarkerActive = true;
        if (this._topMessageRow1 !== undefined) {
            // Message wrapped to row 1; place --More-- after row 1 content.
            // C: more() checks if curx >= CO - 8 to decide on a newline first,
            // but for row 1 we follow the same rule: if row1 content leaves room,
            // append on the same row.
            const row1Len = this._topMessageRow1.length;
            const col = Math.min(row1Len, this.cols - moreStr.length);
            this.putstr(col, MESSAGE_ROW + 1, moreStr, CLR_GRAY);
            this.setCursor(Math.min(col + moreStr.length, this.cols - 1), MESSAGE_ROW + 1);
        } else {
            const msgLen = (this.topMessage || '').length;
            const col = Math.min(msgLen, this.cols - moreStr.length);
            this.putstr(col, MESSAGE_ROW, moreStr, CLR_GRAY);
            this.setCursor(Math.min(col + moreStr.length, this.cols - 1), MESSAGE_ROW);
        }
    }

    // Render the map from game state
    // C ref: display.c newsym() and print_glyph()
    renderMap(gameMap, player, fov, flags = {}) {
        // Merge flags to preserve directly-set properties (e.g., DECgraphics).
        this.flags = { ...this.flags, ...flags };
        this._lastMapState = { gameMap, player, fov, flags: { ...this.flags } };

        // When msg_window is enabled, map starts at row 3 (after 3-line message window)
        // Otherwise map starts at row 1 (after single message line)
        const mapOffset = this.flags.msg_window ? 3 : MAP_ROW_START;

        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            // C tty map rendering uses game x in [1..COLNO-1] at terminal cols [0..COLNO-2].
            // Keep the last terminal column blank for map rows.
            this.setCell(COLNO - 1, row, ' ', CLR_GRAY);
            this.cellInfo[row][COLNO - 1] = null;
            for (let x = 1; x < COLNO; x++) {
                const col = x - 1;

                // C ref: always render the player glyph at the hero's position,
                // even when out of FOV (e.g. during levitation on stairs).
                if (player && x === player.x && y === player.y && !player.usteed) {
                    const heroGlyph = playerMapGlyph(player);
                    this.setCell(col, row, heroGlyph.ch, heroGlyph.color);
                    this.cellInfo[row][col] = {
                        name: player.name || 'you',
                        desc: 'you, the adventurer',
                        color: heroGlyph.color,
                    };
                    continue;
                }

                if (!fov || !fov.canSee(x, y)) {
                    const mon = gameMap.monsterAt(x, y);
                    const monVisibleByOwnLight = !!(mon
                        && emits_light(mon.data || mon.type || {}) > 0
                        && couldsee(gameMap, player, x, y)
                        && monVisibleForMap(mon, player));
                    if (monVisibleByOwnLight) {
                        const hallu = !!player?.hallucinating;
                        const glyph = monsterMapGlyph(mon, hallu);
                        this.setCell(col, row, glyph.ch, glyph.color);
                        continue;
                    }
                    // Show remembered terrain or nothing
                    const loc = gameMap.at(x, y);
                    // C ref: map_invisible() uses show_glyph() directly,
                    // so mem_invis displays even at unseen locations.
                    if (loc && loc.mem_invis) {
                        this.setCell(col, row, 'I', CLR_GRAY);
                        this.cellInfo[row][col] = { name: 'remembered invisible monster', desc: '(remembered)', color: CLR_GRAY };
                        continue;
                    }
                    if (loc && loc.seenv) {
                        // C-like memory: remembered object glyph overlays
                        // remembered terrain when out of sight.
                        if (loc.mem_obj) {
                            const rememberedObjColor = Number.isInteger(loc.mem_obj_color)
                                ? loc.mem_obj_color
                                : CLR_BLACK;
                            this.setCell(col, row, loc.mem_obj, rememberedObjColor);
                            this.cellInfo[row][col] = { name: 'remembered object', desc: '(remembered)', color: rememberedObjColor };
                            continue;
                        }
                        if (loc.mem_trap) {
                            // C ref: back_to_glyph() preserves trap's full color in memory.
                            const memTrapColor = Number.isInteger(loc.mem_trap_color)
                                ? loc.mem_trap_color : CLR_BLACK;
                            this.setCell(col, row, loc.mem_trap, memTrapColor);
                            this.cellInfo[row][col] = { name: 'remembered trap', desc: '(remembered)', color: memTrapColor };
                            continue;
                        }
                        // Show remembered (dimmed) — check wall_angle first
                        if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
                            this.setCell(col, row, ' ', CLR_GRAY);
                            this.cellInfo[row][col] = null;
                            continue;
                        }
                        const sym = this.terrainSymbol(loc, gameMap, x, y);
                        const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
                        this.setCell(col, row, sym.ch, rememberedColor);
                        const desc = this._terrainDesc(loc);
                        this.cellInfo[row][col] = { name: desc, desc: '(remembered)', color: rememberedColor };
                    } else {
                        this.setCell(col, row, ' ', CLR_GRAY);
                        this.cellInfo[row][col] = null;
                    }
                    continue;
                }

                const loc = gameMap.at(x, y);
                if (!loc) {
                    this.setCell(col, row, ' ', CLR_GRAY);
                    this.cellInfo[row][col] = null;
                    continue;
                }
                // seenv is now tracked by the vision code (vision.js compute())
                // which sets the correct angle bits per direction.

                // C ref: display.c:963-964 — mark any engraving at a visible square as
                // revealed, "even when covered by objects or a monster".
                const visEngr = gameMap.engravingAt(x, y);
                if (visEngr) visEngr.erevealed = true;

                // Check for monsters
                const mon = gameMap.monsterAt(x, y);
                if (monsterShownOnMap(mon, player, gameMap)) {
                    loc.mem_invis = false;
                    // Keep remembered object glyph under visible monsters in sync
                    // so when LOS drops, memory matches C back_to_glyph behavior.
                    const underObjs = coversObjectsAt(loc, player) ? [] : gameMap.objectsAt(x, y);
                    if (underObjs.length > 0) {
                        const underTop = underObjs[underObjs.length - 1];
                        const underGlyph = objectMapGlyph(underTop, false, { player, x, y });
                        loc.mem_obj = underGlyph.ch || 0;
                        loc.mem_obj_color = Number.isInteger(underGlyph.color)
                            ? underGlyph.color
                            : CLR_GRAY;
                    } else {
                        const engr = gameMap.engravingAt(x, y);
                        if (engr && (player?.wizard || !player?.blind || engr.erevealed)) {
                            const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                            loc.mem_obj = engrCh;
                            loc.mem_obj_color = CLR_BRIGHT_BLUE;
                        } else {
                            loc.mem_obj = 0;
                            loc.mem_obj_color = 0;
                        }
                    }
                    const hallu = !!player?.hallucinating;
                    const glyph = monsterMapGlyph(mon, hallu);
                    this.setCell(col, row, glyph.ch, glyph.color);
                    const look = do_lookat({ map: gameMap, player }, { x, y });
                    const styled = format_do_look_html(look);
                    const classInfo = look.classDesc || this._monsterClassDesc(mon.displayChar);
                    this.cellInfo[row][col] = {
                        name: styled.nameText || look.firstmatch || 'monster',
                        desc: styled.descText || classInfo || '',
                        nameHtml: styled.nameHtml || '',
                        descHtml: styled.descHtml || '',
                        color: mon.displayColor,
                    };
                    continue;
                }
                // C parity: remembered invis markers are for out-of-sight
                // memory; once a square is currently visible, clear stale marker.
                if (loc.mem_invis) {
                    loc.mem_invis = false;
                }

                // Check for objects on the ground
                const objs = coversObjectsAt(loc, player) ? [] : gameMap.objectsAt(x, y);
                if (objs.length > 0) {
                    const topObj = objs[objs.length - 1];
                    const hallu = !!player?.hallucinating;
                    const glyph = objectMapGlyph(topObj, hallu, { player, x, y });
                    const memGlyph = hallu
                        ? objectMapGlyph(topObj, false, { player, x, y, observe: false })
                        : glyph;
                    loc.mem_obj = memGlyph.ch || 0;
                    loc.mem_obj_color = Number.isInteger(memGlyph.color)
                        ? memGlyph.color
                        : CLR_GRAY;
                    this.setCell(col, row, glyph.ch, glyph.color);
                    const classInfo = this._objectClassDesc(topObj.oc_class);
                    const extra = objs.length > 1 ? ` (+${objs.length - 1} more)` : '';
                    const nameKnown = isObjectNameKnown(topObj.otyp);
                    const encountered = isObjectEncountered(topObj.otyp);
                    const hoverName = (nameKnown || encountered)
                        ? discoveryTypeName(topObj.otyp) + extra
                        : classInfo + extra;
                    const stats = nameKnown ? this._objectStats(topObj) : '';
                    this.cellInfo[row][col] = { name: hoverName, desc: nameKnown ? classInfo : '', stats, color: topObj.displayColor };
                    continue;
                }
                loc.mem_obj = 0;
                loc.mem_obj_color = 0;

                // Check for traps
                const trap = gameMap.trapAt(x, y);
                if (trap && trap.tseen && !coversObjectsAt(loc, player)) {
                    const tg = trapGlyph(trap.ttyp);
                    loc.mem_trap = tg.ch;
                    loc.mem_trap_color = tg.color;
                    this.setCell(col, row, tg.ch, tg.color);
                    this.cellInfo[row][col] = {
                        name: tg.name,
                        desc: 'trap',
                        color: tg.color,
                    };
                    continue;
                }
                loc.mem_trap = 0;

                // C ref: display.c back_to_glyph() — wizard mode shows engravings
                // as S_engroom ('`') or S_engrcorr ('#') when no higher-priority
                // map symbol (player/monster/object/trap) occupies the square.
                const engr = gameMap.engravingAt(x, y);
                if (spotShowsEngravings(loc)
                    && engr
                    && (player?.wizard || !player?.blind || engr.erevealed)
                    && !coversObjectsAt(loc, player)) {
                    const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                    loc.mem_obj = engrCh;
                    loc.mem_obj_color = CLR_BRIGHT_BLUE;
                    this.setCell(col, row, engrCh, CLR_BRIGHT_BLUE);
                    this.cellInfo[row][col] = { name: 'engraving', desc: '', color: CLR_BRIGHT_BLUE };
                    continue;
                }

                // Show terrain — check wall_angle visibility first
                // C ref: display.c:2311 — wall_angle returns S_stone for
                // walls not visible from the current seenv angles
                if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
                    this.setCell(col, row, ' ', CLR_GRAY);
                    this.cellInfo[row][col] = null;
                    continue;
                }
                const sym = this.terrainSymbol(loc, gameMap, x, y);
                this.setCell(col, row, sym.ch, sym.color);
                const desc = this._terrainDesc(loc);
                this.cellInfo[row][col] = { name: desc, desc: '', color: sym.color };
            }
        }
        this._captureMapBase();
        this._applyTempOverlay();
    }

    _mapCoordToScreen(x, y) {
        const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
        return {
            col: x - 1,
            row: y + mapOffset,
        };
    }

    _tempGlyphToCell(glyph) {
        return tempGlyphToCell(glyph);
    }

    _overlayKey(col, row) {
        return `${col},${row}`;
    }

    _captureMapBase() {
        this._mapBaseCells.clear();
        const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            for (let col = 0; col < COLNO - 1; col++) {
                const cell = this.grid[row]?.[col];
                if (!cell) continue;
                this._mapBaseCells.set(this._overlayKey(col, row), {
                    ch: cell.ch,
                    color: cell.color,
                    attr: cell.attr || 0,
                });
            }
        }
    }

    _restoreBaseCell(col, row) {
        const base = this._mapBaseCells.get(this._overlayKey(col, row));
        if (!base) return;
        this.setCell(col, row, base.ch, base.color, base.attr || 0);
    }

    _applyTempOverlay() {
        for (const [key, stack] of this._tempOverlay.entries()) {
            if (!Array.isArray(stack) || stack.length === 0) continue;
            const cell = stack[stack.length - 1];
            const parts = key.split(',');
            const col = Number.parseInt(parts[0], 10);
            const row = Number.parseInt(parts[1], 10);
            if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
            this.setCell(col, row, cell.ch, cell.color, cell.attr || 0);
        }
    }

    showTempGlyph(x, y, glyph) {
        const { col, row } = this._mapCoordToScreen(x, y);
        if (col < 0 || col >= COLNO - 1 || row < 0 || row >= this.rows) return;
        const cell = this._tempGlyphToCell(glyph);
        const key = this._overlayKey(col, row);
        const stack = this._tempOverlay.get(key) || [];
        stack.push(cell);
        this._tempOverlay.set(key, stack);
        this.setCell(col, row, cell.ch, cell.color, cell.attr || 0);
    }

    redraw(x, y) {
        const { col, row } = this._mapCoordToScreen(x, y);
        const key = this._overlayKey(col, row);
        const stack = this._tempOverlay.get(key);
        if (Array.isArray(stack) && stack.length > 0) {
            stack.pop();
            if (stack.length > 0) {
                const top = stack[stack.length - 1];
                this._tempOverlay.set(key, stack);
                this.setCell(col, row, top.ch, top.color, top.attr || 0);
                return;
            }
        }
        this._tempOverlay.delete(key);
        // C ref: tmp_at() erases via newsym() from current map state, not from
        // a stale snapshot taken when the temp overlay started.
        const last = this._lastMapState;
        if (last?.gameMap) {
            this.renderMap(last.gameMap, last.player, last.fov, last.flags || this.flags || {});
            return;
        }
        this._restoreBaseCell(col, row);
    }

    flush() {
        // Browser display is immediate through setCell/DOM writes.
    }

    setCursor(col, row) {
        if (this._cursorSpan) {
            this._cursorSpan.classList.remove('nh-cursor');
            this._cursorSpan = null;
        }
        this.cursorCol = col;
        this.cursorRow = row;
        if (this.cursorVisible
            && row >= 0 && row < this.rows && col >= 0 && col < this.cols
            && this.spans[row] && this.spans[row][col]) {
            this._cursorSpan = this.spans[row][col];
            this._cursorSpan.classList.add('nh-cursor');
        }
    }

    getCursor() { return [this.cursorCol, this.cursorRow, this.cursorVisible]; }

    cursSet(visibility) {
        this.cursorVisible = visibility ? 1 : 0;
        // Update DOM: hide or show cursor based on visibility
        if (this._cursorSpan) {
            if (!this.cursorVisible) {
                this._cursorSpan.classList.remove('nh-cursor');
            } else {
                this._cursorSpan.classList.add('nh-cursor');
            }
        }
    }

    // Get the display symbol for a terrain type
    // C ref: defsym.h PCHAR definitions, display.c back_to_glyph()
    terrainSymbol(loc, gameMap = null, x = -1, y = -1) {
        return renderTerrainSymbol(loc, gameMap, x, y, this.flags);
    }

    // Render the status lines
    // C ref: botl.c bot(), botl.h
    renderStatus(player) {
        if (!player) return;

        this.clearRow(STATUS_ROW_1);
        const line1 = formatStatusLine1(player, rankOf);
        this.putstr(0, STATUS_ROW_1, line1.substring(0, this.cols), CLR_GRAY);

        this.clearRow(STATUS_ROW_2);
        const line2 = formatStatusLine2(player);
        this.putstr(0, STATUS_ROW_2, line2.substring(0, this.cols), CLR_GRAY);

        // C parity: status-line HP text is not force-highlighted unless an
        // explicit hitpoint highlight option is enabled.
        if (this.flags.hitpointbar) {
            const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);
            const heroHpMax = Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0);
            const hpPct = heroHpMax > 0 ? heroHp / heroHpMax : 1;
            const hpColor = hpPct <= 0.15 ? CLR_RED
                : hpPct <= 0.33 ? CLR_ORANGE
                    : CLR_GRAY;
            const hpStr = `HP:${heroHp}(${heroHpMax})`;
            const hpIdx = line2.indexOf(hpStr);
            if (hpIdx >= 0) {
                for (let i = 0; i < hpStr.length; i++) {
                    this.setCell(hpIdx + i, STATUS_ROW_2, hpStr[i], hpColor);
                }
            }
        }
    }

    // Display a simple menu and return selection (async)
    // C ref: winprocs.h win_select_menu
    async showMenu(title, items, readKey) {
        // Save the current map area
        const savedCells = [];
        const startRow = MAP_ROW_START + 1;
        const maxItems = Math.min(items.length, ROWNO - 4);

        for (let r = startRow; r < startRow + maxItems + 2; r++) {
            savedCells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                savedCells[r][c] = { ...this.grid[r][c] };
            }
        }

        // Draw menu
        this.clearRow(startRow);
        this.putstr(2, startRow, title, CLR_WHITE);

        const displayItems = items.slice(0, maxItems);
        for (let i = 0; i < displayItems.length; i++) {
            const row = startRow + 1 + i;
            this.clearRow(row);
            const item = displayItems[i];
            const letter = item.letter || String.fromCharCode(97 + i); // a, b, c...
            this.putstr(2, row, `${letter} - ${item.text}`, CLR_GRAY);
        }

        // Wait for selection
        this.putstr_message('(end) ');
        const ch = await Promise.resolve(readKey());

        // Restore map
        for (let r = startRow; r < startRow + maxItems + 2; r++) {
            if (!savedCells[r]) continue;
            for (let c = 0; c < this.cols; c++) {
                const saved = savedCells[r][c];
                this.setCell(c, r, saved.ch, saved.color);
            }
        }
        this.clearRow(MESSAGE_ROW);

        // Find which item was selected
        const charStr = String.fromCharCode(ch);
        const selected = displayItems.find((item, idx) => {
            const letter = item.letter || String.fromCharCode(97 + idx);
            return letter === charStr;
        });

        return selected || null;
    }

    // Clear the entire screen and reset message state.
    // C ref: tty_clear_nhwindow() — wipes the whole terminal including topline.
    // Resetting topMessage/messageNeedsMore prevents stale state from triggering
    // spurious --More-- on the next putstr_message call.
    clearScreen() {
        for (let r = 0; r < this.rows; r++) {
            this.clearRow(r);
        }
        this.topMessage = null;
        this.messageNeedsMore = false;
        this._topMessageRow1 = undefined;
    }

    // Display a chargen menu matching C TTY positioning
    // C ref: wintty.c tty_display_nhwindow() for NHW_MENU
    // lines: array of strings (the menu content lines)
    // isFirstMenu: if true, always renders full-screen (col 0)
    // Returns: the lines displayed and the offx used
    renderChargenMenu(lines, isFirstMenu) {
        // Calculate max content width
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }

        // C ref: wintty.c offx calculation
        // C ref: wintty.c min(min(82, cols/2), cols - maxcol - 1)
        // If offx == 10 OR menu too tall for terminal OR first menu: offx = 0, full-screen
        let offx = Math.max(10, this.cols - maxcol - 2);

        if (isFirstMenu || offx === 10 || lines.length >= this.rows) {
            offx = 0;
        }

        // Always clear entire screen before rendering (C dismisses previous window first)
        this.clearScreen();

        // Render each line at the offset
        // C ref: win/tty/wintty.c - menu headers use inverse video
        for (let i = 0; i < lines.length && i < this.rows; i++) {
            const line = lines[i];
            // C ref: role.c — first line is menu header with inverse video.
            const isHeader = (i === 0 && line.trim().length > 0);
            if (isHeader && line.startsWith(' ')) {
                // Keep explicit leading pad non-inverse, invert remaining header text.
                this.setCell(offx, i, ' ', CLR_GRAY, 0);
                this.putstr(offx + 1, i, line.slice(1), CLR_GRAY, 1);
            } else if (isHeader) {
                this.putstr(offx, i, line, CLR_GRAY, 1);
            } else {
                this.putstr(offx, i, line, CLR_GRAY, 0);
            }
        }

        // Place cursor at row 0 col 0 (not wherever the last putstr_message left it).
        this.setCursor(0, 0);

        return offx;
    }

    // Display a right-side menu overlay while preserving existing left-side map.
    renderOverlayMenu(lines, opts = null) {
        const isCategoryHeader = (line) => {
            const text = String(line || '').trimStart();
            if (/^(Weapons|Armor|Rings|Amulets|Tools|Comestibles|Potions|Scrolls|Spellbooks|Wands|Coins|Gems\/Stones|Other)\b/.test(text)) {
                return true;
            }
            if (/^(Fighting Skills|Weapon Skills|Spellcasting Skills)\b/.test(text)) {
                return true;
            }
            if (text === 'Currently known spells') return true;
            if (/^Name\s+Level\s+Category\s+Fail\s+Retention/.test(text)) return true;
            return false;
        };
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }
        // C ref: wintty.c cw->offx = max(10, cols - maxcol - 1).
        // C's maxcol includes +2 padding (space + end), so for JS
        // (where maxcol is the raw longest line length) we use -2.
        let offx = Math.max(10, this.cols - maxcol - 2);
        if (opts?.capHalf) {
            offx = Math.min(offx, Math.floor(this.cols / 2) + 1);
        }

        // C ref: wintty.c line 1926 — force full-screen when offx hits the
        // minimum (10) or menu fills the terminal height (maxrow >= rows).
        const fullScreen = (offx === 10 || lines.length >= this.rows);
        if (fullScreen) offx = 1;

        const menuRows = Math.min(lines.length, fullScreen ? this.rows : STATUS_ROW_1);
        // C tty parity: clear only rows occupied by the menu itself.
        for (let r = 0; r < menuRows; r++) {
            for (let c = Math.max(0, offx - 1); c < this.cols; c++) {
                this.setCell(c, r, ' ', CLR_GRAY, 0);
            }
        }

        for (let i = 0; i < menuRows; i++) {
            const line = lines[i];
            // C ref: wintty.c — menu prompt (line 0) and category headers use inverse video.
            const isHeader = (i === 0 && line.trim().length > 0) || isCategoryHeader(line);
            if (isHeader) {
                // C ref: wintty.c — category headers have a single leading
                // space that is part of the pre-cleared region, not inverse video.
                // The text itself (e.g. "Weapons") starts at offx in inverse.
                // Column headers (spell list "    Name...") have structural
                // whitespace that IS rendered in inverse.
                const isSingleSpacePrefix = line.startsWith(' ') && (line.length < 2 || line[1] !== ' ');
                const trimmed = isSingleSpacePrefix ? line.slice(1) : line;
                this.putstr(offx, i, trimmed, CLR_GRAY, 1);
            } else {
                this.putstr(offx, i, line, CLR_GRAY, 0);
            }
        }
        return offx;
    }

    // Display lore text overlaid on the map area
    // C ref: The lore text is displayed starting at a calculated column offset
    renderLoreText(lines, offx) {
        for (let i = 0; i < lines.length && i < this.rows; i++) {
            // Clear from offx to end of line, then write text
            for (let c = offx; c < this.cols; c++) {
                this.setCell(c, i, ' ', CLR_GRAY);
            }
            this.putstr(offx, i, lines[i], CLR_GRAY);
        }
        // Clear remaining rows in the overlay area
        for (let i = lines.length; i < this.rows - 2; i++) {
            for (let c = offx; c < this.cols; c++) {
                this.setCell(c, i, ' ', CLR_GRAY);
            }
        }
    }

    // Render a text popup (e.g. "Things that are here:", NHW_TEXT windows)
    // C ref: tty_display_nhwindow → process_text_window / process_menu_window
    renderTextPopup(lines, opts = {}) {
        // Filter out trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines = lines.slice(0, -1);
        }
        const fullScreenText = lines.length >= this.rows - 2;
        let moreMarker;
        if (fullScreenText) {
            moreMarker = '--More--';
        } else if (opts.isTextWindow) {
            moreMarker = '(end)';
        } else {
            moreMarker = ' --More--';
        }
        const linesWithMore = [...lines, moreMarker];

        let maxcol = 0;
        for (const line of linesWithMore) {
            if (line.length > maxcol) maxcol = line.length;
        }

        const menuRows = Math.min(linesWithMore.length, fullScreenText ? this.rows : (this.rows - 2));
        const renderLines = linesWithMore.length > menuRows
            ? [...linesWithMore.slice(0, menuRows - 1), moreMarker]
            : linesWithMore;

        let offx;
        if (fullScreenText) {
            offx = 0;
        } else {
            if (opts.isTextWindow) {
                const halfCols = Math.floor(this.cols / 2);
                offx = Math.min(Math.min(82, halfCols), this.cols - maxcol - 2);
            } else {
                const halfCols = Math.floor(this.cols / 2) + 1;
                offx = Math.min(halfCols, this.cols - maxcol - 1);
            }
        }
        // C ref: tty_display_nhwindow clamps cw->offx >= 0.
        // Without this, wide text lines can produce negative offx and
        // incorrectly clear the left side of the map.
        offx = Math.max(0, offx);

        const hasMoreLine = (renderLines[menuRows - 1] || '').endsWith('--More--');
        const left = hasMoreLine ? Math.max(0, offx - 1) : offx;
        const savedCells = [];
        for (let r = 0; r < menuRows; r++) {
            savedCells[r] = [];
            for (let c = left; c < this.cols; c++) {
                const cell = this.grid[r][c];
                savedCells[r][c] = {
                    ch: cell?.ch ?? ' ',
                    color: cell?.color ?? CLR_GRAY,
                    attr: cell?.attr || 0,
                };
            }
        }
        // Clear the popup area
        for (let r = 0; r < menuRows; r++) {
            for (let c = Math.max(0, offx); c < this.cols; c++) {
                this.setCell(c, r, ' ', CLR_GRAY);
            }
        }
        // Render each line
        for (let i = 0; i < menuRows; i++) {
            const line = renderLines[i] || '';
            const isMoreLine = (i === menuRows - 1) && line.endsWith('--More--');
            const col = isMoreLine ? Math.max(0, offx - 1) : offx;
            this.putstr(col, i, line, CLR_GRAY, 0);
        }
        // Position cursor at end of marker
        const lastRow = menuRows - 1;
        const lastLine = renderLines[lastRow] || '';
        const isMore = lastLine.endsWith('--More--');
        const markerCol = isMore ? Math.max(0, offx - 1) : offx;
        const markerEnd = markerCol + lastLine.length;
        const cursorCol = (opts.isTextWindow && !isMore) ? markerEnd + 1 : markerEnd;
        this.setCursor(Math.min(cursorCol, this.cols - 1), lastRow);
        this._lastTextPopup = {
            offx,
            rows: menuRows,
            hasMoreLine: isMore,
            isTextWindow: !!opts.isTextWindow,
            savedCells,
        };
    }

    clearTextPopup() {
        const popup = this._lastTextPopup;
        if (!popup) return;
        const savedCells = popup.savedCells;
        if (Array.isArray(savedCells)) {
            for (let r = 0; r < popup.rows && r < this.rows; r++) {
                const row = savedCells[r];
                if (!row) continue;
                for (let c = 0; c < this.cols; c++) {
                    const saved = row[c];
                    if (!saved) continue;
                    this.setCell(c, r, saved.ch, saved.color, saved.attr || 0);
                }
            }
        } else {
            const left = popup.hasMoreLine ? Math.max(0, popup.offx - 1) : popup.offx;
            for (let r = 0; r < popup.rows && r < this.rows; r++) {
                for (let c = left; c < this.cols; c++) {
                    this.setCell(c, r, ' ', CLR_GRAY);
                }
            }
        }
        this._lastTextPopup = null;
    }

    // Place cursor on the player position (cursor only, no character write)
    // C ref: display.c curs_on_u() → curs(WIN_MAP, u.ux, u.uy)
    // The '@' glyph is already placed by renderMap/show_glyph; this only
    // moves the terminal cursor to the player's position.
    cursorOnPlayer(player) {
        if (player) {
            const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
            this.setCursor(player.x - 1, player.y + mapOffset);
        }
    }

    // --- Hover info helpers ---

    // Get terrain description for a map location
    _terrainDesc(loc) {
        const typ = loc.typ;
        if (typ === DOOR) {
            if (loc.flags & D_ISOPEN) return 'open door';
            if (loc.flags & D_CLOSED || loc.flags & D_LOCKED) return 'closed door';
            return 'doorway';
        }
        if (typ === STAIRS) return loc.flags === 1 ? 'staircase up' : 'staircase down';
        const names = {
            [STONE]: '', [VWALL]: 'wall', [HWALL]: 'wall',
            [TLCORNER]: 'wall', [TRCORNER]: 'wall', [BLCORNER]: 'wall', [BRCORNER]: 'wall',
            [CROSSWALL]: 'wall', [TUWALL]: 'wall', [TDWALL]: 'wall',
            [TLWALL]: 'wall', [TRWALL]: 'wall',
            [CORR]: 'corridor', [ROOM]: 'floor',
            [FOUNTAIN]: 'fountain', [THRONE]: 'throne', [SINK]: 'sink',
            [GRAVE]: 'grave', [ALTAR]: 'altar',
            [POOL]: 'pool of water', [MOAT]: 'moat', [WATER]: 'water',
            [LAVAPOOL]: 'molten lava', [LAVAWALL]: 'wall of lava',
            [ICE]: 'ice', [IRONBARS]: 'iron bars', [TREE]: 'tree',
            [DRAWBRIDGE_UP]: 'drawbridge', [DRAWBRIDGE_DOWN]: 'drawbridge',
            [AIR]: 'air', [CLOUD]: 'cloud',
            [SDOOR]: 'wall', [SCORR]: '',
        };
        return names[typ] || '';
    }

    // Look up monster class description from display character
    _monsterClassDesc(ch) {
        for (let i = 1; i < def_monsyms.length; i++) {
            if (def_monsyms[i].sym === ch) return def_monsyms[i].explain;
        }
        return 'creature';
    }

    // Look up object class description from oc_class
    _objectClassDesc(oc_class) {
        // def_oc_syms is 1-indexed (idx 0 is placeholder)
        const idx = oc_class + 1;
        if (idx > 0 && idx < def_oc_syms.length) return def_oc_syms[idx].explain;
        return 'object';
    }

    // Get stats string for an object based on its class
    _objectStats(obj) {
        const parts = [];
        if (obj.damage) parts.push(`Dmg: ${obj.damage[0]}d${obj.damage[1]}`);
        if (obj.ac) parts.push(`AC ${obj.ac}`);
        if (obj.nutrition) parts.push(`Nutr: ${obj.nutrition}`);
        if (obj.charges) parts.push(`Charges: ${obj.charges}`);
        if (obj.weight) parts.push(`Wt: ${obj.weight}`);
        return parts.join(', ');
    }

    // Set up mouseover handling for the hover info panel
    _setupHover(pre) {
        const display = this;
        const panel = document.getElementById('hover-info');
        if (!panel) return;

        const nameEl = document.getElementById('hover-name');
        const descEl = document.getElementById('hover-desc');
        const statsEl = document.getElementById('hover-stats');
        const symbolEl = document.getElementById('hover-symbol');

        pre.addEventListener('mouseover', function(e) {
            const span = e.target;
            if (!span.dataset || span.dataset.row === undefined) return;
            const r = parseInt(span.dataset.row);
            const c = parseInt(span.dataset.col);
            const info = display.cellInfo[r] && display.cellInfo[r][c];
            if (info && info.name) {
                const ch = display.grid[r][c].ch;
                const color = COLOR_CSS[info.color] || COLOR_CSS[CLR_GRAY];
                if (symbolEl) {
                    symbolEl.textContent = ch;
                    symbolEl.style.color = color;
                }
                if (nameEl && info.nameHtml) nameEl.innerHTML = info.nameHtml;
                else if (nameEl) nameEl.textContent = info.name;
                if (descEl && info.descHtml) descEl.innerHTML = info.descHtml;
                else if (descEl) descEl.textContent = info.desc;
                if (statsEl) statsEl.textContent = info.stats || '';
                panel.style.visibility = 'visible';
            } else {
                panel.style.visibility = 'hidden';
            }
        });

        pre.addEventListener('mouseout', function(e) {
            // Only hide if leaving the pre entirely
            if (!pre.contains(e.relatedTarget)) {
                panel.style.visibility = 'hidden';
            }
        });
    }

    // Render the C NetHack tombstone ASCII art on a cleared screen.
    // C ref: rip.c genl_outrip()
    // name: player name, gold: gold amount, deathLines: array of pre-wrapped lines,
    // year: 4-digit year string
    renderTombstone(name, gold, deathLines, year) {
        this.clearScreen();

        // C ref: rip.c rip[] — the tombstone art template
        const rip = [
            '                       ----------',
            '                      /          \\',
            '                     /    REST    \\',
            '                    /      IN      \\',
            '                   /     PEACE      \\',
            '                  /                  \\',
        ];

        // Centered text lines on the tombstone face
        // The stone face is 18 chars wide (between | markers), center col ~28
        const CENTER = 28;
        const FACE_WIDTH = 16;

        function centerOnStone(text) {
            if (text.length > FACE_WIDTH) text = text.substring(0, FACE_WIDTH);
            const pad = Math.floor((FACE_WIDTH - text.length) / 2);
            const inner = ' '.repeat(pad) + text + ' '.repeat(FACE_WIDTH - pad - text.length);
            return '                  |' + ' ' + inner + ' ' + '|';
        }

        // Name line
        rip.push(centerOnStone(name));
        // Gold line
        rip.push(centerOnStone(`${gold} Au`));
        // Death description lines (up to 4)
        for (let i = 0; i < 4; i++) {
            rip.push(centerOnStone(deathLines[i] || ''));
        }
        // Empty line
        rip.push(centerOnStone(''));
        // Year line
        rip.push(centerOnStone(year));

        // Bottom of tombstone
        rip.push('                 *|     *  *  *      | *');
        rip.push('        _________)/\\\\__//(\\\\/(/\\\\)/\\\\//\\\\/|_)_______');

        // Render each line
        for (let i = 0; i < rip.length && i < this.rows; i++) {
            this.putstr(0, i, rip[i], CLR_WHITE);
        }
    }

    // Render the topten list on screen.
    // lines: array of {text, highlight} objects.
    // startRow: row to start rendering at.
    renderTopTen(lines, startRow) {
        for (let i = 0; i < lines.length && startRow + i < this.rows; i++) {
            const line = lines[i];
            this.putstr(0, startRow + i, line.text.substring(0, this.cols),
                line.highlight ? CLR_YELLOW : CLR_GRAY);
        }
    }
}

// Autotranslated from display.c:165
export function tp_sensemon(mon, playerArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const player = playerArg || ctx?.player || null;
  return telepathySensesMonsterForMap(mon, player);
}

// Autotranslated from display.c:172
export function sensemon(mon, playerArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map || null;
  const player = playerArg || ctx?.player || null;
  return senseMonsterForMap(mon, map, player);
}

// Autotranslated from display.c:179
export function mon_warning(mon, player = null, ctxOrMap = null) {
  const activePlayer = player || _resolveDisplayCtx(ctxOrMap)?.player;
  if (!mon || !activePlayer) return false;
  if (!hasPlayerProp(activePlayer, WARNING, 'warning', 'Warning')) return false;
  if ((mon.mhp | 0) <= 0) return false;
  if (mon.mpeaceful || mon.mtame) return false;
  return true;
}

// Autotranslated from display.c:186
export function mon_visible(mon, playerArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const player = playerArg || ctx?.player || null;
  return monVisibleForMap(mon, player);
}

// Autotranslated from display.c:193
export function see_with_infrared(mon, playerArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map || null;
  const player = playerArg || ctx?.player || null;
  return seeWithInfraredForMap(mon, map, player);
}

// Autotranslated from display.c:200
export function canseemon(mon, playerArg = null, fovArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map || null;
  const player = playerArg || ctx?.player || null;
  const fov = fovArg || ctx?.fov || null;
  return canSeeMonsterForMap(mon, map, player, fov);
}

// Autotranslated from display.c:207
export function knowninvisible(mon, playerArg = null, fovArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map || null;
  const player = playerArg || ctx?.player || null;
  const fov = fovArg || ctx?.fov || null;
  if (!mon || !player || !mon.minvis) return false;
  const canSeeSpot = !!(map && cansee(map, player, fov, mon.mx, mon.my));
  const hasSeeInvis = hasPlayerProp(player, SEE_INVIS, 'seeInvisible', 'See_invisible');
  const hasDetectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
  if (canSeeSpot && (hasSeeInvis || hasDetectMonsters)) return true;
  if (playerBlind(player)) return false;
  const telepathicFromNonIntrinsic = !!(player?.uprops?.[TELEPAT]?.extrinsic
      || player?.unblind_telepat_range
      || player?.unblindTelepathRange);
  if (!telepathicFromNonIntrinsic) return false;
  const range = Number(player?.unblind_telepat_range || player?.unblindTelepathRange || BOLT_LIM);
  const dx = (player.x | 0) - (mon.mx | 0);
  const dy = (player.y | 0) - (mon.my | 0);
  return (dx * dx + dy * dy) <= (range * range);
}

// Autotranslated from display.c:214
export function is_safemon(mon, playerArg = null, fovArg = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const flags = ctx?.flags || null;
  const player = playerArg || ctx?.player || null;
  const safeDog = !!(flags?.safe_dog ?? flags?.safe_pet ?? true);
  if (!safeDog || !mon?.mpeaceful) return false;
  if (!canSpotMonsterForMap(mon, ctx?.map || null, player, fovArg || ctx?.fov || null)) return false;
  const confused = !!(player?.confused || player?.Confusion);
  const hallucinating = !!(player?.hallucinating || player?.Hallucination);
  const stunned = !!(player?.stunned || player?.Stunned);
  return !(confused || hallucinating || stunned);
}

// Autotranslated from display.c:387
export function unmap_invisible(x, y, map) {
  if (!map || !isok(x, y)) return false;
  const loc = map.at(x, y);
  const mappedInvisible = !!(loc?.mem_invis
      || (loc && glyph_is_invisible(loc.glyph)));
  if (mappedInvisible) {
    unmap_object(x, y, map);
    newsym(x, y);
    return true;
  }
  return false;
}

// Autotranslated from display.c:422
export function unmap_object(x, y, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  const player = ctx?.player;
  const fov = ctx?.fov;
  if (!map || !isok(x, y)) return;
  if (map.flags?.hero_memory === false) return;
  const loc = map.at(x, y);
  if (!loc) return;
  loc.mem_invis = false;

  const covered = coversObjectsAt(loc, player);
  const trap = (typeof map.trapAt === 'function') ? map.trapAt(x, y) : null;
  if (trap && trap.tseen && !covered) {
    const tg = trapGlyph(trap.ttyp);
    loc.mem_trap = tg.ch;
    loc.mem_trap_color = tg.color;
    loc.mem_obj = 0;
    loc.mem_obj_color = 0;
    return;
  }

  loc.mem_trap = 0;
  loc.mem_trap_color = 0;
  if (loc.seenv) {
    const engr = (typeof map.engravingAt === 'function') ? map.engravingAt(x, y) : null;
    if (spotShowsEngravings(loc) && engr && !covered) {
      if (fov?.canSee?.(x, y)) engr.erevealed = true;
      const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
      loc.mem_obj = engrCh;
      loc.mem_obj_color = CLR_BRIGHT_BLUE;
      return;
    }
    loc.mem_obj = 0;
    loc.mem_obj_color = 0;
    if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
      loc.mem_terrain_ch = ' ';
      loc.mem_terrain_color = CLR_GRAY;
      return;
    }
    const sym = renderTerrainSymbol(loc, map, x, y, ctx?.flags || null);
    const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
    loc.mem_terrain_ch = sym.ch;
    loc.mem_terrain_color = rememberedColor;
    if (!loc.waslit && loc.typ === ROOM) {
      loc.mem_terrain_ch = ' ';
      loc.mem_terrain_color = CLR_GRAY;
    }
    return;
  }

  loc.mem_obj = 0;
  loc.mem_obj_color = 0;
  loc.mem_terrain_ch = ' ';
  loc.mem_terrain_color = CLR_GRAY;
}

// Autotranslated from display.c:233
export function map_background(xOrMap, yOrX, showOrY = 0, ctxOrShow = null) {
  let x = xOrMap, y = yOrX, show = showOrY, ctxOrMap = ctxOrShow;
  if (typeof xOrMap === 'object' && Number.isInteger(yOrX) && Number.isInteger(showOrY)) {
    ctxOrMap = xOrMap;
    x = yOrX;
    y = showOrY;
    show = Number(ctxOrShow) || 0;
  }
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  if (!map || !isok(x, y)) return;
  const loc = map.at(x, y);
  if (!loc) return;
  if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
    loc.mem_terrain_ch = ' ';
    loc.mem_terrain_color = CLR_GRAY;
    if (show) show_glyph(x, y, { ch: ' ', color: CLR_GRAY }, ctx);
    return;
  }
  const sym = renderTerrainSymbol(loc, map, x, y, ctx?.flags || null);
  const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
  loc.mem_terrain_ch = sym.ch;
  loc.mem_terrain_color = rememberedColor;
  if (show) show_glyph(x, y, { ch: sym.ch, color: sym.color }, ctx);
}

// Autotranslated from display.c:313
export function map_engraving(engr, show = 0, ctxOrMap = null) {
  if (!engr) return;
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  if (!map || !isok(engr.engr_x, engr.engr_y)) return;
  const x = engr.engr_x;
  const y = engr.engr_y;
  const loc = map.at(x, y);
  if (!loc) return;
  const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
  loc.mem_obj = engrCh;
  loc.mem_obj_color = CLR_BRIGHT_BLUE;
  if (show) show_glyph(x, y, { ch: engrCh, color: CLR_BRIGHT_BLUE }, ctx);
}

// Autotranslated from display.c:333
export function map_object(obj, show = 0, ctxOrMap = null) {
  if (!obj || !Number.isInteger(obj.ox) || !Number.isInteger(obj.oy)) return;
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  const player = ctx?.player;
  if (!map || !isok(obj.ox, obj.oy)) return;
  const loc = map.at(obj.ox, obj.oy);
  if (!loc) return;
  const hallu = !!(player?.Hallucination || player?.hallucinating);
  const glyph = objectMapGlyph(obj, hallu, { player, x: obj.ox, y: obj.oy });
  const memGlyph = hallu
      ? objectMapGlyph(obj, false, { player, x: obj.ox, y: obj.oy, observe: false })
      : glyph;
  loc.mem_obj = memGlyph.ch || 0;
  loc.mem_obj_color = Number.isInteger(memGlyph.color) ? memGlyph.color : CLR_GRAY;
  if (show) show_glyph(obj.ox, obj.oy, glyph, ctx);
}

// Autotranslated from display.c:296
export function map_trap(trap, show = 0, ctxOrMap = null) {
  if (!trap) return;
  const x = trap.tx;
  const y = trap.ty;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return;
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  if (!map || !isok(x, y)) return;
  const loc = map.at(x, y);
  if (!loc) return;
  const tg = trapGlyph(trap.ttyp);
  loc.mem_trap = tg.ch;
  loc.mem_trap_color = tg.color;
  if (show) show_glyph(x, y, { ch: tg.ch, color: tg.color }, ctx);
}

// Autotranslated from display.c:488
export function map_location(x, y, show = 0, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  if (!map || !isok(x, y)) return;
  const loc = map.at(x, y);
  if (!loc) return;
  const covered = coversObjectsAt(loc, ctx?.player);
  const objs = (!covered && typeof map.objectsAt === 'function') ? map.objectsAt(x, y) : [];
  if (objs && objs.length > 0) {
    map_object(objs[objs.length - 1], show, ctx);
    return;
  }
  const trap = (typeof map.trapAt === 'function') ? map.trapAt(x, y) : null;
  if (trap && trap.tseen && !covered) {
    map_trap(trap, show, ctx);
    return;
  }
  const engr = (typeof map.engravingAt === 'function') ? map.engravingAt(x, y) : null;
  if (spotShowsEngravings(loc) && engr && engr.erevealed && !covered) {
    map_engraving(engr, show, ctx);
    return;
  }
  map_background(x, y, show, ctx);
}

// Autotranslated from display.c:481
export function show_glyph(x, y, glyph, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const gameMap = ctx?.map;
  const display = ctx?.display;
  if (!gameMap || !display || !isok(x, y)) return;
  const loc = gameMap.at(x, y);
  let cell = glyph;
  if (typeof glyph === 'number') {
    cell = tempGlyphToCell(glyph);
    if (loc) loc.glyph = glyph;
  }
  if (!cell || typeof cell.ch !== 'string' || cell.ch.length === 0) return;
  const mapOffset = ctx?.flags?.msg_window ? 3 : MAP_ROW_START;
  display.setCell(x - 1, y + mapOffset, cell.ch[0], Number.isInteger(cell.color) ? cell.color : CLR_GRAY);
}

// Autotranslated from display.c:481
export function show_mon_or_warn(x, y, monglyph, map) {
  const ctx = _resolveDisplayCtx(map);
  const gameMap = ctx?.map;
  if (!gameMap || !isok(x, y)) return;
  const loc = gameMap.at(x, y);
  if (loc && loc.mem_invis) loc.mem_invis = false;
  show_glyph(x, y, monglyph, ctx);
}

// Autotranslated from display.c:633
export function display_warning(mon, player = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const gameMap = ctx?.map;
  const activePlayer = player || ctx?.player;
  if (!mon || !activePlayer || !gameMap) return;
  let x = mon.mx, y = mon.my, glyph;
  if (mon_warning(mon, activePlayer, ctx)) {
    let wl = (activePlayer?.Hallucination || activePlayer?.hallucinating || false)
      ? rn2(WARNCOUNT - 1) + 1
      : warning_of(mon, activePlayer, ctx);
    wl = Math.max(0, Math.min(WARNCOUNT - 1, wl | 0));
    const ws = def_warnsyms[wl];
    glyph = {
      ch: (ws?.ch && ws.ch.length > 0) ? ws.ch[0] : '?',
      color: Number.isInteger(ws?.color) ? ws.color : CLR_WHITE,
    };
  }
  else if (hasPlayerProp(activePlayer, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon')) {
    glyph = monsterMapGlyph(mon, !!(activePlayer?.Hallucination || activePlayer?.hallucinating));
  } else return;
  show_mon_or_warn(x, y, glyph, ctx);
}

// Autotranslated from display.c:653
export function warning_of(mon, player = null, ctxOrMap = null) {
  const activePlayer = player || _resolveDisplayCtx(ctxOrMap)?.player;
  if (!activePlayer) return 0;
  let wl = 0, tmp = 0;
  if (mon_warning(mon, activePlayer, ctxOrMap)) {
    tmp = Math.trunc(mon.m_lev / 4);
    wl = (tmp > WARNCOUNT - 1) ? WARNCOUNT - 1 : tmp;
  }
  return wl;
}

// C ref: display.c display_monster()/newsym() helper; full mimic glyph variants
// are still handled by newsym's broader map logic.
export function display_monster(x, y, mon, sightflags = 0, worm_tail = false, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const gameMap = ctx?.map;
  const player = ctx?.player;
  if (!mon || !gameMap || !player || !isok(x, y)) return;
  const glyph = monsterMapGlyph(mon, !!(player?.Hallucination || player?.hallucinating));
  show_mon_or_warn(x, y, glyph, ctx);
  mon.meverseen = 1;
}

// C ref: display.c mon_overrides_region(); simplified region override decision.
export function mon_overrides_region(mon, mx, my, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const gameMap = ctx?.map;
  const player = ctx?.player;
  const fov = ctx?.fov;
  if (!mon || !gameMap || !player) return false;
  if (mx === mon.mx && my === mon.my && senseMonsterForMap(mon, gameMap, player)) return true;
  const dx = Math.abs((player.x | 0) - (mx | 0));
  const dy = Math.abs((player.y | 0) - (my | 0));
  if (Math.max(dx, dy) <= 1 && canSeeMonsterForMap(mon, gameMap, player, fov)) return true;
  return false;
}

// Autotranslated from display.c:725
export function feel_newsym(x, y, player) {
  if ((player?.Blind || player?.blind || false)) feel_location(x, y);
  else {
    newsym(x, y);
  }
}

// Autotranslated from display.c:759
export function feel_location(x, y, ctxOrMap = null) {
  if (!isok(x, y)) return;
  const ctx = _resolveDisplayCtx(ctxOrMap);
  map_location(x, y, 1, ctx);
}

// Autotranslated from display.c:1100
export async function shieldeff(x, y, game) {
  let i;
  if (!game.flags.sparkle) return;
  if (cansee(x, y)) {
    for (i = 0; i < SHIELD_COUNT; i++) {
      show_glyph(x, y, cmap_to_glyph(shield_static[i]));
      flush_screen(1);
      await nh_delay_output();
    }
    newsym(x, y);
  }
}

// Autotranslated from display.c:1117
export function tether_glyph(x, y, player) {
  let tdx, tdy;
  tdx = player.x - x;
  tdy = player.y - y;
  return zapdir_to_glyph(Math.sign(tdx), Math.sign(tdy), 2);
}

// Autotranslated from display.c:1322
let _swallowedLastX = null;
let _swallowedLastY = null;
export async function swallowed(first, player) {
  let swallower, left_ok, rght_ok;
  const ctx = _getDisplayCtx();
  if (first) {
    await cls(ctx);
    if (ctx?.display && ctx?.player && typeof ctx.display.renderStatus === 'function') {
      ctx.display.renderStatus(ctx.player);
    }
  }
  else {
    let x, y;
    for (y = (_swallowedLastY ?? player.y) - 1; y <= (_swallowedLastY ?? player.y) + 1; y++) {
      for (x = (_swallowedLastX ?? player.x) - 1; x <= (_swallowedLastX ?? player.x) + 1; x++) {
        if (isok(x, y)) show_glyph(x, y, GLYPH_UNEXPLORED);
      }
    }
  }
  swallower = monsndx(player.ustuck.data);
  left_ok = isok(player.x - 1, player.y);
  rght_ok = isok(player.x + 1, player.y);
  if (isok(player.x, player.y - 1)) {
    if (left_ok) show_glyph(player.x - 1, player.y - 1, swallow_to_glyph(swallower, S_sw_tl));
    show_glyph(player.x, player.y - 1, swallow_to_glyph(swallower, S_sw_tc));
    if (rght_ok) show_glyph(player.x + 1, player.y - 1, swallow_to_glyph(swallower, S_sw_tr));
  }
  if (left_ok) show_glyph(player.x - 1, player.y, swallow_to_glyph(swallower, S_sw_ml));
  show_glyph(player.x, player.y, { ch: '@', color: CLR_WHITE }, ctx);
  if (rght_ok) show_glyph(player.x + 1, player.y, swallow_to_glyph(swallower, S_sw_mr));
  if (isok(player.x, player.y + 1)) {
    if (left_ok) show_glyph(player.x - 1, player.y + 1, swallow_to_glyph(swallower, S_sw_bl));
    show_glyph(player.x, player.y + 1, swallow_to_glyph(swallower, S_sw_bc));
    if (rght_ok) show_glyph(player.x + 1, player.y + 1, swallow_to_glyph(swallower, S_sw_br));
  }
  _swallowedLastX = player.x;
  _swallowedLastY = player.y;
}

// Autotranslated from display.c:1385
let _underWaterLastX = null;
let _underWaterLastY = null;
let _underWaterDeferredClear = false;
export async function under_water(mode, map, player) {
  let x, y;
  if (player.uswallow) return;
  if (mode === 1 || _underWaterDeferredClear) { await cls(); _underWaterDeferredClear = false; }
  else if (mode === 2) { _underWaterDeferredClear = true; return; }
  else {
    for (y = (_underWaterLastY ?? player.y) - 1; y <= (_underWaterLastY ?? player.y) + 1; y++) {
      for (x = (_underWaterLastX ?? player.x) - 1; x <= (_underWaterLastX ?? player.x) + 1; x++) {
        if (isok(x, y)) show_glyph(x, y, GLYPH_UNEXPLORED);
      }
    }
  }
  for (x = player.x - 1; x <= player.x + 1; x++) {
    for (y = player.y - 1; y <= player.y + 1; y++) {
      const loc = map?.at?.(x, y);
      const watery = !!loc && (loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER
        || loc.typ === LAVAPOOL || loc.typ === LAVAWALL || loc.typ === ICE);
      if (isok(x, y) && watery) {
        if ((player?.Blind || player?.blind || false) && !(player?.x === x && player?.y === y)) show_glyph(x, y, GLYPH_UNEXPLORED);
        else {
          newsym(x, y, map);
        }
      }
    }
  }
  _underWaterLastX = player.x;
  _underWaterLastY = player.y;
}

// Autotranslated from display.c:1435
let _underGroundDeferredClear = false;
export async function under_ground(mode, player) {
  if (player.uswallow) return;
  if (mode === 1 || _underGroundDeferredClear) { await cls(); _underGroundDeferredClear = false; }
  else if (mode === 2) { _underGroundDeferredClear = true; return; }
  else { newsym(player.x, player.y); }
}

// Autotranslated from display.c:1520
export function mimic_light_blocking(mtmp) {
  if (mtmp.minvis && is_lightblocker_mappear(mtmp)) {
    if (See_invisible) block_point(mtmp.mx, mtmp.my);
    else {
      unblock_point(mtmp.mx, mtmp.my);
    }
  }
}

// Autotranslated from display.c:1536
export function set_mimic_blocking() {
  const map = _gstate?.map;
  const monsters = Array.isArray(map?.monsters) ? map.monsters : [];
  for (const mon of monsters) mimic_light_blocking(mon);
}

// Autotranslated from display.c:1546
// C: vobj_at(x,y) == obj checks if obj is the topmost object at (x,y).
// JS: map.objects is a flat array; we newsym each unique occupied cell.
export function see_objects() {
  const map = _gstate?.map;
  if (map?.objects) {
    const seen = new Set();
    for (const obj of map.objects) {
      const key = obj.ox * 1000 + obj.oy;
      if (!seen.has(key)) {
        seen.add(key);
        newsym(obj.ox, obj.oy);
      }
    }
  }
  update_inventory();
}

// Autotranslated from display.c:1599
export function see_traps() {
  const map = _gstate?.map;
  if (map?.traps) {
    for (const trap of map.traps) {
      const glyph = glyph_at(trap.tx, trap.ty);
      if (glyph_is_trap(glyph)) newsym(trap.tx, trap.ty);
    }
  }
}

// Autotranslated from display.c:1675
export async function curs_on_u() {
  await flush_screen(1);
}

// Autotranslated from display.c:1682
export async function doredraw() {
  await docrt();
  return ECMD_OK;
}

function docrtRecalc(ctx) {
  if (!ctx?.map || !ctx?.player) return;
  vision_recalc(ctx.fov || null, ctx.map, ctx.player);
}

// Autotranslated from display.c:1704
export async function docrt_flags(recalc = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  if (!ctx?.display || !ctx?.map) return;
  if (typeof recalc === 'function') recalc(ctx);
  for (let x = 1; x < COLNO; x++) {
    for (let y = 0; y < ROWNO; y++) {
      newsym(x, y, ctx);
    }
  }
  flush_screen(0);
}

// Autotranslated from display.c:1690
export async function docrt() {
  await docrt_flags(docrtRecalc);
}

// Autotranslated from display.c:2207
export async function cls(ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const display = ctx?.display;
  if (!display) return;
  if (typeof display.clearRow === 'function') {
    for (let r = 0; r < display.rows; r++) display.clearRow(r);
    return;
  }
  for (let r = 0; r < (display.rows || TERMINAL_ROWS); r++) {
    for (let c = 0; c < (display.cols || TERMINAL_COLS); c++) {
      display.setCell?.(c, r, ' ', CLR_GRAY);
    }
  }
}

// Autotranslated from display.c:1851
export function newsym_force(x, y) {
  newsym(x, y);
}

// Autotranslated from display.c:2425
export function swallow_to_glyph(mnum, loc) {
  const m_3 = (Number(mnum) | 0) << 3;
  if (loc < S_sw_tl || S_sw_br < loc) {
    impossible("swallow_to_glyph: bad swallow location");
    loc = S_sw_br;
  }
  return (m_3 | (loc - S_sw_tl)) + GLYPH_SWALLOW_OFF;
}

// Autotranslated from display.c:2449
export function zapdir_to_glyph(dx, dy, beam_type) {
  if (beam_type >= NUM_ZAP) {
    impossible("zapdir_to_glyph: illegal beam type");
    beam_type = 0;
  }
  dx = (dx === dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0;
  return ( ((beam_type << 2) | dx)) + GLYPH_ZAP_OFF;
}

// Autotranslated from display.c:2466
export function glyph_at(x, y) {
  if (x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return cmap_to_glyph(ROOM);
  const map = _getDisplayCtx()?.map;
  const loc = map?.at?.(x, y);
  if (!loc) return cmap_to_glyph(ROOM);
  if (Number.isInteger(loc.glyph)) return loc.glyph;
  return cmap_to_glyph(Number.isInteger(loc.typ) ? loc.typ : ROOM);
}

// Autotranslated from display.c:3118
export function check_pos(x, y, which, map) {
  let type;
  if (!isok(x, y)) return which;
  const gameMap = map || _getDisplayCtx()?.map;
  if (!gameMap) return 0;
  if (typeof gameMap.at === 'function') type = gameMap.at(x, y)?.typ;
  else type = gameMap.locations?.[x]?.[y]?.typ;
  if (!Number.isInteger(type)) return 0;
  if (IS_STWALL(type) || type === CORR || type === SCORR || IS_SDOOR(type)) return which;
  return 0;
}

// Autotranslated from display.c:3196
export function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {
  let wmode, is_1, is_2, is_3, is_4;
  is_1 = check_pos(x1, y1, 1);
  is_2 = check_pos(x2, y2, 1);
  is_3 = check_pos(x3, y3, 1);
  is_4 = check_pos(x4, y4, 1);
  if (is_4) { wmode = WM_C_INNER; }
  else if (is_1 && is_2 && is_3) wmode = WM_C_OUTER;
  else {
    wmode = 0;
  }
  return wmode;
}

// Autotranslated from display.c:3228
export function set_crosswall(x, y) {
  let wmode, is_1, is_2, is_3, is_4;
  is_1 = check_pos(x - 1, y - 1, 1);
  is_2 = check_pos(x + 1, y - 1, 1);
  is_3 = check_pos(x + 1, y + 1, 1);
  is_4 = check_pos(x - 1, y + 1, 1);
  wmode = is_1 + is_2 + is_3 + is_4;
  if (wmode > 1) {
    if (is_1 && is_3 && (is_2 + is_4 === 0)) { wmode = WM_X_TLBR; }
    else if (is_2 && is_4 && (is_1 + is_3 === 0)) { wmode = WM_X_BLTR; }
    else { wmode = 0; }
  }
  else if (is_1) wmode = WM_X_TL;
  else if (is_2) wmode = WM_X_TR;
  else if (is_3) wmode = WM_X_BR;
  else if (is_4) wmode = WM_X_BL;
  return wmode;
}

// Autotranslated from display.c:3318
export function set_wall_state() {
  const map = _getDisplayCtx()?.map;
  if (!map) return;
  if (typeof dungeonSetWallState === 'function') {
    dungeonSetWallState(map);
    return;
  }
  for (let x = 0; x < COLNO; x++) {
    for (let y = 0; y < ROWNO; y++) {
      dungeonXySetWallState?.(map, x, y);
    }
  }
}

// Autotranslated from display.c:3357
export function set_seenv(lev, x0, y0, x, y) {
  if (!lev) return;
  const dx = x - x0;
  const dy = y0 - y;
  const seenvMatrix = [
    [SV2, SV1, SV0],
    [SV3, 0xff, SV7],
    [SV4, SV5, SV6],
  ];
  lev.seenv = (Number(lev.seenv) | 0)
    | seenvMatrix[Math.sign(dy) + 1][Math.sign(dx) + 1];
}

// C macro: #define cmap_to_glyph(cmap_idx) ((int)(cmap_idx) + GLYPH_CMAP_MAIN_OFF)
export function cmap_to_glyph(cmap_idx) {
  return cmap_idx + GLYPH_CMAP_MAIN_OFF;
}

// Autotranslated from display.c:3785
export function fn_cmap_to_glyph(cmap) {
  return cmap_to_glyph(cmap);
}

// ========================================================================
// Display functions moved from monutil.js — C ref: display.c / vision.c
// ========================================================================

import { game as _gstate } from './gstate.js';
import { impossible } from './pline.js';

function _getDisplayCtx() {
    if (!_gstate) return null;
    return {
        display: _gstate.display,
        player: _gstate.player,
        fov: _gstate.fov,
        flags: _gstate.flags,
        map: _gstate.map,
    };
}

function playerHasActiveProp(player, prop) {
    if (!player || !Number.isInteger(prop)) return false;
    if (typeof player.hasProp === 'function') return !!player.hasProp(prop);
    const entry = player.uprops?.[prop];
    if (!entry) return false;
    return !!(entry.intrinsic || entry.extrinsic);
}

function playerCanSeeInvisible(player) {
    return !!(player?.seeInvisible || player?.See_invisible || playerHasActiveProp(player, SEE_INVIS));
}

function _resolveDisplayCtx(ctxOrMap) {
    if (ctxOrMap && typeof ctxOrMap === 'object') {
        if (ctxOrMap.display || ctxOrMap.map || ctxOrMap.player || ctxOrMap.fov || ctxOrMap.flags) {
            const base = _getDisplayCtx() || {};
            return { ...base, ...ctxOrMap };
        }
        if (typeof ctxOrMap.at === 'function') {
            const base = _getDisplayCtx() || {};
            return { ...base, map: ctxOrMap };
        }
    }
    return _getDisplayCtx();
}

// C ref: display.c:378 map_invisible()
export function map_invisible(map, x, y, player) {
    if (!map || !isok(x, y)) return;
    if (player && x === player.x && y === player.y) return;
    const loc = map.at(x, y);
    if (!loc) return;
    loc.mem_invis = true;
    newsym(x, y);
}

// C ref: display.c:918 newsym()
export function newsym(x, y, ctxOrMap = null) {
    const ctx = _resolveDisplayCtx(ctxOrMap);
    const map = ctx?.map;
    if (!map || !isok(x, y)) return;
    const loc = map.at(x, y);
    if (!loc) return;

    const { display, player, fov, flags } = ctx;
    if (!display || typeof display.setCell !== 'function') return;
    const mapOffset = flags?.msg_window ? 3 : MAP_ROW_START;
    const col = x - 1;
    const row = y + mapOffset;
    const rememberTerrain = () => {
        if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
            loc.mem_terrain_ch = ' ';
            loc.mem_terrain_color = CLR_GRAY;
            return { ch: ' ', color: CLR_GRAY };
        }
        const sym = renderTerrainSymbol(loc, map, x, y, flags);
        const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
        loc.mem_terrain_ch = sym.ch;
        loc.mem_terrain_color = rememberedColor;
        return { ch: sym.ch, color: rememberedColor };
    };

    // C ref: always render the player glyph at the hero's position,
    // even when out of FOV (e.g. during levitation on stairs).
    // When mounted, C shows the steed glyph on hero square instead.
    if (player && x === player.x && y === player.y && !player.usteed) {
        const heroGlyph = playerMapGlyph(player);
        display.setCell(col, row, heroGlyph.ch, heroGlyph.color);
        return;
    }

    // --- Not visible (out of FOV) ---
    if (!fov || !fov.canSee(x, y)) {
        const mon = map.monsterAt(x, y);
        const detectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
        if (mon && detectMonsters) {
            // C ref: display.c newsym() out-of-sight branch shows monsters
            // when Detect_monsters is active; glyph is inverse-video.
            const hallu = !!(player?.Hallucination || player?.hallucinating);
            const glyph = monsterMapGlyph(mon, hallu);
            display.setCell(col, row, glyph.ch, glyph.color, 1);
            mon.meverseen = 1;
            return;
        }
        const monVisibleByOwnLight = !!(mon
            && emits_light(mon.data || mon.type || {}) > 0
            && couldsee(map, player, x, y)
            && monVisibleForMap(mon, player));
        if (monVisibleByOwnLight) {
            const hallu = !!player?.hallucinating;
            const glyph = monsterMapGlyph(mon, hallu);
            display.setCell(col, row, glyph.ch, glyph.color);
            return;
        }
        if (loc.mem_obj) {
            const rememberedObjColor = Number.isInteger(loc.mem_obj_color)
                ? loc.mem_obj_color : 0;
            display.setCell(col, row, loc.mem_obj, rememberedObjColor);
            return;
        }
        if (loc.mem_trap) {
            const memTrapColor = Number.isInteger(loc.mem_trap_color)
                ? loc.mem_trap_color : 0;
            display.setCell(col, row, loc.mem_trap, memTrapColor);
            return;
        }
        if (loc.mem_invis) {
            display.setCell(col, row, 'I', CLR_GRAY);
            return;
        }
        if (loc.seenv) {
            if (typeof loc.mem_terrain_ch === 'string') {
                const rememberedColor = Number.isInteger(loc.mem_terrain_color)
                    ? loc.mem_terrain_color
                    : CLR_GRAY;
                display.setCell(col, row, loc.mem_terrain_ch, rememberedColor);
            } else {
                const remembered = rememberTerrain();
                display.setCell(col, row, remembered.ch, remembered.color);
            }
        } else {
            display.setCell(col, row, ' ', CLR_GRAY);
        }
        return;
    }

    // --- Visible (in FOV) ---
    rememberTerrain();
    const visEngr = map.engravingAt(x, y);
    if (visEngr) visEngr.erevealed = true;

    // Monster
    const mon = map.monsterAt(x, y);
    if (monsterShownOnMap(mon, player, map)) {
        loc.mem_invis = false;
        const underObjs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
        if (underObjs.length > 0) {
            const underTop = underObjs[underObjs.length - 1];
            const underGlyph = objectMapGlyph(underTop, false, { player, x, y });
            loc.mem_obj = underGlyph.ch || 0;
            loc.mem_obj_color = Number.isInteger(underGlyph.color)
                ? underGlyph.color : CLR_GRAY;
        } else {
            const engr = map.engravingAt(x, y);
            if (engr && (player?.wizard || !player?.blind || engr.erevealed)) {
                const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                loc.mem_obj = engrCh;
                loc.mem_obj_color = CLR_BRIGHT_BLUE;
            } else {
                loc.mem_obj = 0;
                loc.mem_obj_color = 0;
            }
        }
        const hallu = !!player?.hallucinating;
        const glyph = monsterMapGlyph(mon, hallu);
        display.setCell(col, row, glyph.ch, glyph.color);
        mon.meverseen = 1;
        return;
    }
    if (mon && mon_warning(mon, player, ctx)) {
        display_warning(mon, player, ctx);
        return;
    }
    if (loc.mem_invis) {
        display.setCell(col, row, 'I', CLR_GRAY);
        return;
    }

    // Objects
    const objs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
    if (objs.length > 0) {
        const topObj = objs[objs.length - 1];
        const hallu = !!player?.hallucinating;
        const glyph = objectMapGlyph(topObj, hallu, { player, x, y });
        const memGlyph = hallu
            ? objectMapGlyph(topObj, false, { player, x, y, observe: false })
            : glyph;
        loc.mem_obj = memGlyph.ch || 0;
        loc.mem_obj_color = Number.isInteger(memGlyph.color)
            ? memGlyph.color : CLR_GRAY;
        display.setCell(col, row, glyph.ch, glyph.color);
        return;
    }
    loc.mem_obj = 0;
    loc.mem_obj_color = 0;

    // Traps
    const trap = map.trapAt(x, y);
    if (trap && trap.tseen && !coversObjectsAt(loc, player)) {
        const tg = trapGlyph(trap.ttyp);
        loc.mem_trap = tg.ch;
        loc.mem_trap_color = tg.color;
        display.setCell(col, row, tg.ch, tg.color);
        return;
    }
    loc.mem_trap = 0;

    // Engravings
    const engr = map.engravingAt(x, y);
    if (spotShowsEngravings(loc)
        && engr
        && (player?.wizard || !player?.blind || engr.erevealed)
        && !coversObjectsAt(loc, player)) {
        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
        loc.mem_obj = engrCh;
        loc.mem_obj_color = CLR_BRIGHT_BLUE;
        display.setCell(col, row, engrCh, CLR_BRIGHT_BLUE);
        return;
    }

    // Terrain
    if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
        display.setCell(col, row, ' ', CLR_GRAY);
        return;
    }
    const sym = renderTerrainSymbol(loc, map, x, y, flags);
    display.setCell(col, row, sym.ch, sym.color);
}

// C ref: display.c:1480 see_monsters()
export function see_monsters(map) {
    if (!map || !map.monsters) return;
    const ctx = _getDisplayCtx();
    if (!ctx || !ctx.display) return;
    for (const mon of map.monsters) {
        if (!mon || mon.mhp <= 0) continue;
        newsym(mon.mx, mon.my);
    }
    const player = ctx.player;
    if (player && !player.usteed) {
        newsym(player.x, player.y);
    }
}

// C ref: vision.c:511 vision_recalc()
export function vision_recalc() {
    clear_vision_full_recalc();
    const ctx = _getDisplayCtx();
    if (!ctx || !ctx.fov || !ctx.fov.visible || !ctx.map || !ctx.player) return;
    const { fov, map, player } = ctx;
    const oldVisible = [];
    for (let x = 0; x < COLNO; x++) {
        oldVisible[x] = fov.visible[x].slice();
    }
    fov.compute(map, player.x, player.y, do_light_sources, player);
    if (ctx.display) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                if (oldVisible[x][y] !== fov.visible[x][y]) {
                    newsym(x, y);
                }
            }
        }
    }
}

// C ref: display.c:2200 flush_screen(cursor_on_u)
let _flushing = false;
let _delay_flushing = false;

export function flush_screen(cursor_on_u) {
    if (cursor_on_u === -1) {
        _delay_flushing = !_delay_flushing;
        return;
    }
    if (_delay_flushing) return;
    if (_flushing) return;
    _flushing = true;
    const ctx = _getDisplayCtx();
    if (ctx?.display && ctx?.player) {
        const { display, player } = ctx;
        if (player._botl) {
            if (typeof display.renderStatus === 'function')
                display.renderStatus(player);
            player._botl = false;
        }
        if (cursor_on_u > 0 && typeof display.cursorOnPlayer === 'function')
            display.cursorOnPlayer(player);
    }
    _flushing = false;
}

function hasPlayerProp(player, propId, ...legacyFlags) {
    if (!player) return false;
    if (typeof player.hasProp === 'function') {
        try {
            if (player.hasProp(propId)) return true;
        } catch (e) {
            // Fall through to legacy field checks.
        }
    }
    return legacyFlags.some((flag) => !!player?.[flag]);
}

function playerBlind(player) {
    return !!(player?.blind || player?.Blind);
}

// C ref: display.h _mon_visible(mon)
export function monVisibleForMap(mon, player) {
    if (!mon) return false;
    if (mon.mundetected) return false;
    const seeInvis = hasPlayerProp(player, SEE_INVIS, 'seeInvisible', 'See_invisible');
    if (mon.minvis && !seeInvis) return false;
    return true;
}

// C ref: display.h _see_with_infrared(mon)
export function seeWithInfraredForMap(mon, map, player) {
    if (!mon || !map || !player) return false;
    if (playerBlind(player)) return false;
    const hasInfra = hasPlayerProp(player, INFRAVISION, 'infravision', 'Infravision');
    if (!hasInfra) return false;
    const mdat = mon.data || mon.type || null;
    if (!mdat || !infravisible(mdat)) return false;
    return couldsee(map, player, mon.mx, mon.my);
}

// C ref: display.h _canseemon(mon)
export function canSeeMonsterForMap(mon, map, player, fov) {
    if (!mon || !map || !player) return false;
    const locSeen = mon.wormno
        ? worm_known(mon, map, player, fov)
        : (cansee(map, player, fov, mon.mx, mon.my)
            || seeWithInfraredForMap(mon, map, player));
    if (!locSeen) return false;
    return monVisibleForMap(mon, player);
}

// C ref: display.h _sensemon(mon)
export function senseMonsterForMap(mon, map, player) {
    if (!mon || !player) return false;
    if (player?.uswallow && player?.ustuck && mon !== player.ustuck) return false;
    const heroUnderwater = !!(player?.underwater || player?.uinwater || player?.Underwater);
    if (heroUnderwater) {
        const d2 = (player.x - mon.mx) * (player.x - mon.mx)
                  + (player.y - mon.my) * (player.y - mon.my);
        const onPool = !!(map && isPoolAt(map.at(mon.mx, mon.my)));
        if (!(d2 <= 2 && onPool)) return false;
    }
    const detectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
    const telepathy = hasPlayerProp(player, TELEPAT, 'telepathy', 'Telepathy');
    let tpSense = false;
    if (telepathy) {
        const mdat = mon.data || mon.type || null;
        if (mdat && !is_mindless(mdat)) {
            const blindTelepathic = playerBlind(player);
            const unblindRange = Number(player?.unblind_telepat_range || player?.unblindTelepathRange || BOLT_LIM);
            tpSense = blindTelepathic
                || ((player.x - mon.mx) * (player.x - mon.mx)
                    + (player.y - mon.my) * (player.y - mon.my)) <= (unblindRange * unblindRange);
        }
    }
    const warning = hasPlayerProp(player, WARNING, 'warning', 'Warning');
    const warnOfMon = hasPlayerProp(player, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon');
    const warnSense = warnOfMon || (warning && mon_warning(mon, player, { map, player }));
    return detectMonsters || tpSense || warnSense;
}

// C ref: display.h canspotmon(mon) = canseemon(mon) || sensemon(mon)
// Context-resolving wrapper matching canseemon() pattern.
export function canspotmon(mon, playerArg = null, fovArg = null, ctxOrMap = null) {
    const ctx = _resolveDisplayCtx(ctxOrMap);
    const map = ctx?.map || null;
    const player = playerArg || ctx?.player || null;
    const fov = fovArg || ctx?.fov || null;
    return canSpotMonsterForMap(mon, map, player, fov);
}

export function canSpotMonsterForMap(mon, map, player, fov) {
    return canSeeMonsterForMap(mon, map, player, fov)
        || senseMonsterForMap(mon, map, player);
}

function telepathySensesMonsterForMap(mon, player) {
    if (!mon || !player) return false;
    const telepathy = hasPlayerProp(player, TELEPAT, 'telepathy', 'Telepathy');
    if (!telepathy) return false;
    const mdat = mon.data || mon.type || null;
    if (!mdat || is_mindless(mdat)) return false;
    const blindTelepathic = playerBlind(player);
    const unblindRange = Number(player?.unblind_telepat_range
        || player?.unblindTelepathRange
        || BOLT_LIM);
    if (blindTelepathic) return true;
    const dx = (player.x | 0) - (mon.mx | 0);
    const dy = (player.y | 0) - (mon.my | 0);
    return (dx * dx + dy * dy) <= (unblindRange * unblindRange);
}

// C ref: vision.c:2141 howmonseen()
export function howmonseen(mon, ctxOrMap = null, playerArg = null, fovArg = null) {
    if (!mon) return 0;
    const explicitCtx = (ctxOrMap && typeof ctxOrMap === 'object'
        && (ctxOrMap.map || ctxOrMap.player || ctxOrMap.fov))
        ? ctxOrMap
        : null;
    const ctx = explicitCtx || _resolveDisplayCtx(ctxOrMap);
    const map = ctx?.map || null;
    const player = playerArg || ctx?.player || null;
    const fov = fovArg || ctx?.fov || null;
    if (!map || !player) return 0;

    const useemon = canSeeMonsterForMap(mon, map, player, fov);
    const xraydist = (Number.isFinite(player?.xray_range) && player.xray_range >= 0)
        ? (player.xray_range * player.xray_range)
        : -1;
    let how_seen = 0;

    const normalPosVisible = mon.wormno
        ? worm_known(mon, map, player, fov)
        : (cansee(map, player, fov, mon.mx, mon.my)
            && couldsee(map, player, mon.mx, mon.my));
    if (normalPosVisible && monVisibleForMap(mon, player) && !mon.minvis) {
        how_seen |= MONSEEN_NORMAL;
    }
    if (useemon && mon.minvis) how_seen |= MONSEEN_SEEINVIS;
    if ((!mon.minvis || playerCanSeeInvisible(player))
        && seeWithInfraredForMap(mon, map, player)) {
        how_seen |= MONSEEN_INFRAVIS;
    }
    if (telepathySensesMonsterForMap(mon, player)) {
        how_seen |= MONSEEN_TELEPAT;
    }
    if (useemon && xraydist > 0) {
        const dx = (player.x | 0) - (mon.mx | 0);
        const dy = (player.y | 0) - (mon.my | 0);
        if ((dx * dx + dy * dy) <= xraydist) how_seen |= MONSEEN_XRAYVIS;
    }
    if (hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters')) {
        how_seen |= MONSEEN_DETECT;
    }
    if (hasPlayerProp(player, WARNING, 'warning', 'Warning')
        || hasPlayerProp(player, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon')) {
        how_seen |= MONSEEN_WARNMON;
    }
    return how_seen;
}
