// C ref: hack.lev.c — level save/load, mklev wrapper, mkobj
import { COLNO, ROWNO } from './const.js';
import { rn1, rn2, rnd, d } from './rng.js';
import { game } from './gstate.js';
import { makeCell, makeMonst, makeObj, makeGen, makeStole } from './game.js';
import { mon, mregen } from './data.js';
import { generatelevel } from './mklev.js';

// C ref: savelev(fp) — serialize current level to game.savedLevels[dlevel]
// In JS we snapshot the live game state into a plain object.
export function savelev() {
  const snapshot = {
    levl: [],
    moves: game.moves,
    xupstair: game.xupstair,
    yupstair: game.yupstair,
    xdnstair: game.xdnstair,
    ydnstair: game.ydnstair,
    fstole: serializeStoles(),
    fmon: serializeList(game.fmon, 'nmon'),
    fgold: serializeList(game.fgold, 'ngen'),
    ftrap: serializeList(game.ftrap, 'ngen'),
    fobj: serializeList(game.fobj, 'nobj'),
  };
  // Deep copy levl
  for (let x = 0; x < COLNO; x++) {
    snapshot.levl[x] = [];
    for (let y = 0; y < ROWNO; y++) {
      snapshot.levl[x][y] = Object.assign({}, game.levl[x][y]);
    }
  }
  game.savedLevels[game.dlevel] = snapshot;

  // Clear live lists (C: savelev frees all monsters/objects)
  game.fstole = game.fmon = game.fgold = game.ftrap = game.fobj = null;
}

// C ref: getlev(fp) — restore level from saved snapshot (or from mklev-generated data)
// If omoves==0 (first time), initialize monster data from mon[] table.
// If omoves>0, regenerate monsters based on time passed.
export function getlev(data) {
  // data is either a snapshot from savelev() or a raw level from generatelevel()
  if (!data) return 1;

  // Restore map
  const levl = data.levl;
  for (let x = 0; x < COLNO; x++)
    for (let y = 0; y < ROWNO; y++)
      game.levl[x][y] = Object.assign(makeCell(), levl[x][y]);

  const omoves = data.moves || 0;
  game.xupstair = data.xupstair;
  game.yupstair = data.yupstair;
  game.xdnstair = data.xdnstair;
  game.ydnstair = data.ydnstair;

  game.fstole = null;
  game.fmon = null;
  game.fgold = null;
  game.ftrap = null;
  game.fobj = null;

  // Restore stolen items list
  if (data.fstole) {
    for (const s of data.fstole) {
      const stmp = makeStole(null, null, s.sgold);
      if (s.smon_key) {
        // Reconnect smon after monsters are restored (done below)
        stmp._smon_key = s.smon_key;
      }
      stmp.nstole = game.fstole;
      game.fstole = stmp;
      // Restore stolen objects
      for (const o of (s.sobj || [])) {
        const otmp = Object.assign(makeObj(), o);
        otmp.nobj = stmp.sobj;
        stmp.sobj = otmp;
      }
    }
  }

  const tmoves = omoves ? game.moves - omoves : 0;

  // Restore monsters
  if (data.fmon) {
    for (const m of data.fmon) {
      if (omoves) {
        // C: uses raw data pointer from saved struct (valid in same process)
        // JS: m.data is the permonst object reference (preserved in savedLevels)
        const mdat = m.data;
        if (mdat && mdat.mlet && !game.genocidedLetters.has(mdat.mlet)) {
          if (mregen.includes(mdat.mlet)) m.mhp = Math.min(m.mhp + tmoves, m.orig_hp);
          else m.mhp = Math.min(m.mhp + Math.floor(tmoves / 20), m.orig_hp);
          if (m.mhp < 1) m.mhp = m.orig_hp;
          const mtmp = Object.assign(makeMonst(mdat), m);
          mtmp.nmon = game.fmon;
          game.fmon = mtmp;
        }
      } else {
        // First time: m.mhp = tier index, m.orig_hp = monster index (from makemon_lev)
        const tier = m.mhp; const idx = m.orig_hp;
        const mdat = (tier < 8 && idx < 7) ? mon[tier][idx] : null;
        if (mdat && mdat.mlet && !game.genocidedLetters.has(mdat.mlet)) {
          const mtmp = makeMonst(mdat);
          mtmp.mx = m.mx; mtmp.my = m.my; mtmp.mstat = m.mstat;
          mtmp.sinv = false; mtmp.mspeed = 0; mtmp.cham = false;
          mtmp.invis = false; mtmp.mcan = false;
          if (mdat.mlet === 'D') mtmp.mhp = mtmp.orig_hp = 80;
          else if (mdat.mhd) mtmp.orig_hp = mtmp.mhp = d(mdat.mhd, 8);
          else mtmp.orig_hp = mtmp.mhp = rnd(4);
          if (mdat.mlet === ':' && !game.u.ucham) mtmp.cham = true;
          if (mdat.mlet === 'I') mtmp.invis = true;
          if ('p~,M'.includes(mdat.mlet)) { mtmp.invis = true; mtmp.sinv = true; }
          mtmp.nmon = game.fmon;
          game.fmon = mtmp;
        }
      }
    }
  }

  // Restore gold
  if (data.fgold) {
    for (const g of data.fgold) {
      const gtmp = makeGen(g.gx, g.gy, g.gflag);
      gtmp.ngen = game.fgold;
      game.fgold = gtmp;
    }
  }

  // Restore traps
  if (data.ftrap) {
    for (const g of data.ftrap) {
      const gtmp = makeGen(g.gx, g.gy, g.gflag);
      gtmp.ngen = game.ftrap;
      game.ftrap = gtmp;
    }
  }

  // Restore objects
  if (data.fobj) {
    for (const o of data.fobj) {
      const otmp = Object.assign(makeObj(), o);
      otmp.nobj = game.fobj;
      game.fobj = otmp;
    }
  }

  return 0;
}

