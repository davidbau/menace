// trace_compare.test.js -- Compare per-turn RNG calls against C reference trace
// Loads reference data from sessions/seed42.session.json (see docs/SESSION_FORMAT.md)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initRng, rn2, rnd, rn1, enableRngLog, getRngLog, disableRngLog } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { Player } from '../../js/player.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import { movemon } from '../../js/monmove.js';
import { FOV } from '../../js/vision.js';
import { NORMAL_SPEED, A_DEX, A_CON } from '../../js/config.js';
import { dosearch0 } from '../../js/commands.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = join(__dirname, '../comparison/sessions');

// Load session reference data
const session = JSON.parse(readFileSync(join(SESSION_DIR, 'seed42.session.json'), 'utf8'));

// Direction vectors for movement keys
const KEY_DIRS = {
    'h': [-1, 0], 'l': [1, 0], 'j': [0, 1], 'k': [0, -1],
    'y': [-1, -1], 'u': [1, -1], 'b': [-1, 1], 'n': [1, 1],
};

// Parse a session RNG entry: "rn2(12)=2 @ mon.c:1145" → {call: "rn2(12)", result: 2}
function parseRngEntry(entry) {
    const m = entry.match(/^(rn[d12]\([^)]+\))=(\d+)/);
    if (!m) return null;
    return { call: m[1], result: parseInt(m[2]) };
}

// ========================================================================
// Game simulation (JS side under test)
// ========================================================================

function mcalcmove(mon) {
    let mmove = mon.speed;
    const mmoveAdj = mmove % NORMAL_SPEED;
    mmove -= mmoveAdj;
    if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
    return mmove;
}

function exercise(player, attrIndex, inc_or_dec) {
    if (attrIndex === 1 || attrIndex === 5) return; // A_INT, A_CHA
    if (inc_or_dec) { rn2(19); } else { rn2(2); }
}

function exerper(game) {
    const { player } = game;
    const moves = game.turnCount + 1;
    if (!(moves % 10)) {
        if (player.hunger > 1000) {
            exercise(player, A_DEX, false);
        } else if (player.hunger > 150) {
            exercise(player, A_CON, true);
        }
    }
}

function simulateTurnEnd(game) {
    const { player, map } = game;
    game.turnCount++;
    player.turns = game.turnCount;
    for (const mon of map.monsters) {
        if (mon.dead) continue;
        mon.movement += mcalcmove(mon);
    }
    rn2(70); rn2(400); rn2(20);
    exerper(game);
    const dex = player.attributes ? player.attributes[A_DEX] : 14;
    rn2(40 + dex * 3);
    if (game.turnCount >= game.seerTurn) {
        game.seerTurn = game.turnCount + 15 + rn2(31);
    }
}

function setupGame() {
    initRng(session.seed);
    initLevelGeneration();
    const player = new Player();
    player.initRole(11); // PM_VALKYRIE
    player.name = session.character.name;
    player.gender = 1; // female
    const map = makelevel(1);
    wallification(map);
    player.x = map.upstair.x;
    player.y = map.upstair.y;
    player.dungeonLevel = 1;
    simulatePostLevelInit(player, map, 1);
    const fov = new FOV();
    fov.compute(map, player.x, player.y);
    return { player, map, fov, display: { putstr_message: () => {} }, turnCount: 0, seerTurn: 0 };
}

function doTurn(game) {
    movemon(game.map, game.player, game.display, game.fov);
    simulateTurnEnd(game);
    game.fov.compute(game.map, game.player.x, game.player.y);
}

// Apply a session step's action to the game state (before doTurn)
function applyAction(game, step) {
    const dir = KEY_DIRS[step.key];
    if (dir) {
        game.player.x += dir[0];
        game.player.y += dir[1];
    } else if (step.key === 's') {
        dosearch0(game.player, game.map, game.display);
    }
    // '.', ':', 'i', '@' etc. — no pre-turn action
}

// Compare JS RNG log against session reference
function compareRng(jsLog, cRng, label) {
    assert.equal(jsLog.length, cRng.length,
        `${label}: expected ${cRng.length} RNG calls, got ${jsLog.length}`);

    for (let i = 0; i < cRng.length; i++) {
        const cEntry = parseRngEntry(cRng[i]);
        if (!cEntry) continue;
        const jsMatch = jsLog[i].match(/\d+\s+(rn[d12]\([^)]+\))\s*=\s*(\d+)/);
        assert.ok(jsMatch, `${label}: could not parse JS log entry ${i}: ${jsLog[i]}`);
        assert.equal(jsMatch[1], cEntry.call,
            `${label} call ${i}: expected ${cEntry.call}, got ${jsMatch[1]}`);
        assert.equal(parseInt(jsMatch[2]), cEntry.result,
            `${label} call ${i}: ${cEntry.call} expected result ${cEntry.result}, got ${jsMatch[2]}`);
    }
}

// Keys that don't consume a game turn
const NON_TURN_KEYS = new Set([':', 'i', '@']);

describe('C trace comparison (seed 42)', () => {
    it('startup RNG count matches session reference', () => {
        enableRngLog();
        setupGame();
        const log = getRngLog();
        disableRngLog();
        // C trace has 2807 entries but 5 are rne/rnz summaries (not separate consumptions)
        assert.equal(log.length, 2802,
            `Startup should consume 2802 RNG calls, got ${log.length}`);
    });

    it('diagnostic: dump monster list after setup', () => {
        const game = setupGame();
        console.log(`\n=== Monster list (${game.map.monsters.length} total) ===`);
        for (let i = 0; i < game.map.monsters.length; i++) {
            const m = game.map.monsters[i];
            const sleeping = m.sleeping ? ' SLEEPING' : '';
            const tame = m.tame ? ' TAME' : '';
            console.log(`  [${i}] ${m.name} at (${m.mx},${m.my}) speed=${m.speed} movement=${m.movement}${sleeping}${tame}`);
        }
        console.log(`Player at (${game.player.x},${game.player.y})`);
        console.log(`Objects: ${game.map.objects.length}`);
        console.log(`DEX: ${game.player.attributes[A_DEX]}`);
    });

    // Test each step from the session that has RNG calls
    it('all session steps match C RNG traces', () => {
        const game = setupGame();
        const steps = session.steps;

        for (let si = 0; si < steps.length; si++) {
            const step = steps[si];

            // Apply action
            applyAction(game, step);

            // Steps that consume a game turn
            if (!NON_TURN_KEYS.has(step.key)) {
                enableRngLog();
                doTurn(game);
                const jsLog = getRngLog();
                disableRngLog();

                const label = `Step ${si + 1} (${step.key}/${step.action}, turn ${step.turn})`;
                console.log(`\n${label}: ${jsLog.length} RNG calls (C expects ${step.rng.length})`);

                if (jsLog.length !== step.rng.length) {
                    console.log('JS calls:');
                    for (const entry of jsLog) console.log(`  ${entry}`);
                    console.log('C calls:');
                    for (const entry of step.rng) console.log(`  ${entry}`);
                }

                compareRng(jsLog, step.rng, label);
            }
        }
    });
});
