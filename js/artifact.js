// artifact.js -- Artifact creation, invocation, special effects
// cf. artifact.c — Ported from NetHack 3.7

import {
  artilist, NROFARTIFACTS, AFTER_LAST_ARTIFACT, ART_NONARTIFACT,
  ART_EXCALIBUR, ART_GRIMTOOTH, ART_SUNSWORD, ART_MASTER_KEY_OF_THIEVERY,
  ART_STING, ART_ORCRIST, ART_STORMBRINGER, ART_VORPAL_BLADE,
  ART_TSURUGI_OF_MURAMASA, ART_MAGICBANE,
  SPFX_NONE, SPFX_NOGEN, SPFX_RESTR, SPFX_INTEL, SPFX_SPEAK, SPFX_SEEK,
  SPFX_WARN, SPFX_ATTK, SPFX_DEFN, SPFX_DRLI, SPFX_SEARCH, SPFX_BEHEAD,
  SPFX_HALRES, SPFX_ESP, SPFX_STLTH, SPFX_REGEN, SPFX_EREGEN,
  SPFX_HSPDAM, SPFX_HPHDAM, SPFX_TCTRL, SPFX_LUCK, SPFX_DMONS,
  SPFX_DCLAS, SPFX_DFLAG1, SPFX_DFLAG2, SPFX_DALIGN, SPFX_DBONUS,
  SPFX_XRAY, SPFX_REFLECT, SPFX_PROTECT,
  TAMING, HEALING, ENERGY_BOOST, UNTRAP, CHARGE_OBJ,
  LEV_TELE, CREATE_PORTAL, ENLIGHTENING, CREATE_AMMO,
  BANISH, FLING_POISON, FIRESTORM, SNOWSTORM, BLINDING_RAY,
} from './artifacts.js';

import { rn2, rnd, d, rnz } from './rng.js';
import { objectData, LUCKSTONE, WEAPON_CLASS, STRANGE_OBJECT,
         GOLD_DRAGON_SCALE_MAIL, GOLD_DRAGON_SCALES, FAKE_AMULET_OF_YENDOR, CRYSTAL_BALL } from './objects.js';
import { AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_DRLI, AD_STUN, AD_BLND, AD_WERE, AD_DISN, AD_STON, PM_WATER_ELEMENTAL, PM_JABBERWOCK, PM_ROGUE, PM_CLAY_GOLEM, M2_UNDEAD, M2_WERE, M2_ELF, M2_ORC, M2_DEMON, M2_GIANT, MZ_LARGE, AT_MAGC, mons, MR_FIRE, MR_COLD, MR_ELEC, MR_POISON } from './monsters.js';
import { A_NONE, A_CHAOTIC, A_NEUTRAL, A_LAWFUL, LAST_PROP, CONFLICT, LEVITATION, INVIS, W_ARM, W_ART, W_ARTI, W_WEP, PROTECTION, STEALTH, REGENERATION, TELEPORT_CONTROL, ENERGY_REGENERATION, HALF_SPDAM, HALF_PHDAM, REFLECTING, WARN_OF_MON, WARNING, HALLUC_RES, ONAME_NO_FLAGS, ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT, ONAME_VIA_DIP, ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM, ONAME_KNOW_ARTI, NON_PM, D_TRAPPED, IS_DOOR, isok, ECMD_OK, ECMD_TIME, ECMD_CANCEL, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, TIMEOUT, BLINDED, SICK, SLIMED } from './const.js';
import { SILVER } from './objects.js';
import { pline, pline_The, You, You_feel, You_cant } from './pline.js';
import { Is_container, obj_extract_self } from './mkobj.js';
import { getobj, carried } from './invent.js';
import { seffect_taming, recharge, charge_ok } from './read.js';
import { dountrap } from './trap.js';
import { use_crystal_ball } from './detect.js';
import { obfree } from './shk.js';
import { has_head, noncorporeal, amorphous, nonliving, resists_drli } from './mondata.js';

// ── Artifact existence tracking ──
// artiexist[i] tracks artifact i (1-indexed; [0] is unused)
const artiexist = [];
for (let i = 0; i <= NROFARTIFACTS; i++) {
  artiexist.push({ exists: false, found: false, gift: false, wish: false,
                    named: false, viadip: false, lvldef: false, bones: false, rndm: false });
}

// Discovery list (ART_* indices in order of discovery)
const artidisco = [];

// ── Internal helpers ──

// cf. artifact.c:2821 — get_artifact(obj)
function get_artifact(obj) {
  if (obj) {
    const idx = obj.oartifact | 0;
    if (idx > 0 && idx < AFTER_LAST_ARTIFACT)
      return artilist[idx];
  }
  return artilist[ART_NONARTIFACT];
}
export { get_artifact };

// ── Name lookup ──

// cf. artifact.c:151 — artiname(artinum)
// Autotranslated from artifact.c:150
export function artiname(artinum) {
  if (artinum <= 0 || artinum > NROFARTIFACTS) return "";
  return artilist[artinum].name;
}

// cf. artifact.c:329 — artifact_name(name, otyp_p, fuzzy)
// Returns { name, otyp } or null
export function artifact_name(name, fuzzy = false) {
  if (!name) return null;
  let n = name;
  if (n.toLowerCase().startsWith('the ')) n = n.slice(4);

  for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
    let aname = artilist[i].name;
    if (aname.toLowerCase().startsWith('the ')) aname = aname.slice(4);
    if (fuzzy ? fuzzymatch(n, aname) : n.toLowerCase() === aname.toLowerCase()) {
      return { name: artilist[i].name, otyp: artilist[i].otyp };
    }
  }
  return null;
}

function fuzzymatch(s1, s2) {
  // Simple fuzzy: ignore spaces and dashes, case-insensitive
  const norm = s => s.toLowerCase().replace(/[\s-]/g, '');
  return norm(s1) === norm(s2);
}

// ── Existence tracking ──

// cf. artifact.c:111 — init_artifacts()
export function init_artifacts() {
  for (let i = 0; i <= NROFARTIFACTS; i++) {
    artiexist[i].exists = false;
    artiexist[i].found = false;
    artiexist[i].gift = false;
    artiexist[i].wish = false;
    artiexist[i].named = false;
    artiexist[i].viadip = false;
    artiexist[i].lvldef = false;
    artiexist[i].bones = false;
    artiexist[i].rndm = false;
  }
  artidisco.length = 0;
  hack_artifacts();
}

// cf. artifact.c:87 — hack_artifacts()
// Adjusts artifact entries for special cases at startup.
function hack_artifacts(player) {
  // Fix up alignments of gift artifacts for hero's role
  // This requires player context which may not be available at init.
  // For now, this is a placeholder; full implementation needs player role/alignment.
}
export { hack_artifacts };

// cf. artifact.c:356 — exist_artifact(otyp, name)
export function exist_artifact(otyp, name) {
  if (otyp && name) {
    for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
      if (artilist[i].otyp === otyp && artilist[i].name === name) {
        return artiexist[i].exists;
      }
    }
  }
  return false;
}

// cf. artifact.c:371 — artifact_exists(otmp, name, mod, flgs)
export function artifact_exists(otmp, name, mod, flgs = 0) {
  if (otmp && name) {
    for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
      if (artilist[i].otyp === otmp.otyp && artilist[i].name === name) {
        otmp.oartifact = mod ? i : 0;
        otmp.age = 0;
        if (mod) {
          artifact_origin(otmp, flgs || ONAME_RANDOM);
        } else {
          // uncreate — clear all flags
          const a = artiexist[i];
          a.exists = false; a.found = false; a.gift = false;
          a.wish = false; a.named = false; a.viadip = false;
          a.lvldef = false; a.bones = false; a.rndm = false;
        }
        break;
      }
    }
  }
}

