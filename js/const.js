// const.js -- Game constants and configuration
// Mirrors constants from include/hack.h, include/global.h, include/rm.h

import { COMMIT_NUMBER } from './version.js';

// Version (patchlevel.h)
export const VERSION_MAJOR = 3;
export const VERSION_MINOR = 7;
export const PATCHLEVEL = 0;
export const VERSION_STRING = `NetHack ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL} Royal Jelly #${COMMIT_NUMBER} — vibe-coded by The Hive`;

// Map dimensions (global.h)
export const COLNO = 80;   // number of columns
export const ROWNO = 21;   // number of rows (map area)

// Display dimensions
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 24;  // message + map + 2 status lines
export const MESSAGE_ROW = 0;
export const MAP_ROW_START = 1;
export const STATUS_ROW_1 = 22;
export const STATUS_ROW_2 = 23;

// Level location types (rm.h:55-97)
export const STONE = 0;
export const VWALL = 1;
export const HWALL = 2;
export const TLCORNER = 3;
export const TRCORNER = 4;
export const BLCORNER = 5;
export const BRCORNER = 6;
export const CROSSWALL = 7;
export const TUWALL = 8;
export const TDWALL = 9;
export const TLWALL = 10;
export const TRWALL = 11;
export const DBWALL = 12;
export const TREE = 13;
export const SDOOR = 14;
export const SCORR = 15;
export const POOL = 16;
export const MOAT = 17;
export const WATER = 18;
export const DRAWBRIDGE_UP = 19;
export const LAVAPOOL = 20;
export const LAVAWALL = 21;
export const IRONBARS = 22;
export const DOOR = 23;
export const CORR = 24;
export const ROOM = 25;
export const STAIRS = 26;
export const LADDER = 27;
export const FOUNTAIN = 28;
export const THRONE = 29;
export const SINK = 30;
export const GRAVE = 31;
export const ALTAR = 32;
export const ICE = 33;
export const DRAWBRIDGE_DOWN = 34;
export const AIR = 35;
export const CLOUD = 36;
export const MAX_TYPE = 37;

// Door states (rm.h)
export const D_NODOOR = 0;
export const D_BROKEN = 1;
export const D_ISOPEN = 2;
export const D_CLOSED = 4;
export const D_LOCKED = 8;
export const D_TRAPPED = 16;
export const D_SECRET = 32;

// Movement speed (hack.h)
export const NORMAL_SPEED = 12;

// Direction arrays (decl.h, hack.c)
// Index: 0=W, 1=NW, 2=N, 3=NE, 4=E, 5=SE, 6=S, 7=SW, 8=up, 9=down
export const xdir = [-1, -1,  0,  1,  1,  1,  0, -1, 0,  0];
export const ydir = [ 0, -1, -1, -1,  0,  1,  1,  1, 0,  0];
export const zdir = [0, 0, 0, 0, 0, 0, 0, 0, 1, -1];

// Direction constants
export const DIR_W = 0;
export const DIR_NW = 1;
export const DIR_N = 2;
export const DIR_NE = 3;
export const DIR_E = 4;
export const DIR_SE = 5;
export const DIR_S = 6;
export const DIR_SW = 7;
export const DIR_UP = 8;
export const DIR_DOWN = 9;
export const N_DIRS = 8;
export function DIR_180(dir) { return (dir + 4) % N_DIRS; }

// Encumbrance levels (hack.h)
export const UNENCUMBERED = 0;
export const SLT_ENCUMBER = 1;
export const MOD_ENCUMBER = 2;
export const HVY_ENCUMBER = 3;
export const EXT_ENCUMBER = 4;
export const OVERLOADED = 5;

// Alignment (align.h)
export const A_NONE = -128;
export const A_CHAOTIC = -1;
export const A_NEUTRAL = 0;
export const A_LAWFUL = 1;

// Altar mask bits (C ref: align.h:29-37, rm.h:179)
export const AM_NONE = 0x00;
export const AM_CHAOTIC = 0x01;
export const AM_NEUTRAL = 0x02;
export const AM_LAWFUL = 0x04;
export const AM_MASK = 0x07;
export const AM_SHRINE = 0x08;
export const AM_SANCTUM = 0x10;

// C ref: align.h Align2amask / Amask2align
export function Align2amask(x) {
    if (x === A_NONE) return AM_NONE;
    if (x === A_LAWFUL) return AM_LAWFUL;
    return (x + 2) & 0xff; // A_NEUTRAL(0)->2, A_CHAOTIC(-1)->1
}
export function Amask2align(x) {
    const masked = x & AM_MASK;
    if (masked === 0) return A_NONE;
    if (masked === AM_LAWFUL) return A_LAWFUL;
    return masked - 2; // 2->0 (NEUTRAL), 1->-1 (CHAOTIC)
}

// Gender
export const MALE = 0;
export const FEMALE = 1;
export const NEUTER = 2;

// Races
export const RACE_HUMAN = 0;
export const RACE_ELF = 1;
export const RACE_DWARF = 2;
export const RACE_GNOME = 3;
export const RACE_ORC = 4;

// Roles (role.c) - just the basic set for initial implementation
export const PM_ARCHEOLOGIST = 0;
export const PM_BARBARIAN = 1;
export const PM_CAVEMAN = 2;
export const PM_HEALER = 3;
export const PM_KNIGHT = 4;
export const PM_MONK = 5;
export const PM_PRIEST = 6;
export const PM_ROGUE = 7;  // Swapped with Ranger to match roles array order
export const PM_RANGER = 8;
export const PM_SAMURAI = 9;
export const PM_TOURIST = 10;
export const PM_VALKYRIE = 11;
export const PM_WIZARD = 12;

// Monster spell ids (src/mcastu.c: choose_magic_spell/choose_clerical_spell)
export const MGC_PSI_BOLT = 0;
export const MGC_CURE_SELF = 1;
export const MGC_HASTE_SELF = 2;
export const MGC_STUN_YOU = 3;
export const MGC_DISAPPEAR = 4;
export const MGC_WEAKEN_YOU = 5;
export const MGC_DESTRY_ARMR = 6;
export const MGC_CURSE_ITEMS = 7;
export const MGC_AGGRAVATION = 8;
export const MGC_SUMMON_MONS = 9;
export const MGC_CLONE_WIZ = 10;
export const MGC_DEATH_TOUCH = 11;

export const CLC_OPEN_WOUNDS = 0;
export const CLC_CURE_SELF = 1;
export const CLC_CONFUSE_YOU = 2;
export const CLC_PARALYZE = 3;
export const CLC_BLIND_YOU = 4;
export const CLC_INSECTS = 5;
export const CLC_CURSE_ITEMS = 6;
export const CLC_LIGHTNING = 7;
export const CLC_FIRE_PILLAR = 8;
export const CLC_GEYSER = 9;

// Achievements enum (include/you.h, used by src/insight.c)
export const ACH_BELL = 1;
export const ACH_HELL = 2;
export const ACH_CNDL = 3;
export const ACH_BOOK = 4;
export const ACH_INVK = 5;
export const ACH_AMUL = 6;
export const ACH_ENDG = 7;
export const ACH_ASTR = 8;
export const ACH_UWIN = 9;
export const ACH_MINE_PRIZE = 10;
export const ACH_SOKO_PRIZE = 11;
export const ACH_MEDU = 12;
export const ACH_BLND = 13;
export const ACH_NUDE = 14;
export const ACH_MINE = 15;
export const ACH_TOWN = 16;
export const ACH_SHOP = 17;
export const ACH_TMPL = 18;
export const ACH_ORCL = 19;
export const ACH_NOVL = 20;
export const ACH_SOKO = 21;
export const ACH_BGRM = 22;
export const ACH_RNK1 = 23;
export const ACH_RNK2 = 24;
export const ACH_RNK3 = 25;
export const ACH_RNK4 = 26;
export const ACH_RNK5 = 27;
export const ACH_RNK6 = 28;
export const ACH_RNK7 = 29;
export const ACH_RNK8 = 30;
export const ACH_TUNE = 31;
export const N_ACH = 32;

// Attributes (attrib.h)
export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const NUM_ATTRS = 6;

// Room types (mkroom.h)
export const OROOM = 0;
export const THEMEROOM = 1;
export const COURT = 2;
export const SWAMP = 3;
export const VAULT = 4;
export const BEEHIVE = 5;
export const MORGUE = 6;
export const BARRACKS = 7;
export const ZOO = 8;
export const DELPHI = 9;
export const TEMPLE = 10;
export const LEPREHALL = 11;
export const COCKNEST = 12;
export const ANTHOLE = 13;
export const SHOPBASE = 14;

// Window/UI constants (wintype.h, winprocs.h, color.h)
// Runtime fields:
// - windows.WinDesc.type / .how / .mbehavior
// - windows.putstr attr bitmask (ATR_*)
export const NHW_MESSAGE = 1;
export const NHW_STATUS = 2;
export const NHW_MAP = 3;
export const NHW_MENU = 4;
export const NHW_TEXT = 5;
export const NHW_PERMINVENT = 6;
export const PICK_NONE = 0;
export const PICK_ONE = 1;
export const PICK_ANY = 2;
export const MENU_BEHAVE_STANDARD = 0;
export const MENU_BEHAVE_PERMINV = 1;
export const ATR_NONE = 0;
export const ATR_ULINE = 1;
export const ATR_BOLD = 2;
export const ATR_BLINK = 4;
export const ATR_INVERSE = 8;
export const ATR_URGENT = 16;
export const ATR_NOHISTORY = 32;

// Name formatting article selectors and suppression flags (src/do_name.c and include/flag.h)
// Runtime fields:
// - Naming function args/locals in do_name.js (article, suppress)
// - pickup/music callers choosing article/suppress behavior for message text
export const ARTICLE_NONE = 0;
export const ARTICLE_THE = 1;
export const ARTICLE_A = 2;
export const ARTICLE_YOUR = 3;
export const SUPPRESS_IT = 0x01;
export const SUPPRESS_INVISIBLE = 0x02;
export const SUPPRESS_HALLUCINATION = 0x04;
export const SUPPRESS_SADDLE = 0x08;
export const SUPPRESS_MAPPEARANCE = 0x10;
export const SUPPRESS_NAME = 0x20;
export const AUGMENT_IT = 0x40;
export const EXACT_NAME = (SUPPRESS_IT | SUPPRESS_INVISIBLE
    | SUPPRESS_HALLUCINATION | SUPPRESS_NAME);

// Game end type constants (include/hack.h enum game_end_types; src/end.c)
// Runtime fields:
// - end.done(how) / end.really_done(how) `how` values
// - death cause checks for game-over handling
export const DIED = 0;
export const CHOKING = 1;
export const POISONING = 2;
export const STARVING = 3;
export const DROWNING = 4;
export const BURNING = 5;
export const DISSOLVED = 6;
export const CRUSHING = 7;
export const STONING = 8;
export const TURNED_SLIME = 9;
export const GENOCIDED = 10;
export const PANICKED = 11;
export const TRICKED = 12;
export const QUIT = 13;
export const ESCAPED = 14;
export const ASCENDED = 15;

