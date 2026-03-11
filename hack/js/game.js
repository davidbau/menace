// C ref: hack.main.c — global variable declarations
// GameState class and struct factory functions.
import { COLNO, ROWNO } from './const.js';

// C ref: struct rm — one map cell
// Note: C field `new` renamed to `isnew` (reserved word)
export function makeCell() {
  return {
    scrsym: 0,    // display character (char code or char)
    typ:    0,    // terrain type: WALL/SDOOR/DOOR/CORR/ROOM or 0
    isnew:  false, // freshly updated this turn (C field: `new`)
    seen:   false, // previously seen
    lit:    false, // currently lit
    cansee: false, // in player's field of view
  };
}

// C ref: struct monst — one monster instance
export function makeMonst(data) {
  return {
    nmon:    null,  // next monster in linked list
    mx:      0,     // map x position
    my:      0,     // map y position
    sinv:    false, // special invisible
    invis:   false, // invisible
    cham:    false, // shape-changer
    mspeed:  0,     // MCONF/MSLOW/MFAST
    mstat:   0,     // MNORM/FLEE/SLEEP/MFROZ
    mcan:    false, // has been canceled
    mstuck:  false, // you are stuck to this monster
    data:    data,  // pointer to permonst entry
    mhp:     0,     // current HP
    orig_hp: 0,     // max HP
  };
}

// C ref: struct obj — one item
export function makeObj() {
  return {
    nobj:    null,  // next object in linked list
    ox:      0,     // map x (0 if in inventory)
    oy:      0,     // map y (0 if in inventory)
    olet:    '',    // display char (')' weapon, '[' armor, '!' potion, etc.)
    spe:     0,     // special/enchant value (6-bit in C)
    quan:    0,     // quantity (7-bit in C)
    minus:   false, // minus flag (cursed weapon/armor)
    known:   false, // player knows what it is
    cursed:  false, // is cursed
    otyp:    0,     // object type index
  };
}

// C ref: struct gen — gold pile or trap
export function makeGen(x, y, flag) {
  return {
    ngen:  null,  // next gen in linked list
    gx:    x,
    gy:    y,
    gflag: flag,  // trap type or gold amount
  };
}

// C ref: struct stole — item stolen by monster
export function makeStole(smon, sobj, sgold) {
  return {
    nstole: null,
    smon,
    sobj,
    sgold,
  };
}

// GameState — holds all C globals
export class GameState {
  constructor() {
    // Map: levl[80][22]
    this.levl = [];
    for (let x = 0; x < COLNO; x++) {
      this.levl[x] = [];
      for (let y = 0; y < ROWNO; y++) {
        this.levl[x][y] = makeCell();
      }
    }

    // Linked list heads
    this.fmon    = null;   // struct monst *fmon
    this.fgold   = null;   // struct gen *fgold
    this.ftrap   = null;   // struct gen *ftrap
    this.fstole  = null;   // struct stole *fstole
    this.fobj    = null;   // struct obj *fobj
    this.invent  = null;   // struct obj *invent
    this.uwep    = null;   // struct obj *uwep (wielded weapon)
    this.uarm    = null;   // struct obj *uarm (worn armor)
    this.uleft   = null;   // struct obj *uleft (left ring)
    this.uright  = null;   // struct obj *uright (right ring)

    // flags struct
    this.flags = {
      magic:  false,
      wmag:   false,
      topl:   0,     // top line printed: 0=clear, 1=has msg, 2=needs --More--
      botl:   0,     // bottom line redraw bits
      maze:   0,     // maze level number (rn1(5,25))
      move:   false, // previous move was real
      mv:     false, // doing a multiple move
      mdone:  false, // actually moved
      dscr:   false, // screen area needs update
      one:    false, // move 1 space after doors
      step:   false, // inventory 1 line at a time
      flush:  false, // flush input every monster move
    };

    // player struct: struct you u
    this.u = {
      ux: 0, uy: 0,
      ufast: 0,
      uconfused: 0,
      uinvis: 0,
      ulevel: 1,
      utrap: 0,
      upit: false,
      umconf: false,
      ufireres: false,
      ucoldres: false,
      uswallow: false,
      uswldtim: 0,
      ucham: false,
      uhs: 0,
      utel: false,
      upres: false,
      ustelth: false,
      uagmon: false,
      ufeed: false,
      usearch: 0,
      ucinvis: false,
      uregen: false,
      ufloat: false,
      ustr: 16,
      ustrmax: 16,
      udaminc: 0,
      uhp: 12,
      uhpmax: 12,
      uac: 6,
      ugold: 0,
      uexp: 0,
      urexp: 0,
      uhunger: 900,
      ublind: 0,
      ustuck: null,
    };

    // Other globals
    this.curx = 1;    // cursor column (1-based, C convention)
    this.cury = 1;    // cursor row (1-based, C convention)
    this.savx = 1;    // saved cursor x (for --More--)

    this.xupstair = 0; this.yupstair = 0;
    this.xdnstair = 0; this.ydnstair = 0;

    this.seelx = 0; this.seehx = 0;
    this.seely = 0; this.seehy = 0;
    this.scrlx = COLNO; this.scrhx = 0;
    this.scrly = ROWNO; this.scrhy = 0;

    this.save_cm = '';

    this.dlevel = 1;
    this.dx = 0; this.dy = 0;
    this.tx = 0; this.ty = 0;

    this.moves = 0;
    this.multi = 0;

    this.buf = '';
    this.killer = '';
    this.oldux = 0; this.olduy = 0;

    // Level storage (replaces file I/O)
    this.savedLevels = {};

    // RNG state
    this.rngSeed = 0;
    this.initialSeed = 0;  // saved at game start for mklev reseeding (C: srand(getpid()))
    this.rngLog = [];     // structured RNG log (for debugging)
    this.rawRngLog = null; // set to [] to enable raw rand() value logging

    // Shuffled name arrays (set up in main.js)
    this.wannam   = null;
    this.potcol   = null;
    this.rinnam   = null;
    this.scrnam   = null;
    // C ref: global char* arrays, null-initialized (not yet named by player)
    this.potcall  = new Array(15).fill(null);   // POTNUM=15
    this.scrcall  = new Array(15).fill(null);   // SCRNUM=15
    this.wandcall = new Array(16).fill(null);   // WANDNUM=16
    this.ringcall = new Array(17).fill(null);   // RINGNUM=17

    // C ref: oiden[20] — item identification flags (1 bit per item type)
    // Indexed by otyp; bits: POTN=1, SCRN=2, WANN=4, RINN=8
    this.oiden = new Array(20).fill(0);

    // Display interface (set by browser_main.js)
    this.display = null;

    // Input interface (set by browser_main.js)
    this.input = null;

    // lock string (used for level file naming)
    this.lock = 'alock';
  }
}
