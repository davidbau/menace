// mcastu.js -- Monster spellcasting: wizard and cleric spell dispatch
// cf. mcastu.c — castmu, buzzmu, choose_magic_spell, choose_clerical_spell,
//                cursetxt, m_cure_self, touch_of_death, death_inflicted_by,
//                cast_wizard_spell, cast_cleric_spell,
//                is_undirected_spell, spell_would_be_useless

import { rn2, rnd, d } from './rng.js';
import {
  AD_FIRE, AD_COLD, AD_ELEC, AD_MAGM, AD_SLEE, AD_DISN, AD_DRST, AD_ACID, AD_SPC2, AD_SPEL, AD_CLRC, AT_MAGC,
} from './monsters.js';
import {
  buzz, ZT_BREATH, ZT_MAGIC_MISSILE, ZT_FIRE, ZT_COLD, ZT_SLEEP,
  ZT_DEATH, ZT_LIGHTNING, ZT_POISON_GAS, ZT_ACID,
} from './zap.js';
import { lined_up } from './mthrowu.js';
import {
  MGC_PSI_BOLT, MGC_CURE_SELF, MGC_HASTE_SELF, MGC_STUN_YOU, MGC_DISAPPEAR,
  MGC_WEAKEN_YOU, MGC_DESTRY_ARMR, MGC_CURSE_ITEMS, MGC_AGGRAVATION,
  MGC_SUMMON_MONS, MGC_CLONE_WIZ, MGC_DEATH_TOUCH, CLC_OPEN_WOUNDS,
  CLC_CURE_SELF, CLC_CONFUSE_YOU, CLC_PARALYZE, CLC_BLIND_YOU, CLC_INSECTS,
  CLC_CURSE_ITEMS, CLC_LIGHTNING, CLC_FIRE_PILLAR, CLC_GEYSER, MFAST,
} from './const.js';
import { mon_adjust_speed } from './worn.js';

// cf. mcastu.c:48 — cursetxt(mtmp, vis)
export function cursetxt(mtmp, vis) {
  if (!vis) return '';
  const mname = mtmp?.name || mtmp?.data?.mname || 'monster';
  const text = `The ${mname} points at you, then curses.`;
  if (mtmp) mtmp.lastCurseText = text;
  return text;
}

// cf. mcastu.c:75 — choose_magic_spell(n)
// Maps a spell value to a wizard spell type
export function choose_magic_spell(n) {
  // C ref: mcastu.c choose_magic_spell()
  while (n > 24 && rn2(25)) {
    n = rn2(n);
  }

  if (n >= 20) return MGC_DEATH_TOUCH;
  if (n >= 18) return MGC_CLONE_WIZ;
  if (n >= 15) return MGC_SUMMON_MONS;
  if (n >= 13) return MGC_AGGRAVATION;
  if (n >= 10) return MGC_CURSE_ITEMS;
  if (n >= 8) return MGC_DESTRY_ARMR;
  if (n >= 6) return MGC_WEAKEN_YOU;
  if (n >= 4) return MGC_DISAPPEAR;
  if (n === 3) return MGC_STUN_YOU;
  if (n === 2) return MGC_HASTE_SELF;
  if (n === 1) return MGC_CURE_SELF;
  return MGC_PSI_BOLT;
}

// cf. mcastu.c:129 — choose_clerical_spell(n)
export function choose_clerical_spell(n) {
  // C ref: mcastu.c choose_clerical_spell()
  while (n > 15 && rn2(16)) {
    n = rn2(n);
  }

  if (n === 15 || n === 14) {
    if (rn2(3)) return CLC_OPEN_WOUNDS;
    return CLC_GEYSER;
  }
  if (n === 13) return CLC_GEYSER;
  if (n === 12) return CLC_FIRE_PILLAR;
  if (n === 11) return CLC_LIGHTNING;
  if (n === 10 || n === 9) return CLC_CURSE_ITEMS;
  if (n === 8) return CLC_INSECTS;
  if (n === 7 || n === 6) return CLC_BLIND_YOU;
  if (n === 5 || n === 4) return CLC_PARALYZE;
  if (n === 3 || n === 2) return CLC_CONFUSE_YOU;
  if (n === 1) return CLC_CURE_SELF;
  return CLC_OPEN_WOUNDS;
}

