// builtins.js -- Built-in commands for the 1982 sh subset.
//
// Each builtin: async (args, env, io, interpreter) => exitStatus (0 = success)
// args: already-expanded string array, NOT including the command name.
// env: ShEnv instance
// io:  { println, print, getch, fs, shell }
// interpreter: Interpreter instance (for eval, ., exec)

import { ShError } from './expand.js';

// --- test / [ -----------------------------------------------------------

function evalTest(args) {
  // Strip trailing ] if called as [
  if (args[args.length - 1] === ']') args = args.slice(0, -1);
  const [result] = parseTestExpr(args, 0);
  return result ? 0 : 1;
}

function parseTestExpr(args, i) {
  // Handle ! prefix
  if (args[i] === '!') {
    const [val, j] = parseTestExpr(args, i + 1);
    return [!val, j];
  }
  // Grouped ( expr )
  if (args[i] === '(') {
    const [val, j] = parseTestExpr(args, i + 1);
    return [val, j + 1]; // skip )
  }
  return parsePrimary(args, i);
}

function parsePrimary(args, i) {
  const a = args[i];
  // Unary file/string tests
  if (a === '-z') return [!(args[i + 1] || ''), i + 2];
  if (a === '-n') return [!!(args[i + 1] || ''), i + 2];
  if (a === '-e' || a === '-f' || a === '-d' || a === '-r' ||
      a === '-w' || a === '-x' || a === '-s') {
    // File tests are resolved by the caller (no fs here); return placeholder
    return [{ _fileTest: a, _path: args[i + 1] }, i + 2];
  }
  // Binary operators
  const b = args[i + 1];
  const c = args[i + 2];
  if (b === '=')  return [a === c, i + 3];
  if (b === '!=') return [a !== c, i + 3];
  if (b === '-eq') return [parseInt(a) === parseInt(c), i + 3];
  if (b === '-ne') return [parseInt(a) !== parseInt(c), i + 3];
  if (b === '-lt') return [parseInt(a) <  parseInt(c), i + 3];
  if (b === '-le') return [parseInt(a) <= parseInt(c), i + 3];
  if (b === '-gt') return [parseInt(a) >  parseInt(c), i + 3];
  if (b === '-ge') return [parseInt(a) >= parseInt(c), i + 3];
  if (b === '-a')  { const [l] = parsePrimary(args, i); const [r] = parsePrimary(args, i + 2); return [l && r, i + 3]; }
  if (b === '-o')  { const [l] = parsePrimary(args, i); const [r] = parsePrimary(args, i + 2); return [l || r, i + 3]; }
  // Single string test (non-empty = true)
  return [!!a, i + 1];
}

async function builtinTest(args, env, io) {
  const strip = a => args[a === ']' ? args.length - 1 : 0]; // unused
  // resolve file tests using io.fs
  function resolve(val) {
    if (val && typeof val === 'object' && val._fileTest) {
      const fs = io.fs;
      const p = val._path;
      try {
        const node = fs.getNode ? fs.getNode(fs.resolve(p)) : null;
        if (!node) return false;
        if (val._fileTest === '-d') return node.type === 'dir';
        if (val._fileTest === '-f') return node.type === 'file' || node.type === 'exec';
        if (val._fileTest === '-e') return true;
        if (val._fileTest === '-x') return node.type === 'exec' || (node.type === 'file' && !fs.isReadonly(p));
        if (val._fileTest === '-r') return true;
        if (val._fileTest === '-w') return !fs.isReadonly(p);
        if (val._fileTest === '-s') return (fs.getSize ? fs.getSize(node) : 0) > 0;
      } catch { return false; }
    }
    return val;
  }

  try {
    let testArgs = [...args];
    if (testArgs[testArgs.length - 1] === ']') testArgs = testArgs.slice(0, -1);
    const [raw] = parseTestExpr(testArgs, 0);
    return resolve(raw) ? 0 : 1;
  } catch { return 1; }
}

// --- expr ----------------------------------------------------------------

function exprVal(args, i) {
  if (i >= args.length) throw new ShError('expr: missing operand');
  const t = args[i];
  // Subexpr (not standard but useful)
  return [t, i + 1];
}

