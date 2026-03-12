// spell.js -- Spell knowledge, casting, and retention
// cf. spell.c — spelleffects, learn, docast, spelltypemnemonic,
//               spell_skilltype, age_spells, study_book, check_unpaid,
//               spell_skilltype, getspell, dospellmenu
//
// spell.c handles spell learning, retention, and casting:
//   docast(): #cast command — select and cast a known spell.
//   learn(): learn a spell from a spellbook.
//   age_spells(): decrement spell retention each turn.
//   getspell(): prompt user to select a spell.
//   dospellmenu(): display spell menu UI.

import { A_INT, A_WIS, A_STR, IS_STWALL, IS_OBSTRUCTED, SIZE, nul_glyphinfo, P_CLERIC_SPELL, P_UNSKILLED } from './const.js';
import { PM_KNIGHT, PM_WIZARD } from './monsters.js';
import { Role_if } from './role.js';
import { mark_vision_dirty, cansee } from './vision.js';
import { docrt } from './display.js';
import {
    SPBOOK_CLASS,
    objectData, ROBE, QUARTERSTAFF, SMALL_SHIELD, LENSES,
    SPE_DIG, SPE_MAGIC_MISSILE, SPE_FIREBALL, SPE_CONE_OF_COLD,
    SPE_SLEEP, SPE_FINGER_OF_DEATH, SPE_LIGHT, SPE_DETECT_MONSTERS,
    SPE_HEALING, SPE_KNOCK, SPE_FORCE_BOLT, SPE_CONFUSE_MONSTER,
    SPE_CURE_BLINDNESS, SPE_DRAIN_LIFE, SPE_SLOW_MONSTER,
    SPE_WIZARD_LOCK, SPE_CREATE_MONSTER, SPE_DETECT_FOOD,
    SPE_CAUSE_FEAR, SPE_CLAIRVOYANCE, SPE_CURE_SICKNESS,
    SPE_CHARM_MONSTER, SPE_HASTE_SELF, SPE_DETECT_UNSEEN,
    SPE_LEVITATION, SPE_EXTRA_HEALING, SPE_RESTORE_ABILITY,
    SPE_INVISIBILITY, SPE_DETECT_TREASURE, SPE_REMOVE_CURSE,
    SPE_MAGIC_MAPPING, SPE_IDENTIFY, SPE_TURN_UNDEAD,
    SPE_POLYMORPH, SPE_TELEPORT_AWAY, SPE_CREATE_FAMILIAR,
    SPE_CANCELLATION, SPE_PROTECTION, SPE_JUMPING,
    SPE_STONE_TO_FLESH, SPE_CHAIN_LIGHTNING,
    SPE_BLANK_PAPER, SPE_NOVEL, SPE_BOOK_OF_THE_DEAD,
    NODIR,
} from './objects.js';
import { discover_object } from './o_init.js';
import { is_metallic } from './objdata.js';
import { is_undead, is_vampshifter } from './mondata.js';
import { nhgetch } from './input.js';
import { getdir } from './hack.js';
import { mksobj } from './mkobj.js';
import { weffects } from './zap.js';
import { create_nhwindow, destroy_nhwindow, add_menu, end_menu, select_menu } from './windows.js';
import { NHW_MENU, ATR_NONE, PICK_ONE, NO_COLOR, MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED } from './const.js';
import { rn2, rnd, rn1, rnl } from './rng.js';
import { pline, You, Your, You_feel, pline_The, You_hear } from './pline.js';
import { exercise } from './attrib_exercise.js';
import { acurr } from './attrib.js';
import { P_SKILL } from './weapon.js';
import { tmp_at, nh_delay_output } from './animation.js';
import { DISP_BEAM, DISP_CHANGE, DISP_END, CONFUSION, STUNNED } from './const.js';
import { incr_itimeout, make_confused, make_stunned } from './potion.js';
import { getpos_sethilite, getpos_async } from './getpos.js';

// ── Constants ──

// C ref: spell.c KEEN — spell retention threshold
const KEEN = 20000;
const SPELL_SKILL_UNSKILLED = 1;
const SPELL_SKILL_BASIC = 2;

// C ref: spell.h
const NO_SPELL = 0;
const UNKNOWN_SPELL = -1;
const MAX_SPELL_STUDY = 3;
const MAXSPELL = 52; // a-zA-Z

// C ref: spell.h SPELL_LEV_PW
function SPELL_LEV_PW(lvl) { return lvl * 5; }

// spellmenu arguments
const SPELLMENU_CAST = -2;
const SPELLMENU_VIEW = -1;

// NODIR imported from objects.js

const SPELL_CATEGORY_ATTACK = 'attack';
const SPELL_CATEGORY_HEALING = 'healing';
const SPELL_CATEGORY_DIVINATION = 'divination';
const SPELL_CATEGORY_ENCHANTMENT = 'enchantment';
const SPELL_CATEGORY_CLERICAL = 'clerical';
const SPELL_CATEGORY_ESCAPE = 'escape';
const SPELL_CATEGORY_MATTER = 'matter';
const SPELL_TARGET_DIST = 10;
const CHAIN_LIGHTNING_DIRS = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
];

// C refs: src/spell.c spell_skilltype()/spelltypemnemonic(), include/objects.h SPELL().
const SPELL_CATEGORY_BY_NAME = new Map([
    ['dig', SPELL_CATEGORY_MATTER],
    ['magic missile', SPELL_CATEGORY_ATTACK],
    ['fireball', SPELL_CATEGORY_ATTACK],
    ['cone of cold', SPELL_CATEGORY_ATTACK],
    ['sleep', SPELL_CATEGORY_ENCHANTMENT],
    ['finger of death', SPELL_CATEGORY_ATTACK],
    ['light', SPELL_CATEGORY_DIVINATION],
    ['detect monsters', SPELL_CATEGORY_DIVINATION],
    ['healing', SPELL_CATEGORY_HEALING],
    ['knock', SPELL_CATEGORY_MATTER],
    ['force bolt', SPELL_CATEGORY_ATTACK],
    ['confuse monster', SPELL_CATEGORY_ENCHANTMENT],
    ['cure blindness', SPELL_CATEGORY_HEALING],
    ['drain life', SPELL_CATEGORY_ATTACK],
    ['slow monster', SPELL_CATEGORY_ENCHANTMENT],
    ['wizard lock', SPELL_CATEGORY_MATTER],
    ['create monster', SPELL_CATEGORY_CLERICAL],
    ['detect food', SPELL_CATEGORY_DIVINATION],
    ['cause fear', SPELL_CATEGORY_ENCHANTMENT],
    ['clairvoyance', SPELL_CATEGORY_DIVINATION],
    ['cure sickness', SPELL_CATEGORY_HEALING],
    ['charm monster', SPELL_CATEGORY_ENCHANTMENT],
    ['haste self', SPELL_CATEGORY_ESCAPE],
    ['detect unseen', SPELL_CATEGORY_DIVINATION],
    ['levitation', SPELL_CATEGORY_ESCAPE],
    ['extra healing', SPELL_CATEGORY_HEALING],
    ['restore ability', SPELL_CATEGORY_HEALING],
    ['invisibility', SPELL_CATEGORY_ESCAPE],
    ['detect treasure', SPELL_CATEGORY_DIVINATION],
    ['remove curse', SPELL_CATEGORY_CLERICAL],
    ['magic mapping', SPELL_CATEGORY_DIVINATION],
    ['identify', SPELL_CATEGORY_DIVINATION],
    ['turn undead', SPELL_CATEGORY_CLERICAL],
    ['polymorph', SPELL_CATEGORY_MATTER],
    ['teleport away', SPELL_CATEGORY_ESCAPE],
    ['create familiar', SPELL_CATEGORY_CLERICAL],
    ['cancellation', SPELL_CATEGORY_MATTER],
    ['protection', SPELL_CATEGORY_CLERICAL],
    ['jumping', SPELL_CATEGORY_ESCAPE],
    ['stone to flesh', SPELL_CATEGORY_HEALING],
    ['chain lightning', SPELL_CATEGORY_ATTACK],
]);

// C refs: src/role.c roles[] spell stats (spelbase/spelheal/spelshld/spelarmr/spelstat/spelspec/spelsbon).
const ROLE_SPELLCAST = new Map([
    [0, { spelbase: 5, spelheal: 0, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: 'magic mapping', spelsbon: -4 }],
    [1, { spelbase: 14, spelheal: 0, spelshld: 0, spelarmr: 8, spelstat: A_INT, spelspec: 'haste self', spelsbon: -4 }],
    [2, { spelbase: 12, spelheal: 0, spelshld: 1, spelarmr: 8, spelstat: A_INT, spelspec: 'dig', spelsbon: -4 }],
    [3, { spelbase: 3, spelheal: -3, spelshld: 2, spelarmr: 10, spelstat: A_WIS, spelspec: 'cure sickness', spelsbon: -4 }],
    [4, { spelbase: 8, spelheal: -2, spelshld: 0, spelarmr: 9, spelstat: A_WIS, spelspec: 'turn undead', spelsbon: -4 }],
    [5, { spelbase: 8, spelheal: -2, spelshld: 2, spelarmr: 20, spelstat: A_WIS, spelspec: 'restore ability', spelsbon: -4 }],
    [6, { spelbase: 3, spelheal: -2, spelshld: 2, spelarmr: 10, spelstat: A_WIS, spelspec: 'remove curse', spelsbon: -4 }],
    [7, { spelbase: 8, spelheal: 0, spelshld: 1, spelarmr: 9, spelstat: A_INT, spelspec: 'detect treasure', spelsbon: -4 }],
    [8, { spelbase: 9, spelheal: 2, spelshld: 1, spelarmr: 10, spelstat: A_INT, spelspec: 'invisibility', spelsbon: -4 }],
    [9, { spelbase: 10, spelheal: 0, spelshld: 0, spelarmr: 8, spelstat: A_INT, spelspec: 'clairvoyance', spelsbon: -4 }],
    [10, { spelbase: 5, spelheal: 1, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: 'charm monster', spelsbon: -4 }],
    [11, { spelbase: 10, spelheal: -2, spelshld: 0, spelarmr: 9, spelstat: A_WIS, spelspec: 'cone of cold', spelsbon: -4 }],
    [12, { spelbase: 1, spelheal: 0, spelshld: 3, spelarmr: 10, spelstat: A_INT, spelspec: 'magic missile', spelsbon: -4 }],
]);

