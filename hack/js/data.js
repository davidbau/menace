// C ref: hack.vars — monster table, item arrays, strings
import { WANDNUM, SCRNUM, RINGNUM, GEMNUM } from './const.js';

// Monster table: mon[8][7] — 8 difficulty levels, 7 monsters each
// Fields: { mname, mlet, mhd, mmove, ac, damn, damd }
// C ref: hack.vars struct permonst mon[8][7]
export const mon = [
  [ // level 0 — easiest
    { mname: 'bat',        mlet: 'B', mhd: 1, mmove: 22, ac: 8, damn: 1, damd: 4 },
    { mname: 'gnome',      mlet: 'G', mhd: 1, mmove:  6, ac: 5, damn: 1, damd: 6 },
    { mname: 'hobgoblin',  mlet: 'H', mhd: 1, mmove:  9, ac: 5, damn: 1, damd: 8 },
    { mname: 'jackal',     mlet: 'J', mhd: 0, mmove: 12, ac: 7, damn: 1, damd: 2 },
    { mname: 'kobold',     mlet: 'K', mhd: 1, mmove:  6, ac: 7, damn: 1, damd: 4 },
    { mname: 'leprechaun', mlet: 'L', mhd: 1, mmove: 15, ac: 8, damn: 1, damd: 5 },
    { mname: 'giant rat',  mlet: 'r', mhd: 0, mmove: 12, ac: 7, damn: 1, damd: 3 },
  ],
  [ // level 1
    { mname: 'acid blob',    mlet: 'a', mhd: 2, mmove:  3, ac: 8, damn: 0, damd: 0 },
    { mname: 'floating eye', mlet: 'E', mhd: 2, mmove:  1, ac: 9, damn: 0, damd: 0 },
    { mname: 'homonculous',  mlet: 'h', mhd: 2, mmove:  6, ac: 6, damn: 1, damd: 3 },
    { mname: 'imp',          mlet: 'i', mhd: 2, mmove:  6, ac: 2, damn: 1, damd: 4 },
    { mname: 'orc',          mlet: 'O', mhd: 2, mmove:  9, ac: 6, damn: 1, damd: 8 },
    { mname: 'yellow light', mlet: 'y', mhd: 3, mmove: 15, ac: 0, damn: 0, damd: 0 },
    { mname: 'zombie',       mlet: 'Z', mhd: 2, mmove:  6, ac: 8, damn: 1, damd: 8 },
  ],
  [ // level 2
    { mname: 'giant ant',     mlet: 'A', mhd: 3, mmove: 18, ac: 3, damn: 1, damd: 6 },
    { mname: 'fog cloud',     mlet: 'f', mhd: 3, mmove:  1, ac: 0, damn: 1, damd: 6 },
    { mname: 'nymph',         mlet: 'N', mhd: 3, mmove: 12, ac: 9, damn: 1, damd: 4 },
    { mname: 'piercer',       mlet: 'p', mhd: 3, mmove:  1, ac: 3, damn: 2, damd: 6 },
    { mname: 'quasit',        mlet: 'Q', mhd: 3, mmove: 15, ac: 3, damn: 1, damd: 4 },
    { mname: 'quivering blob',mlet: 'q', mhd: 3, mmove:  1, ac: 8, damn: 1, damd: 8 },
    { mname: 'violet fungi',  mlet: 'v', mhd: 3, mmove:  1, ac: 7, damn: 1, damd: 4 },
  ],
  [ // level 3
    { mname: 'giant beetle', mlet: 'b', mhd: 4, mmove:  6, ac: 4, damn: 3, damd: 4 },
    { mname: 'centaur',      mlet: 'C', mhd: 4, mmove: 18, ac: 4, damn: 1, damd: 6 },
    { mname: 'cockatrice',   mlet: 'c', mhd: 4, mmove:  6, ac: 6, damn: 1, damd: 3 },
    { mname: 'gelatenous cube', mlet: 'g', mhd: 4, mmove: 6, ac: 8, damn: 2, damd: 4 },
    { mname: 'jaguar',       mlet: 'j', mhd: 4, mmove: 15, ac: 6, damn: 1, damd: 8 },
    { mname: 'killer bee',   mlet: 'k', mhd: 4, mmove:  6, ac: 4, damn: 2, damd: 4 },
    { mname: 'snake',        mlet: 'S', mhd: 4, mmove: 15, ac: 3, damn: 1, damd: 6 },
  ],
  [ // level 4
    { mname: 'freezing sphere', mlet: 'F', mhd: 2, mmove: 13, ac: 4, damn: 0, damd: 0 },
    { mname: 'owlbear',         mlet: 'o', mhd: 5, mmove: 12, ac: 5, damn: 2, damd: 6 },
    { mname: 'rust monster',    mlet: 'R', mhd: 5, mmove: 18, ac: 3, damn: 0, damd: 0 },
    { mname: 'giant scorpion',  mlet: 's', mhd: 5, mmove: 15, ac: 3, damn: 1, damd: 4 },
    { mname: 'teleporter',      mlet: 't', mhd: 5, mmove:  3, ac: 5, damn: 1, damd: 7 },
    { mname: 'wraith',          mlet: 'W', mhd: 5, mmove: 12, ac: 5, damn: 1, damd: 6 },
    { mname: 'yeti',            mlet: 'Y', mhd: 5, mmove: 15, ac: 6, damn: 1, damd: 6 },
  ],
  [ // level 5
    { mname: 'displacer beast', mlet: 'd', mhd: 6, mmove: 15, ac: 4, damn: 2, damd: 4 },
    { mname: 'leocrotta',       mlet: 'l', mhd: 6, mmove: 18, ac: 4, damn: 3, damd: 6 },
    { mname: 'mimic',           mlet: 'M', mhd: 7, mmove:  3, ac: 7, damn: 3, damd: 4 },
    { mname: 'minotaur',        mlet: 'm', mhd: 6, mmove: 12, ac: 6, damn: 2, damd: 8 },
    { mname: 'purple worm',     mlet: 'P', mhd: 7, mmove:  9, ac: 6, damn: 2, damd: 4 },
    { mname: 'troll',           mlet: 'T', mhd: 7, mmove: 12, ac: 4, damn: 1, damd: 8 },
    { mname: 'umber hulk',      mlet: 'U', mhd: 9, mmove:  6, ac: 2, damn: 3, damd: 4 },
  ],
  [ // level 6
    { mname: 'vampire',         mlet: 'V', mhd: 8, mmove: 12, ac: 1, damn: 1, damd: 8 },
    { mname: 'xorn',            mlet: 'X', mhd: 8, mmove:  9, ac: 2, damn: 1, damd: 3 },
    { mname: 'erinyes',         mlet: 'e', mhd: 9, mmove:  9, ac: 3, damn: 3, damd: 6 },
    { mname: 'stalker',         mlet: 'n', mhd: 8, mmove: 12, ac: 3, damn: 2, damd: 6 },
    { mname: 'disenchanter',    mlet: 'D', mhd:10, mmove: 12, ac: 4, damn: 3, damd:10 },
    { mname: 'flaming sphere',  mlet: 'I', mhd: 7, mmove: 12, ac: 3, damn: 2, damd: 8 },
    { mname: 'giant',           mlet: 'w', mhd: 6, mmove:  6, ac: 0, damn: 2, damd:10 },
  ],
  [ // level 7 — hardest
    { mname: 'black pudding',   mlet: ',', mhd:11, mmove:  6, ac: 6, damn: 3, damd: 8 },
    { mname: 'jabberwock',      mlet: 'J', mhd:15, mmove: 12, ac: 2, damn: 3, damd:10 },
    { mname: 'dragon',          mlet: 'D', mhd:10, mmove:  9, ac: 2, damn: 3, damd: 8 },
    { mname: 'death',           mlet: '&', mhd:20, mmove:  9, ac: 0, damn: 4, damd: 8 },
    { mname: 'demon',           mlet: '&', mhd:15, mmove: 12, ac: -2,damn: 3, damd:10 },
    { mname: 'cockatrice',      mlet: 'c', mhd: 4, mmove:  6, ac: 6, damn: 1, damd: 3 },
    { mname: 'death ray',       mlet: '~', mhd:20, mmove:  3, ac: 3, damn: 4, damd: 6 },
  ],
];

