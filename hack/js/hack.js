// C ref: hack.c — player movement, combat, teleport, item naming
import { WALL, SDOOR, DOOR, CORR, ROOM, SEEN, HP, GOLD, AC, STR, RINN, WANN, POTN, MCONF } from './const.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import { pline, atl, newsym, nscr, pru, prl, prl1, nose1, nosee, on, cls, curs, losehp } from './pri.js';
import { g_at_gen, g_at_mon, g_at_obj, delmon, killed, rloc, mnexto, makemon, newcham,
         hitu, youswld, justswld, movemon, dochug } from './mon.js';
import { bhit, buzz, dosearch, zhit } from './do1.js';
import { foodnam, wepnam, armnam, pottyp, scrtyp, ringtyp, wantyp, wannam, rinnam, scrnam,
         potcol, CALL, OF, vowels, wldam, wsdam, mlarge } from './data.js';

// C ref: setsee() — set the room/corridor the player can see
// Called after movement to light up the current room or corridor
export function setsee() {
  const levl = game.levl;
  const u = game.u;
  if (u.ublind) {
    pru();
    return;
  }
  const cell = levl[u.ux][u.uy];
  if (!cell.lit) {
    // In a corridor or dark room — see only adjacent cells
    game.seehx = game.seelx = 0;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
      for (let y = u.uy - 1; y <= u.uy + 1; y++)
        prl(x, y);
    pru();
    return;
  }
  // In a lit room — find room bounds (C: expand while lit, no ±1 expansion)
  let lx = u.ux, hx = u.ux, ly = u.uy, hy = u.uy;
  while (levl[lx-1][u.uy].lit) lx--;
  while (levl[hx+1][u.uy].lit) hx++;
  while (levl[u.ux][ly-1].lit) ly--;
  while (levl[u.ux][hy+1].lit) hy++;
  game.seelx = lx; game.seehx = hx;
  game.seely = ly; game.seehy = hy;
  for (let y = game.seely; y <= game.seehy; y++)
    for (let x = game.seelx; x <= game.seehx; x++)
      if (x === u.ux && y === u.uy) pru();
      else prl(x, y);
}

// C ref: unsee() — mark all currently-visible cells as not cansee
export function unsee() {
  const levl = game.levl;
  const u = game.u;
  if (u.ublind) return;
  if (game.seehx) {
    for (let x = game.seelx; x <= game.seehx; x++)
      for (let y = game.seely; y <= game.seehy; y++) {
        const cell = levl[x][y];
        cell.cansee = false;
        if (cell.scrsym === '@') newsym(x, y);
        const mtmp = g_at_mon(x, y, game.fmon);
        if (mtmp && mtmp.mstat < 2 && mtmp.data.mlet === cell.scrsym) newsym(x, y);
      }
    game.seehx = 0;
  } else {
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
      for (let y = u.uy - 1; y <= u.uy + 1; y++) {
        const cell = levl[x][y];
        cell.cansee = false;
        if (cell.scrsym === '@') newsym(x, y);
        else if ((g_at_mon(x, y, game.fmon) && g_at_mon(x, y, game.fmon).mstat < 2 &&
                  g_at_mon(x, y, game.fmon).data.mlet === cell.scrsym)) newsym(x, y);
        else if (cell.scrsym === '.') { cell.scrsym = ' '; cell.isnew = true; on(x, y); }
      }
  }
}

// C ref: seeoff(mode) — turn off canSee flags (mode=1 for movement, 0 for blindness)
export function seeoff(mode) {
  if (game.seehx) {
    for (let x = game.seelx; x <= game.seehx; x++)
      for (let y = game.seely; y <= game.seehy; y++) {
        game.levl[x][y].cansee = false;
        if (mode && game.levl[x][y].scrsym === '@') newsym(x, y);
      }
    game.seehx = 0;
  } else {
    for (let x = game.u.ux - 1; x <= game.u.ux + 1; x++)
      for (let y = game.u.uy - 1; y <= game.u.uy + 1; y++) {
        game.levl[x][y].cansee = false;
        if (mode) {
          if (game.levl[x][y].scrsym === '@') newsym(x, y);
          else if (game.levl[x][y].scrsym === '.') game.levl[x][y].seen = false;
        } else if (game.levl[x][y].scrsym === '.') game.levl[x][y].seen = false;
      }
  }
}

