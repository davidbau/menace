// C ref: mklev.c — dungeon level generator
// Called as generatelevel(dlevel) instead of a separate process.
import { WALL, SDOOR, DOOR, CORR, ROOM, TRAPNUM } from './const.js';
import { rn1, rn2, rnd, d, logEvent } from './rng.js';
import { game } from './gstate.js';
import { makeCell, makeMonst, makeObj, makeGen } from './game.js';
import { mon } from './data.js';

// Level-local state (mirrors mklev.c globals, reset each call)
let lev_room, lev_croom, lev_troom, lev_nroom, lev_rnum;
let lev_croomWriteIdx;  // C ref: croom pointer — tracks where next room is written
let lev_x, lev_y, lev_dx, lev_dy, lev_tx, lev_ty;
let lev_nxcor;
let lev_xdnstair, lev_xupstair, lev_ydnstair, lev_yupstair;
let lev_fmon, lev_fobj, lev_fgold, lev_ftrap;

// The working map for level generation (separate from game.levl during generation)
let lev_levl;

function initLevl() {
  lev_levl = [];
  for (let x = 0; x < 80; x++) {
    lev_levl[x] = [];
    for (let y = 0; y < 22; y++) {
      lev_levl[x][y] = makeCell();
    }
  }
}

// C ref: #define somex() ((rand()%(croom->hx-croom->lx))+croom->lx)
function somex() {
  return rn1(lev_croom.hx - lev_croom.lx, lev_croom.lx);
}
function somey() {
  return rn1(lev_croom.hy - lev_croom.ly, lev_croom.ly);
}

// C ref: g_at(x,y,ptr) in mklev.c
export function g_at_lev(x, y, ptr) {
  while (ptr) {
    if (ptr.gx === x && ptr.gy === y) return ptr;
    ptr = ptr.ngen;
  }
  return null;
}

// C ref: panic() in mklev.c — on failure, retry with a different seed
// In JS we throw a special error and retry in generatelevel()
class MklevRetry extends Error {
  constructor(newSeed) {
    super('mklev retry');
    this.newSeed = newSeed;
  }
}

function lev_panic(str) {
  // Retry with a modified seed (mirrors C's execl with modified seed)
  const newSeed = (game.rngSeed + 2 + rn2(12)) >>> 0;
  throw new MklevRetry(newSeed);
}

// C ref: makemon() in mklev.c (NOT the same as mon.js makemon)
function makemon_lev() {
  const mtmp = makeMonst(null);
  mtmp.nmon = lev_fmon;
  lev_fmon = mtmp;
  mtmp.mstat = 2; // SLEEP
  const tmp = rn2(Math.floor(game.dlevel / 3) + 1);
  mtmp.mhp = tmp > 7 ? rn2(8) : tmp;
  mtmp.orig_hp = rn2(7);
  return mtmp;
}

// C ref: mktrap(x,y)
function mktrap(x, y) {
  if (game.dlevel > 8 && !rn2(8)) return mkmim(rn2(2));
  const num = rn2(TRAPNUM);
  const gtmp = makeGen(x, y, num);
  gtmp.ngen = lev_ftrap;
  lev_ftrap = gtmp;
  return 0;
}

// C ref: mkmim(num)
function mkmim(num) {
  const mtmp = makeMonst(null);
  mtmp.nmon = lev_fmon;
  lev_fmon = mtmp;
  if (num === 0) {
    mtmp.mhp = 2;
    mtmp.orig_hp = 3;
    if (lev_xdnstair) {
      mtmp.mx = somex();
      mtmp.my = somey();
    } else {
      mtmp.mx = MAZX_fn();
      mtmp.my = MAZY_fn();
    }
    mtmp.invis = true;
  } else if (!lev_xdnstair || rn2(2)) {
    mtmp.mhp = 5;
    mtmp.orig_hp = 2;
    if (lev_xdnstair) {
      mtmp.mx = somex();
      mtmp.my = somey();
    } else {
      mtmp.mx = MAZX_fn();
      mtmp.my = MAZY_fn();
    }
    lev_levl[mtmp.mx][mtmp.my].scrsym = '$';
    return 1;
  } else {
    if (rn2(2)) {
      if (rn2(2)) mtmp.mx = lev_croom.hx + 1;
      else mtmp.mx = lev_croom.lx - 1;
      mtmp.my = somey();
    } else {
      if (rn2(2)) mtmp.my = lev_croom.hy + 1;
      else mtmp.my = lev_croom.ly - 1;
      mtmp.mx = somex();
    }
    lev_levl[mtmp.mx][mtmp.my].scrsym = '+';
    mtmp.mhp = 5;
    mtmp.orig_hp = 2;
  }
  return 0;
}

