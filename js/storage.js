// storage.js -- Browser localStorage persistence
// Mirrors C NetHack's save.c / restore.c function hierarchy.
// All save/restore functions live here so they can be compared
// side-by-side with their C counterparts.
//
// Save hierarchy (C ref):              Restore hierarchy (C ref):
// ─────────────────────                ──────────────────────────
// buildSaveData (dosave0)              restoreFromSave (dorecover)
//  ├─ saveLev (savelev)                 ├─ restLev (getlev)
//  │   ├─ saveMonChn (savemonchn)       │   ├─ restMonChn
//  │   │   └─ saveMon (savemon)         │   │   └─ restMon
//  │   │       └─ saveObjChn            │   │       └─ restObjChn
//  │   ├─ saveTrapChn (savetrapchn)     │   ├─ restTrapChn
//  │   └─ saveObjChn (saveobjchn)       │   └─ restObjChn
//  │       └─ saveObj (saveobj)         │       └─ restObj
//  └─ saveGameState (savegamestate)     └─ restGameState (restgamestate)
//      ├─ saveYou (Sfo_you)                 ├─ restYou (Sfi_you)
//      └─ saveObjChn (inventory)            └─ restObjChn (inventory)

import { ynFunction } from './input.js';
import { mons } from './monsters.js';
import { def_monsyms } from './symbols.js';
import { CLASS_SYMBOLS } from './objects.js';
import { COLNO, ROWNO } from './const.js';
import { Player } from './player.js';
import { CONFUSION, STUNNED, BLINDED, HALLUC, SICK,
         TIMEOUT, SICK_VOMITABLE, SICK_NONVOMITABLE } from './const.js';
import { GameMap } from './game.js';
import { makeRoom } from './mkroom.js';
import { getDiscoveryState, setDiscoveryState } from './o_init.js';
import { nh_delay_output } from './animation.js';
import { roles, races } from './role.js';

const SAVE_KEY = 'menace-save';
const AUTOSAVE_KEY = 'menace-autosave';
const BONES_KEY_PREFIX = 'menace-bones-';
const SAVE_META_KEY = 'menace-save-meta';
const AUTOSAVE_META_KEY = 'menace-autosave-meta';
const OPTIONS_KEY = 'menace-options';
const TOPTEN_KEY = 'menace-topten';
const FS_KEY = 'menace-fs';
const SAVE_VERSION = 2;

// Safe localStorage access -- returns null when unavailable (e.g. Node.js tests).
// In Node.js 22+, globalThis.localStorage exists but warns without --localstorage-file.
// Suppress that one-time warning on first access.
let _storageWarned = false;
let _mockStorage = null;
function isStorageLike(s) {
    return !!s
        && typeof s.getItem === 'function'
        && typeof s.setItem === 'function'
        && typeof s.removeItem === 'function';
}
// Inject a mock storage for unit tests. Pass null to restore normal behavior.
export function setStorageForTesting(mock) { _mockStorage = mock; }
function storage() {
    if (_mockStorage) return _mockStorage;
    try {
        if (typeof localStorage === 'undefined') return null;
        if (!_storageWarned && typeof process !== 'undefined' && typeof window === 'undefined') {
            // Node.js: accessing localStorage triggers a warning. Suppress it once.
            _storageWarned = true;
            const orig = process.emitWarning;
            process.emitWarning = function(msg, ...args) {
                if (typeof msg === 'string' && msg.includes('--localstorage-file')) return;
                return orig.call(this, msg, ...args);
            };
            const s = localStorage;
            process.emitWarning = orig;
            return isStorageLike(s) ? s : null;
        }
        return isStorageLike(localStorage) ? localStorage : null;
    } catch (e) { return null; }
}

// ========================================================================
// Virtual filesystem -- localStorage-backed flat file system.
// Stored as a single JSON object under the 'menace-fs' key.
// ========================================================================