// cf. mcastu.c:359 — m_cure_self(mtmp, dmg)
export function m_cure_self(mtmp, dmg) {
  const heal = d(3, 6);
  if (mtmp.mhp < mtmp.mhpmax) {
    mtmp.mhp = Math.min(mtmp.mhpmax, mtmp.mhp + heal);
  }
  return Math.max(0, dmg - heal);
}

// cf. mcastu.c:374 — touch_of_death(mtmp)
export function touch_of_death(mtmp, player) {
  if (!player) return 0;
  // C-like shape: fatal touch unless protected by antimagic/magic resistance.
  const resisted = !!player.antimagic;
  const dmg = resisted ? d(8, 6) : (50 + d(8, 6));
  if (player.uhp !== undefined) {
    player.uhp = Math.max(0, player.uhp - dmg);
  } else if (player.hp !== undefined) {
    player.hp = Math.max(0, player.hp - dmg);
  }
  player.lastDamageReason = death_inflicted_by('a touch of death', mtmp);
  return dmg;
}

// cf. mcastu.c:409 — death_inflicted_by(who, mtmp)
export function death_inflicted_by(who, mtmp) {
  // Format death message for spell-induced deaths
  return `killed by a spell cast by ${who}`;
}

// cf. mcastu.c:448 — cast_wizard_spell(mtmp, dmg, spellid)
export function cast_wizard_spell(mtmp, dmg, spellid, player, map) {
  switch (spellid) {
    case MGC_DEATH_TOUCH:
      // Touch of death
      touch_of_death(mtmp, player);
      break;
    case MGC_CLONE_WIZ:
      // Clone wizard — stub
      break;
    case MGC_SUMMON_MONS:
      // Summon nasties — stub
      break;
    case MGC_AGGRAVATION:
      // Aggravate monsters
      aggravation(map);
      break;
    case MGC_CURSE_ITEMS:
      // Curse hero items
      curse_objects(player);
      break;
    case MGC_DESTRY_ARMR:
      // Destroy armor — stub
      break;
    case MGC_WEAKEN_YOU:
      // Weaken (drain STR)
      if (player && dmg > 0) {
        // Would drain rnd(dmg) STR
      }
      break;
    case MGC_DISAPPEAR:
      // Monster goes invisible
      if (mtmp) mtmp.minvis = true;
      break;
    case MGC_STUN_YOU:
      // Stun hero — stub
      break;
    case MGC_HASTE_SELF:
      // Monster hastes itself
      // C ref: mcastu.c:594 — mon_adjust_speed(mtmp, 1, NULL)
      if (mtmp) mon_adjust_speed(mtmp, 1, null);
      break;
    case MGC_CURE_SELF:
      m_cure_self(mtmp, 0);
      break;
    case MGC_PSI_BOLT:
      // Psi bolt: dmg to player
      if (player) {
        // Would apply dmg with Antimagic halving
      }
      break;
  }
}

