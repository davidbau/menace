// parser.js - Command parser for DUNGEON
//
// Ported from parser.f (Fortran) / np.c, np1-3.c (C)
// COPYRIGHT 1980, 1990, INFOCOM COMPUTERS AND COMMUNICATIONS, CAMBRIDGE MA.
// Faithful port to JavaScript by machine translation.

import {
  WRDLNT, LEXMAX, BUNMAX, TEXLNT,
  XMIN, XNORTH, XNE, XEAST, XSE, XSOUTH, XSW, XWEST, XNW,
  XUP, XDOWN, XLAUN, XLAND, XEXIT, XENTER, XCROSS,
  WALKW, TAKEW, BUNOBJ, ITOBJ, OPLAY, EVERY, VALUA, POSSE,
  VISIBT, TAKEBT, TRANBT, OPENBT, FINDBT, ACTRBT, VILLBT, ONBT,
  VABIT, VRBIT, VTBIT, VCBIT, VEBIT, VFBIT, VPMASK,
  SDIR, SIND, SSTD, SFLIP, SDRIV, SVMASK,
  GLOBAL, PLAYER,
  rspeak, rspsub, rspsb2, bug, lit, qhere, fwim, ghere, nblen, oappli,
} from './support.js';

// ---------------------------------------------------------------
// Vocabulary data — embedded directly from parser.f DATA statements
// ---------------------------------------------------------------

// Buzz words (ignored in syntactic processing)
const BWORD = [
  'BY', 'IS', 'A', 'AN', 'THE', 'AM', 'ARE',
  'TODAY', 'MY', 'YOUR', 'OUR', 'HIS'
];

// Prepositions -> indices
const PWORD = [
  'OVER', 'WITH', 'USING', 'AT', 'TO',
  'IN', 'INSIDE', 'INTO', 'DOWN', 'UP',
  'UNDER', 'OF', 'ON', 'OFF', 'FOR',
  'FROM', 'OUT', 'THROUGH', '', ''
];
const PVOC = [
  1, 2, 2, 3, 4,
  5, 5, 5, 6, 7,
  8, 9, 10, 11, 12,
  13, 13, 14, 0, 0
];

// Directions -> indices
const DWORD = [
  'N', 'NORTH', 'S', 'SOUTH',
  'E', 'EAST', 'W', 'WEST',
  'SE', 'SW', 'NE', 'NW',
  'U', 'UP', 'D', 'DOWN',
  'LAUNCH', 'LAND', 'EXIT', 'OUT',
  'TRAVEL', 'IN', 'CROSS', '', ''
];
const DVOC = [
  XNORTH, XNORTH, XSOUTH, XSOUTH,
  XEAST, XEAST, XWEST, XWEST,
  XSE, XSW, XNE, XNW,
  XUP, XUP, XDOWN, XDOWN,
  XLAUN, XLAND, XEXIT, XEXIT,
  XCROSS, XENTER, XCROSS, 0, 0
];

// ---------------------------------------------------------------
// Adjectives (AWORD/AVOC) — from parser.f DATA statements
// These map adjective words to lists of object numbers.
// Positive = first object in group, negative = continuation.
// ---------------------------------------------------------------
const AWORD = [
  'BROWN','ELONGATE','HOT','PEPPER','VITREOUS','JADE','HUGE','ENORMOUS',
  'TROPHY','CLEAR','LARGE','NASTY','ELVISH','BRASS','BROKEN','ORIENTAL',
  'BLOODY','RUSTY','BURNED-O','DEAD','OLD','LEATHER','PLATINUM','PEARL',
  'MOBY','CRYSTAL','GOLD','IVORY','SAPPHIRE','WOODEN','WOOD','STEEL',
  'DENTED','FANCY','ANCIENT','SMALL','BLACK','TOUR','VISCOUS','VICIOUS',
  'GLASS','TRAP','FRONT','STONE','MANGLED','RED','YELLOW','BLUE',
  'VAMPIRE','MAGIC','SEAWORTH','TAN','SHARP','WICKER','CLOTH','BRAIDED',
  'GAUDY','SQUARE','CLAY','SHINY','THIN','GREEN','PURPLE','WHITE',
  'MARBLE','COKE','EMPTY','ROUND','TRIANGUL','RARE','OBLONG','EAT-ME',
  'EATME','ORANGE','ECCH','ROCKY','SHEER','200','NEAT','SHIMMERI',
  'ZURICH','BIRDS','ENCRUSTE','BEAUTIFU','CLOCKWOR','MECHANIC','MAHOGANY','PINE',
  'LONG','CENTER','SHORT','T','COMPASS','BRONZE','CELL','LOCKED',
  'SUN','BARE','SONG','NORTH','NORTHERN','SOUTH','SOUTHERN','EAST',
  'EASTERN','WEST','WESTERN','DUNGEON','FREE','GRANITE','LOWERED','VOLCANO',
  'MAN-SIZE','METAL','PLASTIC','SILVER','USED','USELESS','SEEING','ONE-EYED',
  'HOLY','HAND-HEL','UNRUSTY','PLAIN','PRICELES','SANDY','GIGANTIC','LINE-PRI',
  'FLATHEAD','FINE','SHADY','SUSPICIO','CROSS','TOOL','CONTROL','DON',
  'WOODS','GOLDEN','OAK','BARRED','DUSTY','NARROW','IRON','WELCOME',
  'RUBBER','SKELETON','ALL','ZORKMID',
  '','','','','','','','','','','','',
];
const AVOC = [
  1,-81,-133,1,3,-190,3,
  4,6,8,8,-122,
  9,10,12,-26,-47,-95,-96,-123,-133,-135,-144,-145,-150,-176,-191,13,-19,
  14,15,-16,-46,-156,-190,16,-22,-38,-92,-113,-155,-158,17,
  20,24,-205,22,22,
  25,-41,-44,-45,-208,25,26,27,
  31,32,-126,-206,-209,33,-85,-104,-157,-158,-188,34,
  37,38,-67,-75,-93,-136,-137,-165,-173,-174,-175,-197,-204,
  38,-67,-136,-137,-165,-173,-174,-175,
  39,-105,-124,-125,-189,
  39,40,41,-44,5,-46,-52,-53,-89,-102,-103,-153,-187,
  47,-162,49,55,62,
  // (AWORD 41-80)
  10,-126,-132,-206,-209,66,68,69,-150,-278,
  72,-124,79,-94,-140,-161,-170,-171,-190,-209,
  80,-159,82,-112,-114,-141,-206,
  83,90,-281,90,91,
  92,98,100,101,
  108,109,-127,109,110,
  110,77,-115,-143,116,117,-126,-147,-160,-266,
  119,121,121,128,
  129,134,135,138,
  138,139,141,146,
  146,148,148,151,
  // (AWORD 81-120)
  152,153,-154,-155,154,-155,86,-156,
  157,-158,157,-158,163,164,
  166,166,167,168,
  169,-275,172,174,-175,174,
  177,259,267,269,
  269,270,270,271,
  271,67,-272,67,-272,279,
  195,-262,265,36,111,
  93,64,-99,-200,-201,77,-87,-88,-90,59,
  22,22,126,-206,-209,58,
  // (AWORD 121-160)
  43,89,13,13,
  104,192,122,122,
  118,91,61,61,
  165,193,194,196,
  196,157,-158,197,198,-210,
  204,199,205,207,
  207,23,253,-254,104,-148,
  0,0,0,0,0,0,0,0,0,0,0,0,
];