// C ref: movecm(cmd) — set dx/dy from movement key, return 1 if valid
export function movecm(cmd) {
  game.dx = game.dy = 0;
  switch (cmd) {
    case 'h': game.dx = -1; break;
    case 'j': game.dy = 1; break;
    case 'k': game.dy = -1; break;
    case 'l': game.dx = 1; break;
    case 'y': game.dx = game.dy = -1; break;
    case 'u': game.dx = 1; game.dy = -1; break;
    case 'b': game.dx = -1; game.dy = 1; break;
    case 'n': game.dx = game.dy = 1; break;
    default: return 0;
  }
  return 1;
}

// C ref: nomul(n) — set multi to n, stopping multiple moves
export function nomul(n) {
  game.multi = n;
}

// C ref: domove() — execute one step in dx/dy direction
export async function domove() {
  const u = game.u;
  const levl = game.levl;

  if (u.utrap) {
    if (u.upit) await pline('You are still in a pit.');
    else await pline('You are caught in a beartrap.');
    u.utrap--;
    return;
  }
  if (u.uconfused) {
    do { game.dx = rn1(3,-1); game.dy = rn1(3,-1); }
    while (!game.dx && !game.dy);
  }
  const nx = u.ux + game.dx, ny = u.uy + game.dy;
  const tmpr = levl[nx][ny];
  const ust = levl[u.ux][u.uy];

  if (u.uswallow) {
    await attmon(u.ustuck, game.uwep, 0);
    if (game.multi) game.multi = 0;
    return;
  }
  if (u.ustuck && (nx !== u.ustuck.mx || ny !== u.ustuck.my)) {
    await k1('You cannot escape from %s%s!', u.ustuck.data.mname);
    if (game.multi) game.multi = 0;
    return;
  }
  const mtmp = g_at_mon(nx, ny, game.fmon);
  if (mtmp) {
    nomul(0);
    if (u.ublind) { await amon(mtmp, game.uwep, 0); }
    else if (mtmp.sinv) {
      if (mtmp.data.mlet === 'M') {
        await pline("That's a %s!", mtmp.data.mname);
        if (!u.ustuck) u.ustuck = mtmp;
        mtmp.sinv = false; atl(mtmp.mx, mtmp.my, 'M');
        return;
      } else if (mtmp.data.mlet === 'p') {
        if (u.uac + 5 > rnd(20)) {
          await pline('You are impaled by a falling piercer!');
          u.uhp -= d(4,6); game.flags.botl |= HP;
          game.killer = mtmp.data.mname;
        } else await pline('You duck a falling piercer!');
        mtmp.invis = false; mtmp.sinv = false; atl(mtmp.mx, mtmp.my, 'p');
      } else await justswld(mtmp);
      return;
    } else if (!game.flags.mdone || (!u.ucinvis && mtmp.invis)) {
      await amon(mtmp, game.uwep, 0);
    }
    return;
  }
  if (tmpr.typ < DOOR || (g_at_gen(nx, ny, game.ftrap) &&
      g_at_gen(nx, ny, game.ftrap).gflag & SEEN && game.flags.mv)) {
    game.flags.mv = game.multi = 0;
    if (game.flags.mdone) pru();
    if (!u.uconfused) game.flags.move = false;
    return;
  }
  if (game.dx && game.dy && (tmpr.typ === DOOR || ust.typ === DOOR)) {
    game.flags.move = game.flags.mv = game.multi = 0;
    if (game.flags.mdone) pru();
    return;
  }
  const oldux = u.ux, olduy = u.uy;
  u.ux = nx; u.uy = ny;
  game.flags.mdone = true;

  if (game.flags.mv > 1) {
    if ((game.xupstair === u.ux && game.yupstair === u.uy) ||
        (game.xdnstair === u.ux && game.ydnstair === u.uy)) nomul(0);
    if (!u.ublind) {
      if (levl[u.ux + game.dy] && levl[u.ux + game.dy][u.uy - game.dx] &&
          levl[u.ux + game.dy][u.uy - game.dx].typ === DOOR) nomul(0);
      if (levl[u.ux - game.dy] && levl[u.ux - game.dy][u.uy + game.dx] &&
          levl[u.ux - game.dy][u.uy + game.dx].typ === DOOR) nomul(0);
    }
    if (tmpr.typ === DOOR) {
      if (!u.ublind) game.multi = game.multi > 80 ? game.multi - 1 : 1;
      else nomul(0);
    }
  }

  if (ust.scrsym === '@') { newsym(oldux, olduy); game.oldux = oldux; game.olduy = olduy; }

  if (!u.ublind) {
    if (ust.lit) {
      if (tmpr.lit) {
        if (tmpr.typ === DOOR) prl1(u.ux + game.dx, u.uy + game.dy);
        else if (ust.typ === DOOR) nose1(oldux - game.dx, olduy - game.dy);
      } else { unsee(); ust.cansee = true; prl1(u.ux + game.dx, u.uy + game.dy); }
    } else {
      if (tmpr.lit) setsee();
      else {
        prl1(u.ux + game.dx, u.uy + game.dy);
        if (tmpr.typ === DOOR) {
          if (game.dy) { prl(u.ux-1, u.uy); prl(u.ux+1, u.uy); }
          else { prl(u.ux, u.uy-1); prl(u.ux, u.uy+1); }
        }
      }
      nose1(oldux - game.dx, olduy - game.dy);
    }
  } else if (!ust.seen) {
    ust.cansee = false; ust.isnew = true; on(oldux, olduy);
  } else ust.cansee = false;

  if (!game.multi) pru();

  // Pick up gold
  const gold = g_at_gen(u.ux, u.uy, game.fgold);
  if (gold) {
    if (gold.gflag < 2) gold.gflag = 2;
    await pline('%u gold pieces.', gold.gflag);
    u.urexp += gold.gflag; u.ugold += gold.gflag; game.flags.botl |= GOLD;
    if (gold === game.fgold) game.fgold = game.fgold.ngen;
    else { let g1 = game.fgold; while (g1.ngen !== gold) g1 = g1.ngen; g1.ngen = gold.ngen; }
    if (game.flags.mv > 1) nomul(0);
    if (u.uinvis) newsym(u.ux, u.uy);
  }

  // Pick up items
  const obj = g_at_obj(u.ux, u.uy, game.fobj);
  if (obj) {
    let wt = 0;
    for (let o = game.invent; o; o = o.nobj) wt += weight(o);
    wt += weight(obj);
    if (wt > 85) await pline('Your pack is full.');
    else { await gobj(obj); }
    if (game.flags.mv > 1) nomul(0);
  }

  // Trigger traps
  const trap = g_at_gen(u.ux, u.uy, game.ftrap);
  if (trap) {
    nomul(0);
    const ttype = trap.gflag & 0x1f;
    if (trap.gflag & SEEN && !rn2(6)) {
      await pline('You escape a%s.', trapName(ttype));
    } else {
      trap.gflag |= SEEN;
      switch (ttype) {
        case 6: // SLPTRP
          await pline('A cloud of gas puts you to sleep!'); nomul(-rnd(25)); break;
        case 0: // BEAR
          u.utrap = rn1(4,4); u.upit = false;
          await pline('A bear trap closes on your foot!'); break;
        case 1: // ARROW
          if (hitu(10, rnd(6), 'arrow')) await pline('An arrow shot you!');
          else await pline('You duck an arrow!'); break;
        case 3: // TDOOR
          if (!game.xdnstair) {
            await pline('A trapdoor opens and a rock falls on you!');
            u.uhp -= d(2,10); game.flags.botl |= HP;
          } else {
            await pline('A trap door opens up under you!');
            if (u.ufloat || u.ustuck) { await pline("You don't fall in!"); break; }
            seeoff(1);
            // C ref: do dodown(); while(!rn2(4) && xdnstair) — player can fall multiple levels
            do { await dodown(); } while (!rn2(4) && game.xdnstair);
            do { u.ux = rnd(79); u.uy = rn2(22); }
            while (levl[u.ux][u.uy].typ < ROOM || g_at_mon(u.ux, u.uy, game.fmon));
            setsee(); await docrt_fn();
          }
          break;
        case 2: // DART
          if (hitu(9, rnd(3), 'dart')) {
            await pline('A dart zaps out and hits you!');
            if (!rn2(6)) { await poisoned_fn('dart'); game.killer = 'poison dart'; }
          } else await pline('A dart wizzes by you and vanishes!'); break;
        case 4: // TELE
          newsym(u.ux, u.uy); tele(); break;
        case 5: // PIT
          if (u.ufloat) { await pline('A pit opens up under you!'); await pline("You don't fall in!"); break; }
          await pline('You fall into a pit!');
          u.utrap = rn1(6,2); u.upit = true;
          u.uhp -= rnd(6); game.flags.botl |= HP;
          game.killer = 'pit'; break;
        default:
          await pline('Bad trap %d', ttype);
      }
    }
  }
}

