// test_early_rng_depth2.js - Look at first 50 RNG calls at depth 2

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

console.log('=== First 50 RNG calls at depth 2 ===\n');

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

// Load C for comparison
const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));
const cDepth2 = cSession.levels.find(l => l.depth === 2);
const cFiltered = cDepth2.rng.filter(e => !isMidlogEntry(e));

console.log('Index | JS Call                                    | C Call\n' + '─'.repeat(80));
for (let i = 0; i < 50 && i < filteredRng.length; i++) {
    const jsCall = rngCallPart(filteredRng[i]);
    const cCall = i < cFiltered.length ? rngCallPart(cFiltered[i]) : 'N/A';
    const match = jsCall === cCall ? '' : ' <<<';
    console.log(`${String(i).padStart(5)} | ${jsCall.padEnd(40)} | ${cCall}${match}`);
}

console.log(`\nFinal room count: ${map2.nroom}`);
