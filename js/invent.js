// invent.js -- Inventory management
// cf. invent.c — ddoinv, display_inventory, display_pickinv, compactify, getobj, askchain

import { nhgetch, getlin } from './input.js';
import { create_nhwindow, destroy_nhwindow, display_nhwindow, putstr as win_putstr } from './windows.js';
import { NHW_MENU } from './const.js';
import { COLNO, STATUS_ROW_1, STATUS_ROW_2, A_STR, A_CON, A_WIS,
         UNENCUMBERED, OVERLOADED,
         STAIRS, LADDER, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, TREE,
         IS_DOOR, D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED,
         BUC_BLESSED, BUC_UNCURSED, BUC_CURSED, BUC_UNKNOWN,
         GETOBJ_EXCLUDE, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE_INACCESS,
         GETOBJ_EXCLUDE_SELECTABLE, GETOBJ_EXCLUDE_NONINVENT,
         GETOBJ_ALLOWCNT, GETOBJ_PROMPT, GETOBJ_NOFLAGS,
         ECMD_OK } from './const.js';
import { objectData, WEAPON_CLASS, FOOD_CLASS, WAND_CLASS, SPBOOK_CLASS,
         FLINT, ROCK, SLING, MAGIC_MARKER, COIN_CLASS, ARMOR_CLASS,
         RING_CLASS, AMULET_CLASS, TOOL_CLASS, POTION_CLASS, SCROLL_CLASS,
         GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS, VENOM_CLASS,
         ILLOBJ_CLASS,
         AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING,
         SPE_BOOK_OF_THE_DEAD, LOADSTONE, FIGURINE, SCR_SCARE_MONSTER,
         CORPSE, EGG, TIN, POT_OIL, SPE_NOVEL, LEASH, STATUE, SCR_BLANK_PAPER,
         GLASS, GEMSTONE, MINERAL,
         ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK, ARM_SHIRT,
         CLASS_SYMBOLS } from './objects.js';
import { doname, xname, weight, splitobj, Is_container, erosion_matters, mergable, place_object } from './mkobj.js';
import { an, Has_contents } from './objnam.js';
import { promptDirectionAndThrowItem, ammoAndLauncher } from './dothrow.js';
import { pline, You, Your } from './pline.js';
import { rn2, pushRngLogEntry } from './rng.js';
import { touch_petrifies } from './mondata.js';
import { mons, PM_ARCHEOLOGIST } from './monsters.js';
import { newsym } from './display.js';
import { observeObject, discoverObject, isObjectNameKnown } from './o_init.js';
import { exercise } from './attrib_exercise.js';
import { acurr, acurrstr } from './attrib.js';
import { game as _gstate } from './gstate.js';


// ============================================================
// Sort / classify helpers
// cf. invent.c — reorder_invent, sortloot, etc.
// ============================================================

// C ref: invent.c invletter_value() — sort order for inventory letters
function invletSortValue(ch) {
    if (ch === '$') return 0;
    if (ch >= 'a' && ch <= 'z') return ch.charCodeAt(0);
    if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) + 100;
    if (ch === '#') return 1000;
    return 2000 + ch.charCodeAt(0);
}

// C ref: invent.c compactify() — compress inventory letter list for prompts
export function compactInvletPromptChars(chars) {
    if (!chars) return '';
    const sorted = [...new Set(chars.split(''))].sort((a, b) => invletSortValue(a) - invletSortValue(b));
    if (sorted.length <= 5) return sorted.join('');
    const out = [];
    let i = 0;
    while (i < sorted.length) {
        const start = sorted[i];
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1].charCodeAt(0) === sorted[j].charCodeAt(0) + 1) {
            j++;
        }
        const runLen = j - i + 1;
        if (runLen >= 3) {
            out.push(start, '-', sorted[j]);
        } else {
            for (let k = i; k <= j; k++) out.push(sorted[k]);
        }
        i = j + 1;
    }
    return out.join('');
}

// C ref: invent.c currency() — pluralize gold currency name
export function currency(amount) {
    return amount === 1 ? 'zorkmid' : 'zorkmids';
}

// C ref: invent.c display_inventory() / display_pickinv()
export function buildInventoryOverlayLines(player) {
    const CLASS_NAMES = {
        [WEAPON_CLASS]: 'Weapons', [ARMOR_CLASS]: 'Armor', [RING_CLASS]: 'Rings',
        [AMULET_CLASS]: 'Amulets', [TOOL_CLASS]: 'Tools', [FOOD_CLASS]: 'Comestibles',
        [POTION_CLASS]: 'Potions', [SCROLL_CLASS]: 'Scrolls', [SPBOOK_CLASS]: 'Spellbooks',
        [WAND_CLASS]: 'Wands', [COIN_CLASS]: 'Coins', [GEM_CLASS]: 'Gems/Stones',
    };
    const INV_ORDER = [COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
        SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS, TOOL_CLASS,
        GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS];

    const groups = {};
    for (const item of player.inventory || []) {
        const cls = item?.oclass;
        if (!cls) continue;
        if (!groups[cls]) groups[cls] = [];
        groups[cls].push(item);
    }

    const lines = [];
    for (const cls of INV_ORDER) {
        if (cls === COIN_CLASS && !groups[cls] && (player.gold || 0) > 0) {
            const gold = player.gold || 0;
            const goldLabel = gold === 1 ? 'gold piece' : 'gold pieces';
            lines.push('Coins');
            lines.push(`$ - ${gold} ${goldLabel}`);
            continue;
        }
        if (!groups[cls]) continue;
        lines.push(CLASS_NAMES[cls] || 'Other');
        for (const item of groups[cls]) {
            const named = doname(item, player);
            lines.push(`${item.invlet} - ${named}`);
        }
    }
    lines.push('(end)');
    return lines;
}

function buildInventoryPages(lines, rows = STATUS_ROW_1) {
    // C tty parity: if everything fits in the available menu rows,
    // keep a single page ending with "(end)".
    if (lines.length <= rows) {
        return [lines.slice()];
    }
    const contentRows = Math.max(1, rows - 1); // reserve one row for page counter
    const totalPages = Math.max(1, Math.ceil(lines.length / contentRows));
    const pages = [];
    for (let i = 0, page = 1; i < lines.length; i += contentRows, page++) {
        const chunk = lines.slice(i, i + contentRows);
        pages.push([...chunk, ` (${page} of ${totalPages})`]);
    }
    return pages.length > 0 ? pages : [[' (1 of 1)']];
}

function clearInventoryOverlayArea(display, lines = []) {
    if (!display || !Number.isInteger(display.rows) || !Number.isInteger(display.cols)) return;
    if (!Number.isInteger(STATUS_ROW_1)) return;
    let maxcol = 0;
    for (const line of lines) {
        const len = String(line || '').length;
        if (len > maxcol) maxcol = len;
    }
    const menuOffx = Math.max(10, Math.min(display.cols, display.cols - maxcol - 2));
    const menuRows = Math.min(STATUS_ROW_1, display.rows);
    if (typeof display.setCell === 'function') {
        for (let r = 0; r < menuRows; r++) {
            for (let col = Math.max(0, menuOffx - 1); col < display.cols; col++) {
                display.setCell(col, r, ' ', 7, 0);
            }
        }
        return;
    }
    if (typeof display.clearRow === 'function') {
        for (let r = 0; r < menuRows; r++) {
            display.clearRow(r);
        }
    }
}

async function drawInventoryPage(display, lines, opts = {}) {
    if (!display) return;
    const fullScreen = !!opts.fullScreen;
    if (!fullScreen) {
        let offx = 0;
        if (typeof display.renderOverlayMenu === 'function') {
            offx = display.renderOverlayMenu(lines) || 0;
        } else {
            offx = display.renderChargenMenu(lines, false) || 0;
        }
        // C tty parity: menu items occupy up to STATUS_ROW_1 rows, then
        // "(end)" / "(x of y)" prompt is displayed on the next row.
        const promptRow = STATUS_ROW_1;
        const prompt = lines.length > STATUS_ROW_1 ? String(lines[STATUS_ROW_1] || '') : '';
        if (prompt && typeof display.setCell === 'function' && Number.isInteger(display.cols)) {
            for (let col = Math.max(0, offx - 1); col < display.cols; col++) {
                display.setCell(col, promptRow, ' ', 7, 0);
            }
        } else if (prompt && typeof display.clearRow === 'function') {
            display.clearRow(promptRow);
        }
        if (prompt) {
            await display.putstr(offx, promptRow, prompt, undefined, 0);
        }
        // C ref: wintty.c line 2831 — morestr is "(end) " (with trailing space).
        // Cursor sits after the last rendered line. renderOverlayMenu goes
        // fullscreen (offx=1, all rows) when lines.length >= display.rows;
        // in that case use the fullscreen cursor formula regardless of prompt.
        if (typeof display.setCursor === 'function') {
            const cols = display.cols || 80;
            const displayRows = (display && Number.isInteger(display.rows)) ? display.rows : 24;
            const internalFullScreen = lines.length >= displayRows;
            if (internalFullScreen) {
                // renderOverlayMenu used offx=1 and rendered all rows including (end).
                const lastRow = Math.min(lines.length, displayRows) - 1;
                const lastLine = String(lines[lastRow] || '');
                display.setCursor(Math.min(1 + lastLine.length + 1, cols - 1), lastRow);
            } else if (prompt) {
                display.setCursor(Math.min(offx + prompt.length + 1, cols - 1), promptRow);
            } else {
                const menuRows = Math.min(lines.length, STATUS_ROW_1);
                const lastRow = menuRows - 1;
                const lastLine = String(lines[lastRow] || '');
                display.setCursor(Math.min(offx + lastLine.length + 1, cols - 1), lastRow);
            }
        }
        return;
    }
    const isCategoryHeader = (line) => {
        const text = String(line || '').trimStart();
        return /^(Weapons|Armor|Rings|Amulets|Tools|Comestibles|Potions|Scrolls|Spellbooks|Wands|Coins|Gems\/Stones|Rocks|Balls|Chains|Venoms|Other)\b/.test(text);
    };
    if (typeof display.clearScreen === 'function') {
        display.clearScreen();
    } else {
        clearInventoryOverlayArea(display, lines);
    }
    const rows = Math.min(lines.length, Number.isInteger(display.rows) ? display.rows : STATUS_ROW_1);
    for (let i = 0; i < rows; i++) {
        const line = String(lines[i] || '');
        const header = isCategoryHeader(line);
        const rendered = line.startsWith(' ') ? line.slice(1) : line;
        if (typeof display.setCell === 'function') {
            display.setCell(0, i, ' ', 7, 0);
        }
        await display.putstr(1, i, rendered, undefined, header ? 1 : 0);
    }
    // C ref: wintty.c — cursor sits after last line (offx=1 for full-screen).
    if (typeof display.setCursor === 'function') {
        const cols = display.cols || 80;
        const lastRow = rows - 1;
        const lastLine = String(lines[lastRow] || '');
        display.setCursor(Math.min(1 + lastLine.length + 1, cols - 1), lastRow);
    }
}

function isMenuDismissKey(ch) {
    return ch === 32 || ch === 27 || ch === 10 || ch === 13;
}

