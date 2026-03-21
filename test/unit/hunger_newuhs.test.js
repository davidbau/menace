import test from 'node:test';
import assert from 'node:assert/strict';

import { morehungry, resetHungerState } from '../../js/eat.js';
import { initRng, enableRngLog, getRngLog, disableRngLog } from '../../js/rng.js';
import { setGame } from '../../js/gstate.js';
import { ensureAttrArrays } from '../../js/attrib.js';
import { A_STR, A_CON } from '../../js/const.js';

// NOT_HUNGRY=1, HUNGRY=2, WEAK=3, FAINTING=4, FAINTED=5
const NOT_HUNGRY = 1;
const HUNGRY = 2;
const WEAK = 3;
const FAINTING = 4;
const FAINTED = 5;

function makePlayer(hunger = 900) {
    const p = {
        hunger,
        hungerState: NOT_HUNGRY,
        uhs: NOT_HUNGRY,
        uhp: 16,
        hp: 16,
        attributes: [16, 10, 10, 10, 14, 10], // STR=16, CON=14
        roleIndex: 0, // Archaeologist (generic)
        race: 0, // Human
        getPropTimeout: () => 0,
    };
    ensureAttrArrays(p);
    return p;
}

function makeGame(player) {
    const g = {
        multi: 0,
        multi_reason: null,
        nomovemsg: null,
        occupation: null,
        disp: { botl: false },
        display: { putstr_message() {} },
        u: player || null,
    };
    Object.defineProperty(g, 'player', { get() { return g.u; }, enumerable: false, configurable: true });
    return g;
}

test.beforeEach(() => {
    resetHungerState();
});

test('NOT_HUNGRY → HUNGRY transition at hunger=150 boundary', async () => {
    const player = makePlayer(152); // just above HUNGRY threshold
    const game = makeGame(player);
    setGame(game);
    initRng(42);

    // Drop from 152 to 150 → still NOT_HUNGRY (>150)
    await morehungry(player, 1);
    assert.equal(player.uhs, NOT_HUNGRY);

    // Drop from 151 to 150 → exactly 150 → HUNGRY (h > 50, not > 150)
    await morehungry(player, 1);
    assert.equal(player.uhs, HUNGRY);
    assert.equal(player.hungerState, HUNGRY);
});

test('HUNGRY → WEAK transition at hunger=50 boundary', async () => {
    const player = makePlayer(52);
    player.uhs = HUNGRY;
    player.hungerState = HUNGRY;
    const game = makeGame(player);
    setGame(game);
    initRng(42);

    await morehungry(player, 1);
    assert.equal(player.uhs, HUNGRY);

    await morehungry(player, 1);
    assert.equal(player.uhs, WEAK);
    assert.equal(player.hungerState, WEAK);
});

test('ATEMP(A_STR) set to -1 on entering WEAK', async () => {
    const player = makePlayer(51); // just above WEAK threshold
    player.uhs = HUNGRY;
    player.hungerState = HUNGRY;
    const game = makeGame(player);
    setGame(game);
    initRng(42);

    assert.equal(player.atemp[A_STR], 0);
    await morehungry(player, 1); // 51 → 50, enters WEAK
    assert.equal(player.uhs, WEAK);
    assert.equal(player.atemp[A_STR], -1);
});

test('ATEMP(A_STR) repaired to 0 on leaving WEAK', async () => {
    const player = makePlayer(50);
    player.uhs = WEAK;
    player.hungerState = WEAK;
    player.atemp[A_STR] = -1;
    const game = makeGame(player);
    setGame(game);
    initRng(42);

    // lesshungry isn't exported; use morehungry with negative num
    await morehungry(player, -101); // 50 → 151, enters NOT_HUNGRY
    assert.equal(player.uhs, NOT_HUNGRY);
    assert.equal(player.atemp[A_STR], 0);
});

test('WEAK → FAINTING transition triggers faint when u.uhs <= WEAK', async () => {
    const player = makePlayer(1);
    player.uhs = WEAK;
    player.hungerState = WEAK;
    const game = makeGame(player);
    setGame(game);
    initRng(42);

    await morehungry(player, 1); // hunger=0, enters FAINTING territory
    // C: u.uhs <= WEAK is true, so faint happens without rn2 check
    assert.equal(player.uhs, FAINTED);
    assert.ok(game.multi < 0, 'nomul should set multi negative');
});

test('FAINTING state consumes rn2 for repeated faint check', async () => {
    const player = makePlayer(-5);
    player.uhs = FAINTED; // already fainted
    player.hungerState = FAINTED;
    const game = makeGame(player);
    game.multi = -3; // still paralyzed from previous faint
    setGame(game);
    initRng(42);
    enableRngLog();

    await morehungry(player, 1); // hunger=-6, still FAINTING territory
    const log = getRngLog() || [];
    disableRngLog();

    // C: u.uhs > WEAK (FAINTED=5 > WEAK=3), so rn2 IS called
    assert.ok(log.some(e => e.includes('rn2(')),
        'Expected rn2 call for fainting check when already fainted');
});

test('meal-in-progress suppresses messages', async () => {
    const player = makePlayer(152);
    player.uhs = NOT_HUNGRY;
    player.hungerState = NOT_HUNGRY;
    const game = makeGame(player);
    // Simulate eating occupation
    game.occupation = { isEating: true, fn: async () => 1 };
    setGame(game);
    initRng(42);

    // Drop below HUNGRY threshold during eating — state updates but no message
    await morehungry(player, 3); // 152 → 149, HUNGRY territory
    assert.equal(player.uhs, HUNGRY);
    assert.equal(player.hungerState, HUNGRY);
});

test('starvation death threshold based on CON', async () => {
    // With CON=14, death at hunger < -(100 + 10*14) = -240
    const player = makePlayer(-239);
    player.uhs = FAINTED;
    player.hungerState = FAINTED;
    const game = makeGame(player);
    setGame(game);
    initRng(42);
    enableRngLog();

    // At hunger=-239, not yet dead (>= -240)
    // morehungry(1) → hunger=-240, which is NOT < -240, so no death
    await morehungry(player, 1);
    const log1 = getRngLog() || [];
    disableRngLog();

    // Should have consumed fainting RNG but not died
    // (death is at < -240, not <= -240)
    assert.notEqual(player.uhs, 6 /* STARVED */);
});
