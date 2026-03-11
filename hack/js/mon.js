// C ref: hack.mon.c — monster AI, combat, movement
import { MNORM, FLEE, SLEEP, MFROZ, MCONF, MSLOW, MFAST, SEEN, HP, DOOR, COLNO, ROWNO } from './const.js';
import { rn1, rn2, rnd, d, logEvent } from './rng.js';
import { game } from './gstate.js';
import { makeMonst, makeStole } from './game.js';
import { mon, mregen, CRUSH, NOBLUE, RUST, NOCOLD, mlarge } from './data.js';
import { pline, atl, newsym, nscr, bot, curs, pru, losehp } from './pri.js';

// Forward refs for functions in hack.js / do1.js / do.js imported at call time
let _setsee, _tele, _nomul, _killed, _rloc, _newcham, _mnexto, _attmon, _amon;
let _buzz, _dosearch, _losestr, _ndaminc;
export function _setMonDeps(deps) {
  _setsee = deps.setsee; _tele = deps.tele; _nomul = deps.nomul;
  _killed = deps.killed; _rloc = deps.rloc; _newcham = deps.newcham;
  _mnexto = deps.mnexto; _attmon = deps.attmon; _amon = deps.amon;
  _buzz = deps.buzz; _dosearch = deps.dosearch; _losestr = deps.losestr;
  _ndaminc = deps.ndaminc;
}

// C ref: g_at(x,y,gen) — search a linked list for gen at (x,y)
export function g_at(x, y, ptr) {
  while (ptr) {
    if (ptr.gx === x && ptr.gy === y) return ptr;
    // Also handles struct obj (.ox/.oy) and struct monst (.mx/.my)
    if (ptr.ox === x && ptr.oy === y) return ptr;
    if (ptr.mx === x && ptr.my === y) return ptr;
    ptr = ptr.ngen || ptr.nobj || ptr.nmon || null;
  }
  return null;
}

// More specific versions for each list type
export function g_at_gen(x, y, ptr) {
  while (ptr) { if (ptr.gx === x && ptr.gy === y) return ptr; ptr = ptr.ngen; }
  return null;
}
export function g_at_obj(x, y, ptr) {
  while (ptr) { if (ptr.ox === x && ptr.oy === y) return ptr; ptr = ptr.nobj; }
  return null;
}
export function g_at_mon(x, y, ptr) {
  while (ptr) { if (ptr.mx === x && ptr.my === y) return ptr; ptr = ptr.nmon; }
  return null;
}

// C ref: movemon() — move all monsters
export async function movemon() {
  let n = 0; for (let m = game.fmon; m; m = m.nmon) n++;
  logEvent(`movemon[n=${n}]`);
  for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
    if (mtmp.mspeed !== MSLOW || !(game.moves % 2)) await dochug(mtmp);
    if (mtmp.mspeed === MFAST) await dochug(mtmp);
  }
}

// C ref: justswld(mtmp) — monster just swallowed player
export async function justswld(mtmp) {
  game.u.ustuck = mtmp;
  game.u.uswallow = true;
  game.flags.botl = true;
  game.u.uswldtim = 0;
  if (mtmp.mstat === SLEEP) mtmp.mstat = MNORM;
  // swallowed() display called from docrt
  if (mtmp.data.mlet === 'P') await k1('%s%s swallows you!', mtmp.data.mname);
  else await k1('%s%s engulfs you!', mtmp.data.mname);
  hits_val = -1;
}

// C ref: youswld(mtmp,dam,die)
export function youswld(mtmp, dam, die) {
  game.u.uhp -= dam;
  if (game.u.uswldtim++ === die) game.u.uhp = -1;
  game.flags.botl |= HP;
  game.killer = mtmp.data.mname;
  hits_val = -1;
}

// Local variable used by dochug to track hit status
let hits_val = 0;

// Helper: print hit messages (k1 in C is `pline("The %s%s...", article, name)`)
// C ref: k1(str,arg) — pline helper; uses "The " or "the " article (or IT/It when blind)
// If format starts with '%': blind→("","It"), sighted→("The ",name)
// If format doesn't start with '%': blind→("","it"), sighted→("the ",name)
async function k1(fmt, name, ...rest) {
  if (game.u.ublind) {
    const it = fmt[0] === '%' ? 'It' : 'it';
    await pline(fmt, '', it, ...rest);
  } else {
    const article = fmt[0] === '%' ? 'The ' : 'the ';
    await pline(fmt, article, name, ...rest);
  }
}

