// extralev.c helper functions moved out of dungeon.js to mirror C file layout.

import { rn1, rn2, rnd } from './rng.js';
import { GameMap } from './game.js';
import { curse, mksobj, weight } from './mkobj.js';
import {
    ARROW, BOW, FAKE_AMULET_OF_YENDOR, FOOD_RATION, MACE, PLATE_MAIL, RING_MAIL, TWO_HANDED_SWORD,
} from './objects.js';
import { CORR, D_NODOOR, OROOM, SCORR } from './const.js';
import { PM_GHOST } from './monsters.js';
import { makemon } from './makemon.js';
import { NO_MM_FLAGS } from './const.js';
import { christen_monst, roguename } from './do_name.js';
import { placeFloorObject } from './stackobj.js';
import {
    fill_ordinary_room,
} from './dungeon.js';
import { add_room, dodoor, generate_stairs, sort_rooms } from './mklev.js';

export const XL_UP = 1;
export const XL_DOWN = 2;
export const XL_LEFT = 4;
export const XL_RIGHT = 8;

// C ref: extralev.c:277 corr()
export function corr(map, x, y) {
    if (rn2(50)) { map.locations[x][y].typ = CORR; }
    else { map.locations[x][y].typ = SCORR; }
}

// C ref: extralev.c:20 roguejoin()
export function roguejoin(map, x1, y1, x2, y2, horiz) {
    if (horiz) {
        const middle = x1 + rn2(x2 - x1 + 1);
        for (let x = Math.min(x1, middle); x <= Math.max(x1, middle); x++) {
            corr(map, x, y1);
        }
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
            corr(map, middle, y);
        }
        for (let x = Math.min(middle, x2); x <= Math.max(middle, x2); x++) {
            corr(map, x, y2);
        }
    } else {
        const middle = y1 + rn2(y2 - y1 + 1);
        for (let y = Math.min(y1, middle); y <= Math.max(y1, middle); y++) {
            corr(map, x1, y);
        }
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            corr(map, x, middle);
        }
        for (let y = Math.min(middle, y2); y <= Math.max(middle, y2); y++) {
            corr(map, x2, y);
        }
    }
}

