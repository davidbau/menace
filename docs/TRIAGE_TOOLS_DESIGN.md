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

## Non-goals

- These tools don't replace the test comparator — they complement it
- They don't auto-fix divergences — they diagnose root causes
- They don't need to be fast (replay takes seconds) — they need to be accurate
- They don't need UI polish — they're developer-facing CLI tools
