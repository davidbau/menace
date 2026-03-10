// const.js -- Game constants and configuration
// Mirrors constants from include/hack.h, include/global.h, include/rm.h

import { COMMIT_NUMBER } from './version.js';
import { strchr } from './hacklib.js';

// C macro: SIZE(arr) = sizeof(arr)/sizeof(arr[0]) → JS: arr.length
export function SIZE(arr) { return arr.length; }

// Version (patchlevel.h)
export const VERSION_MAJOR = 3;
export const VERSION_MINOR = 7;
export const PATCHLEVEL = 0;
export const VERSION_STRING = `NetHack ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL} Royal Jelly #${COMMIT_NUMBER} — vibe-coded by The Hive`;

// AUTO-IMPORT-BEGIN: CONST_GLOBAL_RM
// Auto-imported global/rm constants from C headers
// Sources: global.h, rm.h

// Map dimensions — cf. global.h
export const COLNO = 80;
export const ROWNO = 21;

// Level location types — cf. rm.h enum levl_typ_types
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

// Door states — cf. rm.h
export const D_NODOOR = 0x00;
export const D_BROKEN = 0x01;
export const D_ISOPEN = 0x02;
export const D_CLOSED = 0x04;
export const D_LOCKED = 0x08;
export const D_TRAPPED = 0x10;
export const D_SECRET = 0x20;
// AUTO-IMPORT-END: CONST_GLOBAL_RM

// Display dimensions
export const TERMINAL_COLS = 80;
export const TERMINAL_ROWS = 24;  // message + map + 2 status lines
export const MESSAGE_ROW = 0;
export const MAP_ROW_START = 1;
export const STATUS_ROW_1 = 22;
export const STATUS_ROW_2 = 23;


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
export const N_DIRS_Z = 10;
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

// PM_* role constants removed — use real C monster-table PM_* from monsters.js
// player.roleMnum stores the monster-table index (matching C's urole.mnum)
// player.roleIndex remains as the roles[] array index (0-12) for chargen/iteration

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

// RANDOM_CLASS is exported from objects.js (canonical home for _CLASS constants)

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

// C ref: dungeon.c init_dungeons() -> svd.dungeons[dnum].flags.align
export const DUNGEON_ALIGN_BY_DNUM = {
    [DUNGEONS_OF_DOOM]: A_NONE,
    [GNOMISH_MINES]: A_LAWFUL,
    [SOKOBAN]: A_NEUTRAL,
    [QUEST]: A_NONE,
    [KNOX]: A_NONE,
    [GEHENNOM]: A_NONE,
    [VLADS_TOWER]: A_CHAOTIC,
    [TUTORIAL]: A_NONE,
};

// AUTO-IMPORT-BEGIN: CONST_ALL_HEADERS
// Auto-imported header constants (pre-symbol pass)
// Source dir: /share/u/davidbau/git/mazesofmenace/ux/scripts/generators/../../nethack-c/patched/include
//
// Rules:
// - include object-like #define macros (not function-like) and enum constants
// - include only const-style expressions (no runtime/lowercase identifiers)
// - preserve include dependency order and in-header declaration order
// - emit only when dependencies are resolvable at this marker location
// - non-emittable blacklist count: 13

// Platform fallback constants (Ubuntu/ncurses-style defaults)
// FROM_LEFT_1ST_BUTTON_PRESSED fallback
export const LEFTBUTTON = 0x2;
// FROM_LEFT_2ND_BUTTON_PRESSED fallback
export const MIDBUTTON = 0x80;
// RIGHTMOST_BUTTON_PRESSED fallback
export const RIGHTBUTTON = 0x800;
// mouse button mask fallback
export const MOUSEMASK = (LEFTBUTTON | RIGHTBUTTON | MIDBUTTON);
// A_LEFT fallback disabled in web renderer
export const A_LEFTLINE = 0;
// A_RIGHT fallback disabled in web renderer
export const A_RIGHTLINE = 0;
// A_UNDERLINE fallback disabled in web renderer
export const A_ITALIC = 0;

// Added direct exports: 1206
// Deferred unresolved const-style macros: 40
// ===== align.h =====
// align.h
export const A_COALIGNED = 1;
// align.h
export const A_OPALIGNED = (-1);
// align.h
export const AM_SPLEV_CO = 0x20;
// align.h
export const AM_SPLEV_NONCO = 0x40;
// align.h
export const AM_SPLEV_RANDOM = 0x80;
// align.h
export const MSA_NONE = 0;

// ===== prop.h =====
// prop.h
export const W_ART = 0x00001000;
// prop.h
export const W_ARTI = 0x00002000;
// prop.h
export const FROMRACE = 0x02000000;
// prop.h
export const FROMFORM = 0x10000000;

// ===== attrib.h =====
// attrib.h
export const A_MAX = (A_CHA + 1);

// ===== botl.h =====
// botl.h
export const BL_CHARACTERISTICS = -3;
// botl.h
export const BL_RESET = -2;
// botl.h
export const BL_FLUSH = -1;
// botl.h
export const BL_TITLE = 0;
// botl.h
export const BL_STR = (BL_TITLE + 1);
// botl.h
export const BL_DX = (BL_STR + 1);
// botl.h
export const BL_CO = (BL_DX + 1);
// botl.h
export const BL_IN = (BL_CO + 1);
// botl.h
export const BL_WI = (BL_IN + 1);
// botl.h
export const BL_CH = (BL_WI + 1);
// botl.h
export const BL_ALIGN = (BL_CH + 1);
// botl.h
export const BL_SCORE = (BL_ALIGN + 1);
// botl.h
export const BL_CAP = (BL_SCORE + 1);
// botl.h
export const BL_GOLD = (BL_CAP + 1);
// botl.h
export const BL_ENE = (BL_GOLD + 1);
// botl.h
export const BL_ENEMAX = (BL_ENE + 1);
// botl.h
export const BL_XP = (BL_ENEMAX + 1);
// botl.h
export const BL_AC = (BL_XP + 1);
// botl.h
export const BL_HD = (BL_AC + 1);
// botl.h
export const BL_TIME = (BL_HD + 1);
// botl.h
export const BL_HUNGER = (BL_TIME + 1);
// botl.h
export const BL_HP = (BL_HUNGER + 1);
// botl.h
export const BL_HPMAX = (BL_HP + 1);
// botl.h
export const BL_LEVELDESC = (BL_HPMAX + 1);
// botl.h
export const BL_EXP = (BL_LEVELDESC + 1);
// botl.h
export const BL_CONDITION = (BL_EXP + 1);
// botl.h
export const BL_VERS = (BL_CONDITION + 1);
// botl.h
export const MAXBLSTATS = (BL_VERS + 1);
// botl.h
export const NO_LTEQGT = -1;
// botl.h
export const EQ_VALUE = (NO_LTEQGT + 1);
// botl.h
export const LT_VALUE = (EQ_VALUE + 1);
// botl.h
export const LE_VALUE = (LT_VALUE + 1);
// botl.h
export const GE_VALUE = (LE_VALUE + 1);
// botl.h
export const GT_VALUE = (GE_VALUE + 1);
// botl.h
export const TXT_VALUE = (GT_VALUE + 1);
// botl.h
export const CONDITION_COUNT = 0;
// botl.h
export const HL_UNDEF = 0x00;
// botl.h
export const HL_NONE = 0x01;
// botl.h
export const HL_BOLD = 0x02;
// botl.h
export const HL_DIM = 0x04;
// botl.h
export const HL_ITALIC = 0x08;
// botl.h
export const HL_ULINE = 0x10;
// botl.h
export const HL_BLINK = 0x20;
// botl.h
export const HL_INVERSE = 0x40;
// botl.h
export const MAXCO = 200;
// botl.h
export const BL_MASK_BAREH = 0x00000001;
// botl.h
export const BL_MASK_BLIND = 0x00000002;
// botl.h
export const BL_MASK_BUSY = 0x00000004;
// botl.h
export const BL_MASK_CONF = 0x00000008;
// botl.h
export const BL_MASK_DEAF = 0x00000010;
// botl.h
export const BL_MASK_ELF_IRON = 0x00000020;
// botl.h
export const BL_MASK_FLY = 0x00000040;
// botl.h
export const BL_MASK_FOODPOIS = 0x00000080;
// botl.h
export const BL_MASK_GLOWHANDS = 0x00000100;
// botl.h
export const BL_MASK_GRAB = 0x00000200;
// botl.h
export const BL_MASK_HALLU = 0x00000400;
// botl.h
export const BL_MASK_HELD = 0x00000800;
// botl.h
export const BL_MASK_ICY = 0x00001000;
// botl.h
export const BL_MASK_INLAVA = 0x00002000;
// botl.h
export const BL_MASK_LEV = 0x00004000;
// botl.h
export const BL_MASK_PARLYZ = 0x00008000;
// botl.h
export const BL_MASK_RIDE = 0x00010000;
// botl.h
export const BL_MASK_SLEEPING = 0x00020000;
// botl.h
export const BL_MASK_SLIME = 0x00040000;
// botl.h
export const BL_MASK_SLIPPERY = 0x00080000;
// botl.h
export const BL_MASK_STONE = 0x00100000;
// botl.h
export const BL_MASK_STRNGL = 0x00200000;
// botl.h
export const BL_MASK_STUN = 0x00400000;
// botl.h
export const BL_MASK_SUBMERGED = 0x00800000;
// botl.h
export const BL_MASK_TERMILL = 0x01000000;
// botl.h
export const BL_MASK_TETHERED = 0x02000000;
// botl.h
export const BL_MASK_TRAPPED = 0x04000000;
// botl.h
export const BL_MASK_UNCONSC = 0x08000000;
// botl.h
export const BL_MASK_WOUNDEDL = 0x10000000;
// botl.h
export const BL_MASK_HOLDING = 0x20000000;
// botl.h
export const BL_MASK_BITS = 30;
// botl.h
export const BEFORE = 0;
// botl.h
export const NOW = 1;
// botl.h
export const BL_HILITE_NONE = -1;
// botl.h
export const BL_HILITE_BOLD = -2;
// botl.h
export const BL_HILITE_DIM = -3;
// botl.h
export const BL_HILITE_ITALIC = -4;
// botl.h
export const BL_HILITE_ULINE = -5;
// botl.h
export const BL_HILITE_BLINK = -6;
// botl.h
export const BL_HILITE_INVERSE = -7;
// botl.h
export const BL_TH_NONE = 0;
// botl.h
export const BL_TH_VAL_PERCENTAGE = 100;
// botl.h
export const BL_TH_VAL_ABSOLUTE = 101;
// botl.h
export const BL_TH_UPDOWN = 102;
// botl.h
export const BL_TH_CONDITION = 103;
// botl.h
export const BL_TH_TEXTMATCH = 104;
// botl.h
export const BL_TH_ALWAYS_HILITE = 105;
// botl.h
export const BL_TH_CRITICALHP = 106;
// botl.h
export const MAXVALWIDTH = 80;

// ===== color.h =====
// color.h
export const NH_BASIC_COLOR = 0x1000000;
// color.h
export const NH_ALTPALETTE = 0x2000000;

// ===== patchlevel.h =====
// patchlevel.h
export const EDITLEVEL = 132;
// patchlevel.h
export const NH_STATUS_RELEASED = 0;
// patchlevel.h
export const NH_STATUS_WIP = 1;
// patchlevel.h
export const NH_STATUS_BETA = 2;
// patchlevel.h
export const NH_STATUS_POSTRELEASE = 3;
// patchlevel.h
export const NH_DEVEL_STATUS = NH_STATUS_WIP;
// patchlevel.h
export const COPYRIGHT_BANNER_A = "NetHack, Copyright 1985-2026";
// patchlevel.h
export const COPYRIGHT_BANNER_B = "         By Stichting Mathematisch Centrum and M. Stephenson.";
// patchlevel.h
export const COPYRIGHT_BANNER_D = "         See license for details.";

// ===== tradstdc.h =====
// tradstdc.h
export const NH_C = 202300;
// tradstdc.h
export const NH_PRAGMA_MESSAGE = 1;

// ===== vmsconf.h =====
// vmsconf.h
export const FCMASK = 0o660;
// vmsconf.h
export const O_RDONLY = 0;
// vmsconf.h
export const O_WRONLY = 1;
// vmsconf.h
export const O_RDWR = 2;
// vmsconf.h
export const O_CREAT = 0x200;
// vmsconf.h
export const O_TRUNC = 0x400;

// ===== unixconf.h =====
// unixconf.h
export const AMS_MAILBOX = "/Mailbox";
// unixconf.h
export const DEF_MAILREADER = "/usr/bin/mail";
// unixconf.h
export const MAILCKFREQ = 50;
// unixconf.h
export const SERVER_ADMIN_MSG_CKFREQ = 25;

// ===== pcconf.h =====
// pcconf.h
export const CONFIG_FILE = "defaults.nh";
// pcconf.h
export const GUIDEBOOK_FILE = "Guidebook.txt";
// pcconf.h
export const PATHLEN = 64;
// pcconf.h
export const FILENAME = 80;
// pcconf.h
export const STKSIZ = 5 * 1024;
// pcconf.h
export const PORT_HELP = "msdoshlp.txt";