// C ref: tele() — teleport player
export function tele() {
  unsee();
  game.u.ustuck = null; game.u.uswldtim = 0; game.u.uswallow = false;
  game.u.utrap = 0;
  do {
    game.u.ux = rn1(80, 0); game.u.uy = rn1(22, 0);
  } while (game.levl[game.u.ux][game.u.uy].typ <= DOOR ||
           g_at_mon(game.u.ux, game.u.uy, game.fmon) ||
           g_at_obj(game.u.ux, game.u.uy, game.fobj) ||
           g_at_gen(game.u.ux, game.u.uy, game.ftrap) ||
           g_at_gen(game.u.ux, game.u.uy, game.fgold));
  setsee();
}

// C ref: pow(num) → pow2(num) — returns 2^num
export function pow2(num) {
  let tmp = 1;
  while (num-- > 0) tmp *= 2;
  return tmp;
}

// C ref: setan(str) — prefix "a " or "an " based on first vowel
function setan(str) {
  return 'aeiouAEIOU'.includes(str[0]) ? `an ${str}` : `a ${str}`;
}

// C ref: doname(obj,buf) — return item description string
// C appends "  (weapon in hand)" AFTER all cases if obj==uwep
export function doname(obj) {
  const u = game.u;
  let s;
  switch (obj.olet) {
    case '"': s = 'The amulet of Frobozz.'; break;
    case '%':
      s = obj.quan > 1 ? `${obj.quan} ${foodnam[obj.otyp]}s.` : `a ${foodnam[obj.otyp]}.`; break;
    case ')': {
      const nm = wepnam[obj.otyp] || 'weapon';
      if (obj.known) {
        const sign = obj.minus ? '-' : '+';
        if (obj.quan > 1) s = `${obj.quan} ${sign}${obj.spe} ${nm}s`;
        else s = `a ${sign}${obj.spe} ${nm}`;
      } else {
        if (obj.quan > 1) s = `${obj.quan} ${nm}s`;
        else s = setan(nm);
      }
      s += '.'; break;
    }
    case '[': {
      // C: "a suit of ±N X armor" if known, else "a suit of X armor"; + "(being worn)"
      const nm = armnam[obj.otyp - 2] || 'armor';
      if (obj.known) s = `a suit of ${obj.minus ? '-' : '+'}${obj.spe} ${nm} armor`;
      else s = `a suit of ${nm} armor`;
      if (obj === game.uarm) s += '  (being worn)';
      s += '.'; break;
    }
    case '!': {
      // C ref: hack.c doname() case '!'
      // if oiden&POTN or potcall[otyp]: "a potion of X." or "a potion called X."
      // else: "a COLORNAME potion." (using setan for article)
      const pcall = game.potcall && game.potcall[obj.otyp];
      if ((game.oiden[obj.otyp] & POTN) || pcall) {
        const base = obj.quan > 1 ? `${obj.quan} potions` : 'a potion';
        if (!pcall) s = `${base} of ${pottyp[obj.otyp]}.`;
        else s = `${base} called ${pcall}.`;
      } else {
        const col = game.potcol && game.potcol[obj.otyp];
        if (obj.quan > 1) s = `${obj.quan} ${col} potions.`;
        else s = setan(col) + ' potion.';
      }
      break;
    }
    case '?': {
      // C: if(quan>1) "%d scrolls" else "a scroll"; then " of X." / " called X." / " labeled 'X'."
      const base = obj.quan > 1 ? `${obj.quan} scrolls` : 'a scroll';
      if (obj.known) s = `${base} of ${scrtyp[obj.otyp]}.`;
      else {
        const callname = game.scrcall && game.scrcall[obj.otyp];
        if (callname) s = `${base} called ${callname}.`;
        else {
          const label = game.scrnam && game.scrnam[obj.otyp];
          s = label ? `${base} labeled '${label}'.` : `${base}.`;
        }
      }
      break;
    }
    case '/': {
      // C: if oiden[otyp]&WANN → "a wand of X."; elif wandcall → "a wand called X."; else setan(wannam[otyp])+" wand."
      // If obj->known: append "  (N)."
      if (game.oiden[obj.otyp] & WANN) {
        s = `a wand of ${wantyp[obj.otyp]}.`;
      } else if (game.wandcall && game.wandcall[obj.otyp]) {
        s = `a wand called ${game.wandcall[obj.otyp]}.`;
      } else {
        const wn = game.wannam && game.wannam[obj.otyp];
        s = setan(wn ? wn : 'wand') + (wn ? ' wand.' : '.');
      }
      if (obj.known) {
        // C: while(*buf) buf++; sprintf(buf,"  (%d).",obj->spe) — appends without removing trailing '.'
        s += `  (${obj.spe}).`;
      }
      break;
    }
    case '=': {
      // C: if oiden[otyp]&RINN and known → "a ±N ring of X"; elif ringcall → "a ring called X"; else rinnam
      if (game.oiden[obj.otyp] & RINN) {
        if (obj.known) s = `a ${obj.minus ? '-' : '+'}${obj.spe} ring of ${ringtyp[obj.otyp]}`;
        else s = `a ring of ${ringtyp[obj.otyp]}`;
      } else if (game.ringcall && game.ringcall[obj.otyp]) {
        s = `a ring called ${game.ringcall[obj.otyp]}`;
      } else {
        const rn = game.rinnam && game.rinnam[obj.otyp];
        s = setan(rn ? rn + ' ring' : 'ring');
      }
      if (obj === game.uright) s += '  (on right hand)';
      if (obj === game.uleft) s += '  (on left hand)';
      s += '.'; break;
    }
    case '*': {
      const typname = (game.potcol && game.potcol[obj.otyp]) || 'glowing';
      if (obj.quan > 1) s = `${obj.quan} ${typname} gems.`;
      else {
        const art = 'aeiou'.includes(typname[0].toLowerCase()) ? 'an' : 'a';
        s = `${art} ${typname} gem.`;
      }
      break;
    }
    case '$': s = `${obj.quan} gold pieces.`; break;
    default: s = 'an unknown item.'; break;
  }
  // C ref: hack.c L488 — "if(obj==uwep) strcat(buf,"  (weapon in hand)");" — applies to ALL item types
  if (obj === game.uwep) s += '  (weapon in hand)';
  return s;
}