const ROLE_BASIC_SPELL_CATEGORIES = new Map([
    [0, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_MATTER])],
    [1, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_ESCAPE])],
    [2, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_MATTER])],
    [3, new Set([SPELL_CATEGORY_HEALING])],
    [4, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_CLERICAL])],
    [5, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_CLERICAL, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER])],
    [6, new Set([SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_CLERICAL])],
    [7, new Set([SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER])],
    [8, new Set([SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ESCAPE])],
    [9, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_CLERICAL])],
    [10, new Set([SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_ESCAPE])],
    [11, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_ESCAPE])],
    // C ref: weapon.c skill_init_from_inventory() — wizards start basic in
    // attack and enchantment spell schools only.
    [12, new Set([SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_ENCHANTMENT])],
]);

const HEALING_BONUS_SPELLS = new Set([
    'healing',
    'extra healing',
    'cure blindness',
    'cure sickness',
    'restore ability',
    'remove curse',
]);

// Map from SPE_* otyp to the role spelspec name for reverse lookup
const SPE_TO_SPELSPEC = new Map([
    [SPE_MAGIC_MAPPING, 'magic mapping'],
    [SPE_HASTE_SELF, 'haste self'],
    [SPE_DIG, 'dig'],
    [SPE_CURE_SICKNESS, 'cure sickness'],
    [SPE_TURN_UNDEAD, 'turn undead'],
    [SPE_RESTORE_ABILITY, 'restore ability'],
    [SPE_REMOVE_CURSE, 'remove curse'],
    [SPE_DETECT_TREASURE, 'detect treasure'],
    [SPE_INVISIBILITY, 'invisibility'],
    [SPE_CLAIRVOYANCE, 'clairvoyance'],
    [SPE_CHARM_MONSTER, 'charm monster'],
    [SPE_CONE_OF_COLD, 'cone of cold'],
    [SPE_MAGIC_MISSILE, 'magic missile'],
]);

// ── Internal helpers ──

function spellCategoryForName(name) {
    return SPELL_CATEGORY_BY_NAME.get(String(name || '').toLowerCase()) || SPELL_CATEGORY_MATTER;
}

function spellSkillRank(player, category) {
    const basic = ROLE_BASIC_SPELL_CATEGORIES.get(player.roleIndex);
    return basic?.has(category) ? SPELL_SKILL_BASIC : SPELL_SKILL_UNSKILLED;
}

// C ref: spell.c spellet() — convert spell index to menu letter
function spellet(spell) {
    return spell < 26
        ? String.fromCharCode('a'.charCodeAt(0) + spell)
        : String.fromCharCode('A'.charCodeAt(0) + spell - 26);
}

// C ref: spell.c spell_let_to_idx() — convert menu letter to spell index
// Autotranslated from spell.c:114
export function spell_let_to_idx(ilet) {
  let indx;
  // C: char subtraction is integer arithmetic; JS needs charCodeAt
  const code = (typeof ilet === 'string') ? ilet.charCodeAt(0) : ilet;
  indx = code - 97; // 'a' = 97
  if (indx >= 0 && indx < 26) return indx;
  indx = code - 65; // 'A' = 65
  if (indx >= 0 && indx < 26) return indx + 26;
  return -1;
}

// Helper: get spell otyp from player.spells array at index
function spellid(player, idx) {
    const spells = player.spells;
    if (!spells || idx < 0 || idx >= spells.length) return NO_SPELL;
    return spells[idx].otyp || NO_SPELL;
}

// Helper: get spell knowledge at index
function spellknow(player, idx) {
    const spells = player.spells;
    if (!spells || idx < 0 || idx >= spells.length) return 0;
    return spells[idx].sp_know || 0;
}

// Helper: get spell level at index
function spellev(player, idx) {
    const spells = player.spells;
    if (!spells || idx < 0 || idx >= spells.length) return 0;
    return spells[idx].sp_lev || 0;
}

// Helper: get spell name at index
function spellname(player, idx) {
    const otyp = spellid(player, idx);
    if (otyp === NO_SPELL) return '';
    const od = objectData[otyp];
    return od ? od.oc_name : '';
}

// Helper: increment spell knowledge (C: incrnknow)
function incrnknow(player, idx, x) {
    const spells = player.spells;
    if (spells && idx >= 0 && idx < spells.length) {
        spells[idx].sp_know = KEEN + x;
    }
}

function spellRetentionText(turnsLeft, skillRank) {
    if (turnsLeft < 1) return '(gone)';
    if (turnsLeft >= KEEN) return '100%';
    const percent = Math.floor((turnsLeft - 1) / (KEEN / 100)) + 1;
    const accuracy = skillRank >= SPELL_SKILL_BASIC ? 10 : 25;
    const hi = Math.min(100, accuracy * Math.floor((percent + accuracy - 1) / accuracy));
    const lo = Math.max(1, hi - accuracy + 1);
    return `${lo}%-${hi}%`;
}

// C ref: spell.c percent_success() — calculate success chance for casting
function percent_success(player, spell_idx) {
    const spells = player.spells;
    if (!spells || spell_idx < 0 || spell_idx >= spells.length) return 0;

    const sp = spells[spell_idx];
    const otyp = sp.otyp;
    const od = objectData[otyp] || {};
    const spellName = String(od.oc_name || '').toLowerCase();
    const skilltype = Number(od.oc_subtyp || 0);
    const spellLevel = Math.max(1, Number(od.oc_oc2 || sp.sp_lev || 1));

    const role = ROLE_SPELLCAST.get(player.roleIndex)
        || { spelbase: 10, spelheal: 0, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: '', spelsbon: 0 };
    const statValue = Math.max(3, Math.min(25, Number(acurr(player, role.spelstat) || 10)));
    const heroLevel = Math.max(1, Number(player.ulevel || 1));

    // C ref: Role_if(PM_KNIGHT) && skilltype == P_CLERIC_SPELL
    const paladinBonus = player.roleMnum === PM_KNIGHT && skilltype === P_CLERIC_SPELL;
    const armor = player.armor || null;
    const cloak = player.cloak || null;
    const shield = player.shield || null;
    const helmet = player.helmet || null;
    const gloves = player.gloves || null;
    const boots = player.boots || null;
    const weapon = player.weapon || null;

    let splcaster = role.spelbase;
    if (armor && is_metallic(armor) && !paladinBonus) {
        splcaster += (cloak?.otyp === ROBE) ? Math.floor(role.spelarmr / 2) : role.spelarmr;
    } else if (cloak?.otyp === ROBE) {
        splcaster -= role.spelarmr;
    }
    if (shield) splcaster += role.spelshld;
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;
    if (!paladinBonus) {
        if (helmet && is_metallic(helmet)) splcaster += 4;  // uarmhbon
        if (gloves && is_metallic(gloves)) splcaster += 6;  // uarmgbon
        if (boots && is_metallic(boots)) splcaster += 2;    // uarmfbon
    }
    if (spellName === role.spelspec) splcaster += role.spelsbon;
    if (HEALING_BONUS_SPELLS.has(spellName)) splcaster += role.spelheal;
    if (splcaster > 20) splcaster = 20;

    let chance = Math.floor((11 * statValue) / 2);
    let skill = P_SKILL(skilltype);
    skill = Math.max(skill, P_UNSKILLED) - 1; // unskilled => 0
    const difficulty = (spellLevel - 1) * 4 - ((skill * 6) + Math.floor(heroLevel / 3) + 1);

    if (difficulty > 0) {
        chance -= Math.floor(Math.sqrt(900 * difficulty + 2000));
    } else {
        const learning = Math.floor(15 * -difficulty / spellLevel);
        chance += learning > 20 ? 20 : learning;
    }
    if (chance < 0) chance = 0;
    if (chance > 120) chance = 120;

    const shieldWeight = Number(objectData[shield?.otyp]?.oc_wt || 0);
    const smallShieldWeight = Number(objectData[SMALL_SHIELD]?.oc_wt || 40);
    if (shield && shieldWeight > smallShieldWeight) {
        if (spellName === role.spelspec) {
            chance = Math.floor(chance / 2);
        } else {
            chance = Math.floor(chance / 4);
        }
    }

    chance = Math.floor(chance * (20 - splcaster) / 15) - splcaster;
    if (chance > 100) chance = 100;
    if (chance < 0) chance = 0;
    return chance;
}