// cf. artifact.c:478 — artifact_origin(arti, aflags)
export function artifact_origin(otmp, aflags) {
  const a = otmp.oartifact;
  if (a && a > 0 && a <= NROFARTIFACTS) {
    const info = artiexist[a];
    // Clear all bits
    info.exists = true;
    info.found = false; info.gift = false; info.wish = false;
    info.named = false; info.viadip = false; info.lvldef = false;
    info.bones = false; info.rndm = false;

    if (aflags & ONAME_KNOW_ARTI) info.found = true;
    if (aflags & ONAME_WISH) info.wish = true;
    if (aflags & ONAME_GIFT) info.gift = true;
    if (aflags & ONAME_VIA_DIP) info.viadip = true;
    if (aflags & ONAME_VIA_NAMING) info.named = true;
    if (aflags & ONAME_LEVEL_DEF) info.lvldef = true;
    if (aflags & ONAME_BONES) info.bones = true;
    if (aflags & ONAME_RANDOM) info.rndm = true;
  }
}

// cf. artifact.c:409 — found_artifact(a)
export function found_artifact(a) {
  if (a >= 1 && a <= NROFARTIFACTS && artiexist[a].exists) {
    artiexist[a].found = true;
  }
}

// cf. artifact.c:422 — find_artifact(otmp)
export function find_artifact(otmp) {
  const a = otmp.oartifact;
  if (a && !artiexist[a].found) {
    found_artifact(a);
    // livelog would go here
  }
}

// cf. artifact.c:462 — nartifact_exist()
// Autotranslated from artifact.c:461
export function nartifact_exist() {
  let i, a = 0;
  for (i = 1; i <= NROFARTIFACTS; ++i) {
    if (artiexist[i].exists) ++a;
  }
  return a;
}

// ── Pure predicates ──

// cf. artifact.c:516 — spec_ability(otmp, abil)
// Autotranslated from artifact.c:515
export function spec_ability(otmp, abil) {
  let arti = get_artifact(otmp);
  return  (arti !== artilist[ART_NONARTIFACT] && (arti.spfx & abil) !== 0);
}

// cf. artifact.c:526 — confers_luck(obj)
// Autotranslated from artifact.c:525
export function confers_luck(obj) {
  if (obj.otyp === LUCKSTONE) return true;
  return (obj.oartifact && spec_ability(obj, SPFX_LUCK));
}

// cf. artifact.c:537 — arti_reflects(obj)
// Autotranslated from artifact.c:536
export function arti_reflects(obj) {
  let arti = get_artifact(obj);
  if (arti !== artilist[ART_NONARTIFACT]) {
    if ((obj.owornmask & ~W_ART) && (arti.spfx & SPFX_REFLECT)) return true;
    if (arti.cspfx & SPFX_REFLECT) return true;
  }
  return false;
}

// cf. artifact.c:555 — shade_glare(obj)
export function shade_glare(obj) {
  if (objectData[obj.otyp] && objectData[obj.otyp].oc_material === SILVER) return true;
  const arti = get_artifact(obj);
  if (arti !== artilist[ART_NONARTIFACT]
      && (arti.spfx & SPFX_DFLAG2) && arti.mtype === M2_UNDEAD)
    return true;
  return false;
}

// cf. artifact.c:575 — restrict_name(otmp, name)
export function restrict_name(otmp, name) {
  if (!name) return false;
  let n = name;
  if (n.toLowerCase().startsWith('the ')) n = n.slice(4);

  for (let i = 1; i < artilist.length && artilist[i].otyp; i++) {
    const a = artilist[i];
    if (a.otyp !== otmp.otyp) continue;
    let aname = a.name;
    if (aname.toLowerCase().startsWith('the ')) aname = aname.slice(4);
    if (n.toLowerCase() === aname.toLowerCase()) {
      return !!((a.spfx & (SPFX_NOGEN | SPFX_RESTR)) || (otmp.quan > 1));
    }
  }
  return false;
}

// cf. artifact.c:626 — attacks(adtyp, otmp)
// Autotranslated from artifact.c:625
export function attacks(adtyp, otmp) {
  let weap;
  if ((weap = get_artifact(otmp)) !== artilist[ART_NONARTIFACT]) return  (weap.attk.adtyp === adtyp);
  return false;
}

// cf. artifact.c:636 — defends(adtyp, otmp)
export function defends(adtyp, otmp) {
  if (!otmp) return false;
  const weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT]) {
    return weap.defn.adtyp === adtyp;
  }
  // Dragon armor defense is handled elsewhere
  return false;
}

// cf. artifact.c:687 — defends_when_carried(adtyp, otmp)
// Autotranslated from artifact.c:686
export function defends_when_carried(adtyp, otmp) {
  let weap;
  if ((weap = get_artifact(otmp)) !== artilist[ART_NONARTIFACT]) return  (weap.cary.adtyptyp === adtyp);
  return false;
}

// cf. artifact.c:698 — protects(otmp, being_worn)
export function protects(otmp, being_worn) {
  if (being_worn && objectData[otmp.otyp] && objectData[otmp.otyp].oc_oprop === PROTECTION) {
    return true;
  }
  const arti = get_artifact(otmp);
  if (arti === artilist[ART_NONARTIFACT]) return false;
  return !!((arti.cspfx & SPFX_PROTECT) ||
            (being_worn && (arti.spfx & SPFX_PROTECT)));
}

// cf. artifact.c:979 — arti_immune(obj, dtyp)
export function arti_immune(obj, dtyp) {
  const weap = get_artifact(obj);
  if (weap === artilist[ART_NONARTIFACT]) return false;
  if (dtyp === AD_PHYS) return false;
  return weap.attk.adtyp === dtyp || weap.defn.adtyptyp === dtyp || weap.cary.adtyptyp === dtyp;
}

// cf. artifact.c:2299 — artifact_has_invprop(otmp, inv_prop)
// Autotranslated from artifact.c:2298
export function artifact_has_invprop(otmp, inv_prop) {
  let arti = get_artifact(otmp);
  return  ((arti !== artilist[ART_NONARTIFACT]) && (arti.inv_prop === inv_prop));
}

// cf. artifact.c:2309 — arti_cost(otmp)
export function arti_cost(otmp) {
  if (!otmp.oartifact)
    return objectData[otmp.otyp].oc_cost || 0;
  if (artilist[otmp.oartifact].cost)
    return artilist[otmp.oartifact].cost;
  return 100 * (objectData[otmp.otyp].oc_cost || 0);
}

// cf. artifact.c:2264 — artifact_light(obj)
// Returns true if obj emits light constantly (Sunsword, or worn gold dragon scales).
export function artifact_light(obj) {
    if (obj && (obj.otyp === GOLD_DRAGON_SCALE_MAIL || obj.otyp === GOLD_DRAGON_SCALES)
            && (obj.owornmask & W_ARM))
        return true;
    return !!(get_artifact(obj) !== artilist[ART_NONARTIFACT] && is_art(obj, ART_SUNSWORD));
}

// cf. artifact.c:2808 — is_art(obj, art)
// Autotranslated from artifact.c:2807
export function is_art(obj, art) {
  if (obj && obj.oartifact === art) return true;
  return false;
}

// cf. artifact.c:2837 — permapoisoned(obj)
// Autotranslated from artifact.c:2836
export function permapoisoned(obj) {
  return (obj && is_art(obj, ART_GRIMTOOTH));
}

// cf. artifact.c:1065 — spec_m2(otmp)
export function spec_m2(otmp) {
  const artifact = get_artifact(otmp);
  if (artifact !== artilist[ART_NONARTIFACT])
    return artifact.mtype;
  return 0;
}

// ── Combat: spec_applies, bane_applies, spec_abon, spec_dbon ──

// cf. artifact.c:993 — bane_applies(oart, mon)
// Autotranslated from artifact.c:992
export function bane_applies(oart, mon) {
  let atmp;
  if (oart !== artilist[ART_NONARTIFACT] && (oart.spfx & SPFX_DBONUS) !== 0) {
    atmp = oart;
    atmp.spfx &= SPFX_DBONUS;
    if (spec_applies( atmp, mon)) return true;
  }
  return false;
}

