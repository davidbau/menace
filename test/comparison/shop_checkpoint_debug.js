#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import { PM_SHOPKEEPER, mons } from '../../js/monsters.js';
import { ACCESSIBLE, OBJ_BURIED, OBJ_CONTAINED, OBJ_FLOOR, OBJ_FREE, OBJ_INVENT, OBJ_MINVENT, OBJ_ONBILL } from '../../js/const.js';
import { objectData } from '../../js/objects.js';
import { normalizeSession, parseCompactMapdump } from './session_loader.js';

function usage() {
    console.error('Usage: node test/comparison/shop_checkpoint_debug.js <session-or-mapdump> [checkpoint-id] [--radius=N] [--all]');
    process.exit(2);
}

function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0) usage();
    let target = null;
    let checkpointId = null;
    let radius = 8;
    let showAll = false;
    let pathTo = null;
    for (const arg of args) {
        if (arg.startsWith('--radius=')) {
            radius = Number.parseInt(arg.slice('--radius='.length), 10);
            continue;
        }
        if (arg === '--all') {
            showAll = true;
            continue;
        }
        if (arg.startsWith('--path=')) {
            pathTo = arg.slice('--path='.length);
            continue;
        }
        if (!target) {
            target = arg;
            continue;
        }
        if (!checkpointId) {
            checkpointId = arg;
            continue;
        }
        usage();
    }
    if (!target) usage();
    return { target: resolve(target), checkpointId, radius, showAll, pathTo };
}

function loadTarget(targetPath, checkpointId) {
    const text = readFileSync(targetPath, 'utf8');
    if (targetPath.endsWith('.session.json')) {
        const raw = JSON.parse(text);
        const session = normalizeSession(raw, { file: basename(targetPath), dir: resolve(targetPath, '..') });
        const checkpoints = session.mapdumpCheckpoints || {};
        const ids = Object.keys(checkpoints).sort();
        if (ids.length > 0) {
            if (!checkpointId) {
                throw new Error(`Checkpoint id required for session file. Available: ${ids.join(', ')}`);
            }
            if (!checkpoints[checkpointId]) {
                throw new Error(`Checkpoint '${checkpointId}' not found. Available: ${ids.join(', ')}`);
            }
            return {
                sourceKind: 'session',
                sourcePath: targetPath,
                checkpointId,
                parsed: parseCompactMapdump(checkpoints[checkpointId]),
                checkpointIds: ids,
            };
        }
        const structured = [];
        session.steps.forEach((step, stepIndex) => {
            (step.checkpoints || []).forEach((cp, cpIndex) => {
                const id = cp.id || `${stepIndex}:${cp.phase || 'checkpoint'}:${cpIndex}`;
                structured.push({ id, checkpoint: cp });
            });
        });
        const structuredIds = structured.map((row) => row.id);
        if (structured.length === 0) {
            throw new Error(`No checkpoints found in ${targetPath}`);
        }
        if (!checkpointId) {
            throw new Error(`Checkpoint id required for session file. Available: ${structuredIds.join(', ')}`);
        }
        const found = structured.find((row) => row.id === checkpointId);
        if (!found) {
            throw new Error(`Checkpoint '${checkpointId}' not found. Available: ${structuredIds.join(', ')}`);
        }
        return {
            sourceKind: 'session',
            sourcePath: targetPath,
            checkpointId,
            parsed: found.checkpoint,
            checkpointIds: structuredIds,
        };
    }
    return {
        sourceKind: 'mapdump',
        sourcePath: targetPath,
        checkpointId: checkpointId || basename(targetPath),
        parsed: parseCompactMapdump(text),
        checkpointIds: [],
    };
}

function objectName(otyp) {
    const obj = objectData[otyp];
    if (!obj) return `otyp=${otyp}`;
    return obj.oc_name || obj.oc_descr || `otyp=${otyp}`;
}

function monsterName(mndx) {
    const mon = mons[mndx];
    return mon?.mname || `mndx=${mndx}`;
}

function whereName(where) {
    switch (where) {
    case OBJ_FREE: return 'free';
    case OBJ_FLOOR: return 'floor';
    case OBJ_CONTAINED: return 'contained';
    case OBJ_INVENT: return 'invent';
    case OBJ_MINVENT: return 'minvent';
    case 5: return 'migrating';
    case OBJ_BURIED: return 'buried';
    case OBJ_ONBILL: return 'onbill';
    default: return String(where);
    }
}

function gridCell(grid, x, y) {
    return Array.isArray(grid?.[y]) ? grid[y][x] : null;
}

function parseCoord(text) {
    if (!text) return null;
    const match = /^(\d+),(\d+)$/.exec(text);
    if (!match) return null;
    return { x: Number(match[1]), y: Number(match[2]) };
}

