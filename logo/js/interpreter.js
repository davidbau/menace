// Logo interpreter — 1974 MIT / early UCB dialect.
// Clean rewrite targeting 1982-era Logo for PDP-11.

// ======================================================================
// Tokenizer
// ======================================================================

function tokenize(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    // Skip whitespace
    if (line[i] === ' ' || line[i] === '\t') { i++; continue; }
    // Comment
    if (line[i] === ';') break;
    // List delimiters
    if (line[i] === '[') { tokens.push({ type: 'LBRACKET' }); i++; continue; }
    if (line[i] === ']') { tokens.push({ type: 'RBRACKET' }); i++; continue; }
    // Parentheses
    if (line[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (line[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    // Quoted word: "word
    if (line[i] === '"') {
      i++;
      let w = '';
      while (i < line.length && line[i] !== ' ' && line[i] !== '\t' &&
             line[i] !== '[' && line[i] !== ']' && line[i] !== '(' && line[i] !== ')') {
        w += line[i++];
      }
      tokens.push({ type: 'QUOTED', value: w });
      continue;
    }
    // Variable reference: :name
    if (line[i] === ':') {
      i++;
      let w = '';
      while (i < line.length && /[A-Za-z0-9_.]/.test(line[i])) {
        w += line[i++];
      }
      tokens.push({ type: 'VAR', value: w });
      continue;
    }
    // Operators
    if ('+-*/=<>'.includes(line[i])) {
      let op = line[i++];
      if ((op === '<' || op === '>') && i < line.length && line[i] === '=') {
        op += line[i++];
      }
      if (op === '<' && i < line.length && line[i] === '>') {
        op += line[i++]; // <>
      }
      tokens.push({ type: 'OP', value: op });
      continue;
    }
    // Number
    if (/[0-9]/.test(line[i]) || (line[i] === '.' && i + 1 < line.length && /[0-9]/.test(line[i + 1]))) {
      let n = '';
      while (i < line.length && /[0-9.]/.test(line[i])) n += line[i++];
      tokens.push({ type: 'NUMBER', value: parseFloat(n) });
      continue;
    }
    // Word (procedure name, keyword, etc.)
    if (/[A-Za-z_?.]/.test(line[i])) {
      let w = '';
      while (i < line.length && /[A-Za-z0-9_?.!]/.test(line[i])) {
        w += line[i++];
      }
      tokens.push({ type: 'WORD', value: w.toUpperCase() });
      continue;
    }
    // Unknown character — skip
    i++;
  }
  return tokens;
}

// Parse a token stream into a flat list, resolving [...] into nested arrays
function parseTokens(tokens) {
  const result = [];
  let i = 0;

  function parseList() {
    const items = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'RBRACKET') { i++; return items; }
      if (t.type === 'LBRACKET') { i++; items.push(parseList()); continue; }
      items.push(t);
      i++;
    }
    throw new LogoError("MISSING ]");
  }

  while (i < tokens.length) {
    const t = tokens[i];
    if (t.type === 'LBRACKET') { i++; result.push(parseList()); continue; }
    if (t.type === 'RBRACKET') { throw new LogoError("UNEXPECTED ]"); }
    result.push(t);
    i++;
  }
  return result;
}

// ======================================================================
// Error
// ======================================================================

export class LogoError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'LogoError';
  }
}

// Sentinels for OUTPUT and STOP
class OutputSignal { constructor(val) { this.value = val; } }
class StopSignal {}

// ======================================================================
// Interpreter
// ======================================================================

export class LogoInterpreter {
  constructor(turtle, output) {
    this._turtle = turtle;  // Turtle instance
    this._output = output;  // function(str) — print to terminal
    this._readLine = null;  // set by REPL: async function(prompt) => string
    this._env = {};         // global variables
    this._procs = {};       // user-defined procedures
    this._defineBuiltins();
  }

  // Run a line of Logo source (may be multiple statements)
  async run(source) {
    const tokens = tokenize(source);
    const parsed = parseTokens(tokens);
    await this._runList(parsed, this._env);
  }

