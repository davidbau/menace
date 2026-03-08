// role.js -- Role/race/gender/alignment selection and validation
// cf. role.c — roles[] data table, validrole, randrole, randrole_filtered,
//              str2role, validrace, randrace, str2race, validgend, randgend,
//              str2gend, validalign, randalign, str2align, ok_role, pick_role,
//              ok_race, pick_race, ok_gend, pick_gend, ok_align, pick_align,
//              rigid_role_checks, setrolefilter, gotrolefilter,
//              rolefilterstring, clearrolefilter, role_gendercount,
//              race_alignmentcount, root_plselection_prompt,
//              build_plselection_prompt, plnamesuffix, role_selection_prolog,
//              role_menu_extra, role_init, Hello, Goodbye, character_race,
//              genl_player_selection, genl_player_setup, reset_role_filtering,
//              setup_rolemenu, setup_racemenu, setup_gendmenu, setup_algnmenu,
//              maybe_skip_seps, plsel_startmenu, promptsep
//
// JS implementations:
//   roles[] data → player.js (roles array with JS-native role data)
//   ok_role/ok_race/ok_gend/ok_align → implemented below + chargen.js has simplified versions
//   plnamesuffix() → nethack.js:360 (partial name suffix parsing in askname flow)
//   role_init() → nethack.js:1126 + u_init.js:891 (partial — Priest god assignment + skill remapping)
//   Hello() → player.js:325 (returns role.greeting from roles array)
//   Goodbye() → nethack.js:1914 (inlined farewell message)
//   genl_player_selection → nethack.js (character creation flow, partial)

import {
    A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC,
    MALE, FEMALE,
    RACE_HUMAN, RACE_ELF, RACE_DWARF, RACE_GNOME, RACE_ORC,
    ROLE_NONE, ROLE_RANDOM, PICK_RANDOM, PICK_RIGID,
} from './const.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC,
         PM_ARCHEOLOGIST, PM_BARBARIAN, PM_CAVE_DWELLER, PM_HEALER,
         PM_KNIGHT, PM_MONK, PM_CLERIC, PM_ROGUE, PM_RANGER,
         PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_WIZARD,
         M2_HUMAN, M2_ELF, M2_DWARF, M2_GNOME, M2_ORC } from './monsters.js';


// ========================================================================
// Roles and races tables (moved from player.js)
// C ref: src/role.c roles[], races[] arrays
// Gods: names starting with '_' indicate a goddess (strip underscore for display)
// ========================================================================

