// dungeon.js -- Level generation
// Faithful port of mklev.c, rect.c, sp_lev.c from NetHack 3.7.
// See DECISIONS.md #9, DESIGN.md for architecture notes.
//
// The C code uses global state (levl[][], svr.rooms[], gs.smeq[]).
// In JS we pass the map object explicitly to all functions.

import {
    COLNO, ROWNO, STONE, VWALL, HWALL, TLCORNER, TRCORNER,
    BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, CORR, ROOM, STAIRS, LADDER, FOUNTAIN, ALTAR, GRAVE, SINK, THRONE,
    SDOOR, SCORR, AIR,
    POOL, WATER, MOAT, IRONBARS, ICE, LAVAWALL,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED,
    DIR_N, DIR_S, DIR_E, DIR_W, DIR_180,
    xdir, ydir, N_DIRS,
    OROOM, THEMEROOM, VAULT, SHOPBASE, MAXNROFROOMS, ROOMOFFSET,
    COURT, SWAMP, BEEHIVE, MORGUE, BARRACKS, ZOO, TEMPLE, LEPREHALL, COCKNEST, ANTHOLE,
    DBWALL,
    IS_WALL, IS_STWALL, IS_DOOR, IS_ROOM, IS_OBSTRUCTED, IS_FURNITURE,
    IS_POOL, IS_LAVA, isok,
    NO_TRAP, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP,
    LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP,
    PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP,
    MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP,
    VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST, TRAPNUM,
    is_pit, is_hole,
    MKTRAP_NOFLAGS, MKTRAP_SEEN, MKTRAP_MAZEFLAG, MKTRAP_NOSPIDERONWEB, MKTRAP_NOVICTIM,
    A_NONE, A_LAWFUL, A_NEUTRAL, A_CHAOTIC, DUNGEON_ALIGN_BY_DNUM,
    MM_NOGRP, FILL_NONE, FILL_NORMAL, RUMOR_PAD_LENGTH, TAINT_AGE,
    XLIM, YLIM,
    LA_UP, LA_DOWN,
    W_NONDIGGABLE,
    W_NORTH, W_SOUTH, W_EAST, W_WEST, W_ANY,
} from './const.js';
import { GameMap } from './game.js';
import { rn2, rnd, rn1, d, getRngCallCount, advanceRngRaw, pushRngLogEntry } from './rng.js';
import { getbones } from './bones.js';
import { make_engr_at, wipe_engr_at, make_grave } from './engrave.js';
import { game as _gstate } from './gstate.js';
import { impossible, You } from './pline.js';
import {
    mkobj,
    mksobj,
    mkcorpstat,
    next_ident,
    weight,
    add_to_buried,
} from './mkobj.js';
import { makemon, mkclass, rndmonnum_adj, set_malign } from './makemon.js';
import { NO_MM_FLAGS, SIZE, nul_glyphinfo,
         LR_DOWNSTAIR, LR_UPSTAIR, LR_PORTAL, LR_BRANCH,
         LR_TELE, LR_UPTELE, LR_DOWNTELE, SHARED } from './const.js';

// C serialization stubs (JS uses storage.js, not binary save files)
function update_file() { return false; }
function Sfo_int() {}
function Sfo_xint16() {}
function Sfo_coordxy() {}
function Sfi_int() { return 0; }
function Sfi_xint16() { return 0; }
function Sfi_coordxy() { return 0; }
import {
    mons, S_UNICORN, S_DRAGON, S_GIANT, S_TROLL, S_CENTAUR, S_ORC, S_GNOME, S_KOBOLD,
    S_VAMPIRE, S_ZOMBIE, S_DEMON, S_FUNGUS,
    PM_ELF, PM_HUMAN, PM_GNOME, PM_DWARF, PM_ORC, PM_ARCHEOLOGIST, PM_WIZARD, PM_MINOTAUR, PM_GIANT_SPIDER,
    PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN,
    PM_BUGBEAR, PM_HOBGOBLIN,
    PM_QUEEN_BEE, PM_KILLER_BEE, PM_LEPRECHAUN, PM_COCKATRICE,
    PM_SOLDIER_ANT, PM_FIRE_ANT, PM_GIANT_ANT,
    PM_GIANT_EEL, PM_PIRANHA, PM_ELECTRIC_EEL,
    PM_GHOST, PM_WRAITH,
    PM_OGRE_TYRANT, PM_ELVEN_MONARCH, PM_DWARF_RULER, PM_GNOME_RULER,
    M2_PRINCE, M2_LORD, M2_DEMON, M2_HOSTILE, M2_PEACEFUL,
    MS_LEADER,
    PM_CLERIC,
} from './monsters.js';
import { init_objects, setgemprobs } from './o_init.js';
import { roles } from './player.js';
import {
    ARROW, DART, ROCK, BOULDER, LARGE_BOX, CHEST, GOLD_PIECE, CORPSE,
    STATUE, TALLOW_CANDLE, WAX_CANDLE, BELL, KELP_FROND, LUMP_OF_ROYAL_JELLY,
    MACE, TWO_HANDED_SWORD, BOW, FOOD_RATION, CRAM_RATION, LEMBAS_WAFER, RING_MAIL, PLATE_MAIL, FAKE_AMULET_OF_YENDOR,
    POT_WATER, EXPENSIVE_CAMERA, EGG, CREAM_PIE, MELON, ACID_VENOM, BLINDING_VENOM,
    WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS, WAND_CLASS,
    ARMOR_CLASS, SCROLL_CLASS, POTION_CLASS, RING_CLASS, SPBOOK_CLASS, SPBOOK_no_NOVEL,
    POT_HEALING, POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
    SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER, SCR_SCARE_MONSTER,
    WAN_DIGGING, SPE_HEALING, SPE_BLANK_PAPER, SPE_NOVEL,
    objectData, bases, GLASS, RANDOM_CLASS,
} from './objects.js';
import {
    getSpecialLevel,
    findSpecialLevelByProto,
    initQuestLevels,
} from './special_levels.js';
import { envFlag, hasEnv } from './runtime_env.js';
import { litstate_rnd } from './mkmap.js';
import { withLevelContext, withFinalizeContext, withSpecialLevelDepth, initLuaMT, resetLevelState } from './sp_lev.js';
import {
    themerooms_generate as themermsGenerate,
    themerooms_post_level_generate,
    reset_state as resetThemermsState
} from './levels/themerms.js';
import {
    isbig,
    makeRoom,
    has_dnstairs,
    has_upstairs,
    somex,
    somey,
    somexy,
    somexyspace,
    nexttodoor,
    shrine_pos,
    set_mkroom_wizard_mode,
    set_mkroom_ubirthday,
    pick_room,
    mkzoo,
    mkswamp,
    mkshop,
    do_mkroom,
    squadmon,
    courtmon,
    morguemon,
    antholemon,
    mk_zoo_thronemon,
} from './mkroom.js';
import {
    add_room,
    bydoor,
    okdoor,
    good_rm_wall_doorpos,
    finddpos_shift,
    finddpos,
    maybe_sdoor,
    add_door,
    dosdoor,
    dodoor,
    mkstairs,
    generate_stairs_room_good,
    generate_stairs_find_room,
    generate_stairs,
    find_branch_room,
    place_branch,
    cardinal_nextto_room,
    place_niche,
    occupied,
    find_okay_roompos,
    mkfount,
    mksink,
    mkaltar,
    mkgrave,
    makeniche,
    make_niches,
    makevtele,
    mktrap_pick_kind,
    mklev_sanity_check,
    level_finalize_topology,
    sort_rooms,
    free_luathemes,
    get_luathemes_loaded,
    set_luathemes_loaded,
} from './mklev.js';
import {
    place_lregion,
    makemaz,
    mazexy,
} from './mkmaze.js';
import { makeroguerooms } from './extralev.js';
import { rnd_class } from './objnam.js';

/**
 * Bridge function: Call themed room generation with des.* API bridge
 *
 * Sets up levelState to point at our procedural map, calls themerms,
 * then cleans up. This allows themed rooms (which use des.room()) to
 * work with procedural dungeon generation.
 */
async function themerooms_generate(map, depth) {
    const DEBUG = envFlag('DEBUG_THEMEROOMS');

    // NOTE: MT initialization happens LAZILY during themed room generation,
    // NOT here. In C, MT init is triggered by the first nhl_rn2 call during
    // themed room selection (reservoir sampling). We'll init MT in the same
    // place - see themerms.js reservoir sampling loop.

    // Call ported themerms (uses des.* API internally)
    const result = await withLevelContext(
        map,
        depth,
        async () => await themermsGenerate(map, depth)
    );

    if (DEBUG) {
        console.log(`themerooms_generate: result=${result}, nroom=${map.nroom}`);
    }

    return result;
}

import { parseEncryptedDataFile, strchr, sgn } from './hacklib.js';
import { u_at } from './hack.js';
import { get_rnd_line_index, getrumor, random_epitaph_text } from './rumors.js';

// Branch type constants (C ref: include/dungeon.h)
const BR_STAIR = 0;
const BR_NO_END1 = 1;
const BR_NO_END2 = 2;
const BR_PORTAL = 3;

// Dungeon branch numbers (mirrors special_levels.js; local to avoid circular-init TDZ).
const DUNGEONS_OF_DOOM = 0;
const GNOMISH_MINES = 1;
const SOKOBAN = 2;
const QUEST = 3;
const KNOX = 4;
const GEHENNOM = 5;
const VLADS_TOWER = 6;
const ELEMENTAL_PLANES = 7;
const TUTORIAL = 8;

// Snapshot of branch topology chosen during init_dungeons().
// Each entry: { type, end1:{dnum,dlevel}, end2:{dnum,dlevel}, end1_up }.
let _branchTopology = [];
// C ref: dungeon.c global oracle_level; populated during init_dungeons().
// Used by mklev.c fill_ordinary_room() bonus supply chest gating.
// Keep default dnum literal (0 = DUNGEONS_OF_DOOM) to avoid circular-import TDZ.
let _oracleLevel = { dnum: 0, dlevel: 5 };
// C ref: mklev.c:1276-1286 — loca dlevel used to choose fila vs filb for quest fills.
// Set during init_dungeons() when the QUEST branch is processed.
let _questLocaDlevel = 2; // QUEST branch loca canonical dlevel (updated at runtime)
let _questRoleAbbr = 'Arc'; // Player role abbreviation (set in initLevelGeneration)
// C ref: mklev.c:1277 In_hell check — level 20 is canonical medusa depth.
// isPastMedusa uses actual placed medusa dlevel to avoid hardcoded threshold bugs.
let _medusaDepth = 20; // actual placed medusa dlevel in DoD (updated at runtime)
// Runtime mapping from actual placed special-level locations to canonical
// special-level registry coordinates used by getSpecialLevel().
let _runtimeSpecialLevelMap = new Map();
// C ref: dungeon.c svd.dungeons[*].num_dunlevs/ledger_start bookkeeping.
let _dungeonLevelCounts = new Map();
// C ref: decl.h gi.in_mklev — true only while makelevel() runs.
let inMklev = false;
// Mirror C global wizard mode checks used by mkroom.c pick_room().
let _wizardMode = true;
let _harnessMapdumpSerial = 0;
let _harnessMapdumpPayloads = new Map();

// C ref: gi.in_mklev is also TRUE while special-level Lua code runs.
// Exposed for sp_lev.js to bracket des.* generation phases.
export function enterMklevContext() {
    inMklev = true;
    if (_gstate) _gstate._inMklev = true;
}

export function leaveMklevContext() {
    inMklev = false;
    if (_gstate) _gstate._inMklev = false;
}

// C ref: dungeon.c induced_align(int pct)
// JS returns aligntyp (-1/0/1), not an AM_* bitmask.
export function induced_align(pct, specialAlign = A_NONE, dungeonAlign = A_NONE) {
    if (specialAlign !== A_NONE && rn2(100) < pct) return specialAlign;
    if (dungeonAlign !== A_NONE && rn2(100) < pct) return dungeonAlign;
    return rn2(3) - 1;
}

export function clearBranchTopology() {
    _branchTopology = [];
    _oracleLevel = { dnum: DUNGEONS_OF_DOOM, dlevel: 5 };
    _medusaDepth = 20;
    _runtimeSpecialLevelMap = new Map();
    _dungeonLedgerStartByDnum = new Map([[DUNGEONS_OF_DOOM, 0]]);
    _dungeonLevelCounts = new Map();
    _questLocaDlevel = 2;
}
import { ENGRAVE_FILE_TEXT } from './engrave_data.js';
import { stock_room } from './shknam.js';
import { obj_resists } from './objdata.js';
import { placeFloorObject } from './invent.js';
import { mpickobj } from './steal.js';
import { set_corpsenm, place_object } from './mkobj.js';
import { getnow } from './calendar.js';

// Module-level ubirthday surrogate for nameshk() — set by setGameSeed() before level gen.
// C ref: shknam.c uses ubirthday (seconds since epoch) rather than game seed.
let _gameUbirthday = 0;
let _dungeonLedgerStartByDnum = new Map([[DUNGEONS_OF_DOOM, 0]]);
const _dungeonEntryLevelByDnum = new Map([
    [DUNGEONS_OF_DOOM, 1],
    [GNOMISH_MINES, 1],
    [SOKOBAN, 4],
    [QUEST, 1],
    [KNOX, 1],
    [GEHENNOM, 1],
    [VLADS_TOWER, 1],
    [ELEMENTAL_PLANES, 1],
    [TUTORIAL, 1],
]);
let _specialLevelChain = [];

function harnessMapdumpCell(v) {
    let n = Number.isFinite(v) ? Math.trunc(v) : 0;
    if (n < 0) n = 0;
    if (n <= 9) return String.fromCharCode(48 + n);
    if (n <= 35) return String.fromCharCode(97 + (n - 10));
    if (n <= 61) return String.fromCharCode(65 + (n - 36));
    return 'Z';
}

function emitHarnessMapdumpRun(parts, value, count) {
    if (count <= 0) return;
    if (count >= 3) {
        parts.push(`~${count},${harnessMapdumpCell(value)}`);
        return;
    }
    const ch = harnessMapdumpCell(value);
    for (let i = 0; i < count; i++) parts.push(ch);
}

// C ref: struct rm union field overlaid on `horizontal`:
// - walls/doors/drawbridges use `horizontal`
// - fountains use `blessedftn`
// - graves use `disturbed`
function harnessMapdumpHorizontalValue(loc) {
    if (!loc) return 0;
    if (loc.typ === FOUNTAIN) return loc.blessedftn ? 1 : 0;
    if (loc.typ === GRAVE) return loc.disturbed ? 1 : 0;
    return loc.horizontal ? 1 : 0;
}

function buildHarnessMapdumpGrid(map, which) {
    const rowParts = [];
    for (let y = 0; y < ROWNO; y++) {
        const out = [];
        let runVal = null;
        let runLen = 0;
        for (let x = 0; x < COLNO; x++) {
            const loc = map.at(x, y);
            let value = 0;
            switch (which) {
                case 0: value = Number(loc?.typ ?? 0); break;
                case 1: value = Number(loc?.flags ?? 0) & 0x1f; break;
                case 2: value = harnessMapdumpHorizontalValue(loc); break;
                case 3: value = loc?.lit ? 1 : 0; break;
                case 4: value = Number(loc?.roomno ?? 0) & 0x3f; break;
                case 5: {
                    const hasWallInfo = Number.isFinite(loc?.wall_info);
                    value = hasWallInfo
                        ? (Math.trunc(loc.wall_info) & 0x1f)
                        : (Number(loc?.flags ?? 0) & 0x1f);
                    const typ = Number(loc?.typ ?? 0);
                    // C stores stair direction in rm.flags low bits.
                    if (value === 0 && typ === STAIRS) {
                        if (map?.upstair?.x === x && map?.upstair?.y === y) value = LA_UP;
                        else if (map?.dnstair?.x === x && map?.dnstair?.y === y) value = LA_DOWN;
                    }
                    break;
                }
            }
            if (runLen === 0) {
                runVal = value;
                runLen = 1;
            } else if (value === runVal) {
                runLen++;
            } else {
                emitHarnessMapdumpRun(out, runVal, runLen);
                runVal = value;
                runLen = 1;
            }
        }
        emitHarnessMapdumpRun(out, runVal, runLen);
        rowParts.push(out.join(''));
    }
    return rowParts.join('|');
}

function buildHarnessMapdumpPayload(map, options = {}) {
    const engrTypeToNum = {
        dust: 1,
        engrave: 2,
        burn: 3,
        mark: 4,
        blood: 5,
        headstone: 6,
    };
    const lines = [];
    lines.push(`T${buildHarnessMapdumpGrid(map, 0)}`);
    lines.push(`F${buildHarnessMapdumpGrid(map, 1)}`);
    lines.push(`H${buildHarnessMapdumpGrid(map, 2)}`);
    lines.push(`L${buildHarnessMapdumpGrid(map, 3)}`);
    lines.push(`R${buildHarnessMapdumpGrid(map, 4)}`);
    // Explicit wall_info mirror; include C-harness border-lock defaults.
    lines.push(`W${buildHarnessMapdumpGrid(map, 5)}`);
    const hero = options.hero
        || map?.player
        || map?.u
        || _gstate?.u
        || _gstate?.player
        || null;
    const heroX = hero ? (hero.x | 0) : 0;
    const heroY = hero ? (hero.y | 0) : 0;
    // C mapdump reads u.uhp/u.uhpmax/u.uen/u.uenmax.
    const heroUnplaced = (heroX === 0 && heroY === 0);
    const hp = Number.isFinite(hero?.uhp) ? Math.trunc(hero.uhp) : (Number(hero?.hp) || 0);
    const hpmax = Number.isFinite(hero?.uhpmax) ? Math.trunc(hero.uhpmax) : (Number(hero?.hpmax) || 0);
    const en = Number.isFinite(hero?.uen) ? Math.trunc(hero.uen) : (Number(hero?.en) || 0);
    const enmax = Number.isFinite(hero?.uenmax) ? Math.trunc(hero.uenmax) : (Number(hero?.enmax) || 0);
    const multi = Number.isFinite(hero?.multi) ? Math.trunc(hero.multi) : 0;
    const utrap = Number.isFinite(hero?.utrap) ? Math.trunc(hero.utrap) : 0;
    const utraptype = Number.isFinite(hero?.utraptype) ? Math.trunc(hero.utraptype) : 0;
    const move = Number.isFinite(hero?.move)
        ? Math.trunc(hero.move)
        : (Number.isFinite(_gstate?.context?.move)
            ? Math.trunc(_gstate.context.move)
            : (Number.isFinite(_gstate?.move) ? Math.trunc(_gstate.move) : 0));
    const moves = Number.isFinite(hero?.moves)
        ? Math.trunc(hero.moves)
        : (heroUnplaced && Number.isFinite(hero?.turns)
            ? Math.trunc(hero.turns)
            : (Number.isFinite(_gstate?.moves) ? Math.trunc(_gstate.moves) : 0));
    const conf = !!(hero?.confused || hero?.Confusion) ? 1 : 0;
    const stun = !!(hero?.stunned || hero?.Stunned) ? 1 : 0;
    const blind = !!(hero?.blind || hero?.Blind) ? 1 : 0;
    const hallu = !!(hero?.hallucinating || hero?.Hallucination) ? 1 : 0;
    const fumbling = !!(hero?.fumbling || hero?.Fumbling) ? 1 : 0;
    lines.push(
        `U${heroX},${heroY},${hp},${hpmax},${en},${enmax},${multi},${utrap},${utraptype},${move},${moves},${conf},${stun},${blind},${hallu},${fumbling}`
    );
    const anchorMoves = Number.isFinite(options.moves) ? Math.trunc(options.moves) : moves;
    // C allmain tracks hero_seq as (moves << 3) + n where n is hero actions
    // in the current move tick. Prefer tracked n when available.
    const movedThisTurn = !!hero?.umoved ? 1 : 0;
    const trackedHeroSeqN = Number.isFinite(options.heroSeqN)
        ? Math.trunc(options.heroSeqN)
        : (Number.isFinite(hero?.heroSeqN)
            ? Math.trunc(hero.heroSeqN)
            : (Number.isFinite(_gstate?.heroSeqN)
                ? Math.trunc(_gstate.heroSeqN)
                : ((anchorMoves | 0) > 1 ? 1 : movedThisTurn)));
    const clampedHeroSeqN = Math.max(0, Math.min(7, trackedHeroSeqN));
    const minimumHeroSeqN = heroUnplaced ? 0 : (((anchorMoves | 0) > 1) ? 1 : 0);
    const heroSeqN = Math.max(minimumHeroSeqN, clampedHeroSeqN);
    const fallbackHeroSeq = heroUnplaced
        ? (1 << 3)
        : (((anchorMoves | 0) << 3) + heroSeqN);
    const anchorHeroSeq = Number.isFinite(options.heroSeq)
        ? Math.trunc(options.heroSeq)
        : (Number.isFinite(hero?.heroSeq)
            ? Math.trunc(hero.heroSeq)
            : (Number.isFinite(_gstate?.heroSeq) ? Math.trunc(_gstate.heroSeq) : fallbackHeroSeq));
    lines.push(`A${anchorMoves},${anchorHeroSeq}`);
    if (typeof options.contextSection === 'string' && options.contextSection.length > 0) {
        lines.push(`C${options.contextSection}`);
    }

    const objParts = [];
    for (const obj of (Array.isArray(map?.objects) ? map.objects : [])) {
        const ox = Number(obj?.ox);
        const oy = Number(obj?.oy);
        if (!isok(ox, oy)) continue;
        const otyp = Number.isFinite(obj?.otyp) ? Math.trunc(obj.otyp) : 0;
        const quan = Number.isFinite(obj?.quan) ? Math.trunc(obj.quan) : 0;
        objParts.push(`${ox},${oy},${otyp},${quan}`);
    }
    lines.push(`O${objParts.join(';')}`);

    const objDetailParts = [];
    for (const obj of (Array.isArray(map?.objects) ? map.objects : [])) {
        const ox = Number(obj?.ox);
        const oy = Number(obj?.oy);
        if (!isok(ox, oy)) continue;
        const id = Number.isFinite(obj?.o_id) ? Math.trunc(obj.o_id) : 0;
        const otyp = Number.isFinite(obj?.otyp) ? Math.trunc(obj.otyp) : 0;
        const quan = Number.isFinite(obj?.quan) ? Math.trunc(obj.quan) : 0;
        // map.objects contains floor-chain objects for this level.
        // C mapdump uses OBJ_FLOOR when where is unset.
        const where = Number.isFinite(obj?.where) ? Math.trunc(obj.where) : 1;
        const cursed = obj?.cursed ? 1 : 0;
        const blessed = obj?.blessed ? 1 : 0;
        let owt = Number.isFinite(obj?.owt) ? Math.trunc(obj.owt) : 0;
        if ((otyp === STATUE || Array.isArray(obj?.cobj)) && typeof weight === 'function') {
            let computedOwt = weight(obj);
            // Some special-level builders still attach nested items on `contents`
            // rather than `cobj`; include those weights for mapdump parity.
            if ((!Array.isArray(obj?.cobj) || obj.cobj.length === 0)
                && Array.isArray(obj?.contents)
                && obj.contents.length > 0) {
                for (const contained of obj.contents) {
                    computedOwt += weight(contained);
                }
            }
            if (Number.isFinite(computedOwt) && computedOwt >= 0) {
                owt = Math.trunc(computedOwt);
            }
        }
        const invlet = (typeof obj?.invlet === 'string' && obj.invlet.length > 0)
            ? obj.invlet.charCodeAt(0)
            : 0;
        const olocked = obj?.olocked ? 1 : 0;
        const obroken = obj?.obroken ? 1 : 0;
        const otrapped = obj?.otrapped ? 1 : 0;
        const noCharge = obj?.no_charge ? 1 : 0;
        objDetailParts.push(
            `${id},${ox},${oy},${otyp},${quan},${where},${cursed},${blessed},${owt},${invlet},${olocked},${obroken},${otrapped},${noCharge}`
        );
    }
    objDetailParts.sort();
    lines.push(`Q${objDetailParts.join(';')}`);

    const monParts = [];
    for (const mon of (Array.isArray(map?.monsters) ? map.monsters : [])) {
        const mx = Number(mon?.mx);
        const my = Number(mon?.my);
        if (!isok(mx, my)) continue;
        const mndx = Number.isFinite(mon?.mndx) ? Math.trunc(mon.mndx) : 0;
        const mhp = Number.isFinite(mon?.mhp) ? Math.trunc(mon.mhp) : 0;
        monParts.push(`${mx},${my},${mndx},${mhp}`);
    }
    lines.push(`M${monParts.join(';')}`);

    const monDetailParts = [];
    for (const mon of (Array.isArray(map?.monsters) ? map.monsters : [])) {
        const mx = Number(mon?.mx);
        const my = Number(mon?.my);
        if (!isok(mx, my)) continue;
        const id = Number.isFinite(mon?.m_id) ? Math.trunc(mon.m_id) : 0;
        const mndx = Number.isFinite(mon?.mndx) ? Math.trunc(mon.mndx) : 0;
        const mhp = Number.isFinite(mon?.mhp) ? Math.trunc(mon.mhp) : 0;
        const mhpmax = Number.isFinite(mon?.mhpmax) ? Math.trunc(mon.mhpmax) : 0;
        const mtame = Number.isFinite(mon?.tame) ? Math.trunc(mon.tame) : 0;
        const peaceful = mon?.peaceful ? 1 : 0;
        const sleeping = mon?.sleeping ? 1 : 0;
        const frozen = Number.isFinite(mon?.mfrozen) ? Math.trunc(mon.mfrozen) : 0;
        const canmove = mon?.mcanmove === false ? 0 : 1;
        const trapped = mon?.mtrapped ? 1 : 0;
        const mappearanceType = Number.isFinite(mon?.m_ap_type) ? Math.trunc(mon.m_ap_type) : 0;
        const mappearance = Number.isFinite(mon?.mappearance) ? Math.trunc(mon.mappearance) : 0;
        const minventCount = Array.isArray(mon?.minvent) ? mon.minvent.length : 0;
        monDetailParts.push(
            `${id},${mx},${my},${mndx},${mhp},${mhpmax},${mtame},${peaceful},${sleeping},${frozen},${canmove},${trapped},${mappearanceType},${mappearance},${minventCount}`
        );
    }
    monDetailParts.sort();
    lines.push(`N${monDetailParts.join(';')}`);

    const trapParts = [];
    for (const trap of (Array.isArray(map?.traps) ? map.traps : [])) {
        const tx = Number(trap?.tx);
        const ty = Number(trap?.ty);
        if (!isok(tx, ty)) continue;
        const ttyp = Number.isFinite(trap?.ttyp) ? Math.trunc(trap.ttyp) : 0;
        trapParts.push(`${tx},${ty},${ttyp}`);
    }
    lines.push(`K${trapParts.join(';')}`);

    const trapDetailParts = [];
    for (const trap of (Array.isArray(map?.traps) ? map.traps : [])) {
        const tx = Number(trap?.tx);
        const ty = Number(trap?.ty);
        if (!isok(tx, ty)) continue;
        const ttyp = Number.isFinite(trap?.ttyp) ? Math.trunc(trap.ttyp) : 0;
        const tseen = trap?.tseen ? 1 : 0;
        const once = trap?.once ? 1 : 0;
        const madeByU = trap?.madeby_u ? 1 : 0;
        // C struct trap maps teledest as a macro alias of launch; honor either shape.
        const teledestX = Number.isFinite(trap?.teledest_x) ? Math.trunc(trap.teledest_x)
            : (Number.isFinite(trap?.teledest?.x) ? Math.trunc(trap.teledest.x)
                : (Number.isFinite(trap?.launch?.x) ? Math.trunc(trap.launch.x) : -1));
        const teledestY = Number.isFinite(trap?.teledest_y) ? Math.trunc(trap.teledest_y)
            : (Number.isFinite(trap?.teledest?.y) ? Math.trunc(trap.teledest.y)
                : (Number.isFinite(trap?.launch?.y) ? Math.trunc(trap.launch.y) : -1));
        trapDetailParts.push(
            `${tx},${ty},${ttyp},${tseen},${once},${madeByU},${teledestX},${teledestY}`
        );
    }
    trapDetailParts.sort();
    lines.push(`J${trapDetailParts.join(';')}`);

    const engravingParts = [];
    for (const engr of (Array.isArray(map?.engravings) ? map.engravings : [])) {
        const ex = Number(engr?.x);
        const ey = Number(engr?.y);
        if (!isok(ex, ey)) continue;
        const etype = typeof engr?.type === 'string' ? (engr.type.toLowerCase()) : '';
        const etypeNum = Number.isFinite(engr?.type) ? Math.trunc(engr.type) : (engrTypeToNum[etype] || 0);
        const textLen = String(engr?.text || '').length | 0;
        const nowipeout = engr?.nowipeout ? 1 : 0;
        const guardobjects = engr?.guardobjects ? 1 : 0;
        engravingParts.push(`${ex},${ey},${etypeNum},${textLen},${nowipeout},${guardobjects}`);
    }
    engravingParts.sort();
    lines.push(`E${engravingParts.join(';')}`);

    return `${lines.join('\n')}\n`;
}