// cf. artifact.c:1009 — spec_applies(weap, mon)
export function spec_applies(weap, mon) {
  if (!(weap.spfx & (SPFX_DBONUS | SPFX_ATTK)))
    return (weap.attk.adtyp === AD_PHYS) ? 1 : 0;

  const ptr = mon.data || (mon.mnum != null ? mons[mon.mnum] : null);
  if (!ptr) return 0;

  if (weap.spfx & SPFX_DMONS) {
    return (mon.mnum === weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DCLAS) {
    return (weap.mtype === ptr.mlet) ? 1 : 0;
  } else if (weap.spfx & SPFX_DFLAG1) {
    return (ptr.mflags1 & weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DFLAG2) {
    return (ptr.mflags2 & weap.mtype) ? 1 : 0;
  } else if (weap.spfx & SPFX_DALIGN) {
    if (ptr.maligntyp === A_NONE) return 1;
    return (Math.sign(ptr.maligntyp) !== weap.alignment) ? 1 : 0;
  } else if (weap.spfx & SPFX_ATTK) {
    // Check element resistances
    switch (weap.attk.adtyp) {
      case AD_FIRE:
        return !(mon.mintrinsics & MR_FIRE) ? 1 : 0;
      case AD_COLD:
        return !(mon.mintrinsics & MR_COLD) ? 1 : 0;
      case AD_ELEC:
        return !(mon.mintrinsics & MR_ELEC) ? 1 : 0;
      case AD_MAGM:
      case AD_STUN:
        return (rn2(100) >= (ptr.mr || 0)) ? 1 : 0;
      case AD_DRST:
        return !(mon.mintrinsics & MR_POISON) ? 1 : 0;
      case AD_DRLI:
        return !resists_drli(mon) ? 1 : 0;
      default:
        return 0;
    }
  }
  return 0;
}

// cf. artifact.c:1076 — spec_abon(otmp, mon)
// Autotranslated from artifact.c:1075
export function spec_abon(otmp, mon) {
  let weap = get_artifact(otmp);
  if (weap !== artilist[ART_NONARTIFACT] && weap.attk.damn && spec_applies(weap, mon)) return rnd(weap.attk.damn);
  return 0;
}

// cf. artifact.c:1091 — spec_dbon(otmp, mon, tmp)
// Returns [damage_bonus, spec_dbon_applies]
export function spec_dbon(otmp, mon, tmp) {
  const weap = get_artifact(otmp);
  let applies;

  if (weap === artilist[ART_NONARTIFACT]
      || (weap.attk.adtyp === AD_PHYS && weap.attk.damn === 0 && weap.attk.damd === 0)) {
    applies = false;
  } else if (is_art(otmp, ART_GRIMTOOTH)) {
    // Grimtooth damage applies to all targets
    applies = true;
  } else {
    applies = spec_applies(weap, mon) !== 0;
  }

  if (applies) {
    return [weap.attk.damd ? rnd(weap.attk.damd) : Math.max(tmp, 1), true];
  }
  return [0, false];
}

// ── Discovery ──

// cf. artifact.c:1113 — discover_artifact(m)
export function discover_artifact(m) {
  if (m < 1 || m > NROFARTIFACTS) return;
  // Add to discovery list if not already there
  if (!artidisco.includes(m)) {
    artidisco.push(m);
  }
}

// cf. artifact.c:1131 — undiscovered_artifact(m)
// Autotranslated from artifact.c:1130
export function undiscovered_artifact(m) {
  let i;
  for (i = 0; i < NROFARTIFACTS; i++) {
    if (artidisco[i] === m) return false;
    else if (artidisco[i] === 0) {
      break;
    }
  }
  return true;
}

// cf. artifact.c:1147 — disp_artifact_discoveries(putstr_fn)
// Returns count of discovered artifacts. If putstr_fn is provided,
// calls it for each line of output.
export function disp_artifact_discoveries(putstr_fn) {
  let count = 0;
  for (let i = 0; i < artidisco.length; i++) {
    const m = artidisco[i];
    if (!m) break;
    count++;
    if (putstr_fn) {
      if (i === 0) putstr_fn('Artifacts');
      const otyp = artilist[m].otyp;
      const align = artilist[m].alignment;
      const algnstr = align === A_LAWFUL ? 'lawful' :
                      align === A_NEUTRAL ? 'neutral' :
                      align === A_CHAOTIC ? 'chaotic' : 'non-aligned';
      const typname = objectData[otyp] ? objectData[otyp].oc_name : 'unknown';
      putstr_fn(`  ${artiname(m)} [${algnstr} ${typname}]`);
    }
  }
  return count;
}

// cf. artifact.c:1177 — dump_artifact_info(putstr_fn)
// Wizard mode: show all artifacts and their flags.
export function dump_artifact_info(putstr_fn) {
  if (!putstr_fn) return;
  putstr_fn('Artifacts');
  for (let m = 1; m <= NROFARTIFACTS; m++) {
    const a = artiexist[m];
    const flags = [];
    if (a.exists) flags.push('exists');
    if (a.found) flags.push('hero knows');
    if (a.gift) flags.push('gift');
    if (a.wish) flags.push('wish');
    if (a.named) flags.push('named');
    if (a.viadip) flags.push('viadip');
    if (a.lvldef) flags.push('lvldef');
    if (a.bones) flags.push('bones');
    if (a.rndm) flags.push('random');
    putstr_fn(`  ${artiname(m).padEnd(36)}[${flags.join('; ')}]`);
  }
}

// ── Glow/warning ──

// cf. artifact.c:2427 — glow_color(arti_indx)
export function glow_color(arti_indx) {
  const colornum = artilist[arti_indx].acolor;
  // Map color number to color name
  const colorNames = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    '', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white'
  ];
  return colorNames[colornum] || '';
}

const glow_verbs = ['quiver', 'flicker', 'glimmer', 'gleam'];

// cf. artifact.c:2442 — glow_strength(count)
function glow_strength(count) {
  return (count > 12) ? 3 : (count > 4) ? 2 : (count > 0) ? 1 : 0;
}

// cf. artifact.c:2451 — glow_verb(count, ingsfx)
export function glow_verb(count, ingsfx = false) {
  let verb = glow_verbs[glow_strength(count)];
  if (ingsfx) verb += 'ing';
  return verb;
}

// Module-level tracking for Sting warning
let warn_obj_cnt = 0;
export function get_warn_obj_cnt() { return warn_obj_cnt; }
export function set_warn_obj_cnt(n) { warn_obj_cnt = n; }

// cf. artifact.c:2466 — Sting_effects(orc_count, player)
export async function Sting_effects(orc_count, player) {
  if (!player || !player.weapon) return;
  const uwep = player.weapon;
  if (!(is_art(uwep, ART_STING)
      || is_art(uwep, ART_ORCRIST)
      || is_art(uwep, ART_GRIMTOOTH)))
    return;

  const oldstr = glow_strength(warn_obj_cnt);
  const newstr = glow_strength(orc_count);

  if (orc_count === -1 && warn_obj_cnt > 0) {
    // Blindness toggled
    await pline("%s is %s.", uwep.oname || artiname(uwep.oartifact),
          glow_verb(0, true)); // blind case: "quivering"
  } else if (newstr > 0 && newstr !== oldstr) {
    // Start or intensify glow
    await pline("%s %s %s%s",
      uwep.oname || artiname(uwep.oartifact),
      glow_verb(orc_count, false) + 's',
      glow_color(uwep.oartifact),
      (newstr > oldstr) ? '!' : '.');
  } else if (orc_count === 0 && warn_obj_cnt > 0) {
    // Stop glow
    await pline("%s stops %s.",
      uwep.oname || artiname(uwep.oartifact),
      glow_verb(warn_obj_cnt, true));
  }
  warn_obj_cnt = orc_count === -1 ? warn_obj_cnt : orc_count;
}

// ── Touch and equipment ──

// cf. artifact.c:908 — touch_artifact(obj, mon)
export function touch_artifact(obj, mon) {
  const oart = get_artifact(obj);
  if (oart === artilist[ART_NONARTIFACT]) return 1;

  const self_willed = !!(oart.spfx & SPFX_INTEL);
  // For monsters, check alignment and role restrictions
  if (mon && mon.data) {
    const badalign = !!(oart.spfx & SPFX_RESTR) && oart.alignment !== A_NONE
                     && oart.alignment !== (mon.maligntyp || 0);
    const badclass = self_willed && oart.role !== NON_PM;
    const bane = bane_applies(oart, mon);
    if ((badclass || badalign || bane) && self_willed) return 0;
    if (badalign && !rn2(4)) return 0;
  }
  return 1;
}

// cf. artifact.c:2508 — retouch_object(obj, loseit, player)
// Returns 1 if hero can still handle the object, 0 if not.
export async function retouch_object(obj, loseit, player) {
  if (!obj) return 1;

  // Allow hero to use the Bell of Opening at the invocation spot
  // (full check omitted; simplified)

  if (touch_artifact(obj, player || { data: null })) {
    // Check silver bane
    const oart = get_artifact(obj);
    const bane = (oart !== artilist[ART_NONARTIFACT]) && bane_applies(oart, player || { data: null });
    const ag = objectData[obj.otyp] && objectData[obj.otyp].oc_material === SILVER;
    if (!ag && !bane) return 1;
    // Hero can't handle it
    await You_cant("handle %s%s!", obj.oname || 'the object',
             obj.owornmask ? ' anymore' : '');
    if (ag) {
      const tmp = rnd(10);
      // losehp would go here
    }
    if (bane) {
      rnd(10); // consume RNG for bane damage
    }
  }

  // Remove worn item
  if (obj.owornmask) {
    obj.owornmask = 0;
  }

  return 0;
}

// cf. artifact.c:2598 — untouchable(obj, drop_untouchable)
// Returns true if object fails touch test and was unworn/unwielded (and
// possibly dropped by retouch_object), false otherwise.
export async function untouchable(obj, drop_untouchable, player) {
  if (!obj) return false;
  const oart = get_artifact(obj);
  const beingworn = !!obj.owornmask;
  const carryeffect = (oart !== artilist[ART_NONARTIFACT]) && !!(oart.cary.adtyp || oart.cspfx);
  const invoked = (oart !== artilist[ART_NONARTIFACT])
    && !!(oart.inv_prop > 0 && oart.inv_prop <= LAST_PROP
      && player?.uprops?.[oart.inv_prop]
      && (player.uprops[oart.inv_prop].extrinsic & W_ARTI));
  if (!(beingworn || carryeffect || invoked)) return false;
  const canHandle = await retouch_object(obj, !!drop_untouchable, player);
  if (canHandle) return false;
  return true;
}

// cf. artifact.c:2640 — retouch_equipment(dropflag, player)
export function retouch_equipment(dropflag, player) {
  if (!player) return;
  // Re-check all equipped items for touchability.
  // In the full C implementation this iterates over inventory with
  // bypass tracking and calls untouchable() for each worn item.
  // Simplified: check weapon and armor slots.
  const slots = ['weapon', 'armor', 'shield', 'helmet', 'gloves', 'boots', 'cloak', 'shirt', 'amulet', 'leftRing', 'rightRing'];
  for (const slot of slots) {
    const obj = player[slot];
    if (obj && obj.oartifact) {
      if (!touch_artifact(obj, player)) {
        // Remove the item
        player[slot] = null;
        if (obj.owornmask) obj.owornmask = 0;
      }
    }
  }
}

// ── Artifact intrinsics ──

// W_ART/W_ARTI: canonical in const.js (prop.h: W_ART=0x1000, W_ARTI=0x2000)

export async function set_artifact_intrinsic(otmp, on, wp_mask, player) {
  const oart = get_artifact(otmp);
  if (oart === artilist[ART_NONARTIFACT]) return;

  // In the JS port the player uprops system is keyed by property index.
  // Many of the C extrinsic bitfields (EFire_resistance etc.) map to
  // player.uprops[propIdx].extrinsic.  Since the full uprops system is
  // not always wired, we guard against missing entries.
  function ensureProp(propIdx) {
    if (!player || !player.uprops) return null;
    if (!player.uprops[propIdx])
      player.uprops[propIdx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return player.uprops[propIdx];
  }

  // --- defn / cary resistance ---
  const dtyp = (wp_mask !== W_ART) ? oart.defn.adtyp : oart.cary.adtyp;
  // Map AD_ to property index
  const adtypToProp = {
    [AD_FIRE]: 0,   // FIRE_RES
    [AD_COLD]: 1,   // COLD_RES
    [AD_ELEC]: 4,   // SHOCK_RES
    [AD_MAGM]: 11,  // ANTIMAGIC
    [AD_DISN]: 3,   // DISINT_RES
    [AD_DRST]: 5,   // POISON_RES
    [AD_DRLI]: 8,   // DRAIN_RES
  };

  let propIdx = adtypToProp[dtyp];
  if (propIdx !== undefined) {
    let dominated = false;
    // When removing W_ART carry effect, check if another carried artifact
    // also confers this; if so, leave the mask alone.
    if (wp_mask === W_ART && !on && player) {
      const inv = player.inventory || [];
      for (const o of inv) {
        if (o !== otmp && o.oartifact) {
          const art2 = get_artifact(o);
          if (art2 !== artilist[ART_NONARTIFACT] && art2.cary.adtyp === dtyp) {
            dominated = true;
            break;
          }
        }
      }
    }
    if (!dominated) {
      const p = ensureProp(propIdx);
      if (p) {
        if (on) p.extrinsic |= wp_mask;
        else p.extrinsic &= ~wp_mask;
      }
    }
  }

  // --- spfx intrinsics ---
  let spfx = (wp_mask !== W_ART) ? oart.spfx : oart.cspfx;
  if (spfx && wp_mask === W_ART && !on && player) {
    // don't remove spfx also conferred by other carried artifacts
    const inv = player.inventory || [];
    for (const o of inv) {
      if (o !== otmp && o.oartifact) {
        const art2 = get_artifact(o);
        if (art2 !== artilist[ART_NONARTIFACT])
          spfx &= ~art2.cspfx;
      }
    }
  }

  // Map SPFX_ bits to property indices
  const spfxMap = [
    [SPFX_SEARCH, 31],  // SEARCHING
    [SPFX_ESP,    49],  // TELEPAT
    [SPFX_STLTH,  STEALTH],
    [SPFX_REGEN,  REGENERATION],
    [SPFX_TCTRL,  TELEPORT_CONTROL],
    [SPFX_EREGEN, ENERGY_REGENERATION],
    [SPFX_HSPDAM, HALF_SPDAM],
    [SPFX_HPHDAM, HALF_PHDAM],
    [SPFX_PROTECT,PROTECTION],
    [SPFX_REFLECT,REFLECTING],  // only for W_WEP
  ];

  for (const [bit, prop] of spfxMap) {
    if (!(spfx & bit)) continue;
    // SPFX_REFLECT from artifact only applies when wielded
    if (bit === SPFX_REFLECT && !(wp_mask & W_WEP)) continue;
    const p = ensureProp(prop);
    if (p) {
      if (on) p.extrinsic |= wp_mask;
      else p.extrinsic &= ~wp_mask;
    }
  }

  // SPFX_WARN: warn_of_mon vs generic warning
  if (spfx & SPFX_WARN) {
    if (spec_m2(otmp)) {
      const p = ensureProp(WARN_OF_MON);
      if (p) {
        if (on) p.extrinsic |= wp_mask;
        else p.extrinsic &= ~wp_mask;
      }
    } else {
      const p = ensureProp(WARNING);
      if (p) {
        if (on) p.extrinsic |= wp_mask;
        else p.extrinsic &= ~wp_mask;
      }
    }
  }

  // SPFX_HALRES: hallucination resistance
  if (spfx & SPFX_HALRES) {
    const p = ensureProp(HALLUC_RES);
    if (p) {
      if (on) p.extrinsic |= wp_mask;
      else p.extrinsic &= ~wp_mask;
    }
  }

  // SPFX_XRAY
  if (spfx & SPFX_XRAY) {
    if (player) {
      player.xray_range = on ? 3 : -1;
    }
  }

  // Sunsword blindness resistance when wielded
  if (wp_mask === W_WEP && is_art(otmp, ART_SUNSWORD)) {
    // BLINDED property doesn't map directly; skip for now
    // In C this sets EBlnd_resist
  }

  // If dropping (W_ART removal) and artifact has inv_prop <= LAST_PROP that
  // is currently invoked, turn it off
  if (wp_mask === W_ART && !on && oart.inv_prop) {
    if (oart.inv_prop <= LAST_PROP && player && player.uprops) {
      const ip = player.uprops[oart.inv_prop];
      if (ip && (ip.extrinsic & W_ARTI)) {
        await arti_invoke(otmp, player);
      }
    }
  }
}

// ── Artifact creation ──

// cf. artifact.c:171 — mk_artifact(otmp, alignment, max_giftvalue, adjust_spe)
export function mk_artifact(otmp, alignment, max_giftvalue = 99, adjust_spe = true, mksobj_fn = null) {
  const by_align = (alignment !== A_NONE);
  const o_typ = (by_align || !otmp) ? 0 : otmp.otyp;
  const eligible = [];
  const alteligible = [];

  // Gather eligible artifacts
  for (let m = 1; m < artilist.length && artilist[m].otyp; m++) {
    const a = artilist[m];
    if (artiexist[m].exists) continue;
    if (a.spfx & SPFX_NOGEN) continue;
    if (a.gift_value > max_giftvalue) continue;

    if (!by_align) {
      if (a.otyp === o_typ) eligible.push(m);
      continue;
    }

    // Looking for alignment-specific item
    if (a.alignment === alignment || a.alignment === A_NONE) {
      eligible.push(m);
    }
  }

  const n = eligible.length || alteligible.length;
  const candidates = eligible.length ? eligible : alteligible;

  if (candidates.length) {
    const m = candidates[rn2(candidates.length)];
    const a = artilist[m];

    if (by_align && mksobj_fn) {
      otmp = mksobj_fn(a.otyp, true, false);
    }
    if (!otmp) return null;

    otmp.oeroded = 0;
    otmp.oeroded2 = 0;
    otmp.oname = a.name;
    otmp.oartifact = m;
    artifact_origin(otmp, ONAME_RANDOM);

    if (adjust_spe && a.gen_spe) {
      const new_spe = otmp.spe + a.gen_spe;
      if (new_spe >= -10 && new_spe < 10) otmp.spe = new_spe;
    }
  } else if (by_align) {
    return null; // no eligible artifact found
  }

  if (otmp && permapoisoned(otmp)) {
    otmp.opoisoned = 1;
  }
  return otmp;
}

// ── Magicbane and artifact combat ──

const FATAL_DAMAGE_MODIFIER = 200;
const MB_MAX_DIEROLL = 8;
const MB_INDEX_PROBE = 0;
const MB_INDEX_STUN = 1;
const MB_INDEX_SCARE = 2;
const MB_INDEX_CANCEL = 3;

const mb_verb = [
  ['probe', 'stun', 'scare', 'cancel'],
  ['prod', 'amaze', 'tickle', 'purge'],
];

// cf. artifact.c:1249 — Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee)
// dmgptr is { value: N }; caller reads dmgptr.value after call.
// spec_dbon_applies_flag is the second return value from spec_dbon.
export async function Mb_hit(magr, mdef, mb, dmgptr, dieroll, vis, hittee, spec_dbon_applies_flag) {
  const youattack = !!(magr && magr.isPlayer);
  const youdefend = !!(mdef && mdef.isPlayer);
  let resisted = false, do_stun, do_confuse, result;
  let attack_indx;
  let scare_dieroll = Math.floor(MB_MAX_DIEROLL / 2);

  result = false;
  if (mb.spe >= 3)
    scare_dieroll = (scare_dieroll / (1 << Math.floor(mb.spe / 3))) | 0;
  if (!spec_dbon_applies_flag)
    dieroll += 1;

  do_stun = (Math.max(mb.spe, 0) < rn2(spec_dbon_applies_flag ? 11 : 7));

  attack_indx = MB_INDEX_PROBE;
  dmgptr.value += rnd(4);
  if (do_stun) {
    attack_indx = MB_INDEX_STUN;
    dmgptr.value += rnd(4);
  }
  if (dieroll <= scare_dieroll) {
    attack_indx = MB_INDEX_SCARE;
    dmgptr.value += rnd(4);
  }
  if (dieroll <= Math.floor(scare_dieroll / 2)) {
    attack_indx = MB_INDEX_CANCEL;
    dmgptr.value += rnd(4);
  }

  // Give hit message
  const verb = mb_verb[0][attack_indx]; // no Hallucination check for simplicity
  if (youattack || youdefend || vis) {
    result = true;
    await pline_The("magic-absorbing blade %ss %s!", verb, hittee);
  }

  // Perform special effects
  switch (attack_indx) {
    case MB_INDEX_CANCEL:
      // cancel_monst not always available; try it if the target is a monster
      if (!youdefend && mdef) {
        // Simplified: just set mcan
        if (rn2(2)) {
          resisted = true;
        } else {
          mdef.mcan = 1;
          do_stun = false;
        }
      } else if (youdefend) {
        // Simplified: player cancel reduces energy
        resisted = true; // player resists full cancel in simplified port
      }
      break;

    case MB_INDEX_SCARE:
      if (youdefend) {
        resisted = true; // simplified: player resists scare
      } else if (mdef) {
        if (rn2(2)) {
          resisted = true;
        } else {
          // monflee would go here
          if (mdef.mflee === undefined) mdef.mflee = 0;
          mdef.mflee = 1;
          mdef.mfleetim = 3;
          do_stun = false;
        }
      }
      if (!resisted) do_stun = false;
      break;

    case MB_INDEX_STUN:
      do_stun = true;
      break;

    case MB_INDEX_PROBE:
      // probe_monster would go here; skip for now
      break;
  }

  // Apply stun
  if (do_stun) {
    if (youdefend) {
      // make_stunned would go here
    } else if (mdef) {
      mdef.mstun = 1;
    }
    if (attack_indx === MB_INDEX_STUN)
      do_stun = false;
  }

  // Confusion
  do_confuse = !rn2(12);
  if (do_confuse) {
    if (youdefend) {
      // make_confused would go here
    } else if (mdef) {
      mdef.mconf = 1;
    }
  }

  // Side-effect messages
  if (youattack || youdefend || vis) {
    if (resisted) {
      await pline("%s resists!", hittee.charAt(0).toUpperCase() + hittee.slice(1));
    }
    if (do_stun || do_confuse) {
      let buf = '';
      if (do_stun) buf += 'stunned';
      if (do_stun && do_confuse) buf += ' and ';
      if (do_confuse) buf += 'confused';
      await pline("%s is %s%s",
        hittee.charAt(0).toUpperCase() + hittee.slice(1),
        buf,
        (do_stun && do_confuse) ? '!' : '.');
    }
  }

  return result;
}

// cf. artifact.c:1446 — artifact_hit(magr, mdef, otmp, dmgptr, dieroll)
// dmgptr is { value: N }; caller reads dmgptr.value after call.
// Returns true if a special message was given.
export async function artifact_hit(magr, mdef, otmp, dmgptr, dieroll) {
  const youattack = !!(magr && magr.isPlayer);
  const youdefend = !!(mdef && mdef.isPlayer);
  const vis = (!youattack && magr && magr.mx !== undefined)
              || (!youdefend && mdef && mdef.mx !== undefined)
              || youattack;
  let realizes_damage;

  const hittee = youdefend ? 'you' : (mdef && mdef.name ? mdef.name : 'it');

  // spec_dbon handles most damage; returns [bonus, applies]
  const [bonus, spec_dbon_applies_val] = spec_dbon(otmp, mdef, dmgptr.value);
  dmgptr.value += bonus;

  if (youattack && youdefend) return false;

  realizes_damage = youdefend || vis || (youattack && mdef);

  // Fire
  if (attacks(AD_FIRE, otmp)) {
    if (realizes_damage) {
      const mdat = mdef.data || (mdef.mnum != null ? mons[mdef.mnum] : null);
      const action = !spec_dbon_applies_val ? 'hits'
        : (mdat && mdat.mndx === PM_WATER_ELEMENTAL) ? 'vaporizes part of'
        : 'burns';
      await pline_The("fiery blade %s %s%s", action, hittee, !spec_dbon_applies_val ? '.' : '!');
    }
    if (!rn2(4)) {
      // destroy_items / ignite_items not yet ported; consume RNG
    }
    return realizes_damage;
  }
  // Cold
  if (attacks(AD_COLD, otmp)) {
    if (realizes_damage) {
      await pline_The("ice-cold blade %s %s%s",
        !spec_dbon_applies_val ? 'hits' : 'freezes', hittee,
        !spec_dbon_applies_val ? '.' : '!');
    }
    if (!rn2(4)) {
      // destroy_items not yet ported
    }
    return realizes_damage;
  }
  // Elec
  if (attacks(AD_ELEC, otmp)) {
    if (realizes_damage) {
      await pline_The("massive hammer hits%s %s%s",
        !spec_dbon_applies_val ? '' : '!  Lightning strikes', hittee,
        !spec_dbon_applies_val ? '.' : '!');
    }
    if (!rn2(5)) {
      // destroy_items not yet ported
    }
    return realizes_damage;
  }
  // Magic missiles
  if (attacks(AD_MAGM, otmp)) {
    if (realizes_damage) {
      await pline_The("imaginary widget hits%s %s%s",
        !spec_dbon_applies_val ? '' : '!  A hail of magic missiles strikes',
        hittee, !spec_dbon_applies_val ? '.' : '!');
    }
    return realizes_damage;
  }

  // Magicbane special
  if (attacks(AD_STUN, otmp) && dieroll <= MB_MAX_DIEROLL) {
    return await Mb_hit(magr, mdef, otmp, dmgptr, dieroll, vis, hittee, spec_dbon_applies_val);
  }

  if (!spec_dbon_applies_val) return false;

  // Vorpal / Tsurugi beheading
  if (spec_ability(otmp, SPFX_BEHEAD)) {
    if (is_art(otmp, ART_TSURUGI_OF_MURAMASA) && dieroll === 1) {
      const wepdesc = 'The razor-sharp blade';
      if (!youdefend) {
        const mdat = mdef.data || (mdef.mnum != null ? mons[mdef.mnum] : null);
        if (mdat && (mdat.msize || 0) >= MZ_LARGE) {
          if (youattack) await You("slice deeply into %s!", hittee);
          else if (vis) await pline("%s cuts deeply into %s!", magr.name || 'It', hittee);
          dmgptr.value *= 2;
          return true;
        }
        dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
        await pline("%s cuts %s in half!", wepdesc, hittee);
        return true;
      } else {
        // player is defender
        dmgptr.value *= 2;
        await pline("%s cuts deeply into you!", magr ? (magr.name || wepdesc) : wepdesc);
        return true;
      }
    } else if (is_art(otmp, ART_VORPAL_BLADE)
               && (dieroll === 1 || (mdef.data && mdef.data.mndx === PM_JABBERWOCK)
                   || (mdef.mnum === PM_JABBERWOCK))) {
      const wepdesc = artilist[ART_VORPAL_BLADE].name;
      if (!youdefend) {
        const mdat = mdef.data || (mdef.mnum != null ? mons[mdef.mnum] : null);
        if (!mdat || !has_head_simple(mdat)) {
          if (youattack) await pline("Somehow, you miss %s wildly.", hittee);
          else if (vis) await pline("Somehow, %s misses wildly.", magr.name || 'it');
          dmgptr.value = 0;
          return !!(youattack || vis);
        }
        if (noncorporeal_simple(mdat) || amorphous_simple(mdat)) {
          await pline("%s slices through %s's neck.", wepdesc, hittee);
          return true;
        }
        dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
        await pline("%s beheads %s!", wepdesc, hittee);
        return true;
      } else {
        // player is defender — very lethal
        dmgptr.value = 2 * (mdef.mhp || mdef.hp || 0) + FATAL_DAMAGE_MODIFIER;
        await pline("%s beheads you!", wepdesc);
        return true;
      }
    }
  }

  // Drain life
  if (spec_ability(otmp, SPFX_DRLI)) {
    const mdat = mdef.data || (mdef.mnum != null ? mons[mdef.mnum] : null);
    const life = (mdat && nonliving_simple(mdat)) ? 'animating force' : 'life';
    if (!youdefend) {
      const m_lev = mdef.m_lev || 0;
      let drain = rnd(8); // monhp_per_lvl is usually 1d8
      if (mdef.mhpmax - drain <= m_lev)
        drain = (mdef.mhpmax > m_lev) ? (mdef.mhpmax - (m_lev + 1)) : 0;

      if (vis) {
        if (is_art(otmp, ART_STORMBRINGER))
          await pline_The("black blade draws the %s from %s!", life, hittee);
        else
          await pline("%s draws the %s from %s!", otmp.oname || 'The weapon', life, hittee);
      }
      if (m_lev === 0) {
        dmgptr.value = 2 * mdef.mhp + FATAL_DAMAGE_MODIFIER;
      } else {
        dmgptr.value += drain;
        mdef.mhpmax -= drain;
        mdef.m_lev--;
      }
      // Heal attacker
      if (drain > 0) {
        const healamt = ((drain + 1) / 2) | 0;
        if (youattack && magr) {
          if (magr.hp !== undefined) {
            magr.hp = Math.min(magr.hp + healamt, magr.hpmax || magr.hp + healamt);
          }
        } else if (magr) {
          magr.mhp = Math.min((magr.mhp || 0) + healamt, magr.mhpmax || magr.mhp + healamt);
        }
      }
      return vis;
    } else {
      // Player is the defender
      if (vis || youdefend) {
        if (is_art(otmp, ART_STORMBRINGER))
          await pline_The("black blade drains your %s!", life);
        else
          await pline("%s drains your %s!", otmp.oname || 'The weapon', life);
      }
      // losexp would go here for full implementation
      return true;
    }
  }

  return false;
}

// Simple helpers for mondata checks used above, avoiding circular imports
// These previously used _simple inline approximations with wrong flag values.
// Now using proper functions from mondata.js.
const has_head_simple = has_head;
const noncorporeal_simple = noncorporeal;
const amorphous_simple = amorphous;
const nonliving_simple = nonliving;

function playerEnergy(player) {
  if (!player) return 0;
  if (Number.isFinite(player.uen)) return player.uen;
  if (Number.isFinite(player.pw)) return player.pw;
  return Number(player.en || 0);
}

function setPlayerEnergy(player, value) {
  if (!player) return;
  if (Number.isFinite(player.uen)) {
    player.uen = value;
    return;
  }
  if (Number.isFinite(player.pw)) {
    player.pw = value;
    return;
  }
  player.en = value;
}

function playerEnergyMax(player) {
  if (!player) return 0;
  if (Number.isFinite(player.uenmax)) return player.uenmax;
  if (Number.isFinite(player.pwmax)) return player.pwmax;
  return Number(player.enmax || 0);
}

function currentHpField(player) {
  if (!player) return null;
  if (Number.isFinite(player.uhp) && Number.isFinite(player.uhpmax)) return ['uhp', 'uhpmax'];
  if (Number.isFinite(player.mhp) && Number.isFinite(player.mhpmax)) return ['mhp', 'mhpmax'];
  if (Number.isFinite(player.hp) && Number.isFinite(player.hpmax)) return ['hp', 'hpmax'];
  return null;
}

// cf. artifact.c:1727 — invoke_ok(obj)
export function invoke_ok(obj) {
  if (!obj) return GETOBJ_EXCLUDE;
  if (obj.oartifact || objectData[obj.otyp]?.oc_unique
      || (obj.otyp === FAKE_AMULET_OF_YENDOR && !obj.known)
      || obj.otyp === CRYSTAL_BALL)
    return GETOBJ_SUGGEST;
  return GETOBJ_EXCLUDE;
}

// cf. artifact.c:1749 — doinvoke()
export async function doinvoke(player, game = null) {
  const obj = getobj('invoke', invoke_ok, 0, player);
  if (!obj) return ECMD_CANCEL;
  if (!await retouch_object(obj, false, player)) return ECMD_TIME;
  return await arti_invoke(obj, player, game);
}

// cf. artifact.c:1762 — nothing_special(obj)
export async function nothing_special(obj) {
  if (carried(obj)) {
    await You_feel("a surge of power, but nothing seems to happen.");
  }
}

// cf. artifact.c:1769 — invoke_taming(obj)
export async function invoke_taming(obj, game = null, player = null) {
  const display = game?.disp || game?.display || null;
  if (player && display) {
    await seffect_taming(obj, player, display, game);
  } else {
    await pline("A wave of calm sweeps over you.");
  }
  return ECMD_TIME;
}

// cf. artifact.c:1780 — invoke_healing(obj, player)
export async function invoke_healing(obj, player) {
  if (!player) { await nothing_special(obj); return ECMD_TIME; }
  const hpFields = currentHpField(player);
  if (!hpFields) { await nothing_special(obj); return ECMD_TIME; }
  const [hp, hpmax] = hpFields;
  const creamed = Number(player.ucreamed || 0);
  const blindEntry = player.uprops?.[BLINDED] || null;
  const blindedTimeout = blindEntry ? (blindEntry.intrinsic & TIMEOUT) : Number(player.blindedTimeout || 0);
  const sickTimeout = player.getPropTimeout ? player.getPropTimeout(SICK) : Number(player.sick || 0);
  const slimedTimeout = player.getPropTimeout ? player.getPropTimeout(SLIMED) : Number(player.slimed || 0);
  let healamt = ((player[hpmax] + 1 - player[hp]) / 2) | 0;
  if (healamt > 0 || sickTimeout > 0 || slimedTimeout > 0 || blindedTimeout > creamed) {
    await You_feel("better.");
    player[hp] += healamt;
  } else {
    await nothing_special(obj);
    return ECMD_TIME;
  }
  if (sickTimeout > 0) {
    if (player.uprops?.[SICK]) player.uprops[SICK].intrinsic &= ~TIMEOUT;
    player.sick = 0;
  }
  if (slimedTimeout > 0 && player.uprops?.[SLIMED]) player.uprops[SLIMED].intrinsic &= ~TIMEOUT;
  if (blindedTimeout > creamed && blindEntry) {
    blindEntry.intrinsic = (blindEntry.intrinsic & ~TIMEOUT) | (creamed & TIMEOUT);
  } else if (blindedTimeout > creamed) {
    player.blindedTimeout = creamed;
  }
  return ECMD_TIME;
}

// cf. artifact.c:1818 — invoke_energy_boost(obj, player)
// Autotranslated from artifact.c:1817
export async function invoke_energy_boost(obj, game, player) {
  if (!player) {
    await nothing_special(obj);
    return ECMD_TIME;
  }
  const emax = playerEnergyMax(player);
  const enow = playerEnergy(player);
  let epboost = Math.floor((emax + 1 - enow) / 2);
  if (epboost > 120) epboost = 120;
  else if (epboost < 12) epboost = emax - enow;
  if (epboost) {
    setPlayerEnergy(player, enow + epboost);
    if (game?.disp) game.disp.botl = true;
    await You_feel("re-energized.");
  }
  else { await nothing_special(obj); return ECMD_TIME; }
  return ECMD_TIME;
}

// cf. artifact.c:1838 — invoke_untrap(obj)
export async function invoke_untrap(obj, game = null) {
  const res = await dountrap();
  if (res !== ECMD_TIME) {
    obj.age = 0;
    return ECMD_CANCEL;
  }
  return ECMD_TIME;
}

// cf. artifact.c:1848 — invoke_charge_obj(obj)
export async function invoke_charge_obj(obj, game = null, player = null) {
  if (!player) {
    obj.age = 0;
    return ECMD_CANCEL;
  }
  const target = getobj(
    'charge',
    charge_ok,
    0,
    player
  );
  if (!target) {
    obj.age = 0;
    return ECMD_CANCEL;
  }
  const oart = get_artifact(obj);
  const roleMnum = Number.isInteger(player?.roleMnum) ? player.roleMnum : null;
  const blessedEffect = !!obj?.blessed
    && (oart.role === NON_PM || (roleMnum !== null && oart.role === roleMnum));
  const curseBless = blessedEffect ? 1 : (obj?.cursed ? -1 : 0);
  await recharge(target, curseBless, player, game);
  return ECMD_TIME;
}

// cf. artifact.c:1867 — invoke_create_portal(obj)
export async function invoke_create_portal(obj) {
  // Portal creation requires dungeon/level system; stub
  await You_feel("very disoriented for a moment.");
  return 1;
}

// cf. artifact.c:1934 — invoke_create_ammo(obj)
export async function invoke_create_ammo(obj) {
  // mksobj(ARROW) not wired to invocation; stub
  await nothing_special(obj);
  return 1;
}

// cf. artifact.c:1963 — invoke_banish(obj)
export async function invoke_banish(obj) {
  // Demon banishment requires monster iteration; stub
  await nothing_special(obj);
  return 1;
}

// cf. artifact.c:2022 — invoke_fling_poison(obj)
export async function invoke_fling_poison(obj) {
  // Requires getdir/throwit; stub
  await nothing_special(obj);
  return 1;
}

// cf. artifact.c:2040 — invoke_storm_spell(obj)
export async function invoke_storm_spell(obj) {
  // Requires spelleffects; stub
  await nothing_special(obj);
  return 1;
}

// cf. artifact.c:2054 — invoke_blinding_ray(obj)
export async function invoke_blinding_ray(obj) {
  // Requires getdir; stub
  await nothing_special(obj);
  return 1;
}

// cf. artifact.c:2091 — arti_invoke_cost_pw(obj)
export function arti_invoke_cost_pw(obj) {
  const oart = get_artifact(obj);
  if (oart.inv_prop === FLING_POISON || oart.inv_prop === BLINDING_RAY) {
    // SPELL_LEV_PW(5) = 5 * 5 = 25 in C
    return 25;
  }
  return -1;
}

// cf. artifact.c:2105 — arti_invoke_cost(obj, player, game)
export async function arti_invoke_cost(obj, player, game) {
  const moves = (game && game.moves) || 0;
  if (obj.age > moves) {
    const pw_cost = arti_invoke_cost_pw(obj);
    const en = playerEnergy(player);
    if (pw_cost < 0 || en < pw_cost) {
      await You_feel("that %s is ignoring you.", obj.oname || 'the artifact');
      obj.age += d(3, 10);
      return false;
    } else {
      await You_feel("drained...");
      setPlayerEnergy(player, Math.max(0, en - pw_cost));
      if (game?.disp) game.disp.botl = true;
    }
  } else {
    obj.age = moves + rnz(100);
  }
  return true;
}

// cf. artifact.c:2131 — arti_invoke(obj, player, game)
export async function arti_invoke(obj, player, game) {
  if (!obj) return 0;
  const oart = get_artifact(obj);
  if (oart === artilist[ART_NONARTIFACT] || !oart.inv_prop) {
    if (obj.otyp === CRYSTAL_BALL) {
      await use_crystal_ball(obj, player || null, game?.map || null, game?.display || game?.disp || null, game || null);
    } else {
      await pline("Nothing happens.");
    }
    return ECMD_TIME;
  }

  // Special powers (inv_prop > LAST_PROP)
  if (oart.inv_prop > LAST_PROP) {
    if (!await arti_invoke_cost(obj, player, game)) return 1;

    switch (oart.inv_prop) {
      case TAMING: return await invoke_taming(obj, game, player);
      case HEALING: return await invoke_healing(obj, player);
      case ENERGY_BOOST: return await invoke_energy_boost(obj, game, player);
      case UNTRAP: return await invoke_untrap(obj, game);
      case CHARGE_OBJ: return await invoke_charge_obj(obj, game, player);
      case LEV_TELE: /* await level_tele(); */ return 1;
      case CREATE_PORTAL: return await invoke_create_portal(obj);
      case ENLIGHTENING: /* enlightenment(); */ return 1;
      case CREATE_AMMO: return await invoke_create_ammo(obj);
      case BANISH: return await invoke_banish(obj);
      case FLING_POISON: return await invoke_fling_poison(obj);
      case SNOWSTORM: /* FALLTHRU */
      case FIRESTORM: return await invoke_storm_spell(obj);
      case BLINDING_RAY: return await invoke_blinding_ray(obj);
      default: break;
    }
    return 0;
  }

  // Toggle a property (inv_prop <= LAST_PROP)
  if (player && player.uprops) {
    if (!player.uprops[oart.inv_prop])
      player.uprops[oart.inv_prop] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const prop = player.uprops[oart.inv_prop];
    prop.extrinsic ^= W_ARTI;
    const on = !!(prop.extrinsic & W_ARTI);
    const moves = (game && game.moves) || 0;

    if (on && obj.age > moves) {
      prop.extrinsic ^= W_ARTI; // undo
      await You_feel("that %s is ignoring you.", obj.oname || 'the artifact');
      obj.age += d(3, 10);
      return 1;
    } else if (!on) {
      obj.age = moves + rnz(100);
    }

    if ((prop.extrinsic & ~W_ARTI) || prop.intrinsic) {
      await nothing_special(obj);
      return 1;
    }

    switch (oart.inv_prop) {
      case CONFLICT:
        await You_feel(on ? "like a rabble-rouser." : "the tension decrease around you.");
        break;
      case LEVITATION:
        if (on) await pline("You float up!");
        else await pline("You float gently to the ground.");
        break;
      case INVIS:
        if (on) await pline("Your body takes on a strange transparency...");
        else await pline("Your body seems to unfade...");
        break;
    }
  }
  return 1;
}

// cf. artifact.c:2236 — finesse_ahriman(obj, player)
export function finesse_ahriman(obj, player) {
  const oart = get_artifact(obj);
  if (oart === artilist[ART_NONARTIFACT]
      || oart.inv_prop !== LEVITATION)
    return false;
  if (!player || !player.uprops) return false;
  const lev = player.uprops[LEVITATION];
  if (!lev || !(lev.extrinsic & W_ARTI)) return false;
  // Check if removing W_ARTI would end levitation
  const saveLev = { ...lev };
  lev.intrinsic &= ~0x80000000; // I_SPECIAL | TIMEOUT approximation
  lev.extrinsic &= ~W_ARTI;
  const result = !(lev.intrinsic || lev.extrinsic);
  Object.assign(lev, saveLev);
  return result;
}

// cf. artifact.c:2279 — arti_speak(obj)
export async function arti_speak(obj) {
  const oart = get_artifact(obj);
  if (oart === artilist[ART_NONARTIFACT] || !(oart.spfx & SPFX_SPEAK))
    return 0;
  // getrumor() not ported; use a placeholder line
  const line = "NetHack rumors file closed for renovation.";
  await pline("%s whispers:", obj.oname || 'The artifact');
  await pline('"%s"', line);
  return 1;
}

// ── Mapping helpers ──

// cf. artifact.c:2320 — abil_to_adtyp(abil)
export function abil_to_adtyp(abil) {
  // Maps ability string to AD_ type
  // In JS, we use string-based ability names rather than pointers
  const map = {
    'fire_resistance': AD_FIRE,
    'cold_resistance': AD_COLD,
    'shock_resistance': AD_ELEC,
    'antimagic': AD_MAGM,
    'disint_resistance': AD_DISN,
    'poison_resistance': AD_DRST,
    'drain_resistance': AD_DRLI,
  };
  return map[abil] || 0;
}

// cf. artifact.c:2344 — abil_to_spfx(abil)
export function abil_to_spfx(abil) {
  const map = {
    'searching': SPFX_SEARCH,
    'halluc_resistance': SPFX_HALRES,
    'telepat': SPFX_ESP,
    'stealth': SPFX_STLTH,
    'regeneration': SPFX_REGEN,
    'teleport_control': SPFX_TCTRL,
    'warn_of_mon': SPFX_WARN,
    'warning': SPFX_WARN,
    'energy_regeneration': SPFX_EREGEN,
    'half_spell_damage': SPFX_HSPDAM,
    'half_physical_damage': SPFX_HPHDAM,
    'reflecting': SPFX_REFLECT,
  };
  return map[abil] || 0;
}

// cf. artifact.c:2376 — what_gives(abil, player)
// In the JS port, abil is a property name string matching abil_to_adtyp/abil_to_spfx keys.
// Returns the first inventory item that confers the given ability, or null.
export function what_gives(abil, player) {
  if (!player) return null;
  const dtyp = abil_to_adtyp(abil);
  const spfx = abil_to_spfx(abil);
  const inv = player.inventory || [];

  for (const obj of inv) {
    if (obj.oartifact) {
      const art = get_artifact(obj);
      if (art !== artilist[ART_NONARTIFACT]) {
        if (dtyp) {
          if (art.cary.adtyp === dtyp) return obj;
          if (art.defn.adtyp === dtyp && obj.owornmask) return obj;
        }
        if (spfx) {
          if ((art.cspfx & spfx) === spfx) return obj;
          if ((art.spfx & spfx) === spfx && obj.owornmask) return obj;
        }
      }
    }
  }
  return null;
}

// ── Master Key and misc ──

// cf. artifact.c:2708 — count_surround_traps(x, y, map)
export function count_surround_traps(x, y, map) {
  if (!map) return 0;
  let ret = 0;
  for (let dx = x - 1; dx <= x + 1; dx++) {
    for (let dy = y - 1; dy <= y + 1; dy++) {
      if (!isok(dx, dy)) continue;
      const cell = map.at(dx, dy);
      if (!cell) continue;
      // C: shown traps are not counted.
      const trap = typeof map.trapAt === 'function' ? map.trapAt(dx, dy) : null;
      if (trap) {
        const shown = !!(trap.tseen || cell.mem_trap);
        if (!shown) ret++;
        continue;
      }
      // C: trapped doors are counted.
      if (IS_DOOR(cell.typ) && ((cell.flags || 0) & D_TRAPPED)) {
        ret++;
        continue;
      }
      // C: trapped containers in a pile count once per location.
      const pile = typeof map.objectsAt === 'function'
        ? map.objectsAt(dx, dy)
        : (Array.isArray(map.objects) ? map.objects.filter(o => o.ox === dx && o.oy === dy) : []);
      if (pile.some(o => o && Is_container(o) && o.otrapped)) {
        ret++;
      }
    }
  }
  return ret;
}

// Module-level tracking for MKoT trap warnings
let mkot_trap_warn_count = 0;
export function get_mkot_trap_warn_count() { return mkot_trap_warn_count; }

const heat_descriptions = [
  'cool', 'slightly warm', 'warm', 'very warm',
  'hot', 'very hot', 'like fire'
];

// cf. artifact.c:2753 — mkot_trap_warn(player, map)
export async function mkot_trap_warn(player, map) {
  if (!player) return;
  const uwep = player.weapon;
  const uarmg = player.gloves;
  if (!uarmg && uwep && is_art(uwep, ART_MASTER_KEY_OF_THIEVERY)) {
    const ntraps = count_surround_traps(player.x, player.y, map);
    if (ntraps !== mkot_trap_warn_count) {
      const idx = Math.min(ntraps, heat_descriptions.length - 1);
      await pline_The("Key feels %s%s", heat_descriptions[idx], ntraps > 3 ? '!' : '.');
    }
    mkot_trap_warn_count = ntraps;
  } else {
    mkot_trap_warn_count = 0;
  }
}

// cf. artifact.c:2775 — is_magic_key(mon, obj)
export function is_magic_key(mon, obj) {
  if (is_art(obj, ART_MASTER_KEY_OF_THIEVERY)) {
    const mndx = mon?.mndx ?? mon?.data?.mndx ?? null;
    const isRogue = mndx === PM_ROGUE;
    return isRogue ? !obj.cursed : !!obj.blessed;
  }
  return false;
}

// cf. artifact.c:2790 — has_magic_key(mon)
export function has_magic_key(mon) {
  if (!mon) return null;
  const inv = mon.minvent || [];
  for (const o of inv) {
    if (is_magic_key(mon, o)) return o;
  }
  return null;
}

// ── Save/restore support ──

// cf. artifact.c:119 — save_artifacts()
export function save_artifacts() {
  return {
    artiexist: artiexist.map(a => ({ ...a })),
    artidisco: [...artidisco],
  };
}

// cf. artifact.c:133 — restore_artifacts(data)
export function restore_artifacts(data) {
  if (data && data.artiexist) {
    for (let i = 0; i <= NROFARTIFACTS && i < data.artiexist.length; i++) {
      Object.assign(artiexist[i], data.artiexist[i]);
    }
  }
  if (data && data.artidisco) {
    artidisco.length = 0;
    artidisco.push(...data.artidisco);
  }
}

// ── Expose artiexist for direct access (needed by some callers) ──
export function get_artiexist() { return artiexist; }

// Autotranslated from artifact.c:311
export function dispose_of_orig_obj(obj) {
  if (!obj) return;
  obj_extract_self(obj);
  obfree(obj,  0);
}
