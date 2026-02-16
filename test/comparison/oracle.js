// oracle.js - Minimal headless game runner for testing
//
// Provides createHeadlessGame() which returns a game instance that can:
// - Run with parityTestInit() for C-parity testing
// - Feed keystrokes via feedKey()
// - Access RNG logging via rng.enableRngLog() / getRngLog()

// ============================================================================
// Browser Stubs (must run first for Node.js environment)
// ============================================================================

let headlessUrl = 'http://localhost/?wizard=1';

if (typeof window === 'undefined') {
    globalThis.window = {
        get location() {
            const urlObj = new URL(headlessUrl);
            return { href: headlessUrl, search: urlObj.search, reload: () => {} };
        },
        set location(val) { headlessUrl = val.href || val; },
        addEventListener: () => {},
        gameFlags: {},
        gameDisplay: null,
        gameInstance: null,
    };
}
if (typeof document === 'undefined') {
    globalThis.document = {
        addEventListener: () => {},
        getElementById: () => null,
        createElement: () => ({ style: {}, appendChild: () => {}, click: () => {} }),
        body: { appendChild: () => {}, removeChild: () => {} },
    };
}
if (typeof URL === 'undefined') {
    globalThis.URL = class URL {
        constructor(href) {
            this.href = href;
            const searchMatch = href.match(/\?(.*)$/);
            this.search = searchMatch ? '?' + searchMatch[1] : '';
            this.searchParams = new URLSearchParams(this.search);
        }
    };
}
if (typeof URLSearchParams === 'undefined') {
    globalThis.URLSearchParams = class URLSearchParams {
        constructor(search = '') {
            this._params = {};
            if (search.startsWith('?')) search = search.slice(1);
            for (const part of search.split('&')) {
                const [k, v] = part.split('=');
                if (k) this._params[k] = decodeURIComponent(v || '');
            }
        }
        get(k) { return this._params[k] ?? null; }
        has(k) { return k in this._params; }
        *[Symbol.iterator]() { for (const k in this._params) yield [k, this._params[k]]; }
    };
}

const localStorageStore = {};
globalThis.localStorage = {
    getItem: (k) => localStorageStore[k] || null,
    setItem: (k, v) => { localStorageStore[k] = v; },
    removeItem: (k) => { delete localStorageStore[k]; },
    clear: () => { for (const k in localStorageStore) delete localStorageStore[k]; },
    get length() { return Object.keys(localStorageStore).length; },
    key: (i) => Object.keys(localStorageStore)[i] || null,
};

// ============================================================================
// Main Entry Point
// ============================================================================

// Create a headless game instance
// Returns { game, feedKey, rng, ... } on success, or { error } on failure
export async function createHeadlessGame(seed, options = {}) {
    const { modules: m, error } = await loadModules();
    if (error) return { error };

    m.rng.enableRngLog();
    const display = new HeadlessDisplay();
    const game = new m.HeadlessNetHackGame(seed, options);
    game.display = display;
    if (m.clearInputQueue) m.clearInputQueue();

    let gamePromise = null;
    let gameStarted = false;

    const startGame = async () => {
        if (gameStarted) return;
        gameStarted = true;
        gamePromise = (async () => {
            await game.init();
            await game.gameLoop();
        })().catch(e => console.error('Game error:', e));
        await new Promise(resolve => setImmediate(resolve));
    };

    const feedKey = async (keyCode) => {
        if (!gameStarted) await startGame();
        m.pushInput(keyCode);
        await new Promise(resolve => setImmediate(resolve));
        for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
    };

    const startGameLoop = async () => {
        if (gamePromise) return;
        gameStarted = true;
        gamePromise = game.gameLoop().catch(e => console.error('Game error:', e));
        await new Promise(resolve => setImmediate(resolve));
    };

    return {
        game,
        display,
        feedKey,
        startGame,
        startGameLoop,
        markGameStarted: () => { gameStarted = true; },
        rng: m.rng,
        extractTypGrid: () => extractTypGrid(game.map),
        getScreen: () => display.getLines(),
    };
}

export function setHeadlessUrl(url) {
    headlessUrl = url;
    if (typeof window !== 'undefined') {
        const urlObj = new URL(url);
        window.location.href = url;
        window.location.search = urlObj.search;
    }
}

// ============================================================================
// Module Loading
// ============================================================================

async function loadModules() {
    const m = {};
    try {
        m.rng = await import('../../js/rng.js');
        if (!m.rng.enableRngLog) return { error: 'rng.js missing enableRngLog' };
    } catch (e) {
        return { error: `Cannot load rng.js: ${e.message}` };
    }
    try {
        const input = await import('../../js/input.js');
        if (!input.pushInput) return { error: 'input.js missing pushInput' };
        m.pushInput = input.pushInput;
        m.clearInputQueue = input.clearInputQueue;
    } catch (e) {
        return { error: `Cannot load input.js: ${e.message}` };
    }
    try {
        m.HeadlessNetHackGame = await createHeadlessGameClass();
    } catch (e) {
        return { error: `Cannot create HeadlessNetHackGame: ${e.message}` };
    }
    return { modules: m };
}

