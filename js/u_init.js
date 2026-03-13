// u_init.js -- Post-level initialization: pet, inventory, attributes, welcome
// Faithful port of the post-mklev portion of C's newgame()
// C ref: allmain.c newgame() — after mklev() and u_on_upstairs()
//
// Sequence:
//   1. makedog()               — pet creation + placement
//   2. u_init_inventory_attrs() — inventory + attribute rolling
//      a. u_init_role()  → ini_inv(role_table) + conditional extras
//      b. u_init_race()  → race-specific items (instruments, food, subs)
//      c. init_attr(75)  → distribute 75 pts via weighted rnd_attr
//      d. vary_init_attr → 1/20 chance per attr of rn2(7)-2 variation
//      e. u_init_carry_attr_boost — no RNG
//   3. com_pager("legacy")     — NHCORE_START_NEW_GAME lua shuffle
//   4. welcome(TRUE)           — rndencode + seer_turn

import { rn2, rnd, rn1, rne, d, getRngLog } from './rng.js';
import { newhp, newpw } from './exper.js';
import { initrack } from './monmove.js';
import { resetPlineState } from './pline.js';
import { resetNoisesState } from './mhitm.js';
import { resetHungerState } from './eat.js';
import { skill_init_from_inventory } from './weapon.js';
import { skill_based_spellbook_id } from './spell.js';
import { withMakemonPlayerOverride } from './makemon.js';
import { initLevelGeneration, mklev } from './dungeon.js';
import { setCheckpointCaptureEnabled, clearLevelCheckpoints } from './sp_lev.js';
import { getArrivalPosition } from './do.js';
import { mksobj, mkobj, weight, setStartupInventoryMode, Is_container } from './mkobj.js';
import { NUM_ATTRS,
         A_STR, A_CON,
         RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC } from './const.js';
import { PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
         PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER, PM_ROGUE,
         PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD } from './monsters.js';
import {
    // Weapons
    LONG_SWORD, LANCE, SPEAR, DAGGER, SHORT_SWORD, AXE, BULLWHIP,
    TWO_HANDED_SWORD, BATTLE_AXE, CLUB, SLING, KATANA, YUMI, YA,
    BOW, ARROW, DART, MACE, QUARTERSTAFF, SCALPEL, SHURIKEN,
    // Armor
    RING_MAIL, HELMET, SMALL_SHIELD, LEATHER_GLOVES, LEATHER_JACKET,
    FEDORA, LEATHER_ARMOR, ROBE, CLOAK_OF_DISPLACEMENT,
    CLOAK_OF_MAGIC_RESISTANCE, SPLINT_MAIL, HAWAIIAN_SHIRT,
    // Food
    APPLE, CARROT, FOOD_RATION, CRAM_RATION, ORANGE, FORTUNE_COOKIE,
    CLOVE_OF_GARLIC, SPRIG_OF_WOLFSBANE,
    // Potions
    POT_HEALING, POT_EXTRA_HEALING, POT_SICKNESS, POT_WATER, POT_OIL, POT_FULL_HEALING,
    // Scrolls
    SCR_MAGIC_MAPPING,
    // Spellbooks
    SPE_HEALING, SPE_EXTRA_HEALING, SPE_STONE_TO_FLESH, SPE_LIGHT,
    SPE_FORCE_BOLT, SPE_PROTECTION, SPE_CONFUSE_MONSTER,
    // Wands
    WAN_SLEEP,
    // Tools
    SADDLE, OIL_LAMP, PICK_AXE, TINNING_KIT, STETHOSCOPE,
    EXPENSIVE_CAMERA, CREDIT_CARD, TIN_OPENER, LOCK_PICK,
    BLINDFOLD, MAGIC_MARKER, LEASH, TOWEL, SACK,
    // Gems
    TOUCHSTONE, FLINT, ROCK,
    // Race-specific items (Elf)
    ELVEN_DAGGER, ELVEN_SPEAR, ELVEN_SHORT_SWORD, ELVEN_BOW, ELVEN_ARROW,
    ELVEN_LEATHER_HELM, ELVEN_CLOAK, LEMBAS_WAFER,
    // Race-specific items (Dwarf)
    DWARVISH_SPEAR, DWARVISH_SHORT_SWORD, DWARVISH_IRON_HELM,
    // Race-specific items (Gnome)
    CROSSBOW, CROSSBOW_BOLT,
    // Race-specific items (Orc)
    ORCISH_DAGGER, ORCISH_SPEAR, ORCISH_SHORT_SWORD, ORCISH_BOW,
    ORCISH_ARROW, ORCISH_HELM, ORCISH_SHIELD, ORCISH_RING_MAIL,
    ORCISH_CHAIN_MAIL, TRIPE_RATION,
    // Instruments (Elf Cleric/Wizard)
    WOODEN_FLUTE, TOOLED_HORN, WOODEN_HARP, BELL, BUGLE, LEATHER_DRUM,
    CHAIN_MAIL,
    // Classes
    WEAPON_CLASS, ARMOR_CLASS, FOOD_CLASS, TOOL_CLASS,
    RING_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS,
    GOLD_PIECE,
    // Armor categories
    ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS, ARM_CLOAK, ARM_SHIRT,
    // Filter exclusions
    WAN_WISHING, WAN_NOTHING, RIN_LEVITATION, RIN_AGGRAVATE_MONSTER,
    RIN_HUNGER, RIN_POISON_RESISTANCE, POT_HALLUCINATION, POT_ACID, SCR_AMNESIA, SCR_FIRE,
    SCR_BLANK_PAPER, SPE_BLANK_PAPER, SPE_NOVEL, SCR_ENCHANT_WEAPON, CORNUTHAUM, DUNCE_CAP,
    // Polymorph nocreate tracking
    WAN_POLYMORPH, RIN_POLYMORPH, RIN_POLYMORPH_CONTROL,
    POT_POLYMORPH, SPE_POLYMORPH,
    // Object data for level/charged checks
    objectData,
    STATUE,
} from './objects.js';
import { roles, races } from './player.js';
import { discoverObject } from './o_init.js';
import { mons } from './monsters.js';
import { makedog, mon_arrive } from './dog.js';
import { MON_ARRIVE_WITH_YOU,
         P_DAGGER, P_POLEARMS, P_SPEAR, P_BOW, P_CROSSBOW,
         WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP } from './const.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
    W_WEP, W_SWAPWEP, W_QUIVER,
} from './const.js';
export { mon_arrive } from './dog.js';
export { MON_ARRIVE_WITH_YOU } from './const.js';
import { bimanual } from './pray.js';
import { set_moreluck } from './attrib.js';

// ========================================================================
// Inventory Creation
// ========================================================================

// C ref: u_init.c struct trobj constants
const UNDEF_BLESS = -1;  // C: UNDEF_BLESS = 2; keep mksobj default
const UNDEF_SPE = 127;   // C: UNDEF_SPE = '\177'; keep mksobj default
const UNDEF_TYP = 0;     // C: UNDEF_TYP = 0; random from class

// Module-level nocreate state — persists across ini_inv calls within u_init_role
let nocreate = 0, nocreate2 = 0, nocreate3 = 0, nocreate4 = 0;

// ---- Role Inventory Tables ----
// C ref: u_init.c — each role's trobj array
// Fields: otyp (0=UNDEF_TYP=random), spe (127=UNDEF_SPE), oclass, qmin, qmax, bless (-1=UNDEF)

// Archeologist: u_init.c:42-53
const Archeologist_inv = [
    { otyp: BULLWHIP,      spe: 2,         oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: LEATHER_JACKET, spe: 0,        oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: FEDORA,         spe: 0,        oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,    spe: 0,        oclass: FOOD_CLASS,   qmin: 3,  qmax: 3,  bless: 0 },
    { otyp: PICK_AXE,       spe: UNDEF_SPE, oclass: TOOL_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: TINNING_KIT,    spe: UNDEF_SPE, oclass: TOOL_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: TOUCHSTONE,     spe: 0,        oclass: GEM_CLASS,    qmin: 1,  qmax: 1,  bless: 0 },
    { otyp: SACK,           spe: 0,        oclass: TOOL_CLASS,   qmin: 1,  qmax: 1,  bless: 0 },
];

