#!/usr/bin/env node
/**
 * build_comprehensive_session.mjs — One session to cover all remaining gaps
 * in sticks.js, fight.js, misc.js, and rings.js.
 *
 * Seed 30, level 8: monsters available, corridors accessible.
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
const PASSABLE = '.#:+!?/=)*],%*&';  // excludes trap chars

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

function walkTo(ty, tx, exclude) {
  const g = game();
  if (g.player.t_pos.y === ty && g.player.t_pos.x === tx) return '';
  const visited = new Set(exclude || []);
  const queue = [[g.player.t_pos.y, g.player.t_pos.x, []]];
  visited.add(g.player.t_pos.y * 80 + g.player.t_pos.x);
  while (queue.length > 0) {
    const [cy, cx, path] = queue.shift();
    if (path.length > 40) continue;
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

function adjacentMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
    if (g.mw[py+dy]?.[px+dx] >= 'A' && g.mw[py+dy]?.[px+dx] <= 'Z') return ch;
  }
  return null;
}

function cardinalMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
    let y=py+dy, x=px+dx;
    while (y>=1&&y<23&&x>=0&&x<80) {
      if (g.mw[y]?.[x]>='A'&&g.mw[y]?.[x]<='Z') return ch;
      const s=g.stdscr[y][x];
      if (s==='|'||s==='-'||s===' '||s==='+') break;
      y+=dy; x+=dx;
    }
  }
  return null;
}

function wallDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  let best = null, bestDist = Infinity;
  for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l']]) {
    let y=py+dy, x=px+dx, dist=1;
    while (y>=1&&y<23&&x>=1&&x<79) {
      const s=g.stdscr[y][x];
      if (s==='|'||s==='-'||s===' '||s==='+') { if(dist<bestDist){bestDist=dist;best=ch;} break; }
      y+=dy; x+=dx; dist++;
    }
  }
  return best;
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
  // SETUP: Ctrl-H + level up + heal
  // ================================================================
  a(() => '\x08');
  for (let i = 0; i < 8; i++) {
    a(() => createItem('!', 8)); // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  for (let i = 0; i < 4; i++) heal();

  // Go to level 8
  for (let i = 0; i < 7; i++) a(() => '\x04');
  heal();

  // ================================================================
  // 1. WS_LIGHT in corridor (sticks 108-111)
  // Walk to a corridor '#' cell, then zap light wand
  // ================================================================
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++)
      for (let x = 1; x < 79; x++)
        if (g.stdscr[y][x] === '#') {
          const path = walkTo(y, x);
          if (path.length > 0 && path.length <= 15) return path;
        }
    return '.';
  });
  a(() => createItem('/', 0)); // WS_LIGHT
  a(() => { const l = findPackLetter('/', 0); return l ? 'z' + l + 'l' : '.'; });

  // ================================================================
  // 2. Teleport near monster for wand tests
  // ================================================================
  for (let attempt = 0; attempt < 6; attempt++) {
    a(() => adjacentMonsterDir() ? '.' : '\x14');
  }

  // ================================================================
  // 3. WS_HIT at adjacent monster (sticks 225-233)
  // ================================================================
  a(() => createItem('/', 1)); // WS_HIT
  a(() => {
    const l = findPackLetter('/', 1);
    const d = adjacentMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });

  // ================================================================
  // 4. WS_HASTE_M + WS_SLOW_M at monster (sticks 247-259)
  // ================================================================
  a(() => createItem('/', 7)); // WS_HASTE_M
  a(() => {
    const l = findPackLetter('/', 7);
    const d = cardinalMonsterDir() || adjacentMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  a(() => createItem('/', 8)); // WS_SLOW_M
  a(() => {
    const l = findPackLetter('/', 8);
    const d = cardinalMonsterDir() || adjacentMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });

  // ================================================================
  // 5. Bolt at monster without bounce (sticks 292-302)
  // ================================================================
  a(() => createItem('/', 2)); // WS_ELECT
  a(() => {
    const l = findPackLetter('/', 2);
    const d = cardinalMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  heal();

  // ================================================================
  // 6. Bolt bounce off wall (sticks 312-313)
  // ================================================================
  a(() => createItem('/', 3)); // WS_FIRE
  a(() => {
    const l = findPackLetter('/', 3);
    const d = wallDir();
    return (l && d) ? 'z' + l + d : '.';
  });
  heal(); heal();

  // ================================================================
  // 7. WS_POLYMORPH at monster (sticks 371-376)
  // ================================================================
  for (let i = 0; i < 4; i++) {
    a(() => adjacentMonsterDir() ? '.' : '\x14');
  }
  a(() => createItem('/', 5)); // WS_POLYMORPH
  a(() => {
    const l = findPackLetter('/', 5);
    const d = cardinalMonsterDir() || adjacentMonsterDir();
    return (l && d) ? 'z' + l + d : '.';
  });

  // ================================================================
  // 8. Throw weapon at monster (fight 468-480)
  // Create arrow, throw toward monster
  // ================================================================
  a(() => createItem(')', 4, 'n')); // ARROW, neutral
  a(() => {
    const l = findPackLetter(')', 4);
    const d = cardinalMonsterDir();
    if (l && d) return 't' + d + l; // throw: direction then letter
    return '.';
  });
  // Throw again (may miss → bounce path)
  a(() => createItem(')', 4, 'n'));
  a(() => {
    const l = findPackLetter(')', 4);
    const d = cardinalMonsterDir();
    if (l && d) return 't' + d + l;
    return '.';
  });

  // ================================================================
  // 9. is_magic via P_TFIND (fight 486-497)
  // Drop a magic item on floor first, then detect
  // ================================================================
  a(() => createItem('!', 3)); // P_STRENGTH (magic potion)
  a(() => { const l = findPackLetter('!', 3); return l ? 'd' + l : '.'; }); // drop it
  a(() => createItem('!', 7)); // P_TFIND
  a(() => { const l = findPackLetter('!', 7); return l ? 'q' + l : '.'; });

  // ================================================================
  // 10. Kill carry-monster for pack drops (fight 545-550)
  // Teleport near any monster and kill it
  // ================================================================
  for (let i = 0; i < 6; i++) {
    a(() => {
      const d = adjacentMonsterDir();
      return d ? d.repeat(15) : '\x14';
    });
  }
  heal();

  // ================================================================
  // 11. Low strength → poison to str<7 (fight 452)
  // ================================================================
  for (let i = 0; i < 5; i++) {
    a(() => createItem('!', 2)); // P_POISON (reduces str)
    a(() => { const l = findPackLetter('!', 2); return l ? 'q' + l : '.'; });
  }
  // Now attack something at low str
  for (let i = 0; i < 4; i++) {
    a(() => {
      const d = adjacentMonsterDir();
      return d ? d.repeat(5) : '\x14';
    });
  }
  // Restore strength
  a(() => createItem('!', 11)); // P_RESTORE
  a(() => { const l = findPackLetter('!', 11); return l ? 'q' + l : '.'; });
  heal();

  // ================================================================
  // 12. Rings: both hands empty → gethand (rings 51-62)
  //     R_SEEINVIS (rings 74-76), R_AGGR (rings 78-79)
  //     Ring removal dropcheck (rings 118-120)
  // ================================================================
  a(() => createItem('=', 4)); // R_SEEINVIS
  a(() => { const l = findPackLetter('=', 4); return l ? 'P' + l + 'l' : '.'; }); // wear left
  a(() => createItem('=', 6)); // R_AGGR
  a(() => { const l = findPackLetter('=', 6); return l ? 'P' + l + 'r' : '.'; }); // wear right
  a(() => 'Rl'); // remove left
  a(() => 'Rr'); // remove right (auto since only one)

  // ================================================================
  // 13. Confused direction (misc 343-346)
  // Drink P_CONFUSE, then throw or zap with direction
  // ================================================================
  a(() => createItem('!', 0)); // P_CONFUSE
  a(() => { const l = findPackLetter('!', 0); return l ? 'q' + l : '.'; });
  // Now confused — try a direction command (throw)
  a(() => createItem(')', 4, 'n')); // arrow
  a(() => {
    const l = findPackLetter(')', 4);
    return l ? 't' + 'l' + l : '.'; // throw east
  });
  // Move around confused
  a(() => 'hhllkkjj');
  heal();

  // ================================================================
  // 14. chg_str positive (misc 241-250)
  // ================================================================
  a(() => createItem('!', 3)); // P_STRENGTH
  a(() => { const l = findPackLetter('!', 3); return l ? 'q' + l : '.'; });

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
  const outPath = join(__dirname, 'sessions', 'wizard_comprehensive.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
