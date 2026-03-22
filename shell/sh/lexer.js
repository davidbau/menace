// lexer.js -- Bourne shell tokenizer (1982 sh subset).
//
// Produces a flat token stream from a source string.
// Tokens: { type, value, heredocDelim }
//
// Types:
//   WORD        -- a word (possibly quoted, possibly with expansions)
//   NEWLINE     -- \n (statement separator)
//   SEMI        -- ;
//   PIPE        -- |
//   AND         -- && (not in 1982 sh but common; we support it)
//   OR          -- || (same)
//   REDIR_OUT   -- >
//   REDIR_APP   -- >>
//   REDIR_IN    -- <
//   REDIR_HERE  -- << (value = delimiter, raw = whether unquoted)
//   REDIR_DUP   -- >&  (value = fd digit)
//   LPAREN      -- (
//   RPAREN      -- )
//   LBRACE      -- {
//   RBRACE      -- }
//   IF/THEN/ELIF/ELSE/FI/WHILE/UNTIL/DO/DONE/FOR/IN/CASE/ESAC  -- keywords
//   FUNC        -- NAME() (the () has been consumed)
//   EOF         -- end of input

export const T = {
  WORD:'WORD', NEWLINE:'NEWLINE', SEMI:'SEMI', PIPE:'PIPE',
  AND:'AND', OR:'OR',
  REDIR_OUT:'REDIR_OUT', REDIR_APP:'REDIR_APP', REDIR_IN:'REDIR_IN',
  REDIR_HERE:'REDIR_HERE', REDIR_DUP:'REDIR_DUP',
  LPAREN:'LPAREN', RPAREN:'RPAREN', LBRACE:'LBRACE', RBRACE:'RBRACE',
  IF:'IF', THEN:'THEN', ELIF:'ELIF', ELSE:'ELSE', FI:'FI',
  WHILE:'WHILE', UNTIL:'UNTIL', DO:'DO', DONE:'DONE',
  FOR:'FOR', IN:'IN', CASE:'CASE', ESAC:'ESAC',
  FUNC:'FUNC', EOF:'EOF',
};

const KEYWORDS = new Set([
  'if','then','elif','else','fi','while','until','do','done',
  'for','in','case','esac','{','}',
]);
const KW_MAP = {
  if:T.IF, then:T.THEN, elif:T.ELIF, else:T.ELSE, fi:T.FI,
  while:T.WHILE, until:T.UNTIL, do:T.DO, done:T.DONE,
  for:T.FOR, in:T.IN, case:T.CASE, esac:T.ESAC,
  '{':T.LBRACE, '}':T.RBRACE,
};

export class Lexer {
  constructor(src) {
    this.src = src;
    this.pos = 0;
    this.tokens = [];
    this._tokenize();
  }