  // Run a parsed list of tokens/values in an environment
  async _runList(list, env) {
    const stream = { items: list, pos: 0 };
    while (stream.pos < stream.items.length) {
      const result = await this._evalExpr(stream, env);
      if (result !== undefined) {
        throw new LogoError(`YOU DON'T SAY WHAT TO DO WITH ${stringify(result)}`);
      }
    }
  }

  // Evaluate one expression from the stream, consuming tokens
  async _evalExpr(stream, env) {
    if (stream.pos >= stream.items.length) return undefined;
    const item = stream.items[stream.pos];

    // List literal — return as-is
    if (Array.isArray(item)) {
      stream.pos++;
      return item;
    }

    // Number
    if (item.type === 'NUMBER') {
      stream.pos++;
      return this._maybeInfix(item.value, stream, env);
    }

    // Quoted word
    if (item.type === 'QUOTED') {
      stream.pos++;
      return this._maybeInfix(item.value, stream, env);
    }

    // Variable
    if (item.type === 'VAR') {
      stream.pos++;
      const name = item.value.toUpperCase();
      if (!(name in env) && !(name in this._env)) {
        throw new LogoError(`${name} HAS NO VALUE`);
      }
      const val = name in env ? env[name] : this._env[name];
      return this._maybeInfix(val, stream, env);
    }

    // Parenthesized expression
    if (item.type === 'LPAREN') {
      stream.pos++;
      // Find matching rparen, collect tokens
      const inner = [];
      let depth = 1;
      while (stream.pos < stream.items.length && depth > 0) {
        const t = stream.items[stream.pos];
        if (t.type === 'LPAREN') depth++;
        else if (t.type === 'RPAREN') { depth--; if (depth === 0) { stream.pos++; break; } }
        inner.push(stream.items[stream.pos]);
        stream.pos++;
      }
      const innerStream = { items: inner, pos: 0 };
      const val = await this._evalExpr(innerStream, env);
      return this._maybeInfix(val, stream, env);
    }

    // Unary minus: - followed by something
    if (item.type === 'OP' && item.value === '-') {
      stream.pos++;
      const val = await this._evalExpr(stream, env);
      if (typeof val !== 'number') throw new LogoError(`MINUS DOESN'T LIKE ${stringify(val)} AS INPUT`);
      return this._maybeInfix(-val, stream, env);
    }

    // Word — look up as procedure
    if (item.type === 'WORD') {
      const name = item.value;
      stream.pos++;

      // Special forms
      if (name === 'TO') return this._handleTo(stream, env);
      if (name === 'IF') return this._handleIf(stream, env);
      if (name === 'IFELSE') return this._handleIfElse(stream, env);
      if (name === 'REPEAT') return this._handleRepeat(stream, env);
      if (name === 'MAKE') return this._handleMake(stream, env);
      if (name === 'LOCAL') return this._handleLocal(stream, env);
      if (name === 'OUTPUT' || name === 'OP') {
        const val = await this._evalExpr(stream, env);
        throw new OutputSignal(val);
      }
      if (name === 'STOP') throw new StopSignal();
      if (name === 'BYE') {
        if (typeof window !== 'undefined') window.location.href = '/shell/';
        return;
      }

      // Look up builtin or user procedure
      const builtin = this._builtins[name];
      if (builtin) {
        const args = [];
        for (let i = 0; i < builtin.argc; i++) {
          const a = await this._evalExpr(stream, env);
          if (a === undefined) throw new LogoError(`NOT ENOUGH INPUTS TO ${name}`);
          args.push(a);
        }
        const result = await builtin.fn.apply(this, args);
        if (result !== undefined) return this._maybeInfix(result, stream, env);
        return undefined;
      }

      const proc = this._procs[name];
      if (proc) {
        const args = [];
        for (let i = 0; i < proc.params.length; i++) {
          const a = await this._evalExpr(stream, env);
          if (a === undefined) throw new LogoError(`NOT ENOUGH INPUTS TO ${name}`);
          args.push(a);
        }
        const result = await this._callProc(proc, args);
        if (result !== undefined) return this._maybeInfix(result, stream, env);
        return undefined;
      }

      throw new LogoError(`I DON'T KNOW HOW TO ${name}`);
    }

    // Skip unknown tokens
    stream.pos++;
    return undefined;
  }

