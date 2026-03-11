// monsters.js — monster constants and data
// Auto-imported from nethack-c/include/monsters.h
// Regenerate with: python3 scripts/generators/gen_monsters.py
// AUTO-IMPORT-BEGIN: MONSTERS
// NetHack 3.7 Monster Data - auto-generated from monsters.h
// Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985.
// NetHack may be freely redistributed.  See license for details.

import { CLR_BLACK, CLR_BLUE, CLR_BRIGHT_BLUE, CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA, CLR_BROWN, CLR_CYAN, CLR_GRAY, CLR_GREEN, CLR_MAGENTA, CLR_ORANGE, CLR_RED, CLR_WHITE, CLR_YELLOW, DRAGON_SILVER, HI_DOMESTIC, HI_GOLD, HI_LEATHER, HI_LORD, HI_METAL, HI_OVERLORD, HI_PAPER, HI_WOOD, HI_ZAP } from "./const.js";

// Monster symbol classes (from defsym.h)
export const S_ANT = 1;
export const S_BLOB = 2;
export const S_COCKATRICE = 3;
export const S_DOG = 4;
export const S_EYE = 5;
export const S_FELINE = 6;
export const S_GREMLIN = 7;
export const S_HUMANOID = 8;
export const S_IMP = 9;
export const S_JELLY = 10;
export const S_KOBOLD = 11;
export const S_LEPRECHAUN = 12;
export const S_MIMIC = 13;
export const S_NYMPH = 14;
export const S_ORC = 15;
export const S_PIERCER = 16;
export const S_QUADRUPED = 17;
export const S_RODENT = 18;
export const S_SPIDER = 19;
export const S_TRAPPER = 20;
export const S_UNICORN = 21;
export const S_VORTEX = 22;
export const S_WORM = 23;
export const S_XAN = 24;
export const S_LIGHT = 25;
export const S_ZRUTY = 26;
export const S_ANGEL = 27;
export const S_BAT = 28;
export const S_CENTAUR = 29;
export const S_DRAGON = 30;
export const S_ELEMENTAL = 31;
export const S_FUNGUS = 32;
export const S_GNOME = 33;
export const S_GIANT = 34;
export const S_invisible = 35;
export const S_JABBERWOCK = 36;
export const S_KOP = 37;
export const S_LICH = 38;
export const S_MUMMY = 39;
export const S_NAGA = 40;
export const S_OGRE = 41;
export const S_PUDDING = 42;
export const S_QUANTMECH = 43;
export const S_RUSTMONST = 44;
export const S_SNAKE = 45;
export const S_TROLL = 46;
export const S_UMBER = 47;
export const S_VAMPIRE = 48;
export const S_WRAITH = 49;
export const S_XORN = 50;
export const S_YETI = 51;
export const S_ZOMBIE = 52;
export const S_HUMAN = 53;
export const S_GHOST = 54;
export const S_GOLEM = 55;
export const S_DEMON = 56;
export const S_EEL = 57;
export const S_LIZARD = 58;
export const S_WORM_TAIL = 59;
export const S_MIMIC_DEF = 60;
export const MAXMCLASSES = 61;

// Attack types (from monattk.h)
export const AT_ANY = -1;
export const AT_NONE = 0;
export const AT_CLAW = 1;
export const AT_BITE = 2;
export const AT_KICK = 3;
export const AT_BUTT = 4;
export const AT_TUCH = 5;
export const AT_STNG = 6;
export const AT_HUGS = 7;
export const AT_SPIT = 10;
export const AT_ENGL = 11;
export const AT_BREA = 12;
export const AT_EXPL = 13;
export const AT_BOOM = 14;
export const AT_GAZE = 15;
export const AT_TENT = 16;
export const AT_WEAP = 254;
export const AT_MAGC = 255;

// Damage types (from monattk.h)
export const AD_ANY = -1;
export const AD_PHYS = 0;
export const AD_MAGM = 1;
export const AD_FIRE = 2;
export const AD_COLD = 3;
export const AD_SLEE = 4;
export const AD_DISN = 5;
export const AD_ELEC = 6;
export const AD_DRST = 7;
export const AD_ACID = 8;
export const AD_SPC1 = 9;
export const AD_SPC2 = 10;
export const AD_BLND = 11;
export const AD_STUN = 12;
export const AD_SLOW = 13;
export const AD_PLYS = 14;
export const AD_DRLI = 15;
export const AD_DREN = 16;
export const AD_LEGS = 17;
export const AD_STON = 18;
export const AD_STCK = 19;
export const AD_SGLD = 20;
export const AD_SITM = 21;
export const AD_SEDU = 22;
export const AD_TLPT = 23;
export const AD_RUST = 24;
export const AD_CONF = 25;
export const AD_DGST = 26;
export const AD_HEAL = 27;
export const AD_WRAP = 28;
export const AD_WERE = 29;
export const AD_DRDX = 30;
export const AD_DRCO = 31;
export const AD_DRIN = 32;
export const AD_DISE = 33;
export const AD_DCAY = 34;
export const AD_SSEX = 35;
export const AD_HALU = 36;
export const AD_DETH = 37;
export const AD_PEST = 38;
export const AD_FAMN = 39;
export const AD_SLIM = 40;
export const AD_ENCH = 41;
export const AD_CORR = 42;
export const AD_POLY = 43;
export const AD_CLRC = 240;
export const AD_SPEL = 241;
export const AD_RBRE = 242;
export const AD_SAMU = 252;
export const AD_CURS = 253;

// Resistances (from monflag.h)
export const MR_FIRE = 0x01;
export const MR_COLD = 0x02;
export const MR_SLEEP = 0x04;
export const MR_DISINT = 0x08;
export const MR_ELEC = 0x10;
export const MR_POISON = 0x20;
export const MR_ACID = 0x40;
export const MR_STONE = 0x80;

// MR2 resistances (from monflag.h)
export const MR2_SEE_INVIS = 0x0100;
export const MR2_LEVITATE = 0x0200;
export const MR2_WATERWALK = 0x0400;
export const MR2_MAGBREATH = 0x0800;
export const MR2_DISPLACED = 0x1000;
export const MR2_STRENGTH = 0x2000;
export const MR2_FUMBLING = 0x4000;

// Monster flags 1 (from monflag.h)
export const M1_FLY = 0x00000001;
export const M1_SWIM = 0x00000002;
export const M1_AMORPHOUS = 0x00000004;
export const M1_WALLWALK = 0x00000008;
export const M1_CLING = 0x00000010;
export const M1_TUNNEL = 0x00000020;
export const M1_NEEDPICK = 0x00000040;
export const M1_CONCEAL = 0x00000080;
export const M1_HIDE = 0x00000100;
export const M1_AMPHIBIOUS = 0x00000200;
export const M1_BREATHLESS = 0x00000400;
export const M1_NOTAKE = 0x00000800;
export const M1_NOEYES = 0x00001000;
export const M1_NOHANDS = 0x00002000;
export const M1_NOLIMBS = 0x00006000;
export const M1_NOHEAD = 0x00008000;
export const M1_MINDLESS = 0x00010000;
export const M1_HUMANOID = 0x00020000;
export const M1_ANIMAL = 0x00040000;
export const M1_SLITHY = 0x00080000;
export const M1_UNSOLID = 0x00100000;
export const M1_THICK_HIDE = 0x00200000;
export const M1_OVIPAROUS = 0x00400000;
export const M1_REGEN = 0x00800000;
export const M1_SEE_INVIS = 0x01000000;
export const M1_TPORT = 0x02000000;
export const M1_TPORT_CNTRL = 0x04000000;
export const M1_ACID = 0x08000000;
export const M1_POIS = 0x10000000;
export const M1_CARNIVORE = 0x20000000;
export const M1_HERBIVORE = 0x40000000;
export const M1_OMNIVORE = 0x60000000;
export const M1_METALLIVORE = 0x80000000;

// Monster flags 2 (from monflag.h)
export const M2_NOPOLY = 0x00000001;
export const M2_UNDEAD = 0x00000002;
export const M2_WERE = 0x00000004;
export const M2_HUMAN = 0x00000008;
export const M2_ELF = 0x00000010;
export const M2_DWARF = 0x00000020;
export const M2_GNOME = 0x00000040;
export const M2_ORC = 0x00000080;
export const M2_DEMON = 0x00000100;
export const M2_MERC = 0x00000200;
export const M2_LORD = 0x00000400;
export const M2_PRINCE = 0x00000800;
export const M2_MINION = 0x00001000;
export const M2_GIANT = 0x00002000;
export const M2_SHAPESHIFTER = 0x00004000;
export const M2_MALE = 0x00010000;
export const M2_FEMALE = 0x00020000;
export const M2_NEUTER = 0x00040000;
export const M2_PNAME = 0x00080000;
export const M2_HOSTILE = 0x00100000;
export const M2_PEACEFUL = 0x00200000;
export const M2_DOMESTIC = 0x00400000;
export const M2_WANDER = 0x00800000;
export const M2_STALK = 0x01000000;
export const M2_NASTY = 0x02000000;
export const M2_STRONG = 0x04000000;
export const M2_ROCKTHROW = 0x08000000;
export const M2_GREEDY = 0x10000000;
export const M2_JEWELS = 0x20000000;
export const M2_COLLECT = 0x40000000;
export const M2_MAGIC = 0x80000000;

// Monster flags 3 (from monflag.h)
export const M3_WANTSAMUL = 0x0001;
export const M3_WANTSBELL = 0x0002;
export const M3_WANTSBOOK = 0x0004;
export const M3_WANTSCAND = 0x0008;
export const M3_WANTSARTI = 0x0010;
export const M3_WANTSALL = 0x001f;
export const M3_WAITFORU = 0x0040;
export const M3_CLOSE = 0x0080;
export const M3_COVETOUS = 0x001f;
export const M3_WAITMASK = 0x00c0;
export const M3_INFRAVISION = 0x0100;
export const M3_INFRAVISIBLE = 0x0200;
export const M3_DISPLACES = 0x0400;

// Generation flags (from monflag.h)
export const G_UNIQ = 0x1000;
export const G_NOHELL = 0x0800;
export const G_HELL = 0x0400;
export const G_NOGEN = 0x0200;
export const G_SGROUP = 0x0080;
export const G_LGROUP = 0x0040;
export const G_GENO = 0x0020;
export const G_NOCORPSE = 0x0010;
export const G_FREQ = 0x0007;
export const G_IGNORE = 0x8000;

// mvflags constants (for game.mvitals[mndx].mvflags genocide/extinction tracking)
export const G_GENOD = 0x01;
export const G_EXTINCT = 0x02;
export const G_GONE = G_GENOD | G_EXTINCT;

// Monster sounds (from monflag.h)
export const MS_SILENT = 0;
export const MS_BARK = 1;
export const MS_MEW = 2;
export const MS_ROAR = 3;
export const MS_BELLOW = 4;
export const MS_GROWL = 5;
export const MS_SQEEK = 6;
export const MS_SQAWK = 7;
export const MS_CHIRP = 8;
export const MS_HISS = 9;
export const MS_BUZZ = 10;
export const MS_GRUNT = 11;
export const MS_NEIGH = 12;
export const MS_MOO = 13;
export const MS_WAIL = 14;
export const MS_GURGLE = 15;
export const MS_BURBLE = 16;
export const MS_TRUMPET = 17;
export const MS_ANIMAL = 17;
export const MS_SHRIEK = 18;
export const MS_BONES = 19;
export const MS_LAUGH = 20;
export const MS_MUMBLE = 21;
export const MS_IMITATE = 22;
export const MS_WERE = 23;
export const MS_ORC = 24;
export const MS_HUMANOID = 25;
export const MS_ARREST = 26;
export const MS_SOLDIER = 27;
export const MS_GUARD = 28;
export const MS_DJINNI = 29;
export const MS_NURSE = 30;
export const MS_SEDUCE = 31;
export const MS_VAMPIRE = 32;
export const MS_BRIBE = 33;
export const MS_CUSS = 34;
export const MS_RIDER = 35;
export const MS_LEADER = 36;
export const MS_NEMESIS = 37;
export const MS_GUARDIAN = 38;
export const MS_SELL = 39;
export const MS_ORACLE = 40;
export const MS_PRIEST = 41;
export const MS_SPELL = 42;
export const MS_BOAST = 43;
export const MS_GROAN = 44;

// Monster sizes (from monflag.h)
export const MZ_TINY = 0;
export const MZ_SMALL = 1;
export const MZ_MEDIUM = 2;
export const MZ_HUMAN = 2;
export const MZ_LARGE = 3;
export const MZ_HUGE = 4;
export const MZ_GIGANTIC = 7;