export const roles = [
    { name: 'Archeologist', abbr: 'Arc', mnum: PM_ARCHEOLOGIST, str: 7, int: 10, wis: 10, dex: 7, con: 7, cha: 7,
      startingHP: 11, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: null,
      hpadv: {infix:11, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 14,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_DWARF, RACE_GNOME],
      validAligns: [A_LAWFUL, A_NEUTRAL],
      forceGender: null,
      gods: ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'],
      ranks: [
        {m:'Digger',f:'Digger'}, {m:'Field Worker',f:'Field Worker'},
        {m:'Investigator',f:'Investigator'}, {m:'Exhumer',f:'Exhumer'},
        {m:'Excavator',f:'Excavator'}, {m:'Spelunker',f:'Spelunker'},
        {m:'Speleologist',f:'Speleologist'}, {m:'Collector',f:'Collector'},
        {m:'Curator',f:'Curator'}
      ],
      greeting: 'Hello',
      menuChar: 'a', menuArticle: 'an' },
    { name: 'Barbarian', abbr: 'Bar', mnum: PM_BARBARIAN, str: 16, int: 7, wis: 7, dex: 15, con: 16, cha: 6,
      startingHP: 14, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: null,
      hpadv: {infix:14, inrnd:0, lofix:0, lornd:10, hifix:2, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 10,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_ORC],
      validAligns: [A_NEUTRAL, A_CHAOTIC],
      forceGender: null,
      gods: ['Mitra', 'Crom', 'Set'],
      ranks: [
        {m:'Plunderer',f:'Plunderess'}, {m:'Pillager',f:'Pillager'},
        {m:'Bandit',f:'Bandit'}, {m:'Brigand',f:'Brigand'},
        {m:'Raider',f:'Raider'}, {m:'Reaver',f:'Reaver'},
        {m:'Slayer',f:'Slayer'}, {m:'Chieftain',f:'Chieftainess'},
        {m:'Conqueror',f:'Conqueress'}
      ],
      greeting: 'Hello',
      menuChar: 'b', menuArticle: 'a' },
    { name: 'Caveman', abbr: 'Cav', mnum: PM_CAVE_DWELLER, str: 10, int: 7, wis: 7, dex: 7, con: 8, cha: 6,
      startingHP: 14, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: 'dog',
      hpadv: {infix:14, inrnd:0, lofix:0, lornd:8, hifix:2, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 10,
      namef: 'Cavewoman',
      validRaces: [RACE_HUMAN, RACE_DWARF, RACE_GNOME],
      validAligns: [A_LAWFUL, A_NEUTRAL],
      forceGender: null,
      gods: ['Anu', '_Ishtar', 'Anshar'],
      ranks: [
        {m:'Troglodyte',f:'Troglodyte'}, {m:'Aborigine',f:'Aborigine'},
        {m:'Wanderer',f:'Wanderer'}, {m:'Vagrant',f:'Vagrant'},
        {m:'Wayfarer',f:'Wayfarer'}, {m:'Roamer',f:'Roamer'},
        {m:'Nomad',f:'Nomad'}, {m:'Rover',f:'Rover'},
        {m:'Pioneer',f:'Pioneer'}
      ],
      greeting: 'Hello',
      menuChar: 'c', menuArticle: 'a' },
    { name: 'Healer', abbr: 'Hea', mnum: PM_HEALER, str: 7, int: 7, wis: 13, dex: 7, con: 11, cha: 16,
      startingHP: 11, startingPW: 1, enadv: 4, align: A_NEUTRAL, petType: null,
      hpadv: {infix:11, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:1, inrnd:4, lofix:0, lornd:1, hifix:0, hirnd:2},
      xlev: 20,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_GNOME],
      validAligns: [A_NEUTRAL],
      forceGender: null,
      gods: ['_Athena', 'Hermes', 'Poseidon'],
      ranks: [
        {m:'Rhizotomist',f:'Rhizotomist'}, {m:'Empiric',f:'Empiric'},
        {m:'Embalmer',f:'Embalmer'}, {m:'Dresser',f:'Dresser'},
        {m:'Medicus ossium',f:'Medica ossium'}, {m:'Herbalist',f:'Herbalist'},
        {m:'Magister',f:'Magistra'}, {m:'Physician',f:'Physician'},
        {m:'Chirurgeon',f:'Chirurgeon'}
      ],
      greeting: 'Hello',
      menuChar: 'h', menuArticle: 'a' },
    { name: 'Knight', abbr: 'Kni', mnum: PM_KNIGHT, str: 13, int: 7, wis: 14, dex: 8, con: 10, cha: 17,
      startingHP: 14, startingPW: 1, enadv: 4, align: A_LAWFUL, petType: 'pony',
      hpadv: {infix:14, inrnd:0, lofix:0, lornd:8, hifix:2, hirnd:0},
      enadv_full: {infix:1, inrnd:4, lofix:0, lornd:1, hifix:0, hirnd:2},
      xlev: 10,
      namef: null,
      validRaces: [RACE_HUMAN],
      validAligns: [A_LAWFUL],
      forceGender: null,
      gods: ['Lugh', '_Brigit', 'Manannan Mac Lir'],
      ranks: [
        {m:'Gallant',f:'Gallant'}, {m:'Esquire',f:'Esquire'},
        {m:'Bachelor',f:'Bachelor'}, {m:'Sergeant',f:'Sergeant'},
        {m:'Knight',f:'Dame'}, {m:'Banneret',f:'Banneret'},
        {m:'Chevalier',f:'Chevaliere'}, {m:'Seignieur',f:'Dame'},
        {m:'Paladin',f:'Paladin'}
      ],
      greeting: 'Salutations',
      menuChar: 'k', menuArticle: 'a' },
    { name: 'Monk', abbr: 'Mon', mnum: PM_MONK, str: 10, int: 7, wis: 8, dex: 8, con: 7, cha: 7,
      startingHP: 12, startingPW: 2, enadv: 2, align: A_NEUTRAL, petType: null,
      hpadv: {infix:12, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:2, inrnd:2, lofix:0, lornd:2, hifix:0, hirnd:2},
      xlev: 10,
      namef: null,
      validRaces: [RACE_HUMAN],
      validAligns: [A_LAWFUL, A_NEUTRAL, A_CHAOTIC],
      forceGender: null,
      gods: ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'],
      ranks: [
        {m:'Candidate',f:'Candidate'}, {m:'Mendicant',f:'Mendicant'},
        {m:'Acolyte',f:'Acolyte'}, {m:'Monk',f:'Nun'},
        {m:'Lama',f:'Lama'}, {m:'Abbot',f:'Abbess'},
        {m:'Guru',f:'Guru'}, {m:'Swami',f:'Swami'},
        {m:'Grand Master',f:'Grand Master'}
      ],
      greeting: 'Hello',
      menuChar: 'm', menuArticle: 'a' },
    { name: 'Priest', abbr: 'Pri', mnum: PM_CLERIC, str: 7, int: 7, wis: 10, dex: 7, con: 7, cha: 7,
      startingHP: 12, startingPW: 4, enadv: 3, align: A_NEUTRAL, petType: null,
      hpadv: {infix:12, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:4, inrnd:3, lofix:0, lornd:2, hifix:0, hirnd:2},
      xlev: 10,
      namef: 'Priestess',
      validRaces: [RACE_HUMAN, RACE_ELF],
      validAligns: [A_LAWFUL, A_NEUTRAL, A_CHAOTIC],
      forceGender: null,
      gods: [null, null, null],  // Priest has no fixed gods; assigned at role_init from random role's pantheon
      ranks: [
        {m:'Aspirant',f:'Aspirant'}, {m:'Acolyte',f:'Acolyte'},
        {m:'Adept',f:'Adept'}, {m:'Priest',f:'Priestess'},
        {m:'Curate',f:'Curate'}, {m:'Canon',f:'Canoness'},
        {m:'Lama',f:'Lama'}, {m:'Patriarch',f:'Matriarch'},
        {m:'High Priest',f:'High Priestess'}
      ],
      greeting: 'Hello',
      menuChar: 'p', menuArticle: 'a' },
    { name: 'Rogue', abbr: 'Rog', mnum: PM_ROGUE, str: 7, int: 7, wis: 7, dex: 10, con: 7, cha: 6,
      startingHP: 10, startingPW: 1, enadv: 0, align: A_CHAOTIC, petType: null,
      hpadv: {infix:10, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 11,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_ORC],
      validAligns: [A_CHAOTIC],
      forceGender: null,
      gods: ['Issek', 'Mog', 'Kos'],
      ranks: [
        {m:'Footpad',f:'Footpad'}, {m:'Cutpurse',f:'Cutpurse'},
        {m:'Rogue',f:'Rogue'}, {m:'Pilferer',f:'Pilferer'},
        {m:'Robber',f:'Robber'}, {m:'Burglar',f:'Burglar'},
        {m:'Filcher',f:'Filcher'}, {m:'Magsman',f:'Magswoman'},
        {m:'Thief',f:'Thief'}
      ],
      greeting: 'Hello',
      menuChar: 'r', menuArticle: 'a' },
    { name: 'Ranger', abbr: 'Ran', mnum: PM_RANGER, str: 13, int: 13, wis: 13, dex: 9, con: 13, cha: 7,
      startingHP: 13, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: 'dog',
      hpadv: {infix:13, inrnd:0, lofix:0, lornd:6, hifix:1, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 12,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_ELF, RACE_GNOME, RACE_ORC],
      validAligns: [A_NEUTRAL, A_CHAOTIC],
      forceGender: null,
      gods: ['Mercury', '_Venus', 'Mars'],
      ranks: [
        {m:'Tenderfoot',f:'Tenderfoot'}, {m:'Lookout',f:'Lookout'},
        {m:'Trailblazer',f:'Trailblazer'}, {m:'Reconnoiterer',f:'Reconnoiteress'},
        {m:'Scout',f:'Scout'}, {m:'Arbalester',f:'Arbalester'},
        {m:'Archer',f:'Archer'}, {m:'Sharpshooter',f:'Sharpshooter'},
        {m:'Ranger',f:'Ranger'}
      ],
      greeting: 'Hello',
      menuChar: 'R', menuArticle: 'a' },
    { name: 'Samurai', abbr: 'Sam', mnum: PM_SAMURAI, str: 10, int: 8, wis: 7, dex: 10, con: 17, cha: 6,
      startingHP: 13, startingPW: 1, enadv: 0, align: A_LAWFUL, petType: 'dog',
      hpadv: {infix:13, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 11,
      namef: null,
      validRaces: [RACE_HUMAN],
      validAligns: [A_LAWFUL],
      forceGender: null,
      gods: ['_Amaterasu Omikami', 'Raijin', 'Susanowo'],
      ranks: [
        {m:'Hatamoto',f:'Hatamoto'}, {m:'Ronin',f:'Ronin'},
        {m:'Ninja',f:'Kunoichi'}, {m:'Joshu',f:'Joshu'},
        {m:'Ryoshu',f:'Ryoshu'}, {m:'Kokushu',f:'Kokushu'},
        {m:'Daimyo',f:'Daimyo'}, {m:'Kuge',f:'Kuge'},
        {m:'Shogun',f:'Shogun'}
      ],
      greeting: 'Konnichi wa',
      menuChar: 's', menuArticle: 'a' },
    { name: 'Tourist', abbr: 'Tou', mnum: PM_TOURIST, str: 7, int: 10, wis: 6, dex: 7, con: 7, cha: 10,
      startingHP: 8, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: null,
      hpadv: {infix:8, inrnd:0, lofix:0, lornd:8, hifix:0, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 14,
      namef: null,
      validRaces: [RACE_HUMAN],
      validAligns: [A_NEUTRAL],
      forceGender: null,
      gods: ['Blind Io', '_The Lady', 'Offler'],
      ranks: [
        {m:'Rambler',f:'Rambler'}, {m:'Sightseer',f:'Sightseer'},
        {m:'Excursionist',f:'Excursionist'}, {m:'Peregrinator',f:'Peregrinatrix'},
        {m:'Traveler',f:'Traveler'}, {m:'Journeyer',f:'Journeyer'},
        {m:'Voyager',f:'Voyager'}, {m:'Explorer',f:'Explorer'},
        {m:'Adventurer',f:'Adventurer'}
      ],
      greeting: 'Hello',
      menuChar: 't', menuArticle: 'a' },
    { name: 'Valkyrie', abbr: 'Val', mnum: PM_VALKYRIE, str: 10, int: 7, wis: 7, dex: 7, con: 10, cha: 7,
      startingHP: 14, startingPW: 1, enadv: 0, align: A_NEUTRAL, petType: null,
      hpadv: {infix:14, inrnd:0, lofix:0, lornd:8, hifix:2, hirnd:0},
      enadv_full: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1},
      xlev: 10,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_DWARF],
      validAligns: [A_LAWFUL, A_NEUTRAL],
      forceGender: 'female',
      gods: ['Tyr', 'Odin', 'Loki'],
      ranks: [
        {m:'Stripling',f:'Stripling'}, {m:'Skirmisher',f:'Skirmisher'},
        {m:'Fighter',f:'Fighter'}, {m:'Man-at-arms',f:'Woman-at-arms'},
        {m:'Warrior',f:'Warrior'}, {m:'Swashbuckler',f:'Swashbuckler'},
        {m:'Hero',f:'Heroine'}, {m:'Champion',f:'Champion'},
        {m:'Lord',f:'Lady'}
      ],
      greeting: 'Velkommen',
      menuChar: 'v', menuArticle: 'a' },
    { name: 'Wizard', abbr: 'Wiz', mnum: PM_WIZARD, str: 7, int: 10, wis: 7, dex: 7, con: 7, cha: 7,
      startingHP: 10, startingPW: 4, enadv: 3, align: A_NEUTRAL, petType: 'cat',
      hpadv: {infix:10, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0},
      enadv_full: {infix:4, inrnd:3, lofix:0, lornd:2, hifix:0, hirnd:3},
      xlev: 12,
      namef: null,
      validRaces: [RACE_HUMAN, RACE_ELF, RACE_GNOME, RACE_ORC],
      validAligns: [A_NEUTRAL, A_CHAOTIC],
      forceGender: null,
      gods: ['Ptah', 'Thoth', 'Anhur'],
      ranks: [
        {m:'Evoker',f:'Evoker'}, {m:'Conjurer',f:'Conjurer'},
        {m:'Thaumaturge',f:'Thaumaturge'}, {m:'Magician',f:'Magician'},
        {m:'Enchanter',f:'Enchantress'}, {m:'Sorcerer',f:'Sorceress'},
        {m:'Necromancer',f:'Necromancer'}, {m:'Wizard',f:'Wizard'},
        {m:'Mage',f:'Mage'}
      ],
      greeting: 'Hello',
      menuChar: 'w', menuArticle: 'a' },
];

