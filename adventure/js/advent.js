// Colossal Cave Adventure (350 points)
// Faithful port from Arthur O'Dwyer's C version (derived from Knuth's CWEB)
// Single-file JavaScript ES module

// ========== Random ==========
// Deterministic PRNG matching C's rand() with default seed 1.
// MINSTD Park-Miller LCG: next = (prev * 16807) % 2147483647
let _rngState = 1; // default seed (same as C srand(1) or no srand call)
function _rand() {
    // Use BigInt to avoid floating-point precision loss for large products
    _rngState = Number((BigInt(_rngState) * 16807n) % 2147483647n);
    return _rngState;
}
function ran(range) { return _rand() % range; }
function pct(percent) { return ran(100) < percent; }
function _resetRng(seed) { _rngState = seed || 1; }
function streq(a, b) { return a.slice(0,5) === b.slice(0,5); }

// ========== Vocabulary ==========
const WordClass_None = 0, WordClass_Motion = 1, WordClass_Object = 2,
      WordClass_Action = 3, WordClass_Message = 4;

// --- Motions ---
const MIN_MOTION=100;
const ROAD=100,ENTER=101,UPSTREAM=102,DOWNSTREAM=103,FOREST=104,FORWARD=105,
      BACK=106,VALLEY=107,STAIRS=108,OUT=109,HOUSE=110,GULLY=111,STREAM=112,ROCK=113,
      BED=114,CRAWL=115,COBBLES=116,IN=117,SURFACE=118,NOWHERE=119,DARK=120,PASSAGE=121,
      LOW=122,CANYON=123,AWKWARD=124,GIANT=125,VIEW=126,U=127,D=128,PIT=129,OUTDOORS=130,
      CRACK=131,STEPS=132,DOME=133,LEFT=134,RIGHT=135,HALL=136,JUMP=137,BARREN=138,
      OVER=139,ACROSS=140,E=141,W=142,N=143,S=144,NE=145,SE=146,SW=147,NW=148,DEBRIS=149,HOLE=150,
      WALL=151,BROKEN=152,Y2=153,CLIMB=154,LOOK=155,FLOOR=156,ROOM=157,SLIT=158,
      SLAB=159,XYZZY=160,DEPRESSION=161,ENTRANCE=162,PLUGH=163,SECRET=164,
      CAVE=165,CROSS=166,BEDQUILT=167,PLOVER=168,ORIENTAL=169,CAVERN=170,
      SHELL=171,RESERVOIR=172,OFFICE=173,FORK=174;
const MAX_MOTION=FORK;

// --- Objects ---
const MIN_OBJ=200;
const KEYS=200, LAMP=201, GRATE=202, GRATE_=203, CAGE=204, ROD=205, ROD2=206,
      TREADS=207, TREADS_=208, BIRD=209, RUSTY_DOOR=210, PILLOW=211, SNAKE=212,
      FISSURE=213, FISSURE_=214, TABLET=215, CLAM=216, OYSTER=217,
      MAG=218, DWARF=219, KNIFE=220, FOOD=221, BOTTLE=222, WATER=223, OIL=224,
      MIRROR=225, MIRROR_=226, PLANT=227, PLANT2=228, PLANT2_=229,
      STALACTITE=230, SHADOW=231, SHADOW_=232, AXE=233, DRAWINGS=234, PIRATE=235,
      DRAGON=236, DRAGON_=237, CHASM=238, CHASM_=239, TROLL=240, TROLL_=241,
      NO_TROLL=242, NO_TROLL_=243, BEAR=244, MESSAGE=245, GORGE=246, MACHINE=247,
      BATTERIES=248, MOSS=249,
      GOLD=250, DIAMONDS=251, SILVER=252, JEWELS=253, COINS=254, CHEST=255, EGGS=256,
      TRIDENT=257, VASE=258, EMERALD=259, PYRAMID=260, PEARL=261, RUG=262, RUG_=263,
      SPICES=264, CHAIN=265;
const MAX_OBJ=CHAIN;
const NOTHING = 0;

// --- Actions ---
const MIN_ACTION=300;
const TAKE=300, DROP=301, OPEN=302, CLOSE=303, ON=304, OFF=305, WAVE=306, CALM=307, GO=308,
      RELAX=309, POUR=310, EAT=311, DRINK=312, RUB=313, TOSS=314, WAKE=315, FEED=316,
      FILL=317, BREAK=318, BLAST=319, KILL=320, SAY=321, READ=322, FEEFIE=323, BRIEF=324,
      FIND=325, INVENTORY=326, SCORE=327, SAVE=328, RESTORE=329, QUIT=330;
const MAX_ACTION=QUIT;

// --- Messages ---
const MIN_MESSAGE=400;
const ABRA=400, HELP=401, TREES=402, DIG=403, LOST=404, MIST=405, FUCK=406, STOP=407, INFO=408, SWIM=409;
const MAX_MESSAGE=SWIM;

function word_class(word) {
    if (word === NOTHING) return WordClass_None;
    if (word >= MIN_MOTION && word <= MAX_MOTION) return WordClass_Motion;
    if (word >= MIN_OBJ && word <= MAX_OBJ) return WordClass_Object;
    if (word >= MIN_ACTION && word <= MAX_ACTION) return WordClass_Action;
    if (word >= MIN_MESSAGE && word <= MAX_MESSAGE) return WordClass_Message;
    return WordClass_None;
}

// ========== Locations ==========
const R_INHAND = -1, R_LIMBO = 0;
const R_ROAD=1, R_HILL=2, R_HOUSE=3, R_VALLEY=4, R_FOREST=5, R_FOREST2=6, R_SLIT=7, R_OUTSIDE=8;
const R_INSIDE=9, MIN_IN_CAVE = R_INSIDE;
const R_COBBLES=10, R_DEBRIS=11, R_AWK=12, R_BIRD=13, R_SPIT=14;
const R_EMIST=15, MIN_LOWER_LOC = R_EMIST;
const R_NUGGET=16, R_EFISS=17, R_WFISS=18, R_WMIST=19;
const R_LIKE1=20, R_LIKE2=21, R_LIKE3=22, R_LIKE4=23, R_LIKE5=24, R_LIKE6=25, R_LIKE7=26,
      R_LIKE8=27, R_LIKE9=28, R_LIKE10=29, R_LIKE11=30, R_LIKE12=31, R_LIKE13=32, R_LIKE14=33;
const R_BRINK=34, R_ELONG=35, R_WLONG=36;
const R_DIFF0=37, R_DIFF1=38, R_DIFF2=39, R_DIFF3=40, R_DIFF4=41, R_DIFF5=42,
      R_DIFF6=43, R_DIFF7=44, R_DIFF8=45, R_DIFF9=46, R_DIFF10=47;
const R_PONY=48, R_CROSS=49, R_HMK=50, R_WEST=51, R_SOUTH=52, R_NS=53, R_Y2=54, R_JUMBLE=55, R_WINDOE=56;
const R_DIRTY=57, R_CLEAN=58, R_WET=59, R_DUSTY=60, R_COMPLEX=61;
const R_SHELL=62, R_ARCHED=63, R_RAGGED=64, R_SAC=65, R_ANTE=66, R_WITT=67;
const R_BEDQUILT=68, R_SWISS=69, R_SOFT=70;
const R_E2PIT=71, R_W2PIT=72, R_EPIT=73, R_WPIT=74;
const R_NARROW=75, R_GIANT=76, R_BLOCK=77, R_IMMENSE=78;
const R_FALLS=79, R_INCLINE=80, R_ABOVEP=81, R_SJUNC=82;
const R_TITE=83, R_LOW=84, R_CRAWL=85, R_WINDOW=86;
const R_ORIENTAL=87, R_MISTY=88, R_ALCOVE=89, R_PLOVER=90, R_DARK=91;
const R_SLAB=92, R_ABOVER=93, R_MIRROR=94, R_RES=95;
const R_SCAN1=96, R_SCAN2=97, R_SCAN3=98, R_SECRET=99;
const R_WIDE=100, R_TIGHT=101, R_TALL=102, R_BOULDERS=103;
const R_SLOPING=104, R_SWSIDE=105;
const R_DEAD0=106, R_DEAD1=107, R_PIRATES_NEST=108, R_DEAD3=109, R_DEAD4=110, R_DEAD5=111,
      R_DEAD6=112, R_DEAD7=113, R_DEAD8=114, R_DEAD9=115, R_DEAD10=116, R_DEAD11=117;
const R_NESIDE=118, R_CORR=119, R_FORK=120, R_WARM=121, R_VIEW=122, R_CHAMBER=123;
const R_LIME=124, R_FBARR=125, R_BARR=126;
const R_NEEND=127, R_SWEND=128;
const R_NECK=129, R_LOSE=130, R_CLIMB=131, R_CHECK=132;
const R_THRU=133, R_DUCK=134, R_UPNOUT=135;
const R_DIDIT=136, MAX_LOC = R_DIDIT;
const R_PPASS=137, R_PDROP=138;
const R_TROLL=139;
const FIRST_REMARK=140;

const F_CAVE_HINT  = 0x008;
const F_BIRD_HINT  = 0x010;
const F_SNAKE_HINT = 0x020;
const F_TWIST_HINT = 0x040;
const F_DARK_HINT  = 0x080;
const F_WITT_HINT  = 0x100;

const ok = "OK.";
const pitch_dark_msg = "It is now pitch dark.  If you proceed you will most likely fall into a pit.";

const MAX_SCORE = 350;
const MAX_DEATHS = 3;
const HIGHEST_CLASS = 8;
const class_score = [35, 100, 130, 200, 250, 300, 330, 349, 9999];
const class_message = [
    "You are obviously a rank amateur.  Better luck next time.",
    "Your score qualifies you as a novice class adventurer.",
    "You have achieved the rating \"Experienced Adventurer\".",
    "You may now consider yourself a \"Seasoned Adventurer\".",
    "You have reached \"Junior Master\" status.",
    "Your score puts you in Master Adventurer Class C.",
    "Your score puts you in Master Adventurer Class B.",
    "Your score puts you in Master Adventurer Class A.",
    "All of Adventuredom gives tribute to you, Adventurer Grandmaster!"
];

const death_wishes = [
    "Oh dear, you seem to have gotten yourself killed.  I might be able to\n" +
    "help you out, but I've never really done this before.  Do you want me\n" +
    "to try to reincarnate you?",
    "All right. But don't blame me if something goes wr......\n" +
    "                   --- POOF!! ---\n" +
    "You are engulfed in a cloud of orange smoke.  Coughing and gasping,\n" +
    "you emerge from the smoke and find....",
    "You clumsy oaf, you've done it again!  I don't know how long I can\n" +
    "keep this up.  Do you want me to try reincarnating you again?",
    "Okay, now where did I put my orange smoke?....  >POOF!<\n" +
    "Everything disappears in a dense cloud of orange smoke.",
    "Now you've really done it!  I'm out of orange smoke!  You don't expect\n" +
    "me to do a decent reincarnation without any orange smoke, do you?",
    "Okay, if you're so smart, do it yourself!  I'm leaving!"
];

export class AdventureGame {
    constructor() {
        // Will be initialized in run()
        this._output = null;
        this._input = null;
        this._gameOver = false;
    }

    // ========== Build Vocabulary ==========
    _buildVocabulary() {
        this._vocab = new Map();
        const nw = (w, m) => { this._vocab.set(w.slice(0,5), m); };

        nw("road", ROAD); nw("hill", ROAD);
        nw("enter", ENTER);
        nw("upstr", UPSTREAM);
        nw("downs", DOWNSTREAM);
        nw("fores", FOREST);
        nw("forwa", FORWARD); nw("conti", FORWARD); nw("onwar", FORWARD);
        nw("back", BACK); nw("retur", BACK); nw("retre", BACK);
        nw("valle", VALLEY);
        nw("stair", STAIRS);
        nw("out", OUT); nw("outsi", OUT); nw("exit", OUT); nw("leave", OUT);
        nw("build", HOUSE); nw("house", HOUSE);
        nw("gully", GULLY);
        nw("strea", STREAM);
        nw("rock", ROCK);
        nw("bed", BED);
        nw("crawl", CRAWL);
        nw("cobbl", COBBLES);
        nw("inwar", IN); nw("insid", IN); nw("in", IN);
        nw("surfa", SURFACE);
        nw("null", NOWHERE); nw("nowhe", NOWHERE);
        nw("dark", DARK);
        nw("passa", PASSAGE); nw("tunne", PASSAGE);
        nw("low", LOW);
        nw("canyo", CANYON);
        nw("awkwa", AWKWARD);
        nw("giant", GIANT);
        nw("view", VIEW);
        nw("upwar", U); nw("up", U); nw("u", U); nw("above", U); nw("ascen", U);
        nw("d", D); nw("downw", D); nw("down", D); nw("desce", D);
        nw("pit", PIT);
        nw("outdo", OUTDOORS);
        nw("crack", CRACK);
        nw("steps", STEPS);
        nw("dome", DOME);
        nw("left", LEFT);
        nw("right", RIGHT);
        nw("hall", HALL);
        nw("jump", JUMP);
        nw("barre", BARREN);
        nw("over", OVER);
        nw("acros", ACROSS);
        nw("east", E); nw("e", E);
        nw("west", W); nw("w", W);
        nw("north", N); nw("n", N);
        nw("south", S); nw("s", S);
        nw("ne", NE); nw("se", SE); nw("sw", SW); nw("nw", NW);
        nw("debri", DEBRIS);
        nw("hole", HOLE);
        nw("wall", WALL);
        nw("broke", BROKEN);
        nw("y2", Y2);
        nw("climb", CLIMB);
        nw("look", LOOK); nw("exami", LOOK); nw("touch", LOOK); nw("descr", LOOK);
        nw("floor", FLOOR);
        nw("room", ROOM);
        nw("slit", SLIT);
        nw("slab", SLAB); nw("slabr", SLAB);
        nw("xyzzy", XYZZY);
        nw("depre", DEPRESSION);
        nw("entra", ENTRANCE);
        nw("plugh", PLUGH);
        nw("secre", SECRET);
        nw("cave", CAVE);
        nw("cross", CROSS);
        nw("bedqu", BEDQUILT);
        nw("plove", PLOVER);
        nw("orien", ORIENTAL);
        nw("caver", CAVERN);
        nw("shell", SHELL);
        nw("reser", RESERVOIR);
        nw("main", OFFICE); nw("offic", OFFICE);
        nw("fork", FORK);

        // Objects
        nw("key", KEYS); nw("keys", KEYS);
        nw("lamp", LAMP); nw("lante", LAMP); nw("headl", LAMP);
        nw("grate", GRATE);
        nw("cage", CAGE);
        nw("rod", ROD);
        nw("bird", BIRD);
        nw("door", RUSTY_DOOR);
        nw("pillo", PILLOW); nw("velve", PILLOW);
        nw("snake", SNAKE);
        nw("fissu", FISSURE);
        nw("table", TABLET);
        nw("clam", CLAM);
        nw("oyste", OYSTER);
        nw("magaz", MAG); nw("issue", MAG); nw("spelu", MAG); nw("\"spel", MAG);
        nw("dwarf", DWARF); nw("dwarv", DWARF);
        nw("knife", KNIFE); nw("knive", KNIFE);
        nw("food", FOOD); nw("ratio", FOOD);
        nw("bottl", BOTTLE); nw("jar", BOTTLE);
        nw("water", WATER); nw("h2o", WATER);
        nw("oil", OIL);
        nw("mirro", MIRROR);
        nw("plant", PLANT); nw("beans", PLANT);
        nw("stala", STALACTITE);
        nw("shado", SHADOW); nw("figur", SHADOW);
        nw("axe", AXE);
        nw("drawi", DRAWINGS);
        nw("pirat", PIRATE);
        nw("drago", DRAGON);
        nw("chasm", CHASM);
        nw("troll", TROLL);
        nw("bear", BEAR);
        nw("messa", MESSAGE);
        nw("volca", GORGE); nw("geyse", GORGE);
        nw("vendi", MACHINE); nw("machi", MACHINE);
        nw("batte", BATTERIES);
        nw("moss", MOSS); nw("carpe", MOSS);
        nw("gold", GOLD); nw("nugge", GOLD);
        nw("diamo", DIAMONDS);
        nw("silve", SILVER); nw("bars", SILVER);
        nw("jewel", JEWELS);
        nw("coins", COINS);
        nw("chest", CHEST); nw("box", CHEST); nw("treas", CHEST);
        nw("eggs", EGGS); nw("egg", EGGS); nw("nest", EGGS);
        nw("tride", TRIDENT);
        nw("ming", VASE); nw("vase", VASE); nw("shard", VASE); nw("potte", VASE);
        nw("emera", EMERALD);
        nw("plati", PYRAMID); nw("pyram", PYRAMID);
        nw("pearl", PEARL);
        nw("persi", RUG); nw("rug", RUG);
        nw("spice", SPICES);
        nw("chain", CHAIN);

        // Actions
        nw("take", TAKE); nw("carry", TAKE); nw("keep", TAKE); nw("catch", TAKE);
        nw("captu", TAKE); nw("steal", TAKE); nw("get", TAKE); nw("tote", TAKE);
        nw("drop", DROP); nw("relea", DROP); nw("free", DROP); nw("disca", DROP); nw("dump", DROP);
        nw("open", OPEN); nw("unloc", OPEN);
        nw("close", CLOSE); nw("lock", CLOSE);
        nw("light", ON); nw("on", ON);
        nw("extin", OFF); nw("off", OFF);
        nw("wave", WAVE); nw("shake", WAVE); nw("swing", WAVE);
        nw("calm", CALM); nw("placa", CALM); nw("tame", CALM);
        nw("walk", GO); nw("run", GO); nw("trave", GO); nw("go", GO);
        nw("proce", GO); nw("explo", GO); nw("goto", GO); nw("follo", GO); nw("turn", GO);
        nw("nothi", RELAX);
        nw("pour", POUR);
        nw("eat", EAT); nw("devou", EAT);
        nw("drink", DRINK);
        nw("rub", RUB);
        nw("throw", TOSS); nw("toss", TOSS);
        nw("wake", WAKE); nw("distu", WAKE);
        nw("feed", FEED);
        nw("fill", FILL);
        nw("break", BREAK); nw("smash", BREAK); nw("shatt", BREAK);
        nw("blast", BLAST); nw("deton", BLAST); nw("ignit", BLAST); nw("blowu", BLAST);
        nw("attac", KILL); nw("kill", KILL); nw("fight", KILL); nw("hit", KILL); nw("strik", KILL);
        nw("say", SAY); nw("chant", SAY); nw("sing", SAY); nw("utter", SAY); nw("mumbl", SAY);
        nw("read", READ); nw("perus", READ);
        nw("fee", FEEFIE); nw("fie", FEEFIE); nw("foe", FEEFIE); nw("foo", FEEFIE); nw("fum", FEEFIE);
        nw("brief", BRIEF);
        nw("find", FIND); nw("where", FIND);
        nw("inven", INVENTORY);
        nw("score", SCORE);
        nw("quit", QUIT);
        nw("save", SAVE);
        nw("resto", RESTORE);

        // Messages
        nw("abra", ABRA); nw("abrac", ABRA); nw("opens", ABRA); nw("sesam", ABRA);
        nw("shaza", ABRA); nw("hocus", ABRA); nw("pocus", ABRA);
        nw("help", HELP); nw("?", HELP);
        nw("tree", TREES); nw("trees", TREES);
        nw("dig", DIG); nw("excav", DIG);
        nw("lost", LOST);
        nw("mist", MIST);
        nw("fuck", FUCK);
        nw("stop", STOP);
        nw("info", INFO); nw("infor", INFO);
        nw("swim", SWIM);
    }

    _lookup(w) {
        const key = w.slice(0,5);
        return this._vocab.get(key) || 0;
    }

