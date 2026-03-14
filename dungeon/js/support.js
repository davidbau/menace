// support.js - Core utility functions for DUNGEON
//
// Ported from subr.f (Fortran) / dsub.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

// ---------------------------------------------------------------
// Constants (from dparam.for)
// ---------------------------------------------------------------

// Array size parameters
export const MMAX = 1500;
export const RMAX = 200;
export const XXMAX = 1000;
export const OMAX = 300;
export const R2MAX = 20;
export const CMAX = 30;
export const VMAX = 4;
export const AMAX = 4;
export const FMAX = 56;
export const SMAX = 24;
export const BUNMAX = 10;
export const LEXMAX = 20;

// Text parameters
export const RECLNT = 80;
export const TEXLNT = 76;
export const WRDLNT = 8;

// Exit definitions
export const XLFLAG = 32768;
export const XDMASK = 31744;
export const XRMASK = 255;
export const XFMASK = 3;
export const XFSHFT = 256;
export const XASHFT = 256;
export const XNORM = 1;
export const XNO = 2;
export const XCOND = 3;
export const XDOOR = 4;
export const XMIN = 1024;
export const XMAX = 16384;

// Direction constants
export const XNORTH = 1024;
export const XNE = 2048;
export const XEAST = 3072;
export const XSE = 4096;
export const XSOUTH = 5120;
export const XSW = 6144;
export const XWEST = 7168;
export const XNW = 8192;
export const XUP = 9216;
export const XDOWN = 10240;
export const XLAUN = 11264;
export const XLAND = 12288;
export const XENTER = 13312;
export const XEXIT = 14336;
export const XCROSS = 15360;

// Actor indices
export const PLAYER = 1;
export const AROBOT = 2;
export const AMASTR = 3;

// Actor flags
export const ASTAG = 32768;

// Room flags
export const RSEEN = 32768;
export const RLIGHT = 16384;
export const RLAND = 8192;
export const RWATER = 4096;
export const RAIR = 2048;
export const RSACRD = 1024;
export const RFILL = 512;
export const RMUNG = 256;
export const RBUCK = 128;
export const RHOUSE = 64;
export const RNWALL = 32;
export const REND = 16;

// Room indices
export const WHOUS = 2;
export const SHOUS = 4;
export const EHOUS = 5;
export const KITCH = 6;
export const LROOM = 8;
export const CELLA = 9;
export const MTROL = 10;
export const MAZE1 = 11;
export const MGRAT = 25;
export const MAZ15 = 30;
export const FORE1 = 31;
export const FORE2 = 32;
export const FORE3 = 33;
export const CLEAR = 36;
export const RESER = 40;
export const STREA = 42;
export const EGYPT = 44;
export const ECHOR = 49;
export const SLIDE = 58;
export const TSHAF = 61;
export const BSHAF = 76;
export const MMACH = 77;
export const DOME = 79;
export const MTORC = 80;
export const CAROU = 83;
export const RIDDL = 91;
export const LLD1 = 93;
export const LLD2 = 94;
export const TEMP1 = 96;
export const TEMP2 = 97;
export const MAINT = 100;
export const MCYCL = 101;
export const BLROO = 102;
export const TREAS = 103;
export const RIVR1 = 107;
export const RIVR2 = 108;
export const RIVR3 = 109;
export const RIVR4 = 112;
export const RIVR5 = 113;
export const FCHMP = 114;
export const SBEACH = 116;
export const FALLS = 120;
export const MRAIN = 121;
export const POG = 122;
export const VLBOT = 126;
export const VAIR1 = 127;
export const VAIR2 = 128;
export const VAIR3 = 129;
export const VAIR4 = 130;
export const LEDG2 = 131;
export const LEDG3 = 132;
export const LEDG4 = 133;
export const MSAFE = 135;
export const CAGER = 140;
export const CAGED = 141;
export const TWELL = 142;
export const BWELL = 143;
export const ALICE = 144;
export const ALISM = 145;
export const ALITR = 146;
export const MTREE = 147;
export const BKENT = 148;
export const BKVW = 151;
export const BKVE = 152;
export const BKTWI = 153;
export const BKVAU = 154;
export const BKBOX = 155;
export const CRYPT = 157;
export const TSTRS = 158;
export const MRANT = 159;
export const MREYE = 160;
export const MRA = 161;
export const MRB = 162;
export const MRC = 163;
export const MRG = 164;
export const MRD = 165;
export const FDOOR = 166;
export const MRAE = 167;
export const MRCE = 171;
export const MRCW = 172;
export const MRGE = 173;
export const MRGW = 174;
export const MRDW = 176;
export const INMIR = 177;
export const SCORR = 179;
export const NCORR = 182;
export const PARAP = 183;
export const CELL = 184;
export const PCELL = 185;
export const NCELL = 186;
export const CPANT = 188;
export const CPOUT = 189;
export const CPUZZ = 190;
export const PRM = 192;
export const PALRM = 193;
export const SLID1 = 194;
export const SLEDG = 197;

// Verb indices (partial — those used in the engine)
export const CINTW = 1;
export const DEADXW = 2;
export const FRSTQW = 3;
export const INXW = 4;
export const OUTXW = 5;
export const WALKIW = 6;
export const FIGHTW = 7;
export const FOOW = 8;
export const SQUEEW = 68;
export const STAYW = 73;
export const PRAYW = 79;
export const BLASTW = 82;
export const SCOREW = 83;
export const QUITW = 84;
export const FOLLOW = 85;
export const GTHROW = 86;
export const RINGW = 87;
export const DIGW = 89;
export const LEAPW = 91;
export const LOCKW = 92;
export const UNLOKW = 93;
export const DIAGNW = 94;
export const COUNTW = 97;
export const READW = 100;
export const MELTW = 101;
export const INFLAW = 102;
export const DEFLAW = 103;
export const ALARMW = 104;
export const EXORCW = 105;
export const PLUGW = 106;
export const KICKW = 107;
export const WAVEW = 108;
export const RAISEW = 109;
export const LOWERW = 110;
export const RUBW = 111;
export const PUSHW = 112;
export const UNTIEW = 113;
export const TIEW = 114;
export const TIEUPW = 115;
export const TURNW = 116;
export const BREATW = 117;
export const KNOCKW = 118;
export const LOOKW = 119;
export const EXAMIW = 120;
export const SHAKEW = 121;
export const MOVEW = 122;
export const TRNONW = 123;
export const TRNOFW = 124;
export const OPENW = 125;
export const CLOSEW = 126;
export const FINDW = 127;
export const WAITW = 128;
export const SPINW = 129;
export const BOARDW = 130;
export const UNBOAW = 131;
export const TAKEW = 132;
export const INVENW = 133;
export const EATW = 135;
export const DRINKW = 136;
export const BURNW = 137;
export const MUNGW = 138;
export const KILLW = 139;
export const SWINGW = 140;
export const ATTACW = 141;
export const WALKW = 142;
export const TELLW = 143;
export const PUTW = 144;
export const DROPW = 145;
export const GIVEW = 146;
export const POURW = 147;
export const THROWW = 148;
export const HELLOW = 151;
export const LOOKIW = 152;
export const LOOKUW = 153;
export const PUMPW = 154;
export const WINDW = 155;
export const CLMBW = 156;
export const CLMBUW = 157;
export const CLMBDW = 158;
export const TRNTOW = 159;
export const PORONW = 160;
export const PUTUNW = 161;
export const UTFRMW = 162;
export const MAKEW = 163;
export const OILW = 164;
export const PLAYW = 165;
export const SENDW = 166;

