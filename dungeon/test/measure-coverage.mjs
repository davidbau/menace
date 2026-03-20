#!/usr/bin/env node
// measure-coverage.mjs — Room/object/verb/room-visit/NPC coverage across all parity sessions.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const { DungeonGame } = await import(join(root, 'js', 'game.js'));
const gameData = JSON.parse(readFileSync(join(root, 'js', 'dungeon-data.json')));
const textData = JSON.parse(readFileSync(join(root, 'js', 'dungeon-text.json')));

async function runSession(name) {
    const inputPath = join(__dirname, 'sessions', `${name}.input`);
    const fortranPath = join(__dirname, 'sessions', `${name}.fortran.json`);
    const inputLines = readFileSync(inputPath, 'utf8').trim().split('\n');
    const fdata = JSON.parse(readFileSync(fortranPath));
    const seed = fdata.seed !== undefined ? fdata.seed : 42;

    const game = new DungeonGame();
    game.init(gameData, textData);
    game._rngSeed = seed;
    game._rappliTrack = new Set();
    game._oapplTrack = new Set();
    game._vapplTrack = new Set();
    game._roomVisit = new Set();
    game._npcTrack  = new Set();

    let idx = 0;
    const input = async () => {
        game._roomVisit.add(game.here);
        if (idx >= inputLines.length) { game.gameOver = true; return null; }
        return inputLines[idx++];
    };
    try { await game.run(input, () => {}); } catch(e) {}
    game._roomVisit.add(game.here);

    return {
        rappli: game._rappliTrack,
        oappl:  game._oapplTrack,
        vappl:  game._vapplTrack,
        rooms:  game._roomVisit,
        npc:    game._npcTrack,
    };
}

const allSessions = [
    'opening','dark','troll','window-entry','containers','magic','combat',
    'collective','underground','burn','scoring','items','verbs2','maze',
    'deep-cave','outdoor','gallery','cave-area','thief-encounter','verbs-misc',
    'grue-dark','grue','egg-canary','well-bucket',
    'speedrun-2','anti-speedrun',
    'speedrun-31-gnome','speedrun-31-sphere','speedrun-1-endgame',
];

const totals = {
    rappli: new Set(), oappl: new Set(), vappl: new Set(),
    rooms: new Set(), npc: new Set(),
};

for (const name of allSessions) {
    const r = await runSession(name);
    r.rappli.forEach(x => totals.rappli.add(x));
    r.oappl.forEach(x  => totals.oappl.add(x));
    r.vappl.forEach(x  => totals.vappl.add(x));
    r.rooms.forEach(x  => totals.rooms.add(x));
    r.npc.forEach(x    => totals.npc.add(x));
}

// Verb boundaries (from verbs.js)
const MXNOP  = 39;   // ri 1-39:  nop verbs (no-operation — uniform behavior)
const MXJOKE = 64;   // ri 40-64: joke verbs (25 slots)
const MXSMP  = 99;   // ri 65-99: simple verbs (35 slots)
// ri 100-169+: complex verbs (verbIdx = ri - MXSMP)

// Totals from source
const TOTAL_RAPPLI = 64;   // handlers 1-64 in rooms.js
const TOTAL_ROOMS  = gameData.rooms.count;

const maxOappl  = Math.max(...totals.oappl);
const maxVappl  = Math.max(...totals.vappl);

// --- Room actions ---
console.log('=== COVERAGE ACROSS ALL 29 PARITY SESSIONS ===\n');

console.log(`Room actions  (rappli): ${totals.rappli.size}/${TOTAL_RAPPLI} fired`);
const missingRappli = [];
for (let i = 1; i <= TOTAL_RAPPLI; i++) if (!totals.rappli.has(i)) missingRappli.push(i);
console.log(`  Missing: ${missingRappli.join(', ') || '(none)'}`);

// --- Object actions ---
console.log(`\nObject actions (oappli): ${totals.oappl.size} fired (max observed=${maxOappl})`);
const missingOappl = [];
for (let i = 1; i <= maxOappl; i++) if (!totals.oappl.has(i)) missingOappl.push(i);
console.log(`  Missing 1-${maxOappl}: ${missingOappl.join(', ') || '(none)'}`);

// --- Verb actions (categorized) ---
const jokesCovered   = [...totals.vappl].filter(r => r > MXNOP  && r <= MXJOKE);
const simpleCovered  = [...totals.vappl].filter(r => r > MXJOKE && r <= MXSMP);
const complexCovered = [...totals.vappl].filter(r => r > MXSMP);

const TOTAL_JOKES   = MXJOKE - MXNOP;   // 25
const TOTAL_SIMPLE  = MXSMP  - MXJOKE;  // 35
const maxComplexIdx = maxVappl > MXSMP ? maxVappl - MXSMP : 0;

const missingJokes   = [];
for (let i = MXNOP+1; i <= MXJOKE; i++)
    if (!totals.vappl.has(i)) missingJokes.push(i - MXNOP);   // report as joke# 1-25
const missingSimple  = [];
for (let i = MXJOKE+1; i <= MXSMP;  i++)
    if (!totals.vappl.has(i)) missingSimple.push(i - MXJOKE); // report as simpleVerb# 1-35
const missingComplex = [];
for (let i = 1; i <= maxComplexIdx; i++)
    if (!totals.vappl.has(i + MXSMP)) missingComplex.push(i); // verbIdx 1-N

console.log(`\nVerb actions:`);
console.log(`  Nop  verbs (ri 1-${MXNOP}): ${MXNOP} slots — uniform no-op, coverage N/A`);
console.log(`  Joke verbs (ri ${MXNOP+1}-${MXJOKE}): ${jokesCovered.length}/${TOTAL_JOKES} triggered`);
console.log(`    Missing joke#: ${missingJokes.join(', ') || '(none)'}`);
console.log(`  Simple verbs (ri ${MXJOKE+1}-${MXSMP}): ${simpleCovered.length}/${TOTAL_SIMPLE} triggered`);
console.log(`    Missing simpleVerb#: ${missingSimple.join(', ') || '(none)'}`);
console.log(`  Complex verbs (ri ${MXSMP+1}+): ${complexCovered.length} triggered (max observed verbIdx=${maxComplexIdx})`);
console.log(`    Missing verbIdx 1-${maxComplexIdx}: ${missingComplex.join(', ') || '(none)'}`);

// --- Rooms visited ---
console.log(`\nRooms visited: ${totals.rooms.size}/${TOTAL_ROOMS}`);
const allRooms = Array.from({length: TOTAL_ROOMS}, (_,i) => i+1);
const unvisited = allRooms.filter(r => !totals.rooms.has(r));
console.log(`  Unvisited: ${unvisited.join(', ')}`);

// --- NPC interactions ---
const DEATH_NAMES = {
    148: 'poison (time-based)',
    522: 'grue',
    596: 'combat',
    7:   'too many deaths (game over)',
    625: 'endgame death',
};

const npcList = [...totals.npc].sort();
const deaths  = npcList.filter(e => e.startsWith('death:')).map(e => e.slice(6));
const deathLabels = deaths.map(n => DEATH_NAMES[n] ? `${n}(${DEATH_NAMES[n]})` : n);

console.log(`\nNPC interactions:`);
console.log(`  fight demon active:  ${totals.npc.has('fight') ? 'yes' : 'NO'}`);
console.log(`  sword demon active:  ${totals.npc.has('sword') ? 'yes' : 'NO'}`);
console.log(`  thief demon active:  ${totals.npc.has('thief') ? 'yes' : 'NO'}`);
console.log(`  player deaths: ${deathLabels.join(', ') || '(none)'}`);
