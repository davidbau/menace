// C ref: hack.do1.c — buzz/bhit/dosearch/dosave/ringoff/hit/miss
import { DOOR, CORR, ROOM, SDOOR, SEEN, HP, AC, STR } from './const.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import { mon } from './data.js';
import { pline, atl, newsym, on, docrt } from './pri.js';
import { g_at_gen, g_at_mon, killed, delmon, makemon, mnexto } from './mon.js';
import { savelev, getlev } from './lev.js';
import { makeObj } from './game.js';

const fl = [
  'magic missile',
  'bolt of fire',
  'sleep ray',
  'bolt of cold',
  'death ray',
];

// C ref: ringoff(obj) — deactivate ring effect
export function ringoff(obj) {
  // If another ring of same type is worn, don't remove effect
  if (obj.otyp < 13 &&
      ((game.uleft && obj.otyp === game.uleft.otyp) ||
       (game.uright && obj.otyp === game.uright.otyp))) return;
  switch (obj.otyp) {
    case 0:  break;
    case 1:  game.u.utel = false; break;
    case 2:  game.u.uregen = false; break;
    case 3:  game.u.usearch = 0; break;
    case 4:  game.u.ucinvis = false; break;
    case 5:  game.u.ustelth = false; break;
    case 6:  game.u.ufloat = false; break;
    case 7:  game.u.upres = false; break;
    case 8:  game.u.uagmon = false; break;
    case 9:  game.u.ufeed = false; break;
    case 10: game.u.ufireres = false; break;
    case 11: game.u.ucoldres = false; break;
    case 12: game.u.ucham = false; break;
    case 13: // gain strength — fall through to ndaminc
      for (let tmp = obj.spe; tmp; tmp--) {
        if (!obj.minus) {
          if (game.u.ustr > 18) {
            game.u.ustr -= 15; if (game.u.ustr < 18) game.u.ustr = 18;
          } else if (game.u.ustr > 4) game.u.ustr--;
          if (game.u.ustrmax > 18) {
            game.u.ustrmax -= 15; if (game.u.ustrmax < 18) game.u.ustrmax = 18;
          } else game.u.ustrmax--;
        } else {
          if (game.u.ustr > 17) { game.u.ustr += 15; game.u.ustrmax += 15; }
          else { game.u.ustr++; if (game.u.ustrmax > 17) game.u.ustrmax += 15; else game.u.ustrmax++; }
        }
      }
      game.flags.botl |= STR;
      // fall through
    case 14: ndaminc(); break;
    case 15:
      if (obj.minus) game.u.uac -= obj.spe;
      else game.u.uac += obj.spe;
      game.flags.botl |= AC; break;
    case 16:
      if (obj.minus) { game.u.uhp += obj.spe; game.u.uhpmax += obj.spe; }
      else {
        game.u.uhp -= obj.spe; game.u.uhpmax -= obj.spe;
        game.killer = 'ring';
      }
      game.flags.botl |= HP | 8; break;
  }
}

// C ref: hit(str,mon) — "The <str> hits the <mon>."
export async function hit(str, mtmp) {
  if (!game.levl[mtmp.mx][mtmp.my].cansee) await pline('The %s hits it.', str);
  else await pline('The %s hits the %s.', str, mtmp.data.mname);
}

// C ref: miss(str,mon) — "The <str> misses the <mon>."
export async function miss(str, mtmp) {
  if (!game.levl[mtmp.mx][mtmp.my].cansee) await pline('The %s misses it.', str);
  else await pline('The %s misses the %s.', str, mtmp.data.mname);
}

