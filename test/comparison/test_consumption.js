// Test RNG consumption accuracy
import { createHeadlessGame } from './oracle.js';
import fs from 'fs';

const session = JSON.parse(fs.readFileSync('test/comparison/sessions/seed201_fight_prefix_gameplay.session.json'));

console.log('=== RNG Consumption Test: seed', session.seed, '===');

const result = await createHeadlessGame(session.seed, {
    wizard: true,
    name: session.options?.name || 'Wizard',
});

if (result.error) {
    console.log('ERROR:', result.error);
    process.exit(1);
}

const { rng } = result;
const { initRng, rn2, rnd, d } = await import('../../js/rng.js');
const { initLevelGeneration } = await import('../../js/dungeon.js');

// Initialize RNG fresh
initRng(session.seed);
rng.enableRngLog();

// Generate map (2068 calls)
initLevelGeneration(11);
const { game } = result;
game.player.roleIndex = 11;
game.changeLevel(1);

const afterMap = rng.getRngLog().length;
console.log('After map gen:', afterMap, 'RNG calls');

// Now consume the post-map entries (2068-2180)
function toCompact(s) {
    let str = typeof s === 'string' ? s : String(s);
    return str.replace(/^\d+\s+/, '').split('@')[0].trim();
}

function isMidlog(s) {
    return s && (s.startsWith('>') || s.startsWith('<'));
}

const sessRng = session.steps[0].rng.filter(s => !isMidlog(s));
const entriesToConsume = sessRng.slice(afterMap);

console.log('Entries to consume:', entriesToConsume.length);

// Parse and consume each entry
function consumeEntry(entry) {
    const call = toCompact(entry);
    const match = call.match(/^([a-z0-9_]+)\(([^)]*)\)=/i);
    if (!match) {
        console.log('  Cannot parse:', entry);
        return false;
    }

    const fn = match[1];
    const args = match[2].split(',').map(s => parseInt(s.trim(), 10));

    switch (fn) {
        case 'rn2': rn2(args[0]); break;
        case 'rnd': rnd(args[0]); break;
        case 'd': d(args[0], args[1]); break;
        default:
            console.log('  Unknown function:', fn);
            return false;
    }
    return true;
}

// Consume all entries
for (const entry of entriesToConsume) {
    consumeEntry(entry);
}

const afterConsume = rng.getRngLog().length;
console.log('After consumption:', afterConsume, 'RNG calls');

// Check alignment by comparing the next few RNG values
// Session step 2 (Fh) has RNG starting with rn2(12)=9
console.log('\n--- Testing alignment ---');
const step2Rng = session.steps[2].rng.filter(s => !isMidlog(s));
console.log('Session step 2 first call:', toCompact(step2Rng[0]));

// Make the same call
const testVal = rn2(12);
const lastLog = rng.getRngLog();
const lastEntry = toCompact(lastLog[lastLog.length - 1]);
console.log('JS rn2(12) result:', testVal, '-> logged as:', lastEntry);

// What does session expect?
const sessExpected = toCompact(step2Rng[0]);
console.log('Session expects:', sessExpected);

if (lastEntry === sessExpected) {
    console.log('MATCH! RNG is aligned.');
} else {
    console.log('MISMATCH - RNG states differ.');
}
