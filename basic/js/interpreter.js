// BASIC interpreter — Applesoft-style, circa 1982.
// Line-numbered programs with GOTO, GOSUB, FOR/NEXT, DATA/READ.

export class BasicError extends Error {
  constructor(msg, line) {
    super(msg);
    this.name = 'BasicError';
    this.lineNum = line;
  }
}

// Sentinel for Ctrl-C break
export class BreakError extends Error {
  constructor() { super('BREAK'); this.name = 'BreakError'; }
}

export class BasicInterpreter {
  constructor(output, input, checkBreak) {
    this._output = output;     // function(str)
    this._input = input;       // async function(prompt) => string
    this._checkBreak = checkBreak; // function() => bool (Ctrl-C pressed?)
    this._program = {};        // lineNum -> source string
    this._vars = {};           // variable storage
    this._arrays = {};         // DIM arrays
    this._forStack = [];       // FOR/NEXT stack
    this._gosubStack = [];     // GOSUB/RETURN stack
    this._dataList = [];       // collected DATA values
    this._dataPtr = 0;         // READ pointer
    this._running = false;
    this._fnDefs = {};         // DEF FN definitions
  }

  // Parse and execute immediate mode or store a numbered line
  async execImmediate(line) {
    line = line.trim();
    if (!line) return;

    // Check for line number → store in program
    const m = line.match(/^(\d+)\s*(.*)/);
    if (m) {
      const num = parseInt(m[1]);
      const body = m[2];
      if (!body) {
        delete this._program[num]; // delete line
      } else {
        this._program[num] = body;
      }
      return;
    }

    // Immediate mode command
    const upper = line.toUpperCase();
    if (upper === 'RUN') return this.run();
    if (upper === 'NEW') { this._program = {}; this._vars = {}; this._arrays = {}; this._fnDefs = {}; return; }
    if (upper === 'LIST' || upper.startsWith('LIST ')) return this._list(upper);
    if (upper === 'SAVE') return this._save();
    if (upper === 'LOAD') return this._load();
    if (upper === 'BYE' || upper === 'QUIT' || upper === 'SYSTEM') {
      if (typeof window !== 'undefined') {
        var rows = window._basicDisplay ? window._basicDisplay.getRows() : [];
        try { localStorage.setItem('shell_context', JSON.stringify({ app: 'basic', user: 'rodney', rows: rows })); } catch(e) {}
        window.location.href = '/shell/';
      }
      return;
    }
    if (upper === 'HELP') return this._help();

    // Execute as immediate statement
    await this._execLine(line, 0);
  }

  // Run the stored program
  async run() {
    this._vars = {};
    this._arrays = {};
    this._forStack = [];
    this._gosubStack = [];
    this._dataPtr = 0;
    this._running = true;
    this._collectData();

    const lineNums = this._sortedLines();
    if (lineNums.length === 0) return;

    let pc = 0; // index into lineNums
    let iterations = 0;

    try {
      while (pc < lineNums.length && this._running) {
        // Check for Ctrl-C break
        if (this._checkBreak && this._checkBreak()) {
          throw new BreakError();
        }
        // Yield to event loop periodically so display updates and Ctrl-C works
        iterations++;
        if (iterations % 20 === 0) {
          await new Promise(r => setTimeout(r, 2));
        }

        const lineNum = lineNums[pc];
        const src = this._program[lineNum];
        const result = await this._execLine(src, lineNum);

        if (result && result.type === 'goto') {
          pc = lineNums.indexOf(result.target);
          if (pc < 0) throw new BasicError(`UNDEF'D STATEMENT IN ${lineNum}`, lineNum);
        } else if (result && result.type === 'gosub') {
          this._gosubStack.push(lineNums[pc + 1] !== undefined ? pc + 1 : lineNums.length);
          pc = lineNums.indexOf(result.target);
          if (pc < 0) throw new BasicError(`UNDEF'D STATEMENT IN ${lineNum}`, lineNum);
        } else if (result && result.type === 'return') {
          if (this._gosubStack.length === 0) throw new BasicError('RETURN WITHOUT GOSUB', lineNum);
          pc = this._gosubStack.pop();
        } else if (result && result.type === 'fornext') {
          pc = lineNums.indexOf(result.target);
          if (pc < 0) pc = lineNums.length; // end
        } else if (result && result.type === 'end') {
          break;
        } else {
          pc++;
        }
      }
    } catch (e) {
      if (e instanceof BreakError) {
        const lineNum = pc < lineNums.length ? lineNums[pc] : 0;
        this._output(`\nBREAK IN ${lineNum}\n`);
      } else {
        throw e;
      }
    }
    this._running = false;
  }