// Exported version for external use (UI display)
function estimateSpellFailPercent(player, spellName, spellLevel, category) {
    const role = ROLE_SPELLCAST.get(player.roleIndex)
        || { spelbase: 10, spelheal: 0, spelshld: 2, spelarmr: 10, spelstat: A_INT, spelspec: '', spelsbon: 0 };
    const statValue = Math.max(3, Math.min(25, Number(player.attributes?.[role.spelstat] || 10)));
    const spellSkill = spellSkillRank(player, category);
    const heroLevel = Math.max(1, Number(player.ulevel || 1));
    const spellLvl = Math.max(1, Number(spellLevel || 1));

    const paladinBonus = player.roleMnum === PM_KNIGHT && category === SPELL_CATEGORY_CLERICAL;
    const armor = player.armor || null;
    const cloak = player.cloak || null;
    const shield = player.shield || null;
    const helmet = player.helmet || null;
    const gloves = player.gloves || null;
    const boots = player.boots || null;
    const weapon = player.weapon || null;

    let splcaster = role.spelbase;
    if (armor && is_metallic(armor) && !paladinBonus) {
        splcaster += (cloak?.otyp === ROBE) ? Math.floor(role.spelarmr / 2) : role.spelarmr;
    } else if (cloak?.otyp === ROBE) {
        splcaster -= role.spelarmr;
    }
    if (shield) splcaster += role.spelshld;
    if (weapon?.otyp === QUARTERSTAFF) splcaster -= 3;
    if (!paladinBonus) {
        if (helmet && is_metallic(helmet)) splcaster += 4;
        if (gloves && is_metallic(gloves)) splcaster += 6;
        if (boots && is_metallic(boots)) splcaster += 2;
    }
    if (String(spellName || '').toLowerCase() === role.spelspec) splcaster += role.spelsbon;
    if (HEALING_BONUS_SPELLS.has(String(spellName || '').toLowerCase())) splcaster += role.spelheal;
    splcaster = Math.min(20, splcaster);

    let chance = Math.floor((11 * statValue) / 2);
    const skill = Math.max(spellSkill, SPELL_SKILL_UNSKILLED) - 1;
    const difficulty = ((spellLvl - 1) * 4) - ((skill * 6) + Math.floor(heroLevel / 3) + 1);
    if (difficulty > 0) {
        chance -= Math.floor(Math.sqrt((900 * difficulty) + 2000));
    } else {
        chance += Math.min(20, Math.floor((15 * -difficulty) / spellLvl));
    }
    chance = Math.max(0, Math.min(120, chance));

    const shieldWeight = Number(objectData[shield?.otyp]?.oc_wt || 0);
    const smallShieldWeight = Number(objectData[SMALL_SHIELD]?.oc_wt || 40);
    if (shield && shieldWeight > smallShieldWeight) {
        chance = (String(spellName || '').toLowerCase() === role.spelspec)
            ? Math.floor(chance / 2)
            : Math.floor(chance / 4);
    }

    chance = Math.floor((chance * (20 - splcaster)) / 15) - splcaster;
    chance = Math.max(0, Math.min(100, chance));
    return Math.max(0, Math.min(99, 100 - chance));
}

// ── Exported functions ──

// C ref: spell.c age_spells() — decrement spell retention each turn
export function ageSpells(player) {
    const spells = player.spells;
    if (!spells) return;
    for (const s of spells) {
        if (s.sp_know > 0) s.sp_know--;
    }
}

// C ref: spell.c dospellmenu() — display known spells
export async function handleKnownSpells(player, display) {
    const allKnownSpells = (player.spells || []).filter(s => s.sp_know > 0);
    if (allKnownSpells.length === 0) {
        await display.putstr_message("You don't know any spells right now.");
        return { moved: false, tookTime: false };
    }

    let sortMode = SORTBY_LETTER;
    const sortChoices = [
        { key: 'a', mode: SORTBY_LETTER, label: 'by casting letter' },
        { key: 'b', mode: SORTBY_ALPHA, label: 'alphabetically' },
        { key: 'c', mode: SORTBY_LVL_LO, label: 'by level, low to high' },
        { key: 'd', mode: SORTBY_LVL_HI, label: 'by level, high to low' },
        { key: 'e', mode: SORTBY_SKL_AL, label: 'by skill group, alphabetized within each group' },
        { key: 'f', mode: SORTBY_SKL_LO, label: 'by skill group, low to high level within group' },
        { key: 'g', mode: SORTBY_SKL_HI, label: 'by skill group, high to low level within group' },
        { key: 'h', mode: SORTBY_CURRENT, label: 'maintain current ordering' },
        { key: 'z', mode: SORTRETAINORDER, label: 'reassign casting letters to retain current order' },
    ];

    const renderKnownSpells = async () => {
        const knownSpells = sortspells(player, sortMode).filter(s => s.sp_know > 0);
        const castingIndexBySpell = new Map((player.spells || []).map((sp, idx) => [sp, idx]));
        const rows = ['Currently known spells', ''];
        const showTurns = !!player.wizard;
        rows.push(showTurns
            ? '    Name                 Level Category     Fail Retention  turns'
            : '    Name                 Level Category     Fail Retention');

        for (let i = 0; i < knownSpells.length && i < 52; i++) {
            const sp = knownSpells[i];
            const od = objectData[sp.otyp] || null;
            const spellName = String(od?.oc_name || 'unknown spell').toLowerCase();
            const spellLevel = Math.max(1, Number(od?.oc_oc2 || sp.sp_lev || 1));
            const category = spellCategoryForName(spellName);
            const skillRank = spellSkillRank(player, category);
            const turnsLeft = Math.max(0, sp.sp_know);
            const fail = estimateSpellFailPercent(player, spellName, spellLevel, category);
            const retention = spellRetentionText(turnsLeft, skillRank);
            const castingIndex = castingIndexBySpell.get(sp);
            const menuLet = Number.isInteger(castingIndex) ? spellet(castingIndex) : spellet(i);
            const base = `${menuLet} - ${spellName.padEnd(20)}  ${String(spellLevel).padStart(2)}   ${category.padEnd(12)} ${String(fail).padStart(3)}% ${retention.padStart(9)}`;
            rows.push(showTurns ? `${base}  ${String(turnsLeft).padStart(5)}` : base);
        }
        rows.push('+ - [sort spells]');
        rows.push('(end)');

        await docrt();
        if (typeof display.clearRow === 'function') display.clearRow(0);
        if (typeof display.renderOverlayMenu === 'function') {
            display.renderOverlayMenu(rows);
        } else {
            display.renderChargenMenu(rows, false);
        }
    };

    const promptSpellSort = async () => {
        const rows = ['View known spells list sorted', ''];
        for (const choice of sortChoices) {
            if (choice.key === 'z') rows.push('');
            const marker = choice.mode === sortMode ? '*' : '-';
            rows.push(`${choice.key} ${marker} ${choice.label}`);
        }
        rows.push('(end)');
        await docrt();
        if (typeof display.clearRow === 'function') display.clearRow(0);
        if (typeof display.renderOverlayMenu === 'function') {
            display.renderOverlayMenu(rows);
        } else {
            display.renderChargenMenu(rows, false);
        }
        while (true) {
            const ch = await nhgetch();
            if (ch === 27 || ch === 32 || ch === 10 || ch === 13) return false;
            const key = String.fromCharCode(ch);
            const picked = sortChoices.find((choice) => choice.key === key);
            if (picked) {
                if (picked.mode === SORTRETAINORDER) {
                    player.spells = [...sortspells(player, sortMode)];
                    sortMode = SORTBY_LETTER;
                } else {
                    sortMode = picked.mode;
                }
                return true;
            }
        }
    };

    const win = create_nhwindow(NHW_MENU);
    try {
    await renderKnownSpells();

    while (true) {
        const ch = await nhgetch();
        if (ch === '+'.charCodeAt(0)) {
            await promptSpellSort();
            await renderKnownSpells();
            continue;
        }
        if (ch === 32 || ch === 27 || ch === 10 || ch === 13) break;
    }
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
    return { moved: false, tookTime: false };
    } finally {
        destroy_nhwindow(win);
    }
}

// C ref: spell.c spelltypemnemonic() — return string name for spell skill type
export function spelltypemnemonic(skill) {
    // In C, skill is P_ATTACK_SPELL..P_MATTER_SPELL.
    // In JS, we use string categories directly; this function accepts either.
    if (typeof skill === 'string') return skill;
    // Numeric skill types (from weapon.js P_ATTACK_SPELL=28..P_MATTER_SPELL=34)
    switch (skill) {
    case 28: return 'attack';       // P_ATTACK_SPELL
    case 29: return 'healing';      // P_HEALING_SPELL
    case 30: return 'divination';   // P_DIVINATION_SPELL
    case 31: return 'enchantment';  // P_ENCHANTMENT_SPELL
    case 32: return 'clerical';     // P_CLERIC_SPELL
    case 33: return 'escape';       // P_ESCAPE_SPELL
    case 34: return 'matter';       // P_MATTER_SPELL
    default: return '';
    }
}