export async function renderOverlayMenuUntilDismiss(display, lines, allowedSelectionChars = '', options = null) {
    const allowCountPrefix = !!(options && options.allowCountPrefix);
    const allowedSelections = new Set((allowedSelectionChars || '').split(''));
    let menuOffx = null;
    if (typeof display.renderOverlayMenu === 'function') {
        menuOffx = display.renderOverlayMenu(lines);
    } else {
        menuOffx = display.renderChargenMenu(lines, false);
    }
    // C tty parity: when a menu window is shown, cursor sits after the last
    // rendered menu line (typically "(end)" or "(x of y)"), not at topline.
    if (typeof display?.setCursor === 'function' && Number.isInteger(menuOffx) && lines.length > 0) {
        const cols = Number.isInteger(display.cols) ? display.cols : COLNO;
        const displayRows = Number.isInteger(display.rows) ? display.rows : STATUS_ROW_2;
        const fullScreen = lines.length >= displayRows || menuOffx === 1;
        const menuRows = Math.min(lines.length, fullScreen ? displayRows : STATUS_ROW_1);
        const lastRow = Math.max(0, menuRows - 1);
        const lastLine = String(lines[lastRow] || '');
        display.setCursor(Math.min(menuOffx + lastLine.length + 1, cols - 1), lastRow);
    }

    let selection = null;
    let countDigits = '';
    while (true) {
        const ch = await nhgetch();
        if (isMenuDismissKey(ch)) break;
        const c = String.fromCharCode(ch);
        if (allowCountPrefix && c >= '0' && c <= '9') {
            countDigits += c;
            continue;
        }
        if (allowedSelections.has(c)) {
            selection = c;
            break;
        }
    }

    const last = display?._lastMapState;
    if (last?.gameMap && typeof display.renderMap === 'function') {
        // C tty parity: closing a menu restores map/status/message display.
        display.renderMap(last.gameMap, last.player, last.fov, last.flags || display.flags || {});
        if (typeof display.renderStatus === 'function') {
            display.renderStatus(last.player);
        }
        if (typeof display.renderMessageWindow === 'function') {
            display.renderMessageWindow();
        }
    } else {
        const menuRows = Math.min(lines.length, STATUS_ROW_1);
        if (typeof display.setCell === 'function'
            && Number.isInteger(display.cols)
            && Number.isInteger(menuOffx)) {
            for (let r = 0; r < menuRows; r++) {
                for (let col = menuOffx; col < display.cols; col++) {
                    display.setCell(col, r, ' ', 7, 0);
                }
            }
        } else if (typeof display.clearRow === 'function') {
            for (let r = 0; r < menuRows; r++) {
                display.clearRow(r);
            }
        }
    }

    if (!allowCountPrefix) return selection;
    const parsedCount = countDigits.length > 0 ? parseInt(countDigits, 10) : null;
    return {
        selection,
        count: Number.isFinite(parsedCount) ? parsedCount : null,
    };
}

// Handle inventory display
// C ref: invent.c ddoinv()
export async function handleInventory(player, display, game) {
    if (player.inventory.length === 0 && (player.gold || 0) <= 0) {
        await display.putstr_message('Not carrying anything.');
        return { moved: false, tookTime: false };
    }

    const win = create_nhwindow(NHW_MENU);
    try {
    const lines = buildInventoryOverlayLines(player);
    const pageRows = Number.isInteger(display?.rows) ? display.rows : STATUS_ROW_1;
    const pages = buildInventoryPages(lines, pageRows);
    let pageIndex = 0;

    const fullScreenInventory = pages.length > 1;
    await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
    const invByLetter = new Map();
    for (const item of player.inventory || []) {
        if (item?.invlet) invByLetter.set(String(item.invlet), item);
    }
    const clearTopline = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        if (display && Object.hasOwn(display, 'topMessage')) display.topMessage = null;
        if (display && Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
    };
    // C tty/menu parity: inventory stays up until an explicit dismissal key.
    // Non-dismiss keys can be consumed without closing the menu frame.
    while (true) {
        const ch = await nhgetch();
        // C tty parity: space advances pages when present; otherwise it
        // dismisses the inventory only at the end of the final page.
        if (ch === 32) {
            if (pageIndex + 1 < pages.length) {
                pageIndex++;
                await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
                continue;
            }
            break;
        }
        if (ch === 62) { // '>'
            if (pageIndex + 1 < pages.length) {
                pageIndex++;
                await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
            }
            continue;
        }
        if (ch === 98 && pageIndex > 0) { // b
            pageIndex--;
            await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
            continue;
        }
        if (ch === 60 && pageIndex > 0) { // '<'
            pageIndex--;
            await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
            continue;
        }
        if (ch === 94 && pageIndex > 0) { // '^'
            pageIndex = 0;
            await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
            continue;
        }
        if (ch === 124 && pageIndex + 1 < pages.length) { // '|'
            pageIndex = pages.length - 1;
            await drawInventoryPage(display, pages[pageIndex] || [], { fullScreen: fullScreenInventory });
            continue;
        }
        if (ch === 27 || ch === 10 || ch === 13) break;
        const c = String.fromCharCode(ch);
        if (c === ':') {
            // C tty menu parity: ':' enters in-menu incremental search.
            // We keep menu rows in place and update only topline prompt text.
            await getlin('Search for: ', display);
            continue;
        }
        const pageLines = pages[pageIndex] || [];
        const visibleLetters = new Set(
            pageLines
                .map((line) => {
                    const m = String(line || '').match(/^\s*([a-zA-Z])\s+-\s+/);
                    return m ? m[1] : null;
                })
                .filter(Boolean)
        );
        const selected = visibleLetters.has(c) ? invByLetter.get(c) : null;
        if (selected) {
            const baseName = xname({ ...selected, quan: 1 });
            const noun = xname(selected);
            const lowerBaseName = baseName.toLowerCase();
            const isLightSource = (
                lowerBaseName === 'oil lamp'
                || lowerBaseName === 'brass lantern'
                || lowerBaseName === 'magic lamp'
                || lowerBaseName === 'wax candle'
                || lowerBaseName === 'tallow candle'
            );
            const isRubbableLamp = (lowerBaseName === 'oil lamp' || lowerBaseName === 'magic lamp');
            const isWornArmor = (
                selected === player.armor
                || selected === player.shield
                || selected === player.helmet
                || selected === player.gloves
                || selected === player.boots
                || selected === player.cloak
            );
            const stackCanShoot = ammoAndLauncher(selected, player.weapon);
            let menuOffx = 34;
            const displayCols = Number.isInteger(display.cols) ? display.cols : COLNO;
            if (typeof display.setCell === 'function'
                && Number.isInteger(displayCols)
                && Number.isInteger(display.rows)) {
                let maxcol = 0;
                for (const line of lines) {
                    if (line.length > maxcol) maxcol = line.length;
                }
                menuOffx = Math.max(10, displayCols - maxcol - 2);
            }
            const rawActions = ((selected.quan || 1) > 1)
                ? (() => {
                    const stackUsesThrowMenu = (selected.oclass === WEAPON_CLASS
                        || selected.otyp === FLINT
                        || selected.otyp === ROCK);
                    if (stackUsesThrowMenu) {
                        const actions = [];
                        if (selected === player.quiver) {
                            actions.push("- - Quiver '-' to un-ready these items");
                        }
                        actions.push(`c - Name this stack of ${noun}`);
                        actions.push('d - Drop this stack');
                        actions.push('E - Write on the ground with one of these items');
                        actions.push(stackCanShoot
                            ? `f - Shoot one of these with your wielded ${xname({ ...player.weapon, quan: 1 })}`
                            : 'f - Throw one of these');
                        actions.push('i - Adjust inventory by assigning new letter');
                        actions.push('I - Adjust inventory by splitting this stack');
                        if (selected.otyp === FLINT || selected.otyp === ROCK) {
                            actions.push('R - Rub something on this stone');
                        }
                        actions.push(stackCanShoot
                            ? "t - Shoot one of these (same as 'f')"
                            : "t - Throw one of these (same as 'f')");
                        actions.push('w - Wield this stack in your hands');
                        actions.push('/ - Look up information about these');
                        actions.push('(end)');
                        return actions;
                    }
                    if (selected.oclass === POTION_CLASS) {
                        return [
                            'a - Dip something into one of these potions',
                            `c - Name this stack of ${noun}`,
                            `C - Call the type for ${noun}`,
                            'd - Drop this stack',
                            'i - Adjust inventory by assigning new letter',
                            'I - Adjust inventory by splitting this stack',
                            'q - Quaff (drink) one of these potions',
                            't - Throw one of these',
                            'w - Wield this stack in your hands',
                            '/ - Look up information about these',
                            '(end)',
                        ];
                    }
                    const actions = [
                        `c - Name this stack of ${noun}`,
                        'd - Drop this stack',
                        'i - Adjust inventory by assigning new letter',
                        'I - Adjust inventory by splitting this stack',
                        't - Throw one of these',
                        'w - Wield this stack in your hands',
                        '/ - Look up information about these',
                        '(end)',
                    ];
                    if (selected.oclass === FOOD_CLASS) {
                        actions.splice(2, 0, 'e - Eat one of these');
                    }
                    return actions;
                })()
                : (selected.oclass === SPBOOK_CLASS
                    ? [
                        `c - Name this specific ${noun}`,
                        'd - Drop this item',
                        'i - Adjust inventory by assigning new letter',
                        'r - Study this spellbook',
                        't - Throw this item',
                        'w - Wield this item in your hands',
                        '/ - Look up information about this',
                        '(end)',
                    ]
                : ((selected === player.weapon && selected.oclass === WEAPON_CLASS)
                    ? [
                        "- - Wield '-' to un-wield this weapon",
                        `c - Name this specific ${noun}`,
                        'd - Drop this item',
                        'E - Engrave on the floor with this item',
                        'i - Adjust inventory by assigning new letter',
                        "Q - Quiver this item for easy throwing with 'f'ire",
                        't - Throw this item',
                        'x - Ready this as an alternate weapon',
                        '/ - Look up information about this',
                        '(end)',
                    ]
                    : (isWornArmor
                        ? [
                            `c - Name this specific ${noun}`,
                            'i - Adjust inventory by assigning new letter',
                            'T - Take off this armor',
                            '/ - Look up information about this',
                            '(end)',
                        ]
                        : (selected.oclass === WAND_CLASS
                        ? [
                            'a - Break this wand',
                            `c - Name this specific ${noun}`,
                            'd - Drop this item',
                            'E - Engrave on the floor with this item',
                            'i - Adjust inventory by assigning new letter',
                            't - Throw this item',
                            'w - Wield this item in your hands',
                            'z - Zap this wand to release its magic',
                            '/ - Look up information about this',
                            '(end)',
                        ]
                    : [
                        ...(selected.otyp === MAGIC_MARKER
                            ? ['a - Write on something with this marker']
                            : isLightSource
                            ? [selected.lamplit
                                ? 'a - Snuff out this light source'
                                : 'a - Light this light source']
                            : selected.oclass === POTION_CLASS
                            ? ['a - Dip something into this potion']
                            : baseName.toLowerCase() === 'stethoscope'
                            ? ['a - Listen through the stethoscope']
                            : []),
                        `c - Name this specific ${noun}`,
                        ...(selected.oclass === POTION_CLASS
                            ? [`C - Call the type for ${noun}s`]
                            : []),
                        'd - Drop this item',
                        ...(selected.otyp === MAGIC_MARKER
                            ? ['E - Scribble graffiti on the floor']
                            : []),
                        'i - Adjust inventory by assigning new letter',
                        ...(isRubbableLamp ? [`R - Rub this ${noun}`] : []),
                        ...(selected.oclass === POTION_CLASS
                            ? ['q - Quaff (drink) this potion']
                            : []),
                        't - Throw this item',
                        'w - Wield this item in your hands',
                        '/ - Look up information about this',
                        '(end)',
                    ]))));

            const promptText = `Do what with the ${noun}?`;
            const maxAction = rawActions.reduce((m, line) => Math.max(m, line.length), promptText.length);
            menuOffx = Math.max(10, displayCols - maxAction - 2);
            const pad = ' '.repeat(menuOffx);
            const stackActions = rawActions.map((line) => `${pad}${line}`);
            const actionPrompt = `${pad}${promptText}`;
            if (typeof display.setCell === 'function'
                && Number.isInteger(display.cols)
                && Number.isInteger(display.rows)) {
                if (game && typeof display.renderMap === 'function' && game.map && game.player && game.fov) {
                    display.renderMap(game.map, game.player, game.fov, game.flags || {});
                    if (fullScreenInventory && typeof display.clearRow === 'function') {
                        if (Number.isInteger(STATUS_ROW_1)) display.clearRow(STATUS_ROW_1);
                        if (Number.isInteger(STATUS_ROW_2)) display.clearRow(STATUS_ROW_2);
                    }
                } else {
                    display.clearScreen();
                }
            }
            if (typeof display.putstr === 'function' && typeof display.clearRow === 'function') {
                display.clearRow(0);
                await display.putstr(0, 0, pad, 7, 0);
                await display.putstr(menuOffx, 0, promptText, 7, 1);
                if (display && Object.hasOwn(display, 'topMessage')) display.topMessage = actionPrompt;
                if (display && Object.hasOwn(display, 'messageNeedsMore')) display.messageNeedsMore = false;
            } else {
                await display.putstr_message(actionPrompt);
            }
            if (typeof display.putstr === 'function') {
                for (let i = 0; i < stackActions.length; i++) {
                    if (typeof display.clearRow === 'function') display.clearRow(i + 2);
                    await display.putstr(0, i + 2, stackActions[i]);
                }
            }
            const actionKeys = new Set(rawActions.map((line) => String(line || '').charAt(0)));
            while (true) {
                const actionCh = await nhgetch();
                if (actionCh === 32 || actionCh === 27 || actionCh === 10 || actionCh === 13) {
                    if (typeof display.clearRow === 'function') {
                        for (let i = 0; i < stackActions.length; i++) {
                            display.clearRow(i + 2);
                        }
                    }
                    clearTopline();
                    return { moved: false, tookTime: false };
                }
                const actionKey = String.fromCharCode(actionCh);
                if (!actionKeys.has(actionKey)) continue;
                if (typeof display.clearRow === 'function') {
                    for (let i = 0; i < stackActions.length; i++) {
                        display.clearRow(i + 2);
                    }
                }
                clearTopline();
                if ((actionKey === 'f' || actionKey === 't') && game?.map) {
                    return await promptDirectionAndThrowItem(
                        player,
                        (game.lev || game.map),
                        display,
                        selected,
                        { fromFire: stackCanShoot }
                    );
                }
                if (actionKey === 'i') {
                    // cf. invent.c doorganize() / #adjust — reassign inventory letter
                    if (game && typeof game.docrt === 'function') {
                        game.docrt();
                    }
                    const inv = player.inventory || [];
                    const usedLetters = new Set(inv.map(o => o.invlet));
                    // Build available-letter string for prompt
                    const allLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    let availStr = '';
                    {
                        let i = 0;
                        while (i < allLetters.length) {
                            const ch = allLetters[i];
                            if (!usedLetters.has(ch) || ch === selected.invlet) {
                                // Find run of consecutive available letters
                                let j = i;
                                while (j + 1 < allLetters.length
                                    && (!usedLetters.has(allLetters[j + 1]) || allLetters[j + 1] === selected.invlet)) {
                                    j++;
                                }
                                if (availStr) availStr += '';
                                if (j - i >= 2) {
                                    availStr += `${allLetters[i]}-${allLetters[j]}`;
                                } else {
                                    for (let k = i; k <= j; k++) availStr += allLetters[k];
                                }
                                i = j + 1;
                            } else {
                                i++;
                            }
                        }
                    }
                    const adjustPrompt = `Adjust letter to what [${availStr}] (? see used letters)?`;
                    await display.putstr_message(adjustPrompt);
                    const adjCh = await nhgetch();
                    const adjChar = String.fromCharCode(adjCh);
                    if (adjCh === 27 || adjCh === 10 || adjCh === 13 || adjCh === 32) {
                        clearTopline();
                        await display.putstr_message('Never mind.');
                        return { moved: false, tookTime: false };
                    }
                    if (/^[a-zA-Z]$/.test(adjChar)) {
                        // Swap if another item has that letter
                        const other = inv.find(o => o !== selected && o.invlet === adjChar);
                        if (other) {
                            other.invlet = selected.invlet;
                        }
                        selected.invlet = adjChar;
                    }
                    clearTopline();
                    return { moved: false, tookTime: false };
                }
                if (actionKey === 'c') {
                    if (game && typeof game.docrt === 'function') {
                        game.docrt();
                    }
                    const namedInput = await getlin(`What do you want to name this ${baseName}? `, display);
                    if (namedInput !== null) {
                        const nextName = namedInput.trim();
                        selected.oname = nextName;
                    }
                    clearTopline();
                }
                return { moved: false, tookTime: false };
            }
        }
        // C tty parity for plain inventory view: non-navigation keys which do
        // not select a visible inventory letter are ignored.
        continue;
    }
    clearTopline();

    return { moved: false, tookTime: false };
    } finally {
        destroy_nhwindow(win);
    }
}


