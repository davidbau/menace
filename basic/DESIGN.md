# BASIC Implementation Design

## Overview

A 1982-era Applesoft BASIC interpreter running in the standard 80×24
Mazes of Menace terminal window. Accessible at `/basic/` or by typing
`basic` in the shell.

## Dialect

Applesoft BASIC, the dialect shipped with the Apple II from 1977 onward,
written by Microsoft. This was the BASIC most American schoolchildren
encountered in the early 1980s.

## Language

### Line-numbered programs

Programs are entered one line at a time with a line number:

```
10 PRINT "HELLO"
20 GOTO 10
```

`RUN` executes the program. `LIST` shows it. `NEW` clears it.
Typing a line number with no body deletes that line.

### Statements

| Statement | Description |
|---|---|
| `PRINT expr [; expr] [, expr]` | Print values. `;` no space, `,` tab stop. Trailing `;` suppresses newline |
| `INPUT ["prompt";] var [,var]` | Read user input |
| `LET var = expr` | Assignment (`LET` is optional) |
| `IF cond THEN action [ELSE action]` | Conditional. Action can be a line number (GOTO) or statement |
| `GOTO line` | Jump to line number |
| `GOSUB line` / `RETURN` | Subroutine call and return |
| `FOR var = start TO end [STEP s]` | Loop |
| `NEXT [var]` | End of FOR loop |
| `DIM var(n [,m])` | Declare array dimensions |
| `READ var [,var]` | Read from DATA statements |
| `DATA val, val, ...` | Inline data values |
| `RESTORE` | Reset DATA pointer to beginning |
| `DEF FN name(var) = expr` | Define a function |
| `ON expr GOTO l1,l2,...` | Computed GOTO |
| `ON expr GOSUB l1,l2,...` | Computed GOSUB |
| `REM comment` | Comment (rest of line ignored) |
| `END` | End program |
| `STOP` | Stop program (same as END) |

### Immediate mode commands

| Command | Description |
|---|---|
| `RUN` | Execute the stored program |
| `LIST [n[-m]]` | List program lines |
| `NEW` | Clear program and variables |
| `SAVE` | Save program to browser storage |
| `LOAD` | Load saved program |
| `HELP` | Show command reference |
| `BYE` / `QUIT` | Exit to shell |

### Operators

| Operator | Description |
|---|---|
| `+` `-` `*` `/` | Arithmetic |
| `^` | Exponentiation |
| `=` `<` `>` `<=` `>=` `<>` | Comparison (returns 1 or 0) |
| `AND` `OR` `NOT` | Logical |
| `+` | String concatenation (when both operands are strings) |

### Built-in functions

**Numeric:**
`ABS(x)` `INT(x)` `SGN(x)` `SQR(x)` `SIN(x)` `COS(x)` `TAN(x)`
`ATN(x)` `LOG(x)` `EXP(x)` `RND(x)` `PEEK(addr)` (stub)

**String:**
`LEN(s$)` `VAL(s$)` `ASC(s$)` `CHR$(n)` `STR$(n)`
`LEFT$(s$,n)` `RIGHT$(s$,n)` `MID$(s$,start[,len])`

**Formatting:**
`TAB(n)` `SPC(n)`

### Variables

- Numeric: `A`, `X1`, `SCORE` (default value: 0)
- String: `A$`, `N$`, `WORD$` (default value: "")
- Arrays: `DIM A(10)`, `DIM B(5,5)` — 0-indexed, auto-DIM to size 11 if not declared

### Graphics (Apple II Hi-Res)

| Command | Description |
|---|---|
| `HGR` | Clear and enter hi-res graphics mode |
| `HCOLOR= n` | Set drawing color (0-7) |
| `HPLOT x,y` | Plot a point |
| `HPLOT x,y TO x,y [TO x,y]` | Draw connected line segments |
| `TEXT` | Return to text mode |

Graphics are rendered on a 320×200 pixelated canvas behind the text terminal,
same as Logo.

### Error messages

Classic Applesoft style, all caps:

```
?SYNTAX ERROR IN 20
?UNDEF'D STATEMENT IN 50
?DIVISION BY ZERO ERROR IN 30
?OUT OF DATA ERROR IN 100
?BAD SUBSCRIPT ERROR IN 40
NEXT WITHOUT FOR IN 60
RETURN WITHOUT GOSUB IN 70
BREAK IN 30
```

### Ctrl-C behavior

- **During program execution**: sets break flag, program stops at next
  statement with `BREAK IN <line>`
- **At the `]` prompt**: exits to shell (like BYE)

The interpreter yields to the event loop every 20 statements (~2ms delay)
so that infinite loops remain responsive to Ctrl-C and the display updates
visibly.

## Architecture

```
basic/
  index.html         Standalone entry point for /basic/
  DESIGN.md          This document
  js/
    entry.js         Browser entry: wires Display, Canvas, Turtle, REPL
    interpreter.js   BASIC interpreter (tokenizer, parser, evaluator)
    repl.js          REPL loop: line editing, history, break handling
    display.js       80×24 character display (shared with Logo)
    turtle.js        Canvas turtle for HGR/HPLOT (shared with Logo)
```

## Example programs

**Hello World:**
```
10 PRINT "HELLO, WORLD!"
```

**Countdown:**
```
10 FOR I = 10 TO 1 STEP -1
20 PRINT I
30 NEXT I
40 PRINT "BLASTOFF!"
```

**Guess the number:**
```
10 N = INT(RND(1) * 100) + 1
20 PRINT "GUESS A NUMBER 1-100"
30 INPUT "YOUR GUESS";G
40 IF G < N THEN PRINT "TOO LOW" : GOTO 30
50 IF G > N THEN PRINT "TOO HIGH" : GOTO 30
60 PRINT "YOU GOT IT IN ";T;" TRIES!"
```

**Random maze (the famous one-liner):**
```
10 PRINT CHR$(47 + INT(RND(1) * 2) * 45);
20 GOTO 10
```