    // ========== Travel Table ==========
    _buildTravelTable() {
        // travels: array of {mot, cond, dest}
        // start[loc] = index into travels for that location
        const travels = [];
        const start = new Array(MAX_LOC + 2).fill(0);
        const places = [];
        for (let i = 0; i <= MAX_LOC; i++) {
            places.push({ long_desc: null, short_desc: null, flags: 0, objects: NOTHING, visits: 0 });
        }

        const make_loc = (x, l, s, f) => {
            places[x] = { long_desc: l, short_desc: s, flags: f, objects: NOTHING, visits: 0 };
            start[x] = travels.length;
        };
        const make_ins = (m, d) => { travels.push({mot: m, cond: 0, dest: d}); };
        const make_cond_ins = (m, c, d) => { travels.push({mot: m, cond: c, dest: d}); };
        const ditto = (m) => {
            const prev = travels[travels.length - 1];
            travels.push({mot: m, cond: prev.cond, dest: prev.dest});
        };
        const only_if_toting = (t) => 100 + (t - MIN_OBJ);
        const only_if_here = (t) => 200 + (t - MIN_OBJ);
        const unless_prop = (t, p) => 300 + (t - MIN_OBJ) + 100*p;
        const remark = (n) => FIRST_REMARK + n;

        const all_alike = "You are in a maze of twisty little passages, all alike.";
        const dead_end = "Dead end.";

        make_loc(R_ROAD,
            "You are standing at the end of a road before a small brick building.\n" +
            "Around you is a forest.  A small stream flows out of the building and\n" +
            "down a gully.",
            "You're at end of road again.", 0);
        make_ins(W, R_HILL); ditto(U); ditto(ROAD);
        make_ins(E, R_HOUSE); ditto(IN); ditto(HOUSE); ditto(ENTER);
        make_ins(S, R_VALLEY); ditto(D); ditto(GULLY); ditto(STREAM); ditto(DOWNSTREAM);
        make_ins(N, R_FOREST); ditto(FOREST);
        make_ins(DEPRESSION, R_OUTSIDE);

        make_loc(R_HILL,
            "You have walked up a hill, still in the forest.  The road slopes back\n" +
            "down the other side of the hill.  There is a building in the distance.",
            "You're at hill in road.", 0);
        make_ins(ROAD, R_ROAD); ditto(HOUSE); ditto(FORWARD); ditto(E); ditto(D);
        make_ins(FOREST, R_FOREST); ditto(N); ditto(S);

        make_loc(R_HOUSE,
            "You are inside a building, a well house for a large spring.",
            "You're inside building.", 0);
        make_ins(ENTER, R_ROAD); ditto(OUT); ditto(OUTDOORS); ditto(W);
        make_ins(XYZZY, R_DEBRIS);
        make_ins(PLUGH, R_Y2);
        make_ins(DOWNSTREAM, remark(17)); ditto(STREAM);

        make_loc(R_VALLEY,
            "You are in a valley in the forest beside a stream tumbling along a\n" +
            "rocky bed.",
            "You're in valley.", 0);
        make_ins(UPSTREAM, R_ROAD); ditto(HOUSE); ditto(N);
        make_ins(FOREST, R_FOREST); ditto(E); ditto(W); ditto(U);
        make_ins(DOWNSTREAM, R_SLIT); ditto(S); ditto(D);
        make_ins(DEPRESSION, R_OUTSIDE);

        make_loc(R_FOREST,
            "You are in open forest, with a deep valley to one side.",
            "You're in forest.", 0);
        make_ins(VALLEY, R_VALLEY); ditto(E); ditto(D);
        make_cond_ins(FOREST, 50, R_FOREST); ditto(FORWARD); ditto(N);
        make_ins(FOREST, R_FOREST2);
        make_ins(W, R_FOREST); ditto(S);

        make_loc(R_FOREST2,
            "You are in open forest near both a valley and a road.",
            "You're in forest.", 0);
        make_ins(ROAD, R_ROAD); ditto(N);
        make_ins(VALLEY, R_VALLEY); ditto(E); ditto(W); ditto(D);
        make_ins(FOREST, R_FOREST); ditto(S);

        make_loc(R_SLIT,
            "At your feet all the water of the stream splashes into a 2-inch slit\n" +
            "in the rock.  Downstream the streambed is bare rock.",
            "You're at slit in streambed.", 0);
        make_ins(HOUSE, R_ROAD);
        make_ins(UPSTREAM, R_VALLEY); ditto(N);
        make_ins(FOREST, R_FOREST); ditto(E); ditto(W);
        make_ins(DOWNSTREAM, R_OUTSIDE); ditto(ROCK); ditto(BED); ditto(S);
        make_ins(SLIT, remark(0)); ditto(STREAM); ditto(D);

        make_loc(R_OUTSIDE,
            "You are in a 20-foot depression floored with bare dirt.  Set into the\n" +
            "dirt is a strong steel grate mounted in concrete.  A dry streambed\n" +
            "leads into the depression.",
            "You're outside grate.", F_CAVE_HINT);
        make_ins(FOREST, R_FOREST); ditto(E); ditto(W); ditto(S);
        make_ins(HOUSE, R_ROAD);
        make_ins(UPSTREAM, R_SLIT); ditto(GULLY); ditto(N);
        make_cond_ins(ENTER, unless_prop(GRATE, 0), R_INSIDE); ditto(IN); ditto(D);
        make_ins(ENTER, remark(1));

        make_loc(R_INSIDE,
            "You are in a small chamber beneath a 3x3 steel grate to the surface.\n" +
            "A low crawl over cobbles leads inward to the west.",
            "You're below the grate.", 0);
        make_cond_ins(OUT, unless_prop(GRATE, 0), R_OUTSIDE); ditto(U);
        make_ins(OUT, remark(1));
        make_ins(CRAWL, R_COBBLES); ditto(COBBLES); ditto(IN); ditto(W);
        make_ins(PIT, R_SPIT);
        make_ins(DEBRIS, R_DEBRIS);

        make_loc(R_COBBLES,
            "You are crawling over cobbles in a low passage.  There is a dim light\n" +
            "at the east end of the passage.",
            "You're in cobble crawl.", 0);
        make_ins(OUT, R_INSIDE); ditto(SURFACE); ditto(E);
        make_ins(IN, R_DEBRIS); ditto(DARK); ditto(W); ditto(DEBRIS);
        make_ins(PIT, R_SPIT);

        make_loc(R_DEBRIS,
            "You are in a debris room filled with stuff washed in from the surface.\n" +
            "A low wide passage with cobbles becomes plugged with mud and debris\n" +
            "here, but an awkward canyon leads upward and west.  A note on the wall\n" +
            "says \"MAGIC WORD XYZZY\".",
            "You're in debris room.", 0);
        make_cond_ins(DEPRESSION, unless_prop(GRATE, 0), R_OUTSIDE);
        make_ins(ENTRANCE, R_INSIDE);
        make_ins(CRAWL, R_COBBLES); ditto(COBBLES); ditto(PASSAGE); ditto(LOW); ditto(E);
        make_ins(CANYON, R_AWK); ditto(IN); ditto(U); ditto(W);
        make_ins(XYZZY, R_HOUSE);
        make_ins(PIT, R_SPIT);

        make_loc(R_AWK,
            "You are in an awkward sloping east/west canyon.",
            null, 0);
        make_cond_ins(DEPRESSION, unless_prop(GRATE, 0), R_OUTSIDE);
        make_ins(ENTRANCE, R_INSIDE);
        make_ins(D, R_DEBRIS); ditto(E); ditto(DEBRIS);
        make_ins(IN, R_BIRD); ditto(U); ditto(W);
        make_ins(PIT, R_SPIT);

        make_loc(R_BIRD,
            "You are in a splendid chamber thirty feet high. The walls are frozen\n" +
            "rivers of orange stone. An awkward canyon and a good passage exit\n" +
            "from east and west sides of the chamber.",
            "You're in bird chamber.", F_BIRD_HINT);
        make_cond_ins(DEPRESSION, unless_prop(GRATE, 0), R_OUTSIDE);
        make_ins(ENTRANCE, R_INSIDE);
        make_ins(DEBRIS, R_DEBRIS);
        make_ins(CANYON, R_AWK); ditto(E);
        make_ins(PASSAGE, R_SPIT); ditto(PIT); ditto(W);

        make_loc(R_SPIT,
            "At your feet is a small pit breathing traces of white mist. An east\n" +
            "passage ends here except for a small crack leading on.",
            "You're at top of small pit.", 0);
        make_cond_ins(DEPRESSION, unless_prop(GRATE, 0), R_OUTSIDE);
        make_ins(ENTRANCE, R_INSIDE);
        make_ins(DEBRIS, R_DEBRIS);
        make_ins(PASSAGE, R_BIRD); ditto(E);
        make_cond_ins(D, only_if_toting(GOLD), R_NECK); ditto(PIT); ditto(STEPS);
        make_ins(D, R_EMIST);
        make_ins(CRACK, remark(14)); ditto(W);

        make_loc(R_EMIST,
            "You are at one end of a vast hall stretching forward out of sight to\n" +
            "the west.  There are openings to either side.  Nearby, a wide stone\n" +
            "staircase leads downward.  The hall is filled with wisps of white mist\n" +
            "swaying to and fro almost as if alive.  A cold wind blows up the\n" +
            "staircase.  There is a passage at the top of a dome behind you.",
            "You're in Hall of Mists.", 0);
        make_ins(LEFT, R_NUGGET); ditto(S);
        make_ins(FORWARD, R_EFISS); ditto(HALL); ditto(W);
        make_ins(STAIRS, R_HMK); ditto(D); ditto(N);
        make_cond_ins(U, only_if_toting(GOLD), remark(15)); ditto(PIT); ditto(STEPS); ditto(DOME); ditto(PASSAGE); ditto(E);
        make_ins(U, R_SPIT);
        make_ins(Y2, R_JUMBLE);

        make_loc(R_NUGGET,
            "This is a low room with a crude note on the wall. The note says,\n" +
            "\"You won't get it up the steps\".",
            "You're in nugget of gold room.", 0);
        make_ins(HALL, R_EMIST); ditto(OUT); ditto(N);

        make_loc(R_EFISS,
            "You are on the east bank of a fissure slicing clear across the hall.\n" +
            "The mist is quite thick here, and the fissure is too wide to jump.",
            "You're on east bank of fissure.", 0);
        make_ins(HALL, R_EMIST); ditto(E);
        make_cond_ins(JUMP, unless_prop(FISSURE, 0), remark(2));
        make_cond_ins(FORWARD, unless_prop(FISSURE, 1), R_LOSE);
        make_cond_ins(OVER, unless_prop(FISSURE, 1), remark(3)); ditto(ACROSS); ditto(W); ditto(CROSS);
        make_ins(OVER, R_WFISS);

        make_loc(R_WFISS,
            "You are on the west side of the fissure in the Hall of Mists.",
            null, 0);
        make_cond_ins(JUMP, unless_prop(FISSURE, 0), remark(2));
        make_cond_ins(FORWARD, unless_prop(FISSURE, 1), R_LOSE);
        make_cond_ins(OVER, unless_prop(FISSURE, 1), remark(3)); ditto(ACROSS); ditto(E); ditto(CROSS);
        make_ins(OVER, R_EFISS);
        make_ins(W, R_WMIST);
        make_ins(N, R_THRU);

        make_loc(R_WMIST,
            "You are at the west end of the Hall of Mists. A low wide crawl\n" +
            "continues west and another goes north. To the south is a little\n" +
            "passage 6 feet off the floor.",
            "You're at west end of Hall of Mists.", 0);
        make_ins(S, R_LIKE1); ditto(U); ditto(PASSAGE); ditto(CLIMB);
        make_ins(E, R_WFISS);
        make_ins(W, R_ELONG); ditto(CRAWL);
        make_ins(N, R_DUCK);

        make_loc(R_LIKE1, all_alike, null, F_TWIST_HINT);
        make_ins(U, R_WMIST);
        make_ins(N, R_LIKE1);
        make_ins(E, R_LIKE2);
        make_ins(S, R_LIKE4);
        make_ins(W, R_LIKE11);
        make_loc(R_LIKE2, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE1);
        make_ins(S, R_LIKE3);
        make_ins(E, R_LIKE4);
        make_loc(R_LIKE3, all_alike, null, F_TWIST_HINT);
        make_ins(E, R_LIKE2);
        make_ins(D, R_DEAD5);
        make_ins(S, R_LIKE6);
        make_ins(N, R_DEAD9);
        make_loc(R_LIKE4, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE1);
        make_ins(N, R_LIKE2);
        make_ins(E, R_DEAD3);
        make_ins(S, R_DEAD4);
        make_ins(U, R_LIKE14); ditto(D);
        make_loc(R_LIKE5, all_alike, null, F_TWIST_HINT);
        make_ins(E, R_LIKE6);
        make_ins(W, R_LIKE7);
        make_loc(R_LIKE6, all_alike, null, F_TWIST_HINT);
        make_ins(E, R_LIKE3);
        make_ins(W, R_LIKE5);
        make_ins(D, R_LIKE7);
        make_ins(S, R_LIKE8);
        make_loc(R_LIKE7, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE5);
        make_ins(U, R_LIKE6);
        make_ins(E, R_LIKE8);
        make_ins(S, R_LIKE9);
        make_loc(R_LIKE8, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE6);
        make_ins(E, R_LIKE7);
        make_ins(S, R_LIKE8);
        make_ins(U, R_LIKE9);
        make_ins(N, R_LIKE10);
        make_ins(D, R_DEAD11);
        make_loc(R_LIKE9, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE7);
        make_ins(N, R_LIKE8);
        make_ins(S, R_DEAD6);
        make_loc(R_LIKE10, all_alike, null, F_TWIST_HINT);
        make_ins(W, R_LIKE8);
        make_ins(N, R_LIKE10);
        make_ins(D, R_DEAD7);
        make_ins(E, R_BRINK);
        make_loc(R_LIKE11, all_alike, null, F_TWIST_HINT);
        make_ins(N, R_LIKE1);
        make_ins(W, R_LIKE11); ditto(S);
        make_ins(E, R_DEAD1);
        make_loc(R_LIKE12, all_alike, null, F_TWIST_HINT);
        make_ins(S, R_BRINK);
        make_ins(E, R_LIKE13);
        make_ins(W, R_DEAD10);
        make_loc(R_LIKE13, all_alike, null, F_TWIST_HINT);
        make_ins(N, R_BRINK);
        make_ins(W, R_LIKE12);
        make_ins(NW, R_PIRATES_NEST);
        make_loc(R_LIKE14, all_alike, null, F_TWIST_HINT);
        make_ins(U, R_LIKE4); ditto(D);

        make_loc(R_BRINK,
            "You are on the brink of a thirty-foot pit with a massive orange column\n" +
            "down one wall.  You could climb down here but you could not get back\n" +
            "up.  The maze continues at this level.",
            "You're at brink of pit.", 0);
        make_ins(D, R_BIRD); ditto(CLIMB);
        make_ins(W, R_LIKE10);
        make_ins(S, R_DEAD8);
        make_ins(N, R_LIKE12);
        make_ins(E, R_LIKE13);

        make_loc(R_ELONG,
            "You are at the east end of a very long hall apparently without side\n" +
            "chambers.  To the east a low wide crawl slants up.  To the north a\n" +
            "round two-foot hole slants down.",
            "You're at east end of long hall.", 0);
        make_ins(E, R_WMIST); ditto(U); ditto(CRAWL);
        make_ins(W, R_WLONG);
        make_ins(N, R_CROSS); ditto(D); ditto(HOLE);

        make_loc(R_WLONG,
            "You are at the west end of a very long featureless hall.  The hall\n" +
            "joins up with a narrow north/south passage.",
            "You're at west end of long hall.", 0);
        make_ins(E, R_ELONG);
        make_ins(N, R_CROSS);
        make_cond_ins(S, 100, R_DIFF0);

        // Twist maze (all different)
        const twist = (name, n, s, e, w, ne, se, nw, sw, u, d, m) => {
            make_loc(name, m, null, 0);
            make_ins(N,n); make_ins(S,s); make_ins(E,e); make_ins(W,w);
            make_ins(NE,ne); make_ins(SE,se); make_ins(NW,nw); make_ins(SW,sw);
            make_ins(U,u); make_ins(D,d);
        };
        twist(R_DIFF0,R_DIFF9,R_DIFF1,R_DIFF7,R_DIFF8,R_DIFF3,R_DIFF4,R_DIFF6,R_DIFF2,R_DIFF5,R_WLONG,
            "You are in a maze of twisty little passages, all different.");
        twist(R_DIFF1,R_DIFF8,R_DIFF9,R_DIFF10,R_DIFF0,R_DIFF5,R_DIFF2,R_DIFF3,R_DIFF4,R_DIFF6,R_DIFF7,
            "You are in a maze of twisting little passages, all different.");
        twist(R_DIFF2,R_DIFF3,R_DIFF4,R_DIFF8,R_DIFF5,R_DIFF7,R_DIFF10,R_DIFF0,R_DIFF6,R_DIFF1,R_DIFF9,
            "You are in a little maze of twisty passages, all different.");
        twist(R_DIFF3,R_DIFF7,R_DIFF10,R_DIFF6,R_DIFF2,R_DIFF4,R_DIFF9,R_DIFF8,R_DIFF5,R_DIFF0,R_DIFF1,
            "You are in a twisting maze of little passages, all different.");
        twist(R_DIFF4,R_DIFF1,R_DIFF7,R_DIFF5,R_DIFF9,R_DIFF0,R_DIFF3,R_DIFF2,R_DIFF10,R_DIFF8,R_DIFF6,
            "You are in a twisting little maze of passages, all different.");
        twist(R_DIFF5,R_DIFF0,R_DIFF3,R_DIFF4,R_DIFF6,R_DIFF8,R_DIFF1,R_DIFF9,R_DIFF7,R_DIFF10,R_DIFF2,
            "You are in a twisty little maze of passages, all different.");
        twist(R_DIFF6,R_DIFF10,R_DIFF5,R_DIFF0,R_DIFF1,R_DIFF9,R_DIFF8,R_DIFF7,R_DIFF3,R_DIFF2,R_DIFF4,
            "You are in a twisty maze of little passages, all different.");
        twist(R_DIFF7,R_DIFF6,R_DIFF2,R_DIFF9,R_DIFF10,R_DIFF1,R_DIFF0,R_DIFF5,R_DIFF8,R_DIFF4,R_DIFF3,
            "You are in a little twisty maze of passages, all different.");
        twist(R_DIFF8,R_DIFF5,R_DIFF6,R_DIFF1,R_DIFF4,R_DIFF2,R_DIFF7,R_DIFF10,R_DIFF9,R_DIFF3,R_DIFF0,
            "You are in a maze of little twisting passages, all different.");
        twist(R_DIFF9,R_DIFF4,R_DIFF8,R_DIFF2,R_DIFF3,R_DIFF10,R_DIFF6,R_DIFF1,R_DIFF0,R_DIFF7,R_DIFF5,
            "You are in a maze of little twisty passages, all different.");
        twist(R_DIFF10,R_DIFF2,R_PONY,R_DIFF3,R_DIFF7,R_DIFF6,R_DIFF5,R_DIFF4,R_DIFF1,R_DIFF9,R_DIFF8,
            "You are in a little maze of twisting passages, all different.");

        make_loc(R_PONY, dead_end, null, 0);
        make_ins(N, R_DIFF10); ditto(OUT);

        make_loc(R_CROSS,
            "You are at a crossover of a high N/S passage and a low E/W one.",
            null, 0);
        make_ins(W, R_ELONG);
        make_ins(N, R_DEAD0);
        make_ins(E, R_WEST);
        make_ins(S, R_WLONG);

        make_loc(R_HMK,
            "You are in the Hall of the Mountain King, with passages off in all\n" +
            "directions.",
            "You're in Hall of Mt King.", F_SNAKE_HINT);
        make_ins(STAIRS, R_EMIST); ditto(U); ditto(E);
        make_cond_ins(N, unless_prop(SNAKE, 0), R_NS); ditto(LEFT);
        make_cond_ins(S, unless_prop(SNAKE, 0), R_SOUTH); ditto(RIGHT);
        make_cond_ins(W, unless_prop(SNAKE, 0), R_WEST); ditto(FORWARD);
        make_ins(N, remark(16));
        make_cond_ins(SW, 35, R_SECRET);
        make_cond_ins(SW, only_if_here(SNAKE), remark(16));
        make_ins(SECRET, R_SECRET);

        make_loc(R_WEST,
            "You are in the west side chamber of the Hall of the Mountain King.\n" +
            "A passage continues west and up here.",
            "You're in west side chamber.", 0);
        make_ins(HALL, R_HMK); ditto(OUT); ditto(E);
        make_ins(W, R_CROSS); ditto(U);

        make_loc(R_SOUTH,
            "You are in the south side chamber.",
            null, 0);
        make_ins(HALL, R_HMK); ditto(OUT); ditto(N);

        make_loc(R_NS,
            "You are in a low N/S passage at a hole in the floor.  The hole goes\n" +
            "down to an E/W passage.",
            "You're in N/S passage.", 0);
        make_ins(HALL, R_HMK); ditto(OUT); ditto(S);
        make_ins(N, R_Y2); ditto(Y2);
        make_ins(D, R_DIRTY); ditto(HOLE);

        make_loc(R_Y2,
            "You are in a large room, with a passage to the south, a passage to the\n" +
            "west, and a wall of broken rock to the east.  There is a large \"Y2\" on\n" +
            "a rock in the room's center.",
            "You're at \"Y2\".", 0);
        make_ins(PLUGH, R_HOUSE);
        make_ins(S, R_NS);
        make_ins(E, R_JUMBLE); ditto(WALL); ditto(BROKEN);
        make_ins(W, R_WINDOE);
        make_cond_ins(PLOVER, only_if_toting(EMERALD), R_PDROP);
        make_ins(PLOVER, R_PLOVER);

        make_loc(R_JUMBLE,
            "You are in a jumble of rock, with cracks everywhere.",
            null, 0);
        make_ins(D, R_Y2); ditto(Y2);
        make_ins(U, R_EMIST);

        make_loc(R_WINDOE,
            "You're at a low window overlooking a huge pit, which extends up out of\n" +
            "sight.  A floor is indistinctly visible over 50 feet below.  Traces of\n" +
            "white mist cover the floor of the pit, becoming thicker to the right.\n" +
            "Marks in the dust around the window would seem to indicate that\n" +
            "someone has been here recently.  Directly across the pit from you and\n" +
            "25 feet away there is a similar window looking into a lighted room.\n" +
            "A shadowy figure can be seen there peering back at you.",
            "You're at window on pit.", 0);
        make_ins(E, R_Y2); ditto(Y2);
        make_ins(JUMP, R_NECK);

        make_loc(R_DIRTY,
            "You are in a dirty broken passage.  To the east is a crawl.  To the\n" +
            "west is a large passage.  Above you is a hole to another passage.",
            "You're in dirty passage.", 0);
        make_ins(E, R_CLEAN); ditto(CRAWL);
        make_ins(U, R_NS); ditto(HOLE);
        make_ins(W, R_DUSTY);
        make_ins(BEDQUILT, R_BEDQUILT);

        make_loc(R_CLEAN,
            "You are on the brink of a small clean climbable pit.  A crawl leads\n" +
            "west.",
            "You're by a clean pit.", 0);
        make_ins(W, R_DIRTY); ditto(CRAWL);
        make_ins(D, R_WET); ditto(PIT); ditto(CLIMB);

        make_loc(R_WET,
            "You are in the bottom of a small pit with a little stream, which\n" +
            "enters and exits through tiny slits.",
            "You're in pit by stream.", 0);
        make_ins(CLIMB, R_CLEAN); ditto(U); ditto(OUT);
        make_ins(SLIT, remark(0)); ditto(STREAM); ditto(D); ditto(UPSTREAM); ditto(DOWNSTREAM);

        make_loc(R_DUSTY,
            "You are in a large room full of dusty rocks.  There is a big hole in\n" +
            "the floor.  There are cracks everywhere, and a passage leading east.",
            "You're in dusty rock room.", 0);
        make_ins(E, R_DIRTY); ditto(PASSAGE);
        make_ins(D, R_COMPLEX); ditto(HOLE); ditto(FLOOR);
        make_ins(BEDQUILT, R_BEDQUILT);

        make_loc(R_COMPLEX,
            "You are at a complex junction.  A low hands-and-knees passage from the\n" +
            "north joins a higher crawl from the east to make a walking passage\n" +
            "going west.  There is also a large room above.  The air is damp here.",
            "You're at complex junction.", 0);
        make_ins(U, R_DUSTY); ditto(CLIMB); ditto(ROOM);
        make_ins(W, R_BEDQUILT); ditto(BEDQUILT);
        make_ins(N, R_SHELL); ditto(SHELL);
        make_ins(E, R_ANTE);

        make_loc(R_SHELL,
            "You're in a large room carved out of sedimentary rock.  The floor\n" +
            "and walls are littered with bits of shells embedded in the stone.\n" +
            "A shallow passage proceeds downward, and a somewhat steeper one\n" +
            "leads up.  A low hands-and-knees passage enters from the south.",
            "You're in Shell Room.", 0);
        make_ins(U, R_ARCHED); ditto(HALL);
        make_ins(D, R_RAGGED);
        make_cond_ins(S, only_if_toting(CLAM), remark(4));
        make_cond_ins(S, only_if_toting(OYSTER), remark(5));
        make_ins(S, R_COMPLEX);

        make_loc(R_ARCHED,
            "You are in an arched hall.  A coral passage once continued up and east\n" +
            "from here, but is now blocked by debris.  The air smells of sea water.",
            "You're in arched hall.", 0);
        make_ins(D, R_SHELL); ditto(SHELL); ditto(OUT);

        make_loc(R_RAGGED,
            "You are in a long sloping corridor with ragged sharp walls.",
            null, 0);
        make_ins(U, R_SHELL); ditto(SHELL);
        make_ins(D, R_SAC);

        make_loc(R_SAC,
            "You are in a cul-de-sac about eight feet across.",
            null, 0);
        make_ins(U, R_RAGGED); ditto(OUT);
        make_ins(SHELL, R_SHELL);

        make_loc(R_ANTE,
            "You are in an anteroom leading to a large passage to the east.  Small\n" +
            "passages go west and up.  The remnants of recent digging are evident.\n" +
            "A sign in midair here says \"CAVE UNDER CONSTRUCTION BEYOND THIS POINT.\n" +
            "PROCEED AT OWN RISK.  [WITT CONSTRUCTION COMPANY]\"",
            "You're in anteroom.", 0);
        make_ins(U, R_COMPLEX);
        make_ins(W, R_BEDQUILT);
        make_ins(E, R_WITT);

        make_loc(R_WITT,
            "You are at Witt's End.  Passages lead off in *ALL* directions.",
            "You're at Witt's End.", F_WITT_HINT);
        make_cond_ins(E, 95, remark(6)); ditto(N); ditto(S);
        ditto(NE); ditto(SE); ditto(SW); ditto(NW); ditto(U); ditto(D);
        make_ins(E, R_ANTE);
        make_ins(W, remark(7));

        make_loc(R_BEDQUILT,
            "You are in Bedquilt, a long east/west passage with holes everywhere.\n" +
            "To explore at random select north, south, up, or down.",
            "You're in Bedquilt.", 0);
        make_ins(E, R_COMPLEX);
        make_ins(W, R_SWISS);
        make_cond_ins(S, 80, remark(6));
        make_ins(SLAB, R_SLAB);
        make_cond_ins(U, 80, remark(6));
        make_cond_ins(U, 50, R_ABOVEP);
        make_ins(U, R_DUSTY);
        make_cond_ins(N, 60, remark(6));
        make_cond_ins(N, 75, R_LOW);
        make_ins(N, R_SJUNC);
        make_cond_ins(D, 80, remark(6));
        make_ins(D, R_ANTE);

        make_loc(R_SWISS,
            "You are in a room whose walls resemble Swiss cheese.  Obvious passages\n" +
            "go west, east, NE, and NW.  Part of the room is occupied by a large\n" +
            "bedrock block.",
            "You're in Swiss cheese room.", 0);
        make_ins(NE, R_BEDQUILT);
        make_ins(W, R_E2PIT);
        make_cond_ins(S, 80, remark(6));
        make_ins(CANYON, R_TALL);
        make_ins(E, R_SOFT);
        make_cond_ins(NW, 50, remark(6));
        make_ins(ORIENTAL, R_ORIENTAL);

        make_loc(R_SOFT,
            "You are in the Soft Room.  The walls are covered with heavy curtains,\n" +
            "the floor with a thick pile carpet.  Moss covers the ceiling.",
            "You're in Soft Room.", 0);
        make_ins(W, R_SWISS); ditto(OUT);

        make_loc(R_E2PIT,
            "You are at the east end of the Twopit Room.  The floor here is\n" +
            "littered with thin rock slabs, which make it easy to descend the pits.\n" +
            "There is a path here bypassing the pits to connect passages from east\n" +
            "and west.  There are holes all over, but the only big one is on the\n" +
            "wall directly over the west pit where you can't get to it.",
            "You're at east end of Twopit Room.", 0);
        make_ins(E, R_SWISS);
        make_ins(W, R_W2PIT); ditto(ACROSS);
        make_ins(D, R_EPIT); ditto(PIT);

        make_loc(R_W2PIT,
            "You are at the west end of the Twopit Room.  There is a large hole in\n" +
            "the wall above the pit at this end of the room.",
            "You're at west end of Twopit Room.", 0);
        make_ins(E, R_E2PIT); ditto(ACROSS);
        make_ins(W, R_SLAB); ditto(SLAB);
        make_ins(D, R_WPIT); ditto(PIT);
        make_ins(HOLE, remark(8));

        make_loc(R_EPIT,
            "You are at the bottom of the eastern pit in the Twopit Room.  There is\n" +
            "a small pool of oil in one corner of the pit.",
            "You're in east pit.", 0);
        make_ins(U, R_E2PIT); ditto(OUT);

        make_loc(R_WPIT,
            "You are at the bottom of the western pit in the Twopit Room.  There is\n" +
            "a large hole in the wall about 25 feet above you.",
            "You're in west pit.", 0);
        make_ins(U, R_W2PIT); ditto(OUT);
        make_cond_ins(CLIMB, unless_prop(PLANT, 2), R_CHECK);
        make_ins(CLIMB, R_CLIMB);

        make_loc(R_NARROW,
            "You are in a long, narrow corridor stretching out of sight to the\n" +
            "west.  At the eastern end is a hole through which you can see a\n" +
            "profusion of leaves.",
            "You're in narrow corridor.", 0);
        make_ins(D, R_WPIT); ditto(CLIMB); ditto(E);
        make_ins(JUMP, R_NECK);
        make_ins(W, R_GIANT); ditto(GIANT);

        make_loc(R_GIANT,
            "You are in the Giant Room.  The ceiling here is too high up for your\n" +
            "lamp to show it.  Cavernous passages lead east, north, and south.  On\n" +
            "the west wall is scrawled the inscription, \"FEE FIE FOE FOO\" [sic].",
            "You're in Giant Room.", 0);
        make_ins(S, R_NARROW);
        make_ins(E, R_BLOCK);
        make_ins(N, R_IMMENSE);

        make_loc(R_BLOCK,
            "The passage here is blocked by a recent cave-in.",
            null, 0);
        make_ins(S, R_GIANT); ditto(GIANT); ditto(OUT);

        make_loc(R_IMMENSE,
            "You are at one end of an immense north/south passage.",
            null, 0);
        make_ins(S, R_GIANT); ditto(GIANT); ditto(PASSAGE);
        make_cond_ins(N, unless_prop(RUSTY_DOOR, 0), R_FALLS); ditto(ENTER); ditto(CAVERN);
        make_ins(N, remark(9));

        make_loc(R_FALLS,
            "You are in a magnificent cavern with a rushing stream, which cascades\n" +
            "over a sparkling waterfall into a roaring whirlpool that disappears\n" +
            "through a hole in the floor.  Passages exit to the south and west.",
            "You're in cavern with waterfall.", 0);
        make_ins(S, R_IMMENSE); ditto(OUT);
        make_ins(GIANT, R_GIANT);
        make_ins(W, R_INCLINE);

        make_loc(R_INCLINE,
            "You are at the top of a steep incline above a large room.  You could\n" +
            "climb down here, but you would not be able to climb up.  There is a\n" +
            "passage leading back to the north.",
            "You're at steep incline above large room.", 0);
        make_ins(N, R_FALLS); ditto(CAVERN); ditto(PASSAGE);
        make_ins(D, R_LOW); ditto(CLIMB);

        make_loc(R_ABOVEP,
            "You are in a secret N/S canyon above a sizable passage.",
            null, 0);
        make_ins(N, R_SJUNC);
        make_ins(D, R_BEDQUILT); ditto(PASSAGE);
        make_ins(S, R_TITE);

        make_loc(R_SJUNC,
            "You are in a secret canyon at a junction of three canyons, bearing\n" +
            "north, south, and SE.  The north one is as tall as the other two\n" +
            "combined.",
            "You're at junction of three secret canyons.", 0);
        make_ins(SE, R_BEDQUILT);
        make_ins(S, R_ABOVEP);
        make_ins(N, R_WINDOW);

        make_loc(R_TITE,
            "A large stalactite extends from the roof and almost reaches the floor\n" +
            "below.  You could climb down it, and jump from it to the floor, but\n" +
            "having done so you would be unable to reach it to climb back up.",
            "You're at top of stalactite.", 0);
        make_ins(N, R_ABOVEP);
        make_cond_ins(D, 40, R_LIKE6); ditto(JUMP); ditto(CLIMB);
        make_cond_ins(D, 50, R_LIKE9);
        make_ins(D, R_LIKE4);

        make_loc(R_LOW,
            "You are in a large low room.  Crawls lead north, SE, and SW.",
            null, 0);
        make_ins(BEDQUILT, R_BEDQUILT);
        make_ins(SW, R_SLOPING);
        make_ins(N, R_CRAWL);
        make_ins(SE, R_ORIENTAL); ditto(ORIENTAL);

        make_loc(R_CRAWL,
            "Dead end crawl.",
            null, 0);
        make_ins(S, R_LOW); ditto(CRAWL); ditto(OUT);

        make_loc(R_WINDOW,
            "You're at a low window overlooking a huge pit, which extends up out of\n" +
            "sight.  A floor is indistinctly visible over 50 feet below.  Traces of\n" +
            "white mist cover the floor of the pit, becoming thicker to the left.\n" +
            "Marks in the dust around the window would seem to indicate that\n" +
            "someone has been here recently.  Directly across the pit from you and\n" +
            "25 feet away there is a similar window looking into a lighted room.\n" +
            "A shadowy figure can be seen there peering back at you.",
            "You're at window on pit.", 0);
        make_ins(W, R_SJUNC);
        make_ins(JUMP, R_NECK);

        make_loc(R_ORIENTAL,
            "This is the Oriental Room.  Ancient oriental cave drawings cover the\n" +
            "walls.  A gently sloping passage leads upward to the north, another\n" +
            "passage leads SE, and a hands-and-knees crawl leads west.",
            "You're in Oriental Room.", 0);
        make_ins(SE, R_SWISS);
        make_ins(W, R_LOW); ditto(CRAWL);
        make_ins(U, R_MISTY); ditto(N); ditto(CAVERN);

        make_loc(R_MISTY,
            "You are following a wide path around the outer edge of a large cavern.\n" +
            "Far below, through a heavy white mist, strange splashing noises can be\n" +
            "heard.  The mist rises up through a fissure in the ceiling.  The path\n" +
            "exits to the south and west.",
            "You're in misty cavern.", 0);
        make_ins(S, R_ORIENTAL); ditto(ORIENTAL);
        make_ins(W, R_ALCOVE);

        make_loc(R_ALCOVE,
            "You are in an alcove.  A small NW path seems to widen after a short\n" +
            "distance.  An extremely tight tunnel leads east.  It looks like a very\n" +
            "tight squeeze.  An eerie light can be seen at the other end.",
            "You're in alcove.", F_DARK_HINT);
        make_ins(NW, R_MISTY); ditto(CAVERN);
        make_ins(E, R_PPASS); ditto(PASSAGE);
        make_ins(E, R_PLOVER); // never performed, but seen by BACK

        make_loc(R_PLOVER,
            "You're in a small chamber lit by an eerie green light.  An extremely\n" +
            "narrow tunnel exits to the west.  A dark corridor leads NE.",
            "You're in Plover Room.", F_DARK_HINT);
        make_ins(W, R_PPASS); ditto(PASSAGE); ditto(OUT);
        make_ins(W, R_ALCOVE); // never performed, but seen by BACK
        make_cond_ins(PLOVER, only_if_toting(EMERALD), R_PDROP);
        make_ins(PLOVER, R_Y2);
        make_ins(NE, R_DARK); ditto(DARK);

        make_loc(R_DARK,
            "You're in the Dark-Room.  A corridor leading south is the only exit.",
            "You're in Dark-Room.", F_DARK_HINT);
        make_ins(S, R_PLOVER); ditto(PLOVER); ditto(OUT);

        make_loc(R_SLAB,
            "You are in a large low circular chamber whose floor is an immense slab\n" +
            "fallen from the ceiling (Slab Room).  There once were large passages\n" +
            "to the east and west, but they are now filled with boulders.  Low\n" +
            "small passages go north and south, and the south one quickly bends\n" +
            "east around the boulders.",
            "You're in Slab Room.", 0);
        make_ins(S, R_W2PIT);
        make_ins(U, R_ABOVER); ditto(CLIMB);
        make_ins(N, R_BEDQUILT);

        make_loc(R_ABOVER,
            "You are in a secret N/S canyon above a large room.",
            null, 0);
        make_ins(D, R_SLAB); ditto(SLAB);
        make_cond_ins(S, unless_prop(DRAGON, 0), R_SCAN2);
        make_ins(S, R_SCAN1);
        make_ins(N, R_MIRROR);
        make_ins(RESERVOIR, R_RES);

        make_loc(R_MIRROR,
            "You are in a north/south canyon about 25 feet across.  The floor is\n" +
            "covered by white mist seeping in from the north.  The walls extend\n" +
            "upward for well over 100 feet.  Suspended from some unseen point far\n" +
            "above you, an enormous two-sided mirror is hanging parallel to and\n" +
            "midway between the canyon walls.  (The mirror is obviously provided\n" +
            "for the use of the dwarves, who as you know are extremely vain.)\n" +
            "A small window can be seen in either wall, some fifty feet up.",
            "You're in mirror canyon.", 0);
        make_ins(S, R_ABOVER);
        make_ins(N, R_RES); ditto(RESERVOIR);

        make_loc(R_RES,
            "You are at the edge of a large underground reservoir.  An opaque cloud\n" +
            "of white mist fills the room and rises rapidly upward.  The lake is\n" +
            "fed by a stream, which tumbles out of a hole in the wall about 10 feet\n" +
            "overhead and splashes noisily into the water somewhere within the\n" +
            "mist.  The only passage goes back toward the south.",
            "You're at reservoir.", 0);
        make_ins(S, R_MIRROR); ditto(OUT);

        // Dragon area
        const scan1_desc = "You are in a secret canyon that exits to the north and east.";
        make_loc(R_SCAN1, scan1_desc, null, 0);
        make_ins(N, R_ABOVER); ditto(OUT);
        make_ins(E, remark(10)); ditto(FORWARD);

        make_loc(R_SCAN2, scan1_desc, null, 0);
        make_ins(N, R_ABOVER);
        make_ins(E, R_SECRET);

        make_loc(R_SCAN3, scan1_desc, null, 0);
        make_ins(E, R_SECRET); ditto(OUT);
        make_ins(N, remark(10)); ditto(FORWARD);

        make_loc(R_SECRET,
            "You are in a secret canyon which here runs E/W.  It crosses over a\n" +
            "very tight canyon 15 feet below.  If you go down you may not be able\n" +
            "to get back up.",
            "You're in secret E/W canyon above tight canyon.", 0);
        make_ins(E, R_HMK);
        make_cond_ins(W, unless_prop(DRAGON, 0), R_SCAN2);
        make_ins(W, R_SCAN3);
        make_ins(D, R_WIDE);

        make_loc(R_WIDE,
            "You are at a wide place in a very tight N/S canyon.",
            null, 0);
        make_ins(S, R_TIGHT);
        make_ins(N, R_TALL);

        make_loc(R_TIGHT,
            "The canyon here becomes too tight to go further south.",
            null, 0);
        make_ins(N, R_WIDE);

        make_loc(R_TALL,
            "You are in a tall E/W canyon.  A low tight crawl goes 3 feet north and\n" +
            "seems to open up.",
            "You're in tall E/W canyon.", 0);
        make_ins(E, R_WIDE);
        make_ins(W, R_BOULDERS);
        make_ins(N, R_SWISS); ditto(CRAWL);

        make_loc(R_BOULDERS,
            "The canyon runs into a mass of boulders \u2014 dead end.",
            null, 0);
        make_ins(S, R_TALL);

        make_loc(R_SLOPING,
            "You are in a long winding corridor sloping out of sight in both\n" +
            "directions.",
            "You're in sloping corridor.", 0);
        make_ins(D, R_LOW);
        make_ins(U, R_SWSIDE);

        make_loc(R_SWSIDE,
            "You are on one side of a large, deep chasm.  A heavy white mist rising\n" +
            "up from below obscures all view of the far side.  A SW path leads away\n" +
            "from the chasm into a winding corridor.",
            "You're on SW side of chasm.", 0);
        make_ins(SW, R_SLOPING);
        make_cond_ins(OVER, only_if_here(TROLL), remark(11)); ditto(ACROSS); ditto(CROSS); ditto(NE);
        make_cond_ins(OVER, unless_prop(CHASM, 0), remark(12));
        make_ins(OVER, R_TROLL);
        make_cond_ins(JUMP, unless_prop(CHASM, 0), R_LOSE);
        make_ins(JUMP, remark(2));

        // Dead ends
        make_loc(R_DEAD0, dead_end, null, 0);
        make_ins(S, R_CROSS); ditto(OUT);
        make_loc(R_DEAD1, dead_end, null, F_TWIST_HINT);
        make_ins(W, R_LIKE11); ditto(OUT);
        make_loc(R_PIRATES_NEST, dead_end, null, 0);
        make_ins(SE, R_LIKE13);
        make_loc(R_DEAD3, dead_end, null, F_TWIST_HINT);
        make_ins(W, R_LIKE4); ditto(OUT);
        make_loc(R_DEAD4, dead_end, null, F_TWIST_HINT);
        make_ins(E, R_LIKE4); ditto(OUT);
        make_loc(R_DEAD5, dead_end, null, F_TWIST_HINT);
        make_ins(U, R_LIKE3); ditto(OUT);
        make_loc(R_DEAD6, dead_end, null, F_TWIST_HINT);
        make_ins(W, R_LIKE9); ditto(OUT);
        make_loc(R_DEAD7, dead_end, null, F_TWIST_HINT);
        make_ins(U, R_LIKE10); ditto(OUT);
        make_loc(R_DEAD8, dead_end, null, 0);
        make_ins(E, R_BRINK); ditto(OUT);
        make_loc(R_DEAD9, dead_end, null, F_TWIST_HINT);
        make_ins(S, R_LIKE3); ditto(OUT);
        make_loc(R_DEAD10, dead_end, null, F_TWIST_HINT);
        make_ins(E, R_LIKE12); ditto(OUT);
        make_loc(R_DEAD11, dead_end, null, F_TWIST_HINT);
        make_ins(U, R_LIKE8); ditto(OUT);

        // NE side of chasm
        make_loc(R_NESIDE,
            "You are on the far side of the chasm.  A NE path leads away from the\n" +
            "chasm on this side.",
            "You're on NE side of chasm.", 0);
        make_ins(NE, R_CORR);
        make_cond_ins(OVER, only_if_here(TROLL), remark(11)); ditto(ACROSS); ditto(CROSS); ditto(SW);
        make_ins(OVER, R_TROLL);
        make_ins(JUMP, remark(2));
        make_ins(FORK, R_FORK);
        make_ins(VIEW, R_VIEW);
        make_ins(BARREN, R_FBARR);

        make_loc(R_CORR,
            "You're in a long east/west corridor.  A faint rumbling noise can be\n" +
            "heard in the distance.",
            "You're in corridor.", 0);
        make_ins(W, R_NESIDE);
        make_ins(E, R_FORK); ditto(FORK);
        make_ins(VIEW, R_VIEW);
        make_ins(BARREN, R_FBARR);

        make_loc(R_FORK,
            "The path forks here.  The left fork leads northeast.  A dull rumbling\n" +
            "seems to get louder in that direction.  The right fork leads southeast\n" +
            "down a gentle slope.  The main corridor enters from the west.",
            "You're at fork in path.", 0);
        make_ins(W, R_CORR);
        make_ins(NE, R_WARM); ditto(LEFT);
        make_ins(SE, R_LIME); ditto(RIGHT); ditto(D);
        make_ins(VIEW, R_VIEW);
        make_ins(BARREN, R_FBARR);

        make_loc(R_WARM,
            "The walls are quite warm here.  From the north can be heard a steady\n" +
            "roar, so loud that the entire cave seems to be trembling.  Another\n" +
            "passage leads south, and a low crawl goes east.",
            "You're at junction with warm walls.", 0);
        make_ins(S, R_FORK); ditto(FORK);
        make_ins(N, R_VIEW); ditto(VIEW);
        make_ins(E, R_CHAMBER); ditto(CRAWL);

        make_loc(R_VIEW,
            "You are on the edge of a breath-taking view.  Far below you is an\n" +
            "active volcano, from which great gouts of molten lava come surging\n" +
            "out, cascading back down into the depths.  The glowing rock fills the\n" +
            "farthest reaches of the cavern with a blood-red glare, giving every-\n" +
            "thing an eerie, macabre appearance.  The air is filled with flickering\n" +
            "sparks of ash and a heavy smell of brimstone.  The walls are hot to\n" +
            "the touch, and the thundering of the volcano drowns out all other\n" +
            "sounds.  Embedded in the jagged roof far overhead are myriad twisted\n" +
            "formations, composed of pure white alabaster, which scatter the murky\n" +
            "light into sinister apparitions upon the walls.  To one side is a deep\n" +
            "gorge, filled with a bizarre chaos of tortured rock that seems to have\n" +
            "been crafted by the Devil himself.  An immense river of fire crashes\n" +
            "out from the depths of the volcano, burns its way through the gorge,\n" +
            "and plummets into a bottomless pit far off to your left.  To the\n" +
            "right, an immense geyser of blistering steam erupts continuously\n" +
            "from a barren island in the center of a sulfurous lake, which bubbles\n" +
            "ominously.  The far right wall is aflame with an incandescence of its\n" +
            "own, which lends an additional infernal splendor to the already\n" +
            "hellish scene.  A dark, foreboding passage exits to the south.",
            "You're at breath-taking view.", 0);
        make_ins(S, R_WARM); ditto(PASSAGE); ditto(OUT);
        make_ins(FORK, R_FORK);
        make_ins(D, remark(13)); ditto(JUMP);

        make_loc(R_CHAMBER,
            "You are in a small chamber filled with large boulders.  The walls are\n" +
            "very warm, causing the air in the room to be almost stifling from the\n" +
            "heat.  The only exit is a crawl heading west, through which is coming\n" +
            "a low rumbling.",
            "You're in chamber of boulders.", 0);
        make_ins(W, R_WARM); ditto(OUT); ditto(CRAWL);
        make_ins(FORK, R_FORK);
        make_ins(VIEW, R_VIEW);

        make_loc(R_LIME,
            "You are walking along a gently sloping north/south passage lined with\n" +
            "oddly shaped limestone formations.",
            "You're in limestone passage.", 0);
        make_ins(N, R_FORK); ditto(U); ditto(FORK);
        make_ins(S, R_FBARR); ditto(D); ditto(BARREN);
        make_ins(VIEW, R_VIEW);

        make_loc(R_FBARR,
            "You are standing at the entrance to a large, barren room.  A sign\n" +
            "posted above the entrance reads:  \"CAUTION!  BEAR IN ROOM!\"",
            "You're in front of barren room.", 0);
        make_ins(W, R_LIME); ditto(U);
        make_ins(FORK, R_FORK);
        make_ins(E, R_BARR); ditto(IN); ditto(BARREN); ditto(ENTER);
        make_ins(VIEW, R_VIEW);

        make_loc(R_BARR,
            "You are inside a barren room.  The center of the room is completely\n" +
            "empty except for some dust.  Marks in the dust lead away toward the\n" +
            "far end of the room.  The only exit is the way you came in.",
            "You're in barren room.", 0);
        make_ins(W, R_FBARR); ditto(OUT);
        make_ins(FORK, R_FORK);
        make_ins(VIEW, R_VIEW);

        // End-game repository
        make_loc(R_NEEND,
            "You are at the northeast end of an immense room, even larger than the\n" +
            "Giant Room.  It appears to be a repository for the \"Adventure\"\n" +
            "program.  Massive torches far overhead bathe the room with smoky\n" +
            "yellow light.  Scattered about you can be seen a pile of bottles (all\n" +
            "of them empty), a nursery of young beanstalks murmuring quietly, a bed\n" +
            "of oysters, a bundle of black rods with rusty stars on their ends, and\n" +
            "a collection of brass lanterns.  Off to one side a great many dwarves\n" +
            "are sleeping on the floor, snoring loudly.  A sign nearby reads: \"DO\n" +
            "NOT DISTURB THE DWARVES!\"  An immense mirror is hanging against one\n" +
            "wall, and stretches to the other end of the room, where various other\n" +
            "sundry objects can be glimpsed dimly in the distance.",
            "You're at NE end.", 0);
        make_ins(SW, R_SWEND);

        make_loc(R_SWEND,
            "You are at the southwest end of the repository.  To one side is a pit\n" +
            "full of fierce green snakes.  On the other side is a row of small\n" +
            "wicker cages, each of which contains a little sulking bird.  In one\n" +
            "corner is a bundle of black rods with rusty marks on their ends.\n" +
            "A large number of velvet pillows are scattered about on the floor.\n" +
            "A vast mirror stretches off to the northeast.  At your feet is a\n" +
            "large steel grate, next to which is a sign that reads, \"TREASURE\n" +
            "VAULT.  KEYS IN MAIN OFFICE.\"",
            "You're at SW end.", 0);
        make_ins(NE, R_NEEND);
        make_ins(D, remark(1));

        // Forced-move pseudo-locations
        make_loc(R_NECK, "You are at the bottom of the pit with a broken neck.", null, 0);
        make_ins(0, R_LIMBO);
        make_loc(R_LOSE, "You didn't make it.", null, 0);
        make_ins(0, R_LIMBO);
        make_loc(R_CLIMB, "You clamber up the plant and scurry through the hole at the top.", null, 0);
        make_ins(0, R_NARROW);
        make_loc(R_CHECK, null, null, 0);
        make_cond_ins(0, unless_prop(PLANT, 1), R_UPNOUT);
        make_ins(0, R_DIDIT);
        make_loc(R_THRU,
            "You have crawled through a very low wide passage parallel to and north\n" +
            "of the Hall of Mists.",
            null, 0);
        make_ins(0, R_WMIST);
        make_loc(R_DUCK, places[R_THRU].long_desc, null, 0);
        make_ins(0, R_WFISS);
        make_loc(R_UPNOUT,
            "There is nothing here to climb.  Use \"up\" or \"out\" to leave the pit.",
            null, 0);
        make_ins(0, R_WPIT);
        make_loc(R_DIDIT, "You have climbed up the plant and out of the pit.", null, 0);
        make_ins(0, R_W2PIT);

        // R_PPASS sentinel
        start[R_PPASS] = travels.length;
        // Sentinel for the last real location
        start[MAX_LOC + 1] = travels.length;

        this._travels = travels;
        this._start = start;
        this._places = places;
    }