// C ref: mkgold(cnt,x,y)
function mkgold(cnt, x, y) {
  const gtmp = makeGen(x, y, 0);
  gtmp.ngen = lev_fgold;
  lev_levl[x][y].scrsym = '$';
  gtmp.gflag = cnt ? cnt : 1 + ((1 + Math.floor(Math.random() * (game.dlevel + 2))) *
    (1 + Math.floor(Math.random() * 30)));
  // Note: C uses rand() directly here (not rnd()), so we replicate with rn2
  gtmp.gflag = cnt ? cnt : 1 + (1 + rn2(game.dlevel + 2)) * (1 + rn2(30));
  lev_fgold = gtmp;
}

// C ref: mkobj() in mklev.c
function mkobj_lev() {
  const otmp = makeObj();
  otmp.nobj = lev_fobj;
  lev_fobj = otmp;
  switch (rnd(20)) {
    case 1: case 2:
      otmp.olet = ')';
      otmp.otyp = rn2(14); // WEPNUM
      if (otmp.otyp < 4) otmp.quan = rn1(6, 6);
      else otmp.quan = 1;
      if (!rn2(12)) otmp.spe = rnd(3);
      else if (!rn2(11)) { otmp.cursed = true; otmp.minus = true; otmp.spe = rnd(3); }
      break;
    case 19: case 20:
      otmp.olet = '*';
      otmp.quan = rn2(6) ? 1 : 2;
      otmp.otyp = rn2(15); // GEMNUM
      break;
    case 3: case 4:
      otmp.olet = '[';
      otmp.otyp = rn1(6, 2); // ARMNUM
      if (otmp.otyp > 4 && rn2(3)) otmp.otyp = rn1(6, 2);
      if (!rn2(10)) {
        otmp.spe = rnd(3);
        if (!rn2(3)) { otmp.cursed = true; otmp.minus = true; }
      }
      otmp.quan = 1;
      break;
    case 5: case 6: case 14: case 16:
      otmp.olet = '!';
      otmp.otyp = rn2(15); // POTNUM
      if (otmp.otyp > 9 && !rn2(3)) otmp.otyp = rn2(15);
      otmp.quan = 1;
      break;
    case 7: case 8: case 15: case 17:
      otmp.olet = '?';
      otmp.otyp = rn2(15); // SCRNUM
      if (otmp.otyp > 5 && otmp.otyp < 9) {
        if (!rn2(4)) otmp.otyp = 12;
        else if (rn2(2)) otmp.otyp = rn2(15);
      }
      otmp.quan = 1;
      break;
    case 9: case 10: case 11: case 18: default:
      otmp.olet = '%';
      otmp.otyp = rn2(6) ? 0 : 1;
      otmp.quan = rn2(6) ? 1 : 2;
      break;
    case 12:
      otmp.olet = '/';
      otmp.otyp = rn2(16); // WANDNUM
      if (!rn2(5)) otmp.spe = 0;
      else if (otmp.otyp < 3) otmp.spe = rn1(15, 20);
      else otmp.spe = rn1(5, 4);
      otmp.quan = 1;
      break;
    case 13:
      otmp.olet = '=';
      if (!rn2(8)) otmp.otyp = rn1(4, 13);
      else otmp.otyp = rn2(17); // RINGNUM
      otmp.quan = 1;
      if (otmp.otyp > 12) {
        if (!rn2(3)) { otmp.cursed = true; otmp.minus = true; otmp.spe = rnd(3); }
        else otmp.spe = rnd(3);
      } else if (otmp.otyp === 1 || otmp.otyp === 8 || otmp.otyp === 9)
        otmp.cursed = true;
  }
  return otmp;
}