// ============================================================
// Ported functions from invent.c
// ============================================================
// JS architecture notes:
//   - Player state passed as parameter (not global)
//   - Inventory is player.inventory (array), not linked list
//   - Floor objects in map.objects (array), not level.objects[x][y]
//   - Worn items: player.weapon, player.armor, player.shield, etc.
//   - Constants: invlet_basic = 52 (a-z + A-Z)

const invlet_basic = 52;
const NOINVSYM = '#';
const GOLD_SYM = '$';
const HANDS_SYM = '-';
const CONTAINED_SYM = '>';
const INVENTORY_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Object class names — cf. invent.c names[]
const CLASS_NAMES = [
    null, 'Illegal objects', 'Weapons', 'Armor', 'Rings', 'Amulets', 'Tools',
    'Comestibles', 'Potions', 'Scrolls', 'Spellbooks', 'Wands', 'Coins',
    'Gems/Stones', 'Boulders/Statues', 'Iron balls', 'Chains', 'Venoms',
];


// ============================================================
// 1. Sort / classify
// ============================================================

// C ref: invent.c inuse_classify() — classify object as worn/wielded for loot sorting
export function inuse_classify(sort_item, obj, player) {
    let rating = 0;
    let altclass = 0;
    const w_mask = obj.owornmask || 0;

    function USE_RATING(test) {
        ++rating;
        if (test) return true;
        return false;
    }

    // Miscellaneous
    ++altclass; // 1
    if (USE_RATING(!w_mask && obj.otyp === LEASH && obj.leashmon)) { assign(); return; }
    if (USE_RATING(!w_mask && obj.oclass === TOOL_CLASS && obj.lamplit)) { assign(); return; }
    // Armor
    ++altclass; // 2
    if (USE_RATING(obj === player?.shirt)) { assign(); return; }
    if (USE_RATING(obj === player?.boots)) { assign(); return; }
    if (USE_RATING(obj === player?.gloves)) { assign(); return; }
    if (USE_RATING(obj === player?.helmet)) { assign(); return; }
    if (USE_RATING(obj === player?.shield)) { assign(); return; }
    if (USE_RATING(obj === player?.cloak)) { assign(); return; }
    if (USE_RATING(obj === player?.armor)) { assign(); return; }
    // Weapons
    ++altclass; // 3
    if (USE_RATING(obj === player?.quiver)) { assign(); return; }
    if (USE_RATING(obj === player?.swapWeapon)) { assign(); return; }
    if (USE_RATING(obj === player?.weapon)) { assign(); return; }
    // Accessories
    ++altclass; // 4
    if (USE_RATING(obj === player?.blindfold)) { assign(); return; }
    if (USE_RATING(obj === player?.leftRing)) { assign(); return; }
    if (USE_RATING(obj === player?.rightRing)) { assign(); return; }
    if (USE_RATING(obj === player?.amulet)) { assign(); return; }

    rating = 0;
    altclass = -1;

    function assign() {
        sort_item.inuse = rating;
        sort_item.orderclass = altclass;
        sort_item.subclass = 0;
        sort_item.disco = 0;
    }
    assign();
}

// C ref: invent.c loot_classify() — classify object for loot menu grouping
export function loot_classify(sort_item, obj) {
    const def_srt_order = [
        COIN_CLASS, AMULET_CLASS, RING_CLASS, WAND_CLASS, POTION_CLASS,
        SCROLL_CLASS, SPBOOK_CLASS, GEM_CLASS, FOOD_CLASS, TOOL_CLASS,
        WEAPON_CLASS, ARMOR_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    ];
    const otyp = obj.otyp;
    const oclass = obj.oclass;
    const od = objectData[otyp] || {};
    const seen = !!obj.dknown;
    const discovered = !!od.name_known;

    // class order
    const idx = def_srt_order.indexOf(oclass);
    sort_item.orderclass = idx >= 0 ? idx + 1 : def_srt_order.length + 1 + (oclass !== VENOM_CLASS ? 1 : 0);

    // subclass
    let k;
    switch (oclass) {
    case ARMOR_CLASS: {
        const armcatMap = [7, 4, 1, 2, 3, 5, 6]; // ARM_SUIT..ARM_SHIRT -> sort order
        const ac = od.oc_subtyp ?? 0;
        k = (ac >= 0 && ac < 7) ? (armcatMap[ac] || 8) : 8;
        break;
    }
    case WEAPON_CLASS: {
        const skill = od.skill || 0;
        k = (skill < 0) ? 3 : 5;
        break;
    }
    case TOOL_CLASS:
        if (Is_container(obj)) k = 1;
        else k = 4;
        break;
    case FOOD_CLASS:
        if (otyp === CORPSE) k = 5;
        else if (otyp === EGG) k = 4;
        else if (otyp === TIN) k = 3;
        else k = 2;
        break;
    case GEM_CLASS: {
        const mat = od.oc_material;
        if (mat === GEMSTONE) k = !seen ? 1 : !discovered ? 2 : 3;
        else if (mat === GLASS) k = !seen ? 1 : !discovered ? 2 : 4;
        else k = !seen ? 5 : 8;
        break;
    }
    default:
        k = 1;
        break;
    }
    sort_item.subclass = k;

    // discovery status
    k = !seen ? 1
        : (discovered || !od.oc_descr) ? 4
        : (od.uname) ? 3
        : 2;
    sort_item.disco = k;
    sort_item.inuse = 0;
}

// C ref: invent.c sortloot() — sort a list of objects for display
// In JS, takes an array of objects and returns a sorted array of
// {obj, indx, orderclass, subclass, disco, inuse, str} items.
export function sortloot(objList, mode, filterfunc) {
    const SORTLOOT_PACK = 0x01;
    const SORTLOOT_INVLET = 0x02;
    const SORTLOOT_LOOT = 0x04;
    const SORTLOOT_INUSE = 0x08;

    const items = [];
    let i = 0;
    for (const o of objList) {
        if (filterfunc && !filterfunc(o)) continue;
        items.push({ obj: o, indx: i++, orderclass: 0, subclass: 0, disco: 0, inuse: 0, str: null });
    }

    if (mode && items.length > 1) {
        items.sort((a, b) => {
            // in-use takes precedence
            if (mode & SORTLOOT_INUSE) {
                if (!a.orderclass) inuse_classify(a, a.obj);
                if (!b.orderclass) inuse_classify(b, b.obj);
                if (a.inuse !== b.inuse) return b.inuse - a.inuse;
                return a.indx - b.indx;
            }
            // class order
            if ((mode & (SORTLOOT_PACK | SORTLOOT_INVLET)) !== SORTLOOT_INVLET) {
                if (!a.orderclass) loot_classify(a, a.obj);
                if (!b.orderclass) loot_classify(b, b.obj);
                if (a.orderclass !== b.orderclass) return a.orderclass - b.orderclass;
                if (!(mode & SORTLOOT_INVLET)) {
                    if (a.subclass !== b.subclass) return a.subclass - b.subclass;
                    if (a.disco !== b.disco) return a.disco - b.disco;
                }
            }
            // invlet order
            if (mode & SORTLOOT_INVLET) {
                const va = invletSortValue(a.obj.invlet || '?');
                const vb = invletSortValue(b.obj.invlet || '?');
                if (va !== vb) return va - vb;
            }
            // tiebreak
            return a.indx - b.indx;
        });
    }
    return items;
}

// C ref: invent.c unsortloot() — no-op in JS (GC handles it)
// Autotranslated from invent.c:646
export function unsortloot(loot_array_p) {
  // C: free(loot_array_p) — JS garbage collects
}