    // ========== Object Table ==========
    _buildObjectTable() {
        const objs = {};
        for (let t = MIN_OBJ; t <= MAX_OBJ; t++) {
            objs[t] = { link: NOTHING, base: NOTHING, prop: 0, place: R_LIMBO, name: null, desc: [null, null, null, null] };
        }
        const new_obj = (t, n, b, l) => {
            objs[t].name = n;
            objs[t].prop = this._isTreasure(t) ? -1 : 0;
            objs[t].base = b;
            objs[t].place = l;
            objs[t].link = NOTHING;
            if (l > R_LIMBO) {
                // Drop at end of list
                let prev = null;
                let cur = this._places[l].objects;
                while (cur !== NOTHING) {
                    prev = cur;
                    cur = objs[cur].link;
                }
                if (prev === null) {
                    this._places[l].objects = t;
                } else {
                    objs[prev].link = t;
                }
            }
        };

        new_obj(KEYS, "Set of keys", 0, R_HOUSE);
        objs[KEYS].desc[0] = "There are some keys on the ground here.";
        new_obj(LAMP, "Brass lantern", 0, R_HOUSE);
        objs[LAMP].desc[0] = "There is a shiny brass lamp nearby.";
        objs[LAMP].desc[1] = "There is a lamp shining nearby.";
        new_obj(GRATE, null, GRATE, R_OUTSIDE);
        new_obj(GRATE_, null, GRATE, R_INSIDE);
        objs[GRATE].desc[0] = "The grate is locked.";
        objs[GRATE].desc[1] = "The grate is open.";
        new_obj(CAGE, "Wicker cage", 0, R_COBBLES);
        objs[CAGE].desc[0] = "There is a small wicker cage discarded nearby.";
        new_obj(ROD, "Black rod", 0, R_DEBRIS);
        objs[ROD].desc[0] = "A three-foot black rod with a rusty star on an end lies nearby.";
        new_obj(ROD2, "Black rod", 0, R_LIMBO);
        objs[ROD2].desc[0] = "A three-foot black rod with a rusty mark on an end lies nearby.";
        new_obj(TREADS, null, TREADS, R_SPIT);
        new_obj(TREADS_, null, TREADS, R_EMIST);
        objs[TREADS].desc[0] = "Rough stone steps lead down the pit.";
        objs[TREADS].desc[1] = "Rough stone steps lead up the dome.";
        new_obj(BIRD, "Little bird in cage", 0, R_BIRD);
        objs[BIRD].desc[0] = "A cheerful little bird is sitting here singing.";
        objs[BIRD].desc[1] = "There is a little bird in the cage.";
        new_obj(RUSTY_DOOR, null, RUSTY_DOOR, R_IMMENSE);
        objs[RUSTY_DOOR].desc[0] = "The way north is barred by a massive, rusty, iron door.";
        objs[RUSTY_DOOR].desc[1] = "The way north leads through a massive, rusty, iron door.";
        new_obj(PILLOW, "Velvet pillow", 0, R_SOFT);
        objs[PILLOW].desc[0] = "A small velvet pillow lies on the floor.";
        new_obj(SNAKE, null, SNAKE, R_HMK);
        objs[SNAKE].desc[0] = "A huge green fierce snake bars the way!";
        objs[SNAKE].desc[1] = null;
        new_obj(FISSURE, null, FISSURE, R_EFISS);
        new_obj(FISSURE_, null, FISSURE, R_WFISS);
        objs[FISSURE].desc[0] = null;
        objs[FISSURE].desc[1] = "A crystal bridge now spans the fissure.";
        new_obj(TABLET, null, TABLET, R_DARK);
        objs[TABLET].desc[0] =
            "A massive stone tablet embedded in the wall reads:\n" +
            "\"CONGRATULATIONS ON BRINGING LIGHT INTO THE DARK-ROOM!\"";
        new_obj(CLAM, "Giant clam >GRUNT!<", 0, R_SHELL);
        objs[CLAM].desc[0] = "There is an enormous clam here with its shell tightly closed.";
        new_obj(OYSTER, "Giant oyster >GROAN!<", 0, R_LIMBO);
        objs[OYSTER].desc[0] = "There is an enormous oyster here with its shell tightly closed.";
        new_obj(MAG, "\"Spelunker Today\"", 0, R_ANTE);
        objs[MAG].desc[0] = "There are a few recent issues of \"Spelunker Today\" magazine here.";
        new_obj(DWARF, null, DWARF, R_LIMBO);
        new_obj(KNIFE, null, 0, R_LIMBO);
        new_obj(FOOD, "Tasty food", 0, R_HOUSE);
        objs[FOOD].desc[0] = "There is food here.";
        new_obj(BOTTLE, "Small bottle", 0, R_HOUSE);
        objs[BOTTLE].desc[0] = "There is a bottle of water here.";
        objs[BOTTLE].desc[1] = "There is an empty bottle here.";
        objs[BOTTLE].desc[2] = "There is a bottle of oil here.";
        new_obj(WATER, "Water in the bottle", 0, R_LIMBO);
        new_obj(OIL, "Oil in the bottle", 0, R_LIMBO);
        new_obj(MIRROR, null, MIRROR, R_MIRROR);
        new_obj(MIRROR_, null, MIRROR, R_LIMBO);
        objs[MIRROR].desc[0] = null;
        new_obj(PLANT, null, PLANT, R_WPIT);
        objs[PLANT].desc[0] = "There is a tiny little plant in the pit, murmuring \"Water, water, ...\"";
        objs[PLANT].desc[1] =
            "There is a 12-foot-tall beanstalk stretching up out of the pit,\n" +
            "bellowing \"Water!! Water!!\"";
        objs[PLANT].desc[2] = "There is a gigantic beanstalk stretching all the way up to the hole.";
        new_obj(PLANT2, null, PLANT2, R_W2PIT);
        new_obj(PLANT2_, null, PLANT2, R_E2PIT);
        objs[PLANT2].desc[0] = null;
        objs[PLANT2].desc[1] = "The top of a 12-foot-tall beanstalk is poking out of the west pit.";
        objs[PLANT2].desc[2] = "There is a huge beanstalk growing out of the west pit up to the hole.";
        new_obj(STALACTITE, null, STALACTITE, R_TITE);
        objs[STALACTITE].desc[0] = null;
        new_obj(SHADOW, null, SHADOW, R_WINDOE);
        new_obj(SHADOW_, null, SHADOW, R_WINDOW);
        objs[SHADOW].desc[0] = "The shadowy figure seems to be trying to attract your attention.";
        new_obj(AXE, "Dwarf's axe", 0, R_LIMBO);
        objs[AXE].desc[0] = "There is a little axe here.";
        objs[AXE].desc[1] = "There is a little axe lying beside the bear.";
        new_obj(DRAWINGS, null, DRAWINGS, R_ORIENTAL);
        objs[DRAWINGS].desc[0] = null;
        new_obj(PIRATE, null, PIRATE, R_LIMBO);
        new_obj(DRAGON, null, DRAGON, R_SCAN1);
        new_obj(DRAGON_, null, DRAGON, R_SCAN3);
        objs[DRAGON].desc[0] = "A huge green fierce dragon bars the way!";
        objs[DRAGON].desc[1] = "The body of a huge green dead dragon is lying off to one side.";
        new_obj(CHASM, null, CHASM, R_SWSIDE);
        new_obj(CHASM_, null, CHASM, R_NESIDE);
        objs[CHASM].desc[0] =
            "A rickety wooden bridge extends across the chasm, vanishing into the\n" +
            "mist. A sign posted on the bridge reads, \"STOP! PAY TROLL!\"";
        objs[CHASM].desc[1] =
            "The wreckage of a bridge (and a dead bear) can be seen at the bottom\n" +
            "of the chasm.";
        new_obj(TROLL, null, TROLL, R_SWSIDE);
        new_obj(TROLL_, null, TROLL, R_NESIDE);
        objs[TROLL].desc[0] =
            "A burly troll stands by the bridge and insists you throw him a\n" +
            "treasure before you may cross.";
        objs[TROLL].desc[1] = null;
        objs[TROLL].desc[2] = null;
        new_obj(NO_TROLL, null, NO_TROLL, R_LIMBO);
        new_obj(NO_TROLL_, null, NO_TROLL, R_LIMBO);
        objs[NO_TROLL].desc[0] = "The troll is nowhere to be seen.";
        new_obj(BEAR, null, BEAR, R_BARR);
        objs[BEAR].desc[0] = "There is a ferocious cave bear eying you from the far end of the room!";
        objs[BEAR].desc[1] = "There is a gentle cave bear sitting placidly in one corner.";
        objs[BEAR].desc[2] = "There is a contented-looking bear wandering about nearby.";
        objs[BEAR].desc[3] = null;
        new_obj(MESSAGE, null, MESSAGE, R_LIMBO);
        objs[MESSAGE].desc[0] =
            "There is a message scrawled in the dust in a flowery script, reading:\n" +
            "\"This is not the maze where the pirate hides his treasure chest.\"";
        new_obj(GORGE, null, GORGE, R_VIEW);
        objs[GORGE].desc[0] = null;
        new_obj(MACHINE, null, MACHINE, R_PONY);
        objs[MACHINE].desc[0] =
            "There is a massive vending machine here. The instructions on it read:\n" +
            "\"Drop coins here to receive fresh batteries.\"";
        new_obj(BATTERIES, "Batteries", 0, R_LIMBO);
        objs[BATTERIES].desc[0] = "There are fresh batteries here.";
        objs[BATTERIES].desc[1] = "Some worn-out batteries have been discarded nearby.";
        new_obj(MOSS, null, MOSS, R_SOFT);
        objs[MOSS].desc[0] = null;
        new_obj(GOLD, "Large gold nugget", 0, R_NUGGET);
        objs[GOLD].desc[0] = "There is a large sparkling nugget of gold here!";
        new_obj(DIAMONDS, "Several diamonds", 0, R_WFISS);
        objs[DIAMONDS].desc[0] = "There are diamonds here!";
        new_obj(SILVER, "Bars of silver", 0, R_NS);
        objs[SILVER].desc[0] = "There are bars of silver here!";
        new_obj(JEWELS, "Precious jewelry", 0, R_SOUTH);
        objs[JEWELS].desc[0] = "There is precious jewelry here!";
        new_obj(COINS, "Rare coins", 0, R_WEST);
        objs[COINS].desc[0] = "There are many coins here!";
        new_obj(CHEST, "Treasure chest", 0, R_LIMBO);
        objs[CHEST].desc[0] = "The pirate's treasure chest is here!";
        new_obj(EGGS, "Golden eggs", 0, R_GIANT);
        objs[EGGS].desc[0] = "There is a large nest here, full of golden eggs!";
        new_obj(TRIDENT, "Jeweled trident", 0, R_FALLS);
        objs[TRIDENT].desc[0] = "There is a jewel-encrusted trident here!";
        new_obj(VASE, "Ming vase", 0, R_ORIENTAL);
        objs[VASE].desc[0] = "There is a delicate, precious, Ming vase here!";
        objs[VASE].desc[1] = "The floor is littered with worthless shards of pottery.";
        new_obj(EMERALD, "Egg-sized emerald", 0, R_PLOVER);
        objs[EMERALD].desc[0] = "There is an emerald here the size of a plover's egg!";
        new_obj(PYRAMID, "Platinum pyramid", 0, R_DARK);
        objs[PYRAMID].desc[0] = "There is a platinum pyramid here, 8 inches on a side!";
        new_obj(PEARL, "Glistening pearl", 0, R_LIMBO);
        objs[PEARL].desc[0] = "Off to one side lies a glistening pearl!";
        new_obj(RUG_, null, RUG, R_SCAN3);
        new_obj(RUG, "Persian rug", RUG, R_SCAN1);
        objs[RUG].desc[0] = "There is a Persian rug spread out on the floor!";
        objs[RUG].desc[1] = "The dragon is sprawled out on a Persian rug!!";
        new_obj(SPICES, "Rare spices", 0, R_CHAMBER);
        objs[SPICES].desc[0] = "There are rare spices here!";
        new_obj(CHAIN, "Golden chain", CHAIN, R_BARR);
        objs[CHAIN].desc[0] = "There is a golden chain lying in a heap on the floor!";
        objs[CHAIN].desc[1] = "The bear is locked to the wall with a golden chain!";
        objs[CHAIN].desc[2] = "There is a golden chain locked to the wall!";

        this._objs = objs;
    }

