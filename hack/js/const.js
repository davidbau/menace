// C ref: hack.h constants
// Leaf file — no imports.

// Terrain types (struct rm .typ)
export const WALL  = 1;
export const SDOOR = 2;
export const DOOR  = 3;
export const CORR  = 4;
export const ROOM  = 5;

// Object type counts
export const WEPNUM  = 14;
export const POTNUM  = 15;
export const SCRNUM  = 15;
export const TRAPNUM = 7;
export const WANDNUM = 16;
export const RINGNUM = 17;
export const ARMNUM  = 6;   // ac 3-8
export const GEMNUM  = 15;

// Monster status (mstat field)
export const MNORM = 0;
export const FLEE  = 1;
export const SLEEP = 2;
export const MFROZ = 3;

// Monster speed (mspeed field)
export const MCONF = 1;
export const MSLOW = 2;
export const MFAST = 3;

// Trap types (struct gen .gflag)
export const BEAR   = 0;
export const ARROW  = 1;
export const DART   = 2;
export const TDOOR  = 3;
export const TELE   = 4;
export const PIT    = 5;
export const SLPTRP = 6;
export const SEEN   = 32;   // trap which has been seen

// Item identification bits (oiden[])
export const POTN = 1;
export const SCRN = 2;
export const WANN = 4;
export const RINN = 8;

// flags.botl bits
export const ALL = 1;
export const GOLD = 2;
export const HP   = 4;
export const HPM  = 8;
export const STR  = 16;
export const AC   = 32;
export const ULV  = 64;
export const UEX  = 128;
export const DHS  = 256;

// Map dimensions
export const COLNO = 80;
export const ROWNO = 22;

// Screen layout
export const MSG_ROW    = 0;   // message line (0-based)
export const MAP_ROW0   = 2;   // first map row on screen (0-based, matches C's y+2)
export const STATUS_ROW = 23;  // bottom status line (0-based)
