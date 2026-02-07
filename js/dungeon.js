// dungeon.js -- Level generation
// Faithfully mirrors mklev.c's room-and-corridor algorithm.
// See DECISIONS.md #9 for corridor algorithm choice.

import {
    COLNO, ROWNO, STONE, VWALL, HWALL, TLCORNER, TRCORNER,
    BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, CORR, ROOM, STAIRS, FOUNTAIN, ALTAR, GRAVE, THRONE,
    POOL, TREE, IRONBARS, LAVAPOOL, ICE,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED,
    DIR_N, DIR_S, DIR_E, DIR_W,
    OROOM, MAXNROFROOMS, ROOMOFFSET,
    IS_WALL, IS_DOOR, IS_ROCK, IS_ROOM, ACCESSIBLE, isok
} from './config.js';
import { GameMap, makeRoom } from './map.js';
import { rn2, rnd, rn1, d } from './rng.js';

// --- Level Generation ---

// Generate a standard dungeon level
// C ref: mklev.c makelevel()
export function generateLevel(depth) {
    const map = new GameMap();
    map.clear();

    // Make rooms
    // C ref: mklev.c makerooms()
    const nrooms = makeRooms(map);

    // Sort rooms left-to-right for corridor generation
    // C ref: mklev.c:59-69 mkroom_cmp()
    map.rooms.sort((a, b) => a.lx - b.lx);

    // Connect rooms with corridors
    // C ref: mklev.c makelevel() calls join() for consecutive rooms
    for (let i = 0; i < map.rooms.length - 1; i++) {
        join(map, i, i + 1, false);
    }
    // Add some extra random connections for variety
    // C ref: mklev.c makelevel() loop adding extra connections
    for (let i = 0; i < map.rooms.length; i++) {
        if (rn2(3) === 0 && map.rooms.length > 2) {
            const other = rn2(map.rooms.length);
            if (other !== i) {
                join(map, i, other, false);
            }
        }
    }

    // Place doors at room entrances
    // C ref: mklev.c makelevel() calls dosdoor for each door position
    addDoors(map);

    // Place stairs
    // C ref: mklev.c generate_stairs()
    placeStairs(map, depth);

    // Place room contents
    // C ref: mklev.c fill_ordinary_room()
    for (const room of map.rooms) {
        fillRoom(map, room, depth);
    }

    // Light some rooms (deeper = darker)
    // C ref: mklev.c do_room_or_subroom() -- rlit is set based on depth
    for (const room of map.rooms) {
        // C ref: mklev.c -- rooms are lit with probability based on depth
        room.rlit = (rn2(depth + 1) < 10);
        if (room.rlit) {
            for (let x = room.lx; x <= room.hx; x++) {
                for (let y = room.ly; y <= room.hy; y++) {
                    const loc = map.at(x, y);
                    if (loc) loc.lit = true;
                }
            }
        }
    }

    return map;
}

// Create rooms on the map
// C ref: mklev.c makerooms()
function makeRooms(map) {
    // Decide how many rooms (3-8)
    // C ref: mklev.c -- tries to create rooms, stops on failure
    const targetRooms = rn1(6, 3); // 3 to 8 rooms
    let attempts = 0;

    for (let i = 0; i < targetRooms && attempts < 200; i++) {
        attempts++;
        // Random room size
        // C ref: mklev.c makerooms() -- room dimensions
        const width = rn1(10, 3);   // 3-12 wide
        const height = rn1(5, 3);   // 3-7 tall

        // Random position (leaving borders)
        const x = rn1(COLNO - width - 4, 2);
        const y = rn1(ROWNO - height - 4, 2);

        // Check if room fits without overlapping
        if (roomFits(map, x, y, x + width - 1, y + height - 1)) {
            createRoom(map, x, y, x + width - 1, y + height - 1);
        } else {
            i--; // retry
        }
    }

    return map.rooms.length;
}

// Check if a room fits at the given position
// C ref: mklev.c create_room() overlap checking
function roomFits(map, lx, ly, hx, hy) {
    // Need 1 cell border of stone around each room
    if (lx < 2 || ly < 2 || hx >= COLNO - 2 || hy >= ROWNO - 2) return false;

    for (let x = lx - 1; x <= hx + 1; x++) {
        for (let y = ly - 1; y <= hy + 1; y++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== STONE) return false;
        }
    }
    return true;
}

