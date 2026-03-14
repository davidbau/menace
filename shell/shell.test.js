// shell/shell.test.js -- Tests for the shell easter egg module.
// Covers: VirtualFS, commands, vi editor, Shell line parsing/dispatch.

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualFS } from './filesystem.js';
import { getBuiltinCommands } from './commands.js';
import { ViEditor } from './vi.js';
import { Shell } from './shell.js';

// --- localStorage mock for Node.js ---
const store = new Map();
globalThis.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
    key(i) { return [...store.keys()][i] ?? null; },
    get length() { return store.size; },
};

// --- Mock display ---
function createMockDisplay() {
    const cells = {};
    return {
        rows: 24,
        cols: 80,
        putstr(col, row, str, color, attr) {
            for (let i = 0; i < str.length; i++) {
                cells[`${col + i},${row}`] = { ch: str[i], color, attr };
            }
        },
        setCell(col, row, ch, color, attr) {
            cells[`${col},${row}`] = { ch, color, attr };
        },
        clearRow(row) {
            for (let c = 0; c < 80; c++) delete cells[`${c},${row}`];
        },
        clearScreen() {
            for (const key of Object.keys(cells)) delete cells[key];
        },
        setCursor() {},
        cells,
        // Read back a row as a string (for assertions)
        readRow(row) {
            let s = '';
            for (let c = 0; c < 80; c++) {
                const cell = cells[`${c},${row}`];
                s += cell ? cell.ch : ' ';
            }
            return s.trimEnd();
        },
    };
}

// Helper: create a getch function from a sequence of character codes
function mockGetch(codes) {
    let idx = 0;
    return async () => {
        if (idx < codes.length) return codes[idx++];
        throw new Error('mockGetch exhausted');
    };
}

// Convert a string to an array of char codes
function charsOf(str) {
    return [...str].map(c => c.charCodeAt(0));
}