function isPassable(parsed, x, y) {
    const typ = gridCell(parsed.typGrid, x, y);
    return Number.isInteger(typ) && ACCESSIBLE(typ);
}

const DIRS = [
    { dx: -1, dy: 0, key: 'h' },
    { dx: 1, dy: 0, key: 'l' },
    { dx: 0, dy: -1, key: 'k' },
    { dx: 0, dy: 1, key: 'j' },
    { dx: -1, dy: -1, key: 'y' },
    { dx: 1, dy: -1, key: 'u' },
    { dx: -1, dy: 1, key: 'b' },
    { dx: 1, dy: 1, key: 'n' },
];

function shortestPath(parsed, from, to) {
    if (!from || !to) return null;
    const startKey = `${from.x},${from.y}`;
    const goalKey = `${to.x},${to.y}`;
    const queue = [from];
    const seen = new Set([startKey]);
    const prev = new Map();
    while (queue.length > 0) {
        const cur = queue.shift();
        const curKey = `${cur.x},${cur.y}`;
        if (curKey === goalKey) break;
        for (const dir of DIRS) {
            const nx = cur.x + dir.dx;
            const ny = cur.y + dir.dy;
            const key = `${nx},${ny}`;
            if (seen.has(key)) continue;
            if (key !== goalKey && !isPassable(parsed, nx, ny)) continue;
            seen.add(key);
            prev.set(key, { prev: curKey, key: dir.key });
            queue.push({ x: nx, y: ny });
        }
    }
    if (!seen.has(goalKey)) return null;
    const moves = [];
    let cur = goalKey;
    while (cur !== startKey) {
        const step = prev.get(cur);
        if (!step) return null;
        moves.push(step.key);
        cur = step.prev;
    }
    moves.reverse();
    return moves.join('');
}

function mergeObjects(parsed) {
    if (!Array.isArray(parsed.objectDetails) && Array.isArray(parsed.objects) && parsed.objects.length > 0 && typeof parsed.objects[0] === 'object') {
        return parsed.objects.map((obj, index) => ({
            x: obj.x,
            y: obj.y,
            otyp: obj.otyp,
            quan: obj.quan ?? 1,
            o_id: obj.o_id ?? index,
            where: obj.where ?? OBJ_FLOOR,
            cursed: obj.cursed ?? 0,
            blessed: obj.blessed ?? 0,
            owt: obj.owt ?? null,
            invlet: obj.invlet ?? null,
            olocked: obj.olocked ?? 0,
            obroken: obj.obroken ?? 0,
            otrapped: obj.otrapped ?? 0,
            no_charge: obj.no_charge ?? 0,
        }));
    }
    const base = new Map();
    for (const row of parsed.objects || []) {
        const [x, y, otyp, quan] = row;
        base.set(`${x},${y},${otyp},${quan},${base.size}`, {
            x, y, otyp, quan,
            where: null,
            cursed: null,
            blessed: null,
            owt: null,
            invlet: null,
            olocked: null,
            obroken: null,
            otrapped: null,
            no_charge: null,
        });
    }
    const merged = [];
    const rows = [...base.values()];
    const consume = (detail) => {
        const [o_id, x, y, otyp, quan, where, cursed, blessed, owt, invlet, olocked, obroken, otrapped, no_charge] = detail;
        const idx = rows.findIndex((row) =>
            row.x === x && row.y === y && row.otyp === otyp && row.quan === quan && row.where === null);
        const baseRow = idx >= 0 ? rows.splice(idx, 1)[0] : { x, y, otyp, quan };
        merged.push({
            ...baseRow,
            o_id,
            where,
            cursed,
            blessed,
            owt,
            invlet,
            olocked,
            obroken,
            otrapped,
            no_charge,
        });
    };
    for (const detail of parsed.objectDetails || []) consume(detail);
    for (const row of rows) merged.push(row);
    return merged;
}

