// symbols.js -- symbol constants and glyph offset tables
// C refs: include/defsym.h, include/display.h enum glyph_offsets
//
// Auto-generated block from gen_symbols.py (defsym.h), plus hand-written
// glyph offset constants that depend on cross-leaf data (NUMMONS, NUM_OBJECTS).

// AUTO-IMPORT-BEGIN: SYMBOLS
// Auto-generated symbol constants/tables from include/defsym.h
// DO NOT EDIT — regenerate with: python3 scripts/generators/gen_symbols.py

import { CLR_BLACK, CLR_BLUE, CLR_BRIGHT_BLUE, CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA, CLR_BROWN, CLR_CYAN, CLR_GRAY, CLR_GREEN, CLR_MAGENTA, CLR_ORANGE, CLR_RED, CLR_WHITE, CLR_YELLOW, HI_GOLD, HI_METAL, HI_WOOD, HI_ZAP, NO_COLOR } from "./const.js";

// 1) PCHAR_S_ENUM
export const S_stone = 0;
export const S_vwall = 1;
export const S_hwall = 2;
export const S_tlcorn = 3;
export const S_trcorn = 4;
export const S_blcorn = 5;
export const S_brcorn = 6;
export const S_crwall = 7;
export const S_tuwall = 8;
export const S_tdwall = 9;
export const S_tlwall = 10;
export const S_trwall = 11;
export const S_ndoor = 12;
export const S_vodoor = 13;
export const S_hodoor = 14;
export const S_vcdoor = 15;
export const S_hcdoor = 16;
export const S_bars = 17;
export const S_tree = 18;
export const S_room = 19;
export const S_darkroom = 20;
export const S_engroom = 21;
export const S_corr = 22;
export const S_litcorr = 23;
export const S_engrcorr = 24;
export const S_upstair = 25;
export const S_dnstair = 26;
export const S_upladder = 27;
export const S_dnladder = 28;
export const S_brupstair = 29;
export const S_brdnstair = 30;
export const S_brupladder = 31;
export const S_brdnladder = 32;
export const S_altar = 33;
export const S_grave = 34;
export const S_throne = 35;
export const S_sink = 36;
export const S_fountain = 37;
export const S_pool = 38;
export const S_ice = 39;
export const S_lava = 40;
export const S_lavawall = 41;
export const S_vodbridge = 42;
export const S_hodbridge = 43;
export const S_vcdbridge = 44;
export const S_hcdbridge = 45;
export const S_air = 46;
export const S_cloud = 47;
export const S_water = 48;
export const S_arrow_trap = 49;
export const S_dart_trap = 50;
export const S_falling_rock_trap = 51;
export const S_squeaky_board = 52;
export const S_bear_trap = 53;
export const S_land_mine = 54;
export const S_rolling_boulder_trap = 55;
export const S_sleeping_gas_trap = 56;
export const S_rust_trap = 57;
export const S_fire_trap = 58;
export const S_pit = 59;
export const S_spiked_pit = 60;
export const S_hole = 61;
export const S_trap_door = 62;
export const S_teleportation_trap = 63;
export const S_level_teleporter = 64;
export const S_magic_portal = 65;
export const S_web = 66;
export const S_statue_trap = 67;
export const S_magic_trap = 68;
export const S_anti_magic_trap = 69;
export const S_polymorph_trap = 70;
export const S_vibrating_square = 71;
export const S_trapped_door = 72;
export const S_trapped_chest = 73;
export const S_vbeam = 74;
export const S_hbeam = 75;
export const S_lslant = 76;
export const S_rslant = 77;
export const S_digbeam = 78;
export const S_flashbeam = 79;
export const S_boomleft = 80;
export const S_boomright = 81;
export const S_ss1 = 82;
export const S_ss2 = 83;
export const S_ss3 = 84;
export const S_ss4 = 85;
export const S_poisoncloud = 86;
export const S_goodpos = 87;
export const S_sw_tl = 88;
export const S_sw_tc = 89;
export const S_sw_tr = 90;
export const S_sw_ml = 91;
export const S_sw_mr = 92;
export const S_sw_bl = 93;
export const S_sw_bc = 94;
export const S_sw_br = 95;
export const S_expl_tl = 96;
export const S_expl_tc = 97;
export const S_expl_tr = 98;
export const S_expl_ml = 99;
export const S_expl_mc = 100;
export const S_expl_mr = 101;
export const S_expl_bl = 102;
export const S_expl_bc = 103;
export const S_expl_br = 104;

