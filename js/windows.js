import { strchr, strcmpi } from './hacklib.js';
// windows.js -- NetHack windowing abstraction layer
// Mirrors src/windows.c + win/tty/wintty.c + win/tty/topl.c

import { nhgetch as defaultNhgetch, more } from './input.js';
import {
    NHW_MESSAGE, NHW_STATUS, NHW_MAP, NHW_MENU, NHW_TEXT, NHW_PERMINVENT,
    PICK_NONE, PICK_ONE, PICK_ANY,
    MENU_BEHAVE_STANDARD, MENU_BEHAVE_PERMINV,
    MENU_ITEMFLAGS_SELECTED,
    ATR_NONE, ATR_ULINE, ATR_BOLD, ATR_BLINK, ATR_INVERSE, ATR_URGENT, ATR_NOHISTORY,
    nul_glyphinfo,
    MAXWIN,
} from './const.js';
import { pline } from './pline.js';

// Window ID globals (mirrors decl.c WIN_MESSAGE / WIN_MAP etc.)
let WIN_MESSAGE, WIN_STATUS, WIN_MAP, WIN_INVEN, BASE_WINDOW;

export function getWinMessage() { return WIN_MESSAGE; }

// --- Internal module state ---
const wins = new Array(MAXWIN).fill(null);

const ttyDisplay = {
    toplin: 0,    // TOPLINE_EMPTY
    inmore: false,
    inread: false,
};

const TOPLINE_EMPTY     = 0;
const TOPLINE_NON_EMPTY = 1;
// const TOPLINE_NEED_MORE = 2;  // reserved for future use

function isDismissKey(ch) {
    return ch === 32 || ch === 10 || ch === 13 || ch === 27 || ch === 16;
}

let _display          = null;
let _nhgetch          = defaultNhgetch;
let _rerenderCallback = null;

// WinDesc: mirrors struct WinDesc in win/tty/wintty.h
class WinDesc {
    constructor(type) {
        this.type      = type;
        this.flags     = 0;
        this.active    = false;
        this.mbehavior = MENU_BEHAVE_STANDARD;
        this.data      = [];   // message history or text lines
        this.mlist     = [];   // [{glyphinfo, id, ch, gch, attr, clr, str, itemflags}]
        this.how       = PICK_NONE;
        this.prompt    = '';
    }
}

function allocWin() {
    for (let i = 1; i < MAXWIN; i++) {
        if (!wins[i]) return i;
    }
    throw new Error('nhwindow: out of window slots');
}

// init_nhwindows(display, nhgetch_fn, rerenderFn)
// C ref: tty_init_nhwindows()
export function init_nhwindows(display, nhgetch_fn, rerenderFn) {
    _display          = display;
    if (nhgetch_fn) _nhgetch = nhgetch_fn;
    _rerenderCallback = rerenderFn || null;

    wins.fill(null);
    ttyDisplay.toplin = TOPLINE_EMPTY;
    ttyDisplay.inmore = false;
    ttyDisplay.inread = false;

    WIN_MESSAGE = allocWin();
    wins[WIN_MESSAGE] = new WinDesc(NHW_MESSAGE);
    BASE_WINDOW = WIN_MESSAGE;
}

// create_nhwindow(type) — C ref: tty_create_nhwindow()
export function create_nhwindow(type) {
    const id = allocWin();
    wins[id] = new WinDesc(type);
    return id;
}

// clear_nhwindow(win) — C ref: tty_clear_nhwindow()
export function clear_nhwindow(win) {
    const w = wins[win];
    if (!w) return;
    w.data   = [];
    w.mlist  = [];
    w.how    = PICK_NONE;
    w.prompt = '';
}

