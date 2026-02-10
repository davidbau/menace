#!/usr/bin/env node
// debug_init_positions.mjs -- Trace player position during initialization

import { initRng, rn2, rnd } from './js/rng.js';
import { setGameSeed, initLevelGeneration, makelevel } from './js/dungeon.js';
import { Player, roles } from './js/player.js';
import { simulatePostLevelInit } from './js/u_init.js';
import { initrack } from './js/monmove.js';

const seed = 99999;
console.log(`Initializing with seed ${seed}...\n`);

// Initialize RNG
initRng(seed);
setGameSeed(seed);

// Create player
const role = roles.find(r => r.name === 'Valkyrie');
const player = new Player('Agent', role, 'human', 'neutral', 0);
player.roleIndex = 10; // Valkyrie
player.race = 0; // human
player.alignment = 0; // neutral
player.gender = 0; // male

console.log(`1. After Player creation: player at (${player.x}, ${player.y})`);

// Generate level
initLevelGeneration();
const map = makelevel(1);

console.log(`2. After makelevel: player at (${player.x}, ${player.y})`);
console.log(`   Upstairs at (${map.upstair.x}, ${map.upstair.y})`);

// Place player at upstairs
player.x = map.upstair.x;
player.y = map.upstair.y;

console.log(`3. After placing at upstairs: player at (${player.x}, ${player.y})`);

// Initialize monster tracking
initrack();

console.log(`4. After initrack: player at (${player.x}, ${player.y})`);

// Post-level initialization
const initResult = simulatePostLevelInit(player, map, 1);

console.log(`5. After simulatePostLevelInit: player at (${player.x}, ${player.y})`);

// Check if there's a pet and where it is
const pet = map.monsters.find(m => m.tame);
if (pet) {
    console.log(`   Pet at (${pet.mx}, ${pet.my})`);
}

// Check if player is on an object
const playerLoc = map.at(player.x, player.y);
if (playerLoc && playerLoc.objects && playerLoc.objects.length > 0) {
    console.log(`   Player standing on ${playerLoc.objects.length} object(s)`);
}
