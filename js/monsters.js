// NetHack 3.7 Monster Data - auto-generated from monsters.h
// Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985.
// NetHack may be freely redistributed.  See license for details.

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

// Colors (from color.h)
export const CLR_BLACK = 0;
export const CLR_RED = 1;
export const CLR_GREEN = 2;
export const CLR_BROWN = 3;
export const HI_LEATHER = 3;
export const HI_CLOTH = 3;
export const HI_ORGANIC = 3;
export const HI_WOOD = 3;
export const CLR_BLUE = 4;
export const CLR_MAGENTA = 5;
export const HI_LORD = 5;
export const CLR_CYAN = 6;
export const HI_METAL = 6;
export const CLR_GRAY = 7;
export const HI_SILVER = 7;
export const HI_MINERAL = 7;
export const CLR_ORANGE = 9;
export const CLR_BRIGHT_GREEN = 10;
export const CLR_YELLOW = 11;
export const HI_COPPER = 11;
export const HI_GOLD = 11;
export const CLR_BRIGHT_BLUE = 12;
export const HI_ZAP = 12;
export const CLR_BRIGHT_MAGENTA = 13;
export const HI_OVERLORD = 13;
export const CLR_BRIGHT_CYAN = 14;
export const HI_GLASS = 14;
export const DRAGON_SILVER = 14;
export const CLR_WHITE = 15;
export const HI_DOMESTIC = 15;
export const HI_PAPER = 15;

// Weight constants (from weight.h)
export const WT_ETHEREAL = 0;
export const WT_JELLY = 50;
export const WT_NYMPH = 600;
export const WT_ELF = 800;
export const WT_HUMAN = 1450;
export const WT_BABY_DRAGON = 1500;
export const WT_DRAGON = 4500;

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
export const PM_DJINNI = 314;
export const PM_JELLYFISH = 315;
export const PM_PIRANHA = 316;
export const PM_SHARK = 317;
export const PM_GIANT_EEL = 318;
export const PM_ELECTRIC_EEL = 319;
export const PM_KRAKEN = 320;
export const PM_NEWT = 321;
export const PM_GECKO = 322;
export const PM_IGUANA = 323;
export const PM_BABY_CROCODILE = 324;
export const PM_LIZARD = 325;
export const PM_CHAMELEON = 326;
export const PM_CROCODILE = 327;
export const PM_SALAMANDER = 328;
export const PM_LONG_WORM_TAIL = 329;
export const PM_ARCHEOLOGIST = 330;
export const PM_BARBARIAN = 331;
export const PM_CAVE_DWELLER = 332;
export const PM_HEALER = 333;
export const PM_KNIGHT = 334;
export const PM_MONK = 335;
export const PM_CLERIC = 336;
export const PM_RANGER = 337;
export const PM_ROGUE = 338;
export const PM_SAMURAI = 339;
export const PM_TOURIST = 340;
export const PM_VALKYRIE = 341;
export const PM_WIZARD = 342;
export const PM_LORD_CARNARVON = 343;
export const PM_PELIAS = 344;
export const PM_SHAMAN_KARNOV = 345;
export const PM_HIPPOCRATES = 346;
export const PM_KING_ARTHUR = 347;
export const PM_GRAND_MASTER = 348;
export const PM_ARCH_PRIEST = 349;
export const PM_ORION = 350;
export const PM_MASTER_OF_THIEVES = 351;
export const PM_LORD_SATO = 352;
export const PM_TWOFLOWER = 353;
export const PM_NORN = 354;
export const PM_NEFERET_THE_GREEN = 355;
export const PM_MINION_OF_HUHETOTL = 356;
export const PM_THOTH_AMON = 357;
export const PM_CHROMATIC_DRAGON = 358;
export const PM_CYCLOPS = 359;
export const PM_IXOTH = 360;
export const PM_MASTER_KAEN = 361;
export const PM_NALZOK = 362;
export const PM_SCORPIUS = 363;
export const PM_MASTER_ASSASSIN = 364;
export const PM_ASHIKAGA_TAKAUJI = 365;
export const PM_LORD_SURTUR = 366;
export const PM_DARK_ONE = 367;
export const PM_STUDENT = 368;
export const PM_CHIEFTAIN = 369;
export const PM_NEANDERTHAL = 370;
export const PM_ATTENDANT = 371;
export const PM_PAGE = 372;
export const PM_ABBOT = 373;
export const PM_ACOLYTE = 374;
export const PM_HUNTER = 375;
export const PM_THUG = 376;
export const PM_NINJA = 377;
export const PM_ROSHI = 378;
export const PM_GUIDE = 379;
export const PM_WARRIOR = 380;
export const PM_APPRENTICE = 381;
export const NUMMONS = 382;
export const NON_PM = -1;
export const LOW_PM = 0;
export const HIGH_PM = 381;
export const SPECIAL_PM = PM_LONG_WORM_TAIL; // 329

