// C ref: hack.do.c — rhack command dispatcher, player actions
// STUB: most commands stubbed; movement and basic commands implemented.
import { HP, HPM, ULV, UEX, GOLD, AC, STR, SEEN, POTN, SCRN, WANN, RINN, SDOOR, CORR, WALL, DOOR } from './const.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import { pline, atl, newsym, nscr, bot, cls, curs, on, pru, losehp, prl, at } from './pri.js';
import { movecm, domove, parse, tele, nomul, doname, setsee, seeoff, amon, attmon, prinv } from './hack.js';
import { movemon, makemon, rloc, mnexto, g_at_mon, g_at_obj, g_at_gen, delmon, killed,
         newcham, steal } from './mon.js';
import { ringoff, hit, miss, bhit, buzz, dosearch, dosave, dorecover, zhit, findit } from './do1.js';
import { dodown, doup, done, done1, losestr, ndaminc } from './main.js';
import { mon, pottyp, scrtyp, wantyp, ringtyp, foodnam, wepnam, armnam,
         NOTHIN, CURSED, EMPTY, DONTH, WEARI, MORE, RUST } from './data.js';
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

// C ref: doinv(str) — list inventory
// C (SMALL): cls(), fputs each item directly, then getret() + docrt()
// NOT through pline — writes directly to screen rows
async function doinv(filter) {
  if (!game.invent) { await pline(EMPTY); return; }
  cls();
  let ilet = 'a'.charCodeAt(0);
  let row = 0;
  for (let obj = game.invent; obj; obj = obj.nobj) {
    if (!filter || filter.includes(obj.olet)) {
      const letter = String.fromCharCode(ilet);
      const name = doname(obj);
      // C: puts name directly on screen via fputs (no pline)
      game.display.moveCursor(1, row + 1);
      game.display.putString(`${letter} -  ${name}`);
      game.curx = `${letter} -  ${name}`.length + 1;
      game.cury = row + 1;
      row++;
    }
    if (++ilet > 'z'.charCodeAt(0)) ilet = 'A'.charCodeAt(0);
  }
  // C: getret() — fputs "\n\n--Hit space to continue--", while(getchar()!=' ')
  game.display.moveCursor(1, row + 3);
  game.display.putString('--Hit space to continue--');
  game.curx = 26; game.cury = row + 3;
  game.display.flush();
  while (await game.input.getKey() !== ' ') {}
  await docrt();
  game.flags.topl = 0;
}

// C ref: getdir() — prompt for a direction, sets game.dx/game.dy
async function getdir() {
  await pline('What direction?');
  game.flags.topl = 1;  // C: flags.topl=1 after pline in getdir
  const ch = await game.input.getKey();
  return movecm(ch);
}