    _isTreasure(t) {
        switch (t) {
            case GOLD: case DIAMONDS: case SILVER: case JEWELS:
            case COINS: case CHEST: case EGGS: case TRIDENT:
            case VASE: case EMERALD: case PYRAMID: case PEARL:
            case RUG: case SPICES: case CHAIN:
                return true;
            default:
                return false;
        }
    }

    // ========== State accessors ==========
    _toting(t) { return this._objs[t].place < 0; }
    _isImmobile(t) { return this._objs[t].base !== NOTHING; }
    _there(t, loc) { return this._objs[t].place === loc; }
    _here(t, loc) { return this._toting(t) || this._there(t, loc); }

    _bottleContents() {
        switch (this._objs[BOTTLE].prop) {
            case 0: return WATER;
            case 2: return OIL;
        }
        return NOTHING;
    }

    _isAtLoc(t, loc) {
        if (this._objs[t].base === NOTHING)
            return this._there(t, loc);
        for (let tt = t; this._objs[tt] && this._objs[tt].base === t; ++tt) {
            if (this._there(tt, loc)) return true;
        }
        return false;
    }

    _carry(t) {
        const l = this._objs[t].place;
        if (l !== R_INHAND) {
            if (l > R_LIMBO) {
                // Remove from location list
                if (this._places[l].objects === t) {
                    this._places[l].objects = this._objs[t].link;
                } else {
                    let p = this._places[l].objects;
                    while (p !== NOTHING && this._objs[p].link !== t) {
                        p = this._objs[p].link;
                    }
                    if (p !== NOTHING) {
                        this._objs[p].link = this._objs[t].link;
                    }
                }
            }
            this._objs[t].place = R_INHAND;
            this._objs[t].link = NOTHING;
            ++this._holding_count;
        }
    }