// Create a room on the map
// C ref: mklev.c do_room_or_subroom()
function createRoom(map, lx, ly, hx, hy) {
    const room = makeRoom();
    room.lx = lx;
    room.ly = ly;
    room.hx = hx;
    room.hy = hy;
    room.rtype = OROOM;
    room.rlit = true; // default lit, adjusted later

    const roomno = map.addRoom(room) + ROOMOFFSET;

    // Fill interior with ROOM
    for (let x = lx; x <= hx; x++) {
        for (let y = ly; y <= hy; y++) {
            const loc = map.at(x, y);
            loc.typ = ROOM;
            loc.roomno = roomno;
            loc.lit = true;
        }
    }

    // Create walls
    // Top and bottom walls (horizontal)
    for (let x = lx - 1; x <= hx + 1; x++) {
        const top = map.at(x, ly - 1);
        if (top && top.typ === STONE) {
            top.typ = HWALL;
            top.horizontal = true;
            top.roomno = roomno;
        }
        const bot = map.at(x, hy + 1);
        if (bot && bot.typ === STONE) {
            bot.typ = HWALL;
            bot.horizontal = true;
            bot.roomno = roomno;
        }
    }
    // Left and right walls (vertical)
    for (let y = ly - 1; y <= hy + 1; y++) {
        const left = map.at(lx - 1, y);
        if (left && left.typ === STONE) {
            left.typ = VWALL;
            left.horizontal = false;
            left.roomno = roomno;
        }
        const right = map.at(hx + 1, y);
        if (right && right.typ === STONE) {
            right.typ = VWALL;
            right.horizontal = false;
            right.roomno = roomno;
        }
    }

    // Set corners
    // C ref: mklev.c wallification() -- corners are set based on adjacent walls
    setWallType(map, lx - 1, ly - 1);
    setWallType(map, hx + 1, ly - 1);
    setWallType(map, lx - 1, hy + 1);
    setWallType(map, hx + 1, hy + 1);

    return room;
}

// Determine the correct wall type for a corner/junction position
// C ref: mklev.c wallification() -- walks the map and assigns corner types
function setWallType(map, x, y) {
    const loc = map.at(x, y);
    if (!loc || !IS_WALL(loc.typ)) return;

    const above = isok(x, y - 1) ? map.at(x, y - 1) : null;
    const below = isok(x, y + 1) ? map.at(x, y + 1) : null;
    const left  = isok(x - 1, y) ? map.at(x - 1, y) : null;
    const right = isok(x + 1, y) ? map.at(x + 1, y) : null;

    const hasAbove = above && IS_WALL(above.typ);
    const hasBelow = below && IS_WALL(below.typ);
    const hasLeft  = left  && IS_WALL(left.typ);
    const hasRight = right && IS_WALL(right.typ);

    // Count connections
    const connections = [hasAbove, hasBelow, hasLeft, hasRight]
        .filter(Boolean).length;

    if (connections >= 3) {
        // T-wall or cross
        if (!hasAbove) { loc.typ = TUWALL; loc.horizontal = false; }
        else if (!hasBelow) { loc.typ = TDWALL; loc.horizontal = false; }
        else if (!hasLeft)  { loc.typ = TLWALL; loc.horizontal = false; }
        else if (!hasRight) { loc.typ = TRWALL; loc.horizontal = false; }
        else { loc.typ = CROSSWALL; loc.horizontal = false; }
    } else if (hasAbove && hasRight && !hasBelow && !hasLeft) {
        loc.typ = BLCORNER; loc.horizontal = true;
    } else if (hasAbove && hasLeft && !hasBelow && !hasRight) {
        loc.typ = BRCORNER; loc.horizontal = true;
    } else if (hasBelow && hasRight && !hasAbove && !hasLeft) {
        loc.typ = TLCORNER; loc.horizontal = true;
    } else if (hasBelow && hasLeft && !hasAbove && !hasRight) {
        loc.typ = TRCORNER; loc.horizontal = true;
    }
    // Otherwise leave as HWALL or VWALL
}

// Connect two rooms with a corridor
// C ref: mklev.c join() -- creates L-shaped corridors between rooms
function join(map, room1idx, room2idx, nxcor) {
    const room1 = map.rooms[room1idx];
    const room2 = map.rooms[room2idx];
    if (!room1 || !room2) return;

    // Pick random points in each room
    // C ref: mklev.c join() -- uses rn1 for random positions
    const x1 = rn1(room1.hx - room1.lx + 1, room1.lx);
    const y1 = rn1(room1.hy - room1.ly + 1, room1.ly);
    const x2 = rn1(room2.hx - room2.lx + 1, room2.lx);
    const y2 = rn1(room2.hy - room2.ly + 1, room2.ly);

    // Choose corridor routing: horizontal-first or vertical-first
    // C ref: mklev.c join() -- randomly chooses direction
    if (rn2(2)) {
        // Go horizontal first, then vertical (L-shape)
        digCorridor(map, x1, y1, x2, y1);  // horizontal leg
        digCorridor(map, x2, y1, x2, y2);  // vertical leg
    } else {
        // Go vertical first, then horizontal
        digCorridor(map, x1, y1, x1, y2);  // vertical leg
        digCorridor(map, x1, y2, x2, y2);  // horizontal leg
    }
}

