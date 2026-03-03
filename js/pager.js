// pager.js -- In-terminal text pager
// Displays long text documents inside the 80x24 terminal, with scrolling.
// Modeled after NetHack's built-in text display (pager.c).

import { TERMINAL_COLS, TERMINAL_ROWS, VERSION_STRING } from './config.js';
import { nhgetch } from './input.js';
import { CLR_GRAY, CLR_WHITE, CLR_GREEN, CLR_CYAN } from './display.js';
import { create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu,
         NHW_MENU, NHW_TEXT, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE } from './windows.js';
import { dowhatis } from './look.js';

// Number of usable text rows (reserve 1 for status bar at bottom)
const PAGE_ROWS = TERMINAL_ROWS - 1;
const STATUS_LINE = TERMINAL_ROWS - 1;

// Display a text file in the terminal with paging.
// Saves and restores the terminal contents.
//
// Controls:
//   Space, Enter, j, down  = scroll down one page
//   b, k, up               = scroll up one page
//   q, ESC                 = quit
//   /                      = search
//   Home, g                = go to top
//   End, G                 = go to bottom
export async function showPager(display, text, title) {
    const win = create_nhwindow(NHW_TEXT);
    try {
        await _showPagerCore(display, text, title);
    } finally {
        destroy_nhwindow(win);
    }
}

async function _showPagerCore(display, text, title) {
    // Split text into lines, wrapping long lines to terminal width
    const lines = wrapText(text, TERMINAL_COLS);

    // Save entire terminal state
    const canSaveRestore = !!display?.grid;
    const saved = canSaveRestore ? saveTerminal(display) : null;

    let topLine = 0;
    let searchTerm = null;

    async function render() {
        // Clear and draw text
        for (let r = 0; r < PAGE_ROWS; r++) {
            const lineIdx = topLine + r;
            display.clearRow(r);
            if (lineIdx < lines.length) {
                const line = lines[lineIdx];
                if (typeof display.setCell === 'function') {
                    for (let c = 0; c < line.length && c < TERMINAL_COLS; c++) {
                        const isHighlight = searchTerm && isSearchHit(line, c, searchTerm);
                        display.setCell(c, r, line[c], isHighlight ? CLR_CYAN : CLR_GRAY);
                    }
                } else {
                    await display.putstr(0, r, line.substring(0, TERMINAL_COLS), CLR_GRAY);
                }
            }
        }

        // Status bar
        display.clearRow(STATUS_LINE);
        const pct = lines.length <= PAGE_ROWS ? '(All)'
            : topLine + PAGE_ROWS >= lines.length ? '(Bot)'
            : topLine === 0 ? '(Top)'
            : `(${Math.round(topLine / (lines.length - PAGE_ROWS) * 100)}%)`;
        const titleStr = title ? title + ' ' : '';
        const status = `${titleStr}-- ${pct} -- [q:quit  space:next  b:back  /:search]`;
        await display.putstr(0, STATUS_LINE, status.substring(0, TERMINAL_COLS), CLR_GREEN);
    }

    await render();

    // Input loop
    while (true) {
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (c === 'q' || ch === 27) {
            // Quit
            break;
        } else if (c === ' ' || ch === 13 || c === 'j' || ch === 106) {
            // Next page (space, enter, j)
            if (topLine + PAGE_ROWS < lines.length) {
                topLine = Math.min(topLine + PAGE_ROWS, lines.length - PAGE_ROWS);
                await render();
            }
        } else if (c === 'b' || c === 'k') {
            // Previous page
            if (topLine > 0) {
                topLine = Math.max(topLine - PAGE_ROWS, 0);
                await render();
            }
        } else if (c === 'g' || ch === 36) {
            // Home - first page (36 = Home key mapped)
            topLine = 0;
            await render();
        } else if (c === 'G') {
            // End - last page
            topLine = Math.max(0, lines.length - PAGE_ROWS);
            await render();
        } else if (c === '/') {
            // Search
            searchTerm = await getSearchTerm(display);
            if (searchTerm) {
                const found = findNext(lines, topLine + 1, searchTerm);
                if (found >= 0) {
                    topLine = Math.min(found, Math.max(0, lines.length - PAGE_ROWS));
                }
            }
            await render();
        } else if (c === 'n' && searchTerm) {
            // Next search match
            const found = findNext(lines, topLine + 1, searchTerm);
            if (found >= 0) {
                topLine = Math.min(found, Math.max(0, lines.length - PAGE_ROWS));
            }
            await render();
        }
        // Arrow keys come through as hjkl from input.js
        // h/l = 104/108 — ignore horizontal
        // Down arrow -> j (106), Up arrow -> k (107) — handled above
    }

    // Restore terminal
    if (saved) {
        restoreTerminal(display, saved);
    }
}

