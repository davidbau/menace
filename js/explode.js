// explode.js -- Explosion effects
// cf. explode.c — explosionmask, engulfer_explosion_msg, explode,
//                 scatter, splatter_burning_oil, explode_oil,
//                 adtyp_to_expltype, mon_explodes

import { rn2, rnd, d, c_d } from './rng.js';
import {
  isok, A_STR,
  EXPL_DARK, EXPL_NOXIOUS, EXPL_MUDDY, EXPL_WET, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY, EXPL_MAX,
  MON_EXPLODE, BURNING_OIL, TRAP_EXPLODE,
  MAY_HITMON, MAY_HITYOU, MAY_HIT, MAY_DESTROY, MAY_FRACTURE,
} from './const.js';
import { AD_PHYS, AD_MAGM, AD_FIRE, AD_COLD, AD_ELEC, AD_DRST, AD_ACID,
         MR_FIRE, MR_COLD, MR_ELEC,
         mons } from './monsters.js';
import { WAND_CLASS } from './objects.js';
import { exercise } from './attrib_exercise.js';
import { resist } from './zap.js';
import {
  tmp_at, nh_delay_output,
} from './animation.js';
import { DISP_BEAM, DISP_CHANGE, DISP_END } from './const.js';
import {
  GLYPH_EXPLODE_OFF,
  S_expl_tl, S_expl_tc, S_expl_tr,
  S_expl_ml, S_expl_mc, S_expl_mr,
  S_expl_bl, S_expl_bc, S_expl_br,
} from './symbols.js';

const EXPLOSION_CELLS = [
  [S_expl_tl, S_expl_ml, S_expl_bl],
  [S_expl_tc, S_expl_mc, S_expl_bc],
  [S_expl_tr, S_expl_mr, S_expl_br],
];

// cf. explode.c:984 — adtyp_to_expltype(adtyp)
export function adtyp_to_expltype(adtyp) {
  switch (adtyp) {
    case AD_FIRE: return EXPL_FIERY;
    case AD_COLD: return EXPL_FROSTY;
    case AD_ELEC: return EXPL_MAGICAL;
    case AD_MAGM: return EXPL_MAGICAL;
    case AD_DRST: return EXPL_NOXIOUS;
    case AD_PHYS: return EXPL_NOXIOUS;
    case AD_ACID: return EXPL_MUDDY;
    default: return EXPL_DARK;
  }
}

// cf. explode.c:25 — explosionmask(m, adtyp, olet)
// Simplified: returns whether target needs shield effect
export function explosionmask(m, adtyp, olet) {
  if (!m) return 0;
  const mdat = m.data || (m.mndx != null ? mons[m.mndx] : null);
  if (!mdat) return 0;
  if (adtyp === AD_FIRE && (mdat.mresists & MR_FIRE)) return 1;
  if (adtyp === AD_COLD && (mdat.mresists & MR_COLD)) return 1;
  if (adtyp === AD_ELEC && (mdat.mresists & MR_ELEC)) return 1;
  return 0;
}

// cf. explode.c:117 — engulfer_explosion_msg(adtyp, olet)
export function engulfer_explosion_msg(adtyp, olet) {
  switch (adtyp) {
    case AD_FIRE: return 'a blast of fire inside your stomach';
    case AD_COLD: return 'a freezing blast inside your stomach';
    case AD_ELEC: return 'a blast of lightning inside your stomach';
    case AD_ACID: return 'an acidic blast inside your stomach';
    default:
      return 'a violent explosion inside your stomach';
  }
}

function explosionGlyph(expltype, cellSym) {
  return GLYPH_EXPLODE_OFF + (expltype * 9) + (cellSym - S_expl_tl);
}

export async function drawExplosionDisplay(x, y, expltype) {
  let started = false;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const tx = x + i - 1;
      const ty = y + j - 1;
      if (!isok(tx, ty)) continue;
      const glyph = explosionGlyph(expltype, EXPLOSION_CELLS[i][j]);
      tmp_at(started ? DISP_CHANGE : DISP_BEAM, glyph);
      tmp_at(tx, ty);
      started = true;
    }
  }
  await nh_delay_output();
  await nh_delay_output();
}

export function finishExplosionDisplay(continuation) {
  if (!continuation) return;
  tmp_at(DISP_END, 0);
  applyExplosionEffects(
    continuation.x,
    continuation.y,
    continuation.dam,
    continuation.adtyp,
    continuation.olet,
    continuation.map,
    continuation.player
  );
}

function applyExplosionEffects(x, y, dam, adtyp, olet, map, player) {
  if (!map) return;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!isok(tx, ty)) continue;

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

      if (player && tx === player.x && ty === player.y) {
        if (player.uhp) {
          player.uhp -= dam;
          if (player.uhp < 0) player.uhp = 0;
        }
        exercise(player, A_STR, false);
      }
    }
  }
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

  await drawExplosionDisplay(x, y, expltype);
  finishExplosionDisplay({ x, y, dam, adtyp, olet, map, player });
}

// cf. explode.c:720 — scatter(sx, sy, blastforce, scflags, obj)
// Scatter objects from explosion site
export function scatter(sx, sy, blastforce, scflags, obj, map) {
  if (!map || !obj || !Number.isFinite(sx) || !Number.isFinite(sy)) return 0;
  const dirs = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1],
  ];
  const distance = Math.max(1, Math.min(3, Number(blastforce) || 1));
  let x = sx;
  let y = sy;
  for (let i = 0; i < distance; i++) {
    const [dx, dy] = dirs[rn2(dirs.length)];
    const nx = x + dx;
    const ny = y + dy;
    if (!isok(nx, ny)) break;
    x = nx;
    y = ny;
  }

  if (typeof map.removeObject === 'function') {
    map.removeObject(obj);
  }
  obj.ox = x;
  obj.oy = y;
  if (typeof map.addObject === 'function') {
    map.addObject(obj);
  } else if (typeof map.at === 'function') {
    const loc = map.at(x, y);
    if (loc) {
      if (!Array.isArray(loc.objects)) loc.objects = [];
      loc.objects.push(obj);
    }
  }
  return 1;
}

// cf. explode.c:959 — splatter_burning_oil(x, y, diluted_oil)
const ZT_SPELL_O_FIRE = 11; // C: explode.c:965 local #define
export async function splatter_burning_oil(x, y, diluted_oil) {
  let dmg = c_d(diluted_oil ? 3 : 4, 4);
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
export async function mon_explodes(mon, mattk, map, player, opts = {}) {
  if (!mon || !mattk) return;
  const { deferAfterDisplay = false } = opts;

  let dmg;
  if (mattk.damn) {
    dmg = c_d(mattk.damn, mattk.damd);
  } else if (mattk.damd) {
    const mlev = mon.m_lev || 0;
    dmg = c_d(mlev + 1, mattk.damd);
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

  if (deferAfterDisplay) {
    await drawExplosionDisplay(mon.mx, mon.my, expltype);
    mon.mhp = 0;
    mon.dead = true;
    return {
      x: mon.mx,
      y: mon.my,
      dam: dmg,
      adtyp,
      olet: MON_EXPLODE,
      map,
      player,
    };
  }

  await explode(mon.mx, mon.my, type, dmg, MON_EXPLODE, expltype, map, player);
  mon.mhp = 0;
  mon.dead = true;
  return null;
}

// cf. zap.c ugolemeffects() — golem absorbs elemental damage
export function ugolemeffects(dmgtyp, dam) {
  // Stub — player-as-golem elemental absorption
  // Returns true if damage was absorbed
  return false;
}
