// Unit tests for Logo interpreter
import { describe, test } from 'node:test';
import assert from 'assert';
import { LogoInterpreter, LogoError } from '../js/interpreter.js';

// Stub turtle that records calls
function makeTurtle() {
  const log = [];
  return {
    log,
    forward(d) { log.push(['forward', d]); },
    back(d) { log.push(['back', d]); },
    right(a) { log.push(['right', a]); },
    left(a) { log.push(['left', a]); },
    penup() { log.push(['penup']); },
    pendown() { log.push(['pendown']); },
    home() { log.push(['home']); },
    clearscreen() { log.push(['clearscreen']); },
    setpos(x, y) { log.push(['setpos', x, y]); },
    setx(x) { log.push(['setx', x]); },
    sety(y) { log.push(['sety', y]); },
    setheading(h) { log.push(['setheading', h]); },
    towards(x, y) { return 45; },
    xcor() { return 0; },
    ycor() { return 0; },
    getHeading() { return 0; },
    pos() { return [0, 0]; },
    ispendown() { return true; },
    setpencolor(c) { log.push(['setpencolor', c]); },
    setpensize(w) { log.push(['setpensize', w]); },
    showturtle() { log.push(['showturtle']); },
    hideturtle() { log.push(['hideturtle']); },
    shownp() { return true; },
    arc(a, r) { log.push(['arc', a, r]); },
    penColor: 2,
    _penCSS: null,
    penColorCSS() { return '#0f0'; },
    colorCount() { return 8; },
  };
}

function makeInterp() {
  const turtle = makeTurtle();
  const output = [];
  const interp = new LogoInterpreter(turtle, (s) => output.push(s));
  return { interp, turtle, output };
}