    _drop(t, l) {
        if (this._toting(t)) --this._holding_count;
        this._objs[t].place = l;
        if (l === R_INHAND) {
            ++this._holding_count;
        } else if (l !== R_LIMBO) {
            this._objs[t].link = this._places[l].objects;
            this._places[l].objects = t;
        }
    }

    _move(t, l) { this._carry(t); this._drop(t, l); }
    _juggle(t) { const l = this._objs[t].place; this._move(t, l); }
    _destroy(t) { this._move(t, R_LIMBO); }
    _mobilize(t) { this._objs[t].base = NOTHING; }
    _immobilize(t) { this._objs[t].base = t; }

    _isForced(loc) {
        switch (loc) {
            case R_NECK: case R_LOSE: case R_CLIMB: case R_CHECK:
            case R_THRU: case R_DUCK: case R_UPNOUT: case R_DIDIT:
                return true;
            default:
                return false;
        }
    }

    _hasLight(loc) {
        switch (loc) {
            case R_ROAD: case R_HILL: case R_HOUSE: case R_VALLEY:
            case R_FOREST: case R_FOREST2: case R_SLIT: case R_OUTSIDE:
            case R_INSIDE: case R_COBBLES:
            case R_PLOVER: case R_VIEW:
            case R_NEEND: case R_SWEND:
                return true;
            default:
                return false;
        }
    }

    _hasWater(loc) {
        switch (loc) {
            case R_ROAD: case R_HOUSE: case R_VALLEY: case R_SLIT:
            case R_WET: case R_FALLS: case R_RES:
                return true;
            default:
                return false;
        }
    }

    _hasOil(loc) { return loc === R_EPIT; }

    _nowInDarkness(loc) {
        if (this._hasLight(loc)) return false;
        if (this._here(LAMP, loc) && this._objs[LAMP].prop) return false;
        return true;
    }

    _dwarfAt(loc) {
        if (this._dflag < 2) return false;
        for (let j = 1; j <= 5; ++j) {
            if (loc === this._dwarves[j].loc) return true;
        }
        return false;
    }

    _forbiddenToPirate(loc) { return loc > R_PIRATES_NEST; }
    _caveIsClosing() { return this._clock1 < 0; }

    // ========== Output ==========
    _puts(s) {
        if (s == null) return;
        // C puts() outputs the string then a newline.
        // Messages contain embedded \n (SOFT_NL). Output each line separately.
        this._flushPrint();
        const lines = s.split('\n');
        for (const line of lines) {
            this._output(this._lineBuf + line);
            this._lineBuf = '';
        }
    }

    _printf(fmt, ...args) {
        let i = 0;
        const s = fmt.replace(/%([ds])/g, (_, type) => {
            const val = args[i++];
            return type === 'd' ? String(val) : val;
        });
        // printf in C doesn't add newline; puts does. We need to handle this.
        // In C, puts adds \n, printf doesn't. Our output function emits lines.
        // We'll buffer partial output.
        this._printBuf += s;
    }

    _flushPrint() {
        if (this._printBuf) {
            // Split by newlines and output complete lines
            const parts = this._printBuf.split('\n');
            for (let i = 0; i < parts.length - 1; i++) {
                this._output(this._lineBuf + parts[i]);
                this._lineBuf = '';
            }
            this._lineBuf += parts[parts.length - 1];
            this._printBuf = '';
        }
    }

    _flushAll() {
        this._flushPrint();
        if (this._lineBuf) {
            this._output(this._lineBuf);
            this._lineBuf = '';
        }
    }

    // ========== Yes/No ==========
    async _yes(q, y, n) {
        while (true) {
            // C: printf("%s\n** ", q); -> outputs q, newline, then "** " (no newline)
            this._puts(q);
            this._printf("** ");
            // Don't flushAll — leave "** " in lineBuf so response joins it
            this._flushPrint();
            const line = await this._input();
            const ch = line.trim().charAt(0).toLowerCase();
            if (ch === 'y') {
                if (y) this._puts(y);
                return true;
            } else if (ch === 'n') {
                if (n) this._puts(n);
                return false;
            } else {
                this._puts(" Please answer Yes or No.");
            }
        }
    }

    // ========== Listen ==========
    async _listen() {
        while (true) {
            this._printf("* ");
            // Don't flushAll — leave "* " in lineBuf so response joins it
            this._flushPrint();
            const line = await this._input();
            const trimmed = line.trimStart();
            if (trimmed === '') {
                this._puts(" Tell me to do something.");
                continue;
            }
            const parts = trimmed.split(/\s+/);
            if (parts.length > 2) {
                this._puts(" Please stick to 1- and 2-word commands.");
                continue;
            }
            this._word1 = parts[0].toLowerCase();
            this._word2 = parts.length > 1 ? parts[1].toLowerCase() : '';
            return;
        }
    }

    _shiftWords() {
        this._word1 = this._word2;
        this._word2 = '';
    }

    // ========== Hints ==========
    _initHints() {
        this._hints = [
            { count: 0, given: false, thresh: 0, cost: 5,
              prompt: "Welcome to Adventure!!  Would you like instructions?",
              hint: "Somewhere nearby is Colossal Cave, where others have found fortunes in\n" +
                "treasure and gold, though it is rumored that some who enter are never\n" +
                "seen again.  Magic is said to work in the cave.  I will be your eyes\n" +
                "and hands.  Direct me with commands of 1 or 2 words.  I should warn\n" +
                "you that I look at only the first five letters of each word, so you'll\n" +
                "have to enter \"NORTHEAST\" as \"NE\" to distinguish it from \"NORTH\".\n" +
                "(Should you get stuck, type \"HELP\" for some general hints.  For infor-\n" +
                "mation on how to end your adventure, etc., type \"INFO\".)\n" +
                "                             -  -  -\n" +
                "The first Adventure program was developed by Willie Crowther.\n" +
                "Most of the features of the current program were added by Don Woods.\n" +
                "This particular program was translated from Fortran to CWEB by\n" +
                "Don Knuth, and then from CWEB to ANSI C by Arthur O'Dwyer." },
            { count: 0, given: false, thresh: 0, cost: 10,
              prompt: "Hmmm, this looks like a clue, which means it'll cost you 10 points to\n" +
                "read it.  Should I go ahead and read it anyway?",
              hint: "It says, \"There is something strange about this place, such that one\n" +
                "of the words I've always known now has a new effect.\"" },
            { count: 0, given: false, thresh: 4, cost: 2,
              prompt: "Are you trying to get into the cave?",
              hint: "The grate is very solid and has a hardened steel lock.  You cannot\n" +
                "enter without a key, and there are no keys in sight.  I would recommend\n" +
                "looking elsewhere for the keys." },
            { count: 0, given: false, thresh: 5, cost: 2,
              prompt: "Are you trying to catch the bird?",
              hint: "Something seems to be frightening the bird just now and you cannot\n" +
                "catch it no matter what you try. Perhaps you might try later." },
            { count: 0, given: false, thresh: 8, cost: 2,
              prompt: "Are you trying to deal somehow with the snake?",
              hint: "You can't kill the snake, or drive it away, or avoid it, or anything\n" +
                "like that.  There is a way to get by, but you don't have the necessary\n" +
                "resources right now." },
            { count: 0, given: false, thresh: 75, cost: 4,
              prompt: "Do you need help getting out of the maze?",
              hint: "You can make the passages look less alike by dropping things." },
            { count: 0, given: false, thresh: 25, cost: 5,
              prompt: "Are you trying to explore beyond the Plover Room?",
              hint: "There is a way to explore that region without having to worry about\n" +
                "falling into a pit.  None of the objects available is immediately\n" +
                "useful in discovering the secret." },
            { count: 0, given: false, thresh: 20, cost: 3,
              prompt: "Do you need help getting out of here?",
              hint: "Don't go west." }
        ];
    }

    async _offer(j) {
        if (j > 1) {
            if (!await this._yes(this._hints[j].prompt, " I am prepared to give you a hint,", ok)) return;
            this._printf(" but it will cost you %d points.  ", this._hints[j].cost);
            this._flushAll();
            this._hints[j].given = await this._yes("Do you want the hint?", this._hints[j].hint, ok);
        } else {
            this._hints[j].given = await this._yes(this._hints[j].prompt, this._hints[j].hint, ok);
        }
        if (this._hints[j].given && this._lamp_limit > 30) {
            this._lamp_limit += 30 * this._hints[j].cost;
        }
    }

    async _maybeGiveAHint(loc, oldloc, oldoldloc, oldobj) {
        let k = F_CAVE_HINT;
        for (let j = 2; j <= 7; ++j, k <<= 1) {
            if (this._hints[j].given) continue;
            if ((this._places[loc].flags & k) === 0) {
                this._hints[j].count = 0;
                continue;
            }
            if (++this._hints[j].count >= this._hints[j].thresh) {
                switch (j) {
                    case 2:
                        if (!this._objs[GRATE].prop && !this._here(KEYS, loc)) {
                            await this._offer(j);
                        }
                        this._hints[j].count = 0;
                        break;
                    case 3:
                        if (this._here(BIRD, loc) && oldobj === BIRD && this._toting(ROD)) {
                            await this._offer(j);
                            this._hints[j].count = 0;
                        }
                        break;
                    case 4:
                        if (this._here(SNAKE, loc) && !this._here(BIRD, loc)) {
                            await this._offer(j);
                        }
                        this._hints[j].count = 0;
                        break;
                    case 5:
                        if (this._places[loc].objects === NOTHING &&
                            this._places[oldloc].objects === NOTHING &&
                            this._places[oldoldloc].objects === NOTHING &&
                            this._holding_count > 1) {
                            await this._offer(j);
                        }
                        this._hints[j].count = 0;
                        break;
                    case 6:
                        if (this._objs[EMERALD].prop !== -1 && this._objs[PYRAMID].prop === -1) {
                            await this._offer(j);
                        }
                        this._hints[j].count = 0;
                        break;
                    case 7:
                        await this._offer(j);
                        this._hints[j].count = 0;
                        break;
                }
            }
        }
    }

    // ========== Scoring ==========
    _score() {
        let s = 2;
        if (this._dflag !== 0) s += 25;
        for (let i = MIN_OBJ; i <= MAX_OBJ; ++i) {
            if (!this._isTreasure(i)) continue;
            if (this._objs[i].prop >= 0) {
                s += 2;
                if (this._there(i, R_HOUSE) && this._objs[i].prop === 0) {
                    if (i < CHEST) s += 10;
                    else if (i === CHEST) s += 12;
                    else s += 14;
                }
            }
        }
        s += 10 * (MAX_DEATHS - this._death_count);
        if (!this._gave_up) s += 4;
        if (this._there(MAG, R_WITT)) s += 1;
        if (this._caveIsClosing()) s += 25;
        s += this._bonus;
        for (let i = 0; i < 8; ++i) {
            if (this._hints[i].given) s -= this._hints[i].cost;
        }
        return s;
    }

    _quit() {
        const s = this._score();
        this._puts(`You scored ${s} out of a possible ${MAX_SCORE}, using ${this._turns} turn${this._turns === 1 ? '' : 's'}.`);
        let rank;
        for (rank = 0; class_score[rank] < s; ++rank) ;
        let msg = class_message[rank] + "\nTo achieve the next higher rating";
        if (rank < HIGHEST_CLASS) {
            const delta = class_score[rank] + 1 - s;
            msg += `, you need ${delta} more point${delta === 1 ? '' : 's'}.`;
        } else {
            msg += " would be a neat trick!\nCongratulations!!";
        }
        this._puts(msg);
        this._gameOver = true;
    }

    _giveUp() {
        this._gave_up = true;
        this._quit();
    }

    async _killThePlayer(lastSafePlace) {
        this._death_count++;
        if (this._caveIsClosing()) {
            this._puts("It looks as though you're dead.  Well, seeing as how it's so close to closing time anyway, let's just call it a day.");
            this._quit();
            return;
        }
        if (!await this._yes(death_wishes[2*this._death_count-2], death_wishes[2*this._death_count-1], ok) ||
            this._death_count === MAX_DEATHS) {
            this._quit();
            return;
        }
        // Reborn
        if (this._toting(LAMP)) this._objs[LAMP].prop = 0;
        this._objs[WATER].place = R_LIMBO;
        this._objs[OIL].place = R_LIMBO;
        for (let j = MAX_OBJ; j >= MIN_OBJ; --j) {
            if (this._toting(j)) this._drop(j, (j === LAMP) ? R_ROAD : lastSafePlace);
        }
    }

    // ========== Dwarves ==========
    _initDwarves() {
        this._dwarves = [
            { seen: false, oldloc: R_LIMBO, loc: R_PIRATES_NEST },
            { seen: false, oldloc: R_LIMBO, loc: R_HMK },
            { seen: false, oldloc: R_LIMBO, loc: R_WFISS },
            { seen: false, oldloc: R_LIMBO, loc: R_Y2 },
            { seen: false, oldloc: R_LIMBO, loc: R_LIKE3 },
            { seen: false, oldloc: R_LIMBO, loc: R_COMPLEX },
        ];
        this._dflag = 0;
        this._last_knife_loc = R_LIMBO;
        this._tally = 15;
        this._lost_treasures = 0;
    }

    _returnPirateToLair(withChest) {
        if (withChest) {
            this._drop(CHEST, R_PIRATES_NEST);
            this._drop(MESSAGE, R_PONY);
        }
        this._dwarves[0].loc = this._dwarves[0].oldloc = R_PIRATES_NEST;
        this._dwarves[0].seen = false;
    }

    _tooEasyToSteal(t, loc) {
        return t === PYRAMID && (loc === R_PLOVER || loc === R_DARK);
    }

    _stealAllYourTreasure(loc) {
        this._puts("Out from the shadows behind you pounces a bearded pirate!  \"Har, har,\"\n" +
            "he chortles. \"I'll just take all this booty and hide it away with me\n" +
            "chest deep in the maze!\"  He snatches your treasure and vanishes into\n" +
            "the gloom.");
        for (let t = MIN_OBJ; t <= MAX_OBJ; ++t) {
            if (!this._isTreasure(t)) continue;
            if (this._tooEasyToSteal(t, loc)) continue;
            if (this._here(t, loc) && !this._isImmobile(t)) {
                this._move(t, R_PIRATES_NEST);
            }
        }
    }

    _pirateTracksYou(loc) {
        const chestNeedsPlacing = this._there(MESSAGE, R_LIMBO);
        let stalking = false;
        if (loc === R_PIRATES_NEST || this._objs[CHEST].prop >= 0) return;
        for (let i = MIN_OBJ; i <= MAX_OBJ; ++i) {
            if (!this._isTreasure(i)) continue;
            if (this._tooEasyToSteal(i, loc)) continue;
            if (this._toting(i)) {
                this._stealAllYourTreasure(loc);
                this._returnPirateToLair(chestNeedsPlacing);
                return;
            }
            if (this._there(i, loc)) stalking = true;
        }
        if (this._tally === this._lost_treasures + 1 && !stalking && chestNeedsPlacing &&
            this._objs[LAMP].prop && this._here(LAMP, loc)) {
            this._puts("There are faint rustling noises from the darkness behind you. As you\n" +
                "turn toward them, the beam of your lamp falls across a bearded pirate.\n" +
                "He is carrying a large chest. \"Shiver me timbers!\" he cries, \"I've\n" +
                "been spotted! I'd best hie meself off to the maze to hide me chest!\"\n" +
                "With that, he vanishes into the gloom.");
            this._returnPirateToLair(true);
            return;
        }
        if (this._dwarves[0].oldloc !== this._dwarves[0].loc && pct(20)) {
            this._puts("There are faint rustling noises from the darkness behind you.");
        }
    }

    _moveDwarvesAndPirate(loc) {
        if (this._forbiddenToPirate(loc) || loc === R_LIMBO) {
            // bypass
        } else if (this._dflag === 0) {
            if (loc >= MIN_LOWER_LOC) this._dflag = 1;
        } else if (this._dflag === 1) {
            if (loc >= MIN_LOWER_LOC && pct(5)) {
                this._dflag = 2;
                if (pct(50)) this._dwarves[1 + ran(5)].loc = R_LIMBO;
                if (pct(50)) this._dwarves[1 + ran(5)].loc = R_LIMBO;
                for (let j = 1; j <= 5; ++j) {
                    if (this._dwarves[j].loc === loc) this._dwarves[j].loc = R_NUGGET;
                    this._dwarves[j].oldloc = this._dwarves[j].loc;
                }
                this._puts("A little dwarf just walked around a corner, saw you, threw a little\n" +
                    "axe at you which missed, cursed, and ran away.");
                this._drop(AXE, loc);
            }
        } else {
            let dtotal = 0, attack = 0, stick = 0;
            for (let j = 0; j <= 5; ++j) {
                const d = this._dwarves[j];
                if (d.loc !== R_LIMBO) {
                    const ploc = [];
                    const startIdx = this._start[d.loc];
                    const endIdx = this._start[d.loc + 1] !== undefined ? this._start[d.loc + 1] : this._travels.length;
                    for (let qi = startIdx; qi < endIdx; ++qi) {
                        const newloc = this._travels[qi].dest;
                        if (ploc.length !== 0 && newloc === ploc[ploc.length - 1]) continue;
                        if (newloc < MIN_LOWER_LOC) continue;
                        if (newloc === d.oldloc || newloc === d.loc) continue;
                        if (this._travels[qi].cond === 100) continue;
                        if (j === 0 && this._forbiddenToPirate(newloc)) continue;
                        if (this._isForced(newloc) || newloc > MAX_LOC) continue;
                        ploc.push(newloc);
                    }
                    if (ploc.length === 0) ploc.push(d.oldloc);
                    d.oldloc = d.loc;
                    d.loc = ploc[ran(ploc.length)];

                    if (d.loc === loc || d.oldloc === loc) {
                        d.seen = true;
                    } else if (loc < MIN_LOWER_LOC) {
                        d.seen = false;
                    }

                    if (d.seen) {
                        d.loc = loc;
                        if (j === 0) {
                            this._pirateTracksYou(loc);
                        } else {
                            ++dtotal;
                            if (d.oldloc === d.loc) {
                                ++attack;
                                this._last_knife_loc = loc;
                                if (ran(1000) < 95 * (this._dflag - 2)) ++stick;
                            }
                        }
                    }
                }
            }
            if (dtotal !== 0) {
                if (dtotal === 1) {
                    this._puts("There is a threatening little dwarf in the room with you!");
                } else {
                    this._puts(`There are ${dtotal} threatening little dwarves in the room with you!`);
                }
                if (attack) {
                    if (this._dflag === 2) this._dflag = 3;
                    if (attack === 1) {
                        this._puts("One sharp nasty knife is thrown at you!");
                        if (stick === 0) this._puts("It misses!");
                        else this._puts("It gets you!");
                    } else {
                        this._puts(`${attack} of them throw knives at you!`);
                        if (stick === 0) this._puts("None of them hit you!");
                        else if (stick === 1) this._puts("One of them gets you!");
                        else this._puts(`${stick} of them get you!`);
                    }
                    if (stick) return true; // death
                }
            }
        }
        return false;
    }

    // ========== Cave closing ==========
    _closeTheCave() {
        this._puts("The sepulchral voice intones, \"The cave is now closed.\"  As the echoes\n" +
            "fade, there is a blinding flash of light (and a small puff of orange\n" +
            "smoke). . . .    As your eyes refocus, you look around and find...");
        this._move(BOTTLE, R_NEEND); this._objs[BOTTLE].prop = -2;
        this._move(PLANT, R_NEEND); this._objs[PLANT].prop = -1;
        this._move(OYSTER, R_NEEND); this._objs[OYSTER].prop = -1;
        this._move(LAMP, R_NEEND); this._objs[LAMP].prop = -1;
        this._move(ROD, R_NEEND); this._objs[ROD].prop = -1;
        this._move(DWARF, R_NEEND); this._objs[DWARF].prop = -1;
        this._move(MIRROR, R_NEEND); this._objs[MIRROR].prop = -1;
        this._move(GRATE, R_SWEND); this._objs[GRATE].prop = 0;
        this._move(SNAKE, R_SWEND); this._objs[SNAKE].prop = -2;
        this._move(BIRD, R_SWEND); this._objs[BIRD].prop = -2;
        this._move(CAGE, R_SWEND); this._objs[CAGE].prop = -1;
        this._move(ROD2, R_SWEND); this._objs[ROD2].prop = -1;
        this._move(PILLOW, R_SWEND); this._objs[PILLOW].prop = -1;
        this._move(MIRROR_, R_SWEND);
        this._objs[WATER].place = R_LIMBO;
        this._objs[OIL].place = R_LIMBO;
        for (let j = MIN_OBJ; j <= MAX_OBJ; ++j) {
            if (this._toting(j)) this._destroy(j);
        }
        this._closed = true;
        this._bonus = 10;
    }