// 2) PCHAR_DRAWING
export const defsyms = [
    { ch: ' ', desc: "stone", color: NO_COLOR }, // S_stone
    { ch: '|', desc: "wall", color: CLR_GRAY }, // S_vwall
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_hwall
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_tlcorn
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_trcorn
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_blcorn
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_brcorn
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_crwall
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_tuwall
    { ch: '-', desc: "wall", color: CLR_GRAY }, // S_tdwall
    { ch: '|', desc: "wall", color: CLR_GRAY }, // S_tlwall
    { ch: '|', desc: "wall", color: CLR_GRAY }, // S_trwall
    { ch: '.', desc: "doorway", color: CLR_GRAY }, // S_ndoor
    { ch: '-', desc: "open door", color: CLR_BROWN }, // S_vodoor
    { ch: '|', desc: "open door", color: CLR_BROWN }, // S_hodoor
    { ch: '+', desc: "closed door", color: CLR_BROWN }, // S_vcdoor
    { ch: '+', desc: "closed door", color: CLR_BROWN }, // S_hcdoor
    { ch: '#', desc: "iron bars", color: HI_METAL }, // S_bars
    { ch: '#', desc: "tree", color: CLR_GREEN }, // S_tree
    { ch: '.', desc: "floor of a room", color: CLR_GRAY }, // S_room
    { ch: '.', desc: "dark part of a room", color: CLR_BLACK }, // S_darkroom
    { ch: '`', desc: "engraving", color: CLR_BRIGHT_BLUE }, // S_engroom
    { ch: '#', desc: "corridor", color: CLR_GRAY }, // S_corr
    { ch: '#', desc: "lit corridor", color: CLR_GRAY }, // S_litcorr
    { ch: '#', desc: "engraving", color: CLR_BRIGHT_BLUE }, // S_engrcorr
    { ch: '<', desc: "staircase up", color: CLR_GRAY }, // S_upstair
    { ch: '>', desc: "staircase down", color: CLR_GRAY }, // S_dnstair
    { ch: '<', desc: "ladder up", color: CLR_BROWN }, // S_upladder
    { ch: '>', desc: "ladder down", color: CLR_BROWN }, // S_dnladder
    { ch: '<', desc: "branch staircase up", color: CLR_YELLOW }, // S_brupstair
    { ch: '>', desc: "branch staircase down", color: CLR_YELLOW }, // S_brdnstair
    { ch: '<', desc: "branch ladder up", color: CLR_YELLOW }, // S_brupladder
    { ch: '>', desc: "branch ladder down", color: CLR_YELLOW }, // S_brdnladder
    { ch: '_', desc: "altar", color: CLR_GRAY }, // S_altar
    { ch: '|', desc: "grave", color: CLR_WHITE }, // S_grave
    { ch: '\\', desc: "opulent throne", color: HI_GOLD }, // S_throne
    { ch: '{', desc: "sink", color: CLR_WHITE }, // S_sink
    { ch: '{', desc: "fountain", color: CLR_BRIGHT_BLUE }, // S_fountain
    { ch: '}', desc: "water", color: CLR_BLUE }, // S_pool
    { ch: '.', desc: "ice", color: CLR_CYAN }, // S_ice
    { ch: '}', desc: "molten lava", color: CLR_RED }, // S_lava
    { ch: '}', desc: "wall of lava", color: CLR_ORANGE }, // S_lavawall
    { ch: '.', desc: "lowered drawbridge", color: CLR_BROWN }, // S_vodbridge
    { ch: '.', desc: "lowered drawbridge", color: CLR_BROWN }, // S_hodbridge
    { ch: '#', desc: "raised drawbridge", color: CLR_BROWN }, // S_vcdbridge
    { ch: '#', desc: "raised drawbridge", color: CLR_BROWN }, // S_hcdbridge
    { ch: ' ', desc: "air", color: CLR_CYAN }, // S_air
    { ch: '#', desc: "cloud", color: CLR_GRAY }, // S_cloud
    { ch: '}', desc: "water", color: CLR_BRIGHT_BLUE }, // S_water
    { ch: '^', desc: "arrow trap", color: HI_METAL }, // S_arrow_trap
    { ch: '^', desc: "dart trap", color: HI_METAL }, // S_dart_trap
    { ch: '^', desc: "falling rock trap", color: CLR_GRAY }, // S_falling_rock_trap
    { ch: '^', desc: "squeaky board", color: CLR_BROWN }, // S_squeaky_board
    { ch: '^', desc: "bear trap", color: HI_METAL }, // S_bear_trap
    { ch: '^', desc: "land mine", color: CLR_RED }, // S_land_mine
    { ch: '^', desc: "rolling boulder trap", color: CLR_GRAY }, // S_rolling_boulder_trap
    { ch: '^', desc: "sleeping gas trap", color: HI_ZAP }, // S_sleeping_gas_trap
    { ch: '^', desc: "rust trap", color: CLR_BLUE }, // S_rust_trap
    { ch: '^', desc: "fire trap", color: CLR_ORANGE }, // S_fire_trap
    { ch: '^', desc: "pit", color: CLR_BLACK }, // S_pit
    { ch: '^', desc: "spiked pit", color: CLR_BLACK }, // S_spiked_pit
    { ch: '^', desc: "hole", color: CLR_BROWN }, // S_hole
    { ch: '^', desc: "trap door", color: CLR_BROWN }, // S_trap_door
    { ch: '^', desc: "teleportation trap", color: CLR_MAGENTA }, // S_teleportation_trap
    { ch: '^', desc: "level teleporter", color: CLR_MAGENTA }, // S_level_teleporter
    { ch: '^', desc: "magic portal", color: CLR_BRIGHT_MAGENTA }, // S_magic_portal
    { ch: '"', desc: "web", color: CLR_GRAY }, // S_web
    { ch: '^', desc: "statue trap", color: CLR_GRAY }, // S_statue_trap
    { ch: '^', desc: "magic trap", color: HI_ZAP }, // S_magic_trap
    { ch: '^', desc: "anti-magic field", color: HI_ZAP }, // S_anti_magic_trap
    { ch: '^', desc: "polymorph trap", color: CLR_BRIGHT_GREEN }, // S_polymorph_trap
    { ch: '~', desc: "vibrating square", color: CLR_MAGENTA }, // S_vibrating_square
    { ch: '^', desc: "trapped door", color: CLR_ORANGE }, // S_trapped_door
    { ch: '^', desc: "trapped chest", color: CLR_ORANGE }, // S_trapped_chest
    { ch: '|', desc: "", color: CLR_GRAY }, // S_vbeam
    { ch: '-', desc: "", color: CLR_GRAY }, // S_hbeam
    { ch: '\\', desc: "", color: CLR_GRAY }, // S_lslant
    { ch: '/', desc: "", color: CLR_GRAY }, // S_rslant
    { ch: '*', desc: "", color: CLR_WHITE }, // S_digbeam
    { ch: '!', desc: "", color: CLR_WHITE }, // S_flashbeam
    { ch: ')', desc: "", color: HI_WOOD }, // S_boomleft
    { ch: '(', desc: "", color: HI_WOOD }, // S_boomright
    { ch: '0', desc: "", color: HI_ZAP }, // S_ss1
    { ch: '#', desc: "", color: HI_ZAP }, // S_ss2
    { ch: '@', desc: "", color: HI_ZAP }, // S_ss3
    { ch: '*', desc: "", color: HI_ZAP }, // S_ss4
    { ch: '#', desc: "poison cloud", color: CLR_BRIGHT_GREEN }, // S_poisoncloud
    { ch: '$', desc: "valid position", color: HI_ZAP }, // S_goodpos
    { ch: '/', desc: "", color: CLR_GREEN }, // S_sw_tl
    { ch: '-', desc: "", color: CLR_GREEN }, // S_sw_tc
    { ch: '\\', desc: "", color: CLR_GREEN }, // S_sw_tr
    { ch: '|', desc: "", color: CLR_GREEN }, // S_sw_ml
    { ch: '|', desc: "", color: CLR_GREEN }, // S_sw_mr
    { ch: '\\', desc: "", color: CLR_GREEN }, // S_sw_bl
    { ch: '-', desc: "", color: CLR_GREEN }, // S_sw_bc
    { ch: '/', desc: "", color: CLR_GREEN }, // S_sw_br
    { ch: '/', desc: "", color: CLR_ORANGE }, // S_expl_tl
    { ch: '-', desc: "", color: CLR_ORANGE }, // S_expl_tc
    { ch: '\\', desc: "", color: CLR_ORANGE }, // S_expl_tr
    { ch: '|', desc: "", color: CLR_ORANGE }, // S_expl_ml
    { ch: ' ', desc: "", color: CLR_ORANGE }, // S_expl_mc
    { ch: '|', desc: "", color: CLR_ORANGE }, // S_expl_mr
    { ch: '\\', desc: "", color: CLR_ORANGE }, // S_expl_bl
    { ch: '-', desc: "", color: CLR_ORANGE }, // S_expl_bc
    { ch: '/', desc: "", color: CLR_ORANGE }, // S_expl_br
];