// ---------------------------------------------------------------
// Objects (OWORD/OVOC) — from parser.f DATA statements
// ---------------------------------------------------------------
const OWORD = [
  'BAG','SACK','GARLIC','CLOVE','FOOD','SANDWICH','LUNCH','DINNER',
  'GUNK','PIECE','SLAG','COAL','PILE','HEAP','FIGURINE','MACHINE',
  'PDP10','VAX','DRYER','LID','DIAMOND','CASE','BOTTLE','CONTAINE',
  'WATER','QUANTITY','LIQUID','H2O','ROPE','HEMP','COIL','KNIFE',
  'BLADE','SWORD','ORCHRIST','GLAMDRIN','LAMP','LANTERN','RUG','CARPET',
  'LEAVES','LEAF','TROLL','AXE','PRAYER','KEYS','KEY','SET',
  'BONES','SKELETON','BODY','COINS','BAR','NECKLACE','PEARLS','MIRROR',
  'ICE','MASS','GLACIER','RUBY','TRIDENT','FORK','COFFIN','CASKET',
  'TORCH','CAGE','DUMBWAIT','BASKET','BRACELET','JEWEL','TIMBER','BOX',
  'STRADIVA','VIOLIN','ENGRAVIN','INSCRIPT','GHOST','SPIRIT','FIEND','GRAIL',
  'TRUNK','CHEST','BELL','BOOK','BIBLE','GOODBOOK','CANDLES','PAIR',
  'GUIDEBOO','GUIDE','PAPER','NEWSPAPE','ISSUE','REPORT','MAGAZINE','NEWS',
  'MATCHBOO','MATCH','MATCHES','ADVERTIS','PAMPHLET','LEAFLET','BOOKLET','MAILBOX',
  'TUBE','TOOTHPAS','PUTTY','MATERIAL','GLUE','WRENCH','SCREWDRI','CYCLOPS',
  'MONSTER','CHALICE','CUP','GOBLET','PAINTING','ART','CANVAS','PICTURE',
  'WORK','MASTERPI','THIEF','ROBBER','CRIMINAL','BANDIT','CROOK','GENT',
  'GENTLEMA','MAN','INDIVIDU','BAGMAN','STILETTO','WINDOW','BOLT','NUT',
  'GRATE','GRATING','DOOR','TRAP-DOO','SWITCH','HEAD','CORPSE','BODIES',
  'DAM','GATES','GATE','FCD','RAIL','RAILING','BUTTON','BUBBLE',
  'LEAK','DRIP','HOLE','BAT','RAINBOW','POT','STATUE','SCULPTUR',
  // (OWORD 161-200)
  'ROCK','BOAT','PLASTIC','PUMP','AIRPUMP','AIR-PUMP','LABEL','FINEPRIN',
  'STICK','BARREL','BUOY','EMERALD','SHOVEL','GUANO','CRAP','SHIT',
  'HUNK','BALLOON','RECEPTAC','WIRE','HOOK','ZORKMID','COIN','SAFE',
  'CARD','NOTE','SLOT','CROWN','BRICK','FUSE','GNOME','STAMP',
  'TOMB','CRYPT','GRAVE','HEADS','POLES','IMPLEMEN','LOSERS','COKES',
  // (OWORD 201-240)
  'LISTINGS','OUTPUT','PRINTOUT','SPHERE','BALL','ETCHING','WALLS','WALL',
  'FLASK','POOL','SEWAGE','TIN','SAFFRON','SPICES','TABLE','POST',
  'POSTS','BUCKET','CAKE','ICING','ROBOT','ROBBY','C3PO','R2D2',
  'PANEL','POLE','TBAR','T-BAR','ARROW','POINT','BEAM','DIAL',
  'SUNDIAL','1','ONE','2','TWO','3','THREE','4',
  // (OWORD 241-280)
  'FOUR','5','FIVE','6','SIX','7','SEVEN','8',
  'EIGHT','WARNING','SLIT','IT','THAT','THIS','ME','MYSELF',
  'CRETIN','ALL','EVERYTHI','TREASURE','VALUABLE','SAILOR','TEETH','GRUE',
  'HAND','HANDS','LUNGS','AIR','AVIATOR','FLYER','TREE','CLIFF',
  'LEDGE','PORTRAIT','STACK','BILLS','VAULT','CUBE','LETTERIN','CURTAIN',
  // (OWORD 281-360)
  'LIGHT','NEST','EGG','BAUBLE','CANARY','BIRD','SONGBIRD','GUARD',
  'GUARDIAN','ROSE','STRUCTUR','CHANNEL','KEEPER','LADDER','BROCHURE','WISH',
  'GROUND','EARTH','SAND','WELL','SLIDE','CHUTE','HOUSE','BOTTLES',
  'BUNCH','PALANTIR','STONE','FLINT','POSSESSI','GOOP','BEACH','GRIP',
  'HANDGRIP','PRINT','ETCHINGS','CRACK','KEYHOLE','MAT','STOVE','PLATINUM',
  'HIM','SELF','GOLD','SAPPHIRE','IVORY','MASTER','CANDLE','JADE',
  'SCREEN','BLESSING','GHOSTS','SPIRITS','CORPSES','JEWELS','CLIFFS','CHIMNEY',
  '','','','','','','','','','','','',
  '','','','','','','','','','','','',
];
const OVOC = [
  1,-25,-100,1,2,2,
  3,3,3,3,
  4,-55,4,-143,-186,-282,4,5,
  5,-18,-38,-72,-73,-87,-88,-122,-148,5,6,7,
  7,7,7,7,-200,-201,
  8,9,-123,10,-121,10,
  11,-273,11,-273,11,-273,11,-273,
  12,-101,-282,12,12,-110,13,-24,
  13,-14,14,14,14,
  15,-16,-22,15,-16,-22,17,17,
  // OVOC 72-130
  18,18,19,-111,20,
  44,-47,23,23,-205,23,
  21,21,21,-72,-73,25,
  26,-165,-168,27,27,28,-29,-276,
  30,30,30,31,
  32,32,33,33,
  34,35,-36,-124,-125,35,-36,35,-36,-98,-113,
  37,37,38,39,-53,-105,
  40,40,41,41,-44,
  42,42,42,43,
  // OVOC 131-182
  45,45,-193,46,-190,47,-49,-114,-115,-116,-117,
  47,47,48,48,
  49,49,50,-122,-143,-186,50,
  50,50,50,50,
  51,51,51,52,
  52,52,52,53,
  54,54,55,55,
  55,56,57,58,
  58,59,59,59,
  60,-149,60,-149,60,60,
  // OVOC 183-258
  60,60,61,61,
  61,61,61,61,
  61,61,61,61,
  62,63,-198,-210,64,64,
  65,65,66,-67,-68,-69,-119,-164,-172,-173,-174,-175,-189,-197,66,
  70,-79,-80,-81,-82,-170,71,-120,72,-73,72,-73,
  74,74,-76,74,-76,74,
  75,75,76,-79,-80,-81,-82,-127,-128,-129,-170,-176,77,
  78,-191,78,78,-107,-202,-203,83,
  84,85,86,86,
  // OVOC 259-312
  86,87,-88,-90,87,-88,-90,89,
  89,89,91,-112,91,
  92,93,94,95,
  96,97,97,97,
  97,98,-113,99,101,-110,
  102,-103,104,-148,104,105,
  106,-188,106,-186,107,-187,108,
  109,110,111,-152,118,-196,
  119,119,119,120,
  120,120,120,121,
  // OVOC 313-387
  122,122,122,126,-206,-209,
  126,130,-131,130,-131,-257,130,-131,-159,
  -160,-161,-162,-163,-164,-257,-265,-269,-270,-271,-272,
  132,133,133,134,
  134,134,135,-204,136,-166,-167,
  136,137,138,-139,-140,-141,139,-140,-141,
  142,142,142,142,
  159,-160,-161,-162,-163,-164,-194,-277,120,-166,-167,168,168,
  169,169,171,177,
  177,178,178,179,
  179,180,180,181,
  // OVOC 388-432
  181,182,182,183,
  183,184,184,185,
  185,186,187,250,
  250,250,251,251,
  251,252,252,253,
  253,255,256,258,
  259,259,260,260,
  261,261,144,-145,-268,146,-147,
  146,149,122,-148,148,
  150,150,67,-150,151,
  // OVOC 433-485
  15,-151,-171,153,154,-155,156,
  157,-158,267,267,274,
  274,275,276,278,
  279,280,195,-262,263,
  264,264,192,-264,281,
  283,283,266,121,
  121,126,-206,-209,126,-206,-209,51,
  254,133,192,167,
  167,91,-122,130,-131,199,
  202,-203,207,208,26,
  // OVOC 486-529
  250,251,85,-104,37,
  34,279,48,6,
  151,263,42,42,
  72,-73,37,-45,146,-147,211,
  0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,
];