// ============================================================================
// HeadlessNetHackGame Class
// ============================================================================

let HeadlessNetHackGameClass = null;

async function createHeadlessGameClass() {
    if (HeadlessNetHackGameClass) return HeadlessNetHackGameClass;

    const { NetHackGame } = await import('../../js/nethack.js');
    const { initRng, setGameSeed } = await import('../../js/rng.js');

    let initLevelGeneration, setSeed, simulatePostLevelInit, setMakemonPlayerContext, loadFlags;
    try { const d = await import('../../js/dungeon.js'); initLevelGeneration = d.initLevelGeneration; setSeed = d.setGameSeed; } catch {}
    try { const u = await import('../../js/u_init.js'); simulatePostLevelInit = u.simulatePostLevelInit; } catch {}
    try { const m = await import('../../js/makemon.js'); setMakemonPlayerContext = m.setMakemonPlayerContext; } catch {}
    try { const s = await import('../../js/storage.js'); loadFlags = s.loadFlags; } catch {}

    let rngFuncs = null;
    try {
        const rng = await import('../../js/rng.js');
        rngFuncs = { rn2: rng.rn2, rnd: rng.rnd, rn1: rng.rn1, rnl: rng.rnl, rne: rng.rne, rnz: rng.rnz, d: rng.d };
    } catch {}

    const hasInitImpl = typeof NetHackGame.prototype?.initImplementation === 'function';

    HeadlessNetHackGameClass = class HeadlessNetHackGame extends NetHackGame {
        constructor(seed, options = {}) {
            super();
            this._headlessSeed = seed;
            this._headlessOptions = options;
            this._rngFuncs = rngFuncs;
        }

        async init() {
            let flags = {};
            try { flags = loadFlags ? loadFlags() : {}; } catch {}
            flags = { pickup: false, verbose: false, safe_wait: true, ...flags };
            if (this._headlessOptions.name) flags.name = this._headlessOptions.name;

            if (hasInitImpl) {
                await this.initImplementation({
                    seed: this._headlessSeed,
                    wizard: this._headlessOptions.wizard,
                    display: this.display,
                    flags,
                });
            } else {
                this.flags = flags;
                await super.init();
            }
        }

        async parityTestInit(session) {
            const charOpts = getSessionCharacter(session);
            const roleIndex = ROLE_INDEX[charOpts.role] ?? 11;
            const preStartupRng = getPreStartupRngEntries(session);

            let flags = {};
            try { flags = loadFlags ? loadFlags() : {}; } catch {}
            flags = { pickup: false, verbose: false, safe_wait: true, ...flags };

            if (hasInitImpl) {
                await super.initImplementation({
                    seed: this._headlessSeed,
                    mode: 'gameplay',
                    wizard: this._headlessOptions.wizard ?? true,
                    display: this.display,
                    flags,
                    preStartupRng,
                    roleIndex,
                    race: RACE_INDEX[charOpts.race] ?? 0,
                    align: ALIGN_VALUE[charOpts.align] ?? 0,
                    gender: charOpts.gender === 'female' ? 1 : 0,
                    name: charOpts.name || 'Wizard',
                });
            } else {
                // Legacy path for old versions
                this.wizard = this._headlessOptions.wizard ?? true;
                this.seed = this._headlessSeed;
                initRng(this._headlessSeed);
                if (setGameSeed) setGameSeed(this._headlessSeed);
                if (setSeed) setSeed(this._headlessSeed);

                for (const entry of preStartupRng) consumeRngEntry(entry, this._rngFuncs);

                try { this.flags = loadFlags ? loadFlags() : {}; } catch { this.flags = {}; }
                this.flags = { pickup: false, verbose: false, safe_wait: true, ...this.flags };
                window.gameFlags = this.flags;
                window.gameDisplay = this.display;
                window.gameInstance = this;

                this.player.initRole(roleIndex);
                this.player.name = charOpts.name || 'Wizard';
                this.player.gender = charOpts.gender === 'female' ? 1 : 0;
                this.player.race = RACE_INDEX[charOpts.race] ?? 0;
                this.player.alignment = ALIGN_VALUE[charOpts.align] ?? 0;
                this.player.wizard = this.wizard;
                this.flags.name = charOpts.name || 'Wizard';

                if (setMakemonPlayerContext) {
                    this.player.roleIndex = roleIndex;
                    setMakemonPlayerContext(this.player);
                }
                if (initLevelGeneration) initLevelGeneration(roleIndex);

                this.changeLevel(1);
                if (this.map.upstair) {
                    this.player.x = this.map.upstair.x;
                    this.player.y = this.map.upstair.y;
                } else {
                    this.placePlayerOnLevel();
                }

                if (simulatePostLevelInit) {
                    const initResult = simulatePostLevelInit(this.player, this.map, 1);
                    this.seerTurn = initResult?.seerTurn;
                }

                this.fov.compute(this.map, this.player.x, this.player.y);
                this.display.renderMap(this.map, this.player, this.fov, this.flags);
                this.display.renderStatus(this.player);
            }
        }
    };

    return HeadlessNetHackGameClass;
}

