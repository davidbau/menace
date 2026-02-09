#!/usr/bin/env node
// Diagnostic tool for stuck seeds - analyze map structure and secret locations

import { initRng } from './js/rng.js';
import { initLevelGeneration, makelevel, setGameSeed } from './js/dungeon.js';
import { Player, roles } from './js/player.js';
import { SDOOR, SCORR, DOOR, CORR, STAIRS, ROOM, HWALL, VWALL } from './js/config.js';

const TERRAIN_NAMES = {
    0: 'STONE', 1: 'VWALL', 2: 'HWALL', 3: 'TLCORNER', 4: 'TRCORNER',
    5: 'BLCORNER', 6: 'BRCORNER', 7: 'CROSSWALL', 8: 'TUWALL', 9: 'TDWALL',
    10: 'TLWALL', 11: 'TRWALL', 12: 'DOOR', 13: 'ROOM', 14: 'SDOOR',
    15: 'SCORR', 16: 'POOL', 17: 'MOAT', 18: 'WATER', 19: 'DRAWBRIDGE_UP',
    20: 'DRAWBRIDGE_DOWN', 21: 'LAVAPOOL', 22: 'IRONBARS', 23: 'DOOR',
    24: 'CORR', 25: 'ROOM', 26: 'STAIRS', 27: 'LADDER', 28: 'FOUNTAIN',
    29: 'THRONE', 30: 'SINK', 31: 'GRAVE', 32: 'ALTAR', 33: 'ICE',
    34: 'DRAWBRIDGE_DOWN', 35: 'AIR', 36: 'CLOUD', 37: 'WATER',
};