function _readFs() {
    const s = storage();
    if (!s) return {};
    try {
        const raw = s.getItem(FS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function _writeFs(fsObj) {
    const s = storage();
    if (!s) return false;
    try {
        s.setItem(FS_KEY, JSON.stringify(fsObj));
        return true;
    } catch (e) { return false; }
}

export function vfsReadFile(path) {
    const fs = _readFs();
    return path in fs ? fs[path] : null;
}

export function vfsWriteFile(path, content) {
    const fs = _readFs();
    fs[path] = content;
    return _writeFs(fs);
}

export function vfsDeleteFile(path) {
    const fs = _readFs();
    if (!(path in fs)) return false;
    delete fs[path];
    _writeFs(fs);
    return true;
}

export function vfsListFiles(prefix) {
    const fs = _readFs();
    const paths = Object.keys(fs);
    return prefix ? paths.filter(p => p.startsWith(prefix)) : paths;
}

// ========================================================================
// Object save/restore -- C ref: save.c saveobj() / restore.c restobj()
// ========================================================================

// C ref: saveobj() — strip derived display fields, recurse contents
export function saveObj(obj) {
    const data = { ...obj };
    delete data.displayChar;
    if (data.contents && data.contents.length > 0) {
        data.contents = saveObjChn(data.contents);
    }
    return data;
}

// C ref: saveobjchn() — save a chain of objects
export function saveObjChn(list) {
    return (list || []).map(saveObj);
}

// C ref: restobj() — rebuild displayChar from oclass, recurse contents
export function restObj(data) {
    const obj = { ...data };
    obj.displayChar = CLASS_SYMBOLS[obj.oclass] || '?';
    if (obj.contents && obj.contents.length > 0) {
        obj.contents = restObjChn(obj.contents);
    }
    return obj;
}

// C ref: restobjchn() — restore a chain of objects
export function restObjChn(list) {
    return (list || []).map(restObj);
}

// ========================================================================
// Monster save/restore -- C ref: save.c savemon() / restore.c restmon()
// ========================================================================

// C ref: savemon() — strip derived references, save inventory chain
export function saveMon(mon) {
    const data = { ...mon };
    // Remove derived references -- rebuilt from mndx on restore
    delete data.data;
    delete data.type;
    delete data.attacks;
    delete data.displayChar;
    delete data.displayColor;
    // Save monster inventory (pets carry items)
    if (data.minvent && data.minvent.length > 0) {
        data.minvent = saveObjChn(data.minvent);
    }
    return data;
}

// C ref: savemonchn() — save a chain of monsters
export function saveMonChn(list) {
    return (list || []).map(saveMon);
}

// C ref: restmon() — rebuild type/attacks/display from mndx, restore inventory
export function restMon(data) {
    const mon = { ...data };
    const ptr = mons[mon.mndx];
    mon.data = ptr;
    mon.type = ptr;
    mon.attacks = ptr.mattk;
    const symEntry = def_monsyms[ptr.mlet];
    mon.displayChar = symEntry ? symEntry.sym : '?';
    mon.displayColor = ptr.mcolor;
    // Restore monster inventory
    if (mon.minvent && mon.minvent.length > 0) {
        mon.minvent = restObjChn(mon.minvent);
    }
    // Reconstruct mtrack if missing
    if (!mon.mtrack) {
        mon.mtrack = [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}];
    }
    return mon;
}

// C ref: restmonchn() — restore a chain of monsters
export function restMonChn(list) {
    return (list || []).map(restMon);
}

// ========================================================================
// Trap save/restore -- C ref: save.c savetrapchn()
// ========================================================================

// C ref: savetrapchn() — save a chain of traps
export function saveTrapChn(list) {
    return (list || []).map(t => ({ ...t }));
}

// Restore a chain of traps
export function restTrapChn(list) {
    return (list || []).map(t => ({ ...t }));
}

// ========================================================================
// Level save/restore -- C ref: save.c savelev() / restore.c getlev()
// ========================================================================

// C ref: savelev() — save a complete level
export function saveLev(map) {
    // Grid: shallow copy each location
    const locations = [];
    for (let x = 0; x < COLNO; x++) {
        const col = [];
        for (let y = 0; y < ROWNO; y++) {
            col.push({ ...map.locations[x][y] });
        }
        locations.push(col);
    }
    // Rooms: shallow copy, skip sbrooms (object references)
    const rooms = map.rooms.map(r => {
        const copy = { ...r };
        delete copy.sbrooms;
        return copy;
    });
    return {
        locations,
        rooms,
        nroom: map.nroom,
        doors: map.doors.map(d => ({ ...d })),
        doorindex: map.doorindex,
        upstair: { ...map.upstair },
        dnstair: { ...map.dnstair },
        smeq: [...map.smeq],
        flags: { ...map.flags },
        monsters: saveMonChn(map.monsters),
        objects: saveObjChn(map.objects),
        traps: saveTrapChn(map.traps),
        isBones: map.isBones || false,
    };
}

// C ref: getlev() — restore a complete level into a GameMap
export function restLev(data) {
    const map = new GameMap();
    // Restore locations
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            if (data.locations[x] && data.locations[x][y]) {
                Object.assign(map.locations[x][y], data.locations[x][y]);
            }
        }
    }
    // Restore rooms
    map.rooms = (data.rooms || []).map(r => {
        const room = makeRoom();
        Object.assign(room, r);
        room.sbrooms = [];
        return room;
    });
    map.nroom = data.nroom || map.rooms.length;
    // Restore doors
    map.doors = (data.doors || []).map(d => ({ ...d }));
    map.doorindex = data.doorindex || 0;
    // Stairs
    map.upstair = data.upstair ? { ...data.upstair } : { x: 0, y: 0 };
    map.dnstair = data.dnstair ? { ...data.dnstair } : { x: 0, y: 0 };
    // smeq
    map.smeq = data.smeq ? [...data.smeq] : [];
    // Flags
    if (data.flags) map.flags = { ...map.flags, ...data.flags };
    // Monsters
    map.monsters = restMonChn(data.monsters);
    // Objects
    map.objects = restObjChn(data.objects);
    // Traps
    map.traps = restTrapChn(data.traps);
    // Bones flag
    if (data.isBones) map.isBones = true;
    return map;
}

// ========================================================================
// RNG state serialization (internal to saveGameState/restGameState)
// ========================================================================

// Serialize ISAAC64 context (BigInt fields -> hex strings for JSON)
export function serializeRng(ctx) {
    return {
        a: ctx.a.toString(16),
        b: ctx.b.toString(16),
        c: ctx.c.toString(16),
        n: ctx.n,
        r: ctx.r.map(v => v.toString(16)),
        m: ctx.m.map(v => v.toString(16)),
    };
}