// C ref: comp(x,y) — qsort comparator for rooms by lx, then ly as tiebreaker
function comp(a, b) {
  if (a.lx < b.lx) return -1;
  if (a.lx > b.lx) return 1;
  if (a.ly < b.ly) return -1;
  return a.ly > b.ly ? 1 : 0;
}

// C ref: dodoor(x,y)
function dodoor(x, y) {
  const L = lev_levl;
  if (L[x-1] && L[x-1][y] && (L[x-1][y].typ === DOOR || L[x-1][y].typ === SDOOR)) return;
  if (L[x+1] && L[x+1][y] && (L[x+1][y].typ === DOOR || L[x+1][y].typ === SDOOR)) return;
  if (L[x][y-1] && (L[x][y-1].typ === DOOR || L[x][y-1].typ === SDOOR)) return;
  if (L[x][y+1] && (L[x][y+1].typ === DOOR || L[x][y+1].typ === SDOOR)) return;
  if (!L[x] || !L[x][y] || L[x][y].typ !== WALL) return;
  if (!rn2(8)) {
    L[x][y].typ = SDOOR;
  } else {
    L[x][y].scrsym = '+';
    L[x][y].typ = DOOR;
  }
}

// C ref: newloc()
function newloc() {
  const ci0 = lev_room.indexOf(lev_croom);
  const ti0 = lev_room.indexOf(lev_troom);
  lev_croom = lev_room[ci0 + 1];
  lev_troom = lev_room[ti0 + 1];
  if (lev_nxcor || !lev_croom || lev_croom.hx < 0 || !lev_troom || lev_troom.hx < 0) {
    const oldNxcor = lev_nxcor;
    const limit = rn1(lev_nroom, 4);
    if (lev_nxcor++ > limit) {
      logEvent(`newloc[sentinel,nxcor=${oldNxcor},limit=${limit}]`);
      lev_croom = lev_room[lev_nroom]; // sentinel
      return;
    }
    let a, b;
    do {
      a = rn2(lev_nroom);
      b = rn2(lev_nroom);
      lev_croom = lev_room[a];
      lev_troom = lev_room[b];
    } while (lev_croom === lev_troom || (lev_troom === lev_room[a + 1] && !rn2(3)));
    logEvent(`newloc[pick,nxcor=${lev_nxcor},limit=${limit},a=${a},b=${b}]`);
  } else {
    logEvent(`newloc[seq,ci=${ci0+1},ti=${ti0+1}]`);
  }
  mkpos();
}

// C ref: mkpos()
function mkpos() {
  if (!lev_troom || lev_troom.hx < 0 || !lev_croom || lev_croom.hx < 0) return;
  if (lev_troom.lx > lev_croom.hx) {
    lev_x = lev_croom.hx + 1; lev_dx = 1;
    lev_y = rn1(lev_croom.hy - lev_croom.ly, lev_croom.ly); lev_dy = 0;
    lev_tx = lev_troom.lx - 1;
    lev_ty = lev_troom.ly + rnd(lev_troom.hy - lev_troom.ly) - 1;
  } else if (lev_troom.hy < lev_croom.ly) {
    lev_y = lev_croom.ly - 1; lev_dy = -1; lev_dx = 0;
    lev_x = lev_croom.lx + rnd(lev_croom.hx - lev_croom.lx) - 1;
    lev_tx = lev_troom.lx + rnd(lev_troom.hx - lev_troom.lx) - 1;
    lev_ty = lev_troom.hy + 1;
  } else if (lev_troom.hx < lev_croom.lx) {
    lev_x = lev_croom.lx - 1; lev_dx = -1; lev_dy = 0;
    lev_tx = lev_troom.hx + 1;
    lev_y = lev_croom.ly + rnd(lev_croom.hy - lev_croom.ly) - 1;
    lev_ty = lev_troom.ly + rnd(lev_troom.hy - lev_troom.ly) - 1;
  } else {
    lev_y = lev_croom.hy + 1; lev_dy = 1; lev_dx = 0;
    lev_x = lev_croom.lx + rnd(lev_croom.hx - lev_croom.lx) - 1;
    lev_tx = lev_troom.lx + rnd(lev_troom.hx - lev_troom.lx) - 1;
    lev_ty = lev_troom.ly - 1;
  }
  logEvent(`mkpos[x=${lev_x},y=${lev_y},dx=${lev_dx},dy=${lev_dy},tx=${lev_tx},ty=${lev_ty}]`);
  if (lev_levl[lev_x + lev_dx][lev_y + lev_dy].typ) {
    if (lev_nxcor) newloc();
    else { dodoor(lev_x, lev_y); lev_x += lev_dx; lev_y += lev_dy; }
    return;
  }
  dodoor(lev_x, lev_y);
}

