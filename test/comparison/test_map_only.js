// Test map generation only (no post-map consumption)
import { createHeadlessGame } from './oracle.js';
import fs from 'fs';

const session = JSON.parse(fs.readFileSync('test/comparison/sessions/seed201_fight_prefix_gameplay.session.json'));

console.log('=== Map Generation Test: seed', session.seed, '===');

const result = await createHeadlessGame(session.seed, {
    wizard: true,
    name: session.options?.name || 'Wizard',
});

if (result.error) {
    console.log('ERROR:', result.error);
    process.exit(1);
}

const { game, rng } = result;

// Enable RNG logging
rng.enableRngLog();

// Manually do just map generation (from parityTestInit but without consumption)
const { initRng } = await import('../../js/rng.js');
const { initLevelGeneration } = await import('../../js/dungeon.js');

initRng(session.seed);

const roleIndex = 11; // Valkyrie
game.player.roleIndex = roleIndex;
initLevelGeneration(roleIndex);

// Generate first level
game.changeLevel(1);

const jsRng = rng.getRngLog();
console.log('JS map generation RNG calls:', jsRng.length);

// Compare with session
function toCompact(s) {
    let str = typeof s === 'string' ? s : String(s);
    return str.replace(/^\d+\s+/, '').split('@')[0].trim();
}

function isMidlog(s) {
    return s && (s.startsWith('>') || s.startsWith('<'));
}

const sessRng = session.steps[0].rng.filter(s => !isMidlog(s)).map(toCompact);
const jsCompact = jsRng.map(toCompact);

console.log('Session startup RNG calls:', sessRng.length);

// Find first divergence
let div = -1;
for (let i = 0; i < Math.max(jsCompact.length, sessRng.length); i++) {
    if (jsCompact[i] !== sessRng[i]) {
        div = i;
        break;
    }
}

if (div >= 0) {
    console.log('\nFirst divergence at index:', div);
    console.log('  JS:', jsCompact[div] || '(end)');
    console.log('  Session:', sessRng[div] || '(end)');

    // Show context
    const start = Math.max(0, div - 3);
    const end = Math.min(Math.max(jsCompact.length, sessRng.length), div + 5);
    console.log('\nContext:');
    for (let i = start; i < end; i++) {
        const js = jsCompact[i] || '(end)';
        const sess = sessRng[i] || '(end)';
        const marker = i === div ? '>>>' : '   ';
        const match = js === sess ? '=' : '≠';
        console.log(`${marker} ${i}: JS=${js} ${match} Sess=${sess}`);
    }
} else {
    console.log('\nMap generation: PERFECT MATCH for', jsCompact.length, 'calls!');
}

// Show what comes after map generation in session
console.log('\nSession entries after JS ends:');
for (let i = jsCompact.length; i < Math.min(jsCompact.length + 10, sessRng.length); i++) {
    const raw = session.steps[0].rng.filter(s => !isMidlog(s))[i];
    console.log(`  ${i}: ${raw}`);
}