  // Check for infix operator after a value
  async _maybeInfix(leftVal, stream, env) {
    while (stream.pos < stream.items.length) {
      const next = stream.items[stream.pos];
      if (next.type !== 'OP') break;
      const op = next.value;
      const prec = this._infixPrec(op);
      if (prec < 0) break;
      stream.pos++;
      let rightVal = await this._evalPrimary(stream, env);
      // Handle higher-precedence operators on the right
      while (stream.pos < stream.items.length) {
        const next2 = stream.items[stream.pos];
        if (next2.type !== 'OP') break;
        const prec2 = this._infixPrec(next2.value);
        if (prec2 <= prec) break;
        stream.pos++;
        const rr = await this._evalPrimary(stream, env);
        rightVal = this._applyInfix(next2.value, rightVal, rr);
      }
      leftVal = this._applyInfix(op, leftVal, rightVal);
    }
    return leftVal;
  }

  // Evaluate a primary (non-infix) expression
  async _evalPrimary(stream, env) {
    if (stream.pos >= stream.items.length) {
      throw new LogoError('NOT ENOUGH INPUTS');
    }
    const item = stream.items[stream.pos];
    if (item.type === 'NUMBER') { stream.pos++; return item.value; }
    if (item.type === 'QUOTED') { stream.pos++; return item.value; }
    if (item.type === 'VAR') {
      stream.pos++;
      const name = item.value.toUpperCase();
      if (!(name in env) && !(name in this._env)) throw new LogoError(`${name} HAS NO VALUE`);
      return name in env ? env[name] : this._env[name];
    }
    if (item.type === 'OP' && item.value === '-') {
      stream.pos++;
      const val = await this._evalPrimary(stream, env);
      return -val;
    }
    if (item.type === 'LPAREN') {
      stream.pos++;
      const inner = [];
      let depth = 1;
      while (stream.pos < stream.items.length && depth > 0) {
        const t = stream.items[stream.pos];
        if (t.type === 'LPAREN') depth++;
        else if (t.type === 'RPAREN') { depth--; if (depth === 0) { stream.pos++; break; } }
        inner.push(stream.items[stream.pos]);
        stream.pos++;
      }
      const is = { items: inner, pos: 0 };
      return await this._evalExpr(is, env);
    }
    if (Array.isArray(item)) { stream.pos++; return item; }
    // Must be a WORD — procedure call that returns a value
    return await this._evalExpr(stream, env);
  }

  _infixPrec(op) {
    if (op === '+' || op === '-') return 1;
    if (op === '*' || op === '/') return 2;
    if (op === '=' || op === '<' || op === '>' || op === '<=' || op === '>=' || op === '<>') return 0;
    return -1;
  }

  _applyInfix(op, a, b) {
    if (op === '+') return num(a) + num(b);
    if (op === '-') return num(a) - num(b);
    if (op === '*') return num(a) * num(b);
    if (op === '/') {
      if (num(b) === 0) throw new LogoError('DIVISION BY ZERO');
      return num(a) / num(b);
    }
    if (op === '=') return a == b ? 'TRUE' : 'FALSE'; // Logo equality
    if (op === '<') return num(a) < num(b) ? 'TRUE' : 'FALSE';
    if (op === '>') return num(a) > num(b) ? 'TRUE' : 'FALSE';
    if (op === '<=') return num(a) <= num(b) ? 'TRUE' : 'FALSE';
    if (op === '>=') return num(a) >= num(b) ? 'TRUE' : 'FALSE';
    if (op === '<>') return a != b ? 'TRUE' : 'FALSE';
    throw new LogoError(`UNKNOWN OPERATOR ${op}`);
  }

  // ---- Special forms ----

  async _handleTo(stream, _env) {
    // TO name :arg1 :arg2 ...
    // Collects the rest of the line as params; body comes later via REPL
    if (stream.pos >= stream.items.length) throw new LogoError('NOT ENOUGH INPUTS TO TO');
    const nameToken = stream.items[stream.pos++];
    if (nameToken.type !== 'WORD') throw new LogoError('TO NEEDS A NAME');
    const name = nameToken.value;
    const params = [];
    while (stream.pos < stream.items.length) {
      const t = stream.items[stream.pos];
      if (t.type === 'VAR') { params.push(t.value.toUpperCase()); stream.pos++; }
      else break;
    }
    // We need the REPL to collect the body lines until END
    // Signal this by setting a pending definition
    this._pendingDef = { name, params, bodyLines: [] };
    return undefined;
  }

