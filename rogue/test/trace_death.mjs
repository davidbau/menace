import { runSession } from './node_runner.mjs';

// Try many different seeds looking for natural player death
for (let seed of [1, 42, 100, 777, 1337, 5, 13, 99]) {
  // Aggressive fighting: walk in all directions for 200 steps
  const keys = 'hjklhjklhjkljkhljkhl '.repeat(50) + ' '.repeat(100);
  try {
    const steps = await runSession(seed, keys, {});
    // Check if death happened (RIP screen)
    let deathStep = -1;
    for (let i = 0; i < steps.length; i++) {
      const allRows = steps[i].screen.join('\n');
      if (allRows.includes('killed by') || allRows.includes('R.I.P')) {
        deathStep = i;
        break;
      }
    }
    if (deathStep >= 0) {
      console.log(`seed=${seed}: DIED at step ${deathStep}!`);
      steps[deathStep].screen.slice(0, 5).forEach(r => { if (r.trim()) console.log(`  ${r.trim()}`); });
    } else {
      const lastMsg = steps[steps.length-1].screen[0].trim();
      console.log(`seed=${seed}: survived ${steps.length} steps. Last: "${lastMsg}"`);
    }
  } catch(e) {
    console.log(`seed=${seed}: ${e.message.slice(0,80)}`);
  }
}
