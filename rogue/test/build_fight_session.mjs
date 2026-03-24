#!/usr/bin/env node
/**
 * build_fight_session.mjs — Fight coverage: bare-fist, is_magic, L kill.
 *
 * Targets:
 *   fight.js:468-474  — thunk() non-weapon (bare-fist hit)
 *   fight.js:480-486  — bounce() non-weapon (bare-fist miss)
 *   fight.js:492-503  — is_magic() all branches (via P_TFIND)
 *   fight.js:531-544  — killed('L') Leprechaun gold drop in lit room
 *   fight.js:548-556  — killed() monster pack drops
 *
 * Seed 30, level 8: Leprechaun at (5,36), player at (5,32), distance 4.
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
const SEED = 30;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }

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

// Exclude trap chars from pathfinding to avoid walking into traps
const PASSABLE = '.#:+!?/=)*],%*&';

function walkTo(ty, tx) {
  const g = game();
  if (g.player.t_pos.y === ty && g.player.t_pos.x === tx) return '';
  const visited = new Set();
  const queue = [[g.player.t_pos.y, g.player.t_pos.x, []]];
  visited.add(g.player.t_pos.y * 80 + g.player.t_pos.x);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 30) continue;
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

function adjacentMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    const ny = py+dy, nx = px+dx;
    if (g.mw[ny]?.[nx] >= 'A' && g.mw[ny]?.[nx] <= 'Z') return ch;
  }
  return null;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // === SETUP: Ctrl-H + level up ===
  a(() => '\x08');
  // Level up so we can one-shot weak monsters and survive
  for (let i = 0; i < 6; i++) {
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  heal(); heal(); heal();

  // === GO TO LEVEL 8 (L is at (5,36), player at (5,32)) ===
  for (let i = 0; i < 7; i++) a(() => '\x04');

  // === P_TFIND: detect magic items on floor (is_magic coverage) ===
  // Level 8 should have items on the floor
  a(() => createItem('!', 7));  // P_TFIND
  a(() => { const l = findPackLetter('!', 7); return l ? 'q' + l : '.'; });

  // === BARE-FIST COMBAT: drop weapon, teleport next to monster, punch ===
  a(() => {
    const g = game();
    if (g.cur_weapon) {
      let letter = 'a';
      for (let item = g.pack; item; item = item.l_next) {
        if (item.l_data === g.cur_weapon) return 'd' + letter;
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      }
    }
    return '.';
  });

  // Teleport until adjacent to a non-L monster, then punch
  for (let attempt = 0; attempt < 8; attempt++) {
    a(() => {
      const d = adjacentMonsterDir();
      if (d) return d.repeat(12);  // Punch!
      return '\x14';  // Teleport
    });
  }
  heal();

  // === Re-equip weapon ===
  a(() => createItem(')', 6, '+'));
  a(() => {
    const l = findPackLetter(')', 6);
    return l ? 'w' + l : '.';
  });

  // === KILL LEPRECHAUN in lit room (L gold drop) ===
  // Use BFS to walk to L, then attack
  a(() => {
    const g = game();
    for (let m = g.mlist; m; m = m.l_next) {
      if (m.l_data.t_type === 'L') {
        const path = walkTo(m.l_data.t_pos.y, m.l_data.t_pos.x);
        if (path.length > 0) {
          const last = path[path.length - 1];
          console.error(`  L at (${m.l_data.t_pos.y},${m.l_data.t_pos.x}), path=${path.length} steps`);
          return path + last.repeat(10);
        }
        // Teleport closer
        return '\x14';
      }
    }
    console.error('  No Leprechaun found!');
    return '.';
  });
  // Second attempt after teleport
  a(() => {
    const g = game();
    for (let m = g.mlist; m; m = m.l_next) {
      if (m.l_data.t_type === 'L') {
        const path = walkTo(m.l_data.t_pos.y, m.l_data.t_pos.x);
        if (path.length > 0) {
          const last = path[path.length - 1];
          return path + last.repeat(10);
        }
      }
    }
    return '.';
  });
  heal();

  // === THROW NON-WEAPON at monster (thunk/bounce non-weapon coverage) ===
  // Create a ring and throw it at a monster
  a(() => createItem('=', 5));  // R_NOP
  // Find direction to a monster and throw the ring
  a(() => {
    const g = game();
    const ringLetter = findPackLetter('=', 5);
    if (!ringLetter) return '.';
    // Find a cardinal direction with a monster
    const py = g.player.t_pos.y, px = g.player.t_pos.x;
    for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
      let y=py+dy, x=px+dx;
      for (let i=0;i<12;i++) {
        if (y<1||y>=23||x<0||x>=80) break;
        if (g.mw[y]?.[x]>='A'&&g.mw[y]?.[x]<='Z') {
          // 't' command: direction then item letter
          return 't' + ch + ringLetter;
        }
        const s=g.stdscr[y][x];
        if (s==='|'||s==='-'||s===' '||s==='+') break;
        y+=dy; x+=dx;
      }
    }
    // No monster in line — teleport and try
    return '\x14';
  });
  // Second attempt
  a(() => {
    const g = game();
    const ringLetter = findPackLetter('=', 5);
    if (!ringLetter) return '.';
    const py = g.player.t_pos.y, px = g.player.t_pos.x;
    for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
      let y=py+dy, x=px+dx;
      for (let i=0;i<12;i++) {
        if (y<1||y>=23||x<0||x>=80) break;
        if (g.mw[y]?.[x]>='A'&&g.mw[y]?.[x]<='Z') return 't' + ch + ringLetter;
        const s=g.stdscr[y][x];
        if (s==='|'||s==='-'||s===' '||s==='+') break;
        y+=dy; x+=dx;
      }
    }
    return '.';
  });
  heal();

  // === QUIT ===
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
      console.error(`Ended at step ${keyCount}: ${e.message}`);
  }
  if (pendingKey !== null)
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });

  console.error(`Session: ${steps.length} steps, ${actionIdx}/${actions.length} actions`);
  const session = { seed: SEED, wizard: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_fight_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