// C ref: parse() — read and return next command
// C sequence: curs(player), fflush, getchar (harness captures screen HERE), then clear topl, reset flags
export async function parse() {
  const hadMsg = game.flags.topl !== 0;  // save BEFORE any reset
  game.display.flush();
  const cmd = await game.input.getKey();  // screen captured WITH message still visible
  if (hadMsg) {                           // clear top line AFTER capture (matches C: home(); cl_end(); after getchar)
    game.display.moveCursor(1, 1);
    game.display.clearToEol();
  }
  game.flags.mdone = game.flags.topl = game.oldux = game.olduy = 0;
  return cmd;
}

// C ref: abon() — strength bonus to hit
function abon() {
  const str = game.u.ustr;
  if (str === 3) return -4;
  if (str < 6) return -3;
  if (str < 8) return -2;
  if (str < 17) return -1;
  if (str < 69) return 0;   // up to 18/50
  if (str < 118) return 1;
  return 2;
}

// C ref: k1(str,arg) — pline helper matching mon.js k1
async function k1(fmt, name, ...rest) {
  if (game.u.ublind) {
    const it = fmt[0] === '%' ? 'It' : 'it';
    await pline(fmt, '', it, ...rest);
  } else {
    const article = fmt[0] === '%' ? 'The ' : 'the ';
    await pline(fmt, article, name, ...rest);
  }
}

