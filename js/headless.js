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
import { rankOf, roles } from './player.js';
import { initrack } from './monmove.js';
import { NORMAL_SPEED } from './const.js';
import { FOV } from './vision.js';
import { monsterNearby } from './hack.js';
import { newsym } from './display.js';
import { getArrivalPosition, changeLevel as changeLevelCore } from './do.js';
import { doname } from './mkobj.js';
import { WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
         FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
         COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS } from './objects.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import { tempGlyphToCell } from './temp_glyph.js';
import { NetHackGame } from './allmain.js';
import {
    wallIsVisible,
    trapGlyph, isDoorHorizontal, determineWallType,
    terrainSymbol as renderTerrainSymbol,
    formatStatusLine1, formatStatusLine2,
    CLR_BLACK, CLR_GRAY, NO_COLOR, CLR_WHITE,
    CLR_RED, CLR_ORANGE, CLR_BRIGHT_BLUE,
} from './render.js';
import {
    COLNO, ROWNO,
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
} from './const.js';


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
    [WEAPON_CLASS]: 'Weapons', [ARMOR_CLASS]: 'Armor', [RING_CLASS]: 'Rings',
    [AMULET_CLASS]: 'Amulets', [TOOL_CLASS]: 'Tools', [FOOD_CLASS]: 'Comestibles',
    [POTION_CLASS]: 'Potions', [SCROLL_CLASS]: 'Scrolls', [SPBOOK_CLASS]: 'Spellbooks',
    [WAND_CLASS]: 'Wands', [COIN_CLASS]: 'Coins', [GEM_CLASS]: 'Gems/Stones',
};

