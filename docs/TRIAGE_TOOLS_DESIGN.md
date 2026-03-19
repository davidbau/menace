# Triage Tools Design

## Motivation

The remaining 3 failing sessions (seed031/032/033) have divergences caused by:
- **Step boundary shifts**: JS and C attribute the same RNG calls to different steps
  (from extra `--More--` prompts, `pendingPrompt` splits, or message boundary differences)
- **Display write path differences**: JS renders terrain C doesn't show (from
  display buffering architecture differences)
- **Accumulated monster AI differences**: small position differences cascade over
  hundreds of steps

The biggest time sink in debugging is the **diagnosis loop**: identifying WHERE the
first divergence is, understanding WHY it happens, and verifying a fix worked. Each
iteration currently requires writing throwaway scripts.

## Tool 1: `step-count-diff`

**Purpose:** Find the first step where JS and C have different filtered RNG entry
counts — the telltale sign of a step boundary shift.

**Usage:**
```bash
node scripts/step-count-diff.mjs <session-path> [--from N] [--to M]
```

**Output:**
```
Comparing JS replay vs C session: seed033_manual_direct.session.json
Steps 0-191: counts match (total filtered: 1724)
Step 192 key="n": JS=0 C=5 (SHIFT: C has extra entries)
  C entries: rn2(12)=4 @ mcalcmove, rn2(12)=7 @ mcalcmove, rn2(70)=61 @ moveloop_core, ...
Step 193 key=",": JS=0 C=0
Step 194 key="k": JS=5 C=0 (SHIFT: JS has extra entries — likely deferred from step 192)
  JS entries: rn2(12)=4 @ allocateMonsterMovement, rn2(12)=7 @ allocateMonsterMovement, ...
  → Values match C step 192: step boundary shift confirmed

First VALUE divergence: step 196 entry 0
  JS: rn2(12)=3 @ allocateMonsterMovement
  C:  rn2(12)=6 @ mcalcmove
```

**Implementation notes:**
- Uses `prepareReplayArgs` + `replaySession` to replay JS
- Uses `getSessionGameplaySteps` to get C's steps
- Filters entries using the same `isComparable` logic as the test comparator
- For each mismatch, shows the raw entries and checks if adjacent steps have
  matching entries (to confirm step boundary shift vs true divergence)
- Normalizes entry values (strips ` @ caller` suffix) for comparison

## Tool 2: `step-boundary-context`

**Purpose:** For a step where JS and C have different entry counts, show diagnostic
context explaining WHY the boundary differs.

**Usage:**
```bash
node scripts/step-boundary-context.mjs <session-path> --step N
```

**Output:**
```
Step 192 key="n" (move SE)
  JS: 0 RNG entries
    player pos: (17,8)
    pendingPrompt: null
    messageNeedsMore: true
    topMessage: "Your movements are slowed slightly because of your..."
    → JS consumed "n" as --More-- dismiss (message was pending)
  C: 5 RNG entries
    movemon_turn, mcalcmove(x2), rn2(70), rn2(20)
    → C processed "n" as movement command + turn end

  DIAGNOSIS: JS has a --More-- active that C doesn't. The "n" key is consumed
  by the More prompt in JS but used as a movement command in C.
```

**Implementation notes:**
- Replays JS session with `onKey` callback to capture game state at the
  specific step (player position, pendingPrompt, messageNeedsMore, topMessage,
  game.running, display state)
- Shows C's raw entries for the same step
- Automatically checks if JS has a pending prompt or --More-- at this step
  (the most common cause of step boundary shifts)

## Tool 3: `cell-trace`

**Purpose:** Trace which code path writes a specific character to a specific
display cell during a session replay.

**Usage:**
```bash
node scripts/cell-trace.mjs <session-path> --step N --row R --col C [--char CH]
```