// C ref: you.h Role_if/Role_switch macros
// Role_if(pm) → player.roleMnum === pm  (matches C's urole.mnum == pm)
// Role_switch → player.roleMnum  (matches C's urole.mnum)
export function Role_if(player, pm) { return player.roleMnum === pm; }
export function Role_switch(player) { return player.roleMnum; }

// Races table -- from role.c
// C ref: src/role.c races[] array
export const races = [
    { name: 'human', adj: 'human', validAligns: [A_LAWFUL, A_NEUTRAL, A_CHAOTIC],
      menuChar: 'h', hpBonus: 2, pwBonus: 1,
      hpadv: {infix:2, inrnd:0, lofix:0, lornd:2, hifix:1, hirnd:0},
      enadv: {infix:1, inrnd:0, lofix:2, lornd:0, hifix:2, hirnd:0},
      selfmask: M2_HUMAN, lovemask: 0, hatemask: M2_GNOME | M2_ORC,
      attrmin: [3,3,3,3,3,3], attrmax: [18,18,18,18,18,18] },
    { name: 'elf', adj: 'elven', validAligns: [A_CHAOTIC],
      menuChar: 'e', hpBonus: 1, pwBonus: 2,
      hpadv: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:1, hirnd:0},
      enadv: {infix:2, inrnd:0, lofix:3, lornd:0, hifix:3, hirnd:0},
      selfmask: M2_ELF, lovemask: M2_ELF, hatemask: M2_ORC,
      attrmin: [3,3,3,3,3,3], attrmax: [18,18,18,18,16,18] },
    { name: 'dwarf', adj: 'dwarven', validAligns: [A_LAWFUL],
      menuChar: 'd', hpBonus: 4, pwBonus: 0,
      hpadv: {infix:4, inrnd:0, lofix:0, lornd:3, hifix:2, hirnd:0},
      enadv: {infix:0, inrnd:0, lofix:0, lornd:0, hifix:0, hirnd:0},
      selfmask: M2_DWARF, lovemask: M2_DWARF | M2_GNOME, hatemask: M2_ORC,
      attrmin: [3,3,3,3,3,3], attrmax: [18,16,18,18,20,16] },
    { name: 'gnome', adj: 'gnomish', validAligns: [A_NEUTRAL],
      menuChar: 'g', hpBonus: 1, pwBonus: 2,
      hpadv: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:0},
      enadv: {infix:2, inrnd:0, lofix:2, lornd:0, hifix:2, hirnd:0},
      selfmask: M2_GNOME, lovemask: M2_DWARF | M2_GNOME, hatemask: M2_HUMAN,
      attrmin: [3,3,3,3,3,3], attrmax: [18,19,18,18,18,18] },
    { name: 'orc', adj: 'orcish', validAligns: [A_CHAOTIC],
      menuChar: 'o', hpBonus: 1, pwBonus: 1,
      hpadv: {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:0},
      enadv: {infix:1, inrnd:0, lofix:1, lornd:0, hifix:1, hirnd:0},
      selfmask: M2_ORC, lovemask: 0, hatemask: M2_HUMAN | M2_ELF | M2_DWARF,
      attrmin: [3,3,3,3,3,3], attrmax: [18,16,16,18,18,16] },
];

// --- Chargen Helper Functions ---

// Returns indices of races valid for a given role
export function validRacesForRole(roleIdx) {
    const role = roles[roleIdx];
    if (!role) return [];
    return role.validRaces.slice();
}

// Returns valid alignment values for a given role+race combination (intersection)
export function validAlignsForRoleRace(roleIdx, raceIdx) {
    const role = roles[roleIdx];
    const race = races[raceIdx];
    if (!role || !race) return [];
    return role.validAligns.filter(a => race.validAligns.includes(a));
}

// Returns true if gender menu is needed (i.e. gender is not forced)
export function needsGenderMenu(roleIdx) {
    const role = roles[roleIdx];
    return !role || !role.forceGender;
}

// Returns the rank title for a given level, role, and gender
// C ref: role.c rank_of(level, role, female)
// Level 1 = rank 0, levels 2-5 = rank 1, etc.
export function rankOf(level, roleIdx, female) {
    const role = roles[roleIdx];
    if (!role) return 'Adventurer';
    // C ref: role.c rank_of() — rank thresholds: 0,3,6,10,14,18,22,26,30
    const thresholds = [0, 3, 6, 10, 14, 18, 22, 26, 30];
    let rankIdx = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (level >= thresholds[i]) {
            rankIdx = i;
            break;
        }
    }
    const rank = role.ranks[rankIdx];
    return female ? rank.f : rank.m;
}

// Returns the deity name for a role+alignment
// C ref: role.c — gods[0]=lawful, gods[1]=neutral, gods[2]=chaotic
// Names starting with '_' are goddesses (strip the underscore)
export function godForRoleAlign(roleIdx, alignValue) {
    const role = roles[roleIdx];
    if (!role) return 'Unknown';
    let godIdx;
    if (alignValue > 0) godIdx = 0;       // lawful
    else if (alignValue === 0) godIdx = 1; // neutral
    else godIdx = 2;                        // chaotic
    const raw = role.gods[godIdx];
    if (!raw) return null; // Priest with no gods
    return raw.startsWith('_') ? raw.substring(1) : raw;
}

// Returns whether the deity is a goddess (name starts with '_' in the data)
export function isGoddess(roleIdx, alignValue) {
    const role = roles[roleIdx];
    if (!role) return false;
    let godIdx;
    if (alignValue > 0) godIdx = 0;
    else if (alignValue === 0) godIdx = 1;
    else godIdx = 2;
    const raw = role.gods[godIdx];
    if (!raw) return false;
    return raw.startsWith('_');
}

// Returns the greeting string for a role
export function greetingForRole(roleIdx) {
    const role = roles[roleIdx];
    return role ? role.greeting : 'Hello';
}

// Returns the role name, using female variant if applicable
export function roleNameForGender(roleIdx, female) {
    const role = roles[roleIdx];
    if (!role) return 'Adventurer';
    if (female && role.namef) return role.namef;
    return role.name;
}

// Returns the alignment name string
export function alignName(alignValue) {
    if (alignValue > 0) return 'lawful';
    if (alignValue < 0) return 'chaotic';
    return 'neutral';
}

// C ref: role.c roles[].initrecord
export function initialAlignmentRecordForRole(roleIndex) {
    switch (roleIndex) {
        case 0:  // Archeologist
        case 1:  // Barbarian
        case 2:  // Caveman/Cavewoman
        case 3:  // Healer
        case 4:  // Knight
        case 5:  // Monk
        case 7:  // Rogue
        case 8:  // Ranger
        case 9:  // Samurai
            return 10;
        default:
            return 0;
    }
}

// Lore text template -- from quest.lua
// Substitutions: %d=deity name, %G=god/goddess, %r=rank title
const LORE_TEXT_TEMPLATE = `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, a newly trained %r, have been heralded
from birth as the instrument of %d.  You are destined
to recover the Amulet for your deity, or die in the
attempt.  Your hour of destiny has come.  For the sake
of us all:  Go bravely with %d!`;

// Format lore text with specific values
export function formatLoreText(deityName, godOrGoddess, rankTitle) {
    return LORE_TEXT_TEMPLATE
        .replace(/%d/g, deityName)
        .replace(/%G/g, godOrGoddess)
        .replace(/%r/g, rankTitle);
}


// cf. role.c RS_ROLE, RS_RACE, RS_GENDER, RS_ALGNMNT, RS_filter
const RS_ROLE = 0;
const RS_RACE = 1;
const RS_GENDER = 2;
const RS_ALGNMNT = 3;
const RS_filter = 4;

