#!/usr/bin/env node
/**
 * build_deep_session.mjs — Deep edge cases: bolt bouncing, L kill, blind kill, death.
 *
 * Targets:
 *   sticks.js: bolt bounce off wall, bolt hit/miss monster, bounce-back hit player
 *   fight.js: killed('L') gold drop, killed while blind (line 515), is_magic
 *   rip.js: death() with tombstone, killname() all branches
 *   score.js: addScore, showScores
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
const SEED = 333;

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

function findMonsterOfType(type) {
  for (let m = game().mlist; m; m = m.l_next)
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

// Find direction toward nearest wall from player (for bolt bounce)
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

  function huntMonster(type) {
    for (let attempt = 0; attempt < 8; attempt++) {
      a(() => {
        const m = findMonsterOfType(type);
        if (!m) return '.';
        const path = walkTo(m.t_pos.y, m.t_pos.x);
        if (path.length > 0 && path.length <= 40) {
          const last = path[path.length - 1];
          return path + last.repeat(20);
        }
        return '\x14';  // teleport
      });
    }
    heal(); heal();
  }

  // ================================================================
  // SETUP: Level up, heal massively
  // ================================================================
  a(() => '\x08');  // Ctrl-H
  for (let i = 0; i < 14; i++) {
    a(() => createItem('!', 8));
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 10; i++) heal();

  // ================================================================
  // BOLT WAND BOUNCING — zap toward wall to trigger bounce-back
  // sticks.js lines 283-314
  // ================================================================
  // Create WS_ELECT and zap toward nearest wall
  a(() => createItem('/', 2));  // WS_ELECT
  a(() => {
    const l = findPackLetter('/', 2);
    const d = findWallDir();
    if (l && d) return 'z' + l + d;
    return '.';
  });
  heal();
  // WS_FIRE toward wall
  a(() => createItem('/', 3));  // WS_FIRE
  a(() => {
    const l = findPackLetter('/', 3);
    const d = findWallDir();
    if (l && d) return 'z' + l + d;
    return '.';
  });
  heal();
  // WS_COLD toward wall
  a(() => createItem('/', 4));  // WS_COLD
  a(() => {
    const l = findPackLetter('/', 4);
    const d = findWallDir();
    if (l && d) return 'z' + l + d;
    return '.';
  });
  heal();

  // Now bolt AT monster (for hit path lines 291-296)
  // Go to level with monsters
  a(() => '\x04'); a(() => '\x04'); a(() => '\x04');
  heal();
  a(() => createItem('/', 2));
  a(() => {
    const l = findPackLetter('/', 2);
    const d = findMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  a(() => createItem('/', 3));
  a(() => {
    const l = findPackLetter('/', 3);
    const d = findMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  heal();

  // ================================================================
  // HUNT LEPRECHAUN (L) — fight.js killed('L') gold drop
  // L is at index 10 in lvl_mons. Need level ~8-14.
  // ================================================================
  // Go to level 10
  a(() => {
    const g = game();
    const target = 10;
    const diff = target - g.level;
    if (diff > 0) return '\x04'.repeat(diff);
    if (diff < 0) return '\x15'.repeat(-diff);
    return '.';
  });
  heal();

  // Hunt L across several levels
  huntMonster('L');
  a(() => '\x04'); huntMonster('L');
  a(() => '\x04'); huntMonster('L');
  a(() => '\x04'); huntMonster('L');
  a(() => '\x04'); huntMonster('L');

  // ================================================================
  // BLIND KILL — fight.js line 515
  // Drink blind potion, then immediately attack adjacent monster
  // ================================================================
  // First go somewhere with monsters
  a(() => '\x04'); a(() => '\x04');
  heal();
  // Teleport until we're near a monster
  for (let i = 0; i < 5; i++) {
    a(() => {
      const g = game();
      // Check if monster is adjacent
      const py = g.player.t_pos.y, px = g.player.t_pos.x;
      for (const [dy, dx] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const ny = py+dy, nx = px+dx;
        if (g.mw[ny]?.[nx] >= 'A' && g.mw[ny]?.[nx] <= 'Z') {
          return '.';  // Already adjacent, stop teleporting
        }
      }
      // Not adjacent — walk toward closest monster
      let best = null, bestDist = Infinity;
      for (let m = g.mlist; m; m = m.l_next) {
        const d = Math.abs(m.l_data.t_pos.y - py) + Math.abs(m.l_data.t_pos.x - px);
        if (d < bestDist) { bestDist = d; best = m.l_data; }
      }
      if (best) {
        const path = walkTo(best.t_pos.y, best.t_pos.x);
        if (path.length > 0 && path.length <= 10) return path;
      }
      return '\x14';  // teleport
    });
  }
  // Now go blind and attack
  a(() => createItem('!', 12));  // P_BLIND
  a(() => { const l = findPackLetter('!', 12); return l ? 'q' + l : '.'; });
  // Attack in all 4 cardinal directions to hit adjacent monster while blind
  a(() => 'hjklhjklhjklhjklhjkl');
  heal();

  // ================================================================
  // HASTE/SLOW WANDS — zap at actual monsters (sticks.js 249-259)
  // ================================================================
  a(() => createItem('/', 7));  // WS_HASTE_M
  a(() => { const l = findPackLetter('/', 7); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });
  a(() => createItem('/', 8));  // WS_SLOW_M
  a(() => { const l = findPackLetter('/', 8); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });
  // Slow an already-hasted monster (line 253 branch)
  a(() => createItem('/', 8));
  a(() => { const l = findPackLetter('/', 8); const d = findMonsterDir(); return (l&&d) ? 'z'+l+d : '.'; });

  // ================================================================
  // DEATH — let the player die from a monster to exercise rip.js death()
  // death() is called from fight.c when monster hits player and HP <= 0.
  // Need: low HP, no armor, adjacent to dangerous monster, keep fighting.
  // ================================================================
  // Go to level 25+ where monsters are lethal
  a(() => {
    const g = game();
    const target = 25;
    const diff = target - g.level;
    if (diff > 0) return '\x04'.repeat(diff);
    return '.';
  });

  // Take off armor
  a(() => 'T');

  // Drop weapon so we do minimal damage (won't kill monster before it kills us)
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

  // Set HP to 1 by drinking many P_POISON potions
  // (P_POISON reduces str not HP; we need direct HP damage)
  // Instead: just set HP very low via bolt bounce — zap bolt at wall with low HP
  // Actually, simplest: keep fighting monsters until we die. With no weapon/armor
  // on level 25, monsters do massive damage.

  // Walk into the nearest monster repeatedly
  for (let attempt = 0; attempt < 6; attempt++) {
    a(() => {
      const g = game();
      if (!g.playing) return '.';
      let best = null, bestDist = Infinity;
      for (let m = g.mlist; m; m = m.l_next) {
        const d = Math.abs(m.l_data.t_pos.y - g.player.t_pos.y) + Math.abs(m.l_data.t_pos.x - g.player.t_pos.x);
        if (d < bestDist) { bestDist = d; best = m.l_data; }
      }
      if (best) {
        const path = walkTo(best.t_pos.y, best.t_pos.x);
        if (path.length > 0 && path.length <= 30) {
          const last = path[path.length - 1];
          return path + last.repeat(40);  // Keep fighting until we die
        }
      }
      return '\x14';  // teleport to find monsters
    });
  }

  // If still alive, zap a bolt at a wall to damage ourselves
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    return createItem('/', 2);  // WS_ELECT
  });
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    const l = findPackLetter('/', 2);
    const d = findWallDir();
    // Zap toward wall repeatedly — bolt bounces back and hits us for 6d6
    return (l && d) ? 'z' + l + d : '.';
  });
  // If bolt didn't kill us, zap more
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    return createItem('/', 3);
  });
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    const l = findPackLetter('/', 3);
    const d = findWallDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    return createItem('/', 4);
  });
  a(() => {
    const g = game();
    if (!g.playing) return '.';
    const l = findPackLetter('/', 4);
    const d = findWallDir();
    return (l && d) ? 'z' + l + d : '.';
  });

  // Fallback quit
  a(() => {
    const g = game();
    return g.playing ? 'Qy' : '.';
  });

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
  console.error(`Player HP: ${g.player.t_stats.s_hpt}, playing: ${g.playing}`);

  const session = { seed: SEED, wizard: true, coverage_only: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_deep_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
