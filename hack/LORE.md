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

## Phase 4 Parity: JS vs C Divergences Found and Fixed

### Screen capture timing (`parse()` / `--More--`)
C captures the screen inside `getchar()` **before** returning the key — the message is still
visible on screen when the harness snapshot is taken. `parse()` clears the top line only after
`getchar()` returns. JS `parse()` must follow the same order:
1. Call `getKey()` (screen captured with message still showing)
2. Clear top line after getKey returns
3. Reset `flags.topl = 0`

`nscr()` must **not** reset `flags.topl` — only `parse()` does.

### `pline()` and `flags.topl` semantics
`flags.topl` is a tri-state:
- `0` = top line is blank (nothing to clear)
- `1` = top line has content, but `--More--` should be suppressed (e.g. inside `getobj()` loop)
- `2` = top line has content, next `pline()` must show `--More--` first

C `pline()` always sets `topl = 2`. Setting `topl = 1` before the next `pline()` suppresses
`--More--` but still marks the line as occupied. `getobj()` sets `topl = 1` after each prompt
so the "You don't have that." message doesn't trigger `--More--` immediately.

### `getobj()` loop behavior
C's `getobj()` is a **loop** — it re-prompts on `*` (show inventory) and on invalid letters,
continuing until the player picks a valid item or presses ESC. JS had a one-shot implementation.

Critical detail: `ilet = ch - 'a'` for non-alpha chars (e.g. space = 32 - 97 = -65) is **negative**.
C's loop `while(otmp && ilet)` uses a truthy check — negative ilet is truthy so the loop
exhausts the inventory list → `!otmp` → "You don't have that." JS must use `ilet !== 0`,
not `ilet > 0`.

### `done1()` / `done()` — quit sequence
- C `done1()` shows "Really quit?" and waits for 'y' before calling `done()`. JS had `done()`
  called directly.
- C `done()` is just `exit()` — no "Press any key" prompt. JS was calling `getKey()`, which
  consumed extra session keys and broke step counts. Fix: throw `GameOver` immediately.

### `--More--` loop (accepted any key vs. space only)
C's `--More--` accepts any key. JS loops `while (ch !== ' ')`. This accidentally works for
death sequences: C's death sequence produces many `--More--` prompts that consume the remaining
session keys; JS's `done()` throws immediately so there are no extra `--More--` prompts to handle.
**Do not change the `--More--` loop to accept any key** — it would break step counts.

### Combat formulas (`amon()` / `hitu()`)

**Player attacks monster (`amon()`):**
```
tmp = ulevel + mdat.ac + abon() + weapon_bonuses + status_bonuses
hit if tmp >= rnd(20)
```
Status bonuses: sleeping (+2, wake), frozen (+4, maybe wake), fleeing (+2).
Weapon bonuses: wand-of-striking (+3), weapon spe ± (plus-1 for 2-hander, +2 for dagger).

**Monster attacks player (`hitu()`):**
```
tmp = -1 + u.uac + mlev
adjustments: multi<0 (+4), uinvis (-2), uconfused (+1), ublind (+1)
hit if tmp >= rnd(20)
```

**`abon()` — strength bonus to hit:**
```
str==3: -4 | str<6: -3 | str<8: -2 | str<17: -1 | str<69: 0 | str<118: +1 | else: +2
```

### Damage arrays (`wsdam` / `wldam`)
JS had wrong damage arrays from a different Hack version (tiny values: 1,1,1...).
C's 1982 Hack uses die sizes: `wsdam = [6,4,4,3,6,6,6,8,10,4,6,4,6,4]` (for d6, d4 etc.)
`rnd(wsdam[otyp])` = damage to small monsters; `rnd(wldam[otyp])` = damage to large.

### Weapon names (`wepnam`)
JS had Nethack-style weapon names. 1982 Hack's weapons:
```
0:arrow  1:sling bullet  2:crossbow bolt  3:dart  4:mace  5:axe  6:flail
7:long sword  8:two handed sword  9:dagger  10:spear  11:bow  12:sling  13:crossbow
```

### `doname()` formatting

**Weapons (known):** `"a +N name."` (sign and bonus BEFORE name, period at end)
then `"  (weapon in hand)"` appended AFTER the period (C: `strcat` after building string).
Unknown weapon: `setan(name)` → "a mace" or "an axe".

**Armor:** `armnam[otyp - 2]` not `armnam[otyp]` (armor otyp starts at 2).
C armor names (6 entries): `leather ring scale chain splint plate`.
Format: `"a suit of ±N X armor."` if known, `"a suit of X armor."` if not.

### Scroll label names
JS had Nethack-era scroll names. 1982 Hack uses:
```
Velox Neb, Foobie Bletch, Temov, Garven Deh, Zelgo Mer, Andova Begarin,
Elam Ebow, Kernod Wel, Tharr, Venzar Borgavve, Elbib Yloh, Verr Yed Horre,
Juyed Awk Yacc, Hackem Muche, Lep Gex Ven Zea
```

### Carry weight (`weight()`)
JS had grossly wrong item weights (armor=30 instead of 8, etc.). C values:
```
'"' (amulet): 2    '[' (armor): 8     '%' food otyp>0: quan    '%' otyp=0: falls through
'?' scrolls: 3*quan   '!' potions: 2*quan   ')' weapons: 3 (or 4 for dagger, quan/2 for ammo)
'=' rings: 1   '*' gems: quan   '/' wands: 3
```
Carry limit is 85. Getting this wrong causes spurious "Your pack is full" messages.

### `mstat` SLEEP sentinel
C uses a signed 2-bit bitfield for `mstat`: SLEEP=2 stores as -2 in signed 2-bit field.
In JS, disable the "if mstat === SLEEP, return early" check since C's signed comparison
always fails (`mstat` is never equal to 2 in C due to the bitfield sign extension).

### `omoves` initialization bug (C harness)
C's `hack.lev.c` had `unsigned omoves = 0` uninitialized in one path, causing the initial
RNG sequence to diverge. Fixed in the patched source.

