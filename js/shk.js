// shk.js -- Shopkeeper interaction logic
// Mirrors shk.c from the C source.
// Handles shop pricing, entry messages, and shopkeeper queries.

import { SHOPBASE, ROOMOFFSET, COLNO, ROWNO, DOOR, CORR, A_CHA } from './config.js';
import { objectData, WEAPON_CLASS, ARMOR_CLASS, WAND_CLASS, POTION_CLASS, TOOL_CLASS,
         COIN_CLASS, GEM_CLASS, POT_WATER, DUNCE_CAP,
         TALLOW_CANDLE, WAX_CANDLE } from './objects.js';
import { isObjectNameKnown } from './discovery.js';
import { doname } from './mkobj.js';
import { currency } from './invent.js';
import { greetingForRole } from './player.js';
import { shtypes } from './shknam.js';

function roomMatchesType(map, roomno, typeWanted) {
    if (!Number.isInteger(roomno) || roomno < ROOMOFFSET) return false;
    if (!typeWanted) return true;
    const room = map.rooms?.[roomno - ROOMOFFSET];
    if (!room) return false;
    const rt = Number(room.rtype || 0);
    return rt === typeWanted || (typeWanted === SHOPBASE && rt > SHOPBASE);
}

function inRoomsAt(map, x, y, typeWanted = 0) {
    const loc = map.at(x, y);
    if (!loc) return [];
    const out = [];
    const seen = new Set();
    const addRoom = (roomno) => {
        if (!roomMatchesType(map, roomno, typeWanted)) return;
        if (seen.has(roomno)) return;
        seen.add(roomno);
        out.push(roomno);
    };

    const roomno = Number(loc.roomno || 0);
    if (roomno >= ROOMOFFSET) {
        addRoom(roomno);
        return out;
    }

    if (roomno === 1 || roomno === 2) {
        const step = (roomno === 1) ? 2 : 1;
        const minX = Math.max(0, x - 1);
        const maxX = Math.min(COLNO - 1, x + 1);
        const minY = Math.max(0, y - 1);
        const maxY = Math.min(ROWNO - 1, y + 1);
        for (let xx = minX; xx <= maxX; xx += step) {
            for (let yy = minY; yy <= maxY; yy += step) {
                const nloc = map.at(xx, yy);
                addRoom(Number(nloc?.roomno || 0));
            }
        }
    }

    if (typeWanted === SHOPBASE && out.length === 0 && (loc.typ === DOOR || loc.typ === CORR)) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nloc = map.at(x + dx, y + dy);
                addRoom(Number(nloc?.roomno || 0));
            }
        }
    }

    return out;
}

function insideShop(map, x, y) {
    const loc = map.at(x, y);
    const roomno = Number(loc?.roomno || 0);
    if (roomno < ROOMOFFSET || !!loc?.edge) return 0;
    if (!roomMatchesType(map, roomno, SHOPBASE)) return 0;
    return roomno;
}

function findShopkeeper(map, roomno) {
    return (map.monsters || []).find((m) =>
        m && !m.dead && m.isshk && Number(m.shoproom || 0) === roomno
    ) || null;
}

function shopkeeperName(shkp) {
    const raw = String(shkp?.shknam || shkp?.name || 'shopkeeper');
    return raw.replace(/^[_+\-|]/, '');
}

function capitalizeWord(text) {
    const s = String(text || '');
    if (!s) return s;
    return s[0].toUpperCase() + s.slice(1);
}

function sSuffix(name) {
    const s = String(name || '');
    if (!s) return "shopkeeper's";
    return s.endsWith('s') ? `${s}'` : `${s}'s`;
}

function roundScaled(value, multiplier, divisor) {
    let out = value * multiplier;
    if (divisor > 1) {
        out = Math.floor((out * 10) / divisor);
        out = Math.floor((out + 5) / 10);
    }
    return out;
}

function getprice(obj) {
    const od = objectData[obj.otyp] || {};
    let tmp = Number(od.cost || 0);
    if (obj.oclass === WAND_CLASS && Number(obj.spe || 0) === -1) {
        tmp = 0;
    } else if (obj.oclass === POTION_CLASS
               && obj.otyp === POT_WATER
               && !obj.blessed
               && !obj.cursed) {
        tmp = 0;
    } else if ((obj.oclass === ARMOR_CLASS || obj.oclass === WEAPON_CLASS)
               && Number(obj.spe || 0) > 0) {
        tmp += 10 * Number(obj.spe || 0);
    } else if (obj.oclass === TOOL_CLASS
               && (obj.otyp === TALLOW_CANDLE || obj.otyp === WAX_CANDLE)
               && Number(obj.age || 0) > 0
               && Number(obj.age || 0) < 20 * Number(od.cost || 0)) {
        tmp = Math.floor(tmp / 2);
    }
    return tmp;
}

