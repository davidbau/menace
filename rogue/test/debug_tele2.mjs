// Patch teleport and trace it
const _store = new Map();
globalThis.localStorage = {
    getItem: (k) => _store.has(k) ? _store.get(k) : null,
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear: () => _store.clear(),
};

import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';
import { rnd } from '../js/rng.js';
import { winat } from '../js/curses.js';
import { rnd_room, rnd_pos } from '../js/rooms.js';
import { FLOOR } from '../js/const.js';

const g = new GameState();
const display = new MockDisplay();
const input = new MockInput();
g.display = display; g.input = input; g.rawRngLog = [];
g.wizard = true; g.waswizard = true;
setGame(g);
wireGameDeps(g);
await startGameState(g, 42);

const ISGONE = 0o000002;
console.log('Rooms after init:');
for (let i = 0; i < 9; i++) {
    const r = g.rooms[i];
    console.log(`  room ${i}: ISGONE=${!!(r.r_flags & ISGONE)}`);
}

// Simulate teleport
let pos = { x: 0, y: 0 };
let rm;
let iter = 0;
do {
    rm = rnd_room();
    rnd_pos(g.rooms[rm], pos);
    const ch = winat(pos.y, pos.x);
    console.log(`Teleport iter ${iter}: room=${rm}, pos=(${pos.x},${pos.y}), winat='${ch}', FLOOR=${ch===FLOOR}`);
    iter++;
    if (iter > 5) { console.log('Too many iterations!'); break; }
} while (winat(pos.y, pos.x) !== FLOOR);

console.log('Teleported to:', pos);