// Killer name prefix selectors (include/hack.h; src/end.c killer.format)
// Runtime fields: end.killer.format and delayed killer records.
export const KILLED_BY_AN = 0;
export const KILLED_BY = 1;
export const NO_KILLER_PREFIX = 2;

// Command queue type IDs and queue selectors (include/hack.h cmdq_cmdtypes/CQ_*)
// Runtime fields:
// - input cmdq node fields: node.typ/node.key/node.dir*/node.intval
// - queue selector passed to cmdq_* helpers (CQ_CANNED/CQ_REPEAT)
export const CMDQ_KEY = 0;
export const CMDQ_EXTCMD = 1;
export const CMDQ_DIR = 2;
export const CMDQ_USER_INPUT = 3;
export const CMDQ_INT = 4;
export const CQ_CANNED = 0;
export const CQ_REPEAT = 1;

// Transient animation style/opcode constants (include/display.h DISP_*; src/display.c tmp_at)
// Runtime fields:
// - animation tmp_at(x, y): x opcode selector, y style/flush mode
// - temporary glyph path logic for beams/flash/tether and cleanup
export const DISP_BEAM = -1;
export const DISP_ALL = -2;
export const DISP_TETHER = -3;
export const DISP_FLASH = -4;
export const DISP_ALWAYS = -5;
export const DISP_CHANGE = -6;
export const DISP_END = -7;
export const DISP_FREEMEM = -8;
export const BACKTRACK = -1;

// Body-part selector enum (include/hack.h enum bodypart_types; src/polyself.c)
// Runtime fields:
// - body_part(partId) and mbodypart(mon, partId) selector args
// - message formatting for anatomy-dependent text
export const ARM = 0;
export const EYE = 1;
export const FACE = 2;
export const FINGER = 3;
export const FINGERTIP = 4;
export const FOOT = 5;
export const HAND = 6;
export const HANDED = 7;
export const HEAD = 8;
export const LEG = 9;
export const LIGHT_HEADED = 10;
export const NECK = 11;
export const SPINE = 12;
export const TOE = 13;
export const HAIR = 14;
export const BLOOD = 15;
export const LUNG = 16;
export const NOSE = 17;
export const STOMACH = 18;

// Object class selector for random-class generation (include/objclass.h)
// Runtime fields:
// - mkobj/mksobj/random object generation `oclass` selector args
export const RANDOM_CLASS = 0;

// Room fill policy enum for mkroom/mklev generation (src/mkroom.c)
// Runtime fields: room.needfill on room structs.
export const FILL_NONE = 0;
export const FILL_NORMAL = 1;

// Padded text chunk width for makedefs-generated rumor-like files.
// Runtime fields: get_rnd_line_index(..., chunksize) for rumors/epitaph/engraving pools.
export const RUMOR_PAD_LENGTH = 60;

// Pet migration mode string token (src/dog.c mon_arrive)
// Runtime field: migrating monster `mon_arrive(..., with_you, ...)` argument.
export const MON_ARRIVE_WITH_YOU = 'With_you';

// Input direction maps for command parsing/running (src/cmd.c/hack.c key semantics)
// Runtime fields:
// - command handlers: direction dispatch and movement vectors
// - travel/run logic in cmd/hack/lock/kick/dokick
export const DIRECTION_KEYS = {
    h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0],
    y: [-1, -1], u: [1, -1], b: [-1, 1], n: [1, 1],
    '.': [0, 0],
};
export const RUN_KEYS = {
    H: [-1, 0], J: [0, 1], K: [0, -1], L: [1, 0],
    Y: [-1, -1], U: [1, -1], B: [-1, 1], N: [1, 1],
};

// Movement/travel mode enums (src/hack.c domove()/test_move()/findtravelpath())
// Runtime fields:
// - `test_move(..., mode)` behavior selector
// - `findtravelpath(mode)` travel-path mode selector
export const DO_MOVE = 0;
export const TEST_MOVE = 1;
export const TEST_TRAV = 2;
export const TEST_TRAP = 3;
export const TRAVP_TRAVEL = 0;
export const TRAVP_GUESS = 1;
export const TRAVP_VALID = 2;

// Shared monster/pathing distance constants (include/monst.h, include/hack.h, src/dogmove.c)
// Runtime fields:
// - monster mtrack ring size and object-search radius in dog/monmove logic
// - threat range / spell range checks and "far away" distance sentinels
export const MTSZ = 4;
export const SQSRCHRADIUS = 5;
export const FARAWAY = 127;
export const BOLT_LIM = 8;

// Dungeon branch indices (include/dungeon.h / src/dungeon.c)
// Runtime fields:
// - level coordinates: `lev.dnum` / `_genDnum`
// - special-level registry keys and branch-selection predicates
export const DUNGEONS_OF_DOOM = 0;
export const GNOMISH_MINES = 1;
export const SOKOBAN = 2;
export const QUEST = 3;
export const KNOX = 4;
export const GEHENNOM = 5;
export const VLADS_TOWER = 6;
export const TUTORIAL = 8;

// Role/race selection sentinels and chooser policy (src/role.c)
// Runtime fields:
// - flags.initrole/initrace/initgend/initalign unresolved-state sentinels
// - rigid/random chooser mode for role-picking helpers
export const ROLE_NONE = -1;
export const ROLE_RANDOM = -2;
export const PICK_RANDOM = 0;
export const PICK_RIGID = 1;

// Digging target classification and digcheck return codes (src/dig.c)
// Runtime fields:
// - dig target classification from dig_typ()
// - dig viability/error code from dig_check()
export const DIGTYP_UNDIGGABLE = 0;
export const DIGTYP_ROCK = 1;
export const DIGTYP_STATUE = 2;
export const DIGTYP_BOULDER = 3;
export const DIGTYP_DOOR = 4;
export const DIGTYP_TREE = 5;
export const DIGCHECK_PASSED = 0;
export const DIGCHECK_PASSED_PITONLY = 1;
export const DIGCHECK_PASSED_DESTROY_TRAP = 2;
export const DIGCHECK_FAILED = 10;
export const DIGCHECK_FAIL_ONLADDER = 11;
export const DIGCHECK_FAIL_ONSTAIRS = 12;
export const DIGCHECK_FAIL_THRONE = 13;
export const DIGCHECK_FAIL_ALTAR = 14;
export const DIGCHECK_FAIL_AIRLEVEL = 15;
export const DIGCHECK_FAIL_WATERLEVEL = 16;
export const DIGCHECK_FAIL_TOOHARD = 17;
export const DIGCHECK_FAIL_UNDESTROYABLETRAP = 18;
export const DIGCHECK_FAIL_CANTDIG = 19;
export const DIGCHECK_FAIL_BOULDER = 20;
export const DIGCHECK_FAIL_OBJ_POOL_OR_TRAP = 21;

// Explosion type/source/flag constants (src/explode.c)
// Runtime fields:
// - explode(..., expltype/olet) rendering and source class
// - scatter/explosion hit+destroy flag masks
export const EXPL_DARK = 0;
export const EXPL_NOXIOUS = 1;
export const EXPL_MUDDY = 2;
export const EXPL_WET = 3;
export const EXPL_MAGICAL = 4;
export const EXPL_FIERY = 5;
export const EXPL_FROSTY = 6;
export const EXPL_MAX = 7;
export const MON_EXPLODE = -1;
export const BURNING_OIL = -2;
export const TRAP_EXPLODE = -3;
export const MAY_HITMON = 0x1;
export const MAY_HITYOU = 0x2;
export const MAY_HIT = (0x1 | 0x2);
export const MAY_DESTROY = 0x4;
export const MAY_FRACTURE = 0x8;

// Steed dismount reason enum (src/steed.c)
// Runtime fields: dismount_steed(reason) reason selector.
export const DISMOUNT_BYCHOICE = 0;
export const DISMOUNT_THROWN = 1;
export const DISMOUNT_KNOCKED = 2;
export const DISMOUNT_FELL = 3;
export const DISMOUNT_POLY = 4;
export const DISMOUNT_ENGULFED = 5;
export const DISMOUNT_BONES = 6;
export const DISMOUNT_GENERIC = 7;

// Vault guard constants (src/vault.c)
// Runtime fields: guard timers and guard activity/witness bits.
export const VAULT_GUARD_TIME = 30;
export const GD_EATGOLD = 0x01;
export const GD_DESTROYGOLD = 0x02;

// Attribute constitution-gain reason enum (src/attrib.c)
// Runtime fields: adjcon(reason) reason selector.
export const A_CG_CONVERT = 0;
export const A_CG_HELM_ON = 1;
export const A_CG_HELM_OFF = 2;

// Punishment control bits and rectangle split limits (src/ball.c, src/rect.c)
// Runtime fields:
// - drag_ball control mask in punishment movement
// - map rectangle generation limits in room splitting
export const BC_BALL = 0x01;
export const BC_CHAIN = 0x02;
export const XLIM = 4;
export const YLIM = 3;

// Bless/curse/unknown categories and getobj prompt policy flags (src/invent.c)
// Runtime fields:
// - inventory BUC classification and filters
// - getobj callback return categories and option flags
export const BUC_BLESSED = 1;
export const BUC_UNCURSED = 2;
export const BUC_CURSED = 3;
export const BUC_UNKNOWN = 4;
export const GETOBJ_EXCLUDE = 0;
export const GETOBJ_SUGGEST = 1;
export const GETOBJ_DOWNPLAY = 2;
export const GETOBJ_EXCLUDE_INACCESS = 3;
export const GETOBJ_EXCLUDE_SELECTABLE = 4;
export const GETOBJ_EXCLUDE_NONINVENT = 5;
export const GETOBJ_ALLOWCNT = 0x01;
export const GETOBJ_PROMPT = 0x02;
export const GETOBJ_NOFLAGS = 0;

// Extra-level room graph bitmasks (src/extralev.c)
// Runtime fields: 3x3 room doortable directional connectivity bits.
export const XL_UP = 1;
export const XL_DOWN = 2;
export const XL_LEFT = 4;
export const XL_RIGHT = 8;

// Light-source type tags (src/light.c)
// Runtime fields: light_base[] entry type and routing for object/monster lookups.
export const LS_OBJECT = 0;
export const LS_MONSTER = 1;

// Timeout timer-kind and timer-function enums (src/timeout.c)
// Runtime fields: timer queue kind/func selectors and timer dispatch.
export const TIMER_KIND = Object.freeze({
    SHORT: 0,
    LONG: 1,
    SPECIAL: 2,
});
export const TIMER_FUNC = Object.freeze({
    BURN_OBJECT: 'BURN_OBJECT',
    HATCH_EGG: 'HATCH_EGG',
    FIGURINE_TRANSFORM: 'FIGURINE_TRANSFORM',
    FALL_ASLEEP: 'FALL_ASLEEP',
    DO_STORMS: 'DO_STORMS',
    REVIVE_MON: 'REVIVE_MON',
    ZOMBIFY_MON: 'ZOMBIFY_MON',
    ROT_CORPSE: 'ROT_CORPSE',
    MELT_ICE_AWAY: 'MELT_ICE_AWAY',
});
export const MELT_ICE_AWAY = TIMER_FUNC.MELT_ICE_AWAY;

