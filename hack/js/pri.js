// C ref: hack.pri.c — display and message functions
import { CORR, DOOR, ROOM, SDOOR, WALL } from './const.js';
import { game } from './gstate.js';

// Forward declarations (functions defined in mon.js / hack.js imported at call time)
// We use dynamic imports to break circular dependencies.
let _g_at, _newsym_fn, _setsee_fn;
export function _setPriDeps(g_at, newsym, setsee) {
  _g_at = g_at; _newsym_fn = newsym; _setsee_fn = setsee;
}

// C ref: curs(x,y) — move terminal cursor to (x,y), 1-based
export function curs(x, y) {
  const disp = game.display;
  if (y === game.cury && x === game.curx) return;
  disp.moveCursor(x, y);
  game.curx = x;
  game.cury = y;
}

// C ref: cls() — clear screen, cursor to (1,1)
export function cls() {
  game.display.clearScreen();
  game.curx = game.cury = 1;
  game.flags.topl = 0;
}

// C ref: home() — cursor to (1,1)
export function home() {
  curs(1, 1);
}

// C ref: on(x,y) — mark dirty region
export function on(x, y) {
  if (game.flags.dscr) {
    if (x < game.scrlx) game.scrlx = x;
    else if (x > game.scrhx) game.scrhx = x;
    if (y < game.scrly) game.scrly = y;
    else if (y > game.scrhy) game.scrhy = y;
  } else {
    game.flags.dscr = true;
    game.scrlx = game.scrhx = x;
    game.scrly = game.scrhy = y;
  }
}

// C ref: atl(x,y,ch) — set map cell char, mark new/dirty
export function atl(x, y, ch) {
  const cell = game.levl[x][y];
  cell.scrsym = ch;
  cell.isnew = true;
  on(x, y);
}

// C ref: at(x,y,ch) — put char on screen at map position (x, y+2 on screen)
export function at(x, y, ch) {
  if (!ch) return;
  const sy = y + 2;  // map rows start at screen row 2+1=3 (C: y+2, 1-based)
  curs(x, sy);
  game.display.putCharAtCursor(typeof ch === 'number' ? String.fromCharCode(ch) : ch);
  game.curx++;
}

// C ref: swallowed() — draw swallow animation
export function swallowed() {
  cls();
  curs(game.u.ux - 1, game.u.uy + 1 + 2);
  game.display.putString('/-\\'); game.curx += 3;
  curs(game.u.ux - 1, game.u.uy + 2 + 2);
  game.display.putString('|@|'); game.curx += 3;
  curs(game.u.ux - 1, game.u.uy + 3 + 2);
  game.display.putString('\\-/'); game.curx += 3;
}

// C ref: docrt() — redraw entire screen
export async function docrt() {
  if (game.u.uswallow) { swallowed(); }
  else {
    cls();
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 80; x++) {
        const cell = game.levl[x][y];
        if (cell.isnew) {
          cell.isnew = false;
          at(x, y, cell.scrsym);
          if (cell.scrsym === ' ') {
            cell.seen = false; cell.scrsym = '.';
          } else cell.seen = true;
        } else if (cell.seen) at(x, y, cell.scrsym);
      }
    }
    game.scrlx = 80; game.scrly = 22;
    game.flags.dscr = game.scrhx = game.scrhy = 0;
  }
  game.flags.botl = 1;
  bot();
}

// C ref: pru() — draw player '@' if visible
export function pru() {
  if (!game.u.ublind) game.levl[game.u.ux][game.u.uy].cansee = true;
  if (game.u.uinvis) prl(game.u.ux, game.u.uy);
  else if (game.levl[game.u.ux][game.u.uy].scrsym !== '@')
    atl(game.u.ux, game.u.uy, '@');
}

// C ref: prl(x,y) — draw one cell (with monster check)
export function prl(x, y) {
  const cell = game.levl[x][y];
  cell.cansee = true;
  if (!cell.typ || (cell.typ < DOOR && game.levl[game.u.ux][game.u.uy].typ === CORR)) return;
  const mtmp = _g_at ? _g_at(x, y, game.fmon) : null;
  if (mtmp && (!mtmp.invis || game.u.ucinvis)) {
    atl(x, y, mtmp.data.mlet);
  } else if (!cell.seen) {
    cell.isnew = true;
    on(x, y);
  }
}