// Wrap text to fit terminal width
function wrapText(text, width) {
    const rawLines = text.split('\n');
    const result = [];
    for (const raw of rawLines) {
        if (raw.length <= width) {
            result.push(raw);
        } else {
            // Hard-wrap at width boundary
            for (let i = 0; i < raw.length; i += width) {
                result.push(raw.substring(i, i + width));
            }
        }
    }
    return result;
}

// Save entire terminal state
function saveTerminal(display) {
    const saved = [];
    for (let r = 0; r < TERMINAL_ROWS; r++) {
        saved[r] = [];
        for (let c = 0; c < TERMINAL_COLS; c++) {
            saved[r][c] = { ...display.grid[r][c] };
        }
    }
    return saved;
}

// Restore terminal state
function restoreTerminal(display, saved) {
    for (let r = 0; r < TERMINAL_ROWS; r++) {
        for (let c = 0; c < TERMINAL_COLS; c++) {
            const cell = saved[r][c];
            display.setCell(c, r, cell.ch, cell.color);
        }
    }
}

// Simple inline search prompt on the status line
async function getSearchTerm(display) {
    display.clearRow(STATUS_LINE);
    await display.putstr(0, STATUS_LINE, '/', CLR_GREEN);

    let term = '';
    while (true) {
        const ch = await nhgetch();
        if (ch === 13 || ch === 10) {
            return term || null;
        } else if (ch === 27) {
            return null;
        } else if (ch === 8 || ch === 127) {
            if (term.length > 0) {
                term = term.slice(0, -1);
                display.clearRow(STATUS_LINE);
                await display.putstr(0, STATUS_LINE, '/' + term, CLR_GREEN);
            }
        } else if (ch >= 32 && ch < 127) {
            term += String.fromCharCode(ch);
            await display.putstr(0, STATUS_LINE, '/' + term, CLR_GREEN);
        }
    }
}

// Find next line containing search term (case-insensitive)
function findNext(lines, startLine, term) {
    const lower = term.toLowerCase();
    for (let i = startLine; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lower)) {
            return i;
        }
    }
    // Wrap around
    for (let i = 0; i < startLine; i++) {
        if (lines[i].toLowerCase().includes(lower)) {
            return i;
        }
    }
    return -1;
}

// Check if position c in line is part of a search match (for highlighting)
function isSearchHit(line, c, term) {
    const lower = line.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const start = c - lowerTerm.length + 1;
    for (let i = Math.max(0, start); i <= c; i++) {
        if (lower.substring(i, i + lowerTerm.length) === lowerTerm) {
            return true;
        }
    }
    return false;
}

// -----------------------------------------------------------------------
// Pager-related command handlers (moved from cmd.js)
// C ref: pager.c — dolook, dowhatis, dowhatdoes, dohelp, dohistory, etc.
// -----------------------------------------------------------------------

// Handle previous messages
// C ref: cmd.c doprev_message() -> topl.c tty_doprev_message()
// Default mode 's' (single): shows one message at a time on top line
export async function handlePrevMessages(display) {
    const messages = display.messages || [];

    if (messages.length === 0) {
        await display.putstr_message('No previous messages.');
        return { moved: false, tookTime: false };
    }

    // C tty mode 's': show one message each Ctrl+P press.
    // Keep an index so repeated Ctrl+P cycles backward without blocking input.
    let messageIndex = Number.isInteger(display.prevMessageCycleIndex)
        ? display.prevMessageCycleIndex
        : (messages.length - 1);
    if (messageIndex < 0 || messageIndex >= messages.length) {
        messageIndex = messages.length - 1;
    }
    await display.putstr_message(messages[messageIndex]);
    display.prevMessageCycleIndex = (messageIndex - 1 + messages.length) % messages.length;

    return { moved: false, tookTime: false };
}