// Number of genders (male, female) and alignments (lawful, neutral, chaotic)
const ROLE_GENDERS = 2;
const ROLE_ALIGNS = 3;

// C genders[i] data for str2gend matching
// genders[0] = {adj:"male", filecode:"Mal"}, genders[1] = {adj:"female", filecode:"Fem"}
const genderData = [
    { adj: 'male', filecode: 'Mal' },
    { adj: 'female', filecode: 'Fem' },
];

// C aligns[i] data for str2align matching and alignment value lookup
// aligns[0] = {adj:"lawful", filecode:"Law", value:A_LAWFUL}
// aligns[1] = {adj:"neutral", filecode:"Neu", value:A_NEUTRAL}
// aligns[2] = {adj:"chaotic", filecode:"Cha", value:A_CHAOTIC}
const alignData = [
    { adj: 'lawful', filecode: 'Law', value: A_LAWFUL },
    { adj: 'neutral', filecode: 'Neu', value: A_NEUTRAL },
    { adj: 'chaotic', filecode: 'Cha', value: A_CHAOTIC },
];

// Race filecodes for str2race matching
const raceFilecodes = ['Hum', 'Elf', 'Dwa', 'Gno', 'Orc'];

// Map race index to PM_ constant (for character_race)
const racePMIndex = [PM_HUMAN, PM_ELF, PM_DWARF, PM_GNOME, PM_ORC];

// ---- Helper: alignment index (0,1,2) <-> alignment value (A_LAWFUL,A_NEUTRAL,A_CHAOTIC) ----
// C aligns[0].value = A_LAWFUL, aligns[1].value = A_NEUTRAL, aligns[2].value = A_CHAOTIC
function alignIndexToValue(idx) {
    return alignData[idx] ? alignData[idx].value : undefined;
}
function alignValueToIndex(val) {
    for (let i = 0; i < alignData.length; i++) {
        if (alignData[i].value === val) return i;
    }
    return -1;
}

// ---- Helper: check if a role allows a given gender ----
// C uses bitmask ROLE_MALE/ROLE_FEMALE; JS uses role.forceGender
function roleAllowsGender(roleIdx, gendnum) {
    const role = roles[roleIdx];
    if (!role) return false;
    if (gendnum === MALE) return role.forceGender !== 'female';
    if (gendnum === FEMALE) return role.forceGender !== 'male';
    return false;
}

// ---- Helper: check if a race allows a given gender ----
// In C, all races allow both genders. JS races don't restrict gender.
function raceAllowsGender(raceIdx, gendnum) {
    // All races allow both genders in NetHack 3.7
    return gendnum === MALE || gendnum === FEMALE;
}

// ---- Helper: check if a role allows a given alignment value ----
function roleAllowsAlign(roleIdx, alignValue) {
    const role = roles[roleIdx];
    if (!role) return false;
    return role.validAligns.includes(alignValue);
}

// ---- Helper: check if a race allows a given alignment value ----
function raceAllowsAlign(raceIdx, alignValue) {
    const race = races[raceIdx];
    if (!race) return false;
    return race.validAligns.includes(alignValue);
}

// ---- Helper: check if a role allows a given race ----
function roleAllowsRace(roleIdx, raceIdx) {
    const role = roles[roleIdx];
    if (!role) return false;
    return role.validRaces.includes(raceIdx);
}

// ---- Helper: case-insensitive prefix match (like C strncmpi) ----
function strncmpi(a, b, len) {
    return a.substring(0, len).toLowerCase() === b.substring(0, len).toLowerCase();
}
function strcmpi(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

// ============================================================================
// cf. role.c:30 [data] — roles[]: player role definition table
// JS equiv: player.js — JS roles array with adapted structure.
// DONE: role.c:30 — roles[] ↔ player.js roles array

// ============================================================================
// cf. role.c — validrole(rolenum): is rolenum a valid role index?
// Returns true for 0 <= rolenum < roles.length.
// cf. role.c:713
export function validrole(rolenum) {
    return rolenum >= 0 && rolenum < roles.length;
}

// cf. role.c — randrole(for_display): random role index
// for_display=true: use display RNG; else normal rn2().
// cf. role.c:719
export function randrole(for_display) {
    const n = roles.length;
    if (for_display) return rn2_on_display_rng(n);
    return rn2(n);
}

// cf. role.c — randrole_filtered(): random role passing all filters
// Excludes roles blocked by setrolefilter() constraints.
// cf. role.c:731
// Note: requires a game object with rfilter for filter checks.
// When called without game context, falls back to simple randrole.
export function randrole_filtered(game) {
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, ROLE_NONE, ROLE_NONE, ROLE_NONE, game)
            && ok_race(i, ROLE_RANDOM, ROLE_NONE, ROLE_NONE, game)
            && ok_gend(i, ROLE_NONE, ROLE_RANDOM, ROLE_NONE, game)
            && ok_align(i, ROLE_NONE, ROLE_NONE, ROLE_RANDOM, game))
            set.push(i);
    }
    return set.length ? set[rn2(set.length)] : randrole(false);
}

// cf. role.c — str2role(str): parse string to role index
// Matches name, namef, filecode (e.g., "Bar"), or '*'/'@' for random.
// Returns role index or ROLE_NONE / ROLE_RANDOM.
// cf. role.c:747
export function str2role(str) {
    if (!str || !str.length) return ROLE_NONE;
    const len = str.length;
    for (let i = 0; i < roles.length; i++) {
        // Match male name?
        if (strncmpi(str, roles[i].name, len)) return i;
        // Match female name?
        if (roles[i].namef && strncmpi(str, roles[i].namef, len)) return i;
        // Match filecode (abbr)?
        if (strcmpi(str, roles[i].abbr)) return i;
    }
    if ((len === 1 && (str === '*' || str === '@'))
        || strncmpi(str, 'random', len))
        return ROLE_RANDOM;
    return ROLE_NONE;
}

// cf. role.c — validrace(rolenum, racenum): is race valid for role?
// cf. role.c:778
export function validrace(rolenum, racenum) {
    if (racenum < 0 || racenum >= races.length) return false;
    return roleAllowsRace(rolenum, racenum);
}

// cf. role.c — randrace(rolenum): random race valid for role
// cf. role.c:787
export function randrace(rolenum) {
    let n = 0;
    for (let i = 0; i < races.length; i++) {
        if (roleAllowsRace(rolenum, i)) n++;
    }
    // Use factor of 100 in case of bad random number generators (matches C)
    if (n) n = Math.floor(rn2(n * 100) / 100);
    for (let i = 0; i < races.length; i++) {
        if (roleAllowsRace(rolenum, i)) {
            if (n) n--;
            else return i;
        }
    }
    // Fallback: no permitted races
    return rn2(races.length);
}

// cf. role.c — str2race(str): parse string to race index
// Matches noun, adjective, filecode, or '*'/'@' for random.
// cf. role.c:813
export function str2race(str) {
    if (!str || !str.length) return ROLE_NONE;
    const len = str.length;
    for (let i = 0; i < races.length; i++) {
        // Match noun?
        if (strncmpi(str, races[i].name, len)) return i;
        // Match adjective?
        if (races[i].adj && strncmpi(str, races[i].adj, len)) return i;
        // Match filecode?
        if (raceFilecodes[i] && strcmpi(str, raceFilecodes[i])) return i;
    }
    if ((len === 1 && (str === '*' || str === '@'))
        || strncmpi(str, 'random', len))
        return ROLE_RANDOM;
    return ROLE_NONE;
}

// cf. role.c — validgend(rolenum, racenum, gendnum): is gender valid?
// cf. role.c:844
// Autotranslated from role.c:843
export function validgend(rolenum, racenum, gendnum) {
  return (gendnum >= 0 && gendnum < ROLE_GENDERS && (roles[rolenum].allow & races[racenum].allow & genders[gendnum].allow & ROLE_GENDMASK));
}

// cf. role.c — randgend(rolenum, racenum): random gender for role/race
// cf. role.c:853
// Autotranslated from role.c:852
export function randgend(rolenum, racenum) {
  let i, n = 0;
  for (i = 0; i < ROLE_GENDERS; i++) {
    if (roles[rolenum].allow & races[racenum].allow & genders[i].allow & ROLE_GENDMASK) n++;
  }
  if (n) n = rn2(n);
  for (i = 0; i < ROLE_GENDERS; i++) {
    if (roles[rolenum].allow & races[racenum].allow & genders[i].allow & ROLE_GENDMASK) {
      if (n) n--;
      else {
        return i;
      }
    }
  }
  return rn2(ROLE_GENDERS);
}

