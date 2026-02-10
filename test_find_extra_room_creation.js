// test_find_extra_room_creation.js - Find where extra rooms are created

import { initRng, enableRngLog, getRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { readFileSync } from 'fs';

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

console.log('=== Analyzing RNG log for room creation patterns ===\n');

const beforeDepth2 = getRngLog().length;
const map2 = makelevel(2);

const fullLog = getRngLog();
const depth2Log = fullLog.slice(beforeDepth2);

// Load C session for comparison
const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));
const cDepth2 = cSession.levels.find(l => l.depth === 2);

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

console.log(`JS has ${filteredRng.length} RNG calls at depth 2 (filtered)`);
console.log(`C has ${cDepth2.rng.filter(e => !isMidlogEntry(e)).length} RNG calls at depth 2 (filtered)\n`);

// The key insight: room creation happens during makerooms()
// Each room creation consumes specific RNG calls:
// 1. rnd_rect() calls rn2(1) for each available rect until it finds one
// 2. smeq[] randomization in makerooms

// Look for patterns before the divergence point (1336)
// Find where C and JS differ in their room creation sequence

console.log('Looking for room creation patterns in first 200 calls:\n');

// In makerooms, each iteration tries rnd_rect which returns a rect
// If successful, it creates a room
// The pattern is: rn2(1) checks, followed by room randomization

let rn2_1_calls = [];
for (let i = 0; i < Math.min(200, filteredRng.length); i++) {
    const entry = filteredRng[i];
    const call = rngCallPart(entry);
    if (call === 'rn2(1)=0' || call === 'rn2(1)=1') {
        rn2_1_calls.push({ index: i, entry: entry, value: parseInt(call.split('=')[1]) });
    }
}

console.log(`Found ${rn2_1_calls.length} rn2(1) calls (rnd_rect checks):\n`);
for (const call of rn2_1_calls) {
    const status = call.value === 0 ? 'SUCCESS (found rect)' : 'FAILED (no rect)';
    console.log(`[${call.index}] ${call.entry} <- ${status}`);
}

const successfulRects = rn2_1_calls.filter(c => c.value === 0).length;
console.log(`\nSuccessful rect finds: ${successfulRects}`);
console.log(`JS final room count: ${map2.nroom}`);
console.log(`Difference: ${map2.nroom - successfulRects} rooms created without rnd_rect`);

console.log('\n=== Hypothesis ===');
if (map2.nroom > successfulRects) {
    console.log(`${map2.nroom - successfulRects} rooms were created by theme room generators or other mechanisms.`);
    console.log('These rooms increment map.nroom but do not go through rnd_rect.');
    console.log('This could explain the extra rooms if C\'s theme rooms create subrooms instead.');
}