// ---------------------------------------------------------------
// Verbs (VWORD/VVOC) — from parser.f DATA statements
// The vvoc array contains packed syntax entries in octal.
// ---------------------------------------------------------------
const VWORD = [
  'BRIEF','VERBOSE','SUPERBRI','STAY',
  'VERSION','*SWIM','*BATHE','WADE',
  'GERONIMO','*ULYSSES','ODYSSEUS','*PLUGH','XYZZY',
  'PRAY','TREASURE','TEMPLE','BLAST',
  'SCORE','*QUIT','*GOODBYE','*Q','BYE','HELP',
  'INFO','*HISTORY','UPDATE','BACK',
  '*MUMBLE','SIGH','*CHOMP','*LOSE',
  'BARF','DUNGEON','FROBOZZ','*FOO',
  '*BLETCH','BAR','REPENT','*HOURS',
  'SCHEDULE','WIN','*YELL','*SCREAM',
  'SHOUT','*HOP','SKIP','*CURSE',
  '*SHIT','*DAMN','FUCK','ZORK',
  'WISH','SAVE','RESTORE','TIME',
  'DIAGNOSE','EXORCISE','*LIST','*I','INVENTOR',
  'WAIT','INCANT','*ANSWER','RESPOND','AGAIN',
  'NOOBJ','*BUG','*GRIPE','COMPLAIN',
  '*FEATURE','*COMMENT','*IDEA','SUGGESTI',
  'ROOM','*OBJECTS','OBJ','RNAME','DEFLATE',
  '*EXAMINE','*WHAT','DESCRIBE','FILL',
  '*FIND','*SEEK','*WHERE','SEE',
  'FOLLOW','*KICK','*BITE','TAUNT',
  'LOWER','*PUSH','PRESS','*RING',
  'PEAL','*RUB','*FEEL','*CARESS','*TOUCH',
  'FONDLE','SHAKE','SPIN','*UNTIE',
  'FREE','*WALK','*RUN','*PROCEED','GO','*ATTACK','*FIGHT',
  '*INJURE','*HIT','HURT','BOARD',
  '*BRUSH','CLEAN','*BURN','*IGNITE',
  'INCINERA','CLIMB','CLOSE','DIG',
  'DISEMBAR','*DRINK','*IMBIBE','SWALLOW',
  '*DROP','RELEASE','*EAT','*GOBBLE','*CONSUME',
  '*MUNCH','TASTE','*DOUSE','EXTINGUI',
  '*GIVE','*HAND','DONATE','*HELLO',
  'HI','BLOW','INFLATE','*JUMP',
  'LEAP','*KILL','*MURDER','*SLAY',
  '*STAB','DISPATCH','*KNOCK','RAP',
  'LIGHT','LOCK','*LOOK','*L','*STARE',
  'GAZE','*MELT','LIQUIFY','MOVE',
  '*PULL','TUG','*DESTROY','*MUNG',
  '*BREAK','DAMAGE','OPEN','PICK',
  '*PLUG','*GLUE','PATCH','*POKE',
  '*BLIND','JAB','*POUR','SPILL',
  'PUMP','*PUT','*INSERT','*STUFF',
  'PLACE','*RAISE','LIFT','*READ',
  '*PERUSE','SKIM','STRIKE','*SWING',
  'THRUST','*TAKE','*HOLD','*CARRY',
  'REMOVE','*TELL','*COMMAND','REQUEST',
  '*THROW','*HURL','CHUCK','*TIE',
  'FASTEN','*TURN','SET','UNLOCK',
  '*WAKE','*ALARM','*STARTLE','SURPRISE',
  '*WAVE','*FLAUNT','BRANDISH','WIND',
  'ENTER','LEAVE','*MAKE','BUILD',
  '*OIL','*GREASE','LUBRICAT','PLAY',
  'SEND','SLIDE','*SMELL','SNIFF',
  'SQUEEZE','GET','COUNT',
  '','','','','','','','','','','','','',
];