// View map prompt
// C ref: cmd.c dooverview()
export async function handleViewMapPrompt(game) {
    const { display, map, player, fov, flags } = game;
    const lines = [
        'View which?',
        '',
        'a * known map without monsters, objects, and traps',
        'b - known map without monsters and objects',
        'c - known map without monsters',
        '(end)',
    ];

    display.clearScreen();
    display.renderMap(map, player, fov, flags);
    if (typeof display.renderStatus === 'function') {
        display.renderStatus(player);
    }
    for (let i = 0; i < lines.length && i < display.rows; i++) {
        const text = lines[i].substring(0, Math.max(0, display.cols - 28));
        const attr = (i === 0) ? 1 : 0;
        await display.putstr(28, i, ' '.repeat(Math.max(0, display.cols - 28)));
        await display.putstr(28, i, text, undefined, attr);
    }

    await nhgetch();
    display.clearScreen();
    display.renderMap(map, player, fov, flags);
    if (typeof display.renderStatus === 'function') {
        display.renderStatus(player);
    }
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
    return { moved: false, tookTime: false };
}

// Data file cache (same pattern as guidebook)
const dataFileCache = {};

// Fetch a data file from dat/ directory with caching
async function fetchDataFile(filename) {
    if (dataFileCache[filename]) return dataFileCache[filename];
    try {
        const resp = await fetch(filename);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        dataFileCache[filename] = text;
        return text;
    } catch (e) {
        return null;
    }
}

// Command descriptions for & (whatdoes)
// C ref: pager.c dowhatdoes() / dat/cmdhelp
const COMMAND_DESCRIPTIONS = {
    '?': 'Display one of several informative help texts.',
    '/': 'Tell what a map symbol represents.',
    '&': 'Tell what a command does.',
    '<': 'Go up a staircase.',
    '>': 'Go down a staircase.',
    '.': 'Rest, do nothing for one turn.',
    ',': 'Pick up things at the current location.',
    ':': 'Look at what is here.',
    ';': 'Look at what is somewhere else.',
    '\\': 'Show what types of objects have been discovered.',
    '#': 'Perform an extended command.',
    'a': 'Apply (use) a tool.',
    'c': 'Close a door.',
    'd': 'Drop an item. d7a: drop seven items of object a.',
    'e': 'Eat something.',
    'i': 'Show your inventory.',
    'o': 'Open a door.',
    'q': 'Drink (quaff) a potion.',
    'P': 'Put on a ring or other accessory.',
    's': 'Search for secret doors and traps around you.',
    'w': 'Wield a weapon. w- means wield bare hands.',
    'S': 'Save the game.',
    'T': 'Take off armor.',
    'V': 'Display the version and history of the game.',
    'W': 'Wear armor.',
};

