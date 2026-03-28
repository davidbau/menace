// game.js - AdventureGame class for Colossal Cave Adventure
//
// Ported from open-adventure 2.5
// Ties together: state, prng, misc, actions, score, main-loop
// Follows the pattern of dungeon/js/game.js.

import { AdventurePRNG } from './prng.js';
import { GameState } from './state.js';
import {
  speak, rspeak, rndvoc, yes, vocab, makewd, makewd_from_string,
  setbit, drop, move, setprm,
  FORCED, CNDBIT, OUTSID, INDEEP,
} from './misc.js';
import { doCommand } from './main-loop.js';
import { score } from './score.js';

function IABS(n) { return Math.abs(n); }
function MOD(n, m) { return ((n % m) + m) % m; }

export class AdventureGame {
  constructor() {
    this.G = null;
  }

  /**
   * Initialize game state from adventure-data.json.
   * @param {object} data - The parsed adventure-data.json object.
   */
  init(data) {
    const G = new GameState();
    this.G = G;
    G.data = data;

    // Initialize PRNG
    G.rng = new AdventurePRNG();

    // Build vocabulary map from the ATAB/KTAB data in the vocabulary array.
    // The JSON vocabulary has: word (decoded from KTAB, garbled), id (ATAB%1000), type (ATAB/1000).
    // We need to rebuild ATAB/KTAB from raw data.
    // Since the vocabulary in the JSON is unreliable, we build it from known word lists.
    buildVocabulary(G, data);

    // Run initialise() - port of init.c
    initialise(G, data);
  }

  /**
   * Main game loop.
   * @param {function} inputFn - async function returning a line of text (string or null for EOF)
   * @param {function} outputFn - function(string) for output
   */
  async run(inputFn, outputFn) {
    const G = this.G;
    G.input = inputFn;
    G.output = outputFn;

    // L1: Start-up
    G.SETUP = -1;
    G.I = 0;
    G.ZZWORD = rndvoc(G, 3, 0);
    G.NOVICE = await yes(G, 65, 1, 0);
    G.NEWLOC = 1;
    G.LOC = 1;
    G.LIMIT = 330;
    if (G.NOVICE) G.LIMIT = 1000;

    // Main game loop
    while (true) {
      const cont = await doCommand(G);
      if (!cont) break;
    }
    score(G, 1);
  }

  /**
   * Set the RNG seed for deterministic replay.
   * @param {number} n
   */
  setSeed(n) {
    this.G.rng.setSeed(n);
  }

  /**
   * Get serializable save state.
   */
  getSaveState() {
    const G = this.G;
    return {
      // All game-relevant scalars
      ABBNUM: G.ABBNUM, BLKLIN: G.BLKLIN, BONUS: G.BONUS,
      CLOCK1: G.CLOCK1, CLOCK2: G.CLOCK2, CLOSED: G.CLOSED, CLOSNG: G.CLOSNG,
      CLSHNT: G.CLSHNT, DETAIL: G.DETAIL, DFLAG: G.DFLAG, DKILL: G.DKILL,
      DTOTAL: G.DTOTAL, FOOBAR: G.FOOBAR, HOLDNG: G.HOLDNG, IWEST: G.IWEST,
      IGO: G.IGO, KNFLOC: G.KNFLOC, LIMIT: G.LIMIT, LL: G.LL,
      LMWARN: G.LMWARN, LOC: G.LOC, NEWLOC: G.NEWLOC, NUMDIE: G.NUMDIE,
      OBJ: G.OBJ, OLDLC2: G.OLDLC2, OLDLOC: G.OLDLOC, OLDOBJ: G.OLDOBJ,
      PANIC: G.PANIC, SAVED: G.SAVED, SETUP: G.SETUP,
      SPK: G.SPK, TALLY: G.TALLY, THRESH: G.THRESH, TRNDEX: G.TRNDEX,
      TRNLUZ: G.TRNLUZ, TURNS: G.TURNS, VERB: G.VERB,
      WZDARK: G.WZDARK, ZZWORD: G.ZZWORD, NOVICE: G.NOVICE,
      // Arrays
      ABB: [...G.ABB], ATLOC: [...G.ATLOC],
      DLOC: [...G.DLOC], DSEEN: [...G.DSEEN],
      FIXED: [...G.FIXED], HINTED: [...G.HINTED], HINTLC: [...G.HINTLC],
      LINK: [...G.LINK], ODLOC: [...G.ODLOC],
      PLACE: [...G.PLACE], PROP: [...G.PROP],
      // RNG state
      rngX: G.rng.x,
    };
  }

