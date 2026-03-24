#!/usr/bin/env node
/**
 * build_coverage_session.mjs — Build a high-coverage wizard-mode session.
 *
 * Uses an AI key provider with full game() state access.
 * Wizard mode 'C' creates items; we use inside knowledge of
 * pack contents, monster positions, trap locations, and secret doors
 * to exercise maximum code paths with minimal keystrokes.
 *
 * Usage:
 *   node rogue/test/build_coverage_session.mjs
 */

{
  const _store = new Map();
  globalThis.localStorage = {
    getItem(key)        { return _store.has(key) ? _store.get(key) : null; },
    setItem(key, value) { _store.set(key, String(value)); },
    removeItem(key)     { _store.delete(key); },
    clear()             { _store.clear(); },
    get length()        { return _store.size; },
    key(i)              { return [..._store.keys()][i] ?? null; },
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
const SEED = 999;

class SessionDone extends Error {}

function hexChar(n) {
  return n < 10 ? String(n) : String.fromCharCode('a'.charCodeAt(0) + n - 10);
}

/**
 * Find the pack letter for an item matching (type, which).
 * If which is undefined, matches any item of that type.
 * Returns the LAST match (most recently added).
 */
function findPackLetter(type, which) {
  const g = game();
  let letter = 'a';
  let found = null;
  for (let item = g.pack; item !== null; item = item.l_next) {
    const obj = item.l_data;
    if (obj.o_type === type && (which === undefined || obj.o_which === which)) {
      found = letter;
    }
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return found;
}

function findMonsterDir() {
  const g = game();
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  const dirs = [
    [-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],
    [-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n'],
  ];
  for (const [dy,dx,ch] of dirs) {
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

function dirChar(dy, dx) {
  if (dy===-1&&dx===-1) return 'y'; if (dy===-1&&dx===0) return 'k';
  if (dy===-1&&dx===1) return 'u';  if (dy===0&&dx===-1) return 'h';
  if (dy===0&&dx===1) return 'l';   if (dy===1&&dx===-1) return 'b';
  if (dy===1&&dx===0) return 'j';   if (dy===1&&dx===1) return 'n';
  return '.';
}

function walkTo(ty, tx) {
  const g = game();
  const keys = [];
  let cy = g.player.t_pos.y, cx = g.player.t_pos.x;
  let limit = 35;
  while ((cy !== ty || cx !== tx) && limit-- > 0) {
    const dy = Math.sign(ty - cy), dx = Math.sign(tx - cx);
    const candidates = [];
    if (dy !== 0 && dx !== 0) candidates.push([dy, dx]);
    if (dy !== 0) candidates.push([dy, 0]);
    if (dx !== 0) candidates.push([0, dx]);
    let moved = false;
    for (const [my, mx] of candidates) {
      const ny = cy + my, nx = cx + mx;
      if (ny < 1 || ny >= 23 || nx < 1 || nx >= 79) continue;
      const ch = g.stdscr[ny][nx];
      if ('.#:+!?/=)*]^,'.includes(ch)) {
        keys.push(dirChar(my, mx));
        cy = ny; cx = nx;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return keys.join('');
}

/**
 * Build a sequence of "actions" — each action is a function that returns
 * a string of keys to enqueue, evaluated lazily when the previous action
 * completes. This lets us inspect game() state after wizard creates.
 */
function buildActions() {
  const actions = [];
  const a = (fn) => actions.push(fn);

  // Helper: create and quaff P_XHEAL to restore HP
  function heal() {
    a(() => 'C!' + hexChar(9));  // P_XHEAL=9
    a(() => {
      const letter = findPackLetter('!', 9);
      return letter ? 'q' + letter : '.';
    });
  }

  // === WIZARD SETUP ===
  a(() => '\x08');  // Ctrl-H: +9 levels, two-handed sword, plate mail
  a(() => '\x05');  // Ctrl-E: show food_left
  a(() => '\x01');  // Ctrl-A: pack count
  a(() => '@');     // show position
  a(() => '\x18');  // Ctrl-X: show mw
  // Boost HP: quaff xheal several times to push max_hp high
  heal(); heal(); heal(); heal(); heal();

  // === POTIONS: create then quaff each type ===
  // Start with many heals to build up max_hp
  heal(); heal(); heal(); heal(); heal();
  const potionOrder = [3, 5, 9, 8, 11, 4, 6, 7, 0, 10, 12, 1, 2, 13];
  for (const p of potionOrder) {
    // Create
    a(() => 'C!' + hexChar(p));
    // Quaff — use dynamic letter lookup
    a(() => {
      const letter = findPackLetter('!', p);
      return letter ? 'q' + letter : '.';
    });
    // Heal after dangerous potions (poison, paralyze, blind)
    if ([1, 2, 12].includes(p)) heal();
  }

  // === SCROLLS: create then read each type ===
  const scrollOrder = [5, 10, 12, 2, 1, 8, 0, 3, 7, 14, 13, 9, 11, 4, 6, 15];
  for (const s of scrollOrder) {
    a(() => 'C?' + hexChar(s));
    a(() => {
      const letter = findPackLetter('?', s);
      if (!letter) return '.';
      let keys = 'r' + letter;
      if (s === 6) keys += 'a';        // S_IDENT: identify first item
      else if (s === 15) keys += 'D';  // S_GENOCIDE: eliminate Dragons
      return keys;
    });
    // Heal after dangerous scrolls
    if ([4, 13].includes(s)) heal();
  }

  // Heal before sticks (bolt wands can bounce back for 6d6)
  heal(); heal(); heal();

  // === STICKS: create then zap each type ===
  const stickOrder = [0, 10, 9, 6, 1, 2, 3, 4, 5, 7, 8, 11, 12, 13];
  for (const w of stickOrder) {
    a(() => 'C/' + hexChar(w));
    a(() => {
      const letter = findPackLetter('/', w);
      if (!letter) return '.';
      return 'z' + letter + (findMonsterDir() || 'l');
    });
    // Heal after bolt/drain wands
    if ([2, 3, 4, 9].includes(w)) heal();
  }

  // === RINGS: create, wear, remove each type ===
  const ringOrder = [1, 0, 4, 9, 2, 3, 5, 7, 8, 10, 11, 12, 6];
  for (const r of ringOrder) {
    const needBless = [0, 1, 7, 8].includes(r);
    a(() => 'C=' + hexChar(r) + (needBless ? '+' : ''));
    a(() => {
      const letter = findPackLetter('=', r);
      if (!letter) return '.';
      return 'P' + letter + 'l';  // put on, left hand
    });
    a(() => 'Rl');  // remove, left hand
  }

  // === MISC COMMANDS ===
  a(() => '/@');    // identify @
  a(() => '/!');    // identify !
  a(() => '/?');    // identify ?
  a(() => '/=');    // identify =
  a(() => '//');    // identify /
  a(() => 's');     // search
  a(() => 's');     // search
  // Call item: create unknown P_NOP, call it
  a(() => 'C!' + hexChar(13));
  a(() => {
    const letter = findPackLetter('!', 13);
    return letter ? 'c' + letter + 'test\n' : '.';
  });
  // Create weapons with blessings
  a(() => 'C)0+');  // blessed mace
  a(() => 'C)1-');  // cursed sword
  // Create armor with blessings
  a(() => 'C]0+');  // blessed leather
  a(() => 'C]1-');  // cursed ring mail
  // Ctrl-N: charge a stick
  a(() => 'C/' + hexChar(0));
  a(() => {
    const letter = findPackLetter('/', 0);
    return letter ? '\x0e' + letter : '.';
  });
  a(() => 'Z');     // invalid wizard cmd
  a(() => '\x09');  // Ctrl-I: floor items

  // Heal before traps
  heal(); heal();

  // === TRAPS: walk to nearest using inside knowledge ===
  a(() => {
    const g = game();
    for (let i = 0; i < g.ntraps; i++) {
      const t = g.traps[i];
      const path = walkTo(t.tr_pos.y, t.tr_pos.x);
      if (path.length > 0 && path.length <= 20) {
        return path;
      }
    }
    return '.';
  });
  // Heal after trap
  a(() => 'C!' + hexChar(5));
  a(() => {
    const letter = findPackLetter('!', 5);
    return letter ? 'q' + letter : '.';
  });

  // === MOVEMENT ===
  a(() => 'hhjjkkll');
  a(() => 'yyuubbnn');

  // === SECRET DOORS ===
  a(() => {
    const g = game();
    for (let y = 1; y < 23; y++) {
      for (let x = 1; x < 79; x++) {
        if (g.stdscr[y][x] === '&') {
          // Walk adjacent and search
          for (const [ay, ax] of [[y-1,x],[y+1,x],[y,x-1],[y,x+1]]) {
            const ch = g.stdscr[ay]?.[ax];
            if (ch === '.' || ch === '#') {
              const path = walkTo(ay, ax);
              if (path.length > 0 && path.length <= 15) {
                return path + 'ssssssssss';
              }
            }
          }
        }
      }
    }
    return '.';
  });

  // === LEVEL CHANGES ===
  a(() => '\x04');  // Ctrl-D: go down
  a(() => 's');
  a(() => '\x15');  // Ctrl-U: go up
  a(() => 's');

  // === FIGHT: walk to nearest monster ===
  a(() => {
    const g = game();
    if (!g.mlist) return '.';
    const m = g.mlist.l_data;
    const path = walkTo(m.t_pos.y, m.t_pos.x);
    if (path.length > 0 && path.length <= 12) {
      const last = path[path.length - 1];
      return path + last.repeat(5);
    }
    return '.';
  });

  // === SAVE & QUIT ===
  a(() => 'Sy');
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
  let keyCount = 0;
  let pendingKey = null;

  // Current action queue: characters from the current action's return string
  let charQueue = [];
  let actionIdx = 0;

  input.getKey = async function () {
    const screen = display.getRows();
    const rng = [...g.rawRngLog];
    g.rawRngLog = [];

    if (pendingKey !== null) {
      steps.push({ key: pendingKey, rng, screen });
    }

    // Refill from next action if queue empty
    while (charQueue.length === 0) {
      if (actionIdx >= actions.length) throw new SessionDone();
      const result = actions[actionIdx++]();
      if (result && result.length > 0) {
        charQueue = [...result];
      }
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
    if (!(e instanceof SessionDone)) {
      console.error(`Game ended at step ${keyCount} (action ${actionIdx}/${actions.length}): ${e.message}`);
      console.error(`  HP: ${g.player.t_stats.s_hpt}, playing: ${g.playing}`);
      console.error(`  charQueue remaining: ${charQueue.length} chars`);
      console.error(e.stack);
    }
  }

  // Capture final step
  if (pendingKey !== null) {
    steps.push({ key: pendingKey, rng: [...g.rawRngLog], screen: display.getRows() });
  }

  console.error(`Session: ${steps.length} steps, ${keyCount} keys, completed ${actionIdx}/${actions.length} actions`);

  const session = { seed: SEED, wizard: true, steps };
  const outPath = join(__dirname, 'sessions', 'wizard_coverage_max.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
