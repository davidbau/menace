// mkmap.c map-generation functions.
//
// This module now hosts the real mkmap pipeline implementations (formerly in
// sp_lev.js) so C file/function ownership matches the JS module layout.

import { rn1, rn2, rnd } from './rng.js';
import {
    COLNO, ROWNO, STONE, ROOM, TREE, CROSSWALL, HWALL, VWALL,
    IS_OBSTRUCTED, IS_WALL, NO_ROOM,
} from './const.js';

const MKMAP_HEIGHT = ROWNO - 1;
const MKMAP_WIDTH = COLNO - 2;

function resolveMap(firstArg) {
    return firstArg && firstArg.at ? firstArg : null;
}

// Autotranslated from mkmap.c:23
export function init_map(map, bg_typ) {
  let x, y;
  for (x = 1; x < COLNO; x++) {
    for (y = 0; y < ROWNO; y++) {
      map.locations[x][y].roomno = NO_ROOM;
      map.locations[x][y].typ = bg_typ;
      map.locations[x][y].lit = false;
    }
  }
}

export function init_fill(map, bgTyp, fgTyp) {
    const limit = Math.floor((MKMAP_WIDTH * MKMAP_HEIGHT * 2) / 5);
    let count = 0;
    while (count < limit) {
        const x = rn1(MKMAP_WIDTH - 1, 2);
        const y = rnd(MKMAP_HEIGHT - 1);
        if (map.locations[x][y].typ === bgTyp) {
            map.locations[x][y].typ = fgTyp;
            count++;
        }
    }
}

// Autotranslated from mkmap.c:54
export function get_map(map, col, row, bg_typ) {
  if (col <= 0 || row < 0 || col >= COLNO || row >= ROWNO) return bg_typ;
  return map.locations[col][row].typ;
}

export function pass_one(map, bgTyp, fgTyp) {
    const dirs = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1],
    ];
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (const [dx, dy] of dirs) {
                if (get_map(map, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            if (count <= 2) map.locations[x][y].typ = bgTyp;
            else if (count >= 5) map.locations[x][y].typ = fgTyp;
        }
    }
}

export function pass_two(map, bgTyp, fgTyp) {
    const dirs = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1],
    ];
    const next = Array.from({ length: COLNO }, () => Array(ROWNO).fill(bgTyp));
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (const [dx, dy] of dirs) {
                if (get_map(map, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            next[x][y] = (count === 5) ? bgTyp : get_map(map, x, y, bgTyp);
        }
    }
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            map.locations[x][y].typ = next[x][y];
        }
    }
}

export function pass_three(map, bgTyp, fgTyp) {
    const dirs = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1],
        [0, 1], [1, -1], [1, 0], [1, 1],
    ];
    const next = Array.from({ length: COLNO }, () => Array(ROWNO).fill(bgTyp));
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            let count = 0;
            for (const [dx, dy] of dirs) {
                if (get_map(map, x + dx, y + dy, bgTyp) === fgTyp) count++;
            }
            next[x][y] = (count < 3) ? bgTyp : get_map(map, x, y, bgTyp);
        }
    }
    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            map.locations[x][y].typ = next[x][y];
        }
    }
}

export function flood_fill_rm(map, bgTyp, fgTyp) {
    const seen = new Set();
    const key = (x, y) => `${x},${y}`;
    const regions = [];
    let nextRoomNo = 1;

    for (let x = 2; x <= MKMAP_WIDTH; x++) {
        for (let y = 1; y < MKMAP_HEIGHT; y++) {
            if (map.locations[x][y].typ !== fgTyp || seen.has(key(x, y))) continue;

            const queue = [[x, y]];
            const cells = [];
            seen.add(key(x, y));
            let minX = x;
            let maxX = x;
            let minY = y;
            let maxY = y;

            while (queue.length) {
                const [cx, cy] = queue.pop();
                cells.push([cx, cy]);
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                for (const [dx, dy] of [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1],
                ]) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx <= 0 || nx >= COLNO || ny < 0 || ny >= ROWNO) continue;
                    if (map.locations[nx][ny].typ !== fgTyp) continue;
                    const k = key(nx, ny);
                    if (seen.has(k)) continue;
                    seen.add(k);
                    queue.push([nx, ny]);
                }
            }

            if (cells.length <= 3) {
                for (const [cx, cy] of cells) {
                    map.locations[cx][cy].typ = bgTyp;
                    map.locations[cx][cy].roomno = 0;
                }
            } else {
                const roomno = nextRoomNo++;
                for (const [cx, cy] of cells) {
                    map.locations[cx][cy].roomno = roomno;
                }
                regions.push({ roomno, minX, maxX, minY, maxY });
            }
        }
    }
    return regions;
}

