import { runSessionBundle } from '../test/comparison/session_test_runner.js';
import { readdirSync } from 'fs';
import { join } from 'path';

const pendingDir = 'test/comparison/sessions/pending';
const files = readdirSync(pendingDir).filter(f => f.endsWith('.session.json')).sort();

for (const file of files) {
  const sessionPath = join(pendingDir, file);
  const name = file.replace('.session.json', '');
  process.stdout.write(`\n=== ${name} ===\n`);
  try {
    const r = await runSessionBundle({ sessionPath, verbose: false, sessionTimeoutMs: 60000 });
    console.log(`  passed: ${r.passed}, totalSteps: ${r.totalSteps}, rngMatch: ${r.rngMatch !== undefined ? r.rngMatch.toFixed(4) : 'n/a'}`);
    if (r.channels) {
      for (const [ch, c] of Object.entries(r.channels)) {
        const divStr = (c.divergenceStep !== undefined) ? `div@${c.divergenceStep}` : '';
        console.log(`  channel ${ch}: ${c.passed ? 'PASS' : 'FAIL'} ${divStr}`);
      }
    }
    // Show summary of failures
    if (!r.passed && r.summary) console.log('  summary:', r.summary);
  } catch(e) {
    console.error(`  ERROR: ${e.message}`);
  }
}
