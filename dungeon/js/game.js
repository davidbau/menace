// game.js - Game state and main loop for DUNGEON
//
// Ported from dungeon.f / game.f (Fortran) and dmain.c / dgame.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  PLAYER, BUNMAX,
  MMAX, RMAX, XXMAX, OMAX, R2MAX, CMAX, VMAX, AMAX, FMAX, SMAX,
  WALKW, WALKIW, FOOW, TELLW,
  VALUA, EVERY, POSSE, BUNOBJ,
  ECHOR, MRB, SCRDBT, THIEF, BALLO,
  XMIN,
  rspeak, rspsub, rmdesc, lit, findxt,
  clockd, thiefd, fightd, swordd,
  objact, vappli, aappli, rappli, oappli,
  score, valuac, newsta,
  _registerVerbsModule,
  _registerObjectsModule,
  _registerRoomsModule,
  dungeonSrand,
} from './support.js';

import { rdline, parse } from './parser.js';

// Register verb, object, and room handlers to break circular dependencies
import * as _verbsModule from './verbs.js';
_registerVerbsModule(_verbsModule);
import * as _objectsModule from './objects.js';
_registerObjectsModule(_objectsModule);
import * as _roomsModule from './rooms.js';
_registerRoomsModule(_roomsModule);

// ---------------------------------------------------------------
// DungeonGame class
// ---------------------------------------------------------------

export class DungeonGame {
  constructor() {
    // Game state will be initialized in init()
    this.gameOver = false;
  }