// VVOC: octal values from the Fortran DATA statements, converted to decimal.
// We store them as a flat array. The structure is:
//   length, syntaxflag, [objdesc, fwim1, fwim2, ...]*, ... per syntax entry
// Each verb's block starts at the index stored in ACT, length at VVOC[ACT].
const VVOC = [
  // Verbs 1-43 (simple 1-entry verbs)
  1,70, 1,71, 1,72, 1,73,
  1,74, 1,75,
  1,76, 1,77, 1,56,
  1,79, 1,80, 1,81, 1,82,
  1,83, 1,84, 1,40,
  1,41, 1,42, 1,43,
  1,44,
  1,45, 1,46, 1,47,
  1,48, 1,49,
  1,50, 1,51,
  // Verbs 44-86
  1,52, 1,53,
  1,54, 1,55,
  1,169, 1,149, 1,150, 1,90,
  1,94, 1,105, 1,133,
  1,128, 1,95, 1,96, 1,57,
  1,58, 1,59,
  1,60,
  1,65, 1,66, 1,67, 1,0o50147,
  // EXAMINE
  4,0o40170,0o60000,-1,-1,
  11,0o60206,0o61000,0o200,0,0o61002,-1,-1,
  0o40206,0o61000,0o200,0,
  // FILL/SEE
  4,0o40177,0o60000,-1,-1,
  // FOLLOW
  2,0o125,0o50125,1,0o50153,
  // LOWER
  1,0o50156,
  // PUSH
  9,0o50160,0o40160,0o61012,-1,-1,
  0o40241,0o61010,-1,-1,
  // RUB
  5,0o52127,0o70127,0o61002,-1,-1,
  // SHAKE
  1,0o50157,
  // SPIN
  1,0o50171,
  // UNTIE
  1,0o50201,
  // WALK
  11,0o42161,0o61000,0,0o10000,
  0o60242,0o61000,0,0o10000,0o61015,-1,-1,
  // ATTACK
  9,0o50216,0o40126,0o61016,-1,-1,0o40126,0o61005,-1,-1,
  // BOARD
  7,0o60215,0o21000,0,0o200,0o44002,0,0o1000,
  // CLEAN
  4,0o40202,0o21000,0,2,
  // BURN
  5,0o52130,0o70130,0o61002,-1,-1,
  // CLIMB
  7,0o60211,0o61000,0o20,0,0o64002,0o10,0,
  // CLOSE
  12,0o40235,0o20007,0,0o4000,0o40236,0o20006,0,0o4000,
  0o40234,0o20000,0,0o4000,
  // DIG
  4,0o40176,0o61000,0o10200,0,
  // DISEMBARK
  21,0o60131,0o20005,0,0o40000,0o44002,4,0,
  0o60131,0o20016,0,0o40000,0o44002,4,0,
  0o60131,0o20000,0,0o40000,0o44002,4,0,
  // DRINK
  8,0o40203,0o20000,0,2,0o40203,0o20015,0,2,
  // EAT
  4,0o40210,0o61000,0o400,0,
  // DROP
  25,0o42221,0o41000,-1,-1,
  0o60220,0o41000,-1,-1,0o61005,-1,-1,
  0o60220,0o41000,-1,-1,0o61006,-1,-1,
  0o60220,0o41000,-1,-1,0o61016,-1,-1,
  // TASTE
  4,0o40207,0o75000,0o2000,0,
  // EXTINGUISH
  4,0o40174,0o75000,0o100,0,
  // GIVE
  11,0o72222,0o21004,0o40,0,0o64222,0o21000,0o40,0,
  0o61000,-1,-1,
  // HELLO
  2,0o2227,0o50227,
  // BLOW/INFLATE
  15,0o62146,0o61007,-1,-1,0o61002,4,0,
  0o40122,0o61007,-1,-1,0o40165,0o61005,-1,-1,
  4,0o70146,0o61002,4,0,
  // JUMP
  5,0o133,0o40133,0o61001,-1,-1,
  // KILL
  7,0o60213,0o21000,0,0o200,0o44002,0,0o1000,
  // KNOCK
  12,0o42166,0o61003,-1,-1,0o40166,0o61012,-1,-1,
  0o40215,0o23006,0o40,0,
  // LIGHT
  11,0o42173,0o75000,0o100,0,0o60211,0o61000,0o100,0,
  0o54002,0o10,0,
  // LOCK
  7,0o60134,0o20000,-1,-1,0o74002,4,0,
  // LOOK
  31,0o167,0o40170,0o60003,-1,-1,0o40231,0o61010,-1,-1,
  0o40230,0o60005,-1,-1,0o40230,0o60016,-1,-1,
  0o60144,0o60003,-1,-1,0o61002,-1,-1,
  0o60144,0o60003,-1,-1,0o61016,-1,-1,
  // MELT
  4,0o70145,0o61002,0o10,0,
  // MOVE
  4,0o40172,0o20000,-1,-1,
  // PULL
  8,0o42172,0o21000,-1,-1,0o40172,0o21012,-1,-1,
  // MUNG
  5,0o52212,0o70212,0o44002,-1,-1,
  // OPEN
  11,0o42175,0o61000,0o10200,0,0o60175,0o61000,0o10200,0,
  0o54002,4,0o1000,
  // PICK
  4,0o40204,0o61007,0o20000,0o40,
  // PLUG
  4,0o70152,0o61002,-1,-1,
  // POKE
  7,0o60212,0o21000,0,0o200,0o44002,0,0o1000,
  // POUR
  25,0o42223,0o41000,0o400,0,
  0o60223,0o41000,0o400,0,0o61005,-1,-1,
  0o60223,0o41000,0o400,0,0o61016,-1,-1,
  0o60240,0o41000,0o400,0,0o61012,-1,-1,
  // PUMP
  4,0o40232,0o60007,-1,-1,
  // PUT
  16,0o72220,0o61005,-1,-1,0o70220,0o61016,-1,-1,
  0o40221,0o61006,-1,-1,0o70241,0o61010,-1,-1,
  // READ
  5,0o52155,0o40155,0o61007,-1,-1,
  // RAISE
  18,0o42144,0o71000,0o40000,0,
  0o60144,0o71000,0o40000,0,0o61002,-1,-1,
  0o60144,0o71000,0o40000,0,0o61016,-1,-1,
  // STRIKE/SWING
  12,0o60215,0o23000,0o40,0,0o44002,0,0o1000,
  0o42215,0o23000,0o40,0,0o50173,
  // TAKE
  7,0o60214,0o44000,0,0o1000,0o21003,0,0o200,
  // TELL
  11,0o42204,0o61000,0o20000,0o40,
  0o60204,0o61000,0o20000,0,0o61015,-1,-1,
  // THROW
  4,0o40217,0o20000,0,0o2000,
  // TIE
  21,0o62224,0o44000,-1,-1,0o21003,0o40,0,
  0o60224,0o44000,-1,-1,0o21016,0o40,0,
  0o60220,0o44000,-1,-1,0o61005,-1,-1,
  // TURN
  11,0o70162,0o61004,-1,-1,0o60163,0o21007,0o40,0,
  0o65002,4,0,
  // UNLOCK
  22,0o62164,0o61000,2,0,0o64002,4,0,
  0o40173,0o75012,0o100,0,0o40174,0o75013,0o100,0,
  0o60237,0o61000,2,0,0o20004,-1,-1,
  // WAKE
  7,0o60135,0o21000,-1,-1,0o74002,4,0,
  // ALARM
  8,0o42150,0o20000,0o40,0,0o40150,0o20007,0o40,0,
  // WAVE
  4,0o40154,0o40000,-1,-1,
  // WIND
  5,0o50233,0o40233,0o61007,-1,-1,
  // ENTER
  2,167,0o50126,
  // LEAVE
  2,168,0o50220,
  // MAKE
  1,0o50243,
  // OIL
  4,0o70244,0o41002,-1,-1,
  // PLAY
  5,0o50245,0o70245,0o75002,4,0,
  // SEND
  4,0o40246,0o61014,-1,-1,
  // SLIDE
  4,0o70241,0o61010,-1,-1,
  // SMELL
  1,0o50105,
  // SQUEEZE
  1,0o50104,
  // GET
  19,0o42204,0o61000,0o20000,0o40,
  0o40202,0o21005,0,2,0o40203,0o21015,0,2,
  0o60204,0o61000,0o20000,0o40,0o61015,-1,-1,
  // COUNT
  1,0o50141,
  // padding
  0,0,0,0,0,0,0,0,0,0,0,0,0,
];

// ---------------------------------------------------------------
// RDLINE — Read input line
// ---------------------------------------------------------------

/**
 * Read and prepare an input line. Converts to upper case.
 * In Fortran this reads from the terminal; here we delegate to G.input().
 * Returns { inbuf, inlnt } or null if empty.
 */
export async function rdline(G, who) {
  while (true) {
    if (who === 1) {
      G.output('>');
    }
    const raw = await G.input();
    if (raw == null) return null;
    const line = raw.trimEnd();
    if (line.length === 0) continue;
    G.inbuf = line.toUpperCase();
    G.inlnt = G.inbuf.length;
    G.prscon = 1;
    return { inbuf: G.inbuf, inlnt: G.inlnt };
  }
}

// ---------------------------------------------------------------
// LEX — Lexical analyzer
// ---------------------------------------------------------------

/**
 * Lexes the input buffer starting at prscon into an array of tokens.
 * Returns { success, outbuf[], outlen } or { success: false }.
 */
function lex(G, inline, inlen, vbflag) {
  const outbuf = new Array(LEXMAX).fill('');
  let op = 0; // output pointer (0-based)
  let cp = 0; // character pointer within current word

  while (true) {
    op++;
    cp = 0;

    while (true) {
      if (G.prscon > inlen) {
        // End of input
        if (G.prscon > inlen) G.prscon = 1;
        if (cp === 0 && op === 1) return { success: false, outbuf, outlen: 0 };
        if (cp === 0) op--;
        return { success: true, outbuf, outlen: op };
      }

      const ch = inline.charAt(G.prscon - 1);
      G.prscon++;

      // Check for substring delimiters
      if (ch === '"' || ch === "'") {
        // Substring handling
        if (G.sublnt !== 0) {
          if (vbflag) rspeak(G, 1046);
          return { success: false, outbuf, outlen: 0 };
        }
        // Skip leading spaces after quote
        while (G.prscon <= inlen && inline.charAt(G.prscon - 1) === ' ') {
          G.prscon++;
        }
        // Find closing quote
        const rest = inline.substring(G.prscon - 1);
        const closeIdx = rest.indexOf(ch);
        if (closeIdx <= 0) {
          if (vbflag) rspeak(G, 616);
          return { success: false, outbuf, outlen: 0 };
        }
        G.subbuf = rest.substring(0, closeIdx);
        G.sublnt = closeIdx;
        G.prscon += closeIdx + 1;
        // Treat as end of word
        if (cp !== 0) break;
        continue;
      }

      if (ch === ' ') {
        if (cp === 0) continue; // skip leading spaces
        break; // end of word
      }

      if (ch === '.' || ch === ';' || ch === '!' || ch === '?') {
        // End of command
        if (G.prscon > inlen) G.prscon = 1;
        if (cp === 0 && op === 1) return { success: false, outbuf, outlen: 0 };
        if (cp === 0) op--;
        return { success: true, outbuf, outlen: op };
      }

      if (ch === ',') {
        // Comma — insert AND
        if (cp !== 0) op++;
        if (op === 1) {
          if (vbflag) rspeak(G, 1047);
          return { success: false, outbuf, outlen: 0 };
        }
        if (op > LEXMAX) {
          if (vbflag) rspeak(G, 1048);
          return { success: false, outbuf, outlen: 0 };
        }
        outbuf[op - 1] = 'AND';
        break; // start next word
      }

      if (op > LEXMAX) {
        if (vbflag) rspeak(G, 1048);
        return { success: false, outbuf, outlen: 0 };
      }

      cp++;
      if (cp <= WRDLNT) {
        outbuf[op - 1] = outbuf[op - 1] + ch;
      }
    }
  }
}