// C ref: extralev.c:138 miniwalk() — recursive 3x3 room connection walk.
export function miniwalk(rooms, x, y) {
    while (true) {
        const dirs = [];
        const doorhere = rooms[x][y].doortable;
        if (x > 0 && !(doorhere & XL_LEFT)
            && (!rooms[x - 1][y].doortable || !rn2(10))) dirs.push(0);
        if (x < 2 && !(doorhere & XL_RIGHT)
            && (!rooms[x + 1][y].doortable || !rn2(10))) dirs.push(1);
        if (y > 0 && !(doorhere & XL_UP)
            && (!rooms[x][y - 1].doortable || !rn2(10))) dirs.push(2);
        if (y < 2 && !(doorhere & XL_DOWN)
            && (!rooms[x][y + 1].doortable || !rn2(10))) dirs.push(3);
        if (!dirs.length) return;

        const dir = dirs[rn2(dirs.length)];
        switch (dir) {
        case 0:
            rooms[x][y].doortable |= XL_LEFT;
            x--;
            rooms[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            rooms[x][y].doortable |= XL_RIGHT;
            x++;
            rooms[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            rooms[x][y].doortable |= XL_UP;
            y--;
            rooms[x][y].doortable |= XL_DOWN;
            break;
        default:
            rooms[x][y].doortable |= XL_DOWN;
            y++;
            rooms[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(rooms, x, y);
    }
}

// C ref: extralev.c:45 roguecorr()
export function roguecorr(map, rooms, x0, y0, dir, depth) {
    let x = x0;
    let y = y0;
    let fromx; let fromy; let tox; let toy;

    if (dir === XL_DOWN) {
        rooms[x][y].doortable &= ~XL_DOWN;
        if (!rooms[x][y].real) {
            fromx = 1 + 26 * x + rooms[x][y].rlx;
            fromy = 7 * y + rooms[x][y].rly;
        } else {
            fromx = 1 + 26 * x + rooms[x][y].rlx + rn2(rooms[x][y].dx);
            fromy = 7 * y + rooms[x][y].rly + rooms[x][y].dy;
            dodoor(map, fromx, fromy, map.rooms[rooms[x][y].nroom], depth);
            map.at(fromx, fromy).flags = D_NODOOR;
            fromy++;
        }

        if (y >= 2) return;
        y++;
        rooms[x][y].doortable &= ~XL_UP;
        if (!rooms[x][y].real) {
            tox = 1 + 26 * x + rooms[x][y].rlx;
            toy = 7 * y + rooms[x][y].rly;
        } else {
            tox = 1 + 26 * x + rooms[x][y].rlx + rn2(rooms[x][y].dx);
            toy = 7 * y + rooms[x][y].rly - 1;
            dodoor(map, tox, toy, map.rooms[rooms[x][y].nroom], depth);
            map.at(tox, toy).flags = D_NODOOR;
            toy--;
        }
        roguejoin(map, fromx, fromy, tox, toy, false);
        return;
    }

    if (dir !== XL_RIGHT) return;
    rooms[x][y].doortable &= ~XL_RIGHT;
    if (!rooms[x][y].real) {
        fromx = 1 + 26 * x + rooms[x][y].rlx;
        fromy = 7 * y + rooms[x][y].rly;
    } else {
        fromx = 1 + 26 * x + rooms[x][y].rlx + rooms[x][y].dx;
        fromy = 7 * y + rooms[x][y].rly + rn2(rooms[x][y].dy);
        dodoor(map, fromx, fromy, map.rooms[rooms[x][y].nroom], depth);
        map.at(fromx, fromy).flags = D_NODOOR;
        fromx++;
    }

    if (x >= 2) return;
    x++;
    rooms[x][y].doortable &= ~XL_LEFT;
    if (!rooms[x][y].real) {
        tox = 1 + 26 * x + rooms[x][y].rlx;
        toy = 7 * y + rooms[x][y].rly;
    } else {
        tox = 1 + 26 * x + rooms[x][y].rlx - 1;
        toy = 7 * y + rooms[x][y].rly + rn2(rooms[x][y].dy);
        dodoor(map, tox, toy, map.rooms[rooms[x][y].nroom], depth);
        map.at(tox, toy).flags = D_NODOOR;
        tox--;
    }
    roguejoin(map, fromx, fromy, tox, toy, true);
}

// C ref: extralev.c:288 makerogueghost()
export function makerogueghost(map, _depth) {
    if (!map.nroom) return;

    const croom = map.rooms[rn2(map.nroom)];
    const x = rn1(croom.hx - croom.lx + 1, croom.lx);
    const y = rn1(croom.hy - croom.ly + 1, croom.ly);

    const ghost = makemon(PM_GHOST, x, y, NO_MM_FLAGS, _depth, map);
    if (!ghost) return;
    ghost.msleeping = true;
    christen_monst(ghost, roguename());

    const mksobj_at = (otyp, init = false, artif = false) => {
        const otmp = mksobj(otyp, init, artif);
        otmp.ox = x;
        otmp.oy = y;
        placeFloorObject(map, otmp);
        return otmp;
    };

    if (rn2(4)) {
        const ration = mksobj_at(FOOD_RATION, false, false);
        ration.quan = rnd(7);
        ration.owt = weight(ration);
    }

    if (rn2(2)) {
        const mace = mksobj_at(MACE, false, false);
        mace.spe = rnd(3);
        if (rn2(4)) curse(mace);
    } else {
        const sword = mksobj_at(TWO_HANDED_SWORD, false, false);
        sword.spe = rnd(5) - 2;
        if (rn2(4)) curse(sword);
    }

    const bow = mksobj_at(BOW, false, false);
    bow.spe = 1;
    if (rn2(4)) curse(bow);

    const arrows = mksobj_at(ARROW, false, false);
    arrows.spe = 0;
    arrows.quan = rn1(10, 25);
    arrows.owt = weight(arrows);
    if (rn2(4)) curse(arrows);

    if (rn2(2)) {
        const ringMail = mksobj_at(RING_MAIL, false, false);
        ringMail.spe = rn2(3);
        if (!rn2(3)) ringMail.oerodeproof = true;
        if (rn2(4)) curse(ringMail);
    } else {
        const plateMail = mksobj_at(PLATE_MAIL, false, false);
        plateMail.spe = rnd(5) - 2;
        if (!rn2(3)) plateMail.oerodeproof = true;
        if (rn2(4)) curse(plateMail);
    }

    if (rn2(2)) {
        const fakeAmulet = mksobj_at(FAKE_AMULET_OF_YENDOR, true, false);
        fakeAmulet.known = true;
    }
}

// C ref: extralev.c:193 makeroguerooms()
export function makeroguerooms(depth = 15) {
    const map = new GameMap();
    map.clear();
    if (!map.flags) map.flags = {};
    map.flags.is_rogue_lev = true;
    map.flags.roguelike = true;

    const rooms = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ({})));
    let nroom = 0;
    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            if (!rn2(5) && (nroom || (x < 2 && y < 2))) {
                rooms[x][y].real = false;
                rooms[x][y].rlx = rn1(22, 2);
                rooms[x][y].rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                rooms[x][y].real = true;
                rooms[x][y].dx = rn1(22, 2);
                rooms[x][y].dy = rn1((y === 2) ? 4 : 3, 2);
                rooms[x][y].rlx = rnd(23 - rooms[x][y].dx + 1);
                rooms[x][y].rly = rnd(((y === 2) ? 5 : 4) - rooms[x][y].dy + 1);
                nroom++;
            }
            rooms[x][y].doortable = 0;
        }
    }

    const startY = rn2(3);
    const startX = rn2(3);
    miniwalk(rooms, startX, startY);

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            if (!rooms[x][y].real) continue;

            rooms[x][y].nroom = map.nroom;
            map.smeq[map.nroom] = map.nroom;

            const lowx = 1 + 26 * x + rooms[x][y].rlx;
            const lowy = 7 * y + rooms[x][y].rly;
            const hix = lowx + rooms[x][y].dx - 1;
            const hiy = lowy + rooms[x][y].dy - 1;
            add_room(map, lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
        }
    }

    for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
            if (rooms[x][y].doortable & XL_DOWN) roguecorr(map, rooms, x, y, XL_DOWN, depth);
            if (rooms[x][y].doortable & XL_RIGHT) roguecorr(map, rooms, x, y, XL_RIGHT, depth);
        }
    }

    makerogueghost(map, depth);
    sort_rooms(map);
    generate_stairs(map, depth);

    for (let i = 0; i < map.nroom; i++) {
        fill_ordinary_room(map, map.rooms[i], depth, false);
    }
    return map;
}