// ===== windconf.h =====
// windconf.h
export const OPTIONS_USED = "options";
// windconf.h
export const OPTIONS_FILE = OPTIONS_USED;
// windconf.h
export const CONFIG_TEMPLATE = "nethackrc.template";
// windconf.h
export const SYSCF_TEMPLATE = "sysconf.template";
// windconf.h
export const SYMBOLS_TEMPLATE = "symbols.template";
// windconf.h
export const INTERJECT_PANIC = 0;
// windconf.h
export const INTERJECTION_TYPES = (INTERJECT_PANIC + 1);
// windconf.h
export const MAX_LAN_USERNAME = 20;

// ===== fnamesiz.h =====
// fnamesiz.h
export const LOCKNAMEINIT = "1lock";
// fnamesiz.h
export const BONESINIT = "bonesnn.xxx.le";
// fnamesiz.h
export const INDEXT = ".xxxxxx";
// fnamesiz.h
export const SAVEX = "save/99999.e";
// fnamesiz.h
export const SAVE_EXTENSION = "";

// ===== global.h =====
// global.h
export const HELP = "help";
// global.h
export const SHELP = "hh";
// global.h
export const KEYHELP = "keyhelp";
// global.h
export const DEBUGHELP = "wizhelp";
// global.h
export const RUMORFILE = "rumors";
// global.h
export const ORACLEFILE = "oracles";
// global.h
export const DATAFILE = "data";
// global.h
export const CMDHELPFILE = "cmdhelp";
// global.h
export const HISTORY = "history";
// global.h
export const LICENSE = "license";
// global.h
export const OPTIONFILE = "opthelp";
// global.h
export const OPTMENUHELP = "optmenu";
// global.h
export const USAGEHELP = "usagehlp";
// global.h
export const SYMBOLS = "symbols";
// global.h
export const EPITAPHFILE = "epitaph";
// global.h
export const ENGRAVEFILE = "engrave";
// global.h
export const BOGUSMONFILE = "bogusmon";
// global.h
export const TRIBUTEFILE = "tribute";
// global.h
export const LEV_EXT = ".lua";
// global.h
export const MD_PAD_RUMORS = 60;
// global.h
export const MD_PAD_BOGONS = 20;
// global.h
export const TRUE = (1);
// global.h
export const FALSE = (0);
// global.h
export const BOOL_RANDOM = (-1);
// global.h
export const LARGEST_INT = 32767;
// global.h
export const PORT_ID = "Amiga";
// global.h
export const PORT_SUB_ID = "djgpp";
// global.h
export const EXIT_SUCCESS = 0;
// global.h
export const EXIT_FAILURE = 1;
// global.h
export const MAX_SUBROOMS = 24;
// global.h
export const DOORINC = 20;
// global.h
export const BUFSZ = 256;
// global.h
export const QBUFSZ = 128;
// global.h
export const TBUFSZ = 300;
// global.h
export const COLBUFSZ = BUFSZ;
// global.h
export const PL_NSIZ = 32;
// global.h
export const PL_CSIZ = 32;
// global.h
export const PL_FSIZ = 32;
// global.h
export const PL_PSIZ = 63;
// global.h
export const PL_NSIZ_PLUS = (PL_NSIZ + 4 * (1 + 3) + 1);
// global.h
export const MAXSTAIRS = 1;
// global.h
export const ALIGNWEIGHT = 4;
// global.h
export const MAXULEV = 30;
// global.h
export const MHPMAX = 500;
// global.h
export const MAX_MSG_HISTORY = 128;
// global.h
export const LL_NONE = 0x0000;
// global.h
export const LL_WISH = 0x0001;
// global.h
export const LL_ACHIEVE = 0x0002;
// global.h
export const LL_UMONST = 0x0004;
// global.h
export const LL_DIVINEGIFT = 0x0008;
// global.h
export const LL_LIFESAVE = 0x0010;
// global.h
export const LL_CONDUCT = 0x0020;
// global.h
export const LL_ARTIFACT = 0x0040;
// global.h
export const LL_GENOCIDE = 0x0080;
// global.h
export const LL_KILLEDPET = 0x0100;
// global.h
export const LL_ALIGNMENT = 0x0200;
// global.h
export const LL_DUMP_ASC = 0x0400;
// global.h
export const LL_DUMP_ALL = 0x0800;
// global.h
export const LL_MINORAC = 0x1000;
// global.h
export const LL_SPOILER = 0x2000;
// global.h
export const LL_DUMP = 0x4000;
// global.h
export const LL_DEBUG = 0x8000;
// global.h
export const NHL_SB_STEPSIZE = 1000;
// global.h
export const NHL_SB_SAFE = 0x80000000;
// global.h
export const NHL_SB_VERSION = 0x40000000;
// global.h
export const NHL_SB_DEBUGGING = 0x08000000;
// global.h
export const NHL_SB_STRING = 0x00000001;
// global.h
export const NHL_SB_TABLE = 0x00000002;
// global.h
export const NHL_SB_COROUTINE = 0x00000004;
// global.h
export const NHL_SB_MATH = 0x00000008;
// global.h
export const NHL_SB_UTF8 = 0x00000010;
// global.h
export const NHL_SB_IO = 0x00000020;
// global.h
export const NHL_SB_OS = 0x00000040;
// global.h
export const NHL_SB_BASEMASK = 0x00000f80;
// global.h
export const NHL_SB_BASE_BASE = 0x00000080;
// global.h
export const NHL_SB_BASE_ERROR = 0x00000100;
// global.h
export const NHL_SB_BASE_META = 0x00000200;
// global.h
export const NHL_SB_BASE_GC = 0x00000400;
// global.h
export const NHL_SB_BASE_UNSAFE = 0x00000800;
// global.h
export const NHL_SB_DBMASK = 0x00003000;
// global.h
export const NHL_SB_DB_DB = 0x00001000;
// global.h
export const NHL_SB_DB_SAFE = 0x00002000;
// global.h
export const NHL_SB_OSMASK = 0x0000c000;
// global.h
export const NHL_SB_OS_TIME = 0x00004000;
// global.h
export const NHL_SB_OS_FILES = 0x00008000;
// global.h
export const NHL_SB_ALL = 0x0000ffff;
// global.h
export const NHL_SBRV_DENY = 1;
// global.h
export const NHL_SBRV_ACCEPT = 2;
// global.h
export const NHL_SBRV_FAIL = 3;
// global.h
export const SFCTOOL_BIT = (1 << 30);

// ===== config.h =====
// config.h
export const DEFAULT_WINDOW_SYS = "mac";
// config.h
export const GDBPATH = "/usr/bin/gdb";
// config.h
export const GREPPATH = "/bin/grep";
// config.h
export const XLOGFILE = "xlogfile";
// config.h
export const NEWS = "news";
// config.h
export const PANICLOG = "paniclog";
// config.h
export const PERSMAX = 3;
// config.h
export const POINTSMIN = 1;
// config.h
export const ENTRYMAX = 100;
// config.h
export const PERS_IS_UID = 1;
// config.h
export const COMPRESS = "/usr/bin/compress";
// config.h
export const COMPRESS_EXTENSION = ".Z";
// config.h
export const LIVELOGFILE = "livelog";
// config.h
export const DUMPLOG_MSG_COUNT = 50;

// ===== context.h =====
// context.h
export const TIP_ENHANCE = 0;
// context.h
export const TIP_SWIM = (TIP_ENHANCE + 1);
// context.h
export const TIP_UNTRAP_MON = (TIP_SWIM + 1);
// context.h
export const TIP_GETPOS = (TIP_UNTRAP_MON + 1);
// context.h
export const NUM_TIPS = (TIP_GETPOS + 1);
// context.h
export const CONTEXTVERBSZ = 30;

// ===== date.h =====
// date.h
export const BUILD_DATE = "Sat Mar  7 07:14:15 2026";
// date.h
export const BUILD_TIME = (1772885655);
// date.h
export const IGNORED_FEATURES = 0x40080000;

// ===== decl.h =====
// decl.h
export const DOMOVE_WALK = 0x00000001;
// decl.h
export const DOMOVE_RUSH = 0x00000002;

// ===== dgn_file.h =====
// dgn_file.h
export const TBR_STAIR = 0;
// dgn_file.h
export const TBR_NO_UP = 1;
// dgn_file.h
export const TBR_NO_DOWN = 2;
// dgn_file.h
export const TBR_PORTAL = 3;
// dgn_file.h
export const TOWN = 0x01;
// dgn_file.h
export const HELLISH = 0x02;
// dgn_file.h
export const MAZELIKE = 0x04;
// dgn_file.h
export const ROGUELIKE = 0x08;
// dgn_file.h
export const UNCONNECTED = 0x10;
// dgn_file.h
export const D_ALIGN_NONE = 0;
// dgn_file.h
export const D_ALIGN_CHAOTIC = (AM_CHAOTIC << 4);
// dgn_file.h
export const D_ALIGN_NEUTRAL = (AM_NEUTRAL << 4);
// dgn_file.h
export const D_ALIGN_LAWFUL = (AM_LAWFUL << 4);
// dgn_file.h
export const D_ALIGN_MASK = 0x70;
// dgn_file.h
export const LEV_LIMIT = 50;
// dgn_file.h
export const BRANCH_LIMIT = 32;

// ===== vision.h =====
// vision.h
export const LS_NONE = 0;
// vision.h
export const COULD_SEE = 0x1;
// vision.h
export const IN_SIGHT = 0x2;
// vision.h
export const TEMP_LIT = 0x4;
// vision.h
export const MAX_RADIUS = 15;
// vision.h
export const MONSEEN_NORMAL = 0x0001;
// vision.h
export const MONSEEN_SEEINVIS = 0x0002;
// vision.h
export const MONSEEN_INFRAVIS = 0x0004;
// vision.h
export const MONSEEN_TELEPAT = 0x0008;
// vision.h
export const MONSEEN_XRAYVIS = 0x0010;
// vision.h
export const MONSEEN_DETECT = 0x0020;
// vision.h
export const MONSEEN_WARNMON = 0x0040;

// ===== dlb.h =====
// dlb.h
export const MAX_DLB_FILENAME = 256;
// dlb.h
export const DLBBASENAME = "nhdat";
// dlb.h
export const SEEK_SET = 0;
// dlb.h
export const SEEK_CUR = 1;
// dlb.h
export const SEEK_END = 2;
// dlb.h
export const RDTMODE = "r";
// dlb.h
export const WRTMODE = "w+b";
// dlb.h
export const RDBMODE = "rb";
// dlb.h
export const WRBMODE = "w+b";

// ===== dungeon.h =====
// dungeon.h
export const LR_DOWNSTAIR = 0;
// dungeon.h
export const LR_UPSTAIR = (LR_DOWNSTAIR + 1);
// dungeon.h
export const LR_PORTAL = (LR_UPSTAIR + 1);
// dungeon.h
export const LR_BRANCH = (LR_PORTAL + 1);
// dungeon.h
export const LR_TELE = (LR_BRANCH + 1);
// dungeon.h
export const LR_UPTELE = (LR_TELE + 1);
// dungeon.h
export const LR_DOWNTELE = (LR_UPTELE + 1);
// dungeon.h
export const LR_MONGEN = (LR_DOWNTELE + 1);
// dungeon.h
export const BR_STAIR = 0;
// dungeon.h
export const BR_NO_END1 = 1;
// dungeon.h
export const BR_NO_END2 = 2;
// dungeon.h
export const BR_PORTAL = 3;
// dungeon.h
export const MIGR_NOWHERE = (-1);
// dungeon.h
export const MIGR_RANDOM = 0;
// dungeon.h
export const MIGR_APPROX_XY = 1;
// dungeon.h
export const MIGR_EXACT_XY = 2;
// dungeon.h
export const MIGR_STAIRS_UP = 3;
// dungeon.h
export const MIGR_STAIRS_DOWN = 4;
// dungeon.h
export const MIGR_LADDER_UP = 5;
// dungeon.h
export const MIGR_LADDER_DOWN = 6;
// dungeon.h
export const MIGR_SSTAIRS = 7;
// dungeon.h
export const MIGR_PORTAL = 8;
// dungeon.h
export const MIGR_WITH_HERO = 9;
// dungeon.h
export const MIGR_NOBREAK = 1024;
// dungeon.h
export const MIGR_NOSCATTER = 2048;
// dungeon.h
export const MIGR_TO_SPECIES = 4096;
// dungeon.h
export const MIGR_LEFTOVERS = 8192;
// dungeon.h
export const VISITED = 0x01;
// dungeon.h
export const LFILE_EXISTS = 0x04;

// ===== engrave.h =====
// engrave.h
export const DUST = 1;
// engrave.h
export const ENGRAVE = 2;
// engrave.h
export const BURN = 3;
// engrave.h
export const MARK = 4;
// engrave.h
export const ENGR_BLOOD = 5;
// engrave.h
export const HEADSTONE = 6;
// engrave.h
export const N_ENGRAVE = 6;

