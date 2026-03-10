// getpos.js -- Position selection UI and highlight plumbing
// cf. getpos.c -- getpos_sethilite(), getpos_toggle_hilite_state(),
// getpos_refresh(), getpos() lifecycle.

import { MAP_ROW_START, COLNO, ROWNO, DOOR, ROOM, CORR, SDOOR, IS_WALL, isok } from './const.js';
import { more, nhgetch } from './input.js';
import { flush_screen } from './display.js';
import {
    create_nhwindow,
    putstr,
    display_nhwindow,
    start_menu,
    add_menu,
    end_menu,
    select_menu,
    destroy_nhwindow,
} from './windows.js';
import { NHW_MENU, NHW_TEXT, PICK_ONE, ATR_NONE } from './const.js';
import { visctrl } from './hacklib.js';
import { game as _gstate } from './gstate.js';
import { glyph_is_cmap } from './symbols.js';
import { glyph_to_cmap } from './glyphs.js';

const HiliteNormalMap = 0;
const HiliteGoodposSymbol = 1;
const HiliteBackground = 2;
const HiliteStateCount = 3;

let getpos_hilitefunc = null;
let getpos_getvalid = null;

// C globals from decl.c gg struct — module-level state for gloc filtering
const gg = { gloc_filter_floodfill_match_glyph: 0, gloc_filter_map: null };
let getpos_hilite_state = HiliteGoodposSymbol;
let defaultHiliteState = HiliteGoodposSymbol;
let hiliteOn = false;
const defaultGetposContext = {
    map: null,
    display: null,
    flags: null,
    goalPrompt: null,
    player: null,
    travelMode: false,
    isTravelPathValid: null,
};

function normalizeGetposContext(ctx = null) {
    return {
        ...defaultGetposContext,
        ...(ctx || {}),
    };
}

function callHilite(on) {
    if (typeof getpos_hilitefunc !== 'function') return;
    getpos_hilitefunc(!!on);
    hiliteOn = !!on;
}

function clearHiliteIfNeeded() {
    if (!hiliteOn) return;
    callHilite(false);
}

function applyHiliteForCurrentState() {
    if (!getpos_hilitefunc) return;
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        callHilite(true);
    }
}

// cf. getpos.c:41
// Autotranslated from getpos.c:41
export function getpos_sethilite(gp_hilitef, gp_getvalidf) {
    clearHiliteIfNeeded();
    getpos_hilitefunc = (typeof gp_hilitef === 'function') ? gp_hilitef : null;
    getpos_getvalid = (typeof gp_getvalidf === 'function') ? gp_getvalidf : null;
    getpos_hilite_state = defaultHiliteState;
    applyHiliteForCurrentState();
}

// cf. getpos.c:72
// Autotranslated from getpos.c:72
export function getpos_toggle_hilite_state(flags = null) {
    if (!getpos_hilitefunc) return;
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        callHilite(false);
    }
    const cycleCount = flags?.bgcolors ? HiliteStateCount : HiliteBackground;
    getpos_hilite_state = (getpos_hilite_state + 1) % cycleCount;
    if (getpos_hilite_state === HiliteGoodposSymbol) {
        callHilite(true);
    }
}

// cf. getpos.c:94
// Autotranslated from getpos.c:93
export function mapxy_valid(x, y) {
  if (getpos_getvalid) return getpos_getvalid(x, y);
  return false;
}

// cf. getpos.c:753
export function getpos_refresh() {
    clearHiliteIfNeeded();
    getpos_hilite_state = defaultHiliteState;
    applyHiliteForCurrentState();
}

function screenPosForMap(display, x, y) {
    const mapOffset = display?.flags?.msg_window ? 3 : MAP_ROW_START;
    return { col: x - 1, row: y + mapOffset };
}

function getCell(display, col, row) {
    const cell = display?.grid?.[row]?.[col];
    if (!cell) return { ch: ' ', color: 7, attr: 0 };
    // HeadlessDisplay stores grid cells as plain characters (strings),
    // while Display stores them as objects {ch, color, attr}.
    if (typeof cell === 'string') {
        return { ch: cell, color: display?.colors?.[row]?.[col] ?? 7, attr: display?.attrs?.[row]?.[col] ?? 0 };
    }
    return { ch: cell.ch, color: cell.color, attr: cell.attr || 0 };
}

function putCursor(display, x, y) {
    const { col, row } = screenPosForMap(display, x, y);
    // C ref: curs(WIN_MAP, cx, cy) — only repositions the terminal cursor,
    // does NOT overwrite the cell content. The underlying glyph stays visible.
    if (typeof display?.setCursor === 'function') display.setCursor(col, row);
    flush_screen(0); // C ref: getpos.c:660,854,863,1149 — flush tty after cursor move
    return { col, row };
}