// display_nhwindow(win, blocking) — C ref: tty_display_nhwindow()
export async function display_nhwindow(win, blocking) {
    const w = wins[win];
    if (!w) return;
    if (w.type === NHW_MESSAGE && blocking && ttyDisplay.toplin === TOPLINE_NON_EMPTY) {
        await more(_display, { site: 'windows.display_nhwindow.message', forceVisual: true });
        ttyDisplay.toplin = TOPLINE_EMPTY;
    }
    // C ref: tty_display_nhwindow NHW_MENU/NHW_TEXT — render text popup
    // When a NHW_MENU or NHW_TEXT window has putstr data (w.data) and no menu
    // items (w.mlist empty), C renders it as a right-side text popup.
    // Used by look_here() for "Things that are here:" display.
    if ((w.type === NHW_MENU || w.type === NHW_TEXT) && w.data.length > 0 && w.mlist.length === 0) {
        // C ref: tty_display_nhwindow — before showing popup, flush pending topline
        // message with --More-- if toplin is non-empty.  Also check display.messageNeedsMore
        // for messages sent via display.putstr_message() directly (not through putstr()).
        if (blocking && (ttyDisplay.toplin === TOPLINE_NON_EMPTY || _display?.messageNeedsMore)) {
            await more(_display, { site: 'windows.display_nhwindow.pre-popup', forceVisual: true });
            // Clear row 0 after --More-- dismissal (C: more() clears the topline).
            if (_display?.clearRow) _display.clearRow(0);
            ttyDisplay.toplin = TOPLINE_EMPTY;
            if (_display) { _display.messageNeedsMore = false; _display.topMessage = null; }
        }
        const lines = w.data.map(d => typeof d === 'string' ? d : d.str);
        const popupOpts = { isTextWindow: w.type === NHW_TEXT };
        if (_display?.renderTextPopup) {
            _display.renderTextPopup(lines, popupOpts);
        }
        w._popupRendered = true;
        if (blocking) {
            // C ref: tty_more() semantics for text/menu blocking prompts:
            // only specific keys dismiss --More-- style windows.
            while (true) {
                const ch = await _nhgetch();
                if (isDismissKey(ch)) break;
            }
            // C ref: dismissing text/menu windows restores underlying map area
            // (erase_menu_or_text -> docorner/docrt).
            if ((w.type === NHW_TEXT || w.type === NHW_MENU)
                && typeof _display?.clearTextPopup === 'function') {
                _display.clearTextPopup();
            }
            if (_rerenderCallback && (w.type === NHW_TEXT || w.type === NHW_MENU)) {
                _rerenderCallback();
            }
        }
    }
}

// destroy_nhwindow(win) — C ref: tty_destroy_nhwindow()
// Frees the window slot; for menu/text windows triggers a game-view rerender.
export function destroy_nhwindow(win) {
    const w = wins[win];
    if (!w) return;
    const type = w.type;
    wins[win] = null;
    if ((type === NHW_MENU || type === NHW_TEXT) && _rerenderCallback) {
        _rerenderCallback();
    }
}

// putstr(win, attr, str) — C ref: tty_putstr()
export async function putstr(win, attr, str) {
    const w = wins[win];
    if (!w) return;
    if (w.type === NHW_MESSAGE) {
        if (!(attr & ATR_NOHISTORY)) {
            w.data.push(str);
            if (w.data.length > 20) w.data.shift();
        }
        ttyDisplay.toplin = TOPLINE_NON_EMPTY;
        if (_display?.putstr_message) await _display.putstr_message(str);
    } else {
        w.data.push({ attr, str });
    }
}

// start_menu(win, mbehavior) — C ref: tty_start_menu()
export function start_menu(win, mbehavior) {
    const w = wins[win];
    if (!w) return;
    w.mbehavior = mbehavior ?? MENU_BEHAVE_STANDARD;
    w.mlist     = [];
    w.data      = [];
    w.prompt    = '';
}

// add_menu(win, glyphinfo, id, ch, gch, attr, clr, str, itemflags) — C ref: tty_add_menu()
export function add_menu(win, glyphinfo, id, ch, gch, attr, clr, str, itemflags) {
    const w = wins[win];
    if (!w) return;
    w.mlist.push({ glyphinfo, id, ch, gch, attr, clr, str, itemflags });
}

// end_menu(win, prompt) — C ref: tty_end_menu()
// Assigns auto-selector letters (a-z, A-Z) to items that have ch === 0.
export function end_menu(win, prompt) {
    const w = wins[win];
    if (!w) return;
    w.prompt = prompt ?? '';
    let autoChar = 'a'.charCodeAt(0);
    for (const item of w.mlist) {
        if (!item.ch && item.id !== null) {  // C ref: only selectable items get auto-assigned
            item.ch = autoChar;
            if (autoChar === 'z'.charCodeAt(0))      autoChar = 'A'.charCodeAt(0);
            else if (autoChar === 'Z'.charCodeAt(0)) autoChar = 0; // exhausted
            else                                      autoChar++;
        }
    }
}

// Build the lines array that will be shown in a menu overlay.
function buildMenuLines(w, selected = null, how = PICK_NONE) {
    const lines = [];
    if (w.prompt) lines.push(w.prompt);
    lines.push('');
    for (const item of w.mlist) {
        // C ref: tty_add_menu() — non-selectable items (id===null, a_void==0)
        // store str as-is; selectable items store "%c - str". Render to match.
        if (item.id === null) {
            lines.push(item.str);          // add_menu_str equivalent: raw text, no prefix
        } else {
            const preselected = !!(item.itemflags & MENU_ITEMFLAGS_SELECTED);
            const picked = !!(item.ch && selected && selected.has(item.ch));
            const marker = (how === PICK_ONE)
                ? ((selected ? picked : preselected) ? '*' : '-')
                : (picked ? '+' : '-');
            const sel = item.ch ? `${String.fromCharCode(item.ch)} ${marker} ` : '    ';
            lines.push(sel + item.str);
        }
    }
    lines.push('(end)');  // C ref: wintty.c morestr for single-page menus
    return lines;
}

