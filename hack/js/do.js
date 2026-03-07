// C ref: hack.do.c — rhack command dispatcher, player actions
// STUB: most commands stubbed; movement and basic commands implemented.
import { HP, GOLD, AC, STR, SEEN } from './const.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import { pline, atl, newsym, nscr, bot, cls, curs, on, pru } from './pri.js';
import { movecm, domove, parse, tele, nomul, doname, setsee, seeoff, amon, attmon, prinv } from './hack.js';
import { movemon, makemon, rloc, mnexto, g_at_mon, g_at_obj, g_at_gen, delmon, killed,
         newcham, steal } from './mon.js';
import { ringoff, hit, miss, bhit, buzz, dosearch, dosave, dorecover, zhit } from './do1.js';
import { dodown, doup, done, done1, losestr, ndaminc } from './main.js';
import { mon, pottyp, scrtyp, wantyp, ringtyp, foodnam, wepnam, armnam,
         NOTHIN, CURSED, EMPTY, DONTH, WEARI, MORE } from './data.js';
import { savelev, getlev, mkobj } from './lev.js';
import { docrt } from './pri.js';

// C ref: getobj(filter, verb) — prompt player to select an item from inventory
// Matches C hack.c getobj() exactly: loops until valid selection or ESC.
async function getobj(filter, verb) {
  // Count matching items
  let foo = 0;
  for (let obj = game.invent; obj; obj = obj.nobj)
    if (!filter || filter.includes(obj.olet)) foo++;
  if (!game.invent || (filter && filter[0] !== ')' && !foo)) {
    await pline("You don't have anything to %s.", verb);
    return null;
  }
  for (;;) {
    await pline('%s what (* for list)?', verb);
    game.flags.topl = 1;  // suppress --More-- on next pline
    const iletRaw = await game.input.getKey();
    if (iletRaw === '\x1b') return null;
    if (iletRaw === '*') {
      if (!filter || foo > 1) await doinv(filter);
      else {
        for (let obj = game.invent; obj; obj = obj.nobj)
          if (!filter || filter.includes(obj.olet)) await prinv(obj);
      }
      continue;
    }
    // Convert letter to index (A-Z = 26-51, a-z = 0-25)
    let ilet;
    if (iletRaw >= 'A' && iletRaw <= 'Z') ilet = 26 + iletRaw.charCodeAt(0) - 'A'.charCodeAt(0);
    else ilet = iletRaw.charCodeAt(0) - 'a'.charCodeAt(0);
    let otmp = game.invent;
    while (otmp && ilet !== 0) { ilet--; otmp = otmp.nobj; }
    if (!otmp) { await pline(DONTH); continue; }
    if (filter && filter[0] !== ')' && !filter.includes(otmp.olet)) {
      await pline("You can't %s that.", verb); return null;
    }
    return otmp;
  }
}

// C ref: doinv() — list inventory
async function doinv(filter) {
  if (!game.invent) { await pline(EMPTY); return; }
  let i = 0;
  let lines = ['Your inventory:'];
  for (let obj = game.invent; obj; obj = obj.nobj) {
    const letter = String.fromCharCode('a'.charCodeAt(0) + i++);
    const name = doname(obj);
    let marker = '';
    if (obj === game.uwep) marker = ' (weapon in hand)';
    else if (obj === game.uarm) marker = ' (being worn)';
    else if (obj === game.uleft) marker = ' (on left hand)';
    else if (obj === game.uright) marker = ' (on right hand)';
    lines.push(`  ${letter}) ${name}${marker}`);
  }
  for (const line of lines) await pline(line);
}

// C ref: getdir() — prompt for a direction, sets game.dx/game.dy
async function getdir() {
  await pline('In what direction?');
  const ch = await game.input.getKey();
  return movecm(ch);
}

// C ref: getlin(buf) — read a line of input
async function getlin() {
  let s = '';
  for (;;) {
    const ch = await game.input.getKey();
    if (ch === '\r' || ch === '\n') break;
    if (ch === '\b' || ch === '\x7f') { s = s.slice(0, -1); continue; }
    if (ch === '\x1b') { s = ''; break; }
    s += ch;
  }
  return s;
}

// C ref: lesshungry(n) — reduce hunger (eat food)
function lesshungry(n) {
  game.u.uhunger += n;
  if (game.u.uhunger > 2000) game.u.uhunger = 2000;
}

