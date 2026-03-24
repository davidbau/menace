#!/usr/bin/env node
/**
 * build_final_session.mjs — Final coverage push targeting remaining gaps.
 *
 * Targets:
 *   fight.js:515   — kill monster while blind ("Defeated it.")
 *   sticks.js:291-302 — bolt wand hits monster (fail save) AND misses (save throw)
 *   misc.js:363-367 — search() finds secret door (SECRETDOOR → DOOR)
 *   rings.js:147-159 — get_str() backspace + ESC paths during ring naming
 *   sticks.js:247-259 — haste/slow wand actually hitting a monster in line-of-sight
 *   fight.js:468-474, 480-486 — thunk/bounce for non-WEAPON thrown items
 *   fight.js:492-503 — is_magic() all branches
 *
 * Strategy:
 *   - Use inside knowledge to find secret doors, position near them, search
 *   - Blind + teleport next to monster + attack to kill while blind
 *   - Multiple bolt zaps at monsters (some will hit, some will miss based on save throw)
 *   - Zap haste/slow wands at monsters with line-of-sight verification
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
const SEED = 444;

class SessionDone extends Error {}

function hexChar(n) { return n < 10 ? String(n) : String.fromCharCode(97 + n - 10); }
const PASSABLE = '.#:+!?/=)*]^,%*>{$}~`&';  // Include & for secret doors

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

// Find direction toward nearest wall (for bolt bounce)
function findWallDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  let bestDir = null, bestDist = Infinity;
  for (const [dy, dx, ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
    let y = py + dy, x = px + dx, dist = 1;
    while (y >= 1 && y < 23 && x >= 1 && x < 79) {
      const cell = g.stdscr[y][x];
      if (cell === '|' || cell === '-' || cell === ' ' || cell === '+') {
        if (dist < bestDist) { bestDist = dist; bestDir = ch; }
        break;
      }
      y += dy; x += dx; dist++;
    }
  }
  return bestDir;
}

// Find an adjacent monster and return its direction char
function adjacentMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    const ny = py+dy, nx = px+dx;
    if (ny>=0 && ny<24 && nx>=0 && nx<80 && g.mw[ny][nx] >= 'A' && g.mw[ny][nx] <= 'Z')
      return ch;
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
    a(() => createItem('!', 9));
    a(() => { const l = findPackLetter('!', 9); return l ? 'q' + l : '.'; });
  }

  // ================================================================
  // SETUP
  // ================================================================
  a(() => '\x08');  // Ctrl-H
  for (let i = 0; i < 14; i++) {
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 8; i++) heal();

  // ================================================================
  // SEARCH FOR SECRET DOORS (misc.js:363-367)
  // Secret doors appear from level 3+. Go deeper first, then search.
  // Walk adjacent to a secret door ('&' in stdscr) and search 25+ times
  // (20% chance per search to convert '&' to '+').
  // ================================================================
  // Go to level 4+ where secret doors are common
  a(() => '\x04'); a(() => '\x04'); a(() => '\x04');

  function searchForSecretDoor() {
    a(() => {
      const g = game();
      for (let y = 1; y < 23; y++) {
        for (let x = 1; x < 79; x++) {
          if (g.stdscr[y][x] === '&') {
            for (const [dy,dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const ay = y+dy, ax = x+dx;
              if (ay < 1 || ay >= 23 || ax < 1 || ax >= 79) continue;
              const ch = g.stdscr[ay][ax];
              if ('.#'.includes(ch)) {
                const path = walkTo(ay, ax);
                if (path.length > 0 && path.length <= 25) {
                  return path + 'sssssssssssssssssssssssssssssssssss';
                }
              }
            }
          }
        }
      }
      return '.';
    });
  }

  searchForSecretDoor();
  a(() => '\x04'); searchForSecretDoor();  // Try next level too
  heal();

  // ================================================================
  // BLIND KILL (fight.js:515)
  // Strategy: walk NEAR a monster while sighted, then go blind, then attack.
  // Must kill the monster while ISBLIND flag is active.
  // ================================================================
  // Go to level with weaker monsters (easier to kill quickly)
  a(() => '\x04'); a(() => '\x04');
  heal();

  // Walk TO closest monster (BFS path ends at monster cell = attack)
  // The last step of the path IS the attack, which positions us adjacent.
  // Then go blind and keep attacking in the SAME direction.
  a(() => {
    const g = game();
    let best = null, bestDist = Infinity;
    for (let m = g.mlist; m; m = m.l_next) {
      const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
      if (d < bestDist) { bestDist = d; best = m.l_data; }
    }
    if (!best) return '\x14';
    const path = walkTo(best.t_pos.y, best.t_pos.x);
    if (path.length >= 2 && path.length <= 25) {
      // Walk to one cell before monster, remember direction
      return path.slice(0, -1);
    }
    if (path.length === 1) return '.';
    return '\x14';
  });

  // Record direction to monster before going blind
  a(() => {
    const d = adjacentMonsterDir();
    if (!d) return '.';
    // Go blind immediately, then attack in known direction
    const blindCreate = createItem('!', 12);  // P_BLIND
    return blindCreate;
  });
  a(() => {
    const l = findPackLetter('!', 12);
    if (!l) return '.';
    // Quaff blind potion
    return 'q' + l;
  });
  // Now attack in the direction we know the monster is
  // Use adjacentMonsterDir which reads g.mw (works while blind)
  a(() => {
    const d = adjacentMonsterDir();
    if (d) return d.repeat(25);  // Keep attacking to kill it
    // Fallback: attack all directions
    return 'hjklhjklyubnhjklhjklyubn';
  });
  heal(); heal();

  // Second attempt on different level
  a(() => '\x04');
  heal();
  a(() => {
    const g = game();
    let best = null, bestDist = Infinity;
    for (let m = g.mlist; m; m = m.l_next) {
      const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
      if (d < bestDist) { bestDist = d; best = m.l_data; }
    }
    if (!best) return '\x14';
    const path = walkTo(best.t_pos.y, best.t_pos.x);
    if (path.length >= 2 && path.length <= 25) return path.slice(0, -1);
    if (path.length === 1) return '.';
    return '\x14';
  });
  a(() => createItem('!', 12));
  a(() => { const l = findPackLetter('!', 12); return l ? 'q' + l : '.'; });
  a(() => {
    const d = adjacentMonsterDir();
    if (d) return d.repeat(25);
    return 'hjklhjklyubnhjklhjklyubn';
  });
  heal(); heal();

  // ================================================================
  // BOLT WANDS AT MONSTERS — multiple zaps for hit AND miss paths
  // (sticks.js:291-302) — need both save-throw success and failure
  // Zap bolt many times at different monsters; some will save, some won't.
  // ================================================================
  // Go deeper for more monsters
  a(() => '\x04'); a(() => '\x04');
  heal();

  // Zap WS_ELECT at monsters 5 times (varied save throws)
  for (let i = 0; i < 5; i++) {
    a(() => createItem('/', 2));  // WS_ELECT
    a(() => {
      const l = findPackLetter('/', 2);
      const d = findMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
  }
  heal();

  // Zap WS_FIRE at monsters 3 times
  for (let i = 0; i < 3; i++) {
    a(() => createItem('/', 3));  // WS_FIRE
    a(() => {
      const l = findPackLetter('/', 3);
      const d = findMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
  }
  heal();

  // ================================================================
  // HASTE/SLOW WAND AT ACTUAL MONSTER (sticks.js:247-259)
  // Need monster in line-of-sight when zapping
  // ================================================================
  for (let i = 0; i < 3; i++) {
    a(() => createItem('/', 7));  // WS_HASTE_M
    a(() => {
      const l = findPackLetter('/', 7);
      const d = findMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
  }
  for (let i = 0; i < 3; i++) {
    a(() => createItem('/', 8));  // WS_SLOW_M
    a(() => {
      const l = findPackLetter('/', 8);
      const d = findMonsterDir();
      return (l && d) ? 'z' + l + d : '.';
    });
  }
  heal();

  // ================================================================

  // (rings.js:147-159)
  // ================================================================

  // Create unknown ring, wear it — naming prompt triggers get_str
  a(() => createItem('=', 12));  // R_STEALTH
  a(() => {
    const l = findPackLetter('=', 12);
    if (!l) return '.';
    // P to put on, select letter, 'l' for left hand
    // Then naming: type "ab", backspace, "c", Enter → "ac"
    return 'P' + l + 'l' + 'ab\x7fc\n';
  });
  // Remove ring, try another with ESC
  a(() => 'Rl');
  a(() => createItem('=', 3));  // R_SEARCH
  a(() => {
    const l = findPackLetter('=', 3);
    if (!l) return '.';
    // Put on, then ESC the naming prompt
    return 'P' + l + 'l' + '\x1b';
  });
  a(() => 'Rl');


  // ================================================================
  // BOLT BOUNCE OFF WALL (sticks.js:283-289)
  // Zap bolt toward closest wall to trigger "The bolt bounces"
  // ================================================================
  a(() => createItem('/', 2));
  a(() => { const l = findPackLetter('/', 2); const d = findWallDir(); return (l&&d) ? 'z'+l+d : '.'; });
  heal();
  a(() => createItem('/', 3));
  a(() => { const l = findPackLetter('/', 3); const d = findWallDir(); return (l&&d) ? 'z'+l+d : '.'; });
  heal();

  // ================================================================
  // QUIT
  // ================================================================
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
  const outPath = join(__dirname, 'sessions', 'wizard_final_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