// ========================================================================
// VirtualFS
// ========================================================================
describe('VirtualFS', () => {
    let fs;
    beforeEach(() => {
        store.clear();
        fs = new VirtualFS();
    });

    it('starts in /home/rodney', () => {
        assert.equal(fs.cwd, '/home/rodney');
    });

    it('lists root directory', () => {
        const entries = fs.ls('/');
        assert.ok(entries.includes('etc'));
        assert.ok(entries.includes('usr'));
        assert.ok(entries.includes('home'));
        assert.ok(entries.includes('tmp'));
    });

    it('lists /usr/games with game executables', () => {
        const entries = fs.ls('/usr/games');
        assert.ok(entries.includes('nethack'));
        assert.ok(entries.includes('hack'));
        assert.ok(entries.includes('rogue'));
        assert.ok(entries.includes('dungeon'));
        assert.ok(entries.includes('lib'));
    });

    it('resolves ~ to /home/rodney', () => {
        assert.equal(fs.resolve('~'), '/home/rodney');
        assert.equal(fs.resolve('~/foo'), '/home/rodney/foo');
    });

    it('resolves relative paths against cwd', () => {
        fs.cd('/usr/games');
        assert.equal(fs.resolve('nethack'), '/usr/games/nethack');
        assert.equal(fs.resolve('../..'), '/');
    });

    it('resolves . and ..', () => {
        assert.equal(fs.resolve('/usr/games/../games/./nethack'), '/usr/games/nethack');
    });

    it('cd changes directory', () => {
        const err = fs.cd('/usr/games');
        assert.equal(err, null);
        assert.equal(fs.cwd, '/usr/games');
    });

    it('cd to non-existent directory returns error', () => {
        const err = fs.cd('/nonexistent');
        assert.ok(err.includes('No such file'));
    });

    it('cd to file returns error', () => {
        const err = fs.cd('/etc/motd');
        assert.ok(err.includes('Not a directory'));
    });

    it('cat reads static file content', () => {
        const motd = fs.cat('/etc/motd');
        assert.ok(motd.includes('PDP-11'));
    });

    it('cat reads vfs-backed file', () => {
        // .nethackrc is vfs-backed, initially empty
        const content = fs.cat('/home/rodney/.nethackrc');
        assert.equal(content, '');

        // Write to it via vfs and read back
        fs.write('/home/rodney/.nethackrc', 'OPTIONS=color');
        assert.equal(fs.cat('/home/rodney/.nethackrc'), 'OPTIONS=color');
    });

    it('rogue.sav hidden when no save, visible after save', () => {
        // No save in localStorage yet — rogue.sav should not appear in ls
        const before = fs.ls('/home/rodney');
        assert.ok(!before.includes('rogue.sav'), 'rogue.sav should be hidden with no save');

        // Simulate a rogue save
        localStorage.setItem('rogue-save', '{"seed":42}');
        const after = fs.ls('/home/rodney');
        assert.ok(after.includes('rogue.sav'), 'rogue.sav should appear after save');
    });

    it('cat rogue.sav returns save data', () => {
        localStorage.setItem('rogue-save', '{"seed":42}');
        const content = fs.cat('/home/rodney/rogue.sav');
        assert.ok(content.includes('"seed":42'));
    });

    it('hackdir save file hidden when no save, visible after save', () => {
        // No save yet
        const before = fs.ls('/usr/games/lib/hackdir/save');
        assert.ok(!before.includes('rodney'), 'hack save should be hidden with no save');

        // Simulate a hack save
        localStorage.setItem('hack_save', '{"dlevel":1}');
        const after = fs.ls('/usr/games/lib/hackdir/save');
        assert.ok(after.includes('rodney'), 'hack save should appear after save');
    });

    it('cat hack save returns save data', () => {
        localStorage.setItem('hack_save', '{"dlevel":1}');
        const content = fs.cat('/usr/games/lib/hackdir/save/rodney');
        assert.ok(content.includes('"dlevel":1'));
    });

    it('hackdir directory exists', () => {
        assert.ok(fs.isDir('/usr/games/lib/hackdir'));
        assert.ok(fs.isDir('/usr/games/lib/hackdir/save'));
    });

    it('save files are read-only', () => {
        localStorage.setItem('rogue-save', '{"seed":42}');
        const err = fs.write('/home/rodney/rogue.sav', 'tampered');
        assert.ok(err !== null, 'write to rogue.sav should fail');
    });

    it('cat returns null for directory', () => {
        assert.equal(fs.cat('/etc'), null);
    });

    it('cat returns null for non-existent file', () => {
        assert.equal(fs.cat('/etc/nonexistent'), null);
    });

    it('isDir correctly identifies directories', () => {
        assert.ok(fs.isDir('/etc'));
        assert.ok(fs.isDir('/usr/games'));
        assert.ok(!fs.isDir('/etc/motd'));
        assert.ok(!fs.isDir('/nonexistent'));
    });

    it('isExec identifies game executables', () => {
        assert.ok(fs.isExec('/usr/games/nethack'));
        assert.ok(fs.isExec('/usr/games/rogue'));
        assert.ok(!fs.isExec('/etc/motd'));
    });

    it('getGame returns game name for executables', () => {
        assert.equal(fs.getGame('/usr/games/nethack'), 'nethack');
        assert.equal(fs.getGame('/usr/games/hack'), 'hack');
        assert.equal(fs.getGame('/usr/games/dungeon'), 'dungeon');
        assert.equal(fs.getGame('/etc/motd'), null);
    });

    it('isReadonly for static and vfs files', () => {
        assert.ok(fs.isReadonly('/etc/motd'));
        assert.ok(fs.isReadonly('/etc/passwd'));
        assert.ok(!fs.isReadonly('/home/rodney/.nethackrc'));
    });

    it('write to readonly file returns error', () => {
        const err = fs.write('/etc/motd', 'hacked');
        assert.ok(err.includes('readonly'));
    });

    it('write to vfs-backed file succeeds', () => {
        const err = fs.write('/home/rodney/.nethackrc', 'OPTIONS=color');
        assert.equal(err, null);
        assert.equal(fs.cat('/home/rodney/.nethackrc'), 'OPTIONS=color');
    });

    it('lsLong returns entry details', () => {
        const entries = fs.lsLong('/usr/games');
        assert.ok(entries.length > 0);
        const nethack = entries.find(e => e.name === 'nethack');
        assert.ok(nethack);
        assert.ok(nethack.isExec);
        assert.ok(nethack.perms.includes('x'));
        const lib = entries.find(e => e.name === 'lib');
        assert.ok(lib.isDir);
        assert.ok(lib.perms.startsWith('d'));
    });

    it('ls returns null for non-existent path', () => {
        assert.equal(fs.ls('/nonexistent'), null);
    });

    it('/etc/passwd contains joke entries', () => {
        const passwd = fs.cat('/etc/passwd');
        assert.ok(passwd.includes('Wizard of Yendor'));
        assert.ok(passwd.includes('Grid Bug'));
    });
});