// ---------------------------------------------------------------
// GETOBJ — Find object described by adj, name pair
// ---------------------------------------------------------------

function schlst(G, oidx, aidx, rm, cn, ad, spcobj) {
  let result = 0;
  let aempty = false;

  for (let i = 0; i < G.olnt; i++) {
    const obj = i + 1;
    if ((G.oflag1[i] & VISIBT) === 0) continue;
    if ((rm === 0 || !qhere(G, obj, rm)) &&
        (cn === 0 || G.ocan[i] !== cn) &&
        (ad === 0 || G.oadv[i] !== ad)) continue;

    if (thisit(G, oidx, aidx, obj, spcobj)) {
      if (result === 0) {
        result = obj;
      } else {
        if (aidx !== 0) return -result;
        if (noadjs(G, obj)) {
          if (noadjs(G, result)) return -result;
          // new has no adj, old does: new wins
        } else {
          aempty = true;
          // Don't update result, may be ambiguous later
          continue; // skip inner search for this object
        }
        result = obj;
      }
    }

    // If open or transparent, search contents
    if ((G.oflag1[i] & TRANBT) === 0 && (G.oflag2[i] & OPENBT) === 0) continue;

    for (let j = 0; j < G.olnt; j++) {
      if ((G.oflag1[j] & VISIBT) === 0) continue;
      if (!thisit(G, oidx, aidx, j + 1, spcobj)) continue;

      // Check containment chain
      let x = G.ocan[j];
      let found = false;
      while (x !== 0) {
        if (x === obj) { found = true; break; }
        if ((G.oflag1[x - 1] & VISIBT) === 0 ||
            ((G.oflag1[x - 1] & TRANBT) === 0 && (G.oflag2[x - 1] & OPENBT) === 0) ||
            (G.oflag2[x - 1] & 1) === 0) break; // SCHBT = 1
        x = G.ocan[x - 1];
      }
      if (!found) continue;

      if (result === 0) {
        result = j + 1;
      } else {
        if (aidx !== 0) return -result;
        if (noadjs(G, j + 1)) {
          if (noadjs(G, result)) return -result;
        } else {
          aempty = true;
          continue;
        }
        result = j + 1;
      }
    }
  }

  if (aempty && result !== 0 && !noadjs(G, result)) return -result;
  return result;
}

function thisit(G, oidx, aidx, obj, spcobj) {
  if (spcobj !== 0 && obj === spcobj) return true;
  if (oidx === 0) return false;

  // Check object names
  let i = oidx - 1; // convert to 0-based
  let found = false;
  while (i < OVOC.length) {
    if (Math.abs(OVOC[i]) === obj) { found = true; break; }
    i++;
    if (i >= OVOC.length || OVOC[i] >= 0) break; // end of group
  }
  if (!found) return false;

  // Check adjective if present
  if (aidx === 0) return true;
  i = aidx - 1;
  while (i < AVOC.length) {
    if (Math.abs(AVOC[i]) === obj) return true;
    i++;
    if (i >= AVOC.length || AVOC[i] >= 0) break;
  }
  return false;
}

function noadjs(G, obj) {
  for (let i = 0; i < AVOC.length; i++) {
    if (Math.abs(AVOC[i]) === obj) return false;
    if (AVOC[i] === 0) break;
  }
  return true;
}

function getobj(G, oidx, aidx, spcobj) {
  const av = G.avehic[G.winner - 1];
  let obj = 0;
  let chomp = false;

  if (lit(G, G.here)) {
    obj = schlst(G, oidx, aidx, G.here, 0, 0, spcobj);
    if (obj < 0) return obj;
    if (obj > 0) {
      if (av !== 0 && av !== obj && G.ocan[obj - 1] !== av &&
          (G.oflag2[obj - 1] & FINDBT) === 0) {
        chomp = true;
      }
    }
  }

  // Search vehicle
  if (av !== 0) {
    const nobj = schlst(G, oidx, aidx, 0, av, 0, spcobj);
    if (nobj < 0) { obj = nobj; }
    else if (nobj > 0) {
      chomp = false;
      if (obj !== nobj) {
        if (obj !== 0) obj = -nobj;
        else obj = nobj;
      }
    }
  }

  // Search adventurer
  const nobj = schlst(G, oidx, aidx, 0, 0, G.winner, spcobj);
  if (nobj < 0) { obj = nobj; }
  else if (nobj > 0) {
    if (obj === 0) obj = nobj;
    else if (aidx !== 0) obj = -nobj;
    else if (noadjs(G, obj) !== noadjs(G, nobj)) {
      if (!noadjs(G, obj)) obj = nobj;
    } else {
      obj = -nobj;
    }
  }

  if (chomp) obj = -10000;

  if (obj !== 0) return obj;

  // Search globals
  for (let i = G.strbit; i < G.olnt; i++) {
    if (!thisit(G, oidx, aidx, i + 1, spcobj)) continue;
    if (!ghere(G, i + 1, G.here)) continue;
    if (obj === 0) {
      obj = i + 1;
    } else {
      if (aidx !== 0) return -(i + 1);
      if (noadjs(G, obj) !== noadjs(G, i + 1)) {
        if (noadjs(G, obj)) continue;
        obj = i + 1;
      } else {
        return -(i + 1);
      }
    }
  }

  return obj;
}

// ---------------------------------------------------------------
// SPARSE — Main syntactic parse
// ---------------------------------------------------------------

