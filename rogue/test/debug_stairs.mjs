/**
 * Debug: check where stairs are placed for seed 42 by dumping game state.
 */
import { runSessionWithAI } from './node_runner.mjs';
import { game } from '../js/gstate.js';

let dumped = false;
await runSessionWithAI(42, (screen, stepNum) => {
  if (!dumped && stepNum === 200) {
    dumped = true;
    const g = game();
    // Print the rooms info
    process.stderr.write('=== ROOMS ===\n');
    for (let i = 0; i < 9; i++) {
      const r = g.rooms[i];
      if (r) process.stderr.write(`room[${i}]: r_pos=(${r.r_pos?.x},${r.r_pos?.y}) r_max=(${r.r_max?.x},${r.r_max?.y}) flags=${r.r_flags}\n`);
    }
    // Print all level objects
    process.stderr.write('=== LEVEL OBJECTS ===\n');
    for (let obj = g.lvl_obj; obj; obj = obj.l_next) {
      const o = obj.l_data;
      if (o) process.stderr.write(`obj type=${o.o_type} which=${o.o_which} pos=(${o.o_pos?.x},${o.o_pos?.y})\n`);
    }
    // Print the backing map (mw = map window)
    process.stderr.write('=== MAP (mw) ===\n');
    for (let y = 0; y < 24; y++) {
      const row = g.mw[y] || '';
      process.stderr.write(`${String(y).padStart(2)}: ${row}\n`);
    }
    return null;
  }
  if (stepNum > 200) return null;
  const topLine = screen[0] || '';
  if (topLine.includes('--More--')) return ' ';
  // Simple: navigate BFS frontier
  const ROWS = 24, COLS = 80;
  function isP(ch) { return ch !== ' ' && ch !== '-' && ch !== '|'; }
  function find(rows, c) {
    for (let y = 1; y < 23; y++) { const x = (rows[y]||'').indexOf(c); if (x >= 0) return {y,x}; }
    return null;
  }
  const player = find(screen, '@');
  if (!player) return 'h';
  return 'hjklyubn'[stepNum % 8];
});