const MISS_MSG = ['You miss %s%s.', 'You almost hit %s%s.', 'You badly miss %s%s.'];
const HIT_MSG  = ['You hit %s%s!', 'You score an excelent hit on %s%s!', 'You barely hit %s%s!'];

// C ref: amon(mtmp,obj,tmp) — player attacks monster (melee or thrown)
// C: tmp += ulevel + mdat.ac + abon() + weapon/status bonuses; hit if tmp >= rnd(20)
export async function amon(mtmp, obj, range) {
  const mdat = mtmp.data;
  let tmp = game.u.ulevel + mdat.ac + abon();

  if (obj) {
    if (obj.olet === '/' && obj.otyp === 3) tmp += 3;  // wand of striking
    else if (obj.olet === ')') {
      if (obj.minus) tmp -= obj.spe;
      else tmp += obj.spe;
      if (obj.otyp === 8) tmp--;   // two-handed sword: -1
      else if (obj.otyp === 9) tmp += 2;  // dagger: +2
    }
  }

  if (mtmp.mstat === 2) { mtmp.mstat = 0; tmp += 2; }  // sleeping: wake + bonus
  if (mtmp.mstat === 3) { tmp += 4; if (!rn2(16)) mtmp.mstat = 0; }  // frozen: bonus + maybe wake
  if (mtmp.mstat === 1) tmp += 2;  // fleeing: bonus

  if (tmp >= rnd(20)) {
    await attmon(mtmp, obj, range);
  } else {
    // Miss
    if (obj && obj !== game.uwep && obj.olet === ')') {
      // Thrown weapon miss: "The mace misses the rat."
      const wn = wepnam[obj.otyp] || 'weapon';
      if (!game.levl[mtmp.mx][mtmp.my].cansee) await pline('The %s misses it.', wn);
      else await pline('The %s misses the %s.', wn, mdat.mname);
    } else {
      await k1(MISS_MSG[rn2(3)], mdat.mname);
    }
  }
  return 0;
}