// 3) PCHAR_PARSE
export const PCHAR_PARSE_ROWS = Object.freeze([
    ["S_stone", S_stone],
    ["S_vwall", S_vwall],
    ["S_hwall", S_hwall],
    ["S_tlcorn", S_tlcorn],
    ["S_trcorn", S_trcorn],
    ["S_blcorn", S_blcorn],
    ["S_brcorn", S_brcorn],
    ["S_crwall", S_crwall],
    ["S_tuwall", S_tuwall],
    ["S_tdwall", S_tdwall],
    ["S_tlwall", S_tlwall],
    ["S_trwall", S_trwall],
    ["S_ndoor", S_ndoor],
    ["S_vodoor", S_vodoor],
    ["S_hodoor", S_hodoor],
    ["S_vcdoor", S_vcdoor],
    ["S_hcdoor", S_hcdoor],
    ["S_bars", S_bars],
    ["S_tree", S_tree],
    ["S_room", S_room],
    ["S_darkroom", S_darkroom],
    ["S_engroom", S_engroom],
    ["S_corr", S_corr],
    ["S_litcorr", S_litcorr],
    ["S_engrcorr", S_engrcorr],
    ["S_upstair", S_upstair],
    ["S_dnstair", S_dnstair],
    ["S_upladder", S_upladder],
    ["S_dnladder", S_dnladder],
    ["S_brupstair", S_brupstair],
    ["S_brdnstair", S_brdnstair],
    ["S_brupladder", S_brupladder],
    ["S_brdnladder", S_brdnladder],
    ["S_altar", S_altar],
    ["S_grave", S_grave],
    ["S_throne", S_throne],
    ["S_sink", S_sink],
    ["S_fountain", S_fountain],
    ["S_pool", S_pool],
    ["S_ice", S_ice],
    ["S_lava", S_lava],
    ["S_lavawall", S_lavawall],
    ["S_vodbridge", S_vodbridge],
    ["S_hodbridge", S_hodbridge],
    ["S_vcdbridge", S_vcdbridge],
    ["S_hcdbridge", S_hcdbridge],
    ["S_air", S_air],
    ["S_cloud", S_cloud],
    ["S_water", S_water],
    ["S_arrow_trap", S_arrow_trap],
    ["S_dart_trap", S_dart_trap],
    ["S_falling_rock_trap", S_falling_rock_trap],
    ["S_squeaky_board", S_squeaky_board],
    ["S_bear_trap", S_bear_trap],
    ["S_land_mine", S_land_mine],
    ["S_rolling_boulder_trap", S_rolling_boulder_trap],
    ["S_sleeping_gas_trap", S_sleeping_gas_trap],
    ["S_rust_trap", S_rust_trap],
    ["S_fire_trap", S_fire_trap],
    ["S_pit", S_pit],
    ["S_spiked_pit", S_spiked_pit],
    ["S_hole", S_hole],
    ["S_trap_door", S_trap_door],
    ["S_teleportation_trap", S_teleportation_trap],
    ["S_level_teleporter", S_level_teleporter],
    ["S_magic_portal", S_magic_portal],
    ["S_web", S_web],
    ["S_statue_trap", S_statue_trap],
    ["S_magic_trap", S_magic_trap],
    ["S_anti_magic_trap", S_anti_magic_trap],
    ["S_polymorph_trap", S_polymorph_trap],
    ["S_vibrating_square", S_vibrating_square],
    ["S_trapped_door", S_trapped_door],
    ["S_trapped_chest", S_trapped_chest],
    ["S_vbeam", S_vbeam],
    ["S_hbeam", S_hbeam],
    ["S_lslant", S_lslant],
    ["S_rslant", S_rslant],
    ["S_digbeam", S_digbeam],
    ["S_flashbeam", S_flashbeam],
    ["S_boomleft", S_boomleft],
    ["S_boomright", S_boomright],
    ["S_ss1", S_ss1],
    ["S_ss2", S_ss2],
    ["S_ss3", S_ss3],
    ["S_ss4", S_ss4],
    ["S_poisoncloud", S_poisoncloud],
    ["S_goodpos", S_goodpos],
    ["S_sw_tl", S_sw_tl],
    ["S_sw_tc", S_sw_tc],
    ["S_sw_tr", S_sw_tr],
    ["S_sw_ml", S_sw_ml],
    ["S_sw_mr", S_sw_mr],
    ["S_sw_bl", S_sw_bl],
    ["S_sw_bc", S_sw_bc],
    ["S_sw_br", S_sw_br],
    ["S_expl_tl", S_expl_tl],
    ["S_expl_tc", S_expl_tc],
    ["S_expl_tr", S_expl_tr],
    ["S_expl_ml", S_expl_ml],
    ["S_expl_mc", S_expl_mc],
    ["S_expl_mr", S_expl_mr],
    ["S_expl_bl", S_expl_bl],
    ["S_expl_bc", S_expl_bc],
    ["S_expl_br", S_expl_br],
]);

// 4) MONSYMS_DEFCHAR_ENUM
export const DEF_ANT = 'a'.charCodeAt(0);
export const DEF_BLOB = 'b'.charCodeAt(0);
export const DEF_COCKATRICE = 'c'.charCodeAt(0);
export const DEF_DOG = 'd'.charCodeAt(0);
export const DEF_EYE = 'e'.charCodeAt(0);
export const DEF_FELINE = 'f'.charCodeAt(0);
export const DEF_GREMLIN = 'g'.charCodeAt(0);
export const DEF_HUMANOID = 'h'.charCodeAt(0);
export const DEF_IMP = 'i'.charCodeAt(0);
export const DEF_JELLY = 'j'.charCodeAt(0);
export const DEF_KOBOLD = 'k'.charCodeAt(0);
export const DEF_LEPRECHAUN = 'l'.charCodeAt(0);
export const DEF_MIMIC = 'm'.charCodeAt(0);
export const DEF_NYMPH = 'n'.charCodeAt(0);
export const DEF_ORC = 'o'.charCodeAt(0);
export const DEF_PIERCER = 'p'.charCodeAt(0);
export const DEF_QUADRUPED = 'q'.charCodeAt(0);
export const DEF_RODENT = 'r'.charCodeAt(0);
export const DEF_SPIDER = 's'.charCodeAt(0);
export const DEF_TRAPPER = 't'.charCodeAt(0);
export const DEF_UNICORN = 'u'.charCodeAt(0);
export const DEF_VORTEX = 'v'.charCodeAt(0);
export const DEF_WORM = 'w'.charCodeAt(0);
export const DEF_XAN = 'x'.charCodeAt(0);
export const DEF_LIGHT = 'y'.charCodeAt(0);
export const DEF_ZRUTY = 'z'.charCodeAt(0);
export const DEF_ANGEL = 'A'.charCodeAt(0);
export const DEF_BAT = 'B'.charCodeAt(0);
export const DEF_CENTAUR = 'C'.charCodeAt(0);
export const DEF_DRAGON = 'D'.charCodeAt(0);
export const DEF_ELEMENTAL = 'E'.charCodeAt(0);
export const DEF_FUNGUS = 'F'.charCodeAt(0);
export const DEF_GNOME = 'G'.charCodeAt(0);
export const DEF_GIANT = 'H'.charCodeAt(0);
export const DEF_INVISIBLE = 'I'.charCodeAt(0);
export const DEF_JABBERWOCK = 'J'.charCodeAt(0);
export const DEF_KOP = 'K'.charCodeAt(0);
export const DEF_LICH = 'L'.charCodeAt(0);
export const DEF_MUMMY = 'M'.charCodeAt(0);
export const DEF_NAGA = 'N'.charCodeAt(0);
export const DEF_OGRE = 'O'.charCodeAt(0);
export const DEF_PUDDING = 'P'.charCodeAt(0);
export const DEF_QUANTMECH = 'Q'.charCodeAt(0);
export const DEF_RUSTMONST = 'R'.charCodeAt(0);
export const DEF_SNAKE = 'S'.charCodeAt(0);
export const DEF_TROLL = 'T'.charCodeAt(0);
export const DEF_UMBER = 'U'.charCodeAt(0);
export const DEF_VAMPIRE = 'V'.charCodeAt(0);
export const DEF_WRAITH = 'W'.charCodeAt(0);
export const DEF_XORN = 'X'.charCodeAt(0);
export const DEF_YETI = 'Y'.charCodeAt(0);
export const DEF_ZOMBIE = 'Z'.charCodeAt(0);
export const DEF_HUMAN = '@'.charCodeAt(0);
export const DEF_GHOST = ' '.charCodeAt(0);
export const DEF_GOLEM = '\''.charCodeAt(0);
export const DEF_DEMON = '&'.charCodeAt(0);
export const DEF_EEL = ';'.charCodeAt(0);
export const DEF_LIZARD = ':'.charCodeAt(0);
export const DEF_WORM_TAIL = '~'.charCodeAt(0);
export const DEF_MIMIC_DEF = ']'.charCodeAt(0);

