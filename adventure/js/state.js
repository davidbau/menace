// state.js - GameState class for Colossal Cave Adventure
//
// Ported from open-adventure 2.5 (main.c globals, share.h, main.h)
// Contains ALL ~150 global variables as a single state object.

export class GameState {
  constructor() {
    // --- Arrays (1-indexed, matching C conventions) ---
    this.ABB = new Array(186).fill(0);
    this.ATLOC = new Array(186).fill(0);
    this.PLACE = new Array(101).fill(0);
    this.FIXED = new Array(101).fill(0);
    this.LINK = new Array(201).fill(0);
    this.PROP = new Array(101).fill(0);
    this.DLOC = new Array(7).fill(0);
    this.ODLOC = new Array(7).fill(0);
    this.DSEEN = new Array(7).fill(0);
    this.HINTED = new Array(21).fill(0);
    this.HINTLC = new Array(21).fill(0);
    this.TK = new Array(21).fill(0);
    this.PARMS = new Array(26).fill(0);

    // --- Scalar globals ---
    this.ABBNUM = 0;
    this.AMBER = 0;
    this.ATTACK = 0;
    this.AXE = 0;
    this.BACK = 0;
    this.BATTER = 0;
    this.BEAR = 0;
    this.BIRD = 0;
    this.BLKLIN = 1; // true
    this.BLOOD = 0;
    this.BONUS = 0;
    this.BOTTLE = 0;
    this.CAGE = 0;
    this.CAVE = 0;
    this.CAVITY = 0;
    this.CHAIN = 0;
    this.CHASM = 0;
    this.CHEST = 0;
    this.CHLOC = 0;
    this.CHLOC2 = 0;
    this.CLAM = 0;
    this.CLOCK1 = 0;
    this.CLOCK2 = 0;
    this.CLOSED = 0;
    this.CLOSNG = 0;
    this.CLSHNT = 0;
    this.COINS = 0;
    this.CONDS = 0;
    this.DALTLC = 0;
    this.DETAIL = 0;
    this.DFLAG = 0;
    this.DKILL = 0;
    this.DOOR = 0;
    this.DPRSSN = 0;
    this.DRAGON = 0;
    this.DTOTAL = 0;
    this.DWARF = 0;
    this.EGGS = 0;
    this.EMRALD = 0;
    this.ENTER = 0;
    this.ENTRNC = 0;
    this.FIND = 0;
    this.FISSUR = 0;
    this.FOOBAR = 0;
    this.FOOD = 0;
    this.GRATE = 0;
    this.HINT = 0;
    this.HOLDNG = 0;
    this.I = 0;
    this.IGO = 0;
    this.INVENT = 0;
    this.IWEST = 0;
    this.J = 0;
    this.JADE = 0;
    this.K = 0;
    this.K2 = 0;
    this.KEYS = 0;
    this.KK = 0;
    this.KNFLOC = 0;
    this.KNIFE = 0;
    this.KQ = 0;
    this.L = 0;
    this.LAMP = 0;
    this.LIMIT = 0;
    this.LL = 0;
    this.LMWARN = 0;
    this.LOC = 0;
    this.LOCK = 0;
    this.LOOK = 0;
    this.MAGZIN = 0;
    this.MAXDIE = 0;
    this.MAXTRS = 0;
    this.MESSAG = 0;
    this.MIRROR = 0;
    this.MXSCOR = 0;
    this.NEWLOC = 0;
    this.NOVICE = 0;
    this.NUGGET = 0;
    this.NUL = 0;
    this.NUMDIE = 0;
    this.OBJ = 0;
    this.OGRE = 0;
    this.OIL = 0;
    this.OLDLC2 = 0;
    this.OLDLOC = 0;
    this.OLDOBJ = 0;
    this.OYSTER = 0;
    this.PANIC = 0;
    this.PEARL = 0;
    this.PILLOW = 0;
    this.PLANT = 0;
    this.PLANT2 = 0;
    this.PYRAM = 0;
    this.RESER = 0;
    this.ROD = 0;
    this.ROD2 = 0;
    this.RUBY = 0;
    this.RUG = 0;
    this.SAPPH = 0;
    this.SAVED = 0;
    this.SAY = 0;
    this.SCORE = 0;
    this.SECT = 0;
    this.SETUP = 0;
    this.SIGN = 0;
    this.SNAKE = 0;
    this.SPK = 0;
    this.STEPS = 0;
    this.STICK = 0;
    this.STREAM = 0;
    this.TALLY = 0;
    this.THRESH = 0;
    this.THROW = 0;
    this.TRIDNT = 0;
    this.TRNDEX = 0;
    this.TRNLUZ = 0;
    this.TROLL = 0;
    this.TROLL2 = 0;
    this.TURNS = 0;
    this.URN = 0;
    this.V1 = 0;
    this.V2 = 0;
    this.VASE = 0;
    this.VEND = 0;
    this.VERB = 0;
    this.VOLCAN = 0;
    this.VRSION = 25;
    this.WATER = 0;
    this.WZDARK = 0;
    this.ZZWORD = '';

    // --- I/O words (plain strings, not packed) ---
    this.wd1 = '';
    this.wd1x = '';
    this.wd2 = '';
    this.wd2x = '';
    // Packed-word equivalents for C compatibility in comparisons
    this.WD1 = 0;
    this.WD1X = 0;
    this.WD2 = 0;
    this.WD2X = 0;

    // --- References ---
    this.data = null;      // adventure-data.json
    this.rng = null;       // AdventurePRNG instance
    this.input = null;     // async function returning a line string
    this.output = null;    // function(string) for output
    this.logfp = null;     // optional log function

    // --- Vocabulary (built during init) ---
    // Map from uppercase 5-char-max word to {id, type}
    // type: 0=motion, 1=object, 2=action, 3=special
    this.vocabMap = null;
  }
}
