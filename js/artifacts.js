// artifacts.js — artifact constants and data
// Auto-imported from nethack-c/include/artilist.h
// Regenerate with: python3 scripts/generators/gen_artifacts.py
// AUTO-IMPORT-BEGIN: ARTIFACTS
// artifacts.js — Auto-generated from nethack-c/include/artilist.h
// DO NOT EDIT — regenerate with: python3 scripts/generators/gen_artifacts.py

// ── SPFX_ flags (artifact special effects) ──
export const SPFX_NONE = 0x00000000;
export const SPFX_NOGEN = 0x00000001;
export const SPFX_RESTR = 0x00000002;
export const SPFX_INTEL = 0x00000004;
export const SPFX_SPEAK = 0x00000008;
export const SPFX_SEEK = 0x00000010;
export const SPFX_WARN = 0x00000020;
export const SPFX_ATTK = 0x00000040;
export const SPFX_DEFN = 0x00000080;
export const SPFX_DRLI = 0x00000100;
export const SPFX_SEARCH = 0x00000200;
export const SPFX_BEHEAD = 0x00000400;
export const SPFX_HALRES = 0x00000800;
export const SPFX_ESP = 0x00001000;
export const SPFX_STLTH = 0x00002000;
export const SPFX_REGEN = 0x00004000;
export const SPFX_EREGEN = 0x00008000;
export const SPFX_HSPDAM = 0x00010000;
export const SPFX_HPHDAM = 0x00020000;
export const SPFX_TCTRL = 0x00040000;
export const SPFX_LUCK = 0x00080000;
export const SPFX_DMONS = 0x00100000;
export const SPFX_DCLAS = 0x00200000;
export const SPFX_DFLAG1 = 0x00400000;
export const SPFX_DFLAG2 = 0x00800000;
export const SPFX_DALIGN = 0x01000000;
export const SPFX_DBONUS = 0x01F00000;
export const SPFX_XRAY = 0x02000000;
export const SPFX_REFLECT = 0x04000000;
export const SPFX_PROTECT = 0x08000000;

// ── Invoke property types ──
export const TAMING = 64;
export const HEALING = 65;
export const ENERGY_BOOST = 66;
export const UNTRAP = 67;
export const CHARGE_OBJ = 68;
export const LEV_TELE = 69;
export const CREATE_PORTAL = 70;
export const ENLIGHTENING = 71;
export const CREATE_AMMO = 72;
export const BANISH = 73;
export const FLING_POISON = 74;
export const FIRESTORM = 75;
export const SNOWSTORM = 76;
export const BLINDING_RAY = 77;

// ── ART_ artifact index constants ──
export const ART_NONARTIFACT = 0;
export const ART_EXCALIBUR = 1;
export const ART_STORMBRINGER = 2;
export const ART_MJOLLNIR = 3;
export const ART_CLEAVER = 4;
export const ART_GRIMTOOTH = 5;
export const ART_ORCRIST = 6;
export const ART_STING = 7;
export const ART_MAGICBANE = 8;
export const ART_FROST_BRAND = 9;
export const ART_FIRE_BRAND = 10;
export const ART_DRAGONBANE = 11;
export const ART_DEMONBANE = 12;
export const ART_WEREBANE = 13;
export const ART_GRAYSWANDIR = 14;
export const ART_GIANTSLAYER = 15;
export const ART_OGRESMASHER = 16;
export const ART_TROLLSBANE = 17;
export const ART_VORPAL_BLADE = 18;
export const ART_SNICKERSNEE = 19;
export const ART_SUNSWORD = 20;
export const ART_ORB_OF_DETECTION = 21;
export const ART_HEART_OF_AHRIMAN = 22;
export const ART_SCEPTRE_OF_MIGHT = 23;
export const ART_STAFF_OF_AESCULAPIUS = 24;
export const ART_MAGIC_MIRROR_OF_MERLIN = 25;
export const ART_EYES_OF_THE_OVERWORLD = 26;
export const ART_MITRE_OF_HOLINESS = 27;
export const ART_LONGBOW_OF_DIANA = 28;
export const ART_MASTER_KEY_OF_THIEVERY = 29;
export const ART_TSURUGI_OF_MURAMASA = 30;
export const ART_YENDORIAN_EXPRESS_CARD = 31;
export const ART_ORB_OF_FATE = 32;
export const ART_EYE_OF_THE_AETHIOPICA = 33;
export const AFTER_LAST_ARTIFACT = 35;
export const NROFARTIFACTS = 34;