function restoreCursor(display, cursorState) {
    if (!cursorState) return;
    // C ref: curs() — cursor was only repositioned, no cell content to restore.
    if (typeof display?.setCursor === 'function') {
        display.setCursor(cursorState.col, cursorState.row);
    }
    flush_screen(0); // C ref: getpos.c:660,854,863,1149 — flush tty after cursor move
}

function moveDeltaForChar(c) {
    switch (c) {
    case 'h': return [-1, 0];
    case 'j': return [0, 1];
    case 'k': return [0, -1];
    case 'l': return [1, 0];
    case 'y': return [-1, -1];
    case 'u': return [1, -1];
    case 'b': return [-1, 1];
    case 'n': return [1, 1];
    default: return null;
    }
}

function clampMove(cx, cy, dx, dy) {
    const nx = Math.min(COLNO - 1, Math.max(1, cx + dx));
    const ny = Math.min(ROWNO - 1, Math.max(0, cy + dy));
    return [nx, ny];
}

function cursorDesc(display, map, x, y) {
    if (map?.at) {
        const loc = map.at(x, y);
        if (loc) {
            if (!loc.seenv) return 'unexplored area';
            if (IS_WALL(loc.typ) || loc.typ === SDOOR) return 'wall';
            if (loc.typ === DOOR) return (loc.flags > 0) ? 'open door' : 'closed door';
            if (loc.typ === ROOM) return 'floor of a room';
            if (loc.typ === CORR) return 'corridor';
        }
    }
    const { col, row } = screenPosForMap(display, x, y);
    const info = display?.cellInfo?.[row]?.[col];
    return info?.name || '';
}

async function describeCursorWithContext(display, runtimeCtx, x, y) {
    const base = cursorDesc(display, runtimeCtx?.map, x, y);
    if (!base) return '';
    const parts = [base];
    if (runtimeCtx?.travelMode && typeof runtimeCtx?.isTravelPathValid === 'function') {
        const validTravel = await runtimeCtx.isTravelPathValid(x, y);
        if (!validTravel) parts.push('(no travel path)');
    }
    return parts.join(' ');
}

const TARGET_FILTERS = ['all', 'monster', 'object', 'valid'];
const GLOC_ALL = 'all';
const GLOC_MONS = 'monster';
const GLOC_OBJS = 'object';
const GLOC_DOOR = 'door';
const GLOC_EXPLORE = 'explore';
const GLOC_INTERESTING = 'interesting';
const GLOC_VALID = 'valid';

function targetFilterLabel(filter) {
    switch (filter) {
    case 'monster': return 'monsters';
    case 'object': return 'objects';
    case 'valid': return 'valid squares';
    default: return 'all map squares';
    }
}

function glocLabel(gloc) {
    switch (gloc) {
    case GLOC_MONS: return 'monsters';
    case GLOC_OBJS: return 'objects';
    case GLOC_DOOR: return 'doors';
    case GLOC_EXPLORE: return 'unexplored locations';
    case GLOC_VALID: return 'valid locations';
    case GLOC_INTERESTING: return 'interesting locations';
    default: return 'locations';
    }
}

function hasUnexploredNeighbor(map, x, y) {
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of steps) {
        const nx = x + dx;
        const ny = y + dy;
        if (!isok(nx, ny)) continue;
        const nloc = map?.at ? map.at(nx, ny) : null;
        if (!nloc) continue;
        if (!nloc.seenv) return true;
    }
    return false;
}

function gather_locs_interesting(map, x, y, gloc) {
    if (!map || !isok(x, y)) return false;
    const loc = map.at ? map.at(x, y) : null;
    if (!loc) return false;
    switch (gloc) {
    case GLOC_MONS:
        return !!(map.monsterAt && map.monsterAt(x, y));
    case GLOC_OBJS: {
        const objs = map.objectsAt ? map.objectsAt(x, y) : [];
        return Array.isArray(objs) && objs.length > 0;
    }
    case GLOC_DOOR:
        return loc.typ === DOOR;
    case GLOC_EXPLORE:
        return (loc.typ === DOOR || loc.typ === ROOM || loc.typ === CORR) && hasUnexploredNeighbor(map, x, y);
    case GLOC_VALID:
        return mapxy_valid(x, y);
    case GLOC_INTERESTING: {
        const trap = map.trapAt ? map.trapAt(x, y) : null;
        if (trap && trap.tseen) return true;
        if (gather_locs_interesting(map, x, y, GLOC_MONS)) return true;
        if (gather_locs_interesting(map, x, y, GLOC_OBJS)) return true;
        if (gather_locs_interesting(map, x, y, GLOC_DOOR)) return true;
        if (gather_locs_interesting(map, x, y, GLOC_EXPLORE)) return true;
        // Plain room/corridor is generally not "interesting".
        return loc.typ !== ROOM && loc.typ !== CORR;
    }
    case GLOC_ALL:
    default:
        return true;
    }
}

