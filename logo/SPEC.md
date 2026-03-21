# Logo Implementation Spec

## Overview

A 1982-era Logo interpreter running inside the standard 80×25 Mazes of Menace
terminal window. Accessible at `/logo/` or launched via `logo` from the shell.

## Source: jslogo

We use Joshua Bell's [jslogo](https://github.com/inexorabletash/jslogo) interpreter
(`logo.js`, Apache 2.0 license) as the language engine. It provides a complete
Logo interpreter via:

```js
const interp = new LogoInterpreter(turtle, stream, savehook);
interp.run(sourceString);   // returns Promise
```

We implement our own `turtle` and `stream` adapter objects and our own REPL loop.
We do **not** use jslogo's `turtle.js`, `index.js`, `index.html`, or CSS.

---

## Display Architecture

The display is the same 80×25 character terminal used by Rogue, Hack, NetHack,
and the shell. It uses the shared `/js/display.js` `Display` class.

Turtle graphics are rendered on a `<canvas>` element that sits **behind** the
terminal `<div>` using CSS layering:

```
┌─────────────────────────────┐
│  <canvas id="logo-canvas">  │  ← turtle drawing (background)
│  <div id="shell-container"> │  ← text terminal (foreground, transparent cells)
└─────────────────────────────┘
```

The canvas is sized to exactly match the terminal's pixel dimensions (the same
bounding box as the `<pre>` element). Character cells in the terminal have
transparent backgrounds so turtle drawings show through. The REPL input/output
text appears directly over the drawing.

---

## File Structure

```
logo/
  index.html          Standalone entry point for /logo/ URL
  SPEC.md             This document
  js/
    entry.js          Browser entry: wires canvas, Display, Turtle, REPL
    repl.js           REPL loop: line editing, multiline TO..END, history
    stream.js         Logo stream adapter: bridges Display to LogoInterpreter
    turtle.js         Logo turtle adapter: bridges <canvas> to LogoInterpreter
  vendor/
    logo.js           jslogo interpreter (Apache 2.0, unmodified)
```

Shell integration: add `logo` command to `shell/commands.js` →
`window.location.href = '/logo/'`.

---

## Turtle Adapter (`turtle.js`)

Wraps a standard `<canvas>` 2D context to satisfy the turtle interface expected
by `LogoInterpreter`. Required methods (called by the interpreter):

| Method | Description |
|---|---|
| `move(x, y, draw)` | Move turtle; draw line if pen down and draw=true |
| `turn(angle)` | Rotate by angle (degrees, clockwise) |
| `arc(angle, radius)` | Draw arc |
| `home()` | Move to (0,0), heading north |
| `clear()` | Clear canvas |
| `clearscreen()` | Clear canvas + home turtle |
| `pendown(bool)` | Set pen state |
| `penmode(mode)` | 'paint', 'erase', 'reverse' |
| `penwidth(n)` | Set line width |
| `color(r,g,b)` / `color(css)` | Set pen color |
| `bgcolor(r,g,b)` / `bgcolor(css)` | Set background color |
| `visible(bool)` | Show/hide turtle |
| `position()` | Returns `{x, y}` |
| `heading()` | Returns current heading in degrees |
| `towards(x, y)` | Returns heading toward point |
| `bounds()` | Returns `{width, height}` of canvas in Logo units |
| `turtlemode(mode)` | 'wrap', 'window', 'fence' |
| `drawtext(text)` | Draw text at turtle position |
| `fontsize(n)` | Set font size |
| `fontname(n)` | Set font name |
| `beginpath()` / `fill()` / `fillpath()` | Fill operations |
| `scrunch(sx, sy)` | Aspect ratio correction |

**Coordinate system**: Logo origin (0,0) at canvas center. +Y is up (north).
Canvas pixel mapping: `px = cx + x`, `py = cy - y` where (cx,cy) is center.
Heading 0 = north, increases clockwise (Logo convention).

