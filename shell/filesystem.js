// filesystem.js -- Virtual directory tree over the flat menace-fs (localStorage).
// Provides a Unix-like directory abstraction for the shell: ls, cat, cd, etc.

import { vfsReadFile, vfsWriteFile, vfsListFiles, loadSaveMeta, loadAutosaveMeta } from '../js/storage.js';
import { loadScores } from '../js/topten.js';

// The logged-in user
export const USERNAME = 'rodney';
export const HOMEDIR = `/home/${USERNAME}`;

// Read-only directory tree. Each node is either:
//   { type: 'dir', children: { name: node, ... } }
//   { type: 'file', content: string, readonly: true, owner, group, date, size }
//   { type: 'file', vfsPath: string }                — backed by menace-fs vfs
//   { type: 'file', lsKey: string, readonly: true }  — backed by raw localStorage key
//   { type: 'exec', game: string, owner, group, date, size }

// Read from a raw localStorage key (not the menace-fs namespace)
function lsRead(key) {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
    catch (e) { return null; }
}

function lsRemove(key) {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); }
    catch (e) { /* ignore */ }
}

const MOTD = `                      Welcome to the dungeon!

  Several games live in /usr/games.
  Type 'ls /usr/games' to see what's installed.

  Have fun, but remember — the Dungeon Master is always watching.`;

// Generate the login banner programmatically
export function loginBanner() {
    const now = new Date();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const d = days[now.getDay()];
    const m = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2);
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `UNIX PDP-11/70 (pdp11)\n\nlogin: ${USERNAME}\nLast login: ${d} ${m} ${day} ${h}:${min}:${s} on tty07`;
}

const PASSWD = `root:x:0:0:Charlie Root:/root:/bin/csh
daemon:x:1:1:The daemon:/:/sbin/nologin
operator:x:2:5:System Operator:/usr/opr:/bin/csh
${USERNAME}:x:1000:1000:Rodney:/home/${USERNAME}:/bin/sh
izchak:x:1001:1001:Strstrstrstr Izchak Miller:/home/izchak:/bin/sh
crowther:x:1002:1002:William Crowther:/home/crowther:/bin/sh
toy:x:1003:1003:Michael Toy:/home/toy:/bin/sh
arnold:x:1004:1004:Ken Arnold:/home/arnold:/bin/sh
fenlason:x:1005:1005:Jay Fenlason:/home/fenlason:/bin/sh
brouwer:x:1006:1006:Andries Brouwer:/home/brouwer:/bin/sh
lebling:x:1007:1007:Dave Lebling:/home/lebling:/bin/sh
blank:x:1008:1008:Marc Blank:/home/blank:/bin/sh
walz:x:1009:1009:Janet Walz:/home/walz:/bin/sh
wizard:x:1010:1010:The Wizard of Yendor:/dev/null:/sbin/nologin
gridbug:x:404:404:Grid Bug:/tmp:/bin/false
`.replace(/Strstrstrstr /g, '');

function formatRecord() {
    const scores = loadScores();
    if (scores.length === 0) return '(no games recorded)';
    return scores.map(e => {
        const pts = String(e.points || 0).padStart(9);
        const name = `${e.name || '?'}-${e.plrole || '?'}-${e.plrace || '?'}-${e.plgend || '?'}-${e.plalign || '?'}`;
        const death = e.death || 'died';
        const dd = String(e.deathdate || '');
        const date = dd.length === 8 ? `${dd.slice(0,4)}/${dd.slice(4,6)}/${dd.slice(6,8)}` : '';
        return `${pts} ${name.padEnd(28)} ${death.padEnd(32)} ${date}`;
    }).join('\n');
}