function getCost(obj, player, shkp) {
    let tmp = getprice(obj);
    let multiplier = 1;
    let divisor = 1;
    if (!tmp) tmp = 5;

    const dknown = !!obj.dknown || !!obj.known;
    const nameKnown = isObjectNameKnown(obj.otyp);
    if (!(dknown && nameKnown) && obj.oclass !== GEM_CLASS) {
        if ((Number(obj.o_id || 0) % 4) === 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    if (player?.helmet?.otyp === DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if (player?.roleIndex === 10 && Number(player.level || 1) < 15) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = Number(player?.attributes?.[A_CHA] || 10);
    if (cha > 18) {
        divisor *= 2;
    } else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) {
        multiplier *= 2;
    } else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp = roundScaled(tmp, multiplier, divisor);
    if (tmp <= 0) tmp = 1;
    if (shkp?.surcharge) {
        tmp += Math.floor((tmp + 2) / 3);
    }
    return tmp;
}

function getShopQuoteForFloorObject(obj, player, map) {
    if (!obj || obj.oclass === COIN_CLASS) return null;
    if (!Number.isInteger(obj.ox) || !Number.isInteger(obj.oy)) return null;

    const playerShops = inRoomsAt(map, player.x, player.y, SHOPBASE);
    if (playerShops.length === 0) return null;
    const objShops = inRoomsAt(map, obj.ox, obj.oy, SHOPBASE);
    const shoproom = playerShops.find((r) => objShops.includes(r));
    if (!shoproom) return null;

    const shkp = findShopkeeper(map, shoproom);
    if (!shkp || insideShop(map, shkp.mx, shkp.my) !== shoproom) return null;

    const freeSpot = !!(shkp.shk
        && Number(shkp.shk.x) === obj.ox
        && Number(shkp.shk.y) === obj.oy);
    const noCharge = !!obj.no_charge || freeSpot;
    if (!obj.unpaid && noCharge) {
        return { cost: 0, noCharge: true };
    }
    const units = Math.max(1, Number(obj.quan || 1));
    return { cost: units * getCost(obj, player, shkp), noCharge: false };
}

export function describeGroundObjectForPlayer(obj, player, map) {
    const base = doname(obj, null);
    const quote = getShopQuoteForFloorObject(obj, player, map);
    if (!quote) return base;
    if (quote.cost > 0) {
        return `${base} (for sale, ${quote.cost} ${currency(quote.cost)})`;
    }
    if (quote.noCharge) {
        return `${base} (no charge)`;
    }
    return base;
}

export function maybeHandleShopEntryMessage(game, oldX, oldY) {
    const { map, player, display } = game;
    const oldShops = inRoomsAt(map, oldX, oldY, SHOPBASE);
    const newShops = inRoomsAt(map, player.x, player.y, SHOPBASE);
    game._ushops = newShops;
    const entered = newShops.filter((r) => !oldShops.includes(r));
    if (entered.length === 0) return;

    const shoproom = entered[0];
    const shkp = findShopkeeper(map, shoproom);
    if (!shkp || insideShop(map, shkp.mx, shkp.my) !== shoproom || shkp.following) return;

    const room = map.rooms?.[shoproom - ROOMOFFSET];
    const rtype = Number(room?.rtype || SHOPBASE);
    const shopTypeName = shtypes[rtype - SHOPBASE]?.name || 'shop';
    const plname = String(player?.name || 'customer').toLowerCase();
    const shkName = shopkeeperName(shkp);

    if (shkp.peaceful === false || shkp.mpeaceful === false) {
        display.putstr_message(`"So, ${plname}, you dare return to ${sSuffix(shkName)} ${shopTypeName}?!"`);
        return;
    }
    if (shkp.surcharge) {
        display.putstr_message(`"Back again, ${plname}?  I've got my eye on you."`);
        return;
    }
    if (shkp.robbed) {
        display.putstr_message(`${capitalizeWord(shkName)} mutters imprecations against shoplifters.`);
        return;
    }

    const visitct = Number(shkp.visitct || 0);
    const greeting = greetingForRole(player.roleIndex);
    display.putstr_message(`"${greeting}, ${plname}!  Welcome${visitct ? ' again' : ''} to ${sSuffix(shkName)} ${shopTypeName}!"`);
    shkp.visitct = visitct + 1;
}