import { S_ANT, S_BLOB, S_COCKATRICE, S_DOG, S_EYE, S_FELINE, S_GREMLIN, S_HUMANOID, S_IMP, S_JELLY, S_KOBOLD, S_LEPRECHAUN, S_MIMIC, S_NYMPH, S_ORC, S_PIERCER, S_QUADRUPED, S_RODENT, S_SPIDER, S_TRAPPER, S_UNICORN, S_VORTEX, S_WORM, S_XAN, S_LIGHT, S_ZRUTY, S_ANGEL, S_BAT, S_CENTAUR, S_DRAGON, S_ELEMENTAL, S_FUNGUS, S_GNOME, S_GIANT, S_invisible, S_JABBERWOCK, S_KOP, S_LICH, S_MUMMY, S_NAGA, S_OGRE, S_PUDDING, S_QUANTMECH, S_RUSTMONST, S_SNAKE, S_TROLL, S_UMBER, S_VAMPIRE, S_WRAITH, S_XORN, S_YETI, S_ZOMBIE, S_HUMAN, S_GHOST, S_GOLEM, S_DEMON, S_EEL, S_LIZARD, S_WORM_TAIL, S_MIMIC_DEF, MAXMCLASSES } from "./monsters.js";

// 6) MONSYMS_DRAWING
export const def_monsyms = [
    { sym: '', name: "", explain: "" },
    { sym: 'a', name: "", explain: "ant or other insect" }, // S_ANT
    { sym: 'b', name: "", explain: "blob" }, // S_BLOB
    { sym: 'c', name: "", explain: "cockatrice" }, // S_COCKATRICE
    { sym: 'd', name: "", explain: "dog or other canine" }, // S_DOG
    { sym: 'e', name: "", explain: "eye or sphere" }, // S_EYE
    { sym: 'f', name: "", explain: "cat or other feline" }, // S_FELINE
    { sym: 'g', name: "", explain: "gremlin" }, // S_GREMLIN
    { sym: 'h', name: "", explain: "humanoid" }, // S_HUMANOID
    { sym: 'i', name: "", explain: "imp or minor demon" }, // S_IMP
    { sym: 'j', name: "", explain: "jelly" }, // S_JELLY
    { sym: 'k', name: "", explain: "kobold" }, // S_KOBOLD
    { sym: 'l', name: "", explain: "leprechaun" }, // S_LEPRECHAUN
    { sym: 'm', name: "", explain: "mimic" }, // S_MIMIC
    { sym: 'n', name: "", explain: "nymph" }, // S_NYMPH
    { sym: 'o', name: "", explain: "orc" }, // S_ORC
    { sym: 'p', name: "", explain: "piercer" }, // S_PIERCER
    { sym: 'q', name: "", explain: "quadruped" }, // S_QUADRUPED
    { sym: 'r', name: "", explain: "rodent" }, // S_RODENT
    { sym: 's', name: "", explain: "arachnid or centipede" }, // S_SPIDER
    { sym: 't', name: "", explain: "trapper or lurker above" }, // S_TRAPPER
    { sym: 'u', name: "", explain: "unicorn or horse" }, // S_UNICORN
    { sym: 'v', name: "", explain: "vortex" }, // S_VORTEX
    { sym: 'w', name: "", explain: "worm" }, // S_WORM
    { sym: 'x', name: "", explain: "xan or other mythical/fantastic insect" }, // S_XAN
    { sym: 'y', name: "", explain: "light" }, // S_LIGHT
    { sym: 'z', name: "", explain: "zruty" }, // S_ZRUTY
    { sym: 'A', name: "", explain: "angelic being" }, // S_ANGEL
    { sym: 'B', name: "", explain: "bat or bird" }, // S_BAT
    { sym: 'C', name: "", explain: "centaur" }, // S_CENTAUR
    { sym: 'D', name: "", explain: "dragon" }, // S_DRAGON
    { sym: 'E', name: "", explain: "elemental" }, // S_ELEMENTAL
    { sym: 'F', name: "", explain: "fungus or mold" }, // S_FUNGUS
    { sym: 'G', name: "", explain: "gnome" }, // S_GNOME
    { sym: 'H', name: "", explain: "giant humanoid" }, // S_GIANT
    { sym: 'I', name: "", explain: "invisible monster" }, // S_invisible
    { sym: 'J', name: "", explain: "jabberwock" }, // S_JABBERWOCK
    { sym: 'K', name: "", explain: "Keystone Kop" }, // S_KOP
    { sym: 'L', name: "", explain: "lich" }, // S_LICH
    { sym: 'M', name: "", explain: "mummy" }, // S_MUMMY
    { sym: 'N', name: "", explain: "naga" }, // S_NAGA
    { sym: 'O', name: "", explain: "ogre" }, // S_OGRE
    { sym: 'P', name: "", explain: "pudding or ooze" }, // S_PUDDING
    { sym: 'Q', name: "", explain: "quantum mechanic" }, // S_QUANTMECH
    { sym: 'R', name: "", explain: "rust monster or disenchanter" }, // S_RUSTMONST
    { sym: 'S', name: "", explain: "snake" }, // S_SNAKE
    { sym: 'T', name: "", explain: "troll" }, // S_TROLL
    { sym: 'U', name: "", explain: "umber hulk" }, // S_UMBER
    { sym: 'V', name: "", explain: "vampire" }, // S_VAMPIRE
    { sym: 'W', name: "", explain: "wraith" }, // S_WRAITH
    { sym: 'X', name: "", explain: "xorn" }, // S_XORN
    { sym: 'Y', name: "", explain: "apelike creature" }, // S_YETI
    { sym: 'Z', name: "", explain: "zombie" }, // S_ZOMBIE
    { sym: '@', name: "", explain: "human or elf" }, // S_HUMAN
    { sym: ' ', name: "", explain: "ghost" }, // S_GHOST
    { sym: '\'', name: "", explain: "golem" }, // S_GOLEM
    { sym: '&', name: "", explain: "major demon" }, // S_DEMON
    { sym: ';', name: "", explain: "sea monster" }, // S_EEL
    { sym: ':', name: "", explain: "lizard" }, // S_LIZARD
    { sym: '~', name: "", explain: "long worm tail" }, // S_WORM_TAIL
    { sym: ']', name: "", explain: "mimic" }, // S_MIMIC_DEF
];

