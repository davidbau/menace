# Cosmic Display Logs

## Purpose

`COSMIC_DISPLAY_LOGS` is an opt-in diagnostic mode for screen-only parity
debugging, especially hallucination and repaint-owner seams where:

- gameplay RNG is already aligned,
- gameplay events are already aligned,
- but C and JS still diverge on visible output.

The goal is to explain every display-RNG roll in terms of:

1. which redraw owner fired,
2. which cell(s) it redrew,
3. which display branch each redraw took,
4. and whether that branch consumed monster or object display RNG.

This fills the gap between:

- low-level `~drn2(...)` display-RNG logs, which are too fine-grained by
  themselves, and
- final screen diffs, which are too late and too lossy.


## Why This Exists

`seed031` showed the core problem clearly:

- gameplay parity went fully green,
- but a hallucination corridor still diverged on screen,
- C display-RNG logs showed a mix of monster and object display rolls,
- JS tracing showed monster-only rolls at the corresponding seam.

Raw display-RNG logs were enough to prove a mismatch existed, but not enough to
answer the actual engineering questions:

- Did JS miss a redraw owner entirely?
- Did JS redraw the wrong cell?
- Did JS redraw the right cell but take the wrong branch?
- Did JS redraw the right branch but in the wrong order?

Those are ownership and branch-selection questions. They require mid-level logs.


## Non-Goals

`COSMIC_DISPLAY_LOGS` must not:

- alter gameplay semantics,
- alter replay ownership,
- suppress or invent redraws,
- mask mismatches in the comparator,
- become default-on noise in ordinary PRNG logs,
- or replace normal parity triage for gameplay-first seams.

This is a microscope, not a permanent always-on logging mode.


## When To Use

Use `COSMIC_DISPLAY_LOGS` only when:

- RNG parity is full or nearly full,
- event parity is full or nearly full,
- the first remaining divergence is `screen`, `color`, or `cursor`,
- and ordinary repaint diagnostics are not enough.

Typical cases:

- hallucination glyph/name drift,
- tty `docrt()` / redraw-owner mismatches,
- screen-only redraw ordering seams,
- persistent visible-output mismatches after gameplay fixes.


## Design Principle

Display parity must be debugged at three layers at once:

1. owner layer
2. `newsym()` / map-resolution branch layer
3. display-RNG layer

A correct implementation lets us compare C and JS in this order:

1. owner sequence
2. per-owner redraw sequence
3. per-redraw branch choice
4. display-RNG calls consumed by those branches

If any earlier layer differs, downstream display-RNG drift is expected and not
yet actionable.


## Why Regular Display PRNG Logs Are Not Enough

Ordinary display-RNG logs tell us:

- a display roll happened,
- whether it was a monster or object roll,
- and where it was called from.

They do not tell us:

- which redraw owner conceptually caused the roll,
- which `newsym()` call or map branch produced it,
- whether C and JS redrew the same cell,
- whether one side took `monster` while the other took `object`,
- or whether one side performed an extra redraw pass.

That missing middle layer is exactly what `COSMIC_DISPLAY_LOGS` adds.


## Current Motivating Example: `seed031`

The remaining `seed031` seam after gameplay fixes is screen-only.

Observed facts:

- gameplay RNG matches completely,
- gameplay events match completely,
- the seam is in a chest-gas hallucination corridor,
- C display logs show monster and object display rolls in the same redraw lane,
- JS currently shows the corresponding cell being introduced through monster
  redraws only.

During triage, the following candidate explanations were ruled out:

- generic render-cache tweaks,
- ordinary visible floor-object redraw as the source of the missing object
  display rolls,
- naive inventory-count explanations,
- and broad screen redraw speculation without owner attribution.

That debugging experience directly informs this design:

- owner logs are required,
- `newsym()` branch logs are required,
- map-resolution branch logs are required,
- and all three must be comparable between C and JS.


## C Ownership Model

The logging design must follow C ownership boundaries, not JS guesses.

Important C owners:

### `make_hallucinated()`

From `potion.c`:

- `see_monsters()`
- `see_objects()`
- `see_traps()`
- `update_inventory()`
- `disp.botl = TRUE`
- then message output

This is the canonical hallucination-on refresh owner.

### `see_monsters()`

From `display.c`:

- iterates `fmon`
- calls `newsym(mon->mx, mon->my)` for each live monster
- then `newsym(u.ux, u.uy)` when not mounted

### `see_objects()`

From `display.c`:

- iterates `fobj`
- filters to visible pile top using `vobj_at(obj->ox, obj->oy) == obj`
- calls `newsym(obj->ox, obj->oy)`
- then calls `update_inventory()`

### `see_traps()`

From `display.c`:

- iterates trap locations
- refreshes cells that currently display trap glyphs

### `docrt()` / `docrt_flags()`

From `display.c`:

- clears and redraws remembered map state via `show_glyph`
- runs `vision_recalc(0)`
- overlays monsters via `see_monsters()`
- updates inventory via `update_inventory()`
- marks status for later redraw