// C ref: dochug(mtmp) — one monster's action
export async function dochug(mtmp) {
  logEvent(`dochug[mlet=${mtmp.data.mlet},mstat=${mtmp.mstat},cansee=${game.levl[mtmp.mx][mtmp.my].cansee}]`);
  if (mtmp.cham && !rn2(6) && _newcham) _newcham(mtmp, mon[rn1(6, 2)][rn2(8)]);
  const mdat = mtmp.data;
  // Regenerate monsters
  if ((!game.moves % 20 || mregen.includes(mdat.mlet)) && mtmp.mhp < mtmp.orig_hp)
    mtmp.mhp++;
  if (mtmp.mstat === MFROZ || mtmp.sinv) return;
  if (mtmp.mstat === SLEEP) {
    if (game.levl[mtmp.mx][mtmp.my].cansee && !game.u.ustelth &&
        (!rn2(7) || game.u.uagmon)) mtmp.mstat = MNORM;
    else return;
  }
  if (mdat.mmove >= rnd(12) &&
      (mtmp.mstat === FLEE || Math.abs(mtmp.mx - game.u.ux) > 1 || Math.abs(mtmp.my - game.u.uy) > 1) &&
      _rloc && m_move(mtmp) && mdat.mmove <= 12) return;

  if (game.u.uswallow) {
    if (mtmp === game.u.ustuck) {
      switch (mtmp.data.mlet) {
        case ',': await k1(CRUSH, mtmp.data.mname); youswld(mtmp, 4 + game.u.uac, 5); break;
        case '~': await k1(CRUSH, mtmp.data.mname); youswld(mtmp, rnd(6), 7); break;
        default:  await k1('%s%s digests you!', mtmp.data.mname); youswld(mtmp, d(2,4), 12); break;
      }
    }
    return;
  }

  const mdix = Math.abs(mtmp.mx - game.u.ux);
  const mdiy = Math.abs(mtmp.my - game.u.uy);

  if (mdat.mlet !== 'a' && mdix < 2 && mdiy < 2) {
    hits_val = 0;
    _nomul && _nomul(0);
    if (!'EyF&D'.includes(mdat.mlet))
      hitu(mdat.mhd, d(mdat.damn, mdat.damd), mdat.mname);

    switch (mdat.mlet) {
      case '&':
        if (!mtmp.mcan && !rn2(15)) {
          if (!rn2(3)) break;
          makemon(mon[7][6]); mnexto(game.fmon); hits_val = -1;
        } else {
          hitu(10, d(2,6), mdat.mname); hitu(10, d(2,6), mdat.mname);
          hitu(10, rnd(3), mdat.mname); hitu(10, rnd(3), mdat.mname);
          hitu(10, rn1(4,2), mdat.mname);
        }
        break;
      case '~': case ',':
        if (hits_val && !mtmp.mcan) { await mhit(mdat.mname); await justswld(mtmp); }
        break;
      case 'A':
        if (!mtmp.mcan && hits_val && rn2(2)) {
          await mhit(mdat.mname); await pline('You feel weaker!'); _losestr && _losestr(1);
        }
        break;
      case 'C': hitu(4, rnd(6), mdat.mname); break;
      case 'c':
        if (!mtmp.mcan && hits_val && rn2(2)) {
          await mhit(mdat.mname);
          if (rn2(5)) {
            await pline('You feel real drugged out now.');
            switch (rn2(3)) {
              case 0: game.u.uconfused = d(4,5); break;
              case 1: _nomul && _nomul(-d(3,4)); break;
              case 2: game.u.ufast += d(3,3); break;
            }
          } else {
            await pline('You get turned to stone!'); game.u.uhp = -1;
            game.killer = mdat.mname;
          }
        }
        break;
      case 'D':
        if (rn2(6) || mtmp.mcan) {
          hitu(10, d(3,10), mdat.mname); hitu(10, rnd(8), mdat.mname); hitu(10, rnd(8), mdat.mname);
          break;
        }
        _buzz && await _buzz(1, mtmp.mx, mtmp.my, game.u.ux - mtmp.mx, game.u.uy - mtmp.my);
        game.killer = mdat.mname; hits_val = -1; break;
      case 'd': hitu(6, d(2,4), mdat.mname); break;
      case 'E':
        if (!game.u.ublind && !rn2(3) && game.multi >= 0) {
          await k1('You are frozen by %s%ss gaze!', mdat.mname);
          _nomul && _nomul(-rn1(8,5));
        }
        return;
      case 'e': hitu(10, d(3,6), mdat.mname); break;
      case 'F':
        if (mtmp.mcan) break;
        await k1('%s%s explodes!', mdat.mname);
        if (game.u.ucoldres) await pline(NOCOLD);
        else {
          if (17 - Math.floor(game.u.ulevel / 2) > rnd(20)) {
            await pline('You get blasted!'); losehp(d(6,6));
          } else { await pline('You duck the blast...'); losehp(d(3,6)); }
          game.killer = mdat.mname;
        }
        delmon(mtmp); hits_val = -1;
        if (game.levl[mtmp.mx][mtmp.my].scrsym === 'F') newsym(mtmp.mx, mtmp.my);
        break;
      case 'g':
        if (!mtmp.mcan && hits_val && game.multi >= 0 && !rn2(6)) {
          await mhit(mdat.mname);
          await k1('You are frozen by %s%ss juices.', mdat.mname);
          _nomul && _nomul(-rnd(10));
        }
        break;
      case 'h':
        if (!mtmp.mcan && hits_val && game.multi >= 0 && !rn2(5)) {
          await mhit(mdat.mname); _nomul && _nomul(-rnd(10));
          await k1('%s%ss bite puts you to sleep!', mdat.mname);
        }
        break;
      case 'j': {
        let t = hitu(4, rnd(3), mdat.mname);
        t &= hitu(4, rnd(3), mdat.mname);
        if (t) { hitu(4, rnd(4), mdat.mname); hitu(4, rnd(4), mdat.mname); }
        break;
      }
      case 'k':
        if (hitu(4, rnd(4), mdat.mname) && !mtmp.mcan && !rn2(8)) {
          await mhit(mdat.mname); await poisoned("the bee's sting");
          game.killer = mdat.mname;
        }
        break;
      case 'L':
        if (!mtmp.mcan && hits_val && game.u.ugold && rn2(2)) {
          await mhit(mdat.mname);
          let tmp = rnd(game.u.ugold);
          if (tmp < 100 && game.u.ugold < 100) tmp = game.u.ugold;
          game.u.ugold -= tmp; game.u.urexp -= tmp;
          await pline('Your purse feels lighter.');
          _rloc && _rloc(mtmp); mtmp.mstat = FLEE; game.flags.botl |= 2;
          // Add to fstole
          let stmp = game.fstole;
          while (stmp && stmp.smon !== mtmp) stmp = stmp.nstole;
          if (stmp) stmp.sgold += tmp;
          else {
            stmp = makeStole(mtmp, null, tmp);
            stmp.nstole = game.fstole; game.fstole = stmp;
          }
        }
        break;
      case 'N':
        if (!mtmp.mcan && hits_val && game.invent && rn2(2)) {
          await mhit(mdat.mname); await steal(mtmp);
          _rloc && _rloc(mtmp); mtmp.mstat = FLEE;
        }
        break;
      case 'n':
        hitu(11, d(2,6), mdat.mname); hitu(11, d(2,6), mdat.mname); break;
      case 'o': {
        let t1 = hitu(5, rnd(6), mdat.mname);
        if (hitu(5, rnd(6), mdat.mname) && !mtmp.mcan && t1 && !game.u.ustuck && rn2(2)) {
          game.u.ustuck = mtmp; await mhit(mdat.mname);
          await k1('%s%s has grabbed you!', mdat.mname); game.u.uhp -= d(2,8);
        } else if (game.u.ustuck === mtmp) {
          game.u.uhp -= d(2,8); game.flags.botl |= HP;
          await pline('You are being crushed.');
        }
        game.killer = mdat.mname; break;
      }
      case 'P':
        if (!mtmp.mcan && hits_val && !rn2(4)) { await mhit(mdat.mname); await justswld(mtmp); }
        else hitu(15, d(2,4), mdat.mname);
        break;
      case 'Q': hitu(3, rnd(2), mdat.mname); hitu(3, rnd(2), mdat.mname); break;
      case 'R':
        hitu(5, 0, mdat.mname);
        if (!mtmp.mcan && hits_val && game.uarm && game.uarm.otyp !== 2 &&
            (!game.uarm.minus || game.uarm.otyp - game.uarm.spe !== 1)) {
          await mhit(mdat.mname); await pline(RUST);
          minusone(game.uarm); game.u.uac++; game.flags.botl |= 32;
        }
        break;
      case 'S':
        if (!mtmp.mcan && hits_val && !rn2(8)) {
          await mhit(mdat.mname); await poisoned("snake's bite"); game.killer = mdat.mname;
        }
        break;
      case 's':
        if (hits_val && !rn2(8)) { await poisoned("scorpion's sting"); game.killer = mdat.mname; }
        hitu(5, rnd(8), mdat.mname); hitu(5, rnd(8), mdat.mname); break;
      case 'T': hitu(6, rnd(6), mdat.mname); hitu(6, rnd(6), mdat.mname); break;
      case 'U': hitu(9, d(3,4), mdat.mname); hitu(9, d(3,4), mdat.mname); break;
      case 'v': if (!mtmp.mcan && hits_val && !game.u.ustuck) game.u.ustuck = mtmp; break;
      case 'V':
        if (hits_val) {
          game.u.uhp -= 4; await mhit(mdat.mname);
          if (!mtmp.mcan && !rn2(3)) losexp(); game.killer = mdat.mname;
        }
        break;
      case 'W':
        if (!mtmp.mcan && hits_val && !rn2(5)) { await mhit(mdat.mname); losexp(); }
        break;
      case 'X':
        for (let i = 0; i < 3; i++) hitu(8, rnd(3), mdat.mname); break;
      case 'y':
        if (mtmp.mcan) break;
        delmon(mtmp);
        if (game.levl[mtmp.mx][mtmp.my].cansee) newsym(mtmp.mx, mtmp.my);
        if (!game.u.ublind) {
          await pline('A yellow light blinds you!');
          game.u.ublind = d(4,12);
          // seeoff(0)
        }
        hits_val = -1; break;
      case 'Y': hitu(4, rnd(6), mdat.mname); break;
    }

    switch (hits_val) {
      case 0: await k1('%s%s misses', mdat.mname); break;
      case -1: break;
      default: await mhit(mdat.mname);
    }
    // Extra movement for fast monsters
    for (let tmp = mdat.mmove - 12; tmp > rnd(12); tmp -= 12) m_move(mtmp);
  }
}

