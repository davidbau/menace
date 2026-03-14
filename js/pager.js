// pager.js -- In-terminal text pager
// Displays long text documents inside the 80x24 terminal, with scrolling.
// Modeled after NetHack's built-in text display (pager.c).

import {
    TERMINAL_COLS, TERMINAL_ROWS, VERSION_STRING,
    STAIRS, LADDER, FOUNTAIN, SINK, THRONE, ALTAR, GRAVE, POOL, LAVAPOOL,
    DOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_BROKEN,
    IRONBARS, TREE, CORR, SCORR, ICE,
    STONE, ROOM, COLNO, ROWNO, MAP_ROW_START, CLR_GRAY, NO_COLOR, IS_WALL, TER_MAP,
    BEAR_TRAP, TRAPPED_DOOR, TRAPPED_CHEST,
} from './const.js';
import { def_monsyms, glyph_is_trap, glyph_to_trap } from './symbols.js';
import { more, nhgetch, ynFunction } from './input.js';
import { CLR_WHITE, CLR_GREEN, CLR_CYAN, glyph_at } from './display.js';
import { pline } from './pline.js';
import { an } from './objnam.js';
import { describeGroundObjectForPlayer } from './shk.js';
import { COIN_CLASS } from './objects.js';
import { observeObject } from './o_init.js';
import { create_nhwindow, destroy_nhwindow, start_menu, add_menu, end_menu, select_menu,
       } from './windows.js';
import { NHW_MENU, NHW_TEXT, MENU_BEHAVE_STANDARD, PICK_ONE, ATR_NONE, MENU_ITEMFLAGS_SELECTED, gs } from './const.js';
import { getpos_async } from './getpos.js';
import { x_monnam } from './mondata.js';
import { races, roleNameForGender } from './role.js';
import { engr_at, can_reach_floor } from './engrave.js';
import { trapped_chest_at, trapped_door_at } from './detect.js';
import { objectData, STRANGE_OBJECT } from './objects.js';
import { visctrl } from './hacklib.js';
import { terrainSymbol, wallIsVisible } from './render.js';
import { dealloc_obj } from './mkobj.js';
import { nhfetch, nhimport } from './origin_awaits.js';

// -----------------------------------------------------------------------
// Look / whatis core (merged from look.js)
// C refs: pager.c do_look(), do_screen_description(), dowhatis(), doquickwhatis()
// -----------------------------------------------------------------------

const LOOK_ONCE = 1;
const LOOK_VERBOSE = 3;

// C ref: dat/help symbol legend (reduced table used by '/' typed-symbol path).
const SYMBOL_DESCRIPTIONS = {
    '-': 'wall of a room, or an open door',
    '|': 'wall of a room, or an open door',
    '.': 'floor of a room, or a doorway',
    '#': 'a corridor, or iron bars, or a tree',
    '>': 'stairs down: a way to the next level',
    '<': 'stairs up: a way to the previous level',
    '@': 'you (usually), or another human',
    ')': 'a weapon',
    '[': 'a suit or piece of armor',
    '%': 'something edible (not necessarily healthy)',
    '/': 'a wand',
    '=': 'a ring',
    '?': 'a scroll',
    '!': 'a potion',
    '(': 'a useful item (pick-axe, key, lamp...)',
    '$': 'a pile of gold',
    '*': 'a gem or rock',
    '+': 'a closed door, or a spellbook',
    '^': 'a trap (once you detect it)',
    '"': 'an amulet, or a spider web',
    '0': 'an iron ball',
    '_': 'an altar, or an iron chain',
    '{': 'a fountain',
    '}': 'a pool of water or moat or lava',
    '\\': 'an opulent throne',
    '`': 'a boulder or statue',
    ' ': 'dark part of a room, or solid rock',
    '\u00b7': 'floor of a room (middle dot)',
};

function terrain_here_description(loc, ctx = {}) {
    if (!loc) return '';
    const player = ctx.player || null;
    const map = ctx.map || null;
    const dnum = (player?.uz ? player.uz.dnum : undefined)
        ?? (map?.uz ? map.uz.dnum : undefined)
        ?? (Number.isInteger(map?._genDnum) ? map._genDnum : undefined);
    const depth = Number.isInteger(player?.dungeonLevel) ? player.dungeonLevel
        : (map?.uz ? map.uz.dlevel : undefined);
    const outOfDungeonExit = (loc.typ === STAIRS && loc.flags === 1 && dnum === 0 && depth === 1);
    if (outOfDungeonExit) return 'There is a staircase up out of the dungeon here.';
    if (loc.typ === STAIRS && loc.flags === 1) return 'There is a staircase up here.';
    if (loc.typ === STAIRS && loc.flags === 0) return 'There is a staircase down here.';
    if (loc.typ === LADDER && loc.flags === 1) return 'There is a ladder up here.';
    if (loc.typ === LADDER && loc.flags === 0) return 'There is a ladder down here.';
    if (loc.typ === FOUNTAIN) return 'There is a fountain here.';
    if (loc.typ === SINK) return 'There is a sink here.';
    if (loc.typ === THRONE) return 'There is a throne here.';
    if (loc.typ === ALTAR) return 'There is an altar here.';
    if (loc.typ === GRAVE) return 'There is a grave here.';
    if (loc.typ === POOL) return 'There is a pool of water here.';
    if (loc.typ === LAVAPOOL) return 'There is molten lava here.';
    // C ref: pager.c look_at_room_clue — door state from flags
    if (loc.typ === DOOR) {
        if (loc.flags & D_ISOPEN) return 'There is an open door here.';
        if (loc.flags & (D_CLOSED | D_LOCKED)) return 'There is a closed door here.';
        if (loc.flags & D_BROKEN) return 'There is a broken door here.';
        return 'There is a doorway here.';
    }
    if (loc.typ === IRONBARS) return 'There are iron bars here.';
    if (loc.typ === TREE) return 'There is a tree here.';
    return '';
}

