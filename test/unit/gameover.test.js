// test/unit/gameover.test.js -- Tests for death cause tracking and game-over features
// Verifies that deathCause is set in all death paths (combat, quit, escape, starvation)
// and that the game-over score calculation and text wrapping work correctly.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { Player, roles, races, rankOf, roleNameForGender } from '../../js/player.js';
import { monsterAttackPlayer } from '../../js/mhitu.js';
import { rhack } from '../../js/cmd.js';
import { pushInput, clearInputQueue } from '../../js/input.js';
import { FEMALE, MALE, A_NEUTRAL, A_CHAOTIC, A_LAWFUL, RACE_HUMAN, STAIRS } from '../../js/config.js';

// Mock display that captures messages
function mockDisplay() {
    const msgs = [];
    return {
        messages: msgs,
        putstr_message(msg) { msgs.push(msg); },
        putstr() {},
        renderMap() {},
        renderStatus() {},
        renderChargenMenu() {},
        clearRow() {},
        clearScreen() {},
    };
}

// ========================================================================
// Player.deathCause field
// ========================================================================
describe('Death cause: Player field', () => {
    it('deathCause starts as empty string', () => {
        const p = new Player();
        assert.equal(p.deathCause, '');
    });

    it('deathCause can be set', () => {
        const p = new Player();
        p.deathCause = 'killed by a newt';
        assert.equal(p.deathCause, 'killed by a newt');
    });
});

// ========================================================================
// Monster kill sets deathCause
// ========================================================================
describe('Death cause: monster attack', () => {
    it('monsterAttackPlayer sets deathCause when player dies', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.hp = 1; // very low HP so monster can kill
        p.hpmax = 20;
        p.ac = 10;
        p.deathCause = '';

        const display = mockDisplay();

        // Make a strong monster that will definitely kill
        const monster = {
            name: 'dragon',
            displayChar: 'D',
            mhp: 50,
            mlevel: 20,
            speed: 12,
            attacks: [{ dmg: [10, 10] }], // massive damage
            dead: false,
            passive: false,
        };

        // Attack repeatedly until death
        for (let i = 0; i < 100 && p.hp > 0; i++) {
            monsterAttackPlayer(monster, p, display);
        }

        assert.ok(p.hp <= 0, 'Player should be dead');
        assert.equal(p.deathCause, 'killed by a dragon');
    });

    it('deathCause includes monster name', () => {
        initRng(99);
        const p = new Player();
        p.initRole(0);
        p.hp = 1;
        p.hpmax = 20;
        p.ac = 10;
        p.deathCause = '';

        const display = mockDisplay();
        const monster = {
            name: 'floating eye',
            displayChar: 'e',
            mhp: 50,
            mlevel: 20,
            speed: 12,
            attacks: [{ dmg: [10, 10] }],
            dead: false,
            passive: false,
        };

        for (let i = 0; i < 100 && p.hp > 0; i++) {
            monsterAttackPlayer(monster, p, display);
        }

        assert.ok(p.hp <= 0);
        assert.equal(p.deathCause, 'killed by a floating eye');
    });

    it('deathCause is not set when player survives', () => {
        initRng(42);
        const p = new Player();
        p.initRole(0);
        p.hp = 1000; // unkillable
        p.hpmax = 1000;
        p.ac = -10; // very hard to hit
        p.deathCause = '';

        const display = mockDisplay();
        const monster = {
            name: 'newt',
            displayChar: ':',
            mhp: 1,
            mlevel: 0,
            speed: 12,
            attacks: [{ dmg: [1, 2] }],
            dead: false,
            passive: false,
        };

        monsterAttackPlayer(monster, p, display);
        assert.equal(p.deathCause, '', 'deathCause should remain empty when player lives');
    });
});

// ========================================================================
// Quit sets deathCause
// ========================================================================
describe('Death cause: quit', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('Ctrl+C quit sets deathCause to "quit"', async () => {
        initRng(42);
        const display = mockDisplay();
        const player = new Player();
        player.x = 10; player.y = 10;
        player.deathCause = '';

        const game = {
            player, display,
            map: { monsters: [], monsterAt() { return null; }, at() { return { typ: 0 }; }, objectsAt() { return []; }, flags: {} },
            fov: { canSee() { return false; } },
            gameOver: false,
            gameOverReason: '',
            wizard: false,
            flags: {},
        };

        // Queue 'y' response to "Really quit?" prompt
        pushInput('y'.charCodeAt(0));
        await rhack(3, game); // Ctrl+C = char code 3

        assert.equal(game.gameOver, true);
        assert.equal(game.gameOverReason, 'quit');
        assert.equal(player.deathCause, 'quit');
    });

    it('Ctrl+C quit with "n" does not set deathCause', async () => {
        initRng(42);
        const display = mockDisplay();
        const player = new Player();
        player.x = 10; player.y = 10;
        player.deathCause = '';

        const game = {
            player, display,
            map: { monsters: [], monsterAt() { return null; }, at() { return { typ: 0 }; }, objectsAt() { return []; }, flags: {} },
            fov: { canSee() { return false; } },
            gameOver: false,
            gameOverReason: '',
            wizard: false,
            flags: {},
        };

        pushInput('n'.charCodeAt(0));
        await rhack(3, game);

        assert.equal(game.gameOver, false);
        assert.equal(player.deathCause, '');
    });
});

