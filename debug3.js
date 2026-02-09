import { generateMapsWithRng } from './test/comparison/session_helpers.js';

const result = generateMapsWithRng(16, 3);
const jsRng = result.rngLogs[3].rng;

console.log('Looking for rnd(2) calls (next_ident):');
for (let i = 1080; i <= 1110 && i < jsRng.length; i++) {
    if (jsRng[i].includes('rnd(2)') || jsRng[i].includes('rn2(20)')) {
        console.log(`JS[${i}]: ${jsRng[i]}`);
    }
}