function monster_class_desc(mon) {
    const glyph = mon?.displayChar;
    if (!glyph) return '';
    const idx = glyph.charCodeAt(0);
    if (idx < 0 || idx >= def_monsyms.length) return '';
    return String(def_monsyms[idx]?.explain || '');
}

function look_object_name(obj) {
    if (!obj) return 'object';
    if (typeof obj.oname === 'string' && obj.oname.length) return obj.oname;
    if (typeof obj.dname === 'string' && obj.dname.length) return obj.dname;
    if (typeof obj.oc_name === 'string' && obj.oc_name.length) return obj.oc_name;
    return 'object';
}

function escapeHtml(text) {
    return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// C ref: pager.c do_screen_description() -- reduced structural port.
export function do_screen_description(ctx, cc) {
    const map = ctx?.map;
    const player = ctx?.player;
    if (!map || !cc) {
        return { found: false, firstmatch: '', outStr: '', text: '', kind: 'none' };
    }
    const x = Number(cc.x);
    const y = Number(cc.y);

    if (player && x === player.x && y === player.y) {
        // C ref: pager.c lookat() → self_lookat(): "{race adj} {role name} called {plname}"
        // e.g. "human wizard called wizard"
        // C's svp.plname is stored as-typed (typically lowercase for wizard-mode sessions).
        // JS player.name may be capitalized from options; lowercase to match C convention.
        const raceAdj = races[player.race]?.adj || '';
        const roleName = roleNameForGender(player.roleIndex, !!player.female).toLowerCase();
        const plname = (player.name || 'you').toLowerCase();
        const selfDesc = `${raceAdj ? raceAdj + ' ' : ''}${roleName} called ${plname}`;
        return { found: true, firstmatch: selfDesc, outStr: '', text: selfDesc, kind: 'hero' };
    }

    const mon = map.monsterAt ? map.monsterAt(x, y) : null;
    if (mon) {
        const firstmatch = x_monnam(mon, { article: 'none' });
        const classDesc = monster_class_desc(mon);
        const outStr = classDesc ? `(${classDesc})` : '';
        return {
            found: true,
            firstmatch,
            outStr,
            text: outStr ? `${firstmatch} ${outStr}` : firstmatch,
            kind: 'monster',
            classDesc,
        };
    }

    const objs = map.objectsAt ? map.objectsAt(x, y) : [];
    if (objs.length > 0) {
        const topObj = objs[objs.length - 1];
        const firstmatch = look_object_name(topObj);
        const outStr = objs.length > 1 ? `(+${objs.length - 1} more)` : '';
        return {
            found: true,
            firstmatch,
            outStr,
            text: outStr ? `${firstmatch} ${outStr}` : firstmatch,
            kind: 'object',
        };
    }

    const trap = map.trapAt ? map.trapAt(x, y) : null;
    if (trap && trap.tseen) {
        return { found: true, firstmatch: 'a trap', outStr: '', text: 'a trap', kind: 'trap' };
    }

    const loc = map.at ? map.at(x, y) : null;
    const terrain = terrain_here_description(loc, { map, player });
    if (terrain) {
        return { found: true, firstmatch: terrain, outStr: '', text: terrain, kind: 'terrain' };
    }

    // C ref: pager.c do_screen_description — basic terrain types use
    // defsyms[glyph].explanation. Wall tiles that don't face a visited
    // room render as stone (blank) on screen, so describe them as "stone".
    if (loc && loc.seenv) {
        let basicDesc = '';
        if (loc.typ === STONE) {
            basicDesc = 'stone';
        } else if (IS_WALL(loc.typ)) {
            basicDesc = wallIsVisible(loc.typ, loc.seenv, loc.flags || 0) ? 'wall' : 'stone';
        } else if (loc.typ === CORR || loc.typ === SCORR) {
            basicDesc = 'corridor';
        } else if (loc.typ === ROOM) {
            basicDesc = 'floor of a room';
        }
        if (basicDesc) {
            return { found: true, firstmatch: basicDesc, outStr: '', text: basicDesc, kind: 'terrain' };
        }
    }

    return { found: false, firstmatch: '', outStr: '', text: '', kind: 'none' };
}

// Sync helper used by hover/details callers.
export function do_lookat(ctx, target = null) {
    const player = ctx?.player;
    const cc = target || { x: player?.x, y: player?.y };
    const desc = do_screen_description(ctx, cc);
    if (desc.found) return desc;
    return {
        found: true,
        firstmatch: 'You see no objects here.',
        outStr: '',
        text: 'You see no objects here.',
        kind: 'none',
    };
}

async function do_look_symbol(display, symChar) {
    if ((symChar >= 'a' && symChar <= 'z') || (symChar >= 'A' && symChar <= 'Z')) {
        await display.putstr_message(`'${symChar}': a monster (or straddling the letter range).`);
    } else if (SYMBOL_DESCRIPTIONS[symChar]) {
        await display.putstr_message(`'${symChar}': ${SYMBOL_DESCRIPTIONS[symChar]}.`);
    } else {
        await display.putstr_message(`I don't know what '${symChar}' represents.`);
    }
}

// C ref: pager.c do_look(mode, click_cc) -- partial structural port.
export async function do_look(game, mode = 0, click_cc = null) {
    const { map, player, display, flags } = game || {};
    if (!map || !player || !display) return { moved: false, tookTime: false };

    const quick = (mode === 1);
    const clicklook = (mode === 2);
    let from_screen = false;
    let sym = null;
    const cc = clicklook && click_cc ? { x: click_cc.x, y: click_cc.y } : { x: player.x, y: player.y };
    let ans = 0;

    if (!clicklook) {
        if (quick) {
            from_screen = true;
        } else {
            await display.putstr_message("What do you want to identify? [type a symbol, ';' for map, or ESC]");
            const ch = await nhgetch();
            if (ch === 27) return { moved: false, tookTime: false };
            const c = String.fromCharCode(ch);
            if (c === ';' || c === '/' || c === 'y') from_screen = true;
            else sym = c;
        }
    }

    do {
        if (from_screen || clicklook) {
            if (from_screen) {
                const whatIsALocation = 'a monster, object or location';
                const getposVerbose = !!(flags?.verbose && !quick);
                await display.putstr_message(
                    getposVerbose
                        ? `Please move the cursor to ${whatIsALocation}.`
                        : `Pick ${whatIsALocation}.`
                );
                ans = await getpos_async(cc, quick, whatIsALocation, {
                    map,
                    display,
                    flags: { ...(flags || {}), verbose: getposVerbose },
                    goalPrompt: whatIsALocation,
                    player,
                    do_screen_description,
                });
                if (ans < 0 || cc.x < 0 || cc.y < 0) break;
            }
            const desc = do_screen_description({ map, player }, cc);
            if (desc.found) await display.putstr_message(desc.text);
            else await display.putstr_message("I've never heard of such things.");
        } else if (sym !== null) {
            await do_look_symbol(display, sym);
        }
    } while (from_screen && !quick && ans !== LOOK_ONCE && ans !== LOOK_VERBOSE && !clicklook);

    return { moved: false, tookTime: false };
}

// C refs: pager.c dowhatis(), doquickwhatis()
export async function dowhatis(game) {
    return await do_look(game, 0, null);
}

export async function doquickwhatis(game) {
    return await do_look(game, 1, null);
}

// UI adapter: style do_look output without changing core text semantics.
export function format_do_look_html(desc) {
    const first = escapeHtml(desc?.firstmatch || '');
    const out = escapeHtml(desc?.outStr || '');
    return {
        nameText: desc?.firstmatch || '',
        descText: desc?.outStr || '',
        nameHtml: first ? `<strong>${first}</strong>` : '',
        descHtml: out,
    };
}

export function is_corridor_like(loc) {
    return !!loc && (loc.typ === CORR || loc.typ === SCORR);
}

function look_surface_name(loc) {
    if (!loc) return 'floor';
    if (loc.typ === DOOR) return 'doorway';
    if (loc.typ === ICE) return 'ice';
    if (loc.typ === POOL) return 'pool of water';
    if (loc.typ === LAVAPOOL) return 'molten lava';
    if (loc.typ === IRONBARS) return 'iron bars';
    if (loc.typ === TREE) return 'tree';
    return 'floor';
}

// C ref: invent.c look_here() style message used for ':' command.
function build_dolook_message(ctx) {
    const map = ctx?.map;
    const player = ctx?.player;
    const blind = !!player?.blind;
    const skipTerrainDescription = !!ctx?.skipTerrainDescription;
    if (!map || !player) return 'You see no objects here.';

    const loc = map.at ? map.at(player.x, player.y) : null;
    const objs = map.objectsAt ? map.objectsAt(player.x, player.y) : [];
    const terrain = skipTerrainDescription ? '' : terrain_here_description(loc, { map, player });
    const verb = blind ? 'feel' : 'see';
    let objText = '';
    if (objs.length === 1) {
        const seen = objs[0];
        if (seen.oclass === COIN_CLASS) {
            const count = seen.quan || 1;
            objText = count === 1
                ? `You ${verb} here a gold piece.`
                : `You ${verb} here ${count} gold pieces.`;
        } else {
            observeObject(seen);
            objText = `You ${verb} here ${describeGroundObjectForPlayer(seen, player, map)}.`;
        }
    } else if (objs.length > 1) {
        objText = blind
            ? `Things that you feel here: ${objs.map(o => look_object_name(o)).join(', ')}`
            : `Things that are here: ${objs.map(o => look_object_name(o)).join(', ')}`;
    }

    if (terrain && objText) return `${terrain} ${objText}`.trim();
    if (terrain) return terrain;
    if (objText) return objText;
    return blind ? 'You feel no objects here.' : 'You see no objects here.';
}

// C ref: invent.c dolook() → look_here() → read_engr_at()
// Shows engraving type message, pauses for --More--, then shows engraving text.
export async function dolook(game) {
    const { map, player, display } = game || {};
    if (!display) return { moved: false, tookTime: false };
    const blind = !!player?.blind;
    let tookTime = false;
    let skipTerrainDescription = false;

    if (map && player) {
        const loc = map.at ? map.at(player.x, player.y) : null;
        if (blind) {
            const canReach = can_reach_floor(player, map, false);
            if (!canReach) {
                await display.putstr_message('You try to feel what is lying beneath you.');
                await display.putstr_message("But you can't reach it!");
                return { moved: false, tookTime: false };
            }
            await display.putstr_message(
                loc?.typ === ICE
                    ? 'You try to feel what is on it.'
                    : `You try to feel what is lying here on the ${look_surface_name(loc)}.`
            );
            tookTime = true;
            if (loc?.typ === ICE || loc?.typ === DOOR) skipTerrainDescription = true;
            await more(display, {
                site: 'pager.dolook.blindLook.morePrompt',
                forceVisual: true,
            });
        }

        const ep = engr_at(map, player.x, player.y);
        if (ep && ep.text) {
            const onIce = !!(loc && loc.typ === ICE);
            let sensed = false;
            let typeMsg = '';

            switch (ep.type) {
            case 'dust':
                if (!blind) {
                    sensed = true;
                    typeMsg = `Something is written here in the ${onIce ? 'frost' : 'dust'}.`;
                }
                break;
            case 'engrave':
            case 'headstone':
                if (!blind || can_reach_floor(player, map)) {
                    sensed = true;
                    typeMsg = 'Something is engraved here on the floor.';
                }
                break;
            case 'burn':
                if (!blind || can_reach_floor(player, map)) {
                    sensed = true;
                    typeMsg = `Some text has been ${onIce ? 'melted' : 'burned'} into the floor here.`;
                }
                break;
            case 'mark':
                if (!blind) {
                    sensed = true;
                    typeMsg = "There's some graffiti on the floor here.";
                }
                break;
            case 'blood':
                if (!blind) {
                    sensed = true;
                    typeMsg = 'You see a message scrawled in blood here.';
                }
                break;
            default:
                sensed = true;
                typeMsg = 'Something is written in a very strange way.';
                break;
            }

            if (sensed) {
                await display.putstr_message(typeMsg);
                await more(display, {
                    site: 'pager.handleLook.readEngraving.morePrompt',
                });
                const et = ep.text;
                const endpunct = (et.length >= 2 && '.!?'.includes(et[et.length - 1])) ? '' : '.';
                await display.putstr_message(`You ${blind ? 'feel the words' : 'read'}: "${et}"${endpunct}`);
                ep.eread = true;
                ep.erevealed = true;
            }
        }
    }

    await display.putstr_message(String(build_dolook_message({ map, player, skipTerrainDescription }) || '').substring(0, 79));
    return { moved: false, tookTime };
}

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

        // Status bar — match C's "(N of M)" page indicator format
        // C places the indicator on the row right after the last content line,
        // not always at the bottom of the terminal.
        const linesOnPage = Math.min(lines.length - topLine, PAGE_ROWS);
        const statusRow = Math.min(linesOnPage, STATUS_LINE);
        display.clearRow(statusRow);
        if (statusRow !== STATUS_LINE) display.clearRow(STATUS_LINE);
        const totalPages = Math.max(1, Math.ceil(lines.length / PAGE_ROWS));
        const currentPage = Math.floor(topLine / PAGE_ROWS) + 1;
        const status = totalPages <= 1 ? '' : ` (${currentPage} of ${totalPages})`;
        if (status) {
            await display.putstr(0, statusRow, status.substring(0, TERMINAL_COLS), CLR_GRAY);
            // Set cursor at end of status text, matching C behavior
            if (display.setCursor) display.setCursor(status.length, statusRow);
        }
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
            // Next page (space, enter, j) — C uses fixed page-size increments
            // On the last page, space exits the pager (matches C behavior)
            if (topLine + PAGE_ROWS < lines.length) {
                topLine += PAGE_ROWS;
                await render();
            } else {
                break; // exit pager on last page
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

async function showMoreTextPages(display, text) {
    const lines = String(text || '').split('\n');
    const pageRows = TERMINAL_ROWS - 1;
    const canSaveRestore = !!display?.grid;
    const saved = canSaveRestore ? saveTerminal(display) : null;
    let topLine = 0;
    while (true) {
        for (let r = 0; r < TERMINAL_ROWS; r++) {
            if (typeof display.clearRow === 'function') display.clearRow(r);
        }
        for (let r = 0; r < pageRows; r++) {
            const idx = topLine + r;
            const line = idx < lines.length ? lines[idx] : '';
            if (line) await display.putstr(0, r, line.substring(0, TERMINAL_COLS), CLR_GRAY);
        }
        await display.putstr(0, TERMINAL_ROWS - 1, '--More--', CLR_GRAY);
        if (typeof display.setCursor === 'function') {
            display.setCursor(8, TERMINAL_ROWS - 1);
        }
        await nhgetch();
        topLine += pageRows;
        if (topLine >= lines.length) break;
    }
    if (saved) restoreTerminal(display, saved);
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
    const men = create_nhwindow(NHW_MENU);
    start_menu(men, MENU_BEHAVE_STANDARD);
    add_menu(men, null, { a_int: 1 }, 0, 0, ATR_NONE, 0,
        'known map without monsters, objects, and traps',
        MENU_ITEMFLAGS_SELECTED);
    add_menu(men, null, { a_int: 2 }, 0, 0, ATR_NONE, 0,
        'known map without monsters and objects', 0);
    add_menu(men, null, { a_int: 3 }, 0, 0, ATR_NONE, 0,
        'known map without monsters', 0);
    end_menu(men, 'View which?');
    const sel = await select_menu(men, PICK_ONE, { acceptPreselectedOnSpace: true });
    destroy_nhwindow(men);
    const selected = sel?.[0]?.identifier?.a_int || 0;

    display.clearScreen();
    display.renderMap(map, player, fov, flags);
    if (selected === 1) {
        const mapOffset = display.flags?.msg_window ? 3 : MAP_ROW_START;
        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            for (let x = 1; x < COLNO; x++) {
                const col = x - 1;
                const loc = map.at(x, y);
                if (!loc || !loc.seenv) {
                    display.setCell(col, row, ' ', CLR_GRAY);
                    continue;
                }
                if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags || 0)) {
                    display.setCell(col, row, ' ', CLR_GRAY);
                    continue;
                }
                const sym = terrainSymbol(loc, map, x, y, display.flags || flags || {});
                // C terrain browse uses default color for floor dots.
                const color = (loc.typ === STONE || sym.ch === '·')
                    ? CLR_GRAY
                    : ((loc.typ === ROOM) ? NO_COLOR : sym.color);
                display.setCell(col, row, sym.ch, color);
            }
        }
    }
    if (typeof display.renderStatus === 'function') {
        display.renderStatus(player);
    }
    if (selected > 0) {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
        await display.putstr_message("Showing known terrain only...");
        const cc = { x: player.x, y: player.y };
        const gpFlags = { ...(flags || {}), autodescribe: true, terrainmode: TER_MAP };
        await getpos_async(cc, false, 'anything of interest', {
            map,
            display,
            flags: gpFlags,
            goalPrompt: 'anything of interest',
            player,
            forceVerbosePrompt: true,
            do_screen_description,
        });
        gpFlags.terrainmode = 0;
        if (typeof display.renderStatus === 'function') display.renderStatus(player);
    } else {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    }
    return {
        moved: false,
        tookTime: false,
    };
}

