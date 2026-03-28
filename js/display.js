// display.js -- Browser-based TTY display
// Implements the window_procs interface from winprocs.h for browser rendering.
// See DECISIONS.md #2 for why we use <pre> with <span> elements.

import { Terminal } from './terminal.js';
import { maybeTraceCellWrite, TRACE_CELL_SPEC, TRACE_CELL_STEPS, traceStepForDisplay, traceCaller } from './trace.js';
import { getScreenLines as _getScreenLines, getScreenAnsiLines as _getScreenAnsiLines,
         setScreenLines as _setScreenLines, setScreenAnsiLines as _setScreenAnsiLines,
         getAttrLines as _getAttrLines } from './screen_capture.js';

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
    MAXTCHARS,
} from './const.js';

import { def_monsyms, def_oc_syms, S_sw_tl, S_sw_br, NUM_ZAP, GLYPH_ZAP_OFF, GLYPH_SWALLOW_OFF,
    glyph_is_invisible, glyph_is_trap, glyph_is_generic_object, GLYPH_CMAP_MAIN_OFF,
    GLYPH_CMAP_STONE_OFF, GLYPH_CMAP_A_OFF, GLYPH_ALTAR_OFF, GLYPH_CMAP_B_OFF, GLYPH_CMAP_C_OFF,
    S_stone, S_trwall, S_altar, S_arrow_trap, S_goodpos, S_digbeam, S_grave, NO_GLYPH,
} from './symbols.js';
import { M_AP_FURNITURE, M_AP_OBJECT } from './const.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import { tempGlyphToCell } from './temp_glyph.js';
import { isObjectNameKnown, isObjectEncountered, discoveryTypeName, observe_object } from './o_init.js';
import { objectData as _objectDataArr } from './objects.js';
function _objectDataForMimic(otyp) { return _objectDataArr[otyp] || {}; }
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
         def_warnsyms, WARNCOUNT,
         BEAR_TRAP, WEB, is_pit } from './const.js';
import { cansee, couldsee, clear_vision_full_recalc, block_point, unblock_point } from './vision.js';
import { do_light_sources } from './light.js';
import { emits_light, infravisible, is_mindless, monsndx } from './mondata.js';
import { worm_known } from './worm.js';
import {
    rn2,
    cosmic_display_push_owner,
    cosmic_display_pop_owner,
    cosmic_display_set_cell,
    cosmic_display_clear_cell,
    cosmic_display_log_newsym,
    cosmic_display_log_maploc,
    cosmic_display_clear_newsym_branch,
    cosmic_display_clear_maploc_branch,
} from './rng.js';
import { set_wall_state as dungeonSetWallState, xy_set_wall_state as dungeonXySetWallState } from './dungeon.js';
import { more } from './input.js';
import { game as _gstate } from './gstate.js';
import { distu } from './hacklib.js';
import { obj_typename } from './objnam.js';
import {
    debugRepaint,
    logRepaint,
    repaintHp,
    repaintBotl,
    repaintBotlx,
    repaintTimeBotl,
} from './repaint_trace.js';
export { mark_vision_dirty } from './vision.js';

// Re-export color constants from the canonical source (render.js)
export {
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, NO_COLOR, CLR_ORANGE, CLR_BRIGHT_GREEN,
    CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN,
    CLR_WHITE, HI_METAL, HI_WOOD, HI_GOLD, HI_ZAP,
};

// COLOR_CSS now lives in terminal.js (accessed via this.colorToCss()).

// Trace functions (parseTraceCellSpec, maybeTraceCellWrite, etc.) now live in trace.js.

function replayStepIndex(map) {
    return Number.isInteger(map?._replayStepIndex) ? map._replayStepIndex : null;
}

export function getCachedMapCell(loc, map) {
    if (!loc || !loc._displayCell) return null;
    const step = replayStepIndex(map);
    if (step === null || loc._displayCellStepIndex !== step) return null;
    return loc._displayCell;
}

export function cacheMapCell(loc, map, ch, color, attr = 0) {
    if (!loc) return;
    loc._displayCell = { ch, color, attr };
    loc._displayCellStepIndex = replayStepIndex(map);
}

function putMapCell(display, loc, map, col, row, ch, color, attr = 0) {
    cacheMapCell(loc, map, ch, color, attr);
    display.setCell(col, row, ch, color, attr);
}


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

function trapShownOnMap(trap, player) {
    if (!trap) return false;
    // C ref: display.c _map_location()/unmap_object() only render traps
    // when trap->tseen is true (with separate cover checks at callsites).
    return !!trap.tseen;
}

function playerMapGlyph(player) {
    // C ref: display.h hero_glyph — player glyph is NEVER hallucinated.
    // C's display_self() uses hero_glyph directly (no rn2_on_display_rng call).
    // Only polymorph changes the player glyph, not hallucination.
    const upolyd = !!((Number(player?.mtimedone) || 0) > 0);
    const mlet = Number(player?.type?.mlet);
    if (upolyd && Number.isInteger(mlet) && mlet >= 0) {
        const sym = def_monsyms[mlet]?.sym || '@';
        const color = Number.isInteger(player?.type?.mcolor) ? player.type.mcolor : CLR_WHITE;
        return { ch: sym, color };
    }
    return { ch: '@', color: CLR_WHITE };
}


// computeTerminalLineHeight now lives in terminal.js.

export class Display extends Terminal {
    constructor(containerId) {
        super(containerId, { rows: TERMINAL_ROWS, cols: TERMINAL_COLS });
        this.isHeadless = (containerId == null);

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
        this._topMessageStepIndex = null;
        this.messageNeedsMore = false; // C ref: TOPLINE_NEED_MORE - true if message not acknowledged by keypress
        // C ref: ttyDisplay->toplin — 3-state topline status
        // 0 = TOPLINE_EMPTY, 1 = TOPLINE_NEED_MORE, 2 = TOPLINE_NON_EMPTY
        this.toplin = 0;
        this.moreMarkerActive = false;
        this.messageCursorCol = 0;
        this.messageCursorRow = 0;
        // C ref: gt.toplines — shared buffer tracking row-0 content including
        // getlin/getobj prompts. Persists across key reads (unlike messageNeedsMore
        // which is cleared by nhgetch_raw). Used for overflow length checks.
        this.toplines = '';
        this.noConcatenateMessages = false;

        // Game flags (updated by game, used for display options)
        this.flags = {};
        this._lastMapState = null;
        this._mapBaseCells = new Map();
        // key => stack of transient cells (top is active overlay)
        this._tempOverlay = new Map();
        this._nhgetch = null;
        this._topMessageRow1 = undefined; // set when message wraps to row 1
        this._lastTextPopup = null;

        if (containerId) this._setupHover(this._pre);
    }

    setNhgetch(fn) { this._nhgetch = fn; }

    _gameRef() { return this._game || _gstate || null; }

    // Screen capture convenience methods (delegate to screen_capture.js free functions)
    getScreenLines() { return _getScreenLines(this.grid, this.rows, this.cols); }
    getScreenAnsiLines() { return _getScreenAnsiLines(this.grid, this.rows, this.cols); }
    setScreenLines(lines) { _setScreenLines(this.grid, this.rows, this.cols, lines); }
    setScreenAnsiLines(lines) { _setScreenAnsiLines(this.grid, this.rows, this.cols, lines); }
    getAttrLines() { return _getAttrLines(this.grid, this.rows, this.cols); }

    // _createDOM() is now handled by Terminal's constructor.

