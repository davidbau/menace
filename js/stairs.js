// stairs.js -- Stairway management and hero placement
// cf. stairs.c — stairway_add/free/at/find_*, u_on_upstairs/dnstairs/sstairs,
//                On_stairs/On_ladder/On_stairs_up/On_stairs_dn,
//                known_branch_stairs, stairs_description

const gs = globalThis.gs || (globalThis.gs = {});
if (!Object.prototype.hasOwnProperty.call(gs, 'stairs')) {
    gs.stairs = null;
}

function _currentMap(map) {
    if (map) return map;
    return globalThis?.game?.lev || globalThis?.game?.map || null;
}

function _makeStairNode(stair, upHint) {
    if (!stair) return null;
    const sx = Number.isInteger(stair.sx) ? stair.sx : stair.x;
    const sy = Number.isInteger(stair.sy) ? stair.sy : stair.y;
    if (!Number.isInteger(sx) || !Number.isInteger(sy)) return null;
    const up = (typeof stair.up === 'boolean') ? stair.up : !!upHint;
    const dest = stair.tolev || stair.to || { dnum: 0, dlevel: 0 };
    return {
        sx,
        sy,
        up,
        isladder: !!stair.isladder,
        u_traversed: !!stair.u_traversed,
        tolev: {
            dnum: Number.isInteger(dest.dnum) ? dest.dnum : 0,
            dlevel: Number.isInteger(dest.dlevel) ? dest.dlevel : 0,
        },
        next: null,
    };
}

function _prependStairNode(node) {
    if (!node) return null;
    node.next = gs.stairs || null;
    gs.stairs = node;
    return node;
}

async function _forEachStair(fn) {
    let tmp = gs.stairs;
    while (tmp) {
        const out = await fn(tmp);
        if (out !== undefined) return out;
        tmp = tmp.next;
    }
    return undefined;
}

function _ensureStairsInitialized(map = null) {
    if (gs.stairs) return;
    const m = _currentMap(map);
    if (!m) return;
    setCurrentLevelStairs(m);
}

// Build current gs.stairs list from map stair data.
export function setCurrentLevelStairs(map) {
    stairway_free_all();
    const m = _currentMap(map);
    if (!m) return;

    const up = _makeStairNode(m.upstair, true);
    const dn = _makeStairNode(m.dnstair, false);
    if (dn) _prependStairNode(dn);
    if (up) _prependStairNode(up);

    if (Array.isArray(m.stairs)) {
        for (const stair of m.stairs) {
            _prependStairNode(_makeStairNode(stair, null));
        }
    }
}

// cf. stairs.c:7 — stairway_add(x, y, up, isladder, dest)
export function stairway_add(map, x, y, up, isladder, dest) {
    const stair = {
        x, y,
        isladder: !!isladder,
        u_traversed: false,
        tolev: dest ? { dnum: dest.dnum, dlevel: dest.dlevel } : { dnum: 0, dlevel: 0 },
    };
    if (map) {
        if (up) map.upstair = stair;
        else map.dnstair = stair;
    }
    _prependStairNode(_makeStairNode(stair, up));
}

// cf. stairs.c:39 — stairway_at(x, y)
export async function stairway_at(x, y, map = null) {
    _ensureStairsInitialized(map);
    return await _forEachStair((tmp) => (tmp.sx === x && tmp.sy === y ? tmp : undefined)) || null;
}

// cf. stairs.c:49 — stairway_find(fromdlev)
export async function stairway_find(fromdlev, map = null) {
    _ensureStairsInitialized(map);
    return await _forEachStair((tmp) => (
        tmp.tolev.dnum === fromdlev.dnum && tmp.tolev.dlevel === fromdlev.dlevel
            ? tmp
            : undefined
    )) || null;
}

// cf. stairs.c:63 — stairway_find_from(fromdlev, isladder)
export async function stairway_find_from(fromdlev, isladder, map = null) {
    _ensureStairsInitialized(map);
    return await _forEachStair((tmp) => (
        tmp.tolev.dnum === fromdlev.dnum
        && tmp.tolev.dlevel === fromdlev.dlevel
        && tmp.isladder === isladder
            ? tmp
            : undefined
    )) || null;
}

