/**
 * data.js — Rogue 3.6 static game data (from init.c)
 *
 * Monster table, item probabilities, armor data, weapon names.
 * All tables faithfully transcribed from C source.
 */

import {
  ISMEAN, ISGREED, ISINVIS, ISBLOCK, ISREGEN,
  MAXROOMS, MAXSCROLLS, MAXPOTIONS, MAXRINGS, MAXSTICKS, MAXWEAPONS, MAXARMORS,
} from './const.js';

// Monster array (monsters[0..25], indexed by char - 'A')
// { m_name, m_carry, m_flags, m_stats: { s_str, s_exp, s_lvl, s_arm, s_hpt, s_dmg } }
export const monsters = [
  { m_name: "giant ant",         m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    10, s_lvl: 2, s_arm: 3, s_hpt: 1, s_dmg: "1d6" } },
  { m_name: "bat",               m_carry:  0, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     1, s_lvl: 1, s_arm: 3, s_hpt: 1, s_dmg: "1d2" } },
  { m_name: "centaur",           m_carry: 15, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    25, s_lvl: 4, s_arm: 4, s_hpt: 1, s_dmg: "1d6/1d6" } },
  { m_name: "dragon",            m_carry:100, m_flags: ISGREED,            m_stats: { s_str:{st_str:1,st_add:1}, s_exp:  9000, s_lvl:10, s_arm:-1, s_hpt: 1, s_dmg: "1d8/1d8/3d10" } },
  { m_name: "floating eye",      m_carry:  0, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    10, s_lvl: 1, s_arm: 9, s_hpt: 1, s_dmg: "1d1" } },
  { m_name: "violet fungi",      m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    85, s_lvl: 8, s_arm: 3, s_hpt: 1, s_dmg: "000d0" } },
  { m_name: "gnome",             m_carry: 10, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     8, s_lvl: 1, s_arm: 5, s_hpt: 1, s_dmg: "1d6" } },
  { m_name: "hobgoblin",         m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     3, s_lvl: 1, s_arm: 5, s_hpt: 1, s_dmg: "1d8" } },
  { m_name: "invisible stalker", m_carry:  0, m_flags: ISINVIS,            m_stats: { s_str:{st_str:1,st_add:1}, s_exp:   120, s_lvl: 8, s_arm: 3, s_hpt: 1, s_dmg: "4d4" } },
  { m_name: "jackal",            m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     2, s_lvl: 1, s_arm: 7, s_hpt: 1, s_dmg: "1d2" } },
  { m_name: "kobold",            m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     1, s_lvl: 1, s_arm: 7, s_hpt: 1, s_dmg: "1d4" } },
  { m_name: "leprechaun",        m_carry:  0, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    10, s_lvl: 3, s_arm: 8, s_hpt: 1, s_dmg: "1d1" } },
  { m_name: "mimic",             m_carry: 30, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:   140, s_lvl: 7, s_arm: 7, s_hpt: 1, s_dmg: "3d4" } },
  { m_name: "nymph",             m_carry:100, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    40, s_lvl: 3, s_arm: 9, s_hpt: 1, s_dmg: "0d0" } },
  { m_name: "orc",               m_carry: 15, m_flags: ISBLOCK,            m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     5, s_lvl: 1, s_arm: 6, s_hpt: 1, s_dmg: "1d8" } },
  { m_name: "purple worm",       m_carry: 70, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:  7000, s_lvl:15, s_arm: 6, s_hpt: 1, s_dmg: "2d12/2d4" } },
  { m_name: "quasit",            m_carry: 30, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    35, s_lvl: 3, s_arm: 2, s_hpt: 1, s_dmg: "1d2/1d2/1d4" } },
  { m_name: "rust monster",      m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    25, s_lvl: 5, s_arm: 2, s_hpt: 1, s_dmg: "0d0/0d0" } },
  { m_name: "snake",             m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     3, s_lvl: 1, s_arm: 5, s_hpt: 1, s_dmg: "1d3" } },
  { m_name: "troll",             m_carry: 50, m_flags: ISREGEN|ISMEAN,     m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    55, s_lvl: 6, s_arm: 4, s_hpt: 1, s_dmg: "1d8/1d8/2d6" } },
  { m_name: "umber hulk",        m_carry: 40, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:  1000, s_lvl: 8, s_arm: 2, s_hpt: 1, s_dmg: "3d4/3d4/2d5" } },
  { m_name: "vampire",           m_carry: 20, m_flags: ISREGEN|ISMEAN,     m_stats: { s_str:{st_str:1,st_add:1}, s_exp:   380, s_lvl: 8, s_arm: 1, s_hpt: 1, s_dmg: "1d10" } },
  { m_name: "wraith",            m_carry:  0, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    55, s_lvl: 5, s_arm: 4, s_hpt: 1, s_dmg: "1d6" } },
  { m_name: "xorn",              m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:   120, s_lvl: 7, s_arm:-2, s_hpt: 1, s_dmg: "1d3/1d3/1d3/4d6" } },
  { m_name: "yeti",              m_carry: 30, m_flags: 0,                  m_stats: { s_str:{st_str:1,st_add:1}, s_exp:    35, s_lvl: 4, s_arm: 6, s_hpt: 1, s_dmg: "1d6/1d6" } },
  { m_name: "zombie",            m_carry:  0, m_flags: ISMEAN,             m_stats: { s_str:{st_str:1,st_add:1}, s_exp:     7, s_lvl: 2, s_arm: 8, s_hpt: 1, s_dmg: "1d8" } },
];