// cf. spell.c spell_skilltype() — skill category for spell
export function spell_skilltype(booktype) {
    return spellCategoryForName(
        objectData[booktype] ? objectData[booktype].oc_name : ''
    );
}

// C ref: spell.c num_spells() — count known spells
export function num_spells(player) {
    let i;
    for (i = 0; i < MAXSPELL; i++) {
        if (spellid(player, i) === NO_SPELL) {
            break;
        }
    }
    return i;
}

// C ref: spell.c spell_idx() — find index of spell by otyp, or UNKNOWN_SPELL
// Autotranslated from spell.c:2378
export function spell_idx(otyp, player) {
  let i;
  for (i = 0; (i < MAXSPELL) && (spellid(player, i) !== NO_SPELL); i++) {
    if (spellid(player, i) === otyp) return i;
  }
  return UNKNOWN_SPELL;
}

// C ref: spell.c known_spell() — returns spe_Unknown/spe_Fresh/spe_GoingStale/spe_Forgotten
// Returns: 0=unknown, 1=fresh, 2=going stale, -1=forgotten
export function known_spell(player, otyp) {
    const spells = player.spells;
    if (!spells) return 0; // spe_Unknown
    for (let i = 0; i < spells.length; i++) {
        if (spells[i].otyp === otyp) {
            const k = spells[i].sp_know;
            if (k > KEEN / 10) return 1;        // spe_Fresh
            if (k > 0) return 2;                // spe_GoingStale
            return -1;                           // spe_Forgotten
        }
    }
    return 0; // spe_Unknown
}

// C ref: spell.c energy_cost() — SPELL_LEV_PW(level) = level * 5
export function energy_cost(spellLevel) {
    return SPELL_LEV_PW(spellLevel);
}

// C ref: spell.c study_book() — read spellbook to learn spell
// NOTE: The main spellbook reading flow is implemented inline in read.js.
// This function provides the C-faithful interface for direct callers.
export async function study_book(spellbook, player) {
    if (!spellbook || !player) return 0;

    const booktype = spellbook.otyp;
    const od = objectData[booktype] || {};
    const ocLevel = od.oc_oc2 || 1;

    // Blank paper
    if (booktype === SPE_BLANK_PAPER) {
        await pline("This spellbook is all blank.");
        return 1;
    }

    // Novel
    if (booktype === SPE_NOVEL) {
        await pline("You read the novel for a while.");
        return 1;
    }

    // Calculate study delay — cf. spell.c study_book():537-558
    let delay;
    switch (ocLevel) {
    case 1: case 2:
        delay = od.oc_delay || 1;
        break;
    case 3: case 4:
        delay = (ocLevel - 1) * (od.oc_delay || 1);
        break;
    case 5: case 6:
        delay = ocLevel * (od.oc_delay || 1);
        break;
    case 7:
        delay = 8 * (od.oc_delay || 1);
        break;
    default:
        return 0;
    }

    // Check if already known with good retention
    const idx = spell_idx(booktype, player);
    if (idx !== UNKNOWN_SPELL && spellknow(player, idx) > KEEN / 10) {
        await You("know \"%s\" quite well already.", od.oc_name || 'this spell');
        return 0;
    }

    // Difficulty check for non-blessed, non-BOTD books
    const confused = !!(player.confused);
    let too_hard = false;

    if (!spellbook.blessed && booktype !== SPE_BOOK_OF_THE_DEAD) {
        if (spellbook.cursed) {
            too_hard = true;
        } else {
            // Uncursed: check read ability
            const intel = acurr(player, A_INT);
            const lensBonus = (player.blindfolded?.otyp === LENSES) ? 2 : 0;
            const read_ability = intel + 4 + Math.floor((player.ulevel || 1) / 2)
                                 - 2 * ocLevel + lensBonus;
            if (rnd(20) > read_ability) {
                too_hard = true;
            }
        }
    }

    if (too_hard) {
        // C ref: cursed_book effects
        await cursed_book(spellbook, player);
        return 1;
    } else if (confused) {
        await confused_book(spellbook, player);
        return 1;
    }

    await You("begin to %s the runes.",
        booktype === SPE_BOOK_OF_THE_DEAD ? "recite" : "memorize");
    return 1;
}

// C ref: spell.c cursed_book() — TRUE if book should be destroyed
export async function cursed_book(spellbook, player) {
    const od = objectData[spellbook.otyp] || {};
    const lev = od.oc_oc2 || 1;

    switch (rn2(lev)) {
    case 0:
        await You_feel("a wrenching sensation.");
        // tele() would go here
        break;
    case 1:
        await You_feel("threatened.");
        // aggravate() would go here
        break;
    case 2:
        // make_blinded
        await pline("You can't see!");
        break;
    case 3:
        // take_gold
        await pline("Your purse feels lighter.");
        break;
    case 4:
        await pline("These runes were just too much to comprehend.");
        // make_confused
        break;
    case 5:
        await pline_The("book was coated with contact poison!");
        break;
    case 6:
        if (player.antimagic) {
            await pline_The("book radiates explosive energy, but you are unharmed!");
        } else {
            await pline("As you read the book, it radiates explosive energy in your face!");
            const dmg = 2 * rnd(10) + 5;
            // losehp(dmg) would go here
        }
        return true; // book should be destroyed
    default:
        // rndcurse
        break;
    }
    return false;
}

// C ref: spell.c confused_book() — TRUE if book is destroyed
export async function confused_book(spellbook, player) {
    if (!rn2(3) && spellbook.otyp !== SPE_BOOK_OF_THE_DEAD) {
        await pline("Being confused you have difficulties in controlling your actions.");
        await You("accidentally tear the spellbook to pieces.");
        // useup(spellbook) would go here
        return true;
    } else {
        await You("find yourself reading the first line over and over again.");
    }
    return false;
}

// C ref: spell.c book_cursed() — book has just become cursed; interrupt reading
export async function book_cursed(book, player) {
    // If we're currently reading this book and it just became cursed,
    // interrupt the study occupation
    if (book.cursed && player.occupation?.book === book) {
        await pline("%s slams shut!", book.known ? "The book" : "A book");
        book.bknown = true;
        player.occupation = null; // stop_occupation
    }
}

// C ref: spell.c book_disappears() — invalidate stored book reference
export function book_disappears(obj, player) {
    if (player.occupation?.book === obj) {
        player.occupation.book = null;
    }
}

// C ref: spell.c book_substitution() — update stored book reference after rename
export function book_substitution(old_obj, new_obj, player) {
    if (player.occupation?.book === old_obj) {
        player.occupation.book = new_obj;
    }
}

// C ref: spell.c learn() — occupation callback for studying a spellbook
// NOTE: The actual learn occupation is handled inline in read.js.
// This provides the C-faithful standalone version.
export async function learn(player) {
    if (!player || !player.spells) return 0;

    const book = player.occupation?.book;
    if (!book) return 0;

    const booktype = book.otyp;
    const od = objectData[booktype] || {};
    const spellName = String(od.oc_name || 'unknown spell').toLowerCase();

    await exercise(player, A_WIS, true);

    // Book of the Dead special handling
    if (booktype === SPE_BOOK_OF_THE_DEAD) {
        await deadbook(book);
        return 0;
    }

    const spells = player.spells;
    let i;
    for (i = 0; i < spells.length; i++) {
        if (spells[i].otyp === booktype) break;
    }
    const isNewSpell = (i >= spells.length);

    if (!isNewSpell) {
        // Already known — refresh
        const studyCount = book.spestudied || 0;
        if (studyCount > MAX_SPELL_STUDY) {
            await pline("This spellbook is too faint to be read any more.");
            book.otyp = SPE_BLANK_PAPER;
            book.spestudied = rn2(studyCount);
        } else {
            await Your("knowledge of \"%s\" is %s.", spellName,
                 spellknow(player, i) ? "keener" : "restored");
            incrnknow(player, i, 1);
            book.spestudied = studyCount + 1;
            await exercise(player, A_WIS, true); // extra study
        }
    } else {
        // New spell
        const studyCount = book.spestudied || 0;
        if (studyCount >= MAX_SPELL_STUDY) {
            await pline("This spellbook is too faint to read even once.");
            book.otyp = SPE_BLANK_PAPER;
            book.spestudied = rn2(studyCount);
        } else {
            const newIdx = spells.length;
            spells.push({
                otyp: booktype,
                sp_lev: od.oc_oc2 || 1,
                sp_know: KEEN + 1, // incrnknow(i, 1)
            });
            book.spestudied = studyCount + 1;
            if (newIdx === 0) {
                await You("learn \"%s\".", spellName);
            } else {
                await You("add \"%s\" to your repertoire, as '%s'.",
                    spellName, spellet(newIdx));
            }
        }
    }

    // If book is cursed, apply cursed_book effects
    if (book.cursed) {
        await cursed_book(book, player);
    }

    return 0;
}

// cf. spell.c rejectcasting() — check if casting is inhibited
export async function rejectcasting(player) {
    if (player.stunned) {
        await You("are too impaired to cast a spell.");
        return true;
    }
    // C: !can_chant(&gy.youmonst)
    const pdata = player.data || {};
    if (player.strangled || pdata.vnum === undefined) {
        // Simplified: if strangled or no vocal ability
        if (player.strangled) {
            await You("are unable to chant the incantation.");
            return true;
        }
    }
    // C: !freehand() — welded weapon+shield
    if (player.weapon?.welded && player.shield &&
        player.weapon.otyp !== QUARTERSTAFF) {
        await Your("arms are not free to cast!");
        return true;
    }
    return false;
}