  /**
   * Initialize game state from dungeon-data.json data.
   * @param {object} data - The parsed dungeon-data.json object.
   * @param {object} textRecords - The parsed dungeon-text.json object
   *   (record-number -> {r, link, d} map of all DTEXT records).
   */
  init(data, textRecords) {
    const G = this;

    // ---- Text record database (all DTEXT records by record number) ----
    G.textRecords = textRecords || {};

    // ---- Version info ----
    G.vmaj = data.vmaj;
    G.vmin = data.vmin;
    G.vedit = data.vedit;

    // ---- Score ----
    G.mxscor = data.mxscor;
    G.strbit = data.strbit;
    G.egmxsc = data.egmxsc;
    G.egscor = 0;
    G.rwscor = 0;

    // ---- Rooms ----
    G.rlnt = data.rooms.count;
    G.rdesc2 = data.rooms.rdesc2;
    G.rdesc1 = [...data.rooms.rdesc1];
    G.rexit = [...data.rooms.rexit];
    G.ractio = [...data.rooms.ractio];
    G.rval = data.rooms.rval ? [...data.rooms.rval] : new Array(RMAX).fill(0);
    G.rflag = [...data.rooms.rflag];

    // ---- Exits ----
    G.xlnt = data.exits.count;
    G.travel = [...data.exits.travel];

    // ---- Objects ----
    G.olnt = data.objects.count;
    G.odesc1 = [...data.objects.odesc1];
    G.odesc2 = [...data.objects.odesc2];
    G.odesco = [...data.objects.odesco];
    G.oactio = [...data.objects.oactio];
    G.oflag1 = [...data.objects.oflag1];
    G.oflag2 = [...data.objects.oflag2];
    G.ofval = [...data.objects.ofval];
    G.otval = [...data.objects.otval];
    G.osize = [...data.objects.osize];
    G.ocapac = [...data.objects.ocapac];
    G.oroom = [...data.objects.oroom];
    G.oadv = [...data.objects.oadv];
    G.ocan = [...data.objects.ocan];
    G.oread = [...data.objects.oread];

    // ---- Room2 (multi-room objects) ----
    G.r2lnt = data.room2.count;
    G.o2 = [...data.room2.oroom2];
    G.r2 = [...data.room2.rroom2];

    // ---- Clock events ----
    G.clnt = data.events.count;
    G.ctick = [...data.events.ctick];
    G.cactio = [...data.events.cactio];
    G.cflag = [...data.events.cflag];
    G.ccncel = [...data.events.ccncel];

    // ---- Villains ----
    G.vlnt = data.villains.count;
    G.villns = [...data.villains.villns];
    G.vprob = [...data.villains.vprob];
    G.vopps = [...data.villains.vopps];
    G.vbest = [...data.villains.vbest];
    G.vmelee = [...data.villains.vmelee];

    // ---- Adventurers ----
    G.alnt = data.adventurers.count;
    G.aroom = [...data.adventurers.aroom];
    G.ascore = [...data.adventurers.ascore];
    G.avehic = [...data.adventurers.avehic];
    G.aobj = [...data.adventurers.aobj];
    G.aactio = [...data.adventurers.aactio];
    G.astren = [...data.adventurers.astren];
    G.aflag = [...data.adventurers.aflag];

    // ---- Messages ----
    G.mbase = data.messages.mbase;
    G.mlnt = data.messages.count;
    G.rtext = [...data.messages.rtext];
    G.messageTexts = data.messages.texts;

    // ---- Parse state ----
    G.prsa = 0;
    G.prsi = 0;
    G.prso = 0;
    G.prswon = false;
    G.prscon = 1;

    // ---- Orphan state ----
    G.oflag = 0;
    G.oact = 0;
    G.oprep1 = 0;
    G.oobj1 = 0;
    G.oprep = 0;
    G.oname = ' ';
    G.oprep2 = 0;
    G.oobj2 = 0;

    // ---- Bunch vector ----
    G.bunlnt = 0;
    G.bunsub = 0;
    G.bunvec = new Array(BUNMAX).fill(0);

    // ---- Input state ----
    G.inbuf = '';
    G.inlnt = 0;
    G.sublnt = 0;
    G.subbuf = '';
    G.lastit = G.aobj[PLAYER - 1];

    // ---- Play state ----
    G.winner = PLAYER;
    G.here = G.aroom[PLAYER - 1];
    G.telflg = false;
    G.moves = 0;
    G.deaths = 0;
    G.mxload = 100;
    G.ltshft = 10;
    G.bloc = G.oroom[BALLO - 1];
    G.mungrm = 0;
    G.hs = 0;
    G.pltime = 0;

    // ---- Flags ----
    // Initialize all flags to false
    G.trollf = false;
    G.cagesf = false;
    G.bucktf = false;
    G.caroff = false;
    G.carozf = false;
    G.lwtidf = false;
    G.domef = false;
    G.glacrf = false;
    G.echof = false;
    G.riddlf = false;
    G.lldf = false;
    G.cyclof = false;
    G.magicf = false;
    G.litldf = false;
    G.safef = false;
    G.gnomef = false;
    G.gnodrf = false;
    G.mirrmf = false;
    G.egyptf = true;   // starts true
    G.onpolf = false;
    G.blabf = false;
    G.brieff = false;
    G.superf = false;
    G.buoyf = false;
    G.grunlf = false;
    G.gatef = false;
    G.rainbf = false;
    G.cagetf = true;    // starts true
    G.empthf = false;
    G.deflaf = false;
    G.glacmf = false;
    G.frobzf = false;
    G.endgmf = false;
    G.badlkf = false;
    G.thfenf = false;
    G.singsf = false;
    G.mrpshf = false;
    G.mropnf = false;
    G.wdopnf = false;
    G.mr1f = true;      // starts true
    G.mr2f = true;      // starts true
    G.inqstf = false;
    G.follwf = true;    // starts true
    G.spellf = false;
    G.cpoutf = false;
    G.cpushf = false;
    G.deadf = false;
    G.zgnomf = false;
    G.matf = false;
    G.plookf = false;
    G.ptoucf = false;
    G.broc1f = false;
    G.broc2f = false;
    G.exorbf = false;
    G.exorcf = false;
    G.punlkf = false;

    // ---- Switches ----
    G.btief = 0;
    G.binff = 0;
    G.rvmnt = 0;
    G.rvclr = 0;
    G.rvcyc = 0;
    G.rvsnd = 0;
    G.rvgua = 0;
    G.orrug = 0;
    G.orcand = 0;
    G.ormtch = 4;
    G.orlamp = 0;
    G.mdir = 270;
    G.mloc = MRB;
    G.poleuf = 0;
    G.quesno = 0;
    G.nqatt = 0;
    G.corrct = 0;
    G.lcell = 1;
    G.pnumb = 1;
    G.acell = 0;
    G.dcell = 0;
    G.cphere = 10;
    G.ttie = 0;
    G.matobj = 0;

    // ---- Thief / demon state ----
    G.thfpos = G.oroom[THIEF - 1];
    G.thfflg = false;
    G.thfact = true;
    G.swdact = false;
    G.swdsta = 0;

    // ---- Misc ----
    G.dbgflg = 0;
    G.prsflg = 0;
    G.gdtflg = 1;
    G.fromdr = 0;
    G.scolrm = 0;
    G.scolac = 0;

    // ---- Puzzle room ----
    G.cpdr = [XMIN, -8, 2048, -7, 3072, 1, 4096, 9,
              5120, 8, 6144, 7, 7168, -1, 8192, -9];
    G.cpwl = [269, -8, 270, 8, 271, 1, 272, -1];
    G.cpvec = [
      1,1,1,1,1,1,1,1,
      1,0,-1,0,0,-1,0,1,
      1,-1,0,1,0,-2,0,1,
      1,0,0,0,0,1,0,1,
      1,-3,0,0,-1,-1,0,1,
      1,0,0,-1,0,0,0,1,
      1,1,1,0,0,0,1,1,
      1,1,1,1,1,1,1,1,
    ];

    // Exit type lengths
    G.xelnt = [1, 2, 3, 3];

    // Current exit state
    G.xtype = 0;
    G.xroom1 = 0;
    G.xstrng = 0;
    G.xactio = 0;
    G.xobj = 0;

    // Screen of light
    G.scoldr = [XMIN, 153, 5120, 154, 3072, 152, 7168, 151];
    G.scolwl = [151,271,3072,152,272,7168,153,270,5120,154,269,XMIN];

    // Bat drop rooms
    G.batdrp = [66,67,68,69,70,71,72,65,73];

    // Syntax matching temporaries
    G._sparseAct = 0;
    G._sparseObj1 = 0;
    G._sparseObj2 = 0;
    G._sparsePrep1 = 0;
    G._sparsePrep2 = 0;
    G._vflag = 0;
    G._dobj = 0; G._dfl1 = 0; G._dfl2 = 0; G._dfw1 = 0; G._dfw2 = 0;
    G._iobj = 0; G._ifl1 = 0; G._ifl2 = 0; G._ifw1 = 0; G._ifw2 = 0;
  }

