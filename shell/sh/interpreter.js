// interpreter.js -- AST executor for the 1982 sh subset.

import { expandWords, expandWord, stripQuotes, ShError } from './expand.js';
import { BUILTINS } from './builtins.js';

// Sentinel exceptions for control flow
class BreakSignal    { constructor(n=1){this.n=n;} }
class ContinueSignal { constructor(n=1){this.n=n;} }
class ReturnSignal   { constructor(v=0){this.value=v;} }
export class ExitSignal { constructor(v=0){this.value=v;} }

// ShAction: thrown by builtins that need to signal the shell loop
// (e.g., game launches, vi, exit-to-parent).
// action is the same object Shell._execute returns: { action, game?, file?, ... }
export class ShAction { constructor(action){this.action=action;} }

// ---- ShEnv: variable environment ----------------------------------------

export class ShEnv {
  constructor(parent = null) {
    this._vars = new Map();   // name → {value, exported, readonly}
    this._funcs = new Map();  // name → AST node
    this._pos = [];           // positional params ($1..$N)
    this._pos0 = 'sh';       // $0
    this._status = 0;         // $?
    this._opts = new Set();   // -e, -u, -x, -v, -f, -n
    this._parent = parent;
  }

  get(name) {
    const e = this._vars.get(name);
    if (e !== undefined) return e.value;
    if (this._parent) return this._parent.get(name);
    return undefined;
  }

  getSpecial(ch) {
    if (ch === '?') return String(this._status);
    if (ch === '$') return '1234'; // fake PID
    if (ch === '!') return '';
    if (ch === '-') return [...this._opts].join('');
    if (ch === '#') return String(this._pos.length);
    if (ch === '0') return this._pos0;
    if (ch === '@') return this._pos.join(' '); // unquoted $@ splits like $*
    if (ch === '*') return this._pos.join((this.get('IFS') || ' ')[0] || ' ');
    const n = parseInt(ch);
    if (!isNaN(n)) return this._pos[n - 1] || '';
    return '';
  }

  set(name, value) {
    const e = this._vars.get(name);
    if (e && e.readonly) throw new ShError(`${name}: is read only`);
    this._vars.set(name, { ...(e || {}), value: String(value === undefined ? '' : value) });
  }

  export(name) {
    const e = this._vars.get(name) || { value: '' };
    this._vars.set(name, { ...e, exported: true });
  }

  setReadonly(name) {
    const e = this._vars.get(name) || { value: '' };
    this._vars.set(name, { ...e, readonly: true });
  }

  unset(name) {
    this._vars.delete(name);
    this._funcs.delete(name);
  }

  *exported() {
    for (const [k, v] of this._vars) if (v.exported) yield [k, v.value];
  }

  setFunc(name, node) { this._funcs.set(name, node); }
  getFunc(name)       { return this._funcs.get(name) || (this._parent && this._parent.getFunc(name)); }

  setPos(args, name = null) {
    this._pos = args.map(String);
    if (name !== null) this._pos0 = name;
  }

  shift(n = 1) { this._pos = this._pos.slice(n); }

  setStatus(s) { this._status = s; }
  getStatus()  { return this._status; }

  hasOpt(o) { return this._opts.has(o); }
  setOpt(o, v) { if (v) this._opts.add(o); else this._opts.delete(o); }

  // Create a child env (for subshell / function call)
  child() {
    const c = new ShEnv(this);
    c._pos0 = this._pos0;
    c._pos = [...this._pos];
    c._status = this._status;
    c._opts = new Set(this._opts);
    c._funcs = this._funcs; // functions are shared (not cloned)
    return c;
  }
}

// ---- Interpreter --------------------------------------------------------

export class Interpreter {
  constructor(env, io) {
    this.env = env;
    this.io = io;           // { println, print, getch, fs, shell, stdin? }
    this.builtins = { ...BUILTINS };
  }

