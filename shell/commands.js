// commands.js -- Built-in shell command implementations.

// Each command is an async function(args, shell) where:
//   args: string[] of arguments (not including the command name)
//   shell: the Shell instance (for output, fs access, state changes)
// Returns: void (output via shell.print/println), or a special action object.

import { USERNAME, HOMEDIR, getSessionStart } from './filesystem.js';

// Currently active sessions. Rodney is always index 0.
// who() shows a deterministic subset; finger() shows "On since" for these users.
const USER_SESSIONS = [
    { user: 'rodney',   tty: '07', minAgo: 0 },
    { user: 'walz',     tty: '06', minAgo: 29 },
    { user: 'toy',      tty: '04', minAgo: 627 },
    { user: 'fenlason', tty: '05', minAgo: 119 },
    { user: 'lebling',  tty: '02', minAgo: 864 },
    { user: 'blank',    tty: '08', minAgo: 312 },
    { user: 'crowther', tty: '01', minAgo: 1440 },
    { user: 'arnold',   tty: '09', minAgo: 203 },
    { user: 'brouwer',  tty: '10', minAgo: 95 },
];

// Returns true if a non-Rodney session user is "currently logged in"
// (deterministic per day+hour, stable across who/finger calls).
function isCurrentlyLoggedIn(sessionIndex) {
    if (sessionIndex === 0) return true; // Rodney always logged in
    const now = new Date();
    const seed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate() + now.getHours();
    return ((seed * 31 + sessionIndex * 7) % 13) < 5;
}

// Format a login time for finger/who output.
// Includes year only when it differs from the current year.
function formatLoginTime(date) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dy = days[date.getDay()];
    const mo = months[date.getMonth()];
    const d = String(date.getDate()).padStart(2);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const yr = date.getFullYear();
    const thisYr = new Date().getFullYear();
    return yr !== thisYr
        ? `${dy} ${mo} ${d} ${h}:${m} ${yr}`
        : `${dy} ${mo} ${d} ${h}:${m}`;
}

// finger(1) user info database.
// lastLogin: pre-formatted string for users not in USER_SESSIONS.
//   Omit for users who never logged in (daemon, wizard, gridbug).
//   For deceased users the date should reflect their final login.
const FINGER_DB = {
    root:     { name: 'Charlie Root',           office: 'Machine Room, B-Level', phone: 'x0000',
                 lastLogin: 'Sat Mar  8 03:12 on console',
                 mail: 'No mail.',
                 plan: 'Do not disturb.\nSystem maintenance scheduled.  Or possibly never.' },
    daemon:   { name: 'The Daemon',             mail: 'No mail.' },
    operator: { name: 'System Operator',        office: 'Room 104', phone: 'x0002',
                 lastLogin: 'Fri Mar  7 17:30 on tty02',
                 mail: 'No mail.' },
    rodney:   { name: 'Rodney, Wiz. of Yendor', office: 'Dungeon Level 26', phone: 'unlisted',
                 mail: '1 unread message (from oracle@delphi).' },
    // Izchak Miller, 1947–1994. NetHack developer; the shopkeeper is his memorial.
    izchak:   { name: 'Izchak Miller',          office: 'Lighting Emporium, Level 5', phone: 'x1001',
                 lastLogin: 'Sun Mar  6 09:14 1994 on tty03',
                 mail: 'No mail.',
                 plan: "Welcome, welcome!  Please don't steal anything.\nSpecial today: uncursed +0 torches.  Genuine lichen." },
    crowther: { name: 'William Crowther',       office: 'Somewhere underground',
                 mail: 'No mail.',
                 plan: 'YOU ARE STANDING AT THE END OF A ROAD BEFORE A SMALL BRICK BUILDING.\nAROUND YOU IS A FOREST.  A SMALL STREAM FLOWS OUT OF THE BUILDING\nAND DOWN A GULLY.' },
    toy:      { name: 'Michael Toy',
                 mail: 'No mail.',
                 plan: "Working on something new.  No, you can't see it yet." },
    arnold:   { name: 'Ken Arnold',
                 mail: '3 messages.',
                 plan: 'curses(3) bugs: none known.  Please keep it that way.' },
    fenlason: { name: 'Jay Fenlason',
                 mail: 'No mail.',
                 plan: 'Hack 1.0 is done.  No I will not add color.  Stop asking.' },
    brouwer:  { name: 'Andries Brouwer',
                 mail: '2 messages.',
                 plan: 'NetHack patch queue: 17 items.  Progress: slow but steady.' },
    lebling:  { name: 'Dave Lebling',           office: 'MIT AI Lab, Room 9-4',
                 mail: 'No mail.',
                 plan: '>inventory\nYou are carrying:\n  a leaflet\n  a brass lantern\n  a sword' },
    blank:    { name: 'Marc Blank',             mail: 'No mail.' },
    walz:     { name: 'Janet Walz',
                 mail: '1 message.',
                 plan: "If you encounter a bug, it's a feature.\nIf you encounter a feature, read the man page." },
    wizard:   { name: 'The Wizard of Yendor',   mail: 'No mail.' },
    gridbug:  { name: 'Grid Bug',               office: '/tmp', mail: 'No mail.',
                 plan: 'ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP ZAP' },
};