    _checkClocksAndLamp(loc) {
        if (this._tally === 0 && loc >= MIN_LOWER_LOC && loc !== R_Y2)
            --this._clock1;
        if (this._clock1 === 0) {
            this._puts("A sepulchral voice, reverberating through the cave, says \"Cave\n" +
                "closing soon.  All adventurers exit immediately through main office.\"");
            this._clock1 = -1;
            this._objs[GRATE].prop = 0;
            this._objs[FISSURE].prop = 0;
            for (let j = 0; j <= 5; ++j) {
                this._dwarves[j].seen = false;
                this._dwarves[j].loc = R_LIMBO;
            }
            this._destroy(TROLL); this._destroy(TROLL_);
            this._move(NO_TROLL, R_SWSIDE); this._move(NO_TROLL_, R_NESIDE);
            this._juggle(CHASM); this._juggle(CHASM_);
            if (this._objs[BEAR].prop !== 3) this._destroy(BEAR);
            this._objs[CHAIN].prop = 0; this._mobilize(CHAIN);
            this._objs[AXE].prop = 0; this._mobilize(AXE);
        } else {
            if (this._caveIsClosing()) --this._clock2;
            if (this._clock2 === 0) {
                this._closeTheCave();
                return true;
            } else {
                if (this._objs[LAMP].prop === 1) --this._lamp_limit;
                if (this._lamp_limit <= 30 && this._here(LAMP, loc) && this._here(BATTERIES, loc) && this._objs[BATTERIES].prop === 0) {
                    this._puts("Your lamp is getting dim.  I'm taking the liberty of replacing\n" +
                        "the batteries.");
                    this._objs[BATTERIES].prop = 1;
                    if (this._toting(BATTERIES)) this._drop(BATTERIES, loc);
                    this._lamp_limit = 2500;
                } else if (this._lamp_limit === 0) {
                    if (this._here(LAMP, loc)) this._puts("Your lamp has run out of power.");
                    this._objs[LAMP].prop = 0;
                    this._lamp_limit = -1;
                } else if (this._lamp_limit < 0 && loc < MIN_IN_CAVE) {
                    this._puts("There's not much point in wandering around out here, and you can't\n" +
                        "explore the cave without a lamp.  So let's just call it a day.");
                    this._giveUp();
                } else if (this._lamp_limit < 30 && !this._warned && this._here(LAMP, loc)) {
                    let msg = "Your lamp is getting dim";
                    if (this._objs[BATTERIES].prop === 1) {
                        msg += ", and you're out of spare batteries.  You'd\n" +
                            "best start wrapping this up.";
                    } else if (this._there(BATTERIES, R_LIMBO)) {
                        msg += ".  You'd best start wrapping this up, unless\n" +
                            "you can find some fresh batteries.  I seem to recall that there's\n" +
                            "a vending machine in the maze.  Bring some coins with you.";
                    } else {
                        msg += ".  You'd best go back for those batteries.";
                    }
                    this._puts(msg);
                    this._warned = true;
                }
            }
        }
        return false;
    }

    _panicAtClosingTime() {
        if (!this._panic) {
            this._clock2 = 15;
            this._panic = true;
        }
        this._puts("A mysterious recorded voice groans into life and announces:\n" +
            "   \"This exit is closed.  Please leave via main office.\"");
    }

    // ========== Print functions ==========
    _printRemark(which) {
        const remarks = [
            "You don't fit through a two-inch slit!",
            "You can't go through a locked steel grate!",
            "I respectfully suggest you go across the bridge instead of jumping.",
            "There is no way across the fissure.",
            "You can't fit this five-foot clam through that little passage!",
            "You can't fit this five-foot oyster through that little passage!",
            "You have crawled around in some little holes and wound up back in the\nmain passage.",
            "You have crawled around in some little holes and found your way\nblocked by a recent cave-in.  You are now back in the main passage.",
            "It is too far up for you to reach.",
            "The door is extremely rusty and refuses to open.",
            "The dragon looks rather nasty.  You'd best not try to get by.",
            "The troll refuses to let you cross.",
            "There is no longer any way across the chasm.",
            "Don't be ridiculous!",
            "The crack is far too small for you to follow.",
            "The dome is unclimbable.",
            "You can't get by the snake.",
            "The stream flows out through a pair of 1-foot-diameter sewer pipes.\nIt would be advisable to use the exit."
        ];
        this._puts(remarks[which]);
    }

    _printMessage(msg) {
        const messages = {
            [ABRA]: "Good try, but that is an old worn-out magic word.",
            [HELP]: "I know of places, actions, and things. Most of my vocabulary\n" +
                "describes places and is used to move you there. To move, try words\n" +
                "like forest, building, downstream, enter, east, west, north, south,\n" +
                "up, or down. I know about a few special objects, like a black rod\n" +
                "hidden in the cave. These objects can be manipulated using some of\n" +
                "the action words that I know. Usually you will need to give both the\n" +
                "object and action words (in either order), but sometimes I can infer\n" +
                "the object from the verb alone. Some objects also imply verbs; in\n" +
                "particular, \"inventory\" implies \"take inventory\", which causes me to\n" +
                "give you a list of what you're carrying. The objects have side\n" +
                "effects; for instance, the rod scares the bird. Usually people having\n" +
                "trouble moving just need to try a few more words. Usually people\n" +
                "trying unsuccessfully to manipulate an object are attempting something\n" +
                "beyond their (or my!) capabilities and should try a completely\n" +
                "different tack. To speed the game you can sometimes move long\n" +
                "distances with a single word. For example, \"building\" usually gets\n" +
                "you to the building from anywhere above ground except when lost in the\n" +
                "forest. Also, note that cave passages turn a lot, and that leaving a\n" +
                "room to the north does not guarantee entering the next from the south.\n" +
                "Good luck!",
            [TREES]: "The trees of the forest are large hardwood oak and maple, with an\n" +
                "occasional grove of pine or spruce.  There is quite a bit of under-\n" +
                "growth, largely birch and ash saplings plus nondescript bushes of\n" +
                "various sorts.  This time of year visibility is quite restricted by\n" +
                "all the leaves, but travel is quite easy if you detour around the\n" +
                "spruce and berry bushes.",
            [DIG]: "Digging without a shovel is quite impractical.  Even with a shovel\nprogress is unlikely.",
            [LOST]: "I'm as confused as you are.",
            [MIST]: "Mist is a white vapor, usually water, seen from time to time in\n" +
                "caverns.  It can be found anywhere but is frequently a sign of a deep\n" +
                "pit leading down to water.",
            [FUCK]: "Watch it!",
            [STOP]: "I don't know the word \"stop\".  Use \"quit\" if you want to give up.",
            [INFO]: "If you want to end your adventure early, say \"quit\". To get full\n" +
                "credit for a treasure, you must have left it safely in the building,\n" +
                "though you get partial credit just for locating it. You lose points\n" +
                "for getting killed, or for quitting, though the former costs you more.\n" +
                "There are also points based on how much (if any) of the cave you've\n" +
                "managed to explore; in particular, there is a large bonus just for\n" +
                "getting in (to distinguish the beginners from the rest of the pack),\n" +
                "and there are other ways to determine whether you've been through some\n" +
                "of the more harrowing sections. If you think you've found all the\n" +
                "treasures, just keep exploring for a while. If nothing interesting\n" +
                "happens, you haven't found them all yet. If something interesting\n" +
                "DOES happen, it means you're getting a bonus and have an opportunity\n" +
                "to garner many more points in the master's section.\n" +
                "I may occasionally offer hints if you seem to be having trouble.\n" +
                "If I do, I'll warn you in advance how much it will affect your score\n" +
                "to accept the hints. Finally, to save paper, you may specify \"brief\",\n" +
                "which tells me never to repeat the full description of a place\n" +
                "unless you explicitly ask me to.",
            [SWIM]: "I don't know how."
        };
        this._puts(messages[msg]);
    }

    // ========== Main loop ==========
    async run(inputFn, outputFn) {
        this._input = inputFn;
        this._output = outputFn;
        this._printBuf = '';
        this._lineBuf = '';
        _resetRng(this._seedOverride ?? 1); // deterministic: match C's default seed

        // Initialize everything
        this._buildVocabulary();
        this._buildTravelTable();
        this._buildObjectTable();
        this._initHints();
        this._initDwarves();

        this._holding_count = 0;
        this._turns = 0;
        this._verbose_interval = 5;
        this._foobar = 0;
        this._clock1 = 15;
        this._clock2 = 30;
        this._closed = false;
        this._bonus = 0;
        this._lamp_limit = 0;
        this._death_count = 0;
        this._gave_up = false;
        this._warned = false;
        this._panic = false;
        this._west_count = 0;
        this._first_kill = true;
        this._have_tried_to_get_knife = false;
        this._gameOver = false;

        // Offer instructions (hint 0)
        await this._offer(0);
        this._lamp_limit = this._hints[0].given ? 1000 : 330;

        await this._simulate();
    }

    async _simulate() {
        let oldoldloc, oldloc, loc, newloc;
        let mot = NOWHERE;
        let verb = NOTHING, oldverb;
        let obj = NOTHING, oldobj;
        let was_dark = false;
        let look_count = 0;

        oldoldloc = oldloc = loc = newloc = R_ROAD;

        // The main loop uses a state machine to handle C gotos
        let state = 'top_of_loop';

        while (!this._gameOver) {
            switch (state) {
                case 'top_of_loop': {
                    // Check for interference with the proposed move to newloc
                    if (this._caveIsClosing() && newloc < MIN_IN_CAVE && newloc !== R_LIMBO) {
                        this._panicAtClosingTime();
                        newloc = loc;
                    } else if (newloc !== loc && !this._forbiddenToPirate(loc)) {
                        for (let j = 1; j <= 5; ++j) {
                            if (this._dwarves[j].seen && this._dwarves[j].oldloc === newloc) {
                                this._puts("A little dwarf with a big knife blocks your way.");
                                newloc = loc;
                                break;
                            }
                        }
                    }
                    loc = newloc;
                    if (this._moveDwarvesAndPirate(loc)) {
                        oldoldloc = loc;
                        state = 'death';
                        continue;
                    }
                    state = 'commence';
                    continue;
                }
                case 'commence': {
                    if (loc === R_LIMBO) { state = 'death'; continue; }
                    const result = this._lookAround(loc, this._nowInDarkness(loc), was_dark);
                    if (result === 'p') { state = 'pitch_dark'; continue; }
                    if (result === 't') { state = 'try_move'; continue; }
                    state = 'inner_loop_start';
                    continue;
                }
                case 'inner_loop_start': {
                    verb = oldverb = NOTHING;
                    oldobj = obj;
                    obj = NOTHING;
                    state = 'cycle';
                    continue;
                }
                case 'cycle': {
                    await this._maybeGiveAHint(loc, oldloc, oldoldloc, oldobj);
                    was_dark = this._nowInDarkness(loc);
                    this._adjustmentsBeforeListening(loc);
                    await this._listen();
                    if (this._gameOver) return;
                    state = 'pre_parse';
                    continue;
                }
                case 'pre_parse': {
                    ++this._turns;
                    if (verb === SAY) {
                        if (this._word2 !== '') {
                            verb = NOTHING;
                        } else {
                            state = 'transitive';
                            continue;
                        }
                    }
                    this._foobar = (this._foobar > 0) ? -this._foobar : 0;
                    if (this._checkClocksAndLamp(loc)) {
                        if (this._gameOver) return;
                        loc = oldloc = R_NEEND;
                        mot = NOWHERE;
                        state = 'try_move';
                        continue;
                    }
                    if (this._gameOver) return;

                    // Handle special cases
                    if (streq(this._word1, "enter")) {
                        if (streq(this._word2, "water") || streq(this._word2, "strea")) {
                            if (this._hasWater(loc)) {
                                this._puts("Your feet are now wet.");
                            } else {
                                this._puts("Where?");
                            }
                            state = 'inner_loop_start';
                            continue;
                        } else if (this._word2 !== '') {
                            this._shiftWords();
                            state = 'parse';
                            continue;
                        }
                    }
                    if (streq(this._word1, "water") || streq(this._word1, "oil")) {
                        if (streq(this._word2, "plant") && this._there(PLANT, loc))
                            this._word2 = "pour";
                        if (streq(this._word2, "door") && this._there(RUSTY_DOOR, loc))
                            this._word2 = "pour";
                    }
                    state = 'parse';
                    continue;
                }
                case 'parse': {
                    this._adviseAboutGoingWest(this._word1);
                    const k = this._lookup(this._word1);
                    switch (word_class(k)) {
                        case WordClass_None:
                            this._puts(`Sorry, I don't know the word "${this._word1}".`);
                            state = 'cycle';
                            continue;
                        case WordClass_Motion:
                            mot = k;
                            state = 'try_move';
                            continue;
                        case WordClass_Object: {
                            obj = k;
                            const validity = this._checkNounValidity(obj, loc);
                            if (validity === 'c') { state = 'cant_see_it'; continue; }
                            if (validity === 'd') { mot = DEPRESSION; state = 'try_move'; continue; }
                            if (validity === 'e') { mot = ENTRANCE; state = 'try_move'; continue; }
                            if (validity === 'f') { state = 'inner_loop_start'; continue; }
                            if (validity === 'p') obj = PLANT2;
                            if (validity === 'r') obj = ROD2;
                            if (this._word2 !== '') { state = 'shift_and_parse'; continue; }
                            if (verb !== NOTHING) { state = 'transitive'; continue; }
                            this._puts(`What do you want to do with the ${this._word1}?`);
                            state = 'cycle';
                            continue;
                        }
                        case WordClass_Action:
                            verb = k;
                            if (verb === SAY) {
                                if (this._word2 === '') { state = 'intransitive'; continue; }
                                state = 'transitive';
                                continue;
                            }
                            if (this._word2 !== '') { state = 'shift_and_parse'; continue; }
                            if (obj !== NOTHING) { state = 'transitive'; continue; }
                            state = 'intransitive';
                            continue;
                        case WordClass_Message:
                            this._printMessage(k);
                            state = 'inner_loop_start';
                            continue;
                    }
                    continue;
                }
                case 'shift_and_parse': {
                    this._shiftWords();
                    state = 'parse';
                    continue;
                }
                case 'intransitive': {
                    switch (verb) {
                        case GO:
                            this._puts("Where?");
                            state = 'inner_loop_start'; continue;
                        case RELAX:
                            this._puts(ok);
                            state = 'inner_loop_start'; continue;
                        case ON: case OFF: case POUR: case FILL: case DRINK: case BLAST: case KILL:
                            state = 'transitive'; continue;
                        case TAKE: {
                            const object_here = this._places[loc].objects;
                            if (this._dwarfAt(loc)) { state = 'get_object'; continue; }
                            if (object_here !== NOTHING && this._objs[object_here].link === NOTHING) {
                                obj = object_here;
                                state = 'transitive'; continue;
                            }
                            state = 'get_object'; continue;
                        }
                        case EAT:
                            if (!this._here(FOOD, loc)) { state = 'get_object'; continue; }
                            obj = FOOD;
                            state = 'transitive'; continue;
                        case OPEN: case CLOSE: {
                            if (this._isAtLoc(GRATE, loc)) obj = GRATE;
                            else if (this._there(RUSTY_DOOR, loc)) obj = RUSTY_DOOR;
                            else if (this._here(CLAM, loc)) obj = CLAM;
                            else if (this._here(OYSTER, loc)) obj = OYSTER;
                            if (this._here(CHAIN, loc)) {
                                if (obj) { state = 'get_object'; continue; }
                                obj = CHAIN;
                            }
                            if (obj) { state = 'transitive'; continue; }
                            this._puts("There is nothing here with a lock!");
                            state = 'inner_loop_start'; continue;
                        }
                        case READ:
                            obj = this._readWhat(loc);
                            if (obj !== NOTHING) { state = 'transitive'; continue; }
                            state = 'get_object'; continue;
                        case INVENTORY:
                            this._attemptInventory();
                            state = 'inner_loop_start'; continue;
                        case BRIEF:
                            this._verbose_interval = 10000;
                            look_count = 3;
                            this._puts("Okay, from now on I'll only describe a place in full the first time\n" +
                                "you come to it.  To get the full description, say \"LOOK\".");
                            state = 'inner_loop_start'; continue;
                        case SCORE:
                            await this._sayScore();
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case QUIT:
                            if (await this._yes("Do you really want to quit now?", ok, ok)) this._giveUp();
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case SAVE:
                            this._puts("Use getSaveState()/setSaveState() for save/restore.");
                            state = 'inner_loop_start'; continue;
                        case RESTORE:
                            this._puts("Use getSaveState()/setSaveState() for save/restore.");
                            state = 'inner_loop_start'; continue;
                        case FEEFIE: {
                            const incantation = ["fee", "fie", "foe", "foo", "fum"];
                            let k = 0;
                            while (!streq(this._word1, incantation[k])) ++k;
                            if (this._foobar === -k) {
                                this._foobar = k + 1;
                                if (this._foobar !== 4) {
                                    this._puts(ok);
                                    state = 'inner_loop_start'; continue;
                                }
                                this._foobar = 0;
                                if (this._there(EGGS, R_GIANT) || (this._toting(EGGS) && loc === R_GIANT)) {
                                    this._puts("Nothing happens.");
                                    state = 'inner_loop_start'; continue;
                                }
                                if (this._there(EGGS, R_LIMBO) && this._there(TROLL, R_LIMBO) && this._objs[TROLL].prop === 0)
                                    this._objs[TROLL].prop = 1;
                                if (loc === R_GIANT) {
                                    this._puts("There is a large nest here, full of golden eggs!");
                                } else if (this._here(EGGS, loc)) {
                                    this._puts("The nest of golden eggs has vanished!");
                                } else {
                                    this._puts("Done!");
                                }
                                this._move(EGGS, R_GIANT);
                                state = 'inner_loop_start'; continue;
                            } else if (this._foobar === 0) {
                                this._puts("Nothing happens.");
                            } else {
                                this._puts("What's the matter, can't you read?  Now you'd best start over.");
                            }
                            state = 'inner_loop_start'; continue;
                        }
                        default:
                            state = 'get_object'; continue;
                    }
                }
                case 'transitive': {
                    switch (verb) {
                        case SAY: {
                            if (this._word2 !== '') this._word1 = this._word2;
                            const k = this._lookup(this._word1);
                            switch (k) {
                                case XYZZY: case PLUGH: case PLOVER:
                                    mot = k; state = 'try_move'; continue;
                                case FEEFIE:
                                    verb = k; state = 'intransitive'; continue;
                                default:
                                    this._puts(`Okay, "${this._word1}".`);
                                    state = 'inner_loop_start'; continue;
                            }
                        }
                        case EAT:
                            this._attemptEat(obj);
                            state = 'inner_loop_start'; continue;
                        case WAVE:
                            this._attemptWave(obj, loc);
                            state = 'inner_loop_start'; continue;
                        case BLAST:
                            this._attemptBlast(loc);
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case RUB:
                            this._attemptRub(obj);
                            state = 'inner_loop_start'; continue;
                        case FIND: case INVENTORY:
                            this._attemptFind(obj, loc);
                            state = 'inner_loop_start'; continue;
                        case BREAK:
                            this._attemptBreak(obj, loc);
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case WAKE:
                            this._attemptWake(obj);
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case ON:
                            if (!this._here(LAMP, loc)) {
                                this._puts("You have no source of light.");
                                state = 'inner_loop_start'; continue;
                            }
                            if (this._lamp_limit < 0) {
                                this._puts("Your lamp has run out of power.");
                                state = 'inner_loop_start'; continue;
                            }
                            this._objs[LAMP].prop = 1;
                            this._puts("Your lamp is now on.");
                            if (was_dark) { state = 'commence'; continue; }
                            state = 'inner_loop_start'; continue;
                        case OFF:
                            this._attemptOff(loc);
                            state = 'inner_loop_start'; continue;
                        case DRINK: {
                            const stream_here = this._hasWater(loc);
                            const evian_here = this._here(BOTTLE, loc) && (this._bottleContents() === WATER);
                            if (obj === NOTHING) {
                                if (!stream_here && !evian_here) { state = 'get_object'; continue; }
                            } else if (obj !== WATER) {
                                this._puts("Don't be ridiculous!");
                                state = 'inner_loop_start'; continue;
                            }
                            if (evian_here) {
                                this._objs[BOTTLE].prop = 1;
                                this._objs[WATER].place = R_LIMBO;
                                this._puts("The bottle of water is now empty.");
                            } else {
                                this._puts("You have taken a drink from the stream.  The water tastes strongly of\n" +
                                    "minerals, but is not unpleasant.  It is extremely cold.");
                            }
                            state = 'inner_loop_start'; continue;
                        }
                        case POUR: {
                            if (obj === NOTHING || obj === BOTTLE) {
                                obj = this._bottleContents();
                                if (obj === NOTHING) { state = 'get_object'; continue; }
                            }
                            if (this._toting(obj)) {
                                if (obj !== WATER && obj !== OIL) {
                                    this._puts("You can't pour that.");
                                    state = 'inner_loop_start'; continue;
                                }
                                this._objs[BOTTLE].prop = 1;
                                this._objs[obj].place = R_LIMBO;
                                if (this._there(PLANT, loc)) {
                                    if (obj !== WATER) {
                                        this._puts("The plant indignantly shakes the oil off its leaves and asks, \"Water?\"");
                                        state = 'inner_loop_start'; continue;
                                    }
                                    if (this._objs[PLANT].prop === 0) {
                                        this._puts("The plant spurts into furious growth for a few seconds.");
                                        this._objs[PLANT].prop = 1;
                                    } else if (this._objs[PLANT].prop === 1) {
                                        this._puts("The plant grows explosively, almost filling the bottom of the pit.");
                                        this._objs[PLANT].prop = 2;
                                    } else if (this._objs[PLANT].prop === 2) {
                                        this._puts("You've over-watered the plant! It's shriveling up! It's, it's...");
                                        this._objs[PLANT].prop = 0;
                                    }
                                    this._objs[PLANT2].prop = this._objs[PLANT].prop;
                                    mot = NOWHERE;
                                    state = 'try_move'; continue;
                                } else if (this._there(RUSTY_DOOR, loc)) {
                                    if (obj === WATER) {
                                        this._objs[RUSTY_DOOR].prop = 0;
                                        this._puts("The hinges are quite thoroughly rusted now and won't budge.");
                                    } else {
                                        this._objs[RUSTY_DOOR].prop = 1;
                                        this._puts("The oil has freed up the hinges so that the door will now open.");
                                    }
                                } else {
                                    this._puts("Your bottle is empty and the ground is wet.");
                                }
                            } else {
                                this._puts("You aren't carrying it!");
                            }
                            state = 'inner_loop_start'; continue;
                        }
                        case FILL:
                            if (this._attemptFill(obj, loc)) { state = 'get_object'; continue; }
                            state = 'inner_loop_start'; continue;
                        case TAKE:
                            if (this._attemptTake(obj, loc)) {
                                oldverb = TAKE; verb = FILL; obj = BOTTLE;
                                state = 'transitive'; continue;
                            }
                            state = 'inner_loop_start'; continue;
                        case DROP:
                            this._attemptDrop(obj, loc);
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case TOSS: {
                            if (obj === ROD && this._toting(ROD2) && !this._toting(ROD)) obj = ROD2;
                            if (!this._toting(obj)) {
                                this._puts("You aren't carrying it!");
                                state = 'inner_loop_start'; continue;
                            }
                            if (this._isTreasure(obj) && this._isAtLoc(TROLL, loc)) {
                                this._drop(obj, R_LIMBO);
                                this._destroy(TROLL); this._destroy(TROLL_);
                                this._drop(NO_TROLL, R_SWSIDE); this._drop(NO_TROLL_, R_NESIDE);
                                this._juggle(CHASM); this._juggle(CHASM_);
                                this._puts("The troll catches your treasure and scurries away out of sight.");
                                state = 'inner_loop_start'; continue;
                            }
                            if (obj === FOOD && this._here(BEAR, loc)) {
                                oldverb = TOSS; verb = FEED; obj = BEAR;
                                state = 'transitive'; continue;
                            }
                            if (obj !== AXE) {
                                oldverb = TOSS; verb = DROP;
                                state = 'transitive'; continue;
                            }
                            if (this._dwarfAt(loc)) {
                                this._throwAxeAtDwarf(loc);
                            } else if (this._isAtLoc(DRAGON, loc) && !this._objs[DRAGON].prop) {
                                this._puts("The axe bounces harmlessly off the dragon's thick scales.");
                            } else if (this._isAtLoc(TROLL, loc)) {
                                this._puts("The troll deftly catches the axe, examines it carefully, and tosses it\n" +
                                    "back, declaring, \"Good workmanship, but it's not valuable enough.\"");
                            } else if (this._here(BEAR, loc) && this._objs[BEAR].prop === 0) {
                                this._drop(AXE, loc);
                                this._objs[AXE].prop = 1;
                                this._immobilize(AXE);
                                this._juggle(BEAR);
                                this._puts("The axe misses and lands near the bear where you can't get at it.");
                                state = 'inner_loop_start'; continue;
                            } else {
                                obj = NOTHING; oldverb = TOSS; verb = KILL;
                                state = 'transitive'; continue;
                            }
                            this._drop(AXE, loc);
                            mot = NOWHERE;
                            state = 'try_move'; continue;
                        }
                        case KILL: {
                            if (obj === NOTHING) {
                                let k = 0;
                                if (this._dwarfAt(loc)) { ++k; obj = DWARF; }
                                if (this._here(SNAKE, loc)) { ++k; obj = SNAKE; }
                                if (this._isAtLoc(DRAGON, loc) && !this._objs[DRAGON].prop) { ++k; obj = DRAGON; }
                                if (this._isAtLoc(TROLL, loc)) { ++k; obj = TROLL; }
                                if (this._here(BEAR, loc) && !this._objs[BEAR].prop) { ++k; obj = BEAR; }
                                if (k === 0) {
                                    if (this._here(BIRD, loc) && oldverb !== TOSS) { ++k; obj = BIRD; }
                                    if (this._here(CLAM, loc) || this._here(OYSTER, loc)) { ++k; obj = CLAM; }
                                }
                                if (k > 1) { state = 'get_object'; continue; }
                            }
                            switch (obj) {
                                case NOTHING:
                                    this._puts("There is nothing here to attack.");
                                    state = 'inner_loop_start'; continue;
                                case BIRD:
                                    if (this._closed) {
                                        this._puts("Oh, leave the poor unhappy bird alone.");
                                    } else {
                                        this._destroy(BIRD);
                                        this._objs[BIRD].prop = 0;
                                        if (this._there(SNAKE, R_HMK)) ++this._lost_treasures;
                                        this._puts("The little bird is now dead.  Its body disappears.");
                                        state = 'inner_loop_start'; continue;
                                    }
                                    // fall through in C after closed bird
                                case DRAGON:
                                    if (obj === DRAGON || obj === BIRD) {
                                        // Handle dragon case
                                        if (obj === DRAGON) {
                                            if (this._objs[DRAGON].prop) {
                                                this._puts("For crying out loud, the poor thing is already dead!");
                                                state = 'inner_loop_start'; continue;
                                            }
                                            this._puts("With what?  Your bare hands?");
                                            verb = NOTHING; obj = NOTHING;
                                            await this._listen();
                                            if (this._gameOver) return;
                                            if (streq(this._word1, "yes") || streq(this._word1, "y")) {
                                                this._puts("Congratulations!  You have just vanquished a dragon with your bare\nhands! (Unbelievable, isn't it?)");
                                                this._objs[DRAGON].prop = 1;
                                                this._objs[RUG].prop = 0;
                                                this._mobilize(RUG);
                                                this._destroy(DRAGON_);
                                                this._destroy(RUG_);
                                                for (let t = MIN_OBJ; t <= MAX_OBJ; ++t) {
                                                    if (this._there(t, R_SCAN1) || this._there(t, R_SCAN3))
                                                        this._move(t, R_SCAN2);
                                                }
                                                loc = R_SCAN2;
                                                mot = NOWHERE;
                                                state = 'try_move'; continue;
                                            } else {
                                                state = 'pre_parse'; continue;
                                            }
                                        }
                                    }
                                    state = 'inner_loop_start'; continue;
                                case CLAM: case OYSTER:
                                    this._puts("The shell is very strong and impervious to attack.");
                                    state = 'inner_loop_start'; continue;
                                case SNAKE:
                                    this._puts("Attacking the snake both doesn't work and is very dangerous.");
                                    state = 'inner_loop_start'; continue;
                                case DWARF:
                                    if (this._closed) { this._dwarvesUpset(); return; }
                                    this._puts("With what?  Your bare hands?");
                                    state = 'inner_loop_start'; continue;
                                case TROLL:
                                    this._puts("Trolls are close relatives with the rocks and have skin as tough as\na rhinoceros hide.  The troll fends off your blows effortlessly.");
                                    state = 'inner_loop_start'; continue;
                                case BEAR:
                                    switch (this._objs[BEAR].prop) {
                                        case 0: this._puts("With what?  Your bare hands?  Against *HIS* bear hands??"); break;
                                        case 3: this._puts("For crying out loud, the poor thing is already dead!"); break;
                                        default: this._puts("The bear is confused; he only wants to be your friend."); break;
                                    }
                                    state = 'inner_loop_start'; continue;
                                default:
                                    this._puts("Don't be ridiculous!");
                                    state = 'inner_loop_start'; continue;
                            }
                        }
                        case FEED:
                            this._attemptFeed(obj, loc);
                            state = 'inner_loop_start'; continue;
                        case OPEN: case CLOSE:
                            this._attemptOpenOrClose(verb, obj, loc);
                            if (this._gameOver) return;
                            state = 'inner_loop_start'; continue;
                        case READ:
                            if (this._nowInDarkness(loc)) { state = 'cant_see_it'; continue; }
                            this._attemptRead(obj);
                            state = 'inner_loop_start'; continue;
                        case CALM:
                            this._puts("I'm game. Would you care to explain how?");
                            state = 'inner_loop_start'; continue;
                        case GO:
                            this._puts("Where?");
                            state = 'inner_loop_start'; continue;
                        case RELAX:
                            this._puts(ok);
                            state = 'inner_loop_start'; continue;
                        case FEEFIE:
                            this._puts("I don't know how.");
                            state = 'inner_loop_start'; continue;
                        case BRIEF:
                            this._puts("On what?");
                            state = 'inner_loop_start'; continue;
                        case SCORE: case QUIT: case SAVE: case RESTORE:
                            this._puts("Eh?");
                            state = 'inner_loop_start'; continue;
                        default:
                            state = 'get_object'; continue;
                    }
                }
                case 'get_object': {
                    this._puts(`${this._word1.charAt(0).toUpperCase() + this._word1.slice(1)} what?`);
                    state = 'cycle';
                    continue;
                }
                case 'cant_see_it': {
                    if ((verb === FIND || verb === INVENTORY) && this._word2 !== '') {
                        state = 'transitive'; continue;
                    }
                    this._puts(`I see no ${this._word1} here.`);
                    state = 'inner_loop_start';
                    continue;
                }
                case 'try_move': {
                    newloc = loc;
                    if (mot === CAVE) {
                        if (loc < MIN_IN_CAVE) {
                            this._puts("I can't see where the cave is, but hereabouts no stream can run on\n" +
                                "the surface for long. I would try the stream.");
                        } else {
                            this._puts("I need more detailed instructions to do that.");
                        }
                    } else if (mot === LOOK) {
                        if (++look_count <= 3) {
                            this._puts("Sorry, but I am not allowed to give more detail.  I will repeat the\n" +
                                "long description of your location.");
                        }
                        was_dark = false;
                        this._places[loc].visits = 0;
                    } else {
                        if (mot === BACK) {
                            const l = this._isForced(oldloc) ? oldoldloc : oldloc;
                            mot = this._tryGoingBackTo(l, loc);
                        }
                        if (mot !== NOWHERE) {
                            oldoldloc = oldloc;
                            oldloc = loc;
                            if (this._determineNextNewloc(loc, mot, verb)) {
                                newloc = this._newlocResult;
                                oldoldloc = newloc;
                                state = 'death'; continue;
                            }
                            newloc = this._newlocResult;
                        }
                    }
                    state = 'top_of_loop';
                    continue;
                }
                case 'pitch_dark': {
                    this._puts("You fell into a pit and broke every bone in your body!");
                    oldoldloc = loc;
                    state = 'death';
                    continue;
                }
                case 'death': {
                    await this._killThePlayer(oldoldloc);
                    if (this._gameOver) return;
                    loc = oldloc = R_HOUSE;
                    state = 'commence';
                    continue;
                }
            }
        }
    }