// List of monsters in rough order of vorpalness
export const lvl_mons  = "KJBSHEAOZGLCRQNYTWFIXUMVDP".split('');
export const wand_mons = "KJBSH AOZG CRQ Y W IXU V  ".split('');

// things: type probability table (cumulative from init_things)
export const things_base = [
  { mi_name: null, mi_prob: 27 },   // 0: potion
  { mi_name: null, mi_prob: 27 },   // 1: scroll
  { mi_name: null, mi_prob: 18 },   // 2: food
  { mi_name: null, mi_prob:  9 },   // 3: weapon
  { mi_name: null, mi_prob:  9 },   // 4: armor
  { mi_name: null, mi_prob:  5 },   // 5: ring
  { mi_name: null, mi_prob:  5 },   // 6: stick
];

// s_magic: scroll probability/worth table (cumulative from init_names)
export const s_magic_base = [
  { mi_name: "monster confusion",  mi_prob:  8, mi_worth: 170 },
  { mi_name: "magic mapping",      mi_prob:  5, mi_worth: 180 },
  { mi_name: "light",              mi_prob: 10, mi_worth: 100 },
  { mi_name: "hold monster",       mi_prob:  2, mi_worth: 200 },
  { mi_name: "sleep",              mi_prob:  5, mi_worth:  50 },
  { mi_name: "enchant armor",      mi_prob:  8, mi_worth: 130 },
  { mi_name: "identify",           mi_prob: 21, mi_worth: 100 },
  { mi_name: "scare monster",      mi_prob:  4, mi_worth: 180 },
  { mi_name: "gold detection",     mi_prob:  4, mi_worth: 110 },
  { mi_name: "teleportation",      mi_prob:  7, mi_worth: 175 },
  { mi_name: "enchant weapon",     mi_prob: 10, mi_worth: 150 },
  { mi_name: "create monster",     mi_prob:  5, mi_worth:  75 },
  { mi_name: "remove curse",       mi_prob:  8, mi_worth: 105 },
  { mi_name: "aggravate monsters", mi_prob:  1, mi_worth:  60 },
  { mi_name: "blank paper",        mi_prob:  1, mi_worth:  50 },
  { mi_name: "genocide",           mi_prob:  1, mi_worth: 200 },
];

// p_magic: potion probability/worth table (cumulative from init_colors)
export const p_magic_base = [
  { mi_name: "confusion",         mi_prob:  8, mi_worth:  50 },
  { mi_name: "paralysis",         mi_prob: 10, mi_worth:  50 },
  { mi_name: "poison",            mi_prob:  8, mi_worth:  50 },
  { mi_name: "gain strength",     mi_prob: 15, mi_worth: 150 },
  { mi_name: "see invisible",     mi_prob:  2, mi_worth: 170 },
  { mi_name: "healing",           mi_prob: 15, mi_worth: 130 },
  { mi_name: "monster detection", mi_prob:  6, mi_worth: 120 },
  { mi_name: "magic detection",   mi_prob:  6, mi_worth: 105 },
  { mi_name: "raise level",       mi_prob:  2, mi_worth: 220 },
  { mi_name: "extra healing",     mi_prob:  5, mi_worth: 180 },
  { mi_name: "haste self",        mi_prob:  4, mi_worth: 200 },
  { mi_name: "restore strength",  mi_prob: 14, mi_worth: 120 },
  { mi_name: "blindness",         mi_prob:  4, mi_worth:  50 },
  { mi_name: "thirst quenching",  mi_prob:  1, mi_worth:  50 },
];