// Object flag bits (oflag1)
export const VISIBT = 32768;
export const READBT = 16384;
export const TAKEBT = 8192;
export const DOORBT = 4096;
export const TRANBT = 2048;
export const FOODBT = 1024;
export const NDSCBT = 512;
export const DRNKBT = 256;
export const CONTBT = 128;
export const LITEBT = 64;
export const VICTBT = 32;
export const BURNBT = 16;
export const FLAMBT = 8;
export const TOOLBT = 4;
export const TURNBT = 2;
export const ONBT = 1;

// Object flag bits (oflag2)
export const FINDBT = 32768;
export const DIGBT = 16384;
export const SCRDBT = 8192;
export const TIEBT = 4096;
export const CLMBBT = 2048;
export const ACTRBT = 1024;
export const WEAPBT = 512;
export const FITEBT = 256;
export const VILLBT = 128;
export const STAGBT = 64;
export const TRYBT = 32;
export const NOCHBT = 16;
export const OPENBT = 8;
export const TCHBT = 4;
export const VEHBT = 2;
export const SCHBT = 1;

// Object indices
export const GARLI = 2;
export const FOOD = 3;
export const GUNK = 4;
export const COAL = 5;
export const MACHI = 7;
export const DIAMO = 8;
export const TCASE = 9;
export const BOTTL = 10;
export const WATER = 11;
export const ROPE = 12;
export const KNIFE = 13;
export const SWORD = 14;
export const LAMP = 15;
export const BLAMP = 16;
export const RUG = 17;
export const LEAVE = 18;
export const TROLL = 19;
export const AXE = 20;
export const KEYS = 23;
export const RKNIF = 24;
export const BAGCO = 25;
export const BAR = 26;
export const ICE = 30;
export const COFFI = 33;
export const TORCH = 34;
export const TBASK = 35;
export const FBASK = 36;
export const TIMBE = 38;
export const IRBOX = 39;
export const STRAD = 40;
export const GHOST = 42;
export const TRUNK = 45;
export const BELL = 46;
export const BOOK = 47;
export const CANDL = 48;
export const GUIDE = 49;
export const MATCH = 51;
export const MAILB = 53;
export const TUBE = 54;
export const PUTTY = 55;
export const WRENC = 56;
export const SCREW = 57;
export const CYCLO = 58;
export const CHALI = 59;
export const THIEF = 61;
export const STILL = 62;
export const WINDO = 63;
export const GRATE = 65;
export const DOOR = 66;
export const HPOLE = 71;
export const RAILI = 75;
export const LEAK = 78;
export const RBUTT = 79;
export const POT = 85;
export const STATU = 86;
export const IBOAT = 87;
export const DBOAT = 88;
export const PUMP = 89;
export const RBOAT = 90;
export const LABEL = 91;
export const STICK = 92;
export const BARRE = 93;
export const BUOY = 94;
export const SHOVE = 96;
export const GUANO = 97;
export const BALLO = 98;
export const RECEP = 99;
export const BROPE = 101;
export const HOOK1 = 102;
export const HOOK2 = 103;
export const ZORKM = 104;
export const SAFE = 105;
export const CARD = 106;
export const SSLOT = 107;
export const BRICK = 109;
export const FUSE = 110;
export const GNOME = 111;
export const BLABE = 112;
export const DBALL = 113;
export const TOMB = 119;
export const HEADS = 120;
export const COKES = 121;
export const LCASE = 123;
export const CAGE = 124;
export const RCAGE = 125;
export const SPHER = 126;
export const SQBUT = 127;
export const FLASK = 132;
export const POOL = 133;
export const SAFFR = 134;
export const BUCKE = 137;
export const ECAKE = 138;
export const ORICE = 139;
export const RDICE = 140;
export const BLICE = 141;
export const ROBOT = 142;
export const RBTLB = 143;
export const TTREE = 144;
export const FTREE = 145;
export const BILLS = 148;
export const PORTR = 149;
export const SCOL = 151;
export const ZGNOM = 152;
export const NEST = 153;
export const EGG = 154;
export const BEGG = 155;
export const BAUBL = 156;
export const CANAR = 157;
export const BCANA = 158;
export const YLWAL = 159;
export const RDWAL = 161;
export const PINDR = 164;
export const RBEAM = 171;
export const ODOOR = 172;
export const QDOOR = 173;
export const LDOOR = 174;
export const CDOOR = 175;
export const NUM1 = 178;
export const NUM8 = 185;
export const WARNI = 186;
export const CSLIT = 187;
export const GCARD = 188;
export const STLDR = 189;
export const HBELL = 190;
export const PLEAK = 191;
export const BROCH = 195;
export const STAMP = 196;
export const PDOOR = 197;
export const PLID1 = 200;
export const PLID2 = 201;
export const PKH1 = 202;
export const PKH2 = 203;
export const PKEY = 205;
export const PALAN = 206;
export const MAT = 207;
export const PAL3 = 209;