// C ref: spell.c spell_backfire() — forgotten spell backfire effects
// C pattern: make_confused(itimeout_incr(HConfusion, duration), TRUE)
export async function spell_backfire(player, spellIdx) {
    const lev = spellev(player, spellIdx);
    const duration = (lev + 1) * 3; // 6..24

    // C: switch(rn2(10)) for confusion/stun distribution
    switch (rn2(10)) {
    case 0: case 1: case 2: case 3:
        // 40% — all confusion
        incr_itimeout(player, CONFUSION, duration);
        await make_confused(player, player.getPropTimeout(CONFUSION), true);
        break;
    case 4: case 5: case 6:
        // 30% — 2/3 confusion + 1/3 stun
        incr_itimeout(player, CONFUSION, Math.floor(2 * duration / 3));
        await make_confused(player, player.getPropTimeout(CONFUSION), true);
        incr_itimeout(player, STUNNED, Math.floor(duration / 3));
        await make_stunned(player, player.getPropTimeout(STUNNED), true);
        break;
    case 7: case 8:
        // 20% — 2/3 stun + 1/3 confusion
        incr_itimeout(player, STUNNED, Math.floor(2 * duration / 3));
        await make_stunned(player, player.getPropTimeout(STUNNED), true);
        incr_itimeout(player, CONFUSION, Math.floor(duration / 3));
        await make_confused(player, player.getPropTimeout(CONFUSION), true);
        break;
    case 9:
        // 10% — all stun
        incr_itimeout(player, STUNNED, duration);
        await make_stunned(player, player.getPropTimeout(STUNNED), true);
        break;
    }
}

// C ref: spell.c cast_protection() — SPE_PROTECTION effect
export async function cast_protection(player) {
    let l = player.ulevel || 1;
    let loglev = 0;
    const uspellprot = player.uspellprot || 0;
    const uac = player.ac ?? 10;
    let natac = uac + uspellprot;

    // loglev = log2(u.ulevel) + 1
    while (l) {
        loglev++;
        l = Math.floor(l / 2);
    }

    natac = Math.floor((10 - natac) / 10); // convert to positive and scale
    const divisor = 4 - Math.min(3, natac);
    const gain = loglev - Math.floor(uspellprot / (divisor || 1));

    if (gain > 0) {
        if (!player.blind) {
            if (uspellprot) {
                await pline_The("golden haze around you becomes more dense.");
            } else {
                await pline_The("air around you begins to shimmer with a golden haze.");
            }
        }
        player.uspellprot = uspellprot + gain;
        // C: u.uspmtime based on expert skill
        player.uspmtime = 10;
        if (!player.usptime) player.usptime = player.uspmtime;
        // find_ac() would be called here to recalculate AC
    } else {
        await Your("skin feels warm for a moment.");
    }
}

import { distmin, sgn } from './hacklib.js';
import { monflee } from './monmove.js';
import { morehungry } from './eat.js';
export function can_center_spell_location(player, map, x, y) {
    if (!player || !map) return false;
    if (distmin(player.x, player.y, x, y) > SPELL_TARGET_DIST) return false;
    const loc = map.at ? map.at(x, y) : null;
    if (!loc) return false;
    return !IS_STWALL(loc.typ);
}
export function display_spell_target_positions(player, map, on_off) {
    if (!player || !map) return;
    if (on_off) {
        tmp_at(DISP_BEAM, { ch: '*', color: 10 });
        for (let dx = -SPELL_TARGET_DIST; dx <= SPELL_TARGET_DIST; dx++) {
            for (let dy = -SPELL_TARGET_DIST; dy <= SPELL_TARGET_DIST; dy++) {
                const x = player.x + dx;
                const y = player.y + dy;
                if (x === player.x && y === player.y) continue;
                if (can_center_spell_location(player, map, x, y)) tmp_at(x, y);
            }
        }
    } else {
        tmp_at(DISP_END, 0);
    }
}

function chainLightBeamGlyph(dx, dy) {
    if (dx !== 0 && dy !== 0) return { ch: '/', color: 11 };
    if (dx !== 0) return { ch: '-', color: 11 };
    return { ch: '|', color: 11 };
}

function can_chain_lightning_pos(map, x, y) {
    const loc = map?.at ? map.at(x, y) : null;
    if (!loc) return false;
    return !IS_OBSTRUCTED(loc.typ);
}

// C ref: spell.c propagate_chain_lightning() -- enqueue one beam step
export function propagate_chain_lightning(clq, zap, map) {
    if (!clq || !zap || !map) return null;
    const [dx, dy] = CHAIN_LIGHTNING_DIRS[zap.dir] || [0, 0];
    const x = zap.x + dx;
    const y = zap.y + dy;
    if (!can_chain_lightning_pos(map, x, y)) return null;

    const strength = (zap.strength || 0) - 1;
    if (strength < 0) return null;

    clq.push({ x, y, dir: zap.dir, strength });
    if (strength > 0) {
        clq.push({ x, y, dir: (zap.dir + 7) % 8, strength: 0 });
        clq.push({ x, y, dir: (zap.dir + 1) % 8, strength: 0 });
    }
    return { x, y, dx, dy, strength };
}

async function cast_chain_lightning(player, map) {
    if (!player || !map) return;
    const displayed = new Set();
    const queue = [];

    for (let dir = 0; dir < CHAIN_LIGHTNING_DIRS.length; dir++) {
        queue.push({ x: player.x, y: player.y, dir, strength: 2 });
    }

    tmp_at(DISP_BEAM, chainLightBeamGlyph(0, 1));
    while (queue.length > 0) {
        const zap = queue.shift();
        const step = propagate_chain_lightning(queue, zap, map);
        if (!step) continue;
        const key = `${step.x},${step.y}`;
        if (displayed.has(key)) continue;
        displayed.add(key);

        tmp_at(DISP_CHANGE, chainLightBeamGlyph(step.dx, step.dy));
        tmp_at(step.x, step.y);
        await nh_delay_output();
    }
    await nh_delay_output();
    await nh_delay_output();
    tmp_at(DISP_END, 0);
}

// C ref: zap.c spell_damage_bonus() — augment spell damage based on intelligence
export function spell_damage_bonus(dmg, player) {
    if (!player) return dmg;
    const intell = acurr(player, A_INT);
    const level = player.ulevel || 1;

    if (intell <= 9) {
        if (dmg > 1)
            dmg = (dmg <= 3) ? 1 : dmg - 3;
    } else if (intell <= 13 || level < 5) {
        // no bonus or penalty
    } else if (intell <= 18) {
        dmg += 1;
    } else if (intell <= 24 || level < 14) {
        dmg += 2;
    } else {
        dmg += 3;
    }
    return dmg;
}

// cf. spell.c — check if casting this spell would be useless for the hero
export function spell_would_be_useless_hero(spellOtyp, player) {
    // Check a few obvious cases
    if (spellOtyp === SPE_HEALING || spellOtyp === SPE_EXTRA_HEALING) {
        if ((player.uhp || 0) >= (player.uhpmax || 1)) return true;
    }
    if (spellOtyp === SPE_CURE_BLINDNESS && !player.blind) return true;
    if (spellOtyp === SPE_CURE_SICKNESS && !player.sick && !player.slimed) return true;
    if (spellOtyp === SPE_DETECT_FOOD) {
        // Mostly useful, rarely useless
    }
    if (spellOtyp === SPE_RESTORE_ABILITY) {
        // Useful if any stat is drained
    }
    if (spellOtyp === SPE_INVISIBILITY && player.Invis) return true;
    if (spellOtyp === SPE_LEVITATION && player.levitating) return true;
    return false;
}

// C ref: spell.c check_unpaid() — check if spellbook is unpaid (shop system)
// In C this is in shk.c; the spell.c just calls it. We provide a passthrough.
export function check_unpaid(obj) {
    // Shop handling: if obj is unpaid, the shop system charges for it.
    // In the JS port, shop tracking is handled elsewhere.
    if (!obj) return false;
    return !!(obj.unpaid);
}

// cf. spell.c docast() — main #cast command
export async function docast(player, display, map, game = null) {
    if (!player) return { moved: false, tookTime: false };
    const nspells = num_spells(player);
    if (nspells === 0) {
        if (display) await display.putstr_message("You don't know any spells right now.");
        return { moved: false, tookTime: false };
    }

    // Check basic casting rejection
    if (await rejectcasting(player)) {
        return { moved: false, tookTime: false };
    }

    // Get spell selection
    const result = await getspell("Choose which spell to cast", player, display, map);
    if (result < 0) {
        return { moved: false, tookTime: false };
    }

    // Cast the spell
    const otyp = spellid(player, result);
    const castResult = await spelleffects(otyp, false, player, map, display, game);
    return { moved: false, tookTime: castResult > 0 };
}

// cf. spell.c getspell() — prompt user to select a spell
function clearSpellMenuOverlay(display, map, player) {
    if (!display) return;
    if (map && typeof display.renderMap === 'function') {
        const fov = display?._lastMapState?.fov || null;
        const flags = display?.flags || {};
        display.renderMap(map, player, fov, flags);
    }
    if (typeof display.clearRow === 'function') display.clearRow(0);
    display.topMessage = null;
    display.messageNeedsMore = false;
}