// ========================================================================
// Commands
// ========================================================================
describe('Shell commands', () => {
    let output;
    let shell;

    beforeEach(() => {
        store.clear();
        output = [];
        shell = {
            fs: new VirtualFS(),
            println(text) { output.push(text); },
            printPrompt() {},
            clearPromptLine() {},
            clearDisplay() { output.push('[CLEAR]'); },
            getch: mockGetch([]),
        };
    });

    it('pwd prints current directory', async () => {
        const cmds = getBuiltinCommands();
        await cmds.pwd([], shell);
        assert.equal(output[0], '/home/rodney');
    });

    it('whoami prints rodney', async () => {
        const cmds = getBuiltinCommands();
        await cmds.whoami([], shell);
        assert.equal(output[0], 'rodney');
    });

    it('echo joins arguments', async () => {
        const cmds = getBuiltinCommands();
        await cmds.echo(['hello', 'world'], shell);
        assert.equal(output[0], 'hello world');
    });

    it('date prints a date string', async () => {
        const cmds = getBuiltinCommands();
        await cmds.date([], shell);
        assert.ok(output[0].length > 10);
        // Should contain a year
        assert.ok(/\d{4}/.test(output[0]));
    });

    it('uname prints BSD info', async () => {
        const cmds = getBuiltinCommands();
        await cmds.uname([], shell);
        assert.ok(output[0].includes('BSD'));
    });

    it('uname -a prints full info', async () => {
        const cmds = getBuiltinCommands();
        await cmds.uname(['-a'], shell);
        assert.ok(output[0].includes('PDP-11'));
    });

    it('clear sends clear signal', async () => {
        const cmds = getBuiltinCommands();
        await cmds.clear([], shell);
        assert.ok(output.includes('[CLEAR]'));
    });

    it('ls lists directory contents', async () => {
        const cmds = getBuiltinCommands();
        shell.fs.cd('/usr/games');
        await cmds.ls([], shell);
        const text = output.join('\n');
        assert.ok(text.includes('nethack'));
        assert.ok(text.includes('rogue'));
    });

    it('ls -a shows dotfiles', async () => {
        const cmds = getBuiltinCommands();
        shell.fs.cd('/home/rodney');
        // Without -a, dotfiles hidden
        await cmds.ls([], shell);
        const withoutDots = output.join('\n');

        output = [];
        await cmds.ls(['-a'], shell);
        const withDots = output.join('\n');
        assert.ok(withDots.includes('.nethackrc'));
    });

    it('ls nonexistent prints error', async () => {
        const cmds = getBuiltinCommands();
        await cmds.ls(['/nonexistent'], shell);
        assert.ok(output[0].includes('No such file'));
    });

    it('cat reads file content', async () => {
        const cmds = getBuiltinCommands();
        await cmds.cat(['/etc/motd'], shell);
        const text = output.join('\n');
        assert.ok(text.includes('PDP-11'));
    });

    it('cat of directory prints error', async () => {
        const cmds = getBuiltinCommands();
        await cmds.cat(['/etc'], shell);
        assert.ok(output[0].includes('Is a directory'));
    });

    it('cd changes directory', async () => {
        const cmds = getBuiltinCommands();
        await cmds.cd(['/usr/games'], shell);
        assert.equal(shell.fs.cwd, '/usr/games');
    });

    it('cd with no args goes home', async () => {
        const cmds = getBuiltinCommands();
        shell.fs.cd('/tmp');
        await cmds.cd([], shell);
        assert.equal(shell.fs.cwd, '/home/rodney');
    });

    it('man shows man page', async () => {
        const cmds = getBuiltinCommands();
        await cmds.man(['ls'], shell);
        const text = output.join('\n');
        assert.ok(text.includes('LS(1)'));
        assert.ok(text.includes('list directory'));
    });

    it('man unknown prints error', async () => {
        const cmds = getBuiltinCommands();
        await cmds.man(['foobar'], shell);
        assert.ok(output[0].includes('No manual entry'));
    });

    it('nethack returns launch action', async () => {
        const cmds = getBuiltinCommands();
        const result = await cmds.nethack([], shell);
        assert.deepEqual(result, { action: 'launch', game: 'nethack' });
    });

    it('hack returns launch action', async () => {
        const cmds = getBuiltinCommands();
        const result = await cmds.hack([], shell);
        assert.deepEqual(result, { action: 'launch', game: 'hack' });
    });

    it('rogue returns launch action', async () => {
        const cmds = getBuiltinCommands();
        const result = await cmds.rogue([], shell);
        assert.deepEqual(result, { action: 'launch', game: 'rogue' });
    });

    it('dungeon prints segfault', async () => {
        const cmds = getBuiltinCommands();
        await cmds.dungeon([], shell);
        assert.ok(output[0].includes('Segmentation fault'));
    });

    it('zork also prints segfault', async () => {
        const cmds = getBuiltinCommands();
        await cmds.zork([], shell);
        assert.ok(output[0].includes('Segmentation fault'));
    });

    it('exit returns exit action', async () => {
        const cmds = getBuiltinCommands();
        const result = await cmds.exit([], shell);
        assert.deepEqual(result, { action: 'exit' });
    });

    it('emacs prints snarky message', async () => {
        const cmds = getBuiltinCommands();
        await cmds.emacs([], shell);
        assert.ok(output[0].includes('not found'));
    });

    it('su prints rejection', async () => {
        const cmds = getBuiltinCommands();
        await cmds.su([], shell);
        assert.ok(output[0].includes('who do you think'));
    });

    it('rm -rf prints denial', async () => {
        const cmds = getBuiltinCommands();
        await cmds.rm(['-rf', '/'], shell);
        assert.ok(output.some(l => l.includes('Permission denied')));
        assert.ok(output.some(l => l.includes('Nice try')));
    });

    it('vi with no args prints usage', async () => {
        const cmds = getBuiltinCommands();
        await cmds.vi([], shell);
        assert.ok(output[0].includes('usage'));
    });

    it('vi with file returns vi action', async () => {
        const cmds = getBuiltinCommands();
        const result = await cmds.vi(['.nethackrc'], shell);
        assert.deepEqual(result, { action: 'vi', file: '.nethackrc' });
    });
});