// C ref: findit() — wand of secret door/trap detection
export async function findit() {
  let lx = game.u.ux, hx = game.u.ux, ly = game.u.uy, hy = game.u.uy;
  // Find room boundaries
  while (game.levl[lx-1] && game.levl[lx-1][game.u.uy].typ && game.levl[lx-1][game.u.uy].typ !== CORR) lx--;
  while (game.levl[hx+1] && game.levl[hx+1][game.u.uy].typ && game.levl[hx+1][game.u.uy].typ !== CORR) hx++;
  while (game.levl[game.u.ux][ly-1].typ && game.levl[game.u.ux][ly-1].typ !== CORR) ly--;
  while (game.levl[game.u.ux][hy+1].typ && game.levl[game.u.ux][hy+1].typ !== CORR) hy++;
  let num = 0;
  for (let zy = ly; zy <= hy; zy++) {
    for (let zx = lx; zx <= hx; zx++) {
      if (game.levl[zx][zy].typ === SDOOR) {
        game.levl[zx][zy].typ = DOOR; atl(zx, zy, '+'); num++;
      } else {
        const gtmp = g_at_gen(zx, zy, game.ftrap);
        if (gtmp) {
          if (!(gtmp.gflag & SEEN)) { gtmp.gflag |= SEEN; atl(zx, zy, '^'); num++; }
        } else {
          const gold = g_at_gen(zx, zy, game.fgold);
          if (gold && !gold.gflag) {
            makemon(mon[5][2]); game.fmon.mx = zx; game.fmon.my = zy;
            atl(zx, zy, 'M'); num++;
            // Remove the fake gold
            if (gold === game.fgold) game.fgold = gold.ngen;
            else { let g1 = game.fgold; while (g1.ngen !== gold) g1 = g1.ngen; g1.ngen = gold.ngen; }
          }
        }
      }
    }
  }
  return num;
}

// C ref: bhit(ddx,ddy,range) — projectile, returns monster hit
// Also sets game.dx, game.dy to end location
export function bhit(ddx, ddy, range) {
  if (game.u.uswallow) return game.u.ustuck;
  let x = game.u.ux, y = game.u.uy;
  while (range-- > 0) {
    x += ddx; y += ddy;
    const mtmp = g_at_mon(x, y, game.fmon);
    if (mtmp) { game.dx = x; game.dy = y; return mtmp; }
    if (game.levl[x][y].typ < CORR) { game.dx = x - ddx; game.dy = y - ddy; return null; }
  }
  game.dx = x; game.dy = y;
  return null;
}

// C ref: buzz(type,sx,sy,dx,dy) — zap a ray
export async function buzz(type, sx, sy, bdx, bdy) {
  if (game.u.uswallow) {
    await pline('The %s rips into the %s.', fl[type], game.u.ustuck.data.mname);
    zhit(game.u.ustuck, type);
    if (game.u.ustuck.mhp < 1) await killed(game.u.ustuck);
    return;
  }
  let range = rn1(7, 9);
  const let_char = (bdx === bdy) ? '\\' : (bdx && bdy) ? '/' : (bdx) ? '-' : '|';
  while (range-- > 0) {
    sx += bdx; sy += bdy;
    const cell = game.levl[sx] && game.levl[sx][sy];
    if (!cell) break;
    if (cell.typ) { at_buzz(sx, sy, let_char); cell.isnew = true; on(sx, sy); }
    const mtmp = g_at_mon(sx, sy, game.fmon);
    if (mtmp) {
      if (rnd(20) < 14 + mtmp.data.ac) {
        zhit(mtmp, type);
        if (mtmp.mhp < 1) await killed(mtmp); else await hit(fl[type], mtmp);
        range -= 2;
      } else await miss(fl[type], mtmp);
    } else if (sx === game.u.ux && sy === game.u.uy) {
      if (rnd(20) < 11 + game.u.uac) {
        range -= 2;
        await pline('The %s hits you!', fl[type]);
        switch (type) {
          case 0: game.u.uhp -= d(2,6); break;
          case 1:
            if (game.u.ufireres) await pline("You don't feel hot!");
            else game.u.uhp -= d(6,6); break;
          case 2: nomul(-rnd(25)); break;
          case 3:
            if (game.u.ucoldres) await pline("You don't feel cold!");
            else game.u.uhp -= d(6,6); break;
          case 4: game.u.uhp = -1; break;
        }
        game.flags.botl |= HP;
        game.killer = fl[type];
      } else await pline('The %s wizzes by you!', fl[type]);
    }
    if (cell.typ <= DOOR) {
      if (cell.cansee) await pline('The %s bounces!', fl[type]);
      bdx = -bdx; bdy = -bdy; range--;
    }
  }
}