// C ref: attmon(mtmp,obj) — deal damage after a hit
// Called from amon() when hit, or from within swallowed context
export async function attmon(mtmp, obj, range) {
  const mdat = mtmp.data;
  let tmp;

  if (obj) {
    if (obj.olet === '/' && obj.otyp === 3) {
      tmp = rn1(6, 4);  // wand of striking: d6+4
    } else if (obj.olet === ')') {
      if (mlarge.includes(mdat.mlet)) {
        tmp = rnd(wldam[obj.otyp] || 1);
        if (obj.otyp === 8) tmp += d(2, 6);   // two-handed sword vs large
        else if (obj.otyp === 6) tmp += rnd(4); // spear vs large
      } else {
        tmp = rnd(wsdam[obj.otyp] || 1);
        if (obj.otyp === 6 || obj.otyp === 4) tmp++;  // spear or mace: +1 vs small
      }
      if (obj.minus) tmp -= obj.spe;
      else tmp += obj.spe;
    } else {
      tmp = rnd(3);  // non-weapon object
    }
  } else {
    tmp = rnd(3);  // unarmed
  }

  tmp += game.u.udaminc;

  // Swallowed by purple worm — reduced damage
  if (game.u.uswallow && mdat.mlet === 'P' && (tmp -= game.u.uswldtim) < 1) {
    await k1(HIT_MSG[rn2(3)], mdat.mname);
    return;
  }

  if (tmp < 1) tmp = 1;
  mtmp.mhp -= tmp;

  if (mtmp.mhp < 1) {
    await killed(mtmp);
    return 0;
  }

  // Hit message
  if (!obj || obj === game.uwep || obj.olet !== ')') {
    await k1(HIT_MSG[rn2(3)], mdat.mname);
  } else {
    // Thrown weapon hit: "The mace hits the rat."
    const wn = wepnam[obj.otyp] || 'weapon';
    if (!game.levl[mtmp.mx][mtmp.my].cansee) await pline('The %s hits it.', wn);
    else await pline('The %s hits the %s.', wn, mdat.mname);
  }

  // Monster flees if badly hurt
  if (!rn2(25) && mtmp.mhp < mtmp.orig_hp / 2) {
    mtmp.mstat = 1;  // FLEE
    if (game.u.ustuck === mtmp) game.u.ustuck = null;
  }

  // Confusion effect
  if (game.u.umconf) {
    await pline('Your hands stop glowing blue.');
    if (game.levl[mtmp.mx][mtmp.my].cansee) await pline('The %s appears confused.', mdat.mname);
    mtmp.mstat = MCONF;
    game.u.umconf = 0;
  }

  return 0;
}

