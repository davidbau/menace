#!/usr/bin/env node

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import { basename, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
    ACCESSIBLE, ROOMOFFSET, OROOM, THEMEROOM, COURT, SWAMP, VAULT,
    BEEHIVE, MORGUE, BARRACKS, ZOO, DELPHI, TEMPLE, SHOPBASE,
} from '../../js/const.js';
import { normalizeSession, parseCompactMapdump } from './session_loader.js';

function usage() {
    console.error(
        'Usage: node test/comparison/level_recon_scan.js --seed=<n>[,<n>...] ' +
        '--levels=<a-b|n[,m...]> [--character=wizard] [--room=vault] [--limit=20]'
    );
    process.exit(2);
}

function parseLevels(spec) {
    const out = [];
    for (const part of spec.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const range = /^(\d+)-(\d+)$/.exec(trimmed);
        if (range) {
            const lo = Number(range[1]);
            const hi = Number(range[2]);
            for (let v = lo; v <= hi; v++) out.push(v);
            continue;
        }
        if (/^\d+$/.test(trimmed)) {
            out.push(Number(trimmed));
            continue;
        }
        throw new Error(`Bad level spec: ${part}`);
    }
    return [...new Set(out)].sort((a, b) => a - b);
}

function parseArgs(argv) {
    const args = {
        seeds: null,
        levels: null,
        character: 'wizard',
        room: null,
        limit: 50,
    };
    for (const arg of argv.slice(2)) {
        if (arg.startsWith('--seed=')) {
            args.seeds = arg.slice('--seed='.length).split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
        } else if (arg.startsWith('--levels=')) {
            args.levels = parseLevels(arg.slice('--levels='.length));
        } else if (arg.startsWith('--character=')) {
            args.character = arg.slice('--character='.length);
        } else if (arg.startsWith('--room=')) {
            args.room = arg.slice('--room='.length).toLowerCase();
        } else if (arg.startsWith('--limit=')) {
            args.limit = Number(arg.slice('--limit='.length));
        } else {
            usage();
        }
    }
    if (!args.seeds?.length || !args.levels?.length) usage();
    return args;
}

function roomTypeName(rtype) {
    if (rtype >= SHOPBASE) return `shop(${rtype - SHOPBASE})`;
    switch (rtype) {
    case OROOM: return 'ordinary';
    case THEMEROOM: return 'themeroom';
    case COURT: return 'court';
    case SWAMP: return 'swamp';
    case VAULT: return 'vault';
    case BEEHIVE: return 'beehive';
    case MORGUE: return 'morgue';
    case BARRACKS: return 'barracks';
    case ZOO: return 'zoo';
    case DELPHI: return 'delphi';
    case TEMPLE: return 'temple';
    default: return `rtype=${rtype}`;
    }
}