function mergeMonsters(parsed) {
    if (!Array.isArray(parsed.monsterDetails) && Array.isArray(parsed.monsters) && parsed.monsters.length > 0 && typeof parsed.monsters[0] === 'object') {
        return parsed.monsters.map((mon, index) => ({
            x: mon.x,
            y: mon.y,
            mndx: mon.mndx ?? mon.mnum,
            mhp: mon.mhp,
            m_id: mon.m_id ?? index,
            mhpmax: mon.mhpmax ?? mon.mhp,
            mtame: mon.mtame ?? 0,
            mpeaceful: mon.mpeaceful ?? 0,
            msleeping: mon.msleeping ?? 0,
            mfrozen: mon.mfrozen ?? 0,
            mcanmove: mon.mcanmove ?? 1,
            mtrapped: mon.mtrapped ?? 0,
            m_ap_type: mon.m_ap_type ?? 0,
            mappearance: mon.mappearance ?? 0,
            minventCount: mon.minventCount ?? mon.minvcount ?? 0,
            isshk: mon.isshk ?? 0,
        }));
    }
    const base = new Map();
    for (const row of parsed.monsters || []) {
        const [x, y, mndx, mhp] = row;
        base.set(`${x},${y},${mndx},${mhp},${base.size}`, {
            x, y, mndx, mhp,
            m_id: null,
            mhpmax: null,
            mtame: null,
            mpeaceful: null,
            msleeping: null,
            mfrozen: null,
            mcanmove: null,
            mtrapped: null,
            m_ap_type: null,
            mappearance: null,
            minventCount: null,
        });
    }
    const merged = [];
    const rows = [...base.values()];
    const consume = (detail) => {
        const [m_id, x, y, mndx, mhp, mhpmax, mtame, mpeaceful, msleeping, mfrozen, mcanmove, mtrapped, m_ap_type, mappearance, minventCount] = detail;
        const idx = rows.findIndex((row) =>
            row.x === x && row.y === y && row.mndx === mndx && row.mhp === mhp && row.m_id == null);
        const baseRow = idx >= 0 ? rows.splice(idx, 1)[0] : { x, y, mndx, mhp };
        merged.push({
            ...baseRow,
            m_id,
            mhpmax,
            mtame,
            mpeaceful,
            msleeping,
            mfrozen,
            mcanmove,
            mtrapped,
            m_ap_type,
            mappearance,
            minventCount,
        });
    };
    for (const detail of parsed.monsterDetails || []) consume(detail);
    for (const row of rows) merged.push(row);
    return merged;
}

function nearestShopkeeper(monsters, hero) {
    const shks = monsters.filter((m) => m.mndx === PM_SHOPKEEPER || m.isshk);
    if (shks.length === 0) return null;
    if (!hero) return shks[0];
    return shks.slice().sort((a, b) =>
        Math.abs(a.x - hero.x) + Math.abs(a.y - hero.y) - (Math.abs(b.x - hero.x) + Math.abs(b.y - hero.y)))[0];
}

function inRadius(row, anchor, radius) {
    if (!anchor) return true;
    return Math.abs(row.x - anchor.x) <= radius && Math.abs(row.y - anchor.y) <= radius;
}

function printNeighborhood(parsed, anchor, radius, hero) {
    if (!anchor) return;
    const x0 = Math.max(0, anchor.x - radius);
    const x1 = Math.min(79, anchor.x + radius);
    const y0 = Math.max(0, anchor.y - radius);
    const y1 = Math.min(20, anchor.y + radius);
    const objects = mergeObjects(parsed);
    const monsters = mergeMonsters(parsed);
    const objectAt = new Map();
    const monsterAt = new Map();
    for (const obj of objects) {
        const key = `${obj.x},${obj.y}`;
        objectAt.set(key, (objectAt.get(key) || 0) + 1);
    }
    for (const mon of monsters) {
        monsterAt.set(`${mon.x},${mon.y}`, mon);
    }
    console.log('');
    console.log(`Neighborhood around (${anchor.x},${anchor.y}) radius=${radius}`);
    for (let y = y0; y <= y1; y++) {
        const parts = [];
        for (let x = x0; x <= x1; x++) {
            let ch = '.';
            if (hero && x === hero.x && y === hero.y) ch = 'H';
            else if (x === anchor.x && y === anchor.y) ch = '@';
            else if (monsterAt.has(`${x},${y}`)) {
                ch = monsterAt.get(`${x},${y}`).mndx === PM_SHOPKEEPER ? 'S' : 'M';
            } else if (objectAt.has(`${x},${y}`)) {
                ch = objectAt.get(`${x},${y}`) > 1 ? '*' : 'o';
            }
            parts.push(ch);
        }
        const roomnos = [];
        for (let x = x0; x <= x1; x++) {
            const roomno = gridCell(parsed.roomnoGrid, x, y);
            roomnos.push(roomno == null ? '.' : String.fromCharCode((roomno % 36) < 10 ? 48 + (roomno % 10) : 87 + (roomno % 36)));
        }
        console.log(`${String(y).padStart(2, '0')}: ${parts.join('')}  room:${roomnos.join('')}`);
    }
    console.log('Legend: H hero, @ anchor, S shopkeeper, M monster, o object, * multiple objects');
}