function sparse(G, lbuf, llnt, vbflag) {
  let adj = 0;
  let adjptr = 0;
  let act = 0;
  let prep = 0;
  let pptr = 0;
  let obj1 = 0;
  let obj2 = 0;
  let prep1 = 0;
  let prep2 = 0;
  let lobj = 0;
  let andflg = false;
  let bunflg = false;

  let i = 0;

  while (i < llnt) {
    const word = lbuf[i];
    let errvoc = 0;
    i++;

    if (word === '' || word === ' ') continue;
    if (word === 'AND') {
      // AND handling
      if (adj !== 0) {
        // Dangling adjective — treat as object
        i--;
        const resolvedWord = AWORD[adjptr];
        adj = 0;
        const objResult = findObjWord(G, resolvedWord);
        if (objResult) {
          const obj = getobjFromResult(G, objResult.j, adj, 0);
          if (obj > 0) {
            assignObj(obj);
          }
        }
        continue;
      }
      if (prep !== 0 || pptr !== 1) {
        if (vbflag) rspeak(G, 1049);
        G.telflg = true;
        G.bunsub = 0;
        return -1;
      }
      andflg = true;
      continue;
    }

    if (word === 'EXCEPT' || word === 'BUT') {
      if (adj !== 0) { i--; adj = 0; continue; }
      if (andflg || bunflg || pptr !== 1 || i >= llnt) {
        if (vbflag) {
          G.output(` Misplaced "${word.toLowerCase()}".`);
          G.telflg = true;
        }
        G.bunsub = 0;
        return -1;
      }
      if (i < llnt && lbuf[i] === 'FOR') i++;
      if (i >= llnt) {
        if (vbflag) {
          G.output(` Misplaced "${word.toLowerCase()}".`);
          G.telflg = true;
        }
        G.bunsub = 0;
        return -1;
      }
      if (obj1 !== EVERY && obj1 !== VALUA && obj1 !== POSSE) {
        if (vbflag) {
          G.output(` "${word}" can only be used with "everything", "valuables", or "possessions".`);
          G.telflg = true;
        }
        G.bunsub = 0;
        return -1;
      }
      andflg = true;
      bunflg = true;
      G.bunlnt = 0;
      G.bunsub = obj1;
      continue;
    }

    // Check buzz words
    if (BWORD.includes(word)) continue;

    // Check for verb
    let verbFound = false;
    {
      let j = 0;
      for (let k = 0; k < VWORD.length; k++) {
        if (VWORD[k] === '') { if (VVOC[j] !== undefined) j += VVOC[j] + 1; continue; }
        if (VWORD[k].charAt(0) === '*') {
          if (word === VWORD[k].substring(1)) {
            // Found verb synonym
            if (act !== 0) {
              errvoc = 624;
              // Fall through to try as direction/object
            } else {
              act = j + 1; // 1-based index into VVOC
              G.oact = 0;
              andflg = false;
              verbFound = true;
              break;
            }
          }
        } else {
          if (word === VWORD[k]) {
            if (act !== 0) {
              errvoc = 624;
            } else {
              act = j + 1;
              G.oact = 0;
              andflg = false;
              verbFound = true;
              break;
            }
          }
          j += VVOC[j] + 1;
        }
      }
    }
    if (verbFound) continue;

    // Check for direction (only if no adj/prep/obj yet, or verb is WALK)
    if (adj === 0 && prep === 0 && obj1 === 0) {
      let dirFound = false;
      if (act === 0 || (act > 0 && (VVOC[act] & SVMASK) === WALKW)) {
        for (let j = 0; j < DWORD.length; j++) {
          if (DWORD[j] === '' || DWORD[j] === ' ') continue;
          if (word === DWORD[j]) {
            const obj = DVOC[j];
            // Find the walk syntax
            if (act === 0) {
              act = 1;
              let a = 0;
              while (a < VVOC.length) {
                if (VVOC[a] === 0) break;
                if ((VVOC[a + 1] & SVMASK) === WALKW) { act = a + 1; break; }
                a += VVOC[a] + 1;
              }
            }
            // Treat direction as object
            if (pptr === 2) {
              if (vbflag) rspeak(G, 617);
              G.telflg = true;
              G.bunsub = 0;
              return -1;
            }
            pptr++;
            if (pptr === 1) prep1 = prep;
            else prep2 = prep;
            if (pptr === 1) obj1 = obj;
            else obj2 = obj;
            prep = 0;
            adj = 0;
            andflg = false;
            lobj = obj;
            dirFound = true;
            break;
          }
        }
      }
      if (dirFound) continue;
    }

    // Check for preposition
    let prepFound = false;
    for (let j = 0; j < PWORD.length; j++) {
      if (PWORD[j] === '' || PWORD[j] === ' ') continue;
      if (word === PWORD[j]) {
        if (adj !== 0) {
          // Dangling adjective — back up and try as object
          i--;
          const resolvedWord = AWORD[adjptr];
          adj = 0;
          // Try resolvedWord as object word
          const oresult = findObjWord(G, resolvedWord);
          if (oresult) {
            const obj = getobj(G, oresult.j, 0, 0);
            if (obj > 0) {
              if (andflg) {
                if (!bunflg) {
                  if (pptr === 1) G.bunvec[0] = obj1;
                  G.bunlnt = 1;
                  bunflg = true;
                  G.bunsub = 0;
                }
                G.bunlnt++;
                if (G.bunlnt > BUNMAX) {
                  if (vbflag) rspeak(G, 617);
                  G.telflg = true;
                  G.bunsub = 0;
                  return -1;
                }
                G.bunvec[G.bunlnt - 1] = obj;
              } else {
                if (pptr === 2) {
                  if (vbflag) rspeak(G, 617);
                  G.telflg = true;
                  G.bunsub = 0;
                  return -1;
                }
                pptr++;
                if (pptr === 1) { prep1 = prep; obj1 = obj; }
                else { prep2 = prep; obj2 = obj; }
              }
              prep = 0;
              adj = 0;
              andflg = false;
              lobj = obj;
            }
          }
          continue;
        }
        if (andflg) {
          if (vbflag) rspeak(G, 1049);
          G.telflg = true;
          G.bunsub = 0;
          return -1;
        }
        if (prep !== 0) continue; // ignore duplicate prep
        prep = PVOC[j];
        prepFound = true;
        break;
      }
    }
    if (prepFound) continue;

    // Check for adjective
    let adjFound = false;
    {
      let j = 0;
      for (let k = 0; k < AWORD.length; k++) {
        if (AWORD[k] === '' || AWORD[k] === ' ') { if (j < AVOC.length && AVOC[j] >= 0) j++; while (j < AVOC.length && AVOC[j] < 0) j++; continue; }
        if (word === AWORD[k]) {
          adj = j + 1; // 1-based index into AVOC
          adjptr = k;
          adjFound = true;
          break;
        }
        // Advance past this entry's objects
        j++;
        while (j < AVOC.length && AVOC[j] < 0) j++;
      }
    }
    if (adjFound) continue;

    // Check for object
    let objFound = false;
    {
      let j = 0;
      for (let k = 0; k < OWORD.length; k++) {
        if (OWORD[k] === '' || OWORD[k] === ' ') { if (j < OVOC.length && OVOC[j] >= 0) j++; while (j < OVOC.length && OVOC[j] < 0) j++; continue; }
        if (word === OWORD[k]) {
          // Found object word — identify it
          const obj = getobj(G, j + 1, adj, 0);

          if (obj <= 0) {
            // Can't identify object
            if (obj === 0) {
              if (!lit(G, G.here)) {
                if (vbflag) rspeak(G, 579);
              } else {
                const adjStr = adj !== 0 ? ' ' + AWORD[adjptr].toLowerCase() : '';
                if (vbflag) G.output(` I can't see any${adjStr} ${word.toLowerCase()} here.`);
              }
            } else if (obj === -10000) {
              if (vbflag) rspsub(G, 620, G.odesc2[G.avehic[G.winner - 1] - 1]);
            } else {
              // Ambiguous
              if (act === 0) act = G.oflag & G.oact;
              G.oflag = -1;
              G.oact = act;
              G.oprep1 = prep1;
              G.oobj1 = obj1;
              G.oprep = prep;
              G.oname = word;
              G.oprep2 = 0;
              G.oobj2 = 0;
              const adjStr = adj !== 0 ? ' ' + AWORD[adjptr].toLowerCase() : '';
              if (vbflag) G.output(` Which${adjStr} ${word.toLowerCase()} do you mean?`);
            }
            G.telflg = true;
            G.bunsub = 0;
            return -1;
          }

          // Handle "it"
          if (obj === ITOBJ) {
            if (G.oflag !== 0 && G.oobj1 !== 0) G.lastit = G.oobj1;
            const resolved = getobj(G, 0, 0, G.lastit);
            if (resolved <= 0) {
              if (resolved < 0) {
                // ambiguous/unreachable
                if (vbflag) G.output(` Which ${word.toLowerCase()} do you mean?`);
              } else {
                if (!lit(G, G.here)) {
                  if (vbflag) rspeak(G, 1076);
                } else {
                  if (vbflag) rspsub(G, 1077, G.odesc2[G.lastit - 1]);
                }
              }
              G.telflg = true;
              G.bunsub = 0;
              return -1;
            }
            assignObjToSlot(resolved);
            objFound = true;
            break;
          }

          // Handle "of" preposition
          if (prep === 9) {
            if (lobj === obj || lobj === G.ocan[obj - 1]) {
              // Same as previous — ok
            } else if (lobj === EVERY && (obj === VALUA || obj === POSSE)) {
              if (pptr === 2) {
                if (vbflag) rspeak(G, 617);
                G.telflg = true;
                G.bunsub = 0;
                return -1;
              }
              pptr++;
              if (pptr === 1) { prep1 = prep; obj1 = obj; }
              else { prep2 = prep; obj2 = obj; }
            } else {
              if (vbflag) rspeak(G, 601);
              G.telflg = true;
              G.bunsub = 0;
              return -1;
            }
            prep = 0;
            adj = 0;
            andflg = false;
            lobj = obj;
            objFound = true;
            break;
          }

          // Handle AND
          if (andflg) {
            if (bunflg) {
              G.bunlnt++;
              if (G.bunlnt > BUNMAX) {
                if (vbflag) rspeak(G, 617);
                G.telflg = true;
                G.bunsub = 0;
                return -1;
              }
              G.bunvec[G.bunlnt - 1] = obj;
            } else {
              G.bunvec[0] = pptr === 1 ? obj1 : obj2;
              G.bunlnt = 1;
              bunflg = true;
              G.bunsub = 0;
              G.bunlnt++;
              if (G.bunlnt > BUNMAX) {
                if (vbflag) rspeak(G, 617);
                G.telflg = true;
                G.bunsub = 0;
                return -1;
              }
              G.bunvec[G.bunlnt - 1] = obj;
            }
          } else {
            if (pptr === 2) {
              if (vbflag) rspeak(G, 617);
              G.telflg = true;
              G.bunsub = 0;
              return -1;
            }
            pptr++;
            if (pptr === 1) { prep1 = prep; obj1 = obj; }
            else { prep2 = prep; obj2 = obj; }
          }

          prep = 0;
          adj = 0;
          andflg = false;
          lobj = obj;
          objFound = true;
          break;
        }
        // Advance past this entry's objects
        j++;
        while (j < OVOC.length && OVOC[j] < 0) j++;
      }
    }
    if (objFound) continue;

    // Not recognizable
    if (!vbflag) return -1;
    G.output(` I don't understand "${word.toLowerCase()}".`);
    if (errvoc) rspeak(G, errvoc);
    G.telflg = true;
    G.bunsub = 0;
    return -1;
  }

  // End of parse — handle dangling adjective
  if (adj !== 0) {
    // Try as object word
    const resolvedWord = AWORD[adjptr];
    adj = 0;
    const oresult = findObjWord(G, resolvedWord);
    if (oresult) {
      const obj = getobj(G, oresult.j, 0, 0);
      if (obj > 0) {
        if (pptr === 2) {
          if (vbflag) rspeak(G, 617);
          G.telflg = true;
          G.bunsub = 0;
          return -1;
        }
        pptr++;
        if (pptr === 1) { prep1 = prep; obj1 = obj; }
        else { prep2 = prep; obj2 = obj; }
        prep = 0;
        lobj = obj;
        andflg = false;
      }
    }
  }

  if (bunflg) obj1 = BUNOBJ;
  if (bunflg && G.bunsub !== 0 && G.bunlnt === 0) {
    if (vbflag) rspeak(G, 619);
    G.telflg = true;
    G.bunsub = 0;
    return -1;
  }

  if (act === 0) act = G.oflag !== 0 ? G.oact : 0;
  if (act === 0) {
    // No action
    if (obj1 !== 0) {
      if (vbflag) rspsub(G, 621, G.odesc2[obj1 - 1]);
      G.oflag = -1;
      G.oact = 0;
      G.oprep1 = prep1;
      G.oobj1 = obj1;
      G.oprep = 0;
      G.oname = ' ';
      G.oprep2 = 0;
      G.oobj2 = 0;
    } else {
      if (vbflag) rspeak(G, 622);
      G.telflg = true;
      G.bunsub = 0;
    }
    return -1;
  }

  // Check for simple direction (WALK + direction obj)
  if ((VVOC[act] & SVMASK) === WALKW && obj1 >= XMIN) {
    if (obj2 !== 0 || prep1 !== 0 || prep2 !== 0) {
      if (vbflag) rspeak(G, 618);
      G.telflg = true;
      G.bunsub = 0;
      return -1;
    }
    G.prsa = WALKW;
    G.prso = obj1;
    return 1; // direct success
  }

  // Handle dangling preposition
  if (prep !== 0) {
    if (pptr === 0 || (pptr === 1 && prep1 !== 0) || (pptr === 2 && prep2 !== 0)) {
      // Orphan the prep
      G.oflag = -1;
      G.oact = act;
      G.oprep1 = 0;
      G.oobj1 = 0;
      G.oprep = prep;
      G.oname = ' ';
      G.oprep2 = 0;
      G.oobj2 = 0;
    } else if (pptr > 0) {
      // Convert to 'pick up frob'
      if (pptr === 1) prep1 = prep;
      else prep2 = prep;
    }
  }

  // Store results in game state for SYNMCH
  G._sparseAct = act;
  G._sparseObj1 = obj1;
  G._sparseObj2 = obj2;
  G._sparsePrep1 = prep1;
  G._sparsePrep2 = prep2;
  return 0; // needs validation

  // Helper: assign object to slot
  function assignObjToSlot(obj) {
    if (andflg) {
      if (!bunflg) {
        G.bunvec[0] = pptr === 1 ? obj1 : 0;
        G.bunlnt = 1;
        bunflg = true;
        G.bunsub = 0;
      }
      G.bunlnt++;
      if (G.bunlnt > BUNMAX) return;
      G.bunvec[G.bunlnt - 1] = obj;
    } else {
      if (pptr === 2) return;
      pptr++;
      if (pptr === 1) { prep1 = prep; obj1 = obj; }
      else { prep2 = prep; obj2 = obj; }
    }
    prep = 0;
    adj = 0;
    andflg = false;
    lobj = obj;
  }

  function assignObj(obj) {
    assignObjToSlot(obj);
  }
}