// cf. mcastu.c:631 — cast_cleric_spell(mtmp, dmg, spellid)
export function cast_cleric_spell(mtmp, dmg, spellid, player, map) {
  switch (spellid) {
    case CLC_GEYSER:
      // Geyser: d(8, 6) physical damage
      if (player) {
        const gdam = d(8, 6);
        // Would apply physical damage
      }
      break;
    case CLC_FIRE_PILLAR:
      // Fire pillar: d(8, 6) fire damage
      if (player) {
        const fdam = d(8, 6);
        // Would apply fire damage + burnarmor
      }
      break;
    case CLC_LIGHTNING:
      // Lightning: d(8, 6) electrical damage
      if (player) {
        const edam = d(8, 6);
        // Would apply electrical damage + blind via flashburn(rnd(100))
        rnd(100); // blind duration RNG consumed
      }
      break;
    case CLC_INSECTS:
      // Summon insects
      if (mtmp) {
        const mlev = mtmp.m_lev || 1;
        let quan = (mlev < 2) ? 1 : rnd(Math.floor(mlev / 2));
        if (quan < 3) quan = 3;
        // Would spawn quan insects
      }
      break;
    case CLC_CURSE_ITEMS:
      curse_objects(player);
      break;
    case CLC_BLIND_YOU:
      // Blind hero — stub
      break;
    case CLC_PARALYZE:
      // Paralyze hero — stub
      break;
    case CLC_CONFUSE_YOU:
      // Confuse hero — stub
      break;
    case CLC_OPEN_WOUNDS:
      // Open wounds: direct damage
      if (player) {
        // Would apply dmg
      }
      break;
    case CLC_CURE_SELF:
      m_cure_self(mtmp, 0);
      break;
  }
}

// cf. mcastu.c:176 — castmu(mtmp, mattk, vis, thrown)
// Monster casts a spell at the hero
// Returns 1 if spell was cast, 0 if failed
export async function castmu(mtmp, mattk, vis, thrown, player, map) {
  if (!mtmp || !mattk) return 0;

  const ml = mtmp.m_lev || 1;
  const aatyp = mattk.aatyp || 0;
  const adtyp = mattk.adtyp || 0;
  let spellnum = 0;

  // C ref: mcastu.c castmu() — when using AD_SPEL/AD_CLRC and ml>0,
  // choose spell first (consumes rn2(ml) and possibly choose_* RNG).
  if ((adtyp === AD_SPEL || adtyp === AD_CLRC) && ml > 0) {
    spellnum = rn2(ml);
    if (adtyp === AD_SPEL) spellnum = choose_magic_spell(spellnum);
    else spellnum = choose_clerical_spell(spellnum);
    if (spell_would_be_useless(mtmp, adtyp, spellnum)) return 0;
  }

  // C ref: mcastu.c castmu() — disabled casters fail before fumble roll.
  if (mtmp.mcan || mtmp.mspec_used || !ml) {
    if (vis) cursetxt(mtmp, vis);
    return 0;
  }

  // C ref: mcastu.c castmu() — spellcasters spend mspec_used before fumble.
  if (adtyp === AD_SPEL || adtyp === AD_CLRC) {
    mtmp.mspec_used = (ml < 8) ? (10 - ml) : 2;
  }

  // Spell fumble check (after spell choice + mspec_used setup in C).
  if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) {
    if (vis) cursetxt(mtmp, vis);
    return 0; // fumbled
  }

  // Non-spell adtyp path still picks a raw spell number for downstream logic.
  if (!(adtyp === AD_SPEL || adtyp === AD_CLRC)) {
    spellnum = rn2(ml);
  }

  let dmg;
  if (mattk.damd) {
    dmg = d(Math.floor(ml / 2) + (mattk.damn || 0), mattk.damd);
  } else {
    dmg = d(Math.floor(ml / 2) + 1, 6);
  }

  // Determine spell type (wizard vs cleric)
  const isWizard = (aatyp === AT_MAGC);
  // In C, AT_MAGC = wizard spells; AT_CLER would be cleric
  // For simplicity, check monster data for caster type

  if (isWizard) {
    const spell = (adtyp === AD_SPEL || adtyp === AD_CLRC)
      ? spellnum
      : choose_magic_spell(spellnum);
    if (spell_would_be_useless(mtmp, aatyp, spell)) return 0;
    cast_wizard_spell(mtmp, dmg, spell, player, map);
  } else {
    const spell = (adtyp === AD_SPEL || adtyp === AD_CLRC)
      ? spellnum
      : choose_clerical_spell(spellnum);
    if (spell_would_be_useless(mtmp, aatyp, spell)) return 0;
    cast_cleric_spell(mtmp, dmg, spell, player, map);
  }

  return 1;
}