// C ref: newsym(x,y) — compute and draw correct symbol for cell
export function newsym(x, y) {
  const cell = game.levl[x][y];
  let tmp;
  const otmp = _g_at ? _g_at(x, y, game.fobj) : null;
  if (otmp) { tmp = otmp.olet; }
  else {
    const gtmp = _g_at ? _g_at(x, y, game.fgold) : null;
    if (gtmp) { tmp = '$'; }
    else {
      const trap = _g_at ? _g_at(x, y, game.ftrap) : null;
      if (trap && (trap.gflag & 32)) { tmp = '^'; }  // SEEN = 32
      else {
        switch (cell.typ) {
          case SDOOR: case WALL:
            // C: check levl[x-1][y] and levl[x+1][y] for non-corr walls
            tmp = (x > 0 && game.levl[x-1][y].typ && game.levl[x-1][y].typ !== CORR &&
                   x < 79 && game.levl[x+1][y].typ && game.levl[x+1][y].typ !== CORR)
                  ? '|' : '-';
            break;
          case DOOR: tmp = '+'; break;
          case ROOM:
            if (x === game.xupstair && y === game.yupstair) tmp = '<';
            else if (x === game.xdnstair && y === game.ydnstair) tmp = '>';
            else if (cell.lit || cell.cansee || game.u.ublind) tmp = '.';
            else tmp = ' ';
            break;
          case CORR:
            if (x === game.xupstair && y === game.yupstair) tmp = '<';
            else tmp = '#';
            break;
          default: tmp = '`';
        }
      }
    }
  }
  atl(x, y, tmp);
}

// C ref: nosee(x,y)
export function nosee(x, y) {
  const cell = game.levl[x][y];
  cell.cansee = false;
  const mtmp = _g_at ? _g_at(x, y, game.fmon) : null;
  if (mtmp && mtmp.mstat < 2 && cell.scrsym === mtmp.data.mlet) { // SLEEP=2
    newsym(x, y); return;
  }
  if (cell.scrsym === '.' && !cell.lit && !game.u.ublind) {
    if (cell.isnew && (x !== game.oldux || y !== game.olduy)) cell.isnew = false;
    else { cell.scrsym = ' '; cell.isnew = true; on(x, y); }
  }
}

// C ref: prl1(x,y) — draw cells in direction of movement
export function prl1(x, y) {
  const dx = game.dx, dy = game.dy;
  if (dx) {
    if (dy) {
      prl(x - 2*dx, y); prl(x - dx, y); prl(x, y);
      prl(x, y - dy); prl(x, y - 2*dy);
    } else { prl(x, y-1); prl(x, y); prl(x, y+1); }
  } else { prl(x-1, y); prl(x, y); prl(x+1, y); }
}

// C ref: nose1(x,y) — hide cells in opposite direction
export function nose1(x, y) {
  const dx = game.dx, dy = game.dy;
  if (dx) {
    if (dy) {
      nosee(x, game.u.uy); nosee(x, game.u.uy - dy); nosee(x, y);
      nosee(game.u.ux - dx, y); nosee(game.u.ux, y);
    } else { nosee(x, y-1); nosee(x, y); nosee(x, y+1); }
  } else { nosee(x-1, y); nosee(x, y); nosee(x+1, y); }
}

// C ref: nscr() — update dirty screen region
export function nscr() {
  if (game.u.uswallow) return;
  for (let y = game.scrly; y <= game.scrhy; y++) {
    for (let x = game.scrlx; x <= game.scrhx; x++) {
      const cell = game.levl[x][y];
      if (cell.isnew) {
        cell.isnew = false;
        at(x, y, cell.scrsym);
        if (cell.scrsym === ' ') { cell.cansee = cell.seen = false; cell.scrsym = '.'; }
        else cell.seen = true;
      }
    }
  }
  game.flags.dscr = game.scrhx = game.scrhy = 0;
  game.scrlx = 80; game.scrly = 22;
  // NOTE: C's nscr() does NOT reset flags.topl — only parse() does, after screen capture
}

// C ref: pmon(mon) — draw a monster if visible
export function pmon(mtmp) {
  if (!mtmp.invis || game.u.ucinvis)
    atl(mtmp.mx, mtmp.my, mtmp.data.mlet);
}

// C ref: prustr() — print strength (handles 18/xx format)
export function prustr() {
  const str = game.u.ustr;
  let s;
  if (str > 117) s = '18/00';
  else if (str > 18) s = '18/' + String(str - 18).padStart(2, '0');
  else s = String(str).padEnd(5, ' ');
  game.display.putString(s);
  game.curx += 5;
}