// ── Artifact data table ──
// Fields: otyp, name, spfx, cspfx, mtype, attk, defn, cary,
//         inv_prop, alignment, role, race, gen_spe, gift_value, cost, acolor
export const artilist = [
  {otyp:0,name:"",spfx:0x00000000,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:0,gift_value:0,cost:0,acolor:8}, // [0] dummy
  {otyp:54,name:"Excalibur",spfx:0x00000297,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:10},defn:{aatyp:0,adtyp:15,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:1,role:335,race:-1,gen_spe:0,gift_value:10,cost:4000,acolor:8}, // [1] Excalibur
  {otyp:58,name:"Stormbringer",spfx:0x000001C6,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:15,damn:5,damd:2},defn:{aatyp:0,adtyp:15,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-1,role:-1,race:-1,gen_spe:0,gift_value:9,cost:8000,acolor:8}, // [2] Stormbringer
  {otyp:76,name:"Mjollnir",spfx:0x00000042,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:6,damn:5,damd:24},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:0,role:342,race:-1,gen_spe:0,gift_value:8,cost:4000,acolor:8}, // [3] Mjollnir
  {otyp:45,name:"Cleaver",spfx:0x00000002,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:3,damd:6},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:0,role:332,race:-1,gen_spe:0,gift_value:8,cost:1500,acolor:8}, // [4] Cleaver
  {otyp:36,name:"Grimtooth",spfx:0x00800022,cspfx:0x00000000,mtype:16,attk:{aatyp:0,adtyp:0,damn:2,damd:6},defn:{aatyp:0,adtyp:7,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:74,alignment:-1,role:-1,race:72,gen_spe:0,gift_value:5,cost:1200,acolor:1}, // [5] Grimtooth
  {otyp:53,name:"Orcrist",spfx:0x00800020,cspfx:0x00000000,mtype:128,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-1,role:-1,race:264,gen_spe:3,gift_value:4,cost:2000,acolor:12}, // [6] Orcrist
  {otyp:35,name:"Sting",spfx:0x00800020,cspfx:0x00000000,mtype:128,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-1,role:-1,race:264,gen_spe:3,gift_value:1,cost:800,acolor:12}, // [7] Sting
  {otyp:38,name:"Magicbane",spfx:0x000000C2,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:12,damn:3,damd:4},defn:{aatyp:0,adtyp:1,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:0,role:343,race:-1,gen_spe:0,gift_value:7,cost:3500,acolor:8}, // [8] Magicbane
  {otyp:54,name:"Frost Brand",spfx:0x000000C2,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:3,damn:5,damd:0},defn:{aatyp:0,adtyp:3,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:76,alignment:-128,role:-1,race:-1,gen_spe:0,gift_value:9,cost:3000,acolor:8}, // [9] Frost Brand
  {otyp:54,name:"Fire Brand",spfx:0x000000C2,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:2,damn:5,damd:0},defn:{aatyp:0,adtyp:2,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:75,alignment:-128,role:-1,race:-1,gen_spe:0,gift_value:5,cost:3000,acolor:8}, // [10] Fire Brand
  {otyp:52,name:"Dragonbane",spfx:0x04200002,cspfx:0x00000000,mtype:30,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:2,gift_value:5,cost:500,acolor:8}, // [11] Dragonbane
  {otyp:74,name:"Demonbane",spfx:0x00800002,cspfx:0x00000000,mtype:256,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:73,alignment:1,role:337,race:-1,gen_spe:1,gift_value:3,cost:2500,acolor:8}, // [12] Demonbane
  {otyp:51,name:"Werebane",spfx:0x00800002,cspfx:0x00000000,mtype:4,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:29,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:1,gift_value:4,cost:1500,acolor:8}, // [13] Werebane
  {otyp:51,name:"Grayswandir",spfx:0x00000802,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:1,role:-1,race:-1,gen_spe:0,gift_value:10,cost:8000,acolor:8}, // [14] Grayswandir
  {otyp:54,name:"Giantslayer",spfx:0x00800002,cspfx:0x00000000,mtype:8192,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:0,role:-1,race:-1,gen_spe:2,gift_value:4,cost:200,acolor:8}, // [15] Giantslayer
  {otyp:76,name:"Ogresmasher",spfx:0x00200002,cspfx:0x00000000,mtype:41,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:2,gift_value:1,cost:200,acolor:8}, // [16] Ogresmasher
  {otyp:75,name:"Trollsbane",spfx:0x00204002,cspfx:0x00000000,mtype:46,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:2,gift_value:1,cost:200,acolor:8}, // [17] Trollsbane
  {otyp:54,name:"Vorpal Blade",spfx:0x00000402,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:1},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:0,role:-1,race:-1,gen_spe:1,gift_value:5,cost:4000,acolor:8}, // [18] Vorpal Blade
  {otyp:56,name:"Snickersnee",spfx:0x00000002,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:8},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:1,role:340,race:-1,gen_spe:0,gift_value:8,cost:1200,acolor:8}, // [19] Snickersnee
  {otyp:54,name:"Sunsword",spfx:0x00800002,cspfx:0x00000000,mtype:2,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:11,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:77,alignment:1,role:-1,race:-1,gen_spe:0,gift_value:6,cost:1500,acolor:8}, // [20] Sunsword
  {otyp:229,name:"The Orb of Detection",spfx:0x00000007,cspfx:0x00011000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:1,damn:0,damd:0},inv_prop:33,alignment:1,role:331,race:-1,gen_spe:0,gift_value:12,cost:2500,acolor:8}, // [21] The Orb of Detection
  {otyp:467,name:"The Heart of Ahriman",spfx:0x00000007,cspfx:0x00002000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:38,alignment:0,role:332,race:-1,gen_spe:0,gift_value:12,cost:2500,acolor:8}, // [22] The Heart of Ahriman
  {otyp:73,name:"The Sceptre of Might",spfx:0x01000007,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:1,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:41,alignment:1,role:333,race:-1,gen_spe:0,gift_value:12,cost:2500,acolor:8}, // [23] The Sceptre of Might
  {otyp:79,name:"The Staff of Aesculapius",spfx:0x00004147,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:15,damn:0,damd:0},defn:{aatyp:0,adtyp:15,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:65,alignment:0,role:334,race:-1,gen_spe:0,gift_value:12,cost:5000,acolor:8}, // [24] The Staff of Aesculapius
  {otyp:228,name:"The Magic Mirror of Merlin",spfx:0x0000000F,cspfx:0x00001000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:1,damn:0,damd:0},inv_prop:0,alignment:1,role:335,race:-1,gen_spe:0,gift_value:12,cost:1500,acolor:8}, // [25] The Magic Mirror of Merlin
  {otyp:230,name:"The Eyes of the Overworld",spfx:0x02000007,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:1,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:71,alignment:0,role:336,race:-1,gen_spe:0,gift_value:12,cost:2500,acolor:8}, // [26] The Eyes of the Overworld
  {otyp:96,name:"The Mitre of Holiness",spfx:0x08800007,cspfx:0x00000000,mtype:2,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:2,damn:0,damd:0},inv_prop:66,alignment:1,role:337,race:-1,gen_spe:0,gift_value:12,cost:2000,acolor:8}, // [27] The Mitre of Holiness
  {otyp:83,name:"The Longbow of Diana",spfx:0x04000007,cspfx:0x00001000,mtype:0,attk:{aatyp:0,adtyp:0,damn:5,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:72,alignment:-1,role:338,race:-1,gen_spe:0,gift_value:12,cost:4000,acolor:8}, // [28] The Longbow of Diana
  {otyp:219,name:"The Master Key of Thievery",spfx:0x0000000F,cspfx:0x00060020,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:67,alignment:-1,role:339,race:-1,gen_spe:0,gift_value:12,cost:3500,acolor:8}, // [29] The Master Key of Thievery
  {otyp:57,name:"The Tsurugi of Muramasa",spfx:0x08080407,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:8},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:1,role:340,race:-1,gen_spe:0,gift_value:12,cost:4500,acolor:8}, // [30] The Tsurugi of Muramasa
  {otyp:221,name:"The Platinum Yendorian Express Card",spfx:0x00000087,cspfx:0x00011000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:1,damn:0,damd:0},inv_prop:68,alignment:0,role:341,race:-1,gen_spe:0,gift_value:12,cost:7000,acolor:8}, // [31] The Platinum Yendorian Express Card
  {otyp:229,name:"The Orb of Fate",spfx:0x00080007,cspfx:0x00030020,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:69,alignment:0,role:342,race:-1,gen_spe:0,gift_value:12,cost:3500,acolor:8}, // [32] The Orb of Fate
  {otyp:199,name:"The Eye of the Aethiopica",spfx:0x00000007,cspfx:0x00018000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:1,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:70,alignment:0,role:343,race:-1,gen_spe:0,gift_value:12,cost:4000,acolor:8}, // [33] The Eye of the Aethiopica
  {otyp:0,name:"",spfx:0x00000000,cspfx:0x00000000,mtype:0,attk:{aatyp:0,adtyp:0,damn:0,damd:0},defn:{aatyp:0,adtyp:0,damn:0,damd:0},cary:{aatyp:0,adtyp:0,damn:0,damd:0},inv_prop:0,alignment:-128,role:-1,race:-1,gen_spe:0,gift_value:0,cost:0,acolor:8}, // [34] dummy
];
// AUTO-IMPORT-END: ARTIFACTS