  _sortedLines() {
    return Object.keys(this._program).map(Number).sort((a, b) => a - b);
  }

  // Collect all DATA statements
  _collectData() {
    this._dataList = [];
    for (const ln of this._sortedLines()) {
      const src = this._program[ln].toUpperCase();
      const dm = src.match(/^DATA\s+(.*)/i);
      if (dm) {
        const items = dm[1].split(',').map(s => {
          s = s.trim();
          if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
          const n = Number(s);
          return isNaN(n) ? s : n;
        });
        this._dataList.push(...items);
      }
    }
  }

  // Execute one line (may contain : separated statements)
  async _execLine(src, lineNum) {
    // Split on : for multi-statement lines, but not inside strings
    const stmts = this._splitStatements(src);
    for (const stmt of stmts) {
      const result = await this._execStatement(stmt.trim(), lineNum);
      if (result) return result; // GOTO, GOSUB, RETURN, END
    }
    return null;
  }

  _splitStatements(src) {
    const parts = [];
    let current = '';
    let inStr = false;
    for (let i = 0; i < src.length; i++) {
      if (src[i] === '"') inStr = !inStr;
      if (src[i] === ':' && !inStr) {
        parts.push(current);
        current = '';
      } else {
        current += src[i];
      }
    }
    parts.push(current);
    return parts;
  }

  async _execStatement(stmt, lineNum) {
    if (!stmt) return null;
    const upper = stmt.toUpperCase().trimStart();

    // REM — comment
    if (upper.startsWith('REM')) return null;

    // PRINT
    if (upper.startsWith('PRINT') || upper.startsWith('?')) {
      const expr = upper.startsWith('?') ? stmt.slice(1) : stmt.slice(5);
      return this._execPrint(expr.trimStart(), lineNum);
    }

    // INPUT
    if (upper.startsWith('INPUT')) {
      return this._execInput(stmt.slice(5).trimStart(), lineNum);
    }

    // GOTO
    if (upper.startsWith('GOTO')) {
      const target = parseInt(stmt.slice(4).trim());
      return { type: 'goto', target };
    }

    // GOSUB
    if (upper.startsWith('GOSUB')) {
      const target = parseInt(stmt.slice(5).trim());
      return { type: 'gosub', target };
    }

    // RETURN
    if (upper === 'RETURN') return { type: 'return' };

    // END / STOP
    if (upper === 'END' || upper === 'STOP') return { type: 'end' };

    // FOR
    if (upper.startsWith('FOR')) {
      return this._execFor(stmt.slice(3).trimStart(), lineNum);
    }

    // NEXT
    if (upper.startsWith('NEXT')) {
      return this._execNext(stmt.slice(4).trimStart(), lineNum);
    }

    // IF
    if (upper.startsWith('IF')) {
      return this._execIf(stmt.slice(2).trimStart(), lineNum);
    }

    // DIM
    if (upper.startsWith('DIM')) {
      return this._execDim(stmt.slice(3).trimStart(), lineNum);
    }

    // READ
    if (upper.startsWith('READ')) {
      return this._execRead(stmt.slice(4).trimStart(), lineNum);
    }

    // DATA — skip (collected at RUN time)
    if (upper.startsWith('DATA')) return null;

    // RESTORE
    if (upper === 'RESTORE') { this._dataPtr = 0; return null; }

    // DEF FN
    if (upper.startsWith('DEF')) {
      return this._execDef(stmt.slice(3).trimStart(), lineNum);
    }

    // ON ... GOTO / GOSUB
    if (upper.startsWith('ON')) {
      return this._execOn(stmt.slice(2).trimStart(), lineNum);
    }

    // HGR — clear graphics
    if (upper === 'HGR' || upper === 'HGR2') {
      if (this._turtle) this._turtle.clearscreen();
      return null;
    }

    // HCOLOR= n
    if (upper.startsWith('HCOLOR')) {
      const val = stmt.replace(/^HCOLOR\s*=\s*/i, '');
      if (this._turtle) this._turtle.setpencolor(this._evalExpr(val, lineNum));
      return null;
    }

    // HPLOT x,y [TO x,y]*
    if (upper.startsWith('HPLOT')) {
      return this._execHplot(stmt.slice(5).trimStart(), lineNum);
    }

    // TEXT — no-op for now
    if (upper === 'TEXT') return null;

    // LET or assignment: [LET] var = expr
    const letStmt = upper.startsWith('LET') ? stmt.slice(3).trimStart() : stmt;
    const eqIdx = this._findEquals(letStmt);
    if (eqIdx > 0) {
      const varPart = letStmt.slice(0, eqIdx).trim();
      const valPart = letStmt.slice(eqIdx + 1).trim();
      const val = this._evalExpr(valPart, lineNum);
      this._setVar(varPart, val, lineNum);
      return null;
    }

    throw new BasicError(`?SYNTAX ERROR`, lineNum);
  }