// r_magic: ring probability/worth table
export const r_magic_base = [
  { mi_name: "protection",        mi_prob:  9, mi_worth: 200 },
  { mi_name: "add strength",      mi_prob:  9, mi_worth: 200 },
  { mi_name: "sustain strength",  mi_prob:  5, mi_worth: 180 },
  { mi_name: "searching",         mi_prob: 10, mi_worth: 200 },
  { mi_name: "see invisible",     mi_prob: 10, mi_worth: 175 },
  { mi_name: "adornment",         mi_prob:  1, mi_worth: 100 },
  { mi_name: "aggravate monster", mi_prob: 11, mi_worth: 100 },
  { mi_name: "dexterity",         mi_prob:  8, mi_worth: 220 },
  { mi_name: "increase damage",   mi_prob:  8, mi_worth: 220 },
  { mi_name: "regeneration",      mi_prob:  4, mi_worth: 260 },
  { mi_name: "slow digestion",    mi_prob:  9, mi_worth: 240 },
  { mi_name: "telportation",      mi_prob:  9, mi_worth: 100 },
  { mi_name: "stealth",           mi_prob:  7, mi_worth: 100 },
];

// ws_magic: wand/staff probability/worth table
export const ws_magic_base = [
  { mi_name: "light",             mi_prob: 12, mi_worth: 120 },
  { mi_name: "striking",         mi_prob:  9, mi_worth: 115 },
  { mi_name: "lightning",        mi_prob:  3, mi_worth: 200 },
  { mi_name: "fire",             mi_prob:  3, mi_worth: 200 },
  { mi_name: "cold",             mi_prob:  3, mi_worth: 200 },
  { mi_name: "polymorph",        mi_prob: 15, mi_worth: 210 },
  { mi_name: "magic missile",    mi_prob: 10, mi_worth: 170 },
  { mi_name: "haste monster",    mi_prob:  9, mi_worth:  50 },
  { mi_name: "slow monster",     mi_prob: 11, mi_worth: 220 },
  { mi_name: "drain life",       mi_prob:  9, mi_worth: 210 },
  { mi_name: "nothing",          mi_prob:  1, mi_worth:  70 },
  { mi_name: "teleport away",    mi_prob:  5, mi_worth: 140 },
  { mi_name: "teleport to",      mi_prob:  5, mi_worth:  60 },
  { mi_name: "cancellation",     mi_prob:  5, mi_worth: 130 },
];

// a_class: armor class values
export const a_class = [8, 7, 7, 6, 5, 4, 4, 3];

// a_names: armor type names
export const a_names = [
  "leather armor",
  "ring mail",
  "studded leather armor",
  "scale mail",
  "chain mail",
  "splint mail",
  "banded mail",
  "plate mail",
];

// a_chances: cumulative probabilities for armor type selection
export const a_chances = [20, 35, 50, 63, 75, 85, 95, 100];

// w_names: weapon type names (from weapons.c)
export const w_names = [
  "mace",
  "long sword",
  "short bow",
  "arrow",
  "dagger",
  "rock",
  "two handed sword",
  "sling",
  "dart",
  "crossbow",
  "crossbow bolt",
  "spear",
];

// Potion color tables
export const rainbow = [
  "Red", "Blue", "Green", "Yellow", "Black", "Brown", "Orange", "Pink",
  "Purple", "Grey", "White", "Silver", "Gold", "Violet", "Clear",
  "Vermilion", "Ecru", "Turquoise", "Magenta", "Amber", "Topaz",
  "Plaid", "Tan", "Tangerine"
];

// Scroll syllables (for generating scroll names)
export const sylls = [
  "a", "ab", "ag", "aks", "ala", "an", "ankh", "app", "arg", "arze",
  "ash", "ban", "bar", "bat", "bek", "bie", "bin", "bit", "bjor",
  "blu", "bot", "bu", "byt", "comp", "con", "cos", "cre", "dalf",
  "dan", "den", "do", "e", "eep", "el", "eng", "er", "ere", "erk",
  "esh", "evs", "fa", "fid", "for", "fri", "fu", "gan", "gar",
  "glen", "gop", "gre", "ha", "he", "hyd", "i", "ing", "ion", "ip",
  "ish", "it", "ite", "iv", "jo", "kho", "kli", "klis", "la", "lech",
  "man", "mar", "me", "mi", "mic", "mik", "mon", "mung", "mur",
  "nej", "nelg", "nep", "ner", "nes", "nes", "nih", "nin", "o", "od",
  "ood", "org", "orn", "ox", "oxy", "pay", "pet", "ple", "plu", "po",
  "pot", "prok", "re", "rea", "rhov", "ri", "ro", "rog", "rok", "rol",
  "sa", "san", "sat", "see", "sef", "seh", "shu", "ski", "sna",
  "sne", "snik", "sno", "so", "sol", "sri", "sta", "sun", "ta",
  "tab", "tem", "ther", "ti", "tox", "trol", "tue", "turs", "u",
  "ulk", "um", "un", "uni", "ur", "val", "viv", "vly", "vom", "wah",
  "wed", "werg", "wex", "whon", "wun", "xo", "y", "yot", "yu",
  "zant", "zap", "zeb", "zim", "zok", "zon", "zum",
];