function at_buzz(x, y, ch) {
  const sy = y + 2;  // same as at() in pri.js: map row y -> screen row y+2 (1-based)
  game.display.moveCursor(x, sy);
  game.display.putCharAtCursor(ch);
  game.curx++;
}

// C ref: zhit(mon,type) — apply ray damage to monster
export function zhit(mtmp, type) {
  const tmp = mtmp.data.mlet;
  switch (type) {
    case 0: mtmp.mhp -= d(2,6); break;
    case 1:
      if (!'&XDgiQ'.includes(tmp)) mtmp.mhp -= d(6,6);
      if ('Y&'.includes(tmp)) mtmp.mhp -= d(3,6); break;
    case 2:
      if (!'WVZ'.includes(tmp)) mtmp.mstat = 3; // MFROZ
      break;
    case 3:
      if (!'X&Ygf'.includes(tmp)) mtmp.mhp -= d(6,6);
      if ('&D~'.includes(tmp)) mtmp.mhp -= d(3,6); break;
    case 4:
      if ('WVZ'.includes(tmp)) return;
      mtmp.mhp = -1; break;
  }
}

// C ref: dosearch() — search adjacent cells
export async function dosearch() {
  for (let x = game.u.ux - 1; x < game.u.ux + 2; x++) {
    for (let y = game.u.uy - 1; y < game.u.uy + 2; y++) {
      if (game.levl[x][y].typ === SDOOR && !rn2(7)) {
        game.levl[x][y].typ = DOOR; atl(x, y, '+'); nomul(0);
      } else {
        for (let tgen = game.ftrap; tgen; tgen = tgen.ngen) {
          if (tgen.gx === x && tgen.gy === y &&
              (!rn2(8) || (!game.u.usearch && tgen.gflag & SEEN))) {
            nomul(0);
            await pline('You find a%s', traps_name(tgen.gflag & 0x1f));
            if (!(tgen.gflag & SEEN)) { tgen.gflag |= SEEN; atl(x, y, '^'); }
          }
        }
      }
    }
  }
}

function traps_name(n) {
  const t = ['bear trap', 'arrow trap', 'dart trap', 'trapdoor',
             'teleport trap', 'pit', 'sleeping gas trap'];
  return t[n] || 'unknown trap';
}

// ===== Inventory list helpers =====

function serializeInvent(head) {
  const items = [];
  for (let o = head; o !== null; o = o.nobj) {
    items.push({
      ox: o.ox, oy: o.oy,
      olet: o.olet,
      spe: o.spe,
      quan: o.quan,
      minus: o.minus,
      known: o.known,
      cursed: o.cursed,
      otyp: o.otyp,
    });
  }
  return items;
}

function deserializeInvent(items) {
  if (!items || items.length === 0) return null;
  let head = null, tail = null;
  for (const d of items) {
    const o = Object.assign(makeObj(), d);
    o.nobj = null;
    if (tail) tail.nobj = o;
    else head = o;
    tail = o;
  }
  return head;
}

function inventToArray(head) {
  const arr = [];
  for (let o = head; o !== null; o = o.nobj) arr.push(o);
  return arr;
}

function findInventIdx(arr, ref) {
  if (!ref) return -1;
  for (let i = 0; i < arr.length; i++) if (arr[i] === ref) return i;
  return -1;
}