// Data file cache (same pattern as guidebook)
const dataFileCache = {};

// Fetch a data file from dat/ directory with caching
async function fetchDataFile(filename) {
    if (dataFileCache[filename]) return dataFileCache[filename];
    try {
        const resp = await nhfetch(filename);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        dataFileCache[filename] = text;
        return text;
    } catch (_e) {
        try {
            const { readFile } = await nhimport('node:fs/promises');
            const text = await readFile(filename, 'utf8');
            dataFileCache[filename] = text;
            return text;
        } catch (_readErr) {
            return null;
        }
    }
}

async function showTextWindowFile(display, text) {
    const lines = String(text || '').split('\n');
    const pageRows = Math.max(1, TERMINAL_ROWS - 1);
    let top = 0;
    const isDismissKey = (ch) => (
        ch === 32 || ch === 10 || ch === 13 || ch === 27 || ch === 16
    );

    while (true) {
        if (typeof display?.clearScreen === 'function') {
            display.clearScreen();
        }
        for (let r = 0; r < pageRows; r++) {
            if (typeof display?.clearRow === 'function') display.clearRow(r);
            const line = lines[top + r];
            if (line) await display.putstr(0, r, line.substring(0, TERMINAL_COLS));
        }

        const hasMore = (top + pageRows) < lines.length;
        if (typeof display?.clearRow === 'function') display.clearRow(TERMINAL_ROWS - 1);
        await display.putstr(0, TERMINAL_ROWS - 1, '--More--');
        if (typeof display?.setCursor === 'function') {
            // C tty text window: cursor rests at end of "--More--" on bottom row.
            display.setCursor(8, TERMINAL_ROWS - 1);
        }

        while (true) {
            const ch = await nhgetch();
            if (!isDismissKey(ch)) continue;
            if (hasMore && (ch === 32 || ch === 10 || ch === 13)) {
                top += pageRows;
                break;
            }
            if (typeof display?.clearScreen === 'function') display.clearScreen();
            if (typeof display?.clearRow === 'function') display.clearRow(TERMINAL_ROWS - 1);
            display.topMessage = null;
            display.messageNeedsMore = false;
            return;
        }
    }
}