// Helper: find an object word in OWORD, return { j } index into OVOC
function findObjWord(G, word) {
  let j = 0;
  for (let k = 0; k < OWORD.length; k++) {
    if (OWORD[k] === '' || OWORD[k] === ' ') {
      if (j < OVOC.length && OVOC[j] >= 0) j++;
      while (j < OVOC.length && OVOC[j] < 0) j++;
      continue;
    }
    if (word === OWORD[k]) return { j: j + 1, k };
    j++;
    while (j < OVOC.length && OVOC[j] < 0) j++;
  }
  return null;
}

// ---------------------------------------------------------------
// SYNMCH — Syntax matcher
// ---------------------------------------------------------------

function unpack(G, oldj) {
  // Clear syntax variables
  G._vflag = 0;
  G._dobj = 0; G._dfl1 = 0; G._dfl2 = 0; G._dfw1 = 0; G._dfw2 = 0;
  G._iobj = 0; G._ifl1 = 0; G._ifl2 = 0; G._ifw1 = 0; G._ifw2 = 0;

  G._vflag = VVOC[oldj - 1];
  let j = oldj;

  if ((G._vflag & SDIR) === 0) return j + 1;
  G._dfl1 = -1;
  G._dfl2 = -1;

  if ((G._vflag & SSTD) !== 0) {
    G._dfw1 = -1;
    G._dfw2 = -1;
    G._dobj = VABIT | VRBIT | VFBIT;
  } else {
    G._dobj = VVOC[j]; j++;
    G._dfw1 = VVOC[j]; j++;
    G._dfw2 = VVOC[j]; j++;
    if ((G._dobj & VEBIT) !== 0) {
      G._dfl1 = G._dfw1;
      G._dfl2 = G._dfw2;
    }
  }

  if ((G._vflag & SIND) === 0) return j + 1;
  G._ifl1 = -1;
  G._ifl2 = -1;
  G._iobj = VVOC[j]; j++;
  G._ifw1 = VVOC[j]; j++;
  G._ifw2 = VVOC[j]; j++;
  if ((G._iobj & VEBIT) !== 0) {
    G._ifl1 = G._ifw1;
    G._ifl2 = G._ifw2;
  }

  return j + 1;
}

function syneql(G, prep, obj, sprep, sfl1, sfl2) {
  if (obj === 0) {
    return prep === 0 && sfl1 === 0 && sfl2 === 0;
  }
  if (obj < 0 || obj > G.olnt + 100) return false; // safety
  const objIdx = obj <= G.olnt ? obj - 1 : 0;
  return (prep === (sprep & VPMASK)) &&
    (((sfl1 & (G.oflag1[objIdx] || 0)) | (sfl2 & (G.oflag2[objIdx] || 0))) !== 0);
}