function vowelStart(s) { return 'aeiou'.includes(s[0].toLowerCase()); }

/// C ref: weight(obj) — item weight for carrying capacity (limit is 85)
function weight(obj) {
  if (!obj) return 0;
  switch (obj.olet) {
    case '"': return 2;                        // amulet
    case '[': return 8;                        // armor
    case '%':                                  // food: if otyp!=0, return quan; else fall through
      if (obj.otyp) return obj.quan;
      /* falls through */
    case '?': return 3 * obj.quan;            // scroll (and food otyp=0 falls here)
    case '!': return 2 * obj.quan;            // potion
    case ')':                                  // weapon
      if (obj.otyp === 8) return 4;           // arrows
      if (obj.otyp < 4) return (obj.quan / 2) | 0;  // small weapons (dagger, etc.)
      return 3;
    case '=': return 1;                        // ring
    case '*': return obj.quan;                 // gem
    case '/': return 3;                        // wand
    default: return 0;
  }
}

// C ref: prinv(obj) — print "<letter> - <item_name>" for obj in inventory
export async function prinv(obj) {
  let ilet = 'a'.charCodeAt(0);
  for (let o = game.invent; o && o !== obj; o = o.nobj) {
    if (++ilet > 'z'.charCodeAt(0)) ilet = 'A'.charCodeAt(0);
  }
  await pline('%s - %s', String.fromCharCode(ilet), doname(obj));
}

// C ref: gobj(obj) — pick up an object from the floor into inventory
// C: appends to end with stacking, then calls prinv(). Does NOT clear scrsym.
async function gobj(obj) {
  // Remove from fobj list
  if (obj === game.fobj) game.fobj = game.fobj.nobj;
  else {
    let prev = game.fobj;
    while (prev && prev.nobj !== obj) prev = prev.nobj;
    if (prev) prev.nobj = obj.nobj;
  }
  // Add to inventory: append to end with stacking (matches C's gobj())
  if (!game.invent) {
    game.invent = obj;
    obj.nobj = null;
  } else {
    let merged = null;
    let otmp;
    for (otmp = game.invent; otmp; otmp = otmp.nobj) {
      if (otmp.otyp === obj.otyp && otmp.olet === obj.olet) {
        if (obj.otyp < 4 && obj.olet === ')' &&
            obj.quan + otmp.quan < 128 && obj.spe === otmp.spe && obj.minus === otmp.minus) {
          otmp.quan += obj.quan;
          merged = otmp;
          break;
        } else if ('%?!*'.includes(otmp.olet)) {
          otmp.quan += obj.quan;
          merged = otmp;
          break;
        }
      }
      if (!otmp.nobj) { otmp.nobj = obj; obj.nobj = null; break; }
    }
    if (merged) obj = merged;
  }
  await prinv(obj);
  if (game.u.uinvis) newsym(game.u.ux, game.u.uy);
}

// Stubs for cross-file imports
let _dodown_fn, _doup_fn, _docrt_fn, _poisoned_fn;
export function _setHackDeps(d) {
  _dodown_fn = d.dodown; _doup_fn = d.doup;
  _docrt_fn = d.docrt; _poisoned_fn = d.poisoned;
}
async function dodown() { if (_dodown_fn) return _dodown_fn(); }
async function doup() { if (_doup_fn) return _doup_fn(); }
async function docrt_fn() { if (_docrt_fn) return _docrt_fn(); }
async function poisoned_fn(s) { if (_poisoned_fn) return _poisoned_fn(s); }

// C ref: traps[] in hack.vars — leading space/article matches "You escape a%s." format
function trapName(n) {
  const t = [' bear trap','n arrow trap',' dart trap',' trapdoor',' teleportation trap',' pit',' sleeping gas trap'];
  return t[n] || 'n unknown trap';
}

export { weight, gobj };
