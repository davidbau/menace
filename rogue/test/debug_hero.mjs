// Find hero's starting position
import { readFileSync } from 'fs';

const M = 2147483647n;
let seed = 42n;
function randFull() {
    seed = seed * 16807n % M;
    return Number(seed);
}

const session = JSON.parse(readFileSync('./sessions/cov_nohaste.json', 'utf8'));
const rng = session.steps[0].rng;
const heroIdx = rng.indexOf('^{hero}[]');
const numericBefore = rng.slice(0, heroIdx).filter(v => typeof v === 'number').length;

// Advance to hero placement
for (let i = 0; i < numericBefore; i++) randFull();
console.log('At hero placement, numericBefore:', numericBefore);

// After ^{hero}[], hero placement: room 6 is ISGONE, rooms 0-5,7-8 valid
// Hero placement loop: rnd_room() + rnd_pos(), repeat if not FLOOR
// But we don't know the room layout yet. Let's just compute rnd values and map to rooms

// Room 2 has pos=(56,2), max=(22,5)
// Teleport position: rnd(20)=2 (+56+1=59 x), rnd(3)=0 (+2+1=3 y) → pos (59,3)

const heroRng = rng.slice(heroIdx + 1).filter(v => typeof v === 'number');
console.log('Hero rng values:', heroRng);

// Compute these from the full values
const heroFull = [];
for (let i = 0; i < heroRng.length; i++) {
    const v = randFull();
    heroFull.push({low15: v & 0x7fff, full: v, mod9: v%9, mod20: v%20, mod3: v%3});
}
console.log('\nHero placement rng:');
for (let i = 0; i < Math.min(heroFull.length, 8); i++) {
    const h = heroFull[i];
    console.log(`  [${i}]: low15=${h.low15} (expected=${heroRng[i]}), full=${h.full}, %9=${h.mod9}, %20=${h.mod20}, %3=${h.mod3}`);
}