This is a separate top-level redraw owner and must not be conflated with
`make_hallucinated()`.

### `dog_move()` redraw lanes

`dog_move()` itself is AI logic, but the relevant parity issue is not the whole
AI turn. It is the local redraw-producing lane around pet movement / postmove /
visible state updates that can trigger `newsym()` and later redraw sync.

Logging should scope to the redraw sub-lane, not the whole AI function.

### moveloop redraw / sync owner

Later in the turn, C can perform redraw work in a general moveloop sync lane.
For display-RNG parity, this must be logged as a distinct owner from:

- `make_hallucinated()`
- `see_objects()`
- `dog_move()`
- `docrt()`


## Branch Model Inside `newsym()`

The next crucial layer is `newsym()` branch choice.

In C, `newsym()` is where many display decisions actually resolve:

- hero display
- monster display
- warning display
- invisible marker
- `_map_location()` path

Then `_map_location()` resolves the underlying visible non-monster branch:

- object
- trap
- engraving
- terrain

That means `COSMIC_DISPLAY_LOGS` needs two branch layers:

1. `newsym()` branch
2. map-location branch

Both must be explicit.


## Required Log Layers

### Layer A: Owner Begin/End Logs

Emit explicit owner markers.

Example:

```text
^disp_owner_begin[step=156 owner=make_hallucinated]
^disp_owner_begin[step=156 owner=see_objects parent=make_hallucinated]
^disp_owner_end[step=156 owner=see_objects]
^disp_owner_end[step=156 owner=make_hallucinated]
```

Required fields:

- `step`
- `owner`
- optional `parent`
- optional nesting depth

These must be explicit, not inferred from stack strings.


### Layer B: `newsym()` Branch Logs

Every `newsym(x,y)` call in diagnostic mode should emit one branch record.

Example:

```text
^disp_newsym[step=156 owner=see_objects x=49 y=16 cansee=1 uat=0 mon=0 branch=visible-map-location]
```

Recommended fields:

- `step`
- `owner`
- `x`
- `y`
- `cansee`
- `u_at`
- `mon_present`
- `branch`

Recommended branch enum:

- `hero-swallowed`
- `hero-visible`
- `visible-region`
- `visible-mon`
- `visible-warning`
- `visible-invis`
- `visible-map-location`
- `oos-self`
- `oos-sensed-mon`
- `oos-remembered`
- `suppressed`

This enum should be shared by C and JS.


### Layer C: Map-Location Branch Logs

Whenever `newsym()` falls through to map-location resolution, emit one more log
showing what visible content actually won that cell.

Example:

```text
^disp_maploc[step=156 owner=see_objects x=49 y=16 branch=obj]
```

Recommended branch enum:

- `obj`
- `trap`
- `engr`
- `terrain`
- `magic-trap-memory`
- `remembered-obj`
- `remembered-trap`
- `remembered-terrain`
- `blank`


### Layer D: Display-RNG Logs With Context

Existing `~drn2(...)` style display logs should be enriched with owner/branch
context.

Example:

```text
~drn2_disp[step=156 owner=see_objects newsym=visible-map-location maploc=obj kind=obj n=460 idx=200 x=49 y=16]
```

Required fields:

- `step`
- `owner`
- `kind=obj|mon`
- `n`
- `idx`

Recommended additional fields:

- `newsym` branch
- `maploc` branch
- `x`
- `y`

These logs should be emitted where display RNG is actually consumed, not where
the owner begins.


## C Instrumentation Plan

### 1. Owner stack

Add a tiny diagnostic owner stack in C display diagnostics.

Requirements:

- push owner at begin
- pop owner at end
- expose `current_display_owner()`
- no effect when disabled

Do not infer owners from stack traces.

### 2. Instrument these C owners

Top priority:

- `make_hallucinated()`
- `see_monsters()`
- `see_objects()`
- `see_traps()`
- `docrt_flags()`
- moveloop redraw/sync owner
- `dog_move()` redraw sub-lane
- `update_inventory()` if it emits glyph-bearing display work

### 3. Instrument `newsym()`

Add a single log line per call recording:

- coordinates
- current owner
- cansee/out-of-sight state
- hero/monster/invis/map-location branch

### 4. Instrument `_map_location()`

Log final visible content class:

- object
- trap
- engraving
- terrain

This is required because many relevant display-RNG calls originate from object
glyph resolution after `newsym()` has already chosen the map-location path.

### 5. Instrument display-RNG consumers

At the actual monster/object glyph randomization sites:

- log `kind=obj|mon`
- attach current owner and branch context
- include coordinates if available


## JS Instrumentation Plan

JS must mirror the same structure and names.

### 1. Explicit owner context

Add a lightweight diagnostics-only owner stack:

- `pushDisplayOwner(name)`
- `popDisplayOwner(name)`
- `currentDisplayOwner()`

This must be:

- explicit
- shared across display/logging helpers
- diagnostics-only