// C ref: makecor(nx,ny)
function makecor(nx, ny) {
  if (lev_nxcor && !rn2(35)) { logEvent(`makecor[dead_end,nx=${nx},ny=${ny}]`); newloc(); return; }
  const dix = Math.abs(nx - lev_tx);
  const diy = Math.abs(ny - lev_ty);
  if (nx === 79 || nx === 0 || ny === 0 || ny === 21) {
    if (lev_nxcor) { newloc(); return; }
    else lev_panic('edge');
  }
  if (lev_dy && dix > diy) {
    lev_dy = 0; lev_dx = nx > lev_tx ? -1 : 1;
  } else if (lev_dx && diy > dix) {
    lev_dx = 0; lev_dy = ny > lev_ty ? -1 : 1;
  }
  const crm = lev_levl[nx][ny];
  if (!crm.typ) {
    crm.typ = CORR; crm.scrsym = '#';
    lev_x = nx; lev_y = ny;
    return;
  }
  if (crm.typ === CORR) { lev_x = nx; lev_y = ny; return; }
  if (nx === lev_tx && ny === lev_ty) { dodoor(nx, ny); newloc(); return; }
  if (lev_x + lev_dx !== nx || lev_y + lev_dy !== ny) { logEvent(`makecor[stop,nx=${nx},ny=${ny},crm=${crm.typ},x=${lev_x},y=${lev_y},dx=${lev_dx},dy=${lev_dy}]`); return; }
  if (lev_dx) {
    if (lev_ty < ny) lev_dy = -1;
    else lev_dy = lev_levl[nx + lev_dx][ny - 1].typ === ROOM ? 1 : -1;
    lev_dx = 0;
  } else {
    if (lev_tx < nx) lev_dx = -1;
    else lev_dx = lev_levl[nx - 1][ny + lev_dy].typ === ROOM ? 1 : -1;
    lev_dy = 0;
  }
  logEvent(`makecor[redir,nx=${nx},ny=${ny},crm=${crm.typ},x=${lev_x},y=${lev_y},dx=${lev_dx},dy=${lev_dy}]`);
}