// Pseudo/global objects
export const ITOBJ = 250;
export const OPLAY = 251;
export const EVERY = 252;
export const VALUA = 253;
export const POSSE = 254;
export const SAILO = 255;
export const TEETH = 256;
export const WALL = 257;
export const HANDS = 259;
export const LUNGS = 260;
export const AVIAT = 261;
export const GBROCH = 262;
export const GWISH = 263;
export const GLOBAL = 264;
export const GRWAL = 265;
export const WNORT = 269;
export const GWATE = 273;
export const MASTER = 279;
export const BUNOBJ = 284;

// Misc
export const HFACTR = 500;

// Syntax flag bits
export const SDIR = 16384;
export const SIND = 8192;
export const SSTD = 4096;
export const SFLIP = 2048;
export const SDRIV = 1024;
export const SVMASK = 511;
export const VABIT = 16384;
export const VRBIT = 8192;
export const VTBIT = 4096;
export const VCBIT = 2048;
export const VEBIT = 1024;
export const VFBIT = 512;
export const VPMASK = 511;

// Clock event indices
export const CEVCUR = 1;
export const CEVMNT = 2;
export const CEVLNT = 3;
export const CEVMAT = 4;
export const CEVCND = 5;
export const CEVBAL = 6;
export const CEVBRN = 7;
export const CEVFUS = 8;
export const CEVLED = 9;
export const CEVSAF = 10;
export const CEVVLG = 11;
export const CEVGNO = 12;
export const CEVBUC = 13;
export const CEVSPH = 14;
export const CEVEGH = 15;
export const CEVFOR = 16;
export const CEVSCL = 17;
export const CEVZGI = 18;
export const CEVZGO = 19;
export const CEVSTE = 20;
export const CEVMRS = 21;
export const CEVPIN = 22;
export const CEVINQ = 23;
export const CEVFOL = 24;
export const CEVBRO = 25;
export const CEVCYC = 26;
export const CEVSLI = 27;
export const CEVXB = 28;
export const CEVXC = 29;
export const CEVXBH = 30;

// ---------------------------------------------------------------
// RSPEAK / RSPSUB / RSPSB2 — Message output
// ---------------------------------------------------------------

/**
 * Decrypt a single 76-byte data portion from a text record.
 * TXCRYP: byte[i] ^= (recordNumber & 31) + (i+1)  (position 1-based)
 */
function txcryp(recordNumber, data) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ (((recordNumber) & 31) + (i + 1));
  }
  return out;
}

/**
 * Decode base64 to Uint8Array.
 */