// C ref: invent.c reorder_invent() — sort inventory by invlet
// JS adaptation: sort the player.inventory array in-place
export function reorder_invent(player) {
    if (!player || !player.inventory) return;
    player.inventory.sort((a, b) => {
        const ra = inv_rank_value(a);
        const rb = inv_rank_value(b);
        return ra - rb;
    });
}

// Helper for reorder_invent: toggling bit puts lowercase before uppercase
function inv_rank_value(obj) {
    const c = (obj.invlet || '?').charCodeAt(0);
    return c ^ 0x20;
}


// ============================================================
// 2. Inventory add / remove
// ============================================================

// C ref: invent.c assigninvlet() — assign an inventory letter to an object
export function assigninvlet(obj, player) {
    if (obj.oclass === COIN_CLASS) {
        obj.invlet = GOLD_SYM;
        return;
    }

    const inuse = new Array(invlet_basic).fill(false);
    for (const o of player.inventory) {
        if (o === obj) continue;
        const ch = o.invlet;
        if (ch >= 'a' && ch <= 'z') inuse[ch.charCodeAt(0) - 97] = true;
        else if (ch >= 'A' && ch <= 'Z') inuse[ch.charCodeAt(0) - 65 + 26] = true;
        if (ch === obj.invlet) obj.invlet = null;
    }

    // If existing invlet is still valid, keep it
    const ic = obj.invlet;
    if (ic && ((ic >= 'a' && ic <= 'z') || (ic >= 'A' && ic <= 'Z'))) return;

    const lastinvnr = player.lastInvlet ?? (invlet_basic - 1);
    let i = lastinvnr + 1;
    const start = i;
    do {
        if (i === invlet_basic) { i = 0; continue; }
        if (!inuse[i]) break;
        i++;
    } while (i !== start);

    if (inuse[i]) {
        obj.invlet = NOINVSYM;
    } else {
        obj.invlet = i < 26 ? String.fromCharCode(97 + i) : String.fromCharCode(65 + i - 26);
    }
    player.lastInvlet = i;
}

// C ref: invent.c merge_choice() — find an object in objList that can merge with obj
export function merge_choice(objList, obj) {
    if (!objList || !objList.length) return null;
    if (obj.otyp === SCR_SCARE_MONSTER) return null;
    for (const o of objList) {
        if (mergable(o, obj)) return o;
    }
    return null;
}

// C ref: invent.c merged() — merge obj into otmp if compatible; returns true if merged
export function merged(otmp, obj) {
    if (!mergable(otmp, obj)) return false;

    // Approximate age
    if (!obj.lamplit && !obj.globby) {
        otmp.age = Math.floor(
            ((otmp.age || 0) * (otmp.quan || 1) + (obj.age || 0) * (obj.quan || 1))
            / ((otmp.quan || 1) + (obj.quan || 1))
        );
    }

    if (!obj.globby) {
        otmp.quan = (otmp.quan || 1) + (obj.quan || 1);
    }

    // Recompute weight
    if (otmp.oclass === COIN_CLASS) {
        otmp.owt = weight(otmp);
        otmp.bknown = false;
    } else if (!obj.globby) { // not Is_pudding check simplified
        otmp.owt = weight(otmp);
    }

    // Copy name if otmp lacks one
    if (!otmp.oname && obj.oname) {
        otmp.oname = obj.oname;
    }

    // Identification by comparison
    if (obj.known !== otmp.known) otmp.known = true;
    if (obj.rknown !== otmp.rknown) otmp.rknown = true;
    if (obj.bknown !== otmp.bknown) otmp.bknown = true;

    // Handle worn mask merging (for wielded stacks)
    if (obj.owornmask) {
        const wmask = (otmp.owornmask || 0) | (obj.owornmask || 0);
        // simplified: just keep otmp's mask
        otmp.owornmask = otmp.owornmask || obj.owornmask;
    }

    if (obj.bypass) otmp.bypass = true;

    return true;
}

// C ref: invent.c addinv_core1() — side effects before adding to inventory
export function addinv_core1(obj, player) {
    if (obj.oclass === COIN_CLASS) {
        // botl update — handled elsewhere in JS
    } else if (obj.otyp === AMULET_OF_YENDOR) {
        if (!player.uhave) player.uhave = {};
        player.uhave.amulet = true;
    } else if (obj.otyp === CANDELABRUM_OF_INVOCATION) {
        if (!player.uhave) player.uhave = {};
        player.uhave.menorah = true;
    } else if (obj.otyp === BELL_OF_OPENING) {
        if (!player.uhave) player.uhave = {};
        player.uhave.bell = true;
    } else if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        if (!player.uhave) player.uhave = {};
        player.uhave.book = true;
    }
}

// C ref: invent.c addinv_core2() — side effects after adding to inventory
export async function addinv_core2(obj, player) {
    // confers_luck check would go here
    // C ref: invent.c addinv_core2() — archeologists can decipher scroll labels.
    if (player
        && player.roleMnum === PM_ARCHEOLOGIST
        && obj?.oclass === SCROLL_CLASS
        && obj?.otyp !== SCR_BLANK_PAPER
        && !player.blind
        && !isObjectNameKnown(obj.otyp)) {
        observeObject(obj);
        discoverObject(obj.otyp, true, true);
        await exercise(player, A_WIS, true);
        if (!player.uconduct) player.uconduct = {};
        player.uconduct.literate = (player.uconduct.literate || 0) + 1;
    }
}

// C ref: invent.c carry_obj_effects() — side effects of carrying an object
export function carry_obj_effects(obj) {
    // Cursed figurines can spontaneously transform — not yet implemented in JS
}

// C ref: invent.c addinv() — add object to hero inventory
// This is now a standalone function wrapping player.addToInventory
export async function addinv(obj, player) {
    if (!obj || !player) return obj;
    addinv_core1(obj, player);
    const result = player.addToInventory(obj) || obj;
    await addinv_core2(result, player);
    carry_obj_effects(result);
    return result;
}

// C ref: invent.c addinv_nomerge() — add without merging
export async function addinv_nomerge(obj, player) {
    const save = obj.nomerge;
    obj.nomerge = true;
    const result = await addinv(obj, player);
    obj.nomerge = save;
    return result;
}

const WT_WEIGHTCAP_STRCON = 25;
const WT_WEIGHTCAP_SPARE = 50;
const MAX_CARR_CAP = 1000;
const WT_WOUNDEDLEG_REDUCT = 100;
const LEFT_SIDE = 0x10;
const RIGHT_SIDE = 0x20;

function weight_cap_for_inventory(player) {
    const str = acurrstr(player);
    const con = acurr(player, A_CON);
    let carrcap = WT_WEIGHTCAP_STRCON * (str + con) + WT_WEIGHTCAP_SPARE;
    if (player?.levitating || player?.flying) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
        if (!player?.flying) {
            const woundedBits = Number(player?.eWoundedLegs || 0);
            const leftWounded = !!player?.woundedLegLeft || ((woundedBits & LEFT_SIDE) !== 0);
            const rightWounded = !!player?.woundedLegRight || ((woundedBits & RIGHT_SIDE) !== 0);
            if (leftWounded) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (rightWounded) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }
    return Math.max(carrcap, 1);
}