// C ref: maker(lowx,hix,lowy,hiy)
function maker(lowx, hix, lowy, hiy) {
  if (hix > 75) hix = 75;
  if (hiy > 18) hiy = 18;
  // Check for overlap with 2-cell margin
  for (let tmpx = lowx - 2; tmpx < hix + 3; tmpx++) {
    for (let tmpy = lowy - 2; tmpy < hiy + 3; tmpy++) {
      if (tmpx >= 0 && tmpx < 80 && tmpy >= 0 && tmpy < 22 &&
          lev_levl[tmpx][tmpy].typ) return 0;
    }
  }
  // Light the room if dlevel is low
  if (game.dlevel < rn2(14)) {
    for (let tmpx = lowx - 1; tmpx < hix + 2; tmpx++) {
      for (let tmpy = lowy - 1; tmpy < hiy + 2; tmpy++) {
        if (tmpx >= 0 && tmpx < 80 && tmpy >= 0 && tmpy < 22)
          lev_levl[tmpx][tmpy].lit = true;
      }
    }
  }
  // Record room — C: writes to *croom and increments croom pointer
  // JS: writes to lev_room[lev_croomWriteIdx] and increments the write index
  const room = { lx: lowx, hx: hix, ly: lowy, hy: hiy };
  lev_room[lev_croomWriteIdx++] = room;
  // Draw walls and floor
  let tmpx = lowx - 1;
  // Left wall column
  for (let tmpy = lowy - 1; tmpy <= hiy + 1; tmpy++) {
    lev_levl[tmpx][tmpy].scrsym = tmpy === lowy - 1 || tmpy === hiy + 1 ? '-' : '|';
    lev_levl[tmpx][tmpy].typ = WALL;
  }
  // Middle columns
  for (tmpx = lowx; tmpx <= hix; tmpx++) {
    lev_levl[tmpx][lowy - 1].scrsym = '-'; lev_levl[tmpx][lowy - 1].typ = WALL;
    for (let tmpy = lowy; tmpy <= hiy; tmpy++) {
      lev_levl[tmpx][tmpy].scrsym = '.'; lev_levl[tmpx][tmpy].typ = ROOM;
    }
    lev_levl[tmpx][hiy + 1].scrsym = '-'; lev_levl[tmpx][hiy + 1].typ = WALL;
  }
  // Right wall column
  tmpx = hix + 1;
  for (let tmpy = lowy - 1; tmpy <= hiy + 1; tmpy++) {
    lev_levl[tmpx][tmpy].scrsym = tmpy === lowy - 1 || tmpy === hiy + 1 ? '-' : '|';
    lev_levl[tmpx][tmpy].typ = WALL;
  }
  lev_nroom++;
  // Update croom pointer (C increments croom as rooms are allocated)
  lev_croom = room;
  return 1;
}

// C ref: #define MAZX (2*rnd(37)+1), #define MAZY (2*rnd(8)+1)
function MAZX_fn() { return 2 * rnd(37) + 1; }
function MAZY_fn() { return 2 * rnd(8) + 1; }

// C ref: move(x,y,dir) in makemaz
function mazMove(pos, dir) {
  switch (dir) {
    case 0: pos.x--; break;
    case 1: pos.y++; break;
    case 2: pos.x++; break;
    case 3: pos.y--; break;
  }
}

// C ref: okay(x,y,dir)
function okay(x, y, dir) {
  const p = { x, y };
  mazMove(p, dir); mazMove(p, dir);
  if (p.x < 3 || p.y < 3 || p.x > 17 || p.y > 75 || lev_levl[p.y][p.x].typ !== 0) return 0;
  return 1;
}