// Deserialize ISAAC64 context (hex strings -> BigInt)
export function deserializeRng(data) {
    return {
        a: BigInt('0x' + data.a),
        b: BigInt('0x' + data.b),
        c: BigInt('0x' + data.c),
        n: data.n,
        r: data.r.map(v => BigInt('0x' + v)),
        m: data.m.map(v => BigInt('0x' + v)),
    };
}

// ========================================================================
// Player save/restore -- C ref: save.c Sfo_you() / restore.c Sfi_you()
// ========================================================================

// Equipment slot names (C ref: decl.h uarm, uarmc, uarmh, etc.)
const EQUIP_SLOTS = ['weapon', 'armor', 'shield', 'helmet',
                     'gloves', 'boots', 'cloak', 'amulet',
                     'leftRing', 'rightRing'];

// C ref: Sfo_you() — save player struct (primitives only, no inventory)
export function saveYou(player) {
    return {
        x: player.x, y: player.y,
        name: player.name, roleIndex: player.roleIndex,
        race: player.race, gender: player.gender, alignment: player.alignment,
        alignmentRecord: player.alignmentRecord, alignmentAbuse: player.alignmentAbuse,
        hp: player.uhp, hpmax: player.uhpmax, pw: player.pw, pwmax: player.pwmax,
        ac: player.ac, level: player.ulevel, exp: player.exp, score: player.score,
        attributes: [...player.attributes],
        dungeonLevel: player.dungeonLevel, maxDungeonLevel: player.maxDungeonLevel,
        gold: player.gold, hunger: player.hunger, nutrition: player.nutrition,
        movement: player.movement, speed: player.speed, moved: player.moved,
        luck: player.luck, moreluck: player.moreluck,
        uprops: player.uprops ? { ...player.uprops } : {},
        usick_type: player.usick_type || 0,
        lastInvlet: player.lastInvlet,
        turns: player.turns, showExp: player.showExp,
    };
}

// C ref: Sfi_you() — restore player struct (primitives only)
export function restYou(data) {
    const p = new Player();
    const fields = [
        'x', 'y', 'name', 'roleIndex', 'race', 'gender', 'alignment',
        'alignmentRecord', 'alignmentAbuse',
        'hp', 'hpmax', 'pw', 'pwmax', 'ac', 'level', 'exp', 'score',
        'dungeonLevel', 'maxDungeonLevel', 'gold', 'hunger', 'nutrition',
        'movement', 'speed', 'moved', 'luck', 'moreluck',
        'turns', 'showExp',
        'lastInvlet',
    ];
    for (const f of fields) {
        if (data[f] !== undefined) p[f] = data[f];
    }
    if (data.attributes) p.attributes = [...data.attributes];
    // Restore uprops if present (new format)
    if (data.uprops && typeof data.uprops === 'object') {
        p.uprops = {};
        for (const [key, entry] of Object.entries(data.uprops)) {
            p.uprops[key] = { ...entry };
        }
        p.usick_type = data.usick_type || 0;
    } else {
        // Backward compat: convert old boolean fields to uprops
        if (data.confused) p.confused = true;
        if (data.stunned) p.stunned = true;
        if (data.blind) p.blind = true;
        if (data.hallucinating) p.hallucinating = true;
        if (data.sick) p.sick = true;
        if (data.foodpoisoned) p.foodpoisoned = true;
    }
    return p;
}

// Wire equipment slot references from index map into inventory array.
// C ref: done during restgamestate — equip pointers point into invent chain
export function wireEquip(player, equip) {
    for (const slot of EQUIP_SLOTS) {
        const idx = equip[slot];
        player[slot] = (idx >= 0 && idx < player.inventory.length)
            ? player.inventory[idx]
            : null;
    }
}

// Build equipment index map from player state.
// C ref: part of savegamestate — equip as inventory indices
export function saveEquip(player) {
    const indices = {};
    for (const slot of EQUIP_SLOTS) {
        indices[slot] = player[slot]
            ? player.inventory.indexOf(player[slot])
            : -1;
    }
    return indices;
}

// ========================================================================
// Game state save/restore -- C ref: save.c savegamestate() / restore.c restgamestate()
// ========================================================================

// C ref: savegamestate() — save game context + you + inventory + equip + rng + flags
export function saveGameState(game) {
    const { player, display } = game;
    const { getRngState, getRngCallCount } = game._rngAccessors;
    return {
        turnCount: game.turnCount,
        wizard: game.wizard,
        seerTurn: game.seerTurn,
        seed: game.seed,
        rng: serializeRng(getRngState()),
        rngCallCount: getRngCallCount(),
        you: saveYou(player),
        invent: saveObjChn(player.inventory),
        equip: saveEquip(player),
        discovery: getDiscoveryState(),
        messages: display.messages.slice(-200),
        flags: game.flags || null,
    };
}

// C ref: restgamestate() — restore game context + you + inventory + equip + flags
// Returns { player, turnCount, wizard, seerTurn, seed, rng, rngCallCount, messages, flags }
export function restGameState(gameState) {
    setDiscoveryState(gameState.discovery || null);
    const player = restYou(gameState.you);
    player.inventory = restObjChn(gameState.invent);
    wireEquip(player, gameState.equip || {});
    return {
        player,
        turnCount: gameState.turnCount || 0,
        wizard: gameState.wizard || false,
        seerTurn: gameState.seerTurn || 0,
        seed: gameState.seed,
        rng: gameState.rng,
        rngCallCount: gameState.rngCallCount,
        messages: gameState.messages || [],
        flags: gameState.flags || null,
    };
}