// Maximum values
export const MAXNROFROOMS = 40;
export const MAXDUNGEON = 16;
export const MAXLEVEL = 32;
export const MAXOCLASSES = 18;
export const MAXMCLASSES = 34;
export const ROOMOFFSET = 3;

// Check if position is within map bounds
// C ref: cmd.c isok() — x >= 1 && x <= COLNO-1 && y >= 0 && y <= ROWNO-1
export function isok(x, y) {
    return x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1;
}

// Check terrain type helpers (rm.h)
export function IS_WALL(typ) {
    // C ref: rm.h — IS_WALL(typ) ((typ) && (typ) <= DBWALL)
    return typ >= VWALL && typ <= DBWALL;
}
export function IS_STWALL(typ) {
    return typ <= DBWALL; // includes STONE and all wall types
}
export function IS_ROCK(typ) {
    return typ < POOL;
}
export function IS_DOOR(typ) {
    return typ === DOOR;
}
export function IS_ROOM(typ) {
    // C ref: rm.h -- #define IS_ROOM(typ) ((typ) >= ROOM)
    return typ >= ROOM;
}
export function IS_FURNITURE(typ) {
    return typ >= STAIRS && typ <= ALTAR;
}
export function ACCESSIBLE(typ) {
    // C ref: rm.h -- #define ACCESSIBLE(typ) ((typ) >= DOOR)
    return typ >= DOOR;
}
export function IS_POOL(typ) {
    // C ref: rm.h — IS_POOL(typ) ((typ) >= POOL && (typ) <= DRAWBRIDGE_UP)
    return typ >= POOL && typ <= DRAWBRIDGE_UP;
}
export function IS_LAVA(typ) {
    // C ref: rm.h — IS_LAVA(typ) ((typ) == LAVAPOOL || (typ) == LAVAWALL)
    return typ === LAVAPOOL || typ === LAVAWALL;
}
export function IS_OBSTRUCTED(typ) {
    // C ref: rm.h — IS_OBSTRUCTED(typ) ((typ) < POOL)
    return typ < POOL;
}
export function IS_DRAWBRIDGE(typ) {
    // C ref: rm.h — IS_DRAWBRIDGE(typ) ((typ) == DRAWBRIDGE_UP || (typ) == DRAWBRIDGE_DOWN)
    return typ === DRAWBRIDGE_UP || typ === DRAWBRIDGE_DOWN;
}
export function IS_WATERWALL(typ) {
    // C ref: rm.h — IS_WATERWALL(typ) ((typ) == WATER)
    return typ === WATER;
}

// Drawbridge mask bits (rm.h:269-282)
export const DB_NORTH = 0;
export const DB_SOUTH = 1;
export const DB_EAST = 2;
export const DB_WEST = 3;
export const DB_DIR = 3;    // mask for direction
export const DB_MOAT = 0;
export const DB_LAVA = 4;
export const DB_ICE = 8;
export const DB_FLOOR = 16;
export const DB_UNDER = 28; // mask for underneath

// Monster movement flags used by mfndpos()/mon_allowflags()
// C ref: src/mon.c (movement legality bitmask flags consumed by mfndpos)
export const ALLOW_MDISP  = 0x00001000;
export const ALLOW_TRAPS  = 0x00020000;
export const ALLOW_U      = 0x00040000;
export const ALLOW_M      = 0x00080000;
export const ALLOW_TM     = 0x00100000;
export const ALLOW_ALL    = ALLOW_U | ALLOW_M | ALLOW_TM | ALLOW_TRAPS;
export const NOTONL       = 0x00200000;
export const OPENDOOR     = 0x00400000;
export const UNLOCKDOOR   = 0x00800000;
export const BUSTDOOR     = 0x01000000;
export const ALLOW_ROCK   = 0x02000000;
export const ALLOW_WALL   = 0x04000000;
export const ALLOW_DIG    = 0x08000000;
export const ALLOW_BARS   = 0x10000000;
export const ALLOW_SANCT  = 0x20000000;
export const ALLOW_SSM    = 0x40000000;
export const NOGARLIC     = 0x80000000 | 0; // force signed 32-bit

// Monster attack result bitmask flags (src/uhitm.c and src/mhitm.c)
export const M_ATTK_MISS = 0x0;
export const M_ATTK_HIT = 0x1;
export const M_ATTK_DEF_DIED = 0x2;
export const M_ATTK_AGR_DIED = 0x4;
export const M_ATTK_AGR_DONE = 0x8;

// Monster creation flags (include/hack.h; consumed by src/makemon.c)
// Runtime fields:
// - makemon(..., mmflags) argument
// - monster instance init flow (inventory/group/sleep/name behavior)
export const NO_MM_FLAGS = 0;
export const NO_MINVENT = 0x00000001;
export const MM_NOWAIT = 0x00000002;
export const MM_NOCOUNTBIRTH = 0x00000004;
export const MM_IGNOREWATER = 0x00000008;
export const MM_ADJACENTOK = 0x00000010;
export const MM_NONAME = 0x00000040;
export const MM_EDOG = 0x00000800;
export const MM_ASLEEP = 0x00001000;
export const MM_NOGRP = 0x00002000;
export const MM_MALE = 0x00008000;
export const MM_FEMALE = 0x00010000;
export const MM_NOMSG = 0x00020000;
export const MM_NOEXCLAM = 0x00040000;
export const MM_IGNORELAVA = 0x00080000;

// Teleport target search flags (include/hack.h; src/teleport.c goodpos/enexto)
// Runtime fields: teleport goodpos/enexto entflags/gpflags args
export const GP_CHECKSCARY = 0x00000100;
export const GP_ALLOW_U = 0x00000200;
export const GP_AVOID_MONPOS = 0x00000400;
export const GP_ALLOW_XY = 0x00000800;

// Monster relocation flags (include/hack.h; src/teleport.c rloc/rloc_to)
// Runtime fields: rloc/rloc_to rlocflags args
export const RLOC_NONE = 0x0000;
export const RLOC_NOMSG = 0x0001;
export const RLOC_MSG = 0x0002;
export const RLOC_TELE = 0x0004;
export const RLOC_ERR = 0x0100;

// Hero teleport placement flags (include/hack.h; src/teleport.c teleds)
// Runtime fields: teleds/safe_teleds flags args
export const TELEDS_NO_FLAGS = 0;
export const TELEDS_ALLOW_DRAG = 1;
export const TELEDS_TELEPORT = 2;

// Dogfood classification enum (include/mextra.h dogfood_types; used by src/dog.c/dogmove.c)
export const DOGFOOD = 0;
export const CADAVER = 1;
export const ACCFOOD = 2;
export const MANFOOD = 3;
export const APPORT = 4;
export const POISON = 5;
export const UNDEF = 6;
export const TABU = 7;

// Hero-kill/xkilled flag bits (include/hack.h; used by src/mon.c xkilled())
export const XKILL_GIVEMSG = 0x0;
export const XKILL_NOMSG = 0x1;
export const XKILL_NOCORPSE = 0x2;
export const XKILL_NOCONDUCT = 0x4;

// Poison gas tolerance enum (src/mon.c m_poisongas_ok())
export const M_POISONGAS_OK = 2;
export const M_POISONGAS_MINOR = 1;
export const M_POISONGAS_BAD = 0;

// C ref: include/global.h MAXMONNO
export const MAXMONNO = 120;

// Wornmask bit flags (include/prop.h and include/youprop.h)
// Runtime fields:
// - object.owornmask
// - player equipment slots (weapon/armor/rings/amulet/quiver/etc.)
// - monster.misc_worn_check
export const W_ARM = 0x00000001;
export const W_ARMC = 0x00000002;
export const W_ARMH = 0x00000004;
export const W_ARMS = 0x00000008;
export const W_ARMG = 0x00000010;
export const W_ARMF = 0x00000020;
export const W_ARMU = 0x00000040;
export const W_ARMOR = W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF | W_ARMU;
export const W_WEP = 0x00000100;
export const W_QUIVER = 0x00000200;
export const W_SWAPWEP = 0x00000400;
export const W_WEAPONS = W_WEP | W_SWAPWEP | W_QUIVER;
export const W_AMUL = 0x00010000;
export const W_RINGL = 0x00020000;
export const W_RINGR = 0x00040000;
export const W_RING = W_RINGL | W_RINGR;
export const W_TOOL = 0x00080000;
export const W_ACCESSORY = W_RING | W_AMUL | W_TOOL;
export const W_SADDLE = 0x00100000;
export const W_BALL = 0x00200000;
export const W_CHAIN = 0x00400000;

// Hero trap state enum (include/you.h enum utraptype)
// Runtime field: player.utraptype
export const TT_NONE = 0;
export const TT_BEARTRAP = 1;
export const TT_PIT = 2;
export const TT_WEB = 3;
export const TT_LAVA = 4;
export const TT_INFLOOR = 5;
export const TT_BURIEDBALL = 6;

// Trap trigger flags (include/hack.h; src/trap.c trigger_trap())
// Runtime field: trigger_trap(...) tflags argument
export const FORCETRAP = 0x01;
export const NOWEBMSG = 0x02;
export const FORCEBUNGLE = 0x04;
export const RECURSIVETRAP = 0x08;
export const TOOKPLUNGE = 0x10;
export const VIASITTING = 0x20;
export const FAILEDUNTRAP = 0x40;

// Item erosion kinds/results/flags (src/trap.c erode_obj*)
// Runtime fields:
// - erode_obj / erode_obj_player type/result/ef_flags arguments
// - object erosion counters (oeroded/oeroded2) driven by these enums
export const ERODE_BURN = 0;
export const ERODE_RUST = 1;
export const ERODE_ROT = 2;
export const ERODE_CORRODE = 3;
export const ERODE_CRACK = 4;
export const ER_NOTHING = 0;
export const ER_GREASED = 1;
export const ER_DAMAGED = 2;
export const ER_DESTROYED = 3;
export const EF_NONE = 0;
export const EF_GREASE = 0x01;
export const EF_DESTROY = 0x02;
export const EF_VERBOSE = 0x04;
export const EF_PAY = 0x08;

// Trap types (trap.h)
export const ALL_TRAPS = -1;
export const NO_TRAP = 0;
export const ARROW_TRAP = 1;
export const DART_TRAP = 2;
export const ROCKTRAP = 3;
export const SQKY_BOARD = 4;
export const BEAR_TRAP = 5;
export const LANDMINE = 6;
export const ROLLING_BOULDER_TRAP = 7;
export const SLP_GAS_TRAP = 8;
export const RUST_TRAP = 9;
export const FIRE_TRAP = 10;
export const PIT = 11;
export const SPIKED_PIT = 12;
export const HOLE = 13;
export const TRAPDOOR = 14;
export const TELEP_TRAP = 15;
export const LEVEL_TELEP = 16;
export const MAGIC_PORTAL = 17;
export const WEB = 18;
export const STATUE_TRAP = 19;
export const MAGIC_TRAP = 20;
export const ANTI_MAGIC = 21;
export const POLY_TRAP = 22;
export const VIBRATING_SQUARE = 23;
export const TRAPPED_DOOR = 24;
export const TRAPPED_CHEST = 25;
export const TRAPNUM = 26;

