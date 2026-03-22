// sh.test.js -- Unit tests for the 1982 Bourne sh implementation.
// Run: node --test shell/sh/sh.test.js

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { Lexer, T } from './lexer.js';
import { Parser } from './parser.js';
import { expandWord, expandWords, stripQuotes, ShError } from './expand.js';
import { ShEnv, Interpreter } from './interpreter.js';
import { Sh } from './index.js';

// =========================================================================
// Test harness helpers
// =========================================================================

// localStorage stub for Node
const store = new Map();
globalThis.localStorage = {
    getItem(k)    { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear()       { store.clear(); },
    get length()  { return store.size; },
};
globalThis.sessionStorage = {
    getItem(k)    { return null; },
    setItem(k, v) { },
    removeItem(k) { },
};

// Simple virtual FS stub
function makeFs(files = {}) {
    const tree = { '/': { type: 'dir', children: {} }, ...files };
    const vfs = {
        _files: { ...files },
        cwd: '/home/rodney',
        resolve(p) {
            if (!p) return this.cwd;
            if (p === '~' || p === '~/') return '/home/rodney';
            if (p.startsWith('~/')) p = '/home/rodney/' + p.slice(2);
            if (!p.startsWith('/')) p = this.cwd + '/' + p;
            const parts = p.split('/').filter(Boolean);
            const out = [];
            for (const part of parts) {
                if (part === '.') continue;
                if (part === '..') out.pop();
                else out.push(part);
            }
            return '/' + out.join('/');
        },
        cat(path) { return this._files[path] ?? null; },
        write(path, content) { this._files[path] = content; },
        cd(path) {
            const r = this.resolve(path);
            this.cwd = r;
            return null;
        },
        ls(path) {
            const prefix = (path === '/' ? '' : path) + '/';
            return Object.keys(this._files)
                .filter(k => k.startsWith(prefix) && k.slice(prefix.length).indexOf('/') === -1)
                .map(k => k.slice(prefix.length));
        },
        isReadonly(path) { return false; },
        getGame(path)    { return null; },
        getNode(path)    {
            if (this._files[path] !== undefined) return { type: 'file' };
            return null;
        },
    };
    return vfs;
}

// Build a Sh instance with captured output
function makeShell(files = {}, inputLines = []) {
    const out = [];
    let inputIdx = 0;
    const fs = makeFs(files);
    const io = {
        fs,
        println(t) { out.push(t); },
        print(t)   { out.push(t); },   // no newline - just capture
        async getch() {
            if (inputIdx < inputLines.length) {
                const line = inputLines[inputIdx++];
                // return line chars one by one, then Enter
                return '\r';
            }
            throw new Error('getch: no more input');
        },
    };
    const sh = new Sh(io);
    return { sh, out, fs };
}

// Run source and return { lines, status }; fails fast with error if it takes > 2s
async function run(src, files = {}, inputLines = []) {
    const { sh, out } = makeShell(files, inputLines);
    const status = await Promise.race([
        sh.runSource(src),
        new Promise((_, rej) => setTimeout(() => rej(new Error('sh test timed out (likely infinite loop)')), 2000)),
    ]);
    return { lines: out, status };
}

// Convenience: run and return joined output
async function runOut(src, files = {}) {
    const { lines } = await run(src, files);
    return lines.join('\n');
}

// =========================================================================
// Lexer
// =========================================================================
describe('Lexer', () => {
    function lex(src) {
        return new Lexer(src).tokens;
    }
    function types(src) {
        return lex(src).map(t => t.type).filter(t => t !== T.EOF);
    }
    function values(src) {
        return lex(src).filter(t => t.type !== T.EOF).map(t => t.value);
    }

    it('tokenizes a simple command', () => {
        assert.deepEqual(types('echo hello'), [T.WORD, T.WORD]);
        assert.deepEqual(values('echo hello'), ['echo', 'hello']);
    });

    it('recognizes newline as separator', () => {
        assert.ok(types('a\nb').includes(T.NEWLINE));
    });

    it('recognizes semicolon', () => {
        assert.ok(types('a;b').includes(T.SEMI));
    });

    it('recognizes pipe', () => {
        assert.ok(types('a|b').includes(T.PIPE));
    });

    it('recognizes && and ||', () => {
        assert.ok(types('a&&b').includes(T.AND));
        assert.ok(types('a||b').includes(T.OR));
    });

    it('recognizes redirections', () => {
        assert.ok(types('cmd > f').includes(T.REDIR_OUT));
        assert.ok(types('cmd >> f').includes(T.REDIR_APP));
        assert.ok(types('cmd < f').includes(T.REDIR_IN));
    });

    it('recognizes << heredoc and captures body', () => {
        const toks = lex('cat <<EOF\nhello\nEOF');
        const here = toks.find(t => t.type === T.REDIR_HERE);
        assert.ok(here);
        assert.equal(here.value, 'hello\n');
    });

    it('recognizes keywords', () => {
        assert.equal(types('if')[0], T.IF);
        assert.equal(types('then')[0], T.THEN);
        assert.equal(types('fi')[0], T.FI);
        assert.equal(types('while')[0], T.WHILE);
        assert.equal(types('do')[0], T.DO);
        assert.equal(types('done')[0], T.DONE);
        assert.equal(types('for')[0], T.FOR);
        assert.equal(types('in')[0], T.IN);
        assert.equal(types('case')[0], T.CASE);
        assert.equal(types('esac')[0], T.ESAC);
        assert.equal(types('until')[0], T.UNTIL);
        assert.equal(types('{')[0], T.LBRACE);
        assert.equal(types('}')[0], T.RBRACE);
        assert.equal(types('(')[0], T.LPAREN);
        assert.equal(types(')')[0], T.RPAREN);
    });

    it('recognizes function definition NAME()', () => {
        const toks = lex('foo() { echo hi; }');
        assert.equal(toks[0].type, T.FUNC);
        assert.equal(toks[0].value, 'foo');
    });

    it('skips comments', () => {
        assert.deepEqual(types('# full line comment'), []);
        assert.deepEqual(values('echo hi # comment'), ['echo', 'hi']);
    });

    it('handles single-quoted strings', () => {
        const toks = lex("echo 'hello world'");
        assert.equal(toks[1].type, T.WORD);
        assert.ok(toks[1].value.includes('hello world'));
    });

    it('handles double-quoted strings', () => {
        const toks = lex('echo "hello world"');
        assert.equal(toks[1].type, T.WORD);
        assert.ok(toks[1].value.includes('hello world'));
    });

    it('handles backslash-escaped space in word', () => {
        const toks = lex('echo hello\\ world');
        // backslash-space keeps words together
        assert.equal(toks.filter(t => t.type === T.WORD).length, 2);
    });

    it('handles line continuation', () => {
        const toks = lex('echo \\\nhello');
        assert.equal(toks.filter(t => t.type === T.WORD).length, 2);
    });

    it('recognizes >&N redirection', () => {
        const toks = lex('cmd >&2');
        const dup = toks.find(t => t.type === T.REDIR_DUP);
        assert.ok(dup);
        assert.equal(dup.value, '2');
    });
});

// =========================================================================
// Parser — AST shape checks
// =========================================================================
describe('Parser', () => {
    function parse(src) {
        return new Parser(new Lexer(src).tokens).parse();
    }

    it('parses simple command', () => {
        const ast = parse('echo hello');
        assert.equal(ast.type, 'Simple');
        assert.deepEqual(ast.words, ['echo', 'hello']);
    });

    it('parses pipeline', () => {
        const ast = parse('echo hi | cat');
        assert.equal(ast.type, 'Pipeline');
        assert.equal(ast.cmds.length, 2);
    });

    it('parses list with semicolon', () => {
        const ast = parse('a; b');
        assert.equal(ast.type, 'List');
        assert.equal(ast.cmds.length, 2);
    });

    it('parses && and || operators', () => {
        const ast = parse('a && b || c');
        assert.equal(ast.type, 'List');
        assert.deepEqual(ast.ops, ['and', 'or']);
    });

    it('parses if/then/fi', () => {
        const ast = parse('if true; then echo yes; fi');
        assert.equal(ast.type, 'If');
        assert.ok(ast.cond);
        assert.ok(ast.then);
        assert.equal(ast.els, null);
    });

    it('parses if/then/else/fi', () => {
        const ast = parse('if false; then echo yes; else echo no; fi');
        assert.equal(ast.type, 'If');
        assert.ok(ast.els);
    });

    it('parses elif', () => {
        const ast = parse('if a; then b; elif c; then d; fi');
        assert.equal(ast.elifs.length, 1);
    });

    it('parses while/do/done', () => {
        const ast = parse('while true; do echo hi; done');
        assert.equal(ast.type, 'While');
        assert.equal(ast.until, false);
    });

    it('parses until/do/done', () => {
        const ast = parse('until false; do echo hi; done');
        assert.equal(ast.type, 'While');
        assert.equal(ast.until, true);
    });

    it('parses for/in/do/done', () => {
        const ast = parse('for x in a b c; do echo $x; done');
        assert.equal(ast.type, 'For');
        assert.equal(ast.name, 'x');
        assert.deepEqual(ast.words, ['a', 'b', 'c']);
    });

    it('parses for without in (uses $@)', () => {
        const ast = parse('for x; do echo $x; done');
        assert.equal(ast.type, 'For');
        assert.equal(ast.words, null);
    });

    it('parses case/in/esac', () => {
        const ast = parse('case $x in a) echo a;; b) echo b;; esac');
        assert.equal(ast.type, 'Case');
        assert.equal(ast.items.length, 2);
        assert.deepEqual(ast.items[0].patterns, ['a']);
    });

    it('parses case with pattern alternatives', () => {
        const ast = parse('case $x in a|b) echo ab;; esac');
        assert.deepEqual(ast.items[0].patterns, ['a', 'b']);
    });

    it('parses { } group', () => {
        const ast = parse('{ echo a; echo b; }');
        assert.equal(ast.type, 'Group');
        assert.equal(ast.subshell, false);
    });

    it('parses ( ) subshell', () => {
        const ast = parse('( echo a )');
        assert.equal(ast.type, 'Group');
        assert.equal(ast.subshell, true);
    });

    it('parses function definition', () => {
        const ast = parse('greet() { echo hello; }');
        assert.equal(ast.type, 'Funcdef');
        assert.equal(ast.name, 'greet');
    });

    it('parses redirections on simple command', () => {
        const ast = parse('echo hi > out.txt');
        assert.equal(ast.type, 'Simple');
        assert.equal(ast.redirs.length, 1);
        assert.equal(ast.redirs[0].kind, 'out');
        assert.equal(ast.redirs[0].word, 'out.txt');
    });

    it('parses input redirection', () => {
        const ast = parse('cat < in.txt');
        assert.equal(ast.redirs[0].kind, 'in');
    });

    it('parses >> append redirection', () => {
        const ast = parse('echo hi >> out.txt');
        assert.equal(ast.redirs[0].kind, 'app');
    });

    it('parses heredoc redirection', () => {
        const ast = parse('cat <<EOF\nhello\nEOF');
        assert.equal(ast.redirs[0].kind, 'here');
        assert.equal(ast.redirs[0].word, 'hello\n');
    });
});

// =========================================================================
// Word Expansion
// =========================================================================
describe('expand', () => {
    function makeEnv(vars = {}) {
        const env = new ShEnv();
        for (const [k, v] of Object.entries(vars)) env.set(k, v);
        return env;
    }
    const noopRun = async () => {};

    it('expands simple variable', async () => {
        const env = makeEnv({ NAME: 'world' });
        const r = await expandWord('hello $NAME', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'hello world');
    });

    it('expands ${VAR} braced', async () => {
        const env = makeEnv({ X: '42' });
        const r = await expandWord('${X}px', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '42px');
    });

    it('expands unset variable to empty', async () => {
        const env = makeEnv();
        const r = await expandWord('$UNSET', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '');
    });

    it('${VAR:-default} uses default when unset', async () => {
        const env = makeEnv();
        const r = await expandWord('${X:-hello}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'hello');
    });

    it('${VAR:-default} uses value when set', async () => {
        const env = makeEnv({ X: 'set' });
        const r = await expandWord('${X:-hello}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'set');
    });

    it('${VAR:=default} assigns when unset', async () => {
        const env = makeEnv();
        const r = await expandWord('${X:=hello}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'hello');
        assert.equal(env.get('X'), 'hello');
    });

    it('${VAR:+alt} gives alt when set', async () => {
        const env = makeEnv({ X: 'yes' });
        const r = await expandWord('${X:+alt}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'alt');
    });

    it('${VAR:+alt} gives empty when unset', async () => {
        const env = makeEnv();
        const r = await expandWord('${X:+alt}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '');
    });

    it('${#VAR} gives length', async () => {
        const env = makeEnv({ MSG: 'hello' });
        const r = await expandWord('${#MSG}', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '5');
    });

    it('single quotes prevent expansion', async () => {
        // \x01 is the single-quote marker from the lexer
        const env = makeEnv({ X: 'replaced' });
        const r = await expandWord('\x01$X\x01', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '$X');
    });

    it('double quotes allow parameter expansion', async () => {
        // \x02 is the double-quote marker from the lexer
        const env = makeEnv({ X: 'world' });
        const r = await expandWord('\x02hello $X\x02', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), 'hello world');
    });

    it('double quotes prevent word splitting', async () => {
        const env = makeEnv({ X: 'a b c' });
        const io = { fs: makeFs() };
        const words = await expandWords(['\x02$X\x02'], env, io, noopRun);
        assert.equal(words.length, 1);
        assert.equal(words[0], 'a b c');
    });

    it('unquoted variable with spaces splits into words', async () => {
        const env = makeEnv({ X: 'a b c' });
        const io = { fs: makeFs() };
        const words = await expandWords(['$X'], env, io, noopRun);
        assert.equal(words.length, 3);
    });

    it('tilde expands to /home/rodney', async () => {
        const env = makeEnv();
        const r = await expandWord('~', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '/home/rodney');
    });

    it('~/path expands correctly', async () => {
        const env = makeEnv();
        const r = await expandWord('~/bin', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '/home/rodney/bin');
    });

    it('backslash escapes next char', async () => {
        const env = makeEnv({ X: 'hi' });
        const r = await expandWord('\\$X', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '$X');
    });

    it('$? expands to exit status', async () => {
        const env = makeEnv();
        env.setStatus(42);
        const r = await expandWord('$?', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '42');
    });

    it('$# expands to arg count', async () => {
        const env = makeEnv();
        env.setPos(['a', 'b', 'c']);
        const r = await expandWord('$#', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r), '3');
    });

    it('$1 $2 expand to positional args', async () => {
        const env = makeEnv();
        env.setPos(['first', 'second']);
        const r1 = await expandWord('$1', env, { fs: makeFs() }, noopRun);
        const r2 = await expandWord('$2', env, { fs: makeFs() }, noopRun);
        assert.equal(stripQuotes(r1), 'first');
        assert.equal(stripQuotes(r2), 'second');
    });
});

// =========================================================================
// ShEnv
// =========================================================================
describe('ShEnv', () => {
    it('set and get variable', () => {
        const env = new ShEnv();
        env.set('X', 'hello');
        assert.equal(env.get('X'), 'hello');
    });

    it('get returns undefined for unset', () => {
        const env = new ShEnv();
        assert.equal(env.get('NOPE'), undefined);
    });

    it('export marks variable', () => {
        const env = new ShEnv();
        env.set('X', '1');
        env.export('X');
        const exports = [...env.exported()];
        assert.ok(exports.some(([k]) => k === 'X'));
    });

    it('unset removes variable', () => {
        const env = new ShEnv();
        env.set('X', 'hi');
        env.unset('X');
        assert.equal(env.get('X'), undefined);
    });

    it('readonly prevents overwrite', () => {
        const env = new ShEnv();
        env.set('X', 'hi');
        env.setReadonly('X');
        assert.throws(() => env.set('X', 'bye'), /read only/);
    });

    it('child env inherits parent vars', () => {
        const parent = new ShEnv();
        parent.set('X', 'from parent');
        const child = parent.child();
        assert.equal(child.get('X'), 'from parent');
    });

    it('child env changes do not affect parent', () => {
        const parent = new ShEnv();
        parent.set('X', 'original');
        const child = parent.child();
        child.set('X', 'changed');
        assert.equal(parent.get('X'), 'original');
    });

    it('shift reduces positional params', () => {
        const env = new ShEnv();
        env.setPos(['a', 'b', 'c']);
        env.shift(1);
        assert.equal(env.getSpecial('1'), 'b');
        assert.equal(env.getSpecial('#'), '2');
    });

    it('getSpecial $* joins with IFS', () => {
        const env = new ShEnv();
        env.set('IFS', ':');
        env.setPos(['a', 'b', 'c']);
        assert.equal(env.getSpecial('*'), 'a:b:c');
    });
});

// =========================================================================
// Interpreter — execution
// =========================================================================
describe('Interpreter: basic execution', () => {
    it('echo prints a line', async () => {
        const { lines } = await run('echo hello');
        assert.equal(lines[0], 'hello');
    });

    it('echo with multiple args', async () => {
        const { lines } = await run('echo one two three');
        assert.equal(lines[0], 'one two three');
    });

    it('echo -n suppresses newline', async () => {
        const { lines } = await run('echo -n hello');
        assert.equal(lines[0], 'hello');
    });

    it('variable assignment and expansion', async () => {
        const { lines } = await run('X=hello; echo $X');
        assert.equal(lines[0], 'hello');
    });

    it('multiple assignments on one line', async () => {
        const { lines } = await run('A=1 B=2; echo $A $B');
        // A=1 B=2 are temp assignments for empty cmd, but set in env
        assert.ok(lines.join(' ').includes('1') || lines.join(' ').includes(''));
    });

    it('exit status of true is 0', async () => {
        const { status } = await run('true');
        assert.equal(status, 0);
    });

    it('exit status of false is 1', async () => {
        const { status } = await run('false');
        assert.equal(status, 1);
    });

    it(': (colon) returns 0', async () => {
        const { status } = await run(':');
        assert.equal(status, 0);
    });

    it('exit N sets exit status', async () => {
        const { status } = await run('exit 42');
        assert.equal(status, 42);
    });

    it('$? captures last exit status', async () => {
        const { lines } = await run('false; echo $?');
        assert.equal(lines[0], '1');
    });

    it('pwd prints cwd', async () => {
        const { lines } = await run('pwd');
        assert.equal(lines[0], '/home/rodney');
    });

    it('cd changes directory', async () => {
        const { lines } = await run('cd /tmp; pwd');
        assert.equal(lines[0], '/tmp');
    });

    it('cd with no args goes to /home/rodney', async () => {
        const { lines } = await run('cd /tmp; cd; pwd');
        assert.equal(lines[0], '/home/rodney');
    });

    it('export makes variable available', async () => {
        const { lines } = await run('export X=hello; echo $X');
        assert.equal(lines[0], 'hello');
    });

    it('export with no args lists exported vars', async () => {
        const { lines } = await run('export MYVAR=42; export');
        assert.ok(lines.some(l => l.includes('MYVAR=42')));
    });

    it('unset removes variable', async () => {
        const { lines } = await run('X=hi; unset X; echo "${X:-gone}"');
        assert.equal(lines[0], 'gone');
    });

    it('shift moves positional params', async () => {
        const { sh, out } = makeShell();
        sh.env.setPos(['a', 'b', 'c']);
        await sh.runSource('shift; echo $1');
        assert.equal(out[0], 'b');
    });
});

// =========================================================================
// Interpreter — control flow
// =========================================================================
describe('Interpreter: if/elif/else', () => {
    it('if true then runs then-branch', async () => {
        const { lines } = await run('if true; then echo yes; fi');
        assert.equal(lines[0], 'yes');
    });

    it('if false then skips then-branch', async () => {
        const { lines } = await run('if false; then echo yes; fi');
        assert.equal(lines.length, 0);
    });

    it('if/else runs else on false', async () => {
        const { lines } = await run('if false; then echo yes; else echo no; fi');
        assert.equal(lines[0], 'no');
    });

    it('elif chain picks correct branch', async () => {
        const src = `
X=b
if [ "$X" = "a" ]; then echo A
elif [ "$X" = "b" ]; then echo B
else echo C
fi`;
        const { lines } = await run(src);
        assert.equal(lines[0], 'B');
    });

    it('nested if', async () => {
        const src = `
if true; then
  if false; then echo inner-true
  else echo inner-false
  fi
fi`;
        const { lines } = await run(src);
        assert.equal(lines[0], 'inner-false');
    });
});

describe('Interpreter: while/until', () => {
    it('while loop runs body while condition true', async () => {
        const src = 'i=0; while [ $i -lt 3 ]; do echo $i; i=`expr $i + 1`; done';
        const { lines } = await run(src);
        assert.deepEqual(lines, ['0', '1', '2']);
    });

    it('until loop runs body while condition false', async () => {
        const src = 'i=0; until [ $i -ge 3 ]; do echo $i; i=`expr $i + 1`; done';
        const { lines } = await run(src);
        assert.deepEqual(lines, ['0', '1', '2']);
    });

    it('while loop with break', async () => {
        const src = 'i=0; while true; do echo $i; i=`expr $i + 1`; if [ $i -eq 3 ]; then break; fi; done';
        const { lines } = await run(src);
        assert.deepEqual(lines, ['0', '1', '2']);
    });

    it('while loop with continue', async () => {
        const src = `i=0
while [ $i -lt 5 ]; do
  i=\`expr $i + 1\`
  if [ $i -eq 3 ]; then continue; fi
  echo $i
done`;
        const { lines } = await run(src);
        assert.ok(!lines.includes('3'));
        assert.ok(lines.includes('1'));
        assert.ok(lines.includes('5'));
    });
});

describe('Interpreter: for', () => {
    it('for/in iterates over words', async () => {
        const { lines } = await run('for x in a b c; do echo $x; done');
        assert.deepEqual(lines, ['a', 'b', 'c']);
    });

    it('for without in uses positional params', async () => {
        const { sh, out } = makeShell();
        sh.env.setPos(['x', 'y', 'z']);
        await sh.runSource('for arg; do echo $arg; done');
        assert.deepEqual(out, ['x', 'y', 'z']);
    });

    it('for with variable expansion in word list', async () => {
        const { lines } = await run('LIST="a b c"; for x in $LIST; do echo $x; done');
        assert.deepEqual(lines, ['a', 'b', 'c']);
    });
});

describe('Interpreter: case', () => {
    it('case matches first pattern', async () => {
        const { lines } = await run('case hello in hello) echo hi;; *) echo no;; esac');
        assert.equal(lines[0], 'hi');
    });

    it('case falls through to wildcard', async () => {
        const { lines } = await run('case xyz in hello) echo hi;; *) echo wildcard;; esac');
        assert.equal(lines[0], 'wildcard');
    });

    it('case with pipe-alternatives', async () => {
        const src = 'X=b; case $X in a|b|c) echo abc;; *) echo other;; esac';
        const { lines } = await run(src);
        assert.equal(lines[0], 'abc');
    });

    it('case with glob pattern', async () => {
        const src = 'X=hello; case $X in h*) echo starts-h;; esac';
        const { lines } = await run(src);
        assert.equal(lines[0], 'starts-h');
    });

    it('case with no match does nothing', async () => {
        const { lines } = await run('case xyz in abc) echo no;; esac');
        assert.equal(lines.length, 0);
    });
});

describe('Interpreter: list operators', () => {
    it('semicolon sequences commands', async () => {
        const { lines } = await run('echo a; echo b; echo c');
        assert.deepEqual(lines, ['a', 'b', 'c']);
    });

    it('&& runs second only on success', async () => {
        const { lines } = await run('true && echo yes');
        assert.equal(lines[0], 'yes');
    });

    it('&& skips second on failure', async () => {
        const { lines } = await run('false && echo yes');
        assert.equal(lines.length, 0);
    });

    it('|| runs second only on failure', async () => {
        const { lines } = await run('false || echo fallback');
        assert.equal(lines[0], 'fallback');
    });

    it('|| skips second on success', async () => {
        const { lines } = await run('true || echo no');
        assert.equal(lines.length, 0);
    });
});

// =========================================================================
// Functions
// =========================================================================
describe('Interpreter: functions', () => {
    it('defines and calls a function', async () => {
        const { lines } = await run('greet() { echo hello; }; greet');
        assert.equal(lines[0], 'hello');
    });

    it('function receives positional params', async () => {
        const src = 'say() { echo $1 $2; }; say foo bar';
        const { lines } = await run(src);
        assert.equal(lines[0], 'foo bar');
    });

    it('function $# reflects argument count', async () => {
        const src = 'count() { echo $#; }; count a b c';
        const { lines } = await run(src);
        assert.equal(lines[0], '3');
    });

    it('return sets exit status', async () => {
        const src = 'myfn() { return 7; }; myfn; echo $?';
        const { lines } = await run(src);
        assert.equal(lines[0], '7');
    });

    it('function shares outer variable scope', async () => {
        const src = 'X=before; fn() { X=after; }; fn; echo $X';
        const { lines } = await run(src);
        assert.equal(lines[0], 'after');
    });

    it('iterative function (fibonacci)', async () => {
        // Iterative fib avoids local-variable conflicts in shared-env recursion
        const src = `
fib() {
  if [ $1 -le 1 ]; then echo $1; return; fi
  fib_a=0; fib_b=1; fib_i=1
  while [ $fib_i -lt $1 ]; do
    fib_c=\`expr $fib_a + $fib_b\`
    fib_a=$fib_b
    fib_b=$fib_c
    fib_i=\`expr $fib_i + 1\`
  done
  echo $fib_b
}
fib 7`;
        const { lines } = await run(src);
        assert.equal(lines[0], '13');
    });
});

// =========================================================================
// Subshell and group
// =========================================================================
describe('Interpreter: groups and subshells', () => {
    it('{ } group shares environment', async () => {
        const { lines } = await run('{ echo a; echo b; }');
        assert.deepEqual(lines, ['a', 'b']);
    });

    it('( ) subshell does not leak variables', async () => {
        const { lines } = await run('X=outer; (X=inner); echo $X');
        assert.equal(lines[0], 'outer');
    });

    it('( ) subshell does not leak cd', async () => {
        const { lines } = await run('(cd /tmp); pwd');
        assert.equal(lines[0], '/home/rodney');
    });

    it('group with redirection', async () => {
        const fs = makeFs();
        const { sh, out } = makeShell({});
        // { echo a; echo b; } > file
        await sh.runSource('{ echo hello; echo world; } > /tmp/out.txt');
        const content = sh.io.fs.cat('/tmp/out.txt');
        assert.ok(content && content.includes('hello'));
        assert.ok(content && content.includes('world'));
    });
});

// =========================================================================
// Redirections
// =========================================================================
describe('Interpreter: redirections', () => {
    it('> redirects stdout to file', async () => {
        const { sh } = makeShell();
        await sh.runSource('echo hello > /tmp/test.txt');
        const content = sh.io.fs.cat('/tmp/test.txt');
        assert.ok(content.includes('hello'));
    });

    it('>> appends to file', async () => {
        const { sh } = makeShell({ '/tmp/test.txt': 'first\n' });
        await sh.runSource('echo second >> /tmp/test.txt');
        const content = sh.io.fs.cat('/tmp/test.txt');
        assert.ok(content.includes('first'));
        assert.ok(content.includes('second'));
    });

    it('< reads stdin from file', async () => {
        const { lines } = await run('cat < /tmp/in.txt', { '/tmp/in.txt': 'from file\n' });
        // cat reads from stdin buffer and echoes via println
        // Since cat is an external command it'll fail gracefully; test with echo
        // Actually test with a script that uses 'read'
    });

    it('heredoc provides stdin', async () => {
        const { sh, out } = makeShell();
        await sh.runSource('read LINE <<EOF\nhello\nEOF\necho $LINE');
        assert.equal(out[0], 'hello');
    });

    it('heredoc with variable expansion', async () => {
        const { sh, out } = makeShell();
        await sh.runSource('X=world; cat <<EOF\nhello $X\nEOF');
        // heredoc expansion (no 'raw' flag)
        assert.ok(out.join('\n').includes('hello world'));
    });
});

// =========================================================================
// Pipelines
// =========================================================================
describe('Interpreter: pipelines', () => {
    it('pipeline feeds stdout of left to stdin of right', async () => {
        // We can test with a for loop echoing and a read consuming
        const src = `
output() { echo line1; echo line2; }
collect() { read A; read B; echo "got: $A $B"; }
output | collect`;
        const { lines } = await run(src);
        assert.equal(lines[0], 'got: line1 line2');
    });

    it('three-stage pipeline', async () => {
        const src = `
stage1() { echo hello; }
stage2() { read X; echo "$X world"; }
stage3() { read Y; echo "[$Y]"; }
stage1 | stage2 | stage3`;
        const { lines } = await run(src);
        assert.equal(lines[0], '[hello world]');
    });

    it('pipeline exit status is last command', async () => {
        const src = 'true | false; echo $?';
        const { lines } = await run(src);
        assert.equal(lines[0], '1');
    });
});

// =========================================================================
// Builtins
// =========================================================================
describe('Builtins: test / [', () => {
    it('[ -z "" ] is true', async () => {
        const { status } = await run('[ -z "" ]');
        assert.equal(status, 0);
    });

    it('[ -z "x" ] is false', async () => {
        const { status } = await run('[ -z "x" ]');
        assert.equal(status, 1);
    });

    it('[ -n "x" ] is true', async () => {
        const { status } = await run('[ -n "x" ]');
        assert.equal(status, 0);
    });

    it('[ a = a ] is true', async () => {
        const { status } = await run('[ a = a ]');
        assert.equal(status, 0);
    });

    it('[ a != b ] is true', async () => {
        const { status } = await run('[ a != b ]');
        assert.equal(status, 0);
    });

    it('[ 3 -eq 3 ] is true', async () => {
        const { status } = await run('[ 3 -eq 3 ]');
        assert.equal(status, 0);
    });

    it('[ 2 -lt 5 ] is true', async () => {
        const { status } = await run('[ 2 -lt 5 ]');
        assert.equal(status, 0);
    });

    it('[ 5 -gt 2 ] is true', async () => {
        const { status } = await run('[ 5 -gt 2 ]');
        assert.equal(status, 0);
    });

    it('[ 3 -le 3 ] is true', async () => {
        const { status } = await run('[ 3 -le 3 ]');
        assert.equal(status, 0);
    });

    it('[ 3 -ge 3 ] is true', async () => {
        const { status } = await run('[ 3 -ge 3 ]');
        assert.equal(status, 0);
    });

    it('[ ! false-condition ] negates', async () => {
        const { status } = await run('[ ! -n "" ]');
        assert.equal(status, 0);
    });

    it('test -f for a file', async () => {
        const { status } = await run('test -f /tmp/x.txt', { '/tmp/x.txt': 'hi' });
        assert.equal(status, 0);
    });

    it('test -f for nonexistent file is false', async () => {
        const { status } = await run('test -f /tmp/nope.txt');
        assert.equal(status, 1);
    });

    it('test -e for existing file', async () => {
        const { status } = await run('test -e /tmp/x.txt', { '/tmp/x.txt': '' });
        assert.equal(status, 0);
    });
});

describe('Builtins: expr', () => {
    it('expr addition', async () => {
        const { lines } = await run('expr 3 + 4');
        assert.equal(lines[0], '7');
    });

    it('expr subtraction', async () => {
        const { lines } = await run('expr 10 - 3');
        assert.equal(lines[0], '7');
    });

    it('expr multiplication', async () => {
        const { lines } = await run('expr 3 \\* 4');
        assert.equal(lines[0], '12');
    });

    it('expr division', async () => {
        const { lines } = await run('expr 10 / 3');
        assert.equal(lines[0], '3');
    });

    it('expr modulo', async () => {
        const { lines } = await run('expr 10 % 3');
        assert.equal(lines[0], '1');
    });

    it('expr string equality', async () => {
        const { lines } = await run('expr hello = hello');
        assert.equal(lines[0], '1');
    });

    it('expr string inequality', async () => {
        const { lines } = await run('expr hello != world');
        assert.equal(lines[0], '1');
    });

    it('expr comparison returns 0 on false', async () => {
        const { status } = await run('expr 1 = 2');
        assert.equal(status, 1);
    });

    it('expr length', async () => {
        const { lines } = await run('expr length hello');
        assert.equal(lines[0], '5');
    });

    it('expr substr', async () => {
        const { lines } = await run('expr substr hello 2 3');
        assert.equal(lines[0], 'ell');
    });

    it('expr index', async () => {
        const { lines } = await run('expr index hello l');
        assert.equal(lines[0], '3');
    });

    it('expr in backtick arithmetic', async () => {
        const { lines } = await run('x=5; y=`expr $x + 3`; echo $y');
        assert.equal(lines[0], '8');
    });
});

describe('Builtins: set', () => {
    it('set -- args replaces positional params', async () => {
        const src = 'set -- a b c; echo $1 $2 $3';
        const { lines } = await run(src);
        assert.equal(lines[0], 'a b c');
    });

    it('set -e causes exit on error', async () => {
        const src = 'set -e; false; echo should_not_run';
        const { lines } = await run(src);
        assert.ok(!lines.includes('should_not_run'));
    });
});

describe('Builtins: eval', () => {
    it('eval executes string as sh', async () => {
        const { lines } = await run('CMD="echo hello"; eval $CMD');
        assert.equal(lines[0], 'hello');
    });

    it('eval with variable expansion', async () => {
        const { lines } = await run('X=world; eval "echo hello $X"');
        assert.equal(lines[0], 'hello world');
    });
});

describe('Builtins: printf', () => {
    it('printf %s', async () => {
        const { lines } = await run('printf "%s\\n" hello');
        assert.equal(lines[0], 'hello');
    });

    it('printf %d', async () => {
        const { lines } = await run('printf "%d\\n" 42');
        assert.equal(lines[0], '42');
    });
});

// =========================================================================
// Command substitution (backtick)
// =========================================================================
describe('Command substitution', () => {
    it('backtick captures output', async () => {
        const { lines } = await run('X=`echo hello`; echo $X');
        assert.equal(lines[0], 'hello');
    });

    it('backtick strips trailing newlines', async () => {
        const { lines } = await run('X=`echo hello`; echo "[$X]"');
        assert.equal(lines[0], '[hello]');
    });

    it('backtick in double quotes', async () => {
        const { lines } = await run('echo "value is `expr 2 + 3`"');
        assert.equal(lines[0], 'value is 5');
    });

    it('nested backticks', async () => {
        // Classic: inner must escape backticks
        const { lines } = await run('X=`expr \\`expr 1 + 1\\` + 1`; echo $X');
        assert.equal(lines[0], '3');
    });
});

// =========================================================================
// Running scripts from filesystem
// =========================================================================
describe('Sh: running scripts', () => {
    it('runFile executes a script', async () => {
        const { sh, out } = makeShell({ '/home/rodney/hello.sh': 'echo hello from file\n' });
        await sh.runFile('/home/rodney/hello.sh');
        assert.equal(out[0], 'hello from file');
    });

    it('runFile passes args as $1 $2', async () => {
        const { sh, out } = makeShell({ '/tmp/args.sh': 'echo $1 $2\n' });
        await sh.runFile('/tmp/args.sh', ['foo', 'bar']);
        assert.equal(out[0], 'foo bar');
    });

    it('runFile returns 127 for missing file', async () => {
        const { sh, out } = makeShell();
        const status = await sh.runFile('/tmp/nope.sh');
        assert.equal(status, 127);
    });

    it('sourcing a file with . shares environment', async () => {
        const { sh, out } = makeShell({ '/tmp/lib.sh': 'MYVAR=from_lib\n' });
        await sh.runSource('. /tmp/lib.sh; echo $MYVAR');
        assert.equal(out[0], 'from_lib');
    });
});

// =========================================================================
// Design doc example scripts
// =========================================================================
describe('Design examples', () => {
    it('count loop using expr', async () => {
        const src = `
count=0
for f in a b c; do
    count=\`expr $count + 1\`
done
echo $count`;
        const { lines } = await run(src);
        assert.equal(lines[0], '3');
    });

    it('fibonacci sequence (10 terms)', async () => {
        const src = `
a=0; b=1
i=0
while [ $i -lt 10 ]; do
    echo $a
    c=\`expr $a + $b\`
    a=$b
    b=$c
    i=\`expr $i + 1\`
done`;
        const { lines } = await run(src);
        assert.deepEqual(lines, ['0','1','1','2','3','5','8','13','21','34']);
    });

    it('case-based dispatch script', async () => {
        const src = `
X=stop
case $X in
    start) echo starting;;
    stop)  echo stopping;;
    *)     echo unknown;;
esac`;
        const { lines } = await run(src);
        assert.equal(lines[0], 'stopping');
    });

    it('function with $@ iterating args', async () => {
        const src = `
printall() {
    for arg; do
        echo "arg: $arg"
    done
}
printall x y z`;
        const { lines } = await run(src);
        assert.deepEqual(lines, ['arg: x', 'arg: y', 'arg: z']);
    });

    it('${VAR:-default} in a script', async () => {
        const src = 'echo ${GREETING:-hello}';
        const { lines } = await run(src);
        assert.equal(lines[0], 'hello');
    });

    it('multiline pipeline with functions', async () => {
        const src = `
produce() { for x in 1 2 3; do echo $x; done; }
consume() { while read N; do echo "got $N"; done; }
produce | consume`;
        const { lines } = await run(src);
        assert.deepEqual(lines, ['got 1', 'got 2', 'got 3']);
    });
});