// C ref: hack.vars char *armnam[] — 6 entries; accessed as armnam[obj.otyp - 2]
export const armnam = [
  'leather',
  'ring',
  'scale',
  'chain',
  'splint',
  'plate',
];

// C ref: hack.vars char *foodnam[]
export const foodnam = [
  'food ration',
  'fruit',
];

// C ref: hack.vars char *wepnam[]
// C ref: hack.vars char *wepnam[] — indices match otyp for ')' items
export const wepnam = [
  'arrow',       // 0 — WARROW
  'sling bullet',// 1
  'crossbow bolt',// 2
  'dart',        // 3 — WDART
  'mace',        // 4
  'axe',         // 5
  'flail',       // 6
  'long sword',  // 7
  'two handed sword', // 8
  'dagger',      // 9
  'spear',       // 10
  'bow',         // 11
  'sling',       // 12
  'crossbow',    // 13
];

// C ref: hack.vars char wsdam[], wldam[]
// Small/large damage by weapon type (die size for rnd())
export const wsdam = [ 6, 4, 4, 3, 6, 6, 6, 8, 10, 4, 6, 4, 6, 4 ];
export const wldam = [ 6, 6, 6, 2, 6, 4, 4, 12, 6, 3, 8, 6, 6, 6 ];

// C ref: hack.vars char mlarge[]
// Monsters that are "large" (take more damage from large weapons)
export const mlarge = 'CGHJMOPTUXYZeglmnow&';

