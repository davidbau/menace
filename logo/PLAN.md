# Logo Implementation Plan

## Phase 1: Display + Canvas foundation
Create `logo/js/display.js` — adapted from `rogue/js/display.js`:
- Same 80×24 character grid with `<pre>` and `flush()`
- **Critical difference**: cells have `background: transparent` so
  the canvas shows through
- Add color support: `putChar(x, y, ch, color)` where color is
  a CSS color string (default `#0f0` for green-screen look)
- Cursor blink at current position

Create `logo/index.html`:
- Canvas element at z-index 0, sized to match terminal pixel box
- Terminal `<pre>` at z-index 1 on top, transparent backgrounds
- Canvas at 280×192 logical pixels, CSS `image-rendering: pixelated`
  scaled to fill the same space as the terminal
- Black background on body

## Phase 2: Turtle graphics (`logo/js/turtle.js`)
Canvas-based turtle:
- State: x, y, heading, pen (up/down), color, width, visible
- Coordinate system: (0,0) at center, +Y = up (north), heading 0 = north
- `forward(d)`, `back(d)` — move, draw line if pen down
- `right(a)`, `left(a)` — turn degrees
- `penup()`, `pendown()`, `setcolor(c)`, `setwidth(w)`
- `home()` — go to (0,0) heading north
- `clear()` — clear canvas, go home
- `setpos(x,y)`, `setheading(a)`, `towards(x,y)`
- `showturtle()`, `hideturtle()`
- `drawTurtle()` — draw triangle cursor at current position
- Color palette: Apple II hi-res style (indices 0-7: black, white,
  green, violet/magenta, orange, blue, cyan, yellow)
- Maps logical coordinates to canvas pixels (280×192)

## Phase 3: Logo interpreter (`logo/js/interpreter.js`)
Clean rewrite, 1974 MIT / early UCB style:

### Tokenizer (~80 lines)
- Words: sequences of non-delimiter chars
- Numbers: digit sequences, optional decimal, optional leading minus
- Quoted strings: `"word` (no closing quote — Logo convention)
- Lists: `[` ... `]` (recursive, preserves structure)
- `:varname` — variable reference
- Operators: `+ - * / = < > ( )`
- Comments: `;` to end of line

### Evaluator (~150 lines)
- Environment: stack of scopes (global + procedure locals)
- `run(tokenList)` — evaluate a list of tokens
- Procedure lookup: primitives first, then user-defined
- Each primitive knows its argument count
- Consume arguments by recursively evaluating the next expression
- Infix arithmetic: `expr + expr`, `expr * expr` etc. with precedence
  (`*` `/` bind tighter than `+` `-`, relationals loosest)
- Parenthesized expressions: `(SUM 1 2 3)` for variable arity
- User procedures: `TO name :arg1 :arg2 ... body ... END`
- `OUTPUT val` — return value from procedure (via thrown sentinel)
- `STOP` — return void from procedure (via thrown sentinel)
- Tail call: `REPEAT`, `IF`, `IFELSE` in tail position can loop

### Primitives (~200 lines)

**Turtle** (each calls into turtle.js):
`FORWARD`/`FD`, `BACK`/`BK`, `RIGHT`/`RT`, `LEFT`/`LT`,
`PENUP`/`PU`, `PENDOWN`/`PD`, `HOME`, `CLEARSCREEN`/`CS`,
`SETPOS`, `SETHEADING`/`SETH`, `SETX`, `SETY`,
`XCOR`, `YCOR`, `HEADING`, `POS`,
`SETPENCOLOR`/`SETPC`, `PENCOLOR`/`PC`,
`SHOWTURTLE`/`ST`, `HIDETURTLE`/`HT`,
`SETPENSIZE`, `ARC`

**Control**:
`REPEAT n [body]`, `IF cond [body]`, `IFELSE cond [t] [f]`,
`OUTPUT`/`OP`, `STOP`, `BYE`, `WAIT n` (tenths of seconds)

**Variables**:
`MAKE "name value`, `THING "name`, `:name`, `LOCAL "name`

**Arithmetic** (infix + prefix):
`SUM`, `DIFFERENCE`, `PRODUCT`, `QUOTIENT`, `REMAINDER`,
`MINUS`, `ABS`, `INT`, `ROUND`, `SQRT`, `POWER`,
`RANDOM`, `MAX`, `MIN`, `SIN`, `COS`, `ARCTAN`

**Predicates**:
`EQUALP`/`EQUAL?`, `LESSP`/`LESS?`, `GREATERP`/`GREATER?`,
`NUMBERP`/`NUMBER?`, `WORDP`/`WORD?`, `LISTP`/`LIST?`,
`EMPTYP`/`EMPTY?`, `ZEROP`/`ZERO?`, `MEMBERP`/`MEMBER?`,
`AND`, `OR`, `NOT`

**Words & lists**:
`WORD`, `LIST`, `SENTENCE`/`SE`, `FPUT`, `LPUT`,
`FIRST`, `LAST`, `BUTFIRST`/`BF`, `BUTLAST`/`BL`,
`COUNT`, `ITEM`, `MEMBERP`/`MEMBER?`, `PICK`,
`UPPERCASE`, `LOWERCASE`, `ASCII`, `CHAR`

**I/O**:
`PRINT`/`PR`, `TYPE`, `SHOW`, `READLIST`,
`CLEARTEXT`/`CT`

**Meta**:
`PROCEDURES` (list user-defined), `HELP`

**Error messages** (ALL CAPS, 1982 style):
```
I DON'T KNOW HOW TO SQARE
NOT ENOUGH INPUTS TO FORWARD
FORWARD DOESN'T LIKE [1 2] AS INPUT
"NAME HAS NO VALUE
YOU DON'T SAY WHAT TO DO WITH 5
```

## Phase 4: REPL (`logo/js/repl.js`)
- `?` prompt, `>` continuation for TO..END, `~` for incomplete exprs
- Line editing: type characters, Backspace, Enter
- Command history: Up/Down arrows, last 50 commands
- Ctrl-C: cancel current input
- Text output scrolls up the 80×24 grid (bottom 6 rows for text,
  or full screen if no turtle graphics active)
- `BYE` navigates to `/shell/`
- Startup banner: `LOGO  VERSION 1.0  (1982)` + blank line + `?`

## Phase 5: Entry point + shell integration
- `logo/js/entry.js` — wire up Display, canvas, Turtle, REPL
- `logo/index.html` — complete standalone page
- Add `logo` command to `shell/commands.js`

## Phase 6: Polish
- Test with classic programs: square, spiral, tree, star, flower
- Ensure transparent text over canvas looks good
- Verify pixelated rendering
- Add the PDF reference link to SPEC.md

## File list (all new)
```
logo/
  index.html
  SPEC.md          (done)
  PLAN.md          (this file)
  js/
    display.js     (~120 lines)  Phase 1
    turtle.js      (~200 lines)  Phase 2
    interpreter.js (~500 lines)  Phase 3
    repl.js        (~200 lines)  Phase 4
    entry.js       (~40 lines)   Phase 5
```

Estimated total: ~1060 lines of JS + HTML
