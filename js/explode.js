// explode.js -- Explosion effects
// cf. explode.c — explosionmask, engulfer_explosion_msg, explode,
//                 scatter, splatter_burning_oil, explode_oil,
//                 adtyp_to_expltype, mon_explodes

import { rn2, rnd, d } from './rng.js';
import {
  isok,
  EXPL_DARK, EXPL_NOXIOUS, EXPL_MUDDY, EXPL_WET, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY, EXPL_MAX,
  MON_EXPLODE, BURNING_OIL, TRAP_EXPLODE,
  MAY_HITMON, MAY_HITYOU, MAY_HIT, MAY_DESTROY, MAY_FRACTURE,
} from './const.js';
import { AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_ACID,
         MR_FIRE, MR_COLD, MR_ELEC,
         mons } from './monsters.js';
import { WAND_CLASS } from './objects.js';
import { resist } from './zap.js';
import {
  tmp_at, nh_delay_output,
} from './animation.js';
import { DISP_BEAM, DISP_CHANGE, DISP_END } from './const.js';

// cf. explode.c:984 — adtyp_to_expltype(adtyp)
export function adtyp_to_expltype(adtyp) {
  switch (adtyp) {
    case AD_FIRE: return EXPL_FIERY;
    case AD_COLD: return EXPL_FROSTY;
    case AD_ELEC: return EXPL_MAGICAL;
    case AD_MAGM: return EXPL_MAGICAL;
    case AD_DRST: return EXPL_NOXIOUS;
    case AD_ACID: return EXPL_MUDDY;
    default: return EXPL_DARK;
  }
}

// cf. explode.c:25 — explosionmask(m, adtyp, olet)
// Simplified: returns whether target needs shield effect
export function explosionmask(m, adtyp, olet) {
  // Simplified stub — in full implementation this checks:
  // - monster resistances
  // - whether shields/reflection apply
  // - engulf status
  return 0;
}

// cf. explode.c:117 — engulfer_explosion_msg(adtyp, olet)
export function engulfer_explosion_msg(adtyp, olet) {
  // Stub — message for explosion while engulfed
  return '';
}

// cf. explode.c:198 — explode(x, y, type, dam, olet, expltype)
// Main explosion function
// type: negative means breath weapon, positive means spell/wand
// dam: base damage amount
// olet: object class triggering explosion (WAND_CLASS, MON_EXPLODE, etc.)
export async function explode(x, y, type, dam, olet, expltype, map, player) {
  // Determine damage type from type parameter
  let adtyp;
  if (type >= 0) {
    // Spell/wand: type = AD offset
    adtyp = type % 10; // extract damage type
  } else {
    // Breath weapon: type = -(adtyp - 1 + 20) or similar encoding
    adtyp = ((-type) % 10);
  }

  const frameGlyph = (phase) => {
    const chars = ['*', 'o', '*'];
    const colors = [9, 11, 1];
    const idx = Math.max(0, Math.min(2, phase));
    const ch = chars[idx];
    const color = colors[idx];
    if (expltype === EXPL_FROSTY) return { ch, color: 6 };
    if (expltype === EXPL_MAGICAL) return { ch, color: 12 };
    if (expltype === EXPL_FIERY) return { ch, color: 1 };
    return { ch, color };
  };

  // C ref: explode.c uses tmp_at(DISP_BEAM) + tmp_at(DISP_CHANGE) frame animation.
  try {
    for (let phase = 0; phase < 3; phase++) {
      tmp_at(phase === 0 ? DISP_BEAM : DISP_CHANGE, frameGlyph(phase));
      // Apply damage in 3x3 area around (x, y) while drawing this frame.
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const tx = x + dx;
          const ty = y + dy;
          if (!isok(tx, ty)) continue;
          tmp_at(tx, ty);

          if (!map || phase !== 2) continue;
          // Deal damage once (final frame), preserving prior JS behavior.
          const mon = map.monsterAt ? map.monsterAt(tx, ty) : null;
          if (mon && !mon.dead) {
            let mdam = dam;
            const mdat = mon.data || (mon.mndx != null ? mons[mon.mndx] : null);
            if (mdat) {
              if (adtyp === AD_FIRE && (mdat.mresists & MR_FIRE)) mdam = 0;
              else if (adtyp === AD_COLD && (mdat.mresists & MR_COLD)) mdam = 0;
              else if (adtyp === AD_ELEC && (mdat.mresists & MR_ELEC)) mdam = 0;
            }
            if (mdam > 0 && resist(mon, olet >= 0 ? olet : WAND_CLASS)) {
              mdam = Math.floor((mdam + 1) / 2);
            }
            if (mdam > 0) {
              mon.mhp -= mdam;
              if (mon.mhp <= 0) {
                mon.mhp = 0;
                mon.dead = true;
              }
            }
          }

          if (player && tx === player.x && ty === player.y && phase === 2) {
            const damu = dam;
            if (player.uhp) {
              player.uhp -= damu;
              if (player.uhp < 0) player.uhp = 0;
            }
          }
        }
      }
      await nh_delay_output();
    }
  } finally {
    tmp_at(DISP_END, 0);
  }
}

// cf. explode.c:720 — scatter(sx, sy, blastforce, scflags, obj)
// Scatter objects from explosion site
export function scatter(sx, sy, blastforce, scflags, obj, map) {
  // Simplified: in full implementation, objects at (sx,sy) are flung
  // in random directions based on blastforce and their weight.
  // This is primarily a visual/placement effect.
  if (!map) return 0;
  return 0;
}

// cf. explode.c:959 — splatter_burning_oil(x, y, diluted_oil)
const ZT_SPELL_O_FIRE = 11; // C: explode.c:965 local #define
export async function splatter_burning_oil(x, y, diluted_oil) {
  let dmg = d(diluted_oil ? 3 : 4, 4);
  await explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
}

// cf. explode.c:971 — explode_oil(obj, x, y)
export async function explode_oil(obj, x, y) {
  if (obj && obj.lamplit) {
    obj.lamplit = false;
    await splatter_burning_oil(x, y, obj.odiluted || false);
  }
}

// cf. explode.c:1016 — mon_explodes(mon, mattk)
// Monster self-destruct explosion (e.g., gas spore, yellow light)
export async function mon_explodes(mon, mattk, map, player) {
  if (!mon || !mattk) return;

  let dmg;
  if (mattk.damn) {
    dmg = d(mattk.damn, mattk.damd);
  } else if (mattk.damd) {
    const mlev = mon.m_lev || 0;
    dmg = d(mlev + 1, mattk.damd);
  } else {
    dmg = 0;
  }

  // Determine explosion type from attack damage type
  const adtyp = mattk.adtyp || AD_PHYS;
  const expltype = adtyp_to_expltype(adtyp);

  // Type encoding for breath-like explosion
  let type;
  if (adtyp === AD_PHYS) {
    type = -1; // physical explosion
  } else {
    type = -((adtyp - 1) + 20); // breath weapon formula
  }

  await explode(mon.mx, mon.my, type, dmg, MON_EXPLODE, expltype, map, player);

  // Monster always dies from self-destruct
  mon.mhp = 0;
  mon.dead = true;
}

// cf. zap.c ugolemeffects() — golem absorbs elemental damage
export function ugolemeffects(dmgtyp, dam) {
  // Stub — player-as-golem elemental absorption
  // Returns true if damage was absorbed
  return false;
}