function b64decode(str) {
  if (typeof atob === 'function') {
    const bin = atob(str);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  // Node.js fallback
  return new Uint8Array(Buffer.from(str, 'base64'));
}

/**
 * Trim trailing spaces/nulls from a decrypted byte array and convert to string.
 */
function bytesToString(bytes) {
  let end = bytes.length;
  while (end > 0 && (bytes[end - 1] === 0x20 || bytes[end - 1] === 0)) end--;
  let s = '';
  for (let i = 0; i < end; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

/**
 * Read and decrypt message text starting at a given record number.
 *
 * The DTEXT database is a direct-access file of 80-byte records:
 *   4-byte linkage int + 76 bytes of encrypted text.
 *
 * Multi-line messages are consecutive records that share the same linkage
 * value. The Fortran reads record X, then X+1; if their linkage ints
 * match, it continues to the next record.
 *
 * G.textRecords is a record-number -> {r, link, d} map loaded from
 * dungeon-text.json at initialization.
 */
function readMessageRecords(G, absRecordNumber) {
  const records = G.textRecords;
  if (!records) return [];

  const first = records[String(absRecordNumber)];
  if (!first) return [];

  const lines = [];
  const firstData = b64decode(first.d);
  const firstDecrypted = txcryp(first.r, firstData);
  lines.push(bytesToString(firstDecrypted));
  const firstLink = first.link;

  // Read consecutive continuation records
  let nextRec = absRecordNumber + 1;
  while (true) {
    const rec = records[String(nextRec)];
    if (!rec || rec.link !== firstLink) break;
    const data = b64decode(rec.d);
    const decrypted = txcryp(rec.r, data);
    lines.push(bytesToString(decrypted));
    nextRec++;
  }
  return lines;
}

/**
 * RSPSB2(A, B, C) — Print message A with substitutions B, C.
 * If A/B/C > 0, look up through rtext. If < 0, use abs as record number.
 * If == 0, skip.
 */
export function rspsb2(G, a, b, c) {
  let x = a;
  let y = b;
  let z = c;

  // Convert message indices to record numbers via rtext
  if (x > 0) x = G.rtext[x - 1]; // rtext is 1-indexed in Fortran
  if (y > 0) y = G.rtext[y - 1];
  if (z > 0) z = G.rtext[z - 1];

  x = Math.abs(x);
  y = Math.abs(y);
  z = Math.abs(z);

  if (x === 0) return;
  G.telflg = true;

  // Read and decrypt the main message lines
  const lines = readMessageRecords(G, x);
  if (lines.length === 0) return;

  // Read substitution text if needed
  let sub1Text = '';
  let sub2Text = '';
  if (y !== 0) {
    const subLines = readMessageRecords(G, y);
    if (subLines.length > 0) sub1Text = subLines[0];
  }
  if (z !== 0) {
    const subLines = readMessageRecords(G, z);
    if (subLines.length > 0) sub2Text = subLines[0];
  }

  // Process each line, performing '#' substitution
  let currentSub = sub1Text;
  let nextSub = sub2Text;

  for (let line of lines) {
    // Perform substitutions
    while (currentSub && line.includes('#')) {
      const idx = line.indexOf('#');
      // Replace # with substitution text, then append rest
      line = line.substring(0, idx) + currentSub + line.substring(idx + 1);
      currentSub = nextSub;
      nextSub = '';
    }
    G.output(' ' + line);
  }
}

/**
 * RSPSUB(N, S1) — Print message with one substitution.
 */
export function rspsub(G, n, s1) {
  rspsb2(G, n, s1, 0);
}

/**
 * RSPEAK(N) — Print message N.
 */
export function rspeak(G, n) {
  rspsb2(G, n, 0, 0);
}

// ---------------------------------------------------------------
// Object / Room query utilities
// ---------------------------------------------------------------

/**
 * QHERE(obj, rm) — Test if object is in room (including room2 table).
 */
export function qhere(G, obj, rm) {
  if (G.oroom[obj - 1] === rm) return true;
  for (let i = 0; i < G.r2lnt; i++) {
    if (G.o2[i] === obj && G.r2[i] === rm) return true;
  }
  return false;
}

/**
 * QEMPTY(obj) — Test if container is empty (no objects inside it).
 */
export function qempty(G, obj) {
  for (let i = 0; i < G.olnt; i++) {
    if (G.ocan[i] === obj) return false;
  }
  return true;
}

/**
 * NEWSTA(O, R, RM, CN, AD) — Set new status for object.
 * Prints message R, then sets object's room/container/adventurer.
 */
export function newsta(G, o, r, rm, cn, ad) {
  rspeak(G, r);
  G.oroom[o - 1] = rm;
  G.ocan[o - 1] = cn;
  G.oadv[o - 1] = ad;
}

/**
 * JIRONE(obj, container, room) — Test if obj is in container or room.
 * (Not in Fortran source directly by name, but a common pattern.)
 */
export function jirone(G, obj, container, room) {
  if (container !== 0 && G.ocan[obj - 1] === container) return true;
  if (room !== 0 && G.oroom[obj - 1] === room) return true;
  return false;
}

/**
 * OBJACT() — Apply objects from parse vector.
 * Returns true if an object handler processed the action.
 */
export function objact(G) {
  if (G.prsi !== 0) {
    if (oappli(G, G.oactio[G.prsi - 1], 0)) return true;
  }
  if (G.prso !== 0) {
    if (oappli(G, G.oactio[G.prso - 1], 0)) return true;
  }
  return false;
}

/**
 * OAPPLI — Call object action routine.
 * Stub: returns false (will be filled in when verb/object handlers are ported).
 */
export function oappli(G, action, arg) {
  if (action === 0) return false;
  // TODO: Dispatch to object action handlers
  return false;
}

/**
 * AAPPLI — Call actor action routine.
 * Stub: returns false.
 */
export function aappli(G, action) {
  if (action === 0) return false;
  // TODO: Dispatch to actor action handlers
  return false;
}

/**
 * RAPPLI — Call room action routine.
 * Stub: does nothing.
 */
export function rappli(G, action) {
  if (action === 0) return;
  // TODO: Dispatch to room action handlers
}

/**
 * VAPPLI — Call verb action routine.
 * Stub: returns false.
 */
export function vappli(G, action) {
  if (action === 0) return false;
  // TODO: Dispatch to verb action handlers
  return false;
}

/**
 * LIT(rm) — Test if room is lit.
 */
export function lit(G, rm) {
  if (G.deadf || (G.rflag[rm - 1] & RLIGHT) !== 0) return true;

  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    let inRoom = false;
    if (qhere(G, obj, rm)) {
      inRoom = true;
    } else {
      const oa = G.oadv[i];
      if (oa > 0 && G.aroom[oa - 1] === rm) {
        inRoom = true;
      }
    }
    if (!inRoom) continue;

    // Object is in room or on adventurer in room
    if ((G.oflag1[i] & ONBT) !== 0) return true;

    // Check if visible and open/transparent, then look inside
    if ((G.oflag1[i] & VISIBT) === 0) continue;
    if ((G.oflag1[i] & TRANBT) === 0 && (G.oflag2[i] & OPENBT) === 0) continue;

    for (let j = 0; j < G.olnt; j++) {
      if (G.ocan[j] === obj && (G.oflag1[j] & ONBT) !== 0) return true;
    }
  }
  return false;
}

/**
 * FINDXT(dir, rm) — Find exit from room.
 * Returns { found: boolean, xtype, xroom1, xstrng, xactio, xobj }
 */
export function findxt(G, dir, rm) {
  const result = { found: false, xtype: 0, xroom1: 0, xstrng: 0, xactio: 0, xobj: 0 };
  const xelnt = [1, 2, 3, 3]; // lengths of exit types (indexed 0-3 for types 1-4)

  let xi = G.rexit[rm - 1];
  if (xi === 0) return result;

  while (true) {
    const entry = G.travel[xi - 1]; // travel is 1-indexed
    result.xroom1 = entry & XRMASK;
    result.xtype = ((entry & ~XLFLAG) >>> 0) / XFSHFT;
    result.xtype = (result.xtype & XFMASK) + 1;

    // Extract fields based on type
    if (result.xtype >= 3) {
      // door or cexit: get obj/flag from travel[xi+1] (0-indexed: xi+1)
      result.xobj = G.travel[xi + 1] & XRMASK;
      result.xactio = Math.floor(G.travel[xi + 1] / XASHFT);
    }
    if (result.xtype >= 2) {
      // door, cexit, or nexit: get string
      result.xstrng = G.travel[xi]; // travel[xi+0] is next entry (0-indexed: xi)
    }

    const advanceBy = xelnt[result.xtype - 1];
    xi += advanceBy;

    // Check direction match
    if ((entry & XDMASK) === dir) {
      result.found = true;
      // Store xi for later use
      G.xtype = result.xtype;
      G.xroom1 = result.xroom1;
      G.xstrng = result.xstrng;
      G.xactio = result.xactio;
      G.xobj = result.xobj;
      return result;
    }

    // Check if last entry
    if ((entry & XLFLAG) !== 0) break;
  }

  return result;
}

/**
 * MOVETO(nr, who) — Move player to new room.
 * Returns true on success.
 */
export function moveto(G, nr, who) {
  const lhr = (G.rflag[G.here - 1] & RLAND) !== 0;
  const lnr = (G.rflag[nr - 1] & RLAND) !== 0;
  const j = G.avehic[who - 1];

  if (j !== 0) {
    // In a vehicle
    let bits = 0;
    if (j === RBOAT) bits = RWATER;
    if (j === BALLO) bits = RAIR;
    if (j === BUCKE) bits = RBUCK;
    const nlv = (G.rflag[nr - 1] & bits) === 0;
    if ((!lnr && nlv) || (lnr && lhr && nlv && bits !== RLAND)) {
      rspsub(G, 428, G.odesc2[j - 1]);
      return false;
    }
  } else {
    if (!lnr) {
      rspeak(G, 427);
      return false;
    }
  }

  // Check if room is munged
  if ((G.rflag[nr - 1] & RMUNG) !== 0) {
    rspeak(G, G.rdesc1[nr - 1]);
    return true; // moveto succeeds but room is destroyed
  }

  if (who !== PLAYER) newsta(G, G.aobj[who - 1], 0, nr, 0, 0);
  if (j !== 0) newsta(G, j, 0, nr, 0, 0);
  G.here = nr;
  G.aroom[who - 1] = G.here;
  scrupd(G, G.rval[nr - 1]);
  G.rval[nr - 1] = 0;
  return true;
}

/**
 * SCORE(flg) — Calculate and print score.
 * flg=true means "would be", flg=false means "is".
 */
export function score(G, flg) {
  const rank = [20, 19, 18, 16, 12, 8, 4, 2, 1, 0];
  const erank = [20, 15, 10, 5, 0];

  const as = G.ascore[G.winner - 1];

  if (G.endgmf) {
    if (flg) {
      G.output(' Your score in the endgame would be');
    } else {
      G.output(' Your score in the endgame is');
    }
    const movesWord = G.moves === 1 ? 'move' : 'moves';
    G.output(` ${G.egscor} [total of ${G.egmxsc} points], in ${G.moves} ${movesWord}.`);
    let i;
    for (i = 0; i < 5; i++) {
      if ((G.egscor * 20 / G.egmxsc) >= erank[i]) break;
    }
    if (i >= 5) i = 4;
    rspeak(G, 787 + i);
    return;
  }

  if (flg) {
    G.output(' Your score would be');
  } else {
    G.output(' Your score is');
  }
  const movesWord = G.moves === 1 ? 'move' : 'moves';
  G.output(` ${as} [total of ${G.mxscor} points], in ${G.moves} ${movesWord}.`);

  if (as < 0) {
    rspeak(G, 886);
    return;
  }

  let i;
  for (i = 0; i < 10; i++) {
    if ((as * 20 / G.mxscor) >= rank[i]) break;
  }
  if (i >= 10) i = 9;
  rspeak(G, 485 + i);
}

/**
 * SCRUPD(n) — Update winner's score.
 */
export function scrupd(G, n) {
  if (n === 0) return;
  if (G.endgmf) {
    G.egscor += n;
    return;
  }
  G.ascore[G.winner - 1] += n;
  G.rwscor += n;
  if (G.ascore[G.winner - 1] < (G.mxscor - (10 * Math.min(1, G.deaths)))) return;
  G.cflag[CEVEGH - 1] = true;
  G.ctick[CEVEGH - 1] = 15;
}

/**
 * RMDESC(full) — Print room description.
 * full: 0=full, 1=obj only, 2=room only, 3=full but no applicable
 */
export function rmdesc(G, full) {
  const ra = G.ractio[G.here - 1];

  // If direction given, save and clear
  if (G.prso < XMIN) {
    G.fromdr = G.prso;
    G.prso = 0;
  }

  if (full === 1) {
    // Objects only
    if (lit(G, G.here)) {
      princr(G, full, G.here);
    } else {
      rspeak(G, 1036);
    }
    return true;
  }

  if (G.here !== G.aroom[PLAYER - 1]) {
    rspeak(G, 2); // "Done."
    G.prsa = WALKIW;
    return true;
  }

  if (!lit(G, G.here)) {
    rspeak(G, 430); // warn of grue
    return false;
  }

  // Determine which description to use
  let descIdx = G.rdesc2 - G.here; // short description (negative record number)
  if ((full === 0) &&
      (G.superf || ((G.rflag[G.here - 1] & RSEEN) !== 0) &&
       (G.brieff || prob(G, 80, 80)))) {
    // Use short description
  } else {
    descIdx = G.rdesc1[G.here - 1]; // long description
    if (descIdx === 0 && ra !== 0) {
      // No long desc, let room handle via LOOKW
      G.prsa = LOOKW;
      G.prso = 0;
      rappli(G, ra);
      G.prsa = FOOW;
      // Skip to vehicle/seen handling
      if (G.avehic[G.winner - 1] !== 0) {
        rspsub(G, 431, G.odesc2[G.avehic[G.winner - 1] - 1]);
      }
      G.rflag[G.here - 1] |= RSEEN;
      if (lit(G, G.here)) {
        if (full !== 2) princr(G, full, G.here);
        if (full === 0 && ra !== 0) {
          G.prsa = WALKIW;
          rappli(G, ra);
          G.prsa = FOOW;
        }
      } else {
        rspeak(G, 1036);
      }
      return true;
    }
  }

  rspeak(G, descIdx);

  if (G.avehic[G.winner - 1] !== 0) {
    rspsub(G, 431, G.odesc2[G.avehic[G.winner - 1] - 1]);
  }
  G.rflag[G.here - 1] |= RSEEN;

  if (!lit(G, G.here)) {
    rspeak(G, 1036);
    return true;
  }

  if (full !== 2) princr(G, full, G.here);
  if (full === 0 && ra !== 0) {
    G.prsa = WALKIW;
    rappli(G, ra);
    G.prsa = FOOW;
  }
  return true;
}

/**
 * PRINCR(full, rm) — Print contents of room.
 */
export function princr(G, full, rm) {
  let j = 329; // "you can see:" initial

  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if (!qhere(G, obj, rm)) continue;
    if ((G.oflag1[i] & VISIBT) === 0) continue;
    if ((G.oflag1[i] & NDSCBT) !== 0 && full !== 1) continue;
    if (obj === G.avehic[G.winner - 1]) continue;

    if (full === 0 && (G.superf || (G.brieff && (G.rflag[G.here - 1] & RSEEN) !== 0))) {
      // Short description
      rspsub(G, j, G.odesc2[i]);
      j = 502;
    } else {
      // Long description
      let k = G.odesco[i];
      if (k === 0 || (G.oflag2[i] & TCHBT) !== 0) k = G.odesc1[i];
      if (k === 0 && full === 1) rspsub(G, 936, G.odesc2[i]);
      rspeak(G, k);
    }
  }

  // Print contents of objects in room
  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if (!qhere(G, obj, rm)) continue;
    if ((G.oflag1[i] & VISIBT) === 0) continue;
    if ((G.oflag1[i] & NDSCBT) !== 0 && full !== 1) continue;

    if ((G.oflag2[i] & ACTRBT) !== 0) invent(G, oactor(G, obj));

    if ((G.oflag1[i] & TRANBT) === 0 && (G.oflag2[i] & OPENBT) === 0) continue;
    if (qempty(G, obj)) continue;

    if (obj === TCASE) {
      if (!(G.brieff || G.superf) || full === 1) {
        princo(G, obj, 1053, false);
      }
    } else {
      princo(G, obj, 573, true);
    }
  }
}