// Monster index constants (PM_*)
export const PM_GIANT_ANT = 0;
export const PM_KILLER_BEE = 1;
export const PM_SOLDIER_ANT = 2;
export const PM_FIRE_ANT = 3;
export const PM_GIANT_BEETLE = 4;
export const PM_QUEEN_BEE = 5;
export const PM_ACID_BLOB = 6;
export const PM_QUIVERING_BLOB = 7;
export const PM_GELATINOUS_CUBE = 8;
export const PM_CHICKATRICE = 9;
export const PM_COCKATRICE = 10;
export const PM_PYROLISK = 11;
export const PM_JACKAL = 12;
export const PM_FOX = 13;
export const PM_COYOTE = 14;
export const PM_WEREJACKAL = 15;
export const PM_LITTLE_DOG = 16;
export const PM_DINGO = 17;
export const PM_DOG = 18;
export const PM_LARGE_DOG = 19;
export const PM_WOLF = 20;
export const PM_WEREWOLF = 21;
export const PM_WINTER_WOLF_CUB = 22;
export const PM_WARG = 23;
export const PM_WINTER_WOLF = 24;
export const PM_HELL_HOUND_PUP = 25;
export const PM_HELL_HOUND = 26;
export const PM_GAS_SPORE = 27;
export const PM_FLOATING_EYE = 28;
export const PM_FREEZING_SPHERE = 29;
export const PM_FLAMING_SPHERE = 30;
export const PM_SHOCKING_SPHERE = 31;
export const PM_KITTEN = 32;
export const PM_HOUSECAT = 33;
export const PM_JAGUAR = 34;
export const PM_LYNX = 35;
export const PM_PANTHER = 36;
export const PM_LARGE_CAT = 37;
export const PM_TIGER = 38;
export const PM_DISPLACER_BEAST = 39;
export const PM_GREMLIN = 40;
export const PM_GARGOYLE = 41;
export const PM_WINGED_GARGOYLE = 42;
export const PM_HOBBIT = 43;
export const PM_DWARF = 44;
export const PM_BUGBEAR = 45;
export const PM_DWARF_LEADER = 46;
export const PM_DWARF_RULER = 47;
export const PM_MIND_FLAYER = 48;
export const PM_MASTER_MIND_FLAYER = 49;
export const PM_MANES = 50;
export const PM_HOMUNCULUS = 51;
export const PM_IMP = 52;
export const PM_LEMURE = 53;
export const PM_QUASIT = 54;
export const PM_TENGU = 55;
export const PM_BLUE_JELLY = 56;
export const PM_SPOTTED_JELLY = 57;
export const PM_OCHRE_JELLY = 58;
export const PM_KOBOLD = 59;
export const PM_LARGE_KOBOLD = 60;
export const PM_KOBOLD_LEADER = 61;
export const PM_KOBOLD_SHAMAN = 62;
export const PM_LEPRECHAUN = 63;
export const PM_SMALL_MIMIC = 64;
export const PM_LARGE_MIMIC = 65;
export const PM_GIANT_MIMIC = 66;
export const PM_WOOD_NYMPH = 67;
export const PM_WATER_NYMPH = 68;
export const PM_MOUNTAIN_NYMPH = 69;
export const PM_GOBLIN = 70;
export const PM_HOBGOBLIN = 71;
export const PM_ORC = 72;
export const PM_HILL_ORC = 73;
export const PM_MORDOR_ORC = 74;
export const PM_URUK_HAI = 75;
export const PM_ORC_SHAMAN = 76;
export const PM_ORC_CAPTAIN = 77;
export const PM_ROCK_PIERCER = 78;
export const PM_IRON_PIERCER = 79;
export const PM_GLASS_PIERCER = 80;
export const PM_ROTHE = 81;
export const PM_MUMAK = 82;
export const PM_LEOCROTTA = 83;
export const PM_WUMPUS = 84;
export const PM_TITANOTHERE = 85;
export const PM_BALUCHITHERIUM = 86;
export const PM_MASTODON = 87;
export const PM_SEWER_RAT = 88;
export const PM_GIANT_RAT = 89;
export const PM_RABID_RAT = 90;
export const PM_WERERAT = 91;
export const PM_ROCK_MOLE = 92;
export const PM_WOODCHUCK = 93;
export const PM_CAVE_SPIDER = 94;
export const PM_CENTIPEDE = 95;
export const PM_GIANT_SPIDER = 96;
export const PM_SCORPION = 97;
export const PM_LURKER_ABOVE = 98;
export const PM_TRAPPER = 99;
export const PM_PONY = 100;
export const PM_WHITE_UNICORN = 101;
export const PM_GRAY_UNICORN = 102;
export const PM_BLACK_UNICORN = 103;
export const PM_HORSE = 104;
export const PM_WARHORSE = 105;
export const PM_FOG_CLOUD = 106;
export const PM_DUST_VORTEX = 107;
export const PM_ICE_VORTEX = 108;
export const PM_ENERGY_VORTEX = 109;
export const PM_STEAM_VORTEX = 110;
export const PM_FIRE_VORTEX = 111;
export const PM_BABY_LONG_WORM = 112;
export const PM_BABY_PURPLE_WORM = 113;
export const PM_LONG_WORM = 114;
export const PM_PURPLE_WORM = 115;
export const PM_GRID_BUG = 116;
export const PM_XAN = 117;
export const PM_YELLOW_LIGHT = 118;
export const PM_BLACK_LIGHT = 119;
export const PM_ZRUTY = 120;
export const PM_COUATL = 121;
export const PM_ALEAX = 122;
export const PM_ANGEL = 123;
export const PM_KI_RIN = 124;
export const PM_ARCHON = 125;
export const PM_BAT = 126;
export const PM_GIANT_BAT = 127;
export const PM_RAVEN = 128;
export const PM_VAMPIRE_BAT = 129;
export const PM_PLAINS_CENTAUR = 130;
export const PM_FOREST_CENTAUR = 131;
export const PM_MOUNTAIN_CENTAUR = 132;
export const PM_BABY_GRAY_DRAGON = 133;
export const PM_BABY_GOLD_DRAGON = 134;
export const PM_BABY_SILVER_DRAGON = 135;
export const PM_BABY_RED_DRAGON = 136;
export const PM_BABY_WHITE_DRAGON = 137;
export const PM_BABY_ORANGE_DRAGON = 138;
export const PM_BABY_BLACK_DRAGON = 139;
export const PM_BABY_BLUE_DRAGON = 140;
export const PM_BABY_GREEN_DRAGON = 141;
export const PM_BABY_YELLOW_DRAGON = 142;
export const PM_GRAY_DRAGON = 143;
export const PM_GOLD_DRAGON = 144;
export const PM_SILVER_DRAGON = 145;
export const PM_RED_DRAGON = 146;
export const PM_WHITE_DRAGON = 147;
export const PM_ORANGE_DRAGON = 148;
export const PM_BLACK_DRAGON = 149;
export const PM_BLUE_DRAGON = 150;
export const PM_GREEN_DRAGON = 151;
export const PM_YELLOW_DRAGON = 152;
export const PM_STALKER = 153;
export const PM_AIR_ELEMENTAL = 154;
export const PM_FIRE_ELEMENTAL = 155;
export const PM_EARTH_ELEMENTAL = 156;
export const PM_WATER_ELEMENTAL = 157;
export const PM_LICHEN = 158;
export const PM_BROWN_MOLD = 159;
export const PM_YELLOW_MOLD = 160;
export const PM_GREEN_MOLD = 161;
export const PM_RED_MOLD = 162;
export const PM_SHRIEKER = 163;
export const PM_VIOLET_FUNGUS = 164;
export const PM_GNOME = 165;
export const PM_GNOME_LEADER = 166;
export const PM_GNOMISH_WIZARD = 167;
export const PM_GNOME_RULER = 168;
export const PM_GIANT = 169;
export const PM_STONE_GIANT = 170;
export const PM_HILL_GIANT = 171;
export const PM_FIRE_GIANT = 172;
export const PM_FROST_GIANT = 173;
export const PM_ETTIN = 174;
export const PM_STORM_GIANT = 175;
export const PM_TITAN = 176;
export const PM_MINOTAUR = 177;
export const PM_JABBERWOCK = 178;
export const PM_KEYSTONE_KOP = 179;
export const PM_KOP_SERGEANT = 180;
export const PM_KOP_LIEUTENANT = 181;
export const PM_KOP_KAPTAIN = 182;
export const PM_LICH = 183;
export const PM_DEMILICH = 184;
export const PM_MASTER_LICH = 185;
export const PM_ARCH_LICH = 186;
export const PM_KOBOLD_MUMMY = 187;
export const PM_GNOME_MUMMY = 188;
export const PM_ORC_MUMMY = 189;
export const PM_DWARF_MUMMY = 190;
export const PM_ELF_MUMMY = 191;
export const PM_HUMAN_MUMMY = 192;
export const PM_ETTIN_MUMMY = 193;
export const PM_GIANT_MUMMY = 194;
export const PM_RED_NAGA_HATCHLING = 195;
export const PM_BLACK_NAGA_HATCHLING = 196;
export const PM_GOLDEN_NAGA_HATCHLING = 197;
export const PM_GUARDIAN_NAGA_HATCHLING = 198;
export const PM_RED_NAGA = 199;
export const PM_BLACK_NAGA = 200;
export const PM_GOLDEN_NAGA = 201;
export const PM_GUARDIAN_NAGA = 202;
export const PM_OGRE = 203;
export const PM_OGRE_LEADER = 204;
export const PM_OGRE_TYRANT = 205;
export const PM_GRAY_OOZE = 206;
export const PM_BROWN_PUDDING = 207;
export const PM_GREEN_SLIME = 208;
export const PM_BLACK_PUDDING = 209;
export const PM_QUANTUM_MECHANIC = 210;
export const PM_GENETIC_ENGINEER = 211;
export const PM_RUST_MONSTER = 212;
export const PM_DISENCHANTER = 213;
export const PM_GARTER_SNAKE = 214;
export const PM_SNAKE = 215;
export const PM_WATER_MOCCASIN = 216;
export const PM_PYTHON = 217;
export const PM_PIT_VIPER = 218;
export const PM_COBRA = 219;
export const PM_TROLL = 220;
export const PM_ICE_TROLL = 221;
export const PM_ROCK_TROLL = 222;
export const PM_WATER_TROLL = 223;
export const PM_OLOG_HAI = 224;
export const PM_UMBER_HULK = 225;
export const PM_VAMPIRE = 226;
export const PM_VAMPIRE_LEADER = 227;
export const PM_VLAD_THE_IMPALER = 228;
export const PM_BARROW_WIGHT = 229;
export const PM_WRAITH = 230;
export const PM_NAZGUL = 231;
export const PM_XORN = 232;
export const PM_MONKEY = 233;
export const PM_APE = 234;
export const PM_OWLBEAR = 235;
export const PM_YETI = 236;
export const PM_CARNIVOROUS_APE = 237;
export const PM_SASQUATCH = 238;
export const PM_KOBOLD_ZOMBIE = 239;
export const PM_GNOME_ZOMBIE = 240;
export const PM_ORC_ZOMBIE = 241;
export const PM_DWARF_ZOMBIE = 242;
export const PM_ELF_ZOMBIE = 243;
export const PM_HUMAN_ZOMBIE = 244;
export const PM_ETTIN_ZOMBIE = 245;
export const PM_GHOUL = 246;
export const PM_GIANT_ZOMBIE = 247;
export const PM_SKELETON = 248;
export const PM_STRAW_GOLEM = 249;
export const PM_PAPER_GOLEM = 250;
export const PM_ROPE_GOLEM = 251;
export const PM_GOLD_GOLEM = 252;
export const PM_LEATHER_GOLEM = 253;
export const PM_WOOD_GOLEM = 254;
export const PM_FLESH_GOLEM = 255;
export const PM_CLAY_GOLEM = 256;
export const PM_STONE_GOLEM = 257;
export const PM_GLASS_GOLEM = 258;
export const PM_IRON_GOLEM = 259;
export const PM_HUMAN = 260;
export const PM_HUMAN_WERERAT = 261;
export const PM_HUMAN_WEREJACKAL = 262;
export const PM_HUMAN_WEREWOLF = 263;
export const PM_ELF = 264;
export const PM_WOODLAND_ELF = 265;
export const PM_GREEN_ELF = 266;
export const PM_GREY_ELF = 267;
export const PM_ELF_NOBLE = 268;
export const PM_ELVEN_MONARCH = 269;
export const PM_DOPPELGANGER = 270;
export const PM_SHOPKEEPER = 271;
export const PM_GUARD = 272;
export const PM_PRISONER = 273;
export const PM_ORACLE = 274;
export const PM_ALIGNED_CLERIC = 275;
export const PM_HIGH_CLERIC = 276;
export const PM_SOLDIER = 277;
export const PM_SERGEANT = 278;
export const PM_NURSE = 279;
export const PM_LIEUTENANT = 280;
export const PM_CAPTAIN = 281;
export const PM_WATCHMAN = 282;
export const PM_WATCH_CAPTAIN = 283;
export const PM_MEDUSA = 284;
export const PM_WIZARD_OF_YENDOR = 285;
export const PM_CROESUS = 286;
export const PM_GHOST = 287;
export const PM_SHADE = 288;
export const PM_WATER_DEMON = 289;
export const PM_AMOROUS_DEMON = 290;
export const PM_HORNED_DEVIL = 291;
export const PM_ERINYS = 292;
export const PM_BARBED_DEVIL = 293;
export const PM_MARILITH = 294;
export const PM_VROCK = 295;
export const PM_HEZROU = 296;
export const PM_BONE_DEVIL = 297;
export const PM_ICE_DEVIL = 298;
export const PM_NALFESHNEE = 299;
export const PM_PIT_FIEND = 300;
export const PM_SANDESTIN = 301;
export const PM_BALROG = 302;
export const PM_JUIBLEX = 303;
export const PM_YEENOGHU = 304;
export const PM_ORCUS = 305;
export const PM_GERYON = 306;
export const PM_DISPATER = 307;
export const PM_BAALZEBUB = 308;
export const PM_ASMODEUS = 309;
export const PM_DEMOGORGON = 310;
export const PM_DEATH = 311;
export const PM_PESTILENCE = 312;
export const PM_FAMINE = 313;
export const PM_MAIL_DAEMON = 314;
export const PM_DJINNI = 315;
export const PM_JELLYFISH = 316;
export const PM_PIRANHA = 317;
export const PM_SHARK = 318;
export const PM_GIANT_EEL = 319;
export const PM_ELECTRIC_EEL = 320;
export const PM_KRAKEN = 321;
export const PM_NEWT = 322;
export const PM_GECKO = 323;
export const PM_IGUANA = 324;
export const PM_BABY_CROCODILE = 325;
export const PM_LIZARD = 326;
export const PM_CHAMELEON = 327;
export const PM_CROCODILE = 328;
export const PM_SALAMANDER = 329;
export const PM_LONG_WORM_TAIL = 330;
export const PM_ARCHEOLOGIST = 331;
export const PM_BARBARIAN = 332;
export const PM_CAVE_DWELLER = 333;
export const PM_HEALER = 334;
export const PM_KNIGHT = 335;
export const PM_MONK = 336;
export const PM_CLERIC = 337;
export const PM_RANGER = 338;
export const PM_ROGUE = 339;
export const PM_SAMURAI = 340;
export const PM_TOURIST = 341;
export const PM_VALKYRIE = 342;
export const PM_WIZARD = 343;
export const PM_LORD_CARNARVON = 344;
export const PM_PELIAS = 345;
export const PM_SHAMAN_KARNOV = 346;
export const PM_HIPPOCRATES = 347;
export const PM_KING_ARTHUR = 348;
export const PM_GRAND_MASTER = 349;
export const PM_ARCH_PRIEST = 350;
export const PM_ORION = 351;
export const PM_MASTER_OF_THIEVES = 352;
export const PM_LORD_SATO = 353;
export const PM_TWOFLOWER = 354;
export const PM_NORN = 355;
export const PM_NEFERET_THE_GREEN = 356;
export const PM_MINION_OF_HUHETOTL = 357;
export const PM_THOTH_AMON = 358;
export const PM_CHROMATIC_DRAGON = 359;
export const PM_CYCLOPS = 360;
export const PM_IXOTH = 361;
export const PM_MASTER_KAEN = 362;
export const PM_NALZOK = 363;
export const PM_SCORPIUS = 364;
export const PM_MASTER_ASSASSIN = 365;
export const PM_ASHIKAGA_TAKAUJI = 366;
export const PM_LORD_SURTUR = 367;
export const PM_DARK_ONE = 368;
export const PM_STUDENT = 369;
export const PM_CHIEFTAIN = 370;
export const PM_NEANDERTHAL = 371;
export const PM_ATTENDANT = 372;
export const PM_PAGE = 373;
export const PM_ABBOT = 374;
export const PM_ACOLYTE = 375;
export const PM_HUNTER = 376;
export const PM_THUG = 377;
export const PM_NINJA = 378;
export const PM_ROSHI = 379;
export const PM_GUIDE = 380;
export const PM_WARRIOR = 381;
export const PM_APPRENTICE = 382;
export const NUMMONS = 383;
export const HIGH_PM = 381;
export const SPECIAL_PM = PM_LONG_WORM_TAIL; // 330