  _tokenize() {
    const src = this.src;
    let i = 0;
    const len = src.length;

    while (i < len) {
      const ch = src[i];

      // Skip horizontal whitespace
      if (ch === ' ' || ch === '\t') { i++; continue; }

      // Comment
      if (ch === '#') {
        while (i < len && src[i] !== '\n') i++;
        continue;
      }

      // Newline
      if (ch === '\n') {
        this.tokens.push({ type: T.NEWLINE, value: '\n' });
        i++; continue;
      }

      // Line continuation
      if (ch === '\\' && i + 1 < len && src[i + 1] === '\n') {
        i += 2; continue;
      }

      // Operators
      if (ch === ';') { this.tokens.push({ type: T.SEMI, value: ';' }); i++; continue; }
      if (ch === '(') { this.tokens.push({ type: T.LPAREN, value: '(' }); i++; continue; }
      if (ch === ')') { this.tokens.push({ type: T.RPAREN, value: ')' }); i++; continue; }

      if (ch === '|') {
        if (src[i + 1] === '|') { this.tokens.push({ type: T.OR, value: '||' }); i += 2; }
        else                    { this.tokens.push({ type: T.PIPE, value: '|' }); i++; }
        continue;
      }

      if (ch === '&') {
        if (src[i + 1] === '&') { this.tokens.push({ type: T.AND, value: '&&' }); i += 2; }
        else { this.tokens.push({ type: T.WORD, value: '&__BG__' }); i++; }
        // bare & = background marker, handled in parser
        continue;
      }

      // Redirections
      if (ch === '>') {
        if (src[i + 1] === '>') { this.tokens.push({ type: T.REDIR_APP, value: '>>' }); i += 2; }
        else if (src[i + 1] === '&') {
          i += 2;
          const fd = src[i];
          if (/[0-9]/.test(fd)) { this.tokens.push({ type: T.REDIR_DUP, value: fd }); i++; }
          else { this.tokens.push({ type: T.REDIR_DUP, value: '1' }); }
        } else { this.tokens.push({ type: T.REDIR_OUT, value: '>' }); i++; }
        continue;
      }

      if (ch === '<') {
        if (src[i + 1] === '<') {
          i += 2;
          // skip whitespace before delimiter
          while (i < len && (src[i] === ' ' || src[i] === '\t')) i++;
          // read delimiter word (may be quoted)
          let delim = ''; let quoted = false;
          while (i < len && src[i] !== '\n' && src[i] !== ' ' && src[i] !== '\t') {
            const c = src[i++];
            if (c === "'" || c === '"') { quoted = true; }
            else if (c !== '\\') delim += c;
          }
          // collect here-doc body — lines until delimiter on its own line
          const bodyLines = [];
          if (i < len && src[i] === '\n') i++; // skip the newline after <<DELIM
          while (i < len) {
            const lineStart = i;
            while (i < len && src[i] !== '\n') i++;
            const line = src.slice(lineStart, i);
            if (i < len) i++; // consume newline
            if (line === delim) break;
            bodyLines.push(line);
          }
          const body = bodyLines.join('\n') + (bodyLines.length > 0 ? '\n' : '');
          this.tokens.push({ type: T.REDIR_HERE, value: body, raw: quoted });
        } else { this.tokens.push({ type: T.REDIR_IN, value: '<' }); i++; }
        continue;
      }

      // Word (possibly quoted)
      const wordResult = this._readWord(src, i);
      i = wordResult.end;
      const raw = wordResult.raw;

      // Check for function definition: NAME()
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(raw) &&
          i < len && src[i] === '(' && src[i + 1] === ')') {
        i += 2;
        this.tokens.push({ type: T.FUNC, value: raw });
        continue;
      }

      // Check for keyword (only unquoted bare words)
      if (wordResult.unquoted && KW_MAP[raw]) {
        this.tokens.push({ type: KW_MAP[raw], value: raw });
        continue;
      }

      this.tokens.push({ type: T.WORD, value: raw, unquoted: wordResult.unquoted });
    }

    this.tokens.push({ type: T.EOF, value: '' });
  }

  // Read a word including all quoting forms.
  // Returns { raw: string, end: number, unquoted: bool }
  // raw preserves quoting markers for expand.js to interpret:
  //   \x01 ... \x01  single-quoted region
  //   \x02 ... \x02  double-quoted region
  //   \\ before char  backslash-escaped char
  _readWord(src, i) {
    const len = src.length;
    let raw = '';
    let unquoted = true;
    const STOP = new Set([' ', '\t', '\n', ';', '|', '&', '(', ')', '<', '>']);

    while (i < len) {
      const ch = src[i];
      if (STOP.has(ch)) break;

      if (ch === "'") {
        unquoted = false;
        i++; // skip opening quote
        raw += '\x01';
        while (i < len && src[i] !== "'") raw += src[i++];
        if (i < len) i++; // skip closing quote
        raw += '\x01';
        continue;
      }

      if (ch === '"') {
        unquoted = false;
        i++; // skip opening quote
        raw += '\x02';
        while (i < len && src[i] !== '"') {
          if (src[i] === '\\' && i + 1 < len &&
              (src[i + 1] === '"' || src[i + 1] === '$' ||
               src[i + 1] === '`' || src[i + 1] === '\\' || src[i + 1] === '\n')) {
            if (src[i + 1] === '\n') { i += 2; continue; } // line continuation in "
            raw += '\\' + src[i + 1]; i += 2;
          } else {
            raw += src[i++];
          }
        }
        if (i < len) i++; // skip closing quote
        raw += '\x02';
        continue;
      }

      if (ch === '\\' && i + 1 < len) {
        unquoted = false;
        if (src[i + 1] === '\n') { i += 2; continue; } // line continuation
        raw += '\\' + src[i + 1]; i += 2;
        continue;
      }

      raw += ch; i++;
    }

    return { raw, end: i, unquoted };
  }
}