function mkmapSomexy(map, region) {
    const width = region.maxX - region.minX + 1;
    const height = region.maxY - region.minY + 1;

    for (let i = 0; i < 100; i++) {
        const x = rn1(width, region.minX);
        const y = rn1(height, region.minY);
        const loc = map.locations[x][y];
        if (loc.roomno === region.roomno && !loc.edge) {
            return [x, y];
        }
    }

    for (let x = region.minX; x <= region.maxX; x++) {
        for (let y = region.minY; y <= region.maxY; y++) {
            const loc = map.locations[x][y];
            if (loc.roomno === region.roomno && !loc.edge) {
                return [x, y];
            }
        }
    }
    return null;
}

function mkmapDigCorridor(map, org, dest, fgTyp, bgTyp) {
    let dx = 0;
    let dy = 0;
    let xx = org[0];
    let yy = org[1];
    const tx = dest[0];
    const ty = dest[1];
    let cct = 0;

    if (tx > xx) dx = 1;
    else if (ty > yy) dy = 1;
    else if (tx < xx) dx = -1;
    else dy = -1;

    xx -= dx;
    yy -= dy;

    while (xx !== tx || yy !== ty) {
        if (cct++ > 500) return false;
        xx += dx;
        yy += dy;

        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1) return false;

        const cell = map.locations[xx][yy];
        if (cell.typ === bgTyp) {
            cell.typ = fgTyp;
        } else if (cell.typ !== fgTyp) {
            return false;
        }

        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);

        if ((dix > diy) && diy && !rn2(dix - diy + 1)) {
            dix = 0;
        } else if ((diy > dix) && dix && !rn2(diy - dix + 1)) {
            diy = 0;
        }

        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const adj = map.locations[xx + ddx][yy];
            if (adj.typ === bgTyp || adj.typ === fgTyp) {
                dx = ddx;
                dy = 0;
                continue;
            }
        } else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const adj = map.locations[xx][yy + ddy];
            if (adj.typ === bgTyp || adj.typ === fgTyp) {
                dy = ddy;
                dx = 0;
                continue;
            }
        }

        const ahead = map.locations[xx + dx][yy + dy];
        if (ahead.typ === bgTyp || ahead.typ === fgTyp) continue;

        if (dx) {
            dx = 0;
            dy = (ty < yy) ? -1 : 1;
        } else {
            dy = 0;
            dx = (tx < xx) ? -1 : 1;
        }

        const adj = map.locations[xx + dx][yy + dy];
        if (adj.typ === bgTyp || adj.typ === fgTyp) continue;
        dy = -dy;
        dx = -dx;
    }
    return true;
}

export function join_map(map, bgTyp, fgTyp, regions) {
    let cur = 0;
    for (let next = 1; next < regions.length; next++) {
        const croom = regions[cur];
        const nroom = regions[next];
        const sm = mkmapSomexy(map, croom);
        const em = mkmapSomexy(map, nroom);
        if (sm && em) {
            mkmapDigCorridor(map, sm, em, fgTyp, bgTyp);
        }

        if (nroom.minX > croom.maxX
            || ((nroom.minY > croom.maxY || nroom.maxY < croom.minY) && rn2(3))) {
            cur = next;
        }
    }
}

export function wallify_map(map, x1, y1, x2, y2) {
    y1 = Math.max(y1, 0);
    x1 = Math.max(x1, 1);
    y2 = Math.min(y2, ROWNO - 1);
    x2 = Math.min(x2, COLNO - 1);

    for (let y = y1; y <= y2; y++) {
        const loYy = (y > 0) ? y - 1 : 0;
        const hiYy = (y < y2) ? y + 1 : y2;

        for (let x = x1; x <= x2; x++) {
            const loc = map.locations[x][y];
            if (loc.typ !== STONE) continue;

            const loXx = (x > 1) ? x - 1 : 1;
            const hiXx = (x < x2) ? x + 1 : x2;

            let converted = false;
            for (let yy = loYy; yy <= hiYy && !converted; yy++) {
                for (let xx = loXx; xx <= hiXx; xx++) {
                    const ntyp = map.locations[xx][yy].typ;
                    if (ntyp === ROOM || ntyp === CROSSWALL) {
                        loc.typ = (yy !== y) ? HWALL : VWALL;
                        converted = true;
                        break;
                    }
                }
            }
        }
    }
}