// C ref: dosave() — save game to localStorage
export async function dosave() {
  await pline('Really save? [yn] (n)');
  const ch = await game.input.getKey();
  if (ch !== 'y' && ch !== 'Y') {
    game.flags.move = false;
    return;
  }

  try {
    // Save current level into savedLevels before serializing
    savelev();

    const inventArr = inventToArray(game.invent);
    const state = {
      version: 2,
      dlevel: game.dlevel,
      moves: game.moves,
      multi: game.multi,
      rngSeed: game.rngSeed,
      initialSeed: game.initialSeed,
      u: Object.assign({}, game.u, { ustuck: null }),  // strip monster pointer
      flags: Object.assign({}, game.flags),
      savedLevels: game.savedLevels,
      invent: serializeInvent(game.invent),
      uwep_idx:   findInventIdx(inventArr, game.uwep),
      uarm_idx:   findInventIdx(inventArr, game.uarm),
      uleft_idx:  findInventIdx(inventArr, game.uleft),
      uright_idx: findInventIdx(inventArr, game.uright),
      xupstair: game.xupstair, yupstair: game.yupstair,
      xdnstair: game.xdnstair, ydnstair: game.ydnstair,
      buf: game.buf, killer: game.killer,
      wannam:   game.wannam,  potcol:   game.potcol,
      rinnam:   game.rinnam,  scrnam:   game.scrnam,
      potcall:  game.potcall, scrcall:  game.scrcall,
      wandcall: game.wandcall, ringcall: game.ringcall,
    };
    localStorage.setItem('hack_save', JSON.stringify(state));
    await pline('Game saved. Be seeing you...');
    // In browser, user can refresh to continue; stop the loop
    game.flags.move = false;
    game.multi = 0;
  } catch (e) {
    await pline('Save failed: %s', e.message);
  }
}

// C ref: dorecover(fp) — restore from save
// Called from firsthack.js if save exists on startup.
export async function dorecover() {
  const raw = localStorage.getItem('hack_save');
  if (!raw) return false;
  let s;
  try { s = JSON.parse(raw); } catch (e) { return false; }
  if (!s || s.version !== 2) return false;

  localStorage.removeItem('hack_save');

  // Restore scalars
  game.dlevel     = s.dlevel;
  game.moves      = s.moves;
  game.multi      = s.multi || 0;
  game.rngSeed    = s.rngSeed;
  game.initialSeed = s.initialSeed || s.rngSeed;
  game.xupstair   = s.xupstair; game.yupstair = s.yupstair;
  game.xdnstair   = s.xdnstair; game.ydnstair = s.ydnstair;
  game.buf        = s.buf || '';
  game.killer     = s.killer || '';

  // Restore player
  Object.assign(game.u, s.u);
  game.u.ustuck = null;

  // Restore flags
  Object.assign(game.flags, s.flags);

  // Restore name arrays
  if (s.wannam)   game.wannam   = s.wannam;
  if (s.potcol)   game.potcol   = s.potcol;
  if (s.rinnam)   game.rinnam   = s.rinnam;
  if (s.scrnam)   game.scrnam   = s.scrnam;
  if (s.potcall)  game.potcall  = s.potcall;
  if (s.scrcall)  game.scrcall  = s.scrcall;
  if (s.wandcall) game.wandcall = s.wandcall;
  if (s.ringcall) game.ringcall = s.ringcall;

  // Restore inventory
  game.invent = deserializeInvent(s.invent);
  const inventArr = inventToArray(game.invent);
  game.uwep   = s.uwep_idx  >= 0 ? (inventArr[s.uwep_idx]  || null) : null;
  game.uarm   = s.uarm_idx  >= 0 ? (inventArr[s.uarm_idx]  || null) : null;
  game.uleft  = s.uleft_idx >= 0 ? (inventArr[s.uleft_idx] || null) : null;
  game.uright = s.uright_idx >= 0 ? (inventArr[s.uright_idx] || null) : null;

  // Restore savedLevels and load current level
  game.savedLevels = s.savedLevels || {};
  getlev(game.savedLevels[game.dlevel]);

  // Redraw
  await docrt();

  return true;
}

// Forward ref: nomul is in main.js, imported by browser_main
// We use a deferred reference pattern
let _nomul_fn = null;
export function _setDo1Deps(nomul) { _nomul_fn = nomul; }
function nomul(n) { if (_nomul_fn) _nomul_fn(n); else game.multi = n; }

// Forward ref: ndaminc is in main.js
let _ndaminc_fn = null;
export function setNdaminc(fn) { _ndaminc_fn = fn; }
function ndaminc() { if (_ndaminc_fn) _ndaminc_fn(); }