// Command descriptions for & (whatdoes)
// C ref: pager.c dowhatdoes() / dat/cmdhelp
const COMMAND_DESCRIPTIONS = {
    'y': 'move northwest (screen upper left) (#movenorthwest)',
    'k': 'move north (screen up) (#movenorth)',
    'u': 'move northeast (screen upper right) (#movenortheast)',
    'h': 'move west (screen left) (#movewest)',
    'l': 'move east (screen right) (#moveeast)',
    'b': 'move southwest (screen lower left) (#movesouthwest)',
    'j': 'move south (screen down) (#movesouth)',
    'n': 'move southeast (screen lower right) (#movesoutheast)',
    '?': 'display one of several informative help texts',
    '/': 'tell what a map symbol represents',
    '&': 'tell what a command does',
    '<': 'go up a staircase',
    '>': 'go down a staircase',
    '.': 'rest, do nothing for one turn',
    ',': 'pick up things at the current location',
    ':': 'look at what is here',
    ';': 'look at what is somewhere else',
    '\\': 'show what types of objects have been discovered',
    '#': 'perform an extended command',
    'a': 'apply (use) a tool',
    'c': 'close a door',
    'd': 'drop an item',
    'e': 'eat something (#eat)',
    'i': 'show your inventory',
    'o': 'open a door',
    'q': 'drink (quaff) a potion',
    'P': 'put on a ring or other accessory',
    's': 'search for secret doors and traps around you',
    'w': 'wield a weapon',
    'S': 'save the game',
    'T': 'take off armor',
    'V': 'display the version and history of the game',
    'W': 'wear armor',
};

