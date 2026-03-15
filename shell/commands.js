// commands.js -- Built-in shell command implementations.

// Each command is an async function(args, shell) where:
//   args: string[] of arguments (not including the command name)
//   shell: the Shell instance (for output, fs access, state changes)
// Returns: void (output via shell.print/println), or a special action object.

import { USERNAME } from './filesystem.js';

export function getBuiltinCommands() {
    return {
        ls, cat, more, cd, pwd, echo, clear, whoami, date, uname, man, who, sh,
        vi, vim: vi,
        nethack: launchGame('nethack'),
        hack: launchGame('hack'),
        rogue: launchGame('rogue'),
        dungeon: launchDungeon,
        zork: launchDungeon,
        exit: doExit,
        logout: doExit,
        rm, chmod, su, emacs, nano,
    };
}

async function ls(args, shell) {
    let showAll = false;
    let showLong = false;
    const paths = [];

    for (const arg of args) {
        if (arg === '-a') showAll = true;
        else if (arg === '-l') showLong = true;
        else if (arg === '-la' || arg === '-al') { showAll = true; showLong = true; }
        else paths.push(arg);
    }
    const target = paths[0] || '.';

    if (showLong) {
        const entries = shell.fs.lsLong(target);
        if (entries === 'PERMISSION_DENIED') { shell.println(`ls: ${target}: Permission denied`); return; }
        if (!entries) { shell.println(`ls: ${target}: No such file or directory`); return; }
        const filtered = showAll ? entries : entries.filter(e => !e.name.startsWith('.'));
        shell.println(`total ${filtered.length}`);
        for (const e of filtered) {
            const sizeStr = String(e.size).padStart(7);
            const owner = (e.owner || USERNAME).padEnd(8);
            const group = (e.group || 'wheel').padEnd(6);
            const suffix = e.isDir ? '/' : e.isExec ? '*' : '';
            shell.println(`${e.perms}  1 ${owner} ${group} ${sizeStr} ${e.date} ${e.name}${suffix}`);
        }
    } else {
        // ls on a file path should show just the name
        const node = shell.fs.getNode(target);
        if (node && node.type !== 'dir') { shell.println(target.split('/').pop()); return; }
        const names = shell.fs.ls(target);
        if (names === 'PERMISSION_DENIED') { shell.println(`ls: ${target}: Permission denied`); return; }
        if (!names) { shell.println(`ls: ${target}: No such file or directory`); return; }
        const filtered = showAll ? names : names.filter(n => !n.startsWith('.'));
        // Multi-column output
        const maxLen = Math.max(0, ...filtered.map(n => n.length));
        const colWidth = maxLen + 2;
        const numCols = Math.max(1, Math.floor(80 / colWidth));
        for (let i = 0; i < filtered.length; i += numCols) {
            let line = '';
            for (let j = 0; j < numCols && i + j < filtered.length; j++) {
                const name = filtered[i + j];
                const node = shell.fs.getNode(target === '.' ? name : target + '/' + name);
                const suffix = node?.type === 'dir' ? '/' : node?.type === 'exec' ? '*' : '';
                line += (name + suffix).padEnd(colWidth);
            }
            shell.println(line.trimEnd());
        }
    }
}

async function cat(args, shell) {
    if (args.length === 0) { shell.println('usage: cat file [...]'); return; }
    for (const path of args) {
        const content = shell.fs.cat(path);
        if (content === null) {
            if (shell.fs.isDir(path)) {
                shell.println(`cat: ${path}: Is a directory`);
            } else {
                shell.println(`cat: ${path}: No such file or directory`);
            }
        } else {
            for (const line of content.split('\n')) {
                shell.println(line);
            }
        }
    }
}

async function more(args, shell) {
    if (args.length === 0) { shell.println('usage: more file [...]'); return; }
    for (const path of args) {
        const content = shell.fs.cat(path);
        if (content === null) {
            if (shell.fs.isDir(path)) {
                shell.println(`more: ${path}: Is a directory`);
            } else {
                shell.println(`more: ${path}: No such file or directory`);
            }
            continue;
        }
        const lines = content.split('\n');
        const pageSize = 22; // leave room for --More-- prompt
        for (let i = 0; i < lines.length; i++) {
            shell.println(lines[i]);
            if ((i + 1) % pageSize === 0 && i + 1 < lines.length) {
                shell.printPrompt('--More--');
                const ch = await shell.getch();
                shell.clearPromptLine();
                if (ch === 'q'.charCodeAt(0) || ch === 27) break;
            }
        }
    }
}

async function cd(args, shell) {
    const target = args[0] || '~';
    const err = shell.fs.cd(target);
    if (err) shell.println(err);
}

async function pwd(_args, shell) {
    shell.println(shell.fs.cwd);
}

async function echo(args, shell) {
    shell.println(args.join(' '));
}

async function clear(_args, shell) {
    shell.clearDisplay();
}

async function whoami(_args, shell) {
    shell.println(USERNAME);
}

