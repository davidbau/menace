// exper.js -- Experience points and leveling
// cf. exper.c — newuexp, newexplevel, pluslvl, experience, losexp, more_experienced

import { rn1, rn2, rnd } from './rng.js';
import { roles, races } from './player.js';
import { A_CON, A_WIS, NORMAL_SPEED, NATTK, MAXULEV } from './const.js';
import { mons, PM_ACID_BLOB,
         PM_CLERIC, PM_WIZARD, PM_HEALER, PM_KNIGHT,
         PM_BARBARIAN, PM_VALKYRIE,
         AT_BUTT, AT_WEAP, AT_MAGC,
         AD_PHYS, AD_BLND, AD_DRLI, AD_STON, AD_SLIM, AD_WRAP,
         S_EEL } from './monsters.js';
import { Role_if } from './role.js';
import { find_mac } from './worn.js';
import { extra_nasty } from './mondata.js';

// cf. exper.c:14 — newuexp(): experience points threshold for given level
export function newuexp(lev) {
    if (lev < 1)
        return 0;
    if (lev < 10)
        return 10 * (1 << lev);
    if (lev < 20)
        return 10000 * (1 << (lev - 10));
    return 10000000 * (lev - 19);
}

// cf. exper.c:25 — enermod(): role-dependent energy modifier for level-up
export function enermod(en, roleMnum) {
    switch (roleMnum) {
    case PM_CLERIC:
    case PM_WIZARD:
        return (2 * en);
    case PM_HEALER:
    case PM_KNIGHT:
        return Math.floor((3 * en) / 2);
    case PM_BARBARIAN:
    case PM_VALKYRIE:
        return Math.floor((3 * en) / 4);
    default:
        return en;
    }
}

// cf. exper.c:44 — newpw(): calculate spell power gain for new/current level
// For ulevel==0 (init): en = role.enadv.infix + race.enadv.infix + optional rnd(inrnd)
// For ulevel>0 (level-up): en = enermod(rn1(enrnd, enfix))
export function newpw(player) {
    const role = roles[player.roleIndex];
    const race = races[player.race];
    if (!role || !race) return 1;
    const roleEnadv = role.enadv_full || {infix:1, inrnd:0, lofix:0, lornd:1, hifix:0, hirnd:1};
    const raceEnadv = race.enadv || {infix:0, inrnd:0, lofix:0, lornd:0, hifix:0, hirnd:0};
    let en = 0;

    if (player.ulevel === 0) {
        // Initialization
        en = roleEnadv.infix + raceEnadv.infix;
        if (roleEnadv.inrnd > 0)
            en += rnd(roleEnadv.inrnd);
        if (raceEnadv.inrnd > 0)
            en += rnd(raceEnadv.inrnd);
    } else {
        // Level-up
        const enrndWis = Math.floor((player.attributes?.[A_WIS] || 10) / 2);
        let enrnd, enfix;
        if (player.ulevel < (role.xlev || 14)) {
            enrnd = enrndWis + roleEnadv.lornd + raceEnadv.lornd;
            enfix = roleEnadv.lofix + raceEnadv.lofix;
        } else {
            enrnd = enrndWis + roleEnadv.hirnd + raceEnadv.hirnd;
            enfix = roleEnadv.hifix + raceEnadv.hifix;
        }
        en = enermod(rn1(enrnd, enfix), player.roleMnum);
    }
    if (en <= 0) en = 1;
    return en;
}

// cf. attrib.c:1077 — newhp(): calculate hit point gain for new/current level
// For ulevel==0 (init): hp = role.hpadv.infix + race.hpadv.infix + optional rnd(inrnd)
// For ulevel>0 (level-up): hp = role.hpadv.lo/hifix + race + optional rnd(lo/hirnd) + conplus
export function newhp(player) {
    const role = roles[player.roleIndex];
    const race = races[player.race];
    if (!role || !race) return 1;
    const roleHpadv = role.hpadv || {infix:10, inrnd:0, lofix:0, lornd:8, hifix:1, hirnd:0};
    const raceHpadv = race.hpadv || {infix:2, inrnd:0, lofix:0, lornd:2, hifix:1, hirnd:0};
    let hp;

    if (player.ulevel === 0) {
        // Initialization — no Con adjustment
        hp = roleHpadv.infix + raceHpadv.infix;
        if (roleHpadv.inrnd > 0)
            hp += rnd(roleHpadv.inrnd);
        if (raceHpadv.inrnd > 0)
            hp += rnd(raceHpadv.inrnd);
    } else {
        // Level-up
        if (player.ulevel < (role.xlev || 14)) {
            hp = roleHpadv.lofix + raceHpadv.lofix;
            if (roleHpadv.lornd > 0)
                hp += rnd(roleHpadv.lornd);
            if (raceHpadv.lornd > 0)
                hp += rnd(raceHpadv.lornd);
        } else {
            hp = roleHpadv.hifix + raceHpadv.hifix;
            if (roleHpadv.hirnd > 0)
                hp += rnd(roleHpadv.hirnd);
            if (raceHpadv.hirnd > 0)
                hp += rnd(raceHpadv.hirnd);
        }
        // Con adjustment for level-up
        const con = player.attributes?.[A_CON] || 10;
        let conplus;
        if (con <= 3) conplus = -2;
        else if (con <= 6) conplus = -1;
        else if (con <= 14) conplus = 0;
        else if (con <= 16) conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else conplus = 4;
        hp += conplus;
    }
    if (hp <= 0) hp = 1;
    return hp;
}

