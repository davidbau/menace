// Find the full rng values during teleport
import { readFileSync } from 'fs';

const M = 2147483647n;
let seed = 42n;
function randFull() {
    seed = seed * 16807n % M;
    return Number(seed);
}

const session = JSON.parse(readFileSync('./sessions/cov_nohaste.json', 'utf8'));
// step 0 rng contains all init values (filtering out event strings)
const initRng = session.steps[0].rng.filter(v => typeof v === 'number');
const teleportRng = session.steps[1].rng.filter(v => typeof v === 'number');

console.log('init rng count:', initRng.length);

// Advance through all init calls, verify they match
for (let i = 0; i < initRng.length; i++) {
    const full = randFull();
    const low15 = full & 0x7fff;
    if (low15 !== initRng[i]) {
        console.log(`MISMATCH at init[${i}]: expected ${initRng[i]}, got ${low15}, full=${full}`);
        break;
    }
}
console.log('Verified', initRng.length, 'init rng calls match');

// Now compute teleport calls
console.log('\nTeleport rng values:');
const MAXROOMS = 9;
for (let i = 0; i < 4; i++) {
    const full = randFull();
    const low15 = full & 0x7fff;
    const expected = teleportRng[i];
    console.log(`  call ${i}: full=${full}, low15=${low15}, expected=${expected}, match=${low15===expected}, rnd(9)=${full%9}`);
}