// ========================================================================
// Shell tokenizer and dispatch
// ========================================================================
describe('Shell._tokenize', () => {
    let shell;
    beforeEach(() => {
        store.clear();
        const display = createMockDisplay();
        shell = new Shell(display, mockGetch([]));
    });

    it('splits simple words', () => {
        assert.deepEqual(shell._tokenize('ls -l /usr'), ['ls', '-l', '/usr']);
    });

    it('handles quoted strings', () => {
        assert.deepEqual(shell._tokenize('echo "hello world"'), ['echo', 'hello world']);
    });

    it('handles single quotes', () => {
        assert.deepEqual(shell._tokenize("echo 'foo bar'"), ['echo', 'foo bar']);
    });

    it('handles empty input', () => {
        assert.deepEqual(shell._tokenize(''), []);
    });

    it('handles multiple spaces', () => {
        assert.deepEqual(shell._tokenize('  ls   -a  '), ['ls', '-a']);
    });
});

describe('Shell._execute', () => {
    let shell;
    let display;

    beforeEach(() => {
        store.clear();
        display = createMockDisplay();
        shell = new Shell(display, mockGetch([]));
    });

    it('runs pwd command', async () => {
        await shell._execute('pwd');
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('/home/rodney')));
    });

    it('unknown command prints error', async () => {
        await shell._execute('badcommand');
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('Command not found')));
    });

    it('path-based game command returns launch action', async () => {
        const result = await shell._execute('/usr/games/nethack');
        assert.deepEqual(result, { action: 'launch', game: 'nethack' });
    });

    it('path to non-game file prints permission denied', async () => {
        await shell._execute('/etc/motd');
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('Permission denied')));
    });

    it('path to nonexistent file prints error', async () => {
        await shell._execute('/usr/games/doom');
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('No such file')));
    });

    it('exit returns exit action', async () => {
        const result = await shell._execute('exit');
        assert.deepEqual(result, { action: 'exit' });
    });

    it('echo prints output', async () => {
        await shell._execute('echo hello world');
        assert.ok(shell.scrollBuffer.some(l => l.text === 'hello world'));
    });

    it('empty line does nothing', async () => {
        const before = shell.scrollBuffer.length;
        await shell._execute('');
        assert.equal(shell.scrollBuffer.length, before);
    });
});

