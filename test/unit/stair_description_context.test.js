import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STAIRS } from '../../js/config.js';
import { do_screen_description } from '../../js/look.js';
import { dfeature_at } from '../../js/invent.js';

function makeTerrainMap(loc) {
    return {
        at() { return loc; },
        monsterAt() { return null; },
        objectsAt() { return []; },
        trapAt() { return null; },
    };
}

describe('stair description context', () => {
    it('reports generic upstairs text on non-DoD level 1', () => {
        const map = makeTerrainMap({ typ: STAIRS, flags: 1, branchStair: true, _genDnum: 1 });
        map._genDnum = 1;
        const player = { x: 10, y: 5, dungeonLevel: 1, dnum: 1 };

        const desc = do_screen_description({ map, player }, { x: 11, y: 5 });
        assert.equal(desc.text, 'There is a staircase up here.');
    });

    it('reports dungeon exit text only on DoD level 1 upstairs', () => {
        const map = makeTerrainMap({ typ: STAIRS, flags: 1 });
        map._genDnum = 0;
        const player = { x: 10, y: 5, dungeonLevel: 1, dnum: 0 };

        const desc = do_screen_description({ map, player }, { x: 11, y: 5 });
        assert.equal(desc.text, 'There is a staircase up out of the dungeon here.');
    });

    it('dfeature_at does not call branch level-1 stairs dungeon exits', () => {
        const map = {
            at() { return { typ: STAIRS, flags: 1 }; },
            upstair: { x: 3, y: 4 },
        };
        assert.equal(dfeature_at(3, 4, map, { depth: 1, dnum: 1 }), 'staircase up');
        assert.equal(dfeature_at(3, 4, map, { depth: 1, dnum: 0 }), 'staircase up out of the dungeon');
    });
});