/**
 * PRINCO(obj, desc, ldescf) — Print contents of object.
 */
export function princo(G, obj, desc, ldescf) {
  const qseein = (x) => (G.oflag1[x - 1] & TRANBT) !== 0 || (G.oflag2[x - 1] & OPENBT) !== 0;
  const qual = (x, y) => (G.oflag1[x - 1] & VISIBT) !== 0 && G.ocan[x - 1] === y && x !== G.aobj[G.winner - 1];

  let moref = false;
  let also = 0;

  if (!G.superf && ldescf) {
    for (let i = 1; i <= G.olnt; i++) {
      if (!qual(i, obj)) continue;
      if (G.odesco[i - 1] === 0 || (G.oflag2[i - 1] & TCHBT) !== 0) {
        moref = true;
        continue;
      }
      rspeak(G, G.odesco[i - 1]);
      also = 1;
      if (!qseein(i) || qempty(G, i)) continue;
      rspsub(G, 573, G.odesc2[i - 1]);
      for (let j = 1; j <= G.olnt; j++) {
        if (qual(j, i)) rspsub(G, 502, G.odesc2[j - 1]);
      }
    }
    if (!moref) return;
  }

  rspsub(G, desc + also, G.odesc2[obj - 1]);
  for (let i = 1; i <= G.olnt; i++) {
    if (!qual(i, obj)) continue;
    if (also !== 0 && G.odesco[i - 1] !== 0 && (G.oflag2[i - 1] & TCHBT) === 0) continue;
    if (!qseein(i) || qempty(G, i)) {
      rspsub(G, 502, G.odesc2[i - 1]);
    } else {
      rspsub(G, 1050, G.odesc2[i - 1]);
      for (let j = 1; j <= G.olnt; j++) {
        if (qual(j, i)) rspsub(G, 1051, G.odesc2[j - 1]);
      }
    }
  }
}