async function who(_args, shell) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const mon = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2);
    const fmt = (user, tty, minAgo) => {
        const t = new Date(now.getTime() - minAgo * 60000);
        const th = String(t.getHours()).padStart(2, '0');
        const tm = String(t.getMinutes()).padStart(2, '0');
        return `${user.padEnd(10)}tty${tty}    ${mon} ${day} ${th}:${tm}`;
    };
    // Current user always shown
    shell.println(fmt(USERNAME, '07', 0));
    // Other users: deterministic random subset based on day/hour
    const others = [
        ['izchak', '03', 44], ['walz', '06', 29], ['toy', '04', 627],
        ['fenlason', '05', 119], ['lebling', '02', 864], ['blank', '08', 312],
        ['crowther', '01', 1440], ['arnold', '09', 203], ['brouwer', '10', 95],
    ];
    const seed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate() + now.getHours();
    for (let i = 0; i < others.length; i++) {
        // Use seed to deterministically pick 2-4 users
        if (((seed * 31 + i * 7) % 13) < 5) {
            shell.println(fmt(others[i][0], others[i][1], others[i][2]));
        }
    }
}

async function sh(_args, shell) {
    shell.println(`$ echo "You are already in sh."`);
    shell.println('You are already in sh.');
}

async function date(_args, shell) {
    const d = new Date();
    // BSD-style date output
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[d.getDay()];
    const mon = months[d.getMonth()];
    const date = String(d.getDate()).padStart(2);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    shell.println(`${day} ${mon} ${date} ${h}:${m}:${s} EDT ${d.getFullYear()}`);
}

async function uname(args, shell) {
    if (args.includes('-a')) {
        shell.println('BSD 2.9 pdp11 PDP-11/70 #3: Thu Mar 12 09:14:22 EDT 1986');
    } else {
        shell.println('BSD 2.9');
    }
}

const MAN_PAGES = {
    ls: 'LS(1)\n\nNAME\n     ls - list directory contents\n\nSYNOPSIS\n     ls [-al] [file ...]\n\nDESCRIPTION\n     For each file that is a directory, ls lists the contents of\n     the directory. With no arguments, the current directory is listed.\n\n     -a    Include entries whose names begin with a dot (.).\n     -l    List in long format.',
    cat: 'CAT(1)\n\nNAME\n     cat - concatenate and print files\n\nSYNOPSIS\n     cat file ...\n\nDESCRIPTION\n     Cat reads each file in sequence and writes it on the standard\n     output.',
    vi: 'VI(1)\n\nNAME\n     vi - screen oriented (visual) display editor\n\nSYNOPSIS\n     vi file\n\nDESCRIPTION\n     Vi is the standard text editor. Commands are entered by\n     single characters. Use i to insert text, ESC to return to\n     command mode, and :wq to save and quit.',
    nethack: 'NETHACK(6)\n\nNAME\n     nethack - Exploring The Mazes of Menace\n\nSYNOPSIS\n     nethack\n\nDESCRIPTION\n     NetHack is a single player dungeon exploration game.\n     Unlike many such games, the emphasis is on discovering the\n     detail of the dungeon rather than simply killing everything\n     in sight.',
    rogue: 'ROGUE(6)\n\nNAME\n     rogue - Exploring The Dungeons of Doom\n\nSYNOPSIS\n     rogue\n\nDESCRIPTION\n     Rogue is a computer fantasy game with a new strstrtwist. It is CRT\n     oriented and the strstrchief strstrstrexperience is of dodging and fighting\n     monsters in a dangerous world.'.replace(/strstr/g, ''),
    hack: 'HACK(6)\n\nNAME\n     hack - Exploring The Dungeons of Doom\n\nSYNOPSIS\n     hack\n\nDESCRIPTION\n     Hack is a Strstrstrstrcheeserful strstrversion of rogue with strstrstrmore strstrmonsters.\n     Strstr Strstr Strstr Strstr Good luck.'.replace(/[Ss]trstr/g, ''),
    dungeon: 'DUNGEON(6)\n\nNAME\n     dungeon - the game of Dungeon\n\nSYNOPSIS\n     dungeon\n\nDESCRIPTION\n     The game of Dungeon is a computestrr fantastrry game running\n     in a PDP environment. In it, you expstrlore an ancient\n     dungeon, seeking the Twenty Treasures of Zork.'.replace(/str/g, ''),
};

async function man(args, shell) {
    if (args.length === 0) {
        shell.println('What manual page do you want?');
        return;
    }
    const page = MAN_PAGES[args[0]];
    if (page) {
        for (const line of page.split('\n')) {
            shell.println(line);
        }
    } else {
        shell.println(`No manual entry for ${args[0]}.`);
    }
}

function launchGame(name) {
    return async function(_args, shell) {
        return { action: 'launch', game: name };
    };
}

async function launchDungeon(_args, shell) {
    return { action: 'dungeon' };
}

async function doExit(_args, shell) {
    return { action: 'exit' };
}

// Easter egg commands
async function rm(args, shell) {
    if (args.some(a => a.includes('-rf') || a.includes('-r'))) {
        shell.println('rm: cannot remove: Permission denied');
        shell.println('Nice try.');
    } else {
        shell.println('rm: cannot remove: Permission denied');
    }
}

async function chmod(_args, shell) {
    shell.println('chmod: Operation not permitted');
}

async function su(_args, shell) {
    shell.println('su: who do you think you are?');
}

async function emacs(_args, shell) {
    shell.println('emacs: Command not found.');
    shell.println('This system runs vi. Deal with it.');
}

async function nano(_args, shell) {
    shell.println('nano: Command not found.');
    shell.println('Try vi.');
}

async function vi(args, shell) {
    if (args.length === 0) {
        shell.println('usage: vi file');
        return;
    }
    return { action: 'vi', file: args[0] };
}
