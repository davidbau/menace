// Test C-parity using session_helpers.js replaySession
import { replaySession, compareRng } from './session_helpers.js';
import fs from 'fs';

const sessionFile = process.argv[2] || 'test/comparison/sessions/seed201_fight_prefix_gameplay.session.json';
const session = JSON.parse(fs.readFileSync(sessionFile));

console.log('=== Session Helpers Test:', sessionFile.split('/').pop(), '===');
console.log('Seed:', session.seed);
console.log('Steps:', session.steps?.length || 0);

try {
    const result = await replaySession(session.seed, session, { maxSteps: 50 });

    console.log('\nReplay complete');
    console.log('Steps replayed:', result.steps?.length || 0);

    // Compare each result step against corresponding session step (1:1 mapping)
    let matchCount = 0;
    let mismatchCount = 0;

    for (let i = 0; i < result.steps.length; i++) {
        const jsStep = result.steps[i];
        const sessStep = session.steps[i];

        if (!sessStep) continue;

        const sessRng = (sessStep.rng || []).filter(s => !s.startsWith('>') && !s.startsWith('<'));
        const cmp = compareRng(jsStep.rng || [], sessRng);

        const label = sessStep.key === null ? 'Startup' : `Step ${i} (key=${sessStep.key})`;

        if (cmp.index < 0) {
            matchCount++;
        } else {
            mismatchCount++;
            if (mismatchCount <= 3) {
                console.log(`${label}: diverge at ${cmp.index}`);
                console.log(`  JS: ${cmp.js || '(end)'}`);
                console.log(`  Session: ${cmp.session || '(end)'}`);
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log('Steps matching:', matchCount, '/', result.steps.length);
    console.log('Steps mismatching:', mismatchCount);
    console.log('Result:', mismatchCount === 0 ? 'FULL PARITY!' : 'DIVERGENCE');

} catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
}