// 7) MONSYMS_PARSE
export const MONSYMS_PARSE_ROWS = Object.freeze([
    ["S_ANT", S_ANT],
    ["S_BLOB", S_BLOB],
    ["S_COCKATRICE", S_COCKATRICE],
    ["S_DOG", S_DOG],
    ["S_EYE", S_EYE],
    ["S_FELINE", S_FELINE],
    ["S_GREMLIN", S_GREMLIN],
    ["S_HUMANOID", S_HUMANOID],
    ["S_IMP", S_IMP],
    ["S_JELLY", S_JELLY],
    ["S_KOBOLD", S_KOBOLD],
    ["S_LEPRECHAUN", S_LEPRECHAUN],
    ["S_MIMIC", S_MIMIC],
    ["S_NYMPH", S_NYMPH],
    ["S_ORC", S_ORC],
    ["S_PIERCER", S_PIERCER],
    ["S_QUADRUPED", S_QUADRUPED],
    ["S_RODENT", S_RODENT],
    ["S_SPIDER", S_SPIDER],
    ["S_TRAPPER", S_TRAPPER],
    ["S_UNICORN", S_UNICORN],
    ["S_VORTEX", S_VORTEX],
    ["S_WORM", S_WORM],
    ["S_XAN", S_XAN],
    ["S_LIGHT", S_LIGHT],
    ["S_ZRUTY", S_ZRUTY],
    ["S_ANGEL", S_ANGEL],
    ["S_BAT", S_BAT],
    ["S_CENTAUR", S_CENTAUR],
    ["S_DRAGON", S_DRAGON],
    ["S_ELEMENTAL", S_ELEMENTAL],
    ["S_FUNGUS", S_FUNGUS],
    ["S_GNOME", S_GNOME],
    ["S_GIANT", S_GIANT],
    ["S_invisible", S_invisible],
    ["S_JABBERWOCK", S_JABBERWOCK],
    ["S_KOP", S_KOP],
    ["S_LICH", S_LICH],
    ["S_MUMMY", S_MUMMY],
    ["S_NAGA", S_NAGA],
    ["S_OGRE", S_OGRE],
    ["S_PUDDING", S_PUDDING],
    ["S_QUANTMECH", S_QUANTMECH],
    ["S_RUSTMONST", S_RUSTMONST],
    ["S_SNAKE", S_SNAKE],
    ["S_TROLL", S_TROLL],
    ["S_UMBER", S_UMBER],
    ["S_VAMPIRE", S_VAMPIRE],
    ["S_WRAITH", S_WRAITH],
    ["S_XORN", S_XORN],
    ["S_YETI", S_YETI],
    ["S_ZOMBIE", S_ZOMBIE],
    ["S_HUMAN", S_HUMAN],
    ["S_GHOST", S_GHOST],
    ["S_GOLEM", S_GOLEM],
    ["S_DEMON", S_DEMON],
    ["S_EEL", S_EEL],
    ["S_LIZARD", S_LIZARD],
    ["S_WORM_TAIL", S_WORM_TAIL],
    ["S_MIMIC_DEF", S_MIMIC_DEF],
]);

// 8) OBJCLASS_DEFCHAR_ENUM
export const ILLOBJ_SYM = ']'.charCodeAt(0);
export const WEAPON_SYM = ')'.charCodeAt(0);
export const ARMOR_SYM = '['.charCodeAt(0);
export const RING_SYM = '='.charCodeAt(0);
export const AMULET_SYM = '"'.charCodeAt(0);
export const TOOL_SYM = '('.charCodeAt(0);
export const FOOD_SYM = '%'.charCodeAt(0);
export const POTION_SYM = '!'.charCodeAt(0);
export const SCROLL_SYM = '?'.charCodeAt(0);
export const SPBOOK_SYM = '+'.charCodeAt(0);
export const WAND_SYM = '/'.charCodeAt(0);
export const GOLD_SYM = '$'.charCodeAt(0);
export const GEM_SYM = '*'.charCodeAt(0);
export const ROCK_SYM = '`'.charCodeAt(0);
export const BALL_SYM = '0'.charCodeAt(0);
export const CHAIN_SYM = '_'.charCodeAt(0);
export const VENOM_SYM = '.'.charCodeAt(0);

// 10) OBJCLASS_S_ENUM
export const S_strange_obj = 1;
export const S_weapon = 2;
export const S_armor = 3;
export const S_ring = 4;
export const S_amulet = 5;
export const S_tool = 6;
export const S_food = 7;
export const S_potion = 8;
export const S_scroll = 9;
export const S_book = 10;
export const S_wand = 11;
export const S_coin = 12;
export const S_gem = 13;
export const S_rock = 14;
export const S_ball = 15;
export const S_chain = 16;
export const S_venom = 17;

// 11) OBJCLASS_DRAWING
export const def_oc_syms = [
    { sym: '', name: "", explain: "" },
    { sym: ']', name: "illegal objects", explain: "strange object" }, // ILLOBJ_CLASS
    { sym: ')', name: "weapons", explain: "weapon" }, // WEAPON_CLASS
    { sym: '[', name: "armor", explain: "suit or piece of armor" }, // ARMOR_CLASS
    { sym: '=', name: "rings", explain: "ring" }, // RING_CLASS
    { sym: '"', name: "amulets", explain: "amulet" }, // AMULET_CLASS
    { sym: '(', name: "tools", explain: "useful item (pick-axe, key, lamp...)" }, // TOOL_CLASS
    { sym: '%', name: "food", explain: "piece of food" }, // FOOD_CLASS
    { sym: '!', name: "potions", explain: "potion" }, // POTION_CLASS
    { sym: '?', name: "scrolls", explain: "scroll" }, // SCROLL_CLASS
    { sym: '+', name: "spellbooks", explain: "spellbook" }, // SPBOOK_CLASS
    { sym: '/', name: "wands", explain: "wand" }, // WAND_CLASS
    { sym: '$', name: "coins", explain: "pile of coins" }, // COIN_CLASS
    { sym: '*', name: "rocks", explain: "gem or rock" }, // GEM_CLASS
    { sym: '`', name: "large stones", explain: "boulder or statue" }, // ROCK_CLASS
    { sym: '0', name: "iron balls", explain: "iron ball" }, // BALL_CLASS
    { sym: '_', name: "chains", explain: "iron chain" }, // CHAIN_CLASS
    { sym: '.', name: "venoms", explain: "splash of venom" }, // VENOM_CLASS
];
export const MAXPCHARS = 105;