**Output:**
```
Tracing cell (8, 12) at step 17 of seed032_manual_direct.session.json

Write history for (8, 12):
  Step 0:  ' ' → 'o' via setCell ← putstr ← renderMap ← docrt (startup)
  Step 17: 'o' → '+' via setCell ← putMapCell ← newsym ← vision_recalc ← domove_core
           (during do_run, game.running=true)
  Step 17: '+' → '+' via setCell ← renderMap ← display_sync ← advanceTimedTurn
           (during advanceRunTurn, game.running=true)

Current value at capture: '+' (color=3 brown)
C session value: ' ' (empty)
→ C doesn't show this cell. JS wrote it during running via 2 paths.
```

**Implementation notes:**
- Monkey-patches `HeadlessDisplay.setCell` before replay to log all writes
  to the target cell
- Captures call stack for each write
- Shows the write history chronologically with step numbers
- Compares final JS value against C session value at the same step/row/col
- Filters to only the target step if `--step` is specified, or shows all
  writes if omitted

## Shared Infrastructure

All three tools share:
- `prepareReplayArgs` / `replaySession` for JS replay
- `getSessionGameplaySteps` for C session data
- `isComparable` filter for RNG entries (matching the test comparator)
- Entry normalization (strip caller tags for value comparison)

These should be extracted into a shared `scripts/triage-lib.mjs` module.

## Priority

**Tool 1 is highest priority.** It directly identifies step boundary shifts,
which are the most common fixable divergence pattern. The pickup_encumber_more
fix was found using a manual version of this tool.

**Tool 2 is second priority.** It explains WHY a boundary shift occurs,
reducing the manual investigation from hours to minutes.

**Tool 3 is third priority.** It's specific to display divergences (seed032),
which are architectural issues that the other tools can't address.

## Related tool: `movement-propagation`

`scripts/movement-propagation.mjs` (by another engineer) provides deep per-step
C vs JS monster movement comparison. It enables `WEBHACK_MONMOVE_TRACE` and
`WEBHACK_MFNDPOS_TRACE` instrumentation, groups JS replay into gameplay steps,
and shows movement-focused entries side by side. Supports `--mon-id`, `--mndx`,
`--grep`, `--monmove-trace` for targeted drilldowns. See `docs/MOVEMENT_PROPAGATION_TOOL.md`.

## Improvements (added after initial deployment)

### `--values` flag (step-count-diff)
Scans for the first per-entry VALUE mismatch even when counts match.
Without this flag, only count mismatches are reported. With `--values`,
the tool catches cases where the test comparator reports a divergence
step that has matching counts but different entry values.

### Entry summaries for matched steps (step-boundary-context)
When JS and C have the same count, shows a summary of WHAT both sides
contain (e.g., "both: 2× monster move alloc, spawn check, hunger check").
Previously only mismatched steps showed their entries.

### Command span detection (step-boundary-context, triage-lib)
Shows which multi-key command a step belongs to, e.g.:
```
Step 242 key="t" ~[throw: start from step 242]
Step 243 key="*" ~[throw: continuation from step 242]
Step 244 key="d" ~[throw: invlet/selection from step 242]
Step 245 key="k" ~[throw: invlet/selection from step 242]
```
The `~` prefix indicates this is a heuristic guess. The detection scans
backward for known command-starting keys and can be wrong when keys have
dual meanings (e.g., 'd' = drop command OR inventory letter). It should
be treated as advisory context, not authoritative command identification.

## Tool 4: `dbgmapdump` (C/JS state comparison)

**Purpose:** Capture full game state snapshots at specific steps on both the JS
and C sides, and compare them directly. Reveals hidden state divergences
(monster HP, object properties, player stats) that RNG traces alone cannot show.

**Usage:**
```bash
# JS-only: capture monster details + hero stats at specific steps
node test/comparison/dbgmapdump.js <session.json> --steps 240,255,261 --sections N,U

# JS + C comparison (requires nethack-c binary)
node test/comparison/dbgmapdump.js <session.json> --steps 240,255,261 --sections N,U --c-side

# Find first divergence automatically
node test/comparison/dbgmapdump.js <session.json> --first-divergence --sections N,U --c-side
```

**Sections:**
| Section | Content |
|---------|---------|
| N | Monster details: id, position, mndx, HP, maxHP, tame, peaceful, etc. |
| M | Monster positions (compact) |
| U | Hero: position, HP, energy, multi, utrap, moves, conf/stun/blind/hallu |
| O | Floor objects (position, otyp, quantity) |
| Q | Object details (cursed, no_charge, etc.) |
| T | Terrain grid (typ values) |
| C | Context snapshot (run, travel, multi, etc.) |
| G | Global flags snapshot |