function isSeenCell(map, x, y) {
    const loc = map?.at ? map.at(x, y) : null;
    return !!loc?.seenv;
}

function getFilterMode(flags) {
    const f = flags?.getloc_filter;
    if (f === 1 || f === 'view') return 'view';
    if (f === 2 || f === 'area') return 'area';
    return 'none';
}

function gloc_filter_allows(map, x, y, ctx) {
    const mode = getFilterMode(ctx?.flags);
    if (mode === 'none') return true;
    if (!isSeenCell(map, x, y)) return false;
    if (mode === 'view') return true;
    const player = ctx?.player;
    if (!player || !Number.isInteger(player.x) || !Number.isInteger(player.y)) return true;
    const here = map?.at ? map.at(x, y) : null;
    const base = map?.at ? map.at(player.x, player.y) : null;
    if (!here || !base) return true;
    if (!Number.isInteger(here.roomno) || !Number.isInteger(base.roomno)) return true;
    return here.roomno === base.roomno;
}

export function getpos_getvalids_selection(validf = mapxy_valid) {
    const out = [];
    if (typeof validf !== 'function') return out;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (validf(x, y)) out.push({ x, y });
        }
    }
    return out;
}

function collectTargets(map, filter, ctx) {
    if (!map) return [];
    const targets = [];
    const seen = new Set();
    const add = (x, y) => {
        if (!isok(x, y)) return;
        const k = `${x},${y}`;
        if (seen.has(k)) return;
        seen.add(k);
        targets.push({ x, y });
    };

    if (filter === 'monster' || filter === 'all') {
        const mons = Array.isArray(map.monsters) ? map.monsters : [];
        for (const mon of mons) {
            if (!mon || mon.dead) continue;
            add(mon.mx, mon.my);
        }
        if (filter === 'monster') {
            targets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
            return targets;
        }
    }

    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (!gloc_filter_allows(map, x, y, ctx)) continue;
            if (filter === 'object') {
                const objs = map.objectsAt ? map.objectsAt(x, y) : [];
                if (Array.isArray(objs) && objs.length > 0) add(x, y);
            } else if (filter === 'valid') {
                if (mapxy_valid(x, y)) add(x, y);
            } else if (filter === 'all') {
                add(x, y);
            }
        }
    }
    targets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return targets;
}

function collectTargetsForGloc(map, gloc, ctx) {
    if (gloc === GLOC_VALID) {
        return getpos_getvalids_selection((x, y) => mapxy_valid(x, y) && gloc_filter_allows(map, x, y, ctx));
    }
    const targets = [];
    if (!map) return targets;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            if (!gloc_filter_allows(map, x, y, ctx)) continue;
            if (gather_locs_interesting(map, x, y, gloc)) targets.push({ x, y });
        }
    }
    targets.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return targets;
}

function findTargetIndex(targets, cx, cy) {
    if (!targets.length) return -1;
    let idx = targets.findIndex(t => t.x === cx && t.y === cy);
    if (idx >= 0) return idx;
    idx = targets.findIndex(t => (t.y > cy) || (t.y === cy && t.x > cx));
    return idx >= 0 ? idx : 0;
}

async function selectTargetFromMenu(display, targets, filter) {
    if (!targets.length) return null;
    if (typeof display?.putstr_message === 'function') {
        const count = Math.min(targets.length, 9);
        const opts = [];
        for (let i = 0; i < count; i++) {
            opts.push(`${i + 1}:${targets[i].x},${targets[i].y}`);
        }
        await display.putstr_message(`Targets (${targetFilterLabel(filter)}): ${opts.join(' ')} (1-9)`);
    }
    return 'pending';
}

function getpos_filter_text(flags) {
    const filter = flags?.getloc_filter;
    if (filter === 'view' || filter === 1) return ' in view';
    if (filter === 'area' || filter === 2) return ' in this area';
    return '';
}

export async function getpos_help_keyxhelp(display, k1, k2, gloc, moveCursorTo = 'move the cursor to ', flags = null) {
    if (typeof display?.putstr_message !== 'function') return;
    const filtertxt = getpos_filter_text(flags);
    await display.putstr_message(
        `Use '${k1}'/'${k2}' to ${moveCursorTo}${glocLabel(gloc)}${filtertxt}.`
    );
}