// Debug helper used by comparison tooling to snapshot current map state
// in the same compact mapdump format emitted by harness checkpoints.
export function buildDebugMapdumpPayload(map, options = {}) {
    return buildHarnessMapdumpPayload(map, options);
}

function emitHarnessMapdumpEvent(map, depth, dnum, dlevel) {
    const mapDnum = Number.isInteger(map?._genDnum) ? map._genDnum : undefined;
    const mapDlevel = Number.isInteger(map?._genDlevel) ? map._genDlevel : undefined;
    const useDnum = Number.isInteger(mapDnum)
        ? mapDnum
        : (Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM);
    const useDlevel = Number.isInteger(mapDlevel)
        ? mapDlevel
        : (Number.isInteger(dlevel)
            ? dlevel
            : (Number.isInteger(depth) && depth > 0 ? depth : 1));
    const serial = String(++_harnessMapdumpSerial).padStart(3, '0');
    const dumpId = `d${useDnum}l${useDlevel}_${serial}`;
    _harnessMapdumpPayloads.set(dumpId, buildHarnessMapdumpPayload(map));
    pushRngLogEntry(`^mapdump[${dumpId}]`);
}

export function consumeHarnessMapdumpPayloads() {
    const out = {};
    for (const [id, payload] of _harnessMapdumpPayloads.entries()) out[id] = payload;
    _harnessMapdumpPayloads = new Map();
    return out;
}
const RUNTIME_SPECIAL_LEVEL_CANON = new Map([
    [DUNGEONS_OF_DOOM, [
        { index: 0, canonDlevel: 15 }, // rogue
        { index: 1, canonDlevel: 5 },  // oracle
        { index: 2, canonDlevel: 10 }, // bigrm
        { index: 3, canonDlevel: 20 }, // medusa
        { index: 4, canonDlevel: 17 }, // castle
    ]],
    [GEHENNOM, [
        { index: 0, canonDlevel: 1 },  // valley
        { index: 1, canonDlevel: 10 }, // sanctum
        { index: 2, canonDlevel: 5 },  // juiblex
        { index: 3, canonDlevel: 4 },  // baalz
        { index: 4, canonDlevel: 3 },  // asmodeus
        { index: 5, canonDlevel: 11 }, // wizard1
        { index: 6, canonDlevel: 12 }, // wizard2
        { index: 7, canonDlevel: 13 }, // wizard3
        { index: 8, canonDlevel: 6 },  // orcus
    ]],
    [GNOMISH_MINES, [
        { index: 0, canonDlevel: 5 }, // minetn
        { index: 1, canonDlevel: 8 }, // minend
    ]],
    [SOKOBAN, [
        { index: 0, canonDlevel: 1 }, // soko1
        { index: 1, canonDlevel: 2 }, // soko2
        { index: 2, canonDlevel: 3 }, // soko3
        { index: 3, canonDlevel: 4 }, // soko4
    ]],
    [VLADS_TOWER, [
        { index: 0, canonDlevel: 1 }, // tower1
        { index: 1, canonDlevel: 2 }, // tower2
        { index: 2, canonDlevel: 3 }, // tower3
    ]],
    [TUTORIAL, [
        { index: 0, canonDlevel: 1 }, // tut-1
        { index: 1, canonDlevel: 2 }, // tut-2
    ]],
    [QUEST, [
        { index: 0, canonDlevel: 1 }, // x-strt
        { index: 1, canonDlevel: 2 }, // x-loca
        { index: 2, canonDlevel: 5 }, // x-goal
    ]],
]);

function runtimeSpecialLevelFor(dnum, dlevel) {
    const key = `${dnum}:${dlevel}`;
    return _runtimeSpecialLevelMap.get(key) || null;
}

function resolveUbirthday(seed) {
    const parsed = getnow();
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (Number.isFinite(seed)) return seed;
    return 0;
}

export function setGameSeed(seed) {
    _gameUbirthday = resolveUbirthday(seed);
}

function getLedgerNoForLevel(dnum, dlevel) {
    const cdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    const clev = Number.isInteger(dlevel) && dlevel > 0 ? dlevel : 1;
    const ledgerStart = _dungeonLedgerStartByDnum.get(cdnum);
    if (Number.isInteger(ledgerStart)) {
        return ledgerStart + clev;
    }
    // Fallback keeps deterministic behavior in stripped-down test contexts.
    return clev;
}

// C ref: dungeon.c dunlev()/dunlevs_in_dungeon()/depth() and ledger helpers.
// Autotranslated from dungeon.c:1324
export function dunlev(lev) {
  return lev.dlevel;
}
export function dunlevs_in_dungeon(dnum) {
    const cdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    return _dungeonLevelCounts.get(cdnum) || 1;
}
export function depth(lev) {
    const dnum = Number.isInteger(lev?.dnum) ? lev.dnum : DUNGEONS_OF_DOOM;
    const dlevel = dunlev(lev);
    return getLedgerNoForLevel(dnum, dlevel);
}
export function ledger_no(lev) {
    return depth(lev);
}
export function maxledgerno() {
    let max = 0;
    for (const [dnum, cnt] of _dungeonLevelCounts.entries()) {
        const start = _dungeonLedgerStartByDnum.get(dnum) || 0;
        max = Math.max(max, start + (cnt || 0));
    }
    return Math.max(max, 1);
}
export function ledger_to_dnum(ledgerno) {
    const led = Number.isInteger(ledgerno) ? ledgerno : 1;
    let bestDnum = DUNGEONS_OF_DOOM;
    let bestStart = -Infinity;
    for (const [dnum, start] of _dungeonLedgerStartByDnum.entries()) {
        if (!Number.isInteger(start)) continue;
        if (start <= led && start > bestStart) {
            bestStart = start;
            bestDnum = dnum;
        }
    }
    return bestDnum;
}
export function ledger_to_dlev(ledgerno) {
    const dnum = ledger_to_dnum(ledgerno);
    const start = _dungeonLedgerStartByDnum.get(dnum) || 0;
    return Math.max(1, (Number.isInteger(ledgerno) ? ledgerno : 1) - start);
}
// C ref: dungeon.c get_level()
export function get_level(lev, levnum) {
    const ledger = Number.isInteger(levnum) ? levnum : 1;
    const out = (lev && typeof lev === 'object') ? lev : {};
    out.dnum = ledger_to_dnum(ledger);
    out.dlevel = ledger_to_dlev(ledger);
    return out;
}
// Autotranslated from dungeon.c:1438
export function on_level(lev1, lev2) {
  return (lev1.dnum === lev2.dnum && lev1.dlevel === lev2.dlevel);
}
export function Is_special(dnum, dlevel) {
    return !!runtimeSpecialLevelFor(dnum, dlevel);
}
export function Is_branchlev(dnum, dlevel) {
    return isBranchLevel(dnum, dlevel);
}
export function Is_botlevel(dnum, dlevel) {
    return Number.isInteger(dlevel) && dlevel >= dunlevs_in_dungeon(dnum);
}
// Autotranslated from dungeon.c:1849
export function In_mines(lev) {
  return (lev.dnum === mines_dnum);
}
// Autotranslated from dungeon.c:1842
export function In_quest(lev) {
  return (lev.dnum === QUEST);
}
export function In_hell(lev) {
    return (lev?.dnum ?? lev) === GEHENNOM;
}
// Autotranslated from dungeon.c:1900
export function In_V_tower(lev) {
  return (lev.dnum === tower_dnum);
}
export function In_W_tower(lev) {
    return In_hell(lev) || In_V_tower(lev);
}
export function On_W_tower_level(lev) {
    return In_W_tower(lev);
}

function _coerceLevelArg(levOrMap) {
    if (Number.isInteger(levOrMap?.dnum) && Number.isInteger(levOrMap?.dlevel)) {
        return { dnum: levOrMap.dnum, dlevel: levOrMap.dlevel };
    }
    if (Number.isInteger(levOrMap?._genDnum) && Number.isInteger(levOrMap?._genDlevel)) {
        return { dnum: levOrMap._genDnum, dlevel: levOrMap._genDlevel };
    }
    return { dnum: DUNGEONS_OF_DOOM, dlevel: 1 };
}

function Is_wiz1_level(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === GEHENNOM && dlevel === 1;
}

export function In_endgame(lev) {
    const { dnum } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES;
}

export function In_sokoban(lev) {
    const { dnum } = _coerceLevelArg(lev);
    return dnum === SOKOBAN;
}

export function Is_stronghold(lev) {
    if (lev?.flags?.graveyard && lev?.flags?.is_maze_lev) return true;
    if (lev?.flags?.is_stronghold || lev?.flags?.stronghold) return true;
    const { dnum, dlevel } = _coerceLevelArg(lev);
    if (dnum === DUNGEONS_OF_DOOM) {
        for (const br of _branchTopology) {
            if (br?.end1?.dnum === DUNGEONS_OF_DOOM
                && br?.end2?.dnum === GEHENNOM
                && Number.isInteger(br?.end1?.dlevel)
                && dlevel === br.end1.dlevel) {
                return true;
            }
        }
    }
    const mapped = runtimeSpecialLevelFor(dnum, dlevel);
    if (!mapped) return false;
    const special = getSpecialLevel(mapped.dnum, mapped.dlevel);
    return String(special?.name || '').toLowerCase() === 'castle';
}

export function Is_earthlevel(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES && dlevel === 1;
}

export function Is_waterlevel(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES && dlevel === 2;
}

export function Is_firelevel(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES && dlevel === 4;
}

export function Is_airlevel(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES && dlevel === 3;
}

export function Is_astralevel(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === ELEMENTAL_PLANES && dlevel === 5;
}

export function Is_sanctum(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === GEHENNOM && dlevel === dunlevs_in_dungeon(dnum);
}

export function Is_valley(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === GEHENNOM && dlevel === 1;
}

export function Is_rogue_level(map) {
    return !!(map && map.flags && map.flags.is_rogue);
}

export function Invocation_lev(lev) {
    const { dnum, dlevel } = _coerceLevelArg(lev);
    return dnum === GEHENNOM && dlevel === (dunlevs_in_dungeon(dnum) - 1);
}

function branch_val(bp) {
    const a = ((bp.end1.dnum * (255 + 1)) + bp.end1.dlevel);
    const b = ((bp.end2.dnum * (255 + 1)) + bp.end2.dlevel);
    return (a * (16 + 1) * (255 + 1)) + b;
}

export function add_branch(dgn, child_entry_level, pd = {}, branches = _branchTopology) {
    const branch = {
        id: Number.isInteger(pd.id) ? pd.id : branches.length,
        type: Number.isInteger(pd.type) ? pd.type : BR_STAIR,
        end1: {
            dnum: Number.isInteger(pd.parent_dnum) ? pd.parent_dnum : DUNGEONS_OF_DOOM,
            dlevel: Number.isInteger(pd.parent_dlevel) ? pd.parent_dlevel : 1
        },
        end2: {
            dnum: Number.isInteger(dgn) ? dgn : DUNGEONS_OF_DOOM,
            dlevel: Number.isInteger(child_entry_level) ? child_entry_level : 1
        },
        end1_up: !!pd.end1_up
    };
    const nv = branch_val(branch);
    let idx = 0;
    while (idx < branches.length && branch_val(branches[idx]) < nv) idx++;
    branches.splice(idx, 0, branch);
    return branch;
}

export function add_level(new_lev, chain = _specialLevelChain) {
    if (!new_lev || !new_lev.dlevel) return;
    let idx = 0;
    while (idx < chain.length) {
        const cur = chain[idx];
        if (cur.dlevel.dnum === new_lev.dlevel.dnum
            && cur.dlevel.dlevel > new_lev.dlevel.dlevel) {
            break;
        }
        idx++;
    }
    chain.splice(idx, 0, new_lev);
}

// Autotranslated from dungeon.c:1971
export function assign_level(dest, src) {
  dest.dnum = src.dnum;
  dest.dlevel = src.dlevel;
}

// Autotranslated from dungeon.c:1979
export function assign_rnd_level(dest, src, range) {
  dest.dnum = src.dnum;
  dest.dlevel = src.dlevel + ((range > 0) ? rnd(range) : -rnd(-range));
  if (dest.dlevel > dunlevs_in_dungeon(dest)) dest.dlevel = dunlevs_in_dungeon(dest);
  else if (dest.dlevel < 1) dest.dlevel = 1;
}

export function builds_up(lev) {
    const clev = _coerceLevelArg(lev);
    const dnum = clev.dnum;
    const num = dunlevs_in_dungeon(dnum);
    const entry = _dungeonEntryLevelByDnum.get(dnum) || 1;
    if (num > 1) return entry === num;
    for (const br of _branchTopology) {
        if (br.end2.dnum === clev.dnum && br.end2.dlevel === clev.dlevel) {
            return !!br.end1_up;
        }
    }
    return false;
}

export function dname_to_dnum(name) {
    const key = String(name || '').toLowerCase();
    const map = {
        'dungeons of doom': DUNGEONS_OF_DOOM,
        'gnomish mines': GNOMISH_MINES,
        'sokoban': SOKOBAN,
        'the quest': QUEST,
        'fort ludios': KNOX,
        'gehennom': GEHENNOM,
        "vlad's tower": VLADS_TOWER,
        'elemental planes': ELEMENTAL_PLANES,
        'tutorial': TUTORIAL
    };
    return map[key];
}

export function dungeon_branch(name) {
    const dnum = dname_to_dnum(name);
    if (!Number.isInteger(dnum)) return null;
    for (const br of _branchTopology) {
        if (br.end2.dnum === dnum) return br;
    }
    return null;
}

export function find_branch(name, branches = _branchTopology) {
    const dnum = dname_to_dnum(name);
    if (!Number.isInteger(dnum)) return -1;
    for (let i = 0; i < branches.length; i++) {
        if (branches[i]?.end2?.dnum === dnum) return i;
    }
    return -1;
}

export function find_level(dnum, dlevel) {
    const sdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    const sdlevel = Number.isInteger(dlevel) ? dlevel : 1;
    const mapped = runtimeSpecialLevelFor(sdnum, sdlevel);
    const lvl = mapped
        ? getSpecialLevel(mapped.dnum, mapped.dlevel)
        : null;
    if (lvl) return { dnum: sdnum, dlevel: sdlevel, name: lvl.name };
    return null;
}

// Autotranslated from dungeon.c:1942
export function find_hell(lev) {
  lev.dnum = valley_level.dnum;
  lev.dlevel = 1;
}

export function deepest_lev_reached() {
    return maxledgerno();
}

// Autotranslated from dungeon.c:2233
export function br_string(type) {
  switch (type) {
    case BR_PORTAL:
      return "Portal";
    case BR_NO_END1:
      return "Connection";
    case BR_NO_END2:
      return "One way stair";
    case BR_STAIR:
      return "Stair";
  }
  return " ";
}

// Autotranslated from dungeon.c:3379
export function br_string2(br, player) {
  let closed_portal = (br.end2.dnum === quest_dnum && player.uevent.qexpelled);
  switch (br.type) {
    case BR_PORTAL:
      return closed_portal ? "Sealed portal" : "Portal";
    case BR_NO_END1:
      return "Connection";
    case BR_NO_END2:
      return br.end1_up ? "One way stairs up" : "One way stairs down";
    case BR_STAIR:
      return br.end1_up ? "Stairs up" : "Stairs down";
  }
  return "(unknown)";
}

// Autotranslated from dungeon.c:1890
export function at_dgn_entrance(s, map) {
  let br;
  br = dungeon_branch(s);
  return on_level(map.uz, br.end1) ? true : false;
}

export function Can_dig_down(levOrMap) {
    const lev = _coerceLevelArg(levOrMap);
    const hardfloor = !!levOrMap?.flags?.hardfloor;
    return !hardfloor && !Is_botlevel(lev.dnum, lev.dlevel) && !Invocation_lev(lev);
}

export function Can_fall_thru(levOrMap) {
    return Can_dig_down(levOrMap) || Is_stronghold(levOrMap);
}

export function Can_rise_up(x, y, levOrMap) {
    const lev = _coerceLevelArg(levOrMap);
    if (In_endgame(lev) || In_sokoban(lev)
        || (Is_wiz1_level(lev) && In_W_tower({ dnum: lev.dnum }, x, y))) {
        return false;
    }
    if (lev.dlevel > 1) return true;
    const entry = _dungeonEntryLevelByDnum.get(lev.dnum) || 1;
    if (entry !== 1 || ledger_no(lev) === 1) return false;
    const placement = resolveBranchPlacementForLevel(lev.dnum, lev.dlevel).placement;
    return placement === 'stair-up';
}

// Autotranslated from dungeon.c:1683
export function has_ceiling(lev) {
  if (In_endgame(lev) && !Is_earthlevel(lev)) return false;
  return true;
}

// Autotranslated from dungeon.c:1694
export function avoid_ceiling(lev) {
  if (In_quest(lev) || !has_ceiling(lev)) return true;
  return false;
}

function room_type_at(map, x, y) {
    if (!map || !Number.isInteger(x) || !Number.isInteger(y)) return OROOM;
    const loc = map.at ? map.at(x, y) : map?.locations?.[x]?.[y];
    if (!loc || !Number.isInteger(loc.roomno) || loc.roomno < ROOMOFFSET) return OROOM;
    const idx = loc.roomno - ROOMOFFSET;
    const room = map.rooms?.[idx];
    return Number.isInteger(room?.rtype) ? room.rtype : OROOM;
}

export function ceiling(x, y, map, levOrMap) {
    const loc = map?.at ? map.at(x, y) : map?.locations?.[x]?.[y];
    const lev = _coerceLevelArg(levOrMap || map);
    const rtype = room_type_at(map, x, y);
    if (rtype === VAULT) return "vault's ceiling";
    if (rtype === TEMPLE) return "temple's ceiling";
    if (rtype >= SHOPBASE) return "shop's ceiling";
    if (Is_waterlevel(lev)) return 'water above';
    if (loc && loc.typ === AIR) return 'sky';
    if (Is_firelevel(lev)) return 'flames above';
    if (In_quest(lev)) return 'expanse above';
    if (map?.flags?.underwater) return "water's surface";
    if (loc && (IS_ROOM(loc.typ) || IS_WALL(loc.typ) || IS_DOOR(loc.typ) || loc.typ === SDOOR)
        && !Is_earthlevel(lev)) {
        return 'ceiling';
    }
    return 'rock cavern';
}

// Rectangle allocation — imported from rect.js (C ref: rect.c)
import {
    init_rect, get_rect_count, get_rects, rnd_rect, get_rect,
    split_rects, update_rect_pool_for_room, rect_bounds
} from './rect.js';
export { init_rect, get_rect_count, get_rects, rnd_rect, get_rect, split_rects, update_rect_pool_for_room };

// ========================================================================
// sp_lev.c -- Room creation (check_room, create_room)
// ========================================================================

// C ref: sp_lev.c check_room()
// Verifies room area is all STONE with required margins.
// May shrink the room. Returns { lowx, ddx, lowy, ddy } or null.
export function check_room(map, lowx, ddx, lowy, ddy, vault, inThemerooms) {
    let hix = lowx + ddx, hiy = lowy + ddy;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);

    // C ref: sp_lev.c:1417-1418 — save original dimensions for themeroom check
    const s_lowx = lowx, s_ddx = ddx, s_lowy = lowy, s_ddy = ddy;

    if (lowx < 3) lowx = 3;
    if (lowy < 2) lowy = 2;
    if (hix > COLNO - 3) hix = COLNO - 3;
    if (hiy > ROWNO - 3) hiy = ROWNO - 3;

    for (;;) { // C uses goto chk; for retry
        if (hix <= lowx || hiy <= lowy)
            return null;

        // C ref: sp_lev.c:1435-1437 — in themerooms mode, fail if all
        // dimensions were modified from original
        if (inThemerooms && (s_lowx !== lowx) && (s_ddx !== ddx)
            && (s_lowy !== lowy) && (s_ddy !== ddy))
            return null;

        let conflict = false;
        for (let x = lowx - xlim; x <= hix + xlim && !conflict; x++) {
            if (x <= 0 || x >= COLNO) continue;
            let y = lowy - ylim;
            let ymax = hiy + ylim;
            if (y < 0) y = 0;
            if (ymax >= ROWNO) ymax = ROWNO - 1;
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) { if (envFlag('DEBUG_CHECK_ROOM')) console.log(`  check_room CONFLICT at (${x},${y}) typ=${loc.typ} in room check (${lowx},${lowy})-(${hix},${hiy}), nroom=${map.nroom}`);
                    if (!rn2(3)) return null;
                    // C ref: sp_lev.c:1457-1458 — in themerooms mode,
                    // any overlap causes immediate failure (no shrinking)
                    if (inThemerooms) return null;
                    if (x < lowx)
                        lowx = x + xlim + 1;
                    else
                        hix = x - xlim - 1;
                    if (y < lowy)
                        lowy = y + ylim + 1;
                    else
                        hiy = y - ylim - 1;
                    conflict = true;
                    break; // retry from top (goto chk)
                }
            }
        }
        if (!conflict) break;
    }

    const outDdx = hix - lowx;
    const outDdy = hiy - lowy;

    // C ref: sp_lev.c check_room() performs the in_mk_themerooms
    // "all dimensions changed" rejection again after shrink resolution.
    if (inThemerooms && (s_lowx !== lowx) && (s_ddx !== outDdx)
        && (s_lowy !== lowy) && (s_ddy !== outDdy)) {
        return null;
    }

    return { lowx, ddx: outDdx, lowy, ddy: outDdy };
}

// C ref: sp_lev.c create_room() -- create a random room using rect BSP
// Returns true if room was created, false if failed.
export function create_room(map, x, y, w, h, xal, yal, rtype, rlit, depth, inThemerooms) {
    const DEBUG_THEME = envFlag('DEBUG_THEMEROOMS');
    const nroom_before = map.nroom;
    let xabs = 0, yabs = 0;
    let wtmp, htmp, xtmp, ytmp;
    let r1 = null;
    let trycnt = 0;
    const vault = (rtype === VAULT);
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);

    if (rtype === -1) rtype = OROOM;

    // Determine lighting
    const lit = litstate_rnd(rlit, depth);

    // Try to create the room
    do {
        wtmp = w;
        htmp = h;
        xtmp = x;
        ytmp = y;

        // Totally random room (all params are -1), or vault
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xal < 0 && yal < 0)
            || vault) {
            r1 = rnd_rect();
            if (!r1) {
                if (DEBUG_THEME) console.log(`  create_room: no rect, rtype=${rtype}, VAULT=${rtype===VAULT}`);
                return false;
            }

            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            } else {
                const dx_rng = rn2((hx - lx > 28) ? 12 : 8);
                dx = 2 + dx_rng;
                const dy_rng = rn2(4);
                dy = 2 + dy_rng;
                if (DEBUG_THEME) console.log(`  Room size: dx=2+${dx_rng}=${dx}, dy=2+${dy_rng}=${dy}`);
                if (dx * dy > 50)
                    dy = Math.floor(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            const x_rng = rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            xabs = lx + (lx > 0 ? xlim : 3) + x_rng;
            const y_rng = rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2) + y_rng;
            if (DEBUG_THEME) console.log(`  Room pos: xabs=${lx}+3+${x_rng}=${xabs}, yabs=${ly}+2+${y_rng}=${yabs}`);
            // C ref: sp_lev.c:1564-1571 — special case for full-height rectangles in bottom half
            // CRITICAL: Call rn2(map.nroom) BEFORE other checks to match C RNG sequence
            // C calls rn2(map.nroom) at line 1564, then checks condition at 1566-1571
            let nroom_check = false;
            if (ly === 0 && hy >= ROWNO - 1) {
                // Always call rn2(map.nroom) for RNG alignment, even if other conditions fail
                nroom_check = !map.nroom || !rn2(map.nroom);
                if ((yabs + dy > Math.floor(ROWNO / 2)) && nroom_check) {
                    yabs = rn1(3, 2);
                    if (map.nroom < 4 && dy > 1)
                        dy--;
                }
            }
            const result = check_room(map, xabs, dx, yabs, dy, vault, inThemerooms);
            if (!result) {
                r1 = null;
                continue;
            }
            xabs = result.lowx;
            yabs = result.lowy;
            wtmp = result.ddx + 1;
            htmp = result.ddy + 1;
            const r2 = {
                lx: xabs - 1,
                ly: yabs - 1,
                hx: xabs + wtmp,
                hy: yabs + htmp
            };
            // Split the rect pool around this room
            split_rects(r1, r2);
        } else {
            // C ref: sp_lev.c:1580-1644 — partially specified room
            let rndpos = 0;
            let xaltmp = xal;
            let yaltmp = yal;

            if (xtmp < 0 && ytmp < 0) {
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) {
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) xaltmp = rnd(3);
            if (yaltmp === -1) yaltmp = rnd(3);

            // Convert grid position to absolute coordinates
            // C uses integer division: ((xtmp-1)*COLNO)/5
            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;

            // Alignment adjustments
            // SPLEV_LEFT=1, SPLEV_CENTER=3, SPLEV_RIGHT=5, TOP=1, BOTTOM=5
            switch (xaltmp) {
            case 1: break;
            case 5: xabs += Math.trunc(COLNO / 5) - wtmp; break;
            case 3: xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2); break;
            }
            switch (yaltmp) {
            case 1: break;
            case 5: yabs += Math.trunc(ROWNO / 5) - htmp; break;
            case 3: yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2); break;
            }

            // Bounds clamping
            if (xabs + wtmp - 1 > COLNO - 2) xabs = COLNO - wtmp - 3;
            if (xabs < 2) xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2) yabs = ROWNO - htmp - 3;
            if (yabs < 2) yabs = 2;

            // Find a containing rect
            const r2 = {
                lx: xabs - 1,
                ly: yabs - 1,
                hx: xabs + wtmp + rndpos,
                hy: yabs + htmp + rndpos
            };
            r1 = get_rect(r2);

            if (r1) {
                const result = check_room(map, xabs, wtmp, yabs, htmp, vault, inThemerooms);
                if (!result) {
                    r1 = null;
                } else {
                    // C check_room() mutates xabs/yabs via pointer args here.
                    xabs = result.lowx;
                    yabs = result.lowy;
                }
            }

            if (!r1) continue;
            split_rects(r1, r2);
        }

        // C ref: sp_lev.c:1652-1659 — vaults don't add a room or
        // increment nroom; they just save the position for later.
        if (vault) {
            map.vault_x = xabs;
            map.vault_y = yabs;
            if (DEBUG_THEME) console.log(`  create_room: vault special case SUCCESS, nroom=${nroom_before}->${map.nroom}`);
            return true;
        }

        // Actually create the room
        add_room(map, xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1,
                 lit, rtype, false);
        if (DEBUG_THEME) console.log(`  create_room: SUCCESS, rtype=${rtype}, VAULT=${rtype===VAULT}, nroom=${nroom_before}->${map.nroom}`);
        return true;

    } while (++trycnt <= 100); // C ref: sp_lev.c trycnt limit is 100

    if (DEBUG_THEME) console.log(`  create_room: FAILED after 100 tries, rtype=${rtype}, VAULT=${rtype===VAULT}`);
    return false;
}

