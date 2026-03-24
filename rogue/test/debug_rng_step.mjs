/**
 * Debug: trace every rnd() call at a specific step using Proxy on rawRngLog.
 * Usage: TRACE_STEP=253 node rogue/test/debug_rng_step.mjs
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

import { readFileSync } from 'fs';
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { command } from '../js/command.js';
import { roomin } from '../js/rooms.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const TRACE_STEP = parseInt(process.env.TRACE_STEP || '253');
const d = JSON.parse(readFileSync('/tmp/wcm_full.json', 'utf8'));
const cSteps = d.steps.filter(s => s.key !== '\x00');
const keys = cSteps.map(s => s.key).join('');

class Done extends Error {}
const g = new GameState();
g.display = new MockDisplay(); g.input = new MockInput();
g.suppressMore = true; g.wizard = true; g.waswizard = true;
setGame(g); wireGameDeps(g); await startGameState(g, 999);

let ki = 0, step = 0;
let tracing = false, traceLog = [];

function makeTracingArray() {
  return new Proxy([], {
    get(target, prop) {
      if (prop === 'push') {
        return function(...args) {
          if (tracing) {
            for (const v of args) {
              if (typeof v === 'number') {
                const stack = new Error().stack.split('\n').slice(2, 5)
                  .map(l => l.trim().replace(/^at /, '').replace(/file:\/\/.*\/rogue\/js\//, '').slice(0, 70));
                traceLog.push({ val: v, callers: stack });
              }
            }
          }
          return Array.prototype.push.apply(target, args);
        };
      }
      return Reflect.get(target, prop);
    }
  });
}

g.rawRngLog = makeTracingArray();

g.input.getKey = async () => {
  step++;
  if (step === TRACE_STEP + 1) {
    // Also show C's RNG for comparison
    const cRng = (cSteps[TRACE_STEP]?.rng || []).filter(x => typeof x === 'number');
    console.log(`\nStep ${TRACE_STEP} JS produced ${traceLog.length} rnd values (C has ${cRng.length}):`);
    const maxLen = Math.max(traceLog.length, cRng.length);
    for (let i = 0; i < maxLen; i++) {
      const jsVal = i < traceLog.length ? traceLog[i].val : '-';
      const cVal = i < cRng.length ? cRng[i] : '-';
      const match = jsVal === cVal ? '✓' : '✗';
      const caller = i < traceLog.length ? traceLog[i].callers[0] : '';
      console.log(`  [${i}] JS=${String(jsVal).padStart(4)} C=${String(cVal).padStart(4)} ${match}  ${caller}`);
    }
    tracing = false;
  }
  if (step === TRACE_STEP) {
    tracing = true;
    traceLog = [];
  }
  g.rawRngLog.length = 0;
  if (ki >= keys.length) throw new Done();
  return keys[ki++];
};

g.oldpos = { x: g.player.t_pos.x, y: g.player.t_pos.y };
g.oldrp = roomin(g.player.t_pos);
try { while (g.playing) await command(); } catch (e) { if (!(e instanceof Done)) throw e; }