  // Called by REPL to add body lines for TO..END
  addDefinitionLine(line) {
    if (!this._pendingDef) return false;
    const trimmed = line.trim().toUpperCase();
    if (trimmed === 'END') {
      const def = this._pendingDef;
      this._pendingDef = null;
      // Parse all body lines into tokens
      const bodySource = def.bodyLines.join('\n');
      const tokens = tokenize(bodySource);
      const body = parseTokens(tokens);
      this._procs[def.name] = { name: def.name, params: def.params, body };
      this._output(`${def.name} DEFINED\n`);
      return true; // definition complete
    }
    this._pendingDef.bodyLines.push(line);
    return false; // still collecting
  }

  get isPendingDefinition() { return !!this._pendingDef; }

  async _handleRepeat(stream, env) {
    const count = await this._evalExpr(stream, env);
    const body = await this._evalExpr(stream, env);
    if (!Array.isArray(body)) throw new LogoError("REPEAT NEEDS A LIST AS SECOND INPUT");
    const n = Math.floor(num(count));
    for (let i = 0; i < n; i++) {
      // Yield to event loop periodically
      if (i > 0 && i % 100 === 0) await yieldTick();
      const localEnv = Object.create(env);
      localEnv['REPCOUNT'] = i + 1;
      try {
        await this._runList([...body], localEnv);
      } catch (e) {
        if (e instanceof StopSignal) return;
        throw e;
      }
    }
  }

  async _handleIf(stream, env) {
    const cond = await this._evalExpr(stream, env);
    const body = await this._evalExpr(stream, env);
    if (!Array.isArray(body)) throw new LogoError("IF NEEDS A LIST AS SECOND INPUT");
    if (isTruthy(cond)) {
      try {
        await this._runList([...body], env);
      } catch (e) {
        if (e instanceof OutputSignal || e instanceof StopSignal) throw e;
        throw e;
      }
    }
  }

  async _handleIfElse(stream, env) {
    const cond = await this._evalExpr(stream, env);
    const tBody = await this._evalExpr(stream, env);
    const fBody = await this._evalExpr(stream, env);
    if (!Array.isArray(tBody)) throw new LogoError("IFELSE NEEDS LISTS");
    if (!Array.isArray(fBody)) throw new LogoError("IFELSE NEEDS LISTS");
    const body = isTruthy(cond) ? tBody : fBody;
    try {
      await this._runList([...body], env);
    } catch (e) {
      if (e instanceof OutputSignal || e instanceof StopSignal) throw e;
      throw e;
    }
  }

  async _handleMake(stream, env) {
    const name = await this._evalExpr(stream, env);
    const value = await this._evalExpr(stream, env);
    const key = String(name).toUpperCase();
    // Set in local env if it exists there, otherwise global
    if (key in env && env !== this._env) {
      env[key] = value;
    } else {
      this._env[key] = value;
    }
  }

  async _handleLocal(stream, env) {
    const name = await this._evalExpr(stream, env);
    env[String(name).toUpperCase()] = '';
  }

  // ---- Procedure call ----

  async _callProc(proc, args) {
    const localEnv = Object.create(this._env);
    for (let i = 0; i < proc.params.length; i++) {
      localEnv[proc.params[i]] = args[i];
    }
    try {
      await this._runList([...proc.body], localEnv);
    } catch (e) {
      if (e instanceof OutputSignal) return e.value;
      if (e instanceof StopSignal) return undefined;
      throw e;
    }
    return undefined;
  }

  // ======================================================================
  // Builtins
  // ======================================================================