function forEachActiveTextPopupWindow(visitor) {
    for (let i = 1; i < wins.length; i++) {
        const w = wins[i];
        if (!w) continue;
        if (w.type !== NHW_MENU && w.type !== NHW_TEXT) continue;
        if (w.mlist.length !== 0 || w.data.length === 0) continue;
        // Only include windows whose popup has actually been rendered via
        // display_nhwindow.  Windows still waiting for a pre-popup --More--
        // dismissal should not be redrawn yet.
        if (!w._popupRendered) continue;
        visitor(w);
    }
}

// Replay helper: true when an active NHW_MENU/NHW_TEXT is currently being shown
// as a text popup (for example look_here "Things that are here:").
export function hasActiveTextPopupWindow() {
    let found = false;
    forEachActiveTextPopupWindow(() => {
        found = true;
    });
    return found;
}

// Replay helper: redraw active text popups after docrt-like rerender.
export function redrawActiveTextPopupWindows() {
    if (!_display?.renderTextPopup) return;
    forEachActiveTextPopupWindow((w) => {
        const lines = w.data.map((d) => (typeof d === 'string' ? d : d.str));
        _display.renderTextPopup(lines, { isTextWindow: w.type === NHW_TEXT });
    });
}

// select_menu(win, how) — C ref: tty_select_menu()
// Returns [{identifier, count}] for selected items, or null for no selection.
export async function select_menu(win, how, opts = null) {
    const w = wins[win];
    if (!w) return null;
    w.how = how;

    const renderMenu = (selected = null) => {
        const lines = buildMenuLines(w, selected, how);
        if (_display) {
            let offx = 0;
            const isPickupMenu = typeof w.prompt === 'string' && w.prompt === 'Pick up what?';
            if (typeof _display.renderOverlayMenu === 'function') {
                offx = isPickupMenu
                    ? (_display.renderOverlayMenu(lines, { capHalf: true }) || 0)
                    : (_display.renderOverlayMenu(lines) || 0);
            } else if (typeof _display.renderChargenMenu === 'function') {
                offx = _display.renderChargenMenu(lines, false) || 0;
            }
            if (typeof _display.setCursor === 'function') {
                const lastRow = Math.max(0, lines.length - 1);
                const lastLine = lines[lastRow] || '';
                const col = Math.min((_display.cols || 80) - 1, offx + lastLine.length + 1);
                _display.setCursor(col, lastRow);
            }
        }
    };
    renderMenu(null);

    if (how === PICK_NONE) {
        await _nhgetch();
        return null;
    }

    if (how === PICK_ONE) {
        const preselectedItem = w.mlist.find((item) => (
            item?.id !== null
            && !!(item.itemflags & MENU_ITEMFLAGS_SELECTED)
        )) || null;
        const acceptPreselectedOnSpace = !!opts?.acceptPreselectedOnSpace;
        while (true) {
            const ch = await _nhgetch();
            // ESC, 'q' — cancel
            if (ch === 27 || ch === 'q'.charCodeAt(0)) {
                return null;
            }
            // Optional C-faithful mode for menus with a preselected entry.
            if (ch === ' '.charCodeAt(0) || ch === 13 || ch === 10) {
                if (!acceptPreselectedOnSpace) return null;
                if (!preselectedItem) return null;
                return [{ identifier: preselectedItem.id, count: -1 }];
            }
            const item = w.mlist.find(i => i.ch === ch);
            if (item) return [{ identifier: item.id, count: -1 }];
        }
    }

    if (how === PICK_ANY) {
        const selected = new Set();
        while (true) {
            const ch = await _nhgetch();
            if (ch === 13 || ch === 10) {
                // Enter — confirm selection
                const result = [];
                for (const item of w.mlist) {
                    if (item.ch && selected.has(item.ch)) {
                        result.push({ identifier: item.id, count: -1 });
                    }
                }
                return result.length > 0 ? result : null;
            }
            if (ch === 27 || ch === 'q'.charCodeAt(0)) return null;
            if (ch === '.'.charCodeAt(0)) {
                for (const item of w.mlist) if (item.ch) selected.add(item.ch);
            } else if (ch === '-'.charCodeAt(0)) {
                selected.clear();
            } else if (ch === ' '.charCodeAt(0)) {
                // Toggle all
                if (selected.size > 0) selected.clear();
                else for (const item of w.mlist) if (item.ch) selected.add(item.ch);
            } else {
                const item = w.mlist.find(i => i.ch === ch);
                if (item && item.ch) {
                    if (selected.has(item.ch)) selected.delete(item.ch);
                    else selected.add(item.ch);
                }
            }
            renderMenu(selected);
        }
    }

    return null;
}