// Trap helpers (trap.h)
export function is_pit(ttyp) { return ttyp === PIT || ttyp === SPIKED_PIT; }
export function is_hole(ttyp) { return ttyp === HOLE || ttyp === TRAPDOOR; }

// Trap flags for mktrap
export const MKTRAP_NOFLAGS = 0;
export const MKTRAP_SEEN = 0x01;
export const MKTRAP_MAZEFLAG = 0x02;
export const MKTRAP_NOSPIDERONWEB = 0x04;
export const MKTRAP_NOVICTIM = 0x08;

// Intrinsic property indices (prop.h)
// C ref: include/prop.h — enum for you.uprops[] indices
export const FIRE_RES = 0;
export const COLD_RES = 1;
export const SLEEP_RES = 2;
export const DISINT_RES = 3;
export const SHOCK_RES = 4;
export const POISON_RES = 5;
export const ACID_RES = 6;
export const STONE_RES = 7;
export const DRAIN_RES = 8;
export const SICK_RES = 9;
export const INVULNERABLE = 10;
export const ANTIMAGIC = 11;
export const PROP_INDEX_START_ABILITIES = 12; // marker
export const STUNNED = 12;
export const CONFUSION = 13;
export const BLINDED = 14;
export const DEAF = 15;
export const SICK = 16;
export const STONED = 17;
export const STRANGLED = 18;
export const VOMITING = 19;
export const GLIB = 20;
export const SLIMED = 21;
export const HALLUC = 22;
export const HALLUC_RES = 23;
export const FUMBLING = 24;
export const WOUNDED_LEGS = 25;
export const SLEEPING = 26;
export const HUNGER = 27;
export const FAST = 28;
export const WARN_OF_MON = 29;
export const WARNING = 30;
export const SEARCHING = 31;
export const SEE_INVIS = 32;
export const INVIS = 33;
export const TELEPORT = 34;
export const TELEPORT_CONTROL = 35;
export const POLYMORPH = 36;
export const POLYMORPH_CONTROL = 37;
export const LEVITATION = 38;
export const STEALTH = 39;
export const AGGRAVATE_MONSTER = 40;
export const CONFLICT = 41;
export const PROTECTION = 42;
export const PROT_FROM_SHAPE_CHANGERS = 43;
export const DETECT_MONSTERS = 44;
export const ENERGY_REGENERATION = 45;
export const HALF_SPDAM = 46;
export const HALF_PHDAM = 47;
export const REGENERATION = 48;
export const TELEPAT = 49;
export const INFRAVISION = 50;
export const CLAIRVOYANT = 51;
export const FLYING = 52;
export const WATERPROOF = 53;
export const SWIMMING = 54;
export const FREE_ACTION = 55;
export const FIXED_ABIL = 56;
export const LIFESAVED = 57;
export const DISPLACED = 58;
export const UNCHANGING = 59;
export const REFLECTING = 60;
export const MAGICAL_BREATHING = 61;
export const PASSES_WALLS = 62;
export const SLOW_DIGESTION = 63;
export const LAST_PROP = 63;

// Intrinsic bitmask constants (prop.h)
// C ref: include/prop.h — bitmask for intrinsic field
export const TIMEOUT = 0x00FFFFFF;     // timeout portion of intrinsic
export const FROM_ROLE = 0x01000000;   // from role
export const FROM_RACE = 0x02000000;   // from race
export const FROM_FORM = 0x04000000;   // from polymorph form
export const FROMOUTSIDE = 0x08000000; // from outside source (corpse, potion)
export const INTRINSIC = 0x10000000;   // generic intrinsic bit
export const I_SPECIAL = 0x20000000;   // property-specific flag

// Sickness types (C ref: you.h usick_type)
export const SICK_VOMITABLE = 0x01;    // food poisoning
export const SICK_NONVOMITABLE = 0x02; // illness (from corpse, etc.)


// --------------------------------------------------------------------------
// Merged from former symbol definitions module
// --------------------------------------------------------------------------


/**
 * const.js - NetHack 3.7 symbol and color definitions
 *
 * Ported from the following C source files:
 *   - include/color.h      (color constants)
 *   - include/defsym.h     (PCHAR, MONSYMS, OBJCLASS definitions)
 *   - include/sym.h        (symbol enums, warning symbols)
 *   - include/rm.h         (level location types)
 *   - include/trap.h       (trap type constants)
 *   - src/drawing.c        (drawing arrays, warning symbols)
 */

// ==========================================================================
// 1. Color Constants (from include/color.h, lines 14-30)
// ==========================================================================

export const CLR_BLACK          = 0;
export const CLR_RED            = 1;
export const CLR_GREEN          = 2;
export const CLR_BROWN          = 3;   // on IBM, low-intensity yellow is brown
export const CLR_BLUE           = 4;
export const CLR_MAGENTA        = 5;
export const CLR_CYAN           = 6;
export const CLR_GRAY           = 7;   // low-intensity white
export const NO_COLOR           = 8;
export const CLR_ORANGE         = 9;
export const CLR_BRIGHT_GREEN   = 10;
export const CLR_YELLOW         = 11;
export const CLR_BRIGHT_BLUE    = 12;
export const CLR_BRIGHT_MAGENTA = 13;
export const CLR_BRIGHT_CYAN    = 14;
export const CLR_WHITE          = 15;
export const CLR_MAX            = 16;

export const BRIGHT             = 8;   // half-way point for tty color systems

// Color aliases (from include/color.h, lines 37-55)
export const HI_DOMESTIC        = CLR_WHITE;          // for player + pets
export const HI_LORD            = CLR_MAGENTA;        // for high-end monsters
export const HI_OVERLORD        = CLR_BRIGHT_MAGENTA; // for few uniques

export const HI_OBJ             = CLR_MAGENTA;
export const HI_METAL           = CLR_CYAN;
export const HI_COPPER          = CLR_YELLOW;
export const HI_SILVER          = CLR_GRAY;
export const HI_GOLD            = CLR_YELLOW;
export const HI_LEATHER         = CLR_BROWN;
export const HI_CLOTH           = CLR_BROWN;
export const HI_ORGANIC         = CLR_BROWN;
export const HI_WOOD            = CLR_BROWN;
export const HI_PAPER           = CLR_WHITE;
export const HI_GLASS           = CLR_BRIGHT_CYAN;
export const HI_MINERAL         = CLR_GRAY;
export const DRAGON_SILVER      = CLR_BRIGHT_CYAN;
export const HI_ZAP             = CLR_BRIGHT_BLUE;

// ==========================================================================
// 2. PCHAR Symbol Enum Constants (S_*) (from include/defsym.h, lines 90-247)
//    Matches enum cmap_symbols in include/sym.h
// ==========================================================================

// Dungeon features: walls, stone
export const S_stone            = 0;
export const S_vwall            = 1;
export const S_hwall            = 2;
export const S_tlcorn           = 3;
export const S_trcorn           = 4;
export const S_blcorn           = 5;
export const S_brcorn           = 6;
export const S_crwall           = 7;
export const S_tuwall           = 8;
export const S_tdwall           = 9;
export const S_tlwall           = 10;
export const S_trwall           = 11;

// Doors, bars, trees, rooms, corridors (cmap A)
export const S_ndoor            = 12;
export const S_vodoor           = 13;
export const S_hodoor           = 14;
export const S_vcdoor           = 15;
export const S_hcdoor           = 16;
export const S_bars             = 17;
export const S_tree             = 18;
export const S_room             = 19;
export const S_darkroom         = 20;
export const S_engroom          = 21;
export const S_corr             = 22;
export const S_litcorr          = 23;
export const S_engrcorr         = 24;

// Stairs and ladders
export const S_upstair          = 25;
export const S_dnstair          = 26;
export const S_upladder         = 27;
export const S_dnladder         = 28;
export const S_brupstair        = 29;
export const S_brdnstair        = 30;
export const S_brupladder       = 31;
export const S_brdnladder       = 32;

// Altar
export const S_altar            = 33;

// Furniture (cmap B)
export const S_grave            = 34;
export const S_throne           = 35;
export const S_sink             = 36;
export const S_fountain         = 37;

// Water, lava, ice, drawbridges, air, cloud
export const S_pool             = 38;
export const S_ice              = 39;
export const S_lava             = 40;
export const S_lavawall         = 41;
export const S_vodbridge        = 42;
export const S_hodbridge        = 43;
export const S_vcdbridge        = 44;
export const S_hcdbridge        = 45;
export const S_air              = 46;
export const S_cloud            = 47;
export const S_water            = 48;

// Traps (defsym.h lines 157-183)
export const S_arrow_trap       = 49;
export const S_dart_trap        = 50;
export const S_falling_rock_trap = 51;
export const S_squeaky_board    = 52;
export const S_bear_trap        = 53;
export const S_land_mine        = 54;
export const S_rolling_boulder_trap = 55;
export const S_sleeping_gas_trap = 56;
export const S_rust_trap        = 57;
export const S_fire_trap        = 58;
export const S_pit              = 59;
export const S_spiked_pit       = 60;
export const S_hole             = 61;
export const S_trap_door        = 62;
export const S_teleportation_trap = 63;
export const S_level_teleporter = 64;
export const S_magic_portal     = 65;
export const S_web              = 66;
export const S_statue_trap      = 67;
export const S_magic_trap       = 68;
export const S_anti_magic_trap  = 69;
export const S_polymorph_trap   = 70;
export const S_vibrating_square = 71;
export const S_trapped_door     = 72;
export const S_trapped_chest    = 73;

// Special effects: beams (defsym.h lines 190-197)
export const S_vbeam            = 74;
export const S_hbeam            = 75;
export const S_lslant           = 76;
export const S_rslant           = 77;

// Special effects: other (cmap C, defsym.h lines 194-207)
export const S_digbeam          = 78;
export const S_flashbeam        = 79;
export const S_boomleft         = 80;
export const S_boomright        = 81;

// Magic shield symbols
export const S_ss1              = 82;
export const S_ss2              = 83;
export const S_ss3              = 84;
export const S_ss4              = 85;

export const S_poisoncloud      = 86;
export const S_goodpos          = 87;

// Swallow symbols (defsym.h lines 221-228)
export const S_sw_tl            = 88;
export const S_sw_tc            = 89;
export const S_sw_tr            = 90;
export const S_sw_ml            = 91;
export const S_sw_mr            = 92;
export const S_sw_bl            = 93;
export const S_sw_bc            = 94;
export const S_sw_br            = 95;

// Explosion symbols (defsym.h lines 239-247)
export const S_expl_tl          = 96;
export const S_expl_tc          = 97;
export const S_expl_tr          = 98;
export const S_expl_ml          = 99;
export const S_expl_mc          = 100;
export const S_expl_mr          = 101;
export const S_expl_bl          = 102;
export const S_expl_bc          = 103;
export const S_expl_br          = 104;

