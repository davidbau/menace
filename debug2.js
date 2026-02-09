import { generateMapsWithRng } from './test/comparison/session_helpers.js';

const result = generateMapsWithRng(16, 3);
const jsRng = result.rngLogs[3].rng;

console.log('Looking for next_ident calls around divergence:');
for (let i = 1080; i <= 1110 && i < jsRng.length; i++) {
    if (jsRng[i].includes('next_ident') || jsRng[i].includes('rn2(20)') || jsRng[i].includes('rn2(3)')) {
        console.log(`JS[${i}]: ${jsRng[i]}`);
    }
}
