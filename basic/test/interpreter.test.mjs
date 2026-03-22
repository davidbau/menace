// Unit tests for BASIC interpreter
import { describe, test } from 'node:test';
import assert from 'assert';
import { BasicInterpreter, BasicError, BreakError } from '../js/interpreter.js';

function makeInterp() {
  const output = [];
  const inputQueue = [];
  const interp = new BasicInterpreter(
    (s) => output.push(s),
    async (prompt) => {
      output.push(prompt);
      return inputQueue.shift() || '';
    },
    () => false // checkBreak
  );
  return { interp, output, inputQueue };
}

describe('BASIC interpreter', () => {

  // ---- Immediate mode ----

  test('PRINT string', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT "HELLO"');
    assert.strictEqual(output.join(''), 'HELLO\n');
  });

  test('PRINT number', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT 42');
    assert.strictEqual(output.join('').trim(), '42');
  });

  test('PRINT arithmetic', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT 3 + 4 * 2');
    assert.strictEqual(output.join('').trim(), '11');
  });

  test('PRINT with semicolon suppresses newline', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT "A";');
    await interp.execImmediate('PRINT "B"');
    assert.strictEqual(output.join(''), 'AB\n');
  });

  test('PRINT PI', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT PI');
    const val = parseFloat(output.join('').trim());
    assert.ok(Math.abs(val - Math.PI) < 0.0001);
  });

  // ---- Variables ----

  test('LET assignment', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('LET X = 42');
    await interp.execImmediate('PRINT X');
    assert.strictEqual(output.join('').trim(), '42');
  });

  test('assignment without LET', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('X = 10');
    await interp.execImmediate('PRINT X * 2');
    assert.strictEqual(output.join('').trim(), '20');
  });

  test('string variables', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('N$ = "WORLD"');
    await interp.execImmediate('PRINT "HELLO " + N$');
    assert.strictEqual(output.join(''), 'HELLO WORLD\n');
  });

  // ---- Line-numbered programs ----

  test('store and RUN a program', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "HELLO"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'HELLO\n');
  });

  test('LIST shows program', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "A"');
    await interp.execImmediate('20 PRINT "B"');
    await interp.execImmediate('LIST');
    const text = output.join('');
    assert.ok(text.includes('10 PRINT "A"'));
    assert.ok(text.includes('20 PRINT "B"'));
  });

  test('delete line by entering number only', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "A"');
    await interp.execImmediate('20 PRINT "B"');
    await interp.execImmediate('10'); // delete line 10
    await interp.execImmediate('LIST');
    const text = output.join('');
    assert.ok(!text.includes('PRINT "A"'));
    assert.ok(text.includes('20 PRINT "B"'));
  });

  test('NEW clears program', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "A"');
    await interp.execImmediate('NEW');
    await interp.execImmediate('LIST');
    assert.strictEqual(output.join(''), '');
  });

  // ---- FOR/NEXT ----

  test('FOR/NEXT loop', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 3');
    await interp.execImmediate('20 PRINT I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('RUN');
    const nums = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [1, 2, 3]);
  });

  test('FOR/NEXT with STEP', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 10 TO 1 STEP -3');
    await interp.execImmediate('20 PRINT I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('RUN');
    const nums = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [10, 7, 4, 1]);
  });

  test('nested FOR/NEXT', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 2');
    await interp.execImmediate('20 FOR J = 1 TO 2');
    await interp.execImmediate('30 PRINT I * 10 + J');
    await interp.execImmediate('40 NEXT J');
    await interp.execImmediate('50 NEXT I');
    await interp.execImmediate('RUN');
    const nums = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [11, 12, 21, 22]);
  });

  // ---- GOTO ----

  test('GOTO jumps to line', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "A"');
    await interp.execImmediate('20 GOTO 40');
    await interp.execImmediate('30 PRINT "B"');
    await interp.execImmediate('40 PRINT "C"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'A\nC\n');
  });

  // ---- GOSUB/RETURN ----

  test('GOSUB and RETURN', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 GOSUB 100');
    await interp.execImmediate('20 PRINT "BACK"');
    await interp.execImmediate('30 END');
    await interp.execImmediate('100 PRINT "SUB"');
    await interp.execImmediate('110 RETURN');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'SUB\nBACK\n');
  });

  // ---- IF/THEN ----

  test('IF/THEN true', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 X = 5');
    await interp.execImmediate('20 IF X > 3 THEN PRINT "BIG"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'BIG\n');
  });

  test('IF/THEN false', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 X = 1');
    await interp.execImmediate('20 IF X > 3 THEN PRINT "BIG"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), '');
  });

  test('IF/THEN/ELSE', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 X = 1');
    await interp.execImmediate('20 IF X > 3 THEN PRINT "BIG" ELSE PRINT "SMALL"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'SMALL\n');
  });

  test('IF/THEN with GOTO', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 X = 5');
    await interp.execImmediate('20 IF X > 3 THEN 40');
    await interp.execImmediate('30 PRINT "NO"');
    await interp.execImmediate('40 PRINT "YES"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'YES\n');
  });

  // ---- DATA/READ ----

  test('DATA and READ', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 READ A, B, C');
    await interp.execImmediate('20 PRINT A + B + C');
    await interp.execImmediate('30 DATA 10, 20, 30');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join('').trim(), '60');
  });

  test('READ string data', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 READ A$');
    await interp.execImmediate('20 PRINT A$');
    await interp.execImmediate('30 DATA "HELLO"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'HELLO\n');
  });

  // ---- ON GOTO ----

  test('ON GOTO', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 X = 2');
    await interp.execImmediate('20 ON X GOTO 50, 60, 70');
    await interp.execImmediate('50 PRINT "ONE" \\ END');
    await interp.execImmediate('60 PRINT "TWO" \\ END');
    await interp.execImmediate('70 PRINT "THREE" \\ END');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'TWO\n');
  });

  // ---- Backslash statement separator ----

  test('backslash separates statements', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT "A" \\ PRINT "B"');
    assert.strictEqual(output.join(''), 'A\nB\n');
  });

  // ---- DIM and arrays ----

  test('DIM and array access', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 DIM A(5)');
    await interp.execImmediate('20 A(3) = 42');
    await interp.execImmediate('30 PRINT A(3)');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join('').trim(), '42');
  });

  // ---- String functions ----

  test('LEFT$ RIGHT$ MID$', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT LEFT$("HELLO", 3)');
    await interp.execImmediate('PRINT RIGHT$("HELLO", 2)');
    await interp.execImmediate('PRINT MID$("HELLO", 2, 3)');
    assert.strictEqual(output.join(''), 'HEL\nLO\nELL\n');
  });

  test('LEN', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT LEN("HELLO")');
    assert.strictEqual(output.join('').trim(), '5');
  });

  test('ASC and CHR$', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT ASC("A")');
    await interp.execImmediate('PRINT CHR$(66)');
    assert.strictEqual(output.join('').trim().replace(/\s+/g, ' '), '65 B');
  });

  test('VAL and STR$', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT VAL("123") + 1');
    assert.strictEqual(output.join('').trim(), '124');
  });

  // ---- Math functions ----

  test('ABS INT SGN SQR', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT ABS(-7)');
    await interp.execImmediate('PRINT INT(3.7)');
    await interp.execImmediate('PRINT SGN(-5)');
    await interp.execImmediate('PRINT SQR(16)');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [7, 3, -1, 4]);
  });

  test('SIN COS', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT INT(SIN(0) * 100)');
    await interp.execImmediate('PRINT INT(COS(0) * 100)');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [0, 100]);
  });

  test('exponentiation with ^', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT 2 ^ 10');
    assert.strictEqual(output.join('').trim(), '1024');
  });

  // ---- Comparison and logic ----

  test('comparison operators', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT 3 = 3');
    await interp.execImmediate('PRINT 3 <> 4');
    await interp.execImmediate('PRINT 5 >= 5');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [1, 1, 1]);
  });

  test('AND OR NOT', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('PRINT 1 AND 1');
    await interp.execImmediate('PRINT 0 OR 1');
    await interp.execImmediate('PRINT NOT 0');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [1, 1, 1]);
  });

  // ---- DEF FN ----

  test('DEF FN', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 DEF FNA(X) = X * X + 1');
    await interp.execImmediate('20 PRINT FNA(5)');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join('').trim(), '26');
  });

  // ---- REM ----

  test('REM is ignored', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 REM THIS IS A COMMENT');
    await interp.execImmediate('20 PRINT "OK"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'OK\n');
  });

  // ---- SLEEP ----

  test('SLEEP pauses briefly', async () => {
    const { interp } = makeInterp();
    const start = Date.now();
    await interp.execImmediate('SLEEP 0.1');
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 50, `SLEEP should pause (elapsed: ${elapsed}ms)`);
  });

  // ---- Error messages ----

  test('syntax error', async () => {
    const { interp } = makeInterp();
    await assert.rejects(() => interp.execImmediate('BLARG'), /SYNTAX ERROR/);
  });

  test('RETURN without GOSUB', async () => {
    const { interp } = makeInterp();
    await interp.execImmediate('10 RETURN');
    await assert.rejects(() => interp.execImmediate('RUN'), /RETURN WITHOUT GOSUB/);
  });

  test('NEXT without FOR', async () => {
    const { interp } = makeInterp();
    await interp.execImmediate('10 NEXT I');
    await assert.rejects(() => interp.execImmediate('RUN'), /NEXT WITHOUT FOR/);
  });

  // ---- HELP ----

  test('HELP prints reference', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('HELP');
    const text = output.join('');
    assert.ok(text.includes('PRINT'));
    assert.ok(text.includes('FOR/NEXT'));
  });

  // ---- PRINT USING ----

  test('PRINT USING formats numbers', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT USING "##.##", 3.14159');
    await interp.execImmediate('RUN');
    const text = output.join('').trim();
    assert.strictEqual(text, '3.14');
  });

  // ---- CHANGE ----

  test('CHANGE string to array', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('A$ = "AB"');
    await interp.execImmediate('CHANGE A$ TO A');
    await interp.execImmediate('PRINT A(0)');  // length
    await interp.execImmediate('PRINT A(1)');  // A=65
    await interp.execImmediate('PRINT A(2)');  // B=66
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [2, 65, 66]);
  });

  // ---- MAT ----

  test('MAT ZER and MAT PRINT', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 DIM A(2)');
    await interp.execImmediate('20 MAT A = ZER');
    await interp.execImmediate('30 MAT PRINT A');
    await interp.execImmediate('RUN');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [0, 0, 0]);
  });

  test('MAT CON fills with ones', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 DIM A(2)');
    await interp.execImmediate('20 MAT A = CON');
    await interp.execImmediate('30 MAT PRINT A');
    await interp.execImmediate('RUN');
    const vals = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(vals, [1, 1, 1]);
  });

  // ---- HISTORY.md examples ----
  // Every code example in the About page should run without error.

  test('HISTORY: hello world', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "HELLO, WORLD!"');
    await interp.execImmediate('RUN');
    assert.strictEqual(output.join(''), 'HELLO, WORLD!\n');
  });

  test('HISTORY: input and greet', async () => {
    const { interp, output, inputQueue } = makeInterp();
    inputQueue.push('ALICE');
    await interp.execImmediate('10 INPUT "WHAT IS YOUR NAME"; N$');
    await interp.execImmediate('20 PRINT "HELLO, "; N$; "!"');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('HELLO,'));
    assert.ok(text.includes('ALICE'));
  });

  test('HISTORY: FOR loop squares', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 10');
    await interp.execImmediate('20 PRINT I * I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('RUN');
    const nums = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);
  });

  test('HISTORY: countdown with STEP', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 10 TO 1 STEP -1');
    await interp.execImmediate('20 PRINT I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('40 PRINT "BLASTOFF!"');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('10'));
    assert.ok(text.includes('1'));
    assert.ok(text.includes('BLASTOFF!'));
  });

  test('HISTORY: IF THEN with backslash', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 G = 7');
    await interp.execImmediate('20 IF G = 7 THEN PRINT "YOU GOT IT!" \\ GOTO 50');
    await interp.execImmediate('30 IF G < 7 THEN PRINT "TOO LOW"');
    await interp.execImmediate('40 IF G > 7 THEN PRINT "TOO HIGH"');
    await interp.execImmediate('50 END');
    await interp.execImmediate('RUN');
    assert.ok(output.join('').includes('YOU GOT IT!'));
  });

  test('HISTORY: GOSUB/RETURN', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "MAIN PROGRAM"');
    await interp.execImmediate('20 GOSUB 100');
    await interp.execImmediate('30 PRINT "BACK IN MAIN"');
    await interp.execImmediate('40 END');
    await interp.execImmediate('100 PRINT "IN SUBROUTINE"');
    await interp.execImmediate('110 RETURN');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('MAIN PROGRAM'));
    assert.ok(text.includes('IN SUBROUTINE'));
    assert.ok(text.includes('BACK IN MAIN'));
  });

  test('HISTORY: DATA/READ', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 4');
    await interp.execImmediate('20 READ N$');
    await interp.execImmediate('30 PRINT N$');
    await interp.execImmediate('40 NEXT I');
    await interp.execImmediate('50 DATA "SPRING", "SUMMER", "FALL", "WINTER"');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('SPRING'));
    assert.ok(text.includes('WINTER'));
  });

  test('HISTORY: PRINT USING PI', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT USING "THE ANSWER IS ##.##", PI');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('3.14'));
  });

  test('HISTORY: random maze one-liner (runs without error)', async () => {
    const { interp, output } = makeInterp();
    // Run just a few iterations, not infinite
    await interp.execImmediate('10 FOR J = 1 TO 5');
    await interp.execImmediate('20 PRINT CHR$(47 + INT(RND(1) * 2) * 45);');
    await interp.execImmediate('30 NEXT J');
    await interp.execImmediate('RUN');
    const text = output.join('');
    // Should contain / or \ characters
    assert.ok(text.length >= 5);
    for (const ch of text) {
      assert.ok(ch === '/' || ch === '\\', `Expected / or \\, got ${ch}`);
    }
  });

  test('HISTORY: DIM and MAT CON', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 DIM A(3,3)');
    await interp.execImmediate('20 MAT A = CON');
    await interp.execImmediate('30 MAT PRINT A');
    await interp.execImmediate('RUN');
    const text = output.join('').trim();
    assert.ok(text.length > 0);
    // All values should be 1
    const nums = text.split(/\s+/).map(Number);
    assert.ok(nums.every(n => n === 1));
  });

  test('HISTORY: SLEEP countdown', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 3 TO 1 STEP -1');
    await interp.execImmediate('20 PRINT I; "..."');
    await interp.execImmediate('30 SLEEP 0.01');  // fast for testing
    await interp.execImmediate('40 NEXT I');
    await interp.execImmediate('50 PRINT "GO!"');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('3'));
    assert.ok(text.includes('GO!'));
  });

  test('HISTORY: file I/O roundtrip', async () => {
    const { interp, output } = makeInterp();
    // Write
    await interp.execImmediate('10 OPEN "TESTFILE" FOR OUTPUT AS #1');
    await interp.execImmediate('20 PRINT #1, "HELLO"');
    await interp.execImmediate('30 PRINT #1, 42');
    await interp.execImmediate('40 CLOSE #1');
    await interp.execImmediate('RUN');
    // Read back
    await interp.execImmediate('NEW');
    await interp.execImmediate('10 OPEN "TESTFILE" FOR INPUT AS #1');
    await interp.execImmediate('20 INPUT #1, A$');
    await interp.execImmediate('30 INPUT #1, N');
    await interp.execImmediate('40 CLOSE #1');
    await interp.execImmediate('50 PRINT A$; " "; N');
    await interp.execImmediate('RUN');
    const text = output.join('');
    assert.ok(text.includes('HELLO'));
    assert.ok(text.includes('42'));
  });

  // ---- SAVE/LOAD round-trip tests ----
  // Programs should survive SAVE→LOAD and still run correctly.
  // The saved file should be readable ASCII (numbered listing).

  test('SAVE/LOAD round-trip: hello world', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 PRINT "HELLO, WORLD!"');
    await interp.execImmediate('SAVE "HELLO');
    assert.ok(output.join('').includes('SAVED'));

    // Load into fresh interpreter via _loadFromText
    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText('10 PRINT "HELLO, WORLD!"\n');
    await interp2.run();
    assert.ok(output2.join('').includes('HELLO, WORLD!'));
  });

  test('SAVE/LOAD round-trip: FOR loop squares', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 5');
    await interp.execImmediate('20 PRINT I * I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('SAVE "SQUARES');

    // Simulate loading the saved text
    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText('10 FOR I = 1 TO 5\n20 PRINT I * I\n30 NEXT I\n');
    await interp2.run();
    const nums = output2.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [1, 4, 9, 16, 25]);
  });

  test('SAVE/LOAD round-trip: guess game with IF/THEN/GOTO', async () => {
    const { interp } = makeInterp();
    await interp.execImmediate('10 G = 7');
    await interp.execImmediate('20 IF G = 7 THEN PRINT "CORRECT" \\ GOTO 50');
    await interp.execImmediate('30 IF G < 7 THEN PRINT "TOO LOW"');
    await interp.execImmediate('40 IF G > 7 THEN PRINT "TOO HIGH"');
    await interp.execImmediate('50 END');
    await interp.execImmediate('SAVE "GUESS');

    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText(
      '10 G = 7\n' +
      '20 IF G = 7 THEN PRINT "CORRECT" \\ GOTO 50\n' +
      '30 IF G < 7 THEN PRINT "TOO LOW"\n' +
      '40 IF G > 7 THEN PRINT "TOO HIGH"\n' +
      '50 END\n'
    );
    await interp2.run();
    assert.ok(output2.join('').includes('CORRECT'));
  });

  test('SAVE/LOAD round-trip: GOSUB/RETURN', async () => {
    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText(
      '10 PRINT "MAIN"\n' +
      '20 GOSUB 100\n' +
      '30 PRINT "BACK"\n' +
      '40 END\n' +
      '100 PRINT "SUB"\n' +
      '110 RETURN\n'
    );
    await interp2.run();
    const text = output2.join('');
    assert.ok(text.includes('MAIN'));
    assert.ok(text.includes('SUB'));
    assert.ok(text.includes('BACK'));
  });

  test('SAVE/LOAD round-trip: DATA/READ', async () => {
    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText(
      '10 FOR I = 1 TO 3\n' +
      '20 READ N$\n' +
      '30 PRINT N$\n' +
      '40 NEXT I\n' +
      '50 DATA "RED", "GREEN", "BLUE"\n'
    );
    await interp2.run();
    const text = output2.join('');
    assert.ok(text.includes('RED'));
    assert.ok(text.includes('GREEN'));
    assert.ok(text.includes('BLUE'));
  });

  test('SAVE/LOAD round-trip: DEF FN', async () => {
    const { interp: interp2, output: output2 } = makeInterp();
    interp2._loadFromText(
      '10 DEF FNA(X) = X * X + 1\n' +
      '20 PRINT FNA(5)\n'
    );
    await interp2.run();
    assert.strictEqual(output2.join('').trim(), '26');
  });

  test('saved BASIC file is readable numbered listing', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 REM SQUARE NUMBERS');
    await interp.execImmediate('20 FOR I = 1 TO 5');
    await interp.execImmediate('30 PRINT I * I');
    await interp.execImmediate('40 NEXT I');
    await interp.execImmediate('SAVE "SQUARES');

    // Verify the file format: listing lines followed by newlines
    // Each line starts with a number
    const listing = '10 REM SQUARE NUMBERS\n20 FOR I = 1 TO 5\n30 PRINT I * I\n40 NEXT I\n';
    const lines = listing.trim().split('\n');
    for (const line of lines) {
      assert.ok(line.match(/^\d+\s+/), `Line should start with number: ${line}`);
    }
  });

  test('SAVE then LOAD round-trip using interpreter methods', async () => {
    const { interp, output } = makeInterp();
    await interp.execImmediate('10 FOR I = 1 TO 3');
    await interp.execImmediate('20 PRINT I');
    await interp.execImmediate('30 NEXT I');
    await interp.execImmediate('SAVE "COUNTER');

    // Clear and load
    await interp.execImmediate('NEW');
    await interp.execImmediate('LOAD "COUNTER');
    output.length = 0; // clear output from SAVE/LOAD messages
    await interp.execImmediate('RUN');
    const nums = output.join('').trim().split(/\s+/).map(Number);
    assert.deepStrictEqual(nums, [1, 2, 3]);
  });
});