**C-side capture:** Uses `capture_step_snapshot.py` which launches C nethack
with `NETHACK_DUMPSNAP_INPUT_EVERY=1` and waits for the `auto_inp_N`
checkpoint. No commands are injected. See `skills/c-checkpoint-infrastructure/SKILL.md`
for the full C checkpoint infrastructure documentation.

**Common issue:** C-side captures may report `phase-mismatch` when the
`auto_inp` sequence counter doesn't align. In that case, check the actual
mapdump files in `tmp/dbgmapdump/<session>/c/` — the data may still be
present under a different phase tag.

## Complete triage workflow

```bash
# 1. Find WHERE: first step with mismatched entry counts (+ value scan)
node scripts/step-count-diff.mjs <session.json> --values

# 2. Understand WHY: game state + command context at the mismatch step
node scripts/step-boundary-context.mjs <session.json> --step N

# 3a. If boundary shift: trace message/prompt state to find the extra --More--
#     or pendingPrompt causing the shift. Fix in JS game code.

# 3b. If accumulated monster AI divergence: drill into specific monsters
node scripts/movement-propagation.mjs <session.json> --step-from N --step-to M --mon-id K

# 3c. If hidden state divergence suspected: compare JS vs C game state
node test/comparison/dbgmapdump.js <session.json> --steps N-1,N,N+1 --sections N,U --c-side

# 4. For display-only divergences: trace the cell write path
node scripts/cell-trace.mjs <session.json> --row R --col C --step N
```

## Tool Catalog: Triage & Debugging

The triage tools form a layered investigation pipeline. Each tool answers a
different question and hands off to the next when deeper investigation is needed.

| Layer | Tool | Question It Answers | When to Use |
|-------|------|---------------------|-------------|
| **1. Where** | `step-count-diff` | Which step first diverges? | Always start here |
| **2. Why** | `step-boundary-context` | What game state causes the divergence? | After step-count-diff finds a mismatch |
| **3a. Hidden state** | `dbgmapdump` | What are the actual JS/C monster HP, objects, stats? | When RNG matches but outcomes differ |
| **3b. Monster AI** | `movement-propagation` | How do monster movement decisions differ? | For pet/monster movement divergences |
| **3c. Display** | `cell-trace` | Which code path wrote a specific display cell? | For screen-only divergences |
| **4. RNG micro** | `rng_step_diff` | What are the exact RNG values at a step? | For value-level comparison |

### Tool relationships

```
step-count-diff  ──→  step-boundary-context  ──→  (fix boundary shift)
      │                        │
      │                        ├──→  dbgmapdump     (hidden state: HP, objects)
      │                        ├──→  movement-prop   (monster AI decisions)
      │                        └──→  cell-trace      (display write paths)
      │
      └──→  rng_step_diff      (raw RNG microscope)
```

### Supporting tools

| Tool | Purpose |
|------|---------|
| `scripts/pes-report.mjs` | Instant replay of last PES results (no rerun needed) |
| `scripts/run-and-report.sh` | Full session suite + PES table |
| `test/comparison/rng_step_diff.js` | Per-step RNG value comparison |
| `test/comparison/dbgmapdump.js` | JS/C state snapshot comparison |
| `scripts/triage-lib.mjs` | Shared library (entry filtering, annotations, prompt detection) |

### Shared infrastructure

All triage tools share:
- `prepareReplayArgs` / `replaySession` for JS replay
- `getSessionGameplaySteps` for C session data
- `isComparable` filter for RNG entries (matching the test comparator)
- `triage-lib.mjs`: entry normalization, annotations, command span detection
- 1-indexed step numbering (matching test comparator output)

## Non-goals

- These tools don't replace the test comparator — they complement it
- They don't auto-fix divergences — they diagnose root causes
- They don't need to be fast (replay takes seconds) — they need to be accurate
- They don't need UI polish — they're developer-facing CLI tools