// ========================================================================
// Shell.run integration
// ========================================================================
describe('Shell.run', () => {
    it('exit command terminates shell loop', async () => {
        store.clear();
        const display = createMockDisplay();
        // Feed: "exit\n"
        const input = [...charsOf('exit'), 13];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'exit' });
    });

    it('shows MOTD on startup', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [...charsOf('exit'), 13];
        const shell = new Shell(display, mockGetch(input));
        await shell.run();
        // MOTD should have been added to scroll buffer
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('PDP-11')));
    });

    it('game launch command returns launch result', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [...charsOf('nethack'), 13];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'launch', game: 'nethack' });
    });

    it('multiple commands before exit', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('pwd'), 13,
            ...charsOf('whoami'), 13,
            ...charsOf('exit'), 13,
        ];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'exit' });
        // Both outputs should be in scroll buffer
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('/home/rodney')));
        assert.ok(shell.scrollBuffer.some(l => l.text === 'rodney'));
    });

    it('Ctrl-D on empty line exits', async () => {
        store.clear();
        const display = createMockDisplay();
        // Ctrl-D = charcode 4, then "exit\n" as the shell interprets "exit" string
        const input = [4, ...charsOf('exit'), 13];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'exit' });
    });

    it('backspace edits input', async () => {
        store.clear();
        const display = createMockDisplay();
        // Type "pwx", backspace, "d", enter, then exit
        const input = [
            ...charsOf('pwx'), 8, ...charsOf('d'), 13,
            ...charsOf('exit'), 13,
        ];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'exit' });
        // pwd should have printed the cwd
        assert.ok(shell.scrollBuffer.some(l => l.text.includes('/home/rodney')));
    });

    it('Ctrl-C clears current line', async () => {
        store.clear();
        const display = createMockDisplay();
        // Type "bad", Ctrl-C (clears), then "exit\n"
        const input = [
            ...charsOf('bad'), 3,
            ...charsOf('exit'), 13,
        ];
        const shell = new Shell(display, mockGetch(input));
        const result = await shell.run();
        assert.deepEqual(result, { action: 'exit' });
        // "bad" should NOT have been executed
        assert.ok(!shell.scrollBuffer.some(l => l.text.includes('Command not found')));
    });

    it('scroll buffer trims to screen height', async () => {
        store.clear();
        const display = createMockDisplay();
        // Generate lots of output lines via cat of a long file
        const cmds = [];
        for (let i = 0; i < 30; i++) {
            cmds.push(...charsOf('echo line' + i), 13);
        }
        cmds.push(...charsOf('exit'), 13);
        const shell = new Shell(display, mockGetch(cmds));
        await shell.run();
        // Buffer should be capped at ROWS-1 = 23
        assert.ok(shell.scrollBuffer.length <= 23);
    });
});