/**
 * INVENT(adv) — Print contents of adventurer.
 */
export function invent(G, adv) {
  let i = 575;
  if (adv !== PLAYER) i = 576;

  for (let j = 0; j < G.olnt; j++) {
    if (G.oadv[j] !== adv || (G.oflag1[j] & VISIBT) === 0) continue;
    rspsub(G, i, G.odesc2[G.aobj[adv - 1] - 1]);
    i = 0;
    rspsub(G, 502, G.odesc2[j]);
  }

  if (i !== 0) {
    if (adv === PLAYER) rspeak(G, 578);
    return;
  }

  for (let j = 0; j < G.olnt; j++) {
    if (G.oadv[j] !== adv || (G.oflag1[j] & VISIBT) === 0) continue;
    if ((G.oflag1[j] & TRANBT) === 0 && (G.oflag2[j] & OPENBT) === 0) continue;
    if (!qempty(G, j + 1)) princo(G, j + 1, 573, true);
  }
}

/**
 * OACTOR(obj) — Get actor associated with object.
 */
export function oactor(G, obj) {
  for (let i = 0; i < G.alnt; i++) {
    if (G.aobj[i] === obj) return i + 1;
  }
  bug(G, 40, obj);
  return 0;
}

/**
 * BUG(a, b) — Report fatal system error.
 */
export function bug(G, a, b) {
  G.output(` Program error ${a}, parameter = ${b}`);
}

/**
 * PROB(g, b) — Compute probability. Returns true with probability g% (or b% if bad luck).
 */
export function prob(G, g, b) {
  let i = g;
  if (G.badlkf) i = b;
  return rnd(100) < i;
}

/**
 * RND(n) — Return random integer in [0, n).
 */
export function rnd(n) {
  return Math.floor(Math.random() * n);
}

/**
 * CLOCKD — Process clock events.
 * Stub: will be expanded when clock event handlers are ported.
 */
export function clockd(G) {
  let ret = false;
  for (let i = 0; i < G.clnt; i++) {
    if (!G.cflag[i]) continue;
    if (G.ctick[i] === 0) continue;
    if (G.ctick[i] < 0) continue; // infinite timer
    G.ctick[i]--;
    if (G.ctick[i] !== 0) continue;
    // Timer expired — call the clock action
    // TODO: dispatch to clock event handlers via cactio[i]
    G.cflag[i] = false;
  }
  return ret;
}

/**
 * JIGSUP(desc) — You are dead.
 */
export function jigsup(G, desc) {
  const rlist = [KITCH, CLEAR, FORE3, FORE2, SHOUS, FORE2, KITCH, EHOUS];

  rspeak(G, desc);
  G.prscon = 0;
  if (G.dbgflg !== 0) return;
  G.avehic[G.winner - 1] = 0;

  if (G.winner !== PLAYER) {
    rspsub(G, 432, G.odesc2[G.aobj[G.winner - 1] - 1]);
    newsta(G, G.aobj[G.winner - 1], 0, 0, 0, 0);
    G.aroom[G.winner - 1] = 0;
    return;
  }

  scrupd(G, -10);
  if (G.endgmf) {
    rspeak(G, 625);
    score(G, false);
    G.gameOver = true;
    return;
  }
  if (G.deaths >= 2) {
    rspeak(G, 7);
    score(G, false);
    G.gameOver = true;
    return;
  }

  G.deaths++;
  G.deadf = true;
  let msgIdx = 8;
  if (G.lldf) msgIdx = 1074;
  rspeak(G, msgIdx);
  G.aactio[PLAYER - 1] = PLAYER;

  // Turn off fighting for objects in room
  for (let j = 0; j < G.olnt; j++) {
    if (qhere(G, j + 1, G.here)) {
      G.oflag2[j] &= ~FITEBT;
    }
  }

  moveto(G, LLD1, G.winner);
  G.egyptf = true;
  if (G.oadv[COFFI - 1] === G.winner) newsta(G, COFFI, 0, EGYPT, 0, 0);
  G.oflag2[DOOR - 1] &= ~TCHBT;
  G.oflag1[ROBOT - 1] = (G.oflag1[ROBOT - 1] | VISIBT) & ~NDSCBT;
  newsta(G, LAMP, 0, LROOM, 0, 0);
  G.oflag1[LAMP - 1] |= VISIBT;

  for (let i = 0; i < G.clnt; i++) {
    if (G.ccncel[i]) G.cflag[i] = false;
  }

  // Redistribute belongings
  let rIdx = 0;
  for (let j = 0; j < G.olnt; j++) {
    if (G.oadv[j] !== G.winner || G.otval[j] !== 0) continue;
    rIdx++;
    if (rIdx > 8) break;
    newsta(G, j + 1, 0, rlist[rIdx - 1], 0, 0);
  }

  // Move valuables starting at troll room
  let roomIdx = MTROL;
  const nonofl = RAIR + RWATER + REND;
  for (let j = 0; j < G.olnt; j++) {
    if (G.oadv[j] !== G.winner || G.otval[j] === 0) continue;
    while ((G.rflag[roomIdx - 1] & nonofl) !== 0) roomIdx++;
    newsta(G, j + 1, 0, roomIdx, 0, 0);
    roomIdx++;
  }

  // Move remaining objects
  for (let j = 0; j < G.olnt; j++) {
    if (G.oadv[j] !== G.winner) continue;
    while ((G.rflag[roomIdx - 1] & nonofl) !== 0) roomIdx++;
    newsta(G, j + 1, 0, roomIdx, 0, 0);
    roomIdx++;
  }
}

