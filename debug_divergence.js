import { generateMapsWithRng } from './test/comparison/session_helpers.js';
import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('test/comparison/maps/seed16_maps_c.session.json', 'utf8'));
const result = generateMapsWithRng(16, 3);
const jsRng = result.rngLogs[3].rng;
const cRng = session.levels.find(l => l.depth === 3).rng;

console.log('\nJS calls 1090-1100:');
for (let i = 1090; i <= 1100 && i < jsRng.length; i++) {
    console.log(`JS[${i}]: ${jsRng[i]}`);
}

console.log('\nC calls 1090-1102:');
for (let i = 1090; i <= 1102 && i < cRng.length; i++) {
    if (cRng[i][0] !== '>' && cRng[i][0] !== '<') {
        const call = cRng[i].split(' @')[0];
        if (!call.startsWith('rne(') && !call.startsWith('rnz(') && !call.startsWith('d(')) {
            console.log(`C[${i}]: ${cRng[i]}`);
        }
    }
}