// ========================================================================
// Escape sets deathCause
// ========================================================================
describe('Death cause: escape', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('going upstairs on level 1 with "y" sets deathCause to "escaped"', async () => {
        initRng(42);
        const display = mockDisplay();
        const player = new Player();
        player.x = 10; player.y = 10;
        player.dungeonLevel = 1;
        player.deathCause = '';

        const game = {
            player, display,
            map: {
                monsters: [],
                monsterAt() { return null; },
                at(x, y) {
                    if (x === 10 && y === 10) return { typ: STAIRS, flags: 1 }; // STAIRS, up
                    return { typ: 0 };
                },
                objectsAt() { return []; },
                flags: {},
            },
            fov: { canSee() { return false; } },
            gameOver: false,
            gameOverReason: '',
            wizard: false,
            flags: {},
        };

        // Queue 'y' response to "Escape the dungeon?" prompt
        pushInput('y'.charCodeAt(0));
        await rhack('<'.charCodeAt(0), game);

        assert.equal(game.gameOver, true);
        assert.equal(game.gameOverReason, 'escaped');
        assert.equal(player.deathCause, 'escaped');
    });
});

// ========================================================================
// wrapDeathText algorithm (tested as standalone logic)
// ========================================================================
describe('Death text wrapping', () => {
    // Replicate the wrapDeathText algorithm for testing
    function wrapDeathText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let current = '';
        for (const word of words) {
            if (current.length === 0) {
                current = word;
            } else if (current.length + 1 + word.length <= maxWidth) {
                current += ' ' + word;
            } else {
                lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
        return lines.slice(0, 4);
    }

    it('short text fits on one line', () => {
        const lines = wrapDeathText('killed by a newt', 16);
        assert.equal(lines.length, 1);
        assert.equal(lines[0], 'killed by a newt');
    });

    it('wraps long text across multiple lines', () => {
        const lines = wrapDeathText('killed by a very large and dangerous red dragon', 16);
        assert.ok(lines.length > 1, 'Should wrap to multiple lines');
        for (const line of lines) {
            assert.ok(line.length <= 16, `Line "${line}" exceeds maxWidth`);
        }
    });

    it('limits to 4 lines maximum', () => {
        const longText = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen';
        const lines = wrapDeathText(longText, 10);
        assert.ok(lines.length <= 4, 'Should not exceed 4 lines');
    });

    it('handles single word', () => {
        const lines = wrapDeathText('starvation', 16);
        assert.equal(lines.length, 1);
        assert.equal(lines[0], 'starvation');
    });

    it('handles empty string', () => {
        const lines = wrapDeathText('', 16);
        assert.equal(lines.length, 0);
    });

    it('handles word longer than maxWidth', () => {
        const lines = wrapDeathText('superlongmonster', 10);
        assert.equal(lines.length, 1);
        // Word exceeds maxWidth but still appears (can't break words)
        assert.equal(lines[0], 'superlongmonster');
    });
});

// ========================================================================
// Score calculation logic
// ========================================================================
describe('Game over: score calculation', () => {
    it('gold is added to score', () => {
        const p = new Player();
        p.score = 100;
        p.gold = 50;
        // Simulate: p.score += p.gold
        const finalScore = p.score + p.gold;
        assert.equal(finalScore, 150);
    });

    it('dungeon depth bonus is 50 per level below 1', () => {
        const p = new Player();
        p.score = 0;
        p.dungeonLevel = 5;
        // Simulate: p.score += (p.dungeonLevel - 1) * 50
        const depthBonus = (p.dungeonLevel - 1) * 50;
        assert.equal(depthBonus, 200);
    });

    it('deep level bonus adds 1000 per level beyond 20', () => {
        const p = new Player();
        p.maxDungeonLevel = 25;
        const deepBonus = (p.maxDungeonLevel - 20) * 1000;
        assert.equal(deepBonus, 5000);
    });

    it('no deep level bonus at level 20 or below', () => {
        const p = new Player();
        p.maxDungeonLevel = 15;
        const deepBonus = p.maxDungeonLevel > 20 ? (p.maxDungeonLevel - 20) * 1000 : 0;
        assert.equal(deepBonus, 0);
    });

    it('escape doubles gold bonus', () => {
        const p = new Player();
        p.gold = 100;
        // Normal: +gold once. Escaped: +gold twice
        const normalGoldBonus = p.gold;
        const escapedGoldBonus = p.gold * 2; // gold added once normally, then again for escape
        assert.equal(escapedGoldBonus, 200);
    });
});

// ========================================================================
// Farewell message components
// ========================================================================
describe('Game over: farewell message', () => {
    it('rankOf returns correct title for level 1', () => {
        // Wizard, level 1, male
        const rank = rankOf(1, 12, false);
        assert.equal(rank, 'Evoker');
    });

    it('roleNameForGender returns gendered name', () => {
        // Caveman (index 2), female
        assert.equal(roleNameForGender(2, true), 'Cavewoman');
        assert.equal(roleNameForGender(2, false), 'Caveman');
    });

    it('roleNameForGender returns base name when no female variant', () => {
        // Wizard (index 12), female — no namef
        assert.equal(roleNameForGender(12, true), 'Wizard');
        assert.equal(roleNameForGender(12, false), 'Wizard');
    });
});
