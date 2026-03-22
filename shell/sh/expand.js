// expand.js -- Word expansion for the 1982 sh subset.
//
// Expansion order (matching Bourne sh):
//   1. Tilde expansion
//   2. Parameter expansion ($VAR, ${VAR}, ${VAR:-word}, etc.)
//   3. Command substitution (`cmd`)
//   4. Word splitting (IFS)
//   5. Pathname expansion (globbing)
//   6. Quote removal
//
// Raw word encoding from lexer.js:
//   \x01...\x01  single-quoted region (no expansion)
//   \x02...\x02  double-quoted region (params + cmdsub only; no splitting/glob)
//   \\X          backslash-escaped character X

const SQ = '\x01'; // single-quote marker
const DQ = '\x02'; // double-quote marker

// Expand a list of raw words into a flat array of strings.
// env: ShEnv instance
// io:  { fs } for command substitution
// runFn: async (src, env, io) => exitStatus  -- runs a sub-script
export async function expandWords(rawWords, env, io, runFn) {
  const result = [];
  for (const raw of rawWords) {
    if (typeof raw !== 'string') continue; // skip non-string markers
    const expanded = await expandWord(raw, env, io, runFn, false);
    // word splitting and globbing
    const parts = splitAndGlob(expanded, env, io);
    result.push(...parts);
  }
  return result;
}

// Expand a single raw word — returns an intermediate string with
// quote-region markers still present (for IFS splitting to respect them).
export async function expandWord(raw, env, io, runFn, inDouble = false) {
  let out = '';
  let i = 0;
  const len = raw.length;

  while (i < len) {
    const ch = raw[i];

    // Single-quoted region: copy literally, no expansion
    if (ch === SQ) {
      i++;
      out += SQ;
      while (i < len && raw[i] !== SQ) out += raw[i++];
      if (i < len) i++; // closing SQ
      out += SQ;
      continue;
    }

    // Double-quoted region: expand params and cmdsub inside
    if (ch === DQ) {
      i++;
      out += DQ;
      let inner = '';
      while (i < len && raw[i] !== DQ) inner += raw[i++];
      if (i < len) i++; // closing DQ
      const expanded = await expandWord(inner, env, io, runFn, true);
      out += expanded + DQ;
      continue;
    }

    // Backslash escape
    if (ch === '\\' && i + 1 < len) {
      out += raw[i + 1]; // escaped char is literal
      i += 2;
      continue;
    }

    // Parameter / command substitution
    if (ch === '$') {
      const { value, end } = expandParam(raw, i + 1, env);
      out += value;
      i = end;
      continue;
    }

    // Command substitution (backtick)
    if (ch === '`') {
      i++;
      let cmdSrc = '';
      while (i < len && raw[i] !== '`') {
        if (raw[i] === '\\' && i + 1 < len && (raw[i+1] === '`' || raw[i+1] === '\\' || raw[i+1] === '$')) {
          cmdSrc += raw[i + 1]; i += 2;
        } else {
          cmdSrc += raw[i++];
        }
      }
      if (i < len) i++; // closing backtick
      const output = await runCapture(cmdSrc, env, io, runFn);
      out += output;
      continue;
    }

    // Tilde expansion (only at start of unquoted word)
    if (ch === '~' && i === 0 && !inDouble) {
      out += '/home/rodney';
      i++;
      continue;
    }

    out += ch; i++;
  }

  return out;
}

// Expand $... starting at position i in raw string.
// Returns { value: string, end: number }
function expandParam(raw, i, env) {
  const len = raw.length;
  if (i >= len) return { value: '$', end: i };

  const ch = raw[i];

  // Special single-char params
  if (ch === '?' || ch === '$' || ch === '#' || ch === '!' ||
      ch === '@' || ch === '*' || ch === '-' || /[0-9]/.test(ch)) {
    const v = env.getSpecial(ch);
    return { value: v, end: i + 1 };
  }

  // Braced: ${...}
  if (ch === '{') {
    i++; // skip {
    let name = '';
    let modifier = '';
    let modChar = '';
    let hasColon = false;

    // ${#name} — length
    if (i < len && raw[i] === '#' && /[A-Za-z_]/.test(raw[i + 1] || '')) {
      i++; // skip #
      while (i < len && raw[i] !== '}') name += raw[i++];
      const end = i + 1;
      const val = env.get(name) || '';
      return { value: String(val.length), end };
    }

    while (i < len && raw[i] !== '}' && raw[i] !== ':' &&
           raw[i] !== '-' && raw[i] !== '+' && raw[i] !== '=' && raw[i] !== '?') {
      name += raw[i++];
    }
    if (i < len && raw[i] === ':') { hasColon = true; i++; }
    if (i < len && (raw[i] === '-' || raw[i] === '+' || raw[i] === '=' || raw[i] === '?')) {
      modChar = raw[i++];
      while (i < len && raw[i] !== '}') modifier += raw[i++];
    }
    const end = i + 1; // skip }

    const val = env.get(name);
    const unset = val === undefined;
    const empty = unset || val === '';
    const test = hasColon ? empty : unset;

    if (!modChar) return { value: val || '', end };
    if (modChar === '-') return { value: test ? modifier : val, end };
    if (modChar === '+') return { value: test ? '' : modifier, end };
    if (modChar === '=') {
      if (test) env.set(name, modifier);
      return { value: test ? modifier : val, end };
    }
    if (modChar === '?') {
      if (test) throw new ShError(modifier || `${name}: parameter not set`);
      return { value: val, end };
    }
    return { value: val || '', end };
  }

  // Unbraced: $NAME
  let name = '';
  while (i < len && /[A-Za-z0-9_]/.test(raw[i])) name += raw[i++];
  if (!name) return { value: '$', end: i };
  return { value: env.get(name) || '', end: i };
}