function refreshSpellStatus(display, player) {
    if (display && typeof display.renderStatus === 'function') {
        display.renderStatus(player);
    }
}

export async function getspell(prompt, player, display, map = null) {
    const nspells = num_spells(player);
    if (nspells === 0) {
        if (display) await display.putstr_message("You don't know any spells right now.");
        return -1;
    }

    if (await rejectcasting(player)) {
        return -1;
    }

    // Build and show spell menu
    const rows = [prompt || 'Choose which spell to cast', ''];
    const showTurns = !!player?.wizard;
    rows.push(showTurns
        ? '    Name                 Level Category     Fail Retention  turns'
        : '    Name                 Level Category     Fail Retention');

    const spells = player.spells || [];
    for (let i = 0; i < spells.length && i < 52; i++) {
        const sp = spells[i];
        const od = objectData[sp.otyp] || null;
        const spellNameStr = String(od?.oc_name || 'unknown spell').toLowerCase();
        const spellLevel = Math.max(1, Number(od?.oc_oc2 || sp.sp_lev || 1));
        const category = spellCategoryForName(spellNameStr);
        const turnsLeft = Math.max(0, sp.sp_know);
        const fail = 100 - percent_success(player, i);
        const skillRank = spellSkillRank(player, category);
        const retention = spellRetentionText(turnsLeft, skillRank);
        const menuLet = spellet(i);
        const base = `${menuLet} - ${spellNameStr.padEnd(20)}  ${String(spellLevel).padStart(2)}   ${category.padEnd(12)} ${String(fail).padStart(3)}% ${retention.padStart(9)}`;
        rows.push(showTurns ? `${base}  ${String(turnsLeft).padStart(5)}` : base);
    }
    rows.push('(end)');

    if (display) {
        let offx = 0;
        if (typeof display.renderOverlayMenu === 'function') {
            offx = display.renderOverlayMenu(rows) || 0;
        } else if (typeof display.renderChargenMenu === 'function') {
            offx = display.renderChargenMenu(rows, false) || 0;
        }
        // C tty menu leaves cursor at first selectable spell entry.
        if (typeof display.setCursor === 'function') {
            display.setCursor(Math.max(0, offx + 6), 5);
        }
    }

    // Wait for a valid spell letter
    while (true) {
        const ch = await nhgetch();
        if (ch === 27 || ch === 32) { // ESC or space = cancel
            clearSpellMenuOverlay(display, map, player);
            await docrt();
            return -1;
        }
        const letter = String.fromCharCode(ch);
        const idx = spell_let_to_idx(letter);
        if (idx >= 0 && idx < nspells) {
            clearSpellMenuOverlay(display, map, player);
            await docrt();
            return idx;
        }
        // Invalid letter, keep waiting
    }
}

// cf. spell.c spelleffects() — dispatch spell effect
// In C, this dispatches all spell effects. In the JS port, many spell effects
// are handled through weffects/seffects/peffects. This provides the common
// checks and energy accounting, then delegates to the effect handler.
export async function spelleffects(spell_otyp, atme, player, map, display, game = null) {
    if (!player || !player.spells) return 0;

    // Find spell index
    const idx = spell_idx(spell_otyp, player);
    if (idx === UNKNOWN_SPELL) return 0;

    const sp = player.spells[idx];
    const od = objectData[sp.otyp] || {};
    const spLev = sp.sp_lev || od.oc_oc2 || 1;
    let energy = SPELL_LEV_PW(spLev);

    // Check if spell is forgotten
    if (sp.sp_know <= 0) {
        await Your("knowledge of this spell is twisted.");
        await pline("It invokes nightmarish images in your mind...");
        await spell_backfire(player, idx);
        const drain = rnd(energy);
        player.uen = Math.max(0, (player.uen || 0) - drain);
        refreshSpellStatus(display, player);
        return 1; // time elapsed
    }

    // Retention warnings
    if (sp.sp_know <= KEEN / 200) {
        await You("strain to recall the spell.");
    } else if (sp.sp_know <= KEEN / 40) {
        await You("have difficulty remembering the spell.");
    } else if (sp.sp_know <= KEEN / 20) {
        await Your("knowledge of this spell is growing faint.");
    } else if (sp.sp_know <= KEEN / 10) {
        await Your("recall of this spell is gradually fading.");
    }

    // Hunger check
    if ((player.nutrition || 900) <= 10 && spell_otyp !== SPE_DETECT_FOOD) {
        await You("are too hungry to cast that spell.");
        return 0;
    }

    // Strength check
    const str = acurr(player, A_STR);
    if ((str || 10) < 4 && spell_otyp !== SPE_RESTORE_ABILITY) {
        await You("lack the strength to cast spells.");
        return 0;
    }

    // Energy check
    const currentPower = player.uen || 0;
    if (energy > currentPower) {
        const suffix = (currentPower < (player.uenmax || 0))
            ? ''
            : (energy > (player.uenpeak || 0))
                ? ' yet'
                : ' anymore';
        await You(`don't have enough energy to cast that spell${suffix}.`);
        return 0;
    }

    // Deduct energy
    player.uen = Math.max(0, currentPower - energy);
    player._botl = true;
    if (display && typeof display.renderStatus === 'function') {
        display.renderStatus(player);
    }

    // Roll for success (C ref: spell.c spelleffects_check() before exercise)
    const confused = !!(player.confused);
    const chance = percent_success(player, idx);
    if (confused || (rnd(100) > chance)) {
        await You("fail to cast the spell correctly.");
        // C ref: spell.c spelleffects_check() — lose half of the spell energy.
        player.uen = Math.max(0, currentPower - Math.floor(energy / 2));
        refreshSpellStatus(display, player);
        return 1; // time elapsed
    }

    // Deduct full energy on successful cast.
    player.uen = Math.max(0, currentPower - energy);
    player._botl = true;
    refreshSpellStatus(display, player);

    // C ref: spell.c spelleffects() — exercise wisdom after checks.
    await exercise(player, A_WIS, true);
    const otyp = sp.otyp;
    // Dispatch spell effect
    // The actual spell effects are complex and involve many subsystems.
    // In the JS port, spell effects for directed spells go through weffects(),
    // scroll-like spells through seffects(), potion-like through peffects().
    // This dispatch provides the framework; specific effects are handled
    // by the game engine when it processes the spell.
    switch (otyp) {
    // Wand-like directed spells (C: "duplicates of wand effects")
    case SPE_FORCE_BOLT:
    case SPE_SLEEP:
    case SPE_MAGIC_MISSILE:
    case SPE_KNOCK:
    case SPE_SLOW_MONSTER:
    case SPE_WIZARD_LOCK:
    case SPE_DIG:
    case SPE_TURN_UNDEAD:
    case SPE_POLYMORPH:
    case SPE_TELEPORT_AWAY:
    case SPE_CANCELLATION:
    case SPE_FINGER_OF_DEATH:
    case SPE_LIGHT:
    case SPE_DETECT_UNSEEN:
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
    case SPE_DRAIN_LIFE:
    case SPE_STONE_TO_FLESH:
    case SPE_FIREBALL:
    case SPE_CONE_OF_COLD:
    {
        // C ref: spell.c spelleffects() — create pseudo object and dispatch via weffects().
        const pseudo = mksobj(otyp, false, false);
        pseudo.blessed = false;
        pseudo.cursed = false;
        pseudo.quan = 20; // "do not let useup get it"

        const dirType = objectData[otyp]?.oc_dir || 0;
        if (dirType !== NODIR) {
            if (atme) {
                player.dx = 0;
                player.dy = 0;
                player.dz = 0;
            } else {
                const dir = await getdir('In what direction?', display);
                if (dir) {
                    player.dx = dir.dx;
                    player.dy = dir.dy;
                    player.dz = dir.dz;
                } else {
                    // C fallback: cancelled getdir still releases magical energy.
                    await pline_The('magical energy is released!');
                    return 1;
                }
                if (display && typeof display.clearRow === 'function') {
                    display.clearRow(0);
                }
            }
        }
        await weffects(pseudo, player, map, display, game);
        break;
    }

    // Scroll-like spells
    case SPE_REMOVE_CURSE:
    case SPE_CONFUSE_MONSTER:
    case SPE_DETECT_FOOD:
    case SPE_CAUSE_FEAR:
    case SPE_IDENTIFY:
    case SPE_CHARM_MONSTER:
    case SPE_MAGIC_MAPPING:
    case SPE_CREATE_MONSTER:
        // These are dispatched through seffects in the game engine
        break;

    // Potion-like spells
    case SPE_HASTE_SELF:
    case SPE_DETECT_TREASURE:
    case SPE_DETECT_MONSTERS:
    case SPE_LEVITATION:
    case SPE_RESTORE_ABILITY:
    case SPE_INVISIBILITY:
        // These are dispatched through peffects in the game engine
        break;

    // Special spells with unique effects
    case SPE_CURE_BLINDNESS:
        // healup(0, 0, FALSE, TRUE) — cure blindness only
        if (player.blind) {
            await pline("Your vision clears.");
            player.blind = false;
            mark_vision_dirty();
        }
        break;

    case SPE_CURE_SICKNESS:
        if (player.sick || player.slimed) {
            if (player.sick) {
                await You("are no longer ill.");
                player.sick = false;
            }
            if (player.slimed) {
                await pline("The slime disappears!");
                player.slimed = false;
            }
        } else {
            await You("are not ill.");
        }
        break;

    case SPE_CREATE_FAMILIAR:
        // make_familiar would go here
        await pline("You summon a familiar!");
        break;

    case SPE_CLAIRVOYANCE:
        // do_vicinity_map would go here
        await pline("You sense your surroundings.");
        break;

    case SPE_PROTECTION:
        await cast_protection(player);
        break;

    case SPE_JUMPING:
        // jump() would go here
        await pline("You jump!");
        break;

    case SPE_CHAIN_LIGHTNING:
        await cast_chain_lightning(player, map);
        await pline("Chain lightning arcs from your fingertips!");
        break;

    default:
        await pline("Nothing happens.");
        break;
    }

    return 1; // time elapsed
}

