// Test C-parity with a short gameplay session
import { createHeadlessGame } from './oracle.js';
import fs from 'fs';

const sessionFile = process.argv[2] || 'test/comparison/sessions/seed201_fight_prefix_gameplay.session.json';
const session = JSON.parse(fs.readFileSync(sessionFile));

console.log('=== C-Parity Test:', sessionFile.split('/').pop(), '===');
console.log('Seed:', session.seed);
console.log('Steps:', session.steps.length);

let matchCount = 0;
let mismatchCount = 0;

const result = await createHeadlessGame(session.seed, {
    wizard: true,
    name: session.options?.name || 'Wizard',
});

if (result.error) {
    console.log('ERROR:', result.error);
    process.exit(1);
}

const { game, rng, feedKey, startGameLoop } = result;

// Enable RNG logging
rng.enableRngLog();

// Run parityTestInit
await game.parityTestInit(session);

const afterInit = rng.getRngLog().length;
console.log('\nAfter parityTestInit:', afterInit, 'RNG calls');

// Start game loop
await startGameLoop();

// Helper functions
function toCompact(s) {
    let str = typeof s === 'string' ? s : String(s);
    return str.replace(/^\d+\s+/, '').split('@')[0].trim();
}

function isMidlog(s) {
    return s && (s.startsWith('>') || s.startsWith('<'));
}

// Compare startup RNG
const jsStartup = rng.getRngLog().map(toCompact);
const sessStartup = session.steps[0].rng.filter(s => !isMidlog(s)).map(toCompact);

console.log('JS startup RNG:', jsStartup.length);
console.log('Session startup RNG:', sessStartup.length);

// Find first divergence in startup
let startupDiv = -1;
for (let i = 0; i < Math.max(jsStartup.length, sessStartup.length); i++) {
    if (jsStartup[i] !== sessStartup[i]) {
        startupDiv = i;
        break;
    }
}
if (startupDiv >= 0) {
    console.log('Startup divergence at:', startupDiv);
    console.log('  JS:', jsStartup[startupDiv]);
    console.log('  Session:', sessStartup[startupDiv]);
} else {
    console.log('Startup: MATCH!');
}

// Process each gameplay step
for (let i = 1; i < session.steps.length; i++) {
    const step = session.steps[i];
    const keys = step.key;

    console.log(`\n--- Step ${i}: key="${keys}" ---`);

    const beforeLen = rng.getRngLog().length;

    // Feed each character as a separate keystroke
    for (const ch of keys) {
        await feedKey(ch.charCodeAt(0));
    }

    // Extra yields to let game loop complete turn-end processing
    for (let y = 0; y < 20; y++) {
        await new Promise(resolve => setImmediate(resolve));
    }

    const afterLen = rng.getRngLog().length;
    const jsStepRng = rng.getRngLog().slice(beforeLen).map(toCompact);
    const sessStepRng = (step.rng || []).filter(s => !isMidlog(s)).map(toCompact);

    console.log('JS RNG calls:', jsStepRng.length);
    console.log('Session RNG calls:', sessStepRng.length);

    // Compare
    let stepDiv = -1;
    for (let j = 0; j < Math.max(jsStepRng.length, sessStepRng.length); j++) {
        if (jsStepRng[j] !== sessStepRng[j]) {
            stepDiv = j;
            break;
        }
    }

    if (stepDiv >= 0) {
        mismatchCount++;
        if (mismatchCount <= 3) {
            console.log('Step divergence at:', stepDiv);
            console.log('  JS:', jsStepRng[stepDiv] || '(end)');
            console.log('  Session:', sessStepRng[stepDiv] || '(end)');
            console.log('  JS first 5:', jsStepRng.slice(0, 5));
            console.log('  Sess first 5:', sessStepRng.slice(0, 5));
        }
    } else {
        matchCount++;
        if (session.steps.length <= 10) {
            console.log('Step: MATCH!');
        }
    }
}

console.log('\n=== Summary ===');
console.log('Startup:', startupDiv < 0 ? 'MATCH' : 'mismatch at ' + startupDiv);
console.log('Steps matching:', matchCount, '/', session.steps.length - 1);
console.log('Steps mismatching:', mismatchCount);
if (mismatchCount === 0) {
    console.log('Result: FULL PARITY!');
} else {
    console.log('Result: DIVERGENCE');
}