export const MAXPCHARS          = 105;

// ==========================================================================
// 2b. defsyms[] array (from defsym.h PCHAR_DRAWING expansion + drawing.c)
//     Each entry: { ch, desc (explanation), color }
//     PCHAR(idx, ch, sym, desc, clr)  => { ch, desc, clr }
//     PCHAR2(idx, ch, sym, tilenm, desc, clr) => { ch, desc, clr }
// ==========================================================================

export const defsyms = [
    // idx  0: S_stone
    { ch: ' ',  desc: "dark part of a room",           color: NO_COLOR },
    // idx  1: S_vwall
    { ch: '|',  desc: "vertical wall",                 color: CLR_GRAY },
    // idx  2: S_hwall
    { ch: '-',  desc: "horizontal wall",               color: CLR_GRAY },
    // idx  3: S_tlcorn
    { ch: '-',  desc: "top left corner wall",          color: CLR_GRAY },
    // idx  4: S_trcorn
    { ch: '-',  desc: "top right corner wall",         color: CLR_GRAY },
    // idx  5: S_blcorn
    { ch: '-',  desc: "bottom left corner wall",       color: CLR_GRAY },
    // idx  6: S_brcorn
    { ch: '-',  desc: "bottom right corner wall",      color: CLR_GRAY },
    // idx  7: S_crwall
    { ch: '-',  desc: "cross wall",                    color: CLR_GRAY },
    // idx  8: S_tuwall
    { ch: '-',  desc: "tuwall",                        color: CLR_GRAY },
    // idx  9: S_tdwall
    { ch: '-',  desc: "tdwall",                        color: CLR_GRAY },
    // idx 10: S_tlwall
    { ch: '|',  desc: "tlwall",                        color: CLR_GRAY },
    // idx 11: S_trwall
    { ch: '|',  desc: "trwall",                        color: CLR_GRAY },
    // --- start cmap A ---
    // idx 12: S_ndoor
    { ch: '.',  desc: "no door",                       color: CLR_GRAY },
    // idx 13: S_vodoor
    { ch: '-',  desc: "vertical open door",            color: CLR_BROWN },
    // idx 14: S_hodoor
    { ch: '|',  desc: "horizontal open door",          color: CLR_BROWN },
    // idx 15: S_vcdoor
    { ch: '+',  desc: "vertical closed door",          color: CLR_BROWN },
    // idx 16: S_hcdoor
    { ch: '+',  desc: "horizontal closed door",        color: CLR_BROWN },
    // idx 17: S_bars
    { ch: '#',  desc: "iron bars",                     color: HI_METAL },
    // idx 18: S_tree
    { ch: '#',  desc: "tree",                          color: CLR_GREEN },
    // idx 19: S_room
    { ch: '.',  desc: "floor of a room",               color: CLR_GRAY },
    // idx 20: S_darkroom
    { ch: '.',  desc: "dark part of a room",           color: CLR_BLACK },
    // idx 21: S_engroom
    { ch: '`',  desc: "engraving in a room",           color: CLR_BRIGHT_BLUE },
    // idx 22: S_corr
    { ch: '#',  desc: "dark corridor",                 color: CLR_GRAY },
    // idx 23: S_litcorr
    { ch: '#',  desc: "lit corridor",                  color: CLR_GRAY },
    // idx 24: S_engrcorr
    { ch: '#',  desc: "engraving in a corridor",       color: CLR_BRIGHT_BLUE },
    // idx 25: S_upstair
    { ch: '<',  desc: "up stairs",                     color: CLR_GRAY },
    // idx 26: S_dnstair
    { ch: '>',  desc: "down stairs",                   color: CLR_GRAY },
    // idx 27: S_upladder
    { ch: '<',  desc: "up ladder",                     color: CLR_BROWN },
    // idx 28: S_dnladder
    { ch: '>',  desc: "down ladder",                   color: CLR_BROWN },
    // idx 29: S_brupstair
    { ch: '<',  desc: "branch staircase up",           color: CLR_YELLOW },
    // idx 30: S_brdnstair
    { ch: '>',  desc: "branch staircase down",         color: CLR_YELLOW },
    // idx 31: S_brupladder
    { ch: '<',  desc: "branch ladder up",              color: CLR_YELLOW },
    // idx 32: S_brdnladder
    { ch: '>',  desc: "branch ladder down",            color: CLR_YELLOW },
    // --- end cmap A ---
    // idx 33: S_altar
    { ch: '_',  desc: "altar",                         color: CLR_GRAY },
    // --- start cmap B ---
    // idx 34: S_grave
    { ch: '|',  desc: "grave",                         color: CLR_WHITE },
    // idx 35: S_throne
    { ch: '\\', desc: "throne",                        color: HI_GOLD },
    // idx 36: S_sink
    { ch: '{',  desc: "sink",                          color: CLR_WHITE },
    // idx 37: S_fountain
    { ch: '{',  desc: "fountain",                      color: CLR_BRIGHT_BLUE },
    // idx 38: S_pool (used for both POOL terrain and MOAT terrain)
    { ch: '}',  desc: "pool",                          color: CLR_BLUE },
    // idx 39: S_ice
    { ch: '.',  desc: "ice",                           color: CLR_CYAN },
    // idx 40: S_lava
    { ch: '}',  desc: "molten lava",                   color: CLR_RED },
    // idx 41: S_lavawall
    { ch: '}',  desc: "wall of lava",                  color: CLR_ORANGE },
    // idx 42: S_vodbridge
    { ch: '.',  desc: "vertical open drawbridge",      color: CLR_BROWN },
    // idx 43: S_hodbridge
    { ch: '.',  desc: "horizontal open drawbridge",    color: CLR_BROWN },
    // idx 44: S_vcdbridge
    { ch: '#',  desc: "vertical closed drawbridge",    color: CLR_BROWN },
    // idx 45: S_hcdbridge
    { ch: '#',  desc: "horizontal closed drawbridge",  color: CLR_BROWN },
    // idx 46: S_air
    { ch: ' ',  desc: "air",                           color: CLR_CYAN },
    // idx 47: S_cloud
    { ch: '#',  desc: "cloud",                         color: CLR_GRAY },
    // idx 48: S_water (WATER terrain: wall of water / Plane of Water)
    { ch: '}',  desc: "water",                         color: CLR_BRIGHT_BLUE },
    // --- end dungeon characters, begin traps ---
    // idx 49: S_arrow_trap
    { ch: '^',  desc: "arrow trap",                    color: HI_METAL },
    // idx 50: S_dart_trap
    { ch: '^',  desc: "dart trap",                     color: HI_METAL },
    // idx 51: S_falling_rock_trap
    { ch: '^',  desc: "falling rock trap",             color: CLR_GRAY },
    // idx 52: S_squeaky_board
    { ch: '^',  desc: "squeaky board",                 color: CLR_BROWN },
    // idx 53: S_bear_trap
    { ch: '^',  desc: "bear trap",                     color: HI_METAL },
    // idx 54: S_land_mine
    { ch: '^',  desc: "land mine",                     color: CLR_RED },
    // idx 55: S_rolling_boulder_trap
    { ch: '^',  desc: "rolling boulder trap",          color: CLR_GRAY },
    // idx 56: S_sleeping_gas_trap
    { ch: '^',  desc: "sleeping gas trap",             color: HI_ZAP },
    // idx 57: S_rust_trap
    { ch: '^',  desc: "rust trap",                     color: CLR_BLUE },
    // idx 58: S_fire_trap
    { ch: '^',  desc: "fire trap",                     color: CLR_ORANGE },
    // idx 59: S_pit
    { ch: '^',  desc: "pit",                           color: CLR_BLACK },
    // idx 60: S_spiked_pit
    { ch: '^',  desc: "spiked pit",                    color: CLR_BLACK },
    // idx 61: S_hole
    { ch: '^',  desc: "hole",                          color: CLR_BROWN },
    // idx 62: S_trap_door
    { ch: '^',  desc: "trap door",                     color: CLR_BROWN },
    // idx 63: S_teleportation_trap
    { ch: '^',  desc: "teleportation trap",            color: CLR_MAGENTA },
    // idx 64: S_level_teleporter
    { ch: '^',  desc: "level teleporter",              color: CLR_MAGENTA },
    // idx 65: S_magic_portal
    { ch: '^',  desc: "magic portal",                  color: CLR_BRIGHT_MAGENTA },
    // idx 66: S_web
    { ch: '"',  desc: "web",                           color: CLR_GRAY },
    // idx 67: S_statue_trap
    { ch: '^',  desc: "statue trap",                   color: CLR_GRAY },
    // idx 68: S_magic_trap
    { ch: '^',  desc: "magic trap",                    color: HI_ZAP },
    // idx 69: S_anti_magic_trap
    { ch: '^',  desc: "anti magic trap",               color: HI_ZAP },
    // idx 70: S_polymorph_trap
    { ch: '^',  desc: "polymorph trap",                color: CLR_BRIGHT_GREEN },
    // idx 71: S_vibrating_square
    { ch: '~',  desc: "vibrating square",              color: CLR_MAGENTA },
    // idx 72: S_trapped_door
    { ch: '^',  desc: "trapped door",                  color: CLR_ORANGE },
    // idx 73: S_trapped_chest
    { ch: '^',  desc: "trapped chest",                 color: CLR_ORANGE },
    // --- end traps, end cmap B ---
    // --- begin special effects ---
    // idx 74: S_vbeam (zap colors changed by reset_glyphmap)
    { ch: '|',  desc: "vertical beam",                 color: CLR_GRAY },
    // idx 75: S_hbeam
    { ch: '-',  desc: "horizontal beam",               color: CLR_GRAY },
    // idx 76: S_lslant
    { ch: '\\', desc: "left slant beam",               color: CLR_GRAY },
    // idx 77: S_rslant
    { ch: '/',  desc: "right slant beam",              color: CLR_GRAY },
    // --- start cmap C ---
    // idx 78: S_digbeam
    { ch: '*',  desc: "dig beam",                      color: CLR_WHITE },
    // idx 79: S_flashbeam
    { ch: '!',  desc: "flash beam",                    color: CLR_WHITE },
    // idx 80: S_boomleft
    { ch: ')',  desc: "boom left",                     color: HI_WOOD },
    // idx 81: S_boomright
    { ch: '(',  desc: "boom right",                    color: HI_WOOD },
    // idx 82: S_ss1 (magic shield)
    { ch: '0',  desc: "shield1",                       color: HI_ZAP },
    // idx 83: S_ss2
    { ch: '#',  desc: "shield2",                       color: HI_ZAP },
    // idx 84: S_ss3
    { ch: '@',  desc: "shield3",                       color: HI_ZAP },
    // idx 85: S_ss4
    { ch: '*',  desc: "shield4",                       color: HI_ZAP },
    // idx 86: S_poisoncloud
    { ch: '#',  desc: "poison cloud",                  color: CLR_BRIGHT_GREEN },
    // idx 87: S_goodpos
    { ch: '$',  desc: "valid position",                color: HI_ZAP },
    // --- end cmap C ---
    // --- swallow symbols (do NOT separate) ---
    // Order: 1 2 3 / 4 5 6 / 7 8 9
    // idx 88: S_sw_tl  (1)
    { ch: '/',  desc: "swallow top left",              color: CLR_GREEN },
    // idx 89: S_sw_tc  (2)
    { ch: '-',  desc: "swallow top center",            color: CLR_GREEN },
    // idx 90: S_sw_tr  (3)
    { ch: '\\', desc: "swallow top right",             color: CLR_GREEN },
    // idx 91: S_sw_ml  (4)
    { ch: '|',  desc: "swallow middle left",           color: CLR_GREEN },
    // idx 92: S_sw_mr  (6)
    { ch: '|',  desc: "swallow middle right",          color: CLR_GREEN },
    // idx 93: S_sw_bl  (7)
    { ch: '\\', desc: "swallow bottom left",           color: CLR_GREEN },
    // idx 94: S_sw_bc  (8)
    { ch: '-',  desc: "swallow bottom center",         color: CLR_GREEN },
    // idx 95: S_sw_br  (9)
    { ch: '/',  desc: "swallow bottom right",          color: CLR_GREEN },
    // --- explosion symbols ---
    // idx 96: S_expl_tl
    { ch: '/',  desc: "explosion top left",            color: CLR_ORANGE },
    // idx 97: S_expl_tc
    { ch: '-',  desc: "explosion top center",          color: CLR_ORANGE },
    // idx 98: S_expl_tr
    { ch: '\\', desc: "explosion top right",           color: CLR_ORANGE },
    // idx 99: S_expl_ml
    { ch: '|',  desc: "explosion middle left",         color: CLR_ORANGE },
    // idx 100: S_expl_mc
    { ch: ' ',  desc: "explosion middle center",       color: CLR_ORANGE },
    // idx 101: S_expl_mr
    { ch: '|',  desc: "explosion middle right",        color: CLR_ORANGE },
    // idx 102: S_expl_bl
    { ch: '\\', desc: "explosion bottom left",         color: CLR_ORANGE },
    // idx 103: S_expl_bc
    { ch: '-',  desc: "explosion bottom center",       color: CLR_ORANGE },
    // idx 104: S_expl_br
    { ch: '/',  desc: "explosion bottom right",        color: CLR_ORANGE },
];