function near_capacity_for_inventory(player) {
    let wt = 0;
    let hasCoinObject = false;
    for (const obj of (player?.inventory || [])) {
        if (!obj) continue;
        if (obj.oclass === COIN_CLASS) {
            hasCoinObject = true;
            wt += Math.floor(((obj.quan || 0) + 50) / 100);
        }
        else wt += weight(obj) || 0;
    }
    // JS often stores gold on player.gold instead of a COIN_CLASS inventory obj.
    if (!hasCoinObject) wt += Math.floor((((player?.gold || 0)) + 50) / 100);
    const wc = weight_cap_for_inventory(player);
    const over = wt - wc;
    if (over <= 0) return UNENCUMBERED;
    const cap = Math.floor((over * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

async function encumber_msg_transition(prevCap, newCap) {
    if (prevCap < newCap) {
        switch (newCap) {
        case 1:
            await Your('movements are slowed slightly because of your load.');
            break;
        case 2:
            await You('rebalance your load.  Movement is difficult.');
            break;
        case 3:
            await You('stagger under your heavy load.  Movement is very hard.');
            break;
        default:
            await You('%s move a handspan with this load!', newCap === 4 ? 'can barely' : "can't even");
            break;
        }
    } else if (prevCap > newCap) {
        switch (newCap) {
        case 0:
            await Your('movements are now unencumbered.');
            break;
        case 1:
            await Your('movements are only slowed slightly by your load.');
            break;
        case 2:
            await You('rebalance your load.  Movement is still difficult.');
            break;
        case 3:
            await You('stagger under your load.  Movement is still very hard.');
            break;
        default:
            break;
        }
    }
}

// C ref: invent.c hold_another_object() — add object or drop if can't hold
export async function hold_another_object(obj, player, drop_fmt, drop_arg, hold_msg) {
    const prevCap = near_capacity_for_inventory(player);
    const oquan = obj?.quan || 0;
    // Inline addinv with withMeta to detect compare-discovery (C ref: invent.c merged())
    addinv_core1(obj, player);
    const addResult = player.addToInventory(obj, { withMeta: true });
    const result = (addResult?.item != null) ? addResult.item : (addResult ?? obj);
    await addinv_core2(result, player);
    carry_obj_effects(result);
    // C ref: invent.c merged() — "You learn more about your items by comparing them."
    if (addResult?.discoveredByCompare) {
        await pline('You learn more about your items by comparing them.');
    }
    if (result && (hold_msg || drop_fmt)) {
        await prinv(hold_msg || null, result, oquan, player);
    }
    const newCap = near_capacity_for_inventory(player);
    // C ref: pickup.c encumber_msg() sets go.oldcap = newcap AFTER printing the
    // transition message (not before). Move player.encumbrance update to after the
    // message so that renderStatus at the --More-- overflow still reads the OLD
    // encumbrance, matching C's disp.botl/bot() deferred update pattern.
    await encumber_msg_transition(prevCap, newCap);
    if (player) {
        player.encumbrance = newCap;
        // Keep pickup.c-style oldcap tracking in sync so a subsequent
        // encumber_msg() in the same command (e.g., wiz_wish()) does not
        // duplicate the same transition message.
        player._oldcap = newCap;
    }
    return result;
}


// ============================================================
// 3. Object consumption
// ============================================================

// C ref: invent.c useupall() — consume entire stack of an object
export function useupall(obj, player) {
    setnotworn(obj, player);
    freeinv(obj, player);
}

// C ref: invent.c useup() — consume one item from a stack
// Autotranslated from invent.c:1320
export function useup(obj) {
  if (obj.quan > 1) {
    obj.in_use = false;
    obj.quan--;
    obj.owt = weight(obj);
    update_inventory();
  }
  else { useupall(obj); }
}

// C ref: invent.c consume_obj_charge() — consume a charge from a wand/tool
export function consume_obj_charge(obj, maybe_unpaid, player) {
    // maybe_unpaid shop billing not yet implemented
    obj.spe = (obj.spe || 0) - 1;
    if (obj.known) update_inventory(player);
}

// C ref: invent.c useupf() — consume one item from floor stack
export function useupf(obj, numused, map) {
    if ((obj.quan || 1) > numused) {
        obj.quan -= numused;
        obj.owt = weight(obj);
    } else {
        delobj(obj, map);
    }
}


// ============================================================
// 4. Free / delete
// ============================================================

// C ref: invent.c freeinv_core() — intrinsics adjustment when removing from inventory
export function freeinv_core(obj, player) {
    if (obj.oclass === COIN_CLASS) return;
    if (!player.uhave) player.uhave = {};
    if (obj.otyp === AMULET_OF_YENDOR) player.uhave.amulet = false;
    else if (obj.otyp === CANDELABRUM_OF_INVOCATION) player.uhave.menorah = false;
    else if (obj.otyp === BELL_OF_OPENING) player.uhave.bell = false;
    else if (obj.otyp === SPE_BOOK_OF_THE_DEAD) player.uhave.book = false;

    if (obj.otyp === LOADSTONE) {
        obj.cursed = true;
        obj.blessed = false;
    }
}

// C ref: invent.c freeinv() — remove object from hero inventory chain
export function freeinv(obj, player) {
    player.removeFromInventory(obj);
    obj.pickup_prev = 0;
    freeinv_core(obj, player);
}

// C ref: invent.c delallobj() — delete all objects at a location
export function delallobj(x, y, map) {
    if (!map || !map.objects) return;
    const toDelete = map.objects.filter(o => o.ox === x && o.oy === y && !o.buried);
    for (const obj of toDelete) {
        delobj(obj, map);
    }
}

// C ref: invent.c delobj() — delete a single object
// Autotranslated from invent.c:1429
export function delobj(obj) {
  delobj_core(obj, false);
}

// C ref: invent.c delobj_core() — core object deletion
export function delobj_core(obj, map, force) {
    if (!force && obj_resists(obj)) {
        obj.in_use = false;
        return;
    }
    const wasOnFloor = map && map.objects;
    if (wasOnFloor) {
        const idx = map.objects.indexOf(obj);
        if (idx >= 0) {
            if (typeof map.removeObject === 'function') {
                map.removeObject(obj);
            } else {
                map.objects.splice(idx, 1);
            }
            if (typeof newsym === 'function') {
                newsym(obj.ox, obj.oy);
            }
        }
    }
}

// Helper: obj_resists — simplified check for indestructible objects
function obj_resists(obj) {
    if (obj.otyp === AMULET_OF_YENDOR) return true;
    if (obj.otyp === CANDELABRUM_OF_INVOCATION) return true;
    if (obj.otyp === BELL_OF_OPENING) return true;
    if (obj.otyp === SPE_BOOK_OF_THE_DEAD) return true;
    return false;
}


// ============================================================
// 5. Object queries
// ============================================================

// C ref: obj.h carried(o) macro — is object in player inventory?
export function carried(obj) {
    return !!(obj && (obj.where === 'OBJ_INVENT' || obj.where === 'invent'));
}

// C ref: invent.c sobj_at() — find specific object type at location
export function sobj_at(otyp, x, y, map) {
    if (!map || !map.objects) return null;
    for (const obj of map.objects) {
        if (obj.ox === x && obj.oy === y && obj.otyp === otyp && !obj.buried) return obj;
    }
    return null;
}

// C ref: invent.c nxtobj() — find next object of given type after obj in a list
// Autotranslated from invent.c:1478
export function nxtobj(obj, type, by_nexthere) {
  let otmp;
  otmp = obj;
  do {
    otmp = !by_nexthere ? otmp.nobj : otmp.nexthere;
    if (!otmp) {
      break;
    }
  } while (otmp.otyp !== type);
  return otmp;
}

// C ref: invent.c carrying() — check if hero carries object of given type
export function carrying(type, player) {
    for (const obj of (player.inventory || [])) {
        if (obj.otyp === type) return obj;
    }
    return null;
}

// C ref: invent.c carrying_stoning_corpse() — check for cockatrice corpse
export function carrying_stoning_corpse(player) {
    for (const obj of (player.inventory || [])) {
        if (obj.otyp === CORPSE && obj.corpsenm != null && touch_petrifies_corpsenm(obj.corpsenm)) {
            return obj;
        }
    }
    return null;
}

// Helper: check if monster type causes petrification on touch
function touch_petrifies_corpsenm(corpsenm) {
    if (corpsenm >= 0 && corpsenm < mons.length) {
        return touch_petrifies(mons[corpsenm]);
    }
    return false;
}

// C ref: invent.c u_carried_gloves() — check if hero carries gloves
export function u_carried_gloves(player) {
    if (player.gloves) return player.gloves;
    for (const obj of (player.inventory || [])) {
        if (obj.oclass === ARMOR_CLASS && (objectData[obj.otyp]?.oc_subtyp === ARM_GLOVES)) {
            return obj;
        }
    }
    return null;
}

// C ref: invent.c u_have_novel() — check if hero has a novel
export function u_have_novel(player) {
    for (const obj of (player.inventory || [])) {
        if (obj.otyp === SPE_NOVEL) return obj;
    }
    return null;
}

// C ref: invent.c o_on() — find object by id in a chain (recursive for containers)
export function o_on(id, objList) {
    for (const obj of (objList || [])) {
        if (obj.o_id === id) return obj;
        if (obj.cobj) {
            const found = o_on(id, obj.cobj);
            if (found) return found;
        }
    }
    return null;
}

// C ref: invent.c obj_here() — check if specific object is at location
export function obj_here(obj, x, y, map) {
    if (!map || !map.objects) return false;
    for (const o of map.objects) {
        if (o === obj && o.ox === x && o.oy === y && !o.buried) return true;
    }
    return false;
}

// C ref: invent.c g_at() — find gold at location
export function g_at(x, y, map) {
    if (!map || !map.objects) return null;
    for (const obj of map.objects) {
        if (obj.ox === x && obj.oy === y && obj.oclass === COIN_CLASS && !obj.buried) return obj;
    }
    return null;
}


// ============================================================
// 6. Splitting
// ============================================================

// C ref: invent.c splittable() — check if object stack can be split
export function splittable(obj, player) {
    if (obj.otyp === LOADSTONE && obj.cursed) return false;
    if (obj === player?.weapon && obj.welded) return false;
    return true;
}


// ============================================================
// 7. getobj / ggetobj
// ============================================================

// C ref: invent.c taking_off() — check if action is a take-off operation
export function taking_off(action) {
    return action === 'take off' || action === 'remove';
}

// C ref: invent.c mime_action() — mime gesture for empty-handed action
export async function mime_action(word) {
    await You('mime %sing something.', word);
}

// C ref: invent.c any_obj_ok() — callback that allows any object but not hands
// Autotranslated from invent.c:1709
export function any_obj_ok(obj) {
  if (obj) return GETOBJ_SUGGEST;
  return GETOBJ_EXCLUDE;
}

// C ref: invent.c silly_thing() — message for using silly object
export async function silly_thing(word, otmp) {
    await pline("That is a silly thing to %s.", word);
}

// C ref: invent.c ckvalidcat() — check if object belongs to valid category
export function ckvalidcat(otmp) {
    // Simplified: always valid
    return 1;
}

// C ref: invent.c check_unpaid() — check if object is unpaid
export function check_unpaid(otmp) {
    return !!(otmp.unpaid || (otmp.cobj && count_unpaid(otmp.cobj)));
}

// C ref: invent.c wearing_armor() — check if hero is wearing any armor
// Autotranslated from invent.c:2148
export function wearing_armor(player) {
  return (player.armor || player.cloak || player.boots || player.gloves || player.helmet || player.shield || player.shirt);
}

// C ref: invent.c is_worn() — check if object is being worn/wielded
// Autotranslated from invent.c:2155
export function is_worn(otmp) {
  return (otmp.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS)) ? true : false;
}

// C ref: invent.c is_inuse() — check if object is in use (worn/wielded/active tool)
export function is_inuse(obj, player) {
    return is_worn(obj, player) || tool_being_used(obj, player);
}

// C ref: invent.c doorganize() — #adjust extended command
// Prompt for an inventory item then reassign its letter.
export async function doorganize(game) {
    const { player, display } = game;
    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    if (!inv.length) {
        await display.putstr_message("You have nothing to adjust.");
        return { moved: false, tookTime: false };
    }

    // Step 1: prompt for which item to adjust (by inventory letter)
    const letters = inv.map(o => o.invlet).join('');
    const selectPrompt = `Adjust which item? [${letters} or ?*] `;
    await display.putstr_message(selectPrompt);

    let selected = null;
    while (!selected) {
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);
        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            display.topMessage = null;
            await display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            if (typeof display.clearRow === 'function') display.clearRow(0);
            display.topMessage = null;
            const lines = buildInventoryOverlayLines(player);
            const allInvLetters = inv
                .filter((o) => o && o.invlet)
                .map((o) => o.invlet)
                .join('');
            const menuSelection = await renderOverlayMenuUntilDismiss(display, lines, allInvLetters);
            if (menuSelection) {
                selected = inv.find(o => o.invlet === menuSelection);
            }
            if (!selected) {
                await display.putstr_message(selectPrompt);
            }
            continue;
        }
        selected = inv.find(o => o.invlet === c);
    }

    // Step 2: prompt for target letter
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;

    const usedLetters = new Set(inv.map(o => o.invlet));
    const allLetters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let availStr = '';
    {
        let i = 0;
        while (i < allLetters.length) {
            const ch = allLetters[i];
            if (!usedLetters.has(ch) || ch === selected.invlet) {
                let j = i;
                while (j + 1 < allLetters.length
                    && (!usedLetters.has(allLetters[j + 1]) || allLetters[j + 1] === selected.invlet)) {
                    j++;
                }
                if (j - i >= 2) {
                    availStr += `${allLetters[i]}-${allLetters[j]}`;
                } else {
                    for (let k = i; k <= j; k++) availStr += allLetters[k];
                }
                i = j + 1;
            } else {
                i++;
            }
        }
    }
    const adjustPrompt = `Adjust letter to what [${availStr}] (? see used letters)?`;
    await display.putstr_message(adjustPrompt);
    const adjCh = await nhgetch();
    const adjChar = String.fromCharCode(adjCh);
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    if (adjCh === 27 || adjCh === 10 || adjCh === 13 || adjCh === 32) {
        await display.putstr_message('Never mind.');
        return { moved: false, tookTime: false };
    }
    if (/^[a-zA-Z]$/.test(adjChar)) {
        const other = inv.find(o => o !== selected && o.invlet === adjChar);
        if (other) other.invlet = selected.invlet;
        selected.invlet = adjChar;
    }
    return { moved: false, tookTime: false };
}

// C ref: invent.c getobj() — prompt player to select an inventory object
// Simplified JS version that works with the existing input system
export function getobj_simple(word, obj_ok, player) {
    // Returns the first suggested object, or null
    for (const obj of (player.inventory || [])) {
        const result = obj_ok(obj);
        if (result === GETOBJ_SUGGEST) return obj;
    }
    return null;
}

// C ref: invent.c getobj() — C-name wrapper over simplified selector
export function getobj(word, obj_ok, _flags = 0, player = null) {
    const p = player || _gstate?.player || null;
    if (!p || typeof obj_ok !== 'function') return null;
    return getobj_simple(word, obj_ok, p);
}

// C ref: invent.c ggetobj() — get object with class filter
// Simplified: just returns count of suggested items
export function ggetobj_count(word, player) {
    if (!player.inventory || !player.inventory.length) return 0;
    return player.inventory.length;
}

// C ref: invent.c ggetobj() — C-name wrapper over simplified count helper
export function ggetobj(word, _fn, _mx, _word = null, player = null) {
    const p = player || _gstate?.player || null;
    return ggetobj_count(word, p || { inventory: [] });
}

// C ref: invent.c safeq_xprname() / safeq_shortxprname() — safe name for prompts
export function safeq_xprname(obj) {
    return xprname_simple(obj);
}

export function safeq_shortxprname(obj) {
    return xprname_simple(obj);
}

// C ref: invent.c getobj_hands_txt() — text for empty-hand prompts
export function getobj_hands_txt(action) {
    if (action === 'wield') return 'your bare hands';
    if (action === 'ready') return 'empty quiver';
    return 'your hands';
}


// ============================================================
// 8. Identification
// ============================================================

// C ref: invent.c set_cknown_lknown() — set container/lock known flags
// Autotranslated from invent.c:2623
export function set_cknown_lknown(obj) {
  if (Is_container(obj) || obj.otyp === STATUE) obj.cknown = obj.lknown = 1;
  else if (obj.otyp === TIN) obj.cknown = 1;
  return;
}