// ===== flag.h =====
// flag.h
export const GFILTER_NONE = 0;
// flag.h
export const GFILTER_VIEW = (GFILTER_NONE + 1);
// flag.h
export const GFILTER_AREA = (GFILTER_VIEW + 1);
// flag.h
export const NUM_GFILTER = (GFILTER_AREA + 1);
// flag.h
export const WC_COUNT = 0;
// flag.h
export const PLNMSG_UNKNOWN = 0;
// flag.h
export const PLNMSG_ONE_ITEM_HERE = (PLNMSG_UNKNOWN + 1);
// flag.h
export const PLNMSG_TOWER_OF_FLAME = (PLNMSG_ONE_ITEM_HERE + 1);
// flag.h
export const PLNMSG_CAUGHT_IN_EXPLOSION = (PLNMSG_TOWER_OF_FLAME + 1);
// flag.h
export const PLNMSG_ENVELOPED_IN_GAS = (PLNMSG_CAUGHT_IN_EXPLOSION + 1);
// flag.h
export const PLNMSG_OBJ_GLOWS = (PLNMSG_ENVELOPED_IN_GAS + 1);
// flag.h
export const PLNMSG_OBJNAM_ONLY = (PLNMSG_OBJ_GLOWS + 1);
// flag.h
export const PLNMSG_OK_DONT_DIE = (PLNMSG_OBJNAM_ONLY + 1);
// flag.h
export const PLNMSG_BACK_ON_GROUND = (PLNMSG_OK_DONT_DIE + 1);
// flag.h
export const PLNMSG_GROWL = (PLNMSG_BACK_ON_GROUND + 1);
// flag.h
export const PLNMSG_HIDE_UNDER = (PLNMSG_GROWL + 1);
// flag.h
export const PLNMSG_MON_TAKES_OFF_ITEM = (PLNMSG_HIDE_UNDER + 1);
// flag.h
export const RUN_TPORT = 0;
// flag.h
export const RUN_LEAP = (RUN_TPORT + 1);
// flag.h
export const RUN_STEP = (RUN_LEAP + 1);
// flag.h
export const RUN_CRAWL = (RUN_STEP + 1);
// flag.h
export const GLOC_MONS = 0;
// flag.h
export const GLOC_OBJS = (GLOC_MONS + 1);
// flag.h
export const GLOC_DOOR = (GLOC_OBJS + 1);
// flag.h
export const GLOC_EXPLORE = (GLOC_DOOR + 1);
// flag.h
export const GLOC_INTERESTING = (GLOC_EXPLORE + 1);
// flag.h
export const GLOC_VALID = (GLOC_INTERESTING + 1);
// flag.h
export const NUM_GLOCS = (GLOC_VALID + 1);
// flag.h
export const AUTOUNLOCK_UNTRAP = 1;
// flag.h
export const AUTOUNLOCK_APPLY_KEY = 2;
// flag.h
export const AUTOUNLOCK_KICK = 4;
// flag.h
export const AUTOUNLOCK_FORCE = 8;
// flag.h
export const NEW_MOON = 0;
// flag.h
export const FULL_MOON = 4;
// flag.h
export const PARANOID_CONFIRM = 0x0001;
// flag.h
export const PARANOID_QUIT = 0x0002;
// flag.h
export const PARANOID_DIE = 0x0004;
// flag.h
export const PARANOID_BONES = 0x0008;
// flag.h
export const PARANOID_HIT = 0x0010;
// flag.h
export const PARANOID_PRAY = 0x0020;
// flag.h
export const PARANOID_REMOVE = 0x0040;
// flag.h
export const PARANOID_BREAKWAND = 0x0080;
// flag.h
export const PARANOID_WERECHANGE = 0x0100;
// flag.h
export const PARANOID_EATING = 0x0200;
// flag.h
export const PARANOID_SWIM = 0x0400;
// flag.h
export const PARANOID_TRAP = 0x0800;
// flag.h
export const PARANOID_AUTOALL = 0x1000;
// flag.h
export const VI_NUMBER = 1;
// flag.h
export const VI_NAME = 2;
// flag.h
export const VI_BRANCH = 4;
// flag.h
export const NUM_DISCLOSURE_OPTIONS = 6;
// flag.h
export const DISCLOSE_PROMPT_DEFAULT_YES = 'y';
// flag.h
export const DISCLOSE_PROMPT_DEFAULT_NO = 'n';
// flag.h
export const DISCLOSE_PROMPT_DEFAULT_SPECIAL = '?';
// flag.h
export const DISCLOSE_YES_WITHOUT_PROMPT = '+';
// flag.h
export const DISCLOSE_NO_WITHOUT_PROMPT = '-';
// flag.h
export const GPCOORDS_NONE = 'n';
// flag.h
export const GPCOORDS_MAP = 'm';
// flag.h
export const GPCOORDS_COMPASS = 'c';
// flag.h
export const GPCOORDS_COMFULL = 'f';
// flag.h
export const GPCOORDS_SCREEN = 's';
// flag.h
export const TER_MAP = 0x01;
// flag.h
export const TER_TRP = 0x02;
// flag.h
export const TER_OBJ = 0x04;
// flag.h
export const TER_MON = 0x08;
// flag.h
export const TER_FULL = 0x10;
// flag.h
export const TER_DETECT = 0x20;
// flag.h
export const MAX_ALTKEYHANDLING = 25;

// ===== func_tab.h =====
// func_tab.h
export const IFBURIED = 0x0001;
// func_tab.h
export const AUTOCOMPLETE = 0x0002;
// func_tab.h
export const WIZMODECMD = 0x0004;
// func_tab.h
export const GENERALCMD = 0x0008;
// func_tab.h
export const CMD_NOT_AVAILABLE = 0x0010;
// func_tab.h
export const NOFUZZERCMD = 0x0020;
// func_tab.h
export const INTERNALCMD = 0x0040;
// func_tab.h
export const CMD_M_PREFIX = 0x0080;
// func_tab.h
export const PREFIXCMD = 0x0200;
// func_tab.h
export const MOVEMENTCMD = 0x0400;
// func_tab.h
export const MOUSECMD = 0x0800;
// func_tab.h
export const CMD_INSANE = 0x1000;
// func_tab.h
export const AUTOCOMP_ADJ = 0x2000;
// func_tab.h
export const ECM_NOFLAGS = 0;
// func_tab.h
export const ECM_IGNOREAC = 0x01;
// func_tab.h
export const ECM_EXACTMATCH = 0x02;
// func_tab.h
export const ECM_NO1CHARCMD = 0x04;

// ===== weight.h =====
// weight.h
export const WT_ETHEREAL = 0;
// weight.h
export const WT_SPLASH_THRESHOLD = 9;
// weight.h
export const WT_WEIGHTCAP_STRCON = 25;
// weight.h
export const WT_WEIGHTCAP_SPARE = 50;
// weight.h
export const WT_JELLY = 50;
// weight.h
export const WT_WOUNDEDLEG_REDUCT = 100;
// weight.h
export const WT_TO_DMG = 100;
// weight.h
export const WT_IRON_BALL_INCR = 160;
// weight.h
export const WT_IRON_BALL_BASE = 480;
// weight.h
export const WT_NOISY_INV = 500;
// weight.h
export const WT_NYMPH = 600;
// weight.h
export const WT_TOOMUCH_DIAGONAL = 600;
// weight.h
export const WT_ELF = 800;
// weight.h
export const WT_SQUEEZABLE_INV = 850;
// weight.h
export const MAX_CARR_CAP = 1000;
// weight.h
export const WT_HUMAN = 1450;
// weight.h
export const WT_BABY_DRAGON = 1500;
// weight.h
export const WT_DRAGON = 4500;

// ===== wintype.h =====
// wintype.h
export const ANY_VOID = 1;
// wintype.h
export const ANY_OBJ = (ANY_VOID + 1);
// wintype.h
export const ANY_MONST = (ANY_OBJ + 1);
// wintype.h
export const ANY_INT = (ANY_MONST + 1);
// wintype.h
export const ANY_CHAR = (ANY_INT + 1);
// wintype.h
export const ANY_UCHAR = (ANY_CHAR + 1);
// wintype.h
export const ANY_SCHAR = (ANY_UCHAR + 1);
// wintype.h
export const ANY_UINT = (ANY_SCHAR + 1);
// wintype.h
export const ANY_LONG = (ANY_UINT + 1);
// wintype.h
export const ANY_ULONG = (ANY_LONG + 1);
// wintype.h
export const ANY_IPTR = (ANY_ULONG + 1);
// wintype.h
export const ANY_UPTR = (ANY_IPTR + 1);
// wintype.h
export const ANY_LPTR = (ANY_UPTR + 1);
// wintype.h
export const ANY_ULPTR = (ANY_LPTR + 1);
// wintype.h
export const ANY_STR = (ANY_ULPTR + 1);
// wintype.h
export const ANY_NFUNC = (ANY_STR + 1);
// wintype.h
export const ANY_MASK32 = (ANY_NFUNC + 1);
// wintype.h
export const ANY_INVALID = (ANY_MASK32 + 1);
// wintype.h
export const NHW_LAST_TYPE = NHW_PERMINVENT;
// wintype.h
export const ATR_DIM = 2;
// wintype.h
export const ATR_ITALIC = 3;
// wintype.h
export const CLICK_1 = 1;
// wintype.h
export const CLICK_2 = 2;
// wintype.h
export const NUM_MOUSE_BUTTONS = 2;
// wintype.h
export const WIN_ERR = (-1);
// wintype.h
export const MENU_FIRST_PAGE = '^';
// wintype.h
export const MENU_LAST_PAGE = '|';
// wintype.h
export const MENU_NEXT_PAGE = '>';
// wintype.h
export const MENU_PREVIOUS_PAGE = '<';
// wintype.h
export const MENU_SELECT_ALL = '.';
// wintype.h
export const MENU_UNSELECT_ALL = '-';
// wintype.h
export const MENU_INVERT_ALL = '@';
// wintype.h
export const MENU_SELECT_PAGE = ',';
// wintype.h
export const MENU_UNSELECT_PAGE = '\\';
// wintype.h
export const MENU_INVERT_PAGE = '~';
// wintype.h
export const MENU_SEARCH = ':';
// wintype.h
export const MENU_ITEMFLAGS_NONE = 0x0000000;
// wintype.h
export const MENU_ITEMFLAGS_SELECTED = 0x0000001;
// wintype.h
export const MENU_ITEMFLAGS_SKIPINVERT = 0x0000002;
// wintype.h
export const MENU_ITEMFLAGS_SKIPMENUCOLORS = 0x0000004;

// ===== sym.h =====
// sym.h
export const H_UNK = 0;
// sym.h
export const H_IBM = 1;
// sym.h
export const H_DEC = 2;
// sym.h
export const H_CURS = 3;
// sym.h
export const H_MAC = 4;
// sym.h
export const H_UTF8 = 5;
// sym.h
export const PRIMARYSET = 0;
// sym.h
export const ROGUESET = 1;
// sym.h
export const NUM_GRAPHICS = (ROGUESET + 1);
// sym.h
export const UNICODESET = NUM_GRAPHICS;
// sym.h
export const DEFAULT_GRAPHICS = 0;

// ===== trap.h =====
// trap.h
export const TRAP_NOT_IMMUNE = 0;
// trap.h
export const TRAP_CLEARLY_IMMUNE = 1;
// trap.h
export const TRAP_HIDDEN_IMMUNE = 2;
// trap.h
export const ANIMATE_NORMAL = 0;
// trap.h
export const ANIMATE_SHATTER = 1;
// trap.h
export const ANIMATE_SPELL = 2;
// trap.h
export const AS_OK = 0;
// trap.h
export const AS_NO_MON = 1;
// trap.h
export const AS_MON_IS_UNIQUE = 2;

// ===== mkroom.h =====
// mkroom.h
export const ARMORSHOP = 15;
// mkroom.h
export const SCROLLSHOP = 16;
// mkroom.h
export const POTIONSHOP = 17;
// mkroom.h
export const WEAPONSHOP = 18;
// mkroom.h
export const FOODSHOP = 19;
// mkroom.h
export const RINGSHOP = 20;
// mkroom.h
export const WANDSHOP = 21;
// mkroom.h
export const TOOLSHOP = 22;
// mkroom.h
export const BOOKSHOP = 23;
// mkroom.h
export const FODDERSHOP = 24;
// mkroom.h
export const CANDLESHOP = 25;
// mkroom.h
export const D_SCATTER = 0;
// mkroom.h
export const D_SHOP = 1;
// mkroom.h
export const D_TEMPLE = 2;
// mkroom.h
export const MAXRTYPE = (CANDLESHOP);
// mkroom.h
export const UNIQUESHOP = (CANDLESHOP);
// mkroom.h
export const ANY_TYPE = (-1);
// mkroom.h
export const ANY_SHOP = (-2);
// mkroom.h
export const NO_ROOM = 0;
// mkroom.h
export const SHARED = 1;
// mkroom.h
export const SHARED_PLUS = 2;
// mkroom.h
export const FILL_LVFLAGS = 2;

