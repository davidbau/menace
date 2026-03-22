// parser.js -- Recursive-descent parser for the 1982 sh subset.
//
// Consumes tokens from Lexer and produces an AST.
//
// AST node types:
//   { type:'List',     cmds: [node], ops: ['next'|'and'|'or'] }
//   { type:'Pipeline', cmds: [node] }
//   { type:'Simple',   words: [string], redirs: [redir] }
//   { type:'If',       cond: node, then: node, elifs: [{cond,then}], els: node|null }
//   { type:'While',    cond: node, body: node, until: bool }
//   { type:'For',      name: string, words: [string]|null, body: node }
//   { type:'Case',     word: string, items: [{patterns:[string], body:node}] }
//   { type:'Group',    body: node, subshell: bool }
//   { type:'Funcdef',  name: string, body: node }
//   { type:'Noop' }
//
// redir: { kind:'out'|'app'|'in'|'here'|'dup', word:string, raw:bool }

import { T } from './lexer.js';

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  _peek() { return this.tokens[this.pos]; }
  _eat(type) {
    const tok = this.tokens[this.pos];
    if (type && tok.type !== type) throw new SyntaxError(`Expected ${type}, got ${tok.type} (${tok.value})`);
    this.pos++;
    return tok;
  }
  _at(...types) { return types.includes(this._peek().type); }
  _skipNewlines() { while (this._at(T.NEWLINE)) this._eat(T.NEWLINE); }

  parse() {
    this._skipNewlines();
    const node = this._parseList();
    return node;
  }

  // list ::= pipeline { (';' | NEWLINE | '&&' | '||') pipeline }
  _parseList() {
    const cmds = [];
    const ops = [];

    this._skipNewlines();
    if (this._at(T.EOF, T.THEN, T.ELIF, T.ELSE, T.FI, T.DO, T.DONE, T.ESAC, T.RBRACE, T.RPAREN)) {
      return { type: 'Noop' };
    }

    cmds.push(this._parsePipeline());

    while (true) {
      if (this._at(T.SEMI, T.NEWLINE)) {
        this._eat();
        this._skipNewlines();
        ops.push('next');
        if (this._at(T.EOF, T.THEN, T.ELIF, T.ELSE, T.FI, T.DO, T.DONE, T.ESAC, T.RBRACE, T.RPAREN)) break;
        cmds.push(this._parsePipeline());
      } else if (this._at(T.AND)) {
        this._eat();
        this._skipNewlines();
        ops.push('and');
        cmds.push(this._parsePipeline());
      } else if (this._at(T.OR)) {
        this._eat();
        this._skipNewlines();
        ops.push('or');
        cmds.push(this._parsePipeline());
      } else {
        break;
      }
    }

    if (cmds.length === 1 && ops.length === 0) return cmds[0];
    return { type: 'List', cmds, ops };
  }

  // pipeline ::= command { '|' command }
  _parsePipeline() {
    const cmds = [this._parseCommand()];
    while (this._at(T.PIPE)) {
      this._eat(T.PIPE);
      this._skipNewlines();
      cmds.push(this._parseCommand());
    }
    if (cmds.length === 1) return cmds[0];
    return { type: 'Pipeline', cmds };
  }

  // command ::= simple | compound | funcdef
  _parseCommand() {
    const tok = this._peek();

    // Function definition: NAME () { ... }
    if (tok.type === T.FUNC) {
      this._eat(T.FUNC);
      this._skipNewlines();
      const body = this._parseCompound();
      return { type: 'Funcdef', name: tok.value, body };
    }

    // Compound commands
    if (tok.type === T.IF)    return this._parseIf();
    if (tok.type === T.WHILE) return this._parseWhile(false);
    if (tok.type === T.UNTIL) return this._parseWhile(true);
    if (tok.type === T.FOR)   return this._parseFor();
    if (tok.type === T.CASE)  return this._parseCase();
    if (tok.type === T.LBRACE) {
      this._eat(T.LBRACE);
      this._skipNewlines();
      const body = this._parseList();
      this._skipNewlines();
      this._eat(T.RBRACE);
      const redirs = this._parseRedirs();
      return { type: 'Group', body, subshell: false, redirs };
    }
    if (tok.type === T.LPAREN) {
      this._eat(T.LPAREN);
      this._skipNewlines();
      const body = this._parseList();
      this._skipNewlines();
      this._eat(T.RPAREN);
      const redirs = this._parseRedirs();
      return { type: 'Group', body, subshell: true, redirs };
    }

    // Simple command (or bare redirections)
    return this._parseSimple();
  }

  _parseCompound() {
    const tok = this._peek();
    if (tok.type === T.LBRACE) {
      this._eat(T.LBRACE);
      this._skipNewlines();
      const body = this._parseList();
      this._skipNewlines();
      this._eat(T.RBRACE);
      return { type: 'Group', body, subshell: false, redirs: [] };
    }
    if (tok.type === T.LPAREN) {
      this._eat(T.LPAREN);
      this._skipNewlines();
      const body = this._parseList();
      this._skipNewlines();
      this._eat(T.RPAREN);
      return { type: 'Group', body, subshell: true, redirs: [] };
    }
    // Accept IF/WHILE/FOR/CASE as compound body too
    return this._parseCommand();
  }

  _parseSimple() {
    const words = [];
    const redirs = [];

    while (true) {
      const tok = this._peek();
      if (this._isRedirToken(tok)) {
        redirs.push(this._parseOneRedir());
      } else if (tok.type === T.WORD) {
        // background marker (bare &)
        if (tok.value === '&__BG__') {
          this._eat();
          words.push({ _bg: true }); // parser signals background to interpreter
        } else {
          this._eat();
          words.push(tok.value);
        }
      } else {
        break;
      }
    }

    return { type: 'Simple', words, redirs };
  }

  _parseRedirs() {
    const redirs = [];
    while (this._isRedirToken(this._peek())) redirs.push(this._parseOneRedir());
    return redirs;
  }

  _isRedirToken(tok) {
    return tok && [T.REDIR_OUT, T.REDIR_APP, T.REDIR_IN, T.REDIR_HERE, T.REDIR_DUP].includes(tok.type);
  }

  _parseOneRedir() {
    const tok = this._eat();
    if (tok.type === T.REDIR_HERE) {
      return { kind: 'here', word: tok.value, raw: tok.raw };
    }
    if (tok.type === T.REDIR_DUP) {
      return { kind: 'dup', word: tok.value };
    }
    const kind = tok.type === T.REDIR_OUT ? 'out'
               : tok.type === T.REDIR_APP ? 'app'
               : 'in';
    const target = this._eat(T.WORD);
    return { kind, word: target.value };
  }

  _parseIf() {
    this._eat(T.IF);
    this._skipNewlines();
    const cond = this._parseList();
    this._skipNewlines();
    this._eat(T.THEN);
    this._skipNewlines();
    const then = this._parseList();
    this._skipNewlines();

    const elifs = [];
    while (this._at(T.ELIF)) {
      this._eat(T.ELIF);
      this._skipNewlines();
      const ec = this._parseList();
      this._skipNewlines();
      this._eat(T.THEN);
      this._skipNewlines();
      const et = this._parseList();
      this._skipNewlines();
      elifs.push({ cond: ec, then: et });
    }

    let els = null;
    if (this._at(T.ELSE)) {
      this._eat(T.ELSE);
      this._skipNewlines();
      els = this._parseList();
      this._skipNewlines();
    }
    this._eat(T.FI);
    return { type: 'If', cond, then, elifs, els };
  }

  _parseWhile(until) {
    this._eat(until ? T.UNTIL : T.WHILE);
    this._skipNewlines();
    const cond = this._parseList();
    this._skipNewlines();
    this._eat(T.DO);
    this._skipNewlines();
    const body = this._parseList();
    this._skipNewlines();
    this._eat(T.DONE);
    return { type: 'While', cond, body, until };
  }

  _parseFor() {
    this._eat(T.FOR);
    const name = this._eat(T.WORD).value;
    this._skipNewlines();
    let words = null;
    if (this._at(T.IN)) {
      this._eat(T.IN);
      words = [];
      while (this._at(T.WORD)) words.push(this._eat(T.WORD).value);
      // consume separator
      if (this._at(T.SEMI)) this._eat(T.SEMI);
    }
    this._skipNewlines();
    this._eat(T.DO);
    this._skipNewlines();
    const body = this._parseList();
    this._skipNewlines();
    this._eat(T.DONE);
    return { type: 'For', name, words, body };
  }

  _parseCase() {
    this._eat(T.CASE);
    const word = this._eat(T.WORD).value;
    this._skipNewlines();
    this._eat(T.IN);
    this._skipNewlines();

    const items = [];
    while (!this._at(T.ESAC, T.EOF)) {
      // optional leading (
      if (this._at(T.LPAREN)) this._eat(T.LPAREN);
      const patterns = [this._eat(T.WORD).value];
      while (this._at(T.PIPE)) { this._eat(T.PIPE); patterns.push(this._eat(T.WORD).value); }
      this._eat(T.RPAREN);
      this._skipNewlines();
      const body = this._parseList();
      this._skipNewlines();
      // ;; terminator
      if (this._at(T.SEMI)) { this._eat(T.SEMI); if (this._at(T.SEMI)) this._eat(T.SEMI); }
      this._skipNewlines();
      items.push({ patterns, body });
    }
    this._eat(T.ESAC);
    return { type: 'Case', word, items };
  }
}