// ========================================================================
// Top-level save/restore -- C ref: save.c dosave0() / restore.c dorecover()
// ========================================================================

// C ref: dosave0() — build complete save data (current level first, then game state, then other levels)
export function buildSaveData(game) {
    const { player, map } = game;
    const currentDepth = player.dungeonLevel;

    // Current level (saved first, like C)
    const currentLevel = map ? saveLev(map) : null;

    // Game state (player, inventory, equip, rng, context)
    const gameState = saveGameState(game);

    // Other cached levels
    const otherLevels = {};
    for (const [depth, levelMap] of Object.entries(game.levels)) {
        if (Number(depth) !== currentDepth) {
            otherLevels[depth] = saveLev(levelMap);
        }
    }

    return {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        currentDepth,
        currentLevel,
        gameState,
        otherLevels,
    };
}

// Build a lightweight metadata object describing the current player state.
// Used to generate meaningful filenames for save/autosave listings.
export function buildSaveMeta(game) {
    const { player } = game;
    const role = roles[player.roleIndex];
    const race = races[player.race];
    const raceName = race ? race.name : 'unknown';
    return {
        name: player.name || 'rodney',
        role: role ? role.abbr : '???',
        race: raceName.charAt(0).toUpperCase() + raceName.slice(0, 2),
        align: player.alignment > 0 ? 'Law' : player.alignment < 0 ? 'Cha' : 'Neu',
        gender: player.gender === 1 ? 'Fem' : 'Mal',
        xp: player.ulevel,
        dlvl: player.dungeonLevel,
        turns: player.turns,
    };
}

// Save lightweight character metadata for filename generation and date display.
function saveSaveMeta(game) {
    const s = storage();
    if (!s) return;
    try {
        const meta = { ...buildSaveMeta(game), saved: Date.now() };
        s.setItem(SAVE_META_KEY, JSON.stringify(meta));
    } catch (e) { /* ignore */ }
}

// Load save metadata. Returns object or null.
export function loadSaveMeta() {
    try {
        const s = storage();
        if (!s) return null;
        return JSON.parse(s.getItem(SAVE_META_KEY) || 'null');
    } catch (e) { return null; }
}

// Save autosave metadata (same structure, separate key).
function saveAutosaveMeta(game) {
    const s = storage();
    if (!s) return;
    try {
        const meta = { ...buildSaveMeta(game), saved: Date.now() };
        s.setItem(AUTOSAVE_META_KEY, JSON.stringify(meta));
    } catch (e) { /* ignore */ }
}

// Load autosave metadata. Returns object or null.
export function loadAutosaveMeta() {
    try {
        const s = storage();
        if (!s) return null;
        return JSON.parse(s.getItem(AUTOSAVE_META_KEY) || 'null');
    } catch (e) { return null; }
}

// Save the game to localStorage. Returns true on success.
export function saveGame(game) {
    const s = storage();
    if (!s) return false;
    try {
        saveSaveMeta(game);
        const data = buildSaveData(game);
        const json = JSON.stringify(data);
        s.setItem(SAVE_KEY, json);
        return true;
    } catch (e) {
        console.error('Failed to save game:', e);
        return false;
    }
}

// Load saved game data from localStorage. Returns parsed object or null.
export function loadSave() {
    const s = storage();
    if (!s) return null;
    try {
        const json = s.getItem(SAVE_KEY);
        if (!json) return null;
        const data = JSON.parse(json);
        if (!data || data.version !== SAVE_VERSION) return null;
        return data;
    } catch (e) {
        console.error('Failed to load save:', e);
        return null;
    }
}