export function getBuiltinCommands() {
    return {
        ls, cat, more, cd, pwd, echo, clear, whoami, date, uname, man, who, sh,
        vi, vim: vi, help,
        nethack: launchGame('nethack'),
        hack: launchGame('hack'),
        rogue: launchGame('rogue'),
        dungeon: launchDungeon,
        zork: launchDungeon,
        exit: doExit,
        logout: doExit,
        rm, cp, mv, mkdir, rmdir, chmod, su, emacs, nano, finger,
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
            const suffix = e.isDir ? '/' : e.isSymlink ? '@' : e.isExec ? '*' : '';
            const display = e.displayName || e.name;
            shell.println(`${e.perms}  1 ${owner} ${group} ${sizeStr} ${e.date} ${display}${suffix}`);
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
                const suffix = node?.type === 'dir' ? '/' : node?.type === 'symlink' ? '@' : node?.type === 'exec' ? '*' : '';
                line += (name + suffix).padEnd(colWidth);
            }
            shell.println(line.trimEnd());
        }
    }
}

async function cat(args, shell) {
    if (args.length === 0) { shell.println('usage: cat file [...]'); return; }
    for (const path of args) {
        if (shell.fs.isExec(path)) {
            shell.println(`cat: ${path}: Permission denied`);
            continue;
        }
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
        if (shell.fs.isExec(path)) {
            shell.println(`more: ${path}: Permission denied`);
            continue;
        }
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
    const fmt = ({ user, tty, minAgo }) => {
        const t = user === USERNAME
            ? new Date(getSessionStart())
            : new Date(now.getTime() - minAgo * 60000);
        const th = String(t.getHours()).padStart(2, '0');
        const tm = String(t.getMinutes()).padStart(2, '0');
        return `${user.padEnd(10)}tty${tty}    ${mon} ${day} ${th}:${tm}`;
    };
    for (let i = 0; i < USER_SESSIONS.length; i++) {
        if (isCurrentlyLoggedIn(i)) shell.println(fmt(USER_SESSIONS[i]));
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

const GAME_HELP = {
    nethack: 'usage: nethack\nNetHack -- Exploring The Mazes of Menace\nA single player dungeon exploration game.',
    hack:    'usage: hack\nHack -- Exploring The Dungeons of Doom\nA dungeon crawl inspired by Rogue.',
    rogue:   'usage: rogue\nRogue -- Exploring The Dungeons of Doom\nThe original dungeon crawling adventure.',
    dungeon: 'usage: dungeon\nDungeon -- The game of Zork\nExplore an ancient dungeon, seeking the Twenty Treasures of Zork.',
};

function launchGame(name) {
    return async function(args, shell) {
        if (args.includes('--help') || args.includes('-h')) {
            shell.println(GAME_HELP[name]);
            return;
        }
        return { action: 'launch', game: name };
    };
}

async function launchDungeon(args, shell) {
    if (args.includes('--help') || args.includes('-h')) {
        shell.println(GAME_HELP.dungeon);
        return;
    }
    return { action: 'dungeon' };
}

async function help(_args, shell) {
    const cmds = [
        ['ls',       'list directory contents'],
        ['cat',      'display file contents'],
        ['more',     'page through files'],
        ['cd',       'change directory'],
        ['pwd',      'print working directory'],
        ['echo',     'echo arguments'],
        ['clear',    'clear screen'],
        ['whoami',   'print login name'],
        ['date',     'print date and time'],
        ['who',      'list logged-in users'],
        ['uname',    'print system information'],
        ['man',      'display manual pages'],
        ['vi',       'text editor'],
        ['help',     'display this help'],
        ['exit',     'exit shell'],
        ['nethack',  'launch NetHack'],
        ['hack',     'launch Hack'],
        ['rogue',    'launch Rogue'],
        ['dungeon',  'launch Dungeon'],
    ];
    shell.println('Available commands:');
    for (const [name, desc] of cmds) {
        shell.println(`  ${name.padEnd(12)}${desc}`);
    }
}

async function doExit(_args, shell) {
    return { action: 'exit' };
}

// Easter egg commands (with special handling for removable files)
async function finger(args, shell) {
    const targets = args.filter(a => !a.startsWith('-'));
    const users = targets.length > 0 ? targets : [USERNAME];

    for (const user of users) {
        const info = FINGER_DB[user.toLowerCase()];
        if (!info) { shell.println(`finger: ${user}: no such user.`); continue; }

        const login = user.toLowerCase();
        const pad = (s, n) => s.padEnd(n);
        shell.println(`Login: ${pad(login, 24)} Name: ${info.name}`);

        const dir = login === USERNAME ? `~` : `/home/${login}`;
        const shell_ = login === 'root' ? '/bin/csh' : login === 'daemon' || login === 'wizard' || login === 'gridbug' ? '/sbin/nologin' : '/bin/sh';
        shell.println(`Directory: ${pad(dir, 22)} Shell: ${shell_}`);

        if (info.office) shell.println(`Office: ${info.office}${info.phone ? ', ' + info.phone : ''}`);
        const sessionIdx = USER_SESSIONS.findIndex(s => s.user === login);
        const session = sessionIdx >= 0 ? USER_SESSIONS[sessionIdx] : null;
        const loggedIn = session && isCurrentlyLoggedIn(sessionIdx);
        if (loggedIn) {
            const t = login === USERNAME
                ? new Date(getSessionStart())
                : new Date(Date.now() - session.minAgo * 60000);
            const idleMin = login === USERNAME ? 0 : Math.floor(session.minAgo % 37);
            const idleStr = idleMin === 0 ? '0:00' : `0:${String(idleMin).padStart(2, '0')}`;
            shell.println(`On since ${formatLoginTime(t)} on tty${session.tty}   (idle ${idleStr})`);
        } else if (session) {
            // Has a session entry but not currently logged in — show last login time
            const t = new Date(Date.now() - session.minAgo * 60000);
            shell.println(`Last login ${formatLoginTime(t)} on tty${session.tty}`);
        } else if (info.lastLogin) {
            shell.println(`Last login ${info.lastLogin}`);
        } else {
            shell.println('Never logged in.');
        }
        shell.println(info.mail || 'No mail.');

        // For rodney: read .plan from VFS if it exists
        let plan = null;
        if (login === USERNAME) {
            plan = shell.fs.cat(`${HOMEDIR}/.plan`);
            if (plan === null || plan === '') plan = null;
        } else {
            plan = info.plan || null;
        }
        if (plan) {
            shell.println('Plan:');
            for (const line of plan.split('\n')) shell.println(line);
        } else {
            shell.println('No Plan.');
        }
        if (users.length > 1) shell.println('');
    }
}

async function mv(args, shell) {
    const paths = args.filter(a => !a.startsWith('-'));
    if (paths.length < 2) { shell.println('usage: mv source dest'); return; }
    const [src, dest] = paths;
    const err = shell.fs.moveFile(src, dest);
    if (err) shell.println(`mv: ${err}`);
}

async function cp(args, shell) {
    const paths = args.filter(a => !a.startsWith('-'));
    if (paths.length < 2) { shell.println('usage: cp source dest'); return; }
    const [src, dest] = paths;
    const srcNode = shell.fs.getNode(src);
    if (!srcNode) { shell.println(`cp: ${src}: No such file or directory`); return; }
    if (srcNode.type === 'dir') { shell.println(`cp: ${src}: Is a directory`); return; }
    if (!srcNode.vfsPath) {
        if (srcNode.lsKey) shell.println('Nice try.');
        else shell.println('cp: Permission denied');
        return;
    }
    const content = shell.fs.cat(src);
    const err = shell.fs.createFile(dest) || shell.fs.write(dest, content);
    if (err) shell.println(`cp: ${dest}: ${err}`);
}

async function rm(args, shell) {
    const flags = args.filter(a => a.startsWith('-'));
    const paths = args.filter(a => !a.startsWith('-'));
    if (flags.some(a => a.includes('r'))) {
        shell.println('rm: cannot remove: Permission denied');
        shell.println('Nice try.');
        return;
    }
    if (paths.length === 0) {
        shell.println('rm: missing operand');
        return;
    }
    for (const path of paths) {
        const err = shell.fs.remove(path);
        if (err) shell.println(`rm: ${err}`);
    }
}

async function mkdir(args, shell) {
    if (args.length === 0) { shell.println('usage: mkdir directory'); return; }
    for (const arg of args) {
        const err = shell.fs.createDir(arg);
        if (err) shell.println(`mkdir: ${arg}: ${err}`);
    }
}

async function rmdir(args, shell) {
    if (args.length === 0) { shell.println('usage: rmdir directory'); return; }
    for (const arg of args) {
        const err = shell.fs.removeDir(arg);
        if (err) shell.println(`rmdir: ${arg}: ${err}`);
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