// The master monster array
export const mons = [
  { // PM_GIANT_ANT (0) - monsters.h line 95
    mname: 'giant ant',
    mlet: S_ANT,
    mlevel: 2, mmove: 18, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 3,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_KILLER_BEE (1) - monsters.h line 102
    mname: 'killer bee',
    mlet: S_ANT,
    mlevel: 1, mmove: 18, ac: -1, mr: 0, maligntyp: 0,
    geno: G_GENO | G_LGROUP | 2,
    mattk: [{ aatyp: AT_STNG, adtyp: AD_DRST, damn: 1, damd: 3 }],
    cwt: 1, cnutrit: 5,
    msound: MS_BUZZ, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_POIS,
    mflags2: M2_HOSTILE | M2_FEMALE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_YELLOW
  },
  { // PM_SOLDIER_ANT (2) - monsters.h line 110
    mname: 'soldier ant',
    mlet: S_ANT,
    mlevel: 3, mmove: 18, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_STNG, adtyp: AD_DRST, damn: 3, damd: 4 }],
    cwt: 20, cnutrit: 5,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_BLUE
  },
  { // PM_FIRE_ANT (3) - monsters.h line 118
    mname: 'fire ant',
    mlet: S_ANT,
    mlevel: 3, mmove: 18, ac: 3, mr: 10, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_BITE, adtyp: AD_FIRE, damn: 2, damd: 4 }],
    cwt: 30, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_RED
  },
  { // PM_GIANT_BEETLE (4) - monsters.h line 125
    mname: 'giant beetle',
    mlet: S_ANT,
    mlevel: 5, mmove: 6, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }],
    cwt: 200, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BLACK
  },
  { // PM_QUEEN_BEE (5) - monsters.h line 133
    mname: 'queen bee',
    mlet: S_ANT,
    mlevel: 9, mmove: 24, ac: -4, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_STNG, adtyp: AD_DRST, damn: 1, damd: 8 }],
    cwt: 1, cnutrit: 5,
    msound: MS_BUZZ, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_OVIPAROUS | M1_POIS,
    mflags2: M2_HOSTILE | M2_FEMALE | M2_PRINCE,
    mflags3: 0,
    difficulty: 12, mcolor: HI_LORD
  },
  { // PM_ACID_BLOB (6) - monsters.h line 146
    mname: 'acid blob',
    mlet: S_BLOB,
    mlevel: 1, mmove: 3, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_ACID, damn: 1, damd: 8 }],
    cwt: 30, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_SLEEP | MR_POISON | MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID,
    mflags2: M2_WANDER | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_GREEN
  },
  { // PM_QUIVERING_BLOB (7) - monsters.h line 154
    mname: 'quivering blob',
    mlet: S_BLOB,
    mlevel: 5, mmove: 1, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 200, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_SLEEP | MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
    mflags2: M2_WANDER | M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_WHITE
  },
  { // PM_GELATINOUS_CUBE (8) - monsters.h line 166
    mname: 'gelatinous cube',
    mlet: S_BLOB,
    mlevel: 6, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PLYS, damn: 2, damd: 4 }, { aatyp: AT_NONE, adtyp: AD_PLYS, damn: 1, damd: 4 }],
    cwt: 600, cnutrit: 150,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_ACID
            | MR_STONE, mconveys: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_OMNIVORE
            | M1_ACID,
    mflags2: M2_WANDER | M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_CYAN
  },
  { // PM_CHICKATRICE (9) - monsters.h line 177
    mname: 'chickatrice',
    mlet: S_COCKATRICE,
    mlevel: 4, mmove: 4, ac: 8, mr: 30, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 },
      { aatyp: AT_TUCH, adtyp: AD_STON, damn: 0, damd: 0 },
      { aatyp: AT_NONE, adtyp: AD_STON, damn: 0, damd: 0 }
    ],
    cwt: 10, cnutrit: 10,
    msound: MS_HISS, msize: MZ_TINY,
    mresists: MR_POISON | MR_STONE, mconveys: MR_POISON | MR_STONE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_COCKATRICE (10) - monsters.h line 186
    mname: 'cockatrice',
    mlet: S_COCKATRICE,
    mlevel: 5, mmove: 6, ac: 6, mr: 30, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_TUCH, adtyp: AD_STON, damn: 0, damd: 0 },
      { aatyp: AT_NONE, adtyp: AD_STON, damn: 0, damd: 0 }
    ],
    cwt: 30, cnutrit: 30,
    msound: MS_HISS, msize: MZ_SMALL,
    mresists: MR_POISON | MR_STONE, mconveys: MR_POISON | MR_STONE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_YELLOW
  },
  { // PM_PYROLISK (11) - monsters.h line 195
    mname: 'pyrolisk',
    mlet: S_COCKATRICE,
    mlevel: 6, mmove: 6, ac: 6, mr: 30, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_GAZE, adtyp: AD_FIRE, damn: 2, damd: 6 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 30, cnutrit: 30,
    msound: MS_HISS, msize: MZ_SMALL,
    mresists: MR_POISON | MR_FIRE, mconveys: MR_POISON | MR_FIRE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_RED
  },
  { // PM_JACKAL (12) - monsters.h line 205
    mname: 'jackal',
    mlet: S_DOG,
    mlevel: 0, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 3,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 300, cnutrit: 250,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 1, mcolor: CLR_BROWN
  },
  { // PM_FOX (13) - monsters.h line 212
    mname: 'fox',
    mlet: S_DOG,
    mlevel: 0, mmove: 15, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 300, cnutrit: 250,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 1, mcolor: CLR_RED
  },
  { // PM_COYOTE (14) - monsters.h line 219
    mname: 'coyote',
    mlet: S_DOG,
    mlevel: 1, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 300, cnutrit: 250,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 2, mcolor: CLR_BROWN
  },
  { // PM_WEREJACKAL (15) - monsters.h line 227
    mname: 'werejackal',
    mlet: S_DOG,
    mlevel: 2, mmove: 12, ac: 7, mr: 10, maligntyp: -7,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_WERE, damn: 1, damd: 4 }],
    cwt: 300, cnutrit: 250,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_LITTLE_DOG (16) - monsters.h line 234
    mname: 'little dog',
    mlet: S_DOG,
    mlevel: 2, mmove: 18, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 150, cnutrit: 150,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: HI_DOMESTIC
  },
  { // PM_DINGO (17) - monsters.h line 241
    mname: 'dingo',
    mlet: S_DOG,
    mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 400, cnutrit: 200,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_YELLOW
  },
  { // PM_DOG (18) - monsters.h line 248
    mname: 'dog',
    mlet: S_DOG,
    mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 400, cnutrit: 200,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: HI_DOMESTIC
  },
  { // PM_LARGE_DOG (19) - monsters.h line 256
    mname: 'large dog',
    mlet: S_DOG,
    mlevel: 6, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 250,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_WOLF (20) - monsters.h line 263
    mname: 'wolf',
    mlet: S_DOG,
    mlevel: 5, mmove: 12, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 500, cnutrit: 250,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_GRAY
  },
  { // PM_WEREWOLF (21) - monsters.h line 274
    mname: 'werewolf',
    mlet: S_DOG,
    mlevel: 5, mmove: 12, ac: 4, mr: 20, maligntyp: -7,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_WERE, damn: 2, damd: 6 }],
    cwt: 500, cnutrit: 250,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_GRAY
  },
  { // PM_WINTER_WOLF_CUB (22) - monsters.h line 282
    mname: 'winter wolf cub',
    mlet: S_DOG,
    mlevel: 5, mmove: 12, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOHELL | G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_BREA, adtyp: AD_COLD, damn: 1, damd: 6 }],
    cwt: 250, cnutrit: 200,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_CYAN
  },
  { // PM_WARG (23) - monsters.h line 289
    mname: 'warg',
    mlet: S_DOG,
    mlevel: 7, mmove: 12, ac: 4, mr: 0, maligntyp: -5,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 850, cnutrit: 350,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_BLACK
  },
  { // PM_WINTER_WOLF (24) - monsters.h line 296
    mname: 'winter wolf',
    mlet: S_DOG,
    mlevel: 7, mmove: 12, ac: 4, mr: 20, maligntyp: -5,
    geno: G_NOHELL | G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_BREA, adtyp: AD_COLD, damn: 2, damd: 6 }],
    cwt: 700, cnutrit: 300,
    msound: MS_BARK, msize: MZ_LARGE,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 9, mcolor: CLR_CYAN
  },
  { // PM_HELL_HOUND_PUP (25) - monsters.h line 303
    mname: 'hell hound pup',
    mlet: S_DOG,
    mlevel: 7, mmove: 12, ac: 4, mr: 20, maligntyp: 0,
    geno: G_HELL | G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 2, damd: 6 }],
    cwt: 200, cnutrit: 200,
    msound: MS_BARK, msize: MZ_SMALL,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_RED
  },
  { // PM_HELL_HOUND (26) - monsters.h line 310
    mname: 'hell hound',
    mlet: S_DOG,
    mlevel: 12, mmove: 14, ac: 2, mr: 20, maligntyp: -5,
    geno: G_HELL | G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }, { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 3, damd: 6 }],
    cwt: 600, cnutrit: 300,
    msound: MS_BARK, msize: MZ_MEDIUM,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_RED
  },
  { // PM_GAS_SPORE (27) - monsters.h line 332
    mname: 'gas spore',
    mlet: S_EYE,
    mlevel: 1, mmove: 3, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_GENO | 1,
    mattk: [{ aatyp: AT_BOOM, adtyp: AD_PHYS, damn: 4, damd: 6 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_GRAY
  },
  { // PM_FLOATING_EYE (28) - monsters.h line 340
    mname: 'floating eye',
    mlet: S_EYE,
    mlevel: 2, mmove: 1, ac: 9, mr: 10, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_PLYS, damn: 0, damd: 70 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: CLR_BLUE
  },
  { // PM_FREEZING_SPHERE (29) - monsters.h line 349
    mname: 'freezing sphere',
    mlet: S_EYE,
    mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_NOHELL | G_GENO | 2,
    mattk: [{ aatyp: AT_EXPL, adtyp: AD_COLD, damn: 4, damd: 6 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_WHITE
  },
  { // PM_FLAMING_SPHERE (30) - monsters.h line 357
    mname: 'flaming sphere',
    mlet: S_EYE,
    mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    mattk: [{ aatyp: AT_EXPL, adtyp: AD_FIRE, damn: 4, damd: 6 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_RED
  },
  { // PM_SHOCKING_SPHERE (31) - monsters.h line 366
    mname: 'shocking sphere',
    mlet: S_EYE,
    mlevel: 6, mmove: 13, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    mattk: [{ aatyp: AT_EXPL, adtyp: AD_ELEC, damn: 4, damd: 6 }],
    cwt: 10, cnutrit: 10,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_ELEC, mconveys: MR_ELEC,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 10, mcolor: HI_ZAP
  },
  { // PM_KITTEN (32) - monsters.h line 388
    mname: 'kitten',
    mlet: S_FELINE,
    mlevel: 2, mmove: 18, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 150, cnutrit: 150,
    msound: MS_MEW, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_WANDER | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: HI_DOMESTIC
  },
  { // PM_HOUSECAT (33) - monsters.h line 396
    mname: 'housecat',
    mlet: S_FELINE,
    mlevel: 4, mmove: 16, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 200, cnutrit: 200,
    msound: MS_MEW, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: HI_DOMESTIC
  },
  { // PM_JAGUAR (34) - monsters.h line 404
    mname: 'jaguar',
    mlet: S_FELINE,
    mlevel: 4, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 8 }
    ],
    cwt: 600, cnutrit: 300,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_LYNX (35) - monsters.h line 412
    mname: 'lynx',
    mlet: S_FELINE,
    mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 10 }
    ],
    cwt: 600, cnutrit: 300,
    msound: MS_GROWL, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_CYAN
  },
  { // PM_PANTHER (36) - monsters.h line 420
    mname: 'panther',
    mlet: S_FELINE,
    mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 10 }
    ],
    cwt: 600, cnutrit: 300,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_BLACK
  },
  { // PM_LARGE_CAT (37) - monsters.h line 428
    mname: 'large cat',
    mlet: S_FELINE,
    mlevel: 6, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 250, cnutrit: 250,
    msound: MS_MEW, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_TIGER (38) - monsters.h line 436
    mname: 'tiger',
    mlet: S_FELINE,
    mlevel: 6, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 10 }
    ],
    cwt: 600, cnutrit: 300,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_YELLOW
  },
  { // PM_DISPLACER_BEAST (39) - monsters.h line 444
    mname: 'displacer beast',
    mlet: S_FELINE,
    mlevel: 12, mmove: 12, ac: -10, mr: 0, maligntyp: -3,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 10 }
    ],
    cwt: 750, cnutrit: 400,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 14, mcolor: CLR_BLUE
  },
  { // PM_GREMLIN (40) - monsters.h line 455
    mname: 'gremlin',
    mlet: S_GREMLIN,
    mlevel: 5, mmove: 12, ac: 2, mr: 25, maligntyp: -9,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_CURS, damn: 0, damd: 0 }
    ],
    cwt: 100, cnutrit: 20,
    msound: MS_LAUGH, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_HUMANOID | M1_POIS,
    mflags2: M2_STALK,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_GREEN
  },
  { // PM_GARGOYLE (41) - monsters.h line 465
    mname: 'gargoyle',
    mlet: S_GREMLIN,
    mlevel: 6, mmove: 10, ac: -4, mr: 0, maligntyp: -9,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }
    ],
    cwt: 1000, cnutrit: 200,
    msound: MS_GRUNT, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: MR_STONE,
    mflags1: M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_BROWN
  },
  { // PM_WINGED_GARGOYLE (42) - monsters.h line 473
    mname: 'winged gargoyle',
    mlet: S_GREMLIN,
    mlevel: 9, mmove: 15, ac: -2, mr: 0, maligntyp: -12,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 4 }
    ],
    cwt: 1200, cnutrit: 300,
    msound: MS_GRUNT, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: MR_STONE,
    mflags1: M1_FLY | M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS | M1_OVIPAROUS,
    mflags2: M2_LORD | M2_HOSTILE | M2_STRONG | M2_MAGIC,
    mflags3: 0,
    difficulty: 11, mcolor: HI_LORD
  },
  { // PM_HOBBIT (43) - monsters.h line 483
    mname: 'hobbit',
    mlet: S_HUMANOID,
    mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: 6,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 500, cnutrit: 200,
    msound: MS_HUMANOID, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 2, mcolor: CLR_GREEN
  },
  { // PM_DWARF (44) - monsters.h line 493
    mname: 'dwarf',
    mlet: S_HUMANOID,
    mlevel: 2, mmove: 6, ac: 10, mr: 10, maligntyp: 4,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 900, cnutrit: 300,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_DWARF | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_RED
  },
  { // PM_BUGBEAR (45) - monsters.h line 501
    mname: 'bugbear',
    mlet: S_HUMANOID,
    mlevel: 3, mmove: 9, ac: 5, mr: 0, maligntyp: -6,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1250, cnutrit: 250,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_BROWN
  },
  { // PM_DWARF_LEADER (46) - monsters.h line 510
    mname: 'dwarf lord',
    mlet: S_HUMANOID,
    mlevel: 4, mmove: 6, ac: 10, mr: 10, maligntyp: 5,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 900, cnutrit: 300,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_DWARF | M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, mcolor: CLR_BLUE
  },
  { // PM_DWARF_RULER (47) - monsters.h line 520
    mname: 'dwarf king',
    mlet: S_HUMANOID,
    mlevel: 6, mmove: 6, ac: 10, mr: 20, maligntyp: 6,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 900, cnutrit: 300,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_DWARF | M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: HI_LORD
  },
  { // PM_MIND_FLAYER (48) - monsters.h line 530
    mname: 'mind flayer',
    mlet: S_HUMANOID,
    mlevel: 9, mmove: 12, ac: 5, mr: 90, maligntyp: -8,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_HISS, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, mcolor: CLR_BRIGHT_MAGENTA
  },
  { // PM_MASTER_MIND_FLAYER (49) - monsters.h line 540
    mname: 'master mind flayer',
    mlet: S_HUMANOID,
    mlevel: 13, mmove: 12, ac: 0, mr: 90, maligntyp: -8,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 },
      { aatyp: AT_TENT, adtyp: AD_DRIN, damn: 2, damd: 1 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_HISS, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, mcolor: CLR_BRIGHT_MAGENTA
  },
  { // PM_MANES (50) - monsters.h line 550
    mname: 'manes',
    mlet: S_IMP,
    mlevel: 1, mmove: 3, ac: 7, mr: 0, maligntyp: -7,
    geno: G_GENO | G_LGROUP | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 100, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_POIS,
    mflags2: M2_HOSTILE | M2_STALK,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_RED
  },
  { // PM_HOMUNCULUS (51) - monsters.h line 558
    mname: 'homunculus',
    mlet: S_IMP,
    mlevel: 2, mmove: 12, ac: 6, mr: 10, maligntyp: -7,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_SLEE, damn: 1, damd: 3 }],
    cwt: 60, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_SLEEP | MR_POISON, mconveys: MR_SLEEP | MR_POISON,
    mflags1: M1_FLY | M1_POIS,
    mflags2: M2_STALK,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_GREEN
  },
  { // PM_IMP (52) - monsters.h line 565
    mname: 'imp',
    mlet: S_IMP,
    mlevel: 3, mmove: 12, ac: 2, mr: 20, maligntyp: -7,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 20, cnutrit: 10,
    msound: MS_CUSS, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_REGEN,
    mflags2: M2_WANDER | M2_STALK,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_RED
  },
  { // PM_LEMURE (53) - monsters.h line 573
    mname: 'lemure',
    mlet: S_IMP,
    mlevel: 3, mmove: 3, ac: 7, mr: 0, maligntyp: -7,
    geno: G_HELL | G_GENO | G_LGROUP | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 150, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_SLEEP | MR_POISON, mconveys: MR_SLEEP,
    mflags1: M1_POIS | M1_REGEN,
    mflags2: M2_HOSTILE | M2_WANDER | M2_STALK | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_BROWN
  },
  { // PM_QUASIT (54) - monsters.h line 580
    mname: 'quasit',
    mlet: S_IMP,
    mlevel: 3, mmove: 15, ac: 2, mr: 20, maligntyp: -7,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_DRDX, damn: 1, damd: 2 },
      { aatyp: AT_CLAW, adtyp: AD_DRDX, damn: 1, damd: 2 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 200, cnutrit: 200,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_REGEN,
    mflags2: M2_STALK,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_BLUE
  },
  { // PM_TENGU (55) - monsters.h line 587
    mname: 'tengu',
    mlet: S_IMP,
    mlevel: 6, mmove: 13, ac: 5, mr: 30, maligntyp: 7,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 7 }],
    cwt: 300, cnutrit: 200,
    msound: MS_SQAWK, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_TPORT | M1_TPORT_CNTRL,
    mflags2: M2_STALK,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_CYAN
  },
  { // PM_BLUE_JELLY (56) - monsters.h line 600
    mname: 'blue jelly',
    mlet: S_JELLY,
    mlevel: 4, mmove: 0, ac: 8, mr: 10, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_COLD, damn: 0, damd: 6 }],
    cwt: 50, cnutrit: 20,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_COLD | MR_POISON, mconveys: MR_COLD | MR_POISON,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 5, mcolor: CLR_BLUE
  },
  { // PM_SPOTTED_JELLY (57) - monsters.h line 610
    mname: 'spotted jelly',
    mlet: S_JELLY,
    mlevel: 5, mmove: 0, ac: 8, mr: 10, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_ACID, damn: 0, damd: 6 }],
    cwt: 50, cnutrit: 20,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_GREEN
  },
  { // PM_OCHRE_JELLY (58) - monsters.h line 620
    mname: 'ochre jelly',
    mlet: S_JELLY,
    mlevel: 6, mmove: 3, ac: 8, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_ACID, damn: 3, damd: 6 }, { aatyp: AT_NONE, adtyp: AD_ACID, damn: 3, damd: 6 }],
    cwt: 50, cnutrit: 20,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_BROWN
  },
  { // PM_KOBOLD (59) - monsters.h line 631
    mname: 'kobold',
    mlet: S_KOBOLD,
    mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 400, cnutrit: 100,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 1, mcolor: CLR_BROWN
  },
  { // PM_LARGE_KOBOLD (60) - monsters.h line 639
    mname: 'large kobold',
    mlet: S_KOBOLD,
    mlevel: 1, mmove: 6, ac: 10, mr: 0, maligntyp: -3,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 450, cnutrit: 150,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 2, mcolor: CLR_RED
  },
  { // PM_KOBOLD_LEADER (61) - monsters.h line 648
    mname: 'kobold lord',
    mlet: S_KOBOLD,
    mlevel: 2, mmove: 6, ac: 10, mr: 0, maligntyp: -4,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 500, cnutrit: 200,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_LORD | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: HI_LORD
  },
  { // PM_KOBOLD_SHAMAN (62) - monsters.h line 656
    mname: 'kobold shaman',
    mlet: S_KOBOLD,
    mlevel: 2, mmove: 6, ac: 6, mr: 10, maligntyp: -4,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 450, cnutrit: 150,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, mcolor: HI_ZAP
  },
  { // PM_LEPRECHAUN (63) - monsters.h line 666
    mname: 'leprechaun',
    mlet: S_LEPRECHAUN,
    mlevel: 5, mmove: 15, ac: 8, mr: 20, maligntyp: 0,
    geno: G_GENO | 4,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SGLD, damn: 1, damd: 2 }],
    cwt: 60, cnutrit: 30,
    msound: MS_LAUGH, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_TPORT,
    mflags2: M2_HOSTILE | M2_GREEDY,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_GREEN
  },
  { // PM_SMALL_MIMIC (64) - monsters.h line 678
    mname: 'small mimic',
    mlet: S_MIMIC,
    mlevel: 7, mmove: 3, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 }],
    cwt: 300, cnutrit: 200,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_ACID, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL | M1_NOEYES
            | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_BROWN
  },
  { // PM_LARGE_MIMIC (65) - monsters.h line 688
    mname: 'large mimic',
    mlet: S_MIMIC,
    mlevel: 8, mmove: 3, ac: 7, mr: 10, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_STCK, damn: 3, damd: 4 }],
    cwt: 600, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_ACID, mconveys: 0,
    mflags1: M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 9, mcolor: CLR_RED
  },
  { // PM_GIANT_MIMIC (66) - monsters.h line 698
    mname: 'giant mimic',
    mlet: S_MIMIC,
    mlevel: 9, mmove: 3, ac: 7, mr: 20, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_STCK, damn: 3, damd: 6 }, { aatyp: AT_CLAW, adtyp: AD_STCK, damn: 3, damd: 6 }],
    cwt: 800, cnutrit: 500,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_ACID, mconveys: 0,
    mflags1: M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 11, mcolor: HI_LORD
  },
  { // PM_WOOD_NYMPH (67) - monsters.h line 708
    mname: 'wood nymph',
    mlet: S_NYMPH,
    mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SITM, damn: 0, damd: 0 }, { aatyp: AT_CLAW, adtyp: AD_SEDU, damn: 0, damd: 0 }],
    cwt: 600, cnutrit: 300,
    msound: MS_SEDUCE, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_TPORT,
    mflags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_GREEN
  },
  { // PM_WATER_NYMPH (68) - monsters.h line 716
    mname: 'water nymph',
    mlet: S_NYMPH,
    mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SITM, damn: 0, damd: 0 }, { aatyp: AT_CLAW, adtyp: AD_SEDU, damn: 0, damd: 0 }],
    cwt: 600, cnutrit: 300,
    msound: MS_SEDUCE, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_TPORT | M1_SWIM,
    mflags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_BLUE
  },
  { // PM_MOUNTAIN_NYMPH (69) - monsters.h line 723
    mname: 'mountain nymph',
    mlet: S_NYMPH,
    mlevel: 3, mmove: 12, ac: 9, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SITM, damn: 0, damd: 0 }, { aatyp: AT_CLAW, adtyp: AD_SEDU, damn: 0, damd: 0 }],
    cwt: 600, cnutrit: 300,
    msound: MS_SEDUCE, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_TPORT,
    mflags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_BROWN
  },
  { // PM_GOBLIN (70) - monsters.h line 733
    mname: 'goblin',
    mlet: S_ORC,
    mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -3,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 400, cnutrit: 100,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 1, mcolor: CLR_GRAY
  },
  { // PM_HOBGOBLIN (71) - monsters.h line 739
    mname: 'hobgoblin',
    mlet: S_ORC,
    mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: -4,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1000, cnutrit: 200,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_BROWN
  },
  { // PM_ORC (72) - monsters.h line 751
    mname: 'orc',
    mlet: S_ORC,
    mlevel: 1, mmove: 9, ac: 10, mr: 0, maligntyp: -3,
    geno: G_GENO | G_NOGEN | G_LGROUP,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 850, cnutrit: 150,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_RED
  },
  { // PM_HILL_ORC (73) - monsters.h line 760
    mname: 'hill orc',
    mlet: S_ORC,
    mlevel: 2, mmove: 9, ac: 10, mr: 0, maligntyp: -4,
    geno: G_GENO | G_LGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1000, cnutrit: 200,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_YELLOW
  },
  { // PM_MORDOR_ORC (74) - monsters.h line 769
    mname: 'Mordor orc',
    mlet: S_ORC,
    mlevel: 3, mmove: 5, ac: 10, mr: 0, maligntyp: -5,
    geno: G_GENO | G_LGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1200, cnutrit: 200,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_BLUE
  },
  { // PM_URUK_HAI (75) - monsters.h line 778
    mname: 'Uruk-hai',
    mlet: S_ORC,
    mlevel: 3, mmove: 7, ac: 10, mr: 0, maligntyp: -4,
    geno: G_GENO | G_LGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1300, cnutrit: 300,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_BLACK
  },
  { // PM_ORC_SHAMAN (76) - monsters.h line 787
    mname: 'orc shaman',
    mlet: S_ORC,
    mlevel: 3, mmove: 9, ac: 5, mr: 10, maligntyp: -5,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1000, cnutrit: 300,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: HI_ZAP
  },
  { // PM_ORC_CAPTAIN (77) - monsters.h line 796
    mname: 'orc-captain',
    mlet: S_ORC,
    mlevel: 5, mmove: 5, ac: 10, mr: 0, maligntyp: -5,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1350, cnutrit: 350,
    msound: MS_ORC, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: HI_LORD
  },
  { // PM_ROCK_PIERCER (78) - monsters.h line 808
    mname: 'rock piercer',
    mlet: S_PIERCER,
    mlevel: 3, mmove: 1, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 4,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 200, cnutrit: 200,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_GRAY
  },
  { // PM_IRON_PIERCER (79) - monsters.h line 817
    mname: 'iron piercer',
    mlet: S_PIERCER,
    mlevel: 5, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }],
    cwt: 400, cnutrit: 300,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_CYAN
  },
  { // PM_GLASS_PIERCER (80) - monsters.h line 826
    mname: 'glass piercer',
    mlet: S_PIERCER,
    mlevel: 7, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 6 }],
    cwt: 400, cnutrit: 300,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_ACID, mconveys: 0,
    mflags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 9, mcolor: CLR_WHITE
  },
  { // PM_ROTHE (81) - monsters.h line 837
    mname: 'rothe',
    mlet: S_QUADRUPED,
    mlevel: 2, mmove: 9, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 4,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 8 }
    ],
    cwt: 400, cnutrit: 100,
    msound: MS_MOO, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_MUMAK (82) - monsters.h line 845
    mname: 'mumak',
    mlet: S_QUADRUPED,
    mlevel: 5, mmove: 9, ac: 0, mr: 0, maligntyp: -2,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 4, damd: 12 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 2500, cnutrit: 500,
    msound: MS_TRUMPET, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_GRAY
  },
  { // PM_LEOCROTTA (83) - monsters.h line 853
    mname: 'leocrotta',
    mlet: S_QUADRUPED,
    mlevel: 6, mmove: 18, ac: 4, mr: 10, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 1200, cnutrit: 500,
    msound: MS_IMITATE, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_RED
  },
  { // PM_WUMPUS (84) - monsters.h line 861
    mname: 'wumpus',
    mlet: S_QUADRUPED,
    mlevel: 8, mmove: 3, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }],
    cwt: 2500, cnutrit: 500,
    msound: MS_BURBLE, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_CLING | M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_CYAN
  },
  { // PM_TITANOTHERE (85) - monsters.h line 869
    mname: 'titanothere',
    mlet: S_QUADRUPED,
    mlevel: 12, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 2650, cnutrit: 650,
    msound: MS_BELLOW, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 13, mcolor: CLR_GRAY
  },
  { // PM_BALUCHITHERIUM (86) - monsters.h line 877
    mname: 'baluchitherium',
    mlet: S_QUADRUPED,
    mlevel: 14, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 5, damd: 4 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 5, damd: 4 }],
    cwt: 3800, cnutrit: 800,
    msound: MS_BELLOW, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 15, mcolor: CLR_GRAY
  },
  { // PM_MASTODON (87) - monsters.h line 885
    mname: 'mastodon',
    mlet: S_QUADRUPED,
    mlevel: 20, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 4, damd: 8 }, { aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 4, damd: 8 }],
    cwt: 3800, cnutrit: 800,
    msound: MS_TRUMPET, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 22, mcolor: CLR_BLACK
  },
  { // PM_SEWER_RAT (88) - monsters.h line 895
    mname: 'sewer rat',
    mlet: S_RODENT,
    mlevel: 0, mmove: 12, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 20, cnutrit: 12,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 1, mcolor: CLR_BROWN
  },
  { // PM_GIANT_RAT (89) - monsters.h line 902
    mname: 'giant rat',
    mlet: S_RODENT,
    mlevel: 1, mmove: 10, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 30, cnutrit: 30,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 2, mcolor: CLR_BROWN
  },
  { // PM_RABID_RAT (90) - monsters.h line 910
    mname: 'rabid rat',
    mlet: S_RODENT,
    mlevel: 2, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRCO, damn: 2, damd: 4 }],
    cwt: 30, cnutrit: 5,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_WERERAT (91) - monsters.h line 918
    mname: 'wererat',
    mlet: S_RODENT,
    mlevel: 2, mmove: 12, ac: 6, mr: 10, maligntyp: -7,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_WERE, damn: 1, damd: 4 }],
    cwt: 40, cnutrit: 30,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_ROCK_MOLE (92) - monsters.h line 926
    mname: 'rock mole',
    mlet: S_RODENT,
    mlevel: 3, mmove: 3, ac: 0, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 30, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE,
    mflags2: M2_HOSTILE | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_GRAY
  },
  { // PM_WOODCHUCK (93) - monsters.h line 936
    mname: 'woodchuck',
    mlet: S_RODENT,
    mlevel: 3, mmove: 3, ac: 0, mr: 20, maligntyp: 0,
    geno: G_NOGEN | G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 30, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL  | M1_ANIMAL | M1_NOHANDS | M1_SWIM
            | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_CAVE_SPIDER (94) - monsters.h line 947
    mname: 'cave spider',
    mlet: S_SPIDER,
    mlevel: 1, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 50, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 3, mcolor: CLR_GRAY
  },
  { // PM_CENTIPEDE (95) - monsters.h line 955
    mname: 'centipede',
    mlet: S_SPIDER,
    mlevel: 2, mmove: 4, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 3 }],
    cwt: 50, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_YELLOW
  },
  { // PM_GIANT_SPIDER (96) - monsters.h line 963
    mname: 'giant spider',
    mlet: S_SPIDER,
    mlevel: 5, mmove: 15, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 2, damd: 4 }],
    cwt: 200, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_MAGENTA
  },
  { // PM_SCORPION (97) - monsters.h line 972
    mname: 'scorpion',
    mlet: S_SPIDER,
    mlevel: 5, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 2 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 2 },
      { aatyp: AT_STNG, adtyp: AD_DRST, damn: 1, damd: 4 }
    ],
    cwt: 50, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_RED
  },
  { // PM_LURKER_ABOVE (98) - monsters.h line 989
    mname: 'lurker above',
    mlet: S_TRAPPER,
    mlevel: 10, mmove: 3, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_WRAP, damn: 1, damd: 6 }, { aatyp: AT_ENGL, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 800, cnutrit: 350,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HIDE | M1_FLY | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STALK | M2_STRONG,
    mflags3: 0,
    difficulty: 12, mcolor: CLR_GRAY
  },
  { // PM_TRAPPER (99) - monsters.h line 998
    mname: 'trapper',
    mlet: S_TRAPPER,
    mlevel: 12, mmove: 3, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_WRAP, damn: 1, damd: 8 }, { aatyp: AT_ENGL, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 800, cnutrit: 350,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STALK | M2_STRONG,
    mflags3: 0,
    difficulty: 14, mcolor: CLR_GREEN
  },
  { // PM_PONY (100) - monsters.h line 1009
    mname: 'pony',
    mlet: S_UNICORN,
    mlevel: 3, mmove: 16, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 1300, cnutrit: 250,
    msound: MS_NEIGH, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_WHITE_UNICORN (101) - monsters.h line 1017
    mname: 'white unicorn',
    mlet: S_UNICORN,
    mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: 7,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 1, damd: 12 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1300, cnutrit: 300,
    msound: MS_NEIGH, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_WHITE
  },
  { // PM_GRAY_UNICORN (102) - monsters.h line 1025
    mname: 'gray unicorn',
    mlet: S_UNICORN,
    mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 1, damd: 12 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1300, cnutrit: 300,
    msound: MS_NEIGH, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_GRAY
  },
  { // PM_BLACK_UNICORN (103) - monsters.h line 1033
    mname: 'black unicorn',
    mlet: S_UNICORN,
    mlevel: 4, mmove: 24, ac: 2, mr: 70, maligntyp: -7,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 1, damd: 12 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1300, cnutrit: 300,
    msound: MS_NEIGH, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_BLACK
  },
  { // PM_HORSE (104) - monsters.h line 1041
    mname: 'horse',
    mlet: S_UNICORN,
    mlevel: 5, mmove: 20, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 1500, cnutrit: 300,
    msound: MS_NEIGH, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_WARHORSE (105) - monsters.h line 1049
    mname: 'warhorse',
    mlet: S_UNICORN,
    mlevel: 7, mmove: 24, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 10 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 1800, cnutrit: 350,
    msound: MS_NEIGH, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    mflags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_BROWN
  },
  { // PM_FOG_CLOUD (106) - monsters.h line 1061
    mname: 'fog cloud',
    mlet: S_VORTEX,
    mlevel: 3, mmove: 1, ac: 0, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_AMORPHOUS | M1_UNSOLID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_GRAY
  },
  { // PM_DUST_VORTEX (107) - monsters.h line 1070
    mname: 'dust vortex',
    mlet: S_VORTEX,
    mlevel: 4, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_BLND, damn: 2, damd: 8 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_ICE_VORTEX (108) - monsters.h line 1080
    mname: 'ice vortex',
    mlet: S_VORTEX,
    mlevel: 5, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
    geno: G_NOHELL | G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_COLD, damn: 1, damd: 6 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_CYAN
  },
  { // PM_ENERGY_VORTEX (109) - monsters.h line 1090
    mname: 'energy vortex',
    mlet: S_VORTEX,
    mlevel: 6, mmove: 20, ac: 2, mr: 30, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_ENGL, adtyp: AD_ELEC, damn: 1, damd: 6 },
      { aatyp: AT_ENGL, adtyp: AD_DREN, damn: 2, damd: 6 },
      { aatyp: AT_NONE, adtyp: AD_ELEC, damn: 0, damd: 4 }
    ],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_ELEC | MR_SLEEP | MR_DISINT | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 9, mcolor: HI_ZAP
  },
  { // PM_STEAM_VORTEX (110) - monsters.h line 1100
    mname: 'steam vortex',
    mlet: S_VORTEX,
    mlevel: 7, mmove: 22, ac: 2, mr: 30, maligntyp: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 2,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_FIRE, damn: 1, damd: 8 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_BLUE
  },
  { // PM_FIRE_VORTEX (111) - monsters.h line 1110
    mname: 'fire vortex',
    mlet: S_VORTEX,
    mlevel: 8, mmove: 22, ac: 2, mr: 30, maligntyp: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_FIRE, damn: 1, damd: 10 }, { aatyp: AT_NONE, adtyp: AD_FIRE, damn: 0, damd: 4 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 10, mcolor: CLR_YELLOW
  },
  { // PM_BABY_LONG_WORM (112) - monsters.h line 1121
    mname: 'baby long worm',
    mlet: S_WORM,
    mlevel: 5, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 600, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_BABY_PURPLE_WORM (113) - monsters.h line 1128
    mname: 'baby purple worm',
    mlet: S_WORM,
    mlevel: 8, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 600, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 9, mcolor: CLR_MAGENTA
  },
  { // PM_LONG_WORM (114) - monsters.h line 1137
    mname: 'long worm',
    mlet: S_WORM,
    mlevel: 9, mmove: 3, ac: 5, mr: 10, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_SILENT, msize: MZ_GIGANTIC,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_BROWN
  },
  { // PM_PURPLE_WORM (115) - monsters.h line 1145
    mname: 'purple worm',
    mlet: S_WORM,
    mlevel: 15, mmove: 9, ac: 6, mr: 20, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_ENGL, adtyp: AD_DGST, damn: 1, damd: 10 }],
    cwt: 2700, cnutrit: 700,
    msound: MS_SILENT, msize: MZ_GIGANTIC,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    mflags3: 0,
    difficulty: 17, mcolor: CLR_MAGENTA
  },
  { // PM_GRID_BUG (116) - monsters.h line 1156
    mname: 'grid bug',
    mlet: S_XAN,
    mlevel: 0, mmove: 12, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 3,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_ELEC, damn: 1, damd: 1 }],
    cwt: 15, cnutrit: 10,
    msound: MS_BUZZ, msize: MZ_TINY,
    mresists: MR_ELEC | MR_POISON, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 1, mcolor: CLR_MAGENTA
  },
  { // PM_XAN (117) - monsters.h line 1164
    mname: 'xan',
    mlet: S_XAN,
    mlevel: 7, mmove: 18, ac: -4, mr: 0, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_STNG, adtyp: AD_LEGS, damn: 1, damd: 4 }],
    cwt: 300, cnutrit: 300,
    msound: MS_BUZZ, msize: MZ_TINY,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_RED
  },
  { // PM_YELLOW_LIGHT (118) - monsters.h line 1179
    mname: 'yellow light',
    mlet: S_LIGHT,
    mlevel: 3, mmove: 15, ac: 0, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_GENO | 4,
    mattk: [{ aatyp: AT_EXPL, adtyp: AD_BLND, damn: 10, damd: 20 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
               | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_YELLOW
  },
  { // PM_BLACK_LIGHT (119) - monsters.h line 1191
    mname: 'black light',
    mlet: S_LIGHT,
    mlevel: 5, mmove: 15, ac: 0, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    mattk: [{ aatyp: AT_EXPL, adtyp: AD_HALU, damn: 10, damd: 12 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
            | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_SEE_INVIS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_BLACK
  },
  { // PM_ZRUTY (120) - monsters.h line 1202
    mname: 'zruty',
    mlet: S_ZRUTY,
    mlevel: 9, mmove: 8, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }
    ],
    cwt: 1200, cnutrit: 600,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 11, mcolor: CLR_BROWN
  },
  { // PM_COUATL (121) - monsters.h line 1214
    mname: 'couatl',
    mlet: S_ANGEL,
    mlevel: 8, mmove: 10, ac: 5, mr: 30, maligntyp: 7,
    geno: G_NOHELL | G_SGROUP | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_DRST, damn: 2, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_HUGS, adtyp: AD_WRAP, damn: 2, damd: 4 }
    ],
    cwt: 900, cnutrit: 400,
    msound: MS_HISS, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_NOHANDS | M1_SLITHY | M1_POIS,
    mflags2: M2_MINION | M2_STALK | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_GREEN
  },
  { // PM_ALEAX (122) - monsters.h line 1224
    mname: 'Aleax',
    mlet: S_ANGEL,
    mlevel: 10, mmove: 8, ac: 0, mr: 30, maligntyp: 7,
    geno: G_NOHELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_IMITATE, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS,
    mflags2: M2_MINION | M2_STALK | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, mcolor: CLR_YELLOW
  },
  { // PM_ANGEL (123) - monsters.h line 1239
    mname: 'Angel',
    mlet: S_ANGEL,
    mlevel: 14, mmove: 10, ac: -4, mr: 55, maligntyp: 12,
    geno: G_NOHELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_MAGC, adtyp: AD_MAGM, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_CUSS, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, mcolor: CLR_WHITE
  },
  { // PM_KI_RIN (124) - monsters.h line 1253
    mname: 'ki-rin',
    mlet: S_ANGEL,
    mlevel: 16, mmove: 18, ac: -5, mr: 90, maligntyp: 15,
    geno: G_NOHELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SPELL, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_NOHANDS | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 21, mcolor: HI_GOLD
  },
  { // PM_ARCHON (125) - monsters.h line 1265
    mname: 'Archon',
    mlet: S_ANGEL,
    mlevel: 19, mmove: 16, ac: -6, mr: 80, maligntyp: 15,
    geno: G_NOHELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_GAZE, adtyp: AD_BLND, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 4, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_CUSS, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_SEE_INVIS | M1_REGEN,
    mflags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 26, mcolor: HI_LORD
  },
  { // PM_BAT (126) - monsters.h line 1275
    mname: 'bat',
    mlet: S_BAT,
    mlevel: 0, mmove: 22, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 20, cnutrit: 20,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_WANDER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 2, mcolor: CLR_BROWN
  },
  { // PM_GIANT_BAT (127) - monsters.h line 1283
    mname: 'giant bat',
    mlet: S_BAT,
    mlevel: 2, mmove: 22, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 30, cnutrit: 30,
    msound: MS_SQEEK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_WANDER | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: CLR_RED
  },
  { // PM_RAVEN (128) - monsters.h line 1290
    mname: 'raven',
    mlet: S_BAT,
    mlevel: 4, mmove: 20, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_CLAW, adtyp: AD_BLND, damn: 1, damd: 6 }],
    cwt: 40, cnutrit: 20,
    msound: MS_SQAWK, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_WANDER | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_BLACK
  },
  { // PM_VAMPIRE_BAT (129) - monsters.h line 1297
    mname: 'vampire bat',
    mlet: S_BAT,
    mlevel: 5, mmove: 20, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_BITE, adtyp: AD_DRST, damn: 0, damd: 0 }],
    cwt: 30, cnutrit: 20,
    msound: MS_SQEEK, msize: MZ_SMALL,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_REGEN | M1_OMNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_BLACK
  },
  { // PM_PLAINS_CENTAUR (130) - monsters.h line 1307
    mname: 'plains centaur',
    mlet: S_CENTAUR,
    mlevel: 4, mmove: 18, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 2500, cnutrit: 500,
    msound: MS_HUMANOID, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_FOREST_CENTAUR (131) - monsters.h line 1315
    mname: 'forest centaur',
    mlet: S_CENTAUR,
    mlevel: 5, mmove: 18, ac: 3, mr: 10, maligntyp: -1,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 2550, cnutrit: 600,
    msound: MS_HUMANOID, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_GREEN
  },
  { // PM_MOUNTAIN_CENTAUR (132) - monsters.h line 1323
    mname: 'mountain centaur',
    mlet: S_CENTAUR,
    mlevel: 6, mmove: 20, ac: 2, mr: 10, maligntyp: -3,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 10 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 6 }
    ],
    cwt: 2550, cnutrit: 500,
    msound: MS_HUMANOID, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_CYAN
  },
  { // PM_BABY_GRAY_DRAGON (133) - monsters.h line 1348
    mname: 'baby gray dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_GRAY
  },
  { // PM_BABY_GOLD_DRAGON (134) - monsters.h line 1356
    mname: 'baby gold dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 13, mcolor: HI_GOLD
  },
  { // PM_BABY_SILVER_DRAGON (135) - monsters.h line 1364
    mname: 'baby silver dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: DRAGON_SILVER
  },
  { // PM_BABY_RED_DRAGON (136) - monsters.h line 1383
    mname: 'baby red dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_FIRE, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 13, mcolor: CLR_RED
  },
  { // PM_BABY_WHITE_DRAGON (137) - monsters.h line 1391
    mname: 'baby white dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_COLD, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_WHITE
  },
  { // PM_BABY_ORANGE_DRAGON (138) - monsters.h line 1399
    mname: 'baby orange dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_SLEEP, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_ORANGE
  },
  { // PM_BABY_BLACK_DRAGON (139) - monsters.h line 1407
    mname: 'baby black dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_DISINT, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_BLACK
  },
  { // PM_BABY_BLUE_DRAGON (140) - monsters.h line 1415
    mname: 'baby blue dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_ELEC, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_BLUE
  },
  { // PM_BABY_GREEN_DRAGON (141) - monsters.h line 1423
    mname: 'baby green dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_POIS,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_GREEN
  },
  { // PM_BABY_YELLOW_DRAGON (142) - monsters.h line 1431
    mname: 'baby yellow dragon',
    mlet: S_DRAGON,
    mlevel: 12, mmove: 9, ac: 2, mr: 10, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_ROAR, msize: MZ_HUGE,
    mresists: MR_ACID | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_ACID,
    mflags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    mflags3: 0,
    difficulty: 13, mcolor: CLR_YELLOW
  },
  { // PM_GRAY_DRAGON (143) - monsters.h line 1442
    mname: 'gray dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_MAGM, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_GRAY
  },
  { // PM_GOLD_DRAGON (144) - monsters.h line 1454
    mname: 'gold dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_FIRE, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 20, mcolor: HI_GOLD
  },
  { // PM_SILVER_DRAGON (145) - monsters.h line 1465
    mname: 'silver dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 4,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_COLD, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_COLD, mconveys: 0,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: DRAGON_SILVER
  },
  { // PM_RED_DRAGON (146) - monsters.h line 1494
    mname: 'red dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -4,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 6, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 20, mcolor: CLR_RED
  },
  { // PM_WHITE_DRAGON (147) - monsters.h line 1505
    mname: 'white dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -5,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_COLD, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_WHITE
  },
  { // PM_ORANGE_DRAGON (148) - monsters.h line 1516
    mname: 'orange dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 5,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_SLEE, damn: 4, damd: 25 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_ORANGE
  },
  { // PM_BLACK_DRAGON (149) - monsters.h line 1528
    mname: 'black dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -6,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_DISN, damn: 1, damd: 255 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_DISINT, mconveys: MR_DISINT,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_BLACK
  },
  { // PM_BLUE_DRAGON (150) - monsters.h line 1539
    mname: 'blue dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: -7,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_ELEC, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_ELEC, mconveys: MR_ELEC,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_BLUE
  },
  { // PM_GREEN_DRAGON (151) - monsters.h line 1550
    mname: 'green dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 6,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_DRST, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE | M1_POIS,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_GREEN
  },
  { // PM_YELLOW_DRAGON (152) - monsters.h line 1562
    mname: 'yellow dragon',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 9, ac: -1, mr: 20, maligntyp: 7,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_ACID, damn: 4, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1500,
    msound: MS_ROAR, msize: MZ_GIGANTIC,
    mresists: MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_ACID,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: 0,
    difficulty: 20, mcolor: CLR_YELLOW
  },
  { // PM_STALKER (153) - monsters.h line 1573
    mname: 'stalker',
    mlet: S_ELEMENTAL,
    mlevel: 8, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 4 }],
    cwt: 900, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_FLY | M1_SEE_INVIS,
    mflags2: M2_WANDER | M2_STALK | M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_WHITE
  },
  { // PM_AIR_ELEMENTAL (154) - monsters.h line 1582
    mname: 'air elemental',
    mlet: S_ELEMENTAL,
    mlevel: 8, mmove: 36, ac: 2, mr: 30, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_PHYS, damn: 1, damd: 10 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY,
    mflags2: M2_STRONG | M2_NEUTER,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_CYAN
  },
  { // PM_FIRE_ELEMENTAL (155) - monsters.h line 1591
    mname: 'fire elemental',
    mlet: S_ELEMENTAL,
    mlevel: 8, mmove: 12, ac: 2, mr: 30, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_FIRE, damn: 3, damd: 6 }, { aatyp: AT_NONE, adtyp: AD_FIRE, damn: 0, damd: 4 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY | M1_NOTAKE,
    mflags2: M2_STRONG | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 10, mcolor: CLR_YELLOW
  },
  { // PM_EARTH_ELEMENTAL (156) - monsters.h line 1601
    mname: 'earth elemental',
    mlet: S_ELEMENTAL,
    mlevel: 8, mmove: 6, ac: 2, mr: 30, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 6 }],
    cwt: 2500, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_COLD | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_WALLWALK | M1_THICK_HIDE,
    mflags2: M2_STRONG | M2_NEUTER,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_BROWN
  },
  { // PM_WATER_ELEMENTAL (157) - monsters.h line 1610
    mname: 'water elemental',
    mlet: S_ELEMENTAL,
    mlevel: 8, mmove: 5, ac: 2, mr: 30, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 5, damd: 6 }],
    cwt: 2500, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_AMPHIBIOUS | M1_SWIM,
    mflags2: M2_STRONG | M2_NEUTER,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_BLUE
  },
  { // PM_LICHEN (158) - monsters.h line 1622
    mname: 'lichen',
    mlet: S_FUNGUS,
    mlevel: 0, mmove: 1, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | 4,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_STCK, damn: 0, damd: 0 }],
    cwt: 20, cnutrit: 200,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 1, mcolor: CLR_BRIGHT_GREEN
  },
  { // PM_BROWN_MOLD (159) - monsters.h line 1631
    mname: 'brown mold',
    mlet: S_FUNGUS,
    mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_COLD, damn: 0, damd: 6 }],
    cwt: 50, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_COLD | MR_POISON, mconveys: MR_COLD | MR_POISON,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_BROWN
  },
  { // PM_YELLOW_MOLD (160) - monsters.h line 1640
    mname: 'yellow mold',
    mlet: S_FUNGUS,
    mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_STUN, damn: 0, damd: 4 }],
    cwt: 50, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_POIS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_YELLOW
  },
  { // PM_GREEN_MOLD (161) - monsters.h line 1650
    mname: 'green mold',
    mlet: S_FUNGUS,
    mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_ACID, damn: 0, damd: 4 }],
    cwt: 50, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_ACID | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_GREEN
  },
  { // PM_RED_MOLD (162) - monsters.h line 1659
    mname: 'red mold',
    mlet: S_FUNGUS,
    mlevel: 1, mmove: 0, ac: 9, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_FIRE, damn: 0, damd: 4 }],
    cwt: 50, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_FIRE | MR_POISON, mconveys: MR_FIRE | MR_POISON,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 2, mcolor: CLR_RED
  },
  { // PM_SHRIEKER (163) - monsters.h line 1667
    mname: 'shrieker',
    mlet: S_FUNGUS,
    mlevel: 3, mmove: 1, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [],
    cwt: 100, cnutrit: 100,
    msound: MS_SHRIEK, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_MAGENTA
  },
  { // PM_VIOLET_FUNGUS (164) - monsters.h line 1676
    mname: 'violet fungus',
    mlet: S_FUNGUS,
    mlevel: 3, mmove: 1, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PHYS, damn: 1, damd: 4 }, { aatyp: AT_TUCH, adtyp: AD_STCK, damn: 0, damd: 0 }],
    cwt: 100, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 5, mcolor: CLR_MAGENTA
  },
  { // PM_GNOME (165) - monsters.h line 1687
    mname: 'gnome',
    mlet: S_GNOME,
    mlevel: 1, mmove: 6, ac: 10, mr: 4, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 650, cnutrit: 100,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_GNOME | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_BROWN
  },
  { // PM_GNOME_LEADER (166) - monsters.h line 1694
    mname: 'gnome lord',
    mlet: S_GNOME,
    mlevel: 3, mmove: 8, ac: 10, mr: 4, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 700, cnutrit: 120,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_GNOME | M2_LORD | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_BLUE
  },
  { // PM_GNOMISH_WIZARD (167) - monsters.h line 1701
    mname: 'gnomish wizard',
    mlet: S_GNOME,
    mlevel: 3, mmove: 10, ac: 4, mr: 10, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 700, cnutrit: 120,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_GNOME | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, mcolor: HI_ZAP
  },
  { // PM_GNOME_RULER (168) - monsters.h line 1709
    mname: 'gnome king',
    mlet: S_GNOME,
    mlevel: 5, mmove: 10, ac: 10, mr: 20, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 750, cnutrit: 150,
    msound: MS_ORC, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_GNOME | M2_PRINCE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, mcolor: HI_LORD
  },
  { // PM_GIANT (169) - monsters.h line 1721
    mname: 'giant',
    mlet: S_GIANT,
    mlevel: 6, mmove: 6, ac: 0, mr: 0, maligntyp: 2,
    geno: G_GENO | G_NOGEN | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 }],
    cwt: 2250, cnutrit: 750,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_RED
  },
  { // PM_STONE_GIANT (170) - monsters.h line 1730
    mname: 'stone giant',
    mlet: S_GIANT,
    mlevel: 6, mmove: 6, ac: 0, mr: 0, maligntyp: 2,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 }],
    cwt: 2250, cnutrit: 750,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_HILL_GIANT (171) - monsters.h line 1739
    mname: 'hill giant',
    mlet: S_GIANT,
    mlevel: 8, mmove: 10, ac: 6, mr: 0, maligntyp: -2,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 2200, cnutrit: 700,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 10, mcolor: CLR_CYAN
  },
  { // PM_FIRE_GIANT (172) - monsters.h line 1748
    mname: 'fire giant',
    mlet: S_GIANT,
    mlevel: 9, mmove: 12, ac: 4, mr: 5, maligntyp: 2,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 }],
    cwt: 2250, cnutrit: 750,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_YELLOW
  },
  { // PM_FROST_GIANT (173) - monsters.h line 1757
    mname: 'frost giant',
    mlet: S_GIANT,
    mlevel: 10, mmove: 12, ac: 3, mr: 10, maligntyp: -3,
    geno: G_NOHELL | G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 12 }],
    cwt: 2250, cnutrit: 750,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, mcolor: CLR_WHITE
  },
  { // PM_ETTIN (174) - monsters.h line 1767
    mname: 'ettin',
    mlet: S_GIANT,
    mlevel: 10, mmove: 12, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 6 }],
    cwt: 1700, cnutrit: 500,
    msound: MS_GRUNT, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, mcolor: CLR_BROWN
  },
  { // PM_STORM_GIANT (175) - monsters.h line 1776
    mname: 'storm giant',
    mlet: S_GIANT,
    mlevel: 16, mmove: 12, ac: 3, mr: 10, maligntyp: -3,
    geno: G_GENO | G_SGROUP | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 12 }],
    cwt: 2250, cnutrit: 750,
    msound: MS_BOAST, msize: MZ_HUGE,
    mresists: MR_ELEC, mconveys: MR_ELEC,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, mcolor: CLR_BLUE
  },
  { // PM_TITAN (176) - monsters.h line 1785
    mname: 'titan',
    mlet: S_GIANT,
    mlevel: 16, mmove: 18, ac: -3, mr: 70, maligntyp: 9,
    geno: 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 2300, cnutrit: 900,
    msound: MS_SPELL, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 20, mcolor: CLR_MAGENTA
  },
  { // PM_MINOTAUR (177) - monsters.h line 1793
    mname: 'minotaur',
    mlet: S_GIANT,
    mlevel: 15, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 10 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 10 },
      { aatyp: AT_BUTT, adtyp: AD_PHYS, damn: 2, damd: 8 }
    ],
    cwt: 1500, cnutrit: 700,
    msound: MS_MOO, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 17, mcolor: CLR_BROWN
  },
  { // PM_JABBERWOCK (178) - monsters.h line 1814
    mname: 'jabberwock',
    mlet: S_JABBERWOCK,
    mlevel: 15, mmove: 12, ac: -2, mr: 50, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 10 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 10 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 10 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 10 }
    ],
    cwt: 1300, cnutrit: 600,
    msound: MS_BURBLE, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_FLY | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 18, mcolor: CLR_ORANGE
  },
  { // PM_KEYSTONE_KOP (179) - monsters.h line 1836
    mname: 'Keystone Kop',
    mlet: S_KOP,
    mlevel: 1, mmove: 6, ac: 10, mr: 10, maligntyp: 9,
    geno: G_GENO | G_LGROUP | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_ARREST, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID,
    mflags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_MALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: CLR_BLUE
  },
  { // PM_KOP_SERGEANT (180) - monsters.h line 1844
    mname: 'Kop Sergeant',
    mlet: S_KOP,
    mlevel: 2, mmove: 8, ac: 10, mr: 10, maligntyp: 10,
    geno: G_GENO | G_SGROUP | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_ARREST, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID,
    mflags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_BLUE
  },
  { // PM_KOP_LIEUTENANT (181) - monsters.h line 1852
    mname: 'Kop Lieutenant',
    mlet: S_KOP,
    mlevel: 3, mmove: 10, ac: 10, mr: 20, maligntyp: 11,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_ARREST, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID,
    mflags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 5, mcolor: CLR_CYAN
  },
  { // PM_KOP_KAPTAIN (182) - monsters.h line 1860
    mname: 'Kop Kaptain',
    mlet: S_KOP,
    mlevel: 4, mmove: 12, ac: 10, mr: 20, maligntyp: 12,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_ARREST, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID,
    mflags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: HI_LORD
  },
  { // PM_LICH (183) - monsters.h line 1871
    mname: 'lich',
    mlet: S_LICH,
    mlevel: 11, mmove: 6, ac: 0, mr: 30, maligntyp: -9,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_COLD, damn: 1, damd: 10 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1200, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: MR_COLD,
    mflags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    mflags3: M3_INFRAVISION,
    difficulty: 14, mcolor: CLR_BROWN
  },
  { // PM_DEMILICH (184) - monsters.h line 1879
    mname: 'demilich',
    mlet: S_LICH,
    mlevel: 14, mmove: 9, ac: -2, mr: 60, maligntyp: -12,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_COLD, damn: 3, damd: 4 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1200, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: MR_COLD,
    mflags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    mflags3: M3_INFRAVISION,
    difficulty: 18, mcolor: CLR_RED
  },
  { // PM_MASTER_LICH (185) - monsters.h line 1888
    mname: 'master lich',
    mlet: S_LICH,
    mlevel: 17, mmove: 9, ac: -4, mr: 90, maligntyp: -15,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_COLD, damn: 3, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1200, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_SLEEP | MR_POISON, mconveys: MR_FIRE | MR_COLD,
    mflags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    mflags3: M3_WANTSBOOK | M3_INFRAVISION,
    difficulty: 21, mcolor: HI_LORD
  },
  { // PM_ARCH_LICH (186) - monsters.h line 1897
    mname: 'arch-lich',
    mlet: S_LICH,
    mlevel: 25, mmove: 9, ac: -6, mr: 90, maligntyp: -15,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_COLD, damn: 5, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1200, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_SLEEP | MR_ELEC | MR_POISON, mconveys: MR_FIRE | MR_COLD,
    mflags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    mflags3: M3_WANTSBOOK | M3_INFRAVISION,
    difficulty: 29, mcolor: HI_LORD
  },
  { // PM_KOBOLD_MUMMY (187) - monsters.h line 1908
    mname: 'kobold mummy',
    mlet: S_MUMMY,
    mlevel: 3, mmove: 8, ac: 6, mr: 20, maligntyp: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 400, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_GNOME_MUMMY (188) - monsters.h line 1916
    mname: 'gnome mummy',
    mlet: S_MUMMY,
    mlevel: 4, mmove: 10, ac: 6, mr: 20, maligntyp: -3,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 650, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_GNOME,
    mflags3: M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_RED
  },
  { // PM_ORC_MUMMY (189) - monsters.h line 1925
    mname: 'orc mummy',
    mlet: S_MUMMY,
    mlevel: 5, mmove: 10, ac: 5, mr: 20, maligntyp: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 850, cnutrit: 75,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_STRONG | M2_ORC | M2_GREEDY | M2_JEWELS,
    mflags3: M3_INFRAVISION,
    difficulty: 6, mcolor: CLR_GRAY
  },
  { // PM_DWARF_MUMMY (190) - monsters.h line 1934
    mname: 'dwarf mummy',
    mlet: S_MUMMY,
    mlevel: 5, mmove: 10, ac: 5, mr: 20, maligntyp: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 900, cnutrit: 150,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_DWARF | M2_GREEDY | M2_JEWELS,
    mflags3: M3_INFRAVISION,
    difficulty: 6, mcolor: CLR_RED
  },
  { // PM_ELF_MUMMY (191) - monsters.h line 1942
    mname: 'elf mummy',
    mlet: S_MUMMY,
    mlevel: 6, mmove: 12, ac: 4, mr: 30, maligntyp: -5,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 175,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_ELF,
    mflags3: M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_GREEN
  },
  { // PM_HUMAN_MUMMY (192) - monsters.h line 1951
    mname: 'human mummy',
    mlet: S_MUMMY,
    mlevel: 6, mmove: 12, ac: 4, mr: 30, maligntyp: -5,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_GRAY
  },
  { // PM_ETTIN_MUMMY (193) - monsters.h line 1959
    mname: 'ettin mummy',
    mlet: S_MUMMY,
    mlevel: 7, mmove: 12, ac: 4, mr: 30, maligntyp: -6,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1700, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_BLUE
  },
  { // PM_GIANT_MUMMY (194) - monsters.h line 1968
    mname: 'giant mummy',
    mlet: S_MUMMY,
    mlevel: 8, mmove: 14, ac: 3, mr: 30, maligntyp: -7,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 }],
    cwt: 2050, cnutrit: 375,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_HOSTILE | M2_GIANT | M2_STRONG | M2_JEWELS,
    mflags3: M3_INFRAVISION,
    difficulty: 10, mcolor: CLR_CYAN
  },
  { // PM_RED_NAGA_HATCHLING (195) - monsters.h line 1979
    mname: 'red naga hatchling',
    mlet: S_NAGA,
    mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 500, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_RED
  },
  { // PM_BLACK_NAGA_HATCHLING (196) - monsters.h line 1989
    mname: 'black naga hatchling',
    mlet: S_NAGA,
    mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 500, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_LARGE,
    mresists: MR_POISON | MR_ACID | MR_STONE, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_ACID | M1_NOTAKE
            | M1_CARNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_BLACK
  },
  { // PM_GOLDEN_NAGA_HATCHLING (197) - monsters.h line 1997
    mname: 'golden naga hatchling',
    mlet: S_NAGA,
    mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 500, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 4, mcolor: HI_GOLD
  },
  { // PM_GUARDIAN_NAGA_HATCHLING (198) - monsters.h line 2005
    mname: 'guardian naga hatchling',
    mlet: S_NAGA,
    mlevel: 3, mmove: 10, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 500, cnutrit: 100,
    msound: MS_MUMBLE, msize: MZ_LARGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_GREEN
  },
  { // PM_RED_NAGA (199) - monsters.h line 2014
    mname: 'red naga',
    mlet: S_NAGA,
    mlevel: 6, mmove: 12, ac: 4, mr: 0, maligntyp: -4,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 2, damd: 6 }],
    cwt: 2600, cnutrit: 400,
    msound: MS_MUMBLE, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_POISON, mconveys: MR_FIRE | MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE
                                 | M1_OVIPAROUS | M1_NOTAKE | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_RED
  },
  { // PM_BLACK_NAGA (200) - monsters.h line 2024
    mname: 'black naga',
    mlet: S_NAGA,
    mlevel: 8, mmove: 14, ac: 2, mr: 10, maligntyp: 4,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_SPIT, adtyp: AD_ACID, damn: 0, damd: 0 }],
    cwt: 2600, cnutrit: 400,
    msound: MS_MUMBLE, msize: MZ_HUGE,
    mresists: MR_POISON | MR_ACID | MR_STONE, mconveys: MR_POISON | MR_ACID | MR_STONE,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_ACID
            | M1_NOTAKE | M1_CARNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_BLACK
  },
  { // PM_GOLDEN_NAGA (201) - monsters.h line 2033
    mname: 'golden naga',
    mlet: S_NAGA,
    mlevel: 10, mmove: 14, ac: 2, mr: 70, maligntyp: 5,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 4, damd: 6 }],
    cwt: 2600, cnutrit: 400,
    msound: MS_MUMBLE, msize: MZ_HUGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_NOTAKE
            | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 13, mcolor: HI_GOLD
  },
  { // PM_GUARDIAN_NAGA (202) - monsters.h line 2048
    mname: 'guardian naga',
    mlet: S_NAGA,
    mlevel: 12, mmove: 16, ac: 0, mr: 50, maligntyp: 7,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_SPIT, adtyp: AD_DRST, damn: 1, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PLYS, damn: 1, damd: 6 },
      { aatyp: AT_TUCH, adtyp: AD_PHYS, damn: 0, damd: 0 },
      { aatyp: AT_HUGS, adtyp: AD_WRAP, damn: 2, damd: 4 }
    ],
    cwt: 2600, cnutrit: 400,
    msound: MS_MUMBLE, msize: MZ_HUGE,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_POIS
            | M1_NOTAKE | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: 0,
    difficulty: 17, mcolor: CLR_GREEN
  },
  { // PM_OGRE (203) - monsters.h line 2059
    mname: 'ogre',
    mlet: S_OGRE,
    mlevel: 5, mmove: 10, ac: 5, mr: 0, maligntyp: -3,
    geno: G_SGROUP | G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 5 }],
    cwt: 1600, cnutrit: 500,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_OGRE_LEADER (204) - monsters.h line 2067
    mname: 'ogre lord',
    mlet: S_OGRE,
    mlevel: 7, mmove: 12, ac: 3, mr: 30, maligntyp: -5,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1700, cnutrit: 700,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_RED
  },
  { // PM_OGRE_TYRANT (205) - monsters.h line 2075
    mname: 'ogre king',
    mlet: S_OGRE,
    mlevel: 9, mmove: 14, ac: 4, mr: 60, maligntyp: -7,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 5 }],
    cwt: 1700, cnutrit: 750,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: HI_LORD
  },
  { // PM_GRAY_OOZE (206) - monsters.h line 2091
    mname: 'gray ooze',
    mlet: S_PUDDING,
    mlevel: 3, mmove: 1, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_RUST, damn: 2, damd: 8 }],
    cwt: 500, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_FIRE | MR_COLD | MR_POISON | MR_ACID | MR_STONE, mconveys: MR_FIRE | MR_COLD | MR_POISON,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_GRAY
  },
  { // PM_BROWN_PUDDING (207) - monsters.h line 2102
    mname: 'brown pudding',
    mlet: S_PUDDING,
    mlevel: 5, mmove: 3, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DCAY, damn: 0, damd: 0 }],
    cwt: 500, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mconveys: MR_COLD | MR_ELEC | MR_POISON,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_GREEN_SLIME (208) - monsters.h line 2112
    mname: 'green slime',
    mlet: S_PUDDING,
    mlevel: 6, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_SLIM, damn: 1, damd: 4 }, { aatyp: AT_NONE, adtyp: AD_SLIM, damn: 0, damd: 0 }],
    cwt: 400, cnutrit: 150,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mconveys: MR_ACID | MR_STONE,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID | M1_POIS,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_GREEN
  },
  { // PM_BLACK_PUDDING (209) - monsters.h line 2123
    mname: 'black pudding',
    mlet: S_PUDDING,
    mlevel: 10, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_CORR, damn: 3, damd: 8 }, { aatyp: AT_NONE, adtyp: AD_CORR, damn: 0, damd: 0 }],
    cwt: 900, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mconveys: MR_COLD | MR_ELEC | MR_POISON,
    mflags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 12, mcolor: CLR_BLACK
  },
  { // PM_QUANTUM_MECHANIC (210) - monsters.h line 2134
    mname: 'quantum mechanic',
    mlet: S_QUANTMECH,
    mlevel: 7, mmove: 12, ac: 3, mr: 10, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_TLPT, damn: 1, damd: 4 }],
    cwt: 1450, cnutrit: 20,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_CYAN
  },
  { // PM_GENETIC_ENGINEER (211) - monsters.h line 2143
    mname: 'genetic engineer',
    mlet: S_QUANTMECH,
    mlevel: 12, mmove: 12, ac: 3, mr: 10, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_POLY, damn: 1, damd: 4 }],
    cwt: 1450, cnutrit: 20,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT,
    mflags2: M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_GREEN
  },
  { // PM_RUST_MONSTER (212) - monsters.h line 2154
    mname: 'rust monster',
    mlet: S_RUSTMONST,
    mlevel: 5, mmove: 18, ac: 2, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_TUCH, adtyp: AD_RUST, damn: 0, damd: 0 },
      { aatyp: AT_TUCH, adtyp: AD_RUST, damn: 0, damd: 0 },
      { aatyp: AT_NONE, adtyp: AD_RUST, damn: 0, damd: 0 }
    ],
    cwt: 1000, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_BROWN
  },
  { // PM_DISENCHANTER (213) - monsters.h line 2161
    mname: 'disenchanter',
    mlet: S_RUSTMONST,
    mlevel: 12, mmove: 12, ac: -10, mr: 0, maligntyp: -3,
    geno: G_HELL | G_GENO | 2,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_ENCH, damn: 4, damd: 4 }, { aatyp: AT_NONE, adtyp: AD_ENCH, damn: 0, damd: 0 }],
    cwt: 750, cnutrit: 200,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_BLUE
  },
  { // PM_GARTER_SNAKE (214) - monsters.h line 2175
    mname: 'garter snake',
    mlet: S_SNAKE,
    mlevel: 1, mmove: 8, ac: 8, mr: 0, maligntyp: 0,
    geno: G_LGROUP | G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 50, cnutrit: 60,
    msound: MS_HISS, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
    mflags2: 0,
    mflags3: 0,
    difficulty: 3, mcolor: CLR_GREEN
  },
  { // PM_SNAKE (215) - monsters.h line 2184
    mname: 'snake',
    mlet: S_SNAKE,
    mlevel: 4, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 6 }],
    cwt: 100, cnutrit: 80,
    msound: MS_HISS, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_WATER_MOCCASIN (216) - monsters.h line 2193
    mname: 'water moccasin',
    mlet: S_SNAKE,
    mlevel: 4, mmove: 15, ac: 3, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN | G_LGROUP,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 6 }],
    cwt: 150, cnutrit: 80,
    msound: MS_HISS, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_RED
  },
  { // PM_PYTHON (217) - monsters.h line 2203
    mname: 'python',
    mlet: S_SNAKE,
    mlevel: 6, mmove: 3, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_TUCH, adtyp: AD_PHYS, damn: 0, damd: 0 },
      { aatyp: AT_HUGS, adtyp: AD_WRAP, damn: 1, damd: 4 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 2, damd: 4 }
    ],
    cwt: 250, cnutrit: 100,
    msound: MS_HISS, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_CARNIVORE
            | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_MAGENTA
  },
  { // PM_PIT_VIPER (218) - monsters.h line 2212
    mname: 'pit viper',
    mlet: S_SNAKE,
    mlevel: 6, mmove: 15, ac: 2, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 4 }, { aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 4 }],
    cwt: 100, cnutrit: 60,
    msound: MS_HISS, msize: MZ_MEDIUM,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_BLUE
  },
  { // PM_COBRA (219) - monsters.h line 2221
    mname: 'cobra',
    mlet: S_SNAKE,
    mlevel: 6, mmove: 18, ac: 2, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 2, damd: 4 }, { aatyp: AT_SPIT, adtyp: AD_BLND, damn: 0, damd: 0 }],
    cwt: 250, cnutrit: 100,
    msound: MS_HISS, msize: MZ_MEDIUM,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_BLUE
  },
  { // PM_TROLL (220) - monsters.h line 2232
    mname: 'troll',
    mlet: S_TROLL,
    mlevel: 7, mmove: 12, ac: 4, mr: 0, maligntyp: -3,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 2 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 2 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 800, cnutrit: 350,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_BROWN
  },
  { // PM_ICE_TROLL (221) - monsters.h line 2240
    mname: 'ice troll',
    mlet: S_TROLL,
    mlevel: 9, mmove: 10, ac: 2, mr: 20, maligntyp: -3,
    geno: G_NOHELL | G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_COLD, damn: 2, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 1000, cnutrit: 300,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, mcolor: CLR_WHITE
  },
  { // PM_ROCK_TROLL (222) - monsters.h line 2249
    mname: 'rock troll',
    mlet: S_TROLL,
    mlevel: 9, mmove: 12, ac: 0, mr: 0, maligntyp: -3,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 1200, cnutrit: 300,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, mcolor: CLR_CYAN
  },
  { // PM_WATER_TROLL (223) - monsters.h line 2257
    mname: 'water troll',
    mlet: S_TROLL,
    mlevel: 11, mmove: 14, ac: 4, mr: 40, maligntyp: -3,
    geno: G_NOGEN | G_GENO,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 1200, cnutrit: 350,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE | M1_SWIM,
    mflags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, mcolor: CLR_BLUE
  },
  { // PM_OLOG_HAI (224) - monsters.h line 2266
    mname: 'Olog-hai',
    mlet: S_TROLL,
    mlevel: 13, mmove: 12, ac: -4, mr: 0, maligntyp: -7,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }
    ],
    cwt: 1500, cnutrit: 400,
    msound: MS_GRUNT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 16, mcolor: HI_LORD
  },
  { // PM_UMBER_HULK (225) - monsters.h line 2277
    mname: 'umber hulk',
    mlet: S_UMBER,
    mlevel: 9, mmove: 6, ac: 2, mr: 25, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 5 },
      { aatyp: AT_GAZE, adtyp: AD_CONF, damn: 0, damd: 0 }
    ],
    cwt: 1200, cnutrit: 500,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_CARNIVORE,
    mflags2: M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: CLR_BROWN
  },
  { // PM_VAMPIRE (226) - monsters.h line 2290
    mname: 'vampire',
    mlet: S_VAMPIRE,
    mlevel: 10, mmove: 12, ac: 1, mr: 25, maligntyp: -8,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_BITE, adtyp: AD_DRLI, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_VAMPIRE, msize: MZ_HUMAN,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_SHAPESHIFTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: CLR_RED
  },
  { // PM_VAMPIRE_LEADER (227) - monsters.h line 2300
    mname: 'vampire lord',
    mlet: S_VAMPIRE,
    mlevel: 12, mmove: 14, ac: 0, mr: 50, maligntyp: -9,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_BITE, adtyp: AD_DRLI, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_VAMPIRE, msize: MZ_HUMAN,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_LORD
            | M2_SHAPESHIFTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_BLUE
  },
  { // PM_VLAD_THE_IMPALER (228) - monsters.h line 2322
    mname: 'Vlad the Impaler',
    mlet: S_VAMPIRE,
    mlevel: 28, mmove: 26, ac: -6, mr: 80, maligntyp: -10,
    geno: G_NOGEN | G_NOCORPSE | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 }, { aatyp: AT_BITE, adtyp: AD_DRLI, damn: 1, damd: 12 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_VAMPIRE, msize: MZ_HUMAN,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    mflags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE | M2_SHAPESHIFTER,
    mflags3: M3_WAITFORU | M3_WANTSCAND | M3_INFRAVISIBLE,
    difficulty: 32, mcolor: HI_LORD
  },
  { // PM_BARROW_WIGHT (229) - monsters.h line 2334
    mname: 'barrow wight',
    mlet: S_WRAITH,
    mlevel: 3, mmove: 12, ac: 5, mr: 5, maligntyp: -3,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_DRLI, damn: 0, damd: 0 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_TUCH, adtyp: AD_COLD, damn: 1, damd: 4 }
    ],
    cwt: 1200, cnutrit: 0,
    msound: MS_SPELL, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_HUMANOID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_COLLECT,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_WRAITH (230) - monsters.h line 2344
    mname: 'wraith',
    mlet: S_WRAITH,
    mlevel: 6, mmove: 12, ac: 4, mr: 15, maligntyp: -6,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_DRLI, damn: 1, damd: 6 }],
    cwt: 0, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_FLY | M1_HUMANOID | M1_UNSOLID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    mflags3: 0,
    difficulty: 8, mcolor: CLR_BLACK
  },
  { // PM_NAZGUL (231) - monsters.h line 2353
    mname: 'Nazgul',
    mlet: S_WRAITH,
    mlevel: 13, mmove: 12, ac: 0, mr: 25, maligntyp: -17,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_DRLI, damn: 1, damd: 4 }, { aatyp: AT_BREA, adtyp: AD_SLEE, damn: 2, damd: 25 }],
    cwt: 1450, cnutrit: 0,
    msound: MS_SPELL, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_HUMANOID | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_STRONG | M2_HOSTILE | M2_MALE
            | M2_COLLECT,
    mflags3: 0,
    difficulty: 17, mcolor: HI_LORD
  },
  { // PM_XORN (232) - monsters.h line 2366
    mname: 'xorn',
    mlet: S_XORN,
    mlevel: 8, mmove: 9, ac: -2, mr: 20, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 6 }
    ],
    cwt: 1200, cnutrit: 700,
    msound: MS_ROAR, msize: MZ_MEDIUM,
    mresists: MR_FIRE | MR_COLD | MR_STONE, mconveys: MR_STONE,
    mflags1: M1_BREATHLESS | M1_WALLWALK | M1_THICK_HIDE | M1_METALLIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 11, mcolor: CLR_BROWN
  },
  { // PM_MONKEY (233) - monsters.h line 2378
    mname: 'monkey',
    mlet: S_YETI,
    mlevel: 2, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SITM, damn: 0, damd: 0 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 100, cnutrit: 50,
    msound: MS_GROWL, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE,
    mflags2: 0,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 4, mcolor: CLR_GRAY
  },
  { // PM_APE (234) - monsters.h line 2385
    mname: 'ape',
    mlet: S_YETI,
    mlevel: 4, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }
    ],
    cwt: 1100, cnutrit: 500,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_OWLBEAR (235) - monsters.h line 2393
    mname: 'owlbear',
    mlet: S_YETI,
    mlevel: 5, mmove: 12, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 2, damd: 8 }
    ],
    cwt: 1700, cnutrit: 700,
    msound: MS_ROAR, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_YETI (236) - monsters.h line 2401
    mname: 'yeti',
    mlet: S_YETI,
    mlevel: 5, mmove: 15, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }
    ],
    cwt: 1600, cnutrit: 700,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: MR_COLD, mconveys: MR_COLD,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_WHITE
  },
  { // PM_CARNIVOROUS_APE (237) - monsters.h line 2409
    mname: 'carnivorous ape',
    mlet: S_YETI,
    mlevel: 6, mmove: 12, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 1, damd: 8 }
    ],
    cwt: 1250, cnutrit: 550,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_BLACK
  },
  { // PM_SASQUATCH (238) - monsters.h line 2417
    mname: 'sasquatch',
    mlet: S_YETI,
    mlevel: 7, mmove: 15, ac: 6, mr: 0, maligntyp: 2,
    geno: G_GENO | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 8 }
    ],
    cwt: 1550, cnutrit: 750,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 9, mcolor: CLR_GRAY
  },
  { // PM_KOBOLD_ZOMBIE (239) - monsters.h line 2428
    mname: 'kobold zombie',
    mlet: S_ZOMBIE,
    mlevel: 0, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 400, cnutrit: 50,
    msound: MS_GROAN, msize: MZ_SMALL,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 1, mcolor: CLR_BROWN
  },
  { // PM_GNOME_ZOMBIE (240) - monsters.h line 2436
    mname: 'gnome zombie',
    mlet: S_ZOMBIE,
    mlevel: 1, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 5 }],
    cwt: 650, cnutrit: 50,
    msound: MS_GROAN, msize: MZ_SMALL,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GNOME,
    mflags3: M3_INFRAVISION,
    difficulty: 2, mcolor: CLR_BROWN
  },
  { // PM_ORC_ZOMBIE (241) - monsters.h line 2444
    mname: 'orc zombie',
    mlet: S_ZOMBIE,
    mlevel: 2, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 850, cnutrit: 75,
    msound: MS_GROAN, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ORC,
    mflags3: M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_GRAY
  },
  { // PM_DWARF_ZOMBIE (242) - monsters.h line 2452
    mname: 'dwarf zombie',
    mlet: S_ZOMBIE,
    mlevel: 2, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 900, cnutrit: 150,
    msound: MS_GROAN, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_DWARF,
    mflags3: M3_INFRAVISION,
    difficulty: 3, mcolor: CLR_RED
  },
  { // PM_ELF_ZOMBIE (243) - monsters.h line 2460
    mname: 'elf zombie',
    mlet: S_ZOMBIE,
    mlevel: 3, mmove: 6, ac: 9, mr: 0, maligntyp: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 7 }],
    cwt: 800, cnutrit: 175,
    msound: MS_GROAN, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ELF,
    mflags3: M3_INFRAVISION,
    difficulty: 4, mcolor: CLR_GREEN
  },
  { // PM_HUMAN_ZOMBIE (244) - monsters.h line 2469
    mname: 'human zombie',
    mlet: S_ZOMBIE,
    mlevel: 4, mmove: 6, ac: 8, mr: 0, maligntyp: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 200,
    msound: MS_GROAN, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 5, mcolor: HI_DOMESTIC
  },
  { // PM_ETTIN_ZOMBIE (245) - monsters.h line 2477
    mname: 'ettin zombie',
    mlet: S_ZOMBIE,
    mlevel: 6, mmove: 8, ac: 6, mr: 0, maligntyp: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 10 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 10 }],
    cwt: 1700, cnutrit: 250,
    msound: MS_GROAN, msize: MZ_HUGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_BLUE
  },
  { // PM_GHOUL (246) - monsters.h line 2485
    mname: 'ghoul',
    mlet: S_ZOMBIE,
    mlevel: 3, mmove: 6, ac: 10, mr: 0, maligntyp: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PLYS, damn: 1, damd: 2 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 400, cnutrit: 50,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_UNDEAD | M2_WANDER | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 5, mcolor: CLR_BLACK
  },
  { // PM_GIANT_ZOMBIE (247) - monsters.h line 2494
    mname: 'giant zombie',
    mlet: S_ZOMBIE,
    mlevel: 8, mmove: 8, ac: 6, mr: 0, maligntyp: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 2050, cnutrit: 375,
    msound: MS_GROAN, msize: MZ_HUGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GIANT | M2_STRONG,
    mflags3: M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_CYAN
  },
  { // PM_SKELETON (248) - monsters.h line 2505
    mname: 'skeleton',
    mlet: S_ZOMBIE,
    mlevel: 12, mmove: 8, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_TUCH, adtyp: AD_SLOW, damn: 1, damd: 6 }],
    cwt: 300, cnutrit: 5,
    msound: MS_BONES, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_UNDEAD | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_NASTY,
    mflags3: M3_INFRAVISION,
    difficulty: 14, mcolor: CLR_WHITE
  },
  { // PM_STRAW_GOLEM (249) - monsters.h line 2515
    mname: 'straw golem',
    mlet: S_GOLEM,
    mlevel: 3, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 2 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 400, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_YELLOW
  },
  { // PM_PAPER_GOLEM (250) - monsters.h line 2522
    mname: 'paper golem',
    mlet: S_GOLEM,
    mlevel: 3, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 400, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 4, mcolor: HI_PAPER
  },
  { // PM_ROPE_GOLEM (251) - monsters.h line 2529
    mname: 'rope golem',
    mlet: S_GOLEM,
    mlevel: 4, mmove: 9, ac: 8, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 6, damd: 1 }
    ],
    cwt: 450, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_BROWN
  },
  { // PM_GOLD_GOLEM (252) - monsters.h line 2537
    mname: 'gold golem',
    mlet: S_GOLEM,
    mlevel: 5, mmove: 9, ac: 6, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 3 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 3 }],
    cwt: 450, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON | MR_ACID, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 6, mcolor: HI_GOLD
  },
  { // PM_LEATHER_GOLEM (253) - monsters.h line 2544
    mname: 'leather golem',
    mlet: S_GOLEM,
    mlevel: 6, mmove: 6, ac: 6, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 800, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 7, mcolor: HI_LEATHER
  },
  { // PM_WOOD_GOLEM (254) - monsters.h line 2552
    mname: 'wood golem',
    mlet: S_GOLEM,
    mlevel: 7, mmove: 3, ac: 4, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 }],
    cwt: 900, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_COLD | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_HOSTILE | M2_NEUTER,
    mflags3: 0,
    difficulty: 8, mcolor: HI_WOOD
  },
  { // PM_FLESH_GOLEM (255) - monsters.h line 2561
    mname: 'flesh golem',
    mlet: S_GOLEM,
    mlevel: 9, mmove: 8, ac: 9, mr: 30, maligntyp: 0,
    geno: 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 1400, cnutrit: 600,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 10, mcolor: CLR_RED
  },
  { // PM_CLAY_GOLEM (256) - monsters.h line 2569
    mname: 'clay golem',
    mlet: S_GOLEM,
    mlevel: 11, mmove: 7, ac: 7, mr: 40, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 10 }],
    cwt: 1550, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 12, mcolor: CLR_BROWN
  },
  { // PM_STONE_GOLEM (257) - monsters.h line 2577
    mname: 'stone golem',
    mlet: S_GOLEM,
    mlevel: 14, mmove: 6, ac: 5, mr: 50, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 8 }],
    cwt: 1900, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 15, mcolor: CLR_GRAY
  },
  { // PM_GLASS_GOLEM (258) - monsters.h line 2585
    mname: 'glass golem',
    mlet: S_GOLEM,
    mlevel: 16, mmove: 6, ac: 1, mr: 50, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 1800, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_SLEEP | MR_POISON | MR_ACID, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    mflags2: M2_HOSTILE | M2_STRONG,
    mflags3: 0,
    difficulty: 18, mcolor: CLR_CYAN
  },
  { // PM_IRON_GOLEM (259) - monsters.h line 2594
    mname: 'iron golem',
    mlet: S_GOLEM,
    mlevel: 18, mmove: 6, ac: 3, mr: 60, maligntyp: 0,
    geno: G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_BREA, adtyp: AD_DRST, damn: 4, damd: 6 }],
    cwt: 2000, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE | M1_POIS,
    mflags2: M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: 0,
    difficulty: 22, mcolor: HI_METAL
  },
  { // PM_HUMAN (260) - monsters.h line 2604
    mname: 'human',
    mlet: S_HUMAN,
    mlevel: 0, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 2, mcolor: HI_DOMESTIC
  },
  { // PM_HUMAN_WERERAT (261) - monsters.h line 2617
    mname: 'wererat',
    mlet: S_HUMAN,
    mlevel: 2, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
    geno: 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_WERE, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: CLR_BROWN
  },
  { // PM_HUMAN_WEREJACKAL (262) - monsters.h line 2626
    mname: 'werejackal',
    mlet: S_HUMAN,
    mlevel: 2, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
    geno: 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_WERE, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 3, mcolor: CLR_RED
  },
  { // PM_HUMAN_WEREWOLF (263) - monsters.h line 2635
    mname: 'werewolf',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: -7,
    geno: 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_WERE, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 6, mcolor: CLR_ORANGE
  },
  { // PM_ELF (264) - monsters.h line 2645
    mname: 'elf',
    mlet: S_HUMAN,
    mlevel: 0, mmove: 12, ac: 10, mr: 2, maligntyp: -3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_ELF | M2_COLLECT,
    mflags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 1, mcolor: HI_DOMESTIC
  },
  { // PM_WOODLAND_ELF (265) - monsters.h line 2653
    mname: 'Woodland-elf',
    mlet: S_HUMAN,
    mlevel: 4, mmove: 12, ac: 10, mr: 10, maligntyp: -5,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_ELF | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, mcolor: CLR_GREEN
  },
  { // PM_GREEN_ELF (266) - monsters.h line 2661
    mname: 'Green-elf',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -6,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_ELF | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, mcolor: CLR_BRIGHT_GREEN
  },
  { // PM_GREY_ELF (267) - monsters.h line 2669
    mname: 'Grey-elf',
    mlet: S_HUMAN,
    mlevel: 6, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_ELF | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_ELF_NOBLE (268) - monsters.h line 2678
    mname: 'elf-lord',
    mlet: S_HUMAN,
    mlevel: 8, mmove: 12, ac: 10, mr: 20, maligntyp: -9,
    geno: G_GENO | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_ELF | M2_STRONG | M2_LORD | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_BRIGHT_BLUE
  },
  { // PM_ELVEN_MONARCH (269) - monsters.h line 2687
    mname: 'Elvenking',
    mlet: S_HUMAN,
    mlevel: 9, mmove: 12, ac: 10, mr: 25, maligntyp: -10,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 800, cnutrit: 350,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: MR_SLEEP,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    mflags2: M2_ELF | M2_STRONG | M2_PRINCE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: HI_LORD
  },
  { // PM_DOPPELGANGER (270) - monsters.h line 2697
    mname: 'doppelganger',
    mlet: S_HUMAN,
    mlevel: 9, mmove: 12, ac: 5, mr: 20, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 12 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_IMITATE, msize: MZ_HUMAN,
    mresists: MR_SLEEP, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_SHAPESHIFTER,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 11, mcolor: HI_DOMESTIC
  },
  { // PM_SHOPKEEPER (271) - monsters.h line 2716
    mname: 'shopkeeper',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 16, ac: 0, mr: 50, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SELL, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
            | M2_STRONG | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 15, mcolor: HI_DOMESTIC
  },
  { // PM_GUARD (272) - monsters.h line 2726
    mname: 'guard',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 12, ac: 10, mr: 40, maligntyp: 10,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARD, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_BLUE
  },
  { // PM_PRISONER (273) - monsters.h line 2736
    mname: 'prisoner',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 12, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_DJINNI, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_CLOSE,
    difficulty: 14, mcolor: HI_DOMESTIC
  },
  { // PM_ORACLE (274) - monsters.h line 2745
    mname: 'Oracle',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 0, ac: 0, mr: 50, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_NONE, adtyp: AD_MAGM, damn: 0, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_ORACLE, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_FEMALE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 13, mcolor: HI_ZAP
  },
  { // PM_ALIGNED_CLERIC (275) - monsters.h line 2757
    mname: 'priest',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 12, ac: 10, mr: 50, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 0, damd: 0 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_PRIEST, msize: MZ_HUMAN,
    mresists: MR_ELEC, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_LORD | M2_PEACEFUL | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 15, mcolor: CLR_WHITE
  },
  { // PM_HIGH_CLERIC (276) - monsters.h line 2771
    mname: 'high priest',
    mlet: S_HUMAN,
    mlevel: 25, mmove: 15, ac: 7, mr: 70, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_PRIEST, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MINION | M2_PRINCE | M2_NASTY | M2_COLLECT
            | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 30, mcolor: CLR_WHITE
  },
  { // PM_SOLDIER (277) - monsters.h line 2780
    mname: 'soldier',
    mlet: S_HUMAN,
    mlevel: 6, mmove: 10, ac: 10, mr: 0, maligntyp: -2,
    geno: G_SGROUP | G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_SERGEANT (278) - monsters.h line 2789
    mname: 'sergeant',
    mlet: S_HUMAN,
    mlevel: 8, mmove: 10, ac: 10, mr: 5, maligntyp: -3,
    geno: G_SGROUP | G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 10, mcolor: CLR_RED
  },
  { // PM_NURSE (279) - monsters.h line 2797
    mname: 'nurse',
    mlet: S_HUMAN,
    mlevel: 11, mmove: 6, ac: 0, mr: 0, maligntyp: 0,
    geno: G_GENO | 3,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_HEAL, damn: 2, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_NURSE, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 13, mcolor: HI_DOMESTIC
  },
  { // PM_LIEUTENANT (280) - monsters.h line 2806
    mname: 'lieutenant',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 10, ac: 10, mr: 15, maligntyp: -4,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: CLR_GREEN
  },
  { // PM_CAPTAIN (281) - monsters.h line 2815
    mname: 'captain',
    mlet: S_HUMAN,
    mlevel: 12, mmove: 10, ac: 10, mr: 15, maligntyp: -5,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 14, mcolor: CLR_BLUE
  },
  { // PM_WATCHMAN (282) - monsters.h line 2824
    mname: 'watchman',
    mlet: S_HUMAN,
    mlevel: 6, mmove: 10, ac: 10, mr: 0, maligntyp: -2,
    geno: G_SGROUP | G_NOGEN | G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_WATCH_CAPTAIN (283) - monsters.h line 2833
    mname: 'watch captain',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 10, ac: 10, mr: 15, maligntyp: -4,
    geno: G_NOGEN | G_GENO | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SOLDIER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: CLR_GREEN
  },
  { // PM_MEDUSA (284) - monsters.h line 2846
    mname: 'Medusa',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 12, ac: 2, mr: 50, maligntyp: -15,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 },
      { aatyp: AT_GAZE, adtyp: AD_STON, damn: 0, damd: 0 },
      { aatyp: AT_BITE, adtyp: AD_DRST, damn: 1, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_HISS, msize: MZ_LARGE,
    mresists: MR_POISON | MR_STONE, mconveys: MR_POISON | MR_STONE,
    mflags1: M1_FLY | M1_SWIM | M1_AMPHIBIOUS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HOSTILE | M2_STRONG | M2_PNAME | M2_FEMALE,
    mflags3: M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 25, mcolor: CLR_BRIGHT_GREEN
  },
  { // PM_WIZARD_OF_YENDOR (285) - monsters.h line 2858
    mname: 'Wizard of Yendor',
    mlet: S_HUMAN,
    mlevel: 30, mmove: 12, ac: -8, mr: 100, maligntyp: -128,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 12 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_CUSS, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: MR_FIRE | MR_POISON,
    mflags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS
            | M1_TPORT | M1_TPORT_CNTRL | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_PRINCE
            | M2_MALE | M2_MAGIC,
    mflags3: M3_COVETOUS | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 34, mcolor: HI_OVERLORD
  },
  { // PM_CROESUS (286) - monsters.h line 2869
    mname: 'Croesus',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 40, maligntyp: 15,
    geno: G_UNIQ | G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARD, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_PNAME | M2_PRINCE | M2_MALE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 22, mcolor: HI_LORD
  },
  { // PM_GHOST (287) - monsters.h line 2896
    mname: 'ghost',
    mlet: S_GHOST,
    mlevel: 10, mmove: 3, ac: -5, mr: 50, maligntyp: -5,
    geno: G_NOCORPSE | G_NOGEN,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PHYS, damn: 1, damd: 1 }],
    cwt: 1450, cnutrit: 0,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID,
    mflags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE,
    mflags3: M3_INFRAVISION,
    difficulty: 12, mcolor: CLR_GRAY
  },
  { // PM_SHADE (288) - monsters.h line 2907
    mname: 'shade',
    mlet: S_GHOST,
    mlevel: 12, mmove: 10, ac: 10, mr: 0, maligntyp: 0,
    geno: G_NOCORPSE | G_NOGEN,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PLYS, damn: 2, damd: 6 }, { aatyp: AT_TUCH, adtyp: AD_SLOW, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 0,
    msound: MS_WAIL, msize: MZ_HUMAN,
    mresists: MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID
            | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_UNDEAD | M2_WANDER | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISION,
    difficulty: 14, mcolor: CLR_BLACK
  },
  { // PM_WATER_DEMON (289) - monsters.h line 2919
    mname: 'water demon',
    mlet: S_DEMON,
    mlevel: 8, mmove: 12, ac: -4, mr: 30, maligntyp: -7,
    geno: G_NOCORPSE | G_NOGEN,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_DJINNI, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS | M1_SWIM,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_BLUE
  },
  { // PM_AMOROUS_DEMON (290) - monsters.h line 2938
    mname: 'incubus',
    mlet: S_DEMON,
    mlevel: 6, mmove: 12, ac: 0, mr: 70, maligntyp: -9,
    geno: G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_BITE, adtyp: AD_SSEX, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SEDUCE, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_FLY | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, mcolor: CLR_GRAY
  },
  { // PM_HORNED_DEVIL (291) - monsters.h line 2947
    mname: 'horned devil',
    mlet: S_DEMON,
    mlevel: 6, mmove: 9, ac: -5, mr: 50, maligntyp: 11,
    geno: G_HELL | G_NOCORPSE | 2,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 3 },
      { aatyp: AT_STNG, adtyp: AD_PHYS, damn: 1, damd: 3 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_POIS | M1_THICK_HIDE,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, mcolor: CLR_BROWN
  },
  { // PM_ERINYS (292) - monsters.h line 2961
    mname: 'erinys',
    mlet: S_DEMON,
    mlevel: 7, mmove: 12, ac: 2, mr: 30, maligntyp: 10,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_DRST, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_STRONG | M2_NASTY | M2_FEMALE
            | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 10, mcolor: CLR_RED
  },
  { // PM_BARBED_DEVIL (293) - monsters.h line 2969
    mname: 'barbed devil',
    mlet: S_DEMON,
    mlevel: 8, mmove: 12, ac: 0, mr: 35, maligntyp: 8,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_STCK, damn: 2, damd: 4 },
      { aatyp: AT_STNG, adtyp: AD_PHYS, damn: 3, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_POIS | M1_THICK_HIDE,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_RED
  },
  { // PM_MARILITH (294) - monsters.h line 2979
    mname: 'marilith',
    mlet: S_DEMON,
    mlevel: 7, mmove: 12, ac: -6, mr: 80, maligntyp: -12,
    geno: G_HELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_CUSS, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SLITHY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_FEMALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_RED
  },
  { // PM_VROCK (295) - monsters.h line 2988
    mname: 'vrock',
    mlet: S_DEMON,
    mlevel: 8, mmove: 12, ac: 0, mr: 50, maligntyp: -9,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, mcolor: CLR_GREEN
  },
  { // PM_HEZROU (296) - monsters.h line 2996
    mname: 'hezrou',
    mlet: S_DEMON,
    mlevel: 9, mmove: 6, ac: -2, mr: 55, maligntyp: -10,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 3 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, mcolor: CLR_GREEN
  },
  { // PM_BONE_DEVIL (297) - monsters.h line 3004
    mname: 'bone devil',
    mlet: S_DEMON,
    mlevel: 9, mmove: 15, ac: -1, mr: 40, maligntyp: -9,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 4 }, { aatyp: AT_STNG, adtyp: AD_DRST, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, mcolor: CLR_GRAY
  },
  { // PM_ICE_DEVIL (298) - monsters.h line 3014
    mname: 'ice devil',
    mlet: S_DEMON,
    mlevel: 11, mmove: 6, ac: -4, mr: 55, maligntyp: -12,
    geno: G_HELL | G_NOCORPSE | 2,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_STNG, adtyp: AD_COLD, damn: 3, damd: 4 },
      { aatyp: AT_TUCH, adtyp: AD_SLOW, damn: 1, damd: 1 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_COLD | MR_POISON, mconveys: 0,
    mflags1: M1_SEE_INVIS | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, mcolor: CLR_WHITE
  },
  { // PM_NALFESHNEE (299) - monsters.h line 3023
    mname: 'nalfeshnee',
    mlet: S_DEMON,
    mlevel: 11, mmove: 9, ac: -1, mr: 65, maligntyp: -11,
    geno: G_HELL | G_NOCORPSE | 1,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 4 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_SPELL, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, mcolor: CLR_RED
  },
  { // PM_PIT_FIEND (300) - monsters.h line 3032
    mname: 'pit fiend',
    mlet: S_DEMON,
    mlevel: 13, mmove: 6, ac: -3, mr: 65, maligntyp: -13,
    geno: G_HELL | G_NOCORPSE | 2,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 2 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 2 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 2, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_GROWL, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_SEE_INVIS | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 16, mcolor: CLR_RED
  },
  { // PM_SANDESTIN (301) - monsters.h line 3042
    mname: 'sandestin',
    mlet: S_DEMON,
    mlevel: 13, mmove: 12, ac: 4, mr: 60, maligntyp: -5,
    geno: G_HELL | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 400,
    msound: MS_CUSS, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID,
    mflags2: M2_NOPOLY | M2_STALK | M2_STRONG | M2_COLLECT | M2_SHAPESHIFTER,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, mcolor: CLR_GRAY
  },
  { // PM_BALROG (302) - monsters.h line 3051
    mname: 'balrog',
    mlet: S_DEMON,
    mlevel: 16, mmove: 5, ac: -2, mr: 75, maligntyp: -14,
    geno: G_HELL | G_NOCORPSE | 1,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 8, damd: 4 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 20, mcolor: CLR_RED
  },
  { // PM_JUIBLEX (303) - monsters.h line 3066
    mname: 'Juiblex',
    mlet: S_DEMON,
    mlevel: 50, mmove: 3, ac: -7, mr: 65, maligntyp: -15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_ENGL, adtyp: AD_DISE, damn: 4, damd: 10 }, { aatyp: AT_SPIT, adtyp: AD_ACID, damn: 3, damd: 6 }],
    cwt: 1500, cnutrit: 0,
    msound: MS_GURGLE, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON | MR_ACID | MR_STONE, mconveys: 0,
    mflags1: M1_AMPHIBIOUS | M1_AMORPHOUS | M1_NOHEAD | M1_FLY | M1_SEE_INVIS
            | M1_ACID | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE,
    mflags3: M3_WAITFORU | M3_WANTSAMUL | M3_INFRAVISION,
    difficulty: 26, mcolor: CLR_BRIGHT_GREEN
  },
  { // PM_YEENOGHU (304) - monsters.h line 3077
    mname: 'Yeenoghu',
    mlet: S_DEMON,
    mlevel: 56, mmove: 18, ac: -5, mr: 80, maligntyp: -15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_CONF, damn: 2, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_PLYS, damn: 1, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_MAGM, damn: 2, damd: 6 }
    ],
    cwt: 900, cnutrit: 500,
    msound: MS_ORC, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE | M2_COLLECT,
    mflags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 31, mcolor: HI_LORD
  },
  { // PM_ORCUS (305) - monsters.h line 3089
    mname: 'Orcus',
    mlet: S_DEMON,
    mlevel: 66, mmove: 9, ac: -6, mr: 85, maligntyp: -20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 4 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 8, damd: 6 },
      { aatyp: AT_STNG, adtyp: AD_DRST, damn: 2, damd: 4 }
    ],
    cwt: 1500, cnutrit: 500,
    msound: MS_ORC, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
    mflags3: M3_WAITFORU | M3_WANTSBOOK | M3_WANTSAMUL | M3_INFRAVISIBLE
            | M3_INFRAVISION,
    difficulty: 36, mcolor: HI_LORD
  },
  { // PM_GERYON (306) - monsters.h line 3099
    mname: 'Geryon',
    mlet: S_DEMON,
    mlevel: 72, mmove: 3, ac: -3, mr: 75, maligntyp: 15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 3, damd: 6 },
      { aatyp: AT_STNG, adtyp: AD_DRST, damn: 2, damd: 4 }
    ],
    cwt: 1500, cnutrit: 500,
    msound: MS_BRIBE, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS | M1_SLITHY,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    mflags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 36, mcolor: HI_LORD
  },
  { // PM_DISPATER (307) - monsters.h line 3109
    mname: 'Dispater',
    mlet: S_DEMON,
    mlevel: 78, mmove: 15, ac: -2, mr: 80, maligntyp: 15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 6, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_BRIBE, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS | M1_HUMANOID,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
    mflags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 40, mcolor: HI_LORD
  },
  { // PM_BAALZEBUB (308) - monsters.h line 3119
    mname: 'Baalzebub',
    mlet: S_DEMON,
    mlevel: 89, mmove: 9, ac: -5, mr: 85, maligntyp: 20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_DRST, damn: 2, damd: 6 }, { aatyp: AT_GAZE, adtyp: AD_STUN, damn: 2, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_BRIBE, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    mflags3: M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 45, mcolor: HI_LORD
  },
  { // PM_ASMODEUS (309) - monsters.h line 3129
    mname: 'Asmodeus',
    mlet: S_DEMON,
    mlevel: 105, mmove: 12, ac: -7, mr: 90, maligntyp: 20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 4 }, { aatyp: AT_MAGC, adtyp: AD_COLD, damn: 6, damd: 6 }],
    cwt: 1500, cnutrit: 500,
    msound: MS_BRIBE, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_COLD | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_HUMANOID | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE,
    mflags3: M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 53, mcolor: HI_LORD
  },
  { // PM_DEMOGORGON (310) - monsters.h line 3140
    mname: 'Demogorgon',
    mlet: S_DEMON,
    mlevel: 106, mmove: 15, ac: -8, mr: 95, maligntyp: -20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 8, damd: 6 },
      { aatyp: AT_STNG, adtyp: AD_DRLI, damn: 1, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_DISE, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_DISE, damn: 1, damd: 6 }
    ],
    cwt: 1500, cnutrit: 500,
    msound: MS_GROWL, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_POISON, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_NOHANDS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    mflags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 57, mcolor: HI_LORD
  },
  { // PM_DEATH (311) - monsters.h line 3153
    mname: 'Death',
    mlet: S_DEMON,
    mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
    geno: G_UNIQ | G_NOGEN,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_DETH, damn: 8, damd: 8 }, { aatyp: AT_TUCH, adtyp: AD_DETH, damn: 8, damd: 8 }],
    cwt: 1450, cnutrit: 1,
    msound: MS_RIDER, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    mflags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, mcolor: HI_OVERLORD
  },
  { // PM_PESTILENCE (312) - monsters.h line 3163
    mname: 'Pestilence',
    mlet: S_DEMON,
    mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
    geno: G_UNIQ | G_NOGEN,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_PEST, damn: 8, damd: 8 }, { aatyp: AT_TUCH, adtyp: AD_PEST, damn: 8, damd: 8 }],
    cwt: 1450, cnutrit: 1,
    msound: MS_RIDER, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    mflags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, mcolor: HI_OVERLORD
  },
  { // PM_FAMINE (313) - monsters.h line 3173
    mname: 'Famine',
    mlet: S_DEMON,
    mlevel: 30, mmove: 12, ac: -5, mr: 100, maligntyp: 0,
    geno: G_UNIQ | G_NOGEN,
    mattk: [{ aatyp: AT_TUCH, adtyp: AD_FAMN, damn: 8, damd: 8 }, { aatyp: AT_TUCH, adtyp: AD_FAMN, damn: 8, damd: 8 }],
    cwt: 1450, cnutrit: 1,
    msound: MS_RIDER, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    mflags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, mcolor: HI_OVERLORD
  },
  { // PM_MAIL_DAEMON (314) - monsters.h line 3185
    mname: 'mail daemon',
    mlet: S_DEMON,
    mlevel: 56, mmove: 24, ac: 10, mr: 127, maligntyp: 0,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: [],
    cwt: 600, cnutrit: 300,
    msound: MS_SILENT, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_SWIM | M1_BREATHLESS | M1_SEE_INVIS | M1_HUMANOID
            | M1_POIS,
    mflags2: M2_NOPOLY | M2_STALK | M2_PEACEFUL,
    mflags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 26, mcolor: CLR_BRIGHT_BLUE
  },
  { // PM_DJINNI (315) - monsters.h line 3194
    mname: 'djinni',
    mlet: S_DEMON,
    mlevel: 7, mmove: 12, ac: 4, mr: 30, maligntyp: 0,
    geno: G_NOGEN | G_NOCORPSE,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 }],
    cwt: 1500, cnutrit: 400,
    msound: MS_DJINNI, msize: MZ_HUMAN,
    mresists: MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_FLY | M1_POIS,
    mflags2: M2_NOPOLY | M2_STALK | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: CLR_YELLOW
  },
  { // PM_JELLYFISH (316) - monsters.h line 3212
    mname: 'jellyfish',
    mlet: S_EEL,
    mlevel: 3, mmove: 3, ac: 6, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_STNG, adtyp: AD_DRST, damn: 3, damd: 3 }],
    cwt: 80, cnutrit: 20,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: MR_POISON, mconveys: MR_POISON,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD
            | M1_NOTAKE | M1_POIS,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 5, mcolor: CLR_BLUE
  },
  { // PM_PIRANHA (317) - monsters.h line 3220
    mname: 'piranha',
    mlet: S_EEL,
    mlevel: 5, mmove: 18, ac: 4, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN | G_SGROUP,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 2, damd: 6 }],
    cwt: 60, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_SMALL,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_RED
  },
  { // PM_SHARK (318) - monsters.h line 3229
    mname: 'shark',
    mlet: S_EEL,
    mlevel: 7, mmove: 12, ac: 2, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 5, damd: 6 }],
    cwt: 500, cnutrit: 350,
    msound: MS_SILENT, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_THICK_HIDE | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 9, mcolor: CLR_GRAY
  },
  { // PM_GIANT_EEL (319) - monsters.h line 3238
    mname: 'giant eel',
    mlet: S_EEL,
    mlevel: 5, mmove: 9, ac: -1, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 3, damd: 6 }, { aatyp: AT_TUCH, adtyp: AD_WRAP, damn: 0, damd: 0 }],
    cwt: 200, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: CLR_CYAN
  },
  { // PM_ELECTRIC_EEL (320) - monsters.h line 3247
    mname: 'electric eel',
    mlet: S_EEL,
    mlevel: 7, mmove: 10, ac: -3, mr: 0, maligntyp: 0,
    geno: G_GENO | G_NOGEN,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_ELEC, damn: 4, damd: 6 }, { aatyp: AT_TUCH, adtyp: AD_WRAP, damn: 0, damd: 0 }],
    cwt: 200, cnutrit: 250,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: MR_ELEC, mconveys: MR_ELEC,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    mflags2: M2_HOSTILE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 10, mcolor: CLR_BRIGHT_BLUE
  },
  { // PM_KRAKEN (321) - monsters.h line 3256
    mname: 'kraken',
    mlet: S_EEL,
    mlevel: 20, mmove: 3, ac: 6, mr: 0, maligntyp: -3,
    geno: G_GENO | G_NOGEN,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_HUGS, adtyp: AD_WRAP, damn: 2, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 5, damd: 4 }
    ],
    cwt: 1800, cnutrit: 1000,
    msound: MS_SILENT, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_HOSTILE | M2_STRONG,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 22, mcolor: CLR_RED
  },
  { // PM_NEWT (322) - monsters.h line 3267
    mname: 'newt',
    mlet: S_LIZARD,
    mlevel: 0, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 2 }],
    cwt: 10, cnutrit: 20,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 1, mcolor: CLR_YELLOW
  },
  { // PM_GECKO (323) - monsters.h line 3274
    mname: 'gecko',
    mlet: S_LIZARD,
    mlevel: 1, mmove: 6, ac: 8, mr: 0, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 3 }],
    cwt: 10, cnutrit: 20,
    msound: MS_SQEEK, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 2, mcolor: CLR_GREEN
  },
  { // PM_IGUANA (324) - monsters.h line 3281
    mname: 'iguana',
    mlet: S_LIZARD,
    mlevel: 2, mmove: 6, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 30, cnutrit: 30,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 3, mcolor: CLR_BROWN
  },
  { // PM_BABY_CROCODILE (325) - monsters.h line 3289
    mname: 'baby crocodile',
    mlet: S_LIZARD,
    mlevel: 3, mmove: 6, ac: 7, mr: 0, maligntyp: 0,
    geno: G_GENO,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 200, cnutrit: 200,
    msound: MS_CHIRP, msize: MZ_MEDIUM,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 4, mcolor: CLR_BROWN
  },
  { // PM_LIZARD (326) - monsters.h line 3298
    mname: 'lizard',
    mlet: S_LIZARD,
    mlevel: 5, mmove: 6, ac: 6, mr: 10, maligntyp: 0,
    geno: G_GENO | 5,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 10, cnutrit: 40,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: MR_STONE, mconveys: MR_STONE,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_HOSTILE,
    mflags3: 0,
    difficulty: 6, mcolor: CLR_GREEN
  },
  { // PM_CHAMELEON (327) - monsters.h line 3306
    mname: 'chameleon',
    mlet: S_LIZARD,
    mlevel: 6, mmove: 5, ac: 6, mr: 10, maligntyp: 0,
    geno: G_GENO | 2,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 2 }],
    cwt: 100, cnutrit: 100,
    msound: MS_SILENT, msize: MZ_TINY,
    mresists: 0, mconveys: 0,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_HOSTILE | M2_SHAPESHIFTER,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_CROCODILE (328) - monsters.h line 3315
    mname: 'crocodile',
    mlet: S_LIZARD,
    mlevel: 6, mmove: 9, ac: 5, mr: 0, maligntyp: 0,
    geno: G_GENO | 1,
    mattk: [{ aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 2 }, { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 12 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_BELLOW, msize: MZ_LARGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS
            | M1_OVIPAROUS | M1_CARNIVORE,
    mflags2: M2_STRONG | M2_HOSTILE,
    mflags3: 0,
    difficulty: 7, mcolor: CLR_BROWN
  },
  { // PM_SALAMANDER (329) - monsters.h line 3324
    mname: 'salamander',
    mlet: S_LIZARD,
    mlevel: 8, mmove: 12, ac: -1, mr: 0, maligntyp: -9,
    geno: G_HELL | 1,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_TUCH, adtyp: AD_FIRE, damn: 1, damd: 6 },
      { aatyp: AT_HUGS, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_HUGS, adtyp: AD_FIRE, damn: 3, damd: 6 }
    ],
    cwt: 1500, cnutrit: 400,
    msound: MS_MUMBLE, msize: MZ_HUMAN,
    mresists: MR_SLEEP | MR_FIRE, mconveys: MR_FIRE,
    mflags1: M1_HUMANOID | M1_SLITHY | M1_THICK_HIDE | M1_POIS,
    mflags2: M2_STALK | M2_HOSTILE | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: CLR_ORANGE
  },
  { // PM_LONG_WORM_TAIL (330) - monsters.h line 3334
    mname: 'long worm tail',
    mlet: S_WORM_TAIL,
    mlevel: 0, mmove: 0, ac: 0, mr: 0, maligntyp: 0,
    geno: G_NOGEN | G_NOCORPSE | G_UNIQ,
    mattk: [],
    cwt: 0, cnutrit: 0,
    msound: 0, msize: 0,
    mresists: 0, mconveys: 0,
    mflags1: 0,
    mflags2: M2_NOPOLY,
    mflags3: 0,
    difficulty: 1, mcolor: CLR_BROWN
  },
  { // PM_ARCHEOLOGIST (331) - monsters.h line 3352
    mname: 'archeologist',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_TUNNEL | M1_NEEDPICK | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_BARBARIAN (332) - monsters.h line 3360
    mname: 'barbarian',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_CAVE_DWELLER (333) - monsters.h line 3369
    mname: 'caveman',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 0, maligntyp: 1,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_HEALER (334) - monsters.h line 3377
    mname: 'healer',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_KNIGHT (335) - monsters.h line 3385
    mname: 'knight',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_MONK (336) - monsters.h line 3394
    mname: 'monk',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_HERBIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 11, mcolor: HI_DOMESTIC
  },
  { // PM_CLERIC (337) - monsters.h line 3404
    mname: 'priest',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_RANGER (338) - monsters.h line 3412
    mname: 'ranger',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 2, maligntyp: -3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_ROGUE (339) - monsters.h line 3421
    mname: 'rogue',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: -3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_SAMURAI (340) - monsters.h line 3429
    mname: 'samurai',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_TOURIST (341) - monsters.h line 3437
    mname: 'tourist',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_VALKYRIE (342) - monsters.h line 3451
    mname: 'valkyrie',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 1, maligntyp: 1,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: MR_COLD, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_FEMALE | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_WIZARD (343) - monsters.h line 3460
    mname: 'wizard',
    mlet: S_HUMAN,
    mlevel: 10, mmove: 12, ac: 10, mr: 3, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 12, mcolor: HI_DOMESTIC
  },
  { // PM_LORD_CARNARVON (344) - monsters.h line 3472
    mname: 'Lord Carnarvon',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 4, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_PELIAS (345) - monsters.h line 3481
    mname: 'Pelias',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_SHAMAN_KARNOV (346) - monsters.h line 3490
    mname: 'Shaman Karnov',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_HIPPOCRATES (347) - monsters.h line 3523
    mname: 'Hippocrates',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 3, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 3, damd: 8 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 26, mcolor: HI_LORD
  },
  { // PM_KING_ARTHUR (348) - monsters.h line 3532
    mname: 'King Arthur',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_GRAND_MASTER (349) - monsters.h line 3543
    mname: 'Grand Master',
    mlet: S_HUMAN,
    mlevel: 25, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS | M1_HERBIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_NASTY
            | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 30, mcolor: CLR_BLACK
  },
  { // PM_ARCH_PRIEST (350) - monsters.h line 3554
    mname: 'Arch Priest',
    mlet: S_HUMAN,
    mlevel: 25, mmove: 15, ac: 7, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_KICK, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 2, damd: 8 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_COLLECT
            | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 30, mcolor: CLR_WHITE
  },
  { // PM_ORION (351) - monsters.h line 3563
    mname: 'Orion',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 4, damd: 8 }],
    cwt: 2200, cnutrit: 700,
    msound: MS_LEADER, msize: MZ_HUGE,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS | M1_SWIM | M1_AMPHIBIOUS,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_MASTER_OF_THIEVES (352) - monsters.h line 3575
    mname: 'Master of Thieves',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: -20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_GREEDY
            | M2_JEWELS | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_LORD_SATO (353) - monsters.h line 3583
    mname: 'Lord Sato',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_TWOFLOWER (354) - monsters.h line 3592
    mname: 'Twoflower',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 10, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 22, mcolor: HI_DOMESTIC
  },
  { // PM_NORN (355) - monsters.h line 3603
    mname: 'Norn',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 }],
    cwt: 1800, cnutrit: 550,
    msound: MS_LEADER, msize: MZ_HUGE,
    mresists: MR_COLD, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_FEMALE
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, mcolor: HI_LORD
  },
  { // PM_NEFERET_THE_GREEN (356) - monsters.h line 3612
    mname: 'Neferet the Green',
    mlet: S_HUMAN,
    mlevel: 20, mmove: 15, ac: 0, mr: 90, maligntyp: 0,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 10 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 2, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 2, damd: 8 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_LEADER, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_FEMALE | M2_PNAME | M2_PEACEFUL | M2_STRONG
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 25, mcolor: CLR_GREEN
  },
  { // PM_MINION_OF_HUHETOTL (357) - monsters.h line 3626
    mname: 'Minion of Huhetotl',
    mlet: S_DEMON,
    mlevel: 16, mmove: 12, ac: -2, mr: 75, maligntyp: -14,
    geno: G_NOCORPSE | G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 8, damd: 4 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_COLLECT,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, mcolor: CLR_ORANGE
  },
  { // PM_THOTH_AMON (358) - monsters.h line 3637
    mname: 'Thoth Amon',
    mlet: S_HUMAN,
    mlevel: 16, mmove: 12, ac: 0, mr: 10, maligntyp: -14,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 1, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_STRONG | M2_MALE | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 22, mcolor: HI_LORD
  },
  { // PM_CHROMATIC_DRAGON (359) - monsters.h line 3656
    mname: 'Chromatic Dragon',
    mlet: S_DRAGON,
    mlevel: 16, mmove: 12, ac: 0, mr: 30, maligntyp: -14,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_RBRE, damn: 6, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 8 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 8 },
      { aatyp: AT_STNG, adtyp: AD_PHYS, damn: 1, damd: 6 }
    ],
    cwt: 4500, cnutrit: 1700,
    msound: MS_NEMESIS, msize: MZ_GIGANTIC,
    mresists: MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE, mconveys: MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE,
    mflags1: M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_HOSTILE | M2_FEMALE | M2_STALK | M2_STRONG | M2_NASTY
            | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, mcolor: HI_LORD
  },
  { // PM_CYCLOPS (360) - monsters.h line 3678
    mname: 'Cyclops',
    mlet: S_GIANT,
    mlevel: 18, mmove: 12, ac: 0, mr: 0, maligntyp: -15,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 8 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 1900, cnutrit: 700,
    msound: MS_NEMESIS, msize: MZ_HUGE,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_MALE | M2_JEWELS | M2_COLLECT,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, mcolor: CLR_GRAY
  },
  { // PM_IXOTH (361) - monsters.h line 3690
    mname: 'Ixoth',
    mlet: S_DRAGON,
    mlevel: 15, mmove: 12, ac: -1, mr: 20, maligntyp: -14,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_BREA, adtyp: AD_FIRE, damn: 8, damd: 6 },
      { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 4, damd: 8 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 4 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 4 }
    ],
    cwt: 4500, cnutrit: 1600,
    msound: MS_NEMESIS, msize: MZ_GIGANTIC,
    mresists: MR_FIRE | MR_STONE, mconveys: MR_FIRE,
    mflags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_STALK | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 22, mcolor: CLR_RED
  },
  { // PM_MASTER_KAEN (362) - monsters.h line 3701
    mname: 'Master Kaen',
    mlet: S_HUMAN,
    mlevel: 25, mmove: 12, ac: -10, mr: 10, maligntyp: -20,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 16, damd: 2 },
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 16, damd: 2 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 1, damd: 4 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_POISON | MR_STONE, mconveys: MR_POISON,
    mflags1: M1_HUMANOID | M1_HERBIVORE | M1_SEE_INVIS,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_NASTY | M2_STALK | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 31, mcolor: HI_LORD
  },
  { // PM_NALZOK (363) - monsters.h line 3712
    mname: 'Nalzok',
    mlet: S_DEMON,
    mlevel: 16, mmove: 12, ac: -2, mr: 85, maligntyp: -127,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 8, damd: 4 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 4, damd: 6 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_LARGE,
    mresists: MR_FIRE | MR_POISON | MR_STONE, mconveys: 0,
    mflags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    mflags2: M2_NOPOLY | M2_DEMON | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_STALK | M2_NASTY | M2_COLLECT,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, mcolor: CLR_ORANGE
  },
  { // PM_SCORPIUS (364) - monsters.h line 3722
    mname: 'Scorpius',
    mlet: S_SPIDER,
    mlevel: 15, mmove: 12, ac: 10, mr: 0, maligntyp: -15,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 },
      { aatyp: AT_STNG, adtyp: AD_DISE, damn: 1, damd: 4 }
    ],
    cwt: 750, cnutrit: 350,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_POISON | MR_STONE, mconveys: MR_POISON,
    mflags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    mflags2: M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU,
    difficulty: 17, mcolor: HI_LORD
  },
  { // PM_MASTER_ASSASSIN (365) - monsters.h line 3732
    mname: 'Master Assassin',
    mlet: S_HUMAN,
    mlevel: 15, mmove: 12, ac: 0, mr: 30, maligntyp: 18,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_DRST, damn: 2, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 8 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_MALE | M2_HOSTILE | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 20, mcolor: HI_LORD
  },
  { // PM_ASHIKAGA_TAKAUJI (366) - monsters.h line 3745
    mname: 'Ashikaga Takauji',
    mlet: S_HUMAN,
    mlevel: 15, mmove: 12, ac: 0, mr: 40, maligntyp: -13,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_MALE | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 19, mcolor: HI_LORD
  },
  { // PM_LORD_SURTUR (367) - monsters.h line 3758
    mname: 'Lord Surtur',
    mlet: S_GIANT,
    mlevel: 15, mmove: 12, ac: 2, mr: 50, maligntyp: 12,
    geno: G_NOGEN | G_UNIQ,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 10 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 2, damd: 6 }
    ],
    cwt: 2250, cnutrit: 850,
    msound: MS_NEMESIS, msize: MZ_HUGE,
    mresists: MR_FIRE | MR_STONE, mconveys: MR_FIRE,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_GIANT | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STALK
            | M2_STRONG | M2_NASTY | M2_ROCKTHROW | M2_JEWELS | M2_COLLECT,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 19, mcolor: HI_LORD
  },
  { // PM_DARK_ONE (368) - monsters.h line 3769
    mname: 'Dark One',
    mlet: S_HUMAN,
    mlevel: 15, mmove: 12, ac: 0, mr: 80, maligntyp: -10,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    mattk: [
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 },
      { aatyp: AT_CLAW, adtyp: AD_SAMU, damn: 1, damd: 4 },
      { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_NEMESIS, msize: MZ_HUMAN,
    mresists: MR_STONE, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_HOSTILE | M2_STALK | M2_NASTY
            | M2_COLLECT | M2_MAGIC,
    mflags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 20, mcolor: CLR_BLACK
  },
  { // PM_STUDENT (369) - monsters.h line 3781
    mname: 'student',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_CHIEFTAIN (370) - monsters.h line 3790
    mname: 'chieftain',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_NEANDERTHAL (371) - monsters.h line 3799
    mname: 'neanderthal',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 1,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 2, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_ATTENDANT (372) - monsters.h line 3821
    mname: 'attendant',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: MR_POISON, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_PAGE (373) - monsters.h line 3830
    mname: 'page',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_ABBOT (374) - monsters.h line 3839
    mname: 'abbot',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [
      { aatyp: AT_CLAW, adtyp: AD_PHYS, damn: 8, damd: 2 },
      { aatyp: AT_KICK, adtyp: AD_STUN, damn: 3, damd: 2 },
      { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 0, damd: 0 }
    ],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_HERBIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: HI_DOMESTIC
  },
  { // PM_ACOLYTE (375) - monsters.h line 3848
    mname: 'acolyte',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_CLRC, damn: 0, damd: 0 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: HI_DOMESTIC
  },
  { // PM_HUNTER (376) - monsters.h line 3857
    mname: 'hunter',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -7,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 4 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_THUG (377) - monsters.h line 3866
    mname: 'thug',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: -3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_GREEDY | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_NINJA (378) - monsters.h line 3875
    mname: 'ninja',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_HUMANOID, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_ROSHI (379) - monsters.h line 3884
    mname: 'roshi',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 3,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_GUIDE (380) - monsters.h line 3893
    mname: 'guide',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 20, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: HI_DOMESTIC
  },
  { // PM_WARRIOR (381) - monsters.h line 3905
    mname: 'warrior',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 10, maligntyp: 1,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }, { aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 8 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_FEMALE,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 7, mcolor: HI_DOMESTIC
  },
  { // PM_APPRENTICE (382) - monsters.h line 3914
    mname: 'apprentice',
    mlet: S_HUMAN,
    mlevel: 5, mmove: 12, ac: 10, mr: 30, maligntyp: 0,
    geno: G_NOGEN,
    mattk: [{ aatyp: AT_WEAP, adtyp: AD_PHYS, damn: 1, damd: 6 }, { aatyp: AT_MAGC, adtyp: AD_SPEL, damn: 0, damd: 0 }],
    cwt: 1450, cnutrit: 400,
    msound: MS_GUARDIAN, msize: MZ_HUMAN,
    mresists: 0, mconveys: 0,
    mflags1: M1_HUMANOID | M1_OMNIVORE,
    mflags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
    mflags3: M3_INFRAVISIBLE,
    difficulty: 8, mcolor: HI_DOMESTIC
  },
];

function setAliasPair(obj, canonical, legacy) {
  if (!obj || typeof obj !== "object") return;
  if (obj[canonical] === undefined && obj[legacy] !== undefined) {
    obj[canonical] = obj[legacy];
  }
  if (obj[legacy] === undefined && obj[canonical] !== undefined) {
    obj[legacy] = obj[canonical];
  }
}

function normalizeMonsterFields(mon) {
  if (!mon || typeof mon !== "object") return;
  // C→JS backward-compat aliases (remove once all reads use C names)
  setAliasPair(mon, "mname", "name");
  setAliasPair(mon, "mlet", "symbol");
  setAliasPair(mon, "mlevel", "level");
  setAliasPair(mon, "m_lev", "mlevel");
  setAliasPair(mon, "mmove", "speed");
  setAliasPair(mon, "msize", "size");
  setAliasPair(mon, "mattk", "attacks");
  setAliasPair(mon, "mcolor", "color");
  setAliasPair(mon, "maligntyp", "align");
}

for (const mon of mons) {
  normalizeMonsterFields(mon);
}

// End of monsters.js
// AUTO-IMPORT-END: MONSTERS