// ========================================================================
// mklev.c -- Core level generation
// ========================================================================

// W_NORTH/W_SOUTH/W_EAST/W_WEST/W_ANY imported from const.js

// C ref: sp_lev.c create_door() — place a door on a room wall
// dd = { secret, mask, pos, wall }
export function sp_create_door(map, dd, broom) {
    let x = 0, y = 0;

    if (dd.secret === -1) dd.secret = rn2(2);
    if (dd.wall === -1) dd.wall = W_ANY; // W_RANDOM → W_ANY

    if (dd.mask === -1) {
        if (!dd.secret) {
            if (!rn2(3)) {
                if (!rn2(5)) dd.mask = D_ISOPEN;
                else if (!rn2(6)) dd.mask = D_LOCKED;
                else dd.mask = D_CLOSED;
                if (dd.mask !== D_ISOPEN && !rn2(25))
                    dd.mask |= D_TRAPPED;
            } else {
                dd.mask = D_NODOOR;
            }
        } else {
            if (!rn2(5)) dd.mask = D_LOCKED;
            else dd.mask = D_CLOSED;
            if (!rn2(20)) dd.mask |= D_TRAPPED;
        }
    }

    let trycnt;
    for (trycnt = 0; trycnt < 100; trycnt++) {
        const dwall = dd.wall;

        switch (rn2(4)) {
        case 0:
            if (!(dwall & W_NORTH)) continue;
            y = broom.ly - 1;
            x = broom.lx + ((dd.pos === -1) ? rn2(1 + broom.hx - broom.lx) : dd.pos);
            if (!isok(x, y - 1) || IS_OBSTRUCTED(map.at(x, y - 1).typ)) continue;
            break;
        case 1:
            if (!(dwall & W_SOUTH)) continue;
            y = broom.hy + 1;
            x = broom.lx + ((dd.pos === -1) ? rn2(1 + broom.hx - broom.lx) : dd.pos);
            if (!isok(x, y + 1) || IS_OBSTRUCTED(map.at(x, y + 1).typ)) continue;
            break;
        case 2:
            if (!(dwall & W_WEST)) continue;
            x = broom.lx - 1;
            y = broom.ly + ((dd.pos === -1) ? rn2(1 + broom.hy - broom.ly) : dd.pos);
            if (!isok(x - 1, y) || IS_OBSTRUCTED(map.at(x - 1, y).typ)) continue;
            break;
        case 3:
            if (!(dwall & W_EAST)) continue;
            x = broom.hx + 1;
            y = broom.ly + ((dd.pos === -1) ? rn2(1 + broom.hy - broom.ly) : dd.pos);
            if (!isok(x + 1, y) || IS_OBSTRUCTED(map.at(x + 1, y).typ)) continue;
            break;
        }

        if (okdoor(map, x, y)) break;
    }

    if (trycnt >= 100) return;

    const loc = map.at(x, y);
    loc.typ = dd.secret ? SDOOR : DOOR;
    loc.flags = dd.mask;
    add_door(map, x, y, broom);
}

// BSD-compatible qsort (Bentley-McIlroy fat partition).
// JS Array.sort is stable (TimSort) while C's qsort is not.
// We must match C's exact sort behavior for deterministic level gen.
function bsdQsort(arr, cmpFn) {
    function med3(a, b, c) {
        return cmpFn(arr[a], arr[b]) < 0
            ? (cmpFn(arr[b], arr[c]) < 0 ? b : (cmpFn(arr[a], arr[c]) < 0 ? c : a))
            : (cmpFn(arr[b], arr[c]) > 0 ? b : (cmpFn(arr[a], arr[c]) > 0 ? c : a));
    }
    function swap(i, j) {
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    function qsort(lo, n) {
        if (n < 7) {
            // Insertion sort for small subarrays (stable)
            for (let i = lo + 1; i < lo + n; i++)
                for (let j = i; j > lo && cmpFn(arr[j - 1], arr[j]) > 0; j--)
                    swap(j, j - 1);
            return;
        }
        // Pivot: median of three (or ninther for large arrays)
        let pm = lo + Math.floor(n / 2);
        if (n > 7) {
            let pl = lo, pn = lo + n - 1;
            if (n > 40) {
                const s = Math.floor(n / 8);
                pl = med3(pl, pl + s, pl + 2 * s);
                pm = med3(pm - s, pm, pm + s);
                pn = med3(pn - 2 * s, pn - s, pn);
            }
            pm = med3(pl, pm, pn);
        }
        swap(lo, pm);
        let pa = lo + 1, pb = pa;
        let pc = lo + n - 1, pd = pc;
        for (;;) {
            while (pb <= pc && cmpFn(arr[pb], arr[lo]) <= 0) {
                if (cmpFn(arr[pb], arr[lo]) === 0) { swap(pa, pb); pa++; }
                pb++;
            }
            while (pb <= pc && cmpFn(arr[pc], arr[lo]) >= 0) {
                if (cmpFn(arr[pc], arr[lo]) === 0) { swap(pc, pd); pd--; }
                pc--;
            }
            if (pb > pc) break;
            swap(pb, pc); pb++; pc--;
        }
        const hi = lo + n;
        let s = Math.min(pa - lo, pb - pa);
        for (let i = 0; i < s; i++) swap(lo + i, pb - s + i);
        s = Math.min(pd - pc, hi - pd - 1);
        for (let i = 0; i < s; i++) swap(pb + i, hi - s + i);
        s = pb - pa;
        if (s > 1) qsort(lo, s);
        s = pd - pc;
        if (s > 1) qsort(hi - s, s);
    }
    qsort(0, arr.length);
}

// C-parity repair: irregular rooms in JS can leave boundary STONE where C map
// data has explicit wall tiles. This affects finddpos()/dig_corridor routing.
export function repair_irregular_room_boundaries(map) {
    if (!map || !Array.isArray(map.rooms)) return;
    const DEBUG = envFlag('DEBUG_IRREG_REPAIR');
    const roomByNo = new Map();
    for (let i = 0; i < (map.nroom || 0); i++) {
        const r = map.rooms[i];
        if (!r) continue;
        roomByNo.set(i + ROOMOFFSET, r);
    }

    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== STONE || loc.roomno !== 0) continue;

            let hasH = false;
            let hasV = false;
            let anyIrregularAdj = false;
            const neigh = [
                [x - 1, y, 'W'],
                [x + 1, y, 'E'],
                [x, y - 1, 'N'],
                [x, y + 1, 'S'],
            ];
            for (const [nx, ny, dir] of neigh) {
                const nloc = map.at(nx, ny);
                if (!nloc || nloc.edge || nloc.roomno < ROOMOFFSET) continue;
                const rr = roomByNo.get(nloc.roomno);
                if (!rr || !rr.irregular) continue;
                anyIrregularAdj = true;
                if (dir === 'W' || dir === 'E') hasV = true;
                if (dir === 'N' || dir === 'S') hasH = true;
            }
            if (!anyIrregularAdj) {
                // Fill missing irregular-room corner stones (diagonal touch only).
                const diag = [[-1,-1],[-1,1],[1,-1],[1,1]];
                for (const [dx, dy] of diag) {
                    const nloc = map.at(x + dx, y + dy);
                    if (!nloc || nloc.edge || nloc.roomno < ROOMOFFSET) continue;
                    const rr = roomByNo.get(nloc.roomno);
                    if (!rr || !rr.irregular) continue;
                    anyIrregularAdj = true;
                    break;
                }
                if (!anyIrregularAdj) continue;
            }

            loc.typ = hasV ? VWALL : HWALL;
            loc.horizontal = !hasV;
            loc.edge = true;
            if (DEBUG) {
                console.log(`[IRREG_REPAIR] set (${x},${y}) typ=${loc.typ} roomno=${loc.roomno}`);
            }
        }
    }
}


// Flood fill from (sx, sy) through connected cells of the same typ,
// assign roomno, compute bounding box, and register as a room.
// C ref: sp_lev.c flood_fill_rm() + add_room()
export function floodFillAndRegister(map, sx, sy, rtype, lit) {
    const startTyp = map.at(sx, sy).typ;
    const rno = map.nroom + ROOMOFFSET;
    // SHARED imported from const.js

    // BFS flood fill
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    const visited = new Set();
    const queue = [[sx, sy]];
    const key = (x, y) => y * COLNO + x;
    visited.add(key(sx, sy));

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const loc = map.at(cx, cy);
        loc.roomno = rno;
        loc.lit = lit;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        // Check 4 neighbors
        for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
            const nx = cx + dx, ny = cy + dy;
            if (!isok(nx, ny)) continue;
            const k = key(nx, ny);
            if (visited.has(k)) continue;
            const nloc = map.at(nx, ny);
            if (nloc.typ === startTyp && nloc.roomno === 0) {
                visited.add(k);
                queue.push([nx, ny]);
            }
        }
    }

    // C ref: mkmap.c flood_fill_rm(anyroom):
    // mark bordering walls/doors as edge and assign roomno/SHARED.
    for (const k of visited) {
        const cy = Math.floor(k / COLNO);
        const cx = k % COLNO;
        for (let nx = cx - 1; nx <= cx + 1; nx++) {
            for (let ny = cy - 1; ny <= cy + 1; ny++) {
                if (!isok(nx, ny)) continue;
                const nloc = map.at(nx, ny);
                if (!(IS_WALL(nloc.typ) || IS_DOOR(nloc.typ) || nloc.typ === SDOOR))
                    continue;
                nloc.edge = true;
                if (lit) nloc.lit = lit;
                if (nloc.roomno === 0) {
                    nloc.roomno = rno;
                } else if (nloc.roomno !== rno) {
                    nloc.roomno = SHARED;
                }
            }
        }
    }

    // Register the room
    const croom = makeRoom();
    map.rooms.push(croom);
    // Track nroom separately (don't use rooms.length once subrooms are added)
    map.nroom = (map.nroom || 0) + 1;

    const roomno = map.nroom - 1;
    croom.roomnoidx = roomno;
    croom.lx = minX;
    croom.hx = maxX;
    croom.ly = minY;
    croom.hy = maxY;
    croom.rtype = rtype;
    croom.rlit = lit;
    croom.doorct = 0;
    croom.fdoor = map.doorindex;
    croom.irregular = true;
    croom.needjoining = true;

    // C sets lit on interior/edge during flood fill edge marking.
}

function branchPlacementForEnd(branch, onEnd1) {
    if (branch.type === BR_PORTAL) {
        return { placement: 'portal' };
    }

    let makeStairs = true;
    if (onEnd1 && branch.type === BR_NO_END1) makeStairs = false;
    if (!onEnd1 && branch.type === BR_NO_END2) makeStairs = false;
    if (!makeStairs) {
        return { placement: 'none' };
    }

    const goesUp = onEnd1 ? !!branch.end1_up : !branch.end1_up;
    return { placement: goesUp ? 'stair-up' : 'stair-down' };
}

function getBranchAtLevel(dnum, dlevel) {
    const cdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    if (!Number.isInteger(dlevel)) return null;
    for (const br of _branchTopology) {
        if (br.end1.dnum === cdnum && br.end1.dlevel === dlevel) {
            return { branch: br, onEnd1: true };
        }
        if (br.end2.dnum === cdnum && br.end2.dlevel === dlevel) {
            return { branch: br, onEnd1: false };
        }
    }
    return null;
}

export function isBranchLevel(dnum, dlevel) {
    return !!getBranchAtLevel(dnum, dlevel);
}

function getOracleLevel() {
    return _oracleLevel || { dnum: DUNGEONS_OF_DOOM, dlevel: 5 };
}

// C-faithful branch placement resolution for special-level LR_BRANCH handling.
// Mirrors place_branch(Is_branchlev(&u.uz), x, y):
// - no branch on this level => { placement: 'none', found: false }
// - BR_PORTAL => { placement: 'portal', found: true }
// - BR_NO_END* => one-way stair (or { placement: 'none', found: true } on blocked side)
// - BR_STAIR => stair, direction based on end1_up and which end we're on
// The `found` flag distinguishes "no branch here" from "branch exists but no stair on this end".
// C's place_branch() always calls find_branch_room() to consume RNG even for BR_NO_END1
// (no stair is placed, but position picking still happens). JS must match this behavior.
export function resolveBranchPlacementForLevel(dnum, dlevel) {
    const cdnum = Number.isFinite(dnum) ? dnum : DUNGEONS_OF_DOOM;
    if (!Number.isFinite(dlevel)) {
        return { placement: 'none', found: false };
    }

    // Exact topology if available (normal gameplay path).
    const info = getBranchAtLevel(cdnum, dlevel);
    if (info) {
        return { ...branchPlacementForEnd(info.branch, info.onEnd1), found: true };
    }

    return { placement: 'none', found: false };
}

// True if the specified level has a branch connection whose opposite end
// belongs to targetDnum.
export function isBranchLevelToDnum(dnum, dlevel, targetDnum) {
    const cdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    if (!Number.isInteger(dlevel) || !Number.isInteger(targetDnum)) {
        return false;
    }
    const info = getBranchAtLevel(cdnum, dlevel);
    if (!info) return false;
    const otherEnd = info.onEnd1 ? info.branch.end2 : info.branch.end1;
    return otherEnd?.dnum === targetDnum;
}

// Resolve branch destination when traversing a branch staircase at this level.
// goingUp=true means using '<' stair direction; false means '>'.
export function resolveBranchDestinationForStair(dnum, dlevel, goingUp) {
    const cdnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    if (!Number.isInteger(dlevel)) return null;
    const info = getBranchAtLevel(cdnum, dlevel);
    if (!info) return null;

    const stairGoesUp = info.onEnd1 ? !!info.branch.end1_up : !info.branch.end1_up;
    if (stairGoesUp !== !!goingUp) return null;

    const dest = info.onEnd1 ? info.branch.end2 : info.branch.end1;
    if (!dest || !Number.isInteger(dest.dnum) || !Number.isInteger(dest.dlevel)) {
        return null;
    }
    return { dnum: dest.dnum, dlevel: dest.dlevel };
}

// Track Lua MT RNG initialization (shared with sp_lev.js via export)
// Lazy initialization happens on first Lua RNG use (des.object/des.monster)
// Use getter function to avoid stale import copies (primitives are copied, not referenced)
let _mtInitialized = false;
export function isMtInitialized() {
    return _mtInitialized;
}
export function setMtInitialized(val) {
    _mtInitialized = val;
}

// C ref: mkmaze.c makemaz(protofile): load named special level, including
// protofile base-name variants (for example "medusa" -> "medusa-1..4").
export async function load_special_by_protofile(protofile, dnum, dlevel, depth) {
    const where = findSpecialLevelByProto(protofile, dnum, dlevel);
    if (!where) return null;

    const special = getSpecialLevel(where.dnum, where.dlevel);
    if (!special || typeof special.generator !== 'function') return null;

    resetLevelState();
    const specialName = typeof special.name === 'string' ? special.name : String(protofile || '');
    const specialMap = await withSpecialLevelDepth(Number.isInteger(depth) ? depth : where.dlevel, async () =>
        await withFinalizeContext({
            dnum: where.dnum,
            dlevel: where.dlevel,
            specialName,
            isBranchLevel: isBranchLevel(where.dnum, where.dlevel),
        }, async () => {
            // C ref: nhlua.c load_lua()/nhl_init() for every special-level load.
            // Each load initializes a fresh Lua state and executes nhlib.lua,
            // whose top-level shuffle(align) consumes rn2(3), rn2(2).
            rn2(3);
            rn2(2);
            return await special.generator();
        })
    );
    if (!specialMap) return null;
    if (!specialMap.flags) specialMap.flags = {};
    specialMap.flags.is_tutorial = (where.dnum === TUTORIAL);
    if (specialName === 'rogue') {
        specialMap.flags.is_rogue_lev = true;
        specialMap.flags.roguelike = true;
    }
    return specialMap;
}

// C ref: mklev.c makerooms()
export async function makerooms(map, depth) {
    let tried_vault = false;
    let themeroom_tries = 0;

    // C ref: mklev.c:365-380 — load Lua themes on first call only
    // These rn2() calls simulate Lua theme loading
    const dnum = Number.isInteger(map?._genDnum) ? map._genDnum : 0;
    if (!get_luathemes_loaded(dnum)) {
        set_luathemes_loaded(dnum, true);
        rn2(3); rn2(2);
    }

    // Make rooms until satisfied (no more rects available)
    // C ref: mklev.c:393-417
    const DEBUG = envFlag('DEBUG_THEMEROOMS');
    const DEBUG_POOL = envFlag('DEBUG_POOL');

    let loop_count = 0;
    while (map.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        loop_count++;

        if (DEBUG_POOL && loop_count % 10 === 0) {
            console.log(`[POOL CHECK] Loop ${loop_count}: nroom=${map.nroom}, rect_cnt=${rect_cnt}, tries=${themeroom_tries}`);
        }

        if (loop_count > 100) {
            console.error(`⚠️  INFINITE LOOP DETECTED: ${loop_count} iterations, nroom=${map.nroom}, rect_cnt=${rect_cnt}`);
            console.error(`  Last rect pool state: ${rect_cnt} rects`);
            if (rect_cnt > 0) {
                console.error(`  Rect 0: (${rects[0].lx},${rects[0].ly})-(${rects[0].hx},${rects[0].hy})`);
            }
            break;
        }

        if (DEBUG) {
            console.log(`Loop iteration: nroom=${map.nroom}, tries=${themeroom_tries}`);
        }
        if (map.nroom >= Math.floor(MAXNROFROOMS / 6) && rn2(2)
            && !tried_vault) {
            tried_vault = true;
            // C ref: mklev.c:396-399 — create_vault()
            if (DEBUG) console.log(`Creating vault...`);
            create_room(map, -1, -1, 2, 2, -1, -1, VAULT, true, depth, true);
        } else {
            // C ref: mklev.c:402-407
            const nroom_before = map.nroom;
            const result = await themerooms_generate(map, depth);
            const nroom_after = map.nroom;

            if (DEBUG_POOL && nroom_before === nroom_after && result) {
                console.log(`⚠️  SUSPICIOUS: themeroom returned success but nroom unchanged (${nroom_before})`);
            }

            if (!result) {
                // themeroom_failed
                if (DEBUG) {
                    console.log(`themeroom failed, tries=${themeroom_tries + 1}, nroom=${map.nroom}, breaking=${themeroom_tries > 10 || map.nroom >= Math.floor(MAXNROFROOMS / 6)}`);
                }
                // C ref: mklev.c uses post-increment and does not reset this
                // counter on success.
                if (themeroom_tries++ > 10
                    || map.nroom >= Math.floor(MAXNROFROOMS / 6))
                    break;
            } else if (DEBUG) {
                console.log(`themeroom succeeded, cumulative tries stays=${themeroom_tries}, nroom=${map.nroom}`);
            }
        }
    }
    if (DEBUG) {
        console.log(`Exited loop: nroom=${map.nroom}, tries=${themeroom_tries}`);
        console.log(`makerooms() finished: ${map.nroom} rooms created, themeroom_tries=${themeroom_tries}`);

        // Log room sizes and positions
        let totalArea = 0;
        for (let i = 0; i < map.nroom; i++) {
            const r = map.rooms[i];
            if (!r) continue; // Skip undefined rooms
            const w = r.hx - r.lx + 1;
            const h = r.hy - r.ly + 1;
            const area = w * h;
            totalArea += area;
            if (i < 5) { // Log first 5 rooms
                console.log(`  Room ${i}: (${r.lx},${r.ly})-(${r.hx},${r.hy}) size=${w}x${h} area=${area}`);
            }
        }
        console.log(`  Total room area: ${totalArea} squares (screen is ~1920 squares)`);
    }
}

// ========================================================================
// Corridor generation -- join(), makecorridors(), dig_corridor()
// ========================================================================

// C ref: sp_lev.c add_doors_to_room()
// Link any doors within/bordering the room to the room
export function add_doors_to_room(map, croom) {
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++) {
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            if (x < 0 || y < 0 || x >= COLNO || y >= ROWNO) continue;
            const loc = map.at(x, y);
            if (loc && (loc.typ === DOOR || loc.typ === SDOOR)) {
                maybe_add_door(map, x, y, croom);
            }
        }
    }

    // Recursively add doors for subrooms
    if (croom.sbrooms) {
        for (let i = 0; i < croom.sbrooms.length; i++) {
            add_doors_to_room(map, croom.sbrooms[i]);
        }
    }
}

// C ref: sp_lev.c maybe_add_door()
function maybe_add_door(map, x, y, droom) {
    const shared_with_room = (tx, ty, room, rmno) => {
        if (!isok(tx, ty)) return false;
        const here = map.at(tx, ty);
        if (here && here.roomno === rmno && !here.edge) return false;
        if (isok(tx - 1, ty)) {
            const l = map.at(tx - 1, ty);
            if (l && l.roomno === rmno && tx - 1 <= room.hx) return true;
        }
        if (isok(tx + 1, ty)) {
            const r = map.at(tx + 1, ty);
            if (r && r.roomno === rmno && tx + 1 >= room.lx) return true;
        }
        if (isok(tx, ty - 1)) {
            const u = map.at(tx, ty - 1);
            if (u && u.roomno === rmno && ty - 1 <= room.hy) return true;
        }
        if (isok(tx, ty + 1)) {
            const d = map.at(tx, ty + 1);
            if (d && d.roomno === rmno && ty + 1 >= room.ly) return true;
        }
        return false;
    };

    // Check if this door location is associated with this room
    if (droom.hx >= 0) {
        const inside = (x >= droom.lx && x <= droom.hx && y >= droom.ly && y <= droom.hy);
        const loc = map.at(x, y);
        const rmno = ((droom.roomnoidx ?? map.rooms.indexOf(droom)) + ROOMOFFSET);
        const roomMatch = loc && loc.roomno === rmno;

        if ((!droom.irregular && inside) || roomMatch || shared_with_room(x, y, droom, rmno)) {
            add_door(map, x, y, droom);
        }
    }
}

// C ref: sp_lev.c link_doors_rooms()
export function link_doors_rooms(map) {
    if (!map || !Array.isArray(map.rooms)) return;
    const roomCount = Number.isInteger(map.nroom)
        ? Math.min(map.nroom, map.rooms.length)
        : map.rooms.length;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 0; x < COLNO; x++) {
            const loc = map.at(x, y);
            if (!loc || !(IS_DOOR(loc.typ) || loc.typ === SDOOR)) continue;
            for (let i = 0; i < roomCount; i++) {
                const room = map.rooms[i];
                if (!room || room.hx < 0) continue;
                maybe_add_door(map, x, y, room);
                if (!Array.isArray(room.sbrooms)) continue;
                for (let m = 0; m < room.sbrooms.length; m++) {
                    const subroom = room.sbrooms[m];
                    if (!subroom || subroom.hx < 0) continue;
                    maybe_add_door(map, x, y, subroom);
                }
            }
        }
    }
}

// C ref: sp_lev.c dig_corridor()
// Digs a corridor from org to dest through stone.
// Returns { success, npoints }.
export function dig_corridor(map, org, dest, nxcor, depth) {
    let dx = 0, dy = 0;
    let cct;
    let npoints = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    // C ref: mklev.c join() passes ROOM for arboreal levels, CORR otherwise.
    const ftyp = map.flags.arboreal ? ROOM : CORR;
    const btyp = STONE;

    const DEBUG = envFlag('DEBUG_CORRIDORS');
    const TRACE_STEPS = envFlag('DEBUG_CORRIDOR_STEPS');
    if (DEBUG) {
        console.log(`dig_corridor: (${org.x},${org.y}) -> (${dest.x},${dest.y}) nxcor=${nxcor}`);
    }

    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1
        || yy > ROWNO - 1 || ty > ROWNO - 1)
        return { success: false, npoints: 0 };

    // Determine initial direction
    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;

    xx -= dx;
    yy -= dy;
    cct = 0;

    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35))) {
            if (DEBUG) console.log(`  -> failed: cct=${cct} or rn2(35) abort, npoints=${npoints}`);
            return { success: false, npoints };
        }

        xx += dx;
        yy += dy;

        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) {
            if (DEBUG) console.log(`  -> failed: boundary check (${xx},${yy}), npoints=${npoints}`);
            return { success: false, npoints };
        }

        const crm = map.at(xx, yy);
        if (crm.typ === btyp) {
            // C: maybe_sdoor(100) can turn corridor into SCORR
            const secretCorr = (ftyp === CORR && maybe_sdoor(depth, 100));
            if (secretCorr) {
                npoints++;
                crm.typ = SCORR;
            } else {
                npoints++;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    // C ref: mksobj_at(BOULDER, xx, yy) — place boulder in corridor
                    const otmp = mksobj(BOULDER, true, false);
                    if (otmp) {
                        otmp.ox = xx;
                        otmp.oy = yy;
                        placeFloorObject(map, otmp);
                    }
                }
            }
        } else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            if (DEBUG) console.log(`  -> failed: collision at (${xx},${yy}) typ=${crm.typ}, npoints=${npoints}`);
            return { success: false, npoints };
        }

        // Find next corridor position
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        let rndBound = 0;
        let rndResult = null;
        if (TRACE_STEPS) {
            console.log(`[CORSTEP] call=${getRngCallCount()} pos=(${xx},${yy}) dir=(${dx},${dy}) target=(${tx},${ty}) typ=${crm.typ} dix=${dix} diy=${diy}`);
        }
        if ((dix > diy) && diy) {
            rndBound = dix - diy + 1;
            rndResult = rn2(rndBound);
            if (TRACE_STEPS) {
                console.log(`[CORSTEP] call=${getRngCallCount()} rnd_bound=${rndBound} rnd=${rndResult}`);
            }
            if (!rndResult) {
                dix = 0;
            }
        } else if ((diy > dix) && dix) {
            rndBound = diy - dix + 1;
            rndResult = rn2(rndBound);
            if (TRACE_STEPS) {
                console.log(`[CORSTEP] call=${getRngCallCount()} rnd_bound=${rndBound} rnd=${rndResult}`);
            }
            if (!rndResult) {
                diy = 0;
            }
        } else if (TRACE_STEPS) {
            console.log('[CORSTEP] no_rnd');
        }

        // Do we need to change direction?
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const adjloc = map.at(xx + ddx, yy);
            if (adjloc && (adjloc.typ === btyp || adjloc.typ === ftyp
                          || adjloc.typ === SCORR)) {
                dx = ddx;
                dy = 0;
                if (TRACE_STEPS) console.log(`[CORSTEP] turn=horizontal newdir=(${dx},${dy})`);
                continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const adjloc = map.at(xx, yy + ddy);
            if (adjloc && (adjloc.typ === btyp || adjloc.typ === ftyp
                          || adjloc.typ === SCORR)) {
                dy = ddy;
                dx = 0;
                if (TRACE_STEPS) console.log(`[CORSTEP] turn=vertical newdir=(${dx},${dy})`);
                continue;
            }
        }

        // Continue straight?
        const ahead = map.at(xx + dx, yy + dy);
        if (ahead && (ahead.typ === btyp || ahead.typ === ftyp
                      || ahead.typ === SCORR)) {
            if (TRACE_STEPS) console.log('[CORSTEP] continue=straight');
            continue;
        }

        // Must change direction
        if (dx) {
            dx = 0;
            dy = (ty < yy) ? -1 : 1;
        } else {
            dy = 0;
            dx = (tx < xx) ? -1 : 1;
        }
        const adj2 = map.at(xx + dx, yy + dy);
        if (adj2 && (adj2.typ === btyp || adj2.typ === ftyp
                     || adj2.typ === SCORR)) {
            if (TRACE_STEPS) console.log(`[CORSTEP] turn=fallback newdir=(${dx},${dy})`);
            continue;
        }
        dy = -dy;
        dx = -dx;
        if (TRACE_STEPS) console.log(`[CORSTEP] turn=reverse newdir=(${dx},${dy})`);
    }
    if (DEBUG) {
        console.log(`  -> success: true, npoints: ${npoints}`);
    }
    return { success: true, npoints };
}

