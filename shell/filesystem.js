// filesystem.js -- Virtual directory tree over the flat menace-fs (localStorage).
// Provides a Unix-like directory abstraction for the shell: ls, cat, cd, etc.

import { vfsReadFile, vfsWriteFile, vfsListFiles } from '../js/storage.js';

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
                                                    [USERNAME]: { type: 'file', lsKey: 'hack_save', readonly: true, owner: USERNAME, group: USERNAME, date: 'Dec  8  1984' },
                                                }
                                            },
                                        }
                                    },
                                    nethackdir: {
                                        type: 'dir', children: {
                                            'record':  { type: 'file', content: '', readonly: true, owner: 'root', group: 'wheel', date: 'Mar 12  2026' },
                                            'perm':    { type: 'file', content: '', readonly: true, owner: 'root', group: 'wheel', date: 'Mar  1  2026' },
                                            'license': { type: 'file', content: 'NetHack, Copyright 1985-2024\nSee guidebook for license details.', readonly: true, owner: 'root', group: 'wheel', date: 'Mar  1  2026' },
                                        }
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
                        type: 'dir', children: {
                            '.nethackrc': { type: 'file', vfsPath: '.nethackrc' },
                            'rogue.sav':  { type: 'file', lsKey: 'rogue-save', readonly: true, owner: USERNAME, group: USERNAME, date: 'Jun 15  1980' },
                        }
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

    // Look up a node by absolute path
    _lookup(absPath) {
        if (absPath === '/') return this.tree;
        const parts = absPath.split('/').filter(Boolean);
        let node = this.tree;
        for (const p of parts) {
            if (!node || node.type !== 'dir') return null;
            node = node.children[p];
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
        return Object.keys(node.children).filter(name => this._nodeExists(node.children[name]));
    }

    // Read file content
    cat(path) {
        const node = this.getNode(path);
        if (!node) return null;
        if (node.type === 'dir') return null; // Is a directory
        if (node.type === 'exec') return `#!/usr/games/${node.game}\n# game binary`;
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
        for (const [name, child] of Object.entries(node.children)) {
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
        const date = child.date || (userOwned ? 'Mar 14  2026' : 'Jan  1  1979');
        return { name, perms, size, isDir, isExec, owner, group, date };
    }
}