// C ref: mhit(name) — print hit message
async function mhit(name) {
  const hnu = ['twice', 'three times', 'four times', 'five times'];
  if (hits_val < 1) { await pline('bad mhit'); return; }
  if (hits_val === 1) await k1('%s%s hits!', name);
  else {
    if (game.u.ublind) await pline('It hits %s!', hnu[hits_val - 2]);
    else await k1('%s%s hits %s!', name, hnu[hits_val - 2]);
  }
}

// C ref: hitu(mlev,dam,name) — monster hits player
// C formula: tmp = -1 + u.uac + mlev + adjustments; hit if tmp >= rnd(20)
export function hitu(mlev, dam, name) {
  let tmp = -1 + game.u.uac + mlev;
  if (game.multi < 0) tmp += 4;     // immobilized: easier to hit
  if (game.u.uinvis) tmp -= 2;       // invisible: harder to hit
  if (game.u.uconfused) tmp++;       // confused: easier to hit
  if (game.u.ublind) tmp++;          // blind: easier to hit
  if (tmp < rnd(20)) return 0;       // miss
  if (dam) { game.u.uhp -= dam; game.flags.botl |= HP; }
  if (name) hits_val++;
  return 1;
}

// C ref: r_free(x,y) — check if cell is free for monster movement
function r_free(x, y) {
  if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return false;
  const cell = game.levl[x][y];
  if (cell.typ < DOOR) return false;
  if (g_at_mon(x, y, game.fmon)) return false;
  if (x === game.u.ux && y === game.u.uy) return false;
  return true;
}