// C ref: bot() — redraw status line
export function bot() {
  const u = game.u;
  const f = game.flags;
  const disp = game.display;

  if (f.botl & 1) {  // ALL
    curs(1, 24);
    const hp_str = `${u.uhp}(${u.uhpmax})`;
    let line = `Level ${String(game.dlevel).padEnd(2)}  Gold ${String(u.ugold).padEnd(5)}  ` +
               `Hp ${String(u.uhp).padStart(3)}(${u.uhpmax})`;
    if (u.uhpmax < 10) line += '  ';
    else if (u.uhpmax < 100) line += ' ';
    line += `Ac ${String(u.uac).padEnd(2)}  Str `;
    disp.moveCursor(1, 24); game.curx = 1; game.cury = 24;
    disp.putString(line); game.curx += line.length;
    prustr();
    const expstr = `  Exp ${String(u.ulevel).padStart(2)}/${String(u.uexp).padEnd(5)}`;
    disp.putString(expstr); game.curx += expstr.length;
    if (u.uhs) {
      disp.putString('      ');
      const hsstr = [null, 'Hungry  ', 'Weak    ', 'Fainting'][u.uhs] || '';
      disp.putString(hsstr);
      game.curx = 78;
    } else game.curx = 64;
    f.botl = 0;
    disp.flush();
    return;
  }
  if (f.botl & 2) {  // GOLD
    curs(16, 24); game.curx = 21;
    disp.putString(String(u.ugold).padEnd(5)); game.curx = 21;
  }
  if (f.botl & 4) {  // HP
    curs(26, 24); game.curx = 29;
    disp.putString(String(u.uhp).padStart(3)); game.curx = 29;
  }
  if (f.botl & 8) {  // HPM
    curs(30, 24);
    disp.putString(`${u.uhpmax})`);
    if (u.uhpmax < 100) disp.putString(' ');
    game.curx = u.uhpmax < 10 ? 33 : 34;
  }
  if (f.botl & 32) {  // AC
    curs(37, 24);
    disp.putString(String(u.uac).padEnd(2)); game.curx = 39;
  }
  if (f.botl & 16) {  // STR
    curs(45, 24); prustr(); game.curx = 50;
  }
  if (f.botl & 64) {  // ULV
    curs(56, 24);
    disp.putString(String(u.ulevel).padStart(2)); game.curx = 58;
  }
  if (f.botl & 128) {  // UEX
    curs(59, 24);
    disp.putString(String(u.uexp).padEnd(5)); game.curx = 64;
  }
  if (f.botl & 256) {  // DHS
    curs(70, 24); game.curx = 78;
    const hsstr = [null, '        ', 'Hungry  ', 'Weak    ', 'Fainting'][u.uhs] || '        ';
    // Wait, 0='        ' (blank), 1='Hungry', etc. — recheck C indices
    const hs_map = { 0: '        ', 1: 'Hungry  ', 2: 'Weak    ', 3: 'Fainting' };
    disp.putString(hs_map[u.uhs] || '        ');
  }
  f.botl = 0;
  disp.flush();
}

// C ref: pline(line,...) — print message on top line
// async because if topl==2 it must await key press for --More--
export async function pline(line, ...args) {
  if (game.flags.topl === 2) {
    curs(game.savx, 1);
    game.display.putString('--More--'); game.curx += 8;
    game.display.flush();
    let ch;
    do { ch = await game.input.getKey(); } while (ch !== ' ');
  } else {
    game.flags.topl = 2;
  }
  if (game.flags.dscr) {
    if (!game.u.uinvis && game.levl[game.u.ux][game.u.uy].scrsym !== '@') pru();
    nscr();
  }
  if (game.flags.botl) bot();
  if (game.cury === 1) {
    game.display.moveCursor(1, 1); game.curx = 1; game.cury = 1;
  } else {
    home();
  }
  // Clear top line
  game.display.moveCursor(1, 1); game.curx = 1; game.cury = 1;
  game.display.clearToEol();

  // Format string (simple %s, %d, %u, %o substitution)
  const formatted = sprintfSimple(line, args);
  game.display.putString(formatted);
  game.savx = formatted.length + 1;
  game.curx = game.savx;
  game.display.flush();
}

// Simple printf-style formatter for pline
function sprintfSimple(fmt, args) {
  let i = 0;
  return fmt.replace(/%([sduoc])/g, (_, spec) => {
    const val = args[i++];
    if (val === undefined) return '';
    switch (spec) {
      case 'd': case 'u': return String(Math.floor(Number(val)));
      case 'o': return Number(val).toString(8);
      case 'c': return typeof val === 'number' ? String.fromCharCode(val) : String(val);
      case 's': return String(val);
      default: return String(val);
    }
  });
}

// C ref: panic(str,...) — fatal error, quit
export function panic(str, ...args) {
  cls();
  const msg = 'ERROR: ' + sprintfSimple(str, args);
  game.display.moveCursor(1, 1);
  game.display.putString(msg);
  game.display.flush();
  throw new Error(msg);
}

// C ref: losehp(n)
export function losehp(n) {
  game.u.uhp -= n;
  game.flags.botl |= 4;  // HP
  return game.u.uhp < 1;
}
