// test_trace_makerooms_loop.js - Trace the makerooms while loop

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Monkey-patch themerooms_generate to log calls
import * as themermsMod from './js/themerms.js';
const originalThemeGen = themermsMod.themerooms_generate;
let themeGenCalls = 0;

// We can't actually monkey-patch ES modules, so let's just analyze the RNG log

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

// Generate depth 1
const map1 = makelevel(1);
wallification(map1);
const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

console.log('=== Analyzing makerooms loop via RNG trace ===\n');

const beforeDepth2 = getRngLog().length;
const map2 = makelevel(2);

const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);

function isMidlogEntry(entry) {
    return entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

function isCompositeEntry(entry) {
    return entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d(');
}

function toCompactRng(entry) {
    if (isMidlogEntry(entry)) return entry;
    return entry.replace(/^\d+\s+/, '');
}

function rngCallPart(entry) {
    const atIdx = entry.indexOf(' @ ');
    return atIdx >= 0 ? entry.substring(0, atIdx) : entry;
}

const compactRng = depth2Log.map(toCompactRng);
const filteredRng = compactRng.filter(e => !isCompositeEntry(rngCallPart(e)) && !isMidlogEntry(e));

console.log('Looking for makerooms loop pattern:\n');
console.log('  - rn2(1) = rnd_rect() check');
console.log('  - rn2(2) = vault chance check (if nroom >= 6)');
console.log('  - rn2(100+) pattern = themerooms_generate reservoir sampling\n');

let loopIterations = [];
let i = 0;

// The loop starts after getbones and initial setup
// Skip the large rn2(1000+) sequence which is coordinate shuffling
while (i < filteredRng.length && !filteredRng[i].includes('rn2(1)=')) {
    i++;
}

console.log(`Starting analysis at index ${i}\n`);

while (i < Math.min(filteredRng.length, 300)) {
    const call = rngCallPart(filteredRng[i]);

    if (call.startsWith('rn2(1)=')) {
        const value = parseInt(call.split('=')[1]);
        if (value === 0) {
            console.log(`[${i}] ${filteredRng[i]} <- rnd_rect SUCCESS, enter loop iteration`);
            loopIterations.push({ start: i, rndRect: call });
        } else {
            console.log(`[${i}] ${filteredRng[i]} <- rnd_rect FAILED, exit makerooms loop`);
            break;
        }
    } else if (call === 'rn2(2)=0' || call === 'rn2(2)=1') {
        console.log(`[${i}] ${filteredRng[i]} <- possible vault check`);
    } else if (call.startsWith('rn2(100)=')) {
        console.log(`[${i}] ${filteredRng[i]} <- build_room chance check`);
    } else if (call.startsWith('rn2(') && parseInt(call.match(/rn2\((\d+)\)/)[1]) > 100) {
        // Skip the very large rn2 calls (coordinate shuffling)
    } else {
        console.log(`[${i}] ${filteredRng[i]}`);
    }

    i++;
}

console.log(`\n=== Summary ===`);
console.log(`Loop iterations found: ${loopIterations.length}`);
console.log(`Final room count: ${map2.nroom}`);
console.log(`Subrooms: ${map2.nsubroom || 0}`);
