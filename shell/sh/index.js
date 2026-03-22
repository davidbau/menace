// index.js -- Public API for the 1982 sh implementation.
//
// Usage:
//
//   import { Sh } from './sh/index.js';
//
//   const sh = new Sh({ fs, println, print, getch, shell });
//
//   // Run a script file:
//   await sh.runFile('/home/rodney/.profile', []);
//
//   // Run source text:
//   await sh.runSource('echo hello; x=1');
//
//   // Interactive subshell:
//   await sh.interactive();

import { ShEnv, Interpreter } from './interpreter.js';
import { stripQuotes } from './expand.js';

export { ShEnv, Interpreter };

export class Sh {
  // io: { fs, println, print, getch, shell? }
  // initialEnv: optional Map or plain object of initial variables
  constructor(io, initialEnv = {}) {
    this.io = io;
    this.env = new ShEnv();

    // Seed environment
    this.env.set('HOME', '/home/rodney');
    this.env.set('PATH', '/bin:/usr/games:/usr/local/bin');
    this.env.set('LOGNAME', 'rodney');
    this.env.set('USER', 'rodney');
    this.env.set('TERM', 'vt100');
    this.env.set('IFS', ' \t\n');
    this.env.set('PS1', '$ ');
    this.env.set('PS2', '> ');
    this.env.export('HOME'); this.env.export('PATH');
    this.env.export('LOGNAME'); this.env.export('USER');
    this.env.export('TERM'); this.env.export('IFS');

    for (const [k, v] of Object.entries(initialEnv)) {
      this.env.set(k, v);
    }

    this._interp = new Interpreter(this.env, io);
    // Wire up shell command delegation
    this._interp.builtins = {
      ...this._interp.builtins,
    };
  }

  // Run source text in the current environment.
  // Returns exit status.
  async runSource(src, args = []) {
    if (args.length) this.env.setPos(args);
    return this._interp.runSource(src);
  }

  // Run a file from the virtual filesystem.
  async runFile(path, args = []) {
    const content = this.io.fs.cat(this.io.fs.resolve(path));
    if (content === null) {
      this.io.println(`sh: ${path}: not found`);
      return 127;
    }
    const env = this.env.child();
    env.setPos(args, path);
    const interp = new Interpreter(env, this.io);
    interp.builtins = this._interp.builtins;
    return interp.runSource(content, env, this.io);
  }

  // Drop into an interactive subshell.
  // Returns when the user types 'exit' or Ctrl-D.
  async interactive() {
    const io = this.io;
    const env = this.env;
    const interp = this._interp;

    io.println('sh: entering subshell (type exit to return)');

    while (true) {
      // Show prompt
      const ps1 = env.get('PS1') || '$ ';
      io.print(ps1);

      // Read a line
      const line = await this._readLine(io, env);
      if (line === null) {
        io.println('');
        break; // Ctrl-D
      }
      if (!line.trim()) continue;

      // Handle multi-line continuation (PS2 prompt for incomplete input)
      let src = line;
      while (this._isIncomplete(src)) {
        const ps2 = env.get('PS2') || '> ';
        io.print(ps2);
        const cont = await this._readLine(io, env);
        if (cont === null) break;
        src += '\n' + cont;
      }

      try {
        await interp.runSource(src, env, io);
      } catch (e) {
        if (e && e.message) io.println(`sh: ${e.message}`);
      }
    }
  }

  // Read a line from the display using getch (no editing, just basic backspace).
  async _readLine(io, env) {
    let line = '';
    while (true) {
      const ch = await io.getch();
      const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
      if (code === 4 && !line) return null; // Ctrl-D on empty line
      if (code === 3) return null;           // Ctrl-C
      if (code === 13 || code === 10) { io.println(''); return line; }
      if (code === 8 || code === 127) {
        if (line.length > 0) { line = line.slice(0, -1); io.print('\b \b'); }
        continue;
      }
      const c = typeof ch === 'string' ? ch : String.fromCharCode(code);
      if (code >= 32 && code < 127) { line += c; io.print(c); }
    }
  }

  // Heuristic: does this source look syntactically incomplete?
  _isIncomplete(src) {
    // Count unmatched if/do/case/{ without fi/done/esac/}
    const opens = (src.match(/\b(if|while|until|for|case)\b/g) || []).length
                + (src.match(/\{/g) || []).length;
    const closes = (src.match(/\b(fi|done|esac)\b/g) || []).length
                 + (src.match(/\}/g) || []).length;
    if (opens > closes) return true;
    // Trailing | or &&/||
    if (/[|&]\s*$/.test(src)) return true;
    // Unmatched quotes
    let sq = 0, dq = 0;
    for (const ch of src) { if (ch === "'") sq++; if (ch === '"') dq++; }
    return (sq % 2 !== 0) || (dq % 2 !== 0);
  }
}

// Convenience: run a .profile if it exists.
export async function runProfile(io) {
  const path = '/home/rodney/.profile';
  try {
    const content = io.fs.cat(io.fs.resolve(path));
    if (!content) return;
    const sh = new Sh(io);
    await sh.runSource(content);
  } catch (e) {
    // .profile errors are non-fatal
  }
}