// C ref: makemaz()
// Note: makemaz has x and y swapped compared to the rest of mklev — the comment says
// "Kenny's fault. He seems to have his x and y reversed." We follow C exactly.
function makemaz() {
  for (let x = 2; x < 19; x++)
    for (let y = 2; y < 77; y++)
      lev_levl[y][x].typ = (x % 2 && y % 2) ? 0 : 1;

  let zx = MAZY_fn();
  let zy = MAZX_fn();
  let sp = 1;
  const stack = new Array(200).fill(0);
  stack[1] = 100 * zx + zy;

  while (sp) {
    const cx = Math.floor(stack[sp] / 100);
    const cy = stack[sp] % 100;
    lev_levl[cy][cx].typ = 2;
    const dirs = [];
    for (let a = 0; a < 4; a++) if (okay(cx, cy, a)) dirs.push(a);
    if (dirs.length) {
      const dir = dirs[rn2(dirs.length)];
      const p = { x: cx, y: cy };
      mazMove(p, dir); lev_levl[p.y][p.x].typ = 0;
      mazMove(p, dir); stack[++sp] = 100 * p.x + p.y;
    } else sp--;
  }

  for (let x = 2; x < 77; x++)
    for (let y = 2; y < 19; y++) {
      if (lev_levl[x][y].typ === WALL) lev_levl[x][y].typ = 0;
      else { lev_levl[x][y].typ = CORR; lev_levl[x][y].scrsym = '#'; }
    }

  for (let x = rn1(8, 11); x; x--) {
    const otmp = mkobj_lev();
    lev_levl[(otmp.ox = MAZX_fn())][(otmp.oy = MAZY_fn())].scrsym = otmp.olet;
  }
  for (let x = rn1(5, 7); x; x--) {
    const mtmp = makemon_lev();
    mtmp.mx = MAZX_fn(); mtmp.my = MAZY_fn(); mtmp.mstat = 2;
  }
  for (let x = rn1(6, 7); x; x--) mkgold(0, MAZX_fn(), MAZY_fn());
  for (let x = rn1(6, 7); x; x--) mktrap(MAZX_fn(), MAZY_fn());

  let upx, upy;
  do { upx = MAZX_fn(); upy = MAZY_fn(); } while (g_at_lev(upx, upy, lev_ftrap));
  lev_xupstair = upx; lev_yupstair = upy;
  lev_levl[upx][upy].scrsym = '<';
  lev_levl[zy][zx].scrsym = '"';
  const otmp = makeObj();
  otmp.nobj = lev_fobj; lev_fobj = otmp;
  otmp.ox = zy; otmp.oy = zx; otmp.olet = '"';
  lev_xdnstair = lev_ydnstair = 0;
}

// C ref: main() in mklev.c — entry point, now called as generatelevel(dlevel)
// Returns a level data object {levl, fmon, fgold, ftrap, fobj, xupstair, yupstair, xdnstair, ydnstair}
export function generatelevel(dlevel) {
  const MAX_RETRIES = 100;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return _generatelevel_attempt(dlevel);
    } catch (e) {
      if (e instanceof MklevRetry) {
        game.rngSeed = e.newSeed;
        continue;
      }
      throw e;
    }
  }
  throw new Error('mklev: too many retries');
}