// cf. role.c — str2gend(str): parse string to gender index
// Matches "male"/"female" prefix or filecode 'Mal'/'Fem', or '*'/'@' for random.
// cf. role.c:880
export function str2gend(str) {
    if (!str || !str.length) return ROLE_NONE;
    const len = str.length;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (strncmpi(str, genderData[i].adj, len)) return i;
        if (strcmpi(str, genderData[i].filecode)) return i;
    }
    if ((len === 1 && (str === '*' || str === '@'))
        || strncmpi(str, 'random', len))
        return ROLE_RANDOM;
    return ROLE_NONE;
}

// cf. role.c — validalign(rolenum, racenum, alignnum): is alignment valid?
// alignnum is an alignment index (0=lawful, 1=neutral, 2=chaotic)
// cf. role.c:907
// Autotranslated from role.c:906
export function validalign(rolenum, racenum, alignnum) {
  return (alignnum >= 0 && alignnum < ROLE_ALIGNS && (roles[rolenum].allow & races[racenum].allow & aligns[alignnum].allow & ROLE_ALIGNMASK));
}

// cf. role.c — randalign(rolenum, racenum): random alignment for role/race
// cf. role.c:916
// Autotranslated from role.c:915
export function randalign(rolenum, racenum) {
  let i, n = 0;
  for (i = 0; i < ROLE_ALIGNS; i++) {
    if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow & ROLE_ALIGNMASK) n++;
  }
  if (n) n = rn2(n);
  for (i = 0; i < ROLE_ALIGNS; i++) {
    if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow & ROLE_ALIGNMASK) {
      if (n) n--;
      else {
        return i;
      }
    }
  }
  return rn2(ROLE_ALIGNS);
}

// cf. role.c — str2align(str): parse string to alignment index
// Matches "lawful"/"neutral"/"chaotic" prefix or filecode 'Law'/'Neu'/'Cha',
// or '*'/'@' for random.
// cf. role.c:943
export function str2align(str) {
    if (!str || !str.length) return ROLE_NONE;
    const len = str.length;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (strncmpi(str, alignData[i].adj, len)) return i;
        if (strcmpi(str, alignData[i].filecode)) return i;
    }
    if ((len === 1 && (str === '*' || str === '@'))
        || strncmpi(str, 'random', len))
        return ROLE_RANDOM;
    return ROLE_NONE;
}

// ============================================================================
// ok_role / ok_race / ok_gend / ok_align — compatibility checks with filters
// These take an optional game parameter for rfilter access.

// cf. role.c — ok_role(rolenum, racenum, gendnum, alignnum): role compatible?
// Full cross-check: rolenum is valid AND compatible with race/gender/align.
// cf. role.c:971
export function ok_role(rolenum, racenum, gendnum, alignnum, game) {
    const rfilter = game ? game.rfilter : null;

    if (validrole(rolenum)) {
        if (rfilter && rfilter.roles[rolenum]) return false;
        const role = roles[rolenum];
        if (racenum >= 0 && racenum < races.length) {
            if (!role.validRaces.includes(racenum)) return false;
        }
        if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
            if (!roleAllowsGender(rolenum, gendnum)) return false;
        }
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
            const av = alignIndexToValue(alignnum);
            if (!role.validAligns.includes(av)) return false;
        }
        return true;
    } else {
        // random; check whether any selection is possible
        for (let i = 0; i < roles.length; i++) {
            if (rfilter && rfilter.roles[i]) continue;
            const role = roles[i];
            if (racenum >= 0 && racenum < races.length) {
                if (!role.validRaces.includes(racenum)) continue;
            }
            if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
                if (!roleAllowsGender(i, gendnum)) continue;
            }
            if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
                const av = alignIndexToValue(alignnum);
                if (!role.validAligns.includes(av)) continue;
            }
            return true;
        }
        return false;
    }
}

// cf. role.c — ok_race(rolenum, racenum, gendnum, alignnum): race compatible?
// cf. role.c:1037
export function ok_race(rolenum, racenum, gendnum, alignnum, game) {
    const rfilter = game ? game.rfilter : null;

    if (racenum >= 0 && racenum < races.length) {
        if (rfilter && rfilter.races[racenum]) return false;
        const race = races[racenum];
        if (validrole(rolenum)) {
            if (!roles[rolenum].validRaces.includes(racenum)) return false;
        }
        if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
            if (!raceAllowsGender(racenum, gendnum)) return false;
        }
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
            const av = alignIndexToValue(alignnum);
            if (!race.validAligns.includes(av)) return false;
        }
        return true;
    } else {
        // random; check whether any selection is possible
        for (let i = 0; i < races.length; i++) {
            if (rfilter && rfilter.races[i]) continue;
            const race = races[i];
            if (validrole(rolenum)) {
                if (!roles[rolenum].validRaces.includes(i)) continue;
            }
            if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
                if (!raceAllowsGender(i, gendnum)) continue;
            }
            if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
                const av = alignIndexToValue(alignnum);
                if (!race.validAligns.includes(av)) continue;
            }
            return true;
        }
        return false;
    }
}

// cf. role.c — ok_gend(rolenum, racenum, gendnum, alignnum): gender compatible?
// Note: gender and alignment are not comparable (and also not constrainable)
// cf. role.c:1107
export function ok_gend(rolenum, racenum, gendnum, alignnum, game) {
    const rfilter = game ? game.rfilter : null;

    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (rfilter && rfilter.genders[gendnum]) return false;
        if (validrole(rolenum)) {
            if (!roleAllowsGender(rolenum, gendnum)) return false;
        }
        if (racenum >= 0 && racenum < races.length) {
            if (!raceAllowsGender(racenum, gendnum)) return false;
        }
        return true;
    } else {
        // random; check whether any selection is possible
        for (let i = 0; i < ROLE_GENDERS; i++) {
            if (rfilter && rfilter.genders[i]) continue;
            if (validrole(rolenum)) {
                if (!roleAllowsGender(rolenum, i)) continue;
            }
            if (racenum >= 0 && racenum < races.length) {
                if (!raceAllowsGender(racenum, i)) continue;
            }
            return true;
        }
        return false;
    }
}

// cf. role.c — ok_align(rolenum, racenum, gendnum, alignnum): alignment compatible?
// Note: alignment and gender are not comparable (and also not constrainable)
// cf. role.c:1172
export function ok_align(rolenum, racenum, gendnum, alignnum, game) {
    const rfilter = game ? game.rfilter : null;

    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        // rfilter.aligns is indexed [0,1,2] for [chaotic, neutral, lawful]
        // but we need alignnum (0=lawful, 1=neutral, 2=chaotic)
        if (rfilter) {
            const av = alignIndexToValue(alignnum);
            // rfilter.aligns: index = alignValue + 1 (A_CHAOTIC=-1 -> 0, A_NEUTRAL=0 -> 1, A_LAWFUL=1 -> 2)
            if (rfilter.aligns[av + 1]) return false;
        }
        const av = alignIndexToValue(alignnum);
        if (validrole(rolenum)) {
            if (!roles[rolenum].validAligns.includes(av)) return false;
        }
        if (racenum >= 0 && racenum < races.length) {
            if (!races[racenum].validAligns.includes(av)) return false;
        }
        return true;
    } else {
        // random; check whether any selection is possible
        for (let i = 0; i < ROLE_ALIGNS; i++) {
            if (rfilter) {
                const av = alignIndexToValue(i);
                if (rfilter.aligns[av + 1]) continue;
            }
            const av = alignIndexToValue(i);
            if (validrole(rolenum)) {
                if (!roles[rolenum].validAligns.includes(av)) continue;
            }
            if (racenum >= 0 && racenum < races.length) {
                if (!races[racenum].validAligns.includes(av)) continue;
            }
            return true;
        }
        return false;
    }
}

// ============================================================================
// pick_role / pick_race / pick_gend / pick_align

