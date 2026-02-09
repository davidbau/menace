// test_raw_log.js - Examine raw vs filtered RNG log

import { initRng, enableRngLog, getRngLog, disableRngLog } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';

// Filtering functions
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

// Initialize
initrack();
enableRngLog();
initRng(163);
setGameSeed(163);
initLevelGeneration();

const map1 = makelevel(1);
wallification(map1);
place_lregion(map1, 0, 0, 0, 0, 0, 0, 0, 0, 4);

const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

const fullLog = getRngLog();
const compactRng = fullLog.map(toCompactRng);
const filteredRng = compactRng.filter(e => !isCompositeEntry(rngCallPart(e)) && !isMidlogEntry(e));

console.log(`Raw log: ${fullLog.length} calls`);
console.log(`Filtered log: ${filteredRng.length} calls`);
console.log(`Filtered out: ${fullLog.length - filteredRng.length} calls`);

// Search for rn2(79) or rn2(21) in the raw log
console.log('\n=== Searching for rn2(79) or rn2(21) in RAW log ===');
let found79 = false;
for (let i = 0; i < fullLog.length; i++) {
    const compact = toCompactRng(fullLog[i]);
    const call = rngCallPart(compact);
    if (call.includes('rn2(79)') || call.includes('rn2(21)')) {
        console.log(`RAW[${i}]: ${fullLog[i]}`);
        found79 = true;
        if (i > 0) console.log(`  RAW[${i-1}]: ${fullLog[i-1]}`);
        if (i < fullLog.length - 1) console.log(`  RAW[${i+1}]: ${fullLog[i+1]}`);
    }
}

if (!found79) {
    console.log('No rn2(79) or rn2(21) calls found!');
}

// Search in filtered log
console.log('\n=== Searching for rn2(79) or rn2(21) in FILTERED log ===');
for (let i = 0; i < filteredRng.length; i++) {
    const call = rngCallPart(filteredRng[i]);
    if (call.includes('rn2(79)') || call.includes('rn2(21)')) {
        console.log(`FILTERED[${i}]: ${filteredRng[i]}`);
    }
}

// Show calls around index 2456 in FILTERED log
console.log('\n=== Filtered log around index 2456 (divergence point) ===');
for (let i = 2450; i <= 2465 && i < filteredRng.length; i++) {
    const marker = i === 2456 ? '>>>' : '   ';
    console.log(`${marker} FILTERED[${i}]: ${filteredRng[i]}`);
}

disableRngLog();
