// Trace do_rooms() RNG calls to find where room 2 vs room 6 diverges
const _store = new Map();
globalThis.localStorage = {
    getItem: (k) => _store.has(k) ? _store.get(k) : null,
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear: () => _store.clear(),
};

// Compute the full Park-Miller values for the do_rooms section
import { readFileSync } from 'fs';

const M = 2147483647n;
let seed = 42n;
function randFull() {
    seed = seed * 16807n % M;
    return Number(seed);
}

const session = JSON.parse(readFileSync('./sessions/cov_nohaste.json', 'utf8'));
const rng = session.steps[0].rng;
const doRoomsIdx = rng.indexOf('^{do_rooms}[]');
const numericBefore = rng.slice(0, doRoomsIdx).filter(v => typeof v === 'number').length;

// Advance to do_rooms
for (let i = 0; i < numericBefore; i++) randFull();

console.log('At do_rooms start, seed =', Number(seed));

// left_out = rnd(4) -- first call
const v0 = randFull();
const left_out = v0 % 4;
console.log('left_out = rnd(4): full=', v0, 'low15=', v0 & 0x7fff, '% 4 =', left_out);
console.log('expected:', rng[doRoomsIdx+1]);

// If left_out > 0, rnd_room() is called left_out times
// rnd_room calls rnd(9) until non-ISGONE
for (let i = 0; i < left_out; i++) {
    let rm;
    let loop = 0;
    do {
        const v = randFull();
        rm = v % 9;
        console.log(`  rnd_room iter ${i} loop ${loop}: full=${v}, low15=${v&0x7fff}, % 9 = ${rm}`);
        loop++;
    } while (loop < 5); // just show first few
    console.log(`  -> room ${rm} marked ISGONE`);
}