// cf. role.c — pick_role(racenum, gendnum, alignnum, pickhow): pick a role
// pickhow: PICK_RANDOM selects randomly; PICK_RIGID requires single possibility.
// cf. role.c:1015
export function pick_role(racenum, gendnum, alignnum, pickhow, game) {
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum, game)
            && ok_race(i, (racenum >= 0) ? racenum : ROLE_RANDOM, gendnum, alignnum, game)
            && ok_gend(i, racenum, (gendnum >= 0) ? gendnum : ROLE_RANDOM, alignnum, game)
            && ok_align(i, racenum, gendnum, (alignnum >= 0) ? alignnum : ROLE_RANDOM, game))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(set.length)];
}

// cf. role.c — pick_race(rolenum, gendnum, alignnum, pickhow): pick a race
// cf. role.c:1081
export function pick_race(rolenum, gendnum, alignnum, pickhow, game) {
    let races_ok = 0;
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum, game))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum, game)) {
            if (races_ok === 0) return i;
            else races_ok--;
        }
    }
    return ROLE_NONE;
}

// cf. role.c — pick_gend(rolenum, racenum, alignnum, pickhow): pick a gender
// cf. role.c:1146
// Autotranslated from role.c:1145
export function pick_gend(rolenum, racenum, alignnum, pickhow) {
  let i, gends_ok = 0;
  for (i = 0; i < ROLE_GENDERS; i++) {
    if (ok_gend(rolenum, racenum, i, alignnum)) gends_ok++;
  }
  if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID)) return ROLE_NONE;
  gends_ok = rn2(gends_ok);
  for (i = 0; i < ROLE_GENDERS; i++) {
    if (ok_gend(rolenum, racenum, i, alignnum)) {
      if (gends_ok === 0) return i;
      else {
        gends_ok--;
      }
    }
  }
  return ROLE_NONE;
}

// cf. role.c — pick_align(rolenum, racenum, gendnum, pickhow): pick an alignment
// cf. role.c:1211
export function pick_align(rolenum, racenum, gendnum, pickhow, game) {
    let aligns_ok = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i, game))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i, game)) {
            if (aligns_ok === 0) return i;
            else aligns_ok--;
        }
    }
    return ROLE_NONE;
}

// ============================================================================
// cf. role.c — rigid_role_checks(): auto-select forced role attributes
// If a role forces alignment (e.g., Monk must be neutral), sets it automatically.
// Called after plnamesuffix to resolve conflicts.
// cf. role.c:1235
//
// In C, this modifies flags.initrole/initrace/initgend/initalign.
// In JS, takes and modifies an init object { role, race, gend, align }.
// Autotranslated from role.c:1234
export function rigid_role_checks(game) {
  let tmp;
  if (game.flags.initrole === ROLE_RANDOM) {
    game.flags.initrole = pick_role(game.flags.initrace, game.flags.initgend, game.flags.initalign, PICK_RANDOM);
    if (game.flags.initrole < 0) game.flags.initrole = randrole_filtered();
  }
  if (game.flags.initrace === ROLE_RANDOM && (tmp = pick_race(game.flags.initrole, game.flags.initgend, game.flags.initalign, PICK_RANDOM)) !== ROLE_NONE) game.flags.initrace = tmp;
  if (game.flags.initalign === ROLE_RANDOM && (tmp = pick_align(game.flags.initrole, game.flags.initrace, game.flags.initgend, PICK_RANDOM)) !== ROLE_NONE) game.flags.initalign = tmp;
  if (game.flags.initgend === ROLE_RANDOM && (tmp = pick_gend(game.flags.initrole, game.flags.initrace, game.flags.initalign, PICK_RANDOM)) !== ROLE_NONE) game.flags.initgend = tmp;
  if (game.flags.initrole !== ROLE_NONE) {
    if (game.flags.initrace === ROLE_NONE) game.flags.initrace = pick_race(game.flags.initrole, game.flags.initgend, game.flags.initalign, PICK_RIGID);
    if (game.flags.initalign === ROLE_NONE) game.flags.initalign = pick_align(game.flags.initrole, game.flags.initrace, game.flags.initgend, PICK_RIGID);
    if (game.flags.initgend === ROLE_NONE) game.flags.initgend = pick_gend(game.flags.initrole, game.flags.initrace, game.flags.initalign, PICK_RIGID);
  }
}

// ============================================================================
// Filter system: setrolefilter / gotrolefilter / rolefilterstring / clearrolefilter

// cf. role.c — setrolefilter(bufp): add role/race/gender/alignment exclusion filter
// cf. role.c:1284
// Autotranslated from role.c:1283
export function setrolefilter(bufp) {
  let i, reslt = true;
  if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) gr.rfilter.roles[i] = true;
  else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
    gr.rfilter.mask |= races[i].selfmask;
  }
  else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
    gr.rfilter.mask |= genders[i].allow;
  }
  else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) {
    gr.rfilter.mask |= aligns[i].allow;
  }
  else {
    reslt = false;
  }
  return reslt;
}

// cf. role.c — gotrolefilter(): are any filters active?
// cf. role.c:1303
export function gotrolefilter(game) {
    if (!game || !game.rfilter) return false;
    const rfilter = game.rfilter;
    if (rfilter.races.some(Boolean)) return true;
    if (rfilter.genders.some(Boolean)) return true;
    if (rfilter.aligns.some(Boolean)) return true;
    for (let i = 0; i < roles.length; i++) {
        if (rfilter.roles[i]) return true;
    }
    return false;
}

// cf. role.c — rolefilterstring(which): build filter string for saving
// Encodes current filters as a string for options file storage.
// cf. role.c:1318
export function rolefilterstring(which, game) {
    if (!game || !game.rfilter) return '';
    const rfilter = game.rfilter;
    let parts = [];
    switch (which) {
    case RS_ROLE:
        for (let i = 0; i < roles.length; i++) {
            if (rfilter.roles[i])
                parts.push('!' + roles[i].name.substring(0, 3));
        }
        break;
    case RS_RACE:
        for (let i = 0; i < races.length; i++) {
            if (rfilter.races[i])
                parts.push('!' + races[i].name);
        }
        break;
    case RS_GENDER:
        for (let i = 0; i < ROLE_GENDERS; i++) {
            if (rfilter.genders[i])
                parts.push('!' + genderData[i].adj);
        }
        break;
    case RS_ALGNMNT:
        for (let i = 0; i < ROLE_ALIGNS; i++) {
            const av = alignIndexToValue(i);
            if (rfilter.aligns[av + 1])
                parts.push('!' + alignData[i].adj);
        }
        break;
    default:
        return '?';
    }
    return parts.join(' ');
}

// cf. role.c — clearrolefilter(which): clear filter category
// cf. role.c:1358
export function clearrolefilter(which, game) {
    if (!game || !game.rfilter) return;
    const rfilter = game.rfilter;
    switch (which) {
    case RS_filter:
        // Clear race, gender, and alignment filters, then fall through to roles
        rfilter.races.fill(false);
        rfilter.genders.fill(false);
        rfilter.aligns.fill(false);
        // fall through
    case RS_ROLE:
        rfilter.roles.fill(false);
        break;
    case RS_RACE:
        rfilter.races.fill(false);
        break;
    case RS_GENDER:
        rfilter.genders.fill(false);
        break;
    case RS_ALGNMNT:
        rfilter.aligns.fill(false);
        break;
    }
}

// ============================================================================
// Prompt building helpers

// cf. role.c [static] — promptsep(buf, num_post_attribs): grammatical separator
// cf. role.c:1384
// In JS, returns the separator string to append.
// Uses a mutable state object for role_post_attribs counter.
export function promptsep(state, num_post_attribs) {
    let sep = '';
    if (num_post_attribs > 1 && state.role_post_attribs < num_post_attribs
        && state.role_post_attribs > 1)
        sep += ',';
    sep += ' ';
    --state.role_post_attribs;
    if (!state.role_post_attribs && num_post_attribs > 1)
        sep += 'and ';
    return sep;
}

// cf. role.c — role_gendercount(rolenum): count valid genders for role
// cf. role.c:1399
// Autotranslated from role.c:1398
export function role_gendercount(rolenum) {
  let gendcount = 0;
  if (validrole(rolenum)) {
    if (roles[rolenum].allow & ROLE_MALE) ++gendcount;
    if (roles[rolenum].allow & ROLE_FEMALE) ++gendcount;
    if (roles[rolenum].allow & ROLE_NEUTER) ++gendcount;
  }
  return gendcount;
}