  // Run a parsed AST node. Returns exit status (integer).
  async run(node) {
    try {
      return await this._exec(node, this.env, this.io);
    } catch (e) {
      if (e instanceof ExitSignal) return e.value;
      if (e instanceof ShError) { this.io.println(`sh: ${e.message}`); return 1; }
      throw e;
    }
  }

  async _exec(node, env, io) {
    if (!node) return 0;
    switch (node.type) {
      case 'Noop':     return 0;
      case 'List':     return this._execList(node, env, io);
      case 'Pipeline': return this._execPipeline(node, env, io);
      case 'Simple':   return this._execSimple(node, env, io);
      case 'If':       return this._execIf(node, env, io);
      case 'While':    return this._execWhile(node, env, io);
      case 'For':      return this._execFor(node, env, io);
      case 'Case':     return this._execCase(node, env, io);
      case 'Group':    return this._execGroup(node, env, io);
      case 'Funcdef':  env.setFunc(node.name, node.body); return 0;
      default:         return 0;
    }
  }

  async _execList(node, env, io) {
    let status = 0;
    for (let i = 0; i < node.cmds.length; i++) {
      const op = node.ops[i - 1] || 'next';
      if (op === 'and' && status !== 0) continue;
      if (op === 'or'  && status === 0) continue;
      status = await this._exec(node.cmds[i], env, io);
      env.setStatus(status);
      if (env.hasOpt('e') && status !== 0) throw new ExitSignal(status);
    }
    return status;
  }

  async _execPipeline(node, env, io) {
    if (node.cmds.length === 1) return this._exec(node.cmds[0], env, io);
    // Collect output of each stage into buffer, feed as stdin to next.
    let stdin = io.stdin || '';
    let status = 0;
    for (let i = 0; i < node.cmds.length; i++) {
      let captured = '';
      const isLast = i === node.cmds.length - 1;
      const stageIo = {
        ...io,
        stdin,
        // non-last stages capture stdout into buffer
        println: isLast ? io.println : (t) => { captured += t + '\n'; },
        print:   isLast ? io.print   : (t) => { captured += t; },
      };
      status = await this._exec(node.cmds[i], env, stageIo);
      stdin = captured;
    }
    return status;
  }

  async _execSimple(node, env, io) {
    // Check for background marker
    if (node.words.some(w => w && w._bg)) {
      io.println('sh: background jobs not supported');
      return 1;
    }

    // Check for bare variable assignment(s): NAME=value [NAME=value ...] [cmd]
    let assignEnd = 0;
    for (let i = 0; i < node.words.length; i++) {
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(node.words[i])) assignEnd = i + 1;
      else break;
    }

    const assignments = node.words.slice(0, assignEnd);
    const cmdWords = node.words.slice(assignEnd);

    // Apply redirections to get effective io
    const { io: effIo, cleanup } = await this._applyRedirs(node.redirs || [], env, io);

    let status = 0;
    try {
      if (cmdWords.length === 0) {
        // Pure assignment — expand RHS (backtick, $VAR, etc.)
        for (const a of assignments) {
          const eq = a.indexOf('=');
          const k = a.slice(0, eq);
          const rawVal = a.slice(eq + 1);
          const val = stripQuotes(await expandWord(rawVal, env, effIo, this._captureRun.bind(this)));
          env.set(k, val);
        }
        return 0;
      }

      // Expand words
      const expanded = await expandWords(cmdWords, env, effIo, this._captureRun.bind(this));
      if (expanded.length === 0) return 0;

      const [cmd, ...args] = expanded;

      // Apply temporary assignments for command
      const savedVars = {};
      for (const a of assignments) {
        const eq = a.indexOf('=');
        const k = a.slice(0, eq);
        savedVars[k] = env.get(k);
        env.set(k, stripQuotes(await expandWord(a.slice(eq + 1), env, effIo, this._captureRun.bind(this))));
      }

      status = await this._invoke(cmd, args, env, effIo);

      // Restore temporary assignments
      for (const [k, v] of Object.entries(savedVars)) {
        if (v === undefined) env.unset(k);
        else env.set(k, v);
      }

      if (env.hasOpt('x')) io.println(`+ ${[cmd, ...args].join(' ')}`);
    } finally {
      cleanup();
    }

