#!/usr/bin/env node
/**
 * build_edge_session.mjs — Session targeting deep edge cases.
 *
 * Targets: fight.js killed(L), killed while blind, is_magic, thunk/bounce;

 *   sticks.js bolt hitting monster, haste/slow on monster;
 *   move.js arrow/dart trap hit/miss paths.
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
const SEED = 555;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }
const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`';

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

function walkTo(ty, tx) {
  const g = game();
  const sy = g.player.t_pos.y, sx = g.player.t_pos.x;
  if (sy === ty && sx === tx) return '';
  const visited = new Set();
  const queue = [[sy, sx, []]];
  visited.add(sy * 80 + sx);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 60) continue;
    for (const [dy,dx,ch] of [[-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],[0,-1,'h'],[0,1,'l'],[1,-1,'b'],[1,0,'j'],[1,1,'n']]) {
      const ny = cy+dy, nx = cx+dx;
      if (ny<1||ny>=23||nx<1||nx>=79) continue;
      const key = ny*80+nx;
      if (visited.has(key)) continue;
      const cell = g.stdscr[ny][nx];
      if (!PASSABLE.includes(cell)) continue;
      if (dy!==0&&dx!==0) {
        if (!PASSABLE.includes(g.stdscr[cy+dy]?.[cx]||' ')||!PASSABLE.includes(g.stdscr[cy]?.[cx+dx]||' ')) continue;
      }
      visited.add(key);
      const np = [...path, ch];
      if (ny===ty&&nx===tx) return np.join('');
      queue.push([ny, nx, np]);
    }
  }
  return '';
}

function findMonsterOfType(type) {
  const g = game();
  for (let m = g.mlist; m; m = m.l_next)
    if (m.l_data.t_type === type) return m.l_data;
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

function createItem(type, which, blessing) {
  let k = 'C' + type + hexChar(which);
  if (blessing !== undefined) k += blessing;
  return k;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));  // P_XHEAL
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  function huntMonster(type) {
    for (let attempt = 0; attempt < 6; attempt++) {
      a(() => {
        const m = findMonsterOfType(type);
        if (!m) return '.';
        const path = walkTo(m.t_pos.y, m.t_pos.x);
        if (path.length > 0 && path.length <= 35) {
          const last = path[path.length - 1];
          return path + last.repeat(20);
        }
        return '\x14';  // teleport to retry
      });
    }
    heal(); heal();
  }

  // === SETUP: Level up heavily, heal massively ===
  a(() => '\x08');  // Ctrl-H
  for (let i = 0; i < 14; i++) {
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 10; i++) heal();

  // === IDENTIFY ALL ITEM TYPES via whatis (scrolls.js coverage) ===
  // Create one of each type, then use S_IDENT to identify each
  // This hits all 6 branches in whatis(): SCROLL, POTION, STICK, WEAPON, ARMOR, RING
  const identTargets = [
    ['?', 14],  // S_NOP (scroll)
    ['!', 13],  // P_NOP (potion)
    ['/', 10],  // WS_NOP (stick)
    [')', 0, 'n'],  // MACE (weapon, neutral)
    [']', 0, 'n'],  // LEATHER (armor, neutral)
    ['=', 5],   // R_NOP (ring)
  ];
  for (const [type, which, bless] of identTargets) {
    a(() => createItem(type, which, bless));
    a(() => createItem('?', 6));  // S_IDENT
    a(() => {
      const scrollLetter = findPackLetter('?', 6);
      const itemLetter = findPackLetter(type, which);
      if (!scrollLetter || !itemLetter) return '.';
      return 'r' + scrollLetter + itemLetter;
    });
  }



  a(() => {
    const g = game();

    return '.';
  });
  // Create unknown ring, wear it — should prompt "Call it:"
  a(() => createItem('=', 12));  // R_STEALTH (unknown type)
  a(() => {
    const l = findPackLetter('=', 12);
    return l ? 'P' + l + 'l' + 'stealth\n' : '.';  // wear left, name it
  });
  // Create second ring, wear right
  a(() => createItem('=', 3));  // R_SEARCH (unknown)
  a(() => {
    const l = findPackLetter('=', 3);
    return l ? 'P' + l + 'r' + 'search\n' : '.';  // wear right, name it
  });
  // Ring off with both worn: gethand prompt, test 'x' (bad input) then 'l'
  a(() => 'Rxl');  // R → gethand "L or R?" → 'x' (bad) → reprompt → 'l'
  // Remove right (auto-selects since only one left)
  a(() => 'R');



  // === KILL WHILE BLIND (fight.js line 515) ===
  // Go to level 5 where there are monsters
  for (let i = 0; i < 4; i++) a(() => '\x04');
  heal();
  // Drink P_BLIND, then find and kill a monster
  a(() => createItem('!', 12));  // P_BLIND
  a(() => { const l = findPackLetter('!', 12); return l ? 'q' + l : '.'; });
  // Kill closest monster while blind
  a(() => {
    const g = game();
    let best = null, bestDist = Infinity;
    for (let m = g.mlist; m; m = m.l_next) {
      const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
      if (d < bestDist) { bestDist = d; best = m.l_data; }
    }
    if (!best) return '.';
    const path = walkTo(best.t_pos.y, best.t_pos.x);
    if (path.length > 0 && path.length <= 15) {
      const last = path[path.length - 1];
      return path + last.repeat(15);
    }
    // Teleport toward it
    return '\x14';
  });
  // More attempts while still blind
  a(() => {
    const g = game();
    let best = null, bestDist = Infinity;
    for (let m = g.mlist; m; m = m.l_next) {
      const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
      if (d < bestDist) { bestDist = d; best = m.l_data; }
    }
    if (!best) return '.';
    const path = walkTo(best.t_pos.y, best.t_pos.x);
    if (path.length > 0 && path.length <= 20) {
      const last = path[path.length - 1];
      return path + last.repeat(15);
    }
    return '.';
  });
  heal(); heal();

  // === TREASURE FIND POTION (is_magic coverage in fight.js) ===
  a(() => createItem('!', 7));  // P_TFIND
  a(() => { const l = findPackLetter('!', 7); return l ? 'q' + l : '.'; });

  // === HUNT LEPRECHAUN (L) for killed() gold drop ===
  // Go to level 10-12 where L appears (index 10 in lvl_mons)
  a(() => {
    const g = game();
    const target = 10;
    if (g.level < target) return '\x04'.repeat(target - g.level);
    if (g.level > target) return '\x15'.repeat(g.level - target);
    return '.';
  });
  heal();
  huntMonster('L');

  // Try more levels for L
  a(() => '\x04'); huntMonster('L');
  a(() => '\x04'); huntMonster('L');

  // === BOLT WANDS AT MONSTERS (sticks.js bolt + monster paths) ===
  // WS_ELECT(2) aimed at monster
  a(() => createItem('/', 2));
  a(() => { const l = findPackLetter('/', 2); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });
  heal();
  // WS_FIRE(3) aimed at monster
  a(() => createItem('/', 3));
  a(() => { const l = findPackLetter('/', 3); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });
  heal();

  // === HASTE/SLOW MONSTER WANDS hitting actual monsters ===
  a(() => createItem('/', 7));  // WS_HASTE_M
  a(() => { const l = findPackLetter('/', 7); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });
  a(() => createItem('/', 8));  // WS_SLOW_M
  a(() => { const l = findPackLetter('/', 8); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });

  // === THROWN WEAPON: throw arrow/dart (thunk/bounce non-weapon paths) ===
  // Create an arrow and throw it at a monster
  a(() => createItem(')', 4, 'n'));  // ARROW
  a(() => {
    const l = findPackLetter(')', 4);
    const d = findMonsterDir();
    if (l && d) return 't' + d + l;  // throw command: direction then item letter... wait
    return '.';
  });

  // === DEEP DIVE for more arrow/dart traps ===
  for (let i = 0; i < 5; i++) a(() => '\x04');
  heal(); heal();

  // Walk into traps
  a(() => {
    const g = game();
    const keys = [];
    for (let i = 0; i < Math.min(g.ntraps, 4); i++) {
      const t = g.traps[i];
      const path = walkTo(t.tr_pos.y, t.tr_pos.x);
      if (path.length > 0 && path.length <= 20) keys.push(path);
    }
    return keys.join('') || '.';
  });
  heal(); heal();

  // === QUIT ===
  a(() => 'Qy');

  return actions;
}

async function main() {
  const display = new MockDisplay();
  const input = new MockInput();
  const g = new GameState();
  g.display = display; g.input = input; g.rawRngLog = [];
  g.suppressMore = true;
  g.wizard = true; g.waswizard = true;
  setGame(g);
  wireGameDeps(g);
  await startGameState(g, SEED);

  const actions = buildActions();
  const steps = [];
  let keyCount = 0, pendingKey = null, charQueue = [], actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];
    if (pendingKey !== null) steps.push({ key: pendingKey, rng, screen });
    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) charQueue = [...result];
    }
    const key = charQueue.shift();
    pendingKey = key;
    keyCount++;
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

  const session = { seed: SEED, wizard: true, coverage_only: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_edge_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