async function getpos_help(force, goal, display, flags = null) {
    if (typeof display?.putstr_message !== 'function') return;
    const g = goal || 'desired location';
    await display.putstr_message(
        `Use 'h', 'j', 'k', 'l' to move the cursor to ${g}.`
    );
    await display.putstr_message("Use 'H', 'J', 'K', 'L' to fast-move the cursor.");
    await display.putstr_message("Use '@' to move the cursor onto yourself.");
    await display.putstr_message("Or enter a background symbol (example '<').");
    await getpos_help_keyxhelp(display, 'm', 'M', GLOC_MONS, 'move the cursor to ', flags);
    await getpos_help_keyxhelp(display, 'o', 'O', GLOC_OBJS, 'move the cursor to ', flags);
    await getpos_help_keyxhelp(display, 'd', 'D', GLOC_DOOR, 'move the cursor to ', flags);
    await getpos_help_keyxhelp(display, 'x', 'X', GLOC_EXPLORE, 'move the cursor next to ', flags);
    await getpos_help_keyxhelp(display, 'i', 'I', GLOC_INTERESTING, 'move the cursor to ', flags);
    await getpos_help_keyxhelp(display, 'v', 'V', GLOC_VALID, 'move the cursor to ', flags);
    await display.putstr_message("Use '^' to toggle marking of valid locations.");
    await display.putstr_message("Use '=' for a menu listing of possible targets.");
    if (!force) {
        await display.putstr_message('Space can also finish selection.');
    }
}

function targetMenuLine(display, map, x, y) {
    const desc = cursorDesc(display, x, y);
    if (desc) return `${desc} [${x},${y}]`;
    const mon = map?.monsterAt ? map.monsterAt(x, y) : null;
    if (mon && !mon.dead) return `${mon.name || 'monster'} [${x},${y}]`;
    const objs = map?.objectsAt ? map.objectsAt(x, y) : [];
    if (Array.isArray(objs) && objs.length > 0) return `object [${x},${y}]`;
    return `location [${x},${y}]`;
}

async function getpos_menu(display, map, gloc, ctx) {
    const targets = collectTargetsForGloc(map, gloc, ctx);
    const player = ctx?.player;
    const menuTargets = (player && Number.isInteger(player.x) && Number.isInteger(player.y))
        ? targets.filter((t) => !(t.x === player.x && t.y === player.y))
        : targets;
    const candidates = menuTargets.length > 0 ? menuTargets : targets;

    if (!candidates.length) {
        if (typeof display?.putstr_message === 'function') {
            await display.putstr_message(`No ${glocLabel(gloc)}.`);
        }
        return null;
    }

    const tmpwin = create_nhwindow(NHW_MENU);
    try {
        start_menu(tmpwin, 0);
        for (let i = 0; i < candidates.length; i++) {
            add_menu(tmpwin, null, i, 0, 0, ATR_NONE, 0,
                targetMenuLine(display, map, candidates[i].x, candidates[i].y), 0);
        }
        end_menu(tmpwin, `Pick ${glocLabel(gloc)}`);
        const picks = await select_menu(tmpwin, PICK_ONE);
        if (!Array.isArray(picks) || picks.length === 0) return null;
        const idx = picks[0].identifier;
        if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) return null;
        return candidates[idx];
    } finally {
        destroy_nhwindow(tmpwin);
    }
}

function findNextMatchingMapChar(display, map, cx, cy, needle) {
    if (!display || !needle) return null;
    for (let pass = 0; pass <= 1; pass++) {
        const yStart = pass === 0 ? cy : 0;
        const yEnd = pass === 0 ? (ROWNO - 1) : cy;
        for (let y = yStart; y <= yEnd; y++) {
            const xStart = (pass === 0 && y === yStart) ? (cx + 1) : 1;
            const xEnd = (pass === 1 && y === yEnd) ? cx : (COLNO - 1);
            for (let x = xStart; x <= xEnd; x++) {
                if (!isok(x, y)) continue;
                if (!gloc_filter_allows(map, x, y)) continue;
                const { col, row } = screenPosForMap(display, x, y);
                const cell = getCell(display, col, row);
                if (cell.ch === needle) return { x, y };
            }
        }
    }
    return null;
}

function findPrevMatchingMapChar(display, map, cx, cy, needle) {
    if (!display || !needle) return null;
    for (let pass = 0; pass <= 1; pass++) {
        const yStart = pass === 0 ? cy : (ROWNO - 1);
        const yEnd = pass === 0 ? 0 : cy;
        for (let y = yStart; y >= yEnd; y--) {
            const xStart = (pass === 0 && y === yStart) ? (cx - 1) : (COLNO - 1);
            const xEnd = (pass === 1 && y === yEnd) ? cx : 1;
            for (let x = xStart; x >= xEnd; x--) {
                if (!isok(x, y)) continue;
                if (!gloc_filter_allows(map, x, y)) continue;
                const { col, row } = screenPosForMap(display, x, y);
                const cell = getCell(display, col, row);
                if (cell.ch === needle) return { x, y };
            }
        }
    }
    return null;
}