// cf. exper.c:206 — losexp(): level drain (e.g., hit by drain life attack)
// Partial: drains level and HP but does not implement adjabil/uhpinc/ueninc.
// RNG: consumes rnd(10) for HP loss, rn2(5) for PW loss (matching C's newhp/newpw calls).
export async function losexp(player, display, drainer) {
    if (player.ulevel <= 1) {
        // Can't lose a level below 1; C would kill the hero
        return;
    }
    // C: HP loss = u.uhpinc[u.ulevel] (stored increment, NO RNG consumed)
    const uhpinc = player.uhpinc || [];
    const hpLoss = uhpinc[player.ulevel] || 0;
    player.uhpmax = Math.max(1, player.uhpmax - hpLoss);
    player.uhp = Math.min(player.uhp, player.uhpmax);

    // C: PW loss = u.ueninc[u.ulevel] (stored increment, NO RNG consumed)
    const ueninc = player.ueninc || [];
    const pwLoss = ueninc[player.ulevel] || 0;
    player.pwmax = Math.max(0, player.pwmax - pwLoss);
    player.pw = Math.min(player.pw, player.pwmax);

    player.ulevel--;
    player.exp = newuexp(player.ulevel);
    if (display) {
        await display.putstr_message(`You feel your life force draining away.`);
    }
}

// cf. exper.c:299 — newexplevel(): check if player should gain a level
// Autotranslated from exper.c:299
export async function newexplevel(player, display = null) {
  if (player.ulevel < MAXULEV && (Number(player.uexp) || Number(player.exp) || 0) >= newuexp(player.ulevel)) {
    await pluslvl(player, display, true);
  }
}

// cf. exper.c:306 — pluslvl(): gain an experience level
export async function pluslvl(player, display, incr) {
    if (!incr) {
        if (display) await display.putstr_message('You feel more experienced.');
    }

    // cf. exper.c:324 newhp() — role-dependent HP gain
    const hpGain = newhp(player);
    player.uhpmax += hpGain;
    player.uhp += hpGain;

    // cf. exper.c:330 newpw() — role-dependent PW gain
    const pwGain = newpw(player);
    player.pwmax += pwGain;
    player.pw += pwGain;

    // C ref: pline() → vpline() → flush_screen(1) → bot() refreshes the
    // status line before every message.  JS flush_screen only refreshes when
    // _botl is set, so flag it now so the status shows updated HP/Pw/Xp at
    // the --More-- boundary produced by the upcoming level-up message.
    player._botl = true;

    if (player.ulevel < MAXULEV) {
        if (incr) {
            const tmp = newuexp(player.ulevel + 1);
            const currentExp = (Number(player.uexp) || Number(player.exp) || 0);
            if (currentExp >= tmp) {
                player.uexp = tmp - 1;
                player.exp = player.uexp;
            }
        } else {
            player.uexp = newuexp(player.ulevel);
            player.exp = player.uexp;
        }
        player.ulevel++;
        const back = (player.ulevelmax != null && player.ulevelmax >= player.ulevel) ? 'back ' : '';
        await display.putstr_message(`Welcome ${back}to experience level ${player.ulevel}.`);
        if (player.ulevelmax == null || player.ulevelmax < player.ulevel) {
            player.ulevelmax = player.ulevel;
        }
        // C ref: exper.c:355 — adjabil(oldlevel, newlevel) gives new intrinsics.
        // Lazy import to avoid circular dependency (attrib.js re-exports from exper.js).
        const { adjabil } = await import('./attrib.js');
        await adjabil(player, player.ulevel - 1, player.ulevel);
    }
}