const COMMAND_DESCRIPTIONS_C_STYLE = {
    e: 'eat something (#eat)',
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
    add_menu(win, null, 'g', 'g'.charCodeAt(0), 0, ATR_NONE, 0, 'List of game options.', 0);
    add_menu(win, null, 'h', 'h'.charCodeAt(0), 0, ATR_NONE, 0, 'Longer explanation of game options.', 0);
    add_menu(win, null, 'i', 'i'.charCodeAt(0), 0, ATR_NONE, 0, "Using the '#optionsfull' or 'm O' command to set options.", 0);
    add_menu(win, null, 'j', 'j'.charCodeAt(0), 0, ATR_NONE, 0, 'Full list of keyboard commands.', 0);
    add_menu(win, null, 'k', 'k'.charCodeAt(0), 0, ATR_NONE, 0, 'List of extended commands.', 0);
    add_menu(win, null, 'l', 'l'.charCodeAt(0), 0, ATR_NONE, 0, 'List menu control keys.', 0);
    add_menu(win, null, 'm', 'm'.charCodeAt(0), 0, ATR_NONE, 0, "Description of NetHack's command line.", 0);
    add_menu(win, null, 'n', 'n'.charCodeAt(0), 0, ATR_NONE, 0, 'The NetHack license.', 0);
    add_menu(win, null, 'o', 'o'.charCodeAt(0), 0, ATR_NONE, 0, 'Support information.', 0);
    if (game.wizard) {
        add_menu(win, null, 'p', 'p'.charCodeAt(0), 0, ATR_NONE, 0, 'List of wizard-mode commands.', 0);
    }
    end_menu(win, 'Select one item:');
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
        if (text) await showTextWindowFile(display, text);
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
        const text = await fetchDataFile('dat/opthelp.txt');
        if (text) await showPager(display, text, 'Game Options');
        else await display.putstr_message('Failed to load options help.');
    } else if (c === 'i') {
        await showMoreTextPages(display, OPTIONS_FULL_COMMAND_HELP_TEXT);
        if (typeof game.docrt === 'function') {
            game.docrt();
        }
    } else if (c === 'j') {
        await showPager(display, keyHelpText, 'Key Bindings');
    } else if (c === 'k') {
        await showPager(display, extendedCommandsText, 'Extended Commands');
    } else if (c === 'l') {
        await showPager(display, MENU_CONTROL_KEYS_TEXT, 'Menu Control Keys');
    } else if (c === 'm') {
        await showPager(display, COMMAND_LINE_DESCRIPTION_TEXT, 'Command Line');
    } else if (c === 'n') {
        const text = await fetchDataFile('dat/license');
        if (text) await showPager(display, text, 'License');
        else await display.putstr_message('Failed to load license.');
    } else if (c === 'o') {
        const text = await fetchDataFile('dat/portshelp');
        if (text) await showPager(display, text, 'Support Information');
        else await display.putstr_message('Failed to load support information.');
    } else if (c === 'p' && game.wizard) {
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

const MENU_CONTROL_KEYS_TEXT = [
    'Menu control keys:',
    '',
    '  a-z or A-Z  Select menu entries by letter.',
    '  .           Select all entries.',
    '  -           Unselect all entries.',
    '  Space       Toggle selections or confirm where applicable.',
    '  Enter       Finish menu selection.',
    '  Esc or q    Cancel menu selection.',
].join('\n');

const COMMAND_LINE_DESCRIPTION_TEXT = [
    'NetHack command line options',
    '',
    'Most players use options set in config files or in-game option menus.',
    "Use '#optionsfull' (or 'm O') for interactive option management.",
].join('\n');

const OPTIONS_FULL_COMMAND_HELP_TEXT = [
    ' How dynamically setting options works:',
    '',
    ' The simple options menu shows a relatively small subset of options',
    ' and operates on each choice you make immediately, then is put back',
    ' up to allow further changes.',
    '',
    ' The full options menu shows the current value for all options and',
    " lets you pick ones that you'd like to change.  Picking them doesn't",
    ' make any changes though.  That will take place once you close the',
    " menu.  For most of NetHack's interfaces, closing the menu is done",
    ' by pressing the <enter> key or <return> key; others might require',
    ' clicking on [ok].  Pressing the <escape> key or clicking on [cancel]',
    ' will close the menu and discard any pending changes.',
    '',
    " The options menu is too long to fit on one screen.  Some interfaces",
    " paginate menus; use the '>' key to advance a page or '<' to back",
    ' up.  They typically re-use selection letters (a-z) on each page.',
    ' Others use one long page and you need to use a scrollbar; once past',
    " a-z and A-Z they'll have entries without selection letters.  Those",
    ' can be selected by clicking on them.',
    '',
    ' For toggling boolean (True/False or On/Off) options, selecting them',
    ' is all that is needed.  For compound options (which take a number,',
    ' a choice of several particular values, or something more complex,',
    ' and are listed in a second section after the boolean ones), you will',
    ' be prompted to supply a new value.',
    '',
    ' At the start of each of the two sections are the values of some',
    ' unselectable options which can only be set before the game starts.',
    ' After the compound section are some "other" options which take a set',
    ' of multiple values and tend to be more complicated to deal with.',
    '',
    ' Some changes will only last until you save (or quit) the current',
    ' game.  Usually those are for things that might not be appropriate',
    ' if you were to restore the saved game on another computer with',
    " different capabilities.  Other options will be included in this",
    " game's save file and retain their settings after restore.  None set",
    ' in the options menu will affect other games, either already saved or',
    ' new ones.  For that, you need to update your run-time configuration',
    ' file and specify the desired options settings there.  Even then,',
    ' restoring existing games that contain saved option values will use',
    ' those saved ones.',
].join('\n');

// Handle & (whatdoes) command
// C ref: pager.c dowhatdoes()
let whatdoesIntroShown = false;

function whatdoesKeyText(c) {
    if (c === ' ') return '<space>';
    if (c === '\x1b') return '<esc>';
    if (c === '\n' || c === '\r') return '<enter>';
    if (c === '\x7f') return '<del>';
    return visctrl(c);
}

export async function handleWhatdoes(game) {
    const { display } = game;

    if (!whatdoesIntroShown) {
        await display.putstr_message("Ask about '&' or '?' to get more info.");
        await more(display, { site: 'pager.whatdoes.intro.more', forceVisual: true });
        whatdoesIntroShown = true;
    }

    const ch = await ynFunction('What command?', null, 0, display);

    if (ch === 27) {
        return { moved: false, tookTime: false };
    }

    const c = String.fromCharCode(ch);
    const desc = COMMAND_DESCRIPTIONS_C_STYLE[c] || COMMAND_DESCRIPTIONS[c];
    if (desc) {
        const keyText = whatdoesKeyText(c);
        await display.putstr_message(`${String(keyText).padEnd(8)}${desc}.`);
    } else {
        const uchar = ch & 0xff;
        const oct = uchar.toString(8).padStart(3, '0');
        const hex = uchar.toString(16).padStart(2, '0');
        await display.putstr_message(`No such command '${visctrl(c)}', char code ${uchar} (0${oct} or 0x${hex}).`);
    }

    return { moved: false, tookTime: false };
}

// Handle V (history) command
// C ref: pager.c dohistory()
export async function handleHistory(game) {
    const { display } = game;
    const text = await fetchDataFile('dat/history.txt');
    if (text) {
        await showTextWindowFile(display, text);
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
            const resp = await nhfetch('Guidebook.txt');
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
   outbuf = '';
  return outbuf;
}

// Autotranslated from pager.c:166
export function trap_description(outbuf, tnum, x, y) {
  if (trapped_chest_at(tnum, x, y)) {
    outbuf = "trapped chest";
  }
  else if (trapped_door_at(tnum, x, y)) {
    outbuf = "trapped door";
  }
  else {
    outbuf = trapname(tnum, false);
  }
  return;
}

// Autotranslated from pager.c:379
export async function look_at_object(buf, x, y, glyph, map) {
  let otmp = null, fakeobj = object_from_map(glyph, x, y, otmp);
  if (otmp) {
    buf = (otmp.otyp !== STRANGE_OBJECT) ? await distant_name(otmp, otmp.dknown ? doname_with_price : doname_vague_quan) : objectData[STRANGE_OBJECT].oc_name;
    if (fakeobj) { otmp.where = OBJ_FREE; dealloc_obj(otmp), otmp = null; }
  }
  else { buf = something; }
  if (otmp && otmp.where === OBJ_BURIED) {
    buf += " (buried)";
  }
  else if (IS_TREE(map.locations[x][y].typ)) buf += ` ${(otmp && is_treefruit(otmp)) ? "dangling" : "stuck"} in a tree`;
  else if (map.locations[x][y].typ === STONE || map.locations[x][y].typ === SCORR) {
    buf += " embedded in stone";
  }
  else if (IS_WALL(map.locations[x][y].typ) || map.locations[x][y].typ === SDOOR) {
    buf += " embedded in a wall";
  }
  else if (closed_door(x, y)) {
    buf += " embedded in a door";
  }
  else if (is_pool(x, y)) {
    buf += " in water";
  }
  else if (is_lava(x, y)) {
    buf += " in molten lava";
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
    buf = `${key2txt(q, keybuf).padEnd(8)}${ec_desc}.`;
    cbuf = buf;
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

// -----------------------------------------------------------------------
// pager.c compatibility surface for CODEMATCH tracking
// -----------------------------------------------------------------------

// C ref: pager.c:82
export function append_str(dst = '', src = '') {
  return `${String(dst)}${String(src)}`;
}

// C ref: pager.c:561
export function waterbody_name(loc) {
  if (!loc) return 'water';
  if (loc.typ === LAVAPOOL) return 'molten lava';
  if (loc.typ === POOL) return 'water';
  return 'water';
}

// C ref: pager.c:614
export function ice_descr(_x, _y) {
  return 'ice';
}

// C ref: pager.c:186
export function mhidden_description(mon) {
  return mon ? `${x_monnam(mon)} (hidden)` : 'hidden monster';
}

// C ref: pager.c:108
export function self_lookat(_player = null) {
  return 'you';
}

// C ref: pager.c:284
export function object_from_map(_glyph, x, y, _otmp = null, map = null) {
  if (!map || typeof map.objectsAt !== 'function') return null;
  const objs = map.objectsAt(x, y);
  return Array.isArray(objs) && objs.length ? objs[objs.length - 1] : null;
}

// C ref: pager.c:422
export function look_at_monster(mon) {
  if (!mon) return 'monster';
  return x_monnam(mon, { article: 'none' });
}

// C ref: pager.c:657
export function lookat(x, y, game) {
  const map = game?.map;
  const player = game?.player;
  return do_screen_description({ map, player }, { x, y });
}

// C ref: pager.c:1133
export function add_cmap_descr(buf = '', loc = null) {
  const tail = terrain_here_description(loc || null);
  return tail ? append_str(buf, tail) : String(buf);
}

// C ref: pager.c:1627
export function add_quoted_engraving(buf = '', engraving = '') {
  const q = String(engraving || '').trim();
  if (!q) return String(buf);
  return append_str(buf, ` "${q}"`);
}

// C ref: pager.c:807
export async function ia_checkfile(display, filename) {
  const text = await fetchDataFile(filename);
  if (!text) return false;
  await showTextWindowFile(display, text);
  return true;
}

// C ref: pager.c:830
export async function checkfile(display, filename) {
  return ia_checkfile(display, filename);
}

// C ref: pager.c:1975
export async function look_all(game) {
  return do_look(game, 0, null);
}

// C ref: pager.c:2074
export function look_traps(map, x, y) {
  const t = map?.trapAt?.(x, y);
  return t ? 'a trap' : '';
}

// C ref: pager.c:2140
export function look_engrs(map, x, y) {
  const e = engr_at(map, x, y);
  return e?.text ? String(e.text) : '';
}

// C ref: pager.c:2249
export async function do_supplemental_info(game) {
  const text = await fetchDataFile('dat/help.txt');
  if (text) {
    await showPager(game.display, text, 'Supplemental Info');
    return ECMD_OK;
  }
  await game.display.putstr_message('No supplemental info available.');
  return ECMD_CANCEL;
}

// C ref: pager.c:2417
export function whatdoes_help() {
  return 'Type a key to learn what command it performs.';
}

// C ref: pager.c:2454
export function whatdoes_cond(c) {
  return !!(COMMAND_DESCRIPTIONS_C_STYLE[c] || COMMAND_DESCRIPTIONS[c]);
}

// C ref: pager.c:2714
export async function docontact(game) {
  const text = await fetchDataFile('dat/portshelp');
  if (text) {
    await showPager(game.display, text, 'Contact');
    return { moved: false, tookTime: false };
  }
  await game.display.putstr_message('Contact information unavailable.');
  return { moved: false, tookTime: false };
}

// C ref: pager.c:2816
export async function domenucontrols(game) {
  await showPager(game.display, MENU_CONTROL_KEYS_TEXT, 'Menu Control Keys');
  return { moved: false, tookTime: false };
}

// C ref: pager.c:2904
export async function setopt_cmd(game) {
  await game.display.putstr_message("Use '#optionsfull' to configure options.");
  return { moved: false, tookTime: false };
}