// ===== obj.h =====
// obj.h
export const SPE_LIM = 99;
// obj.h
export const OBJ_FREE = 0;
// obj.h
export const OBJ_FLOOR = 1;
// obj.h
export const OBJ_CONTAINED = 2;
// obj.h
export const OBJ_INVENT = 3;
// obj.h
export const OBJ_MINVENT = 4;
// obj.h
export const OBJ_MIGRATING = 5;
// obj.h
export const OBJ_BURIED = 6;
// obj.h
export const OBJ_ONBILL = 7;
// obj.h
export const OBJ_LUAFREE = 8;
// obj.h
export const OBJ_DELETED = 9;
// obj.h
export const NOBJ_STATES = 10;
// obj.h
export const MAX_ERODE = 3;
// obj.h
export const MAX_EGG_HATCH_TIME = 200;
// obj.h
export const MAX_OIL_IN_FLASK = 400;
// obj.h
export const CONTAINED_TOO = 0x1;
// obj.h
export const BURIED_TOO = 0x2;
// obj.h
export const POTHIT_HERO_BASH = 0;
// obj.h
export const POTHIT_HERO_THROW = 1;
// obj.h
export const POTHIT_MONST_THROW = 2;
// obj.h
export const POTHIT_OTHER_THROW = 3;
// obj.h
export const LOST_NONE = 0;
// obj.h
export const LOST_THROWN = 1;
// obj.h
export const LOST_DROPPED = 2;
// obj.h
export const LOST_STOLEN = 3;
// obj.h
export const LOSTOVERRIDEMASK = 0x3;
// obj.h
export const LOST_EXPLODING = 4;
// obj.h
export const NAMED_PLAIN = 0;
// obj.h
export const NAMED_KEEP = 1;

// ===== quest.h =====
// quest.h
export const MIN_QUEST_ALIGN = 20;
// quest.h
export const MIN_QUEST_LEVEL = 14;

// ===== region.h =====
// region.h
export const REG_HERO_INSIDE = 0x01;
// region.h
export const REG_NOT_HEROS = 0x02;
// region.h
export const MONST_INC = 5;

// ===== rm.h =====
// rm.h
export const T_LOOTED = 1;
// rm.h
export const TREE_LOOTED = 1;
// rm.h
export const TREE_SWARM = 2;
// rm.h
export const F_LOOTED = 1;
// rm.h
export const F_WARNED = 2;
// rm.h
export const D_WARNED = 16;
// rm.h
export const S_LPUDDING = 1;
// rm.h
export const S_LDWASHER = 2;
// rm.h
export const S_LRING = 4;
// rm.h
export const W_NONDIGGABLE = 0x08;
// rm.h
export const W_NONPASSWALL = 0x10;
// rm.h
export const LA_UP = 1;
// rm.h
export const LA_DOWN = 2;
// rm.h
export const ICED_POOL = 8;
// rm.h
export const ICED_MOAT = 16;
// rm.h
export const SET_LIT_RANDOM = -1;
// rm.h
export const SET_LIT_NOCHANGE = -2;
// rm.h
export const WM_W_LEFT = 1;
// rm.h
export const WM_W_RIGHT = 2;
// rm.h
export const WM_W_TOP = WM_W_LEFT;
// rm.h
export const WM_W_BOTTOM = WM_W_RIGHT;
// rm.h
export const WM_T_LONG = 1;
// rm.h
export const WM_T_BL = 2;
// rm.h
export const WM_T_BR = 3;
// rm.h
export const WM_X_TL = 1;
// rm.h
export const WM_X_TR = 2;
// rm.h
export const WM_X_BL = 3;
// rm.h
export const WM_X_BR = 4;
// rm.h
export const WM_X_TLBR = 5;
// rm.h
export const WM_X_BLTR = 6;
// rm.h
export const SVALL = (0xFF);

// ===== sndprocs.h =====
// sndprocs.h
export const SOUND_TRIGGER_USERSOUNDS = 0x0001;
// sndprocs.h
export const SOUND_TRIGGER_HEROMUSIC = 0x0002;
// sndprocs.h
export const SOUND_TRIGGER_ACHIEVEMENTS = 0x0004;
// sndprocs.h
export const SOUND_TRIGGER_SOUNDEFFECTS = 0x0008;
// sndprocs.h
export const SOUND_TRIGGER_AMBIENCE = 0x0010;
// sndprocs.h
export const SOUND_TRIGGER_VERBAL = 0x0020;

// ===== spell.h =====
// spell.h
export const NO_SPELL = 0;
// spell.h
export const UNKNOWN_SPELL = (-1);
// spell.h
export const MAX_SPELL_STUDY = 3;
// spell.h
export const ALL_MAP = 0x1;
// spell.h
export const ALL_SPELLS = 0x2;

// ===== timeout.h =====
// timeout.h
export const TIMER_NONE = 0;
// timeout.h
export const TIMER_LEVEL = 1;
// timeout.h
export const TIMER_GLOBAL = 2;
// timeout.h
export const TIMER_OBJECT = 3;
// timeout.h
export const TIMER_MONSTER = 4;
// timeout.h
export const NUM_TIMER_KINDS = (TIMER_MONSTER + 1);
// timeout.h
export const ROT_ORGANIC = 0;
// timeout.h
export const ROT_CORPSE = (ROT_ORGANIC + 1);
// timeout.h
export const REVIVE_MON = (ROT_CORPSE + 1);
// timeout.h
export const ZOMBIFY_MON = (REVIVE_MON + 1);
// timeout.h
export const BURN_OBJECT = (ZOMBIFY_MON + 1);
// timeout.h
export const HATCH_EGG = (BURN_OBJECT + 1);
// timeout.h
export const FIG_TRANSFORM = (HATCH_EGG + 1);
// timeout.h
export const SHRINK_GLOB = (FIG_TRANSFORM + 1);
// timeout.h
export const RANGE_LEVEL = 0;
// timeout.h
export const RANGE_GLOBAL = 1;

// ===== winprocs.h =====
// winprocs.h
export const WC_COLOR = 0x00000001;
// winprocs.h
export const WC_HILITE_PET = 0x00000002;
// winprocs.h
export const WC_ASCII_MAP = 0x00000004;
// winprocs.h
export const WC_TILED_MAP = 0x00000008;
// winprocs.h
export const WC_PRELOAD_TILES = 0x00000010;
// winprocs.h
export const WC_TILE_WIDTH = 0x00000020;
// winprocs.h
export const WC_TILE_HEIGHT = 0x00000040;
// winprocs.h
export const WC_TILE_FILE = 0x00000080;
// winprocs.h
export const WC_INVERSE = 0x00000100;
// winprocs.h
export const WC_ALIGN_MESSAGE = 0x00000200;
// winprocs.h
export const WC_ALIGN_STATUS = 0x00000400;
// winprocs.h
export const WC_VARY_MSGCOUNT = 0x00000800;
// winprocs.h
export const WC_FONT_MAP = 0x00001000;
// winprocs.h
export const WC_FONT_MESSAGE = 0x00002000;
// winprocs.h
export const WC_FONT_STATUS = 0x00004000;
// winprocs.h
export const WC_FONT_MENU = 0x00008000;
// winprocs.h
export const WC_FONT_TEXT = 0x00010000;
// winprocs.h
export const WC_FONTSIZ_MAP = 0x00020000;
// winprocs.h
export const WC_FONTSIZ_MESSAGE = 0x040000;
// winprocs.h
export const WC_FONTSIZ_STATUS = 0x0080000;
// winprocs.h
export const WC_FONTSIZ_MENU = 0x00100000;
// winprocs.h
export const WC_FONTSIZ_TEXT = 0x00200000;
// winprocs.h
export const WC_SCROLL_MARGIN = 0x00400000;
// winprocs.h
export const WC_SPLASH_SCREEN = 0x00800000;
// winprocs.h
export const WC_POPUP_DIALOG = 0x01000000;
// winprocs.h
export const WC_SCROLL_AMOUNT = 0x02000000;
// winprocs.h
export const WC_EIGHT_BIT_IN = 0x04000000;
// winprocs.h
export const WC_PERM_INVENT = 0x08000000;
// winprocs.h
export const WC_MAP_MODE = 0x10000000;
// winprocs.h
export const WC_WINDOWCOLORS = 0x20000000;
// winprocs.h
export const WC_PLAYER_SELECTION = 0x40000000;
// winprocs.h
export const WC_MOUSE_SUPPORT = 0x80000000;
// winprocs.h
export const WC2_FULLSCREEN = 0x0001;
// winprocs.h
export const WC2_SOFTKEYBOARD = 0x0002;
// winprocs.h
export const WC2_WRAPTEXT = 0x0004;
// winprocs.h
export const WC2_HILITE_STATUS = 0x0008;
// winprocs.h
export const WC2_SELECTSAVED = 0x0010;
// winprocs.h
export const WC2_DARKGRAY = 0x0020;
// winprocs.h
export const WC2_HITPOINTBAR = 0x0040;
// winprocs.h
export const WC2_FLUSH_STATUS = 0x0080;
// winprocs.h
export const WC2_RESET_STATUS = 0x0100;
// winprocs.h
export const WC2_TERM_SIZE = 0x0200;
// winprocs.h
export const WC2_STATUSLINES = 0x0400;
// winprocs.h
export const WC2_WINDOWBORDERS = 0x0800;
// winprocs.h
export const WC2_PETATTR = 0x1000;
// winprocs.h
export const WC2_GUICOLOR = 0x2000;
// winprocs.h
export const WC2_URGENT_MESG = 0x4000;
// winprocs.h
export const WC2_SUPPRESS_HIST = 0x8000;
// winprocs.h
export const WC2_MENU_SHIFT = 0x010000;
// winprocs.h
export const WC2_U_UTF8STR = 0x020000;
// winprocs.h
export const WC2_EXTRACOLORS = 0x040000;
// winprocs.h
export const ALIGN_LEFT = 1;
// winprocs.h
export const ALIGN_RIGHT = 2;
// winprocs.h
export const ALIGN_TOP = 3;
// winprocs.h
export const ALIGN_BOTTOM = 4;
// winprocs.h
export const VIA_DIALOG = 0;
// winprocs.h
export const VIA_PROMPTS = 1;
// winprocs.h
export const MAP_MODE_TILES = 0;
// winprocs.h
export const MAP_MODE_ASCII_FIT_TO_SCREEN = 10;
// winprocs.h
export const MAP_MODE_TILES_FIT_TO_SCREEN = 11;
// winprocs.h
export const RS_NAME = 0;
// winprocs.h
export const RS_ROLE = 1;
// winprocs.h
export const RS_RACE = 2;
// winprocs.h
export const RS_GENDER = 3;
// winprocs.h
export const RS_ALGNMNT = 4;
// winprocs.h
export const WININIT = 0;
// winprocs.h
export const WININIT_UNDO = 1;
// winprocs.h
export const WINCHAIN_ALLOC = 0;
// winprocs.h
export const WINCHAIN_INIT = 1;

// ===== mextra.h =====
// mextra.h
export const FCSIZ = (ROWNO + COLNO);
// mextra.h
export const REPAIR_DELAY = 5;
// mextra.h
export const BILLSZ = 200;

// ===== monst.h =====
// monst.h
export const M_AP_NOTHING = 0;
// monst.h
export const M_AP_FURNITURE = 1;
// monst.h
export const M_AP_OBJECT = 2;
// monst.h
export const M_AP_MONSTER = 3;
// monst.h
export const M_SEEN_NOTHING = 0x0000;
// monst.h
export const M_SEEN_MAGR = 0x0001;
// monst.h
export const M_SEEN_FIRE = 0x0002;
// monst.h
export const M_SEEN_COLD = 0x0004;
// monst.h
export const M_SEEN_SLEEP = 0x0008;
// monst.h
export const M_SEEN_DISINT = 0x0010;
// monst.h
export const M_SEEN_ELEC = 0x0020;
// monst.h
export const M_SEEN_POISON = 0x0040;
// monst.h
export const M_SEEN_ACID = 0x0080;
// monst.h
export const M_SEEN_REFL = 0x0100;
// monst.h
export const MINV_PICKMASK = 0x03;
// monst.h
export const MINV_NOLET = 0x04;
// monst.h
export const MINV_ALL = 0x08;
// monst.h
export const MON_FLOOR = 0x00;
// monst.h
export const MON_OFFMAP = 0x01;
// monst.h
export const MON_DETACH = 0x02;
// monst.h
export const MON_MIGRATING = 0x04;
// monst.h
export const MON_LIMBO = 0x08;
// monst.h
export const MON_BUBBLEMOVE = 0x10;
// monst.h
export const MON_ENDGAME_FREE = 0x20;
// monst.h
export const MON_ENDGAME_MIGR = 0x40;
// monst.h
export const MON_OBLITERATE = 0x80;
// monst.h
export const M_AP_TYPMASK = 0x7;
// monst.h
export const M_AP_F_DKNOWN = 0x8;
// monst.h
export const MAX_NUM_WORMS = 32;
// monst.h
export const STRAT_APPEARMSG = 0x80000000;
// monst.h
export const STRAT_ARRIVE = 0x40000000;
// monst.h
export const STRAT_WAITFORU = 0x20000000;
// monst.h
export const STRAT_CLOSE = 0x10000000;
// monst.h
export const STRAT_WAITMASK = (STRAT_CLOSE | STRAT_WAITFORU);
// monst.h
export const STRAT_HEAL = 0x08000000;
// monst.h
export const STRAT_GROUND = 0x04000000;
// monst.h
export const STRAT_MONSTR = 0x02000000;
// monst.h
export const STRAT_PLAYER = 0x01000000;
// monst.h
export const STRAT_NONE = 0x00000000;
// monst.h
export const STRAT_STRATMASK = 0x0f000000;
// monst.h
export const STRAT_GOAL = 0x000000ff;
// monst.h
export const MSLOW = 1;
// monst.h
export const MFAST = 2;

