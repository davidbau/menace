---
name: c-to-js-pitfalls
description: Common C-to-JS translation pitfalls that cause RNG drift and parity failures. Reference this when porting C functions, debugging unexpected divergences, or reviewing translated code.
---

# C-to-JS Translation Pitfalls

## When To Use

- Porting a C function to JavaScript
- Debugging an RNG divergence that appears in translated code
- Reviewing auto-translated or hand-translated code for correctness

## The Top Pitfalls (ordered by frequency)

### 1. Loop conditions re-evaluate RNG

**The single most common source of RNG drift.**

```javascript
// WRONG: calls d() up to N times
for (let i = 1; i <= d(5, 5); i++) { ... }

// RIGHT: calls d() exactly once
const count = d(5, 5);
for (let i = 1; i <= count; i++) { ... }
```

In C, `for (i=1; i<=d(5,5); i++)` evaluates `d(5,5)` once (the compiler
may re-evaluate but the value is deterministic). In JS, the condition is
re-evaluated every iteration, consuming RNG each time.

### 2. Integer division produces floats

C integer division truncates toward zero. JS `/` produces floats. Every
C division of integers must use `Math.trunc()` or `| 0`.

```javascript
// WRONG
const half = width / 2;   // 5 / 2 = 2.5

// RIGHT
const half = (width / 2) | 0;  // 5 / 2 = 2
```

Missing one truncation can shift coordinates by one cell, which shifts
room geometry, corridors, and the entire RNG sequence.

### 3. FALSE returns still carry data

C functions like `finddpos()` return FALSE while leaving valid data in
output parameters. FALSE means "didn't find ideal position," not "output
is invalid." JS translations that return `null` on failure break callers
that expect coordinates regardless of the return value.

```c
// C: returns FALSE but cc->x and cc->y are valid
if (!finddpos(&cc, lowx, lowy, hix, hiy)) { ... }
// Caller uses cc.x, cc.y either way
```

### 4. Falsy-value traps (0, empty string, null)

C treats `0` as false but many C patterns rely on `0` being a valid value:

```javascript
// WRONG: treats otyp=0 as "no object"
const otyp = obj.otyp || DEFAULT_OTYP;

// RIGHT: check explicitly
const otyp = obj.otyp != null ? obj.otyp : DEFAULT_OTYP;
```

Also watch for: `charges = 0` (valid), `mhp = 0` (dead but valid),
`dlevel = 0` (endgame, valid).

### 5. STR18 encoding

C uses `STR18(x) = 18 + x` for strength values above 18. A human's max
STR is `STR18(100) = 118`, not `18`. Attribute redistribution rolls
`rn2(100)` and checks against max — JS with `max=18` stops early, causing
extra RNG consumption.

```c
// attrib.h
#define STR18(x) (18 + (x))
// Human STR max = STR18(100) = 118
```

### 6. Switch fallthrough

C `switch` falls through by default. JS doesn't. When porting:
- If C has no `break`, the fallthrough is intentional — replicate it
- Watch for `when X: when Y: case_body` macros that expand to
  `case X: case Y:` (shared handler)

### 7. Argument evaluation order

C does not specify evaluation order of function arguments. Clang evaluates
left-to-right; GCC evaluates right-to-left.

```c
set_wounded_legs(rn2(2) ? RIGHT : LEFT, rn1(10, 10));
// Clang: rn2(2) first, then rn1(10,10)
// GCC: rn1(10,10) first, then rn2(2)
```

Build the C harness with `CC=clang` on all platforms. JS evaluates
left-to-right (matching Clang).

### 8. Signed/unsigned comparison

C signed/unsigned comparisons can produce surprising results. `(int)-1 < (unsigned)0`
is FALSE in C because `-1` is converted to a large unsigned value.

### 9. Lua `for` loop upper bounds

Lua `for x = 0, expr - 1 do` iterates while `x <= expr - 1`. The correct
JS translation is:

```javascript
for (let x = 0; x < Math.floor(expr); x++)
```

NOT `x < expr` (which allows one extra iteration when expr is non-integer).

### 10. Match C exactly — no stubs

When porting a C function, finish the job. Same name, same RNG calls,
same messages, same effects. "Close enough" stubs accumulate as technical
debt. If you're reading C code and writing RNG calls, wire up the output.

## Incremental porting beats rewrites

Port one function, test, commit. Repeat. A rewrite that breaks parity in
twenty places is harder to debug than twenty individual one-function ports.

## RNG log conventions

C logs exclude certain entries that JS may initially count:
- **Composite entries** (`d(6,6)=17`) — only the result, not individual dice
- **Midlog markers** (`>makemon`) — bookmarks, not RNG calls
- **Source tags** (`@ foo.c:32`) — stripped before comparison
- `rn2(1)` is the canonical no-op RNG consumer (always returns 0)

## Verification

After porting any function, run:
```bash
node test/comparison/session_test_runner.js --verbose <session-that-exercises-it>
node scripts/test-unit-core.mjs
```