// Delete the save from localStorage.
export function deleteSave() {
    const s = storage();
    if (!s) return;
    try { s.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// Autosave — crash recovery only. Deleted synchronously on death.
// Disabled in headless/test environments (storage() returns null in Node.js).
// Set game.flags.autosave = true to enable; false to disable explicitly.

let _autosaveInFlight = false;
let _autosavePending = null;
let _autosaveCancelled = false;  // set by deleteAutosave() to abort an in-flight gzip write

// Compress a string using the built-in CompressionStream API (gzip).
// Returns a base64-encoded string, or null if CompressionStream is unavailable.
async function _gzipToBase64(str) {
    if (typeof CompressionStream === 'undefined') return null;
    try {
        const bytes = new TextEncoder().encode(str);
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const chunks = [];
        const reader = cs.readable.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const total = chunks.reduce((n, c) => n + c.length, 0);
        const merged = new Uint8Array(total);
        let off = 0;
        for (const c of chunks) { merged.set(c, off); off += c.length; }
        // btoa requires a binary string
        let binary = '';
        for (let i = 0; i < merged.length; i++) binary += String.fromCharCode(merged[i]);
        return btoa(binary);
    } catch (e) {
        return null;
    }
}

// Decompress a base64-encoded gzip string produced by _gzipToBase64.
async function _base64GunzipToString(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const chunks = [];
    const reader = ds.readable.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    return new TextDecoder().decode(
        chunks.reduce((acc, c) => { const m = new Uint8Array(acc.length + c.length); m.set(acc); m.set(c, acc.length); return m; }, new Uint8Array(0))
    );
}

async function _runAutosave(snapshot) {
    _autosaveInFlight = true;
    try {
        const s = storage();
        if (s) {
            const json = JSON.stringify(snapshot);
            const compressed = await _gzipToBase64(json);
            // Re-check after the async gap: deleteAutosave() may have run while
            // compression was in progress and already removed the key.
            if (!_autosaveCancelled) {
                if (compressed) {
                    s.setItem(AUTOSAVE_KEY, 'gz:' + compressed);
                } else {
                    s.setItem(AUTOSAVE_KEY, json);
                }
            }
        }
    } catch (e) {
        // Silently ignore autosave failures (storage full, etc.)
    } finally {
        _autosaveInFlight = false;
        if (_autosavePending && !_autosaveCancelled) {
            const next = _autosavePending;
            _autosavePending = null;
            _runAutosave(next);
        }
    }
}

// Schedule an autosave after a completed turn. Fire-and-forget; does not block the game loop.
// Guards: requires storage() to be available AND game.flags.autosave !== false.
export function scheduleAutosave(game) {
    if (!storage()) return;               // no-op in headless/Node.js tests
    if (game.flags?.autosave === false) return;  // explicitly disabled
    _autosaveCancelled = false;           // re-arm after any prior deleteAutosave()
    saveAutosaveMeta(game);              // sync: update metadata for filename/date display
    const snapshot = buildSaveData(game);
    if (_autosaveInFlight) {
        _autosavePending = snapshot;      // replace any queued snapshot
    } else {
        _runAutosave(snapshot);           // start immediately, no await
    }
}

// Load autosave data (for crash recovery on page load). Returns parsed object or null.
// Handles both plain JSON and compressed 'gz:...' format.
export async function loadAutosave() {
    const s = storage();
    if (!s) return null;
    try {
        const raw = s.getItem(AUTOSAVE_KEY);
        if (!raw) return null;
        let json;
        if (raw.startsWith('gz:')) {
            json = await _base64GunzipToString(raw.slice(3));
        } else {
            json = raw;
        }
        const data = JSON.parse(json);
        if (!data || data.version !== SAVE_VERSION) return null;
        return data;
    } catch (e) {
        return null;
    }
}

// Delete the autosave. Must be called synchronously on death, before any await.
// Sets _autosaveCancelled so any in-flight gzip compression does not write back
// after it completes (the async gap between compress and setItem is the race).
export function deleteAutosave() {
    _autosavePending = null;              // drop any queued snapshot
    _autosaveCancelled = true;            // abort any in-flight compression write
    const s = storage();
    if (!s) return;
    try { s.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
    try { s.removeItem(AUTOSAVE_META_KEY); } catch (e) { /* ignore */ }
}

// Check if a save exists without fully parsing it.
export function hasSave() {
    const s = storage();
    if (!s) return false;
    try { return s.getItem(SAVE_KEY) !== null; } catch (e) { return false; }
}

// List all menace save/bones entries in localStorage.
// Returns array of { key, label } describing each stored item.
export function listSavedData() {
    const s = storage();
    if (!s) return [];
    const items = [];
    try {
        for (let i = 0; i < s.length; i++) {
            const key = s.key(i);
            if (key === SAVE_KEY) {
                items.push({ key, label: 'Saved game' });
            } else if (key.startsWith(BONES_KEY_PREFIX)) {
                const depth = key.slice(BONES_KEY_PREFIX.length);
                items.push({ key, label: `Bones file (depth ${depth})` });
            } else if (key === OPTIONS_KEY) {
                items.push({ key, label: 'Options/flags (legacy)' });
            } else if (key === FS_KEY) {
                const files = vfsListFiles();
                items.push({ key, label: `Virtual filesystem (${files.length} file${files.length !== 1 ? 's' : ''})` });
            } else if (key === TOPTEN_KEY) {
                items.push({ key, label: 'High scores' });
            }
        }
    } catch (e) { /* ignore */ }
    return items;
}

// Delete all menace data from localStorage.
export function clearAllData() {
    const s = storage();
    if (!s) return;
    const toRemove = [];
    try {
        for (let i = 0; i < s.length; i++) {
            const key = s.key(i);
            if (key === SAVE_KEY || key === AUTOSAVE_KEY || key === SAVE_META_KEY || key === AUTOSAVE_META_KEY || key.startsWith(BONES_KEY_PREFIX) || key === OPTIONS_KEY || key === TOPTEN_KEY || key === FS_KEY || key === 'menace-dungeon' || key === 'menace-dungeon-when' || key === 'rogue-save') {
                toRemove.push(key);
            }
        }
        for (const key of toRemove) {
            s.removeItem(key);
        }
    } catch (e) { /* ignore */ }
}

// ========================================================================
// Bones files -- C ref: bones.c savebones() / getbones()
// ========================================================================

// Save a bones level for the given depth.
// Only saves if no bones already exist for that depth.
export function saveBones(depth, mapData, playerName, playerX, playerY, playerLevel, inventory) {
    const s = storage();
    if (!s) return false;
    const key = BONES_KEY_PREFIX + depth;
    try {
        // Don't overwrite existing bones (first death wins)
        if (s.getItem(key) !== null) return false;

        const bonesData = {
            version: SAVE_VERSION,
            depth,
            when: Date.now(),
            map: mapData,
            ghost: {
                name: 'Ghost of ' + playerName,
                x: playerX,
                y: playerY,
                level: playerLevel,
            },
            droppedInventory: saveObjChn(inventory),
        };
        s.setItem(key, JSON.stringify(bonesData));
        return true;
    } catch (e) {
        console.error('Failed to save bones:', e);
        return false;
    }
}

// Load bones for a given depth. Returns parsed data or null.
export function loadBones(depth) {
    const s = storage();
    if (!s) return null;
    const key = BONES_KEY_PREFIX + depth;
    try {
        const json = s.getItem(key);
        if (!json) return null;
        const data = JSON.parse(json);
        if (!data || data.version !== SAVE_VERSION) return null;
        return data;
    } catch (e) {
        return null;
    }
}

// Delete bones for a given depth (single-use, matching C behavior).
export function deleteBones(depth) {
    const s = storage();
    if (!s) return;
    try { s.removeItem(BONES_KEY_PREFIX + depth); } catch (e) { /* ignore */ }
}

// ========================================================================
// Flags -- C ref: flag.h struct flag + options.c allopt[]
// ========================================================================

// Complete C NetHack 3.7 defaults (from optlist.h + options.c initoptions_init)
const C_DEFAULTS = {
    // Identity (empty = prompt at start)
    name: '', role: '', race: '', gender: '', alignment: '',
    catname: '', dogname: '', horsename: '', pettype: '',

    // Boolean: ON in C
    acoustics: true, autoopen: true, autodescribe: true, bones: true,
    cmdassist: true, color: true, confirm: true, dark_room: true,
    dropped_nopick: true, fireassist: true, fixinv: true, help: true,
    implicit_uncursed: true, legacy: true, mail: true,
    pickup_stolen: true, pickup_thrown: true,
    safe_pet: true, safe_wait: true, silent: true, sortpack: true,
    sparkle: true, splash_screen: true, status_updates: true,
    tips: true, tombstone: true, travel: true, tutorial: true,
    use_darkgray: true, use_inverse: true, verbose: true,

    // Boolean: OFF in C
    autodig: false, pickup: false, autoquiver: false,
    hilite_pet: false, hilite_pile: false, lit_corridor: false,
    lootabc: false, menucolors: false, number_pad: false,
    perm_invent: false, pushweapon: false, rest_on_space: false,
    showdamage: false, showexp: false, showscore: false, showrace: false, time: false,

    // Compound options
    // C ref: options.c:136 def_inv_order — COIN,AMULET,WEAPON,ARMOR,FOOD,SCROLL,SPBOOK,POTION,RING,WAND,TOOL,GEM,ROCK,BALL,CHAIN
    inv_order: String.fromCharCode(12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16),
    fruit: 'slime mold', pickup_types: '', menustyle: 'full',
    runmode: 'leap', pickup_burden: 'moderate', sortloot: 'loot',
    pile_limit: 5, msghistory: 20, statuslines: 2,
    msg_window: false, DECgraphics: false,
};

// JS-specific overrides from C defaults
const JS_OVERRIDES = {
    DECgraphics: true,  // C has DECgraphics off; we use box-drawing by default
};

// Computed: the effective defaults for this JS port
export const DEFAULT_FLAGS = { ...C_DEFAULTS, ...JS_OVERRIDES };

// C ref: options.c allopt[] — metadata for each option
export const OPTION_DEFS = [
    // String/compound options (C: "Compounds - selecting will prompt for new value")
    { name: 'name', type: 'string', label: 'Your character\'s name', menuChar: 'N',
      help: 'Your character\'s name (e.g., name:Merlin)' },
    { name: 'pickup_types', type: 'string', label: 'Pickup types', menuChar: 'p',
      help: 'Object types to autopickup (e.g., "$/!?+" for gold/potions/scrolls/rings/spellbooks). Empty = all types.' },

    // Boolean options
    { name: 'pickup', type: 'boolean', label: 'Auto-pickup', menuChar: 'a' },
    { name: 'showexp', type: 'boolean', label: 'Show experience', menuChar: 'e' },
    { name: 'color', type: 'boolean', label: 'Color', menuChar: 'c' },
    { name: 'time', type: 'boolean', label: 'Show turns', menuChar: 't' },
    { name: 'safe_pet', type: 'boolean', label: 'Safe pet', menuChar: 's' },
    { name: 'confirm', type: 'boolean', label: 'Confirm attacks', menuChar: 'f' },
    { name: 'verbose', type: 'boolean', label: 'Verbose messages', menuChar: 'v' },
    { name: 'tombstone', type: 'boolean', label: 'Tombstone', menuChar: 'b' },
    { name: 'rest_on_space', type: 'boolean', label: 'Rest on space', menuChar: 'r' },
    { name: 'number_pad', type: 'boolean', label: 'Number pad', menuChar: 'n' },
    { name: 'lit_corridor', type: 'boolean', label: 'Lit corridors', menuChar: 'l' },
    { name: 'DECgraphics', type: 'boolean', label: 'DECgraphics (box-drawing)', menuChar: 'd' },
    { name: 'msg_window', type: 'boolean', label: 'Message window (3 lines)', menuChar: 'm' },
];

// Migrate old option keys to new flag keys
function migrateFlags(saved) {
    // autopickup → pickup (pre-flags rename)
    if ('autopickup' in saved && !('pickup' in saved)) {
        saved.pickup = saved.autopickup;
        delete saved.autopickup;
    }
    // showExp → showexp (case normalization)
    if ('showExp' in saved && !('showexp' in saved)) {
        saved.showexp = saved.showExp;
        delete saved.showExp;
    }
    return saved;
}

function parseBooleanLike(value) {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === '' || v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
    if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
    return true; // Presence with unknown token means enabled.
}

function normalizeOptionKey(rawKey) {
    if (!rawKey) return null;
    const key = String(rawKey).trim();
    if (!key) return null;
    if (key in C_DEFAULTS) return key;
    const lower = key.toLowerCase();
    if (lower === 'autopickup') return 'pickup';
    if (lower === 'showexp') return 'showexp';
    const exactLower = Object.keys(C_DEFAULTS).find((k) => k.toLowerCase() === lower);
    return exactLower || null;
}

function coerceOptionValue(optionKey, rawValue, { implicitBoolean = false } = {}) {
    const defVal = C_DEFAULTS[optionKey];
    if (typeof defVal === 'boolean') {
        if (implicitBoolean) return true;
        return parseBooleanLike(rawValue);
    }
    if (typeof defVal === 'number') {
        const parsed = Number.parseInt(rawValue, 10);
        return Number.isFinite(parsed) ? parsed : defVal;
    }
    return String(rawValue ?? '');
}

function parseNethackOptionsString(spec) {
    const out = {};
    for (const rawToken of String(spec || '').split(',')) {
        const token = rawToken.trim();
        if (!token) continue;

        // !option -> false
        if (token.startsWith('!')) {
            const key = normalizeOptionKey(token.slice(1));
            if (key) out[key] = coerceOptionValue(key, '0');
            continue;
        }

        // nooption -> false (common NetHack syntax)
        if (!token.includes(':') && !token.includes('=')
            && token.toLowerCase().startsWith('no')) {
            const key = normalizeOptionKey(token.slice(2));
            if (key) out[key] = coerceOptionValue(key, '0');
            continue;
        }

        // option:value or option=value
        const colon = token.indexOf(':');
        const equals = token.indexOf('=');
        let sep = -1;
        if (colon === -1) sep = equals;
        else if (equals === -1) sep = colon;
        else sep = Math.min(colon, equals);

        if (sep !== -1) {
            const key = normalizeOptionKey(token.slice(0, sep));
            if (!key) continue;
            const value = token.slice(sep + 1);
            out[key] = coerceOptionValue(key, value);
            continue;
        }

        // bare option -> true
        const key = normalizeOptionKey(token);
        if (!key) continue;
        out[key] = coerceOptionValue(key, '', { implicitBoolean: true });
    }
    return out;
}

// ========================================================================
// .nethackrc serialization -- C ref: options.c all_options_strbuf()
// ========================================================================

// Serialize flags to .nethackrc text format.  Only writes options that
// differ from DEFAULT_FLAGS (the C defaults + JS overrides).
// C ref: cfgfiles.c do_write_config_file(), options.c all_options_strbuf()
export function serializeFlagsToNethackrc(flags) {
    const lines = ['# .nethackrc - Mazes of Menace options'];
    const defaults = DEFAULT_FLAGS;
    // Sort keys for stable output
    const keys = Object.keys(C_DEFAULTS).sort();
    for (const key of keys) {
        if (!(key in flags)) continue;
        const val = flags[key];
        const def = defaults[key];
        // Skip values that match the default
        if (val === def) continue;
        // Skip derived keys
        if (key === 'invlet_constant') continue;
        if (typeof def === 'boolean') {
            lines.push(val ? `OPTIONS=${key}` : `OPTIONS=!${key}`);
        } else {
            lines.push(`OPTIONS=${key}:${val}`);
        }
    }
    lines.push('');  // trailing newline
    return lines.join('\n');
}

// Parse .nethackrc text content into a flags object.
// Handles OPTIONS= directives, comments (#), and blank lines.
export function parseFlagsFromNethackrc(text) {
    const out = {};
    for (const rawLine of String(text || '').split('\n')) {
        // Strip comments
        const commentIdx = rawLine.indexOf('#');
        const line = (commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine).trim();
        if (!line) continue;
        // Match OPTIONS= prefix (case-insensitive)
        const match = line.match(/^OPTIONS\s*=\s*(.*)/i);
        if (!match) continue;
        Object.assign(out, parseNethackOptionsString(match[1]));
    }
    return out;
}

// Parse URL query: supports ?NETHACKOPTIONS=... and explicit ?name=...&pickup=...
function parseUrlConfig() {
    if (typeof window === 'undefined' || !window.location) {
        return { control: {}, optionFlags: {} };
    }
    const params = new URLSearchParams(window.location.search);

    const control = {};
    const optionFlags = {};

    // 1) NETHACKOPTIONS blob
    const nethackOptRaw = params.get('NETHACKOPTIONS') ?? params.get('nethackoptions');
    if (nethackOptRaw) {
        Object.assign(optionFlags, parseNethackOptionsString(nethackOptRaw));
    }

    // 2) Explicit key=value URL options override NETHACKOPTIONS
    for (const [rawKey, value] of params) {
        const keyLower = rawKey.toLowerCase();
        if (keyLower === 'nethackoptions') continue;

        if (keyLower === 'wizard') {
            control.wizard = parseBooleanLike(value);
            continue;
        }
        if (keyLower === 'reset') {
            control.reset = parseBooleanLike(value);
            continue;
        }
        if (keyLower === 'seed') {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed)) control.seed = parsed;
            continue;
        }
        if (keyLower === 'role') {
            control.role = value;
            continue;
        }

        const optionKey = normalizeOptionKey(rawKey);
        if (!optionKey) continue;
        optionFlags[optionKey] = coerceOptionValue(optionKey, value);
    }

    return { control, optionFlags };
}

// Remove URL parameters consumed by game startup/options parsing.
// Keeps unrelated query parameters intact.
export function clearGameUrlParams() {
    if (typeof window === 'undefined' || !window.location) return;
    const url = new URL(window.location.href);
    const entries = [...url.searchParams.entries()];
    for (const [rawKey] of entries) {
        const keyLower = rawKey.toLowerCase();
        if (keyLower === 'nethackoptions'
            || keyLower === 'wizard'
            || keyLower === 'reset'
            || keyLower === 'seed'
            || keyLower === 'role'
            || normalizeOptionKey(rawKey)) {
            url.searchParams.delete(rawKey);
        }
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next);
}

// Get non-flag URL parameters for game init (wizard mode, seed, etc.)
export function getUrlParams() {
    const { control } = parseUrlConfig();
    return {
        wizard: control.wizard || false,
        seed: Number.isFinite(control.seed) ? control.seed : null,
        role: control.role || null,
        reset: control.reset || false,
    };
}

// C ref: options.c initoptions() — load flags from localStorage, merged with defaults
export function loadFlags(apiOverrides = null) {
    const defaults = { ...C_DEFAULTS, ...JS_OVERRIDES };

    // Read options: .nethackrc in vfs first, fallback to old JSON key
    let saved = {};
    const s = storage();
    if (s) {
        try {
            const rcContent = vfsReadFile('.nethackrc');
            if (rcContent !== null) {
                saved = parseFlagsFromNethackrc(rcContent);
            } else {
                // Fallback: read old menace-options JSON and auto-migrate
                const json = s.getItem(OPTIONS_KEY);
                if (json) {
                    saved = migrateFlags(JSON.parse(json));
                    // Migrate to .nethackrc format
                    const fullFlags = { ...defaults, ...saved };
                    vfsWriteFile('.nethackrc', serializeFlagsToNethackrc(fullFlags));
                    s.removeItem(OPTIONS_KEY);
                }
            }
        } catch (e) {}
    }

    // URL parameters
    const { optionFlags: urlFlags } = parseUrlConfig();
    // API overrides (highest priority, for harness/headless callers)
    const overrideFlags = (apiOverrides && typeof apiOverrides === 'object')
        ? Object.fromEntries(
            Object.entries(apiOverrides)
                .map(([k, v]) => [normalizeOptionKey(k), v])
                .filter(([k]) => !!k)
        )
        : {};

    // Merge: defaults < .nethackrc < NETHACKOPTIONS < explicit URL < API overrides
    const flags = { ...defaults, ...saved, ...urlFlags, ...overrideFlags };
    // C ref: flags.invlet_constant backs "fixinv"; keep both names aligned so
    // gameplay/state code and checkpoint output can use C-native field naming.
    flags.invlet_constant = !!(flags.fixinv ?? flags.invlet_constant);

    // Persist URL flag overrides to .nethackrc
    const persistable = {};
    for (const [k, v] of Object.entries(urlFlags)) {
        if (k in C_DEFAULTS) persistable[k] = v;
    }
    if (Object.keys(persistable).length > 0) {
        saveFlags({ ...defaults, ...saved, ...persistable });
    }

    return flags;
}

// C ref: cfgfiles.c do_write_config_file() — save flags to .nethackrc in vfs
export function saveFlags(flags) {
    try {
        vfsWriteFile('.nethackrc', serializeFlagsToNethackrc(flags));
    } catch (e) { /* ignore */ }
}

// Get a single flag value.
export function getFlag(key) {
    return loadFlags()[key];
}

// Set a single flag and persist.
export function setFlag(key, value) {
    const flags = loadFlags();
    flags[key] = value;
    saveFlags(flags);
}

// Handle save game (S)
// C ref: cmd.c dosave()
export async function handleSave(game) {
    const { display } = game;
    // C ref: save.c dosave() confirmation prompt.
    const ans = await ynFunction('Really save?', 'yn', 'n'.charCodeAt(0), display);
    if (String.fromCharCode(ans) !== 'y') {
        if (typeof display?.clearRow === 'function') display.clearRow(0);
        if ('topMessage' in (display || {})) display.topMessage = null;
        if ('messageNeedsMore' in (display || {})) display.messageNeedsMore = false;
        return { moved: false, tookTime: false };
    }
    const ok = saveGame(game);
    if (ok) {
        await display.putstr_message('Game saved.');
        // Brief delay so the user sees the message, then reload
        await nh_delay_output(500);
        window.location.reload();
    } else {
        await display.putstr_message('Save failed (storage full or unavailable).');
    }
    return { moved: false, tookTime: false };
}

// Backward-compatible aliases
export const loadOptions = loadFlags;
export const saveOptions = saveFlags;
export const getOption = getFlag;
export const setOption = setFlag;
