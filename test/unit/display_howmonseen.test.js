import test from 'node:test';
import assert from 'node:assert/strict';

import {
    howmonseen,
} from '../../js/display.js';
import {
    MONSEEN_NORMAL,
    MONSEEN_SEEINVIS,
    MONSEEN_TELEPAT,
    MONSEEN_XRAYVIS,
    MONSEEN_DETECT,
    MONSEEN_WARNMON,
    ROOM,
} from '../../js/const.js';

function makeMap() {
    return {
        at(x, y) {
            if (x < 0 || y < 0 || x >= 80 || y >= 21) return null;
            return { typ: ROOM, flags: 0, lit: true };
        },
        objectsAt() { return []; },
        monsterAt() { return null; },
        gasClouds: [],
        flags: {},
    };
}

function makeCtx(overrides = {}) {
    const player = {
        x: 10,
        y: 10,
        blind: false,
        xray_range: -1,
        uprops: {},
        ...overrides.player,
    };
    const fov = {
        canSee(x, y) {
            return x === 12 && y === 10;
        },
        ...(overrides.fov || {}),
    };
    return {
        map: overrides.map || makeMap(),
        player,
        fov,
    };
}

test('howmonseen sets normal visibility bit for visible non-invisible monster', () => {
    const ctx = makeCtx();
    const mon = { mx: 12, my: 10, minvis: false, mundetected: false };
    const seen = howmonseen(mon, ctx);
    assert.ok((seen & MONSEEN_NORMAL) !== 0);
    assert.equal((seen & MONSEEN_SEEINVIS) !== 0, false);
});

test('howmonseen sets see-invisible bit for visible invisible monster', () => {
    const ctx = makeCtx({ player: { seeInvisible: true } });
    const mon = { mx: 12, my: 10, minvis: true, mundetected: false };
    const seen = howmonseen(mon, ctx);
    assert.ok((seen & MONSEEN_SEEINVIS) !== 0);
});

test('howmonseen sets telepathy/xray/detect/warn bits when applicable', () => {
    const ctx = makeCtx({
        player: {
            xray_range: 3,
            telepathy: true,
            detectMonsters: true,
            warning: true,
        },
    });
    const mon = {
        mx: 12,
        my: 10,
        minvis: false,
        mundetected: false,
        data: { mflags2: 0 },
    };
    const seen = howmonseen(mon, ctx);
    assert.ok((seen & MONSEEN_TELEPAT) !== 0);
    assert.ok((seen & MONSEEN_XRAYVIS) !== 0);
    assert.ok((seen & MONSEEN_DETECT) !== 0);
    assert.ok((seen & MONSEEN_WARNMON) !== 0);
});