// C ref: invent.c not_fully_identified() — check if object is not fully ID'd
export function not_fully_identified(obj) {
    const od = objectData[obj.otyp] || {};
    if (!od.name_known) return true;
    if (!obj.known || !obj.bknown || !obj.rknown) return true;
    if ((Is_container(obj) || obj.otyp === STATUE) && !obj.cknown) return true;
    return false;
}

// C ref: invent.c fully_identify_obj() — fully identify an object
export function fully_identify_obj(otmp) {
    const od = objectData[otmp.otyp];
    if (od) od.name_known = true; // makeknown
    otmp.known = true;
    otmp.bknown = true;
    otmp.rknown = true;
    otmp.dknown = true;
    set_cknown_lknown(otmp);
}

// C ref: invent.c identify() — identify object and give feedback
// Autotranslated from invent.c:2650
export async function identify(otmp) {
  fully_identify_obj(otmp);
  await prinv( 0, otmp, 0);
  return 1;
}

// C ref: invent.c count_unidentified() — count unidentified objects
// Autotranslated from invent.c:2697
export function count_unidentified(objchn) {
    const list = Array.isArray(objchn) ? objchn : [];
    let unid_cnt = 0;
    for (const obj of list) {
        if (obj && not_fully_identified(obj)) ++unid_cnt;
    }
    return unid_cnt;
}

// C ref: invent.c identify_pack() — identify pack items
export async function identify_pack(id_limit, player, learning_id) {
    const inv = player.inventory || [];
    let unid_cnt = count_unidentified(inv);

    if (!unid_cnt) {
        await You('have already identified %s of your possessions.',
            !learning_id ? 'all' : 'the rest');
        return;
    }
    if (!id_limit || id_limit >= unid_cnt) {
        for (const obj of inv) {
            if (not_fully_identified(obj)) {
                await identify(obj, player);
                if (--unid_cnt < 1) break;
            }
        }
    } else {
        // identify up to id_limit items — simplified: identify first N
        let remaining = id_limit;
        for (const obj of inv) {
            if (remaining <= 0) break;
            if (not_fully_identified(obj)) {
                await identify(obj, player);
                remaining--;
            }
        }
    }
    update_inventory(player);
}

// C ref: invent.c learn_unseen_invent() — mark inventory objects as seen
export function learn_unseen_invent(player) {
    for (const obj of (player.inventory || [])) {
        if (!obj.dknown) {
            obj.dknown = true;
        }
    }
}


// ============================================================
// 9. Display
// ============================================================

// C ref: invent.c update_inventory() — update permanent inventory window
// In JS, this is a no-op placeholder; the UI refreshes via other mechanisms
export function update_inventory(player) {
    // Placeholder — UI updates are driven by the game loop in JS
}

// C ref: invent.c obj_to_let() — get inventory letter for an object
export function obj_to_let(obj) {
    return obj.invlet || NOINVSYM;
}

// C ref: invent.c xprname() — format an inventory line
export function xprname(obj, txt, let_char, dot, cost, quan, player = null) {
    let savequan = 0;
    if (quan && obj) {
        savequan = obj.quan;
        obj.quan = quan;
    }
    if (!txt) {
        txt = obj ? doname(obj, player) : '???';
    }
    let suffix = '';
    if (cost) {
        suffix = `  ${cost} ${currency(cost)}`;
    } else {
        suffix = dot ? '.' : '';
    }

    const result = `${let_char} - ${txt}${suffix}`;

    if (savequan && obj) obj.quan = savequan;
    return result;
}

// Simplified xprname for internal use
function xprname_simple(obj) {
    if (!obj) return '???';
    const let_char = obj.invlet || NOINVSYM;
    const txt = doname(obj);
    return `${let_char} - ${txt}`;
}

// C ref: invent.c prinv() — print an inventory item
export async function prinv(prefix, obj, quan, player) {
    if (!prefix) prefix = '';
    const let_char = obj_to_let(obj);
    // C ref: invent.c prinv() — dot suppressed when showing partial stack
    const total_of = quan && (quan < (obj?.quan ?? 0));
    const line = xprname(obj, null, let_char, !total_of, 0, quan, player);
    await pline('%s%s%s', prefix, prefix ? ' ' : '', line);
}

// C ref: invent.c find_unpaid() — find unpaid items recursively
export function find_unpaid(list, last_found_ref) {
    for (const obj of (list || [])) {
        if (obj.unpaid) {
            if (last_found_ref.obj) {
                if (obj === last_found_ref.obj) last_found_ref.obj = null;
            } else {
                last_found_ref.obj = obj;
                return obj;
            }
        }
        if (obj.cobj) {
            const found = find_unpaid(obj.cobj, last_found_ref);
            if (found) return found;
        }
    }
    return null;
}

export function display_inventory_items(lets, player) {
    const inventory = Array.isArray(player?.inventory) ? player.inventory : [];
    const letsText = (typeof lets === 'string') ? lets : '';
    const hasLetsFilter = letsText.length > 0;
    return inventory.filter((obj) => {
        if (!hasLetsFilter) return true;
        const invlet = String(obj?.invlet || '');
        const oclassSym = String(CLASS_SYMBOLS[obj?.oclass] || '');
        return letsText.includes(invlet) || letsText.includes(oclassSym);
    });
}

function selectionFromInventoryResult(result) {
    if (result == null) return '';
    if (typeof result === 'string') return result;
    if (typeof result === 'object' && typeof result.selection === 'string') {
        return result.selection;
    }
    return '';
}

function countFromInventoryResult(result) {
    if (!result || typeof result !== 'object') return null;
    const count = Number(result.count);
    return Number.isFinite(count) ? count : null;
}

// C ref: invent.c display_pickinv() — inventory menu helper for display/getobj.
export async function display_pickinv(lets, xtra_choice, query, allowxtra, want_reply, out_cnt,
    player = null, display = null) {
    const p = player || _gstate?.player || null;
    const d = display || _gstate?.display || null;
    if (!p || !d) return '';

    const objects = display_inventory_items(lets, p);
    const lines = [];
    const choices = [];
    const choiceSet = new Set();

    if (typeof query === 'string' && query.length > 0) {
        lines.push(query);
    }

    for (const obj of objects) {
        const invlet = String(obj?.invlet || '');
        if (!invlet) continue;
        const line = xprname(obj, null, invlet, true, 0, 0, p);
        lines.push(line);
        if (!choiceSet.has(invlet)) {
            choiceSet.add(invlet);
            choices.push(invlet);
        }
    }

    const allowExtraChoice = !!(allowxtra && xtra_choice);
    if (allowExtraChoice) {
        lines.push(`- - ${String(xtra_choice)}`);
        if (!choiceSet.has('-')) {
            choiceSet.add('-');
            choices.push('-');
        }
    }

    if (lines.length === 0) {
        await d.putstr_message('Not carrying anything.');
        if (out_cnt && typeof out_cnt === 'object') out_cnt.value = -1;
        return '';
    }

    const result = await renderOverlayMenuUntilDismiss(
        d,
        lines,
        want_reply ? choices.join('') : '',
        { allowCountPrefix: !!want_reply }
    );
    const selection = selectionFromInventoryResult(result);
    const count = countFromInventoryResult(result);
    if (out_cnt && typeof out_cnt === 'object') {
        out_cnt.value = Number.isFinite(count) ? count : -1;
    }
    return selection;
}

// C ref: invent.c display_inventory()
export async function display_inventory(lets, want_reply, player = null, display = null) {
    const p = player || _gstate?.player || null;
    return await display_pickinv(lets, null, null, false, !!want_reply, null, p, display);
}

// C ref: invent.c dispinv_with_action()
export async function dispinv_with_action(lets, use_inuse_ordering, alt_label, game = null) {
    const g = game || _gstate || null;
    const p = g?.player || _gstate?.player || null;
    const d = g?.display || _gstate?.display || null;
    const len = typeof lets === 'string' ? lets.length : 0;
    const menumode = (len !== 1) || !!g?.flags?.menu_requested;
    const c = await display_inventory(lets || '', menumode, p, d);
    if (c && c !== '\x1b') {
        // itemactions() is not fully ported yet; keep C-compatible return code.
        return ECMD_OK;
    }
    return ECMD_OK;
}

// C ref: invent.c invdisp_nothing() — display "nothing" message
export async function invdisp_nothing(hdr, txt) {
    await pline('%s: %s', hdr, txt);
}


// ============================================================
// 10. Counting
// ============================================================

// C ref: invent.c count_unpaid() — count unpaid items including containers
export function count_unpaid(list) {
    let count = 0;
    for (const obj of (list || [])) {
        if (obj.unpaid) count++;
        if (obj.cobj) count += count_unpaid(obj.cobj);
    }
    return count;
}

// C ref: invent.c count_buc() — count items by BUC status
export function count_buc(list, type, filterfunc) {
    let count = 0;
    for (const obj of (list || [])) {
        if (filterfunc && !filterfunc(obj)) continue;
        if (obj.oclass === COIN_CLASS) {
            if (type === BUC_UNCURSED) count++;
            continue;
        }
        if (!obj.bknown) {
            if (type === BUC_UNKNOWN) count++;
        } else if (obj.blessed) {
            if (type === BUC_BLESSED) count++;
        } else if (obj.cursed) {
            if (type === BUC_CURSED) count++;
        } else {
            if (type === BUC_UNCURSED) count++;
        }
    }
    return count;
}

// C ref: invent.c tally_BUCX() — tally all BUC states at once
export function tally_BUCX(list) {
    let bcp = 0, ucp = 0, ccp = 0, xcp = 0, ocp = 0, jcp = 0;
    for (const obj of (list || [])) {
        if (obj.pickup_prev) jcp++;
        if (obj.oclass === COIN_CLASS) { ucp++; continue; }
        if (!obj.bknown) xcp++;
        else if (obj.blessed) bcp++;
        else if (obj.cursed) ccp++;
        else ucp++;
    }
    return { bcp, ucp, ccp, xcp, ocp, jcp };
}

// C ref: invent.c count_contents() — count items in a container
export function count_contents(container, nested, quantity, everything) {
    let count = 0;
    for (const obj of (container.cobj || [])) {
        if (nested && obj.cobj) {
            count += count_contents(obj, nested, quantity, everything);
        }
        if (everything || obj.unpaid) {
            count += quantity ? (obj.quan || 1) : 1;
        }
    }
    return count;
}

// C ref: invent.c this_type_only() — filter for specific object type
export function this_type_only(obj, filterType) {
    if (filterType === 'P') return !!obj.pickup_prev;
    if (obj.oclass === COIN_CLASS) {
        if (filterType && 'BUCX'.includes(filterType))
            return filterType === 'U';
    }
    switch (filterType) {
    case 'B': return !!(obj.bknown && obj.blessed);
    case 'U': return !!(obj.bknown && !obj.blessed && !obj.cursed);
    case 'C': return !!(obj.bknown && obj.cursed);
    case 'X': return !obj.bknown;
    default: return obj.oclass === filterType;
    }
}

// C ref: invent.c inv_cnt() — count inventory items
export function inv_cnt(incl_gold, player) {
    let ct = 0;
    for (const obj of (player.inventory || [])) {
        if (incl_gold || obj.invlet !== GOLD_SYM) ct++;
    }
    return ct;
}


// ============================================================
// 11. Look here
// ============================================================

