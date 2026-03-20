// Check screen differences for a session
import { readFileSync } from 'fs';

const sessionFile = process.argv[2];
const targetStep = parseInt(process.argv[3] || '0');

const session = JSON.parse(readFileSync(sessionFile, 'utf-8'));

// Find screen divergences
const steps = session.steps || session.keystream || [];
console.log(`Session: ${sessionFile}`);
console.log(`Total steps: ${steps.length}`);

// Look at the session structure
if (session.steps && session.steps[0]) {
  console.log('Step keys:', Object.keys(session.steps[0]).join(', '));
}

// Find screen comparisons
let screenDivCount = 0;
for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  if (step.screenDivergences || step.screenDiff || step.screen_diff) {
    console.log(`Step ${i}: screen divergence found`);
    screenDivCount++;
  }
}
console.log(`Screen divergences found: ${screenDivCount}`);
