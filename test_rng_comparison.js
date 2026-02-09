// test_rng_comparison.js - Compare JS vs C RNG traces in detail

import { initRng, enableRngLog, getRngLog, disableRngLog, rn2 } from './js/rng.js';
import { initLevelGeneration, makelevel, wallification, place_lregion, setGameSeed } from './js/dungeon.js';
import { initrack } from './js/monmove.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { Player } from './js/player.js';
import { readFileSync } from 'fs';

// Load C session
const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));

// Filtering functions (from session_helpers.js)
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

console.log('=== BEFORE initLevelGeneration ===');
const beforeInit = getRngLog().length;
console.log(`RNG calls: ${beforeInit}`);

initLevelGeneration();

console.log('\n=== AFTER initLevelGeneration ===');
const afterInit = getRngLog().length;
console.log(`RNG calls: ${afterInit} (${afterInit - beforeInit} from init)`);

let prevCount = afterInit;

console.log('\n=== Generating depth 1 ===');
let step = getRngLog().length;

const map1 = makelevel(1);
console.log(`After makelevel: ${getRngLog().length - step} calls`);
step = getRngLog().length;

wallification(map1);
console.log(`After wallification: ${getRngLog().length - step} calls`);
step = getRngLog().length;

// C ref: only place branch stairs for depths 2-4, NOT depth 1
// (Depth 1 is not a branch level)
const depth = 1;
if (depth >= 2 && depth <= 4) {
    place_lregion(map1, 0, 0, 0, 0, 0, 0, 0, 0, 4);
    console.log(`After place_lregion: ${getRngLog().length - step} calls`);
    step = getRngLog().length;
}

const player = new Player();
player.initRole(11); // Valkyrie
if (map1.upstair) {
    player.x = map1.upstair.x;
    player.y = map1.upstair.y;
}
simulatePostLevelInit(player, map1, 1);

const afterDepth1 = getRngLog().length;
console.log(`RNG calls for depth 1: ${afterDepth1 - prevCount}`);
console.log(`Total so far: ${afterDepth1}`);

// Extract and filter depth 1 log
const fullLog = getRngLog();
const depth1Log = fullLog.slice(0, afterDepth1);
const compactRng = depth1Log.map(toCompactRng);
const filteredRng = compactRng.filter(e => !isCompositeEntry(rngCallPart(e)) && !isMidlogEntry(e));

console.log(`After filtering: ${filteredRng.length} calls`);
console.log(`C session depth 1: ${cSession.levels[0].rngCalls} calls (${cSession.levels[0].rng.length} raw)`);
console.log(`Difference: ${cSession.levels[0].rngCalls - filteredRng.length} calls`);

console.log('\nFirst 10 JS calls:');
filteredRng.slice(0, 10).forEach((call, i) => {
    console.log(`  [${i}]: ${call}`);
});

console.log('\nFirst 10 C calls:');
cSession.levels[0].rng.slice(0, 10).forEach((call, i) => {
    if (!isMidlogEntry(call)) {
        console.log(`  [${i}]: ${call}`);
    }
});

// Find first divergence
console.log('\n=== Finding divergence ===');
let si = 0, ji = 0;
while (ji < filteredRng.length && si < cSession.levels[0].rng.length) {
    if (isMidlogEntry(cSession.levels[0].rng[si])) { si++; continue; }

    const jsPart = rngCallPart(filteredRng[ji]);
    const cPart = rngCallPart(cSession.levels[0].rng[si]);

    if (jsPart !== cPart) {
        console.log(`Divergence at index ${ji}/${si}:`);
        console.log(`  JS: ${filteredRng[ji]}`);
        console.log(`  C:  ${cSession.levels[0].rng[si]}`);

        console.log(`\nContext (JS calls around divergence):`);
        for (let k = Math.max(0, ji - 5); k < Math.min(filteredRng.length, ji + 5); k++) {
            const marker = k === ji ? '>>>' : '   ';
            console.log(`${marker} [${k}]: ${filteredRng[k]}`);
        }

        console.log(`\nContext (C calls around divergence):`);
        for (let k = Math.max(0, si - 5); k < Math.min(cSession.levels[0].rng.length, si + 5); k++) {
            if (!isMidlogEntry(cSession.levels[0].rng[k])) {
                const marker = k === si ? '>>>' : '   ';
                console.log(`${marker} [${k}]: ${cSession.levels[0].rng[k]}`);
            }
        }
        break;
    }
    ji++;
    si++;
}

if (ji === filteredRng.length && si < cSession.levels[0].rng.length) {
    console.log(`JS ended early at call ${ji}, C continues to ${cSession.levels[0].rng.length}`);
    console.log(`Next 10 C calls JS is missing:`);
    let count = 0;
    while (si < cSession.levels[0].rng.length && count < 10) {
        if (!isMidlogEntry(cSession.levels[0].rng[si])) {
            console.log(`  [${si}]: ${cSession.levels[0].rng[si]}`);
            count++;
        }
        si++;
    }
}

disableRngLog();
