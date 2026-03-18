// Temporary diagnostic: extract exerper[moves=N] entries from seed031 replay
// Usage: node scripts/diag_exerper.mjs
import { runSessionBundle } from '../test/comparison/session_test_runner.js';
import { readFileSync } from 'fs';

const sessionPath = 'test/comparison/sessions/seed031_manual_direct.session.json';

// Also extract C's exerper-equivalent: count gethungry calls (one per turn-end)
const session = JSON.parse(readFileSync(sessionPath));
const cRaw = [];
for (const step of session.steps) {
  if (Array.isArray(step.rng)) cRaw.push(...step.rng);
}

let cTurns = [];
let turnIdx = 0;
for (const e of cRaw) {
  if (typeof e === 'string' && e.includes('gethungry')) {
    turnIdx++;
    cTurns.push(turnIdx);
  }
}
console.log(`C turn count (gethungry calls): ${turnIdx}`);
console.log(`C svm.moves at each turn = turnIdx + 1 (starts at 1, incremented before gethungry)`);

// Run JS replay
const result = await runSessionBundle({
  sessionPath,
  verbose: false,
  sessionTimeoutMs: 30000,
});

// Extract JS exerper entries from the comparison artifact
const latest = readFileSync('tmp/session-comparisons/LATEST', 'utf-8').trim();
const cmpPath = `${latest}/seed031_manual_direct.comparison.json`;
const cmp = JSON.parse(readFileSync(cmpPath));

// Try raw window first
const jsRW = cmp.comparison?.rng?.js?.rawWindow;
const jsRH = cmp.comparison?.rng?.js?.rawHead || [];
const jsRT = cmp.comparison?.rng?.js?.rawTail || [];

const allJsRaw = [...jsRH, ...(jsRW?.entries || []), ...jsRT];
const jsExerper = allJsRaw.filter(e => typeof e === 'string' && e.includes('^exerper['));

console.log(`\nJS exerper entries found in artifact: ${jsExerper.length}`);
if (jsExerper.length > 0) {
  // Extract moves values
  const jsMoves = jsExerper.map(e => {
    const m = e.match(/moves=(\d+)/);
    return m ? parseInt(m[1]) : -1;
  });

  console.log(`JS moves sequence: ${jsMoves.slice(0, 20).join(', ')}...`);
  console.log(`JS last moves: ...${jsMoves.slice(-10).join(', ')}`);

  // Find gaps (non-consecutive)
  for (let i = 1; i < jsMoves.length; i++) {
    if (jsMoves[i] !== jsMoves[i-1] + 1) {
      console.log(`GAP at position ${i}: ${jsMoves[i-1]} → ${jsMoves[i]} (expected ${jsMoves[i-1]+1})`);
    }
  }
}
