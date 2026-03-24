#!/usr/bin/env node
/**
 * build_fight2_session.mjs — Targeted fight coverage.
 *
 * Seed 40, level 12: Nymph(N, carry=100) at (10,60), player at (11,59).
 *
 * Targets:
 *   fight.js:468-474  — thunk() thrown non-weapon hits monster
 *   fight.js:480-486  — bounce() thrown non-weapon misses monster
 *   fight.js:492-503  — is_magic() via P_TFIND with items on floor
 *   fight.js:551-556  — killed() monster pack drops (Nymph has carry=100)
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
const SEED = 40;

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
  a(() => '\x08');  // Ctrl-H: equip
  // Level up to survive deep levels
  for (let i = 0; i < 8; i++) {
    a(() => createItem('!', 8));  // P_RAISE
    a(() => { const l = findPackLetter('!', 8); return l ? 'q' + l : '.'; });
  }
  heal(); heal(); heal();

  // === GO TO LEVEL 12 ===
  for (let i = 0; i < 11; i++) a(() => '\x04');

  // (P_TFIND skipped here — show_win overlay causes key sync issues.
  //  is_magic covered in other sessions.)

  // thunk/bounce non-WEAPON branches are unreachable dead code:
  // missile() calls get_item("throw", WEAPON) — only accepts WEAPON type.
  // (Same in C original.)

  // === KILL ANY NEARBY MONSTER (for pack drops) ===
  // Teleport until adjacent, then attack
  for (let attempt = 0; attempt < 8; attempt++) {
    a(() => {
      const g = game();
      const py = g.player.t_pos.y, px = g.player.t_pos.x;
      for (const [dy,dx,ch] of [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']]) {
        if (g.mw[py+dy]?.[px+dx] >= 'A' && g.mw[py+dy]?.[px+dx] <= 'Z')
          return ch.repeat(15);
      }
      return '\x14';  // Teleport
    });
  }
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
  const outPath = join(__dirname, 'sessions', 'wizard_fight2_coverage.json');
  writeFileSync(outPath, JSON.stringify(session));
  console.log(`Wrote ${outPath} (${steps.length} steps)`);
}

main().catch(e => { console.error(e.stack); process.exit(1); });