    // ========== Helper methods used by main loop ==========

    _lookAround(loc, dark, was_dark) {
        let room_description;
        if (dark && !this._isForced(loc)) {
            if (was_dark && pct(35)) return 'p';
            room_description = pitch_dark_msg;
        } else if (this._places[loc].short_desc === null || this._places[loc].visits % this._verbose_interval === 0) {
            room_description = this._places[loc].long_desc;
        } else {
            room_description = this._places[loc].short_desc;
        }
        if (this._toting(BEAR)) {
            this._puts("You are being followed by a very large, tame bear.");
        }
        if (room_description !== null) {
            this._puts("\n" + room_description);
        }
        if (this._isForced(loc)) return 't';
        this._giveOptionalPlughHint(loc);
        if (!dark) {
            this._places[loc].visits += 1;
            for (let t = this._places[loc].objects; t !== NOTHING; t = this._objs[t].link) {
                let tt = this._objs[t].base ? this._objs[t].base : t;
                if (this._closed && this._objs[tt].prop < 0) continue;
                this._spotTreasure(tt);
                this._describeObject(tt, loc);
            }
        }
        return 0;
    }

    _giveOptionalPlughHint(loc) {
        if (loc === R_Y2 && pct(25) && !this._caveIsClosing()) {
            this._puts("A hollow voice says \"PLUGH\".");
        }
    }

    _spotTreasure(t) {
        if (this._objs[t].prop >= 0) return;
        switch (t) {
            case RUG: case CHAIN:
                this._objs[t].prop = 1; break;
            default:
                this._objs[t].prop = 0; break;
        }
        this._tally--;
        if (this._tally === this._lost_treasures && this._tally > 0 && this._lamp_limit > 35) {
            this._lamp_limit = 35;
        }
    }

    _describeObject(t, loc) {
        if (t === TREADS && this._toting(GOLD)) return;
        const going_up = (t === TREADS && loc === R_EMIST) ? 1 : 0;
        const desc = this._objs[t].desc[this._objs[t].prop + going_up];
        if (desc !== null && desc !== undefined) {
            this._puts(desc);
        }
    }

    _adjustmentsBeforeListening(loc) {
        if (this._last_knife_loc !== loc) {
            this._last_knife_loc = R_LIMBO;
        }
        if (this._closed) {
            if (this._objs[OYSTER].prop < 0 && this._toting(OYSTER)) {
                this._puts("Interesting. There seems to be something written on the underside of\n" +
                    "the oyster.");
            }
            for (let j = MIN_OBJ; j <= MAX_OBJ; ++j) {
                if (this._toting(j) && this._objs[j].prop < 0)
                    this._objs[j].prop = -1 - this._objs[j].prop;
            }
        }
    }

    _adviseAboutGoingWest(word1) {
        if (streq(word1, "west")) {
            ++this._west_count;
            if (this._west_count === 10) {
                this._puts(" If you prefer, simply type W rather than WEST.");
            }
        }
    }

    _checkNounValidity(obj, loc) {
        if (this._toting(obj) || this._isAtLoc(obj, loc)) return 0;
        switch (obj) {
            case GRATE:
                if (loc < MIN_LOWER_LOC) {
                    switch (loc) {
                        case R_ROAD: case R_VALLEY: case R_SLIT:
                            return 'd';
                        case R_COBBLES: case R_DEBRIS: case R_AWK: case R_BIRD: case R_SPIT:
                            return 'e';
                    }
                }
                return 'c';
            case DWARF:
                if (this._dflag >= 2 && this._dwarfAt(loc)) return 0;
                return 'c';
            case PLANT:
                if (this._isAtLoc(PLANT2, loc) && this._objs[PLANT2].prop !== 0) return 'p';
                return 'c';
            case KNIFE:
                if (this._have_tried_to_get_knife || loc !== this._last_knife_loc) return 'c';
                this._puts("The dwarves' knives vanish as they strike the walls of the cave.");
                this._have_tried_to_get_knife = true;
                return 'f';
            case ROD:
                if (!this._here(ROD2, loc)) return 'c';
                return 'r';
            case WATER:
                if (this._hasWater(loc)) return 0;
                if (this._here(BOTTLE, loc) && this._bottleContents() === WATER) return 0;
                return 'c';
            case OIL:
                if (this._hasOil(loc)) return 0;
                if (this._here(BOTTLE, loc) && this._bottleContents() === OIL) return 0;
                return 'c';
        }
        return 'c';
    }

    _readWhat(loc) {
        if (this._nowInDarkness(loc)) return NOTHING;
        if (this._closed && this._toting(OYSTER)) return OYSTER;
        const magazines_here = this._here(MAG, loc);
        if (this._here(TABLET, loc)) return magazines_here ? NOTHING : TABLET;
        if (this._here(MESSAGE, loc)) return magazines_here ? NOTHING : MESSAGE;
        return magazines_here ? MAG : NOTHING;
    }

    _attemptInventory() {
        let holding_anything = false;
        for (let t = MIN_OBJ; t <= MAX_OBJ; ++t) {
            if (this._toting(t) && t !== BEAR) {
                if (!holding_anything) {
                    holding_anything = true;
                    this._puts("You are currently holding the following:");
                }
                this._puts(` ${this._objs[t].name}`);
            }
        }
        if (this._toting(BEAR)) {
            this._puts("You are being followed by a very large, tame bear.");
        } else if (!holding_anything) {
            this._puts("You're not carrying anything.");
        }
    }

    _attemptEat(obj) {
        switch (obj) {
            case FOOD:
                this._destroy(FOOD);
                this._puts("Thank you, it was delicious!");
                break;
            case BIRD: case SNAKE: case CLAM: case OYSTER:
            case DWARF: case DRAGON: case TROLL: case BEAR:
                this._puts("I think I just lost my appetite.");
                break;
            default:
                this._puts("Don't be ridiculous!");
                break;
        }
    }

    _attemptTake(obj, loc) {
        if (this._toting(obj)) {
            this._puts("You are already carrying it!");
            return false;
        } else if (this._isImmobile(obj)) {
            this._takeSomethingImmobile(obj);
            return false;
        } else if (obj !== NOTHING && this._here(BOTTLE, loc) && obj === this._bottleContents()) {
            obj = BOTTLE;
        } else if (obj === WATER || obj === OIL) {
            if (this._toting(BOTTLE)) return true; // redirect to FILL
            this._puts("You have nothing in which to carry it.");
            return false;
        }
        if (this._holding_count >= 7) {
            this._puts("You can't carry anything more.  You'll have to drop something first.");
        } else if (this._takeBirdOrCage(obj)) {
            // uncatchable
        } else {
            this._carry(obj);
            if (obj === BOTTLE && this._bottleContents() !== NOTHING)
                this._objs[this._bottleContents()].place = R_INHAND;
            this._puts(ok);
        }
        return false;
    }

    _takeSomethingImmobile(obj) {
        if (obj === CHAIN && this._objs[BEAR].prop !== 0) {
            this._puts("The chain is still locked.");
        } else if (obj === BEAR && this._objs[BEAR].prop === 1) {
            this._puts("The bear is still chained to the wall.");
        } else if (obj === PLANT && this._objs[PLANT].prop <= 0) {
            this._puts("The plant has exceptionally deep roots and cannot be pulled free.");
        } else {
            this._puts("You can't be serious!");
        }
    }

    _takeBirdOrCage(obj) {
        if (obj === BIRD && !this._objs[BIRD].prop) {
            if (this._toting(ROD)) {
                this._puts("The bird was unafraid when you entered, but as you approach it becomes\n" +
                    "disturbed and you cannot catch it.");
                return true;
            } else if (!this._toting(CAGE)) {
                this._puts("You can catch the bird, but you cannot carry it.");
                return true;
            } else {
                this._objs[BIRD].prop = 1;
            }
        }
        if (obj === BIRD) this._carry(CAGE);
        if (obj === CAGE && this._objs[BIRD].prop) this._carry(BIRD);
        return false;
    }

    _attemptDrop(obj, loc) {
        if (obj === ROD && this._toting(ROD2) && !this._toting(ROD)) obj = ROD2;
        if (!this._toting(obj)) {
            this._puts("You aren't carrying it!");
        } else if (obj === COINS && this._here(MACHINE, loc)) {
            this._destroy(COINS);
            this._drop(BATTERIES, loc);
            this._objs[BATTERIES].prop = 0;
            this._puts("There are fresh batteries here.");
        } else if (obj === VASE && loc !== R_SOFT) {
            this._drop(VASE, loc);
            if (this._there(PILLOW, loc)) {
                this._puts("The vase is now resting, delicately, on a velvet pillow.");
            } else {
                this._puts("The Ming vase drops with a delicate crash.");
                this._objs[VASE].prop = 1;
                this._immobilize(VASE);
            }
        } else if (obj === BEAR && this._isAtLoc(TROLL, loc)) {
            this._puts("The bear lumbers toward the troll, who lets out a startled shriek and\n" +
                "scurries away.  The bear soon gives up the pursuit and wanders back.");
            this._destroy(TROLL); this._destroy(TROLL_);
            this._drop(NO_TROLL, R_SWSIDE); this._drop(NO_TROLL_, R_NESIDE);
            this._objs[TROLL].prop = 2;
            this._juggle(CHASM); this._juggle(CHASM_);
            this._drop(BEAR, loc);
        } else if (obj === BIRD && this._here(SNAKE, loc)) {
            this._puts("The little bird attacks the green snake, and in an astounding flurry\n" +
                "drives the snake away.");
            if (this._closed) { this._dwarvesUpset(); return; }
            this._drop(BIRD, loc);
            this._objs[BIRD].prop = 0;
            this._destroy(SNAKE);
            this._objs[SNAKE].prop = 1;
        } else if (obj === BIRD && this._isAtLoc(DRAGON, loc) && !this._objs[DRAGON].prop) {
            this._puts("The little bird attacks the green dragon, and in an astounding flurry\n" +
                "gets burnt to a cinder.  The ashes blow away.");
            this._destroy(BIRD);
            this._objs[BIRD].prop = 0;
            if (this._there(SNAKE, R_HMK)) ++this._lost_treasures;
        } else {
            if (obj === BIRD) this._objs[BIRD].prop = 0;
            if (obj === CAGE && this._objs[BIRD].prop) this._drop(BIRD, loc);
            if (obj === WATER && this._objs[BOTTLE].prop === 0) obj = BOTTLE;
            if (obj === OIL && this._objs[BOTTLE].prop === 2) obj = BOTTLE;
            if (obj === BOTTLE && this._bottleContents() !== NOTHING) {
                this._objs[this._bottleContents()].place = R_LIMBO;
            }
            this._drop(obj, loc);
            this._puts(ok);
        }
    }