// ============================================================================
// HeadlessDisplay
// ============================================================================

class HeadlessDisplay {
    constructor(cols = 80, rows = 24) {
        this.cols = cols;
        this.rows = rows;
        this.grid = [];
        this.topMessage = '';
        this.messages = [];
        this._initGrid();
    }

    _initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = Array(this.cols).fill(null).map(() => ({ ch: ' ', color: 7, attr: 0 }));
        }
    }

    setCell(col, row, ch, color, attr = 0) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = { ch, color, attr };
        }
    }

    getLines() { return this.grid.map(row => row.map(c => c.ch).join('')); }
    putstr_message(msg) { this.topMessage = msg; this.messages.push(msg); }
    putstr(col, row, text, color) {
        if (typeof row === 'string') { color = text; text = row; row = col; col = 0; }
        for (let i = 0; i < text.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, text[i], color || 7);
        }
    }
    clearRow(row) { for (let c = 0; c < this.cols; c++) this.setCell(c, row, ' ', 7); }
    clearScreen() { this._initGrid(); }
    renderMap() {}
    renderStatus() {}
    renderChargenMenu(lines) { this.chargenMenu = lines; if (lines?.[0]) this.topMessage = lines[0]; }
    renderLoreText() {}
    renderTombstone() {}
    setCellInfo() {}
    async morePrompt(nhgetch) { await nhgetch(); }
    async showMenu() { return null; }
}

// ============================================================================
// Session Helpers (for C-parity testing)
// ============================================================================

const ROLE_INDEX = {
    'Archeologist': 0, 'Barbarian': 1, 'Caveman': 2, 'Cavewoman': 2,
    'Healer': 3, 'Knight': 4, 'Monk': 5, 'Priest': 6, 'Priestess': 6,
    'Ranger': 7, 'Rogue': 8, 'Samurai': 9, 'Tourist': 10,
    'Valkyrie': 11, 'Wizard': 12,
};
const RACE_INDEX = { 'human': 0, 'elf': 1, 'dwarf': 2, 'gnome': 3, 'orc': 4 };
const ALIGN_VALUE = { 'lawful': 1, 'neutral': 0, 'chaotic': -1 };

function getSessionCharacter(session) {
    if (session.options) {
        return {
            name: session.options.name || 'Wizard',
            role: session.options.role || 'Valkyrie',
            race: session.options.race || 'human',
            gender: session.options.gender || 'female',
            align: session.options.align || session.options.alignment || 'neutral',
        };
    }
    return { name: 'Wizard', role: 'Valkyrie', race: 'human', gender: 'female', align: 'neutral' };
}

function getPreStartupRngEntries(session) {
    const out = [];
    const isConfirm = a => a === 'confirm' || a === 'confirm-ok' || a === 'confirm-character';

    if (session.type === 'chargen') {
        for (const step of (session.steps || [])) {
            if (isConfirm(step.action)) break;
            out.push(...(step.rng || []));
        }
    } else if (session.chargen?.length > 0) {
        const confirmIdx = session.chargen.findIndex(s => isConfirm(s.action));
        for (let i = 0; i < confirmIdx && i < session.chargen.length; i++) {
            out.push(...(session.chargen[i].rng || []));
        }
    }
    return out;
}

function consumeRngEntry(entry, rngFuncs) {
    if (!entry || !rngFuncs) return;
    const call = typeof entry === 'string' ? entry.split('@')[0].trim() : '';
    const match = call.match(/^([a-z0-9_]+)\(([^)]*)\)=/i);
    if (!match) return;
    const fn = match[1];
    const args = match[2].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    switch (fn) {
        case 'rn2': rngFuncs.rn2?.(args[0]); break;
        case 'rnd': rngFuncs.rnd?.(args[0]); break;
        case 'rn1': rngFuncs.rn1?.(args[0], args[1]); break;
        case 'rnl': rngFuncs.rnl?.(args[0]); break;
        case 'rne': rngFuncs.rne?.(args[0]); break;
        case 'rnz': rngFuncs.rnz?.(args[0]); break;
        case 'd': rngFuncs.d?.(args[0], args[1]); break;
    }
}

function extractTypGrid(map, COLNO = 80, ROWNO = 21) {
    const grid = [];
    for (let y = 0; y < ROWNO; y++) {
        const row = [];
        for (let x = 0; x < COLNO; x++) {
            const loc = map?.at?.(x, y);
            row.push(loc ? loc.typ : 0);
        }
        grid.push(row);
    }
    return grid;
}
