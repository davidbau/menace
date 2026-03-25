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
import { newsym, getCachedMapCell, flush_screen } from './display.js';
import { getArrivalPosition, changeLevel as changeLevelCore } from './do.js';
import { doname } from './mkobj.js';
import { parseNethackrcFull } from './storage.js';
import { WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS, TOOL_CLASS,
         FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS, WAND_CLASS,
         COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS } from './objects.js';
import { monsterMapGlyph, objectMapGlyph } from './display_rng.js';
import { tempGlyphToCell } from './temp_glyph.js';
import {
    debugRepaint,
    logRepaint,
    repaintHp,
    repaintBotl,
    repaintBotlx,
    repaintTimeBotl,
    repaintToplineState,
} from './repaint_trace.js';
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
import { more } from './input.js';
// Terminal, trace, and screen_capture imports removed — HeadlessDisplay
// is now an alias for Display (which extends Terminal).


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
    (game.u || game.u).showExp = !!game.flags.showexp;
    (game.u || game.u).showScore = !!game.flags.showscore;
    (game.u || game.u).showTime = !!game.flags.time;
    return game;
}

function finalizeHeadlessReadyState(game) {
    if (game?.pendingPrompt?.source === 'startup_lore') {
        // Public headless helpers should return a command-ready game rather
        // than one still owning input with the startup lore overlay.
        game.pendingPrompt = null;
        if (game.display) {
            game.display.toplin = 0;
            game.display.topMessage = null;
            game.display.messageNeedsMore = false;
            game.display.messageNeedsMoreBoundary = false;
        }
        if (typeof game.docrt === 'function') {
            game.docrt();
        }
    }
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
    return finalizeHeadlessReadyState(await headlessFromSeed(seed, roleIndex, {
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
    }));
}

export async function generateMapsWithCoreReplay(seed, maxDepth, options = {}) {
    const targetDepth = Number.isInteger(maxDepth) ? maxDepth : 0;
    const grids = {};
    const maps = {};
    const rngLogs = {};
    if (targetDepth <= 0) return { grids, maps, rngLogs };

    const withTags = (typeof options.rngWithTags === 'boolean') ? options.rngWithTags : undefined;
    enableRngLog(withTags);
    // Use an auto-responding input so --More-- prompts during
    // teleportToLevel don't hang waiting for keypress.
    const autoInput = createHeadlessInput();
    // Poll for pending input waits and auto-feed space keys.
    // setTimeout(fn, 0) can't fire during deeply nested async chains,
    // so we use setInterval to reliably break through.
    const autoFeeder = setInterval(() => {
        if (autoInput.isWaitingInput()) autoInput.pushKey(32);
    }, 10);
    const game = await headlessStart(seed, {
        wizard: true,
        roleIndex: Number.isInteger(options.roleIndex) ? options.roleIndex : 11,
        startDnum: options.startDnum,
        startDlevel: 1,
        startDungeonAlign: options.startDungeonAlign,
        flags: options.flags,
        input: autoInput,
    });

    for (let depth = 1; depth <= targetDepth; depth++) {
        if (depth > 1) {
            await game.teleportToLevel(depth);
        }
        grids[depth] = game.getTypGrid();
        maps[depth] = (game.map || game.map);
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
    clearInterval(autoFeeder);
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
        map: (game.map || game.map),
        player: (game.u || game.u),
        grid: game.getTypGrid(),
        rngCalls: startupRng.length,
        rng: startupRng,
    };
}

function extractCharacterFromSession(session = {}) {
    // Prefer nethackrc, fall back to options for legacy callers.
    const rc = session.nethackrc || session.raw?.nethackrc || '';
    if (rc) {
        return parseNethackrcFull(rc).character;
    }
    const opts = session.options || session.meta?.options || {};
    return {
        name: opts.name,
        role: opts.role,
        race: opts.race,
        gender: opts.gender,
        align: opts.align,
    };
}

// HeadlessDisplay is now unified with Display — passing null containerId
// creates a headless instance. Re-export for backward compatibility.
export { Display as HeadlessDisplay } from './display.js';

// === HeadlessDisplay class deleted (Phase 3 Terminal refactoring) ===
// All methods now live in Display (js/display.js), which works in both
// browser (containerId set) and headless (containerId=null) modes.

// HeadlessGame is now an alias for NetHackGame with static factory methods attached.
// Callers using HeadlessGame.start(), HeadlessGame.fromSeed() continue to work.
// These are now async — callers must await them.
NetHackGame.fromSeed = headlessFromSeed;
NetHackGame.start = headlessStart;
NetHackGame.headless = headlessFromSeed;
export { NetHackGame as HeadlessGame };