// C ref: m_move(mtmp) — move monster one step; returns 1 on success, 0 if stuck
export function m_move(mtmp) {
  const mdat = mtmp.data;

  if (game.u.uswallow) return 1;

  // Teleporter: might teleport instead of walk
  if (mdat.mlet === 't' && !rn2(19)) {
    if (rn2(2)) {
      const ox = mtmp.mx, oy = mtmp.my;
      _mnexto && _mnexto(mtmp);
      if (game.levl[ox][oy].scrsym === 't') newsym(ox, oy);
    } else { _rloc && _rloc(mtmp); }
    return 1;
  }

  // Primary direction toward player (sgn)
  const ux = game.u.ux, uy = game.u.uy;
  let dx = ux > mtmp.mx ? 1 : ux < mtmp.mx ? -1 : 0;
  let dy = uy > mtmp.my ? 1 : uy < mtmp.my ? -1 : 0;

  // Confused/invisible player/certain monsters: move randomly
  // C: mstat==MCONF (==1==FLEE) || u.uinvis || (index("BI",mlet) && !rn2(3))
  if (mtmp.mstat === MCONF || game.u.uinvis || ('BI'.includes(mdat.mlet) && !rn2(3))) {
    dx = rn1(3, -1);
    dy = rn1(3, -1);
  }

  // Dragon: check breath range (inrange — not yet implemented, no RNG)
  // if (mdat.mlet === 'D' && !mtmp.mcan) inrange(mtmp);

  // Unicorn: might confuse player
  if (!game.u.uconfused && mdat.mlet === 'U' && !mtmp.mcan &&
      game.levl[mtmp.mx][mtmp.my].cansee && !rn2(8)) {
    pline('You are confused!');
    game.u.uconfused = d(3, 4);
  }

  const omx = mtmp.mx, omy = mtmp.my;

  // DEBUG: log primary direction and r_free result
  const _pdfree = r_free(mtmp.mx + dx, mtmp.my + dy);
  const _dbgX = mtmp.mx + dx, _dbgY = mtmp.my + dy;
  const _dbgCell = (game.levl[_dbgX] && game.levl[_dbgX][_dbgY]) || null;
  const _dbgMon = g_at_mon(_dbgX, _dbgY, game.fmon);
  logEvent(`m_move_debug[mlet=${mdat.mlet},mx=${mtmp.mx},my=${mtmp.my},dx=${dx},dy=${dy},rfree=${_pdfree},cell_typ=${_dbgCell ? _dbgCell.typ : 'oob'},gat=${_dbgMon ? _dbgMon.data.mlet : 'none'},ux=${game.u.ux},uy=${game.u.uy}]`);

  // If primary direction blocked, randomize one axis
  if (!_pdfree) {
    if (!dx) dx = rn1(3, -1);
    else if (!dy) dy = rn1(3, -1);
  }

  const nix = mtmp.mx + dx, niy = mtmp.my + dy;

  // Try diagonal/straight move; don't move diagonally through/from doors
  if (r_free(nix, niy) && !(dx && dy &&
      (game.levl[omx][omy].typ === DOOR || game.levl[nix][niy].typ === DOOR))) {
    mtmp.mx = nix; mtmp.my = niy;
  } else if (dx && r_free(nix, mtmp.my)) {
    mtmp.mx = nix;
  } else if (dy && r_free(mtmp.mx, niy)) {
    mtmp.my = niy;
  } else {
    if (!rn2(10) && 'tNL'.includes(mdat.mlet)) _rloc && _rloc(mtmp);
    return 0;
  }

  // Update display
  if (game.levl[omx][omy].scrsym === mdat.mlet) newsym(omx, omy);
  if ((game.u.ucinvis || !mtmp.invis) && game.levl[mtmp.mx][mtmp.my].cansee)
    atl(mtmp.mx, mtmp.my, mdat.mlet);
  return 1;
}