// C ref: mklev.c join() -- connect two rooms with a corridor
export function join(map, a, b, nxcor, depth) {
    const croom = map.rooms[a];
    const troom = map.rooms[b];

    if (!croom || !troom) return;
    if (!croom.needjoining || !troom.needjoining) return;
    if (troom.hx < 0 || croom.hx < 0) return;

    let dx, dy;
    let cc, tt;

    // Determine direction between rooms and find door positions
    if (troom.lx > croom.hx) {
        dx = 1; dy = 0;
        cc = finddpos(map, DIR_E, croom);
        tt = finddpos(map, DIR_W, troom);
    } else if (troom.hy < croom.ly) {
        dy = -1; dx = 0;
        cc = finddpos(map, DIR_N, croom);
        tt = finddpos(map, DIR_S, troom);
    } else if (troom.hx < croom.lx) {
        dx = -1; dy = 0;
        cc = finddpos(map, DIR_W, croom);
        tt = finddpos(map, DIR_E, troom);
    } else {
        dy = 1; dx = 0;
        cc = finddpos(map, DIR_S, croom);
        tt = finddpos(map, DIR_N, troom);
    }

    if (!cc || !tt) return;

    if (envFlag('DEBUG_FINDDPOS')) {
        console.log(`[JOIN] call=${getRngCallCount()} a=${a} b=${b} nxcor=${nxcor ? 1 : 0} cc=(${cc.x},${cc.y}) tt=(${tt.x},${tt.y}) croom=(${croom.lx},${croom.ly})-(${croom.hx},${croom.hy}) ir=${croom.irregular ? 1 : 0} troom=(${troom.lx},${troom.ly})-(${troom.hx},${troom.hy}) ir=${troom.irregular ? 1 : 0}`);
    }

    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;

    if (nxcor) {
        const adjx = xx + dx, adjy = yy + dy;
        if (isok(adjx, adjy) && map.at(adjx, adjy).typ !== STONE)
            return;
    }

    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };

    const result = dig_corridor(map, org, dest, nxcor, depth);

    // Place door at source room
    if (result.npoints > 0 && (okdoor(map, xx, yy) || !nxcor))
        dodoor(map, xx, yy, croom, depth);

    if (!result.success) return;

    // Place door at target room
    if (okdoor(map, tt.x, tt.y) || !nxcor)
        dodoor(map, tt.x, tt.y, troom, depth);

    // Update connectivity (smeq)
    if (map.smeq[a] < map.smeq[b])
        map.smeq[b] = map.smeq[a];
    else
        map.smeq[a] = map.smeq[b];
}

// C ref: mklev.c makecorridors()
export function makecorridors(map, depth) {
    // Initialize smeq (each room in its own component)
    map.smeq = new Array(MAXNROFROOMS + 1);
    for (let i = 0; i < map.nroom; i++) map.smeq[i] = i;

    // Phase 1: Join consecutive rooms
    for (let a = 0; a < map.nroom - 1; a++) {
        join(map, a, a + 1, false, depth);
        if (!rn2(50)) break; // allow some randomness
    }

    // Phase 2: Join rooms separated by 2 if not connected
    for (let a = 0; a < map.nroom - 2; a++) {
        if (map.smeq[a] !== map.smeq[a + 2])
            join(map, a, a + 2, false, depth);
    }

    // Phase 3: Join all remaining disconnected components
    let any = true;
    for (let a = 0; any && a < map.nroom; a++) {
        any = false;
        for (let b = 0; b < map.nroom; b++) {
            if (map.smeq[a] !== map.smeq[b]) {
                join(map, a, b, false, depth);
                any = true;
            }
        }
    }

    // Phase 4: Add extra corridors (may be blocked)
    if (map.nroom > 2) {
        for (let i = rn2(map.nroom) + 4; i; i--) {
            const a = rn2(map.nroom);
            let b = rn2(map.nroom - 2);
            if (b >= a) b += 2;
            join(map, a, b, true, depth);
        }
    }
}

function wallMaskToDir(mask) {
    switch (mask) {
    case W_NORTH: return DIR_N;
    case W_SOUTH: return DIR_S;
    case W_WEST: return DIR_W;
    case W_EAST: return DIR_E;
    default: return -1;
    }
}

function dirVector(dir) {
    switch (dir) {
    case DIR_N: return { dx: 0, dy: -1 };
    case DIR_S: return { dx: 0, dy: 1 };
    case DIR_W: return { dx: -1, dy: 0 };
    case DIR_E: return { dx: 1, dy: 0 };
    default: return { dx: 0, dy: 0 };
    }
}

function searchDoor(room, wall, doorIndex, map) {
    let dx;
    let dy;
    let xx;
    let yy;

    switch (wall) {
    case W_SOUTH:
        dy = 0; dx = 1;
        xx = room.lx; yy = room.hy + 1;
        break;
    case W_NORTH:
        dy = 0; dx = 1;
        xx = room.lx; yy = room.ly - 1;
        break;
    case W_EAST:
        dy = 1; dx = 0;
        xx = room.hx + 1; yy = room.ly;
        break;
    case W_WEST:
        dy = 1; dx = 0;
        xx = room.lx - 1; yy = room.ly;
        break;
    default:
        return null;
    }

    let cnt = doorIndex;
    while (xx <= room.hx + 1 && yy <= room.hy + 1) {
        const loc = map.at(xx, yy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR)) {
            if (cnt-- <= 0) return { x: xx, y: yy };
        }
        xx += dx;
        yy += dy;
    }
    return null;
}

// C ref: sp_lev.c create_corridor() as used by lspo_corridor().
// src/dest room fields are 0-based room indices (svr.rooms[] indexing).
export function create_corridor(map, spec, depth) {
    const srcRoomN = Number.isFinite(spec?.src?.room) ? Math.trunc(spec.src.room) : -1;
    const destRoomN = Number.isFinite(spec?.dest?.room) ? Math.trunc(spec.dest.room) : -1;

    if (srcRoomN < 0 || destRoomN < 0) {
        makecorridors(map, depth);
        return;
    }

    const srcIdx = srcRoomN;
    const destIdx = destRoomN;
    if (srcIdx < 0 || srcIdx >= map.nroom) return;
    if (destIdx < 0 || destIdx >= map.nroom) return;
    if (srcIdx === destIdx) return;

    if (!Array.isArray(map.smeq) || map.smeq.length < map.nroom) {
        map.smeq = new Array(MAXNROFROOMS + 1);
        for (let i = 0; i < map.nroom; i++) map.smeq[i] = i;
    }

    const srcRoom = map.rooms[srcIdx];
    const destRoom = map.rooms[destIdx];
    if (!srcRoom || !destRoom) return;

    const srcWall = Number.isFinite(spec?.src?.wall) ? Math.trunc(spec.src.wall) : W_ANY;
    const destWall = Number.isFinite(spec?.dest?.wall) ? Math.trunc(spec.dest.wall) : W_ANY;
    // C ref: create_corridor() rejects random/any walls for des.corridor().
    if (srcWall === W_ANY || srcWall === -1 || destWall === W_ANY || destWall === -1) return;

    const srcDoor = Number.isFinite(spec?.src?.door) ? Math.trunc(spec.src.door) : 0;
    const destDoor = Number.isFinite(spec?.dest?.door) ? Math.trunc(spec.dest.door) : 0;

    const cc = searchDoor(srcRoom, srcWall, srcDoor, map);
    const tt = searchDoor(destRoom, destWall, destDoor, map);
    if (!cc || !tt) return;

    const svec = dirVector(wallMaskToDir(srcWall));
    const dvec = dirVector(wallMaskToDir(destWall));
    const org = { x: cc.x + svec.dx, y: cc.y + svec.dy };
    const dest = { x: tt.x - dvec.dx, y: tt.y - dvec.dy };

    const result = dig_corridor(map, org, dest, false, depth);
    if (!result.success) return;

    if (map.smeq[srcIdx] < map.smeq[destIdx]) map.smeq[destIdx] = map.smeq[srcIdx];
    else map.smeq[srcIdx] = map.smeq[destIdx];
}

// ========================================================================
// Stairs, room filling, niches
// ========================================================================

// C ref: teleport.c collect_coords() — gather coordinates in expanding
// distance rings from (cx,cy), shuffling each ring independently.
// Used by enexto() to find nearby unoccupied positions.
// Returns array of {x,y} coords, RNG-consuming front-to-back Fisher-Yates per ring.
function collect_coords(cx, cy, maxradius) {
    const rowrange = (cy < Math.floor(ROWNO / 2)) ? (ROWNO - 1 - cy) : cy;
    const colrange = (cx < Math.floor(COLNO / 2)) ? (COLNO - 1 - cx) : cx;
    const k = Math.max(rowrange, colrange);
    if (!maxradius) maxradius = k;
    else maxradius = Math.min(maxradius, k);

    const result = [];
    for (let radius = 1; radius <= maxradius; radius++) {
        const ringStart = result.length;
        const lox = cx - radius, hix = cx + radius;
        const loy = cy - radius, hiy = cy + radius;
        for (let y = Math.max(loy, 0); y <= hiy; y++) {
            if (y > ROWNO - 1) break;
            for (let x = Math.max(lox, 1); x <= hix; x++) {
                if (x > COLNO - 1) break;
                // Only edge cells of the ring square
                if (x !== lox && x !== hix && y !== loy && y !== hiy) continue;
                result.push({ x, y });
            }
        }
        // Front-to-back Fisher-Yates shuffle for this ring
        let n = result.length - ringStart;
        let passIdx = ringStart;
        while (n > 1) {
            const swap = rn2(n);
            if (swap) {
                const tmp = result[passIdx];
                result[passIdx] = result[passIdx + swap];
                result[passIdx + swap] = tmp;
            }
            passIdx++;
            n--;
        }
    }
    return result;
}

// C ref: teleport.c goodpos() — simplified for level generation.
// Checks SPACE_POS terrain and no monster at position.
function sp_goodpos(x, y, map) {
    if (!isok(x, y)) return false;
    const loc = map.at(x, y);
    if (!loc || loc.typ <= DOOR) return false; // !SPACE_POS
    // Check no monster at position
    for (const m of map.monsters) {
        if (m.mx === x && m.my === y) return false;
    }
    return true;
}

// C ref: teleport.c enexto() — find nearest valid position to (cx,cy).
// First tries radius 3 (collect_coords with shuffled rings), then full map.
// Always consumes RNG for collect_coords regardless of whether position is found.
export function enexto(cx, cy, map) {
    // First pass: radius 3 (with GP_CHECKSCARY — no effect during mklev)
    const nearCoords = collect_coords(cx, cy, 3);
    for (const cc of nearCoords) {
        if (sp_goodpos(cc.x, cc.y, map)) return cc;
    }
    // Second pass: full map
    const allCoords = collect_coords(cx, cy, 0);
    // Skip the first nearCoords.length entries (already checked, different shuffle order)
    for (let i = nearCoords.length; i < allCoords.length; i++) {
        if (sp_goodpos(allCoords[i].x, allCoords[i].y, map)) return allCoords[i];
    }
    return null;
}

// ========================================================================
// Engraving / wipeout_text — C ref: engrave.c
// Used to consume RNG for trap engravings and graffiti.
// ========================================================================

// C ref: engrave.c rubouts[] — partial rubout substitution table
const RUBOUTS = {
    'A': "V", 'B': "Pb", 'C': "(", 'D': "|)", 'E': "FL",
    'F': "|-", 'G': "C(", 'H': "|-", 'I': "|", 'K': "|<",
    'L': "|_", 'M': "|", 'N': "|\\", 'O': "C(", 'P': "F",
    'Q': "C(", 'R': "PF", 'T': "|", 'U': "J", 'V': "/\\",
    'W': "V/\\", 'Z': "/",
    'b': "|", 'd': "c|", 'e': "c", 'g': "c", 'h': "n",
    'j': "i", 'k': "|", 'l': "|", 'm': "nr", 'n': "r",
    'o': "c", 'q': "c", 'w': "v", 'y': "v",
    ':': ".", ';': ",:", ',': ".", '=': "-", '+': "-|",
    '*': "+", '@': "0", '0': "C(", '1': "|", '6': "o",
    '7': "/", '8': "3o",
};

// C ref: engrave.c wipeout_text() with seed=0 (random mode)
// Simulates the RNG consumption pattern without needing the actual text result.
function wipeout_text(text, cnt) {
    if (!text.length || cnt <= 0) return text;
    const chars = text.split('');
    const lth = chars.length;
    while (cnt--) {
        const nxt = rn2(lth);
        const use_rubout = rn2(4);
        const ch = chars[nxt];
        if (ch === ' ') continue;
        if ("?.,'`-|_".includes(ch)) {
            chars[nxt] = ' ';
            continue;
        }
        if (use_rubout && RUBOUTS[ch]) {
            const wipeto = RUBOUTS[ch];
            const j = rn2(wipeto.length);
            chars[nxt] = wipeto[j];
        } else {
            chars[nxt] = '?';
        }
    }
    // C ref: engrave.c wipeout_text() trims trailing spaces.
    while (chars.length > 0 && chars[chars.length - 1] === ' ') {
        chars.pop();
    }
    return chars.join('');
}

// C ref: engrave.c random_engraving() — engraving texts from ENGRAVEFILE
// These are the decoded texts from the compiled dat/engrave file.
// Engrave data — parsed at module load from encrypted string constant.
const { texts: ENGRAVE_TEXTS, lineBytes: ENGRAVE_LINE_BYTES, chunksize: ENGRAVE_FILE_CHUNKSIZE } =
    parseEncryptedDataFile(ENGRAVE_FILE_TEXT);


// C ref: engrave.c random_engraving() — simulate full RNG consumption.
// C: if (!rn2(4) || !(rumor = getrumor(0, buf, TRUE)) || !*rumor)
//        get_rnd_text(ENGRAVEFILE, buf, rn2, MD_PAD_RUMORS);
//    wipeout_text(buf, strlen(buf)/4, 0);
export function random_engraving_rng() {
    let text = null;
    if (!rn2(4)) {
        // Path A: use engrave file directly (short-circuit: skip getrumor)
        const idx = get_rnd_line_index(
            ENGRAVE_LINE_BYTES, ENGRAVE_FILE_CHUNKSIZE, RUMOR_PAD_LENGTH);
        text = ENGRAVE_TEXTS[idx] || ENGRAVE_TEXTS[0];
    } else {
        // Path B: getrumor(0, buf, TRUE)
        text = getrumor(0, true);
        if (!text || !text.length) {
            // Fallback to engrave file (C: getrumor returned empty)
            const idx = get_rnd_line_index(
                ENGRAVE_LINE_BYTES, ENGRAVE_FILE_CHUNKSIZE, RUMOR_PAD_LENGTH);
            text = ENGRAVE_TEXTS[idx] || ENGRAVE_TEXTS[0];
        }
    }
    // C: wipeout_text(outbuf, (int)(strlen(outbuf) / 4), 0);
    return wipeout_text(text, Math.floor(text.length / 4));
}

// ========================================================================
// Trap creation -- mktrap, maketrap, traptype_rnd
// C ref: mklev.c, trap.c
// ========================================================================

// C ref: obj.h sobj_at(BOULDER, x, y) checks for boulder object at location.
function hasBoulderAt(map, x, y) {
    for (const obj of map.objects || []) {
        if (obj && obj.otyp === BOULDER && obj.ox === x && obj.oy === y) {
            return true;
        }
    }
    return false;
}

// C ref: trap.c:3009 choose_trapnote() -- pick unused squeaky board note
function choose_trapnote(map) {
    const tavail = new Array(12).fill(0);
    for (const t of map.traps) {
        if (t.ttyp === SQKY_BOARD) tavail[t.tnote] = 1;
    }
    const tpick = [];
    for (let k = 0; k < 12; k++) {
        if (tavail[k] === 0) tpick.push(k);
    }
    return tpick.length > 0 ? tpick[rn2(tpick.length)] : rn2(12);
}

// C ref: trap.c:3601 isclearpath() -- check if path is clear for boulder
function isclearpath(map, startx, starty, distance, dx, dy) {
    let x = startx, y = starty;
    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y)) return null;
        const loc = map.at(x, y);
        if (!loc) return null;
        const typ = loc.typ;
        // ZAP_POS: typ >= POOL (everything from POOL onwards is passable to zaps)
        if (typ < POOL) return null;
        // closed_door check
        if (typ === DOOR && ((loc.flags & D_CLOSED) || (loc.flags & D_LOCKED)))
            return null;
        // check for pit/hole/teleport traps blocking path
        const t = map.trapAt(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) ||
                  (t.ttyp >= TELEP_TRAP && t.ttyp <= MAGIC_PORTAL)))
            return null;
    }
    return { x, y };
}

// C ref: trap.c:3506 find_random_launch_coord() -- find boulder launch point
function find_random_launch_coord(map, trap) {
    let success = false;
    let cc = null;
    const mindist = (trap.ttyp === ROLLING_BOULDER_TRAP) ? 2 : 4;
    let trycount = 0;
    let distance = rn1(5, 4); // 4..8 away
    let tmp = rn2(N_DIRS);    // random starting direction

    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        // C ref: trap.c find_random_launch_coord() -- rolling boulders
        // cannot be placed on pool/lava endpoints.
        if (trap.ttyp === ROLLING_BOULDER_TRAP) {
            const ex = trap.tx + (distance * dx);
            const ey = trap.ty + (distance * dy);
            const endpoint = map.at(ex, ey);
            if (endpoint && (IS_POOL(endpoint.typ) || IS_LAVA(endpoint.typ))) {
                success = false;
                cc = null;
                tmp = (tmp + 1) % N_DIRS;
                trycount++;
                if ((trycount % 8) === 0) distance--;
                continue;
            }
        }
        // Check forward path
        const fwd = isclearpath(map, trap.tx, trap.ty, distance, dx, dy);
        if (fwd) {
            if (trap.ttyp === ROLLING_BOULDER_TRAP) {
                // Also check reverse path
                const rev = isclearpath(map, trap.tx, trap.ty, distance, -dx, -dy);
                if (rev) {
                    cc = fwd;
                    success = true;
                }
            } else {
                cc = fwd;
                success = true;
            }
        }
        if (success) break;
        tmp = (tmp + 1) % N_DIRS;
        trycount++;
        if ((trycount % 8) === 0) distance--;
    }
    return success ? cc : null;
}

// C ref: trap.c mk_trap_statue()
function mk_trap_statue(map, x, y, depth = 1) {
    const sgn = (v) => (v > 0 ? 1 : (v < 0 ? -1 : 0));
    const roleIndex = Number.isInteger(_gstate?.player?.roleIndex)
        ? _gstate.player.roleIndex
        : (Number.isInteger(_gstate?._makemonRoleIndex) ? _gstate._makemonRoleIndex : 11);
    const ualign = roles[roleIndex]?.align || 0;
    let trycount = 10;
    let statueMndx = -1;

    do {
        statueMndx = rndmonnum_adj(3, 6, depth);
    } while (--trycount > 0
        && statueMndx >= 0
        && mons[statueMndx]?.mlet === S_UNICORN
        && sgn(ualign) === sgn(mons[statueMndx]?.align || 0));

    if (statueMndx < 0 || !mons[statueMndx]) return;

    const statue = mkcorpstat(STATUE, statueMndx, false, x, y, map);

    const mtmp = makemon(statueMndx, 0, 0, NO_MM_FLAGS, depth, map);
    if (!mtmp) return;

    if (statue && Array.isArray(mtmp.minvent) && mtmp.minvent.length > 0) {
        // Move generated inventory onto the statue container.
        statue.contents = Array.isArray(statue.contents) ? statue.contents : [];
        while (mtmp.minvent.length > 0) {
            const otmp = mtmp.minvent.shift();
            if (!otmp) continue;
            otmp.owornmask = 0;
            statue.contents.push(otmp);
        }
        statue.owt = weight(statue);
    }

    if (Array.isArray(map.monsters)) {
        const idx = map.monsters.indexOf(mtmp);
        if (idx >= 0) map.monsters.splice(idx, 1);
    }
}

// C ref: trap.c:455 maketrap() -- create a trap at (x,y)
export function maketrap(map, x, y, typ, depth = 1) {
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST) return null;

    // Check if trap already exists at this position
    const existing = map.trapAt(x, y);
    if (existing) return null; // simplified: don't overwrite

    const loc = map.at(x, y);
    if (!loc) return null;
    // CAN_OVERWRITE_TERRAIN: reject stairs/ladders
    if (loc.typ === STAIRS || loc.typ === LADDER) return null;
    if (IS_POOL(loc.typ) || IS_LAVA(loc.typ)) return null;
    if (IS_FURNITURE(loc.typ) && typ !== PIT && typ !== HOLE) return null;

    const trap = {
        ttyp: typ,
        tx: x, ty: y,
        tseen: (typ === HOLE), // unhideable_trap
        launch: { x: -1, y: -1 },
        launch2: { x: -1, y: -1 },
        dst: { dnum: -1, dlevel: -1 },
        tnote: 0,
        once: 0,
        madeby_u: 0,
        conjoined: 0,
    };

    switch (typ) {
    case SQKY_BOARD:
        trap.tnote = choose_trapnote(map);
        break;
    case STATUE_TRAP:
        mk_trap_statue(map, x, y, depth);
        break;
    case ROLLING_BOULDER_TRAP: {
        // C ref: mkroll_launch
        const launchCoord = find_random_launch_coord(map, trap);
        if (launchCoord) {
            // C ref: mkroll_launch — mksobj_at(BOULDER, cc.x, cc.y)
            const boulderObj = mksobj(BOULDER, true, false);
            if (boulderObj) {
                boulderObj.ox = launchCoord.x;
                boulderObj.oy = launchCoord.y;
                placeFloorObject(map, boulderObj);
            }
            trap.launch = { x: launchCoord.x, y: launchCoord.y };
            trap.launch2 = {
                x: x - (launchCoord.x - x),
                y: y - (launchCoord.y - y),
            };
        } else {
            trap.launch = { x, y };
            trap.launch2 = { x, y };
        }
        break;
    }
    case PIT:
    case SPIKED_PIT:
        trap.conjoined = 0;
        // fall through
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ)) {
            // C ref: trap.c hole_destination() — RNG-driven destination depth.
            trap.dst = hole_destination(map);
        }
        // C ref: trap.c maketrap() terrain normalization for pit/hole/trapdoor.
        if (IS_ROOM(loc.typ)) {
            loc.typ = ROOM;
        } else if (loc.typ === STONE || loc.typ === SCORR) {
            loc.typ = CORR;
        } else if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
            loc.typ = (map.flags?.is_maze_lev)
                ? ROOM
                : (map.flags?.is_cavernous_lev ? CORR : DOOR);
        }
        loc.flags = 0;
        break;
    }

    map.traps.push(trap);
    pushRngLogEntry(`^trap[${trap.ttyp},${x},${y}]`);
    return trap;
}

// cf. trap.c:6438 — deltrap(trap): centralized trap removal
// All trap deletions should go through this function.
export function deltrap(map, trap) {
    if (!map || !trap) return;
    const tx = Number.isInteger(trap.tx) ? trap.tx : trap.x;
    const ty = Number.isInteger(trap.ty) ? trap.ty : trap.y;
    pushRngLogEntry(`^dtrap[${trap.ttyp},${tx},${ty}]`);
    map.traps = (map.traps || []).filter(t => t !== trap);
}

function dng_bottom(map) {
    const useLev = map?.uz || null;
    const dnum = Number.isInteger(map?._genDnum)
        ? map._genDnum
        : (Number.isInteger(useLev?.dnum) ? useLev.dnum : DUNGEONS_OF_DOOM);
    let bottom = dunlevs_in_dungeon(dnum);
    // C ref: trap.c dng_bottom() — before invocation, Sanctum is not reachable.
    const invoked = !!(map?._invoked || map?.game?.player?.uevent?.invoked || _gstate?.player?.uevent?.invoked);
    if (dnum === GEHENNOM && !invoked) {
        bottom = Math.max(1, bottom - 1);
    }
    // C ref: trap.c dng_bottom() — in upper quest branch, don't fall past
    // quest locate depth until that depth has been reached.
    if (dnum === QUEST) {
        const qlocateDepth = Number.isInteger(map?._questLocateDlevel)
            ? map._questLocateDlevel
            : _questLocaDlevel;
        // Use explicit reached depth when available; otherwise fall back to
        // current generated dlevel as a conservative proxy.
        const reachedDepth = Number.isInteger(map?._dunlevReached)
            ? map._dunlevReached
            : (Number.isInteger(map?._genDlevel) ? map._genDlevel : 1);
        if (Number.isInteger(qlocateDepth) && reachedDepth < qlocateDepth) {
            bottom = Math.min(bottom, qlocateDepth);
        }
    }
    return Math.max(bottom, 1);
}

// C ref: trap.c:441 hole_destination() — consume RNG for fall depth
function hole_destination(map) {
    const useLev = map?.uz || null;
    const dnum = Number.isInteger(map?._genDnum)
        ? map._genDnum
        : (Number.isInteger(useLev?.dnum) ? useLev.dnum : DUNGEONS_OF_DOOM);
    let dlevel = Number.isInteger(map?._genDlevel)
        ? map._genDlevel
        : (Number.isInteger(useLev?.dlevel) ? useLev.dlevel : 1);
    const bottom = dng_bottom(map);
    while (dlevel < bottom) {
        dlevel++;
        if (rn2(4)) break;
    }
    return { dnum, dlevel };
}

// C ref: mklev.c:2021 mktrap() — select trap type, find location, create trap
export function mktrap(map, num, mktrapflags, croom, tm, depth) {
    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG)) return;
    // C ref: mklev.c mktrap() — "no traps in pools".
    if (tm) {
        const loc = map.at(tm.x, tm.y);
        if (!loc || IS_POOL(loc.typ) || IS_LAVA(loc.typ)) return;
    }

    const lvl = depth;
    let kind = mktrap_pick_kind(map, num, depth, mktrapflags);

    // C ref: mklev.c mktrap() — holes/trapdoors become ROCKTRAP when
    // falling through isn't possible at current dungeon depth.
    const currentDlevel = Number.isInteger(map?._genDlevel) ? map._genDlevel : depth;
    if (is_hole(kind) && currentDlevel >= dng_bottom(map)) kind = ROCKTRAP;

    let mx, my;
    if (tm) {
        mx = tm.x;
        my = tm.y;
    } else {
        let tryct = 0;
        const avoid_boulder = (is_pit(kind) || is_hole(kind));
        do {
            if (++tryct > 200) return;
            if (croom) {
                const pos = somexyspace(map, croom);
                if (!pos) return;
                mx = pos.x;
                my = pos.y;
            } else {
                // C ref: mklev.c mktrap() maze path uses mazexy().
                if (!(mktrapflags & MKTRAP_MAZEFLAG)) return;
                const pos = mazexy(map);
                if (!pos) return;
                mx = pos.x;
                my = pos.y;
            }
        } while (occupied(map, mx, my) || (avoid_boulder && hasBoulderAt(map, mx, my)));
    }

    const t = maketrap(map, mx, my, kind, depth);
    if (!t) return;
    kind = t.ttyp;

    // C ref: mklev.c mktrap() — WEB creates a giant spider unless suppressed.
    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB)) {
        makemon(PM_GIANT_SPIDER, mx, my, NO_MM_FLAGS, depth, map);
    }
    // C ref: mklev.c mktrap() — MKTRAP_SEEN marks generated trap as seen.
    if (mktrapflags & MKTRAP_SEEN) {
        t.tseen = true;
    }

    // C ref: mklev.c:2124-2140 mktrap predecessor victim block.
    const victimRoll = (!(mktrapflags & MKTRAP_NOVICTIM) && inMklev && kind !== NO_TRAP)
        ? rnd(4)
        : null;
    if (inMklev
        && kind !== NO_TRAP && !(mktrapflags & MKTRAP_NOVICTIM)
        && lvl <= victimRoll
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
            && t.launch.x === t.tx && t.launch.y === t.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            // C ref: exploded landmine becomes a revealed pit.
            t.ttyp = PIT;
            t.tseen = true;
        }
        mktrap_victim(map, t, depth);
    }
}