  _defineBuiltins() {
    const b = {};
    const t = this._turtle;
    const out = (...args) => this._output(args.join(''));

    // Helper to define a builtin
    const def = (names, argc, fn) => {
      if (typeof names === 'string') names = [names];
      for (const n of names) b[n] = { argc, fn };
    };

    // -- Turtle --
    def(['FORWARD', 'FD'], 1, (d) => t.forward(num(d)));
    def(['BACK', 'BK'], 1, (d) => t.back(num(d)));
    def(['RIGHT', 'RT'], 1, (a) => t.right(num(a)));
    def(['LEFT', 'LT'], 1, (a) => t.left(num(a)));
    def(['PENUP', 'PU'], 0, () => t.penup());
    def(['PENDOWN', 'PD'], 0, () => t.pendown());
    def('HOME', 0, () => t.home());
    def(['CLEARSCREEN', 'CS'], 0, () => t.clearscreen());
    def('SETPOS', 1, (p) => {
      if (!Array.isArray(p) || p.length < 2) throw new LogoError("SETPOS NEEDS A LIST OF TWO NUMBERS");
      t.setpos(num(listVal(p, 0)), num(listVal(p, 1)));
    });
    def('SETX', 1, (x) => t.setx(num(x)));
    def('SETY', 1, (y) => t.sety(num(y)));
    def(['SETHEADING', 'SETH'], 1, (h) => t.setheading(num(h)));
    def('TOWARDS', 1, (p) => {
      if (!Array.isArray(p) || p.length < 2) throw new LogoError("TOWARDS NEEDS A LIST");
      return t.towards(num(listVal(p, 0)), num(listVal(p, 1)));
    });
    def('XCOR', 0, () => t.xcor());
    def('YCOR', 0, () => t.ycor());
    def('HEADING', 0, () => t.getHeading());
    def('POS', 0, () => t.pos());
    def(['PENDOWNP', 'PENDOWN?'], 0, () => t.ispendown() ? 'TRUE' : 'FALSE');
    def(['SETPENCOLOR', 'SETPC'], 1, (c) => t.setpencolor(num(c)));
    def(['PENCOLOR', 'PC'], 0, () => t.penColor);
    def(['SHOWTURTLE', 'ST'], 0, () => t.showturtle());
    def(['HIDETURTLE', 'HT'], 0, () => t.hideturtle());
    def(['SHOWNP', 'SHOWN?'], 0, () => t.shownp() ? 'TRUE' : 'FALSE');
    def('SETPENSIZE', 1, (w) => t.setpensize(num(w)));
    def('ARC', 2, (angle, radius) => t.arc(num(angle), num(radius)));

    // -- I/O --
    def(['PRINT', 'PR'], 1, (v) => out(stringify(v), '\n'));
    def('TYPE', 1, (v) => out(stringify(v)));
    def('SHOW', 1, (v) => out(stringifyShow(v), '\n'));
    def(['CLEARTEXT', 'CT'], 0, () => { this._clearText && this._clearText(); });
    def('READLIST', 0, async () => {
      if (!this._readLine) throw new LogoError('READLIST NOT AVAILABLE');
      const line = await this._readLine('');
      const tokens = tokenize(line);
      return parseTokens(tokens);
    });

    // -- Arithmetic --
    def('SUM', 2, (a, b) => num(a) + num(b));
    def('DIFFERENCE', 2, (a, b) => num(a) - num(b));
    def('PRODUCT', 2, (a, b) => num(a) * num(b));
    def('QUOTIENT', 2, (a, b) => {
      if (num(b) === 0) throw new LogoError('DIVISION BY ZERO');
      return num(a) / num(b);
    });
    def('REMAINDER', 2, (a, b) => num(a) % num(b));
    def('MODULO', 2, (a, b) => ((num(a) % num(b)) + num(b)) % num(b));
    def('MINUS', 1, (a) => -num(a));
    def('ABS', 1, (a) => Math.abs(num(a)));
    def('INT', 1, (a) => Math.trunc(num(a)));
    def('ROUND', 1, (a) => Math.round(num(a)));
    def('SQRT', 1, (a) => Math.sqrt(num(a)));
    def('POWER', 2, (a, b) => Math.pow(num(a), num(b)));
    def('EXP', 1, (a) => Math.exp(num(a)));
    def('LOG', 1, (a) => Math.log(num(a)));
    def('SIN', 1, (a) => Math.sin(num(a) * Math.PI / 180));
    def('COS', 1, (a) => Math.cos(num(a) * Math.PI / 180));
    def('ARCTAN', 1, (a) => Math.atan(num(a)) * 180 / Math.PI);
    def('RANDOM', 1, (n) => Math.floor(Math.random() * num(n)));
    def('MAX', 2, (a, b) => Math.max(num(a), num(b)));
    def('MIN', 2, (a, b) => Math.min(num(a), num(b)));

    // -- Predicates --
    def(['EQUALP', 'EQUAL?'], 2, (a, b) => a == b ? 'TRUE' : 'FALSE');
    def(['NOTEQUALP', 'NOTEQUAL?'], 2, (a, b) => a != b ? 'TRUE' : 'FALSE');
    def(['LESSP', 'LESS?'], 2, (a, b) => num(a) < num(b) ? 'TRUE' : 'FALSE');
    def(['GREATERP', 'GREATER?'], 2, (a, b) => num(a) > num(b) ? 'TRUE' : 'FALSE');
    def(['NUMBERP', 'NUMBER?'], 1, (a) => typeof a === 'number' ? 'TRUE' : 'FALSE');
    def(['WORDP', 'WORD?'], 1, (a) => typeof a === 'string' ? 'TRUE' : 'FALSE');
    def(['LISTP', 'LIST?'], 1, (a) => Array.isArray(a) ? 'TRUE' : 'FALSE');
    def(['EMPTYP', 'EMPTY?'], 1, (a) => {
      if (Array.isArray(a)) return a.length === 0 ? 'TRUE' : 'FALSE';
      return String(a).length === 0 ? 'TRUE' : 'FALSE';
    });
    def(['ZEROP', 'ZERO?'], 1, (a) => num(a) === 0 ? 'TRUE' : 'FALSE');
    def(['MEMBERP', 'MEMBER?'], 2, (item, list) => {
      if (Array.isArray(list)) return list.some(x => x == item) ? 'TRUE' : 'FALSE';
      return String(list).includes(String(item)) ? 'TRUE' : 'FALSE';
    });
    def('AND', 2, (a, b) => (isTruthy(a) && isTruthy(b)) ? 'TRUE' : 'FALSE');
    def('OR', 2, (a, b) => (isTruthy(a) || isTruthy(b)) ? 'TRUE' : 'FALSE');
    def('NOT', 1, (a) => isTruthy(a) ? 'FALSE' : 'TRUE');
    def('TRUE', 0, () => 'TRUE');
    def('FALSE', 0, () => 'FALSE');

    // -- Words & lists --
    def('WORD', 2, (a, b) => String(a) + String(b));
    def('LIST', 2, (a, b) => [a, b]);
    def(['SENTENCE', 'SE'], 2, (a, b) => {
      const la = Array.isArray(a) ? a : [a];
      const lb = Array.isArray(b) ? b : [b];
      return [...la, ...lb];
    });
    def('FPUT', 2, (item, list) => {
      if (!Array.isArray(list)) throw new LogoError("FPUT NEEDS A LIST AS SECOND INPUT");
      return [item, ...list];
    });
    def('LPUT', 2, (item, list) => {
      if (!Array.isArray(list)) throw new LogoError("LPUT NEEDS A LIST AS SECOND INPUT");
      return [...list, item];
    });
    def('FIRST', 1, (thing) => {
      if (Array.isArray(thing)) {
        if (thing.length === 0) throw new LogoError("FIRST OF EMPTY LIST");
        return thing[0];
      }
      const s = String(thing);
      if (s.length === 0) throw new LogoError("FIRST OF EMPTY WORD");
      return s[0];
    });
    def('LAST', 1, (thing) => {
      if (Array.isArray(thing)) {
        if (thing.length === 0) throw new LogoError("LAST OF EMPTY LIST");
        return thing[thing.length - 1];
      }
      const s = String(thing);
      if (s.length === 0) throw new LogoError("LAST OF EMPTY WORD");
      return s[s.length - 1];
    });
    def(['BUTFIRST', 'BF'], 1, (thing) => {
      if (Array.isArray(thing)) return thing.slice(1);
      return String(thing).slice(1);
    });
    def(['BUTLAST', 'BL'], 1, (thing) => {
      if (Array.isArray(thing)) return thing.slice(0, -1);
      return String(thing).slice(0, -1);
    });
    def('COUNT', 1, (thing) => {
      if (Array.isArray(thing)) return thing.length;
      return String(thing).length;
    });
    def('ITEM', 2, (n, thing) => {
      const i = Math.floor(num(n)) - 1; // Logo is 1-indexed
      if (Array.isArray(thing)) {
        if (i < 0 || i >= thing.length) throw new LogoError('INDEX OUT OF BOUNDS');
        return thing[i];
      }
      const s = String(thing);
      if (i < 0 || i >= s.length) throw new LogoError('INDEX OUT OF BOUNDS');
      return s[i];
    });
    def('PICK', 1, (thing) => {
      if (Array.isArray(thing)) return thing[Math.floor(Math.random() * thing.length)];
      const s = String(thing);
      return s[Math.floor(Math.random() * s.length)];
    });
    def('UPPERCASE', 1, (w) => String(w).toUpperCase());
    def('LOWERCASE', 1, (w) => String(w).toLowerCase());
    def('ASCII', 1, (ch) => String(ch).charCodeAt(0));
    def('CHAR', 1, (n) => String.fromCharCode(num(n)));

    // -- Meta --
    def('PROCEDURES', 0, () => {
      const names = Object.keys(this._procs);
      if (names.length === 0) out('NO PROCEDURES DEFINED\n');
      else out(names.join(' ') + '\n');
    });
    def('SAVE', 0, () => {
      try {
        const data = {};
        for (const [name, proc] of Object.entries(this._procs)) {
          data[name] = { params: proc.params, bodyLines: proc.body };
        }
        localStorage.setItem('logo-procs', JSON.stringify(data));
        out('SAVED\n');
      } catch (e) { out('SAVE FAILED\n'); }
    });
    def('LOAD', 0, () => {
      try {
        const raw = localStorage.getItem('logo-procs');
        if (!raw) { out('NOTHING SAVED\n'); return; }
        const data = JSON.parse(raw);
        for (const [name, def] of Object.entries(data)) {
          this._procs[name] = { name, params: def.params, body: def.bodyLines };
        }
        out('LOADED: ' + Object.keys(data).join(' ') + '\n');
      } catch (e) { out('LOAD FAILED\n'); }
    });
    def('ERALL', 0, () => {
      this._procs = {};
      out('ALL PROCEDURES ERASED\n');
    });
    def('THING', 1, (name) => {
      const key = String(name).toUpperCase();
      if (!(key in this._env)) throw new LogoError(`${key} HAS NO VALUE`);
      return this._env[key];
    });
    def(['REPCOUNT', '#'], 0, function() {
      // Accessed via :REPCOUNT in the environment
      return undefined;
    });
    def('WAIT', 1, async (n) => {
      await new Promise(r => setTimeout(r, num(n) * 100 / 6)); // tenths of seconds
    });

    this._builtins = b;
  }
}