// Autotranslated from windows.c:192
export function genl_can_suspend_no() {
  return false;
}

// Autotranslated from windows.c:198
export function genl_can_suspend_yes() {
  return true;
}

// Autotranslated from windows.c:230
export function check_tty_wincap(wincap) {
  let wc = win_choices_find("tty");
  if (wc) return ((wc.procs.wincap & wincap) === wincap);
  return false;
}

// Autotranslated from windows.c:240
export function check_tty_wincap2(wincap2) {
  let wc = win_choices_find("tty");
  if (wc) return ((wc.procs.wincap2 & wincap2) === wincap2);
  return false;
}

// Autotranslated from windows.c:460
export function genl_preference_update(pref) {
  return;
}

// Autotranslated from windows.c:471
export function genl_getmsghistory(init) {
  return  0;
}

// Autotranslated from windows.c:488
export async function genl_putmsghistory(msg, is_restoring) {
  if (!is_restoring) await pline("%s", msg);
  return;
}

// Autotranslated from windows.c:696
export function hup_create_nhwindow(type) {
  return WIN_ERR;
}

// Autotranslated from windows.c:703
export function hup_select_menu(window, how, menu_list) {
  return -1;
}

// Autotranslated from windows.c:713
export function hup_add_menu(window, glyphinfo, identifier, sel, grpsel, attr, clr, txt, itemflags) {
  return;
}

// Autotranslated from windows.c:729
export function hup_end_menu(window, prompt) {
  return;
}

// Autotranslated from windows.c:736
export function hup_putstr(window, attr, text) {
  return;
}

// Autotranslated from windows.c:743
export function hup_print_glyph(window, x, y, glyphinfo, bkglyphinfo) {
  return;
}

// Autotranslated from windows.c:754
export function hup_outrip(tmpwin, how, when) {
  return;
}

// Autotranslated from windows.c:761
export function hup_curs(window, x, y) {
  return;
}

// Autotranslated from windows.c:768
export function hup_display_nhwindow(window, blocking) {
  return;
}

// Autotranslated from windows.c:775
export function hup_display_file(fname, complain) {
  return;
}

// Autotranslated from windows.c:783
export function hup_cliparound(x, y) {
  return;
}

// Autotranslated from windows.c:815
export function hup_status_update(idx, ptr, chg, pc, color, colormasks) {
  return;
}

// Autotranslated from windows.c:828
export function hup_int_ndecl() {
  return -1;
}

// Autotranslated from windows.c:834
export function hup_void_ndecl() {
  return;
}

// Autotranslated from windows.c:841
export function hup_void_fdecl_int(arg) {
  return;
}

// Autotranslated from windows.c:848
export function hup_void_fdecl_winid(window) {
  return;
}

// Autotranslated from windows.c:855
export function hup_void_fdecl_winid_ulong(window, mbehavior) {
  return;
}

// Autotranslated from windows.c:864
export function hup_void_fdecl_constchar_p(string) {
  return;
}

// Autotranslated from windows.c:871
export function hup_ctrl_nhwindow(window, request, wri) {
  return  0;
}

// Autotranslated from windows.c:908
export function genl_status_finish() {
  let i;
  for (i = 0; i < MAXBLSTATS; ++i) {
    if (status_vals) (status_vals[i], 0), status_vals =  0;
  }
}

// Autotranslated from windows.c:921
export function genl_status_enablefield(fieldidx, nm, fmt, enable) {
  status_fieldfmt = fmt;
  status_fieldnm = nm;
  status_activefields = enable;
}

// Autotranslated from windows.c:1243
export function dump_open_log(now) {
}

// Autotranslated from windows.c:1266
export function dump_close_log() {
  if (dumplog_file) { fclose(dumplog_file); dumplog_file = null; }
}

// Autotranslated from windows.c:1275
export async function dump_forward_putstr(win, attr, str, no_forward) {
  if (dumplog_file) fprintf(dumplog_file, "%s\n", str);
  if (!no_forward) await putstr(win, attr, str);
}

