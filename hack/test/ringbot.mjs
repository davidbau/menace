/**
 * ringbot.mjs — Pick up a ring, wear it, remove it; also test armor wear.
 *
 * Covers: case 'W' (wear armor), case 'P' (wear ring), case 'R' (remove ring),
 *         applyRingOn(), ringoff(), "Right or Left?" prompt.
 *
 * Usage:
 *   node hack/test/ringbot.mjs --seed N [--maxsteps N] [--maxdist N]
 */

{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(k)    { return _store.has(k) ? _store.get(k) : null; },
    setItem(k, v) { _store.set(k, String(v)); },
    removeItem(k) { _store.delete(k); },
    clear()       { _store.clear(); },
    get length()  { return _store.size; },
    key(i)        { return [..._store.keys()][i] ?? null; },
  };
}

import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { _setPriDeps, newsym } from '../js/pri.js';
import { _setMonDeps, g_at_mon, g_at_gen, g_at_obj, killed, rloc, mnexto, newcham, poisoned } from '../js/mon.js';
import { _setHackDeps, setsee, tele, nomul, amon, attmon } from '../js/hack.js';
import { _setDo1Deps, dosearch, buzz } from '../js/do1.js';
import { setRhack, gameLoop, GameOver, losestr, ndaminc, dodown, doup } from '../js/main.js';
import { rhack } from '../js/do.js';
import { docrt } from '../js/pri.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

function wireDeps() {
  _setPriDeps(
    (x, y, list) => {
      if (!list) return null;
      if ('gx' in list) return g_at_gen(x, y, list);
      if ('ox' in list) return g_at_obj(x, y, list);
      if ('mx' in list) return g_at_mon(x, y, list);
      return null;
    }, newsym, setsee
  );
  _setMonDeps({ setsee, tele, nomul, killed, rloc, newcham, mnexto, attmon, amon, buzz, dosearch, losestr, ndaminc, docrt });
  _setDo1Deps(nomul);
  _setHackDeps({ dodown, doup, docrt, poisoned });
  setRhack(rhack);
}

function bfsKey(tx, ty) {
  const { ux, uy } = game.u;
  const visited = new Set([`${ux},${uy}`]);
  const queue = [{ x: ux, y: uy, firstKey: null }];
  const dirs = [['h',-1,0],['l',1,0],['k',0,-1],['j',0,1],['y',-1,-1],['u',1,-1],['b',-1,1],['n',1,1]];
  while (queue.length) {
    const { x, y, firstKey } = queue.shift();
    const srcTyp = game.levl[x]?.[y]?.typ ?? 0;
    for (const [key, dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= 80 || ny < 0 || ny >= 22) continue;
      const cell = game.levl[nx]?.[ny];
      if (!cell || cell.typ < 3) continue;
      if (dx && dy && (cell.typ === 3 || srcTyp === 3)) continue;
      const k = `${nx},${ny}`;
      if (visited.has(k)) continue;
      visited.add(k);
      const fk = firstKey || key;
      if (nx === tx && ny === ty) return fk;
      queue.push({ x: nx, y: ny, firstKey: fk });
    }
  }
  return null;
}

// Find the inventory letter (a/b/c/...) for an item with given olet and optional filter
function invLetterFor(filterFn) {
  let code = 'a'.charCodeAt(0);
  for (let o = game.invent; o; o = o.nobj) {
    if (filterFn(o)) return String.fromCharCode(code);
    code++;
  }
  return null;
}

const args = process.argv.slice(2);
function getArg(name, def) { const i = args.indexOf(name); return i >= 0 ? args[i+1] : def; }
const seed = parseInt(getArg('--seed', '73'));
const maxSteps = parseInt(getArg('--maxsteps', '400'));
const maxDist = parseInt(getArg('--maxdist', '25'));

wireDeps();
const display = new MockDisplay();
const input = new MockInput();
const g = new GameState();
g.display = display; g.input = input; g.rawRngLog = [];
setGame(g);

const keyLog = [];
let stepCount = 0;
let stuckCount = 0, lastPos = null;

// Pending command queue for multi-key responses
const cmdQueue = [];
let phase = 'explore';

// Ring state
let ringPickedUp = false;
let armorPhaseDone = false;
let ring1Worn = false;
let ring2Worn = false;
let ring1Removed = false;
let ring2Removed = false;

class BotDone extends Error {}

function queueCommands(...cmds) {
  for (const c of cmds) cmdQueue.push(c);
}

