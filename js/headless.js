// headless_runtime.js -- Shared headless runtime for session tests and selfplay.

// input.js (setInputRuntime called via game.init())
import {
    initRng,
    rn2,
    rnd,
    rn1,
    rnl,
    rne,
    rnz,
    d,
    enableRngLog,
    getRngLog as readRngLog,
    setRngCallCount,
    pushRngLogEntry,
} from './rng.js';
import { makelevel, setGameSeed, isBranchLevelToDnum } from './dungeon.js';
import { rankOf, roles } from './player.js';
import { initrack } from './monmove.js';
import { FOV } from './vision.js';
import { monsterNearby } from './monutil.js';
import { getArrivalPosition, changeLevel as changeLevelCore } from './do.js';
import { doname, setObjectMoves } from './mkobj.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import { tempGlyphToCell } from './temp_glyph.js';
import { setOutputContext } from './pline.js';
import { NetHackGame } from './allmain.js';
import {
    wallIsVisible,
    trapGlyph, isDoorHorizontal, determineWallType,
    terrainSymbol as renderTerrainSymbol,
    CLR_BLACK, CLR_GRAY, NO_COLOR, CLR_WHITE,
    CLR_RED, CLR_ORANGE, CLR_BRIGHT_BLUE,
} from './render.js';
import {
    COLNO, ROWNO, NORMAL_SPEED,
    A_STR, A_DEX, A_CON,
    A_LAWFUL, A_CHAOTIC, Amask2align,
    RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
    ROOMOFFSET, SHOPBASE,
    TERMINAL_COLS, TERMINAL_ROWS,
    MAP_ROW_START, STATUS_ROW_1, STATUS_ROW_2,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, STAIRS,
    IS_WALL, SDOOR, SCORR, IRONBARS,
    CORR, ROOM, DOOR,
    ALTAR, FOUNTAIN, THRONE, SINK, GRAVE, POOL, MOAT, WATER, LAVAPOOL,
    LAVAWALL, ICE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD, TREE,
    D_ISOPEN, D_CLOSED, D_LOCKED,
} from './config.js';


const DEFAULT_GAME_FLAGS = {
    pickup: false,
    verbose: false,
    safe_wait: true,
};

const SELFPLAY_GAME_FLAGS = {
    pickup: true,
    pickup_types: '',
    showexp: true,
    color: true,
    time: false,
    safe_pet: true,
    confirm: true,
    verbose: true,
    tombstone: true,
    rest_on_space: false,
    number_pad: false,
    lit_corridor: false,
};

const INVENTORY_CLASS_NAMES = {
    1: 'Weapons', 2: 'Armor', 3: 'Rings', 4: 'Amulets',
    5: 'Tools', 6: 'Comestibles', 7: 'Potions', 8: 'Scrolls',
    9: 'Spellbooks', 10: 'Wands', 11: 'Coins', 12: 'Gems/Stones',
};

const INVENTORY_ORDER = [11, 4, 1, 2, 6, 8, 9, 7, 3, 10, 5, 12, 13, 14, 15];

const ROLE_INDEX = {};
for (let i = 0; i < roles.length; i++) ROLE_INDEX[roles[i].name] = i;

const ALIGN_INDEX = {
    lawful: 1,
    neutral: 0,
    chaotic: -1,
};

const RACE_INDEX = {
    human: RACE_HUMAN,
    elf: RACE_ELF,
    dwarf: RACE_DWARF,
    gnome: RACE_GNOME,
    orc: RACE_ORC,
};

function normalizeRoleIndex(role, fallback = 11) {
    if (Number.isInteger(role)) return role;
    if (typeof role === 'string' && Object.hasOwn(ROLE_INDEX, role)) {
        return ROLE_INDEX[role];
    }
    return fallback;
}

function normalizeGender(gender, fallback = 0) {
    if (Number.isInteger(gender)) return gender;
    if (typeof gender === 'string') {
        if (gender.toLowerCase() === 'female') return 1;
        if (gender.toLowerCase() === 'male') return 0;
    }
    return fallback;
}

function normalizeAlignment(align) {
    if (Number.isInteger(align)) return align;
    if (typeof align === 'string') {
        const key = align.toLowerCase();
        if (Object.hasOwn(ALIGN_INDEX, key)) return ALIGN_INDEX[key];
    }
    return undefined;
}

function normalizeRace(race, fallback = RACE_HUMAN) {
    if (Number.isInteger(race)) return race;
    if (typeof race === 'string') {
        const key = race.toLowerCase();
        if (Object.hasOwn(RACE_INDEX, key)) return RACE_INDEX[key];
    }
    return fallback;
}