// Autotranslated from windows.c:1285
export function dump_putstr(win, attr, str) {
  if (dumplog_file) fprintf(dumplog_file, "%s\n", str);
}

// Autotranslated from windows.c:1292
export function dump_create_nhwindow(type) {
  return WIN_ERR;
}

// Autotranslated from windows.c:1299
export function dump_clear_nhwindow(win) {
  return;
}

// Autotranslated from windows.c:1306
export function dump_display_nhwindow(win, p) {
  return;
}

// Autotranslated from windows.c:1313
export function dump_destroy_nhwindow(win) {
  return;
}

// Autotranslated from windows.c:1320
export function dump_start_menu(win, mbehavior) {
  return;
}

// Autotranslated from windows.c:1327
export function dump_add_menu(win, glyphinfo, identifier, ch, gch, attr, clr, str, itemflags) {
  if (dumplog_file) {
    if (glyphinfo.glyph === NO_GLYPH) fprintf(dumplog_file, " %s\n", str);
    else {
      fprintf(dumplog_file, " %c - %s\n", ch, str);
    }
  }
}

// Autotranslated from windows.c:1347
export function dump_end_menu(win, str) {
  if (dumplog_file) {
    if (str) fprintf(dumplog_file, "%s\n", str);
    else {
      fputs("\n", dumplog_file);
    }
  }
}

// Autotranslated from windows.c:1358
export function dump_select_menu(win, how, item) {
   item =  0;
  return 0;
}

// Autotranslated from windows.c:1409
export function glyph2ttychar(glyph) {
  let glyphinfo;
  map_glyphinfo(0, 0, glyph, 0, glyphinfo);
  return glyphinfo.ttychar;
}

// Autotranslated from windows.c:1418
export function glyph2symidx(glyph, game) {
  let glyphinfo;
  map_glyphinfo(0, 0, glyph, 0, glyphinfo);
  return glyphinfo.game.sym.symidx;
}

// Autotranslated from windows.c:1427
export function encglyph(glyph, game) {
  let encbuf;
  encbuf = `\\G${game.svc.context.rndencode.toString(16).toUpperCase().padStart(4, '0')}${glyph.toString(16).toUpperCase().padStart(4, '0')}`;
  return encbuf;
}

// Autotranslated from windows.c:1438
export function decode_glyph(str, glyph_ptr, game) {
  let rndchk = 0, dcount = 0, retval = 0, dp;
  for ( str && ++dcount <= 4; ++str; ) {
    if ((dp = strchr(hexdd, str)) != null) {
      retval++;
      rndchk = (rndchk * 16) + (Math.trunc(dp - hexdd) / 2);
    }
    else {
      break;
    }
  }
  if (rndchk === game.svc.context.rndencode) {
     glyph_ptr = dcount = 0;
    for ( str && ++dcount <= 4; ++str; ) {
      if ((dp = strchr(hexdd, str)) != null) {
        retval++;
         glyph_ptr = ( glyph_ptr * 16) + (Math.trunc(dp - hexdd) / 2);
      }
      else {
        break;
      }
    }
    return retval;
  }
  return 0;
}

// Autotranslated from windows.c:1527
export async function genl_putmixed(window, attr, str) {
  let buf;
  await putstr(window, attr, decode_mixed(buf, str));
}

// Autotranslated from windows.c:252
export function win_choices_find(s) {
  let i;
  for (i = 0; winchoices[i].procs; i++) {
    if (!strcmpi(s, winchoices[i].procs.name)) { return winchoices[i]; }
  }
  return  0;
}

// Autotranslated from windows.c:656
export function hup_nhgetch() {
  return '\x00o33';
}

// Autotranslated from windows.c:663
export function hup_yn_function(prompt, resp, deflt) {
  if (!deflt) deflt = '\x00o33';
  return deflt;
}

// Autotranslated from windows.c:675
export function hup_nh_poskey(x, y, mod) {
  return '\x00o33';
}

// Autotranslated from windows.c:450
export async function genl_message_menu(let_, how, mesg) {
  await pline("%s", mesg);
  return 0;
}

// Autotranslated from windows.c:682
export function hup_getlin(prompt, outbuf) {
  outbuf = ("\x00o33" ?? '');
}

// Autotranslated from windows.c:1599
export function mixed_to_glyphinfo(str, gip) {
  let dcount, ggv;
  if (!str || !gip) return " ";
   gip = nul_glyphinfo;
  if ( str === '\\' && (str + 1) === 'G') {
    if ((dcount = decode_glyph(str + 2, ggv))) { map_glyphinfo(0, 0, ggv, 0, gip); str += (dcount + 2); }
  }
  return str;
}
