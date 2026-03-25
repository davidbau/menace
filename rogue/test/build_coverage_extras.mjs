#!/usr/bin/env node
/**
 * build_coverage_extras.mjs — Build a wizard-mode coverage session
 * targeting uncovered lines in fight.js, sticks.js, and misc.js.
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
import { runSessionWithAI } from './node_runner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { game } = await import('../js/gstate.js');

const SEED = 2001;
const WS_POLYMORPH = 5, WS_HASTE_M = 7, WS_SLOW_M = 8;
const WS_DRAIN = 9, WS_TELAWAY = 11, WS_TELTO = 12, WS_CANCEL = 13;

function hexChar(n) {
  return n < 10 ? String(n) : String.fromCharCode('a'.charCodeAt(0) + n - 10);
}

function findPackLetter(g, type, which) {
  let letter = 'a'; let found = null;
  for (let item = g.pack; item !== null; item = item.l_next) {
    const obj = item.l_data;
    if (obj.o_type === type && (which === undefined || obj.o_which === which)) found = letter;
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return found;
}

function adjacentMonsterDir(g, targetType) {
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  const dirs = [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']];
  for (const [dy,dx,ch] of dirs) {
    const ny = py+dy, nx = px+dx;
    if (ny < 1 || ny >= 23 || nx < 0 || nx >= 80) continue;
    const mon = g.mw[ny][nx];
    if (targetType ? mon === targetType : (mon >= 'A' && mon <= 'Z')) return ch;
  }
  return null;
}

function lineOfSightMonsterDir(g) {
  const py = g.player.t_pos.y, px = g.player.t_pos.x;
  const dirs = [[-1,0,'k'],[1,0,'j'],[0,-1,'h'],[0,1,'l'],[-1,-1,'y'],[-1,1,'u'],[1,-1,'b'],[1,1,'n']];
  for (const [dy,dx,ch] of dirs) {
    for (let i = 1; i < 15; i++) {
      const ny = py+dy*i, nx = px+dx*i;
      if (ny<1||ny>=23||nx<0||nx>=80) break;
      if (g.mw[ny][nx] >= 'A' && g.mw[ny][nx] <= 'Z') return ch;
      const s = g.stdscr[ny][nx];
      if (s === '|' || s === '-' || s === ' ') break;
    }
  }
  return null;
}

// State machine
let phase = 'setup';
let subStep = 0;
let queue = [];
let stepCount = 0;

function keyProvider(screen, step, display) {
  stepCount = step;
  const g = game();
  if (!g) return null;
  if (step > 300) return null; // safety limit

  // Drain queue first — don't advance state machine until queue is empty
  if (queue.length > 0) return queue.shift();

  switch (phase) {

    // After each 'create_X' phase queues C/N, we need a 'wait_X' phase
    // that just returns the next queue item. But since we drain queue above,
    // we'll naturally fall through to the next phase once the queue empties.
    case 'setup':
      // Raise 9 levels; each produces "Welcome to level N--More--" (9 prompts)
      queue.push('\x08', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ');
      phase = 'create_poly_wand';
      return queue.shift();

    case 'create_poly_wand':
      queue.push('C', '/', hexChar(WS_POLYMORPH));
      phase = 'zap_poly';
      return queue.shift();

    case 'zap_poly': {
      const dir = lineOfSightMonsterDir(g);
      const wl = findPackLetter(g, '/', WS_POLYMORPH);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_cancel_wand';
        return queue.shift();
      }
      // Walk toward monster or wait
      phase = 'create_cancel_wand';
      return '.';
    }

    case 'create_cancel_wand':
      queue.push('C', '/', hexChar(WS_CANCEL));
      phase = 'zap_cancel';
      return queue.shift();

    case 'zap_cancel': {
      const dir = lineOfSightMonsterDir(g);
      const wl = findPackLetter(g, '/', WS_CANCEL);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_telaway_wand';
        return queue.shift();
      }
      phase = 'create_telaway_wand';
      return '.';
    }

    case 'create_telaway_wand':
      queue.push('C', '/', hexChar(WS_TELAWAY));
      phase = 'zap_telaway';
      return queue.shift();

    case 'zap_telaway': {
      const dir = lineOfSightMonsterDir(g);
      const wl = findPackLetter(g, '/', WS_TELAWAY);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_telto_wand';
        return queue.shift();
      }
      phase = 'create_telto_wand';
      return '.';
    }

    case 'create_telto_wand':
      queue.push('C', '/', hexChar(WS_TELTO));
      phase = 'zap_telto';
      return queue.shift();

    case 'zap_telto': {
      const dir = adjacentMonsterDir(g); // telto needs adjacent target
      const wl = findPackLetter(g, '/', WS_TELTO);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_haste_wand';
        return queue.shift();
      }
      phase = 'create_haste_wand';
      return '.';
    }

    case 'create_haste_wand':
      queue.push('C', '/', hexChar(WS_HASTE_M));
      phase = 'zap_haste';
      return queue.shift();

    case 'zap_haste': {
      const dir = lineOfSightMonsterDir(g);
      const wl = findPackLetter(g, '/', WS_HASTE_M);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_slow_wand';
        return queue.shift();
      }
      phase = 'create_slow_wand';
      return '.';
    }

    case 'create_slow_wand':
      queue.push('C', '/', hexChar(WS_SLOW_M));
      phase = 'zap_slow';
      return queue.shift();

    case 'zap_slow': {
      const dir = lineOfSightMonsterDir(g);
      const wl = findPackLetter(g, '/', WS_SLOW_M);
      if (dir && wl) {
        queue.push('z', wl, dir);
        phase = 'create_drain_wand';
        return queue.shift();
      }
      phase = 'create_drain_wand';
      return '.';
    }

    case 'create_drain_wand':
      queue.push('C', '/', hexChar(WS_DRAIN));
      phase = 'zap_drain';
      return queue.shift();

    case 'zap_drain': {
      // Zap drain at self (.)
      const wl = findPackLetter(g, '/', WS_DRAIN);
      if (wl) {
        queue.push('z', wl, '.');
        phase = 'search_traps';
        subStep = 0;
        return queue.shift();
      }
      phase = 'search_traps';
      subStep = 0;
      return '.';
    }

    case 'search_traps':
      subStep++;
      if (subStep >= 20) {
        phase = 'run_directions';
        subStep = 0;
        return '.';
      }
      return 's'; // search for traps

    case 'run_directions':
      // Run in 8 directions for misc.js runch coverage
      const runDirs = ['H', 'J', 'K', 'L', 'Y', 'U', 'B', 'N'];
      if (subStep < runDirs.length) {
        subStep++;
        return runDirs[subStep - 1];
      }
      phase = 'eat_food';
      return '.';

    case 'eat_food':
      // Create and eat food for misc.js food effects
      queue.push('C', ':', '0');
      phase = 'eat_food2';
      return queue.shift();

    case 'eat_food2': {
      const fl = findPackLetter(g, ':', undefined);
      if (fl) {
        queue.push('e', fl);
        phase = 'confusion';
        return queue.shift();
      }
      phase = 'confusion';
      return '.';
    }

    case 'confusion':
      // Create and quaff confusion potion
      queue.push('C', '!', '7'); // P_CONFUSE=7
      phase = 'confusion2';
      return queue.shift();

    case 'confusion2': {
      const cl = findPackLetter(g, '!', 7);
      if (cl) {
        queue.push('q', cl);
        phase = 'confused_moves';
        subStep = 0;
        return queue.shift();
      }
      phase = 'confused_moves';
      subStep = 0;
      return '.';
    }

    case 'confused_moves':
      subStep++;
      if (subStep >= 6) {
        phase = 'fight_monsters';
        subStep = 0;
        return '.';
      }
      return 'h'; // move while confused for random direction

    case 'fight_monsters':
      subStep++;
      if (subStep >= 30) {
        phase = 'throw_weapon';
        return '.';
      }
      // Attack adjacent or wait
      const fdir = adjacentMonsterDir(g);
      if (fdir) return fdir;
      if (subStep % 4 === 0) return 's';
      return '.';

    case 'throw_weapon': {
      const tdir = lineOfSightMonsterDir(g);
      if (tdir) {
        queue.push('t', tdir);
        phase = 'quit';
        return queue.shift();
      }
      phase = 'quit';
      return '.';
    }

    case 'quit':
      queue.push('Q', 'y');
      phase = 'done';
      return queue.shift();

    case 'done':
      return null;

    default:
      return null;
  }
}

console.log(`Building coverage extras session (seed ${SEED})...`);
const keys = await runSessionWithAI(SEED, keyProvider, { wizard: true });
console.log(`Session complete: ${keys.length} keys`);

const sessionPath = join(__dirname, 'sessions', `cov_extras_seed${SEED}.json`);
writeFileSync(sessionPath, JSON.stringify({
  seed: SEED,
  wizard: true,
  coverage_only: true,
  steps: keys.map(k => ({ key: k })),
}, null, 2));
console.log(`Written to: ${sessionPath}`);