/**
 * WEIGHR(cn, ad) — Returns sum of weight of objects in container or on adventurer.
 */
export function weighr(G, cn, ad) {
  let w = 0;
  for (let i = 0; i < G.olnt; i++) {
    if (G.osize[i] >= 10000) continue;
    if (G.oadv[i] === ad && ad !== 0) {
      w += G.osize[i];
      continue;
    }
    // Check containment chain
    let j = i + 1;
    while (true) {
      j = G.ocan[j - 1];
      if (j === 0) break;
      if ((G.oadv[j - 1] === ad && ad !== 0) || j === cn) {
        w += G.osize[i];
        break;
      }
    }
  }
  return w;
}

/**
 * ROBADV(adv, nr, nc, na) — Steal winner's valuables.
 */
export function robadv(G, adv, nr, nc, na) {
  let count = 0;
  for (let i = 0; i < G.olnt; i++) {
    if (G.oadv[i] !== adv || G.otval[i] <= 0 || (G.oflag2[i] & SCRDBT) !== 0) continue;
    newsta(G, i + 1, 0, nr, nc, na);
    count++;
  }
  return count;
}

/**
 * ROBRM(rm, pr, nr, nc, na) — Steal room valuables.
 */
export function robrm(G, rm, pr, nr, nc, na) {
  let count = 0;
  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if (!qhere(G, obj, rm)) continue;
    if (G.otval[i] > 0 && (G.oflag2[i] & SCRDBT) === 0 &&
        (G.oflag1[i] & VISIBT) !== 0 && prob(G, pr, pr)) {
      newsta(G, obj, 0, nr, nc, na);
      count++;
      G.oflag2[i] |= TCHBT;
    } else if ((G.oflag2[i] & ACTRBT) !== 0) {
      count += robadv(G, oactor(G, obj), nr, nc, na);
    }
  }
  return count;
}

/**
 * WINNIN(vl, hr) — See if villain is winning.
 */
export function winnin(G, vl, hr) {
  const vs = G.ocapac[vl - 1];
  const ps = vs - fights(G, hr, true);
  if (ps > 3) return prob(G, 90, 100);
  if (ps > 0) return prob(G, 75, 85);
  if (ps === 0) return prob(G, 50, 30);
  if (vs > 1) return prob(G, 25, 25);
  return prob(G, 10, 0);
}

/**
 * FIGHTS(h, flg) — Compute fight strength.
 */
export function fights(G, h, flg) {
  const STRMAX = 7;
  const STRMIN = 2;
  let f = STRMIN + Math.floor(((STRMAX - STRMIN) * G.ascore[h - 1] + Math.floor(G.mxscor / 2)) / G.mxscor);
  if (flg) f += G.astren[h - 1];
  return f;
}

/**
 * VILSTR(v) — Compute villain strength.
 */
export function vilstr(G, v) {
  let vs = G.ocapac[v - 1];
  if (vs <= 0) return vs;
  if (v === THIEF && G.thfenf) {
    G.thfenf = false;
    vs = Math.min(vs, 2);
  }
  for (let i = 0; i < G.vlnt; i++) {
    if (G.villns[i] === v && G.prsi === G.vbest[i]) {
      vs = Math.max(1, vs - 1);
    }
  }
  return vs;
}

/**
 * OPNCLS(obj, so, sc) — Process open/close for doors.
 */
export function opncls(G, obj, so, sc) {
  if (G.prsa === CLOSEW) {
    if ((G.oflag2[obj - 1] & OPENBT) === 0) {
      rspeak(G, 125 + rnd(3));
      return true;
    }
    rspeak(G, sc);
    G.oflag2[obj - 1] &= ~OPENBT;
    return true;
  }
  if (G.prsa === OPENW) {
    if ((G.oflag2[obj - 1] & OPENBT) !== 0) {
      rspeak(G, 125 + rnd(3));
      return true;
    }
    rspeak(G, so);
    G.oflag2[obj - 1] |= OPENBT;
    return true;
  }
  return false;
}

/**
 * YESNO(q, y, n) — Obtain yes/no answer.
 * Async version: asks question, reads input, returns boolean.
 */
export async function yesno(G, q, y, n) {
  while (true) {
    rspeak(G, q);
    const ans = await G.input();
    if (!ans || ans.length === 0) {
      rspeak(G, 6);
      continue;
    }
    const ch = ans.charAt(0).toUpperCase();
    if (ch === 'Y') {
      rspeak(G, y);
      return true;
    }
    if (ch === 'N') {
      rspeak(G, n);
      return false;
    }
    rspeak(G, 6);
  }
}

/**
 * GHERE(obj, rm) — Is global object actually in this room?
 */