**Turtle cursor**: drawn as a small triangle (10px) pointing in heading direction.
Redrawn after every operation on a separate overlay pass (or cleared/redrawn
each frame).

**Logo units**: 1 Logo unit = 1 pixel at the canvas's natural resolution.
The canvas is sized to the terminal's pixel dimensions (~800×500px typically).
This gives a logical range of roughly ±400 horizontal, ±250 vertical.

---

## Stream Adapter (`stream.js`)

Bridges the `Display` class to the Logo I/O interface expected by
`LogoInterpreter`.

```js
class LogoStream {
  write(s, newline='')  // Print text to terminal; newline='\n' adds line break
  read(prompt='')       // Returns Promise<string>; shows prompt, reads a line
  clear()               // CLEARTEXT: clear terminal display
  get color()           // Current text color (CSS string)
  set color(css)        // SETTEXTCOLOR
  get font()            // Current font descriptor
  set font(f)           // SETFONT
  get textsize()        // Returns [cols, rows]
}
```

**Text display**: output is written character-by-character into the Display's
80×25 grid, word-wrapping at column 80. A cursor tracks the current row/col.
On scroll (row 24 reached), lines shift up.

**Input**: `read()` shows a prompt and then does line-editing (Backspace,
Enter) via keydown events, returning a Promise that resolves to the typed string.

---

## REPL (`repl.js`)

```
?                         ← prompt (MIT Logo style)
> REPEAT 4 [FD 100 RT 90]
                          ← executes, turtle draws square
? TO SQUARE :SIZE
>   REPEAT 4 [FD :SIZE RT 90]
> END
SQUARE defined
? SQUARE 50
?
```

**States**:
1. **Top-level**: print `? `, read a line, execute it
2. **Procedure definition** (after `TO`): print `> `, accumulate lines until
   `END`, then define the procedure
3. **Continuation** (expression not complete): print `~ `, accumulate

**Line editing**:
- Backspace: delete last character
- Enter: submit line
- Ctrl-C: cancel current input, return to top-level prompt
- Ctrl-L: `CLEARSCREEN`
- Up/Down arrows: command history (last 50 entries)
- `BYE`: navigate to `/shell/`

**Startup banner**:
```
LOGO  Version 1.0  (1982)
?
```

**Error display**: Logo errors print in the style jslogo uses (already
matches 1982 UCB Logo):
```
I don't know how to SQAURE
?
```

---

## Language

The full jslogo primitive set is available. Key primitives:

### Turtle
`FORWARD`/`FD`, `BACK`/`BK`, `RIGHT`/`RT`, `LEFT`/`LT`,
`PENUP`/`PU`, `PENDOWN`/`PD`, `HOME`, `CLEARSCREEN`/`CS`,
`SETPOS`, `SETHEADING`/`SETH`, `SETX`, `SETY`,
`XCOR`, `YCOR`, `HEADING`, `POS`,
`SETPENCOLOR`/`SETPC`, `PENCOLOR`/`PC`,
`SETBACKGROUND`/`SETBG`, `SETPENSIZE`,
`SHOWTURTLE`/`ST`, `HIDETURTLE`/`HT`, `SHOWNP`

### Control
`REPEAT`, `FOREVER`, `IF`, `IFELSE`, `WHILE`, `DO.WHILE`, `DO.UNTIL`,
`FOR`, `TO`/`END`, `OUTPUT`/`OP`, `STOP`, `BYE`,
`CATCH`, `THROW`, `ERROR`

### Variables
`MAKE`, `LOCAL`, `NAME`, `THING`, `:name` syntax,
`GLOBAL`, `NAMEP`/`NAME?`