input.getKey = async function () {
  if (stepCount >= maxSteps) throw new BotDone();
  stepCount++;

  const topLine = display.getRows()[0] || '';

  // ── Handle active prompts ──────────────────────────────────────────────────
  if (topLine.includes('Right or Left')) {
    keyLog.push('r');
    return 'r';
  }
  if (topLine.includes('--More--')) {
    keyLog.push(' ');
    return ' ';
  }
  if (topLine.includes('wear what')) {
    // Look for a ring OR armor in inventory depending on context
    const letter = invLetterFor(o => o.olet === '=' && o !== game.uleft && o !== game.uright)
                || invLetterFor(o => o.olet === '[' && o !== game.uarm);
    if (letter) {
      keyLog.push(letter);
      return letter;
    }
    // No suitable item: escape
    keyLog.push('\x1b');
    return '\x1b';
  }
  if (topLine.includes('remove what')) {
    const letter = invLetterFor(o => o.olet === '=' && (o === game.uleft || o === game.uright));
    if (letter) {
      keyLog.push(letter);
      return letter;
    }
    keyLog.push('\x1b');
    return '\x1b';
  }
  if (topLine.includes('take off what') || topLine.includes('Take off')) {
    // Shouldn't happen — we use 'T' not 'T' with getobj
    keyLog.push('\x1b');
    return '\x1b';
  }

  // ── Drain command queue ────────────────────────────────────────────────────
  if (cmdQueue.length > 0) {
    const k = cmdQueue.shift();
    keyLog.push(k);
    return k;
  }

  // ── Main state machine ─────────────────────────────────────────────────────
  const rings = [];
  for (let o = game.invent; o; o = o.nobj) if (o.olet === '=') rings.push(o);
  const wornCount = (game.uright ? 1 : 0) + (game.uleft ? 1 : 0);
  const unwornRings = rings.filter(r => r !== game.uright && r !== game.uleft);

  let key;

  if (phase === 'explore') {
    // Find nearest ring on floor within maxDist
    let nearest = null, nearDist = Infinity;
    for (let obj = game.fobj; obj; obj = obj.nobj) {
      if (obj.olet !== '=') continue;
      const md = Math.abs(obj.ox - game.u.ux) + Math.abs(obj.oy - game.u.uy);
      if (md <= maxDist && md < nearDist) { nearDist = md; nearest = obj; }
    }

    if (nearest) {
      const k = bfsKey(nearest.ox, nearest.oy);
      key = k || 'h';
    } else if (rings.length > 0) {
      // Ring in inventory — proceed with operations
      ringPickedUp = true;
      phase = 'armor_ops';
      key = 'T';  // take off starting armor
    } else {
      // No ring found — quit
      phase = 'quit';
      key = 'Q';
    }
  } else if (phase === 'armor_ops') {
    if (!armorPhaseDone) {
      // After T (take off armor), now press W to re-wear
      armorPhaseDone = true;
      phase = 'ring_ops';
      key = 'W';  // wear armor back
    } else {
      phase = 'ring_ops';
      key = 'P';  // wear first ring
    }
  } else if (phase === 'ring_ops') {
    if (wornCount === 0 && !ring1Worn) {
      // Wear first ring
      key = 'P';
      ring1Worn = true;
    } else if (wornCount === 1 && !ring2Worn && unwornRings.length > 0) {
      // Wear second ring (auto-placed on free hand)
      key = 'P';
      ring2Worn = true;
    } else if (wornCount > 0 && !ring1Removed) {
      // Remove a ring
      key = 'R';
      ring1Removed = true;
    } else if (wornCount > 0 && !ring2Removed) {
      key = 'R';
      ring2Removed = true;
    } else {
      phase = 'quit';
      key = 'Q';
    }
  } else {
    // Quit
    key = keyLog[keyLog.length - 1] === 'Q' ? 'y' : 'Q';
    if (key === 'y') throw new BotDone();
  }

  // Stuck detection
  const pos = `${game.u.ux},${game.u.uy}`;
  if (pos === lastPos && phase === 'explore') {
    stuckCount++;
    if (stuckCount > 8) { key = 'hjklyubn'[stepCount % 8]; stuckCount = 0; }
  } else if (phase !== 'explore') stuckCount = 0;
  lastPos = pos;

  keyLog.push(key);
  return key;
};

process.stderr.write(`RingBot: seed=${seed} maxDist=${maxDist}\n`);

try {
  await gameLoop(seed);
} catch (e) {
  if (!(e instanceof BotDone) && !(e instanceof GameOver)) throw e;
  if (e instanceof GameOver) process.stderr.write(`  Game over at step ${stepCount}\n`);
}

// Ensure quit
if (!keyLog.includes('y') || keyLog[keyLog.length - 1] !== 'y') {
  keyLog.push('Q');
  keyLog.push('y');
}

const wornFinal = [game.uright, game.uleft].filter(Boolean).length;
const ri = [];
for (let o = game.invent; o; o = o.nobj) if (o.olet === '=') ri.push(o.otyp);
process.stderr.write(`Done: ${stepCount} steps, ring_otyps=${ri}, worn=${wornFinal}, armor=${armorPhaseDone}, r1=${ring1Worn}, r2=${ring2Worn}\n`);
process.stdout.write(keyLog.join(''));