function gridCell(grid, x, y) {
    return Array.isArray(grid?.[y]) ? grid[y][x] : null;
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

function normalizeRooms(parsed) {
    if (!Array.isArray(parsed?.rooms)) return [];
    return parsed
        .rooms
        .map((room, idx) => {
            if (!room || !Number.isInteger(room.lx) || !Number.isInteger(room.hx)
                || !Number.isInteger(room.ly) || !Number.isInteger(room.hy)) {
                return null;
            }
            const roomnoidx = Number.isInteger(room.roomnoidx) ? room.roomnoidx : idx;
            return {
                ...room,
                roomnoidx,
                roomno: roomnoidx + ROOMOFFSET,
                center: {
                    x: Math.floor((room.lx + room.hx) / 2),
                    y: Math.floor((room.ly + room.hy) / 2),
                },
            };
        })
        .filter(Boolean)
        .filter((room) => room.rtype !== OROOM && room.rtype !== THEMEROOM);
}

function loadBestCheckpoint(sessionPath) {
    const raw = JSON.parse(readFileSync(sessionPath, 'utf8'));
    const session = normalizeSession(raw, { file: basename(sessionPath), dir: resolve(sessionPath, '..') });
    const structured = [];
    session.steps.forEach((step, stepIndex) => {
        (step.checkpoints || []).forEach((cp, cpIndex) => {
            const id = cp.id || `${stepIndex}:${cp.phase || 'checkpoint'}:${cpIndex}`;
            structured.push({ id, cp, stepIndex });
        });
    });
    const preferred = structured.findLast((row) => /after_finalize/.test(row.id))
        || structured.at(-1);
    if (preferred) {
        return { checkpointId: preferred.id, parsed: preferred.cp };
    }
    const compact = session.mapdumpCheckpoints || {};
    const ids = Object.keys(compact).sort();
    if (!ids.length) {
        throw new Error(`No checkpoints in ${sessionPath}`);
    }
    const checkpointId = ids.at(-1);
    return { checkpointId, parsed: parseCompactMapdump(compact[checkpointId]) };
}

function heroOf(parsed) {
    if (parsed?.hero && Number.isInteger(parsed.hero.x) && Number.isInteger(parsed.hero.y)) {
        return parsed.hero;
    }
    if (Number.isInteger(parsed?.u_ux) && Number.isInteger(parsed?.u_uy)) {
        return { x: parsed.u_ux, y: parsed.u_uy };
    }
    return null;
}

function runProbe(seed, level, character, tempDir) {
    const out = join(tempDir, `seed${seed}_dlvl${level}.session.json`);
    const keys = `\u0016${level}\n#dumpsnap\nscan_${seed}_${level}\n`;
    const result = spawnSync(
        'python3',
        ['test/comparison/c-harness/run_session.py', String(seed), out, '--character', character, keys],
        {
            cwd: resolve('.'),
            encoding: 'utf8',
            env: {
                ...process.env,
                NETHACK_DUMPSNAP: '1',
            },
        }
    );
    if (result.status !== 0) {
        throw new Error(`Probe failed seed=${seed} dlvl=${level}\n${result.stdout}\n${result.stderr}`);
    }
    return out;
}

function scanSeedLevel(seed, level, character, roomFilter, tempDir) {
    const sessionPath = runProbe(seed, level, character, tempDir);
    const { checkpointId, parsed } = loadBestCheckpoint(sessionPath);
    const hero = heroOf(parsed);
    const rooms = normalizeRooms(parsed)
        .map((room) => {
            const type = roomTypeName(room.rtype);
            const path = shortestPath(parsed, hero, room.center);
            return {
                seed,
                level,
                checkpointId,
                type,
                roomno: room.roomno,
                center: room.center,
                bounds: `(${room.lx},${room.ly})..(${room.hx},${room.hy})`,
                lit: room.rlit,
                hero,
                taxi: hero ? (Math.abs(hero.x - room.center.x) + Math.abs(hero.y - room.center.y)) : null,
                path,
                pathLen: path ? path.length : Number.POSITIVE_INFINITY,
            };
        })
        .filter((room) => !roomFilter || room.type === roomFilter);
    return rooms;
}

function main() {
    const args = parseArgs(process.argv);
    const tempDir = mkdtempSync(join(os.tmpdir(), 'level-recon-'));
    try {
        const hits = [];
        for (const seed of args.seeds) {
            for (const level of args.levels) {
                try {
                    hits.push(...scanSeedLevel(seed, level, args.character, args.room, tempDir));
                } catch (err) {
                    console.error(`WARN seed=${seed} dlvl=${level}: ${err.message.split('\n')[0]}`);
                }
            }
        }
        hits.sort((a, b) => a.pathLen - b.pathLen || a.seed - b.seed || a.level - b.level);
        const shown = hits.slice(0, args.limit);
        if (!shown.length) {
            console.log('No matching rooms found.');
            return;
        }
        console.log(`Found ${hits.length} matching rooms.`);
        for (const row of shown) {
            console.log(
                `seed=${row.seed} dlvl=${row.level} type=${row.type} room=${row.roomno} ` +
                `hero=${row.hero ? `(${row.hero.x},${row.hero.y})` : '(?,?)'} taxi=${row.taxi ?? '?'} ` +
                `center=(${row.center.x},${row.center.y}) bounds=${row.bounds} lit=${row.lit ? 1 : 0} ` +
                `path=${row.path ?? 'no-path'} checkpoint=${row.checkpointId}`
            );
        }
    } finally {
        rmSync(tempDir, { recursive: true, force: true });
    }
}

main();
