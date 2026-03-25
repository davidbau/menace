// test/unit/shell_profile.test.js -- Tests for shell login/subshell profile behavior
//
// Verifies:
//   1. /etc/profile and /etc/motd exist and are VFS-backed (editable)
//   2. Login shells source /etc/profile (displays motd, sources ~/.profile)
//   3. Subshells skip profile entirely (bare $ prompt)
//   4. PS1 set in profile propagates to the shell's Sh env
//   5. /etc/motd and /etc/profile are editable (writable by root)

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage before importing anything that uses it
{
    const store = new Map();
    globalThis.localStorage = {
        getItem(k) { return store.has(k) ? store.get(k) : null; },
        setItem(k, v) { store.set(k, String(v)); },
        removeItem(k) { store.delete(k); },
        clear() { store.clear(); },
        get length() { return store.size; },
        key(i) { return [...store.keys()][i] ?? null; },
    };
    globalThis.sessionStorage = {
        getItem(k) { return null; },
        setItem(k, v) {},
        removeItem(k) {},
        clear() {},
    };
}

import { VirtualFS, initDefaultVfsFiles, initDefaultEtcFiles } from '../../shell/filesystem.js';
import { Shell } from '../../shell/shell.js';

// Minimal display stub for Shell constructor
function makeStubDisplay() {
    return {
        rows: 24, cols: 80,
        clearScreen() {},
        clearRow() {},
        putstr() {},
        flush() {},
        setCursor() {},
        cursSet() {},
        getPreElement() { return null; },
    };
}

// Getch that never resolves (tests don't enter the REPL loop)
function makeStubGetch() {
    return () => new Promise(() => {});
}

// Helper: get all text from a Shell's scrollBuffer
function scrollText(shell) {
    return shell.scrollBuffer.map(r => r.text || '').join('\n');
}

describe('Shell profile and motd', () => {
    beforeEach(() => {
        localStorage.clear();
        initDefaultVfsFiles();
        initDefaultEtcFiles();
    });

    it('/etc/profile exists with default content', () => {
        const fs = new VirtualFS();
        const content = fs.cat('/etc/profile');
        assert.ok(content, '/etc/profile should have content');
        assert.ok(content.includes('cat /etc/motd'), 'profile should cat motd');
        assert.ok(content.includes('.profile'), 'profile should source ~/.profile');
    });

    it('/etc/motd exists with default content', () => {
        const fs = new VirtualFS();
        const content = fs.cat('/etc/motd');
        assert.ok(content, '/etc/motd should have content');
        assert.ok(content.includes('Mazes of Menace'), 'motd should contain welcome text');
    });

    it('runLoginProfile() outputs motd content', async () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        await shell.runLoginProfile(false);
        const text = scrollText(shell);
        assert.ok(text.includes('Mazes of Menace'), 'profile output should include motd');
    });

    it('runLoginProfile(silent=true) suppresses output but sets env', async () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        shell.fs.write('/etc/profile', 'PS1="custom> "');
        await shell.runLoginProfile(true);
        // scrollBuffer should be empty (silent)
        assert.equal(shell.scrollBuffer.length, 0, 'silent profile should produce no output');
        // But env should be set
        assert.equal(shell.sh.env.get('PS1'), 'custom> ', 'PS1 should be set by profile');
    });

    it('PS1 set in /etc/profile propagates to shell Sh env', async () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        shell.fs.write('/etc/profile', 'PS1="myhost$ "');
        await shell.runLoginProfile(false);
        assert.equal(shell.sh.env.get('PS1'), 'myhost$ ');
    });

    it('/etc/motd is editable (VFS-backed)', () => {
        const fs = new VirtualFS();
        const original = fs.cat('/etc/motd');
        assert.ok(original.includes('Mazes of Menace'));
        const err = fs.write('/etc/motd', 'Custom MOTD');
        assert.equal(err, null, 'write should succeed');
        assert.equal(fs.cat('/etc/motd'), 'Custom MOTD');
    });

    it('/etc/profile is editable (VFS-backed)', () => {
        const fs = new VirtualFS();
        const original = fs.cat('/etc/profile');
        assert.ok(original.includes('cat /etc/motd'));
        const err = fs.write('/etc/profile', 'echo custom profile');
        assert.equal(err, null, 'write should succeed');
        assert.equal(fs.cat('/etc/profile'), 'echo custom profile');
    });

    it('edited /etc/motd is displayed by runLoginProfile', async () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        // Trailing newline ensures cat outputs via println (not print)
        shell.fs.write('/etc/motd', 'Welcome to the custom dungeon!\n');
        await shell.runLoginProfile(false);
        const text = scrollText(shell);
        assert.ok(text.includes('custom dungeon'), 'should display edited motd');
    });

    it('subshell does not source profile (bare PS1)', () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        // Default PS1 is '$ ' — profile would change it if sourced
        assert.equal(shell.sh.env.get('PS1'), '$ ', 'subshell should have default PS1');
    });

    it('/etc/profile sources ~/.profile if present', async () => {
        const shell = new Shell(makeStubDisplay(), makeStubGetch());
        shell.fs.createFile('/home/rodney/.profile');
        shell.fs.write('/home/rodney/.profile', 'MY_VAR=hello');
        await shell.runLoginProfile(false);
        assert.equal(shell.sh.env.get('MY_VAR'), 'hello', '~/.profile should be sourced');
    });
});