  /**
   * Restore from a save state.
   * @param {object} state
   */
  setSaveState(state) {
    const G = this.G;
    for (const [key, val] of Object.entries(state)) {
      if (key === 'rngX') {
        G.rng.x = val;
      } else if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) G[key][i] = val[i];
      } else {
        G[key] = val;
      }
    }
  }
}

// ---- Build vocabulary from known word lists ----
// The vocabulary maps uppercase 5-char-max words to KTAB values.
// KTAB encodes type*1000 + id: type 0=motion, 1=object, 2=action, 3=special.
function buildVocabulary(G, data) {
  // We need to build both the packed-word ATAB entries and the KTAB entries.
  // The simplest approach: define all known adventure words with their types and IDs.
  const vocab = [];

  // Helper: add word with packed representation
  function addWord(word, ktabValue) {
    const packed = makewd_from_string(word.toUpperCase().substring(0, 5));
    vocab.push({ word: word.toUpperCase().substring(0, 5), atab: packed, ktab: ktabValue });
  }

  // Motion verbs (type 0, KTAB = id)
  const motionWords = {
    'ROAD': 2, 'HILL': 2, 'ENTER': 3, 'UPSTR': 4, 'DOWNS': 5,
    'FORES': 6, 'FORWA': 7, 'CONTI': 7, 'ONWAR': 7,
    'BACK': 8, 'RETUR': 8, 'RETRE': 8,
    'VALLE': 9, 'STAIR': 10, 'UPWAR': 11, 'UP': 11, 'ABOVE': 11, 'ASCEN': 11,
    'DOWN': 12, 'DESCE': 12, 'D': 12,
    'PASSE': 13, 'TUNNE': 13, 'IN': 19, 'INSID': 19, 'ENTER': 3,
    'OUT': 14, 'OUTSI': 14, 'EXIT': 14, 'LEAVE': 14,
    'NORTH': 15, 'N': 15, 'SOUTH': 16, 'S': 16,
    'EAST': 17, 'E': 17, 'WEST': 18, 'W': 18,
    'NE': 20, 'NORTH': 15, 'SE': 21, 'NW': 22, 'SW': 23,
    'DEBRI': 24, 'HOLEW': 24, 'LEFT': 25, 'RIGHT': 26,
    'HALL': 27, 'JUMP': 28, 'BARRE': 29, 'OVER': 30,
    'ACROS': 30, 'STREA': 31, 'BED': 32, 'CRAWL': 33,
    'COBBL': 34, 'INWAR': 35, 'SURFA': 36, 'NULL': 37, 'NOWHE': 37,
    'DARK': 38, 'PIT': 39, 'CLIMB': 40,
    'LOOK': 41, 'EXAMI': 41, 'TOUCH': 41, 'DESCR': 41,
    'CROSS': 42, 'PLOVE': 43, 'ORIEN': 44, 'CAVER': 45,
    'SHELL': 46, 'RESER': 47, 'OFFIC': 48, 'MAIN': 48,
    'FORK': 49, 'BEDQU': 50, 'CRACK': 51,
    'DOME': 52, 'SLIDE': 53, 'SLAB': 54, 'XYZZY': 62,
    'DEPRE': 55, 'ENTRA': 56, 'PLUGH': 65, 'SECRE': 66,
    'CAVE': 67, 'Y2': 58, 'SAYIT': 59, 'ABRA': 60, 'ABRAC': 60,
    'OPENC': 60, 'SESAM': 60, 'SHAZZ': 60, 'HOCUS': 60, 'POCUS': 60,
    'FEE': 61, 'FIE': 61, 'FOE': 61, 'FOO': 61, 'FUM': 61,
    'TREES': 63, 'TREE': 63, 'DIG': 64, 'EXCAV': 64,
    'LOST': 68, 'MIST': 69, 'FUCKI': 70, 'SHIT': 70, 'DAMN': 70,
    'STOP': 71, 'INFO': 72, 'INFOR': 72, 'SWIM': 73,
    'WITTS': 74, 'WITTS': 74, 'LOG': 75, 'CATCH': 76,
  };
  for (const [word, id] of Object.entries(motionWords)) {
    addWord(word, id);
  }

  // Object words (type 1, KTAB = 1000 + id)
  const objectWords = {
    'KEYS': 1, 'KEY': 1, 'SET': 1,
    'LAMP': 2, 'LANTE': 2, 'HEADL': 2,
    'GRATE': 3, 'CAGE': 4, 'ROD': 5,
    'ROD': 5, 'STEPS': 7, 'STAIR': 7,
    'BIRD': 8, 'DOOR': 9, 'RUSTI': 9,
    'PILLO': 10, 'VELVE': 10, 'SNAKE': 11,
    'FISSU': 12, 'TABLE': 13, 'STONE': 13,
    'CLAM': 14, 'OYSTE': 15,
    'MAGAZ': 16, 'ISSUE': 16, 'SPELU': 16, 'MAGZI': 16,
    'DWARF': 17, 'DWARV': 17,
    'KNIFE': 18, 'KNIVE': 18,
    'FOOD': 19, 'RATIO': 19,
    'BOTTL': 20, 'JAR': 20,
    'WATER': 21, 'H2O': 21,
    'OIL': 22,
    'MIRRO': 23, 'PLANT': 24, 'BEANS': 24,
    'STALA': 26, 'SHADO': 27, 'FIGUR': 27,
    'AXE': 28,
    'DRAWI': 29, 'PIRAT': 30,
    'DRAGO': 31, 'CHASM': 32,
    'TROLL': 33, 'BEAR': 34,
    'MESSA': 35, 'VOLCA': 36, 'GEYSE': 36,
    'MACHI': 37, 'VENDI': 37,
    'BATTE': 38, 'BATTE': 38,
    'CARPE': 39, 'MOSS': 39,
    'OGRE': 40, 'URN': 41,
    'CAVIT': 42, 'BLOOD': 43,
    'RESER': 44, 'APPEN': 45, 'LEPOR': 45,
    'MUD': 46, 'SIGN': 47, 'NOTE': 48,
    // Treasures (50+)
    'GOLD': 50, 'NUGGE': 50,
    'DIAMO': 51, 'SILVE': 52, 'JEWEL': 53,
    'COINS': 54, 'JEWEL': 53,
    'CHEST': 55, 'BOX': 55, 'TREAS': 55,
    'EGGS': 56, 'EGG': 56, 'NEST': 56,
    'TRIDE': 57, 'TRIDA': 57, 'TRIDE': 57,
    'VASE': 58, 'MING': 58, 'SHERD': 58, 'POTTE': 58,
    'EMERA': 59,
    'PLATI': 60, 'PYRAM': 60,
    'PEARL': 61,
    'RUG': 62, 'PERSI': 62,
    'SPICE': 63,
    'CHAIN': 64,
    'RUBY': 65, 'RUBIE': 65,
    'JADE': 66,
    'AMBER': 67, 'GEMST': 67,
    'SAPPH': 68,
  };
  for (const [word, id] of Object.entries(objectWords)) {
    addWord(word, 1000 + id);
  }

  // Action verbs (type 2, KTAB = 2000 + id)
  const actionWords = {
    'TAKE': 1, 'CARRY': 1, 'KEEP': 1, 'CATCH': 1, 'STEAL': 1,
    'CAPTU': 1, 'GET': 1, 'TOTE': 1,
    'DROP': 2, 'RELEA': 2, 'FREE': 2, 'DISCA': 2, 'DUMP': 2,
    'SAY': 3, 'CHANT': 3, 'SING': 3, 'UTTER': 3, 'MUMBL': 3,
    'UNLOC': 4, 'OPEN': 4,
    'NOTHI': 5,
    'LOCK': 6, 'CLOSE': 6,
    'LIGHT': 7, 'ON': 7,
    'EXTIN': 8, 'OFF': 8,
    'WAVE': 9, 'SHAKE': 9, 'SWING': 9,
    'CALM': 10, 'PLACA': 10, 'TAME': 10,
    'WALK': 11, 'RUN': 11, 'TRAVE': 11, 'GO': 11, 'PROCE': 11,
    'ATTAC': 12, 'KILL': 12, 'FIGHT': 12, 'HIT': 12, 'STRIK': 12, 'SLAY': 12,
    'POUR': 13,
    'EAT': 14, 'DEVOU': 14,
    'DRINK': 15,
    'RUB': 16, 'POLIS': 16,
    'THROW': 17, 'TOSS': 17,
    'QUIT': 18, 'Q': 18,
    'FIND': 19, 'WHERE': 19,
    'INVEN': 20, 'I': 20,
    'FEED': 21,
    'FILL': 22,
    'BLAST': 23, 'DETON': 23, 'IGNIT': 23, 'BLOWU': 23,
    'SCORE': 24,
    'FEE': 25, 'FIE': 25, 'FOE': 25, 'FOO': 25, 'FUM': 25,
    'BRIEF': 26,
    'READ': 27, 'PERUS': 27,
    'BREAK': 28, 'SHATT': 28, 'SMASH': 28,
    'WAKE': 29, 'DISTU': 29,
    'SUSPE': 30, 'PAUSE': 30, 'SAVE': 30,
    'RESUM': 31, 'RESTA': 31,
    'FLY': 32,
    'LISTE': 33,
    'ZZZZZ': 34,
  };
  for (const [word, id] of Object.entries(actionWords)) {
    addWord(word, 2000 + id);
  }

  // Special words (type 3, KTAB = 3000 + message_id)
  const specialWords = {
    'FEE': 3001, 'FIE': 3002, 'FOE': 3003, 'FOO': 3004, 'FUM': 3005,
    'HELP': 3051, '?': 3051,
    'YES': 3050, 'Y': 3050,
    'NO': 3054,
    'HOURS': 3064,
    'ABRA': 3066, 'ABRAC': 3066,
    'OPENC': 3066, 'SESAM': 3066, 'SHAZZ': 3066, 'HOCUS': 3066, 'POCUS': 3066,
    'XYZZY': 3068, 'PLUGH': 3069,
    'LOG': 3079,
  };
  for (const [word, ktab] of Object.entries(specialWords)) {
    addWord(word, ktab);
  }

  G.vocabMap = vocab;
}