    _attemptWave(obj, loc) {
        if (obj === ROD && (loc === R_EFISS || loc === R_WFISS) &&
            this._toting(ROD) && !this._caveIsClosing()) {
            if (this._objs[FISSURE].prop) {
                this._puts("The crystal bridge has vanished!");
                this._objs[FISSURE].prop = 0;
            } else {
                this._puts("A crystal bridge now spans the fissure.");
                this._objs[FISSURE].prop = 1;
            }
        } else if (this._toting(obj) || (obj === ROD && this._toting(ROD2))) {
            this._puts("Nothing happens.");
        } else {
            this._puts("You aren't carrying it!");
        }
    }

    _attemptBlast(loc) {
        if (this._closed && this._objs[ROD2].prop >= 0) {
            if (this._here(ROD2, loc)) {
                this._bonus = 25;
                this._puts("There is a loud explosion and you are suddenly splashed across the\nwalls of the room.");
            } else if (loc === R_NEEND) {
                this._bonus = 30;
                this._puts("There is a loud explosion and a twenty-foot hole appears in the far\n" +
                    "wall, burying the snakes in the rubble. A river of molten lava pours\n" +
                    "in through the hole, destroying everything in its path, including you!");
            } else {
                this._bonus = 45;
                this._puts("There is a loud explosion and a twenty-foot hole appears in the far\n" +
                    "wall, burying the dwarves in the rubble.  You march through the hole\n" +
                    "and find yourself in the main office, where a cheering band of\n" +
                    "friendly elves carry the conquering adventurer off into the sunset.");
            }
            this._quit();
        } else {
            this._puts("Blasting requires dynamite.");
        }
    }

    _attemptRub(obj) {
        if (obj === LAMP) {
            this._puts("Rubbing the electric lamp is not particularly rewarding. Anyway,\nnothing exciting happens.");
        } else {
            this._puts("Peculiar.  Nothing unexpected happens.");
        }
    }

    _attemptFind(obj, loc) {
        if (this._toting(obj)) {
            this._puts("You are already carrying it!");
        } else if (this._closed) {
            this._puts("I daresay whatever you want is around here somewhere.");
        } else {
            let its_right_here = false;
            if (this._isAtLoc(obj, loc)) its_right_here = true;
            else if (obj !== NOTHING && obj === this._bottleContents() && this._there(BOTTLE, loc)) its_right_here = true;
            else if (obj === WATER && this._hasWater(loc)) its_right_here = true;
            else if (obj === OIL && this._hasOil(loc)) its_right_here = true;
            else if (obj === DWARF && this._dwarfAt(loc)) its_right_here = true;
            if (its_right_here) {
                this._puts("I believe what you want is right here with you.");
            } else {
                this._puts("I can only tell you what you see as you move about and manipulate\n" +
                    "things.  I cannot tell you where remote things are.");
            }
        }
    }

    _attemptBreak(obj, loc) {
        if (obj === VASE && this._objs[VASE].prop === 0) {
            if (this._toting(VASE)) this._drop(VASE, loc);
            this._puts("You have taken the vase and hurled it delicately to the ground.");
            this._objs[VASE].prop = 1;
            this._immobilize(VASE);
        } else if (obj === MIRROR) {
            if (this._closed) {
                this._puts("You strike the mirror a resounding blow, whereupon it shatters into a\nmyriad tiny fragments.");
                this._dwarvesUpset();
            } else {
                this._puts("It is too far up for you to reach.");
            }
        } else {
            this._puts("It is beyond your power to do that.");
        }
    }

    _attemptWake(obj) {
        if (this._closed && obj === DWARF) {
            this._puts("You prod the nearest dwarf, who wakes up grumpily, takes one look at\nyou, curses, and grabs for his axe.");
            this._dwarvesUpset();
            return;
        }
        this._puts("Don't be ridiculous!");
    }

    _attemptOff(loc) {
        if (!this._here(LAMP, loc)) {
            this._puts("You have no source of light.");
        } else {
            this._objs[LAMP].prop = 0;
            this._puts("Your lamp is now off.");
            if (this._nowInDarkness(loc))
                this._puts(pitch_dark_msg);
        }
    }

    _attemptFill(obj, loc) {
        if (obj === VASE) {
            if (!this._hasOil(loc) && !this._hasWater(loc)) {
                this._puts("There is nothing here with which to fill the vase.");
            } else if (!this._toting(VASE)) {
                this._puts("You aren't carrying it!");
            } else {
                this._puts("The sudden change in temperature has delicately shattered the vase.");
                this._objs[VASE].prop = 1;
                this._drop(VASE, loc);
                this._immobilize(VASE);
            }
        } else if (!this._here(BOTTLE, loc)) {
            if (obj === NOTHING) return true;
            this._puts("You can't fill that.");
        } else if (obj !== NOTHING && obj !== BOTTLE) {
            this._puts("You can't fill that.");
        } else if (this._bottleContents() !== NOTHING) {
            this._puts("Your bottle is already full.");
        } else if (this._hasOil(loc)) {
            this._puts("Your bottle is now full of oil.");
            this._objs[BOTTLE].prop = 2;
            if (this._toting(BOTTLE)) this._objs[OIL].place = R_INHAND;
        } else if (this._hasWater(loc)) {
            this._puts("Your bottle is now full of water.");
            this._objs[BOTTLE].prop = 0;
            if (this._toting(BOTTLE)) this._objs[WATER].place = R_INHAND;
        } else {
            this._puts("There is nothing here with which to fill the bottle.");
        }
        return false;
    }

    _attemptFeed(obj, loc) {
        switch (obj) {
            case BIRD:
                this._puts("It's not hungry (it's merely pinin' for the fjords).  Besides, you\nhave no bird seed.");
                break;
            case TROLL:
                this._puts("Gluttony is not one of the troll's vices.  Avarice, however, is.");
                break;
            case DRAGON:
                if (this._objs[DRAGON].prop) this._puts("Don't be ridiculous!");
                else this._puts("There's nothing here it wants to eat (except perhaps you).");
                break;
            case SNAKE:
                if (!this._closed && this._here(BIRD, loc)) {
                    this._destroy(BIRD);
                    this._objs[BIRD].prop = 0;
                    ++this._lost_treasures;
                    this._puts("The snake has now devoured your bird.");
                } else {
                    this._puts("There's nothing here it wants to eat (except perhaps you).");
                }
                break;
            case BEAR:
                if (this._here(FOOD, loc)) {
                    this._destroy(FOOD);
                    this._objs[BEAR].prop = 1;
                    this._objs[AXE].prop = 0;
                    this._mobilize(AXE);
                    this._puts("The bear eagerly wolfs down your food, after which he seems to calm\n" +
                        "down considerably and even becomes rather friendly.");
                } else if (this._objs[BEAR].prop === 0) {
                    this._puts("There's nothing here it wants to eat (except perhaps you).");
                } else if (this._objs[BEAR].prop === 3) {
                    this._puts("Don't be ridiculous!");
                } else {
                    this._puts("There is nothing here to eat.");
                }
                break;
            case DWARF:
                if (this._here(FOOD, loc)) {
                    ++this._dflag;
                    this._puts("You fool, dwarves eat only coal!  Now you've made him *REALLY* mad!!");
                } else {
                    this._puts("There is nothing here to eat.");
                }
                break;
            default:
                this._puts("I'm game.  Would you care to explain how?");
                break;
        }
    }

    _attemptOpenOrClose(verb, obj, loc) {
        const verb_is_open = (verb === OPEN);
        switch (obj) {
            case OYSTER: case CLAM: {
                const clam_oyster = obj === CLAM ? "clam" : "oyster";
                if (!verb_is_open) {
                    this._puts("What?");
                } else if (!this._toting(TRIDENT)) {
                    this._puts(`You don't have anything with which to open the ${clam_oyster}.`);
                } else if (this._toting(obj)) {
                    this._puts(`I advise you to put down the ${clam_oyster} before opening it.  ${obj === CLAM ? ">STRAIN!<" : ">WRENCH!<"}`);
                } else if (obj === CLAM) {
                    this._destroy(CLAM);
                    this._drop(OYSTER, loc);
                    this._drop(PEARL, R_SAC);
                    this._puts("A glistening pearl falls out of the clam and rolls away.  Goodness,\n" +
                        "this must really be an oyster.  (I never was very good at identifying\n" +
                        "bivalves.)  Whatever it is, it has now snapped shut again.");
                } else {
                    this._puts("The oyster creaks open, revealing nothing but oyster inside.\nIt promptly snaps shut again.");
                }
                break;
            }
            case GRATE:
                if (!this._here(KEYS, loc)) {
                    this._puts("You have no keys!");
                } else if (this._caveIsClosing()) {
                    this._panicAtClosingTime();
                } else {
                    const was_open = this._objs[GRATE].prop;
                    this._objs[GRATE].prop = verb_is_open ? 1 : 0;
                    const combo = was_open + 2*(verb_is_open ? 1 : 0);
                    switch (combo) {
                        case 0: this._puts("It was already locked."); break;
                        case 1: this._puts("The grate is now locked."); break;
                        case 2: this._puts("The grate is now unlocked."); break;
                        case 3: this._puts("It was already unlocked."); break;
                    }
                }
                break;
            case CHAIN:
                if (!this._here(KEYS, loc)) {
                    this._puts("You have no keys!");
                } else if (verb_is_open) {
                    if (this._objs[CHAIN].prop === 0) {
                        this._puts("It was already unlocked.");
                    } else if (this._objs[BEAR].prop === 0) {
                        this._puts("There is no way to get past the bear to unlock the chain, which is\nprobably just as well.");
                    } else {
                        this._objs[CHAIN].prop = 0;
                        this._mobilize(CHAIN);
                        if (this._objs[BEAR].prop === 1) {
                            this._objs[BEAR].prop = 2;
                            this._mobilize(BEAR);
                        }
                        this._puts("The chain is now unlocked.");
                    }
                } else {
                    if (loc !== R_BARR) {
                        this._puts("There is nothing here to which the chain can be locked.");
                    } else if (this._objs[CHAIN].prop) {
                        this._puts("It was already locked.");
                    } else {
                        this._objs[CHAIN].prop = 2;
                        this._immobilize(CHAIN);
                        if (this._toting(CHAIN)) this._drop(CHAIN, loc);
                        this._puts("The chain is now locked.");
                    }
                }
                break;
            case KEYS:
                this._puts("You can't lock or unlock the keys.");
                break;
            case CAGE:
                this._puts("It has no lock.");
                break;
            case RUSTY_DOOR:
                if (this._objs[RUSTY_DOOR].prop) {
                    this._puts(ok);
                } else {
                    this._puts("The door is extremely rusty and refuses to open.");
                }
                break;
            default:
                this._puts("I don't know how to lock or unlock such a thing.");
                break;
        }
    }

    _attemptRead(obj) {
        switch (obj) {
            case MAG:
                this._puts("I'm afraid the magazine is written in dwarvish.");
                break;
            case TABLET:
                this._puts("\"CONGRATULATIONS ON BRINGING LIGHT INTO THE DARK-ROOM!\"");
                break;
            case MESSAGE:
                this._puts("\"This is not the maze where the pirate leaves his treasure chest.\"");
                break;
            case OYSTER:
                if (this._closed && this._toting(OYSTER)) {
                    if (this._hints[1].given) {
                        this._puts("It says the same thing it did before.");
                    } else {
                        // offer is async but _attemptRead is sync; we handle this specially
                        // Actually, we need to make the calling context handle this
                        this._pendingOffer = 1;
                    }
                    break;
                }
                // fallthrough
            default:
                this._puts("I'm afraid I don't understand.");
                break;
        }
    }

    async _sayScore() {
        this._puts(`If you were to quit now, you would score ${this._score()-4}\nout of a possible ${MAX_SCORE}.`);
        if (await this._yes("Do you indeed wish to quit now?", ok, ok)) this._giveUp();
    }

    _throwAxeAtDwarf(loc) {
        if (ran(3) < 2) {
            this._killADwarf(loc);
        } else {
            this._puts("You attack a little dwarf, but he dodges out of the way.");
        }
    }

    _killADwarf(loc) {
        if (this._first_kill) {
            this._puts("You killed a little dwarf.  The body vanishes in a cloud of greasy\nblack smoke.");
            this._first_kill = false;
        } else {
            this._puts("You killed a little dwarf.");
        }
        for (let j = 1; j <= 5; ++j) {
            if (this._dwarves[j].loc === loc) {
                this._dwarves[j].loc = R_LIMBO;
                this._dwarves[j].seen = false;
                break;
            }
        }
    }

    _dwarvesUpset() {
        this._puts("The resulting ruckus has awakened the dwarves.  There are now several\n" +
            "threatening little dwarves in the room with you!  Most of them throw\n" +
            "knives at you!  All of them get you!");
        this._quit();
    }

    _attemptPloverPassage(from) {
        if (this._holding_count === (this._toting(EMERALD) ? 1 : 0))
            return R_ALCOVE + R_PLOVER - from;
        this._puts("Something you're carrying won't fit through the tunnel with you.\nYou'd best take inventory and drop something.");
        return from;
    }

    _tryGoingBackTo(l, from) {
        if (l === from) {
            this._puts("Sorry, but I no longer seem to remember how you got here.");
            return NOWHERE;
        }
        const startIdx = this._start[from];
        const endIdx = this._start[from + 1] !== undefined ? this._start[from + 1] : this._travels.length;
        for (let qi = startIdx; qi < endIdx; ++qi) {
            let ll = this._travels[qi].dest;
            if (ll === l) return this._travels[qi].mot;
            if (this._isForced(ll) && this._start[ll] !== undefined) {
                const dest = this._travels[this._start[ll]].dest;
                if (dest === l) return this._travels[qi].mot;
            }
        }
        this._puts("You can't get there from here.");
        return NOWHERE;
    }

    _determineMotionInstruction(loc, mot) {
        const startIdx = this._start[loc];
        const endIdx = this._start[loc + 1] !== undefined ? this._start[loc + 1] : this._travels.length;
        let qi;
        for (qi = startIdx; qi < endIdx; ++qi) {
            if (this._isForced(loc) || this._travels[qi].mot === mot) break;
        }
        if (qi === endIdx) return null;
        while (true) {
            const cond = this._travels[qi].cond;
            if (cond === 0) break;
            else if (cond <= 100) {
                if (pct(cond)) break;
            } else if (cond <= 200) {
                if (this._toting(MIN_OBJ + cond % 100)) break;
            } else if (cond <= 300) {
                if (this._isAtLoc(MIN_OBJ + cond % 100, loc)) break;
            } else {
                if (this._objs[MIN_OBJ + cond % 100].prop !== Math.floor(cond / 100) - 3) break;
            }
            const dest = this._travels[qi].dest;
            const savedCond = this._travels[qi].cond;
            while (qi < endIdx && this._travels[qi].dest === dest && this._travels[qi].cond === savedCond)
                ++qi;
        }
        return qi < endIdx ? this._travels[qi] : null;
    }

    _reportInapplicableMotion(mot, verb) {
        if (mot === CRAWL) {
            this._puts("Which way?");
        } else if (mot === XYZZY || mot === PLUGH) {
            this._puts("Nothing happens.");
        } else if (verb === FIND || verb === INVENTORY) {
            this._puts("I can only tell you what you see as you move about and manipulate\n" +
                "things.  I cannot tell you where remote things are.");
        } else {
            switch (mot) {
                case N: case S: case E: case W: case NE: case SE: case NW: case SW:
                case U: case D:
                    this._puts("There is no way to go in that direction.");
                    break;
                case IN: case OUT:
                    this._puts("I don't know in from out here.  Use compass points or name something\n" +
                        "in the general direction you want to go.");
                    break;
                case FORWARD: case LEFT: case RIGHT:
                    this._puts("I am unsure how you are facing.  Use compass points or nearby objects.");
                    break;
                default:
                    this._puts("I don't know how to apply that word here.");
                    break;
            }
        }
    }

    _collapseTheTrollBridge() {
        this._puts("Just as you reach the other side, the bridge buckles beneath the\n" +
            "weight of the bear, who was still following you around.  You\n" +
            "scrabble desperately for support, but as the bridge collapses you\n" +
            "stumble back and fall into the chasm.");
        this._objs[CHASM].prop = 1;
        this._objs[TROLL].prop = 2;
        this._objs[BEAR].prop = 3;
        this._drop(BEAR, R_SWSIDE);
        this._immobilize(BEAR);
        if (this._objs[SPICES].prop < 0 && this._objs[SPICES].place >= R_NESIDE)
            ++this._lost_treasures;
    }

    // Returns true if player died. Sets this._newlocResult.
    _determineNextNewloc(loc, mot, verb) {
        const q = this._determineMotionInstruction(loc, mot);
        if (q === null) {
            this._reportInapplicableMotion(mot, verb);
            this._newlocResult = loc;
            return false;
        }
        let newloc = q.dest;

        if (newloc >= FIRST_REMARK) {
            this._printRemark(newloc - FIRST_REMARK);
            newloc = loc;
        } else if (newloc === R_PPASS) {
            newloc = this._attemptPloverPassage(loc);
        } else if (newloc === R_PDROP) {
            this._drop(EMERALD, loc);
            newloc = R_Y2 + R_PLOVER - loc;
        } else if (newloc === R_TROLL) {
            if (this._objs[TROLL].prop === 1) {
                this._objs[TROLL].prop = 0;
                this._destroy(NO_TROLL); this._destroy(NO_TROLL_);
                this._drop(TROLL, R_SWSIDE); this._drop(TROLL_, R_NESIDE);
                this._juggle(CHASM); this._juggle(CHASM_);
                this._puts("The troll steps out from beneath the bridge and blocks your way.");
                newloc = loc;
            } else {
                newloc = R_NESIDE + R_SWSIDE - loc;
                if (this._objs[TROLL].prop === 0)
                    this._objs[TROLL].prop = 1;
                if (this._toting(BEAR)) {
                    this._collapseTheTrollBridge();
                    this._newlocResult = newloc;
                    return true; // death
                }
            }
        }

        this._newlocResult = newloc;
        return false;
    }

    // ========== Save / Restore ==========
    getSaveState() {
        // Snapshot all mutable game state
        const state = {
            objs: {},
            places: [],
            dwarves: JSON.parse(JSON.stringify(this._dwarves)),
            hints: JSON.parse(JSON.stringify(this._hints)),
            holding_count: this._holding_count,
            last_knife_loc: this._last_knife_loc,
            tally: this._tally,
            lost_treasures: this._lost_treasures,
            dflag: this._dflag,
            turns: this._turns,
            verbose_interval: this._verbose_interval,
            foobar: this._foobar,
            clock1: this._clock1,
            clock2: this._clock2,
            closed: this._closed,
            bonus: this._bonus,
            lamp_limit: this._lamp_limit,
            death_count: this._death_count,
            gave_up: this._gave_up,
            warned: this._warned,
            panic: this._panic,
            west_count: this._west_count,
            first_kill: this._first_kill,
            have_tried_to_get_knife: this._have_tried_to_get_knife,
            rngState: _rngState,
        };
        for (let t = MIN_OBJ; t <= MAX_OBJ; t++) {
            state.objs[t] = { ...this._objs[t] };
        }
        for (let i = 0; i <= MAX_LOC; i++) {
            state.places.push({
                objects: this._places[i].objects,
                visits: this._places[i].visits,
                flags: this._places[i].flags,
            });
        }
        return state;
    }

    setSaveState(state) {
        for (let t = MIN_OBJ; t <= MAX_OBJ; t++) {
            Object.assign(this._objs[t], state.objs[t]);
        }
        for (let i = 0; i <= MAX_LOC; i++) {
            this._places[i].objects = state.places[i].objects;
            this._places[i].visits = state.places[i].visits;
            this._places[i].flags = state.places[i].flags;
        }
        this._dwarves = JSON.parse(JSON.stringify(state.dwarves));
        this._hints = JSON.parse(JSON.stringify(state.hints));
        this._holding_count = state.holding_count;
        this._last_knife_loc = state.last_knife_loc;
        this._tally = state.tally;
        this._lost_treasures = state.lost_treasures;
        this._dflag = state.dflag;
        this._turns = state.turns;
        this._verbose_interval = state.verbose_interval;
        this._foobar = state.foobar;
        this._clock1 = state.clock1;
        this._clock2 = state.clock2;
        this._closed = state.closed;
        this._bonus = state.bonus;
        this._lamp_limit = state.lamp_limit;
        this._death_count = state.death_count;
        this._gave_up = state.gave_up;
        this._warned = state.warned;
        this._panic = state.panic;
        this._west_count = state.west_count;
        this._first_kill = state.first_kill;
        this._have_tried_to_get_knife = state.have_tried_to_get_knife;
        if (state.rngState != null) _rngState = state.rngState;
    }

    /** Set PRNG seed before run() — for testing. Must call before run(). */
    setSeed(seed) { _resetRng(seed); this._seedOverride = seed; }
}