function gwim(G, sflag, sfw1, sfw2) {
  if (G.deadf) return 0;
  const av = G.avehic[G.winner - 1];
  let result = 0;
  const nocare = (sflag & VCBIT) === 0;

  if ((sflag & VABIT) !== 0) {
    result = fwim(G, sfw1, sfw2, 0, 0, G.winner, nocare);
  }
  if (result < 0 || !lit(G, G.here) || (sflag & VRBIT) === 0) return result;

  const robj = fwim(G, sfw1, sfw2, G.here, 0, 0, nocare);
  if (robj < 0) return robj;
  if (robj === 0) return result;

  if (av !== 0 && robj !== av && (G.oflag2[robj - 1] & FINDBT) === 0) {
    if (G.ocan[robj - 1] !== av) return result;
  }
  if (result !== 0) return -result;
  return robj;
}

function synmch(G) {
  const act = G._sparseAct;
  let obj1 = G._sparseObj1;
  let obj2 = G._sparseObj2;
  const prep1 = G._sparsePrep1;
  const prep2 = G._sparsePrep2;

  let j = act; // start of syntax
  const limit = j + VVOC[j - 1]; // end of syntax block
  j++; // skip length

  let drive = 0;
  let dforce = 0;
  const qprep = G.oflag !== 0 ? G.oprep : 0;

  while (j <= limit) {
    const newj = unpack(G, j);
    const sprep = G._dobj & VPMASK;

    if (syneql(G, prep1, obj1, G._dobj, G._dfl1, G._dfl2)) {
      // Direct match — try indirect
      const isprep = G._iobj & VPMASK;
      if (syneql(G, prep2, obj2, G._iobj, G._ifl1, G._ifl2)) {
        // Both match
        return finishSynmch(G, obj1, obj2);
      }
      // Indirect fails
      if (obj2 !== 0) { j = newj; continue; }
      // Try defaults
      if (qprep === 0 || qprep === isprep) dforce = j;
      if ((G._vflag & SDRIV) !== 0) drive = j;
      j = newj;
      continue;
    }

    // Direct-as-indirect
    if (obj2 === 0 && obj1 !== 0 && syneql(G, prep1, obj1, G._iobj, G._ifl1, G._ifl2)) {
      obj2 = obj1;
      obj1 = 0;
      drive = j;
      // Try to get direct via GWIM
      break;
    }

    if (obj1 !== 0) { j = newj; continue; }
    // No direct object
    if (qprep === 0 || qprep === sprep) dforce = j;
    if ((G._vflag & SDRIV) !== 0) drive = j;
    j = newj;
  }

  // Match failed — try defaults
  if (drive === 0) drive = dforce;
  if (drive === 0) {
    rspeak(G, 601);
    G.bunsub = 0;
    return false;
  }

  unpack(G, drive);

  // Try to fill direct object
  if ((G._vflag & SDIR) !== 0 && obj1 === 0) {
    obj1 = G.oflag !== 0 ? G.oobj1 : 0;
    if (obj1 !== 0 && syneql(G, G.oprep1 || 0, obj1, G._dobj, G._dfl1, G._dfl2)) {
      // Orphan works
    } else {
      obj1 = gwim(G, G._dobj, G._dfw1, G._dfw2);
      if (obj1 <= 0) {
        G.oflag = -1;
        G.oact = act;
        G.oprep1 = 0;
        G.oobj1 = 0;
        G.oprep = G._dobj & VPMASK;
        G.oname = ' ';
        G.oprep2 = prep2;
        G.oobj2 = obj2;
        G.bunsub = 0;
        // Print "verb what?"
        const vb = findVerbString(act);
        G.output(` ${vb} what?`);
        G.telflg = true;
        return false;
      }
    }
  }

  // Try to fill indirect object
  if ((G._vflag & SIND) !== 0 && obj2 === 0) {
    obj2 = G.oflag !== 0 ? G.oobj2 : 0;
    if (obj2 !== 0 && syneql(G, G.oprep2 || 0, obj2, G._iobj, G._ifl1, G._ifl2)) {
      // Orphan works
    } else {
      obj2 = gwim(G, G._iobj, G._ifw1, G._ifw2);
      if (obj2 <= 0) {
        G.oflag = -1;
        G.oact = act;
        G.oprep1 = prep1;
        G.oobj1 = obj1;
        G.oprep = G._iobj & VPMASK;
        G.oname = ' ';
        G.oprep2 = 0;
        G.oobj2 = 0;
        G.bunsub = 0;
        const vb = findVerbString(act);
        G.output(` ${vb} what?`);
        G.telflg = true;
        return false;
      }
    }
  }

  return finishSynmch(G, obj1, obj2);

  function finishSynmch(G, o1, o2) {
    if ((G._vflag & SFLIP) !== 0) {
      const tmp = o1; o1 = o2; o2 = tmp;
    }
    G.prsa = G._vflag & SVMASK;
    G.prso = o1;
    G.prsi = o2;
    // TODO: takeit for prso/prsi
    return true;
  }
}

// Find verb string for a given syntax index (for error messages)
function findVerbString(syntaxIdx) {
  let j = 0;
  for (let k = 0; k < VWORD.length; k++) {
    if (VWORD[k] === '') continue;
    if (VWORD[k].charAt(0) === '*') continue;
    const newj = j + VVOC[j] + 1;
    if (j + 1 <= syntaxIdx && syntaxIdx < newj + 1) {
      let str = VWORD[k];
      if (str.charAt(0) === '*') str = str.substring(1);
      return str.toLowerCase();
    }
    j = newj;
  }
  return 'do';
}

// ---------------------------------------------------------------
// PARSE — Top level parse routine
// ---------------------------------------------------------------

let bakbuf = ['L'];
let baklen = 1;

/**
 * PARSE(inline, inlen, vbflag) — Parse input.
 * Returns true if parse succeeded, false otherwise.
 * Sets G.prsa, G.prso, G.prsi.
 */
export function parse(G, inline, inlen, vbflag) {
  G.prsa = 0;
  G.prsi = 0;
  G.prso = 0;

  const lexResult = lex(G, inline, inlen, vbflag);
  if (!lexResult.success) return false;

  let { outbuf, outlen } = lexResult;

  // Handle AGAIN
  if (outlen === 1 && outbuf[0] === 'AGAIN') {
    outbuf = [...bakbuf];
    outlen = baklen;
  }

  const sparseResult = sparse(G, outbuf, outlen, vbflag);
  if (sparseResult < 0) return false;
  if (sparseResult > 0) {
    // Direct success (simple direction)
    // Clear orphans
    G.oflag = 0; G.oact = 0; G.oprep1 = 0; G.oobj1 = 0;
    G.oprep = 0; G.oname = ' '; G.oprep2 = 0; G.oobj2 = 0;
    bakbuf = [...outbuf];
    baklen = outlen;
    if (G.prso === BUNOBJ) G.lastit = G.bunvec[0];
    if (G.prso > 0 && G.prso < BUNOBJ) G.lastit = G.prso;
    return true;
  }

  // Needs validation via SYNMCH
  if (!vbflag) {
    // Echo mode — force fail
    G.oflag = 0; G.oact = 0; G.oprep1 = 0; G.oobj1 = 0;
    G.oprep = 0; G.oname = ' '; G.oprep2 = 0; G.oobj2 = 0;
    bakbuf = [...outbuf];
    baklen = outlen;
    return false;
  }

  if (!synmch(G)) {
    G.prscon = 1;
    return false;
  }

  // Clear orphans
  G.oflag = 0; G.oact = 0; G.oprep1 = 0; G.oobj1 = 0;
  G.oprep = 0; G.oname = ' '; G.oprep2 = 0; G.oobj2 = 0;
  bakbuf = [...outbuf];
  baklen = outlen;
  if (G.prso === BUNOBJ) G.lastit = G.bunvec[0];
  if (G.prso > 0 && G.prso < BUNOBJ) G.lastit = G.prso;
  return true;
}