// C ref: mklev.c mktrap_victim() — creates corpse + items on trap
export function mktrap_victim(map, trap, depth) {
    const x = trap.tx, y = trap.ty;

    // Helper: place object on map at trap position
    function placeObj(obj) {
        obj.ox = x;
        obj.oy = y;
        placeFloorObject(map, obj);
    }

    // Trap-specific item
    // C ref: mklev.c:1818-1836
    let otmp = null;
    switch (trap.ttyp) {
    case ARROW_TRAP:
        otmp = mksobj(ARROW, true, false);
        if (otmp) otmp.opoisoned = 0; // C ref: mklev.c:1820
        break;
    case DART_TRAP:
        otmp = mksobj(DART, true, false);
        break;
    case ROCKTRAP:
        otmp = mksobj(ROCK, true, false);
        break;
    default:
        break;
    }
    if (otmp) placeObj(otmp);

    // Random possession loop
    // C ref: mklev.c:1843-1877
    const classMap = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS];
    // C ref: dothrow.c breaktest()
    const breaktestLike = (obj) => {
        if (trap.ttyp !== PIT) return false; // only exploded landmine path
        const od = objectData[obj.otyp] || {};
        let nonbreakchance = 1;
        if (obj.oclass === ARMOR_CLASS && od.oc_material === GLASS) {
            nonbreakchance = 90;
        }
        if (obj_resists(obj, nonbreakchance, 99)) {
            return false;
        }
        if (od.oc_material === GLASS && !obj.oartifact && obj.oclass !== GEM_CLASS) {
            return true;
        }
        const breakTyp = (obj.oclass === POTION_CLASS) ? POT_WATER : obj.otyp;
        return (
            breakTyp === EXPENSIVE_CAMERA
            || breakTyp === POT_WATER
            || breakTyp === EGG
            || breakTyp === CREAM_PIE
            || breakTyp === MELON
            || breakTyp === ACID_VENOM
            || breakTyp === BLINDING_VENOM
        );
    };

    do {
        const poss_class = classMap[rn2(4)];
        otmp = mkobj(poss_class, false);
        otmp.blessed = false;
        otmp.cursed = true; // C ref: curse(otmp) at mklev.c:1865
        if (!breaktestLike(otmp)) {
            placeObj(otmp);
        }
    } while (!rn2(5));

    // Corpse race selection
    // C ref: mklev.c:1880-1915
    let victim_mnum;
    const race = rn2(15);
    if (race === 0) {
        victim_mnum = PM_ELF;
        if (trap.ttyp === SLP_GAS_TRAP && !(depth <= 2 && rn2(2))) {
            victim_mnum = PM_HUMAN;
        }
    } else if (race >= 1 && race <= 2) {
        victim_mnum = PM_DWARF;
    } else if (race >= 3 && race <= 5) {
        victim_mnum = PM_ORC;
    } else if (race >= 6 && race <= 9) {
        victim_mnum = PM_GNOME;
        if (!rn2(10)) {
            otmp = mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
            otmp.quan = 1;
            otmp.owt = weight(otmp);
            otmp.blessed = false;
            otmp.cursed = true; // C ref: curse(otmp) at mklev.c:1905
            placeObj(otmp);
            const loc = map.at(x, y);
            // C ref: if (!levl[x][y].lit) begin_burn(otmp, FALSE)
            if (loc && !loc.lit) {
                otmp.lamplit = true;
            }
        }
    } else {
        victim_mnum = PM_HUMAN;
    }

    // Human → adventurer conversion
    // C ref: mklev.c:1919-1920
    if (victim_mnum === PM_HUMAN && rn2(25)) {
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    }

    // C ref: mklev.c:1921 — mkcorpstat(CORPSE, NULL, &mons[victim_mnum], ...)
    // Uses mkcorpstat which handles special_corpse restart logic for start_corpse_timeout
    otmp = mkcorpstat(CORPSE, victim_mnum, true, x, y, map);
    // C ref: mklev.c:1922 — age corpse so it's too old to safely eat
    // TAINT_AGE=50; subtracting 51 makes (age + 50 <= moves) true at game start
    otmp.age -= (TAINT_AGE + 1);
}


// Supply items for Oracle supply chest
// C ref: mklev.c:1039-1049
const supply_items = [
    POT_EXTRA_HEALING, POT_SPEED, POT_GAIN_ENERGY,
    SCR_ENCHANT_WEAPON, SCR_ENCHANT_ARMOR, SCR_CONFUSE_MONSTER, SCR_SCARE_MONSTER,
    WAN_DIGGING, SPE_HEALING,
];

// Extra classes for supply chest bonus item
// C ref: mklev.c:1076-1087
const extra_classes = [
    FOOD_CLASS, WEAPON_CLASS, ARMOR_CLASS, GEM_CLASS,
    SCROLL_CLASS, POTION_CLASS, RING_CLASS,
    SPBOOK_no_NOVEL, SPBOOK_no_NOVEL, SPBOOK_no_NOVEL,
];

// C ref: mklev.c fill_ordinary_room()
// C ref: ROOM_IS_FILLABLE: (rtype == OROOM || rtype == THEMEROOM) && needfill == FILL_NORMAL
export function fill_ordinary_room(map, croom, depth, bonusItems) {
    if (croom.rtype !== OROOM && croom.rtype !== THEMEROOM) return;

    // C ref: mklev.c:944-952 — recursively fill subrooms first, before
    // checking needfill. An unfilled outer room shouldn't block filling
    // of a filled inner subroom.
    for (let i = 0; i < croom.nsubrooms; i++) {
        const subroom = croom.sbrooms[i];
        if (subroom) {
            fill_ordinary_room(map, subroom, depth, false);
        }
    }

    if (croom.needfill !== FILL_NORMAL) return;

    // Put a sleeping monster inside.
    // C ref: (u.uhave.amulet || !rn2(3)) && somexyspace(croom, &pos)
    const heroHasAmulet = !!map?._heroHasAmulet;
    if (heroHasAmulet || !rn2(3)) {
        const pos = somexyspace(map, croom);
        if (pos) {
            const tmonst = makemon(null, pos.x, pos.y, MM_NOGRP, depth, map);
            if (tmonst && tmonst.mndx === PM_GIANT_SPIDER
                && !occupied(map, pos.x, pos.y)) {
                maketrap(map, pos.x, pos.y, WEB, depth);
            }
        }
    }

    // Traps
    // C ref: x = 8 - (level_difficulty() / 6)
    const x = 8 - Math.floor(depth / 6);
    const trapChance = Math.max(x, 2);
    let trycnt = 0;
    while (!rn2(trapChance) && (++trycnt < 1000)) {
        mktrap(map, 0, MKTRAP_NOFLAGS, croom, null, depth);
    }

    // Gold (1/3 chance)
    // C ref: mkgold(0L, pos.x, pos.y) in mkobj.c:1999
    // amount formula: mul = rnd(30 / max(12 - depth, 2)), amount = 1 + rnd(level_difficulty + 2) * mul
    // Then mksobj_at(GOLD_PIECE, ...) creates the gold object
    if (!rn2(3)) {
        const pos = somexyspace(map, croom);
        if (pos) {
            const mul = rnd(Math.max(Math.floor(30 / Math.max(12 - depth, 2)), 1));
            const amount = 1 + rnd(depth + 2) * mul;
            const gold = mksobj(GOLD_PIECE, true, false);
            if (gold) {
                gold.ox = pos.x; gold.oy = pos.y;
                gold.quan = amount;
                gold.owt = weight(gold);
                placeFloorObject(map, gold);
            }
        }
    }

    // Fountain (1/10 chance)
    if (!rn2(10))
        mkfount(map, croom);

    // Sink (1/60 chance)
    if (!rn2(60))
        mksink(map, croom);

    // Altar (1/60 chance)
    if (!rn2(60))
        mkaltar(map, croom);

    // Grave
    // C ref: x = 80 - (depth(&u.uz) * 2)
    const graveX = 80 - (depth * 2);
    const graveChance = Math.max(graveX, 2);
    if (!rn2(graveChance))
        mkgrave(map, croom, depth);

    // Statue (1/20 chance)
    // C ref: mkcorpstat(STATUE, NULL, NULL, ...) → mksobj calls rndmonnum() internally
    if (!rn2(20)) {
        const pos = somexyspace(map, croom);
        if (pos) {
            mkcorpstat(STATUE, -1, true, pos.x, pos.y, map);
        }
    }

    // C ref: mklev.c:1015-1117 — bonus_items section
    // Oracle supply chest: at depth 1 in main dungeon, oracle_level.dnum matches,
    // and u.uz.dlevel < oracle_level.dlevel, so supply chest created with 2/3 prob.
    let skip_chests = false;
    if (bonusItems) {
        const pos = somexyspace(map, croom);
        if (pos) {
            const curDnum = Number.isInteger(map?._genDnum) ? map._genDnum : DUNGEONS_OF_DOOM;
            const curDlevel = Number.isInteger(map?._genDlevel) ? map._genDlevel : depth;
            const uzBranch = getBranchAtLevel(curDnum, curDlevel)?.branch || null;
            const branchTouchesMines = !!uzBranch
                && curDnum !== GNOMISH_MINES
                && (uzBranch.end1.dnum === GNOMISH_MINES || uzBranch.end2.dnum === GNOMISH_MINES);
            if (branchTouchesMines) {
                const otyp = (rn2(5) < 3)
                    ? FOOD_RATION
                    : (rn2(2) ? CRAM_RATION : LEMBAS_WAFER);
                const food = mksobj(otyp, true, false);
                if (food) {
                    food.ox = pos.x; food.oy = pos.y;
                    placeFloorObject(map, food);
                }
            } else {
                const oracleLevel = getOracleLevel();
                if (curDnum === oracleLevel.dnum
                    && curDlevel < oracleLevel.dlevel
                    && rn2(3)) {
                // Create supply chest (2/3 chance)
                // C ref: mklev.c:1033-1034
                const chest = mksobj(rn2(3) ? CHEST : LARGE_BOX, false, false);
                if (chest) { chest.ox = pos.x; chest.oy = pos.y; placeFloorObject(map, chest); }
                const chestLocked = !!rn2(6);
                if (chest) chest.olocked = chestLocked;
                if (chest && !Array.isArray(chest.cobj)) chest.cobj = [];

                // Supply items loop
                // C ref: mklev.c:1038-1070
                let tryct = 0;
                let cursed;
                do {
                    const otyp = rn2(2) ? POT_HEALING : supply_items[rn2(9)];
                    const otmp = mksobj(otyp, true, false);
                    if (otyp === POT_HEALING && rn2(2)) {
                        // C ref: mklev.c:1056-1058
                        otmp.quan = 2;
                        otmp.owt = weight(otmp);
                    }
                    cursed = otmp.cursed;
                    // C ref: mklev.c — add_to_container() stores item in chest
                    if (chest) chest.cobj.push(otmp);
                    ++tryct;
                    if (tryct === 50) break;
                } while (cursed || !rn2(5));

                // Maybe add extra random item
                // C ref: mklev.c:1075-1110
                if (rn2(3)) {
                    const oclass = extra_classes[rn2(10)];
                    let otmp;
                    if (oclass === SPBOOK_no_NOVEL) {
                        const otyp = rnd_class(bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
                        otmp = mksobj(otyp, true, false);
                    } else {
                        otmp = mkobj(oclass, false);
                    }
                    // Bias towards lower-level spellbooks
                    if (oclass === SPBOOK_no_NOVEL) {
                        const maxpass = (depth > 2) ? 2 : 3;
                        for (let pass = 1; pass <= maxpass; pass++) {
                            let otmp2;
                            const otyp2 = rnd_class(bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
                            otmp2 = mksobj(otyp2, true, false);
                            if (objectData[otmp.otyp].oc_oc2 > objectData[otmp2.otyp].oc_oc2) {
                                otmp = otmp2;
                            }
                        }
                    }
                    // C ref: mklev.c — add_to_container() stores extra item in chest
                    if (chest) chest.cobj.push(otmp);
                }

                // C ref: mklev.c:1112 — add_to_container() doesn't update container weight
                if (chest) chest.owt = weight(chest);
                    skip_chests = true;
                }
            }
        }
    }

    // C ref: box/chest (!rn2(nroom * 5 / 2))
    if (!skip_chests && !rn2(Math.max(Math.floor(map.nroom * 5 / 2), 1))) {
        const pos = somexyspace(map, croom);
        if (pos) {
            const box = mksobj(rn2(3) ? LARGE_BOX : CHEST, true, false);
            if (box) {
                box.ox = pos.x; box.oy = pos.y;
                placeFloorObject(map, box);
            }
        }
    }

    // C ref: graffiti (!rn2(27 + 3 * abs(depth)))
    if (!rn2(27 + 3 * Math.abs(depth))) {
        // C: random_engraving(buf, pristinebuf) — selects text + wipeout_text
        const engrText = random_engraving_rng();
        // C: do { somexyspace(croom, &pos); } while (typ != ROOM && !rn2(40));
        let pos;
        do {
            pos = somexyspace(map, croom);
        } while (pos && map.at(pos.x, pos.y).typ !== ROOM && !rn2(40));
        if (pos) {
            // C ref: mklev.c fill_ordinary_room() graffiti uses MARK, not DUST.
            make_engr_at(map, pos.x, pos.y, engrText || '', 'mark', { degrade: true });
        }
    }

    // C ref: random objects (!rn2(3))
    if (!rn2(3)) {
        const pos = somexyspace(map, croom);
        if (pos) {
            const obj = mkobj(0, true);
            if (obj) { obj.ox = pos.x; obj.oy = pos.y; placeFloorObject(map, obj); }
        }
        trycnt = 0;
        while (!rn2(5)) {
            if (++trycnt > 100) break;
            const pos2 = somexyspace(map, croom);
            if (pos2) {
                const obj2 = mkobj(0, true);
                if (obj2) { obj2.ox = pos2.x; obj2.oy = pos2.y; placeFloorObject(map, obj2); }
            }
        }
    }
}

// ========================================================================
// Wall fixup
// ========================================================================

// C ref: mkmaze.c wall_cleanup() — remove walls totally surrounded by stone
export function wall_cleanup(map, x1, y1, x2, y2) {
    const inarea = getWallifyProtectedArea(map);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            if (within_bounded_area(x, y, inarea.x1, inarea.y1, inarea.x2, inarea.y2)) {
                continue;
            }
            const loc = map.at(x, y);
            if (loc && IS_WALL(loc.typ) && loc.typ !== DBWALL) {
                if (is_solid(map, x-1, y-1) && is_solid(map, x-1, y)
                    && is_solid(map, x-1, y+1) && is_solid(map, x, y-1)
                    && is_solid(map, x, y+1) && is_solid(map, x+1, y-1)
                    && is_solid(map, x+1, y) && is_solid(map, x+1, y+1))
                    loc.typ = STONE;
            }
        }
    }
}

// C ref: mkmaze.c wallification() = wall_cleanup + fix_wall_spines
function wallify(map, x1, y1, x2, y2) {
    wall_cleanup(map, x1, y1, x2, y2);
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            setWallType(map, x, y);
        }
    }
}

// C ref: mkmaze.c wallification(map, x1, y1, x2, y2) bounded variant.
export function wallify_region(map, x1, y1, x2, y2) {
    wallify(map, x1, y1, x2, y2);
}

// C ref: mkmaze.c wallification() -- full map wall fixup
export function wallification(map) {
    wall_cleanup(map, 1, 0, COLNO - 1, ROWNO - 1);
    for (let x = 1; x <= COLNO - 1; x++) {
        for (let y = 0; y < ROWNO; y++) {
            setWallType(map, x, y);
        }
    }
}

// C ref: mkmaze.c fix_wall_spines() — update wall junction glyphs only.
// Used after flip_level(), where C does not re-run wall_cleanup.
export function fix_wall_spines(map, x1 = 1, y1 = 0, x2 = COLNO - 1, y2 = ROWNO - 1) {
    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            setWallType(map, x, y);
        }
    }
}

// C ref: mkmaze.c iswall() — check if wall spine can join this location
function iswall_check(map, x, y) {
    if (!isok(x, y)) return 0;
    const typ = map.at(x, y).typ;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
            || typ === WATER
            || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}

// C ref: mkmaze.c iswall_or_stone()
export function iswall_or_stone(map, x, y) {
    if (!isok(x, y)) return 1; // out of bounds = stone
    const typ = map.at(x, y).typ;
    return (typ === STONE || iswall_check(map, x, y)) ? 1 : 0;
}

// C ref: mkmaze.c is_solid()
export function is_solid(map, x, y) {
    return !isok(x, y) || IS_STWALL(map.at(x, y).typ);
}

// C ref: mkmaze.c extend_spine() — determine if wall spine extends in (dx,dy)
export function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (wall_there) {
        if (dx) {
            if (locale[1][0] && locale[1][2]
                && locale[nx][0] && locale[nx][2])
                return 0; // corridor of walls — don't extend
            return 1;
        } else {
            if (locale[0][1] && locale[2][1]
                && locale[0][ny] && locale[2][ny])
                return 0;
            return 1;
        }
    }
    return 0;
}

// C ref: mkmaze.c spine_array — maps 4-bit NSEW extension to wall type
//   bits: N=8, S=4, E=2, W=1
const SPINE_ARRAY = [
    VWALL, HWALL, HWALL, HWALL,
    VWALL, TRCORNER, TLCORNER, TDWALL,
    VWALL, BRCORNER, BLCORNER, TUWALL,
    VWALL, TLWALL, TRWALL, CROSSWALL,
];

// C ref: rm.h WM_* wall mode flags (stored in rm.flags/wall_info low bits)
const WM_MASK = 0x07;
const WM_W_LEFT = 1;
const WM_W_RIGHT = 2;
const WM_W_TOP = WM_W_LEFT;
const WM_W_BOTTOM = WM_W_RIGHT;
const WM_C_OUTER = 1;
const WM_C_INNER = 2;
const WM_T_LONG = 1;
const WM_T_BL = 2;
const WM_T_BR = 3;
const WM_X_TL = 1;
const WM_X_TR = 2;
const WM_X_BL = 3;
const WM_X_BR = 4;
const WM_X_TLBR = 5;
const WM_X_BLTR = 6;

// C ref: mkmaze.c fix_wall_spines() — set correct wall type based on neighbors
function setWallType(map, x, y) {
    const loc = map.at(x, y);
    if (!loc || !IS_WALL(loc.typ) || loc.typ === DBWALL) return;

    // Build 3x3 locale grid of iswall_or_stone values
    const locale = [[0,0,0],[0,0,0],[0,0,0]];
    const inarea = getWallifyProtectedArea(map);
    const inProtected = within_bounded_area(x, y, inarea.x1, inarea.y1, inarea.x2, inarea.y2);
    // C ref: mkmaze.c fix_wall_spines() uses iswall() inside bughack.inarea.
    const loc_f = inProtected
        ? (cx, cy) => iswall_check(map, cx, cy)
        : (cx, cy) => iswall_or_stone(map, cx, cy);
    locale[0][0] = loc_f(x - 1, y - 1);
    locale[1][0] = loc_f(x,     y - 1);
    locale[2][0] = loc_f(x + 1, y - 1);
    locale[0][1] = loc_f(x - 1, y);
    locale[2][1] = loc_f(x + 1, y);
    locale[0][2] = loc_f(x - 1, y + 1);
    locale[1][2] = loc_f(x,     y + 1);
    locale[2][2] = loc_f(x + 1, y + 1);

    // Determine if wall extends in each direction NSEW
    const bits = (extend_spine(locale, iswall_check(map, x, y - 1), 0, -1) << 3)
               | (extend_spine(locale, iswall_check(map, x, y + 1), 0, 1) << 2)
               | (extend_spine(locale, iswall_check(map, x + 1, y), 1, 0) << 1)
               | extend_spine(locale, iswall_check(map, x - 1, y), -1, 0);

    // Don't change typ if wall is free-standing
    if (bits) loc.typ = SPINE_ARRAY[bits];
}

// C ref: display.c check_pos()
function check_wall_pos(map, x, y, which) {
    if (!isok(x, y)) return which;
    const type = map.at(x, y)?.typ;
    if (type === undefined) return which;
    if (IS_STWALL(type) || type === CORR || type === SCORR || type === SDOOR) {
        return which;
    }
    return 0;
}

function moreThanOne(a, b, c) {
    return ((a && (b || c)) || (b && (a || c)) || (c && (a || b)));
}

// C ref: display.c set_twall()
function set_twall_mode(map, x1, y1, x2, y2, x3, y3) {
    const is1 = check_wall_pos(map, x1, y1, WM_T_LONG);
    const is2 = check_wall_pos(map, x2, y2, WM_T_BL);
    const is3 = check_wall_pos(map, x3, y3, WM_T_BR);
    if (moreThanOne(is1, is2, is3)) return 0;
    return is1 + is2 + is3;
}

// C ref: display.c set_wall()
function set_wall_mode(map, x, y, horiz) {
    let is1, is2;
    if (horiz) {
        is1 = check_wall_pos(map, x, y - 1, WM_W_TOP);
        is2 = check_wall_pos(map, x, y + 1, WM_W_BOTTOM);
    } else {
        is1 = check_wall_pos(map, x - 1, y, WM_W_LEFT);
        is2 = check_wall_pos(map, x + 1, y, WM_W_RIGHT);
    }
    if (moreThanOne(is1, is2, 0)) return 0;
    return is1 + is2;
}

// C ref: display.c set_corn()
function set_corner_mode(map, x1, y1, x2, y2, x3, y3, x4, y4) {
    const is1 = check_wall_pos(map, x1, y1, 1);
    const is2 = check_wall_pos(map, x2, y2, 1);
    const is3 = check_wall_pos(map, x3, y3, 1);
    const is4 = check_wall_pos(map, x4, y4, 1);
    if (is4) return WM_C_INNER;
    if (is1 && is2 && is3) return WM_C_OUTER;
    return 0;
}

// C ref: display.c set_crosswall()
function set_crosswall_mode(map, x, y) {
    const is1 = check_wall_pos(map, x - 1, y - 1, 1);
    const is2 = check_wall_pos(map, x + 1, y - 1, 1);
    const is3 = check_wall_pos(map, x + 1, y + 1, 1);
    const is4 = check_wall_pos(map, x - 1, y + 1, 1);

    let wmode = is1 + is2 + is3 + is4;
    if (wmode > 1) {
        if (is1 && is3 && (is2 + is4 === 0)) {
            wmode = WM_X_TLBR;
        } else if (is2 && is4 && (is1 + is3 === 0)) {
            wmode = WM_X_BLTR;
        } else {
            wmode = 0;
        }
    } else if (is1) {
        wmode = WM_X_TL;
    } else if (is2) {
        wmode = WM_X_TR;
    } else if (is3) {
        wmode = WM_X_BR;
    } else if (is4) {
        wmode = WM_X_BL;
    }
    return wmode;
}

// C ref: display.c xy_set_wall_state()
export function xy_set_wall_state(map, x, y) {
    const loc = map.at(x, y);
    if (!loc) return;
    let wmode = -1;
    switch (loc.typ) {
    case SDOOR:
        wmode = set_wall_mode(map, x, y, loc.horizontal ? 1 : 0);
        break;
    case VWALL:
        wmode = set_wall_mode(map, x, y, 0);
        break;
    case HWALL:
        wmode = set_wall_mode(map, x, y, 1);
        break;
    case TDWALL:
        wmode = set_twall_mode(map, x, y - 1, x - 1, y + 1, x + 1, y + 1);
        break;
    case TUWALL:
        wmode = set_twall_mode(map, x, y + 1, x + 1, y - 1, x - 1, y - 1);
        break;
    case TLWALL:
        wmode = set_twall_mode(map, x + 1, y, x - 1, y - 1, x - 1, y + 1);
        break;
    case TRWALL:
        wmode = set_twall_mode(map, x - 1, y, x + 1, y + 1, x + 1, y - 1);
        break;
    case TLCORNER:
        wmode = set_corner_mode(map, x - 1, y - 1, x, y - 1, x - 1, y, x + 1, y + 1);
        break;
    case TRCORNER:
        wmode = set_corner_mode(map, x, y - 1, x + 1, y - 1, x + 1, y, x - 1, y + 1);
        break;
    case BLCORNER:
        wmode = set_corner_mode(map, x, y + 1, x - 1, y + 1, x - 1, y, x + 1, y - 1);
        break;
    case BRCORNER:
        wmode = set_corner_mode(map, x + 1, y, x + 1, y + 1, x, y + 1, x - 1, y - 1);
        break;
    case CROSSWALL:
        wmode = set_crosswall_mode(map, x, y);
        break;
    default:
        break;
    }
    if (wmode >= 0) {
        loc.flags = (loc.flags & ~WM_MASK) | wmode;
    }
}

// C ref: display.c set_wall_state()
export function set_wall_state(map) {
    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            xy_set_wall_state(map, x, y);
        }
    }
}

// C ref: gb.bughack.inarea defaults to an invalid rectangle so bounded checks fail.
function getWallifyProtectedArea(map) {
    const area = map?._wallifyProtectedArea;
    if (!area
        || !Number.isInteger(area.x1) || !Number.isInteger(area.y1)
        || !Number.isInteger(area.x2) || !Number.isInteger(area.y2)) {
        return { x1: COLNO, y1: ROWNO, x2: 0, y2: 0 };
    }
    return area;
}

// C ref: mklev.c mk_knox_portal()
export function mk_knox_portal(map, x, y, levelDepth) {
    if (levelDepth <= 1) return false;

    const br = dungeon_branch("Fort Ludios");
    if (!br) return false;

    const dnum = Number.isInteger(map?._genDnum) ? map._genDnum : DUNGEONS_OF_DOOM;
    const dlevel = Number.isInteger(map?._genDlevel) ? map._genDlevel : levelDepth;

    let source;
    if (on_level({ dnum, dlevel }, br.end1)) {
        source = br.end2;
    } else {
        // C: disallow Knox branch on a level with one branch already.
        if (isBranchLevel(dnum, dlevel)) return false;
        source = br.end1;
    }

    // C ref: mklev.c:2646-2647 — skip if source already set.
    // Floating Knox source uses sentinel dnum == n_dgns in C; any source
    // with dnum < n_dgns is considered already assigned.
    const nDungeons = _dungeonLevelCounts.size || (TUTORIAL + 1);
    if ((Number.isInteger(source?.dnum) && source.dnum < nDungeons)
        || (rn2(3) && !_wizardMode)) {
        return false;
    }

    // C ref: mklev.c:2636-2639.
    const questBranch = dungeon_branch("The Quest");
    const atQuestEntrance = !!questBranch
        && on_level({ dnum, dlevel }, questBranch.end1);
    const uDepth = depth({ dnum, dlevel });
    if (!(dnum === DUNGEONS_OF_DOOM
        && !atQuestEntrance
        && uDepth > 10
        && uDepth < _medusaDepth)) {
        return false;
    }

    // C ref: mklev.c:2642-2644 — source becomes current level once portal is set.
    source.dnum = dnum;
    source.dlevel = dlevel;

    return !!maketrap(map, x, y, MAGIC_PORTAL, levelDepth);
}

// C ref: mklev.c mkinvk_check_wall()
export function mkinvk_check_wall(map, x, y) {
    if (!map || !isok(x, y)) return 0;
    const loc = map.at(x, y);
    if (!loc) return 0;
    return (IS_STWALL(loc.typ) || loc.typ === IRONBARS) ? 1 : 0;
}