// ---- Initialise (port of init.c) ----
function initialise(G, data) {
  // Clear PLACE, PROP, LINK
  for (let i = 1; i <= 100; i++) {
    G.PLACE[i] = 0;
    G.PROP[i] = 0;
    G.LINK[i] = 0;
    G.LINK[i + 100] = 0;
  }

  // Set COND forced-motion and clear ATLOC
  const LOCSIZ = 185;
  for (let i = 1; i <= LOCSIZ; i++) {
    G.ABB[i] = 0;
    if (data.ltext[i] !== 0 && data.key[i] !== 0) {
      const k = data.key[i];
      if (MOD(IABS(data.travel[k]), 1000) === 1) {
        // Note: cond is already set in the data
      }
    }
    G.ATLOC[i] = 0;
  }

  // Set up ATLOC and LINK using DROP, backwards for two-placed objects first
  for (let i = 1; i <= 100; i++) {
    const k = 101 - i;
    if (data.fixd[k] <= 0) continue;
    drop(G, k + 100, data.fixd[k]);
    drop(G, k, data.plac[k]);
  }
  for (let i = 1; i <= 100; i++) {
    const k = 101 - i;
    G.FIXED[k] = data.fixd[k];
    if (data.plac[k] !== 0 && data.fixd[k] <= 0) drop(G, k, data.plac[k]);
  }

  // Treasures
  G.MAXTRS = 79;
  G.TALLY = 0;
  for (let i = 50; i <= G.MAXTRS; i++) {
    if (data.ptext[i] !== 0) G.PROP[i] = -1;
    G.TALLY -= G.PROP[i];
  }

  // Clear hints
  for (let i = 1; i <= data.hntmax; i++) {
    G.HINTED[i] = 0;
    G.HINTLC[i] = 0;
  }

  // Object mnemonics (resolve via vocab)
  G.AXE = vocLookup(G, 'AXE', 1);
  G.BATTER = vocLookup(G, 'BATTE', 1);
  G.BEAR = vocLookup(G, 'BEAR', 1);
  G.BIRD = vocLookup(G, 'BIRD', 1);
  G.BLOOD = vocLookup(G, 'BLOOD', 1);
  G.BOTTLE = vocLookup(G, 'BOTTL', 1);
  G.CAGE = vocLookup(G, 'CAGE', 1);
  G.CAVITY = vocLookup(G, 'CAVIT', 1);
  G.CHASM = vocLookup(G, 'CHASM', 1);
  G.CHEST = vocLookup(G, 'CHEST', 1);
  G.CLAM = vocLookup(G, 'CLAM', 1);
  G.COINS = vocLookup(G, 'COINS', 1);
  G.DOOR = vocLookup(G, 'DOOR', 1);
  G.DRAGON = vocLookup(G, 'DRAGO', 1);
  G.DWARF = vocLookup(G, 'DWARF', 1);
  G.EGGS = vocLookup(G, 'EGGS', 1);
  G.EMRALD = vocLookup(G, 'EMERA', 1);
  G.FISSUR = vocLookup(G, 'FISSU', 1);
  G.FOOD = vocLookup(G, 'FOOD', 1);
  G.GRATE = vocLookup(G, 'GRATE', 1);
  G.JADE = vocLookup(G, 'JADE', 1);
  G.KEYS = vocLookup(G, 'KEYS', 1);
  G.KNIFE = vocLookup(G, 'KNIFE', 1);
  G.LAMP = vocLookup(G, 'LAMP', 1);
  G.MAGZIN = vocLookup(G, 'MAGAZ', 1);
  G.MESSAG = vocLookup(G, 'MESSA', 1);
  G.MIRROR = vocLookup(G, 'MIRRO', 1);
  G.NUGGET = vocLookup(G, 'NUGGE', 1);
  G.OGRE = vocLookup(G, 'OGRE', 1);
  G.OIL = vocLookup(G, 'OIL', 1);
  G.OYSTER = vocLookup(G, 'OYSTE', 1);
  G.PEARL = vocLookup(G, 'PEARL', 1);
  G.PILLOW = vocLookup(G, 'PILLO', 1);
  G.PLANT = vocLookup(G, 'PLANT', 1);
  G.PLANT2 = G.PLANT + 1;
  G.PYRAM = vocLookup(G, 'PYRAM', 1);
  G.RESER = vocLookup(G, 'RESER', 1);
  G.ROD = vocLookup(G, 'ROD', 1);
  G.ROD2 = G.ROD + 1;
  G.RUBY = vocLookup(G, 'RUBY', 1);
  G.RUG = vocLookup(G, 'RUG', 1);
  G.SAPPH = vocLookup(G, 'SAPPH', 1);
  G.SIGN = vocLookup(G, 'SIGN', 1);
  G.SNAKE = vocLookup(G, 'SNAKE', 1);
  G.STEPS = vocLookup(G, 'STEPS', 1);
  G.TRIDNT = vocLookup(G, 'TRIDE', 1);
  G.TROLL = vocLookup(G, 'TROLL', 1);
  G.TROLL2 = G.TROLL + 1;
  G.URN = vocLookup(G, 'URN', 1);
  G.VASE = vocLookup(G, 'VASE', 1);
  G.VEND = vocLookup(G, 'MACHI', 1);
  G.VOLCAN = vocLookup(G, 'VOLCA', 1);
  G.WATER = vocLookup(G, 'WATER', 1);

  G.AMBER = vocLookup(G, 'AMBER', 1);
  G.CHAIN = vocLookup(G, 'CHAIN', 1);

  // Motion verb mnemonics
  G.BACK = vocLookup(G, 'BACK', 0);
  G.CAVE = vocLookup(G, 'CAVE', 0);
  G.DPRSSN = vocLookup(G, 'DEPRE', 0);
  G.ENTER = vocLookup(G, 'ENTER', 0);
  G.ENTRNC = vocLookup(G, 'ENTRA', 0);
  G.LOOK = vocLookup(G, 'LOOK', 0);
  G.NUL = vocLookup(G, 'NULL', 0);
  G.STREAM = vocLookup(G, 'STREA', 0);

  // Action verb mnemonics
  G.FIND = vocLookup(G, 'FIND', 2);
  G.INVENT = vocLookup(G, 'INVEN', 2);
  G.LOCK = vocLookup(G, 'LOCK', 2);
  G.SAY = vocLookup(G, 'SAY', 2);
  G.THROW = vocLookup(G, 'THROW', 2);

  // Dwarf initialization
  G.CHLOC = 114;
  G.CHLOC2 = 140;
  for (let i = 1; i <= 6; i++) {
    G.DSEEN[i] = 0;
  }
  G.DFLAG = 0;
  G.DLOC[1] = 19;
  G.DLOC[2] = 27;
  G.DLOC[3] = 33;
  G.DLOC[4] = 44;
  G.DLOC[5] = 64;
  G.DLOC[6] = G.CHLOC;
  G.DALTLC = 18;

  // Other flags/counters
  G.TURNS = 0;
  G.TRNDEX = 1;
  G.THRESH = -1;
  if (data.trnvls > 0) G.THRESH = MOD(data.trnval[1], 100000) + 1;
  G.TRNLUZ = 0;
  G.LMWARN = 0;
  G.IGO = 0;
  G.IWEST = 0;
  G.KNFLOC = 0;
  G.DETAIL = 0;
  G.ABBNUM = 5;

  // MAXDIE
  G.MAXDIE = 0;
  for (let i = 0; i <= 4; i++) {
    if (data.rtext[2 * i + 81] !== 0) G.MAXDIE = i + 1;
  }
  G.NUMDIE = 0;
  G.HOLDNG = 0;
  G.DKILL = 0;
  G.FOOBAR = 0;
  G.BONUS = 0;
  G.CLOCK1 = 30;
  G.CLOCK2 = 50;
  G.CONDS = setbit(11);
  G.SAVED = 0;
  G.CLOSNG = 0;
  G.PANIC = 0;
  G.CLOSED = 0;
  G.CLSHNT = 0;
  G.NOVICE = 0;
  G.SETUP = 1;
}

// Vocabulary lookup helper
function vocLookup(G, word, type) {
  return vocab(G, word, type);
}