export function buildInventoryLines(player) {
    if (!player || (player.inventory.length === 0 && (player.gold || 0) <= 0)) {
        return ['Not carrying anything.'];
    }

    const groups = {};
    for (const item of player.inventory) {
        const cls = item.oclass;
        if (!groups[cls]) groups[cls] = [];
        groups[cls].push(item);
    }

    const lines = [];
    for (const cls of INVENTORY_ORDER) {
        if (cls === 11 && !groups[cls] && (player.gold || 0) > 0) {
            const gold = player.gold || 0;
            const goldLabel = gold === 1 ? 'gold piece' : 'gold pieces';
            lines.push('Coins');
            lines.push(`$ - ${gold} ${goldLabel}`);
            continue;
        }
        if (!groups[cls]) continue;
        lines.push(INVENTORY_CLASS_NAMES[cls] || 'Other');
        for (const item of groups[cls]) {
            lines.push(`${item.invlet} - ${doname(item, player)}`);
        }
    }
    lines.push('(end)');
    return lines;
}

export function createHeadlessInput({ throwOnEmpty = false } = {}) {
    const queue = [];
    let resolver = null;
    return {
        display: null,
        pushInput(ch) {
            if (resolver) {
                const resolve = resolver;
                resolver = null;
                resolve(ch);
            } else {
                queue.push(ch);
            }
        },
        clearInputQueue() {
            queue.length = 0;
        },
        setDisplay(display) {
            this.display = display || null;
        },
        getDisplay() {
            return this.display;
        },
        pushKey(ch) {
            this.pushInput(ch);
        },
        async nhgetch() {
            if (queue.length > 0) {
                return queue.shift();
            }
            if (throwOnEmpty) {
                throw new Error('Input queue empty - test may be missing keystrokes');
            }
            return await new Promise((resolve) => {
                resolver = resolve;
            });
        },
        isWaitingInput() {
            return resolver !== null;
        },
    };
}