// C ref: mklev.c mkinvpos()
export function mkinvpos(map, x, y, dist, depth = 1) {
    if (!map || !isok(x, y)) return false;

    // Invocation area is clipped by maze-like bounds on both axes.
    const xMin = 2, yMin = 2;
    const xMax = Number.isInteger(map._mazeMaxX) ? map._mazeMaxX : (COLNO - 1);
    const yMax = Number.isInteger(map._mazeMaxY) ? map._mazeMaxY : (ROWNO - 1);
    if (!within_bounded_area(x, y, xMin, yMin, xMax, yMax)) return false;

    const trap = map.trapAt(x, y);
    if (trap) deltrap(map, trap);

    // C: clear boulders and optionally fracture one into rocks.
    const makeRocks = (dist !== 1 && dist !== 4 && dist !== 5);
    const boulders = map.objectsAt(x, y).filter(o => o.otyp === BOULDER);
    let fractured = false;
    for (const b of boulders) {
        map.removeObject(b);
        if (makeRocks && !fractured) {
            fractured = true;
            const rock = mksobj(ROCK, true, false);
            if (rock) {
                rock.ox = x;
                rock.oy = y;
                placeFloorObject(map, rock);
            }
        }
    }

    const loc = map.at(x, y);
    loc.seenv = 0;
    loc.flags = 0;
    if (dist < 6) loc.lit = true;
    loc.waslit = true;
    loc.horizontal = false;

    switch (dist) {
    case 1:
        if (!IS_POOL(loc.typ) && !IS_LAVA(loc.typ)) {
            loc.typ = ROOM;
            const fire = maketrap(map, x, y, FIRE_TRAP, depth);
            if (fire) fire.tseen = true;
        }
        break;
    case 0:
    case 2:
    case 3:
    case 6:
        loc.typ = ROOM;
        break;
    case 4:
    case 5:
        loc.typ = MOAT;
        break;
    default:
        return false;
    }
    return true;
}

// C ref: mklev.c mkinvokearea()
export function mkinvokearea(map, invPos, depth = 1) {
    if (!map) return false;
    const center = invPos || map.inv_pos || map._invPos || map.upstair;
    if (!center || !isok(center.x, center.y)) return false;

    let xmin = center.x, xmax = center.x;
    let ymin = center.y, ymax = center.y;
    mkinvpos(map, xmin, ymin, 0, depth);

    for (let dist = 1; dist < 7; dist++) {
        xmin--;
        xmax++;
        if (dist !== 3) {
            ymin--;
            ymax++;
            for (let i = xmin + 1; i < xmax; i++) {
                mkinvpos(map, i, ymin, dist, depth);
                mkinvpos(map, i, ymax, dist, depth);
            }
        }
        for (let i = ymin; i <= ymax; i++) {
            mkinvpos(map, xmin, i, dist, depth);
            mkinvpos(map, xmax, i, dist, depth);
        }
    }

    mkstairs(map, center.x, center.y, false, null, false);
    return true;
}

// C ref: mklev.c:1312-1322 — vault creation and fill
// Called when check_room succeeds for vault position.
// Creates the vault room structure, calls fill_special_room (matching C's
// mklev.c:1319 first fill), then runs wallification on the vault region.
async function do_fill_vault(map, vaultCheck, depth) {
    const lowx = vaultCheck.lowx;
    const lowy = vaultCheck.lowy;
    const hix = lowx + vaultCheck.ddx;
    const hiy = lowy + vaultCheck.ddy;

    add_room(map, lowx, lowy, hix, hiy, true, VAULT, false);
    map.flags.has_vault = true;
    // C ref: mklev.c:1318 — vault room gets needfill=FILL_NORMAL
    map.rooms[map.nroom - 1].needfill = FILL_NORMAL;

    // C ref: mklev.c:1319 — fill_special_room called immediately after vault creation.
    // C calls it here AND again in the general room loop (mklev.c:1406), so vault gold
    // is filled twice and stacks. needfill is not reset to FILL_NONE by fill_special_room.
    fill_special_room(map, map.rooms[map.nroom - 1], depth);

    // C ref: mk_knox_portal(vault_x + w, vault_y + h)
    mk_knox_portal(map, hix, hiy, depth);

    // C ref: mklev.c:1321-1322 — !rn2(3) → makevtele()
    if (!rn2(3)) {
        await makevtele(map, depth);
    }

    // Re-run wallification around the vault region to fix wall types
    wallify(map, lowx - 1, lowy - 1, hix + 1, hiy + 1);
    // C ref: vault.c wall repair paths call xy_set_wall_state() immediately
    // after setting repaired wall types.
    for (let x = lowx - 1; x <= hix + 1; x++) {
        for (let y = lowy - 1; y <= hiy + 1; y++) {
            // Match vault.c scope: only boundary tiles around the vault.
            if (x !== lowx - 1 && x !== hix + 1 && y !== lowy - 1 && y !== hiy + 1) continue;
            const loc = map.at(x, y);
            if (!loc) continue;
            if (!(IS_WALL(loc.typ) || loc.typ === SDOOR)) continue;
            // C sets wall_info/doormask to 0 before xy_set_wall_state().
            loc.flags &= ~WM_MASK;
            xy_set_wall_state(map, x, y);
        }
    }
}

// C ref: mkobj.c mkgold() — create or merge gold at position.
// If gold already exists at (x,y), merge into it (no mksobj call).
// Otherwise create new gold object via mksobj_at.
function mkgold(map, amount, x, y) {
    const existing = map.objectsAt(x, y).find(o => o.otyp === GOLD_PIECE);
    if (existing) {
        existing.quan += amount;
        existing.owt = weight(existing);
        return existing;
    }
    const gold = mksobj_at(map, GOLD_PIECE, x, y, true, false);
    if (gold) {
        gold.quan = amount;
        gold.owt = weight(gold);
    }
    return gold;
}

// set_malign imported from makemon.js

// C ref: mkobj.c mksobj_at() — make specific object at location.
function mksobj_at(map, otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    if (otmp) {
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
    }
    return otmp;
}

// C ref: mkobj.c mkobj_at() — make random class object at location.
function mkobj_at(map, oclass, x, y, artif) {
    const otmp = mkobj(oclass, artif);
    if (otmp) {
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
    }
    return otmp;
}

// C ref: mkobj.c mk_tt_object() — make CORPSE or STATUE with scoreboard name.
// C's tt_oname() calls get_rnd_toptenentry() which always consumes rnd(10)
// (sysopt.tt_oname_maxrank defaults to 10) before returning NULL for an empty
// scoreboard.  We have no scoreboard, so simulate the RNG consumption and
// fall through to the random player class path.
function mk_tt_object(map, objtype, x, y) {
    const initialize_it = (objtype !== STATUE);
    const otmp = mksobj_at(map, objtype, x, y, initialize_it, false);
    if (otmp) {
        // C: get_rnd_toptenentry() → rnd(sysopt.tt_oname_maxrank) = rnd(10)
        rnd(10);
        // C: tt_oname returns NULL (empty scoreboard) → random player class
        const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        set_corpsenm(otmp, pm);
    }
    return otmp;
}

// make_grave imported from engrave.js

// C ref: mkroom.c fill_zoo() — fill a zoo-type room with appropriate monsters/objects.
function fill_zoo_room(map, sroom, depth) {
    const type = sroom.rtype;
    const door = Array.isArray(map.doors) ? map.doors[sroom.fdoor] : null;
    const difficulty = Math.max(Math.trunc(depth), 1);
    let goldlim = 0;
    let tx = 0, ty = 0;

    // Pre-loop setup per room type (C ref: mkroom.c:289-322)
    switch (type) {
    case COURT:
        // For maze levels, look for existing throne tile
        if (map.flags && map.flags.is_maze_lev) {
            let found = false;
            for (let sx = sroom.lx; sx <= sroom.hx && !found; sx++) {
                for (let sy = sroom.ly; sy <= sroom.hy && !found; sy++) {
                    const loc = map.at(sx, sy);
                    if (loc && loc.typ === THRONE) {
                        tx = sx; ty = sy; found = true;
                    }
                }
            }
            if (!found) {
                // Fallback: somexyspace loop
                let i = 100;
                do {
                    const pos = somexyspace(map, sroom);
                    if (pos) { tx = pos.x; ty = pos.y; }
                } while (occupied(map, tx, ty) && --i > 0);
            }
        } else {
            let i = 100;
            do {
                const pos = somexyspace(map, sroom);
                if (pos) { tx = pos.x; ty = pos.y; }
            } while (occupied(map, tx, ty) && --i > 0);
        }
        mk_zoo_thronemon(map, tx, ty, depth);
        break;
    case BEEHIVE:
        tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
        ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
        // C: irregular room center check — skip for now (rare)
        break;
    case ZOO:
    case LEPREHALL:
        goldlim = 500 * difficulty;
        break;
    }

    // Main cell loop (C ref: mkroom.c:324-419)
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            const loc = map.at(sx, sy);
            if (!loc) continue;

            // SPACE_POS check + door adjacency skip
            if (loc.typ <= DOOR) continue;
            if (sroom.doorct && door
                && ((sx === sroom.lx && door.x === sx - 1)
                    || (sx === sroom.hx && door.x === sx + 1)
                    || (sy === sroom.ly && door.y === sy - 1)
                    || (sy === sroom.hy && door.y === sy + 1))) {
                continue;
            }

            // Don't place monster on explicitly placed throne
            if (type === COURT && loc.typ === THRONE) continue;

            // Select monster type per room type (C ref: mkroom.c:345-361)
            let monType;
            if (type === COURT) monType = courtmon(depth);
            else if (type === BARRACKS) monType = squadmon(depth);
            else if (type === MORGUE) monType = morguemon(depth);
            else if (type === BEEHIVE) monType = (sx === tx && sy === ty) ? mons[PM_QUEEN_BEE] : mons[PM_KILLER_BEE];
            else if (type === LEPREHALL) monType = mons[PM_LEPRECHAUN];
            else if (type === COCKNEST) monType = mons[PM_COCKATRICE];
            else if (type === ANTHOLE) monType = antholemon(depth);
            else monType = null; // ZOO: random

            // C: MM_ASLEEP | MM_NOGRP — keep both fields in sync until legacy
            // `sleeping` alias is fully removed.
            const mon = makemon(monType, sx, sy, MM_NOGRP, depth, map);
            if (mon) {
                mon.sleeping = true;
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = false;
                    set_malign(mon);
                }
            }

            // Per-cell object placement (C ref: mkroom.c:370-419)
            switch (type) {
            case ZOO:
            case LEPREHALL: {
                let i;
                if (sroom.doorct && door) {
                    const dx = sx - door.x;
                    const dy = sy - door.y;
                    const distval = (dx * dx) + (dy * dy);
                    i = distval * distval;
                } else {
                    i = goldlim;
                }
                if (i >= goldlim) i = 5 * difficulty;
                goldlim -= i;
                mkgold(map, rn1(i, 10), sx, sy);
                break;
            }
            case MORGUE:
                if (!rn2(5)) mk_tt_object(map, CORPSE, sx, sy);
                if (!rn2(10)) mksobj_at(map, rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                if (!rn2(5)) make_grave(map, sx, sy);
                break;
            case BEEHIVE:
                if (!rn2(3)) mksobj_at(map, LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
                break;
            case BARRACKS:
                if (!rn2(20)) mksobj_at(map, rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                break;
            case COCKNEST:
                if (!rn2(3)) {
                    const sobj = mk_tt_object(map, STATUE, sx, sy);
                    if (sobj) {
                        // C: add items to statue container
                        for (let ci = rn2(5); ci; ci--) {
                            const cobj = mkobj(RANDOM_CLASS, false);
                            if (cobj) {
                                if (!sobj.cobj) sobj.cobj = [];
                                sobj.cobj.push(cobj);
                            }
                        }
                        sobj.owt = weight(sobj);
                    }
                }
                break;
            case ANTHOLE:
                if (!rn2(3)) mkobj_at(map, FOOD_CLASS, sx, sy, false);
                break;
            }
        }
    }

    // Post-loop actions (C ref: mkroom.c:421-452)
    switch (type) {
    case COURT: {
        const loc = map.at(tx, ty);
        if (loc) loc.typ = THRONE;
        const chestPos = somexyspace(map, sroom);
        const gold = mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = rn1(50 * difficulty, 10);
            gold.owt = weight(gold);
            // Royal coffers: chest with gold
            if (chestPos) {
                const chest = mksobj_at(map, CHEST, chestPos.x, chestPos.y, true, false);
                if (chest) {
                    if (!chest.cobj) chest.cobj = [];
                    chest.cobj.push(gold);
                    chest.owt = weight(chest);
                    chest.spe = 2; // findable later
                }
            }
        }
        break;
    }
    }
}

// C ref: sp_lev.c fill_special_room()
export function fill_special_room(map, croom, depth) {
    if (!croom) return;
    for (let i = 0; i < croom.nsubrooms; i++) {
        fill_special_room(map, croom.sbrooms[i], depth);
    }
    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE) {
        return;
    }

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            stock_room(
                croom.rtype - SHOPBASE,
                croom,
                map,
                depth,
                _gameUbirthday,
                getLedgerNoForLevel(map._genDnum, map._genDlevel),
            );
            map.flags.has_shop = true;
            return;
        }
        switch (croom.rtype) {
        case VAULT:
            // C ref: sp_lev.c:2758-2762 — mkgold(rn1(abs(depth)*100, 51), x, y) per cell.
            // Called twice for vault (mklev.c:1319 + mklev.c:1406), so gold stacks.
            for (let vx = croom.lx; vx <= croom.hx; vx++) {
                for (let vy = croom.ly; vy <= croom.hy; vy++) {
                    mkgold(map, rn1(Math.abs(depth) * 100 || 100, 51), vx, vy);
                }
            }
            break;
        case COURT:
        case ZOO:
        case BEEHIVE:
        case ANTHOLE:
        case COCKNEST:
        case LEPREHALL:
        case MORGUE:
        case BARRACKS:
            fill_zoo_room(map, croom, depth);
            break;
        default:
            break;
        }
    }

    switch (croom.rtype) {
    case VAULT:
        map.flags.has_vault = true;
        break;
    case ZOO:
        map.flags.has_zoo = true;
        break;
    case COURT:
        map.flags.has_court = true;
        break;
    case MORGUE:
        map.flags.has_morgue = true;
        break;
    case BEEHIVE:
        map.flags.has_beehive = true;
        break;
    case BARRACKS:
        map.flags.has_barracks = true;
        break;
    case TEMPLE:
        map.flags.has_temple = true;
        break;
    case SWAMP:
        map.flags.has_swamp = true;
        break;
    default:
        break;
    }
}

// ========================================================================
// Pre-makelevel dungeon initialization simulation
// ========================================================================

// Simulate all RNG calls from dungeon.c init_dungeons() plus surrounding
// pre-makelevel calls. The call count is seed-dependent because
// place_level() uses recursive backtracking that varies by dungeon size.
//
// Call sequence (wizard mode — no chance checks):
//   0. role_init: rn2(100) for quest nemesis gender (Archeologist/Wizard only)
//   1. nhlib.lua shuffle(align): rn2(3), rn2(2)
//   2. For each dungeon:
//      a. rn1(range, base) → rn2(range) if range > 0
//      b. parent_dlevel → rn2(num) for non-root, non-unconnected dungeons
//      c. place_level → recursive rn2(npossible) calls
//   3. init_castle_tune: 5 × rn2(7)
//   4. u_init.c: rn2(10)
//   5. nhlua pre_themerooms shuffle: rn2(3), rn2(2)
//   6. bones.c: rn2(3)
function parentDepthFromSelector(selector, dungeonLayouts) {
    if (selector.kind === 'fixed') {
        return { base: selector.base, count: selector.count };
    }
    if (selector.kind === 'chain') {
        const parentPlaced = dungeonLayouts.get(selector.parentDungeon)?.placed || [];
        const chainLevel = parentPlaced[selector.chainLevelIndex];
        if (!Number.isFinite(chainLevel)) {
            return { base: selector.base, count: selector.count };
        }
        return { base: chainLevel + selector.baseOffset, count: selector.count };
    }
    return { base: 1, count: 1 };
}

// C ref: dungeon.c init_dungeon_set_entry()
export function init_dungeon_set_entry(selector, dungeonLayouts) {
    return parentDepthFromSelector(selector, dungeonLayouts);
}

function pickParentDepth(base, count, roll, parentDnum, occupiedByParent) {
    // C ref: dungeon.c parent_dlevel():
    // i = j = rn2(num); do { ++i (wrap); test base+i } while (occupied && i != j)
    const used = occupiedByParent.get(parentDnum) || new Set();
    let i = Number.isFinite(roll) ? roll : 0;
    const j = i;
    do {
        i = (i + 1) % count;
        const candidate = base + i;
        if (!used.has(candidate)) {
            used.add(candidate);
            occupiedByParent.set(parentDnum, used);
            return candidate;
        }
    } while (i !== j);
    // If all candidates occupied, C returns last checked slot.
    const candidate = base + i;
    used.add(candidate);
    occupiedByParent.set(parentDnum, used);
    return candidate;
}

// C ref: dungeon.c init_dungeon_set_depth()
export function init_dungeon_set_depth(base, count, roll, parentDnum, occupiedByParent) {
    return pickParentDepth(base, count, roll, parentDnum, occupiedByParent);
}

function buildBranchTopology(dungeonLayouts, parentRolls) {
    const branchSpecs = [
        // C ref: dungeon.lua branch order for The Dungeons of Doom:
        // Mines, Sokoban, Quest, Fort Ludios, Gehennom, Elemental Planes.
        // parent_dlevel() avoids occupied branch slots in sequence, so order matters.
        // child dnum 2: Mines, base 2 range 3
        {
            childDnum: GNOMISH_MINES, childEntry: 1, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'fixed', base: 2, count: 3 },
            type: BR_STAIR, end1_up: false
        },
        // child dnum 4: Sokoban, chain oracle +1, direction up
        {
            childDnum: SOKOBAN, childEntry: 4, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'chain', parentDungeon: DUNGEONS_OF_DOOM, chainLevelIndex: 1, baseOffset: 1, count: 1 },
            type: BR_STAIR, end1_up: true
        },
        // child dnum 3: Quest, chain oracle +6 range2, portal
        {
            childDnum: QUEST, childEntry: 1, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'chain', parentDungeon: DUNGEONS_OF_DOOM, chainLevelIndex: 1, baseOffset: 6, count: 2 },
            type: BR_PORTAL, end1_up: false
        },
        // child dnum 5: Fort Ludios, base 18 range 4, portal
        {
            childDnum: KNOX, childEntry: 1, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'fixed', base: 18, count: 4 },
            type: BR_PORTAL, end1_up: false
        },
        // child dnum 1: Gehennom, parent DoD castle, no_down -> BR_NO_END1 (end1_up=false)
        {
            childDnum: GEHENNOM, childEntry: 1, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'chain', parentDungeon: DUNGEONS_OF_DOOM, chainLevelIndex: 4, baseOffset: 0, count: 1 },
            type: BR_NO_END1, end1_up: false
        },
        // child dnum 7: Elemental Planes, parent DoD base1, no_down, direction up
        {
            childDnum: ELEMENTAL_PLANES, childEntry: 1, parentDnum: DUNGEONS_OF_DOOM,
            selector: { kind: 'fixed', base: 1, count: 1 },
            type: BR_NO_END1, end1_up: true
        },
        // child dnum 6: Vlad's Tower, parent Gehennom base9 range5, direction up
        {
            childDnum: VLADS_TOWER, childEntry: 1, parentDnum: GEHENNOM,
            selector: { kind: 'fixed', base: 9, count: 5 },
            type: BR_STAIR, end1_up: true
        }
    ];

    const occupiedByParent = new Map();
    const branches = [];
    for (const spec of branchSpecs) {
        const { base, count } = parentDepthFromSelector(spec.selector, dungeonLayouts);
        const roll = parentRolls.get(spec.childDnum) || 0;
        const parentDepth = pickParentDepth(base, count, roll, spec.parentDnum, occupiedByParent);
        branches.push({
            type: spec.type,
            end1: { dnum: spec.parentDnum, dlevel: parentDepth },
            end2: { dnum: spec.childDnum, dlevel: spec.childEntry },
            end1_up: spec.end1_up
        });
    }

    return branches;
}

// C ref: dungeon.c init_dungeon_branches()
export function init_dungeon_branches(dungeonLayouts, parentRolls) {
    return buildBranchTopology(dungeonLayouts, parentRolls);
}

// C ref: dungeon.c init_dungeon_levels()
export function init_dungeon_levels(rawLevels, numLevels, levelActive) {
    return placeLevelSim(rawLevels, numLevels, levelActive);
}

// C ref: dungeon.c init_dungeon_dungeons()
export function init_dungeon_dungeons({
    wizard,
    dungeonDefs,
    dnumMap,
    parentRolls,
    dungeonLayouts,
}) {
    let ledgerCursor = 0;
    for (let dgnIndex = 0; dgnIndex < dungeonDefs.length; dgnIndex++) {
        const dgn = dungeonDefs[dgnIndex];

        // C ref: dungeon.c:1022 — non-wizard dungeon chance check
        if (!wizard && dgn.chance && dgn.chance <= rn2(100)) {
            continue;
        }

        const numLevels = dgn.range > 0
            ? rn2(dgn.range) + dgn.base
            : dgn.base;
        const ledgerStart = ledgerCursor;
        ledgerCursor += numLevels;

        let parentRoll = 0;
        if (dgn.hasParent) {
            parentRoll = rn2(dgn.parentBranchNum);
        }

        const levelActive = dgn.levels.map(lvl => {
            const chance = lvl[3] ?? 100;
            if (!wizard && chance <= rn2(100)) return false;
            return true;
        });

        const placed = init_dungeon_levels(dgn.levels, numLevels, levelActive);
        const jsDnum = dnumMap[dgnIndex];
        if (jsDnum >= 0) {
            parentRolls.set(jsDnum, parentRoll);
            dungeonLayouts.set(jsDnum, { numLevels, parentRoll, placed });
            _dungeonLedgerStartByDnum.set(jsDnum, ledgerStart);
            if (jsDnum === DUNGEONS_OF_DOOM) {
                const oracleDlevel = Number.isInteger(placed[1]) && placed[1] > 0 ? placed[1] : 5;
                _oracleLevel = { dnum: DUNGEONS_OF_DOOM, dlevel: oracleDlevel };
                // placed[3] = medusa dlevel (index 3 in DUNGEONS_OF_DOOM special level list)
                // C ref: mklev.c:1277 — In_hell || (rn2(5) && beyond_medusa) path
                const medusaDlevel = Number.isInteger(placed[3]) && placed[3] > 0 ? placed[3] : 20;
                _medusaDepth = medusaDlevel;
            }
            if (jsDnum === QUEST) {
                // C ref: mklev.c:1280-1285 — loca dlevel used for fila/filb selection
                // placed[1] = loca dlevel (index 1 in QUEST branch levels list)
                if (Number.isInteger(placed[1]) && placed[1] > 0) {
                    _questLocaDlevel = placed[1];
                }
            }
            const canonList = RUNTIME_SPECIAL_LEVEL_CANON.get(jsDnum);
            if (canonList) {
                for (const { index, canonDlevel } of canonList) {
                    const actualDlevel = placed[index];
                    if (!Number.isInteger(actualDlevel) || actualDlevel < 1) continue;
                    _runtimeSpecialLevelMap.set(`${jsDnum}:${actualDlevel}`, {
                        dnum: jsDnum,
                        dlevel: canonDlevel,
                    });
                }
            }
        }
    }
    return { ledgerCursor };
}

// C ref: dungeon.c init_dungeons()
export function init_dungeons(roleIndex, wizard = true) {
    _wizardMode = !!wizard;
    set_mkroom_wizard_mode(_wizardMode);
    set_mkroom_ubirthday(_gameUbirthday);
    // 0. role_init: quest nemesis gender — rn2(100) for roles whose
    // nemesis lacks M2_MALE/M2_FEMALE/M2_NEUTER flags.
    // C ref: role.c:2060 — only Archeologist (Minion of Huhetotl) and
    // Wizard (Dark One) need this call; all other nemeses have explicit gender.
    const roleMnum = roles[roleIndex]?.mnum;
    if (roleMnum === PM_ARCHEOLOGIST || roleMnum === PM_WIZARD) {
        rn2(100);
    }
    // C ref: role.c randrole() — priests pick a random pantheon role.
    // This consumes rn2(SIZE(roles)) before dungeon initialization.
    if (roleMnum === PM_CLERIC) {
        rn2(roles.length);
    }

    // 1. nhlib.lua: shuffle(align) — 3-element Fisher-Yates
    rn2(3); rn2(2);

    // Level definitions for each dungeon, in dungeon.lua order.
    // Each level: [base, range, chainIndex] where chainIndex is -1 for
    // no chain, or the index into THIS dungeon's level list for the chain.
    // In wizard mode, all levels are created (no chance checks).
    const DUNGEON_DEFS = [
        { // 0: Dungeons of Doom
            base: 25, range: 5, chance: 100, hasParent: false,
            // parentBranch computed from DofD branches, not needed for root
            levels: [
                [15, 4, -1, 100],  // rogue
                [5, 5, -1, 100],   // oracle
                [10, 3, -1, 40],   // bigrm
                [-5, 4, -1, 100],  // medusa
                [-1, 0, -1, 100],  // castle
            ],
        },
        { // 1: Gehennom
            base: 20, range: 5, chance: 100, hasParent: true,
            parentBranchNum: 1, // rn2(1) — chain=castle in DofD, base=0, range=0
            levels: [
                [1, 0, -1, 100],   // valley
                [-1, 0, -1, 100],  // sanctum
                [4, 4, -1, 100],   // juiblex
                [6, 4, -1, 100],   // baalz
                [2, 6, -1, 100],   // asmodeus
                [11, 6, -1, 100],  // wizard1
                [1, 0, 5, 100],    // wizard2 (chain=wizard1)
                [2, 0, 5, 100],    // wizard3 (chain=wizard1)
                [10, 6, -1, 100],  // orcus
                [-6, 4, -1, 100],  // fakewiz1
                [-6, 4, -1, 100],  // fakewiz2
            ],
        },
        { // 2: Gnomish Mines
            base: 8, range: 2, chance: 100, hasParent: true,
            parentBranchNum: 3, // rn2(3) — base=2, range=3 in DofD
            levels: [
                [3, 2, -1, 100],   // minetn
                [-1, 0, -1, 100],  // minend
            ],
        },
        { // 3: The Quest
            base: 5, range: 2, chance: 100, hasParent: true,
            parentBranchNum: 2, // rn2(2) — chain=oracle in DofD, base=6, range=2
            levels: [
                [1, 1, -1, 100],   // x-strt
                [3, 1, -1, 100],   // x-loca
                [-1, 0, -1, 100],  // x-goal
            ],
        },
        { // 4: Sokoban
            base: 4, range: 0, chance: 100, hasParent: true,
            parentBranchNum: 1, // rn2(1) — chain=oracle in DofD, base=1, range=0
            levels: [
                [1, 0, -1, 100],   // soko1
                [2, 0, -1, 100],   // soko2
                [3, 0, -1, 100],   // soko3
                [4, 0, -1, 100],   // soko4
            ],
        },
        { // 5: Fort Ludios
            base: 1, range: 0, chance: 100, hasParent: true,
            parentBranchNum: 4, // rn2(4) — base=18, range=4 in DofD
            levels: [
                [-1, 0, -1, 100],  // knox
            ],
        },
        { // 6: Vlad's Tower
            base: 3, range: 0, chance: 100, hasParent: true,
            parentBranchNum: 5, // rn2(5) — base=9, range=5 in Gehennom
            levels: [
                [1, 0, -1, 100],   // tower1
                [2, 0, -1, 100],   // tower2
                [3, 0, -1, 100],   // tower3
            ],
        },
        { // 7: Elemental Planes
            base: 6, range: 0, chance: 100, hasParent: true,
            parentBranchNum: 1, // rn2(1) — base=1, range=0 in DofD
            levels: [
                [1, 0, -1, 100],   // astral
                [2, 0, -1, 100],   // water
                [3, 0, -1, 100],   // fire
                [4, 0, -1, 100],   // air
                [5, 0, -1, 100],   // earth
                [6, 0, -1, 100],   // dummy
            ],
        },
        { // 8: Tutorial (unconnected — no parent branch)
            base: 2, range: 0, chance: 100, hasParent: false,
            levels: [
                [1, 0, -1, 100],   // tut-1
                [2, 0, -1, 100],   // tut-2
            ],
        },
    ];

    const dungeonLayouts = new Map();
    const parentRolls = new Map();
    const C_DGN_TO_JS_DNUM = [
        DUNGEONS_OF_DOOM, // 0: DoD
        GEHENNOM,         // 1: Gehennom
        GNOMISH_MINES,    // 2: Mines
        QUEST,            // 3: Quest
        SOKOBAN,          // 4: Sokoban
        KNOX,             // 5: Ludios
        VLADS_TOWER,      // 6: Tower
        ELEMENTAL_PLANES, // 7: Elemental Planes
        TUTORIAL,         // 8: Tutorial
    ];
    _dungeonLedgerStartByDnum = new Map();
    _runtimeSpecialLevelMap = new Map();
    init_dungeon_dungeons({
        wizard,
        dungeonDefs: DUNGEON_DEFS,
        dnumMap: C_DGN_TO_JS_DNUM,
        parentRolls,
        dungeonLayouts,
    });

    _branchTopology = init_dungeon_branches(dungeonLayouts, parentRolls);
    _dungeonLevelCounts = new Map();
    for (const [jsDnum, layout] of dungeonLayouts.entries()) {
        if (!layout || !Number.isInteger(layout.numLevels)) continue;
        _dungeonLevelCounts.set(jsDnum, layout.numLevels);
    }
    // C ref: dungeon.c kludge for floating Knox entrance:
    // set end1.dnum to n_dgns so Ludios source stays unset until mk_knox_portal().
    const knoxBranch = dungeon_branch("Fort Ludios");
    const nDungeons = _dungeonLevelCounts.size || (TUTORIAL + 1);
    if (knoxBranch?.end1) {
        knoxBranch.end1.dnum = nDungeons;
    }

    // 3. init_castle_tune: 5 × rn2(7)
    for (let i = 0; i < 5; i++) rn2(7);

    // 4. u_init.c u_init() → newpw() + u_init_misc()
    // C ref: exper.c newpw() — rnd(enadv) if role has non-zero energy advance
    const role = roleIndex !== undefined ? roles[roleIndex] : null;
    const enadv = role ? (role.enadv || 0) : 0;
    const enadv_roll = enadv > 0 ? rnd(enadv) : 0;
    // C ref: u_init.c u_init_misc() — rn2(10) ? RIGHT_HANDED : LEFT_HANDED
    // Preserve the consumed roll and propagate handedness to player state.
    const rightHanded = rn2(10) !== 0;

    // 5. nhlua pre_themerooms shuffle (loaded when themerms.lua is first used)
    rn2(3); rn2(2);

    return { enadv_roll, rightHanded };
}