Do not rely on JS stack-trace string parsing for the authoritative comparison
format. Stack traces are useful only as one-off exploratory probes.

### 2. Instrument matching JS owners

- `js/potion.js:make_hallucinated`
- `js/display.js:see_monsters`
- `js/display.js:see_objects`
- `js/display.js:see_traps`
- `js/display.js:docrt` / `docrt_flags`
- `js/allmain.js` redraw/sync owner
- `js/monmove.js` redraw-producing pet/postmove lane
- `js/invent.js:update_inventory` only if it performs visible glyph-bearing work

### 3. Instrument `js/display.js:newsym`

Emit the same `newsym` branch enum as C.

### 4. Instrument JS map-location resolution

Emit the same `maploc` branch enum as C.

### 5. Instrument `js/display_rng.js`

Emit `kind=obj|mon` logs carrying:

- current owner
- current branch context
- coordinates if known


## JS Design Requirements

To work correctly, JS must preserve C ownership boundaries.

That means:

### 1. No synthetic redraw compensation

Do not “fix” parity by:

- suppressing redraws opportunistically,
- forcing extra redraws just to consume display RNG,
- delaying redraws outside the corresponding C owner,
- or inventing cache bypass rules not justified by C ownership.

### 2. Shared categorical model

C and JS must use the same owner names and branch enums.

If C logs:

```text
owner=see_objects newsym=visible-map-location maploc=obj
```

then JS should log exactly the same categories.

### 3. Explicit context, not stack inference

The authoritative comparison should use explicit owner and branch context, not
best-effort stack parsing.

### 4. Keep diagnostics off by default

All of this must be guarded behind env flags and impose near-zero cost when
disabled.


## Why `update_inventory()` Is Still In Scope

C `see_objects()` explicitly calls `update_inventory()`.
`docrt_flags()` also explicitly calls `update_inventory()`.
`make_hallucinated()` explicitly calls `update_inventory()`.

That means `update_inventory()` must remain in the candidate set until proven
otherwise for a specific seam.

However, debugging experience from `seed031` says:

- it should not be assumed to explain every missing object roll,
- and inventory item count alone is not a sufficient explanation.

The correct approach is to instrument it with the same owner/branch framework,
then compare its actual emitted redraws.


## Environment Flags

Recommended flags:

### C

- `NETHACK_RNGLOG_DISP=1`
- `NETHACK_COSMIC_DISPLAY_LOGS=1`

### JS

- `RNG_LOG_DISP=1`
- `WEBHACK_COSMIC_DISPLAY_LOGS=1`

These should be independent of ordinary gameplay RNG logging.


## Comparison Workflow

1. Run ordinary session parity first.
2. If gameplay RNG/events are already green and screen still diverges:
   - rerecord C with display and cosmic logs enabled
   - replay JS with matching cosmic logs enabled
3. Compare in this order:
   - owner sequence
   - per-owner `newsym` sequence
   - per-`newsym` map-location branch sequence
   - display-RNG calls
4. Fix the earliest structural mismatch.
5. Repeat until the display stream aligns or the mismatch is narrowed to a
   non-RNG repaint/cursor issue.


## Success Criteria

For a target seam, `COSMIC_DISPLAY_LOGS` are successful when they let us prove
one of the following concretely:

1. JS missed a redraw owner that C performed.
2. JS executed the same owner but on different cells.
3. JS redrew the same cell but took a different `newsym()` branch.
4. JS took the same `newsym()` branch but a different map-location branch.
5. JS matched all of the above, so the remaining seam is outside display-RNG
   and belongs to repaint/cursor ownership instead.


## Why This Should Not Be Default-On

`COSMIC_DISPLAY_LOGS` should not become part of regular PRNG logs by default.

Reasons:

- too verbose,
- expensive in fixture size and triage time,
- most parity work is gameplay-first and does not need it,
- display noise would obscure ordinary root-cause analysis,
- and C rerecords with this mode should remain deliberate diagnostic artifacts,
  not fixture churn.

This mode is for hard screen seams only.


## Immediate Rollout Order

Recommended implementation order:

1. C owner stack and owner begin/end logs
2. C `newsym()` branch logs
3. C `_map_location()` branch logs
4. C contextualized display-RNG logs
5. matching JS owner stack
6. matching JS `newsym()` and map-location branch logs
7. matching JS contextualized display-RNG logs
8. apply to one diagnostic session:
   - `seed031`
9. fix the earliest proven structural mismatch
10. reuse the same tooling for later `seed032` / `seed033` display seams


## Expected Payoff

This should give a reusable debugging lane for:

- hallucination glyph seams,
- tty/docrt ownership bugs,
- screen-only parity failures after gameplay is green,
- and future display-RNG mismatches in `seed032`, `seed033`, and beyond.

The central rule is simple:

- compare redraw ownership first,
- compare `newsym()` branch choice second,
- compare display-RNG rolls third.

Without that structure, display-RNG parity work degenerates into guesswork.