### Arithmetic
`SUM`, `DIFFERENCE`, `PRODUCT`, `QUOTIENT`, `REMAINDER`, `MODULO`,
`MINUS`, `ABS`, `INT`, `ROUND`, `SQRT`, `POWER`, `EXP`, `LOG`,
`SIN`, `COS`, `ARCTAN`, `RADSIN`, `RADCOS`,
`RANDOM`, `RERANDOM`, `MAX`, `MIN`,
`+`, `-`, `*`, `/`, `<`, `>`, `=`, `<=`, `>=`, `<>`

### Predicates
`EQUALP`/`EQUAL?`, `NOTEQUALP`/`NOTEQUAL?`,
`LESSP`/`LESS?`, `GREATERP`/`GREATER?`,
`LESSEQUALP`/`LESSEQUAL?`, `GREATEREQUALP`/`GREATEREQUAL?`,
`NUMBERP`/`NUMBER?`, `WORDP`/`WORD?`, `LISTP`/`LIST?`,
`ARRAYP`/`ARRAY?`, `EMPTYP`/`EMPTY?`, `ZEROP`/`ZERO?`,
`MEMBERP`/`MEMBER?`, `SUBSTRINGP`/`SUBSTRING?`,
`PROCEDUREP`/`PROCEDURE?`, `PRIMITIVEP`/`PRIMITIVE?`,
`AND`, `OR`, `NOT`

### Words & lists
`WORD`, `LIST`, `SENTENCE`/`SE`, `FPUT`, `LPUT`,
`FIRST`, `LAST`, `BUTFIRST`/`BF`, `BUTLAST`/`BL`,
`ITEM`, `PICK`, `REMOVE`, `REMDUP`,
`COUNT`, `REVERSE`, `GENSYM`,
`UPPERCASE`, `LOWERCASE`, `ASCII`, `CHAR`, `RAWASCII`,
`SUBSTR`, `MEMBER`

### I/O
`PRINT`/`PR`, `TYPE`, `SHOW`,
`READWORD`, `READLIST`, `READCHAR`,
`CLEARTEXT`/`CT`

### Meta
`HELP`, `PROCEDURES`, `PRIMITIVES`, `DEFINED`,
`PLIST`, `TRACE`, `UNTRACE`

---

## HTML Layout (`index.html`)

```html
<body style="margin:0; background:#000; overflow:hidden;">
  <canvas id="logo-canvas"
    style="position:absolute; top:0; left:0; width:100%; height:100%;"></canvas>
  <div id="shell-container"
    style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
</body>
```

The `Display` class is instantiated on `shell-container`. The canvas is sized
to match it after layout. Terminal cells use `background: transparent` so
turtle art shows through (override Display's default cell background).

---

## Shell Integration

In `shell/commands.js`, add alongside other game launchers:

```js
async function logo(args, shell) {
    window.location.href = '/logo/';
}
```

Register it in the command dispatch table and add to `help` output.

---

## Not Implemented

- `SAVEPICT` / `LOADPICT` (no filesystem)
- `SOUND` / `TONE` (no audio planned)
- `FILL` flood-fill (jslogo has it; we may skip for v1)
- Mouse/touch input (`MOUSEPOS`, `BUTTON`, `TOUCHES`) — canvas exists, low priority
- Multiple turtles (`TURTLES`, `SETTURTLE`) — jslogo supports it, we expose it

---

## Example Programs

These should work correctly at launch:

```logo
; Classic square spiral
TO SPIRAL :SIZE :ANGLE
  IF :SIZE > 200 [STOP]
  FORWARD :SIZE
  RIGHT :ANGLE
  SPIRAL :SIZE + 2 :ANGLE
END
SPIRAL 0 91
```

```logo
; Recursive tree
TO TREE :SIZE
  IF :SIZE < 5 [STOP]
  FORWARD :SIZE
  LEFT 30 TREE :SIZE * 0.7
  RIGHT 60 TREE :SIZE * 0.7
  LEFT 30
  BACK :SIZE
END
PENUP SETPOS [0 -100] SETHEADING 0 PENDOWN
TREE 80
```