function exprNum(s) {
  const n = parseInt(s, 10);
  if (isNaN(n)) throw new ShError(`expr: non-numeric argument: ${s}`);
  return n;
}

async function builtinExpr(args, env, io) {
  // Simple left-to-right evaluation (classic expr precedence is ignored for brevity)
  // Supports: integer arithmetic, string ops, comparisons
  try {
    // String functions (length, substr, index, match)
    if (args[0] === 'length') { io.println(String((args[1] || '').length)); return 0; }
    if (args[0] === 'substr') {
      const s = args[1] || ''; const p = parseInt(args[2]) - 1; const l = parseInt(args[3]);
      io.println(s.substr(p, l)); return 0;
    }
    if (args[0] === 'index') {
      const s = args[1] || ''; const chars = args[2] || '';
      for (let i = 0; i < s.length; i++) if (chars.includes(s[i])) { io.println(String(i + 1)); return 0; }
      io.println('0'); return 0;
    }
    if (args[0] === 'match') {
      const s = args[1] || ''; const re = new RegExp(args[2] || '');
      const m = s.match(re); io.println(m ? String(m[0].length) : '0'); return m ? 0 : 1;
    }

    // Logical: expr1 | expr2, expr1 & expr2
    // Arithmetic and comparison
    let result = args[0];
    let i = 1;
    while (i < args.length) {
      const op = args[i]; i++;
      const right = args[i]; i++;
      if (op === '+') result = String(exprNum(result) + exprNum(right));
      else if (op === '-') result = String(exprNum(result) - exprNum(right));
      else if (op === '*') result = String(exprNum(result) * exprNum(right));
      else if (op === '/') { const d = exprNum(right); if (!d) throw new ShError('expr: division by zero'); result = String(Math.trunc(exprNum(result) / d)); }
      else if (op === '%') result = String(exprNum(result) % exprNum(right));
      else if (op === '=')  result = result === right ? '1' : '0';
      else if (op === '!=') result = result !== right ? '1' : '0';
      else if (op === '<')  result = exprNum(result) <  exprNum(right) ? '1' : '0';
      else if (op === '<=') result = exprNum(result) <= exprNum(right) ? '1' : '0';
      else if (op === '>')  result = exprNum(result) >  exprNum(right) ? '1' : '0';
      else if (op === '>=') result = exprNum(result) >= exprNum(right) ? '1' : '0';
      else if (op === '|')  result = (result && result !== '0') ? result : right;
      else if (op === '&')  result = (result && result !== '0' && right && right !== '0') ? result : '0';
      else throw new ShError(`expr: unknown operator: ${op}`);
    }
    io.println(result);
    return (result === '0' || result === '') ? 1 : 0;
  } catch (e) {
    if (e instanceof ShError) { io.println(`expr: ${e.message}`); return 2; }
    throw e;
  }
}

// --- read ----------------------------------------------------------------

async function builtinRead(args, env, io) {
  let line = '';
  if (io.stdin) {
    // Reading from redirected stdin buffer
    const nl = io.stdin.indexOf('\n');
    if (nl === -1) { line = io.stdin; io.stdin = ''; }
    else { line = io.stdin.slice(0, nl); io.stdin = io.stdin.slice(nl + 1); }
  } else {
    // Interactive: read char by char until Enter
    let ch;
    while (true) {
      ch = await io.getch();
      const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
      if (code === 13 || code === 10) break;
      if (code === 8 || code === 127) {
        if (line.length > 0) { line = line.slice(0, -1); io.print('\b \b'); }
        continue;
      }
      if (code === 3) throw new ShError('Interrupted');
      const c = typeof ch === 'string' ? ch : String.fromCharCode(code);
      line += c;
      io.print(c);
    }
    io.println('');
  }

  // Assign fields to names (IFS-split)
  const ifs = env.get('IFS') ?? ' \t\n';
  const names = args.length > 0 ? args : ['REPLY'];
  if (names.length === 1) {
    env.set(names[0], line);
  } else {
    const parts = line.split(new RegExp(`[${ifs.replace(/[-[\]]/g, '\\$&')}]+`));
    for (let i = 0; i < names.length; i++) {
      env.set(names[i], i < parts.length - 1 ? parts[i] : (i === names.length - 1 ? parts.slice(i).join(' ') : ''));
    }
  }
  return 0;
}