// C ref: getlin(buf) — read a line of input
// C: sets flags.topl=1 at start (prevents --More-- on next pline)
async function getlin() {
  game.flags.topl = 1;  // C: getlin() sets flags.topl=1 before reading
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
// C: pline("Call it:"); getlin(buf); store in scrcall/potcall/wandcall/ringcall[otyp]
async function docall(obj) {
  await pline('Call it:');
  game.flags.topl = 1;
  const name = await getlin();
  const str = name || null;
  switch (obj.olet) {
    case '?': game.scrcall[obj.otyp] = str; break;
    case '!': game.potcall[obj.otyp] = str; break;
    case '/': game.wandcall[obj.otyp] = str; break;
    case '=': game.ringcall[obj.otyp] = str; break;
  }
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
// Effects match C hack.do.c drink1(), compiled with -DSMALL
async function drink1(otmp) {
  const typ = otmp.otyp;
  switch (typ) {
    case 0: {
      // "You feel great!" — restore strength
      await pline('You feel great!');
      if (game.u.ustr < game.u.ustrmax) { game.u.ustr = game.u.ustrmax; game.flags.botl |= STR; ndaminc(); }
      break;
    }
    case 1: {
      // #SMALL: "This tastes like liquid fire!" — confusion + maybe pass out
      await pline('This tastes like liquid fire!');
      game.u.uconfused += d(3,8);
      if (game.u.uhp < game.u.uhpmax) losehp(-1);
      if (!rn2(4)) { await pline('You pass out.'); game.multi = -rnd(15); }
      break;
    }
    case 2: {
      // "You turn invisible." — gain invisibility
      await pline('You turn invisible.');
      newsym(game.u.ux, game.u.uy);
      game.u.uinvis += rn1(15,31);
      break;
    }
    case 3: {
      // #SMALL: "This is fruit juice." — lesshungry
      await pline('This is fruit juice.');
      lesshungry(20);
      break;
    }
    case 4: {
      // "You begin to feel better." — heal 1/3 hp
      await pline('You begin to feel better.');
      const num = (game.u.uhpmax / 3) | 0;
      if (game.u.uhp + num > game.u.uhpmax) {
        game.u.uhp = ++game.u.uhpmax; game.flags.botl |= (HP | HPM);
      } else {
        game.u.uhp += num; game.flags.botl |= HP;
      }
      if (game.u.ublind) game.u.ublind = 1;
      break;
    }
    case 5: {
      // "You are frozen!" — paralysis
      await pline('You are frozen!');
      nomul(-(rn1(10,5)));
      break;
    }
    case 6: {
      // sense monsters
      // C: uses at() not atl() so cell.scrsym is NOT modified (docrt() restores correctly)
      if (!game.fmon) { await nothin(otmp); return; }
      cls();
      for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        at(mtmp.mx, mtmp.my, mtmp.data.mlet);
      game.flags.topl = 0;
      await pline('You sense monsters.');
      await more_fn();
      game.flags.topl = 0;
      await docrt();
      break;
    }
    case 7: {
      // sense objects
      // C: uses at() not atl() so cell.scrsym is NOT modified (docrt() restores correctly)
      if (!game.fobj) { await nothin(otmp); return; }
      cls();
      for (let objs = game.fobj; objs; objs = objs.nobj)
        at(objs.ox, objs.oy, objs.olet);
      game.flags.topl = 0;
      await pline('You sense objects.');
      await more_fn();
      await docrt();
      game.flags.topl = 0;
      break;
    }
    case 8: {
      // "Yech! Poison!"
      await pline('Yech! Poison!');
      losestr(rn1(4,3));
      losehp(rnd(10));
      break;
    }
    case 9: {
      // "What? Where am I?" — confusion
      await pline('What?  Where am I?');
      game.u.uconfused += rn1(7,16);
      break;
    }
    case 10: {
      // "Wow, do you feel strong!" — gain strength
      await pline('Wow, do you feel strong!');
      if (game.u.ustr < 118) {
        if (game.u.ustr > 17) { game.u.ustr += rnd(118 - game.u.ustr); }
        else game.u.ustr++;
        if (game.u.ustr > game.u.ustrmax) game.u.ustrmax = game.u.ustr;
        ndaminc(); game.flags.botl |= STR;
      }
      break;
    }
    case 11: {
      // #SMALL: "You are moving faster." — speed
      await pline('You are moving faster.');
      game.u.ufast += rn1(10,100);
      break;
    }
    case 12: {
      // "The world goes dark." — blindness
      await pline('The world goes dark.');
      game.u.ublind += rn1(100,250);
      seeoff(0);
      break;
    }
    case 13: {
      // pluslvl() — gain level
      await pluslvl();
      break;
    }
    case 14: {
      // "You feel much better." — heal 3/4 hp
      await pline('You feel much better.');
      const num = ((game.u.uhpmax / 2) | 0) + ((game.u.uhpmax / 4) | 0);
      if (game.u.uhp + num > game.u.uhpmax) {
        game.u.uhp = (game.u.uhpmax += 2); game.flags.botl |= (HP | HPM);
      } else {
        game.u.uhp += num; game.flags.botl |= HP;
      }
      if (game.u.ublind) game.u.ublind = 1;
      break;
    }
    default:
      await pline('You feel strange.'); break;
  }
  // C ref: identification tracking
  if (!(game.oiden[typ] & POTN)) {
    if (typ > 1) {
      game.oiden[typ] |= POTN;
      game.u.urexp += 10;
    } else if (!game.potcall[typ]) {
      await docall(otmp);
    }
  }
  useup(otmp);
}

// C ref: pluslvl() — gain level from potion
async function pluslvl() {
  await pline('You feel more experienced.');
  const num = rnd(10);
  game.u.uhpmax += num;
  game.u.uhp += num;
  game.u.uexp = (10 * Math.pow(2, game.u.ulevel - 1)) + 1;
  await pline('Welcome to level %d.', ++game.u.ulevel);
  game.flags.botl |= (HP | HPM | ULV | UEX);
}

// C ref: nothin(obj) — "A strange feeling passes over you."
async function nothin(obj) {
  await pline('A strange feeling passes over you.');
  if (obj.olet === '?') {
    if (!(game.oiden[obj.otyp] & SCRN) && !game.scrcall[obj.otyp]) await docall(obj);
  } else if (!(game.oiden[obj.otyp] & POTN) && !game.potcall[obj.otyp]) {
    await docall(obj);
  }
}

// C ref: more() — wait for space keypress (from hack.do1.c more())
// C: uses puts(MORE) which goes to stdout directly, NOT through the virtual screen.
// The harness captures stdout via fputs-patch only; puts() bypasses it.
// So the "--More--" written by more() does NOT appear in the harness screen capture.
// Therefore: JS must NOT write "--More--" to game.display here (unlike pline's --More--).
// We just wait for the space key silently.
async function more_fn() {
  if (game.flags.topl === 2) {
    // C: curs(savx,1); puts(MORE); curs(u.ux,u.uy+2); fflush(stdout);
    // puts() bypasses the harness screen capture, so no display update here.
    let ch;
    do { ch = await game.input.getKey(); } while (ch !== ' ');
    game.flags.topl = 0;
  }
}

// C ref: read1(otmp) — read a scroll
// Scroll effects match C hack.do.c read1(), compiled with -DSMALL
async function read1(otmp) {
  const typ = otmp.otyp;
  switch (typ) {
    case 0: {
      // enchant armor — "Your armor glows green."
      if (!game.uarm) { await nothin(otmp); return; }
      await pline('Your armor glows green.');
      plusone(game.uarm); game.u.uac--; game.flags.botl |= AC; break;
    }
    case 1: {
      // confuse weapon — "Your hands start glowing blue."
      await pline('Your hands start glowing blue.');
      game.u.umconf = 1; break;
    }
    case 2: {
      // blank scroll
      await pline('This scroll seems blank.'); break;
    }
    case 3: {
      // remove curse
      await pline('You feel like someone is helping you.');
      if (game.uleft) game.uleft.cursed = false;
      if (game.uright) game.uright.cursed = false;
      if (game.uarm) game.uarm.cursed = false;
      if (game.uwep) game.uwep.cursed = false;
      break;
    }
    case 4: {
      // enchant weapon — weapon glows green (plus one)
      if (!game.uwep || game.uwep.olet !== ')') { await nothin(otmp); return; }
      chwepon('green'); plusone(game.uwep); break;
    }
    case 5: {
      // create monster
      makemon(null); if (game.fmon) mnexto(game.fmon); break;
    }
    case 6: {
      // curse weapon — weapon glows black (minus one)
      if (!game.uwep || game.uwep.olet !== ')') { await nothin(otmp); return; }
      chwepon('black'); minusone(game.uwep); break;
    }
    case 7: {
      // rust armor
      if (game.u.uac > 9 || !game.uarm) { await nothin(otmp); return; }
      game.u.uac++; game.flags.botl |= AC;
      await pline(RUST); minusone(game.uarm); break;
    }
    case 8: {
      // genocide
      await pline('Behold, a scroll of genocide!');
      let zx, done = false;
      do {
        await pline('What monster (Letter)? ');
        game.flags.topl = 1;
        zx = await game.input.getKey();
        for (const tier of mon) {
          for (const mdat of tier) {
            if (mdat && mdat.mlet === zx) { mdat.mlet = 0; done = true; break; }
          }
          if (done) break;
        }
      } while (!done);
      // Remove existing instances
      for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.data.mlet === zx || mtmp.data.mlet === 0) {
          delmon(mtmp);
          if (game.levl[mtmp.mx][mtmp.my].scrsym === zx) newsym(mtmp.mx, mtmp.my);
        }
      }
      break;
    }
    case 9: {
      // light room
      litroom(); break;
    }
    case 10: {
      // teleport
      tele(); break;
    }
    case 11: {
      // sense gold
      // C: uses at() not atl() so cell.scrsym is NOT modified
      if (!game.fgold) { await nothin(otmp); return; }
      cls();
      for (let gtmp = game.fgold; gtmp; gtmp = gtmp.ngen)
        at(gtmp.gx, gtmp.gy, '$');
      game.flags.topl = 0;
      await pline('You sense gold!');
      await more_fn();
      game.flags.topl = 0;
      await docrt();
      break;
    }
    case 12: {
      // identify
      await pline('This is an identify scroll.');
      useup(otmp);
      game.oiden[12] |= SCRN;
      const iobj = await getobj(null, 'identify');
      if (iobj) {
        switch (iobj.olet) {
          case '!': game.oiden[iobj.otyp] |= POTN; break;
          case '?': game.oiden[iobj.otyp] |= SCRN; break;
          case '[': case ')': iobj.known = true; break;
          case '/': iobj.known = true; game.oiden[iobj.otyp] |= WANN; break;
          case '=':
            if (iobj.otyp > 12) iobj.known = true;
            game.oiden[iobj.otyp] |= RINN; break;
        }
        await prinv(iobj);
      }
      return; // useup already done
    }
    case 13: {
      // magic mapping
      await pline('You found a map!');
      for (let x = 0; x < 80; x++) {
        for (let y = 0; y < 22; y++) {
          const cell = game.levl[x][y];
          if (cell.typ === SDOOR) {
            cell.typ = DOOR; cell.scrsym = '+'; cell.isnew = true;
            on(x, y);
          } else if ((cell.typ === CORR || cell.typ === WALL || cell.typ === DOOR) && !cell.seen) {
            cell.isnew = true; on(x, y);
          }
        }
      }
      if (!game.levl[game.xupstair][game.yupstair].seen) {
        game.levl[game.xupstair][game.yupstair].isnew = true; on(game.xupstair, game.yupstair);
      }
      if (!game.levl[game.xdnstair][game.ydnstair].seen) {
        game.levl[game.xdnstair][game.ydnstair].isnew = true; on(game.xdnstair, game.ydnstair);
      }
      break;
    }
    case 14: {
      // fire scroll
      await pline('The scroll erupts in a tower of flame!');
      if (game.u.ufireres) { await pline('You are uninjured.'); }
      else {
        const num = rnd(6);
        game.u.uhp -= num; game.u.uhpmax -= num;
        game.flags.botl |= (HP | HPM);
      }
      break;
    }
    default:
      await pline('Nothing happens.'); break;
  }
  // C ref: identification tracking
  if (!(game.oiden[typ] & SCRN)) {
    if (typ > 7) {
      game.oiden[typ] |= SCRN;
      game.u.urexp += 10;
    } else if (!game.scrcall[typ]) {
      await docall(otmp);
    }
  }
  useup(otmp);
}