// C ref: mklev() — generate a new level via the mklev process
// In JS: call generatelevel() directly, then store in savedLevels
export function mklev() {
  // C ref: mklev is a forked process — it re-seeds its RNG with getpid() which
  // the harness overrides to the game's initial seed. The fork means mklev's rand()
  // calls don't advance the main game's RNG, but in the harness they DO appear in the
  // same step rng log. We match this by resetting rngSeed to initialSeed before mklev
  // and letting the seed advance through mklev (not restoring it after).
  game.rngSeed = game.initialSeed + game.dlevel;

  const tspe = game.dlevel === game.flags.maze ? 'b' :
               game.dlevel === game.flags.maze - 1 ? 'n' : 'a';
  const lvdata = generatelevel(game.dlevel);
  // Convert generatelevel output to savelev-compatible format
  const snapshot = {
    levl: lvdata.levl,
    moves: 0,  // omoves=0 means "first time loading"
    xupstair: lvdata.xupstair,
    yupstair: lvdata.yupstair,
    xdnstair: lvdata.xdnstair,
    ydnstair: lvdata.ydnstair,
    fstole: [],
    fmon: flattenList(lvdata.fmon, 'nmon'),
    fgold: flattenList(lvdata.fgold, 'ngen'),
    ftrap: flattenList(lvdata.ftrap, 'ngen'),
    fobj: flattenList(lvdata.fobj, 'nobj'),
  };
  game.savedLevels[game.dlevel] = snapshot;
}

// C ref: mkobj(let) — create an item (in hack context, for dropping on level changes etc.)
export function mkobj(let_char) {
  const { rn2: _rn2, rnd: _rnd } = { rn2, rnd };
  const otmp = makeObj();
  otmp.nobj = game.fobj;
  game.fobj = otmp;
  otmp.minus = false; otmp.known = false; otmp.cursed = false; otmp.spe = 0;

  // C: switch(let?let:rnd(20)) — call rnd(20) exactly once when let==0
  const roll = let_char ? (typeof let_char === 'string' ? let_char.charCodeAt(0) : let_char) : _rnd(20);
  _mkobj_fill(otmp, roll);
  return otmp;
}

function _mkobj_fill(otmp, roll) {
  // If roll is a char code or char string, convert
  const r = typeof roll === 'string' ? roll.charCodeAt(0) : roll;
  const rch = typeof roll === 'string' ? roll : String.fromCharCode(roll);

  if (rch === ')' || r === 1 || r === 2) {
    otmp.olet = ')';
    otmp.otyp = rn2(14);
    otmp.quan = otmp.otyp < 4 ? rn1(6, 6) : 1;
    if (!rn2(11)) otmp.spe = rnd(3);
    else if (!rn2(10)) { otmp.cursed = true; otmp.minus = true; otmp.spe = rnd(3); }
  } else if (rch === '*' || r === 19 || r === 20) {
    otmp.olet = '*'; otmp.quan = rn2(6) ? 2 : 1; otmp.otyp = rn2(15);
  } else if (rch === '[' || r === 3 || r === 4) {
    otmp.olet = '['; otmp.otyp = rn1(6, 2);
    if (!rn2(10)) otmp.spe = rnd(3);
    else if (!rn2(9)) { otmp.spe = rnd(3); otmp.cursed = true; otmp.minus = true; }
    otmp.quan = 1;
  } else if (rch === '!' || r === 5 || r === 6 || r === 14 || r === 16) {
    otmp.olet = '!'; otmp.otyp = rn2(15); otmp.quan = 1;
  } else if (rch === '?' || r === 7 || r === 8 || r === 15 || r === 17) {
    otmp.olet = '?'; otmp.otyp = rn2(15); otmp.quan = 1;
  } else if (rch === '/' || r === 12) {
    otmp.olet = '/'; otmp.otyp = rn2(16);
    if (otmp.otyp === 15) otmp.otyp = rn2(16);
    if (otmp.otyp < 3) otmp.spe = rn1(5, 11);
    else otmp.spe = rn1(7, 3);
    otmp.quan = 1;
  } else if (rch === '=' || r === 13) {
    otmp.olet = '=';
    otmp.otyp = !rn2(7) ? rn1(3, 13) : rn2(17);
    otmp.quan = 1;
    if (otmp.otyp > 12) {
      if (!rn2(3)) { otmp.cursed = true; otmp.minus = true; otmp.spe = rnd(2); }
      else otmp.spe = rnd(2);
    } else if (otmp.otyp === 1 || otmp.otyp === 8 || otmp.otyp === 9) otmp.cursed = true;
  } else {
    otmp.olet = '%'; otmp.otyp = rn2(6) ? 0 : 1; otmp.quan = rn2(6) ? 1 : 2;
  }
}

// Helper: flatten a linked list to an array for serialization
function flattenList(head, next) {
  const arr = [];
  let cur = head;
  while (cur) { arr.push(cur); cur = cur[next]; }
  return arr;
}

function serializeList(head, next) {
  const arr = [];
  let cur = head;
  while (cur) {
    const obj = Object.assign({}, cur);
    delete obj[next];
    arr.push(obj);
    cur = cur[next];
  }
  return arr;
}

function serializeStoles() {
  const arr = [];
  let cur = game.fstole;
  while (cur) {
    const s = { sgold: cur.sgold, sobj: serializeList(cur.sobj, 'nobj') };
    arr.push(s);
    cur = cur.nstole;
  }
  return arr;
}