// cf. role.c — race_alignmentcount(racenum): count valid alignments for race
// cf. role.c:1415
// Autotranslated from role.c:1414
export function race_alignmentcount(racenum) {
  let aligncount = 0;
  if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
    if (races[racenum].allow & ROLE_CHAOTIC) ++aligncount;
    if (races[racenum].allow & ROLE_LAWFUL) ++aligncount;
    if (races[racenum].allow & ROLE_NEUTRAL) ++aligncount;
  }
  return aligncount;
}

// cf. role.c — root_plselection_prompt(): core prompt string
// Builds core description of chosen attributes for selection prompt.
// cf. role.c:1431
export function root_plselection_prompt(rolenum, racenum, gendnum, alignnum, game) {
    let buf = '';
    let donefirst = false;
    const state = { role_post_attribs: 0, role_pa: [0, 0, 0, 0] };
    // BP_ALIGN=0, BP_GEND=1, BP_RACE=2, BP_ROLE=3
    const BP_ALIGN = 0, BP_GEND = 1, BP_RACE = 2, BP_ROLE = 3;

    // How many alignments for desired race?
    let aligncount = 0;
    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
        aligncount = race_alignmentcount(racenum);

    if (alignnum !== ROLE_NONE && alignnum !== ROLE_RANDOM
        && ok_align(rolenum, racenum, gendnum, alignnum, game)) {
        if (donefirst) buf += ' ';
        buf += alignData[alignnum] ? alignData[alignnum].adj : '';
        donefirst = true;
    } else {
        if (alignnum !== ROLE_RANDOM) alignnum = ROLE_NONE;
        if ((((racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
              && ok_race(rolenum, racenum, gendnum, alignnum, game))
             && (aligncount > 1))
            || (racenum === ROLE_NONE || racenum === ROLE_RANDOM)) {
            state.role_pa[BP_ALIGN] = 1;
            state.role_post_attribs++;
        }
    }

    // Gender
    let gendercount = 0;
    if (validrole(rolenum))
        gendercount = role_gendercount(rolenum);

    if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
        if (validrole(rolenum)) {
            if (rolenum !== ROLE_NONE && gendercount > 1 && !roles[rolenum].namef) {
                if (donefirst) buf += ' ';
                buf += genderData[gendnum] ? genderData[gendnum].adj : '';
                donefirst = true;
            }
        } else {
            if (donefirst) buf += ' ';
            buf += genderData[gendnum] ? genderData[gendnum].adj : '';
            donefirst = true;
        }
    } else {
        if ((validrole(rolenum) && gendercount > 1) || !validrole(rolenum)) {
            state.role_pa[BP_GEND] = 1;
            state.role_post_attribs++;
        }
    }

    // Race
    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (validrole(rolenum) && ok_race(rolenum, racenum, gendnum, alignnum, game)) {
            if (donefirst) buf += ' ';
            buf += (rolenum === ROLE_NONE) ? races[racenum].name : races[racenum].adj;
            donefirst = true;
        } else if (!validrole(rolenum)) {
            if (donefirst) buf += ' ';
            buf += races[racenum].name;
            donefirst = true;
        } else {
            state.role_pa[BP_RACE] = 1;
            state.role_post_attribs++;
        }
    } else {
        state.role_pa[BP_RACE] = 1;
        state.role_post_attribs++;
    }

    // Role
    if (validrole(rolenum)) {
        if (donefirst) buf += ' ';
        if (gendnum !== ROLE_NONE) {
            if (gendnum === 1 && roles[rolenum].namef)
                buf += roles[rolenum].namef;
            else
                buf += roles[rolenum].name;
        } else {
            buf += roles[rolenum].name;
            if (roles[rolenum].namef) {
                buf += '/' + roles[rolenum].namef;
            }
        }
        donefirst = true;
    } else if (rolenum === ROLE_NONE) {
        state.role_pa[BP_ROLE] = 1;
        state.role_post_attribs++;
    }

    if ((racenum === ROLE_NONE || racenum === ROLE_RANDOM) && !validrole(rolenum)) {
        if (donefirst) buf += ' ';
        buf += 'character';
    }

    return { text: buf, state: state };
}

// cf. role.c — build_plselection_prompt(): complete selection prompt
// Builds complete "Shall I pick a character for you?" prompt.
// cf. role.c:1583
export function build_plselection_prompt(rolenum, racenum, gendnum, alignnum, game, init) {
    const BP_ALIGN = 0, BP_GEND = 1, BP_RACE = 2, BP_ROLE = 3;

    let tmpbuf = 'Shall I pick ';
    if (racenum !== ROLE_NONE || validrole(rolenum))
        tmpbuf += 'your ';
    else
        tmpbuf += 'a ';

    const result = root_plselection_prompt(rolenum, racenum, gendnum, alignnum, game);
    tmpbuf += result.text;

    // "pick a character" -> "pick character" (C ref: strsubst)
    tmpbuf = tmpbuf.replace('pick a character', 'pick character');

    // Apply possessive suffix (s_suffix)
    tmpbuf = s_suffix(tmpbuf);

    // Handle priest/priestess' -> priest/priestess's
    if (tmpbuf.endsWith("priest/priestess'"))
        tmpbuf += 's';

    let buf = tmpbuf;
    const state = result.state;

    let num_post_attribs = state.role_post_attribs;
    if (!num_post_attribs) {
        // Some constraints might have been mutually exclusive
        if (init) {
            if (init.role === ROLE_NONE && !state.role_pa[BP_ROLE])
                state.role_pa[BP_ROLE] = ++state.role_post_attribs;
            if (init.race === ROLE_NONE && !state.role_pa[BP_RACE])
                state.role_pa[BP_RACE] = ++state.role_post_attribs;
            if (init.align === ROLE_NONE && !state.role_pa[BP_ALIGN])
                state.role_pa[BP_ALIGN] = ++state.role_post_attribs;
            if (init.gend === ROLE_NONE && !state.role_pa[BP_GEND])
                state.role_pa[BP_GEND] = ++state.role_post_attribs;
        }
        num_post_attribs = state.role_post_attribs;
    }
    if (num_post_attribs) {
        if (state.role_pa[BP_RACE]) {
            buf += promptsep(state, num_post_attribs);
            buf += 'race';
        }
        if (state.role_pa[BP_ROLE]) {
            buf += promptsep(state, num_post_attribs);
            buf += 'role';
        }
        if (state.role_pa[BP_GEND]) {
            buf += promptsep(state, num_post_attribs);
            buf += 'gender';
        }
        if (state.role_pa[BP_ALIGN]) {
            buf += promptsep(state, num_post_attribs);
            buf += 'alignment';
        }
    }
    buf += ' for you? [ynaq] ';
    return buf;
}

// Helper: possessive suffix (C's s_suffix)
function s_suffix(str) {
    if (!str || !str.length) return str;
    if (str.endsWith('s') || str.endsWith('S'))
        return str + "'";
    return str + "'s";
}

// ============================================================================
// cf. role.c — plnamesuffix(): parse player name suffix tokens
// Parses role/race/gender/alignment suffixes from player name (e.g., name-Bar-M-C).
// JS equiv: nethack.js:360 — partial name suffix parsing in askname flow.
// DONE: role.c — plnamesuffix() ↔ nethack.js:360 (implemented there)