// Run a command string, capture its stdout, strip trailing newlines.
async function runCapture(src, env, io, runFn) {
  let out = '';
  const captureIo = { ...io, println(t) { out += t + '\n'; }, print(t) { out += t; } };
  await runFn(src, env, captureIo);
  return out.replace(/\n+$/, '');
}

// Split a string by IFS and apply glob expansion.
// Returns array of strings (already quote-stripped).
function splitAndGlob(str, env, io) {
  const ifs = env.get('IFS') ?? ' \t\n';
  const parts = ifsplit(str, ifs);
  const result = [];
  for (const p of parts) {
    const stripped = stripQuotes(p);
    if (hasGlob(stripped)) {
      const matches = glob(stripped, io.fs);
      if (matches.length > 0) { result.push(...matches); continue; }
    }
    result.push(stripped);
  }
  return result;
}

// IFS splitting that respects single/double quoted regions.
function ifsplit(str, ifs) {
  const result = [];
  let current = '';
  let inSQ = false, inDQ = false;
  const isIfs = ifs.length > 0 ? (c => ifs.includes(c)) : () => false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === SQ && !inDQ) { inSQ = !inSQ; current += ch; continue; }
    if (ch === DQ && !inSQ) { inDQ = !inDQ; current += ch; continue; }
    if (!inSQ && !inDQ && isIfs(ch)) {
      if (current) { result.push(current); current = ''; }
      continue;
    }
    current += ch;
  }
  if (current) result.push(current);
  return result.length ? result : [''];
}

// Strip quoting markers and return bare string.
export function stripQuotes(str) {
  let out = '';
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === SQ) { i++; while (i < str.length && str[i] !== SQ) out += str[i++]; i++; continue; }
    if (ch === DQ) { i++; while (i < str.length && str[i] !== DQ) out += str[i++]; i++; continue; }
    out += ch; i++;
  }
  return out;
}

function hasGlob(s) { return /[*?[]/.test(s); }

// Simple glob against virtual filesystem.
function glob(pattern, fs) {
  try {
    // Split on / and glob each segment
    const isAbs = pattern.startsWith('/');
    const base = isAbs ? '/' : (fs.cwd || '/');
    const parts = pattern.replace(/^\//, '').split('/');
    const matches = globSegments(base, parts, fs);
    return matches.sort();
  } catch (e) {
    return [];
  }
}

function globSegments(dir, parts, fs) {
  if (parts.length === 0) return [dir];
  const [seg, ...rest] = parts;
  if (!hasGlob(seg)) {
    const next = dir.replace(/\/$/, '') + '/' + seg;
    if (rest.length === 0) {
      try { fs.getNode && fs.getNode(next); return [next]; } catch { return []; }
    }
    return globSegments(next, rest, fs);
  }
  // seg has glob chars — list dir and filter
  const entries = fs.ls ? (fs.ls(dir) || []) : [];
  const re = globToRegex(seg);
  const matched = entries.filter(e => re.test(e) && !e.startsWith('.'));
  const results = [];
  for (const entry of matched) {
    const next = dir.replace(/\/$/, '') + '/' + entry;
    if (rest.length === 0) results.push(next);
    else results.push(...globSegments(next, rest, fs));
  }
  return results;
}

function globToRegex(pattern) {
  let re = '^';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else if (ch === '[') {
      re += '[';
      i++;
      if (pattern[i] === '!') { re += '^'; i++; }
      while (i < pattern.length && pattern[i] !== ']') re += pattern[i++];
      re += ']';
    } else re += ch.replace(/[.+^${}()|\\]/g, '\\$&');
  }
  return new RegExp(re + '$');
}

export class ShError extends Error {
  constructor(msg) { super(msg); this.name = 'ShError'; }
}