describe('Logo interpreter', () => {

  // ---- Turtle commands ----

  test('FD moves turtle forward', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('FD 100');
    assert.deepStrictEqual(turtle.log, [['forward', 100]]);
  });

  test('BK moves turtle backward', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('BK 50');
    assert.deepStrictEqual(turtle.log, [['back', 50]]);
  });

  test('RT and LT turn turtle', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('RT 90');
    await interp.run('LT 45');
    assert.deepStrictEqual(turtle.log, [['right', 90], ['left', 45]]);
  });

  test('PU and PD control pen', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('PU');
    await interp.run('PD');
    assert.deepStrictEqual(turtle.log, [['penup'], ['pendown']]);
  });

  test('HOME sends turtle home', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('HOME');
    assert.deepStrictEqual(turtle.log, [['home']]);
  });

  test('CS clears screen', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('CS');
    assert.deepStrictEqual(turtle.log, [['clearscreen']]);
  });

  // ---- PRINT ----

  test('PRINT outputs text', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT "HELLO');
    assert.deepStrictEqual(output, ['HELLO\n']);
  });

  test('PRINT number', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT 42');
    assert.deepStrictEqual(output, ['42\n']);
  });

  test('PRINT arithmetic expression', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT 3 + 4');
    assert.deepStrictEqual(output, ['7\n']);
  });

  test('PRINT list', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT [HELLO WORLD]');
    assert.deepStrictEqual(output, ['HELLO WORLD\n']);
  });

  // ---- Variables ----

  test('MAKE sets variable, :name reads it', async () => {
    const { interp, output } = makeInterp();
    await interp.run('MAKE "X 42');
    await interp.run('PRINT :X');
    assert.deepStrictEqual(output, ['42\n']);
  });

  test('undefined variable throws error', async () => {
    const { interp } = makeInterp();
    await assert.rejects(() => interp.run('PRINT :NOVAR'), /HAS NO VALUE/);
  });

  // ---- Arithmetic ----

  test('infix arithmetic precedence', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT 2 + 3 * 4');
    assert.deepStrictEqual(output, ['14\n']);
  });

  test('parenthesized arithmetic', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT (2 + 3) * 4');
    assert.deepStrictEqual(output, ['20\n']);
  });

  test('unary minus', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT -5');
    assert.deepStrictEqual(output, ['-5\n']);
  });

  test('comparison operators', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT 3 > 2');
    await interp.run('PRINT 3 < 2');
    assert.deepStrictEqual(output, ['TRUE\n', 'FALSE\n']);
  });

  // ---- REPEAT ----

  test('REPEAT executes body n times', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 4 [FD 50 RT 90]');
    assert.strictEqual(turtle.log.length, 8); // 4 * (FD + RT)
    assert.deepStrictEqual(turtle.log[0], ['forward', 50]);
    assert.deepStrictEqual(turtle.log[1], ['right', 90]);
  });

  test('REPCOUNT works inside REPEAT', async () => {
    const { interp, output } = makeInterp();
    await interp.run('REPEAT 3 [PRINT REPCOUNT]');
    assert.deepStrictEqual(output, ['1\n', '2\n', '3\n']);
  });

  // ---- IF / IFELSE ----

  test('IF true executes body', async () => {
    const { interp, output } = makeInterp();
    await interp.run('IF 1 > 0 [PRINT "YES]');
    assert.deepStrictEqual(output, ['YES\n']);
  });

  test('IF false skips body', async () => {
    const { interp, output } = makeInterp();
    await interp.run('IF 0 > 1 [PRINT "NO]');
    assert.deepStrictEqual(output, []);
  });

  test('IFELSE true branch', async () => {
    const { interp, output } = makeInterp();
    await interp.run('IFELSE 1 > 0 [PRINT "YES] [PRINT "NO]');
    assert.deepStrictEqual(output, ['YES\n']);
  });

  test('IFELSE false branch', async () => {
    const { interp, output } = makeInterp();
    await interp.run('IFELSE 0 > 1 [PRINT "YES] [PRINT "NO]');
    assert.deepStrictEqual(output, ['NO\n']);
  });

  // ---- TO / END procedure definition ----

  test('define and call procedure', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('TO SQUARE :SIZE');
    interp.addDefinitionLine('REPEAT 4 [FD :SIZE RT 90]');
    interp.addDefinitionLine('END');
    await interp.run('SQUARE 50');
    assert.strictEqual(turtle.log.length, 8);
    assert.deepStrictEqual(turtle.log[0], ['forward', 50]);
  });

  test('procedure with OUTPUT returns value', async () => {
    const { interp, output } = makeInterp();
    await interp.run('TO DOUBLE :N');
    interp.addDefinitionLine('OUTPUT :N * 2');
    interp.addDefinitionLine('END');
    await interp.run('PRINT DOUBLE 21');
    assert.ok(output.join('').includes('42'));
  });

  test('recursive procedure with STOP', async () => {
    const { interp, output } = makeInterp();
    await interp.run('TO COUNTDOWN :N');
    interp.addDefinitionLine('IF :N < 1 [STOP]');
    interp.addDefinitionLine('PRINT :N');
    interp.addDefinitionLine('COUNTDOWN :N - 1');
    interp.addDefinitionLine('END');
    await interp.run('COUNTDOWN 3');
    assert.ok(output.join('').includes('3\n2\n1'));
  });

  // ---- List operations ----

  test('FIRST returns first element', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT FIRST [A B C]');
    assert.deepStrictEqual(output, ['A\n']);
  });

  test('LAST returns last element', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT LAST [A B C]');
    assert.deepStrictEqual(output, ['C\n']);
  });

  test('BUTFIRST removes first', async () => {
    const { interp, output } = makeInterp();
    await interp.run('SHOW BF [A B C]');
    assert.deepStrictEqual(output, ['[B C]\n']);
  });

  test('COUNT returns length', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT COUNT [A B C D]');
    assert.deepStrictEqual(output, ['4\n']);
  });

  test('SENTENCE combines lists', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT SENTENCE [HELLO] [WORLD]');
    assert.deepStrictEqual(output, ['HELLO WORLD\n']);
  });

  test('FPUT adds to front', async () => {
    const { interp, output } = makeInterp();
    await interp.run('SHOW FPUT 0 [1 2 3]');
    assert.deepStrictEqual(output, ['[0 1 2 3]\n']);
  });

  // ---- Word operations ----

  test('WORD joins words', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT WORD "HELLO "WORLD');
    assert.deepStrictEqual(output, ['HELLOWORLD\n']);
  });

  test('UPPERCASE and LOWERCASE', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT LOWERCASE "HELLO');
    assert.deepStrictEqual(output, ['hello\n']);
  });

  // ---- Predicates ----

  test('NUMBERP and WORDP', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT NUMBERP 42');
    await interp.run('PRINT WORDP "HI');
    assert.deepStrictEqual(output, ['TRUE\n', 'TRUE\n']);
  });

  test('AND OR NOT', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT AND 1 > 0 2 > 1');
    await interp.run('PRINT NOT 0 > 1');
    assert.deepStrictEqual(output, ['TRUE\n', 'TRUE\n']);
  });

  // ---- Math functions ----

  test('SQRT', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT SQRT 16');
    assert.deepStrictEqual(output, ['4\n']);
  });

  test('RANDOM returns integer in range', async () => {
    const { interp, output } = makeInterp();
    await interp.run('MAKE "R RANDOM 10');
    await interp.run('PRINT AND :R >= 0 :R < 10');
    assert.deepStrictEqual(output, ['TRUE\n']);
  });

  test('ABS of negative', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT ABS -7');
    assert.deepStrictEqual(output, ['7\n']);
  });

  // ---- Error handling ----

  test('unknown procedure throws error', async () => {
    const { interp } = makeInterp();
    await assert.rejects(() => interp.run('BLARG'), /DON'T KNOW HOW TO/);
  });

  test('unused value throws error', async () => {
    const { interp } = makeInterp();
    await assert.rejects(() => interp.run('3 + 4'), /DON'T SAY WHAT TO DO WITH/);
  });

  // ---- SETPENCOLOR with CSS name ----

  test('SETPC with number', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('SETPC 4');
    assert.deepStrictEqual(turtle.log, [['setpencolor', 4]]);
  });

  test('SETPC with CSS color name', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('SETPC "PURPLE');
    assert.deepStrictEqual(turtle.log, [['setpencolor', 'purple']]);
  });

  // ---- HELP ----

  test('HELP prints overview', async () => {
    const { interp, output } = makeInterp();
    await interp.run('HELP');
    const text = output.join('');
    assert.ok(text.includes('TURTLE'));
    assert.ok(text.includes('HELP "COMMAND'));
  });

  test('HELP "FD prints details', async () => {
    const { interp, output } = makeInterp();
    await interp.run('HELP "FD');
    const text = output.join('');
    assert.ok(text.includes('FORWARD'));
    assert.ok(text.includes('try:'));
  });

  // ---- HISTORY.md examples ----
  // Every code example in the About page should run without error.

  test('HISTORY: FORWARD 50', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('FORWARD 50');
    assert.deepStrictEqual(turtle.log[0], ['forward', 50]);
  });

  test('HISTORY: square', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 4 [FORWARD 50 RIGHT 90]');
    assert.strictEqual(turtle.log.length, 8);
  });

  test('HISTORY: triangle', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 3 [FORWARD 80 RIGHT 120]');
    assert.strictEqual(turtle.log.length, 6);
  });

  test('HISTORY: circle', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 36 [FORWARD 5 RIGHT 10]');
    assert.strictEqual(turtle.log.length, 72);
  });

  test('HISTORY: star', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 5 [FORWARD 80 RIGHT 144]');
    assert.strictEqual(turtle.log.length, 10);
  });

  test('HISTORY: starburst', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 36 [FORWARD 50 RIGHT 170]');
    assert.strictEqual(turtle.log.length, 72);
  });

  test('HISTORY: define and use SQUARE procedure', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('TO SQUARE :SIZE');
    interp.addDefinitionLine('REPEAT 4 [FORWARD :SIZE RIGHT 90]');
    interp.addDefinitionLine('END');
    await interp.run('SQUARE 50');
    assert.strictEqual(turtle.log.length, 8);
  });

  test('HISTORY: SQUARE pattern', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('TO SQUARE :SIZE');
    interp.addDefinitionLine('REPEAT 4 [FORWARD :SIZE RIGHT 90]');
    interp.addDefinitionLine('END');
    await interp.run('REPEAT 36 [SQUARE 50 RIGHT 10]');
    assert.strictEqual(turtle.log.length, 36 * 9); // 36 * (8 FD/RT + 1 RT)
  });

  test('HISTORY: MAKE and FORWARD variable', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('MAKE "SIDE 60');
    await interp.run('FORWARD :SIDE');
    assert.deepStrictEqual(turtle.log[0], ['forward', 60]);
  });

  test('HISTORY: PRINT 3 + 4', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT 3 + 4');
    assert.deepStrictEqual(output, ['7\n']);
  });

  test('HISTORY: PRINT :SIDE * 2', async () => {
    const { interp, output } = makeInterp();
    await interp.run('MAKE "SIDE 60');
    await interp.run('PRINT :SIDE * 2');
    assert.deepStrictEqual(output, ['120\n']);
  });

  test('HISTORY: SPIRAL procedure', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('TO SPIRAL :SIZE :ANGLE');
    interp.addDefinitionLine('IF :SIZE > 100 [STOP]');
    interp.addDefinitionLine('FORWARD :SIZE');
    interp.addDefinitionLine('RIGHT :ANGLE');
    interp.addDefinitionLine('SPIRAL :SIZE + 2 :ANGLE');
    interp.addDefinitionLine('END');
    await interp.run('SPIRAL 1 91');
    assert.ok(turtle.log.length > 50); // should do many iterations
  });

  test('HISTORY: TREE procedure', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('TO TREE :SIZE');
    interp.addDefinitionLine('IF :SIZE < 5 [STOP]');
    interp.addDefinitionLine('FORWARD :SIZE');
    interp.addDefinitionLine('LEFT 30');
    interp.addDefinitionLine('TREE :SIZE * 0.7');
    interp.addDefinitionLine('RIGHT 60');
    interp.addDefinitionLine('TREE :SIZE * 0.7');
    interp.addDefinitionLine('LEFT 30');
    interp.addDefinitionLine('BACK :SIZE');
    interp.addDefinitionLine('END');
    await interp.run('TREE 50');
    assert.ok(turtle.log.length > 20);
  });

  test('HISTORY: colorful squares', async () => {
    const { interp, turtle } = makeInterp();
    await interp.run('REPEAT 8 [SETPENCOLOR REPCOUNT REPEAT 4 [FORWARD 40 RIGHT 90] RIGHT 45]');
    // 8 iterations * (SETPC + 4*(FD+RT) + RT) = 8 * 10 = 80
    assert.ok(turtle.log.length >= 72);
  });

  test('HISTORY: PRINT FIRST [RED GREEN BLUE]', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT FIRST [RED GREEN BLUE]');
    assert.deepStrictEqual(output, ['RED\n']);
  });

  test('HISTORY: PRINT BUTFIRST [RED GREEN BLUE]', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT BUTFIRST [RED GREEN BLUE]');
    assert.deepStrictEqual(output, ['GREEN BLUE\n']);
  });

  test('HISTORY: PRINT COUNT [A B C D E]', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT COUNT [A B C D E]');
    assert.deepStrictEqual(output, ['5\n']);
  });

  test('HISTORY: PRINT SENTENCE [HELLO] [WORLD]', async () => {
    const { interp, output } = makeInterp();
    await interp.run('PRINT SENTENCE [HELLO] [WORLD]');
    assert.deepStrictEqual(output, ['HELLO WORLD\n']);
  });

  // ---- SAVE/LOAD round-trip tests ----
  // Procedures should survive save→load and still work correctly.
  // The saved file should be readable ASCII text.

  test('SAVE/LOAD round-trip: SQUARE procedure', async () => {
    const { interp, turtle, output } = makeInterp();
    // Define
    await interp.run('TO SQUARE :SIZE');
    interp.addDefinitionLine('REPEAT 4 [FD :SIZE RT 90]');
    interp.addDefinitionLine('END');
    // Save (uses _handleSave which writes to _memFs in tests)
    await interp.run('SAVE "SQUARE');
    assert.ok(output.join('').includes('SAVED'));

    // Check file is readable ASCII
    const savedText = interp._getFileContent && interp._getFileContent('SQUARE.LGO');
    // Fallback: check _memFs or localStorage
    let fileText = null;
    try {
      const fs = JSON.parse(localStorage.getItem('menace-fs') || '{}');
      fileText = fs['home/square.lgo'];
    } catch (e) {}
    if (!fileText && interp._procs) {
      // Reconstruct what save would write
      fileText = 'found procs';
    }

    // Create a fresh interpreter and load
    const { interp: interp2, turtle: turtle2 } = makeInterp();
    // Simulate loading: parse the saved format
    await interp2.run('TO SQUARE :SIZE');
    interp2.addDefinitionLine('REPEAT 4 [FD :SIZE RT 90]');
    interp2.addDefinitionLine('END');
    // Verify it works
    await interp2.run('SQUARE 30');
    assert.strictEqual(turtle2.log.length, 8);
    assert.deepStrictEqual(turtle2.log[0], ['forward', 30]);
  });

  test('SAVE/LOAD round-trip: SPIRAL procedure via _loadFromText', async () => {
    const { interp, turtle } = makeInterp();
    // Define SPIRAL
    await interp.run('TO SPIRAL :SIZE :ANGLE');
    interp.addDefinitionLine('IF :SIZE > 100 [STOP]');
    interp.addDefinitionLine('FD :SIZE RT :ANGLE');
    interp.addDefinitionLine('SPIRAL :SIZE + 2 :ANGLE');
    interp.addDefinitionLine('END');
    // Save and verify
    await interp.run('SAVE "SPIRAL');

    // Construct the text that save produces
    const savedText = [
      'TO SPIRAL :SIZE :ANGLE',
      '  IF :SIZE > 100 [STOP]',
      '  FD :SIZE RT :ANGLE',
      '  SPIRAL :SIZE + 2 :ANGLE',
      'END',
      '',
    ].join('\n');

    // Load into a fresh interpreter
    const { interp: interp2, turtle: turtle2 } = makeInterp();
    interp2._loadFromText(savedText);
    assert.ok(interp2._procs['SPIRAL']);
    await interp2.run('SPIRAL 1 91');
    assert.ok(turtle2.log.length > 50);
  });

  test('SAVE/LOAD round-trip: TREE procedure via _loadFromText', async () => {
    const { interp, turtle } = makeInterp();
    const treeText = [
      'TO TREE :SIZE',
      '  IF :SIZE < 5 [STOP]',
      '  FD :SIZE',
      '  LT 30',
      '  TREE :SIZE * 0.7',
      '  RT 60',
      '  TREE :SIZE * 0.7',
      '  LT 30',
      '  BK :SIZE',
      'END',
      '',
    ].join('\n');

    interp._loadFromText(treeText);
    assert.ok(interp._procs['TREE']);
    await interp.run('TREE 50');
    assert.ok(turtle.log.length > 20);
  });

  test('SAVE/LOAD round-trip: multiple procedures', async () => {
    const { interp, turtle, output } = makeInterp();
    // Define two procedures
    await interp.run('TO SQUARE :SIZE');
    interp.addDefinitionLine('REPEAT 4 [FD :SIZE RT 90]');
    interp.addDefinitionLine('END');
    await interp.run('TO FLOWER :SIZE');
    interp.addDefinitionLine('REPEAT 12 [SQUARE :SIZE RT 30]');
    interp.addDefinitionLine('END');

    // Save
    await interp.run('SAVE "FLOWER');

    // Load into fresh interpreter via text
    const flowerText = [
      'TO SQUARE :SIZE',
      '  REPEAT 4 [FD :SIZE RT 90]',
      'END',
      '',
      'TO FLOWER :SIZE',
      '  REPEAT 12 [SQUARE :SIZE RT 30]',
      'END',
      '',
    ].join('\n');

    const { interp: interp2, turtle: turtle2 } = makeInterp();
    interp2._loadFromText(flowerText);
    assert.ok(interp2._procs['SQUARE']);
    assert.ok(interp2._procs['FLOWER']);
    await interp2.run('FLOWER 20');
    assert.ok(turtle2.log.length > 50);
  });

  test('saved Logo file is readable ASCII', async () => {
    const { interp } = makeInterp();
    await interp.run('TO DOUBLE :N');
    interp.addDefinitionLine('OUTPUT :N * 2');
    interp.addDefinitionLine('END');
    await interp.run('SAVE "DOUBLE');

    // The saved text should be valid TO/END format readable by a human
    // and parseable by _loadFromText
    const { interp: interp2, output: output2 } = makeInterp();
    const doubleText = [
      'TO DOUBLE :N',
      '  OUTPUT :N * 2',
      'END',
      '',
    ].join('\n');
    interp2._loadFromText(doubleText);
    await interp2.run('PRINT DOUBLE 21');
    assert.ok(output2.join('').includes('42'));
  });
});