// Handle help (?)
// C ref: pager.c dohelp() -> help_menu_items[]
export async function handleHelp(game) {
    const { display } = game;

    // Build help menu using nhwindow API
    const win = create_nhwindow(NHW_MENU);
    start_menu(win, MENU_BEHAVE_STANDARD);
    add_menu(win, null, 'a', 'a'.charCodeAt(0), 0, ATR_NONE, 0, 'About NetHack (version information).', 0);
    add_menu(win, null, 'b', 'b'.charCodeAt(0), 0, ATR_NONE, 0, 'Long description of the game and commands.', 0);
    add_menu(win, null, 'c', 'c'.charCodeAt(0), 0, ATR_NONE, 0, 'List of game commands.', 0);
    add_menu(win, null, 'd', 'd'.charCodeAt(0), 0, ATR_NONE, 0, 'Concise history of NetHack.', 0);
    add_menu(win, null, 'e', 'e'.charCodeAt(0), 0, ATR_NONE, 0, 'Info on a character in the game display.', 0);
    add_menu(win, null, 'f', 'f'.charCodeAt(0), 0, ATR_NONE, 0, 'Info on what a given key does.', 0);
    add_menu(win, null, 'g', 'g'.charCodeAt(0), 0, ATR_NONE, 0, 'Longer explanation of game options.', 0);
    add_menu(win, null, 'h', 'h'.charCodeAt(0), 0, ATR_NONE, 0, 'Full list of keyboard commands.', 0);
    add_menu(win, null, 'i', 'i'.charCodeAt(0), 0, ATR_NONE, 0, 'List of extended commands.', 0);
    add_menu(win, null, 'j', 'j'.charCodeAt(0), 0, ATR_NONE, 0, 'The NetHack Guidebook.', 0);
    if (game.wizard) {
        add_menu(win, null, 'w', 'w'.charCodeAt(0), 0, ATR_NONE, 0, 'List of wizard-mode commands.', 0);
    }
    end_menu(win, ' Select one item:');
    const sel = await select_menu(win, PICK_ONE);
    destroy_nhwindow(win);

    const c = sel ? sel[0].identifier : null;
    if (c === 'a') {
        // About NetHack
        await display.putstr_message(`${VERSION_STRING}`);
    } else if (c === 'b') {
        const text = await fetchDataFile('dat/help.txt');
        if (text) await showPager(display, text, 'Long Description');
        else await display.putstr_message('Failed to load help text.');
    } else if (c === 'c') {
        const text = await fetchDataFile('dat/hh.txt');
        if (text) await showPager(display, text, 'Game Commands');
        else await display.putstr_message('Failed to load command list.');
    } else if (c === 'd') {
        const text = await fetchDataFile('dat/history.txt');
        if (text) await showPager(display, text, 'History of NetHack');
        else await display.putstr_message('Failed to load history.');
    } else if (c === 'e') {
        return await dowhatis(game);
    } else if (c === 'f') {
        return await handleWhatdoes(game);
    } else if (c === 'g') {
        const text = await fetchDataFile('dat/opthelp.txt');
        if (text) await showPager(display, text, 'Game Options');
        else await display.putstr_message('Failed to load options help.');
    } else if (c === 'h') {
        await showPager(display, keyHelpText, 'Key Bindings');
    } else if (c === 'i') {
        await showPager(display, extendedCommandsText, 'Extended Commands');
    } else if (c === 'j') {
        await showGuidebook(display);
    } else if (c === 'w' && game.wizard) {
        const text = await fetchDataFile('dat/wizhelp.txt');
        if (text) await showPager(display, text, 'Wizard Mode Commands');
        else await display.putstr_message('Failed to load wizard help.');
    }
    // ESC, q, or anything else = dismiss (sel is null)

    return { moved: false, tookTime: false };
}

// Inline key bindings text for help option 'h'
const keyHelpText = [
    '                    NetHack Command Reference',
    '',
    ' Movement:',
    '   y k u      Also: arrow keys, or numpad',
    '    \\|/',
    '   h-.-l      Shift + direction = run',
    '    /|\\',
    '   b j n',
    '',
    ' Actions:',
    '   .  wait/rest           s  search adjacent',
    '   ,  pick up item        d  drop item',
    '   o  open door           c  close door',
    '   >  go downstairs       <  go upstairs',
    '   e  eat food            q  quaff potion',
    '   w  wield weapon        W  wear armor',
    '   T  take off armor      i  inventory',
    '   :  look here           ;  identify position',
    '',
    ' Information:',
    '   ?    help menu',
    '   /    identify a map symbol (whatis)',
    '   &    describe what a key does (whatdoes)',
    '   \\    show discovered object types',
    '   V    version and history of the game',
    '',
    ' Other:',
    '   S    save game',
    '   #    extended command',
    '   ^P   previous messages',
    '   ^R   redraw screen',
    '   ^D   kick',
    '   ^C   quit',
    '',
    ' In pager (guidebook, help):',
    '   space/enter  next page     b  previous page',
    '   /  search    n  next match',
    '   g  first page              G  last page',
    '   q/ESC  exit',
].join('\n');

// Extended commands list text for help option 'i'
const extendedCommandsText = [
    '         Extended Commands',
    '',
    ' #force   M-f   force a locked chest with your weapon',
    ' #loot    M-l   loot a container',
    ' #name          name an object or level',
    ' #quit          quit the game without saving',
    ' #levelchange   change dungeon level (debug mode)',
    ' #map           reveal entire map (debug mode)',
    ' #teleport      teleport to coordinates (debug mode)',
    ' #genesis       create a monster by name (debug mode)',
].join('\n');