// C ref: makemon(pmonst) — create a new monster
export function makemon(pmonst) {
  const mtmp = makeMonst(null);
  mtmp.nmon = game.fmon;
  game.fmon = mtmp;
  // C makemon() sets mstat=0 (MNORM/awake) — do NOT set SLEEP here.
  // Level-gen monsters are set to SLEEP by mklev.js::makemon_lev() separately.

  let mdat;
  if (pmonst) {
    mdat = pmonst;
  } else {
    // C: do { foo=dlevel/3+1; tmp=rn2(foo); ptr=&mon[tmp>7?rn2(8):tmp][rn2(7)]; } while(!ptr->mlet)
    // Note: C uses INTEGER division for dlevel/3, and rn2(foo) not rn2(foo+1).
    do {
      const foo = (game.dlevel / 3 | 0) + 1;
      let tmp = rn2(foo);
      if (tmp > 7) tmp = rn2(8);
      mdat = mon[tmp][rn2(7)];
    } while (!mdat.mlet);
  }
  mtmp.data = mdat;
  if (!mdat.mlet) { game.fmon = mtmp.nmon; return null; }

  if (mdat.mlet === 'D') mtmp.mhp = mtmp.orig_hp = 80;
  else if (mdat.mhd) mtmp.orig_hp = mtmp.mhp = d(mdat.mhd, 8);
  else mtmp.orig_hp = mtmp.mhp = rnd(4);

  if (mdat.mlet === ':' && !game.u.ucham) mtmp.cham = true;
  if (mdat.mlet === 'I') mtmp.invis = true;
  if ('p~,M'.includes(mdat.mlet)) { mtmp.invis = true; mtmp.sinv = true; }
  return mtmp;
}