    // Override setCell to add cell-write tracing before delegating to Terminal.
    setCell(col, row, ch, color, attr = 0) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        const cell = this.grid[row][col];
        if (cell.ch === ch && cell.color === color && cell.attr === attr) return; // no change
        maybeTraceCellWrite(this, col, row, { ch: cell.ch, color: cell.color, attr: cell.attr }, { ch, color, attr });
        super.setCell(col, row, ch, color, attr);
    }

    // Override clearRow: delegate to Terminal, then clear toplines buffer for row 0.
    clearRow(row) {
        super.clearRow(row);
        // C ref: clearing row 0 clears the toplines buffer
        if (row === 0) this.toplines = '';
    }

    // putstr() is inherited from Terminal.

    // --- Window interface methods (mirrors winprocs.h) ---

    // Display a message on the top line
    // C ref: winprocs.h win_putstr for NHW_MESSAGE
    async putstr_message(msg, opts = {}) {
        let freshAfterMore = false;
        // Add to message history
        if (msg.trim()) {
            this.messages.push(msg);
            if (this.messages.length > 20) {
                this.messages.shift();
            }
        }

        // If msg_window is enabled, render the message window
        // C ref: win/tty/topl.c — message window modes
        if (this.flags?.msg_window) {
            this.renderMessageWindow();
            return;
        }

        // Urgent messages (death, etc.) force a --More-- boundary before display.
        const isUrgent = !!opts.urgent || msg.startsWith('You die');
        const suppressStatusRefresh = !!this._urgentSuppressStatusRefresh;
        if (this.topMessage && this.messageNeedsMore) {
            flush_screen(1);
        }
        const deferredPlayer = this._lastMapState?.player || null;
        if (this._deferredBotlAfterPendingFlush && deferredPlayer) {
            deferredPlayer._botl = true;
            deferredPlayer._botlStepIndex = this._deferredBotlStepIndex ?? null;
            this._deferredBotlAfterPendingFlush = false;
            this._deferredBotlStepIndex = null;
        }
        // C-faithful urgent staging: if an urgent message arrives while another
        // message is pending acknowledgement, force a --More-- boundary first.
        if (this.topMessage && this.messageNeedsMore && isUrgent) {
            this.renderMoreMarker();
            if (this._nhgetch) {
                try {
                    await more(this, {
                        site: 'display.more.dismiss',
                        clearAfter: false,
                        readKey: this._nhgetch,
                        refreshStatus: !suppressStatusRefresh,
                    });
                } catch (e) {
                    if (!e.message?.includes('Concurrent nhgetch')) throw e;
                }
            }
            this.clearRow(MESSAGE_ROW);
            this.messageNeedsMore = false;
            this.topMessage = null;
            this._topMessageStepIndex = null;
            this.moreMarkerActive = false;
            this._urgentSuppressStatusRefresh = false;
            freshAfterMore = true;
        }

        // C ref: win/tty/topl.c:264-267 — Concatenate messages if they fit.
        // C reserves space for " --More--" (9 chars) when checking if messages
        // can be concatenated.  C uses gt.toplines (shared buffer) for the
        // length check, which includes getlin/getobj prompt text.
        const toplinesRef = (this.topMessage && this.messageNeedsMore)
            ? this.topMessage
            : (this.toplines || '');
        if (!this.noConcatenateMessages && toplinesRef.length > 0
            && (this.messageNeedsMore || this.toplines.length > 0)) {
            const combined = toplinesRef + '  ' + msg;
            // C ref: win/tty/topl.c update_topl() uses strict '<' for fit check.
            if (combined.length + 9 < this.cols) {
                this.clearRow(MESSAGE_ROW);
                this.putstr(0, MESSAGE_ROW, combined.substring(0, this.cols));
                this.topMessage = combined;
                this._topMessageStepIndex = Number.isInteger(this._lastMapState?.gameMap?._replayStepIndex)
                    ? this._lastMapState.gameMap._replayStepIndex
                    : null;
                this.messageNeedsMore = true;
                this.messageCursorCol = Math.min(combined.length, this.cols - 1);
                this.messageCursorRow = 0;
                this.setCursor(this.messageCursorCol, 0);
                return;
            }
            // Concat overflow — show --More-- and wait for dismissal.
            flush_screen(1);
            this.renderMoreMarker();
            if (this._nhgetch) {
                try {
                    await more(this, {
                        site: 'display.more.dismiss',
                        clearAfter: false,
                        readKey: this._nhgetch,
                        refreshStatus: false,
                    });
                } catch (e) {
                    if (!e.message?.includes('Concurrent nhgetch')) throw e;
                }
            }
            this.clearRow(MESSAGE_ROW);
            this.messageNeedsMore = false;
            this.topMessage = null;
            this._topMessageStepIndex = null;
            this.moreMarkerActive = false;
            freshAfterMore = true;
        }

        // Display the message.
        this.clearRow(MESSAGE_ROW);
        if (msg.length <= this.cols) {
            this.putstr(0, MESSAGE_ROW, msg.substring(0, this.cols));
            this.topMessage = msg;
            this._topMessageStepIndex = Number.isInteger(this._lastMapState?.gameMap?._replayStepIndex)
                ? this._lastMapState.gameMap._replayStepIndex
                : null;
            this.messageNeedsMore = true;
            // C ref: addtopl sets toplin = TOPLINE_NEED_MORE (2).
            this.toplin = 2;
            this.messageCursorCol = Math.min(msg.length, this.cols - 1);
            this.messageCursorRow = 0;
            if (freshAfterMore && typeof this.renderStatus === 'function') {
                const refreshPlayer = this._lastMapState?.player || null;
                if (refreshPlayer?._botl) {
                    this.renderStatus(refreshPlayer);
                    refreshPlayer._botl = false;
                }
            }
            if (isUrgent) {
                this.renderMoreMarker();
                if (this._nhgetch) {
                    try {
                        await more(this, {
                            site: 'display.more.dismiss',
                            clearAfter: false,
                            readKey: this._nhgetch,
                            refreshStatus: !this._urgentSuppressStatusRefresh,
                        });
                    } catch (e) {
                        if (!e.message?.includes('Concurrent nhgetch')) throw e;
                    }
                    this.clearRow(MESSAGE_ROW);
                    this.messageNeedsMore = false;
                    this.topMessage = null;
                    this._topMessageStepIndex = null;
                    this.moreMarkerActive = false;
                } else {
                    this.clearRow(MESSAGE_ROW);
                    this.messageNeedsMore = false;
                    this.topMessage = null;
                    this._topMessageStepIndex = null;
                    this.moreMarkerActive = false;
                }
            }
            this.setCursor(this.messageCursorCol, this.messageCursorRow);
            return;
        }

        // Wrap long messages at word boundary near cols.
        let breakPoint = msg.lastIndexOf(' ', this.cols - 1);
        if (breakPoint <= 0) breakPoint = this.cols;
        const firstLine = msg.substring(0, breakPoint);
        const wrapped = msg.substring(breakPoint).trimStart();

        this.putstr(0, MESSAGE_ROW, firstLine);
        this.topMessage = firstLine;
        this._topMessageStepIndex = Number.isInteger(this._lastMapState?.gameMap?._replayStepIndex)
            ? this._lastMapState.gameMap._replayStepIndex
            : null;
        this.messageNeedsMore = true;
        this.messageCursorCol = Math.min(firstLine.length, this.cols - 1);
        this.messageCursorRow = 0;
        if (freshAfterMore && typeof this.renderStatus === 'function') {
            const refreshPlayer = this._lastMapState?.player || null;
            if (refreshPlayer?._botl) {
                this.renderStatus(refreshPlayer);
                refreshPlayer._botl = false;
            }
        }

        if (wrapped.length === 0) return;

        // Show wrapped portion on row 1 with --More--.
        const moreStr = '--More--';
        const secondMax = Math.max(1, this.cols - moreStr.length);
        const secondLine = wrapped.substring(0, secondMax);
        const remainder = wrapped.substring(secondLine.length).trimStart();
        const moreCol = Math.min(secondLine.length, this.cols - moreStr.length);
        this.clearRow(MESSAGE_ROW + 1);
        this.putstr(0, MESSAGE_ROW + 1, secondLine);
        this.messageCursorCol = moreCol;
        this.messageCursorRow = MESSAGE_ROW + 1;
        this.putstr(moreCol, MESSAGE_ROW + 1, moreStr);
        this.setCursor(Math.min(moreCol + moreStr.length, this.cols - 1), MESSAGE_ROW + 1);
        if (this._nhgetch) {
            try {
                await more(this, {
                    site: 'display.more.dismiss',
                    clearAfter: false,
                    readKey: this._nhgetch,
                });
            } catch (e) {
                if (!e.message?.includes('Concurrent nhgetch')) throw e;
            }
        }
        this.clearRow(MESSAGE_ROW);
        this.clearRow(MESSAGE_ROW + 1);
        this.messageNeedsMore = false;
        this.topMessage = null;
        this._topMessageStepIndex = null;
        this.moreMarkerActive = false;
        if (remainder.length > 0) {
            await this.putstr_message(remainder);
        }
    }

    // Render message window (last 3 messages)
    // C ref: win/tty/topl.c prevmsg_window == 'f' (full)
    renderMessageWindow() {
        // C ref: tty docrt() after menu close — clear row 0 and show current
        // topMessage only.  Historical messages are NOT re-shown; the map
        // redraws clean except for whatever message is currently pending.
        // Rows 1-2 are map rows in C tty, not a multi-line message buffer.
        this.clearRow(0);

        if (this.topMessage) {
            this.putstr(0, 0, this.topMessage.substring(0, this.cols), CLR_GRAY);
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
            if (msgLen >= this.cols - moreStr.length) {
                this.clearRow(MESSAGE_ROW + 1);
                this.putstr(0, MESSAGE_ROW + 1, moreStr, CLR_GRAY);
                this.setCursor(Math.min(moreStr.length, this.cols - 1), MESSAGE_ROW + 1);
            } else {
                const col = Math.min(msgLen, this.cols - moreStr.length);
                this.putstr(col, MESSAGE_ROW, moreStr, CLR_GRAY);
                this.setCursor(Math.min(col + moreStr.length, this.cols - 1), MESSAGE_ROW);
            }
        }
    }

    // Render the map from game state
    // C ref: display.c newsym() and print_glyph()
    renderMap(gameMap, player, fov, flags = {}) {
        this.flags = { ...this.flags, ...flags };
        this._lastMapState = { gameMap, player, fov, flags: { ...this.flags } };
        const mapOffset = this.flags.msg_window ? 3 : MAP_ROW_START;

        const renderCtx = { display: this, player, fov, flags: this.flags, map: gameMap };
        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            // C tty map rendering uses game x in [1..COLNO-1] at terminal cols [0..COLNO-2].
            this.setCell(COLNO - 1, row, ' ', CLR_GRAY);
            if (this.cellInfo) this.cellInfo[row][COLNO - 1] = null;
            for (let x = 1; x < COLNO; x++) {
                const loc = gameMap.at?.(x, y);
                const cached = getCachedMapCell(loc, gameMap);
                // C ref: use cached cell data when available. During
                // hallucination, see_monsters/see_objects/see_traps populate
                // the cache; non-hero uncached cells are skipped to avoid
                // consuming display RNG. Hero cell uses cache if available
                // (newsym hero branch caches via cacheMapCell). Only fall
                // through to newsym when there's no cache.
                const isHeroCell = player && x === player.x && y === player.y && !player.usteed;
                if (cached) {
                    this.setCell(x - 1, row, cached.ch, cached.color, cached.attr || 0);
                } else if (isHeroCell || (!player?.Hallucination && !player?.hallucinating)) {
                    newsym(x, y, renderCtx);
                }
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
        return tempGlyphToCell(glyph, { useDECgraphics: !!this.flags?.DECgraphics });
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

    // flush() is inherited from Terminal.

    // Override setCursor to add cursor-position tracing.
    setCursor(col, row) {
        if (TRACE_CELL_SPEC && TRACE_CELL_SPEC.col === col && TRACE_CELL_SPEC.row === row) {
            const step = traceStepForDisplay(this);
            if (!TRACE_CELL_STEPS || (step !== null && step >= TRACE_CELL_STEPS.from && step <= TRACE_CELL_STEPS.to)) {
                const caller = traceCaller();
                const callerPart = caller ? ` caller=${caller}` : '';
                console.error(`^celltrace[kind=cursor step=${step === null ? '?' : step} cell=${col},${row}${callerPart}]`);
            }
        }
        super.setCursor(col, row);
    }

    // getCursor() is inherited from Terminal.

    // cursSet() is inherited from Terminal.

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

    // Override clearScreen: delegate to Terminal, then reset NetHack message state.
    // C ref: tty_clear_nhwindow() — wipes the whole terminal including topline.
    clearScreen() {
        super.clearScreen();
        this.topMessage = null;
        this.messageNeedsMore = false;
        this._topMessageRow1 = undefined;
        this.moreMarkerActive = false;
        this.messageCursorCol = 0;
        this.messageCursorRow = 0;
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
            // C ref: invent.c inuse_headers[] — in-use inventory grouping headers
            if (/^(Wielded\/Readied Weapons|Worn Armor|Accessories|Miscellaneous)\b/.test(text)) {
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
        const fullScreen = (offx === 10 || lines.length >= this.rows || !!opts?.forceFullScreen);
        if (fullScreen) offx = 1;

        const menuRows = Math.min(lines.length, fullScreen ? this.rows : STATUS_ROW_1);
        // C tty parity: in full-screen mode, clear all rows (needed for
        // multi-page menus where later pages have fewer lines than earlier ones).
        const clearRows = fullScreen ? this.rows : menuRows;
        for (let r = 0; r < clearRows; r++) {
            for (let c = Math.max(0, offx - 1); c < this.cols; c++) {
                this.setCell(c, r, ' ', CLR_GRAY, 0);
            }
        }

        for (let i = 0; i < menuRows; i++) {
            const line = lines[i];
            // C ref: wintty.c — end_menu(prompt) title (line 0) and category headers
            // use inverse video.  add_menu_str() content lines at line 0 do NOT.
            // Callers pass opts.noTitleInverse when line 0 is add_menu_str content.
            // Callers pass opts.noHeaderInverse to suppress ALL header inverse
            // (used during gameover disclosure where C's program_state.gameover
            // suppresses inverse on both title and category headers).
            const isHeader = !opts?.noHeaderInverse
                && ((i === 0 && !opts?.noTitleInverse && line.trim().length > 0) || isCategoryHeader(line));
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
        if (this._lastTextPopup) {
            this.clearTextPopup();
        }
        // Filter out trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines = lines.slice(0, -1);
        }
        const fullScreenText = !!opts.forceFullScreen || lines.length >= this.rows - 2;
        let moreMarker;
        if (fullScreenText) {
            moreMarker = '--More--';
        } else if (opts.isTextWindow) {
            // C ref: wintty.c:2748 — morestr is "(end) " with trailing space
            moreMarker = '(end) ';
        } else {
            moreMarker = ' --More--';
        }
        const linesWithMore = [...lines, moreMarker];

        let maxcol = 0;
        for (const line of linesWithMore) {
            if (line.length > maxcol) maxcol = line.length;
        }

        const renderRows = Math.min(linesWithMore.length, fullScreenText ? this.rows : (this.rows - 2));
        const renderLines = linesWithMore.length > renderRows
            ? [...linesWithMore.slice(0, renderRows - 1), moreMarker]
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

        const clearRows = fullScreenText ? this.rows : renderRows;
        const hasMoreLine = (renderLines[renderRows - 1] || '').endsWith('--More--');
        const left = hasMoreLine ? Math.max(0, offx - 1) : offx;
        const savedCells = [];
        for (let r = 0; r < clearRows; r++) {
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
        for (let r = 0; r < clearRows; r++) {
            for (let c = Math.max(0, offx); c < this.cols; c++) {
                this.setCell(c, r, ' ', CLR_GRAY);
            }
        }
        // Render each line
        for (let i = 0; i < renderRows; i++) {
            const line = renderLines[i] || '';
            const isMoreLine = (i === renderRows - 1) && line.endsWith('--More--');
            const col = isMoreLine ? Math.max(0, offx - 1) : offx;
            this.putstr(col, i, line, CLR_GRAY, 0);
        }
        // Position cursor at end of marker
        const lastRow = fullScreenText ? (this.rows - 1) : (renderRows - 1);
        const lastLine = renderLines[lastRow] || '';
        const markerLine = fullScreenText ? moreMarker : lastLine;
        const isMore = markerLine.endsWith('--More--');
        const markerCol = isMore ? Math.max(0, offx - 1) : offx;
        const markerEnd = markerCol + markerLine.length;
        const cursorCol = (opts.isTextWindow && !isMore) ? markerEnd + 1 : markerEnd;
        this.setCursor(Math.min(cursorCol, this.cols - 1), lastRow);
        this._lastTextPopup = {
            offx,
            rows: clearRows,
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
                const color = display.colorToCss(info.color);
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
        const rip = [
            '                       ----------',
            '                      /          \\',
            '                     /    REST    \\',
            '                    /      IN      \\',
            '                   /     PEACE      \\',
            '                  /                  \\',
        ];
        const FACE_WIDTH = 16;
        const centerOnStone = (text) => {
            let t = String(text || '');
            if (t.length > FACE_WIDTH) t = t.substring(0, FACE_WIDTH);
            const pad = Math.floor((FACE_WIDTH - t.length) / 2);
            const inner = ' '.repeat(pad) + t + ' '.repeat(FACE_WIDTH - pad - t.length);
            return `                  | ${inner} |`;
        };
        rip.push(centerOnStone(name));
        rip.push(centerOnStone(`${gold} Au`));
        for (let i = 0; i < 4; i++) rip.push(centerOnStone(deathLines[i] || ''));
        rip.push(centerOnStone(year));
        rip.push('                 *|     *  *  *      | *');
        rip.push('        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______');
        const startRow = 1;
        for (let i = 0; i < rip.length && startRow + i < this.rows; i++) {
            this.putstr(0, startRow + i, rip[i]);
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
  if (trapShownOnMap(trap, player) && !covered) {
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
    loc._levGlyph = { ch: ' ', color: CLR_GRAY };
    if (show) show_glyph(x, y, loc._levGlyph, ctx);
    return;
  }
  const sym = renderTerrainSymbol(loc, map, x, y, ctx?.flags || null);
  const rememberedColor = (loc.typ === ROOM) ? NO_COLOR : sym.color;
  loc.mem_terrain_ch = sym.ch;
  loc.mem_terrain_color = rememberedColor;
  loc._levGlyph = { ch: sym.ch, color: rememberedColor };
  if (show) show_glyph(x, y, loc._levGlyph, ctx);
}

// Autotranslated from display.c:313
export function map_engraving(engr, show = 0, ctxOrMap = null) {
  if (!engr) return;
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const map = ctx?.map;
  // JS engravings use {x, y} (from make_engr_at); C uses engr_x/engr_y.
  const ex = engr.x ?? engr.engr_x;
  const ey = engr.y ?? engr.engr_y;
  if (!map || !isok(ex, ey)) return;
  const x = ex;
  const y = ey;
  const loc = map.at(x, y);
  if (!loc) return;
  // C ref: map_engraving sets levl[x][y].glyph to engraving_to_glyph(ep).
  // In C, this glyph gets overwritten by later map_background calls, and
  // _map_location checks spot_shows_engravings before showing engravings.
  // In JS, mem_obj persists independently of terrain, so we must gate on
  // spotShowsEngravings to avoid overriding terrain (e.g. graves) where
  // engravings are not displayed.
  if (!spotShowsEngravings(loc)) return;
  const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
  loc.mem_obj = engrCh;
  loc.mem_obj_color = CLR_BRIGHT_BLUE;
  loc._levGlyph = { ch: engrCh, color: CLR_BRIGHT_BLUE };
  if (show) show_glyph(x, y, loc._levGlyph, ctx);
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
  // C uses a single lev->glyph field overwritten by show_glyph. JS uses
  // separate mem_obj/mem_trap fields with priority mem_obj > mem_trap in
  // out-of-FOV newsym. Clear mem_trap so the object takes visual precedence.
  loc.mem_trap = 0;
  loc.mem_trap_color = 0;
  loc.mem_obj = memGlyph.ch || 0;
  loc.mem_obj_color = Number.isInteger(memGlyph.color) ? memGlyph.color : CLR_GRAY;
  // C ref: levl[x][y].glyph stores the DISPLAYED glyph (including hallu).
  loc._levGlyph = { ch: glyph.ch, color: Number.isInteger(glyph.color) ? glyph.color : CLR_GRAY };
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
  // Clear mem_obj so trap takes visual precedence (inverse of map_object).
  loc.mem_obj = 0;
  loc.mem_obj_color = 0;
  loc.mem_trap = tg.ch;
  loc.mem_trap_color = tg.color;
  loc._levGlyph = { ch: tg.ch, color: tg.color };
  if (show) show_glyph(x, y, loc._levGlyph, ctx);
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
    cosmic_display_log_maploc(x, y, 'obj', !!show);
    map_object(objs[objs.length - 1], show, ctx);
    return;
  }
  const trap = (typeof map.trapAt === 'function') ? map.trapAt(x, y) : null;
  if (trapShownOnMap(trap, ctx?.player) && !covered) {
    cosmic_display_log_maploc(x, y, 'trap', !!show);
    map_trap(trap, show, ctx);
    return;
  }
  const engr = (typeof map.engravingAt === 'function') ? map.engravingAt(x, y) : null;
  if (spotShowsEngravings(loc) && engr && engr.erevealed && !covered) {
    cosmic_display_log_maploc(x, y, 'engr', !!show);
    map_engraving(engr, show, ctx);
    return;
  }
  cosmic_display_log_maploc(x, y, 'terrain', !!show);
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
    cell = tempGlyphToCell(glyph, { useDECgraphics: !!ctx?.flags?.DECgraphics });
    if (loc) loc.glyph = glyph;
  }
  if (!cell || typeof cell.ch !== 'string' || cell.ch.length === 0) return;
  const mapOffset = ctx?.flags?.msg_window ? 3 : MAP_ROW_START;
  const ch = cell.ch[0];
  const color = Number.isInteger(cell.color) ? cell.color : CLR_GRAY;
  cacheMapCell(loc, gameMap, ch, color, 0);
  display.setCell(x - 1, y + mapOffset, ch, color);
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
  const player = ctx?.player;
  const gameMap = ctx?.map;
  if (!player || !gameMap) return;
  if (player.x === x && player.y === y) return;

  const mon = gameMap.monsterAt?.(x, y) || null;
  const loc = gameMap.at?.(x, y) || null;
  if (loc?.mem_invis && mon?.minvis) {
    return;
  }
  if (loc?.mem_invis) {
    loc.mem_invis = false;
  }
  if (loc) {
    set_seenv(loc, player.x, player.y, x, y);
  }
  map_location(x, y, 1, ctx);
  if (mon && senseMonsterForMap(mon, gameMap, player)) {
    const detectedByTelepathy = telepathySensesMonsterForMap(mon, player);
    const warnOfMon = hasPlayerProp(player, WARN_OF_MON, 'warnOfMon', 'Warn_of_mon');
    display_monster(
      x,
      y,
      mon,
      (detectedByTelepathy || warnOfMon) ? PHYSICALLY_SEEN : DETECTED,
      false,
      ctx
    );
  }
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

// C ref: display.c:1520 mimic_light_blocking()
// C ref: monst.h is_lightblocker_mappear() — boulder mimic, or furniture
// mimic disguised as wall/closed door/tree blocks light.
export function mimic_light_blocking(mtmp) {
  if (!mtmp || !mtmp.minvis) return;
  const apType = Number(mtmp.m_ap_type ?? mtmp.mappearanceType ?? 0);
  const app = mtmp.mappearance;
  // C: is_lightblocker_mappear — checks boulder object mimic, or furniture
  // mimic with wall/closed door/tree appearance
  const isLightBlocker =
      (apType === 2 /* M_AP_OBJECT */ && app === 472 /* BOULDER */)
      || (apType === 1 /* M_AP_FURNITURE */
          && (app === 16 /* S_hcdoor */ || app === 15 /* S_vcdoor */
              || app < 12 /* S_ndoor = walls */
              || app === 18 /* S_tree */));
  if (!isLightBlocker) return;
  const player = _gstate?.u;
  const seeInvis = !!(player?.seeInvisible || player?.See_invisible);
  if (seeInvis) block_point(mtmp.mx, mtmp.my);
  else unblock_point(mtmp.mx, mtmp.my);
}

// C ref: display.c:1536 set_mimic_blocking()
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
  cosmic_display_push_owner('see_objects');
  if (map?.objects) {
    const seen = new Set();
    for (const obj of map.objects) {
      // C ref: display.c:1551-1553 — iterates fobj (floor chain) with
      // vobj_at check. Skip objects not on the map (ox/oy out of bounds,
      // e.g., -1,-1 for objects in transit). This avoids consuming display
      // RNG for off-map newsym calls during hallucination.
      if (!isok(obj.ox, obj.oy)) continue;
      const key = obj.ox * 1000 + obj.oy;
      if (!seen.has(key)) {
        seen.add(key);
        newsym(obj.ox, obj.oy);
      }
    }
  }
  update_inventory();
  cosmic_display_pop_owner('see_objects');
}

// C ref: display.c:1565 see_nearby_objects()
// Mark the top floor object at each visible nearby cell as dknown=true.
// Called from u_on_newpos() when the player moves (dungeon.js:u_on_newpos).
// Matches C's logic: iterate r=2 range, cansee + distu <= neardist, observe_object.
export async function see_nearby_objects() {
  const ctx = _gstate;
  const map = ctx?.map;
  const player = ctx?.player;
  if (!map?.objects || !player) return;
  const x = player.x, y = player.y;
  // C ref: r = max(xray_range, 2); neardist = r*r + r*(r-1)
  const r = (player.xray_range > 2) ? player.xray_range : 2;
  const neardist = r * r * 2 - r;
  const fov = ctx?.fov || null;
  for (let iy = y - r; iy <= y + r; ++iy) {
    for (let ix = x - r; ix <= x + r; ++ix) {
      if (!isok(ix, iy)) continue;
      // Find the topmost (last placed) object at this position — matches C's vobj_at
      let topObj = null;
      for (const obj of map.objects) {
        if (obj.ox === ix && obj.oy === iy) topObj = obj;
      }
      if (!topObj || topObj.dknown) continue;
      const cs = cansee(map, player, fov, ix, iy);
      const du = distu(player, ix, iy);
      if (!cs) continue;
      if (du > neardist) continue;
      await observe_object(topObj);
      // C relies on vision_recalc's seenv-angle change triggering newsym() for newly-dknown
      // objects (display.c:1591: only call newsym_force if already showing a generic obj glyph).
      // JS vision_recalc only calls newsym on visibility CHANGE (not seenv-angle change), so
      // we must always call newsym_force here to update the display when dknown is set.
      newsym_force(ix, iy);
    }
  }
}

// Autotranslated from display.c:1599
export function see_traps() {
  const map = _gstate?.map;
  cosmic_display_push_owner('see_traps');
  if (map?.traps) {
    for (const trap of map.traps) {
      const glyph = glyph_at(trap.tx, trap.ty);
      if (glyph_is_trap(glyph)) newsym(trap.tx, trap.ty);
    }
  }
  cosmic_display_pop_owner('see_traps');
}

// Autotranslated from display.c:1675
export function curs_on_u() {
  flush_screen(1);
}


function docrtRecalc(ctx) {
  if (!ctx?.map || !ctx?.player || !ctx?.fov) return;
  const fov = ctx.fov;
  // C ref: docrt_flags does vision_recalc(2) then vision_recalc(0).
  //
  // Phase 1: vision_recalc(2) — shut down vision. C calls newsym for
  // every cell that WAS in_sight (vision.c:577-579). This consumes
  // display RNG for hallu objects/monsters at those cells as they
  // transition from visible to not-visible.
  if (fov.visible) {
    const px = ctx.player.x, py = ctx.player.y;
    for (let x = 1; x < COLNO; x++) {
      for (let y = 0; y < ROWNO; y++) {
        // C ref: vision.c:577-579 — newsym for cells that were IN_SIGHT
        // Skip the hero cell — it gets its own newsym below (vision.c:839)
        if (fov.visible[x][y] && !(x === px && y === py)) {
          newsym(x, y, ctx);
        }
        fov.visible[x][y] = 0;
      }
    }
    // C ref: vision.c:839 — hero newsym at end of vision_recalc(2)
    newsym(px, py, ctx);
  }
  // Phase 2: vision_recalc(0) — recompute FOV and newsym for transitions
  vision_recalc(fov, ctx.map, ctx.player);
}

// Autotranslated from display.c:1704
export function docrt_flags(recalc = null, ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  if (!ctx?.display || !ctx?.map) return;
  cosmic_display_push_owner('docrt_flags');
  // C ref: docrt_flags ordering:
  //   1. vision_recalc(2) — shut down vision
  //   2. show_glyph(x, y, lev->glyph) loop — display STORED glyphs from
  //      hero memory. No recomputation, no display RNG consumed.
  //   3. vision_recalc(0) — recompute FOV, newsym for visibility changes
  //   4. see_monsters() — overlay monsters (called by docrt() after this)
  //
  // JS equivalent: use _levGlyph (set by map_object/map_trap/map_background/
  // map_engraving) as the stored hero memory. Fall back to newsym only for
  // cells that were never mapped (no _levGlyph).
  for (let x = 1; x < COLNO; x++) {
    for (let y = 0; y < ROWNO; y++) {
      const loc = ctx.map.at?.(x, y);
      if (loc?._levGlyph) {
        show_glyph(x, y, loc._levGlyph, ctx);
      } else {
        // No stored glyph — fall back to newsym (first-time display)
        newsym(x, y, ctx);
      }
    }
  }
  // C ref: vision_recalc(0) after show_glyph loop — recompute FOV and
  // call newsym for cells where visibility changed. This is a second
  // pass that consumes additional display RNG during hallucination.
  if (typeof recalc === 'function') recalc(ctx);
  flush_screen(0);
  cosmic_display_pop_owner('docrt_flags');
}

// C ref: display.c:1690 docrt() → docrt_flags()
// Unified screen refresh: --More-- ownership, vision recalc, newsym grid
// rebuild, renderMap, renderStatus, cursorOnPlayer.
// C has one docrt(); JS previously split this across display.docrt() and
// game.docrt() — now unified here.  game.docrt() forwards to this.
export async function docrt() {
  const ctx = _resolveDisplayCtx();
  const display = ctx?.display;
  const player = ctx?.player;
  const map = ctx?.map;
  const fov = ctx?.fov;
  const flags = ctx?.flags;
  if (!display || !map) return;

  // C ref: docrt_flags() → cls() → display_nhwindow(WIN_MESSAGE)
  // In tty, when toplin==TOPLINE_NEED_MORE, this fires more() which
  // consumes the dismiss key inline before repaint proceeds.
  if (display.messageNeedsMore) {
    if (display._nhgetch) {
      if (typeof display.renderMoreMarker === 'function') display.renderMoreMarker();
      await more(display, {
        site: 'docrt.message-flush',
        clearAfter: true,
        readKey: display._nhgetch,
      });
    } else {
      if (typeof display.clearRow === 'function') display.clearRow(MESSAGE_ROW);
      display.messageNeedsMore = false;
      display.topMessage = null;
    }
  }

  // C ref: docrt_flags() newsym grid rebuild
  docrt_flags(docrtRecalc);

  // C ref: docrt_flags calls vision_recalc(0) then see_monsters().
  // NOT see_objects or see_traps — only see_monsters is part of docrt.
  if (player && fov && typeof fov.compute === 'function') {
    fov.compute(map, player.x, player.y, do_light_sources, player);
  }
  if (map) {
    see_monsters(map);
  }
  if (typeof display.renderMap === 'function') {
    display.renderMap(map, player, fov, flags);
  }
  if (player && typeof display.renderStatus === 'function') {
    display.renderStatus(player);
  }
  if (player && typeof display.cursorOnPlayer === 'function') {
    display.cursorOnPlayer(player);
  }
}

// Autotranslated from display.c:2207
export async function cls(ctxOrMap = null) {
  const ctx = _resolveDisplayCtx(ctxOrMap);
  const display = ctx?.display;
  if (!display) return;
  // C ref: cls() calls display_nhwindow(WIN_MESSAGE, FALSE) first.
  // In tty, when toplin==TOPLINE_NEED_MORE, this fires more() (shows --More--) then clears row 0.
  // When toplin is not NEED_MORE, it just resets toplin to TOPLINE_EMPTY without clearing row 0.
  if (display.messageNeedsMore) {
    if (display._nhgetch) {
      if (typeof display.renderMoreMarker === 'function') display.renderMoreMarker();
      await more(display, {
        site: 'display.cls.message-flush',
        clearAfter: true,
        readKey: display._nhgetch,
      });
    } else {
      // No nhgetch available; just reset message state (clear anyway for safety).
      if (typeof display.clearRow === 'function') display.clearRow(MESSAGE_ROW);
      display.messageNeedsMore = false;
      display.topMessage = null;
    }
  }
  // C ref: cls() calls clear_nhwindow(WIN_MAP) which clears only the MAP area,
  // NOT the message row (row 0) or status rows. C also calls clear_glyph_buffer().
  const mapEnd = STATUS_ROW_1; // rows MAP_ROW_START through STATUS_ROW_1-1
  if (typeof display.clearRow === 'function') {
    for (let r = MAP_ROW_START; r < mapEnd; r++) display.clearRow(r);
    return;
  }
  for (let r = MAP_ROW_START; r < mapEnd; r++) {
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

// C ref: include/display.h cmap_to_glyph() — cmap indices are split across
// multiple glyph blocks, not a single contiguous GLYPH_CMAP_MAIN_OFF range.
export function cmap_to_glyph(cmap_idx) {
  if (cmap_idx === S_stone) return GLYPH_CMAP_STONE_OFF;
  if (cmap_idx <= S_trwall) return GLYPH_CMAP_MAIN_OFF + cmap_idx;
  if (cmap_idx < S_altar) return GLYPH_CMAP_A_OFF + (cmap_idx - (S_trwall + 1));
  if (cmap_idx === S_altar) return GLYPH_ALTAR_OFF;
  if (cmap_idx < S_arrow_trap + MAXTCHARS) return GLYPH_CMAP_B_OFF + (cmap_idx - S_grave);
  if (cmap_idx <= S_goodpos) return GLYPH_CMAP_C_OFF + (cmap_idx - S_digbeam);
  return NO_GLYPH;
}

// Autotranslated from display.c:3785
export function fn_cmap_to_glyph(cmap) {
  return cmap_to_glyph(cmap);
}

// ========================================================================
// Display functions moved from monutil.js — C ref: display.c / vision.c
// ========================================================================

import { impossible } from './pline.js';

function _getDisplayCtx() {
    if (!_gstate) return null;
    return {
        display: _gstate.display,
        player: _gstate.u,
        fov: _gstate.fov,
        flags: _gstate.display?.flags || _gstate.flags,
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
        // Check for map objects first — they have an .at() method and may also
        // have .flags (per-cell data), which would wrongly match the context check.
        if (typeof ctxOrMap.at === 'function') {
            const base = _getDisplayCtx() || {};
            return { ...base, map: ctxOrMap };
        }
        if (ctxOrMap.display || ctxOrMap.map || ctxOrMap.player || ctxOrMap.fov || ctxOrMap.flags) {
            const base = _getDisplayCtx() || {};
            return { ...base, ...ctxOrMap };
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
    const { display, player, fov, flags } = ctx;
    if (!display || typeof display.setCell !== 'function') return;
    const loc = map.at(x, y);
    if (!loc) return;
    cosmic_display_set_cell(x, y);
    cosmic_display_clear_newsym_branch();
    cosmic_display_clear_maploc_branch();
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

    // C ref: display.c:930-935 — when swallowed, only show hero at own position
    if (player?.uswallow || player?.engulfed) {
        if (x === player.x && y === player.y) {
            cosmic_display_log_newsym(x, y, 'hero-swallowed', true);
            const heroGlyph = playerMapGlyph(player);
            putMapCell(display, loc, map, col, row, heroGlyph.ch, heroGlyph.color);
        }
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // C ref: always render the player glyph at the hero's position,
    // even when out of FOV (e.g. during levitation on stairs).
    // When mounted, C shows the steed glyph on hero square instead.
    if (player && x === player.x && y === player.y && !player.usteed) {
        cosmic_display_log_newsym(x, y, 'hero-visible', true);
        // C newsym() still runs _map_location(x, y, !see_self) on the hero
        // square before overlaying the hero glyph. With canspotself()==true,
        // that means show=0 but underlying hallucinated object glyph
        // selection still consumes display RNG.
        map_location(x, y, 0, ctx);
        const heroGlyph = playerMapGlyph(player);
        // Cache the hero cell so renderMap doesn't re-newsym it.
        // map_location(show=0) above consumed display RNG for hallucinated
        // objects but doesn't cache via putMapCell. Without this cache,
        // renderMap would call newsym again, doubling the display RNG.
        cacheMapCell(loc, map, heroGlyph.ch, heroGlyph.color);
        display.setCell(col, row, heroGlyph.ch, heroGlyph.color);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // --- Not visible (out of FOV) ---
    if (!fov || !fov.canSee(x, y)) {
        const mon = map.monsterAt(x, y);
        const detectMonsters = hasPlayerProp(player, DETECT_MONSTERS, 'detectMonsters', 'Detect_monsters');
        if (mon && detectMonsters) {
            cosmic_display_log_newsym(x, y, 'oos-sensed-mon', false);
            // C ref: display.c newsym() out-of-sight branch shows monsters
            // when Detect_monsters is active; glyph is inverse-video.
            const hallu = !!(player?.Hallucination || player?.hallucinating);
            const glyph = monsterMapGlyph(mon, hallu);
            putMapCell(display, loc, map, col, row, glyph.ch, glyph.color, 1);
            mon.meverseen = 1;
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        // C ref: display.c:1039-1040 — infravision: see warm-blooded monsters
        if (mon && see_with_infrared(mon, player) && monVisibleForMap(mon, player)) {
            cosmic_display_log_newsym(x, y, 'oos-sensed-mon', false);
            const hallu = !!(player?.Hallucination || player?.hallucinating);
            const glyph = monsterMapGlyph(mon, hallu);
            putMapCell(display, loc, map, col, row, glyph.ch, glyph.color);
            mon.meverseen = 1;
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        const monVisibleByOwnLight = !!(mon
            && emits_light(mon.data || mon.type || {}) > 0
            && couldsee(map, player, x, y)
            && monVisibleForMap(mon, player));
        if (monVisibleByOwnLight) {
            cosmic_display_log_newsym(x, y, 'oos-sensed-mon', false);
            const hallu = !!(player?.Hallucination || player?.hallucinating);
            const glyph = monsterMapGlyph(mon, hallu);
            putMapCell(display, loc, map, col, row, glyph.ch, glyph.color);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        if (loc.mem_invis) {
            cosmic_display_log_newsym(x, y, 'oos-remembered', false);
            putMapCell(display, loc, map, col, row, 'I', CLR_GRAY);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        if (loc.mem_obj && !loc.mem_magic_trap) {
            cosmic_display_log_newsym(x, y, 'oos-remembered', false);
            const rememberedObjColor = Number.isInteger(loc.mem_obj_color)
                ? loc.mem_obj_color : 0;
            putMapCell(display, loc, map, col, row, loc.mem_obj, rememberedObjColor);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        if (loc.mem_trap) {
            cosmic_display_log_newsym(x, y, 'oos-remembered', false);
            const memTrapColor = Number.isInteger(loc.mem_trap_color)
                ? loc.mem_trap_color : 0;
            // C: when cell goes out of FOV after magic mapping, show trap. Clear mem_magic_trap
            // so when the cell re-enters FOV (a true visibility change), game state is re-evaluated
            // fresh (matching C newsym behavior for visibility-changed cells).
            loc.mem_magic_trap = false;
            putMapCell(display, loc, map, col, row, loc.mem_trap, memTrapColor);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
        if (loc.seenv) {
            cosmic_display_log_newsym(x, y, 'oos-remembered', false);
            if (typeof loc.mem_terrain_ch === 'string') {
                const rememberedColor = Number.isInteger(loc.mem_terrain_color)
                    ? loc.mem_terrain_color
                    : CLR_GRAY;
                putMapCell(display, loc, map, col, row, loc.mem_terrain_ch, rememberedColor);
            } else {
                const remembered = rememberTerrain();
                putMapCell(display, loc, map, col, row, remembered.ch, remembered.color);
            }
        } else {
            cosmic_display_log_newsym(x, y, 'oos-remembered', false);
            putMapCell(display, loc, map, col, row, ' ', CLR_GRAY);
        }
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // --- Visible (in FOV) ---
    // C ref: display.c:958 — update waslit for this tile
    loc.waslit = !!(loc.lit);
    rememberTerrain();
    const visEngr = map.engravingAt(x, y);
    if (visEngr) visEngr.erevealed = true;

    // Monster (checked before mem_magic_trap — visible monsters always override the stored glyph)
    const mon = map.monsterAt(x, y);
    // C ref: display.c:532-584 display_monster() — mimics with M_AP_OBJECT
    // or M_AP_FURNITURE show their disguise, not the monster glyph.
    // monsterShownOnMap returns false for these, so handle them first.
    if (mon && (mon.m_ap_type === M_AP_OBJECT || mon.m_ap_type === M_AP_FURNITURE)) {
        if (mon.m_ap_type === M_AP_OBJECT && Number.isInteger(mon.mappearance)) {
            // C ref: display.c:564-576 M_AP_OBJECT — show the mimicked object
            cosmic_display_log_newsym(x, y, 'visible-mimic-obj', true);
            const od = _objectDataForMimic(mon.mappearance);
            // Use the object's defined symbol and color directly.
            // C ref: map_object() → obj_to_glyph() uses the object class symbol.
            const mimicCh = od.symbol || '?';
            const mimicColor = Number.isFinite(od.oc_color) ? od.oc_color : CLR_GRAY;
            loc.mem_obj = mimicCh;
            loc.mem_obj_color = mimicColor;
            putMapCell(display, loc, map, col, row, mimicCh, mimicColor);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        } else if (mon.m_ap_type === M_AP_FURNITURE && Number.isInteger(mon.mappearance)) {
            // C ref: display.c:543-561 M_AP_FURNITURE — show the mimicked terrain
            cosmic_display_log_newsym(x, y, 'visible-mimic-furn', true);
            const furnSym = renderTerrainSymbol(loc, map, x, y, flags);
            putMapCell(display, loc, map, col, row, furnSym.ch || ' ', furnSym.color || CLR_GRAY);
            cosmic_display_clear_newsym_branch();
            cosmic_display_clear_maploc_branch();
            cosmic_display_clear_cell();
            return;
        }
    }
    if (monsterShownOnMap(mon, player, map)) {
        cosmic_display_log_newsym(x, y, 'visible-mon', true);
        // C ref: display.c:1047 — _map_location(x, y, show) maps the
        // location UNDER the monster before display_monster(). During
        // hallucination this consumes display RNG for random_obj_to_glyph.
        const hallu = !!(player?.Hallucination || player?.hallucinating);
        if (hallu) {
            map_location(x, y, 0, ctx);
        } else {
            // Non-hallu: record underlying object/engraving for mem display
            // when the monster moves away. No display RNG consumed.
            const underObjs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
            if (underObjs.length > 0) {
                const underTop = underObjs[underObjs.length - 1];
                const underGlyph = objectMapGlyph(underTop, false, {
                    player, x, y, observe: false
                });
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
        }
        // C ref: display.c:1008-1014 — trapped monster reveals physical traps
        if (mon.mtrapped) {
            const trap = map.trapAt ? map.trapAt(x, y) : null;
            if (trap) {
                const tt = trap.ttyp ?? trap.typ ?? -1;
                if (tt === BEAR_TRAP || is_pit(tt) || tt === WEB)
                    trap.tseen = true;
            }
        }
        loc.mem_invis = false;
        const glyph = monsterMapGlyph(mon, hallu);
        // Monster overrides any magic-mapped trap display (level.glyph equivalent).
        loc.mem_magic_trap = false;
        putMapCell(display, loc, map, col, row, glyph.ch, glyph.color);
        mon.meverseen = 1;
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }
    if (mon && mon_warning(mon, player, ctx)) {
        cosmic_display_log_newsym(x, y, 'visible-warning', true);
        display_warning(mon, player, ctx);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }
    if (loc.mem_invis) {
        cosmic_display_log_newsym(x, y, 'visible-invis', true);
        putMapCell(display, loc, map, col, row, 'I', CLR_GRAY);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // C ref: detect.c show_map_spot() magic-maps a trap over an object.
    // C's docrt() uses stored level.glyph without re-evaluating game state for cells whose
    // visibility hasn't changed since show_map_spot ran. JS replicates via loc.displayGlyph:
    // show trap instead of re-evaluating (which would show the object instead).
    // mem_magic_trap is cleared when the cell goes out-of-FOV (then coming back in will
    // re-evaluate from game state, matching C's behavior for visibility-changed cells).
    if (loc.mem_magic_trap && loc.displayGlyph?.ch) {
        cosmic_display_log_newsym(x, y, 'visible-map-location', true);
        putMapCell(display, loc, map, col, row, loc.displayGlyph.ch,
            Number.isInteger(loc.displayGlyph.color) ? loc.displayGlyph.color : CLR_GRAY);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // Objects
    const objs = coversObjectsAt(loc, player) ? [] : map.objectsAt(x, y);
    if (objs.length > 0) {
        cosmic_display_log_newsym(x, y, 'visible-map-location', true);
        cosmic_display_log_maploc(x, y, 'obj', true);
        const topObj = objs[objs.length - 1];
        const hallu = !!(player?.Hallucination || player?.hallucinating);
        const glyph = objectMapGlyph(topObj, hallu, { player, x, y });
        const memGlyph = hallu
            ? objectMapGlyph(topObj, false, { player, x, y, observe: false })
            : glyph;
        loc.mem_obj = memGlyph.ch || 0;
        loc.mem_obj_color = Number.isInteger(memGlyph.color)
            ? memGlyph.color : CLR_GRAY;
        putMapCell(display, loc, map, col, row, glyph.ch, glyph.color);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }
    loc.mem_obj = 0;
    loc.mem_obj_color = 0;

    // Traps
    const trap = map.trapAt(x, y);
    if (trapShownOnMap(trap, player) && !coversObjectsAt(loc, player)) {
        cosmic_display_log_newsym(x, y, 'visible-map-location', true);
        cosmic_display_log_maploc(x, y, 'trap', true);
        const tg = trapGlyph(trap.ttyp);
        loc.mem_trap = tg.ch;
        loc.mem_trap_color = tg.color;
        putMapCell(display, loc, map, col, row, tg.ch, tg.color);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }
    loc.mem_trap = 0;

    // Engravings
    const engr = map.engravingAt(x, y);
    if (spotShowsEngravings(loc)
        && engr
        && (player?.wizard || !player?.blind || engr.erevealed)
        && !coversObjectsAt(loc, player)) {
        cosmic_display_log_newsym(x, y, 'visible-map-location', true);
        cosmic_display_log_maploc(x, y, 'engr', true);
        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
        loc.mem_obj = engrCh;
        loc.mem_obj_color = CLR_BRIGHT_BLUE;
        putMapCell(display, loc, map, col, row, engrCh, CLR_BRIGHT_BLUE);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }

    // Terrain
    if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
        cosmic_display_log_newsym(x, y, 'visible-map-location', true);
        cosmic_display_log_maploc(x, y, 'terrain', true);
        putMapCell(display, loc, map, col, row, ' ', CLR_GRAY);
        cosmic_display_clear_newsym_branch();
        cosmic_display_clear_maploc_branch();
        cosmic_display_clear_cell();
        return;
    }
    cosmic_display_log_newsym(x, y, 'visible-map-location', true);
    cosmic_display_log_maploc(x, y, 'terrain', true);
    const sym = renderTerrainSymbol(loc, map, x, y, flags);
    putMapCell(display, loc, map, col, row, sym.ch, sym.color);
    cosmic_display_clear_newsym_branch();
    cosmic_display_clear_maploc_branch();
    cosmic_display_clear_cell();
}

// C ref: display.c:1480 see_monsters()
export function see_monsters(map) {
    if (!map || !map.monsters) return;
    const ctx = _getDisplayCtx();
    if (!ctx || !ctx.display) return;
    const player = ctx.player;

    // C ref: display.c:1486 — defer_see_monsters check
    if (ctx.defer_see_monsters) return;
    cosmic_display_push_owner('see_monsters');

    // C ref: display.c:1493-1496 — steed/ustuck always meverseen
    if (player?.usteed) player.usteed.meverseen = 1;
    if (player?.ustuck) player.ustuck.meverseen = 1;

    for (const mon of map.monsters) {
        if (!mon || mon.mhp <= 0) continue;
        newsym(mon.mx, mon.my);
    }
    if (player && !player.usteed) {
        newsym(player.x, player.y);
    }
    cosmic_display_pop_owner('see_monsters');
}

// C ref: vision.c:511 vision_recalc()
export function vision_recalc() {
    cosmic_display_push_owner('vision_recalc');
    clear_vision_full_recalc();
    const ctx = _getDisplayCtx();
    if (!ctx || !ctx.fov || !ctx.fov.visible || !ctx.map || !ctx.player) return;
    const { fov, map, player } = ctx;
    const oldVisible = [];
    for (let x = 0; x < COLNO; x++) {
        oldVisible[x] = fov.visible[x].slice();
    }
    // Save old COULD_SEE state for transition detection
    // C ref: vision.c:820-825 — newsym is called when IN_SIGHT changes OR
    // when COULD_SEE changes (cell enters/leaves LOS even without lighting).
    const oldCs = fov._cs;
    // Save old seenv angles for transition detection.
    // C ref: vision.c:752-757 — newsym is called when seenv angle changes
    // (oldseenv != lev->seenv), even if IN_SIGHT was already set. This
    // matters for wall rendering and hallucination display RNG parity.
    const oldSeenv = new Uint8Array(COLNO * ROWNO);
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at?.(x, y);
            if (loc) oldSeenv[x * ROWNO + y] = loc.seenv || 0;
        }
    }
    fov.compute(map, player.x, player.y, do_light_sources, player);
    if (ctx.display) {
        const newCs = fov._cs;
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const visChanged = (oldVisible[x][y] !== fov.visible[x][y]);
                // C ref: vision.c:820-825 — also update when COULD_SEE changes
                const oldCouldSee = oldCs ? (oldCs[y][x] & 1) : 0; // COULD_SEE = 1
                const newCouldSee = newCs ? (newCs[y][x] & 1) : 0;
                // C ref: vision.c:752-757 — also update when seenv angle changes
                const loc = map.at?.(x, y);
                const seenvChanged = loc && ((loc.seenv || 0) !== oldSeenv[x * ROWNO + y]);
                if (visChanged || (oldCouldSee !== newCouldSee) || seenvChanged) {
                    newsym(x, y);
                }
            }
        }
        // C ref: vision.c:839 — always newsym the hero position at the end
        // of vision_recalc(0) to ensure the hero glyph is up-to-date.
        // This consumes display RNG at the hero cell during hallucination.
        newsym(player.x, player.y);
    }
    cosmic_display_pop_owner('vision_recalc');
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
        const step = replayStepIndex(ctx?.gameMap);
        debugRepaint('flush', 'display.flush_screen', {
            hp: repaintHp(player),
            cursor: cursor_on_u,
            botl: repaintBotl(player),
            botlx: repaintBotlx(player),
            time: repaintTimeBotl(player),
        }, {
            step,
            top: display?.topMessage || null,
            messageNeedsMore: display?.messageNeedsMore,
        });
        logRepaint('flush', {
            hp: repaintHp(player),
            cursor: cursor_on_u,
            botl: repaintBotl(player),
            botlx: repaintBotlx(player),
            time: repaintTimeBotl(player),
        });
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
    if (playerBlind(player)) return false;
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
// When no display context is available (headless replay, worker threads),
// default to true — C's canspotmon always has global state and never
// returns false due to missing context.
export function canspotmon(mon, playerArg = null, fovArg = null, ctxOrMap = null) {
    const ctx = _resolveDisplayCtx(ctxOrMap);
    const map = ctx?.map || null;
    const player = playerArg || ctx?.player || null;
    const fov = fovArg || ctx?.fov || null;
    if (!map || !player) return true; // C always has global context
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