// Handle & (whatdoes) command
// C ref: pager.c dowhatdoes()
export async function handleWhatdoes(game) {
    const { display } = game;

    await display.putstr_message('What command?');
    const ch = await nhgetch();

    if (ch === 27) {
        return { moved: false, tookTime: false };
    }

    const c = String.fromCharCode(ch);
    let desc;

    // Check for control characters
    if (ch < 32) {
        const ctrlChar = '^' + String.fromCharCode(ch + 64);
        const ctrlDescs = {
            '^C': 'Quit the game.',
            '^D': 'Kick something (usually a door).',
            '^P': 'Repeat previous message (consecutive ^P\'s show earlier ones).',
            '^R': 'Redraw the screen.',
        };
        if (game.wizard) {
            ctrlDescs['^F'] = 'Map the level (wizard mode).';
            ctrlDescs['^G'] = 'Create a monster (wizard mode).';
            ctrlDescs['^I'] = 'Identify items in pack (wizard mode).';
            ctrlDescs['^T'] = 'Teleport (wizard mode).';
            ctrlDescs['^V'] = 'Level teleport (wizard mode).';
            ctrlDescs['^W'] = 'Wish (wizard mode).';
        }
        desc = ctrlDescs[ctrlChar];
        if (desc) {
            await display.putstr_message(`${ctrlChar}: ${desc}`);
        } else {
            await display.putstr_message(`${ctrlChar}: unknown command.`);
        }
    } else if (COMMAND_DESCRIPTIONS[c]) {
        await display.putstr_message(`'${c}': ${COMMAND_DESCRIPTIONS[c]}`);
    } else {
        await display.putstr_message(`'${c}': unknown command.`);
    }

    return { moved: false, tookTime: false };
}

// Handle V (history) command
// C ref: pager.c dohistory()
export async function handleHistory(game) {
    const { display } = game;
    const text = await fetchDataFile('dat/history.txt');
    if (text) {
        await showPager(display, text, 'History of NetHack');
    } else {
        await display.putstr_message('Failed to load history.');
    }
    return { moved: false, tookTime: false };
}

// Guidebook text cache
let guidebookText = null;

// Fetch and display the NetHack Guidebook
async function showGuidebook(display) {
    if (!guidebookText) {
        await display.putstr_message('Loading Guidebook...');
        try {
            const resp = await fetch('Guidebook.txt');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            guidebookText = await resp.text();
        } catch (e) {
            await display.putstr_message('Failed to load Guidebook.');
            return;
        }
    }
    await showPager(display, guidebookText, 'NetHack Guidebook');
}

// Autotranslated from pager.c:67
export function is_swallow_sym(c) {
  let i;
  for (i = S_sw_tl; i <= S_sw_br; i++) {
    if ( gs.showsyms === c) return true;
  }
  return false;
}

// Autotranslated from pager.c:137
export function monhealthdescr(mon, addspace, outbuf) {
  nhUse(mon);
  nhUse(addspace);
   outbuf = '\0';
  return outbuf;
}

// Autotranslated from pager.c:166
export function trap_description(outbuf, tnum, x, y) {
  if (trapped_chest_at(tnum, x, y)) {
    Strcpy(outbuf, "trapped chest");
  }
  else if (trapped_door_at(tnum, x, y)) {
    Strcpy(outbuf, "trapped door");
  }
  else {
    Strcpy(outbuf, trapname(tnum, false));
  }
  return;
}

// Autotranslated from pager.c:379
export async function look_at_object(buf, x, y, glyph, map) {
  let otmp = 0, fakeobj = object_from_map(glyph, x, y, otmp);
  if (otmp) {
    Strcpy(buf, (otmp.otyp !== STRANGE_OBJECT) ? await distant_name(otmp, otmp.dknown ? doname_with_price : doname_vague_quan) : obj_descr[STRANGE_OBJECT].oc_name);
    if (fakeobj) { otmp.where = OBJ_FREE; dealloc_obj(otmp), otmp = null; }
  }
  else { Strcpy(buf, something); }
  if (otmp && otmp.where === OBJ_BURIED) {
    Strcat(buf, " (buried)");
  }
  else if (IS_TREE(map.locations[x][y].typ)) Snprintf(eos(buf), BUFSZ - strlen(buf), " %s in a tree", (otmp && is_treefruit(otmp)) ? "dangling" : "stuck");
  else if (map.locations[x][y].typ === STONE || map.locations[x][y].typ === SCORR) {
    Strcat(buf, " embedded in stone");
  }
  else if (IS_WALL(map.locations[x][y].typ) || map.locations[x][y].typ === SDOOR) {
    Strcat(buf, " embedded in a wall");
  }
  else if (closed_door(x, y)) {
    Strcat(buf, " embedded in a door");
  }
  else if (is_pool(x, y)) {
    Strcat(buf, " in water");
  }
  else if (is_lava(x, y)) {
    Strcat(buf, " in molten lava");
  }
  return;
}