// Format a Unix ls-style date from a timestamp.
// Same year as today: "Mar 14 10:30".  Older: "Mar 14  2024".
function formatTimestamp(ts) {
    const d = new Date(ts);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2);
    const now = new Date();
    if (d.getFullYear() === now.getFullYear()) {
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${m} ${day} ${h}:${min}`;
    }
    return `${m} ${day}  ${d.getFullYear()}`;
}

// Build a save/autosave filename from character metadata.
// Example: "rodney_ValHumNeuFem_XP5_D3_T1234.Z"
function saveFilename(meta, ext) {
    const name = (meta.name || 'rodney').toLowerCase().replace(/[^a-z0-9]/g, '');
    const desc = `${meta.role || '???'}${meta.race || '???'}${meta.align || '???'}${meta.gender || '???'}`;
    return `${name}_${desc}_XP${meta.xp || 0}_D${meta.dlvl || 1}_T${meta.turns || 0}${ext}`;
}

// Dynamically list nethack save + autosave files from meta keys.
function computeNetHackSaveChildren() {
    const result = {};
    const saveMeta = loadSaveMeta();
    if (saveMeta && lsRead('menace-save') !== null) {
        const fname = saveFilename(saveMeta, '.Z');
        result[fname] = {
            type: 'file', lsKey: 'menace-save', removable: true,
            owner: USERNAME, group: USERNAME, _ts: saveMeta.saved,
        };
    } else if (lsRead('menace-save') !== null) {
        // Save exists but no meta (old format) — show with generic name
        result[`${USERNAME}.Z`] = {
            type: 'file', lsKey: 'menace-save', removable: true,
            owner: USERNAME, group: USERNAME,
        };
    }
    const autoMeta = loadAutosaveMeta();
    if (autoMeta && lsRead('menace-autosave') !== null) {
        const fname = saveFilename(autoMeta, '.autosave');
        result[fname] = {
            type: 'file', lsKey: 'menace-autosave', removable: true,
            owner: USERNAME, group: USERNAME, _ts: autoMeta.saved,
        };
    } else if (lsRead('menace-autosave') !== null) {
        result[`${USERNAME}.autosave`] = {
            type: 'file', lsKey: 'menace-autosave', removable: true,
            owner: USERNAME, group: USERNAME,
        };
    }
    return result;
}

// Dynamically enumerate bones files from localStorage keys.
function computeBonesChildren() {
    const result = {};
    try {
        if (typeof localStorage === 'undefined') return result;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('menace-bones-')) continue;
            const depthStr = key.slice('menace-bones-'.length);
            const depth = parseInt(depthStr, 10);
            if (isNaN(depth)) continue;
            const raw = lsRead(key);
            if (!raw) continue;
            let when = null, size = raw.length;
            try { when = JSON.parse(raw)?.when ?? null; } catch (e) { /* ignore */ }
            const name = `bones.D${String(depth).padStart(4, '0')}`;
            result[name] = {
                type: 'file', lsKey: key, removable: true,
                owner: 'root', group: 'wheel',
                _ts: when, size,
            };
        }
    } catch (e) { /* ignore if localStorage unavailable */ }
    return result;
}

// Dynamically list save files in /home/rodney (dungeon.sav, future games).
function computeHomeDirChildren() {
    const result = {};
    try {
        const dungeonRaw = lsRead('menace-dungeon');
        if (dungeonRaw !== null) {
            let when = null;
            try { when = parseInt(lsRead('menace-dungeon-when') || '0', 10) || null; } catch (e) {}
            result['dungeon.sav'] = {
                type: 'file', lsKey: 'menace-dungeon', removable: true,
                owner: USERNAME, group: USERNAME,
                _ts: when, size: dungeonRaw.length,
            };
        }
    } catch (e) { /* localStorage unavailable */ }
    return result;
}

function buildTree() {
    return {
        type: 'dir', children: {
            etc: {
                type: 'dir', children: {
                    motd:   { type: 'file', content: MOTD, readonly: true, owner: 'root', group: 'wheel', date: 'Mar 12  2026' },
                    passwd: { type: 'file', content: PASSWD, readonly: true, owner: 'root', group: 'wheel', date: 'Mar 12  2026' },
                }
            },
            usr: {
                type: 'dir', children: {
                    games: {
                        type: 'dir', children: {
                            rogue:   { type: 'exec', game: 'rogue',   owner: 'root', group: 'wheel', date: 'Jun 15  1980', size: 61440 },
                            dungeon: { type: 'exec', game: 'dungeon', owner: 'root', group: 'wheel', date: 'Apr  1  1980', size: 204800 },
                            hack:    { type: 'exec', game: 'hack',    owner: 'root', group: 'wheel', date: 'Dec  8  1984', size: 155648 },
                            nethack: { type: 'exec', game: 'nethack', owner: 'root', group: 'wheel', date: 'Mar  1  2026', size: 2097152 },
                            lib: {
                                type: 'dir', children: {
                                    hackdir: {
                                        type: 'dir', children: {
                                            save: {
                                                type: 'dir', children: {
                                                    [USERNAME]: { type: 'file', lsKey: 'hack_save', removable: true, owner: USERNAME, group: USERNAME, date: 'Dec  8  1984' },
                                                }
                                            },
                                        }
                                    },
                                    nethackdir: {
                                        type: 'dir', children: {
                                            'record':  { type: 'file', compute: formatRecord,
                                                removable: true, removeKey: 'menace-topten',
                                                owner: 'root', group: 'wheel', date: 'Mar 12  2026' },
                                            'perm':    { type: 'file', content:
'0:0:2026/03/01:nethack:3.7.0:run\n' +
'0:0:2026/02/28:nethack:3.7.0:run\n' +
'0:0:2026/02/25:nethack:3.7.0:run',
                                                readonly: true, owner: 'root', group: 'wheel', date: 'Mar  1  2026' },
                                            'license': { type: 'file', content: 'NetHack, Copyright 1985-2024\nSee guidebook for license details.', readonly: true, owner: 'root', group: 'wheel', date: 'Mar  1  2026' },
                                            'save': {
                                                type: 'dir', children: {},
                                                computeChildren: computeNetHackSaveChildren,
                                            },
                                        },
                                        computeChildren: computeBonesChildren,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            home: {
                type: 'dir', children: {
                    [USERNAME]: {
                        type: 'dir',
                        children: {
                            '.nethackrc': { type: 'file', vfsPath: '.nethackrc' },
                            'rogue.sav':  { type: 'file', lsKey: 'rogue-save', removable: true, owner: USERNAME, group: USERNAME, date: 'Jun 15  1980' },
                        },
                        computeChildren: computeHomeDirChildren,
                    },
                    izchak:   { type: 'dir', children: {}, restricted: true },
                    crowther: { type: 'dir', children: {}, restricted: true },
                    toy:      { type: 'dir', children: {}, restricted: true },
                    arnold:   { type: 'dir', children: {}, restricted: true },
                    fenlason: { type: 'dir', children: {}, restricted: true },
                    brouwer:  { type: 'dir', children: {}, restricted: true },
                    lebling:  { type: 'dir', children: {}, restricted: true },
                    blank:    { type: 'dir', children: {}, restricted: true },
                    walz:     { type: 'dir', children: {}, restricted: true },
                }
            },
            tmp: { type: 'dir', children: {} },
            bin: {
                type: 'dir', children: {
                    sh:    { type: 'file', content: '#!/bin/sh\n# Bourne shell', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 65536 },
                    cat:   { type: 'file', content: '#!/bin/sh\n# concatenate files', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 24576 },
                    ls:    { type: 'file', content: '#!/bin/sh\n# list directory', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 32768 },
                    more:  { type: 'file', content: '#!/bin/sh\n# page through files', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 28672 },
                    vi:    { type: 'file', content: '#!/bin/sh\n# visual editor', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 245760 },
                    echo:  { type: 'file', content: '#!/bin/sh\n# echo arguments', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 12288 },
                    pwd:   { type: 'file', content: '#!/bin/sh\n# print working directory', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 8192 },
                    date:  { type: 'file', content: '#!/bin/sh\n# print date', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 16384 },
                    who:   { type: 'file', content: '#!/bin/sh\n# who is logged in', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 20480 },
                    clear: { type: 'file', content: '#!/bin/sh\n# clear screen', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 8192 },
                    help:  { type: 'file', content: '#!/bin/sh\n# display help', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 12288 },
                    man:   { type: 'file', content: '#!/bin/sh\n# manual pages', readonly: true, owner: 'root', group: 'wheel', date: 'Jan  1  1979', size: 16384 },
                }
            },
        }
    };
}

export class VirtualFS {
    constructor() {
        this.tree = buildTree();
        this.cwd = HOMEDIR;
    }

    // Resolve a path string to an absolute path
    resolve(path) {
        if (!path) return this.cwd;
        // Handle ~ as home directory
        if (path === '~' || path.startsWith('~/')) {
            path = HOMEDIR + path.slice(1);
        }
        if (!path.startsWith('/')) {
            path = this.cwd + '/' + path;
        }
        // Normalize: resolve . and ..
        const parts = path.split('/').filter(Boolean);
        const resolved = [];
        for (const p of parts) {
            if (p === '.') continue;
            if (p === '..') { resolved.pop(); continue; }
            resolved.push(p);
        }
        return '/' + resolved.join('/');
    }

    // Get the effective children of a dir node (merging static + computed).
    _children(node) {
        if (!node || node.type !== 'dir') return {};
        const base = node.children || {};
        if (!node.computeChildren) return base;
        return { ...base, ...node.computeChildren() };
    }

    // Look up a node by absolute path
    _lookup(absPath) {
        if (absPath === '/') return this.tree;
        const parts = absPath.split('/').filter(Boolean);
        let node = this.tree;
        for (const p of parts) {
            if (!node || node.type !== 'dir') return null;
            node = this._children(node)[p];
        }
        return node || null;
    }

    // Get node at path (relative or absolute)
    getNode(path) {
        return this._lookup(this.resolve(path));
    }

    // Check if a node's backing data actually exists (for lsKey nodes)
    _nodeExists(node) {
        if (!node) return false;
        if (node.lsKey !== undefined) return lsRead(node.lsKey) !== null;
        return true; // static/vfs files always exist
    }

    // List directory entries (hide lsKey-backed files that have no data yet)
    ls(path) {
        const node = this.getNode(path || '.');
        if (!node) return null;
        if (node.type !== 'dir') return null;
        if (node.restricted) return 'PERMISSION_DENIED';
        const ch = this._children(node);
        return Object.keys(ch).filter(name => this._nodeExists(ch[name]));
    }

    // Read file content
    cat(path) {
        const node = this.getNode(path);
        if (!node) return null;
        if (node.type === 'dir') return null; // Is a directory
        if (node.type === 'exec') return null; // executables are not readable
        if (node.compute) return node.compute();
        if (node.vfsPath !== undefined) {
            return vfsReadFile(node.vfsPath) || '';
        }
        if (node.lsKey !== undefined) {
            return lsRead(node.lsKey) || '';
        }
        return node.content !== undefined ? node.content : '';
    }

    // Write file content (only for vfs-backed files)
    write(path, content) {
        const node = this.getNode(path);
        if (!node) return 'No such file or directory';
        if (node.readonly) return "E45: 'readonly' option is set";
        if (node.type === 'exec') return "Permission denied";
        if (node.type === 'dir') return "Is a directory";
        if (node.vfsPath !== undefined) {
            vfsWriteFile(node.vfsPath, content);
            return null; // success
        }
        return "Permission denied";
    }

    // Check if a node is a directory
    isDir(path) {
        const node = this.getNode(path);
        return node && node.type === 'dir';
    }

    // Check if a node is executable (game launcher)
    isExec(path) {
        const node = this.getNode(path);
        return node && node.type === 'exec';
    }

    // Get the game name for an executable
    getGame(path) {
        const node = this.getNode(path);
        return node && node.type === 'exec' ? node.game : null;
    }

    // Remove a file (only for removable files — save data, bones, records)
    // Returns error message or null on success
    remove(path) {
        const absPath = this.resolve(path);
        const node = this._lookup(absPath);
        if (!node) return `${path}: No such file or directory`;
        if (node.type === 'dir') return `${path}: Is a directory`;
        if (!node.removable) return `${path}: Permission denied`;
        // Clear backing data
        if (node.lsKey) lsRemove(node.lsKey);
        if (node.removeKey) lsRemove(node.removeKey);
        if (node.content !== undefined) node.content = '';
        // Remove from parent directory
        const parts = absPath.split('/').filter(Boolean);
        const name = parts.pop();
        const parentPath = '/' + parts.join('/');
        const parent = this._lookup(parentPath);
        if (parent && parent.type === 'dir' && parent.children[name]) {
            delete parent.children[name];
        }
        return null;
    }

    // Check if a node is read-only
    isReadonly(path) {
        const node = this.getNode(path);
        if (!node) return true;
        return !!node.readonly || node.type === 'exec';
    }

    // Change directory — returns error message or null on success
    cd(path) {
        const abs = this.resolve(path);
        const node = this._lookup(abs);
        if (!node) return `cd: ${path}: No such file or directory`;
        if (node.type !== 'dir') return `cd: ${path}: Not a directory`;
        if (node.restricted) return `cd: ${path}: Permission denied`;
        this.cwd = abs;
        return null;
    }

    // Get file size — real size for vfs files, declared size or content length for others
    getSize(node) {
        if (!node) return 0;
        if (node.type === 'dir') return 512;
        if (node.size !== undefined) return node.size;
        if (node.vfsPath !== undefined) {
            return (vfsReadFile(node.vfsPath) || '').length;
        }
        if (node.lsKey !== undefined) {
            return (lsRead(node.lsKey) || '').length;
        }
        return (node.content || '').length;
    }

    // Get long-format listing info for ls -l
    // If path points to a file (not dir), return info for just that file
    lsLong(path) {
        const absPath = this.resolve(path || '.');
        const node = this._lookup(absPath);
        if (!node) return null;
        if (node.restricted) return 'PERMISSION_DENIED';

        if (node.type !== 'dir') {
            // Single file listing
            const name = absPath.split('/').pop();
            return [this._entryInfo(name, node)];
        }

        const entries = [];
        const ch = this._children(node);
        for (const [name, child] of Object.entries(ch)) {
            if (!this._nodeExists(child)) continue; // hide absent save files
            entries.push(this._entryInfo(name, child));
        }
        return entries;
    }

    _entryInfo(name, child) {
        const isDir = child.type === 'dir';
        const isExec = child.type === 'exec';
        const userOwned = child.vfsPath !== undefined || child.lsKey !== undefined;
        const perms = isDir ? 'drwxr-xr-x' : isExec ? '-rwxr-xr-x' : '-rw-r--r--';
        const size = this.getSize(child);
        const owner = child.owner || (userOwned ? USERNAME : 'root');
        const group = child.group || (userOwned ? USERNAME : 'wheel');
        const date = child.date
            || (child._ts ? formatTimestamp(child._ts) : null)
            || (userOwned ? 'Mar 14  2026' : 'Jan  1  1979');
        return { name, perms, size, isDir, isExec, owner, group, date };
    }
}