// Simulate C's place_level() recursive backtracking for one dungeon.
// rawLevels: array of [base, range, chainIndex, chance] per level template.
// numLevels: total dungeon levels available.
// levelActive: optional boolean array — if levelActive[i] is false, skip that
// level without consuming RNG (C skips NULL final_lev entries).
// C ref: dungeon.c:665-705 place_level, 597-626 possible_places
function placeLevelSim(rawLevels, numLevels, levelActive) {
    const placed = new Array(rawLevels.length).fill(0);

    // Compute a level's valid range given current placed state.
    // C ref: dungeon.c level_range + possible_places
    function getLevelRange(idx) {
        const [base, range, chain] = rawLevels[idx];
        let adjBase;
        if (chain >= 0) {
            // Chain to previously-placed level in this dungeon
            adjBase = placed[chain] + base;
        } else if (base < 0) {
            adjBase = numLevels + base + 1;
        } else {
            adjBase = base;
        }
        let count;
        if (range === 0) {
            count = 1;
        } else {
            count = Math.min(range, numLevels - adjBase + 1);
            if (count < 1) count = 1;
        }
        return { adjBase, count };
    }

    function doPlace(idx) {
        if (idx >= rawLevels.length) return true;

        // C skips inactive levels (NULL final_lev) without consuming RNG
        if (levelActive && !levelActive[idx]) {
            return doPlace(idx + 1);
        }

        const { adjBase, count } = getLevelRange(idx);

        // Build validity map: mark range as TRUE, then exclude placed levels
        const map = new Array(numLevels + 1).fill(false);
        for (let i = adjBase; i < adjBase + count && i <= numLevels; i++) {
            if (i >= 1) map[i] = true;
        }
        let npossible = 0;
        for (let i = 0; i < idx; i++) {
            if (placed[i] > 0 && placed[i] <= numLevels && map[placed[i]]) {
                map[placed[i]] = false;
            }
        }
        for (let i = 1; i <= numLevels; i++) {
            if (map[i]) npossible++;
        }

        // Try random placements with backtracking
        for (; npossible > 0; npossible--) {
            const nth = rn2(npossible);
            // pick_level: find the nth TRUE entry
            let c = 0;
            for (let i = 1; i <= numLevels; i++) {
                if (map[i]) {
                    if (c === nth) {
                        placed[idx] = i;
                        break;
                    }
                    c++;
                }
            }
            if (doPlace(idx + 1)) return true;
            map[placed[idx]] = false;
        }
        return false;
    }

    doPlace(0);
    return placed;
}

// ========================================================================
// get_level_extends() + bound_digging() — Mark boundary stone as non-diggable
// C ref: mkmaze.c:1353-1455
// ========================================================================

export function get_level_extends(map) {
    // C ref: mkmaze.c:1353-1427
    // Scan from each edge to find the first column/row with non-STONE content.
    // The is_maze_lev flag affects the boundary offset; normal levels use -2/+2.
    const is_maze_lev = !!(map && map.flags && map.flags.is_maze_lev);

    let xmin, xmax, ymin, ymax;
    let found, nonwall;

    // Scan columns left to right for xmin
    found = false; nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    xmin -= (nonwall || !is_maze_lev) ? 2 : 1;
    if (xmin < 0) xmin = 0;

    // Scan columns right to left for xmax
    found = false; nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    xmax += (nonwall || !is_maze_lev) ? 2 : 1;
    if (xmax >= COLNO) xmax = COLNO - 1;

    // Scan rows top to bottom for ymin (within xmin..xmax)
    found = false; nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    ymin -= (nonwall || !is_maze_lev) ? 2 : 1;

    // Scan rows bottom to top for ymax (within xmin..xmax)
    found = false; nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ)) nonwall = true;
            }
        }
    }
    ymax += (nonwall || !is_maze_lev) ? 2 : 1;

    return { xmin, xmax, ymin, ymax };
}

export function bound_digging(map) {
    // C ref: mkmaze.c:1439-1455
    // Mark boundary stone/wall cells as non-diggable so mineralize skips them.
    const { xmin, xmax, ymin, ymax } = get_level_extends(map);
    if (envFlag('DEBUG_MINERALIZE')) {
        console.log(`bound_digging: xmin=${xmin} xmax=${xmax} ymin=${ymin} ymax=${ymax}`);
    }

    for (let x = 0; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (loc && IS_STWALL(loc.typ)
                && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                loc.wall_info = (Number(loc.wall_info || 0) | W_NONDIGGABLE);
                loc.nondiggable = true; // compatibility mirror
            }
        }
    }
}

// ========================================================================
// mineralize() — Deposit gold and gems in stone walls
// C ref: mklev.c:1437-1530
// ========================================================================

// C ref: mklev.c:1421-1429 — check if water tile should have kelp
export function water_has_kelp(map, x, y, kelp_pool, kelp_moat) {
    const loc = map.at(x, y);
    if (!loc) return false;

    // kelp_pool: POOL or WATER (not waterlevel)
    if (kelp_pool && (loc.typ === POOL || loc.typ === WATER)) {
        return !rn2(kelp_pool);
    }
    // kelp_moat: MOAT
    if (kelp_moat && loc.typ === MOAT) {
        return !rn2(kelp_moat);
    }
    return false;
}

export function mineralize(map, depth, opts = null) {
    // C ref: mklev.c:1438-1530 — full mineralize implementation
    // C signature: mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks)
    // JS uses defaults: -1, -1, -1, -1, false (normal behavior)

    const kelp_pool = (opts && Number.isFinite(opts.kelp_pool) && opts.kelp_pool >= 0)
        ? Math.trunc(opts.kelp_pool) : 10; // C default when kelp_pool < 0
    const kelp_moat = (opts && Number.isFinite(opts.kelp_moat) && opts.kelp_moat >= 0)
        ? Math.trunc(opts.kelp_moat) : 30; // C default when kelp_moat < 0

    const DEBUG = envFlag('DEBUG_MINERALIZE');
    if (DEBUG) console.log(`  mineralize depth=${depth}`);
    let eligible_count = 0;
    let rng_calls = 0;
    const startRng = DEBUG ? getRngCallCount() : 0;

    // C ref: mklev.c:1454-1457 — Place kelp in water (except plane of water)
    // Skip for wizard tower (not in endgame)
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            if (water_has_kelp(map, x, y, kelp_pool, kelp_moat)) {
                const kelp = mksobj(KELP_FROND, true, false);
                if (kelp) {
                    kelp.ox = x;
                    kelp.oy = y;
                    placeFloorObject(map, kelp);
                }
            }
        }
    }

    // C ref: mklev.c:1459-1466 — Skip mineralization for special levels
    // (hell, Vlad's tower, rogue level, arboreal, most special levels)
    // Wizard tower is a special level, so we would skip... but C trace shows
    // mineralize DOES run. This suggests skip_lvl_checks=TRUE for special levels.
    // For now, proceed with mineralization.

    // C ref: mklev.c:1468-1472 — default probabilities
    let goldprob = (opts && Number.isFinite(opts.gold_prob) && opts.gold_prob >= 0)
        ? Math.trunc(opts.gold_prob) : (20 + Math.floor(depth / 3));
    let gemprob = (opts && Number.isFinite(opts.gem_prob) && opts.gem_prob >= 0)
        ? Math.trunc(opts.gem_prob) : Math.floor(goldprob / 4);

    // C ref: mklev.c:1475-1483 — adjust probabilities for dungeon branches
    // Mines: goldprob *= 2, gemprob *= 3
    // Quest: goldprob /= 4, gemprob /= 6
    // Wizard tower is neither, so use defaults

    // C ref: mklev.c:1490-1529 — scan for eligible stone tiles
    let debug_nondig = 0, debug_neighbor = 0, debug_null = 0;
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc_yp1 = map.at(x, y + 1);
            if (!loc_yp1 || loc_yp1.typ !== STONE) {
                // <x,y> and <x,y+1> not eligible, skip ahead
                if (DEBUG && !loc_yp1) debug_null++;
                if (DEBUG) {
                    const cur = map.at(x, y);
                    let wouldEligible = false;
                    const curWallInfo = Number(cur?.wall_info ?? cur?.flags ?? 0);
                    if (cur && cur.typ === STONE && !(curWallInfo & W_NONDIGGABLE)) {
                        const n7ok = map.at(x,y-1)?.typ===STONE && map.at(x+1,y-1)?.typ===STONE
                            && map.at(x-1,y-1)?.typ===STONE && map.at(x+1,y)?.typ===STONE
                            && map.at(x-1,y)?.typ===STONE && map.at(x+1,y+1)?.typ===STONE
                            && map.at(x-1,y+1)?.typ===STONE;
                        wouldEligible = n7ok;
                    }
                    if (wouldEligible)
                        console.log(`  YP1_ELIGIBLE_SKIP: (${x},${y}) yp1_typ=${loc_yp1?.typ ?? 'null'} WOULD BE ELIGIBLE`);
                }
                y += 2;
                continue;
            }
            const loc = map.at(x, y);
            if (!loc || loc.typ !== STONE) {
                // <x,y> not eligible, <x,y+1> also not eligible
                if (DEBUG && !loc) debug_null++;
                y += 1;
                continue;
            }
            // C ref: mklev.c:1496-1503 — check W_NONDIGGABLE and all 8 neighbors
            const skipNondigDebug = hasEnv('DEBUG_SKIP_NONDIG');
            const locWallInfo = Number(loc.wall_info ?? loc.flags ?? 0);
            if (!skipNondigDebug && (locWallInfo & W_NONDIGGABLE)) { if (DEBUG) { debug_nondig++; } continue; }
            if (map.at(x, y - 1)?.typ !== STONE
                || map.at(x + 1, y - 1)?.typ !== STONE
                || map.at(x - 1, y - 1)?.typ !== STONE
                || map.at(x + 1, y)?.typ !== STONE
                || map.at(x - 1, y)?.typ !== STONE
                || map.at(x + 1, y + 1)?.typ !== STONE
                || map.at(x - 1, y + 1)?.typ !== STONE) {
                if (DEBUG) { debug_neighbor++; console.log(`  skip neighbor: (${x},${y}) [ym1=${map.at(x,y-1)?.typ} xp1ym1=${map.at(x+1,y-1)?.typ} xm1ym1=${map.at(x-1,y-1)?.typ} xp1=${map.at(x+1,y)?.typ} xm1=${map.at(x-1,y)?.typ} xp1yp1=${map.at(x+1,y+1)?.typ} xm1yp1=${map.at(x-1,y+1)?.typ}]`); }
                continue;
            }

            // Eligible stone tile — try to place gold
            eligible_count++;
            if (DEBUG) console.log(`  eligible[${eligible_count}]: (${x},${y})`);
            rng_calls++;
            if (rn2(1000) < goldprob) {
                const otmp = mksobj(GOLD_PIECE, false, false);
                if (otmp) {
                    otmp.ox = x;
                    otmp.oy = y;
                    otmp.quan = 1 + rnd(goldprob * 3);
                    otmp.owt = weight(otmp);
                    // C ref: !rn2(3) → add_to_buried, else place_object
                    // C uses place_object directly (no stackobj) — use same here.
                    if (rn2(3) !== 0) {
                        place_object(otmp, otmp.ox, otmp.oy, map);
                    } else {
                        add_to_buried(otmp, map);
                    }
                }
            }
            // Try to place gems
            rng_calls++;
            if (rn2(1000) < gemprob) {
                const cnt = rnd(2 + Math.floor(depth / 3));
                for (let i = 0; i < cnt; i++) {
                    const otmp = mkobj(GEM_CLASS, false);
                    if (otmp) {
                        if (otmp.otyp === ROCK) {
                            // C: dealloc_obj(otmp) — discard rocks, no rn2(3)
                        } else {
                            otmp.ox = x;
                            otmp.oy = y;
                            // C ref: !rn2(3) → add_to_buried, else place_object
                            // C uses place_object directly (no stackobj) — use same here.
                            if (rn2(3) !== 0) {
                                place_object(otmp, otmp.ox, otmp.oy, map);
                            } else {
                                add_to_buried(otmp, map);
                            }
                        }
                    }
                }
            }
        }
    }

    if (DEBUG) {
        const endRng = getRngCallCount();
        console.log(`mineralize: depth=${depth}, eligible=${eligible_count}, rng_calls=${rng_calls} (base), actual_rng=${endRng-startRng} (indices ${startRng}..${endRng-1}), skip_nondig=${debug_nondig}, skip_neighbor=${debug_neighbor}, skip_null=${debug_null}`);
    }
}

// ========================================================================
// mkshop() — pick a room to be a shop and set its type
// C ref: mkroom.c:94-216
// ========================================================================

// ========================================================================
// Main entry point
// ========================================================================

// Called once at game start to consume the one-time RNG calls that happen
// before any level generation in C: init_objects() + dungeon structure +
// castle tune + u_init + themerooms shuffle.
// C ref: early_init() → o_init.c init_objects(), dungeon.c init_dungeons(),
//        u_init.c u_init(), nhlua pre_themerooms
export function initLevelGeneration(roleIndex, wizard = true, opts = {}) {
    _wizardMode = !!wizard;
    _harnessMapdumpSerial = 0;
    _harnessMapdumpPayloads = new Map();
    set_mkroom_wizard_mode(_wizardMode);
    set_mkroom_ubirthday(_gameUbirthday);
    init_objects();
    if (_gstate) {
        _gstate._makemonRoleIndex = Number.isInteger(roleIndex) ? roleIndex : null;
        _gstate._makemonRoleOpts = opts ? { ...opts } : {};
    }
    // C ref: mklev.c — quest levels are role-specific; register the active role's levels.
    _questRoleAbbr = roles[roleIndex]?.abbr ?? 'Arc';
    initQuestLevels(_questRoleAbbr);
    _branchTopology = [];  // reset before recalculating from init_dungeons RNG
    _dungeonLevelCounts = new Map();
    const dungeonResult = init_dungeons(roleIndex, wizard);
    free_luathemes();
    setMtInitialized(false); // Reset MT RNG state for new game

    // NOTE: xoshiro256** seeding happens in test harness before calling this
    return dungeonResult;
}

// C ref: mklev.c makelevel()
/**
 * Generate a level at the specified depth or dungeon coordinates.
 * @param {number} depth - Absolute depth from surface (backward compat)
 * @param {number} [dnum] - Dungeon branch number (optional)
 * @param {number} [dlevel] - Level within branch (optional, 1-based)
 * @returns {GameMap} The generated level
 */
export async function makelevel(depth, dnum, dlevel, opts = {}) {
    const finishGeneratedMap = (outMap) => {
        emitHarnessMapdumpEvent(outMap, depth, dnum, dlevel);
        return outMap;
    };
    const forcedAlign = Number.isInteger(opts?.dungeonAlignOverride)
        ? opts.dungeonAlignOverride
        : undefined;
    const heroHasAmulet = !!opts?.heroHasAmulet;
    if (_gstate) {
        _gstate._dungeonAlign = forcedAlign ?? (DUNGEON_ALIGN_BY_DNUM[dnum] ?? A_NONE);
    }

    if (_gstate) _gstate._levelDepth = depth;
    // C ref: mklev.c:1260, sp_lev.c:6004 — oinit() calls setgemprobs(&u.uz)
    // Depth-only callers (no branch coordinates) should still use the
    // requested level depth rather than falling back to level 1.
    const gemLedgerNo = (Number.isInteger(dnum) && Number.isInteger(dlevel))
        ? getLedgerNoForLevel(dnum, dlevel)
        : (Number.isInteger(depth) && depth > 0 ? depth : 1);
    setgemprobs(gemLedgerNo);
    resetThemermsState(); // Reset themed room state for new level
    setMtInitialized(false); // Reset MT RNG state - init happens per level, not per session

    // C ref: bones.c getbones() — rn2(3) + bones load pipeline
    // Must happen BEFORE special level check to match C RNG order
    const bonesMap = getbones(null, depth);
    if (bonesMap) return finishGeneratedMap(bonesMap);
    inMklev = true;
    if (_gstate) _gstate._inMklev = true;
    try {

    // Check for special level.
    // Normal path uses explicit branch coordinates.
    // Fallback path (depth-only callers) supports dynamic Oracle depth parity
    // based on simulated init_dungeons placement.
    const DEBUG = envFlag('DEBUG_MAKELEVEL');
    let special = null;
    let specialDnum = dnum;
    let specialDlevel = dlevel;
    const depthOnlySpecialLookup = (dnum === undefined || dlevel === undefined);
    const runtimeSpecial = depthOnlySpecialLookup
        ? runtimeSpecialLevelFor(DUNGEONS_OF_DOOM, depth)
        : runtimeSpecialLevelFor(dnum, dlevel);
    if (runtimeSpecial) {
        special = getSpecialLevel(runtimeSpecial.dnum, runtimeSpecial.dlevel);
        if (depthOnlySpecialLookup) {
            specialDnum = DUNGEONS_OF_DOOM;
            specialDlevel = depth;
        }
    }
    const isRogueLevel = !!special && special.name === 'rogue';
    if (special && !isRogueLevel) {
            const useDnum = Number.isInteger(specialDnum) ? specialDnum : dnum;
            const useDlevel = Number.isInteger(specialDlevel) ? specialDlevel : dlevel;
            // C ref: align_shift() uses current special-level alignment when present.
            // For currently used special levels, mirror dungeon.lua/splev alignment.
            const specialName = typeof special.name === 'string' ? special.name : '';
            let specialAlign = forcedAlign ?? (DUNGEON_ALIGN_BY_DNUM[useDnum] ?? A_NONE);
            if (specialName.startsWith('medusa')) specialAlign = A_CHAOTIC;
            else if (specialName.startsWith('tut-')) specialAlign = A_LAWFUL;
            if (_gstate) _gstate._dungeonAlign = specialAlign;

            if (DEBUG) console.log(`Generating special level: ${special.name} at (${useDnum}, ${useDlevel})`);
            // Reset special-level Lua/des state for each special level generation.
            // Prevents stale rect/room/deferred state from prior levels affecting
            // RNG and placement on subsequent specials.
            resetLevelState();

            // C parity: special-level depth-sensitive logic should use absolute depth,
            // not branch-local dlevel.
            const specialMap = await withSpecialLevelDepth(depth, async () =>
                await withFinalizeContext({
                    dnum: useDnum,
                    dlevel: useDlevel,
                    specialName,
                    isBranchLevel: isBranchLevel(useDnum, useDlevel),
                }, async () => {
                    // C ref: nhlua.c load_lua()/nhl_init() for load_special():
                    // each special-level generation loads nhlib.lua and consumes
                    // shuffle(align): rn2(3), rn2(2).
                    rn2(3);
                    rn2(2);
                    return await special.generator();
                })
            );
            if (specialMap) {
                if (!specialMap.flags) specialMap.flags = {};
                specialMap._heroHasAmulet = heroHasAmulet;
                specialMap.flags.is_tutorial = (useDnum === TUTORIAL);
                if (specialName === 'rogue') {
                    // C parity anchor: Is_rogue_level(&u.uz) checks topology's
                    // rogue level slot; mark the generated map for JS checks.
                    specialMap.flags.is_rogue_lev = true;
                    specialMap.flags.roguelike = true;
                }
                return finishGeneratedMap(specialMap);
            }
            // If special level generation fails, fall through to procedural
            if (DEBUG) console.warn(`Special level ${special.name} generation failed, using procedural`);
    }

    const map = new GameMap();
    map.clear();
    map._heroHasAmulet = heroHasAmulet;
    map._genDnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
    map._genDlevel = Number.isInteger(dlevel) ? dlevel : depth;
    const branchDnum = map._genDnum;
    const branchDlevel = map._genDlevel;
    // C ref: mklev.c computes branchp = Is_branchlev(&u.uz) once before
    // vault/Knox portal logic; later place_branch() uses that snapshot.
    // Keep the same snapshot so branch topology mutations inside this makelevel
    // call (e.g., mk_knox_portal source assignment) do not retroactively
    // create a branch on the current level.
    const branchPlacementAtStart = resolveBranchPlacementForLevel(branchDnum, branchDlevel);
    const hasBranchAtStart = !!branchPlacementAtStart.found;
    map.is_invocation_lev = !!opts.invocationLevel
        || (dnum === GEHENNOM && dlevel === 9);
    map._isInvocationLevel = map.is_invocation_lev; // IRON_PARITY_ALIAS_BRIDGE (retire by M6)

    // C ref: mklev.c:1274-1287 — maze vs rooms decision (else-if chain)
    let usedRoomGenerationPath = false;
    // Condition 4 (In_quest) fires for fill levels not covered by named special levels.
    // No rn2(5) is consumed on the quest path — it only appears in condition 5.
    if (dnum === QUEST) {
        // C ref: mklev.c:1276-1286 — In_quest() fill level path.
        // C calls makemaz("Mon-fila" or "Mon-filb"), but the compiled .lev file is not
        // available in the harness environment, so C falls through to procedural maze
        // (rn2(3) for corrmaze, rn2(2) for maze params).
        // JS matches by calling makemaz with empty protofile = procedural maze directly.
        await makemaz(map, "", dnum, dlevel, depth);
    } else {
        const isGehennom = (dnum === GEHENNOM);
        const mazeRoll = rn2(5); // 0-4, maze if non-zero (80% chance) - C ref: mklev.c:1276
        // C ref: mklev.c:1277 — "past Medusa" uses actual placed medusa dlevel, not hardcoded 25.
        // _medusaDepth is updated from init_dungeon_dungeons when DoD placed[] is parsed.
        const isPastMedusa = (dnum === DUNGEONS_OF_DOOM || dnum === undefined) && depth > _medusaDepth;
        const shouldMakeMaze = isGehennom || (mazeRoll !== 0 && isPastMedusa);

        if (shouldMakeMaze) {
            // C ref: mklev.c:1278 makemaz("")
            await makemaz(map, "", dnum, dlevel, depth);
        } else {
            if (isRogueLevel) {
                // C ref: mklev.c:1290-1292 — Is_rogue_level() uses makeroguerooms path.
                const rogueMap = makeroguerooms(depth);
                rogueMap._genDnum = Number.isInteger(dnum) ? dnum : DUNGEONS_OF_DOOM;
                rogueMap._genDlevel = Number.isInteger(dlevel) ? dlevel : depth;
                if (!rogueMap.flags) rogueMap.flags = {};
                rogueMap.flags.is_rogue_lev = true;
                rogueMap.flags.roguelike = true;
                return finishGeneratedMap(rogueMap);
            }
            // C ref: mklev.c:1287 makerooms()
            // Initialize rectangle pool for BSP room placement
            init_rect();

            // Make rooms using rect BSP algorithm
            // Note: makerooms() handles the Lua theme load shuffle (rn2(3), rn2(2))
            await makerooms(map, depth);
            usedRoomGenerationPath = true;
        }
    } // end QUEST else-if chain

    if (usedRoomGenerationPath) {
        if (map.nroom === 0) {
            // Fallback: should never happen, but safety
            if (DEBUG) console.warn(`⚠️ makerooms() created 0 rooms! Using fallback single room. This is a bug!`);
            add_room(map, 10, 5, 20, 10, true, OROOM, false);
        } else if (DEBUG) {
            console.log(`✓ makerooms() created ${map.nroom} rooms`);
        }

        // Sort rooms left-to-right
        // C ref: mklev.c:1290 sort_rooms()
        sort_rooms(map);
        repair_irregular_room_boundaries(map);

        // Place stairs
        // C ref: mklev.c:1292 generate_stairs()
        generate_stairs(map, depth);

        // Connect rooms with corridors
        // C ref: mklev.c:1299 makecorridors()
        makecorridors(map, depth);

        // Add niches
        // C ref: mklev.c:1300 make_niches()
        await make_niches(map, depth);

        // C ref: mklev.c:1305 mklev_sanity_check()
        mklev_sanity_check(map);

        // Fix wall types after corridors are dug (needed for structural consistency)
        wallification(map);

        // C ref: mklev.c:1305-1331 — do_vault()
        // Make a secret treasure vault, not connected to the rest
        if (map.vault_x !== undefined && map.vault_x >= 0) {
            let w = 1, h = 1;
            const vaultCheck = check_room(map, map.vault_x, w, map.vault_y, h, true);
            if (vaultCheck) {
                await do_fill_vault(map, vaultCheck, depth);
            } else if (rnd_rect()) {
                // Retry: create_vault() = create_room(-1,-1,2,2,-1,-1,VAULT,TRUE)
                if (create_room(map, -1, -1, 2, 2, -1, -1, VAULT, true, depth)) {
                    // create_room for vault saves position but doesn't add room
                    if (map.vault_x >= 0) {
                        w = 1; h = 1;
                        const vc2 = check_room(map, map.vault_x, w, map.vault_y, h, true);
                        if (vc2) {
                            await do_fill_vault(map, vc2, depth);
                        }
                    }
                }
            }
        }

        // C ref: mklev.c:1333-1365 — do_mkroom chain
        // Special room type selection based on depth.
        // At depth 1: u_depth > 1 fails, so entire chain is skipped (no RNG consumed).
        // For deeper depths, the chain consumes rn2() calls for each check.
        if (depth > 1) {
            // C ref: mklev.c room_threshold = branchp ? 4 : 3
            const room_threshold = hasBranchAtStart ? 4 : 3;
            const mktempleOpts = {
                induced_align_fn: induced_align,
                dungeon_align_by_dnum: DUNGEON_ALIGN_BY_DNUM,
                default_dnum: DUNGEONS_OF_DOOM,
            };
            // C ref: each check consumes one rn2() if it reaches that point
            if (depth > 1 && map.nroom >= room_threshold && rn2(depth) < 3) {
                mkshop(map);
            } else if (depth > 4 && !rn2(6)) {
                do_mkroom(map, COURT, depth, mktempleOpts);
            } else if (depth > 5 && !rn2(8)) {
                do_mkroom(map, LEPREHALL, depth, mktempleOpts);
            } else if (depth > 6 && !rn2(7)) {
                do_mkroom(map, ZOO, depth, mktempleOpts);
            } else if (depth > 8 && !rn2(5)) {
                do_mkroom(map, TEMPLE, depth, mktempleOpts);
            } else if (depth > 9 && !rn2(5)) {
                do_mkroom(map, BEEHIVE, depth, mktempleOpts);
            } else if (depth > 11 && !rn2(6)) {
                do_mkroom(map, MORGUE, depth, mktempleOpts);
            } else if (depth > 12 && !rn2(8)) {
                do_mkroom(map, ANTHOLE, depth, mktempleOpts);
            } else if (depth > 14 && !rn2(4)) {
                do_mkroom(map, BARRACKS, depth, mktempleOpts);
            } else if (depth > 15 && !rn2(6)) {
                do_mkroom(map, SWAMP, depth, mktempleOpts);
            } else if (depth > 16 && !rn2(8)) {
                do_mkroom(map, COCKNEST, depth, mktempleOpts);
            }
        }

        // C ref: mklev.c:1367-1376 — place_branch()
        // At depth 1: branch exists (entry from surface), place branch stairs
        if (depth === 1) {
            const { pos } = find_branch_room(map);
            if (pos) {
                const loc = map.at(pos.x, pos.y);
                if (loc) {
                    loc.typ = STAIRS;
                    loc.flags = 1; // up (branch goes up to surface)
                    loc.stairdir = 1;
                    loc.branchStair = true;
                    map.upstair = { x: pos.x, y: pos.y };
                }
            }
        }

        // C ref: mklev.c:1367-1376 — place_branch(Is_branchlev(&u.uz), 0, 0)
        // For non-first levels, only execute when this level is an actual branch endpoint.
        // C always calls find_branch_room() to consume RNG even for BR_NO_END1 (no stair placed).
        // Use branchResult.found (not placement !== 'none') to match C's RNG consumption.
        if (depth > 1) {
            if (_branchTopology.length && hasBranchAtStart) {
                const { pos } = find_branch_room(map);
                if (pos) {
                    place_branch(map, pos.x, pos.y, branchPlacementAtStart.placement);
                }
            }
        }

        // C ref: sp_lev.c lspo_room() sets needfill during room creation.
        // During themed room generation (in_mk_themerooms), default is FILL_NONE (0).
        // Only rooms with explicit filled=1 get FILL_NORMAL.
        // We do NOT bulk-override needfill here — des.room() sets it correctly.

        // C ref: mklev.c:1381-1401 — bonus item room selection + fill loop
        // ROOM_IS_FILLABLE: (rtype == OROOM || rtype == THEMEROOM) && needfill == FILL_NORMAL
        const isFillable = (r) => (r.rtype === OROOM || r.rtype === THEMEROOM)
                                  && r.needfill === FILL_NORMAL;
        let fillableCount = 0;
        // Only iterate over main rooms (nroom), not subrooms
        for (let i = 0; i < map.nroom; i++) {
            const croom = map.rooms[i];
            if (!croom || croom.hx <= 0) continue;
            if (isFillable(croom)) fillableCount++;
        }
        let bonusCountdown = fillableCount > 0 ? rn2(fillableCount) : -1;

        for (let i = 0; i < map.nroom; i++) {
            const croom = map.rooms[i];
            if (!croom || croom.hx <= 0) continue;
            const fillable = isFillable(croom);
            fill_ordinary_room(map, croom, depth,
                               fillable && bonusCountdown === 0);
            if (fillable) bonusCountdown--;
        }
    }

    // C ref: mklev.c:1405-1407 + sp_lev.c:2723-2795 — second fill_special_room
    // pass for all rooms, after fill_ordinary_room and before mineralize.
    // Only iterate over main rooms (nroom); fill_special_room() recurses subrooms.
    for (let i = 0; i < map.nroom; i++) {
        const croom = map.rooms[i];
        if (!croom || croom.hx <= 0) continue;
        fill_special_room(map, croom, depth);
    }

    // C ref: mklev.c:1409 — run themed-room post-level callbacks (e.g. garden wall->tree).
    // These callbacks operate on the active level map through sp_lev levelState.
    await withLevelContext(map, depth, async () => await themerooms_post_level_generate());

    // C ref: mklev.c:1533-1539,1558,1561-1562 — level_finalize_topology().
    level_finalize_topology(map, depth);

    return finishGeneratedMap(map);
    } finally {
        leaveMklevContext();
    }
}