// 12) OBJCLASS_PARSE
export const OBJCLASS_PARSE_ROWS = Object.freeze([
    ["S_strange_obj", S_strange_obj],
    ["S_weapon", S_weapon],
    ["S_armor", S_armor],
    ["S_ring", S_ring],
    ["S_amulet", S_amulet],
    ["S_tool", S_tool],
    ["S_food", S_food],
    ["S_potion", S_potion],
    ["S_scroll", S_scroll],
    ["S_book", S_book],
    ["S_wand", S_wand],
    ["S_coin", S_coin],
    ["S_gem", S_gem],
    ["S_rock", S_rock],
    ["S_ball", S_ball],
    ["S_chain", S_chain],
    ["S_venom", S_venom],
]);

// 13) PCHAR_TILES
export const PCHAR_TILES_ROWS = Object.freeze([
    [S_stone, "dark part of a room", "stone"],
    [S_vwall, "vertical wall", "wall"],
    [S_hwall, "horizontal wall", "wall"],
    [S_tlcorn, "top left corner wall", "wall"],
    [S_trcorn, "top right corner wall", "wall"],
    [S_blcorn, "bottom left corner wall", "wall"],
    [S_brcorn, "bottom right corner wall", "wall"],
    [S_crwall, "cross wall", "wall"],
    [S_tuwall, "tuwall", "wall"],
    [S_tdwall, "tdwall", "wall"],
    [S_tlwall, "tlwall", "wall"],
    [S_trwall, "trwall", "wall"],
    [S_ndoor, "no door", "doorway"],
    [S_vodoor, "vertical open door", "open door"],
    [S_hodoor, "horizontal open door", "open door"],
    [S_vcdoor, "vertical closed door", "closed door"],
    [S_hcdoor, "horizontal closed door", "closed door"],
    [S_bars, "iron bars", "iron bars"],
    [S_tree, "tree", "tree"],
    [S_room, "floor of a room", "floor of a room"],
    [S_darkroom, "dark part of a room", "dark part of a room"],
    [S_engroom, "engraving in a room", "engraving"],
    [S_corr, "dark corridor", "corridor"],
    [S_litcorr, "lit corridor", "lit corridor"],
    [S_engrcorr, "engraving in a corridor", "engraving"],
    [S_upstair, "up stairs", "staircase up"],
    [S_dnstair, "down stairs", "staircase down"],
    [S_upladder, "up ladder", "ladder up"],
    [S_dnladder, "down ladder", "ladder down"],
    [S_brupstair, "branch staircase up", "branch staircase up"],
    [S_brdnstair, "branch staircase down", "branch staircase down"],
    [S_brupladder, "branch ladder up", "branch ladder up"],
    [S_brdnladder, "branch ladder down", "branch ladder down"],
    [S_altar, "altar", "altar"],
    [S_grave, "grave", "grave"],
    [S_throne, "throne", "opulent throne"],
    [S_sink, "sink", "sink"],
    [S_fountain, "fountain", "fountain"],
    [S_pool, "pool", "water"],
    [S_ice, "ice", "ice"],
    [S_lava, "molten lava", "molten lava"],
    [S_lavawall, "wall of lava", "wall of lava"],
    [S_vodbridge, "vertical open drawbridge", "lowered drawbridge"],
    [S_hodbridge, "horizontal open drawbridge", "lowered drawbridge"],
    [S_vcdbridge, "vertical closed drawbridge", "raised drawbridge"],
    [S_hcdbridge, "horizontal closed drawbridge", "raised drawbridge"],
    [S_air, "air", "air"],
    [S_cloud, "cloud", "cloud"],
    [S_water, "water", "water"],
    [S_arrow_trap, "arrow trap", "arrow trap"],
    [S_dart_trap, "dart trap", "dart trap"],
    [S_falling_rock_trap, "falling rock trap", "falling rock trap"],
    [S_squeaky_board, "squeaky board", "squeaky board"],
    [S_bear_trap, "bear trap", "bear trap"],
    [S_land_mine, "land mine", "land mine"],
    [S_rolling_boulder_trap, "rolling boulder trap", "rolling boulder trap"],
    [S_sleeping_gas_trap, "sleeping gas trap", "sleeping gas trap"],
    [S_rust_trap, "rust trap", "rust trap"],
    [S_fire_trap, "fire trap", "fire trap"],
    [S_pit, "pit", "pit"],
    [S_spiked_pit, "spiked pit", "spiked pit"],
    [S_hole, "hole", "hole"],
    [S_trap_door, "trap door", "trap door"],
    [S_teleportation_trap, "teleportation trap", "teleportation trap"],
    [S_level_teleporter, "level teleporter", "level teleporter"],
    [S_magic_portal, "magic portal", "magic portal"],
    [S_web, "web", "web"],
    [S_statue_trap, "statue trap", "statue trap"],
    [S_magic_trap, "magic trap", "magic trap"],
    [S_anti_magic_trap, "anti magic trap", "anti-magic field"],
    [S_polymorph_trap, "polymorph trap", "polymorph trap"],
    [S_vibrating_square, "vibrating square", "vibrating square"],
    [S_trapped_door, "trapped door", "trapped door"],
    [S_trapped_chest, "trapped chest", "trapped chest"],
    [S_vbeam, "vertical beam", ""],
    [S_hbeam, "horizontal beam", ""],
    [S_lslant, "left slant beam", ""],
    [S_rslant, "right slant beam", ""],
    [S_digbeam, "dig beam", ""],
    [S_flashbeam, "flash beam", ""],
    [S_boomleft, "boom left", ""],
    [S_boomright, "boom right", ""],
    [S_ss1, "shield1", ""],
    [S_ss2, "shield2", ""],
    [S_ss3, "shield3", ""],
    [S_ss4, "shield4", ""],
    [S_poisoncloud, "poison cloud", "poison cloud"],
    [S_goodpos, "valid position", "valid position"],
    [S_sw_tl, "swallow top left", ""],
    [S_sw_tc, "swallow top center", ""],
    [S_sw_tr, "swallow top right", ""],
    [S_sw_ml, "swallow middle left", ""],
    [S_sw_mr, "swallow middle right", ""],
    [S_sw_bl, "swallow bottom left", ""],
    [S_sw_bc, "swallow bottom center", ""],
    [S_sw_br, "swallow bottom right", ""],
    [S_expl_tl, "explosion top left", ""],
    [S_expl_tc, "explosion top center", ""],
    [S_expl_tr, "explosion top right", ""],
    [S_expl_ml, "explosion middle left", ""],
    [S_expl_mc, "explosion middle center", ""],
    [S_expl_mr, "explosion middle right", ""],
    [S_expl_bl, "explosion bottom left", ""],
    [S_expl_bc, "explosion bottom center", ""],
    [S_expl_br, "explosion bottom right", ""],
]);

