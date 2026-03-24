#!/usr/bin/env node
/**
 * build_coverage_b_session.mjs — Part B of mega-session coverage.
 *
 * Covers sticks/wands (all 14 types), rings (all 13 types),
 * misc commands (identify, call, search), create weapons/armor,
 * and victory (amulet + escape). Kept under ~250 steps to avoid
 * daemon timing drift.
 *
 * Part A (wizard_coverage_max) covers setup, all potions, first scrolls.
 */

{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(key) { return _store.has(key) ? _store.get(key) : null; },
    setItem(key, value) { _store.set(key, String(value)); },
    removeItem(key) { _store.delete(key); },
    clear() { _store.clear(); },
    get length() { return _store.size; },
    key(i) { return [..._store.keys()][i] ?? null; },
  };
}

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { command } from '../js/command.js';
import { roomin } from '../js/rooms.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED = 777;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }
const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`&';

function findPackLetter(type, which) {
  const g = game();
  let letter = 'a', found = null;
  for (let item = g.pack; item; item = item.l_next) {
    if (item.l_data.o_type === type && (which === undefined || item.l_data.o_which === which))
      found = letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return found;
}

function findFirstUnequippedLetter() {
  const g = game();
  let letter = 'a';
  for (let item = g.pack; item; item = item.l_next) {
    const obj = item.l_data;
    if (obj !== g.cur_weapon && obj !== g.cur_armor &&
        obj !== g.cur_ring[0] && obj !== g.cur_ring[1]) return letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return null;
}

function findMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    let y=py+dy, x=px+dx;
    for (let i=0;i<12;i++) {
      if (y<1||y>=23||x<0||x>=80) break;
      if (g.mw[y][x]>='A'&&g.mw[y][x]<='Z') return ch;
      const s=g.stdscr[y][x];
      if (s==='|'||s==='-'||s===' '||s==='+') break;
      y+=dy; x+=dx;
    }
  }
  return null;
}

function walkTo(ty, tx) {
  const g = game();
  if (g.player.t_pos.y === ty && g.player.t_pos.x === tx) return '';
  const visited = new Set();
  const queue = [[g.player.t_pos.y, g.player.t_pos.x, []]];
  visited.add(g.player.t_pos.y * 80 + g.player.t_pos.x);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 60) continue;
    for (const [dy,dx,ch] of [[-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],[0,-1,'h'],[0,1,'l'],[1,-1,'b'],[1,0,'j'],[1,1,'n']]) {
      const ny=cy+dy, nx=cx+dx;
      if (ny<1||ny>=23||nx<1||nx>=79) continue;
      const key=ny*80+nx;
      if (visited.has(key)) continue;
      if (!PASSABLE.includes(g.stdscr[ny][nx])) continue;
      if (dy!==0&&dx!==0&&(!PASSABLE.includes(g.stdscr[cy+dy]?.[cx]||' ')||!PASSABLE.includes(g.stdscr[cy]?.[cx+dx]||' '))) continue;
      visited.add(key);
      const np=[...path,ch];
      if (ny===ty&&nx===tx) return np.join('');
      queue.push([ny,nx,np]);
    }
  }
  return '';
}

function createItem(type, which, blessing) {
  let k = 'C' + type + hexChar(which);
  if (blessing !== undefined) k += blessing;
  return k;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // === SETUP ===
  a(() => '\x08');  // Ctrl-H
  heal(); heal(); heal();

  // === ALL 14 STICK/WAND TYPES ===
  const stickOrder = [0, 10, 9, 6, 1, 2, 3, 4, 5, 7, 8, 11, 12, 13];
  for (const w of stickOrder) {
    a(() => createItem('/', w));
    a(() => {
      const l = findPackLetter('/', w);
      return l ? 'z' + l + (findMonsterDir() || 'l') : '.';
    });
    if ([2, 3, 4, 9].includes(w)) heal();
  }

  // === ALL 13 RING TYPES (wear + remove) ===
  const ringOrder = [1, 0, 4, 9, 2, 3, 5, 7, 8, 10, 11, 12, 6];
  for (const r of ringOrder) {
    const needBless = [0, 1, 7, 8].includes(r);
    a(() => createItem('=', r, needBless ? '+' : undefined));
    a(() => { const l = findPackLetter('=', r); return l ? 'P' + l + 'l' : '.'; });
    a(() => 'Rl');
  }

  // === MISC COMMANDS ===
  a(() => '/@');  // identify @
  a(() => '/!');  // identify !
  a(() => 'ss');  // search

  // === CREATE WEAPONS/ARMOR WITH BLESSINGS ===
  a(() => createItem(')', 0, '+'));
  a(() => createItem(')', 1, '-'));
  a(() => createItem(']', 0, '+'));
  a(() => createItem(']', 1, '-'));

  // === Ctrl-N charge a stick ===
  a(() => createItem('/', 0));
  a(() => { const l = findPackLetter('/', 0); return l ? '\x0e' + l : '.'; });

  // === Wizard info ===
  a(() => '\x05');  // Ctrl-E food
  a(() => '\x01');  // Ctrl-A pack count
  a(() => '@');     // position
  a(() => '\x09');  // Ctrl-I floor items

  // === LEVEL CHANGE ===
  a(() => '\x04');  // Ctrl-D down
  a(() => 'ss');
  a(() => '\x15');  // Ctrl-U up
  heal();

  // === DROP items to make room for amulet ===
  for (let i = 0; i < 5; i++) {
    a(() => {
      const g = game();
      if (g.inpack >= 22) {
        const l = findFirstUnequippedLetter();
        return l ? 'd' + l : '.';
      }
      return '.';
    });
  }

  // === VICTORY: create amulet, walk to stairs, escape ===
  a(() => 'C,0');
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++)
      for (let x = 1; x < 79; x++)
        if (g.stdscr[y][x] === '%') {
          const path = walkTo(y, x);
          if (path.length > 0) return path;
        }
    return '.';
  });
  a(() => '<');

  // Fallback
  a(() => 'Qy');

  return actions;
}

async function main() {
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true; g.wizard = true; g.waswizard = true;
  setGame(g); wireGameDeps(g); await startGameState(g, SEED);

  const actions = buildActions();
  const steps = [];
  let keyCount = 0, pendingKey = null, charQueue = [], actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog]; g.rawRngLog = [];
    if (pendingKey !== null) steps.push({ key: pendingKey, rng, screen });
    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) charQueue = [...result];
    }
    const key = charQueue.shift();
    pendingKey = key; keyCount++;
    return key;
  };

  try {
    g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
    g.oldrp = roomin(g.player.t_pos);
    while (g.playing) await command();
  } catch (e) {
    if (!(e instanceof SessionDone))
      console.error(`Ended at step ${keyCount} (action ${actionIdx}/${actions.length}): ${e.message}`);
  }
  if (pendingKey !== null)
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });

  console.error(`Session: ${steps.length} steps, ${actionIdx}/${actions.length} actions`);
  const session = { seed: SEED, wizard: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_coverage_b.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