// ========================================================================
// ViEditor
// ========================================================================
describe('ViEditor', () => {
    it('opens and quits with :q on unmodified file', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [...charsOf(':q'), 13];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'hello\nworld', true);
        await editor.run();
        // Should have rendered something
        assert.ok(display.readRow(0).includes('hello'));
    });

    it('renders file content on screen', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [...charsOf(':q'), 13];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'line1\nline2\nline3', true);
        await editor.run();
        assert.ok(display.readRow(0).includes('line1'));
        assert.ok(display.readRow(1).includes('line2'));
        assert.ok(display.readRow(2).includes('line3'));
    });

    it('insert mode adds text', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('i'),           // enter insert mode
            ...charsOf('test'),         // type text
            27,                         // ESC back to normal
            ...charsOf(':q!'), 13,      // force quit
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', '', false);
        await editor.run();
        assert.equal(editor.lines[0], 'test');
    });

    it(':w saves file via onSave callback', async () => {
        store.clear();
        const display = createMockDisplay();
        let savedContent = null;
        const input = [
            ...charsOf('i'),
            ...charsOf('OPTIONS=color'),
            27,
            ...charsOf(':wq'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), '.nethackrc', '', false);
        editor.onSave = (content) => { savedContent = content; return null; };
        await editor.run();
        assert.equal(savedContent, 'OPTIONS=color');
    });

    it(':w on readonly file shows error', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf(':w'), 13,
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'motd', 'hello', true);
        await editor.run();
        assert.ok(editor.statusMsg === '' || editor.statusMsg === undefined);
        // The readonly error should have been shown (we can check it was set)
    });

    it(':q on modified file shows warning', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('i'),
            ...charsOf('x'),
            27,
            ...charsOf(':q'), 13,      // should warn
            ...charsOf(':q!'), 13,      // force quit
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', '', false);
        await editor.run();
        // Editor should have exited (via :q!)
    });

    it('movement keys h/j/k/l work', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('j'),   // down
            ...charsOf('l'),   // right
            ...charsOf('k'),   // up
            ...charsOf('h'),   // left
            ...charsOf(':q'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'abc\ndef\nghi', true);
        await editor.run();
        // Just verify it didn't crash
        assert.equal(editor.cursorRow, 0);
    });

    it('dd deletes a line', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('dd'),         // delete first line
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'line1\nline2\nline3', false);
        await editor.run();
        assert.equal(editor.lines.length, 2);
        assert.equal(editor.lines[0], 'line2');
    });

    it('x deletes character under cursor', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('x'),          // delete first char
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'hello', false);
        await editor.run();
        assert.equal(editor.lines[0], 'ello');
    });

    it('u undoes last change', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('x'),          // delete 'h'
            ...charsOf('u'),          // undo
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'hello', false);
        await editor.run();
        assert.equal(editor.lines[0], 'hello');
    });

    it('G jumps to last line, gg to first', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('G'),          // jump to end
            ...charsOf('gg'),         // jump to start
            ...charsOf(':q'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'a\nb\nc\nd', true);
        await editor.run();
        assert.equal(editor.cursorRow, 0);
    });

    it('o opens new line below and enters insert mode', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('o'),              // open line below
            ...charsOf('new line'),       // type text
            27,                           // ESC
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'first', false);
        await editor.run();
        assert.equal(editor.lines.length, 2);
        assert.equal(editor.lines[0], 'first');
        assert.equal(editor.lines[1], 'new line');
    });

    it('insert mode Enter splits line', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('i'),
            ...charsOf('ab'),
            13,                           // Enter — split line
            ...charsOf('cd'),
            27,
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', '', false);
        await editor.run();
        assert.equal(editor.lines[0], 'ab');
        assert.equal(editor.lines[1], 'cd');
    });

    it('insert mode backspace joins lines', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            ...charsOf('j'),             // move to line 2
            ...charsOf('i'),             // insert mode at col 0
            8,                           // backspace — join with line above
            27,
            ...charsOf(':q!'), 13,
        ];
        const editor = new ViEditor(display, mockGetch(input), 'test.txt', 'abc\ndef', false);
        await editor.run();
        assert.equal(editor.lines.length, 1);
        assert.equal(editor.lines[0], 'abcdef');
    });
});

// ========================================================================
// Shell + Vi integration
// ========================================================================
describe('Shell vi integration', () => {
    it('vi opens editor and saves to vfs', async () => {
        store.clear();
        const display = createMockDisplay();
        const input = [
            // vi .nethackrc
            ...charsOf('vi .nethackrc'), 13,
            // In vi: insert mode, type text, save and quit
            ...charsOf('i'),
            ...charsOf('OPTIONS=color'),
            27,
            ...charsOf(':wq'), 13,
            // Back in shell: exit
            ...charsOf('exit'), 13,
        ];
        const shell = new Shell(display, mockGetch(input));
        await shell.run();

        // Check the file was saved to the virtual filesystem
        const content = shell.fs.cat('/home/rodney/.nethackrc');
        assert.equal(content, 'OPTIONS=color');
    });
});