// C ref: spell.c throwspell() — choose location for area spell
export async function throwspell(player, map, display = null, flags = null) {
    if (!player || !map) return 0;

    if (player.underwater) {
        await pline("You're joking!  In this weather?");
        return 0;
    }

    await pline("Where do you want to cast the spell?");
    const cc = { x: player.x, y: player.y };
    getpos_sethilite(
        (on) => display_spell_target_positions(player, map, on),
        (x, y) => can_center_spell_location(player, map, x, y)
    );
    const rc = await getpos_async(cc, true, 'the desired position', {
        map, display, flags, goalPrompt: 'the desired position', player
    });
    if (rc < 0) return 0;
    return 1;
}

// C ref: spell.c losespells() — forget spells due to amnesia
export async function losespells(player) {
    if (!player.spells) return;

    const spells = player.spells;
    const n = spells.length;
    if (n === 0) return;

    // C: lose anywhere from zero to all known spells
    let nzap = rn2(n + 1);
    if (player.confused) {
        const i = rn2(n + 1);
        if (i > nzap) nzap = i;
    }
    // Good luck might ameliorate
    if (nzap > 1 && !rnl(7, player.luck || 0)) {
        nzap = rnd(nzap);
    }

    // Forget nzap out of n spells by setting sp_know to 0
    for (let i = 0; nzap > 0; i++) {
        if (i >= n) break;
        if (rn2(n - i) < nzap) {
            spells[i].sp_know = 0;
            await exercise(player, A_WIS, false);
            nzap--;
        }
    }
}

// C ref: spell.c force_learn_spell() — learn or refresh spell, return letter
export function force_learn_spell(player, otyp) {
    if (otyp === SPE_BLANK_PAPER || otyp === SPE_BOOK_OF_THE_DEAD)
        return null;
    if (known_spell(player, otyp) === 1) // spe_Fresh
        return null;

    if (!player.spells) player.spells = [];
    const spells = player.spells;

    let i;
    for (i = 0; i < spells.length; i++) {
        if (spells[i].otyp === otyp) break;
    }

    if (i < spells.length) {
        // Already known (going stale or forgotten) — refresh
        spells[i].sp_know = KEEN;
    } else {
        // New spell
        if (spells.length >= MAXSPELL) return null;
        const od = objectData[otyp] || {};
        spells.push({
            otyp,
            sp_lev: od.oc_oc2 || 1,
            sp_know: KEEN, // incrnknow(i, 0)
        });
        i = spells.length - 1;
    }
    return spellet(i);
}

// C ref: spell.c initialspell() — learn a spell during initial inventory creation
export function initialspell(player, obj) {
    if (!player || !obj) return;
    if (!player.spells) player.spells = [];

    const otyp = obj.otyp;
    const spells = player.spells;

    // Check if already known
    for (let i = 0; i < spells.length; i++) {
        if (spells[i].otyp === otyp) return; // already known
    }

    if (spells.length >= MAXSPELL) return;

    const od = objectData[otyp] || {};
    spells.push({
        otyp,
        sp_lev: od.oc_oc2 || 1,
        sp_know: KEEN, // incrnknow(i, 0) — no +1 for initial spells
    });
}

// C ref: spell.c tport_spell() — manage teleport-away spell for ^T
export function tport_spell(player, what) {
    const NOOP_SPELL = 0;
    const HIDE_SPELL = 1;
    const ADD_SPELL = 2;
    const UNHIDESPELL = 3;
    const REMOVESPELL = 4;

    if (!player.spells) player.spells = [];
    const spells = player.spells;

    let i;
    for (i = 0; i < spells.length; i++) {
        if (spells[i].otyp === SPE_TELEPORT_AWAY) break;
    }

    const found = i < spells.length;

    if (!found) {
        if (what === HIDE_SPELL || what === REMOVESPELL) {
            // nothing to hide/remove
        } else if (what === ADD_SPELL) {
            const od = objectData[SPE_TELEPORT_AWAY] || {};
            spells.push({
                otyp: SPE_TELEPORT_AWAY,
                sp_lev: od.oc_oc2 || 1,
                sp_know: KEEN,
            });
            return REMOVESPELL;
        }
    } else {
        if (what === ADD_SPELL || what === UNHIDESPELL) {
            // already present
        } else if (what === REMOVESPELL) {
            spells.splice(i, 1);
        } else if (what === HIDE_SPELL) {
            player._hidden_tport_spell = spells.splice(i, 1)[0];
            return UNHIDESPELL;
        }
    }

    if (what === UNHIDESPELL && player._hidden_tport_spell) {
        spells.push(player._hidden_tport_spell);
        delete player._hidden_tport_spell;
    }

    return NOOP_SPELL;
}

// C ref: spell.c dovspell() — view spells (alias for handleKnownSpells)
export const dovspell = handleKnownSpells;

// spell.c enum spl_sort_types
const SORTBY_LETTER = 0;
const SORTBY_ALPHA = 1;
const SORTBY_LVL_LO = 2;
const SORTBY_LVL_HI = 3;
const SORTBY_SKL_AL = 4;
const SORTBY_SKL_LO = 5;
const SORTBY_SKL_HI = 6;
const SORTBY_CURRENT = 7;
const SORTRETAINORDER = 8;

function spellLevelForEntry(entry) {
    if (!entry) return 0;
    const od = objectData[entry.otyp] || {};
    return Number(od.oc_oc2 || od.oc_level || entry.sp_lev || 0);
}

function spellSkillForEntry(entry) {
    if (!entry) return 0;
    const od = objectData[entry.otyp] || {};
    const ocSubtyp = Number(od.oc_subtyp);
    if (Number.isInteger(ocSubtyp) && ocSubtyp > 0) return ocSubtyp;
    const ocSkill = Number(od.oc_skill);
    if (Number.isInteger(ocSkill) && ocSkill > 0) return ocSkill;
    // Fallback for incomplete object rows: preserve C spell-school ordering.
    const category = spell_skilltype(entry.otyp);
    switch (category) {
    case SPELL_CATEGORY_ATTACK: return 28;
    case SPELL_CATEGORY_HEALING: return 29;
    case SPELL_CATEGORY_DIVINATION: return 30;
    case SPELL_CATEGORY_ENCHANTMENT: return 31;
    case SPELL_CATEGORY_CLERICAL: return 32;
    case SPELL_CATEGORY_ESCAPE: return 33;
    case SPELL_CATEGORY_MATTER: return 34;
    default: return 0;
    }
}

function spellNameForEntry(entry) {
    if (!entry) return '';
    return String(objectData[entry.otyp]?.oc_name || '').toLowerCase();
}

// C ref: spell.c spell_cmp() — qsort callback for spell ordering
export function spell_cmp(lhs, rhs, sortMode = SORTBY_ALPHA) {
    const levl1 = spellLevelForEntry(lhs);
    const levl2 = spellLevelForEntry(rhs);
    const skil1 = spellSkillForEntry(lhs);
    const skil2 = spellSkillForEntry(rhs);

    switch (sortMode) {
    case SORTBY_LETTER:
    case SORTBY_CURRENT:
        return 0;
    case SORTBY_LVL_LO:
        if (levl1 !== levl2) return levl1 - levl2;
        break;
    case SORTBY_LVL_HI:
        if (levl1 !== levl2) return levl2 - levl1;
        break;
    case SORTBY_SKL_AL:
        if (skil1 !== skil2) return skil1 - skil2;
        break;
    case SORTBY_SKL_LO:
        if (skil1 !== skil2) return skil1 - skil2;
        if (levl1 !== levl2) return levl1 - levl2;
        break;
    case SORTBY_SKL_HI:
        if (skil1 !== skil2) return skil1 - skil2;
        if (levl1 !== levl2) return levl2 - levl1;
        break;
    case SORTBY_ALPHA:
    default:
        break;
    }
    return spellNameForEntry(lhs).localeCompare(spellNameForEntry(rhs));
}

// C ref: spell.c sortspells() — sort known spell list
export function sortspells(player, sortMode = SORTBY_ALPHA) {
    if (!player?.spells || player.spells.length < 2) return player?.spells || [];
    if (sortMode === SORTBY_CURRENT || sortMode === SORTBY_LETTER || sortMode === SORTRETAINORDER) return player.spells;
    const sorted = [...player.spells].sort((a, b) => spell_cmp(a, b, sortMode));
    return sorted;
}