// Autotranslated from pager.c:1961
export function look_region_nearby(lo_x, lo_y, hi_x, hi_y, nearby, player) {
   lo_y = nearby ? Math.max(player.y - BOLT_LIM, 0) : 0;
   lo_x = nearby ? Math.max(player.x - BOLT_LIM, 1) : 1;
   hi_y = nearby ? Math.min(player.y + BOLT_LIM, ROWNO - 1) : ROWNO - 1;
   hi_x = nearby ? Math.min(player.x + BOLT_LIM, COLNO - 1) : COLNO - 1;
}

// Autotranslated from pager.c:2324
export async function doquickwhatis() {
  return do_look(1, null);
}

// Autotranslated from pager.c:2331
export async function doidtrap(player) {
  let trap, tt, glyph, x, y;
  if (!await getdir("^")) return ECMD_CANCEL;
  x = player.x + player.dx;
  y = player.y + player.dy;
  glyph = glyph_at(x, y);
  if (glyph_is_trap(glyph) && ((tt = glyph_to_trap(glyph)) === BEAR_TRAP || tt === TRAPPED_DOOR || tt === TRAPPED_CHEST)) {
    let chesttrap = trapped_chest_at(tt, x, y);
    if (chesttrap || trapped_door_at(tt, x, y)) {
      await pline("That is a trapped %s.", chesttrap ? "chest" : "door");
      return ECMD_OK;
    }
  }
  for (trap = gf.ftrap; trap; trap = trap.ntrap) {
    if (trap.tx === x && trap.ty === y) {
      if (!trap.tseen) {
        break;
      }
      tt = trap.ttyp;
      if (player.dz) {
        if (player.dz < 0 ? is_hole(tt) : tt === ROCKTRAP) {
          break;
        }
      }
      await pline("That is %s%s%s.", an(trapname(tt, false)), !trap.madeby_u ? "" : (tt === WEB) ? " woven"   : (tt === HOLE || tt === PIT) ? " dug" : " set", !trap.madeby_u ? "" : " by you");
      return ECMD_OK;
    }
  }
  await pline("I can't see a trap there.");
  return ECMD_OK;
}

// Autotranslated from pager.c:2572
export async function dowhatdoes_core(q, cbuf) {
  let buf, ec_desc;
  if ((ec_desc = key2extcmddesc(q)) !== null) {
    let keybuf;
    Sprintf(buf, "%-8s%s.", key2txt(q, keybuf), ec_desc);
    Strcpy(cbuf, buf);
    return cbuf;
  }
  return 0;
}

// Autotranslated from pager.c:2743
export function dispfile_help() {
  display_file(HELP, true);
}

// Autotranslated from pager.c:2749
export function dispfile_shelp() {
  display_file(SHELP, true);
}

// Autotranslated from pager.c:2755
export function dispfile_optionfile() {
  display_file(OPTIONFILE, true);
}

// Autotranslated from pager.c:2761
export function dispfile_optmenu() {
  display_file(OPTMENUHELP, true);
}

// Autotranslated from pager.c:2767
export function dispfile_license() {
  display_file(LICENSE, true);
}

// Autotranslated from pager.c:2773
export function dispfile_debughelp() {
  display_file(DEBUGHELP, true);
}

// Autotranslated from pager.c:2779
export function dispfile_usagehelp() {
  display_file(USAGEHELP, true);
}

// Autotranslated from pager.c:2785
export function hmenu_doextversion() {
  doextversion();
}

// Autotranslated from pager.c:2791
export function hmenu_dohistory() {
  dohistory();
}

// Autotranslated from pager.c:2797
export async function hmenu_dowhatis() {
  await dowhatis();
}

// Autotranslated from pager.c:2803
export async function hmenu_dowhatdoes() {
  await dowhatdoes();
}

// Autotranslated from pager.c:2809
export function hmenu_doextlist() {
  doextlist();
}

// Autotranslated from pager.c:2956
export function dohistory() {
  display_file(HISTORY, true);
  return ECMD_OK;
}
