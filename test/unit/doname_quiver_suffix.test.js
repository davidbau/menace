import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { doname, mksobj } from '../../js/mkobj.js';
import {
    ARROW, DART, FLINT, SCALPEL,
} from '../../js/objects.js';

function markKnown(obj) {
    obj.known = true;
    obj.dknown = true;
    obj.bknown = true;
    obj.blessed = false;
    obj.cursed = false;
    obj.spe = obj.spe || 0;
    return obj;
}

function makePlayer(quiverObj) {
    return {
        roleName: 'Wizard',
        weapon: null,
        swapWeapon: null,
        armor: null,
        shield: null,
        helmet: null,
        gloves: null,
        boots: null,
        cloak: null,
        quiver: quiverObj,
    };
}

describe('doname quiver suffixes', () => {
    it('formats flint as flint stone(s)', () => {
        const flint = markKnown(mksobj(FLINT, true, false));
        flint.quan = 2;
        const out = doname(flint, null);
        assert.match(out, /flint stones/);
    });

    it('shows in quiver for arrow ammo', () => {
        const arrow = markKnown(mksobj(ARROW, true, false));
        const out = doname(arrow, makePlayer(arrow));
        assert.match(out, /\(in quiver\)$/);
    });

    it('shows in quiver pouch for flint', () => {
        const flint = markKnown(mksobj(FLINT, true, false));
        const out = doname(flint, makePlayer(flint));
        assert.match(out, /\(in quiver pouch\)$/);
    });

    it('shows at the ready for darts', () => {
        const dart = markKnown(mksobj(DART, true, false));
        const out = doname(dart, makePlayer(dart));
        assert.match(out, /\(at the ready\)$/);
    });

    it('shows player-assigned object name as named suffix', () => {
        const scalpel = markKnown(mksobj(SCALPEL, true, false));
        scalpel.oname = 'e';
        const out = doname(scalpel, null);
        assert.match(out, / named e$/);
    });
});