// Barbarian weapon set 0 (rn2(100) >= 50): u_init.c:54-60
const Barbarian_0_inv = [
    { otyp: TWO_HANDED_SWORD, spe: 0, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: AXE,              spe: 0, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL,        spe: 0, oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,      spe: 0, oclass: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
];

// Barbarian weapon set 1 (rn2(100) < 50): u_init.c:61-67
const Barbarian_1_inv = [
    { otyp: BATTLE_AXE,   spe: 0, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD,  spe: 0, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: RING_MAIL,    spe: 0, oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,  spe: 0, oclass: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
];

// Caveman: u_init.c:68-75
const Caveman_inv = [
    { otyp: CLUB,           spe: 1, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: SLING,          spe: 2, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: FLINT,          spe: 0, oclass: GEM_CLASS,    qmin: 10, qmax: 20, bless: UNDEF_BLESS },
    { otyp: ROCK,           spe: 0, oclass: GEM_CLASS,    qmin: 3,  qmax: 3,  bless: 0 },
    { otyp: LEATHER_ARMOR,  spe: 0, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
];

// Healer: u_init.c:76-89
const Healer_inv = [
    { otyp: SCALPEL,           spe: 0,         oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES,    spe: 1,         oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: STETHOSCOPE,       spe: 0,         oclass: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: POT_HEALING,       spe: 0,         oclass: POTION_CLASS, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: POT_EXTRA_HEALING, spe: 0,         oclass: POTION_CLASS, qmin: 4, qmax: 4, bless: UNDEF_BLESS },
    { otyp: WAN_SLEEP,         spe: UNDEF_SPE, oclass: WAND_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SPE_HEALING,       spe: 0,         oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_EXTRA_HEALING, spe: 0,         oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: SPE_STONE_TO_FLESH, spe: 0,        oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: APPLE,             spe: 0,         oclass: FOOD_CLASS,   qmin: 5, qmax: 5, bless: 0 },
];

// Knight: u_init.c:90-100
const Knight_inv = [
    { otyp: LONG_SWORD,      spe: 1, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: LANCE,            spe: 1, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: RING_MAIL,        spe: 1, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: HELMET,           spe: 0, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD,     spe: 0, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: LEATHER_GLOVES,   spe: 0, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: APPLE,            spe: 0, oclass: FOOD_CLASS,   qmin: 10, qmax: 10, bless: 0 },
    { otyp: CARROT,           spe: 0, oclass: FOOD_CLASS,   qmin: 10, qmax: 10, bless: 0 },
];

// Monk: u_init.c:101-113
const Monk_inv = [
    { otyp: LEATHER_GLOVES,  spe: 2,         oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: ROBE,            spe: 1,         oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,      spe: UNDEF_SPE, oclass: SCROLL_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_HEALING,    spe: 0,         oclass: POTION_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,    spe: 0,         oclass: FOOD_CLASS,   qmin: 3, qmax: 3, bless: 0 },
    { otyp: APPLE,           spe: 0,         oclass: FOOD_CLASS,   qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: ORANGE,          spe: 0,         oclass: FOOD_CLASS,   qmin: 5, qmax: 5, bless: UNDEF_BLESS },
    { otyp: FORTUNE_COOKIE,  spe: 0,         oclass: FOOD_CLASS,   qmin: 3, qmax: 3, bless: UNDEF_BLESS },
];

// Priest: u_init.c:114-123
const Priest_inv = [
    { otyp: MACE,               spe: 1,         oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: ROBE,               spe: 0,         oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD,       spe: 0,         oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: POT_WATER,          spe: 0,         oclass: POTION_CLASS, qmin: 4, qmax: 4, bless: 1 },
    { otyp: CLOVE_OF_GARLIC,    spe: 0,         oclass: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: SPRIG_OF_WOLFSBANE, spe: 0,         oclass: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
    { otyp: UNDEF_TYP,          spe: UNDEF_SPE, oclass: SPBOOK_CLASS, qmin: 2, qmax: 2, bless: UNDEF_BLESS },
];

// Ranger: u_init.c:124-132
const Ranger_inv = [
    { otyp: DAGGER,               spe: 1, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: BOW,                  spe: 1, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: ARROW,                spe: 2, oclass: WEAPON_CLASS, qmin: 50, qmax: 59, bless: UNDEF_BLESS },
    { otyp: ARROW,                spe: 0, oclass: WEAPON_CLASS, qmin: 30, qmax: 39, bless: UNDEF_BLESS },
    { otyp: CLOAK_OF_DISPLACEMENT, spe: 2, oclass: ARMOR_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: CRAM_RATION,          spe: 0, oclass: FOOD_CLASS,   qmin: 4,  qmax: 4,  bless: 0 },
];

// Rogue: u_init.c:133-141
const Rogue_inv = [
    { otyp: SHORT_SWORD,    spe: 0, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: DAGGER,          spe: 0, oclass: WEAPON_CLASS, qmin: 6,  qmax: 15, bless: 0 },
    { otyp: LEATHER_ARMOR,   spe: 1, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: POT_SICKNESS,    spe: 0, oclass: POTION_CLASS, qmin: 1,  qmax: 1,  bless: 0 },
    { otyp: LOCK_PICK,       spe: 0, oclass: TOOL_CLASS,   qmin: 1,  qmax: 1,  bless: 0 },
    { otyp: SACK,            spe: 0, oclass: TOOL_CLASS,   qmin: 1,  qmax: 1,  bless: 0 },
];

// Samurai: u_init.c:142-149
const Samurai_inv = [
    { otyp: KATANA,       spe: 0, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: SHORT_SWORD,  spe: 0, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: YUMI,         spe: 0, oclass: WEAPON_CLASS, qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: YA,           spe: 0, oclass: WEAPON_CLASS, qmin: 26, qmax: 45, bless: UNDEF_BLESS },
    { otyp: SPLINT_MAIL,  spe: 0, oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
];

// Tourist: u_init.c:150-159
const Tourist_inv = [
    { otyp: DART,              spe: 2,         oclass: WEAPON_CLASS, qmin: 21, qmax: 40, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,        spe: UNDEF_SPE, oclass: FOOD_CLASS,   qmin: 10, qmax: 10, bless: 0 },
    { otyp: POT_EXTRA_HEALING, spe: 0,         oclass: POTION_CLASS, qmin: 2,  qmax: 2,  bless: UNDEF_BLESS },
    { otyp: SCR_MAGIC_MAPPING, spe: 0,         oclass: SCROLL_CLASS, qmin: 4,  qmax: 4,  bless: UNDEF_BLESS },
    { otyp: HAWAIIAN_SHIRT,    spe: 0,         oclass: ARMOR_CLASS,  qmin: 1,  qmax: 1,  bless: UNDEF_BLESS },
    { otyp: EXPENSIVE_CAMERA,  spe: UNDEF_SPE, oclass: TOOL_CLASS,   qmin: 1,  qmax: 1,  bless: 0 },
    { otyp: CREDIT_CARD,       spe: 0,         oclass: TOOL_CLASS,   qmin: 1,  qmax: 1,  bless: 0 },
];

// Valkyrie: u_init.c:160-166
const Valkyrie_inv = [
    { otyp: SPEAR,        spe: 1, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: DAGGER,       spe: 0, oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: SMALL_SHIELD, spe: 3, oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: FOOD_RATION,  spe: 0, oclass: FOOD_CLASS,   qmin: 1, qmax: 1, bless: 0 },
];

// Wizard: u_init.c:167-178
const Wizard_inv = [
    { otyp: QUARTERSTAFF,             spe: 1,         oclass: WEAPON_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: CLOAK_OF_MAGIC_RESISTANCE, spe: 0,        oclass: ARMOR_CLASS,  qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,                spe: UNDEF_SPE, oclass: WAND_CLASS,   qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,                spe: UNDEF_SPE, oclass: RING_CLASS,   qmin: 2, qmax: 2, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,                spe: UNDEF_SPE, oclass: POTION_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: UNDEF_TYP,                spe: UNDEF_SPE, oclass: SCROLL_CLASS, qmin: 3, qmax: 3, bless: UNDEF_BLESS },
    { otyp: SPE_FORCE_BOLT,            spe: 0,        oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
    { otyp: UNDEF_TYP,                spe: UNDEF_SPE, oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: UNDEF_BLESS },
    { otyp: MAGIC_MARKER,              spe: 19,       oclass: TOOL_CLASS,   qmin: 1, qmax: 1, bless: 0 },
];

// ---- Shared Optional Item Tables ----
// C ref: u_init.c:184-219

const Tinopener_inv = [
    { otyp: TIN_OPENER, spe: 0, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Lamp_inv = [
    { otyp: OIL_LAMP, spe: 1, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Magicmarker_inv = [
    { otyp: MAGIC_MARKER, spe: 19, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Blindfold_inv = [
    { otyp: BLINDFOLD, spe: 0, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Leash_inv = [
    { otyp: LEASH, spe: 0, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Towel_inv = [
    { otyp: TOWEL, spe: 0, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
];
const Money_inv = [
    { otyp: GOLD_PIECE, spe: 0, oclass: COIN_CLASS, qmin: 1, qmax: 1, bless: 0 },
];

// Monk spellbook options
const Healing_book = [
    { otyp: SPE_HEALING, spe: UNDEF_SPE, oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
];
const Protection_book = [
    { otyp: SPE_PROTECTION, spe: UNDEF_SPE, oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
];
const Confuse_monster_book = [
    { otyp: SPE_CONFUSE_MONSTER, spe: UNDEF_SPE, oclass: SPBOOK_CLASS, qmin: 1, qmax: 1, bless: 1 },
];
const M_spell = [Healing_book, Protection_book, Confuse_monster_book];

// Spell discipline mapping for restricted startup spellbook filtering.
// C refs: spell.c spell_skilltype(), u_init.c restricted_spell_discipline().
const SPELL_DISCIPLINE = {
    ATTACK: 'attack',
    HEALING: 'healing',
    DIVINATION: 'divination',
    ENCHANTMENT: 'enchantment',
    CLERIC: 'cleric',
    ESCAPE: 'escape',
    MATTER: 'matter',
};

const SPELL_DISCIPLINE_BY_NAME = {
    dig: SPELL_DISCIPLINE.MATTER,
    'magic missile': SPELL_DISCIPLINE.ATTACK,
    fireball: SPELL_DISCIPLINE.ATTACK,
    'cone of cold': SPELL_DISCIPLINE.ATTACK,
    sleep: SPELL_DISCIPLINE.ENCHANTMENT,
    'finger of death': SPELL_DISCIPLINE.ATTACK,
    light: SPELL_DISCIPLINE.DIVINATION,
    'detect monsters': SPELL_DISCIPLINE.DIVINATION,
    healing: SPELL_DISCIPLINE.HEALING,
    knock: SPELL_DISCIPLINE.MATTER,
    'force bolt': SPELL_DISCIPLINE.ATTACK,
    'confuse monster': SPELL_DISCIPLINE.ENCHANTMENT,
    'cure blindness': SPELL_DISCIPLINE.HEALING,
    'drain life': SPELL_DISCIPLINE.ATTACK,
    'slow monster': SPELL_DISCIPLINE.ENCHANTMENT,
    'wizard lock': SPELL_DISCIPLINE.MATTER,
    'create monster': SPELL_DISCIPLINE.CLERIC,
    'detect food': SPELL_DISCIPLINE.DIVINATION,
    'cause fear': SPELL_DISCIPLINE.ENCHANTMENT,
    clairvoyance: SPELL_DISCIPLINE.DIVINATION,
    'cure sickness': SPELL_DISCIPLINE.HEALING,
    'charm monster': SPELL_DISCIPLINE.ENCHANTMENT,
    'haste self': SPELL_DISCIPLINE.ESCAPE,
    'detect unseen': SPELL_DISCIPLINE.DIVINATION,
    levitation: SPELL_DISCIPLINE.ESCAPE,
    'extra healing': SPELL_DISCIPLINE.HEALING,
    'restore ability': SPELL_DISCIPLINE.HEALING,
    invisibility: SPELL_DISCIPLINE.ESCAPE,
    'detect treasure': SPELL_DISCIPLINE.DIVINATION,
    'remove curse': SPELL_DISCIPLINE.CLERIC,
    'magic mapping': SPELL_DISCIPLINE.DIVINATION,
    identify: SPELL_DISCIPLINE.DIVINATION,
    'turn undead': SPELL_DISCIPLINE.CLERIC,
    polymorph: SPELL_DISCIPLINE.MATTER,
    'teleport away': SPELL_DISCIPLINE.ESCAPE,
    'create familiar': SPELL_DISCIPLINE.CLERIC,
    cancellation: SPELL_DISCIPLINE.ESCAPE,
    protection: SPELL_DISCIPLINE.HEALING,
    jumping: SPELL_DISCIPLINE.ATTACK,
    'stone to flesh': SPELL_DISCIPLINE.MATTER,
    'chain lightning': SPELL_DISCIPLINE.MATTER,
};

const ROLE_ALLOWED_SPELL_DISCIPLINES = {
    [PM_ARCHEOLOGIST]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.MATTER,
    ]),
    [PM_BARBARIAN]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.ESCAPE,
    ]),
    [PM_CAVE_DWELLER]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.MATTER,
    ]),
    [PM_HEALER]: new Set([
        SPELL_DISCIPLINE.HEALING,
    ]),
    [PM_KNIGHT]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.CLERIC,
    ]),
    [PM_MONK]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.ENCHANTMENT,
        SPELL_DISCIPLINE.CLERIC,
        SPELL_DISCIPLINE.ESCAPE,
        SPELL_DISCIPLINE.MATTER,
    ]),
    [PM_CLERIC]: new Set([
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.CLERIC,
    ]),
    [PM_ROGUE]: new Set([
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.ESCAPE,
        SPELL_DISCIPLINE.MATTER,
    ]),
    [PM_RANGER]: new Set([
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.ESCAPE,
    ]),
    [PM_SAMURAI]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.CLERIC,
    ]),
    [PM_TOURIST]: new Set([
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.ENCHANTMENT,
        SPELL_DISCIPLINE.ESCAPE,
    ]),
    [PM_VALKYRIE]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.ESCAPE,
    ]),
    [PM_WIZARD]: new Set([
        SPELL_DISCIPLINE.ATTACK,
        SPELL_DISCIPLINE.HEALING,
        SPELL_DISCIPLINE.DIVINATION,
        SPELL_DISCIPLINE.ENCHANTMENT,
        SPELL_DISCIPLINE.CLERIC,
        SPELL_DISCIPLINE.ESCAPE,
        SPELL_DISCIPLINE.MATTER,
    ]),
};

function spellDisciplineForRole(otyp, roleMnum) {
    if (roleMnum === PM_CLERIC && otyp === SPE_LIGHT) {
        // C ref: role.c role_init() remaps light to cleric skill for priests.
        return SPELL_DISCIPLINE.CLERIC;
    }
    const name = objectData[otyp]?.oc_name;
    return SPELL_DISCIPLINE_BY_NAME[name] || null;
}
export 
function restricted_spell_discipline(otyp, roleMnum) {
    const discipline = spellDisciplineForRole(otyp, roleMnum);
    if (!discipline) return false;
    const allowed = ROLE_ALLOWED_SPELL_DISCIPLINES[roleMnum];
    if (!allowed) return false;
    return !allowed.has(discipline);
}

// ---- UNDEF_TYP Item Filter ----
// C ref: u_init.c ini_inv_mkobj_filter() — create random object, reject dangerous items
export function ini_inv_mkobj_filter(oclass, gotSp1, roleMnum, race) {
    let trycnt = 0;
    while (true) {
        if (++trycnt > 1000) break; // fallback (shouldn't happen)
        const obj = mkobj(oclass, false, /* skipErosion */ true);
        const otyp = obj.otyp;
        // C ref: u_init.c:1115-1175 — filter conditions
        if (otyp === WAN_WISHING || otyp === nocreate
            || otyp === nocreate2 || otyp === nocreate3
            || otyp === nocreate4 || otyp === RIN_LEVITATION
            || (otyp === RIN_POISON_RESISTANCE && race === RACE_ORC)
            || otyp === POT_HALLUCINATION || otyp === POT_ACID
            || otyp === SCR_AMNESIA || otyp === SCR_FIRE
            || otyp === SCR_BLANK_PAPER || otyp === SPE_BLANK_PAPER
            || otyp === RIN_AGGRAVATE_MONSTER || otyp === RIN_HUNGER
            || otyp === WAN_NOTHING
            || (otyp === SCR_ENCHANT_WEAPON && roleMnum === PM_MONK)
            || (otyp === SPE_FORCE_BOLT && roleMnum === PM_WIZARD)
            || (oclass === SPBOOK_CLASS
                && ((objectData[otyp].oc_oc2 || 0) > (gotSp1 ? 3 : 1)
                    || restricted_spell_discipline(otyp, roleMnum)))
            || otyp === SPE_NOVEL) {
            continue; // reject, try again
        }
        return obj;
    }
    // Fallback: shouldn't reach here
    return mksobj(FOOD_RATION, true, false, true);
}

// C ref: spell.c initialspell() — learn a spell from a starting inventory spellbook
function initialSpell(player, obj) {
    const spells = player.spells || (player.spells = []);
    if (spells.some(s => s.otyp === obj.otyp)) return; // already known
    const od = objectData[obj.otyp] || {};
    spells.push({ otyp: obj.otyp, sp_lev: od.oc_oc2 || 1, sp_know: 20000 }); // KEEN=20000
}

// ---- ini_inv: Create starting inventory from trobj table ----
// C ref: u_init.c ini_inv() — processes table entries, handles UNDEF_TYP
export function ini_inv(player, table) {
    let tropIdx = 0;
    let quan = trquan(table[tropIdx]);
    let gotSp1 = false;

    setStartupInventoryMode(true);
    try {
        while (tropIdx < table.length) {
        const trop = table[tropIdx];
        let obj, otyp;

        if (trop.otyp !== UNDEF_TYP) {
            // Fixed item: mksobj directly (no erosion for ini_inv)
            obj = mksobj(trop.otyp, true, false, /* skipErosion */ true);
            otyp = trop.otyp;
        } else {
            // Random item: mkobj with filter
            obj = ini_inv_mkobj_filter(trop.oclass, gotSp1, player.roleMnum, player.race);
            otyp = obj.otyp;
            // C ref: u_init.c:1318-1337 — nocreate tracking
            switch (otyp) {
                case WAN_POLYMORPH:
                case RIN_POLYMORPH:
                case POT_POLYMORPH:
                    nocreate = RIN_POLYMORPH_CONTROL;
                    break;
                case RIN_POLYMORPH_CONTROL:
                    nocreate = RIN_POLYMORPH;
                    nocreate2 = SPE_POLYMORPH;
                    nocreate3 = POT_POLYMORPH;
                    break;
            }
            if (obj.oclass === RING_CLASS || obj.oclass === SPBOOK_CLASS) {
                nocreate4 = otyp;
            }
        }

        // C ref: u_init.c ini_inv_obj_substitution() — race-specific item swaps
        if (player.race !== RACE_HUMAN) {
            for (const [race, from, to] of INV_SUBS) {
                if (race === player.race && obj.otyp === from) {
                    obj.otyp = to;
                    otyp = to;
                    break;
                }
            }
        }

        // C ref: u_init.c ini_inv_adjust_obj()
        if (trop.oclass === COIN_CLASS) {
            obj.quan = player.umoney0 || 0;
            obj.owt = weight(obj);
        } else {
            // C ref: u_init.c ini_inv_adjust_obj() + mkobj.c mksobj_init() interplay:
            // startup inventory ends up with obj->known=1 for non-coin items.
            // (mksobj_init sets known when !oc_uses_known, then ini_inv_adjust_obj
            // forces known for oc_uses_known objects).
            obj.known = true;
            obj.dknown = true;
            obj.bknown = true;
            obj.rknown = true;
            // C ref: u_init.c Is_container(obj) || obj->otyp == STATUE
            if (Is_container(obj) || obj.otyp === STATUE) {
                obj.cknown = true;
                obj.lknown = true;
                obj.otrapped = 0;
            }
            obj.cursed = false;
            if (obj.opoisoned && player.alignment !== -1) {
                obj.opoisoned = 0; // C ref: clear poison for non-chaotic starts
            }
            if (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS) {
                obj.quan = trquan(trop);
                quan = 1; // stop flag
            } else if (obj.oclass === GEM_CLASS && otyp !== FLINT) {
                // Graystone (touchstone) gets quantity 1
                // C ref: is_graystone check — for simplicity, TOUCHSTONE and similar
                if (otyp === TOUCHSTONE) obj.quan = 1;
            }

            // C ref: u_init.c:1231-1240 — spe handling
            if (trop.spe !== UNDEF_SPE) {
                obj.spe = trop.spe;
                // Magic marker: add rn2(4) to spe if < 96
                if (trop.otyp === MAGIC_MARKER && obj.spe < 96) {
                    obj.spe += rn2(4);
                }
            } else {
                // UNDEF_SPE: keep mksobj default, but fix rings with spe <= 0
                if (obj.oclass === RING_CLASS
                    && objectData[otyp].charged && obj.spe <= 0) {
                    obj.spe = rne(3);
                }
            }

            // C ref: u_init.c:1243-1244 — bless handling
            if (trop.bless !== UNDEF_BLESS) {
                obj.blessed = trop.bless > 0;
                obj.cursed = trop.bless < 0;
            }

            // C ref: mkobj.c ARMOR_CLASS init -- "simulate lacquered armor for samurai".
            // During startup inventory creation, samurai splint mail is rustproof and
            // that rustproof status is known.
            if (player.roleMnum === PM_SAMURAI && obj.otyp === SPLINT_MAIL) {
                obj.oerodeproof = true;
                obj.rknown = true;
            }
        }

        // Add to player inventory
        player.addToInventory(obj);

        // C ref: u_init.c ini_inv_use_obj() — initial spellbooks are auto-learned
        if (obj.oclass === SPBOOK_CLASS && obj.otyp !== SPE_BLANK_PAPER) {
            initialSpell(player, obj);
        }

        // Track level-1 spellbooks for filter
        if (obj.oclass === SPBOOK_CLASS && (objectData[otyp].oc_oc2 || 0) === 1) {
            gotSp1 = true;
        }

            if (--quan > 0) continue; // make another of same entry
            tropIdx++;
            if (tropIdx < table.length) {
                quan = trquan(table[tropIdx]);
            }
        }
    } finally {
        setStartupInventoryMode(false);
    }
}

// C ref: u_init.c trquan() — randomize quantity
export function trquan(trop) {
    if (!trop.qmin) return 1;
    return trop.qmin + rn2(trop.qmax - trop.qmin + 1);
}

// C ref: u_init.c u_init_role() — role-specific starting inventory
function u_init_role(player) {
    // Reset nocreate state for this role
    nocreate = nocreate2 = nocreate3 = nocreate4 = 0;
    player.umoney0 = 0;

    switch (player.roleMnum) {
        case PM_ARCHEOLOGIST:
            ini_inv(player, Archeologist_inv);
            if (!rn2(10)) ini_inv(player, Tinopener_inv);
            else if (!rn2(4)) ini_inv(player, Lamp_inv);
            else if (!rn2(5)) ini_inv(player, Magicmarker_inv);
            break;
        case PM_BARBARIAN:
            if (rn2(100) >= 50) {
                ini_inv(player, Barbarian_0_inv);
            } else {
                ini_inv(player, Barbarian_1_inv);
            }
            if (!rn2(6)) ini_inv(player, Lamp_inv);
            break;
        case PM_CAVE_DWELLER:
            ini_inv(player, Caveman_inv);
            break;
        case PM_HEALER:
            player.umoney0 = rn1(1000, 1001); // u.umoney0 = rn1(1000, 1001)
            ini_inv(player, Healer_inv);
            if (!rn2(25)) ini_inv(player, Lamp_inv);
            break;
        case PM_KNIGHT:
            ini_inv(player, Knight_inv);
            break;
        case PM_MONK:
            ini_inv(player, Monk_inv);
            ini_inv(player, M_spell[Math.floor(rn2(90) / 30)]);
            if (!rn2(4)) ini_inv(player, Magicmarker_inv);
            else if (!rn2(10)) ini_inv(player, Lamp_inv);
            break;
        case PM_CLERIC:
            ini_inv(player, Priest_inv);
            if (!rn2(5)) ini_inv(player, Magicmarker_inv);
            else if (!rn2(10)) ini_inv(player, Lamp_inv);
            break;
        case PM_RANGER:
            ini_inv(player, Ranger_inv);
            break;
        case PM_ROGUE:
            player.umoney0 = 0; // u.umoney0 = 0 (no RNG)
            ini_inv(player, Rogue_inv);
            if (!rn2(5)) ini_inv(player, Blindfold_inv);
            break;
        case PM_SAMURAI:
            ini_inv(player, Samurai_inv);
            if (!rn2(5)) ini_inv(player, Blindfold_inv);
            break;
        case PM_TOURIST:
            player.umoney0 = rnd(1000); // u.umoney0 = rnd(1000)
            ini_inv(player, Tourist_inv);
            if (!rn2(25)) ini_inv(player, Tinopener_inv);
            else if (!rn2(25)) ini_inv(player, Leash_inv);
            else if (!rn2(25)) ini_inv(player, Towel_inv);
            else if (!rn2(20)) ini_inv(player, Magicmarker_inv);
            break;
        case PM_VALKYRIE:
            ini_inv(player, Valkyrie_inv);
            if (!rn2(6)) ini_inv(player, Lamp_inv);
            break;
        case PM_WIZARD:
            ini_inv(player, Wizard_inv);
            if (!rn2(5)) ini_inv(player, Blindfold_inv);
            break;
        default:
            throw new Error(`u_init_role: unknown role index ${player.roleMnum}`);
    }
}

// C ref: u_init.c u_init_race() — race-specific starting inventory
function u_init_race(player) {
    switch (player.race) {
        case RACE_HUMAN:
            break;
        case RACE_ELF:
            // Elf Cleric/Wizard gets a random instrument
            if (player.roleMnum === PM_CLERIC || player.roleMnum === PM_WIZARD) {
                const instruments = [WOODEN_FLUTE, TOOLED_HORN, WOODEN_HARP,
                                     BELL, BUGLE, LEATHER_DRUM];
                const instrTyp = instruments[rn2(6)];
                const Instrument_inv = [
                    { otyp: instrTyp, spe: 0, oclass: TOOL_CLASS, qmin: 1, qmax: 1, bless: 0 },
                ];
                ini_inv(player, Instrument_inv);
            }
            break;
        case RACE_DWARF:
            break;
        case RACE_GNOME:
            break;
        case RACE_ORC:
            // Compensate for generally inferior equipment
            if (player.roleMnum !== PM_WIZARD) {
                ini_inv(player, Xtra_food);
            }
            break;
    }
}

// ========================================================================
// Attribute Rolling
// ========================================================================

// Attribute distribution weights per role index
// C ref: role.c urole.attrdist[]
const ROLE_ATTRDIST = {
    0:  [20, 20, 20, 10, 20, 10], // Archeologist
    1:  [30, 6, 7, 20, 30, 7],    // Barbarian
    2:  [30, 6, 7, 20, 30, 7],    // Caveman
    3:  [15, 20, 20, 15, 25, 5],   // Healer
    4:  [30, 15, 15, 10, 20, 10],  // Knight
    5:  [25, 10, 20, 20, 15, 10],  // Monk
    6:  [15, 10, 30, 15, 20, 10],  // Priest
    7:  [20, 10, 10, 30, 20, 10],  // Rogue
    8:  [30, 10, 10, 20, 20, 10],  // Ranger
    9:  [30, 10, 8, 30, 14, 8],    // Samurai
    10: [15, 10, 10, 15, 30, 20],  // Tourist
    11: [30, 6, 7, 20, 30, 7],    // Valkyrie
    12: [10, 30, 10, 20, 20, 10],  // Wizard
};

// Race attribute bounds
// C ref: role.c races[].attrmin/attrmax
// STR uses STR18(x) = 18+x encoding (18/xx strength), so STR18(100) = 118
const RACE_ATTRMIN = [3, 3, 3, 3, 3, 3]; // Same for all races
const RACE_ATTRMAX = {
    [RACE_HUMAN]: [118, 18, 18, 18, 18, 18],  // STR18(100)
    [RACE_ELF]:   [18, 20, 20, 18, 16, 18],
    [RACE_DWARF]: [118, 16, 16, 20, 20, 16],   // STR18(100)
    [RACE_GNOME]: [68, 19, 18, 18, 18, 18],    // STR18(50)
    [RACE_ORC]:   [68, 16, 16, 18, 18, 16],    // STR18(50)
};

// Race HP/PW init bonuses
// C ref: role.c races[].hpadv.infix (HP init), races[].enadv.infix (PW init)
const RACE_HP = { [RACE_HUMAN]: 2, [RACE_ELF]: 1, [RACE_DWARF]: 4, [RACE_GNOME]: 1, [RACE_ORC]: 1 };
const RACE_PW = { [RACE_HUMAN]: 1, [RACE_ELF]: 2, [RACE_DWARF]: 0, [RACE_GNOME]: 2, [RACE_ORC]: 1 };

// Race-specific inventory substitutions
// C ref: u_init.c inv_subs[] — applied per item in ini_inv
const INV_SUBS = [
    [RACE_ELF, DAGGER, ELVEN_DAGGER],
    [RACE_ELF, SPEAR, ELVEN_SPEAR],
    [RACE_ELF, SHORT_SWORD, ELVEN_SHORT_SWORD],
    [RACE_ELF, BOW, ELVEN_BOW],
    [RACE_ELF, ARROW, ELVEN_ARROW],
    [RACE_ELF, HELMET, ELVEN_LEATHER_HELM],
    [RACE_ELF, CLOAK_OF_DISPLACEMENT, ELVEN_CLOAK],
    [RACE_ELF, CRAM_RATION, LEMBAS_WAFER],
    [RACE_ORC, DAGGER, ORCISH_DAGGER],
    [RACE_ORC, SPEAR, ORCISH_SPEAR],
    [RACE_ORC, SHORT_SWORD, ORCISH_SHORT_SWORD],
    [RACE_ORC, BOW, ORCISH_BOW],
    [RACE_ORC, ARROW, ORCISH_ARROW],
    [RACE_ORC, HELMET, ORCISH_HELM],
    [RACE_ORC, SMALL_SHIELD, ORCISH_SHIELD],
    [RACE_ORC, RING_MAIL, ORCISH_RING_MAIL],
    [RACE_ORC, CHAIN_MAIL, ORCISH_CHAIN_MAIL],
    [RACE_ORC, CRAM_RATION, TRIPE_RATION],
    [RACE_ORC, LEMBAS_WAFER, TRIPE_RATION],
    [RACE_DWARF, SPEAR, DWARVISH_SPEAR],
    [RACE_DWARF, SHORT_SWORD, DWARVISH_SHORT_SWORD],
    [RACE_DWARF, HELMET, DWARVISH_IRON_HELM],
    [RACE_DWARF, LEMBAS_WAFER, CRAM_RATION],
    [RACE_GNOME, BOW, CROSSBOW],
    [RACE_GNOME, ARROW, CROSSBOW_BOLT],
];

// Orc extra food (non-Wizard)
// C ref: u_init.c Xtra_food[] — UNDEF_TYP food, qty 2
const Xtra_food = [
    { otyp: UNDEF_TYP, spe: UNDEF_SPE, oclass: FOOD_CLASS, qmin: 2, qmax: 2, bless: 0 },
];

// C ref: attrib.c rnd_attr() — weighted random attribute selection
function rnd_attr(attrdist) {
    let x = rn2(100);
    for (let i = 0; i < NUM_ATTRS; i++) {
        if ((x -= attrdist[i]) < 0) return i;
    }
    return NUM_ATTRS; // A_MAX = failure
}

// C ref: attrib.c init_attr_role_redist()
function init_attr_role_redist(np, addition, attrs, attrdist, attrmin, attrmax) {
    let tryct = 0;
    const adj = addition ? 1 : -1;

    while ((addition ? (np > 0) : (np < 0)) && tryct < 100) {
        const i = rnd_attr(attrdist);

        if (i >= NUM_ATTRS
            || (addition ? (attrs[i] >= attrmax[i])
                         : (attrs[i] <= attrmin[i]))) {
            tryct++;
            continue;
        }
        tryct = 0;
        attrs[i] += adj;
        np -= adj;
    }
    return np;
}

// C ref: attrib.c vary_init_attr()
function varyInitAttr(attrs, attrmin, attrmax) {
    for (let i = 0; i < NUM_ATTRS; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2; // biased variation
            attrs[i] = Math.max(attrmin[i], Math.min(attrmax[i], attrs[i] + xd));
        }
    }
}

// C ref: attrib.c init_attr(75) + vary_init_attr()
function initAttributes(player) {
    const attrdist = ROLE_ATTRDIST[player.roleIndex] || [17, 17, 17, 17, 16, 16];
    const role = roles[player.roleIndex];
    const attrbase = [role.str, role.int, role.wis, role.dex, role.con, role.cha];
    const attrmin = RACE_ATTRMIN;
    const attrmax = RACE_ATTRMAX[player.race] || RACE_ATTRMAX[RACE_HUMAN];

    // C ref: attrib.c init_attr(75)
    let np = 75;
    for (let i = 0; i < NUM_ATTRS; i++) {
        player.attributes[i] = attrbase[i];
        np -= attrbase[i];
    }

    // Distribute leftover points
    np = init_attr_role_redist(np, true, player.attributes, attrdist, attrmin, attrmax);
    // Remove excess (shouldn't happen normally)
    np = init_attr_role_redist(np, false, player.attributes, attrdist, attrmin, attrmax);

    // C ref: attrib.c vary_init_attr()
    varyInitAttr(player.attributes, attrmin, attrmax);
}

// C ref: hack.c weight_cap()/inv_weight() + u_init.c u_init_carry_attr_boost()
function startupWeightCap(player) {
    // Weight constants imported from const.js
    const str = player.attributes[A_STR] || 3;
    const con = player.attributes[A_CON] || 3;
    let carrcap = WT_WEIGHTCAP_STRCON * (str + con) + WT_WEIGHTCAP_SPARE;
    if (carrcap > MAX_CARR_CAP) carrcap = MAX_CARR_CAP;
    return Math.max(carrcap, 1);
}

function startupInvWeight(player) {
    let wt = 0;
    for (const obj of player.inventory) {
        if (!obj) continue;
        if (obj.oclass === COIN_CLASS) {
            wt += Math.floor(((obj.quan || 0) + 50) / 100);
        } else {
            wt += obj.owt || weight(obj);
        }
    }
    return wt - startupWeightCap(player);
}

function startupAdjAttrib(player, ndx, incr, attrmax) {
    if (!incr) return false;
    const oldVal = player.attributes[ndx];
    const newVal = Math.min(attrmax[ndx], oldVal + incr);
    if (newVal === oldVal) return false;
    player.attributes[ndx] = newVal;
    return true;
}
export 
function u_init_carry_attr_boost(player) {
    // Boost STR and CON until hero can carry inventory, or both are capped.
    const attrmax = RACE_ATTRMAX[player.race] || RACE_ATTRMAX[RACE_HUMAN];
    while (startupInvWeight(player) > 0) {
        if (startupAdjAttrib(player, A_STR, 1, attrmax)) continue;
        if (startupAdjAttrib(player, A_CON, 1, attrmax)) continue;
        break;
    }
}

const STARTUP_BOW_LAUNCHERS = new Set([BOW, YUMI, ELVEN_BOW, ORCISH_BOW]);
const STARTUP_ARROW_AMMO = new Set([ARROW, ELVEN_ARROW, ORCISH_ARROW, YA]);

function hasStartupLauncher(player, launcherSet) {
    return (player.inventory || []).some((item) =>
        item?.oclass === WEAPON_CLASS && launcherSet.has(item.otyp));
}

function selectStartupQuiverItem(player) {
    const inv = Array.isArray(player.inventory) ? player.inventory : [];

    if (hasStartupLauncher(player, STARTUP_BOW_LAUNCHERS)) {
        const arrow = inv.find((item) => STARTUP_ARROW_AMMO.has(item?.otyp));
        if (arrow) return arrow;
    }
    if (inv.some((item) => item?.oclass === WEAPON_CLASS && item.otyp === CROSSBOW)) {
        const bolt = inv.find((item) => item?.otyp === CROSSBOW_BOLT);
        if (bolt) return bolt;
    }
    if (inv.some((item) => item?.oclass === WEAPON_CLASS && item.otyp === SLING)) {
        const stone = inv.find((item) => item?.otyp === FLINT) || inv.find((item) => item?.otyp === ROCK);
        if (stone) return stone;
    }

    const dart = inv.find((item) => item?.otyp === DART);
    if (dart) return dart;

    return inv.find((item) =>
        item?.oclass === WEAPON_CLASS && (objectData[item.otyp]?.oc_subtyp ?? 0) < 0) || null;
}

function equipInitialGear(player) {
    // C ref: worn.c setworn()/setuwep() during startup inventory setup.
    // Equip one armor piece per slot category and wield first usable melee weapon.
    player.weapon = null;
    player.swapWeapon = null;
    player.armor = null;
    player.shield = null;
    player.helmet = null;
    player.gloves = null;
    player.boots = null;
    player.cloak = null;
    player.quiver = null;

    for (const item of player.inventory) {
        if (item.oclass !== ARMOR_CLASS) continue;
        const info = objectData[item.otyp];
        if (!info) continue;
        switch (info.oc_subtyp) {
            case ARM_SUIT:
                if (!player.armor) player.armor = item;
                break;
            case ARM_SHIELD:
                if (!player.shield) player.shield = item;
                break;
            case ARM_HELM:
                if (!player.helmet) player.helmet = item;
                break;
            case ARM_GLOVES:
                if (!player.gloves) player.gloves = item;
                break;
            case ARM_BOOTS:
                if (!player.boots) player.boots = item;
                break;
            case ARM_CLOAK:
                if (!player.cloak) player.cloak = item;
                break;
            case ARM_SHIRT:
                if (!player.shirt) player.shirt = item;
                break;
        }
    }

    for (const item of player.inventory) {
        const info = objectData[item.otyp];
        // C ref: u_init.c ini_inv_use_obj() — weapons and weptools
        // (TOOL_CLASS with oc_skill != P_NONE) are eligible for player.weapon/player.swapWeapon.
        const isWeptool = item.oclass === TOOL_CLASS && info && (info.oc_subtyp || 0) !== 0;
        // C ref: u_init.c ini_inv_use_obj() also treats TIN_OPENER/FLINT/ROCK
        // as startup wield candidates.
        const isSpecialWieldable = item.otyp === TIN_OPENER || item.otyp === FLINT || item.otyp === ROCK;
        if (item.oclass !== WEAPON_CLASS && !isWeptool && !isSpecialWieldable) continue;
        // C ref: u_init.c:1282-1293 ini_inv_use_obj() — ammo (is_ammo)
        // and missiles (is_missile) go to quiver, not player.weapon.  Both have
        // negative oc_skill (sub < 0); melee weapons and launchers have
        // non-negative oc_skill.
        if (info && info.oc_subtyp < 0) {
            if (!player.quiver) player.quiver = item;
            continue;
        }
        if (!player.weapon) {
            player.weapon = item;
        } else if (!player.swapWeapon) {
            // C ref: startup sets up an alternate weapon slot (player.swapWeapon)
            // for classes with multiple starting weapons (e.g. Valkyrie).
            player.swapWeapon = item;
            break;
        }
    }

    player.quiver = selectStartupQuiverItem(player);

    // Keep slot pointers and owornmask in sync (C faithful state).
    for (const item of player.inventory) item.owornmask = 0;
    if (player.armor) player.armor.owornmask |= W_ARM;
    if (player.cloak) player.cloak.owornmask |= W_ARMC;
    if (player.helmet) player.helmet.owornmask |= W_ARMH;
    if (player.shield) player.shield.owornmask |= W_ARMS;
    if (player.gloves) player.gloves.owornmask |= W_ARMG;
    if (player.boots) player.boots.owornmask |= W_ARMF;
    if (player.shirt) player.shirt.owornmask |= W_ARMU;
    if (player.weapon) player.weapon.owornmask |= W_WEP;
    if (player.swapWeapon) player.swapWeapon.owornmask |= W_SWAPWEP;
    if (player.quiver) player.quiver.owornmask |= W_QUIVER;
}

// C ref: u_init.c ini_inv_use_obj() discovery side effects.
function applyStartupDiscoveries(player) {
    for (const obj of player.inventory) {
        if (!obj) continue;
        // C ref: u_init.c ini_inv_use_obj() — discover only when obj->known.
        if (objectData[obj.otyp]?.oc_descr && obj.known) {
            discoverObject(obj.otyp, true, true, false);
        }
        if (obj.otyp === OIL_LAMP) {
            discoverObject(POT_OIL, true, true, false);
        }
    }
}

// C ref: u_init.c knows_class()/knows_object() role pre-knowledge.
// Mirrors C role-specific startup recognition of object classes/types.
// P_DAGGER, P_POLEARMS, P_SPEAR, P_BOW, P_CROSSBOW imported from const.js

function isLauncherSkill(skill) {
    return skill >= P_BOW && skill <= P_CROSSBOW;
}

function isAmmoSkill(skill) {
    return skill <= -P_BOW && skill >= -P_CROSSBOW;
}

function discoverClassByRule(oclass, shouldKnow) {
    for (let otyp = 1; otyp < objectData.length; otyp++) {
        const od = objectData[otyp];
        if (!od || od.oc_class !== oclass || od.magic) continue;
        if (otyp === CORNUTHAUM || otyp === DUNCE_CAP) continue;
        if (shouldKnow && !shouldKnow(od)) continue;
        discoverObject(otyp, true, false, false);
    }
}

function discoverWeaponClassForRole(roleMnum) {
    discoverClassByRule(WEAPON_CLASS, (od) => {
        const skill = Number(od.oc_subtyp || 0);
        if (roleMnum !== PM_KNIGHT && roleMnum !== PM_SAMURAI
            && skill === P_POLEARMS) {
            return false; // C: knows_class(WEAPON_CLASS) excludes polearms
        }
        if (roleMnum === PM_RANGER) {
            return isLauncherSkill(skill)
                || isAmmoSkill(skill)
                || skill === P_SPEAR;
        }
        if (roleMnum === PM_ROGUE) {
            return skill === P_DAGGER;
        }
        return true;
    });
}

function applyRolePreknowledge(player) {
    switch (player.roleMnum) {
        case PM_ARCHEOLOGIST:
            discoverObject(SACK, true, false, false);
            discoverObject(TOUCHSTONE, true, false, false);
            break;
        case PM_BARBARIAN:
        case PM_KNIGHT:
        case PM_SAMURAI:
        case PM_VALKYRIE:
            discoverWeaponClassForRole(player.roleMnum);
            discoverClassByRule(ARMOR_CLASS);
            break;
        case PM_MONK:
            discoverClassByRule(ARMOR_CLASS);
            discoverObject(SHURIKEN, true, false, false);
            break;
        case PM_HEALER:
            discoverObject(POT_FULL_HEALING, true, false, false);
            break;
        case PM_CLERIC:
            discoverObject(POT_WATER, true, false, false);
            break;
        case PM_RANGER:
            discoverWeaponClassForRole(player.roleMnum);
            break;
        case PM_ROGUE:
            discoverObject(SACK, true, false, false);
            discoverWeaponClassForRole(player.roleMnum);
            break;
        default:
            break;
    }
}

// C ref: shk.c contained_gold() / vault.c hidden_gold(TRUE)
function containedGold(obj, evenIfUnknown) {
    const children = obj?.cobj || obj?.contents || [];
    let value = 0;
    for (const child of children) {
        if (!child) continue;
        if (child.oclass === COIN_CLASS) {
            value += child.quan || 0;
        } else {
            const hasContents = !!((child.cobj && child.cobj.length) || (child.contents && child.contents.length));
            if (hasContents && (child.cknown || evenIfUnknown)) {
                value += containedGold(child, evenIfUnknown);
            }
        }
    }
    return value;
}

function hiddenGold(player, evenIfUnknown) {
    let value = 0;
    for (const obj of player.inventory) {
        const hasContents = !!((obj.cobj && obj.cobj.length) || (obj.contents && obj.contents.length));
        if (hasContents && (obj.cknown || evenIfUnknown)) {
            value += containedGold(obj, evenIfUnknown);
        }
    }
    return value;
}

function moneyCount(player) {
    return player.inventory
        .filter(obj => obj.oclass === COIN_CLASS)
        .reduce((sum, obj) => sum + (obj.quan || 0), 0);
}

// ========================================================================
// Main Entry Point
// ========================================================================

// Simulate the full post-level initialization sequence.
// Must be called after level generation and player placement.
// C ref: allmain.c newgame() — makedog through welcome
export function simulatePostLevelInit(player, map, depth, opts = {}) {
    const role = roles[player.roleIndex];

    // 1. makedog() — pet creation (actually places pet on map)
    // Startup pet-generation alignment context has role-specific behavior in
    // captured C runs; Caveman uses 0 here while normal gameplay keeps role
    // init record.
    const petAlignmentRecord = (player.roleMnum === PM_CAVE_DWELLER)
        ? 0
        : (Number.isInteger(player.alignmentRecord) ? player.alignmentRecord : 0);
    const pet = withMakemonPlayerOverride(
        { ...player, alignmentRecord: petAlignmentRecord },
        () => makedog(map, player, depth || 1)
    );

    // C ref: dog.c initedog() — apport = ACURR(A_CHA)
    // Called inside makedog() BEFORE init_attr(), and u.acurr is still zeroed.
    // acurr() computes max(u.abon + u.atemp + u.acurr, 3) = 3 at this point.
    if (pet && pet.edog) {
        pet.edog.apport = 3;
    }

    // 2. u_init_inventory_attrs()
    //    a. u_init_role() → role-specific inventory
    u_init_role(player);
    //    b. u_init_race() → race-specific inventory (instruments, food)
    u_init_race(player);
    // C ref: u_init.c u_init_inventory_attrs() — ini_inv(Money) after role/race items.
    if (player.umoney0 > 0) {
        ini_inv(player, Money_inv);
    }
    // C ref: u_init.c u.umoney0 += hidden_gold(TRUE)
    player.umoney0 += hiddenGold(player, true);
    player.gold = moneyCount(player) + hiddenGold(player, true);
    equipInitialGear(player);
    // C ref: weapon.c:1745-1784 — skill_init reads inventory to set P_BASIC
    // for weapon skills matching starting items. Must happen after all ini_inv.
    skill_init_from_inventory(player.inventory || [], player.roleMnum);
    // C ref: spell.c skill_based_spellbook_id() — wizards passively identify
    // low-level spellbooks based on their spell skill ranks.
    skill_based_spellbook_id(player);
    applyRolePreknowledge(player);
    applyStartupDiscoveries(player);
    //    c+d. init_attr(75) + vary_init_attr()
    initAttributes(player);
    //    e. u_init_carry_attr_boost() — no RNG
    u_init_carry_attr_boost(player);
    // C ref: attrib.c set_moreluck() — called via addinv_core2 during ini_inv;
    // since JS ini_inv uses player.addToInventory directly, we call it once here.
    set_moreluck(player);

    // C ref: attrib.c role ability tables — level 1 intrinsics.
    // Monks and samurai gain intrinsic Speed (Fast) at level 1.
    if (player.roleMnum === PM_MONK || player.roleMnum === PM_SAMURAI) {
        player.fast = true;
    }
    // C ref: attrib.c arc_abil/ran_abil — Archeologists and Rangers get
    // intrinsic Searching at level 1.
    if (player.roleMnum === PM_ARCHEOLOGIST || player.roleMnum === PM_RANGER) {
        player.searching = true;
    }

    // Set HP/PW from role + race via newhp()/newpw()
    // C ref: u_init.c:993-995 — u.ulevel=0, then newhp(), then newpw()
    // Note: the RNG calls from newhp/newpw during init are consumed by the
    // dungeon.js init_dungeons() stub (which calls rnd(enadv) to keep the
    // flat startup RNG stream aligned). We call the functions here for the
    // correct HP/PW VALUES but their RNG has already been consumed.
    const raceHP = RACE_HP[player.race] ?? 2;
    const racePW = RACE_PW[player.race] ?? 1;
    player.uhp = role.startingHP + raceHP;
    player.uhpmax = player.uhp;
    player.pw = role.startingPW + racePW + (opts.enadv_roll || 0);
    player.pwmax = player.pw;
    // C ref: u_init.c:1404-1407 — if hero knows any spells, force pw >= SPELL_LEV_PW(1)=5,
    // so they can always cast the level-1 spell they start with.
    if (player.spells && player.spells.length > 0 && player.pwmax < 5) {
        player.pw = player.pwmax = 5;
    }

    // Set AC from worn equipment.
    // C ref: do_wear.c find_ac() uses ac for worn items only.
    player.ac = 10;
    const worn = [player.armor, player.shield, player.helmet, player.gloves, player.boots, player.cloak];
    for (const item of worn) {
        if (!item) continue;
        const info = objectData[item.otyp];
        if (!info) continue;
        const baseAC = info.oc_oc1 || 0;
        player.ac -= (baseAC + (item.spe || 0));
    }

    // 3. com_pager("legacy") — Book of Odin
    // C ref: nhlua.c NHCORE_START_NEW_GAME triggers shuffle
    rn2(3); rn2(2);

    // 4. welcome(TRUE) — timing init
    // C ref: allmain.c:74 rnd(9000) for rndencode
    // C ref: allmain.c:81 rnd(30) for seer_turn
    rnd(9000);
    const seerTurn = rnd(30);

    return { seerTurn };
}

// ========================================================================
// First-level initialization (shared by browser and headless paths)
// ========================================================================

// Performs the full first-level init sequence: initrack, makemon context,
// level generation init, mklev, player placement, and post-level init.
// C ref: allmain.c newgame() — from init_dungeons through welcome(TRUE)
export async function initFirstLevel(player, roleIndex, wizard, opts = {}) {
    const startDlevel = opts.startDlevel ?? 1;
    const captureSpecialLevelCheckpoints = opts.captureSpecialLevelCheckpoints === true;
    setCheckpointCaptureEnabled(captureSpecialLevelCheckpoints);
    if (captureSpecialLevelCheckpoints) clearLevelCheckpoints();
    initrack();
    resetPlineState();
    resetNoisesState();
    resetHungerState();
    const { enadv_roll, rightHanded } = initLevelGeneration(roleIndex, wizard, {
        alignment: player.alignment,
        race: player.race,
    });
    // C ref: u_init_misc() handedness assignment in u.uhandedness
    player.rightHanded = rightHanded;
    // C ref: allmain.c/u_init.c ordering: u.uhp/u.uen are initialized before
    // makelevel(), so early mklev mapdump checkpoints see populated hero stats.
    const role = roles[player.roleIndex];
    if (role) {
        const raceHP = RACE_HP[player.race] ?? 2;
        const racePW = RACE_PW[player.race] ?? 1;
        player.uhp = role.startingHP + raceHP;
        player.uhpmax = player.uhp;
        player.uen = role.startingPW + racePW + (enadv_roll || 0);
        player.uenmax = player.uen;
    }
    const map = (opts.startDnum != null)
        ? await mklev(startDlevel, opts.startDnum, startDlevel,
            {
                dungeonAlignOverride: opts.dungeonAlignOverride,
                heroHasAmulet: !!player?.uhave?.amulet,
            })
        : await mklev(startDlevel, undefined, undefined,
            {
                dungeonAlignOverride: opts.dungeonAlignOverride,
                heroHasAmulet: !!player?.uhave?.amulet,
            });
    const pos = getArrivalPosition(map, startDlevel, null);
    player.x = pos.x;
    player.y = pos.y;
    player.dungeonLevel = startDlevel;
    player.inTutorial = !!map?.flags?.is_tutorial;
    const initResult = simulatePostLevelInit(player, map, startDlevel, { enadv_roll });
    return { map, initResult };
}

// Autotranslated from u_init.c:1249
export function ini_inv_use_obj(obj, player) {
  if (objectData[obj.otyp].oc_descr && obj.known) discoverObject(obj.otyp, true, true, false);
  if (obj.otyp === OIL_LAMP) discoverObject(POT_OIL, true, true, false);
  if (obj.oclass === ARMOR_CLASS) {
    if (is_shield(obj) && !player.shield && !(player.weapon && bimanual(player.weapon))) { setworn(obj, W_ARMS); set_twoweap(false); }
    else if (is_helmet(obj) && !player.helmet) setworn(obj, W_ARMH);
    else if (is_gloves(obj) && !player.gloves) setworn(obj, W_ARMG);
    else if (is_shirt(obj) && !player.shirt) setworn(obj, W_ARMU);
    else if (is_cloak(obj) && !player.cloak) setworn(obj, W_ARMC);
    else if (is_boots(obj) && !player.boots) setworn(obj, W_ARMF);
    else if (is_suit(obj) && !player.armor) setworn(obj, W_ARM);
  }
  if (obj.oclass === WEAPON_CLASS || is_weptool(obj) || obj.otyp === TIN_OPENER || obj.otyp === FLINT || obj.otyp === ROCK) {
    if (is_ammo(obj) || is_missile(obj)) { if (!player.quiver) setuqwep(obj); }
    else if (!player.weapon && (!player.shield || !bimanual(obj))) { setuwep(obj); }
    else if (!player.swapWeapon) { setuswapwep(obj); }
  }
  if (obj.oclass === SPBOOK_CLASS && obj.otyp !== SPE_BLANK_PAPER) initialspell(obj);
}

// ---------------------------------------------------------------------------
// C-named exports for CODEMATCH parity (S10: u_init.c startup edge parity)
// ---------------------------------------------------------------------------

// cf. u_init.c:575 — knows_object(obj, override_pauper)
// Mark a single object type as known/discovered.
export function knows_object(otyp, override_pauper) {
    discoverObject(otyp, true, false, false);
}

// cf. u_init.c:586 — knows_class(sym)
// Know ordinary (non-magical) objects of a certain class.
// JS equivalent: discoverClassByRule (already implemented above).
export function knows_class(sym) {
    discoverClassByRule(sym);
}

// cf. u_init.c:1036 — skills_for_role()
// Return skill table for current role.
// JS equivalent: skills are handled in chargen.js/skill_init; stub for CODEMATCH.
export function skills_for_role(player) {
    // In JS, skill tables are defined per-role in chargen.js and applied during init.
    // This stub exists for C function name parity.
    return null;
}

// cf. u_init.c:868 — pauper_reinit()
// Reset skills and pre-discover role item for pauper mode.
export function pauper_reinit(player) {
    if (!player?.uroleplay?.pauper) return;
    // Reset skills to UNSKILLED
    if (player.skills) {
        for (const key of Object.keys(player.skills)) {
            if (player.skills[key]?.skill > 0) {
                player.skills[key].skill = 0; // P_UNSKILLED
                player.skills[key].advance = 0;
            }
        }
    }
    player.weapon_slots = 2;
}

// cf. u_init.c:1178 — ini_inv_obj_substitution(trop, obj)
// Substitute race-specific items in starting inventory.
// JS equivalent: already handled inline in u_init_race (line 704).
export function ini_inv_obj_substitution(trop, obj, player) {
    // Race-specific substitutions are handled in u_init_race().
    // This stub exists for C function name parity.
    return obj.otyp;
}

// cf. u_init.c:1204 — ini_inv_adjust_obj(trop, obj)
// Adjust enchantment/blessing/quantity after object creation.
// JS equivalent: inline in ini_inv (line 491).
export function ini_inv_adjust_obj(trop, obj) {
    // Adjustments are handled inline in ini_inv().
    // This stub exists for C function name parity.
    return false;
}

// cf. u_init.c:1369 — u_init_inventory_attrs()
// Orchestrate role/race init, then attributes + carry boost.
// JS equivalent: initAttributes + u_init_carry_attr_boost (already implemented).
export function u_init_inventory_attrs(player) {
    u_init_role(player);
    u_init_race(player);
    initAttributes(player);
    u_init_carry_attr_boost(player);
}

// cf. u_init.c:942 — u_init_misc()
// Initialize player record: alignment, HP/power, level, hunger, etc.
// JS equivalent: mostly handled in chargen.js/initFirstLevel.
export function u_init_misc(player) {
    // Core player initialization is spread across chargen.js and initFirstLevel.
    // This stub exists for C function name parity.
}

// cf. u_init.c:1394 — u_init_skills_discoveries()
// Apply starting gear, discover objects, initialize skills.
// JS equivalent: equipInitialGear + applyStartupDiscoveries + applyRolePreknowledge.
export function u_init_skills_discoveries(player) {
    equipInitialGear(player);
    applyStartupDiscoveries(player);
    applyRolePreknowledge(player);
}