// C ref: rloc(mon) — relocate monster to random position
// C uses rn1(77,2) and rn1(19,2) to stay within inner bounds (x:2-78, y:2-20)
export function rloc(mtmp) {
  if (mtmp === game.u.ustuck) { game.u.ustuck = null; game.u.uswallow = game.u.uswldtim = 0; }
  let x, y, tmp;
  do {
    tmp = game.levl[x = rn1(77, 2)][y = rn1(19, 2)].typ;
  } while (tmp < 3 || g_at_mon(x, y, game.fmon) ||
           (x === game.u.ux && y === game.u.uy));
  if (game.levl[mtmp.mx][mtmp.my].cansee) newsym(mtmp.mx, mtmp.my);
  mtmp.mx = x; mtmp.my = y;
  if (game.levl[x][y].cansee) pmon(mtmp);
}

// C ref: mnexto(mon) — move monster next to player
export function mnexto(mtmp) {
  for (let ddx = -1; ddx <= 1; ddx++) {
    for (let ddy = -1; ddy <= 1; ddy++) {
      if (!ddx && !ddy) continue;
      const x = game.u.ux + ddx, y = game.u.uy + ddy;
      if (x < 0 || x >= 80 || y < 0 || y >= 22) continue;
      if (game.levl[x][y].typ >= 3 && !g_at_mon(x, y, game.fmon)) {
        mtmp.mx = x; mtmp.my = y;
        if (game.levl[x][y].cansee) pmon(mtmp);
        return;
      }
    }
  }
  rloc(mtmp);
}

// C ref: newcham(mon,pmonst) — change monster form
export function newcham(mtmp, new_mdat) {
  if (!new_mdat || !new_mdat.mlet) return;
  if (game.levl[mtmp.mx][mtmp.my].cansee) newsym(mtmp.mx, mtmp.my);
  mtmp.data = new_mdat;
  if (game.levl[mtmp.mx][mtmp.my].cansee) atl(mtmp.mx, mtmp.my, new_mdat.mlet);
}

// C ref: killed(mtmp) — monster killed
export async function killed(mtmp) {
  const kmsg = [
    'You destroy %s%s!', 'You blow away %s%s!',
    'You wale on %s%s!', 'You have defeated %s%s!',
  ];
  const article = 'aeiou'.includes(mtmp.data.mname[0].toLowerCase()) ? 'an ' : 'a ';
  await pline(kmsg[rn2(4)], article, mtmp.data.mname);
  game.u.urexp += mtmp.data.mhd * 4;
  if (game.u.ulevel < 21 && game.u.uexp + game.u.urexp > _levelXP(game.u.ulevel)) {
    game.u.ulevel++;
    game.u.uhpmax += rnd(game.u.ulevel > 9 ? game.u.ulevel - 9 : game.u.ulevel + 2);
    game.u.uhp = game.u.uhpmax;
    game.flags.botl |= 0xff;
    await pline('Welcome to level %d.', game.u.ulevel);
  }
  game.flags.botl |= 2; // GOLD (score)
  const { mx, my } = mtmp;
  delmon(mtmp);
  if (game.levl[mx][my].cansee) newsym(mx, my);
}

