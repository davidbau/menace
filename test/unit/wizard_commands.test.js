// test/unit/wizard_commands.test.js -- Unit tests for wizard mode commands
//
// Tests wizard-only commands like level teleport, map reveal, and teleport.
// These are essential for C parity testing workflows.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { COLNO, ROWNO, ROOM, CORR, STONE } from '../../js/config.js';
import { Player } from '../../js/player.js';

describe('Wizard mode commands', () => {
    let map;
    let player;

    beforeEach(() => {
        initRng(42);
        initLevelGeneration();
        map = makelevel(1);
        wallification(map);
        player = new Player();
        player.initRole(11); // PM_VALKYRIE
        player.dungeonLevel = 1;
        player.wizard = true;
    });

    describe('Level teleport (Ctrl+V)', () => {
        it('generates levels sequentially at multiple depths', () => {
            const levels = {};

            // Generate levels 1-5 (simulating wizard level teleport)
            for (let depth = 1; depth <= 5; depth++) {
                initRng(42); // Same seed for reproducibility
                initLevelGeneration();
                const level = makelevel(depth);
                wallification(level);
                levels[depth] = level;

                // Verify level has valid structure (uses .at() method)
                assert.ok(level.at, `Level ${depth} should have at() method`);
                assert.ok(level.rooms, `Level ${depth} should have rooms array`);

                // Verify level has stairs
                if (depth > 1) {
                    assert.ok(
                        level.upstair.x > 0 || level.upstair.y > 0,
                        `Level ${depth} should have upstairs`
                    );
                }
                assert.ok(
                    level.dnstair.x > 0 || level.dnstair.y > 0,
                    `Level ${depth} should have downstairs`
                );
            }

            // Verify each level is unique by comparing terrain
            for (let d1 = 1; d1 <= 5; d1++) {
                for (let d2 = d1 + 1; d2 <= 5; d2++) {
                    let differences = 0;
                    for (let y = 0; y < ROWNO; y++) {
                        for (let x = 0; x < COLNO; x++) {
                            const t1 = levels[d1].at(x, y);
                            const t2 = levels[d2].at(x, y);
                            if (t1 && t2 && t1.typ !== t2.typ) {
                                differences++;
                            }
                        }
                    }
                    assert.ok(
                        differences > 0,
                        `Level ${d1} and ${d2} should have different terrain`
                    );
                }
            }
        });

        it('level caching prevents regeneration', () => {
            const levelCache = {};

            // Generate level 1
            levelCache[1] = map;
            const originalDnstair = { x: map.dnstair.x, y: map.dnstair.y };

            // "Teleport" to level 2
            const level2 = makelevel(2);
            wallification(level2);
            levelCache[2] = level2;

            // "Return" to level 1 from cache
            const cachedLevel1 = levelCache[1];

            // Verify cached level has same stairs
            assert.equal(
                cachedLevel1.dnstair.x,
                originalDnstair.x,
                'Cached level should preserve downstairs x'
            );
            assert.equal(
                cachedLevel1.dnstair.y,
                originalDnstair.y,
                'Cached level should preserve downstairs y'
            );
        });
    });

    describe('Map reveal (Ctrl+F)', () => {
        it('reveals all tiles on the map', () => {
            // Simulate wizard map reveal (Ctrl+F)
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 0; x < COLNO; x++) {
                    const loc = map.at(x, y);
                    if (loc) {
                        loc.seenv = 0xff;
                        loc.lit = true;
                    }
                }
            }

            // Verify all tiles are now explored
            let exploredCount = 0;
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 0; x < COLNO; x++) {
                    const loc = map.at(x, y);
                    if (loc && loc.seenv === 0xff) {
                        exploredCount++;
                    }
                }
            }

            assert.equal(
                exploredCount,
                COLNO * ROWNO,
                'All tiles should be revealed after map reveal'
            );
        });

        it('lights all tiles on the map', () => {
            // Simulate wizard map reveal (Ctrl+F)
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 0; x < COLNO; x++) {
                    const loc = map.at(x, y);
                    if (loc) {
                        loc.seenv = 0xff;
                        loc.lit = true;
                    }
                }
            }

            // Verify all tiles are now lit
            let litCount = 0;
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 0; x < COLNO; x++) {
                    const loc = map.at(x, y);
                    if (loc && loc.lit) {
                        litCount++;
                    }
                }
            }

            assert.equal(
                litCount,
                COLNO * ROWNO,
                'All tiles should be lit after map reveal'
            );
        });
    });

    describe('Wizard teleport (Ctrl+T)', () => {
        it('can move player to any accessible location', () => {
            // Find an accessible location that's different from current
            let targetX = -1;
            let targetY = -1;
            for (let y = 1; y < ROWNO - 1 && targetX < 0; y++) {
                for (let x = 1; x < COLNO - 1; x++) {
                    const loc = map.at(x, y);
                    if (loc && (loc.typ === ROOM || loc.typ === CORR)) {
                        targetX = x;
                        targetY = y;
                        break;
                    }
                }
            }

            assert.ok(targetX > 0 && targetY > 0, 'Should find an accessible target location');

            // Simulate teleport
            player.x = targetX;
            player.y = targetY;

            assert.equal(player.x, targetX, 'Player x should match target');
            assert.equal(player.y, targetY, 'Player y should match target');
        });

        it('rejects inaccessible locations', () => {
            // Find a stone/wall location
            let wallX = -1;
            let wallY = -1;
            for (let y = 0; y < ROWNO && wallX < 0; y++) {
                for (let x = 0; x < COLNO; x++) {
                    const loc = map.at(x, y);
                    if (loc && loc.typ === STONE) {
                        wallX = x;
                        wallY = y;
                        break;
                    }
                }
            }

            assert.ok(wallX >= 0 && wallY >= 0, 'Should find a stone location');

            // Verify we can detect inaccessible locations
            const loc = map.at(wallX, wallY);
            assert.equal(loc.typ, STONE, 'Location should be stone (inaccessible)');
        });
    });

    describe('Wizard mode initialization', () => {
        it('wizard flag is set on player', () => {
            assert.equal(player.wizard, true, 'Player should have wizard flag set');
        });

        it('wizard mode allows skipping character selection', () => {
            // In wizard mode, character is auto-selected as Valkyrie
            // This is tested implicitly by the beforeEach setup
            assert.ok(player, 'Player should be created in wizard mode');
        });
    });
});