// cf. exper.c:377 — rndexp(): random XP for potions/polyself
export function rndexp(player, gaining) {
    const LARGEST_INT = 0x7fffffff;
    let minexp = (player.ulevel === 1) ? 0 : newuexp(player.ulevel - 1);
    let maxexp = newuexp(player.ulevel);
    let diff = maxexp - minexp, factor = 1;
    while (diff >= LARGEST_INT) {
        diff = Math.floor(diff / 2);
        factor *= 2;
    }
    let result = minexp + factor * rn2(Math.max(1, diff));
    if (player.ulevel === MAXULEV && gaining) {
        result += ((player.uexp || 0) - minexp);
        if (result < (player.uexp || 0))
            result = player.uexp || 0;
    }
    return result;
}

// Autotranslated from exper.c:84
export function experience(mtmp, nk) {
  const mndx = Number.isInteger(mtmp?.mndx) ? mtmp.mndx : -1;
  let ptr = mtmp?.data || mtmp?.type || (mndx >= 0 ? mons[mndx] : null) || {};
  let i, tmp, tmp2;
  const mattk = Array.isArray(ptr.mattk) ? ptr.mattk : [];
  tmp = 1 + mtmp.m_lev * mtmp.m_lev;
  if ((i = find_mac(mtmp)) < 3) {
    tmp += (7 - i) * ((i < 0) ? 2 : 1);
  }
  if ((ptr.mmove || 0) > NORMAL_SPEED) {
    tmp += ((ptr.mmove || 0) > (3 * NORMAL_SPEED / 2)) ? 5 : 3;
  }
  for (i = 0; i < NATTK; i++) {
    const atk = mattk[i] || {};
    tmp2 = atk.aatyp || 0;
    if (tmp2 > AT_BUTT) {
      if (tmp2 === AT_WEAP) {
        tmp += 5;
      }
      else if (tmp2 === AT_MAGC) {
        tmp += 10;
      }
      else {
        tmp += 3;
      }
    }
  }
  for (i = 0; i < NATTK; i++) {
    const atk = mattk[i] || {};
    tmp2 = atk.adtyp || 0;
    if (tmp2 > AD_PHYS && tmp2 < AD_BLND) {
      tmp += 2 * mtmp.m_lev;
    }
    else if ((tmp2 === AD_DRLI) || (tmp2 === AD_STON) || (tmp2 === AD_SLIM)) {
      tmp += 50;
    }
    else if (tmp2 !== AD_PHYS) {
      tmp += mtmp.m_lev;
    }
    if (Math.trunc((atk.damd || 0) * (atk.damn || 0)) > 23) {
      tmp += mtmp.m_lev;
    }
    // C: Amphibious is a player property; use false as conservative fallback
    if (tmp2 === AD_WRAP && ptr.mlet === S_EEL) {
      tmp += 1000;
    }
  }
  if (extra_nasty(ptr)) {
    tmp += (7 * mtmp.m_lev);
  }
  if (mtmp.m_lev > 8) {
    tmp += 50;
  }
  if (mtmp.data === mons[PM_ACID_BLOB]) tmp = 1;
  if (mtmp.mrevived || mtmp.mcloned) {
    for (i = 0, tmp2 = 20; nk > tmp2 && tmp > 1; ++i) {
      tmp = Math.floor((tmp + 1) / 2);
      nk -= tmp2;
      if (i & 1) {
        tmp2 += 20;
      }
    }
  }
  return (tmp);
}

// Autotranslated from exper.c:168
export function more_experienced(exper, rexp, game, player) {
  const g = game || {};
  if (!g.flags) g.flags = {};
  if (!g.disp) g.disp = {};
  let oldexp = player.uexp, oldrexp = player.urexp, newexp = oldexp + exper, rexpincr = 4 * exper + rexp, newrexp = oldrexp + rexpincr;
  if (newexp < 0 && exper > 0) newexp = Number.MAX_SAFE_INTEGER;
  if (newrexp < 0 && rexpincr > 0) newrexp = Number.MAX_SAFE_INTEGER;
  if (newexp !== oldexp) {
    player.uexp = newexp;
    if (g.flags.showexp) g.disp.botl = true;
    if (!g.disp.botl && typeof exp_percent_changing === 'function' && exp_percent_changing()) {
      g.disp.botl = true;
    }
  }
  if (newrexp !== oldrexp) { player.urexp = newrexp; }
  if (player.urexp >= (Role_if(player, PM_WIZARD) ? 1000 : 2000)) g.flags.beginner = false;
}

// C helper: new level on sufficient XP (formerly in combat.js shim).
export async function checkLevelUp(player, display) {
    await newexplevel(player, display);
}