// cf. role.c — role_selection_prolog(which, where): display current selections
// Shows current name/role/race/gender/alignment settings in the selection window.
// This is a UI function for TTY/curses. In JS, character creation is handled
// differently via chargen.js. Stub provided for completeness.
// cf. role.c:1726
export function role_selection_prolog(which, init, plname) {
    // Returns an array of display lines showing current selection state
    const choosing = ' choosing now';
    const not_yet = ' not yet specified';
    const rand_choice = ' random';
    const lines = [];

    let r = init.role;
    let c = init.race;
    let gend = init.gend;
    let a = init.align;

    if (r >= 0) {
        const role = roles[r];
        if (role.validRaces.length === 1 && role.validRaces[0] === RACE_HUMAN)
            c = RACE_HUMAN;
        else if (c >= 0 && c < races.length && !role.validRaces.includes(c))
            c = ROLE_RANDOM;
        if (role.forceGender === 'male') gend = MALE;
        else if (role.forceGender === 'female') gend = FEMALE;
        if (role.validAligns.length === 1) {
            const val = role.validAligns[0];
            a = alignValueToIndex(val);
        }
    }
    if (c >= 0 && c < races.length) {
        const race = races[c];
        if (race.validAligns.length === 1)
            a = alignValueToIndex(race.validAligns[0]);
    }

    const nameStr = (which === RS_ROLE) ? choosing
        : (!plname ? not_yet : plname);
    lines.push('       name: ' + nameStr);

    let roleStr;
    if (which === RS_ROLE) roleStr = choosing;
    else if (r === ROLE_NONE) roleStr = not_yet;
    else if (r === ROLE_RANDOM) roleStr = rand_choice;
    else {
        roleStr = roles[r].name;
        if (roles[r].namef) {
            if (gend === FEMALE) roleStr = roles[r].namef;
            else if (gend < 0) roleStr = roles[r].name + '/' + roles[r].namef;
        }
    }
    lines.push('       role: ' + roleStr);

    let raceStr;
    if (which === RS_RACE) raceStr = choosing;
    else if (c === ROLE_NONE) raceStr = not_yet;
    else if (c === ROLE_RANDOM) raceStr = rand_choice;
    else raceStr = races[c].name;
    lines.push('       race: ' + raceStr);

    let gendStr;
    if (which === RS_GENDER) gendStr = choosing;
    else if (gend === ROLE_NONE) gendStr = not_yet;
    else if (gend === ROLE_RANDOM) gendStr = rand_choice;
    else gendStr = genderData[gend].adj;
    lines.push('     gender: ' + gendStr);

    let alignStr;
    if (which === RS_ALGNMNT) alignStr = choosing;
    else if (a === ROLE_NONE) alignStr = not_yet;
    else if (a === ROLE_RANDOM) alignStr = rand_choice;
    else alignStr = alignData[a] ? alignData[a].adj : not_yet;
    lines.push('  alignment: ' + alignStr);

    return lines;
}

// cf. role.c — role_menu_extra(which, where, preselect): add special menu entries
// This is a UI function for TTY/curses menus. In JS, chargen handles this.
// Stub provided for completeness. Returns menu entry descriptors.
// cf. role.c:1816
export function role_menu_extra(which, init, game) {
    // Returns { type, label, disabled, forcedBy } describing the menu extra entry
    const r = init.role;
    const c = init.race;
    const rfilter = game ? game.rfilter : null;

    switch (which) {
    case RS_ROLE: {
        if (rfilter) {
            let onlyOne = true;
            for (let i = 0; i < roles.length; i++) {
                if (i !== r && !rfilter.roles[i]) { onlyOne = false; break; }
            }
            if (onlyOne)
                return { type: 'forced', label: 'filter forces role' };
        }
        return { type: 'pick', label: 'Pick' + (r >= 0 ? ' another' : '') + ' role first' };
    }
    case RS_RACE: {
        if (r >= 0) {
            const role = roles[r];
            if (role.validRaces.length === 1) {
                return { type: 'forced', label: 'role forces ' + races[role.validRaces[0]].name };
            }
        }
        return { type: 'pick', label: 'Pick' + (c >= 0 ? ' another' : '') + ' race first' };
    }
    case RS_GENDER: {
        if (r >= 0) {
            const role = roles[r];
            if (role.forceGender) {
                return { type: 'forced', label: 'role forces ' + role.forceGender };
            }
        }
        return { type: 'pick', label: 'Pick' + (init.gend >= 0 ? ' another' : '') + ' gender first' };
    }
    case RS_ALGNMNT: {
        if (r >= 0 && roles[r].validAligns.length === 1) {
            const av = roles[r].validAligns[0];
            const ai = alignValueToIndex(av);
            return { type: 'forced', label: 'role forces ' + alignData[ai].adj };
        }
        if (c >= 0 && c < races.length && races[c].validAligns.length === 1) {
            const av = races[c].validAligns[0];
            const ai = alignValueToIndex(av);
            return { type: 'forced', label: 'race forces ' + alignData[ai].adj };
        }
        return { type: 'pick', label: 'Pick' + (init.align >= 0 ? ' another' : '') + ' alignment first' };
    }
    default:
        return { type: 'unknown' };
    }
}

// cf. role.c — role_init(): initialize and validate final role choice
// JS equiv: nethack.js:1126 + u_init.js:891 (partial — Priest god assignment + skill remapping).
// DONE: role.c — role_init() ↔ nethack.js:1126 + u_init.js:891 (implemented there)

// cf. role.c — Hello(mtmp): role-specific greeting string
// JS equiv: player.js:325 — returns role.greeting from roles array.
// DONE: role.c — Hello() ↔ player.js:374

// cf. role.c — Goodbye(): role-specific farewell string
// JS equiv: nethack.js:1914 — inlined farewell message.
// DONE: role.c — Goodbye() ↔ nethack.js:1914

// ============================================================================
// cf. role.c — character_race(pmindex): race struct for player monster type
// Returns the races[] entry for a given monster PM index, or null.
// cf. role.c:2163
export function character_race(pmindex) {
    for (let i = 0; i < races.length; i++) {
        if (racePMIndex[i] === pmindex)
            return races[i];
    }
    return null;
}

// cf. role.c — genl_player_selection(): entry point for player selection UI
// JS equiv: nethack.js character creation flow (chargen.js).
// DONE: role.c — genl_player_selection() ↔ chargen.js char creation

// cf. role.c — genl_player_setup(screenheight): main selection menu interface
// JS equiv: chargen.js character creation flow.
// DONE: role.c — genl_player_setup() ↔ chargen.js char creation

// cf. role.c — reset_role_filtering(): interactive filter reset menu
// In JS, filter management is handled in chargen.js.
// Stub that clears all filters.
// cf. role.c:2728
export function reset_role_filtering(game) {
    clearrolefilter(RS_filter, game);
}

// cf. role.c [static] — maybe_skip_seps(rows, aspect): skip separators for menu fit
// TTY-specific menu fitting calculation. Not needed in JS web UI.
// cf. role.c:2777
export function maybe_skip_seps(rows, aspect) {
    // In C, calculates how many separator lines to skip to fit menu.
    // In JS web UI, scrolling handles this. Return 0 (skip none).
    return 0;
}

// cf. role.c [static] — plsel_startmenu(ttyrows, aspect): create selection menu window
// TTY-specific menu initialization. Not needed in JS web UI.
// cf. role.c:2806
export function plsel_startmenu(ttyrows, aspect) {
    // In JS, menu creation is handled by chargen.js.
    // Stub returns null.
    return null;
}

// cf. role.c — setup_rolemenu(win, filtering, race, gend, algn): populate role menu
// Returns array of available role choices filtered by constraints.
// cf. role.c setup_rolemenu
export function setup_rolemenu(filtering, racenum, gendnum, alignnum, game) {
    const entries = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum, game)) {
            const role = roles[i];
            let name = role.name;
            if (filtering && gendnum === FEMALE && role.namef)
                name = role.namef;
            entries.push({ index: i, name: name, ch: role.menuChar });
        }
    }
    return entries;
}

// cf. role.c — setup_racemenu(win, filtering, role, gend, algn): populate race menu
export function setup_racemenu(filtering, rolenum, gendnum, alignnum, game) {
    const entries = [];
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum, game)) {
            entries.push({ index: i, name: races[i].name, ch: races[i].menuChar });
        }
    }
    return entries;
}

// cf. role.c — setup_gendmenu(win, filtering, role, race, algn): populate gender menu
export function setup_gendmenu(filtering, rolenum, racenum, alignnum, game) {
    const entries = [];
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum, game)) {
            entries.push({ index: i, name: genderData[i].adj, ch: genderData[i].adj[0] });
        }
    }
    return entries;
}

// cf. role.c — setup_algnmenu(win, filtering, role, race, gend): populate alignment menu
export function setup_algnmenu(filtering, rolenum, racenum, gendnum, game) {
    const entries = [];
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i, game)) {
            entries.push({ index: i, name: alignData[i].adj, ch: alignData[i].adj[0] });
        }
    }
    return entries;
}

// ============================================================================
export { alignData, genderData, racePMIndex };
export { alignIndexToValue, alignValueToIndex };

// Autotranslated from role.c:2176
export function genl_player_selection() {
  if (genl_player_setup(0)) return;
  nh_terminate(EXIT_SUCCESS);
}