// Derived constants (from include/sym.h, lines 91-94)
export const MAXDCHARS = S_water - S_stone + 1;            // mapped dungeon characters
export const MAXECHARS = S_expl_br - S_vbeam + 1;          // mapped effects characters
export const MAXEXPCHARS = 9;                               // number of explosion characters

// ==========================================================================
// 3. Level Type Constants (from include/rm.h, lines 55-97)
//    enum levl_typ_types
// ==========================================================================

export const MATCH_WALL      = 38;
export const INVALID_TYPE    = 127;

// Level type utility macros (from include/rm.h, lines 104-128)
export function IS_SDOOR(typ)      { return typ === SDOOR; }
export function IS_TREE(typ)       { return typ === TREE; }
export function ZAP_POS(typ)       { return typ >= POOL; }
export function SPACE_POS(typ)     { return typ > DOOR; }
export function IS_THRONE(typ)     { return typ === THRONE; }
export function IS_FOUNTAIN(typ)   { return typ === FOUNTAIN; }
export function IS_SINK(typ)       { return typ === SINK; }
export function IS_GRAVE(typ)      { return typ === GRAVE; }
export function IS_ALTAR(typ)      { return typ === ALTAR; }
export function IS_AIR(typ)        { return typ === AIR || typ === CLOUD; }
export function IS_SOFT(typ)       { return typ === AIR || typ === CLOUD || IS_POOL(typ); }

// Door flags (from include/rm.h, lines 220-227)

// ==========================================================================
// 4. Monster Class Symbols (from include/defsym.h, lines 295-367)
//    MONSYM(idx, ch, basename, sym, desc)
//    Drawing form: { DEF_basename, "", desc }
//    We store: { sym (character), name (empty string), explain (desc) }
// ==========================================================================

// Monster class S_* enum values (from MONSYMS_S_ENUM)
export const S_ANT         = 1;
export const S_BLOB        = 2;
export const S_COCKATRICE  = 3;
export const S_DOG         = 4;
export const S_EYE         = 5;
export const S_FELINE      = 6;
export const S_GREMLIN     = 7;
export const S_HUMANOID    = 8;
export const S_IMP         = 9;
export const S_JELLY       = 10;
export const S_KOBOLD      = 11;
export const S_LEPRECHAUN  = 12;
export const S_MIMIC       = 13;
export const S_NYMPH       = 14;
export const S_ORC         = 15;
export const S_PIERCER     = 16;
export const S_QUADRUPED   = 17;
export const S_RODENT      = 18;
export const S_SPIDER      = 19;
export const S_TRAPPER     = 20;
export const S_UNICORN     = 21;
export const S_VORTEX      = 22;
export const S_WORM        = 23;
export const S_XAN         = 24;
export const S_LIGHT       = 25;
export const S_ZRUTY       = 26;
export const S_ANGEL       = 27;
export const S_BAT         = 28;
export const S_CENTAUR     = 29;
export const S_DRAGON      = 30;
export const S_ELEMENTAL   = 31;
export const S_FUNGUS      = 32;
export const S_GNOME       = 33;
export const S_GIANT       = 34;
export const S_invisible   = 35;
export const S_JABBERWOCK  = 36;
export const S_KOP         = 37;
export const S_LICH        = 38;
export const S_MUMMY       = 39;
export const S_NAGA        = 40;
export const S_OGRE        = 41;
export const S_PUDDING     = 42;
export const S_QUANTMECH   = 43;
export const S_RUSTMONST   = 44;
export const S_SNAKE       = 45;
export const S_TROLL       = 46;
export const S_UMBER       = 47;
export const S_VAMPIRE     = 48;
export const S_WRAITH      = 49;
export const S_XORN        = 50;
export const S_YETI        = 51;
export const S_ZOMBIE      = 52;
export const S_HUMAN       = 53;
export const S_GHOST       = 54;
export const S_GOLEM       = 55;
export const S_DEMON       = 56;
export const S_EEL         = 57;
export const S_LIZARD      = 58;
export const S_WORM_TAIL   = 59;
export const S_MIMIC_DEF   = 60;

// The def_monsyms[] array (from drawing.c lines 32-37 + defsym.h MONSYMS)
// Each entry: { sym, name, explain }
// Index 0 is the placeholder for "random class"
export const def_monsyms = [
    // idx  0: placeholder
    { sym: '\0', name: "",  explain: "" },
    // idx  1: S_ANT
    { sym: 'a',  name: "",  explain: "ant or other insect" },
    // idx  2: S_BLOB
    { sym: 'b',  name: "",  explain: "blob" },
    // idx  3: S_COCKATRICE
    { sym: 'c',  name: "",  explain: "cockatrice" },
    // idx  4: S_DOG
    { sym: 'd',  name: "",  explain: "dog or other canine" },
    // idx  5: S_EYE
    { sym: 'e',  name: "",  explain: "eye or sphere" },
    // idx  6: S_FELINE
    { sym: 'f',  name: "",  explain: "cat or other feline" },
    // idx  7: S_GREMLIN
    { sym: 'g',  name: "",  explain: "gremlin" },
    // idx  8: S_HUMANOID (hobbit, dwarf)
    { sym: 'h',  name: "",  explain: "humanoid" },
    // idx  9: S_IMP
    { sym: 'i',  name: "",  explain: "imp or minor demon" },
    // idx 10: S_JELLY
    { sym: 'j',  name: "",  explain: "jelly" },
    // idx 11: S_KOBOLD
    { sym: 'k',  name: "",  explain: "kobold" },
    // idx 12: S_LEPRECHAUN
    { sym: 'l',  name: "",  explain: "leprechaun" },
    // idx 13: S_MIMIC
    { sym: 'm',  name: "",  explain: "mimic" },
    // idx 14: S_NYMPH
    { sym: 'n',  name: "",  explain: "nymph" },
    // idx 15: S_ORC
    { sym: 'o',  name: "",  explain: "orc" },
    // idx 16: S_PIERCER
    { sym: 'p',  name: "",  explain: "piercer" },
    // idx 17: S_QUADRUPED (excludes horses)
    { sym: 'q',  name: "",  explain: "quadruped" },
    // idx 18: S_RODENT
    { sym: 'r',  name: "",  explain: "rodent" },
    // idx 19: S_SPIDER
    { sym: 's',  name: "",  explain: "arachnid or centipede" },
    // idx 20: S_TRAPPER
    { sym: 't',  name: "",  explain: "trapper or lurker above" },
    // idx 21: S_UNICORN (unicorn, horses)
    { sym: 'u',  name: "",  explain: "unicorn or horse" },
    // idx 22: S_VORTEX
    { sym: 'v',  name: "",  explain: "vortex" },
    // idx 23: S_WORM
    { sym: 'w',  name: "",  explain: "worm" },
    // idx 24: S_XAN
    { sym: 'x',  name: "",  explain: "xan or other mythical/fantastic insect" },
    // idx 25: S_LIGHT (yellow light, black light)
    { sym: 'y',  name: "",  explain: "light" },
    // idx 26: S_ZRUTY
    { sym: 'z',  name: "",  explain: "zruty" },
    // idx 27: S_ANGEL
    { sym: 'A',  name: "",  explain: "angelic being" },
    // idx 28: S_BAT
    { sym: 'B',  name: "",  explain: "bat or bird" },
    // idx 29: S_CENTAUR
    { sym: 'C',  name: "",  explain: "centaur" },
    // idx 30: S_DRAGON
    { sym: 'D',  name: "",  explain: "dragon" },
    // idx 31: S_ELEMENTAL (includes invisible stalker)
    { sym: 'E',  name: "",  explain: "elemental" },
    // idx 32: S_FUNGUS
    { sym: 'F',  name: "",  explain: "fungus or mold" },
    // idx 33: S_GNOME
    { sym: 'G',  name: "",  explain: "gnome" },
    // idx 34: S_GIANT (giant, ettin, minotaur)
    { sym: 'H',  name: "",  explain: "giant humanoid" },
    // idx 35: S_invisible
    { sym: 'I',  name: "",  explain: "invisible monster" },
    // idx 36: S_JABBERWOCK
    { sym: 'J',  name: "",  explain: "jabberwock" },
    // idx 37: S_KOP
    { sym: 'K',  name: "",  explain: "Keystone Kop" },
    // idx 38: S_LICH
    { sym: 'L',  name: "",  explain: "lich" },
    // idx 39: S_MUMMY
    { sym: 'M',  name: "",  explain: "mummy" },
    // idx 40: S_NAGA
    { sym: 'N',  name: "",  explain: "naga" },
    // idx 41: S_OGRE
    { sym: 'O',  name: "",  explain: "ogre" },
    // idx 42: S_PUDDING
    { sym: 'P',  name: "",  explain: "pudding or ooze" },
    // idx 43: S_QUANTMECH
    { sym: 'Q',  name: "",  explain: "quantum mechanic" },
    // idx 44: S_RUSTMONST
    { sym: 'R',  name: "",  explain: "rust monster or disenchanter" },
    // idx 45: S_SNAKE
    { sym: 'S',  name: "",  explain: "snake" },
    // idx 46: S_TROLL
    { sym: 'T',  name: "",  explain: "troll" },
    // idx 47: S_UMBER
    { sym: 'U',  name: "",  explain: "umber hulk" },
    // idx 48: S_VAMPIRE
    { sym: 'V',  name: "",  explain: "vampire" },
    // idx 49: S_WRAITH
    { sym: 'W',  name: "",  explain: "wraith" },
    // idx 50: S_XORN
    { sym: 'X',  name: "",  explain: "xorn" },
    // idx 51: S_YETI (apelike creature includes owlbear, monkey)
    { sym: 'Y',  name: "",  explain: "apelike creature" },
    // idx 52: S_ZOMBIE
    { sym: 'Z',  name: "",  explain: "zombie" },
    // idx 53: S_HUMAN
    { sym: '@',  name: "",  explain: "human or elf" },
    // idx 54: S_GHOST
    { sym: ' ',  name: "",  explain: "ghost" },
    // idx 55: S_GOLEM
    { sym: '\'', name: "",  explain: "golem" },
    // idx 56: S_DEMON
    { sym: '&',  name: "",  explain: "major demon" },
    // idx 57: S_EEL (fish/sea monster)
    { sym: ';',  name: "",  explain: "sea monster" },
    // idx 58: S_LIZARD (reptiles)
    { sym: ':',  name: "",  explain: "lizard" },
    // idx 59: S_WORM_TAIL
    { sym: '~',  name: "",  explain: "long worm tail" },
    // idx 60: S_MIMIC_DEF
    { sym: ']',  name: "",  explain: "mimic" },
];

