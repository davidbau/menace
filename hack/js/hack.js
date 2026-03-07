// C ref: hack.c — player movement, combat, teleport, item naming
import { WALL, SDOOR, DOOR, CORR, ROOM, SEEN, HP, GOLD, AC, STR } from './const.js';
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
    u.ux = game.xupstair; // STUB: proper blind handling
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
    await pline('You cannot escape from %s!', u.ustuck.data.mname);
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
    else { gobj(obj); }
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
            await dodown();
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

// C ref: doname(obj,buf) — return item description string
export function doname(obj) {
  const u = game.u;
  switch (obj.olet) {
    case '"': return 'The amulet of Frobozz.';
    case '%':
      return obj.quan > 1 ? `${obj.quan} ${foodnam[obj.otyp]}s.` : `a ${foodnam[obj.otyp]}.`;
    case ')': {
      const nm = wepnam[obj.otyp] || 'weapon';
      let s = obj.quan > 1 ? `${obj.quan} ${nm}s` : `a ${nm}`;
      if (obj.spe) s += obj.minus ? ` (-${obj.spe})` : ` (+${obj.spe})`;
      if (obj.cursed) s += ' {cursed}';
      return s + '.';
    }
    case '[': {
      const nm = armnam[obj.otyp] || 'armor';
      let s = `a ${nm}`;
      if (obj.spe) s += obj.minus ? ` (-${obj.spe})` : ` (+${obj.spe})`;
      if (obj.cursed) s += ' {cursed}';
      return s + '.';
    }
    case '!': {
      let s = obj.known ? pottyp[obj.otyp] || 'potion' :
              (game.potcol && game.potcol[obj.otyp]) ? `${game.potcol[obj.otyp]} potion` : 'a potion';
      return obj.quan > 1 ? `${obj.quan} ${s}s.` : `a ${s}.`;
    }
    case '?': {
      let s = obj.known ? scrtyp[obj.otyp] || 'scroll' :
              (game.scrnam && game.scrnam[obj.otyp]) ? `scroll labeled "${game.scrnam[obj.otyp]}"` : 'a scroll';
      return `a ${s}.`;
    }
    case '/': {
      let s = obj.known ? wantyp[obj.otyp] || 'wand' :
              (game.wannam && game.wannam[obj.otyp]) ? `${game.wannam[obj.otyp]} wand` : 'a wand';
      s += ` (${obj.spe})`;
      return `a ${s}.`;
    }
    case '=': {
      const nm = obj.known ? ringtyp[obj.otyp] || 'ring' :
                 (game.rinnam && game.rinnam[obj.otyp]) ? `${game.rinnam[obj.otyp]} ring` : 'a ring';
      return `a ${nm}.`;
    }
    case '*': return `a gem.`;
    case '$': return `${obj.quan} gold pieces.`;
    default: return 'an unknown item.';
  }
}

// C ref: parse() — read and return next command
export async function parse() {
  game.flags.topl = game.flags.topl === 2 ? 1 : 0;
  game.display.flush();
  const cmd = await game.input.getKey();
  return cmd;
}

// C ref: amon(mtmp,otmp,range) — player attacks monster
// otmp=null means unarmed/fists; range<0 means thrown weapon bonus
export async function amon(mtmp, otmp, range) {
  const u = game.u;
  const mdat = mtmp.data;
  let tmp = 0;

  // Determine if we hit
  let hitBonus = u.ulevel + u.udaminc;
  if (otmp) hitBonus += otmp.spe;
  const hit = rnd(20) + hitBonus >= mdat.ac + 10;

  if (!hit) {
    // Miss
    const missIdx = rn2(3);
    const missMsg = ['You miss %s%s.', 'You almost hit %s%s.', 'You badly miss %s%s.'];
    const art = vowelStart(mdat.mname) ? 'an ' : 'a ';
    await pline(missMsg[missIdx], art, mdat.mname);
    return;
  }

  // Hit — compute damage
  let dam = 0;
  if (otmp) {
    const isLarge = mlarge.includes(mdat.mlet);
    const dmgBase = isLarge ? wldam[otmp.otyp] || 1 : wsdam[otmp.otyp] || 1;
    dam = rnd(dmgBase * 6) + u.udaminc;
    if (otmp.spe && !otmp.minus) dam += otmp.spe;
    if (range < 0) { // thrown — half damage
      dam = Math.max(1, Math.floor(dam / 2));
    }
  } else {
    // Unarmed
    dam = rnd(u.udaminc + 1) + 1;
  }

  const hitIdx = rn2(3);
  const hitMsg = ['You hit %s%s!', 'You score an excelent hit on %s%s!', 'You barely hit %s%s!'];
  const art = vowelStart(mdat.mname) ? 'an ' : 'a ';
  await pline(hitMsg[hitIdx], art, mdat.mname);

  mtmp.mhp -= dam;
  if (mtmp.mhp < 1) {
    await killed(mtmp);
    return;
  }
  // Wake the monster
  if (mtmp.mstat === 2) mtmp.mstat = 0; // SLEEP -> MNORM
}

// C ref: attmon(mtmp,otmp,range) — attack while swallowed
export async function attmon(mtmp, otmp, range) {
  // Inside a swallowing monster — attack it
  await amon(mtmp, otmp, range);
}

function vowelStart(s) { return 'aeiou'.includes(s[0].toLowerCase()); }

// Helper: item weight
function weight(obj) {
  if (!obj) return 0;
  switch (obj.olet) {
    case ')': return obj.quan * 3;
    case '[': return 30;
    case '!': return 2;
    case '?': return 1;
    case '/': return 7;
    case '=': return 3;
    case '%': return obj.quan * 20;
    case '*': return 1;
    default: return 1;
  }
}

// gobj — pick up an object from the floor into inventory
function gobj(obj) {
  // Remove from fobj list
  if (obj === game.fobj) game.fobj = game.fobj.nobj;
  else {
    let prev = game.fobj;
    while (prev && prev.nobj !== obj) prev = prev.nobj;
    if (prev) prev.nobj = obj.nobj;
  }
  obj.nobj = game.invent;
  game.invent = obj;
  game.levl[obj.ox][obj.oy].scrsym = '.'; // clear floor marker
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

function trapName(n) {
  const t = ['bear trap','arrow trap','dart trap','trapdoor','teleport trap','pit','sleeping gas trap'];
  return t[n] || 'trap';
}

export { weight, gobj };