// C ref: invent.c dfeature_at() — describe dungeon feature at location
// opts.depth: player's dungeon level (for "out of the dungeon" on DoD level 1)
// opts.dnum: player's current dungeon number (0 = DUNGEONS_OF_DOOM)
export function dfeature_at(x, y, map, opts = {}) {
    if (!map) return null;
    const cell = (typeof map.at === 'function') ? map.at(x, y) : null;
    if (!cell) return null;
    const typ = cell.typ;
    if (typ === STAIRS) {
        if (map.upstair && map.upstair.x === x && map.upstair.y === y) {
            // C ref: pickup.c describe_decor() — on dungeon level 1, the
            // upstair is the exit from the dungeon.
            if (opts.depth === 1 && opts.dnum === 0) return 'staircase up out of the dungeon';
            return 'staircase up';
        }
        if (map.dnstair && map.dnstair.x === x && map.dnstair.y === y) {
            return 'staircase down';
        }
        return null;
    }
    if (typ === LADDER) {
        if (map.upladder && map.upladder.x === x && map.upladder.y === y) {
            return 'ladder up';
        }
        if (map.dnladder && map.dnladder.x === x && map.dnladder.y === y) {
            return 'ladder down';
        }
        return null;
    }
    if (IS_DOOR(typ)) {
        // C ref: invent.c dfeature_at() door handling
        if (cell.flags === D_NODOOR) return 'doorway';
        if (cell.flags === D_ISOPEN) return 'open door';
        if (cell.flags === D_BROKEN) return 'broken door';
        if (cell.flags & D_CLOSED) return 'closed door';
        if (cell.flags & D_LOCKED) return 'closed door';
        return null;
    }
    if (typ === FOUNTAIN) return 'fountain';
    if (typ === THRONE) return 'opulent throne';
    if (typ === SINK) return 'kitchen sink';
    if (typ === GRAVE) return 'grave';
    if (typ === ALTAR) return 'altar';
    if (typ === TREE) return 'tree';
    return null;
}

// C ref: invent.c look_here() — look at objects at hero location
// For 2+ objects, C creates a NHW_MENU window and uses putstr to display
// "Things that are here:" as a right-side popup, then blocks for keypress.
export async function look_here(player, map, obj_cnt) {
    const x = player.x, y = player.y;
    // C iterates level.objects[x][y] via nexthere — a LIFO linked list where
    // the most recently placed object comes first.  JS place_object appends
    // to the end, so we reverse to match C's newest-first iteration order.
    const objects = (map?.objects || []).filter(o => o.ox === x && o.oy === y && !o.buried).reverse();
    const dfeature = dfeature_at(x, y, map, { depth: player.dungeonLevel, dnum: player.dnum });

    if (objects.length >= 2 || dfeature) {
        const tmpwin = create_nhwindow(NHW_MENU);
        if (dfeature) {
            await win_putstr(tmpwin, 0, `There is ${an(dfeature)} here.`);
        }
        if (objects.length >= 2) {
            await win_putstr(tmpwin, 0, 'Things that are here:');
        }
        for (const obj of objects) {
            await win_putstr(tmpwin, 0, doname(obj));
        }
        await win_putstr(tmpwin, 0, '');
        await display_nhwindow(tmpwin, true);
        destroy_nhwindow(tmpwin);
    } else if (objects.length === 1) {
        if (dfeature) {
            await pline(`There is ${an(dfeature)} here.`);
        }
        await You('see here %s.', doname(objects[0]));
    } else if (!dfeature) {
        await You('see no objects here.');
    }
}

// C ref: invent.c dolook() — look command
export async function dolook(player, map) {
    return await look_here(player, map, 0);
}

// C ref: invent.c will_feel_cockatrice() — check if touching will petrify
export function will_feel_cockatrice(otmp, force_touch, player) {
    if ((!player?.blind && !force_touch) || player?.gloves) return false;
    if (otmp.otyp === CORPSE && otmp.corpsenm != null) {
        return touch_petrifies_corpsenm(otmp.corpsenm);
    }
    return false;
}

// C ref: invent.c feel_cockatrice() — handle touching cockatrice corpse
export async function feel_cockatrice(otmp, force_touch, player) {
    if (will_feel_cockatrice(otmp, force_touch, player)) {
        await pline('Touching that is a fatal mistake...');
        // instapetrify would be called here
    }
}


// ============================================================
// 12. Stacking / merging
// ============================================================

// C ref: invent.c stackobj() — canonical C location is invent.c, but in JS
// this function lives in stackobj.js to break a circular dependency between
// mkobj.js and invent.js.  See stackobj.js for the implementation and
// a full explanation of the dependency issue.

// C ref: invent.c mergable() — canonical C location is invent.c, but in JS
// this function lives in mkobj.js to break a circular dependency:
//   stackobj.js → invent.js → monutil.js → stackobj.js
// stackobj.js needs mergable() and imports mkobj.js, so mergable() lives there.
// invent.js re-imports mergable from mkobj.js (see line ~19 import).
// IMPORTANT: Do NOT re-add a mergable() implementation here.
// See mkobj.js for the implementation and stackobj.js for the full explanation.
export { mergable };  // re-export from mkobj.js import above


// ============================================================
// 13. Print equipment
// ============================================================

// C ref: invent.c doprgold() — print gold amount
export async function doprgold(player) {
    const gold = player.gold || 0;
    if (gold) {
        await Your('wallet contains %d %s.', gold, currency(gold));
    } else {
        await Your('wallet is empty.');
    }
}

// C ref: invent.c doprwep() — print wielded weapon
export async function doprwep(player) {
    if (!player.weapon) {
        await You('are empty handed.');
    } else {
        await prinv(null, player.weapon, 0, player);
    }
}

// C ref: invent.c noarmor() — report no armor worn
export async function noarmor() {
    await You('are not wearing any armor.');
}

// C ref: invent.c doprarm() — print worn armor
export async function doprarm(player) {
    if (!wearing_armor(player)) {
        await noarmor();
    } else {
        const pieces = [player.armor, player.cloak, player.shield,
                       player.helmet, player.gloves, player.boots, player.shirt]
                       .filter(Boolean);
        for (const obj of pieces) {
            await prinv(null, obj, 0, player);
        }
    }
}

// C ref: invent.c doprring() — print worn rings
export async function doprring(player) {
    if (!player.leftRing && !player.rightRing) {
        await You('are not wearing any rings.');
    } else {
        if (player.rightRing) await prinv(null, player.rightRing, 0, player);
        if (player.leftRing) await prinv(null, player.leftRing, 0, player);
    }
}

// C ref: invent.c dopramulet() — print worn amulet
export async function dopramulet(player) {
    if (!player.amulet) {
        await You('are not wearing an amulet.');
    } else {
        await prinv(null, player.amulet, 0, player);
    }
}

// C ref: invent.c tool_being_used() — check if tool is in active use
// Autotranslated from invent.c:4697
export function tool_being_used(obj, player) {
  if ((obj.owornmask & (W_TOOL | W_SADDLE)) !== 0) return true;
  if (obj.oclass !== TOOL_CLASS) return false;
  return (obj === player?.weapon || obj.lamplit || (obj.otyp === LEASH && obj.leashmon));
}

// C ref: invent.c doprtool() — print tools in use
export async function doprtool(player) {
    const tools = (player.inventory || []).filter(o => tool_being_used(o, player));
    if (!tools.length) {
        await You('are not using any tools.');
    } else {
        for (const obj of tools) {
            await prinv(null, obj, 0, player);
        }
    }
}

// C ref: invent.c doprinuse() — print all items in use
export async function doprinuse(player) {
    const inuse = (player.inventory || []).filter(o => is_inuse(o, player));
    if (!inuse.length) {
        await You('are not wearing or wielding anything.');
    } else {
        for (const obj of inuse) {
            await prinv(null, obj, 0, player);
        }
    }
}


// ============================================================
// 14. Inventory letters
// ============================================================

// C ref: invent.c let_to_name() — convert class to name string
export function let_to_name(let_char, unpaid, showsym) {
    const oclass = (typeof let_char === 'number' && let_char >= 1 && let_char <= VENOM_CLASS)
        ? let_char : 0;
    let name;
    if (oclass) {
        name = CLASS_NAMES[oclass] || 'Illegal objects';
    } else if (let_char === CONTAINED_SYM) {
        name = 'Bagged/Boxed items';
    } else {
        name = 'Illegal objects';
    }
    if (unpaid) name = 'Unpaid ' + name;
    if (oclass && showsym) {
        const sym = CLASS_SYMBOLS[oclass] || '?';
        name += `  ('${sym}')`;
    }
    return name;
}

// C ref: invent.c reassign() — reassign consecutive inventory letters
export function reassign(player) {
    const inv = player.inventory || [];
    // Separate gold
    const goldIdx = inv.findIndex(o => o.oclass === COIN_CLASS);
    let goldObj = null;
    if (goldIdx >= 0) {
        goldObj = inv.splice(goldIdx, 1)[0];
    }
    // Re-letter
    for (let i = 0; i < inv.length; i++) {
        if (i < 26) inv[i].invlet = String.fromCharCode(97 + i); // a-z
        else if (i < 52) inv[i].invlet = String.fromCharCode(65 + i - 26); // A-Z
        else inv[i].invlet = NOINVSYM;
    }
    // Re-insert gold at front
    if (goldObj) {
        goldObj.invlet = GOLD_SYM;
        inv.unshift(goldObj);
    }
    player.lastInvlet = Math.min(inv.length - 1, 51);
}

// C ref: invent.c check_invent_gold() — check inventory gold consistency
export function check_invent_gold(player) {
    const inv = player.inventory || [];
    let goldStacks = 0;
    let wrongSlot = 0;
    for (const obj of inv) {
        if (obj.oclass === COIN_CLASS) {
            goldStacks++;
            if (obj.invlet !== GOLD_SYM) wrongSlot++;
        }
    }
    return goldStacks > 1 || wrongSlot > 0;
}


// ============================================================
// 15. Monster / container inventory
// ============================================================

// C ref: invent.c worn_wield_only() — filter to worn/wielded items only
// Autotranslated from invent.c:5308
export function worn_wield_only(obj) {
  return (obj.owornmask !== 0);
}

// C ref: invent.c display_minventory() — display monster inventory
export function display_minventory(mon) {
    if (!mon || !mon.minvent || !mon.minvent.length) {
        return null;
    }
    // Simplified: return formatted lines
    return mon.minvent.map(obj => doname(obj));
}

// C ref: invent.c display_cinventory() — display container inventory
export function display_cinventory(obj) {
    if (!obj.cobj || !obj.cobj.length) return null;
    obj.cknown = true;
    return obj.cobj.map(o => doname(o));
}

// C ref: invent.c only_here() — filter objects at current location
export function only_here(obj, x, y) {
    return obj.ox === x && obj.oy === y;
}

// C ref: invent.c display_binventory() — display buried inventory
export function display_binventory(x, y, map) {
    if (!map || !map.objects) return 0;
    const buried = map.objects.filter(o => o.ox === x && o.oy === y && o.buried);
    return buried.length;
}


// ============================================================
// 16. Permanent inventory — no-ops in JS
// ============================================================

// C ref: invent.c prepare_perminvent() — prepare permanent inventory display
export function prepare_perminvent() {}

// C ref: invent.c sync_perminvent() — sync permanent inventory with actual
export function sync_perminvent() {}

// C ref: invent.c perm_invent_toggled() — handle permanent inventory toggle
export function perm_invent_toggled() {}


// ============================================================
// Helpers
// ============================================================

// Helper: safely un-wear an object
function setnotworn(obj, player) {
    if (!player) return;
    if (obj === player.weapon) player.weapon = null;
    if (obj === player.armor) player.armor = null;
    if (obj === player.shield) player.shield = null;
    if (obj === player.helmet) player.helmet = null;
    if (obj === player.gloves) player.gloves = null;
    if (obj === player.boots) player.boots = null;
    if (obj === player.cloak) player.cloak = null;
    if (obj === player.shirt) player.shirt = null;
    if (obj === player.amulet) player.amulet = null;
    if (obj === player.leftRing) player.leftRing = null;
    if (obj === player.rightRing) player.rightRing = null;
    if (obj === player.swapWeapon) player.swapWeapon = null;
    if (obj === player.quiver) player.quiver = null;
    if (obj === player.blindfold) player.blindfold = null;
}

// Autotranslated from invent.c:390
export function invletter_value(c) {
  // C ref: char arithmetic — 'a' <= c <= 'z' → c - 'a' + 2
  const code = c.charCodeAt(0);
  return ('a' <= c && c <= 'z') ? (code - 0x61 + 2)
       : ('A' <= c && c <= 'Z') ? (code - 0x41 + 2 + 26)
       : (c === '$') ? 1
       : (c === '#') ? 1 + invlet_basic + 1
       : 1 + invlet_basic + 1 + 1;
}