// C ref: useup(obj) — consume one item
function useup(obj) {
  if (obj.quan > 1) { obj.quan--; return; }
  if (obj === game.invent) { game.invent = game.invent.nobj; return; }
  if (obj === game.uwep) game.uwep = null;
  if (obj === game.uarm) game.uarm = null;
  if (obj === game.uleft) game.uleft = null;
  if (obj === game.uright) game.uright = null;
  let prev = game.invent;
  while (prev && prev.nobj !== obj) prev = prev.nobj;
  if (prev) prev.nobj = obj.nobj;
}

// C ref: dodr1(obj) — actually drop an item
function dodr1(obj) {
  if (obj === game.uwep) game.uwep = null;
  if (obj === game.uarm) game.uarm = null;
  if (obj === game.uleft) { ringoff(obj); game.uleft = null; }
  if (obj === game.uright) { ringoff(obj); game.uright = null; }
  // Remove from inventory
  if (obj === game.invent) game.invent = obj.nobj;
  else { let p = game.invent; while (p && p.nobj !== obj) p = p.nobj; if (p) p.nobj = obj.nobj; }
  // Place on floor
  obj.ox = game.u.ux; obj.oy = game.u.uy;
  obj.nobj = game.fobj; game.fobj = obj;
  atl(game.u.ux, game.u.uy, obj.olet);
}

// C ref: loseone(obj,dx,dy) — fire/throw one item (separate from stack)
function loseone(obj, tdx, tdy) {
  // Place obj at final position (game.dx/dy was set by bhit)
  if (obj.quan > 1) {
    const dropped = { ...obj, nobj: null, quan: 1 };
    obj.quan--;
    dropped.ox = game.dx; dropped.oy = game.dy;
    dropped.nobj = game.fobj; game.fobj = dropped;
  } else {
    useup(obj);
    obj.ox = game.dx; obj.oy = game.dy;
    obj.nobj = game.fobj; game.fobj = obj;
  }
  if (game.levl[game.dx][game.dy].typ >= 3) atl(game.dx, game.dy, game.fobj.olet);
}

// C ref: docall(obj) — name/call an item
async function docall(obj) {
  await pline('Call it what? ');
  const name = await getlin();
  if (!name) return;
  // Store call name (simplified — just mark known)
  obj.known = true;
}

// C ref: litroom() — wand of light
function litroom() {
  if (!game.seehx) {
    // In corridor or dark room — just light player's cell
    game.levl[game.u.ux][game.u.uy].lit = true;
    return;
  }
  for (let x = game.seelx; x <= game.seehx; x++)
    for (let y = game.seely; y <= game.seehy; y++)
      game.levl[x][y].lit = true;
}

// C ref: rescham() — force all chameleons to become normal
// C: for each monster with cham flag, clears cham and calls newcham(mtmp, &mon[6][6])
// mon[6][6] is the chameleon form: {mname:'chameleon', mlet:':', mhd:6, ...}
const CHAMELEON_DATA = { mname: 'chameleon', mlet: ':', mhd: 6, mmove: 5, ac: 6, damn: 4, damd: 2 };
function rescham() {
  for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
    if (mtmp.cham) {
      mtmp.cham = false;
      newcham(mtmp, CHAMELEON_DATA);
    }
  }
}

