// Debug which rooms are ISGONE and what teleport does
const _store = new Map();
globalThis.localStorage = {
    getItem: (k) => _store.has(k) ? _store.get(k) : null,
    setItem: (k, v) => _store.set(k, String(v)),
    removeItem: (k) => _store.delete(k),
    clear: () => _store.clear(),
};

import { readFileSync } from 'fs';
import { GameState } from '../js/game.js';
import { game, setGame } from '../js/gstate.js';
import { wireGameDeps, startGameState } from '../js/main.js';
import { MockDisplay } from './mock_display.mjs';
import { MockInput } from './mock_input.mjs';

const g = new GameState();
const display = new MockDisplay();
const input = new MockInput();
g.display = display; g.input = input; g.rawRngLog = [];
g.wizard = true; g.waswizard = true;
setGame(g);
wireGameDeps(g);
await startGameState(g, 42);

// Check rooms after init
console.log('Rooms after init:');
const ISGONE = 0o000002;
for (let i = 0; i < 9; i++) {
    const r = g.rooms[i];
    console.log(`  room ${i}: flags=${r.r_flags.toString(2)}, ISGONE=${!!(r.r_flags & ISGONE)}, pos=(${r.r_pos?.x},${r.r_pos?.y}), max=(${r.r_max?.x},${r.r_max?.y})`);
}

// Simulate rnd_room
import { rnd } from '../js/rng.js';
const { rand: randFn } = await import('../js/rng.js');

// Get the first rnd(9) value (what would teleport call first)
console.log('\nSimulating teleport rnd_room():');
for (let i = 0; i < 4; i++) {
    const rm_raw = rnd(9);
    console.log(`  rnd(9) = ${rm_raw}, room ${rm_raw} ISGONE=${!!(g.rooms[rm_raw].r_flags & ISGONE)}`);
    if (!(g.rooms[rm_raw].r_flags & ISGONE)) {
        console.log(`  -> selected room ${rm_raw}`);
        // rnd_pos
        const rp = g.rooms[rm_raw];
        const x = rnd(rp.r_max.x - 2) + 1;
        const y = rnd(rp.r_max.y - 2) + 1;
        console.log(`  rnd_pos: rnd(${rp.r_max.x-2})=${x-1}, rnd(${rp.r_max.y-2})=${y-1}`);
        break;
    }
}