// ===== you.h =====
// you.h
export const UTOTYPE_NONE = 0x00;
// you.h
export const UTOTYPE_ATSTAIRS = 0x01;
// you.h
export const UTOTYPE_FALLING = 0x02;
// you.h
export const UTOTYPE_PORTAL = 0x04;
// you.h
export const UTOTYPE_RMPORTAL = 0x10;
// you.h
export const UTOTYPE_DEFERRED = 0x20;
// you.h
export const ROLE_RACEMASK = 0x0ff8;
// you.h
export const ROLE_GENDMASK = 0xf000;
// you.h
export const ROLE_MALE = 0x1000;
// you.h
export const ROLE_FEMALE = 0x2000;
// you.h
export const ROLE_NEUTER = 0x4000;
// you.h
export const ROLE_ALIGNMASK = AM_MASK;
// you.h
export const ROLE_LAWFUL = AM_LAWFUL;
// you.h
export const ROLE_NEUTRAL = AM_NEUTRAL;
// you.h
export const ROLE_CHAOTIC = AM_CHAOTIC;
// you.h
export const ROLE_NONE = (-1);
// you.h
export const ROLE_RANDOM = (-2);
// you.h
export const ROLE_GENDERS = 2;
// you.h
export const PRONOUN_NORMAL = 0;
// you.h
export const PRONOUN_NO_IT = 1;
// you.h
export const PRONOUN_HALLU = 2;
// you.h
export const ROLE_ALIGNS = 3;
// you.h
export const SICK_ALL = 0x03;
// you.h
export const RIGHT_HANDED = 0x00;
// you.h
export const LEFT_HANDED = 0x01;
// you.h
export const CONVERT = 2;
// you.h
export const A_ORIGINAL = 1;
// you.h
export const A_CURRENT = 0;
// you.h
export const LUCKADD = 3;
// you.h
export const LUCKMAX = 10;
// you.h
export const LUCKMIN = (-10);
// you.h
export const AC_MAX = 99;