// C ref: drink1(otmp) — drink a potion
async function drink1(otmp) {
  const typ = otmp.otyp;
  switch (typ) {
    case 0: case 1:  // restore strength
      await pline('Your muscles feel stronger.'); game.u.ustr = game.u.ustrmax; ndaminc(); game.flags.botl |= STR; break;
    case 2:  // extra healing
      game.u.uhp = Math.min(game.u.uhpmax + 4, game.u.uhpmax); await pline('You feel much better.'); game.flags.botl |= HP; break;
    case 3:  // healing
      game.u.uhp = Math.min(game.u.uhp + d(2,4), game.u.uhpmax); await pline('You feel better.'); game.flags.botl |= HP; break;
    case 4:  // gain level
      game.u.ulevel++; await pline('You feel more experienced.'); game.flags.botl |= 0xff; break;
    case 5:  // confusion
      game.u.uconfused += d(3,8); await pline('You feel confused.'); break;
    case 6:  // blindness
      game.u.ublind += d(3,8); seeoff(0); await pline('You feel a sudden darkness.'); break;
    case 7:  // gain strength
      game.u.ustr = Math.min(game.u.ustr + 1, 118); ndaminc(); await pline('You feel stronger.'); game.flags.botl |= STR; break;
    case 8:  // polymorph (STUB)
      await pline('You feel strange.'); break;
    case 9:  // speed
      game.u.ufast += rn1(10,15); await pline('You feel yourself moving faster.'); break;
    case 10: // gain strength
      game.u.ustr = Math.min(game.u.ustr + 1, 118); ndaminc(); await pline('You feel stronger.'); game.flags.botl |= STR; break;
    case 11: // levitation
      game.u.ufloat = true; await pline('You float up off the floor.'); break;
    case 12: // poison
      if (!game.u.upres) { losestr(rnd(4)); await pline('You feel weaker.'); game.flags.botl |= STR; }
      else await pline('You feel sick, but it passes.'); break;
    case 13: // see invisible
      game.u.ucinvis = true; await pline('You can see invisible things.'); break;
    case 14: // paralysis
      nomul(-rnd(10)); await pline('Your limbs stiffen.'); break;
    default:
      await pline('You feel strange.'); break;
  }
  useup(otmp);
}

// C ref: read1(otmp) — read a scroll
async function read1(otmp) {
  const typ = otmp.otyp;
  switch (typ) {
    case 0:  // enchant weapon
      if (game.uwep) { game.uwep.spe++; await pline('Your weapon glows blue.'); }
      else await pline('Nothing happens.'); break;
    case 1:  // enchant armor
      if (game.uarm) { game.uarm.spe++; game.u.uac--; game.flags.botl |= AC; await pline('Your armor glows silver.'); }
      else await pline('Nothing happens.'); break;
    case 2:  // blank paper
      await pline('This scroll seems to be blank.'); break;
    case 3:  // identify
      await pline('This is a scroll of identify.');
      for (let obj = game.invent; obj; obj = obj.nobj) obj.known = true;
      break;
    case 4:  // teleportation
      tele(); break;
    case 5:  // scare monster
      for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (Math.abs(mtmp.mx - game.u.ux) < 10 && Math.abs(mtmp.my - game.u.uy) < 10) mtmp.mstat = 1; // FLEE
      }
      await pline('Monsters flee!'); break;
    case 6:  // gold detection
      for (let g = game.fgold; g; g = g.ngen) atl(g.gx, g.gy, '$');
      await pline('You sense the presence of gold.'); break;
    case 7:  // food detection
      for (let obj = game.fobj; obj; obj = obj.nobj) if (obj.olet === '%') atl(obj.ox, obj.oy, '%');
      await pline('You sense food nearby.'); break;
    case 8:  // aggravate monsters
      for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) mtmp.mstat = 0; // MNORM
      await pline('You hear a sudden stirring.'); break;
    case 9:  // create monster
      makemon(null); if (game.fmon) mnexto(game.fmon);
      await pline('A monster materializes.'); break;
    case 10: // remove curse
      for (let obj = game.invent; obj; obj = obj.nobj) obj.cursed = false;
      await pline('You feel as if someone is helping you.'); break;
    default:
      await pline('Nothing happens.'); break;
  }
  useup(otmp);
}