// ==========================================================================
// 5. Object Class Symbols (from include/defsym.h, lines 466-484)
//    OBJCLASS(idx, ch, basename, sym, name, explain)
//    Drawing form: { basename_SYM, name, explain }
// ==========================================================================

// Object class S_* enum values (from OBJCLASS_S_ENUM)
export const S_strange_obj = 1;
export const S_weapon      = 2;
export const S_armor       = 3;
export const S_ring        = 4;
export const S_amulet      = 5;
export const S_tool        = 6;
export const S_food        = 7;
export const S_potion      = 8;
export const S_scroll      = 9;
export const S_book        = 10;
export const S_wand        = 11;
export const S_coin        = 12;
export const S_gem         = 13;
export const S_rock        = 14;
export const S_ball        = 15;
export const S_chain       = 16;
export const S_venom       = 17;

// Object class *_CLASS enum values (from OBJCLASS_CLASS_ENUM)
export const ILLOBJ_CLASS   = 1;
export const WEAPON_CLASS   = 2;
export const ARMOR_CLASS    = 3;
export const RING_CLASS     = 4;
export const AMULET_CLASS   = 5;
export const TOOL_CLASS     = 6;
export const FOOD_CLASS     = 7;
export const POTION_CLASS   = 8;
export const SCROLL_CLASS   = 9;
export const SPBOOK_CLASS   = 10;
export const WAND_CLASS     = 11;
export const COIN_CLASS     = 12;
export const GEM_CLASS      = 13;
export const ROCK_CLASS     = 14;
export const BALL_CLASS     = 15;
export const CHAIN_CLASS    = 16;
export const VENOM_CLASS    = 17;

// Default character symbols for object classes (from OBJCLASS_DEFCHAR_ENUM)
export const ILLOBJ_SYM = ']'.charCodeAt(0);
export const WEAPON_SYM = ')'.charCodeAt(0);
export const ARMOR_SYM  = '['.charCodeAt(0);
export const RING_SYM   = '='.charCodeAt(0);
export const AMULET_SYM = '"'.charCodeAt(0);
export const TOOL_SYM   = '('.charCodeAt(0);
export const FOOD_SYM   = '%'.charCodeAt(0);
export const POTION_SYM = '!'.charCodeAt(0);
export const SCROLL_SYM = '?'.charCodeAt(0);
export const SPBOOK_SYM = '+'.charCodeAt(0);
export const WAND_SYM   = '/'.charCodeAt(0);
export const GOLD_SYM   = '$'.charCodeAt(0);  // OBJCLASS2 special case
export const GEM_SYM    = '*'.charCodeAt(0);
export const ROCK_SYM   = '`'.charCodeAt(0);
export const BALL_SYM   = '0'.charCodeAt(0);
export const CHAIN_SYM  = '_'.charCodeAt(0);
export const VENOM_SYM  = '.'.charCodeAt(0);

// The def_oc_syms[] array (from drawing.c lines 24-29 + defsym.h OBJCLASS_DRAWING)
// Each entry: { sym, name, explain }
// Index 0 is the placeholder for the "random class"
export const def_oc_syms = [
    // idx  0: placeholder for "random class"
    { sym: '\0', name: "",               explain: "" },
    // idx  1: ILLOBJ_CLASS
    { sym: ']',  name: "illegal objects", explain: "strange object" },
    // idx  2: WEAPON_CLASS
    { sym: ')',  name: "weapons",         explain: "weapon" },
    // idx  3: ARMOR_CLASS
    { sym: '[',  name: "armor",           explain: "suit or piece of armor" },
    // idx  4: RING_CLASS
    { sym: '=',  name: "rings",           explain: "ring" },
    // idx  5: AMULET_CLASS
    { sym: '"',  name: "amulets",         explain: "amulet" },
    // idx  6: TOOL_CLASS
    { sym: '(',  name: "tools",           explain: "useful item (pick-axe, key, lamp...)" },
    // idx  7: FOOD_CLASS
    { sym: '%',  name: "food",            explain: "piece of food" },
    // idx  8: POTION_CLASS
    { sym: '!',  name: "potions",         explain: "potion" },
    // idx  9: SCROLL_CLASS
    { sym: '?',  name: "scrolls",         explain: "scroll" },
    // idx 10: SPBOOK_CLASS
    { sym: '+',  name: "spellbooks",      explain: "spellbook" },
    // idx 11: WAND_CLASS
    { sym: '/',  name: "wands",           explain: "wand" },
    // idx 12: COIN_CLASS (uses GOLD_SYM)
    { sym: '$',  name: "coins",           explain: "pile of coins" },
    // idx 13: GEM_CLASS
    { sym: '*',  name: "rocks",           explain: "gem or rock" },
    // idx 14: ROCK_CLASS
    { sym: '`',  name: "large stones",    explain: "boulder or statue" },
    // idx 15: BALL_CLASS
    { sym: '0',  name: "iron balls",      explain: "iron ball" },
    // idx 16: CHAIN_CLASS
    { sym: '_',  name: "chains",          explain: "iron chain" },
    // idx 17: VENOM_CLASS
    { sym: '.',  name: "venoms",          explain: "splash of venom" },
];

// ==========================================================================
// 6. Trap Type Constants (from include/trap.h, lines 57-94)
//    enum trap_types
// ==========================================================================


// Trap utility macros (from include/trap.h)
export function is_magical_trap(ttyp) {
    return ttyp === TELEP_TRAP || ttyp === LEVEL_TELEP
        || ttyp === MAGIC_TRAP || ttyp === ANTI_MAGIC
        || ttyp === POLY_TRAP;
}
export function is_xport(ttyp) { return ttyp >= TELEP_TRAP && ttyp <= MAGIC_PORTAL; }

// Trap <-> defsym conversion (from include/rm.h, lines 483-484)
export function trap_to_defsym(t) { return S_arrow_trap + t - 1; }
export function defsym_to_trap(d) { return d - S_arrow_trap + 1; }

// MAXTCHARS: number of trap characters (from include/sym.h, line 92)
export const MAXTCHARS = TRAPNUM - 1;

// ==========================================================================
// 7. Warning Symbols (from src/drawing.c, lines 39-52)
//    6 warning levels (WARNCOUNT = 6)
// ==========================================================================

export const WARNCOUNT = 6;

export const def_warnsyms = [
    // level 0: white warning
    { ch: '0', desc: "unknown creature causing you worry",    color: CLR_WHITE },
    // level 1: pink warning
    { ch: '1', desc: "unknown creature causing you concern",  color: CLR_RED },
    // level 2: red warning
    { ch: '2', desc: "unknown creature causing you anxiety",  color: CLR_RED },
    // level 3: ruby warning
    { ch: '3', desc: "unknown creature causing you disquiet", color: CLR_RED },
    // level 4: purple warning
    { ch: '4', desc: "unknown creature causing you alarm",    color: CLR_MAGENTA },
    // level 5: black warning
    { ch: '5', desc: "unknown creature causing you dread",    color: CLR_BRIGHT_MAGENTA },
];

// ==========================================================================
// 8. CSS Color Mapping for Browser Rendering
//    Maps NetHack CLR_* constants to CSS color strings
// ==========================================================================

const cssColorMap = [
    /* CLR_BLACK          0 */ "#555",   // dark gray (pure black invisible on black bg)
    /* CLR_RED            1 */ "#a00",
    /* CLR_GREEN          2 */ "#0a0",
    /* CLR_BROWN          3 */ "#a50",
    /* CLR_BLUE           4 */ "#00a",
    /* CLR_MAGENTA        5 */ "#a0a",
    /* CLR_CYAN           6 */ "#0aa",
    /* CLR_GRAY           7 */ "#ccc",
    /* NO_COLOR           8 */ "#f80",   // bright orange (NO_COLOR / CLR_ORANGE alias)
    /* CLR_ORANGE         9 */ "#f80",
    /* CLR_BRIGHT_GREEN  10 */ "#0f0",
    /* CLR_YELLOW        11 */ "#ff0",
    /* CLR_BRIGHT_BLUE   12 */ "#55f",
    /* CLR_BRIGHT_MAGENTA 13 */ "#f5f",
    /* CLR_BRIGHT_CYAN   14 */ "#0ff",
    /* CLR_WHITE         15 */ "#fff",
];

/**
 * Convert a NetHack color constant to a CSS color string suitable
 * for browser rendering on a dark background.
 *
 * @param {number} color - A CLR_* constant (0-15) or NO_COLOR (8)
 * @returns {string} CSS color string (hex)
 */
export function colorToCSS(color) {
    if (color >= 0 && color < cssColorMap.length) {
        return cssColorMap[color];
    }
    return cssColorMap[CLR_GRAY]; // fallback to gray
}

// ==========================================================================
// Misc Symbol Constants (from include/sym.h, lines 111-118)
// ==========================================================================

export const SYM_NOTHING       = 0;
export const SYM_UNEXPLORED    = 1;
export const SYM_BOULDER       = 2;
export const SYM_INVISIBLE     = 3;
export const SYM_PET_OVERRIDE  = 4;
export const SYM_HERO_OVERRIDE = 5;
export const MAXOTHER          = 6;

// Symbol parse range (from include/sym.h, lines 58-65)
export const SYM_INVALID       = 0;
export const SYM_CONTROL       = 1;
export const SYM_PCHAR         = 2;
export const SYM_OC            = 3;
export const SYM_MON           = 4;
export const SYM_OTH           = 5;