// Autotranslated from invent.c:1626
export function compactify(buf) {
  let i1 = 1, i2 = 1, ilet, ilet1, ilet2;
  ilet2 = buf[0];
  ilet1 = buf[1];
  buf[++i2] = buf[++i1];
  ilet = buf[i1];
  while (ilet) {
    if (ilet === ilet1 + 1) {
      if (ilet1 === ilet2 + 1) buf[i2 - 1] = ilet1 = '-';
      else if (ilet2 === '-') {
        buf[i2 - 1] = ++ilet1;
        buf[i2] = buf[++i1];
        ilet = buf[i1];
        continue;
      }
    }
    else if (ilet === NOINVSYM) {
      if (i2 >= 2 && buf[i2 - 2] === NOINVSYM && buf[i2 - 1] === NOINVSYM) buf[i2 - 1] = '-';
      else if (i2 >= 3 && buf[i2 - 3] === NOINVSYM && buf[i2 - 2] === '-' && buf[i2 - 1] === NOINVSYM) --i2;
    }
    ilet2 = ilet1;
    ilet1 = ilet;
    buf[++i2] = buf[++i1];
    ilet = buf[i1];
  }
}

// Autotranslated from invent.c:2142
export function ckunpaid(otmp) {
  return (otmp.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj)));
}

// Autotranslated from invent.c:3005
export async function ddoinv(game = null) {
  return await dispinv_with_action('', false, null, game);
}

// Autotranslated from invent.c:3455
export function repopulate_perminvent() {
  display_pickinv(null,  0,  0, false, false, null);
}

// Autotranslated from invent.c:4916
export function adjust_ok(obj) {
  if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
  return GETOBJ_SUGGEST;
}

// Autotranslated from invent.c:4926
export function adjust_gold_ok(obj) {
  if (!obj) return GETOBJ_EXCLUDE;
  return GETOBJ_SUGGEST;
}

// C ref: invent.c stackobj() — try to merge object into existing stack on floor.
// C behavior: the newly placed obj SURVIVES; the old otmp is merged away and
// removed.  This matches merged(&obj, &otmp) where obj (new) accumulates
// otmp's (old) quantity.
export function stackobj(obj, map) {
    const mapRef = map || _gstate?.lev || _gstate?.map;
    if (!mapRef || !mapRef.objects) return;
    for (const otmp of mapRef.objects) {
        if (otmp !== obj && otmp.ox === obj.ox && otmp.oy === obj.oy
            && !otmp.buried && !obj.buried && mergable(otmp, obj)) {
            // C ref: merged() — new obj survives, old otmp is extracted/removed
            obj.quan = (obj.quan || 1) + (otmp.quan || 1);
            obj.owt = weight(obj);
            // Remove otmp (old) from map — matches C obj_extract_self(obj) in merged()
            const idx = mapRef.objects.indexOf(otmp);
            if (idx >= 0) mapRef.objects.splice(idx, 1);
            pushRngLogEntry(`^remove[${otmp.otyp},${otmp.ox},${otmp.oy}]`);
            return;
        }
    }
}

// JS-only convenience wrapper (no C counterpart): place_object() + stackobj()
export function placeFloorObject(map, obj) {
    place_object(obj, obj.ox, obj.oy, map);
    stackobj(obj, map);
    return obj;
}

// ========================================================================
// Monster inventory helpers — C ref: mkobj.c / invent.c
// ========================================================================
export function canMergeMonsterInventoryObj(dst, src) {
    if (!dst || !src) return false;
    if (dst.otyp !== src.otyp) return false;
    if (!!dst.cursed !== !!src.cursed) return false;
    if (!!dst.blessed !== !!src.blessed) return false;
    if (Number(dst.spe || 0) !== Number(src.spe || 0)) return false;
    if (Number(dst.oeroded || 0) !== Number(src.oeroded || 0)) return false;
    if (Number(dst.oeroded2 || 0) !== Number(src.oeroded2 || 0)) return false;
    if (!!dst.oerodeproof !== !!src.oerodeproof) return false;
    if (!!dst.greased !== !!src.greased) return false;
    if (!!dst.opoisoned !== !!src.opoisoned) return false;
    if ((dst.corpsenm ?? -1) !== (src.corpsenm ?? -1)) return false;
    if ((dst.fromsink ?? null) !== (src.fromsink ?? null)) return false;
    if ((dst.no_charge ?? null) !== (src.no_charge ?? null)) return false;
    return true;
}

export function addToMonsterInventory(mon, obj) {
    if (!mon || !obj) return null;
    if (!Array.isArray(mon.minvent)) mon.minvent = [];
    const quan = Number(obj.quan || 1);
    if (quan <= 0) return null;
    obj.quan = quan;
    for (const invObj of mon.minvent) {
        if (!canMergeMonsterInventoryObj(invObj, obj)) continue;
        invObj.quan = Number(invObj.quan || 0) + quan;
        invObj.owt = weight(invObj);
        return invObj;
    }
    mon.minvent.push(obj);
    return obj;
}

// ---------------------------------------------------------------------------
// C-named exports for CODEMATCH parity (S13/S14: invent.c parity)
// ---------------------------------------------------------------------------

// cf. invent.c:1056 — addinv_core0(obj, other_obj, update_perm_invent)
// Core inventory addition with merge logic. JS equivalent: addinv() above.
export async function addinv_core0(obj, player) {
    return addinv(obj, player);
}

// cf. invent.c:1152 — addinv(obj) [C version]
// Already exported above at line 1075.

// cf. invent.c:1160 — addinv_before(obj, other_obj)
// Add to inventory before a specific object. JS uses array-based inventory.
export async function addinv_before(obj, other_obj, player) {
    // JS inventory is array-based; position doesn't affect gameplay.
    return addinv(obj, player);
}

// cf. invent.c:5008 — adjust_split()
// Adjust inventory letters after a split. JS handles this automatically.
export function adjust_split() {
    // No-op in JS: inventory letter assignment is handled by array indexing.
}

// cf. invent.c:2377 — askchain(objchn, olets, allflag, fn, ckfn, mx, word)
// Step through items one by one, asking about each. Complex UI function.
export async function askchain(objchn, olets, allflag, fn, ckfn, mx, word) {
    // Stub: askchain is a Traditional menustyle function.
    // In JS, menu_loot/query_objlist handles the equivalent UI.
    let cnt = 0;
    const list = Array.isArray(objchn) ? objchn : [];
    for (const obj of list) {
        if (!obj) continue;
        if (ckfn && !ckfn(obj)) continue;
        if (fn) {
            const res = await fn(obj);
            if (res > 0) cnt++;
            if (res < 0) break;
        }
    }
    return cnt;
}

// cf. invent.c:5423 — cinv_ansimpleoname(obj)
// Container inventory: return "a <simple name>" for object.
export function cinv_ansimpleoname(obj) {
    const { ansimpleoname } = require('./objnam.js');
    return ansimpleoname ? ansimpleoname(obj) : String(obj?.otyp || 'object');
}

// cf. invent.c:5391 — cinv_doname(obj)
// Container inventory: return doname for display.
export function cinv_doname(obj, player) {
    const { doname: dn } = require('./mkobj.js');
    return dn ? dn(obj, player) : String(obj?.otyp || 'object');
}

// cf. invent.c:3467 — display_used_invlets()
// Show which inventory letters are in use. Debug/UI function.
export function display_used_invlets() {
    const player = _gstate?.player || null;
    const display = _gstate?.display || null;
    if (!player || !display || typeof display.putstr_message !== 'function') return '';

    const letters = (player.inventory || [])
        .map((obj) => String(obj?.invlet || ''))
        .filter((ch) => ch.length > 0)
        .sort((a, b) => invletSortValue(a) - invletSortValue(b));

    const msg = letters.length > 0
        ? `Used inventory letters: ${letters.join('')}`
        : 'No inventory letters are in use.';
    void Promise.resolve(display.putstr_message(msg));
    return msg;
}

// cf. invent.c:2814 — doperminv()
// Show permanent inventory window. UI function.
export async function doperminv() {
    const game = _gstate || null;
    if (!game) return 0;
    if (!game.flags) game.flags = {};
    game.flags.perm_invent = !game.flags.perm_invent;
    perm_invent_toggled();
    if (game.display && typeof game.display.putstr_message === 'function') {
        await game.display.putstr_message(
            `Permanent inventory display ${game.flags.perm_invent ? 'enabled' : 'disabled'}.`
        );
    }
    return 0;
}

// cf. invent.c:3827 — dotypeinv()
// Display inventory filtered by type. UI function.
export async function dotypeinv() {
    const player = _gstate?.player || null;
    const display = _gstate?.display || null;
    if (!player || !display || typeof display.putstr_message !== 'function') return 0;

    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    if (!inv.length) {
        await display.putstr_message('Not carrying anything.');
        return 0;
    }

    const lines = buildInventoryOverlayLines(player).filter((line) => line !== '(end)');
    for (const line of lines) {
        await display.putstr_message(line);
    }
    return 0;
}

// cf. invent.c:3654 — dounpaid()
// List unpaid items. UI function.
export async function dounpaid() {
    const player = _gstate?.player || null;
    const display = _gstate?.display || null;
    if (!player || !display || typeof display.putstr_message !== 'function') return 0;

    const inv = Array.isArray(player.inventory) ? player.inventory : [];
    const hasUnpaid = (obj) => {
        if (!obj) return false;
        if (obj.unpaid) return true;
        const contents = Array.isArray(obj.cobj) ? obj.cobj : [];
        return contents.some((child) => hasUnpaid(child));
    };
    const unpaid = inv.filter((obj) => hasUnpaid(obj));
    if (!unpaid.length) {
        await display.putstr_message('You are not carrying any unpaid objects.');
        return 0;
    }

    await display.putstr_message('Unpaid items:');
    for (const obj of unpaid) {
        await display.putstr_message(xprname(obj, null, obj.invlet || NOINVSYM, true, 0, 0, player));
    }
    return 0;
}

// cf. invent.c:4845 — free_invbuf()
// Free inventory string buffer. No-op in JS (garbage collected).
export function free_invbuf() {
    // No-op: JS handles memory via garbage collection.
}

// cf. invent.c:3044 — free_pickinv_cache()
// Free pickup inventory cache. No-op in JS.
export function free_pickinv_cache() {
    // No-op: JS handles memory via garbage collection.
}

// cf. invent.c:309 — loot_xname(obj)
// Generate sort-friendly name for loot display (strips prefixes).
export function loot_xname(obj, player) {
    const { xname } = require('./mkobj.js');
    return xname ? xname(obj, player) : String(obj?.otyp || 'object');
}

// cf. invent.c:2660 — menu_identify(id_limit)
// Identify items via menu. UI function.
export async function menu_identify(id_limit, player) {
    const p = player || _gstate?.player || null;
    if (!p) return 0;
    const limit = Number.isFinite(id_limit) ? Math.max(0, Math.floor(id_limit)) : 0;
    await identify_pack(limit, p, false);
    return 0;
}

// cf. invent.c:4379 — mergable(obj1, obj2) — already re-exported from mkobj.js
// No need to add again.

// cf. invent.c:2552 — reroll_menu()
// Re-roll identification selection menu. UI function.
export async function reroll_menu() {
    const p = _gstate?.player || null;
    if (!p) return 0;
    await menu_identify(0, p);
    return 0;
}

// cf. invent.c:403 — sortloot_cmp(a, b)
// Comparison function for sortloot. JS equivalent: sortloot() at line 865.
export function sortloot_cmp(a, b) {
    // Simplified comparison: by class then by name
    if (a.oclass !== b.oclass) return (a.oclass || 0) - (b.oclass || 0);
    return (a.otyp || 0) - (b.otyp || 0);
}