function isMidlogEntry(entry) {
    return typeof entry === 'string' && entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

function isCompositeEntry(entry) {
    return typeof entry === 'string'
        && (entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d('));
}

function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    return String(entry || '').replace(/^\d+\s+/, '');
}

function rngCallPart(entry) {
    const atIdx = String(entry || '').indexOf(' @ ');
    return atIdx >= 0 ? String(entry).substring(0, atIdx) : String(entry || '');
}

// Internal factory: equivalent to old HeadlessGame.fromSeed
// Used by createHeadlessGame() and generateStartupWithCoreReplay()
async function headlessFromSeed(seed, roleIndex = 11, opts = {}) {
    const input = opts.input || createHeadlessInput();
    const display = new HeadlessDisplay();
    const game = new NetHackGame({ display, input, hooks: opts.hooks });
    await game.init({
        seed,
        wizard: opts.wizard ?? true,
        character: {
            roleIndex,
            name: opts.name || 'Agent',
            gender: opts.gender,
            race: opts.race,
            alignment: opts.alignment,
        },
        startDnum: opts.startDnum,
        dungeonAlignOverride: opts.dungeonAlignOverride,
        startDlevel: opts.startDlevel,
        flags: { tutorial: false, ...opts.initFlags },
    });
    game.display.flags.DECgraphics = opts.DECgraphics !== false;
    Object.assign(game.flags, SELFPLAY_GAME_FLAGS, opts.flags || {});
    (game.u || game.player).showExp = !!game.flags.showexp;
    (game.u || game.player).showScore = !!game.flags.showscore;
    (game.u || game.player).showTime = !!game.flags.time;
    return game;
}

// Internal factory: equivalent to old HeadlessGame.start
async function headlessStart(seed, options = {}) {
    const character = options.character || {};
    const roleValue = character.role ?? options.role ?? options.roleIndex;
    const roleIndex = normalizeRoleIndex(roleValue, 11);
    const gender = normalizeGender(character.gender ?? options.gender, 0);
    const alignment = normalizeAlignment(character.align ?? options.align ?? options.alignment);
    const race = normalizeRace(character.race ?? options.race, RACE_HUMAN);
    const name = character.name ?? options.name ?? (options.wizard ? 'Wizard' : 'Agent');
    return await headlessFromSeed(seed, roleIndex, {
        ...options,
        name,
        gender,
        alignment,
        race,
        wizard: !!options.wizard,
        startDnum: Number.isInteger(options.startDnum) ? options.startDnum : undefined,
        startDlevel: Number.isInteger(options.startDlevel) ? options.startDlevel : 1,
        dungeonAlignOverride: Number.isInteger(options.startDungeonAlign)
            ? options.startDungeonAlign
            : options.dungeonAlignOverride,
        DECgraphics: options.symbolMode !== 'ascii' && options.DECgraphics !== false,
        hooks: options.hooks || {},
    });
}

export async function generateMapsWithCoreReplay(seed, maxDepth, options = {}) {
    const targetDepth = Number.isInteger(maxDepth) ? maxDepth : 0;
    const grids = {};
    const maps = {};
    const rngLogs = {};
    if (targetDepth <= 0) return { grids, maps, rngLogs };

    const withTags = (typeof options.rngWithTags === 'boolean') ? options.rngWithTags : undefined;
    enableRngLog(withTags);
    const game = await headlessStart(seed, {
        wizard: true,
        roleIndex: Number.isInteger(options.roleIndex) ? options.roleIndex : 11,
        startDnum: options.startDnum,
        startDlevel: 1,
        startDungeonAlign: options.startDungeonAlign,
        flags: options.flags,
    });

    for (let depth = 1; depth <= targetDepth; depth++) {
        if (depth > 1) {
            game.teleportToLevel(depth);
        }
        grids[depth] = game.getTypGrid();
        maps[depth] = (game.lev || game.map);
        const compact = game.getRngLog().map(toCompactRng);
        const filtered = compact.filter((entry) => {
            const call = rngCallPart(entry);
            return !isMidlogEntry(entry) && !isCompositeEntry(call);
        });
        rngLogs[depth] = {
            rngCalls: filtered.length,
            rng: filtered,
        };
        game.clearRngLog();
    }
    return { grids, maps, rngLogs };
}

// Extract chargen+init keystrokes from session (keys through tutorial response).
// Collects all keys needed during game.init(): character selection, lore/welcome
// more-prompts, and tutorial response — stopping at the game-ready marker.
// Returns [] for non-chargen sessions (wizard path, no interactive menus).
function getChargenKeysFromSession(session = {}) {
    if (session.type !== 'chargen') return [];
    const keys = [];
    for (const step of (session.steps || [])) {
        // Legacy sessions used an empty-string key as a game-ready marker.
        // Action labels are deprecated and ignored.
        if (step.key === '') break;
        if (typeof step.key === 'string' && step.key.length > 0) {
            keys.push(step.key);
        }
    }
    return keys;
}

export async function generateStartupWithCoreReplay(seed, session, options = {}) {
    const rawSession = session || {};

    const withTags = (typeof options.rngWithTags === 'boolean') ? options.rngWithTags : undefined;
    enableRngLog(withTags);

    const input = createHeadlessInput({ throwOnEmpty: true });
    const display = new HeadlessDisplay();
    const game = new NetHackGame({ display, input });

    // Push chargen keystrokes for interactive chargen sessions
    const chargenKeys = getChargenKeysFromSession(rawSession);
    for (const key of chargenKeys) {
        for (let i = 0; i < key.length; i++) {
            input.pushKey(key.charCodeAt(i));
        }
    }

    // Determine init options
    const charOpts = extractCharacterFromSession(rawSession);
    const initOpts = chargenKeys.length > 0
        ? { seed, flags: { name: charOpts.name || '' } }
        : {
            seed,
            wizard: options.wizard !== false,
            character: {
                role: charOpts.role,
                name: charOpts.name || options.name || 'Wizard',
                gender: normalizeGender(charOpts.gender, 0),
                race: normalizeRace(charOpts.race, RACE_HUMAN),
                alignment: normalizeAlignment(charOpts.align),
            },
            startDnum: options.startDnum,
            startDlevel: Number.isInteger(options.startDlevel) ? options.startDlevel : 1,
            dungeonAlignOverride: Number.isInteger(options.startDungeonAlign)
                ? options.startDungeonAlign
                : options.dungeonAlignOverride,
            flags: { tutorial: false },
        };

    await game.init(initOpts);
    game.display.flags.DECgraphics = options.symbolMode !== 'ascii' && options.DECgraphics !== false;

    const startupRng = game.getRngLog().map(toCompactRng);

    return {
        game,
        map: (game.lev || game.map),
        player: (game.u || game.player),
        grid: game.getTypGrid(),
        rngCalls: startupRng.length,
        rng: startupRng,
    };
}

function extractCharacterFromSession(session = {}) {
    const opts = session.options || session.meta?.options || {};
    return {
        name: opts.name,
        role: opts.role,
        race: opts.race,
        gender: opts.gender,
        align: opts.align,
    };
}

// DEC Special Graphics Character Set — map raw VT100 alternate charset
// codes to Unicode so the display grid always holds display-ready characters.
// C ref: nethack win/tty uses SO/SI (\x0e/\x0f) to toggle this charset.
const DEC_TO_UNICODE = {
    '`': '\u25c6', a: '\u2592', f: '\u00b0', g: '\u00b1',
    j: '\u2518', k: '\u2510', l: '\u250c', m: '\u2514', n: '\u253c',
    q: '\u2500', t: '\u251c', u: '\u2524', v: '\u2534', w: '\u252c',
    x: '\u2502', '~': '\u00b7',
};


// Headless display for testing chargen screen rendering.
// Same grid-based rendering as Display but without any DOM dependency.
// Now supports terminal attributes (inverse video, bold, underline).
export class HeadlessDisplay {
    constructor() {
        this.cols = TERMINAL_COLS;
        this.rows = TERMINAL_ROWS;
        this.grid = [];
        this.colors = [];
        this.attrs = []; // Parallel grid for attributes
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            this.colors[r] = [];
            this.attrs[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = ' ';
                this.colors[r][c] = CLR_GRAY;
                this.attrs[r][c] = 0; // 0 = normal
            }
        }
        this.topMessage = null; // Track current message for concatenation
        this.messages = []; // Message history
        this.flags = { msg_window: false, DECgraphics: false, lit_corridor: false, color: true }; // Default flags
        this.messageNeedsMore = false; // For message concatenation
        // C ref: pline.c:274 — every pline() call does flush_screen(1) before
        // displaying, which shows --More-- on any pending message and clears it.
        // The selfplay harness auto-dismisses these, so each message replaces
        // the previous one.  Set noConcatenateMessages=true to match this
        // behavior (used during session replay comparison).
        this.noConcatenateMessages = false;
        this._lastMapState = null;
        this._mapBaseCells = new Map();
        this._tempOverlay = new Map();
    }

    setCell(col, row, ch, color = CLR_GRAY, attr = 0) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = ch;
            const displayColor = (this.flags.color !== false)
                ? ((color === CLR_BLACK && this.flags.use_darkgray !== false) ? NO_COLOR : color)
                : CLR_GRAY;
            this.colors[row][col] = displayColor;
            this.attrs[row][col] = attr;
        }
    }

    clearRow(row) {
        for (let c = 0; c < this.cols; c++) {
            this.grid[row][c] = ' ';
            this.colors[row][c] = CLR_GRAY;
            this.attrs[row][c] = 0;
        }
    }

    clearScreen() {
        for (let r = 0; r < this.rows; r++) {
            this.clearRow(r);
        }
    }

    // No-op for headless mode; the browser display refreshes the DOM here.
    render() {}


    putstr(col, row, str, color = CLR_GRAY, attr = 0) {
        for (let i = 0; i < str.length; i++) {
            this.setCell(col + i, row, str[i], color, attr);
        }
    }

    putstr_message(msg) {
        // Add to message history
        if (msg.trim()) {
            this.messages.push(msg);
            if (this.messages.length > 20) {
                this.messages.shift();
            }
        }

        // C ref: win/tty/topl.c:264-267 — Concatenate messages if they fit
        // C reserves space for " --More--" (9 chars) when checking if messages
        // can be concatenated.  When the combined message plus --More-- would
        // exceed the line width, C shows --More-- and starts a new line instead.
        // However, C's pline() calls flush_screen(1) before every message, which
        // shows --More-- and clears the topline.  In selfplay captures, the
        // harness auto-dismisses these, so messages are never concatenated.
        // When noConcatenateMessages is set, we skip concatenation to match C.
        const notDied = !msg.startsWith('You die');
        if (!this.noConcatenateMessages && this.topMessage && this.messageNeedsMore && notDied) {
            const combined = this.topMessage + '  ' + msg;
            // C ref: win/tty/topl.c update_topl() uses strict '<' for fit check.
            if (combined.length + 9 < this.cols) {
                this.clearRow(0);
                this.putstr(0, 0, combined.substring(0, this.cols));
                this.topMessage = combined;
                this.messageNeedsMore = true;
                return;
            }
        }

        this.clearRow(0);
        this.putstr(0, 0, msg.substring(0, this.cols));
        this.topMessage = msg;
        this.messageNeedsMore = true;
    }

    // Render the "--More--" marker that C tty appends to the topline before
    // blocking on input.  C ref: win/tty/topl.c tmore().
    // Callers who need the visual marker (e.g. dolook engraving display) call
    // this before morePrompt so that screen comparisons match C captures.
    renderMoreMarker() {
        const moreStr = '--More--';
        const msgLen = (this.topMessage || '').length;
        const col = Math.min(msgLen, this.cols - moreStr.length);
        this.putstr(col, 0, moreStr, CLR_WHITE);
    }

    async morePrompt(nhgetch) {
        // Keep topline text stable during replay; C harness snapshots don't
        // expose the transient "--More--" marker for most callers.
        // Use renderMoreMarker() before this call when C does show the marker.
        await nhgetch();
        this.clearRow(0);
        this.messageNeedsMore = false;
    }

    // Matches Display.renderChargenMenu() — always clears screen, applies offset
    // C ref: win/tty/wintty.c - menu headers use inverse video
    renderChargenMenu(lines, isFirstMenu) {
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }

        // C ref: wintty.c min(min(82, cols/2), cols - maxcol - 1)
        let offx = Math.max(10, Math.min(Math.floor(this.cols / 2), this.cols - maxcol - 2));
        if (isFirstMenu || offx === 10 || lines.length >= this.rows) {
            offx = 0;
        }

        this.clearScreen();

        // Render each line at the offset
        // C ref: role.c - headers like " Pick a role or profession" use inverse
        for (let i = 0; i < lines.length && i < this.rows; i++) {
            const line = lines[i];
            // First line is a highlighted header in tty role/race/option menus.
            const isHeader = (i === 0 && line.trim().length > 0);
            if (isHeader && line.startsWith(' ')) {
                // When header has explicit leading pad, C keeps that pad non-inverse.
                this.setCell(offx, i, ' ', CLR_GRAY, 0);
                this.putstr(offx + 1, i, line.slice(1), CLR_GRAY, 1);
            } else if (isHeader) {
                this.putstr(offx, i, line, CLR_GRAY, 1);
            } else {
                this.putstr(offx, i, line, CLR_GRAY, 0);
            }
        }

        return offx;
    }

    // Matches Display.renderOverlayMenu()
    renderOverlayMenu(lines) {
        const isCategoryHeader = (line) => {
            const text = String(line || '').trimStart();
            if (/^(Weapons|Armor|Rings|Amulets|Tools|Comestibles|Potions|Scrolls|Spellbooks|Wands|Coins|Gems\/Stones|Other)\b/.test(text)) {
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
        // C's maxcol includes +1 padding beyond the longest line, so for JS
        // (where maxcol is the raw longest line length) we use -2.
        const offx = Math.max(10, this.cols - maxcol - 2);

        const menuRows = Math.min(lines.length, STATUS_ROW_1);
        // C tty parity: clear only rows occupied by the menu itself.
        for (let r = 0; r < menuRows; r++) {
            for (let c = Math.max(0, offx - 1); c < this.cols; c++) {
                this.grid[r][c] = ' ';
                this.colors[r][c] = CLR_GRAY;
                this.attrs[r][c] = 0;
            }
        }

        for (let i = 0; i < menuRows; i++) {
            const line = lines[i];
            const isHeader = isCategoryHeader(line);
            if (isHeader) {
                // C ref: wintty.c — category headers have a single leading
                // space that is part of the clear region, not inverse video.
                // Column headers (spell list "    Name...") have structural
                // whitespace that IS rendered in inverse.
                const isSingleSpacePrefix = line.startsWith(' ') && (line.length < 2 || line[1] !== ' ');
                const trimmed = isSingleSpacePrefix ? line.slice(1) : line;
                const pad = line.length - trimmed.length;
                this.putstr(offx + pad, i, trimmed, CLR_GRAY, 1);
            } else {
                this.putstr(offx, i, line, CLR_GRAY, 0);
            }
        }
        return offx;
    }

    // Matches Display.renderLoreText()
    renderLoreText(lines, offx) {
        for (let i = 0; i < lines.length && i < this.rows; i++) {
            for (let c = offx; c < this.cols; c++) {
                this.grid[i][c] = ' ';
                this.colors[i][c] = CLR_GRAY;
            }
            this.putstr(offx, i, lines[i]);
        }
        for (let i = lines.length; i < this.rows - 2; i++) {
            for (let c = offx; c < this.cols; c++) {
                this.grid[i][c] = ' ';
                this.colors[i][c] = CLR_GRAY;
            }
        }
    }

    // Return 24-line string array matching C TTY screen format
    getScreenLines() {
        const result = [];
        for (let r = 0; r < this.rows; r++) {
            // Join chars, trim trailing spaces to match session format
            let line = this.grid[r].join('');
            // Right-trim spaces (C session screens are right-trimmed)
            line = line.replace(/ +$/, '');
            result.push(line);
        }
        return result;
    }

    // Return 24-line ANSI string array including SGR color/attribute changes.
    // Used for color-faithfulness comparisons against C captures with screenAnsi.
    getScreenAnsiLines() {
        const fgCode = (color) => {
            switch (color) {
                case 0: return 30;  // black
                case 1: return 31;  // red
                case 2: return 32;  // green
                case 3: return 33;  // brown
                case 4: return 34;  // blue
                case 5: return 35;  // magenta
                case 6: return 36;  // cyan
                case 7: return 37;  // gray
                case 8: return 90;  // no-color/dark gray
                case 9: return 91;  // orange / bright red in tty SGR
                case 10: return 92; // bright green
                case 11: return 93; // yellow
                case 12: return 94; // bright blue
                case 13: return 95; // bright magenta
                case 14: return 96; // bright cyan
                case 15: return 97; // white
                default: return 37;
            }
        };
        const bgCode = (color) => {
            switch (color) {
                case 0: return 40;
                case 1: return 41;
                case 2: return 42;
                case 3: return 43;
                case 4: return 44;
                case 5: return 45;
                case 6: return 46;
                case 7: return 47;
                case 8: return 100;
                case 9: return 101;
                case 10: return 102;
                case 11: return 103;
                case 12: return 104;
                case 13: return 105;
                case 14: return 106;
                case 15: return 107;
                default: return 40;
            }
        };
        const styleKey = (fg, bg, attr) => `${fg}|${bg}|${attr}`;

        const out = [];
        for (let r = 0; r < this.rows; r++) {
            const chars = this.grid[r].slice();
            const colors = this.colors[r].slice();
            const attrs = this.attrs[r].slice();

            // Match getScreenLines trimming for plain trailing blanks, but keep
            // styled trailing spaces (inverse/bold/underline) because C captures
            // preserve those via cursor movement + active SGR.
            let end = chars.length - 1;
            while (end >= 0 && chars[end] === ' ' && !attrs[end]) end--;
            if (end < 0) {
                out.push('');
                continue;
            }

            let line = '';
            let curKey = '';
            for (let c = 0; c <= end; c++) {
                const ch = chars[c] || ' ';
                const fg = Number.isInteger(colors[c]) ? colors[c] : 7;
                const attr = Number.isInteger(attrs[c]) ? attrs[c] : 0;
                const inverse = (attr & 1) !== 0;
                const bold = (attr & 2) !== 0;
                const underline = (attr & 4) !== 0;
                const styleFg = fg;
                const styleBg = 0;
                const key = styleKey(styleFg, styleBg, attr);
                if (key !== curKey) {
                    const sgr = [0, fgCode(styleFg), bgCode(styleBg)];
                    if (bold) sgr.push(1);
                    if (underline) sgr.push(4);
                    if (inverse) sgr.push(7);
                    line += `\x1b[${sgr.join(';')}m`;
                    curKey = key;
                }
                line += ch;
            }
            line += '\x1b[0m';
            out.push(line);
        }
        return out;
    }

    // Overwrite the terminal grid from captured 24-line session text.
    setScreenLines(lines) {
        this.clearScreen();
        const src = Array.isArray(lines) ? lines : [];
        for (let r = 0; r < this.rows && r < src.length; r++) {
            const line = src[r] || '';
            for (let c = 0; c < this.cols && c < line.length; c++) {
                this.grid[r][c] = line[c];
                this.colors[r][c] = CLR_GRAY;
                this.attrs[r][c] = 0;
            }
        }
    }

    // Overwrite terminal grid from ANSI-colored session lines.
    setScreenAnsiLines(lines) {
        this.clearScreen();
        const src = Array.isArray(lines) ? lines : [];
        for (let r = 0; r < this.rows && r < src.length; r++) {
            const line = String(src[r] || '');
            let i = 0;
            let col = 0;
            let fg = CLR_GRAY;
            let attr = 0; // bit1=inverse, bit2=bold, bit4=underline

            const applySgr = (codes) => {
                const list = codes.length ? codes : [0];
                for (const code of list) {
                    if (code === 0) {
                        fg = CLR_GRAY;
                        attr = 0;
                    } else if (code === 1) attr |= 2;
                    else if (code === 4) attr |= 4;
                    else if (code === 7) attr |= 1;
                    else if (code === 22) attr &= ~2;
                    else if (code === 24) attr &= ~4;
                    else if (code === 27) attr &= ~1;
                    else if (code >= 30 && code <= 37) fg = code - 30;
                    else if (code >= 90 && code <= 97) fg = 8 + (code - 90);
                    else if (code === 39) fg = CLR_GRAY;
                }
            };

            let decGraphics = false;
            while (i < line.length && col < this.cols) {
                const ch = line[i];
                if (ch === '\x0e') { decGraphics = true; i++; continue; }
                if (ch === '\x0f') { decGraphics = false; i++; continue; }
                if (ch === '\x1b' && line[i + 1] === '[') {
                    let j = i + 2;
                    while (j < line.length && !/[A-Za-z]/.test(line[j])) j++;
                    if (j < line.length) {
                        const cmd = line[j];
                        const body = line.slice(i + 2, j);
                        if (cmd === 'm') {
                            const codes = body.length === 0
                                ? [0]
                                : body.split(';')
                                    .map((s) => Number.parseInt(s || '0', 10))
                                    .filter((n) => Number.isFinite(n));
                            applySgr(codes);
                        } else if (cmd === 'C') {
                            const n = Math.max(1, Number.parseInt(body || '1', 10) || 1);
                            for (let k = 0; k < n && col < this.cols; k++, col++) {
                                this.setCell(col, r, ' ', fg, attr);
                            }
                        }
                        i = j + 1;
                        continue;
                    }
                }
                if (ch !== '\r' && ch !== '\n') {
                    // C ref: DEC Special Graphics — SO (\x0e) activates
                    // alternate charset; map raw DEC codes to Unicode so
                    // the grid always holds display-ready characters.
                    const decoded = decGraphics ? (DEC_TO_UNICODE[ch] || ch) : ch;
                    this.setCell(col, r, decoded, fg, attr);
                    col++;
                }
                i++;
            }
        }
    }

    // Return 24-line attribute array matching session format
    // Each line is 80 chars where each char is an attribute code:
    // '0' = normal, '1' = inverse, '2' = bold, '4' = underline
    getAttrLines() {
        const result = [];
        for (let r = 0; r < this.rows; r++) {
            // Convert numeric attrs to string, pad to 80 chars
            const attrLine = this.attrs[r].map(a => String(a)).join('').padEnd(80, '0');
            result.push(attrLine);
        }
        return result;
    }

    renderMap(gameMap, player, fov, flags = {}) {
        this.flags = { ...this.flags, ...flags };
        this._lastMapState = { gameMap, player, fov, flags: { ...this.flags } };
        const mapOffset = this.flags.msg_window ? 3 : MAP_ROW_START;


        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            // C tty map rendering uses game x in [1..COLNO-1] at terminal cols [0..COLNO-2].
            // Keep the last terminal column blank for map rows.
            this.setCell(COLNO - 1, row, ' ', CLR_GRAY);
            for (let x = 1; x < COLNO; x++) {
                const col = x - 1;

                if (!fov || !fov.canSee(x, y)) {
                    const loc = gameMap.at(x, y);
                    // C ref: map_invisible() uses show_glyph() directly,
                    // so mem_invis displays even at unseen locations.
                    if (loc && loc.mem_invis) {
                        this.setCell(col, row, 'I', CLR_GRAY);
                        continue;
                    }
                    if (loc && loc.seenv) {
                        if (loc.mem_obj) {
                            const rememberedObjColor = Number.isInteger(loc.mem_obj_color)
                                ? loc.mem_obj_color
                                : CLR_BLACK;
                            this.setCell(col, row, loc.mem_obj, rememberedObjColor);
                            continue;
                        }
                        if (loc.mem_trap) {
                            this.setCell(col, row, loc.mem_trap, CLR_BLACK);
                            continue;
                        }
                        if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
                            this.setCell(col, row, ' ', CLR_GRAY);
                            continue;
                        }
                        const sym = this.terrainSymbol(loc, gameMap, x, y);
                        const rememberedColor = (loc.typ === ROOM) ? 8 : sym.color;
                        this.setCell(col, row, sym.ch, rememberedColor);
                    } else {
                        this.setCell(col, row, ' ', CLR_GRAY);
                    }
                    continue;
                }

                const loc = gameMap.at(x, y);
                if (!loc) {
                    this.setCell(col, row, ' ', CLR_GRAY);
                    continue;
                }

                // seenv is now tracked by vision.js compute()

                if (player && x === player.x && y === player.y) {
                    this.setCell(col, row, '@', CLR_WHITE);
                    continue;
                }

                const mon = gameMap.monsterAt(x, y);
                if (mon) {
                    loc.mem_invis = false;
                    const underObjs = gameMap.objectsAt(x, y);
                    if (underObjs.length > 0) {
                        const underTop = underObjs[underObjs.length - 1];
                        const underGlyph = objectMapGlyph(underTop, false, { player, x, y });
                        loc.mem_obj = underGlyph.ch || 0;
                        loc.mem_obj_color = Number.isInteger(underGlyph.color)
                            ? underGlyph.color
                            : CLR_GRAY;
                    } else if (player?.wizard && gameMap.engravingAt(x, y)) {
                        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                        loc.mem_obj = engrCh;
                        loc.mem_obj_color = CLR_BRIGHT_BLUE;
                    } else {
                        loc.mem_obj = 0;
                        loc.mem_obj_color = 0;
                    }
                    const hallu = !!player?.hallucinating;
                    const glyph = monsterMapGlyph(mon, hallu);
                    this.setCell(col, row, glyph.ch, glyph.color);
                    continue;
                }
                if (loc.mem_invis) {
                    this.setCell(col, row, 'I', CLR_GRAY);
                    continue;
                }

                const objs = gameMap.objectsAt(x, y);
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
                    continue;
                }
                loc.mem_obj = 0;
                loc.mem_obj_color = 0;

                const trap = gameMap.trapAt(x, y);
                if (trap && trap.tseen) {
                    const tg = trapGlyph(trap.ttyp);
                    loc.mem_trap = tg.ch;
                    this.setCell(col, row, tg.ch, tg.color);
                    continue;
                }
                loc.mem_trap = 0;

                // C ref: display.c back_to_glyph() — wizard mode shows
                // engravings with S_engroom ('`') / S_engrcorr ('#').
                if (player?.wizard) {
                    const engr = gameMap.engravingAt(x, y);
                    if (engr) {
                        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                        loc.mem_obj = engrCh;
                        loc.mem_obj_color = CLR_BRIGHT_BLUE;
                        this.setCell(col, row, engrCh, CLR_BRIGHT_BLUE);
                        continue;
                    }
                }

                if (IS_WALL(loc.typ) && !wallIsVisible(loc.typ, loc.seenv, loc.flags)) {
                    this.setCell(col, row, ' ', CLR_GRAY);
                    continue;
                }
                const sym = this.terrainSymbol(loc, gameMap, x, y);
                this.setCell(col, row, sym.ch, sym.color);
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
                const ch = this.grid[row]?.[col];
                if (typeof ch !== 'string') continue;
                const color = Number.isInteger(this.colors[row]?.[col]) ? this.colors[row][col] : CLR_GRAY;
                const attr = Number.isInteger(this.attrs[row]?.[col]) ? this.attrs[row][col] : 0;
                this._mapBaseCells.set(this._overlayKey(col, row), { ch, color, attr });
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
        // Headless display writes are immediate.
    }

    renderStatus(player) {
        if (!player) return;

        const level = Number.isFinite(player?.ulevel) ? player.ulevel : (player?.level || 1);
        const heroHp = Number.isFinite(player?.uhp) ? player.uhp : (player?.hp || 0);
        const heroHpMax = Number.isFinite(player?.uhpmax) ? player.uhpmax : (player?.hpmax || 0);
        const female = player.gender === 1;
        const rank = rankOf(level, player.roleIndex, female);
        const title = `${player.name} the ${rank}`;
        const strDisplay = player._screenStrength || player.strDisplay;
        const line1Parts = [];
        line1Parts.push(`St:${strDisplay}`);
        line1Parts.push(`Dx:${player.attributes[3]}`);
        line1Parts.push(`Co:${player.attributes[4]}`);
        line1Parts.push(`In:${player.attributes[1]}`);
        line1Parts.push(`Wi:${player.attributes[2]}`);
        line1Parts.push(`Ch:${player.attributes[5]}`);
        const alignStr = player.alignment < 0 ? 'Chaotic'
            : player.alignment > 0 ? 'Lawful' : 'Neutral';
        line1Parts.push(alignStr);
        if (player.showScore && player.score > 0) line1Parts.push(`S:${player.score}`);

        this.clearRow(STATUS_ROW_1);
        const line1 = `${title.padEnd(31)}${line1Parts.join(' ')}`;
        this.putstr(0, STATUS_ROW_1, line1.substring(0, this.cols), CLR_GRAY);

        const line2Parts = [];
        const levelLabel = player.inTutorial ? 'Tutorial' : 'Dlvl';
        line2Parts.push(`${levelLabel}:${player.dungeonLevel}`);
        line2Parts.push(`$:${player.gold}`);
        line2Parts.push(`HP:${heroHp}(${heroHpMax})`);
        line2Parts.push(`Pw:${player.pw}(${player.pwmax})`);
        line2Parts.push(`AC:${player.ac}`);
        if (player.showExp) {
            line2Parts.push(`Xp:${level}/${player.exp}`);
        } else {
            line2Parts.push(`Xp:${level}`);
        }
        if (player.showTime) line2Parts.push(`T:${player.turns}`);
        if (player.hunger > 1000) line2Parts.push('Satiated');
        else if (player.hunger <= 50) line2Parts.push('Fainting');
        else if (player.hunger <= 150) line2Parts.push('Weak');
        else if (player.hunger <= 300) line2Parts.push('Hungry');
        if ((player.encumbrance || 0) > 0) {
            const encNames = ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
            const idx = Math.max(0, Math.min(encNames.length - 1, (player.encumbrance || 1) - 1));
            line2Parts.push(encNames[idx]);
        }
        if (player.blind) line2Parts.push('Blind');
        if (player.confused) line2Parts.push('Conf');
        if (player.stunned) line2Parts.push('Stun');
        if (player.hallucinating) line2Parts.push('Hallu');

        this.clearRow(STATUS_ROW_2);
        const line2 = line2Parts.join(' ');
        this.putstr(0, STATUS_ROW_2, line2.substring(0, this.cols), CLR_GRAY);

        // C parity: status-line HP text remains default color unless
        // hitpointbar/status highlight settings explicitly request emphasis.
        if (this.flags.hitpointbar) {
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

    // Render message window (for testing msg_window option)
    renderMessageWindow() {
        // Clear message window area (row 0 = topline only; rows 1-2 are part of
        // the map in headless/tty mode, not a multi-line message buffer).
        this.clearRow(0);

        // C ref: tty docrt() after menu close — show current topMessage only.
        // Historical messages are NOT re-shown; the map redraws clean except for
        // whatever message is currently pending.  Showing stale messages from
        // this.messages would put old text on row 0 after actions like throw-from-
        // inventory that clear topMessage before the map redraws.
        if (this.topMessage) {
            this.putstr(0, 0, this.topMessage.substring(0, this.cols));
        }
    }

    // C ref: display.c back_to_glyph() — delegates to render.js canonical implementation.
    terrainSymbol(loc, gameMap = null, x = -1, y = -1) {
        return renderTerrainSymbol(loc, gameMap, x, y, this.flags);
    }
}

// ============================================================================
// Compat shims — keep old HeadlessGame API working
// ============================================================================
export async function createHeadlessGame(seed, roleIndex = 11, opts = {}) {
    return headlessFromSeed(seed, roleIndex, opts);
}

// HeadlessGame is now an alias for NetHackGame with static factory methods attached.
// Callers using HeadlessGame.start(), HeadlessGame.fromSeed() continue to work.
// These are now async — callers must await them.
NetHackGame.fromSeed = headlessFromSeed;
NetHackGame.start = headlessStart;
NetHackGame.headless = headlessFromSeed;
export { NetHackGame as HeadlessGame };