// ===== hack.h =====
// hack.h
export const ZAPPED_WAND = 0;
// hack.h
export const THROWN_WEAPON = 1;
// hack.h
export const THROWN_TETHERED_WEAPON = 2;
// hack.h
export const KICKED_WEAPON = 3;
// hack.h
export const FLASHED_LIGHT = 4;
// hack.h
export const INVIS_BEAM = 5;
// hack.h
export const NO_PART = -1;
// hack.h
export const CONS_OBJ = 0;
// hack.h
export const CONS_MON = (CONS_OBJ + 1);
// hack.h
export const CONS_HERO = (CONS_MON + 1);
// hack.h
export const CONS_TRAP = (CONS_HERO + 1);
// hack.h
export const NUM_CQS = (CQ_REPEAT + 1);
// hack.h
export const NHKF_ESC = 0;
// hack.h
export const NHKF_GETDIR_SELF = (NHKF_ESC + 1);
// hack.h
export const NHKF_GETDIR_SELF2 = (NHKF_GETDIR_SELF + 1);
// hack.h
export const NHKF_GETDIR_HELP = (NHKF_GETDIR_SELF2 + 1);
// hack.h
export const NHKF_GETDIR_MOUSE = (NHKF_GETDIR_HELP + 1);
// hack.h
export const NHKF_COUNT = (NHKF_GETDIR_MOUSE + 1);
// hack.h
export const NHKF_GETPOS_SELF = (NHKF_COUNT + 1);
// hack.h
export const NHKF_GETPOS_PICK = (NHKF_GETPOS_SELF + 1);
// hack.h
export const NHKF_GETPOS_PICK_Q = (NHKF_GETPOS_PICK + 1);
// hack.h
export const NHKF_GETPOS_PICK_O = (NHKF_GETPOS_PICK_Q + 1);
// hack.h
export const NHKF_GETPOS_PICK_V = (NHKF_GETPOS_PICK_O + 1);
// hack.h
export const NHKF_GETPOS_SHOWVALID = (NHKF_GETPOS_PICK_V + 1);
// hack.h
export const NHKF_GETPOS_AUTODESC = (NHKF_GETPOS_SHOWVALID + 1);
// hack.h
export const NHKF_GETPOS_MON_NEXT = (NHKF_GETPOS_AUTODESC + 1);
// hack.h
export const NHKF_GETPOS_MON_PREV = (NHKF_GETPOS_MON_NEXT + 1);
// hack.h
export const NHKF_GETPOS_OBJ_NEXT = (NHKF_GETPOS_MON_PREV + 1);
// hack.h
export const NHKF_GETPOS_OBJ_PREV = (NHKF_GETPOS_OBJ_NEXT + 1);
// hack.h
export const NHKF_GETPOS_DOOR_NEXT = (NHKF_GETPOS_OBJ_PREV + 1);
// hack.h
export const NHKF_GETPOS_DOOR_PREV = (NHKF_GETPOS_DOOR_NEXT + 1);
// hack.h
export const NHKF_GETPOS_UNEX_NEXT = (NHKF_GETPOS_DOOR_PREV + 1);
// hack.h
export const NHKF_GETPOS_UNEX_PREV = (NHKF_GETPOS_UNEX_NEXT + 1);
// hack.h
export const NHKF_GETPOS_INTERESTING_NEXT = (NHKF_GETPOS_UNEX_PREV + 1);
// hack.h
export const NHKF_GETPOS_INTERESTING_PREV = (NHKF_GETPOS_INTERESTING_NEXT + 1);
// hack.h
export const NHKF_GETPOS_VALID_NEXT = (NHKF_GETPOS_INTERESTING_PREV + 1);
// hack.h
export const NHKF_GETPOS_VALID_PREV = (NHKF_GETPOS_VALID_NEXT + 1);
// hack.h
export const NHKF_GETPOS_HELP = (NHKF_GETPOS_VALID_PREV + 1);
// hack.h
export const NHKF_GETPOS_MENU = (NHKF_GETPOS_HELP + 1);
// hack.h
export const NHKF_GETPOS_LIMITVIEW = (NHKF_GETPOS_MENU + 1);
// hack.h
export const NHKF_GETPOS_MOVESKIP = (NHKF_GETPOS_LIMITVIEW + 1);
// hack.h
export const NUM_NHKF = (NHKF_GETPOS_MOVESKIP + 1);
// hack.h
export const COST_CANCEL = 0;
// hack.h
export const COST_DRAIN = 1;
// hack.h
export const COST_UNCHRG = 2;
// hack.h
export const COST_UNBLSS = 3;
// hack.h
export const COST_UNCURS = 4;
// hack.h
export const COST_DECHNT = 5;
// hack.h
export const COST_DEGRD = 6;
// hack.h
export const COST_DILUTE = 7;
// hack.h
export const COST_ERASE = 8;
// hack.h
export const COST_BURN = 9;
// hack.h
export const COST_NUTRLZ = 10;
// hack.h
export const COST_DSTROY = 11;
// hack.h
export const COST_SPLAT = 12;
// hack.h
export const COST_BITE = 13;
// hack.h
export const COST_OPEN = 14;
// hack.h
export const COST_BRKLCK = 15;
// hack.h
export const COST_RUST = 16;
// hack.h
export const COST_ROT = 17;
// hack.h
export const COST_CORRODE = 18;
// hack.h
export const COST_CRACK = 19;
// hack.h
export const COST_NOCONTENTS = 0;
// hack.h
export const COST_CONTENTS = 1;
// hack.h
export const COST_SINGLEOBJ = 2;
// hack.h
export const ARG_DEBUG = 0;
// hack.h
export const ARG_VERSION = (ARG_DEBUG + 1);
// hack.h
export const ARG_DUMPGLYPHIDS = (ARG_VERSION + 1);
// hack.h
export const ARG_DUMPMONGEN = (ARG_DUMPGLYPHIDS + 1);
// hack.h
export const LOOK_TRADITIONAL = 0;
// hack.h
export const LOOK_QUICK = 1;
// hack.h
export const LOOK_ONCE = 2;
// hack.h
export const LOOK_VERBOSE = 3;
// hack.h
export const HMON_MELEE = 0;
// hack.h
export const HMON_THROWN = 1;
// hack.h
export const HMON_KICKED = 2;
// hack.h
export const HMON_APPLIED = 3;
// hack.h
export const HMON_DRAGGED = 4;
// hack.h
export const SATIATED = 0;
// hack.h
export const NOT_HUNGRY = 1;
// hack.h
export const HUNGRY = 2;
// hack.h
export const WEAK = 3;
// hack.h
export const FAINTING = 4;
// hack.h
export const FAINTED = 5;
// hack.h
export const STARVED = 6;
// hack.h
export const MV_ANY = -1;
// hack.h
export const MV_WALK = (MV_ANY + 1);
// hack.h
export const MV_RUN = (MV_WALK + 1);
// hack.h
export const MV_RUSH = (MV_RUN + 1);
// hack.h
export const N_MOVEMODES = (MV_RUSH + 1);
// hack.h
export const DIR_ERR = -1;
// hack.h
export const NHCORE_START_NEW_GAME = 0;
// hack.h
export const NHCORE_RESTORE_OLD_GAME = (NHCORE_START_NEW_GAME + 1);
// hack.h
export const NHCORE_MOVELOOP_TURN = (NHCORE_RESTORE_OLD_GAME + 1);
// hack.h
export const NHCORE_GAME_EXIT = (NHCORE_MOVELOOP_TURN + 1);
// hack.h
export const NHCORE_GETPOS_TIP = (NHCORE_GAME_EXIT + 1);
// hack.h
export const NHCORE_ENTER_TUTORIAL = (NHCORE_GETPOS_TIP + 1);
// hack.h
export const NHCORE_LEAVE_TUTORIAL = (NHCORE_ENTER_TUTORIAL + 1);
// hack.h
export const NUM_NHCORE_CALLS = (NHCORE_LEAVE_TUTORIAL + 1);
// hack.h
export const NHCB_CMD_BEFORE = 0;
// hack.h
export const NHCB_LVL_ENTER = (NHCB_CMD_BEFORE + 1);
// hack.h
export const NHCB_LVL_LEAVE = (NHCB_LVL_ENTER + 1);
// hack.h
export const NHCB_END_TURN = (NHCB_LVL_LEAVE + 1);
// hack.h
export const NUM_NHCB = (NHCB_END_TURN + 1);
// hack.h
export const POLY_NOFLAGS = 0x00;
// hack.h
export const POLY_CONTROLLED = 0x01;
// hack.h
export const POLY_MONSTER = 0x02;
// hack.h
export const POLY_REVERT = 0x04;
// hack.h
export const POLY_LOW_CTRL = 0x08;
// hack.h
export const REST_GSTATE = 1;
// hack.h
export const REST_LEVELS = 2;
// hack.h
export const REST_CURRENT_LEVEL = 3;
// hack.h
export const VANQ_MLVL_MNDX = 0;
// hack.h
export const VANQ_MSTR_MNDX = (VANQ_MLVL_MNDX + 1);
// hack.h
export const VANQ_ALPHA_SEP = (VANQ_MSTR_MNDX + 1);
// hack.h
export const VANQ_ALPHA_MIX = (VANQ_ALPHA_SEP + 1);
// hack.h
export const VANQ_MCLS_HTOL = (VANQ_ALPHA_MIX + 1);
// hack.h
export const VANQ_MCLS_LTOH = (VANQ_MCLS_HTOL + 1);
// hack.h
export const VANQ_COUNT_H_L = (VANQ_MCLS_LTOH + 1);
// hack.h
export const VANQ_COUNT_L_H = (VANQ_COUNT_H_L + 1);
// hack.h
export const NUM_VANQ_ORDER_MODES = (VANQ_COUNT_L_H + 1);
// hack.h
export const NUM_SAVEFORMATS = 0;
// hack.h
export const TELL = 1;
// hack.h
export const NOTELL = 0;
// hack.h
export const ON = 1;
// hack.h
export const OFF = 0;
// hack.h
export const DEF_NOTHING = ' ';
// hack.h
export const BY_ORACLE = 0;
// hack.h
export const BY_COOKIE = 1;
// hack.h
export const BY_PAPER = 2;
// hack.h
export const BY_OTHER = 9;
// hack.h
export const CXN_NORMAL = 0;
// hack.h
export const CXN_SINGULAR = 1;
// hack.h
export const CXN_NO_PFX = 2;
// hack.h
export const CXN_PFX_THE = 4;
// hack.h
export const CXN_ARTICLE = 8;
// hack.h
export const CXN_NOCORPSE = 16;
// hack.h
export const SELL_NORMAL = (0);
// hack.h
export const SELL_DELIBERATE = (1);
// hack.h
export const SELL_DONTSELL = (2);
// hack.h
export const SHOP_DOOR_COST = 400;
// hack.h
export const SHOP_BARS_COST = 300;
// hack.h
export const SHOP_HOLE_COST = 200;
// hack.h
export const SHOP_WALL_COST = 200;
// hack.h
export const SHOP_PIT_COST = 100;
// hack.h
export const SHOP_WEB_COST = 30;
// hack.h
export const LOOKHERE_NOFLAGS = 0;
// hack.h
export const LOOKHERE_PICKED_SOME = 1;
// hack.h
export const LOOKHERE_SKIP_DFEATURE = 2;
// hack.h
export const WINTYPELEN = 16;
// hack.h
export const MAX_BMASK = 4;
// hack.h
export const CONTAINED_SYM = '>';
// hack.h
export const HANDS_SYM = '-';
// hack.h
export const MSGTYP_NORMAL = 0;
// hack.h
export const MSGTYP_NOREP = 1;
// hack.h
export const MSGTYP_NOSHOW = 2;
// hack.h
export const MSGTYP_STOP = 3;
// hack.h
export const MSGTYP_MASK_REP_SHOW = ((1 << MSGTYP_NOREP) | (1 << MSGTYP_NOSHOW));
// hack.h
export const NUM_ROLES = (13);
// hack.h
export const NUM_RACES = (5);
// hack.h
export const UTD_CHECKSIZES = 0x01;
// hack.h
export const UTD_CHECKFIELDCOUNTS = 0x02;
// hack.h
export const UTD_SKIP_SANITY1 = 0x04;
// hack.h
export const UTD_SKIP_SAVEFILEINFO = 0x08;
// hack.h
export const UTD_WITHOUT_WAITSYNCH_PERFILE = 0x10;
// hack.h
export const UTD_QUIETLY = 0x20;
// hack.h
export const SF_UPTODATE = 0;
// hack.h
export const SF_OUTDATED = 1;
// hack.h
export const SF_CRITICAL_BYTE_COUNT_MISMATCH = 2;
// hack.h
export const SF_DM_IL32LLP64_ON_ILP32LL64 = 3;
// hack.h
export const SF_DM_I32LP64_ON_ILP32LL64 = 4;
// hack.h
export const SF_DM_ILP32LL64_ON_I32LP64 = 5;
// hack.h
export const SF_DM_ILP32LL64_ON_IL32LLP64 = 6;
// hack.h
export const SF_DM_I32LP64_ON_IL32LLP64 = 7;
// hack.h
export const SF_DM_IL32LLP64_ON_I32LP64 = 8;
// hack.h
export const SF_DM_MISMATCH = 9;
// hack.h
export const ENTITIES = 2;
// hack.h
export const NHF_LEVELFILE = 1;
// hack.h
export const NHF_SAVEFILE = 2;
// hack.h
export const NHF_BONESFILE = 3;
// hack.h
export const READING = 0x0;
// hack.h
export const COUNTING = 0x01;
// hack.h
export const WRITING = 0x02;
// hack.h
export const FREEING = 0x04;
// hack.h
export const CONVERTING = 0x08;
// hack.h
export const UNCONVERTING = 0x10;
// hack.h
export const HACKPREFIX = 0;
// hack.h
export const LEVELPREFIX = 1;
// hack.h
export const SAVEPREFIX = 2;
// hack.h
export const BONESPREFIX = 3;
// hack.h
export const DATAPREFIX = 4;
// hack.h
export const SCOREPREFIX = 5;
// hack.h
export const LOCKPREFIX = 6;
// hack.h
export const SYSCONFPREFIX = 7;
// hack.h
export const CONFIGPREFIX = 8;
// hack.h
export const TROUBLEPREFIX = 9;
// hack.h
export const PREFIX_COUNT = 10;
// hack.h
export const FQN_MAX_FILENAME = 512;
// hack.h
export const MAX_MENU_MAPPED_CMDS = 32;
// hack.h
export const BP_ALIGN = 0;
// hack.h
export const BP_GEND = 1;
// hack.h
export const BP_RACE = 2;
// hack.h
export const BP_ROLE = 3;
// hack.h
export const NUM_BP = 4;
// hack.h
export const WIZKIT_MAX = 128;
// hack.h
export const CVT_BUF_SIZE = 64;
// hack.h
export const LUA_VER_BUFSIZ = 20;
// hack.h
export const LUA_COPYRIGHT_BUFSIZ = 120;
// hack.h
export const SYM_OFF_P = (0);
// hack.h
export const UNDEFINED_VALUE = 0;
// hack.h
export const MM_ANGRY = 0x00000020;
// hack.h
export const MM_EGD = 0x00000080;
// hack.h
export const MM_EPRI = 0x00000100;
// hack.h
export const MM_ESHK = 0x00000200;
// hack.h
export const MM_EMIN = 0x00000400;
// hack.h
export const MM_NOTAIL = 0x00004000;
// hack.h
export const MM_MINVIS = 0x00100000;
// hack.h
export const MHID_PREFIX = 1;
// hack.h
export const MHID_ARTICLE = 2;
// hack.h
export const MHID_ALTMON = 4;
// hack.h
export const MHID_REGION = 8;
// hack.h
export const MIM_REVEAL = 1;
// hack.h
export const MIM_OMIT_WAIT = 2;
// hack.h
export const CORPSTAT_NONE = 0x00;
// hack.h
export const CORPSTAT_GENDER = 0x03;
// hack.h
export const CORPSTAT_HISTORIC = 0x04;
// hack.h
export const CORPSTAT_SPE_VAL = 0x07;
// hack.h
export const CORPSTAT_INIT = 0x08;
// hack.h
export const CORPSTAT_BURIED = 0x10;
// hack.h
export const CORPSTAT_RANDOM = 0;
// hack.h
export const CORPSTAT_FEMALE = 1;
// hack.h
export const CORPSTAT_MALE = 2;
// hack.h
export const CORPSTAT_NEUTER = 3;
// hack.h
export const CC_NO_FLAGS = 0x00;
// hack.h
export const CC_INCL_CENTER = 0x01;
// hack.h
export const CC_UNSHUFFLED = 0x02;
// hack.h
export const CC_RING_PAIRS = 0x04;
// hack.h
export const CC_SKIP_MONS = 0x08;
// hack.h
export const CC_SKIP_INACCS = 0x10;
// hack.h
export const SHIFT_SEENMSG = 0x01;
// hack.h
export const SHIFT_MSG = 0x02;
// hack.h
export const DF_NONE = 0x00;
// hack.h
export const DF_RANDOM = 0x01;
// hack.h
export const DF_ALL = 0x04;
// hack.h
export const DEFUNCT_MONSTER = (-100);
// hack.h
export const ALL_FINISHED = 0x01;
// hack.h
export const BY_NEXTHERE = 0x0001;
// hack.h
export const INCLUDE_VENOM = 0x0002;
// hack.h
export const AUTOSELECT_SINGLE = 0x0004;
// hack.h
export const USE_INVLET = 0x0008;
// hack.h
export const INVORDER_SORT = 0x0010;
// hack.h
export const SIGNAL_NOMENU = 0x0020;
// hack.h
export const SIGNAL_ESCAPE = 0x0040;
// hack.h
export const FEEL_COCKATRICE = 0x0080;
// hack.h
export const INCLUDE_HERO = 0x0100;
// hack.h
export const UNPAID_TYPES = 0x0004;
// hack.h
export const GOLD_TYPES = 0x0008;
// hack.h
export const WORN_TYPES = 0x0010;
// hack.h
export const ALL_TYPES = 0x0020;
// hack.h
export const BILLED_TYPES = 0x0040;
// hack.h
export const CHOOSE_ALL = 0x0080;
// hack.h
export const JUSTPICKED = 0x1000;
// hack.h
export const ALL_TYPES_SELECTED = -2;
// hack.h
export const ONAME_SKIP_INVUPD = 0x0200;
// hack.h
export const FM_FMON = 0x01;
// hack.h
export const FM_MIGRATE = 0x02;
// hack.h
export const FM_MYDOGS = 0x04;
// hack.h
export const FM_YOU = 0x08;
// hack.h
export const FM_EVERYWHERE = (FM_YOU | FM_FMON | FM_MIGRATE | FM_MYDOGS);
// hack.h
export const PICK_RANDOM = 0;
// hack.h
export const PICK_RIGID = 1;
// hack.h
export const NO_TRAP_FLAGS = 0x00;
// hack.h
export const HURTLING = 0x80;
// hack.h
export const MMOVE_NOTHING = 0;
// hack.h
export const MMOVE_MOVED = 1;
// hack.h
export const MMOVE_DIED = 2;
// hack.h
export const MMOVE_DONE = 3;
// hack.h
export const MMOVE_NOMOVES = 4;
// hack.h
export const VIS_EFFECTS = 0x01;
// hack.h
export const ROLL = 0x01;
// hack.h
export const FLING = 0x02;
// hack.h
export const LAUNCH_UNSEEN = 0x40;
// hack.h
export const LAUNCH_KNOWN = 0x80;
// hack.h
export const BASICENLIGHTENMENT = 1;
// hack.h
export const MAGICENLIGHTENMENT = 2;
// hack.h
export const ENL_GAMEINPROGRESS = 0;
// hack.h
export const ENL_GAMEOVERALIVE = 1;
// hack.h
export const ENL_GAMEOVERDEAD = 2;
// hack.h
export const SORTLOOT_PACK = 0x01;
// hack.h
export const SORTLOOT_INVLET = 0x02;
// hack.h
export const SORTLOOT_LOOT = 0x04;
// hack.h
export const SORTLOOT_INUSE = 0x08;
// hack.h
export const SORTLOOT_PETRIFY = 0x20;
// hack.h
export const PLINE_NOREPEAT = 1;
// hack.h
export const OVERRIDE_MSGTYPE = 2;
// hack.h
export const SUPPRESS_HISTORY = 4;
// hack.h
export const URGENT_MESSAGE = 8;
// hack.h
export const PLINE_VERBALIZE = 16;
// hack.h
export const PLINE_SPEECH = 32;
// hack.h
export const NO_CURS_ON_U = 64;
// hack.h
export const GC_NOFLAGS = 0;
// hack.h
export const GC_SAVEHIST = 1;
// hack.h
export const GC_CONDHIST = 2;
// hack.h
export const GC_ECHOFIRST = 4;
// hack.h
export const ROTTEN_TIN = 0;
// hack.h
export const HOMEMADE_TIN = 1;
// hack.h
export const SPINACH_TIN = (-1);
// hack.h
export const RANDOM_TIN = (-2);
// hack.h
export const HEALTHY_TIN = (-3);
// hack.h
export const TROLL_REVIVE_CHANCE = 37;
// hack.h
export const ROT_AGE = (250);
// hack.h
export const WAND_BACKFIRE_CHANCE = 100;
// hack.h
export const WAND_WREST_CHANCE = 121;
// hack.h
export const MENU_TRADITIONAL = 0;
// hack.h
export const MENU_COMBINATION = 1;
// hack.h
export const MENU_FULL = 2;
// hack.h
export const MENU_PARTIAL = 3;
// hack.h
export const MON_POLE_DIST = 5;
// hack.h
export const PET_MISSILE_RANGE2 = 36;
// hack.h
export const BRK_BY_HERO = 0x01;
// hack.h
export const BRK_FROM_INV = 0x02;
// hack.h
export const BRK_KNOWN2BREAK = 0x04;
// hack.h
export const BRK_KNOWN2NOTBREAK = 0x08;
// hack.h
export const BRK_KNOWN_OUTCOME = (BRK_KNOWN2BREAK | BRK_KNOWN2NOTBREAK);
// hack.h
export const BRK_MELEE = 0x10;
// hack.h
export const ECMD_OK = 0x00;
// hack.h
export const ECMD_TIME = 0x01;
// hack.h
export const ECMD_CANCEL = 0x02;
// hack.h
export const ECMD_FAIL = 0x04;
// hack.h
export const NO_NC_FLAGS = 0;
// hack.h
export const NC_SHOW_MSG = 0x01;
// hack.h
export const NC_VIA_WAND_OR_SPELL = 0x02;
// hack.h
export const PHYS_EXPL_TYPE = -1;
// hack.h
export const DEVTEAM_EMAIL = "devteam@nethack.org";
// hack.h
export const DEVTEAM_URL = "https://www.nethack.org/";

// ===== isaac64.h =====
// isaac64.h
export const ISAAC64_SZ_LOG = (8);
// isaac64.h
export const ISAAC64_SZ = (1<<ISAAC64_SZ_LOG);
// isaac64.h
export const ISAAC64_SEED_SZ_MAX = (ISAAC64_SZ<<3);

// ===== mail.h =====
// mail.h
export const MSG_OTHER = 0;
// mail.h
export const MSG_MAIL = 1;
// mail.h
export const MSG_CALL = 2;

// ===== nhmd4.h =====
// nhmd4.h
export const NHMD4_DIGEST_LENGTH = 128;
// nhmd4.h
export const NHMD4_RESULTLEN = (128 / 8);