// C ref: rhack(cmd) — main command dispatcher
export async function rhack(cmd) {
  if (movecm(cmd)) {
    if (game.multi) game.flags.mv = 1;
    await domove();
    return;
  }
  // Uppercase run-direction
  const lower = String.fromCharCode(cmd.charCodeAt(0) + 0x20);
  if (movecm(lower)) {
    game.flags.mv = 2; game.multi += 80; await domove(); return;
  }

  switch (cmd) {
    case 's': await dosearch(); break;
    case 'e': {
      const otmp = await getobj('%', 'eat');
      if (!otmp) { game.multi = game.flags.move = 0; return; }
      if (otmp.otyp) { await pline('That was a delicious fruit.'); lesshungry(100); }
      else { await pline('That really hit the spot!'); lesshungry(900); game.multi = -5; }
      useup(otmp); break;
    }
    case 'Q': await done1(); break;
    case 'q': {
      const otmp = await getobj('!', 'drink');
      if (!otmp) { game.multi = game.flags.move = 0; }
      else await drink1(otmp);
      break;
    }
    case 'w': {
      game.multi = 0;
      if (game.uwep && game.uwep.cursed) { await pline(CURSED); break; }
      const otmp = await getobj(')', 'wield');
      if (!otmp) { game.flags.move = false; break; }
      if (otmp.olet === '[') { await pline("You can't wield armor."); game.flags.move = false; break; }
      game.uwep = otmp; await prinv(otmp); break;
    }
    case 'r': {
      const otmp = await getobj('?', 'read');
      if (!otmp) { game.multi = game.flags.move = 0; }
      else await read1(otmp); break;
    }
    case '\x0c':  // ^L — redraw
      await docrt(); game.multi = game.flags.move = 0; break;
    case 'i':
      if (!game.invent) await pline(EMPTY);
      else await doinv(null);
      game.flags.move = game.multi = 0; break;
    case 'c': {
      const otmp = await getobj('?!=//', 'call');
      if (otmp) await docall(otmp);
      game.flags.move = 0; break;
    }
    case '>':
      if (game.u.ustuck || game.u.ux !== game.xdnstair || game.u.uy !== game.ydnstair) {
        await pline("You can't go down now."); game.flags.move = game.multi = 0; return;
      }
      await movemon(); seeoff(1); await dodown(); setsee(); await docrt(); break;
    case '<':
      if (game.u.ustuck || game.u.ux !== game.xupstair || game.u.uy !== game.yupstair) {
        await pline("You can't go up now."); game.flags.move = game.multi = 0; return;
      }
      await movemon(); seeoff(1); await doup(); setsee(); await docrt(); break;
    case ' ': break;
    case 't': {
      const otmp = await getobj(')', 'throw');
      if (!otmp || !await getdir()) { game.flags.move = game.multi = 0; return; }
      if (otmp === game.uarm || otmp === game.uleft || otmp === game.uright) {
        await pline(WEARI); return;
      }
      if (otmp === game.uwep) { if (otmp.cursed) { await pline(CURSED); return; } game.uwep = null; }
      const range = otmp.olet === ')' ? 6 : 5;
      const mtmp = bhit(game.dx, game.dy, range);
      const sx = game.dx, sy = game.dy;
      loseone(otmp, sx, sy);
      if (mtmp) { await amon(mtmp, otmp, -4); if (mtmp.mhp < 1) newsym(sx, sy); }
      else newsym(sx, sy);
      break;
    }
    case 'd': {
      const otmp = await getobj(null, 'drop');
      if (!otmp) { game.multi = game.flags.move = 0; return; }
      if (otmp.quan > 1) {
        await pline('Drop how many? (%d max)?', otmp.quan);
        const s = await getlin();
        const num = parseInt(s);
        if (!num || num < 1 || num > otmp.quan) { await pline("You can't drop that many!"); game.multi = game.flags.move = 0; return; }
        if (num !== otmp.quan) {
          const dropped = { ...otmp, nobj: null, quan: num };
          otmp.quan -= num;
          dropped.ox = game.u.ux; dropped.oy = game.u.uy;
          dropped.nobj = game.fobj; game.fobj = dropped;
        } else dodr1(otmp);
      } else dodr1(otmp);
      await pline('You dropped %s', doname(game.fobj));
      break;
    }
    case 'p': {
      const otmp = await getobj('/', 'zap');
      if (!otmp) { game.flags.move = game.multi = 0; return; }
      if (!otmp.spe) { await pline(NOTHIN); return; }
      if (otmp.otyp < 3) {
        otmp.spe--;
        switch (otmp.otyp) {
          case 0: litroom(); break;
          case 1: await pline('What a strange wand!'); break;  // SMALL mode
          case 2: makemon(null); if (game.fmon) mnexto(game.fmon); break;
        }
        return;
      }
      if (!await getdir()) return;
      otmp.spe--;
      if (otmp.otyp < 10) {
        const htmp = bhit(game.dx, game.dy, rn1(8,6));
        if (htmp) {
          if (otmp.otyp === 3) { // striking
            if (rnd(20) < 10 + htmp.data.ac) { await hit('wand', htmp); htmp.mhp -= d(2,12); if (htmp.mhp < 1) await killed(htmp); }
            else await miss('wand', htmp);
          } else {
            switch (otmp.otyp) {
              case 4: htmp.mspeed = 2; break;  // MSLOW
              case 5: htmp.mspeed = 3; break;  // MFAST
              case 6: if ('WVZ&'.includes(htmp.data.mlet)) { htmp.mhp -= rnd(8); if (htmp.mhp < 1) await killed(htmp); else htmp.mstat = 1; } break;
              case 7: newcham(htmp, mon[rn2(8)][rn2(7)]); break;
              case 8: htmp.mcan = true; break;
              case 9: rloc(htmp); break;
            }
          }
        }
      } else await buzz(otmp.otyp - 11, game.u.ux, game.u.uy, game.dx, game.dy);
      break;
    }
    case 'W': {
      game.multi = 0;
      if (game.uarm) { game.flags.move = false; await pline('Already wearing armor.'); return; }
      const otmp = await getobj('[', 'wear');
      if (!otmp) { game.flags.move = false; break; }
      game.uarm = otmp; nomul(-3); otmp.known = true;
      game.u.uac -= otmp.otyp;
      if (otmp.minus) game.u.uac += otmp.spe; else game.u.uac -= otmp.spe;
      game.flags.botl |= AC; await prinv(game.uarm); break;
    }
    case 'P': {
      if (game.uleft && game.uright) { await pline('You are wearing two rings.'); game.flags.move = 0; break; }
      const otmp = await getobj('=', 'wear');
      if (!otmp) { game.flags.move = 0; break; }
      if (otmp === game.uleft || otmp === game.uright) { await pline('You are already wearing that.'); game.flags.move = 0; break; }
      if (game.uleft) game.uright = otmp;
      else if (game.uright) game.uleft = otmp;
      else {
        let side;
        do {
          await pline('Right or Left? ');
          side = await game.input.getKey();
          if (side === '\x1b') { game.flags.move = 0; return; }
        } while (!'rl'.includes(side));
        if (side === 'l') game.uleft = otmp; else game.uright = otmp;
      }
      // Apply ring effects
      applyRingOn(otmp); await prinv(otmp); break;
    }
    case 'R': {
      const otmp = game.uleft || game.uright;
      if (!otmp) { await pline('You have no rings to remove.'); game.flags.move = 0; break; }
      if (otmp.cursed) { await pline(CURSED); game.flags.move = 0; break; }
      ringoff(otmp);
      if (game.uleft === otmp) game.uleft = null; else game.uright = null;
      await pline('You remove %s', doname(otmp)); break;
    }
    case 'T': {
      if (!game.uarm) { await pline("You aren't wearing armor."); game.flags.move = 0; break; }
      if (game.uarm.cursed) { await pline(CURSED); game.flags.move = 0; break; }
      const otmp = game.uarm;
      game.u.uac += otmp.otyp;
      if (otmp.minus) game.u.uac -= otmp.spe; else game.u.uac += otmp.spe;
      game.uarm = null; nomul(-3); game.flags.botl |= AC; break;
    }
    case 'S': await dosave(); break;
    default:
      await pline('Unknown command: %s', cmd); game.flags.move = false; break;
  }
}

function applyRingOn(otmp) {
  switch (otmp.otyp) {
    case 1: game.u.utel = true; break;
    case 2: game.u.uregen = true; break;
    case 3: game.u.usearch = 1; break;
    case 4: game.u.ucinvis = true; break;
    case 5: game.u.ustelth = true; break;
    case 6: game.u.ufloat = true; break;
    case 7: game.u.upres = true; break;
    case 8: game.u.uagmon = true; break;
    case 9: game.u.ufeed = true; break;
    case 10: game.u.ufireres = true; break;
    case 11: game.u.ucoldres = true; break;
    case 12: game.u.ucham = true; break;
    case 14: ndaminc(); break;
    case 15:
      if (otmp.minus) game.u.uac += otmp.spe; else game.u.uac -= otmp.spe;
      game.flags.botl |= AC; break;
    case 16:
      game.u.uhp += otmp.minus ? -otmp.spe : otmp.spe;
      game.u.uhpmax += otmp.minus ? -otmp.spe : otmp.spe;
      game.flags.botl |= HP | 8; break;
  }
}

// Helper re-exports needed by main.js
export { lesshungry as lesshungry_export };
export { useup as useup_export };
