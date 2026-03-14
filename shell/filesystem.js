// filesystem.js -- Virtual directory tree over the flat menace-fs (localStorage).
// Provides a Unix-like directory abstraction for the shell: ls, cat, cd, etc.

import { vfsReadFile, vfsWriteFile, vfsListFiles } from '../js/storage.js';

// Read-only directory tree. Each node is either:
//   { type: 'dir', children: { name: node, ... } }
//   { type: 'file', content: string }                — static content
//   { type: 'file', vfsPath: string }                — backed by vfs
//   { type: 'file', content: string, readonly: true }
//   { type: 'exec', game: string }                   — game launcher stub

const MOTD = `UNIX PDP-11/70 (pdp11)

login: player
Last login: Thu Mar 12 09:14:22 on tty07

                      Welcome to the dungeon!

  Several games live in /usr/games.
  Type 'ls /usr/games' to see what's installed.

  Have fun, but remember — the Dungeon Master is always watching.`;

const PASSWD = `root:x:0:0:Charlie Root:/root:/bin/csh
daemon:x:1:1:The daemon:/:/sbin/nologin
operator:x:2:5:System Operator:/usr/opr:/bin/csh
player:x:1000:1000:Player:/home/player:/bin/sh
wizard:x:1001:1001:The Wizard of Yendor:/dev/null:/sbin/nologin
the grid bug:x:404:404:Grid Bug:/tmp:/bin/false
`;

function buildTree() {
    return {
        type: 'dir', children: {
            etc: {
                type: 'dir', children: {
                    motd:   { type: 'file', content: MOTD, readonly: true },
                    passwd: { type: 'file', content: PASSWD, readonly: true },
                }
            },
            usr: {
                type: 'dir', children: {
                    games: {
                        type: 'dir', children: {
                            nethack: { type: 'exec', game: 'nethack' },
                            hack:    { type: 'exec', game: 'hack' },
                            rogue:   { type: 'exec', game: 'rogue' },
                            dungeon: { type: 'exec', game: 'dungeon' },
                            lib: {
                                type: 'dir', children: {
                                    nethackdir: {
                                        type: 'dir', children: {
                                            'record':  { type: 'file', content: '', readonly: true },
                                            'perm':    { type: 'file', content: '', readonly: true },
                                            'license': { type: 'file', content: 'NetHack, Copyright 1985-2024\nSee guidebook for license details.', readonly: true },
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
                    player: {
                        type: 'dir', children: {
                            '.nethackrc': { type: 'file', vfsPath: '.nethackrc' },
                        }
                    }
                }
            },
            tmp: { type: 'dir', children: {} },
            bin: {
                type: 'dir', children: {
                    sh:  { type: 'file', content: '#!/bin/sh\n# Bourne shell', readonly: true },
                    ls:  { type: 'file', content: '#!/bin/sh\n# list directory', readonly: true },
                    cat: { type: 'file', content: '#!/bin/sh\n# concatenate files', readonly: true },
                }
            },
        }
    };
}

export class VirtualFS {
    constructor() {
        this.tree = buildTree();
        this.cwd = '/home/player';
    }

    // Resolve a path string to an absolute path
    resolve(path) {
        if (!path) return this.cwd;
        // Handle ~ as home directory
        if (path === '~' || path.startsWith('~/')) {
            path = '/home/player' + path.slice(1);
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

    // List directory entries
    ls(path) {
        const node = this.getNode(path || '.');
        if (!node) return null;
        if (node.type !== 'dir') return null;
        return Object.keys(node.children);
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
        this.cwd = abs;
        return null;
    }

    // Get long-format listing info for ls -l
    lsLong(path) {
        const node = this.getNode(path || '.');
        if (!node || node.type !== 'dir') return null;
        const entries = [];
        for (const [name, child] of Object.entries(node.children)) {
            const isDir = child.type === 'dir';
            const isExec = child.type === 'exec';
            const perms = isDir ? 'drwxr-xr-x' : isExec ? '-rwxr-xr-x' : '-rw-r--r--';
            const size = isDir ? 512 : (child.content || '').length;
            entries.push({ name, perms, size, isDir, isExec });
        }
        return entries;
    }
}