// cf. stairs.c:78 — stairway_find_dir(up)
export async function stairway_find_dir(up, map = null) {
    _ensureStairsInitialized(map);
    return await _forEachStair((tmp) => (tmp.up === up ? tmp : undefined)) || null;
}

// cf. stairs.c:88 — stairway_find_type_dir(isladder, up)
export async function stairway_find_type_dir(isladder, up, map = null) {
    _ensureStairsInitialized(map);
    return await _forEachStair((tmp) => (
        tmp.isladder === isladder && tmp.up === up ? tmp : undefined
    )) || null;
}

// cf. stairs.c:98 — stairway_find_special_dir(up)
export async function stairway_find_special_dir(up, map = null) {
    _ensureStairsInitialized(map);
    const m = _currentMap(map);
    const currentDnum = Number.isInteger(m?.uz?.dnum) ? m.uz.dnum : 0;
    return await _forEachStair((tmp) => (
        tmp.tolev.dnum !== currentDnum && tmp.up !== up ? tmp : undefined
    )) || null;
}

// cf. stairs.c:112 — u_on_sstairs(upflag)
export async function u_on_sstairs(upflag, map, player) {
    const stway = await stairway_find_special_dir(upflag, map);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    }
}

// cf. stairs.c:124 — u_on_upstairs()
export async function u_on_upstairs(map, player) {
    const stway = await stairway_find_dir(true, map);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    } else {
        await u_on_sstairs(0, map, player);
    }
}

// cf. stairs.c:136 — u_on_dnstairs()
export async function u_on_dnstairs(map, player) {
    const stway = await stairway_find_dir(false, map);
    if (stway) {
        player.x = stway.sx;
        player.y = stway.sy;
    } else {
        await u_on_sstairs(1, map, player);
    }
}

// cf. stairs.c:147 — On_stairs(x, y)
export async function On_stairs(x, y, map = null) {
    return await stairway_at(x, y, map) !== null;
}

// cf. stairs.c:153 — On_ladder(x, y)
export async function On_ladder(x, y, map = null) {
    const stway = await stairway_at(x, y, map);
    return !!(stway && stway.isladder);
}

// cf. stairs.c:161 — On_stairs_up(x, y)
export async function On_stairs_up(x, y, map = null) {
    const stway = await stairway_at(x, y, map);
    return !!(stway && stway.up);
}

// cf. stairs.c:169 — On_stairs_dn(x, y)
export async function On_stairs_dn(x, y, map = null) {
    const stway = await stairway_at(x, y, map);
    return !!(stway && !stway.up);
}

// cf. stairs.c:179 — known_branch_stairs(sway)
export function known_branch_stairs(sway, player) {
    if (!sway) return false;
    const playerDnum = (player && player.dnum) || 0;
    return sway.tolev.dnum !== playerDnum && !!sway.u_traversed;
}

// cf. stairs.c:186 — stairs_description(sway, stcase)
export function stairs_description(sway, stcase, player) {
    const stairs = sway.isladder ? 'ladder' : stcase ? 'staircase' : 'stairs';
    const updown = sway.up ? 'up' : 'down';

    if (!known_branch_stairs(sway, player)) {
        let desc = `${stairs} ${updown}`;
        if (sway.u_traversed) {
            const toDepth = sway.tolev.dlevel || 0;
            desc += ` to level ${toDepth}`;
        }
        return desc;
    }

    const playerDnum = (player && player.dnum) || 0;
    const playerDlevel = (player && player.dungeonLevel) || 1;

    if (playerDnum === 0 && playerDlevel === 1 && sway.up) {
        const hasAmulet = player && player.uhave && player.uhave.amulet;
        if (!hasAmulet) return `${stairs} ${updown} out of the dungeon`;
        return `branch ${stairs} ${updown} to the end game`;
    }

    const branchName = sway.tolev.dname || 'a branch';
    return `branch ${stairs} ${updown} to ${branchName}`;
}

// cf. stairs.c:26 — stairway_free_all()
export function stairway_free_all() {
    gs.stairs = null;
}