export function ghere(G, obj, rm) {
  if (obj <= GLOBAL) return true;

  const idx = obj - GLOBAL;
  switch (idx) {
    case 1: // Granite wall
      return rm === TEMP1 || rm === TREAS || rm === SLIDE;
    case 2: // House
      return (rm >= WHOUS && rm <= EHOUS) || (rm >= FORE1 && rm <= CLEAR) || rm === MTREE;
    case 3: // Bird
      return (rm >= FORE1 && rm < CLEAR) || rm === MTREE;
    case 4: // Tree
      return (rm >= FORE1 && rm < CLEAR) && rm !== FORE3;
    case 5: // North wall
      return (rm >= BKVW && rm <= BKBOX) || rm === CPUZZ;
    case 6: // East wall
    case 7: // South wall
    case 8: // West wall
      return (rm >= BKVW && rm < BKBOX) || rm === CPUZZ;
    case 9: // Global water
      return (G.rflag[rm - 1] & (RWATER + RFILL)) !== 0;
    case 10: // Global guardians
      return (rm >= MRC && rm <= MRD) || (rm >= MRCE && rm <= MRDW) || rm === INMIR;
    case 11: // Rose
    case 14: // Channel
      return (rm >= MRA && rm <= MRD) || rm === INMIR;
    case 12: // Mirror
      return (rm >= MRA && rm <= MRC) || (rm >= MRAE && rm <= MRCW);
    case 13: // Panel
      if (rm === FDOOR) return true;
      return (rm >= MRA && rm <= MRC) || (rm >= MRAE && rm <= MRCW);
    case 15: // Master
      return rm === FDOOR || rm === NCORR || rm === PARAP || rm === CELL || rm === PCELL || rm === NCELL;
    case 16: // Ladder
      return rm === CPUZZ;
    case 17: // Well
      return rm === TWELL || rm === BWELL;
    case 18: // Rope in slide
      return rm >= SLID1 && rm <= SLEDG;
    case 19: // Slide
      return rm >= SLIDE || (rm >= SLID1 && rm <= SLEDG);
    case 20: // Bunch pseudo object
      return false;
    default:
      bug(G, 60, obj);
      return false;
  }
}

/**
 * MRHERE(rm) — Is mirror here? Returns 0, 1, or 2.
 */
export function mrhere(G, rm) {
  if (rm >= MRAE && rm <= MRDW) {
    // E-W room
    let mh = 1;
    if ((rm - MRAE) % 2 === Math.floor(G.mdir / 180)) mh = 2;
    return mh;
  }

  if (Math.abs(G.mloc - rm) !== 1 || (G.mdir % 180) === 0) return 0;

  let mh = 1;
  if ((rm < G.mloc && G.mdir < 180) || (rm > G.mloc && G.mdir > 180)) mh = 2;
  return mh;
}

/**
 * ENCRYP(inw) — Encrypt password.
 */
export function encryp(G, inw) {
  const keyw = 'ECOVXRMS';
  const ichara = 'A'.charCodeAt(0) - 1;

  const uinw = new Array(8);
  const ukeyw = new Array(8);
  let uinws = 0;
  let ukeyws = 0;
  let j = 0;

  for (let i = 0; i < 8; i++) {
    ukeyw[i] = keyw.charCodeAt(i) - ichara;
    if (j >= inw.length || inw.charCodeAt(j) <= ichara) j = 0;
    uinw[i] = inw.charCodeAt(j) - ichara;
    ukeyws += ukeyw[i];
    uinws += uinw[i];
    j++;
  }

  let usum = (uinws % 8) + 8 * (ukeyws % 8);
  let outw = '';
  for (let i = 0; i < 8; i++) {
    let ch = (uinw[i] ^ ukeyw[i] ^ usum) & 31;
    usum = (usum + 1) % 32;
    if (ch > 26) ch = ch % 26;
    outw += String.fromCharCode(Math.max(1, ch) + ichara);
  }
  return outw;
}

/**
 * NBLEN(string) — Compute string length without trailing blanks.
 */
export function nblen(s) {
  let n = s.length;
  while (n > 0 && s.charAt(n - 1) === ' ') n--;
  return n;
}

/**
 * CPGOTO(st) — Move to next state in puzzle room.
 */
export function cpgoto(G, st) {
  G.rflag[CPUZZ - 1] &= ~RSEEN;
  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if (G.oroom[i] === CPUZZ && (G.oflag2[i] & (ACTRBT + VILLBT)) === 0) {
      newsta(G, obj, 0, G.cphere * HFACTR, 0, 0);
    }
    if (G.oroom[i] === st * HFACTR) {
      newsta(G, obj, 0, CPUZZ, 0, 0);
    }
  }
  G.cphere = st;
}

/**
 * FWIM(f1, f2, rm, con, adv, nocare) — Find what I mean.
 */
export function fwim(G, f1, f2, rm, con, adv, nocare) {
  let result = 0;
  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if ((rm !== 0 && !qhere(G, obj, rm)) &&
        (adv === 0 || G.oadv[i] !== adv) &&
        (con === 0 || G.ocan[i] !== con)) continue;

    if ((G.oflag1[i] & VISIBT) === 0) continue;
    if (!nocare && (G.oflag1[i] & TAKEBT) === 0) {
      // Not takeable, check container
    } else if ((G.oflag1[i] & f1) === 0 && (G.oflag2[i] & f2) === 0) {
      // Doesn't match flags, check container
    } else {
      if (result === 0) {
        result = obj;
      } else {
        return -result; // ambiguous
      }
    }

    // Check inside open containers
    if ((G.oflag2[i] & OPENBT) === 0) continue;
    for (let j = 0; j < G.olnt; j++) {
      if (G.ocan[j] !== obj || (G.oflag1[j] & VISIBT) === 0) continue;
      if ((G.oflag1[j] & f1) === 0 && (G.oflag2[j] & f2) === 0) continue;
      if (result === 0) {
        result = j + 1;
      } else {
        return -result;
      }
    }
  }
  return result;
}

/**
 * VALUAC(obj) — Handle collective object (valuables, everything, possessions, bunch).
 * Stub: will be expanded.
 */
export function valuac(G, obj) {
  // TODO: implement collective object handling
}

/**
 * THIEFD — Thief demon.
 * Stub: will be expanded when demons are ported.
 */
export function thiefd(G) {
  // TODO: implement thief demon
}

/**
 * FIGHTD — Fight demon.
 * Stub.
 */
export function fightd(G) {
  // TODO: implement fight demon
}

/**
 * SWORDD — Sword demon.
 * Stub.
 */
export function swordd(G) {
  // TODO: implement sword demon
}
