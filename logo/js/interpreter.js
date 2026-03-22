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
      if (name === 'HELP') return this._handleHelp(stream, env);
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
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('shell_context', JSON.stringify({ app: 'logo', user: 'rodney', rows: null })); } catch(e) {}
          window.location.href = '/shell/';
        }
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

  async _handleHelp(stream, env) {
    const TOPICS = {
      FORWARD:    'FORWARD n (FD n) — move forward n steps\n  try: FD 50',
      FD:         'FORWARD n (FD n) — move forward n steps\n  try: FD 50',
      BACK:       'BACK n (BK n) — move backward n steps\n  try: BK 30',
      BK:         'BACK n (BK n) — move backward n steps\n  try: BK 30',
      RIGHT:      'RIGHT n (RT n) — turn right n degrees\n  try: RT 90',
      RT:         'RIGHT n (RT n) — turn right n degrees\n  try: RT 90',
      LEFT:       'LEFT n (LT n) — turn left n degrees\n  try: LT 45',
      LT:         'LEFT n (LT n) — turn left n degrees\n  try: LT 45',
      PENUP:      'PENUP (PU) — lift pen, stop drawing\n  try: PU FD 50 PD FD 50',
      PU:         'PENUP (PU) — lift pen, stop drawing\n  try: PU FD 50 PD FD 50',
      PENDOWN:    'PENDOWN (PD) — lower pen, start drawing\n  try: PU FD 50 PD FD 50',
      PD:         'PENDOWN (PD) — lower pen, start drawing\n  try: PU FD 50 PD FD 50',
      HOME:       'HOME — move turtle to center, heading north\n  try: FD 50 RT 90 FD 50 HOME',
      CLEARSCREEN:'CLEARSCREEN (CS) — clear screen and home turtle\n  try: CS',
      CS:         'CLEARSCREEN (CS) — clear screen and home turtle\n  try: CS',
      SETPOS:     'SETPOS [x y] — move to position\n  try: SETPOS [50 50]',
      SETHEADING: 'SETHEADING n (SETH n) — set heading (0=N 90=E 180=S 270=W)\n  try: SETH 45 FD 50',
      SETH:       'SETHEADING n (SETH n) — set heading (0=N 90=E 180=S 270=W)\n  try: SETH 45 FD 50',
      SETPENCOLOR:'SETPENCOLOR n (SETPC) — set color (0-7 or CSS name)\n  0=black 1=white 2=green 3=violet 4=orange 5=blue 6=cyan 7=yellow\n  try: SETPC 4 FD 80\n  try: SETPC "PURPLE FD 80',
      SETPC:      'SETPENCOLOR n (SETPC) — set color (0-7 or CSS name)\n  try: SETPC 4 FD 80',
      SETPENSIZE: 'SETPENSIZE n — set pen width\n  try: SETPENSIZE 3 FD 80',
      SHOWTURTLE: 'SHOWTURTLE (ST) — show turtle cursor\n  try: HT WAIT 30 ST',
      ST:         'SHOWTURTLE (ST) — show turtle cursor',
      HIDETURTLE: 'HIDETURTLE (HT) — hide turtle cursor\n  try: HT',
      HT:         'HIDETURTLE (HT) — hide turtle cursor\n  try: HT',
      REPEAT:     'REPEAT n [commands] — run commands n times\n  :REPCOUNT gives the current iteration (1, 2, ...)\n  try: REPEAT 4 [FD 50 RT 90]\n  try: REPEAT 36 [FD 50 RT 170]',
      IF:         'IF condition [commands] — run if TRUE\n  try: MAKE "X 5 IF :X > 3 [PRINT "BIG]',
      IFELSE:     'IFELSE cond [true] [false]\n  try: MAKE "X 5 IFELSE :X > 3 [PRINT "BIG] [PRINT "SMALL]',
      TO:         'TO name :arg ... — define a procedure, end with END\n  try:\n  TO SQUARE :SIZE\n    REPEAT 4 [FD :SIZE RT 90]\n  END\n  SQUARE 50',
      MAKE:       'MAKE "name value — set a variable\n  try: MAKE "SIDE 60 FD :SIDE',
      PRINT:      'PRINT value (PR) — print and newline\n  try: PRINT 3 + 4\n  try: PRINT [HELLO WORLD]',
      PR:         'PRINT value (PR) — print and newline\n  try: PR "HELLO',
      TYPE:       'TYPE value — print without newline\n  try: TYPE "HELLO TYPE "WORLD PRINT ""',
      SHOW:       'SHOW value — print with brackets for lists\n  try: SHOW [1 2 3]',
      OUTPUT:     'OUTPUT value (OP) — return value from a procedure\n  try:\n  TO DOUBLE :N\n    OUTPUT :N * 2\n  END\n  PRINT DOUBLE 21',
      OP:         'OUTPUT value (OP) — return value from a procedure',
      STOP:       'STOP — exit a procedure without returning a value',
      BYE:        'BYE — exit Logo and return to the shell',
      SAVE:       'SAVE — save all procedures to browser storage',
      LOAD:       'LOAD — restore saved procedures',
      WAIT:       'WAIT n — pause for n/60 seconds\n  try: REPEAT 4 [FD 50 RT 90 WAIT 10]',
      RANDOM:     'RANDOM n — random integer 0 to n-1\n  try: PRINT RANDOM 100',
      ARC:        'ARC angle radius — draw arc\n  try: ARC 360 40',
      FIRST:      'FIRST thing — first element or character\n  try: PRINT FIRST [A B C]',
      LAST:       'LAST thing — last element or character\n  try: PRINT LAST [A B C]',
      BUTFIRST:   'BUTFIRST thing (BF) — all but first\n  try: PRINT BF [A B C]',
      BF:         'BUTFIRST thing (BF) — all but first\n  try: PRINT BF [A B C]',
      BUTLAST:    'BUTLAST thing (BL) — all but last\n  try: PRINT BL [A B C]',
      BL:         'BUTLAST thing (BL) — all but last',
      COUNT:      'COUNT thing — number of elements/characters\n  try: PRINT COUNT [A B C D]',
      LIST:       'LIST a b — make a two-element list\n  try: SHOW LIST 1 2',
      SENTENCE:   'SENTENCE a b (SE) — combine into flat list\n  try: SHOW SE [A B] [C D]',
      SE:         'SENTENCE a b (SE) — combine into flat list',
      WORD:       'WORD a b — join two words\n  try: PRINT WORD "HELLO "WORLD',
      FPUT:       'FPUT item list — add to front\n  try: SHOW FPUT 0 [1 2 3]',
      LPUT:       'LPUT item list — add to end\n  try: SHOW LPUT 4 [1 2 3]',
      PICK:       'PICK list — random element\n  try: PRINT PICK [RED GREEN BLUE]',
      PROCEDURES: 'PROCEDURES — list all defined procedures',
      XCOR:       'XCOR — turtle x coordinate\n  try: PRINT XCOR',
      YCOR:       'YCOR — turtle y coordinate',
      HEADING:    'HEADING — turtle heading in degrees',
      POS:        'POS — turtle position as [x y]',
      ITEM:       'ITEM n list — nth element (1-indexed)\n  try: PRINT ITEM 2 [A B C]',
      AND:        'AND a b — TRUE if both TRUE',
      OR:         'OR a b — TRUE if either TRUE',
      NOT:        'NOT a — TRUE if FALSE, FALSE if TRUE',
      EQUALP:     'EQUALP a b (EQUAL?) — TRUE if equal\n  try: PRINT EQUALP 3 3',
      'EQUAL?':   'EQUALP a b (EQUAL?) — TRUE if equal',
      LOCAL:      'LOCAL "name — declare a local variable in current procedure',
      '+':        '+ (infix) — addition\n  try: PRINT 3 + 4',
      '-':        '- (infix) — subtraction, or unary minus\n  try: PRINT 10 - 3\n  try: PRINT - 5',
      '*':        '* (infix) — multiplication\n  try: PRINT 6 * 7',
      '/':        '/ (infix) — division\n  try: PRINT 22 / 7',
      '=':        '= (infix) — equality test, returns TRUE or FALSE\n  try: PRINT 3 = 3\n  try: PRINT 3 = 4',
      '<':        '< (infix) — less than\n  try: PRINT 3 < 5',
      '>':        '> (infix) — greater than\n  try: PRINT 5 > 3',
      '<=':       '<= (infix) — less than or equal',
      '>=':       '>= (infix) — greater than or equal',
      '<>':       '<> (infix) — not equal\n  try: PRINT 3 <> 4',
    };
    // Optionally consume one argument (topic)
    let topic = '';
    if (stream.pos < stream.items.length) {
      const next = stream.items[stream.pos];
      if (next.type === 'QUOTED') { topic = next.value.toUpperCase(); stream.pos++; }
      else if (next.type === 'WORD') { topic = next.value; stream.pos++; }
      else if (next.type === 'OP') { topic = next.value; stream.pos++; }
    }
    if (topic && TOPICS[topic]) {
      this._output(TOPICS[topic] + '\n');
      return;
    }
    if (topic) {
      this._output(`NO HELP FOR ${topic}\n`);
      return;
    }
    // General help
    const out = (...args) => this._output(args.join(''));
    out('TURTLE:  FD BK RT LT  PU PD  HOME CS  ST HT\n');
    out('         SETPOS SETH SETPC SETPENSIZE ARC\n');
    out('CONTROL: REPEAT IF IFELSE TO/END OUTPUT STOP\n');
    out('VARS:    MAKE "NAME VALUE   :NAME   LOCAL\n');
    out('MATH:    + - * / = < >   SQRT POWER RANDOM\n');
    out('LOGIC:   AND OR NOT  EQUALP LESSP GREATERP\n');
    out('LISTS:   LIST FIRST LAST BF BL FPUT LPUT COUNT\n');
    out('I/O:     PRINT TYPE SHOW CT\n');
    out('OTHER:   PROCEDURES SAVE LOAD ERALL WAIT BYE\n');
    out('\n');
    out('TRY:     REPEAT 36 [FD 50 RT 170]\n');
    out('\n');
    out('TYPE HELP "COMMAND FOR DETAILS\n');
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
    def(['SETPENCOLOR', 'SETPC'], 1, (c) => {
      if (typeof c === 'number') t.setpencolor(c);
      else t.setpencolor(String(c).toLowerCase());
    });
    def(['PENCOLOR', 'PC'], 0, () => t._penCSS || t.penColor);
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
    def('HELP', 0, () => {
      // Handled as special form in _handleHelp; this is a fallback

      out('TURTLE:  FD BK RT LT  PU PD  HOME CS  ST HT\n');
      out('         SETPOS SETH SETPC SETPENSIZE ARC\n');
      out('CONTROL: REPEAT IF IFELSE TO/END OUTPUT STOP\n');
      out('VARS:    MAKE "NAME VALUE   :NAME   LOCAL\n');
      out('MATH:    + - * / = < >   SQRT POWER RANDOM\n');
      out('LOGIC:   AND OR NOT  EQUALP LESSP GREATERP\n');
      out('LISTS:   LIST FIRST LAST BF BL FPUT LPUT COUNT\n');
      out('I/O:     PRINT TYPE SHOW CT\n');
      out('OTHER:   PROCEDURES SAVE LOAD ERALL WAIT BYE\n');
      out('\n');
      out('TRY:     REPEAT 36 [FD 50 RT 170]\n');
      out('\n');
      out('TO SPIRAL :SIZE :ANGLE\n');
      out('  IF :SIZE > 100 [STOP]\n');
      out('  FD :SIZE RT :ANGLE\n');
      out('  SPIRAL :SIZE + 2 :ANGLE\n');
      out('END\n');
      out('SPIRAL 1 91\n');
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