function findMatchingMapChar(display, map, cx, cy, needle, forward) {
    return forward
        ? findNextMatchingMapChar(display, map, cx, cy, needle)
        : findPrevMatchingMapChar(display, map, cx, cy, needle);
}

function isPrintable(ch) {
    return ch >= 32 && ch <= 126;
}

function isShiftedPrintable(c, ch) {
    return isPrintable(ch) && c >= 'A' && c <= 'Z';
}

function isUnshiftedPrintable(c, ch) {
    return isPrintable(ch) && (c < 'A' || c > 'Z');
}

export function getpos_gloc_from_filter(filter) {
    switch (filter) {
    case GLOC_MONS:
    case GLOC_OBJS:
    case GLOC_VALID:
        return filter;
    default:
        return GLOC_INTERESTING;
    }
}

async function getpos_cycle_target(display, map, gloc, cx, cy, dir, ctx) {
    const targets = collectTargetsForGloc(map, gloc, ctx);
    if (!targets.length) {
        if (typeof display?.putstr_message === 'function') {
            await display.putstr_message(`Cannot detect ${glocLabel(gloc)}.`);
        }
        return null;
    }
    const idx = findTargetIndex(targets, cx, cy);
    return targets[(idx + dir + targets.length) % targets.length];
}

// cf. getpos.c:771
export async function getpos_async(ccp, force = true, goal = '', ctx = null) {
    const runtimeCtx = normalizeGetposContext(ctx);
    const display = runtimeCtx.display;
    const flags = runtimeCtx.flags || {};
    const player = runtimeCtx.player || null;
    if (!ccp || typeof ccp !== 'object') return -1;

    let cx = Number.isInteger(ccp.x) ? ccp.x : 1;
    let cy = Number.isInteger(ccp.y) ? ccp.y : 0;
    if (!isok(cx, cy)) {
        cx = 1;
        cy = 0;
    }

    let showGoalMsg = false;
    let tipShownThisCall = false;
    if (typeof display?.putstr_message === 'function') {
        // C ref: getpos.c emits one-time tip + verbose instructions before the
        // goal prompt; this ordering creates real --More-- boundaries in replay.
        if (player) {
            player._tipsShown = player._tipsShown || {};
            if (!player._tipsShown.getpos) {
                player._tipsShown.getpos = true;
                // C ref: getpos.c TIP_GETPOS — multi-line tip shown in a
                // NHW_TEXT window before the getpos "Move cursor..." prompt.
                // Flush any pending --More-- BEFORE creating the NHW_TEXT
                // window; otherwise renderInputBlockedState() detects the
                // window and prematurely renders the popup while the
                // dismiss-key loop is still waiting for input.
                if (display.messageNeedsMore) {
                    await more(display, { site: 'getpos.tip.moreDismiss', forceVisual: true });
                }
                const tipWin = create_nhwindow(NHW_TEXT);
                putstr(tipWin, 0, 'Tip: Farlooking or selecting a map location');
                putstr(tipWin, 0, '');
                putstr(tipWin, 0, 'You are now in a "farlook" mode - the movement keys move the cursor,');
                putstr(tipWin, 0, 'not your character.  Game time does not advance.  This mode is used');
                putstr(tipWin, 0, 'to look around the map, or to select a location on it.');
                putstr(tipWin, 0, '');
                putstr(tipWin, 0, 'When in this mode, you can press ESC to return to normal game mode,');
                putstr(tipWin, 0, 'and pressing ? will show the key help.');
                await display_nhwindow(tipWin, true);
                destroy_nhwindow(tipWin);
                tipShownThisCall = true;
                showGoalMsg = true;
            }
        }
        // C ref: getpos.c:843-846 — verbose "(For instructions...)" is shown
        // before the loop. Keep normal prompts unchanged unless caller
        // explicitly requests this pre-loop line.
        if (flags.verbose && (tipShownThisCall || runtimeCtx.forceVerbosePrompt)) {
            await display.putstr_message("(For instructions type a '?')");
        }
    }
    if (getpos_hilitefunc && getpos_hilite_state === HiliteGoodposSymbol && !hiliteOn) {
        callHilite(true);
    }

    let cursorState = putCursor(display, cx, cy);
    const homeX = cx;
    const homeY = cy;
    let targetFilter = 'all';
    try {
        const replaceToplineMessage = () => {
            if (!display) return;
            if (typeof display.clearRow === 'function') display.clearRow(0);
            if (Object.hasOwn(display, 'topMessage')) display.topMessage = null;
            if (Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
        };

        for (;;) {
            // C ref: getpos.c:860 — show_goal_msg is only TRUE when handle_tip
            // displayed a tip (overwriting the topline). Show "Move cursor to..."
            // to restore the prompt.
            if (showGoalMsg && typeof display?.putstr_message === 'function') {
                const promptGoal = goal || runtimeCtx.goalPrompt || 'desired location';
                await display.putstr_message(`Move cursor to ${promptGoal}:`);
                restoreCursor(display, cursorState);
                cursorState = putCursor(display, cx, cy);
                showGoalMsg = false;
            }
            const ch = await nhgetch();
            const c = String.fromCharCode(ch);

            if (ch === 27) {
                if (typeof display?.clearRow === 'function') display.clearRow(0);
                if (display) {
                    display.topMessage = null;
                    display.messageNeedsMore = false;
                }
                ccp.x = -10;
                ccp.y = -10;
                return -1;
            }
            if (c === '.' || c === ',' || c === ';' || c === ':') {
                // C ref: getpos.c:929-935 — pick keys always accept the current
                // cursor location. Travel path validity is not enforced here; it
                // is handled later by travel execution.
                ccp.x = cx;
                ccp.y = cy;
                if (c === ',') return 1;
                if (c === ';') return 2;
                if (c === ':') return 3;
                return 0;
            }
            if (c === '?') {
                await getpos_help(force, goal || runtimeCtx.goalPrompt, display, runtimeCtx.flags);
                continue;
            }
            if (c === '^') {
                restoreCursor(display, cursorState);
                getpos_toggle_hilite_state(runtimeCtx.flags);
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (c === '@') {
                restoreCursor(display, cursorState);
                cx = homeX;
                cy = homeY;
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            const glocKeys = {
                m: [GLOC_MONS, 1],
                M: [GLOC_MONS, -1],
                o: [GLOC_OBJS, 1],
                O: [GLOC_OBJS, -1],
                d: [GLOC_DOOR, 1],
                D: [GLOC_DOOR, -1],
                x: [GLOC_EXPLORE, 1],
                X: [GLOC_EXPLORE, -1],
                i: [GLOC_INTERESTING, 1],
                I: [GLOC_INTERESTING, -1],
                v: [GLOC_VALID, 1],
                V: [GLOC_VALID, -1],
            };
            if (glocKeys[c]) {
                const [gloc, dir] = glocKeys[c];
                const next = await getpos_cycle_target(display, runtimeCtx.map, gloc, cx, cy, dir, runtimeCtx);
                if (!next) continue;
                restoreCursor(display, cursorState);
                cx = next.x;
                cy = next.y;
                cursorState = putCursor(display, cx, cy);
                continue;
            }

            if (c === 'f') {
                const cur = TARGET_FILTERS.indexOf(targetFilter);
                targetFilter = TARGET_FILTERS[(cur + 1) % TARGET_FILTERS.length];
                if (typeof display?.putstr_message === 'function') {
                    await display.putstr_message(`Target filter: ${targetFilterLabel(targetFilter)}.`);
                }
                continue;
            }
            if (c === '[' || c === ']') {
                const targets = collectTargets(runtimeCtx.map, targetFilter, runtimeCtx);
                if (!targets.length) {
                    if (typeof display?.putstr_message === 'function') {
                        await display.putstr_message(`No ${targetFilterLabel(targetFilter)} targets.`);
                    }
                    continue;
                }
                const idx = findTargetIndex(targets, cx, cy);
                const delta = c === ']' ? 1 : -1;
                const next = targets[(idx + delta + targets.length) % targets.length];
                restoreCursor(display, cursorState);
                cx = next.x;
                cy = next.y;
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (c === '=') {
                const currentGloc = getpos_gloc_from_filter(targetFilter);
                const target = await getpos_menu(display, runtimeCtx.map, currentGloc, runtimeCtx);
                if (!target) continue;
                restoreCursor(display, cursorState);
                cx = target.x;
                cy = target.y;
                cursorState = putCursor(display, cx, cy);
                continue;
            }
            if (ch === 18) { // ^R
                restoreCursor(display, cursorState);
                getpos_refresh();
                cursorState = putCursor(display, cx, cy);
                continue;
            }

            const isQuitChar = (ch === 32 || ch === 13 || ch === 10 || ch === 27);

            const lower = c.toLowerCase();
            const delta = moveDeltaForChar(lower);
            if (delta) {
                const steps = (c !== lower) ? 8 : 1;
                let nx = cx;
                let ny = cy;
                for (let i = 0; i < steps; i++) {
                    const moved = clampMove(nx, ny, delta[0], delta[1]);
                    nx = moved[0];
                    ny = moved[1];
                }
                if (nx !== cx || ny !== cy) {
                    restoreCursor(display, cursorState);
                    cx = nx;
                    cy = ny;
                    // C ref: auto_describe() calls custompline THEN curs(WIN_MAP,cx,cy).
                    // Display the description first, then reposition cursor on map.
                    const desc = await describeCursorWithContext(display, runtimeCtx, cx, cy);
                    if (desc && typeof display?.putstr_message === 'function') {
                        let message = desc;
                        if (runtimeCtx.travelMode) {
                            // C travel cursor feedback explicitly marks wall and
                            // unexplored squares as non-travelable.
                            if ((message === 'wall' || message === 'unexplored area')
                                && !message.includes('(no travel path)')) {
                                message = `${message} (no travel path)`;
                            } else if (typeof runtimeCtx.isTravelPathValid === 'function') {
                                const valid = await runtimeCtx.isTravelPathValid(cx, cy);
                                if (!valid && !message.includes('(no travel path)')) {
                                    message = `${message} (no travel path)`;
                                }
                            }
                        }
                        // Travel-mode getpos updates cursor descriptions as
                        // replacements on the message row.
                        if (runtimeCtx.travelMode) replaceToplineMessage();
                        await display.putstr_message(message);
                    }
                    cursorState = putCursor(display, cx, cy);
                }
                continue;
            }

            if (isShiftedPrintable(c, ch) || isUnshiftedPrintable(c, ch)) {
                const found = findMatchingMapChar(display, runtimeCtx.map, cx, cy, c, !isShiftedPrintable(c, ch));
                if (found) {
                    restoreCursor(display, cursorState);
                    cx = found.x;
                    cy = found.y;
                    cursorState = putCursor(display, cx, cy);
                    continue;
                }
                if (typeof display?.putstr_message === 'function') {
                    await display.putstr_message(`Can't find dungeon feature '${c}'.`);
                    restoreCursor(display, cursorState);
                    cursorState = putCursor(display, cx, cy);
                }
                continue;
            }

            if (!force) {
                let hadUnknownDirection = false;
                if (!isQuitChar && typeof display?.putstr_message === 'function') {
                    await display.putstr_message(`Unknown direction: '${visctrl(c)}' (aborted).`);
                    hadUnknownDirection = true;
                }
                if (typeof display?.putstr_message === 'function') {
                    await display.putstr_message('Done.');
                }
                // C getpos(force=FALSE) can leave these two plines pending at
                // --More-- before returning to normal command flow.
                if (hadUnknownDirection && display?.messageNeedsMore) {
                    await more(display, {
                        site: 'getpos.forcefalse.unknown.more',
                        forceVisual: true,
                    });
                    display.topMessage = null;
                }
                ccp.x = -1;
                ccp.y = 0;
                return 0;
            }

            if (isQuitChar) {
                restoreCursor(display, cursorState);
                cursorState = putCursor(display, cx, cy);
                continue;
            }
        }
    } finally {
        restoreCursor(display, cursorState);
        clearHiliteIfNeeded();
        getpos_hilitefunc = null;
        getpos_getvalid = null;
    }
}

export function getpos_clear_hilite() {
    clearHiliteIfNeeded();
    getpos_sethilite(null, null);
}

export { HiliteNormalMap, HiliteGoodposSymbol, HiliteBackground };

// C ref: getpos.c:311 cmp_coord_distu
// Sort comparator: by Chebyshev distance from hero, tiebreak y then x.
export function cmp_coord_distu(a, b, player) {
    const dist_a = Math.max(Math.abs(player.x - a.x), Math.abs(player.y - a.y));
    const dist_b = Math.max(Math.abs(player.x - b.x), Math.abs(player.y - b.y));
    if (dist_a !== dist_b) return dist_a - dist_b;
    return (a.y !== b.y) ? (a.y - b.y) : (a.x - b.x);
}

// C ref: getpos.c:390 gloc_filter_init
export function gloc_filter_init(map, player) {
    // For GFILTER_AREA mode, initializes the area filter via floodfill.
    // In simplified JS, the area filter is handled by gloc_filter_allows()
    // which checks roomno matching. This is a no-op stub for C naming parity.
}

// C ref: getpos.c:594 coord_desc
// Format coordinate description based on display mode.
export function coord_desc(x, y, player, cmode) {
    if (!cmode || cmode === 'none') return '';
    if (cmode === 'compass' || cmode === 'comfull') {
        const dx = x - player.x;
        const dy = y - player.y;
        return `(${dxdy_to_dist_descr(dx, dy, cmode === 'comfull')})`;
    }
    if (cmode === 'map') return `<${x},${y}>`;
    if (cmode === 'screen') {
        // Map line 0 is screen row 2; column 1 is screen column 1
        const row = String(y + 2).padStart(2, '0');
        const col = String(x).padStart(2, '0');
        return `[${row},${col}]`;
    }
    return '';
}

// C ref: getpos.c:639 auto_describe
// Display description of what's at cursor location during getpos.
export async function auto_describe(cx, cy, display, ctx) {
    if (!display || typeof display.putstr_message !== 'function') return;
    const desc = await describeCursorWithContext(display, ctx, cx, cy);
    if (!desc) return;
    const player = ctx?.player;
    const coordStr = player ? coord_desc(cx, cy, player, ctx?.flags?.getpos_coords) : '';
    let message = desc;
    if (coordStr) message += ' ' + coordStr;
    if (getpos_getvalid && !getpos_getvalid(cx, cy)) {
        message += ' (invalid target)';
    }
    if (ctx?.travelMode && typeof ctx.isTravelPathValid === 'function') {
        const valid = await ctx.isTravelPathValid(cx, cy);
        if (!valid) message += ' (no travel path)';
    }
    await display.putstr_message(message);
}

// C ref: getpos.c:512 gather_locs
// Gather interesting locations for target cycling, sorted by distance from hero.
export function gather_locs(map, gloc, player, ctx) {
    const targets = [];
    if (!map) return targets;
    // Always include hero's position (sorts to index 0)
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if ((player && x === player.x && y === player.y)
                || gather_locs_interesting(map, x, y, gloc)) {
                if (gloc_filter_allows(map, x, y, ctx)) {
                    targets.push({ x, y });
                }
            }
        }
    }
    if (player) {
        targets.sort((a, b) => cmp_coord_distu(a, b, player));
    }
    return targets;
}

// Autotranslated from getpos.c:340
export function gloc_filter_classify_glyph(glyph) {
  let c;
  if (!glyph_is_cmap(glyph)) return 0;
  c = glyph_to_cmap(glyph);
  if (is_cmap_room(c) || is_cmap_furniture(c)) return 1;
  else if (is_cmap_wall(c) || c === S_tree) return 2;
  else if (is_cmap_corr(c)) return 3;
  else if (is_cmap_water(c)) return 4;
  else if (is_cmap_lava(c)) return 5;
  return 0;
}

// Autotranslated from getpos.c:363
export function gloc_filter_floodfill_matcharea(x, y, map) {
  let glyph = back_to_glyph(x, y);
  if (!map.locations[x][y].seenv) return false;
  if (glyph === gg.gloc_filter_floodfill_match_glyph) return true;
  if (gloc_filter_classify_glyph(glyph) === gloc_filter_classify_glyph(gg.gloc_filter_floodfill_match_glyph)) return true;
  return false;
}

// Autotranslated from getpos.c:381
export function gloc_filter_floodfill(x, y) {
  gg.gloc_filter_floodfill_match_glyph = back_to_glyph(x, y);
  set_selection_floodfillchk(gloc_filter_floodfill_matcharea);
  selection_floodfill(gg.gloc_filter_map, x, y, false);
}

// Autotranslated from getpos.c:411
export function gloc_filter_done() {
  if (gg.gloc_filter_map) { selection_free(gg.gloc_filter_map, true); gg.gloc_filter_map =  0; }
}

// Autotranslated from getpos.c:421
export function known_vibrating_square_at(x, y, map) {
  if (invocation_pos(x, y)) {
    let ttmp = t_at(x, y, map || _gstate?.lev);
    return ttmp && ttmp.ttyp === VIBRATING_SQUARE && ttmp.tseen;
  }
  return false;
}

// Autotranslated from getpos.c:556
export function dxdy_to_dist_descr(dx, dy, fulldir) {
  let buf, dst;
  if (!dx && !dy) { buf = "here"; }
  else if ((dst = xytod(dx, dy)) !== -1) { buf = directionname(dst); }
  else {
    let dirnames = [ [ "n", "north" ], [ "s", "south" ], [ "w", "west" ], [ "e", "east" ] ];
    buf = '';
    if (dy) {
      if (Math.abs(dy) > 9999) dy = sgn(dy) * 9999;
      buf += `${Math.abs(dy)}${dirnames[(dy > 0)][fulldir]}${dx ? "," : ""}`;
    }
    if (dx) {
      if (Math.abs(dx) > 9999) dx = sgn(dx) * 9999;
      buf += `${Math.abs(dx)}${dirnames[2 + (dx > 0)][fulldir]}`;
    }
  }
  return buf;
}

// Autotranslated from getpos.c:728
export function truncate_to_map(cx, cy, dx, dy) {
  if ( cx + dx < 1) { dy -= sgn(dy) * (1 - ( cx + dx)); dx = 1 - cx.value; }
  else if ( cx + dx > COLNO - 1) { dy += sgn(dy) * ((COLNO - 1) - ( cx + dx)); dx = (COLNO - 1) - cx.value; }
  if ( cy + dy < 0) { dx -= sgn(dx) * (0 - ( cy + dy)); dy = 0 - cy.value; }
  else if ( cy + dy > ROWNO - 1) { dx += sgn(dx) * ((ROWNO - 1) - ( cy + dy)); dy = (ROWNO - 1) - cy.value; }
   cx += dx;
   cy += dy;
}