  /**
   * Serialize all mutable game state (excludes large static text databases).
   * Used for save/restore persistence.
   */
  getSaveState() {
    const skip = new Set(['textRecords', 'messageTexts', 'rdesc2', 'input', 'output', 'doSave', 'doRestore']);
    const state = {};
    for (const [key, val] of Object.entries(this)) {
      if (skip.has(key)) continue;
      if (typeof val === 'function') continue;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) continue;
      state[key] = Array.isArray(val) ? [...val] : val;
    }
    return state;
  }

  /**
   * Restore mutable game state from a previously saved snapshot.
   */
  setSaveState(state) {
    const skip = new Set(['textRecords', 'messageTexts', 'rdesc2', 'input', 'output', 'doSave', 'doRestore']);
    for (const [key, val] of Object.entries(state)) {
      if (skip.has(key)) continue;
      this[key] = val;
    }
  }

  /**
   * Run the main game loop.
   * @param {Function} input - Async function that returns a line of input (string).
   * @param {Function} output - Function that takes a string and displays it.
   * @param {object} [options] - { restored: bool } — skip welcome if restoring a save.
   */
  async run(input, output, options = {}) {
    const G = this;
    G.input = input;
    G.output = output;

    // Initialize RNG — use fixed seed if set, otherwise date/time like Fortran
    if (G._rngSeed !== undefined) {
      dungeonSrand(G._rngSeed);
    } else {
      const now = new Date();
      const i = now.getMonth() * 64 + now.getDate() * 8 + Math.floor(now.getFullYear() / 100);
      const j = now.getHours() * 64 + now.getMinutes() * 8 + now.getSeconds();
      dungeonSrand(((j << 16) + i) | 1);
    }

    if (options.restored) {
      // Restored from save — describe current location
      G.output('Saved game restored.');
      rmdesc(G, 3);
    } else {
      // Welcome message
      rspeak(G, 1);

      // Describe starting location
      rmdesc(G, 3);
    }

    // Main game loop
    while (!G.gameOver) {
      G.winner = PLAYER;
      G.telflg = false;

      // Read command if needed
      if (G.prscon <= 1) {
        const result = await rdline(G, 1);
        if (result === null) {
          // EOF — quit
          break;
        }
      }

      // Check for GDT (debugging tool) — skip in JS port
      // In Fortran: if inbuf starts with 'GDT', call GDT.
      // We skip this.

      G.moves++;
      G.sublnt = 0;
      const prvher = G.here;
      const prvlit = lit(G, G.here);

      // Parse input
      G.prswon = parse(G, G.inbuf, G.inlnt, true);
      if (G._trace) console.error(`GAME: move=${G.moves} here=${G.here} prsa=${G.prsa} prso=${G.prso} prsi=${G.prsi} prswon=${G.prswon}`);

      if (!G.prswon) {
        // Parse failed
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Check for actor action
      if (aappli(G, G.aactio[G.winner - 1])) {
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Check for vehicle action
      if (xvehic(G, 1)) {
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // TELL command
      if (G.prsa === TELLW) {
        await handleTell(G);
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Collective objects (valuables, everything, possessions, bunch)
      if (G.prso === VALUA || G.prso === EVERY || G.prso === POSSE || G.prso === BUNOBJ) {
        valuac(G, G.prso);
        // After valuac, fall through to room action
        if (!(G.echof || G.deadf) && G.here === ECHOR) {
          await handleEchoRoom(G);
          xendmv(G);
          if (!lit(G, G.here)) G.prscon = 1;
          continue;
        }
        rappli(G, G.ractio[G.here - 1]);
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Verb action
      if (!vappli(G, G.prsa)) {
        // Verb handler didn't handle it — fall through
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Check if room became lit
      if (!prvlit && G.here === prvher && lit(G, G.here)) {
        rmdesc(G, 0);
      }

      // Echo room special handling
      if (!(G.echof || G.deadf) && G.here === ECHOR) {
        await handleEchoRoom(G);
        xendmv(G);
        if (!lit(G, G.here)) G.prscon = 1;
        continue;
      }

      // Room action
      rappli(G, G.ractio[G.here - 1]);

      // End of move
      xendmv(G);
      if (!lit(G, G.here)) G.prscon = 1;
    }
  }
}

// ---------------------------------------------------------------
// XENDMV — Execute end-of-move functions
// ---------------------------------------------------------------

function xendmv(G) {
  if (!G.telflg) rspeak(G, 341); // default remark
  if (G.thfact) thiefd(G);       // thief demon
  if (G.prswon && !G.deadf) fightd(G); // fight demon
  if (G.swdact) swordd(G);       // sword demon
  if (G.prswon) clockd(G);       // clock demon
  if (G.prswon) xvehic(G, 2);    // vehicle readout
}

// ---------------------------------------------------------------
// XVEHIC — Execute vehicle function
// ---------------------------------------------------------------

function xvehic(G, n) {
  const av = G.avehic[G.winner - 1];
  if (av === 0) return false;
  return oappli(G, G.oactio[av - 1], n);
}

// ---------------------------------------------------------------
// Echo room handler
// ---------------------------------------------------------------

async function handleEchoRoom(G) {
  while (true) {
    const result = await rdline(G, 0);
    if (result === null) return;
    G.moves++;

    if (G.inbuf === 'ECHO') {
      rspeak(G, 571);
      G.echof = true;
      // Let thief steal bar
      const BAR = 26;
      G.oflag2[BAR - 1] &= ~SCRDBT;
      G.prswon = true;
      G.prscon = 1;
      return;
    }

    if (G.inbuf === 'BUG') {
      rspeak(G, 913);
      continue;
    }
    if (G.inbuf === 'FEATURE') {
      rspeak(G, 914);
      continue;
    }

    // Parse in echo mode (non-verbose)
    G.prswon = parse(G, G.inbuf, G.inlnt, false);
    if (G.prswon && G.prsa === WALKW) {
      const fx = findxt(G, G.prso, G.here);
      if (fx.found) return; // valid exit, return to main loop
    }

    // Echo the input
    G.output(' ' + G.inbuf.substring(0, G.inlnt));
    G.telflg = true;
  }
}

// ---------------------------------------------------------------
// TELL handler
// ---------------------------------------------------------------

async function handleTell(G) {
  if (G.sublnt === 0) {
    rspsub(G, 946, G.odesc2[G.prso - 1]);
    G.prscon = 0;
    return;
  }

  // "Tell self" — just echo
  const OPLAY = 251;
  if (G.prso === OPLAY) {
    G.output(` Ok: "${G.subbuf}".`);
    G.telflg = true;
    G.prscon = 0;
    return;
  }

  // Try object handler
  if (objact(G)) {
    // Object handled it
    if (!(G.echof || G.deadf) && G.here === ECHOR) return;
    rappli(G, G.ractio[G.here - 1]);
    return;
  }

  // Check if actor
  const ACTRBT = 1024;
  if ((G.oflag2[G.prso - 1] & ACTRBT) !== 0) {
    // Actor — execute commands as them
    const svprsc = G.prscon;
    const svprso = G.prso;
    G.prscon = 1;

    // Set up new player
    const oactor = findOactor(G, svprso);
    G.winner = oactor;
    G.here = G.aroom[G.winner - 1];

    G.prswon = parse(G, G.subbuf, G.sublnt, true);
    if (!G.prswon) {
      if (G.oflag !== 0) rspeak(G, 604);
      G.oflag = 0;
      G.winner = PLAYER;
      G.here = G.aroom[G.winner - 1];
      return;
    }

    if (aappli(G, G.aactio[G.winner - 1])) {
      // Actor handled
    } else if (xvehic(G, 1)) {
      // Vehicle handled
    } else if (G.prso === VALUA || G.prso === EVERY || G.prso === POSSE || G.prso === BUNOBJ) {
      valuac(G, G.prso);
      rappli(G, G.ractio[G.here - 1]);
    } else if (!vappli(G, G.prsa)) {
      // Verb didn't handle
    } else {
      rappli(G, G.ractio[G.here - 1]);
    }

    G.winner = PLAYER;
    G.here = G.aroom[G.winner - 1];
    return;
  }

  // Not an actor
  const VICTBT = 32;
  let msgIdx = 602;
  if ((G.oflag1[G.prso - 1] & VICTBT) !== 0) msgIdx = 888;
  rspsub(G, msgIdx, G.odesc2[G.prso - 1]);
  G.prscon = 0;
}

function findOactor(G, obj) {
  for (let i = 0; i < G.alnt; i++) {
    if (G.aobj[i] === obj) return i + 1;
  }
  return 1; // fallback
}

export default DungeonGame;