    env.setStatus(status);
    return status;
  }

  _assign(raw, env) {
    const eq = raw.indexOf('=');
    if (eq === -1) return;
    env.set(raw.slice(0, eq), raw.slice(eq + 1));
  }

  async _invoke(cmd, args, env, io) {
    // 1. Shell builtin?
    if (this.builtins[cmd]) {
      return this.builtins[cmd](args, env, io, this) ?? 0;
    }

    // 2. Shell special builtins handled inline
    if (cmd === 'exit')   throw new ExitSignal(args[0] !== undefined ? parseInt(args[0]) : env.getStatus());
    if (cmd === 'return') throw new ReturnSignal(args[0] !== undefined ? parseInt(args[0]) : env.getStatus());
    if (cmd === 'break')  throw new BreakSignal(parseInt(args[0] || '1'));
    if (cmd === 'continue') throw new ContinueSignal(parseInt(args[0] || '1'));

    if (cmd === 'set')    return this._builtinSet(args, env, io);
    if (cmd === 'eval')   return this._builtinEval(args, env, io);
    if (cmd === 'exec')   return this._builtinExec(args, env, io);
    if (cmd === '.')      return this._builtinDot(args, env, io);

    // 3. Shell function?
    const fn = env.getFunc(cmd);
    if (fn) return this._callFunc(fn, cmd, args, env, io);

    // 4. External command — look up in filesystem or delegate to shell commands
    return this._external(cmd, args, env, io);
  }

  async _callFunc(node, name, args, env, io) {
    const saved = [...env._pos];
    const saved0 = env._pos0;
    env.setPos(args, name);
    let status = 0;
    try {
      status = await this._exec(node, env, io);
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    } finally {
      env._pos = saved;
      env._pos0 = saved0;
    }
    return status;
  }

  async _external(cmd, args, env, io) {
    const fs = io.fs;
    // Resolve command: check if it's a path or needs PATH search
    let path = cmd;
    if (!cmd.includes('/')) {
      // Simple PATH-like search: check /bin, /usr/bin, /usr/games
      const searchDirs = (env.get('PATH') || '/bin:/usr/games:/usr/local/bin').split(':');
      for (const dir of searchDirs) {
        const candidate = dir.replace(/\/$/, '') + '/' + cmd;
        try {
          const node = fs.getNode ? fs.getNode(fs.resolve(candidate)) : null;
          if (node) { path = candidate; break; }
        } catch {}
      }
    }

    try {
      const resolved = fs.resolve(path);
      // Check if it's a game executable
      const gameName = fs.getGame ? fs.getGame(resolved) : null;
      if (gameName) {
        if (io.shell && typeof io.shell.launch === 'function') {
          return await io.shell.launch(gameName, args, env, io);
        }
        io.println(`sh: ${cmd}: cannot launch game from this context`);
        return 126;
      }

      // Read and execute as shell script
      const content = fs.cat(resolved);
      if (content === null) { io.println(`sh: ${cmd}: not found`); return 127; }

      // Check for #! line
      const firstLine = content.split('\n')[0];
      if (firstLine.startsWith('#!') && !firstLine.includes('sh')) {
        io.println(`sh: ${cmd}: unsupported interpreter ${firstLine}`); return 126;
      }

      // Run as sh script in child env
      const child = env.child();
      child.setPos(args, cmd);
      const childInterp = new Interpreter(child, io);
      childInterp.builtins = this.builtins;
      return await childInterp.runSource(content);
    } catch (e) {
      if (e instanceof ShError) throw e;
      if (e instanceof ShAction) throw e;
      io.println(`sh: ${cmd}: not found`);
      return 127;
    }
  }

  async _builtinSet(args, env, io) {
    if (args.length === 0) {
      for (const [k, v] of env._vars) io.println(`${k}=${v.value}`);
      return 0;
    }
    let i = 0;
    // Options
    while (i < args.length && (args[i].startsWith('-') || args[i].startsWith('+'))) {
      const a = args[i++];
      if (a === '--') break;
      const on = a[0] === '-';
      for (const c of a.slice(1)) env.setOpt(c, on);
    }
    // Remaining are positional params
    if (i < args.length) env.setPos(args.slice(i));
    return 0;
  }

  async _builtinEval(args, env, io) {
    const src = args.join(' ');
    return this.runSource(src, env, io);
  }

  async _builtinDot(args, env, io) {
    if (!args[0]) { io.println('sh: .: missing argument'); return 1; }
    const content = io.fs.cat(io.fs.resolve(args[0]));
    if (content === null) { io.println(`sh: .: ${args[0]}: not found`); return 1; }
    return this.runSource(content, env, io);
  }

  async _builtinExec(args, env, io) {
    if (!args[0]) return 0;
    // exec replaces the shell — for game launchers, delegate
    return this._invoke(args[0], args.slice(1), env, io);
  }

  async _execIf(node, env, io) {
    const cond = await this._exec(node.cond, env, io);
    if (cond === 0) return this._exec(node.then, env, io);
    for (const e of node.elifs) {
      const ec = await this._exec(e.cond, env, io);
      if (ec === 0) return this._exec(e.then, env, io);
    }
    if (node.els) return this._exec(node.els, env, io);
    return 0;
  }

  async _execWhile(node, env, io) {
    let status = 0;
    while (true) {
      const cond = await this._exec(node.cond, env, io);
      const proceed = node.until ? cond !== 0 : cond === 0;
      if (!proceed) break;
      try {
        status = await this._exec(node.body, env, io);
      } catch (e) {
        if (e instanceof BreakSignal)    { if (--e.n <= 0) break; throw e; }
        if (e instanceof ContinueSignal) { if (--e.n <= 0) continue; throw e; }
        throw e;
      }
    }
    return status;
  }

  async _execFor(node, env, io) {
    let words;
    if (node.words === null) {
      words = [...env._pos];
    } else {
      words = await expandWords(node.words, env, io, this._captureRun.bind(this));
    }
    let status = 0;
    for (const w of words) {
      env.set(node.name, w);
      try {
        status = await this._exec(node.body, env, io);
      } catch (e) {
        if (e instanceof BreakSignal)    { if (--e.n <= 0) break; throw e; }
        if (e instanceof ContinueSignal) { if (--e.n <= 0) continue; throw e; }
        throw e;
      }
    }
    return status;
  }

  async _execCase(node, env, io) {
    const word = stripQuotes(await expandWord(node.word, env, io, this._captureRun.bind(this)));
    for (const item of node.items) {
      for (const pat of item.patterns) {
        const expanded = stripQuotes(await expandWord(pat, env, io, this._captureRun.bind(this)));
        if (caseMatch(word, expanded)) {
          return this._exec(item.body, env, io);
        }
      }
    }
    return 0;
  }

  async _execGroup(node, env, io) {
    const { io: effIo, cleanup } = await this._applyRedirs(node.redirs || [], env, io);
    let status = 0;
    try {
      const execEnv = node.subshell ? env.child() : env;
      if (node.subshell) {
        const savedCwd = io.fs.cwd;
        try { status = await this._exec(node.body, execEnv, effIo); }
        finally { io.fs.cwd = savedCwd; }
      } else {
        status = await this._exec(node.body, execEnv, effIo);
      }
    } finally {
      cleanup();
    }
    return status;
  }

  // Apply redirections to io; return { io: newIo, cleanup: fn }
  async _applyRedirs(redirs, env, io) {
    if (redirs.length === 0) return { io, cleanup: () => {} };

    let effIo = { ...io };
    let stdoutBuf = null;
    let stdinBuf = null;

    for (const r of redirs) {
      if (r.kind === 'here') {
        stdinBuf = r.raw ? r.word : stripQuotes(await expandWord(r.word, env, effIo, this._captureRun.bind(this)));
        effIo = { ...effIo, stdin: stdinBuf };
        continue;
      }
      const target = r.kind !== 'dup'
        ? stripQuotes(await expandWord(r.word, env, effIo, this._captureRun.bind(this)))
        : r.word;

      if (r.kind === 'in') {
        const content = io.fs.cat(io.fs.resolve(target));
        if (content === null) throw new ShError(`${target}: no such file`);
        effIo = { ...effIo, stdin: content };
      } else if (r.kind === 'out') {
        let buf = '';
        const flush = () => { try { io.fs.write(io.fs.resolve(target), buf); } catch(e) { io.println(`sh: ${target}: ${e.message}`); } };
        effIo = { ...effIo, println(t) { buf += t + '\n'; }, print(t) { buf += t; }, _flush: flush };
      } else if (r.kind === 'app') {
        const existing = io.fs.cat(io.fs.resolve(target)) || '';
        let buf = existing;
        const flush = () => { try { io.fs.write(io.fs.resolve(target), buf); } catch(e) { io.println(`sh: ${target}: ${e.message}`); } };
        effIo = { ...effIo, println(t) { buf += t + '\n'; }, print(t) { buf += t; }, _flush: flush };
      } else if (r.kind === 'dup') {
        // >&2: send stdout to stderr (display)
        if (target === '2') effIo = { ...effIo, println: io.println, print: io.print };
      }
    }

    const flush = effIo._flush;
    delete effIo._flush;
    return { io: effIo, cleanup: () => { if (flush) flush(); } };
  }

  // Used as runFn callback for expand.js
  async _captureRun(src, env, captureIo) {
    const child = new Interpreter(env, captureIo);
    await child.runSource(src);
  }

  // Parse and run source text (for scripts — catches ExitSignal, returns its value).
  // ShAction propagates to the caller.
  async runSource(src, env, io) {
    env = env || this.env;
    io  = io  || this.io;
    const { Lexer } = await import('./lexer.js');
    const { Parser } = await import('./parser.js');
    try {
      const lexer = new Lexer(src);
      const parser = new Parser(lexer.tokens);
      const ast = parser.parse();
      const child = new Interpreter(env, io);
      child.builtins = this.builtins;
      return await child._exec(ast, env, io);
    } catch (e) {
      if (e instanceof SyntaxError) {
        io.println(`sh: syntax error: ${e.message}`);
        return 2;
      }
      if (e instanceof ExitSignal) return e.value;
      throw e; // ShAction and others propagate
    }
  }

  // Parse and run one interactive line — propagates ExitSignal and ShAction to caller.
  async runLine(src, env, io) {
    env = env || this.env;
    io  = io  || this.io;
    const { Lexer } = await import('./lexer.js');
    const { Parser } = await import('./parser.js');
    try {
      const lexer = new Lexer(src);
      const parser = new Parser(lexer.tokens);
      const ast = parser.parse();
      const child = new Interpreter(env, io);
      child.builtins = this.builtins;
      return await child._exec(ast, env, io);
    } catch (e) {
      if (e instanceof SyntaxError) {
        io.println(`sh: syntax error: ${e.message}`);
        return 2;
      }
      throw e; // ExitSignal, ShAction propagate to shell loop
    }
  }
}

// Case pattern matching (supports * ? [...])
function caseMatch(str, pattern) {
  if (pattern === '*') return true;
  // Convert shell glob to regex
  let re = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else if (ch === '[') {
      re += '['; i++;
      if (pattern[i] === '!') { re += '^'; i++; }
      while (i < pattern.length && pattern[i] !== ']') re += pattern[i++];
      re += ']';
    } else re += ch.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(re + '$').test(str);
}