const INVENTORY_ORDER = [COIN_CLASS, AMULET_CLASS, WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS,
    SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS, RING_CLASS, WAND_CLASS, TOOL_CLASS,
    GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS];

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
        if (cls === COIN_CLASS && !groups[cls] && (player.gold || 0) > 0) {
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
    let waitEpoch = 0;
    let waitStack = null;
    let waitContext = null;
    const waitListeners = [];
    let onWaitStarted = null;

    function abortError() {
        const err = new Error('waitForInputWait aborted');
        err.name = 'AbortError';
        return err;
    }

    function removeWaitListener(listener) {
        const idx = waitListeners.indexOf(listener);
        if (idx >= 0) waitListeners.splice(idx, 1);
    }

    function notifyWaitStarted() {
        waitEpoch += 1;
        if (typeof onWaitStarted === 'function') {
            onWaitStarted(waitEpoch);
        }
        for (let i = waitListeners.length - 1; i >= 0; i--) {
            const listener = waitListeners[i];
            if (waitEpoch > listener.afterEpoch) {
                waitListeners.splice(i, 1);
                if (listener.signal && listener.onAbort) {
                    listener.signal.removeEventListener('abort', listener.onAbort);
                }
                listener.resolve(waitEpoch);
            }
        }
    }

    return {
        display: null,
        pushInput(ch) {
            if (resolver) {
                const resolve = resolver;
                resolver = null;
                waitStack = null;
                waitContext = null;
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
        setOnWaitStarted(fn) {
            onWaitStarted = (typeof fn === 'function') ? fn : null;
        },
        getDisplay() {
            return this.display;
        },
        pushKey(ch) {
            this.pushInput(ch);
        },
        setWaitContext(stack) {
            waitContext = stack || null;
            waitStack = waitContext;
        },
        async nhgetch() {
            if (queue.length > 0) {
                return queue.shift();
            }
            if (resolver) {
                throw new Error('Concurrent nhgetch() wait detected: existing input read is still pending');
            }
            if (throwOnEmpty) {
                throw new Error('Input queue empty - test may be missing keystrokes');
            }
            if (!waitContext) {
                waitContext = new Error('input wait').stack || null;
            }
            waitStack = waitContext;
            notifyWaitStarted();
            return await new Promise((resolve) => {
                resolver = resolve;
            });
        },
        isWaitingInput() {
            return resolver !== null;
        },
        getInputState() {
            return {
                waiting: resolver !== null,
                queueLength: queue.length,
                waitEpoch,
                waitStack,
                waitContext,
            };
        },
        waitForInputWait({ afterEpoch = 0, signal = null } = {}) {
            const since = Number.isInteger(afterEpoch) ? afterEpoch : 0;
            if (resolver !== null && waitEpoch > since) {
                return Promise.resolve(waitEpoch);
            }
            return new Promise((resolve, reject) => {
                if (signal?.aborted) {
                    reject(abortError());
                    return;
                }
                const listener = {
                    afterEpoch: since,
                    resolve,
                    signal,
                    onAbort: null,
                };
                if (signal) {
                    listener.onAbort = () => {
                        removeWaitListener(listener);
                        reject(abortError());
                    };
                    signal.addEventListener('abort', listener.onAbort, { once: true });
                }
                waitListeners.push(listener);
            });
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
            await game.teleportToLevel(depth);
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
        this.cursorCol = 0;
        this.cursorRow = 0;
        this.cursorVisible = 1;
        this._nhgetch = null;
        this._inputBoundaryRuntime = null;
        this._moreBoundaryToken = null;
        this._pendingMore = false;
        this._pendingMoreNoCursor = false;
        this._messageQueue = [];
        this._moreBlockingEnabled = false;
    }

    setNhgetch(fn) { this._nhgetch = fn; }
    setInputBoundaryRuntime(runtime) { this._inputBoundaryRuntime = runtime || null; }

    markMorePending(meta = null) {
        this._pendingMore = true;
        if (this._moreBoundaryToken) return;
        const runtime = this._inputBoundaryRuntime;
        if (!runtime || typeof runtime.withInputBoundary !== 'function') return;
        const topBoundary = (typeof runtime.peekInputBoundary === 'function')
            ? runtime.peekInputBoundary()
            : null;
        if (topBoundary && topBoundary.owner === 'more' && Number.isInteger(topBoundary.token)) {
            this._moreBoundaryToken = topBoundary.token;
            return;
        }
        if (typeof runtime.clearInputBoundariesByOwner === 'function') {
            runtime.clearInputBoundariesByOwner('more');
        }
        this._moreBoundaryToken = runtime.withInputBoundary('more', async (ch) => {
            if (!this._isMoreDismissKey(ch)) {
                return { handled: true, tookTime: false };
            }
            await this._clearMore();
            return { handled: true, tookTime: false };
        }, meta || { source: 'headless.putstr_message' });
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
        // Reset message state so stale topMessage doesn't trigger a spurious
        // --More-- on the next putstr_message call (mirrors Display.clearScreen).
        this.topMessage = null;
        this.messageNeedsMore = false;
    }

    // No-op for headless mode; the browser display refreshes the DOM here.
    render() {}

    setCursor(col, row) {
        this.cursorCol = col;
        this.cursorRow = row;
    }

    getCursor() { return [this.cursorCol, this.cursorRow, this.cursorVisible]; }

    cursSet(visibility) { this.cursorVisible = visibility ? 1 : 0; }

    cursorOnPlayer(player) {
        if (player) {
            const mapOffset = this.flags?.msg_window ? 3 : MAP_ROW_START;
            this.setCursor(player.x - 1, player.y + mapOffset);
        }
    }

    putstr(col, row, str, color = CLR_GRAY, attr = 0) {
        for (let i = 0; i < str.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, str[i], color, attr);
        }
    }

    async putstr_message(msg) {
        // Add to message history
        if (msg.trim()) {
            this.messages.push(msg);
            if (this.messages.length > 20) {
                this.messages.shift();
            }
        }

        // If --More-- is pending (non-blocking fallback), queue the message.
        if (this._pendingMore) {
            this._messageQueue.push(msg);
            return;
        }

        const isDeathMessage = msg.startsWith('You die...');
        // C-faithful death staging: if a death line arrives while another
        // message is pending acknowledgement, force a --More-- boundary first.
        if (this.topMessage && this.messageNeedsMore && isDeathMessage) {
            this.renderMoreMarker();
            this.markMorePending({ source: 'headless.death-staging' });
            this._messageQueue.push(msg);
            return;
        }

        // C ref: win/tty/topl.c:264-267 — Concatenate messages if they fit.
        // C reserves space for " --More--" (9 chars) when checking if messages
        // can be concatenated.  When the combined message plus --More-- would
        // exceed the line width, C shows --More-- and blocks on input first.
        if (!this.noConcatenateMessages && this.topMessage && this.messageNeedsMore) {
            const combined = this.topMessage + '  ' + msg;
            // C ref: win/tty/topl.c update_topl() uses strict '<' for fit check.
            if (combined.length + 9 < this.cols) {
                this.clearRow(0);
                this.putstr(0, 0, combined.substring(0, this.cols));
                this.topMessage = combined;
                this.messageNeedsMore = true;
                this.setCursor(Math.min(combined.length, this.cols - 1), 0);
                return;
            }
            // C ref: win/tty/topl.c update_topl():
            // - concat overflow triggers more()
            // - "You die..." also forces more() before the new message
            // C ref: topl.c more() → flush_screen(1) → bot() before xwaitforspace().
            // Update status line so HP/Pw reflect current state at the --More-- prompt.
            if (this._lastMapState?.player) {
                this.renderStatus(this._lastMapState.player);
            }
            this.renderMoreMarker();
            if (this._moreBlockingEnabled && this._nhgetch) {
                // True blocking: await a keypress to dismiss --More--,
                // matching C's xwaitforspace() behavior.
                await this._waitForMoreDismissKey(this._nhgetch);
                // Fall through to display the new message fresh.
            } else {
                // Non-blocking fallback: queue message for later display.
                this.markMorePending({ source: 'headless.concat-overflow' });
                this._messageQueue.push(msg);
                return;
            }
        }

        this.clearRow(0);
        if (msg.length <= this.cols) {
            this.putstr(0, 0, msg.substring(0, this.cols));
            this.topMessage = msg;
            this.messageNeedsMore = true;
            if (isDeathMessage) {
                this.renderMoreMarker();
                this.markMorePending({ source: 'headless.death-final' });
            }
            this.setCursor(Math.min(msg.length, this.cols - 1), 0);
            return;
        }

        // Match tty paging: reserve room for " --More--" on long toplines,
        // pause, then continue with the overflow text.
        const maxLineLen = Math.max(1, this.cols - 10);
        let breakPoint = msg.lastIndexOf(' ', maxLineLen);
        if (breakPoint === -1) {
            breakPoint = maxLineLen;
        }
        const firstLine = msg.substring(0, breakPoint);
        const wrapped = msg.substring(breakPoint).trimStart();

        this.putstr(0, 0, firstLine);
        this.topMessage = firstLine;
        this.messageNeedsMore = true;

        if (wrapped.length === 0) {
            return;
        }

        if (this._moreBlockingEnabled && this._nhgetch) {
            const moreStr = '--More--';
            const secondMax = Math.max(1, this.cols - moreStr.length);
            const secondLine = wrapped.substring(0, secondMax);
            const remainder = wrapped.substring(secondLine.length).trimStart();
            const moreCol = Math.min(secondLine.length, this.cols - moreStr.length);
            this.clearRow(1);
            this.putstr(0, 1, secondLine);
            this.putstr(moreCol, 1, moreStr);
            // C ref: win/tty/topl.c more() — cursor lands after --More-- on row 1.
            this.setCursor(Math.min(moreCol + moreStr.length, this.cols - 1), 1);
            await this._waitForMoreDismissKey(this._nhgetch);
            this.clearRow(0);
            this.messageNeedsMore = false;
            this.topMessage = null;
            if (remainder.length > 0) {
                await this.putstr_message(remainder);
            }
            return;
        }

        this.markMorePending({ source: 'headless.wrap-overflow' });
        this._messageQueue.push(wrapped);
    }

    // Dismiss the --More-- prompt and resume queued fallback messages.
    // Called when a key is consumed for --More-- dismissal (from nhgetch
    // or run_command).  Resume at most one queued message per dismissal
    // so prompt/message progression remains explicit.
    async _clearMore() {
        if (this._moreBoundaryToken
            && this._inputBoundaryRuntime
            && typeof this._inputBoundaryRuntime.clearInputBoundary === 'function') {
            this._inputBoundaryRuntime.clearInputBoundary(this._moreBoundaryToken);
            this._moreBoundaryToken = null;
        }
        this._pendingMore = false;
        this._pendingMoreNoCursor = false;
        this.clearRow(0);
        this.messageNeedsMore = false;
        this.topMessage = null;
        if (this._messageQueue.length > 0) {
            const queued = this._messageQueue.shift();
            await this.putstr_message(queued);
        }
    }

    // Render the "--More--" marker that C tty appends to the topline before
    // blocking on input.  C ref: win/tty/topl.c tmore().
    // Callers who need the visual marker (e.g. dolook engraving display) call
    // this before morePrompt so that screen comparisons match C captures.
    renderMoreMarker() {
        const moreStr = '--More--';
        const msgLen = (this.topMessage || '').length;
        const col = Math.min(msgLen, this.cols - moreStr.length);
        this.putstr(col, 0, moreStr, CLR_GRAY);
        this.setCursor(Math.min(col + moreStr.length, this.cols - 1), 0);
    }

    async morePrompt(nhgetch) {
        // Keep topline text stable during replay; C harness snapshots don't
        // expose the transient "--More--" marker for most callers.
        // Use renderMoreMarker() before this call when C does show the marker.
        await this._waitForMoreDismissKey(nhgetch);
        this.clearRow(0);
        this.messageNeedsMore = false;
    }

    _isMoreDismissKey(ch) {
        const code = typeof ch === 'number'
            ? ch
            : (typeof ch === 'string' && ch.length > 0 ? ch.charCodeAt(0) : 0);
        return code === 32 || code === 27 || code === 10 || code === 13 || code === 16; // ' ', ESC, LF, CR, ^P
    }

    // C ref: xwaitforspace("\033 ") in win/tty/topl.c.
    // Ignore non-dismissal keys while waiting at --More--.
    async _waitForMoreDismissKey(nhgetch) {
        if (typeof nhgetch !== 'function') return;
        for (;;) {
            const ch = await nhgetch();
            if (this._isMoreDismissKey(ch)) return;
        }
    }

    // Matches Display.renderChargenMenu() — always clears screen, applies offset
    // C ref: win/tty/wintty.c - menu headers use inverse video
    renderChargenMenu(lines, isFirstMenu) {
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }

        // C ref: wintty.c min(min(82, cols/2), cols - maxcol - 1)
        // Keep 1-column parity with tty menu placement in replay captures.
        let offx = Math.max(10, this.cols - maxcol - 2);
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
    renderOverlayMenu(lines, opts = null) {
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
        // C's maxcol includes +2 padding (space + end), so for JS
        // (where maxcol is the raw longest line length) we use -2.
        let offx = Math.max(10, this.cols - maxcol - 2);
        if (opts?.capHalf) {
            offx = Math.min(offx, Math.floor(this.cols / 2) + 1);
        }

        // C ref: wintty.c line 1926 — force full-screen when offx hits the
        // minimum (10) or menu fills the terminal height (maxrow >= rows).
        // In C, full-screen uses offx=0 then putchar(' ') before each item.
        // In JS, use offx=1 so the clearing loop places a space at col 0
        // and putstr places text at col 1 — matching C's output.
        const fullScreen = (offx === 10 || lines.length >= this.rows);
        if (fullScreen) offx = 1;

        const menuRows = Math.min(lines.length, fullScreen ? this.rows : STATUS_ROW_1);
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

    // C ref: tty_display_nhwindow process_text_window / process_menu_window
    // Renders a text popup as a right-side overlay on the map.
    // Used by look_here() for "Things that are here:" and similar displays.
    renderTextPopup(lines, opts = {}) {
        // Filter out trailing empty lines from the data
        while (lines.length > 0 && lines[lines.length - 1] === '') {
            lines = lines.slice(0, -1);
        }
        const fullScreenText = lines.length >= this.rows - 2;
        // C ref: process_text_window uses "(end)" for last/only page;
        // process_menu_window uses " --More--" for non-fullscreen popups.
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
        // C ref: process_menu_window offx calculation:
        // offx = min(min(82, cols/2), cols - maxcol - 1)
        // Empirically, for 80 cols this produces offx=41 (0-indexed) because
        // C adds cw->offx to the 1-based cursor x, yielding offx+1 screen col.
        let offx;
        if (fullScreenText) {
            offx = 0;
        } else {
            // C ref: process_menu_window/process_text_window offx calculation.
            // NHW_TEXT (process_text_window) uses cols - maxcol - 2 empirically;
            // NHW_MENU (process_menu_window) uses cols - maxcol - 1 with +1 half.
            if (opts.isTextWindow) {
                const halfCols = Math.floor(this.cols / 2);
                offx = Math.min(Math.min(82, halfCols), this.cols - maxcol - 2);
            } else {
                const halfCols = Math.floor(this.cols / 2) + 1;
                offx = Math.min(halfCols, this.cols - maxcol - 1);
            }
        }
        // Clear the popup area
        for (let r = 0; r < menuRows; r++) {
            for (let c = Math.max(0, offx); c < this.cols; c++) {
                this.grid[r][c] = ' ';
                this.colors[r][c] = CLR_GRAY;
                this.attrs[r][c] = 0;
            }
        }
        // Render each line
        for (let i = 0; i < menuRows; i++) {
            const line = renderLines[i] || '';
            const isMoreLine = (i === menuRows - 1) && line.endsWith('--More--');
            // C ref: "--More--" marker is rendered 1 col left (with leading space);
            // "(end)" is rendered at the same offx as text lines.
            const col = isMoreLine ? Math.max(0, offx - 1) : offx;
            this.putstr(col, i, line, CLR_GRAY, 0);
        }
        // Position cursor at end of marker on the last row
        const lastRow = menuRows - 1;
        const lastLine = renderLines[lastRow] || '';
        const isMore = lastLine.endsWith('--More--');
        const markerCol = isMore ? Math.max(0, offx - 1) : offx;
        const markerEnd = markerCol + lastLine.length;
        this.setCursor(Math.min(markerEnd, this.cols - 1), lastRow);
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

        const renderCtx = { display: this, player, fov, flags: this.flags, map: gameMap };
        for (let y = 0; y < ROWNO; y++) {
            const row = y + mapOffset;
            // C tty map rendering uses game x in [1..COLNO-1] at terminal cols [0..COLNO-2].
            // Keep the last terminal column blank for map rows.
            this.setCell(COLNO - 1, row, ' ', CLR_GRAY);
            for (let x = 1; x < COLNO; x++) {
                newsym(x, y, renderCtx);
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

        this.clearRow(STATUS_ROW_1);
        const line1 = formatStatusLine1(player, rankOf);
        this.putstr(0, STATUS_ROW_1, line1.substring(0, this.cols), CLR_GRAY);

        this.clearRow(STATUS_ROW_2);
        const line2 = formatStatusLine2(player);
        this.putstr(0, STATUS_ROW_2, line2.substring(0, this.cols), CLR_GRAY);

        // C parity: status-line HP text remains default color unless
        // hitpointbar/status highlight settings explicitly request emphasis.
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