function analyzeSeed(seed) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SEED ${seed} - Dlvl 1 Analysis`);
    console.log(`STAIRS constant = ${STAIRS}`);
    console.log('='.repeat(60));

    // Initialize game
    initRng(seed);
    setGameSeed(seed);
    initLevelGeneration(0); // Val = 0

    const player = new Player();
    player.initRole(0); // Val = 0
    player.name = 'Agent';

    const map = makelevel(1, player);

    // Place player at upstair
    if (map.upstair) {
        player.x = map.upstair.x;
        player.y = map.upstair.y;
    }

    // Map dimensions are fixed: 80 (COLNO) x 21 (ROWNO)
    const MAP_WIDTH = 80;
    const MAP_HEIGHT = 21;

    // Find all secret features
    const secrets = [];
    const downstairs = [];
    const upstairs = [];
    const allStairs = [];

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const loc = map.at(x, y);
            if (loc.typ === SDOOR || loc.typ === 14) {
                secrets.push({ x, y, type: 'SDOOR' });
            } else if (loc.typ === SCORR || loc.typ === 15) {
                secrets.push({ x, y, type: 'SCORR' });
            }

            // Check for stairs (STAIRS type or typ 26)
            if (loc.typ === STAIRS || loc.typ === 26) {
                allStairs.push({ x, y, flags: loc.flags, typ: loc.typ });
                if (loc.flags === 0) {
                    downstairs.push({ x, y });
                } else if (loc.flags === 1) {
                    upstairs.push({ x, y });
                }
            }
        }
    }

    // Also check map.upstair and map.dnstair properties
    if (map.upstair) {
        const loc = map.at(map.upstair.x, map.upstair.y);
        const typName = TERRAIN_NAMES[loc.typ] || `typ${loc.typ}`;
        console.log(`Map.upstair property: (${map.upstair.x}, ${map.upstair.y}) - cell typ=${loc.typ} flags=${loc.flags} name=${typName}`);
    }
    if (map.dnstair) {
        const loc = map.at(map.dnstair.x, map.dnstair.y);
        const typName = TERRAIN_NAMES[loc.typ] || `typ${loc.typ}`;
        console.log(`Map.dnstair property: (${map.dnstair.x}, ${map.dnstair.y}) - cell typ=${loc.typ} flags=${loc.flags} name=${typName}`);
    }

    console.log(`\nAll stairs found in map: ${allStairs.length}`);
    for (const stair of allStairs) {
        console.log(`  typ=${stair.typ} flags=${stair.flags} at (${stair.x}, ${stair.y})`);
    }

    console.log(`\nSecrets found: ${secrets.length}`);
    for (const secret of secrets) {
        console.log(`  ${secret.type} at (${secret.x}, ${secret.y})`);

        // Check what's around the secret
        const adjacent = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = secret.x + dx, ny = secret.y + dy;
                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                    const loc = map.at(nx, ny);
                    const name = TERRAIN_NAMES[loc.typ] || `typ${loc.typ}`;
                    if (name !== 'STONE' && name !== 'VWALL' && name !== 'HWALL') {
                        adjacent.push(`${name}(${nx},${ny})`);
                    }
                }
            }
        }
        console.log(`    Adjacent: ${adjacent.join(', ') || 'only walls/stone'}`);
    }

    console.log(`\nDownstairs: ${downstairs.length}`);
    for (const stairs of downstairs) {
        console.log(`  Downstairs at (${stairs.x}, ${stairs.y})`);
    }

    // Find player start position
    console.log(`\nPlayer starts at: (${player.x}, ${player.y})`);

    // Calculate connectivity
    const reachable = new Set();
    const queue = [{ x: player.x, y: player.y }];
    reachable.add(player.y * MAP_WIDTH + player.x);

    while (queue.length > 0) {
        const { x, y } = queue.shift();
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;

                const key = ny * MAP_WIDTH + nx;
                if (reachable.has(key)) continue;

                const loc = map.at(nx, ny);
                // Can walk on: ROOM, CORR, DOOR (open/closed), STAIRS
                // Do NOT include SDOOR or SCORR - those require searching first
                const walkable = [ROOM, 13, 25, 24, DOOR, 23, 26].includes(loc.typ);
                if (walkable) {
                    reachable.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    // Check which secrets are reachable without searching
    console.log(`\nReachability analysis:`);
    console.log(`  Cells reachable without secrets: ${reachable.size - secrets.length}`);

    for (const secret of secrets) {
        const key = secret.y * MAP_WIDTH + secret.x;
        const isReachable = reachable.has(key);
        console.log(`  ${secret.type} at (${secret.x},${secret.y}): ${isReachable ? 'ADJACENT to explored' : 'NOT adjacent to explored'}`);
    }

    // Check if downstairs are reachable
    for (const stairs of downstairs) {
        const key = stairs.y * MAP_WIDTH + stairs.x;
        const isReachable = reachable.has(key);
        console.log(`  Downstairs at (${stairs.x},${stairs.y}): ${isReachable ? 'REACHABLE' : 'BLOCKED by secrets'}`);
    }

    // Print a simple map showing player start (P), secrets (S), downstairs (>)
    console.log(`\nSimple map (21 rows):`);
    for (let y = 0; y < 21; y++) {
        let row = `${y.toString().padStart(2, ' ')}|`;
        for (let x = 0; x < 80; x++) {
            const loc = map.at(x, y);
            let ch;
            if (x === player.x && y === player.y) {
                ch = 'P';
            } else if (secrets.some(s => s.x === x && s.y === y)) {
                ch = 'S';
            } else if (map.dnstair && x === map.dnstair.x && y === map.dnstair.y) {
                ch = '>';
            } else if (map.upstair && x === map.upstair.x && y === map.upstair.y) {
                ch = '<';
            } else if (downstairs.some(s => s.x === x && s.y === y)) {
                ch = '>';
            } else if (loc.typ === 26 && loc.flags === 1) { // upstairs
                ch = '<';
            } else if (loc.typ === ROOM || loc.typ === 13 || loc.typ === 25) {
                ch = '.';
            } else if (loc.typ === 24) { // CORR
                ch = '#';
            } else if (loc.typ === DOOR || loc.typ === 23) {
                ch = '+';
            } else if ([VWALL, HWALL].includes(loc.typ)) {
                ch = '|';
            } else {
                ch = ' ';
            }
            row += ch;
        }
        console.log(row);
    }
}

// Analyze the stuck seeds
for (const seed of [44444, 77777, 88888]) {
    analyzeSeed(seed);
}
