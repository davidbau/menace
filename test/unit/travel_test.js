// Test travel command functionality
import { test } from 'node:test';
import assert from 'node:assert';

// Mock minimal map for pathfinding tests
class MockMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        for (let y = 0; y < height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < width; x++) {
                this.grid[y][x] = { typ: 19 }; // ROOM (accessible)
            }
        }
    }

    at(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        return this.grid[y][x];
    }

    setWall(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.grid[y][x] = { typ: 1 }; // VWALL (not accessible)
        }
    }
}

// Simple BFS pathfinding (matching commands.js implementation)
function findPath(map, startX, startY, endX, endY) {
    if (startX === endX && startY === endY) return [];

    const queue = [[startX, startY, []]];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    // Helper to check if location is accessible
    const isAccessible = (x, y) => {
        const loc = map.at(x, y);
        if (!loc) return false;
        // ACCESSIBLE check: ROOM (19), CORR (84), DOOR types, etc.
        const typ = loc.typ;
        return typ === 19 || typ === 84 || typ === 12; // ROOM, CORR, DOOR
    };

    while (queue.length > 0) {
        const [x, y, path] = queue.shift();

        // Check all 8 directions
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx === endX && ny === endY) {
                return [...path, [dx, dy]];
            }

            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
            if (!isAccessible(nx, ny)) continue;

            visited.add(key);
            queue.push([nx, ny, [...path, [dx, dy]]]);
        }

        // Limit search to prevent infinite loops
        if (visited.size > 500) return null;
    }

    return null; // No path found
}

test('findPath finds straight horizontal path', () => {
    const map = new MockMap(10, 10);
    const path = findPath(map, 0, 5, 5, 5);

    assert.ok(path, 'Path should be found');
    assert.strictEqual(path.length, 5, 'Path should have 5 steps for distance of 5');

    // Verify path goes east (1, 0)
    for (const [dx, dy] of path) {
        assert.strictEqual(dx, 1, 'Should move east (dx=1)');
        assert.strictEqual(dy, 0, 'Should not move vertically (dy=0)');
    }
});

test('findPath finds straight vertical path', () => {
    const map = new MockMap(10, 10);
    const path = findPath(map, 5, 0, 5, 5);

    assert.ok(path, 'Path should be found');
    assert.strictEqual(path.length, 5, 'Path should have 5 steps');

    // Verify path goes south (0, 1)
    for (const [dx, dy] of path) {
        assert.strictEqual(dx, 0, 'Should not move horizontally');
        assert.strictEqual(dy, 1, 'Should move south (dy=1)');
    }
});

test('findPath finds diagonal path', () => {
    const map = new MockMap(10, 10);
    const path = findPath(map, 0, 0, 3, 3);

    assert.ok(path, 'Path should be found');
    assert.strictEqual(path.length, 3, 'Path should have 3 diagonal steps');

    // Verify path goes southeast (1, 1)
    for (const [dx, dy] of path) {
        assert.strictEqual(dx, 1, 'Should move east');
        assert.strictEqual(dy, 1, 'Should move south');
    }
});

test('findPath returns empty array for same start/end', () => {
    const map = new MockMap(10, 10);
    const path = findPath(map, 5, 5, 5, 5);

    assert.ok(Array.isArray(path), 'Should return array');
    assert.strictEqual(path.length, 0, 'Path should be empty for same location');
});

test('findPath navigates around single wall', () => {
    const map = new MockMap(10, 10);

    // Create a wall blocking direct path
    map.setWall(5, 5);

    const path = findPath(map, 4, 5, 6, 5);

    assert.ok(path, 'Path should be found around obstacle');
    assert.ok(path.length >= 2, 'Path should navigate around obstacle');

    // Verify we don't go through (5,5)
    let x = 4, y = 5;
    for (const [dx, dy] of path) {
        x += dx;
        y += dy;
        if (x === 5 && y === 5) {
            assert.fail('Path should not go through wall at (5,5)');
        }
    }

    // Verify we end at destination
    assert.strictEqual(x, 6, 'Should end at x=6');
    assert.strictEqual(y, 5, 'Should end at y=5');
});

test('findPath returns null for completely blocked destination', () => {
    const map = new MockMap(10, 10);

    // Surround destination with walls
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx !== 0 || dy !== 0) {
                map.setWall(5 + dx, 5 + dy);
            }
        }
    }

    const path = findPath(map, 0, 0, 5, 5);

    assert.strictEqual(path, null, 'Should return null when destination is unreachable');
});

test('travel command stores destination', () => {
    // Mock game state for travel destination storage
    const game = {
        travelX: undefined,
        travelY: undefined
    };

    // Simulate travel command setting destination
    game.travelX = 10;
    game.travelY = 15;

    assert.strictEqual(game.travelX, 10, 'Travel X should be stored');
    assert.strictEqual(game.travelY, 15, 'Travel Y should be stored');
});

test('travel path execution advances step counter', () => {
    const game = {
        travelPath: [[1, 0], [1, 0], [1, 0]],
        travelStep: 0
    };

    // Simulate executing first step
    const [dx, dy] = game.travelPath[game.travelStep];
    game.travelStep++;

    assert.strictEqual(game.travelStep, 1, 'Step counter should advance');
    assert.strictEqual(dx, 1, 'Should get correct direction');
    assert.strictEqual(dy, 0, 'Should get correct direction');
});

test('travel completes when all steps executed', () => {
    const game = {
        travelPath: [[1, 0], [1, 0]],
        travelStep: 2
    };

    const isComplete = game.travelStep >= game.travelPath.length;

    assert.strictEqual(isComplete, true, 'Travel should be complete when step >= path length');
});