// ===== sfprocs.h =====
// sfprocs.h
export const NHTYPE_SIMPLE = 1;
// sfprocs.h
export const NHTYPE_COMPLEX = 2;

// ===== sp_lev.h =====
// sp_lev.h
export const LVLINIT_NONE = 0;
// sp_lev.h
export const LVLINIT_SOLIDFILL = (LVLINIT_NONE + 1);
// sp_lev.h
export const LVLINIT_MAZEGRID = (LVLINIT_SOLIDFILL + 1);
// sp_lev.h
export const LVLINIT_MAZE = (LVLINIT_MAZEGRID + 1);
// sp_lev.h
export const LVLINIT_MINES = (LVLINIT_MAZE + 1);
// sp_lev.h
export const LVLINIT_ROGUE = (LVLINIT_MINES + 1);
// sp_lev.h
export const LVLINIT_SWAMP = (LVLINIT_ROGUE + 1);
// sp_lev.h
export const W_RANDOM = -1;
// sp_lev.h
export const W_NORTH = 1;
// sp_lev.h
export const W_SOUTH = 2;
// sp_lev.h
export const W_EAST = 4;
// sp_lev.h
export const W_WEST = 8;
// sp_lev.h
export const W_ANY = (W_NORTH | W_SOUTH | W_EAST | W_WEST);
// sp_lev.h
export const MAP_X_LIM = 76;
// sp_lev.h
export const MAP_Y_LIM = 21;
// sp_lev.h
export const NOTELEPORT = 0x00000001;
// sp_lev.h
export const HARDFLOOR = 0x00000002;
// sp_lev.h
export const NOMMAP = 0x00000004;
// sp_lev.h
export const SHORTSIGHTED = 0x00000008;
// sp_lev.h
export const ARBOREAL = 0x00000010;
// sp_lev.h
export const MAZELEVEL = 0x00000020;
// sp_lev.h
export const PREMAPPED = 0x00000040;
// sp_lev.h
export const SHROUD = 0x00000080;
// sp_lev.h
export const GRAVEYARD = 0x00000100;
// sp_lev.h
export const ICEDPOOLS = 0x00000200;
// sp_lev.h
export const SOLIDIFY = 0x00000400;
// sp_lev.h
export const CORRMAZE = 0x00000800;
// sp_lev.h
export const CHECK_INACCESSIBLES = 0x00001000;
// sp_lev.h
export const MAX_NESTED_ROOMS = 5;
// sp_lev.h
export const SP_OBJ_CONTENT = 0x1;
// sp_lev.h
export const SP_OBJ_CONTAINER = 0x2;
// sp_lev.h
export const SPOFILTER_PERCENT = 0;
// sp_lev.h
export const SPOFILTER_SELECTION = 1;
// sp_lev.h
export const SPOFILTER_MAPCHAR = 2;
// sp_lev.h
export const SEL_GRADIENT_RADIAL = 0;
// sp_lev.h
export const SEL_GRADIENT_SQUARE = 1;
// sp_lev.h
export const SP_COORD_IS_RANDOM = 0x01000000;
// sp_lev.h
export const DRY = 0x01;
// sp_lev.h
export const WET = 0x02;
// sp_lev.h
export const HOT = 0x04;
// sp_lev.h
export const SOLID = 0x08;
// sp_lev.h
export const ANY_LOC = 0x10;
// sp_lev.h
export const NO_LOC_WARN = 0x20;
// sp_lev.h
export const SPACELOC = 0x40;
// sp_lev.h
export const NO_INVENT = 0;
// sp_lev.h
export const CUSTOM_INVENT = 0x01;
// sp_lev.h
export const DEFAULT_INVENT = 0x02;

// ===== tile2x11.h =====
// tile2x11.h
export const TILES_PER_ROW = (40);

// ===== winX.h =====
// winX.h
export const START_SIZE = 512;
// winX.h
export const MAX_WINDOWS = 20;
// winX.h
export const NHW_NONE = 0;
// winX.h
export const NO_CLICK = 0;
// winX.h
export const DEFAULT_MESSAGE_WIDTH = 60;
// winX.h
export const DISPLAY_FILE_SIZE = 35;
// winX.h
export const MAX_KEY_STRING = 64;
// winX.h
export const DEFAULT_LINES_DISPLAYED = 12;
// winX.h
export const YN_NORMAL = 0;
// winX.h
export const YN_NO_LOGMESG = 1;
// winX.h
export const YN_NO_DEFAULT = 2;
// winX.h
export const EXIT_ON_KEY_PRESS = 0;
// winX.h
export const EXIT_ON_KEY_OR_BUTTON_PRESS = 1;
// winX.h
export const EXIT_ON_EXIT = 2;
// winX.h
export const EXIT_ON_SENT_EVENT = 3;

// ===== winami.h =====
// winami.h
export const WEUNK = 0;
// winami.h
export const WEKEY = (WEUNK + 1);
// winami.h
export const WEMOUSE = (WEKEY + 1);
// winami.h
export const WEMENU = (WEMOUSE + 1);
// winami.h
export const MAXWINTAGS = 5;
// winami.h
export const FLMAP_INGLYPH = 1;
// winami.h
export const FLMAP_CURSUP = 2;
// winami.h
export const FLMAP_SKIP = 4;
// winami.h
export const FLMSG_FIRST = 1;
// winami.h
export const MAXWIN = 20;
// winami.h
export const NHW_BASE = 6;
// winami.h
export const NHW_OVER = 7;

// ===== wincurs.h =====
// wincurs.h
export const CENTER = 0;
// wincurs.h
export const UP = (CENTER + 1);
// wincurs.h
export const DOWN = (UP + 1);
// wincurs.h
export const RIGHT = (DOWN + 1);
// wincurs.h
export const LEFT = (RIGHT + 1);
// wincurs.h
export const UNDEFINED = (LEFT + 1);
// wincurs.h
export const NHW_END = 19;
// wincurs.h
export const NONE = -1;
// wincurs.h
export const KEY_ESC = 0x1b;
// wincurs.h
export const MESSAGE_WIN = 1;
// wincurs.h
export const STATUS_WIN = 2;
// wincurs.h
export const MAP_WIN = 3;
// wincurs.h
export const INV_WIN = 4;
// wincurs.h
export const TEXT_WIN = 5;
// wincurs.h
export const MENU_WIN = 6;
// wincurs.h
export const NHWIN_MAX = 7;
// wincurs.h
export const CURSES_DARK_GRAY = 17;

// ===== wintty.h =====
// wintty.h
export const WIN_CANCELLED = 1;
// wintty.h
export const WIN_STOP = 1;
// wintty.h
export const WIN_LOCKHISTORY = 2;
// wintty.h
export const WIN_NOSTOP = 4;
// wintty.h
export const TOPLINE_EMPTY = 0;
// wintty.h
export const TOPLINE_NEED_MORE = 1;
// wintty.h
export const TOPLINE_NON_EMPTY = 2;
// wintty.h
export const TOPLINE_SPECIAL_PROMPT = 3;

// ===== botl.h =====
// botl.h
export const REASSESS_ONLY = TRUE;

// ===== fnamesiz.h =====
// fnamesiz.h
export const LOCKNAMESIZE = (PL_NSIZ + 14);
// AUTO-IMPORT-END: CONST_ALL_HEADERS

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

// Corpse taint/revival age window (src/mkobj.c)
// Runtime fields: rot/revive scheduling bound for corpse timers.
export const TAINT_AGE = 50;

// Artifact naming/origin flags (src/artifact.c)
// Runtime fields: oname()/artifact_origin() provenance bits.
export const ONAME_NO_FLAGS = 0;
export const ONAME_VIA_NAMING = 0x0001;
export const ONAME_WISH = 0x0002;
export const ONAME_GIFT = 0x0004;
export const ONAME_VIA_DIP = 0x0008;
export const ONAME_LEVEL_DEF = 0x0010;
export const ONAME_BONES = 0x0020;
export const ONAME_RANDOM = 0x0040;
export const ONAME_KNOW_ARTI = 0x0100;

// seenv octants and wall-info bits (include/rm.h)
export const SV0 = 0x01;
export const SV1 = 0x02;
export const SV2 = 0x04;
export const SV3 = 0x08;
export const SV4 = 0x10;
export const SV5 = 0x20;
export const SV6 = 0x40;
export const SV7 = 0x80;
export const WM_MASK = 0x07;
export const WM_C_OUTER = 1;
export const WM_C_INNER = 2;

// Maximum values
export const MAXNROFROOMS = 40;
export const MAXDUNGEON = 16;
export const MAXLEVEL = 32;
// MAXOCLASSES: canonical home is objects.js; MAXMCLASSES: canonical home is symbols.js
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
    // C ref: dbridge.c is_pool(x,y): POOL/MOAT/WATER (plus is_moat(x,y)).
    // Typ-only helper cannot evaluate map-state is_moat() context, so keep
    // the direct typ subset only.
    return typ === POOL || typ === MOAT || typ === WATER;
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
// C ref: include/prop.h — enum prop_types (Property #0 unused)
export const FIRE_RES = 1;
export const COLD_RES = 2;
export const SLEEP_RES = 3;
export const DISINT_RES = 4;
export const SHOCK_RES = 5;
export const POISON_RES = 6;
export const ACID_RES = 7;
export const STONE_RES = 8;
export const DRAIN_RES = 9;
export const SICK_RES = 10;
export const INVULNERABLE = 11;
export const ANTIMAGIC = 12;
export const PROP_INDEX_START_ABILITIES = 13; // marker
export const STUNNED = 13;
export const CONFUSION = 14;
export const BLINDED = 15;
export const DEAF = 16;
export const SICK = 17;
export const STONED = 18;
export const STRANGLED = 19;
export const VOMITING = 20;
export const GLIB = 21;
export const SLIMED = 22;
export const HALLUC = 23;
export const HALLUC_RES = 24;
export const FUMBLING = 25;
export const WOUNDED_LEGS = 26;
export const SLEEPY = 27;
export const HUNGER = 28;
export const SEE_INVIS = 29;
export const TELEPAT = 30;
export const WARNING = 31;
export const WARN_OF_MON = 32;
export const WARN_UNDEAD = 33;
export const SEARCHING = 34;
export const CLAIRVOYANT = 35;
export const INFRAVISION = 36;
export const DETECT_MONSTERS = 37;
export const BLND_RES = 38;
export const ADORNED = 39;
export const INVIS = 40;
export const DISPLACED = 41;
export const STEALTH = 42;
export const AGGRAVATE_MONSTER = 43;
export const CONFLICT = 44;
export const JUMPING = 45;
export const TELEPORT = 46;
export const TELEPORT_CONTROL = 47;
export const LEVITATION = 48;
export const FLYING = 49;
export const WWALKING = 50;
export const SWIMMING = 51;
export const MAGICAL_BREATHING = 52;
export const PASSES_WALLS = 53;
export const SLOW_DIGESTION = 54;
export const HALF_SPDAM = 55;
export const HALF_PHDAM = 56;
export const REGENERATION = 57;
export const ENERGY_REGENERATION = 58;
export const PROTECTION = 59;
export const PROT_FROM_SHAPE_CHANGERS = 60;
export const POLYMORPH = 61;
export const POLYMORPH_CONTROL = 62;
export const UNCHANGING = 63;
export const FAST = 64;
export const REFLECTING = 65;
export const FREE_ACTION = 66;
export const FIXED_ABIL = 67;
export const LIFESAVED = 68;
export const LAST_PROP = LIFESAVED;
// Temporary aliases still used in JS callsites.
export const SLEEPING = SLEEPY;
export const WATERPROOF = WWALKING;

// Intrinsic bitmask constants (prop.h)
// C ref: include/prop.h — bitmask for intrinsic field
export const TIMEOUT = 0x00FFFFFF;     // timeout portion of intrinsic
export const FROMEXPER = 0x01000000;   // from role/experience
export const FROM_RACE = 0x02000000;   // from race/experience
export const FROMOUTSIDE = 0x04000000; // from outside source (corpse, potion)
export const INTRINSIC = (FROMEXPER | FROM_RACE | FROMOUTSIDE);
export const FROM_FORM = 0x10000000;   // from polymorph form
export const I_SPECIAL = 0x20000000;   // property-specific flag
// Temporary alias used by existing imports.
export const FROM_ROLE = FROMEXPER;

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

// CONST_SYMBOLS block moved to symbols.js — see gen_symbols.py
// [CONST_SYMBOLS content removed — now in symbols.js]

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

// trap_to_defsym/defsym_to_trap moved to symbols.js (depends on S_arrow_trap)

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
const known_handling = ["UNKNOWN", "IBM", "DEC", "UTF8", null];

export function set_symhandling(handling, which_set) {
  let i = 0;
  gs.symset[which_set].handling = H_UNK;
  while (known_handling[i]) {
    if (known_handling[i].toLowerCase() === handling.toLowerCase()) { gs.symset[which_set].handling = i; return; }
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
    tmp = tmp2;
  }
}

// Autotranslated from symbols.c:738
export function savedsym_add(name, val, which_set) {
  let tmp = null;
  if ((tmp = savedsym_find(name, which_set)) != null) { tmp.val = val; }
  else {
    tmp = { name: name, val: val, which_set: which_set, next: saved_symbols };
    saved_symbols = tmp;
  }
}