// C ref: hack.vars char *pottyp[]
export const pottyp = [
  'restore strength',
  'restore strength',    // duplicate (two entries in C)
  'extra healing',
  'healing',
  'gain level',
  'confusion',
  'blindness',
  'gain strength',
  'polymorph',
  'speed',
  'gain strength',
  'levitation',
  'poison',
  'see invisible',
  'paralysis',
];

// C ref: hack.vars char *scrtyp[]
export const scrtyp = [
  'enchant weapon',
  'enchant armor',
  'blank paper',
  'identify',
  'teleportation',
  'scare monster',
  'gold detection',
  'food detection',
  'aggravate monsters',
  'create monster',
  'remove curse',
  'destroy armor',
  'genocide',
  'confuse monster',
  'curse',
];

// C ref: hack.vars char *traps[]
export const traps = [
  'bear trap',
  'arrow trap',
  'dart trap',
  'trapdoor',
  'teleport trap',
  'pit',
  'sleeping gas trap',
];

// C ref: hack.vars char *wantyp[]
export const wantyp = [
  'light',
  'secret door + trap detection',
  'create monster',
  'striking',
  'slow monster',
  'speed monster',
  'undead turning',
  'polymorph',
  'cancelation',
  'teleport monster',
  'digging',
  'magic missile',
  'fire',
  'sleep',
  'cold',
  'death',
];

// C ref: hack.vars char *ringtyp[]
export const ringtyp = [
  'adornment',
  'teleportation',
  'regeneration',
  'searching',
  'see invisible',
  'stealth',
  'floating',
  'poison resistance',
  'aggrivate monster',
  'hunger',
  'fire resistance',
  'cold resistance',
  'protection from shape-changers',
  'gain strength',
  'increase damage',
  'protection',
  'increase hit points',
];

// C ref: hack.vars char *potcol[] (potion colors / gem types used for shuffle)
// Must match C exactly: ebony/magenta/clear/emerald/ruby/swirly/white/yellow/purple/puce/pink/smokey/glowing/bubbly/orange
export const potcol = [
  'ebony',
  'magenta',
  'clear',
  'emerald',
  'ruby',
  'swirly',
  'white',
  'yellow',
  'purple',
  'puce',
  'pink',
  'smokey',
  'glowing',
  'bubbly',
  'orange',
];

