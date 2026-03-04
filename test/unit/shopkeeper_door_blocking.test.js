import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROOM, ROOMOFFSET, SHOPBASE } from '../../js/config.js';
import { u_left_shop } from '../../js/shk.js';
import { check_special_room } from '../../js/hack.js';

function makeShopState() {
    const shopChar = String.fromCharCode(ROOMOFFSET);
    const shkp = {
        isshk: true,
        dead: false,
        mpeaceful: true,
        peaceful: true,
        following: 0,
        shoproom: ROOMOFFSET,
        mx: 10,
        my: 10,
    };
    shkp.shk = { x: 10, y: 10 };
    shkp.shd = { x: 11, y: 10 };
    const map = {
        rooms: [{ rtype: SHOPBASE, resident: shkp }],
        monsters: [shkp],
        at(x, y) {
            if (x === 10 && y === 10) return { typ: ROOM, roomno: ROOMOFFSET, edge: false };
            if (x === 11 && y === 10) return { typ: ROOM, roomno: ROOMOFFSET, edge: true };
            return { typ: ROOM, roomno: 0, edge: false };
        },
    };
    return { map, shkp, shopChar };
}

describe('shopkeeper door blocking', () => {
    it('starts pursuit when leaving a shop with unpaid inventory', async () => {
        const { map, shkp, shopChar } = makeShopState();
        const player = { x: 0, y: 0, name: 'Agent', inventory: [{ unpaid: 1 }] };

        await u_left_shop(shopChar, false, map, player);

        assert.equal(shkp.following, 1);
        assert.equal(shkp.mpeaceful, false);
    });

    it('wires shop-exit handling through check_special_room transitions', async () => {
        const { map, shkp, shopChar } = makeShopState();
        const player = {
            x: 0,
            y: 0,
            name: 'Agent',
            inventory: [{ unpaid: 1 }],
            ushops: shopChar,
            urooms: '',
        };
        const display = { async putstr_message() {} };

        await check_special_room(false, player, map, display);

        assert.equal(shkp.following, 1);
    });
});