  // Find = sign for assignment (not inside parens or after < > comparisons)
  _findEquals(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') depth--;
      else if (s[i] === '"') {
        i++;
        while (i < s.length && s[i] !== '"') i++;
      }
      else if (s[i] === '=' && depth === 0 && i > 0) {
        // Make sure it's not <= >= or part of comparison after IF
        const prev = s[i - 1];
        if (prev === '<' || prev === '>') continue;
        return i;
      }
    }
    return -1;
  }

  // ---- PRINT ----
  _execPrint(expr, lineNum) {
    if (!expr.trim()) { this._output('\n'); return null; }
    let out = '';
    let i = 0;
    const str = expr;

    while (i < str.length) {
      // Skip whitespace
      while (i < str.length && str[i] === ' ') i++;
      if (i >= str.length) break;

      if (str[i] === ';') {
        i++; continue;
      }
      if (str[i] === ',') {
        // Tab to next 14-column stop
        const col = out.length % 14;
        out += ' '.repeat(14 - col);
        i++; continue;
      }

      // Evaluate expression up to next ; or ,
      let end = i;
      let depth = 0;
      let inQ = false;
      while (end < str.length) {
        if (str[end] === '"') inQ = !inQ;
        if (!inQ) {
          if (str[end] === '(') depth++;
          else if (str[end] === ')') depth--;
          else if (depth === 0 && (str[end] === ';' || str[end] === ',')) break;
        }
        end++;
      }

      const sub = str.slice(i, end).trim();
      if (sub) {
        const val = this._evalExpr(sub, lineNum);
        if (typeof val === 'number') {
          out += (val >= 0 ? ' ' : '') + String(val) + ' ';
        } else {
          out += String(val);
        }
      }
      i = end;
    }

    // Newline unless line ends with ; or ,
    const lastChar = expr.trim().slice(-1);
    if (lastChar !== ';' && lastChar !== ',') out += '\n';
    this._output(out);
    return null;
  }

  // ---- INPUT ----
  async _execInput(expr, lineNum) {
    let prompt = '? ';
    let varList = expr;

    // INPUT "prompt";var or INPUT "prompt",var
    const m = expr.match(/^"([^"]*)"\s*[;,]\s*(.*)/);
    if (m) {
      prompt = m[1];
      varList = m[2];
      if (expr.match(/^"[^"]*"\s*;/)) prompt += '? ';
    }

    const vars = varList.split(',').map(v => v.trim()).filter(Boolean);
    const response = await this._input(prompt);
    const values = response.split(',').map(s => s.trim());

    for (let i = 0; i < vars.length; i++) {
      const v = vars[i];
      const raw = values[i] || '';
      if (v.endsWith('$')) {
        this._vars[v.toUpperCase()] = raw;
      } else {
        this._vars[v.toUpperCase()] = Number(raw) || 0;
      }
    }
    return null;
  }

  // ---- FOR ----
  _execFor(expr, lineNum) {
    // FOR I = start TO end [STEP step]
    const m = expr.match(/^(\w+)\s*=\s*(.+?)\s+TO\s+(.+?)(?:\s+STEP\s+(.+))?$/i);
    if (!m) throw new BasicError('?SYNTAX ERROR', lineNum);
    const varName = m[1].toUpperCase();
    const start = this._evalExpr(m[2], lineNum);
    const end = this._evalExpr(m[3], lineNum);
    const step = m[4] ? this._evalExpr(m[4], lineNum) : 1;
    this._vars[varName] = start;
    // afterLine = next line number after FOR (where NEXT loops back to)
    const lines = this._sortedLines();
    const idx = lines.indexOf(lineNum);
    const afterLine = idx >= 0 && idx + 1 < lines.length ? lines[idx + 1] : lineNum;
    this._forStack.push({ varName, end, step, lineNum, afterLine });
    return null;
  }

  // ---- NEXT ----
  _execNext(expr, lineNum) {
    const varName = expr.trim().toUpperCase() || (this._forStack.length > 0 ? this._forStack[this._forStack.length - 1].varName : '');
    // Find matching FOR
    let idx = this._forStack.length - 1;
    while (idx >= 0 && this._forStack[idx].varName !== varName) idx--;
    if (idx < 0) throw new BasicError('NEXT WITHOUT FOR', lineNum);
    const frame = this._forStack[idx];
    this._vars[varName] += frame.step;
    const done = frame.step > 0 ? this._vars[varName] > frame.end : this._vars[varName] < frame.end;
    if (done) {
      this._forStack.splice(idx, 1);
      return null; // continue to next line
    }
    // Loop back to line after FOR
    return { type: 'fornext', target: frame.afterLine };
  }

  // ---- IF ----
  async _execIf(expr, lineNum) {
    // IF cond THEN action [ELSE action]
    // Find THEN
    const upperExpr = expr.toUpperCase();
    const thenIdx = upperExpr.indexOf(' THEN ');
    if (thenIdx < 0) {
      // IF cond THEN might be at end
      if (upperExpr.endsWith(' THEN')) {
        throw new BasicError('?SYNTAX ERROR', lineNum);
      }
      // Try: IF cond GOTO line
      const gotoIdx = upperExpr.indexOf(' GOTO ');
      if (gotoIdx >= 0) {
        const cond = this._evalExpr(expr.slice(0, gotoIdx), lineNum);
        if (this._truthy(cond)) {
          return { type: 'goto', target: parseInt(expr.slice(gotoIdx + 6).trim()) };
        }
        return null;
      }
      throw new BasicError('?SYNTAX ERROR', lineNum);
    }
    const cond = this._evalExpr(expr.slice(0, thenIdx), lineNum);
    if (!this._truthy(cond)) {
      // Check for ELSE
      const elseIdx = upperExpr.indexOf(' ELSE ', thenIdx);
      if (elseIdx >= 0) {
        return this._execStatement(expr.slice(elseIdx + 6).trimStart(), lineNum);
      }
      return null;
    }
    const action = expr.slice(thenIdx + 6).trim();
    // If action is a line number, GOTO it
    if (/^\d+$/.test(action)) {
      return { type: 'goto', target: parseInt(action) };
    }
    // Check for ELSE and strip it
    const elseIdx = action.toUpperCase().indexOf(' ELSE ');
    const thenAction = elseIdx >= 0 ? action.slice(0, elseIdx) : action;
    return this._execStatement(thenAction.trim(), lineNum);
  }

  // ---- DIM ----
  _execDim(expr, lineNum) {
    const parts = expr.split(',');
    for (const p of parts) {
      const m = p.trim().match(/^(\w+\$?)\s*\((.+)\)/i);
      if (!m) throw new BasicError('?SYNTAX ERROR', lineNum);
      const name = m[1].toUpperCase();
      const dims = m[2].split(',').map(d => Math.floor(this._evalExpr(d.trim(), lineNum)) + 1);
      const size = dims.reduce((a, b) => a * b, 1);
      this._arrays[name] = { dims, data: new Array(size).fill(name.endsWith('$') ? '' : 0) };
    }
    return null;
  }

  // ---- READ ----
  _execRead(expr, lineNum) {
    const vars = expr.split(',').map(v => v.trim());
    for (const v of vars) {
      if (this._dataPtr >= this._dataList.length) throw new BasicError('?OUT OF DATA ERROR', lineNum);
      const val = this._dataList[this._dataPtr++];
      const name = v.toUpperCase();
      this._vars[name] = name.endsWith('$') ? String(val) : Number(val) || 0;
    }
    return null;
  }

  // ---- DEF FN ----
  _execDef(expr, lineNum) {
    // DEF FNA(X) = X * 2
    const m = expr.match(/^(FN\w+)\s*\((\w+)\)\s*=\s*(.+)/i);
    if (!m) throw new BasicError('?SYNTAX ERROR', lineNum);
    this._fnDefs[m[1].toUpperCase()] = { param: m[2].toUpperCase(), body: m[3] };
    return null;
  }

  // ---- ON ... GOTO/GOSUB ----
  _execOn(expr, lineNum) {
    const m = expr.match(/^(.+?)\s+(GOTO|GOSUB)\s+(.+)/i);
    if (!m) throw new BasicError('?SYNTAX ERROR', lineNum);
    const idx = Math.floor(this._evalExpr(m[1], lineNum));
    const type = m[2].toUpperCase() === 'GOTO' ? 'goto' : 'gosub';
    const targets = m[3].split(',').map(s => parseInt(s.trim()));
    if (idx < 1 || idx > targets.length) return null; // out of range = skip
    return { type, target: targets[idx - 1] };
  }

  // ---- HPLOT ----
  _execHplot(expr, lineNum) {
    if (!this._turtle) return null;
    const parts = expr.split(/\s+TO\s+/i);
    let first = true;
    for (const part of parts) {
      const coords = part.split(',').map(s => this._evalExpr(s.trim(), lineNum));
      if (coords.length < 2) throw new BasicError('?SYNTAX ERROR', lineNum);
      const x = coords[0] - 140; // center: 140, 96 in 280x192
      const y = 96 - coords[1];
      if (first) {
        this._turtle.penup();
        this._turtle.setpos(x, y);
        this._turtle.pendown();
        // Plot single point
        if (parts.length === 1) {
          this._turtle.forward(0.5);
          this._turtle.back(0.5);
        }
        first = false;
      } else {
        this._turtle.setpos(x, y);
      }
    }
    return null;
  }

  // ---- Expression evaluator ----
  _evalExpr(expr, lineNum) {
    expr = expr.trim();
    if (!expr) return 0;
    const tokens = this._tokenizeExpr(expr);
    const result = this._parseOr(tokens, lineNum);
    return result.value;
  }

  _tokenizeExpr(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      if (expr[i] === ' ') { i++; continue; }
      // String literal
      if (expr[i] === '"') {
        let s = '';
        i++;
        while (i < expr.length && expr[i] !== '"') s += expr[i++];
        if (i < expr.length) i++; // skip closing "
        tokens.push({ type: 'STR', value: s });
        continue;
      }
      // Number
      if (/[0-9.]/.test(expr[i])) {
        let n = '';
        while (i < expr.length && /[0-9.E]/.test(expr[i].toUpperCase())) {
          if (expr[i].toUpperCase() === 'E' && i + 1 < expr.length && /[0-9+-]/.test(expr[i + 1])) {
            n += expr[i++]; n += expr[i++];
          } else {
            n += expr[i++];
          }
        }
        tokens.push({ type: 'NUM', value: parseFloat(n) });
        continue;
      }
      // Operators
      if ('<>=+-*/^'.includes(expr[i])) {
        let op = expr[i++];
        if ((op === '<' || op === '>') && i < expr.length && (expr[i] === '=' || expr[i] === '>')) {
          op += expr[i++];
        }
        tokens.push({ type: 'OP', value: op });
        continue;
      }
      if (expr[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
      if (expr[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
      if (expr[i] === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }
      if (expr[i] === ';') { tokens.push({ type: 'SEMI' }); i++; continue; }
      // Word (function, variable, keyword)
      if (/[A-Za-z]/.test(expr[i])) {
        let w = '';
        while (i < expr.length && /[A-Za-z0-9$]/.test(expr[i])) w += expr[i++];
        tokens.push({ type: 'WORD', value: w.toUpperCase() });
        continue;
      }
      i++; // skip unknown
    }
    tokens.push({ type: 'END' });
    return { items: tokens, pos: 0 };
  }

  _peek(t) { return t.items[t.pos]; }
  _next(t) { return t.items[t.pos++]; }

  // Precedence climbing
  _parseOr(t, ln) {
    let left = this._parseAnd(t, ln);
    while (this._peek(t).type === 'WORD' && this._peek(t).value === 'OR') {
      this._next(t);
      const right = this._parseAnd(t, ln);
      left = { value: (this._truthy(left.value) || this._truthy(right.value)) ? 1 : 0 };
    }
    return left;
  }

  _parseAnd(t, ln) {
    let left = this._parseNot(t, ln);
    while (this._peek(t).type === 'WORD' && this._peek(t).value === 'AND') {
      this._next(t);
      const right = this._parseNot(t, ln);
      left = { value: (this._truthy(left.value) && this._truthy(right.value)) ? 1 : 0 };
    }
    return left;
  }

  _parseNot(t, ln) {
    if (this._peek(t).type === 'WORD' && this._peek(t).value === 'NOT') {
      this._next(t);
      const val = this._parseCompare(t, ln);
      return { value: this._truthy(val.value) ? 0 : 1 };
    }
    return this._parseCompare(t, ln);
  }

  _parseCompare(t, ln) {
    let left = this._parseAdd(t, ln);
    while (this._peek(t).type === 'OP' && '= < > <= >= <> ><'.split(' ').includes(this._peek(t).value)) {
      const op = this._next(t).value;
      const right = this._parseAdd(t, ln);
      const a = left.value, b = right.value;
      if (op === '=') left = { value: a == b ? 1 : 0 };
      else if (op === '<') left = { value: a < b ? 1 : 0 };
      else if (op === '>') left = { value: a > b ? 1 : 0 };
      else if (op === '<=') left = { value: a <= b ? 1 : 0 };
      else if (op === '>=') left = { value: a >= b ? 1 : 0 };
      else if (op === '<>' || op === '><') left = { value: a != b ? 1 : 0 };
    }
    return left;
  }

  _parseAdd(t, ln) {
    let left = this._parseMul(t, ln);
    while (this._peek(t).type === 'OP' && (this._peek(t).value === '+' || this._peek(t).value === '-')) {
      const op = this._next(t).value;
      const right = this._parseMul(t, ln);
      if (op === '+') {
        if (typeof left.value === 'string' || typeof right.value === 'string')
          left = { value: String(left.value) + String(right.value) };
        else left = { value: left.value + right.value };
      } else {
        left = { value: left.value - right.value };
      }
    }
    return left;
  }

  _parseMul(t, ln) {
    let left = this._parsePow(t, ln);
    while (this._peek(t).type === 'OP' && (this._peek(t).value === '*' || this._peek(t).value === '/')) {
      const op = this._next(t).value;
      const right = this._parsePow(t, ln);
      if (op === '*') left = { value: left.value * right.value };
      else {
        if (right.value === 0) throw new BasicError('?DIVISION BY ZERO ERROR', ln);
        left = { value: left.value / right.value };
      }
    }
    return left;
  }

  _parsePow(t, ln) {
    let left = this._parseUnary(t, ln);
    while (this._peek(t).type === 'OP' && this._peek(t).value === '^') {
      this._next(t);
      const right = this._parseUnary(t, ln);
      left = { value: Math.pow(left.value, right.value) };
    }
    return left;
  }

  _parseUnary(t, ln) {
    if (this._peek(t).type === 'OP' && this._peek(t).value === '-') {
      this._next(t);
      const val = this._parsePrimary(t, ln);
      return { value: -val.value };
    }
    if (this._peek(t).type === 'OP' && this._peek(t).value === '+') {
      this._next(t);
    }
    return this._parsePrimary(t, ln);
  }

  _parsePrimary(t, ln) {
    const tok = this._peek(t);

    if (tok.type === 'NUM') { this._next(t); return { value: tok.value }; }
    if (tok.type === 'STR') { this._next(t); return { value: tok.value }; }

    if (tok.type === 'LPAREN') {
      this._next(t);
      const val = this._parseOr(t, ln);
      if (this._peek(t).type === 'RPAREN') this._next(t);
      return val;
    }

    if (tok.type === 'WORD') {
      const name = tok.value;
      this._next(t);

      // Built-in functions
      const fn = this._builtinFn(name, t, ln);
      if (fn !== undefined) return { value: fn };

      // DEF FN
      if (this._fnDefs[name]) {
        const def = this._fnDefs[name];
        if (this._peek(t).type === 'LPAREN') {
          this._next(t);
          const argVal = this._parseOr(t, ln).value;
          if (this._peek(t).type === 'RPAREN') this._next(t);
          const saved = this._vars[def.param];
          this._vars[def.param] = argVal;
          const result = this._evalExpr(def.body, ln);
          if (saved !== undefined) this._vars[def.param] = saved;
          else delete this._vars[def.param];
          return { value: result };
        }
      }

      // Array access
      if (this._peek(t).type === 'LPAREN' && this._arrays[name]) {
        return { value: this._getArray(name, t, ln) };
      }

      // Variable
      if (name in this._vars) return { value: this._vars[name] };
      // Default: 0 for numeric, "" for string
      return { value: name.endsWith('$') ? '' : 0 };
    }

    // Fallback
    this._next(t);
    return { value: 0 };
  }

  _builtinFn(name, t, ln) {
    const expectArgs = (n) => {
      if (this._peek(t).type !== 'LPAREN') throw new BasicError('?SYNTAX ERROR', ln);
      this._next(t);
      const args = [];
      for (let i = 0; i < n; i++) {
        if (i > 0) {
          if (this._peek(t).type === 'COMMA') this._next(t);
        }
        args.push(this._parseOr(t, ln).value);
      }
      if (this._peek(t).type === 'RPAREN') this._next(t);
      return args;
    };
    const oneArg = () => expectArgs(1)[0];

    switch (name) {
      case 'ABS': return Math.abs(oneArg());
      case 'INT': return Math.floor(oneArg());
      case 'SGN': { const v = oneArg(); return v > 0 ? 1 : v < 0 ? -1 : 0; }
      case 'SQR': return Math.sqrt(oneArg());
      case 'SIN': return Math.sin(oneArg());
      case 'COS': return Math.cos(oneArg());
      case 'TAN': return Math.tan(oneArg());
      case 'ATN': return Math.atan(oneArg());
      case 'LOG': return Math.log(oneArg());
      case 'EXP': return Math.exp(oneArg());
      case 'RND': { oneArg(); return Math.random(); }
      case 'LEN': return String(oneArg()).length;
      case 'VAL': return Number(oneArg()) || 0;
      case 'ASC': { const s = String(oneArg()); return s.length > 0 ? s.charCodeAt(0) : 0; }
      case 'CHR$': return String.fromCharCode(Math.floor(oneArg()));
      case 'STR$': return String(oneArg());
      case 'LEFT$': { const [s, n] = expectArgs(2); return String(s).slice(0, Math.floor(n)); }
      case 'RIGHT$': { const [s, n] = expectArgs(2); return String(s).slice(-Math.floor(n)); }
      case 'MID$': {
        if (this._peek(t).type !== 'LPAREN') throw new BasicError('?SYNTAX ERROR', ln);
        this._next(t);
        const s = String(this._parseOr(t, ln).value);
        if (this._peek(t).type === 'COMMA') this._next(t);
        const start = Math.floor(this._parseOr(t, ln).value);
        let len = s.length;
        if (this._peek(t).type === 'COMMA') { this._next(t); len = Math.floor(this._parseOr(t, ln).value); }
        if (this._peek(t).type === 'RPAREN') this._next(t);
        return s.slice(start - 1, start - 1 + len);
      }
      case 'TAB': { const n = Math.floor(oneArg()); return ' '.repeat(Math.max(0, n)); }
      case 'SPC': { const n = Math.floor(oneArg()); return ' '.repeat(Math.max(0, n)); }
      case 'PEEK': { oneArg(); return 0; } // stub
      default: return undefined;
    }
  }

  // Array access
  _getArray(name, t, ln) {
    this._next(t); // skip (
    const indices = [];
    while (true) {
      indices.push(Math.floor(this._parseOr(t, ln).value));
      if (this._peek(t).type === 'COMMA') { this._next(t); continue; }
      break;
    }
    if (this._peek(t).type === 'RPAREN') this._next(t);
    const arr = this._arrays[name];
    if (!arr) throw new BasicError('?BAD SUBSCRIPT ERROR', ln);
    let idx = 0;
    for (let i = 0; i < indices.length; i++) {
      if (indices[i] < 0 || indices[i] >= arr.dims[i])
        throw new BasicError('?BAD SUBSCRIPT ERROR', ln);
      let mul = 1;
      for (let j = i + 1; j < arr.dims.length; j++) mul *= arr.dims[j];
      idx += indices[i] * mul;
    }
    return arr.data[idx];
  }

  // Set variable or array element
  _setVar(varPart, val, ln) {
    const m = varPart.match(/^(\w+\$?)\s*\((.+)\)$/);
    if (m) {
      // Array assignment
      const name = m[1].toUpperCase();
      if (!this._arrays[name]) {
        // Auto-DIM with size 11
        const dims = m[2].split(',').map(() => 11);
        this._arrays[name] = { dims, data: new Array(dims.reduce((a, b) => a * b, 1)).fill(name.endsWith('$') ? '' : 0) };
      }
      const indices = m[2].split(',').map(s => Math.floor(this._evalExpr(s.trim(), ln)));
      const arr = this._arrays[name];
      let idx = 0;
      for (let i = 0; i < indices.length; i++) {
        if (indices[i] < 0 || indices[i] >= arr.dims[i])
          throw new BasicError('?BAD SUBSCRIPT ERROR', ln);
        let mul = 1;
        for (let j = i + 1; j < arr.dims.length; j++) mul *= arr.dims[j];
        idx += indices[i] * mul;
      }
      arr.data[idx] = val;
    } else {
      this._vars[varPart.toUpperCase()] = val;
    }
  }

  _truthy(v) {
    return v !== 0 && v !== '' && v !== null && v !== undefined;
  }

  // ---- LIST ----
  _list(cmd) {
    const lines = this._sortedLines();
    const m = cmd.match(/^LIST\s+(\d+)\s*-?\s*(\d*)/i);
    let from = 0, to = Infinity;
    if (m) {
      from = parseInt(m[1]) || 0;
      to = m[2] ? parseInt(m[2]) : from;
    }
    for (const ln of lines) {
      if (ln >= from && ln <= to) {
        this._output(`${ln} ${this._program[ln]}\n`);
      }
    }
  }

  // ---- SAVE / LOAD ----
  _save() {
    try {
      localStorage.setItem('basic-program', JSON.stringify(this._program));
      this._output('SAVED\n');
    } catch (e) { this._output('SAVE FAILED\n'); }
  }

  _load() {
    try {
      const raw = localStorage.getItem('basic-program');
      if (!raw) { this._output('NO PROGRAM SAVED\n'); return; }
      this._program = JSON.parse(raw);
      this._output('LOADED\n');
    } catch (e) { this._output('LOAD FAILED\n'); }
  }

  // ---- HELP ----
  _help() {
    const o = this._output;
    o('STATEMENTS: PRINT INPUT LET IF/THEN/ELSE GOTO GOSUB\n');
    o('  RETURN FOR/NEXT DIM READ DATA RESTORE DEF REM END\n');
    o('COMMANDS:   RUN LIST NEW SAVE LOAD BYE HELP\n');
    o('GRAPHICS:   HGR HCOLOR= HPLOT [TO] TEXT\n');
    o('FUNCTIONS:  ABS INT SGN SQR SIN COS TAN ATN LOG EXP\n');
    o('  RND LEN VAL ASC CHR$ STR$ LEFT$ RIGHT$ MID$ TAB\n');
    o('OPERATORS:  + - * / ^ = < > <= >= <> AND OR NOT\n');
    o('\n');
    o('TRY:  10 FOR I = 1 TO 10\n');
    o('      20 PRINT I * I\n');
    o('      30 NEXT I\n');
    o('      RUN\n');
  }

  // Wire up turtle for HGR/HPLOT
  setTurtle(turtle) { this._turtle = turtle; }
}