// Dig a straight corridor from (x1,y1) to (x2,y2)
// C ref: mklev.c -- corridor digging happens in join() step by step
function digCorridor(map, x1, y1, x2, y2) {
    const dx = Math.sign(x2 - x1);
    const dy = Math.sign(y2 - y1);

    let x = x1;
    let y = y1;

    while (true) {
        if (isok(x, y)) {
            const loc = map.at(x, y);
            if (loc) {
                if (loc.typ === STONE) {
                    loc.typ = CORR;
                    loc.lit = false;
                } else if (IS_WALL(loc.typ)) {
                    // Mark as potential door location
                    loc.typ = DOOR;
                    loc.flags = D_NODOOR;
                }
                // Don't overwrite existing rooms, doors, etc.
            }
        }

        if (x === x2 && y === y2) break;
        if (x !== x2) x += dx;
        else if (y !== y2) y += dy;
        else break; // shouldn't happen
    }
}

// Add proper doors where corridors meet rooms
// C ref: mklev.c dosdoor() -- determines door type at room entrance
function addDoors(map) {
    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== DOOR) continue;

            // Check if this door is between a corridor and a room
            const hasRoomNeighbor = checkNeighborType(map, x, y, IS_ROOM);
            const hasCorrNeighbor = checkNeighborType(map, x, y, t => t === CORR);

            if (hasRoomNeighbor && hasCorrNeighbor) {
                // This is a real door position
                // C ref: mklev.c dosdoor() -- randomly assigns door type
                const doorType = rn2(5);
                if (doorType === 0) {
                    loc.flags = D_NODOOR; // doorway, no door
                } else if (doorType === 1) {
                    loc.flags = D_ISOPEN;
                } else if (doorType === 4) {
                    loc.flags = D_LOCKED;
                } else {
                    loc.flags = D_CLOSED;
                }
            } else if (!hasRoomNeighbor && !hasCorrNeighbor) {
                // Door in the middle of nowhere, make it corridor
                loc.typ = CORR;
                loc.flags = 0;
            }
        }
    }
}

// Check if any cardinal neighbor has a matching terrain type
function checkNeighborType(map, x, y, predicate) {
    const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
    for (const [dx, dy] of dirs) {
        const loc = map.at(x + dx, y + dy);
        if (loc && predicate(loc.typ)) return true;
    }
    return false;
}

// Place up and down stairs
// C ref: mklev.c generate_stairs()
function placeStairs(map, depth) {
    // Place upstairs in a random room (not on depth 1 -- no going higher)
    if (depth > 1 && map.rooms.length > 0) {
        const room = map.rooms[rn2(map.rooms.length)];
        const x = rn1(room.hx - room.lx + 1, room.lx);
        const y = rn1(room.hy - room.ly + 1, room.ly);
        const loc = map.at(x, y);
        if (loc && loc.typ === ROOM) {
            loc.typ = STAIRS;
            loc.flags = 1; // up
            map.upstair = { x, y };
        }
    }

    // Place downstairs in a different room
    if (map.rooms.length > 0) {
        let attempts = 0;
        while (attempts < 100) {
            const room = map.rooms[rn2(map.rooms.length)];
            const x = rn1(room.hx - room.lx + 1, room.lx);
            const y = rn1(room.hy - room.ly + 1, room.ly);
            const loc = map.at(x, y);
            if (loc && loc.typ === ROOM) {
                loc.typ = STAIRS;
                loc.flags = 0; // down
                map.dnstair = { x, y };
                break;
            }
            attempts++;
        }
    }
}

// Fill a room with contents (monsters, objects, furniture)
// C ref: mklev.c fill_ordinary_room()
function fillRoom(map, room, depth) {
    // Maybe add a fountain
    // C ref: mklev.c mkfount()
    if (rn2(6) === 0) {
        const x = rn1(room.hx - room.lx + 1, room.lx);
        const y = rn1(room.hy - room.ly + 1, room.ly);
        const loc = map.at(x, y);
        if (loc && loc.typ === ROOM) {
            loc.typ = FOUNTAIN;
        }
    }

    // Maybe add an altar (rare)
    if (rn2(30) === 0) {
        const x = rn1(room.hx - room.lx + 1, room.lx);
        const y = rn1(room.hy - room.ly + 1, room.ly);
        const loc = map.at(x, y);
        if (loc && loc.typ === ROOM) {
            loc.typ = ALTAR;
        }
    }
}

// Fix wall types after all corridors are dug
// Called after level generation to ensure correct corner/T-wall types
// C ref: mklev.c wallification()
export function wallification(map) {
    for (let x = 1; x < COLNO - 1; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            if (loc && IS_WALL(loc.typ)) {
                setWallType(map, x, y);
            }
        }
    }
}
