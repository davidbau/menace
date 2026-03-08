import { runSessionWithAI } from './node_runner.mjs';

const DIRS = 'hjklyubn';
const keys = await runSessionWithAI(42, (screen, stepNum) => {
  if (stepNum === 50) {
    process.stderr.write('=== SCREEN AT STEP 50 ===\n');
    screen.forEach((r, i) => process.stderr.write(`${String(i).padStart(2)}: ${r}\n`));
    return null;
  }
  return DIRS[stepNum % 8];
});