function _levelXP(lev) {
  // Simple XP thresholds (C doesn't define these explicitly, using standard values)
  const thresholds = [0,20,40,80,160,320,640,1280,2560,5120,10240,
    20480,40960,81920,163840,327680,655360,1310720,2621440,5242880];
  return thresholds[Math.min(lev, thresholds.length - 1)];
}

// C ref: delmon(mon) — remove monster from list
export function delmon(mtmp) {
  if (mtmp === game.fmon) { game.fmon = game.fmon.nmon; }
  else {
    let prev = game.fmon;
    while (prev && prev.nmon !== mtmp) prev = prev.nmon;
    if (prev) prev.nmon = mtmp.nmon;
  }
}

// C ref: steal(mon) — monster steals an item from player
export async function steal(mtmp) {
  let obj = game.invent;
  if (!obj) return;
  // Find a non-equipped item
  let prev = null;
  let cur = game.invent;
  while (cur) {
    if (cur !== game.uarm && cur !== game.uwep && cur !== game.uleft && cur !== game.uright) break;
    prev = cur; cur = cur.nobj;
  }
  if (!cur) { await pline('It fails to steal anything.'); return; }
  if (!prev) game.invent = cur.nobj;
  else prev.nobj = cur.nobj;
  // Put in stole list
  let stmp = game.fstole;
  while (stmp && stmp.smon !== mtmp) stmp = stmp.nstole;
  if (!stmp) {
    stmp = makeStole(mtmp, null, 0);
    stmp.nstole = game.fstole; game.fstole = stmp;
  }
  cur.nobj = stmp.sobj; stmp.sobj = cur;
  await pline('Your %s was stolen!', itemName(cur));
}

// C ref: poisoned(str) — player poisoned
export async function poisoned(str) {
  if (game.u.upres) {
    await pline('You feel no ill effects from %s.', str);
    return;
  }
  await pline('You are poisoned by %s!', str);
  if (rn2(2)) { _losestr && _losestr(rnd(4)); }
  else { game.u.uhp -= rn1(10, 6); game.flags.botl |= HP; }
}

// C ref: losexp() — lose an experience level
export async function losexp() {
  if (game.u.ulevel < 2) return;
  game.u.ulevel--;
  game.u.uhpmax -= rnd(game.u.ulevel > 9 ? game.u.ulevel - 9 : game.u.ulevel + 2);
  if (game.u.uhp > game.u.uhpmax) game.u.uhp = game.u.uhpmax;
  game.flags.botl |= 0x40 | 0x80 | HP | 8; // ULV|UEX|HP|HPM
  await pline('You feel your life force ebb!');
}

// Helpers
function minusone(otmp) { otmp.spe = Math.max(0, otmp.spe - 1); }

function itemName(obj) {
  // STUB: simplified name
  return obj.olet === ')' ? 'weapon' :
         obj.olet === '[' ? 'armor' :
         obj.olet === '!' ? 'potion' :
         obj.olet === '?' ? 'scroll' :
         obj.olet === '%' ? 'food' : 'item';
}

function pmon(mtmp) {
  if (!mtmp.invis || game.u.ucinvis)
    atl(mtmp.mx, mtmp.my, mtmp.data.mlet);
}

// C ref: attmon(mtmp,otmp,range) — player attacks monster with missile
// STUB: simplified - full implementation in hack.js
export async function attmon(mtmp, otmp, range) {
  // STUB: not yet ported — see hack.js amon()
}

// C ref: amon(mtmp,otmp,range) — one round of combat vs monster
// STUB: imported from hack.js
export async function amon(mtmp, otmp, range) {
  if (_amon) return _amon(mtmp, otmp, range);
}