// ======================================================================
// Helpers
// ======================================================================

function num(v) {
  if (typeof v === 'number') return v;
  const n = Number(v);
  if (isNaN(n)) throw new LogoError(`${stringify(v)} IS NOT A NUMBER`);
  return n;
}

function isTruthy(v) {
  if (v === 'TRUE' || v === true) return true;
  if (v === 'FALSE' || v === false) return false;
  throw new LogoError(`${stringify(v)} IS NOT TRUE OR FALSE`);
}

function stringify(v) {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) {
    return v.map(stringify).join(' ');
  }
  if (typeof v === 'number') {
    // Clean up floating point display
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  }
  return String(v);
}

function stringifyShow(v) {
  if (Array.isArray(v)) {
    return '[' + v.map(stringifyShow).join(' ') + ']';
  }
  return stringify(v);
}

function listVal(list, i) {
  // Extract a value from a parsed list — items may be tokens or raw values
  const item = list[i];
  if (item === undefined) return 0;
  if (typeof item === 'number') return item;
  if (typeof item === 'string') return Number(item) || 0;
  if (item.type === 'NUMBER') return item.value;
  if (item.type === 'WORD') return Number(item.value) || 0;
  if (item.type === 'QUOTED') return Number(item.value) || 0;
  return 0;
}

function yieldTick() {
  return new Promise(r => setTimeout(r, 0));
}