// Autotranslated from symbols.c:756
export function savedsym_strbuf(sbuf) {
  let tmp = saved_symbols, buf;
  while (tmp) {
    buf = `${(tmp.which_set === ROGUESET) ? "ROGUE" : ""}SYMBOLS=${tmp.name}:${tmp.val}\n`;
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
        buf = `${opts}:${strval}`;
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
// AUTO-IMPORT-BEGIN: CONST_WEAPON_SKILLS
// Auto-imported weapon/skill constants from C headers
// Sources: skills.h, monst.h

// Skill constants — cf. skills.h enum p_skills
export const P_NONE = 0;
export const P_DAGGER = 1;
export const P_KNIFE = 2;
export const P_AXE = 3;
export const P_PICK_AXE = 4;
export const P_SHORT_SWORD = 5;
export const P_BROAD_SWORD = 6;
export const P_LONG_SWORD = 7;
export const P_TWO_HANDED_SWORD = 8;
export const P_SABER = 9;
export const P_CLUB = 10;
export const P_MACE = 11;
export const P_MORNING_STAR = 12;
export const P_FLAIL = 13;
export const P_HAMMER = 14;
export const P_QUARTERSTAFF = 15;
export const P_POLEARMS = 16;
export const P_SPEAR = 17;
export const P_TRIDENT = 18;
export const P_LANCE = 19;
export const P_BOW = 20;
export const P_SLING = 21;
export const P_CROSSBOW = 22;
export const P_DART = 23;
export const P_SHURIKEN = 24;
export const P_BOOMERANG = 25;
export const P_WHIP = 26;
export const P_UNICORN_HORN = 27;
export const P_ATTACK_SPELL = 28;
export const P_HEALING_SPELL = 29;
export const P_DIVINATION_SPELL = 30;
export const P_ENCHANTMENT_SPELL = 31;
export const P_CLERIC_SPELL = 32;
export const P_ESCAPE_SPELL = 33;
export const P_MATTER_SPELL = 34;
export const P_BARE_HANDED_COMBAT = 35;
export const P_TWO_WEAPON_COMBAT = 36;
export const P_RIDING = 37;
export const P_NUM_SKILLS = 38;

export const P_FIRST_WEAPON = P_DAGGER;
export const P_LAST_WEAPON = P_UNICORN_HORN;
export const P_FIRST_SPELL = P_ATTACK_SPELL;
export const P_LAST_SPELL = P_MATTER_SPELL;
export const P_FIRST_H_TO_H = P_BARE_HANDED_COMBAT;
export const P_LAST_H_TO_H = P_RIDING;
export const P_MARTIAL_ARTS = P_BARE_HANDED_COMBAT;
export const P_SKILL_LIMIT = 60;

// Skill levels — cf. skills.h enum skill_levels
export const P_ISRESTRICTED = 0;
export const P_UNSKILLED = 1;
export const P_BASIC = 2;
export const P_SKILLED = 3;
export const P_EXPERT = 4;
export const P_MASTER = 5;
export const P_GRAND_MASTER = 6;

// Monster weapon_check states — cf. monst.h enum wpn_chk_flags
export const NO_WEAPON_WANTED = 0;
export const NEED_WEAPON = 1;
export const NEED_RANGED_WEAPON = 2;
export const NEED_HTH_WEAPON = 3;
export const NEED_PICK_AXE = 4;
export const NEED_AXE = 5;
export const NEED_PICK_OR_AXE = 6;

// Distance limits (hack.h)
export const BOLT_LIM = 8;
export const AKLYS_LIM = BOLT_LIM / 2;
// AUTO-IMPORT-END: CONST_WEAPON_SKILLS
// AUTO-IMPORT-BEGIN: CONST_ALL_HEADERS_POST
// Auto-imported header constants (post-symbol pass)
// Source dir: /share/u/davidbau/git/mazesofmenace/ux/scripts/generators/../../nethack-c/patched/include
//
// Rules:
// - include object-like #define macros (not function-like) and enum constants
// - include only const-style expressions (no runtime/lowercase identifiers)
// - preserve include dependency order and in-header declaration order
// - emit only when dependencies are resolvable at this marker location
// - non-emittable blacklist count: 13

// Added direct exports: 35
// Deferred unresolved const-style macros: 5
// ===== prop.h =====
// prop.h
export const LEFT_RING = W_RINGL;
// prop.h
export const RIGHT_RING = W_RINGR;
// prop.h
export const LEFT_SIDE = LEFT_RING;
// prop.h
export const RIGHT_SIDE = RIGHT_RING;
// prop.h
export const BOTH_SIDES = (LEFT_SIDE | RIGHT_SIDE);
// prop.h
export const WORN_ARMOR = W_ARM;
// prop.h
export const WORN_CLOAK = W_ARMC;
// prop.h
export const WORN_HELMET = W_ARMH;
// prop.h
export const WORN_SHIELD = W_ARMS;
// prop.h
export const WORN_GLOVES = W_ARMG;
// prop.h
export const WORN_BOOTS = W_ARMF;
// prop.h
export const WORN_AMUL = W_AMUL;
// prop.h
export const WORN_BLINDF = W_TOOL;
// prop.h
export const WORN_SHIRT = W_ARMU;

// ===== botl.h =====
// botl.h
export const HL_ATTCLR_NONE = CLR_MAX + 1;
// botl.h
export const HL_ATTCLR_BOLD = CLR_MAX + 2;
// botl.h
export const HL_ATTCLR_DIM = CLR_MAX + 3;
// botl.h
export const HL_ATTCLR_ITALIC = CLR_MAX + 4;
// botl.h
export const HL_ATTCLR_ULINE = CLR_MAX + 5;
// botl.h
export const HL_ATTCLR_BLINK = CLR_MAX + 6;
// botl.h
export const HL_ATTCLR_INVERSE = CLR_MAX + 7;
// botl.h
export const BL_ATTCLR_MAX = CLR_MAX + 8;

// ===== vision.h =====
// vision.h
export const NUM_LS_SOURCES = (LS_MONSTER + 1);

// ===== timeout.h =====
// timeout.h
export const NUM_TIME_FUNCS = (MELT_ICE_AWAY + 1);

// ===== hack.h =====
// hack.h
export const MAXLINFO = (MAXDUNGEON * MAXLEVEL);
// hack.h
export const BUC_ALLBKNOWN = (BUC_BLESSED | BUC_CURSED | BUC_UNCURSED);
// hack.h
export const BUCX_TYPES = (BUC_ALLBKNOWN | BUC_UNKNOWN);

// ===== wincurs.h =====
// wincurs.h
export const DIALOG_BORDER_COLOR = CLR_MAGENTA;
// wincurs.h
export const ALERT_BORDER_COLOR = CLR_RED;
// wincurs.h
export const SCROLLBAR_COLOR = CLR_MAGENTA;
// wincurs.h
export const SCROLLBAR_BACK_COLOR = CLR_BLACK;
// wincurs.h
export const HIGHLIGHT_COLOR = CLR_WHITE;
// wincurs.h
export const MORECOLOR = CLR_ORANGE;
// wincurs.h
export const STAT_UP_COLOR = CLR_GREEN;
// wincurs.h
export const STAT_DOWN_COLOR = CLR_RED;

export const DEFERRED_HEADER_CONST_MACROS = Object.freeze([
    "SYM_OFF_O (hack.h)",
    "SYM_OFF_M (hack.h)",
    "SYM_OFF_W (hack.h)",
    "SYM_OFF_X (hack.h)",
    "SYM_MAX (hack.h)",
]);

export const DEFERRED_HEADER_CONST_MACRO_DETAILS = Object.freeze([
    Object.freeze({
        name: "SYM_OFF_O",
        source: "hack.h",
        missingDeps: Object.freeze(["MAXPCHARS"]),
        rootMissingDeps: Object.freeze(["MAXPCHARS"]),
        expr: "(SYM_OFF_P + MAXPCHARS)",
    }),
    Object.freeze({
        name: "SYM_OFF_M",
        source: "hack.h",
        missingDeps: Object.freeze(["MAXOCLASSES", "SYM_OFF_O"]),
        rootMissingDeps: Object.freeze(["MAXOCLASSES", "MAXPCHARS"]),
        expr: "(SYM_OFF_O + MAXOCLASSES)",
    }),
    Object.freeze({
        name: "SYM_OFF_W",
        source: "hack.h",
        missingDeps: Object.freeze(["MAXMCLASSES", "SYM_OFF_M"]),
        rootMissingDeps: Object.freeze(["MAXMCLASSES", "MAXOCLASSES", "MAXPCHARS"]),
        expr: "(SYM_OFF_M + MAXMCLASSES)",
    }),
    Object.freeze({
        name: "SYM_OFF_X",
        source: "hack.h",
        missingDeps: Object.freeze(["SYM_OFF_W"]),
        rootMissingDeps: Object.freeze(["MAXMCLASSES", "MAXOCLASSES", "MAXPCHARS"]),
        expr: "(SYM_OFF_W + WARNCOUNT)",
    }),
    Object.freeze({
        name: "SYM_MAX",
        source: "hack.h",
        missingDeps: Object.freeze(["SYM_OFF_X"]),
        rootMissingDeps: Object.freeze(["MAXMCLASSES", "MAXOCLASSES", "MAXPCHARS"]),
        expr: "(SYM_OFF_X + MAXOTHER)",
    }),
]);

export const DEFERRED_HEADER_CONST_ROOT_BLOCKERS = Object.freeze([
    Object.freeze({
        name: "MAXPCHARS",
        count: 5,
        ownerHint: "symbols.js",
    }),
    Object.freeze({
        name: "MAXOCLASSES",
        count: 4,
        ownerHint: "objects.js",
    }),
    Object.freeze({
        name: "MAXMCLASSES",
        count: 3,
        ownerHint: "symbols.js",
    }),
]);

export const HEADER_MACRO_NON_EMITTABLE = Object.freeze([
    "B: objects.h alias; owned by objects.js with objclass.h direction constants",
    "DLBFILE: platform/filesystem path constant; not used in web runtime",
    "DUMPLOG_FILE: platform/filesystem path template; not used in web runtime",
    "HACKDIR: platform/filesystem path constant; not used in web runtime",
    "NROFARTIFACTS: owned by artifacts.js (derived from AFTER_LAST_ARTIFACT)",
    "N_DIRS_Z: kept manual with direction arrays and DIR_* ordering contract",
    "P: objects.h alias; owned by objects.js with objclass.h direction constants",
    "PAPER: objects.h alias; owned by objects.js material constants",
    "S: objects.h alias; owned by objects.js with objclass.h direction constants",
    "SHOP_WALL_DMG: depends on runtime ACURRSTR (not a pure constant)",
    "SOUNDLIBONLY: macro alias to UNUSED (compile-time annotation)",
    "UNDEFINED_PTR: C pointer sentinel (NULL), not meaningful as JS const",
    "VOICEONLY: macro alias to UNUSED (compile-time annotation)",
]);
// AUTO-IMPORT-END: CONST_ALL_HEADERS_POST

// permonst.h constants (blacklisted header, manually maintained)
export const NON_PM = -1;
export const LOW_PM = 0;
export const LEAVESTATUE = NON_PM - 1;
export const NATTK = 6;
export const NORMAL_SPEED = 12;

// ========================================================================
// C macro accessors for monster/object extra fields
// C: ESHK(mtmp) → ((struct eshk *)(mtmp)->mextra->eshk)
// JS: ESHK(mtmp) → mtmp.mextra?.eshk
// ========================================================================
export function ESHK(mtmp) { return mtmp?.mextra?.eshk; }
export function EPRI(mtmp) { return mtmp?.mextra?.epri; }
export function EMIN(mtmp) { return mtmp?.mextra?.emin; }
export function EGD(mtmp) { return mtmp?.mextra?.egd; }
export function EDOG(mtmp) { return mtmp?.mextra?.edog; }
export function EBONES(mtmp) { return mtmp?.mextra?.ebones; }
export function MCORPSENM(mtmp) { return mtmp?.mextra?.mcorpsenm ?? -1; }

export function has_eshk(mtmp) { return !!mtmp?.mextra?.eshk; }
export function has_epri(mtmp) { return !!mtmp?.mextra?.epri; }
export function has_emin(mtmp) { return !!mtmp?.mextra?.emin; }
export function has_egd(mtmp) { return !!mtmp?.mextra?.egd; }
export function has_edog(mtmp) { return !!mtmp?.mextra?.edog; }
export function has_ebones(mtmp) { return !!mtmp?.mextra?.ebones; }

// Object extra accessors
// C: ONAME(obj) → ((char *)(obj)->oextra->oname)
export function ONAME(obj) { return obj?.oextra?.oname || ''; }
export function has_oname(obj) { return !!obj?.oextra?.oname; }
export function OMONST(obj) { return obj?.oextra?.omonst; }
export function MGIVENNAME(mtmp) { return mtmp?.mextra?.mgivenname || mtmp?.mgivenname || ''; }
export function has_mgivenname(mtmp) { return !!(mtmp?.mextra?.mgivenname || mtmp?.mgivenname); }
