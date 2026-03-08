import test from 'node:test';
import assert from 'node:assert/strict';

import {
    maybe_wail,
    showdamage,
    losehp,
} from '../../js/hack.js';
import {
    RACE_HUMAN,
    TELEPORT,
    SEE_INVIS,
    POISON_RES,
    COLD_RES,
    INTRINSIC,
} from '../../js/const.js';
import { PM_WIZARD } from '../../js/monsters.js';

function makeDisplayLog() {
    const messages = [];
    return {
        messages,
        putstr_message(msg) {
            messages.push(msg);
        },
    };
}

test('maybe_wail uses power-count warning for wizard/valk/elf roles', () => {
    const display = makeDisplayLog();
    const player = {
        hp: 2,
        roleMnum: PM_WIZARD,
        roleName: 'Wizard',
        raceIndex: RACE_HUMAN,
        uprops: {
            [TELEPORT]: { intrinsic: INTRINSIC },
            [SEE_INVIS]: { intrinsic: INTRINSIC },
            [POISON_RES]: { intrinsic: INTRINSIC },
            [COLD_RES]: { intrinsic: INTRINSIC },
        },
    };
    const game = { moves: 100, wailmsg: 0 };
    maybe_wail(player, game, display);
    assert.equal(display.messages.at(-1), 'Wizard, all your powers will be lost...');
});

test('maybe_wail uses life-force message when intrinsic count is low', () => {
    const display = makeDisplayLog();
    const player = {
        hp: 2,
        roleMnum: PM_WIZARD,
        roleName: 'Wizard',
        raceIndex: RACE_HUMAN,
        uprops: {
            [TELEPORT]: { intrinsic: INTRINSIC },
        },
    };
    const game = { moves: 100, wailmsg: 0 };
    maybe_wail(player, game, display);
    assert.equal(display.messages.at(-1), 'Wizard, your life force is running out.');
});

test('saving_grace path in losehp leaves hero at 1 hp', () => {
    const display = makeDisplayLog();
    const player = {
        hp: 10,
        hpmax: 10,
        usaving_grace: 0,
    };
    const game = {
        context: { mon_moving: true },
        uhp_at_start_of_monster_turn: 10,
        saving_grace_turn: false,
    };

    losehp(20, 'test trap', 0, player, display, game);

    assert.equal(player.hp, 1);
    assert.equal(player.usaving_grace, 1);
    assert.equal(game.saving_grace_turn, true);
    assert.equal(game.playerDied, undefined);
});

test('showdamage reports polymorph hp pool when enabled', () => {
    const display = makeDisplayLog();
    const player = {
        upolyd: true,
        hp: 9,
        mh: 5,
    };
    const game = { iflags: { showdamage: true } };
    showdamage(3, player, display, game);
    assert.equal(display.messages.at(-1), '[HP -3, 5 left]');
});

