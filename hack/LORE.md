# Lore: Hack 1982 JS Port — Hard-Won Lessons

This file is updated as bugs are found and fixed during the port.

## RNG

### glibc LCG formula
C `rand()` on the original system (likely glibc or similar) uses:
```c
seed = seed * 1103515245 + 12345;
return (seed >> 16) & 0x7fff;  // returns 0..32767
```
JS must use 32-bit integer arithmetic (use `>>> 0` to force unsigned, `| 0` for signed).
The seed must be tracked as a 32-bit value: `seed = ((seed * 1103515245 + 12345) | 0) >>> 0`.

### `rn1(x, y)` semantics
`rn1(x, y)` = `rand() % x + y`. Range is `[y, y+x-1]`.
`rn2(x)` = `rand() % x`. Range is `[0, x-1]`.
`rnd(x)` = `rand() % x + 1`. Range is `[1, x]`.
`d(n, x)` = sum of n rolls of `rnd(x)`.

## Level Generation

### mklev coordinate system
The map is `levl[80][22]` — first index is X (column), second is Y (row).
This is **column-major**: `levl[x][y]`, where x goes 0..79 and y goes 0..21.
The maze display row offset: level display starts at row 2 (rows 0-1 are status/message).

### Room corridor algorithm
mklev uses a retry/exec pattern for failures — it re-execs itself with a new seed.
In JS, we retry by recursively calling `generatelevel` with a new seed instead.

### `makecor` termination
The corridor-drawing loop `do makecor(x+dx,y+dy); while(croom->hx>0 && troom->hx>0);`
walks corridors between rooms. The `newloc()` function advances `croom`/`troom` pointers.
When `croom->hx < 0` it signals "end of room list" — in JS, `croom.hx = -1`.

## Display

### Coordinate mapping
C: `at(x, y, ch)` maps to screen column `x`, screen row `y+2` (level rows start at row 2).
The status line is at row 24 (C's row 24, which is the 24th line of the terminal).
JS display: row 0 = message line, row 1 = blank(?), rows 2-23 = map, row 24 = status.

### `curx/cury` semantics
C uses 1-based screen coordinates: (1,1) is top-left.
`at(x,y,ch)` does `y+=2` before calling `curs(x,y)`, then `putchar(ch); curx++`.
So map cell (x,y) appears at screen position (x, y+2) in 1-based coordinates.

## Monster Data

### `mon[8][7]` table
56 monsters organized as 8 difficulty tiers × 7 monsters per tier.
`mon[0][*]` = easiest (bats, gnomes, etc.), `mon[7][*]` = hardest.
`dlevel/3+1` capped at 7 determines which tier to pick from in `makemon()`.

### `mregen` string
`char mregen[] = "ViQT"` — monsters whose letters appear here regenerate HP every turn
(Vampire, imp, Quasit, Teleporter? — need to verify).