// Cmap classification helpers (from include/sym.h, lines 98-108)
export function is_cmap_trap(i)       { return i >= S_arrow_trap && i < S_arrow_trap + MAXTCHARS; }
export function is_cmap_drawbridge(i) { return i >= S_vodbridge && i <= S_hcdbridge; }
export function is_cmap_door(i)       { return i >= S_vodoor && i <= S_hcdoor; }
export function is_cmap_wall(i)       { return i >= S_stone && i <= S_trwall; }
export function is_cmap_room(i)       { return i >= S_room && i <= S_darkroom; }
export function is_cmap_corr(i)       { return i >= S_corr && i <= S_litcorr; }
export function is_cmap_furniture(i)  { return i >= S_upstair && i <= S_fountain; }
export function is_cmap_water(i)      { return i === S_pool || i === S_water; }
export function is_cmap_lava(i)       { return i === S_lava || i === S_lavawall; }
export function is_cmap_stairs(i)     { return i >= S_upstair && i <= S_brdnladder; }
export function is_cmap_engraving(i)  { return i === S_engroom || i === S_engrcorr; }

// ==========================================================================
// DECgraphics Symbol Set
// C ref: dat/symbols DECgraphics symset
// Uses Unicode box-drawing characters for walls and corners
// ==========================================================================

export const decgraphics = [
    // Walls and corners (matching defsyms indices 1-11)
    '│',  // S_vwall (1)   - \xf8 meta-x, vertical rule
    '─',  // S_hwall (2)   - \xf1 meta-q, horizontal rule
    '┌',  // S_tlcorn (3)  - \xec meta-l, top left corner
    '┐',  // S_trcorn (4)  - \xeb meta-k, top right corner
    '└',  // S_blcorn (5)  - \xed meta-m, bottom left
    '┘',  // S_brcorn (6)  - \xea meta-j, bottom right
    '┼',  // S_crwall (7)  - \xee meta-n, cross
    '┴',  // S_tuwall (8)  - \xf6 meta-v, T up
    '┬',  // S_tdwall (9)  - \xf7 meta-w, T down
    '┤',  // S_tlwall (10) - \xf5 meta-u, T left
    '├',  // S_trwall (11) - \xf4 meta-t, T right
];

/**
 * Get the display character for a symbol index
 * @param {number} idx - Symbol index (S_* constant)
 * @param {boolean} useDECgraphics - Whether to use DECgraphics box-drawing chars
 * @returns {string} The character to display
 */
export function getSymbolChar(idx, useDECgraphics = false) {
    // Use DECgraphics for wall symbols (indices 1-11) if enabled
    if (useDECgraphics && idx >= S_vwall && idx <= S_trwall) {
        return decgraphics[idx - 1];  // decgraphics[0] maps to S_vwall (1)
    }
    // Otherwise use default ASCII from defsyms
    return defsyms[idx].ch;
}

// ============================================================================
// drawing.c lookup functions
// C ref: drawing.c:91-130 — character-to-class conversion utilities
// ============================================================================

// drawing.c:91 — convert a character into its object class.
// Returns the index of the matching class, or MAXOCLASSES if not found.
export function def_char_to_objclass(ch) {
    for (let i = 1; i < MAXOCLASSES; i++) {
        if (def_oc_syms[i] && def_oc_syms[i].sym === ch) return i;
    }
    return MAXOCLASSES;
}

// drawing.c:108 — convert a character into its monster class.
// Returns the index of the first matching class, or MAXMCLASSES if not found.
export function def_char_to_monclass(ch) {
    for (let i = 1; i < MAXMCLASSES; i++) {
        if (def_monsyms[i] && def_monsyms[i].sym === ch) return i;
    }
    return MAXMCLASSES;
}

// drawing.c:120 — does 'ch' represent a furniture character?
// Returns the defsyms[] index if found, or 0 if not.
// C scans explanation strings for "stair".."fountain"; JS uses S_upstair..S_fountain.
export function def_char_is_furniture(ch) {
    for (let i = S_upstair; i <= S_fountain; i++) {
        if (defsyms[i] && defsyms[i].ch === ch) return i;
    }
    return 0;
}

// Autotranslated from symbols.c:84
export function init_symbols() {
  init_ov_primary_symbols();
  init_ov_rogue_symbols();
  init_primary_symbols();
  init_showsyms();
  init_rogue_symbols();
}

// Autotranslated from symbols.c:94
export function init_showsyms() {
  let i;
  for (i = 0; i < MAXPCHARS; i++) {
    gs.showsyms = defsyms[i].sym;
  }
  for (i = 0; i < MAXOCLASSES; i++) {
    gs.showsyms = def_oc_syms[i].sym;
  }
  for (i = 0; i < MAXMCLASSES; i++) {
    gs.showsyms = def_monsyms[i].sym;
  }
  for (i = 0; i < WARNCOUNT; i++) {
    gs.showsyms = def_warnsyms[i].sym;
  }
  for (i = 0; i < MAXOTHER; i++) {
    gs.showsyms = get_othersym(i, PRIMARYSET);
  }
}

// Autotranslated from symbols.c:166
export function init_primary_symbols() {
  let i;
  for (i = 0; i < MAXPCHARS; i++) {
    gp.primary_syms = defsyms[i].sym;
  }
  for (i = 0; i < MAXOCLASSES; i++) {
    gp.primary_syms = def_oc_syms[i].sym;
  }
  for (i = 0; i < MAXMCLASSES; i++) {
    gp.primary_syms = def_monsyms[i].sym;
  }
  for (i = 0; i < WARNCOUNT; i++) {
    gp.primary_syms = def_warnsyms[i].sym;
  }
  for (i = 0; i < MAXOTHER; i++) {
    gp.primary_syms = get_othersym(i, PRIMARYSET);
  }
  clear_symsetentry(PRIMARYSET, false);
}

// Autotranslated from symbols.c:186
export function init_rogue_symbols() {
  let i;
  for (i = 0; i < MAXPCHARS; i++) {
    gr.rogue_syms = defsyms[i].sym;
  }
  gr.rogue_syms = gr.rogue_syms = gr.rogue_syms = '+';
  gr.rogue_syms = gr.rogue_syms = '%';
  for (i = 0; i < MAXOCLASSES; i++) {
    gr.rogue_syms = def_r_oc_syms;
  }
  for (i = 0; i < MAXMCLASSES; i++) {
    gr.rogue_syms = def_monsyms[i].sym;
  }
  for (i = 0; i < WARNCOUNT; i++) {
    gr.rogue_syms = def_warnsyms[i].sym;
  }
  for (i = 0; i < MAXOTHER; i++) {
    gr.rogue_syms = get_othersym(i, ROGUESET);
  }
  clear_symsetentry(ROGUESET, false);
  gs.symset[ROGUESET].nocolor = 1;
}

// Autotranslated from symbols.c:306
export function update_primary_symset(symp, val) {
  gp.primary_syms = val;
}

// Autotranslated from symbols.c:312
export function update_rogue_symset(symp, val) {
  gr.rogue_syms = val;
}

// Autotranslated from symbols.c:352
export function symset_is_compatible(handling, wincap2) {
  if (handling === H_UTF8 && ((wincap2 & WC2_utf8_bits) !== WC2_utf8_bits)) return false;
  return true;
}

// Autotranslated from symbols.c:656
export function set_symhandling(handling, which_set) {
  let i = 0;
  gs.symset[which_set].handling = H_UNK;
  while (known_handling) {
    if (!strcmpi(known_handling, handling)) { gs.symset[which_set].handling = i; return; }
    i++;
  }
}

// Autotranslated from symbols.c:692
export function free_symsets() {
  clear_symsetentry(PRIMARYSET, true);
  clear_symsetentry(ROGUESET, true);
}

// Autotranslated from symbols.c:711
export function savedsym_free() {
  let tmp = saved_symbols, tmp2;
  while (tmp) {
    tmp2 = tmp.next;
    (tmp.name, 0);
    (tmp.val, 0);
    (tmp, 0);
    tmp = tmp2;
  }
}

// Autotranslated from symbols.c:738
export function savedsym_add(name, val, which_set) {
  let tmp = null;
  if ((tmp = savedsym_find(name, which_set)) !== 0) { (tmp.val, 0); tmp.val = dupstr(val); }
  else {
    tmp =  alloc(tmp.length);
    tmp.name = dupstr(name);
    tmp.val = dupstr(val);
    tmp.which_set = which_set;
    tmp.next = saved_symbols;
    saved_symbols = tmp;
  }
}

// Autotranslated from symbols.c:756
export function savedsym_strbuf(sbuf) {
  let tmp = saved_symbols, buf;
  while (tmp) {
    Sprintf(buf, "%sSYMBOLS=%s:%s\n", (tmp.which_set === ROGUESET) ? "ROGUE" : "", tmp.name, tmp.val);
    strbuf_append(sbuf, buf);
    tmp = tmp.next;
  }
}

// Autotranslated from symbols.c:772
export function parsesymbols(opts, which_set) {
  let val;
  let symname, strval, ch, first_unquoted_comma = 0, first_unquoted_colon = 0;
  let symp, is_glyph = false;
  for (ch = opts + 1;  ch; ++ch) {
    let prech, postch;
    prech = ch - 1;
    postch = ch + 1;
    if (!postch) {
      break;
    }
    if ( ch === ',') {
      if ( prech === '\'' && postch === '\'') {
        continue;
      }
      if ( prech === '\\') {
        continue;
      }
    }
    if ( ch === ':') {
      if ( prech === '\'' && postch === '\'') {
        continue;
      }
    }
    if ( ch === ',' && !first_unquoted_comma) first_unquoted_comma = ch;
    if ( ch === ':' && !first_unquoted_colon) first_unquoted_colon = ch;
  }
  if (first_unquoted_comma !== 0) {
     first_unquoted_comma = '\x00';
    if (!parsesymbols(first_unquoted_comma, which_set)) return false;
  }
  symname = opts;
  strval = first_unquoted_colon;
  if (!strval) strval = strchr(opts, '=');
  if (!strval) return false;
   strval = '\x00';
  mungspaces(symname);
  mungspaces(strval);
  symp = match_sym(symname);
  if (!symp && symname[0] === 'G' && symname[1] === '_') { is_glyph = match_glyph(symname); }
  if (!symp && !is_glyph) return false;
  if (symp) {
    if (symp.range && symp.range !== SYM_CONTROL) {
      if (gs.symset[which_set].handling === H_UTF8 || (lowc(strval[0]) === 'u' && strval[1] === '+')) {
        let buf, glyph;
        Snprintf(buf, buf.length, "%s:%s", opts, strval);
        glyphrep_to_custom_map_entries(buf, glyph);
      }
      else {
        val = sym_val(strval);
        if (which_set === ROGUESET) update_ov_rogue_symset(symp, val);
        else {
          update_ov_primary_symset(symp, val);
        }
      }
    }
  }
  savedsym_add(opts, strval, which_set);
  return true;
}