// C ref: spell.c show_spells() — dump-style known spells listing
export async function show_spells(player, display) {
    if (display) return handleKnownSpells(player, display);
    if (!player?.spells?.length || player.spells.every((sp) => !sp.sp_know)) {
        await pline("You didn't know any spells.");
        await pline("");
        return;
    }
    await pline("Spells:");
    for (const sp of player.spells) {
        if (!sp.sp_know) continue;
        const name = spellNameForEntry(sp);
        if (name) await pline(`  ${name}`);
    }
}

// C ref: spell.c skill_based_spellbook_id() — passive wizard book ID
export function skill_based_spellbook_id(player) {
    if (!player || !Role_if(player, PM_WIZARD)) return;
    for (let otyp = 0; otyp < objectData.length; otyp++) {
        const od = objectData[otyp];
        if (!od || od.oc_class !== SPBOOK_CLASS) continue;
        const category = spell_skilltype(otyp);
        const rank = spellSkillRank(player, category);
        let knownUpToLevel = player.uroleplay?.pauper ? 0 : 1;
        if (rank >= SPELL_SKILL_BASIC) knownUpToLevel = 3;
        const level = Number(od.oc_oc2 || od.oc_level || 0);
        if (level <= knownUpToLevel) {
            discover_object(otyp, true, false, false);
        }
    }
}

// C ref: spell.c deadbook() — Book of the Dead special entrypoint
export async function deadbook(book2) {
    await You("turn the pages of the Book of the Dead...");
    if (book2) book2.known = true;
}

// Export constants for use by other modules
export { KEEN, SPELL_LEV_PW, SPELL_CATEGORY_ATTACK, SPELL_CATEGORY_HEALING, SPELL_CATEGORY_DIVINATION, SPELL_CATEGORY_ENCHANTMENT, SPELL_CATEGORY_CLERICAL, SPELL_CATEGORY_ESCAPE, SPELL_CATEGORY_MATTER, spellCategoryForName, spellSkillRank, spellet, spellRetentionText, estimateSpellFailPercent, percent_success };

// Autotranslated from spell.c:210
export async function deadbook_pacify_undead(mtmp, game, player) {
  if ((is_undead(mtmp.data) || is_vampshifter(mtmp)) && cansee(mtmp.mx, mtmp.my)) {
    mtmp.mpeaceful = true;
    if (sgn(mtmp.data.maligntyp) === sgn(player.alignment) && mdistu(mtmp) < 4) {
      if (mtmp.mtame) { if (mtmp.mtame < 20) mtmp.mtame++; }
      else {
        // TODO: tamedog not yet ported to JS
        // tamedog(mtmp, 0, true);
      }
    }
    else {
      await monflee(mtmp, 0, false, true);
    }
  }
}

// Autotranslated from spell.c:668
export function age_spells() {
  let i;
  for (i = 0; i < MAXSPELL && spellid(i) !== NO_SPELL; i++) {
    if (spellknow(i)) decrnknow(i);
  }
  return;
}

// Autotranslated from spell.c:786
export async function dowizcast() {
  let win, selected, any, i, n;
  win = create_nhwindow(NHW_MENU);
  start_menu(win, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < MAXSPELL; i++) {
    n = (SPE_DIG + i);
    if (n >= SPE_BLANK_PAPER) {
      break;
    }
    any.a_int = n;
    add_menu(win, nul_glyphinfo, any, 0, 0, ATR_NONE, NO_COLOR, objectData[n].oc_name, MENU_ITEMFLAGS_NONE);
  }
  end_menu(win, "Cast which spell?");
  n = await select_menu(win, PICK_ONE, selected);
  destroy_nhwindow(win);
  if (n > 0) {
    i = selected[0].item.a_int;
    // C: free(selected) — JS garbage collects
    return spelleffects(i, false, true);
  }
  return ECMD_OK;
}

// Autotranslated from spell.c:1219
export async function spelleffects_check(spell, res, energy, game, player) {
  let chance;
  let confused = ((player?.Confusion || player?.confused || false) !== 0);
   energy = 0;
  if ((spell === UNKNOWN_SPELL) || await rejectcasting()) { res = ECMD_OK; return true; }
   energy = SPELL_LEV_PW(spellev(spell));
  if (spellknow(spell) <= 0) {
    await Your("knowledge of this spell is twisted.");
    await pline("It invokes nightmarish images in your mind...");
    await spell_backfire(player, spell);
    player.uen -= rnd( energy);
    if (player.uen < 0) player.uen = 0;
    game.disp.botl = true;
     res = ECMD_TIME;
    return true;
  }
  else if (spellknow(spell) <= KEEN / 200) { await You("strain to recall the spell."); }
  else if (spellknow(spell) <= KEEN / 40) { await You("have difficulty remembering the spell."); }
  else if (spellknow(spell) <= KEEN / 20) {
    await Your("knowledge of this spell is growing faint.");
  }
  else if (spellknow(spell) <= KEEN / 10) {
    await Your("recall of this spell is gradually fading.");
  }
  if (player.uhunger <= 10 && spellid(spell) !== SPE_DETECT_FOOD) {
    await You("are too hungry to cast that spell.");
     res = ECMD_OK;
    return true;
  }
  else if (acurr(player,A_STR) < 4 && spellid(spell) !== SPE_RESTORE_ABILITY) {
    await You("lack the strength to cast spells.");
     res = ECMD_OK;
    return true;
  }
  else if (await check_capacity( "Your concentration falters while carrying so much stuff.")) { res = ECMD_TIME; return true; }
  if (player.uhave.amulet && player.uen >= energy) {
    await You_feel("the amulet draining your energy away.");
    player.uen -= rnd(2 * energy);
    if (player.uen < 0) player.uen = 0;
    game.disp.botl = true;
     res = ECMD_TIME;
  }
  if ( energy > player.uen) {
    await You("don't have enough energy to cast that spell%s.", (player.uen < player.uenmax) ? ""   : ( energy > player.uenpeak) ? " yet"   : " anymore");
    return true;
  }
  else {
    if (spellid(spell) !== SPE_DETECT_FOOD) {
      let hungr =  energy * 2, intell = acurr(player, A_INT);
      if (!Role_if(player, PM_WIZARD)) intell = 10;
      switch (intell) {
        case 25:
          case 24:
            case 23:
              case 22:
                case 21:
                  case 20:
                    case 19:
                      case 18:
                        case 17:
                          hungr = 0;
        break;
        case 16:
          hungr = Math.floor(hungr / 4);
        break;
        case 15:
          hungr = Math.floor(hungr / 2);
        break;
      }
      if (hungr > player.uhunger - 3) hungr = player.uhunger - 3;
      await morehungry(player, hungr);
    }
  }
  chance = percent_success(spell);
  if (confused || (rnd(100) > chance)) {
    await You("fail to cast the spell correctly.");
    player.uen -= Math.floor(energy / 2);
    game.disp.botl = true;
     res = ECMD_TIME;
    return true;
  }
  return false;
}

// Autotranslated from spell.c:1606
export function spell_aim_step(arg, x, y, map) {
  if (!isok(x,y)) return false;
  if (!ZAP_POS(map.locations[x][y].typ) && !(IS_DOOR(map.locations[x][y].typ) && ((map.locations[x][y].flags || 0) & D_ISOPEN))) return false;
  return true;
}

// Autotranslated from spell.c:2294
export function spellretention(idx, outbuf) {
  let turnsleft, percent, accuracy, skill;
  skill = P_SKILL(spell_skilltype(spellid(idx)));
  skill = Math.max(skill, P_UNSKILLED);
  turnsleft = spellknow(idx);
   outbuf = '';
  if (turnsleft < 1) { outbuf = "(gone)"; }
  else if (turnsleft >=  KEEN) { outbuf = "100%"; }
  else {
    percent = Math.floor((turnsleft - 1) / ( KEEN / 100)) + 1;
    accuracy = (skill === P_EXPERT) ? 2 : (skill === P_SKILLED) ? 5 : (skill === P_BASIC) ? 10 : 25;
    percent = accuracy * (Math.floor((percent - 1) / accuracy) + 1);
    outbuf = `${percent - accuracy + 1}%-${percent}%`;
  }
  return outbuf;
}

// Autotranslated from spell.c:1975
export async function spellsortmenu() {
  let tmpwin, selected, any, let_, i, n, choice, clr = NO_COLOR;
  tmpwin = create_nhwindow(NHW_MENU);
  start_menu(tmpwin, MENU_BEHAVE_STANDARD);
  any = { a_int: 0 };
  for (i = 0; i < SIZE(spl_sortchoices); i++) {
    if (i === SORTRETAINORDER) { let_ = 'z'; add_menu_str(tmpwin, ""); }
    else { let_ = 'a' + i; }
    any.a_int = i + 1;
    add_menu(tmpwin, nul_glyphinfo, any, let_, 0, ATR_NONE, clr, spl_sortchoices[i], (i === gs.spl_sortmode) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
  }
  end_menu(tmpwin, "View known spells list sorted");
  n = await select_menu(tmpwin, PICK_ONE, selected);
  destroy_nhwindow(tmpwin);
  if (n > 0) {
    choice = selected[0].item.a_int - 1;
    if (n > 1 && choice === gs.spl_sortmode) choice = selected[1].item.a_int - 1;
    // C: free(selected) — JS garbage collects
    gs.spl_sortmode = choice;
    return true;
  }
  return false;
}