function _generatelevel_attempt(dlevel) {
  // C harness: mklev.c globals (levl, room[], nroom) are NOT reset between calls
  // to mklev_main() since it runs inline. We carry over state via game.mklev_persist.
  // On the first call (level 1), game.mklev_persist is undefined → use fresh state.
  const persist = game.mklev_persist;
  if (persist) {
    // Restore carried-over C globals: levl, room[], nroom, fmon all carry over between
    // inline calls to mklev_main() in the C harness.
    lev_levl = persist.levl;
    lev_room = persist.room.slice();   // copy so we can mutate
    lev_nroom = persist.nroom;         // nroom carries over (NOT reset to 0)
    lev_fmon = persist.fmon;           // fmon carries over (C global persists)
  } else {
    initLevl();
    lev_room = [];
    lev_nroom = 0;
    lev_fmon = null;
  }
  // C ref: croom = room (reset pointer to start of array — like resetting write index to 0)
  lev_croomWriteIdx = 0;
  lev_fobj = null; lev_fgold = null; lev_ftrap = null;
  lev_nxcor = 0;

  const isMaze = (dlevel === game.flags.maze);
  const isNear = (dlevel === game.flags.maze - 1);
  const tspe = isMaze ? 'b' : (isNear ? 'n' : 'a');

  if (tspe === 'b') {
    makemaz();
    return packageLevel();
  }

  // First 4 anchor rooms
  let croomIndex = 0;
  const tryMaker = (lowx, hix, lowy, hiy, fb_lx, fb_hx, fb_ly, fb_hy) => {
    if (!maker(lowx, hix, lowy, hiy)) maker(fb_lx, fb_hx, fb_ly, fb_hy);
  };
  tryMaker(3, rn1(5,5), 4, rn1(5,7),    3,5, 4,7);
  tryMaker(rn1(9,59), 70, 4, rn1(4,7),  67,70, 4,7);
  tryMaker(3, rn1(5,5), rn1(5,9), 16,   3,5, 13,16);
  tryMaker(rn1(9,59), 70, rn1(5,9), 16, 67,70, 13,16);

  // Fill in more rooms
  // C ref: the inner loop mutates `lowy` (the outer loop variable) in place.
  // Each inner iteration: lowy += (rand()%5)-2, then clamp. This is intentional.
  outer: while (lev_nroom < 6) {
    for (let lowy = rn1(3,3); lowy < 15; lowy += rn1(2,4)) {
      for (let lowx = rn1(3,4); lowx < 70; lowx += rn1(2,7)) {
        lowy += rn2(5) - 2; // C: lowy+=(rand()%5)-2 — mutates outer loop variable
        if (lowy < 3) lowy = 3;
        else if (lowy > 16) lowy = 16;
        if (lev_levl[lowx][lowy].typ) continue;
        if (maker(lowx, rn1(10, lowx+2), lowy, rn1(4, lowy+2)) && lev_nroom > 13) break outer;
      }
    }
  }

  // C ref: croom->hx = -1 — set sentinel at current write position.
  // In C, this overwrites whatever was at croom (which is room[nroom_at_start_of_call]
  // if no rooms were added, or room[nroom_added] if rooms were added).
  // The sentinel keeps the lx/ly/hy values of whatever was there before.
  // On first call (fresh state): lev_room[lev_croomWriteIdx] doesn't exist → create with lx=0
  // On subsequent calls: lev_room[lev_croomWriteIdx] has leftover data from previous generation
  if (lev_croomWriteIdx >= lev_room.length) {
    lev_room[lev_croomWriteIdx] = { lx: 0, hx: -1, ly: 0, hy: 0 };
  } else {
    lev_room[lev_croomWriteIdx] = Object.assign({}, lev_room[lev_croomWriteIdx], { hx: -1 });
  }
  // qsort sorts lev_nroom entries (NOT including the sentinel position itself,
  // since C's qsort(room, nroom, ...) only sorts nroom entries — the sentinel at
  // room[nroom] is NOT included in the sort). BUT the sentinel's lx value affects
  // its position relative to other rooms when it's within the nroom range.
  // C: qsort(room, nroom, ...) where sentinel is at room[nroom] — outside the sort range
  // UNLESS nroom <= lev_croomWriteIdx. When no rooms were added (lev_croomWriteIdx=0),
  // the sentinel is at index 0, and qsort(room, nroom=9, ...) DOES include it.

  logEvent('mklev_rooms');
  // Place downstairs
  let dnx, dny;
  if (tspe === 'n') {
    do {
      lev_croom = lev_room[rn2(lev_nroom)];
      dnx = somex(); dny = somey();
    } while (!(dnx % 2) || !(dny % 2) || g_at_lev(dnx, dny, lev_ftrap));
  } else {
    do {
      lev_croom = lev_room[rn2(lev_nroom)];
      dnx = somex(); dny = somey();
    } while (g_at_lev(dnx, dny, lev_ftrap));
  }
  lev_levl[dnx][dny].scrsym = '>';
  lev_xdnstair = dnx; lev_ydnstair = dny;

  logEvent(`mklev_dn[x=${dnx},y=${dny}]`);
  // Place upstairs (in a different room)
  // C ref: somex/somey called INSIDE do-while — must match C behavior
  const troom_save = lev_croom;
  let upx, upy;
  do {
    lev_croom = lev_room[rn2(lev_nroom)];
    upx = somex(); upy = somey();
  } while (lev_croom === troom_save);
  lev_levl[upx][upy].scrsym = '<';
  lev_xupstair = upx; lev_yupstair = upy;

  logEvent(`mklev_up[x=${upx},y=${upy}]`);
  logEvent('mklev_up');
  // C ref: for(croom=room; croom->hx>0; croom++) — iterate real rooms (hx>0), stop at sentinel
  // Starts from room[0] (the beginning of the array), NOT from lev_nroom.
  // If sentinel is at index 0 (no rooms added this call), the loop runs zero times.
  for (let ri = 0; ri < lev_room.length && lev_room[ri].hx > 0; ri++) {
    lev_croom = lev_room[ri];
    if (!rn2(3)) {
      const mtmp = makemon_lev();
      do { mtmp.mx = somex(); mtmp.my = somey(); }
      while (lev_xupstair === mtmp.mx && lev_yupstair === mtmp.my);
      mtmp.mstat = 2; // SLEEP
    }
    let tries = 0;
    while (!rn2(8 - Math.floor(game.dlevel / 6))) {
      let tx, ty;
      do { tx = somex(); ty = somey(); }
      while ((lev_xdnstair === tx && lev_ydnstair === ty) || g_at_lev(tx, ty, lev_ftrap));
      tries += mktrap(tx, ty);
    }
    if (!tries && !rn2(3)) mkgold(0, somex(), somey());
    if (!rn2(3)) {
      const otmp = mkobj_lev();
      lev_levl[(otmp.ox = somex())][(otmp.oy = somey())].scrsym = otmp.olet;
      while (!rn2(5)) {
        const o2 = mkobj_lev();
        lev_levl[(o2.ox = somex())][(o2.oy = somey())].scrsym = o2.olet;
      }
    }
  }

  logEvent('mklev_populate');
  // C ref: qsort(room, nroom, sizeof(struct mkroom), comp) — sort only lev_nroom entries
  // We sort the slice of lev_room that C would sort (indices 0..lev_nroom-1),
  // leaving any entries beyond lev_nroom unchanged.
  const toSort = lev_room.slice(0, lev_nroom);
  toSort.sort(comp);
  for (let i = 0; i < lev_nroom; i++) lev_room[i] = toSort[i];
  // Log room layout for parity comparison (lev_nroom entries, matching C's qsort range)
  logEvent(`rooms[${lev_room.slice(0, lev_nroom).map((r,i) => `${i}:${r.lx}-${r.hx},${r.ly}-${r.hy}`).join('|')}]`);
  lev_croom = lev_room[0];
  lev_troom = lev_room[1];
  lev_nxcor = 0;
  if (game._corTrace) {
    process.stderr.write(`corridor start: nroom=${lev_nroom} rooms=[${lev_room.map(r=>r.lx+'..'+r.hx).join(',')}]\n`);
    process.stderr.write(`initial rooms: c=${lev_room.indexOf(lev_croom)} t=${lev_room.indexOf(lev_troom)}\n`);
  }
  mkpos();
  if (game._corTrace) process.stderr.write(`after initial mkpos: x=${lev_x},y=${lev_y} dx=${lev_dx},dy=${lev_dy} tx=${lev_tx},ty=${lev_ty}\n`);
  let _corIter = 0;
  while (lev_croom && lev_croom.hx > 0 && lev_troom && lev_troom.hx > 0) {
    makecor(lev_x + lev_dx, lev_y + lev_dy);
    if (++_corIter > 200000) lev_panic('stuck');
  }
  logEvent('mklev_corridors');
  if (game._corTrace) process.stderr.write(`corridor done: total_rng=${game.rawRngLog?game.rawRngLog.length:'?'}\n`);

  // C harness: save mklev globals for reuse by the next call to mklev_main().
  // The C harness runs mklev inline, so levl[], room[], nroom, fmon all carry over.
  // We deep-copy levl (since lev.js will modify game.levl from this data).
  // room[], nroom, and fmon are saved as-is (carry leftover state from this call).
  const levlCopy = [];
  for (let x = 0; x < 80; x++) {
    levlCopy[x] = [];
    for (let y = 0; y < 22; y++) {
      levlCopy[x][y] = Object.assign({}, lev_levl[x][y]);
    }
  }
  game.mklev_persist = { levl: levlCopy, room: lev_room.slice(), nroom: lev_nroom, fmon: lev_fmon };

  return packageLevel();
}

function packageLevel() {
  return {
    levl:      lev_levl,
    fmon:      lev_fmon,
    fgold:     lev_fgold,
    ftrap:     lev_ftrap,
    fobj:      lev_fobj,
    xupstair:  lev_xupstair,
    yupstair:  lev_yupstair,
    xdnstair:  lev_xdnstair,
    ydnstair:  lev_ydnstair,
  };
}