// The master monster array
export const mons = [
  { // PM_GIANT_ANT (0) - monsters.h line 95
    name: 'giant ant',
    symbol: S_ANT,
    level: 2, speed: 18, ac: 3, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 3,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_KILLER_BEE (1) - monsters.h line 102
    name: 'killer bee',
    symbol: S_ANT,
    level: 1, speed: 18, ac: -1, mr: 0, align: 0,
    geno: G_GENO | G_LGROUP | 2,
    attacks: [{ type: AT_STNG, damage: AD_DRST, dice: 1, sides: 3 }],
    weight: 1, nutrition: 5,
    sound: MS_BUZZ, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_POIS,
    flags2: M2_HOSTILE | M2_FEMALE,
    flags3: 0,
    difficulty: 6, color: CLR_YELLOW
  },
  { // PM_SOLDIER_ANT (2) - monsters.h line 110
    name: 'soldier ant',
    symbol: S_ANT,
    level: 3, speed: 18, ac: 3, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_STNG, damage: AD_DRST, dice: 3, sides: 4 }],
    weight: 20, nutrition: 5,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 7, color: CLR_BLUE
  },
  { // PM_FIRE_ANT (3) - monsters.h line 118
    name: 'fire ant',
    symbol: S_ANT,
    level: 3, speed: 18, ac: 3, mr: 10, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_BITE, damage: AD_FIRE, dice: 2, sides: 4 }],
    weight: 30, nutrition: 10,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_RED
  },
  { // PM_GIANT_BEETLE (4) - monsters.h line 125
    name: 'giant beetle',
    symbol: S_ANT,
    level: 5, speed: 6, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 3,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }],
    weight: 200, nutrition: 50,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 6, color: CLR_BLACK
  },
  { // PM_QUEEN_BEE (5) - monsters.h line 133
    name: 'queen bee',
    symbol: S_ANT,
    level: 9, speed: 24, ac: -4, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_STNG, damage: AD_DRST, dice: 1, sides: 8 }],
    weight: 1, nutrition: 5,
    sound: MS_BUZZ, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_FLY | M1_NOHANDS | M1_OVIPAROUS | M1_POIS,
    flags2: M2_HOSTILE | M2_FEMALE | M2_PRINCE,
    flags3: 0,
    difficulty: 12, color: HI_LORD
  },
  { // PM_ACID_BLOB (6) - monsters.h line 146
    name: 'acid blob',
    symbol: S_BLOB,
    level: 1, speed: 3, ac: 8, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_NONE, damage: AD_ACID, dice: 1, sides: 8 }],
    weight: 30, nutrition: 10,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_SLEEP | MR_POISON | MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID,
    flags2: M2_WANDER | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_GREEN
  },
  { // PM_QUIVERING_BLOB (7) - monsters.h line 154
    name: 'quivering blob',
    symbol: S_BLOB,
    level: 5, speed: 1, ac: 8, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_TUCH, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 200, nutrition: 100,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_SLEEP | MR_POISON, mr2: MR_POISON,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
    flags2: M2_WANDER | M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: CLR_WHITE
  },
  { // PM_GELATINOUS_CUBE (8) - monsters.h line 166
    name: 'gelatinous cube',
    symbol: S_BLOB,
    level: 6, speed: 6, ac: 8, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_TUCH, damage: AD_PLYS, dice: 2, sides: 4 }, { type: AT_NONE, damage: AD_PLYS, dice: 1, sides: 4 }],
    weight: 600, nutrition: 150,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_ACID
            | MR_STONE, mr2: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_OMNIVORE
            | M1_ACID,
    flags2: M2_WANDER | M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 8, color: CLR_CYAN
  },
  { // PM_CHICKATRICE (9) - monsters.h line 177
    name: 'chickatrice',
    symbol: S_COCKATRICE,
    level: 4, speed: 4, ac: 8, mr: 30, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 },
      { type: AT_TUCH, damage: AD_STON, dice: 0, sides: 0 },
      { type: AT_NONE, damage: AD_STON, dice: 0, sides: 0 }
    ],
    weight: 10, nutrition: 10,
    sound: MS_HISS, size: MZ_TINY,
    mr1: MR_POISON | MR_STONE, mr2: MR_POISON | MR_STONE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_COCKATRICE (10) - monsters.h line 186
    name: 'cockatrice',
    symbol: S_COCKATRICE,
    level: 5, speed: 6, ac: 6, mr: 30, align: 0,
    geno: G_GENO | 5,
    attacks: [
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_TUCH, damage: AD_STON, dice: 0, sides: 0 },
      { type: AT_NONE, damage: AD_STON, dice: 0, sides: 0 }
    ],
    weight: 30, nutrition: 30,
    sound: MS_HISS, size: MZ_SMALL,
    mr1: MR_POISON | MR_STONE, mr2: MR_POISON | MR_STONE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_YELLOW
  },
  { // PM_PYROLISK (11) - monsters.h line 195
    name: 'pyrolisk',
    symbol: S_COCKATRICE,
    level: 6, speed: 6, ac: 6, mr: 30, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_GAZE, damage: AD_FIRE, dice: 2, sides: 6 }, { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 30, nutrition: 30,
    sound: MS_HISS, size: MZ_SMALL,
    mr1: MR_POISON | MR_FIRE, mr2: MR_POISON | MR_FIRE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE | M1_OVIPAROUS,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_RED
  },
  { // PM_JACKAL (12) - monsters.h line 205
    name: 'jackal',
    symbol: S_DOG,
    level: 0, speed: 12, ac: 7, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 3,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 300, nutrition: 250,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 1, color: CLR_BROWN
  },
  { // PM_FOX (13) - monsters.h line 212
    name: 'fox',
    symbol: S_DOG,
    level: 0, speed: 15, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 300, nutrition: 250,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 1, color: CLR_RED
  },
  { // PM_COYOTE (14) - monsters.h line 219
    name: 'coyote',
    symbol: S_DOG,
    level: 1, speed: 12, ac: 7, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 300, nutrition: 250,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 2, color: CLR_BROWN
  },
  { // PM_WEREJACKAL (15) - monsters.h line 227
    name: 'werejackal',
    symbol: S_DOG,
    level: 2, speed: 12, ac: 7, mr: 10, align: -7,
    geno: G_NOGEN | G_NOCORPSE,
    attacks: [{ type: AT_BITE, damage: AD_WERE, dice: 1, sides: 4 }],
    weight: 300, nutrition: 250,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_LITTLE_DOG (16) - monsters.h line 234
    name: 'little dog',
    symbol: S_DOG,
    level: 2, speed: 18, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 150, nutrition: 150,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: HI_DOMESTIC
  },
  { // PM_DINGO (17) - monsters.h line 241
    name: 'dingo',
    symbol: S_DOG,
    level: 4, speed: 16, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 400, nutrition: 200,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_YELLOW
  },
  { // PM_DOG (18) - monsters.h line 248
    name: 'dog',
    symbol: S_DOG,
    level: 4, speed: 16, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 400, nutrition: 200,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: HI_DOMESTIC
  },
  { // PM_LARGE_DOG (19) - monsters.h line 256
    name: 'large dog',
    symbol: S_DOG,
    level: 6, speed: 15, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 250,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_STRONG | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_WOLF (20) - monsters.h line 263
    name: 'wolf',
    symbol: S_DOG,
    level: 5, speed: 12, ac: 4, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 500, nutrition: 250,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_GRAY
  },
  { // PM_WEREWOLF (21) - monsters.h line 274
    name: 'werewolf',
    symbol: S_DOG,
    level: 5, speed: 12, ac: 4, mr: 20, align: -7,
    geno: G_NOGEN | G_NOCORPSE,
    attacks: [{ type: AT_BITE, damage: AD_WERE, dice: 2, sides: 6 }],
    weight: 500, nutrition: 250,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_GRAY
  },
  { // PM_WINTER_WOLF_CUB (22) - monsters.h line 282
    name: 'winter wolf cub',
    symbol: S_DOG,
    level: 5, speed: 12, ac: 4, mr: 0, align: 0,
    geno: G_NOHELL | G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_BREA, damage: AD_COLD, dice: 1, sides: 6 }],
    weight: 250, nutrition: 200,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 7, color: CLR_CYAN
  },
  { // PM_WARG (23) - monsters.h line 289
    name: 'warg',
    symbol: S_DOG,
    level: 7, speed: 12, ac: 4, mr: 0, align: -5,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 850, nutrition: 350,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_BLACK
  },
  { // PM_WINTER_WOLF (24) - monsters.h line 296
    name: 'winter wolf',
    symbol: S_DOG,
    level: 7, speed: 12, ac: 4, mr: 20, align: -5,
    geno: G_NOHELL | G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_BREA, damage: AD_COLD, dice: 2, sides: 6 }],
    weight: 700, nutrition: 300,
    sound: MS_BARK, size: MZ_LARGE,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 9, color: CLR_CYAN
  },
  { // PM_HELL_HOUND_PUP (25) - monsters.h line 303
    name: 'hell hound pup',
    symbol: S_DOG,
    level: 7, speed: 12, ac: 4, mr: 20, align: 0,
    geno: G_HELL | G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_BREA, damage: AD_FIRE, dice: 2, sides: 6 }],
    weight: 200, nutrition: 200,
    sound: MS_BARK, size: MZ_SMALL,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_RED
  },
  { // PM_HELL_HOUND (26) - monsters.h line 310
    name: 'hell hound',
    symbol: S_DOG,
    level: 12, speed: 14, ac: 2, mr: 20, align: -5,
    geno: G_HELL | G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }, { type: AT_BREA, damage: AD_FIRE, dice: 3, sides: 6 }],
    weight: 600, nutrition: 300,
    sound: MS_BARK, size: MZ_MEDIUM,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_RED
  },
  { // PM_GAS_SPORE (27) - monsters.h line 332
    name: 'gas spore',
    symbol: S_EYE,
    level: 1, speed: 3, ac: 10, mr: 0, align: 0,
    geno: G_NOCORPSE | G_GENO | 1,
    attacks: [{ type: AT_BOOM, damage: AD_PHYS, dice: 4, sides: 6 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_GRAY
  },
  { // PM_FLOATING_EYE (28) - monsters.h line 340
    name: 'floating eye',
    symbol: S_EYE,
    level: 2, speed: 1, ac: 9, mr: 10, align: 0,
    geno: G_GENO | 5,
    attacks: [{ type: AT_NONE, damage: AD_PLYS, dice: 0, sides: 70 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: CLR_BLUE
  },
  { // PM_FREEZING_SPHERE (29) - monsters.h line 349
    name: 'freezing sphere',
    symbol: S_EYE,
    level: 6, speed: 13, ac: 4, mr: 0, align: 0,
    geno: G_NOCORPSE | G_NOHELL | G_GENO | 2,
    attacks: [{ type: AT_EXPL, damage: AD_COLD, dice: 4, sides: 6 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_WHITE
  },
  { // PM_FLAMING_SPHERE (30) - monsters.h line 357
    name: 'flaming sphere',
    symbol: S_EYE,
    level: 6, speed: 13, ac: 4, mr: 0, align: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    attacks: [{ type: AT_EXPL, damage: AD_FIRE, dice: 4, sides: 6 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_RED
  },
  { // PM_SHOCKING_SPHERE (31) - monsters.h line 366
    name: 'shocking sphere',
    symbol: S_EYE,
    level: 6, speed: 13, ac: 4, mr: 0, align: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    attacks: [{ type: AT_EXPL, damage: AD_ELEC, dice: 4, sides: 6 }],
    weight: 10, nutrition: 10,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_ELEC, mr2: MR_ELEC,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 10, color: HI_ZAP
  },
  { // PM_KITTEN (32) - monsters.h line 388
    name: 'kitten',
    symbol: S_FELINE,
    level: 2, speed: 18, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 150, nutrition: 150,
    sound: MS_MEW, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_WANDER | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: HI_DOMESTIC
  },
  { // PM_HOUSECAT (33) - monsters.h line 396
    name: 'housecat',
    symbol: S_FELINE,
    level: 4, speed: 16, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 200, nutrition: 200,
    sound: MS_MEW, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: HI_DOMESTIC
  },
  { // PM_JAGUAR (34) - monsters.h line 404
    name: 'jaguar',
    symbol: S_FELINE,
    level: 4, speed: 15, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 8 }
    ],
    weight: 600, nutrition: 300,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_LYNX (35) - monsters.h line 412
    name: 'lynx',
    symbol: S_FELINE,
    level: 5, speed: 15, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 10 }
    ],
    weight: 600, nutrition: 300,
    sound: MS_GROWL, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_CYAN
  },
  { // PM_PANTHER (36) - monsters.h line 420
    name: 'panther',
    symbol: S_FELINE,
    level: 5, speed: 15, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 10 }
    ],
    weight: 600, nutrition: 300,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_BLACK
  },
  { // PM_LARGE_CAT (37) - monsters.h line 428
    name: 'large cat',
    symbol: S_FELINE,
    level: 6, speed: 15, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 250, nutrition: 250,
    sound: MS_MEW, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_STRONG | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_TIGER (38) - monsters.h line 436
    name: 'tiger',
    symbol: S_FELINE,
    level: 6, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 10 }
    ],
    weight: 600, nutrition: 300,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: CLR_YELLOW
  },
  { // PM_DISPLACER_BEAST (39) - monsters.h line 444
    name: 'displacer beast',
    symbol: S_FELINE,
    level: 12, speed: 12, ac: -10, mr: 0, align: -3,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 10 }
    ],
    weight: 750, nutrition: 400,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 14, color: CLR_BLUE
  },
  { // PM_GREMLIN (40) - monsters.h line 455
    name: 'gremlin',
    symbol: S_GREMLIN,
    level: 5, speed: 12, ac: 2, mr: 25, align: -9,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_CURS, dice: 0, sides: 0 }
    ],
    weight: 100, nutrition: 20,
    sound: MS_LAUGH, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_HUMANOID | M1_POIS,
    flags2: M2_STALK,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_GREEN
  },
  { // PM_GARGOYLE (41) - monsters.h line 465
    name: 'gargoyle',
    symbol: S_GREMLIN,
    level: 6, speed: 10, ac: -4, mr: 0, align: -9,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }
    ],
    weight: 1000, nutrition: 200,
    sound: MS_GRUNT, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: MR_STONE,
    flags1: M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 8, color: CLR_BROWN
  },
  { // PM_WINGED_GARGOYLE (42) - monsters.h line 473
    name: 'winged gargoyle',
    symbol: S_GREMLIN,
    level: 9, speed: 15, ac: -2, mr: 0, align: -12,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 4 }
    ],
    weight: 1200, nutrition: 300,
    sound: MS_GRUNT, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: MR_STONE,
    flags1: M1_FLY | M1_HUMANOID | M1_THICK_HIDE | M1_BREATHLESS | M1_OVIPAROUS,
    flags2: M2_LORD | M2_HOSTILE | M2_STRONG | M2_MAGIC,
    flags3: 0,
    difficulty: 11, color: HI_LORD
  },
  { // PM_HOBBIT (43) - monsters.h line 483
    name: 'hobbit',
    symbol: S_HUMANOID,
    level: 1, speed: 9, ac: 10, mr: 0, align: 6,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 500, nutrition: 200,
    sound: MS_HUMANOID, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 2, color: CLR_GREEN
  },
  { // PM_DWARF (44) - monsters.h line 493
    name: 'dwarf',
    symbol: S_HUMANOID,
    level: 2, speed: 6, ac: 10, mr: 10, align: 4,
    geno: G_GENO | 3,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 900, nutrition: 300,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_DWARF | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, color: CLR_RED
  },
  { // PM_BUGBEAR (45) - monsters.h line 501
    name: 'bugbear',
    symbol: S_HUMANOID,
    level: 3, speed: 9, ac: 5, mr: 0, align: -6,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1250, nutrition: 250,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: CLR_BROWN
  },
  { // PM_DWARF_LEADER (46) - monsters.h line 510
    name: 'dwarf lord',
    symbol: S_HUMANOID,
    level: 4, speed: 6, ac: 10, mr: 10, align: 5,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 900, nutrition: 300,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_DWARF | M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, color: CLR_BLUE
  },
  { // PM_DWARF_RULER (47) - monsters.h line 520
    name: 'dwarf king',
    symbol: S_HUMANOID,
    level: 6, speed: 6, ac: 10, mr: 20, align: 6,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 900, nutrition: 300,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_DWARF | M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: HI_LORD
  },
  { // PM_MIND_FLAYER (48) - monsters.h line 530
    name: 'mind flayer',
    symbol: S_HUMANOID,
    level: 9, speed: 12, ac: 5, mr: 90, align: -8,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_HISS, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, color: CLR_BRIGHT_MAGENTA
  },
  { // PM_MASTER_MIND_FLAYER (49) - monsters.h line 540
    name: 'master mind flayer',
    symbol: S_HUMANOID,
    level: 13, speed: 12, ac: 0, mr: 90, align: -8,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 },
      { type: AT_TENT, damage: AD_DRIN, dice: 2, sides: 1 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_HISS, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_FLY | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, color: CLR_BRIGHT_MAGENTA
  },
  { // PM_MANES (50) - monsters.h line 550
    name: 'manes',
    symbol: S_IMP,
    level: 1, speed: 3, ac: 7, mr: 0, align: -7,
    geno: G_GENO | G_LGROUP | G_NOCORPSE | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 100, nutrition: 100,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_POIS,
    flags2: M2_HOSTILE | M2_STALK,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: CLR_RED
  },
  { // PM_HOMUNCULUS (51) - monsters.h line 558
    name: 'homunculus',
    symbol: S_IMP,
    level: 2, speed: 12, ac: 6, mr: 10, align: -7,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_SLEE, dice: 1, sides: 3 }],
    weight: 60, nutrition: 100,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_SLEEP | MR_POISON, mr2: MR_SLEEP | MR_POISON,
    flags1: M1_FLY | M1_POIS,
    flags2: M2_STALK,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: CLR_GREEN
  },
  { // PM_IMP (52) - monsters.h line 565
    name: 'imp',
    symbol: S_IMP,
    level: 3, speed: 12, ac: 2, mr: 20, align: -7,
    geno: G_GENO | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 20, nutrition: 10,
    sound: MS_CUSS, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_REGEN,
    flags2: M2_WANDER | M2_STALK,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, color: CLR_RED
  },
  { // PM_LEMURE (53) - monsters.h line 573
    name: 'lemure',
    symbol: S_IMP,
    level: 3, speed: 3, ac: 7, mr: 0, align: -7,
    geno: G_HELL | G_GENO | G_LGROUP | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 150, nutrition: 100,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_SLEEP | MR_POISON, mr2: MR_SLEEP,
    flags1: M1_POIS | M1_REGEN,
    flags2: M2_HOSTILE | M2_WANDER | M2_STALK | M2_NEUTER,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: CLR_BROWN
  },
  { // PM_QUASIT (54) - monsters.h line 580
    name: 'quasit',
    symbol: S_IMP,
    level: 3, speed: 15, ac: 2, mr: 20, align: -7,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_DRDX, dice: 1, sides: 2 },
      { type: AT_CLAW, damage: AD_DRDX, dice: 1, sides: 2 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 200, nutrition: 200,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_REGEN,
    flags2: M2_STALK,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_BLUE
  },
  { // PM_TENGU (55) - monsters.h line 587
    name: 'tengu',
    symbol: S_IMP,
    level: 6, speed: 13, ac: 5, mr: 30, align: 7,
    geno: G_GENO | 3,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 7 }],
    weight: 300, nutrition: 200,
    sound: MS_SQAWK, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_TPORT | M1_TPORT_CNTRL,
    flags2: M2_STALK,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_CYAN
  },
  { // PM_BLUE_JELLY (56) - monsters.h line 600
    name: 'blue jelly',
    symbol: S_JELLY,
    level: 4, speed: 0, ac: 8, mr: 10, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_NONE, damage: AD_COLD, dice: 0, sides: 6 }],
    weight: 50, nutrition: 20,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_COLD | MR_POISON, mr2: MR_COLD | MR_POISON,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 5, color: CLR_BLUE
  },
  { // PM_SPOTTED_JELLY (57) - monsters.h line 610
    name: 'spotted jelly',
    symbol: S_JELLY,
    level: 5, speed: 0, ac: 8, mr: 10, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_NONE, damage: AD_ACID, dice: 0, sides: 6 }],
    weight: 50, nutrition: 20,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: CLR_GREEN
  },
  { // PM_OCHRE_JELLY (58) - monsters.h line 620
    name: 'ochre jelly',
    symbol: S_JELLY,
    level: 6, speed: 3, ac: 8, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_ENGL, damage: AD_ACID, dice: 3, sides: 6 }, { type: AT_NONE, damage: AD_ACID, dice: 3, sides: 6 }],
    weight: 50, nutrition: 20,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_ACID | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 8, color: CLR_BROWN
  },
  { // PM_KOBOLD (59) - monsters.h line 631
    name: 'kobold',
    symbol: S_KOBOLD,
    level: 0, speed: 6, ac: 10, mr: 0, align: -2,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 400, nutrition: 100,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 1, color: CLR_BROWN
  },
  { // PM_LARGE_KOBOLD (60) - monsters.h line 639
    name: 'large kobold',
    symbol: S_KOBOLD,
    level: 1, speed: 6, ac: 10, mr: 0, align: -3,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 450, nutrition: 150,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 2, color: CLR_RED
  },
  { // PM_KOBOLD_LEADER (61) - monsters.h line 648
    name: 'kobold lord',
    symbol: S_KOBOLD,
    level: 2, speed: 6, ac: 10, mr: 0, align: -4,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 500, nutrition: 200,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_LORD | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: HI_LORD
  },
  { // PM_KOBOLD_SHAMAN (62) - monsters.h line 656
    name: 'kobold shaman',
    symbol: S_KOBOLD,
    level: 2, speed: 6, ac: 6, mr: 10, align: -4,
    geno: G_GENO | 1,
    attacks: [{ type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 450, nutrition: 150,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_MAGIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, color: HI_ZAP
  },
  { // PM_LEPRECHAUN (63) - monsters.h line 666
    name: 'leprechaun',
    symbol: S_LEPRECHAUN,
    level: 5, speed: 15, ac: 8, mr: 20, align: 0,
    geno: G_GENO | 4,
    attacks: [{ type: AT_CLAW, damage: AD_SGLD, dice: 1, sides: 2 }],
    weight: 60, nutrition: 30,
    sound: MS_LAUGH, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_TPORT,
    flags2: M2_HOSTILE | M2_GREEDY,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_GREEN
  },
  { // PM_SMALL_MIMIC (64) - monsters.h line 678
    name: 'small mimic',
    symbol: S_MIMIC,
    level: 7, speed: 3, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 }],
    weight: 300, nutrition: 200,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_ACID, mr2: 0,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL | M1_NOEYES
            | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 8, color: CLR_BROWN
  },
  { // PM_LARGE_MIMIC (65) - monsters.h line 688
    name: 'large mimic',
    symbol: S_MIMIC,
    level: 8, speed: 3, ac: 7, mr: 10, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_CLAW, damage: AD_STCK, dice: 3, sides: 4 }],
    weight: 600, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_ACID, mr2: 0,
    flags1: M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 9, color: CLR_RED
  },
  { // PM_GIANT_MIMIC (66) - monsters.h line 698
    name: 'giant mimic',
    symbol: S_MIMIC,
    level: 9, speed: 3, ac: 7, mr: 20, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_CLAW, damage: AD_STCK, dice: 3, sides: 6 }, { type: AT_CLAW, damage: AD_STCK, dice: 3, sides: 6 }],
    weight: 800, nutrition: 500,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_ACID, mr2: 0,
    flags1: M1_CLING | M1_BREATHLESS | M1_AMORPHOUS | M1_HIDE | M1_ANIMAL
            | M1_NOEYES | M1_NOHEAD | M1_NOLIMBS | M1_THICK_HIDE
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 11, color: HI_LORD
  },
  { // PM_WOOD_NYMPH (67) - monsters.h line 708
    name: 'wood nymph',
    symbol: S_NYMPH,
    level: 3, speed: 12, ac: 9, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_SITM, dice: 0, sides: 0 }, { type: AT_CLAW, damage: AD_SEDU, dice: 0, sides: 0 }],
    weight: 600, nutrition: 300,
    sound: MS_SEDUCE, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_TPORT,
    flags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_GREEN
  },
  { // PM_WATER_NYMPH (68) - monsters.h line 716
    name: 'water nymph',
    symbol: S_NYMPH,
    level: 3, speed: 12, ac: 9, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_SITM, dice: 0, sides: 0 }, { type: AT_CLAW, damage: AD_SEDU, dice: 0, sides: 0 }],
    weight: 600, nutrition: 300,
    sound: MS_SEDUCE, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_TPORT | M1_SWIM,
    flags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_BLUE
  },
  { // PM_MOUNTAIN_NYMPH (69) - monsters.h line 723
    name: 'mountain nymph',
    symbol: S_NYMPH,
    level: 3, speed: 12, ac: 9, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_SITM, dice: 0, sides: 0 }, { type: AT_CLAW, damage: AD_SEDU, dice: 0, sides: 0 }],
    weight: 600, nutrition: 300,
    sound: MS_SEDUCE, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_TPORT,
    flags2: M2_HOSTILE | M2_FEMALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_BROWN
  },
  { // PM_GOBLIN (70) - monsters.h line 733
    name: 'goblin',
    symbol: S_ORC,
    level: 0, speed: 6, ac: 10, mr: 0, align: -3,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 400, nutrition: 100,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 1, color: CLR_GRAY
  },
  { // PM_HOBGOBLIN (71) - monsters.h line 739
    name: 'hobgoblin',
    symbol: S_ORC,
    level: 1, speed: 9, ac: 10, mr: 0, align: -4,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1000, nutrition: 200,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: CLR_BROWN
  },
  { // PM_ORC (72) - monsters.h line 751
    name: 'orc',
    symbol: S_ORC,
    level: 1, speed: 9, ac: 10, mr: 0, align: -3,
    geno: G_GENO | G_NOGEN | G_LGROUP,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 850, nutrition: 150,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: CLR_RED
  },
  { // PM_HILL_ORC (73) - monsters.h line 760
    name: 'hill orc',
    symbol: S_ORC,
    level: 2, speed: 9, ac: 10, mr: 0, align: -4,
    geno: G_GENO | G_LGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1000, nutrition: 200,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, color: CLR_YELLOW
  },
  { // PM_MORDOR_ORC (74) - monsters.h line 769
    name: 'Mordor orc',
    symbol: S_ORC,
    level: 3, speed: 5, ac: 10, mr: 0, align: -5,
    geno: G_GENO | G_LGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1200, nutrition: 200,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: CLR_BLUE
  },
  { // PM_URUK_HAI (75) - monsters.h line 778
    name: 'Uruk-hai',
    symbol: S_ORC,
    level: 3, speed: 7, ac: 10, mr: 0, align: -4,
    geno: G_GENO | G_LGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1300, nutrition: 300,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: CLR_BLACK
  },
  { // PM_ORC_SHAMAN (76) - monsters.h line 787
    name: 'orc shaman',
    symbol: S_ORC,
    level: 3, speed: 9, ac: 5, mr: 10, align: -5,
    geno: G_GENO | 1,
    attacks: [{ type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1000, nutrition: 300,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: HI_ZAP
  },
  { // PM_ORC_CAPTAIN (77) - monsters.h line 796
    name: 'orc-captain',
    symbol: S_ORC,
    level: 5, speed: 5, ac: 10, mr: 0, align: -5,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1350, nutrition: 350,
    sound: MS_ORC, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_ORC | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: HI_LORD
  },
  { // PM_ROCK_PIERCER (78) - monsters.h line 808
    name: 'rock piercer',
    symbol: S_PIERCER,
    level: 3, speed: 1, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 4,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 200, nutrition: 200,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 4, color: CLR_GRAY
  },
  { // PM_IRON_PIERCER (79) - monsters.h line 817
    name: 'iron piercer',
    symbol: S_PIERCER,
    level: 5, speed: 1, ac: 0, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }],
    weight: 400, nutrition: 300,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 6, color: CLR_CYAN
  },
  { // PM_GLASS_PIERCER (80) - monsters.h line 826
    name: 'glass piercer',
    symbol: S_PIERCER,
    level: 7, speed: 1, ac: 0, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 6 }],
    weight: 400, nutrition: 300,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_ACID, mr2: 0,
    flags1: M1_CLING | M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_CARNIVORE
            | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 9, color: CLR_WHITE
  },
  { // PM_ROTHE (81) - monsters.h line 837
    name: 'rothe',
    symbol: S_QUADRUPED,
    level: 2, speed: 9, ac: 7, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 4,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 8 }
    ],
    weight: 400, nutrition: 100,
    sound: MS_MOO, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_MUMAK (82) - monsters.h line 845
    name: 'mumak',
    symbol: S_QUADRUPED,
    level: 5, speed: 9, ac: 0, mr: 0, align: -2,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BUTT, damage: AD_PHYS, dice: 4, sides: 12 }, { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 2500, nutrition: 500,
    sound: MS_TRUMPET, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_GRAY
  },
  { // PM_LEOCROTTA (83) - monsters.h line 853
    name: 'leocrotta',
    symbol: S_QUADRUPED,
    level: 6, speed: 18, ac: 4, mr: 10, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 1200, nutrition: 500,
    sound: MS_IMITATE, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_RED
  },
  { // PM_WUMPUS (84) - monsters.h line 861
    name: 'wumpus',
    symbol: S_QUADRUPED,
    level: 8, speed: 3, ac: 2, mr: 10, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }],
    weight: 2500, nutrition: 500,
    sound: MS_BURBLE, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_CLING | M1_ANIMAL | M1_NOHANDS | M1_OMNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_CYAN
  },
  { // PM_TITANOTHERE (85) - monsters.h line 869
    name: 'titanothere',
    symbol: S_QUADRUPED,
    level: 12, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 2650, nutrition: 650,
    sound: MS_BELLOW, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 13, color: CLR_GRAY
  },
  { // PM_BALUCHITHERIUM (86) - monsters.h line 877
    name: 'baluchitherium',
    symbol: S_QUADRUPED,
    level: 14, speed: 12, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 5, sides: 4 }, { type: AT_CLAW, damage: AD_PHYS, dice: 5, sides: 4 }],
    weight: 3800, nutrition: 800,
    sound: MS_BELLOW, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 15, color: CLR_GRAY
  },
  { // PM_MASTODON (87) - monsters.h line 885
    name: 'mastodon',
    symbol: S_QUADRUPED,
    level: 20, speed: 12, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BUTT, damage: AD_PHYS, dice: 4, sides: 8 }, { type: AT_BUTT, damage: AD_PHYS, dice: 4, sides: 8 }],
    weight: 3800, nutrition: 800,
    sound: MS_TRUMPET, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 22, color: CLR_BLACK
  },
  { // PM_SEWER_RAT (88) - monsters.h line 895
    name: 'sewer rat',
    symbol: S_RODENT,
    level: 0, speed: 12, ac: 7, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 20, nutrition: 12,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 1, color: CLR_BROWN
  },
  { // PM_GIANT_RAT (89) - monsters.h line 902
    name: 'giant rat',
    symbol: S_RODENT,
    level: 1, speed: 10, ac: 7, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 30, nutrition: 30,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 2, color: CLR_BROWN
  },
  { // PM_RABID_RAT (90) - monsters.h line 910
    name: 'rabid rat',
    symbol: S_RODENT,
    level: 2, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_DRCO, dice: 2, sides: 4 }],
    weight: 30, nutrition: 5,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_WERERAT (91) - monsters.h line 918
    name: 'wererat',
    symbol: S_RODENT,
    level: 2, speed: 12, ac: 6, mr: 10, align: -7,
    geno: G_NOGEN | G_NOCORPSE,
    attacks: [{ type: AT_BITE, damage: AD_WERE, dice: 1, sides: 4 }],
    weight: 40, nutrition: 30,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_NOHANDS | M1_POIS | M1_REGEN | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_ROCK_MOLE (92) - monsters.h line 926
    name: 'rock mole',
    symbol: S_RODENT,
    level: 3, speed: 3, ac: 0, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 30, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE,
    flags2: M2_HOSTILE | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_GRAY
  },
  { // PM_WOODCHUCK (93) - monsters.h line 936
    name: 'woodchuck',
    symbol: S_RODENT,
    level: 3, speed: 3, ac: 0, mr: 20, align: 0,
    geno: G_NOGEN | G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 30, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL  | M1_ANIMAL | M1_NOHANDS | M1_SWIM
            | M1_HERBIVORE,
    flags2: M2_WANDER | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_CAVE_SPIDER (94) - monsters.h line 947
    name: 'cave spider',
    symbol: S_SPIDER,
    level: 1, speed: 12, ac: 3, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 50, nutrition: 50,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 3, color: CLR_GRAY
  },
  { // PM_CENTIPEDE (95) - monsters.h line 955
    name: 'centipede',
    symbol: S_SPIDER,
    level: 2, speed: 4, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 1, sides: 3 }],
    weight: 50, nutrition: 50,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 4, color: CLR_YELLOW
  },
  { // PM_GIANT_SPIDER (96) - monsters.h line 963
    name: 'giant spider',
    symbol: S_SPIDER,
    level: 5, speed: 15, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 2, sides: 4 }],
    weight: 200, nutrition: 100,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 7, color: CLR_MAGENTA
  },
  { // PM_SCORPION (97) - monsters.h line 972
    name: 'scorpion',
    symbol: S_SPIDER,
    level: 5, speed: 15, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 2 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 2 },
      { type: AT_STNG, damage: AD_DRST, dice: 1, sides: 4 }
    ],
    weight: 50, nutrition: 100,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_CONCEAL | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 8, color: CLR_RED
  },
  { // PM_LURKER_ABOVE (98) - monsters.h line 989
    name: 'lurker above',
    symbol: S_TRAPPER,
    level: 10, speed: 3, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_ENGL, damage: AD_WRAP, dice: 1, sides: 6 }, { type: AT_ENGL, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 800, nutrition: 350,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HIDE | M1_FLY | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STALK | M2_STRONG,
    flags3: 0,
    difficulty: 12, color: CLR_GRAY
  },
  { // PM_TRAPPER (99) - monsters.h line 998
    name: 'trapper',
    symbol: S_TRAPPER,
    level: 12, speed: 3, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_ENGL, damage: AD_WRAP, dice: 1, sides: 8 }, { type: AT_ENGL, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 800, nutrition: 350,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HIDE | M1_ANIMAL | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STALK | M2_STRONG,
    flags3: 0,
    difficulty: 14, color: CLR_GREEN
  },
  { // PM_PONY (100) - monsters.h line 1009
    name: 'pony',
    symbol: S_UNICORN,
    level: 3, speed: 16, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 1300, nutrition: 250,
    sound: MS_NEIGH, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_WHITE_UNICORN (101) - monsters.h line 1017
    name: 'white unicorn',
    symbol: S_UNICORN,
    level: 4, speed: 24, ac: 2, mr: 70, align: 7,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BUTT, damage: AD_PHYS, dice: 1, sides: 12 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1300, nutrition: 300,
    sound: MS_NEIGH, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_WHITE
  },
  { // PM_GRAY_UNICORN (102) - monsters.h line 1025
    name: 'gray unicorn',
    symbol: S_UNICORN,
    level: 4, speed: 24, ac: 2, mr: 70, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BUTT, damage: AD_PHYS, dice: 1, sides: 12 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1300, nutrition: 300,
    sound: MS_NEIGH, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_GRAY
  },
  { // PM_BLACK_UNICORN (103) - monsters.h line 1033
    name: 'black unicorn',
    symbol: S_UNICORN,
    level: 4, speed: 24, ac: 2, mr: 70, align: -7,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BUTT, damage: AD_PHYS, dice: 1, sides: 12 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1300, nutrition: 300,
    sound: MS_NEIGH, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_JEWELS,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_BLACK
  },
  { // PM_HORSE (104) - monsters.h line 1041
    name: 'horse',
    symbol: S_UNICORN,
    level: 5, speed: 20, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 1500, nutrition: 300,
    sound: MS_NEIGH, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_WARHORSE (105) - monsters.h line 1049
    name: 'warhorse',
    symbol: S_UNICORN,
    level: 7, speed: 24, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 10 }, { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 1800, nutrition: 350,
    sound: MS_NEIGH, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_HERBIVORE,
    flags2: M2_WANDER | M2_STRONG | M2_DOMESTIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_BROWN
  },
  { // PM_FOG_CLOUD (106) - monsters.h line 1061
    name: 'fog cloud',
    symbol: S_VORTEX,
    level: 3, speed: 1, ac: 0, mr: 0, align: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    attacks: [{ type: AT_ENGL, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_AMORPHOUS | M1_UNSOLID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 4, color: CLR_GRAY
  },
  { // PM_DUST_VORTEX (107) - monsters.h line 1070
    name: 'dust vortex',
    symbol: S_VORTEX,
    level: 4, speed: 20, ac: 2, mr: 30, align: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    attacks: [{ type: AT_ENGL, damage: AD_BLND, dice: 2, sides: 8 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_ICE_VORTEX (108) - monsters.h line 1080
    name: 'ice vortex',
    symbol: S_VORTEX,
    level: 5, speed: 20, ac: 2, mr: 30, align: 0,
    geno: G_NOHELL | G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_ENGL, damage: AD_COLD, dice: 1, sides: 6 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_CYAN
  },
  { // PM_ENERGY_VORTEX (109) - monsters.h line 1090
    name: 'energy vortex',
    symbol: S_VORTEX,
    level: 6, speed: 20, ac: 2, mr: 30, align: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [
      { type: AT_ENGL, damage: AD_ELEC, dice: 1, sides: 6 },
      { type: AT_ENGL, damage: AD_DREN, dice: 2, sides: 6 },
      { type: AT_NONE, damage: AD_ELEC, dice: 0, sides: 4 }
    ],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_ELEC | MR_SLEEP | MR_DISINT | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 9, color: HI_ZAP
  },
  { // PM_STEAM_VORTEX (110) - monsters.h line 1100
    name: 'steam vortex',
    symbol: S_VORTEX,
    level: 7, speed: 22, ac: 2, mr: 30, align: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 2,
    attacks: [{ type: AT_ENGL, damage: AD_FIRE, dice: 1, sides: 8 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_BLUE
  },
  { // PM_FIRE_VORTEX (111) - monsters.h line 1110
    name: 'fire vortex',
    symbol: S_VORTEX,
    level: 8, speed: 22, ac: 2, mr: 30, align: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_ENGL, damage: AD_FIRE, dice: 1, sides: 10 }, { type: AT_NONE, damage: AD_FIRE, dice: 0, sides: 4 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_FIRE | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_UNSOLID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 10, color: CLR_YELLOW
  },
  { // PM_BABY_LONG_WORM (112) - monsters.h line 1121
    name: 'baby long worm',
    symbol: S_WORM,
    level: 5, speed: 3, ac: 5, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 600, nutrition: 250,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_BABY_PURPLE_WORM (113) - monsters.h line 1128
    name: 'baby purple worm',
    symbol: S_WORM,
    level: 8, speed: 3, ac: 5, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 600, nutrition: 250,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 9, color: CLR_MAGENTA
  },
  { // PM_LONG_WORM (114) - monsters.h line 1137
    name: 'long worm',
    symbol: S_WORM,
    level: 9, speed: 3, ac: 5, mr: 10, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1500, nutrition: 500,
    sound: MS_SILENT, size: MZ_GIGANTIC,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    flags3: 0,
    difficulty: 10, color: CLR_BROWN
  },
  { // PM_PURPLE_WORM (115) - monsters.h line 1145
    name: 'purple worm',
    symbol: S_WORM,
    level: 15, speed: 9, ac: 6, mr: 20, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_ENGL, damage: AD_DGST, dice: 1, sides: 10 }],
    weight: 2700, nutrition: 700,
    sound: MS_SILENT, size: MZ_GIGANTIC,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_SLITHY | M1_NOLIMBS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    flags3: 0,
    difficulty: 17, color: CLR_MAGENTA
  },
  { // PM_GRID_BUG (116) - monsters.h line 1156
    name: 'grid bug',
    symbol: S_XAN,
    level: 0, speed: 12, ac: 9, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 3,
    attacks: [{ type: AT_BITE, damage: AD_ELEC, dice: 1, sides: 1 }],
    weight: 15, nutrition: 10,
    sound: MS_BUZZ, size: MZ_TINY,
    mr1: MR_ELEC | MR_POISON, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 1, color: CLR_MAGENTA
  },
  { // PM_XAN (117) - monsters.h line 1164
    name: 'xan',
    symbol: S_XAN,
    level: 7, speed: 18, ac: -4, mr: 0, align: 0,
    geno: G_GENO | 3,
    attacks: [{ type: AT_STNG, damage: AD_LEGS, dice: 1, sides: 4 }],
    weight: 300, nutrition: 300,
    sound: MS_BUZZ, size: MZ_TINY,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_RED
  },
  { // PM_YELLOW_LIGHT (118) - monsters.h line 1179
    name: 'yellow light',
    symbol: S_LIGHT,
    level: 3, speed: 15, ac: 0, mr: 0, align: 0,
    geno: G_NOCORPSE | G_GENO | 4,
    attacks: [{ type: AT_EXPL, damage: AD_BLND, dice: 10, sides: 20 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
               | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_YELLOW
  },
  { // PM_BLACK_LIGHT (119) - monsters.h line 1191
    name: 'black light',
    symbol: S_LIGHT,
    level: 5, speed: 15, ac: 0, mr: 0, align: 0,
    geno: G_NOCORPSE | G_GENO | 2,
    attacks: [{ type: AT_EXPL, damage: AD_HALU, dice: 10, sides: 12 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_DISINT | MR_SLEEP | MR_POISON
            | MR_ACID | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS
            | M1_NOHEAD | M1_MINDLESS | M1_UNSOLID | M1_SEE_INVIS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 7, color: CLR_BLACK
  },
  { // PM_ZRUTY (120) - monsters.h line 1202
    name: 'zruty',
    symbol: S_ZRUTY,
    level: 9, speed: 8, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }
    ],
    weight: 1200, nutrition: 600,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 11, color: CLR_BROWN
  },
  { // PM_COUATL (121) - monsters.h line 1214
    name: 'couatl',
    symbol: S_ANGEL,
    level: 8, speed: 10, ac: 5, mr: 30, align: 7,
    geno: G_NOHELL | G_SGROUP | G_NOCORPSE | 1,
    attacks: [
      { type: AT_BITE, damage: AD_DRST, dice: 2, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_HUGS, damage: AD_WRAP, dice: 2, sides: 4 }
    ],
    weight: 900, nutrition: 400,
    sound: MS_HISS, size: MZ_LARGE,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_NOHANDS | M1_SLITHY | M1_POIS,
    flags2: M2_MINION | M2_STALK | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_GREEN
  },
  { // PM_ALEAX (122) - monsters.h line 1224
    name: 'Aleax',
    symbol: S_ANGEL,
    level: 10, speed: 8, ac: 0, mr: 30, align: 7,
    geno: G_NOHELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_IMITATE, size: MZ_HUMAN,
    mr1: MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS,
    flags2: M2_MINION | M2_STALK | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, color: CLR_YELLOW
  },
  { // PM_ANGEL (123) - monsters.h line 1239
    name: 'Angel',
    symbol: S_ANGEL,
    level: 14, speed: 10, ac: -4, mr: 55, align: 12,
    geno: G_NOHELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_MAGC, damage: AD_MAGM, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_CUSS, size: MZ_HUMAN,
    mr1: MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, color: CLR_WHITE
  },
  { // PM_KI_RIN (124) - monsters.h line 1253
    name: 'ki-rin',
    symbol: S_ANGEL,
    level: 16, speed: 18, ac: -5, mr: 90, align: 15,
    geno: G_NOHELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_KICK, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_KICK, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_BUTT, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SPELL, size: MZ_LARGE,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_NOHANDS | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 21, color: HI_GOLD
  },
  { // PM_ARCHON (125) - monsters.h line 1265
    name: 'Archon',
    symbol: S_ANGEL,
    level: 19, speed: 16, ac: -6, mr: 80, align: 15,
    geno: G_NOHELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_GAZE, damage: AD_BLND, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 4, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_CUSS, size: MZ_LARGE,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_SEE_INVIS | M1_REGEN,
    flags2: M2_NOPOLY | M2_MINION | M2_STALK | M2_STRONG | M2_NASTY | M2_LORD
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 26, color: HI_LORD
  },
  { // PM_BAT (126) - monsters.h line 1275
    name: 'bat',
    symbol: S_BAT,
    level: 0, speed: 22, ac: 8, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 20, nutrition: 20,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_WANDER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 2, color: CLR_BROWN
  },
  { // PM_GIANT_BAT (127) - monsters.h line 1283
    name: 'giant bat',
    symbol: S_BAT,
    level: 2, speed: 22, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 30, nutrition: 30,
    sound: MS_SQEEK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_WANDER | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: CLR_RED
  },
  { // PM_RAVEN (128) - monsters.h line 1290
    name: 'raven',
    symbol: S_BAT,
    level: 4, speed: 20, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_CLAW, damage: AD_BLND, dice: 1, sides: 6 }],
    weight: 40, nutrition: 20,
    sound: MS_SQAWK, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_WANDER | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_BLACK
  },
  { // PM_VAMPIRE_BAT (129) - monsters.h line 1297
    name: 'vampire bat',
    symbol: S_BAT,
    level: 5, speed: 20, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_BITE, damage: AD_DRST, dice: 0, sides: 0 }],
    weight: 30, nutrition: 20,
    sound: MS_SQEEK, size: MZ_SMALL,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_ANIMAL | M1_NOHANDS | M1_POIS | M1_REGEN | M1_OMNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_BLACK
  },
  { // PM_PLAINS_CENTAUR (130) - monsters.h line 1307
    name: 'plains centaur',
    symbol: S_CENTAUR,
    level: 4, speed: 18, ac: 4, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 2500, nutrition: 500,
    sound: MS_HUMANOID, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_FOREST_CENTAUR (131) - monsters.h line 1315
    name: 'forest centaur',
    symbol: S_CENTAUR,
    level: 5, speed: 18, ac: 3, mr: 10, align: -1,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 2550, nutrition: 600,
    sound: MS_HUMANOID, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_GREEN
  },
  { // PM_MOUNTAIN_CENTAUR (132) - monsters.h line 1323
    name: 'mountain centaur',
    symbol: S_CENTAUR,
    level: 6, speed: 20, ac: 2, mr: 10, align: -3,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 10 },
      { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 6 }
    ],
    weight: 2550, nutrition: 500,
    sound: MS_HUMANOID, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG | M2_GREEDY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_CYAN
  },
  { // PM_BABY_GRAY_DRAGON (133) - monsters.h line 1348
    name: 'baby gray dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_GRAY
  },
  { // PM_BABY_GOLD_DRAGON (134) - monsters.h line 1356
    name: 'baby gold dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: M3_INFRAVISIBLE,
    difficulty: 13, color: HI_GOLD
  },
  { // PM_BABY_SILVER_DRAGON (135) - monsters.h line 1364
    name: 'baby silver dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: DRAGON_SILVER
  },
  { // PM_BABY_RED_DRAGON (136) - monsters.h line 1383
    name: 'baby red dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_FIRE, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: M3_INFRAVISIBLE,
    difficulty: 13, color: CLR_RED
  },
  { // PM_BABY_WHITE_DRAGON (137) - monsters.h line 1391
    name: 'baby white dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_COLD, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_WHITE
  },
  { // PM_BABY_ORANGE_DRAGON (138) - monsters.h line 1399
    name: 'baby orange dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_SLEEP, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_ORANGE
  },
  { // PM_BABY_BLACK_DRAGON (139) - monsters.h line 1407
    name: 'baby black dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_DISINT, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_BLACK
  },
  { // PM_BABY_BLUE_DRAGON (140) - monsters.h line 1415
    name: 'baby blue dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_ELEC, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_BLUE
  },
  { // PM_BABY_GREEN_DRAGON (141) - monsters.h line 1423
    name: 'baby green dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_POIS,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_GREEN
  },
  { // PM_BABY_YELLOW_DRAGON (142) - monsters.h line 1431
    name: 'baby yellow dragon',
    symbol: S_DRAGON,
    level: 12, speed: 9, ac: 2, mr: 10, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_ROAR, size: MZ_HUGE,
    mr1: MR_ACID | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_ACID,
    flags2: M2_HOSTILE | M2_STRONG | M2_GREEDY | M2_JEWELS,
    flags3: 0,
    difficulty: 13, color: CLR_YELLOW
  },
  { // PM_GRAY_DRAGON (143) - monsters.h line 1442
    name: 'gray dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 4,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_MAGM, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_GRAY
  },
  { // PM_GOLD_DRAGON (144) - monsters.h line 1454
    name: 'gold dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 4,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_FIRE, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_FIRE, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 20, color: HI_GOLD
  },
  { // PM_SILVER_DRAGON (145) - monsters.h line 1465
    name: 'silver dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 4,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_COLD, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_COLD, mr2: 0,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: DRAGON_SILVER
  },
  { // PM_RED_DRAGON (146) - monsters.h line 1494
    name: 'red dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: -4,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_FIRE, dice: 6, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 20, color: CLR_RED
  },
  { // PM_WHITE_DRAGON (147) - monsters.h line 1505
    name: 'white dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: -5,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_COLD, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_WHITE
  },
  { // PM_ORANGE_DRAGON (148) - monsters.h line 1516
    name: 'orange dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 5,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_SLEE, dice: 4, sides: 25 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_ORANGE
  },
  { // PM_BLACK_DRAGON (149) - monsters.h line 1528
    name: 'black dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: -6,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_DISN, dice: 1, sides: 255 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_DISINT, mr2: MR_DISINT,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_BLACK
  },
  { // PM_BLUE_DRAGON (150) - monsters.h line 1539
    name: 'blue dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: -7,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_ELEC, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_ELEC, mr2: MR_ELEC,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_BLUE
  },
  { // PM_GREEN_DRAGON (151) - monsters.h line 1550
    name: 'green dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 6,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_DRST, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS | M1_OVIPAROUS
            | M1_CARNIVORE | M1_POIS,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_GREEN
  },
  { // PM_YELLOW_DRAGON (152) - monsters.h line 1562
    name: 'yellow dragon',
    symbol: S_DRAGON,
    level: 15, speed: 9, ac: -1, mr: 20, align: 7,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BREA, damage: AD_ACID, dice: 4, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 4500, nutrition: 1500,
    sound: MS_ROAR, size: MZ_GIGANTIC,
    mr1: MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_SEE_INVIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_ACID,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: 0,
    difficulty: 20, color: CLR_YELLOW
  },
  { // PM_STALKER (153) - monsters.h line 1573
    name: 'stalker',
    symbol: S_ELEMENTAL,
    level: 8, speed: 12, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 3,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 4 }],
    weight: 900, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_FLY | M1_SEE_INVIS,
    flags2: M2_WANDER | M2_STALK | M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISION,
    difficulty: 9, color: CLR_WHITE
  },
  { // PM_AIR_ELEMENTAL (154) - monsters.h line 1582
    name: 'air elemental',
    symbol: S_ELEMENTAL,
    level: 8, speed: 36, ac: 2, mr: 30, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_ENGL, damage: AD_PHYS, dice: 1, sides: 10 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY,
    flags2: M2_STRONG | M2_NEUTER,
    flags3: 0,
    difficulty: 10, color: CLR_CYAN
  },
  { // PM_FIRE_ELEMENTAL (155) - monsters.h line 1591
    name: 'fire elemental',
    symbol: S_ELEMENTAL,
    level: 8, speed: 12, ac: 2, mr: 30, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_FIRE, dice: 3, sides: 6 }, { type: AT_NONE, damage: AD_FIRE, dice: 0, sides: 4 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_FIRE | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_FLY | M1_NOTAKE,
    flags2: M2_STRONG | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 10, color: CLR_YELLOW
  },
  { // PM_EARTH_ELEMENTAL (156) - monsters.h line 1601
    name: 'earth elemental',
    symbol: S_ELEMENTAL,
    level: 8, speed: 6, ac: 2, mr: 30, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 6 }],
    weight: 2500, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_FIRE | MR_COLD | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_WALLWALK | M1_THICK_HIDE,
    flags2: M2_STRONG | M2_NEUTER,
    flags3: 0,
    difficulty: 10, color: CLR_BROWN
  },
  { // PM_WATER_ELEMENTAL (157) - monsters.h line 1610
    name: 'water elemental',
    symbol: S_ELEMENTAL,
    level: 8, speed: 5, ac: 2, mr: 30, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 5, sides: 6 }],
    weight: 2500, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS | M1_BREATHLESS
            | M1_UNSOLID | M1_AMPHIBIOUS | M1_SWIM,
    flags2: M2_STRONG | M2_NEUTER,
    flags3: 0,
    difficulty: 10, color: CLR_BLUE
  },
  { // PM_LICHEN (158) - monsters.h line 1622
    name: 'lichen',
    symbol: S_FUNGUS,
    level: 0, speed: 1, ac: 9, mr: 0, align: 0,
    geno: G_GENO | 4,
    attacks: [{ type: AT_TUCH, damage: AD_STCK, dice: 0, sides: 0 }],
    weight: 20, nutrition: 200,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 1, color: CLR_BRIGHT_GREEN
  },
  { // PM_BROWN_MOLD (159) - monsters.h line 1631
    name: 'brown mold',
    symbol: S_FUNGUS,
    level: 1, speed: 0, ac: 9, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_NONE, damage: AD_COLD, dice: 0, sides: 6 }],
    weight: 50, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_COLD | MR_POISON, mr2: MR_COLD | MR_POISON,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_BROWN
  },
  { // PM_YELLOW_MOLD (160) - monsters.h line 1640
    name: 'yellow mold',
    symbol: S_FUNGUS,
    level: 1, speed: 0, ac: 9, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_NONE, damage: AD_STUN, dice: 0, sides: 4 }],
    weight: 50, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_POIS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_YELLOW
  },
  { // PM_GREEN_MOLD (161) - monsters.h line 1650
    name: 'green mold',
    symbol: S_FUNGUS,
    level: 1, speed: 0, ac: 9, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_NONE, damage: AD_ACID, dice: 0, sides: 4 }],
    weight: 50, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_ACID | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_GREEN
  },
  { // PM_RED_MOLD (162) - monsters.h line 1659
    name: 'red mold',
    symbol: S_FUNGUS,
    level: 1, speed: 0, ac: 9, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_NONE, damage: AD_FIRE, dice: 0, sides: 4 }],
    weight: 50, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_FIRE | MR_POISON, mr2: MR_FIRE | MR_POISON,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS
                                 | M1_NOHEAD | M1_MINDLESS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 2, color: CLR_RED
  },
  { // PM_SHRIEKER (163) - monsters.h line 1667
    name: 'shrieker',
    symbol: S_FUNGUS,
    level: 3, speed: 1, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [],
    weight: 100, nutrition: 100,
    sound: MS_SHRIEK, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 2, color: CLR_MAGENTA
  },
  { // PM_VIOLET_FUNGUS (164) - monsters.h line 1676
    name: 'violet fungus',
    symbol: S_FUNGUS,
    level: 3, speed: 1, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_TUCH, damage: AD_PHYS, dice: 1, sides: 4 }, { type: AT_TUCH, damage: AD_STCK, dice: 0, sides: 0 }],
    weight: 100, nutrition: 100,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_BREATHLESS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD | M1_MINDLESS
            | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 5, color: CLR_MAGENTA
  },
  { // PM_GNOME (165) - monsters.h line 1687
    name: 'gnome',
    symbol: S_GNOME,
    level: 1, speed: 6, ac: 10, mr: 4, align: 0,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 650, nutrition: 100,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_GNOME | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 3, color: CLR_BROWN
  },
  { // PM_GNOME_LEADER (166) - monsters.h line 1694
    name: 'gnome lord',
    symbol: S_GNOME,
    level: 3, speed: 8, ac: 10, mr: 4, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 700, nutrition: 120,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_GNOME | M2_LORD | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 4, color: CLR_BLUE
  },
  { // PM_GNOMISH_WIZARD (167) - monsters.h line 1701
    name: 'gnomish wizard',
    symbol: S_GNOME,
    level: 3, speed: 10, ac: 4, mr: 10, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 700, nutrition: 120,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_GNOME | M2_MAGIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 5, color: HI_ZAP
  },
  { // PM_GNOME_RULER (168) - monsters.h line 1709
    name: 'gnome king',
    symbol: S_GNOME,
    level: 5, speed: 10, ac: 10, mr: 20, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 750, nutrition: 150,
    sound: MS_ORC, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_GNOME | M2_PRINCE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, color: HI_LORD
  },
  { // PM_GIANT (169) - monsters.h line 1721
    name: 'giant',
    symbol: S_GIANT,
    level: 6, speed: 6, ac: 0, mr: 0, align: 2,
    geno: G_GENO | G_NOGEN | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 }],
    weight: 2250, nutrition: 750,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: CLR_RED
  },
  { // PM_STONE_GIANT (170) - monsters.h line 1730
    name: 'stone giant',
    symbol: S_GIANT,
    level: 6, speed: 6, ac: 0, mr: 0, align: 2,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 }],
    weight: 2250, nutrition: 750,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_HILL_GIANT (171) - monsters.h line 1739
    name: 'hill giant',
    symbol: S_GIANT,
    level: 8, speed: 10, ac: 6, mr: 0, align: -2,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 2200, nutrition: 700,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT
            | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 10, color: CLR_CYAN
  },
  { // PM_FIRE_GIANT (172) - monsters.h line 1748
    name: 'fire giant',
    symbol: S_GIANT,
    level: 9, speed: 12, ac: 4, mr: 5, align: 2,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 }],
    weight: 2250, nutrition: 750,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: MR_FIRE, mr2: MR_FIRE,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_YELLOW
  },
  { // PM_FROST_GIANT (173) - monsters.h line 1757
    name: 'frost giant',
    symbol: S_GIANT,
    level: 10, speed: 12, ac: 3, mr: 10, align: -3,
    geno: G_NOHELL | G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 12 }],
    weight: 2250, nutrition: 750,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, color: CLR_WHITE
  },
  { // PM_ETTIN (174) - monsters.h line 1767
    name: 'ettin',
    symbol: S_GIANT,
    level: 10, speed: 12, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 6 }],
    weight: 1700, nutrition: 500,
    sound: MS_GRUNT, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, color: CLR_BROWN
  },
  { // PM_STORM_GIANT (175) - monsters.h line 1776
    name: 'storm giant',
    symbol: S_GIANT,
    level: 16, speed: 12, ac: 3, mr: 10, align: -3,
    geno: G_GENO | G_SGROUP | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 12 }],
    weight: 2250, nutrition: 750,
    sound: MS_BOAST, size: MZ_HUGE,
    mr1: MR_ELEC, mr2: MR_ELEC,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_GIANT | M2_STRONG | M2_ROCKTHROW
                                        | M2_NASTY | M2_COLLECT | M2_JEWELS,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 19, color: CLR_BLUE
  },
  { // PM_TITAN (176) - monsters.h line 1785
    name: 'titan',
    symbol: S_GIANT,
    level: 16, speed: 18, ac: -3, mr: 70, align: 9,
    geno: 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 2300, nutrition: 900,
    sound: MS_SPELL, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG | M2_ROCKTHROW | M2_NASTY | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 20, color: CLR_MAGENTA
  },
  { // PM_MINOTAUR (177) - monsters.h line 1793
    name: 'minotaur',
    symbol: S_GIANT,
    level: 15, speed: 15, ac: 6, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 10 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 10 },
      { type: AT_BUTT, damage: AD_PHYS, dice: 2, sides: 8 }
    ],
    weight: 1500, nutrition: 700,
    sound: MS_MOO, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 17, color: CLR_BROWN
  },
  { // PM_JABBERWOCK (178) - monsters.h line 1814
    name: 'jabberwock',
    symbol: S_JABBERWOCK,
    level: 15, speed: 12, ac: -2, mr: 50, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 10 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 10 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 10 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 10 }
    ],
    weight: 1300, nutrition: 600,
    sound: MS_BURBLE, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_FLY | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 18, color: CLR_ORANGE
  },
  { // PM_KEYSTONE_KOP (179) - monsters.h line 1836
    name: 'Keystone Kop',
    symbol: S_KOP,
    level: 1, speed: 6, ac: 10, mr: 10, align: 9,
    geno: G_GENO | G_LGROUP | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 1450, nutrition: 200,
    sound: MS_ARREST, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID,
    flags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_MALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: CLR_BLUE
  },
  { // PM_KOP_SERGEANT (180) - monsters.h line 1844
    name: 'Kop Sergeant',
    symbol: S_KOP,
    level: 2, speed: 8, ac: 10, mr: 10, align: 10,
    geno: G_GENO | G_SGROUP | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 200,
    sound: MS_ARREST, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID,
    flags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_BLUE
  },
  { // PM_KOP_LIEUTENANT (181) - monsters.h line 1852
    name: 'Kop Lieutenant',
    symbol: S_KOP,
    level: 3, speed: 10, ac: 10, mr: 20, align: 11,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 200,
    sound: MS_ARREST, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID,
    flags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 5, color: CLR_CYAN
  },
  { // PM_KOP_KAPTAIN (182) - monsters.h line 1860
    name: 'Kop Kaptain',
    symbol: S_KOP,
    level: 4, speed: 12, ac: 10, mr: 20, align: 12,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1450, nutrition: 200,
    sound: MS_ARREST, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID,
    flags2: M2_HUMAN | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_MALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: HI_LORD
  },
  { // PM_LICH (183) - monsters.h line 1871
    name: 'lich',
    symbol: S_LICH,
    level: 11, speed: 6, ac: 0, mr: 30, align: -9,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_TUCH, damage: AD_COLD, dice: 1, sides: 10 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1200, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: MR_COLD,
    flags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    flags3: M3_INFRAVISION,
    difficulty: 14, color: CLR_BROWN
  },
  { // PM_DEMILICH (184) - monsters.h line 1879
    name: 'demilich',
    symbol: S_LICH,
    level: 14, speed: 9, ac: -2, mr: 60, align: -12,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_TUCH, damage: AD_COLD, dice: 3, sides: 4 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1200, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: MR_COLD,
    flags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    flags3: M3_INFRAVISION,
    difficulty: 18, color: CLR_RED
  },
  { // PM_MASTER_LICH (185) - monsters.h line 1888
    name: 'master lich',
    symbol: S_LICH,
    level: 17, speed: 9, ac: -4, mr: 90, align: -15,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_TUCH, damage: AD_COLD, dice: 3, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1200, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_COLD | MR_SLEEP | MR_POISON, mr2: MR_FIRE | MR_COLD,
    flags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    flags3: M3_WANTSBOOK | M3_INFRAVISION,
    difficulty: 21, color: HI_LORD
  },
  { // PM_ARCH_LICH (186) - monsters.h line 1897
    name: 'arch-lich',
    symbol: S_LICH,
    level: 25, speed: 9, ac: -6, mr: 90, align: -15,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_TUCH, damage: AD_COLD, dice: 5, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1200, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_COLD | MR_SLEEP | MR_ELEC | MR_POISON, mr2: MR_FIRE | MR_COLD,
    flags1: M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_MAGIC,
    flags3: M3_WANTSBOOK | M3_INFRAVISION,
    difficulty: 29, color: HI_LORD
  },
  { // PM_KOBOLD_MUMMY (187) - monsters.h line 1908
    name: 'kobold mummy',
    symbol: S_MUMMY,
    level: 3, speed: 8, ac: 6, mr: 20, align: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 400, nutrition: 50,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_GNOME_MUMMY (188) - monsters.h line 1916
    name: 'gnome mummy',
    symbol: S_MUMMY,
    level: 4, speed: 10, ac: 6, mr: 20, align: -3,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 650, nutrition: 50,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_GNOME,
    flags3: M3_INFRAVISION,
    difficulty: 5, color: CLR_RED
  },
  { // PM_ORC_MUMMY (189) - monsters.h line 1925
    name: 'orc mummy',
    symbol: S_MUMMY,
    level: 5, speed: 10, ac: 5, mr: 20, align: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 850, nutrition: 75,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_STRONG | M2_ORC | M2_GREEDY | M2_JEWELS,
    flags3: M3_INFRAVISION,
    difficulty: 6, color: CLR_GRAY
  },
  { // PM_DWARF_MUMMY (190) - monsters.h line 1934
    name: 'dwarf mummy',
    symbol: S_MUMMY,
    level: 5, speed: 10, ac: 5, mr: 20, align: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 900, nutrition: 150,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_DWARF | M2_GREEDY | M2_JEWELS,
    flags3: M3_INFRAVISION,
    difficulty: 6, color: CLR_RED
  },
  { // PM_ELF_MUMMY (191) - monsters.h line 1942
    name: 'elf mummy',
    symbol: S_MUMMY,
    level: 6, speed: 12, ac: 4, mr: 30, align: -5,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 175,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_ELF,
    flags3: M3_INFRAVISION,
    difficulty: 7, color: CLR_GREEN
  },
  { // PM_HUMAN_MUMMY (192) - monsters.h line 1951
    name: 'human mummy',
    symbol: S_MUMMY,
    level: 6, speed: 12, ac: 4, mr: 30, align: -5,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 200,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 7, color: CLR_GRAY
  },
  { // PM_ETTIN_MUMMY (193) - monsters.h line 1959
    name: 'ettin mummy',
    symbol: S_MUMMY,
    level: 7, speed: 12, ac: 4, mr: 30, align: -6,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1700, nutrition: 250,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISION,
    difficulty: 8, color: CLR_BLUE
  },
  { // PM_GIANT_MUMMY (194) - monsters.h line 1968
    name: 'giant mummy',
    symbol: S_MUMMY,
    level: 8, speed: 14, ac: 3, mr: 30, align: -7,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 }, { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 }],
    weight: 2050, nutrition: 375,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_HOSTILE | M2_GIANT | M2_STRONG | M2_JEWELS,
    flags3: M3_INFRAVISION,
    difficulty: 10, color: CLR_CYAN
  },
  { // PM_RED_NAGA_HATCHLING (195) - monsters.h line 1979
    name: 'red naga hatchling',
    symbol: S_NAGA,
    level: 3, speed: 10, ac: 6, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 500, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_RED
  },
  { // PM_BLACK_NAGA_HATCHLING (196) - monsters.h line 1989
    name: 'black naga hatchling',
    symbol: S_NAGA,
    level: 3, speed: 10, ac: 6, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 500, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_LARGE,
    mr1: MR_POISON | MR_ACID | MR_STONE, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_ACID | M1_NOTAKE
            | M1_CARNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 4, color: CLR_BLACK
  },
  { // PM_GOLDEN_NAGA_HATCHLING (197) - monsters.h line 1997
    name: 'golden naga hatchling',
    symbol: S_NAGA,
    level: 3, speed: 10, ac: 6, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 500, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 4, color: HI_GOLD
  },
  { // PM_GUARDIAN_NAGA_HATCHLING (198) - monsters.h line 2005
    name: 'guardian naga hatchling',
    symbol: S_NAGA,
    level: 3, speed: 10, ac: 6, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 500, nutrition: 100,
    sound: MS_MUMBLE, size: MZ_LARGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_NOTAKE | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 4, color: CLR_GREEN
  },
  { // PM_RED_NAGA (199) - monsters.h line 2014
    name: 'red naga',
    symbol: S_NAGA,
    level: 6, speed: 12, ac: 4, mr: 0, align: -4,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_BREA, damage: AD_FIRE, dice: 2, sides: 6 }],
    weight: 2600, nutrition: 400,
    sound: MS_MUMBLE, size: MZ_HUGE,
    mr1: MR_FIRE | MR_POISON, mr2: MR_FIRE | MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE
                                 | M1_OVIPAROUS | M1_NOTAKE | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_RED
  },
  { // PM_BLACK_NAGA (200) - monsters.h line 2024
    name: 'black naga',
    symbol: S_NAGA,
    level: 8, speed: 14, ac: 2, mr: 10, align: 4,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_SPIT, damage: AD_ACID, dice: 0, sides: 0 }],
    weight: 2600, nutrition: 400,
    sound: MS_MUMBLE, size: MZ_HUGE,
    mr1: MR_POISON | MR_ACID | MR_STONE, mr2: MR_POISON | MR_ACID | MR_STONE,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_ACID
            | M1_NOTAKE | M1_CARNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 10, color: CLR_BLACK
  },
  { // PM_GOLDEN_NAGA (201) - monsters.h line 2033
    name: 'golden naga',
    symbol: S_NAGA,
    level: 10, speed: 14, ac: 2, mr: 70, align: 5,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 4, sides: 6 }],
    weight: 2600, nutrition: 400,
    sound: MS_MUMBLE, size: MZ_HUGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_NOTAKE
            | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 13, color: HI_GOLD
  },
  { // PM_GUARDIAN_NAGA (202) - monsters.h line 2048
    name: 'guardian naga',
    symbol: S_NAGA,
    level: 12, speed: 16, ac: 0, mr: 50, align: 7,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_SPIT, damage: AD_DRST, dice: 1, sides: 6 },
      { type: AT_BITE, damage: AD_PLYS, dice: 1, sides: 6 },
      { type: AT_TUCH, damage: AD_PHYS, dice: 0, sides: 0 },
      { type: AT_HUGS, damage: AD_WRAP, dice: 2, sides: 4 }
    ],
    weight: 2600, nutrition: 400,
    sound: MS_MUMBLE, size: MZ_HUGE,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_NOLIMBS | M1_SLITHY | M1_THICK_HIDE | M1_OVIPAROUS | M1_POIS
            | M1_NOTAKE | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: 0,
    difficulty: 17, color: CLR_GREEN
  },
  { // PM_OGRE (203) - monsters.h line 2059
    name: 'ogre',
    symbol: S_OGRE,
    level: 5, speed: 10, ac: 5, mr: 0, align: -3,
    geno: G_SGROUP | G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 5 }],
    weight: 1600, nutrition: 500,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_OGRE_LEADER (204) - monsters.h line 2067
    name: 'ogre lord',
    symbol: S_OGRE,
    level: 7, speed: 12, ac: 3, mr: 30, align: -5,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1700, nutrition: 700,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_STRONG | M2_LORD | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, color: CLR_RED
  },
  { // PM_OGRE_TYRANT (205) - monsters.h line 2075
    name: 'ogre king',
    symbol: S_OGRE,
    level: 9, speed: 14, ac: 4, mr: 60, align: -7,
    geno: G_GENO | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 5 }],
    weight: 1700, nutrition: 750,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_STRONG | M2_PRINCE | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: HI_LORD
  },
  { // PM_GRAY_OOZE (206) - monsters.h line 2091
    name: 'gray ooze',
    symbol: S_PUDDING,
    level: 3, speed: 1, ac: 8, mr: 0, align: 0,
    geno: G_GENO | G_NOCORPSE | 2,
    attacks: [{ type: AT_BITE, damage: AD_RUST, dice: 2, sides: 8 }],
    weight: 500, nutrition: 250,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_FIRE | MR_COLD | MR_POISON | MR_ACID | MR_STONE, mr2: MR_FIRE | MR_COLD | MR_POISON,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 4, color: CLR_GRAY
  },
  { // PM_BROWN_PUDDING (207) - monsters.h line 2102
    name: 'brown pudding',
    symbol: S_PUDDING,
    level: 5, speed: 3, ac: 8, mr: 0, align: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_BITE, damage: AD_DCAY, dice: 0, sides: 0 }],
    weight: 500, nutrition: 250,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mr2: MR_COLD | MR_ELEC | MR_POISON,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_GREEN_SLIME (208) - monsters.h line 2112
    name: 'green slime',
    symbol: S_PUDDING,
    level: 6, speed: 6, ac: 6, mr: 0, align: 0,
    geno: G_HELL | G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_TUCH, damage: AD_SLIM, dice: 1, sides: 4 }, { type: AT_NONE, damage: AD_SLIM, dice: 0, sides: 0 }],
    weight: 400, nutrition: 150,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mr2: MR_ACID | MR_STONE,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID | M1_POIS,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 8, color: CLR_GREEN
  },
  { // PM_BLACK_PUDDING (209) - monsters.h line 2123
    name: 'black pudding',
    symbol: S_PUDDING,
    level: 10, speed: 6, ac: 6, mr: 0, align: 0,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_BITE, damage: AD_CORR, dice: 3, sides: 8 }, { type: AT_NONE, damage: AD_CORR, dice: 0, sides: 0 }],
    weight: 900, nutrition: 250,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_COLD | MR_ELEC | MR_POISON | MR_ACID | MR_STONE, mr2: MR_COLD | MR_ELEC | MR_POISON,
    flags1: M1_BREATHLESS | M1_AMORPHOUS | M1_NOEYES | M1_NOLIMBS | M1_NOHEAD
            | M1_MINDLESS | M1_OMNIVORE | M1_ACID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 12, color: CLR_BLACK
  },
  { // PM_QUANTUM_MECHANIC (210) - monsters.h line 2134
    name: 'quantum mechanic',
    symbol: S_QUANTMECH,
    level: 7, speed: 12, ac: 3, mr: 10, align: 0,
    geno: G_GENO | 3,
    attacks: [{ type: AT_CLAW, damage: AD_TLPT, dice: 1, sides: 4 }],
    weight: 1450, nutrition: 20,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_CYAN
  },
  { // PM_GENETIC_ENGINEER (211) - monsters.h line 2143
    name: 'genetic engineer',
    symbol: S_QUANTMECH,
    level: 12, speed: 12, ac: 3, mr: 10, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_CLAW, damage: AD_POLY, dice: 1, sides: 4 }],
    weight: 1450, nutrition: 20,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_POIS | M1_TPORT,
    flags2: M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_GREEN
  },
  { // PM_RUST_MONSTER (212) - monsters.h line 2154
    name: 'rust monster',
    symbol: S_RUSTMONST,
    level: 5, speed: 18, ac: 2, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_TUCH, damage: AD_RUST, dice: 0, sides: 0 },
      { type: AT_TUCH, damage: AD_RUST, dice: 0, sides: 0 },
      { type: AT_NONE, damage: AD_RUST, dice: 0, sides: 0 }
    ],
    weight: 1000, nutrition: 250,
    sound: MS_SILENT, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_ANIMAL | M1_NOHANDS | M1_METALLIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_BROWN
  },
  { // PM_DISENCHANTER (213) - monsters.h line 2161
    name: 'disenchanter',
    symbol: S_RUSTMONST,
    level: 12, speed: 12, ac: -10, mr: 0, align: -3,
    geno: G_HELL | G_GENO | 2,
    attacks: [{ type: AT_CLAW, damage: AD_ENCH, dice: 4, sides: 4 }, { type: AT_NONE, damage: AD_ENCH, dice: 0, sides: 0 }],
    weight: 750, nutrition: 200,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_BLUE
  },
  { // PM_GARTER_SNAKE (214) - monsters.h line 2175
    name: 'garter snake',
    symbol: S_SNAKE,
    level: 1, speed: 8, ac: 8, mr: 0, align: 0,
    geno: G_LGROUP | G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 50, nutrition: 60,
    sound: MS_HISS, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
    flags2: 0,
    flags3: 0,
    difficulty: 3, color: CLR_GREEN
  },
  { // PM_SNAKE (215) - monsters.h line 2184
    name: 'snake',
    symbol: S_SNAKE,
    level: 4, speed: 15, ac: 3, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 1, sides: 6 }],
    weight: 100, nutrition: 80,
    sound: MS_HISS, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_OVIPAROUS | M1_CARNIVORE | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_WATER_MOCCASIN (216) - monsters.h line 2193
    name: 'water moccasin',
    symbol: S_SNAKE,
    level: 4, speed: 15, ac: 3, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN | G_LGROUP,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 1, sides: 6 }],
    weight: 150, nutrition: 80,
    sound: MS_HISS, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 7, color: CLR_RED
  },
  { // PM_PYTHON (217) - monsters.h line 2203
    name: 'python',
    symbol: S_SNAKE,
    level: 6, speed: 3, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_TUCH, damage: AD_PHYS, dice: 0, sides: 0 },
      { type: AT_HUGS, damage: AD_WRAP, dice: 1, sides: 4 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 2, sides: 4 }
    ],
    weight: 250, nutrition: 100,
    sound: MS_HISS, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_CARNIVORE
            | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISION,
    difficulty: 8, color: CLR_MAGENTA
  },
  { // PM_PIT_VIPER (218) - monsters.h line 2212
    name: 'pit viper',
    symbol: S_SNAKE,
    level: 6, speed: 15, ac: 2, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 1, sides: 4 }, { type: AT_BITE, damage: AD_DRST, dice: 1, sides: 4 }],
    weight: 100, nutrition: 60,
    sound: MS_HISS, size: MZ_MEDIUM,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 9, color: CLR_BLUE
  },
  { // PM_COBRA (219) - monsters.h line 2221
    name: 'cobra',
    symbol: S_SNAKE,
    level: 6, speed: 18, ac: 2, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 2, sides: 4 }, { type: AT_SPIT, damage: AD_BLND, dice: 0, sides: 0 }],
    weight: 250, nutrition: 100,
    sound: MS_HISS, size: MZ_MEDIUM,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_CONCEAL | M1_NOLIMBS | M1_ANIMAL | M1_SLITHY | M1_POIS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 10, color: CLR_BLUE
  },
  { // PM_TROLL (220) - monsters.h line 2232
    name: 'troll',
    symbol: S_TROLL,
    level: 7, speed: 12, ac: 4, mr: 0, align: -3,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 2 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 2 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 800, nutrition: 350,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    flags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, color: CLR_BROWN
  },
  { // PM_ICE_TROLL (221) - monsters.h line 2240
    name: 'ice troll',
    symbol: S_TROLL,
    level: 9, speed: 10, ac: 2, mr: 20, align: -3,
    geno: G_NOHELL | G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_COLD, dice: 2, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 1000, nutrition: 300,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    flags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, color: CLR_WHITE
  },
  { // PM_ROCK_TROLL (222) - monsters.h line 2249
    name: 'rock troll',
    symbol: S_TROLL,
    level: 9, speed: 12, ac: 0, mr: 0, align: -3,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 1200, nutrition: 300,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    flags2: M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, color: CLR_CYAN
  },
  { // PM_WATER_TROLL (223) - monsters.h line 2257
    name: 'water troll',
    symbol: S_TROLL,
    level: 11, speed: 14, ac: 4, mr: 40, align: -3,
    geno: G_NOGEN | G_GENO,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 1200, nutrition: 350,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE | M1_SWIM,
    flags2: M2_STRONG | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, color: CLR_BLUE
  },
  { // PM_OLOG_HAI (224) - monsters.h line 2266
    name: 'Olog-hai',
    symbol: S_TROLL,
    level: 13, speed: 12, ac: -4, mr: 0, align: -7,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }
    ],
    weight: 1500, nutrition: 400,
    sound: MS_GRUNT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_REGEN | M1_CARNIVORE,
    flags2: M2_STRONG | M2_STALK | M2_HOSTILE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 16, color: HI_LORD
  },
  { // PM_UMBER_HULK (225) - monsters.h line 2277
    name: 'umber hulk',
    symbol: S_UMBER,
    level: 9, speed: 6, ac: 2, mr: 25, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 5 },
      { type: AT_GAZE, damage: AD_CONF, dice: 0, sides: 0 }
    ],
    weight: 1200, nutrition: 500,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_CARNIVORE,
    flags2: M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: CLR_BROWN
  },
  { // PM_VAMPIRE (226) - monsters.h line 2290
    name: 'vampire',
    symbol: S_VAMPIRE,
    level: 10, speed: 12, ac: 1, mr: 25, align: -8,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_BITE, damage: AD_DRLI, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_VAMPIRE, size: MZ_HUMAN,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_SHAPESHIFTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: CLR_RED
  },
  { // PM_VAMPIRE_LEADER (227) - monsters.h line 2300
    name: 'vampire lord',
    symbol: S_VAMPIRE,
    level: 12, speed: 14, ac: 0, mr: 50, align: -9,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_BITE, damage: AD_DRLI, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_VAMPIRE, size: MZ_HUMAN,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_LORD
            | M2_SHAPESHIFTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_BLUE
  },
  { // PM_VLAD_THE_IMPALER (228) - monsters.h line 2322
    name: 'Vlad the Impaler',
    symbol: S_VAMPIRE,
    level: 28, speed: 26, ac: -6, mr: 80, align: -10,
    geno: G_NOGEN | G_NOCORPSE | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 }, { type: AT_BITE, damage: AD_DRLI, dice: 1, sides: 12 }],
    weight: 1450, nutrition: 400,
    sound: MS_VAMPIRE, size: MZ_HUMAN,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_POIS | M1_REGEN,
    flags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE | M2_SHAPESHIFTER,
    flags3: M3_WAITFORU | M3_WANTSCAND | M3_INFRAVISIBLE,
    difficulty: 32, color: HI_LORD
  },
  { // PM_BARROW_WIGHT (229) - monsters.h line 2334
    name: 'barrow wight',
    symbol: S_WRAITH,
    level: 3, speed: 12, ac: 5, mr: 5, align: -3,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_DRLI, dice: 0, sides: 0 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_TUCH, damage: AD_COLD, dice: 1, sides: 4 }
    ],
    weight: 1200, nutrition: 0,
    sound: MS_SPELL, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_HUMANOID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_COLLECT,
    flags3: 0,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_WRAITH (230) - monsters.h line 2344
    name: 'wraith',
    symbol: S_WRAITH,
    level: 6, speed: 12, ac: 4, mr: 15, align: -6,
    geno: G_GENO | 2,
    attacks: [{ type: AT_TUCH, damage: AD_DRLI, dice: 1, sides: 6 }],
    weight: 0, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_BREATHLESS | M1_FLY | M1_HUMANOID | M1_UNSOLID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    flags3: 0,
    difficulty: 8, color: CLR_BLACK
  },
  { // PM_NAZGUL (231) - monsters.h line 2353
    name: 'Nazgul',
    symbol: S_WRAITH,
    level: 13, speed: 12, ac: 0, mr: 25, align: -17,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_WEAP, damage: AD_DRLI, dice: 1, sides: 4 }, { type: AT_BREA, damage: AD_SLEE, dice: 2, sides: 25 }],
    weight: 1450, nutrition: 0,
    sound: MS_SPELL, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_HUMANOID | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_STRONG | M2_HOSTILE | M2_MALE
            | M2_COLLECT,
    flags3: 0,
    difficulty: 17, color: HI_LORD
  },
  { // PM_XORN (232) - monsters.h line 2366
    name: 'xorn',
    symbol: S_XORN,
    level: 8, speed: 9, ac: -2, mr: 20, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 6 }
    ],
    weight: 1200, nutrition: 700,
    sound: MS_ROAR, size: MZ_MEDIUM,
    mr1: MR_FIRE | MR_COLD | MR_STONE, mr2: MR_STONE,
    flags1: M1_BREATHLESS | M1_WALLWALK | M1_THICK_HIDE | M1_METALLIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 11, color: CLR_BROWN
  },
  { // PM_MONKEY (233) - monsters.h line 2378
    name: 'monkey',
    symbol: S_YETI,
    level: 2, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_CLAW, damage: AD_SITM, dice: 0, sides: 0 }, { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 100, nutrition: 50,
    sound: MS_GROWL, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE,
    flags2: 0,
    flags3: M3_INFRAVISIBLE,
    difficulty: 4, color: CLR_GRAY
  },
  { // PM_APE (234) - monsters.h line 2385
    name: 'ape',
    symbol: S_YETI,
    level: 4, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }
    ],
    weight: 1100, nutrition: 500,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_OWLBEAR (235) - monsters.h line 2393
    name: 'owlbear',
    symbol: S_YETI,
    level: 5, speed: 12, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 3,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 2, sides: 8 }
    ],
    weight: 1700, nutrition: 700,
    sound: MS_ROAR, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_YETI (236) - monsters.h line 2401
    name: 'yeti',
    symbol: S_YETI,
    level: 5, speed: 15, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }
    ],
    weight: 1600, nutrition: 700,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: MR_COLD, mr2: MR_COLD,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_WHITE
  },
  { // PM_CARNIVOROUS_APE (237) - monsters.h line 2409
    name: 'carnivorous ape',
    symbol: S_YETI,
    level: 6, speed: 12, ac: 6, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 1, sides: 8 }
    ],
    weight: 1250, nutrition: 550,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_CARNIVORE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_BLACK
  },
  { // PM_SASQUATCH (238) - monsters.h line 2417
    name: 'sasquatch',
    symbol: S_YETI,
    level: 7, speed: 15, ac: 6, mr: 0, align: 2,
    geno: G_GENO | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 8 }
    ],
    weight: 1550, nutrition: 750,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 9, color: CLR_GRAY
  },
  { // PM_KOBOLD_ZOMBIE (239) - monsters.h line 2428
    name: 'kobold zombie',
    symbol: S_ZOMBIE,
    level: 0, speed: 6, ac: 10, mr: 0, align: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 400, nutrition: 50,
    sound: MS_GROAN, size: MZ_SMALL,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 1, color: CLR_BROWN
  },
  { // PM_GNOME_ZOMBIE (240) - monsters.h line 2436
    name: 'gnome zombie',
    symbol: S_ZOMBIE,
    level: 1, speed: 6, ac: 10, mr: 0, align: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 5 }],
    weight: 650, nutrition: 50,
    sound: MS_GROAN, size: MZ_SMALL,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GNOME,
    flags3: M3_INFRAVISION,
    difficulty: 2, color: CLR_BROWN
  },
  { // PM_ORC_ZOMBIE (241) - monsters.h line 2444
    name: 'orc zombie',
    symbol: S_ZOMBIE,
    level: 2, speed: 6, ac: 9, mr: 0, align: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 850, nutrition: 75,
    sound: MS_GROAN, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ORC,
    flags3: M3_INFRAVISION,
    difficulty: 3, color: CLR_GRAY
  },
  { // PM_DWARF_ZOMBIE (242) - monsters.h line 2452
    name: 'dwarf zombie',
    symbol: S_ZOMBIE,
    level: 2, speed: 6, ac: 9, mr: 0, align: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 900, nutrition: 150,
    sound: MS_GROAN, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_DWARF,
    flags3: M3_INFRAVISION,
    difficulty: 3, color: CLR_RED
  },
  { // PM_ELF_ZOMBIE (243) - monsters.h line 2460
    name: 'elf zombie',
    symbol: S_ZOMBIE,
    level: 3, speed: 6, ac: 9, mr: 0, align: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 7 }],
    weight: 800, nutrition: 175,
    sound: MS_GROAN, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_ELF,
    flags3: M3_INFRAVISION,
    difficulty: 4, color: CLR_GREEN
  },
  { // PM_HUMAN_ZOMBIE (244) - monsters.h line 2469
    name: 'human zombie',
    symbol: S_ZOMBIE,
    level: 4, speed: 6, ac: 8, mr: 0, align: -3,
    geno: G_GENO | G_SGROUP | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 200,
    sound: MS_GROAN, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 5, color: HI_DOMESTIC
  },
  { // PM_ETTIN_ZOMBIE (245) - monsters.h line 2477
    name: 'ettin zombie',
    symbol: S_ZOMBIE,
    level: 6, speed: 8, ac: 6, mr: 0, align: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 10 }, { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 10 }],
    weight: 1700, nutrition: 250,
    sound: MS_GROAN, size: MZ_HUGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISION,
    difficulty: 7, color: CLR_BLUE
  },
  { // PM_GHOUL (246) - monsters.h line 2485
    name: 'ghoul',
    symbol: S_ZOMBIE,
    level: 3, speed: 6, ac: 10, mr: 0, align: -2,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PLYS, dice: 1, sides: 2 }, { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 400, nutrition: 50,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_UNDEAD | M2_WANDER | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 5, color: CLR_BLACK
  },
  { // PM_GIANT_ZOMBIE (247) - monsters.h line 2494
    name: 'giant zombie',
    symbol: S_ZOMBIE,
    level: 8, speed: 8, ac: 6, mr: 0, align: -4,
    geno: G_GENO | G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 2050, nutrition: 375,
    sound: MS_GROAN, size: MZ_HUGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_UNDEAD | M2_STALK | M2_HOSTILE | M2_GIANT | M2_STRONG,
    flags3: M3_INFRAVISION,
    difficulty: 9, color: CLR_CYAN
  },
  { // PM_SKELETON (248) - monsters.h line 2505
    name: 'skeleton',
    symbol: S_ZOMBIE,
    level: 12, speed: 8, ac: 4, mr: 0, align: 0,
    geno: G_NOCORPSE | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_TUCH, damage: AD_SLOW, dice: 1, sides: 6 }],
    weight: 300, nutrition: 5,
    sound: MS_BONES, size: MZ_HUMAN,
    mr1: MR_COLD | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_UNDEAD | M2_WANDER | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_NASTY,
    flags3: M3_INFRAVISION,
    difficulty: 14, color: CLR_WHITE
  },
  { // PM_STRAW_GOLEM (249) - monsters.h line 2515
    name: 'straw golem',
    symbol: S_GOLEM,
    level: 3, speed: 12, ac: 10, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 2 }, { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 400, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 4, color: CLR_YELLOW
  },
  { // PM_PAPER_GOLEM (250) - monsters.h line 2522
    name: 'paper golem',
    symbol: S_GOLEM,
    level: 3, speed: 12, ac: 10, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 400, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 4, color: HI_PAPER
  },
  { // PM_ROPE_GOLEM (251) - monsters.h line 2529
    name: 'rope golem',
    symbol: S_GOLEM,
    level: 4, speed: 9, ac: 8, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 6, sides: 1 }
    ],
    weight: 450, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: CLR_BROWN
  },
  { // PM_GOLD_GOLEM (252) - monsters.h line 2537
    name: 'gold golem',
    symbol: S_GOLEM,
    level: 5, speed: 9, ac: 6, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 3 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 3 }],
    weight: 450, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON | MR_ACID, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 6, color: HI_GOLD
  },
  { // PM_LEATHER_GOLEM (253) - monsters.h line 2544
    name: 'leather golem',
    symbol: S_GOLEM,
    level: 6, speed: 6, ac: 6, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 800, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 7, color: HI_LEATHER
  },
  { // PM_WOOD_GOLEM (254) - monsters.h line 2552
    name: 'wood golem',
    symbol: S_GOLEM,
    level: 7, speed: 3, ac: 4, mr: 0, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 }],
    weight: 900, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_COLD | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_HOSTILE | M2_NEUTER,
    flags3: 0,
    difficulty: 8, color: HI_WOOD
  },
  { // PM_FLESH_GOLEM (255) - monsters.h line 2561
    name: 'flesh golem',
    symbol: S_GOLEM,
    level: 9, speed: 8, ac: 9, mr: 30, align: 0,
    geno: 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 1400, nutrition: 600,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mr2: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 10, color: CLR_RED
  },
  { // PM_CLAY_GOLEM (256) - monsters.h line 2569
    name: 'clay golem',
    symbol: S_GOLEM,
    level: 11, speed: 7, ac: 7, mr: 40, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 10 }],
    weight: 1550, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 12, color: CLR_BROWN
  },
  { // PM_STONE_GOLEM (257) - monsters.h line 2577
    name: 'stone golem',
    symbol: S_GOLEM,
    level: 14, speed: 6, ac: 5, mr: 50, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 8 }],
    weight: 1900, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 15, color: CLR_GRAY
  },
  { // PM_GLASS_GOLEM (258) - monsters.h line 2585
    name: 'glass golem',
    symbol: S_GOLEM,
    level: 16, speed: 6, ac: 1, mr: 50, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }, { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 1800, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_SLEEP | MR_POISON | MR_ACID, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE,
    flags2: M2_HOSTILE | M2_STRONG,
    flags3: 0,
    difficulty: 18, color: CLR_CYAN
  },
  { // PM_IRON_GOLEM (259) - monsters.h line 2594
    name: 'iron golem',
    symbol: S_GOLEM,
    level: 18, speed: 6, ac: 3, mr: 60, align: 0,
    geno: G_NOCORPSE | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_BREA, damage: AD_DRST, dice: 4, sides: 6 }],
    weight: 2000, nutrition: 0,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_BREATHLESS | M1_MINDLESS | M1_HUMANOID | M1_THICK_HIDE | M1_POIS,
    flags2: M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: 0,
    difficulty: 22, color: HI_METAL
  },
  { // PM_HUMAN (260) - monsters.h line 2604
    name: 'human',
    symbol: S_HUMAN,
    level: 0, speed: 12, ac: 10, mr: 0, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 2, color: HI_DOMESTIC
  },
  { // PM_HUMAN_WERERAT (261) - monsters.h line 2617
    name: 'wererat',
    symbol: S_HUMAN,
    level: 2, speed: 12, ac: 10, mr: 10, align: -7,
    geno: 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_WERE, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: CLR_BROWN
  },
  { // PM_HUMAN_WEREJACKAL (262) - monsters.h line 2626
    name: 'werejackal',
    symbol: S_HUMAN,
    level: 2, speed: 12, ac: 10, mr: 10, align: -7,
    geno: 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_WERE, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 3, color: CLR_RED
  },
  { // PM_HUMAN_WEREWOLF (263) - monsters.h line 2635
    name: 'werewolf',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 20, align: -7,
    geno: 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_WERE, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_REGEN | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_WERE | M2_HOSTILE | M2_HUMAN | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 6, color: CLR_ORANGE
  },
  { // PM_ELF (264) - monsters.h line 2645
    name: 'elf',
    symbol: S_HUMAN,
    level: 0, speed: 12, ac: 10, mr: 2, align: -3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_ELF | M2_COLLECT,
    flags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 1, color: HI_DOMESTIC
  },
  { // PM_WOODLAND_ELF (265) - monsters.h line 2653
    name: 'Woodland-elf',
    symbol: S_HUMAN,
    level: 4, speed: 12, ac: 10, mr: 10, align: -5,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_ELF | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 6, color: CLR_GREEN
  },
  { // PM_GREEN_ELF (266) - monsters.h line 2661
    name: 'Green-elf',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: -6,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_ELF | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 7, color: CLR_BRIGHT_GREEN
  },
  { // PM_GREY_ELF (267) - monsters.h line 2669
    name: 'Grey-elf',
    symbol: S_HUMAN,
    level: 6, speed: 12, ac: 10, mr: 10, align: -7,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_ELF | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_ELF_NOBLE (268) - monsters.h line 2678
    name: 'elf-lord',
    symbol: S_HUMAN,
    level: 8, speed: 12, ac: 10, mr: 20, align: -9,
    geno: G_GENO | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_ELF | M2_STRONG | M2_LORD | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_BRIGHT_BLUE
  },
  { // PM_ELVEN_MONARCH (269) - monsters.h line 2687
    name: 'Elvenking',
    symbol: S_HUMAN,
    level: 9, speed: 12, ac: 10, mr: 25, align: -10,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 800, nutrition: 350,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: MR_SLEEP,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS,
    flags2: M2_ELF | M2_STRONG | M2_PRINCE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: HI_LORD
  },
  { // PM_DOPPELGANGER (270) - monsters.h line 2697
    name: 'doppelganger',
    symbol: S_HUMAN,
    level: 9, speed: 12, ac: 5, mr: 20, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 12 }],
    weight: 1450, nutrition: 400,
    sound: MS_IMITATE, size: MZ_HUMAN,
    mr1: MR_SLEEP, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT
            | M2_SHAPESHIFTER,
    flags3: M3_INFRAVISIBLE,
    difficulty: 11, color: HI_DOMESTIC
  },
  { // PM_SHOPKEEPER (271) - monsters.h line 2716
    name: 'shopkeeper',
    symbol: S_HUMAN,
    level: 12, speed: 16, ac: 0, mr: 50, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SELL, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
            | M2_STRONG | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 15, color: HI_DOMESTIC
  },
  { // PM_GUARD (272) - monsters.h line 2726
    name: 'guard',
    symbol: S_HUMAN,
    level: 12, speed: 12, ac: 10, mr: 40, align: 10,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARD, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_BLUE
  },
  { // PM_PRISONER (273) - monsters.h line 2736
    name: 'prisoner',
    symbol: S_HUMAN,
    level: 12, speed: 12, ac: 10, mr: 0, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_DJINNI, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_CLOSE,
    difficulty: 14, color: HI_DOMESTIC
  },
  { // PM_ORACLE (274) - monsters.h line 2745
    name: 'Oracle',
    symbol: S_HUMAN,
    level: 12, speed: 0, ac: 0, mr: 50, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_NONE, damage: AD_MAGM, dice: 0, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_ORACLE, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_FEMALE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 13, color: HI_ZAP
  },
  { // PM_ALIGNED_CLERIC (275) - monsters.h line 2757
    name: 'priest',
    symbol: S_HUMAN,
    level: 12, speed: 12, ac: 10, mr: 50, align: 0,
    geno: G_NOGEN,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 0, sides: 0 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_PRIEST, size: MZ_HUMAN,
    mr1: MR_ELEC, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_LORD | M2_PEACEFUL | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 15, color: CLR_WHITE
  },
  { // PM_HIGH_CLERIC (276) - monsters.h line 2771
    name: 'high priest',
    symbol: S_HUMAN,
    level: 25, speed: 15, ac: 7, mr: 70, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_KICK, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_PRIEST, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MINION | M2_PRINCE | M2_NASTY | M2_COLLECT
            | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 30, color: CLR_WHITE
  },
  { // PM_SOLDIER (277) - monsters.h line 2780
    name: 'soldier',
    symbol: S_HUMAN,
    level: 6, speed: 10, ac: 10, mr: 0, align: -2,
    geno: G_SGROUP | G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_SERGEANT (278) - monsters.h line 2789
    name: 'sergeant',
    symbol: S_HUMAN,
    level: 8, speed: 10, ac: 10, mr: 5, align: -3,
    geno: G_SGROUP | G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 10, color: CLR_RED
  },
  { // PM_NURSE (279) - monsters.h line 2797
    name: 'nurse',
    symbol: S_HUMAN,
    level: 11, speed: 6, ac: 0, mr: 0, align: 0,
    geno: G_GENO | 3,
    attacks: [{ type: AT_CLAW, damage: AD_HEAL, dice: 2, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_NURSE, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 13, color: HI_DOMESTIC
  },
  { // PM_LIEUTENANT (280) - monsters.h line 2806
    name: 'lieutenant',
    symbol: S_HUMAN,
    level: 10, speed: 10, ac: 10, mr: 15, align: -4,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: CLR_GREEN
  },
  { // PM_CAPTAIN (281) - monsters.h line 2815
    name: 'captain',
    symbol: S_HUMAN,
    level: 12, speed: 10, ac: 10, mr: 15, align: -5,
    geno: G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 14, color: CLR_BLUE
  },
  { // PM_WATCHMAN (282) - monsters.h line 2824
    name: 'watchman',
    symbol: S_HUMAN,
    level: 6, speed: 10, ac: 10, mr: 0, align: -2,
    geno: G_SGROUP | G_NOGEN | G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_WATCH_CAPTAIN (283) - monsters.h line 2833
    name: 'watch captain',
    symbol: S_HUMAN,
    level: 10, speed: 10, ac: 10, mr: 15, align: -4,
    geno: G_NOGEN | G_GENO | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SOLDIER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MERC | M2_STALK
                                       | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: CLR_GREEN
  },
  { // PM_MEDUSA (284) - monsters.h line 2846
    name: 'Medusa',
    symbol: S_HUMAN,
    level: 20, speed: 12, ac: 2, mr: 50, align: -15,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 },
      { type: AT_GAZE, damage: AD_STON, dice: 0, sides: 0 },
      { type: AT_BITE, damage: AD_DRST, dice: 1, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_HISS, size: MZ_LARGE,
    mr1: MR_POISON | MR_STONE, mr2: MR_POISON | MR_STONE,
    flags1: M1_FLY | M1_SWIM | M1_AMPHIBIOUS | M1_HUMANOID | M1_POIS | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HOSTILE | M2_STRONG | M2_PNAME | M2_FEMALE,
    flags3: M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 25, color: CLR_BRIGHT_GREEN
  },
  { // PM_WIZARD_OF_YENDOR (285) - monsters.h line 2858
    name: 'Wizard of Yendor',
    symbol: S_HUMAN,
    level: 30, speed: 12, ac: -8, mr: 100, align: -128,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 12 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1450, nutrition: 400,
    sound: MS_CUSS, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: MR_FIRE | MR_POISON,
    flags1: M1_FLY | M1_BREATHLESS | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS
            | M1_TPORT | M1_TPORT_CNTRL | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_PRINCE
            | M2_MALE | M2_MAGIC,
    flags3: M3_COVETOUS | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 34, color: HI_OVERLORD
  },
  { // PM_CROESUS (286) - monsters.h line 2869
    name: 'Croesus',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 40, align: 15,
    geno: G_UNIQ | G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARD, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_PNAME | M2_PRINCE | M2_MALE | M2_GREEDY | M2_JEWELS
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 22, color: HI_LORD
  },
  { // PM_GHOST (287) - monsters.h line 2896
    name: 'ghost',
    symbol: S_GHOST,
    level: 10, speed: 3, ac: -5, mr: 50, align: -5,
    geno: G_NOCORPSE | G_NOGEN,
    attacks: [{ type: AT_TUCH, damage: AD_PHYS, dice: 1, sides: 1 }],
    weight: 1450, nutrition: 0,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID,
    flags2: M2_NOPOLY | M2_UNDEAD | M2_STALK | M2_HOSTILE,
    flags3: M3_INFRAVISION,
    difficulty: 12, color: CLR_GRAY
  },
  { // PM_SHADE (288) - monsters.h line 2907
    name: 'shade',
    symbol: S_GHOST,
    level: 12, speed: 10, ac: 10, mr: 0, align: 0,
    geno: G_NOCORPSE | G_NOGEN,
    attacks: [{ type: AT_TUCH, damage: AD_PLYS, dice: 2, sides: 6 }, { type: AT_TUCH, damage: AD_SLOW, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 0,
    sound: MS_WAIL, size: MZ_HUMAN,
    mr1: MR_COLD | MR_DISINT | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_BREATHLESS | M1_WALLWALK | M1_HUMANOID | M1_UNSOLID
            | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_UNDEAD | M2_WANDER | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISION,
    difficulty: 14, color: CLR_BLACK
  },
  { // PM_WATER_DEMON (289) - monsters.h line 2919
    name: 'water demon',
    symbol: S_DEMON,
    level: 8, speed: 12, ac: -4, mr: 30, align: -7,
    geno: G_NOCORPSE | G_NOGEN,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_DJINNI, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS | M1_SWIM,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_BLUE
  },
  { // PM_AMOROUS_DEMON (290) - monsters.h line 2938
    name: 'incubus',
    symbol: S_DEMON,
    level: 6, speed: 12, ac: 0, mr: 70, align: -9,
    geno: G_NOCORPSE | 1,
    attacks: [
      { type: AT_BITE, damage: AD_SSEX, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SEDUCE, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_FLY | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 8, color: CLR_GRAY
  },
  { // PM_HORNED_DEVIL (291) - monsters.h line 2947
    name: 'horned devil',
    symbol: S_DEMON,
    level: 6, speed: 9, ac: -5, mr: 50, align: 11,
    geno: G_HELL | G_NOCORPSE | 2,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 3 },
      { type: AT_STNG, damage: AD_PHYS, dice: 1, sides: 3 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_POIS | M1_THICK_HIDE,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 9, color: CLR_BROWN
  },
  { // PM_ERINYS (292) - monsters.h line 2961
    name: 'erinys',
    symbol: S_DEMON,
    level: 7, speed: 12, ac: 2, mr: 30, align: 10,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_DRST, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_STRONG | M2_NASTY | M2_FEMALE
            | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 10, color: CLR_RED
  },
  { // PM_BARBED_DEVIL (293) - monsters.h line 2969
    name: 'barbed devil',
    symbol: S_DEMON,
    level: 8, speed: 12, ac: 0, mr: 35, align: 8,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_STCK, dice: 2, sides: 4 },
      { type: AT_STNG, damage: AD_PHYS, dice: 3, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_POIS | M1_THICK_HIDE,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_RED
  },
  { // PM_MARILITH (294) - monsters.h line 2979
    name: 'marilith',
    symbol: S_DEMON,
    level: 7, speed: 12, ac: -6, mr: 80, align: -12,
    geno: G_HELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_CUSS, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_SLITHY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_FEMALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_RED
  },
  { // PM_VROCK (295) - monsters.h line 2988
    name: 'vrock',
    symbol: S_DEMON,
    level: 8, speed: 12, ac: 0, mr: 50, align: -9,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 11, color: CLR_GREEN
  },
  { // PM_HEZROU (296) - monsters.h line 2996
    name: 'hezrou',
    symbol: S_DEMON,
    level: 9, speed: 6, ac: -2, mr: 55, align: -10,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 3 },
      { type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 12, color: CLR_GREEN
  },
  { // PM_BONE_DEVIL (297) - monsters.h line 3004
    name: 'bone devil',
    symbol: S_DEMON,
    level: 9, speed: 15, ac: -1, mr: 40, align: -9,
    geno: G_HELL | G_NOCORPSE | G_SGROUP | 2,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 4 }, { type: AT_STNG, damage: AD_DRST, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 13, color: CLR_GRAY
  },
  { // PM_ICE_DEVIL (298) - monsters.h line 3014
    name: 'ice devil',
    symbol: S_DEMON,
    level: 11, speed: 6, ac: -4, mr: 55, align: -12,
    geno: G_HELL | G_NOCORPSE | 2,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_STNG, damage: AD_COLD, dice: 3, sides: 4 },
      { type: AT_TUCH, damage: AD_SLOW, dice: 1, sides: 1 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_COLD | MR_POISON, mr2: 0,
    flags1: M1_SEE_INVIS | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, color: CLR_WHITE
  },
  { // PM_NALFESHNEE (299) - monsters.h line 3023
    name: 'nalfeshnee',
    symbol: S_DEMON,
    level: 11, speed: 9, ac: -1, mr: 65, align: -11,
    geno: G_HELL | G_NOCORPSE | 1,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 4 },
      { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_SPELL, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, color: CLR_RED
  },
  { // PM_PIT_FIEND (300) - monsters.h line 3032
    name: 'pit fiend',
    symbol: S_DEMON,
    level: 13, speed: 6, ac: -3, mr: 65, align: -13,
    geno: G_HELL | G_NOCORPSE | 2,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 2 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 2 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 2, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_GROWL, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_SEE_INVIS | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 16, color: CLR_RED
  },
  { // PM_SANDESTIN (301) - monsters.h line 3042
    name: 'sandestin',
    symbol: S_DEMON,
    level: 13, speed: 12, ac: 4, mr: 60, align: -5,
    geno: G_HELL | G_NOCORPSE | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 400,
    sound: MS_CUSS, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID,
    flags2: M2_NOPOLY | M2_STALK | M2_STRONG | M2_COLLECT | M2_SHAPESHIFTER,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 15, color: CLR_GRAY
  },
  { // PM_BALROG (302) - monsters.h line 3051
    name: 'balrog',
    symbol: S_DEMON,
    level: 16, speed: 5, ac: -2, mr: 75, align: -14,
    geno: G_HELL | G_NOCORPSE | 1,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 8, sides: 4 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 20, color: CLR_RED
  },
  { // PM_JUIBLEX (303) - monsters.h line 3066
    name: 'Juiblex',
    symbol: S_DEMON,
    level: 50, speed: 3, ac: -7, mr: 65, align: -15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_ENGL, damage: AD_DISE, dice: 4, sides: 10 }, { type: AT_SPIT, damage: AD_ACID, dice: 3, sides: 6 }],
    weight: 1500, nutrition: 0,
    sound: MS_GURGLE, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON | MR_ACID | MR_STONE, mr2: 0,
    flags1: M1_AMPHIBIOUS | M1_AMORPHOUS | M1_NOHEAD | M1_FLY | M1_SEE_INVIS
            | M1_ACID | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE,
    flags3: M3_WAITFORU | M3_WANTSAMUL | M3_INFRAVISION,
    difficulty: 26, color: CLR_BRIGHT_GREEN
  },
  { // PM_YEENOGHU (304) - monsters.h line 3077
    name: 'Yeenoghu',
    symbol: S_DEMON,
    level: 56, speed: 18, ac: -5, mr: 80, align: -15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_WEAP, damage: AD_CONF, dice: 2, sides: 8 },
      { type: AT_CLAW, damage: AD_PLYS, dice: 1, sides: 6 },
      { type: AT_MAGC, damage: AD_MAGM, dice: 2, sides: 6 }
    ],
    weight: 900, nutrition: 500,
    sound: MS_ORC, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_LORD | M2_MALE | M2_COLLECT,
    flags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 31, color: HI_LORD
  },
  { // PM_ORCUS (305) - monsters.h line 3089
    name: 'Orcus',
    symbol: S_DEMON,
    level: 66, speed: 9, ac: -6, mr: 85, align: -20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 4 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 8, sides: 6 },
      { type: AT_STNG, damage: AD_DRST, dice: 2, sides: 4 }
    ],
    weight: 1500, nutrition: 500,
    sound: MS_ORC, size: MZ_HUGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
    flags3: M3_WAITFORU | M3_WANTSBOOK | M3_WANTSAMUL | M3_INFRAVISIBLE
            | M3_INFRAVISION,
    difficulty: 36, color: HI_LORD
  },
  { // PM_GERYON (306) - monsters.h line 3099
    name: 'Geryon',
    symbol: S_DEMON,
    level: 72, speed: 3, ac: -3, mr: 75, align: 15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 3, sides: 6 },
      { type: AT_STNG, damage: AD_DRST, dice: 2, sides: 4 }
    ],
    weight: 1500, nutrition: 500,
    sound: MS_BRIBE, size: MZ_HUGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS | M1_SLITHY,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    flags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 36, color: HI_LORD
  },
  { // PM_DISPATER (307) - monsters.h line 3109
    name: 'Dispater',
    symbol: S_DEMON,
    level: 78, speed: 15, ac: -2, mr: 80, align: 15,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 6, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_BRIBE, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS | M1_HUMANOID,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE | M2_COLLECT,
    flags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 40, color: HI_LORD
  },
  { // PM_BAALZEBUB (308) - monsters.h line 3119
    name: 'Baalzebub',
    symbol: S_DEMON,
    level: 89, speed: 9, ac: -5, mr: 85, align: 20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_BITE, damage: AD_DRST, dice: 2, sides: 6 }, { type: AT_GAZE, damage: AD_STUN, dice: 2, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_BRIBE, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    flags3: M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 45, color: HI_LORD
  },
  { // PM_ASMODEUS (309) - monsters.h line 3129
    name: 'Asmodeus',
    symbol: S_DEMON,
    level: 105, speed: 12, ac: -7, mr: 90, align: 20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 4 }, { type: AT_MAGC, damage: AD_COLD, dice: 6, sides: 6 }],
    weight: 1500, nutrition: 500,
    sound: MS_BRIBE, size: MZ_HUGE,
    mr1: MR_FIRE | MR_COLD | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_HUMANOID | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG
            | M2_NASTY | M2_PRINCE | M2_MALE,
    flags3: M3_WANTSAMUL | M3_WAITFORU | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 53, color: HI_LORD
  },
  { // PM_DEMOGORGON (310) - monsters.h line 3140
    name: 'Demogorgon',
    symbol: S_DEMON,
    level: 106, speed: 15, ac: -8, mr: 95, align: -20,
    geno: G_HELL | G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_MAGC, damage: AD_SPEL, dice: 8, sides: 6 },
      { type: AT_STNG, damage: AD_DRLI, dice: 1, sides: 4 },
      { type: AT_CLAW, damage: AD_DISE, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_DISE, dice: 1, sides: 6 }
    ],
    weight: 1500, nutrition: 500,
    sound: MS_GROWL, size: MZ_HUGE,
    mr1: MR_FIRE | MR_POISON, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_NOHANDS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_PNAME | M2_NASTY
            | M2_PRINCE | M2_MALE,
    flags3: M3_WANTSAMUL | M3_INFRAVISIBLE | M3_INFRAVISION,
    difficulty: 57, color: HI_LORD
  },
  { // PM_DEATH (311) - monsters.h line 3153
    name: 'Death',
    symbol: S_DEMON,
    level: 30, speed: 12, ac: -5, mr: 100, align: 0,
    geno: G_UNIQ | G_NOGEN,
    attacks: [{ type: AT_TUCH, damage: AD_DETH, dice: 8, sides: 8 }, { type: AT_TUCH, damage: AD_DETH, dice: 8, sides: 8 }],
    weight: 1450, nutrition: 1,
    sound: MS_RIDER, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    flags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, color: HI_OVERLORD
  },
  { // PM_PESTILENCE (312) - monsters.h line 3163
    name: 'Pestilence',
    symbol: S_DEMON,
    level: 30, speed: 12, ac: -5, mr: 100, align: 0,
    geno: G_UNIQ | G_NOGEN,
    attacks: [{ type: AT_TUCH, damage: AD_PEST, dice: 8, sides: 8 }, { type: AT_TUCH, damage: AD_PEST, dice: 8, sides: 8 }],
    weight: 1450, nutrition: 1,
    sound: MS_RIDER, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    flags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, color: HI_OVERLORD
  },
  { // PM_FAMINE (313) - monsters.h line 3173
    name: 'Famine',
    symbol: S_DEMON,
    level: 30, speed: 12, ac: -5, mr: 100, align: 0,
    geno: G_UNIQ | G_NOGEN,
    attacks: [{ type: AT_TUCH, damage: AD_FAMN, dice: 8, sides: 8 }, { type: AT_TUCH, damage: AD_FAMN, dice: 8, sides: 8 }],
    weight: 1450, nutrition: 1,
    sound: MS_RIDER, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_COLD | MR_ELEC | MR_SLEEP | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_HUMANOID | M1_REGEN | M1_SEE_INVIS | M1_TPORT_CNTRL,
    flags2: M2_NOPOLY | M2_STALK | M2_HOSTILE | M2_PNAME | M2_STRONG | M2_NASTY,
    flags3: M3_INFRAVISIBLE | M3_INFRAVISION | M3_DISPLACES,
    difficulty: 34, color: HI_OVERLORD
  },
  { // PM_DJINNI (314) - monsters.h line 3194
    name: 'djinni',
    symbol: S_DEMON,
    level: 7, speed: 12, ac: 4, mr: 30, align: 0,
    geno: G_NOGEN | G_NOCORPSE,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 }],
    weight: 1500, nutrition: 400,
    sound: MS_DJINNI, size: MZ_HUMAN,
    mr1: MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_FLY | M1_POIS,
    flags2: M2_NOPOLY | M2_STALK | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: CLR_YELLOW
  },
  { // PM_JELLYFISH (315) - monsters.h line 3212
    name: 'jellyfish',
    symbol: S_EEL,
    level: 3, speed: 3, ac: 6, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_STNG, damage: AD_DRST, dice: 3, sides: 3 }],
    weight: 80, nutrition: 20,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: MR_POISON, mr2: MR_POISON,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_NOLIMBS | M1_NOHEAD
            | M1_NOTAKE | M1_POIS,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 5, color: CLR_BLUE
  },
  { // PM_PIRANHA (316) - monsters.h line 3220
    name: 'piranha',
    symbol: S_EEL,
    level: 5, speed: 18, ac: 4, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN | G_SGROUP,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }, { type: AT_BITE, damage: AD_PHYS, dice: 2, sides: 6 }],
    weight: 60, nutrition: 30,
    sound: MS_SILENT, size: MZ_SMALL,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 7, color: CLR_RED
  },
  { // PM_SHARK (317) - monsters.h line 3229
    name: 'shark',
    symbol: S_EEL,
    level: 7, speed: 12, ac: 2, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 5, sides: 6 }],
    weight: 500, nutrition: 350,
    sound: MS_SILENT, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_THICK_HIDE | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 9, color: CLR_GRAY
  },
  { // PM_GIANT_EEL (318) - monsters.h line 3238
    name: 'giant eel',
    symbol: S_EEL,
    level: 5, speed: 9, ac: -1, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 3, sides: 6 }, { type: AT_TUCH, damage: AD_WRAP, dice: 0, sides: 0 }],
    weight: 200, nutrition: 250,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: CLR_CYAN
  },
  { // PM_ELECTRIC_EEL (319) - monsters.h line 3247
    name: 'electric eel',
    symbol: S_EEL,
    level: 7, speed: 10, ac: -3, mr: 0, align: 0,
    geno: G_GENO | G_NOGEN,
    attacks: [{ type: AT_BITE, damage: AD_ELEC, dice: 4, sides: 6 }, { type: AT_TUCH, damage: AD_WRAP, dice: 0, sides: 0 }],
    weight: 200, nutrition: 250,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: MR_ELEC, mr2: MR_ELEC,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_SLITHY | M1_NOLIMBS
            | M1_CARNIVORE | M1_OVIPAROUS | M1_NOTAKE,
    flags2: M2_HOSTILE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 10, color: CLR_BRIGHT_BLUE
  },
  { // PM_KRAKEN (320) - monsters.h line 3256
    name: 'kraken',
    symbol: S_EEL,
    level: 20, speed: 3, ac: 6, mr: 0, align: -3,
    geno: G_GENO | G_NOGEN,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_HUGS, damage: AD_WRAP, dice: 2, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 5, sides: 4 }
    ],
    weight: 1800, nutrition: 1000,
    sound: MS_SILENT, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_HOSTILE | M2_STRONG,
    flags3: M3_INFRAVISIBLE,
    difficulty: 22, color: CLR_RED
  },
  { // PM_NEWT (321) - monsters.h line 3267
    name: 'newt',
    symbol: S_LIZARD,
    level: 0, speed: 6, ac: 8, mr: 0, align: 0,
    geno: G_GENO | 5,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 2 }],
    weight: 10, nutrition: 20,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 1, color: CLR_YELLOW
  },
  { // PM_GECKO (322) - monsters.h line 3274
    name: 'gecko',
    symbol: S_LIZARD,
    level: 1, speed: 6, ac: 8, mr: 0, align: 0,
    geno: G_GENO | 5,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 3 }],
    weight: 10, nutrition: 20,
    sound: MS_SQEEK, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 2, color: CLR_GREEN
  },
  { // PM_IGUANA (323) - monsters.h line 3281
    name: 'iguana',
    symbol: S_LIZARD,
    level: 2, speed: 6, ac: 7, mr: 0, align: 0,
    geno: G_GENO | 5,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 30, nutrition: 30,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 3, color: CLR_BROWN
  },
  { // PM_BABY_CROCODILE (324) - monsters.h line 3289
    name: 'baby crocodile',
    symbol: S_LIZARD,
    level: 3, speed: 6, ac: 7, mr: 0, align: 0,
    geno: G_GENO,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 200, nutrition: 200,
    sound: MS_CHIRP, size: MZ_MEDIUM,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 4, color: CLR_BROWN
  },
  { // PM_LIZARD (325) - monsters.h line 3298
    name: 'lizard',
    symbol: S_LIZARD,
    level: 5, speed: 6, ac: 6, mr: 10, align: 0,
    geno: G_GENO | 5,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 10, nutrition: 40,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: MR_STONE, mr2: MR_STONE,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_HOSTILE,
    flags3: 0,
    difficulty: 6, color: CLR_GREEN
  },
  { // PM_CHAMELEON (326) - monsters.h line 3306
    name: 'chameleon',
    symbol: S_LIZARD,
    level: 6, speed: 5, ac: 6, mr: 10, align: 0,
    geno: G_GENO | 2,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 2 }],
    weight: 100, nutrition: 100,
    sound: MS_SILENT, size: MZ_TINY,
    mr1: 0, mr2: 0,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_HOSTILE | M2_SHAPESHIFTER,
    flags3: 0,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_CROCODILE (327) - monsters.h line 3315
    name: 'crocodile',
    symbol: S_LIZARD,
    level: 6, speed: 9, ac: 5, mr: 0, align: 0,
    geno: G_GENO | 1,
    attacks: [{ type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 2 }, { type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 12 }],
    weight: 1450, nutrition: 400,
    sound: MS_BELLOW, size: MZ_LARGE,
    mr1: 0, mr2: 0,
    flags1: M1_SWIM | M1_AMPHIBIOUS | M1_ANIMAL | M1_THICK_HIDE | M1_NOHANDS
            | M1_OVIPAROUS | M1_CARNIVORE,
    flags2: M2_STRONG | M2_HOSTILE,
    flags3: 0,
    difficulty: 7, color: CLR_BROWN
  },
  { // PM_SALAMANDER (328) - monsters.h line 3324
    name: 'salamander',
    symbol: S_LIZARD,
    level: 8, speed: 12, ac: -1, mr: 0, align: -9,
    geno: G_HELL | 1,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_TUCH, damage: AD_FIRE, dice: 1, sides: 6 },
      { type: AT_HUGS, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_HUGS, damage: AD_FIRE, dice: 3, sides: 6 }
    ],
    weight: 1500, nutrition: 400,
    sound: MS_MUMBLE, size: MZ_HUMAN,
    mr1: MR_SLEEP | MR_FIRE, mr2: MR_FIRE,
    flags1: M1_HUMANOID | M1_SLITHY | M1_THICK_HIDE | M1_POIS,
    flags2: M2_STALK | M2_HOSTILE | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: CLR_ORANGE
  },
  { // PM_LONG_WORM_TAIL (329) - monsters.h line 3334
    name: 'long worm tail',
    symbol: S_WORM_TAIL,
    level: 0, speed: 0, ac: 0, mr: 0, align: 0,
    geno: G_NOGEN | G_NOCORPSE | G_UNIQ,
    attacks: [],
    weight: 0, nutrition: 0,
    sound: 0, size: 0,
    mr1: 0, mr2: 0,
    flags1: 0,
    flags2: M2_NOPOLY,
    flags3: 0,
    difficulty: 1, color: CLR_BROWN
  },
  { // PM_ARCHEOLOGIST (330) - monsters.h line 3352
    name: 'archeologist',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_TUNNEL | M1_NEEDPICK | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_BARBARIAN (331) - monsters.h line 3360
    name: 'barbarian',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_CAVE_DWELLER (332) - monsters.h line 3369
    name: 'caveman',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 0, align: 1,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_HEALER (333) - monsters.h line 3377
    name: 'healer',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_KNIGHT (334) - monsters.h line 3385
    name: 'knight',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_MONK (335) - monsters.h line 3394
    name: 'monk',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 2, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_CLAW, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_KICK, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_HERBIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 11, color: HI_DOMESTIC
  },
  { // PM_CLERIC (336) - monsters.h line 3404
    name: 'priest',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 2, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_RANGER (337) - monsters.h line 3412
    name: 'ranger',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 2, align: -3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_ROGUE (338) - monsters.h line 3421
    name: 'rogue',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: -3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_GREEDY | M2_JEWELS | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_SAMURAI (339) - monsters.h line 3429
    name: 'samurai',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_TOURIST (340) - monsters.h line 3437
    name: 'tourist',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_VALKYRIE (341) - monsters.h line 3451
    name: 'valkyrie',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 1, align: 1,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: MR_COLD, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_FEMALE | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_WIZARD (342) - monsters.h line 3460
    name: 'wizard',
    symbol: S_HUMAN,
    level: 10, speed: 12, ac: 10, mr: 3, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 12, color: HI_DOMESTIC
  },
  { // PM_LORD_CARNARVON (343) - monsters.h line 3472
    name: 'Lord Carnarvon',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_MAGC, damage: AD_SPEL, dice: 4, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_PELIAS (344) - monsters.h line 3481
    name: 'Pelias',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_SHAMAN_KARNOV (345) - monsters.h line 3490
    name: 'Shaman Karnov',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_HIPPOCRATES (346) - monsters.h line 3523
    name: 'Hippocrates',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 3, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 3, sides: 8 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 26, color: HI_LORD
  },
  { // PM_KING_ARTHUR (347) - monsters.h line 3532
    name: 'King Arthur',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_GRAND_MASTER (348) - monsters.h line 3543
    name: 'Grand Master',
    symbol: S_HUMAN,
    level: 25, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_KICK, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS | M1_HERBIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_NASTY
            | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 30, color: CLR_BLACK
  },
  { // PM_ARCH_PRIEST (349) - monsters.h line 3554
    name: 'Arch Priest',
    symbol: S_HUMAN,
    level: 25, speed: 15, ac: 7, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_KICK, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 2, sides: 8 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: MR_FIRE | MR_ELEC | MR_SLEEP | MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_COLLECT
            | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 30, color: CLR_WHITE
  },
  { // PM_ORION (350) - monsters.h line 3563
    name: 'Orion',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_MAGC, damage: AD_SPEL, dice: 4, sides: 8 }],
    weight: 2200, nutrition: 700,
    sound: MS_LEADER, size: MZ_HUGE,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE | M1_SEE_INVIS | M1_SWIM | M1_AMPHIBIOUS,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_MASTER_OF_THIEVES (351) - monsters.h line 3575
    name: 'Master of Thieves',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: -20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_MALE | M2_GREEDY
            | M2_JEWELS | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_LORD_SATO (352) - monsters.h line 3583
    name: 'Lord Sato',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_TWOFLOWER (353) - monsters.h line 3592
    name: 'Twoflower',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 10, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_PEACEFUL | M2_STRONG | M2_MALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 22, color: HI_DOMESTIC
  },
  { // PM_NORN (354) - monsters.h line 3603
    name: 'Norn',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }, { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 }],
    weight: 1800, nutrition: 550,
    sound: MS_LEADER, size: MZ_HUGE,
    mr1: MR_COLD, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_FEMALE
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 24, color: HI_LORD
  },
  { // PM_NEFERET_THE_GREEN (355) - monsters.h line 3612
    name: 'Neferet the Green',
    symbol: S_HUMAN,
    level: 20, speed: 15, ac: 0, mr: 90, align: 0,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 10 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 2, sides: 8 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 2, sides: 8 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_LEADER, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_FEMALE | M2_PNAME | M2_PEACEFUL | M2_STRONG
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_CLOSE | M3_INFRAVISIBLE,
    difficulty: 25, color: CLR_GREEN
  },
  { // PM_MINION_OF_HUHETOTL (356) - monsters.h line 3626
    name: 'Minion of Huhetotl',
    symbol: S_DEMON,
    level: 16, speed: 12, ac: -2, mr: 75, align: -14,
    geno: G_NOCORPSE | G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 8, sides: 4 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 6 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_STALK | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_COLLECT,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, color: CLR_ORANGE
  },
  { // PM_THOTH_AMON (357) - monsters.h line 3637
    name: 'Thoth Amon',
    symbol: S_HUMAN,
    level: 16, speed: 12, ac: 0, mr: 10, align: -14,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 1, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_STRONG | M2_MALE | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 22, color: HI_LORD
  },
  { // PM_CHROMATIC_DRAGON (358) - monsters.h line 3656
    name: 'Chromatic Dragon',
    symbol: S_DRAGON,
    level: 16, speed: 12, ac: 0, mr: 30, align: -14,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_BREA, damage: AD_RBRE, dice: 6, sides: 6 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 8 },
      { type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 8 },
      { type: AT_STNG, damage: AD_PHYS, dice: 1, sides: 6 }
    ],
    weight: 4500, nutrition: 1700,
    sound: MS_NEMESIS, size: MZ_GIGANTIC,
    mr1: MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE, mr2: MR_FIRE | MR_COLD | MR_SLEEP | MR_DISINT | MR_ELEC | MR_POISON
            | MR_ACID | MR_STONE,
    flags1: M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_HOSTILE | M2_FEMALE | M2_STALK | M2_STRONG | M2_NASTY
            | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, color: HI_LORD
  },
  { // PM_CYCLOPS (359) - monsters.h line 3678
    name: 'Cyclops',
    symbol: S_GIANT,
    level: 18, speed: 12, ac: 0, mr: 0, align: -15,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 8 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 8 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 1900, nutrition: 700,
    sound: MS_NEMESIS, size: MZ_HUGE,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_GIANT | M2_STRONG | M2_ROCKTHROW | M2_STALK
            | M2_HOSTILE | M2_NASTY | M2_MALE | M2_JEWELS | M2_COLLECT,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, color: CLR_GRAY
  },
  { // PM_IXOTH (360) - monsters.h line 3690
    name: 'Ixoth',
    symbol: S_DRAGON,
    level: 15, speed: 12, ac: -1, mr: 20, align: -14,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_BREA, damage: AD_FIRE, dice: 8, sides: 6 },
      { type: AT_BITE, damage: AD_PHYS, dice: 4, sides: 8 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 4 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 4 }
    ],
    weight: 4500, nutrition: 1600,
    sound: MS_NEMESIS, size: MZ_GIGANTIC,
    mr1: MR_FIRE | MR_STONE, mr2: MR_FIRE,
    flags1: M1_FLY | M1_THICK_HIDE | M1_NOHANDS | M1_CARNIVORE | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_NASTY
            | M2_STALK | M2_GREEDY | M2_JEWELS | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 22, color: CLR_RED
  },
  { // PM_MASTER_KAEN (361) - monsters.h line 3701
    name: 'Master Kaen',
    symbol: S_HUMAN,
    level: 25, speed: 12, ac: -10, mr: 10, align: -20,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 16, sides: 2 },
      { type: AT_CLAW, damage: AD_PHYS, dice: 16, sides: 2 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 1, sides: 4 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_POISON | MR_STONE, mr2: MR_POISON,
    flags1: M1_HUMANOID | M1_HERBIVORE | M1_SEE_INVIS,
    flags2: M2_NOPOLY | M2_HUMAN | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_NASTY | M2_STALK | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 31, color: HI_LORD
  },
  { // PM_NALZOK (362) - monsters.h line 3712
    name: 'Nalzok',
    symbol: S_DEMON,
    level: 16, speed: 12, ac: -2, mr: 85, align: -127,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 8, sides: 4 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 4, sides: 6 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_LARGE,
    mr1: MR_FIRE | MR_POISON | MR_STONE, mr2: 0,
    flags1: M1_FLY | M1_SEE_INVIS | M1_POIS,
    flags2: M2_NOPOLY | M2_DEMON | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG
            | M2_STALK | M2_NASTY | M2_COLLECT,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 23, color: CLR_ORANGE
  },
  { // PM_SCORPIUS (363) - monsters.h line 3722
    name: 'Scorpius',
    symbol: S_SPIDER,
    level: 15, speed: 12, ac: 10, mr: 0, align: -15,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 },
      { type: AT_STNG, damage: AD_DISE, dice: 1, sides: 4 }
    ],
    weight: 750, nutrition: 350,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_POISON | MR_STONE, mr2: MR_POISON,
    flags1: M1_ANIMAL | M1_NOHANDS | M1_OVIPAROUS | M1_POIS | M1_CARNIVORE,
    flags2: M2_NOPOLY | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU,
    difficulty: 17, color: HI_LORD
  },
  { // PM_MASTER_ASSASSIN (364) - monsters.h line 3732
    name: 'Master Assassin',
    symbol: S_HUMAN,
    level: 15, speed: 12, ac: 0, mr: 30, align: 18,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_DRST, dice: 2, sides: 6 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 8 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_MALE | M2_HOSTILE | M2_STALK
            | M2_NASTY | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 20, color: HI_LORD
  },
  { // PM_ASHIKAGA_TAKAUJI (365) - monsters.h line 3745
    name: 'Ashikaga Takauji',
    symbol: S_HUMAN,
    level: 15, speed: 12, ac: 0, mr: 40, align: -13,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 6 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PNAME | M2_HOSTILE | M2_STRONG | M2_STALK
            | M2_NASTY | M2_MALE | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 19, color: HI_LORD
  },
  { // PM_LORD_SURTUR (366) - monsters.h line 3758
    name: 'Lord Surtur',
    symbol: S_GIANT,
    level: 15, speed: 12, ac: 2, mr: 50, align: 12,
    geno: G_NOGEN | G_UNIQ,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 10 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 2, sides: 6 }
    ],
    weight: 2250, nutrition: 850,
    sound: MS_NEMESIS, size: MZ_HUGE,
    mr1: MR_FIRE | MR_STONE, mr2: MR_FIRE,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_GIANT | M2_MALE | M2_PNAME | M2_HOSTILE | M2_STALK
            | M2_STRONG | M2_NASTY | M2_ROCKTHROW | M2_JEWELS | M2_COLLECT,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 19, color: HI_LORD
  },
  { // PM_DARK_ONE (367) - monsters.h line 3769
    name: 'Dark One',
    symbol: S_HUMAN,
    level: 15, speed: 12, ac: 0, mr: 80, align: -10,
    geno: G_NOGEN | G_UNIQ | G_NOCORPSE,
    attacks: [
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 },
      { type: AT_CLAW, damage: AD_SAMU, dice: 1, sides: 4 },
      { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_NEMESIS, size: MZ_HUMAN,
    mr1: MR_STONE, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_STRONG | M2_HOSTILE | M2_STALK | M2_NASTY
            | M2_COLLECT | M2_MAGIC,
    flags3: M3_WANTSARTI | M3_WAITFORU | M3_INFRAVISIBLE,
    difficulty: 20, color: CLR_BLACK
  },
  { // PM_STUDENT (368) - monsters.h line 3781
    name: 'student',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_TUNNEL | M1_NEEDPICK | M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_CHIEFTAIN (369) - monsters.h line 3790
    name: 'chieftain',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_NEANDERTHAL (370) - monsters.h line 3799
    name: 'neanderthal',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 1,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 2, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_ATTENDANT (371) - monsters.h line 3821
    name: 'attendant',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: MR_POISON, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_PAGE (372) - monsters.h line 3830
    name: 'page',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_ABBOT (373) - monsters.h line 3839
    name: 'abbot',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 20, align: 0,
    geno: G_NOGEN,
    attacks: [
      { type: AT_CLAW, damage: AD_PHYS, dice: 8, sides: 2 },
      { type: AT_KICK, damage: AD_STUN, dice: 3, sides: 2 },
      { type: AT_MAGC, damage: AD_CLRC, dice: 0, sides: 0 }
    ],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_HERBIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: HI_DOMESTIC
  },
  { // PM_ACOLYTE (374) - monsters.h line 3848
    name: 'acolyte',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 20, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_MAGC, damage: AD_CLRC, dice: 0, sides: 0 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: HI_DOMESTIC
  },
  { // PM_HUNTER (375) - monsters.h line 3857
    name: 'hunter',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: -7,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 4 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_SEE_INVIS | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISION | M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_THUG (376) - monsters.h line 3866
    name: 'thug',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: -3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_GREEDY | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_NINJA (377) - monsters.h line 3875
    name: 'ninja',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_HUMANOID, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_HOSTILE | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_ROSHI (378) - monsters.h line 3884
    name: 'roshi',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 3,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL | M2_STRONG | M2_COLLECT,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_GUIDE (379) - monsters.h line 3893
    name: 'guide',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 20, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: HI_DOMESTIC
  },
  { // PM_WARRIOR (380) - monsters.h line 3905
    name: 'warrior',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 10, align: 1,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }, { type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 8 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_FEMALE,
    flags3: M3_INFRAVISIBLE,
    difficulty: 7, color: HI_DOMESTIC
  },
  { // PM_APPRENTICE (381) - monsters.h line 3914
    name: 'apprentice',
    symbol: S_HUMAN,
    level: 5, speed: 12, ac: 10, mr: 30, align: 0,
    geno: G_NOGEN,
    attacks: [{ type: AT_WEAP, damage: AD_PHYS, dice: 1, sides: 6 }, { type: AT_MAGC, damage: AD_SPEL, dice: 0, sides: 0 }],
    weight: 1450, nutrition: 400,
    sound: MS_GUARDIAN, size: MZ_HUMAN,
    mr1: 0, mr2: 0,
    flags1: M1_HUMANOID | M1_OMNIVORE,
    flags2: M2_NOPOLY | M2_HUMAN | M2_PEACEFUL
                                       | M2_STRONG | M2_COLLECT | M2_MAGIC,
    flags3: M3_INFRAVISIBLE,
    difficulty: 8, color: HI_DOMESTIC
  },
];

// End of monsters.js