export function finish_map(map, fgTyp, bgTyp, lit, walled) {
    if (walled) {
        wallify_map(map, 1, 0, COLNO - 1, ROWNO - 1);
    }

    if (lit) {
        for (let x = 1; x < COLNO; x++) {
            for (let y = 0; y < ROWNO; y++) {
                const cell = map.locations[x][y];
                if ((!IS_OBSTRUCTED(fgTyp) && cell.typ === fgTyp)
                    || (!IS_OBSTRUCTED(bgTyp) && cell.typ === bgTyp)
                    || (bgTyp === TREE && cell.typ === bgTyp)
                    || (walled && IS_WALL(cell.typ))) {
                    cell.lit = 1;
                }
            }
        }
    }
}

// C ref: mkmap.c:245
export function join_map_cleanup(map) {
    if (!resolveMap(map)) return;
    for (let x = 1; x < map.locations.length; x++) {
        for (let y = 0; y < map.locations[x].length; y++) {
            const loc = map.locations[x][y];
            if (loc) loc.roomno = 0;
        }
    }
    if (Number.isInteger(map.nroom)) map.nroom = 0;
}

// C ref: mkmap.c:378
export function remove_rooms(map, lx, ly, hx, hy) {
    if (!resolveMap(map)) return;
    if (typeof lx !== 'number' || typeof ly !== 'number'
        || typeof hx !== 'number' || typeof hy !== 'number') return;

    const rooms = Array.isArray(map.rooms) ? map.rooms : [];
    for (let i = rooms.length - 1; i >= 0; i--) {
        const room = rooms[i];
        if (!room) continue;
        if (room.lx <= hx && room.hx >= lx && room.ly <= hy && room.hy >= ly) {
            remove_room_impl(map, room, i);
        }
    }
    map.nroom = map.rooms.length;
}

// C ref: mkmap.c:411
export function remove_room(map, roomNo) {
    if (!Number.isInteger(roomNo) || !resolveMap(map)) return false;
    return remove_room_impl(map, null, roomNo - 1);
}

function remove_room_impl(map, roomObjOrNull, roomIndex) {
    const rooms = Array.isArray(map.rooms) ? map.rooms : [];
    let idx = Number.isInteger(roomIndex) && roomIndex >= 0 ? roomIndex : -1;

    if (idx < 0 && roomObjOrNull) {
        idx = rooms.indexOf(roomObjOrNull);
    }
    if (idx < 0 || idx >= rooms.length) return false;

    const room = rooms[idx];
    const target = room?.roomno || idx + 1;

    rooms.splice(idx, 1);
    map.nroom = Math.max(0, rooms.length);

    for (let x = room.lx; x <= room.hx; x++) {
        for (let y = room.ly; y <= room.hy; y++) {
            const loc = map.at(x, y);
            if (loc && loc.roomno === target) loc.roomno = 0;
        }
    }

    for (let i = idx; i < rooms.length; i++) {
        if (typeof rooms[i].roomno === 'number') rooms[i].roomno -= 1;
    }
    return true;
}

// C ref: mkmap.c:442
export function litstate_rnd(litstate, depth) {
    if (litstate < 0) {
        return (rnd(1 + Math.abs(depth)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mkmap.c:450
export function mkmap(initLev = {}) {
    const map = initLev.map || null;
    if (!map) return null;

    const bgTyp = Number.isInteger(initLev.bg) ? initLev.bg : STONE;
    const fgTyp = Number.isInteger(initLev.fg) ? initLev.fg : ROOM;
    const lit = Number.isInteger(initLev.lit) ? initLev.lit : rn2(2);
    const smoothed = !!initLev.smoothed;
    const joined = !!initLev.joined;
    const walled = !!initLev.walled;

    init_map(map, bgTyp);
    init_fill(map, bgTyp, fgTyp);
    pass_one(map, bgTyp, fgTyp);
    pass_two(map, bgTyp, fgTyp);
    if (smoothed) {
        pass_three(map, bgTyp, fgTyp);
        pass_three(map, bgTyp, fgTyp);
    }
    if (joined) {
        const regions = flood_fill_rm(map, bgTyp, fgTyp);
        if (regions.length > 1) {
            join_map(map, bgTyp, fgTyp, regions);
        }
    }
    finish_map(map, fgTyp, bgTyp, lit, walled);
    return map;
}