// --- echo ----------------------------------------------------------------

async function builtinEcho(args, env, io) {
  let nl = true;
  let start = 0;
  if (args[0] === '-n') { nl = false; start = 1; }
  const text = args.slice(start).join(' ');
  if (nl) io.println(text);
  else io.print(text);
  return 0;
}

// --- pwd, cd -------------------------------------------------------------

async function builtinPwd(args, env, io) {
  io.println(io.fs.cwd || '/');
  return 0;
}

async function builtinCd(args, env, io) {
  const dir = args[0] || env.get('HOME') || '/home/rodney';
  try {
    io.fs.cd(dir);
    env.set('PWD', io.fs.cwd);
    return 0;
  } catch (e) {
    io.println(`cd: ${args[0]}: No such file or directory`);
    return 1;
  }
}

// --- export, unset, readonly, set ----------------------------------------

async function builtinExport(args, env, io) {
  if (args.length === 0) {
    for (const [k, v] of env.exported()) io.println(`${k}=${v}`);
    return 0;
  }
  for (const arg of args) {
    const eq = arg.indexOf('=');
    if (eq !== -1) { env.set(arg.slice(0, eq), arg.slice(eq + 1)); env.export(arg.slice(0, eq)); }
    else env.export(arg);
  }
  return 0;
}

async function builtinUnset(args, env, io) {
  for (const name of args) env.unset(name);
  return 0;
}

async function builtinReadonly(args, env, io) {
  for (const arg of args) {
    const eq = arg.indexOf('=');
    if (eq !== -1) env.set(arg.slice(0, eq), arg.slice(eq + 1));
    env.setReadonly(eq !== -1 ? arg.slice(0, eq) : arg);
  }
  return 0;
}

// --- type ----------------------------------------------------------------

async function builtinType(args, env, io, interp) {
  for (const name of args) {
    if (interp.builtins[name]) { io.println(`${name} is a shell builtin`); continue; }
    if (env.getFunc(name)) { io.println(`${name} is a function`); continue; }
    io.println(`${name} not found`);
  }
  return 0;
}

// --- shift ---------------------------------------------------------------

async function builtinShift(args, env, io) {
  const n = parseInt(args[0] || '1');
  env.shift(n);
  return 0;
}

// --- wait / true / false / : ---------------------------------------------

async function builtinTrue()  { return 0; }
async function builtinFalse() { return 1; }
async function builtinColon() { return 0; }
async function builtinWait()  { return 0; }

// --- printf (bonus, common in 1982) -------------------------------------

async function builtinPrintf(args, env, io) {
  if (!args[0]) return 0;
  const fmt = args[0];
  let out = '';
  let ai = 1;
  for (let i = 0; i < fmt.length; i++) {
    if (fmt[i] === '%' && i + 1 < fmt.length) {
      const spec = fmt[++i];
      const arg = args[ai++] || '';
      if (spec === 's') out += arg;
      else if (spec === 'd') out += String(parseInt(arg) || 0);
      else if (spec === '%') out += '%';
      else out += '%' + spec;
    } else if (fmt[i] === '\\' && i + 1 < fmt.length) {
      const esc = fmt[++i];
      if (esc === 'n') out += '\n';
      else if (esc === 't') out += '\t';
      else if (esc === '\\') out += '\\';
      else out += '\\' + esc;
    } else {
      out += fmt[i];
    }
  }
  // split on \n for println
  const lines = out.split('\n');
  for (let i = 0; i < lines.length - 1; i++) io.println(lines[i]);
  if (lines[lines.length - 1]) io.print(lines[lines.length - 1]);
  return 0;
}

// --- export map ----------------------------------------------------------

export const BUILTINS = {
  ':':       builtinColon,
  true:      builtinTrue,
  false:     builtinFalse,
  wait:      builtinWait,
  echo:      builtinEcho,
  pwd:       builtinPwd,
  cd:        builtinCd,
  export:    builtinExport,
  unset:     builtinUnset,
  readonly:  builtinReadonly,
  read:      builtinRead,
  shift:     builtinShift,
  test:      builtinTest,
  '[':       builtinTest,
  expr:      builtinExpr,
  type:      builtinType,
  printf:    builtinPrintf,
};
