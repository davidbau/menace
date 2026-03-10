import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROOM, STONE } from '../../js/const.js';
import { SPE_DIG, SPE_FIREBALL, SPE_MAGIC_MAPPING } from '../../js/objects.js';
import {
    propagate_chain_lightning,
    sortspells,
    spell_cmp,
    skill_based_spellbook_id,
} from '../../js/spell.js';

describe('spell CODEMATCH compatibility surface', () => {
    it('propagate_chain_lightning enqueues forward and branch steps', () => {
        const queue = [];
        const map = { at: () => ({ typ: ROOM }) };
        const step = propagate_chain_lightning(queue, { x: 10, y: 10, dir: 0, strength: 2 }, map);
        assert.equal(step.x, 11);
        assert.equal(step.y, 10);
        assert.equal(step.strength, 1);
        assert.equal(queue.length, 3);
    });

    it('propagate_chain_lightning skips blocked terrain', () => {
        const queue = [];
        const map = { at: () => ({ typ: STONE }) };
        const step = propagate_chain_lightning(queue, { x: 10, y: 10, dir: 0, strength: 2 }, map);
        assert.equal(step, null);
        assert.equal(queue.length, 0);
    });

    it('spell_cmp/sortspells sort known spells alphabetically', () => {
        const player = {
            spells: [
                { otyp: SPE_MAGIC_MAPPING, sp_lev: 5, sp_know: 1000 },
                { otyp: SPE_FIREBALL, sp_lev: 4, sp_know: 1000 },
                { otyp: SPE_DIG, sp_lev: 5, sp_know: 1000 },
            ],
        };
        const sorted = sortspells(player, 1); // SORTBY_ALPHA
        const cmp = spell_cmp(sorted[0], sorted[1], 1);
        assert.ok(cmp <= 0);
        assert.deepEqual(sorted.map((s) => s.otyp), [SPE_DIG, SPE_FIREBALL, SPE_MAGIC_MAPPING]);
    });

    it('skill_based_spellbook_id no-ops for non-wizards', () => {
        assert.doesNotThrow(() => {
            skill_based_spellbook_id({ roleMnum: 0, roleIndex: 0, spells: [] });
        });
    });
});
