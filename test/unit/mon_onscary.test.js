import test from 'node:test';
import assert from 'node:assert/strict';

import { onscary } from '../../js/mon.js';
import { setGame } from '../../js/gstate.js';
import { ALTAR, ROOM, A_LAWFUL } from '../../js/const.js';
import { PM_VAMPIRE, PM_MINOTAUR, S_VAMPIRE } from '../../js/monsters.js';

function mkMap(typ = ROOM) {
    return {
        flags: {},
        objects: [],
        engravings: [],
        at: () => ({ typ }),
    };
}

test('onscary: lawful minion is directly scare-resistant', () => {
    const map = mkMap(ROOM);
    const mon = {
        isminion: true,
        emin: { min_align: A_LAWFUL },
        data: { mlet: 0, maligntyp: 1 },
    };
    assert.equal(onscary(map, 0, 0, mon), false);
});

test('onscary: vampire shifter is scared by altar square', () => {
    const map = mkMap(ALTAR);
    const mon = {
        cham: PM_VAMPIRE,
        data: { mlet: S_VAMPIRE },
    };
    assert.equal(onscary(map, 5, 6, mon), true);
});

test('onscary: displaced Elbereth protection is honored', () => {
    const map = mkMap(ROOM);
    map.engravings.push({ x: 2, y: 2, text: 'Elbereth', guardobjects: false });
    const game = { player: { x: 1, y: 1, displaced: true } };
    setGame(game);
    const mon = {
        mux: 2,
        muy: 2,
        mcansee: true,
        mpeaceful: false,
        data: { mndx: 0 },
    };
    assert.equal(onscary(map, 2, 2, mon), true);
    setGame(null);
});

test('onscary: Elbereth excludes minotaur', () => {
    const map = mkMap(ROOM);
    map.engravings.push({ x: 3, y: 3, text: 'Elbereth', guardobjects: false });
    const game = { player: { x: 3, y: 3, displaced: false } };
    setGame(game);
    const mon = {
        mcansee: true,
        mpeaceful: false,
        data: { mndx: PM_MINOTAUR },
    };
    assert.equal(onscary(map, 3, 3, mon), false);
    setGame(null);
});
