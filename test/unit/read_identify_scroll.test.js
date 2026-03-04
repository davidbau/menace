import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { seffects } from '../../js/read.js';
import { objectData, SCR_IDENTIFY, WAN_FIRE } from '../../js/objects.js';

describe('read: identify scroll', () => {
    it('identifies inventory items that are name-unknown but dknown/bknown', async () => {
        const prevKnown = !!objectData[WAN_FIRE].name_known;
        try {
            objectData[WAN_FIRE].name_known = false;

            const target = {
                otyp: WAN_FIRE,
                oclass: objectData[WAN_FIRE].oc_class,
                quan: 1,
                invlet: 'a',
                known: false,
                bknown: true,
                dknown: true,
                rknown: false,
                cknown: false,
            };
            const scroll = {
                otyp: SCR_IDENTIFY,
                oclass: objectData[SCR_IDENTIFY].oc_class,
                quan: 1,
                invlet: 'z',
                blessed: false,
                cursed: false,
                known: false,
                bknown: true,
                dknown: true,
            };
            const player = {
                inventory: [target, scroll],
                luck: 0,
                confused: false,
                removeFromInventory(obj) {
                    const idx = this.inventory.indexOf(obj);
                    if (idx >= 0) this.inventory.splice(idx, 1);
                },
            };
            const display = {
                async putstr_message() {},
            };

            const consumed = await seffects(scroll, player, display, null);

            assert.equal(consumed, true);
            assert.equal(player.inventory.includes(scroll), false);
            assert.equal(target.known, true);
            assert.equal(target.bknown, true);
            assert.equal(target.dknown, true);
            assert.equal(target.rknown, true);
            assert.equal(objectData[WAN_FIRE].name_known, true);
        } finally {
            objectData[WAN_FIRE].name_known = prevKnown;
        }
    });
});