// cf. mcastu.c:884 — is_undirected_spell(aatyp, spellid)
export function is_undirected_spell(aatyp, spellid) {
  if (aatyp === AT_MAGC) {
    switch (spellid) {
      case MGC_CLONE_WIZ:
      case MGC_SUMMON_MONS:
      case MGC_AGGRAVATION:
      case MGC_DISAPPEAR:
      case MGC_HASTE_SELF:
      case MGC_CURE_SELF:
        return true;
    }
  } else {
    switch (spellid) {
      case CLC_INSECTS:
      case CLC_CURE_SELF:
        return true;
    }
  }
  return false;
}

// cf. mcastu.c:912 — spell_would_be_useless(mtmp, aatyp, spellid)
export function spell_would_be_useless(mtmp, aatyp, spellid) {
  if (aatyp === AT_MAGC) {
    switch (spellid) {
      case MGC_HASTE_SELF:
        // C ref: mcastu.c:930 — checks permanent speed state.
        return mtmp.permspeed === MFAST;
      case MGC_CURE_SELF:
        return mtmp.mhp >= mtmp.mhpmax; // already at full HP
      case MGC_DISAPPEAR:
        return !!mtmp.minvis; // already invisible
      default:
        return false;
    }
  } else {
    switch (spellid) {
      case CLC_CURE_SELF:
        return mtmp.mhp >= mtmp.mhpmax;
      default:
        return false;
    }
  }
}

// cf. mcastu.c:980 — buzzmu(mtmp, mattk)
// Monster fires a directed beam at hero
export async function buzzmu(mtmp, mattk, player, map) {
  if (!mtmp || !mattk || !player || !map) return 0;

  const adtyp = mattk.adtyp || AD_MAGM;
  // C ref: mcastu.c buzzmu() — only AD_MAGM..AD_SPC2 are valid beam adtypes.
  if (adtyp < AD_MAGM || adtyp > AD_SPC2) return 0;
  // C ref: mcastu.c buzzmu() — cancelled monsters don't cast beam spells.
  if (mtmp.mcan) return 0;

  // C ref: mcastu.c buzzmu() — line-up check with 2/3 chance to fire.
  if (!(lined_up(mtmp, map, player) && rn2(3))) return 0;

  const nd = Math.max(1, mattk.damn || 6);
  const dx = Math.sign((player.x || 0) - (mtmp.mx || 0));
  const dy = Math.sign((player.y || 0) - (mtmp.my || 0));
  if (dx === 0 && dy === 0) return 0;

  let ztyp = ZT_MAGIC_MISSILE;
  switch (adtyp) {
  case AD_FIRE: ztyp = ZT_FIRE; break;
  case AD_COLD: ztyp = ZT_COLD; break;
  case AD_SLEE: ztyp = ZT_SLEEP; break;
  case AD_DISN: ztyp = ZT_DEATH; break;
  case AD_ELEC: ztyp = ZT_LIGHTNING; break;
  case AD_DRST: ztyp = ZT_POISON_GAS; break;
  case AD_ACID: ztyp = ZT_ACID; break;
  case AD_MAGM:
  default:
    ztyp = ZT_MAGIC_MISSILE;
    break;
  }

  await buzz(ZT_BREATH(ztyp), nd, mtmp.mx, mtmp.my, dx, dy, map, player);
  return 1;
}

// ── Helper functions ──

// cf. mcastu.c aggravation — wake all monsters
export function aggravation(map) {
  if (!map) return;
  // Would iterate all monsters and set msleeping = false
}

// cf. mcastu.c curse_objects — curse hero inventory items
export function curse_objects(player) {
  if (!player) return;
  // Would iterate inventory and curse random items
}