// Derived constants that depend on PCHAR symbol ordinals
export const MAXDCHARS = S_water - S_stone + 1;
export const MAXECHARS = S_expl_br - S_vbeam + 1;
// AUTO-IMPORT-END: SYMBOLS

import { MAXEXPCHARS, WARNCOUNT, SYM_OFF_P, MAXOTHER, MAXTCHARS, PRIMARYSET, ROGUESET, def_warnsyms } from './const.js';
import { NUM_OBJECTS, MAXOCLASSES } from './objects.js';
import { NUMMONS } from './monsters.js';

// ===== display.h constants (owned by symbols.js) =====
export const GM_FLAGS = 0;
export const GM_TTYCHAR = (GM_FLAGS + 1);
export const GM_COLOR = (GM_TTYCHAR + 1);
export const NUM_GLYPHMOD = (GM_COLOR + 1);
export const GLYPH_MON_OFF = 0;
export const SHIELD_COUNT = 21;
export const NUM_ZAP = 8;
export const MG_FLAG_NORMAL = 0x00;
export const MG_FLAG_NOOVERRIDE = 0x01;
export const MG_HERO = 0x00001;
export const MG_CORPSE = 0x00002;
export const MG_INVIS = 0x00004;
export const MG_DETECT = 0x00008;
export const MG_PET = 0x00010;
export const MG_RIDDEN = 0x00020;
export const MG_STATUE = 0x00040;
export const MG_OBJPILE = 0x00080;
export const MG_BW_LAVA = 0x00100;
export const MG_BW_ICE = 0x00200;
export const MG_BW_SINK = 0x00200;
export const MG_BW_ENGR = 0x00200;
export const MG_NOTHING = 0x00400;
export const MG_UNEXPL = 0x00800;
export const MG_MALE = 0x01000;
export const MG_FEMALE = 0x02000;
export const MG_BADXY = 0x04000;

// include/display.h enum glyph_offsets
export const GLYPH_MON_MALE_OFF = GLYPH_MON_OFF;
export const GLYPH_MON_FEM_OFF = (NUMMONS + GLYPH_MON_MALE_OFF);
export const GLYPH_PET_OFF = (NUMMONS + GLYPH_MON_FEM_OFF);
export const GLYPH_PET_MALE_OFF = (GLYPH_PET_OFF);
export const GLYPH_PET_FEM_OFF = (NUMMONS + GLYPH_PET_MALE_OFF);
export const GLYPH_INVIS_OFF = (NUMMONS + GLYPH_PET_FEM_OFF);
export const GLYPH_DETECT_OFF = (1 + GLYPH_INVIS_OFF);
export const GLYPH_DETECT_MALE_OFF = (GLYPH_DETECT_OFF);
export const GLYPH_DETECT_FEM_OFF = (NUMMONS + GLYPH_DETECT_MALE_OFF);
export const GLYPH_BODY_OFF = (NUMMONS + GLYPH_DETECT_FEM_OFF);
export const GLYPH_RIDDEN_OFF = (NUMMONS + GLYPH_BODY_OFF);
export const GLYPH_RIDDEN_MALE_OFF = (GLYPH_RIDDEN_OFF);
export const GLYPH_RIDDEN_FEM_OFF = (NUMMONS + GLYPH_RIDDEN_MALE_OFF);
export const GLYPH_OBJ_OFF = (NUMMONS + GLYPH_RIDDEN_FEM_OFF);
export const GLYPH_CMAP_OFF = (NUM_OBJECTS + GLYPH_OBJ_OFF);
export const GLYPH_CMAP_STONE_OFF = (GLYPH_CMAP_OFF);
export const GLYPH_CMAP_MAIN_OFF = (1 + GLYPH_CMAP_STONE_OFF);
export const GLYPH_CMAP_MINES_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MAIN_OFF);
export const GLYPH_CMAP_GEH_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_MINES_OFF);
export const GLYPH_CMAP_KNOX_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_GEH_OFF);
export const GLYPH_CMAP_SOKO_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_KNOX_OFF);
export const GLYPH_CMAP_A_OFF = (((S_trwall - S_vwall) + 1) + GLYPH_CMAP_SOKO_OFF);
export const GLYPH_ALTAR_OFF = (((S_brdnladder - S_ndoor) + 1) + GLYPH_CMAP_A_OFF);
export const GLYPH_CMAP_B_OFF = (5 + GLYPH_ALTAR_OFF);
export const GLYPH_ZAP_OFF = ((S_arrow_trap + MAXTCHARS - S_grave) + GLYPH_CMAP_B_OFF);
export const GLYPH_CMAP_C_OFF = ((NUM_ZAP << 2) + GLYPH_ZAP_OFF);
export const GLYPH_SWALLOW_OFF = (((S_goodpos - S_digbeam) + 1) + GLYPH_CMAP_C_OFF);
export const GLYPH_EXPLODE_OFF = ((NUMMONS << 3) + GLYPH_SWALLOW_OFF);
export const GLYPH_EXPLODE_DARK_OFF = (GLYPH_EXPLODE_OFF);
export const GLYPH_EXPLODE_NOXIOUS_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_DARK_OFF);
export const GLYPH_EXPLODE_MUDDY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_NOXIOUS_OFF);
export const GLYPH_EXPLODE_WET_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MUDDY_OFF);
export const GLYPH_EXPLODE_MAGICAL_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_WET_OFF);
export const GLYPH_EXPLODE_FIERY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_MAGICAL_OFF);
export const GLYPH_EXPLODE_FROSTY_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FIERY_OFF);
export const GLYPH_WARNING_OFF = (MAXEXPCHARS + GLYPH_EXPLODE_FROSTY_OFF);
export const GLYPH_STATUE_OFF = (WARNCOUNT + GLYPH_WARNING_OFF);
export const GLYPH_STATUE_MALE_OFF = (GLYPH_STATUE_OFF);
export const GLYPH_STATUE_FEM_OFF = (NUMMONS + GLYPH_STATUE_MALE_OFF);
export const GLYPH_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_FEM_OFF);
export const GLYPH_OBJ_PILETOP_OFF = (GLYPH_PILETOP_OFF);
export const GLYPH_BODY_PILETOP_OFF = (NUM_OBJECTS + GLYPH_OBJ_PILETOP_OFF);
export const GLYPH_STATUE_MALE_PILETOP_OFF = (NUMMONS + GLYPH_BODY_PILETOP_OFF);
export const GLYPH_STATUE_FEM_PILETOP_OFF = (NUMMONS + GLYPH_STATUE_MALE_PILETOP_OFF);
export const GLYPH_UNEXPLORED_OFF = (NUMMONS + GLYPH_STATUE_FEM_PILETOP_OFF);
export const GLYPH_NOTHING_OFF = (GLYPH_UNEXPLORED_OFF + 1);
export const MAX_GLYPH = (GLYPH_NOTHING_OFF + 1);