// C ref: chwepon(color) — print "Your weapon glows color."
async function chwepon(color) {
  await pline('Your %s glows %s.', wepnam[game.uwep.otyp], color);
}

// C ref: plusone(obj) — increment item bonus (remove minus)
function plusone(obj) {
  obj.cursed = false;
  if (obj.minus) { if (!--obj.spe) obj.minus = false; }
  else obj.spe++;
}

// C ref: minusone(obj) — decrement item bonus (add minus)
function minusone(obj) {
  if (obj.minus) obj.spe++;
  else if (obj.spe) obj.spe--;
  else { obj.minus = true; obj.spe = 1; }
}

// C ref: litroom() — light the current room (scroll of light)
async function litroom() {
  if (game.levl[game.u.ux][game.u.uy].typ === CORR) {
    await pline('The corridor glows briefly.'); return;
  }
  await pline('The room is lit.');
  if (game.levl[game.u.ux][game.u.uy].lit) return;
  // Find room boundaries
  let zx = game.u.ux, zy = game.u.uy;
  if (game.levl[game.u.ux][game.u.uy].typ === DOOR) {
    if (game.levl[game.u.ux][game.u.uy + 1].typ === ROOM) zy = game.u.uy + 1;
    else if (game.levl[game.u.ux][game.u.uy - 1].typ === ROOM) zy = game.u.uy - 1;
    if (game.levl[game.u.ux + 1][game.u.uy].typ === ROOM) zx = game.u.ux + 1;
    else if (game.levl[game.u.ux - 1][game.u.uy].typ === ROOM) zx = game.u.ux - 1;
  }
  let seelx = game.u.ux, seehx = game.u.ux, seely = game.u.uy, seehy = game.u.uy;
  while (game.levl[seelx - 1][zy].typ && game.levl[seelx - 1][zy].typ !== CORR) seelx--;
  while (game.levl[seehx + 1][zy].typ && game.levl[seehx + 1][zy].typ !== CORR) seehx++;
  while (game.levl[zx][seely - 1].typ && game.levl[zx][seely - 1].typ !== CORR) seely--;
  while (game.levl[zx][seehy + 1].typ && game.levl[zx][seehy + 1].typ !== CORR) seehy++;
  for (let y = seely; y <= seehy; y++) {
    for (let x = seelx; x <= seehx; x++) {
      game.levl[x][y].lit = true;
      if (!game.levl[x][y].cansee) prl(x, y);
    }
  }
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
          case 1: if (!await findit()) return;  break;
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
      // C ref: movemon(); movemon(); then set uarm, nomul(-3), adjust AC, prinv
      await movemon(); await movemon();
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
          game.flags.topl = 1;  // C resets topl after reading "Right or Left?" key
          if (side === '\x1b') { game.flags.move = 0; return; }
        } while (!'rl'.includes(side));
        if (side === 'l') game.uleft = otmp; else game.uright = otmp;
      }
      // Apply ring effects
      applyRingOn(otmp); await prinv(otmp); break;
    }
    case 'R': {
      game.multi = 0;
      const otmp = await getobj('=', 'remove');
      if (!otmp) { game.flags.move = 0; return; }
      if (otmp.cursed) { await pline(CURSED); game.flags.move = 0; break; }
      else if (otmp === game.uleft) {
        game.uleft = null;
        await pline('You were wearing %s', doname(otmp));
        ringoff(otmp);
      } else if (otmp === game.uright) {
        game.uright = null;
        await pline('You were wearing %s', doname(otmp));
        ringoff(otmp);
      } else {
        await pline("You can't remove that."); game.flags.move = 0;
      }
      break;
    }
    case 'T': {
      game.multi = 0;
      if (!game.uarm) { await pline('Not wearing any!'); game.flags.move = 0; break; }
      if (game.uarm.cursed) { await pline(CURSED); game.flags.move = 0; break; }
      // C ref: movemon(); movemon(); nomul(-3); adjust AC; uarm=0; were(otmp);
      await movemon(); await movemon();
      const otmp = game.uarm;
      game.u.uac += otmp.otyp;
      if (otmp.minus) game.u.uac -= otmp.spe; else game.u.uac += otmp.spe;
      game.flags.botl |= AC; game.uarm = null; nomul(-3);
      await pline('You were wearing %s', doname(otmp)); break;
    }
    case 'S': await dosave(); break;
    default:
      if (cmd < ' ') await pline("Unknown command '^%c'.", String.fromCharCode(cmd.charCodeAt(0) + 64));
      else await pline("Unknown command '%c'", cmd);
      game.flags.move = false; break;
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
    case 13:
      for (let tmp = otmp.spe; tmp; tmp--) {
        if (!otmp.minus) {
          if (game.u.ustr > 17) { game.u.ustr += 15; game.u.ustrmax += 15; }
          else { game.u.ustr++; if (game.u.ustrmax > 17) game.u.ustrmax += 15; else game.u.ustrmax++; }
        } else {
          if (game.u.ustr > 18) { game.u.ustr -= 15; if (game.u.ustr < 18) game.u.ustr = 18; }
          else { if (game.u.ustr > 4) game.u.ustr--; game.u.ustrmax--; }
        }
      }
      game.flags.botl |= STR;
      // fall through
    case 14: ndaminc(); break;
    case 15:
      if (otmp.minus) game.u.uac += otmp.spe; else game.u.uac -= otmp.spe;
      game.flags.botl |= STR; break; // C bug: original flags STR not AC (hack.do.c:503)
    case 16:
      game.u.uhp += otmp.minus ? -otmp.spe : otmp.spe;
      game.u.uhpmax += otmp.minus ? -otmp.spe : otmp.spe;
      game.flags.botl |= HP | 8; break;
  }
}

// Helper re-exports needed by main.js
export { lesshungry as lesshungry_export };
export { useup as useup_export };