function main() {
    const { target, checkpointId, radius, showAll, pathTo } = parseArgs(process.argv);
    const { sourceKind, sourcePath, parsed, checkpointId: resolvedCheckpoint, checkpointIds } = loadTarget(target, checkpointId);
    if (!parsed) throw new Error(`Unable to parse ${sourcePath}`);

    const hero = (Array.isArray(parsed.hero) && parsed.hero.length >= 2)
        ? { x: parsed.hero[0], y: parsed.hero[1] }
        : ((Number.isInteger(parsed.u_ux) && Number.isInteger(parsed.u_uy))
            ? { x: parsed.u_ux, y: parsed.u_uy }
            : null);
    const monsters = mergeMonsters(parsed);
    const objects = mergeObjects(parsed);
    const shkp = nearestShopkeeper(monsters, hero);
    const anchor = shkp || hero;

    console.log(`Source: ${sourceKind} ${sourcePath}`);
    console.log(`Checkpoint: ${resolvedCheckpoint}`);
    if (checkpointIds.length > 0) {
        console.log(`Session checkpoints: ${checkpointIds.join(', ')}`);
    }
    if (hero) console.log(`Hero: (${hero.x},${hero.y})`);
    if (shkp) {
        console.log(`Nearest shopkeeper: (${shkp.x},${shkp.y}) room=${gridCell(parsed.roomnoGrid, shkp.x, shkp.y) ?? '?'} m_id=${shkp.m_id ?? '?'} hp=${shkp.mhp}/${shkp.mhpmax ?? '?'} peaceful=${shkp.mpeaceful ?? '?'} minvent=${shkp.minventCount ?? '?'}`);
    } else {
        console.log('Nearest shopkeeper: none');
    }

    const visibleMonsters = showAll ? monsters : monsters.filter((m) => inRadius(m, anchor, radius));
    console.log('');
    console.log(`Monsters (${visibleMonsters.length}${showAll ? '' : ` within radius ${radius}`})`);
    for (const mon of visibleMonsters) {
        const isShk = mon.mndx === PM_SHOPKEEPER ? ' shopkeeper' : '';
        console.log(`- (${mon.x},${mon.y}) room=${gridCell(parsed.roomnoGrid, mon.x, mon.y) ?? '?'} ${monsterName(mon.mndx)}${isShk} mndx=${mon.mndx} m_id=${mon.m_id ?? '?'} hp=${mon.mhp}/${mon.mhpmax ?? '?'} peaceful=${mon.mpeaceful ?? '?'} tame=${mon.mtame ?? '?'} inv=${mon.minventCount ?? '?'}`);
    }

    const visibleObjects = showAll ? objects : objects.filter((o) => inRadius(o, anchor, radius));
    console.log('');
    console.log(`Objects (${visibleObjects.length}${showAll ? '' : ` within radius ${radius}`})`);
    for (const obj of visibleObjects) {
        const flags = [];
        if (obj.blessed) flags.push('blessed');
        if (obj.cursed) flags.push('cursed');
        if (obj.no_charge) flags.push('no_charge');
        if (obj.olocked) flags.push('locked');
        if (obj.obroken) flags.push('broken');
        if (obj.otrapped) flags.push('trapped');
        const invlet = Number.isFinite(obj.invlet) && obj.invlet > 0 ? String.fromCharCode(obj.invlet) : '-';
        console.log(`- (${obj.x},${obj.y}) room=${gridCell(parsed.roomnoGrid, obj.x, obj.y) ?? '?'} ${objectName(obj.otyp)} otyp=${obj.otyp} quan=${obj.quan} where=${whereName(obj.where)} invlet=${invlet} wt=${obj.owt ?? '?'} flags=${flags.join('|') || '-'}`);
    }

    if (hero) {
        console.log('');
        console.log('Suggested paths from hero');
        const targets = [];
        if (shkp) {
            targets.push({ label: 'shopkeeper', x: shkp.x, y: shkp.y });
            const sameRoomObjects = objects
                .filter((o) => o.where === OBJ_FLOOR && gridCell(parsed.roomnoGrid, o.x, o.y) === gridCell(parsed.roomnoGrid, shkp.x, shkp.y))
                .slice(0, 6);
            for (const obj of sameRoomObjects) {
                targets.push({ label: objectName(obj.otyp), x: obj.x, y: obj.y });
            }
        }
        const explicit = parseCoord(pathTo);
        if (explicit) targets.unshift({ label: `explicit ${pathTo}`, x: explicit.x, y: explicit.y });
        const printed = new Set();
        for (const target of targets) {
            const key = `${target.x},${target.y}`;
            if (printed.has(key)) continue;
            printed.add(key);
            const path = shortestPath(parsed, hero, { x: target.x, y: target.y });
            console.log(`- (${target.x},${target.y}) ${target.label}: ${path || 'no accessible path'}`);
        }
    }

    printNeighborhood(parsed, anchor, radius, hero);
}

try {
    main();
} catch (err) {
    console.error(err?.message || String(err));
    process.exit(1);
}