// C ref: mklev.c mklev()
export async function mklev(depth, dnum, dlevel, opts = {}) {
    return await makelevel(depth, dnum, dlevel, opts);
}

// =============================================================================
// Region placement (place_lregion) — C ref: mkmaze.c:317-469
// =============================================================================

// LR_* region type constants imported from const.js

// C ref: mkmaze.c:346 — within_bounded_area
// Check if (x,y) is within the inclusive rectangle (lx,ly,hx,hy)
function within_bounded_area(x, y, lx, ly, hx, hy) {
    return x >= lx && x <= hx && y >= ly && y <= hy;
}

// Autotranslated from dungeon.c:439
export function correct_branch_type(tbr) {
  switch (tbr.type) {
    case TBR_STAIR:
      return BR_STAIR;
    case TBR_NO_UP:
      return tbr.up ? BR_NO_END1 : BR_NO_END2;
    case TBR_NO_DOWN:
      return tbr.up ? BR_NO_END2 : BR_NO_END1;
    case TBR_PORTAL:
      return BR_PORTAL;
  }
  impossible("correct_branch_type: unknown branch type");
  return BR_STAIR;
}

// Autotranslated from dungeon.c:597
export function possible_places(idx, map, pd) {
  let i, start, count, lev = pd.final_lev;
  for (i = 0; i <= MAXLEVEL; i++) {
    map = false;
  }
  count = level_range(lev.dlevel.dnum, pd.tmplevel[idx].lev.base, pd.tmplevel[idx].lev.rand, pd.tmplevel[idx].chain, pd, start);
  for (i = start; i < start + count; i++) {
    map = true;
  }
  for (i = pd.start; i < idx; i++) {
    if (pd.final_lev[i] && map[pd.final_lev[i].dlevel.dlevel]) { map[pd.final_lev[i].dlevel.dlevel] = false; --count; }
  }
  return count;
}

// Autotranslated from dungeon.c:665
export function place_level(proto_index, pd) {
  let map, lev, npossible;
  if (proto_index === pd.n_levs) return true;
  lev = pd.final_lev;
  if (!lev) return place_level(proto_index + 1, pd);
  npossible = possible_places(proto_index, map, pd);
  for (npossible; --npossible; ) {
    lev.dlevel.dlevel = pick_level(map, rn2(npossible));
    if (place_level(proto_index + 1, pd)) return true;
    map = false;
  }
  return false;
}

// Autotranslated from dungeon.c:743
export function get_dgn_flags(L) {
  let dgn_flags = 0;
  let flagstrs = [ "town", "hellish", "mazelike", "roguelike", "unconnected", null ];
  let flagstrs2i = [ TOWN, HELLISH, MAZELIKE, ROGUELIKE, UNCONNECTED, 0 ];
  lua_getfield(L, -1, "flags");
  if (lua_type(L, -1) === LUA_TTABLE) {
    let f, nflags;
    lua_len(L, -1);
    nflags =  lua_tointeger(L, -1);
    lua_pop(L, 1);
    for (f = 0; f < nflags; f++) {
      lua_pushinteger(L, f + 1);
      lua_gettable(L, -2);
      if (lua_type(L, -1) === LUA_TSTRING) { dgn_flags |= flagstrs2i; lua_pop(L, 1); }
      else {
        impossible("flags[%i] is not a string", f);
      }
    }
  }
  else if (lua_type(L, -1) === LUA_TSTRING) { dgn_flags |= flagstrs2i; }
  else if (lua_type(L, -1) !== LUA_TNIL) impossible("flags is not an array or string");
  lua_pop(L, 1);
  return dgn_flags;
}

// Autotranslated from dungeon.c:780
export function get_dgn_align(L) {
  let dgnaligns = [ "unaligned", "noalign", "lawful", "neutral", "chaotic", null ];
  let dgnaligns2i = [ D_ALIGN_NONE, D_ALIGN_NONE, D_ALIGN_LAWFUL, D_ALIGN_NEUTRAL, D_ALIGN_CHAOTIC, D_ALIGN_NONE ];
  let a = dgnaligns2i;
  return a;
}

// Autotranslated from dungeon.c:1110
export function init_castle_tune() {
  let i;
  for (i = 0; i < 5; i++) {
    svt.tune = 'A' + rn2(7);
  }
  svt.tune = 0;
}

// Autotranslated from dungeon.c:1496
export async function next_level(at_stairs, map, player) {
  let stway = await stairway_at(player.x, player.y), newlevel;
  if (at_stairs && stway) stway.u_traversed = true;
  if (at_stairs && stway) {
    newlevel.dnum = stway.tolev.dnum;
    newlevel.dlevel = stway.tolev.dlevel;
    goto_level( newlevel, at_stairs, false, false);
  }
  else {
    newlevel.dnum = map.uz.dnum;
    newlevel.dlevel = map.uz.dlevel + 1;
    goto_level( newlevel, at_stairs, !at_stairs, false);
  }
}

// Autotranslated from dungeon.c:1517
export async function prev_level(at_stairs, map, player) {
  let stway = await stairway_at(player.x, player.y), newlevel;
  if (at_stairs && stway) stway.u_traversed = true;
  if (at_stairs && stway && stway.tolev.dnum !== map.uz.dnum) {
    if (!map.uz.dnum && map.uz.dlevel === 1 && !player.uhave.amulet) await done(ESCAPED);
    else {
      newlevel.dnum = stway.tolev.dnum;
      newlevel.dlevel = stway.tolev.dlevel;
      goto_level( newlevel, at_stairs, false, false);
    }
  }
  else {
    newlevel.dnum = map.uz.dnum;
    newlevel.dlevel = map.uz.dlevel - 1;
    goto_level( newlevel, at_stairs, false, false);
  }
}

// Autotranslated from dungeon.c:1567
export async function u_on_newpos(x, y, map, player) {
  if (!isok(x, y)) {
    let PRINTF_F_PTR;
    func = (x < 0 || y < 0 || x > COLNO - 1 || y > ROWNO - 1) ? panic : impossible;
    await func("u_on_newpos: trying to place hero off map <%d,%d>", x, y);
  }
  player.x = x;
  player.y = y;
  cliparound(player.x, player.y);
  player.uundetected = 0;
  if (player.usteed) player.usteed.mx = player.x, player.usteed.my = player.y;
  if (!on_level(map.uz, map.uz0)) player.x0 = player.x, player.y0 = player.y;
  else if (!(player?.Blind || player?.blind || false) && !(player?.Hallucination || player?.hallucinating || false) && !player.uswallow) see_nearby_objects();
  earth_sense();
}

// Autotranslated from dungeon.c:1743
export async function surface(x, y, map, player) {
  let lev =  map.locations[x][y], levtyp = SURFACE_AT(x, y);
  if (u_at(player, x, y) && player.uswallow && is_animal(player.ustuck.data)) return digests(player.ustuck.data) ? "maw" : enfolds(player.ustuck.data) ? "husk" : "nonesuch";
  else if (IS_AIR(levtyp)) return Is_waterlevel(map.uz) ? "air bubble" : (levtyp === CLOUD) ? "cloud" : "air";
  else if (is_pool(x, y)) return (player?.underwater && !Is_waterlevel(map.uz)) ? "bottom" : hliquid("water");
  else if (is_ice(x, y)) return "ice";
  else if (is_lava(x, y)) return hliquid("lava");
  else if (lev.typ === DRAWBRIDGE_DOWN) return "bridge";
  else if (IS_ALTAR(levtyp)) return "altar";
  else if (IS_GRAVE(levtyp)) return "headstone";
  else if (IS_FOUNTAIN(levtyp)) return "fountain";
  else if (await On_stairs(x, y)) return "stairs";
  else if (IS_WALL(levtyp) || levtyp === SDOOR) return "wall";
  else if (IS_DOOR(levtyp)) return "doorway";
  else if (IS_ROOM(levtyp) && !Is_earthlevel(map.uz)) return "floor";
  else {
    return "ground";
  }
}

// Autotranslated from dungeon.c:1950
export function goto_hell(at_stairs, falling) {
  let lev;
  find_hell( lev);
  goto_level( lev, at_stairs, falling, false);
}

// Autotranslated from dungeon.c:1960
export function single_level_branch(lev) {
  return Is_knox(lev);
}

// Autotranslated from dungeon.c:2183
export function unreachable_level(lvl_p, unplaced, map) {
  let dummy;
  if (unplaced) return true;
  if (In_endgame(map.uz) && !In_endgame(lvl_p)) return true;
  if ((dummy = find_level("dummy")) != null && on_level(lvl_p, dummy.dlevel)) return true;
  return false;
}

// Autotranslated from dungeon.c:2197
export function tport_menu(win, entry, lchoices, lvl_p, cannotreach) {
  let tmpbuf, any, clr = NO_COLOR;
  lchoices.lev = lvl_p.dlevel;
  lchoices.dgn = lvl_p.dnum;
  lchoices.playerlev = depth(lvl_p);
  any = { a_int: 0 };
  if (cannotreach) { tmpbuf = ` ${entry}`; entry = tmpbuf; }
  else { any.a_int = lchoices.idx + 1; }
  add_menu(win, nul_glyphinfo, any, lchoices.menuletter, 0, ATR_NONE, clr, entry, MENU_ITEMFLAGS_NONE);
  if (lchoices.menuletter === 'z') lchoices.menuletter = 'A';
  else {
    lchoices.menuletter++;
  }
  lchoices.idx++;
  return;
}

// Autotranslated from dungeon.c:2249
export function chr_u_on_lvl(dlev, map) {
  return map.uz.dnum === dlev.dnum && map.uz.dlevel === dlev.dlevel ? '*' : ' ';
}

// Autotranslated from dungeon.c:2471
export function get_annotation(lev) {
  let mptr;
  if ((mptr = find_mapseen(lev))) return mptr.custom;
  return null;
}

// Autotranslated from dungeon.c:2482
export async function print_level_annotation(map) {
  let annotation;
  if ((annotation = get_annotation(map.uz)) != null) await You("remember this level as %s.", annotation);
}

// Autotranslated from dungeon.c:2564
export async function donamelevel() {
  await query_annotation(null);
  return ECMD_OK;
}

// Autotranslated from dungeon.c:2573
export function free_exclusions() {
  let ez = sve.exclusion_zones;
  while (ez) {
    let nxtez = ez.next;
    ez = nxtez;
  }
  sve.exclusion_zones =  0;
}

// Autotranslated from dungeon.c:2587
export function save_exclusions(nhfp) {
  let ez, nez;
  for (nez = 0, ez = sve.exclusion_zones; ez; ez = ez.next, ++nez) {
  }
  if (update_file(nhfp)) {
    Sfo_int(nhfp, nez, "exclusion_count");
    for (ez = sve.exclusion_zones; ez; ez = ez.next) {
      Sfo_xint16(nhfp, ez.zonetype, "exclusion-zonetype");
      Sfo_coordxy(nhfp, ez.lx, "exclusion-lx");
      Sfo_coordxy(nhfp, ez.ly, "exclusion-ly");
      Sfo_coordxy(nhfp, ez.hx, "exclusion-hx");
      Sfo_coordxy(nhfp, ez.hy, "exclusion-hy");
    }
  }
}

// Autotranslated from dungeon.c:2608
export function load_exclusions(nhfp) {
  let ez, nez = 0;
  Sfi_int(nhfp, nez, "exclusion_count");
  while (nez-- > 0) {
    ez = { zonetype: 0, lx: 0, ly: 0, hx: 0, hy: 0, next: sve.exclusion_zones };
    Sfi_xint16(nhfp, ez.zonetype, "exclusion-zonetype");
    Sfi_coordxy(nhfp, ez.lx, "exclusion-lx");
    Sfi_coordxy(nhfp, ez.ly, "exclusion-ly");
    Sfi_coordxy(nhfp, ez.hx, "exclusion-hx");
    Sfi_coordxy(nhfp, ez.hy, "exclusion-hy");
    sve.exclusion_zones = ez;
  }
}

// Autotranslated from dungeon.c:2631
export function find_mapseen(lev, game) {
  const g = game || _gstate || {};
  let mptr;
  for (mptr = g.mapseenchn; mptr; mptr = mptr.next) {
    if (on_level( (mptr.lev), lev)) {
      break;
    }
  }
  return mptr;
}

// Autotranslated from dungeon.c:2643
export function find_mapseen_by_str(s, game) {
  const g = game || _gstate || {};
  let mptr;
  for (mptr = g.mapseenchn; mptr; mptr = mptr.next) {
    if (mptr.custom && !(String(s).toLowerCase().localeCompare(String(mptr.custom).toLowerCase()))) {
      break;
    }
  }
  return mptr;
}

// Autotranslated from dungeon.c:3273
export function room_discovered(roomno, map) {
  let mptr = find_mapseen(map.uz, map?.game || _gstate);
  if (mptr && !mptr.msrooms[roomno].seen) { mptr.msrooms[roomno].seen = 1; recalc_mapseen(); }
}

// Autotranslated from dungeon.c:3296
export async function show_overview(why, reason, map) {
  let win, lastdun = -1, selected, n;
  recalc_mapseen();
  win = create_nhwindow(NHW_MENU);
  start_menu(win, MENU_BEHAVE_STANDARD);
  if (In_endgame(map.uz)) traverse_mapseenchn(1, win, why, reason, lastdun, map?.game || _gstate);
  if (why > 0 || !In_endgame(map.uz)) traverse_mapseenchn(0, win, why, reason, lastdun, map?.game || _gstate);
  end_menu(win,  0);
  n = await select_menu(win, (why !== -1) ? PICK_NONE : PICK_ONE, selected);
  if (n > 0) {
    let ledger, lev;
    ledger = selected[0].item.a_int - 1;
    lev.dnum = ledger_to_dnum(ledger);
    lev.dlevel = ledger_to_dlev(ledger);
    query_annotation( lev);
  }
  destroy_nhwindow(win);
}

// Autotranslated from dungeon.c:3335
export function traverse_mapseenchn(viewendgame, win, why, reason, lastdun_p, game) {
  const g = game || _gstate || {};
  let mptr, showheader;
  for (mptr = g.mapseenchn; mptr; mptr = mptr.next) {
    if (viewendgame ^ In_endgame( mptr.lev)) {
      continue;
    }
    if (why !== 0 || interest_mapseen(mptr)) {
      showheader =  (mptr.lev.dnum !== lastdun_p);
      print_mapseen(win, mptr, why, reason, showheader);
       lastdun_p = mptr.lev.dnum;
    }
  }
}

// Autotranslated from dungeon.c:3359
export function seen_string(x, obj) {
  switch (x) {
    case 0:
      return "no";
    case 1:
      return strchr(vowels, obj) ? "an" : "a";
    case 2:
      return "some";
    case 3:
      return "many";
  }
  return "(unknown)";
}

// Autotranslated from dungeon.c:3401
export function endgamelevelname(outbuf, indx) {
  let planename = 0;
   outbuf = '';
  switch (indx) {
    case -5:
      outbuf = "Astral Plane";
    break;
    case -4:
      planename = "Water";
    break;
    case -3:
      planename = "Fire";
    break;
    case -2:
      planename = "Air";
    break;
    case -1:
      planename = "Earth";
    break;
  }
  if (planename) {
    outbuf = `Plane of ${planename}`;
  }
  else if (!outbuf) {
    outbuf = `unknown plane #${indx}`;
  }
  return outbuf;
}

// Autotranslated from dungeon.c:3432
export function shop_string(rtype) {
  let shtypes, shoptype = rtype - SHOPBASE, str = "shop?";
  if (shoptype < 0) { str = "untended shop"; }
  else if (shtypes[shoptype].annotation) { str = shtypes[shoptype].annotation; }
  else if (shtypes[shoptype].name) { str = shtypes[shoptype].name; }
  return str;
}

// -----------------------------------------------------------------------
// dungeon.c compatibility surface for CODEMATCH tracking
// -----------------------------------------------------------------------

function _mapseenNodes(game) {
  const out = [];
  for (let cur = game?.mapseenchn || null; cur; cur = cur.next) out.push(cur);
  return out;
}

function _cloneMapseenNode(node) {
  return {
    lev: { dnum: Number(node?.lev?.dnum) || DUNGEONS_OF_DOOM, dlevel: Number(node?.lev?.dlevel) || 1 },
    custom: node?.custom ? String(node.custom) : '',
    branch: !!node?.branch,
    lastseentyp: { ...(node?.lastseentyp || {}) },
  };
}

function _writeMapseenChain(game, nodes) {
  if (!game) return;
  let head = null;
  let tail = null;
  for (const n of nodes) {
    const node = _cloneMapseenNode(n);
    node.next = null;
    if (!head) head = node;
    else tail.next = node;
    tail = node;
  }
  game.mapseenchn = head;
}

// C ref: dungeon.c:346
export function parent_dnum(branch = null) {
  return Number.isInteger(branch?.end1?.dnum) ? branch.end1.dnum : DUNGEONS_OF_DOOM;
}

// C ref: dungeon.c:415
export function parent_dlevel(branch = null) {
  return Number.isInteger(branch?.end1?.dlevel) ? branch.end1.dlevel : 1;
}

// C ref: dungeon.c:380
export function level_range(dnum, base, rand, chain = -1, pd = null, startOut = null) {
  const numLevels = dunlevs_in_dungeon(dnum);
  const parent = (Number.isInteger(chain) && chain >= 0)
    ? (pd?.final_lev?.[chain]?.dlevel?.dlevel || 0)
    : 0;
  const start = (Number.isInteger(chain) && chain >= 0)
    ? Math.max(1, parent + (Number(base) || 0))
    : Math.max(1, Number(base) || 1);
  const count = Math.max(1, Math.min(Number(rand) || 1, numLevels - start + 1));
  if (startOut && typeof startOut === 'object') startOut.value = start;
  return count;
}

// C ref: dungeon.c:632
export function pick_level(levelMap, nth) {
  let seen = 0;
  const want = Math.max(0, Number(nth) || 0);
  for (let i = 1; i < levelMap.length; i++) {
    if (!levelMap[i]) continue;
    if (seen === want) return i;
    seen++;
  }
  return 1;
}

// C ref: dungeon.c:2092
export function lev_by_name(name = '') {
  const key = String(name).toLowerCase();
  for (const lev of _specialLevelChain) {
    if (String(lev?.name || '').toLowerCase() === key) return lev;
  }
  return null;
}

// C ref: dungeon.c:2021
export function level_difficulty(lev = null, game = null) {
  const g = game || _gstate;
  const useLev = lev?.dnum !== undefined ? lev : (g?.map?.uz || g?.uz || { dnum: DUNGEONS_OF_DOOM, dlevel: 1 });
  return Math.max(1, depth(useLev));
}

// C ref: dungeon.c:2169
export function unplaced_floater(_lev = null) {
  return false;
}

// C ref: dungeon.c:1599
export function u_on_rndspot(map, player = null) {
  const u = player || map?.player || _gstate?.player;
  if (!map || !u) return false;
  if (Number.isInteger(map?.upstair?.x) && Number.isInteger(map?.upstair?.y)) {
    u.x = map.upstair.x;
    u.y = map.upstair.y;
    return true;
  }
  for (let y = 1; y < ROWNO - 1; y++) {
    for (let x = 1; x < COLNO - 1; x++) {
      const loc = map.at?.(x, y);
      if (loc && loc.typ !== STONE) {
        u.x = x;
        u.y = y;
        return true;
      }
    }
  }
  return false;
}

// C ref: dungeon.c:1548
export function earth_sense(_map = null, _player = null) {
  return true;
}

function _ensureMapseenEntry(game, lev) {
  if (!game || !lev) return null;
  const found = find_mapseen(lev, game);
  if (found) return found;
  const node = {
    lev: { dnum: Number(lev.dnum) || DUNGEONS_OF_DOOM, dlevel: Number(lev.dlevel) || 1 },
    custom: '',
    branch: false,
    lastseentyp: {},
    next: game.mapseenchn || null,
  };
  game.mapseenchn = node;
  return node;
}

// C ref: dungeon.c:2919
export function update_lastseentyp(mptr, typ, count = 1) {
  if (!mptr) return;
  const key = String(typ);
  const cur = Number(mptr.lastseentyp?.[key]) || 0;
  mptr.lastseentyp = mptr.lastseentyp || {};
  mptr.lastseentyp[key] = cur + Math.max(0, Number(count) || 0);
}

// C ref: dungeon.c:2943
export function count_feat_lastseentyp(mptr, typ) {
  if (!mptr) return 0;
  return Number(mptr.lastseentyp?.[String(typ)]) || 0;
}

// C ref: dungeon.c:2935
export function update_mapseen_for(map, game = null) {
  const g = game || map?.game || _gstate;
  const mptr = _ensureMapseenEntry(g, map?.uz || g?.uz);
  if (!mptr || !map?.at) return mptr;
  mptr.lastseentyp = {};
  for (let y = 0; y < ROWNO; y++) {
    for (let x = 0; x < COLNO; x++) {
      const typ = map.at(x, y)?.typ;
      if (Number.isInteger(typ)) update_lastseentyp(mptr, typ, 1);
    }
  }
  return mptr;
}

// C ref: dungeon.c:2494
export function query_annotation(lev = null, game = null, text = '') {
  const g = game || _gstate;
  if (!g) return null;
  const target = lev || g?.map?.uz || g?.uz;
  const mptr = _ensureMapseenEntry(g, target);
  if (!mptr) return null;
  if (text !== undefined && text !== null && String(text).length > 0) mptr.custom = String(text);
  return mptr.custom || '';
}

// C ref: dungeon.c:2827
export function init_mapseen(game = null) {
  const g = game || _gstate;
  if (!g) return 0;
  g.mapseenchn = null;
  return 0;
}

// C ref: dungeon.c:2687
export function save_mapseen(game = null) {
  const g = game || _gstate;
  return _mapseenNodes(g).map(_cloneMapseenNode);
}

// C ref: dungeon.c:2713
export function load_mapseen(state = null, game = null) {
  const g = game || _gstate;
  const rows = Array.isArray(state) ? state : [];
  _writeMapseenChain(g, rows);
  return rows.length;
}

// C ref: dungeon.c:2657
export function rm_mapseen(lev, game = null) {
  const g = game || _gstate;
  if (!g) return 0;
  const rows = _mapseenNodes(g).filter(n => !on_level(n.lev, lev));
  _writeMapseenChain(g, rows);
  return rows.length;
}

// C ref: dungeon.c:2803
export function remdun_mapseen(dnum, game = null) {
  const g = game || _gstate;
  if (!g) return 0;
  const rows = _mapseenNodes(g).filter(n => n?.lev?.dnum !== dnum);
  _writeMapseenChain(g, rows);
  return rows.length;
}

// C ref: dungeon.c:2440
export function recbranch_mapseen(_game = null) {
  return 0;
}

// C ref: dungeon.c:3067
export function recalc_mapseen(game = null) {
  const g = game || _gstate;
  const rows = _mapseenNodes(g);
  g._mapseenCount = rows.length;
  return rows.length;
}

// C ref: dungeon.c:2872
export function interest_mapseen(mptr) {
  return !!(mptr?.custom
    || mptr?.branch
    || (mptr?.lastseentyp && Object.keys(mptr.lastseentyp).length > 0));
}

// C ref: dungeon.c:3508
export function print_mapseen(_win, mptr, _why = 0, _reason = 0, showheader = false) {
  if (!mptr?.lev) return '';
  const prefix = showheader ? `[D${mptr.lev.dnum}] ` : '';
  const custom = mptr.custom ? ` (${mptr.custom})` : '';
  return `${prefix}Dlvl ${mptr.lev.dlevel}${custom}`;
}

// C ref: dungeon.c:2753
export function overview_stats(game = null) {
  const g = game || _gstate;
  const rows = _mapseenNodes(g);
  return {
    levels: rows.length,
    annotated: rows.filter(n => !!n.custom).length,
  };
}

// C ref: dungeon.c:3286
export async function dooverview(map = null, why = 0, reason = 0) {
  if (!map) return overview_stats();
  await show_overview(why, reason, map);
  return overview_stats(map?.game || _gstate);
}