// C ref: hack.vars char *scrnam[] — scroll label names shuffled at game start
// C array has 16 entries; shufl(scrnam, SCRNUM=15) shuffles only first 15.
// JS has exactly 15 entries to match what gets shuffled in C.
export const scrnam = [
  'Velox Neb',
  'Foobie Bletch',
  'Temov',
  'Garven Deh',
  'Zelgo Mer',
  'Andova Begarin',
  'Elam Ebow',
  'Kernod Wel',
  'Tharr',
  'Venzar Borgavve',
  'Elbib Yloh',
  'Verr Yed Horre',
  'Juyed Awk Yacc',
  'Hackem Muche',
  'Lep Gex Ven Zea',
];

// C ref: hack.vars char *wannam[] (wand materials — shuffled)
export const wannam = [
  'oak',
  'ebony',
  'runed',
  'long',
  'short',
  'curved',
  'steel',
  'aluminum',
  'iron',
  'marble',
  'pine',
  'maple',
  'brass',
  'silver',
  'copper',
  'balsa',
];

// C ref: hack.vars char *rinnam[] (ring materials — shuffled)
export const rinnam = [
  'blackened',
  'ivory',
  'granite',
  'silver',
  'ruby',
  'jade',
  'diamond',
  'copper',
  'gold',
  'shining',
  'tiger eye',
  'agate',
  'moonstone',
  'sapphire',
  'pearl',
  'topaz',
  'black onix',
];

// C ref: hack.vars char oiden[20]
// Identified item flags — indexed by item index
export const oiden = new Array(20).fill(0);

// Runtime shuffle arrays (copies that get shuffled at game start)
// These are initialized to their default values here and shuffled in main.js
export let potcall = new Array(15).fill(null);   // potion calls
export let scrcall = new Array(SCRNUM).fill(null);  // scroll calls (names after shuffle)
export let wandcall = new Array(WANDNUM).fill(null); // wand calls
export let ringcall = new Array(RINGNUM).fill(null); // ring calls

// C ref: hack.vars strings
export const CALL   = ' called %s.';
export const OF     = ' of %s.';
export const NOTHIN = 'Nothing happens.';
export const mregen = 'ViQT';
export const WCLEV  = 'Welcome to level %d.';
export const vowels = 'aeiou';
export const WARROW = 'arrow';
export const CRETMON = 'create monster';
export const WDART  = 'dart';
export const ESCAPED = 'escaped';
export const QUIT   = 'quit';
export const FIRE   = 'fire';
export const GAINST = 'gain strength';
export const LIGHT  = 'light';
export const IDENT  = 'identify';
export const MMIS   = 'magic missile';
export const RUBY   = 'ruby';
export const SILVER = 'silver';
export const WTELE  = 'teleportation';
export const WAND   = 'wand';
export const DONTF  = "You don't fall in!";
export const MORE   = '--More--';
export const RUST   = 'Your armor rusts!';
export const HIT    = [
  'You hit %s%s!',
  'You score an excelent hit on %s%s!',
  'You barely hit %s%s!',
];
export const MISS   = [
  'You miss %s%s.',
  'You almost hit %s%s.',
  'You badly miss %s%s.',
];
export const CRUSH  = '%s%s crushes you!';
export const HUNG   = 'Hungry  ';
export const WEAK   = 'Weak    ';
export const FAINT  = 'Fainting';
export const BLANK  = '        ';
export const NOBLUE = 'Your hands stop glowing blue.';
export const EMPTY  = 'You are empty handed.';
export const READ   = 'r';
export const WRITE  = 'w';
export const CURSED = "Its cursed!  You can't.";
export const WEARI  = 'You are wearing that!';
export const IT     = 'It';
export const It     = 'it';
export const NOCOLD = "You don't feel cold!";
export const DONTH  = "You don't have that.";