// display.h macro aliases
export const NO_GLYPH = MAX_GLYPH;
export const GLYPH_INVISIBLE = GLYPH_INVIS_OFF;
export const GLYPH_UNEXPLORED = GLYPH_UNEXPLORED_OFF;
export const GLYPH_NOTHING = GLYPH_NOTHING_OFF;

// hack.h — symbol offset table (depends on MAXPCHARS/MAXOCLASSES/MAXMCLASSES)
export const SYM_OFF_O = (SYM_OFF_P + MAXPCHARS);
export const SYM_OFF_M = (SYM_OFF_O + MAXOCLASSES);
export const SYM_OFF_W = (SYM_OFF_M + MAXMCLASSES);
export const SYM_OFF_X = (SYM_OFF_W + WARNCOUNT);
export const SYM_MAX = (SYM_OFF_X + MAXOTHER);

// Trap <-> defsym conversion (from include/rm.h, lines 483-484)
// Moved from const.js — depends on S_arrow_trap
export function trap_to_defsym(t) { return S_arrow_trap + t - 1; }
export function defsym_to_trap(d) { return d - S_arrow_trap + 1; }

// C ref: include/display.h glyph_is_* predicate macros (range checks)
export function glyph_is_monster(g) { return g >= GLYPH_MON_OFF && g < GLYPH_PET_OFF; }
export function glyph_is_pet(g) { return g >= GLYPH_PET_OFF && g < GLYPH_INVIS_OFF; }
export function glyph_is_invisible(g) { return g === GLYPH_INVIS_OFF; }
export function glyph_is_detect(g) { return g >= GLYPH_DETECT_OFF && g < GLYPH_BODY_OFF; }
export function glyph_is_body(g) { return g >= GLYPH_BODY_OFF && g < GLYPH_RIDDEN_OFF; }
export function glyph_is_ridden(g) { return g >= GLYPH_RIDDEN_OFF && g < GLYPH_OBJ_OFF; }
export function glyph_is_object(g) { return g >= GLYPH_OBJ_OFF && g < GLYPH_CMAP_OFF; }
export function glyph_is_cmap(g) { return g >= GLYPH_CMAP_OFF && g < GLYPH_SWALLOW_OFF; }
export function glyph_is_cmap_main(g) { return g >= GLYPH_CMAP_MAIN_OFF && g < GLYPH_CMAP_MINES_OFF; }
export function glyph_is_cmap_mines(g) { return g >= GLYPH_CMAP_MINES_OFF && g < GLYPH_CMAP_GEH_OFF; }
export function glyph_is_cmap_gehennom(g) { return g >= GLYPH_CMAP_GEH_OFF && g < GLYPH_CMAP_KNOX_OFF; }
export function glyph_is_cmap_knox(g) { return g >= GLYPH_CMAP_KNOX_OFF && g < GLYPH_CMAP_SOKO_OFF; }
export function glyph_is_cmap_sokoban(g) { return g >= GLYPH_CMAP_SOKO_OFF && g < GLYPH_CMAP_A_OFF; }
export function glyph_is_cmap_a(g) { return g >= GLYPH_CMAP_A_OFF && g < GLYPH_ALTAR_OFF; }
export function glyph_is_cmap_altar(g) { return g >= GLYPH_ALTAR_OFF && g < GLYPH_CMAP_B_OFF; }
export function glyph_is_cmap_b(g) { return g >= GLYPH_CMAP_B_OFF && g < GLYPH_ZAP_OFF; }
export function glyph_is_cmap_zap(g) { return g >= GLYPH_ZAP_OFF && g < GLYPH_CMAP_C_OFF; }
export function glyph_is_cmap_c(g) { return g >= GLYPH_CMAP_C_OFF && g < GLYPH_SWALLOW_OFF; }
export function glyph_is_swallow(g) { return g >= GLYPH_SWALLOW_OFF && g < GLYPH_EXPLODE_OFF; }
export function glyph_is_explosion(g) { return g >= GLYPH_EXPLODE_OFF && g < GLYPH_WARNING_OFF; }
export function glyph_is_warning(g) { return g >= GLYPH_WARNING_OFF && g < GLYPH_STATUE_OFF; }
export function glyph_is_statue(g) { return g >= GLYPH_STATUE_OFF && g < GLYPH_PILETOP_OFF; }
export function glyph_is_piletop(g) { return g >= GLYPH_PILETOP_OFF && g < GLYPH_UNEXPLORED_OFF; }
// C ref: glyph_is_trap checks cmap_b range AND trap defsym range
export function glyph_is_trap(g) {
    if (!glyph_is_cmap_b(g)) return false;
    const sym = (g - GLYPH_CMAP_B_OFF) + S_grave;
    return sym >= S_arrow_trap && sym < S_arrow_trap + MAXTCHARS;
}

// C ref: include/display.h glyph_to_* converter macros
export function glyph_to_mon(g) { return g >= GLYPH_MON_FEM_OFF ? g - GLYPH_MON_FEM_OFF : g - GLYPH_MON_MALE_OFF; }
export function glyph_to_obj(g) { return g - GLYPH_OBJ_OFF; }
export function glyph_to_trap(g) { return ((g - GLYPH_CMAP_B_OFF) + S_grave) - S_arrow_trap + 1; }
export function glyph_to_swallow(g) { return (g - GLYPH_SWALLOW_OFF) & 7; }
export function glyph_to_explosion(g) { return (g - GLYPH_EXPLODE_OFF) % (S_expl_br - S_expl_tl + 1); }

// C ref: drawing.c def_char_to_objclass()
export function def_char_to_objclass(ch) {
    for (let i = 1; i < MAXOCLASSES; i++) {
        if (ch === def_oc_syms[i].sym) return i;
    }
    return MAXOCLASSES;
}

// C ref: drawing.c def_char_to_monclass()
export function def_char_to_monclass(ch) {
    for (let i = 1; i < MAXMCLASSES; i++) {
        if (ch === def_monsyms[i].sym) return i;
    }
    return MAXMCLASSES;
}

// C ref: drawing.c def_char_is_furniture()
// Returns defsyms[] index when char maps to furniture, else -1.
export function def_char_is_furniture(ch) {
    let furniture = false;
    for (let i = 0; i < MAXPCHARS; ++i) {
        const desc = String(defsyms[i]?.desc || '');
        if (!furniture && desc.startsWith('stair')) furniture = true;
        if (furniture) {
            if (defsyms[i].ch === ch) return i;
            if (desc === 'fountain') break;
        }
    }
    return -1;
}
