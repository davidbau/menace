#!/usr/bin/env node
/**
 * build_combat_session.mjs — Build a session focused on fight/item coverage.
 *
 * Targets uncovered paths in fight.js (killed F/L, pack drops),
 * sticks.js (bolt wands on monsters, haste/slow), rings.js (ring_off,
 * gethand), misc.js (is_current, add_haste, search, get_dir confused),
 * command.js (call_item, get_line), scrolls.js (whatis).
 *
 * Strategy: wizard mode, go deep, use inside knowledge to find monsters
 * and traps, create targeted items, exercise each uncovered path.
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
const SEED = 888;

class SessionDone extends Error {}

function hexChar(n) {
  return n < 10 ? String(n) : String.fromCharCode('a'.charCodeAt(0) + n - 10);
}

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

function findFirstUnequippedLetter() {
  const g = game();
  let letter = 'a';
  for (let item = g.pack; item; item = item.l_next) {
    const obj = item.l_data;
    if (obj !== g.cur_weapon && obj !== g.cur_armor &&
        obj !== g.cur_ring[0] && obj !== g.cur_ring[1])
      return letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return null;
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
    for (const [dy, dx, ch] of [[-1,-1,'y'],[-1,0,'k'],[-1,1,'u'],[0,-1,'h'],[0,1,'l'],[1,-1,'b'],[1,0,'j'],[1,1,'n']]) {
      const ny = cy + dy, nx = cx + dx;
      if (ny < 1 || ny >= 23 || nx < 1 || nx >= 79) continue;
      const key = ny * 80 + nx;
      if (visited.has(key)) continue;
      const cell = g.stdscr[ny][nx];
      if (!PASSABLE.includes(cell)) continue;
      if (dy !== 0 && dx !== 0) {
        if (!PASSABLE.includes(g.stdscr[cy+dy]?.[cx] || ' ') || !PASSABLE.includes(g.stdscr[cy]?.[cx+dx] || ' ')) continue;
      }
      visited.add(key);
      const np = [...path, ch];
      if (ny === ty && nx === tx) return np.join('');
      queue.push([ny, nx, np]);
    }
  }
  return '';
}

function dirChar(dy, dx) {
  if (dy===-1&&dx===-1) return 'y'; if (dy===-1&&dx===0) return 'k';
  if (dy===-1&&dx===1) return 'u'; if (dy===0&&dx===-1) return 'h';
  if (dy===0&&dx===1) return 'l'; if (dy===1&&dx===-1) return 'b';
  if (dy===1&&dx===0) return 'j'; if (dy===1&&dx===1) return 'n';
  return '.';
}

function findMonsterOfType(type) {
  const g = game();
  for (let m = g.mlist; m; m = m.l_next)
    if (m.l_data.t_type === type) return m.l_data;
  return null;
}

function findClosestMonster() {
  const g = game();
  let best = null, bestDist = Infinity;
  for (let m = g.mlist; m; m = m.l_next) {
    const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
    if (d < bestDist) { bestDist = d; best = m.l_data; }
  }
  return best;
}

function findMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    let y = py+dy, x = px+dx;
    for (let i = 0; i < 12; i++) {
      if (y<1||y>=23||x<0||x>=80) break;
      if (g.mw[y][x] >= 'A' && g.mw[y][x] <= 'Z') return ch;
      const s = g.stdscr[y][x];
      if (s==='|'||s==='-'||s===' '||s==='+') break;
      y += dy; x += dx;
    }
  }
  return null;
}

function walkToAndAttack(ty, tx, maxSteps) {
  const path = walkTo(ty, tx);
  if (path.length === 0 || path.length > (maxSteps || 25)) return '';
  const last = path[path.length - 1];
  return path + last.repeat(15);  // Keep swinging to ensure kill
}

function createItem(type, which, blessing) {
  let keys = 'C' + type + hexChar(which);
  if (blessing !== undefined) keys += blessing;
  return keys;
}

function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  function heal() {
    a(() => createItem('!', 9));  // P_XHEAL
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // ================================================================
  // PHASE 1: Setup — wizard mode, level up, equip
  // ================================================================
  a(() => '\x08');  // Ctrl-H (equip sword + plate)
  for (let i = 0; i < 12; i++) {  // Level up to ~13 for deep dives
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  heal(); heal(); heal(); heal(); heal(); heal(); heal(); heal();

  // ================================================================
  // PHASE 2: is_current() — try to wield already-wielded weapon
  // ================================================================
  a(() => {
    const g = game();
    if (g.cur_weapon) {
      // Find cur_weapon letter
      let letter = 'a';
      for (let item = g.pack; item; item = item.l_next) {
        if (item.l_data === g.cur_weapon) return 'w' + letter;  // wield same weapon
        letter = String.fromCharCode(letter.charCodeAt(0) + 1);
      }
    }
    return '.';
  });

  // ================================================================
  // PHASE 3: Rings — wear two, test ring_off with gethand
  // ================================================================
  // Create two rings
  a(() => createItem('=', 1, '+'));  // R_ADDSTR (+)
  a(() => { const l = findPackLetter('=', 1); return l ? 'P' + l + 'l' : '.'; });  // wear left
  a(() => createItem('=', 9));  // R_REGEN
  a(() => { const l = findPackLetter('=', 9); return l ? 'P' + l + 'r' : '.'; });  // wear right
  // Ring off with gethand (both rings worn)
  a(() => 'Rl');   // remove left
  a(() => 'Rr');   // remove right (only one left, auto-selects)

  // ================================================================
  // PHASE 4: call_item + get_line (command.js)
  // ================================================================
  a(() => createItem('!', 13));  // P_NOP (unknown potion)
  a(() => {
    const l = findPackLetter('!', 13);
    if (!l) return '.';
    return 'c' + l + 'magic\n';  // call it "magic" then Enter
  });
  // Test get_line with backspace and ESC
  a(() => createItem('?', 14));  // S_NOP (unknown scroll)
  a(() => {
    const l = findPackLetter('?', 14);
    if (!l) return '.';
    return 'c' + l + 'ab\x7fc\n';  // type "ab", backspace, type "c" → "ac", Enter
  });

  // ================================================================
  // PHASE 5: Go deep for Leprechaun (L) and Fungi (F)
  // ================================================================
  // Go to level 12 for Leprechaun, level 20 for Fungi
  for (let i = 0; i < 11; i++) a(() => '\x04');  // Ctrl-D × 11 → level 12
  heal(); heal();

  // Hunt for specific monster types across multiple levels
  // Helper: try to find and kill a specific monster type on current level
  function huntMonster(type) {
    // Try Ctrl-T (teleport) repeatedly to land near the monster
    // Ctrl-T teleports player to random room position
    for (let attempt = 0; attempt < 5; attempt++) {
      a(() => {
        const m = findMonsterOfType(type);
        if (!m) return '.';
        const path = walkToAndAttack(m.t_pos.y, m.t_pos.x, 30);
        if (path) return path;
        return '\x14';  // Ctrl-T teleport to try a new position
      });
    }
    heal();
  }

  // Hunt Leprechaun (L) — levels 8-15
  huntMonster('L');
  a(() => '\x04'); huntMonster('L');
  a(() => '\x04'); huntMonster('L');

  // Go deeper for Fungi (F) and pack-carrying monsters
  for (let i = 0; i < 6; i++) a(() => '\x04');  // ~level 20+
  heal(); heal();

  // Hunt Fungi (F) across several levels
  huntMonster('F');
  a(() => '\x04'); huntMonster('F');
  a(() => '\x04'); huntMonster('F');
  a(() => '\x04'); huntMonster('F');

  // Kill any monster with pack (m_carry > 0) for pack drop coverage
  // High-carry monsters: Dragon(100), Nymph(100), Mimic(30), Troll(15), Centaur(15)
  a(() => {
    const g = game();
    for (let m = g.mlist; m; m = m.l_next) {
      const idx = m.l_data.t_type.charCodeAt(0) - 65;
      if (g.monsters[idx].m_carry > 0) {
        return walkToAndAttack(m.l_data.t_pos.y, m.l_data.t_pos.x, 25);
      }
    }
    return '.';
  });
  heal();

  // ================================================================
  // PHASE 6: Sticks — zap at actual monsters
  // ================================================================
  // Go to level with monsters
  a(() => '\x04');
  heal();

  // WS_HASTE_M (7) — zap at monster
  a(() => createItem('/', 7));
  a(() => {
    const l = findPackLetter('/', 7);
    const d = findMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  // WS_SLOW_M (8) — zap at same/different monster
  a(() => createItem('/', 8));
  a(() => {
    const l = findPackLetter('/', 8);
    const d = findMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  // WS_DRAIN (9) — in a room with monsters
  a(() => createItem('/', 9));
  a(() => {
    const l = findPackLetter('/', 9);
    return l ? 'z' + l + 'l' : '.';
  });
  heal();

  // WS_ELECT (2), WS_FIRE (3), WS_COLD (4) — bolt wands at monsters
  for (const ws of [2, 3, 4]) {
    a(() => createItem('/', ws));
    a(() => {
      const l = findPackLetter('/', ws);
      const d = findMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
    heal();
  }

  // ================================================================
  // PHASE 7: Confusion + get_dir (misc.js)
  // ================================================================
  a(() => createItem('!', 0));  // P_CONFUSE
  a(() => { const l = findPackLetter('!', 0); return l ? 'q' + l : '.'; });
  // Move around while confused — may trigger rndmove-like behavior
  a(() => 'hhllkkjj');
  heal();

  // ================================================================
  // PHASE 8: Haste exhaustion (add_haste)
  // ================================================================
  a(() => createItem('!', 10));  // P_HASTE
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  // Wait a few turns while hasted
  a(() => '....');
  // Drink haste again while still hasted → exhaustion
  a(() => createItem('!', 10));
  a(() => { const l = findPackLetter('!', 10); return l ? 'q' + l : '.'; });
  heal();

  // ================================================================
  // PHASE 9: Search near traps + secret doors
  // ================================================================
  a(() => {
    const g = game();
    // Find a trap to search near
    for (let i = 0; i < g.ntraps; i++) {
      const t = g.traps[i];
      // Walk adjacent to the trap
      for (const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ay = t.tr_pos.y + dy, ax = t.tr_pos.x + dx;
        if (ay < 1 || ay >= 23 || ax < 1 || ax >= 79) continue;
        const ch = g.stdscr[ay][ax];
        if (ch === '.' || ch === '#') {
          const path = walkTo(ay, ax);
          if (path.length > 0 && path.length <= 20)
            return path + 'sssssssss';  // Search heavily
        }
      }
    }
    return 'sssss';
  });

  // Find secret door
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++) {
      for (let x = 1; x < 79; x++) {
        if (g.stdscr[y][x] === '&') {
          for (const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const ay = y+dy, ax = x+dx;
            const ch = g.stdscr[ay]?.[ax];
            if (ch === '.' || ch === '#') {
              const path = walkTo(ay, ax);
              if (path.length > 0 && path.length <= 15)
                return path + 'ssssssssssssss';
            }
          }
        }
      }
    }
    return '.';
  });

  // ================================================================
  // PHASE 10: Walk into traps for be_trapped coverage
  // ================================================================
  a(() => {
    const g = game();
    const results = [];
    for (let i = 0; i < Math.min(g.ntraps, 3); i++) {
      const t = g.traps[i];
      const path = walkTo(t.tr_pos.y, t.tr_pos.x);
      if (path.length > 0 && path.length <= 20) results.push(path);
    }
    return results.join('') || '.';
  });
  heal(); heal();

  // ================================================================
  // PHASE 11: identify command ('/') + whatis
  // ================================================================
  a(() => createItem('?', 6));  // S_IDENT
  a(() => {
    const l = findPackLetter('?', 6);
    if (!l) return '.';
    // Read identify, then pick first unidentified item
    const u = findFirstUnequippedLetter();
    return 'r' + l + (u || 'a');
  });

  // ================================================================
  // PHASE 12: Drop to free pack space, then quit
  // ================================================================
  a(() => {
    const g = game();
    let keys = '';
    while (g.inpack > 5) {
      const l = findFirstUnequippedLetter();
      if (!l) break;
      keys += 'd' + l;
      // Simulate drop (inpack updates happen in-game, not here)
      break;  // Just drop one per action to keep it simple
    }
    return keys || '.';
  });
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
  const outPath = join(__dirname, 'sessions', 'wizard_combat_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