// Ring stone settings
export const stones = [
  "Agate", "Alexandrite", "Amethyst", "Carnelian", "Diamond", "Emerald",
  "Granite", "Jade", "Kryptonite", "Lapus lazuli", "Moonstone", "Obsidian",
  "Onyx", "Opal", "Pearl", "Ruby", "Saphire", "Tiger eye", "Topaz",
  "Turquoise",
];

// Wand/staff materials - wood
export const wood = [
  "Avocado wood", "Balsa", "Banyan", "Birch", "Cedar", "Cherry",
  "Cinnibar", "Driftwood", "Ebony", "Eucalyptus", "Hemlock", "Ironwood",
  "Mahogany", "Manzanita", "Maple", "Oak", "Persimmon wood", "Redwood",
  "Rosewood", "Teak", "Walnut", "Zebra wood",
];

// Wand/staff materials - metal
export const metal = [
  "Aluminium", "Bone", "Brass", "Bronze", "Copper", "Iron", "Lead",
  "Pewter", "Steel", "Tin", "Zinc",
];

// Help string table (from init.c)
export const helpstr = [
  { h_ch: '?',      h_desc: "\tprints help" },
  { h_ch: '/',      h_desc: "\tidentify object" },
  { h_ch: 'h',      h_desc: "\tleft" },
  { h_ch: 'j',      h_desc: "\tdown" },
  { h_ch: 'k',      h_desc: "\tup" },
  { h_ch: 'l',      h_desc: "\tright" },
  { h_ch: 'y',      h_desc: "\tup & left" },
  { h_ch: 'u',      h_desc: "\tup & right" },
  { h_ch: 'b',      h_desc: "\tdown & left" },
  { h_ch: 'n',      h_desc: "\tdown & right" },
  { h_ch: 'H',      h_desc: "\trun left" },
  { h_ch: 'J',      h_desc: "\trun down" },
  { h_ch: 'K',      h_desc: "\trun up" },
  { h_ch: 'L',      h_desc: "\trun right" },
  { h_ch: 'Y',      h_desc: "\trun up & left" },
  { h_ch: 'U',      h_desc: "\trun up & right" },
  { h_ch: 'B',      h_desc: "\trun down & left" },
  { h_ch: 'N',      h_desc: "\trun down & right" },
  { h_ch: 't',      h_desc: "<dir>\tthrow something" },
  { h_ch: 'f',      h_desc: "<dir>\tforward until find something" },
  { h_ch: 'p',      h_desc: "<dir>\tzap a wand in a direction" },
  { h_ch: 'z',      h_desc: "\tzap a wand or staff" },
  { h_ch: '>',      h_desc: "\tgo down a staircase" },
  { h_ch: 's',      h_desc: "\tsearch for trap/secret door" },
  { h_ch: ' ',      h_desc: "\t(space) rest for a while" },
  { h_ch: 'i',      h_desc: "\tinventory" },
  { h_ch: 'I',      h_desc: "\tinventory single item" },
  { h_ch: 'q',      h_desc: "\tquaff potion" },
  { h_ch: 'r',      h_desc: "\tread paper" },
  { h_ch: 'e',      h_desc: "\teat food" },
  { h_ch: 'w',      h_desc: "\twield a weapon" },
  { h_ch: 'W',      h_desc: "\twear armor" },
  { h_ch: 'T',      h_desc: "\ttake armor off" },
  { h_ch: 'P',      h_desc: "\tput on ring" },
  { h_ch: 'R',      h_desc: "\tremove ring" },
  { h_ch: 'd',      h_desc: "\tdrop object" },
  { h_ch: 'c',      h_desc: "\tcall object" },
  { h_ch: 'o',      h_desc: "\texamine/set options" },
  { h_ch: '\x0c',   h_desc: "\tredraw screen" },
  { h_ch: '\x12',   h_desc: "\trepeat last message" },
  { h_ch: '\x1b',   h_desc: "\tcancel command" },
  { h_ch: 'v',      h_desc: "\tprint program version number" },
  { h_ch: '!',      h_desc: "\tshell escape" },
  { h_ch: 'S',      h_desc: "\tsave game" },
  { h_ch: 'Q',      h_desc: "\tquit" },
  { h_ch: 0,        h_desc: null },
];
