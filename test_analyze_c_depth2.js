// test_analyze_c_depth2.js - Analyze C's depth 2 typGrid to understand room structure

import { readFileSync } from 'fs';

const cSession = JSON.parse(readFileSync('test/comparison/maps/seed163_maps_c.session.json', 'utf8'));
const cDepth2 = cSession.levels.find(l => l.depth === 2);

console.log('=== C Depth 2 typGrid Analysis ===');

const ROWNO = 21;
const COLNO = 80;
const ROOM = 1;

// Parse the typGrid (array of 21 rows, each with 80 columns)
const grid = cDepth2.typGrid;

console.log(`Grid rows: ${grid.length} (should be ${ROWNO} = ${ROWNO})`);
console.log(`Grid cols: ${grid[0].length} (should be ${COLNO} = ${COLNO})`);

// Count ROOM cells
let roomCellCount = 0;
for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
        if (grid[y][x] === ROOM) roomCellCount++;
    }
}

console.log(`Total ROOM cells: ${roomCellCount}`);

// Find room regions using flood fill
const visited = [];
for (let y = 0; y < ROWNO; y++) {
    visited[y] = new Array(COLNO).fill(false);
}
const rooms = [];

function getCell(x, y) {
    if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return null;
    return grid[y][x];
}

function isRoomCell(x, y) {
    if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return false;
    return grid[y][x] === ROOM;
}

function floodFill(startX, startY) {
    const region = [];
    const queue = [[startX, startY]];
    visited[startY][startX] = true;

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        region.push([x, y]);

        // Check 4 neighbors
        const neighbors = [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            if (isRoomCell(nx, ny)) {
                if (!visited[ny][nx]) {
                    visited[ny][nx] = true;
                    queue.push([nx, ny]);
                }
            }
        }
    }

    return region;
}

// Find all connected room regions
for (let y = 0; y < ROWNO; y++) {
    for (let x = 0; x < COLNO; x++) {
        if (grid[y][x] === ROOM && !visited[y][x]) {
            const region = floodFill(x, y);
            if (region.length > 0) {
                // Find bounding box
                let minX = COLNO, maxX = 0, minY = ROWNO, maxY = 0;
                for (const [rx, ry] of region) {
                    if (rx < minX) minX = rx;
                    if (rx > maxX) maxX = rx;
                    if (ry < minY) minY = ry;
                    if (ry > maxY) maxY = ry;
                }
                rooms.push({
                    cells: region.length,
                    bbox: { lx: minX, hx: maxX, ly: minY, hy: maxY }
                });
            }
        }
    }
}

console.log(`\n=== Found ${rooms.length} connected room regions ===`);
for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    console.log(`Region ${i}: ${room.cells} cells, bbox=(${room.bbox.lx},${room.bbox.ly}) to (${room.bbox.hx},${room.bbox.hy})`);
}

console.log(`\n=== Comparison ===`);
console.log(`C has ${rooms.length} connected room regions`);
console.log(`JS has 9 main rooms`);
console.log(`Difference: ${9 - rooms.length} extra rooms in JS`);
